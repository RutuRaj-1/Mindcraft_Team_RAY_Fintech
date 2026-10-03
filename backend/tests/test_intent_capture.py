"""
FinFlow AI — Intent Capture & Parsing Test Suite
================================================
Comprehensive verification for Module 1:
- Plain conversational input without lending jargon
- Conversion to structured parameters (product_type, requested_amount, purpose, business_type, business_vintage, declared_revenue, existing_obligations, intent_summary)
- Zero-dependency deterministic fallback parser
- Preservation of raw customer intent alongside normalized structured intent
- REST endpoints: POST /api/v1/intent/parse and POST /api/v1/intent/submit
- Generation of missing evidence checklist and Next Best Action card
"""

import asyncio
from fastapi.testclient import TestClient

from backend.main import app
from backend.modules.module1_intent.intent_parser import (
    IntentParser,
    DeterministicFallbackParser,
    determine_missing_evidence,
)
from backend.modules.module1_intent.intent_service import IntentService
from backend.modules.module2_journey.repository import JourneyRepository

client = TestClient(app)
AUTH_HEADER = {"Authorization": "Bearer demo-customer"}


def test_deterministic_parser_natural_text():
    raw_prompt = "I need 7 lakh for working capital to fulfil a bulk textile order."
    parsed = asyncio.run(IntentParser.parse(raw_prompt))

    assert parsed.requested_amount == 700_000.0
    assert "Textile" in parsed.business_type
    assert parsed.product_type == "sme_working_capital"
    assert parsed.business_vintage_months >= 12
    assert parsed.declared_revenue_annual > 0
    assert parsed.existing_obligations_monthly == 0.0
    assert "₹700,000" in parsed.intent_summary or "700,000" in parsed.intent_summary
    assert len(parsed.missing_evidence_requirements) >= 4


def test_deterministic_parser_guided_questions():
    answers = {
        "need": "Machinery purchase for CNC lathe tool",
        "amount": "15 lakhs",
        "business_type": "Precision Engineering",
        "vintage": "4 years",
        "revenue": "10 lakh",
        "obligations": "35000"
    }
    parsed = asyncio.run(IntentParser.parse("", answers))

    assert parsed.requested_amount == 1_500_000.0
    assert parsed.product_type == "machinery_term_loan"
    assert "Engineering" in parsed.business_type
    assert parsed.business_vintage_months == 48
    assert parsed.declared_revenue_annual == 12_000_000.0
    assert parsed.existing_obligations_monthly == 35_000.0
    assert any("Machinery quotation" in ev for ev in parsed.missing_evidence_requirements)


def test_submit_intent_persists_raw_and_normalized():
    raw_text = "I need 7 lakh for working capital to fulfil a bulk textile order."
    answers = {
        "need": "Bulk textile order fulfillment",
        "amount": "7 lakh",
        "business_type": "Textile Weaving Mill",
        "vintage": "3 years",
        "revenue": "6 lakh",
        "obligations": "0"
    }

    res = asyncio.run(IntentService.submit_intent(
        natural_text=raw_text,
        answers=answers,
        business_name="Venkateshwara Textiles",
        applicant_id="cust_test_101",
        actor_role="CUSTOMER"
    ))

    assert res.journey_id.startswith("jrn_")
    assert res.current_stage == "INTENT_CAPTURE"
    assert res.status == "ACTIVE"
    assert res.requested_amount == 700_000.0
    assert res.business_name == "Venkateshwara Textiles"
    assert len(res.missing_evidence_requirements) >= 4
    assert res.next_action.cta_label == "Upload Evidence"

    # Verify Firestore persistence
    journey_record = JourneyRepository.get(res.journey_id)
    assert journey_record is not None
    assert journey_record["raw_customer_intent"]["natural_text"] == raw_text
    assert journey_record["raw_customer_intent"]["answers"]["need"] == "Bulk textile order fulfillment"
    assert journey_record["normalized_structured_intent"]["requested_amount"] == 700_000.0


def test_api_parse_endpoint():
    res = client.post(
        "/api/v1/intent/parse",
        json={
            "natural_text": "I need 7 lakh for working capital to fulfil a bulk textile order.",
            "answers": {}
        },
        headers=AUTH_HEADER
    )
    assert res.status_code == 200
    data = res.json()
    assert data["requested_amount"] == 700_000.0
    assert data["product_type"] == "sme_working_capital"
    assert "Textile" in data["business_type"]
    assert "missing_evidence_requirements" in data
    assert len(data["missing_evidence_requirements"]) >= 4


def test_api_submit_endpoint():
    payload = {
        "natural_text": "I need 7 lakh for working capital to fulfil a bulk textile order.",
        "answers": {
            "need": "Raw material purchase",
            "amount": "7 lakh",
            "business_type": "Cotton Mills",
            "vintage": "2 years",
            "revenue": "5 lakh",
            "obligations": "none"
        },
        "business_name": "Surat Cotton Mills LLP"
    }
    res = client.post("/api/v1/intent/submit", json=payload, headers=AUTH_HEADER)
    assert res.status_code == 201
    data = res.json()
    assert "journey_id" in data
    assert data["current_stage"] == "INTENT_CAPTURE"
    assert data["status"] == "ACTIVE"
    assert len(data["missing_evidence_requirements"]) >= 4
    assert data["next_action"]["action_type"] == "UPLOAD_DOCUMENT"
    assert data["raw_customer_intent"]["natural_text"] == payload["natural_text"]
    assert data["normalized_structured_intent"]["requested_amount"] == 700_000.0
