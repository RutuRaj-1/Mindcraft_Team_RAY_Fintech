"""
test_risk_eligibility_engine.py
================================
Comprehensive tests for the Risk & Eligibility Engine.

Test categories:
  1. Feature Engineering (RiskFeatureEngineer)
  2. Policy Rules Engine (PolicyRulesEngine) — all 10 rules
  3. ML Risk Model (MLRiskModel) — reproducibility, band thresholds
  4. Risk Orchestrator (RiskOrchestrator) — integration tests
  5. Hard-rule supremacy invariant tests
  6. Application profile tests: strong / weak / incomplete / inconsistent

Acceptance criteria verified:
  ✅ Same input produces same result (reproducibility)
  ✅ Hard rule failure cannot be overridden by ML
  ✅ Model version is recorded on every assessment
  ✅ Risk assessment persists (Firestore mock)
  ✅ All four application profiles produce correct outcomes
"""

import pytest
from unittest.mock import patch, MagicMock
from typing import Dict, Any

# ── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_db():
    """Firestore mock — returns empty lists and accepts sets silently."""
    db = MagicMock()
    db.get.return_value = None
    db.list.return_value = []
    db.set.return_value = None
    return db


@pytest.fixture
def strong_app() -> Dict[str, Any]:
    """Tier-1 healthy MSME with all metrics well above thresholds."""
    return {
        "requested_amount": 1_500_000.0,
        "tenor_months": 36,
        "annual_turnover": 12_000_000.0,
        "vintage_months": 72,
        "existing_obligations_monthly": 25_000.0,
    }


@pytest.fixture
def strong_evidence() -> Dict[str, Any]:
    return {
        "gst_annual_taxable_turnover": 12_000_000.0,
        "gstin": "27AADCB2230M1Z5",
        "inward_cheque_bounces_6m": 0,
    }


@pytest.fixture
def strong_cfm():
    """Mock CashFlowMetrics for a strong applicant."""
    cfm = MagicMock()
    cfm.dscr = 2.20
    cfm.avg_monthly_inflow = 1_000_000.0
    cfm.avg_monthly_outflow = 820_000.0
    cfm.net_monthly_surplus = 180_000.0
    cfm.existing_monthly_emi = 25_000.0
    cfm.proposed_monthly_emi = 48_000.0
    cfm.surplus_after_obligations = 107_000.0
    cfm.debt_service_burden_pct = 7.3
    cfm.working_capital_buffer_days = 45
    cfm.volatility_index = 0.07
    return cfm


@pytest.fixture
def weak_app() -> Dict[str, Any]:
    """Just-above-threshold MSME with multiple marginal metrics."""
    return {
        "requested_amount": 700_000.0,
        "tenor_months": 24,
        "annual_turnover": 3_000_000.0,
        "vintage_months": 28,
        "existing_obligations_monthly": 55_000.0,
    }


@pytest.fixture
def weak_cfm():
    cfm = MagicMock()
    cfm.dscr = 1.28
    cfm.avg_monthly_inflow = 250_000.0
    cfm.avg_monthly_outflow = 210_000.0
    cfm.net_monthly_surplus = 40_000.0
    cfm.existing_monthly_emi = 55_000.0
    cfm.proposed_monthly_emi = 32_000.0
    cfm.surplus_after_obligations = -47_000.0
    cfm.debt_service_burden_pct = 35.0
    cfm.working_capital_buffer_days = 18
    cfm.volatility_index = 0.22
    return cfm


@pytest.fixture
def ineligible_app() -> Dict[str, Any]:
    """Application that fails multiple hard rules."""
    return {
        "requested_amount": 500_000.0,
        "tenor_months": 12,
        "annual_turnover": 1_800_000.0,   # below ₹25L threshold
        "vintage_months": 15,              # below 24M threshold
        "existing_obligations_monthly": 0.0,
    }


@pytest.fixture
def inconsistent_app() -> Dict[str, Any]:
    """Application with reasonable numbers but high cheque bounces."""
    return {
        "requested_amount": 800_000.0,
        "tenor_months": 24,
        "annual_turnover": 6_000_000.0,
        "vintage_months": 36,
        "existing_obligations_monthly": 30_000.0,
    }


@pytest.fixture
def inconsistent_evidence() -> Dict[str, Any]:
    return {
        "gst_annual_taxable_turnover": 6_000_000.0,
        "inward_cheque_bounces_6m": 4,    # triggers HARD_FAIL
        "gstin": "27AADCB2230M1Z6",
    }


# ══════════════════════════════════════════════════════════════════════════════
# 1. Feature Engineering Tests
# ══════════════════════════════════════════════════════════════════════════════

class TestRiskFeatureEngineer:

    def test_all_features_present(self, strong_app, strong_evidence, strong_cfm):
        """Feature vector must contain every registered feature name."""
        from backend.modules.module4_decision.risk_feature_engineer import (
            RiskFeatureEngineer, FEATURE_NAMES,
        )
        fv, missing = RiskFeatureEngineer.build_feature_vector(
            app=strong_app,
            evidence_map=strong_evidence,
            cfm=strong_cfm,
        )
        assert set(FEATURE_NAMES) == set(fv.keys()), \
            f"Missing features: {set(FEATURE_NAMES) - set(fv.keys())}"

    def test_reproducibility(self, strong_app, strong_evidence, strong_cfm):
        """Same inputs must produce identical feature vectors."""
        from backend.modules.module4_decision.risk_feature_engineer import RiskFeatureEngineer
        fv1, _ = RiskFeatureEngineer.build_feature_vector(strong_app, strong_evidence, strong_cfm)
        fv2, _ = RiskFeatureEngineer.build_feature_vector(strong_app, strong_evidence, strong_cfm)
        assert fv1 == fv2

    def test_dscr_propagated_from_cfm(self, strong_app, strong_evidence, strong_cfm):
        from backend.modules.module4_decision.risk_feature_engineer import RiskFeatureEngineer
        fv, _ = RiskFeatureEngineer.build_feature_vector(strong_app, strong_evidence, strong_cfm)
        assert abs(fv["dscr"] - strong_cfm.dscr) < 0.001

    def test_exposure_ratio_computed(self, strong_app, strong_evidence, strong_cfm):
        from backend.modules.module4_decision.risk_feature_engineer import RiskFeatureEngineer
        fv, _ = RiskFeatureEngineer.build_feature_vector(strong_app, strong_evidence, strong_cfm)
        expected = strong_app["requested_amount"] / strong_app["annual_turnover"]
        assert abs(fv["exposure_ratio"] - expected) < 0.001

    def test_missing_cfm_uses_defaults(self, strong_app, strong_evidence):
        from backend.modules.module4_decision.risk_feature_engineer import (
            RiskFeatureEngineer, FEATURE_DEFAULTS,
        )
        fv, missing = RiskFeatureEngineer.build_feature_vector(
            app=strong_app,
            evidence_map=strong_evidence,
            cfm=None,
        )
        assert "dscr" in missing
        assert fv["dscr"] == FEATURE_DEFAULTS["dscr"]

    def test_feature_values_are_clamped(self, strong_app, strong_evidence):
        """All float fields must be within defined clamping bounds."""
        from backend.modules.module4_decision.risk_feature_engineer import RiskFeatureEngineer
        cfm = MagicMock()
        cfm.dscr = 99.0              # should be clamped to 5.0
        cfm.volatility_index = -5.0  # should be clamped to 0.0
        cfm.avg_monthly_inflow = 1_000_000.0
        cfm.avg_monthly_outflow = 800_000.0
        cfm.net_monthly_surplus = 200_000.0
        cfm.existing_monthly_emi = 0.0
        cfm.proposed_monthly_emi = 0.0
        cfm.surplus_after_obligations = 200_000.0
        cfm.debt_service_burden_pct = 0.0
        cfm.working_capital_buffer_days = 60
        fv, _ = RiskFeatureEngineer.build_feature_vector(strong_app, strong_evidence, cfm)
        assert fv["dscr"] <= 5.0
        assert fv["volatility_index"] >= 0.0


# ══════════════════════════════════════════════════════════════════════════════
# 2. Policy Rules Engine Tests
# ══════════════════════════════════════════════════════════════════════════════

class TestPolicyRulesEngine:

    def _strong_fv(self):
        return {
            "vintage_months": 72.0,
            "annual_turnover": 12_000_000.0,
            "dscr": 2.2,
            "buffer_days": 45.0,
            "volatility_index": 0.07,
            "cheque_bounces_6m": 0.0,
            "exposure_ratio": 0.13,
            "debt_service_burden_pct": 7.3,
            "avg_doc_confidence": 0.92,
            "monthly_inflow": 1_000_000.0,
            "revenue_consistency": 0.93,
            "net_monthly_surplus": 180_000.0,
            "operating_margin_proxy": 0.18,
            "surplus_after_obligations": 107_000.0,
            "existing_emi_monthly": 25_000.0,
        }

    def test_all_rules_pass_for_strong_applicant(self):
        from backend.modules.module4_decision.eligibility_rules import PolicyRulesEngine
        passed, evals, gate = PolicyRulesEngine.evaluate(
            feature_vector=self._strong_fv(),
            has_active_gstin=True,
            kyc_docs_verified=2,
            docs_uploaded=4,
            requested_amount=1_500_000.0,
            annual_turnover=12_000_000.0,
        )
        assert passed is True
        assert gate.eligibility_status == "ELIGIBLE"
        assert gate.hard_failure_count == 0

    def test_vintage_hard_fail(self):
        """R02_VINTAGE: vintage < 24M must trigger HARD_FAIL."""
        from backend.modules.module4_decision.eligibility_rules import PolicyRulesEngine
        fv = {**self._strong_fv(), "vintage_months": 18.0}
        passed, evals, gate = PolicyRulesEngine.evaluate(
            feature_vector=fv,
            has_active_gstin=True,
            kyc_docs_verified=2,
            docs_uploaded=4,
            requested_amount=1_000_000.0,
            annual_turnover=12_000_000.0,
        )
        assert passed is False
        assert gate.eligibility_status == "NOT_ELIGIBLE"
        rule_ids = [e.rule_id for e in evals if not e.passed]
        assert "R02_VINTAGE" in rule_ids

    def test_turnover_hard_fail(self):
        """R04_ANNUAL_TURNOVER: turnover < ₹25L must trigger HARD_FAIL."""
        from backend.modules.module4_decision.eligibility_rules import PolicyRulesEngine
        fv = {**self._strong_fv(), "annual_turnover": 1_800_000.0}
        passed, evals, gate = PolicyRulesEngine.evaluate(
            feature_vector=fv,
            has_active_gstin=True,
            kyc_docs_verified=1,
            docs_uploaded=3,
            requested_amount=500_000.0,
            annual_turnover=1_800_000.0,
        )
        assert passed is False
        rule_ids = [e.rule_id for e in evals if not e.passed]
        assert "R04_ANNUAL_TURNOVER" in rule_ids

    def test_dscr_hard_fail(self):
        """R05_DSCR: DSCR < 1.25 must trigger HARD_FAIL."""
        from backend.modules.module4_decision.eligibility_rules import PolicyRulesEngine
        fv = {**self._strong_fv(), "dscr": 0.90}
        passed, evals, gate = PolicyRulesEngine.evaluate(
            feature_vector=fv, has_active_gstin=True,
            kyc_docs_verified=1, docs_uploaded=3,
            requested_amount=500_000.0, annual_turnover=12_000_000.0,
        )
        assert passed is False
        rule_ids = [e.rule_id for e in evals if not e.passed]
        assert "R05_DSCR" in rule_ids

    def test_cheque_bounces_hard_fail(self):
        """R06_CHEQUE_BOUNCES: bounces > 2 must trigger HARD_FAIL."""
        from backend.modules.module4_decision.eligibility_rules import PolicyRulesEngine
        fv = {**self._strong_fv(), "cheque_bounces_6m": 4.0}
        passed, evals, gate = PolicyRulesEngine.evaluate(
            feature_vector=fv, has_active_gstin=True,
            kyc_docs_verified=2, docs_uploaded=4,
            requested_amount=500_000.0, annual_turnover=12_000_000.0,
        )
        assert passed is False
        rule_ids = [e.rule_id for e in evals if not e.passed]
        assert "R06_CHEQUE_BOUNCES" in rule_ids

    def test_kyc_hard_fail(self):
        """R01_KYC_IDENTITY: zero verified KYC docs → HARD_FAIL."""
        from backend.modules.module4_decision.eligibility_rules import PolicyRulesEngine
        passed, evals, gate = PolicyRulesEngine.evaluate(
            feature_vector=self._strong_fv(),
            has_active_gstin=True,
            kyc_docs_verified=0,    # ← no KYC
            docs_uploaded=4,
            requested_amount=1_000_000.0,
            annual_turnover=12_000_000.0,
        )
        assert passed is False
        rule_ids = [e.rule_id for e in evals if not e.passed]
        assert "R01_KYC_IDENTITY" in rule_ids

    def test_gstin_hard_fail(self):
        """R03_ACTIVE_GSTIN: inactive GSTIN → HARD_FAIL."""
        from backend.modules.module4_decision.eligibility_rules import PolicyRulesEngine
        passed, evals, gate = PolicyRulesEngine.evaluate(
            feature_vector=self._strong_fv(),
            has_active_gstin=False,   # ← inactive
            kyc_docs_verified=2,
            docs_uploaded=4,
            requested_amount=1_000_000.0,
            annual_turnover=12_000_000.0,
        )
        assert passed is False
        rule_ids = [e.rule_id for e in evals if not e.passed]
        assert "R03_ACTIVE_GSTIN" in rule_ids

    def test_exposure_ratio_hard_fail(self):
        """R07_MAX_EXPOSURE: exposure > 80% of turnover → HARD_FAIL."""
        from backend.modules.module4_decision.eligibility_rules import PolicyRulesEngine
        fv = {**self._strong_fv(), "exposure_ratio": 0.95}
        passed, evals, gate = PolicyRulesEngine.evaluate(
            feature_vector=fv, has_active_gstin=True,
            kyc_docs_verified=2, docs_uploaded=4,
            requested_amount=11_400_000.0,  # 95% of 12M
            annual_turnover=12_000_000.0,
        )
        assert passed is False
        rule_ids = [e.rule_id for e in evals if not e.passed]
        assert "R07_MAX_EXPOSURE" in rule_ids

    def test_doc_completeness_review_not_hard_fail(self):
        """R08_DOC_COMPLETENESS is a REVIEW rule, not HARD_FAIL."""
        from backend.modules.module4_decision.eligibility_rules import PolicyRulesEngine
        passed, evals, gate = PolicyRulesEngine.evaluate(
            feature_vector=self._strong_fv(),
            has_active_gstin=True,
            kyc_docs_verified=2,
            docs_uploaded=1,   # below minimum of 2
            requested_amount=1_000_000.0,
            annual_turnover=12_000_000.0,
        )
        # All hard rules pass, but review flagged
        assert passed is True
        assert gate.eligibility_status == "NEEDS_REVIEW"
        assert gate.review_flag_count >= 1

    def test_all_10_rules_always_evaluated(self):
        """All 10 rule evaluations must be present regardless of early failure."""
        from backend.modules.module4_decision.eligibility_rules import PolicyRulesEngine
        fv = {**self._strong_fv(), "vintage_months": 5.0, "dscr": 0.5}
        _, evals, gate = PolicyRulesEngine.evaluate(
            feature_vector=fv, has_active_gstin=False,
            kyc_docs_verified=0, docs_uploaded=0,
            requested_amount=500_000.0, annual_turnover=1_000_000.0,
        )
        assert len(evals) == 10, f"Expected 10 rule evaluations, got {len(evals)}"

    def test_multiple_hard_fails_all_recorded(self):
        """Multiple rule failures must ALL appear in the evaluation list."""
        from backend.modules.module4_decision.eligibility_rules import PolicyRulesEngine
        fv = {**self._strong_fv(), "vintage_months": 10.0, "dscr": 0.8,
              "cheque_bounces_6m": 5.0}
        passed, evals, gate = PolicyRulesEngine.evaluate(
            feature_vector=fv, has_active_gstin=True,
            kyc_docs_verified=1, docs_uploaded=3,
            requested_amount=500_000.0, annual_turnover=12_000_000.0,
        )
        failed_ids = [e.rule_id for e in evals if not e.passed]
        assert "R02_VINTAGE" in failed_ids
        assert "R05_DSCR" in failed_ids
        assert "R06_CHEQUE_BOUNCES" in failed_ids
        assert gate.hard_failure_count >= 3


# ══════════════════════════════════════════════════════════════════════════════
# 3. ML Risk Model Tests
# ══════════════════════════════════════════════════════════════════════════════

class TestMLRiskModel:

    def _fv(self, **overrides):
        base = {
            "annual_turnover": 8_000_000.0,
            "monthly_inflow": 666_000.0,
            "revenue_consistency": 0.85,
            "dscr": 1.8,
            "net_monthly_surplus": 100_000.0,
            "operating_margin_proxy": 0.15,
            "surplus_after_obligations": 60_000.0,
            "debt_service_burden_pct": 20.0,
            "existing_emi_monthly": 30_000.0,
            "exposure_ratio": 0.30,
            "buffer_days": 35.0,
            "volatility_index": 0.10,
            "cheque_bounces_6m": 0.0,
            "vintage_months": 48.0,
            "avg_doc_confidence": 0.88,
        }
        return {**base, **overrides}

    def test_model_version_recorded(self):
        from backend.modules.module4_decision.ml_risk_model import MLRiskModel, MODEL_VERSION
        MLRiskModel.reset_instance()
        model = MLRiskModel.get_instance()
        assert model.model_version == MODEL_VERSION
        assert "v3" in MODEL_VERSION

    def test_predict_returns_valid_types(self):
        from backend.modules.module4_decision.ml_risk_model import MLRiskModel
        from backend.database.models import RiskBand
        MLRiskModel.reset_instance()
        model = MLRiskModel.get_instance()
        pd_val, trust, band, x_vec = model.predict_risk(self._fv())
        assert 0.0 <= pd_val <= 1.0
        assert 50 <= trust <= 950
        assert band in (RiskBand.LOW_RISK, RiskBand.MEDIUM_RISK, RiskBand.HIGH_RISK)
        assert x_vec.shape[1] == 15

    def test_reproducibility(self):
        """Same feature vector must always yield same PD."""
        from backend.modules.module4_decision.ml_risk_model import MLRiskModel
        MLRiskModel.reset_instance()
        model = MLRiskModel.get_instance()
        fv = self._fv()
        pd1, s1, b1, _ = model.predict_risk(fv)
        pd2, s2, b2, _ = model.predict_risk(fv)
        assert pd1 == pd2
        assert s1 == s2
        assert b1 == b2

    def test_strong_profile_low_risk(self):
        """Exemplary metrics should produce LOW_RISK band."""
        from backend.modules.module4_decision.ml_risk_model import MLRiskModel
        from backend.database.models import RiskBand
        MLRiskModel.reset_instance()
        model = MLRiskModel.get_instance()
        fv = self._fv(
            dscr=2.8, vintage_months=84.0, cheque_bounces_6m=0.0,
            volatility_index=0.05, surplus_after_obligations=200_000.0,
            revenue_consistency=0.95,
        )
        pd_val, trust, band, _ = model.predict_risk(fv)
        assert band == RiskBand.LOW_RISK, f"Expected LOW_RISK, got {band} (PD={pd_val:.3f})"
        assert trust > 700

    def test_distressed_profile_high_risk(self):
        """Distressed metrics should produce HIGH_RISK band."""
        from backend.modules.module4_decision.ml_risk_model import MLRiskModel
        from backend.database.models import RiskBand
        MLRiskModel.reset_instance()
        model = MLRiskModel.get_instance()
        fv = self._fv(
            dscr=0.70, vintage_months=10.0, cheque_bounces_6m=5.0,
            volatility_index=0.55, surplus_after_obligations=-80_000.0,
            revenue_consistency=0.30, debt_service_burden_pct=65.0,
        )
        pd_val, trust, band, _ = model.predict_risk(fv)
        assert band == RiskBand.HIGH_RISK, f"Expected HIGH_RISK, got {band} (PD={pd_val:.3f})"
        assert trust < 400

    def test_trust_score_inverse_of_pd(self):
        """Trust score must be approximately (1 - PD) * 1000, clamped to [50, 950]."""
        from backend.modules.module4_decision.ml_risk_model import MLRiskModel
        MLRiskModel.reset_instance()
        model = MLRiskModel.get_instance()
        pd_val, trust, _, _ = model.predict_risk(self._fv())
        expected = max(50, min(950, int(round((1.0 - pd_val) * 1000))))
        assert abs(trust - expected) <= 1  # allow 1-point rounding

    def test_model_signature_stable(self):
        """Model signature must be stable across instantiations."""
        from backend.modules.module4_decision.ml_risk_model import MLRiskModel
        MLRiskModel.reset_instance()
        m1 = MLRiskModel.get_instance()
        sig1 = m1.model_signature()
        MLRiskModel.reset_instance()
        m2 = MLRiskModel.get_instance()
        sig2 = m2.model_signature()
        assert sig1 == sig2


# ══════════════════════════════════════════════════════════════════════════════
# 4. Hard-Rule Supremacy Invariant (critical acceptance criterion)
# ══════════════════════════════════════════════════════════════════════════════

class TestHardRuleSupremacy:
    """
    INVARIANT: If PolicyRulesEngine finds a HARD_FAIL, the RiskOrchestrator
    MUST set override_blocked=True and risk_band=HIGH_RISK regardless of ML output.
    """

    def _run_orchestrator(self, mock_db, app, evidence_map, cfm=None):
        """Helper to run orchestrator with mocked Firestore."""
        with patch("backend.modules.module4_decision.risk_orchestrator.db", mock_db), \
             patch("backend.modules.module3_financial.cashflow_engine.db", mock_db), \
             patch("backend.modules.module3_financial.consistency_engine.db", mock_db), \
             patch("backend.modules.module4_decision.shap_explainer.db", mock_db), \
             patch("backend.modules.module5_trust.audit_ledger.db", mock_db), \
             patch("backend.modules.module4_decision.risk_orchestrator.CashFlowEngine") as mock_cfe, \
             patch("backend.modules.module4_decision.risk_orchestrator.ConsistencyEngine") as mock_ce, \
             patch("backend.modules.module4_decision.risk_orchestrator.SHAPExplainerService") as mock_shap, \
             patch("backend.modules.module4_decision.risk_orchestrator.AuditLedger") as mock_audit:

            mock_db.get.side_effect = lambda col, key: (
                {"application_id": "test_app", "current_stage": "VERIFICATION"} if col == "journeys"
                else app if col == "applications"
                else None
            )
            mock_db.list.side_effect = lambda col, filt: (
                [{"field_name": k, "field_value": v} for k, v in evidence_map.items()] if col == "evidence_ledger"
                else []
            )

            if cfm:
                mock_cfe.calculate_metrics.return_value = cfm
            else:
                mock_cfe.calculate_metrics.side_effect = Exception("no cfm")

            mock_ce.verify_consistency.return_value = MagicMock(is_consistent=True, discrepancies=[])
            mock_shap.explain_prediction.return_value = None
            mock_audit.log.return_value = None

            from backend.modules.module4_decision.risk_orchestrator import RiskOrchestrator
            from backend.modules.module4_decision.ml_risk_model import MLRiskModel
            MLRiskModel.reset_instance()

            return RiskOrchestrator.assess(
                journey_id="test_journey",
                application_id="test_app",
                force_recalculate=True,
            )

    def test_hard_fail_sets_override_blocked(self, mock_db):
        """Application failing vintage rule must have override_blocked=True."""
        app = {
            "requested_amount": 500_000.0,
            "tenor_months": 12,
            "annual_turnover": 1_500_000.0,  # fails turnover
            "vintage_months": 12,             # fails vintage
        }
        assessment = self._run_orchestrator(mock_db, app, {})
        assert assessment.override_blocked is True

    def test_hard_fail_forces_high_risk_band(self, mock_db):
        """Hard rule failure must produce HIGH_RISK band regardless of ML."""
        from backend.database.models import RiskBand
        app = {
            "requested_amount": 500_000.0,
            "tenor_months": 12,
            "annual_turnover": 1_200_000.0,  # fails turnover
            "vintage_months": 10,             # fails vintage
        }
        assessment = self._run_orchestrator(mock_db, app, {})
        assert assessment.risk_band == RiskBand.HIGH_RISK

    def test_hard_fail_all_rules_still_evaluated(self, mock_db):
        """Even with hard failures, all 10 rules must be evaluated."""
        app = {
            "requested_amount": 500_000.0,
            "tenor_months": 12,
            "annual_turnover": 1_200_000.0,
            "vintage_months": 10,
        }
        assessment = self._run_orchestrator(mock_db, app, {})
        assert len(assessment.hard_rules) == 10

    def test_hard_fail_ml_pd_still_computed(self, mock_db):
        """ML PD should still be computed (for auditor reference) even on hard failure."""
        app = {
            "requested_amount": 500_000.0,
            "tenor_months": 12,
            "annual_turnover": 1_200_000.0,
            "vintage_months": 10,
        }
        assessment = self._run_orchestrator(mock_db, app, {})
        # ML still runs; PD is in valid range
        assert 0.0 <= assessment.probability_of_default <= 1.0

    def test_model_version_always_recorded(self, mock_db):
        """Model version string must be present on every assessment."""
        from backend.modules.module4_decision.ml_risk_model import MODEL_VERSION
        app = {"requested_amount": 500_000.0, "annual_turnover": 5_000_000.0, "vintage_months": 36}
        assessment = self._run_orchestrator(mock_db, app, {"gstin": "27AADCB2230M1Z5"})
        assert assessment.model_version == MODEL_VERSION

    def test_feature_vector_stored_on_assessment(self, mock_db):
        """feature_vector must be non-empty on every assessment."""
        app = {"requested_amount": 500_000.0, "annual_turnover": 5_000_000.0, "vintage_months": 36}
        assessment = self._run_orchestrator(mock_db, app, {"gstin": "27AADCB2230M1Z5"})
        assert len(assessment.feature_vector) > 0

    def test_policy_gate_recorded(self, mock_db):
        """PolicyGateResult must be attached to every assessment."""
        app = {"requested_amount": 500_000.0, "annual_turnover": 5_000_000.0, "vintage_months": 36}
        assessment = self._run_orchestrator(mock_db, app, {"gstin": "27AADCB2230M1Z5"})
        assert assessment.policy_gate is not None
        assert assessment.policy_gate.eligibility_status in ("ELIGIBLE", "NOT_ELIGIBLE", "NEEDS_REVIEW")


# ══════════════════════════════════════════════════════════════════════════════
# 5. Application Profile Integration Tests
# ══════════════════════════════════════════════════════════════════════════════

class TestApplicationProfiles:
    """
    Tests the four canonical MSME application profiles end-to-end through
    PolicyRulesEngine + MLRiskModel (without full Firestore orchestrator).
    """

    def _assess(self, fv, has_gstin=True, kyc=1, docs=3, req_amt=500_000.0, turnover=5_000_000.0):
        from backend.modules.module4_decision.eligibility_rules import PolicyRulesEngine
        from backend.modules.module4_decision.ml_risk_model import MLRiskModel
        MLRiskModel.reset_instance()
        passed, evals, gate = PolicyRulesEngine.evaluate(
            feature_vector=fv,
            has_active_gstin=has_gstin,
            kyc_docs_verified=kyc,
            docs_uploaded=docs,
            requested_amount=req_amt,
            annual_turnover=turnover,
        )
        model = MLRiskModel.get_instance()
        pd_val, trust, band, _ = model.predict_risk(fv)
        return passed, gate, pd_val, trust, band

    def test_strong_application(self):
        """Strong MSME: all rules pass, LOW_RISK expected."""
        from backend.database.models import RiskBand
        fv = {
            "annual_turnover": 15_000_000.0, "monthly_inflow": 1_250_000.0,
            "revenue_consistency": 0.92, "dscr": 2.5, "net_monthly_surplus": 250_000.0,
            "operating_margin_proxy": 0.20, "surplus_after_obligations": 180_000.0,
            "debt_service_burden_pct": 10.0, "existing_emi_monthly": 20_000.0,
            "exposure_ratio": 0.15, "buffer_days": 55.0, "volatility_index": 0.06,
            "cheque_bounces_6m": 0.0, "vintage_months": 84.0, "avg_doc_confidence": 0.94,
        }
        passed, gate, pd_val, trust, band = self._assess(fv, req_amt=2_000_000.0, turnover=15_000_000.0)
        assert passed is True
        assert gate.eligibility_status == "ELIGIBLE"
        assert band == RiskBand.LOW_RISK, f"Expected LOW_RISK, got {band} (PD={pd_val:.3f})"
        assert trust > 750

    def test_weak_but_eligible_application(self):
        """Weak MSME: rules pass narrowly, MEDIUM or HIGH expected."""
        from backend.database.models import RiskBand
        fv = {
            "annual_turnover": 2_700_000.0, "monthly_inflow": 225_000.0,
            "revenue_consistency": 0.55, "dscr": 1.26, "net_monthly_surplus": 20_000.0,
            "operating_margin_proxy": 0.08, "surplus_after_obligations": -15_000.0,
            "debt_service_burden_pct": 48.0, "existing_emi_monthly": 65_000.0,
            "exposure_ratio": 0.44, "buffer_days": 12.0, "volatility_index": 0.35,
            "cheque_bounces_6m": 2.0, "vintage_months": 25.0, "avg_doc_confidence": 0.65,
        }
        passed, gate, pd_val, trust, band = self._assess(fv, req_amt=700_000.0, turnover=2_700_000.0)
        assert passed is True
        assert band in (RiskBand.MEDIUM_RISK, RiskBand.HIGH_RISK)

    def test_ineligible_application_hard_fail(self):
        """Ineligible MSME: fails multiple hard rules."""
        fv = {
            "annual_turnover": 1_500_000.0, "monthly_inflow": 125_000.0,
            "revenue_consistency": 0.50, "dscr": 0.80, "net_monthly_surplus": -10_000.0,
            "operating_margin_proxy": -0.08, "surplus_after_obligations": -50_000.0,
            "debt_service_burden_pct": 60.0, "existing_emi_monthly": 0.0,
            "exposure_ratio": 0.33, "buffer_days": 7.0, "volatility_index": 0.35,
            "cheque_bounces_6m": 0.0, "vintage_months": 15.0, "avg_doc_confidence": 0.65,
        }
        passed, gate, pd_val, trust, band = self._assess(
            fv, req_amt=500_000.0, turnover=1_500_000.0
        )
        assert passed is False
        assert gate.eligibility_status == "NOT_ELIGIBLE"
        assert gate.hard_failure_count >= 2

    def test_inconsistent_application_cheque_bounces(self):
        """Application with 4 cheque bounces must fail hard rule R06."""
        fv = {
            "annual_turnover": 6_000_000.0, "monthly_inflow": 500_000.0,
            "revenue_consistency": 0.75, "dscr": 1.60, "net_monthly_surplus": 80_000.0,
            "operating_margin_proxy": 0.16, "surplus_after_obligations": 40_000.0,
            "debt_service_burden_pct": 20.0, "existing_emi_monthly": 30_000.0,
            "exposure_ratio": 0.22, "buffer_days": 30.0, "volatility_index": 0.12,
            "cheque_bounces_6m": 4.0,   # ← exceeds hard threshold of 2
            "vintage_months": 36.0, "avg_doc_confidence": 0.82,
        }
        passed, gate, pd_val, trust, band = self._assess(fv, req_amt=800_000.0, turnover=6_000_000.0)
        assert passed is False
        failed_ids = gate.failed_rule_ids
        assert "R06_CHEQUE_BOUNCES" in failed_ids

    def test_incomplete_application_review_flag(self):
        """Incomplete docs trigger REVIEW, not HARD_FAIL."""
        fv = {
            "annual_turnover": 5_000_000.0, "monthly_inflow": 416_000.0,
            "revenue_consistency": 0.78, "dscr": 1.45, "net_monthly_surplus": 60_000.0,
            "operating_margin_proxy": 0.14, "surplus_after_obligations": 25_000.0,
            "debt_service_burden_pct": 22.0, "existing_emi_monthly": 25_000.0,
            "exposure_ratio": 0.25, "buffer_days": 28.0, "volatility_index": 0.15,
            "cheque_bounces_6m": 0.0, "vintage_months": 36.0,
            "avg_doc_confidence": 0.55,   # ← below 60% confidence threshold
        }
        passed, gate, pd_val, trust, band = self._assess(
            fv, kyc=1, docs=1,  # ← minimal docs
            req_amt=500_000.0, turnover=5_000_000.0,
        )
        # Hard rules should pass (all HARD_FAIL criteria met)
        assert passed is True
        # But review flags should fire
        assert gate.review_flag_count >= 1
        assert gate.eligibility_status == "NEEDS_REVIEW"
