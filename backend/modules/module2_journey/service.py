"""
FinFlow AI — Journey Service
============================
Business logic layer for Journey Creation, Intent Validation, and Next Action Calculation.
"""

import uuid
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from fastapi import HTTPException, status

from backend.modules.module2_journey.schemas import (
    CreateJourneyRequest,
    CreateJourneyResponse,
    NextActionResponse,
    now_utc_iso,
)
from backend.modules.module2_journey.state_machine import (
    JourneyStateMachine,
    JourneyStage,
)
from backend.modules.module2_journey.repository import JourneyRepository
from backend.database.repositories import application_repo
from backend.database.models import ApplicationModel


class JourneyService:
    """
    Core business service managing journey lifecycle logic.
    """

    @classmethod
    def calculate_next_action(cls, stage: JourneyStage, journey_data: Optional[Dict[str, Any]] = None) -> NextActionResponse:
        """
        Calculates the contextual Next Best Action based on current FSM stage.
        """
        actions_map: Dict[JourneyStage, Dict[str, Any]] = {
            JourneyStage.INTENT_CAPTURE: {
                "action_id": "act_upload_evidence",
                "action_type": "UPLOAD_DOCUMENT",
                "title": "Upload Financial Evidence",
                "description": "Submit certified GST returns, 12-month bank statements, and ITR acknowledgement to proceed to Evidence Collection.",
                "cta_label": "Upload Evidence",
                "target_stage": "EVIDENCE_COLLECTION",
            },
            JourneyStage.EVIDENCE_COLLECTION: {
                "action_id": "act_verify_docs",
                "action_type": "TRIGGER_OCR_VERIFICATION",
                "title": "Run Multi-Pass OCR & Verification",
                "description": "Trigger OCR extraction to reconcile reported GSTR-3B revenue against verified bank credits.",
                "cta_label": "Verify Documents",
                "target_stage": "VERIFICATION",
            },
            JourneyStage.VERIFICATION: {
                "action_id": "act_run_risk",
                "action_type": "TRIGGER_RISK_ASSESSMENT",
                "title": "Perform Risk & Fraud Assessment",
                "description": "Evaluate credit policy limits, scikit-learn probability models, and Financial Trust Graph anomalies.",
                "cta_label": "Calculate Risk Score",
                "target_stage": "RISK_ASSESSMENT",
            },
            JourneyStage.RISK_ASSESSMENT: {
                "action_id": "act_generate_decision",
                "action_type": "GENERATE_DECISION",
                "title": "Synthesize Explainable Decision",
                "description": "Generate zero-hallucination sanction terms and SHAP factor attribution breakdown.",
                "cta_label": "Generate Decision",
                "target_stage": "DECISION",
            },
            JourneyStage.DECISION: {
                "action_id": "act_select_next_action",
                "action_type": "SELECT_NEXT_ACTION",
                "title": "Review Sanction Memorandum",
                "description": "Inspect credit terms, counterfactual simulations, and prescribed Next Best Actions.",
                "cta_label": "View Next Action",
                "target_stage": "NEXT_ACTION",
            },
            JourneyStage.NEXT_ACTION: {
                "action_id": "act_execute_resolution",
                "action_type": "EXECUTE_SANCTION",
                "title": "Accept Offer & Register Mandate",
                "description": "E-Sign digital sanction agreement and authorize automated repayment mandate.",
                "cta_label": "Complete Sanction",
                "target_stage": "RESOLUTION",
            },
            JourneyStage.HUMAN_REVIEW: {
                "action_id": "act_officer_review",
                "action_type": "HUMAN_OVERRIDE_REVIEW",
                "title": "Committee Review Gate",
                "description": "Underwriting officer must inspect flagged variance and record an audit justification.",
                "cta_label": "Record Override",
                "target_stage": "DECISION",
            },
            JourneyStage.RESOLUTION: {
                "action_id": "act_journey_resolved",
                "action_type": "DOWNLOAD_SANCTION_LETTER",
                "title": "Download Facility Sanction Letter",
                "description": "Credit journey completed. Access tamper-proof sanction letter and evidence ledger.",
                "cta_label": "Download Sanction Letter",
                "target_stage": None,
            },
        }

        cfg = actions_map.get(stage, actions_map[JourneyStage.INTENT_CAPTURE])
        return NextActionResponse(**cfg)

    @classmethod
    def validate_minimum_viable_intent(cls, req: CreateJourneyRequest) -> None:
        """
        Explicit validator enforcing minimum viable business intent.
        """
        if req.requested_amount < 50_000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Minimum viable financing request is ₹50,000"
            )
        if len(req.purpose.strip()) < 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Financing purpose must specify business objective"
            )
        if len(req.intent_summary.strip()) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Intent summary must be at least 10 characters long"
            )

    @classmethod
    def create_journey(
        cls,
        req: CreateJourneyRequest,
        applicant_id: str,
        actor_role: str = "CUSTOMER"
    ) -> CreateJourneyResponse:
        """
        Initiates a brand new journey in INTENT_CAPTURE stage.
        """
        # 1. Validate intent viability
        cls.validate_minimum_viable_intent(req)

        # 2. Generate unique identifiers
        journey_id = f"jrn_{uuid.uuid4().hex[:12]}"
        application_id = f"app_{uuid.uuid4().hex[:12]}"
        now = now_utc_iso()

        # Extract or determine missing evidence requirements
        missing_evidence = getattr(req, "missing_evidence_requirements", None)
        if not missing_evidence:
            from backend.modules.module1_intent.intent_parser import determine_missing_evidence
            missing_evidence = determine_missing_evidence(req.product_type, req.requested_amount)

        raw_intent = getattr(req, "raw_customer_intent", None)
        normalized_intent = getattr(req, "normalized_structured_intent", None)

        # 3. Create Application Record in persistence layer
        app_model = ApplicationModel(
            application_id=application_id,
            user_id=applicant_id,
            business_name=req.business_name,
            product_type=req.product_type,
            requested_amount=req.requested_amount,
            purpose=req.purpose,
            status="ACTIVE",
            current_stage=JourneyStage.INTENT_CAPTURE.value,
            vintage_months=req.vintage_months or 12,
            annual_turnover=req.annual_turnover or (req.requested_amount * 3.5),
            tenor_months=req.tenor_months or 12,
            pan=req.pan,
            gstin=req.gstin,
            raw_customer_intent=raw_intent,
            normalized_structured_intent=normalized_intent,
            missing_evidence_requirements=missing_evidence,
            created_at=now,
            updated_at=now,
        )
        try:
            application_repo.create(app_model)
        except Exception:
            pass

        # 4. Construct initial step
        initial_step = {
            "step_id": f"step_{uuid.uuid4().hex[:12]}",
            "stage": JourneyStage.INTENT_CAPTURE.value,
            "entered_at": now,
            "completed_at": None,
            "notes": f"Initial intent captured: {req.purpose}",
            "actor_id": applicant_id,
            "actor_role": actor_role,
        }

        # 5. Build Journey document
        journey_doc = {
            "journey_id": journey_id,
            "application_id": application_id,
            "applicant_id": applicant_id,
            "business_name": req.business_name,
            "product_type": req.product_type,
            "requested_amount": req.requested_amount,
            "purpose": req.purpose,
            "intent_summary": req.intent_summary,
            "current_stage": JourneyStage.INTENT_CAPTURE.value,
            "status": "ACTIVE",
            "history": [initial_step],
            "raw_customer_intent": raw_intent,
            "normalized_structured_intent": normalized_intent,
            "missing_evidence_requirements": missing_evidence,
            "metadata": {
                "tenor_months": req.tenor_months or 12,
                "annual_turnover": req.annual_turnover,
                "industry_sector": req.industry_sector,
            },
            "created_at": now,
            "updated_at": now,
        }

        JourneyRepository.create(journey_id, journey_doc)

        # 6. Record step in timeline & audit log
        JourneyRepository.record_step_event(
            application_id=application_id,
            stage=JourneyStage.INTENT_CAPTURE.value,
            actor_id=applicant_id,
            actor_role=actor_role,
            notes=f"Journey created: {req.purpose}"
        )

        JourneyRepository.log_audit(
            application_id=application_id,
            actor_id=applicant_id,
            actor_role=actor_role,
            action="JOURNEY_CREATED",
            details={
                "journey_id": journey_id,
                "requested_amount": req.requested_amount,
                "product_type": req.product_type,
                "initial_stage": JourneyStage.INTENT_CAPTURE.value,
                "has_raw_intent": bool(raw_intent),
                "has_normalized_intent": bool(normalized_intent),
            }
        )

        # 7. Compute Next Action
        next_action = cls.calculate_next_action(JourneyStage.INTENT_CAPTURE, journey_doc)

        return CreateJourneyResponse(
            journey_id=journey_id,
            application_id=application_id,
            current_stage=JourneyStage.INTENT_CAPTURE.value,
            status="ACTIVE",
            next_action=next_action,
            created_at=now,
            business_name=req.business_name,
            requested_amount=req.requested_amount,
            message="Journey successfully created in INTENT_CAPTURE stage",
            missing_evidence_requirements=missing_evidence,
            raw_customer_intent=raw_intent,
            normalized_structured_intent=normalized_intent,
        )
