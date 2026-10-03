import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from backend.database.models import (
    RiskAssessment, SHAPAttribution, DecisionRecord, WhatIfRequest, WhatIfResponse,
    JourneyStage
)
from backend.auth.firebase_auth import get_current_user, AuthenticatedUser
from backend.modules.module3_financial.cashflow_engine import CashFlowEngine
from backend.modules.module3_financial.consistency_engine import ConsistencyEngine
from backend.modules.module4_decision.eligibility_rules import EligibilityRulesEngine
from backend.modules.module4_decision.ml_risk_model import MLRiskModel
from backend.modules.module4_decision.shap_explainer import SHAPExplainerService
from backend.modules.module4_decision.rag_decision_engine import RAGDecisionEngine
from backend.modules.module6_product.whatif_simulator import WhatIfSimulator
from backend.modules.module6_product.decision_replay import DecisionReplayService
from backend.modules.module2_journey.journey_orchestrator import JourneyOrchestrator
from backend.database.firestore_client import db

router = APIRouter(prefix="/api/v1/journeys/{journey_id}", tags=["Risk Assessment, Explainability & Decisions"])

@router.post("/evaluate-risk", response_model=DecisionRecord)
def evaluate_risk_and_decision(journey_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    app_id = journey.get("application_id", journey_id)
    app = db.get("applications", app_id) or {}

    # 1. Gather verified evidence & metrics
    evidence = db.list("evidence_ledger", {"application_id": app_id})
    evidence_map = {item.get("field_name"): item.get("field_value") for item in evidence}

    # Calculate Cash Flow metrics
    cfm = CashFlowEngine.calculate_metrics(app_id)
    consistency_rep = ConsistencyEngine.verify_consistency(app_id)

    vintage = int(app.get("vintage_months", 36))
    turnover = float(evidence_map.get("gst_annual_taxable_turnover") or app.get("annual_turnover", 10000000.0))
    bounces = int(evidence_map.get("inward_cheque_bounces_6m", 0))
    dscr = cfm.dscr

    # 2. Hard Eligibility Gates (Deterministic)
    all_rules_passed, rule_evaluations = EligibilityRulesEngine.evaluate(
        vintage_months=vintage,
        turnover=turnover,
        cheque_bounces=bounces,
        dscr=dscr,
        has_active_gstin=True
    )

    # 3. Scikit-learn ML Risk Model Prediction
    risk_model = MLRiskModel.get_instance()
    feature_dict = {
        "vintage_months": float(vintage),
        "annual_turnover": float(turnover),
        "dscr": float(dscr),
        "buffer_days": float(cfm.working_capital_buffer_days),
        "bounces_6m": float(bounces),
        "volatility_index": float(cfm.volatility_index),
        "profit_margin": 0.12
    }
    pd, trust_score, risk_band, _ = risk_model.predict_risk(feature_dict)

    # Create Risk Assessment record
    risk_id = f"rsk_{uuid.uuid4().hex[:10]}"
    risk_assessment = RiskAssessment(
        risk_id=risk_id,
        application_id=app_id,
        all_hard_rules_passed=all_rules_passed,
        hard_rules=rule_evaluations,
        probability_of_default=round(pd, 4),
        risk_score=trust_score,
        risk_band=risk_band,
        model_version="scikit-learn-sme-v2.1",
        calculated_at=datetime.utcnow()
    )
    db.set("risk_assessments", risk_id, risk_assessment.model_dump())

    # 4. SHAP Waterfall Attribution
    SHAPExplainerService.explain_prediction(
        application_id=app_id,
        risk_id=risk_id,
        feature_dict=feature_dict
    )

    # 5. RAG Explainable Decision
    decision = RAGDecisionEngine.generate_decision(
        application_id=app_id,
        risk_assessment=risk_assessment,
        consistency_report=consistency_rep
    )

    # Advance stage to EXPLAINABLE_DECISION if still in verification/risk
    current_stage = journey.get("current_stage")
    if current_stage in [JourneyStage.VERIFICATION.value, JourneyStage.RISK_ASSESSMENT.value]:
        JourneyOrchestrator.advance_stage(
            journey_id=journey_id,
            target_stage=JourneyStage.EXPLAINABLE_DECISION,
            actor_id=user.uid,
            actor_role=user.role.value,
            notes="Risk assessment & explainable decision generated"
        )

    return decision

@router.get("/risk", response_model=RiskAssessment)
def get_risk_assessment(journey_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    app_id = journey.get("application_id", journey_id)
    risks = db.list("risk_assessments", {"application_id": app_id})
    if not risks:
        raise HTTPException(status_code=404, detail="Risk assessment not yet completed")
    return RiskAssessment(**risks[-1])

@router.get("/shap", response_model=SHAPAttribution)
def get_shap_attribution(journey_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    app_id = journey.get("application_id", journey_id)
    shaps = db.list("shap_attributions", {"application_id": app_id})
    if not shaps:
        raise HTTPException(status_code=404, detail="SHAP attribution not yet generated")
    return SHAPAttribution(**shaps[-1])

@router.get("/decision", response_model=DecisionRecord)
def get_decision(journey_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    app_id = journey.get("application_id", journey_id)
    decisions = db.list("decisions", {"application_id": app_id})
    if not decisions:
        raise HTTPException(status_code=404, detail="Decision not yet formulated")
    return DecisionRecord(**decisions[-1])

@router.post("/simulate", response_model=WhatIfResponse)
def simulate_counterfactual(
    journey_id: str,
    req: WhatIfRequest,
    user: AuthenticatedUser = Depends(get_current_user)
):
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    app_id = journey.get("application_id", journey_id)
    return WhatIfSimulator.simulate(app_id, req)

@router.get("/replay", response_model=Dict[str, Any])
def replay_decision(journey_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    app_id = journey.get("application_id", journey_id)
    return DecisionReplayService.replay_decision_state(app_id)
