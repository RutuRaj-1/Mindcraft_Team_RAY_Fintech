"""
PolicyIngestionService — Module 4/7 Policy & Evidence RAG System
================================================================
Handles parsing, chunking, embedding generation, and persistence of
structured institutional credit policy documents into Firestore.
"""

from __future__ import annotations
import logging
import re
import uuid
from typing import Any, Dict, List, Optional, Tuple

from backend.database.models import (
    PolicyDocumentModel,
    PolicyChunkModel,
    now_utc_iso,
)
from backend.database.repositories import (
    policy_doc_repo,
    policy_chunk_repo,
)
from backend.modules.rag.embedding_service import EmbeddingService
from backend.modules.rag.retriever import Retriever

logger = logging.getLogger(__name__)

# Canonical Master Credit Underwriting Policy for Indian MSME Lending
DEFAULT_MASTER_POLICIES = [
    {
        "document_id": "doc_pol_credit_v2026_1",
        "title": "Master MSME Credit Policy & Underwriting Norms",
        "category": "CREDIT_RISK",
        "version": "2026.1",
        "effective_date": "2026-01-01T00:00:00Z",
        "chunks": [
            {
                "section": "Section 4.1: Minimum Operational Vintage Requirement",
                "policy_reference": "POL-SME-4.1",
                "text": "All SME borrowers must establish at least 24 months of continuous, active commercial operations verified via GSTIN registration date and consecutive bank statement records. Unincorporated entities with vintage under 24 months are ineligible for unsecured credit.",
                "metadata": {"threshold": 24, "unit": "months", "rule_type": "HARD_FAIL", "tags": ["vintage", "eligibility", "operations"]},
            },
            {
                "section": "Section 4.2: Minimum Annual Sales Turnover Gate",
                "policy_reference": "POL-SME-4.2",
                "text": "Annual verified credit turnover must exceed ₹25,00,000 to qualify for unsecured working capital term financing. Turnover must be corroborated by GSTR-3B filings or annual bank statement inward credits.",
                "metadata": {"threshold": 2500000.0, "unit": "INR", "rule_type": "HARD_FAIL", "tags": ["turnover", "sales", "revenue"]},
            },
            {
                "section": "Section 5.2: Debt Service Coverage Ratio (DSCR) Norms",
                "policy_reference": "POL-SME-5.2",
                "text": "Operating cash flow must comfortably cover existing and proposed debt service. DSCR must be >= 1.25x for standard pricing and >= 1.10x with promoter personal guarantee. DSCR below 1.0x indicates structural repayment deficiency.",
                "metadata": {"threshold": 1.25, "unit": "x", "rule_type": "HARD_FAIL", "tags": ["dscr", "cashflow", "debt_service", "coverage"]},
            },
            {
                "section": "Section 6.3: Banking Discipline & Inward Cheque Returns",
                "policy_reference": "POL-SME-6.3",
                "text": "A maximum of 2 inward financial returns or ECS bounces are permissible in the preceding 6-month period. More than 2 inward returns indicates chronic cash-flow strain and triggers automatic policy disqualification.",
                "metadata": {"threshold": 2, "unit": "bounces", "rule_type": "HARD_FAIL", "tags": ["cheque_bounces", "ecs", "banking_discipline"]},
            },
            {
                "section": "Section 7.1: Cross-Document Discrepancy & Turnover Consistency",
                "policy_reference": "POL-SME-7.1",
                "text": "Variance greater than 15% between annual GST returns and banking credit inflows triggers mandatory underwriter review. Discrepancy exceeding 25% requires forensic bank statement verification and physical verification.",
                "metadata": {"threshold": 15.0, "unit": "pct", "rule_type": "REVIEW", "tags": ["consistency", "gst", "bank_variance", "fraud"]},
            },
            {
                "section": "Section 2.1: Identity Verification & Debarment Clearance",
                "policy_reference": "POL-KYC-2.1",
                "text": "At least one primary government-issued business identity document (PAN, Aadhaar of promoter, Udyam Registration, or active GSTIN) must be submitted and OCR-verified with high confidence (>= 60%). Debarred directors are disqualified.",
                "metadata": {"threshold": 0.60, "unit": "confidence", "rule_type": "HARD_FAIL", "tags": ["kyc", "identity", "pan", "gstin"]},
            },
            {
                "section": "Section 3.4: Maximum Credit Exposure to Turnover Ratio",
                "policy_reference": "POL-EXP-3.4",
                "text": "Maximum unsecured exposure for working capital term facilities shall not exceed 80% of verified annual sales turnover, subject to an absolute institutional cap of ₹1,00,00,000 without board-level credit committee approval.",
                "metadata": {"max_ratio": 0.80, "max_exposure": 10000000.0, "rule_type": "HARD_FAIL", "tags": ["exposure", "limit", "cap"]},
            },
            {
                "section": "Section 8.2: Security & Promoter Personal Guarantee Requirements",
                "policy_reference": "POL-COL-8.2",
                "text": "Unsecured facilities require joint and several personal guarantees from all majority promoter-directors holding over 20% equity. For facilities exceeding ₹50,00,000, hypothecation of current assets and quarterly stock statements are mandatory.",
                "metadata": {"min_equity_pct": 20.0, "rule_type": "COVENANT", "tags": ["guarantee", "promoter", "security", "covenants"]},
            },
        ],
    }
]


class PolicyIngestionService:
    """
    Service for ingesting, chunking, and embedding policy documents.
    """

    @classmethod
    def ingest_policy_document(
        cls,
        doc_data: Dict[str, Any],
        chunks_data: Optional[List[Dict[str, Any]]] = None,
    ) -> Tuple[PolicyDocumentModel, List[PolicyChunkModel]]:
        """
        Ingests a policy document and its constituent chunks into Firestore.
        Computes embeddings for each chunk and updates the Retriever index.
        """
        doc_id = (
            doc_data.get("documentId")
            or doc_data.get("document_id")
            or doc_data.get("policyId")
            or doc_data.get("policy_id")
            or f"pol_doc_{uuid.uuid4().hex[:8]}"
        )
        title = doc_data.get("title", "Institutional Lending Policy")
        category = doc_data.get("category", "CREDIT_RISK")
        version = doc_data.get("version", "2026.1")
        effective_date = doc_data.get("effectiveDate") or doc_data.get("effective_date") or now_utc_iso()
        content = doc_data.get("content", "")
        doc_metadata = doc_data.get("metadata", {})

        # 1. Build and save PolicyDocumentModel
        doc_model = PolicyDocumentModel(
            document_id=doc_id,
            policy_id=doc_id,
            title=title,
            category=category,
            version=version,
            effective_date=effective_date,
            content=content,
            metadata=doc_metadata,
        )
        policy_doc_repo.create(doc_model)

        # 2. Parse chunks if not explicitly supplied
        raw_chunks = chunks_data
        if not raw_chunks:
            raw_chunks = cls._auto_chunk_content(content, doc_id, effective_date, category)

        # 3. Create, embed, and persist each PolicyChunkModel
        created_chunks: List[PolicyChunkModel] = []
        for i, chk in enumerate(raw_chunks):
            chunk_id = (
                chk.get("chunkId")
                or chk.get("chunk_id")
                or f"chk_{doc_id}_{i+1}"
            )
            section = chk.get("section") or f"Section {i+1}"
            text = chk.get("text", "")
            policy_ref = (
                chk.get("policyReference")
                or chk.get("policy_reference")
                or chk.get("clauseId")
                or chk.get("clause_id")
                or f"POL-REF-{i+1}"
            )
            chk_eff_date = (
                chk.get("effectiveDate")
                or chk.get("effective_date")
                or effective_date
            )
            chk_meta = chk.get("metadata", {})
            chk_meta.setdefault("category", category)
            chk_meta.setdefault("document_title", title)
            chk_meta.setdefault("version", version)

            # Compute embedding
            full_embed_text = f"{policy_ref} {section}: {text}"
            embedding = EmbeddingService.embed_text(full_embed_text)

            chunk_model = PolicyChunkModel(
                chunk_id=chunk_id,
                document_id=doc_id,
                policy_id=doc_id,
                section=section,
                text=text,
                policy_reference=policy_ref,
                clause_id=policy_ref,
                effective_date=chk_eff_date,
                metadata=chk_meta,
                relevance_keywords=chk.get("relevance_keywords", []),
                embedding=embedding,
            )

            # Persist to Firestore
            try:
                policy_chunk_repo.create(chunk_model)
            except Exception as e:
                # If chunk exists, update non-immutable fields
                logger.debug("Chunk %s creation notice: %s", chunk_id, e)

            created_chunks.append(chunk_model)

        # 4. Rebuild in-memory retriever index
        Retriever.rebuild_index()

        logger.info(
            "Policy document ingested successfully: %s (%s, %d chunks)",
            title, doc_id, len(created_chunks),
        )
        return doc_model, created_chunks

    @classmethod
    def _auto_chunk_content(
        cls,
        content: str,
        doc_id: str,
        effective_date: str,
        category: str,
    ) -> List[Dict[str, Any]]:
        """Splits markdown or section-structured text into chunks."""
        sections = re.split(r"\n(?=#{1,3}\s|Section\s|Clause\s|§\s*)", content)
        chunks: List[Dict[str, Any]] = []

        for i, sec in enumerate(sections):
            sec_trimmed = sec.strip()
            if not sec_trimmed:
                continue

            lines = sec_trimmed.split("\n", 1)
            header = lines[0].replace("#", "").strip()
            body = lines[1].strip() if len(lines) > 1 else header

            # Extract clause ID if present (e.g. POL-SME-4.1)
            ref_match = re.search(r"(POL-[A-Z]+-[\d\.]+)", sec_trimmed)
            ref = ref_match.group(1) if ref_match else f"POL-SEC-{i+1}"

            chunks.append({
                "chunk_id": f"chk_{doc_id}_{i+1}",
                "section": header,
                "text": body,
                "policy_reference": ref,
                "effective_date": effective_date,
                "metadata": {"category": category},
            })

        return chunks

    @classmethod
    def seed_default_policies(cls) -> int:
        """
        Seeds standard institutional SME credit policies into Firestore
        if the policy collection is empty.
        """
        existing_chunks = policy_chunk_repo.list(limit=1)
        if existing_chunks:
            logger.info("Policy database already populated (%d existing chunks checked).", len(existing_chunks))
            Retriever.ensure_index()
            return len(existing_chunks)

        total_seeded = 0
        for doc_cfg in DEFAULT_MASTER_POLICIES:
            _, chunks = cls.ingest_policy_document(
                doc_data={
                    "document_id": doc_cfg["document_id"],
                    "title": doc_cfg["title"],
                    "category": doc_cfg["category"],
                    "version": doc_cfg["version"],
                    "effective_date": doc_cfg["effective_date"],
                },
                chunks_data=doc_cfg["chunks"],
            )
            total_seeded += len(chunks)

        logger.info("Default MSME credit underwriting policies seeded: %d chunks.", total_seeded)
        return total_seeded
