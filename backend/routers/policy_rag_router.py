"""
Policy & RAG API Router — FinFlow AI
====================================
Exposes endpoints for policy ingestion, hybrid semantic/keyword search,
and RAG-grounded decision explanations.

Endpoints:
  POST /api/v1/admin/policies/ingest   — Ingest structured policy document & chunks
  GET  /api/v1/policies/search         — Hybrid search over underwriting policy corpus
  POST /api/v1/journeys/{id}/rag/explain — Generate policy-grounded decision explanation
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from backend.auth.firebase_auth import get_current_user, AuthenticatedUser, require_role
from backend.database.models import now_utc_iso
from backend.database.firestore_client import db
from backend.modules.rag import (
    PolicyIngestionService,
    Retriever,
    RAGContextBuilder,
    RetrievedPassage,
)

router = APIRouter(prefix="/api/v1", tags=["Policy & Evidence RAG"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class PolicyChunkInput(BaseModel):
    chunk_id: Optional[str] = None
    section: str
    policy_reference: str
    text: str
    effective_date: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    relevance_keywords: List[str] = Field(default_factory=list)


class PolicyIngestRequest(BaseModel):
    document_id: Optional[str] = None
    title: str
    category: str = "CREDIT_RISK"
    version: str = "2026.1"
    effective_date: Optional[str] = None
    content: Optional[str] = None
    chunks: Optional[List[PolicyChunkInput]] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class PolicyIngestResponse(BaseModel):
    status: str
    document_id: str
    title: str
    version: str
    effective_date: str
    chunks_count: int
    message: str


class PolicySearchResult(BaseModel):
    chunk_id: str
    document_id: str
    section: str
    policy_reference: str
    text: str
    effective_date: str
    score: float
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RAGExplanationResponse(BaseModel):
    application_id: str
    decision_state: str
    grounded_explanation: str
    policy_citations: List[Dict[str, Any]]
    evidence_provenance: List[Dict[str, Any]]
    risk_metrics: Dict[str, Any]
    retrieval_query: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/admin/policies/ingest", response_model=PolicyIngestResponse)
def ingest_policy(
    payload: PolicyIngestRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Ingest a structured policy document into Firestore and index for RAG.
    Admin or Credit Officer role authorized.
    """
    chunks_raw = [c.model_dump() for c in payload.chunks] if payload.chunks else None

    doc_model, created_chunks = PolicyIngestionService.ingest_policy_document(
        doc_data={
            "document_id": payload.document_id,
            "title": payload.title,
            "category": payload.category,
            "version": payload.version,
            "effective_date": payload.effective_date or now_utc_iso(),
            "content": payload.content or "",
            "metadata": payload.metadata,
        },
        chunks_data=chunks_raw,
    )

    return PolicyIngestResponse(
        status="INGESTED",
        document_id=doc_model.documentId or doc_model.policyId or "DOC-INGESTED",
        title=doc_model.title,
        version=doc_model.version,
        effective_date=doc_model.effectiveDate,
        chunks_count=len(created_chunks),
        message=f"Successfully ingested {len(created_chunks)} policy chunks with embeddings.",
    )


@router.get("/policies/search", response_model=List[PolicySearchResult])
def search_policies(
    q: str = Query(..., description="Query terms, keywords, or rule failure strings"),
    category: Optional[str] = Query(None, description="Optional category filter (e.g. CREDIT_RISK)"),
    limit: int = Query(4, ge=1, le=20, description="Max passages to return"),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Hybrid semantic & keyword search across ingested institutional policy corpus.
    """
    # Ensure default master policies exist
    PolicyIngestionService.seed_default_policies()

    passages: List[RetrievedPassage] = Retriever.retrieve(
        query=q,
        top_k=limit,
        category=category,
    )

    return [
        PolicySearchResult(
            chunk_id=p.chunk_id,
            document_id=p.document_id,
            section=p.section,
            policy_reference=p.policy_reference,
            text=p.text,
            effective_date=p.effective_date,
            score=p.score,
            metadata=p.metadata,
        )
        for p in passages
    ]


@router.post("/journeys/{journey_id}/rag/explain", response_model=RAGExplanationResponse)
def explain_decision_rag(
    journey_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Generates a policy-grounded decision explanation for a journey,
    strictly combining policy passages, evidence ledger items,
    feature calculations, and decision rules.
    """
    # Resolve application_id
    journey = db.get("journeys", journey_id)
    app_id = journey.get("application_id", journey_id) if journey else journey_id

    # Seed master policies if needed
    PolicyIngestionService.seed_default_policies()

    rag_ctx = RAGContextBuilder.build_rag_context(application_id=app_id)

    return RAGExplanationResponse(
        application_id=rag_ctx.application_id,
        decision_state=rag_ctx.decision_state,
        grounded_explanation=rag_ctx.grounded_explanation,
        policy_citations=[c.to_dict() for c in rag_ctx.policy_citations],
        evidence_provenance=rag_ctx.evidence_provenance,
        risk_metrics=rag_ctx.risk_metrics,
        retrieval_query=rag_ctx.retrieval_query,
    )
