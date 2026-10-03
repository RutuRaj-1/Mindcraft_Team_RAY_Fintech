from datetime import datetime
from typing import Optional, List
from fastapi import HTTPException
from backend.database.models import (
    JourneyRecord, JourneyStage, JourneyStatus, JourneyStepRecord, JourneyFrictionMetrics
)
from backend.database.firestore_client import db
from backend.modules.module5_trust.audit_ledger import AuditLedger

# Valid transitions map
STAGE_ORDER = [
    JourneyStage.INTENT_CAPTURE,
    JourneyStage.EVIDENCE_COLLECTION,
    JourneyStage.VERIFICATION,
    JourneyStage.RISK_ASSESSMENT,
    JourneyStage.EXPLAINABLE_DECISION,
    JourneyStage.NEXT_BEST_ACTION,
    JourneyStage.HUMAN_REVIEW,
    JourneyStage.SANCTIONED,
    JourneyStage.REJECTED
]

ALLOWED_TRANSITIONS = {
    JourneyStage.INTENT_CAPTURE: [JourneyStage.EVIDENCE_COLLECTION],
    JourneyStage.EVIDENCE_COLLECTION: [JourneyStage.VERIFICATION],
    JourneyStage.VERIFICATION: [JourneyStage.RISK_ASSESSMENT, JourneyStage.EVIDENCE_COLLECTION],
    JourneyStage.RISK_ASSESSMENT: [JourneyStage.EXPLAINABLE_DECISION, JourneyStage.REJECTED],
    JourneyStage.EXPLAINABLE_DECISION: [JourneyStage.NEXT_BEST_ACTION, JourneyStage.HUMAN_REVIEW],
    JourneyStage.NEXT_BEST_ACTION: [JourneyStage.HUMAN_REVIEW, JourneyStage.SANCTIONED, JourneyStage.REJECTED],
    JourneyStage.HUMAN_REVIEW: [JourneyStage.SANCTIONED, JourneyStage.REJECTED, JourneyStage.EVIDENCE_COLLECTION],
    JourneyStage.SANCTIONED: [],
    JourneyStage.REJECTED: [JourneyStage.EVIDENCE_COLLECTION]
}

class JourneyOrchestrator:
    @staticmethod
    def get_journey(journey_id: str) -> JourneyRecord:
        data = db.get("journeys", journey_id)
        if not data:
            raise HTTPException(status_code=404, detail=f"Journey {journey_id} not found")
        return JourneyRecord(**data)

    @staticmethod
    def advance_stage(journey_id: str, target_stage: JourneyStage, actor_id: str, actor_role: str, notes: Optional[str] = None) -> JourneyRecord:
        journey = JourneyOrchestrator.get_journey(journey_id)
        current = journey.current_stage

        allowed = ALLOWED_TRANSITIONS.get(current, [])
        if target_stage not in allowed and target_stage != current:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid transition from {current.value} to {target_stage.value}. Allowed: {[s.value for s in allowed]}"
            )

        now = datetime.utcnow()

        # Complete previous step in history
        if journey.history:
            last_step = journey.history[-1]
            if last_step.stage == current and not last_step.completed_at:
                last_step.completed_at = now
                if isinstance(last_step.entered_at, str):
                    entered_dt = datetime.fromisoformat(last_step.entered_at)
                else:
                    entered_dt = last_step.entered_at
                last_step.duration_seconds = (now - entered_dt).total_seconds()

        # Add new step
        new_step = JourneyStepRecord(
            stage=target_stage,
            entered_at=now,
            notes=notes
        )
        journey.history.append(new_step)
        journey.current_stage = target_stage
        journey.updated_at = now

        if target_stage in [JourneyStage.SANCTIONED, JourneyStage.REJECTED]:
            journey.status = JourneyStatus.COMPLETED

        db.set("journeys", journey_id, journey.model_dump())

        AuditLedger.log(
            application_id=journey.application_id or journey_id,
            actor_id=actor_id,
            actor_role=actor_role,
            action="STAGE_TRANSITION",
            details={"from_stage": current.value, "to_stage": target_stage.value, "notes": notes}
        )

        return journey

    @staticmethod
    def calculate_friction(journey_id: str) -> JourneyFrictionMetrics:
        journey = JourneyOrchestrator.get_journey(journey_id)
        total_time = 0.0
        stage_times = {}
        resubmissions = 0
        stages_visited = []

        now = datetime.utcnow()
        for step in journey.history:
            stages_visited.append(step.stage)
            if step.completed_at and step.duration_seconds:
                dur = step.duration_seconds
            else:
                entered = datetime.fromisoformat(step.entered_at) if isinstance(step.entered_at, str) else step.entered_at
                dur = (now - entered).total_seconds()
            
            stage_times[step.stage] = stage_times.get(step.stage, 0.0) + dur
            total_time += dur

        # Count resubmissions if stage visited more than once
        from collections import Counter
        counts = Counter(stages_visited)
        for stage, c in counts.items():
            if c > 1:
                resubmissions += (c - 1)

        # Determine bottleneck stage
        bottleneck = max(stage_times, key=stage_times.get) if stage_times else None

        # Compute friction score (0 to 100)
        # Factors: excessive stage time, resubmissions, document inconsistency
        base_friction = 10
        if resubmissions > 0:
            base_friction += resubmissions * 25
        if total_time > 600: # more than 10 minutes
            base_friction += 20
        
        # Check if consistency issues exist
        if journey.application_id:
            rep = db.get("consistency_reports", f"rep_{journey.application_id}")
            if rep and not rep.get("is_consistent", True):
                base_friction += 30

        friction_score = min(100, max(0, base_friction))

        warnings = []
        if resubmissions > 0:
            warnings.append(f"Applicant had to resubmit or backtrack {resubmissions} time(s).")
        if bottleneck == JourneyStage.VERIFICATION and stage_times.get(bottleneck, 0) > 120:
            warnings.append("Document verification stage took longer than expected benchmark.")
        if friction_score >= 60:
            warnings.append("High friction detected: Relationship Manager proactive touchpoint advised.")

        return JourneyFrictionMetrics(
            journey_id=journey_id,
            total_time_seconds=round(total_time, 2),
            friction_score=friction_score,
            bottleneck_stage=bottleneck,
            resubmissions_count=resubmissions,
            warnings=warnings
        )
