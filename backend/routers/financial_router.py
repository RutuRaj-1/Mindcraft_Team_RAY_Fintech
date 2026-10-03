from fastapi import APIRouter, Depends, HTTPException
from backend.database.models import CashFlowMetrics, TrustGraph
from backend.auth.firebase_auth import get_current_user, AuthenticatedUser
from backend.modules.module3_financial.cashflow_engine import CashFlowEngine
from backend.modules.module7_trust_intelligence.trust_graph_engine import TrustGraphEngine
from backend.database.firestore_client import db

router = APIRouter(prefix="/api/v1/journeys/{journey_id}", tags=["Cash Flow & Financial Trust Graph"])

@router.get("/cashflow", response_model=CashFlowMetrics)
def get_cashflow_intelligence(journey_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    app_id = journey.get("application_id", journey_id)
    return CashFlowEngine.calculate_metrics(app_id)

@router.get("/trust-graph", response_model=TrustGraph)
def get_trust_graph(journey_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    app_id = journey.get("application_id", journey_id)
    return TrustGraphEngine.build_trust_graph(app_id)
