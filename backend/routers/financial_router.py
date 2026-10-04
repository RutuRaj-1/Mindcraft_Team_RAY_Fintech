from fastapi import APIRouter, Depends, HTTPException
from backend.database.models import CashFlowMetrics, TrustGraph
from backend.auth.firebase_auth import get_current_user, AuthenticatedUser
from backend.modules.module3_financial.cashflow_engine import CashFlowEngine
from backend.modules.module7_trust_intelligence.trust_graph_service import TrustGraphService
from backend.database.firestore_client import db

router = APIRouter(prefix="/api/v1/journeys/{journey_id}", tags=["Cash Flow & Financial Trust Graph"])


@router.get("/cashflow", response_model=CashFlowMetrics)
def get_cashflow_intelligence(journey_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    journey = db.get("journeys", journey_id)
    if not journey:
        # Fallback if journey_id is application_id directly
        app = db.get("applications", journey_id)
        if not app:
            raise HTTPException(status_code=404, detail="Journey not found")
        app_id = journey_id
    else:
        app_id = journey.get("application_id", journey_id)
    return CashFlowEngine.calculate_metrics(app_id)


@router.get("/trust-graph", response_model=TrustGraph)
def get_trust_graph(journey_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    journey = db.get("journeys", journey_id)
    if not journey:
        # Fallback if journey_id is application_id directly
        app = db.get("applications", journey_id)
        if not app:
            raise HTTPException(status_code=404, detail="Journey not found")
        app_id = journey_id
    else:
        app_id = journey.get("application_id", journey_id)
    return TrustGraphService.get_or_build_graph(app_id)


@router.post("/trust-graph/rebuild", response_model=TrustGraph)
def rebuild_trust_graph(journey_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    journey = db.get("journeys", journey_id)
    if not journey:
        app = db.get("applications", journey_id)
        if not app:
            raise HTTPException(status_code=404, detail="Journey not found")
        app_id = journey_id
    else:
        app_id = journey.get("application_id", journey_id)
    return TrustGraphService.build_and_save_graph(app_id)


@router.get("/financial-trust-score")
def get_financial_trust_score(journey_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    """
    Returns the adapted 7-pillar Financial Trust Score (0-100, 300-850 CIBIL, 0-1000 FinFlow),
    component sub-scores, mathematical formulas, and metric-backed explainable factors.
    """
    from backend.modules.module3_risk.financial_trust_score import FinancialTrustScoreEngine
    journey = db.get("journeys", journey_id)
    if not journey:
        app = db.get("applications", journey_id)
        if not app:
            raise HTTPException(status_code=404, detail="Journey not found")
        app_id = journey_id
    else:
        app_id = journey.get("application_id", journey_id)

    res = FinancialTrustScoreEngine.evaluate_for_application(app_id)
    return {
        "applicationId": app_id,
        "journeyId": journey_id,
        "trustScore": res.trust_score,
        "cibilScore": res.cibil_scaled_score,
        "finflowScore": res.finflow_score,
        "riskBand": res.risk_band,
        "components": res.components,
        "positiveFactors": res.positive_factors,
        "negativeFactors": res.negative_factors,
        "detailedFactors": [
            {
                "name": f.name,
                "description": f.description,
                "metricName": f.metric_name,
                "metricValue": f.metric_value,
                "impact": f.impact,
            }
            for f in res.detailed_factors
        ],
        "features": res.features,
        "formulaSummary": res.formula_summary,
    }
