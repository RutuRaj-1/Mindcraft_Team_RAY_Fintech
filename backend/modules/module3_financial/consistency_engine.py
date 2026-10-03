import uuid
from typing import Dict, Any, List
from backend.database.models import ConsistencyReport, DiscrepancyItem
from backend.database.firestore_client import db

class ConsistencyEngine:
    @staticmethod
    def verify_consistency(application_id: str) -> ConsistencyReport:
        evidence = db.list("evidence_ledger", {"application_id": application_id})
        app = db.get("applications", application_id) or {}

        field_map: Dict[str, Any] = {}
        for item in evidence:
            field_map[item.get("field_name")] = item.get("field_value")

        discrepancies: List[DiscrepancyItem] = []

        # 1. Compare Bank Credits vs GST Turnover
        bank_credits = field_map.get("annual_credit_turnover")
        gst_turnover = field_map.get("gst_annual_taxable_turnover")
        declared_turnover = app.get("annual_turnover")

        if bank_credits is not None and gst_turnover is not None:
            # Calculate percentage variance
            base = max(bank_credits, gst_turnover, 1.0)
            diff = abs(bank_credits - gst_turnover)
            variance_pct = (diff / base) * 100.0

            if variance_pct > 15.0:
                severity = "HIGH" if variance_pct > 25.0 else "MEDIUM"
                discrepancies.append(DiscrepancyItem(
                    field="Annual Turnover (GST vs Bank)",
                    doc_a_name="GSTR-3B Taxable Turnover",
                    doc_a_value=f"₹{gst_turnover:,.2f}",
                    doc_b_name="Bank Statement Total Credits",
                    doc_b_value=f"₹{bank_credits:,.2f}",
                    variance_pct=round(variance_pct, 2),
                    severity=severity,
                    explanation=f"A {variance_pct:.1f}% divergence detected between GST declared sales and total bank credits."
                ))

        # 2. Compare Declared Turnover vs GST Turnover
        if declared_turnover and gst_turnover:
            diff = abs(declared_turnover - gst_turnover)
            variance_pct = (diff / max(declared_turnover, 1.0)) * 100.0
            if variance_pct > 20.0:
                discrepancies.append(DiscrepancyItem(
                    field="Turnover (Declared vs GST)",
                    doc_a_name="Applicant Intent Declaration",
                    doc_a_value=f"₹{declared_turnover:,.2f}",
                    doc_b_name="GST Returns",
                    doc_b_value=f"₹{gst_turnover:,.2f}",
                    variance_pct=round(variance_pct, 2),
                    severity="HIGH" if variance_pct > 30 else "MEDIUM",
                    explanation=f"Applicant declared ₹{declared_turnover:,.2f} turnover, but GST filings reflect ₹{gst_turnover:,.2f}."
                ))

        # 3. PAN matching between ITR / GSTIN / PAN card
        gstin = field_map.get("gstin") or app.get("gstin", "")
        pan = field_map.get("pan") or field_map.get("pan_number") or app.get("pan", "")
        if gstin and pan and len(gstin) >= 12:
            extracted_pan_from_gst = gstin[2:12]
            if extracted_pan_from_gst.upper() != pan.upper():
                discrepancies.append(DiscrepancyItem(
                    field="Entity Identity / PAN Mismatch",
                    doc_a_name="GST Certificate",
                    doc_a_value=extracted_pan_from_gst,
                    doc_b_name="PAN Card / ITR",
                    doc_b_value=pan,
                    variance_pct=100.0,
                    severity="HIGH",
                    explanation="PAN embedded within GSTIN does not match applicant PAN card."
                ))

        # 4. Inward cheque bounces
        bounces = field_map.get("inward_cheque_bounces_6m", 0)
        if bounces > 2:
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

        flagged_count = len(discrepancies)
        is_consistent = flagged_count == 0
        discrepancy_score = min(1.0, flagged_count * 0.25)

        report_id = f"rep_{application_id}"
        report = ConsistencyReport(
            report_id=report_id,
            application_id=application_id,
            is_consistent=is_consistent,
            discrepancy_score=discrepancy_score,
            flagged_count=flagged_count,
            discrepancies=discrepancies
        )

        db.set("consistency_reports", report_id, report.model_dump())
        return report
