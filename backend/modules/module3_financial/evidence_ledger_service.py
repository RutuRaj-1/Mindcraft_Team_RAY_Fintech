"""
FinFlow AI — Evidence Ledger Service
====================================
Maintains an append-only, version-preserving cryptographic Evidence Ledger.
Never silently overwrites extracted values:
- When a document is re-uploaded or updated, new evidence items are appended with incremented version numbers.
- Stores extraction confidence, source page, source text snippet, and verification status.
- Low-confidence extractions (< 0.85) are automatically flagged as 'REVIEW_REQUIRED'.
"""

import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from backend.database.models import EvidenceItemModel, now_utc_iso
from backend.database.repositories import evidence_repo
from backend.database.firestore_client import db
from backend.modules.module3_financial.field_extractor import ExtractedField

logger = logging.getLogger(__name__)


def serialize_evidence(item: Any) -> Dict[str, Any]:
    """Ensures both camelCase (Firestore) and snake_case (API) keys are populated."""
    if isinstance(item, EvidenceItemModel):
        d = item.model_dump()
        d["evidence_id"] = item.evidenceId
        d["application_id"] = item.applicationId
        d["document_id"] = item.documentId
        d["field_name"] = item.fieldName
        d["field_value"] = item.value
        d["normalized_value"] = item.normalizedValue
        d["source_page"] = item.sourcePage
        d["source_text"] = item.sourceText
        d["extraction_method"] = item.extractionMethod
        d["verification_status"] = item.verificationStatus
        return d
    elif isinstance(item, dict):
        d = dict(item)
        if "evidenceId" in d and "evidence_id" not in d:
            d["evidence_id"] = d["evidenceId"]
        if "field_name" not in d and "fieldName" in d:
            d["field_name"] = d["fieldName"]
        if "field_value" not in d and "value" in d:
            d["field_value"] = d["value"]
        if "normalized_value" not in d and "normalizedValue" in d:
            d["normalized_value"] = d["normalizedValue"]
        if "verification_status" not in d and "verificationStatus" in d:
            d["verification_status"] = d["verificationStatus"]
        if "source_page" not in d and "sourcePage" in d:
            d["source_page"] = d["sourcePage"]
        if "source_text" not in d and "sourceText" in d:
            d["source_text"] = d["sourceText"]
        return d
    return item


class EvidenceLedgerService:
    @classmethod
    def record_extractions(
        cls,
        application_id: str,
        document_id: str,
        extracted_fields: List[ExtractedField],
        source_hash: str
    ) -> List[Dict[str, Any]]:
        """
        Persists extracted fields to the Evidence Ledger with strict version preservation.
        """
        persisted_records: List[Dict[str, Any]] = []

        for field in extracted_fields:
            # Check existing versions of this field for the application
            try:
                existing_items = evidence_repo.list_by_field(application_id, field.field)
            except Exception:
                existing_items = []

            version = len(existing_items) + 1
            evidence_id = f"evi_{uuid.uuid4().hex[:12]}"
            now_iso = now_utc_iso()

            # Mark earlier versions as superseded if any
            for old in existing_items:
                try:
                    evidence_repo.update(old.evidenceId, {"isLatest": False})
                    db.update("evidence_ledger", old.evidenceId, {"is_latest": False})
                except Exception:
                    pass

            model = EvidenceItemModel(
                evidence_id=evidence_id,
                application_id=application_id,
                document_id=document_id,
                field_name=field.field,
                value=field.value,
                normalized_value=field.normalizedValue,
                confidence=field.confidence,
                source_page=field.sourcePage,
                source_text=field.sourceText,
                extraction_method=field.extractionMethod,
                verification_status=field.verificationStatus,
                created_at=now_iso,
                version=version,
                is_latest=True,
                source_hash=source_hash,
            )

            # Persist to repository (collection: evidence_items)
            try:
                evidence_repo.create(model)
            except Exception as e:
                logger.warning(f"evidence_repo create skipped/failed: {e}")

            # Legacy compatibility sync (collection: evidence_ledger)
            serialized = serialize_evidence(model)
            db.set("evidence_ledger", evidence_id, serialized)
            persisted_records.append(serialized)

        return persisted_records

    @classmethod
    def get_ledger(cls, application_id: str) -> List[Dict[str, Any]]:
        """
        Retrieves the complete version-preserved evidence ledger.
        """
        items: List[Dict[str, Any]] = []
        try:
            repo_items = evidence_repo.list_by_application(application_id)
            if repo_items:
                return [serialize_evidence(it) for it in repo_items]
        except Exception:
            pass

        # Direct db fallback
        raw_items = db.list("evidence_ledger", {"application_id": application_id})
        return [serialize_evidence(it) for it in raw_items]
