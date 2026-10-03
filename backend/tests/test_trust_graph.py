"""
test_trust_graph.py — Comprehensive Test Suite for Financial Trust Graph
========================================================================
Validates Module 7 differentiator:
  1. Graph entity node synthesis (customer, business, application, GST, ITR,
     bank account, document, revenue, cash-flow metric, risk, decision)
  2. Edge relationships (CUSTOMER_OWNS_BUSINESS, BUSINESS_HAS_GST,
     BUSINESS_HAS_BANK_ACCOUNT, APPLICATION_USES_DOCUMENT, DOCUMENT_SUPPORTS_EVIDENCE,
     EVIDENCE_SUPPORTS_METRIC, METRIC_INFLUENCES_RISK, RISK_SUPPORTS_DECISION)
  3. Sequential Judge Traversal (Business → GST → Revenue → ITR → Bank → Cash Flow → Risk → Decision)
  4. System Detections:
     - Connected evidence tracking
     - Duplicate identity signals
     - Conflicting financial values (variance > 20%)
     - Circular trading & fund siphoning patterns
  5. Persistence in Firestore via TrustGraphRepository
  6. API endpoints (GET and POST rebuild)
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.modules.module7_trust_intelligence.trust_graph_service import TrustGraphService
from backend.database.repositories import trust_graph_repo
from backend.routers.demo_router import seed_demo_data

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_seed():
    seed_demo_data()


def test_trust_graph_entities_and_edges_clean_case():
    """Sharma Textiles (clean case) must generate all 11 required entity types."""
    graph = TrustGraphService.build_and_save_graph("app_priya_001")
    assert graph is not None
    assert graph.application_id == "app_priya_001"
    assert graph.circular_trading_detected is False
    assert graph.network_risk_score < 0.25

    # Check node types
    node_types = {n.node_type for n in graph.nodes}
    expected_types = {
        "customer",
        "business",
        "application",
        "GST",
        "ITR",
        "bank account",
        "document",
        "revenue",
        "cash-flow metric",
        "risk",
        "decision",
    }
    for etype in expected_types:
        assert etype in node_types, f"Missing required node type: {etype}"

    # Check edge relations
    edge_relations = {e.relation for e in graph.edges}
    expected_relations = {
        "CUSTOMER_OWNS_BUSINESS",
        "BUSINESS_HAS_GST",
        "BUSINESS_HAS_BANK_ACCOUNT",
        "APPLICATION_USES_DOCUMENT",
        "DOCUMENT_SUPPORTS_EVIDENCE",
        "EVIDENCE_SUPPORTS_METRIC",
        "METRIC_INFLUENCES_RISK",
        "RISK_SUPPORTS_DECISION",
    }
    for rel in expected_relations:
        assert rel in edge_relations, f"Missing required edge relation: {rel}"

    # Check Sequential Judge Traversal edges
    assert "GST_SUPPORTS_REVENUE" in edge_relations
    assert "ITR_CORROBORATES_REVENUE" in edge_relations
    assert "BANK_VALIDATES_CASHFLOW" in edge_relations


def test_trust_graph_detections_suspicious_case():
    """Apex Logistics (suspicious case) must trigger conflicting financials & circular trading."""
    graph = TrustGraphService.build_and_save_graph("app_apex_003")
    assert graph.circular_trading_detected is True
    assert graph.network_risk_score >= 0.50
    assert len(graph.cross_app_duplicate_signals) >= 1

    # Check for flagged edges
    flagged_edges = [e for e in graph.edges if e.flagged]
    assert len(flagged_edges) >= 2
    flag_relations = {e.relation for e in flagged_edges}
    assert "CIRCULAR_FUNDS_TRANSFER" in flag_relations or "GST_SUPPORTS_REVENUE" in flag_relations

    # Check anomalies list
    anomaly_types = {a.get("anomaly_type") for a in graph.anomalies}
    assert "CONFLICTING_FINANCIALS" in anomaly_types
    assert "CIRCULAR_TRADING" in anomaly_types


def test_trust_graph_repository_persistence():
    """Nodes and edges must be queryable via TrustGraphRepository."""
    app_id = "app_priya_001"
    graph = TrustGraphService.build_and_save_graph(app_id)

    # Repository retrieval
    cached_graph = trust_graph_repo.get_graph(app_id)
    assert cached_graph is not None
    assert cached_graph["application_id"] == app_id

    nodes = trust_graph_repo.list_nodes(app_id)
    assert len(nodes) >= 10

    edges = trust_graph_repo.list_edges(app_id)
    assert len(edges) >= 10


def test_trust_graph_api_endpoints():
    """GET and POST endpoints in financial_router must serve valid trust graph."""
    # GET
    res = client.get(
        "/api/v1/journeys/jrn_priya_001/trust-graph",
        headers={"Authorization": "Bearer demo-customer"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["application_id"] == "app_priya_001"
    assert len(data["nodes"]) >= 10
    assert len(data["edges"]) >= 10

    # POST Rebuild
    res_rebuild = client.post(
        "/api/v1/journeys/jrn_priya_001/trust-graph/rebuild",
        headers={"Authorization": "Bearer demo-customer"},
    )
    assert res_rebuild.status_code == 200
    assert res_rebuild.json()["graph_id"] == data["graph_id"]
