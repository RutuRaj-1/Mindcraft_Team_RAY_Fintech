"""
FinFlow AI — Fraud Signals & Cross-Application Network Router
=============================================================
Endpoints:
  GET  /api/v1/journeys/{id}/fraud-signals   — Retrieve linked-case risk signals for journey
  GET  /api/v1/fraud/network                 — Full or focused cross-application entity graph
  POST /api/v1/fraud/signals/{id}/status     — Risk officer acknowledges or resolves signal
  POST /api/v1/journeys/{id}/fraud-signals/{signal_id}/resolve — Alias resolution endpoint
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.database.models import (
    FraudSignalModel, FraudNetworkResponse, FraudSignalResolutionRequest,
    JourneyFraudSignalsResponse
)
from backend.auth.firebase_auth import get_current_user, AuthenticatedUser
from backend.modules.module7_trust_intelligence.cross_application_intelligence import (
    CrossApplicationIntelligence
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Cross-Application Risk Intelligence & Fraud Signals"])

# ── 1. GET /api/v1/journeys/{journey_id}/fraud-signals ───────────────────────
@router.get(
    "/api/v1/journeys/{journey_id}/fraud-signals",
    response_model=JourneyFraudSignalsResponse,
    summary="Get Linked-Case Risk Signals",
    description="Surfaces cross-application relationship patterns (shared bank accounts, GSTIN reuse, phone reuse, address collisions) phrased as 'Potential linked-case risk detected.'"
)
def get_journey_fraud_signals(
    journey_id: str,
    user: AuthenticatedUser = Depends(get_current_user)
) -> JourneyFraudSignalsResponse:
    app_id, jrn_id, _, _ = CrossApplicationIntelligence.resolve_ids(journey_id)
    signals = CrossApplicationIntelligence.get_or_detect_signals(journey_id)
    return JourneyFraudSignalsResponse(
        journeyId=jrn_id or journey_id,
        applicationId=app_id or journey_id,
        signals=signals,
        total=len(signals),
        hasSignals=len(signals) > 0,
        summary="Potential linked-case risk detected." if signals else "No cross-application link risks detected."
    )


# ── 2. GET /api/v1/fraud/network ─────────────────────────────────────────────
@router.get(
    "/api/v1/fraud/network",
    response_model=FraudNetworkResponse,
    summary="Get Cross-Application Relationship Graph",
    description="Returns interactive multi-entity relationship graph linking applications through shared identifiers (bank accounts, GSTINs, phones, addresses, document hashes)."
)
def get_fraud_network_graph(
    journey_id: Optional[str] = Query(None, description="Optional journey ID to focus on connected subgraph"),
    application_id: Optional[str] = Query(None, description="Optional application ID to focus on connected subgraph"),
    focus_id: Optional[str] = Query(None, description="Optional focus journey or application ID"),
    user: AuthenticatedUser = Depends(get_current_user)
) -> FraudNetworkResponse:
    focus = focus_id or journey_id or application_id
    return CrossApplicationIntelligence.build_cross_app_network(focus_id=focus)


# ── 3. POST /api/v1/fraud/signals/{signal_id}/status ─────────────────────────
@router.post(
    "/api/v1/fraud/signals/{signal_id}/status",
    response_model=FraudSignalModel,
    summary="Acknowledge or Resolve Risk Signal",
    description="Updates risk officer disposition on a fraud signal (ACKNOWLEDGED, RESOLVED, FALSE_POSITIVE) with immutable audit logging."
)
def update_signal_status(
    signal_id: str,
    req: FraudSignalResolutionRequest,
    user: AuthenticatedUser = Depends(get_current_user)
) -> FraudSignalModel:
    officer_name = req.officerName or req.officer_name or req.officerId or req.officer_id or user.name or user.email or "Risk Officer"
    actor_id = req.officerId or req.officer_id or user.uid or "risk_officer"
    try:
        return CrossApplicationIntelligence.resolve_signal(
            signal_id=signal_id,
            new_status=req.status.upper(),
            actor_id=actor_id,
            officer_name=officer_name,
            notes=req.notes
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── 4. POST /api/v1/journeys/{journey_id}/fraud-signals/{signal_id}/resolve ──
@router.post(
    "/api/v1/journeys/{journey_id}/fraud-signals/{signal_id}/resolve",
    response_model=FraudSignalModel,
    summary="Resolve Risk Signal for Journey",
    description="Convenience route for resolving or acknowledging a signal from a specific journey context."
)
def resolve_journey_signal(
    journey_id: str,
    signal_id: str,
    req: FraudSignalResolutionRequest,
    user: AuthenticatedUser = Depends(get_current_user)
) -> FraudSignalModel:
    officer_name = req.officerName or req.officer_name or req.officerId or req.officer_id or user.name or user.email or "Risk Officer"
    actor_id = req.officerId or req.officer_id or user.uid or "risk_officer"
    try:
        return CrossApplicationIntelligence.resolve_signal(
            signal_id=signal_id,
            new_status=req.status.upper(),
            actor_id=actor_id,
            officer_name=officer_name,
            notes=req.notes
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
