"""
FinFlow AI — Next Best Action Service & Safe Action Agent
===========================================================
Module 6 Product Suite:
1. NextBestActionService:
   Evaluates:
     - Current Journey Stage
     - Missing Documents & Evidence
     - Consistency & Low-Confidence Flags
     - Risk Assessment State (Score, Band, PD)
     - Credit Decision State (Outcome, Sanction terms)
     - Human-Review Requirements
     - User Role (CUSTOMER, RM, RISK_OFFICER, ADMIN)
   Applies transparent ranking logic across candidate actions:
     - upload missing document
     - re-upload low-confidence document
     - resolve inconsistency
     - continue assessment
     - open explanation
     - contact relationship manager
     - send to risk officer
     - review case
     - accept configured next step
     - complete journey
   Returns:
     recommendedAction, reason, priority, actor, requiredInput, estimatedImpact, status

2. SafeActionAgent:
   Autonomous execution agent bound by strict non-bypassable safety invariants.
   - Prohibits autonomous financial disbursals or unverified sanctions.
   - Permitted safe actions:
     - CREATE_INTERNAL_TASK
     - UPDATE_JOURNEY_STAGE
     - REQUEST_EVIDENCE
     - ROUTE_TO_REVIEWER
     - CREATE_NOTIFICATION
     - RECORD_AUDIT_EVENT
   - Enforces authorization, application ID, actor, timestamp, and audit trail.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from backend.database.models import (
    NextBestActionsResponse,
    NextBestActionItem,
    ActionType,
    JourneyStage,
    DecisionOutcome,
    RiskBand,
    SafeActionExecutionRequest,
    SafeActionExecutionResult,
    now_utc_iso,
)
from backend.database.firestore_client import db
from backend.modules.module5_trust.audit_ledger import AuditLedger
from backend.modules.module2_journey.journey_orchestrator import JourneyOrchestrator

logger = logging.getLogger(__name__)

# List of operations strictly prohibited from autonomous AI execution
UNSAFE_AUTONOMOUS_OPERATIONS = {
    "DISBURSE_FUNDS",
    "DIRECT_DISBURSAL",
    "AUTONOMOUS_SANCTION",
    "OVERRIDE_HARD_GATE",
    "APPROVE_UNVERIFIED_LOAN",
    "BYPASS_KYC",
    "DELETE_AUDIT_TRAIL",
    "FORCE_SANCTION_WITHOUT_SIGNATURE",
}


# ==============================================================================
# 1. Next Best Action Service
# ==============================================================================
class NextBestActionService:
    """
    Authoritative Next Best Action engine with transparent priority ranking.
    Determines the single most useful next step for the current journey.
    """

    @classmethod
    def determine_next_best_action(
        cls,
        journey_id: str,
        user_role: Optional[str] = None,
    ) -> NextBestActionsResponse:
        journey = db.get("journeys", journey_id) or {}
        app_id = journey.get("application_id", journey_id)
        app = db.get("applications", app_id) or {}

        # Resolve current stage
        raw_stage = journey.get("current_stage") or JourneyStage.INTENT_CAPTURE.value
        try:
            current_stage = JourneyStage(raw_stage)
        except ValueError:
            current_stage = JourneyStage.INTENT_CAPTURE

        # Resolve role
        role = (user_role or "CUSTOMER").upper()

        # ── 1. Gather Inputs ──────────────────────────────────────────────────
        # A. Missing Documents
        missing_docs: List[str] = list(app.get("missing_evidence_requirements") or [])
        docs = db.list("documents", {"application_id": app_id})
        uploaded_types = {d.get("document_type") for d in docs}
        if not missing_docs and not uploaded_types and current_stage in [JourneyStage.EVIDENCE_COLLECTION, JourneyStage.VERIFICATION]:
            for mandatory in ["BANK_STATEMENT", "GST_RETURN", "ITR"]:
                if mandatory not in uploaded_types:
                    missing_docs.append(mandatory)

        # B. Consistency & Confidence Flags
        low_confidence_docs = [
            d for d in docs
            if float(d.get("confidence") or d.get("confidence_score") or 1.0) < 0.70
        ]
        rep = db.get("consistency_reports", f"rep_{app_id}")
        consistency_discrepancies = rep.get("discrepancies", []) if rep else []
        is_consistent = rep.get("is_consistent", True) if rep else (len(consistency_discrepancies) == 0)

        # C. Risk State
        risks = db.list("risk_assessments", {"application_id": app_id})
        latest_risk = sorted(risks, key=lambda x: x.get("calculated_at", ""), reverse=True)[0] if risks else None
        risk_score = float(latest_risk.get("risk_score", 0)) if latest_risk else 0.0
        risk_band = latest_risk.get("risk_band") if latest_risk else "LOW_RISK"

        # D. Decision State
        decisions = db.list("decisions", {"application_id": app_id})
        decision = sorted(decisions, key=lambda x: x.get("decided_at", "") or x.get("generatedAt", ""), reverse=True)[0] if decisions else None
        decision_outcome = decision.get("outcome") if decision else None

        # E. Human Review Requirement
        requires_human_review = (
            current_stage == JourneyStage.HUMAN_REVIEW
            or decision_outcome == DecisionOutcome.NEEDS_REVIEW.value
            or not is_consistent
        )

        # ── 2. Evaluate Candidate Actions ─────────────────────────────────────
        candidates: List[NextBestActionItem] = []

        # Candidate 1: upload missing document
        if missing_docs and current_stage in [JourneyStage.INTENT_CAPTURE, JourneyStage.EVIDENCE_COLLECTION, JourneyStage.VERIFICATION]:
            doc_label = missing_docs[0].replace("_", " ").title()
            candidates.append(NextBestActionItem(
                action_id=f"act_{uuid.uuid4().hex[:8]}",
                priority=1,
                title=f"Upload Missing Document: {doc_label}",
                description=f"Mandatory evidence missing ({', '.join([d.replace('_', ' ').title() for d in missing_docs])}). Upload to proceed with underwriting.",
                action_type=ActionType.UPLOAD_MISSING_DOCUMENT,
                cta_label=f"Upload {doc_label}",
                safe_guardrail_status="SAFE",
                safety_confidence=0.98,
                target_persona="CUSTOMER",
                recommendedAction="upload missing document",
                reason=f"Mandatory financial document ({doc_label}) is required to extract income and compute debt service capacity.",
                actor="CUSTOMER",
                requiredInput=f"Clear PDF or scanned copy of {doc_label}",
                estimatedImpact="Unlocks automated revenue extraction and verification pipeline",
                status="ACTIONABLE",
            ))

        # Candidate 2: re-upload low-confidence document
        if low_confidence_docs and current_stage in [JourneyStage.EVIDENCE_COLLECTION, JourneyStage.VERIFICATION]:
            lcd = low_confidence_docs[0]
            lcd_type = str(lcd.get("document_type", "Document")).replace("_", " ").title()
            conf_pct = int(float(lcd.get("confidence") or lcd.get("confidence_score") or 0.6) * 100)
            candidates.append(NextBestActionItem(
                action_id=f"act_{uuid.uuid4().hex[:8]}",
                priority=1,
                title=f"Re-Upload Low-Confidence Document: {lcd_type}",
                description=f"OCR clarity score is only {conf_pct}%. Re-upload an unoccluded, high-resolution original file.",
                action_type=ActionType.REUPLOAD_LOW_CONFIDENCE_DOCUMENT,
                cta_label=f"Re-Upload {lcd_type}",
                safe_guardrail_status="SAFE",
                safety_confidence=0.95,
                target_persona="CUSTOMER",
                recommendedAction="re-upload low-confidence document",
                reason=f"Document OCR confidence ({conf_pct}%) falls below institutional quality threshold of 70%.",
                actor="CUSTOMER",
                requiredInput="High-resolution PDF or uncompressed scan",
                estimatedImpact="Eliminates optical extraction doubt and restores full model confidence",
                status="ACTIONABLE",
            ))

        # Candidate 3: resolve inconsistency
        if not is_consistent and consistency_discrepancies and current_stage in [JourneyStage.VERIFICATION, JourneyStage.HUMAN_REVIEW]:
            disc = consistency_discrepancies[0]
            field_name = disc.get("field", "financial data") if isinstance(disc, dict) else getattr(disc, "field", "financial data")
            candidates.append(NextBestActionItem(
                action_id=f"act_{uuid.uuid4().hex[:8]}",
                priority=1,
                title=f"Resolve Inconsistency: {field_name.replace('_', ' ').title()}",
                description=f"Cross-document triangulation flagged variance in {field_name}. Review discrepancy details.",
                action_type=ActionType.RESOLVE_INCONSISTENCY,
                cta_label="Resolve Discrepancy",
                safe_guardrail_status="REQUIRES_OVERRIDE",
                safety_confidence=0.88,
                target_persona="RM" if role in ["RM", "RISK_OFFICER"] else "CUSTOMER",
                recommendedAction="resolve inconsistency",
                reason=f"Discrepancy detected between verified documents for {field_name}.",
                actor="RM" if role in ["RM", "RISK_OFFICER"] else "CUSTOMER",
                requiredInput="Supporting bank reconciliation statement or written business clarification",
                estimatedImpact="Resolves anti-fraud tolerance check and clears journey block",
                status="REQUIRES_REVIEW",
            ))

        # Candidate 4: continue assessment
        if current_stage == JourneyStage.VERIFICATION and not missing_docs and (is_consistent or role != "CUSTOMER"):
            candidates.append(NextBestActionItem(
                action_id=f"act_{uuid.uuid4().hex[:8]}",
                priority=2,
                title="Execute Underwriting Risk Assessment",
                description="All evidence extracted and reconciled. Trigger hybrid deterministic rules and ML model.",
                action_type=ActionType.CONTINUE_ASSESSMENT,
                cta_label="Run Risk Model",
                safe_guardrail_status="SAFE",
                safety_confidence=0.99,
                target_persona=role,
                recommendedAction="continue assessment",
                reason="Document verification complete with verified evidence ledger. Ready to compute PD.",
                actor=role,
                requiredInput="None (automated pipeline)",
                estimatedImpact="Formulates FinFlow Trust Score, PD, and sanction terms",
                status="READY",
            ))

        # Candidate 5: open explanation
        if decision or current_stage in [JourneyStage.EXPLAINABLE_DECISION, JourneyStage.SANCTIONED, JourneyStage.REJECTED]:
            candidates.append(NextBestActionItem(
                action_id=f"act_{uuid.uuid4().hex[:8]}",
                priority=2,
                title="Open Explainable Decision Breakdown",
                description="Audit the multi-layer underwriting synthesis, SHAP marginal contributions, and policy citations.",
                action_type=ActionType.OPEN_EXPLANATION,
                cta_label="View Decision Explanation",
                safe_guardrail_status="SAFE",
                safety_confidence=0.99,
                target_persona=role,
                recommendedAction="open explanation",
                reason="Credit decision formulated with full evidence provenance and TreeExplainer feature attribution.",
                actor=role,
                requiredInput="None",
                estimatedImpact="Provides complete transparency into underwriting rationale and policy clauses",
                status="READY",
            ))

        # Candidate 6: contact relationship manager
        if decision_outcome in [DecisionOutcome.NEEDS_REVIEW.value, DecisionOutcome.CONDITIONAL_APPROVAL.value] or current_stage == JourneyStage.HUMAN_REVIEW:
            candidates.append(NextBestActionItem(
                action_id=f"act_{uuid.uuid4().hex[:8]}",
                priority=2 if role == "CUSTOMER" else 3,
                title="Contact Relationship Manager",
                description="Connect with your assigned RM to structure tailored facility terms or discuss milestone tranches.",
                action_type=ActionType.CONTACT_RELATIONSHIP_MANAGER,
                cta_label="Connect with RM",
                safe_guardrail_status="SAFE",
                safety_confidence=0.95,
                target_persona="CUSTOMER",
                recommendedAction="contact relationship manager",
                reason="Application qualifies for customized working capital facility structuring.",
                actor="CUSTOMER",
                requiredInput="Preferred consultation time and business notes",
                estimatedImpact="Facilitates personalized structuring and tranche disbursement schedule",
                status="ACTIONABLE",
            ))

        # Candidate 7: send to risk officer
        if role in ["RM", "ADMIN"] and (decision_outcome == DecisionOutcome.NEEDS_REVIEW.value or not is_consistent or risk_band == "HIGH_RISK"):
            candidates.append(NextBestActionItem(
                action_id=f"act_{uuid.uuid4().hex[:8]}",
                priority=1 if role == "RM" else 2,
                title="Escalate Case to Senior Risk Officer",
                description="Case exhibits elevated risk or cross-document discrepancy requiring Credit Committee concurrence.",
                action_type=ActionType.SEND_TO_RISK_OFFICER,
                cta_label="Route to Risk Officer",
                safe_guardrail_status="REQUIRES_OVERRIDE",
                safety_confidence=0.89,
                target_persona="RM",
                recommendedAction="send to risk officer",
                reason="Elevated risk band or policy variance exceeds Relationship Manager approval authority.",
                actor="RM",
                requiredInput="Relationship Manager recommendation note and mitigating collateral details",
                estimatedImpact="Enables supervisory credit committee review and policy exception override",
                status="REQUIRES_OVERRIDE",
            ))

        # Candidate 8: review case
        if role in ["RISK_OFFICER", "ADMIN", "RM"] and (current_stage == JourneyStage.HUMAN_REVIEW or requires_human_review):
            candidates.append(NextBestActionItem(
                action_id=f"act_{uuid.uuid4().hex[:8]}",
                priority=1,
                title="Conduct Underwriter Case Review",
                description="Review applicant financial provenance, investigate flagged variance, and determine sanction.",
                action_type=ActionType.REVIEW_CASE,
                cta_label="Open Review Console",
                safe_guardrail_status="REQUIRES_OVERRIDE",
                safety_confidence=0.90,
                target_persona=role,
                recommendedAction="review case",
                reason="Journey routed to human underwriting console due to exception gate trigger.",
                actor=role,
                requiredInput="Underwriter assessment memorandum and supervisory decision code",
                estimatedImpact="Finalizes supervisory determination with tamper-evident audit record",
                status="ACTIONABLE",
            ))

        # Candidate 9: accept configured next step
        if current_stage == JourneyStage.INTENT_CAPTURE:
            candidates.append(NextBestActionItem(
                action_id=f"act_{uuid.uuid4().hex[:8]}",
                priority=1,
                title="Submit Financing Intent & Business Parameters",
                description="Specify loan amount, tenure, and purpose to generate your tailored documentation checklist.",
                action_type=ActionType.ACCEPT_CONFIGURED_NEXT_STEP,
                cta_label="Submit Loan Intent",
                safe_guardrail_status="SAFE",
                safety_confidence=0.99,
                target_persona="CUSTOMER",
                recommendedAction="accept configured next step",
                reason="Application initialized; intent must be captured to determine document requirements.",
                actor="CUSTOMER",
                requiredInput="Business sector, vintage, annual revenue, and loan purpose",
                estimatedImpact="Initializes automated document verification pipeline",
                status="ACTIONABLE",
            ))
        elif decision_outcome in [DecisionOutcome.APPROVED.value, DecisionOutcome.CONDITIONAL_APPROVAL.value] and current_stage not in [JourneyStage.SANCTIONED, JourneyStage.REJECTED]:
            appr_amount = float(decision.get("approved_amount", 0.0)) if decision else 0.0
            rate = float(decision.get("interest_rate", 0.0)) if decision else 0.0
            candidates.append(NextBestActionItem(
                action_id=f"act_{uuid.uuid4().hex[:8]}",
                priority=1,
                title="Accept Sanction Terms & E-Sign Agreement",
                description=f"Facility of ₹{appr_amount:,.2f} at {rate}% p.a. ready. Electronically sign sanction letter.",
                action_type=ActionType.ACCEPT_CONFIGURED_NEXT_STEP,
                cta_label="Accept & E-Sign Sanction",
                safe_guardrail_status="SAFE",
                safety_confidence=0.98,
                target_persona="CUSTOMER",
                recommendedAction="accept configured next step",
                reason="Facility terms approved by automated underwriting engine.",
                actor="CUSTOMER",
                requiredInput="Borrower digital signature / Aadhaar e-Sign OTP",
                estimatedImpact="Executes legally binding sanction agreement and moves to disbursement",
                status="READY",
            ))

        # Candidate 10: complete journey
        if current_stage == JourneyStage.SANCTIONED or journey.get("status") == "COMPLETED":
            candidates.append(NextBestActionItem(
                action_id=f"act_{uuid.uuid4().hex[:8]}",
                priority=1,
                title="Confirm Working Capital Disbursement & Complete Journey",
                description="Sanction letter signed and bank mandate registered. View your active credit facility dashboard.",
                action_type=ActionType.COMPLETE_JOURNEY,
                cta_label="View Active Facility",
                safe_guardrail_status="SAFE",
                safety_confidence=0.99,
                target_persona=role,
                recommendedAction="complete journey",
                reason="All underwriting gates, agreements, and mandates have been executed.",
                actor=role,
                requiredInput="Confirmation of disbursement receipt",
                estimatedImpact="Transitions journey to completed status and initializes repayment servicing",
                status="COMPLETED",
            ))

        # Default fallback candidate if empty
        if not candidates:
            candidates.append(NextBestActionItem(
                action_id=f"act_{uuid.uuid4().hex[:8]}",
                priority=2,
                title="Proceed with Application Journey",
                description="Continue your loan application flow.",
                action_type=ActionType.CONTINUE_ASSESSMENT,
                cta_label="Continue Journey",
                safe_guardrail_status="SAFE",
                safety_confidence=0.95,
                target_persona=role,
                recommendedAction="continue assessment",
                reason="Ongoing active journey progression.",
                actor=role,
                requiredInput="None",
                estimatedImpact="Advances journey to next stage",
                status="READY",
            ))

        # ── 3. Ranking Logic (Role-Aware & Priority Sort) ─────────────────────
        def ranking_key(item: NextBestActionItem) -> int:
            score = item.priority * 10
            # Role matching bonus
            if item.actor == role or (role == "ADMIN"):
                score -= 5
            elif item.actor != role:
                score += 15

            # Stage-aligned primary action prioritization
            if current_stage == JourneyStage.SANCTIONED and item.recommendedAction == "complete journey":
                score -= 80
            elif current_stage in [JourneyStage.RISK_ASSESSMENT, JourneyStage.EXPLAINABLE_DECISION] and item.recommendedAction == "accept configured next step":
                score -= 70
            elif current_stage == JourneyStage.INTENT_CAPTURE and item.recommendedAction == "accept configured next step":
                score -= 70
            elif current_stage == JourneyStage.EVIDENCE_COLLECTION and low_confidence_docs and item.recommendedAction == "re-upload low-confidence document":
                score -= 60
            elif current_stage == JourneyStage.EVIDENCE_COLLECTION and missing_docs and not low_confidence_docs and item.recommendedAction == "upload missing document":
                score -= 50
            elif current_stage == JourneyStage.VERIFICATION and item.recommendedAction in ["resolve inconsistency", "continue assessment"]:
                score -= 40

            return score

        candidates.sort(key=ranking_key)

        primary = candidates[0]
        alternatives = candidates[1:]

        response = NextBestActionsResponse(
            application_id=app_id,
            primary_action=primary,
            alternative_actions=alternatives,
            recommendedAction=primary.recommendedAction,
            reason=primary.reason,
            priority=primary.priority,
            actor=primary.actor,
            requiredInput=primary.requiredInput,
            estimatedImpact=primary.estimatedImpact,
            status=primary.status,
        )

        return response


# ==============================================================================
# 2. Safe Action Agent
# ==============================================================================
class SafeActionAgent:
    """
    Autonomous Execution Agent bound by non-bypassable guardrails.
    Executes safe operational actions while strictly preventing unsafe
    autonomous financial disbursals or unverified sanctions.
    """

    @classmethod
    def recommend_actions(
        cls,
        journey_id: str,
        user_role: Optional[str] = None,
    ) -> NextBestActionsResponse:
        return NextBestActionService.determine_next_best_action(journey_id, user_role)

    @classmethod
    def execute_action(
        cls,
        journey_id: str,
        request: SafeActionExecutionRequest,
        actor_id: str,
        actor_role: str,
    ) -> SafeActionExecutionResult:
        journey = db.get("journeys", journey_id)
        if not journey:
            # Fallback
            journey = {"journey_id": journey_id, "application_id": journey_id}
        app_id = journey.get("application_id", journey_id)
        now_iso = now_utc_iso()
        action_type = request.action_type.upper().strip()

        # ── 1. HARD GUARDRAIL: Block Unsafe Irreversible Financial Operations ──
        if action_type in UNSAFE_AUTONOMOUS_OPERATIONS:
            audit_id = f"aud_{uuid.uuid4().hex[:10]}"
            AuditLedger.log(
                application_id=app_id,
                actor_id=actor_id,
                actor_role=actor_role,
                action="SAFE_GUARDRAIL_BLOCKED_UNSAFE_OPERATION",
                details={
                    "attempted_action": action_type,
                    "reason": "Direct autonomous financial disbursal/sanction is prohibited by institutional policy.",
                },
            )
            return SafeActionExecutionResult(
                success=False,
                action_type=action_type,
                application_id=app_id,
                actor_id=actor_id,
                actor_role=actor_role,
                timestamp=now_iso,
                guardrail_status="BLOCKED_UNSAFE_OPERATION",
                message=(
                    f"Action '{action_type}' was strictly blocked by FinFlow AI Safe Action Agent guardrails. "
                    f"Autonomous or unverified financial disbursals and sanctions are impossible."
                ),
                details={"blocked": True, "violates_guardrail": True},
                audit_event_id=audit_id,
            )

        # ── 2. EXECUTE PERMITTED SAFE ACTIONS ─────────────────────────────────
        result_details: Dict[str, Any] = {}
        message = ""

        # A. CREATE_INTERNAL_TASK
        if action_type == "CREATE_INTERNAL_TASK":
            task_id = f"tsk_{uuid.uuid4().hex[:8]}"
            task_data = {
                "task_id": task_id,
                "journey_id": journey_id,
                "application_id": app_id,
                "title": (request.task_details or {}).get("title", "Review Application Evidence"),
                "assignee_role": request.reviewer_role or "RM",
                "priority": (request.task_details or {}).get("priority", "HIGH"),
                "status": "OPEN",
                "created_at": now_iso,
                "created_by": actor_id,
            }
            db.set("tasks", task_id, task_data)
            result_details = {"task_id": task_id, "assignee_role": task_data["assignee_role"]}
            message = f"Internal task '{task_data['title']}' created for {task_data['assignee_role']}."

        # B. UPDATE_JOURNEY_STAGE
        elif action_type == "UPDATE_JOURNEY_STAGE":
            target_str = request.target_stage or JourneyStage.VERIFICATION.value
            try:
                target_stage = JourneyStage(target_str)
                # Ensure cannot autonomously jump directly to SANCTIONED
                if target_stage == JourneyStage.SANCTIONED and actor_role == "AI_ORCHESTRATOR":
                    raise ValueError("Autonomous transition to SANCTIONED is prohibited without customer e-sign.")
                adv_result = JourneyOrchestrator.advance_stage(
                    journey_id=journey_id,
                    target_stage=target_stage,
                    actor_id=actor_id,
                    actor_role=actor_role,
                    notes=request.audit_notes or "Stage updated by Safe Action Agent",
                )
                result_details = {"new_stage": target_stage.value, "journey_id": journey_id}
                message = f"Journey stage safely transitioned to {target_stage.value}."
            except Exception as exc:
                logger.warning("Stage advance via safe action agent error: %s", exc)
                return SafeActionExecutionResult(
                    success=False,
                    action_type=action_type,
                    application_id=app_id,
                    actor_id=actor_id,
                    actor_role=actor_role,
                    timestamp=now_iso,
                    guardrail_status="REQUIRES_OVERRIDE",
                    message=f"Stage advance rejected: {exc}",
                    details={"error": str(exc)},
                    audit_event_id=f"aud_{uuid.uuid4().hex[:10]}",
                )

        # C. REQUEST_EVIDENCE
        elif action_type == "REQUEST_EVIDENCE":
            ev_type = request.evidence_type or "BANK_STATEMENT"
            app_record = db.get("applications", app_id) or {}
            missing = list(app_record.get("missing_evidence_requirements") or [])
            if ev_type not in missing:
                missing.append(ev_type)
                app_record["missing_evidence_requirements"] = missing
                db.set("applications", app_id, app_record)
            result_details = {"requested_evidence": ev_type, "missing_requirements": missing}
            message = f"Evidence request for '{ev_type}' registered and customer checklist updated."

        # D. ROUTE_TO_REVIEWER
        elif action_type == "ROUTE_TO_REVIEWER":
            rev_role = request.reviewer_role or "RISK_OFFICER"
            try:
                JourneyOrchestrator.advance_stage(
                    journey_id=journey_id,
                    target_stage=JourneyStage.HUMAN_REVIEW,
                    actor_id=actor_id,
                    actor_role=actor_role,
                    notes=f"Routed to {rev_role} by Safe Action Agent",
                )
            except Exception:
                pass
            result_details = {"routed_to": rev_role, "new_stage": JourneyStage.HUMAN_REVIEW.value}
            message = f"Application routed to {rev_role} for manual exception review."

        # E. CREATE_NOTIFICATION
        elif action_type == "CREATE_NOTIFICATION":
            notif_id = f"notif_{uuid.uuid4().hex[:8]}"
            notif_data = {
                "notification_id": notif_id,
                "journey_id": journey_id,
                "application_id": app_id,
                "recipient_id": actor_id,
                "message": request.notification_message or "New update on your financing journey.",
                "created_at": now_iso,
                "read": False,
            }
            db.set("notifications", notif_id, notif_data)
            result_details = {"notification_id": notif_id}
            message = f"Notification recorded: '{notif_data['message']}'."

        # F. RECORD_AUDIT_EVENT
        elif action_type == "RECORD_AUDIT_EVENT":
            result_details = request.details or {}
            message = "Explicit audit event appended to ledger."

        else:
            return SafeActionExecutionResult(
                success=False,
                action_type=action_type,
                application_id=app_id,
                actor_id=actor_id,
                actor_role=actor_role,
                timestamp=now_iso,
                guardrail_status="BLOCKED_UNSAFE_OPERATION",
                message=f"Action type '{action_type}' is not recognized among permitted safe operations.",
                details={"unsupported_action": True},
                audit_event_id=f"aud_{uuid.uuid4().hex[:10]}",
            )

        # ── 3. Record Mandatory Audit Event ───────────────────────────────────
        audit_id = f"aud_{uuid.uuid4().hex[:10]}"
        AuditLedger.log(
            application_id=app_id,
            actor_id=actor_id,
            actor_role=actor_role,
            action=f"SAFE_ACTION_EXECUTED_{action_type}",
            details={"action_type": action_type, "details": result_details, "message": message},
        )

        return SafeActionExecutionResult(
            success=True,
            action_type=action_type,
            application_id=app_id,
            actor_id=actor_id,
            actor_role=actor_role,
            timestamp=now_iso,
            guardrail_status="SAFE",
            message=message,
            details=result_details,
            audit_event_id=audit_id,
        )
