"""
FinFlow AI — Journeys Router
============================
Authoritative REST endpoints for Journey Orchestration, Stage Progression,
and Timeline Reconstruction.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional, Union, Dict, Any

from backend.auth.firebase_auth import get_current_user, AuthenticatedUser
from backend.modules.module2_journey import (
    JourneyOrchestrator,
    JourneyService,
    JourneyRepository,
    CreateJourneyRequest,
    CreateJourneyResponse,
    AdvanceJourneyRequest,
    AdvanceJourneyResponse,
    JourneyTimelineResponse,
    JourneyStage,
)
from backend.database.models import IntentPayload, JourneyRecord, JourneyFrictionMetrics
from backend.database.firestore_client import db

router = APIRouter(prefix="/api/v1/journeys", tags=["Journeys & Lifecycle"])


@router.post(
    "",
    response_model=CreateJourneyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new MSME Journey",
    description="Validates minimum viable intent and initializes an orchestrated financial journey in INTENT_CAPTURE stage."
)
def create_journey(
    payload: Union[CreateJourneyRequest, IntentPayload, Dict[str, Any]],
    user: AuthenticatedUser = Depends(get_current_user)
) -> CreateJourneyResponse:
    # Adapt legacy IntentPayload or dict to CreateJourneyRequest if needed
    if isinstance(payload, dict):
        if "intent_summary" not in payload and "purpose" in payload:
            payload["intent_summary"] = f"Intent to secure {payload.get('product_type', 'working capital')}: {payload['purpose']}"
        req = CreateJourneyRequest(**payload)
    elif isinstance(payload, IntentPayload):
        req = CreateJourneyRequest(
            product_type=payload.product_type,
            requested_amount=payload.requested_amount,
            intent_summary=f"Financing request for {payload.business_name}: {payload.purpose}",
            purpose=payload.purpose,
            business_name=payload.business_name,
            annual_turnover=payload.annual_turnover,
            vintage_months=payload.vintage_months,
            tenor_months=payload.tenor_months,
            pan=payload.pan,
            gstin=payload.gstin,
            industry_sector=payload.industry_sector,
        )
    else:
        req = payload

    return JourneyService.create_journey(
        req=req,
        applicant_id=user.uid,
        actor_role=user.role.value
    )


@router.get(
    "",
    response_model=List[Dict[str, Any]],
    summary="List Journeys",
    description="Retrieves active and historical journeys with optional stage and user filters."
)
def list_journeys(
    user: AuthenticatedUser = Depends(get_current_user),
    stage: Optional[str] = Query(None, description="Filter by journey stage"),
    status: Optional[str] = Query(None, description="Filter by status (ACTIVE, COMPLETED, FLAGGED)")
) -> List[Dict[str, Any]]:
    filter_dict: Dict[str, Any] = {}
    if user.role.value == "CUSTOMER":
        filter_dict["applicant_id"] = user.uid
    if stage:
        filter_dict["current_stage"] = stage.strip().upper()
    if status:
        filter_dict["status"] = status.strip().upper()

    return JourneyRepository.list_all(filter_dict if filter_dict else None)


@router.get(
    "/{journey_id}",
    response_model=Dict[str, Any],
    summary="Get Journey by ID",
    description="Retrieves the current authoritative state, history, and metadata of a journey."
)
def get_journey_by_id(
    journey_id: str,
    user: AuthenticatedUser = Depends(get_current_user)
) -> Dict[str, Any]:
    journey = JourneyOrchestrator.get_journey(journey_id)
    # Part 26: Application-Level Isolation
    if user.role.value == "CUSTOMER":
        applicant_id = journey.get("applicant_id") or journey.get("customer_id")
        allowed_demo_ids = ("demo-customer", "demo-customer-1", "user-msme-priya", "user-msme-skillbridge", "user-msme-lifeline", "user-msme-safeera", "demo-customer-skillbridge", "demo-customer-lifeline", "demo-customer-safeera")
        allowed_emails = ("bhomeruturaj17@gmail.com", "rashi88@gmail.com", "wakchaureaditya@gmail.com", "customer@example.com")
        if applicant_id and applicant_id != user.uid and user.uid not in allowed_demo_ids and (user.email or "") not in allowed_emails:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Customers are restricted to their own applications."
            )
    return journey


@router.post(
    "/{journey_id}/advance",
    response_model=AdvanceJourneyResponse,
    summary="Advance Journey Stage",
    description="Advances the journey to the next logical stage or specified target stage, strictly enforcing FSM invariant rules and recording an immutable audit event."
)
def advance_journey_stage(
    journey_id: str,
    req: AdvanceJourneyRequest,
    user: AuthenticatedUser = Depends(get_current_user)
) -> AdvanceJourneyResponse:
    actor_id = req.actor_id or user.uid
    actor_role = req.actor_role or user.role.value

    return JourneyOrchestrator.advance_stage(
        journey_id=journey_id,
        target_stage=req.target_stage,
        actor_id=actor_id,
        actor_role=actor_role,
        notes=req.notes,
        override_review_mode=req.override_review_mode,
    )


@router.get(
    "/{journey_id}/timeline",
    response_model=JourneyTimelineResponse,
    summary="Get Journey Timeline",
    description="Returns the chronological sequence of historical transitions, step durations, actors, and associated audit events."
)
def get_journey_timeline(
    journey_id: str,
    user: AuthenticatedUser = Depends(get_current_user)
) -> JourneyTimelineResponse:
    journey = JourneyOrchestrator.get_journey(journey_id)
    if user.role.value == "CUSTOMER":
        applicant_id = journey.get("applicant_id") or journey.get("customer_id")
        allowed_demo_ids = ("demo-customer", "demo-customer-1", "user-msme-priya", "user-msme-skillbridge", "user-msme-lifeline", "user-msme-safeera", "demo-customer-skillbridge", "demo-customer-lifeline", "demo-customer-safeera")
        allowed_emails = ("bhomeruturaj17@gmail.com", "rashi88@gmail.com", "wakchaureaditya@gmail.com", "customer@example.com")
        if applicant_id and applicant_id != user.uid and user.uid not in allowed_demo_ids and (user.email or "") not in allowed_emails:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Customers are restricted to their own applications."
            )
    return JourneyOrchestrator.get_timeline(journey_id)


@router.get(
    "/{journey_id}/friction",
    response_model=Dict[str, Any],
    summary="Calculate Journey Friction",
    description="Calculates time-in-stage and resubmission friction telemetry."
)
def get_journey_friction(
    journey_id: str,
    user: AuthenticatedUser = Depends(get_current_user)
) -> Dict[str, Any]:
    return JourneyOrchestrator.calculate_friction(journey_id)


@router.get(
    "/{journey_id}/replay",
    response_model=Dict[str, Any],
    summary="Replay Decision Journey",
    description="Chronologically reconstructs all major system events with traceable input, output, and evidence."
)
def get_journey_replay(
    journey_id: str,
    user: AuthenticatedUser = Depends(get_current_user)
) -> Dict[str, Any]:
    from backend.modules.module6_product.decision_replay import DecisionReplayService
    return DecisionReplayService.replay_decision_state(journey_id)

