from typing import Dict, Any, List
from backend.database.firestore_client import db

class DecisionReplayService:
    @staticmethod
    def replay_decision_state(application_id: str) -> Dict[str, Any]:
        app = db.get("applications", application_id) or {}
        journey_id = app.get("journey_id")
        journey = db.get("journeys", journey_id) if journey_id else {}
        evidence = db.list("evidence_ledger", {"application_id": application_id})
        consistency = db.get("consistency_reports", f"rep_{application_id}")
        risk_list = db.list("risk_assessments", {"application_id": application_id})
        risk = risk_list[-1] if risk_list else {}
        shap_list = db.list("shap_attributions", {"application_id": application_id})
        shap = shap_list[-1] if shap_list else {}
        decisions = db.list("decisions", {"application_id": application_id})
        decision = decisions[-1] if decisions else {}
        overrides = db.list("overrides", {"application_id": application_id})
        audit_trail = db.list("audit_logs", {"application_id": application_id})

        return {
            "application_id": application_id,
            "replayed_at": decision.get("decided_at"),
            "snapshot_version": "v2.1-audit-checkpoint",
            "journey_state": {
                "stage": journey.get("current_stage"),
                "status": journey.get("status"),
                "history": journey.get("history", [])
            },
            "declared_intent": {
                "business_name": app.get("business_name"),
                "requested_amount": app.get("requested_amount"),
                "vintage_months": app.get("vintage_months"),
                "annual_turnover": app.get("annual_turnover")
            },
            "evidence_snapshot": {
                "total_verified_fields": len(evidence),
                "sample_fields": evidence[:6],
                "consistency_status": consistency.get("is_consistent", True) if consistency else True
            },
            "risk_snapshot": {
                "all_hard_rules_passed": risk.get("all_hard_rules_passed"),
                "hard_rules_evaluated": risk.get("hard_rules", []),
                "finflow_trust_score": risk.get("risk_score"),
                "risk_band": risk.get("risk_band"),
                "shap_waterfall": shap.get("features", [])[:5] if shap else []
            },
            "decision_record": decision,
            "overrides_applied": overrides,
            "audit_trail_events_count": len(audit_trail)
        }
