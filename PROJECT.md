# FinFlow AI — Enterprise Intelligent Financial Journey Orchestration
**Master Architecture, System Specification & End-to-End Operational Blueprint**  
**Product:** FinFlow AI · **Version:** 2.2.0 Enterprise · **Team RAY:** Ruturaj Bhome · **Domain:** SME Commercial Credit Underwriting  

---

## 1. Executive Summary & Vision

Small and Medium Enterprise (SME) lending remains one of the largest credit gaps in emerging and mature markets. Traditional lending workflows suffer from chronic structural defects:
1. **Opaque & Fragmented Journeys:** Borrowers submit documents into digital voids without progress visibility, causing high abandonment rates.
2. **Manual Reconciliation Bottlenecks:** Loan underwriters spend up to three weeks cross-referencing GST filings against bank statements and audited financials.
3. **Black-Box AI Skepticism:** Uncalibrated deep models or generative LLMs hallucinate financial ratios, fail regulatory compliance audits, and cannot provide legally defensible credit rejection rationales.
4. **Vulnerability to Synthetic Fraud:** Standalone document inspections miss sophisticated accommodation entries, circular fund routing, and shell entity networks.
5. **Lack of Cryptographic Immutability:** Legacy Loan Origination Systems (LOS) do not preserve cryptographic chains linking raw source evidence to derived ratios, human overrides, and sanction terms.

**FinFlow AI** solves these systemic challenges by unifying the entire credit lifecycle into one deterministic, verifiable, and explainable product platform. FinFlow AI guarantees:
- **Zero-Hallucination Underwriting:** Deterministic hard policy gates supersede probabilistic models.
- **Verifiable Evidence Ledger:** Every derived metric links directly to an immutable SHA-256 document fingerprint and bounding box.
- **Explainable Multi-Layer Credit Intelligence:** SHAP marginal feature contributions paired with Dense Vector Policy RAG citations to RBI and institutional norms.
- **Alternative Financial Trust Score Engine:** A 7-pillar deterministic credit score ($0-100$, $300-850$ CIBIL, $0-1000$ FinFlow) for thin-file MSMEs.
- **Institutional Separation of Duties (SoD):** Programmatic role enforcement separating model generation, risk review, financial sanction, and independent audit inspection.
- **Append-Only Chronological Replay:** An 18-milestone regulatory audit trail recording every state change without mutation.

---

## 2. End-to-End Operational Workflow

FinFlow AI orchestrates the credit underwriting lifecycle through ten sequential, deterministic stages:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                FinFlow AI 10-Stage Pipeline                             │
└─────────────────────────────────────────────────────────────────────────────────────────┘
  [1. Intent Capture] ────────► [2. Evidence Vault] ────────► [3. OCR & Reconciliation]
           │                                                               │
           ▼                                                               ▼
  [4. Financial Trust Score] ─► [5. Dual Underwriting] ─────► [6. SHAP & Policy RAG]
                                 (Hard Gates + ML PD)                      │
                                                                           ▼
  [9. Trust & Fraud Graph] ◄── [8. What-If Simulation] ◄─── [7. Next Best Action]
           │
           ▼
  [10. Governance & Sanction] ──► [18-Milestone Immutable Decision Replay]
```

### Stage 1: Borrower Intent Discovery & Problem Formulation
- **Purpose:** Ingests structured business metadata and financing requirements from the borrower.
- **Key Inputs:** Legal business name, GSTIN, PAN, loan purpose (working capital, machinery purchase, invoice discounting), requested facility amount, and desired tenor.
- **State Transition:** Application transitions to `INTENT_CAPTURE` $\rightarrow$ `EVIDENCE_COLLECTION`.
- **System Action:** Initializes an immutable journey session, maps intent to targeted credit products (e.g. `sme_working_capital`), and dynamically computes the mandatory document checklist.

### Stage 2: Tamper-Evident Evidence Ingestion & Document Vault
- **Purpose:** Captures raw financial evidence with cryptographic provenance.
- **Evidence Types:** 12-month Bank Statements (PDF), GSTR-3B monthly returns, GSTR-1 outward supplies, ITR-V acknowledgments, and Udyam MSME certificates.
- **Security & Integrity:** Calculates a SHA-256 cryptographic hash immediately upon upload. Documents are uploaded to Google Cloud Storage (`finflow-ray.firebasestorage.app`) and logged in the Firestore `document_vault` and `documents` collections.

### Stage 3: OCR Extraction & Cross-Document Reconciliation
- **Purpose:** Converts raw unstructured documents into high-confidence structured financial tables and cross-checks them for consistency.
- **OCR Engine:** FinFlow OCR v2.1 extracts key-value pairs with normalized coordinate bounding boxes `[ymin, xmin, ymax, xmax]` and confidence scores.
- **Cross-Triangulation Engine:** Reconciles gross sales declared on GST returns against annualized banking credits.
  - Computes turnover variance: $\Delta = \frac{|\text{GST Turnover} - \text{Bank Credits}|}{\text{Bank Credits}} \times 100\%$.
  - Automatically flags discrepancies exceeding $15\%$ for human underwriting review.

### Stage 4: 7-Pillar Alternative Financial Trust Score Calculation
- **Purpose:** Evaluates thin-file MSMEs using their real-world digital cash-flow exhaust.
- **Pillars Evaluated:** Financial Stability ($25\%$), Cash Flow Health ($20\%$), Revenue Consistency ($15\%$), Repayment Capacity ($15\%$), Expense Discipline ($10\%$), Transaction Behaviour ($10\%$), and Fraud / Risk Signals ($5\%$).
- **Outputs Generated:**
  - Base Score: $0 - 100$
  - CIBIL-Comparable Bureau Score: $300 - 850$
  - FinFlow Institutional Trust Index: $0 - 1000$
  - Metric-backed positive and negative explainability factors.

### Stage 5: Dual-Engine Underwriting (Hard Rules + Calibrated ML)
- **Engine A: Deterministic Policy Gates (Authoritative):**
  - `R01_VINTAGE`: Operating history $\ge 24\text{ months}$.
  - `R02_TURNOVER`: Minimum annual revenue $\ge \text{₹}25,00,000$.
  - `R03_CHEQUE_BOUNCES`: Inward cheque returns in 6 months $\le 2$.
  - `R04_DSCR`: Debt Service Coverage Ratio $\ge 1.25\text{x}$.
  - `R05_REGISTRATION`: Active GSTIN status, no cancellation.
  - *Invariant:* If any hard gate fails, ML cannot override it. The loan is rejected or escalated to human review.
- **Engine B: Calibrated ML Probability of Default:**
  - Gradient-boosted default estimator trained on SME financials produces Probability of Default ($PD \in [0.0, 1.0]$).
  - Categorizes applicant into `LOW_RISK` ($PD < 0.15$), `MEDIUM_RISK` ($0.15 \le PD < 0.35$), or `HIGH_RISK` ($PD \ge 0.35$).

### Stage 6: Explainable Decision Engine (SHAP + Policy RAG)
- **SHAP Marginal Feature Attribution:** `shap.TreeExplainer` breaks down the exact log-odds contribution of each financial metric (DSCR, turnover, buffer days, bounces) into positive (risk-reducing) and negative (risk-increasing) factors.
- **Dense Vector Policy RAG:** Embeds institutional credit policies and RBI master directions into dense vectors. Cosine similarity retrieval grounds every sanction condition, covenant, and rejection notice in formal policy clauses (e.g. `POL-SME-4.1`).
- **Zero Hallucination:** If external model calls fail, deterministic rule synthesis ensures complete audit trails.

### Stage 7: Guardrailed Next Best Action (NBA) Engine
- **Purpose:** Analyzes the application's real-time state, missing evidence items, and friction indicators to generate prioritized next steps.
- **Action Categories:** Evidence upload prompts, identity verification dispatches, underwriter review escalations, and borrower advisories.

### Stage 8: Interactive What-If Scenario Simulator
- **Purpose:** Allows borrowers and relationship managers to run counterfactual stress-tests without mutating base application records.
- **Simulated Parameters:**
  - Revenue growth or contraction ($\pm 30\%$)
  - Working capital buffer adjustments ($+15$ days)
  - Additional collateral pledging (e.g. commercial property)
- **Output:** Dynamic recalibration of DSCR, max pre-approved credit ceiling, interest rate discount, and risk band.

### Stage 9: Force-Directed Trust Graph & Fraud Signals
- **Purpose:** Detects circular fund transfers, related-party accommodations, and multi-application fraud rings.
- **Graph Topology:** Force-directed network connecting borrower nodes, directors, GSTINs, counterparties, and linked bank accounts.
- **Flagged Patterns:** Rapid fund pass-throughs ($<24\text{ hours}$), shared PAN across multiple entities, and shell company transaction spikes.

### Stage 10: Multi-Tier Governance, Override Registry & Decision Replay
- **Separation of Duties (SoD):** Only authorized Credit Approvers can issue final financial sanction. System administrators have technical visibility but zero sanction authority.
- **Human Override Registry:** If a Risk Officer or Approver overrides an AI recommendation, the system records mandatory rationale codes, the original AI decision is preserved, and the event is co-signed.
- **18-Milestone Chronological Replay:** Every lifecycle milestone (Intent Created, Evidence Uploaded, OCR Extracted, Rule Evaluated, SHAP Computed, Override Logged, Sanction Issued) is rendered in an immutable timeline for regulatory inspection.

---

## 3. Institutional 7-Role Governance & Access Matrix

FinFlow AI strictly enforces role-based access control (RBAC) across seven operational personas, governed by a Master System Administrator:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   Institutional Master Administration                       │
│       Role 8: System Administrator (bhomeruturaj@gmail.com)                 │
│       - 1-Click 7-Role Emulation Deck for Hackathon & Jury Evaluation       │
│       - Observability, Telemetry, Re-Seed Demo Data, API Health             │
└──────┬───────────────────────┬───────────────────────┬──────────────────────┘
       │                       │                       │
       ▼                       ▼                       ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ First-Line   │       │ Second-Line  │       │ Third-Line   │
│ Operations   │       │ Risk Control │       │ Audit        │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ 1. CUSTOMER  │       │ 4. RISK_OFF  │       │ 7. AUDIT_OFF │
│ 2. RM        │       │ 5. RISK_MGR  │       │              │
│ 3. RM_SUP    │       │ 6. APPROVER  │       │              │
└──────────────┘       └──────────────┘       └──────────────┘
```

| # | Role Identifier | Persona Name | Operational Mandate | Permitted Actions |
|---|---|---|---|---|
| 1 | `CUSTOMER` | Priya Sharma | MSME Borrower (Sharma Textiles) | Submit loan intent, manage document vault, view sanction terms, run What-If simulations. |
| 2 | `RM` | Rohan Mehta | Commercial Lending Officer | Lead intake, borrower onboarding, dispatch KYC verifications, track application queue. |
| 3 | `RM_SUPERVISOR` | Vikram Malhotra | Credit Operations Manager | Balance RM caseloads, manage pipeline SLA bottlenecks, reassign distressed applications. |
| 4 | `RISK_OFFICER` | Ananya Iyer | Fraud & Credit Risk Analyst | Investigate circular fund signals, inspect SHAP waterfall, recommend loan adjustments. |
| 5 | `RISK_MANAGER` | Meera Krishnan | Supervisory Risk Head | Review policy exceptions, mandate additional covenants, supervise portfolio risk. |
| 6 | `CREDIT_APPROVER` | Rajesh Singhania | Credit Committee Chair | **Exclusive Sanction Power:** Formally sanction loans, approve interest rate matrices, co-sign overrides. |
| 7 | `AUDIT_OFFICER` | Sunita Rao | Director of Internal Audit | Independent read-only inspection, issue formal audit findings, verify 18-milestone decision replay. |
| 8 | `SYS_ADMIN` | Ruturaj Bhome | Technical Custodian | Master observability, role emulation, API health, Firestore sync. **Zero credit sanction power by design.** |

---

## 4. Codebase Architecture & Technology Stack

```
Mindcraft_RAY_Fintech/
├── backend/
│   ├── auth/                    # Firebase Auth JWT verification, RBAC guards
│   ├── config.py                # Central environment & Firebase configuration
│   ├── database/
│   │   ├── firestore_client.py  # Firestore client with in-memory fallback
│   │   ├── models.py            # Pydantic v2 schemas for all 20 entities
│   │   └── repositories/        # Repository pattern (encapsulated queries)
│   ├── modules/
│   │   ├── module1_intent/      # Intent discovery & product matching
│   │   ├── module2_journey/     # State machine & friction detection
│   │   ├── module3_financial/   # CashFlowEngine, ConsistencyEngine, OCR
│   │   ├── module3_risk/        # FinancialTrustScoreEngine (7-Pillar Alternative Score)
│   │   ├── module4_decision/    # PolicyRulesEngine, MLRiskModel, SHAPExplainer
│   │   ├── module5_trust/       # OverrideService, HumanReviewService
│   │   ├── module6_product/     # WhatIfSimulator, SafeActionAgent, DecisionReplay
│   │   ├── module7_trust_intelligence/ # TrustGraphService (Circular funds)
│   │   └── rag/                 # Dense vector policy embeddings & retrieval
│   ├── routers/                 # Modular FastAPI route controllers
│   ├── tests/                   # 212 automated tests (pytest)
│   └── main.py                  # Application entry point & middleware
│
├── frontend/
│   ├── src/
│   │   ├── api/                 # Central typed HTTP client, Firebase SDK v10
│   │   ├── components/          # Reusable UI tokens, Navbar, EmulationBanner
│   │   ├── context/             # AuthContext (dual persistence, admin emulation)
│   │   ├── pages/
│   │   │   ├── customer/        # CustomerPortal, DocumentVault, WhatIfPage
│   │   │   ├── rm/              # RMDashboard, RMSupervisorPage
│   │   │   ├── risk/            # RiskOfficerDashboard, RiskManagerDesk
│   │   │   ├── credit/          # CreditSanctionChamber
│   │   │   ├── audit/           # AuditGovernanceConsole, DecisionReplayPage
│   │   │   └── admin/           # AdminPage (7-Role Emulation Deck, Telemetry)
│   │   └── types/               # TypeScript interfaces & domain models
│   └── vite.config.ts           # Vite 8 configuration
│
├── firestore.rules              # Production Cloud Firestore Security Rules
├── firestore.indexes.json        # Composite indexes for queries
├── FINANCIAL_TRUST_SCORE_FORMULA.md # Mathematical reference documentation
└── pytest.ini                   # Automated test configuration
```

---

## 5. Mathematical Formulations Reference

### 5.1 Financial Trust Score ($0 - 100$)
$$\text{Trust Score}_{0-100} = \sum_{k=1}^{7} \left( \text{SubScore}_k \times W_k \right)$$
$$\text{CIBIL Scale (300-850)} = 300 + \lfloor 5.5 \times \text{Trust Score}_{0-100} \rfloor - P_{\text{fraud}}$$
$$\text{FinFlow Index (0-1000)} = \text{Trust Score}_{0-100} \times 10$$

### 5.2 Debt Service Coverage Ratio (DSCR)
$$\text{DSCR} = \frac{\text{Net Operating Cash Flow}}{\text{Total Monthly Debt Service (EMI)}} \ge 1.25\text{x}$$

### 5.3 Equated Monthly Installment (EMI)
$$\text{EMI} = P \times r \times \frac{(1+r)^n}{(1+r)^n - 1}$$

### 5.4 Revenue Consistency Index
$$\text{Coefficient of Variation (CV)} = \frac{\sigma_R}{\bar{R}}, \quad \text{Consistency} = \max\left(0, 1.0 - \min(\text{CV}, 1.0)\right) \times 100\%$$

### 5.5 SHAP Marginal Attribution
$$f(x) = \phi_0 + \sum_{i=1}^{M} \phi_i(x)$$
Where $\phi_0$ is portfolio baseline log-odds and $\phi_i(x)$ is the marginal impact of feature $i$.

---

## 6. Complete API Catalog

| HTTP Method | Route Endpoint | Description | Permitted Roles |
|---|---|---|---|
| `POST` | `/api/v1/intent` | Initialize loan intent and create journey | `CUSTOMER`, `SYS_ADMIN` |
| `GET` | `/api/v1/journeys/{id}` | Fetch current application & journey state | Authenticated |
| `POST` | `/api/v1/documents/upload` | Upload document to storage & compute SHA-256 | `CUSTOMER`, `RM`, `SYS_ADMIN` |
| `POST` | `/api/v1/documents/{id}/ocr` | Run OCR extraction with bounding boxes | All Staff, `SYS_ADMIN` |
| `GET` | `/api/v1/journeys/{id}/cashflow` | Compute DSCR, runway, and cash volatility | All Staff, `CUSTOMER` |
| `GET` | `/api/v1/journeys/{id}/financial-trust-score` | Compute 7-pillar Financial Trust Score | All Staff, `CUSTOMER` |
| `GET` | `/api/v1/journeys/{id}/trust-graph` | Fetch counterparty & fraud network graph | `RISK_*`, `AUDIT_*`, `SYS_ADMIN` |
| `POST` | `/api/v1/journeys/{id}/decision/generate` | Execute dual underwriting (Rules + ML) | All Staff, `SYS_ADMIN` |
| `GET` | `/api/v1/journeys/{id}/rag/explain` | Dense vector policy citations & narrative | All Staff, `SYS_ADMIN` |
| `POST` | `/api/v1/journeys/{id}/what-if` | Counterfactual stress-test simulation | `CUSTOMER`, All Staff |
| `POST` | `/api/v1/governance/override` | Register audited human override | `RISK_MGR`, `APPROVER` |
| `GET` | `/api/v1/journeys/{id}/replay` | Fetch 18-milestone chronological replay | `AUDIT_OFFICER`, `SYS_ADMIN` |
| `GET` | `/api/v1/admin/diagnostics` | System diagnostics & telemetry | `SYS_ADMIN` |

---

## 7. Verification & Acceptance Testing

- **Backend Pytest Suite:** 212 tests pass cleanly across unit, integration, and security boundaries.
- **Frontend TypeScript Build:** Vite 8 client compiles with zero warnings or errors.
- **Separation of Duties Verified:** Test suite explicitly verifies that `SYS_ADMIN` cannot trigger financial sanctions or execute un-cosigned overrides.
- **Cloud Persistence:** Verified dual-layer persistence writes to Cloud Firestore (`msme_profiles`, `users`, `document_vault`) in project `finflow-ray`.
