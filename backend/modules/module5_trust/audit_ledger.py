import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Union
from backend.database.models import AuditLog, DecisionReplayEvent
from backend.database.firestore_client import db

# Canonical Decision Replay System Events
CANONICAL_EVENTS = {
    "INTENT_RECEIVED",
    "JOURNEY_CREATED",
    "DOCUMENT_UPLOADED",
    "OCR_STARTED",
    "OCR_COMPLETED",
    "EVIDENCE_CREATED",
    "EVIDENCE_VERIFIED",
    "INCONSISTENCY_DETECTED",
    "CASHFLOW_CALCULATED",
    "RISK_ASSESSED",
    "SHAP_GENERATED",
    "POLICY_RETRIEVED",
    "DECISION_GENERATED",
    "NEXT_ACTION_GENERATED",
    "HUMAN_REVIEW_STARTED",
    "HUMAN_OVERRIDE",
    "ACTION_EXECUTED",
    "JOURNEY_RESOLVED",
}

SENSITIVE_KEYS = {
    "password", "secret", "token", "authorization", "auth",
    "api_key", "apikey", "access_token", "refresh_token",
    "private_key", "credentials", "credit_card", "cvv"
}

def sanitize_audit_payload(val: Any, depth: int = 0) -> Any:
    """
    Recursively scrubs sensitive keys and truncates huge strings to prevent secret leakage
    and maintain clean, append-only audit entries.
    """
    if depth > 8:
        return "[MAX_DEPTH_REACHED]"
    if isinstance(val, dict):
        sanitized = {}
        for k, v in val.items():
            k_lower = str(k).lower()
            if any(s in k_lower for s in SENSITIVE_KEYS):
                sanitized[k] = "[REDACTED_SECRET]"
            else:
                sanitized[k] = sanitize_audit_payload(v, depth + 1)
        return sanitized
    elif isinstance(val, list):
        return [sanitize_audit_payload(item, depth + 1) for item in val[:50]]
    elif isinstance(val, str):
        if len(val) > 400 and ("base64" in val or val.startswith("eyJh")):
            return val[:32] + "...[TRUNCATED_BINARY_OR_JWT]"
        return val
    return val

class AuditLedger:
    @staticmethod
    def record_event(
        application_id: str,
        event_type: str,
        actor_type: str,
        actor_id: str,
        stage: str,
        payload_summary: str,
        references: Optional[Dict[str, Any]] = None,
        service: str = "journey-orchestrator",
        model_version: Optional[str] = None,
        input_data: Optional[Dict[str, Any]] = None,
        output_data: Optional[Dict[str, Any]] = None,
        evidence_used: Optional[List[Any]] = None,
        journey_id: Optional[str] = None,
        timestamp: Optional[Union[str, datetime]] = None,
        event_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Appends an immutable audit event for Decision Replay reconstruction.
        Strictly append-only with sanitized payloads.
        """
        if not event_id:
            event_id = f"aud_{uuid.uuid4().hex[:12]}"

        if timestamp is None:
            ts_str = datetime.now(timezone.utc).isoformat()
            dt_obj = datetime.now(timezone.utc)
        elif isinstance(timestamp, datetime):
            ts_str = timestamp.isoformat()
            dt_obj = timestamp
        else:
            ts_str = str(timestamp)
            try:
                dt_obj = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            except Exception:
                dt_obj = datetime.now(timezone.utc)

        clean_input = sanitize_audit_payload(input_data or {})
        clean_output = sanitize_audit_payload(output_data or {})
        clean_evidence = sanitize_audit_payload(evidence_used or [])
        clean_refs = sanitize_audit_payload(references or {})

        # Unified document supporting both DecisionReplayEvent schema and legacy AuditLog schema
        doc = {
            # Canonical Decision Replay fields
            "eventId": event_id,
            "applicationId": application_id,
            "journeyId": journey_id,
            "eventType": event_type,
            "actorType": actor_type,
            "actorId": actor_id,
            "stage": stage,
            "payloadSummary": payload_summary,
            "references": clean_refs,
            "timestamp": ts_str,
            "service": service,
            "modelVersion": model_version,
            "input": clean_input,
            "output": clean_output,
            "evidenceUsed": clean_evidence,

            # Legacy compatibility fields
            "audit_id": event_id,
            "application_id": application_id,
            "actor_id": actor_id,
            "actor_role": actor_type,
            "action": event_type,
            "details": {
                "summary": payload_summary,
                "stage": stage,
                "service": service,
                "references": clean_refs,
                "modelVersion": model_version,
                "input": clean_input,
                "output": clean_output,
                "evidenceUsed": clean_evidence,
            }
        }

        db.set("audit_logs", event_id, doc)
        return doc

    @staticmethod
    def log(
        application_id: str,
        actor_id: str,
        actor_role: str,
        action: str,
        details: Dict[str, Any] = {}
    ) -> AuditLog:
        """
        Legacy logging method preserved for full backward compatibility across all modules.
        Adapts details into canonical event fields automatically.
        """
        audit_id = f"aud_{uuid.uuid4().hex[:10]}"
        now = datetime.now(timezone.utc)
        clean_details = sanitize_audit_payload(details or {})

        # Infer stage and service if possible
        stage = clean_details.get("stage") or "ORCHESTRATION"
        service = clean_details.get("service") or "audit-ledger"
        model_version = clean_details.get("modelVersion") or clean_details.get("model_version")

        record = AuditLog(
            audit_id=audit_id,
            application_id=application_id,
            actor_id=actor_id,
            actor_role=actor_role,
            action=action,
            details=clean_details,
            timestamp=now
        )

        doc = record.model_dump()
        doc.update({
            "eventId": audit_id,
            "applicationId": application_id,
            "eventType": action,
            "actorType": actor_role,
            "actorId": actor_id,
            "stage": stage,
            "payloadSummary": clean_details.get("summary") or f"{action} recorded by {actor_role}",
            "references": clean_details.get("references", {}),
            "timestamp": now.isoformat(),
            "service": service,
            "modelVersion": model_version,
            "input": clean_details.get("input", {}),
            "output": clean_details.get("output", {}),
            "evidenceUsed": clean_details.get("evidenceUsed", clean_details.get("evidence_used", [])),
        })

        db.set("audit_logs", audit_id, doc)
        return record

    @staticmethod
    def get_logs_for_application(application_id: str) -> List[AuditLog]:
        logs = db.list("audit_logs", {"application_id": application_id})
        if not logs:
            logs = db.list("audit_logs", {"applicationId": application_id})
        logs_sorted = sorted(logs, key=lambda x: str(x.get("timestamp", "")), reverse=True)
        return [AuditLog(**l) for l in logs_sorted]
