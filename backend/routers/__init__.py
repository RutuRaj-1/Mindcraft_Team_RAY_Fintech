"""
Routers Package — FinFlow AI
"""

from backend.routers import (
    auth_router,
    journeys_router,
    documents_router,
    financial_router,
    risk_decision_router,
    governance_router,
    demo_router,
    intent_router,
    policy_rag_router,
    fraud_network_router,
    reviews_router,
)

__all__ = [
    "auth_router",
    "journeys_router",
    "documents_router",
    "financial_router",
    "risk_decision_router",
    "governance_router",
    "demo_router",
    "intent_router",
    "policy_rag_router",
    "fraud_network_router",
    "reviews_router",
]
