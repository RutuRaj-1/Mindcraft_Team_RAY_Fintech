# FinFlow AI — Project Context & Master Specification

> **Single Source of Truth** for Architecture, Engineering Contracts, Data Models, APIs, and Acceptance Criteria.
> **Project:** FinFlow AI — Intelligent & Explainable Financial Journey Orchestration  
> **Domain:** SME Working-Capital Lending  
> **Target Personas:** 
> 1. SME Customer (Priya Sharma — Owner of Sharma Textiles)
> 2. Relationship Manager / Loan Officer (Rohan Mehta — Growth & Underwriting)
> 3. Risk & Compliance Officer (Ananya Iyer — Credit Risk & Fraud Control)
> 4. System Administrator (Admin — Role, Config, Policy Management)

---

## 1. Executive Summary & Core Journey

FinFlow AI unifies fragmented financial lending processes into one guided, transparent, and explainable journey:

```text
Intent (Customer Need & Problem Statement)
  │
  ▼
Evidence (Documents: Bank Statements, GST Returns, ITR, KYC)
  │
  ▼
Verification (OCR Extraction, Provenance Fingerprinting & Cross-Doc Consistency)
  │
  ▼
Risk & Eligibility (Deterministic Hard Rules + Scikit-Learn/ML Credit Scoring)
  │
  ▼
Explainable Decision (RAG-Grounded Narrative + SHAP Waterfall Feature Attributions)
  │
  ▼
Next Best Action (Guardrailed Safe Action Agent Ranking Recommended Steps)
  │
  ▼
Review / Resolution (RM & Risk Officer Oversight, What-If Simulator, Override & Feedback Loop)
```

---

## 2. Technology Stack & Architecture Principles

### 2.1 Frontend
- **Framework:** React 18+ with TypeScript
- **Styling:** Tailwind CSS following `DESIGN.md` tokens (Mint `#EEF8F7`, Brand Teal `#237277`, Deep Teal `#123E40`, FinBlue `#2563EB`, FinGreen `#169C73`, FinAmber `#D89B22`, FinCoral `#D96559`, FinViolet `#7457C8`)
- **Routing:** React Router v6
- **Server State / Caching:** TanStack Query (React Query v5)
- **Forms & Validation:** React Hook Form + Zod
- **Visualizations:** Recharts (Cash Flow, SHAP Waterfalls, Score Gauges) + Dynamic Graph Visualization for Trust & Fraud Network

### 2.2 Backend
- **Framework:** FastAPI (Python 3.11–3.14) with Async Architecture
- **Validation & Serialization:** Pydantic v2
- **Auth & Storage SDK:** Firebase Admin SDK (Python)
- **ML & Explainability:** Scikit-learn + SHAP (with deterministic kernel/linear feature importance fallback)
- **Document Processing:** OCR engine abstraction (PDF/Image parsing, structured extractor, confidence scoring)
- **RAG & Policy Engine:** In-memory vector store / Firestore Policy collection with semantic chunking & cosine similarity

### 2.3 Strict Architecture Rules
1. **Frontend-to-FastAPI Only:** Frontend communicates exclusively through versioned FastAPI REST endpoints (`/api/v1/...`). The frontend MUST NOT perform direct Firestore mutations for business, risk, decision, evidence, or audit data.
2. **Auth & RBAC:** Firebase Auth verifies tokens; custom claims (`role: "CUSTOMER" | "RM" | "RISK_OFFICER" | "ADMIN"`) enforced by FastAPI dependency injection.
3. **Demo Mode & High Availability:** All AI/OCR/Storage services implement provider interfaces with deterministic fallbacks so the application runs offline or without external cloud credentials if needed.
4. **Hard Rules Precede ML:** A high ML credit score CAN NEVER bypass deterministic eligibility gates (e.g., minimum vintage < 24 months or active court default).
5. **No Hallucinated Decisions:** Every decision must cite concrete evidence provenance and policy rule IDs.

---

## 3. Seven Core Modules Specification

### Module 1: Intent & Problem Understanding
- **Purpose:** Discovers SME business profile, financing purpose, requested amount, tenor, and expected revenue cycle.
- **Inputs:** Amount requested, purpose (inventory/raw materials, equipment, receivable gap), sector, annual turnover, company vintage.
- **Outputs:** Validated Journey Intent entity, Journey Session token, recommended document checklist.

### Module 2: Customer Journey & Journey Graph
- **Purpose:** Authoritative finite state machine (FSM) tracking stage transitions:
  `INTENT_CAPTURE` → `EVIDENCE_COLLECTION` → `VERIFICATION` → `RISK_ASSESSMENT` → `EXPLAINABLE_DECISION` → `NEXT_BEST_ACTION` → `HUMAN_REVIEW` → `SANCTIONED / REJECTED`.
- **Friction Detection:** Monitors time-in-stage, document rejection loops, drop-off triggers, and produces Journey Health Scores.

### Module 3: Core Financial Processing
- **Document OCR & Extraction:** Extracts structured fields from:
  - Bank Statements: Average Monthly Balance (AMB), monthly credits, debits, bounced cheques count, cash deposits.
  - GST Returns (GSTR-3B / GSTR-1): Monthly taxable turnover, tax paid, filing regularity.
  - Income Tax Returns (ITR-V): Net profit, depreciation, gross total income.
  - KYC & Registration: PAN, GSTIN, Udyam registration, entity type.
- **Cash-Flow Intelligence:** Computes Debt Service Coverage Ratio (DSCR), Operating Cash Flow (OCF), Cash Burn Rate, Working Capital Buffer Days, Seasonality Index, and Inflow-to-Outflow Volatility.

### Module 4: AI Decision Intelligence
- **Eligibility Engine:** Deterministic rule evaluation:
  - R01: Minimum operational vintage >= 24 months.
  - R02: Minimum annual turnover >= ₹25,00,000.
  - R03: Bounced inward cheques in last 6 months <= 2.
  - R04: Minimum DSCR >= 1.25x.
  - R05: Valid GSTIN with active status.
- **ML Risk Scorer:** Predicts probability of default ($PD \in [0, 1]$) and maps to Risk Bands:
  - `LOW_RISK` ($PD < 0.15$)
  - `MEDIUM_RISK` ($0.15 \le PD < 0.35$)
  - `HIGH_RISK` ($PD \ge 0.35$)
- **Explainable Decision Engine:** Combines RAG policy grounding + SHAP feature attributions into natural-language, transparent audit trails.

### Module 5: Trust, Governance & Human Oversight
- **Role-Based Workflows:**
  - RM: Case intake, financial notes, applicant clarifications, sanction request.
  - Risk Officer: Deep-dive risk radar, SHAP waterfall inspection, policy verification, manual override with recorded rationale.
  - Admin: System metrics, rule threshold calibration, audit logs.
- **Audit Ledger:** Cryptographic immutable event logs (`AuditLog`) for all state transitions, extractions, and overrides.

### Module 6: Product, Dashboard, Integration & Demo Layer
- **Multi-Persona UI Portal:** Persona switch bar for instant live demo presentation.
- **Executive Loan Summary Card:** Visual Trust Score badge (0–1000), recommended loan limit, interest rate, term, and confidence indicator.
- **Seeded Demo Cases:**
  1. `CASE-001 (Priya Sharma - Sharma Textiles)`: Clean SME, high cash flow, eligible for ₹15 Lakhs.
  2. `CASE-002 (Kavita Electronics)`: Boundary case, slight revenue volatility, recommended for structured tranche loan with collateral.
  3. `CASE-003 (Apex Logistics)`: Inconsistent documents (GST turnover does not match Bank credits), flagged for Risk Officer review.

---

## 4. Module 7: Financial Trust Intelligence Layer (Mandatory Deep Capabilities)

1. **Financial Trust Graph:**
   - Multi-relational graph: Entities (`Business`, `Director`, `Bank_Account`, `GSTIN`, `Buyer_SME`, `Supplier_SME`).
   - Edges: Ownership (`OWNS`), Transaction Flow (`PAID_TO`), Invoicing (`INVOICED`), Shared Address/Phone (`CO_LOCATED`).
   - Computes Network Centrality, Verified Counterparty Ratio, and Node Trust Scores.

2. **Cash-Flow Intelligence:**
   - Metric derivations: DSCR, monthly net inflows, cash runway, seasonal variance index, payment cycle lags.
   - Interactive Cash Flow Waterfall & Trend charts.

3. **Evidence Provenance:**
   - Cryptographic SHA-256 fingerprint per uploaded file.
   - Field-level provenance: source document ID, page number, bounding box coordinates, extraction engine, timestamp, and verification operator.

4. **Consistency Engine:**
   - Cross-source discrepancy matrix:
     - `Turnover Discrepancy`: $|GST\_Turnover - Bank\_Credits| / GST\_Turnover$ (Flag if $> 15\%$).
     - `Identity Discrepancy`: Name on PAN vs GSTIN vs Bank Account.
     - `Address Discrepancy`: Business address mismatch across GST and Electricity bill.

5. **SHAP Explainability:**
   - Tree/Linear SHAP attribution for credit risk prediction:
     - Base Value ($E[f(x)]$) + Sum of positive/negative SHAP values = Model Output ($f(x)$).
     - Waterfall charts showing top 5 positive drivers (e.g., strong DSCR, zero cheque bounces) and top 5 negative drivers (e.g., high debt-to-equity, short credit history).

6. **What-If Simulator:**
   - Real-time interactive counterfactual modeling:
     - "What if monthly revenue increases by $X\%$?"
     - "What if requested tenure increases from 6 to 12 months?"
     - "What if working capital buffer increases by 15 days?"
   - Recalculates DSCR, Risk Band, Approved Amount, and Interest Rate on the fly.

7. **Decision Replay:**
   - Time-travel debugger: re-executes decisions at an exact past timestamp with the exact snapshot of policy rules, document evidence, and model weights.

8. **Cross-Application Fraud/Relationship Graph:**
   - Detects synthetic identity rings, circular invoicing between friendly companies, and duplicate GSTIN applications across loan portfolios.

9. **Safe Action Agent:**
   - Generates prioritized, guardrailed Next Best Actions (NBAs) with action type, title, urgency, automated execution safety score, and rollback plan.

10. **Human Review + Override:**
    - Dedicated dual-control workflow allowing RM/Risk Officer to override automated recommendations with mandatory rationale selection, note input, and supervisor co-signing.

11. **Feedback / Learning Loop:**
    - Records override decisions, reason taxonomy, and post-disbursement performance to suggest rule threshold adjustments without black-box drift.

12. **Journey Friction Detection:**
    - Calculates stage latency, document resubmission frequency, and friction scores (0–100) to flag stalled applications.

---

## 5. Canonical Data Models & Database Schemas

### 5.1 Firestore / Repository Collections

| Collection | Document Key | Key Fields |
|---|---|---|
| `users` | `uid` | email, role (`CUSTOMER`, `RM`, `RISK_OFFICER`, `ADMIN`), name, business_id |
| `journeys` | `journey_id` | applicant_id, product_type, current_stage, status, requested_amount, intent_data, created_at, updated_at |
| `applications` | `application_id` | journey_id, business_name, gstin, pan, vintage_months, annual_turnover, requested_amount, tenure_months |
| `documents` | `document_id` | application_id, doc_type, file_url, sha256_hash, status, uploaded_at, page_count |
| `evidence_ledger` | `evidence_id` | document_id, application_id, field_name, field_value, confidence, page_num, bbox, verified_at |
| `consistency_reports`| `report_id` | application_id, overall_status, discrepancy_score, discrepancies: [{field, doc_a, val_a, doc_b, val_b, variance_pct, severity}] |
| `cashflow_metrics` | `metric_id` | application_id, dscr, avg_monthly_inflow, avg_monthly_outflow, cash_burn_rate, buffer_days, volatility_index |
| `risk_assessments` | `risk_id` | application_id, rule_outcome, hard_rules_passed, ml_risk_score, risk_band, trust_score, calculated_at |
| `shap_attributions` | `shap_id` | risk_id, application_id, base_value, prediction, feature_attributions: [{feature, value, shap_value, direction}] |
| `decisions` | `decision_id` | application_id, outcome (`APPROVED`, `CONDITIONAL_APPROVAL`, `NEEDS_REVIEW`, `REJECTED`), approved_amount, interest_rate, tenor_months, reasoning, policy_citations, decided_by |
| `next_best_actions` | `nba_id` | application_id, actions: [{id, priority, title, description, action_type, cta_label, safe_agent_guardrail}] |
| `audit_logs` | `audit_id` | application_id, actor_id, actor_role, action_type, old_state, new_state, timestamp, ip_address |
| `overrides` | `override_id` | decision_id, actor_id, original_outcome, new_outcome, justification, override_category, timestamp |
| `trust_graphs` | `graph_id` | application_id, nodes: [{id, label, type, risk_score, metadata}], edges: [{source, target, relation, weight}] |

---

## 6. REST API Endpoints Specification

### 6.1 Authentication & Profile
- `POST /api/v1/auth/session` — Issue session token / verify Firebase ID token + custom claims
- `GET  /api/v1/auth/me` — Return current authenticated user profile and active role

### 6.2 Journey Orchestration
- `POST /api/v1/journeys` — Create new journey with intent payload
- `GET  /api/v1/journeys/{id}` — Get full journey state, history, and stage progress
- `POST /api/v1/journeys/{id}/advance` — Advance journey stage after meeting stage exit criteria
- `GET  /api/v1/journeys/{id}/friction` — Get friction metrics and bottleneck alerts

### 6.3 Document Intelligence & Evidence Provenance
- `POST /api/v1/journeys/{id}/documents/upload` — Upload document (PDF/Image) with OCR processing
- `GET  /api/v1/journeys/{id}/documents` — List uploaded documents and OCR status
- `GET  /api/v1/journeys/{id}/evidence` — Get structured Evidence Ledger with hash provenance
- `GET  /api/v1/journeys/{id}/consistency` — Run and return cross-document consistency report

### 6.4 Financial & Cash-Flow Intelligence
- `GET  /api/v1/journeys/{id}/cashflow` — Retrieve computed DSCR, cash runway, volatility, and monthly breakdown
- `GET  /api/v1/journeys/{id}/trust-graph` — Retrieve multi-relational Financial Trust Graph and fraud indicators

### 6.5 Risk, Decision & SHAP Explainability
- `POST /api/v1/journeys/{id}/evaluate-risk` — Run deterministic rules + ML risk model
- `GET  /api/v1/journeys/{id}/risk` — Get risk score, risk band, and rule breakdown
- `GET  /api/v1/journeys/{id}/shap` — Get SHAP feature attribution waterfall data
- `GET  /api/v1/journeys/{id}/decision` — Get explainable decision with RAG policy citations
- `POST /api/v1/journeys/{id}/simulate` — Run What-If counterfactual scenario
- `GET  /api/v1/journeys/{id}/replay` — Decision replay audit log at specific timeline checkpoints

### 6.6 Human Review, Overrides & Learning Loop
- `POST /api/v1/journeys/{id}/override` — Submit officer override with mandatory rationale
- `GET  /api/v1/journeys/{id}/actions` — Get prioritized Next Best Actions from Safe Action Agent
- `GET  /api/v1/dashboard/queue` — Relationship Manager & Risk Officer queue (with filters & search)
- `GET  /api/v1/dashboard/metrics` — Aggregate portfolio and orchestration performance metrics
- `POST /api/v1/demo/seed` — Re-seed or switch demo test cases (Priya Sharma, Kavita Electronics, Apex Logistics)

---

## 7. Explicit Feature Acceptance Criteria

| ID | Feature | Acceptance Criterion |
|---|---|---|
| AC-01 | Intent Capture | Form validates SME profile & amount; creates active Journey in state `EVIDENCE_COLLECTION` in < 500ms. |
| AC-02 | Document Upload & OCR | Accepts PDF/JPG/PNG, verifies SHA-256 fingerprint, extracts key fields with confidence scores; displays fallback if offline. |
| AC-03 | Consistency Engine | Accurately flags variance between declared revenue, GST return turnover, and Bank credits (> 15% delta triggers warning). |
| AC-04 | Cash Flow Intelligence | DSCR computed accurately ($DSCR = Operating\_Cash\_Flow / Total\_Debt\_Service$); monthly breakdown returned. |
| AC-05 | Hard Eligibility Gates | Fails immediately with clear policy citation if vintage < 24 months or bounce count > 2, before ML evaluation. |
| AC-06 | Scikit-Learn ML Risk & SHAP | Produces probability of default and returns top positive and negative SHAP features for waterfall rendering. |
| AC-07 | RAG Explainability | Decision narrative explicitly cites at least one policy clause and two verified evidence fields. |
| AC-08 | What-If Simulator | Live slider adjustments update DSCR, risk band, and loan terms in < 200ms without modifying permanent application state. |
| AC-09 | Decision Replay | Returns state snapshot matching historical timestamp, verifying decision determinism. |
| AC-10 | Trust & Fraud Graph | Visualizes interconnected nodes (Applicant, Directors, GSTIN, Bank); highlights circular transaction flags. |
| AC-11 | Human Override | Officer can override decision outcome only by providing structured reason code + comment; creates immutable audit log. |
| AC-12 | Responsive Frontend | Polished UI complying with `DESIGN.md` tokens, zero layout breaks, full persona switcher, and empty/loading states. |
