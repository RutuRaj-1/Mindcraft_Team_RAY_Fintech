"""
FinFlow AI — Journey State Machine
==================================
Deterministic Finite State Machine (FSM) enforcing stage progression and invariant guards.

Standard Lifecycle:
  INTENT_CAPTURE
  → EVIDENCE_COLLECTION
  → VERIFICATION
  → RISK_ASSESSMENT
  → DECISION
  → NEXT_ACTION
  → RESOLUTION

Key Guards:
  - DECISION is blocked before RISK_ASSESSMENT is completed.
  - RISK_ASSESSMENT is blocked before evidence requirements are satisfied,
    unless explicitly permitted in review mode.
  - Invalid transitions raise a structured HTTP 400 error.
"""

from enum import Enum
from typing import Dict, List, Optional, Any, Set
from fastapi import HTTPException, status


class JourneyStage(str, Enum):
    INTENT_CAPTURE = "INTENT_CAPTURE"
    EVIDENCE_COLLECTION = "EVIDENCE_COLLECTION"
    VERIFICATION = "VERIFICATION"
    RISK_ASSESSMENT = "RISK_ASSESSMENT"
    DECISION = "DECISION"
    NEXT_ACTION = "NEXT_ACTION"
    RESOLUTION = "RESOLUTION"
    HUMAN_REVIEW = "HUMAN_REVIEW"  # Institutional exception/governance branch


# Canonical progression order
CANONICAL_STAGE_ORDER: List[JourneyStage] = [
    JourneyStage.INTENT_CAPTURE,
    JourneyStage.EVIDENCE_COLLECTION,
    JourneyStage.VERIFICATION,
    JourneyStage.RISK_ASSESSMENT,
    JourneyStage.DECISION,
    JourneyStage.NEXT_ACTION,
    JourneyStage.RESOLUTION,
]

# Backward-compatibility alias normalizer
STAGE_ALIASES: Dict[str, JourneyStage] = {
    "INTENT_CAPTURE": JourneyStage.INTENT_CAPTURE,
    "EVIDENCE_COLLECTION": JourneyStage.EVIDENCE_COLLECTION,
    "VERIFICATION": JourneyStage.VERIFICATION,
    "RISK_ASSESSMENT": JourneyStage.RISK_ASSESSMENT,
    "DECISION": JourneyStage.DECISION,
    "EXPLAINABLE_DECISION": JourneyStage.DECISION,
    "NEXT_ACTION": JourneyStage.NEXT_ACTION,
    "NEXT_BEST_ACTION": JourneyStage.NEXT_ACTION,
    "RESOLUTION": JourneyStage.RESOLUTION,
    "SANCTIONED": JourneyStage.RESOLUTION,
    "REJECTED": JourneyStage.RESOLUTION,
    "HUMAN_REVIEW": JourneyStage.HUMAN_REVIEW,
}

# Explicit Transition Matrix
ALLOWED_TRANSITIONS: Dict[JourneyStage, List[JourneyStage]] = {
    JourneyStage.INTENT_CAPTURE: [
        JourneyStage.EVIDENCE_COLLECTION
    ],
    JourneyStage.EVIDENCE_COLLECTION: [
        JourneyStage.VERIFICATION
    ],
    JourneyStage.VERIFICATION: [
        JourneyStage.RISK_ASSESSMENT,
        JourneyStage.EVIDENCE_COLLECTION,  # Discrepancy rollback to request more evidence
        JourneyStage.HUMAN_REVIEW,
    ],
    JourneyStage.RISK_ASSESSMENT: [
        JourneyStage.DECISION,
        JourneyStage.HUMAN_REVIEW,
    ],
    JourneyStage.DECISION: [
        JourneyStage.NEXT_ACTION,
        JourneyStage.HUMAN_REVIEW,
        JourneyStage.RESOLUTION,
    ],
    JourneyStage.NEXT_ACTION: [
        JourneyStage.RESOLUTION,
        JourneyStage.HUMAN_REVIEW,
    ],
    JourneyStage.HUMAN_REVIEW: [
        JourneyStage.EVIDENCE_COLLECTION,
        JourneyStage.RISK_ASSESSMENT,
        JourneyStage.DECISION,
        JourneyStage.RESOLUTION,
    ],
    JourneyStage.RESOLUTION: [
        # Terminal state, but appeals can reopen evidence collection
        JourneyStage.EVIDENCE_COLLECTION
    ],
}


class InvalidStageTransitionException(HTTPException):
    def __init__(self, current_stage: str, target_stage: str, allowed: List[str], message: Optional[str] = None):
        detail = {
            "error": "INVALID_STAGE_TRANSITION",
            "message": message or f"Invalid transition from {current_stage} to {target_stage}.",
            "current_stage": current_stage,
            "target_stage": target_stage,
            "allowed_stages": allowed,
            "remediation": f"Available next stages from {current_stage} are: {', '.join(allowed) if allowed else 'None (Terminal)'}"
        }
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class PreconditionFailedException(HTTPException):
    def __init__(self, current_stage: str, target_stage: str, reason: str, remediation: str, missing: Optional[List[str]] = None):
        detail = {
            "error": "PRECONDITION_FAILED",
            "message": reason,
            "current_stage": current_stage,
            "target_stage": target_stage,
            "missing_requirements": missing or [],
            "remediation": remediation,
        }
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class JourneyStateMachine:
    """
    Stateless validator and transition manager for FinFlow AI journeys.
    """

    @classmethod
    def normalize_stage(cls, stage_str: str) -> JourneyStage:
        """Converts raw strings or aliases into a canonical JourneyStage enum."""
        if isinstance(stage_str, JourneyStage):
            return stage_str
        normalized = stage_str.strip().upper()
        if normalized not in STAGE_ALIASES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown stage '{stage_str}'. Valid stages: {[s.value for s in JourneyStage]}"
            )
        return STAGE_ALIASES[normalized]

    @classmethod
    def get_allowed_transitions(cls, current_stage: JourneyStage) -> List[JourneyStage]:
        return ALLOWED_TRANSITIONS.get(current_stage, [])

    @classmethod
    def get_next_default_stage(cls, current_stage: JourneyStage) -> Optional[JourneyStage]:
        """Returns the natural sequential stage if advancing forward."""
        allowed = cls.get_allowed_transitions(current_stage)
        if not allowed:
            return None
        # Default to first non-exception transition
        for next_stg in allowed:
            if next_stg != JourneyStage.HUMAN_REVIEW and next_stg != JourneyStage.EVIDENCE_COLLECTION:
                return next_stg
        return allowed[0]

    @classmethod
    def validate_transition(
        cls,
        current_stage: JourneyStage,
        target_stage: JourneyStage,
        context: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Validates whether current_stage can transition to target_stage and checks invariant guards.
        Raises InvalidStageTransitionException or PreconditionFailedException on breach.
        """
        ctx = context or {}
        allowed = cls.get_allowed_transitions(current_stage)

        # 1. Structural transition check
        if target_stage not in allowed:
            raise InvalidStageTransitionException(
                current_stage=current_stage.value,
                target_stage=target_stage.value,
                allowed=[s.value for s in allowed]
            )

        # 2. Invariant Guard: Never allow RISK before evidence requirements are satisfied
        #    unless explicitly in review mode.
        if target_stage == JourneyStage.RISK_ASSESSMENT:
            override_review = bool(ctx.get("override_review_mode") or ctx.get("review_mode"))
            has_evidence = bool(ctx.get("evidence_satisfied", True))  # defaults true unless flagged
            missing_evidence = ctx.get("missing_evidence", [])

            if not has_evidence and not override_review:
                raise PreconditionFailedException(
                    current_stage=current_stage.value,
                    target_stage=target_stage.value,
                    reason="Never allow RISK before evidence requirements are satisfied unless explicitly in review mode.",
                    remediation="Upload verified GST/ITR documents, or pass 'override_review_mode=True' if authorized.",
                    missing=missing_evidence or ["mandatory_financial_evidence"]
                )

        # 3. Invariant Guard: Never allow DECISION before RISK_ASSESSMENT completion.
        if target_stage in (JourneyStage.DECISION, JourneyStage.NEXT_ACTION, JourneyStage.RESOLUTION):
            completed_stages: Set[str] = set(ctx.get("completed_stages", []))
            has_risk_assessment = (
                "RISK_ASSESSMENT" in completed_stages or
                current_stage == JourneyStage.RISK_ASSESSMENT or
                bool(ctx.get("risk_assessment_completed"))
            )
            if not has_risk_assessment:
                raise PreconditionFailedException(
                    current_stage=current_stage.value,
                    target_stage=target_stage.value,
                    reason="Never allow DECISION before RISK_ASSESSMENT completion.",
                    remediation="Complete the RISK_ASSESSMENT stage before requesting credit decisioning.",
                    missing=["risk_assessment_completion"]
                )
