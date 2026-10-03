"""
FinFlow AI — Intent Service (Module 1)
======================================
Connects conversational customer intent capture with the Journey Orchestrator.
Persists both raw customer intent and normalized structured intent into Firestore.

Customer does not need to understand lending terminology.
"""

from typing import Dict, Any, Optional, Union
from backend.modules.module1_intent.intent_parser import (
    IntentParser,
    NormalizedIntent,
    determine_missing_evidence,
)
from backend.modules.module2_journey.schemas import CreateJourneyRequest, CreateJourneyResponse
from backend.modules.module2_journey.service import JourneyService
from backend.modules.module2_journey.state_machine import JourneyStage


class IntentService:
    @staticmethod
    async def parse_intent(
        natural_text: str = "",
        answers: Optional[Dict[str, Any]] = None,
    ) -> NormalizedIntent:
        """
        Parses natural text and guided questions into structured NormalizedIntent
        using LLM (if configured) with instant deterministic fallback.
        """
        return await IntentParser.parse(natural_text, answers)

    @staticmethod
    async def submit_intent(
        natural_text: str = "",
        answers: Optional[Dict[str, Any]] = None,
        normalized_intent: Optional[Union[Dict[str, Any], NormalizedIntent]] = None,
        business_name: Optional[str] = None,
        applicant_id: str = "customer_anon",
        actor_role: str = "CUSTOMER",
    ) -> CreateJourneyResponse:
        """
        Processes customer intent, initializes the orchestrated Journey in INTENT_CAPTURE,
        persists both raw customer intent and normalized structured intent,
        and returns Journey ID, current stage, missing evidence requirements,
        and Next Best Action.
        """
        raw_customer_intent = {
            "natural_text": natural_text or "",
            "answers": answers or {},
        }

        # If not provided, parse from input
        if normalized_intent is None:
            parsed = await IntentParser.parse(natural_text, answers)
        elif isinstance(normalized_intent, dict):
            parsed = NormalizedIntent(**normalized_intent)
        else:
            parsed = normalized_intent

        resolved_business_name = (
            business_name
            or (answers.get("business_name") if answers else None)
            or f"{parsed.business_type} Enterprise"
        )

        missing_evidence = parsed.missing_evidence_requirements or determine_missing_evidence(
            parsed.product_type, parsed.requested_amount
        )

        req = CreateJourneyRequest(
            product_type=parsed.product_type,
            requested_amount=parsed.requested_amount,
            intent_summary=parsed.intent_summary,
            purpose=parsed.purpose,
            business_name=resolved_business_name,
            annual_turnover=parsed.declared_revenue_annual,
            vintage_months=parsed.business_vintage_months,
            tenor_months=12,
            industry_sector=parsed.business_type,
            raw_customer_intent=raw_customer_intent,
            normalized_structured_intent=parsed.model_dump(),
            missing_evidence_requirements=missing_evidence,
        )

        return JourneyService.create_journey(
            req=req,
            applicant_id=applicant_id,
            actor_role=actor_role,
        )
