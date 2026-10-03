"""
RiskFeatureEngineer — Module 4 Feature Engineering Pipeline
============================================================
Centralised extraction and normalisation of all features used by the
ML risk model.  This is the SINGLE source of truth for the feature
vector; neither the router nor the model construct features directly.

Design:
  - All inputs are pulled from already-computed downstream artefacts
    (CashFlowMetrics, evidence ledger, application record, consistency report).
  - Features are deterministically normalised so the same raw inputs
    always produce the same feature vector (reproducibility requirement).
  - Missing values are filled with conservative (high-risk) defaults and
    flagged in `missing_fields` for auditability.
  - The full feature dict is stored on the RiskAssessment record.
"""

import logging
from typing import Dict, List, Tuple, Optional, Any
from backend.database.models import CashFlowMetrics, ConsistencyReport

logger = logging.getLogger(__name__)

# ── Feature Registry ─────────────────────────────────────────────────────────
# Each entry: (feature_name, display_name, default_value, description)
FEATURE_REGISTRY: List[Tuple[str, str, float, str]] = [
    # -- Revenue / Scale
    ("annual_turnover",          "Annual Verified Turnover (₹)",           5_000_000.0,  "GST / bank credit verified annual sales"),
    ("monthly_inflow",           "Avg Monthly Bank Inflow (₹)",              400_000.0,  "Average monthly credits in bank statement"),
    ("revenue_consistency",      "Revenue Consistency Score (0–1)",                0.7,  "1 – cash-flow volatility index; higher = more consistent"),

    # -- Profitability / Cash Flow
    ("dscr",                     "Debt Service Coverage Ratio (x)",               1.0,  "Operating surplus / annual debt service"),
    ("net_monthly_surplus",      "Net Monthly Surplus (₹)",                    30_000.0,  "Avg monthly inflow – avg monthly outflow"),
    ("operating_margin_proxy",   "Operating Margin Proxy (%)",                     0.10,  "Net surplus / avg monthly inflow"),
    ("surplus_after_obligations","Surplus After All Obligations (₹)",          10_000.0,  "Net surplus – existing EMI – proposed EMI"),

    # -- Obligations / Leverage
    ("debt_service_burden_pct",  "Total Obligation Burden (% of inflow)",          25.0,  "Total monthly obligations as % of avg inflow"),
    ("existing_emi_monthly",     "Existing Monthly EMI Obligations (₹)",            0.0,  "Existing loan repayments per month"),
    ("exposure_ratio",           "Requested Exposure / Annual Turnover",            0.2,  "Requested amount / annual turnover"),

    # -- Liquidity / Banking
    ("buffer_days",              "Working Capital Buffer (days)",                   20.0,  "AMB / daily outflow"),
    ("volatility_index",         "Cash-Flow Volatility Index",                      0.15,  "Coefficient of variation of monthly inflows"),
    ("cheque_bounces_6m",        "Inward Cheque Bounces (6M)",                       0.0,  "Number of bounced inward cheques / ECS in 6M"),

    # -- Credit History / Vintage
    ("vintage_months",           "Operational Vintage (months)",                   36.0,  "Months of continuous business operations"),

    # -- Evidence Quality
    ("avg_doc_confidence",       "Average Document OCR Confidence (0–1)",           0.75,  "Mean confidence score across all submitted documents"),
]

FEATURE_NAMES:        List[str] = [f[0] for f in FEATURE_REGISTRY]
FEATURE_DISPLAY:      Dict[str, str]  = {f[0]: f[1] for f in FEATURE_REGISTRY}
FEATURE_DEFAULTS:     Dict[str, float] = {f[0]: f[2] for f in FEATURE_REGISTRY}
FEATURE_DESCRIPTIONS: Dict[str, str]  = {f[0]: f[3] for f in FEATURE_REGISTRY}


class RiskFeatureEngineer:
    """
    Extracts, normalises, and validates all risk features from available
    evidence and computed financial metrics.
    """

    @staticmethod
    def build_feature_vector(
        app: Dict[str, Any],
        evidence_map: Dict[str, Any],
        cfm: Optional[CashFlowMetrics] = None,
        consistency_report: Optional[ConsistencyReport] = None,
        documents: Optional[List[Dict[str, Any]]] = None,
    ) -> Tuple[Dict[str, float], List[str]]:
        """
        Returns:
            feature_dict: {feature_name: normalised_float_value}
            missing_fields: list of feature names that fell back to defaults
        """
        missing: List[str] = []
        fv: Dict[str, float] = {}

        def get(key: str, fallback: float, *sources: Dict) -> float:
            for src in sources:
                v = src.get(key)
                if v is not None:
                    try:
                        return float(v)
                    except (ValueError, TypeError):
                        pass
            missing.append(key)
            return fallback

        # ── Revenue / Scale ─────────────────────────────────────────────────
        turnover = get(
            "annual_turnover", FEATURE_DEFAULTS["annual_turnover"],
            {"annual_turnover": evidence_map.get("gst_annual_taxable_turnover")
                                or evidence_map.get("gross_income")
                                or app.get("annual_turnover")},
        )
        fv["annual_turnover"] = turnover

        if cfm:
            fv["monthly_inflow"] = cfm.avg_monthly_inflow
            fv["revenue_consistency"] = max(0.0, min(1.0, 1.0 - cfm.volatility_index))
        else:
            fv["monthly_inflow"] = turnover / 12.0
            fv["revenue_consistency"] = FEATURE_DEFAULTS["revenue_consistency"]
            missing.append("monthly_inflow")
            missing.append("revenue_consistency")

        # ── Profitability / Cash Flow ────────────────────────────────────────
        if cfm:
            fv["dscr"]                      = cfm.dscr
            fv["net_monthly_surplus"]       = cfm.net_monthly_surplus
            fv["surplus_after_obligations"] = cfm.surplus_after_obligations
            fv["operating_margin_proxy"]    = (
                cfm.net_monthly_surplus / max(cfm.avg_monthly_inflow, 1.0)
            )
        else:
            fv["dscr"]                      = FEATURE_DEFAULTS["dscr"]
            fv["net_monthly_surplus"]       = FEATURE_DEFAULTS["net_monthly_surplus"]
            fv["surplus_after_obligations"] = FEATURE_DEFAULTS["surplus_after_obligations"]
            fv["operating_margin_proxy"]    = FEATURE_DEFAULTS["operating_margin_proxy"]
            missing.extend(["dscr", "net_monthly_surplus", "surplus_after_obligations", "operating_margin_proxy"])

        # ── Obligations / Leverage ───────────────────────────────────────────
        if cfm:
            fv["debt_service_burden_pct"] = cfm.debt_service_burden_pct
            fv["existing_emi_monthly"]    = cfm.existing_monthly_emi
        else:
            fv["debt_service_burden_pct"] = FEATURE_DEFAULTS["debt_service_burden_pct"]
            fv["existing_emi_monthly"]    = float(
                evidence_map.get("existing_emi_obligations") or
                app.get("existing_obligations_monthly") or
                FEATURE_DEFAULTS["existing_emi_monthly"]
            )
            missing.append("debt_service_burden_pct")

        requested_amount = float(app.get("requested_amount", 1_000_000.0))
        fv["exposure_ratio"] = requested_amount / max(turnover, 1.0)

        # ── Liquidity / Banking ─────────────────────────────────────────────
        if cfm:
            fv["buffer_days"]      = float(cfm.working_capital_buffer_days)
            fv["volatility_index"] = cfm.volatility_index
        else:
            fv["buffer_days"]      = FEATURE_DEFAULTS["buffer_days"]
            fv["volatility_index"] = FEATURE_DEFAULTS["volatility_index"]
            missing.extend(["buffer_days", "volatility_index"])

        fv["cheque_bounces_6m"] = float(
            evidence_map.get("inward_cheque_bounces_6m") or
            app.get("cheque_bounces_6m") or
            0.0
        )

        # ── Credit History / Vintage ─────────────────────────────────────────
        fv["vintage_months"] = float(
            app.get("vintage_months") or
            evidence_map.get("business_vintage_months") or
            FEATURE_DEFAULTS["vintage_months"]
        )

        # ── Evidence Quality ─────────────────────────────────────────────────
        if documents:
            confidences = [
                float(d.get("confidence", 0.75))
                for d in documents
                if d.get("confidence") is not None
            ]
            fv["avg_doc_confidence"] = (
                sum(confidences) / len(confidences)
                if confidences
                else FEATURE_DEFAULTS["avg_doc_confidence"]
            )
        else:
            fv["avg_doc_confidence"] = FEATURE_DEFAULTS["avg_doc_confidence"]

        # ── Clamp all values to reasonable numeric ranges ────────────────────
        fv["dscr"]                      = max(0.0, min(fv["dscr"], 5.0))
        fv["volatility_index"]          = max(0.0, min(fv["volatility_index"], 1.0))
        fv["avg_doc_confidence"]        = max(0.0, min(fv["avg_doc_confidence"], 1.0))
        fv["revenue_consistency"]       = max(0.0, min(fv["revenue_consistency"], 1.0))
        fv["exposure_ratio"]            = max(0.0, min(fv["exposure_ratio"], 3.0))
        fv["debt_service_burden_pct"]   = max(0.0, min(fv["debt_service_burden_pct"], 100.0))
        fv["cheque_bounces_6m"]         = max(0.0, fv["cheque_bounces_6m"])
        fv["vintage_months"]            = max(0.0, fv["vintage_months"])

        # Round all to 4 dp for reproducibility
        fv = {k: round(float(v), 4) for k, v in fv.items()}

        if missing:
            logger.info("Feature fallback used for: %s", missing)

        return fv, list(set(missing))

    @staticmethod
    def to_model_array(fv: Dict[str, float]) -> list:
        """Returns feature values in canonical FEATURE_NAMES order for sklearn."""
        return [fv.get(name, FEATURE_DEFAULTS[name]) for name in FEATURE_NAMES]
