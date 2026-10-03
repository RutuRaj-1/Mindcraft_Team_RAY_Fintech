from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from backend.database.models import (
    JourneyRecord, IntentPayload, JourneyStage, JourneyFrictionMetrics
)
from backend.auth.firebase_auth import get_current_user, AuthenticatedUser
from backend.modules.module1_intent.intent_service import IntentService
from backend.modules.module2_journey.journey_orchestrator import JourneyOrchestrator
from backend.database.firestore_client import db

router = APIRouter(prefix="/api/v1/journeys", tags=["Journeys & Lifecycle"])

class AdvanceStageRequest(BaseModel):
    target_stage: JourneyStage
    notes: Optional[str] = None

@router.post("", response_model=JourneyRecord)
def create_journey(
    payload: IntentPayload,
    user: AuthenticatedUser = Depends(get_current_user)
):
    journey = IntentService.create_journey_from_intent(payload, applicant_id=user.uid)
    return journey

@router.get("", response_model=List[JourneyRecord])
def list_journeys(
    user: AuthenticatedUser = Depends(get_current_user),
    stage: Optional[JourneyStage] = None
):
    filter_dict = {}
    if user.role.value == "CUSTOMER":
        filter_dict["applicant_id"] = user.uid
    if stage:
        filter_dict["current_stage"] = stage.value

    journeys_raw = db.list("journeys", filter_dict if filter_dict else None)
    return [JourneyRecord(**j) for j in journeys_raw]

@router.get("/{journey_id}", response_model=JourneyRecord)
def get_journey_by_id(journey_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    return JourneyOrchestrator.get_journey(journey_id)

@router.post("/{journey_id}/advance", response_model=JourneyRecord)
def advance_journey_stage(
    journey_id: str,
    req: AdvanceStageRequest,
    user: AuthenticatedUser = Depends(get_current_user)
):
    return JourneyOrchestrator.advance_stage(
        journey_id=journey_id,
        target_stage=req.target_stage,
        actor_id=user.uid,
        actor_role=user.role.value,
        notes=req.notes
    )

@router.get("/{journey_id}/friction", response_model=JourneyFrictionMetrics)
def get_journey_friction(
    journey_id: str,
    user: AuthenticatedUser = Depends(get_current_user)
):
    return JourneyOrchestrator.calculate_friction(journey_id)
