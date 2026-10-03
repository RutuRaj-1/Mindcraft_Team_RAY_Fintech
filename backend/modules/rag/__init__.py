"""
FinFlow AI — Policy & Evidence RAG System
=========================================
Exports:
  - PolicyIngestionService
  - EmbeddingService, BaseEmbeddingProvider, LocalTFIDFEmbeddingProvider
  - Retriever, RetrievedPassage
  - RAGContextBuilder, RAGContext, GroundedCitation
"""

from backend.modules.rag.embedding_service import (
    BaseEmbeddingProvider,
    LocalTFIDFEmbeddingProvider,
    EmbeddingService,
)
from backend.modules.rag.retriever import (
    Retriever,
    RetrievedPassage,
)
from backend.modules.rag.policy_ingestion import (
    PolicyIngestionService,
)
from backend.modules.rag.rag_context_builder import (
    RAGContextBuilder,
    RAGContext,
    GroundedCitation,
)

__all__ = [
    "BaseEmbeddingProvider",
    "LocalTFIDFEmbeddingProvider",
    "EmbeddingService",
    "Retriever",
    "RetrievedPassage",
    "PolicyIngestionService",
    "RAGContextBuilder",
    "RAGContext",
    "GroundedCitation",
]
