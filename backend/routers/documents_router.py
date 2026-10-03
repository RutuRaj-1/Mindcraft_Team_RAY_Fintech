import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List, Optional
from backend.database.models import (
    DocumentRecord, DocumentType, DocumentStatus, EvidenceItem, ConsistencyReport
)
from backend.auth.firebase_auth import get_current_user, AuthenticatedUser
from backend.modules.module3_financial.provenance import ProvenanceEngine
from backend.modules.module3_financial.ocr_extractor import DocumentOCRExtractor
from backend.modules.module3_financial.consistency_engine import ConsistencyEngine
from backend.database.firestore_client import db
from backend.config import settings

router = APIRouter(prefix="/api/v1/journeys/{journey_id}", tags=["Documents & Evidence Ledger"])

@router.post("/documents/upload", response_model=DocumentRecord)
async def upload_document(
    journey_id: str,
    doc_type: DocumentType = Form(...),
    file: UploadFile = File(...),
    user: AuthenticatedUser = Depends(get_current_user)
):
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    
    app_id = journey.get("application_id", journey_id)
    doc_id = f"doc_{uuid.uuid4().hex[:10]}"

    content = await file.read()
    sha256 = ProvenanceEngine.compute_sha256(content)

    # Save to disk locally as backup / upload target
    saved_path = settings.UPLOAD_DIR / f"{doc_id}_{file.filename}"
    with open(saved_path, "wb") as f:
        f.write(content)

    # Run OCR & Structured field extraction
    extracted_items = DocumentOCRExtractor.extract_structured_data(
        doc_type=doc_type,
        file_bytes=content,
        file_name=file.filename or "uploaded_file.pdf",
        doc_id=doc_id,
        app_id=app_id,
        source_hash=sha256
    )

    doc_record = DocumentRecord(
        document_id=doc_id,
        application_id=app_id,
        doc_type=doc_type,
        file_name=file.filename or "uploaded_file.pdf",
        file_url=f"/uploads/{doc_id}_{file.filename}",
        sha256_hash=sha256,
        status=DocumentStatus.VERIFIED if extracted_items else DocumentStatus.PROCESSING,
        page_count=max(1, len(extracted_items) // 3),
        uploaded_at=datetime.utcnow(),
        verified_at=datetime.utcnow(),
        extracted_fields_count=len(extracted_items),
        inconsistency_flags=[]
    )

    db.set("documents", doc_id, doc_record.model_dump())

    # Re-evaluate cross-document consistency
    ConsistencyEngine.verify_consistency(app_id)

    return doc_record

@router.get("/documents", response_model=List[DocumentRecord])
def list_documents(journey_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    app_id = journey.get("application_id", journey_id)
    docs = db.list("documents", {"application_id": app_id})
    return [DocumentRecord(**d) for d in docs]

@router.get("/evidence", response_model=List[EvidenceItem])
def get_evidence_ledger(journey_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    app_id = journey.get("application_id", journey_id)
    evidence = db.list("evidence_ledger", {"application_id": app_id})
    return [EvidenceItem(**e) for e in evidence]

@router.get("/consistency", response_model=ConsistencyReport)
def get_consistency_report(journey_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    journey = db.get("journeys", journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    app_id = journey.get("application_id", journey_id)
    return ConsistencyEngine.verify_consistency(app_id)
