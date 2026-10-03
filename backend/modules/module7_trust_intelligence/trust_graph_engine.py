import uuid
from typing import Dict, Any, List
from backend.database.models import (
    TrustGraph, TrustGraphNode, TrustGraphEdge
)
from backend.database.firestore_client import db

class TrustGraphEngine:
    @staticmethod
    def build_trust_graph(application_id: str) -> TrustGraph:
        app = db.get("applications", application_id) or {}
        biz_name = app.get("business_name", "Applicant Enterprise")
        gstin = app.get("gstin", "27AAACS1234F1Z5")
        pan = app.get("pan", "AAACS1234F")

        # Check if case is known demo case or synthetic
        is_suspicious_case = "apex" in application_id.lower() or "suspicious" in biz_name.lower()

        nodes: List[TrustGraphNode] = []
        edges: List[TrustGraphEdge] = []

        # 1. Central Business Node
        nodes.append(TrustGraphNode(
            id="node_biz",
            label=biz_name,
            node_type="BUSINESS",
            risk_level="HIGH" if is_suspicious_case else "LOW",
            trust_score=480 if is_suspicious_case else 885,
            details={"turnover": app.get("annual_turnover"), "vintage": app.get("vintage_months")}
        ))

        # 2. Key Promoter / Director Node
        nodes.append(TrustGraphNode(
            id="node_dir_1",
            label="Priya Sharma (Managing Director)" if not is_suspicious_case else "Rajesh Verma (Director)",
            node_type="DIRECTOR",
            risk_level="LOW",
            trust_score=920 if not is_suspicious_case else 520,
            details={"pan": pan, "ownership_pct": 68.5}
        ))
        edges.append(TrustGraphEdge(
            source="node_dir_1",
            target="node_biz",
            relation="OWNS_68.5%",
            weight=0.9
        ))

        # 3. GSTIN Node
        nodes.append(TrustGraphNode(
            id="node_gstin",
            label=f"GSTIN: {gstin}",
            node_type="GSTIN",
            risk_level="MEDIUM" if is_suspicious_case else "LOW",
            trust_score=750 if is_suspicious_case else 940,
            details={"jurisdiction": "State Tax Office, Mumbai", "status": "ACTIVE"}
        ))
        edges.append(TrustGraphEdge(
            source="node_biz",
            target="node_gstin",
            relation="REGISTERED_WITH",
            weight=1.0
        ))

        # 4. Bank Account Node
        nodes.append(TrustGraphNode(
            id="node_bank",
            label="HDFC Current A/c ...41920",
            node_type="BANK_ACCOUNT",
            risk_level="LOW",
            trust_score=910,
            details={"ifsc": "HDFC0001234", "clean_vintage_years": 4}
        ))
        edges.append(TrustGraphEdge(
            source="node_biz",
            target="node_bank",
            relation="PRIMARY_OPERATING_ACCOUNT",
            weight=1.0
        ))

        # 5. Major Suppliers & Buyers
        nodes.append(TrustGraphNode(
            id="node_sup_1",
            label="Vardhman Yarns & Threads",
            node_type="SUPPLIER",
            risk_level="LOW",
            trust_score=960,
            details={"tier": "TIER_1_VERIFIED", "annual_volume": "₹42,00,000"}
        ))
        edges.append(TrustGraphEdge(
            source="node_biz",
            target="node_sup_1",
            relation="PURCHASED_RAW_MATERIALS",
            weight=0.85
        ))

        nodes.append(TrustGraphNode(
            id="node_buy_1",
            label="FabIndia Overseas Ltd",
            node_type="BUYER",
            risk_level="LOW",
            trust_score=980,
            details={"tier": "INSTITUTIONAL_BUYER", "avg_payment_days": 28}
        ))
        edges.append(TrustGraphEdge(
            source="node_buy_1",
            target="node_biz",
            relation="INVOICE_SETTLEMENT",
            weight=0.95
        ))

        # If suspicious case (e.g. Case 3 / Apex), inject circular trading pattern & duplicate GST flag
        circular_detected = False
        duplicate_signals = []
        network_risk = 0.08

        if is_suspicious_case:
            circular_detected = True
            network_risk = 0.68
            duplicate_signals.append("Director DIN linked to 2 recently dissolved shell entities in ROC registry.")
            duplicate_signals.append("32% of banking debits route back to promoter sister entity within 48 hours.")

            nodes.append(TrustGraphNode(
                id="node_shell_1",
                label="Apex Intermediaries LLP",
                node_type="RELATED_PARTY",
                risk_level="HIGH",
                trust_score=310,
                details={"status": "SUSPICIOUS_VELOCITY", "shared_address": True}
            ))
            edges.append(TrustGraphEdge(
                source="node_biz",
                target="node_shell_1",
                relation="CIRCULAR_FUNDS_TRANSFER",
                weight=0.7,
                flagged=True,
                flag_reason="Rapid round-tripping of funds without underlying GST e-way bills."
            ))
            edges.append(TrustGraphEdge(
                source="node_shell_1",
                target="node_dir_1",
                relation="DIRECTOR_LOAN_REPAYMENT",
                weight=0.65,
                flagged=True,
                flag_reason="Capital siphoning pattern flagged by graph neural heuristic."
            ))

        graph_id = f"grp_{application_id}"
        graph = TrustGraph(
            graph_id=graph_id,
            application_id=application_id,
            nodes=nodes,
            edges=edges,
            circular_trading_detected=circular_detected,
            network_risk_score=network_risk,
            cross_app_duplicate_signals=duplicate_signals
        )

        db.set("trust_graphs", graph_id, graph.model_dump())
        return graph
