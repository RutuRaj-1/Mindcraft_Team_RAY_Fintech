import numpy as np
import logging
from typing import Dict, Any, Tuple
from sklearn.ensemble import RandomForestClassifier
from backend.database.models import RiskBand

logger = logging.getLogger(__name__)

FEATURE_NAMES = [
    "vintage_months",
    "annual_turnover",
    "dscr",
    "buffer_days",
    "bounces_6m",
    "volatility_index",
    "profit_margin"
]

FEATURE_DISPLAY_NAMES = {
    "vintage_months": "Operational Vintage (Months)",
    "annual_turnover": "Annual Sales Turnover (₹)",
    "dscr": "Debt Service Coverage Ratio (DSCR)",
    "buffer_days": "Working Capital Buffer (Days)",
    "bounces_6m": "Inward Cheque Bounces (6M)",
    "volatility_index": "Cash Flow Volatility",
    "profit_margin": "Net Profit Margin (%)"
}

class MLRiskModel:
    _instance = None

    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=60, random_state=42, max_depth=5)
        self.feature_names = FEATURE_NAMES
        self._train_synthetic_base_model()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = MLRiskModel()
        return cls._instance

    def _train_synthetic_base_model(self):
        """Trains an initial calibrated model on synthetic SME historical loan outcomes."""
        np.random.seed(42)
        n_samples = 300

        # Features
        vintages = np.random.uniform(12, 120, n_samples)
        turnovers = np.random.uniform(2000000, 50000000, n_samples)
        dscrs = np.random.uniform(0.8, 3.5, n_samples)
        buffers = np.random.uniform(5, 75, n_samples)
        bounces = np.random.choice([0, 0, 0, 1, 1, 2, 3, 4], n_samples)
        volatilities = np.random.uniform(0.05, 0.65, n_samples)
        margins = np.random.uniform(0.04, 0.28, n_samples)

        X = np.column_stack([vintages, turnovers, dscrs, buffers, bounces, volatilities, margins])

        # Deterministic ground truth default probability formula
        log_odds = (
            - 0.03 * (vintages - 24)
            - 0.00000008 * turnovers
            - 1.8 * (dscrs - 1.25)
            - 0.04 * (buffers - 15)
            + 1.2 * bounces
            + 2.5 * volatilities
            - 4.0 * margins
        )
        probs = 1.0 / (1.0 + np.exp(-log_odds))
        y = (probs > 0.45).astype(int)

        self.model.fit(X, y)
        logger.info("FinFlow Scikit-Learn Risk Model trained successfully on SME baseline dataset.")

    def predict_risk(self, feature_dict: Dict[str, float]) -> Tuple[float, int, RiskBand, np.ndarray]:
        """
        Returns:
            probability_of_default: float (0.0 to 1.0)
            trust_score: int (0 to 1000)
            risk_band: RiskBand
            feature_vector: np.ndarray
        """
        x_vector = np.array([[
            feature_dict.get("vintage_months", 36.0),
            feature_dict.get("annual_turnover", 10000000.0),
            feature_dict.get("dscr", 1.5),
            feature_dict.get("buffer_days", 30.0),
            feature_dict.get("bounces_6m", 0.0),
            feature_dict.get("volatility_index", 0.15),
            feature_dict.get("profit_margin", 0.12)
        ]])

        probs = self.model.predict_proba(x_vector)[0]
        # probability of default is class 1
        pd = float(probs[1]) if len(probs) > 1 else 0.1

        # FinFlow Trust Score 0 - 1000 (higher is better credit quality)
        trust_score = int(round((1.0 - pd) * 1000))
        trust_score = max(50, min(950, trust_score))

        if pd < 0.18:
            band = RiskBand.LOW_RISK
        elif pd < 0.38:
            band = RiskBand.MEDIUM_RISK
        else:
            band = RiskBand.HIGH_RISK

        return pd, trust_score, band, x_vector
