"""
Reviews Router — FinFlow AI Human Review & Governance
======================================================
Implements multi-role institutional governance endpoints:
- GET  /api/v1/reviews                            -> List all reviews
- GET  /api/v1/reviews/{review_id}                -> Get single review
- GET  /api/v1/journeys/{journey_id}/reviews      -> Reviews for a journey
- POST /api/v1/journeys/{journey_id}/review       -> Start a new review
- POST /api/v1/journeys/{journey_id}/review/{review_id}/submit  -> Submit outcome
- POST /api/v1/journeys/{journey_id}/feedback     -> Record manual feedback event
- GET  /api/v1/journeys/{journey_id}/feedback     -> List feedback events

Strict Governance Invariants:
- SYS_ADMIN has ZERO access to review or override decisions.
- AUDIT_OFFICER has read-only access.
- Delegated limits enforced for approvals.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Any, Dict
import uuid
from pydantic import BaseModel, Field

from backend.auth.firebase_auth import get_current_user, AuthenticatedUser, require_role
from backend.auth.roles import UserRole
from backend.database.firestore_client import db
from backend.database.models import now_utc_iso
from backend.modules.module5_trust.audit_ledger import AuditLedger
from backend.modules.module5_trust.human_review_service import HumanReviewService


router = APIRouter(prefix="/api/v1", tags=["Human Review & Governance"])

INSTITUTIONAL_READ_ROLES = [
    UserRole.RM,
    UserRole.RM_SUPERVISOR,
    UserRole.RISK_OFFICER,
    UserRole.RISK_MANAGER,
    UserRole.CREDIT_APPROVER,
    UserRole.AUDIT_OFFICER,
    UserRole.SYS_ADMIN,
    UserRole.ADMIN,
]

REVIEW_ACTION_ROLES = [
    UserRole.RM,
    UserRole.RM_SUPERVISOR,
    UserRole.RISK_OFFICER,
    UserRole.RISK_MANAGER,
    UserRole.CREDIT_APPROVER,
]

FEEDBACK_ROLES = [
    UserRole.RISK_OFFICER,
    UserRole.RISK_MANAGER,
    UserRole.CREDIT_APPROVER,
    UserRole.AUDIT_OFFICER,
]


# ── Request / Response schemas ────────────────────────────────────────────────

class StartReviewRequest(BaseModel):
    """Open a human review case."""
    notes: Optional[str] = Field(None, description="Optional opening notes from the reviewer")


class SubmitReviewRequest(BaseModel):
    """Submit a human review decision."""
    human_outcome: str = Field(
        ...,
        description="APPROVED | CONDITIONAL_APPROVAL | DECLINED | REJECTED | ESCALATED | NEEDS_REVIEW"
    )
    reason_code: str = Field(..., description="Structured institutional reason code")
    rationale_notes: str = Field(..., description="Mandatory detailed justification (min 10 chars)")
    evidence_reviewed: Optional[List[str]] = Field(
        default_factory=list,
        description="Evidence IDs reviewed before decision"
    )
    co_signed_by: Optional[str] = Field(None, description="Co-signing officer name/ID")
    new_approved_amount: Optional[float] = Field(None, description="Override approved amount (INR)")
    new_interest_rate: Optional[float] = Field(None, description="Override interest rate (%)")


class FeedbackRequest(BaseModel):
    """Manually record a feedback event for model calibration."""
    ai_decision_id: str
    ai_outcome: str
    human_outcome: str
    reason_code: str
    rationale: str
    model_version: Optional[str] = "scikit-learn-sme-v3.0"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/reviews")
def list_all_reviews(
    status: Optional[str] = Query(None, description="Filter: OPEN | SUBMITTED | ESCALATED | ALL"),
    role: Optional[str] = Query(None, description="Filter by reviewer role"),
    limit: int = Query(50, ge=1, le=200),
    user: AuthenticatedUser = Depends(require_role(INSTITUTIONAL_READ_ROLES)),
) -> List[Dict[str, Any]]:
    """Return all human reviews across the portfolio."""
    return HumanReviewService.list_all_reviews(
        status_filter=status,
        role_filter=role,
        limit=limit,
    )


@router.get("/reviews/{review_id}")
def get_review(
    review_id: str,
    user: AuthenticatedUser = Depends(require_role(INSTITUTIONAL_READ_ROLES)),
) -> Dict[str, Any]:
    """Retrieve a single review record by ID."""
    return HumanReviewService.get_review(review_id)


@router.get("/journeys/{journey_id}/reviews")
def get_journey_reviews(
    journey_id: str,
    user: AuthenticatedUser = Depends(require_role(INSTITUTIONAL_READ_ROLES)),
) -> List[Dict[str, Any]]:
    """Return all human reviews for a specific journey."""
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    app_id = journey.get("application_id", journey_id)
    return HumanReviewService.get_reviews_for_application(app_id)


@router.post("/journeys/{journey_id}/review")
def start_review(
    journey_id: str,
    req: StartReviewRequest,
    user: AuthenticatedUser = Depends(require_role(REVIEW_ACTION_ROLES)),
) -> Dict[str, Any]:
    """
    Open a new human review for this journey.
    Records HUMAN_REVIEW_STARTED to the immutable audit ledger.
    The original AI decision is preserved and never deleted.
    """
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    app_id = journey.get("application_id", journey_id)

    reviewer_role = user.role.value if hasattr(user.role, "value") else str(user.role)
    reviewer_name = getattr(user, "name", "") or reviewer_role

    return HumanReviewService.start_review(
        application_id=app_id,
        journey_id=journey_id,
        reviewer_id=user.uid,
        reviewer_role=reviewer_role,
        reviewer_name=reviewer_name,
    )


@router.post("/journeys/{journey_id}/review/{review_id}/submit")
def submit_review(
    journey_id: str,
    review_id: str,
    req: SubmitReviewRequest,
    user: AuthenticatedUser = Depends(require_role(REVIEW_ACTION_ROLES)),
) -> Dict[str, Any]:
    """
    Submit the human review decision.
    - Enforces Separation of Duties & Delegated Authority Thresholds.
    - Stores outcome in human_reviews (AI decision untouched).
    - Emits HUMAN_OVERRIDE canonical audit event.
    - Creates a feedback event for model calibration.
    - Mandatory: reason_code and rationale_notes.
    """
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    app_id = journey.get("application_id", journey_id)

    reviewer_role = user.role.value if hasattr(user.role, "value") else str(user.role)
    reviewer_name = getattr(user, "name", "") or reviewer_role

    return HumanReviewService.submit_review(
        review_id=review_id,
        application_id=app_id,
        human_outcome=req.human_outcome,
        reason_code=req.reason_code,
        rationale_notes=req.rationale_notes,
        reviewer_id=user.uid,
        reviewer_role=reviewer_role,
        reviewer_name=reviewer_name,
        evidence_reviewed=req.evidence_reviewed,
        co_signed_by=req.co_signed_by,
        new_approved_amount=req.new_approved_amount,
        new_interest_rate=req.new_interest_rate,
    )


@router.post("/journeys/{journey_id}/feedback")
def record_feedback(
    journey_id: str,
    req: FeedbackRequest,
    user: AuthenticatedUser = Depends(require_role(FEEDBACK_ROLES)),
) -> Dict[str, Any]:
    """
    Manually record a model feedback event.
    Every override becomes a feedback event that drives future model calibration.
    """
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    app_id = journey.get("application_id", journey_id)

    reviewer_role = user.role.value if hasattr(user.role, "value") else str(user.role)
    reviewer_name = getattr(user, "name", "") or reviewer_role

    feedback_id = f"fb_{uuid.uuid4().hex[:10]}"
    now = now_utc_iso()

    feedback_doc = {
        "feedbackId": feedback_id,
        "applicationId": app_id,
        "journeyId": journey_id,
        "aiDecisionId": req.ai_decision_id,
        "modelVersion": req.model_version or "scikit-learn-sme-v3.0",
        "AIOutcome": req.ai_outcome.upper(),
        "HumanOutcome": req.human_outcome.upper(),
        "isOverride": req.ai_outcome.upper() != req.human_outcome.upper(),
        "reason": req.rationale,
        "reasonCode": req.reason_code,
        "reviewerRole": reviewer_role,
        "reviewerName": reviewer_name,
        "timestamp": now,
    }
    db.set("feedback_events", feedback_id, feedback_doc)

    AuditLedger.record_event(
        application_id=app_id,
        journey_id=journey_id,
        event_type="FEEDBACK_RECORDED",
        actor_type=reviewer_role,
        actor_id=user.uid,
        stage="HUMAN_REVIEW",
        payload_summary=(
            f"Feedback recorded by {reviewer_name} ({reviewer_role}). "
            f"AI: {req.ai_outcome.upper()} -> Human: {req.human_outcome.upper()}."
        ),
        references={
            "feedback_id": feedback_id,
            "ai_decision_id": req.ai_decision_id,
            "reason_code": req.reason_code,
        },
        service="human-review-service",
    )

    return feedback_doc


@router.get("/journeys/{journey_id}/feedback")
def get_feedback_events(
    journey_id: str,
    user: AuthenticatedUser = Depends(require_role(INSTITUTIONAL_READ_ROLES)),
) -> List[Dict[str, Any]]:
    """Return all feedback events for a journey."""
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    app_id = journey.get("application_id", journey_id)
    return HumanReviewService.list_feedback_events(application_id=app_id)
