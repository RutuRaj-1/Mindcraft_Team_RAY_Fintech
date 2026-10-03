import uuid
from datetime import datetime
from backend.database.models import IntentPayload, JourneyRecord, JourneyStage, JourneyStatus, JourneyStepRecord, ApplicationRecord
from backend.database.firestore_client import db

class IntentService:
    @staticmethod
    def create_journey_from_intent(intent: IntentPayload, applicant_id: str) -> JourneyRecord:
        journey_id = f"jrn_{uuid.uuid4().hex[:10]}"
        application_id = f"app_{uuid.uuid4().hex[:10]}"
        now = datetime.utcnow()

        initial_step = JourneyStepRecord(
            stage=JourneyStage.INTENT_CAPTURE,
            entered_at=now,
            completed_at=now,
            notes=f"Intent registered: ₹{intent.requested_amount:,.2f} for {intent.purpose}"
        )

        next_step = JourneyStepRecord(
            stage=JourneyStage.EVIDENCE_COLLECTION,
            entered_at=now
        )

        journey = JourneyRecord(
            journey_id=journey_id,
            applicant_id=applicant_id,
            current_stage=JourneyStage.EVIDENCE_COLLECTION,
            status=JourneyStatus.ACTIVE,
            intent=intent,
            history=[initial_step, next_step],
            application_id=application_id,
            created_at=now,
            updated_at=now
        )

        app_record = ApplicationRecord(
            application_id=application_id,
            journey_id=journey_id,
            user_id=applicant_id,
            business_name=intent.business_name,
            product_type=intent.product_type,
            requested_amount=intent.requested_amount,
            tenor_months=intent.tenor_months,
            vintage_months=intent.vintage_months,
            annual_turnover=intent.annual_turnover,
            pan=intent.pan or "AAACS1234F",
            gstin=intent.gstin or "27AAACS1234F1Z5",
            industry_sector=intent.industry_sector,
            created_at=now
        )

        db.set("journeys", journey_id, journey.model_dump())
        db.set("applications", application_id, app_record.model_dump())

        # Log audit entry
        from backend.modules.module5_trust.audit_ledger import AuditLedger
        AuditLedger.log(
            application_id=application_id,
            actor_id=applicant_id,
            actor_role="CUSTOMER",
            action="JOURNEY_INITIALIZED",
            details={"requested_amount": intent.requested_amount, "business_name": intent.business_name}
        )

        return journey
