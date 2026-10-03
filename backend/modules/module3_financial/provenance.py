import hashlib
from typing import Dict, Any, Optional
from datetime import datetime

class ProvenanceEngine:
    @staticmethod
    def compute_sha256(file_bytes: bytes) -> str:
        """Computes deterministic SHA-256 fingerprint for document immutability."""
        hasher = hashlib.sha256()
        hasher.update(file_bytes)
        return hasher.hexdigest()

    @staticmethod
    def build_field_provenance(
        field_name: str,
        value: Any,
        doc_id: str,
        app_id: str,
        source_hash: str,
        page_num: int = 1,
        bbox: Optional[Dict[str, float]] = None,
        confidence: float = 0.95
    ) -> Dict[str, Any]:
        """Creates an immutable provenance record for a single extracted field."""
        return {
            "evidence_id": f"evi_{hashlib.md5(f'{doc_id}_{field_name}'.encode()).hexdigest()[:10]}",
            "document_id": doc_id,
            "application_id": app_id,
            "field_name": field_name,
            "field_value": value,
            "confidence": confidence,
            "page_number": page_num,
            "bounding_box": bbox or {"x": 0.12, "y": 0.34, "width": 0.45, "height": 0.04},
            "sha256_source_hash": source_hash,
            "extraction_engine": "FinFlow-OCR-Structured-v2",
            "timestamp": datetime.utcnow().isoformat()
        }
