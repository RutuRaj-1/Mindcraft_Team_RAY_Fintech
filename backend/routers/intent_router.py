"""
FinFlow AI — Intent Capture Router
==================================
REST endpoints for Conversational Intent Parsing and Journey Orchestrator connection.
Customers do not need to understand lending terminology.
"""

from fastapi import APIRouter, Depends, status
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field, ConfigDict

from backend.auth.firebase_auth import get_current_user, AuthenticatedUser
from backend.modules.module1_intent.intent_parser import NormalizedIntent
from backend.modules.module1_intent.intent_service import IntentService
from backend.modules.module2_journey.schemas import CreateJourneyResponse

router = APIRouter(prefix="/api/v1/intent", tags=["Intent Capture & Processing"])


class ParseIntentRequest(BaseModel):
    natural_text: Optional[str] = Field(default="", description="Natural conversational input")
    answers: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Answers to guided questions")


class SubmitIntentRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    natural_text: Optional[str] = Field(default="", description="Verbatim customer text")
    answers: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Guided questions responses")
    normalized_intent: Optional[Dict[str, Any]] = Field(default=None, description="Pre-computed or reviewed normalized intent")
    business_name: Optional[str] = Field(default=None, description="Legal business/trade name")


@router.post(
    "/parse",
    response_model=NormalizedIntent,
    summary="Parse Customer Intent",
    description="Extracts structured loan parameters from plain-language customer statements and guided questions using AI with instant deterministic fallback."
)
async def parse_customer_intent(
    req: ParseIntentRequest,
    user: AuthenticatedUser = Depends(get_current_user)
) -> NormalizedIntent:
    return await IntentService.parse_intent(
        natural_text=req.natural_text or "",
        answers=req.answers or {}
    )


@router.post(
    "/submit",
    response_model=CreateJourneyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit Intent and Initialize Journey",
    description="Persists raw customer input and normalized structured intent into Firestore, registers the journey in INTENT_CAPTURE stage, and returns Next Best Action and missing evidence requirements."
)
async def submit_customer_intent(
    req: SubmitIntentRequest,
    user: AuthenticatedUser = Depends(get_current_user)
) -> CreateJourneyResponse:
    return await IntentService.submit_intent(
        natural_text=req.natural_text or "",
        answers=req.answers or {},
        normalized_intent=req.normalized_intent,
        business_name=req.business_name,
        applicant_id=user.uid,
        actor_role=user.role.value
    )
