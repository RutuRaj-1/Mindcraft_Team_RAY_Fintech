import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.modules.module4_decision.eligibility_rules import EligibilityRulesEngine
from backend.modules.module4_decision.ml_risk_model import MLRiskModel
from backend.modules.module4_decision.shap_explainer import SHAPExplainerService
from backend.modules.module3_financial.consistency_engine import ConsistencyEngine
from backend.modules.module3_financial.cashflow_engine import CashFlowEngine
from backend.modules.module6_product.whatif_simulator import WhatIfSimulator
from backend.modules.module6_product.safe_action_agent import SafeActionAgent
from backend.modules.module5_trust.override_service import OverrideService
from backend.database.models import HumanOverrideRequest, DecisionOutcome, WhatIfRequest
from backend.routers.demo_router import seed_demo_data

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_seed():
    seed_demo_data()

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_eligibility_rules_pass_and_fail():
    # Strong case: 48m vintage, 1.45 Cr turnover, 0 bounces, 1.85 DSCR
    passed, evals = EligibilityRulesEngine.evaluate(
        vintage_months=48,
        turnover=14500000.0,
        cheque_bounces=0,
        dscr=1.85,
        has_active_gstin=True
    )
    assert passed is True
    assert len(evals) == 5

    # Failing case: low vintage (12m) and high bounces (4)
    failed, evals_fail = EligibilityRulesEngine.evaluate(
        vintage_months=12,
        turnover=1000000.0,
        cheque_bounces=4,
        dscr=0.9,
        has_active_gstin=False
    )
    assert failed is False
    failed_names = [e.rule_id for e in evals_fail if not e.passed]
    assert "R01_VINTAGE" in failed_names
    assert "R03_CHEQUE_BOUNCES" in failed_names

def test_ml_risk_model_and_shap():
    risk_model = MLRiskModel.get_instance()
    features = {
        "vintage_months": 48.0,
        "annual_turnover": 14500000.0,
        "dscr": 1.85,
        "buffer_days": 38.0,
        "bounces_6m": 0.0,
        "volatility_index": 0.12,
        "profit_margin": 0.14
    }
    pd, trust_score, band, _ = risk_model.predict_risk(features)
    assert 0.0 <= pd <= 1.0
    assert 0 <= trust_score <= 1000
    assert trust_score > 800

    # SHAP explainer
    shap_attr = SHAPExplainerService.explain_prediction(
        application_id="app_priya_001",
        risk_id="rsk_test",
        feature_dict=features
    )
    assert len(shap_attr.features) == 7
    top_feature = shap_attr.features[0]
    assert top_feature.importance_rank == 1

def test_consistency_engine_detection():
    # Case 1 (Sharma Textiles) is clean
    rep_clean = ConsistencyEngine.verify_consistency("app_priya_001")
    assert rep_clean.is_consistent is True
    assert rep_clean.flagged_count == 0

    # Case 3 (Apex Logistics) has 37.5% turnover variance
    rep_dirty = ConsistencyEngine.verify_consistency("app_apex_003")
    assert rep_dirty.is_consistent is False
    assert rep_dirty.flagged_count >= 1
    assert any("GST vs Bank" in d.field for d in rep_dirty.discrepancies)

def test_whatif_simulator():
    req = WhatIfRequest(
        revenue_delta_pct=20.0,
        tenor_months=18,
        buffer_days_delta=10,
        collateral_offered_amount=500000.0
    )
    res = WhatIfSimulator.simulate("app_priya_001", req)
    assert res.simulated_dscr > res.original_dscr
    assert len(res.insights) > 0

def test_human_override_flow():
    req = HumanOverrideRequest(
        new_outcome=DecisionOutcome.APPROVED,
        new_approved_amount=2500000.0,
        new_interest_rate=11.5,
        reason_code="COLLATERAL_BACKED",
        rationale_notes="Managing director provided additional collateral pledge on commercial property.",
        co_signed_by="Senior Risk Head"
    )
    override_dec = OverrideService.apply_override(
        application_id="app_kavita_002",
        request=req,
        officer_id="usr_rohan_002",
        officer_name="Rohan Mehta",
        officer_role="RM"
    )
    assert override_dec.outcome == DecisionOutcome.APPROVED
    assert override_dec.approved_amount == 2500000.0
    assert "HUMAN OVERRIDE" in override_dec.reasoning

def test_api_journey_and_decision_endpoints():
    # GET journey
    res = client.get("/api/v1/journeys/jrn_priya_001", headers={"Authorization": "Bearer demo-customer"})
    assert res.status_code == 200
    data = res.json()
    assert data["journey_id"] == "jrn_priya_001"

    # GET cashflow
    cf_res = client.get("/api/v1/journeys/jrn_priya_001/cashflow", headers={"Authorization": "Bearer demo-customer"})
    assert cf_res.status_code == 200
    assert cf_res.json()["dscr"] > 1.0

    # GET trust-graph
    tg_res = client.get("/api/v1/journeys/jrn_priya_001/trust-graph", headers={"Authorization": "Bearer demo-customer"})
    assert tg_res.status_code == 200
    assert len(tg_res.json()["nodes"]) >= 4

    # GET actions
    act_res = client.get("/api/v1/journeys/jrn_priya_001/actions", headers={"Authorization": "Bearer demo-customer"})
    assert act_res.status_code == 200
    assert act_res.json()["primary_action"] is not None

    # GET officer queue
    q_res = client.get("/api/v1/dashboard/queue", headers={"Authorization": "Bearer demo-rm"})
    assert q_res.status_code == 200
    assert len(q_res.json()) >= 3
