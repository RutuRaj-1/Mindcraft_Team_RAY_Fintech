import math
import numpy as np
from datetime import datetime
from typing import Dict, Any, List
from backend.database.models import CashFlowMetrics, MonthlyCashFlow
from backend.database.firestore_client import db

class CashFlowEngine:
    @staticmethod
    def calculate_metrics(application_id: str) -> CashFlowMetrics:
        evidence = db.list("evidence_ledger", {"application_id": application_id})
        app = db.get("applications", application_id) or {}

        field_map = {item.get("field_name"): item.get("field_value") for item in evidence}

        # Annual figures
        credits = float(field_map.get("annual_credit_turnover") or app.get("annual_turnover", 12000000.0))
        debits = float(field_map.get("annual_debit_turnover") or (credits * 0.88))
        amb = float(field_map.get("average_monthly_balance") or (credits / 48))
        requested_amount = float(app.get("requested_amount", 1000000.0))
        tenor_months = int(app.get("tenor_months", 12))

        # Monthly averages
        avg_monthly_inflow = credits / 12.0
        avg_monthly_outflow = debits / 12.0
        operating_cash_flow = credits - debits

        # Estimated proposed EMI: Principal / Tenor + 12% annual interest
        monthly_interest_rate = 0.12 / 12.0
        proposed_emi = (requested_amount * monthly_interest_rate * ((1 + monthly_interest_rate) ** tenor_months)) / (((1 + monthly_interest_rate) ** tenor_months) - 1)
        annual_debt_service = proposed_emi * 12.0

        # DSCR calculation
        dscr = operating_cash_flow / max(annual_debt_service, 1.0)
        dscr = round(max(0.5, min(dscr, 4.5)), 2)

        # Buffer days: (Closing/AMB balance) / (Daily Outflow)
        daily_outflow = max(avg_monthly_outflow / 30.0, 100.0)
        buffer_days = int(amb / daily_outflow)
        buffer_days = max(5, min(buffer_days, 90))

        # Monthly cash flow trend generation (last 6 months)
        months = ["Nov 25", "Dec 25", "Jan 26", "Feb 26", "Mar 26", "Apr 26"]
        monthly_trend: List[MonthlyCashFlow] = []
        variations = [0.92, 1.05, 0.98, 1.02, 1.15, 1.08]

        inflows_series = []
        for i, m in enumerate(months):
            factor = variations[i]
            m_in = round(avg_monthly_inflow * factor, 2)
            m_out = round(avg_monthly_outflow * (0.95 + (factor - 1.0) * 0.5), 2)
            net = round(m_in - m_out, 2)
            closing = round(amb + net * 0.4, 2)
            inflows_series.append(m_in)

            monthly_trend.append(MonthlyCashFlow(
                month=m,
                inflow=m_in,
                outflow=m_out,
                net_flow=net,
                closing_balance=closing
            ))

        # Volatility Index (std dev / mean)
        std_inflow = float(np.std(inflows_series))
        volatility_index = round(min(1.0, std_inflow / avg_monthly_inflow), 3)

        metric_id = f"cfm_{application_id}"
        metrics = CashFlowMetrics(
            metric_id=metric_id,
            application_id=application_id,
            dscr=dscr,
            avg_monthly_inflow=round(avg_monthly_inflow, 2),
            avg_monthly_outflow=round(avg_monthly_outflow, 2),
            operating_cash_flow=round(operating_cash_flow, 2),
            cash_burn_rate=round(avg_monthly_outflow, 2),
            working_capital_buffer_days=buffer_days,
            volatility_index=volatility_index,
            seasonality_ratio=1.12,
            monthly_trend=monthly_trend,
            calculated_at=datetime.utcnow()
        )

        db.set("cashflow_metrics", metric_id, metrics.model_dump())
        return metrics
