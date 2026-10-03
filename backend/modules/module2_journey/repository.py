"""
FinFlow AI — Journey Repository
===============================
Persistence repository for journeys, transition steps, and timeline integration.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

from backend.database.firestore_client import db
from backend.database.repositories import (
    application_repo,
    journey_step_repo,
    audit_repo,
    AuditLogRepository,
)
from backend.database.models import ApplicationModel, JourneyStepModel


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class JourneyRepository:
    """
    Authoritative repository managing journey state and timeline records.
    """

    COLLECTION = "journeys"

    @classmethod
    def get(cls, journey_id: str) -> Optional[Dict[str, Any]]:
        return db.get(cls.COLLECTION, journey_id)

    @classmethod
    def save(cls, journey_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        data["updated_at"] = now_utc_iso()
        db.set(cls.COLLECTION, journey_id, data)
        return data

    @classmethod
    def create(cls, journey_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        now = now_utc_iso()
        data["created_at"] = data.get("created_at", now)
        data["updated_at"] = now
        db.set(cls.COLLECTION, journey_id, data)
        return data

    @classmethod
    def list_all(cls, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        return db.list(cls.COLLECTION, filters=filters)

    @classmethod
    def record_step_event(
        cls,
        application_id: str,
        stage: str,
        actor_id: str,
        actor_role: str,
        notes: Optional[str] = None
    ) -> str:
        """
        Appends an immutable step record into journey_steps collection.
        """
        step_id = f"step_{uuid.uuid4().hex[:12]}"
        now = now_utc_iso()

        step_model = JourneyStepModel(
            step_id=step_id,
            application_id=application_id,
            stage=stage,
            status="COMPLETED",
            entered_at=now,
            completed_at=now,
            duration_seconds=0.0,
            actor_id=actor_id,
            actor_role=actor_role,
            notes=notes,
        )

        try:
            journey_step_repo.create(step_model)
        except Exception:
            # Fallback direct store write if needed
            db.set("journey_steps", step_id, step_model.model_dump(by_alias=True))

        return step_id

    @classmethod
    def log_audit(
        cls,
        application_id: str,
        actor_id: str,
        actor_role: str,
        action: str,
        details: Dict[str, Any]
    ) -> str:
        """
        Appends an immutable audit log entry.
        """
        try:
            audit_model = AuditLogRepository.build_event(
                application_id=application_id,
                actor_id=actor_id,
                actor_role=actor_role,
                action=action,
                details=details
            )
            return audit_repo.append(audit_model)
        except Exception:
            audit_id = f"aud_{uuid.uuid4().hex[:12]}"
            db.set("audit_logs", audit_id, {
                "auditId": audit_id,
                "applicationId": application_id,
                "actorId": actor_id,
                "actorRole": actor_role,
                "action": action,
                "timestamp": now_utc_iso(),
                "details": details
            })
            return audit_id

    @classmethod
    def get_timeline_steps(cls, application_id: str) -> List[Dict[str, Any]]:
        """Retrieves ordered journey steps from journey_steps repository."""
        try:
            steps = journey_step_repo.list_by_application(application_id)
            return [s.model_dump(by_alias=True) for s in steps]
        except Exception:
            return db.list("journey_steps", filters={"applicationId": application_id})

    @classmethod
    def get_audit_trail(cls, application_id: str) -> List[Dict[str, Any]]:
        """Retrieves audit entries for an application."""
        try:
            logs = audit_repo.list_by_application(application_id)
            return [l.model_dump(by_alias=True) for l in logs]
        except Exception:
            return db.list("audit_logs", filters={"applicationId": application_id})
