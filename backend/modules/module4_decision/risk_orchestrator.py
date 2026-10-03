"""
RiskOrchestrator — Module 4 Authoritative Risk Engine Entry Point
=================================================================
This is the SINGLE entry point for computing a risk assessment.
It enforces the mandatory hybrid architecture:

    Step 1: Feature Engineering           (RiskFeatureEngineer)
    Step 2: Deterministic Policy Gate     (PolicyRulesEngine)
    Step 3: ML Probability Estimation     (MLRiskModel)         ← skipped on HARD_FAIL
    Step 4: Decision Matrix               (documented below)
    Step 5: Persist & Audit

Decision Matrix
---------------
┌──────────────────────────────┬────────────────────────────────────────────┐
│  Policy Gate Outcome         │  Action                                    │
├──────────────────────────────┼────────────────────────────────────────────┤
│  NOT_ELIGIBLE (HARD_FAIL)    │  → risk_band = HIGH_RISK                   │
│                              │    override_blocked = True                  │
│                              │    ML score still computed for reference    │
│                              │    Final outcome = REJECTED by RAG engine   │
├──────────────────────────────┼────────────────────────────────────────────┤
│  NEEDS_REVIEW (REVIEW flags) │  → ML score computed normally               │
│                              │    Risk band unchanged from ML output       │
│                              │    RAG engine notified of review flags      │
├──────────────────────────────┼────────────────────────────────────────────┤
│  ELIGIBLE                    │  → ML score computed normally               │
│                              │    Band and trust score from ML             │
│                              │    RAG engine generates full decision       │
└──────────────────────────────┴────────────────────────────────────────────┘

Invariant: A HARD_FAIL result from PolicyRulesEngine ALWAYS sets
override_blocked=True. The ML model NEVER determines final eligibility
for NOT_ELIGIBLE applications. This is documented in the decision_rationale
field stored on every RiskAssessment.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.database.models import (
    RiskAssessment, RiskBand, PolicyGateResult, HardRuleEvaluation,
)
from backend.database.firestore_client import db
from backend.modules.module3_financial.cashflow_engine import CashFlowEngine
from backend.modules.module3_financial.consistency_engine import ConsistencyEngine
from backend.modules.module4_decision.risk_feature_engineer import RiskFeatureEngineer, FEATURE_NAMES
from backend.modules.module4_decision.eligibility_rules import PolicyRulesEngine
from backend.modules.module4_decision.ml_risk_model import MLRiskModel, MODEL_VERSION
from backend.modules.module4_decision.shap_explainer import SHAPExplainerService
from backend.modules.module5_trust.audit_ledger import AuditLedger

logger = logging.getLogger(__name__)


class RiskOrchestrator:
    """
    Authoritative orchestrator for the 4-step hybrid Risk Engine.
    All callers (API routers, demo seeder, tests) must go through here.
    """

    @classmethod
    def assess(
        cls,
        journey_id: str,
        application_id: str,
        actor_id: str = "SYSTEM",
        actor_role: str = "SYSTEM",
        force_recalculate: bool = False,
    ) -> RiskAssessment:
        """
        Full hybrid risk assessment pipeline.

        Args:
            journey_id:        Firestore journey document ID
            application_id:    Firestore application document ID
            actor_id:          UID of the person/system triggering assessment
            actor_role:        Role label for audit log
            force_recalculate: Skip cache check and recompute

        Returns:
            RiskAssessment persisted to Firestore
        """
        # ── 0. Cache check ────────────────────────────────────────────────────
        if not force_recalculate:
            existing = db.list("risk_assessments", {"application_id": application_id})
            if existing:
                latest = sorted(existing, key=lambda x: x.get("calculated_at", ""), reverse=True)[0]
                logger.info("Returning cached risk assessment for %s", application_id)
                return RiskAssessment(**latest)

        # ── 1. Load raw data ──────────────────────────────────────────────────
        app = db.get("applications", application_id) or {}
        evidence_items = db.list("evidence_ledger", {"application_id": application_id}) or []
        evidence_map = {
            item.get("field_name"): item.get("field_value")
            for item in evidence_items
            if item.get("field_name")
        }
        documents_raw = db.list("documents", {"application_id": application_id}) or []

        # Determine contextual flags
        has_active_gstin = bool(
            evidence_map.get("gstin") or
            app.get("gstin") or
            evidence_map.get("gst_gstin")
        )
        kyc_doc_types = {"PAN", "UDYAM_AADHAAR", "ID_PROOF"}
        kyc_verified_count = sum(
            1 for d in documents_raw
            if d.get("doc_type", "").upper() in kyc_doc_types
            and d.get("verification_status", "").upper() == "VERIFIED"
        )
        docs_uploaded = len(documents_raw)
        requested_amount = float(app.get("requested_amount", 0.0))
        annual_turnover = float(
            evidence_map.get("gst_annual_taxable_turnover") or
            evidence_map.get("gross_income") or
            app.get("annual_turnover") or
            0.0
        )

        # ── 2. Cash-flow metrics ──────────────────────────────────────────────
        try:
            cfm = CashFlowEngine.calculate_metrics(application_id)
        except Exception as exc:
            logger.warning("CashFlowEngine failed: %s — proceeding without CFM", exc)
            cfm = None

        # ── 3. Consistency report ─────────────────────────────────────────────
        try:
            consistency_report = ConsistencyEngine.verify_consistency(application_id)
        except Exception as exc:
            logger.warning("ConsistencyEngine failed: %s", exc)
            consistency_report = None

        # ── Step 1: Feature Engineering ───────────────────────────────────────
        feature_vector, missing_fields = RiskFeatureEngineer.build_feature_vector(
            app=app,
            evidence_map=evidence_map,
            cfm=cfm,
            consistency_report=consistency_report,
            documents=documents_raw,
        )

        if missing_fields:
            logger.info(
                "Risk assessment for %s: %d feature(s) used fallback defaults: %s",
                application_id, len(missing_fields), missing_fields,
            )

        # ── Step 2: Deterministic Policy Gate ─────────────────────────────────
        all_hard_passed, rule_evals, gate = PolicyRulesEngine.evaluate(
            feature_vector=feature_vector,
            has_active_gstin=has_active_gstin,
            kyc_docs_verified=kyc_verified_count,
            docs_uploaded=docs_uploaded,
            requested_amount=requested_amount,
            annual_turnover=annual_turnover,
        )

        # ── Step 3: ML Probability Estimation ─────────────────────────────────
        # Note: ML is ALWAYS run (even on hard failures) so the score is
        # available for human reviewers and What-If simulation.
        # It is NEVER used to override policy gate failures.
        ml_model = MLRiskModel.get_instance()
        pd_val, trust_score, ml_band, _ = ml_model.predict_risk(feature_vector)

        # ── Step 4: Decision Matrix ───────────────────────────────────────────
        override_blocked = False
        final_band = ml_band

        if not all_hard_passed:
            override_blocked = True
            final_band = RiskBand.HIGH_RISK   # floor band on hard failure
            failed_names = ", ".join(
                e.rule_name for e in rule_evals if not e.passed
                and e.rule_id in gate.failed_rule_ids
                and e.rule_id.startswith("R0")   # only HARD_FAIL rules
            )
            decision_rationale = (
                f"POLICY GATE FAILURE — application is NOT_ELIGIBLE. "
                f"Hard rule(s) failed: {failed_names or gate.failed_rule_names}. "
                f"ML model produced a PD of {pd_val:.3f} (Trust Score {trust_score}) but this "
                f"is superseded by mandatory policy rules. "
                f"ML score is preserved for auditor review only. "
                f"Hard rule failures cannot be overridden by any statistical model output."
            )
        elif gate.eligibility_status == "NEEDS_REVIEW":
            decision_rationale = (
                f"POLICY GATE: NEEDS_REVIEW — {gate.review_flag_count} review flag(s) triggered. "
                f"ML assessment: PD={pd_val:.3f}, Trust Score={trust_score}/1000, "
                f"Band={ml_band.value}. "
                f"All hard eligibility rules passed. Application proceeds to human review "
                f"for flagged items: {gate.failed_rule_names}."
            )
        else:
            decision_rationale = (
                f"POLICY GATE: ELIGIBLE — all {len(rule_evals)} rules passed. "
                f"ML assessment: PD={pd_val:.3f}, Trust Score={trust_score}/1000, "
                f"Band={ml_band.value}. "
                f"Model version: {MODEL_VERSION}. "
                f"Feature vector computed from {len(feature_vector)} engineered features."
            )

        # ── Step 5: Persist ───────────────────────────────────────────────────
        risk_id = f"rsk_{uuid.uuid4().hex[:10]}"
        assessment = RiskAssessment(
            risk_id=risk_id,
            application_id=application_id,
            all_hard_rules_passed=all_hard_passed,
            hard_rules=rule_evals,
            policy_gate=gate,
            feature_vector=feature_vector,
            feature_names=FEATURE_NAMES,
            probability_of_default=round(pd_val, 4),
            risk_score=trust_score,
            risk_band=final_band,
            model_version=MODEL_VERSION,
            decision_rationale=decision_rationale,
            override_blocked=override_blocked,
            calculated_at=datetime.now(timezone.utc),
        )

        try:
            db.set("risk_assessments", risk_id, assessment.model_dump(mode="json"))
        except Exception as exc:
            logger.warning("Failed to persist risk assessment: %s", exc)

        # ── SHAP Attribution ──────────────────────────────────────────────────
        try:
            SHAPExplainerService.explain_prediction(
                application_id=application_id,
                risk_id=risk_id,
                feature_dict=feature_vector,
            )
        except Exception as exc:
            logger.warning("SHAP attribution failed (non-fatal): %s", exc)

        # ── Audit Log ─────────────────────────────────────────────────────────
        try:
            AuditLedger.log(
                application_id=application_id,
                actor_id=actor_id,
                actor_role=actor_role,
                action="RISK_ASSESSMENT_COMPLETED",
                details={
                    "risk_id": risk_id,
                    "all_hard_rules_passed": all_hard_passed,
                    "eligibility_status": gate.eligibility_status,
                    "pd": round(pd_val, 4),
                    "trust_score": trust_score,
                    "risk_band": final_band.value,
                    "override_blocked": override_blocked,
                    "model_version": MODEL_VERSION,
                    "missing_features": missing_fields,
                },
            )
        except Exception as exc:
            logger.warning("Audit log failed (non-fatal): %s", exc)

        return assessment
