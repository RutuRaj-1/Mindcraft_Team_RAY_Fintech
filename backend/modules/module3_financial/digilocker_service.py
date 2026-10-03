"""
FinFlow AI — DigiLocker Platform Gateway
========================================
Emulates the Official DigiLocker Ecosystem for lifelong MSME Document Storage:
- Secure lifelong vault for verified credentials (UIDAI Aadhaar, CBDT e-PAN, GSTN GSTR-3B, MoMSME Udyam, RBI-AA Bank e-Statements)
- Digital signatures, cryptographic tamper-proof seals, and issuer provenance
- Instant 1-click import directly into the Journey Evidence Ledger
"""

import uuid
import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from backend.database.models import DocumentModel, now_utc_iso
from backend.database.repositories import document_repo
from backend.database.firestore_client import db
from backend.modules.module3_financial.field_extractor import ExtractedField
from backend.modules.module3_financial.evidence_ledger_service import EvidenceLedgerService

AVAILABLE_DIGILOCKER_DOCS = [
    {
        "credential_type": "DIGILOCKER_AADHAAR",
        "doc_type": "ID_PROOF",
        "title": "Aadhaar e-KYC Verification Record",
        "issuer": "Unique Identification Authority of India (UIDAI)",
        "issuer_id": "in.gov.uidai",
        "doc_uri": "in.gov.uidai.aadhaar-9874-xxxx-1209",
        "status": "ISSUED",
        "badge": "UIDAI Digitally Signed",
        "issued_date": "2023-01-14",
    },
    {
        "credential_type": "DIGILOCKER_PAN",
        "doc_type": "PAN",
        "title": "e-PAN Verification Card",
        "issuer": "Income Tax Department, Govt of India",
        "issuer_id": "in.gov.incometax",
        "doc_uri": "in.gov.incometax.pan-AAACS1234F",
        "status": "ISSUED",
        "badge": "CBDT Cryptographically Sealed",
        "issued_date": "2020-03-22",
    },
    {
        "credential_type": "DIGILOCKER_GSTR3B",
        "doc_type": "GST_RETURN",
        "title": "Form GSTR-3B Tax Return (FY 2024-25)",
        "issuer": "Goods and Services Tax Network (GSTN)",
        "issuer_id": "in.gov.gst",
        "doc_uri": "in.gov.gst.gstr3b-27AAACS1234F1Z5-202425",
        "status": "ISSUED",
        "badge": "GSTN Portal Certified",
        "issued_date": "2025-01-18",
    },
    {
        "credential_type": "DIGILOCKER_UDYAM",
        "doc_type": "BUSINESS_REGISTRATION",
        "title": "Udyam MSME Registration Certificate",
        "issuer": "Ministry of Micro, Small & Medium Enterprises",
        "issuer_id": "in.gov.msme.udyam",
        "doc_uri": "in.gov.msme.udyam-UDYAM-MH-02-0049182",
        "status": "ISSUED",
        "badge": "MoMSME Verified Enterprise",
        "issued_date": "2021-08-09",
    },
    {
        "credential_type": "DIGILOCKER_BANK",
        "doc_type": "BANK_STATEMENT",
        "title": "HDFC Current Account AA e-Statement (12M)",
        "issuer": "Reserve Bank of India Account Aggregator (AA) Gateway",
        "issuer_id": "in.org.rbi.aa",
        "doc_uri": "in.org.rbi.aa.hdfc-current-918020038841920",
        "status": "ISSUED",
        "badge": "RBI-AA Certified Financial Stream",
        "issued_date": "2025-02-01",
    }
]


class DigiLockerService:
    @classmethod
    def list_available(cls, business_name: str = "Sharma Textiles Private Limited") -> List[Dict[str, Any]]:
        return AVAILABLE_DIGILOCKER_DOCS

    @classmethod
    def import_credential(
        cls,
        journey_id: str,
        application_id: str,
        credential_type: str,
        business_name: str = "Sharma Textiles Private Limited"
    ) -> Dict[str, Any]:
        """
        Imports a tamper-proof DigiLocker issued credential into the application's document vault and Evidence Ledger.
        """
        meta = next((d for d in AVAILABLE_DIGILOCKER_DOCS if d["credential_type"] == credential_type), None)
        if not meta:
            meta = AVAILABLE_DIGILOCKER_DOCS[0]

        doc_id = f"doc_dl_{uuid.uuid4().hex[:10]}"
        now = now_utc_iso()
        sha256 = hashlib.sha256(f"DIGILOCKER_{credential_type}_{application_id}_{now}".encode()).hexdigest()

        # Build extracted fields based on credential type
        extracted_fields: List[ExtractedField] = []

        if "AADHAAR" in credential_type or "PAN" in credential_type:
            extracted_fields = [
                ExtractedField(
                    field="PAN/Aadhaar number",
                    value="AAACS1234F" if "PAN" in credential_type else "9874 5210 1209",
                    normalizedValue="AAACS1234F" if "PAN" in credential_type else "987452101209",
                    confidence=0.99,
                    sourcePage=1,
                    sourceText=f"DigiLocker Verified Issuer: {meta['issuer']} (URI: {meta['doc_uri']})",
                    extractionMethod="DIGILOCKER_VERIFIED",
                    verificationStatus="VERIFIED"
                ),
                ExtractedField(
                    field="holder name",
                    value=business_name.upper(),
                    normalizedValue=business_name.upper(),
                    confidence=0.99,
                    sourcePage=1,
                    sourceText=f"Certified Entity Name as registered with {meta['issuer']}",
                    extractionMethod="DIGILOCKER_VERIFIED",
                    verificationStatus="VERIFIED"
                ),
                ExtractedField(
                    field="DOB/issue date",
                    value=meta["issued_date"],
                    normalizedValue=meta["issued_date"],
                    confidence=0.99,
                    sourcePage=1,
                    sourceText=f"Issued on {meta['issued_date']}",
                    extractionMethod="DIGILOCKER_VERIFIED",
                    verificationStatus="VERIFIED"
                )
            ]
        elif "GSTR3B" in credential_type:
            extracted_fields = [
                ExtractedField(
                    field="GSTIN",
                    value="27AAACS1234F1Z5",
                    normalizedValue="27AAACS1234F1Z5",
                    confidence=0.99,
                    sourcePage=1,
                    sourceText=f"GSTN Authenticated Portal Certificate (URI: {meta['doc_uri']})",
                    extractionMethod="DIGILOCKER_VERIFIED",
                    verificationStatus="VERIFIED"
                ),
                ExtractedField(
                    field="legal name",
                    value=business_name,
                    normalizedValue=business_name.upper(),
                    confidence=0.99,
                    sourcePage=1,
                    sourceText="GSTN Registered Legal Trade Name",
                    extractionMethod="DIGILOCKER_VERIFIED",
                    verificationStatus="VERIFIED"
                ),
                ExtractedField(
                    field="turnover",
                    value="1,45,00,000.00",
                    normalizedValue=14500000.0,
                    confidence=0.99,
                    sourcePage=1,
                    sourceText="GSTR-3B Table 3.1 Cumulative Outward Supplies: ₹1,45,00,000.00",
                    extractionMethod="DIGILOCKER_VERIFIED",
                    verificationStatus="VERIFIED"
                ),
                ExtractedField(
                    field="period",
                    value="FY 2024-25 (Annual Cumulative)",
                    normalizedValue="FY 2024-25",
                    confidence=0.99,
                    sourcePage=1,
                    sourceText="Certified Filing Window: FY 2024-25",
                    extractionMethod="DIGILOCKER_VERIFIED",
                    verificationStatus="VERIFIED"
                )
            ]
        elif "UDYAM" in credential_type:
            extracted_fields = [
                ExtractedField(
                    field="business name",
                    value=business_name,
                    normalizedValue=business_name.upper(),
                    confidence=0.99,
                    sourcePage=1,
                    sourceText=f"Ministry of MSME Udyam Certificate (URI: {meta['doc_uri']})",
                    extractionMethod="DIGILOCKER_VERIFIED",
                    verificationStatus="VERIFIED"
                ),
                ExtractedField(
                    field="registration date",
                    value=meta["issued_date"],
                    normalizedValue=meta["issued_date"],
                    confidence=0.99,
                    sourcePage=1,
                    sourceText=f"Commencement of Business: {meta['issued_date']}",
                    extractionMethod="DIGILOCKER_VERIFIED",
                    verificationStatus="VERIFIED"
                ),
                ExtractedField(
                    field="business type",
                    value="Small Enterprise (Textile & Apparel Manufacturing)",
                    normalizedValue="Small Enterprise (Manufacturing)",
                    confidence=0.99,
                    sourcePage=1,
                    sourceText="NIC Code: 1312 (Weaving of textiles) - Small Enterprise",
                    extractionMethod="DIGILOCKER_VERIFIED",
                    verificationStatus="VERIFIED"
                )
            ]
        elif "BANK" in credential_type:
            extracted_fields = [
                ExtractedField(
                    field="account holder",
                    value=business_name.upper(),
                    normalizedValue=business_name.upper(),
                    confidence=0.99,
                    sourcePage=1,
                    sourceText=f"RBI Account Aggregator Direct Feed (HDFC Current Account)",
                    extractionMethod="DIGILOCKER_VERIFIED",
                    verificationStatus="VERIFIED"
                ),
                ExtractedField(
                    field="transaction dates",
                    value="01/04/2024 to 31/03/2025",
                    normalizedValue="01/04/2024 to 31/03/2025",
                    confidence=0.99,
                    sourcePage=1,
                    sourceText="12-Month Continuous Bank Ledger Feed",
                    extractionMethod="DIGILOCKER_VERIFIED",
                    verificationStatus="VERIFIED"
                ),
                ExtractedField(
                    field="credits",
                    value="1,42,00,000.00",
                    normalizedValue=14200000.0,
                    confidence=0.99,
                    sourcePage=1,
                    sourceText="Verified Annual Inward Credits: ₹1,42,00,000.00",
                    extractionMethod="DIGILOCKER_VERIFIED",
                    verificationStatus="VERIFIED"
                ),
                ExtractedField(
                    field="debits",
                    value="1,28,00,000.00",
                    normalizedValue=12800000.0,
                    confidence=0.99,
                    sourcePage=1,
                    sourceText="Verified Annual Outward Debits: ₹1,28,00,000.00",
                    extractionMethod="DIGILOCKER_VERIFIED",
                    verificationStatus="VERIFIED"
                ),
                ExtractedField(
                    field="opening balance",
                    value="1,50,000.00",
                    normalizedValue=150000.0,
                    confidence=0.99,
                    sourcePage=1,
                    sourceText="Opening Balance (01-Apr-2024): ₹1,50,000.00",
                    extractionMethod="DIGILOCKER_VERIFIED",
                    verificationStatus="VERIFIED"
                ),
                ExtractedField(
                    field="closing balance",
                    value="15,50,000.00",
                    normalizedValue=1550000.0,
                    confidence=0.99,
                    sourcePage=1,
                    sourceText="Closing Balance (31-Mar-2025): ₹15,50,000.00",
                    extractionMethod="DIGILOCKER_VERIFIED",
                    verificationStatus="VERIFIED"
                )
            ]

        doc_record = DocumentModel(
            document_id=doc_id,
            application_id=application_id,
            type=meta["doc_type"],
            file_name=f"{meta['title']}.pdf",
            storage_path=f"digilocker/{meta['doc_uri']}.pdf",
            mime_type="application/pdf",
            file_hash=sha256,
            uploaded_at=now,
            ocr_status="VERIFIED",
            verification_status="VERIFIED",
            page_count=2,
            source="DIGILOCKER",
            issuer=meta["issuer"],
            badge=meta["badge"],
            extracted_fields_count=len(extracted_fields),
            extracted_fields={f.field: f.normalizedValue for f in extracted_fields}
        )

        try:
            document_repo.create(doc_record)
        except Exception:
            pass

        # Legacy sync
        db.set("documents", doc_id, doc_record.model_dump())

        # Persist to Evidence Ledger
        EvidenceLedgerService.record_extractions(
            application_id=application_id,
            document_id=doc_id,
            extracted_fields=extracted_fields,
            source_hash=sha256
        )

        res_dict = doc_record.model_dump()
        res_dict["document_id"] = doc_id
        res_dict["application_id"] = application_id
        res_dict["doc_type"] = meta["doc_type"]
        res_dict["file_name"] = f"{meta['title']}.pdf"
        res_dict["verification_status"] = "VERIFIED"
        res_dict["ocr_status"] = "VERIFIED"
        res_dict["file_hash"] = sha256
        res_dict["page_count"] = 2
        res_dict["source"] = "DIGILOCKER"
        res_dict["issuer"] = meta["issuer"]
        return res_dict
