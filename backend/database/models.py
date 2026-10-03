from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, ConfigDict

# --- Core Enums ---

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

class VerificationStatus(str, Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    FLAGGED = "FLAGGED"

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

def now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

# ==============================================================================
# 20 REQUIRED FIRESTORE COLLECTION SCHEMAS
# ==============================================================================

# 1. users
class UserModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    userId: str = Field(..., alias="user_id")
    email: str
    role: str # CUSTOMER, RM, RISK_OFFICER, ADMIN
    name: str
    businessId: Optional[str] = Field(None, alias="business_id")
    createdAt: str = Field(default_factory=now_utc_iso, alias="created_at")
    updatedAt: str = Field(default_factory=now_utc_iso, alias="updated_at")

# 2. applications
class ApplicationModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    applicationId: str = Field(..., alias="application_id")
    userId: str = Field(..., alias="user_id")
    businessName: str = Field(..., alias="business_name")
    productType: str = Field("sme_working_capital", alias="product_type")
    requestedAmount: float = Field(..., alias="requested_amount")
    purpose: str
    status: str = "ACTIVE"
    currentStage: str = Field(JourneyStage.INTENT_CAPTURE.value, alias="current_stage")
    vintageMonths: Optional[int] = Field(None, alias="vintage_months")
    annualTurnover: Optional[float] = Field(None, alias="annual_turnover")
    tenorMonths: Optional[int] = Field(12, alias="tenor_months")
    pan: Optional[str] = None
    gstin: Optional[str] = None
    createdAt: str = Field(default_factory=now_utc_iso, alias="created_at")
    updatedAt: str = Field(default_factory=now_utc_iso, alias="updated_at")

# 3. documents
class DocumentModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    documentId: str = Field(..., alias="document_id")
    applicationId: str = Field(..., alias="application_id")
    type: str # BANK_STATEMENT, GST_RETURN, ITR, etc.
    fileName: str = Field(..., alias="file_name")
    storagePath: str = Field(..., alias="storage_path")
    mimeType: str = Field("application/pdf", alias="mime_type")
    fileHash: str = Field(..., alias="file_hash")
    uploadedAt: str = Field(default_factory=now_utc_iso, alias="uploaded_at")
    ocrStatus: str = Field("PENDING", alias="ocr_status")
    verificationStatus: str = Field("PENDING", alias="verification_status")
    pageCount: int = Field(1, alias="page_count")

# 4. evidence_items
class EvidenceItemModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    evidenceId: str = Field(..., alias="evidence_id")
    applicationId: str = Field(..., alias="application_id")
    documentId: str = Field(..., alias="document_id")
    fieldName: str = Field(..., alias="field_name")
    value: Any
    normalizedValue: Optional[Any] = Field(None, alias="normalized_value")
    confidence: float = Field(..., ge=0.0, le=1.0)
    sourcePage: int = Field(1, alias="source_page")
    sourceText: Optional[str] = Field(None, alias="source_text")
    extractionMethod: str = Field("FinFlow-OCR-v2", alias="extraction_method")
    verificationStatus: str = Field("PENDING", alias="verification_status")
    boundingBox: Optional[Dict[str, float]] = Field(None, alias="bounding_box")
    createdAt: str = Field(default_factory=now_utc_iso, alias="created_at")

# 5. journey_steps
class JourneyStepModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    stepId: str = Field(..., alias="step_id")
    applicationId: str = Field(..., alias="application_id")
    stage: str
    status: str = "COMPLETED"
    notes: Optional[str] = None
    enteredAt: str = Field(default_factory=now_utc_iso, alias="entered_at")
    completedAt: Optional[str] = Field(None, alias="completed_at")
    durationSeconds: Optional[float] = Field(None, alias="duration_seconds")
    createdAt: str = Field(default_factory=now_utc_iso, alias="created_at")

# 6. risk_assessments
class RiskAssessmentModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    riskId: str = Field(..., alias="risk_id")
    applicationId: str = Field(..., alias="application_id")
    riskScore: int = Field(..., alias="risk_score", description="Trust Score 0-1000")
    riskBand: str = Field(..., alias="risk_band")
    featureValues: Dict[str, Any] = Field(default_factory=dict, alias="feature_values")
    modelVersion: str = Field("scikit-learn-sme-v2.1", alias="model_version")
    ruleResults: List[Dict[str, Any]] = Field(default_factory=list, alias="rule_results")
    probabilityOfDefault: Optional[float] = Field(None, alias="probability_of_default")
    createdAt: str = Field(default_factory=now_utc_iso, alias="created_at")

# 7. decisions
class DecisionModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    decisionId: str = Field(..., alias="decision_id")
    applicationId: str = Field(..., alias="application_id")
    outcome: str # APPROVED, CONDITIONAL_APPROVAL, NEEDS_REVIEW, REJECTED
    reasons: List[str] = Field(default_factory=list)
    evidenceReferences: List[str] = Field(default_factory=list, alias="evidence_references")
    policyReferences: List[str] = Field(default_factory=list, alias="policy_references")
    modelReferences: List[str] = Field(default_factory=list, alias="model_references")
    approvedAmount: Optional[float] = Field(None, alias="approved_amount")
    interestRate: Optional[float] = Field(None, alias="interest_rate")
    tenorMonths: Optional[int] = Field(None, alias="tenor_months")
    decidedBy: str = Field("AI_ORCHESTRATOR", alias="decided_by")
    createdAt: str = Field(default_factory=now_utc_iso, alias="created_at")

# 8. next_best_actions
class NextBestActionModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    actionId: str = Field(..., alias="action_id")
    applicationId: str = Field(..., alias="application_id")
    title: str
    description: str
    actionType: str = Field(..., alias="action_type")
    priority: int = 1
    guardrailStatus: str = Field("SAFE", alias="guardrail_status")
    ctaLabel: Optional[str] = Field(None, alias="cta_label")
    targetPersona: str = Field("CUSTOMER", alias="target_persona")
    createdAt: str = Field(default_factory=now_utc_iso, alias="created_at")

# 9. audit_logs (Strictly Append-Only)
class AuditLogModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    auditId: str = Field(..., alias="audit_id")
    applicationId: str = Field(..., alias="application_id")
    actorId: str = Field(..., alias="actor_id")
    actorRole: str = Field(..., alias="actor_role")
    action: str
    details: Dict[str, Any] = Field(default_factory=dict)
    oldState: Optional[str] = Field(None, alias="old_state")
    newState: Optional[str] = Field(None, alias="new_state")
    ipAddress: Optional[str] = Field(None, alias="ip_address")
    timestamp: str = Field(default_factory=now_utc_iso)

# 10. policy_documents
class PolicyDocumentModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    policyId: str = Field(..., alias="policy_id")
    title: str
    category: str = "CREDIT_RISK"
    version: str = "2026.1"
    effectiveDate: str = Field(default_factory=now_utc_iso, alias="effective_date")
    content: str
    createdAt: str = Field(default_factory=now_utc_iso, alias="created_at")

# 11. policy_chunks
class PolicyChunkModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    chunkId: str = Field(..., alias="chunk_id")
    policyId: str = Field(..., alias="policy_id")
    clauseId: str = Field(..., alias="clause_id")
    text: str
    relevanceKeywords: List[str] = Field(default_factory=list, alias="relevance_keywords")
    embedding: Optional[List[float]] = None
    createdAt: str = Field(default_factory=now_utc_iso, alias="created_at")

# 12. financial_snapshots
class FinancialSnapshotModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    snapshotId: str = Field(..., alias="snapshot_id")
    applicationId: str = Field(..., alias="application_id")
    dscr: float
    avgMonthlyInflow: float = Field(..., alias="avg_monthly_inflow")
    avgMonthlyOutflow: float = Field(..., alias="avg_monthly_outflow")
    operatingCashFlow: float = Field(..., alias="operating_cash_flow")
    cashBurnRate: float = Field(..., alias="cash_burn_rate")
    bufferDays: int = Field(..., alias="buffer_days")
    volatilityIndex: float = Field(..., alias="volatility_index")
    seasonalityRatio: float = Field(1.0, alias="seasonality_ratio")
    monthlyBreakdown: List[Dict[str, Any]] = Field(default_factory=list, alias="monthly_breakdown")
    createdAt: str = Field(default_factory=now_utc_iso, alias="created_at")

# 13. trust_graph_nodes
class TrustGraphNodeModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    nodeId: str = Field(..., alias="node_id")
    applicationId: str = Field(..., alias="application_id")
    label: str
    nodeType: str = Field(..., alias="node_type") # BUSINESS, DIRECTOR, GSTIN, BANK_ACCOUNT
    riskLevel: str = Field("LOW", alias="risk_level")
    trustScore: int = Field(800, alias="trust_score")
    details: Dict[str, Any] = Field(default_factory=dict)
    createdAt: str = Field(default_factory=now_utc_iso, alias="created_at")

# 14. trust_graph_edges
class TrustGraphEdgeModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    edgeId: str = Field(..., alias="edge_id")
    applicationId: str = Field(..., alias="application_id")
    source: str
    target: str
    relation: str = Field(..., description="OWNS, INVOICED, TRANSFERRED_FUNDS")
    weight: float = 1.0
    flagged: bool = False
    flagReason: Optional[str] = Field(None, alias="flag_reason")
    createdAt: str = Field(default_factory=now_utc_iso, alias="created_at")

# 15. fraud_signals
class FraudSignalModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    signalId: str = Field(..., alias="signal_id")
    applicationId: str = Field(..., alias="application_id")
    signalType: str = Field(..., alias="signal_type") # CIRCULAR_INVOICE, IDENTITY_MISMATCH, DUPLICATE_GSTIN
    severity: str = "HIGH" # LOW, MEDIUM, HIGH, CRITICAL
    description: str
    evidenceIds: List[str] = Field(default_factory=list, alias="evidence_ids")
    details: Dict[str, Any] = Field(default_factory=dict)
    detectedAt: str = Field(default_factory=now_utc_iso, alias="detected_at")

# 16. what_if_scenarios
class WhatIfScenarioModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    scenarioId: str = Field(..., alias="scenario_id")
    applicationId: str = Field(..., alias="application_id")
    requestedInputs: Dict[str, Any] = Field(..., alias="requested_inputs")
    simulatedOutputs: Dict[str, Any] = Field(..., alias="simulated_outputs")
    insights: List[str] = Field(default_factory=list)
    createdAt: str = Field(default_factory=now_utc_iso, alias="created_at")

# 17. human_reviews
class HumanReviewModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    reviewId: str = Field(..., alias="review_id")
    applicationId: str = Field(..., alias="application_id")
    decisionId: str = Field(..., alias="decision_id")
    officerId: str = Field(..., alias="officer_id")
    officerRole: str = Field(..., alias="officer_role")
    originalOutcome: str = Field(..., alias="original_outcome")
    newOutcome: str = Field(..., alias="new_outcome")
    reasonCode: str = Field(..., alias="reason_code")
    rationaleNotes: str = Field(..., alias="rationale_notes")
    coSignedBy: Optional[str] = Field(None, alias="co_signed_by")
    timestamp: str = Field(default_factory=now_utc_iso)

# 18. feedback_events
class FeedbackEventModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    feedbackId: str = Field(..., alias="feedback_id")
    applicationId: str = Field(..., alias="application_id")
    decisionId: str = Field(..., alias="decision_id")
    performanceOutcome: str = Field(..., alias="performance_outcome") # ON_TIME_REPAYMENT, DELINQUENT, DEFAULT
    repaymentRatePct: float = Field(100.0, alias="repayment_rate_pct")
    notes: Optional[str] = None
    recordedAt: str = Field(default_factory=now_utc_iso, alias="recorded_at")

# 19. notifications
class NotificationModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    notificationId: str = Field(..., alias="notification_id")
    userId: Optional[str] = Field(None, alias="user_id")
    role: Optional[str] = None
    title: str
    message: str
    type: str = "INFO" # INFO, WARNING, SUCCESS, ALERT
    read: bool = False
    actionLink: Optional[str] = Field(None, alias="action_link")
    createdAt: str = Field(default_factory=now_utc_iso, alias="created_at")

# 20. system_events
class SystemEventModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    eventId: str = Field(..., alias="event_id")
    eventType: str = Field(..., alias="event_type")
    sourceComponent: str = Field(..., alias="source_component")
    payload: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str = Field(default_factory=now_utc_iso)


# ==============================================================================
# LEGACY & SERVICE COMPATIBILITY MODELS (Unchanged for backwards compatibility)
# ==============================================================================

class IntentPayload(BaseModel):
    model_config = ConfigDict(extra="allow")
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
    model_config = ConfigDict(extra="allow")
    stage: JourneyStage
    entered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    notes: Optional[str] = None

class DocumentRecord(BaseModel):
    model_config = ConfigDict(extra="allow")
    document_id: str
    application_id: str
    doc_type: DocumentType
    file_name: str
    file_url: str
    sha256_hash: str
    status: DocumentStatus = DocumentStatus.PENDING
    page_count: int = 1
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    verified_at: Optional[datetime] = None
    extracted_fields_count: int = 0
    inconsistency_flags: List[str] = []

class EvidenceItem(BaseModel):
    model_config = ConfigDict(extra="allow")
    evidence_id: str
    document_id: str
    application_id: str
    field_name: str
    field_value: Any
    confidence: float = Field(..., ge=0.0, le=1.0)
    page_number: int = 1
    bounding_box: Optional[Dict[str, float]] = None
    sha256_source_hash: str
    extraction_engine: str = "FinFlow-OCR-v2"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DiscrepancyItem(BaseModel):
    model_config = ConfigDict(extra="allow")
    field: str
    doc_a_name: str
    doc_a_value: Any
    doc_b_name: str
    doc_b_value: Any
    variance_pct: float
    severity: str = "HIGH"
    explanation: str

class InconsistencySeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"


class InconsistencyRecord(BaseModel):
    model_config = ConfigDict(extra="allow")
    inconsistency_id: str
    type: str # e.g. GST_VS_ITR_REVENUE, GST_VS_BANK_INFLOW, DECLARED_VS_EXTRACTED_REVENUE, etc.
    severity: str = InconsistencySeverity.INFO.value # INFO, WARNING, REVIEW_REQUIRED (Never FRAUD)
    fields_involved: List[str] = []
    documents_involved: List[str] = []
    values: Dict[str, Any] = {}
    expected_range: Dict[str, Any] = {} # e.g. {"tolerance_pct": 5.0, "rule": "within 5%"}
    explanation: str
    status: str = "CONSISTENT" # CONSISTENT, REVIEW_REQUIRED, ACCEPTED_WITH_TOLERANCE
    variance_pct: Optional[float] = None

class ConsistencyReport(BaseModel):
    model_config = ConfigDict(extra="allow")
    report_id: str
    application_id: str
    is_consistent: bool
    discrepancy_score: float
    flagged_count: int
    discrepancies: List[DiscrepancyItem] = []
    inconsistencies: List[InconsistencyRecord] = []
    severity_breakdown: Dict[str, int] = Field(default_factory=dict)
    summary: Optional[str] = None
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EvidenceProvenanceTrace(BaseModel):
    model_config = ConfigDict(extra="allow")
    evidence_id: str
    application_id: str
    field_name: str
    display_label: str
    document: Dict[str, Any]
    page: int
    field: str
    original_extracted_value: Any
    normalized_value: Any
    confidence: float
    cross_check_status: str
    cross_checks: List[Dict[str, Any]] = []
    status: str
    tolerance_rule: str
    sha256_hash: Optional[str] = None
    extraction_method: Optional[str] = None
    source_text: Optional[str] = None
    history: List[Dict[str, Any]] = []


class MonthlyCashFlow(BaseModel):
    model_config = ConfigDict(extra="allow")
    month: str
    inflow: float
    outflow: float
    net_flow: float
    closing_balance: float
    emi_outflow: Optional[float] = None  # portion of outflow attributed to loan EMI

class CashFlowAnomalyRecord(BaseModel):
    """A flagged pattern or anomaly in the cash-flow data — never labelled as fraud."""
    model_config = ConfigDict(extra="allow")
    anomaly_id: str
    anomaly_type: str          # IRREGULAR_INFLOW, HIGH_OUTFLOW_SPIKE, etc.
    severity: str              # INFO | WARNING | REVIEW_REQUIRED
    month_affected: Optional[str] = None
    description: str
    value_observed: Optional[float] = None
    expected_range: Optional[str] = None

class HealthIndicator(BaseModel):
    """A single financial health signal with a plain-language label."""
    model_config = ConfigDict(extra="allow")
    indicator_id: str
    label: str                 # e.g. "Debt Service Coverage"
    metric_name: str           # e.g. "dscr"
    value: float
    unit: str                  # e.g. "x", "%", "days", "₹"
    status: str                # HEALTHY | ADEQUATE | STRESSED | CRITICAL
    explanation: str           # plain-language explanation shown in UI tooltip
    benchmark: Optional[str] = None  # e.g. "Min 1.2x required by policy"

class CashFlowMetrics(BaseModel):
    model_config = ConfigDict(extra="allow")
    metric_id: str
    application_id: str

    # ── Core averages ──────────────────────────────────────────────
    avg_monthly_inflow: float
    avg_monthly_outflow: float
    operating_cash_flow: float        # annual: credits − debits
    net_monthly_surplus: float        # avg_inflow − avg_outflow

    # ── Obligation analysis ────────────────────────────────────────
    existing_monthly_emi: float       # declared + extracted EMI obligations
    proposed_monthly_emi: float       # estimated EMI on requested facility
    total_monthly_obligations: float  # existing + proposed EMI
    surplus_after_obligations: float  # net_monthly_surplus − total_monthly_obligations
    debt_service_burden_pct: float    # total_obligations / avg_inflow × 100

    # ── Risk ratios ────────────────────────────────────────────────
    dscr: float                       # Debt Service Coverage Ratio
    cash_burn_rate: float             # avg daily outflow
    working_capital_buffer_days: int  # AMB / daily_outflow
    volatility_index: float           # coefficient of variation of monthly inflow
    seasonality_ratio: float          # peak-month / trough-month ratio

    # ── Trend & analysis ──────────────────────────────────────────
    monthly_trend: List[MonthlyCashFlow] = []
    anomalies: List[CashFlowAnomalyRecord] = []
    health_indicators: List[HealthIndicator] = []

    calculated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HardRuleEvaluation(BaseModel):
    model_config = ConfigDict(extra="allow")
    rule_id: str
    rule_name: str
    passed: bool
    threshold_value: Any
    actual_value: Any
    failure_reason: Optional[str] = None
    policy_citation: str

class PolicyGateResult(BaseModel):
    """Summary of deterministic policy gate outcome — the authoritative guard against ML overrides."""
    model_config = ConfigDict(extra="allow")
    all_passed: bool
    failed_rule_ids: List[str] = []
    failed_rule_names: List[str] = []
    hard_failure_count: int = 0
    review_flag_count: int = 0
    eligibility_status: str  # ELIGIBLE | NOT_ELIGIBLE | NEEDS_REVIEW

class RiskAssessment(BaseModel):
    model_config = ConfigDict(extra="allow")
    risk_id: str
    application_id: str

    # ── Policy Gate (deterministic — always evaluated first) ──────────────────
    all_hard_rules_passed: bool
    hard_rules: List[HardRuleEvaluation] = []
    policy_gate: Optional[PolicyGateResult] = None

    # ── Feature Engineering ───────────────────────────────────────────────────
    feature_vector: Dict[str, float] = {}      # full engineered feature dict
    feature_names: List[str] = []              # ordered list of feature names

    # ── ML Model Output ───────────────────────────────────────────────────────
    probability_of_default: float = Field(..., ge=0.0, le=1.0)
    risk_score: int = Field(..., ge=0, le=1000)
    risk_band: RiskBand
    model_version: str = "scikit-learn-sme-v3.0"

    # ── Decision Matrix Output ────────────────────────────────────────────────
    decision_rationale: str = ""               # human-readable chain of reasoning
    override_blocked: bool = False             # True if ML tried to approve but hard rule prevented it

    calculated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SHAPFeatureImpact(BaseModel):
    model_config = ConfigDict(extra="allow")
    feature_name: str
    feature_display_name: str
    feature_value: Any
    shap_value: float
    direction: str
    importance_rank: int

class SHAPAttribution(BaseModel):
    model_config = ConfigDict(extra="allow")
    shap_id: str
    risk_id: str
    application_id: str
    base_value: float
    model_output: float
    features: List[SHAPFeatureImpact] = []
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PolicyCitation(BaseModel):
    model_config = ConfigDict(extra="allow")
    clause_id: str
    title: str
    excerpt: str
    relevance_score: float

class DecisionRecord(BaseModel):
    model_config = ConfigDict(extra="allow")
    decision_id: str
    application_id: str
    outcome: DecisionOutcome
    approved_amount: float
    interest_rate: float
    tenor_months: int
    confidence_score: float
    reasoning: str
    policy_citations: List[PolicyCitation] = []
    evidence_citations: List[str] = []
    decided_by: str = "AI_ORCHESTRATOR"
    decided_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NextBestActionItem(BaseModel):
    model_config = ConfigDict(extra="allow")
    action_id: str
    priority: int
    title: str
    description: str
    action_type: ActionType
    cta_label: str
    safe_guardrail_status: str = "SAFE"
    safety_confidence: float = 0.95
    target_persona: str = "CUSTOMER"

class NextBestActionsResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    application_id: str
    primary_action: NextBestActionItem
    alternative_actions: List[NextBestActionItem] = []

class TrustGraphNode(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str
    label: str
    node_type: str
    risk_level: str
    trust_score: int
    details: Dict[str, Any] = {}

class TrustGraphEdge(BaseModel):
    model_config = ConfigDict(extra="allow")
    source: str
    target: str
    relation: str
    weight: float
    flagged: bool = False
    flag_reason: Optional[str] = None

class TrustGraph(BaseModel):
    model_config = ConfigDict(extra="allow")
    graph_id: str
    application_id: str
    nodes: List[TrustGraphNode]
    edges: List[TrustGraphEdge]
    circular_trading_detected: bool = False
    network_risk_score: float = 0.12
    cross_app_duplicate_signals: List[str] = []

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="allow")
    audit_id: str
    application_id: str
    actor_id: str
    actor_role: str
    action: str
    details: Dict[str, Any] = {}
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HumanOverrideRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    new_outcome: DecisionOutcome
    new_approved_amount: Optional[float] = None
    new_interest_rate: Optional[float] = None
    reason_code: str
    rationale_notes: str
    co_signed_by: Optional[str] = None

class HumanOverrideRecord(BaseModel):
    model_config = ConfigDict(extra="allow")
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
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WhatIfRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    revenue_delta_pct: float = 0.0
    tenor_months: Optional[int] = None
    buffer_days_delta: int = 0
    collateral_offered_amount: float = 0.0

class WhatIfResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
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
    model_config = ConfigDict(extra="allow")
    journey_id: str
    total_time_seconds: float
    friction_score: int
    bottleneck_stage: Optional[JourneyStage] = None
    resubmissions_count: int = 0
    warnings: List[str] = []

class ApplicationRecord(BaseModel):
    model_config = ConfigDict(extra="allow")
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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class JourneyRecord(BaseModel):
    model_config = ConfigDict(extra="allow")
    journey_id: str
    applicant_id: str
    current_stage: JourneyStage = JourneyStage.INTENT_CAPTURE
    status: JourneyStatus = JourneyStatus.ACTIVE
    intent: IntentPayload
    history: List[JourneyStepRecord] = []
    application_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
