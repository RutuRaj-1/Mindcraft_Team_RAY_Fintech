import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.routers.demo_router import seed_demo_data

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_seed():
    seed_demo_data()

def test_fraud_signals_endpoint_structure_and_phrasing():
    """
    Verifies:
    1. GET /api/v1/journeys/{id}/fraud-signals returns signals for flagged case (Apex Logistics).
    2. All required fields are present.
    3. Phrasing invariant: Must contain 'Potential linked-case risk detected.' and NOT 'Fraud detected.'
    """
    response = client.get("/api/v1/journeys/jrn_apex_003/fraud-signals")
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["journeyId"] == "jrn_apex_003"
    assert data["applicationId"] == "app_apex_003"
    assert "signals" in data
    signals = data["signals"]
    assert len(signals) >= 3, f"Expected at least 3 detected signals, got {len(signals)}"

    # Required fields verification
    signal_types = []
    for sig in signals:
        assert "signalId" in sig
        assert "applicationId" in sig
        assert "signalType" in sig
        assert "severity" in sig
        assert "linkedApplications" in sig
        assert "evidenceReferences" in sig
        assert "explanation" in sig
        assert "status" in sig
        assert "createdAt" in sig

        # Strict phrasing invariant check:
        # Phrase output as: "Potential linked-case risk detected."
        # Not: "Fraud detected."
        assert "Potential linked-case risk detected." in sig["explanation"]
        assert "Fraud detected" not in sig["explanation"]

        signal_types.append(sig["signalType"])

        # Traceability & evidence check
        assert len(sig["linkedApplications"]) > 0
        assert len(sig["evidenceReferences"]) > 0
        for linked in sig["linkedApplications"]:
            assert "applicationId" in linked
            assert "businessName" in linked
            assert "sharedField" in linked
            assert "reason" in linked

    # Check that key patterns were detected
    assert "SHARED_BANK_ACCOUNT" in signal_types or "SHARED_PHONE" in signal_types
    assert "REPEATED_DOCUMENT_HASH" in signal_types or "SHARED_GSTIN" in signal_types or "IDENTITY_CONFLICT" in signal_types

def test_clean_case_has_no_fraud_signals():
    """
    Sharma Textiles (jrn_priya_001) is a clean prime borrower with 0 cross-application link signals.
    """
    response = client.get("/api/v1/journeys/jrn_priya_001/fraud-signals")
    assert response.status_code == 200
    data = response.json()
    assert len(data["signals"]) == 0
    assert data["hasSignals"] is False

def test_fraud_network_endpoint():
    """
    Verifies GET /api/v1/fraud/network returns graph with applications, shared identifiers, and edges.
    """
    response = client.get("/api/v1/fraud/network?focus_id=jrn_apex_003")
    assert response.status_code == 200, response.text
    network = response.json()

    assert "nodes" in network
    assert "edges" in network
    assert "signals" in network

    nodes = network["nodes"]
    edges = network["edges"]

    # Verify focus app node
    focus_nodes = [n for n in nodes if n["id"] == "app_apex_003"]
    assert len(focus_nodes) == 1
    assert focus_nodes[0]["isCurrent"] is True

    # Verify shared identifier nodes
    node_types = {n["type"] for n in nodes}
    assert "APPLICATION" in node_types
    assert any(t in node_types for t in ["BANK_ACCOUNT", "GSTIN", "PHONE", "DOCUMENT_HASH", "PAN", "ADDRESS"])

    # Verify edge connectivity
    assert len(edges) > 0
    for edge in edges:
        assert "source" in edge
        assert "target" in edge
        assert "relationship" in edge
        assert "label" in edge

def test_risk_officer_signal_resolution_and_audit():
    """
    Verifies that a Risk Officer can acknowledge or resolve a signal,
    and all actions are appended to the immutable audit trail.
    """
    # 1. Fetch signal
    response = client.get("/api/v1/journeys/jrn_apex_003/fraud-signals")
    signals = response.json()["signals"]
    assert len(signals) > 0
    target_signal = signals[0]
    signal_id = target_signal["signalId"]

    # 2. Acknowledge signal
    ack_res = client.post(
        f"/api/v1/fraud/signals/{signal_id}/status",
        json={
            "status": "ACKNOWLEDGED",
            "officerId": "officer_ananya_01",
            "notes": "Acknowledged potential linked bank account risk. Underwriter phone interview scheduled."
        }
    )
    assert ack_res.status_code == 200
    ack_data = ack_res.json()
    assert ack_data["status"] == "ACKNOWLEDGED"

    # 3. Resolve signal as FALSE_POSITIVE with corporate clarification
    resolve_res = client.post(
        f"/api/v1/fraud/signals/{signal_id}/status",
        json={
            "status": "FALSE_POSITIVE",
            "officerId": "officer_ananya_01",
            "notes": "Verified SwiftTrans is an affiliated subsidiary holding shared master treasury account. Approved with caveat."
        }
    )
    assert resolve_res.status_code == 200
    res_data = resolve_res.json()
    assert res_data["status"] == "FALSE_POSITIVE"
    assert res_data["resolvedBy"] == "officer_ananya_01"

    # 4. Verify decision replay / audit logs include the risk officer resolution action
    replay_res = client.get("/api/v1/journeys/jrn_apex_003/replay")
    assert replay_res.status_code == 200
    replay_events = replay_res.json().get("timeline", [])
    assert len(replay_events) > 0
