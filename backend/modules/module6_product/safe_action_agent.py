import uuid
from typing import List
from backend.database.models import (
    NextBestActionsResponse, NextBestActionItem, ActionType,
    JourneyStage, DecisionOutcome, RiskBand
)
from backend.database.firestore_client import db

class SafeActionAgent:
    @staticmethod
    def recommend_actions(journey_id: str) -> NextBestActionsResponse:
        journey = db.get("journeys", journey_id) or {}
        app_id = journey.get("application_id", "")
        current_stage = JourneyStage(journey.get("current_stage", JourneyStage.INTENT_CAPTURE))

        decisions = db.list("decisions", {"application_id": app_id})
        decision = decisions[-1] if decisions else None
        
        rep = db.get("consistency_reports", f"rep_{app_id}")
        risk = db.list("risk_assessments", {"application_id": app_id})
        latest_risk = risk[-1] if risk else None

        primary_action: NextBestActionItem
        alternative_actions: List[NextBestActionItem] = []

        if current_stage == JourneyStage.INTENT_CAPTURE:
            primary_action = NextBestActionItem(
                action_id=f"act_{uuid.uuid4().hex[:8]}",
                priority=1,
                title="Complete Business Intent & Loan Requirements",
                description="Specify your requested working capital facility, tenure, and purpose to generate your tailored evidence checklist.",
                action_type=ActionType.UPLOAD_DOCUMENT,
                cta_label="Submit Financing Intent",
                safe_guardrail_status="SAFE",
                safety_confidence=0.99,
                target_persona="CUSTOMER"
            )

        elif current_stage == JourneyStage.EVIDENCE_COLLECTION:
            # Check how many documents uploaded
            docs = db.list("documents", {"application_id": app_id})
            primary_action = NextBestActionItem(
                action_id=f"act_{uuid.uuid4().hex[:8]}",
                priority=1,
                title="Upload Last 6 Months Bank Statement & GSTR-3B",
                description=f"FinFlow has received {len(docs)} documents. Upload your latest statements to initiate automated verification.",
                action_type=ActionType.UPLOAD_DOCUMENT,
                cta_label="Upload Financial Documents",
                safe_guardrail_status="SAFE",
                safety_confidence=0.98,
                target_persona="CUSTOMER"
            )
            alternative_actions.append(NextBestActionItem(
                action_id=f"act_{uuid.uuid4().hex[:8]}",
                priority=2,
                title="Connect via Account Aggregator",
                description="Instantly fetch digital bank statements without manual PDF scanning.",
                action_type=ActionType.UPLOAD_DOCUMENT,
                cta_label="Fetch via AA",
                safe_guardrail_status="SAFE",
                safety_confidence=0.95,
                target_persona="CUSTOMER"
            ))

        elif current_stage == JourneyStage.VERIFICATION:
            if rep and not rep.get("is_consistent", True):
                primary_action = NextBestActionItem(
                    action_id=f"act_{uuid.uuid4().hex[:8]}",
                    priority=1,
                    title="Review Cross-Document Turnover Variance",
                    description=f"{rep.get('flagged_count')} discrepancy flagged between GST and Bank Statement. Relationship manager review required.",
                    action_type=ActionType.VERIFY_DISCREPANCY,
                    cta_label="Inspect Evidence Provenance",
                    safe_guardrail_status="REQUIRES_OVERRIDE",
                    safety_confidence=0.88,
                    target_persona="RM"
                )
            else:
                primary_action = NextBestActionItem(
                    action_id=f"act_{uuid.uuid4().hex[:8]}",
                    priority=1,
                    title="Execute Risk Scoring & Eligibility Engine",
                    description="All evidence items extracted and verified. Ready to run deterministic rules and ML credit assessment.",
                    action_type=ActionType.OFFICER_REVIEW,
                    cta_label="Run Risk Evaluation",
                    safe_guardrail_status="SAFE",
                    safety_confidence=0.99,
                    target_persona="CUSTOMER"
                )

        elif current_stage in [JourneyStage.RISK_ASSESSMENT, JourneyStage.EXPLAINABLE_DECISION]:
            outcome = decision.get("outcome") if decision else None
            if outcome == DecisionOutcome.APPROVED.value:
                primary_action = NextBestActionItem(
                    action_id=f"act_{uuid.uuid4().hex[:8]}",
                    priority=1,
                    title="Accept Prime Loan Sanction Letter",
                    description=f"Your facility of ₹{decision.get('approved_amount', 0):,.2f} at {decision.get('interest_rate')}% is approved! Review terms and e-sign to disburse.",
                    action_type=ActionType.OFFER_ACCEPTANCE,
                    cta_label="Accept & E-Sign Sanction",
                    safe_guardrail_status="SAFE",
                    safety_confidence=0.97,
                    target_persona="CUSTOMER"
                )
            elif outcome == DecisionOutcome.CONDITIONAL_APPROVAL.value:
                primary_action = NextBestActionItem(
                    action_id=f"act_{uuid.uuid4().hex[:8]}",
                    priority=1,
                    title="Review Tranche Disbursement Terms",
                    description="Your application is conditionally approved with staged milestone disbursement.",
                    action_type=ActionType.OFFER_ACCEPTANCE,
                    cta_label="Review Conditional Offer",
                    safe_guardrail_status="SAFE",
                    safety_confidence=0.92,
                    target_persona="CUSTOMER"
                )
            else: # NEEDS_REVIEW or REJECTED
                primary_action = NextBestActionItem(
                    action_id=f"act_{uuid.uuid4().hex[:8]}",
                    priority=1,
                    title="Route to Credit Risk Committee for Exception Review",
                    description="Automated gates flagged high variance or borderline DSCR. Underwriter can structure with collateral or sponsor guarantee.",
                    action_type=ActionType.OFFICER_REVIEW,
                    cta_label="Open Risk Officer Console",
                    safe_guardrail_status="REQUIRES_OVERRIDE",
                    safety_confidence=0.85,
                    target_persona="RISK_OFFICER"
                )

        else: # HUMAN_REVIEW, SANCTIONED, REJECTED
            if current_stage == JourneyStage.SANCTIONED:
                primary_action = NextBestActionItem(
                    action_id=f"act_{uuid.uuid4().hex[:8]}",
                    priority=1,
                    title="Proceed to Real-Time Loan Disbursement",
                    description="Sanction letter signed and bank mandate registered. Ready to disburse working capital to business current account.",
                    action_type=ActionType.OFFER_ACCEPTANCE,
                    cta_label="Initiate Disbursement",
                    safe_guardrail_status="SAFE",
                    safety_confidence=0.99,
                    target_persona="RM"
                )
            else:
                primary_action = NextBestActionItem(
                    action_id=f"act_{uuid.uuid4().hex[:8]}",
                    priority=1,
                    title="Submit Credit Override Justification",
                    description="Provide supervisory rationale code and upload supporting field inspection report.",
                    action_type=ActionType.OFFICER_REVIEW,
                    cta_label="Execute Human Override",
                    safe_guardrail_status="REQUIRES_OVERRIDE",
                    safety_confidence=0.90,
                    target_persona="RISK_OFFICER"
                )

        return NextBestActionsResponse(
            application_id=app_id,
            primary_action=primary_action,
            alternative_actions=alternative_actions
        )
