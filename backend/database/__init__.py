"""
FinFlow AI — Database Package
==============================
Public re-exports for the persistence layer.
"""

from backend.database.firestore_client import firestore_client, db  # noqa: F401
from backend.database.repositories import (  # noqa: F401
    user_repo,
    application_repo,
    document_repo,
    evidence_repo,
    journey_step_repo,
    risk_repo,
    decision_repo,
    nba_repo,
    audit_repo,
    policy_doc_repo,
    policy_chunk_repo,
    financial_snapshot_repo,
    trust_node_repo,
    trust_edge_repo,
    fraud_signal_repo,
    whatif_repo,
    human_review_repo,
    feedback_repo,
    notification_repo,
    system_event_repo,
)
