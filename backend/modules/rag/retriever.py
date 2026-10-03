"""
Retriever — Module 4/7 Policy & Evidence RAG System
===================================================
Maintains an in-process, rebuildable retrieval index over policy chunks.
Executes hybrid search (vector cosine similarity + keyword relevance)
with metadata filtering (category, policyReference, effectiveDate).
"""

from __future__ import annotations
import logging
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from backend.database.models import PolicyChunkModel
from backend.database.repositories import policy_chunk_repo
from backend.modules.rag.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


@dataclass
class RetrievedPassage:
    """Represents a policy passage retrieved by the RAG system."""
    chunk_id: str
    document_id: str
    section: str
    policy_reference: str
    text: str
    effective_date: str
    score: float
    metadata: Dict[str, Any] = field(default_factory=dict)

    def citation_str(self) -> str:
        """Formatted traceable citation string."""
        return f"[{self.policy_reference}] {self.section} (Effective: {self.effective_date[:10]})"


class Retriever:
    """
    In-process retrieval index for policy chunks stored in Firestore.
    Automatically rebuilds or syncs from PolicyChunkRepository.
    """

    _indexed_chunks: List[PolicyChunkModel] = []
    _indexed_embeddings: List[List[float]] = []
    _is_initialized: bool = False

    @classmethod
    def rebuild_index(cls) -> int:
        """
        Loads all policy chunks from Firestore, computes missing embeddings,
        and constructs the in-memory retrieval index.
        """
        chunks = policy_chunk_repo.list()
        new_indexed_chunks: List[PolicyChunkModel] = []
        new_indexed_embeddings: List[List[float]] = []

        for chk in chunks:
            emb = chk.embedding
            if not emb or len(emb) == 0:
                # Generate embedding if missing
                full_text = f"{chk.policyReference} {chk.section}: {chk.text}"
                emb = EmbeddingService.embed_text(full_text)
                try:
                    policy_chunk_repo.update(chk.chunkId, {"embedding": emb})
                except Exception:
                    pass  # Immutable guard may reject; in-memory copy will hold it
            new_indexed_chunks.append(chk)
            new_indexed_embeddings.append(emb)

        cls._indexed_chunks = new_indexed_chunks
        cls._indexed_embeddings = new_indexed_embeddings
        cls._is_initialized = True

        logger.info("RAG Retriever index rebuilt: %d policy chunks indexed.", len(cls._indexed_chunks))
        return len(cls._indexed_chunks)

    @classmethod
    def ensure_index(cls) -> None:
        """Ensure the index is populated; triggers rebuild if empty."""
        if not cls._is_initialized or len(cls._indexed_chunks) == 0:
            cls.rebuild_index()

    @classmethod
    def retrieve(
        cls,
        query: str,
        top_k: int = 3,
        category: Optional[str] = None,
        threshold: float = 0.12,
    ) -> List[RetrievedPassage]:
        """
        Executes hybrid retrieval over indexed policy chunks.

        Args:
            query: Query text (keywords, rule failure strings, financial facts).
            top_k: Max passages to return.
            category: Optional category filter (e.g. "CREDIT_RISK", "KYC").
            threshold: Minimum relevance score to include.

        Returns:
            List of top matching RetrievedPassage objects sorted by score descending.
        """
        cls.ensure_index()

        if not cls._indexed_chunks:
            return []

        # 1. Vector similarity
        query_emb = EmbeddingService.embed_text(query)
        q_tokens = set(re.findall(r"\w+", query.lower()))

        scored_passages: List[RetrievedPassage] = []

        for chk, emb in zip(cls._indexed_chunks, cls._indexed_embeddings):
            # Optional category filter
            chk_cat = chk.metadata.get("category") or chk.metadata.get("policyCategory")
            if category and chk_cat and chk_cat.upper() != category.upper():
                continue

            # (a) Cosine similarity
            cosine_score = EmbeddingService.cosine_similarity(query_emb, emb)

            # (b) Keyword / Token overlap bonus
            chk_text_lower = f"{chk.policyReference} {chk.section} {chk.text}".lower()
            overlap_count = sum(1 for t in q_tokens if len(t) > 2 and t in chk_text_lower)
            keyword_score = min(1.0, overlap_count / max(1, len(q_tokens)))

            # (c) Hybrid fusion score (60% vector + 40% exact keyword overlap)
            hybrid_score = round(0.60 * cosine_score + 0.40 * keyword_score, 4)

            if hybrid_score >= threshold:
                doc_id = chk.documentId or chk.policyId or "DOC-POLICY"
                policy_ref = chk.policyReference or chk.clauseId or "POL-SME"
                eff_date = chk.effectiveDate or chk.createdAt or "2026-01-01"

                scored_passages.append(RetrievedPassage(
                    chunk_id=chk.chunkId,
                    document_id=doc_id,
                    section=chk.section or "General",
                    policy_reference=policy_ref,
                    text=chk.text,
                    effective_date=eff_date,
                    score=hybrid_score,
                    metadata=chk.metadata or {},
                ))

        # Sort descending by hybrid score
        scored_passages.sort(key=lambda p: p.score, reverse=True)
        return scored_passages[:top_k]
