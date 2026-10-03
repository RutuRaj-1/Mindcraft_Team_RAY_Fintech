"""
FinFlow AI — Consistency Engine
================================
Authoritative cross-document triangulation and consistency verification engine.
Executes multi-way reconciliation across:
1. GST Revenue vs ITR Revenue
2. GST Revenue vs Bank Inflow
3. Declared Revenue vs Extracted Revenue
4. Business Vintage vs Registration Date
5. Applicant Name vs Document Entity Name
6. Account Holder vs Applicant / Business Name

Strict Underwriting Policies:
- Discrepancy within tolerance -> INFO (Consistent)
- Moderate discrepancy -> WARNING
- Major discrepancy -> REVIEW_REQUIRED
* MANDATE: Never automatically label any discrepancy as 'FRAUD'.
"""

import uuid
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from backend.database.models import (
    ConsistencyReport,
    DiscrepancyItem,
    InconsistencyRecord,
    InconsistencySeverity,
    now_utc_iso
)
from backend.database.firestore_client import db
from backend.database.repositories import evidence_repo, document_repo, application_repo
from backend.modules.module3_financial.evidence_validator import EvidenceValidator, ToleranceConfig

logger = logging.getLogger(__name__)


class ConsistencyEngine:
    """
    Evaluates consistency across all uploaded documents, DigiLocker credentials,
    and applicant declared parameters.
    """

    @classmethod
    def verify_consistency(
        cls,
        application_id: str,
        tolerance_config: Optional[ToleranceConfig] = None
    ) -> ConsistencyReport:
        validator = EvidenceValidator(config=tolerance_config or ToleranceConfig())

        # 1. Gather all evidence items for application
        evidence_items: List[Dict[str, Any]] = []
        try:
            repo_items = evidence_repo.list_by_application(application_id)
            if repo_items:
                evidence_items = [it.model_dump() for it in repo_items]
        except Exception:
            pass

        if not evidence_items:
            evidence_items = db.list("evidence_ledger", {"application_id": application_id}) or []

        # 2. Gather application and journey details
        app = None
        try:
            app = application_repo.get(application_id)
        except Exception:
            pass
        if not app:
            app = db.get("applications", application_id) or db.get("journeys", application_id) or {}
        if hasattr(app, "model_dump"):
            app_data = app.model_dump()
        else:
            app_data = app or {}

        # 3. Gather documents for metadata
        docs_list: List[Dict[str, Any]] = []
        try:
            repo_docs = document_repo.list_by_application(application_id)
            if repo_docs:
                docs_list = [d.model_dump() for d in repo_docs]
        except Exception:
            pass
        if not docs_list:
            docs_list = db.list("documents", {"application_id": application_id}) or []

        # Build document type to filename mapping
        doc_names: Dict[str, str] = {
            "GST_RETURN": "GSTR-3B Tax Filing",
            "ITR": "ITR-V Acknowledgment",
            "BANK_STATEMENT": "Bank Statement (12M)",
            "BUSINESS_REGISTRATION": "Udyam / Inc Certificate",
            "PAN": "PAN Card",
            "AADHAAR": "Aadhaar e-KYC"
        }
        for d in docs_list:
            dtype = d.get("type") or d.get("doc_type")
            fname = d.get("fileName") or d.get("file_name")
            if dtype and fname:
                doc_names[dtype] = fname

        # 4. Extract field map from latest evidence items
        field_map: Dict[str, Any] = {}
        for it in evidence_items:
            fname = it.get("fieldName") or it.get("field_name")
            fval = it.get("normalizedValue") or it.get("normalized_value")
            if fval is None:
                fval = it.get("value") or it.get("field_value")
            if fname and fval is not None:
                field_map[fname] = fval

        inconsistencies: List[InconsistencyRecord] = []
        discrepancies: List[DiscrepancyItem] = []

        # ── COMPARISON 1: GST Revenue vs ITR Revenue ──────────────────────────
        gst_turnover = field_map.get("gst_annual_taxable_turnover") or field_map.get("turnover")
        itr_revenue = field_map.get("itr_gross_total_income") or field_map.get("gross_income") or field_map.get("business_income")

        if gst_turnover is not None and itr_revenue is not None:
            inc = validator.compare_gst_vs_itr(
                gst_turnover=float(gst_turnover),
                itr_revenue=float(itr_revenue),
                gst_doc_name=doc_names.get("GST_RETURN", "GST Return (GSTR-3B)"),
                itr_doc_name=doc_names.get("ITR", "ITR-V Acknowledgment")
            )
            if inc:
                inconsistencies.append(inc)
                if inc.severity in ("WARNING", "REVIEW_REQUIRED"):
                    discrepancies.append(DiscrepancyItem(
                        field="Annual Turnover (GST vs ITR)",
                        doc_a_name=doc_names.get("GST_RETURN", "GST Return"),
                        doc_a_value=f"₹{gst_turnover:,.2f}",
                        doc_b_name=doc_names.get("ITR", "ITR-V"),
                        doc_b_value=f"₹{itr_revenue:,.2f}",
                        variance_pct=inc.variance_pct or 0.0,
                        severity=inc.severity,
                        explanation=inc.explanation
                    ))

        # ── COMPARISON 2: GST Revenue vs Bank Inflow ──────────────────────────
        bank_credits = field_map.get("annual_credit_turnover") or field_map.get("credits")

        if gst_turnover is not None and bank_credits is not None:
            inc = validator.compare_gst_vs_bank(
                gst_turnover=float(gst_turnover),
                bank_credits=float(bank_credits),
                gst_doc_name=doc_names.get("GST_RETURN", "GST Return (GSTR-3B)"),
                bank_doc_name=doc_names.get("BANK_STATEMENT", "Bank Statement (12M)")
            )
            if inc:
                inconsistencies.append(inc)
                if inc.severity in ("WARNING", "REVIEW_REQUIRED"):
                    discrepancies.append(DiscrepancyItem(
                        field="Annual Turnover (GST vs Bank Inflow)",
                        doc_a_name=doc_names.get("GST_RETURN", "GST Return"),
                        doc_a_value=f"₹{gst_turnover:,.2f}",
                        doc_b_name=doc_names.get("BANK_STATEMENT", "Bank Statement"),
                        doc_b_value=f"₹{bank_credits:,.2f}",
                        variance_pct=inc.variance_pct or 0.0,
                        severity=inc.severity,
                        explanation=inc.explanation
                    ))

        # ── COMPARISON 3: Declared Revenue vs Extracted Revenue ────────────────
        declared_turnover = app_data.get("annualTurnover") or app_data.get("annual_turnover")
        extracted_turnover = gst_turnover or bank_credits or itr_revenue

        if declared_turnover is not None and extracted_turnover is not None:
            inc = validator.compare_declared_vs_extracted(
                declared_revenue=float(declared_turnover),
                extracted_revenue=float(extracted_turnover),
                extracted_source_name=doc_names.get("GST_RETURN", "Verified Financial Evidence")
            )
            if inc:
                inconsistencies.append(inc)
                if inc.severity in ("WARNING", "REVIEW_REQUIRED"):
                    discrepancies.append(DiscrepancyItem(
                        field="Turnover (Declared vs Extracted)",
                        doc_a_name="Applicant Stated Intent",
                        doc_a_value=f"₹{declared_turnover:,.2f}",
                        doc_b_name=doc_names.get("GST_RETURN", "GST / Bank Evidence"),
                        doc_b_value=f"₹{extracted_turnover:,.2f}",
                        variance_pct=inc.variance_pct or 0.0,
                        severity=inc.severity,
                        explanation=inc.explanation
                    ))

        # ── COMPARISON 4: Business Vintage vs Registration Date ───────────────
        declared_vintage = app_data.get("vintageMonths") or app_data.get("vintage_months")
        reg_date = field_map.get("registration_date") or field_map.get("incorporation_date")

        if declared_vintage is not None and reg_date:
            inc = validator.compare_vintage_vs_registration(
                declared_vintage_months=int(declared_vintage),
                registration_date_or_vintage=reg_date,
                reg_doc_name=doc_names.get("BUSINESS_REGISTRATION", "Business Registration (Udyam / Inc)")
            )
            if inc:
                inconsistencies.append(inc)
                if inc.severity in ("WARNING", "REVIEW_REQUIRED"):
                    discrepancies.append(DiscrepancyItem(
                        field="Business Vintage vs Registration Date",
                        doc_a_name="Applicant Declared Vintage",
                        doc_a_value=f"{declared_vintage} months",
                        doc_b_name=doc_names.get("BUSINESS_REGISTRATION", "Registration Certificate"),
                        doc_b_value=str(reg_date),
                        variance_pct=inc.variance_pct or 0.0,
                        severity=inc.severity,
                        explanation=inc.explanation
                    ))

        # ── COMPARISON 5: Applicant Name vs Document Name ─────────────────────
        applicant_name = app_data.get("userName") or app_data.get("user_name") or app_data.get("businessName") or app_data.get("business_name")
        doc_entity_name = field_map.get("legal_name") or field_map.get("pan_holder_name") or field_map.get("holder_name") or field_map.get("business_name")

        if applicant_name and doc_entity_name:
            inc = validator.compare_applicant_vs_document_name(
                applicant_name=str(applicant_name),
                doc_name_value=str(doc_entity_name),
                doc_type_name=doc_names.get("PAN", "KYC / Tax Record")
            )
            if inc:
                inconsistencies.append(inc)
                if inc.severity in ("WARNING", "REVIEW_REQUIRED"):
                    discrepancies.append(DiscrepancyItem(
                        field="Applicant Name vs Document Identity",
                        doc_a_name="Application User Identity",
                        doc_a_value=str(applicant_name),
                        doc_b_name=doc_names.get("PAN", "KYC Document"),
                        doc_b_value=str(doc_entity_name),
                        variance_pct=inc.variance_pct or 0.0,
                        severity=inc.severity,
                        explanation=inc.explanation
                    ))

        # ── COMPARISON 6: Account Holder vs Applicant / Business Name ─────────
        account_holder = field_map.get("account_holder") or field_map.get("holder_name")
        biz_name = app_data.get("businessName") or app_data.get("business_name")

        if account_holder and (applicant_name or biz_name):
            inc = validator.compare_account_holder_vs_business(
                account_holder=str(account_holder),
                applicant_name=str(applicant_name) if applicant_name else None,
                business_name=str(biz_name) if biz_name else None,
                bank_doc_name=doc_names.get("BANK_STATEMENT", "Bank Statement (12M)")
            )
            if inc:
                inconsistencies.append(inc)
                if inc.severity in ("WARNING", "REVIEW_REQUIRED"):
                    discrepancies.append(DiscrepancyItem(
                        field="Bank Account Holder vs Business/Applicant",
                        doc_a_name=doc_names.get("BANK_STATEMENT", "Bank Statement"),
                        doc_a_value=str(account_holder),
                        doc_b_name="Application Record",
                        doc_b_value=str(biz_name or applicant_name),
                        variance_pct=inc.variance_pct or 0.0,
                        severity=inc.severity,
                        explanation=inc.explanation
                    ))

        # ── Legacy Inward Cheque Bounces Check ────────────────────────────────
        bounces = field_map.get("inward_cheque_bounces_6m", 0)
        if isinstance(bounces, (int, float)) and bounces > 2:
            discrepancies.append(DiscrepancyItem(
                field="Banking Cleanliness / ECS Returns",
                doc_a_name="Bank Statement",
                doc_a_value=f"{bounces} bounces",
                doc_b_name="Underwriting Policy Threshold",
                doc_b_value="Max 2 bounces",
                variance_pct=float(bounces * 50),
                severity="HIGH",
                explanation=f"{bounces} inward cheque bounces in the last 6 months exceeds policy maximum limit of 2."
            ))

        # ── Calculate Summary Statistics ──────────────────────────────────────
        review_required_count = sum(1 for inc in inconsistencies if inc.severity == InconsistencySeverity.REVIEW_REQUIRED.value)
        warning_count = sum(1 for inc in inconsistencies if inc.severity == InconsistencySeverity.WARNING.value)
        info_count = sum(1 for inc in inconsistencies if inc.severity == InconsistencySeverity.INFO.value)

        # Discrepancy score (0.0 to 1.0)
        # Heavy weight for review_required (0.35 each), moderate for warning (0.15 each), info (0.0)
        discrepancy_score = round(min(1.0, (review_required_count * 0.35) + (warning_count * 0.15)), 2)
        is_consistent = review_required_count == 0 and len(discrepancies) == 0

        severity_breakdown = {
            "INFO": info_count,
            "WARNING": warning_count,
            "REVIEW_REQUIRED": review_required_count,
            "TOTAL_CHECKS": len(inconsistencies)
        }

        summary_msg = (
            f"Evaluated {len(inconsistencies)} cross-document parameters. "
            f"{info_count} consistent within configured tolerance (INFO), "
            f"{warning_count} moderate variances (WARNING), and "
            f"{review_required_count} requiring underwriter inspection (REVIEW_REQUIRED). "
            f"Zero fraud automated flags."
        )

        report_id = f"rep_{application_id}"
        report = ConsistencyReport(
            report_id=report_id,
            application_id=application_id,
            is_consistent=is_consistent,
            discrepancy_score=discrepancy_score,
            flagged_count=len(discrepancies),
            discrepancies=discrepancies,
            inconsistencies=inconsistencies,
            severity_breakdown=severity_breakdown,
            summary=summary_msg,
            generated_at=datetime.now(timezone.utc)
        )

        # Persist report
        try:
            db.set("consistency_reports", report_id, report.model_dump())
        except Exception as e:
            logger.warning(f"Failed to persist consistency report {report_id}: {e}")

        return report
