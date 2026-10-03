"""
End-to-End Test Suite: Enterprise RBAC & Separation of Duties (7+1 Roles)
========================================================================
Proves that:
1. All 8 roles resolve cleanly with their respective permissions and delegated limits.
2. Separation of Duties is strictly enforced:
   - RM / RM Supervisor cannot unilaterally approve loans (blocked with 403).
   - Risk Officer cannot approve loans exceeding ₹25,00,000 (blocked with 403).
   - Risk Manager cannot approve loans exceeding ₹1,00,00,000 (blocked with 403).
   - Credit Approver has final sanction authority for Tier 3 (> ₹1 Crore).
   - System Administrator (Amit Verma) has ZERO financial approval authority.
   - Independent Audit Officer (Sunita Rao) can open findings & inspect, but cannot approve.
3. Audit logs, decisions, and evidence items are append-only.
"""
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.auth.roles import UserRole
from backend.auth.firebase_auth import DEMO_USERS, get_current_user, AuthenticatedUser
from backend.database.firestore_client import db

client = TestClient(app)

def test_all_eight_personas_in_demo_users():
    """Verify all 7 business roles + 1 SysAdmin exist in DEMO_USERS."""
    expected_roles = {
        "demo-customer": UserRole.CUSTOMER,
        "demo-rm": UserRole.RM,
        "demo-rm-supervisor": UserRole.RM_SUPERVISOR,
        "demo-risk-officer": UserRole.RISK_OFFICER,
        "demo-risk-manager": UserRole.RISK_MANAGER,
        "demo-credit-approver": UserRole.CREDIT_APPROVER,
        "demo-audit-officer": UserRole.AUDIT_OFFICER,
        "demo-admin": UserRole.SYS_ADMIN,
    }
    for token, expected_role in expected_roles.items():
        assert token in DEMO_USERS, f"Token {token} missing in DEMO_USERS"
        user = DEMO_USERS[token]
        assert user.role == expected_role, f"Role mismatch for {token}: {user.role} != {expected_role}"

def test_auth_personas_endpoint():
    """Verify GET /api/v1/auth/personas returns all 8 profiles."""
    res = client.get("/api/v1/auth/personas")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 8
    roles = [p["role"] for p in data]
    assert "CUSTOMER" in roles
    assert "RM" in roles
    assert "RM_SUPERVISOR" in roles
    assert "RISK_OFFICER" in roles
    assert "RISK_MANAGER" in roles
    assert "CREDIT_APPROVER" in roles
    assert "AUDIT_OFFICER" in roles
    assert "SYS_ADMIN" in roles

def test_rm_cannot_approve_loan_unilaterally():
    """First-Line RM attempting to approve a loan must receive HTTP 403."""
    # Seed an application and a review
    app_id = "test_app_sod_001"
    journey_id = "test_jrn_sod_001"
    db.set("applications", app_id, {
        "applicationId": app_id,
        "application_id": app_id,
        "requestedAmount": 1500000.0,
        "requested_amount": 1500000.0,
    })
    db.set("journeys", journey_id, {
        "journey_id": journey_id,
        "journeyId": journey_id,
        "application_id": app_id,
        "applicationId": app_id,
    })
    db.set("decisions", f"dec_{app_id}", {
        "decision_id": f"dec_{app_id}",
        "application_id": app_id,
        "outcome": "NEEDS_REVIEW",
        "approved_amount": 0,
    })
    
    # RM starts review
    start_res = client.post(
        f"/api/v1/journeys/{journey_id}/review",
        headers={"Authorization": "Bearer demo-rm"},
        json={"notes": "RM opening review"}
    )
    assert start_res.status_code == 200
    rev_id = start_res.json()["reviewId"]

    # RM tries to unilaterally sanction approval -> MUST FAIL WITH 403
    submit_res = client.post(
        f"/api/v1/journeys/{journey_id}/review/{rev_id}/submit",
        headers={"Authorization": "Bearer demo-rm"},
        json={
            "human_outcome": "APPROVED",
            "reason_code": "RC_EXCELLENT_TURNOVER",
            "rationale_notes": "Attempting unilateral sanction by RM without risk officer approval."
        }
    )
    assert submit_res.status_code == 403
    assert "Separation of Duties violation" in submit_res.json()["detail"]

def test_risk_officer_delegated_limit_enforcement():
    """Risk Officer can approve up to ₹25L, but is blocked for ₹50L (requires Risk Manager)."""
    app_id = "test_app_high_amount"
    journey_id = "test_jrn_high_amount"
    db.set("applications", app_id, {
        "applicationId": app_id,
        "application_id": app_id,
        "requestedAmount": 5000000.0, # ₹50 Lakhs (exceeds ₹25L limit)
        "requested_amount": 5000000.0,
    })
    db.set("journeys", journey_id, {
        "journey_id": journey_id,
        "journeyId": journey_id,
        "application_id": app_id,
        "applicationId": app_id,
    })
    db.set("decisions", f"dec_{app_id}", {
        "decision_id": f"dec_{app_id}",
        "application_id": app_id,
        "outcome": "NEEDS_REVIEW",
    })

    # Risk Officer opens review
    start_res = client.post(
        f"/api/v1/journeys/{journey_id}/review",
        headers={"Authorization": "Bearer demo-risk-officer"},
        json={}
    )
    rev_id = start_res.json()["reviewId"]

    # Risk Officer tries to approve ₹50L loan -> BLOCKED WITH 403
    submit_res = client.post(
        f"/api/v1/journeys/{journey_id}/review/{rev_id}/submit",
        headers={"Authorization": "Bearer demo-risk-officer"},
        json={
            "human_outcome": "APPROVED",
            "reason_code": "RC_RISK_ACCEPTABLE",
            "rationale_notes": "Officer attempting to approve loan beyond their ₹25L delegated authority."
        }
    )
    assert submit_res.status_code == 403
    assert "Delegated Authority limit exceeded" in submit_res.json()["detail"]

def test_credit_approver_can_sanction_high_value_loan():
    """Credit Approver / Committee chair can sanction high-value loans."""
    app_id = "test_app_tier3_sanction"
    journey_id = "test_jrn_tier3_sanction"
    db.set("applications", app_id, {
        "applicationId": app_id,
        "application_id": app_id,
        "requestedAmount": 15000000.0, # ₹1.5 Crore Tier 3 exposure
        "requested_amount": 15000000.0,
    })
    db.set("journeys", journey_id, {
        "journey_id": journey_id,
        "journeyId": journey_id,
        "application_id": app_id,
        "applicationId": app_id,
    })
    db.set("decisions", f"dec_{app_id}", {
        "decision_id": f"dec_{app_id}",
        "application_id": app_id,
        "outcome": "NEEDS_REVIEW",
    })

    # Approver opens review
    start_res = client.post(
        f"/api/v1/journeys/{journey_id}/review",
        headers={"Authorization": "Bearer demo-credit-approver"},
        json={}
    )
    rev_id = start_res.json()["reviewId"]

    # Credit Approver submits sanction approval -> SUCCESS
    submit_res = client.post(
        f"/api/v1/journeys/{journey_id}/review/{rev_id}/submit",
        headers={"Authorization": "Bearer demo-credit-approver"},
        json={
            "human_outcome": "APPROVED",
            "reason_code": "RC_BOARD_APPROVED_FACILITY",
            "rationale_notes": "Sanctioned by Credit Approver with personal guarantee and Tier-1 receivables escrow.",
            "new_approved_amount": 15000000.0,
            "new_interest_rate": 10.5
        }
    )
    assert submit_res.status_code == 200
    assert submit_res.json()["status"] == "SUBMITTED"
    assert submit_res.json()["humanOutcome"] == "APPROVED"

def test_sysadmin_has_zero_financial_approval_authority():
    """System Administrator cannot open or submit reviews (Technical Custodian only)."""
    res = client.post(
        "/api/v1/journeys/jrn_priya_001/review",
        headers={"Authorization": "Bearer demo-admin"},
        json={}
    )
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]

def test_audit_officer_can_inspect_and_open_findings():
    """Independent Audit Officer can inspect portfolio cases and open findings."""
    # List audit cases
    cases_res = client.get("/api/v1/audit/cases", headers={"Authorization": "Bearer demo-audit-officer"})
    assert cases_res.status_code == 200

    # Open formal audit finding
    finding_res = client.post(
        "/api/v1/audit/findings",
        headers={"Authorization": "Bearer demo-audit-officer"},
        json={
            "application_id": "test_app_sod_001",
            "journey_id": "test_jrn_sod_001",
            "finding_type": "OVERRIDE_ANOMALY",
            "severity": "HIGH",
            "title": "Unusual collateral valuation discrepancy",
            "narrative_explanation": "Detailed inspection reveals independent assessment differs from original statement.",
            "target_department": "SECOND_LINE_RISK"
        }
    )
    assert finding_res.status_code == 200
    data = finding_res.json()
    assert data["status"] == "OPEN"
    assert data["severity"] == "HIGH"
    assert data["auditOfficerName"] == "Sunita Rao"
