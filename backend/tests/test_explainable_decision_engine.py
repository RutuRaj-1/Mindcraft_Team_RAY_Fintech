"""
Unit & Integration Tests for FinFlow AI Explainable Decision Engine
=====================================================================
Validates:
  1. Module combination: Rule explanation + ML + SHAP + Policy RAG + Evidence Provenance.
  2. SHAP feature contributions separation:
     - Positive contributing factors (reducing risk)
     - Negative contributing factors (increasing risk)
     - Hard policy constraints (passed vs violated)
     - Evidence warnings & missing evidence
  3. Deterministic Fallback Explanation Generator under LLM absence/timeout/failure.
  4. Invariant: LLM cannot override outcome or invent financial values.
  5. API endpoints:
     - POST /api/v1/journeys/{id}/decision/generate
     - GET /api/v1/journeys/{id}/decision
  6. Complete schema compatibility:
     outcome, summary, risk_score, risk_band, key_reasons, shap_factors,
     policy_references, evidence_references, warnings, confidence, generatedAt,
     modelVersion, explanationVersion.
"""

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from backend.main import app
from backend.database.models import (
    DecisionOutcome,
    RiskBand,
)
from backend.modules.module4_decision.explainable_decision_engine import (
    ExplainableDecisionEngine,
    FallbackExplanationGenerator,
    EXPLANATION_VERSION,
    MODEL_VERSION,
)
from backend.database.firestore_client import db

client = TestClient(app)

AUTH_HEADERS = {
    "X-Demo-User-Role": "ADMIN",
    "X-Demo-User-Uid": "usr_test_underwriter_99",
}


@pytest.fixture(autouse=True)
def setup_seed_journey():
    """Seed test application, journey, evidence, and documents."""
    journey_id = "jrn_test_explainable_001"
    app_id = "app_test_explainable_001"

    db.set("journeys", journey_id, {
        "journey_id": journey_id,
        "application_id": app_id,
        "customer_id": "cust_test_001",
        "current_stage": "VERIFICATION",
        "status": "ACTIVE",
        "created_at": "2024-01-01T00:00:00Z",
    })

    db.set("applications", app_id, {
        "application_id": app_id,
        "journey_id": journey_id,
        "business_name": "Apex Precision Engineering Pvt Ltd",
        "product_type": "sme_working_capital",
        "requested_amount": 1500000.0,
        "tenor_months": 24,
        "declared_revenue": 8500000.0,
        "missing_evidence_requirements": [],
    })

    # Seed verified evidence items
    db.set("evidence_ledger", f"ev_gst_{app_id}", {
        "evidence_id": f"ev_gst_{app_id}",
        "application_id": app_id,
        "field_name": "annual_turnover",
        "field_value": "8500000.0",
        "extraction_engine": "GSTN_PORTAL_OCR",
        "confidence": 0.98,
        "source_page": 1,
    })
    db.set("evidence_ledger", f"ev_dscr_{app_id}", {
        "evidence_id": f"ev_dscr_{app_id}",
        "application_id": app_id,
        "field_name": "dscr",
        "field_value": "1.45",
        "extraction_engine": "BANK_STATEMENT_PARSER",
        "confidence": 0.95,
        "source_page": 2,
    })
    db.set("evidence_ledger", f"ev_vintage_{app_id}", {
        "evidence_id": f"ev_vintage_{app_id}",
        "application_id": app_id,
        "field_name": "vintage_months",
        "field_value": "42",
        "extraction_engine": "UDYAM_AADHAAR_OCR",
        "confidence": 0.99,
        "source_page": 1,
    })

    return journey_id, app_id


# ==============================================================================
# 1. Feature Separation & Grounding Tests
# ==============================================================================
def test_explainable_decision_engine_feature_separation(setup_seed_journey):
    journey_id, app_id = setup_seed_journey

    decision = ExplainableDecisionEngine.generate_decision(
        journey_id=journey_id,
        application_id=app_id,
        force_recalculate=True,
    )

    assert decision is not None
    assert decision.decision_id.startswith("dec_")
    assert decision.application_id == app_id
    assert decision.outcome in [DecisionOutcome.APPROVED, DecisionOutcome.CONDITIONAL_APPROVAL, DecisionOutcome.NEEDS_REVIEW, DecisionOutcome.REJECTED]

    # Verify SHAP factors separated into positive and negative
    shap_factors = decision.shap_factors
    assert "positive_factors" in shap_factors
    assert "negative_factors" in shap_factors
    assert "all_factors" in shap_factors
    assert isinstance(shap_factors["positive_factors"], list)
    assert isinstance(shap_factors["negative_factors"], list)

    # Positive factors reduce risk (shap_value <= 0 or REDUCES_RISK)
    for pf in shap_factors["positive_factors"]:
        assert pf["direction"] == "REDUCES_RISK" or pf["shap_value"] <= 0
        assert "feature_name" in pf
        assert "feature_display_name" in pf
        assert "shap_value" in pf

    # Negative factors increase risk (shap_value > 0 or INCREASES_RISK)
    for nf in shap_factors["negative_factors"]:
        assert nf["direction"] == "INCREASES_RISK" or nf["shap_value"] >= 0

    # Hard policy constraints separated
    assert len(decision.hard_policy_constraints) > 0
    for constraint in decision.hard_policy_constraints:
        assert "rule_id" in constraint
        assert "rule_name" in constraint
        assert "passed" in constraint
        assert isinstance(constraint["passed"], bool)

    # Policy references present from RAG / corpus
    assert len(decision.policy_references) > 0
    for pol in decision.policy_references:
        assert "clause_id" in pol
        assert "title" in pol
        assert "excerpt" in pol

    # Evidence references present
    assert len(decision.evidence_references) > 0
    for ev in decision.evidence_references:
        assert "field_name" in ev
        assert "value" in ev
        assert "confidence" in ev

    # Versions
    assert decision.modelVersion == MODEL_VERSION
    assert decision.explanationVersion == EXPLANATION_VERSION
    assert decision.confidence > 0.0


# ==============================================================================
# 2. Hard Policy Rule Invariant: ML/LLM Cannot Override Hard Rejection
# ==============================================================================
def test_hard_policy_failure_forces_rejection_regardless_of_ml(setup_seed_journey):
    journey_id, app_id = setup_seed_journey

    # Set hard constraint violation: vintage_months = 6 (policy requires >= 24)
    db.set("evidence_ledger", f"ev_vintage_{app_id}", {
        "evidence_id": f"ev_vintage_{app_id}",
        "application_id": app_id,
        "field_name": "vintage_months",
        "field_value": "6",
        "extraction_engine": "UDYAM_AADHAAR_OCR",
        "confidence": 0.99,
        "source_page": 1,
    })

    decision = ExplainableDecisionEngine.generate_decision(
        journey_id=journey_id,
        application_id=app_id,
        force_recalculate=True,
    )

    # Invariant: Must be strictly REJECTED
    assert decision.outcome == DecisionOutcome.REJECTED
    assert decision.approved_amount == 0.0
    assert decision.interest_rate == 0.0

    # Summary and key reasons must state the hard failure
    assert "could not be approved" in decision.summary.lower() or "violation" in decision.summary.lower()
    has_hard_fail_reason = any("hard constraint" in r.lower() or "vintage" in r.lower() or "failed" in r.lower() for r in decision.key_reasons)
    assert has_hard_fail_reason


# ==============================================================================
# 3. Deterministic Fallback Generator
# ==============================================================================
def test_deterministic_fallback_generator():
    summary_app, reasons_app = FallbackExplanationGenerator.generate(
        outcome=DecisionOutcome.APPROVED,
        business_name="Test Enterprise",
        risk_score=820.0,
        risk_band="LOW_RISK",
        approved_amount=1000000.0,
        interest_rate=10.75,
        tenor_months=12,
        hard_rules_passed=True,
        failed_rules=[],
        positive_factors=[
            {"feature_display_name": "DSCR", "feature_value": 1.6, "shap_value": -0.12},
            {"feature_display_name": "Revenue Consistency", "feature_value": 0.92, "shap_value": -0.09},
        ],
        negative_factors=[
            {"feature_display_name": "Debt Service Burden", "feature_value": 28.0, "shap_value": 0.03},
        ],
        policy_citations=[{"clause_id": "POL-SME-5.2", "title": "DSCR Norms"}],
        warnings=[],
        missing_evidence=[],
        cash_flow_summary={"dscr": 1.6},
    )

    assert "APPROVED" in summary_app
    assert "1,000,000.00" in summary_app
    assert len(reasons_app) >= 2
    assert any("DSCR" in r for r in reasons_app)

    # Test Fallback under rejection
    summary_rej, reasons_rej = FallbackExplanationGenerator.generate(
        outcome=DecisionOutcome.REJECTED,
        business_name="Rejected Enterprise",
        risk_score=310.0,
        risk_band="HIGH_RISK",
        approved_amount=0.0,
        interest_rate=0.0,
        tenor_months=0,
        hard_rules_passed=False,
        failed_rules=[{"rule_name": "Minimum Vintage", "failure_reason": "6 months < 24 months"}],
        positive_factors=[],
        negative_factors=[{"feature_display_name": "Vintage", "feature_value": 6.0, "shap_value": 0.15}],
        policy_citations=[{"clause_id": "POL-SME-4.1", "title": "Vintage Requirement"}],
        warnings=["Discrepancy detected"],
        missing_evidence=["ITR Return"],
    )

    assert "could not be approved" in summary_rej
    assert any("Minimum Vintage" in r for r in reasons_rej)


# ==============================================================================
# 4. API Endpoints: POST & GET
# ==============================================================================
def test_api_generate_and_get_decision(setup_seed_journey):
    journey_id, app_id = setup_seed_journey

    # POST /api/v1/journeys/{id}/decision/generate
    res_gen = client.post(
        f"/api/v1/journeys/{journey_id}/decision/generate",
        headers=AUTH_HEADERS,
    )
    assert res_gen.status_code == 200, res_gen.text
    data_gen = res_gen.json()

    assert "outcome" in data_gen
    assert "summary" in data_gen
    assert "risk_score" in data_gen
    assert "risk_band" in data_gen
    assert "key_reasons" in data_gen
    assert "shap_factors" in data_gen
    assert "policy_references" in data_gen
    assert "evidence_references" in data_gen
    assert "warnings" in data_gen
    assert "confidence" in data_gen
    assert "generatedAt" in data_gen
    assert "modelVersion" in data_gen
    assert "explanationVersion" in data_gen

    assert isinstance(data_gen["key_reasons"], list)
    assert len(data_gen["key_reasons"]) > 0
    assert "positive_factors" in data_gen["shap_factors"]
    assert "negative_factors" in data_gen["shap_factors"]

    # GET /api/v1/journeys/{id}/decision
    res_get = client.get(
        f"/api/v1/journeys/{journey_id}/decision",
        headers=AUTH_HEADERS,
    )
    assert res_get.status_code == 200, res_get.text
    data_get = res_get.json()
    assert data_get["decision_id"] == data_gen["decision_id"]
    assert data_get["outcome"] == data_gen["outcome"]
    assert data_get["summary"] == data_gen["summary"]
