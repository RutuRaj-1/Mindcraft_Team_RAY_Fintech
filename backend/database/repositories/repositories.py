"""
FinFlow AI — All Repository Implementations
============================================
One repository class per Firestore collection.

Collections (20 total):
  users, applications, documents, evidence_items, journey_steps,
  risk_assessments, decisions, next_best_actions, audit_logs,
  policy_documents, policy_chunks, financial_snapshots,
  trust_graph_nodes, trust_graph_edges, fraud_signals,
  what_if_scenarios, human_reviews, feedback_events,
  notifications, system_events
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from backend.database.models import (
    AuditLogModel,
    ApplicationModel,
    DecisionModel,
    DocumentModel,
    EvidenceItemModel,
    FeedbackEventModel,
    FinancialSnapshotModel,
    FraudSignalModel,
    HumanReviewModel,
    JourneyStepModel,
    NextBestActionModel,
    NotificationModel,
    PolicyChunkModel,
    PolicyDocumentModel,
    RiskAssessmentModel,
    SystemEventModel,
    TrustGraphEdgeModel,
    TrustGraphNodeModel,
    UserModel,
    WhatIfScenarioModel,
    now_utc_iso,
)
from backend.database.repositories.base import BaseRepository


# =============================================================================
# 1. users
# =============================================================================


class UserRepository(BaseRepository[UserModel]):
    COLLECTION = "users"
    MODEL = UserModel

    def _doc_id(self, data: Dict[str, Any]) -> str:
        return data["userId"]

    def get_by_email(self, email: str) -> Optional[UserModel]:
        results = self.list(filters={"email": email}, limit=1)
        return results[0] if results else None

    def list_by_role(self, role: str) -> List[UserModel]:
        return self.list(filters={"role": role})


# =============================================================================
# 2. applications
# =============================================================================


class ApplicationRepository(BaseRepository[ApplicationModel]):
    COLLECTION = "applications"
    MODEL = ApplicationModel

    def _doc_id(self, data: Dict[str, Any]) -> str:
        return data["applicationId"]

    def list_by_user(
        self,
        user_id: str,
        limit: Optional[int] = None,
        start_after: Optional[str] = None,
    ) -> List[ApplicationModel]:
        return self.list(
            filters={"userId": user_id},
            order_by="-createdAt",
            limit=limit,
            start_after=start_after,
        )

    def list_by_status(
        self,
        status: str,
        limit: Optional[int] = None,
        start_after: Optional[str] = None,
    ) -> List[ApplicationModel]:
        return self.list(
            filters={"status": status},
            order_by="-createdAt",
            limit=limit,
            start_after=start_after,
        )

    def list_by_stage(self, stage: str) -> List[ApplicationModel]:
        return self.list(filters={"currentStage": stage})

    def advance_stage(
        self, application_id: str, new_stage: str, new_status: Optional[str] = None
    ) -> bool:
        """Atomically update currentStage (and optionally status)."""
        updates: Dict[str, Any] = {"currentStage": new_stage}
        if new_status:
            updates["status"] = new_status
        return self.transactional_update(application_id, updates)


# =============================================================================
# 3. documents
# =============================================================================


class DocumentRepository(BaseRepository[DocumentModel]):
    COLLECTION = "documents"
    MODEL = DocumentModel

    def _doc_id(self, data: Dict[str, Any]) -> str:
        return data["documentId"]

    def list_by_application(
        self,
        application_id: str,
        limit: Optional[int] = None,
        start_after: Optional[str] = None,
    ) -> List[DocumentModel]:
        return self.list(
            filters={"applicationId": application_id},
            order_by="-uploadedAt",
            limit=limit,
            start_after=start_after,
        )

    def list_by_ocr_status(
        self, application_id: str, ocr_status: str
    ) -> List[DocumentModel]:
        return self.list(
            filters={"applicationId": application_id, "ocrStatus": ocr_status}
        )

    def update_ocr_status(self, document_id: str, ocr_status: str) -> bool:
        return self.update(document_id, {"ocrStatus": ocr_status})

    def update_verification_status(
        self, document_id: str, verification_status: str
    ) -> bool:
        return self.update(document_id, {"verificationStatus": verification_status})

    def get_by_hash(self, file_hash: str) -> Optional[DocumentModel]:
        """Detect duplicate uploads by SHA-256 hash."""
        results = self.list(filters={"fileHash": file_hash}, limit=1)
        return results[0] if results else None


# =============================================================================
# 4. evidence_items
# =============================================================================


class EvidenceItemRepository(BaseRepository[EvidenceItemModel]):
    COLLECTION = "evidence_items"
    MODEL = EvidenceItemModel

    def _doc_id(self, data: Dict[str, Any]) -> str:
        return data["evidenceId"]

    def list_by_application(
        self,
        application_id: str,
        limit: Optional[int] = None,
        start_after: Optional[str] = None,
    ) -> List[EvidenceItemModel]:
        return self.list(
            filters={"applicationId": application_id},
            order_by="-createdAt",
            limit=limit,
            start_after=start_after,
        )

    def list_by_document(self, document_id: str) -> List[EvidenceItemModel]:
        return self.list(filters={"documentId": document_id})

    def list_by_field(
        self, application_id: str, field_name: str
    ) -> List[EvidenceItemModel]:
        return self.list(
            filters={"applicationId": application_id, "fieldName": field_name}
        )

    def as_field_map(self, application_id: str) -> Dict[str, Any]:
        """Return {fieldName: value} map of verified evidence for an application."""
        items = self.list_by_application(application_id)
        return {
            item.fieldName: item.normalizedValue if item.normalizedValue is not None else item.value
            for item in items
            if item.verificationStatus in ("PENDING", "VERIFIED")
        }

    def verify(self, evidence_id: str) -> bool:
        return self.update(evidence_id, {"verificationStatus": "VERIFIED"})


# =============================================================================
# 5. journey_steps
# =============================================================================


class JourneyStepRepository(BaseRepository[JourneyStepModel]):
    COLLECTION = "journey_steps"
    MODEL = JourneyStepModel

    def _doc_id(self, data: Dict[str, Any]) -> str:
        return data["stepId"]

    def _guard_update(self) -> None:
        # Journey steps are immutable once created (FSM history)
        raise PermissionError("journey_steps records are immutable after creation.")

    def _guard_delete(self) -> None:
        raise PermissionError("journey_steps records cannot be deleted.")

    def list_by_application(self, application_id: str) -> List[JourneyStepModel]:
        return self.list(
            filters={"applicationId": application_id}, order_by="enteredAt"
        )

    def latest_step(self, application_id: str) -> Optional[JourneyStepModel]:
        steps = self.list(
            filters={"applicationId": application_id},
            order_by="-enteredAt",
            limit=1,
        )
        return steps[0] if steps else None


# =============================================================================
# 6. risk_assessments
# =============================================================================


class RiskAssessmentRepository(BaseRepository[RiskAssessmentModel]):
    COLLECTION = "risk_assessments"
    MODEL = RiskAssessmentModel

    def _doc_id(self, data: Dict[str, Any]) -> str:
        return data["riskId"]

    def _guard_update(self) -> None:
        raise PermissionError("risk_assessments are immutable; create a new record.")

    def _guard_delete(self) -> None:
        raise PermissionError("risk_assessments cannot be deleted.")

    def list_by_application(self, application_id: str) -> List[RiskAssessmentModel]:
        return self.list(
            filters={"applicationId": application_id}, order_by="-createdAt"
        )

    def latest(self, application_id: str) -> Optional[RiskAssessmentModel]:
        results = self.list(
            filters={"applicationId": application_id},
            order_by="-createdAt",
            limit=1,
        )
        return results[0] if results else None


# =============================================================================
# 7. decisions
# =============================================================================


class DecisionRepository(BaseRepository[DecisionModel]):
    COLLECTION = "decisions"
    MODEL = DecisionModel

    def _doc_id(self, data: Dict[str, Any]) -> str:
        return data["decisionId"]

    def _guard_update(self) -> None:
        raise PermissionError("decisions are immutable; use human_reviews for overrides.")

    def _guard_delete(self) -> None:
        raise PermissionError("decisions cannot be deleted.")

    def list_by_application(self, application_id: str) -> List[DecisionModel]:
        return self.list(
            filters={"applicationId": application_id}, order_by="-createdAt"
        )

    def latest(self, application_id: str) -> Optional[DecisionModel]:
        results = self.list(
            filters={"applicationId": application_id},
            order_by="-createdAt",
            limit=1,
        )
        return results[0] if results else None

    def list_by_outcome(self, outcome: str) -> List[DecisionModel]:
        return self.list(filters={"outcome": outcome})


# =============================================================================
# 8. next_best_actions
# =============================================================================


class NextBestActionRepository(BaseRepository[NextBestActionModel]):
    COLLECTION = "next_best_actions"
    MODEL = NextBestActionModel

    def _doc_id(self, data: Dict[str, Any]) -> str:
        return data["actionId"]

    def list_by_application(self, application_id: str) -> List[NextBestActionModel]:
        return self.list(
            filters={"applicationId": application_id}, order_by="priority"
        )

    def list_for_persona(
        self, application_id: str, persona: str
    ) -> List[NextBestActionModel]:
        return self.list(
            filters={"applicationId": application_id, "targetPersona": persona},
            order_by="priority",
        )


# =============================================================================
# 9. audit_logs — APPEND-ONLY
# =============================================================================


class AuditLogRepository(BaseRepository[AuditLogModel]):
    """
    Append-only audit ledger.  Only `append` and read operations are permitted.
    Attempting `update` or `delete` raises PermissionError.
    """

    COLLECTION = "audit_logs"
    MODEL = AuditLogModel

    def _doc_id(self, data: Dict[str, Any]) -> str:
        return data["auditId"]

    # Block mutations
    def _guard_update(self) -> None:
        raise PermissionError(
            "audit_logs is append-only. update() is forbidden on this collection."
        )

    def _guard_delete(self) -> None:
        raise PermissionError(
            "audit_logs is append-only. delete() is forbidden on this collection."
        )

    def append(self, event: AuditLogModel) -> AuditLogModel:
        """
        Append a new audit event.  Always uses server-side timestamp.
        This is the ONLY write method on this repository.
        """
        data = self._to_dict(event)
        # Ensure timestamp is always server-generated, never overridable
        data["timestamp"] = now_utc_iso()
        doc_id = self._doc_id(data)
        self._client.set(self.COLLECTION, doc_id, data)
        return self._from_dict(data)

    def list_by_application(
        self,
        application_id: str,
        limit: Optional[int] = None,
        start_after: Optional[str] = None,
    ) -> List[AuditLogModel]:
        return self.list(
            filters={"applicationId": application_id},
            order_by="-timestamp",
            limit=limit,
            start_after=start_after,
        )

    def list_by_actor(self, actor_id: str) -> List[AuditLogModel]:
        return self.list(filters={"actorId": actor_id}, order_by="-timestamp")

    def list_by_action(
        self, action: str, application_id: Optional[str] = None
    ) -> List[AuditLogModel]:
        filters: Dict[str, Any] = {"action": action}
        if application_id:
            filters["applicationId"] = application_id
        return self.list(filters=filters, order_by="-timestamp")

    # Convenience factory
    @staticmethod
    def build_event(
        application_id: str,
        actor_id: str,
        actor_role: str,
        action: str,
        details: Optional[Dict[str, Any]] = None,
        old_state: Optional[str] = None,
        new_state: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> AuditLogModel:
        from backend.database.repositories.base import new_id

        return AuditLogModel(
            audit_id=new_id("aud_"),
            application_id=application_id,
            actor_id=actor_id,
            actor_role=actor_role,
            action=action,
            details=details or {},
            old_state=old_state,
            new_state=new_state,
            ip_address=ip_address,
        )


# =============================================================================
# 10. policy_documents
# =============================================================================


class PolicyDocumentRepository(BaseRepository[PolicyDocumentModel]):
    COLLECTION = "policy_documents"
    MODEL = PolicyDocumentModel

    def _doc_id(self, data: Dict[str, Any]) -> str:
        return data["policyId"]

    def list_by_category(self, category: str) -> List[PolicyDocumentModel]:
        return self.list(filters={"category": category})

    def get_active_version(
        self, title: str, version: str
    ) -> Optional[PolicyDocumentModel]:
        results = self.list(filters={"title": title, "version": version}, limit=1)
        return results[0] if results else None


# =============================================================================
# 11. policy_chunks
# =============================================================================


class PolicyChunkRepository(BaseRepository[PolicyChunkModel]):
    COLLECTION = "policy_chunks"
    MODEL = PolicyChunkModel

    def _doc_id(self, data: Dict[str, Any]) -> str:
        return data["chunkId"]

    def _guard_update(self) -> None:
        raise PermissionError("policy_chunks are immutable; re-create to update.")

    def _guard_delete(self) -> None:
        # Allow delete for policy refresh workflows
        pass

    def list_by_policy(self, policy_id: str) -> List[PolicyChunkModel]:
        return self.list(filters={"policyId": policy_id})

    def keyword_search(self, keyword: str) -> List[PolicyChunkModel]:
        """Simple in-memory keyword filter (use vector search in production)."""
        all_chunks = self.list()
        kw_lower = keyword.lower()
        return [
            c for c in all_chunks
            if kw_lower in c.text.lower()
            or any(kw_lower in k.lower() for k in c.relevanceKeywords)
        ]


# =============================================================================
# 12. financial_snapshots
# =============================================================================


class FinancialSnapshotRepository(BaseRepository[FinancialSnapshotModel]):
    COLLECTION = "financial_snapshots"
    MODEL = FinancialSnapshotModel

    def _doc_id(self, data: Dict[str, Any]) -> str:
        return data["snapshotId"]

    def _guard_update(self) -> None:
        raise PermissionError("financial_snapshots are immutable; create a new snapshot.")

    def _guard_delete(self) -> None:
        raise PermissionError("financial_snapshots cannot be deleted.")

    def list_by_application(self, application_id: str) -> List[FinancialSnapshotModel]:
        return self.list(
            filters={"applicationId": application_id}, order_by="-createdAt"
        )

    def latest(self, application_id: str) -> Optional[FinancialSnapshotModel]:
        results = self.list(
            filters={"applicationId": application_id},
            order_by="-createdAt",
            limit=1,
        )
        return results[0] if results else None


# =============================================================================
# 13. trust_graph_nodes
# =============================================================================


class TrustGraphNodeRepository(BaseRepository[TrustGraphNodeModel]):
    COLLECTION = "trust_graph_nodes"
    MODEL = TrustGraphNodeModel

    def _doc_id(self, data: Dict[str, Any]) -> str:
        return data["nodeId"]

    def list_by_application(self, application_id: str) -> List[TrustGraphNodeModel]:
        return self.list(filters={"applicationId": application_id})

    def list_by_type(
        self, application_id: str, node_type: str
    ) -> List[TrustGraphNodeModel]:
        return self.list(
            filters={"applicationId": application_id, "nodeType": node_type}
        )

    def update_trust_score(
        self, node_id: str, trust_score: int, risk_level: str
    ) -> bool:
        return self.update(
            node_id, {"trustScore": trust_score, "riskLevel": risk_level}
        )


# =============================================================================
# 14. trust_graph_edges
# =============================================================================


class TrustGraphEdgeRepository(BaseRepository[TrustGraphEdgeModel]):
    COLLECTION = "trust_graph_edges"
    MODEL = TrustGraphEdgeModel

    def _doc_id(self, data: Dict[str, Any]) -> str:
        return data["edgeId"]

    def list_by_application(self, application_id: str) -> List[TrustGraphEdgeModel]:
        return self.list(filters={"applicationId": application_id})

    def list_flagged(self, application_id: str) -> List[TrustGraphEdgeModel]:
        return self.list(
            filters={"applicationId": application_id, "flagged": True}
        )

    def flag_edge(self, edge_id: str, reason: str) -> bool:
        return self.update(edge_id, {"flagged": True, "flagReason": reason})


# =============================================================================
# 15. fraud_signals
# =============================================================================


class FraudSignalRepository(BaseRepository[FraudSignalModel]):
    COLLECTION = "fraud_signals"
    MODEL = FraudSignalModel

    def _doc_id(self, data: Dict[str, Any]) -> str:
        return data["signalId"]

    def _guard_update(self) -> None:
        raise PermissionError("fraud_signals are immutable; append a new signal.")

    def _guard_delete(self) -> None:
        raise PermissionError("fraud_signals cannot be deleted.")

    def list_by_application(self, application_id: str) -> List[FraudSignalModel]:
        return self.list(
            filters={"applicationId": application_id}, order_by="-detectedAt"
        )

    def list_by_severity(
        self, application_id: str, severity: str
    ) -> List[FraudSignalModel]:
        return self.list(
            filters={"applicationId": application_id, "severity": severity}
        )

    def has_critical_signals(self, application_id: str) -> bool:
        return (
            self.count(filters={"applicationId": application_id, "severity": "CRITICAL"})
            > 0
        )


# =============================================================================
# 16. what_if_scenarios
# =============================================================================


class WhatIfScenarioRepository(BaseRepository[WhatIfScenarioModel]):
    COLLECTION = "what_if_scenarios"
    MODEL = WhatIfScenarioModel

    def _doc_id(self, data: Dict[str, Any]) -> str:
        return data["scenarioId"]

    def _guard_update(self) -> None:
        raise PermissionError("what_if_scenarios are immutable snapshots.")

    def _guard_delete(self) -> None:
        raise PermissionError("what_if_scenarios cannot be deleted.")

    def list_by_application(self, application_id: str) -> List[WhatIfScenarioModel]:
        return self.list(
            filters={"applicationId": application_id}, order_by="-createdAt"
        )


# =============================================================================
# 17. human_reviews
# =============================================================================


class HumanReviewRepository(BaseRepository[HumanReviewModel]):
    COLLECTION = "human_reviews"
    MODEL = HumanReviewModel

    def _doc_id(self, data: Dict[str, Any]) -> str:
        return data["reviewId"]

    def _guard_update(self) -> None:
        raise PermissionError("human_reviews are immutable once submitted.")

    def _guard_delete(self) -> None:
        raise PermissionError("human_reviews cannot be deleted.")

    def list_by_application(self, application_id: str) -> List[HumanReviewModel]:
        return self.list(
            filters={"applicationId": application_id}, order_by="-timestamp"
        )

    def list_by_decision(self, decision_id: str) -> List[HumanReviewModel]:
        return self.list(filters={"decisionId": decision_id})

    def list_by_officer(self, officer_id: str) -> List[HumanReviewModel]:
        return self.list(filters={"officerId": officer_id}, order_by="-timestamp")


# =============================================================================
# 18. feedback_events
# =============================================================================


class FeedbackEventRepository(BaseRepository[FeedbackEventModel]):
    COLLECTION = "feedback_events"
    MODEL = FeedbackEventModel

    def _doc_id(self, data: Dict[str, Any]) -> str:
        return data["feedbackId"]

    def _guard_update(self) -> None:
        raise PermissionError("feedback_events are immutable; record a new event.")

    def _guard_delete(self) -> None:
        raise PermissionError("feedback_events cannot be deleted.")

    def list_by_application(self, application_id: str) -> List[FeedbackEventModel]:
        return self.list(
            filters={"applicationId": application_id}, order_by="-recordedAt"
        )

    def list_by_outcome(self, outcome: str) -> List[FeedbackEventModel]:
        return self.list(filters={"performanceOutcome": outcome})


# =============================================================================
# 19. notifications
# =============================================================================


class NotificationRepository(BaseRepository[NotificationModel]):
    COLLECTION = "notifications"
    MODEL = NotificationModel

    def _doc_id(self, data: Dict[str, Any]) -> str:
        return data["notificationId"]

    def list_for_user(
        self,
        user_id: str,
        unread_only: bool = False,
        limit: Optional[int] = 50,
        start_after: Optional[str] = None,
    ) -> List[NotificationModel]:
        filters: Dict[str, Any] = {"userId": user_id}
        if unread_only:
            filters["read"] = False
        return self.list(
            filters=filters,
            order_by="-createdAt",
            limit=limit,
            start_after=start_after,
        )

    def list_for_role(
        self,
        role: str,
        unread_only: bool = False,
        limit: Optional[int] = 50,
    ) -> List[NotificationModel]:
        filters: Dict[str, Any] = {"role": role}
        if unread_only:
            filters["read"] = False
        return self.list(filters=filters, order_by="-createdAt", limit=limit)

    def mark_read(self, notification_id: str) -> bool:
        return self.update(notification_id, {"read": True})

    def mark_all_read(self, user_id: str) -> int:
        notifications = self.list_for_user(user_id, unread_only=True)
        count = 0
        for n in notifications:
            if self.update(n.notificationId, {"read": True}):
                count += 1
        return count

    def unread_count(self, user_id: str) -> int:
        return self.count(filters={"userId": user_id, "read": False})


# =============================================================================
# 20. system_events
# =============================================================================


class SystemEventRepository(BaseRepository[SystemEventModel]):
    COLLECTION = "system_events"
    MODEL = SystemEventModel

    def _doc_id(self, data: Dict[str, Any]) -> str:
        return data["eventId"]

    def _guard_update(self) -> None:
        raise PermissionError("system_events are append-only.")

    def _guard_delete(self) -> None:
        raise PermissionError("system_events cannot be deleted.")

    def list_by_type(
        self,
        event_type: str,
        limit: Optional[int] = None,
        start_after: Optional[str] = None,
    ) -> List[SystemEventModel]:
        return self.list(
            filters={"eventType": event_type},
            order_by="-timestamp",
            limit=limit,
            start_after=start_after,
        )

    def list_by_component(self, source_component: str) -> List[SystemEventModel]:
        return self.list(
            filters={"sourceComponent": source_component}, order_by="-timestamp"
        )
