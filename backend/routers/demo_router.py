from fastapi import APIRouter
from typing import Dict, Any, List
from datetime import datetime
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

router = APIRouter(prefix="/api/v1/demo", tags=["Demo Management & Seed Data"])

def seed_demo_data():
    now = datetime.utcnow()

    # ==========================================
    # CASE 1: Priya Sharma (Sharma Textiles) - High Trust Clean Case
    # ==========================================
    c1_jrn_id = "jrn_priya_001"
    c1_app_id = "app_priya_001"
    c1_user_id = "usr_priya_001"

    c1_intent = IntentPayload(
        product_type="sme_working_capital",
        requested_amount=1500000.0, # ₹15 Lakhs
        tenor_months=12,
        purpose="Fulfill bulk festive season textile orders for FabIndia",
        business_name="Sharma Textiles Private Limited",
        annual_turnover=14500000.0, # ₹1.45 Cr
        vintage_months=48,
        pan="AAACS1234F",
        gstin="27AAACS1234F1Z5",
        industry_sector="Textile Manufacturing"
    )

    c1_journey = JourneyRecord(
        journey_id=c1_jrn_id,
        applicant_id=c1_user_id,
        current_stage=JourneyStage.EXPLAINABLE_DECISION,
        status=JourneyStatus.ACTIVE,
        intent=c1_intent,
        application_id=c1_app_id,
        history=[
            JourneyStepRecord(stage=JourneyStage.INTENT_CAPTURE, entered_at=now, completed_at=now, notes="Intent registered"),
            JourneyStepRecord(stage=JourneyStage.EVIDENCE_COLLECTION, entered_at=now, completed_at=now, notes="Documents uploaded"),
            JourneyStepRecord(stage=JourneyStage.VERIFICATION, entered_at=now, completed_at=now, notes="OCR extraction verified"),
            JourneyStepRecord(stage=JourneyStage.RISK_ASSESSMENT, entered_at=now, completed_at=now, notes="Scikit-learn model evaluated"),
            JourneyStepRecord(stage=JourneyStage.EXPLAINABLE_DECISION, entered_at=now, notes="Sanction decision generated")
        ],
        created_at=now,
        updated_at=now
    )

    c1_app = ApplicationRecord(
        application_id=c1_app_id,
        journey_id=c1_jrn_id,
        user_id=c1_user_id,
        business_name=c1_intent.business_name,
        product_type=c1_intent.product_type,
        requested_amount=c1_intent.requested_amount,
        tenor_months=c1_intent.tenor_months,
        vintage_months=c1_intent.vintage_months,
        annual_turnover=c1_intent.annual_turnover,
        pan=c1_intent.pan,
        gstin=c1_intent.gstin,
        industry_sector=c1_intent.industry_sector,
        created_at=now
    )

    db.set("journeys", c1_jrn_id, c1_journey.model_dump())
    db.set("applications", c1_app_id, c1_app.model_dump())

    # Case 1 Documents & Evidence
    doc_bank = DocumentRecord(
        document_id="doc_c1_bank",
        application_id=c1_app_id,
        doc_type=DocumentType.BANK_STATEMENT,
        file_name="HDFC_Bank_Statement_6M_SharmaTextiles.pdf",
        file_url="/uploads/sample_bank_statement.pdf",
        sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        status=DocumentStatus.VERIFIED,
        page_count=6,
        uploaded_at=now,
        verified_at=now,
        extracted_fields_count=5
    )
    doc_gst = DocumentRecord(
        document_id="doc_c1_gst",
        application_id=c1_app_id,
        doc_type=DocumentType.GST_RETURN,
        file_name="GSTR3B_FY2526_SharmaTextiles.pdf",
        file_url="/uploads/sample_gstr3b.pdf",
        sha256_hash="8f43594a0b90442d9a7c069d075152d9a1b2c3d4e5f6789012345678abcdef01",
        status=DocumentStatus.VERIFIED,
        page_count=3,
        uploaded_at=now,
        verified_at=now,
        extracted_fields_count=4
    )
    db.set("documents", "doc_c1_bank", doc_bank.model_dump())
    db.set("documents", "doc_c1_gst", doc_gst.model_dump())

    c1_evidence = [
        {"evidence_id": "evi_c1_1", "document_id": "doc_c1_bank", "application_id": c1_app_id, "field_name": "average_monthly_balance", "field_value": 315000.0, "confidence": 0.98, "page_number": 1, "bounding_box": {"x": 0.1, "y": 0.2, "width": 0.3, "height": 0.04}, "sha256_source_hash": doc_bank.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now.isoformat()},
        {"evidence_id": "evi_c1_2", "document_id": "doc_c1_bank", "application_id": c1_app_id, "field_name": "annual_credit_turnover", "field_value": 14200000.0, "confidence": 0.97, "page_number": 1, "bounding_box": {"x": 0.5, "y": 0.2, "width": 0.3, "height": 0.04}, "sha256_source_hash": doc_bank.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now.isoformat()},
        {"evidence_id": "evi_c1_3", "document_id": "doc_c1_bank", "application_id": c1_app_id, "field_name": "annual_debit_turnover", "field_value": 12400000.0, "confidence": 0.96, "page_number": 2, "bounding_box": {"x": 0.5, "y": 0.25, "width": 0.3, "height": 0.04}, "sha256_source_hash": doc_bank.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now.isoformat()},
        {"evidence_id": "evi_c1_4", "document_id": "doc_c1_bank", "application_id": c1_app_id, "field_name": "inward_cheque_bounces_6m", "field_value": 0, "confidence": 0.99, "page_number": 3, "bounding_box": {"x": 0.1, "y": 0.5, "width": 0.2, "height": 0.04}, "sha256_source_hash": doc_bank.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now.isoformat()},
        {"evidence_id": "evi_c1_5", "document_id": "doc_c1_gst", "application_id": c1_app_id, "field_name": "gstin", "field_value": "27AAACS1234F1Z5", "confidence": 0.99, "page_number": 1, "bounding_box": {"x": 0.2, "y": 0.1, "width": 0.35, "height": 0.04}, "sha256_source_hash": doc_gst.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now.isoformat()},
        {"evidence_id": "evi_c1_6", "document_id": "doc_c1_gst", "application_id": c1_app_id, "field_name": "gst_annual_taxable_turnover", "field_value": 14500000.0, "confidence": 0.97, "page_number": 2, "bounding_box": {"x": 0.45, "y": 0.3, "width": 0.3, "height": 0.04}, "sha256_source_hash": doc_gst.sha256_hash, "extraction_engine": "FinFlow-OCR-v2", "timestamp": now.isoformat()}
    ]
    for item in c1_evidence:
        db.set("evidence_ledger", item["evidence_id"], item)

    CashFlowEngine.calculate_metrics(c1_app_id)
    ConsistencyEngine.verify_consistency(c1_app_id)
    TrustGraphEngine.build_trust_graph(c1_app_id)

    c1_risk = RiskAssessment(
        risk_id="rsk_c1_001",
        application_id=c1_app_id,
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
    db.set("risk_assessments", "rsk_c1_001", c1_risk.model_dump())

    c1_shap = SHAPAttribution(
        shap_id="shp_c1_001",
        risk_id="rsk_c1_001",
        application_id=c1_app_id,
        base_value=0.22,
        model_output=0.08,
        features=[
            SHAPFeatureImpact(feature_name="dscr", feature_display_name="Debt Service Coverage Ratio (DSCR)", feature_value=1.85, shap_value=-0.145, direction="REDUCES_RISK", importance_rank=1),
            SHAPFeatureImpact(feature_name="bounces_6m", feature_display_name="Inward Cheque Bounces (6M)", feature_value=0, shap_value=-0.085, direction="REDUCES_RISK", importance_rank=2),
            SHAPFeatureImpact(feature_name="vintage_months", feature_display_name="Operational Vintage (Months)", feature_value=48, shap_value=-0.062, direction="REDUCES_RISK", importance_rank=3),
            SHAPFeatureImpact(feature_name="annual_turnover", feature_display_name="Annual Sales Turnover (₹)", feature_value=14500000.0, shap_value=-0.048, direction="REDUCES_RISK", importance_rank=4),
            SHAPFeatureImpact(feature_name="buffer_days", feature_display_name="Working Capital Buffer (Days)", feature_value=38, shap_value=-0.035, direction="REDUCES_RISK", importance_rank=5)
        ],
        generated_at=now
    )
    db.set("shap_attributions", "shp_c1_001", c1_shap.model_dump())

    c1_decision = DecisionRecord(
        decision_id="dec_c1_001",
        application_id=c1_app_id,
        outcome=DecisionOutcome.APPROVED,
        approved_amount=1500000.0,
        interest_rate=10.75,
        tenor_months=12,
        confidence_score=0.96,
        reasoning="Application for Sharma Textiles Private Limited is APPROVED. FinFlow Trust Score is 920/1000 with 0 inward cheque bounces, healthy DSCR of 1.85x, and verified GST filings totaling ₹1.45 Cr. Prime rate approved with zero manual intervention required.",
        policy_citations=[
            PolicyCitation(clause_id="POL-SME-4.1", title="Minimum Operational Vintage Requirement", excerpt="All SME borrowers must establish at least 24 months of continuous operations.", relevance_score=0.95),
            PolicyCitation(clause_id="POL-SME-5.2", title="Debt Service Coverage Ratio (DSCR) Norms", excerpt="Operating cash flow must comfortably cover debt service with DSCR >= 1.25x.", relevance_score=0.92)
        ],
        evidence_citations=["annual_credit_turnover: ₹1,42,00,000", "gst_annual_taxable_turnover: ₹1,45,00,000", "dscr: 1.85x"],
        decided_by="AI_ORCHESTRATOR",
        decided_at=now
    )
    db.set("decisions", "dec_c1_001", c1_decision.model_dump())

    # ==========================================
    # CASE 2: Kavita Electronics - Boundary Case (Conditional Approval)
    # ==========================================
    c2_jrn_id = "jrn_kavita_002"
    c2_app_id = "app_kavita_002"
    c2_user_id = "usr_kavita_002"

    c2_intent = IntentPayload(
        product_type="sme_working_capital",
        requested_amount=2500000.0,
        tenor_months=18,
        purpose="Procure semi-conductor components ahead of monsoon supply delays",
        business_name="Kavita Electronics Retail LLP",
        annual_turnover=8500000.0,
        vintage_months=30,
        pan="BCDEK5678L",
        gstin="27BCDEK5678L1Z9",
        industry_sector="Consumer Electronics Wholesale"
    )

    c2_journey = JourneyRecord(
        journey_id=c2_jrn_id,
        applicant_id=c2_user_id,
        current_stage=JourneyStage.EXPLAINABLE_DECISION,
        status=JourneyStatus.ACTIVE,
        intent=c2_intent,
        application_id=c2_app_id,
        created_at=now,
        updated_at=now
    )
    c2_app = ApplicationRecord(
        application_id=c2_app_id,
        journey_id=c2_jrn_id,
        user_id=c2_user_id,
        business_name=c2_intent.business_name,
        product_type=c2_intent.product_type,
        requested_amount=c2_intent.requested_amount,
        tenor_months=c2_intent.tenor_months,
        vintage_months=c2_intent.vintage_months,
        annual_turnover=c2_intent.annual_turnover,
        pan=c2_intent.pan,
        gstin=c2_intent.gstin,
        industry_sector=c2_intent.industry_sector,
        created_at=now
    )
    db.set("journeys", c2_jrn_id, c2_journey.model_dump())
    db.set("applications", c2_app_id, c2_app.model_dump())

    CashFlowEngine.calculate_metrics(c2_app_id)
    ConsistencyEngine.verify_consistency(c2_app_id)
    TrustGraphEngine.build_trust_graph(c2_app_id)

    c2_risk = RiskAssessment(
        risk_id="rsk_c2_002",
        application_id=c2_app_id,
        all_hard_rules_passed=True,
        hard_rules=[
            HardRuleEvaluation(rule_id="R01_VINTAGE", rule_name="Minimum Operational Vintage", passed=True, threshold_value=">= 24 months", actual_value="30 months", policy_citation="Credit Policy Clause 4.1"),
            HardRuleEvaluation(rule_id="R02_TURNOVER", rule_name="Minimum Annual Turnover", passed=True, threshold_value=">= ₹25,00,000", actual_value="₹85,00,000.00", policy_citation="Credit Policy Clause 4.2"),
            HardRuleEvaluation(rule_id="R03_CHEQUE_BOUNCES", rule_name="Inward Cheque Returns Limit", passed=True, threshold_value="<= 2 in 6m", actual_value="1 bounce", policy_citation="Credit Policy Clause 6.3"),
            HardRuleEvaluation(rule_id="R04_DSCR", rule_name="Debt Service Coverage Ratio", passed=True, threshold_value=">= 1.25x", actual_value="1.32x", policy_citation="Credit Policy Clause 5.2"),
            HardRuleEvaluation(rule_id="R05_REGISTRATION", rule_name="Active GSTIN Verification", passed=True, threshold_value="Active", actual_value="Active", policy_citation="KYC Guidelines Section 2")
        ],
        probability_of_default=0.24,
        risk_score=760,
        risk_band=RiskBand.MEDIUM_RISK,
        model_version="scikit-learn-sme-v2.1",
        calculated_at=now
    )
    db.set("risk_assessments", "rsk_c2_002", c2_risk.model_dump())

    c2_decision = DecisionRecord(
        decision_id="dec_c2_002",
        application_id=c2_app_id,
        outcome=DecisionOutcome.CONDITIONAL_APPROVAL,
        approved_amount=2125000.0, # 85%
        interest_rate=12.25,
        tenor_months=18,
        confidence_score=0.91,
        reasoning="Application for Kavita Electronics Retail LLP is CONDITIONALLY APPROVED for ₹21,25,000 (85% facility) at 12.25% p.a. Moderate cash flow volatility and 1 inward cheque bounce warrant structured milestone tranche disbursements.",
        policy_citations=[
            PolicyCitation(clause_id="POL-SME-5.2", title="Debt Service Coverage Ratio Norms", excerpt="Operating cash flow covers debt service with DSCR >= 1.25x.", relevance_score=0.88)
        ],
        evidence_citations=["turnover: ₹85,00,000", "dscr: 1.32x", "bounces: 1"],
        decided_by="AI_ORCHESTRATOR",
        decided_at=now
    )
    db.set("decisions", "dec_c2_002", c2_decision.model_dump())

    # ==========================================
    # CASE 3: Apex Logistics - Discrepancy & Fraud Signal Case (Needs Review)
    # ==========================================
    c3_jrn_id = "jrn_apex_003"
    c3_app_id = "app_apex_003"
    c3_user_id = "usr_apex_003"

    c3_intent = IntentPayload(
        product_type="sme_working_capital",
        requested_amount=4000000.0,
        tenor_months=24,
        purpose="Fleet expansion and interstate container depot lease",
        business_name="Apex Logistics & Freight Solutions",
        annual_turnover=8000000.0,
        vintage_months=36,
        pan="CDEFG9012M",
        gstin="27CDEFG9012M1Z3",
        industry_sector="Logistics & Warehousing"
    )

    c3_journey = JourneyRecord(
        journey_id=c3_jrn_id,
        applicant_id=c3_user_id,
        current_stage=JourneyStage.HUMAN_REVIEW,
        status=JourneyStatus.FLAGGED,
        intent=c3_intent,
        application_id=c3_app_id,
        created_at=now,
        updated_at=now
    )
    c3_app = ApplicationRecord(
        application_id=c3_app_id,
        journey_id=c3_jrn_id,
        user_id=c3_user_id,
        business_name=c3_intent.business_name,
        product_type=c3_intent.product_type,
        requested_amount=c3_intent.requested_amount,
        tenor_months=c3_intent.tenor_months,
        vintage_months=c3_intent.vintage_months,
        annual_turnover=c3_intent.annual_turnover,
        pan=c3_intent.pan,
        gstin=c3_intent.gstin,
        industry_sector=c3_intent.industry_sector,
        created_at=now
    )
    db.set("journeys", c3_jrn_id, c3_journey.model_dump())
    db.set("applications", c3_app_id, c3_app.model_dump())

    # Create deliberate discrepancy in evidence
    db.set("evidence_ledger", "evi_c3_gst", {
        "evidence_id": "evi_c3_gst",
        "document_id": "doc_c3_gst",
        "application_id": c3_app_id,
        "field_name": "gst_annual_taxable_turnover",
        "field_value": 8000000.0,
        "confidence": 0.95,
        "page_number": 1,
        "bounding_box": {"x": 0.1, "y": 0.2, "width": 0.3, "height": 0.04},
        "sha256_source_hash": "c3_gst_hash",
        "extraction_engine": "FinFlow-OCR-v2",
        "timestamp": now.isoformat()
    })
    db.set("evidence_ledger", "evi_c3_bank", {
        "evidence_id": "evi_c3_bank",
        "document_id": "doc_c3_bank",
        "application_id": c3_app_id,
        "field_name": "annual_credit_turnover",
        "field_value": 5000000.0, # 37.5% discrepancy vs GST!
        "confidence": 0.95,
        "page_number": 1,
        "bounding_box": {"x": 0.1, "y": 0.2, "width": 0.3, "height": 0.04},
        "sha256_source_hash": "c3_bank_hash",
        "extraction_engine": "FinFlow-OCR-v2",
        "timestamp": now.isoformat()
    })

    CashFlowEngine.calculate_metrics(c3_app_id)
    ConsistencyEngine.verify_consistency(c3_app_id)
    TrustGraphEngine.build_trust_graph(c3_app_id)

    c3_decision = DecisionRecord(
        decision_id="dec_c3_003",
        application_id=c3_app_id,
        outcome=DecisionOutcome.NEEDS_REVIEW,
        approved_amount=2400000.0,
        interest_rate=14.50,
        tenor_months=24,
        confidence_score=0.82,
        reasoning="Application for Apex Logistics & Freight Solutions is FLAGGED FOR RISK OFFICER REVIEW. A 37.5% discrepancy was detected between GST declared turnover (₹80 Lakhs) and Bank Statement total credits (₹50 Lakhs). Financial Trust Graph also flagged circular transactions with an affiliated LLP.",
        policy_citations=[
            PolicyCitation(clause_id="POL-SME-7.1", title="Cross-Document Discrepancy & Anti-Fraud Governance", excerpt="Variance > 15% between GST returns and banking credits triggers mandatory manual underwriter review.", relevance_score=0.96)
        ],
        evidence_citations=["GST turnover: ₹80,00,000", "Bank credits: ₹50,00,000", "Turnover Variance: 37.5%"],
        decided_by="AI_ORCHESTRATOR",
        decided_at=now
    )
    db.set("decisions", "dec_c3_003", c3_decision.model_dump())

    return {
        "status": "SUCCESS",
        "message": "Demo benchmark cases seeded successfully",
        "cases": [
            {"id": c1_jrn_id, "name": "Sharma Textiles (Priya Sharma)", "type": "High Trust / Clean / Approved"},
            {"id": c2_jrn_id, "name": "Kavita Electronics", "type": "Boundary / Conditional Approval"},
            {"id": c3_jrn_id, "name": "Apex Logistics", "type": "Discrepancy / Fraud Flag / Human Review"}
        ]
    }

@router.post("/seed")
def seed_demo_endpoint():
    return seed_demo_data()

@router.get("/cases")
def get_benchmark_cases():
    return [
        {
            "id": "jrn_priya_001",
            "name": "Sharma Textiles Private Limited",
            "persona": "Priya Sharma (SME Owner)",
            "scenario": "Clean financial health, 0 cheque bounces, healthy DSCR 1.85x, prime sanction ₹15 Lakhs @ 10.75%",
            "recommended_view": "Customer Journey & What-If Simulator"
        },
        {
            "id": "jrn_kavita_002",
            "name": "Kavita Electronics Retail LLP",
            "persona": "Rohan Mehta (Relationship Manager)",
            "scenario": "Boundary case, moderate volatility, conditional sanction ₹21.25 Lakhs (85% haircut)",
            "recommended_view": "RM Review & Counterfactual Optimization"
        },
        {
            "id": "jrn_apex_003",
            "name": "Apex Logistics & Freight Solutions",
            "persona": "Ananya Iyer (Risk & Compliance Officer)",
            "scenario": "37.5% GST vs Bank turnover discrepancy + circular trading detected on Financial Trust Graph",
            "recommended_view": "Consistency Engine, Fraud Graph & Human Override"
        }
    ]
