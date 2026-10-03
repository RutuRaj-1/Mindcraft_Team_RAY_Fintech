"""
FinFlow AI — Explainable Decision Engine
==========================================
Combines:
  1. RULE EXPLANATION (Deterministic Policy Gate)
  2. ML EXPLANATION (Probability of Default & Decision Matrix)
  3. SHAP FEATURE ATTRIBUTION (TreeExplainer feature-level marginal contributions)
  4. POLICY RAG (Institutional Underwriting Corpus grounding)
  5. EVIDENCE PROVENANCE (Traceable financial figures & multi-way consistency)

Separates:
  - Positive contributing factors (reducing default risk / favorable)
  - Negative contributing factors (increasing default risk / adverse)
  - Hard policy constraints (passed vs violated)
  - Evidence warnings (cross-document consistency & volatility)
  - Missing evidence items

Invariants:
  - Deterministic hard rule failures supersede ML & LLM (cannot be overridden).
  - LLM may explain & summarize; it CANNOT alter decision outcome, invent financial numbers,
    or introduce unsupported policy constraints.
  - Deterministic Fallback Generator activates on LLM absence, timeout, or invalid responses.
"""

import json
import uuid
import logging
import urllib.request
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

from backend.database.models import (
    DecisionRecord,
    DecisionOutcome,
    PolicyCitation,
    RiskBand,
    RiskAssessment,
    SHAPAttribution,
    JourneyStage,
    now_utc_iso,
)
from backend.database.firestore_client import db
from backend.config import settings
from backend.modules.module4_decision.risk_orchestrator import RiskOrchestrator
from backend.modules.module4_decision.shap_explainer import SHAPExplainerService
from backend.modules.module4_decision.rag_decision_engine import CREDIT_POLICY_CORPUS
from backend.modules.module3_financial.consistency_engine import ConsistencyEngine
from backend.modules.module3_financial.cashflow_engine import CashFlowEngine
from backend.modules.module5_trust.audit_ledger import AuditLedger

logger = logging.getLogger(__name__)

EXPLANATION_VERSION = "v2.0-rag-shap-provenance"
MODEL_VERSION = "scikit-learn-sme-v2.1"


# ==============================================================================
# 1. Deterministic Fallback Explanation Generator
# ==============================================================================
class FallbackExplanationGenerator:
    """
    Deterministically synthesizes an executive explanation and key reasons
    when LLM is unavailable, times out, or produces an invalid response.
    Completely grounded in hard rule evaluations, SHAP contributions, and policy clauses.
    """

    @classmethod
    def generate(
        cls,
        outcome: DecisionOutcome,
        business_name: str,
        risk_score: float,
        risk_band: str,
        approved_amount: float,
        interest_rate: float,
        tenor_months: int,
        hard_rules_passed: bool,
        failed_rules: List[Dict[str, Any]],
        positive_factors: List[Dict[str, Any]],
        negative_factors: List[Dict[str, Any]],
        policy_citations: List[Dict[str, Any]],
        warnings: List[str],
        missing_evidence: List[str],
        cash_flow_summary: Optional[Dict[str, Any]] = None,
    ) -> Tuple[str, List[str]]:
        """
        Returns:
            summary (str): Formatted multi-paragraph executive narrative.
            key_reasons (List[str]): Structured bulleted grounding reasons.
        """
        key_reasons: List[str] = []
        top_pos = positive_factors[:2]
        top_neg = negative_factors[:2]
        top_policy = policy_citations[0] if policy_citations else None

        # ── REJECTED (Hard policy gate failure) ──────────────────────────────
        if outcome == DecisionOutcome.REJECTED or not hard_rules_passed:
            fail_descs = [
                f"{r.get('rule_name', 'Rule')} ({r.get('failure_reason', 'Threshold not met')})"
                for r in failed_rules
            ]
            reasons_str = "; ".join(fail_descs) if fail_descs else "Institutional underwriting criteria unsatisfied"
            pol_ref = f" under {top_policy.get('clause_id')} ({top_policy.get('title')})" if top_policy else ""

            summary = (
                f"Credit application for {business_name} could not be approved at this time. "
                f"The application encountered hard eligibility constraint violations: {reasons_str}{pol_ref}. "
                f"Under institutional credit governance, deterministic eligibility gates strictly supersede "
                f"statistical credit scores to protect borrower balance sheet sustainability."
            )

            for r in failed_rules:
                key_reasons.append(
                    f"Hard Constraint Violation: {r.get('rule_name')} failed — {r.get('failure_reason', 'Threshold unsatisfied')}."
                )
            if top_neg:
                key_reasons.append(
                    f"Adverse Risk Contributor: {top_neg[0].get('feature_display_name', 'Feature')} "
                    f"stands at {top_neg[0].get('feature_value')}, adding marginal risk."
                )
            if missing_evidence:
                key_reasons.append(
                    f"Missing Documentation: Pending {', '.join(missing_evidence[:2])} for verification."
                )

        # ── APPROVED (Clean underwriting profile) ───────────────────────────
        elif outcome == DecisionOutcome.APPROVED:
            pol_clause = f"in adherence to {top_policy.get('clause_id')}" if top_policy else "under institutional guidelines"

            summary = (
                f"Credit facility for {business_name} is APPROVED for ₹{approved_amount:,.2f} at {interest_rate}% p.a. "
                f"over {tenor_months} months {pol_clause}. The borrower demonstrates exemplary credit strength with a "
                f"FinFlow Trust Score of {int(risk_score)}/1000 ({risk_band}). All mandatory underwriting policy gates passed "
                f"with zero hard violations. Substantial debt service coverage and verified banking discipline indicate high "
                f"repayment capability."
            )

            key_reasons.append(
                "100% Policy Compliance: All mandatory institutional eligibility and KYC gates satisfied."
            )
            for p in top_pos:
                key_reasons.append(
                    f"Favorable Risk Driver (SHAP): {p.get('feature_display_name')} at {p.get('feature_value')} "
                    f"reduces default probability (marginal impact: {p.get('shap_value'):.3f})."
                )
            if cash_flow_summary and cash_flow_summary.get("dscr"):
                key_reasons.append(
                    f"Healthy Cash Flow: DSCR is {cash_flow_summary.get('dscr'):.2f}x with positive net operating surplus."
                )

        # ── CONDITIONAL APPROVAL (Prudent haircut / tranche) ─────────────────
        elif outcome == DecisionOutcome.CONDITIONAL_APPROVAL:
            summary = (
                f"Credit facility for {business_name} is CONDITIONALLY APPROVED for ₹{approved_amount:,.2f} "
                f"at {interest_rate}% p.a. ({tenor_months} months). The business exhibits solid operational fundamentals "
                f"(Trust Score: {int(risk_score)}/1000, {risk_band}), but prudent risk structuring has been applied. "
                f"Facility disbursement is recommended in monthly tranches to align with working capital turnover cycles."
            )

            key_reasons.append(
                "Eligible with Prudent Structuring: Approved with facility haircut to match verified debt service capacity."
            )
            for p in top_pos:
                key_reasons.append(
                    f"Positive Core Factor: {p.get('feature_display_name')} ({p.get('feature_value')}) supports baseline approval."
                )
            for n in top_neg:
                key_reasons.append(
                    f"Cautionary Risk Driver: {n.get('feature_display_name')} at {n.get('feature_value')} "
                    f"moderates credit appetite (SHAP: +{n.get('shap_value'):.3f})."
                )
            if warnings:
                key_reasons.append(f"Operating Observation: {warnings[0]}")

        # ── NEEDS REVIEW (Anomalies / elevated risk) ─────────────────────────
        else:
            warn_snippet = f" Flagged observation: {warnings[0]}." if warnings else ""
            summary = (
                f"Credit application for {business_name} has been routed for RELATIONSHIP MANAGER & RISK OFFICER REVIEW. "
                f"The borrower attained a FinFlow Trust Score of {int(risk_score)}/1000 ({risk_band}).{warn_snippet} "
                f"While no irreversible hard gate disqualifications were triggered, variance in evidence or elevated "
                f"cash-flow volatility requires manual underwriter concurrence before final disbursement."
            )

            key_reasons.append(
                "Human Review Triggered: Application routed to Credit Committee due to elevated risk or evidence variance."
            )
            for n in top_neg:
                key_reasons.append(
                    f"Elevated Risk Factor (SHAP): {n.get('feature_display_name')} stands at {n.get('feature_value')} "
                    f"(marginal risk impact: +{n.get('shap_value'):.3f})."
                )
            if warnings:
                for w in warnings[:2]:
                    key_reasons.append(f"Evidence Warning: {w}")

        return summary, key_reasons


# ==============================================================================
# 2. Explainable Decision Engine
# ==============================================================================
class ExplainableDecisionEngine:
    """
    Authoritative Explainable Decision Engine coordinating:
      - Policy Rule Evaluation (Deterministic Gate)
      - ML Risk Model & Decision Matrix
      - SHAP Attribution (Positive vs Negative contributors)
      - Policy RAG Grounding
      - Multi-Document Evidence Provenance
      - LLM Synthesis with Strict Invariants
      - Deterministic Fallback Generator
    """

    @classmethod
    def generate_decision(
        cls,
        journey_id: str,
        application_id: Optional[str] = None,
        actor_id: str = "AI_ORCHESTRATOR",
        actor_role: str = "SYSTEM",
        force_recalculate: bool = False,
    ) -> DecisionRecord:
        journey = db.get("journeys", journey_id)
        if not journey:
            # Fallback if journey_id itself is an application_id
            app_id = application_id or journey_id
            journey = {"journey_id": journey_id, "application_id": app_id}
        else:
            app_id = application_id or journey.get("application_id", journey_id)

        app = db.get("applications", app_id) or {}
        business_name = app.get("business_name") or app.get("businessName") or "Applicant Enterprise"
        requested_amount = float(app.get("requested_amount") or app.get("requestedAmount") or 1_000_000.0)
        tenor_months = int(app.get("tenor_months") or app.get("tenorMonths") or 12)

        # ── Step 1: Run or fetch hybrid risk assessment ───────────────────────
        risk_assessment = RiskOrchestrator.assess(
            journey_id=journey_id,
            application_id=app_id,
            actor_id=actor_id,
            actor_role=actor_role,
            force_recalculate=force_recalculate,
        )

        # ── Step 2: Separate Hard Policy Constraints ─────────────────────────
        hard_rules_list = risk_assessment.hard_rules
        hard_policy_constraints: List[Dict[str, Any]] = [
            {
                "rule_id": r.rule_id,
                "rule_name": r.rule_name,
                "passed": r.passed,
                "threshold": getattr(r, "threshold_value", getattr(r, "threshold", "")),
                "actual_value": getattr(r, "actual_value", ""),
                "failure_reason": getattr(r, "failure_reason", None),
                "policy_citation": getattr(r, "policy_citation", ""),
            }
            for r in hard_rules_list
        ]
        failed_hard_rules = [r for r in hard_policy_constraints if not r["passed"]]
        hard_rules_passed = risk_assessment.all_hard_rules_passed and len(failed_hard_rules) == 0

        # ── Step 3: Compute and Separate SHAP Contributions ───────────────────
        shap_attr = SHAPExplainerService.explain_prediction(
            application_id=app_id,
            risk_id=risk_assessment.risk_id,
            feature_dict=risk_assessment.feature_vector,
        )

        positive_factors: List[Dict[str, Any]] = []
        negative_factors: List[Dict[str, Any]] = []
        all_shap_factors: List[Dict[str, Any]] = []

        for feat in shap_attr.features:
            f_dict = {
                "feature_name": feat.feature_name,
                "feature_display_name": feat.feature_display_name,
                "feature_value": feat.feature_value,
                "shap_value": feat.shap_value,
                "direction": feat.direction,
                "importance_rank": feat.importance_rank,
                "impact_type": "Favorable (Reduces Risk)" if feat.direction == "REDUCES_RISK" else "Adverse (Increases Risk)",
            }
            all_shap_factors.append(f_dict)
            if feat.direction == "REDUCES_RISK" or feat.shap_value < 0:
                positive_factors.append(f_dict)
            else:
                negative_factors.append(f_dict)

        # Sort by absolute SHAP magnitude
        positive_factors.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        negative_factors.sort(key=lambda x: abs(x["shap_value"]), reverse=True)

        shap_factors_payload = {
            "positive_factors": positive_factors,
            "negative_factors": negative_factors,
            "base_value": shap_attr.base_value,
            "model_output": shap_attr.model_output,
            "all_factors": all_shap_factors,
        }

        # ── Step 4: Evidence Provenance, Warnings & Missing Evidence ─────────
        evidence_items = db.list("evidence_ledger", {"application_id": app_id})
        evidence_references: List[Dict[str, Any]] = []
        for ev in evidence_items[:8]:
            evidence_references.append({
                "field_name": ev.get("field_name") or ev.get("fieldName", "Metric"),
                "value": str(ev.get("field_value") or ev.get("fieldValue", "")),
                "source_document": ev.get("extraction_engine") or ev.get("document_type") or "Verified Document",
                "confidence": float(ev.get("confidence") or 0.95),
                "document_id": ev.get("document_id") or ev.get("documentId", ""),
                "page": ev.get("source_page", 1),
            })

        # Consistency Warnings
        warnings: List[str] = []
        try:
            consistency_rep = ConsistencyEngine.verify_consistency(app_id)
            if consistency_rep and not consistency_rep.is_consistent:
                for disc in consistency_rep.discrepancies:
                    warnings.append(f"Discrepancy in {disc.field}: {disc.explanation}")
        except Exception as exc:
            logger.warning("Consistency check warning: %s", exc)

        # Cash Flow & Volatility Warnings
        cash_flow_summary: Dict[str, Any] = {}
        try:
            cf_metrics = CashFlowEngine.compute_metrics(app_id)
            cash_flow_summary = {
                "average_monthly_inflow": cf_metrics.average_monthly_inflow,
                "average_monthly_outflow": cf_metrics.average_monthly_outflow,
                "net_monthly_surplus": cf_metrics.net_monthly_surplus,
                "dscr": cf_metrics.dscr,
                "volatility_index": cf_metrics.cash_flow_volatility,
            }
            if cf_metrics.cash_flow_volatility > 0.25:
                warnings.append(
                    f"Cash-flow volatility index is elevated at {cf_metrics.cash_flow_volatility:.2f}."
                )
            if cf_metrics.dscr < 1.15:
                warnings.append(
                    f"Debt Service Coverage Ratio (DSCR) is tight at {cf_metrics.dscr:.2f}x."
                )
        except Exception as exc:
            logger.warning("Cash flow metrics summary warning: %s", exc)

        # Missing Evidence
        missing_evidence: List[str] = list(app.get("missing_evidence_requirements") or [])
        if not missing_evidence:
            docs = db.list("documents", {"application_id": app_id})
            doc_types = {d.get("document_type") for d in docs}
            for mandatory in ["BANK_STATEMENT", "GST_RETURN", "ITR"]:
                if mandatory not in doc_types:
                    missing_evidence.append(mandatory.replace("_", " ").title())

        # ── Step 5: Policy RAG Grounding ─────────────────────────────────────
        policy_references = cls._retrieve_policy_grounding(
            business_name=business_name,
            outcome_hint="REJECTED" if not hard_rules_passed else risk_assessment.risk_band.value,
            failed_rules=failed_hard_rules,
            top_factors=negative_factors[:2] + positive_factors[:2],
        )

        # ── Step 6: Determine Authoritative Financial Outcome ────────────────
        # STRICT INVARIANT: Hard rules cannot be bypassed.
        if not hard_rules_passed:
            outcome = DecisionOutcome.REJECTED
            approved_amount = 0.0
            interest_rate = 0.0
            tenor_months = 0
            confidence = 0.98
        else:
            if risk_assessment.risk_band == RiskBand.LOW_RISK:
                outcome = DecisionOutcome.APPROVED
                approved_amount = requested_amount
                interest_rate = 10.75
                confidence = 0.96
            elif risk_assessment.risk_band == RiskBand.MEDIUM_RISK:
                outcome = DecisionOutcome.CONDITIONAL_APPROVAL
                approved_amount = round(requested_amount * 0.85, 2)
                interest_rate = 12.25
                confidence = 0.92
            else:
                outcome = DecisionOutcome.NEEDS_REVIEW
                approved_amount = round(requested_amount * 0.60, 2)
                interest_rate = 14.50
                confidence = 0.88

            # Downgrade to NEEDS_REVIEW if major cross-document discrepancies
            if warnings and outcome == DecisionOutcome.APPROVED and len(warnings) >= 2:
                outcome = DecisionOutcome.NEEDS_REVIEW

        # ── Step 7: LLM Explanation with Strict Fallback ─────────────────────
        llm_summary, llm_key_reasons = cls._generate_llm_explanation(
            final_outcome=outcome.value,
            risk_band=risk_assessment.risk_band.value,
            risk_score=risk_assessment.risk_score,
            business_name=business_name,
            approved_amount=approved_amount,
            interest_rate=interest_rate,
            tenor_months=tenor_months,
            positive_factors=positive_factors,
            negative_factors=negative_factors,
            hard_policy_constraints=hard_policy_constraints,
            retrieved_policy_passages=policy_references,
            evidence_references=evidence_references,
            cash_flow_metrics=cash_flow_summary,
            consistency_warnings=warnings,
            missing_evidence=missing_evidence,
        )

        if not llm_summary or not llm_key_reasons:
            logger.info("Using FallbackExplanationGenerator for %s", app_id)
            summary, key_reasons = FallbackExplanationGenerator.generate(
                outcome=outcome,
                business_name=business_name,
                risk_score=risk_assessment.risk_score,
                risk_band=risk_assessment.risk_band.value,
                approved_amount=approved_amount,
                interest_rate=interest_rate,
                tenor_months=tenor_months,
                hard_rules_passed=hard_rules_passed,
                failed_rules=failed_hard_rules,
                positive_factors=positive_factors,
                negative_factors=negative_factors,
                policy_citations=policy_references,
                warnings=warnings,
                missing_evidence=missing_evidence,
                cash_flow_summary=cash_flow_summary,
            )
        else:
            summary, key_reasons = llm_summary, llm_key_reasons

        # ── Step 8: Build and Persist DecisionRecord ──────────────────────────
        decision_id = f"dec_{uuid.uuid4().hex[:10]}"
        now_dt = datetime.now(timezone.utc)
        now_iso = now_dt.isoformat()

        policy_citations = [
            PolicyCitation(
                clause_id=p.get("clause_id", "POL-GEN"),
                title=p.get("title", "Policy Requirement"),
                excerpt=p.get("excerpt", ""),
                relevance_score=float(p.get("relevance_score", 0.9)),
            )
            for p in policy_references
        ]

        evidence_citations_str = [
            f"{e.get('field_name')}: {e.get('value')} ({e.get('source_document')})"
            for e in evidence_references
        ]

        decision_record = DecisionRecord(
            decision_id=decision_id,
            application_id=app_id,
            outcome=outcome,
            summary=summary,
            reasoning=summary,
            risk_score=round(risk_assessment.risk_score, 1),
            risk_band=risk_assessment.risk_band.value,
            key_reasons=key_reasons,
            shap_factors=shap_factors_payload,
            policy_references=policy_references,
            evidence_references=evidence_references,
            warnings=warnings,
            missing_evidence=missing_evidence,
            hard_policy_constraints=hard_policy_constraints,
            confidence=confidence,
            confidence_score=confidence,
            generatedAt=now_iso,
            modelVersion=MODEL_VERSION,
            explanationVersion=EXPLANATION_VERSION,
            approved_amount=approved_amount,
            interest_rate=interest_rate,
            tenor_months=tenor_months,
            policy_citations=policy_citations,
            evidence_citations=evidence_citations_str,
            decided_by=actor_id,
            decided_at=now_dt,
        )

        try:
            db.set("decisions", decision_id, decision_record.model_dump(mode="json"))
        except Exception as exc:
            logger.warning("Decision persist failed: %s", exc)

        AuditLedger.log(
            application_id=app_id,
            actor_id=actor_id,
            actor_role=actor_role,
            action="EXPLAINABLE_DECISION_GENERATED",
            details={
                "decision_id": decision_id,
                "outcome": outcome.value,
                "risk_score": risk_assessment.risk_score,
                "risk_band": risk_assessment.risk_band.value,
                "approved_amount": approved_amount,
                "all_hard_rules_passed": hard_rules_passed,
                "explanation_version": EXPLANATION_VERSION,
            },
        )

        return decision_record

    # ── Policy RAG Helper ─────────────────────────────────────────────────────
    @classmethod
    def _retrieve_policy_grounding(
        cls,
        business_name: str,
        outcome_hint: str,
        failed_rules: List[Dict[str, Any]],
        top_factors: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        query_terms = [outcome_hint]
        for r in failed_rules:
            query_terms.append(r.get("rule_name", ""))
            query_terms.append(r.get("failure_reason", ""))
        for f in top_factors:
            query_terms.append(f.get("feature_display_name", ""))
        query_str = " ".join(query_terms)

        try:
            from backend.modules.rag.retriever import Retriever
            from backend.modules.rag.policy_ingestion import PolicyIngestionService
            PolicyIngestionService.seed_default_policies()
            passages = Retriever.retrieve(query_str, top_k=4)
            if passages:
                return [
                    {
                        "clause_id": p.policy_reference,
                        "title": p.section,
                        "excerpt": p.text,
                        "relevance_score": round(p.score, 3),
                        "effective_date": p.effective_date,
                    }
                    for p in passages
                ]
        except Exception as exc:
            logger.debug("Retriever call fell back to corpus: %s", exc)

        citations: List[Dict[str, Any]] = []
        tokens = query_str.lower().split()
        for pol in CREDIT_POLICY_CORPUS:
            relevance = 0.35
            for kw in pol.get("keywords", []):
                if kw in query_str.lower():
                    relevance += 0.20
            for t in tokens:
                if t in pol.get("text", "").lower():
                    relevance += 0.05
            citations.append({
                "clause_id": pol["clause_id"],
                "title": pol["title"],
                "excerpt": pol["text"],
                "relevance_score": min(0.99, round(relevance, 2)),
                "effective_date": "2024-01-01",
            })
        citations.sort(key=lambda x: x["relevance_score"], reverse=True)
        return citations[:3]

    # ── LLM Generator with Invariant Guardrails ───────────────────────────────
    @classmethod
    def _generate_llm_explanation(
        cls,
        final_outcome: str,
        risk_band: str,
        risk_score: float,
        business_name: str,
        approved_amount: float,
        interest_rate: float,
        tenor_months: int,
        positive_factors: List[Dict[str, Any]],
        negative_factors: List[Dict[str, Any]],
        hard_policy_constraints: List[Dict[str, Any]],
        retrieved_policy_passages: List[Dict[str, Any]],
        evidence_references: List[Dict[str, Any]],
        cash_flow_metrics: Dict[str, Any],
        consistency_warnings: List[str],
        missing_evidence: List[str],
    ) -> Tuple[Optional[str], Optional[List[str]]]:
        if not settings.GEMINI_API_KEY and not settings.OPENAI_API_KEY:
            return None, None

        payload_context = {
            "business_name": business_name,
            "final_outcome": final_outcome,
            "risk_band": risk_band,
            "risk_score": risk_score,
            "approved_amount": approved_amount,
            "interest_rate": interest_rate,
            "tenor_months": tenor_months,
            "top_positive_factors": positive_factors[:3],
            "top_negative_factors": negative_factors[:3],
            "hard_policy_constraints": hard_policy_constraints,
            "retrieved_policy_passages": retrieved_policy_passages,
            "evidence_references": evidence_references,
            "cash_flow_metrics": cash_flow_metrics,
            "consistency_warnings": consistency_warnings,
            "missing_evidence": missing_evidence,
        }

        system_instruction = (
            "You are FinFlow AI's Explainable Credit Underwriting Assistant. "
            "You explain credit decisions to MSME borrowers and credit officers based on structured data.\n\n"
            "STRICT RULES (NON-NEGOTIABLE):\n"
            f"1. You MUST explain the final outcome ({final_outcome}). You may NEVER change or dispute this outcome.\n"
            "2. You may NOT invent, round-up, or hallucinate any financial figures not in the input.\n"
            "3. You may NOT introduce new or unsupported policy requirements not present in the retrieved passages.\n"
            "4. Ground every reason in the provided evidence items, policy clause IDs, and SHAP contributors.\n"
            "5. Output must be strictly valid JSON matching this schema:\n"
            "{\n"
            '  "summary": "Clear, professional executive summary narrative explaining the decision.",\n'
            '  "key_reasons": ["Reason 1 citing metric/policy", "Reason 2 citing SHAP factor", "Reason 3"]\n'
            "}"
        )

        user_prompt = f"{system_instruction}\n\nUNDERWRITING DATA:\n{json.dumps(payload_context, indent=2)}"

        if settings.OPENAI_API_KEY:
            try:
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                }
                body = json.dumps({
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": user_prompt},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.1,
                }).encode("utf-8")
                req = urllib.request.Request("https://api.openai.com/v1/chat/completions", data=body, headers=headers)
                with urllib.request.urlopen(req, timeout=3.5) as resp:
                    resp_data = json.loads(resp.read().decode("utf-8"))
                    content_str = resp_data["choices"][0]["message"]["content"]
                    parsed = json.loads(content_str)
                    summary = parsed.get("summary")
                    key_reasons = parsed.get("key_reasons")
                    if summary and isinstance(key_reasons, list):
                        return summary, key_reasons
            except Exception as exc:
                logger.warning("OpenAI explanation call failed: %s", exc)

        if settings.GEMINI_API_KEY:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
                headers = {"Content-Type": "application/json"}
                body = json.dumps({
                    "contents": [{"parts": [{"text": user_prompt + "\nOutput strictly pure JSON."}]}],
                    "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"},
                }).encode("utf-8")
                req = urllib.request.Request(url, data=body, headers=headers)
                with urllib.request.urlopen(req, timeout=3.5) as resp:
                    resp_data = json.loads(resp.read().decode("utf-8"))
                    raw_text = resp_data["candidates"][0]["content"]["parts"][0]["text"]
                    clean_json = raw_text.strip().removeprefix("```json").removesuffix("```").strip()
                    parsed = json.loads(clean_json)
                    summary = parsed.get("summary")
                    key_reasons = parsed.get("key_reasons")
                    if summary and isinstance(key_reasons, list):
                        return summary, key_reasons
            except Exception as exc:
                logger.warning("Gemini explanation call failed: %s", exc)

        return None, None
