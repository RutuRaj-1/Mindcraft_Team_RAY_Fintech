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
from backend.modules.module5_trust.audit_ledger import AuditLedger


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

    # ==========================================
    # Seed Immutable Chronological Decision Replay Audit Trails
    # ==========================================
    seed_demo_audit_events(now)

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

def seed_demo_audit_events(base_now: datetime):
    """
    Seeds authoritative chronological Decision Replay events for benchmark cases.
    Adheres strictly to the 18 canonical milestones:
    INTENT_RECEIVED -> JOURNEY_CREATED -> DOCUMENT_UPLOADED -> OCR_STARTED ->
    OCR_COMPLETED -> EVIDENCE_CREATED -> EVIDENCE_VERIFIED -> INCONSISTENCY_DETECTED ->
    CASHFLOW_CALCULATED -> RISK_ASSESSED -> SHAP_GENERATED -> POLICY_RETRIEVED ->
    DECISION_GENERATED -> NEXT_ACTION_GENERATED -> HUMAN_REVIEW_STARTED ->
    HUMAN_OVERRIDE -> ACTION_EXECUTED -> JOURNEY_RESOLVED
    """
    t0 = base_now - timedelta(minutes=15)

    # ──────────────────────────────────────────────────────────────────────────
    # CASE 1: Priya Sharma (Sharma Textiles) — Clean Prime Approval
    # Matches the exact timeline example in the specification!
    # ──────────────────────────────────────────────────────────────────────────
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
        timestamp=t0 + timedelta(minutes=1) # 10:31
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
        timestamp=t0 + timedelta(minutes=2) # 10:32
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
        timestamp=t0 + timedelta(minutes=2, seconds=45) # 10:32
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
        timestamp=t0 + timedelta(minutes=3) # 10:33
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
        timestamp=t0 + timedelta(minutes=3, seconds=20) # 10:33
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
        timestamp=t0 + timedelta(minutes=3, seconds=50) # 10:33
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
        timestamp=t0 + timedelta(minutes=4) # 10:34
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
        timestamp=t0 + timedelta(minutes=4, seconds=20) # 10:34
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
        timestamp=t0 + timedelta(minutes=4, seconds=45) # 10:34
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
        timestamp=t0 + timedelta(minutes=5) # 10:35
    )

    AuditLedger.record_event(
        application_id=p_app, journey_id=p_jrn,
        event_type="NEXT_ACTION_GENERATED", actor_type="AI_AGENT", actor_id="safe_action_agent",
        stage="NEXT_BEST_ACTION",
        payload_summary="Next action generated: Digital Sanction Letter Issuance & Disbursal Agreement",
        references={"guardrail": "AUTONOMOUS_PRIME_SANCTION"},
        service="safe-action-agent", model_version="safe-action-guardrails-v2.0",
        input_data={"decision_outcome": "APPROVED", "approved_amount": 1500000.0},
        output_data={"recommended_action": "ISSUE_SANCTION_LETTER", "guardrail_status": "SAFE"},
        evidence_used=["dec_c1_001"],
        timestamp=t0 + timedelta(minutes=5, seconds=30)
    )

    AuditLedger.record_event(
        application_id=p_app, journey_id=p_jrn,
        event_type="ACTION_EXECUTED", actor_type="SYSTEM", actor_id="safe_action_executor",
        stage="SANCTION_AND_DISBURSAL",
        payload_summary="Action executed: Sanction letter digitally signed and dispatched to applicant",
        references={"dispatch_medium": "SECURE_EMAIL_AND_SMS"},
        service="safe-action-agent",
        input_data={"action": "DISPATCH_SANCTION_LETTER", "recipient": "usr_priya_001"},
        output_data={"status": "SENT", "transaction_receipt": "tx_c1_sanction_9918"},
        evidence_used=["dec_c1_001"],
        timestamp=t0 + timedelta(minutes=6)
    )

    AuditLedger.record_event(
        application_id=p_app, journey_id=p_jrn,
        event_type="JOURNEY_RESOLVED", actor_type="SYSTEM", actor_id="journey_orchestrator",
        stage="SANCTION_AND_DISBURSAL",
        payload_summary="Journey resolved: COMPLETED with full cryptographic audit compliance",
        references={"final_state": "COMPLETED"},
        service="journey-orchestrator",
        input_data={"journey_id": p_jrn, "resolution": "SANCTION_DISBURSED"},
        output_data={"status": "ARCHIVED", "tamper_evident_seal": "VERIFIED"},
        timestamp=t0 + timedelta(minutes=6, seconds=30)
    )

    # ──────────────────────────────────────────────────────────────────────────
    # CASE 3: Apex Logistics — Discrepancy & Human Review / Override
    # ──────────────────────────────────────────────────────────────────────────
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

    AuditLedger.record_event(
        application_id=a_app, journey_id=a_jrn,
        event_type="ACTION_EXECUTED", actor_type="SYSTEM", actor_id="safe_action_executor",
        stage="HUMAN_REVIEW",
        payload_summary="Dispatched conditional sanction letter with collateral covenants to Apex Logistics",
        service="safe-action-agent",
        input_data={"action": "DISPATCH_CONDITIONAL_OFFER"},
        output_data={"status": "SENT"},
        timestamp=t0 + timedelta(minutes=8)
    )

