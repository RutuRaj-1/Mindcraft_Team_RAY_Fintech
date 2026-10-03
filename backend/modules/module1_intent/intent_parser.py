"""
FinFlow AI — Intent Parsing Service (Module 1)
==============================================
Extracts and normalizes conversational MSME financial intent into structured
credit parameters using LLM inference with a deterministic regex/rule fallback.

Customer does NOT need to understand lending terminology.

Normalizes into:
  - product_type
  - requested_amount
  - purpose
  - business_type
  - business_vintage
  - declared_revenue
  - existing_obligations
  - intent_summary

Preserves:
  - raw_customer_intent
  - normalized_structured_intent
"""

import re
import json
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field, ConfigDict

from backend.config import settings

logger = logging.getLogger(__name__)


class NormalizedIntent(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    product_type: str = "sme_working_capital"
    requested_amount: float = Field(..., gt=0)
    purpose: str
    business_type: str
    business_vintage: str = "2 years"
    business_vintage_months: int = 24
    declared_revenue: float = 3_000_000.0
    declared_revenue_annual: float = 3_000_000.0
    existing_obligations: float = 0.0
    existing_obligations_monthly: float = 0.0
    intent_summary: str
    confidence_score: float = 0.95
    parser_used: str = "DETERMINISTIC_FALLBACK"  # "LLM" or "DETERMINISTIC_FALLBACK"
    missing_evidence_requirements: List[str] = Field(default_factory=list)


def determine_missing_evidence(product_type: str, requested_amount: float) -> List[str]:
    """Generates the required evidence checklist based on normalized intent."""
    evidence = [
        "GSTR-3B returns (last 4 quarters) for turnover reconciliation",
        "Primary bank statements (last 12 months in PDF format)",
        "ITR-V and computation of business income (last 2 assessment years)",
        "Business PAN & Key Person KYC (Aadhaar / Passport)",
    ]
    if product_type == "machinery_term_loan":
        evidence.append("Machinery quotation / Proforma invoice from OEM vendor")
    elif product_type == "invoice_discounting":
        evidence.append("Accepted buyer purchase orders and GST tax invoices (unpaid)")

    if requested_amount > 2_500_000:  # > 25 Lakhs
        evidence.append("Audited balance sheet & profit/loss statements")

    return evidence


class DeterministicFallbackParser:
    """
    Zero-dependency heuristic and regex parser for conversational financial text.
    Handles Indian colloquial expressions (e.g. '7 lakh', '1.5 cr', '50k')
    and common business types, vintage, revenue, and obligation statements.
    """

    @classmethod
    def parse_amount(cls, text: str, fallback: float = 700_000.0) -> float:
        if not text:
            return fallback
        norm = text.lower().replace(",", "").replace("₹", "").replace("inr", "").replace("rs.", "").replace("rs", "")

        # Pattern: "X crore" / "X cr"
        cr_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:crore|crores|cr)\b", norm)
        if cr_match:
            return float(cr_match.group(1)) * 10_000_000.0

        # Pattern: "X lakh" / "X lakhs" / "X lac" / "X L"
        lakh_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs|l)\b", norm)
        if lakh_match:
            return float(lakh_match.group(1)) * 100_000.0

        # Pattern: "X k" / "X thousand"
        k_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:k|thousand|thousands)\b", norm)
        if k_match:
            return float(k_match.group(1)) * 1_000.0

        # Pattern: direct numbers >= 1000
        num_match = re.search(r"\b(\d{4,9})\b", norm)
        if num_match:
            return float(num_match.group(1))

        return fallback

    @classmethod
    def parse_vintage(cls, text: str, fallback_months: int = 24) -> tuple[str, int]:
        norm = text.lower()
        yr_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:year|years|yr|yrs)\b", norm)
        if yr_match:
            years = float(yr_match.group(1))
            months = int(years * 12)
            return f"{int(years) if years.is_integer() else years} years", max(months, 6)

        mo_match = re.search(r"(\d+)\s*(?:month|months|mo|mos)\b", norm)
        if mo_match:
            months = int(mo_match.group(1))
            return f"{months} months", max(months, 1)

        if any(w in norm for w in ["new", "started", "recent", "startup", "< 1"]):
            return "6 months", 6
        if any(w in norm for w in ["established", "decade", "5+", "old"]):
            return "5+ years", 60

        return f"{fallback_months // 12} years", fallback_months

    @classmethod
    def parse_business_type(cls, text: str) -> str:
        norm = text.lower()
        if any(w in norm for w in ["textile", "garment", "fabric", "weaving", "cotton", "apparel", "cloth"]):
            return "Textile & Apparel Manufacturing"
        if any(w in norm for w in ["machine", "metal", "steel", "engineering", "cnc", "tool", "auto parts"]):
            return "Precision Engineering & Manufacturing"
        if any(w in norm for w in ["pharma", "medical", "drug", "chemist", "healthcare", "clinic"]):
            return "Pharmaceuticals & Healthcare"
        if any(w in norm for w in ["retail", "shop", "store", "supermarket", "outlet", "kirana"]):
            return "Retail & Consumer Trading"
        if any(w in norm for w in ["wholesale", "distributor", "trading", "supplier", "dealer"]):
            return "Wholesale & B2B Distribution"
        if any(w in norm for w in ["it", "software", "tech", "digital", "service", "consulting"]):
            return "IT & Business Services"
        if any(w in norm for w in ["food", "restaurant", "cafe", "fmcg", "dairy", "bakery", "spice"]):
            return "Food & Beverage Processing"
        if any(w in norm for w in ["transport", "logistics", "freight", "trucking", "cargo", "warehouse"]):
            return "Logistics & Supply Chain"
        return "SME Commercial Enterprise"

    @classmethod
    def parse_product_type(cls, purpose_text: str) -> str:
        norm = purpose_text.lower()
        if any(w in norm for w in ["machine", "machinery", "equipment", "plant", "lathe", "tool", "generator", "furnace"]):
            return "machinery_term_loan"
        if any(w in norm for w in ["invoice", "bill", "receivable", "discounting", "factoring", "client payment"]):
            return "invoice_discounting"
        return "sme_working_capital"

    @classmethod
    def parse(cls, natural_text: str, answers: Optional[Dict[str, Any]] = None) -> NormalizedIntent:
        answers = answers or {}
        text_for_context = f"{natural_text} {answers.get('need', '')} {answers.get('purpose', '')} {answers.get('business_type', '')}"

        # 1. Requested amount
        amount_source = str(answers.get("amount", "")).strip() or natural_text
        requested_amount = cls.parse_amount(amount_source, fallback=700_000.0)

        # 2. Purpose
        purpose = (
            str(answers.get("need", "")).strip() or
            str(answers.get("purpose", "")).strip() or
            (natural_text.strip() if len(natural_text.strip()) > 5 else "Working capital for business operations")
        )

        # 3. Product type
        product_type = cls.parse_product_type(f"{purpose} {natural_text}")

        # 4. Business Type
        b_type_input = str(answers.get("business_type", "")).strip()
        b_type = b_type_input if len(b_type_input) > 2 else cls.parse_business_type(text_for_context)

        # 5. Vintage
        vintage_source = str(answers.get("vintage", "")).strip() or natural_text
        vintage_str, vintage_months = cls.parse_vintage(vintage_source, fallback_months=24)

        # 6. Revenue
        revenue_source = str(answers.get("revenue", "")).strip()
        if revenue_source:
            monthly_rev = cls.parse_amount(revenue_source, fallback=350_000.0)
            annual_rev = monthly_rev * 12
        else:
            annual_rev = max(requested_amount * 3.5, 3_000_000.0)

        # 7. Existing Obligations
        obligations_source = str(answers.get("obligations", "")).strip().lower()
        existing_obligations = 0.0
        if obligations_source and obligations_source not in ["none", "zero", "no", "nil", "na", "0", "n/a", "no emi"]:
            existing_obligations = cls.parse_amount(obligations_source, fallback=0.0)

        # 8. Intent Summary
        product_display = {
            "sme_working_capital": "SME Working Capital Facility",
            "machinery_term_loan": "Machinery & Equipment Term Loan",
            "invoice_discounting": "Invoice Discounting Facility"
        }.get(product_type, "SME Credit Facility")

        intent_summary = (
            f"Customer requests ₹{requested_amount:,.0f} under {product_display} for '{purpose}'. "
            f"Business: {b_type} (~{vintage_str} vintage, ~₹{annual_rev:,.0f} declared annual turnover, "
            f"₹{existing_obligations:,.0f}/month current obligations)."
        )

        missing_evidence = determine_missing_evidence(product_type, requested_amount)

        return NormalizedIntent(
            product_type=product_type,
            requested_amount=requested_amount,
            purpose=purpose,
            business_type=b_type,
            business_vintage=vintage_str,
            business_vintage_months=vintage_months,
            declared_revenue=annual_rev,
            declared_revenue_annual=annual_rev,
            existing_obligations=existing_obligations,
            existing_obligations_monthly=existing_obligations,
            intent_summary=intent_summary,
            confidence_score=0.92,
            parser_used="DETERMINISTIC_FALLBACK",
            missing_evidence_requirements=missing_evidence,
        )


class IntentParser:
    """
    Primary intent parsing coordinator.
    Attempts LLM extraction if API keys are configured, otherwise uses deterministic fallback.
    Never fails or throws exceptions for unexpected natural language.
    """

    @classmethod
    async def parse(cls, natural_text: str, answers: Optional[Dict[str, Any]] = None) -> NormalizedIntent:
        natural_text = (natural_text or "").strip()
        answers = answers or {}

        # If LLM configured, attempt extraction
        if settings.GEMINI_API_KEY or settings.OPENAI_API_KEY:
            try:
                llm_result = await cls._try_llm_parse(natural_text, answers)
                if llm_result:
                    return llm_result
            except Exception as e:
                logger.warning(f"LLM intent parsing exception ({e}); gracefully falling back.")

        # Fallback deterministic parser
        return DeterministicFallbackParser.parse(natural_text, answers)

    @classmethod
    async def _try_llm_parse(cls, natural_text: str, answers: Optional[Dict[str, Any]]) -> Optional[NormalizedIntent]:
        prompt = f"""
You are an MSME financial credit intent parser. Convert natural language statements and guided responses into structured loan parameters.
The customer does not know banking jargon.

Input natural statement: "{natural_text}"
Answers to guided questions: {json.dumps(answers or {})}

Extract and normalize strictly into this JSON schema:
{{
  "product_type": "sme_working_capital" | "machinery_term_loan" | "invoice_discounting",
  "requested_amount": float,
  "purpose": string,
  "business_type": string,
  "business_vintage": string (e.g. "3 years"),
  "business_vintage_months": integer,
  "declared_revenue": float (annual turnover in INR),
  "declared_revenue_annual": float,
  "existing_obligations": float (monthly EMI/loan obligations in INR),
  "existing_obligations_monthly": float,
  "intent_summary": string (concise plain-language summary of intent)
}}
"""
        # Try OpenAI if available
        if settings.OPENAI_API_KEY:
            try:
                headers = {
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                }
                body = json.dumps({
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.1
                }).encode("utf-8")
                req = urllib.request.Request("https://api.openai.com/v1/chat/completions", data=body, headers=headers)
                with urllib.request.urlopen(req, timeout=3.5) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    content = json.loads(data["choices"][0]["message"]["content"])
                    content["parser_used"] = "LLM"
                    content["confidence_score"] = 0.98
                    content["missing_evidence_requirements"] = determine_missing_evidence(
                        content.get("product_type", "sme_working_capital"),
                        float(content.get("requested_amount", 700000))
                    )
                    return NormalizedIntent(**content)
            except Exception as ex:
                logger.warning(f"OpenAI call failed: {ex}")

        # Try Gemini if available
        if settings.GEMINI_API_KEY:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
                headers = {"Content-Type": "application/json"}
                body = json.dumps({
                    "contents": [{"parts": [{"text": prompt + "\nOutput strictly pure JSON with no markdown formatting."}]}],
                    "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"}
                }).encode("utf-8")
                req = urllib.request.Request(url, data=body, headers=headers)
                with urllib.request.urlopen(req, timeout=3.5) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                    clean_json = raw_text.strip().removeprefix("```json").removesuffix("```").strip()
                    content = json.loads(clean_json)
                    content["parser_used"] = "LLM"
                    content["confidence_score"] = 0.97
                    content["missing_evidence_requirements"] = determine_missing_evidence(
                        content.get("product_type", "sme_working_capital"),
                        float(content.get("requested_amount", 700000))
                    )
                    return NormalizedIntent(**content)
            except Exception as ex:
                logger.warning(f"Gemini call failed: {ex}")

        return None
