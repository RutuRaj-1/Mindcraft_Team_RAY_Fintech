"""
FinFlow AI — Evidence Validator
================================
Authoritative cross-document verification engine that compares extracted evidence
against customer intent, banking transactions, tax returns, and government registries.

Configurable Tolerances:
- Revenue variance <= info_tolerance (default 5.0%) -> INFO (Consistent)
- Moderate variance (5.0% - 15.0%) -> WARNING (Cautionary Underwriting Notice)
- Major variance (> 15.0%) -> REVIEW_REQUIRED (Credit Officer Manual Verification Required)
* CRITICAL MANDATE: Never automatically label any discrepancy as 'FRAUD'.
"""

import re
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field

from backend.database.models import (
    InconsistencyRecord,
    InconsistencySeverity,
    now_utc_iso
)


@dataclass
class ToleranceConfig:
    """Configurable tolerance rules across all financial and KYC cross-checks."""
    # Revenue checks (GST vs ITR, GST vs Bank Inflow, Declared vs Extracted)
    revenue_info_pct: float = 5.0      # <= 5.0% discrepancy is consistent
    revenue_warning_pct: float = 15.0  # 5.0% < variance <= 15.0% is moderate (warning)
    # > 15.0% triggers REVIEW_REQUIRED (never FRAUD)

    # Vintage vs Registration Date (in months)
    vintage_info_months: int = 3       # <= 3 months difference -> INFO
    vintage_warning_months: int = 12   # 3 < delta <= 12 months -> WARNING
    # > 12 months delta -> REVIEW_REQUIRED

    # Identity and Entity Name Matching (fuzzy score 0.0 to 1.0)
    name_info_threshold: float = 0.85     # >= 0.85 -> INFO (Consistent / Minor styling difference)
    name_warning_threshold: float = 0.60  # 0.60 <= score < 0.85 -> WARNING (Possible DBA or trade alias)
    # < 0.60 -> REVIEW_REQUIRED


class EvidenceValidator:
    """
    Performs deterministic and configurable cross-checks between evidence items.
    Generates structured InconsistencyRecord instances for each comparison.
    """

    def __init__(self, config: Optional[ToleranceConfig] = None):
        self.config = config or ToleranceConfig()

    @staticmethod
    def _clean_str(text: Optional[str]) -> str:
        if not text:
            return ""
        return re.sub(r"[^a-zA-Z0-9\s]", "", str(text)).strip().lower()

    @classmethod
    def calculate_name_similarity(cls, name_a: Optional[str], name_b: Optional[str]) -> float:
        """
        Calculates token-based Jaccard and containment similarity between two names.
        Handles abbreviations (e.g. 'Pvt Ltd' vs 'Private Limited', initials, trade styles).
        """
        if not name_a or not name_b:
            return 0.0

        clean_a = cls._clean_str(name_a)
        clean_b = cls._clean_str(name_b)

        if clean_a == clean_b:
            return 1.0

        # Replace common legal suffixes for fair comparison
        replacements = {
            "pvt ltd": "private limited",
            "pvt": "private",
            "ltd": "limited",
            "prop": "proprietor",
            "enterprises": "ent",
        }
        for k, v in replacements.items():
            clean_a = re.sub(rf"\b{k}\b", v, clean_a)
            clean_b = re.sub(rf"\b{k}\b", v, clean_b)

        tokens_a = set(clean_a.split())
        tokens_b = set(clean_b.split())

        if not tokens_a or not tokens_b:
            return 0.0

        # Intersection over union
        intersection = tokens_a.intersection(tokens_b)
        union = tokens_a.union(tokens_b)
        jaccard = len(intersection) / len(union)

        # Check token containment (e.g. 'Priya Sharma' in 'Priya Sharma Proprietor')
        containment_a = len(intersection) / len(tokens_a)
        containment_b = len(intersection) / len(tokens_b)
        max_containment = max(containment_a, containment_b)

        return round(max(jaccard, max_containment * 0.9), 3)

    @classmethod
    def parse_vintage_from_registration(cls, reg_date_str: Optional[str]) -> Optional[int]:
        """Calculates active operational months from registration date string."""
        if not reg_date_str:
            return None

        # Clean string
        cleaned = str(reg_date_str).strip()
        date_obj = None

        formats = ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%d %b %Y", "%d %B %Y"]
        for fmt in formats:
            try:
                date_obj = datetime.strptime(cleaned, fmt)
                break
            except ValueError:
                continue

        # Regex fallback for YYYY
        if not date_obj:
            match = re.search(r"\b(19\d\d|20\d\d)\b", cleaned)
            if match:
                year = int(match.group(1))
                date_obj = datetime(year, 1, 1)

        if not date_obj:
            return None

        now = datetime.now()
        months = (now.year - date_obj.year) * 12 + (now.month - date_obj.month)
        return max(0, months)

    # ──────────────────────────────────────────────────────────────────────────
    # 1. GST Revenue vs ITR Revenue
    # ──────────────────────────────────────────────────────────────────────────
    def compare_gst_vs_itr(
        self,
        gst_turnover: Optional[float],
        itr_revenue: Optional[float],
        gst_doc_name: str = "GST Return (GSTR-3B)",
        itr_doc_name: str = "ITR-V Acknowledgment"
    ) -> Optional[InconsistencyRecord]:
        if gst_turnover is None or itr_revenue is None:
            return None

        base = max(gst_turnover, itr_revenue, 1.0)
        diff = abs(gst_turnover - itr_revenue)
        variance_pct = round((diff / base) * 100.0, 2)

        fields = ["gst_annual_taxable_turnover", "itr_gross_total_income"]
        docs = [gst_doc_name, itr_doc_name]
        values = {
            "gst_annual_taxable_turnover": gst_turnover,
            "itr_gross_total_income": itr_revenue,
            "variance_inr": diff,
            "variance_pct": variance_pct
        }

        if variance_pct <= self.config.revenue_info_pct:
            severity = InconsistencySeverity.INFO.value
            status = "CONSISTENT"
            explanation = (
                f"GST turnover (₹{gst_turnover:,.2f}) and ITR reported gross income (₹{itr_revenue:,.2f}) "
                f"are highly consistent ({variance_pct}% variance, within configured ±{self.config.revenue_info_pct}% tolerance)."
            )
        elif variance_pct <= self.config.revenue_warning_pct:
            severity = InconsistencySeverity.WARNING.value
            status = "REVIEW_REQUIRED"
            explanation = (
                f"Moderate discrepancy of {variance_pct}% detected between GST turnover (₹{gst_turnover:,.2f}) "
                f"and ITR gross income (₹{itr_revenue:,.2f}). Officer inspection recommended for tax reconciliation."
            )
        else:
            severity = InconsistencySeverity.REVIEW_REQUIRED.value
            status = "REVIEW_REQUIRED"
            explanation = (
                f"Significant discrepancy of {variance_pct}% observed between GST sales (₹{gst_turnover:,.2f}) "
                f"and ITR revenue (₹{itr_revenue:,.2f}). Requires underwriter verification of non-taxable income or timing differences."
            )

        return InconsistencyRecord(
            inconsistency_id=f"inc_{uuid.uuid4().hex[:10]}",
            type="GST_VS_ITR_REVENUE",
            severity=severity,
            fields_involved=fields,
            documents_involved=docs,
            values=values,
            expected_range={
                "max_tolerance_pct": self.config.revenue_info_pct,
                "warning_threshold_pct": self.config.revenue_warning_pct,
                "rule": f"<= {self.config.revenue_info_pct}% INFO, <= {self.config.revenue_warning_pct}% WARNING, > {self.config.revenue_warning_pct}% REVIEW_REQUIRED"
            },
            explanation=explanation,
            status=status,
            variance_pct=variance_pct
        )

    # ──────────────────────────────────────────────────────────────────────────
    # 2. GST Revenue vs Bank Inflow
    # ──────────────────────────────────────────────────────────────────────────
    def compare_gst_vs_bank(
        self,
        gst_turnover: Optional[float],
        bank_credits: Optional[float],
        gst_doc_name: str = "GST Return (GSTR-3B)",
        bank_doc_name: str = "Bank Statement (12M)"
    ) -> Optional[InconsistencyRecord]:
        if gst_turnover is None or bank_credits is None:
            return None

        base = max(gst_turnover, bank_credits, 1.0)
        diff = abs(gst_turnover - bank_credits)
        variance_pct = round((diff / base) * 100.0, 2)

        fields = ["gst_annual_taxable_turnover", "annual_credit_turnover"]
        docs = [gst_doc_name, bank_doc_name]
        values = {
            "gst_annual_taxable_turnover": gst_turnover,
            "bank_annual_credit_turnover": bank_credits,
            "variance_inr": diff,
            "variance_pct": variance_pct
        }

        if variance_pct <= self.config.revenue_info_pct:
            severity = InconsistencySeverity.INFO.value
            status = "CONSISTENT"
            explanation = (
                f"GST turnover (₹{gst_turnover:,.2f}) aligns closely with annualized bank credit inflows "
                f"(₹{bank_credits:,.2f}) with {variance_pct}% variance (within ±{self.config.revenue_info_pct}% tolerance)."
            )
        elif variance_pct <= self.config.revenue_warning_pct:
            severity = InconsistencySeverity.WARNING.value
            status = "REVIEW_REQUIRED"
            explanation = (
                f"A moderate variance of {variance_pct}% detected between GST declared sales (₹{gst_turnover:,.2f}) "
                f"and total bank inflows (₹{bank_credits:,.2f}). Verify debtor collections and cash sales."
            )
        else:
            severity = InconsistencySeverity.REVIEW_REQUIRED.value
            status = "REVIEW_REQUIRED"
            explanation = (
                f"Major divergence of {variance_pct}% between GST turnover (₹{gst_turnover:,.2f}) "
                f"and bank deposits (₹{bank_credits:,.2f}). Officer review required to inspect unbanked turnover or inter-account transfers."
            )

        return InconsistencyRecord(
            inconsistency_id=f"inc_{uuid.uuid4().hex[:10]}",
            type="GST_VS_BANK_INFLOW",
            severity=severity,
            fields_involved=fields,
            documents_involved=docs,
            values=values,
            expected_range={
                "max_tolerance_pct": self.config.revenue_info_pct,
                "warning_threshold_pct": self.config.revenue_warning_pct,
                "rule": f"<= {self.config.revenue_info_pct}% INFO, <= {self.config.revenue_warning_pct}% WARNING, > {self.config.revenue_warning_pct}% REVIEW_REQUIRED"
            },
            explanation=explanation,
            status=status,
            variance_pct=variance_pct
        )

    # ──────────────────────────────────────────────────────────────────────────
    # 3. Declared Revenue vs Extracted Revenue
    # ──────────────────────────────────────────────────────────────────────────
    def compare_declared_vs_extracted(
        self,
        declared_revenue: Optional[float],
        extracted_revenue: Optional[float],
        extracted_source_name: str = "Verified Tax / Banking Evidence"
    ) -> Optional[InconsistencyRecord]:
        if declared_revenue is None or extracted_revenue is None:
            return None

        base = max(declared_revenue, extracted_revenue, 1.0)
        diff = abs(declared_revenue - extracted_revenue)
        variance_pct = round((diff / base) * 100.0, 2)

        fields = ["declared_annual_turnover", "extracted_annual_revenue"]
        docs = ["Applicant Natural Language Intent", extracted_source_name]
        values = {
            "declared_annual_turnover": declared_revenue,
            "extracted_annual_revenue": extracted_revenue,
            "variance_inr": diff,
            "variance_pct": variance_pct
        }

        if variance_pct <= self.config.revenue_info_pct:
            severity = InconsistencySeverity.INFO.value
            status = "CONSISTENT"
            explanation = (
                f"Customer declared revenue of ₹{declared_revenue:,.2f} matches verified document evidence "
                f"of ₹{extracted_revenue:,.2f} within ±{self.config.revenue_info_pct}% tolerance ({variance_pct}% variance)."
            )
        elif variance_pct <= self.config.revenue_warning_pct:
            severity = InconsistencySeverity.WARNING.value
            status = "REVIEW_REQUIRED"
            explanation = (
                f"Applicant declared ₹{declared_revenue:,.2f} turnover, while document extractions reflect ₹{extracted_revenue:,.2f} "
                f"({variance_pct}% variance). Underwriter to clarify estimates vs actual audited filings."
            )
        else:
            severity = InconsistencySeverity.REVIEW_REQUIRED.value
            status = "REVIEW_REQUIRED"
            explanation = (
                f"Significant variance of {variance_pct}% between applicant stated revenue (₹{declared_revenue:,.2f}) "
                f"and verified evidentiary revenue (₹{extracted_revenue:,.2f}). Human review required."
            )

        return InconsistencyRecord(
            inconsistency_id=f"inc_{uuid.uuid4().hex[:10]}",
            type="DECLARED_VS_EXTRACTED_REVENUE",
            severity=severity,
            fields_involved=fields,
            documents_involved=docs,
            values=values,
            expected_range={
                "max_tolerance_pct": self.config.revenue_info_pct,
                "warning_threshold_pct": self.config.revenue_warning_pct,
                "rule": f"<= {self.config.revenue_info_pct}% INFO, <= {self.config.revenue_warning_pct}% WARNING, > {self.config.revenue_warning_pct}% REVIEW_REQUIRED"
            },
            explanation=explanation,
            status=status,
            variance_pct=variance_pct
        )

    # ──────────────────────────────────────────────────────────────────────────
    # 4. Business Vintage vs Registration Date
    # ──────────────────────────────────────────────────────────────────────────
    def compare_vintage_vs_registration(
        self,
        declared_vintage_months: Optional[int],
        registration_date_or_vintage: Any,
        reg_doc_name: str = "Business Registration (Udyam / Inc)"
    ) -> Optional[InconsistencyRecord]:
        if declared_vintage_months is None or not registration_date_or_vintage:
            return None

        # Convert registration date to months if string
        if isinstance(registration_date_or_vintage, (int, float)):
            derived_months = int(registration_date_or_vintage)
            reg_date_repr = f"{derived_months} months"
        else:
            derived_months = self.parse_vintage_from_registration(str(registration_date_or_vintage))
            reg_date_repr = str(registration_date_or_vintage)

        if derived_months is None:
            return None

        delta_months = abs(declared_vintage_months - derived_months)

        fields = ["vintage_months", "registration_date"]
        docs = ["Applicant Stated Vintage", reg_doc_name]
        values = {
            "declared_vintage_months": declared_vintage_months,
            "derived_vintage_months": derived_months,
            "registration_date": reg_date_repr,
            "delta_months": delta_months
        }

        if delta_months <= self.config.vintage_info_months:
            severity = InconsistencySeverity.INFO.value
            status = "CONSISTENT"
            explanation = (
                f"Applicant declared business vintage ({declared_vintage_months} months / ~{declared_vintage_months//12} yrs) "
                f"matches official incorporation/Udyam date ({derived_months} months active, within {self.config.vintage_info_months} months tolerance)."
            )
        elif delta_months <= self.config.vintage_warning_months:
            severity = InconsistencySeverity.WARNING.value
            status = "REVIEW_REQUIRED"
            explanation = (
                f"Moderate divergence of {delta_months} months between declared vintage ({declared_vintage_months} mo) "
                f"and certificate registration date ({derived_months} mo). May reflect unregistered prior informal operations."
            )
        else:
            severity = InconsistencySeverity.REVIEW_REQUIRED.value
            status = "REVIEW_REQUIRED"
            explanation = (
                f"Discrepancy of {delta_months} months between stated business vintage ({declared_vintage_months} mo) "
                f"and official incorporation date ({derived_months} mo). Credit officer review required to establish verified enterprise track record."
            )

        return InconsistencyRecord(
            inconsistency_id=f"inc_{uuid.uuid4().hex[:10]}",
            type="VINTAGE_VS_REGISTRATION_DATE",
            severity=severity,
            fields_involved=fields,
            documents_involved=docs,
            values=values,
            expected_range={
                "info_months": self.config.vintage_info_months,
                "warning_months": self.config.vintage_warning_months,
                "rule": f"<= {self.config.vintage_info_months} mo INFO, <= {self.config.vintage_warning_months} mo WARNING, > {self.config.vintage_warning_months} mo REVIEW_REQUIRED"
            },
            explanation=explanation,
            status=status,
            variance_pct=float(delta_months)
        )

    # ──────────────────────────────────────────────────────────────────────────
    # 5. Applicant Name vs Document Name
    # ──────────────────────────────────────────────────────────────────────────
    def compare_applicant_vs_document_name(
        self,
        applicant_name: Optional[str],
        doc_name_value: Optional[str],
        doc_type_name: str = "Identity / Tax Record"
    ) -> Optional[InconsistencyRecord]:
        if not applicant_name or not doc_name_value:
            return None

        sim = self.calculate_name_similarity(applicant_name, doc_name_value)
        fields = ["applicant_name", "document_entity_name"]
        docs = ["User Profile / Application", doc_type_name]
        values = {
            "applicant_name": applicant_name,
            "document_entity_name": doc_name_value,
            "similarity_score": sim
        }

        if sim >= self.config.name_info_threshold:
            severity = InconsistencySeverity.INFO.value
            status = "CONSISTENT"
            explanation = (
                f"Applicant name '{applicant_name}' matches verified name in {doc_type_name} "
                f"('{doc_name_value}') with {round(sim*100)}% match confidence."
            )
        elif sim >= self.config.name_warning_threshold:
            severity = InconsistencySeverity.WARNING.value
            status = "REVIEW_REQUIRED"
            explanation = (
                f"Minor name difference detected: '{applicant_name}' vs '{doc_name_value}' "
                f"in {doc_type_name} ({round(sim*100)}% similarity). Likely includes trade alias, middle initials, or title."
            )
        else:
            severity = InconsistencySeverity.REVIEW_REQUIRED.value
            status = "REVIEW_REQUIRED"
            explanation = (
                f"Low name similarity ({round(sim*100)}%) between applicant '{applicant_name}' and "
                f"name on {doc_type_name} ('{doc_name_value}'). Officer verification required to confirm authorized signatory or director link."
            )

        return InconsistencyRecord(
            inconsistency_id=f"inc_{uuid.uuid4().hex[:10]}",
            type="APPLICANT_VS_DOCUMENT_NAME",
            severity=severity,
            fields_involved=fields,
            documents_involved=docs,
            values=values,
            expected_range={
                "info_similarity": self.config.name_info_threshold,
                "warning_similarity": self.config.name_warning_threshold,
                "rule": f">= {self.config.name_info_threshold} INFO, >= {self.config.name_warning_threshold} WARNING, < {self.config.name_warning_threshold} REVIEW_REQUIRED"
            },
            explanation=explanation,
            status=status,
            variance_pct=round((1.0 - sim) * 100.0, 2)
        )

    # ──────────────────────────────────────────────────────────────────────────
    # 6. Account Holder vs Applicant / Business Name
    # ──────────────────────────────────────────────────────────────────────────
    def compare_account_holder_vs_business(
        self,
        account_holder: Optional[str],
        applicant_name: Optional[str],
        business_name: Optional[str],
        bank_doc_name: str = "Bank Statement (12M)"
    ) -> Optional[InconsistencyRecord]:
        if not account_holder or (not applicant_name and not business_name):
            return None

        sim_business = self.calculate_name_similarity(account_holder, business_name) if business_name else 0.0
        sim_applicant = self.calculate_name_similarity(account_holder, applicant_name) if applicant_name else 0.0
        best_sim = max(sim_business, sim_applicant)
        matched_target = "Business Entity" if sim_business >= sim_applicant else "Applicant Individual"

        fields = ["account_holder", "business_name", "applicant_name"]
        docs = [bank_doc_name, "Application Metadata"]
        values = {
            "account_holder": account_holder,
            "business_name": business_name,
            "applicant_name": applicant_name,
            "best_match_entity": matched_target,
            "similarity_score": best_sim
        }

        if best_sim >= self.config.name_info_threshold:
            severity = InconsistencySeverity.INFO.value
            status = "CONSISTENT"
            explanation = (
                f"Bank account holder '{account_holder}' matches {matched_target} "
                f"with {round(best_sim*100)}% identity confidence."
            )
        elif best_sim >= self.config.name_warning_threshold:
            severity = InconsistencySeverity.WARNING.value
            status = "REVIEW_REQUIRED"
            explanation = (
                f"Bank account holder '{account_holder}' has moderate correspondence ({round(best_sim*100)}%) with "
                f"{matched_target}. Verify partnership or proprietorship mandate."
            )
        else:
            severity = InconsistencySeverity.REVIEW_REQUIRED.value
            status = "REVIEW_REQUIRED"
            explanation = (
                f"Bank account holder '{account_holder}' does not match either the applicant ('{applicant_name}') "
                f"or business name ('{business_name}') ({round(best_sim*100)}% match). Manual mandate verification required."
            )

        return InconsistencyRecord(
            inconsistency_id=f"inc_{uuid.uuid4().hex[:10]}",
            type="ACCOUNT_HOLDER_VS_BUSINESS",
            severity=severity,
            fields_involved=fields,
            documents_involved=docs,
            values=values,
            expected_range={
                "info_similarity": self.config.name_info_threshold,
                "warning_similarity": self.config.name_warning_threshold,
                "rule": f">= {self.config.name_info_threshold} INFO, >= {self.config.name_warning_threshold} WARNING, < {self.config.name_warning_threshold} REVIEW_REQUIRED"
            },
            explanation=explanation,
            status=status,
            variance_pct=round((1.0 - best_sim) * 100.0, 2)
        )
