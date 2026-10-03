"""
What-If Counterfactual Simulator — Module 6 Product Feature
============================================================
Allows a customer or Relationship Manager (RM) to interactively explore how
changing selected application inputs affects financial affordability, cash-flow
burden, and ML risk indicators.

Invariants:
  1. Immutability: The original application is NEVER modified by a simulation.
  2. Transparency: EMI is calculated using standard reducing-balance amortisation.
  3. Grounded ML: Recomputes the 15-feature vector and runs the exact same
     Scikit-Learn MLRiskModel pipeline against the scenario.
  4. Explicit Labelling: Clearly separates BASE CASE from SIMULATED SCENARIO.
  5. Mandatory Disclaimer: Never claims "This guarantees approval." All outputs
     are explicitly flagged as hypothetical affordability estimates.
"""

import uuid
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from backend.database.models import (
    WhatIfRequest,
    WhatIfResponse,
    WhatIfScenarioModel,
    RiskBand,
    DecisionOutcome,
    now_utc_iso,
)
from backend.database.firestore_client import db
from backend.modules.module4_decision.ml_risk_model import MLRiskModel

logger = logging.getLogger(__name__)

DISCLAIMER_TEXT = (
    "Hypothetical scenario for affordability analysis only. "
    "This does not guarantee credit approval."
)


def calculate_transparent_emi(
    principal: float, annual_rate_pct: float, tenure_months: int
) -> Dict[str, Any]:
    """
    Transparent standard reducing-balance EMI calculation:
      EMI = P * r * (1+r)^n / ((1+r)^n - 1)
    where:
      P = Principal loan amount
      r = Monthly interest rate = (annual_rate_pct / 100) / 12
      n = Tenure in months
    """
    principal = max(0.0, float(principal))
    tenure_months = max(1, int(tenure_months))
    annual_rate_pct = max(0.0, float(annual_rate_pct))

    monthly_rate = (annual_rate_pct / 100.0) / 12.0

    if monthly_rate == 0.0:
        emi = principal / tenure_months
    else:
        compound = (1.0 + monthly_rate) ** tenure_months
        if compound == 1.0:
            emi = principal / tenure_months
        else:
            emi = (principal * monthly_rate * compound) / (compound - 1.0)

    emi = round(emi, 2)
    total_payable = round(emi * tenure_months, 2)
    total_interest = round(max(0.0, total_payable - principal), 2)

    return {
        "emi": emi,
        "principal": round(principal, 2),
        "annualRatePct": round(annual_rate_pct, 2),
        "tenureMonths": tenure_months,
        "monthlyRate": round(monthly_rate, 6),
        "totalInterest": total_interest,
        "totalPayable": total_payable,
        "formula": "EMI = P * r * (1+r)^n / ((1+r)^n - 1)",
    }


class WhatIfSimulator:
    """
    Core simulator service for counterfactual affordability and risk assessment.
    """

    @staticmethod
    def simulate(application_id: str, request: WhatIfRequest) -> WhatIfResponse:
        # 1. Fetch base application records — strict read-only access
        app = db.get("applications", application_id) or {}
        cfm = db.get("cashflow_metrics", f"cfm_{application_id}") or {}
        risk_list = db.list("risk_assessments", {"application_id": application_id})
        risk = risk_list[-1] if risk_list else {}
        decision_list = db.list("decisions", {"application_id": application_id})
        decision = decision_list[-1] if decision_list else {}

        # 2. Extract Base Case values
        base_amount = float(app.get("requested_amount", 1000000.0))
        base_tenure = int(app.get("tenor_months", 12))
        base_rate = float(decision.get("interest_rate", 11.5))
        base_turnover = float(app.get("annual_turnover", 10000000.0))

        # Cash flow baselines
        base_monthly_inflow = float(
            cfm.get("average_monthly_inflow", cfm.get("monthly_inflow", base_turnover / 12.0))
        )
        base_monthly_outflow = float(
            cfm.get("average_monthly_outflow", cfm.get("monthly_outflow", base_monthly_inflow * 0.72))
        )
        base_existing_obligations = float(
            cfm.get("existing_emi_burden", cfm.get("existing_emi_monthly", 0.0))
        )

        base_emi_calc = calculate_transparent_emi(base_amount, base_rate, base_tenure)
        base_emi = base_emi_calc["emi"]
        base_net_cash_flow = round(base_monthly_inflow - base_monthly_outflow, 2)
        base_total_obligations = round(base_existing_obligations + base_emi, 2)
        base_surplus = round(base_net_cash_flow - base_total_obligations, 2)
        base_obligation_ratio = round(
            (base_total_obligations / max(base_monthly_inflow, 1.0)) * 100.0, 2
        )
        base_dscr = float(
            cfm.get(
                "dscr",
                round(max(0.4, (base_net_cash_flow) / max(base_total_obligations, 1.0)), 2),
            )
        )
        base_exposure_ratio = round(base_amount / max(base_turnover, 1.0), 4)

        base_score = int(risk.get("risk_score", 780))
        raw_band = risk.get("risk_band", RiskBand.LOW_RISK)
        base_band = RiskBand(raw_band) if isinstance(raw_band, str) else raw_band

        # 3. Resolve Modified Scenario Inputs
        # User may supply requested_loan_amount, loan_tenure, estimated_interest_rate,
        # declared_revenue_adjustment, and existing_obligations.
        # Fall back to legacy fields or base application values if not specified.
        sim_amount = (
            float(request.requested_loan_amount)
            if request.requested_loan_amount is not None
            else base_amount
        )
        sim_tenure = (
            int(request.loan_tenure)
            if request.loan_tenure is not None
            else (int(request.tenor_months) if request.tenor_months is not None else base_tenure)
        )
        sim_rate = (
            float(request.estimated_interest_rate)
            if request.estimated_interest_rate is not None
            else base_rate
        )
        rev_adj_pct = (
            float(request.declared_revenue_adjustment)
            if request.declared_revenue_adjustment is not None
            else float(request.revenue_delta_pct or 0.0)
        )
        sim_existing_obligations = (
            float(request.existing_obligations)
            if request.existing_obligations is not None
            else base_existing_obligations
        )

        # 4. Recompute Affordability & Cash Flow Features
        rev_multiplier = 1.0 + (rev_adj_pct / 100.0)
        sim_annual_turnover = round(base_turnover * rev_multiplier, 2)
        sim_monthly_inflow = round(base_monthly_inflow * rev_multiplier, 2)
        # Scaled operating cost proxy
        cost_scale = 1.0 + (rev_adj_pct * 0.45 / 100.0) if rev_adj_pct > 0 else rev_multiplier
        sim_monthly_outflow = round(base_monthly_outflow * cost_scale, 2)
        sim_net_cash_flow = round(sim_monthly_inflow - sim_monthly_outflow, 2)

        # Transparent EMI
        sim_emi_calc = calculate_transparent_emi(sim_amount, sim_rate, sim_tenure)
        sim_emi = sim_emi_calc["emi"]
        sim_total_obligations = round(sim_existing_obligations + sim_emi, 2)
        sim_surplus = round(sim_net_cash_flow - sim_total_obligations, 2)
        sim_obligation_ratio = round(
            (sim_total_obligations / max(sim_monthly_inflow, 1.0)) * 100.0, 2
        )
        sim_dscr = round(max(0.2, sim_net_cash_flow / max(sim_total_obligations, 1.0)), 2)
        sim_exposure_ratio = round(sim_amount / max(sim_annual_turnover, 1.0), 4)

        # Cash Flow Burden classification
        if sim_obligation_ratio <= 35.0 and sim_surplus > 0:
            cash_flow_burden = "LOW"
        elif sim_obligation_ratio <= 50.0 and sim_surplus > 0:
            cash_flow_burden = "MODERATE"
        elif sim_obligation_ratio <= 65.0:
            cash_flow_burden = "HIGH"
        else:
            cash_flow_burden = "CRITICAL"

        # 5. Run the same ML Risk Model against the simulated feature vector
        base_fv = risk.get("feature_vector", {})
        feature_dict = {
            "annual_turnover": sim_annual_turnover,
            "monthly_inflow": sim_monthly_inflow,
            "revenue_consistency": float(base_fv.get("revenue_consistency", 0.85)),
            "dscr": sim_dscr,
            "net_monthly_surplus": sim_net_cash_flow,
            "operating_margin_proxy": round(sim_net_cash_flow / max(sim_monthly_inflow, 1.0), 4),
            "surplus_after_obligations": sim_surplus,
            "debt_service_burden_pct": sim_obligation_ratio,
            "existing_emi_monthly": sim_existing_obligations,
            "exposure_ratio": sim_exposure_ratio,
            "buffer_days": float(base_fv.get("buffer_days", 25.0)) + request.buffer_days_delta,
            "volatility_index": float(base_fv.get("volatility_index", 0.15)),
            "cheque_bounces_6m": float(base_fv.get("cheque_bounces_6m", 0.0)),
            "vintage_months": float(base_fv.get("vintage_months", 36.0)),
            "avg_doc_confidence": float(base_fv.get("avg_doc_confidence", 0.85)),
        }

        risk_model = MLRiskModel.get_instance()
        sim_pd, sim_score, sim_band, _ = risk_model.predict_risk(feature_dict)

        # Collateral boost where offered
        if request.collateral_offered_amount > 0:
            collateral_ratio = request.collateral_offered_amount / max(sim_amount, 1.0)
            score_boost = int(min(80, collateral_ratio * 100))
            sim_score = min(960, sim_score + score_boost)
            if sim_score > 850:
                sim_band = RiskBand.LOW_RISK

        # 6. Sanction limit & simulated terms
        if sim_band == RiskBand.LOW_RISK and sim_dscr >= 1.3:
            sim_outcome = DecisionOutcome.APPROVED
            sim_sanction_rate = max(
                9.5,
                round(
                    base_rate
                    - (rev_adj_pct * 0.04)
                    - (0.5 if request.collateral_offered_amount > 0 else 0.0),
                    2,
                ),
            )
            sim_approved_amount = sim_amount * (1.10 if rev_adj_pct > 15 else 1.0)
        elif sim_band == RiskBand.MEDIUM_RISK or sim_dscr >= 1.1:
            sim_outcome = DecisionOutcome.CONDITIONAL_APPROVAL
            sim_sanction_rate = max(
                11.0,
                round(
                    base_rate + 0.5 - (0.5 if request.collateral_offered_amount > 0 else 0.0), 2
                ),
            )
            sim_approved_amount = sim_amount * 0.90
        else:
            sim_outcome = DecisionOutcome.NEEDS_REVIEW
            sim_sanction_rate = 13.5
            sim_approved_amount = sim_amount * 0.70

        # 7. Compute Risk Feature Changes (Deltas)
        risk_feature_changes = [
            {
                "feature": "estimated_emi",
                "label": "Estimated Monthly EMI",
                "baseValue": base_emi,
                "simulatedValue": sim_emi,
                "delta": round(sim_emi - base_emi, 2),
                "impact": "POSITIVE" if sim_emi < base_emi else ("NEGATIVE" if sim_emi > base_emi else "NEUTRAL"),
                "unit": "₹",
            },
            {
                "feature": "surplus_after_obligations",
                "label": "Monthly Operating Surplus",
                "baseValue": base_surplus,
                "simulatedValue": sim_surplus,
                "delta": round(sim_surplus - base_surplus, 2),
                "impact": "POSITIVE" if sim_surplus > base_surplus else ("NEGATIVE" if sim_surplus < base_surplus else "NEUTRAL"),
                "unit": "₹",
            },
            {
                "feature": "debt_service_burden_pct",
                "label": "Obligation / Inflow Ratio",
                "baseValue": base_obligation_ratio,
                "simulatedValue": sim_obligation_ratio,
                "delta": round(sim_obligation_ratio - base_obligation_ratio, 2),
                "impact": "POSITIVE" if sim_obligation_ratio < base_obligation_ratio else ("NEGATIVE" if sim_obligation_ratio > base_obligation_ratio else "NEUTRAL"),
                "unit": "%",
            },
            {
                "feature": "dscr",
                "label": "Debt Service Coverage Ratio",
                "baseValue": base_dscr,
                "simulatedValue": sim_dscr,
                "delta": round(sim_dscr - base_dscr, 2),
                "impact": "POSITIVE" if sim_dscr > base_dscr else ("NEGATIVE" if sim_dscr < base_dscr else "NEUTRAL"),
                "unit": "x",
            },
            {
                "feature": "exposure_ratio",
                "label": "Facility / Annual Turnover",
                "baseValue": base_exposure_ratio,
                "simulatedValue": sim_exposure_ratio,
                "delta": round(sim_exposure_ratio - base_exposure_ratio, 4),
                "impact": "POSITIVE" if sim_exposure_ratio < base_exposure_ratio else ("NEGATIVE" if sim_exposure_ratio > base_exposure_ratio else "NEUTRAL"),
                "unit": "ratio",
            },
            {
                "feature": "risk_score",
                "label": "FinFlow Trust Score",
                "baseValue": base_score,
                "simulatedValue": sim_score,
                "delta": sim_score - base_score,
                "impact": "POSITIVE" if sim_score > base_score else ("NEGATIVE" if sim_score < base_score else "NEUTRAL"),
                "unit": "pts",
            },
        ]

        # 8. Synthesise structured insights & explanation
        insights: List[str] = []
        if sim_amount != base_amount:
            delta_amt = sim_amount - base_amount
            direction = "reduced" if delta_amt < 0 else "increased"
            insights.append(
                f"Facility amount {direction} from ₹{base_amount/100000:.2f}L to ₹{sim_amount/100000:.2f}L ({delta_amt:+,.0f})."
            )

        if sim_tenure != base_tenure:
            insights.append(
                f"Loan tenure adjusted from {base_tenure}M to {sim_tenure}M, altering monthly repayment schedule."
            )

        if sim_emi != base_emi:
            emi_diff = sim_emi - base_emi
            if emi_diff < 0:
                insights.append(
                    f"Estimated EMI drops to ₹{sim_emi:,.0f}/mo (saving ₹{abs(emi_diff):,.0f}/mo vs base case)."
                )
            else:
                insights.append(
                    f"Estimated EMI increases to ₹{sim_emi:,.0f}/mo (+₹{emi_diff:,.0f}/mo vs base case)."
                )

        if sim_dscr > base_dscr:
            insights.append(
                f"DSCR improves from {base_dscr:.2f}x to {sim_dscr:.2f}x, expanding debt service buffer."
            )
        elif sim_dscr < base_dscr:
            insights.append(
                f"DSCR shifts from {base_dscr:.2f}x to {sim_dscr:.2f}x under revised debt obligations."
            )

        if sim_score > base_score:
            insights.append(
                f"FinFlow Trust Score improves by +{sim_score - base_score} points (to {sim_score}/1000, {sim_band.value})."
            )
        elif sim_score < base_score:
            insights.append(
                f"FinFlow Trust Score adjusts to {sim_score}/1000 ({sim_score - base_score:+d} pts, {sim_band.value})."
            )

        if request.collateral_offered_amount > 0:
            insights.append(
                f"Pledging ₹{request.collateral_offered_amount:,.0f} collateral substantially mitigates credit exposure."
            )

        if not insights:
            insights.append("Identical inputs submitted; metrics align with baseline application.")

        # Full structured narrative
        explanation = (
            f"Under this simulated scenario, requested facility is ₹{sim_amount/100000:.2f}L for {sim_tenure} months "
            f"at an estimated rate of {sim_rate:.2f}% p.a. Transparent amortisation yields an estimated monthly EMI "
            f"of ₹{sim_emi:,.0f}. Net monthly surplus is estimated at ₹{sim_surplus:,.0f} after meeting ₹{sim_existing_obligations:,.0f} "
            f"in existing obligations. Debt service represents {sim_obligation_ratio:.1f}% of verified monthly credits, "
            f"classified as {cash_flow_burden} cash-flow burden (DSCR {sim_dscr:.2f}x). "
            f"ML risk pipeline calibrates FinFlow Trust Score to {sim_score}/1000 ({sim_band.value}). "
            f"{DISCLAIMER_TEXT}"
        )

        scenario_id = f"scen_{uuid.uuid4().hex[:12]}"
        now_ts = now_utc_iso()

        base_app_values = {
            "requestedLoanAmount": base_amount,
            "loanTenure": base_tenure,
            "estimatedInterestRate": base_rate,
            "annualTurnover": base_turnover,
            "monthlyInflow": base_monthly_inflow,
            "monthlyOutflow": base_monthly_outflow,
            "existingObligations": base_existing_obligations,
            "estimatedEMI": base_emi,
            "monthlySurplus": base_surplus,
            "obligationRatio": base_obligation_ratio,
            "dscr": base_dscr,
            "riskScore": base_score,
            "riskBand": base_band.value if hasattr(base_band, "value") else str(base_band),
        }

        modified_values = {
            "requestedLoanAmount": sim_amount,
            "loanTenure": sim_tenure,
            "estimatedInterestRate": sim_rate,
            "declaredRevenueAdjustment": rev_adj_pct,
            "annualTurnover": sim_annual_turnover,
            "monthlyInflow": sim_monthly_inflow,
            "monthlyOutflow": sim_monthly_outflow,
            "existingObligations": sim_existing_obligations,
        }

        calculated_metrics = {
            "estimatedEMI": sim_emi,
            "baseEMI": base_emi,
            "emiDelta": round(sim_emi - base_emi, 2),
            "monthlySurplus": sim_surplus,
            "baseSurplus": base_surplus,
            "surplusDelta": round(sim_surplus - base_surplus, 2),
            "obligationRatio": sim_obligation_ratio,
            "baseObligationRatio": base_obligation_ratio,
            "obligationRatioDelta": round(sim_obligation_ratio - base_obligation_ratio, 2),
            "dscr": sim_dscr,
            "baseDscr": base_dscr,
            "dscrDelta": round(sim_dscr - base_dscr, 2),
            "totalPayable": sim_emi_calc["totalPayable"],
            "totalInterest": sim_emi_calc["totalInterest"],
            "cashFlowBurden": cash_flow_burden,
        }

        # 9. Persist snapshot to what_if_scenarios collection — APPLICATION REMAINS UNTOUCHED
        scenario_data = {
            "scenarioId": scenario_id,
            "applicationId": application_id,
            "baseApplicationValues": base_app_values,
            "modifiedValues": modified_values,
            "calculatedMetrics": calculated_metrics,
            "estimatedEMI": sim_emi,
            "cashFlowBurden": cash_flow_burden,
            "riskFeatureChanges": risk_feature_changes,
            "riskScore": sim_score,
            "riskBand": sim_band.value if hasattr(sim_band, "value") else str(sim_band),
            "explanation": explanation,
            "disclaimer": DISCLAIMER_TEXT,
            "createdAt": now_ts,
            "requestedInputs": request.model_dump(by_alias=True),
            "simulatedOutputs": {
                "simulated_emi": sim_emi,
                "simulated_dscr": sim_dscr,
                "simulated_surplus": sim_surplus,
                "simulated_obligation_ratio": sim_obligation_ratio,
                "simulated_risk_score": sim_score,
                "simulated_risk_band": sim_band.value if hasattr(sim_band, "value") else str(sim_band),
            },
            "insights": insights,
        }

        db.set("what_if_scenarios", scenario_id, scenario_data)
        logger.info(
            "Saved what-if scenario %s for application %s (application unchanged)",
            scenario_id,
            application_id,
        )

        # 10. Return full response satisfying both WhatIfScenarioModel and WhatIfResponse schemas
        return WhatIfResponse(
            scenarioId=scenario_id,
            applicationId=application_id,
            baseApplicationValues=base_app_values,
            modifiedValues=modified_values,
            calculatedMetrics=calculated_metrics,
            estimatedEMI=sim_emi,
            cashFlowBurden=cash_flow_burden,
            riskFeatureChanges=risk_feature_changes,
            riskScore=sim_score,
            riskBand=sim_band,
            explanation=explanation,
            disclaimer=DISCLAIMER_TEXT,
            createdAt=now_ts,
            requestedInputs=request.model_dump(by_alias=True),
            simulatedOutputs=scenario_data["simulatedOutputs"],
            insights=insights,
            # Legacy compatibility fields
            original_dscr=base_dscr,
            simulated_dscr=sim_dscr,
            original_risk_score=base_score,
            simulated_risk_score=sim_score,
            original_risk_band=base_band,
            simulated_risk_band=sim_band,
            original_approved_amount=base_amount,
            simulated_approved_amount=round(sim_approved_amount, 2),
            original_interest_rate=base_rate,
            simulated_interest_rate=round(sim_sanction_rate, 2),
            outcome=sim_outcome,
        )

    @staticmethod
    def list_scenarios(application_id: str) -> List[WhatIfScenarioModel]:
        """Retrieve all historical scenarios computed for an application."""
        raw_list = db.list("what_if_scenarios", {"applicationId": application_id})
        # Also check with snake_case filter just in case
        if not raw_list:
            raw_list = db.list("what_if_scenarios", {"application_id": application_id})
        scenarios = [WhatIfScenarioModel(**s) for s in raw_list]
        return sorted(scenarios, key=lambda s: s.createdAt, reverse=True)
