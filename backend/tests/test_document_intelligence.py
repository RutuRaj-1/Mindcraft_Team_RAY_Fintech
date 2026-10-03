"""
FinFlow AI — Document Intelligence & Evidence Ledger Test Suite
===============================================================
Comprehensive verification for Module 3:
- File upload & validation
- SHA-256 cryptographic provenance & duplicate detection
- Multi-pass OCR architecture (Native PDF + Fallback)
- Extraction and normalization of structured fields for:
  - GST: GSTIN, legal name, turnover, period
  - ITR: gross income, business income, financial year
  - Bank: account holder, transaction dates, credits, debits, opening balance, closing balance
  - Business Registration: business name, registration date, business type
  - Aadhaar / PAN: PAN/Aadhaar number, holder name, DOB/issue date
- Evidence Ledger version preservation (never silently overwrite)
- Confidence thresholding: confidence < 0.85 -> REVIEW_REQUIRED
- REST Endpoints:
  - POST /api/v1/journeys/{id}/documents
  - GET /api/v1/journeys/{id}/documents
  - GET /api/v1/documents/{document_id}
  - GET /api/v1/journeys/{id}/evidence
  - POST /api/v1/journeys/{id}/digilocker/import
"""

import io
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.database.firestore_client import db
from backend.routers.demo_router import seed_demo_data

client = TestClient(app)
AUTH_HEADER = {"Authorization": "Bearer demo-customer"}


@pytest.fixture(autouse=True)
def setup_data():
    seed_demo_data()


def test_upload_bank_statement_extracts_all_required_fields():
    journey_id = "jrn_priya_001"
    sample_content = b"%PDF-1.4\nAccount Name: Sharma Textiles Private Limited\nStatement Period: 01/04/2024 to 31/03/2025\nTotal Credits: 14,200,000.00\nTotal Debits: 12,800,000.00\nOpening Balance: 150,000.00\nClosing Balance: 1,550,000.00\n%%EOF"

    files = {"file": ("bank_statement_2025.pdf", io.BytesIO(sample_content), "application/pdf")}
    data = {"doc_type": "BANK_STATEMENT"}

    res = client.post(f"/api/v1/journeys/{journey_id}/documents", data=data, files=files, headers=AUTH_HEADER)
    assert res.status_code == 201
    doc = res.json()

    assert doc["document_id"].startswith("doc_")
    assert doc["verification_status"] in ("VERIFIED", "REVIEW_REQUIRED")
    assert doc["extracted_fields_count"] >= 6
    assert "account holder" in doc["extracted_fields"]
    assert "transaction dates" in doc["extracted_fields"]
    assert "credits" in doc["extracted_fields"]
    assert "debits" in doc["extracted_fields"]
    assert "opening balance" in doc["extracted_fields"]
    assert "closing balance" in doc["extracted_fields"]


def test_upload_gst_document_extracts_all_required_fields():
    journey_id = "jrn_priya_001"
    sample_content = b"%PDF-1.4\nGSTIN: 27AAACS1234F1Z5\nLegal Name: Sharma Textiles Private Limited\nTotal Taxable Turnover: 14,500,000.00\nTax Period: FY 2024-25\n%%EOF"

    files = {"file": ("gstr3b_annual.pdf", io.BytesIO(sample_content), "application/pdf")}
    data = {"doc_type": "GST_RETURN"}

    res = client.post(f"/api/v1/journeys/{journey_id}/documents", data=data, files=files, headers=AUTH_HEADER)
    assert res.status_code == 201
    doc = res.json()

    assert "GSTIN" in doc["extracted_fields"]
    assert "legal name" in doc["extracted_fields"]
    assert "turnover" in doc["extracted_fields"]
    assert "period" in doc["extracted_fields"]
    assert doc["extracted_fields"]["GSTIN"] == "27AAACS1234F1Z5"


def test_upload_itr_document_extracts_all_required_fields():
    journey_id = "jrn_priya_001"
    sample_content = b"%PDF-1.4\nGross Total Income: 14,000,000.00\nBusiness Income: 1,850,000.00\nAssessment Year: 2025-26\n%%EOF"

    files = {"file": ("itr_ack_2025.pdf", io.BytesIO(sample_content), "application/pdf")}
    data = {"doc_type": "ITR"}

    res = client.post(f"/api/v1/journeys/{journey_id}/documents", data=data, files=files, headers=AUTH_HEADER)
    assert res.status_code == 201
    doc = res.json()

    assert "gross income" in doc["extracted_fields"]
    assert "business income" in doc["extracted_fields"]
    assert "financial year" in doc["extracted_fields"]


def test_upload_business_registration_and_id_proof():
    journey_id = "jrn_priya_001"

    # Business Registration
    reg_content = b"%PDF-1.4\nName of Enterprise: Sharma Textiles Private Limited\nDate of Incorporation: 15/06/2020\nType of Enterprise: Small Enterprise (Manufacturing)\n%%EOF"
    files = {"file": ("udyam_certificate.pdf", io.BytesIO(reg_content), "application/pdf")}
    res = client.post(f"/api/v1/journeys/{journey_id}/documents", data={"doc_type": "BUSINESS_REGISTRATION"}, files=files, headers=AUTH_HEADER)
    assert res.status_code == 201
    doc_reg = res.json()
    assert "business name" in doc_reg["extracted_fields"]
    assert "registration date" in doc_reg["extracted_fields"]
    assert "business type" in doc_reg["extracted_fields"]

    # ID Proof (PAN / Aadhaar)
    id_content = b"%PDF-1.4\nPermanent Account Number: AAACS1234F\nName: Priya Sharma\nDate of Birth: 12/04/1982\n%%EOF"
    files = {"file": ("pan_card.pdf", io.BytesIO(id_content), "application/pdf")}
    res_id = client.post(f"/api/v1/journeys/{journey_id}/documents", data={"doc_type": "PAN"}, files=files, headers=AUTH_HEADER)
    assert res_id.status_code == 201
    doc_id = res_id.json()
    assert "PAN/Aadhaar number" in doc_id["extracted_fields"]
    assert "holder name" in doc_id["extracted_fields"]
    assert "DOB/issue date" in doc_id["extracted_fields"]


def test_evidence_ledger_preserves_versions_without_silent_overwrite():
    journey_id = "jrn_priya_001"

    # Upload first version of GST document
    content_v1 = b"%PDF-1.4\nGSTIN: 27AAACS1234F1Z5\nLegal Name: Sharma Textiles Private Limited\nTurnover: 14,500,000.00\nPeriod: 2024\n%%EOF"
    files_v1 = {"file": ("gst_v1.pdf", io.BytesIO(content_v1), "application/pdf")}
    client.post(f"/api/v1/journeys/{journey_id}/documents", data={"doc_type": "GST_RETURN"}, files=files_v1, headers=AUTH_HEADER)

    # Upload revised version with different turnover
    content_v2 = b"%PDF-1.4\nGSTIN: 27AAACS1234F1Z5\nLegal Name: Sharma Textiles Private Limited\nTurnover: 15,200,000.00\nPeriod: 2024\n%%EOF"
    files_v2 = {"file": ("gst_v2.pdf", io.BytesIO(content_v2), "application/pdf")}
    client.post(f"/api/v1/journeys/{journey_id}/documents", data={"doc_type": "GST_RETURN"}, files=files_v2, headers=AUTH_HEADER)

    # Fetch Evidence Ledger
    evi_res = client.get(f"/api/v1/journeys/{journey_id}/evidence", headers=AUTH_HEADER)
    assert evi_res.status_code == 200
    evidence_list = evi_res.json()

    turnover_items = [e for e in evidence_list if e.get("field_name") == "turnover"]
    # Must have both versions preserved!
    assert len(turnover_items) >= 2
    versions = [e.get("version") for e in turnover_items]
    assert 1 in versions
    assert 2 in versions


def test_duplicate_file_detection():
    journey_id = "jrn_priya_001"
    content = b"%PDF-1.4\nDuplicate test document payload\n%%EOF"

    # First upload
    files_1 = {"file": ("orig.pdf", io.BytesIO(content), "application/pdf")}
    res1 = client.post(f"/api/v1/journeys/{journey_id}/documents", data={"doc_type": "OTHER"}, files=files_1, headers=AUTH_HEADER)
    assert res1.status_code == 201
    assert res1.json()["is_duplicate"] is False

    # Second upload with identical bytes
    files_2 = {"file": ("duplicate.pdf", io.BytesIO(content), "application/pdf")}
    res2 = client.post(f"/api/v1/journeys/{journey_id}/documents", data={"doc_type": "OTHER"}, files=files_2, headers=AUTH_HEADER)
    assert res2.status_code == 201
    assert res2.json()["is_duplicate"] is True
    assert res2.json()["verification_status"] == "FLAGGED"


def test_get_single_document_by_id():
    # First upload
    journey_id = "jrn_priya_001"
    content = b"%PDF-1.4\nTest Document by ID\n%%EOF"
    files = {"file": ("doc_test.pdf", io.BytesIO(content), "application/pdf")}
    res = client.post(f"/api/v1/journeys/{journey_id}/documents", data={"doc_type": "OTHER"}, files=files, headers=AUTH_HEADER)
    doc_id = res.json()["document_id"]

    # Query GET /api/v1/documents/{document_id}
    get_res = client.get(f"/api/v1/documents/{doc_id}", headers=AUTH_HEADER)
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["document_id"] == doc_id
    assert "evidence_items" in data


def test_digilocker_platform_integration():
    journey_id = "jrn_priya_001"

    # 1. List available credentials
    avail_res = client.get(f"/api/v1/journeys/{journey_id}/digilocker/available", headers=AUTH_HEADER)
    assert avail_res.status_code == 200
    creds = avail_res.json()
    assert len(creds) >= 4
    assert any(c["credential_type"] == "DIGILOCKER_AADHAAR" for c in creds)
    assert any(c["credential_type"] == "DIGILOCKER_GSTR3B" for c in creds)

    # 2. Import DigiLocker GSTR-3B credential
    import_res = client.post(
        f"/api/v1/journeys/{journey_id}/digilocker/import",
        json={"credential_type": "DIGILOCKER_GSTR3B"},
        headers=AUTH_HEADER
    )
    assert import_res.status_code == 201
    imported = import_res.json()
    assert imported["source"] == "DIGILOCKER"
    assert "GSTN" in imported["issuer"]
    assert imported["verification_status"] == "VERIFIED"
