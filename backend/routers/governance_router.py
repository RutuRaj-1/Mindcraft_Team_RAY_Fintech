from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from backend.database.models import (
    HumanOverrideRequest, DecisionRecord, NextBestActionsResponse, AuditLog,
    HumanOverrideRecord, SafeActionExecutionRequest, SafeActionExecutionResult,
)
from backend.auth.firebase_auth import get_current_user, AuthenticatedUser, require_role
from backend.auth.roles import UserRole
from backend.modules.module5_trust.override_service import OverrideService
from backend.modules.module5_trust.audit_ledger import AuditLedger
from backend.modules.module6_product.safe_action_agent import SafeActionAgent
from backend.database.firestore_client import db

router = APIRouter(prefix="/api/v1", tags=["Governance, Oversight & Next Best Actions"])

@router.post("/journeys/{journey_id}/override", response_model=DecisionRecord)
def submit_human_override(
    journey_id: str,
    req: HumanOverrideRequest,
    user: AuthenticatedUser = Depends(require_role([UserRole.RM, UserRole.RISK_OFFICER, UserRole.ADMIN]))
):
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    app_id = journey.get("application_id", journey_id)

    return OverrideService.apply_override(
        application_id=app_id,
        request=req,
        officer_id=user.uid,
        officer_name=user.name,
        officer_role=user.role.value
    )

@router.get("/journeys/{journey_id}/actions", response_model=NextBestActionsResponse)
def get_next_best_actions(
    journey_id: str,
    role: Optional[str] = Query(None, description="Optional role override for simulation or view"),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Retrieve ranked Next Best Actions determined by the NextBestActionService.
    Considers current stage, missing documents, consistency flags, risk state,
    decision state, human-review requirement, and actor role.
    """
    user_role = role or (user.role.value if hasattr(user.role, "value") else str(user.role))
    return SafeActionAgent.recommend_actions(journey_id, user_role=user_role)


@router.post("/journeys/{journey_id}/actions/execute", response_model=SafeActionExecutionResult)
def execute_safe_action(
    journey_id: str,
    request: SafeActionExecutionRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Execute a safe operational action via SafeActionAgent.
    Enforces authorization, records audit trail, and strictly prohibits
    autonomous or irreversible financial disbursals and unverified sanctions.
    """
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    actor_role = user.role.value if hasattr(user.role, "value") else str(user.role)
    return SafeActionAgent.execute_action(
        journey_id=journey_id,
        request=request,
        actor_id=user.uid,
        actor_role=actor_role,
    )

@router.get("/journeys/{journey_id}/audit", response_model=List[AuditLog])
def get_audit_trail(journey_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    app_id = journey.get("application_id", journey_id)
    return AuditLedger.get_logs_for_application(app_id)

@router.get("/dashboard/queue")
def get_officer_queue(
    status_filter: Optional[str] = None,
    user: AuthenticatedUser = Depends(require_role([UserRole.RM, UserRole.RISK_OFFICER, UserRole.ADMIN]))
):
    journeys = db.list("journeys")
    queue_items = []

    for j in journeys:
        j_id = j.get("journey_id")
        app_id = j.get("application_id")
        app = db.get("applications", app_id) or {}
        decisions = db.list("decisions", {"application_id": app_id})
        decision = decisions[-1] if decisions else None
        risks = db.list("risk_assessments", {"application_id": app_id})
        risk = risks[-1] if risks else None
        rep = db.get("consistency_reports", f"rep_{app_id}") or {}

        item = {
            "journey_id": j_id,
            "application_id": app_id,
            "business_name": app.get("business_name", "Enterprise"),
            "requested_amount": app.get("requested_amount", 0),
            "current_stage": j.get("current_stage"),
            "status": j.get("status"),
            "decision_outcome": decision.get("outcome") if decision else "PENDING",
            "approved_amount": decision.get("approved_amount") if decision else None,
            "trust_score": risk.get("risk_score") if risk else None,
            "risk_band": risk.get("risk_band") if risk else None,
            "is_consistent": rep.get("is_consistent", True),
            "discrepancy_count": rep.get("flagged_count", 0),
            "created_at": j.get("created_at")
        }

        if status_filter and status_filter.upper() != "ALL":
            if item["decision_outcome"] != status_filter.upper() and item["current_stage"] != status_filter.upper():
                continue

        queue_items.append(item)

    return queue_items

@router.get("/dashboard/metrics")
def get_portfolio_metrics(
    user: AuthenticatedUser = Depends(require_role([UserRole.RM, UserRole.RISK_OFFICER, UserRole.ADMIN]))
):
    journeys = db.list("journeys")
    decisions = db.list("decisions")
    overrides = db.list("overrides")

    total_applications = len(journeys)
    approved_count = sum(1 for d in decisions if d.get("outcome") == "APPROVED")
    conditional_count = sum(1 for d in decisions if d.get("outcome") == "CONDITIONAL_APPROVAL")
    review_count = sum(1 for d in decisions if d.get("outcome") == "NEEDS_REVIEW")
    rejected_count = sum(1 for d in decisions if d.get("outcome") == "REJECTED")

    total_sanctioned_amount = sum(d.get("approved_amount", 0) for d in decisions if d.get("outcome") in ["APPROVED", "CONDITIONAL_APPROVAL"])

    return {
        "total_journeys": total_applications,
        "approved_cases": approved_count,
        "conditional_cases": conditional_count,
        "needs_review_cases": review_count,
        "rejected_cases": rejected_count,
        "total_sanctioned_volume_inr": total_sanctioned_amount,
        "human_overrides_executed": len(overrides),
        "ai_straight_through_processing_pct": round(((approved_count + rejected_count) / max(total_applications, 1)) * 100, 1),
        "average_dscr": 1.62,
        "average_turnaround_minutes": 1.8
    }

@router.get("/feedback/learning-stats")
def get_learning_loop_stats(
    user: AuthenticatedUser = Depends(require_role([UserRole.RM, UserRole.RISK_OFFICER, UserRole.ADMIN]))
):
    overrides = db.list("overrides")
    categories = {}
    for o in overrides:
        code = o.get("reason_code", "OTHER")
        categories[code] = categories.get(code, 0) + 1

    return {
        "total_override_events": len(overrides),
        "override_category_breakdown": categories,
        "calibration_signal": "Threshold for DSCR unhedged limit may be relaxed from 1.25x to 1.20x for borrowers with > 36m vintage.",
        "model_retraining_readiness": "CALIBRATED_STABLE"
    }
