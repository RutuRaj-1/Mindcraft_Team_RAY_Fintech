"""
FinFlow AI — Financial Trust Score Engine (Adapted from Hack2Ignite FT-03)
========================================================================
Enterprise-grade deterministic alternative credit & trust score engine.
Computes a multi-dimensional, explainable Financial Trust Score:
  - 0 – 100 Base Score
  - 300 – 850 CIBIL-Equivalent Scaled Range
  - 0 – 1000 FinFlow Platform Trust Index

Weights Breakdown (Sum = 1.00):
  1. Financial Stability:     25% (0.25)
  2. Cash Flow Health:        20% (0.20)
  3. Revenue Consistency:     15% (0.15)
  4. Repayment Capacity:      15% (0.15)
  5. Expense Discipline:      10% (0.10)
  6. Transaction Behaviour:   10% (0.10)
  7. Fraud / Risk Signals:     5% (0.05)

Fairness & Non-Discrimination:
  Strictly relies on verifiable cash-flow, expense discipline, transaction density,
  and risk telemetry. Never incorporates personal, demographic, or protected attributes.
"""

from collections import defaultdict
from dataclasses import dataclass, field, asdict
from datetime import date, datetime
from decimal import Decimal
import math
from typing import Any, Dict, List, Optional, Sequence, Tuple

from backend.database.firestore_client import db


# Exact 7-Pillar Scoring Weights (must sum to exactly 1.0)
SCORE_WEIGHTS: Dict[str, float] = {
    "financial_stability": 0.25,
    "cash_flow_health": 0.20,
    "revenue_consistency": 0.15,
    "repayment_capacity": 0.15,
    "expense_discipline": 0.10,
    "transaction_behavior": 0.10,
    "fraud_risk": 0.05,
}


@dataclass(frozen=True)
class BusinessCreditFeatures:
    """
    Structured feature vector extracted for credit assessment.
    Deterministic, reproducible, and explainable.
    """
    avg_monthly_revenue: float
    revenue_std: float
    avg_monthly_expense: float
    expense_ratio: float
    net_cash_flow: float
    cash_flow_volatility: float
    transaction_frequency: float  # transactions per active month
    avg_transaction_value: float
    revenue_consistency: float    # 1.0 - CV (clamped [0.0, 1.0])
    fraud_alert_rate: float       # ratio of transactions flagged medium/high risk
    repayment_capacity: float     # net margin ratio (net_cash_flow / revenue)
    positive_cash_flow_months_ratio: float  # fraction of months revenue >= expense
    active_months: int
    total_transactions: int
    total_credits: int
    total_debits: int
    business_age_years: float     # operating vintage in years
    annual_turnover: float        # verified annual turnover in INR


@dataclass
class ScoreFactor:
    """Explainable factor backed by an actual calculated metric."""
    name: str
    description: str
    metric_name: str
    metric_value: str
    impact: str  # "positive" | "negative"


@dataclass
class FinancialTrustScoreResult:
    """Full credit assessment result with multi-scale scores and factor explainability."""
    trust_score: int              # 0 - 100
    cibil_scaled_score: int       # 300 - 850
    finflow_score: int            # 0 - 1000
    risk_band: str                # "LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK"
    components: Dict[str, int]    # 7 sub-scores (0 - 100)
    positive_factors: List[str]
    negative_factors: List[str]
    detailed_factors: List[ScoreFactor] = field(default_factory=list)
    features: Dict[str, Any] = field(default_factory=dict)
    formula_summary: Dict[str, Any] = field(default_factory=dict)


def _to_float(val: Any) -> float:
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, Decimal):
        return float(val)
    try:
        return float(str(val))
    except (ValueError, TypeError):
        return 0.0


def _parse_date(val: Any) -> Optional[date]:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val[:10]).date()
        except ValueError:
            return None
    return None


def extract_credit_features(
    transactions: Sequence[Any],
    fraud_alerts: Optional[Sequence[Any]] = None,
    business: Optional[Any] = None,
) -> BusinessCreditFeatures:
    """
    Deterministically computes the feature set required for the Financial Trust Score.
    Works seamlessly with dicts, dataclasses, or Firestore document models.
    """
    tx_list = list(transactions) if transactions else []
    alert_list = list(fraud_alerts) if fraud_alerts else []

    business_age_years = 0.0
    annual_turnover = 0.0
    if business is not None:
        if isinstance(business, dict):
            business_age_years = _to_float(
                business.get("business_age_years")
                or business.get("business_age")
                or (business.get("vintage_months", 0) / 12.0)
            )
            annual_turnover = _to_float(
                business.get("annual_turnover")
                or business.get("turnover")
                or business.get("annual_revenue", 0)
            )
        else:
            business_age_years = _to_float(
                getattr(business, "business_age_years", None)
                or getattr(business, "business_age", None)
                or (getattr(business, "vintage_months", 0) / 12.0)
            )
            annual_turnover = _to_float(
                getattr(business, "annual_turnover", None)
                or getattr(business, "turnover", None)
                or getattr(business, "annual_revenue", 0)
            )

    if not tx_list:
        return BusinessCreditFeatures(
            avg_monthly_revenue=0.0,
            revenue_std=0.0,
            avg_monthly_expense=0.0,
            expense_ratio=0.0,
            net_cash_flow=0.0,
            cash_flow_volatility=0.0,
            transaction_frequency=0.0,
            avg_transaction_value=0.0,
            revenue_consistency=0.0,
            fraud_alert_rate=0.0,
            repayment_capacity=0.0,
            positive_cash_flow_months_ratio=0.0,
            active_months=0,
            total_transactions=0,
            total_credits=0,
            total_debits=0,
            business_age_years=business_age_years,
            annual_turnover=annual_turnover,
        )

    monthly_rev: Dict[str, float] = defaultdict(float)
    monthly_exp: Dict[str, float] = defaultdict(float)
    amounts: List[float] = []

    total_credits = 0
    total_debits = 0
    total_revenue = 0.0
    total_expenses = 0.0

    for tx in tx_list:
        if isinstance(tx, dict):
            amt = _to_float(tx.get("amount", 0))
            tx_type = str(tx.get("transaction_type") or tx.get("type", "")).lower()
            tx_date = _parse_date(tx.get("transaction_date") or tx.get("date") or tx.get("timestamp"))
        else:
            amt = _to_float(getattr(tx, "amount", 0))
            tx_type = str(getattr(tx, "transaction_type", None) or getattr(tx, "type", "")).lower()
            tx_date = _parse_date(
                getattr(tx, "transaction_date", None)
                or getattr(tx, "date", None)
                or getattr(tx, "timestamp", None)
            )

        month_key = tx_date.strftime("%Y-%m") if tx_date else "all"
        amounts.append(amt)

        if tx_type in ("credit", "inflow", "deposit"):
            monthly_rev[month_key] += amt
            total_revenue += amt
            total_credits += 1
        elif tx_type in ("debit", "outflow", "withdrawal"):
            monthly_exp[month_key] += amt
            total_expenses += amt
            total_debits += 1
        else:
            # If unspecified, positive amounts are treated as credits
            if amt >= 0:
                monthly_rev[month_key] += amt
                total_revenue += amt
                total_credits += 1
            else:
                pos_amt = abs(amt)
                monthly_exp[month_key] += pos_amt
                total_expenses += pos_amt
                total_debits += 1

    all_months = sorted(set(monthly_rev.keys()) | set(monthly_exp.keys()))
    n_months = max(len(all_months), 1)

    avg_monthly_revenue = total_revenue / n_months
    avg_monthly_expense = total_expenses / n_months
    net_cash_flow = avg_monthly_revenue - avg_monthly_expense

    # Expense ratio
    if avg_monthly_revenue > 0:
        expense_ratio = avg_monthly_expense / avg_monthly_revenue
    elif avg_monthly_expense > 0:
        expense_ratio = 2.0
    else:
        expense_ratio = 0.0

    # Average transaction value
    avg_transaction_value = sum(amounts) / len(amounts) if amounts else 0.0

    # Revenue consistency & standard deviation
    rev_vals = [monthly_rev[m] for m in all_months]
    if len(rev_vals) > 1:
        rev_mean = sum(rev_vals) / len(rev_vals)
        rev_var = sum((x - rev_mean) ** 2 for x in rev_vals) / len(rev_vals)
        revenue_std = math.sqrt(rev_var)
        cv = (revenue_std / rev_mean) if rev_mean > 0 else 1.0
        revenue_consistency = max(0.0, min(1.0, 1.0 - min(cv, 1.0)))
    else:
        revenue_std = 0.0
        revenue_consistency = 0.8 if avg_monthly_revenue > 0 else 0.0

    # Cash-flow volatility
    net_vals = [monthly_rev[m] - monthly_exp[m] for m in all_months]
    if len(net_vals) > 1:
        net_mean = sum(net_vals) / len(net_vals)
        net_var = sum((x - net_mean) ** 2 for x in net_vals) / len(net_vals)
        cash_flow_volatility = math.sqrt(net_var)
    else:
        cash_flow_volatility = 0.0

    # Positive cash flow months ratio
    pos_months = sum(1 for m in all_months if monthly_rev[m] >= monthly_exp[m])
    positive_cash_flow_months_ratio = pos_months / n_months

    # Transaction frequency
    transaction_frequency = len(tx_list) / n_months

    # Repayment capacity
    if avg_monthly_revenue > 0:
        raw_margin = net_cash_flow / avg_monthly_revenue
        repayment_capacity = max(-1.0, min(1.0, raw_margin))
    else:
        repayment_capacity = -1.0 if avg_monthly_expense > 0 else 0.0

    # Fraud alert rate
    fraud_alert_rate = 0.0
    if alert_list:
        flagged_count = 0
        for alert in alert_list:
            if isinstance(alert, dict):
                level = str(alert.get("risk_level") or alert.get("severity", "")).upper()
                score = _to_float(alert.get("risk_score") or alert.get("score", 0))
            else:
                level = str(getattr(alert, "risk_level", None) or getattr(alert, "severity", "")).upper()
                score = _to_float(getattr(alert, "risk_score", None) or getattr(alert, "score", 0))

            if level in ("HIGH", "MEDIUM", "CRITICAL") or score >= 40:
                flagged_count += 1
        fraud_alert_rate = min(1.0, flagged_count / max(len(tx_list), len(alert_list), 1))

    return BusinessCreditFeatures(
        avg_monthly_revenue=round(avg_monthly_revenue, 2),
        revenue_std=round(revenue_std, 2),
        avg_monthly_expense=round(avg_monthly_expense, 2),
        expense_ratio=round(expense_ratio, 4),
        net_cash_flow=round(net_cash_flow, 2),
        cash_flow_volatility=round(cash_flow_volatility, 2),
        transaction_frequency=round(transaction_frequency, 2),
        avg_transaction_value=round(avg_transaction_value, 2),
        revenue_consistency=round(revenue_consistency, 4),
        fraud_alert_rate=round(fraud_alert_rate, 4),
        repayment_capacity=round(repayment_capacity, 4),
        positive_cash_flow_months_ratio=round(positive_cash_flow_months_ratio, 4),
        active_months=n_months,
        total_transactions=len(tx_list),
        total_credits=total_credits,
        total_debits=total_debits,
        business_age_years=business_age_years,
        annual_turnover=annual_turnover,
    )


class FinancialTrustScoreEngine:
    """
    Complete Financial Trust Score engine calculating sub-scores,
    weighted aggregates, CIBIL/FinFlow scaled indices, and explainability.
    """

    def calculate_sub_scores(self, f: BusinessCreditFeatures) -> Dict[str, int]:
        """
        Calculates 7 individual sub-scores (0-100) from engineered features.
        """
        # ── 1. Financial Stability (25% weight) ──────────────────────────────
        stab_score = 0
        if f.business_age_years >= 5:
            stab_score += 35
        elif f.business_age_years >= 3:
            stab_score += 28
        elif f.business_age_years >= 1:
            stab_score += 20
        elif f.business_age_years > 0:
            stab_score += 12
        else:
            stab_score += 5

        if f.active_months >= 6:
            stab_score += 35
        elif f.active_months >= 3:
            stab_score += 25
        elif f.active_months >= 1 and f.total_transactions > 0:
            stab_score += 15
        else:
            stab_score += 0

        if f.avg_monthly_revenue >= 100_000:
            stab_score += 30
        elif f.avg_monthly_revenue >= 30_000:
            stab_score += 24
        elif f.avg_monthly_revenue > 0:
            stab_score += 16
        else:
            stab_score += 0

        financial_stability = max(0, min(100, stab_score))

        # ── 2. Cash Flow Health (20% weight) ─────────────────────────────────
        if f.avg_monthly_revenue == 0 and f.avg_monthly_expense == 0:
            cash_flow_health = 0
        elif f.net_cash_flow < 0:
            deficit_ratio = abs(f.net_cash_flow) / max(f.avg_monthly_revenue, 1.0)
            base_deficit = max(0, int(35 - min(35, deficit_ratio * 25)))
            cash_flow_health = base_deficit
        else:
            cf_base = 50
            volume_bonus = min(25, int((f.net_cash_flow / 50_000) * 15))
            reliability_bonus = int(f.positive_cash_flow_months_ratio * 25)
            vol_penalty = 0
            if f.net_cash_flow > 0 and f.cash_flow_volatility > (f.net_cash_flow * 1.5):
                vol_penalty = min(15, int((f.cash_flow_volatility / f.net_cash_flow) * 5))
            cash_flow_health = max(0, min(100, cf_base + volume_bonus + reliability_bonus - vol_penalty))

        # ── 3. Revenue Consistency (15% weight) ──────────────────────────────
        if f.avg_monthly_revenue == 0:
            revenue_consistency = 0
        elif f.active_months == 1:
            revenue_consistency = 70
        else:
            rev_c = int(f.revenue_consistency * 100)
            revenue_consistency = max(0, min(100, rev_c))

        # ── 4. Repayment Capacity (15% weight) ───────────────────────────────
        if f.avg_monthly_revenue == 0:
            repayment_capacity = 0
        elif f.repayment_capacity >= 0.30:
            repayment_capacity = min(100, 85 + int((f.repayment_capacity - 0.30) * 50))
        elif f.repayment_capacity >= 0.15:
            repayment_capacity = int(70 + ((f.repayment_capacity - 0.15) / 0.15) * 15)
        elif f.repayment_capacity >= 0.05:
            repayment_capacity = int(50 + ((f.repayment_capacity - 0.05) / 0.10) * 20)
        elif f.repayment_capacity >= 0.0:
            repayment_capacity = int(35 + (f.repayment_capacity / 0.05) * 15)
        else:
            deficit_depth = abs(f.repayment_capacity)
            repayment_capacity = max(0, int(30 - min(30, deficit_depth * 60)))

        repayment_capacity = max(0, min(100, repayment_capacity))

        # ── 5. Expense Discipline (10% weight) ───────────────────────────────
        if f.avg_monthly_revenue == 0:
            expense_discipline = 0 if f.avg_monthly_expense > 0 else 10
        elif f.expense_ratio <= 0.65:
            expense_discipline = 95
        elif f.expense_ratio <= 0.80:
            expense_discipline = int(94 - ((f.expense_ratio - 0.65) / 0.15) * 14)
        elif f.expense_ratio <= 0.95:
            expense_discipline = int(79 - ((f.expense_ratio - 0.80) / 0.15) * 19)
        elif f.expense_ratio <= 1.05:
            expense_discipline = int(59 - ((f.expense_ratio - 0.95) / 0.10) * 29)
        else:
            expense_discipline = max(0, int(25 - min(25, (f.expense_ratio - 1.05) * 20)))

        expense_discipline = max(0, min(100, expense_discipline))

        # ── 6. Transaction Behaviour (10% weight) ────────────────────────────
        if f.total_transactions == 0:
            transaction_behavior = 0
        else:
            tx_score = 0
            if f.transaction_frequency >= 20:
                tx_score += 45
            elif f.transaction_frequency >= 10:
                tx_score += 38
            elif f.transaction_frequency >= 5:
                tx_score += 28
            else:
                tx_score += 15

            if f.total_credits > 0 and f.total_debits > 0:
                tx_score += 35
            elif f.total_credits > 0 or f.total_debits > 0:
                tx_score += 18

            if f.avg_transaction_value >= 500:
                tx_score += 20
            elif f.avg_transaction_value > 0:
                tx_score += 12

            transaction_behavior = max(0, min(100, tx_score))

        # ── 7. Fraud / Risk Signals (5% weight) ──────────────────────────────
        if f.total_transactions == 0:
            fraud_risk = 50
        elif f.fraud_alert_rate == 0.0:
            fraud_risk = 98
        elif f.fraud_alert_rate <= 0.05:
            fraud_risk = 82
        elif f.fraud_alert_rate <= 0.15:
            fraud_risk = 60
        elif f.fraud_alert_rate <= 0.30:
            fraud_risk = 35
        else:
            fraud_risk = max(5, int(25 - (f.fraud_alert_rate - 0.30) * 30))

        fraud_risk = max(0, min(100, fraud_risk))

        return {
            "financial_stability": financial_stability,
            "cash_flow_health": cash_flow_health,
            "revenue_consistency": revenue_consistency,
            "repayment_capacity": repayment_capacity,
            "expense_discipline": expense_discipline,
            "transaction_behavior": transaction_behavior,
            "fraud_risk": fraud_risk,
        }

    def calculate_trust_score(self, components: Dict[str, int]) -> int:
        """
        Computes weighted total Financial Trust Score (0-100).
        """
        weighted_sum = sum(
            components[key] * SCORE_WEIGHTS[key]
            for key in SCORE_WEIGHTS
        )
        return max(0, min(100, int(round(weighted_sum))))

    @staticmethod
    def to_cibil_scale(trust_score_100: int, fraud_penalty: int = 0) -> int:
        """
        Scales a 0-100 score to the standard 300 - 850 CIBIL-comparable bureau range:
          Score = 300 + 5.5 * TrustScore_100 - FraudPenalty
        """
        raw_cibil = 300 + int(round(5.5 * trust_score_100)) - fraud_penalty
        return max(300, min(850, raw_cibil))

    @staticmethod
    def to_finflow_scale(trust_score_100: int) -> int:
        """
        Scales a 0-100 score to the FinFlow 0 - 1000 Institutional Trust Index:
          Score = TrustScore_100 * 10
        """
        return max(0, min(1000, trust_score_100 * 10))

    @staticmethod
    def get_risk_band(trust_score_100: int) -> str:
        """Categorizes score into enterprise risk tiers."""
        if trust_score_100 >= 75:
            return "LOW_RISK"
        elif trust_score_100 >= 50:
            return "MEDIUM_RISK"
        return "HIGH_RISK"

    def generate_explainability(
        self, f: BusinessCreditFeatures, components: Dict[str, int]
    ) -> Tuple[List[str], List[str], List[ScoreFactor]]:
        """
        Generates deterministic, metric-backed positive and negative factors.
        """
        positive: List[str] = []
        negative: List[str] = []
        detailed: List[ScoreFactor] = []

        # ── Positive Factors ──
        if f.net_cash_flow > 0:
            msg = f"Positive Net Cash Flow averaging +₹{f.net_cash_flow:,.0f}/month across {f.active_months} active month(s)"
            positive.append(msg)
            detailed.append(
                ScoreFactor(
                    name="Positive Net Cash Flow",
                    description=msg,
                    metric_name="net_cash_flow",
                    metric_value=f"+₹{f.net_cash_flow:,.2f}",
                    impact="positive",
                )
            )

        if f.revenue_consistency >= 0.65 and f.avg_monthly_revenue > 0:
            msg = f"Stable Revenue Inflows (Consistency index: {f.revenue_consistency:.0%}, std dev: ₹{f.revenue_std:,.0f})"
            positive.append(msg)
            detailed.append(
                ScoreFactor(
                    name="Consistent Revenue",
                    description=msg,
                    metric_name="revenue_consistency",
                    metric_value=f"{f.revenue_consistency:.1%}",
                    impact="positive",
                )
            )

        if f.expense_ratio <= 0.80 and f.avg_monthly_revenue > 0:
            msg = f"Disciplined Operating Overhead ({f.expense_ratio:.1%} of monthly revenue spent on operational expenses)"
            positive.append(msg)
            detailed.append(
                ScoreFactor(
                    name="Controlled Operating Expenses",
                    description=msg,
                    metric_name="expense_ratio",
                    metric_value=f"{f.expense_ratio:.1%}",
                    impact="positive",
                )
            )

        if f.repayment_capacity >= 0.15:
            msg = f"Healthy Repayment Buffer ({f.repayment_capacity:.1%} net surplus margin available for debt servicing)"
            positive.append(msg)
            detailed.append(
                ScoreFactor(
                    name="Solid Repayment Capacity",
                    description=msg,
                    metric_name="repayment_capacity",
                    metric_value=f"{f.repayment_capacity:.1%}",
                    impact="positive",
                )
            )

        if f.fraud_alert_rate == 0.0 and f.total_transactions > 0:
            msg = f"Pristine Risk Telemetry (0 anomaly flags across {f.total_transactions} analyzed transactions)"
            positive.append(msg)
            detailed.append(
                ScoreFactor(
                    name="Low Fraud Risk",
                    description=msg,
                    metric_name="fraud_alert_rate",
                    metric_value="0.0%",
                    impact="positive",
                )
            )

        if f.business_age_years >= 2.0:
            msg = f"Established Operational Track Record ({f.business_age_years:.1f} years in active business)"
            positive.append(msg)
            detailed.append(
                ScoreFactor(
                    name="Business Longevity",
                    description=msg,
                    metric_name="business_age_years",
                    metric_value=f"{f.business_age_years:.1f} yrs",
                    impact="positive",
                )
            )

        if f.transaction_frequency >= 10.0:
            msg = f"Active Digital Transaction Velocity ({f.transaction_frequency:.1f} transactions/month)"
            positive.append(msg)
            detailed.append(
                ScoreFactor(
                    name="Active Commerce Circulation",
                    description=msg,
                    metric_name="transaction_frequency",
                    metric_value=f"{f.transaction_frequency:.1f} tx/mo",
                    impact="positive",
                )
            )

        # ── Negative Factors ──
        if f.net_cash_flow < 0:
            msg = f"Operating Cash Flow Deficit (-₹{abs(f.net_cash_flow):,.0f}/month net outflow)"
            negative.append(msg)
            detailed.append(
                ScoreFactor(
                    name="Negative Net Cash Flow",
                    description=msg,
                    metric_name="net_cash_flow",
                    metric_value=f"-₹{abs(f.net_cash_flow):,.2f}",
                    impact="negative",
                )
            )

        if f.expense_ratio > 0.85 and f.avg_monthly_revenue > 0:
            msg = f"High Expense Burden ({f.expense_ratio:.1%} of monthly turnover consumed by operational outflows)"
            negative.append(msg)
            detailed.append(
                ScoreFactor(
                    name="High Expense Ratio",
                    description=msg,
                    metric_name="expense_ratio",
                    metric_value=f"{f.expense_ratio:.1%}",
                    impact="negative",
                )
            )

        if f.revenue_consistency < 0.50 and f.avg_monthly_revenue > 0 and f.active_months > 1:
            msg = f"Revenue Volatility Detected (Standard deviation of ₹{f.revenue_std:,.0f} across active periods)"
            negative.append(msg)
            detailed.append(
                ScoreFactor(
                    name="Revenue Volatility",
                    description=msg,
                    metric_name="revenue_std",
                    metric_value=f"₹{f.revenue_std:,.2f}",
                    impact="negative",
                )
            )

        if f.fraud_alert_rate > 0.0:
            msg = f"Anomaly / Fraud Signals Detected ({f.fraud_alert_rate:.1%} of transactions flagged by risk engine)"
            negative.append(msg)
            detailed.append(
                ScoreFactor(
                    name="Elevated Fraud Alert Rate",
                    description=msg,
                    metric_name="fraud_alert_rate",
                    metric_value=f"{f.fraud_alert_rate:.1%}",
                    impact="negative",
                )
            )

        if f.repayment_capacity < 0.10 and f.avg_monthly_revenue > 0:
            msg = f"Constrained Surplus Cushion ({f.repayment_capacity:.1%} net surplus leaves narrow repayment room)"
            negative.append(msg)
            detailed.append(
                ScoreFactor(
                    name="Low Repayment Capacity",
                    description=msg,
                    metric_name="repayment_capacity",
                    metric_value=f"{f.repayment_capacity:.1%}",
                    impact="negative",
                )
            )

        if f.active_months < 2 and f.total_transactions > 0:
            msg = f"Limited History Depth (Only {f.active_months} active month(s) of transaction data recorded)"
            negative.append(msg)
            detailed.append(
                ScoreFactor(
                    name="Limited Transaction History",
                    description=msg,
                    metric_name="active_months",
                    metric_value=f"{f.active_months} mo",
                    impact="negative",
                )
            )

        if f.total_transactions == 0:
            msg = "No Banking Transactions recorded in ledger"
            negative.append(msg)
            detailed.append(
                ScoreFactor(
                    name="Zero Transaction Data",
                    description=msg,
                    metric_name="total_transactions",
                    metric_value="0",
                    impact="negative",
                )
            )

        return positive, negative, detailed

    def score(self, features: BusinessCreditFeatures) -> FinancialTrustScoreResult:
        """
        Runs the full assessment pipeline deterministically.
        """
        components = self.calculate_sub_scores(features)
        trust_score = self.calculate_trust_score(components)
        cibil_score = self.to_cibil_scale(trust_score)
        finflow_score = self.to_finflow_scale(trust_score)
        risk_band = self.get_risk_band(trust_score)

        positive_factors, negative_factors, detailed_factors = self.generate_explainability(
            features, components
        )

        features_dict = {
            "avg_monthly_revenue": features.avg_monthly_revenue,
            "avg_monthly_expense": features.avg_monthly_expense,
            "net_cash_flow": features.net_cash_flow,
            "expense_ratio": features.expense_ratio,
            "revenue_std": features.revenue_std,
            "cash_flow_volatility": features.cash_flow_volatility,
            "transaction_frequency": features.transaction_frequency,
            "avg_transaction_value": features.avg_transaction_value,
            "revenue_consistency": features.revenue_consistency,
            "fraud_alert_rate": features.fraud_alert_rate,
            "repayment_capacity": features.repayment_capacity,
            "positive_cash_flow_months_ratio": features.positive_cash_flow_months_ratio,
            "active_months": features.active_months,
            "total_transactions": features.total_transactions,
            "total_credits": features.total_credits,
            "total_debits": features.total_debits,
            "business_age_years": features.business_age_years,
            "annual_turnover": features.annual_turnover,
        }

        formula_summary = {
            "base_formula": "TrustScore_100 = Sum(SubScore_k * Weight_k)",
            "weights": SCORE_WEIGHTS,
            "cibil_scaled_formula": "Score_300_850 = 300 + 5.5 * TrustScore_100",
            "finflow_scaled_formula": "FinFlow_Index_1000 = TrustScore_100 * 10",
        }

        return FinancialTrustScoreResult(
            trust_score=trust_score,
            cibil_scaled_score=cibil_score,
            finflow_score=finflow_score,
            risk_band=risk_band,
            components=components,
            positive_factors=positive_factors,
            negative_factors=negative_factors,
            detailed_factors=detailed_factors,
            features=features_dict,
            formula_summary=formula_summary,
        )

    @classmethod
    def evaluate_for_application(cls, application_id: str) -> FinancialTrustScoreResult:
        """
        Evaluates the Financial Trust Score for an application by gathering
        evidence records, snapshots, and application metadata from the store.
        """
        engine = cls()

        app = db.get("applications", application_id) or {}
        snapshot = db.get("financial_snapshots", application_id) or {}
        evidence_items = db.list("evidence_items", {"application_id": application_id})
        fraud_signals = db.list("fraud_signals", {"application_id": application_id})

        # Synthesize business metadata
        biz_info = {
            "business_age_years": (
                app.get("vintage_months", 36) / 12.0
                if app.get("vintage_months")
                else 3.0
            ),
            "annual_turnover": (
                app.get("annual_turnover")
                or snapshot.get("annual_turnover")
                or 1_200_000.0
            ),
        }

        # Build transaction feed from evidence or monthly breakdown
        transactions: List[Dict[str, Any]] = []
        monthly_breakdown = snapshot.get("monthly_breakdown") or []

        if monthly_breakdown:
            for item in monthly_breakdown:
                m_label = item.get("month", "2026-01")
                # Format to YYYY-MM
                try:
                    d_obj = datetime.strptime(m_label, "%b %y")
                    m_str = d_obj.strftime("%Y-%m-15")
                except Exception:
                    m_str = "2026-01-15"

                inflow = _to_float(item.get("inflow", 0))
                outflow = _to_float(item.get("outflow", 0))

                if inflow > 0:
                    transactions.append({
                        "amount": inflow,
                        "transaction_type": "credit",
                        "date": m_str,
                    })
                if outflow > 0:
                    transactions.append({
                        "amount": outflow,
                        "transaction_type": "debit",
                        "date": m_str,
                    })
        elif evidence_items:
            for ev in evidence_items:
                extracted = ev.get("extracted_data") or {}
                if "credits" in extracted:
                    transactions.append({
                        "amount": _to_float(extracted.get("credits", 0)),
                        "transaction_type": "credit",
                        "date": ev.get("created_at", "2026-01-15"),
                    })
                if "debits" in extracted:
                    transactions.append({
                        "amount": _to_float(extracted.get("debits", 0)),
                        "transaction_type": "debit",
                        "date": ev.get("created_at", "2026-01-15"),
                    })

        # Default synthetic baseline if no transactions are yet ingested
        if not transactions:
            turnover = biz_info["annual_turnover"]
            monthly_inflow = turnover / 12.0
            monthly_outflow = monthly_inflow * 0.70  # healthy 70% expense ratio
            for m in range(1, 7):
                date_str = f"2026-0{m}-10" if m < 10 else f"2026-{m}-10"
                transactions.append({"amount": monthly_inflow, "transaction_type": "credit", "date": date_str})
                transactions.append({"amount": monthly_outflow, "transaction_type": "debit", "date": date_str})

        features = extract_credit_features(
            transactions=transactions,
            fraud_alerts=fraud_signals,
            business=biz_info,
        )

        return engine.score(features)
