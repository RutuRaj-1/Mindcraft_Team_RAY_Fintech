from fastapi import APIRouter
from typing import Dict, Any, List
from datetime import datetime, timedelta, timezone
from backend.database.models import (
    IntentPayload, JourneyRecord, ApplicationRecord, DocumentRecord,
    DocumentType, DocumentStatus, EvidenceItem, JourneyStage, JourneyStatus,
    JourneyStepRecord, RiskAssessment, RiskBand, HardRuleEvaluation,
    SHAPAttribution, SHAPFeatureImpact, DecisionRecord, DecisionOutcome,
    PolicyCitation
)
from backend.database.firestore_client import db
from backend.modules.module3_financial.cashflow_engine import CashFlowEngine
from backend.modules.module3_financial.consistency_engine import ConsistencyEngine
from backend.modules.module7_trust_intelligence.trust_graph_engine import TrustGraphEngine
from backend.modules.module7_trust_intelligence.cross_application_intelligence import CrossApplicationIntelligence
from backend.modules.module5_trust.audit_ledger import AuditLedger


router = APIRouter(prefix="/api/v1/demo", tags=["Demo Management & Seed Data"])

def seed_demo_data():
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    # =========================================================================
    # PRIMARY CASE 1: SkillBridge Learning Solutions (Ruturaj Bhome - bhomeruturaj17@gmail.com)
    # High Trust, 4 Verified Vault Documents, Prime Growth Working Capital
    # =========================================================================
    sb_jrn_id = "jrn_skillbridge_001"
    sb_app_id = "app_skillbridge_001"
    sb_user_id = "usr_skillbridge_001"

    sb_intent = IntentPayload(
        product_type="sme_working_capital",
        requested_amount=2500000.0, # ₹25 Lakhs
        tenor_months=12,
        purpose="Platform infrastructure scaling & enterprise curriculum delivery",
        business_name="SkillBridge Learning Solutions Pvt. Ltd.",
        annual_turnover=30000000.0, # ₹3.00 Cr
        vintage_months=44,
        pan="NTHSB0012Z",
        gstin="27NTHSB0012Z1Z5",
        industry_sector="EdTech / Professional Skill Development"
    )

    sb_journey = JourneyRecord(
        journey_id=sb_jrn_id,
        applicant_id=sb_user_id,
        current_stage=JourneyStage.VERIFICATION,
        status=JourneyStatus.ACTIVE,
        intent=sb_intent,
        application_id=sb_app_id,
        history=[
            JourneyStepRecord(stage=JourneyStage.INTENT_CAPTURE, entered_at=now - timedelta(hours=3), completed_at=now - timedelta(hours=3), notes="Intent registered by Ruturaj Bhome"),
            JourneyStepRecord(stage=JourneyStage.EVIDENCE_COLLECTION, entered_at=now - timedelta(hours=2), completed_at=now - timedelta(hours=1), notes="4 vault documents attached"),
            JourneyStepRecord(stage=JourneyStage.VERIFICATION, entered_at=now - timedelta(minutes=30), notes="Document OCR and verification active")
        ],
        created_at=now - timedelta(hours=3),
        updated_at=now
    )

    sb_app = ApplicationRecord(
        application_id=sb_app_id,
        journey_id=sb_jrn_id,
        user_id=sb_user_id,
        business_name="SkillBridge Learning Solutions Pvt. Ltd.",
        product_type=sb_intent.product_type,
        requested_amount=sb_intent.requested_amount,
        tenor_months=sb_intent.tenor_months,
        vintage_months=sb_intent.vintage_months,
        annual_turnover=sb_intent.annual_turnover,
        pan=sb_intent.pan,
        gstin=sb_intent.gstin,
        industry_sector=sb_intent.industry_sector,
        phone="+91 84688 12201",
        email="bhomeruturaj17@gmail.com",
        bank_account="990000000001",
        business_address="17, Knowledge Avenue, Blue Orbit Campus, Hinjewadi Phase Beta, Pune, Maharashtra 411057",
        created_at=now - timedelta(hours=3)
    )

    db.set("journeys", sb_jrn_id, sb_journey.model_dump())
    db.set("applications", sb_app_id, sb_app.model_dump())

    # Seed MSME Profile for SkillBridge
    sb_profile = {
        "user_id": sb_user_id,
        "email": "bhomeruturaj17@gmail.com",
        "promoter_name": "Ruturaj Bhome",
        "business_name": "SkillBridge Learning Solutions Pvt. Ltd.",
        "legal_entity_type": "PRIVATE_LIMITED",
        "phone": "+91 84688 12201",
        "pan": "NTHSB0012Z",
        "gstin": "27NTHSB0012Z1Z5",
        "industry_sector": "EdTech / Professional Skill Development",
        "vintage_months": 44,
        "annual_turnover": 30000000.0,
        "registered_address": "17, Knowledge Avenue, Blue Orbit Campus, Hinjewadi Phase Beta, Pune, Maharashtra 411057",
        "city": "Pune",
        "pincode": "411057",
        "is_profile_complete": True,
        "updated_at": now_iso
    }
    db.set("msme_profiles", sb_user_id, sb_profile)
    db.set("msme_profiles", "bhomeruturaj17@gmail.com", sb_profile)
    db.set("msme_profiles", "usr_demo_customer", sb_profile)

    # 4 Vault Documents for SkillBridge
    sb_vault_docs = [
        {
            "doc_id": "vlt_sb_bank",
            "user_id": sb_user_id,
            "category": "BANK_STATEMENT",
            "doc_type": "BANK_STATEMENT",
            "file_name": "SkillBridge_Bank_Statement_12M.pdf",
            "file_url": "/uploads/SkillBridge_Bank_Statement_12M.pdf",
            "storage_path": "backend/uploads/SkillBridge_Bank_Statement_12M.pdf",
            "file_size_bytes": 64800,
            "sha256_hash": "41400ab44053bdc94dcfe1fb0d6cda9919b8cd147925494ef9ae8103da727e46",
            "version": 1,
            "notes": "12-Month Audited Primary Bank Statement (Total Credits: ₹3.09 Cr)",
            "status": "ACTIVE",
            "uploaded_at": now_iso,
            "updated_at": now_iso
        },
        {
            "doc_id": "vlt_sb_registration",
            "user_id": sb_user_id,
            "category": "BUSINESS_REGISTRATION",
            "doc_type": "BUSINESS_REGISTRATION",
            "file_name": "SkillBridge_Business_Registration.pdf",
            "file_url": "/uploads/SkillBridge_Business_Registration.pdf",
            "storage_path": "backend/uploads/SkillBridge_Business_Registration.pdf",
            "file_size_bytes": 45944,
            "sha256_hash": "c1cb2f9ab8823a65f1ded0e21ea5fd71188914fb50009d9d5d8dcaa7936f6106",
            "version": 1,
            "notes": "Corporate Registration Certificate (FCRS-SB-2022-00417, Vintage: 44M)",
            "status": "ACTIVE",
            "uploaded_at": now_iso,
            "updated_at": now_iso
        },
        {
            "doc_id": "vlt_sb_gst",
            "user_id": sb_user_id,
            "category": "GST_RETURNS",
            "doc_type": "GST_RETURNS",
            "file_name": "SkillBridge_GST_GSTR3B.pdf",
            "file_url": "/uploads/SkillBridge_GST_GSTR3B.pdf",
            "storage_path": "backend/uploads/SkillBridge_GST_GSTR3B.pdf",
            "file_size_bytes": 48461,
            "sha256_hash": "c390a0644d8a14865cb3b4390f7250acafcbf684275227010d34f6e9a7c852e8",
            "version": 1,
            "notes": "Annual GSTR-3B Tax Summary FY25-26 (Taxable Value: ₹3.00 Cr)",
            "status": "ACTIVE",
            "uploaded_at": now_iso,
            "updated_at": now_iso
        },
        {
            "doc_id": "vlt_sb_itr",
            "user_id": sb_user_id,
            "category": "ITR_V",
            "doc_type": "ITR_V",
            "file_name": "SkillBridge_ITR_V.pdf",
            "file_url": "/uploads/SkillBridge_ITR_V.pdf",
            "storage_path": "backend/uploads/SkillBridge_ITR_V.pdf",
            "file_size_bytes": 49076,
            "sha256_hash": "779580f908e674044342c061217e17fe0f2b19a8242b80d0759ebd997c929a32",
            "version": 1,
            "notes": "ITR-V Assessment Year 2026-27 Filed Tax Acknowledgement",
            "status": "ACTIVE",
            "uploaded_at": now_iso,
            "updated_at": now_iso
        }
    ]
    for vdoc in sb_vault_docs:
        db.set("document_vault", vdoc["doc_id"], vdoc)
        vdoc_demo = dict(vdoc)
        vdoc_demo["user_id"] = "usr_demo_customer"
        db.set("document_vault", f"{vdoc['doc_id']}_demo", vdoc_demo)

    # 4 Journey Application Documents for SkillBridge
    doc_sb_bank = DocumentRecord(
        document_id="doc_sb_bank",
        application_id=sb_app_id,
        doc_type=DocumentType.BANK_STATEMENT,
        file_name="SkillBridge_Bank_Statement_12M.pdf",
        file_url="/uploads/SkillBridge_Bank_Statement_12M.pdf",
        sha256_hash="41400ab44053bdc94dcfe1fb0d6cda9919b8cd147925494ef9ae8103da727e46",
        status=DocumentStatus.VERIFIED,
        page_count=6,
        uploaded_at=now,
        verified_at=now,
        extracted_fields_count=5
    )
    doc_sb_registration = DocumentRecord(
        document_id="doc_sb_reg",
        application_id=sb_app_id,
        doc_type=DocumentType.UDYAM_AADHAAR,
        file_name="SkillBridge_Business_Registration.pdf",
        file_url="/uploads/SkillBridge_Business_Registration.pdf",
        sha256_hash="c1cb2f9ab8823a65f1ded0e21ea5fd71188914fb50009d9d5d8dcaa7936f6106",
        status=DocumentStatus.VERIFIED,
        page_count=1,
        uploaded_at=now,
        verified_at=now,
        extracted_fields_count=4
    )
    doc_sb_gst = DocumentRecord(
        document_id="doc_sb_gst",
        application_id=sb_app_id,
        doc_type=DocumentType.GST_RETURN,
        file_name="SkillBridge_GST_GSTR3B.pdf",
        file_url="/uploads/SkillBridge_GST_GSTR3B.pdf",
        sha256_hash="c390a0644d8a14865cb3b4390f7250acafcbf684275227010d34f6e9a7c852e8",
        status=DocumentStatus.VERIFIED,
        page_count=3,
        uploaded_at=now,
        verified_at=now,
        extracted_fields_count=4
    )
    doc_sb_itr = DocumentRecord(
        document_id="doc_sb_itr",
        application_id=sb_app_id,
        doc_type=DocumentType.ITR,
        file_name="SkillBridge_ITR_V.pdf",
        file_url="/uploads/SkillBridge_ITR_V.pdf",
        sha256_hash="779580f908e674044342c061217e17fe0f2b19a8242b80d0759ebd997c929a32",
        status=DocumentStatus.VERIFIED,
        page_count=2,
        uploaded_at=now,
        verified_at=now,
        extracted_fields_count=4
    )
    db.set("documents", "doc_sb_bank", doc_sb_bank.model_dump())
    db.set("documents", "doc_sb_reg", doc_sb_registration.model_dump())
    db.set("documents", "doc_sb_gst", doc_sb_gst.model_dump())
    db.set("documents", "doc_sb_itr", doc_sb_itr.model_dump())

    # SkillBridge Evidence Items
    sb_evidence = [
        {"evidence_id": "evi_sb_1", "document_id": "doc_sb_bank", "application_id": sb_app_id, "field_name": "annual_credit_turnover", "field_value": 30910000.0, "confidence": 0.98, "page_number": 1, "bounding_box": {"x": 0.1, "y": 0.2, "width": 0.3, "height": 0.04}, "sha256_source_hash": doc_sb_bank.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso},
        {"evidence_id": "evi_sb_2", "document_id": "doc_sb_bank", "application_id": sb_app_id, "field_name": "annual_debit_turnover", "field_value": 23230000.0, "confidence": 0.97, "page_number": 1, "bounding_box": {"x": 0.5, "y": 0.2, "width": 0.3, "height": 0.04}, "sha256_source_hash": doc_sb_bank.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso},
        {"evidence_id": "evi_sb_3", "document_id": "doc_sb_bank", "application_id": sb_app_id, "field_name": "closing_balance", "field_value": 11880000.0, "confidence": 0.98, "page_number": 1, "bounding_box": {"x": 0.5, "y": 0.25, "width": 0.3, "height": 0.04}, "sha256_source_hash": doc_sb_bank.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso},
        {"evidence_id": "evi_sb_4", "document_id": "doc_sb_bank", "application_id": sb_app_id, "field_name": "inward_cheque_bounces_6m", "field_value": 0, "confidence": 0.99, "page_number": 1, "bounding_box": {"x": 0.1, "y": 0.5, "width": 0.2, "height": 0.04}, "sha256_source_hash": doc_sb_bank.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso},
        {"evidence_id": "evi_sb_5", "document_id": "doc_sb_gst", "application_id": sb_app_id, "field_name": "gstin", "field_value": "27NTHSB0012Z1Z5", "confidence": 0.99, "page_number": 1, "bounding_box": {"x": 0.2, "y": 0.1, "width": 0.35, "height": 0.04}, "sha256_source_hash": doc_sb_gst.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso},
        {"evidence_id": "evi_sb_6", "document_id": "doc_sb_gst", "application_id": sb_app_id, "field_name": "gst_annual_taxable_turnover", "field_value": 30000000.0, "confidence": 0.98, "page_number": 2, "bounding_box": {"x": 0.45, "y": 0.3, "width": 0.3, "height": 0.04}, "sha256_source_hash": doc_sb_gst.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso},
        {"evidence_id": "evi_sb_7", "document_id": "doc_sb_reg", "application_id": sb_app_id, "field_name": "business_registration_status", "field_value": "ACTIVE", "confidence": 0.99, "page_number": 1, "bounding_box": {"x": 0.1, "y": 0.4, "width": 0.3, "height": 0.04}, "sha256_source_hash": doc_sb_registration.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso}
    ]
    for item in sb_evidence:
        db.set("evidence_ledger", item["evidence_id"], item)

    CashFlowEngine.calculate_metrics(sb_app_id)
    ConsistencyEngine.verify_consistency(sb_app_id)
    TrustGraphEngine.build_trust_graph(sb_app_id)

    # =========================================================================
    # PRIMARY CASE 2: Lifeline AI (Rashi Kachwah - rashi88@gmail.com)
    # MODULE 4: EXPLAINABLE DECISION & EXECUTION (ML Model, SHAP, RAG Citations)
    # =========================================================================
    ll_jrn_id = "jrn_lifeline_002"
    ll_app_id = "app_lifeline_002"
    ll_user_id = "usr_lifeline_002"

    ll_intent = IntentPayload(
        product_type="sme_working_capital",
        requested_amount=3000000.0, # ₹30 Lakhs
        tenor_months=24,
        purpose="Hospital care-coordination clinical AI infrastructure deployment",
        business_name="Lifeline AI Healthcare Technologies Pvt. Ltd.",
        annual_turnover=11800000.0, # ₹1.18 Cr
        vintage_months=12,
        pan="SYNTH0000L",
        gstin="27SYNTH0000L1Z9",
        industry_sector="Healthcare AI / Clinical Workflow Technology"
    )

    ll_journey = JourneyRecord(
        journey_id=ll_jrn_id,
        applicant_id=ll_user_id,
        current_stage=JourneyStage.EXPLAINABLE_DECISION,
        status=JourneyStatus.ACTIVE,
        intent=ll_intent,
        application_id=ll_app_id,
        history=[
            JourneyStepRecord(stage=JourneyStage.INTENT_CAPTURE, entered_at=now - timedelta(hours=4), completed_at=now - timedelta(hours=4), notes="Loan intent submitted by Rashi Kachwah"),
            JourneyStepRecord(stage=JourneyStage.EVIDENCE_COLLECTION, entered_at=now - timedelta(hours=3), completed_at=now - timedelta(hours=2), notes="4 vault documents attached and verified"),
            JourneyStepRecord(stage=JourneyStage.VERIFICATION, entered_at=now - timedelta(hours=2), completed_at=now - timedelta(hours=1), notes="OCR and cross-document reconciliation completed"),
            JourneyStepRecord(stage=JourneyStage.RISK_ASSESSMENT, entered_at=now - timedelta(hours=1), completed_at=now - timedelta(minutes=30), notes="Scikit-learn model evaluated with SHAP waterfall"),
            JourneyStepRecord(stage=JourneyStage.EXPLAINABLE_DECISION, entered_at=now - timedelta(minutes=30), notes="Sanction decision executed with dense RAG citations")
        ],
        created_at=now - timedelta(hours=4),
        updated_at=now
    )

    ll_app = ApplicationRecord(
        application_id=ll_app_id,
        journey_id=ll_jrn_id,
        user_id=ll_user_id,
        business_name="Lifeline AI Healthcare Technologies Pvt. Ltd.",
        product_type=ll_intent.product_type,
        requested_amount=ll_intent.requested_amount,
        tenor_months=ll_intent.tenor_months,
        vintage_months=ll_intent.vintage_months,
        annual_turnover=ll_intent.annual_turnover,
        pan=ll_intent.pan,
        gstin=ll_intent.gstin,
        industry_sector=ll_intent.industry_sector,
        phone="+91 98204 55678",
        email="rashi88@gmail.com",
        bank_account="000000000124",
        business_address="Unit 4B, Meridian Innovation Hub, 42 Knowledge Park Road, Pune, Maharashtra 411045",
        created_at=now - timedelta(hours=4)
    )

    db.set("journeys", ll_jrn_id, ll_journey.model_dump())
    db.set("applications", ll_app_id, ll_app.model_dump())

    # Seed MSME Profile for Lifeline AI
    ll_profile = {
        "user_id": ll_user_id,
        "email": "rashi88@gmail.com",
        "promoter_name": "Rashi Kachwah",
        "business_name": "Lifeline AI Healthcare Technologies Pvt. Ltd.",
        "legal_entity_type": "PRIVATE_LIMITED",
        "phone": "+91 98204 55678",
        "pan": "SYNTH0000L",
        "gstin": "27SYNTH0000L1Z9",
        "industry_sector": "Healthcare AI & Clinical Workflow Systems",
        "vintage_months": 12,
        "annual_turnover": 11800000.0,
        "registered_address": "Unit 4B, Meridian Innovation Hub, 42 Knowledge Park Road, Pune, Maharashtra 411045",
        "city": "Pune",
        "pincode": "411045",
        "is_profile_complete": True,
        "updated_at": now_iso
    }
    db.set("msme_profiles", ll_user_id, ll_profile)
    db.set("msme_profiles", "rashi88@gmail.com", ll_profile)

    # 4 Vault Documents for Lifeline AI
    ll_vault_docs = [
        {
            "doc_id": "vlt_ll_bank",
            "user_id": ll_user_id,
            "category": "BANK_STATEMENT",
            "doc_type": "BANK_STATEMENT",
            "file_name": "LifelineAI_Bank_Statement_12M.pdf",
            "file_url": "/uploads/LifelineAI_Bank_Statement_12M.pdf",
            "storage_path": "backend/uploads/LifelineAI_Bank_Statement_12M.pdf",
            "file_size_bytes": 58525,
            "sha256_hash": "d4b4fb0ea74c06f3ebc2873f5eb01c0d9c17b01c5d33c318450c9fdbfbbad266",
            "version": 1,
            "notes": "12-Month Current Account Statement (Total Credits: ₹1.24 Cr, Closing: ₹34.85L)",
            "status": "ACTIVE",
            "uploaded_at": now_iso,
            "updated_at": now_iso
        },
        {
            "doc_id": "vlt_ll_registration",
            "user_id": ll_user_id,
            "category": "BUSINESS_REGISTRATION",
            "doc_type": "BUSINESS_REGISTRATION",
            "file_name": "LifelineAI_Business_Registration.pdf",
            "file_url": "/uploads/LifelineAI_Business_Registration.pdf",
            "storage_path": "backend/uploads/LifelineAI_Business_Registration.pdf",
            "file_size_bytes": 45474,
            "sha256_hash": "6de6132f0152aa8915c5b97d40851e19e65d04f82ee7ac0923a95e4707ed6a1a",
            "version": 1,
            "notes": "Corporate Registration Certificate (U62019PN2025SYN012345, Active)",
            "status": "ACTIVE",
            "uploaded_at": now_iso,
            "updated_at": now_iso
        },
        {
            "doc_id": "vlt_ll_gst",
            "user_id": ll_user_id,
            "category": "GST_RETURNS",
            "doc_type": "GST_RETURNS",
            "file_name": "LifelineAI_GST_GSTR3B.pdf",
            "file_url": "/uploads/LifelineAI_GST_GSTR3B.pdf",
            "storage_path": "backend/uploads/LifelineAI_GST_GSTR3B.pdf",
            "file_size_bytes": 47900,
            "sha256_hash": "249dbd4d65132d1abef1a9745730cd49b6f7154a691ab4346fd306fdb1e86e37",
            "version": 1,
            "notes": "Annual GSTR-3B Tax Record FY25-26 (Taxable Value: ₹1.18 Cr)",
            "status": "ACTIVE",
            "uploaded_at": now_iso,
            "updated_at": now_iso
        },
        {
            "doc_id": "vlt_ll_itr",
            "user_id": ll_user_id,
            "category": "ITR_V",
            "doc_type": "ITR_V",
            "file_name": "LifelineAI_ITR_V.pdf",
            "file_url": "/uploads/LifelineAI_ITR_V.pdf",
            "storage_path": "backend/uploads/LifelineAI_ITR_V.pdf",
            "file_size_bytes": 47176,
            "sha256_hash": "aab71c60f18f8055dad8f035c34260849ff996c42bb326bcbf8aa36ca475e74f",
            "version": 1,
            "notes": "ITR-V Assessment Year 2026-27 Filed Tax Acknowledgement",
            "status": "ACTIVE",
            "uploaded_at": now_iso,
            "updated_at": now_iso
        }
    ]
    for vdoc in ll_vault_docs:
        db.set("document_vault", vdoc["doc_id"], vdoc)

    # 4 Journey Application Documents for Lifeline AI
    doc_ll_bank = DocumentRecord(
        document_id="doc_ll_bank",
        application_id=ll_app_id,
        doc_type=DocumentType.BANK_STATEMENT,
        file_name="LifelineAI_Bank_Statement_12M.pdf",
        file_url="/uploads/LifelineAI_Bank_Statement_12M.pdf",
        sha256_hash="d4b4fb0ea74c06f3ebc2873f5eb01c0d9c17b01c5d33c318450c9fdbfbbad266",
        status=DocumentStatus.VERIFIED,
        page_count=6,
        uploaded_at=now,
        verified_at=now,
        extracted_fields_count=5
    )
    doc_ll_registration = DocumentRecord(
        document_id="doc_ll_reg",
        application_id=ll_app_id,
        doc_type=DocumentType.UDYAM_AADHAAR,
        file_name="LifelineAI_Business_Registration.pdf",
        file_url="/uploads/LifelineAI_Business_Registration.pdf",
        sha256_hash="6de6132f0152aa8915c5b97d40851e19e65d04f82ee7ac0923a95e4707ed6a1a",
        status=DocumentStatus.VERIFIED,
        page_count=1,
        uploaded_at=now,
        verified_at=now,
        extracted_fields_count=4
    )
    doc_ll_gst = DocumentRecord(
        document_id="doc_ll_gst",
        application_id=ll_app_id,
        doc_type=DocumentType.GST_RETURN,
        file_name="LifelineAI_GST_GSTR3B.pdf",
        file_url="/uploads/LifelineAI_GST_GSTR3B.pdf",
        sha256_hash="249dbd4d65132d1abef1a9745730cd49b6f7154a691ab4346fd306fdb1e86e37",
        status=DocumentStatus.VERIFIED,
        page_count=3,
        uploaded_at=now,
        verified_at=now,
        extracted_fields_count=4
    )
    doc_ll_itr = DocumentRecord(
        document_id="doc_ll_itr",
        application_id=ll_app_id,
        doc_type=DocumentType.ITR,
        file_name="LifelineAI_ITR_V.pdf",
        file_url="/uploads/LifelineAI_ITR_V.pdf",
        sha256_hash="aab71c60f18f8055dad8f035c34260849ff996c42bb326bcbf8aa36ca475e74f",
        status=DocumentStatus.VERIFIED,
        page_count=2,
        uploaded_at=now,
        verified_at=now,
        extracted_fields_count=4
    )
    db.set("documents", "doc_ll_bank", doc_ll_bank.model_dump())
    db.set("documents", "doc_ll_reg", doc_ll_registration.model_dump())
    db.set("documents", "doc_ll_gst", doc_ll_gst.model_dump())
    db.set("documents", "doc_ll_itr", doc_ll_itr.model_dump())

    # Lifeline AI Evidence Items
    ll_evidence = [
        {"evidence_id": "evi_ll_1", "document_id": "doc_ll_bank", "application_id": ll_app_id, "field_name": "annual_credit_turnover", "field_value": 12440000.0, "confidence": 0.98, "page_number": 1, "bounding_box": {"x": 0.1, "y": 0.2, "width": 0.3, "height": 0.04}, "sha256_source_hash": doc_ll_bank.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso},
        {"evidence_id": "evi_ll_2", "document_id": "doc_ll_bank", "application_id": ll_app_id, "field_name": "annual_debit_turnover", "field_value": 9800000.0, "confidence": 0.97, "page_number": 1, "bounding_box": {"x": 0.5, "y": 0.2, "width": 0.3, "height": 0.04}, "sha256_source_hash": doc_ll_bank.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso},
        {"evidence_id": "evi_ll_3", "document_id": "doc_ll_bank", "application_id": ll_app_id, "field_name": "closing_balance", "field_value": 3485000.0, "confidence": 0.98, "page_number": 1, "bounding_box": {"x": 0.5, "y": 0.25, "width": 0.3, "height": 0.04}, "sha256_source_hash": doc_ll_bank.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso},
        {"evidence_id": "evi_ll_4", "document_id": "doc_ll_bank", "application_id": ll_app_id, "field_name": "inward_cheque_bounces_6m", "field_value": 0, "confidence": 0.99, "page_number": 1, "bounding_box": {"x": 0.1, "y": 0.5, "width": 0.2, "height": 0.04}, "sha256_source_hash": doc_ll_bank.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso},
        {"evidence_id": "evi_ll_5", "document_id": "doc_ll_gst", "application_id": ll_app_id, "field_name": "gstin", "field_value": "27SYNTH0000L1Z9", "confidence": 0.99, "page_number": 1, "bounding_box": {"x": 0.2, "y": 0.1, "width": 0.35, "height": 0.04}, "sha256_source_hash": doc_ll_gst.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso},
        {"evidence_id": "evi_ll_6", "document_id": "doc_ll_gst", "application_id": ll_app_id, "field_name": "gst_annual_taxable_turnover", "field_value": 11800000.0, "confidence": 0.98, "page_number": 2, "bounding_box": {"x": 0.45, "y": 0.3, "width": 0.3, "height": 0.04}, "sha256_source_hash": doc_ll_gst.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso},
        {"evidence_id": "evi_ll_7", "document_id": "doc_ll_reg", "application_id": ll_app_id, "field_name": "business_registration_status", "field_value": "ACTIVE", "confidence": 0.99, "page_number": 1, "bounding_box": {"x": 0.1, "y": 0.4, "width": 0.3, "height": 0.04}, "sha256_source_hash": doc_ll_registration.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso}
    ]
    for item in ll_evidence:
        db.set("evidence_ledger", item["evidence_id"], item)

    CashFlowEngine.calculate_metrics(ll_app_id)
    ConsistencyEngine.verify_consistency(ll_app_id)
    TrustGraphEngine.build_trust_graph(ll_app_id)

    # Executed Module 4: Risk Assessment for Lifeline AI
    ll_risk = RiskAssessment(
        risk_id="rsk_lifeline_002",
        application_id=ll_app_id,
        all_hard_rules_passed=True,
        hard_rules=[
            HardRuleEvaluation(rule_id="R01_VINTAGE", rule_name="Minimum Operational Vintage", passed=True, threshold_value=">= 12 months", actual_value="12 months (Early-Stage Growth)", policy_citation="Credit Policy Clause 4.1"),
            HardRuleEvaluation(rule_id="R02_TURNOVER", rule_name="Minimum Annual Turnover", passed=True, threshold_value=">= ₹25,00,000", actual_value="₹1,18,00,000.00", policy_citation="Credit Policy Clause 4.2"),
            HardRuleEvaluation(rule_id="R03_CHEQUE_BOUNCES", rule_name="Inward Cheque Returns Limit", passed=True, threshold_value="<= 2 in 6m", actual_value="0 bounces", policy_citation="Credit Policy Clause 6.3"),
            HardRuleEvaluation(rule_id="R04_DSCR", rule_name="Debt Service Coverage Ratio", passed=True, threshold_value=">= 1.25x", actual_value="1.65x", policy_citation="Credit Policy Clause 5.2"),
            HardRuleEvaluation(rule_id="R05_REGISTRATION", rule_name="Active Corporate Entity Verification", passed=True, threshold_value="Active", actual_value="Active (U62019PN2025SYN012345)", policy_citation="KYC Guidelines Section 2")
        ],
        probability_of_default=0.092,
        risk_score=885,
        risk_band=RiskBand.LOW_RISK,
        model_version="scikit-learn-sme-v2.1",
        calculated_at=now
    )
    db.set("risk_assessments", "rsk_lifeline_002", ll_risk.model_dump())
    db.set("risk_assessments", f"rsk_{ll_app_id}", ll_risk.model_dump())

    # Module 4: SHAP Explainability Waterfall for Lifeline AI
    ll_shap = SHAPAttribution(
        shap_id="shp_lifeline_002",
        risk_id="rsk_lifeline_002",
        application_id=ll_app_id,
        base_value=0.22,
        model_output=0.092,
        features=[
            SHAPFeatureImpact(feature_name="dscr", feature_display_name="Debt Service Coverage Ratio (1.65x)", feature_value=1.65, shap_value=-0.138, direction="REDUCES_RISK", importance_rank=1),
            SHAPFeatureImpact(feature_name="bounces_6m", feature_display_name="Inward Cheque Bounces (0 in 6M)", feature_value=0, shap_value=-0.088, direction="REDUCES_RISK", importance_rank=2),
            SHAPFeatureImpact(feature_name="annual_turnover", feature_display_name="Annual Sales Turnover (₹1.18 Cr)", feature_value=11800000.0, shap_value=-0.052, direction="REDUCES_RISK", importance_rank=3),
            SHAPFeatureImpact(feature_name="buffer_days", feature_display_name="Liquidity Buffer (₹34.85L / 42 Days)", feature_value=42, shap_value=-0.038, direction="REDUCES_RISK", importance_rank=4),
            SHAPFeatureImpact(feature_name="vintage_months", feature_display_name="Operational Vintage (12 Months)", feature_value=12, shap_value=0.026, direction="INCREASES_RISK", importance_rank=5)
        ],
        generated_at=now
    )
    db.set("shap_attributions", "shp_lifeline_002", ll_shap.model_dump())
    db.set("shap_attributions", f"shp_{ll_app_id}", ll_shap.model_dump())

    # Module 4: Explainable Decision Record for Lifeline AI
    ll_decision = DecisionRecord(
        decision_id="dec_lifeline_002",
        application_id=ll_app_id,
        outcome=DecisionOutcome.APPROVED,
        approved_amount=3000000.0,
        interest_rate=10.95,
        tenor_months=24,
        confidence_score=0.94,
        reasoning="Application for Lifeline AI Healthcare Technologies Pvt. Ltd. is APPROVED for ₹30,00,000 at 10.95% p.a. FinFlow Trust Score is 885/1000 with 0 inward cheque bounces, healthy operating receipts of ₹1.24 Cr, strong DSCR of 1.65x, and verified GST filings totaling ₹1.18 Cr. First-year growth maturity risk is balanced by strong institutional care-coordination receivables.",
        policy_citations=[
            PolicyCitation(clause_id="POL-SME-4.1", title="Minimum Operational Vintage Requirement", excerpt="Early-stage healthcare technology borrowers with 12 months verified banking history qualify for fast-track growth working capital.", relevance_score=0.94),
            PolicyCitation(clause_id="POL-SME-5.2", title="Debt Service Coverage Ratio (DSCR) Norms", excerpt="Operating cash flow must comfortably cover debt service with DSCR >= 1.25x (Actual: 1.65x).", relevance_score=0.96),
            PolicyCitation(clause_id="POL-SME-8.3", title="Healthcare Technology Lending Window", excerpt="Special underwriting tier for B2B clinical technology with recurring hospital billing agreements.", relevance_score=0.91)
        ],
        evidence_citations=["annual_credit_turnover: ₹1,24,40,000", "gst_annual_taxable_turnover: ₹1,18,00,000", "dscr: 1.65x", "closing_balance: ₹34,85,000"],
        decided_by="AI_ORCHESTRATOR",
        decided_at=now
    )
    db.set("decisions", "dec_lifeline_002", ll_decision.model_dump())
    db.set("decisions", f"dec_{ll_app_id}", ll_decision.model_dump())

    # =========================================================================
    # PRIMARY CASE 3: SafeEra Industrial Solutions (Aaditya Wakchaure - wakchaureaditya@gmail.com)
    # Underwriting Review, Overdraft Dynamics & Delayed GST Return Periods
    # =========================================================================
    sf_jrn_id = "jrn_safeera_003"
    sf_app_id = "app_safeera_003"
    sf_user_id = "usr_safeera_003"

    sf_intent = IntentPayload(
        product_type="sme_working_capital",
        requested_amount=4000000.0,
        tenor_months=24,
        purpose="Industrial safety equipment & factory surveillance manufacturing line",
        business_name="SafeEra Industrial Solutions Pvt. Ltd.",
        annual_turnover=18200000.0, # ₹1.82 Cr
        vintage_months=54,
        pan="NTHSE0048Z",
        gstin="27NTHSE0048Z1Z3",
        industry_sector="Industrial Safety Equipment & Smart Surveillance"
    )

    sf_journey = JourneyRecord(
        journey_id=sf_jrn_id,
        applicant_id=sf_user_id,
        current_stage=JourneyStage.HUMAN_REVIEW,
        status=JourneyStatus.FLAGGED,
        intent=sf_intent,
        application_id=sf_app_id,
        created_at=now - timedelta(days=1),
        updated_at=now
    )

    sf_app = ApplicationRecord(
        application_id=sf_app_id,
        journey_id=sf_jrn_id,
        user_id=sf_user_id,
        business_name="SafeEra Industrial Solutions Pvt. Ltd.",
        product_type=sf_intent.product_type,
        requested_amount=sf_intent.requested_amount,
        tenor_months=sf_intent.tenor_months,
        vintage_months=sf_intent.vintage_months,
        annual_turnover=sf_intent.annual_turnover,
        pan=sf_intent.pan,
        gstin=sf_intent.gstin,
        industry_sector=sf_intent.industry_sector,
        phone="+91 97654 32109",
        email="wakchaureaditya@gmail.com",
        bank_account="990000000002",
        business_address="42, Meridian Industrial Estate, Demo Service Road, Andheri East, Mumbai, Maharashtra 400069",
        created_at=now - timedelta(days=1)
    )

    db.set("journeys", sf_jrn_id, sf_journey.model_dump())
    db.set("applications", sf_app_id, sf_app.model_dump())

    # Seed MSME Profile for SafeEra
    sf_profile = {
        "user_id": sf_user_id,
        "email": "wakchaureaditya@gmail.com",
        "promoter_name": "Aaditya Wakchaure",
        "business_name": "SafeEra Industrial Solutions Pvt. Ltd.",
        "legal_entity_type": "PRIVATE_LIMITED",
        "phone": "+91 97654 32109",
        "pan": "NTHSE0048Z",
        "gstin": "27NTHSE0048Z1Z3",
        "industry_sector": "Industrial Safety Equipment & Smart Surveillance",
        "vintage_months": 54,
        "annual_turnover": 18200000.0,
        "registered_address": "42, Meridian Industrial Estate, Demo Service Road, Andheri East, Mumbai, Maharashtra 400069",
        "city": "Mumbai",
        "pincode": "400069",
        "is_profile_complete": True,
        "updated_at": now_iso
    }
    db.set("msme_profiles", sf_user_id, sf_profile)
    db.set("msme_profiles", "wakchaureaditya@gmail.com", sf_profile)

    # 4 Vault Documents for SafeEra
    sf_vault_docs = [
        {
            "doc_id": "vlt_sf_bank",
            "user_id": sf_user_id,
            "category": "BANK_STATEMENT",
            "doc_type": "BANK_STATEMENT",
            "file_name": "SafeEra_Bank_Statement_12M.pdf",
            "file_url": "/uploads/SafeEra_Bank_Statement_12M.pdf",
            "storage_path": "backend/uploads/SafeEra_Bank_Statement_12M.pdf",
            "file_size_bytes": 66192,
            "sha256_hash": "414954352f90993ddd1d55b0e82926fb999fca3a867b8f87c73403ebb3a1bb9f",
            "version": 1,
            "notes": "12-Month Current Account Statement (Total Credits: ₹1.94 Cr, Debits: ₹2.06 Cr)",
            "status": "ACTIVE",
            "uploaded_at": now_iso,
            "updated_at": now_iso
        },
        {
            "doc_id": "vlt_sf_registration",
            "user_id": sf_user_id,
            "category": "BUSINESS_REGISTRATION",
            "doc_type": "BUSINESS_REGISTRATION",
            "file_name": "SafeEra_Business_Registration.pdf",
            "file_url": "/uploads/SafeEra_Business_Registration.pdf",
            "storage_path": "backend/uploads/SafeEra_Business_Registration.pdf",
            "file_size_bytes": 45925,
            "sha256_hash": "2ab74527653d67635ff7832da1a7cb5539e2506bb7283a91a368bdd73b6ddc73",
            "version": 1,
            "notes": "Corporate Registration Certificate (FCRS-SE-2021-00852, Vintage: 54M)",
            "status": "ACTIVE",
            "uploaded_at": now_iso,
            "updated_at": now_iso
        },
        {
            "doc_id": "vlt_sf_gst",
            "user_id": sf_user_id,
            "category": "GST_RETURNS",
            "doc_type": "GST_RETURNS",
            "file_name": "SafeEra_GST_GSTR3B.pdf",
            "file_url": "/uploads/SafeEra_GST_GSTR3B.pdf",
            "storage_path": "backend/uploads/SafeEra_GST_GSTR3B.pdf",
            "file_size_bytes": 48583,
            "sha256_hash": "e5fe135bf9eec2c7d0aeec79f225550a95e6be796ad53342e5a27f51f9050de9",
            "version": 1,
            "notes": "Annual GSTR-3B Tax Summary FY25-26 (Taxable Value: ₹1.82 Cr, 2 Delayed Periods)",
            "status": "ACTIVE",
            "uploaded_at": now_iso,
            "updated_at": now_iso
        },
        {
            "doc_id": "vlt_sf_itr",
            "user_id": sf_user_id,
            "category": "ITR_V",
            "doc_type": "ITR_V",
            "file_name": "SafeEra_ITR_V.pdf",
            "file_url": "/uploads/SafeEra_ITR_V.pdf",
            "storage_path": "backend/uploads/SafeEra_ITR_V.pdf",
            "file_size_bytes": 49011,
            "sha256_hash": "2d8101a1749f94e89c1d41c56689e5df45760e1fe2ff48aef7b3a0b3b3b64dff",
            "version": 1,
            "notes": "ITR-V Assessment Year 2026-27 Filed Tax Acknowledgement",
            "status": "ACTIVE",
            "uploaded_at": now_iso,
            "updated_at": now_iso
        }
    ]
    for vdoc in sf_vault_docs:
        db.set("document_vault", vdoc["doc_id"], vdoc)

    # 4 Journey Application Documents for SafeEra
    doc_sf_bank = DocumentRecord(
        document_id="doc_sf_bank",
        application_id=sf_app_id,
        doc_type=DocumentType.BANK_STATEMENT,
        file_name="SafeEra_Bank_Statement_12M.pdf",
        file_url="/uploads/SafeEra_Bank_Statement_12M.pdf",
        sha256_hash="414954352f90993ddd1d55b0e82926fb999fca3a867b8f87c73403ebb3a1bb9f",
        status=DocumentStatus.VERIFIED,
        page_count=6,
        uploaded_at=now,
        verified_at=now,
        extracted_fields_count=5
    )
    doc_sf_registration = DocumentRecord(
        document_id="doc_sf_reg",
        application_id=sf_app_id,
        doc_type=DocumentType.UDYAM_AADHAAR,
        file_name="SafeEra_Business_Registration.pdf",
        file_url="/uploads/SafeEra_Business_Registration.pdf",
        sha256_hash="2ab74527653d67635ff7832da1a7cb5539e2506bb7283a91a368bdd73b6ddc73",
        status=DocumentStatus.VERIFIED,
        page_count=1,
        uploaded_at=now,
        verified_at=now,
        extracted_fields_count=4
    )
    doc_sf_gst = DocumentRecord(
        document_id="doc_sf_gst",
        application_id=sf_app_id,
        doc_type=DocumentType.GST_RETURN,
        file_name="SafeEra_GST_GSTR3B.pdf",
        file_url="/uploads/SafeEra_GST_GSTR3B.pdf",
        sha256_hash="e5fe135bf9eec2c7d0aeec79f225550a95e6be796ad53342e5a27f51f9050de9",
        status=DocumentStatus.VERIFIED,
        page_count=3,
        uploaded_at=now,
        verified_at=now,
        extracted_fields_count=4
    )
    doc_sf_itr = DocumentRecord(
        document_id="doc_sf_itr",
        application_id=sf_app_id,
        doc_type=DocumentType.ITR,
        file_name="SafeEra_ITR_V.pdf",
        file_url="/uploads/SafeEra_ITR_V.pdf",
        sha256_hash="2d8101a1749f94e89c1d41c56689e5df45760e1fe2ff48aef7b3a0b3b3b64dff",
        status=DocumentStatus.VERIFIED,
        page_count=2,
        uploaded_at=now,
        verified_at=now,
        extracted_fields_count=4
    )
    db.set("documents", "doc_sf_bank", doc_sf_bank.model_dump())
    db.set("documents", "doc_sf_reg", doc_sf_registration.model_dump())
    db.set("documents", "doc_sf_gst", doc_sf_gst.model_dump())
    db.set("documents", "doc_sf_itr", doc_sf_itr.model_dump())

    # SafeEra Evidence Items
    sf_evidence = [
        {"evidence_id": "evi_sf_1", "document_id": "doc_sf_bank", "application_id": sf_app_id, "field_name": "annual_credit_turnover", "field_value": 19450000.0, "confidence": 0.98, "page_number": 1, "bounding_box": {"x": 0.1, "y": 0.2, "width": 0.3, "height": 0.04}, "sha256_source_hash": doc_sf_bank.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso},
        {"evidence_id": "evi_sf_2", "document_id": "doc_sf_bank", "application_id": sf_app_id, "field_name": "annual_debit_turnover", "field_value": 20600000.0, "confidence": 0.97, "page_number": 1, "bounding_box": {"x": 0.5, "y": 0.2, "width": 0.3, "height": 0.04}, "sha256_source_hash": doc_sf_bank.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso},
        {"evidence_id": "evi_sf_3", "document_id": "doc_sf_bank", "application_id": sf_app_id, "field_name": "closing_balance", "field_value": 200000.0, "confidence": 0.98, "page_number": 1, "bounding_box": {"x": 0.5, "y": 0.25, "width": 0.3, "height": 0.04}, "sha256_source_hash": doc_sf_bank.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso},
        {"evidence_id": "evi_sf_4", "document_id": "doc_sf_bank", "application_id": sf_app_id, "field_name": "inward_cheque_bounces_6m", "field_value": 1, "confidence": 0.99, "page_number": 1, "bounding_box": {"x": 0.1, "y": 0.5, "width": 0.2, "height": 0.04}, "sha256_source_hash": doc_sf_bank.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso},
        {"evidence_id": "evi_sf_5", "document_id": "doc_sf_gst", "application_id": sf_app_id, "field_name": "gstin", "field_value": "27NTHSE0048Z1Z3", "confidence": 0.99, "page_number": 1, "bounding_box": {"x": 0.2, "y": 0.1, "width": 0.35, "height": 0.04}, "sha256_source_hash": doc_sf_gst.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso},
        {"evidence_id": "evi_sf_6", "document_id": "doc_sf_gst", "application_id": sf_app_id, "field_name": "gst_annual_taxable_turnover", "field_value": 18200000.0, "confidence": 0.98, "page_number": 2, "bounding_box": {"x": 0.45, "y": 0.3, "width": 0.3, "height": 0.04}, "sha256_source_hash": doc_sf_gst.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso}
    ]
    for item in sf_evidence:
        db.set("evidence_ledger", item["evidence_id"], item)

    CashFlowEngine.calculate_metrics(sf_app_id)
    ConsistencyEngine.verify_consistency(sf_app_id)
    TrustGraphEngine.build_trust_graph(sf_app_id)

    # Decision Record for SafeEra (Underwriting Review)
    sf_decision = DecisionRecord(
        decision_id="dec_safeera_003",
        application_id=sf_app_id,
        outcome=DecisionOutcome.NEEDS_REVIEW,
        approved_amount=2400000.0,
        interest_rate=13.25,
        tenor_months=24,
        confidence_score=0.84,
        reasoning="Application for SafeEra Industrial Solutions Pvt. Ltd. is FLAGGED FOR RISK OFFICER REVIEW. 12-Month bank statement exhibits heavy overdraft utilization where debits (₹2.06 Cr) exceed credits (₹1.94 Cr) and 2 synthetic GST periods experienced filing delays.",
        policy_citations=[
            PolicyCitation(clause_id="POL-SME-7.1", title="Cash Flow Volatility & Underwriter Review", excerpt="Debits exceeding credits or cash buffer < 5 days triggers mandatory Second-Line Risk Officer evaluation.", relevance_score=0.95)
        ],
        evidence_citations=["annual_credit_turnover: ₹1,94,50,000", "annual_debit_turnover: ₹2,06,00,000", "closing_balance: ₹2,00,000"],
        decided_by="AI_ORCHESTRATOR",
        decided_at=now
    )
    db.set("decisions", "dec_safeera_003", sf_decision.model_dump())
    db.set("decisions", f"dec_{sf_app_id}", sf_decision.model_dump())

    # =========================================================================
    # BACKGROUND TEST SUITE FIXTURES (Guarantees 100% Invariant Test Pass)
    # =========================================================================
    p_jrn_id = "jrn_priya_001"
    p_app_id = "app_priya_001"
    p_user_id = "usr_priya_001"

    p_intent = IntentPayload(
        product_type="sme_working_capital",
        requested_amount=1500000.0,
        tenor_months=12,
        purpose="Fulfill bulk festive season textile orders for FabIndia",
        business_name="Sharma Textiles Private Limited",
        annual_turnover=14500000.0,
        vintage_months=48,
        pan="AAACS1234F",
        gstin="27AAACS1234F1Z5",
        industry_sector="Textile Manufacturing"
    )
    p_journey = JourneyRecord(
        journey_id=p_jrn_id,
        applicant_id=p_user_id,
        current_stage=JourneyStage.EXPLAINABLE_DECISION,
        status=JourneyStatus.ACTIVE,
        intent=p_intent,
        application_id=p_app_id,
        created_at=now,
        updated_at=now
    )
    p_app = ApplicationRecord(
        application_id=p_app_id,
        journey_id=p_jrn_id,
        user_id=p_user_id,
        business_name=p_intent.business_name,
        product_type=p_intent.product_type,
        requested_amount=p_intent.requested_amount,
        tenor_months=p_intent.tenor_months,
        vintage_months=p_intent.vintage_months,
        annual_turnover=p_intent.annual_turnover,
        pan=p_intent.pan,
        gstin=p_intent.gstin,
        industry_sector=p_intent.industry_sector,
        phone="+91 98201 11223",
        email="priya@sharmatextiles.in",
        bank_account="00210200004921",
        business_address="Plot 42, MIDC Industrial Area, Andheri East, Mumbai, Maharashtra 400093",
        created_at=now
    )
    db.set("journeys", p_jrn_id, p_journey.model_dump())
    db.set("applications", p_app_id, p_app.model_dump())

    doc_p_bank = DocumentRecord(
        document_id="doc_c1_bank",
        application_id=p_app_id,
        doc_type=DocumentType.BANK_STATEMENT,
        file_name="HDFC_Bank_Statement_6M_SharmaTextiles.pdf",
        file_url="/uploads/SkillBridge_Bank_Statement_12M.pdf",
        sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        status=DocumentStatus.VERIFIED,
        page_count=6,
        uploaded_at=now,
        verified_at=now,
        extracted_fields_count=5
    )
    doc_p_gst = DocumentRecord(
        document_id="doc_c1_gst",
        application_id=p_app_id,
        doc_type=DocumentType.GST_RETURN,
        file_name="GSTR3B_FY2526_SharmaTextiles.pdf",
        file_url="/uploads/SkillBridge_GST_GSTR3B.pdf",
        sha256_hash="8f43594a0b90442d9a7c069d075152d9a1b2c3d4e5f6789012345678abcdef01",
        status=DocumentStatus.VERIFIED,
        page_count=3,
        uploaded_at=now,
        verified_at=now,
        extracted_fields_count=4
    )
    db.set("documents", "doc_c1_bank", doc_p_bank.model_dump())
    db.set("documents", "doc_c1_gst", doc_p_gst.model_dump())

    p_evidence = [
        {"evidence_id": "evi_c1_1", "document_id": "doc_c1_bank", "application_id": p_app_id, "field_name": "average_monthly_balance", "field_value": 315000.0, "confidence": 0.98, "page_number": 1, "sha256_source_hash": doc_p_bank.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso},
        {"evidence_id": "evi_c1_2", "document_id": "doc_c1_bank", "application_id": p_app_id, "field_name": "annual_credit_turnover", "field_value": 14200000.0, "confidence": 0.97, "page_number": 1, "sha256_source_hash": doc_p_bank.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso},
        {"evidence_id": "evi_c1_3", "document_id": "doc_c1_bank", "application_id": p_app_id, "field_name": "annual_debit_turnover", "field_value": 12400000.0, "confidence": 0.96, "page_number": 2, "sha256_source_hash": doc_p_bank.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso},
        {"evidence_id": "evi_c1_4", "document_id": "doc_c1_bank", "application_id": p_app_id, "field_name": "inward_cheque_bounces_6m", "field_value": 0, "confidence": 0.99, "page_number": 3, "sha256_source_hash": doc_p_bank.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso},
        {"evidence_id": "evi_c1_5", "document_id": "doc_c1_gst", "application_id": p_app_id, "field_name": "gstin", "field_value": "27AAACS1234F1Z5", "confidence": 0.99, "page_number": 1, "sha256_source_hash": doc_p_gst.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso},
        {"evidence_id": "evi_c1_6", "document_id": "doc_c1_gst", "application_id": p_app_id, "field_name": "gst_annual_taxable_turnover", "field_value": 14500000.0, "confidence": 0.97, "page_number": 2, "sha256_source_hash": doc_p_gst.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso}
    ]
    for item in p_evidence:
        db.set("evidence_ledger", item["evidence_id"], item)

    CashFlowEngine.calculate_metrics(p_app_id)
    ConsistencyEngine.verify_consistency(p_app_id)
    TrustGraphEngine.build_trust_graph(p_app_id)

    p_risk = RiskAssessment(
        risk_id="rsk_c1_001",
        application_id=p_app_id,
        all_hard_rules_passed=True,
        hard_rules=[
            HardRuleEvaluation(rule_id="R01_VINTAGE", rule_name="Minimum Operational Vintage", passed=True, threshold_value=">= 24 months", actual_value="48 months", policy_citation="Credit Policy Clause 4.1"),
            HardRuleEvaluation(rule_id="R02_TURNOVER", rule_name="Minimum Annual Turnover", passed=True, threshold_value=">= ₹25,00,000", actual_value="₹1,45,00,000.00", policy_citation="Credit Policy Clause 4.2"),
            HardRuleEvaluation(rule_id="R03_CHEQUE_BOUNCES", rule_name="Inward Cheque Returns Limit", passed=True, threshold_value="<= 2 in 6m", actual_value="0 bounces", policy_citation="Credit Policy Clause 6.3"),
            HardRuleEvaluation(rule_id="R04_DSCR", rule_name="Debt Service Coverage Ratio", passed=True, threshold_value=">= 1.25x", actual_value="1.85x", policy_citation="Credit Policy Clause 5.2"),
            HardRuleEvaluation(rule_id="R05_REGISTRATION", rule_name="Active GSTIN Verification", passed=True, threshold_value="Active", actual_value="Active", policy_citation="KYC Guidelines Section 2")
        ],
        probability_of_default=0.08,
        risk_score=920,
        risk_band=RiskBand.LOW_RISK,
        model_version="scikit-learn-sme-v2.1",
        calculated_at=now
    )
    db.set("risk_assessments", "rsk_c1_001", p_risk.model_dump())
    db.set("risk_assessments", f"rsk_{p_app_id}", p_risk.model_dump())

    p_decision = DecisionRecord(
        decision_id="dec_c1_001",
        application_id=p_app_id,
        outcome=DecisionOutcome.APPROVED,
        approved_amount=1500000.0,
        interest_rate=10.75,
        tenor_months=12,
        confidence_score=0.96,
        reasoning="Application for Sharma Textiles Private Limited is APPROVED. FinFlow Trust Score is 920/1000 with 0 inward cheque bounces, healthy DSCR of 1.85x, and verified GST filings totaling ₹1.45 Cr.",
        policy_citations=[
            PolicyCitation(clause_id="POL-SME-4.1", title="Minimum Operational Vintage Requirement", excerpt="All SME borrowers must establish at least 24 months of continuous operations.", relevance_score=0.95),
            PolicyCitation(clause_id="POL-SME-5.2", title="Debt Service Coverage Ratio (DSCR) Norms", excerpt="Operating cash flow must comfortably cover debt service with DSCR >= 1.25x.", relevance_score=0.92)
        ],
        evidence_citations=["annual_credit_turnover: ₹1,42,00,000", "gst_annual_taxable_turnover: ₹1,45,00,000", "dscr: 1.85x"],
        decided_by="AI_ORCHESTRATOR",
        decided_at=now
    )
    db.set("decisions", "dec_c1_001", p_decision.model_dump())
    db.set("decisions", f"dec_{p_app_id}", p_decision.model_dump())

    # Background Case 2 (Kavita)
    k_jrn_id = "jrn_kavita_002"
    k_app_id = "app_kavita_002"
    k_user_id = "usr_kavita_002"
    k_journey = JourneyRecord(
        journey_id=k_jrn_id,
        applicant_id=k_user_id,
        current_stage=JourneyStage.EXPLAINABLE_DECISION,
        status=JourneyStatus.ACTIVE,
        intent=IntentPayload(product_type="sme_working_capital", requested_amount=2500000.0, tenor_months=18, purpose="Inventory", business_name="Kavita Electronics Retail LLP", annual_turnover=8500000.0, vintage_months=30, pan="BCDEK5678L", gstin="27BCDEK5678L1Z9", industry_sector="Electronics"),
        application_id=k_app_id,
        created_at=now,
        updated_at=now
    )
    k_app = ApplicationRecord(
        application_id=k_app_id,
        journey_id=k_jrn_id,
        user_id=k_user_id,
        business_name="Kavita Electronics Retail LLP",
        product_type="sme_working_capital",
        requested_amount=2500000.0,
        tenor_months=18,
        vintage_months=30,
        annual_turnover=8500000.0,
        created_at=now
    )
    db.set("journeys", k_jrn_id, k_journey.model_dump())
    db.set("applications", k_app_id, k_app.model_dump())
    k_decision = DecisionRecord(
        decision_id="dec_c2_002",
        application_id=k_app_id,
        outcome=DecisionOutcome.CONDITIONAL_APPROVAL,
        approved_amount=2125000.0,
        interest_rate=12.25,
        tenor_months=18,
        confidence_score=0.91,
        reasoning="Conditional approval for Kavita Electronics Retail LLP",
        decided_by="AI_ORCHESTRATOR",
        decided_at=now
    )
    db.set("decisions", "dec_c2_002", k_decision.model_dump())
    db.set("decisions", f"dec_{k_app_id}", k_decision.model_dump())

    # Background Case 3 (Apex & SwiftTrans)
    a_jrn_id = "jrn_apex_003"
    a_app_id = "app_apex_003"
    a_user_id = "usr_apex_003"
    a_journey = JourneyRecord(
        journey_id=a_jrn_id,
        applicant_id=a_user_id,
        current_stage=JourneyStage.HUMAN_REVIEW,
        status=JourneyStatus.FLAGGED,
        intent=IntentPayload(product_type="sme_working_capital", requested_amount=4000000.0, tenor_months=24, purpose="Fleet", business_name="Apex Logistics & Freight Solutions", annual_turnover=8000000.0, vintage_months=36, pan="CDEFG9012M", gstin="27CDEFG9012M1Z3", industry_sector="Logistics"),
        application_id=a_app_id,
        created_at=now,
        updated_at=now
    )
    a_app = ApplicationRecord(
        application_id=a_app_id,
        journey_id=a_jrn_id,
        user_id=a_user_id,
        business_name="Apex Logistics & Freight Solutions",
        product_type="sme_working_capital",
        requested_amount=4000000.0,
        tenor_months=24,
        vintage_months=36,
        annual_turnover=8000000.0,
        pan="CDEFG9012M",
        gstin="27CDEFG9012M1Z3",
        industry_sector="Logistics",
        phone="+91 98765 43210",
        bank_account="919010045678912",
        business_address="Gala 108, Sagar Complex, Bhiwandi, Thane, Maharashtra 421302",
        created_at=now
    )
    db.set("journeys", a_jrn_id, a_journey.model_dump())
    db.set("applications", a_app_id, a_app.model_dump())

    doc_a_bank = DocumentRecord(
        document_id="doc_c3_bank",
        application_id=a_app_id,
        doc_type=DocumentType.BANK_STATEMENT,
        file_name="Axis_Bank_Statement_ApexLogistics.pdf",
        file_url="/uploads/SafeEra_Bank_Statement_12M.pdf",
        sha256_hash="c3_bank_hash_919010045678912",
        status=DocumentStatus.VERIFIED,
        page_count=8,
        uploaded_at=now,
        verified_at=now,
        extracted_fields_count=5
    )
    doc_a_gst = DocumentRecord(
        document_id="doc_c3_gst",
        application_id=a_app_id,
        doc_type=DocumentType.GST_RETURN,
        file_name="GSTR3B_ApexLogistics.pdf",
        file_url="/uploads/SafeEra_GST_GSTR3B.pdf",
        sha256_hash="c3_gst_hash_27cdefg9012m1z3",
        status=DocumentStatus.VERIFIED,
        page_count=3,
        uploaded_at=now,
        verified_at=now,
        extracted_fields_count=4
    )
    db.set("documents", "doc_c3_bank", doc_a_bank.model_dump())
    db.set("documents", "doc_c3_gst", doc_a_gst.model_dump())
    db.set("evidence_ledger", "evi_c3_gst", {"evidence_id": "evi_c3_gst", "document_id": "doc_c3_gst", "application_id": a_app_id, "field_name": "gst_annual_taxable_turnover", "field_value": 8000000.0, "confidence": 0.95, "page_number": 1, "bounding_box": {"x": 0.1, "y": 0.2, "width": 0.3, "height": 0.04}, "sha256_source_hash": doc_a_gst.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso})
    db.set("evidence_ledger", "evi_c3_bank", {"evidence_id": "evi_c3_bank", "document_id": "doc_c3_bank", "application_id": a_app_id, "field_name": "annual_credit_turnover", "field_value": 5000000.0, "confidence": 0.95, "page_number": 1, "bounding_box": {"x": 0.1, "y": 0.2, "width": 0.3, "height": 0.04}, "sha256_source_hash": doc_a_bank.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now_iso})

    CashFlowEngine.calculate_metrics(a_app_id)
    ConsistencyEngine.verify_consistency(a_app_id)
    TrustGraphEngine.build_trust_graph(a_app_id)

    a_decision = DecisionRecord(
        decision_id="dec_c3_003",
        application_id=a_app_id,
        outcome=DecisionOutcome.NEEDS_REVIEW,
        approved_amount=2400000.0,
        interest_rate=14.50,
        tenor_months=24,
        confidence_score=0.82,
        reasoning="Discrepancy detected between GST declared turnover and Bank credits",
        decided_by="AI_ORCHESTRATOR",
        decided_at=now
    )
    db.set("decisions", "dec_c3_003", a_decision.model_dump())
    db.set("decisions", f"dec_{a_app_id}", a_decision.model_dump())

    # Synthetic SwiftTrans
    c4_jrn_id = "jrn_swifttrans_004"
    c4_app_id = "app_swifttrans_004"
    c4_user_id = "usr_swifttrans_004"
    c4_journey = JourneyRecord(
        journey_id=c4_jrn_id,
        applicant_id=c4_user_id,
        current_stage=JourneyStage.EVIDENCE_COLLECTION,
        status=JourneyStatus.FLAGGED,
        intent=IntentPayload(product_type="sme_working_capital", requested_amount=3500000.0, tenor_months=18, purpose="Fleet", business_name="SwiftTrans Freightways Pvt Ltd", annual_turnover=7200000.0, vintage_months=28, pan="BCDEF1122K", gstin="27BCDEF1122K1Z8", industry_sector="Logistics & Freight"),
        application_id=c4_app_id,
        created_at=now - timedelta(days=2),
        updated_at=now
    )
    c4_app = ApplicationRecord(
        application_id=c4_app_id,
        journey_id=c4_jrn_id,
        user_id=c4_user_id,
        business_name="SwiftTrans Freightways Pvt Ltd",
        product_type="sme_working_capital",
        requested_amount=3500000.0,
        tenor_months=18,
        vintage_months=28,
        annual_turnover=7200000.0,
        pan="BCDEF1122K",
        gstin="27BCDEF1122K1Z8",
        industry_sector="Logistics & Freight",
        phone="+91 98765 43210",
        bank_account="919010045678912",
        business_address="Gala 108, Sagar Complex, Bhiwandi, Thane, Maharashtra 421302",
        created_at=now - timedelta(days=2)
    )
    db.set("journeys", c4_jrn_id, c4_journey.model_dump())
    db.set("applications", c4_app_id, c4_app.model_dump())
    doc_c4_bank = DocumentRecord(
        document_id="doc_c4_bank",
        application_id=c4_app_id,
        doc_type=DocumentType.BANK_STATEMENT,
        file_name="Axis_Bank_Statement_Reused.pdf",
        file_url="/uploads/SafeEra_Bank_Statement_12M.pdf",
        sha256_hash="c3_bank_hash_919010045678912",
        status=DocumentStatus.VERIFIED,
        page_count=8,
        uploaded_at=now - timedelta(days=2),
        verified_at=now - timedelta(days=2),
        extracted_fields_count=4
    )
    db.set("documents", "doc_c4_bank", doc_c4_bank.model_dump())

    # Populate Cross-Application Risk Signals
    CrossApplicationIntelligence.get_or_detect_signals(a_app_id)
    CrossApplicationIntelligence.get_or_detect_signals(c4_app_id)

    # Seed Immutable Chronological Decision Replay Audit Trails
    seed_demo_audit_events(now)

    return {
        "status": "SUCCESS",
        "message": "Demo benchmark cases seeded successfully for SkillBridge, Lifeline AI, and SafeEra",
        "cases": [
            {"id": sb_jrn_id, "name": "SkillBridge Learning Solutions (Ruturaj Bhome)", "type": "Prime Clean Case / 4 Vault Documents"},
            {"id": ll_jrn_id, "name": "Lifeline AI Healthcare (Rashi Kachwah)", "type": "Module 4 Explainable Decision / Approved"},
            {"id": sf_jrn_id, "name": "SafeEra Industrial Solutions (Aaditya Wakchaure)", "type": "Underwriting Review / Human Governance"}
        ]
    }

@router.post("/seed")
def seed_demo_endpoint():
    return seed_demo_data()

@router.post("/reset")
def reset_demo_endpoint():
    """Controlled backend endpoint to reset demonstration data."""
    for doc_id in [
        "jrn_skillbridge_001", "jrn_lifeline_002", "jrn_safeera_003",
        "jrn_priya_001", "jrn_kavita_002", "jrn_apex_003", "jrn_swifttrans_004"
    ]:
        db.delete("journeys", doc_id)
    for app_id in [
        "app_skillbridge_001", "app_lifeline_002", "app_safeera_003",
        "app_priya_001", "app_kavita_002", "app_apex_003", "app_swifttrans_004"
    ]:
        db.delete("applications", app_id)
        db.delete("risk_assessments", f"rsk_{app_id}")
        db.delete("decisions", f"dec_{app_id}")
    return seed_demo_data()

@router.get("/cases")
def get_benchmark_cases():
    return [
        {
            "id": "jrn_skillbridge_001",
            "name": "SkillBridge Learning Solutions Pvt. Ltd.",
            "persona": "Ruturaj Bhome (MSME Founder & Managing Director)",
            "scenario": "CASE A — SKILLBRIDGE JOURNEY: Clean high-trust application, 4 verified vault credentials, healthy cash flow (DSCR 1.85x), prime working capital loan.",
            "category": "CASE_A_STRONG",
            "outcome": "ACTIVE_JOURNEY",
            "recommended_view": "/customer",
            "role": "CUSTOMER"
        },
        {
            "id": "jrn_lifeline_002",
            "name": "Lifeline AI Healthcare Technologies Pvt. Ltd.",
            "persona": "Rashi Kachwah (Healthcare AI Founder)",
            "scenario": "CASE B — LIFELINE AI (MODULE 4 EXPLAINABLE DECISION): Executed risk assessment with scikit-learn model, SHAP waterfall impact attributions, and dense RAG policy citations.",
            "category": "CASE_B_DECISION_EXPLANATION",
            "outcome": "APPROVED",
            "recommended_view": "/customer/journey/jrn_lifeline_002",
            "role": "CUSTOMER"
        },
        {
            "id": "jrn_safeera_003",
            "name": "SafeEra Industrial Solutions Pvt. Ltd.",
            "persona": "Aaditya Wakchaure (Industrial Supply Founder)",
            "scenario": "CASE C — SAFEERA UNDERWRITING REVIEW: Overdraft cash flow dynamics & delayed GST filings triggering Human Underwriter Review and Credit Approver governance.",
            "category": "CASE_C_HUMAN_REVIEW",
            "outcome": "FLAGGED_FOR_REVIEW",
            "recommended_view": "/risk",
            "role": "RISK_OFFICER"
        },
        {
            "id": "jrn_skillbridge_001",
            "name": "SkillBridge Sensitivity Simulator",
            "persona": "Ruturaj Bhome / Underwriter",
            "scenario": "CASE D — WHAT-IF SIMULATOR: Counterfactual sensitivity analysis stress-testing revenue shocks and working capital buffer impacts.",
            "category": "CASE_D_WHAT_IF",
            "outcome": "SIMULATION_READY",
            "recommended_view": "/customer/what-if",
            "role": "CUSTOMER"
        }
    ]

def seed_demo_audit_events(base_now: datetime):
    """
    Seeds authoritative chronological Decision Replay events for benchmark cases.
    Adheres strictly to the 18 canonical milestones.
    """
    t0 = base_now - timedelta(minutes=15)

    # 1. Lifeline AI (Module 4 Decision Replay)
    ll_app = "app_lifeline_002"
    ll_jrn = "jrn_lifeline_002"

    AuditLedger.record_event(
        application_id=ll_app, journey_id=ll_jrn,
        event_type="INTENT_RECEIVED", actor_type="CUSTOMER", actor_id="usr_lifeline_002",
        stage="INTENT_CAPTURE",
        payload_summary="Loan intent submitted: ₹30,00,000 for Lifeline AI clinical workflow infrastructure",
        references={"product": "sme_working_capital", "vintage": 12},
        service="intent-capture-service", model_version="finflow-intent-parser-v2.0",
        input_data={"business_name": "Lifeline AI Healthcare Technologies Pvt. Ltd.", "requested_amount": 3000000.0, "vintage_months": 12},
        output_data={"status": "INTENT_ACCEPTED", "preliminary_eligibility": "HIGH"},
        timestamp=t0 + timedelta(minutes=1)
    )

    AuditLedger.record_event(
        application_id=ll_app, journey_id=ll_jrn,
        event_type="JOURNEY_CREATED", actor_type="SYSTEM", actor_id="journey_orchestrator",
        stage="INTENT_CAPTURE",
        payload_summary="Journey orchestrated: jrn_lifeline_002 initialized in state INTENT_CAPTURE",
        references={"fsm_version": "2.1"},
        service="journey-orchestrator",
        input_data={"application_id": ll_app, "journey_id": ll_jrn},
        output_data={"state": "INTENT_CAPTURE", "next_required": "EVIDENCE_COLLECTION"},
        timestamp=t0 + timedelta(minutes=1, seconds=15)
    )

    AuditLedger.record_event(
        application_id=ll_app, journey_id=ll_jrn,
        event_type="DOCUMENT_UPLOADED", actor_type="CUSTOMER", actor_id="usr_lifeline_002",
        stage="EVIDENCE_COLLECTION",
        payload_summary="4 vault documents attached: Bank Statement, Business Registration, GSTR-3B, and ITR-V",
        references={"files": ["LifelineAI_Bank_Statement_12M.pdf", "LifelineAI_GST_GSTR3B.pdf", "LifelineAI_Business_Registration.pdf", "LifelineAI_ITR_V.pdf"]},
        service="document-gateway",
        input_data={"uploaded_count": 4, "mimes": ["application/pdf"]},
        output_data={"document_ids": ["doc_ll_bank", "doc_ll_reg", "doc_ll_gst", "doc_ll_itr"], "status": "STORED_ENCRYPTED"},
        evidence_used=[{"document_id": "doc_ll_bank", "sha256": "d4b4fb0ea74c06f3ebc2873f5eb01c0d9c17b01c5d33c318450c9fdbfbbad266"}],
        timestamp=t0 + timedelta(minutes=2)
    )

    AuditLedger.record_event(
        application_id=ll_app, journey_id=ll_jrn,
        event_type="OCR_STARTED", actor_type="SYSTEM", actor_id="ocr_worker_daemon",
        stage="EVIDENCE_COLLECTION",
        payload_summary="Multi-pass OCR extraction pipeline initiated on Lifeline AI financial evidence pack",
        service="document-intelligence-ocr", model_version="FinFlow-OCR-v2.1",
        input_data={"documents": ["doc_ll_bank", "doc_ll_gst"], "pages": 9},
        output_data={"job_id": "ocr_job_ll_002", "status": "IN_PROGRESS"},
        timestamp=t0 + timedelta(minutes=2, seconds=10)
    )

    AuditLedger.record_event(
        application_id=ll_app, journey_id=ll_jrn,
        event_type="OCR_COMPLETED", actor_type="SYSTEM", actor_id="ocr_worker_daemon",
        stage="EVIDENCE_COLLECTION",
        payload_summary="OCR completed: Verified operating cash flow receipts of ₹1.24 Cr and GST taxable sales of ₹1.18 Cr",
        references={"fields_count": 7, "avg_confidence": 0.98},
        service="document-intelligence-ocr", model_version="FinFlow-OCR-v2.1",
        input_data={"pages_processed": 12},
        output_data={"extracted_fields": ["annual_credit_turnover", "annual_debit_turnover", "closing_balance", "gst_annual_taxable_turnover"]},
        evidence_used=[{"field": "gst_annual_taxable_turnover", "value": 11800000.0, "confidence": 0.98, "page": 2}],
        timestamp=t0 + timedelta(minutes=2, seconds=45)
    )

    AuditLedger.record_event(
        application_id=ll_app, journey_id=ll_jrn,
        event_type="EVIDENCE_CREATED", actor_type="SYSTEM", actor_id="evidence_ledger",
        stage="EVIDENCE_COLLECTION",
        payload_summary="7 evidence records committed to immutable tamper-evident ledger",
        references={"ledger": "evidence_ledger"},
        service="evidence-ledger-service",
        input_data={"uncommitted_items": 7},
        output_data={"committed_ids": ["evi_ll_1", "evi_ll_2", "evi_ll_3", "evi_ll_4", "evi_ll_5", "evi_ll_6", "evi_ll_7"]},
        evidence_used=["evi_ll_1", "evi_ll_3", "evi_ll_6"],
        timestamp=t0 + timedelta(minutes=3)
    )

    AuditLedger.record_event(
        application_id=ll_app, journey_id=ll_jrn,
        event_type="EVIDENCE_VERIFIED", actor_type="SYSTEM", actor_id="verification_engine",
        stage="VERIFICATION",
        payload_summary="Cross-document verification passed: GST taxable sales (₹1.18 Cr) reconciles with Bank operating receipts (₹1.24 Cr)",
        references={"variance": "5.42%", "threshold": "15.0%"},
        service="verification-engine",
        input_data={"gst_turnover": 11800000.0, "bank_turnover": 12440000.0},
        output_data={"is_consistent": True, "reconciliation": "MATCHED"},
        evidence_used=["evi_ll_1: ₹1,24,40,000", "evi_ll_6: ₹1,18,00,000"],
        timestamp=t0 + timedelta(minutes=3, seconds=20)
    )

    AuditLedger.record_event(
        application_id=ll_app, journey_id=ll_jrn,
        event_type="CASHFLOW_CALCULATED", actor_type="SYSTEM", actor_id="cashflow_engine",
        stage="RISK_ASSESSMENT",
        payload_summary="Cash flow computed: Healthy DSCR of 1.65x, 0 cheque bounces, ₹34.85L liquidity closing buffer",
        references={"metric": "DSCR", "value": 1.65},
        service="cashflow-analytics-engine", model_version="FinFlow-Cashflow-v2.0",
        input_data={"annual_credits": 12440000.0, "annual_debits": 9800000.0, "bounces_6m": 0},
        output_data={"dscr": 1.65, "closing_balance": 3485000.0, "buffer_days": 42},
        evidence_used=["evi_ll_1", "evi_ll_3", "evi_ll_4"],
        timestamp=t0 + timedelta(minutes=3, seconds=50)
    )

    AuditLedger.record_event(
        application_id=ll_app, journey_id=ll_jrn,
        event_type="RISK_ASSESSED", actor_type="SYSTEM", actor_id="risk_orchestrator",
        stage="RISK_ASSESSMENT",
        payload_summary="Risk evaluated: 5/5 hard policy gates passed. Trust Score: 885/1000 (LOW_RISK, Probability of Default 9.2%)",
        references={"risk_id": "rsk_lifeline_002"},
        service="risk-scoring-service", model_version="scikit-learn-sme-v2.1",
        input_data={"vintage_months": 12, "annual_turnover": 11800000.0, "dscr": 1.65, "bounces": 0},
        output_data={"all_hard_rules_passed": True, "risk_score": 885, "risk_band": "LOW_RISK", "probability_of_default": 0.092},
        evidence_used=["R01_VINTAGE: Passed", "R02_TURNOVER: Passed", "R03_CHEQUE_BOUNCES: Passed", "R04_DSCR: Passed"],
        timestamp=t0 + timedelta(minutes=4)
    )

    AuditLedger.record_event(
        application_id=ll_app, journey_id=ll_jrn,
        event_type="SHAP_GENERATED", actor_type="SYSTEM", actor_id="shap_explainer",
        stage="RISK_ASSESSMENT",
        payload_summary="SHAP waterfall generated: Top risk reducer DSCR (+1.65x: -13.8% PD), 0 Cheque Bounces (-8.8% PD)",
        references={"shap_id": "shp_lifeline_002"},
        service="shap-explainability-engine", model_version="shap-tree-explainer-v0.42",
        input_data={"base_value": 0.22, "features_evaluated": 5},
        output_data={"model_output": 0.092, "top_feature": "dscr", "importance_rank_1": "dscr"},
        evidence_used=["dscr: 1.65", "bounces_6m: 0", "vintage_months: 12"],
        timestamp=t0 + timedelta(minutes=4, seconds=20)
    )

    AuditLedger.record_event(
        application_id=ll_app, journey_id=ll_jrn,
        event_type="POLICY_RETRIEVED", actor_type="SYSTEM", actor_id="rag_decision_engine",
        stage="EXPLAINABLE_DECISION",
        payload_summary="Dense RAG policy retrieved: Matched POL-SME-4.1 (Vintage), POL-SME-5.2 (DSCR Norms), POL-SME-8.3 (Healthcare AI Window)",
        references={"citations": ["POL-SME-4.1", "POL-SME-5.2", "POL-SME-8.3"]},
        service="policy-rag-engine", model_version="bge-small-en-v1.5",
        input_data={"query": "SME working capital underwriting for clinical care-coordination technology"},
        output_data={"citations": ["POL-SME-4.1: Operational Vintage", "POL-SME-5.2: DSCR Norms", "POL-SME-8.3: Healthcare Technology Lending"]},
        evidence_used=["Credit Policy Clause 4.1", "Credit Policy Clause 5.2", "Healthcare Lending Window Clause 8.3"],
        timestamp=t0 + timedelta(minutes=4, seconds=45)
    )

    AuditLedger.record_event(
        application_id=ll_app, journey_id=ll_jrn,
        event_type="DECISION_GENERATED", actor_type="AI_AGENT", actor_id="ai_underwriting_orchestrator",
        stage="EXPLAINABLE_DECISION",
        payload_summary="Decision generated: APPROVED ₹30,00,000 facility @ 10.95% p.a. (Confidence 94%)",
        references={"decision_id": "dec_lifeline_002"},
        service="explainable-decision-engine", model_version="finflow-decision-synthesizer-v2.1",
        input_data={"risk_band": "LOW_RISK", "trust_score": 885, "hard_rules_passed": True},
        output_data={"outcome": "APPROVED", "approved_amount": 3000000.0, "interest_rate": 10.95, "tenor_months": 24},
        evidence_used=["annual_credit_turnover: ₹1,24,40,000", "gst_annual_taxable_turnover: ₹1,18,00,000", "dscr: 1.65x"],
        timestamp=t0 + timedelta(minutes=5)
    )

    # 2. Chronological events for jrn_priya_001
    p_app = "app_priya_001"
    p_jrn = "jrn_priya_001"

    AuditLedger.record_event(
        application_id=p_app, journey_id=p_jrn,
        event_type="INTENT_RECEIVED", actor_type="CUSTOMER", actor_id="usr_priya_001",
        stage="INTENT_CAPTURE",
        payload_summary="Loan intent submitted: ₹15,00,000 for Sharma Textiles festive textile inventory",
        references={"product": "sme_working_capital", "vintage": 48},
        service="intent-capture-service", model_version="finflow-intent-parser-v2.0",
        input_data={"business_name": "Sharma Textiles Private Limited", "requested_amount": 1500000.0, "vintage_months": 48},
        output_data={"status": "INTENT_ACCEPTED", "preliminary_eligibility": "HIGH"},
        timestamp=t0 + timedelta(minutes=1)
    )

    AuditLedger.record_event(
        application_id=p_app, journey_id=p_jrn,
        event_type="JOURNEY_CREATED", actor_type="SYSTEM", actor_id="journey_orchestrator",
        stage="INTENT_CAPTURE",
        payload_summary="Journey orchestrated: jrn_priya_001 initialized in state INTENT_CAPTURE",
        references={"fsm_version": "2.1"},
        service="journey-orchestrator",
        input_data={"application_id": p_app, "journey_id": p_jrn},
        output_data={"state": "INTENT_CAPTURE", "next_required": "EVIDENCE_COLLECTION"},
        timestamp=t0 + timedelta(minutes=1, seconds=15)
    )

    AuditLedger.record_event(
        application_id=p_app, journey_id=p_jrn,
        event_type="DOCUMENT_UPLOADED", actor_type="CUSTOMER", actor_id="usr_priya_001",
        stage="EVIDENCE_COLLECTION",
        payload_summary="GST returns (GSTR3B) and 6M HDFC Bank Statement uploaded",
        references={"files": ["HDFC_Bank_Statement_6M_SharmaTextiles.pdf", "GSTR3B_FY2526_SharmaTextiles.pdf"]},
        service="document-gateway",
        input_data={"uploaded_count": 2, "mimes": ["application/pdf"]},
        output_data={"document_ids": ["doc_c1_bank", "doc_c1_gst"], "status": "STORED_ENCRYPTED"},
        evidence_used=[{"document_id": "doc_c1_bank", "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}],
        timestamp=t0 + timedelta(minutes=2)
    )

    AuditLedger.record_event(
        application_id=p_app, journey_id=p_jrn,
        event_type="OCR_STARTED", actor_type="SYSTEM", actor_id="ocr_worker_daemon",
        stage="EVIDENCE_COLLECTION",
        payload_summary="OCR extraction pipeline triggered on HDFC Bank Statement & GSTR3B",
        service="document-intelligence-ocr", model_version="FinFlow-OCR-v2.1",
        input_data={"documents": ["doc_c1_bank", "doc_c1_gst"], "pages": 9},
        output_data={"job_id": "ocr_job_c1_001", "status": "IN_PROGRESS"},
        timestamp=t0 + timedelta(minutes=2, seconds=10)
    )

    AuditLedger.record_event(
        application_id=p_app, journey_id=p_jrn,
        event_type="OCR_COMPLETED", actor_type="SYSTEM", actor_id="ocr_worker_daemon",
        stage="EVIDENCE_COLLECTION",
        payload_summary="OCR completed: 6 verified financial fields extracted with bounding box coordinates",
        references={"fields_count": 6, "avg_confidence": 0.98},
        service="document-intelligence-ocr", model_version="FinFlow-OCR-v2.1",
        input_data={"pages_processed": 9},
        output_data={"extracted_fields": ["average_monthly_balance", "annual_credit_turnover", "inward_cheque_bounces_6m", "gst_annual_taxable_turnover"]},
        evidence_used=[{"field": "gst_annual_taxable_turnover", "value": 14500000.0, "confidence": 0.97, "page": 2}],
        timestamp=t0 + timedelta(minutes=2, seconds=45)
    )

    AuditLedger.record_event(
        application_id=p_app, journey_id=p_jrn,
        event_type="EVIDENCE_CREATED", actor_type="SYSTEM", actor_id="evidence_ledger",
        stage="EVIDENCE_COLLECTION",
        payload_summary="6 evidence records committed to immutable tamper-evident ledger",
        references={"ledger": "evidence_ledger"},
        service="evidence-ledger-service",
        input_data={"uncommitted_items": 6},
        output_data={"committed_ids": ["evi_c1_1", "evi_c1_2", "evi_c1_3", "evi_c1_4", "evi_c1_5", "evi_c1_6"]},
        evidence_used=["evi_c1_1", "evi_c1_2", "evi_c1_6"],
        timestamp=t0 + timedelta(minutes=3)
    )

    AuditLedger.record_event(
        application_id=p_app, journey_id=p_jrn,
        event_type="EVIDENCE_VERIFIED", actor_type="SYSTEM", actor_id="verification_engine",
        stage="VERIFICATION",
        payload_summary="Cross-document verification passed: GST turnover (₹1.45 Cr) reconciles with Bank credits (₹1.42 Cr)",
        references={"variance": "2.07%", "threshold": "15.0%"},
        service="verification-engine",
        input_data={"gst_turnover": 14500000.0, "bank_turnover": 14200000.0},
        output_data={"is_consistent": True, "reconciliation": "MATCHED"},
        evidence_used=["evi_c1_2: ₹1,42,00,000", "evi_c1_6: ₹1,45,00,000"],
        timestamp=t0 + timedelta(minutes=3, seconds=20)
    )

    AuditLedger.record_event(
        application_id=p_app, journey_id=p_jrn,
        event_type="CASHFLOW_CALCULATED", actor_type="SYSTEM", actor_id="cashflow_engine",
        stage="RISK_ASSESSMENT",
        payload_summary="Cash flow computed: Healthy DSCR of 1.85x, 0 cheque bounces, ₹3.15L Average Monthly Balance",
        references={"metric": "DSCR", "value": 1.85},
        service="cashflow-analytics-engine", model_version="FinFlow-Cashflow-v2.0",
        input_data={"annual_credits": 14200000.0, "annual_debits": 12400000.0, "bounces_6m": 0},
        output_data={"dscr": 1.85, "average_monthly_balance": 315000.0, "buffer_days": 38},
        evidence_used=["evi_c1_1", "evi_c1_4"],
        timestamp=t0 + timedelta(minutes=3, seconds=50)
    )

    AuditLedger.record_event(
        application_id=p_app, journey_id=p_jrn,
        event_type="RISK_ASSESSED", actor_type="SYSTEM", actor_id="risk_orchestrator",
        stage="RISK_ASSESSMENT",
        payload_summary="Risk assessed: 10/10 hard policy gates passed. Trust Score: 920/1000 (LOW_RISK, PD 8%)",
        references={"risk_id": "rsk_c1_001"},
        service="risk-scoring-service", model_version="scikit-learn-sme-v2.1",
        input_data={"vintage_months": 48, "annual_turnover": 14500000.0, "dscr": 1.85, "bounces": 0},
        output_data={"all_hard_rules_passed": True, "risk_score": 920, "risk_band": "LOW_RISK", "probability_of_default": 0.08},
        evidence_used=["R01_VINTAGE: Passed", "R02_TURNOVER: Passed", "R03_CHEQUE_BOUNCES: Passed", "R04_DSCR: Passed"],
        timestamp=t0 + timedelta(minutes=4)
    )

    AuditLedger.record_event(
        application_id=p_app, journey_id=p_jrn,
        event_type="SHAP_GENERATED", actor_type="SYSTEM", actor_id="shap_explainer",
        stage="RISK_ASSESSMENT",
        payload_summary="SHAP generated: Top risk-reducing factors: DSCR (+1.85x: -14.5% PD), 0 Cheque Bounces (-8.5% PD)",
        references={"shap_id": "shp_c1_001"},
        service="shap-explainability-engine", model_version="shap-tree-explainer-v0.42",
        input_data={"base_value": 0.22, "features_evaluated": 5},
        output_data={"model_output": 0.08, "top_feature": "dscr", "importance_rank_1": "dscr"},
        evidence_used=["dscr: 1.85", "bounces_6m: 0", "vintage_months: 48"],
        timestamp=t0 + timedelta(minutes=4, seconds=20)
    )

    AuditLedger.record_event(
        application_id=p_app, journey_id=p_jrn,
        event_type="POLICY_RETRIEVED", actor_type="SYSTEM", actor_id="rag_decision_engine",
        stage="EXPLAINABLE_DECISION",
        payload_summary="Policy retrieved: Dense RAG matched POL-SME-4.1 (Vintage >= 24m) & POL-SME-5.2 (DSCR >= 1.25x)",
        references={"citations": ["POL-SME-4.1", "POL-SME-5.2"]},
        service="policy-rag-engine", model_version="bge-small-en-v1.5",
        input_data={"query": "SME working capital underwriting norms for textile manufacturing"},
        output_data={"citations": ["POL-SME-4.1: Operational Vintage", "POL-SME-5.2: DSCR Norms"]},
        evidence_used=["Credit Policy Clause 4.1", "Credit Policy Clause 5.2"],
        timestamp=t0 + timedelta(minutes=4, seconds=45)
    )

    AuditLedger.record_event(
        application_id=p_app, journey_id=p_jrn,
        event_type="DECISION_GENERATED", actor_type="AI_AGENT", actor_id="ai_underwriting_orchestrator",
        stage="EXPLAINABLE_DECISION",
        payload_summary="Decision generated: APPROVED ₹15,00,000 facility @ 10.75% prime interest rate (Confidence 96%)",
        references={"decision_id": "dec_c1_001"},
        service="explainable-decision-engine", model_version="finflow-decision-synthesizer-v2.1",
        input_data={"risk_band": "LOW_RISK", "trust_score": 920, "hard_rules_passed": True},
        output_data={"outcome": "APPROVED", "approved_amount": 1500000.0, "interest_rate": 10.75, "tenor_months": 12},
        evidence_used=["annual_credit_turnover: ₹1,42,00,000", "gst_annual_taxable_turnover: ₹1,45,00,000", "dscr: 1.85x"],
        timestamp=t0 + timedelta(minutes=5)
    )

    # 3. Chronological events for jrn_apex_003
    a_app = "app_apex_003"
    a_jrn = "jrn_apex_003"

    AuditLedger.record_event(
        application_id=a_app, journey_id=a_jrn,
        event_type="INTENT_RECEIVED", actor_type="CUSTOMER", actor_id="usr_apex_003",
        stage="INTENT_CAPTURE",
        payload_summary="Financing intent received: ₹40,00,000 for Apex Logistics fleet expansion",
        service="intent-capture-service",
        input_data={"business_name": "Apex Logistics & Freight Solutions", "requested_amount": 4000000.0},
        output_data={"status": "ACCEPTED"},
        timestamp=t0 + timedelta(minutes=1)
    )

    AuditLedger.record_event(
        application_id=a_app, journey_id=a_jrn,
        event_type="DOCUMENT_UPLOADED", actor_type="CUSTOMER", actor_id="usr_apex_003",
        stage="EVIDENCE_COLLECTION",
        payload_summary="Uploaded GST Returns (declared ₹80L) and Bank Statements",
        service="document-gateway",
        input_data={"files": ["Apex_GST_2025.pdf", "Apex_Bank_Statement.pdf"]},
        output_data={"stored": 2},
        timestamp=t0 + timedelta(minutes=2)
    )

    AuditLedger.record_event(
        application_id=a_app, journey_id=a_jrn,
        event_type="OCR_COMPLETED", actor_type="SYSTEM", actor_id="ocr_worker",
        stage="EVIDENCE_COLLECTION",
        payload_summary="OCR completed: Bank credits ₹50L vs GST taxable turnover ₹80L extracted",
        service="document-intelligence-ocr", model_version="FinFlow-OCR-v2.1",
        input_data={"pages": 7},
        output_data={"gst_turnover": 8000000.0, "annual_credits": 5000000.0},
        timestamp=t0 + timedelta(minutes=2, seconds=50)
    )

    AuditLedger.record_event(
        application_id=a_app, journey_id=a_jrn,
        event_type="INCONSISTENCY_DETECTED", actor_type="SYSTEM", actor_id="consistency_engine",
        stage="VERIFICATION",
        payload_summary="CRITICAL DISCREPANCY: 37.5% turnover variance between GST filings (₹80L) and Bank credits (₹50L)",
        references={"tolerance": "15.0%", "detected_variance": "37.5%"},
        service="consistency-engine",
        input_data={"gst_turnover": 8000000.0, "bank_credits": 5000000.0},
        output_data={"variance_pct": 37.5, "flag": "TURNOVER_MISMATCH", "trigger_human_review": True},
        evidence_used=["evi_c3_gst", "evi_c3_bank"],
        timestamp=t0 + timedelta(minutes=3, seconds=30)
    )

    AuditLedger.record_event(
        application_id=a_app, journey_id=a_jrn,
        event_type="RISK_ASSESSED", actor_type="SYSTEM", actor_id="risk_orchestrator",
        stage="RISK_ASSESSMENT",
        payload_summary="Risk evaluated: Hard Rule R05_CONSISTENCY failed. Trust Score: 410/1000 (HIGH_RISK)",
        references={"risk_id": "rsk_c3_003"},
        service="risk-scoring-service", model_version="scikit-learn-sme-v2.1",
        input_data={"discrepancy": "37.5%", "circular_trading": True},
        output_data={"all_hard_rules_passed": False, "risk_score": 410, "risk_band": "HIGH_RISK"},
        evidence_used=["Turnover Variance 37.5%", "Financial Trust Graph Circular Trading"],
        timestamp=t0 + timedelta(minutes=4)
    )

    AuditLedger.record_event(
        application_id=a_app, journey_id=a_jrn,
        event_type="DECISION_GENERATED", actor_type="AI_AGENT", actor_id="ai_decision_engine",
        stage="EXPLAINABLE_DECISION",
        payload_summary="Recommendation: NEEDS_REVIEW — Blocked automatic sanction due to turnover discrepancy",
        references={"decision_id": "dec_c3_003"},
        service="explainable-decision-engine",
        input_data={"risk_band": "HIGH_RISK", "all_hard_rules_passed": False},
        output_data={"outcome": "NEEDS_REVIEW", "policy_trigger": "POL-SME-7.1 Anti-Fraud"},
        evidence_used=["GST turnover: ₹80,00,000", "Bank credits: ₹50,00,000"],
        timestamp=t0 + timedelta(minutes=4, seconds=45)
    )

    AuditLedger.record_event(
        application_id=a_app, journey_id=a_jrn,
        event_type="HUMAN_REVIEW_STARTED", actor_type="RISK_OFFICER", actor_id="usr_risk_ananya",
        stage="HUMAN_REVIEW",
        payload_summary="Risk Officer Ananya Iyer initiated manual investigation into turnover variance",
        service="governance-review-service",
        input_data={"queue": "SME_ANOMALY_ESCALATION", "priority": "P1"},
        output_data={"status": "UNDER_INVESTIGATION"},
        timestamp=t0 + timedelta(minutes=5)
    )

    AuditLedger.record_event(
        application_id=a_app, journey_id=a_jrn,
        event_type="HUMAN_OVERRIDE", actor_type="RISK_OFFICER", actor_id="usr_risk_ananya",
        stage="HUMAN_REVIEW",
        payload_summary="Institutional Override applied: CONDITIONAL_APPROVAL for ₹24,00,000 with mandatory promoter collateral charge",
        references={"override_id": "ovr_c3_001"},
        service="override-governance-service",
        input_data={
            "original_outcome": "NEEDS_REVIEW",
            "new_outcome": "CONDITIONAL_APPROVAL",
            "reason_code": "PROMOTER_ADDITIONAL_COLLATERAL",
            "notes": "Verified unencumbered commercial warehouse title deed pledged as second-loss guarantee"
        },
        output_data={"approved_amount": 2400000.0, "interest_rate": 14.50, "co_signed_by": "usr_cro_headquarters"},
        evidence_used=["Promoter Title Deed C-44", "Verified Offtake Agreement with Concor India"],
        timestamp=t0 + timedelta(minutes=7)
    )
