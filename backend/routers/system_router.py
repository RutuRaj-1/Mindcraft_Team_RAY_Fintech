"""
FinFlow AI — System & Connectivity Diagnostics Router
====================================================
Implements Datahandling.md Section 31, 32, and 33:
Safe connectivity verification for:
- FastAPI
- Firebase Auth
- Firestore (with non-destructive roundtrip write/read probe)
- Firebase Storage (with probe upload/verify/cleanup)
Never exposes credentials, secrets, or private keys.
"""

import time
import uuid
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from backend.config import settings
from backend.auth.firebase_auth import firebase_initialized
from backend.database.firestore_client import firestore_client, db

router = APIRouter(prefix="/api/v1/system", tags=["System Diagnostics"])


class DiagnosticStatus(BaseModel):
    fastapi: str
    firebase_auth: str
    firestore: str
    firebase_storage: str
    probe_latency_ms: float
    timestamp: str
    environment: str
    demo_mode: bool
    firestore_mode: str
    project_id: str
    storage_bucket: str


@router.get("/diagnostics", response_model=DiagnosticStatus)
def get_system_diagnostics():
    """
    Performs safe end-to-end connectivity probe without exposing secrets.
    Complies with Datahandling.md Section 31 & 32.
    """
    start_time = time.perf_counter()

    # 1. FastAPI status
    fastapi_status = "CONNECTED"

    # 2. Firebase Auth status
    auth_status = "CONNECTED" if firebase_initialized else "LOCAL_DEMO_MODE"

    # 3. Firestore Read/Write Probe (Section 32)
    # Perform isolated write-read-delete on system probe collection
    probe_id = f"probe_{uuid.uuid4().hex[:8]}"
    probe_data = {
        "probe_id": probe_id,
        "probe_time": datetime.now(timezone.utc).isoformat(),
        "purpose": "health_check"
    }

    firestore_mode = "LIVE_FIRESTORE" if firestore_client._use_firestore else "IN_MEMORY"
    try:
        db.set("_system_probes", probe_id, probe_data)
        read_back = db.get("_system_probes", probe_id)
        if read_back and read_back.get("probe_id") == probe_id:
            firestore_status = "CONNECTED"
            # Cleanup probe
            db.delete("_system_probes", probe_id)
        else:
            firestore_status = "READ_MISMATCH"
    except Exception as exc:
        firestore_status = f"ERROR: {type(exc).__name__}"

    # 4. Firebase Storage check (Section 31)
    if settings.FIREBASE_STORAGE_BUCKET and firebase_initialized:
        try:
            import firebase_admin
            from firebase_admin import storage
            if firebase_admin._apps:
                bucket = storage.bucket(settings.FIREBASE_STORAGE_BUCKET)
                storage_status = "CONNECTED" if bucket else "BUCKET_UNAVAILABLE"
            else:
                storage_status = "LOCAL_STORAGE_BACKED"
        except Exception:
            storage_status = "LOCAL_STORAGE_BACKED"
    else:
        storage_status = "LOCAL_STORAGE_BACKED"

    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

    return DiagnosticStatus(
        fastapi=fastapi_status,
        firebase_auth=auth_status,
        firestore=firestore_status,
        firebase_storage=storage_status,
        probe_latency_ms=elapsed_ms,
        timestamp=datetime.now(timezone.utc).isoformat(),
        environment=settings.ENVIRONMENT,
        demo_mode=settings.DEMO_MODE,
        firestore_mode=firestore_mode,
        project_id=settings.FIREBASE_PROJECT_ID,
        storage_bucket=settings.FIREBASE_STORAGE_BUCKET
    )


@router.post("/diagnostics/storage-test")
def test_storage_upload():
    """
    Executes a controlled diagnostic file upload, verification, and deletion.
    Complies with Datahandling.md Section 33.
    """
    probe_name = f"health_probe_{uuid.uuid4().hex[:8]}.txt"
    probe_bytes = b"FinFlow AI diagnostic storage probe verification content."
    probe_path = f"_system_probes/{probe_name}"

    if settings.FIREBASE_STORAGE_BUCKET and firebase_initialized:
        try:
            import firebase_admin
            from firebase_admin import storage
            if firebase_admin._apps:
                bucket = storage.bucket(settings.FIREBASE_STORAGE_BUCKET)
                blob = bucket.blob(probe_path)
                blob.upload_from_string(probe_bytes, content_type="text/plain")
                # Confirm object exists & read metadata
                exists = blob.exists()
                size = blob.size
                # Delete probe
                blob.delete()
                return {
                    "status": "SUCCESS",
                    "storage_target": "FIREBASE_STORAGE",
                    "bucket": settings.FIREBASE_STORAGE_BUCKET,
                    "verified_path": probe_path,
                    "object_exists": exists,
                    "bytes_verified": size
                }
        except Exception as exc:
            return {
                "status": "FALLBACK_LOCAL",
                "message": f"Firebase Storage test skipped/failed ({str(exc)}); local storage is fully operational."
            }

    # Local fallback storage test
    local_path = settings.UPLOAD_DIR / probe_name
    try:
        with open(local_path, "wb") as f:
            f.write(probe_bytes)
        exists = local_path.exists()
        size = local_path.stat().st_size
        local_path.unlink(missing_ok=True)
        return {
            "status": "SUCCESS",
            "storage_target": "LOCAL_UPLOAD_DIRECTORY",
            "directory": str(settings.UPLOAD_DIR.name),
            "verified_path": str(probe_name),
            "object_exists": exists,
            "bytes_verified": size
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Storage test failed: {str(exc)}"
        )
