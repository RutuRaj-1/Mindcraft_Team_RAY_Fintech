"""
FinFlow AI — Document Storage Service
=====================================
Handles dual-mode file persistence:
1. Google Cloud / Firebase Storage bucket (when live credentials exist)
2. Local disk UPLOAD_DIR with static URL serving (DEMO_MODE fallback)

Computes SHA-256 cryptographic provenance for all ingested binaries.
"""

import os
import hashlib
import logging
from pathlib import Path
from typing import Tuple, Optional
from backend.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    @staticmethod
    def compute_sha256(content: bytes) -> str:
        return hashlib.sha256(content).hexdigest()

    @classmethod
    def save_document(
        cls,
        file_bytes: bytes,
        filename: str,
        doc_id: str,
        mime_type: str = "application/pdf"
    ) -> Tuple[str, str, str]:
        """
        Saves document binary to storage.
        Returns (storage_path, public_or_local_url, sha256_hash).
        """
        sha256 = cls.compute_sha256(file_bytes)
        safe_filename = filename.replace(" ", "_")
        storage_path = f"documents/{doc_id}/{safe_filename}"

        # Always persist to local uploads directory as guaranteed local access
        local_target = settings.UPLOAD_DIR / f"{doc_id}_{safe_filename}"
        try:
            with open(local_target, "wb") as f:
                f.write(file_bytes)
            local_url = f"/uploads/{doc_id}_{safe_filename}"
        except Exception as e:
            logger.error(f"Failed to write local backup upload: {e}")
            local_url = f"/uploads/{safe_filename}"

        # Attempt Firebase Storage upload if configured
        firebase_url: Optional[str] = None
        if not settings.DEMO_MODE and settings.FIREBASE_STORAGE_BUCKET:
            try:
                import firebase_admin
                from firebase_admin import storage
                bucket = storage.bucket(settings.FIREBASE_STORAGE_BUCKET)
                blob = bucket.blob(storage_path)
                blob.upload_from_string(file_bytes, content_type=mime_type)
                firebase_url = blob.public_url
                logger.info(f"Uploaded binary to Firebase Storage: {storage_path}")
            except Exception as e:
                logger.warning(f"Firebase Storage upload failed or not configured ({e}); using local endpoint.")

        final_url = firebase_url or local_url
        return storage_path, final_url, sha256
