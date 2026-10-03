"""
Test Suite: What-If Counterfactual Simulator
=============================================
Validates:
  1. Transparent EMI calculations against standard amortisation mathematics.
  2. Immutability of the original application record during simulations.
  3. Deterministic reproducibility of simulated scenarios.
  4. Complete scenario object schema adherence.
  5. Mandatory disclaimers ("Never claim 'This guarantees approval'").
  6. Recomputation of affordability metrics (EMI, surplus, obligation ratio, DSCR, cashFlowBurden).
  7. ML risk pipeline integration (score & band re-evaluation).
  8. API endpoints: POST & GET /api/v1/journeys/{id}/what-if.
  9. Specific scenario case: ₹7L base vs ₹5L counterfactual.
"""

import pytest
import copy
from fastapi.testclient import TestClient

from backend.main import app
from backend.database.firestore_client import db
from backend.database.models import (
    WhatIfRequest,
    WhatIfResponse,
    RiskBand,
    DecisionOutcome,
)
from backend.modules.module6_product.whatif_simulator import (
    WhatIfSimulator,
    calculate_transparent_emi,
    DISCLAIMER_TEXT,
)
from backend.routers.demo_router import seed_demo_data

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_seed():
    seed_demo_data()


# ── 1. Mathematical Accuracy of Transparent EMI ──────────────────────────────
def test_transparent_emi_calculation():
    # 5,00,000 at 12% p.a. for 12 months
    # r = 0.01/month, (1.01)^12 = 1.12682503
    # EMI = 500000 * 0.01 * 1.12682503 / 0.12682503 = 44,424.39
    emi_calc = calculate_transparent_emi(500000.0, 12.0, 12)
    assert emi_calc["emi"] == 44424.39
    assert emi_calc["principal"] == 500000.0
    assert emi_calc["tenureMonths"] == 12
    assert emi_calc["totalPayable"] == round(44424.39 * 12, 2)
    assert emi_calc["totalInterest"] == round(emi_calc["totalPayable"] - 500000.0, 2)
    assert "EMI = P * r * (1+r)^n / ((1+r)^n - 1)" in emi_calc["formula"]

    # Zero interest edge case
    zero_calc = calculate_transparent_emi(120000.0, 0.0, 12)
    assert zero_calc["emi"] == 10000.0
    assert zero_calc["totalInterest"] == 0.0

    # Extended tenure lowers monthly EMI
    tenure_24 = calculate_transparent_emi(500000.0, 12.0, 24)
    assert tenure_24["emi"] < emi_calc["emi"]


# ── 2. Immutability Invariant: Original Application Is Never Modified ────────
def test_simulation_does_not_modify_original_application():
    app_id = "app_priya_001"
    app_before = copy.deepcopy(db.get("applications", app_id))

    req = WhatIfRequest(
        requested_loan_amount=400000.0,
        loan_tenure=24,
        estimated_interest_rate=10.5,
        declared_revenue_adjustment=25.0,
        existing_obligations=15000.0,
    )

    res = WhatIfSimulator.simulate(app_id, req)
    assert res.scenarioId.startswith("scen_")

    app_after = db.get("applications", app_id)
    assert app_before == app_after, "Original application must NOT be modified by simulation!"
    assert app_after["requested_amount"] == app_before["requested_amount"]
    assert app_after["tenor_months"] == app_before["tenor_months"]


# ── 3. Reproducibility Invariant ─────────────────────────────────────────────
def test_simulations_are_reproducible():
    app_id = "app_priya_001"
    req = WhatIfRequest(
        requested_loan_amount=500000.0,
        loan_tenure=18,
        estimated_interest_rate=11.0,
        declared_revenue_adjustment=10.0,
        existing_obligations=20000.0,
    )

    sim1 = WhatIfSimulator.simulate(app_id, req)
    sim2 = WhatIfSimulator.simulate(app_id, req)

    assert sim1.estimatedEMI == sim2.estimatedEMI
    assert sim1.calculatedMetrics["monthlySurplus"] == sim2.calculatedMetrics["monthlySurplus"]
    assert sim1.calculatedMetrics["obligationRatio"] == sim2.calculatedMetrics["obligationRatio"]
    assert sim1.calculatedMetrics["dscr"] == sim2.calculatedMetrics["dscr"]
    assert sim1.riskScore == sim2.riskScore
    assert sim1.riskBand == sim2.riskBand


# ── 4. Scenario Object Schema Adherence ───────────────────────────────────────
def test_scenario_object_schema_complete():
    app_id = "app_priya_001"
    req = WhatIfRequest(
        requested_loan_amount=600000.0,
        loan_tenure=12,
        estimated_interest_rate=12.0,
    )

    res = WhatIfSimulator.simulate(app_id, req)

    # Required fields per specification
    assert res.scenarioId is not None and len(res.scenarioId) > 0
    assert res.applicationId == app_id
    assert isinstance(res.baseApplicationValues, dict)
    assert isinstance(res.modifiedValues, dict)
    assert isinstance(res.calculatedMetrics, dict)
    assert isinstance(res.estimatedEMI, float)
    assert res.cashFlowBurden in ("LOW", "MODERATE", "HIGH", "CRITICAL")
    assert isinstance(res.riskFeatureChanges, list)
    assert isinstance(res.riskScore, int)
    assert res.riskBand in (RiskBand.LOW_RISK, RiskBand.MEDIUM_RISK, RiskBand.HIGH_RISK)
    assert isinstance(res.explanation, str) and len(res.explanation) > 0
    assert res.createdAt is not None


# ── 5. Mandatory Disclaimer & Approval Invariant ─────────────────────────────
def test_mandatory_disclaimer_no_guarantee_claim():
    app_id = "app_priya_001"
    req = WhatIfRequest(
        requested_loan_amount=300000.0,
        loan_tenure=24,
    )

    res = WhatIfSimulator.simulate(app_id, req)

    # Invariant: Never claim "This guarantees approval."
    assert "guarantees approval" not in res.explanation.lower()
    assert "guarantee credit approval" in res.explanation.lower() or "does not guarantee" in res.explanation.lower()
    assert DISCLAIMER_TEXT in res.explanation
    assert res.disclaimer == DISCLAIMER_TEXT


# ── 6. Requested ₹7L vs Scenario ₹5L Example ────────────────────────────────
def test_example_seven_lakh_to_five_lakh():
    """
    User specification example:
      Requested: ₹7L
      Scenario: ₹5L
      Show: estimated EMI, surplus, obligation ratio, relevant risk-feature changes,
            risk score/band change, explanation.
    """
    app_id = "app_priya_001"
    # Counterfactual for ₹5L
    req = WhatIfRequest(
        requested_loan_amount=500000.0,
        loan_tenure=12,
        estimated_interest_rate=11.5,
    )

    res = WhatIfSimulator.simulate(app_id, req)

    # 1. Estimated EMI
    assert res.estimatedEMI > 0
    assert res.estimatedEMI < res.baseApplicationValues["estimatedEMI"]

    # 2. Surplus
    sim_surplus = res.calculatedMetrics["monthlySurplus"]
    base_surplus = res.calculatedMetrics["baseSurplus"]
    assert sim_surplus > base_surplus

    # 3. Obligation ratio
    sim_ratio = res.calculatedMetrics["obligationRatio"]
    base_ratio = res.calculatedMetrics["baseObligationRatio"]
    assert sim_ratio < base_ratio

    # 4. Relevant risk-feature changes
    features_tracked = [fc["feature"] for fc in res.riskFeatureChanges]
    assert "estimated_emi" in features_tracked
    assert "surplus_after_obligations" in features_tracked
    assert "debt_service_burden_pct" in features_tracked
    assert "dscr" in features_tracked

    # 5. Risk score & band
    assert 0 <= res.riskScore <= 1000
    assert res.riskBand is not None

    # 6. Explanation identifies what changed
    assert "₹5.00L" in res.explanation or "500,000" in res.explanation or "5.0L" in res.explanation
    assert "EMI" in res.explanation
    assert "surplus" in res.explanation.lower()


# ── 7. API Endpoints: POST & GET /api/v1/journeys/{id}/what-if ───────────────
def test_what_if_api_post_and_get():
    journey_id = "jrn_priya_001"

    # POST /api/v1/journeys/{journey_id}/what-if
    payload = {
        "requestedLoanAmount": 800000.0,
        "loanTenure": 18,
        "estimatedInterestRate": 11.0,
        "declaredRevenueAdjustment": 15.0,
        "existingObligations": 25000.0,
    }
    post_res = client.post(f"/api/v1/journeys/{journey_id}/what-if", json=payload)
    assert post_res.status_code == 200, post_res.text
    data = post_res.json()
    assert "scenarioId" in data
    assert data["estimatedEMI"] > 0
    assert "calculatedMetrics" in data
    assert "baseApplicationValues" in data
    assert "modifiedValues" in data
    assert "riskFeatureChanges" in data
    assert "disclaimer" in data
    assert DISCLAIMER_TEXT in data["explanation"]

    # GET /api/v1/journeys/{journey_id}/what-if
    get_res = client.get(f"/api/v1/journeys/{journey_id}/what-if")
    assert get_res.status_code == 200, get_res.text
    history = get_res.json()
    assert history["journeyId"] == journey_id
    assert history["count"] >= 1
    assert len(history["scenarios"]) >= 1
    assert history["latest"]["scenarioId"] == data["scenarioId"]
