"""
FinFlow AI — Repository Package
================================
Public API for the persistence layer.

Usage:
    from backend.database.repositories import (
        user_repo, application_repo, document_repo, evidence_repo,
        journey_step_repo, risk_repo, decision_repo, nba_repo,
        audit_repo, policy_doc_repo, policy_chunk_repo,
        financial_snapshot_repo, trust_node_repo, trust_edge_repo,
        fraud_signal_repo, whatif_repo, human_review_repo,
        feedback_repo, notification_repo, system_event_repo,
    )
"""

from backend.database.repositories.repositories import (
    AuditLogRepository,
    ApplicationRepository,
    DecisionRepository,
    DocumentRepository,
    EvidenceItemRepository,
    FeedbackEventRepository,
    FinancialSnapshotRepository,
    FraudSignalRepository,
    HumanReviewRepository,
    JourneyStepRepository,
    NextBestActionRepository,
    NotificationRepository,
    PolicyChunkRepository,
    PolicyDocumentRepository,
    RiskAssessmentRepository,
    SystemEventRepository,
    TrustGraphEdgeRepository,
    TrustGraphNodeRepository,
    TrustGraphRepository,
    UserRepository,
    WhatIfScenarioRepository,
)

# ---------------------------------------------------------------------------
# Singleton repository instances — import these in service modules and routers
# ---------------------------------------------------------------------------

user_repo = UserRepository()
application_repo = ApplicationRepository()
document_repo = DocumentRepository()
evidence_repo = EvidenceItemRepository()
journey_step_repo = JourneyStepRepository()
risk_repo = RiskAssessmentRepository()
decision_repo = DecisionRepository()
nba_repo = NextBestActionRepository()
audit_repo = AuditLogRepository()
policy_doc_repo = PolicyDocumentRepository()
policy_chunk_repo = PolicyChunkRepository()
financial_snapshot_repo = FinancialSnapshotRepository()
trust_node_repo = TrustGraphNodeRepository()
trust_edge_repo = TrustGraphEdgeRepository()
trust_graph_repo = TrustGraphRepository()
fraud_signal_repo = FraudSignalRepository()
whatif_repo = WhatIfScenarioRepository()
human_review_repo = HumanReviewRepository()
feedback_repo = FeedbackEventRepository()
notification_repo = NotificationRepository()
system_event_repo = SystemEventRepository()

__all__ = [
    # Repository classes
    "UserRepository",
    "ApplicationRepository",
    "DocumentRepository",
    "EvidenceItemRepository",
    "JourneyStepRepository",
    "RiskAssessmentRepository",
    "DecisionRepository",
    "NextBestActionRepository",
    "AuditLogRepository",
    "PolicyDocumentRepository",
    "PolicyChunkRepository",
    "FinancialSnapshotRepository",
    "TrustGraphNodeRepository",
    "TrustGraphEdgeRepository",
    "TrustGraphRepository",
    "FraudSignalRepository",
    "WhatIfScenarioRepository",
    "HumanReviewRepository",
    "FeedbackEventRepository",
    "NotificationRepository",
    "SystemEventRepository",
    # Singleton instances
    "user_repo",
    "application_repo",
    "document_repo",
    "evidence_repo",
    "journey_step_repo",
    "risk_repo",
    "decision_repo",
    "nba_repo",
    "audit_repo",
    "policy_doc_repo",
    "policy_chunk_repo",
    "financial_snapshot_repo",
    "trust_node_repo",
    "trust_edge_repo",
    "trust_graph_repo",
    "fraud_signal_repo",
    "whatif_repo",
    "human_review_repo",
    "feedback_repo",
    "notification_repo",
    "system_event_repo",
]
