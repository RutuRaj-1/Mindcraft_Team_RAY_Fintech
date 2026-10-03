import uuid
from datetime import datetime
from fastapi import HTTPException
from backend.database.models import HumanOverrideRequest, HumanOverrideRecord, DecisionRecord, DecisionOutcome
from backend.database.firestore_client import db
from backend.modules.module5_trust.audit_ledger import AuditLedger

class OverrideService:
    @staticmethod
    def apply_override(
        application_id: str,
        request: HumanOverrideRequest,
        officer_id: str,
        officer_name: str,
        officer_role: str
    ) -> DecisionRecord:
        # Fetch current decision
        decisions = db.list("decisions", {"application_id": application_id})
        if not decisions:
            raise HTTPException(status_code=404, detail="No active decision found to override")
        
        current_decision = decisions[-1]
        orig_outcome = DecisionOutcome(current_decision.get("outcome"))
        decision_id = current_decision.get("decision_id")

        if not request.reason_code or not request.rationale_notes.strip():
            raise HTTPException(
                status_code=400,
                detail="A structured reason code and detailed justification rationale are mandatory for human override."
            )

        override_id = f"ovr_{uuid.uuid4().hex[:10]}"
        override_record = HumanOverrideRecord(
            override_id=override_id,
            decision_id=decision_id,
            application_id=application_id,
            original_outcome=orig_outcome,
            new_outcome=request.new_outcome,
            reason_code=request.reason_code,
            rationale_notes=request.rationale_notes,
            officer_id=officer_id,
            officer_name=officer_name,
            co_signed_by=request.co_signed_by,
            timestamp=datetime.utcnow()
        )
        db.set("overrides", override_id, override_record.model_dump())

        # Update decision object
        updated_amount = request.new_approved_amount if request.new_approved_amount is not None else current_decision.get("approved_amount", 0.0)
        updated_rate = request.new_interest_rate if request.new_interest_rate is not None else current_decision.get("interest_rate", 12.0)

        current_decision["outcome"] = request.new_outcome.value
        current_decision["approved_amount"] = updated_amount
        current_decision["interest_rate"] = updated_rate
        current_decision["decided_by"] = f"{officer_name} ({officer_role})"
        current_decision["reasoning"] = (
            f"[HUMAN OVERRIDE by {officer_name}]: {request.rationale_notes} "
            f"(Reason Code: {request.reason_code}). Previous AI recommendation: {orig_outcome.value}."
        )
        current_decision["decided_at"] = datetime.utcnow().isoformat()

        db.set("decisions", decision_id, current_decision)

        # Audit logging
        AuditLedger.log(
            application_id=application_id,
            actor_id=officer_id,
            actor_role=officer_role,
            action="HUMAN_DECISION_OVERRIDE",
            details={
                "override_id": override_id,
                "original_outcome": orig_outcome.value,
                "new_outcome": request.new_outcome.value,
                "reason_code": request.reason_code,
                "co_signed_by": request.co_signed_by
            }
        )

        return DecisionRecord(**current_decision)

    @staticmethod
    def get_overrides_for_application(application_id: str):
        return db.list("overrides", {"application_id": application_id})
