"""
MLRiskModel v3 — Scikit-Learn GradientBoosting Risk Classifier
===============================================================
Architecture:
  - GradientBoostingClassifier (n=200, depth=4) for stable PD curves
  - 15-feature vector from RiskFeatureEngineer
  - Trained on 800-sample synthetic SME dataset with realistic defaults
  - Probability of Default (PD) output in [0, 1]
  - FinFlow Trust Score mapped from PD: score = round((1 - PD) * 1000)
  - Risk bands: LOW (<18% PD), MEDIUM (18–38%), HIGH (>38%)
  - Model version string stored on every RiskAssessment
  - Singleton pattern ensures one model instance per process

Reproducibility:
  - numpy.random.seed(42) for synthetic data generation
  - sklearn random_state=42 for training
  - Same feature vector always produces same PD
"""

import logging
import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, Tuple

import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

from backend.database.models import RiskBand
from backend.modules.module4_decision.risk_feature_engineer import (
    FEATURE_NAMES,
    FEATURE_DEFAULTS,
    FEATURE_DISPLAY,
)

logger = logging.getLogger(__name__)

MODEL_VERSION = "scikit-learn-gbm-sme-v3.0"

# PD thresholds for band assignment
PD_LOW_MAX    = 0.18   # < 18% PD → LOW_RISK
PD_MEDIUM_MAX = 0.38   # 18–38% PD → MEDIUM_RISK
                       # > 38% PD → HIGH_RISK


class MLRiskModel:
    """
    Singleton ML risk model.  Call MLRiskModel.get_instance() to access.

    Exposes:
        predict_risk(feature_dict)   → (pd, trust_score, risk_band, x_vector)
        model_signature()            → sha256 of training data seed string
    """
    _instance: "MLRiskModel | None" = None

    def __init__(self) -> None:
        self.feature_names = FEATURE_NAMES
        self.model_version = MODEL_VERSION
        self._pipeline: Pipeline = self._build_and_train()
        self._trained_at = datetime.now(timezone.utc).isoformat()
        logger.info("FinFlow ML Risk Model %s trained successfully.", MODEL_VERSION)

    # ── Singleton access ─────────────────────────────────────────────────────
    @classmethod
    def get_instance(cls) -> "MLRiskModel":
        if cls._instance is None:
            cls._instance = MLRiskModel()
        return cls._instance

    @classmethod
    def reset_instance(cls) -> None:
        """For testing — force a fresh model next call."""
        cls._instance = None

    # ── Model architecture ───────────────────────────────────────────────────
    def _build_and_train(self) -> Pipeline:
        X, y = self._generate_synthetic_training_data()
        pipeline = Pipeline([
            ("scaler", StandardScaler()),
            ("clf", GradientBoostingClassifier(
                n_estimators=200,
                max_depth=4,
                learning_rate=0.08,
                subsample=0.85,
                random_state=42,
                min_samples_split=10,
            )),
        ])
        pipeline.fit(X, y)
        return pipeline

    def _generate_synthetic_training_data(self):
        """
        800-sample synthetic SME dataset.
        Ground-truth default label derived from a calibrated logistic formula
        that respects realistic MSME credit dynamics:
          - Long vintage + high DSCR → very low PD
          - High bounces + low surplus → high PD
          - High exposure ratio → moderate PD uplift
        """
        np.random.seed(42)
        n = 800

        # Feature sampling ranges (realistic Indian SME distributions)
        annual_turnover        = np.random.uniform(1_500_000,  60_000_000, n)
        monthly_inflow         = annual_turnover / 12 * np.random.uniform(0.85, 1.15, n)
        revenue_consistency    = np.random.uniform(0.40, 0.98, n)
        dscr                   = np.random.uniform(0.60, 4.00, n)
        net_monthly_surplus    = monthly_inflow * np.random.uniform(-0.05, 0.35, n)
        operating_margin       = net_monthly_surplus / np.maximum(monthly_inflow, 1.0)
        surplus_after_obl      = net_monthly_surplus * np.random.uniform(0.50, 0.95, n)
        debt_burden_pct        = np.random.uniform(5.0, 70.0, n)
        existing_emi           = monthly_inflow * np.random.uniform(0.0, 0.35, n)
        exposure_ratio         = np.random.uniform(0.05, 1.20, n)
        buffer_days            = np.random.uniform(3.0,  90.0, n)
        volatility_index       = np.random.uniform(0.02, 0.65, n)
        cheque_bounces         = np.random.choice([0, 0, 0, 0, 1, 1, 2, 3, 4, 5], n)
        vintage_months         = np.random.uniform(6.0, 144.0, n)
        avg_doc_confidence     = np.random.uniform(0.45, 0.99, n)

        X = np.column_stack([
            annual_turnover,
            monthly_inflow,
            revenue_consistency,
            dscr,
            net_monthly_surplus,
            operating_margin,
            surplus_after_obl,
            debt_burden_pct,
            existing_emi,
            exposure_ratio,
            buffer_days,
            volatility_index,
            cheque_bounces,
            vintage_months,
            avg_doc_confidence,
        ])

        # Ground-truth log-odds from domain expertise:
        log_odds = (
            -0.025  * (vintage_months - 24)
            -0.00000004 * annual_turnover
            -2.00   * (dscr - 1.25)
            -0.035  * (buffer_days - 15)
            +1.50   * cheque_bounces
            +2.80   * volatility_index
            -3.00   * revenue_consistency
            -4.00   * operating_margin
            +0.80   * exposure_ratio
            +0.03   * debt_burden_pct
            -0.20   * avg_doc_confidence
        )
        probs = 1.0 / (1.0 + np.exp(-log_odds))
        y = (probs > 0.42).astype(int)

        logger.debug(
            "Synthetic training data: %d samples, default rate=%.1f%%",
            n, y.mean() * 100,
        )
        return X, y

    # ── Prediction ────────────────────────────────────────────────────────────
    def predict_risk(
        self,
        feature_dict: Dict[str, float],
    ) -> Tuple[float, int, RiskBand, np.ndarray]:
        """
        Args:
            feature_dict: from RiskFeatureEngineer.build_feature_vector()

        Returns:
            pd:           probability of default [0.0, 1.0]
            trust_score:  FinFlow Trust Score [50, 950]
            risk_band:    LOW_RISK | MEDIUM_RISK | HIGH_RISK
            x_vector:     numpy array in feature-name order (for SHAP)
        """
        x_row = [
            feature_dict.get(name, FEATURE_DEFAULTS[name])
            for name in FEATURE_NAMES
        ]
        x_vector = np.array([x_row])

        proba = self._pipeline.predict_proba(x_vector)[0]
        # index 1 = positive class (default)
        pd_val = float(proba[1]) if len(proba) > 1 else float(proba[0])
        pd_val = max(0.01, min(0.99, pd_val))  # keep away from hard boundaries

        trust_score = int(round((1.0 - pd_val) * 1000))
        trust_score = max(50, min(950, trust_score))

        if pd_val < PD_LOW_MAX:
            band = RiskBand.LOW_RISK
        elif pd_val < PD_MEDIUM_MAX:
            band = RiskBand.MEDIUM_RISK
        else:
            band = RiskBand.HIGH_RISK

        return pd_val, trust_score, band, x_vector

    # ── Model metadata ────────────────────────────────────────────────────────
    def model_signature(self) -> str:
        """Deterministic hash of model config for audit trail."""
        config_str = json.dumps({
            "version": MODEL_VERSION,
            "n_features": len(FEATURE_NAMES),
            "features": FEATURE_NAMES,
            "seed": 42,
        }, sort_keys=True)
        return hashlib.sha256(config_str.encode()).hexdigest()[:16]


# ── Re-export for backward compat ────────────────────────────────────────────
FEATURE_DISPLAY_NAMES = FEATURE_DISPLAY
