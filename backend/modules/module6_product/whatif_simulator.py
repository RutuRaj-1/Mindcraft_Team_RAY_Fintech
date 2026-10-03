from typing import List
from backend.database.models import (
    WhatIfRequest, WhatIfResponse, RiskBand, DecisionOutcome
)
from backend.database.firestore_client import db
from backend.modules.module4_decision.ml_risk_model import MLRiskModel

class WhatIfSimulator:
    @staticmethod
    def simulate(application_id: str, request: WhatIfRequest) -> WhatIfResponse:
        app = db.get("applications", application_id) or {}
        cfm = db.get("cashflow_metrics", f"cfm_{application_id}") or {}
        risk_list = db.list("risk_assessments", {"application_id": application_id})
        risk = risk_list[-1] if risk_list else {}
        decision_list = db.list("decisions", {"application_id": application_id})
        decision = decision_list[-1] if decision_list else {}

        orig_dscr = float(cfm.get("dscr", 1.5))
        orig_score = int(risk.get("risk_score", 780))
        orig_band = RiskBand(risk.get("risk_band", RiskBand.LOW_RISK))
        orig_amount = float(decision.get("approved_amount", app.get("requested_amount", 1000000.0)))
        orig_rate = float(decision.get("interest_rate", 11.5))

        # 1. Simulate revenue impact on Operating Cash Flow & DSCR
        rev_multiplier = 1.0 + (request.revenue_delta_pct / 100.0)
        tenor = request.tenor_months or int(app.get("tenor_months", 12))
        orig_tenor = int(app.get("tenor_months", 12))

        # Tenor increase lowers monthly EMI, improving DSCR
        tenor_factor = (orig_tenor / max(tenor, 1)) ** 0.65
        simulated_dscr = round(max(0.4, (orig_dscr * rev_multiplier) / tenor_factor), 2)

        # 2. Simulate ML Feature vector
        sim_turnover = float(app.get("annual_turnover", 10000000.0)) * rev_multiplier
        sim_buffer = int(cfm.get("working_capital_buffer_days", 30)) + request.buffer_days_delta

        feature_dict = {
            "vintage_months": float(app.get("vintage_months", 36)),
            "annual_turnover": sim_turnover,
            "dscr": simulated_dscr,
            "buffer_days": float(max(5, sim_buffer)),
            "bounces_6m": 0.0,
            "volatility_index": float(cfm.get("volatility_index", 0.15)),
            "profit_margin": 0.12 * rev_multiplier
        }

        risk_model = MLRiskModel.get_instance()
        sim_pd, sim_score, sim_band, _ = risk_model.predict_risk(feature_dict)

        # Collateral boost
        if request.collateral_offered_amount > 0:
            collateral_ratio = request.collateral_offered_amount / max(float(app.get("requested_amount", 1000000)), 1.0)
            score_boost = int(min(80, collateral_ratio * 100))
            sim_score = min(960, sim_score + score_boost)
            if sim_score > 850:
                sim_band = RiskBand.LOW_RISK

        # 3. Simulate Terms & Sanction Limit
        requested_amt = float(app.get("requested_amount", 1000000.0))
        if sim_band == RiskBand.LOW_RISK and simulated_dscr >= 1.3:
            sim_outcome = DecisionOutcome.APPROVED
            sim_rate = max(9.5, round(orig_rate - (request.revenue_delta_pct * 0.04) - (0.5 if request.collateral_offered_amount > 0 else 0.0), 2))
            sim_amount = requested_amt * (1.15 if request.revenue_delta_pct > 15 else 1.0)
        elif sim_band == RiskBand.MEDIUM_RISK or simulated_dscr >= 1.1:
            sim_outcome = DecisionOutcome.CONDITIONAL_APPROVAL
            sim_rate = max(11.0, round(orig_rate + 0.5 - (0.5 if request.collateral_offered_amount > 0 else 0.0), 2))
            sim_amount = requested_amt * 0.85
        else:
            sim_outcome = DecisionOutcome.NEEDS_REVIEW
            sim_rate = 13.5
            sim_amount = requested_amt * 0.60

        insights: List[str] = []
        if simulated_dscr > orig_dscr:
            insights.append(f"DSCR improves from {orig_dscr:.2f}x to {simulated_dscr:.2f}x, expanding debt capacity.")
        if sim_score > orig_score:
            insights.append(f"FinFlow Trust Score increases by +{sim_score - orig_score} points (to {sim_score}/1000).")
        if sim_rate < orig_rate:
            insights.append(f"Qualifies for preferred pricing reduction to {sim_rate:.2f}% p.a. (saved {orig_rate - sim_rate:.2f}%).")
        if request.collateral_offered_amount > 0:
            insights.append(f"Adding ₹{request.collateral_offered_amount:,.2f} collateral de-risks the facility and improves approval certainty.")

        if not insights:
            insights.append("Slight reduction in coverage metrics; consider extending tenor to maintain healthy debt service.")

        return WhatIfResponse(
            original_dscr=orig_dscr,
            simulated_dscr=simulated_dscr,
            original_risk_score=orig_score,
            simulated_risk_score=sim_score,
            original_risk_band=orig_band,
            simulated_risk_band=sim_band,
            original_approved_amount=orig_amount,
            simulated_approved_amount=round(sim_amount, 2),
            original_interest_rate=orig_rate,
            simulated_interest_rate=sim_rate,
            outcome=sim_outcome,
            insights=insights
        )
