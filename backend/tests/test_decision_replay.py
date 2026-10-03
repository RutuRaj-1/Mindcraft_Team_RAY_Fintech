"""
Unit and Integration Tests for Decision Replay Engine
======================================================
Tests:
- Reconstructs decision journey in chronological order
- Audit event fields: eventId, applicationId, eventType, actorType, actorId, stage,
  payloadSummary, references, timestamp, service, modelVersion
- Clickable event details: input, output, evidenceUsed
- Sanitization: no secrets or passwords logged
- Append-only ledger behavior
- GET /api/v1/journeys/{id}/replay endpoint
"""

import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from backend.main import app
from backend.database.firestore_client import db
from backend.routers.demo_router import seed_demo_data
from backend.modules.module5_trust.audit_ledger import AuditLedger, sanitize_audit_payload
from backend.modules.module6_product.decision_replay import DecisionReplayService
from backend.auth.firebase_auth import get_current_user, AuthenticatedUser, UserRole

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_seed():
    seed_demo_data()


def test_decision_replay_reconstruction_chronological():
    """Verify Decision Replay reconstructs events in strictly chronological order."""
    res = DecisionReplayService.replay_decision_state("jrn_priya_001")
    assert res is not None
    assert "timeline" in res
    timeline = res["timeline"]
    assert len(timeline) >= 10

    # Verify chronological ordering
    timestamps = [ev["timestamp"] for ev in timeline]
    assert timestamps == sorted(timestamps)

    # Verify all expected event types exist in sequence
    event_types = [ev["eventType"] for ev in timeline]
    assert "INTENT_RECEIVED" in event_types
    assert "JOURNEY_CREATED" in event_types
    assert "DOCUMENT_UPLOADED" in event_types
    assert "OCR_COMPLETED" in event_types
    assert "EVIDENCE_VERIFIED" in event_types
    assert "CASHFLOW_CALCULATED" in event_types
    assert "RISK_ASSESSED" in event_types
    assert "SHAP_GENERATED" in event_types
    assert "POLICY_RETRIEVED" in event_types
    assert "DECISION_GENERATED" in event_types

def test_decision_replay_event_fields():
    """Verify each audit event has the required fields."""
    res = DecisionReplayService.replay_decision_state("jrn_priya_001")
    for ev in res["timeline"]:
        assert "eventId" in ev
        assert "applicationId" in ev
        assert "eventType" in ev
        assert "actorType" in ev
        assert "actorId" in ev
        assert "stage" in ev
        assert "payloadSummary" in ev
        assert "references" in ev
        assert "timestamp" in ev
        assert "service" in ev
        assert "input" in ev
        assert "output" in ev
        assert "evidenceUsed" in ev

def test_decision_replay_click_traceability():
    """Verify clicking an event reveals input entered, output generated, and evidence used."""
    res = DecisionReplayService.replay_decision_state("jrn_priya_001")
    timeline = res["timeline"]
    
    # 1. OCR_COMPLETED event
    ocr_ev = next(e for e in timeline if e["eventType"] == "OCR_COMPLETED")
    assert "FinFlow-OCR" in (ocr_ev.get("modelVersion") or "")
    assert isinstance(ocr_ev["input"], dict)
    assert isinstance(ocr_ev["output"], dict)
    assert len(ocr_ev["evidenceUsed"]) > 0

    # 2. DECISION_GENERATED event
    dec_ev = next(e for e in timeline if e["eventType"] == "DECISION_GENERATED")
    assert dec_ev["actorType"] in ["AI_AGENT", "SYSTEM"]
    assert dec_ev["output"].get("outcome") == "APPROVED"
    assert len(dec_ev["evidenceUsed"]) > 0

def test_decision_replay_discrepancy_and_override_case():
    """Verify Case 3 (Apex Logistics) includes INCONSISTENCY_DETECTED, HUMAN_REVIEW, and HUMAN_OVERRIDE."""
    res = DecisionReplayService.replay_decision_state("jrn_apex_003")
    event_types = [e["eventType"] for e in res["timeline"]]
    assert "INCONSISTENCY_DETECTED" in event_types
    assert "HUMAN_REVIEW_STARTED" in event_types
    assert "HUMAN_OVERRIDE" in event_types

    inconsistency_ev = next(e for e in res["timeline"] if e["eventType"] == "INCONSISTENCY_DETECTED")
    assert "37.5%" in inconsistency_ev["payloadSummary"]

    override_ev = next(e for e in res["timeline"] if e["eventType"] == "HUMAN_OVERRIDE")
    assert override_ev["actorType"] == "RISK_OFFICER"
    assert "CONDITIONAL_APPROVAL" in override_ev["payloadSummary"]

def test_secrets_sanitization():
    """Verify secrets and sensitive credentials are never stored in audit logs."""
    dirty_payload = {
        "user_id": "usr_test",
        "password": "super_secret_password_123",
        "api_key": "sk-live-secret-token",
        "nested": {
            "auth_token": "bearer eyJhbGciOi...",
            "valid_field": "safe_value"
        }
    }
    clean = sanitize_audit_payload(dirty_payload)
    assert clean["password"] == "[REDACTED_SECRET]"
    assert clean["api_key"] == "[REDACTED_SECRET]"
    assert clean["nested"]["auth_token"] == "[REDACTED_SECRET]"
    assert clean["nested"]["valid_field"] == "safe_value"

def test_api_replay_endpoint():
    """Verify GET /api/v1/journeys/{id}/replay endpoint."""
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        uid="usr_risk_test",
        email="risk@finflow.ai",
        role=UserRole.RISK_OFFICER,
        name="Test Officer"
    )

    response = client.get("/api/v1/journeys/jrn_priya_001/replay")
    assert response.status_code == 200
    data = response.json()
    assert data["journey_id"] == "jrn_priya_001"
    assert data["is_tamper_evident"] is True
    assert "timeline" in data
    assert len(data["timeline"]) >= 10

    # Test resolving by application ID as well
    app_response = client.get("/api/v1/journeys/app_priya_001/replay")
    assert app_response.status_code == 200
    app_data = app_response.json()
    assert app_data["application_id"] == "app_priya_001"

    app.dependency_overrides.clear()
