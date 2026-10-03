"""
Risk, Explainability & Decision Router
=======================================
All risk-related API endpoints are consolidated here.

Endpoints:
  POST /api/v1/journeys/{id}/risk/assess    — Trigger full hybrid risk assessment
  GET  /api/v1/journeys/{id}/risk           — Retrieve latest risk assessment
  GET  /api/v1/journeys/{id}/shap           — SHAP feature attribution
  GET  /api/v1/journeys/{id}/decision       — Final credit decision record
  POST /api/v1/journeys/{id}/evaluate-risk  — (legacy) full pipeline incl. RAG decision
  POST /api/v1/journeys/{id}/simulate       — What-if counterfactual simulation
  GET  /api/v1/journeys/{id}/replay         — Decision replay audit
"""

import uuid
import logging
from datetime import datetime
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks

from backend.database.models import (
    RiskAssessment, SHAPAttribution, DecisionRecord,
    WhatIfRequest, WhatIfResponse, WhatIfScenarioModel, WhatIfHistoryResponse, JourneyStage,
)
from backend.auth.firebase_auth import get_current_user, AuthenticatedUser
from backend.modules.module4_decision.risk_orchestrator import RiskOrchestrator
from backend.modules.module4_decision.rag_decision_engine import RAGDecisionEngine
from backend.modules.module4_decision.explainable_decision_engine import ExplainableDecisionEngine
from backend.modules.module6_product.whatif_simulator import WhatIfSimulator
from backend.modules.module6_product.decision_replay import DecisionReplayService
from backend.modules.module2_journey.journey_orchestrator import JourneyOrchestrator
from backend.database.firestore_client import db

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/journeys/{journey_id}",
    tags=["Risk Assessment, Explainability & Decisions"],
)


# ── POST /risk/assess ─────────────────────────────────────────────────────────
@router.post("/risk/assess", response_model=RiskAssessment)
def assess_risk(
    journey_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Trigger the full hybrid risk assessment pipeline:
      1. Feature Engineering
      2. Deterministic Policy Gate (hard rules — cannot be overridden by ML)
      3. ML Probability of Default estimation
      4. Decision Matrix

    Returns the complete RiskAssessment with:
      - feature_vector (full engineered features)
      - hard_rules (all 10 policy rule outcomes)
      - policy_gate (summary gate result)
      - probability_of_default, risk_score, risk_band
      - decision_rationale (human-readable chain of reasoning)
      - override_blocked flag
    """
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    app_id = journey.get("application_id", journey_id)

    assessment = RiskOrchestrator.assess(
        journey_id=journey_id,
        application_id=app_id,
        actor_id=user.uid,
        actor_role=user.role.value if hasattr(user.role, "value") else str(user.role),
        force_recalculate=True,  # explicit trigger always recalculates
    )

    # Advance journey stage if appropriate
    current_stage = journey.get("current_stage")
    if current_stage in [JourneyStage.EVIDENCE_COLLECTION.value, JourneyStage.VERIFICATION.value]:
        try:
            JourneyOrchestrator.advance_stage(
                journey_id=journey_id,
                target_stage=JourneyStage.RISK_ASSESSMENT,
                actor_id=user.uid,
                actor_role=user.role.value if hasattr(user.role, "value") else str(user.role),
                notes="Risk assessment initiated via API",
            )
        except Exception as exc:
            logger.warning("Stage advance failed (non-fatal): %s", exc)

    return assessment


# ── GET /risk ─────────────────────────────────────────────────────────────────
@router.get("/risk", response_model=RiskAssessment)
def get_risk_assessment(
    journey_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Retrieve the latest persisted risk assessment for a journey."""
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    app_id = journey.get("application_id", journey_id)
    risks = db.list("risk_assessments", {"application_id": app_id})

    if not risks:
        # Auto-compute on first GET if not yet assessed
        assessment = RiskOrchestrator.assess(
            journey_id=journey_id,
            application_id=app_id,
            actor_id=user.uid,
            actor_role=user.role.value if hasattr(user.role, "value") else str(user.role),
        )
        return assessment

    # Return latest by timestamp
    latest = sorted(risks, key=lambda x: x.get("calculated_at", ""), reverse=True)[0]
    return RiskAssessment(**latest)


# ── GET /shap ─────────────────────────────────────────────────────────────────
@router.get("/shap", response_model=SHAPAttribution)
def get_shap_attribution(
    journey_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    app_id = journey.get("application_id", journey_id)
    shaps = db.list("shap_attributions", {"application_id": app_id})
    if not shaps:
        raise HTTPException(status_code=404, detail="SHAP attribution not yet generated. Trigger risk/assess first.")
    latest = sorted(shaps, key=lambda x: x.get("generated_at", ""), reverse=True)[0]
    return SHAPAttribution(**latest)


# ── POST /decision/generate ──────────────────────────────────────────────────
@router.post("/decision/generate", response_model=DecisionRecord)
def generate_explainable_decision(
    journey_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Generate an authoritative Explainable Decision combining:
      - Deterministic Policy Gate (Hard rule evaluation)
      - ML Risk Model & Decision Matrix
      - SHAP Feature Attribution (TreeExplainer: Positive vs Negative factors)
      - Policy RAG Grounding
      - Evidence Provenance & Consistency Warnings
      - LLM Explanation Synthesis with Deterministic Fallback Generator
    """
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    # TC-04: Structured 409 conflict if decision requested before risk/evidence complete
    current_stage = journey.get("current_stage")
    if current_stage == JourneyStage.INTENT_CAPTURE.value:
        raise HTTPException(
            status_code=409,
            detail="Cannot generate decision before evidence collection and risk assessment are complete."
        )

    app_id = journey.get("application_id", journey_id)

    decision = ExplainableDecisionEngine.generate_decision(
        journey_id=journey_id,
        application_id=app_id,
        actor_id=user.uid,
        actor_role=user.role.value if hasattr(user.role, "value") else str(user.role),
        force_recalculate=True,
    )

    # Advance journey stage if appropriate
    current_stage = journey.get("current_stage")
    if current_stage in [
        JourneyStage.VERIFICATION.value,
        JourneyStage.RISK_ASSESSMENT.value,
        JourneyStage.EVIDENCE_COLLECTION.value,
    ]:
        try:
            JourneyOrchestrator.advance_stage(
                journey_id=journey_id,
                target_stage=JourneyStage.EXPLAINABLE_DECISION,
                actor_id=user.uid,
                actor_role=user.role.value if hasattr(user.role, "value") else str(user.role),
                notes="Explainable Decision generated via API",
            )
        except Exception as exc:
            logger.warning("Stage advance failed (non-fatal): %s", exc)

    return decision


# ── GET /decision ─────────────────────────────────────────────────────────────
@router.get("/decision", response_model=DecisionRecord)
def get_decision(
    journey_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Retrieve the latest decision record for this journey.
    If no decision exists yet, automatically generates one using the
    Explainable Decision Engine.
    """
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    app_id = journey.get("application_id", journey_id)
    decisions = db.list("decisions", {"application_id": app_id})
    if not decisions:
        # Auto-generate if not yet formulated
        decision = ExplainableDecisionEngine.generate_decision(
            journey_id=journey_id,
            application_id=app_id,
            actor_id=user.uid,
            actor_role=user.role.value if hasattr(user.role, "value") else str(user.role),
        )
        return decision
    latest = sorted(decisions, key=lambda x: x.get("decided_at", "") or x.get("generatedAt", ""), reverse=True)[0]
    return DecisionRecord(**latest)


# ── POST /evaluate-risk (legacy — full pipeline incl. RAG decision) ───────────
@router.post("/evaluate-risk", response_model=DecisionRecord)
def evaluate_risk_and_decision(
    journey_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Full pipeline: Risk Assessment → SHAP Attribution → Explainable RAG Decision.
    Kept for backward compatibility with demo seeder and integration tests.
    """
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    app_id = journey.get("application_id", journey_id)

    decision = ExplainableDecisionEngine.generate_decision(
        journey_id=journey_id,
        application_id=app_id,
        actor_id=user.uid,
        actor_role=user.role.value if hasattr(user.role, "value") else str(user.role),
        force_recalculate=True,
    )

    current_stage = journey.get("current_stage")
    if current_stage in [
        JourneyStage.VERIFICATION.value,
        JourneyStage.RISK_ASSESSMENT.value,
        JourneyStage.EVIDENCE_COLLECTION.value,
    ]:
        try:
            JourneyOrchestrator.advance_stage(
                journey_id=journey_id,
                target_stage=JourneyStage.EXPLAINABLE_DECISION,
                actor_id=user.uid,
                actor_role=user.role.value if hasattr(user.role, "value") else str(user.role),
                notes="Explainable decision generated via evaluate-risk",
            )
        except Exception as exc:
            logger.warning("Stage advance failed (non-fatal): %s", exc)

    return decision


# ── POST /what-if ─────────────────────────────────────────────────────────────
@router.post("/what-if", response_model=WhatIfResponse)
def run_what_if_simulation(
    journey_id: str,
    req: WhatIfRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Run a counterfactual What-If simulation without modifying the original application.
    Recomputes transparent EMI, monthly surplus, obligation ratio, DSCR, and ML risk band.
    """
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    app_id = journey.get("application_id", journey_id)
    return WhatIfSimulator.simulate(app_id, req)


# ── GET /what-if ──────────────────────────────────────────────────────────────
@router.get("/what-if", response_model=WhatIfHistoryResponse)
def get_what_if_scenarios(
    journey_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Retrieve historical What-If scenarios for the journey's application.
    If no scenarios exist yet, auto-computes a baseline simulation from application facts.
    """
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    app_id = journey.get("application_id", journey_id)

    scenarios = WhatIfSimulator.list_scenarios(app_id)
    if not scenarios:
        # Generate baseline simulation so client has immediate context
        baseline_sim = WhatIfSimulator.simulate(app_id, WhatIfRequest())
        scenarios = [baseline_sim]

    return WhatIfHistoryResponse(
        journey_id=journey_id,
        application_id=app_id,
        scenarios=scenarios,
        latest=scenarios[0] if scenarios else None,
        count=len(scenarios),
    )


# ── POST /simulate (legacy endpoint alias) ───────────────────────────────────
@router.post("/simulate", response_model=WhatIfResponse)
def simulate_counterfactual(
    journey_id: str,
    req: WhatIfRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    app_id = journey.get("application_id", journey_id)
    return WhatIfSimulator.simulate(app_id, req)


# ── GET /replay ───────────────────────────────────────────────────────────────
@router.get("/replay", response_model=Dict[str, Any])
def replay_decision(
    journey_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Chronological Decision Replay:
    Reconstructs all major system events (Intent, Upload, OCR, Evidence, Consistency,
    Cashflow, Risk, SHAP, Policy, Decision, Safe Actions, Overrides) with full
    traceability into system inputs, outputs, and evidence used.
    """
    return DecisionReplayService.replay_decision_state(journey_id)

