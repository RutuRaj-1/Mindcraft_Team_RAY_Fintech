"""
TrustGraphEngine — Backward-Compatible Facade for TrustGraphService
===================================================================
Delegates to TrustGraphService which handles full entity synthesis,
anomaly detection, and Firestore persistence.
"""

from backend.database.models import TrustGraph
from backend.modules.module7_trust_intelligence.trust_graph_service import TrustGraphService


class TrustGraphEngine:
    @staticmethod
    def build_trust_graph(application_id: str) -> TrustGraph:
        """
        Builds, persists, and returns the Financial Trust Graph for application_id.
        """
        return TrustGraphService.build_and_save_graph(application_id)
