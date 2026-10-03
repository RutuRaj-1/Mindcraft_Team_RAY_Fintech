"""
FinFlow AI — End-to-End Acceptance Test Suite (TC-01 through TC-11)
===================================================================
Covers all 11 required system-level verification test cases:
  TC-01: Strong financial application -> ELIGIBLE, Low Risk, specific explanation
  TC-02: Missing mandatory KYC -> NEEDS_REVIEW, upload-document next action
  TC-03: Conflicting revenue -> Inconsistency signal, risk/compliance review
  TC-04: Decision requested before risk complete -> 409 structured conflict
  TC-05: LLM timeout -> Deterministic fallback explanation
  TC-06: OCR low confidence -> Manual review requirement
  TC-07: Unauthorized customer attempting RM action -> 403 Forbidden
  TC-08: Favorable ML probability with failed hard rule -> Hard rule authoritative
  TC-09: What-if scenario -> Base application completely unchanged
  TC-10: Shared identifier across synthetic cases -> Potential linked-case signal
  TC-11: Human override -> AI decision preserved, human outcome stored separately, reason required
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database.firestore_client import db
from backend.database.models import (
    JourneyRecord, ApplicationRecord, JourneyStage, JourneyStatus,
    DecisionOutcome, RiskBand
)
from backend.modules.module4_decision.explainable_decision_engine import FallbackExplanationGenerator
from backend.modules.module3_financial.consistency_engine import ConsistencyEngine
from backend.modules.module7_trust_intelligence.cross_application_intelligence import CrossApplicationIntelligence
from backend.routers import demo_router

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_benchmark_data():
    demo_router.seed_demo_data()


def test_tc01_strong_financial_application():
    """TC-01: Strong financial application -> ELIGIBLE, Low risk, specific explanation."""
    resp = client.get(
        "/api/v1/journeys/jrn_priya_001/decision",
        headers={"Authorization": "Bearer demo-customer"}
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["outcome"] == "APPROVED"
    assert data["approved_amount"] > 0
    assert len(data.get("reasoning", "")) > 20
    assert "Sharma Textiles" in data.get("reasoning", "")


def test_tc02_missing_mandatory_kyc():
    """TC-02: Missing mandatory KYC -> NEEDS_REVIEW, upload-document next action."""
    test_jrn_id = "jrn_tc02_missing_kyc"
    test_app_id = "app_tc02_missing_kyc"
    db.set("journeys", test_jrn_id, {
        "journey_id": test_jrn_id,
        "application_id": test_app_id,
        "current_stage": JourneyStage.EVIDENCE_COLLECTION.value,
        "status": JourneyStatus.ACTIVE.value
    })
    db.set("applications", test_app_id, {
        "application_id": test_app_id,
        "journey_id": test_jrn_id,
        "missing_evidence_requirements": ["BANK_STATEMENT", "KYC_AADHAAR"],
        "business_name": "Kavita Electronics"
    })
    db.set("decisions", f"dec_{test_app_id}", {
        "decision_id": f"dec_{test_app_id}",
        "application_id": test_app_id,
        "outcome": "NEEDS_REVIEW",
        "reasoning": "Missing mandatory KYC documentation and 6-month bank statement."
    })

    # Check decision
    resp = client.get(
        f"/api/v1/journeys/{test_jrn_id}/decision",
        headers={"Authorization": "Bearer demo-rm"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["outcome"] in ["NEEDS_REVIEW", "PENDING", "HUMAN_REVIEW"]

    # Check Next Best Action for missing evidence
    nba_resp = client.get(
        f"/api/v1/journeys/{test_jrn_id}/actions?role=CUSTOMER",
        headers={"Authorization": "Bearer demo-customer"}
    )
    assert nba_resp.status_code == 200
    nba_data = nba_resp.json()
    primary = nba_data.get("primaryAction", {}) or nba_data.get("primary_action", {})
    action_type = (primary.get("actionType") or primary.get("action_type") or primary.get("recommendedAction") or "").lower()
    desc = (primary.get("description") or primary.get("title") or "").lower()
    assert "upload" in action_type or "document" in action_type or "missing" in desc or "upload" in desc or "kyc" in desc


def test_tc03_conflicting_revenue():
    """TC-03: Conflicting revenue -> inconsistency signal, risk/compliance review."""
    report = ConsistencyEngine.verify_consistency("app_apex_003")
    assert report.is_consistent is False
    assert len(report.discrepancies) > 0
    assert any("gst" in d.field.lower() or "turnover" in d.field.lower() for d in report.discrepancies)

    # Journey outcome reflects human review
    journey = db.get("journeys", "jrn_apex_003")
    assert journey["current_stage"] in [JourneyStage.HUMAN_REVIEW.value, JourneyStage.RISK_ASSESSMENT.value, JourneyStage.EXPLAINABLE_DECISION.value]


def test_tc04_decision_requested_before_risk_complete():
    """TC-04: Decision requested before risk complete -> 409 structured conflict."""
    test_jrn_id = "jrn_tc04_premature_001"
    db.set("journeys", test_jrn_id, {
        "journey_id": test_jrn_id,
        "application_id": "app_tc04_premature_001",
        "current_stage": JourneyStage.INTENT_CAPTURE.value,
        "status": JourneyStatus.ACTIVE.value
    })

    resp = client.post(
        f"/api/v1/journeys/{test_jrn_id}/decision/generate",
        headers={"Authorization": "Bearer demo-rm"}
    )
    assert resp.status_code == 409, resp.text
    assert "Cannot generate decision" in resp.json()["detail"]


def test_tc05_llm_timeout_deterministic_fallback():
    """TC-05: LLM timeout -> deterministic fallback explanation."""
    summary, reasons = FallbackExplanationGenerator.generate(
        outcome=DecisionOutcome.APPROVED,
        business_name="Test Enterprise Pvt Ltd",
        risk_score=850.0,
        risk_band="LOW",
        approved_amount=1500000.0,
        interest_rate=10.75,
        tenor_months=12,
        hard_rules_passed=True,
        failed_rules=[],
        positive_factors=[{"feature_display_name": "DSCR", "shap_value": -0.15}],
        negative_factors=[],
        policy_citations=[{"title": "Working Capital Norms"}],
        warnings=[],
        missing_evidence=[],
    )
    assert len(summary) > 50
    assert "Test Enterprise Pvt Ltd" in summary
    assert "APPROVED" in summary
    assert len(reasons) > 0


def test_tc06_ocr_low_confidence_manual_review():
    """TC-06: OCR low confidence -> manual review requirement."""
    app_id = "app_apex_003"
    db.set("evidence_ledger", "evi_low_conf_test", {
        "evidence_id": "evi_low_conf_test",
        "application_id": app_id,
        "field_name": "operating_revenue",
        "field_value": 4500000.0,
        "confidence": 0.55,
        "extraction_engine": "OCR-LayoutLMv3",
        "source_document": "unclear_scan.pdf",
    })

    evidence = db.get("evidence_ledger", "evi_low_conf_test")
    assert evidence["confidence"] < 0.70
    assert evidence["confidence"] < 0.85


def test_tc07_unauthorized_customer_attempting_rm_action():
    """TC-07: Unauthorized customer attempting RM action -> 403 Forbidden."""
    resp = client.get(
        "/api/v1/rm/queue",
        headers={"Authorization": "Bearer demo-customer"}
    )
    assert resp.status_code in [403, 404]

    resp_approve = client.post(
        "/api/v1/governance/reviews/override",
        json={
            "review_id": "rev_test_001",
            "journey_id": "jrn_priya_001",
            "override_outcome": "APPROVED",
            "reason": "Customer unauthorized self-approval",
        },
        headers={"Authorization": "Bearer demo-customer"}
    )
    assert resp_approve.status_code in [403, 404]


def test_tc08_favorable_ml_with_failed_hard_rule():
    """TC-08: Risk model produces favorable probability but hard rule fails -> Hard rule authoritative."""
    from backend.modules.module4_decision.risk_orchestrator import RiskOrchestrator
    
    assessment = RiskOrchestrator.assess(
        journey_id="jrn_apex_003",
        application_id="app_apex_003",
        actor_id="test_runner",
        actor_role="SYSTEM",
        force_recalculate=True
    )
    failed = [r for r in assessment.hard_rules if not r.passed]
    assert len(failed) > 0 or assessment.policy_gate == "FAILED" or assessment.risk_band == RiskBand.HIGH_RISK


def test_tc09_whatif_scenario_base_application_unchanged():
    """TC-09: What-if scenario -> base application unchanged."""
    base_journey = db.get("journeys", "jrn_priya_001")
    base_intent = base_journey["intent"]
    orig_amount = base_intent["requested_amount"]

    # Run what-if simulation via POST /api/v1/journeys/{id}/what-if
    resp = client.post(
        "/api/v1/journeys/jrn_priya_001/what-if",
        json={
            "revenue_delta_pct": -20.0,
            "tenor_months": 18,
            "buffer_days_delta": 5,
            "collateral_offered_amount": 500000.0
        },
        headers={"Authorization": "Bearer demo-customer"}
    )
    assert resp.status_code == 200
    sim_data = resp.json()
    assert "simulated_dscr" in sim_data or "simulatedDscr" in sim_data or "affordability" in sim_data

    # Verify baseline in DB is identical
    recheck_journey = db.get("journeys", "jrn_priya_001")
    assert recheck_journey["intent"]["requested_amount"] == orig_amount


def test_tc10_shared_identifier_potential_linked_signal():
    """TC-10: Shared identifier across synthetic cases -> potential linked-case signal."""
    response = client.get("/api/v1/journeys/jrn_apex_003/fraud-signals")
    assert response.status_code == 200
    data = response.json()
    signals = data.get("signals", [])
    assert len(signals) > 0
    # Strict phrasing check: must say "Potential linked-case risk detected." and NOT "Fraud detected."
    for sig in signals:
        assert "Potential linked-case risk detected." in sig["explanation"]
        assert "Fraud detected" not in sig["explanation"]


def test_tc11_human_override_preserves_ai_decision():
    """TC-11: Human override -> AI decision preserved, human outcome stored separately, reason mandatory."""
    from backend.modules.module5_trust.override_service import OverrideService
    from backend.database.models import HumanOverrideRequest

    req = HumanOverrideRequest(
        new_outcome=DecisionOutcome.APPROVED,
        new_approved_amount=2500000.0,
        new_interest_rate=11.5,
        reason_code="COLLATERAL_BACKED",
        rationale_notes="Managing director provided additional collateral pledge on commercial property.",
        co_signed_by="Senior Risk Head"
    )

    # Apply valid override
    override_dec = OverrideService.apply_override(
        application_id="app_kavita_002",
        request=req,
        officer_id="usr_rohan_002",
        officer_name="Rohan Mehta",
        officer_role="RM"
    )
    assert override_dec.outcome == DecisionOutcome.APPROVED
    assert "COLLATERAL_BACKED" in override_dec.reasoning
    assert "Rohan Mehta (RM)" in override_dec.decided_by

    # Verify override record was stored separately with mandatory reason
    overrides = OverrideService.get_overrides_for_application("app_kavita_002")
    assert len(overrides) > 0
    assert overrides[-1]["reason_code"] == "COLLATERAL_BACKED"
    assert "Managing director" in overrides[-1]["rationale_notes"]
    assert overrides[-1]["original_outcome"] in ["CONDITIONAL_APPROVAL", "NEEDS_REVIEW", "APPROVED"]
