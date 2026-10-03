"""
FinFlow AI — Evidence Verification Layer Test Suite
===================================================
Tests ConsistencyEngine, EvidenceValidator, and EvidenceProvenanceService:
- Cross-document comparisons across 6 key axes:
  1. GST revenue vs ITR revenue
  2. GST revenue vs Bank inflow
  3. Declared revenue vs Extracted revenue
  4. Business vintage vs Registration date
  5. Applicant name vs Document name
  6. Account holder vs Applicant/business
- Configurable tolerance rules (INFO <= 5%, WARNING <= 15%, REVIEW_REQUIRED > 15%)
- Strict verification that NO automated discrepancy is labeled as FRAUD
- Full provenance traceability to document, page, field, confidence, and cross-checks
- API endpoints:
  GET /api/v1/journeys/{id}/evidence
  GET /api/v1/journeys/{id}/consistency
  GET /api/v1/evidence/{id}/provenance
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.modules.module3_financial.evidence_validator import EvidenceValidator, ToleranceConfig
from backend.modules.module3_financial.consistency_engine import ConsistencyEngine
from backend.modules.module3_financial.evidence_provenance_service import EvidenceProvenanceService
from backend.database.models import InconsistencySeverity
from backend.routers.demo_router import seed_demo_data

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_data():
    seed_demo_data()


def test_evidence_validator_revenue_tolerances():
    """Validates revenue tolerances: INFO (<=5%), WARNING (5-15%), REVIEW_REQUIRED (>15%). Never FRAUD."""
    validator = EvidenceValidator()

    # Case 1: Consistent within 5% tolerance -> INFO
    # 6.144 Cr vs 6.00 Cr -> ~2.3% variance
    res_info = validator.compare_gst_vs_itr(61440000.0, 60000000.0)
    assert res_info is not None
    assert res_info.severity == InconsistencySeverity.INFO.value
    assert res_info.status == "CONSISTENT"
    assert "fraud" not in res_info.severity.lower()
    assert "fraud" not in res_info.status.lower()

    # Case 2: Moderate variance 5% - 15% -> WARNING
    # 6.144 Cr vs 5.50 Cr -> ~10.5% variance
    res_warn = validator.compare_gst_vs_itr(61440000.0, 55000000.0)
    assert res_warn is not None
    assert res_warn.severity == InconsistencySeverity.WARNING.value
    assert res_warn.status == "REVIEW_REQUIRED"
    assert "fraud" not in res_warn.severity.lower()

    # Case 3: Major variance > 15% -> REVIEW_REQUIRED (Never FRAUD)
    # 6.144 Cr vs 4.00 Cr -> ~34.9% variance
    res_review = validator.compare_gst_vs_itr(61440000.0, 40000000.0)
    assert res_review is not None
    assert res_review.severity == InconsistencySeverity.REVIEW_REQUIRED.value
    assert res_review.status == "REVIEW_REQUIRED"
    assert res_review.severity != "FRAUD"
    assert "fraud" not in res_review.explanation.lower()


def test_evidence_validator_all_six_comparisons():
    """Tests all 6 cross-document comparison methods specified in FinFlow requirements."""
    validator = EvidenceValidator()

    # 1. GST vs ITR
    inc_1 = validator.compare_gst_vs_itr(61440000.0, 59760000.0)
    assert inc_1 is not None
    assert inc_1.type == "GST_VS_ITR_REVENUE"
    assert "gst_annual_taxable_turnover" in inc_1.fields_involved
    assert "itr_gross_total_income" in inc_1.fields_involved

    # 2. GST vs Bank Inflow
    inc_2 = validator.compare_gst_vs_bank(61440000.0, 60720000.0)
    assert inc_2 is not None
    assert inc_2.type == "GST_VS_BANK_INFLOW"
    assert "annual_credit_turnover" in inc_2.fields_involved

    # 3. Declared vs Extracted Revenue
    inc_3 = validator.compare_declared_vs_extracted(60000000.0, 61440000.0)
    assert inc_3 is not None
    assert inc_3.type == "DECLARED_VS_EXTRACTED_REVENUE"

    # 4. Business Vintage vs Registration Date
    inc_4 = validator.compare_vintage_vs_registration(84, "2018-04-10")
    assert inc_4 is not None
    assert inc_4.type == "VINTAGE_VS_REGISTRATION_DATE"

    # 5. Applicant Name vs Document Name
    inc_5 = validator.compare_applicant_vs_document_name("Priya Sharma", "Priya Sharma (Proprietor)")
    assert inc_5 is not None
    assert inc_5.type == "APPLICANT_VS_DOCUMENT_NAME"
    assert inc_5.severity == InconsistencySeverity.INFO.value

    # 6. Account Holder vs Business/Applicant
    inc_6 = validator.compare_account_holder_vs_business("Sharma Textiles Pvt Ltd", "Priya Sharma", "Sharma Textiles")
    assert inc_6 is not None
    assert inc_6.type == "ACCOUNT_HOLDER_VS_BUSINESS"
    assert inc_6.severity == InconsistencySeverity.INFO.value


def test_consistency_engine_reconciliation():
    """Runs ConsistencyEngine on seed journey and checks inconsistency records structure."""
    rep = ConsistencyEngine.verify_consistency("app_priya_001")
    assert rep is not None
    assert hasattr(rep, "inconsistencies")
    assert isinstance(rep.inconsistencies, list)
    assert hasattr(rep, "severity_breakdown")

    # Check each inconsistency record schema
    for inc in rep.inconsistencies:
        assert inc.inconsistency_id
        assert inc.type
        assert inc.severity in ("INFO", "WARNING", "REVIEW_REQUIRED")
        assert inc.severity != "FRAUD"
        assert len(inc.fields_involved) > 0
        assert len(inc.documents_involved) > 0
        assert inc.explanation
        assert inc.status


def test_evidence_provenance_service_trace():
    """Tests click-to-source traceability service matching prompt acceptance criteria."""
    trace = EvidenceProvenanceService.get_provenance_by_id("monthly_revenue")
    assert trace is not None
    assert trace["display_label"] == "Monthly Revenue ₹51.2L"
    assert "GST Return" in trace["document"]["doc_type"] or "GST" in trace["document"]["file_name"]
    assert trace["page"] == 2
    assert trace["confidence_percent"] == 96
    assert "Consistent within configured tolerance" in trace["cross_check_status"]

    # Verify cross-check counter-evidence
    cross_checks = trace["cross_checks"]
    assert len(cross_checks) >= 2
    sources = [c["source"] for c in cross_checks]
    assert any("ITR" in s for s in sources)
    assert any("Bank" in s for s in sources)


def test_evidence_apis():
    """Tests GET /api/v1/journeys/{id}/evidence, /consistency, and /api/v1/evidence/{id}/provenance."""
    headers = {"Authorization": "Bearer dev_token_risk_officer"}

    # 1. GET /api/v1/journeys/{id}/evidence
    res_ev = client.get("/api/v1/journeys/jrn_priya_001/evidence", headers=headers)
    assert res_ev.status_code == 200
    evidence_list = res_ev.json()
    assert isinstance(evidence_list, list)

    # 2. GET /api/v1/journeys/{id}/consistency
    res_con = client.get("/api/v1/journeys/jrn_priya_001/consistency", headers=headers)
    assert res_con.status_code == 200
    con_data = res_con.json()
    assert "inconsistencies" in con_data
    assert "severity_breakdown" in con_data

    # 3. GET /api/v1/evidence/{id}/provenance
    res_prov = client.get("/api/v1/evidence/monthly_revenue/provenance", headers=headers)
    assert res_prov.status_code == 200
    prov_data = res_prov.json()
    assert prov_data["page"] == 2
    assert prov_data["confidence_percent"] == 96
    assert "cross_checks" in prov_data
    assert len(prov_data["cross_checks"]) > 0
