"""
FinFlow AI — Journey Module Schemas
===================================
Pydantic v2 request & response models for Journey Orchestration.
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, field_validator


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Journey Creation ──────────────────────────────────────────────────────────

class CreateJourneyRequest(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    product_type: str = Field(
        default="sme_working_capital",
        description="Target financial product type (e.g. sme_working_capital, invoice_discounting)"
    )
    requested_amount: float = Field(
        ...,
        gt=0,
        description="Requested loan amount in INR (must be positive)"
    )
    intent_summary: str = Field(
        ...,
        min_length=10,
        description="Natural-language description of financial need"
    )
    purpose: str = Field(
        ...,
        min_length=5,
        description="Business purpose for financing (e.g. Raw material purchase, inventory)"
    )
    business_name: str = Field(
        ...,
        min_length=2,
        description="Legal trade or enterprise name"
    )
    annual_turnover: Optional[float] = Field(
        default=None,
        ge=0,
        description="Reported annual turnover in INR"
    )
    vintage_months: Optional[int] = Field(
        default=12,
        ge=0,
        description="Operational vintage of the business in months"
    )
    tenor_months: Optional[int] = Field(
        default=12,
        ge=1,
        le=120,
        description="Requested repayment tenure in months"
    )
    pan: Optional[str] = Field(
        default=None,
        description="Permanent Account Number (PAN)"
    )
    gstin: Optional[str] = Field(
        default=None,
        description="Goods and Services Tax Identification Number (GSTIN)"
    )
    industry_sector: Optional[str] = Field(
        default="SME Commercial / Manufacturing",
        description="Primary industry classification"
    )

    @field_validator("requested_amount")
    @classmethod
    def validate_requested_amount(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("requested_amount must be strictly greater than 0")
        if v > 100_000_000_000:
            raise ValueError("requested_amount exceeds maximum platform threshold (10,000 Cr)")
        return v

    @field_validator("intent_summary")
    @classmethod
    def validate_intent_summary(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 10:
            raise ValueError("intent_summary must be at least 10 characters long with descriptive financial intent")
        return cleaned

    @field_validator("purpose")
    @classmethod
    def validate_purpose(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 5:
            raise ValueError("purpose must be at least 5 characters long")
        return cleaned


class NextActionResponse(BaseModel):
    action_id: str
    action_type: str
    title: str
    description: str
    cta_label: str
    target_stage: Optional[str] = None
    safe_guardrail_status: str = "SAFE"
    safety_confidence: float = 0.95


class CreateJourneyResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    journey_id: str
    application_id: str
    current_stage: str
    status: str
    next_action: NextActionResponse
    created_at: str
    business_name: str
    requested_amount: float
    message: str = "Journey initiated successfully in INTENT_CAPTURE stage"
    missing_evidence_requirements: List[str] = Field(default_factory=list)
    raw_customer_intent: Optional[Dict[str, Any]] = None
    normalized_structured_intent: Optional[Dict[str, Any]] = None


# ── Advance Journey ───────────────────────────────────────────────────────────

class AdvanceJourneyRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    target_stage: Optional[str] = Field(
        default=None,
        description="Target FSM stage to transition into. If omitted, advances to the next logical stage."
    )
    notes: Optional[str] = Field(
        default=None,
        description="Optional justification, underwriter notes, or audit annotation."
    )
    override_review_mode: bool = Field(
        default=False,
        description="Explicit flag to allow advancing to RISK_ASSESSMENT when review mode is justified."
    )
    actor_id: Optional[str] = Field(
        default=None,
        description="Actor UID initiating the transition (default: current authenticated user)"
    )
    actor_role: Optional[str] = Field(
        default=None,
        description="Role of the actor (default: current authenticated user role)"
    )


class AdvanceJourneyResponse(BaseModel):
    journey_id: str
    previous_stage: str
    current_stage: str
    status: str
    transition_event_id: str
    next_action: NextActionResponse
    updated_at: str
    message: str


# ── Timeline & History ────────────────────────────────────────────────────────

class JourneyTimelineStep(BaseModel):
    step_id: str
    stage: str
    entered_at: str
    completed_at: Optional[str] = None
    duration_seconds: Optional[float] = None
    actor_id: Optional[str] = None
    actor_role: Optional[str] = None
    notes: Optional[str] = None
    status: str = "COMPLETED"


class AuditEventSummary(BaseModel):
    audit_id: str
    action: str
    actor_id: str
    actor_role: str
    timestamp: str
    details: Dict[str, Any] = Field(default_factory=dict)


class JourneyTimelineResponse(BaseModel):
    journey_id: str
    application_id: Optional[str] = None
    business_name: str
    current_stage: str
    status: str
    total_steps: int
    created_at: str
    updated_at: str
    transitions: List[JourneyTimelineStep]
    audit_events: List[AuditEventSummary] = Field(default_factory=list)


# ── Structured Error Model ────────────────────────────────────────────────────

class StageTransitionErrorDetail(BaseModel):
    error: str = "INVALID_STAGE_TRANSITION"
    message: str
    current_stage: str
    target_stage: str
    allowed_stages: List[str]
    remediation: str
