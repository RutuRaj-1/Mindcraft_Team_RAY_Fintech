from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# --- Enums ---

class JourneyStage(str, Enum):
    INTENT_CAPTURE = "INTENT_CAPTURE"
    EVIDENCE_COLLECTION = "EVIDENCE_COLLECTION"
    VERIFICATION = "VERIFICATION"
    RISK_ASSESSMENT = "RISK_ASSESSMENT"
    EXPLAINABLE_DECISION = "EXPLAINABLE_DECISION"
    NEXT_BEST_ACTION = "NEXT_BEST_ACTION"
    HUMAN_REVIEW = "HUMAN_REVIEW"
    SANCTIONED = "SANCTIONED"
    REJECTED = "REJECTED"

class JourneyStatus(str, Enum):
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    FLAGGED = "FLAGGED"

class DocumentType(str, Enum):
    BANK_STATEMENT = "BANK_STATEMENT"
    GST_RETURN = "GST_RETURN"
    ITR = "ITR"
    PAN = "PAN"
    UDYAM_AADHAAR = "UDYAM_AADHAAR"
    FINANCIAL_AUDIT = "FINANCIAL_AUDIT"
    OTHER = "OTHER"

class DocumentStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    VERIFIED = "VERIFIED"
    FLAGGED = "FLAGGED"
    REJECTED = "REJECTED"

class RiskBand(str, Enum):
    LOW_RISK = "LOW_RISK"
    MEDIUM_RISK = "MEDIUM_RISK"
    HIGH_RISK = "HIGH_RISK"

class DecisionOutcome(str, Enum):
    APPROVED = "APPROVED"
    CONDITIONAL_APPROVAL = "CONDITIONAL_APPROVAL"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    REJECTED = "REJECTED"

class ActionType(str, Enum):
    UPLOAD_DOCUMENT = "UPLOAD_DOCUMENT"
    VERIFY_DISCREPANCY = "VERIFY_DISCREPANCY"
    OFFER_ACCEPTANCE = "OFFER_ACCEPTANCE"
    OFFICER_REVIEW = "OFFICER_REVIEW"
    CO_SIGN_SANCTION = "CO_SIGN_SANCTION"
    ADD_COLLATERAL = "ADD_COLLATERAL"

# --- Models ---

class IntentPayload(BaseModel):
    product_type: str = "sme_working_capital"
    requested_amount: float = Field(..., gt=0, description="Requested loan amount in INR")
    tenor_months: int = Field(12, ge=1, le=60, description="Tenure in months")
    purpose: str = Field(..., min_length=5, description="Financing purpose")
    business_name: str
    annual_turnover: float = Field(..., gt=0)
    vintage_months: int = Field(..., ge=0)
    pan: Optional[str] = None
    gstin: Optional[str] = None
    industry_sector: Optional[str] = "Manufacturing / Textiles"

class JourneyStepRecord(BaseModel):
    stage: JourneyStage
    entered_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    notes: Optional[str] = None

class DocumentRecord(BaseModel):
    document_id: str
    application_id: str
    doc_type: DocumentType
    file_name: str
    file_url: str
    sha256_hash: str
    status: DocumentStatus = DocumentStatus.PENDING
    page_count: int = 1
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    verified_at: Optional[datetime] = None
    extracted_fields_count: int = 0
    inconsistency_flags: List[str] = []

class EvidenceItem(BaseModel):
    evidence_id: str
    document_id: str
    application_id: str
    field_name: str
    field_value: Any
    confidence: float = Field(..., ge=0.0, le=1.0)
    page_number: int = 1
    bounding_box: Optional[Dict[str, float]] = None # {"x": 0.1, "y": 0.2, "width": 0.3, "height": 0.05}
    sha256_source_hash: str
    extraction_engine: str = "FinFlow-OCR-v2"
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class DiscrepancyItem(BaseModel):
    field: str
    doc_a_name: str
    doc_a_value: Any
    doc_b_name: str
    doc_b_value: Any
    variance_pct: float
    severity: str = "HIGH" # LOW, MEDIUM, HIGH
    explanation: str

class ConsistencyReport(BaseModel):
    report_id: str
    application_id: str
    is_consistent: bool
    discrepancy_score: float # 0.0 (perfect) to 1.0 (highly inconsistent)
    flagged_count: int
    discrepancies: List[DiscrepancyItem] = []
    generated_at: datetime = Field(default_factory=datetime.utcnow)

class MonthlyCashFlow(BaseModel):
    month: str # e.g. "2026-04"
    inflow: float
    outflow: float
    net_flow: float
    closing_balance: float

class CashFlowMetrics(BaseModel):
    metric_id: str
    application_id: str
    dscr: float # Debt Service Coverage Ratio
    avg_monthly_inflow: float
    avg_monthly_outflow: float
    operating_cash_flow: float
    cash_burn_rate: float
    working_capital_buffer_days: int
    volatility_index: float # 0.0 to 1.0
    seasonality_ratio: float
    monthly_trend: List[MonthlyCashFlow] = []
    calculated_at: datetime = Field(default_factory=datetime.utcnow)

class HardRuleEvaluation(BaseModel):
    rule_id: str
    rule_name: str
    passed: bool
    threshold_value: Any
    actual_value: Any
    failure_reason: Optional[str] = None
    policy_citation: str

class RiskAssessment(BaseModel):
    risk_id: str
    application_id: str
    all_hard_rules_passed: bool
    hard_rules: List[HardRuleEvaluation] = []
    probability_of_default: float = Field(..., ge=0.0, le=1.0)
    risk_score: int = Field(..., ge=0, le=1000, description="FinFlow Trust Score 0-1000")
    risk_band: RiskBand
    model_version: str = "scikit-learn-sme-v2.1"
    calculated_at: datetime = Field(default_factory=datetime.utcnow)

class SHAPFeatureImpact(BaseModel):
    feature_name: str
    feature_display_name: str
    feature_value: Any
    shap_value: float # Contribution (+ pushes towards risk, - reduces risk)
    direction: str # "INCREASES_RISK" or "REDUCES_RISK"
    importance_rank: int

class SHAPAttribution(BaseModel):
    shap_id: str
    risk_id: str
    application_id: str
    base_value: float # Expected model output E[f(x)]
    model_output: float # Actual f(x)
    features: List[SHAPFeatureImpact] = []
    generated_at: datetime = Field(default_factory=datetime.utcnow)

class PolicyCitation(BaseModel):
    clause_id: str
    title: str
    excerpt: str
    relevance_score: float

class DecisionRecord(BaseModel):
    decision_id: str
    application_id: str
    outcome: DecisionOutcome
    approved_amount: float
    interest_rate: float # e.g. 11.5%
    tenor_months: int
    confidence_score: float # 0.0 to 1.0
    reasoning: str
    policy_citations: List[PolicyCitation] = []
    evidence_citations: List[str] = []
    decided_by: str = "AI_ORCHESTRATOR" # or officer UID if overridden
    decided_at: datetime = Field(default_factory=datetime.utcnow)

class NextBestActionItem(BaseModel):
    action_id: str
    priority: int
    title: str
    description: str
    action_type: ActionType
    cta_label: str
    safe_guardrail_status: str = "SAFE" # SAFE, REQUIRES_OVERRIDE, BLOCKED
    safety_confidence: float = 0.95
    target_persona: str = "CUSTOMER" # CUSTOMER, RM, RISK_OFFICER

class NextBestActionsResponse(BaseModel):
    application_id: str
    primary_action: NextBestActionItem
    alternative_actions: List[NextBestActionItem] = []

class TrustGraphNode(BaseModel):
    id: str
    label: str
    node_type: str # BUSINESS, DIRECTOR, GSTIN, BANK_ACCOUNT, SUPPLIER, BUYER
    risk_level: str # LOW, MEDIUM, HIGH
    trust_score: int
    details: Dict[str, Any] = {}

class TrustGraphEdge(BaseModel):
    source: str
    target: str
    relation: str # OWNS, INVOICED, TRANSFERRED_FUNDS, REGISTERED_AT, CO_DIRECTOR
    weight: float
    flagged: bool = False
    flag_reason: Optional[str] = None

class TrustGraph(BaseModel):
    graph_id: str
    application_id: str
    nodes: List[TrustGraphNode]
    edges: List[TrustGraphEdge]
    circular_trading_detected: bool = False
    network_risk_score: float = 0.12 # 0 to 1
    cross_app_duplicate_signals: List[str] = []

class AuditLog(BaseModel):
    audit_id: str
    application_id: str
    actor_id: str
    actor_role: str
    action: str
    details: Dict[str, Any] = {}
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class HumanOverrideRequest(BaseModel):
    new_outcome: DecisionOutcome
    new_approved_amount: Optional[float] = None
    new_interest_rate: Optional[float] = None
    reason_code: str # e.g. "COLLATERAL_BACKED", "RELATIONSHIP_EXCEPTION", "PROVEN_CASHFLOW"
    rationale_notes: str
    co_signed_by: Optional[str] = None

class HumanOverrideRecord(BaseModel):
    override_id: str
    decision_id: str
    application_id: str
    original_outcome: DecisionOutcome
    new_outcome: DecisionOutcome
    reason_code: str
    rationale_notes: str
    officer_id: str
    officer_name: str
    co_signed_by: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class WhatIfRequest(BaseModel):
    revenue_delta_pct: float = 0.0 # e.g. +15%
    tenor_months: Optional[int] = None
    buffer_days_delta: int = 0
    collateral_offered_amount: float = 0.0

class WhatIfResponse(BaseModel):
    original_dscr: float
    simulated_dscr: float
    original_risk_score: int
    simulated_risk_score: int
    original_risk_band: RiskBand
    simulated_risk_band: RiskBand
    original_approved_amount: float
    simulated_approved_amount: float
    original_interest_rate: float
    simulated_interest_rate: float
    outcome: DecisionOutcome
    insights: List[str]

class JourneyFrictionMetrics(BaseModel):
    journey_id: str
    total_time_seconds: float
    friction_score: int # 0 (seamless) to 100 (high friction)
    bottleneck_stage: Optional[JourneyStage] = None
    resubmissions_count: int = 0
    warnings: List[str] = []

class ApplicationRecord(BaseModel):
    application_id: str
    journey_id: str
    user_id: str
    business_name: str
    product_type: str
    requested_amount: float
    tenor_months: int
    vintage_months: int
    annual_turnover: float
    pan: Optional[str] = None
    gstin: Optional[str] = None
    industry_sector: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class JourneyRecord(BaseModel):
    journey_id: str
    applicant_id: str
    current_stage: JourneyStage = JourneyStage.INTENT_CAPTURE
    status: JourneyStatus = JourneyStatus.ACTIVE
    intent: IntentPayload
    history: List[JourneyStepRecord] = []
    application_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
