import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from backend.database.models import (
    DecisionRecord, DecisionOutcome, PolicyCitation, RiskBand, RiskAssessment, ConsistencyReport
)
from backend.database.firestore_client import db
from backend.modules.module5_trust.audit_ledger import AuditLedger

# Underwriting Policy Knowledge Base for RAG Grounding
CREDIT_POLICY_CORPUS = [
    {
        "clause_id": "POL-SME-4.1",
        "title": "Minimum Operational Vintage Requirement",
        "text": "All SME borrowers must establish at least 24 months of continuous, active commercial operations verified via GSTIN registration date and bank statements.",
        "keywords": ["vintage", "operational", "experience", "months"]
    },
    {
        "clause_id": "POL-SME-4.2",
        "title": "Minimum Annual Sales Turnover Gate",
        "text": "Annual verified credit turnover must exceed ₹25,00,000 to qualify for unsecured working capital term financing.",
        "keywords": ["turnover", "sales", "revenue", "credits"]
    },
    {
        "clause_id": "POL-SME-5.2",
        "title": "Debt Service Coverage Ratio (DSCR) Norms",
        "text": "Operating cash flow must comfortably cover existing and proposed debt service. DSCR must be >= 1.25x for standard pricing and >= 1.10x with promoter guarantee.",
        "keywords": ["dscr", "cashflow", "coverage", "debt service", "inflow"]
    },
    {
        "clause_id": "POL-SME-6.3",
        "title": "Banking Discipline & Inward Cheque Returns",
        "text": "A maximum of 2 inward financial returns or ECS bounces are permissible in the preceding 6-month period. Higher bounce rates indicate severe liquidity stress.",
        "keywords": ["cheque", "bounces", "returns", "ecs", "banking discipline"]
    },
    {
        "clause_id": "POL-SME-7.1",
        "title": "Cross-Document Discrepancy & Anti-Fraud Governance",
        "text": "Variance greater than 15% between GST returns and banking credits triggers mandatory manual underwriter review and physical or video verification.",
        "keywords": ["discrepancy", "variance", "consistency", "fraud", "review"]
    }
]

class RAGDecisionEngine:
    @staticmethod
    def retrieve_relevant_policies(query_context: str) -> List[PolicyCitation]:
        citations = []
        tokens = query_context.lower().split()

        for policy in CREDIT_POLICY_CORPUS:
            relevance = 0.0
            for kw in policy["keywords"]:
                if kw in query_context.lower():
                    relevance += 0.25
            for token in tokens:
                if token in policy["text"].lower():
                    relevance += 0.05

            relevance = min(1.0, round(relevance, 2))
            if relevance > 0.15:
                citations.append(PolicyCitation(
                    clause_id=policy["clause_id"],
                    title=policy["title"],
                    excerpt=policy["text"],
                    relevance_score=relevance
                ))

        # Sort by relevance
        citations.sort(key=lambda x: x.relevance_score, reverse=True)
        return citations[:3]

    @classmethod
    def generate_decision(
        cls,
        application_id: str,
        risk_assessment: RiskAssessment,
        consistency_report: Optional[ConsistencyReport] = None
    ) -> DecisionRecord:
        app = db.get("applications", application_id) or {}
        requested_amount = float(app.get("requested_amount", 1000000.0))
        tenor_months = int(app.get("tenor_months", 12))
        business_name = app.get("business_name", "Applicant Enterprise")

        evidence_items = db.list("evidence_ledger", {"application_id": application_id})
        evidence_citations = [
            f"{item.get('field_name')}: {item.get('field_value')} (from {item.get('extraction_engine')})"
            for item in evidence_items[:5]
        ]

        # 1. Check Hard Eligibility Gates First (Deterministic Rule Supremacy)
        if not risk_assessment.all_hard_rules_passed:
            failed_rules = [r for r in risk_assessment.hard_rules if not r.passed]
            failed_reasons = "; ".join([f"{r.rule_name} ({r.failure_reason})" for r in failed_rules])
            query_ctx = f"hard failure {failed_reasons}"
            citations = cls.retrieve_relevant_policies(query_ctx)

            reasoning = (
                f"Application for {business_name} could not be approved due to hard eligibility rule failures. "
                f"Specifically: {failed_reasons}. In accordance with institutional underwriting policies, "
                f"hard eligibility constraints supersede statistical risk scores."
            )

            decision = DecisionRecord(
                decision_id=f"dec_{uuid.uuid4().hex[:10]}",
                application_id=application_id,
                outcome=DecisionOutcome.REJECTED,
                approved_amount=0.0,
                interest_rate=0.0,
                tenor_months=0,
                confidence_score=0.98,
                reasoning=reasoning,
                policy_citations=citations,
                evidence_citations=evidence_citations,
                decided_by="AI_ORCHESTRATOR"
            )
            db.set("decisions", decision.decision_id, decision.model_dump())
            return decision

        # 2. Check Consistency Report
        if consistency_report and not consistency_report.is_consistent:
            query_ctx = "cross-document discrepancy variance consistency review"
            citations = cls.retrieve_relevant_policies(query_ctx)
            discrepancy_details = "; ".join([d.explanation for d in consistency_report.discrepancies[:2]])

            reasoning = (
                f"Application for {business_name} shows strong baseline metrics, but cross-document verification "
                f"detected data variances requiring human compliance review: {discrepancy_details}. "
                f"Case is routed to Risk & Compliance Officer with evidence provenance."
            )

            decision = DecisionRecord(
                decision_id=f"dec_{uuid.uuid4().hex[:10]}",
                application_id=application_id,
                outcome=DecisionOutcome.NEEDS_REVIEW,
                approved_amount=requested_amount,
                interest_rate=12.5,
                tenor_months=tenor_months,
                confidence_score=0.88,
                reasoning=reasoning,
                policy_citations=citations,
                evidence_citations=evidence_citations,
                decided_by="AI_ORCHESTRATOR"
            )
            db.set("decisions", decision.decision_id, decision.model_dump())
            return decision

        # 3. Assess ML Risk Score & Band
        query_ctx = f"dscr {risk_assessment.risk_band.value} cashflow turnover"
        citations = cls.retrieve_relevant_policies(query_ctx)

        if risk_assessment.risk_band == RiskBand.LOW_RISK:
            approved_amount = requested_amount
            interest_rate = 10.75 # Prime rate for low risk
            outcome = DecisionOutcome.APPROVED
            reasoning = (
                f"Application for {business_name} is APPROVED. The enterprise demonstrates exemplary credit health "
                f"with a FinFlow Trust Score of {risk_assessment.risk_score}/1000. All mandatory eligibility rules "
                f"passed successfully. Robust cash-flow generation and clean banking history support the full "
                f"sanction of ₹{approved_amount:,.2f} at a competitive prime rate of {interest_rate}% per annum."
            )
        elif risk_assessment.risk_band == RiskBand.MEDIUM_RISK:
            approved_amount = requested_amount * 0.85 # Prudent haircut
            interest_rate = 12.25
            outcome = DecisionOutcome.CONDITIONAL_APPROVAL
            reasoning = (
                f"Application for {business_name} is CONDITIONALLY APPROVED for ₹{approved_amount:,.2f} "
                f"(85% of requested facility) at {interest_rate}% p.a. FinFlow Trust Score is {risk_assessment.risk_score}/1000. "
                f"While operational vintage and turnover qualify under Policy 4.1 and 4.2, moderate cash flow volatility "
                f"indicates structured disbursement in monthly working capital tranches."
            )
        else: # HIGH_RISK
            outcome = DecisionOutcome.NEEDS_REVIEW
            approved_amount = requested_amount * 0.60
            interest_rate = 14.50
            reasoning = (
                f"Application for {business_name} requires RELATIONSHIP MANAGER & RISK OFFICER REVIEW. "
                f"The ML credit model indicates elevated risk (Trust Score: {risk_assessment.risk_score}/1000). "
                f"Conditional sanction of ₹{approved_amount:,.2f} may be structured subject to additional promoter collateral."
            )

        decision = DecisionRecord(
            decision_id=f"dec_{uuid.uuid4().hex[:10]}",
            application_id=application_id,
            outcome=outcome,
            approved_amount=round(approved_amount, 2),
            interest_rate=interest_rate,
            tenor_months=tenor_months,
            confidence_score=0.94,
            reasoning=reasoning,
            policy_citations=citations,
            evidence_citations=evidence_citations,
            decided_by="AI_ORCHESTRATOR"
        )
        db.set("decisions", decision.decision_id, decision.model_dump())

        AuditLedger.log(
            application_id=application_id,
            actor_id="AI_ORCHESTRATOR",
            actor_role="SYSTEM",
            action="DECISION_GENERATED",
            details={
                "outcome": outcome.value,
                "approved_amount": approved_amount,
                "interest_rate": interest_rate,
                "risk_score": risk_assessment.risk_score
            }
        )

        return decision
