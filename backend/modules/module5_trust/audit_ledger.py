import uuid
from datetime import datetime
from typing import Dict, Any, List
from backend.database.models import AuditLog
from backend.database.firestore_client import db

class AuditLedger:
    @staticmethod
    def log(
        application_id: str,
        actor_id: str,
        actor_role: str,
        action: str,
        details: Dict[str, Any] = {}
    ) -> AuditLog:
        audit_id = f"aud_{uuid.uuid4().hex[:10]}"
        record = AuditLog(
            audit_id=audit_id,
            application_id=application_id,
            actor_id=actor_id,
            actor_role=actor_role,
            action=action,
            details=details,
            timestamp=datetime.utcnow()
        )
        db.set("audit_logs", audit_id, record.model_dump())
        return record

    @staticmethod
    def get_logs_for_application(application_id: str) -> List[AuditLog]:
        logs = db.list("audit_logs", {"application_id": application_id})
        logs_sorted = sorted(logs, key=lambda x: x.get("timestamp", ""), reverse=True)
        return [AuditLog(**l) for l in logs_sorted]
