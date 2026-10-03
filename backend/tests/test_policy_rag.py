"""
test_policy_rag.py — Comprehensive Test Suite for FinFlow AI RAG System
========================================================================
Validates:
  1. PolicyIngestionService: Document and chunk ingestion, chunk model schema
     (chunkId, documentId, section, text, policyReference, effectiveDate, metadata)
  2. EmbeddingService: Abstraction, unit-vector normalization, cosine similarity
  3. Retriever: Index maintenance, hybrid retrieval, traceable passages
  4. RAGContextBuilder: Fact-grounded query generation, evidence synthesis,
     policy citations, zero generic boilerplate
  5. API Endpoints:
     - POST /api/v1/admin/policies/ingest
     - GET  /api/v1/policies/search
     - POST /api/v1/journeys/{id}/rag/explain
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.modules.rag import (
    PolicyIngestionService,
    EmbeddingService,
    Retriever,
    RAGContextBuilder,
)
from backend.database.repositories import policy_doc_repo, policy_chunk_repo
from backend.routers.demo_router import seed_demo_data

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_rag():
    seed_demo_data()
    PolicyIngestionService.seed_default_policies()


def test_embedding_service_properties():
    """EmbeddingService must generate normalized vectors with valid cosine similarity."""
    dim = EmbeddingService.get_provider().dimension
    assert dim == 256

    vec1 = EmbeddingService.embed_text("Debt Service Coverage Ratio DSCR cashflow")
    assert len(vec1) == dim

    vec2 = EmbeddingService.embed_text("Operating cash flow coverage for term loan debt service")
    assert len(vec2) == dim

    sim_same = EmbeddingService.cosine_similarity(vec1, vec1)
    assert abs(sim_same - 1.0) < 1e-4

    sim_diff = EmbeddingService.cosine_similarity(vec1, vec2)
    assert 0.0 <= sim_diff <= 1.0
    assert sim_diff > 0.5  # Semantic overlap on debt service / cashflow


def test_policy_ingestion_and_chunk_fields():
    """Ingested policy chunks must contain all 7 mandatory fields."""
    doc_payload = {
        "document_id": "doc_test_collateral_v1",
        "title": "Collateral & Guarantee Policy 2026",
        "category": "COLLATERAL_NORMS",
        "version": "2026.2",
        "effective_date": "2026-03-01T00:00:00Z",
    }
    chunks_payload = [
        {
            "chunk_id": "chk_test_col_1",
            "section": "Clause 1.1: Personal Guarantee Requirements",
            "policy_reference": "POL-COL-1.1",
            "text": "All facilities exceeding ₹25,00,000 mandate unconditional promoter personal guarantee.",
            "effective_date": "2026-03-01T00:00:00Z",
            "metadata": {"min_facility": 2500000.0, "enforceability": "Mandatory"},
            "relevance_keywords": ["guarantee", "promoter", "security"],
        }
    ]

    doc_model, chunks = PolicyIngestionService.ingest_policy_document(doc_payload, chunks_payload)
    assert doc_model.documentId == "doc_test_collateral_v1"
    assert len(chunks) == 1

    chunk = chunks[0]
    # Verify all required fields
    assert chunk.chunkId == "chk_test_col_1"
    assert chunk.documentId == "doc_test_collateral_v1"
    assert chunk.section == "Clause 1.1: Personal Guarantee Requirements"
    assert chunk.text == chunks_payload[0]["text"]
    assert chunk.policyReference == "POL-COL-1.1"
    assert chunk.effectiveDate == "2026-03-01T00:00:00Z"
    assert chunk.metadata["min_facility"] == 2500000.0
    assert chunk.embedding is not None
    assert len(chunk.embedding) == 256


def test_retriever_hybrid_search():
    """Retriever must return top-matching traceable policy passages for specific underwriting queries."""
    # Query 1: DSCR
    passages_dscr = Retriever.retrieve("DSCR debt service coverage ratio cashflow", top_k=3)
    assert len(passages_dscr) > 0
    top_ref = passages_dscr[0].policy_reference
    assert "POL-SME-5.2" in top_ref or "POL-SME" in top_ref
    assert passages_dscr[0].score > 0.3
    assert passages_dscr[0].effective_date is not None

    # Query 2: Cheque bounces
    passages_bounces = Retriever.retrieve("cheque bounces returns inward ECS banking discipline", top_k=3)
    assert len(passages_bounces) > 0
    bounce_refs = [p.policy_reference for p in passages_bounces]
    assert any("POL-SME-6.3" in r for r in bounce_refs)

    # Query 3: Operational vintage
    passages_vintage = Retriever.retrieve("operational vintage minimum 24 months active commercial operations", top_k=3)
    assert len(passages_vintage) > 0
    vintage_refs = [p.policy_reference for p in passages_vintage]
    assert any("POL-SME-4.1" in r for r in vintage_refs)


def test_rag_context_builder_grounded_explanation():
    """RAGContextBuilder must generate context citing retrieved references without generic boilerplate."""
    app_id = "app_priya_001"
    facts = {
        "business_name": "Sharma Textiles",
        "annual_turnover": 14500000.0,
        "vintage_months": 48.0,
        "requested_amount": 2500000.0,
        "product_type": "Working Capital Term Loan",
    }
    risk = {
        "risk_band": "LOW_RISK",
        "probability_of_default": 0.08,
        "trust_score": 910,
        "hard_rules_passed": True,
    }

    rag_ctx = RAGContextBuilder.build_rag_context(
        application_id=app_id,
        application_facts=facts,
        risk_outcome=risk,
        decision_state="APPROVED",
    )

    assert rag_ctx.application_id == app_id
    assert rag_ctx.decision_state == "APPROVED"
    assert len(rag_ctx.policy_citations) >= 1

    # Explanation must be grounded
    exp = rag_ctx.grounded_explanation
    assert "Sharma Textiles" in exp
    assert "₹25.0 Lakhs" in exp
    assert "[POL-" in exp  # Must cite policy clauses
    assert "Trust Score" in exp


def test_rag_context_builder_rejection_case():
    """Declined application must cite specific breached policy constraints."""
    app_id = "app_rejected_test"
    facts = {
        "business_name": "Quick Cash Enterprises",
        "annual_turnover": 1000000.0,
        "vintage_months": 12.0,
        "requested_amount": 500000.0,
    }
    risk = {
        "risk_band": "HIGH_RISK",
        "probability_of_default": 0.85,
        "trust_score": 320,
        "hard_rules_passed": False,
    }
    failures = [
        "Operational Vintage: 12 months below minimum 24 months",
        "Annual Turnover: ₹10 Lakhs below minimum ₹25 Lakhs threshold",
    ]

    rag_ctx = RAGContextBuilder.build_rag_context(
        application_id=app_id,
        application_facts=facts,
        risk_outcome=risk,
        rule_failures=failures,
        decision_state="REJECTED",
    )

    assert rag_ctx.decision_state == "REJECTED"
    exp = rag_ctx.grounded_explanation
    assert "Ineligible / Declined" in exp
    assert "Operational Vintage" in exp
    assert "[POL-" in exp


def test_api_policy_endpoints():
    """Verify POST /api/v1/admin/policies/ingest, GET /api/v1/policies/search, POST /rag/explain."""
    # 1. Ingest via API
    ingest_payload = {
        "document_id": "doc_api_ingest_test",
        "title": "API Ingested Credit Norms",
        "category": "CREDIT_RISK",
        "version": "2026.3",
        "chunks": [
            {
                "section": "Section 9.1: Minimum DSCR",
                "policy_reference": "POL-API-9.1",
                "text": "Debt service coverage ratio shall never fall below 1.20x.",
                "relevance_keywords": ["dscr", "coverage"],
            }
        ]
    }
    res_ingest = client.post(
        "/api/v1/admin/policies/ingest",
        json=ingest_payload,
        headers={"Authorization": "Bearer demo-rm"},
    )
    assert res_ingest.status_code == 200
    assert res_ingest.json()["status"] == "INGESTED"
    assert res_ingest.json()["chunks_count"] == 1

    # 2. Search via API
    res_search = client.get(
        "/api/v1/policies/search?q=DSCR+coverage&limit=3",
        headers={"Authorization": "Bearer demo-customer"},
    )
    assert res_search.status_code == 200
    results = res_search.json()
    assert len(results) > 0
    assert any("DSCR" in r["text"] or "coverage" in r["text"].lower() for r in results)

    # 3. RAG Explain via API
    res_explain = client.post(
        "/api/v1/journeys/jrn_priya_001/rag/explain",
        headers={"Authorization": "Bearer demo-customer"},
    )
    assert res_explain.status_code == 200
    explain_data = res_explain.json()
    assert explain_data["application_id"] == "app_priya_001"
    assert len(explain_data["policy_citations"]) > 0
    assert "[POL-" in explain_data["grounded_explanation"]
