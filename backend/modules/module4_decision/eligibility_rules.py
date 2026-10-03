"""
PolicyRulesEngine — Module 4 Deterministic Eligibility Gate
============================================================
All hard policy rules are defined here.  This module is the SOLE
authority on eligibility.  The ML model NEVER overrides a hard failure.

Rule types:
  HARD_FAIL   — application is NOT_ELIGIBLE regardless of ML score
  REVIEW      — application proceeds but is flagged for human review
  ADVISORY    — informational only; no eligibility impact

Configuration:
  POLICY_CONFIG dict is the single source of truth for all thresholds.
  Change a threshold here; it propagates everywhere automatically.

Execution:
  Rules are evaluated in order.  Early HARD_FAIL rules do NOT short-circuit —
  all rules are always evaluated so the full audit trail is captured.
"""

from __future__ import annotations
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from backend.database.models import HardRuleEvaluation, PolicyGateResult

logger = logging.getLogger(__name__)

# ── Policy Configuration (single source of truth) ─────────────────────────────
POLICY_CONFIG: Dict[str, Any] = {
    # KYC & Identity
    "min_kyc_docs_verified":        1,      # at least N identity docs verified
    "min_doc_confidence_threshold": 0.60,   # OCR confidence below this = REVIEW
    
    # Vintage & Operational History
    "min_vintage_months":           24,     # minimum operational months
    
    # Revenue & Turnover
    "min_annual_turnover":          2_500_000.0,  # ₹25 Lakhs
    
    # Banking Discipline
    "max_cheque_bounces_6m":        2,      # maximum inward bounces in 6M
    
    # Debt Service
    "min_dscr":                     1.25,   # minimum DSCR
    "max_debt_burden_pct":          55.0,   # max obligations as % of inflow
    
    # Exposure
    "max_exposure_ratio":           0.80,   # requested amount / annual turnover
    "max_absolute_exposure":        10_000_000.0,  # ₹1 Crore hard cap
    
    # Document Completeness
    "min_docs_uploaded":            2,      # minimum number of docs uploaded
    
    # GSTIN / Registration
    "require_active_gstin":         True,
}

# ── Rule Definitions ──────────────────────────────────────────────────────────
@dataclass
class RuleDefinition:
    rule_id:        str
    rule_name:      str
    rule_type:      str  # HARD_FAIL | REVIEW | ADVISORY
    policy_citation: str
    description:    str


RULE_DEFINITIONS: List[RuleDefinition] = [
    RuleDefinition(
        rule_id="R01_KYC_IDENTITY",
        rule_name="KYC Identity Verification",
        rule_type="HARD_FAIL",
        policy_citation="KYC Guidelines §2.1: Minimum one verified government-issued identity document required.",
        description="At least one KYC identity document (PAN, Aadhaar, or Udyam) must be submitted and OCR-verified.",
    ),
    RuleDefinition(
        rule_id="R02_VINTAGE",
        rule_name="Minimum Operational Vintage",
        rule_type="HARD_FAIL",
        policy_citation="Credit Policy §4.1: Continuous operations for ≥24 months.",
        description=f"Business must have operated continuously for ≥{POLICY_CONFIG['min_vintage_months']} months.",
    ),
    RuleDefinition(
        rule_id="R03_ACTIVE_GSTIN",
        rule_name="Active GSTIN Registration",
        rule_type="HARD_FAIL",
        policy_citation="KYC Guidelines §2.2: Active, debarment-free GSTIN required for all SME borrowers.",
        description="Applicant must hold an active GSTIN with no debarment or cancellation flags.",
    ),
    RuleDefinition(
        rule_id="R04_ANNUAL_TURNOVER",
        rule_name="Minimum Annual Sales Turnover",
        rule_type="HARD_FAIL",
        policy_citation="Credit Policy §4.2: Verified turnover must exceed ₹25,00,000.",
        description=f"GST/bank-verified annual turnover must be ≥ ₹{POLICY_CONFIG['min_annual_turnover']:,.0f}.",
    ),
    RuleDefinition(
        rule_id="R05_DSCR",
        rule_name="Debt Service Coverage Ratio Gate",
        rule_type="HARD_FAIL",
        policy_citation="Credit Policy §5.2: DSCR ≥ 1.25x required for unhedged SME facilities.",
        description=f"Operating surplus must cover all debt service by a factor of ≥{POLICY_CONFIG['min_dscr']}x.",
    ),
    RuleDefinition(
        rule_id="R06_CHEQUE_BOUNCES",
        rule_name="Banking Discipline — Cheque Returns",
        rule_type="HARD_FAIL",
        policy_citation="Credit Policy §6.3: ≤2 inward cheque returns in the preceding 6-month period.",
        description=f"No more than {POLICY_CONFIG['max_cheque_bounces_6m']} inward cheque bounces in 6M.",
    ),
    RuleDefinition(
        rule_id="R07_MAX_EXPOSURE",
        rule_name="Maximum Credit Exposure Gate",
        rule_type="HARD_FAIL",
        policy_citation="Risk Policy §3.4: Requested facility must not exceed configured exposure limits.",
        description=(
            f"Requested amount must not exceed {POLICY_CONFIG['max_exposure_ratio']*100:.0f}% of annual turnover "
            f"or ₹{POLICY_CONFIG['max_absolute_exposure']:,.0f} in absolute terms."
        ),
    ),
    RuleDefinition(
        rule_id="R08_DOC_COMPLETENESS",
        rule_name="Document Completeness Check",
        rule_type="REVIEW",
        policy_citation="Operational Guidelines §7.1: Minimum document set required for automated underwriting.",
        description=f"At least {POLICY_CONFIG['min_docs_uploaded']} documents must be uploaded and processed.",
    ),
    RuleDefinition(
        rule_id="R09_OCR_CONFIDENCE",
        rule_name="Evidence OCR Confidence Threshold",
        rule_type="REVIEW",
        policy_citation="Data Quality Policy §8.2: Low OCR confidence triggers manual evidence verification.",
        description=(
            f"Average document OCR confidence must be ≥ {POLICY_CONFIG['min_doc_confidence_threshold']*100:.0f}% "
            "for automated processing."
        ),
    ),
    RuleDefinition(
        rule_id="R10_DEBT_BURDEN",
        rule_name="Maximum Obligation-to-Inflow Ratio",
        rule_type="REVIEW",
        policy_citation="Credit Policy §5.3: Total debt obligations should not exceed 55% of monthly inflow.",
        description=(
            f"Total monthly loan obligations (existing + proposed) must not exceed "
            f"{POLICY_CONFIG['max_debt_burden_pct']:.0f}% of average monthly inflow."
        ),
    ),
]

# ── Rule Evaluator ─────────────────────────────────────────────────────────────
class PolicyRulesEngine:
    """
    Evaluates all 10 configurable policy rules against a prepared feature vector
    and contextual flags.  Returns a list of HardRuleEvaluation records and a
    PolicyGateResult summary.

    INVARIANT: A HARD_FAIL outcome from any rule cannot be overridden by the ML
    model.  This is enforced by the RiskOrchestrator, not here.
    """

    @classmethod
    def evaluate(
        cls,
        feature_vector: Dict[str, float],
        has_active_gstin: bool = True,
        kyc_docs_verified: int = 0,
        docs_uploaded: int = 0,
        requested_amount: float = 0.0,
        annual_turnover: float = 0.0,
    ) -> Tuple[bool, List[HardRuleEvaluation], PolicyGateResult]:
        """
        Args:
            feature_vector: engineered feature dict from RiskFeatureEngineer
            has_active_gstin: True if GSTIN is active and verified
            kyc_docs_verified: count of verified identity documents
            docs_uploaded: total docs uploaded for this application
            requested_amount: the requested loan amount
            annual_turnover: verified annual turnover

        Returns:
            all_hard_rules_passed: True only if zero HARD_FAIL rules fired
            evaluations: full list of HardRuleEvaluation records
            gate: PolicyGateResult summary
        """
        cfg = POLICY_CONFIG
        fv  = feature_vector
        evals: List[HardRuleEvaluation] = []
        hard_failures: List[str] = []
        review_flags:  List[str] = []

        def _add(rule: RuleDefinition, passed: bool, actual: str, threshold: str,
                 reason: Optional[str] = None) -> None:
            ev = HardRuleEvaluation(
                rule_id=rule.rule_id,
                rule_name=rule.rule_name,
                passed=passed,
                threshold_value=threshold,
                actual_value=actual,
                failure_reason=reason if not passed else None,
                policy_citation=rule.policy_citation,
            )
            evals.append(ev)
            if not passed:
                if rule.rule_type == "HARD_FAIL":
                    hard_failures.append(rule.rule_id)
                elif rule.rule_type == "REVIEW":
                    review_flags.append(rule.rule_id)

        defs = {r.rule_id: r for r in RULE_DEFINITIONS}

        # ── R01: KYC Identity ────────────────────────────────────────────────
        r01 = defs["R01_KYC_IDENTITY"]
        r01_passed = kyc_docs_verified >= cfg["min_kyc_docs_verified"]
        _add(r01, r01_passed,
             f"{kyc_docs_verified} verified identity doc(s)",
             f"≥ {cfg['min_kyc_docs_verified']} required",
             "No verified KYC identity document found. PAN, Aadhaar or Udyam registration required.")

        # ── R02: Vintage ─────────────────────────────────────────────────────
        r02 = defs["R02_VINTAGE"]
        vintage = fv.get("vintage_months", 0.0)
        r02_passed = vintage >= cfg["min_vintage_months"]
        _add(r02, r02_passed,
             f"{vintage:.0f} months",
             f"≥ {cfg['min_vintage_months']} months",
             f"Business vintage of {vintage:.0f}M is below the mandatory {cfg['min_vintage_months']}M minimum.")

        # ── R03: Active GSTIN ────────────────────────────────────────────────
        r03 = defs["R03_ACTIVE_GSTIN"]
        _add(r03, has_active_gstin,
             "Active" if has_active_gstin else "Inactive/Missing",
             "Active & debarment-free",
             "GSTIN is inactive, cancelled, or not verified." if not has_active_gstin else None)

        # ── R04: Annual Turnover ─────────────────────────────────────────────
        r04 = defs["R04_ANNUAL_TURNOVER"]
        t = fv.get("annual_turnover", annual_turnover)
        r04_passed = t >= cfg["min_annual_turnover"]
        _add(r04, r04_passed,
             f"₹{t:,.0f}",
             f"≥ ₹{cfg['min_annual_turnover']:,.0f}",
             f"Annual turnover ₹{t:,.0f} is below the ₹{cfg['min_annual_turnover']:,.0f} eligibility floor.")

        # ── R05: DSCR ────────────────────────────────────────────────────────
        r05 = defs["R05_DSCR"]
        dscr = fv.get("dscr", 0.0)
        r05_passed = dscr >= cfg["min_dscr"]
        _add(r05, r05_passed,
             f"{dscr:.2f}x",
             f"≥ {cfg['min_dscr']}x",
             f"DSCR of {dscr:.2f}x does not meet the minimum {cfg['min_dscr']}x coverage requirement.")

        # ── R06: Cheque Bounces ─────────────────────────────────────────────
        r06 = defs["R06_CHEQUE_BOUNCES"]
        bounces = int(fv.get("cheque_bounces_6m", 0.0))
        r06_passed = bounces <= cfg["max_cheque_bounces_6m"]
        _add(r06, r06_passed,
             f"{bounces} bounce(s) in 6M",
             f"≤ {cfg['max_cheque_bounces_6m']} bounces",
             f"{bounces} inward cheque returns recorded — exceeds the maximum of {cfg['max_cheque_bounces_6m']}.")

        # ── R07: Maximum Exposure ────────────────────────────────────────────
        r07 = defs["R07_MAX_EXPOSURE"]
        exp_ratio = fv.get("exposure_ratio", requested_amount / max(annual_turnover, 1.0))
        abs_ok   = requested_amount <= cfg["max_absolute_exposure"]
        ratio_ok = exp_ratio <= cfg["max_exposure_ratio"]
        r07_passed = abs_ok and ratio_ok
        reason_07 = None
        if not abs_ok:
            reason_07 = f"Requested ₹{requested_amount:,.0f} exceeds absolute exposure cap of ₹{cfg['max_absolute_exposure']:,.0f}."
        elif not ratio_ok:
            reason_07 = (f"Exposure ratio {exp_ratio:.2f}x exceeds maximum allowed "
                         f"{cfg['max_exposure_ratio']}x of annual turnover.")
        _add(r07, r07_passed,
             f"₹{requested_amount:,.0f} ({exp_ratio:.2f}x of turnover)",
             f"≤ {cfg['max_exposure_ratio']}x and ≤ ₹{cfg['max_absolute_exposure']:,.0f}",
             reason_07)

        # ── R08: Document Completeness ──────────────────────────────────────
        r08 = defs["R08_DOC_COMPLETENESS"]
        r08_passed = docs_uploaded >= cfg["min_docs_uploaded"]
        _add(r08, r08_passed,
             f"{docs_uploaded} document(s) uploaded",
             f"≥ {cfg['min_docs_uploaded']} documents",
             f"Only {docs_uploaded} document(s) uploaded. At least {cfg['min_docs_uploaded']} required for automated underwriting.")

        # ── R09: OCR Confidence ─────────────────────────────────────────────
        r09 = defs["R09_OCR_CONFIDENCE"]
        confidence = fv.get("avg_doc_confidence", 1.0)
        r09_passed = confidence >= cfg["min_doc_confidence_threshold"]
        _add(r09, r09_passed,
             f"{confidence*100:.1f}%",
             f"≥ {cfg['min_doc_confidence_threshold']*100:.0f}%",
             f"Average OCR confidence of {confidence*100:.1f}% is below the {cfg['min_doc_confidence_threshold']*100:.0f}% threshold. Manual verification required.")

        # ── R10: Debt Burden ────────────────────────────────────────────────
        r10 = defs["R10_DEBT_BURDEN"]
        burden = fv.get("debt_service_burden_pct", 0.0)
        r10_passed = burden <= cfg["max_debt_burden_pct"]
        _add(r10, r10_passed,
             f"{burden:.1f}% of monthly inflow",
             f"≤ {cfg['max_debt_burden_pct']:.0f}%",
             f"Total obligation burden of {burden:.1f}% exceeds the {cfg['max_debt_burden_pct']:.0f}% stress threshold.")

        # ── Summarise ────────────────────────────────────────────────────────
        all_hard_passed = len(hard_failures) == 0

        if not all_hard_passed:
            elig_status = "NOT_ELIGIBLE"
        elif review_flags:
            elig_status = "NEEDS_REVIEW"
        else:
            elig_status = "ELIGIBLE"

        gate = PolicyGateResult(
            all_passed=all_hard_passed,
            failed_rule_ids=hard_failures + review_flags,
            failed_rule_names=[
                e.rule_name for e in evals
                if not e.passed
            ],
            hard_failure_count=len(hard_failures),
            review_flag_count=len(review_flags),
            eligibility_status=elig_status,
        )

        if not all_hard_passed:
            logger.info(
                "Policy gate: %d hard rule failure(s) — %s",
                len(hard_failures),
                hard_failures,
            )

        return all_hard_passed, evals, gate
