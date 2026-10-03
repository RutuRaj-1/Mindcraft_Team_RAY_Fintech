"""
HumanReviewService — FinFlow AI
================================
Implements the Governance-layer Human Review workflow:

  AI Decision
    -> HUMAN_REVIEW_STARTED (audit event)
    -> Reviewer opens case, reads evidence / risk / policy
    -> APPROVE | DECLINE | ESCALATE
    -> Mandatory reason (reason_code + rationale)
    -> HUMAN_OVERRIDE (audit event)
    -> Feedback event (model learning signal)
    -> Journey updated

Critical invariants
-------------------
* The original AI decision is NEVER deleted.
* HumanReview and AI Decision are stored in separate collections.
* Every outcome change is an immutable audit event.
* Only RM and RISK_OFFICER roles may submit reviews.
"""
import uuid
from datetime import datetime, timezone
from fastapi import HTTPException
from typing import Optional, List

from backend.database.firestore_client import db
from backend.database.models import (
    DecisionRecord, DecisionOutcome, now_utc_iso
)
from backend.modules.module5_trust.audit_ledger import AuditLedger


# -- Authorised reviewer roles -------------------------------------------------
AUTHORIZED_REVIEWER_ROLES = {"RM", "RISK_OFFICER", "ADMIN"}

# -- Valid human outcomes ------------------------------------------------------
VALID_HUMAN_OUTCOMES = {
    "APPROVED",
    "CONDITIONAL_APPROVAL",
    "DECLINED",
    "REJECTED",
    "ESCALATED",
    "NEEDS_REVIEW",
}


class HumanReviewService:

    # --- Open / Start a Review -----------------------------------------------

    @staticmethod
    def start_review(
        application_id: str,
        journey_id: str,
        reviewer_id: str,
        reviewer_role: str,
        reviewer_name: str,
    ) -> dict:
        """
        Open a human review record for this application.
        Records HUMAN_REVIEW_STARTED to the audit ledger.
        Returns the new review document.
        """
        if reviewer_role not in AUTHORIZED_REVIEWER_ROLES:
            raise HTTPException(
                status_code=403,
                detail=f"Role '{reviewer_role}' is not authorised to initiate human reviews.",
            )

        # Fetch the current (original) AI decision — do NOT mutate it
        decisions = db.list("decisions", {"application_id": application_id})
        if not decisions:
            raise HTTPException(
                status_code=404,
                detail="No AI decision found for this application. Run risk evaluation first.",
            )
        ai_decision = decisions[-1]
        original_ai_outcome = ai_decision.get("outcome", "UNKNOWN")
        ai_decision_id = ai_decision.get("decision_id", "")

        review_id = f"rev_{uuid.uuid4().hex[:12]}"
        now = now_utc_iso()

        review_doc = {
            "reviewId": review_id,
            "applicationId": application_id,
            "journeyId": journey_id,
            "reviewerId": reviewer_id,
            "reviewerName": reviewer_name,
            "reviewerRole": reviewer_role,
            # Preserve original AI state — immutable reference
            "originalAIOutcome": original_ai_outcome,
            "aiDecisionId": ai_decision_id,
            "aiDecisionSnapshot": {
                "outcome": original_ai_outcome,
                "approved_amount": ai_decision.get("approved_amount"),
                "interest_rate": ai_decision.get("interest_rate"),
                "confidence": ai_decision.get("confidence", ai_decision.get("confidence_score")),
                "risk_score": ai_decision.get("risk_score"),
                "risk_band": ai_decision.get("risk_band"),
                "decided_by": ai_decision.get("decided_by"),
                "reasoning": (ai_decision.get("reasoning") or ai_decision.get("summary") or "")[:500],
            },
            # Human decision — populated on submission
            "humanOutcome": None,
            "reasonCode": None,
            "rationaleNotes": None,
            "evidenceReviewed": [],
            "coSignedBy": None,
            # Status lifecycle: OPEN -> SUBMITTED -> ESCALATED
            "status": "OPEN",
            "createdAt": now,
            "updatedAt": now,
            "submittedAt": None,
        }

        db.set("human_reviews", review_id, review_doc)

        # Emit canonical audit event
        AuditLedger.record_event(
            application_id=application_id,
            journey_id=journey_id,
            event_type="HUMAN_REVIEW_STARTED",
            actor_type=reviewer_role,
            actor_id=reviewer_id,
            stage="HUMAN_REVIEW",
            payload_summary=(
                f"Human review opened by {reviewer_name} ({reviewer_role}). "
                f"Original AI outcome: {original_ai_outcome}."
            ),
            references={
                "review_id": review_id,
                "ai_decision_id": ai_decision_id,
                "original_ai_outcome": original_ai_outcome,
            },
            service="human-review-service",
        )

        return review_doc

    # --- Submit Review Outcome ------------------------------------------------

    @staticmethod
    def submit_review(
        review_id: str,
        application_id: str,
        human_outcome: str,
        reason_code: str,
        rationale_notes: str,
        reviewer_id: str,
        reviewer_role: str,
        reviewer_name: str,
        evidence_reviewed: Optional[List[str]] = None,
        co_signed_by: Optional[str] = None,
        new_approved_amount: Optional[float] = None,
        new_interest_rate: Optional[float] = None,
    ) -> dict:
        """
        Submit the human review outcome.
        - Validates role and mandatory rationale.
        - Stores HumanReview with humanOutcome (AI decision unchanged).
        - Records HUMAN_OVERRIDE canonical audit event.
        - Emits a feedback event to drive model calibration.
        """
        if reviewer_role not in AUTHORIZED_REVIEWER_ROLES:
            raise HTTPException(
                status_code=403,
                detail=f"Role '{reviewer_role}' is not authorised to submit human reviews.",
            )

        if human_outcome.upper() not in VALID_HUMAN_OUTCOMES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid outcome '{human_outcome}'. Must be one of {VALID_HUMAN_OUTCOMES}.",
            )

        if not reason_code or not reason_code.strip():
            raise HTTPException(
                status_code=400,
                detail="A structured reason code is mandatory for human review submission.",
            )
        if not rationale_notes or len(rationale_notes.strip()) < 10:
            raise HTTPException(
                status_code=400,
                detail="A detailed rationale (minimum 10 characters) is mandatory for human review.",
            )

        # Fetch review record
        review_doc = db.get("human_reviews", review_id)
        if not review_doc:
            raise HTTPException(status_code=404, detail=f"Review '{review_id}' not found.")

        original_ai_outcome = review_doc.get("originalAIOutcome", "UNKNOWN")
        ai_decision_id = review_doc.get("aiDecisionId", "")
        model_version = review_doc.get("aiDecisionSnapshot", {}).get("decided_by", "scikit-learn-sme-v3.0")
        now = now_utc_iso()

        # Update review doc — human outcome stored separately from AI decision
        review_doc.update({
            "humanOutcome": human_outcome.upper(),
            "reasonCode": reason_code.strip(),
            "rationaleNotes": rationale_notes.strip(),
            "evidenceReviewed": evidence_reviewed or [],
            "coSignedBy": co_signed_by,
            "status": "ESCALATED" if human_outcome.upper() == "ESCALATED" else "SUBMITTED",
            "updatedAt": now,
            "submittedAt": now,
        })

        db.set("human_reviews", review_id, review_doc)

        # -- Emit canonical HUMAN_OVERRIDE audit event -------------------------
        AuditLedger.record_event(
            application_id=application_id,
            journey_id=review_doc.get("journeyId"),
            event_type="HUMAN_OVERRIDE",
            actor_type=reviewer_role,
            actor_id=reviewer_id,
            stage="HUMAN_REVIEW",
            payload_summary=(
                f"{reviewer_role} {reviewer_name} reviewed case. "
                f"AI: {original_ai_outcome} -> Human: {human_outcome.upper()}. "
                f"Reason: {reason_code}."
            ),
            references={
                "review_id": review_id,
                "ai_decision_id": ai_decision_id,
                "original_ai_outcome": original_ai_outcome,
                "human_outcome": human_outcome.upper(),
                "co_signed_by": co_signed_by,
            },
            service="human-review-service",
            input_data={
                "reason_code": reason_code,
                "rationale_notes": rationale_notes.strip(),
                "evidence_reviewed_count": len(evidence_reviewed or []),
            },
            output_data={
                "human_outcome": human_outcome.upper(),
                "new_approved_amount": new_approved_amount,
                "new_interest_rate": new_interest_rate,
            },
        )

        # -- Emit feedback event (model calibration signal) --------------------
        feedback_id = f"fb_{uuid.uuid4().hex[:10]}"
        feedback_doc = {
            "feedbackId": feedback_id,
            "applicationId": application_id,
            "reviewId": review_id,
            "aiDecisionId": ai_decision_id,
            "modelVersion": model_version,
            "AIOutcome": original_ai_outcome,
            "HumanOutcome": human_outcome.upper(),
            "isOverride": original_ai_outcome != human_outcome.upper(),
            "reason": rationale_notes.strip(),
            "reasonCode": reason_code,
            "reviewerRole": reviewer_role,
            "reviewerName": reviewer_name,
            "timestamp": now,
        }
        db.set("feedback_events", feedback_id, feedback_doc)

        # -- Log feedback as audit event ---------------------------------------
        AuditLedger.log(
            application_id=application_id,
            actor_id=reviewer_id,
            actor_role=reviewer_role,
            action="FEEDBACK_RECORDED",
            details={
                "feedback_id": feedback_id,
                "model_version": model_version,
                "ai_outcome": original_ai_outcome,
                "human_outcome": human_outcome.upper(),
                "is_override": original_ai_outcome != human_outcome.upper(),
                "reason_code": reason_code,
            },
        )

        return review_doc

    # --- Read / List Reviews --------------------------------------------------

    @staticmethod
    def get_reviews_for_application(application_id: str) -> list:
        """Return all reviews for a given application, newest first."""
        reviews = db.list("human_reviews", {"applicationId": application_id})
        if not reviews:
            reviews = db.list("human_reviews", {"application_id": application_id})
        return sorted(reviews, key=lambda x: str(x.get("createdAt", "")), reverse=True)

    @staticmethod
    def list_all_reviews(
        status_filter: Optional[str] = None,
        role_filter: Optional[str] = None,
        limit: int = 50,
    ) -> list:
        """Return all human reviews across the portfolio."""
        reviews = db.list("human_reviews")
        if status_filter and status_filter.upper() != "ALL":
            reviews = [r for r in reviews if r.get("status", "").upper() == status_filter.upper()]
        if role_filter and role_filter.upper() != "ALL":
            reviews = [r for r in reviews if r.get("reviewerRole", "").upper() == role_filter.upper()]
        reviews_sorted = sorted(reviews, key=lambda x: str(x.get("createdAt", "")), reverse=True)
        return reviews_sorted[:limit]

    @staticmethod
    def get_review(review_id: str) -> dict:
        r = db.get("human_reviews", review_id)
        if not r:
            raise HTTPException(status_code=404, detail=f"Review '{review_id}' not found.")
        return r

    # --- Feedback Events ------------------------------------------------------

    @staticmethod
    def list_feedback_events(application_id: Optional[str] = None) -> list:
        if application_id:
            events = db.list("feedback_events", {"applicationId": application_id})
            if not events:
                events = db.list("feedback_events", {"application_id": application_id})
        else:
            events = db.list("feedback_events")
        return sorted(events, key=lambda x: str(x.get("timestamp", "")), reverse=True)
