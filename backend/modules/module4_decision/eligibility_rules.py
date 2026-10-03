from typing import Dict, Any, List, Tuple
from backend.database.models import HardRuleEvaluation

class EligibilityRulesEngine:
    RULES = [
        {
            "id": "R01_VINTAGE",
            "name": "Minimum Operational Vintage",
            "threshold": 24, # months
            "policy_citation": "Credit Policy Clause 4.1: Applicant enterprise must have continuous commercial operations for at least 24 months."
        },
        {
            "id": "R02_TURNOVER",
            "name": "Minimum Annual Turnover",
            "threshold": 2500000.0, # ₹25 Lakhs
            "policy_citation": "Credit Policy Clause 4.2: Audited/GST verified annual sales turnover must exceed ₹25,00,000."
        },
        {
            "id": "R03_CHEQUE_BOUNCES",
            "name": "Inward Cheque Returns Limit",
            "threshold": 2, # max bounces in 6 months
            "policy_citation": "Credit Policy Clause 6.3: No more than 2 financial/inward cheque bounces in preceding 180 days."
        },
        {
            "id": "R04_DSCR",
            "name": "Debt Service Coverage Ratio",
            "threshold": 1.25, # minimum ratio
            "policy_citation": "Credit Policy Clause 5.2: Minimum DSCR of 1.25x required for unhedged SME working capital facilities."
        },
        {
            "id": "R05_REGISTRATION",
            "name": "Active GSTIN Verification",
            "threshold": True,
            "policy_citation": "KYC Guidelines Section 2: Enterprise must possess an active GSTIN with zero debarment flags."
        }
    ]

    @classmethod
    def evaluate(
        cls,
        vintage_months: int,
        turnover: float,
        cheque_bounces: int,
        dscr: float,
        has_active_gstin: bool = True
    ) -> Tuple[bool, List[HardRuleEvaluation]]:
        evaluations: List[HardRuleEvaluation] = []
        all_passed = True

        # Rule 1: Vintage
        r1_passed = vintage_months >= 24
        if not r1_passed: all_passed = False
        evaluations.append(HardRuleEvaluation(
            rule_id="R01_VINTAGE",
            rule_name="Minimum Operational Vintage",
            passed=r1_passed,
            threshold_value=">= 24 months",
            actual_value=f"{vintage_months} months",
            failure_reason="Business vintage is below mandatory 24-month minimum" if not r1_passed else None,
            policy_citation="Credit Policy Clause 4.1"
        ))

        # Rule 2: Turnover
        r2_passed = turnover >= 2500000.0
        if not r2_passed: all_passed = False
        evaluations.append(HardRuleEvaluation(
            rule_id="R02_TURNOVER",
            rule_name="Minimum Annual Turnover",
            passed=r2_passed,
            threshold_value=">= ₹25,00,000",
            actual_value=f"₹{turnover:,.2f}",
            failure_reason="Annual turnover falls below eligibility threshold" if not r2_passed else None,
            policy_citation="Credit Policy Clause 4.2"
        ))

        # Rule 3: Cheque bounces
        r3_passed = cheque_bounces <= 2
        if not r3_passed: all_passed = False
        evaluations.append(HardRuleEvaluation(
            rule_id="R03_CHEQUE_BOUNCES",
            rule_name="Inward Cheque Returns Limit",
            passed=r3_passed,
            threshold_value="<= 2 in 6m",
            actual_value=f"{cheque_bounces} bounces",
            failure_reason=f"Recorded {cheque_bounces} bounces exceeds maximum limit of 2" if not r3_passed else None,
            policy_citation="Credit Policy Clause 6.3"
        ))

        # Rule 4: DSCR
        r4_passed = dscr >= 1.25
        if not r4_passed: all_passed = False
        evaluations.append(HardRuleEvaluation(
            rule_id="R04_DSCR",
            rule_name="Debt Service Coverage Ratio",
            passed=r4_passed,
            threshold_value=">= 1.25x",
            actual_value=f"{dscr:.2f}x",
            failure_reason=f"DSCR of {dscr:.2f}x does not provide adequate buffer" if not r4_passed else None,
            policy_citation="Credit Policy Clause 5.2"
        ))

        # Rule 5: Active GSTIN
        r5_passed = bool(has_active_gstin)
        if not r5_passed: all_passed = False
        evaluations.append(HardRuleEvaluation(
            rule_id="R05_REGISTRATION",
            rule_name="Active GSTIN Verification",
            passed=r5_passed,
            threshold_value="Active",
            actual_value="Active" if r5_passed else "Inactive/Missing",
            failure_reason="Entity lacks verified active GSTIN status" if not r5_passed else None,
            policy_citation="KYC Guidelines Section 2"
        ))

        return all_passed, evaluations
