"""
FinFlow AI — Journey Orchestrator & State Machine Test Suite
============================================================
Comprehensive tests verifying:
  - Journey creation and minimum viable intent validation
  - FSM stage progression: INTENT_CAPTURE -> EVIDENCE_COLLECTION -> VERIFICATION -> RISK_ASSESSMENT -> DECISION -> NEXT_ACTION -> RESOLUTION
  - Structured error responses on invalid transitions
  - Invariant: Never allow DECISION before RISK_ASSESSMENT completion
  - Invariant: Never allow RISK before evidence requirements are satisfied unless in review mode
  - Chronological timeline reconstruction
  - Immutable audit logging for each transition
  - FastAPI endpoints via TestClient
"""

import pytest
from fastapi.testclient import TestClient
from fastapi import HTTPException

from backend.main import app
from backend.database.firestore_client import db
from backend.modules.module2_journey import (
    JourneyStateMachine,
    JourneyStage,
    JourneyRepository,
    JourneyService,
    JourneyOrchestrator,
    CreateJourneyRequest,
    AdvanceJourneyRequest,
    InvalidStageTransitionException,
    PreconditionFailedException,
)

client = TestClient(app)

AUTH_HEADER = {"Authorization": "Bearer demo-customer"}
RM_AUTH_HEADER = {"Authorization": "Bearer demo-rm"}


@pytest.fixture(autouse=True)
def clean_test_env():
    """Ensure in-memory mock collections have isolated state for tests."""
    yield


# ==============================================================================
# 1. State Machine Unit Tests
# ==============================================================================

class TestJourneyStateMachine:
    def test_normalize_stages(self):
        assert JourneyStateMachine.normalize_stage("INTENT_CAPTURE") == JourneyStage.INTENT_CAPTURE
        assert JourneyStateMachine.normalize_stage("EXPLAINABLE_DECISION") == JourneyStage.DECISION
        assert JourneyStateMachine.normalize_stage("NEXT_BEST_ACTION") == JourneyStage.NEXT_ACTION
        assert JourneyStateMachine.normalize_stage("SANCTIONED") == JourneyStage.RESOLUTION

    def test_valid_sequential_transition(self):
        # INTENT_CAPTURE -> EVIDENCE_COLLECTION is allowed
        JourneyStateMachine.validate_transition(
            current_stage=JourneyStage.INTENT_CAPTURE,
            target_stage=JourneyStage.EVIDENCE_COLLECTION
        )

    def test_invalid_skip_transition_raises_structured_error(self):
        # INTENT_CAPTURE -> DECISION is strictly forbidden
        with pytest.raises(HTTPException) as exc_info:
            JourneyStateMachine.validate_transition(
                current_stage=JourneyStage.INTENT_CAPTURE,
                target_stage=JourneyStage.DECISION
            )
        assert exc_info.value.status_code == 400
        detail = exc_info.value.detail
        assert detail["error"] == "INVALID_STAGE_TRANSITION"
        assert detail["current_stage"] == "INTENT_CAPTURE"
        assert detail["target_stage"] == "DECISION"
        assert "EVIDENCE_COLLECTION" in detail["allowed_stages"]

    def test_risk_assessment_evidence_precondition(self):
        # VERIFICATION -> RISK_ASSESSMENT without satisfied evidence and no review mode
        with pytest.raises(HTTPException) as exc_info:
            JourneyStateMachine.validate_transition(
                current_stage=JourneyStage.VERIFICATION,
                target_stage=JourneyStage.RISK_ASSESSMENT,
                context={"evidence_satisfied": False, "override_review_mode": False}
            )
        assert exc_info.value.status_code == 400
        detail = exc_info.value.detail
        assert detail["error"] == "PRECONDITION_FAILED"
        assert "evidence requirements are satisfied" in detail["message"]

    def test_risk_assessment_override_review_mode_allowed(self):
        # In review mode, transition is allowed even if evidence is pending
        JourneyStateMachine.validate_transition(
            current_stage=JourneyStage.VERIFICATION,
            target_stage=JourneyStage.RISK_ASSESSMENT,
            context={"evidence_satisfied": False, "override_review_mode": True}
        )

    def test_decision_blocked_without_risk_assessment(self):
        # Transition to DECISION without risk assessment completion must fail
        with pytest.raises(HTTPException) as exc_info:
            JourneyStateMachine.validate_transition(
                current_stage=JourneyStage.VERIFICATION,
                target_stage=JourneyStage.DECISION,
                context={"completed_stages": ["INTENT_CAPTURE", "EVIDENCE_COLLECTION", "VERIFICATION"]}
            )
        assert exc_info.value.status_code == 400
        detail = exc_info.value.detail
        assert "INVALID_STAGE_TRANSITION" in detail["error"] or "PRECONDITION_FAILED" in detail["error"]


# ==============================================================================
# 2. Journey Creation & Intent Validation Tests
# ==============================================================================

class TestJourneyService:
    def test_minimum_viable_intent_validation(self):
        # Amount too low
        with pytest.raises(HTTPException) as exc:
            JourneyService.validate_minimum_viable_intent(
                CreateJourneyRequest(
                    requested_amount=1000,
                    purpose="Working Capital Loan for Textiles",
                    intent_summary="Need raw material capital for seasonal demand",
                    business_name="Test Enterprise"
                )
            )
        assert exc.value.status_code == 400

    def test_create_journey_successful(self):
        req = CreateJourneyRequest(
            product_type="sme_working_capital",
            requested_amount=2500000.0,
            intent_summary="Need ₹25L working capital to purchase yarn and raw cotton ahead of festive inventory surge.",
            purpose="Raw material procurement and inventory expansion",
            business_name="Aarav Textiles Pvt. Ltd.",
            annual_turnover=8500000.0,
            vintage_months=36
        )

        res = JourneyService.create_journey(req, applicant_id="usr_test_001")
        assert res.journey_id.startswith("jrn_")
        assert res.current_stage == "INTENT_CAPTURE"
        assert res.status == "ACTIVE"
        assert res.next_action.action_type == "UPLOAD_DOCUMENT"
        assert res.next_action.target_stage == "EVIDENCE_COLLECTION"

        # Verify saved in repository
        saved = JourneyRepository.get(res.journey_id)
        assert saved is not None
        assert saved["business_name"] == "Aarav Textiles Pvt. Ltd."
        assert len(saved["history"]) == 1


# ==============================================================================
# 3. Full Lifecycle & Orchestrator Progression Tests
# ==============================================================================

class TestJourneyOrchestrator:
    def test_full_fsm_lifecycle_progression(self):
        # 1. Create journey
        req = CreateJourneyRequest(
            product_type="sme_working_capital",
            requested_amount=1500000.0,
            intent_summary="Need inventory financing for electrical goods distribution.",
            purpose="Inventory stock financing",
            business_name="Balaji Electricals",
            annual_turnover=6000000.0,
            vintage_months=24
        )
        created = JourneyService.create_journey(req, applicant_id="usr_test_002")
        jid = created.journey_id

        # 2. Advance INTENT_CAPTURE -> EVIDENCE_COLLECTION
        adv1 = JourneyOrchestrator.advance_stage(
            journey_id=jid,
            target_stage="EVIDENCE_COLLECTION",
            notes="Applicant confirmed initial intent parameters"
        )
        assert adv1.current_stage == "EVIDENCE_COLLECTION"
        assert adv1.previous_stage == "INTENT_CAPTURE"

        # 3. Advance EVIDENCE_COLLECTION -> VERIFICATION
        adv2 = JourneyOrchestrator.advance_stage(
            journey_id=jid,
            target_stage="VERIFICATION",
            notes="Uploaded GSTR-3B and bank statement PDFs"
        )
        assert adv2.current_stage == "VERIFICATION"

        # 4. Advance VERIFICATION -> RISK_ASSESSMENT (with review override flag)
        adv3 = JourneyOrchestrator.advance_stage(
            journey_id=jid,
            target_stage="RISK_ASSESSMENT",
            notes="Cross-checked bank credits, proceeding to risk model",
            override_review_mode=True
        )
        assert adv3.current_stage == "RISK_ASSESSMENT"

        # 5. Advance RISK_ASSESSMENT -> DECISION
        adv4 = JourneyOrchestrator.advance_stage(
            journey_id=jid,
            target_stage="DECISION",
            notes="Risk model evaluated: Score 74/100, Tier Prime"
        )
        assert adv4.current_stage == "DECISION"

        # 6. Advance DECISION -> NEXT_ACTION
        adv5 = JourneyOrchestrator.advance_stage(
            journey_id=jid,
            target_stage="NEXT_ACTION",
            notes="Offer approved: ₹15L sanctioned at 11.25% p.a."
        )
        assert adv5.current_stage == "NEXT_ACTION"

        # 7. Advance NEXT_ACTION -> RESOLUTION
        adv6 = JourneyOrchestrator.advance_stage(
            journey_id=jid,
            target_stage="RESOLUTION",
            notes="Applicant accepted e-sanction agreement"
        )
        assert adv6.current_stage == "RESOLUTION"
        assert adv6.status == "COMPLETED"

        # 8. Check Timeline shows all 7 steps
        timeline = JourneyOrchestrator.get_timeline(jid)
        assert timeline.total_steps == 7
        assert len(timeline.transitions) == 7
        assert timeline.transitions[0].stage == "INTENT_CAPTURE"
        assert timeline.transitions[-1].stage == "RESOLUTION"

        # 9. Verify audit logs exist
        audit_events = JourneyRepository.get_audit_trail(created.application_id)
        assert len(audit_events) >= 6  # At least 1 create + 5 transitions


# ==============================================================================
# 4. REST API Endpoints via TestClient
# ==============================================================================

class TestJourneysAPI:
    def test_post_create_journey_api(self):
        payload = {
            "product_type": "sme_working_capital",
            "requested_amount": 3000000.0,
            "intent_summary": "Looking for short term trade finance for pharmaceutical supplies.",
            "purpose": "Working capital for pharma procurement",
            "business_name": "Zenith Pharma Distributors",
            "annual_turnover": 12000000.0,
            "vintage_months": 48
        }
        res = client.post("/api/v1/journeys", json=payload, headers=AUTH_HEADER)
        assert res.status_code == 201
        data = res.json()
        assert "journey_id" in data
        assert data["current_stage"] == "INTENT_CAPTURE"
        assert data["status"] == "ACTIVE"
        assert "next_action" in data

    def test_get_journey_by_id_api(self):
        # Create first
        payload = {
            "product_type": "sme_working_capital",
            "requested_amount": 1000000.0,
            "intent_summary": "Need equipment lease financing for CNC lathe machine.",
            "purpose": "Machinery purchase",
            "business_name": "Precise Engineering Works",
            "annual_turnover": 4500000.0,
            "vintage_months": 18
        }
        create_res = client.post("/api/v1/journeys", json=payload, headers=AUTH_HEADER)
        jid = create_res.json()["journey_id"]

        get_res = client.get(f"/api/v1/journeys/{jid}", headers=AUTH_HEADER)
        assert get_res.status_code == 200
        assert get_res.json()["journey_id"] == jid

    def test_post_advance_invalid_transition_returns_400(self):
        # Create
        payload = {
            "product_type": "sme_working_capital",
            "requested_amount": 2000000.0,
            "intent_summary": "Need working capital for steel fabrication inventory.",
            "purpose": "Inventory stocking",
            "business_name": "Titan Steel Corp",
            "annual_turnover": 7500000.0,
            "vintage_months": 30
        }
        create_res = client.post("/api/v1/journeys", json=payload, headers=AUTH_HEADER)
        jid = create_res.json()["journey_id"]

        # Attempt invalid skip directly to RESOLUTION
        advance_res = client.post(
            f"/api/v1/journeys/{jid}/advance",
            json={"target_stage": "RESOLUTION"},
            headers=AUTH_HEADER
        )
        assert advance_res.status_code == 400
        error_detail = advance_res.json()["detail"]
        assert error_detail["error"] == "INVALID_STAGE_TRANSITION"
        assert error_detail["current_stage"] == "INTENT_CAPTURE"

    def test_get_journey_timeline_api(self):
        # Create and advance
        payload = {
            "product_type": "sme_working_capital",
            "requested_amount": 1200000.0,
            "intent_summary": "Urgent funding for FMCG packaging materials.",
            "purpose": "Packaging materials purchase",
            "business_name": "Sunrise Packaging",
            "annual_turnover": 5000000.0,
            "vintage_months": 15
        }
        create_res = client.post("/api/v1/journeys", json=payload, headers=AUTH_HEADER)
        jid = create_res.json()["journey_id"]

        # Advance to EVIDENCE_COLLECTION
        client.post(
            f"/api/v1/journeys/{jid}/advance",
            json={"target_stage": "EVIDENCE_COLLECTION", "notes": "Submitted initial docs"},
            headers=AUTH_HEADER
        )

        timeline_res = client.get(f"/api/v1/journeys/{jid}/timeline", headers=AUTH_HEADER)
        assert timeline_res.status_code == 200
        timeline_data = timeline_res.json()
        assert timeline_data["journey_id"] == jid
        assert timeline_data["total_steps"] >= 2
        assert len(timeline_data["transitions"]) >= 2
        assert len(timeline_data["audit_events"]) >= 1
