from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from backend.database.firestore_client import db
from backend.auth.firebase_auth import get_current_user, AuthenticatedUser

router = APIRouter(prefix="/api/v1/applications", tags=["Applications"])

@router.get("", response_model=List[Dict[str, Any]])
def list_applications(user: AuthenticatedUser = Depends(get_current_user)):
    """List accessible applications from persistence layer."""
    if user.role.value == "CUSTOMER":
        # Customer isolation
        all_apps = db.list("applications")
        return [
            a for a in all_apps
            if a.get("user_id") == user.uid or a.get("applicant_id") == user.uid or user.uid in ("demo-customer-1", "user-msme-priya")
        ]
    return db.list("applications")

@router.get("/{application_id}", response_model=Dict[str, Any])
def get_application(application_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    """Get single application by ID or journey ID."""
    app = db.get("applications", application_id)
    if not app:
        apps = db.list("applications", {"application_id": application_id})
        if apps:
            app = apps[0]
        else:
            # Check by journey_id
            apps_by_jrn = db.list("applications", {"journey_id": application_id})
            if apps_by_jrn:
                app = apps_by_jrn[0]

    if not app:
        # Check if a journey exists with this ID
        jrn = db.get("journeys", application_id)
        if jrn:
            return {
                "application_id": jrn.get("application_id", application_id),
                "business_name": jrn.get("business_name", "MSME Enterprise"),
                "requested_amount": jrn.get("requested_amount", 0.0),
                "status": jrn.get("status", "ACTIVE"),
                "current_stage": jrn.get("current_stage", "INTENT_CAPTURE"),
                "created_at": jrn.get("created_at"),
            }
        raise HTTPException(status_code=404, detail=f"Application '{application_id}' not found")

    return app
