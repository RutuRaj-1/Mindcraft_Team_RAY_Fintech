"""
CashFlowEngine — Module 7 Cash-Flow Intelligence Core
======================================================
Produces rich, explainable cash-flow metrics from bank statement evidence.
Design principles:
  - Every number shown in the UI carries a plain-language explanation.
  - Anomalies describe *patterns*, not intent — never label a discrepancy as fraud.
  - All thresholds are configurable via THRESHOLDS dict.
  - Works deterministically with synthetic seed data when real data is unavailable.
"""

import math
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

import numpy as np

from backend.database.models import (
    CashFlowMetrics,
    MonthlyCashFlow,
    CashFlowAnomalyRecord,
    HealthIndicator,
)
from backend.database.firestore_client import db

logger = logging.getLogger(__name__)

# ── Configurable Policy Thresholds ─────────────────────────────────────────────
THRESHOLDS = {
    "dscr_healthy":         1.5,
    "dscr_adequate":        1.2,
    "dscr_stressed":        1.0,
    "volatility_low":       0.10,
    "volatility_moderate":  0.20,
    "debt_burden_healthy":  0.30,   # 30 % of inflow
    "debt_burden_stressed": 0.45,   # 45 % of inflow
    "buffer_days_healthy":  30,
    "buffer_days_stressed": 14,
    "default_interest_rate": 0.12,  # 12 % annual
    "inflow_spike_factor":  1.40,   # >140 % of avg = spike
    "outflow_spike_factor": 1.35,   # >135 % of avg = spike
}

MONTH_LABELS = ["Nov 25", "Dec 25", "Jan 26", "Feb 26", "Mar 26", "Apr 26"]


class FinancialMetricsService:
    """
    Provides contextual metadata (status labels, explanations, benchmarks)
    for raw metric values.  Used by both the CashFlowEngine and the
    risk engine to add plain-language context to every number.
    """

    @staticmethod
    def dscr_status(dscr: float) -> tuple[str, str, str]:
        """Returns (status, explanation, benchmark) for a DSCR value."""
        benchmark = "Policy minimum: 1.2x  |  Healthy: ≥1.5x"
        if dscr >= THRESHOLDS["dscr_healthy"]:
            return (
                "HEALTHY",
                f"Operating surplus is {dscr:.2f}x the annual debt service — well above the policy minimum of 1.2x, indicating strong repayment capacity.",
                benchmark,
            )
        if dscr >= THRESHOLDS["dscr_adequate"]:
            return (
                "ADEQUATE",
                f"DSCR of {dscr:.2f}x meets the policy minimum of 1.2x. Repayment capacity exists but leaves limited headroom for adverse cash-flow months.",
                benchmark,
            )
        if dscr >= THRESHOLDS["dscr_stressed"]:
            return (
                "STRESSED",
                f"DSCR of {dscr:.2f}x is below the healthy threshold (1.5x) and approaching the policy floor of 1.2x. Cash-flow requires careful monitoring.",
                benchmark,
            )
        return (
            "CRITICAL",
            f"DSCR of {dscr:.2f}x is below the policy minimum of 1.2x. Operating surplus may be insufficient to service proposed debt obligations consistently.",
            benchmark,
        )

    @staticmethod
    def volatility_status(vi: float) -> tuple[str, str, str]:
        benchmark = "Low: <10%  |  Moderate: 10–20%  |  High: >20%"
        if vi <= THRESHOLDS["volatility_low"]:
            return (
                "HEALTHY",
                f"Monthly inflows are highly consistent (coefficient of variation: {vi*100:.1f}%). Predictable revenue patterns reduce repayment risk.",
                benchmark,
            )
        if vi <= THRESHOLDS["volatility_moderate"]:
            return (
                "ADEQUATE",
                f"Moderate inflow variability ({vi*100:.1f}% CV). Seasonal patterns are visible but within acceptable risk bounds.",
                benchmark,
            )
        return (
            "STRESSED",
            f"High inflow variability ({vi*100:.1f}% CV). Erratic revenue patterns increase the risk of missed repayments in lean months.",
            benchmark,
        )

    @staticmethod
    def debt_burden_status(burden_pct: float) -> tuple[str, str, str]:
        benchmark = "Healthy: <30%  |  Stressed: >45% of monthly inflow"
        if burden_pct <= THRESHOLDS["debt_burden_healthy"] * 100:
            return (
                "HEALTHY",
                f"Total debt obligations consume {burden_pct:.1f}% of average monthly inflow — within the healthy range of under 30%.",
                benchmark,
            )
        if burden_pct <= THRESHOLDS["debt_burden_stressed"] * 100:
            return (
                "ADEQUATE",
                f"Obligations at {burden_pct:.1f}% of monthly inflow. Approaching the stressed threshold of 45%; limited buffer if inflows decline.",
                benchmark,
            )
        return (
            "STRESSED",
            f"Obligations consume {burden_pct:.1f}% of monthly inflow — above the 45% stressed threshold. Surplus after obligations is critically low.",
            benchmark,
        )

    @staticmethod
    def buffer_status(days: int) -> tuple[str, str, str]:
        benchmark = "Healthy: ≥30 days  |  Stressed: <14 days"
        if days >= THRESHOLDS["buffer_days_healthy"]:
            return (
                "HEALTHY",
                f"Current cash reserves cover {days} days of operating expenses — a healthy liquidity buffer for near-term obligations.",
                benchmark,
            )
        if days >= THRESHOLDS["buffer_days_stressed"]:
            return (
                "ADEQUATE",
                f"Cash buffer of {days} days provides moderate short-term coverage. Recommend building reserves to ≥30 days.",
                benchmark,
            )
        return (
            "STRESSED",
            f"Only {days} days of operating expense coverage. A single delayed payment or demand slowdown could create immediate liquidity stress.",
            benchmark,
        )


class CashFlowEngine:
    """
    Calculates comprehensive cash-flow intelligence for a given application.
    Pulls financial evidence from the evidence ledger and application record;
    falls back to calibrated synthetic data when real data is unavailable.
    """

    @staticmethod
    def _compute_proposed_emi(principal: float, tenor_months: int, annual_rate: float = None) -> float:
        r = (annual_rate or THRESHOLDS["default_interest_rate"]) / 12.0
        n = max(tenor_months, 1)
        if r == 0:
            return principal / n
        return (principal * r * ((1 + r) ** n)) / (((1 + r) ** n) - 1)

    @staticmethod
    def _detect_anomalies(
        monthly_trend: List[MonthlyCashFlow],
        avg_inflow: float,
        avg_outflow: float,
    ) -> List[CashFlowAnomalyRecord]:
        anomalies: List[CashFlowAnomalyRecord] = []
        spike_in = THRESHOLDS["inflow_spike_factor"]
        spike_out = THRESHOLDS["outflow_spike_factor"]

        for item in monthly_trend:
            # Inflow spike
            if avg_inflow > 0 and item.inflow > avg_inflow * spike_in:
                anomalies.append(CashFlowAnomalyRecord(
                    anomaly_id=f"anom_{uuid.uuid4().hex[:8]}",
                    anomaly_type="IRREGULAR_INFLOW",
                    severity="INFO",
                    month_affected=item.month,
                    description=(
                        f"Inflow in {item.month} (₹{item.inflow:,.0f}) is "
                        f"{(item.inflow/avg_inflow - 1)*100:.0f}% above the 6-month average. "
                        "This could reflect a seasonal order, one-time receipt, or irregular credit."
                    ),
                    value_observed=item.inflow,
                    expected_range=f"₹{avg_inflow*0.85:,.0f} – ₹{avg_inflow*1.15:,.0f}",
                ))
            # Outflow spike
            if avg_outflow > 0 and item.outflow > avg_outflow * spike_out:
                anomalies.append(CashFlowAnomalyRecord(
                    anomaly_id=f"anom_{uuid.uuid4().hex[:8]}",
                    anomaly_type="HIGH_OUTFLOW_SPIKE",
                    severity="WARNING",
                    month_affected=item.month,
                    description=(
                        f"Outflow in {item.month} (₹{item.outflow:,.0f}) is "
                        f"{(item.outflow/avg_outflow - 1)*100:.0f}% above the 6-month average. "
                        "Possible causes: bulk supplier payment, advance tax, or non-recurring expense."
                    ),
                    value_observed=item.outflow,
                    expected_range=f"₹{avg_outflow*0.85:,.0f} – ₹{avg_outflow*1.15:,.0f}",
                ))
            # Negative net flow
            if item.net_flow < 0:
                anomalies.append(CashFlowAnomalyRecord(
                    anomaly_id=f"anom_{uuid.uuid4().hex[:8]}",
                    anomaly_type="NEGATIVE_NET_FLOW",
                    severity="WARNING",
                    month_affected=item.month,
                    description=(
                        f"Net cash flow in {item.month} was negative (₹{item.net_flow:,.0f}). "
                        "Outflows exceeded inflows this month. If recurring, this may indicate "
                        "working capital stress."
                    ),
                    value_observed=item.net_flow,
                    expected_range="≥ ₹0 (positive net flow recommended)",
                ))

        return anomalies

    @staticmethod
    def _build_health_indicators(
        dscr: float,
        volatility_index: float,
        debt_burden_pct: float,
        buffer_days: int,
        surplus: float,
        existing_emi: float,
        proposed_emi: float,
    ) -> List[HealthIndicator]:
        svc = FinancialMetricsService
        indicators: List[HealthIndicator] = []

        # 1. DSCR
        d_status, d_exp, d_bench = svc.dscr_status(dscr)
        indicators.append(HealthIndicator(
            indicator_id="hi_dscr",
            label="Debt Service Coverage",
            metric_name="dscr",
            value=round(dscr, 2),
            unit="x",
            status=d_status,
            explanation=d_exp,
            benchmark=d_bench,
        ))

        # 2. Inflow Volatility
        v_status, v_exp, v_bench = svc.volatility_status(volatility_index)
        indicators.append(HealthIndicator(
            indicator_id="hi_volatility",
            label="Inflow Consistency",
            metric_name="volatility_index",
            value=round(volatility_index * 100, 1),
            unit="%",
            status=v_status,
            explanation=v_exp,
            benchmark=v_bench,
        ))

        # 3. Debt Burden
        b_status, b_exp, b_bench = svc.debt_burden_status(debt_burden_pct)
        indicators.append(HealthIndicator(
            indicator_id="hi_debt_burden",
            label="Obligation-to-Inflow Ratio",
            metric_name="debt_service_burden_pct",
            value=round(debt_burden_pct, 1),
            unit="%",
            status=b_status,
            explanation=b_exp,
            benchmark=b_bench,
        ))

        # 4. Liquidity Buffer
        buf_status, buf_exp, buf_bench = svc.buffer_status(buffer_days)
        indicators.append(HealthIndicator(
            indicator_id="hi_buffer",
            label="Liquidity Buffer",
            metric_name="working_capital_buffer_days",
            value=float(buffer_days),
            unit="days",
            status=buf_status,
            explanation=buf_exp,
            benchmark=buf_bench,
        ))

        # 5. Surplus after obligations
        surplus_status = "HEALTHY" if surplus > 0 else "CRITICAL"
        indicators.append(HealthIndicator(
            indicator_id="hi_surplus",
            label="Post-Obligation Monthly Surplus",
            metric_name="surplus_after_obligations",
            value=round(surplus, 2),
            unit="₹",
            status=surplus_status,
            explanation=(
                f"After paying existing EMIs (₹{existing_emi:,.0f}/mo) and the "
                f"proposed facility EMI (₹{proposed_emi:,.0f}/mo), the estimated monthly "
                f"surplus is ₹{surplus:,.0f}. "
                + ("This provides a comfortable buffer for operating expenses." if surplus > 0
                   else "Surplus is negative — obligations may exceed operating capacity.")
            ),
            benchmark="Should be ≥ ₹0 after all obligations",
        ))

        return indicators

    @staticmethod
    def calculate_metrics(application_id: str) -> CashFlowMetrics:
        """
        Main entry point. Computes the full CashFlowMetrics for an application.
        """
        try:
            evidence = db.list("evidence_ledger", {"application_id": application_id}) or []
            app = db.get("applications", application_id) or {}
        except Exception as exc:
            logger.warning("Firestore read failed for %s: %s — using synthetic fallback", application_id, exc)
            evidence = []
            app = {}

        field_map: Dict[str, Any] = {
            item.get("field_name"): item.get("field_value")
            for item in evidence
            if item.get("field_name")
        }

        # ── Pull financial figures ────────────────────────────────────────────
        annual_credits = float(
            field_map.get("annual_credit_turnover")
            or field_map.get("gross_income")
            or app.get("annual_turnover", 12_000_000.0)
        )
        annual_debits = float(
            field_map.get("annual_debit_turnover")
            or (annual_credits * 0.88)
        )
        amb = float(
            field_map.get("average_monthly_balance")
            or field_map.get("closing_balance")
            or (annual_credits / 48.0)
        )
        existing_emi = float(
            field_map.get("existing_emi_obligations")
            or app.get("existing_obligations_monthly", 0.0)
            or 0.0
        )
        requested_amount = float(app.get("requested_amount", 1_000_000.0))
        tenor_months = int(app.get("tenor_months", 12))

        # ── Monthly averages ──────────────────────────────────────────────────
        avg_monthly_inflow = annual_credits / 12.0
        avg_monthly_outflow = annual_debits / 12.0
        net_monthly_surplus = avg_monthly_inflow - avg_monthly_outflow

        # ── Obligation analysis ───────────────────────────────────────────────
        proposed_emi = CashFlowEngine._compute_proposed_emi(requested_amount, tenor_months)
        total_obligations = existing_emi + proposed_emi
        surplus_after = net_monthly_surplus - total_obligations
        debt_burden_pct = (total_obligations / max(avg_monthly_inflow, 1.0)) * 100.0

        # ── DSCR ─────────────────────────────────────────────────────────────
        annual_debt_service = total_obligations * 12.0
        operating_cash_flow = annual_credits - annual_debits
        dscr = round(
            max(0.5, min(operating_cash_flow / max(annual_debt_service, 1.0), 4.5)),
            2,
        )

        # ── Liquidity buffer ─────────────────────────────────────────────────
        daily_outflow = max(avg_monthly_outflow / 30.0, 100.0)
        buffer_days = int(max(5, min(amb / daily_outflow, 120)))

        # ── Monthly trend (6-month synthetic series) ─────────────────────────
        # Variations reflect typical MSME seasonality (post-festival dip → year-end pickup)
        inflow_factors  = [0.88, 1.06, 0.95, 1.02, 1.18, 1.10]
        outflow_factors = [0.92, 1.08, 0.96, 0.99, 1.12, 1.05]

        monthly_trend: List[MonthlyCashFlow] = []
        inflows_series: List[float] = []

        for i, label in enumerate(MONTH_LABELS):
            m_in  = round(avg_monthly_inflow  * inflow_factors[i],  2)
            m_out = round(avg_monthly_outflow * outflow_factors[i], 2)
            net   = round(m_in - m_out, 2)
            # closing balance ≈ AMB adjusted by net-flow contribution
            closing = round(amb + net * 0.4, 2)
            emi_out = round(existing_emi, 2) if existing_emi > 0 else None
            inflows_series.append(m_in)
            monthly_trend.append(MonthlyCashFlow(
                month=label,
                inflow=m_in,
                outflow=m_out,
                net_flow=net,
                closing_balance=closing,
                emi_outflow=emi_out,
            ))

        # ── Volatility & seasonality ─────────────────────────────────────────
        std_inflow = float(np.std(inflows_series))
        volatility_index = round(
            min(1.0, std_inflow / max(avg_monthly_inflow, 1.0)),
            3,
        )
        peak   = max(inflows_series)
        trough = max(min(inflows_series), 1.0)
        seasonality_ratio = round(peak / trough, 2)

        # ── Anomaly detection ─────────────────────────────────────────────────
        anomalies = CashFlowEngine._detect_anomalies(
            monthly_trend, avg_monthly_inflow, avg_monthly_outflow
        )

        # ── Health indicators ─────────────────────────────────────────────────
        health_indicators = CashFlowEngine._build_health_indicators(
            dscr=dscr,
            volatility_index=volatility_index,
            debt_burden_pct=debt_burden_pct,
            buffer_days=buffer_days,
            surplus=surplus_after,
            existing_emi=existing_emi,
            proposed_emi=proposed_emi,
        )

        # ── Assemble and persist ──────────────────────────────────────────────
        metric_id = f"cfm_{application_id}"
        metrics = CashFlowMetrics(
            metric_id=metric_id,
            application_id=application_id,
            avg_monthly_inflow=round(avg_monthly_inflow, 2),
            avg_monthly_outflow=round(avg_monthly_outflow, 2),
            operating_cash_flow=round(operating_cash_flow, 2),
            net_monthly_surplus=round(net_monthly_surplus, 2),
            existing_monthly_emi=round(existing_emi, 2),
            proposed_monthly_emi=round(proposed_emi, 2),
            total_monthly_obligations=round(total_obligations, 2),
            surplus_after_obligations=round(surplus_after, 2),
            debt_service_burden_pct=round(debt_burden_pct, 2),
            dscr=dscr,
            cash_burn_rate=round(daily_outflow, 2),
            working_capital_buffer_days=buffer_days,
            volatility_index=volatility_index,
            seasonality_ratio=seasonality_ratio,
            monthly_trend=monthly_trend,
            anomalies=anomalies,
            health_indicators=health_indicators,
            calculated_at=datetime.now(timezone.utc),
        )

        try:
            db.set("cashflow_metrics", metric_id, metrics.model_dump(mode="json"))
        except Exception as exc:
            logger.warning("Could not persist cashflow metrics: %s", exc)

        return metrics
