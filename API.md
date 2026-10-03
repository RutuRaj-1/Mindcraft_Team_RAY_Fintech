# FinFlow AI — API Contract & Endpoint Reference
**API Version:** v1 · **Base URL:** `/api/v1` · **Protocol:** HTTP/1.1 REST + JSON

---

## 1. Authentication & Security Headers

All protected endpoints require a Bearer token in the `Authorization` header:

```http
Authorization: Bearer <firebase_id_token_or_demo_token>
```

### Pre-Configured Demo Auth Tokens
- `Bearer demo-customer`: Authenticates as Priya Sharma (`usr_priya_001`, Role: `CUSTOMER`)
- `Bearer demo-rm`: Authenticates as Rohan Mehta (`usr_rohan_002`, Role: `RM`)
- `Bearer demo-risk`: Authenticates as Ananya Iyer (`usr_ananya_003`, Role: `RISK_OFFICER`)
- `Bearer demo-approver`: Authenticates as Vikram Malhotra (`usr_vikram_004`, Role: `CREDIT_APPROVER`)
- `Bearer demo-audit`: Authenticates as Meera Joshi (`usr_meera_005`, Role: `AUDIT_OFFICER`)
- `Bearer demo-admin`: Authenticates as System Admin (`usr_admin_006`, Role: `ADMIN`)

---

## 2. Standard Error Response Schema

All errors follow RFC-7807 structured JSON responses:

```json
{
  "detail": "Descriptive human-readable explanation of error or conflict.",
  "error_code": "RESOURCE_CONFLICT",
  "status_code": 409,
  "timestamp": "2026-10-04T01:30:00Z"
}
```

### Common HTTP Status Codes
- `200 OK`: Request succeeded, payload returned.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Validation failure on input schema or missing mandatory rationale.
- `401 Unauthorized`: Missing or expired authentication token.
- `403 Forbidden`: Authenticated user lacks RBAC permissions for the requested resource.
- `404 Not Found`: Target journey, application, or evidence ID does not exist.
- `409 Conflict`: Attempted state transition violation (e.g. requesting decision synthesis before risk assessment is complete).

---

## 3. Endpoints by Module

### A. Intent & Journey Orchestration

#### `POST /api/v1/journeys/intent`
Initialize an SME credit application journey.
- **Access:** `CUSTOMER`, `RM`
- **Request Body (`IntentPayload`):**
  ```json
  {
    "product_type": "sme_working_capital",
    "requested_amount": 1500000.0,
    "tenor_months": 12,
    "purpose": "Inventory procurement for upcoming festive season",
    "business_name": "Sharma Textiles Private Limited",
    "annual_turnover": 14500000.0,
    "vintage_months": 48,
    "pan": "AAACS1234K",
    "gstin": "27AAACS1234K1Z5",
    "industry_sector": "Textile Manufacturing"
  }
  ```
- **Response (`201 Created`):**
  ```json
  {
    "journey_id": "jrn_priya_001",
    "application_id": "app_priya_001",
    "current_stage": "INTENT_CAPTURE",
    "status": "ACTIVE",
    "created_at": "2026-10-04T01:30:00Z"
  }
  ```

#### `GET /api/v1/journeys/{journey_id}`
Retrieve full state, stage progress, and linked application details.

#### `GET /api/v1/journeys/{journey_id}/status`
Lightweight polling endpoint returning `{ "stage": "...", "status": "..." }`.

---

### B. Document Intelligence & Evidence Ledger

#### `POST /api/v1/documents/upload`
Upload a borrower financial statement or tax return with SHA-256 fingerprinting.
- **Content-Type:** `multipart/form-data`
- **Parameters:** `application_id`, `doc_type`, `file`
- **Response (`200 OK`):**
  ```json
  {
    "document_id": "doc_c1_bank",
    "application_id": "app_priya_001",
    "file_name": "HDFC_Bank_Statement.pdf",
    "doc_type": "BANK_STATEMENT",
    "sha256_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "status": "VERIFIED",
    "page_count": 6
  }
  ```

#### `GET /api/v1/evidence/{application_id}`
Retrieve all extracted evidence points from the immutable ledger.
- **Response:**
  ```json
  [
    {
      "evidence_id": "evi_c1_1",
      "field_name": "average_monthly_balance",
      "field_value": 315000.0,
      "confidence": 0.98,
      "page_number": 1,
      "bounding_box": { "x": 0.1, "y": 0.2, "width": 0.3, "height": 0.04 },
      "extraction_engine": "FinFlow-OCR-v2.1",
      "sha256_source_hash": "e3b0c44..."
    }
  ]
  ```

---

### C. Financial Verification & Cash Flow Intelligence

#### `GET /api/v1/consistency/{application_id}`
Executes cross-document reconciliation between GST, Bank Credits, and ITR.
- **Response (`ConsistencyReport`):**
  ```json
  {
    "application_id": "app_priya_001",
    "is_consistent": true,
    "confidence_score": 0.96,
    "discrepancies": [],
    "reconciliation_summary": "Reconciled with 2.07% variance (Tolerance: 15%)"
  }
  ```

#### `GET /api/v1/cashflow/{application_id}`
Calculates operational solvency, DSCR, and volatility.
- **Response (`CashFlowMetrics`):**
  ```json
  {
    "dscr": 1.85,
    "average_monthly_balance": 315000.0,
    "inward_cheque_bounces_6m": 0,
    "buffer_days": 38,
    "volatility_score": 0.12
  }
  ```

---

### D. Risk Engine, ML & Explainability

#### `POST /api/v1/risk/assess/{application_id}`
Evaluates hard rules + executes scikit-learn SME risk model.
- **Access:** `RM`, `RISK_OFFICER`, `CREDIT_APPROVER`
- **Response (`RiskAssessment`):**
  ```json
  {
    "risk_id": "rsk_c1_001",
    "risk_score": 920.0,
    "risk_band": "LOW_RISK",
    "probability_of_default": 0.08,
    "all_hard_rules_passed": true,
    "hard_rules": [
      {
        "rule_id": "R01_VINTAGE",
        "rule_name": "Minimum Operational Vintage",
        "passed": true,
        "threshold_value": ">= 24 months",
        "actual_value": "48 months"
      },
      {
        "rule_id": "R04_DSCR",
        "rule_name": "Debt Service Coverage Ratio",
        "passed": true,
        "threshold_value": ">= 1.25x",
        "actual_value": "1.85x"
      }
    ]
  }
  ```

#### `GET /api/v1/risk/shap/{application_id}`
Returns SHAP marginal attributions for model explainability.
- **Response (`SHAPAttribution`):**
  ```json
  {
    "base_value": 0.22,
    "model_output": 0.08,
    "features": [
      {
        "feature_name": "dscr",
        "feature_display_name": "Debt Service Coverage Ratio (DSCR)",
        "feature_value": 1.85,
        "shap_value": -0.145,
        "direction": "REDUCES_RISK",
        "importance_rank": 1
      }
    ]
  }
  ```

---

### E. Decision Synthesis & Governance

#### `POST /api/v1/journeys/{journey_id}/decision/generate`
Synthesizes decision via RAG + Risk engine.
- **Gate:** Throws `409 Conflict` if called while journey is in `INTENT_CAPTURE` before verification/risk completion.
- **Response (`DecisionRecord`):**
  ```json
  {
    "decision_id": "dec_c1_001",
    "outcome": "APPROVED",
    "approved_amount": 1500000.0,
    "interest_rate": 10.75,
    "tenor_months": 12,
    "confidence_score": 0.96,
    "reasoning": "Application for Sharma Textiles is APPROVED. Trust Score is 920/1000...",
    "policy_citations": [
      {
        "clause_id": "POL-SME-4.1",
        "title": "Minimum Operational Vintage Requirement",
        "excerpt": "Borrowers must establish at least 24 months continuous operations."
      }
    ]
  }
  ```

#### `POST /api/v1/journeys/{journey_id}/what-if`
Counterfactual sensitivity simulation (Base records remain immutable).
- **Request Body (`WhatIfRequest`):**
  ```json
  {
    "revenue_delta_pct": -20.0,
    "tenor_months": 18,
    "buffer_days_delta": 5,
    "collateral_offered_amount": 500000.0
  }
  ```
- **Response:** `{ "simulated_dscr": 1.48, "recommended_facility": 1200000.0 }`

#### `POST /api/v1/governance/reviews/override`
Authorized underwriter override of automated AI recommendations.
- **Access:** `RISK_OFFICER`, `CREDIT_APPROVER` (*403 for Customer*)
- **Request Body:**
  ```json
  {
    "application_id": "app_kavita_002",
    "new_outcome": "APPROVED",
    "new_approved_amount": 2500000.0,
    "new_interest_rate": 11.5,
    "reason_code": "COLLATERAL_BACKED",
    "rationale_notes": "Managing director provided personal guarantee and additional commercial property pledge.",
    "co_signed_by": "Senior Risk Head"
  }
  ```

---

### F. Next Best Action & Audit Replay

#### `GET /api/v1/journeys/{journey_id}/actions`
Returns ranked Next Best Action recommendations based on state and role.

#### `GET /api/v1/replay/timeline/{application_id}`
Returns complete 18-milestone chronological Decision Replay events with input/output payloads and SHA-256 verification seals.
