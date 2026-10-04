"""
Audit & Governance Router — FinFlow AI
=======================================
Dedicated endpoints for the Independent Audit & Governance Officer (Sunita Rao)
and institutional oversight.

Capabilities:
- Cross-portfolio case inspection & decision replay access
- Audit finding issuance and management
- Algorithmic drift & human override pattern analytics
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Any, Dict
import uuid
from pydantic import BaseModel, Field

from backend.auth.firebase_auth import get_current_user, AuthenticatedUser, require_role, require_audit_officer
from backend.auth.roles import UserRole
from backend.database.firestore_client import db
from backend.database.models import now_utc_iso
from backend.modules.module5_trust.audit_ledger import AuditLedger

router = APIRouter(prefix="/api/v1/audit", tags=["Independent Audit & Governance"])

AUDIT_READ_ROLES = [
    UserRole.AUDIT_OFFICER,
    UserRole.RISK_MANAGER,
    UserRole.CREDIT_APPROVER,
    UserRole.SYS_ADMIN,
    UserRole.ADMIN,
]

class CreateFindingRequest(BaseModel):
    application_id: str
    journey_id: str
    finding_type: str = Field(
        ...,
        description="OVERRIDE_ANOMALY | SLA_BREACH | POLICY_NON_COMPLIANCE | EVIDENCE_INTEGRITY_MISMATCH | BIAS_FLAG"
    )
    severity: str = Field("MEDIUM", description="LOW | MEDIUM | HIGH | CRITICAL")
    title: str = Field(..., min_length=5)
    narrative_explanation: str = Field(..., min_length=15)
    referenced_event_ids: List[str] = Field(default_factory=list)
    target_department: str = Field("FIRST_LINE_OPERATIONS", description="FIRST_LINE_OPERATIONS | SECOND_LINE_RISK | ALGORITHMIC_MODELING")

@router.get("/cases")
def list_audit_cases(
    limit: int = Query(50, ge=1, le=200),
    user: AuthenticatedUser = Depends(require_role(AUDIT_READ_ROLES)),
) -> List[Dict[str, Any]]:
    """
    Returns high-level portfolio applications with audit metadata,
    decision flags, and override status for independent inspection.
    """
    apps = db.list("applications", limit=limit)
    cases = []
    for app in apps:
        app_id = app.get("applicationId", app.get("application_id"))
        reviews = db.list("human_reviews", {"applicationId": app_id})
        feedbacks = db.list("feedback_events", {"applicationId": app_id})
        audit_events = db.list("audit_logs", {"applicationId": app_id})
        
        has_override = any(r.get("originalAIOutcome") != r.get("humanOutcome") for r in reviews if r.get("humanOutcome"))
        
        cases.append({
            "applicationId": app_id,
            "businessName": app.get("businessName", app.get("business_name", "N/A")),
            "requestedAmount": app.get("requestedAmount", app.get("requested_amount", 0.0)),
            "status": app.get("status", "ACTIVE"),
            "currentStage": app.get("currentStage", app.get("current_stage", "UNKNOWN")),
            "auditEventCount": len(audit_events),
            "reviewCount": len(reviews),
            "hasOverride": has_override,
            "lastReviewed": reviews[-1].get("updatedAt") if reviews else None,
            "createdAt": app.get("createdAt", app.get("created_at")),
        })
    return cases

@router.get("/findings")
def list_findings(
    status: Optional[str] = Query(None, description="OPEN | UNDER_INVESTIGATION | RESOLVED | CLOSED"),
    severity: Optional[str] = Query(None, description="LOW | MEDIUM | HIGH | CRITICAL"),
    user: AuthenticatedUser = Depends(require_role(AUDIT_READ_ROLES)),
) -> List[Dict[str, Any]]:
    """Lists institutional audit findings opened by the Independent Audit Officer."""
    findings = db.list("audit_findings")
    if status:
        findings = [f for f in findings if f.get("status") == status.upper()]
    if severity:
        findings = [f for f in findings if f.get("severity") == severity.upper()]
    return findings

@router.post("/findings")
def create_finding(
    req: CreateFindingRequest,
    user: AuthenticatedUser = Depends(require_audit_officer),
) -> Dict[str, Any]:
    """
    Open a formal Audit Finding.
    Strictly restricted to the Independent Audit & Governance Officer (Sunita Rao).
    """
    finding_id = f"fnd_{uuid.uuid4().hex[:10]}"
    now = now_utc_iso()

    finding_doc = {
        "findingId": finding_id,
        "applicationId": req.application_id,
        "journeyId": req.journey_id,
        "auditOfficerId": user.uid,
        "auditOfficerName": user.name,
        "findingType": req.finding_type,
        "severity": req.severity.upper(),
        "title": req.title,
        "narrativeExplanation": req.narrative_explanation,
        "referencedEventIds": req.referenced_event_ids,
        "status": "OPEN",
        "targetDepartment": req.target_department,
        "createdAt": now,
        "updatedAt": now,
    }

    db.set("audit_findings", finding_id, finding_doc)

    AuditLedger.record_event(
        application_id=req.application_id,
        journey_id=req.journey_id,
        event_type="AUDIT_FINDING_OPENED",
        actor_type=user.role.value,
        actor_id=user.uid,
        stage="AUDIT_GOVERNANCE",
        payload_summary=f"Audit Finding opened: [{req.severity.upper()}] {req.title}",
        references={
            "finding_id": finding_id,
            "finding_type": req.finding_type,
            "severity": req.severity.upper(),
        },
        service="audit-governance-service",
    )

    return finding_doc

@router.get("/override-analytics")
def get_override_analytics(
    user: AuthenticatedUser = Depends(require_role(AUDIT_READ_ROLES)),
) -> Dict[str, Any]:
    """
    Aggregates override pattern analytics across all portfolios:
    - Overall concurrence rate vs override rate
    - Distribution of override reasons
    - Overrides grouped by reviewer role
    """
    reviews = db.list("human_reviews")
    total_reviews = len(reviews)
    if total_reviews == 0:
        return {
            "totalReviews": 0,
            "totalOverrides": 0,
            "overrideRatePct": 0.0,
            "concurrenceRatePct": 100.0,
            "byRole": {},
            "byReasonCode": {},
        }

    overrides = 0
    by_role: Dict[str, int] = {}
    by_reason: Dict[str, int] = {}

    for r in reviews:
        ai_out = r.get("originalAIOutcome")
        human_out = r.get("humanOutcome")
        role = r.get("reviewerRole", "UNKNOWN")
        reason = r.get("reasonCode", "OTHER")

        if human_out and ai_out and human_out != ai_out:
            overrides += 1
            by_role[role] = by_role.get(role, 0) + 1
            by_reason[reason] = by_reason.get(reason, 0) + 1

    override_rate = round((overrides / total_reviews) * 100, 1)
    concurrence_rate = round(100.0 - override_rate, 1)

    return {
        "totalReviews": total_reviews,
        "totalOverrides": overrides,
        "overrideRatePct": override_rate,
        "concurrenceRatePct": concurrence_rate,
        "byRole": by_role,
        "byReasonCode": by_reason,
    }


@router.get("/replay/{journey_id}")
def get_audit_decision_replay(journey_id: str) -> Dict[str, Any]:
    """
    Direct Audit Replay endpoint for independent assurance inspection.
    Reconstructs chronological decision progression from audit ledger.
    """
    from backend.modules.module6_product.decision_replay import DecisionReplayService
    return DecisionReplayService.replay_decision_state(journey_id)

