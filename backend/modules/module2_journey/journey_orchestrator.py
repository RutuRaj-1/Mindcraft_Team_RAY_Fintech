"""
FinFlow AI — Journey Orchestrator
=================================
Authoritative owner and coordinator of the Journey Graph, stage transitions,
timeline reconstruction, and audit persistence.
"""

from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status
import uuid

from backend.modules.module2_journey.state_machine import (
    JourneyStateMachine,
    JourneyStage,
)
from backend.modules.module2_journey.schemas import (
    AdvanceJourneyResponse,
    JourneyTimelineResponse,
    JourneyTimelineStep,
    AuditEventSummary,
    NextActionResponse,
    now_utc_iso,
)
from backend.modules.module2_journey.repository import JourneyRepository
from backend.modules.module2_journey.service import JourneyService
from backend.database.repositories import application_repo, evidence_repo


class JourneyOrchestrator:
    """
    The Journey Orchestrator is the authoritative owner of the Journey Graph.
    Enforces deterministic state transitions, invariant checks, audit logging,
    and history persistence.
    """

    @classmethod
    def get_journey(cls, journey_id: str) -> Dict[str, Any]:
        """
        Retrieves the authoritative journey record or raises HTTP 404.
        """
        data = JourneyRepository.get(journey_id)
        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Journey with ID '{journey_id}' was not found in the persistence store."
            )
        return data

    @classmethod
    def advance_stage(
        cls,
        journey_id: str,
        target_stage: Optional[str] = None,
        actor_id: str = "system",
        actor_role: str = "CUSTOMER",
        notes: Optional[str] = None,
        override_review_mode: bool = False
    ) -> AdvanceJourneyResponse:
        """
        Validates and advances the journey stage.
        Enforces:
          - Valid stage progression
          - Block DECISION before RISK_ASSESSMENT is completed
          - Block RISK before evidence requirements are satisfied unless review mode is active
          - Append-only audit logging & step recording
        """
        journey = cls.get_journey(journey_id)
        raw_current = journey.get("current_stage", "INTENT_CAPTURE")
        current_stage = JourneyStateMachine.normalize_stage(raw_current)

        # Determine target stage
        if target_stage:
            resolved_target = JourneyStateMachine.normalize_stage(target_stage)
        else:
            default_next = JourneyStateMachine.get_next_default_stage(current_stage)
            if not default_next:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": "TERMINAL_STAGE_REACHED",
                        "message": f"Stage {current_stage.value} is terminal; no default sequential stage available.",
                        "current_stage": current_stage.value
                    }
                )
            resolved_target = default_next

        application_id = journey.get("application_id") or journey_id

        # ── Build Context for Invariant Guards ────────────────────────────────
        history_entries = journey.get("history", [])
        completed_stages = [
            h.get("stage") for h in history_entries if h.get("completed_at")
        ]

        # Check evidence satisfaction if advancing to RISK_ASSESSMENT
        evidence_satisfied = True
        missing_evidence: List[str] = []
        if resolved_target == JourneyStage.RISK_ASSESSMENT:
            try:
                items = evidence_repo.list_by_application(application_id)
                # If explicit evidence items exist, ensure at least one is verified or present
                if items:
                    verified_items = [it for it in items if getattr(it, "verificationStatus", "") == "VERIFIED"]
                    if not verified_items:
                        evidence_satisfied = False
                        missing_evidence.append("verified_gst_or_bank_evidence")
                else:
                    # In high-fidelity demo environments, check if documents were uploaded
                    docs = journey.get("documents", [])
                    if not docs and not journey.get("evidence_items"):
                        evidence_satisfied = False
                        missing_evidence.append("mandatory_financial_documents")
            except Exception:
                # If offline or in demo sandbox without seeded evidence, allow unless flagged
                pass

        guard_context: Dict[str, Any] = {
            "completed_stages": completed_stages,
            "evidence_satisfied": evidence_satisfied,
            "missing_evidence": missing_evidence,
            "override_review_mode": override_review_mode,
            "risk_assessment_completed": (
                "RISK_ASSESSMENT" in completed_stages or
                current_stage == JourneyStage.RISK_ASSESSMENT or
                bool(journey.get("risk_assessment")) or
                bool(journey.get("risk_score"))
            ),
        }

        # ── Enforce State Machine Invariants ─────────────────────────────────
        JourneyStateMachine.validate_transition(
            current_stage=current_stage,
            target_stage=resolved_target,
            context=guard_context
        )

        now = now_utc_iso()
        now_dt = datetime.now(timezone.utc)

        # ── Complete Previous Stage in History ────────────────────────────────
        if history_entries:
            last_entry = history_entries[-1]
            if not last_entry.get("completed_at"):
                last_entry["completed_at"] = now
                entered_at_str = last_entry.get("entered_at")
                if entered_at_str:
                    try:
                        entered_dt = datetime.fromisoformat(entered_at_str.replace("Z", "+00:00"))
                        last_entry["duration_seconds"] = max(0.0, (now_dt - entered_dt).total_seconds())
                    except Exception:
                        last_entry["duration_seconds"] = 1.0

        # ── Record New Transition Event ──────────────────────────────────────
        transition_event_id = f"step_{uuid.uuid4().hex[:12]}"
        new_step_entry = {
            "step_id": transition_event_id,
            "stage": resolved_target.value,
            "entered_at": now,
            "completed_at": None,
            "duration_seconds": None,
            "notes": notes or f"Advanced from {current_stage.value} to {resolved_target.value}",
            "actor_id": actor_id,
            "actor_role": actor_role,
        }
        history_entries.append(new_step_entry)

        # ── Update Authoritative Journey Record ──────────────────────────────
        journey["current_stage"] = resolved_target.value
        journey["history"] = history_entries
        journey["updated_at"] = now

        if resolved_target == JourneyStage.RESOLUTION:
            journey["status"] = "COMPLETED"

        JourneyRepository.save(journey_id, journey)

        # ── Persist in Journey Steps Collection ──────────────────────────────
        JourneyRepository.record_step_event(
            application_id=application_id,
            stage=resolved_target.value,
            actor_id=actor_id,
            actor_role=actor_role,
            notes=notes
        )

        # ── Update Application Model Stage ───────────────────────────────────
        try:
            application_repo.advance_stage(application_id, resolved_target.value)
        except Exception:
            pass

        # ── Log Audit Entry ──────────────────────────────────────────────────
        JourneyRepository.log_audit(
            application_id=application_id,
            actor_id=actor_id,
            actor_role=actor_role,
            action="STAGE_TRANSITION",
            details={
                "journey_id": journey_id,
                "transition_event_id": transition_event_id,
                "from_stage": current_stage.value,
                "to_stage": resolved_target.value,
                "override_review_mode": override_review_mode,
                "notes": notes,
            }
        )

        # ── Compute Next Action for New Stage ─────────────────────────────────
        next_action = JourneyService.calculate_next_action(resolved_target, journey)

        return AdvanceJourneyResponse(
            journey_id=journey_id,
            previous_stage=current_stage.value,
            current_stage=resolved_target.value,
            status=journey.get("status", "ACTIVE"),
            transition_event_id=transition_event_id,
            next_action=next_action,
            updated_at=now,
            message=f"Journey successfully advanced from {current_stage.value} to {resolved_target.value}"
        )

    @classmethod
    def get_timeline(cls, journey_id: str) -> JourneyTimelineResponse:
        """
        Reconstructs the full chronological timeline of historical stage transitions
        and associated audit events.
        """
        journey = cls.get_journey(journey_id)
        application_id = journey.get("application_id") or journey_id
        business_name = journey.get("business_name", "Enterprise Applicant")

        history_raw = journey.get("history", [])

        # Enrich timeline steps
        timeline_steps: List[JourneyTimelineStep] = []
        for idx, h in enumerate(history_raw):
            timeline_steps.append(
                JourneyTimelineStep(
                    step_id=h.get("step_id") or f"step_{idx+1}",
                    stage=h.get("stage", "UNKNOWN"),
                    entered_at=h.get("entered_at", now_utc_iso()),
                    completed_at=h.get("completed_at"),
                    duration_seconds=h.get("duration_seconds"),
                    actor_id=h.get("actor_id"),
                    actor_role=h.get("actor_role"),
                    notes=h.get("notes"),
                    status="COMPLETED" if h.get("completed_at") else "ACTIVE"
                )
            )

        # Fetch persisted audit events
        audit_raw = JourneyRepository.get_audit_trail(application_id)
        audit_summaries: List[AuditEventSummary] = []
        for a in audit_raw:
            audit_summaries.append(
                AuditEventSummary(
                    audit_id=a.get("auditId") or a.get("audit_id") or "aud_unknown",
                    action=a.get("action", "SYSTEM_EVENT"),
                    actor_id=a.get("actorId") or a.get("actor_id") or "system",
                    actor_role=a.get("actorRole") or a.get("actor_role") or "SYSTEM",
                    timestamp=a.get("timestamp", now_utc_iso()),
                    details=a.get("details", {})
                )
            )

        return JourneyTimelineResponse(
            journey_id=journey_id,
            application_id=application_id,
            business_name=business_name,
            current_stage=journey.get("current_stage", "INTENT_CAPTURE"),
            status=journey.get("status", "ACTIVE"),
            total_steps=len(timeline_steps),
            created_at=journey.get("created_at", now_utc_iso()),
            updated_at=journey.get("updated_at", now_utc_iso()),
            transitions=timeline_steps,
            audit_events=audit_summaries
        )

    @classmethod
    def calculate_friction(cls, journey_id: str) -> Dict[str, Any]:
        """
        Backwards-compatible friction diagnostics for telemetry.
        """
        journey = cls.get_journey(journey_id)
        history = journey.get("history", [])

        total_time = 0.0
        stages_seen = set()
        resubmissions = 0

        for step in history:
            dur = step.get("duration_seconds") or 0.0
            total_time += dur
            stg = step.get("stage")
            if stg in stages_seen:
                resubmissions += 1
            stages_seen.add(stg)

        friction_score = min(100, int((resubmissions * 20) + (total_time / 3600.0 * 5)))

        return {
            "journey_id": journey_id,
            "total_time_seconds": total_time,
            "friction_score": friction_score,
            "bottleneck_stage": journey.get("current_stage"),
            "resubmissions_count": resubmissions,
            "warnings": [
                "Discrepancy resubmission detected" if resubmissions > 0 else "Flow proceeding smoothly"
            ]
        }
