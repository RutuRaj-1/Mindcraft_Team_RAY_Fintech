"""
Unit and Integration Tests for Next Best Action System & Safe Action Agent
============================================================================
Validates:
  1. NextBestActionService ranking logic across all candidate actions.
  2. State adaptability (action changes based on stage, missing docs, inconsistency, risk).
  3. Role awareness (CUSTOMER vs RM vs RISK_OFFICER).
  4. SafeActionAgent safety invariants (autonomous disbursal/sanction strictly blocked).
  5. Execution of permitted safe actions (CREATE_INTERNAL_TASK, UPDATE_JOURNEY_STAGE, etc.).
  6. API endpoints:
     - GET /api/v1/journeys/{id}/actions
     - POST /api/v1/journeys/{id}/actions/execute
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.database.models import (
    JourneyStage,
    DecisionOutcome,
    SafeActionExecutionRequest,
)
from backend.modules.module6_product.safe_action_agent import (
    NextBestActionService,
    SafeActionAgent,
)
from backend.database.firestore_client import db

client = TestClient(app)

AUTH_HEADERS_CUSTOMER = {
    "X-Demo-User-Role": "CUSTOMER",
    "X-Demo-User-Uid": "usr_cust_nba_01",
}

AUTH_HEADERS_RM = {
    "X-Demo-User-Role": "RM",
    "X-Demo-User-Uid": "usr_rm_nba_01",
}

AUTH_HEADERS_OFFICER = {
    "X-Demo-User-Role": "RISK_OFFICER",
    "X-Demo-User-Uid": "usr_risk_nba_01",
}


@pytest.fixture
def setup_nba_journey():
    import uuid
    uid = uuid.uuid4().hex[:8]
    journey_id = f"jrn_test_nba_{uid}"
    app_id = f"app_test_nba_{uid}"

    db.set("journeys", journey_id, {
        "journey_id": journey_id,
        "application_id": app_id,
        "customer_id": f"cust_nba_{uid}",
        "current_stage": "INTENT_CAPTURE",
        "status": "ACTIVE",
        "created_at": "2024-01-01T00:00:00Z",
    })

    db.set("applications", app_id, {
        "application_id": app_id,
        "journey_id": journey_id,
        "business_name": "Zenith Machinery Works",
        "product_type": "sme_working_capital",
        "requested_amount": 1000000.0,
        "missing_evidence_requirements": [],
    })

    return journey_id, app_id


# ==============================================================================
# 1. State Adaptability & Ranking Tests
# ==============================================================================
def test_next_best_action_intent_capture_stage(setup_nba_journey):
    journey_id, _ = setup_nba_journey

    response = NextBestActionService.determine_next_best_action(journey_id, user_role="CUSTOMER")
    assert response is not None
    assert response.recommendedAction == "accept configured next step"
    assert response.priority == 1
    assert response.actor == "CUSTOMER"
    assert response.requiredInput is not None
    assert response.estimatedImpact is not None
    assert response.status in ["ACTIONABLE", "READY"]
    assert response.primary_action.cta_label is not None


def test_next_best_action_missing_documents(setup_nba_journey):
    journey_id, app_id = setup_nba_journey

    # Advance stage to EVIDENCE_COLLECTION and mark missing documents
    db.set("journeys", journey_id, {
        "journey_id": journey_id,
        "application_id": app_id,
        "current_stage": JourneyStage.EVIDENCE_COLLECTION.value,
        "status": "ACTIVE",
    })
    db.set("applications", app_id, {
        "application_id": app_id,
        "missing_evidence_requirements": ["BANK_STATEMENT", "GST_RETURN"],
    })

    response = NextBestActionService.determine_next_best_action(journey_id, user_role="CUSTOMER")
    assert response.recommendedAction == "upload missing document"
    assert response.priority == 1
    assert "BANK_STATEMENT" in response.reason or "Bank Statement" in response.reason
    assert "PDF" in response.requiredInput or "scanned" in response.requiredInput


def test_next_best_action_low_confidence_document(setup_nba_journey):
    journey_id, app_id = setup_nba_journey

    db.set("journeys", journey_id, {
        "journey_id": journey_id,
        "application_id": app_id,
        "current_stage": JourneyStage.EVIDENCE_COLLECTION.value,
        "status": "ACTIVE",
    })
    db.set("applications", app_id, {
        "application_id": app_id,
        "missing_evidence_requirements": [],
    })
    # Add low-confidence document
    db.set("documents", f"doc_low_{app_id}", {
        "document_id": f"doc_low_{app_id}",
        "application_id": app_id,
        "document_type": "GST_RETURN",
        "confidence": 0.45,
    })

    response = NextBestActionService.determine_next_best_action(journey_id, user_role="CUSTOMER")
    assert response.recommendedAction == "re-upload low-confidence document"
    assert response.priority == 1
    assert "45%" in response.primary_action.description


def test_next_best_action_cross_document_inconsistency(setup_nba_journey):
    journey_id, app_id = setup_nba_journey

    db.set("journeys", journey_id, {
        "journey_id": journey_id,
        "application_id": app_id,
        "current_stage": JourneyStage.VERIFICATION.value,
        "status": "ACTIVE",
    })
    # Set consistency report with discrepancies
    db.set("consistency_reports", f"rep_{app_id}", {
        "report_id": f"rep_{app_id}",
        "application_id": app_id,
        "is_consistent": False,
        "discrepancies": [{"field": "annual_turnover", "explanation": "25% variance"}],
    })

    # When RM queries, priority is resolve inconsistency
    response_rm = NextBestActionService.determine_next_best_action(journey_id, user_role="RM")
    assert response_rm.recommendedAction in ["resolve inconsistency", "send to risk officer"]
    assert response_rm.priority == 1


def test_next_best_action_approved_decision(setup_nba_journey):
    journey_id, app_id = setup_nba_journey

    db.set("journeys", journey_id, {
        "journey_id": journey_id,
        "application_id": app_id,
        "current_stage": JourneyStage.EXPLAINABLE_DECISION.value,
        "status": "ACTIVE",
    })
    db.set("decisions", f"dec_{app_id}", {
        "decision_id": f"dec_{app_id}",
        "application_id": app_id,
        "outcome": DecisionOutcome.APPROVED.value,
        "approved_amount": 1000000.0,
        "interest_rate": 10.75,
        "decided_at": "2024-01-01T00:00:00Z",
    })

    response = NextBestActionService.determine_next_best_action(journey_id, user_role="CUSTOMER")
    assert response.recommendedAction == "accept configured next step"
    assert "Sanction" in response.primary_action.title or "E-Sign" in response.primary_action.title


def test_next_best_action_terminal_stage(setup_nba_journey):
    journey_id, app_id = setup_nba_journey

    db.set("journeys", journey_id, {
        "journey_id": journey_id,
        "application_id": app_id,
        "current_stage": JourneyStage.SANCTIONED.value,
        "status": "ACTIVE",
    })

    response = NextBestActionService.determine_next_best_action(journey_id, user_role="CUSTOMER")
    assert response.recommendedAction == "complete journey"
    assert response.status == "COMPLETED"


# ==============================================================================
# 2. Safe Action Agent Guardrail Tests (Unsafe Action Prevention)
# ==============================================================================
def test_safe_action_agent_strictly_blocks_unsafe_financial_operations(setup_nba_journey):
    journey_id, app_id = setup_nba_journey

    # Attempt direct autonomous financial disbursal
    unsafe_request = SafeActionExecutionRequest(
        action_type="DISBURSE_FUNDS",
        application_id=app_id,
        details={"amount": 1000000.0, "account": "123456789"},
    )

    result = SafeActionAgent.execute_action(
        journey_id=journey_id,
        request=unsafe_request,
        actor_id="usr_ai_agent",
        actor_role="AI_ORCHESTRATOR",
    )

    # Invariant: Must fail and report blocked guardrail
    assert result.success is False
    assert result.guardrail_status == "BLOCKED_UNSAFE_OPERATION"
    assert "strictly blocked" in result.message.lower()
    assert result.audit_event_id.startswith("aud_")


def test_safe_action_agent_blocks_direct_sanction(setup_nba_journey):
    journey_id, app_id = setup_nba_journey

    unsafe_request = SafeActionExecutionRequest(
        action_type="AUTONOMOUS_SANCTION",
        application_id=app_id,
    )

    result = SafeActionAgent.execute_action(
        journey_id=journey_id,
        request=unsafe_request,
        actor_id="usr_ai_agent",
        actor_role="AI_ORCHESTRATOR",
    )

    assert result.success is False
    assert result.guardrail_status == "BLOCKED_UNSAFE_OPERATION"


# ==============================================================================
# 3. Permitted Safe Action Execution Tests
# ==============================================================================
def test_safe_action_agent_creates_internal_task(setup_nba_journey):
    journey_id, app_id = setup_nba_journey

    req = SafeActionExecutionRequest(
        action_type="CREATE_INTERNAL_TASK",
        reviewer_role="RM",
        task_details={"title": "Verify factory premises for Zenith", "priority": "HIGH"},
    )

    result = SafeActionAgent.execute_action(
        journey_id=journey_id,
        request=req,
        actor_id="usr_rm_01",
        actor_role="RM",
    )

    assert result.success is True
    assert result.guardrail_status == "SAFE"
    assert "task_id" in result.details
    assert result.audit_event_id.startswith("aud_")


def test_safe_action_agent_updates_journey_stage(setup_nba_journey):
    journey_id, app_id = setup_nba_journey

    req = SafeActionExecutionRequest(
        action_type="UPDATE_JOURNEY_STAGE",
        target_stage="EVIDENCE_COLLECTION",
        audit_notes="Advancing stage after intent capture validation",
    )

    result = SafeActionAgent.execute_action(
        journey_id=journey_id,
        request=req,
        actor_id="usr_cust_01",
        actor_role="CUSTOMER",
    )

    assert result.success is True
    assert result.guardrail_status == "SAFE"
    journey = db.get("journeys", journey_id)
    assert journey["current_stage"] == "EVIDENCE_COLLECTION"


def test_safe_action_agent_requests_evidence(setup_nba_journey):
    journey_id, app_id = setup_nba_journey

    req = SafeActionExecutionRequest(
        action_type="REQUEST_EVIDENCE",
        evidence_type="UDYAM_AADHAAR",
    )

    result = SafeActionAgent.execute_action(
        journey_id=journey_id,
        request=req,
        actor_id="usr_rm_01",
        actor_role="RM",
    )

    assert result.success is True
    assert result.guardrail_status == "SAFE"
    app_rec = db.get("applications", app_id)
    assert "UDYAM_AADHAAR" in app_rec.get("missing_evidence_requirements", [])


# ==============================================================================
# 4. API Endpoint Integration Tests
# ==============================================================================
def test_api_get_actions_endpoint(setup_nba_journey):
    journey_id, _ = setup_nba_journey

    res = client.get(
        f"/api/v1/journeys/{journey_id}/actions",
        headers=AUTH_HEADERS_CUSTOMER,
    )
    assert res.status_code == 200, res.text
    data = res.json()

    assert "recommendedAction" in data
    assert "reason" in data
    assert "priority" in data
    assert "actor" in data
    assert "requiredInput" in data
    assert "estimatedImpact" in data
    assert "status" in data
    assert "primary_action" in data
    assert data["primary_action"]["cta_label"] is not None


def test_api_execute_safe_action_endpoint(setup_nba_journey):
    journey_id, app_id = setup_nba_journey

    res = client.post(
        f"/api/v1/journeys/{journey_id}/actions/execute",
        headers=AUTH_HEADERS_RM,
        json={
            "action_type": "CREATE_INTERNAL_TASK",
            "reviewer_role": "RISK_OFFICER",
            "task_details": {"title": "Review debt service capacity", "priority": "HIGH"},
        },
    )
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["success"] is True
    assert data["guardrail_status"] == "SAFE"
    assert "task_id" in data["details"]
    assert "audit_event_id" in data
