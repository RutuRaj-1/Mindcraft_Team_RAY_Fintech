# FinFlow AI — Frontend ↔ Backend Integration Audit & Contract Matrix

> **Audit Status:** Comprehensive System Analysis & Integration Blueprint  
> **Backend Base URL:** `http://localhost:8000/api/v1`  
> **Source of Truth:** FastAPI Python Services (`backend/routers/`, `backend/modules/`)  
> **Architecture Principle:** Frontend is a thin, reactive presentation layer. All financial rules, scores, eligibility, state transitions, and audit records originate from FastAPI.

---

## 1. System-Wide Architectural Audit (Steps 1–10)

### 1.1 Authentication & Profile Implementation (Step 4 & 5)
- **Token Mechanism:** `Authorization: Bearer <token>`.
- **Firebase Auth SDK:** Initialized in `backend/auth/firebase_auth.py` with fallback to high-fidelity demo tokens (`demo-customer`, `demo-rm`, `demo-rm-supervisor`, `demo-risk-officer`, `demo-risk-manager`, `demo-credit-approver`, `demo-audit-officer`, `demo-admin`).
- **Claim Extraction:** Verified via `firebase_admin.auth.verify_id_token()`. Claims extract `role`, `team_id`, and `delegated_limit_inr`.
- **Current Defect Found:** In several frontend components, `activeJourneyId` was hardcoded to `'jrn_priya_001'` or `'jrn_apex_003'` rather than dynamically syncing with the user's role profile or route params.

### 1.2 Frontend Routing & Shell (Steps 2 & 3)
- **Root Router:** `frontend/src/App.tsx` wrapped in `AuthProvider`, `NotificationProvider`, `QueryClientProvider`.
- **Navigation Shell:** `AppShell.tsx` renders `TopNavbar`, `Navbar`, and `Sidebar.tsx`.
- **Current Defect Found (Cross-Role Leakage):** `Sidebar.tsx` defines `navSections` with `roles` arrays, but **never filtered them** against `role`. Every user saw all 4 sections (Customer, RM, Risk, Admin). Furthermore, `RMCaseDetailPage` had a direct button navigating to `/risk/cases/:id` ("Route to Risk Officer"), allowing first-line RMs to leap directly into the risk console.

### 1.3 State Management & React Query
- React Query (TanStack Query v5) is set up with `staleTime: 5000` in `App.tsx`, but several pages (`CustomerDashboardPage`, `CustomerDocumentsPage`, `RiskConsolePage`, `RMQueuePage`) were manually doing `useState` + `useEffect` + `Promise.all` with `.catch(() => null)`, swallowing backend error messages and defaulting to mock strings when requests failed!

---

## 2. Frontend ↔ Backend Integration Matrix (Step 11)

The following matrix audits every single page in the application, mapping it to the exact live backend contracts, identifying hardcoded/mocked data, and defining required loading, error, and empty states.

| Page / Route | Role Scope | Backend Endpoint(s) | HTTP Method | Request Schema | Response Schema | Current Hardcoded / Mocked Data | Required Integration Fix |
|---|---|---|:---:|---|---|---|---|
| **Landing & Auth**<br/>`/`, `/signin`, `/signup` | Public | `/api/v1/auth/session`<br/>`/api/v1/auth/me`<br/>`/api/v1/auth/personas` | `POST`<br/>`GET`<br/>`GET` | `{ role?: UserRole, token?: string }` | `{ token: string, user: AuthenticatedUser }`<br/>`List[PersonaInfo]` | Demo persona list in `SignInPage.tsx` was static and missing new roles. | Connect `GET /api/v1/auth/personas` to render dynamic live demo accounts. |
| **Customer Dashboard**<br/>`/customer` | `CUSTOMER`<br/>(`AUDIT_OFFICER` read) | `/api/v1/journeys/{id}`<br/>`/api/v1/journeys/{id}/actions`<br/>`/api/v1/journeys/{id}/cashflow`<br/>`/api/v1/journeys/{id}/documents`<br/>`/api/v1/journeys/{id}/decision` | `GET` | None | `JourneyRecord`<br/>`NextBestActionsResponse`<br/>`CashFlowMetrics`<br/>`DocumentRecord[]`<br/>`DecisionRecord` | 1. Pre-Approved Limit: `"₹15.00 Lakhs"` hardcoded.<br/>2. Trust Score: `"780 / 1000"` hardcoded.<br/>3. DSCR: `"1.45x DSCR"` hardcoded.<br/>4. Verified Documents: `"4 / 4 Verified"` hardcoded.<br/>5. Fallback primary action hardcoded. | Wire `getCashFlowMetrics()`, `getDecision()`, and `listDocuments()` to dynamically populate real DSCR, limit, verified count, and live Next Best Action. |
| **Customer Loan Application**<br/>`/customer/apply` | `CUSTOMER`<br/>`RM` | `/api/v1/intent/parse`<br/>`/api/v1/intent/submit`<br/>`/api/v1/journeys` | `POST` | `{ natural_text?: string, answers?: dict, normalized_intent?: dict }` | `IntentSubmitResponse`<br/>`JourneyRecord` | Wizard was storing intent in local component state without advancing journey stage via backend. | Ensure `submitIntent` triggers backend orchestration, creates journey in Firestore, and redirects to `/customer/documents/{id}`. |
| **Customer Journey State**<br/>`/customer/journey/:id` | `CUSTOMER`<br/>`AUDIT_OFFICER` | `/api/v1/journeys/{id}`<br/>`/api/v1/journeys/{id}/friction`<br/>`/api/v1/journeys/{id}/actions` | `GET` | None | `JourneyRecord`<br/>`JourneyFrictionMetrics`<br/>`NextBestActionsResponse` | Stage durations and step notes fallback to simulated values. | Bind directly to `journey.steps[]` and `getFriction(id)` from backend FSM engine. |
| **Customer Documents & Evidence**<br/>`/customer/documents/:id` | `CUSTOMER`<br/>`RM`<br/>`AUDIT_OFFICER` | `/api/v1/journeys/{id}/documents`<br/>`/api/v1/journeys/{id}/documents` (upload)<br/>`/api/v1/journeys/{id}/evidence`<br/>`/api/v1/journeys/{id}/digilocker/available`<br/>`/api/v1/journeys/{id}/digilocker/import` | `GET`<br/>`POST`<br/>`GET`<br/>`GET`<br/>`POST` | `multipart/form-data`<br/>`{ credential_type: string }` | `DocumentRecord[]`<br/>`EvidenceItem[]`<br/>`DigiLockerCredential[]` | DigiLocker credentials imported locally without refetching live Evidence Ledger. | Bind live `listDocuments()` and `getEvidenceLedger()`. When document is uploaded, poll until `ocrStatus == 'COMPLETED'`. |
| **Customer Decision & Terms**<br/>`/customer/decision/:id` | `CUSTOMER`<br/>`AUDIT_OFFICER` | `/api/v1/journeys/{id}/decision`<br/>`/api/v1/journeys/{id}/shap`<br/>`/api/v1/journeys/{id}/what-if`<br/>`/api/v1/journeys/{id}/advance` | `GET`<br/>`POST` | `{ target_stage: string, notes?: string }`<br/>`WhatIfRequest` | `DecisionRecord`<br/>`SHAPAttribution`<br/>`WhatIfResponse` | What-if simulation parameters were sending local heuristics if backend call failed. | Treat `DecisionRecord` and `SHAPAttribution` as single source of truth. Accept offer advances stage via `api.advanceStage(id, 'SANCTIONED')`. |
| **Customer Cash Flow**<br/>`/customer/cashflow/:id` | `CUSTOMER`<br/>`RM`<br/>`RISK_OFFICER` | `/api/v1/journeys/{id}/cashflow`<br/>`/api/v1/journeys/{id}/trust-graph` | `GET` | None | `CashFlowMetrics`<br/>`TrustGraph` | Inflows/Outflows chart had static fallback points. | Bind directly to `cashflow.monthly_trend[]` calculated from OCR bank statement extractions. |
| **RM Underwriting Queue**<br/>`/rm` | `RM`<br/>`RM_SUPERVISOR`<br/>`AUDIT_OFFICER` | `/api/v1/dashboard/queue?status_filter={filter}`<br/>`/api/v1/dashboard/metrics` | `GET` | None | `QueueItem[]`<br/>`Record<string, Any>` | Queue filtering was done partially in-memory on stale items. Total volume KPI was calculated over filtered slice. | Call live `getOfficerQueue(filter)` and `getPortfolioMetrics()` directly. |
| **RM Case Reconciliation**<br/>`/rm/cases/:id` | `RM`<br/>`RM_SUPERVISOR`<br/>`AUDIT_OFFICER` | `/api/v1/journeys/{id}`<br/>`/api/v1/journeys/{id}/consistency`<br/>`/api/v1/journeys/{id}/evidence`<br/>`/api/v1/journeys/{id}/decision`<br/>`/api/v1/journeys/{id}/review` | `GET`<br/>`POST` | `{ notes?: string }` | `JourneyRecord`<br/>`ConsistencyReport`<br/>`EvidenceItem[]`<br/>`DecisionRecord`<br/>`HumanReview` | Direct `<Link to="/risk/cases/:id">` violated Separation of Duties. | Replace direct link with **"Recommend Escalation to Risk"** button that invokes `api.startReview(id, notes)`. |
| **RM Supervisor Dashboard**<br/>`/operations` *(NEW)* | `RM_SUPERVISOR` | `/api/v1/dashboard/queue`<br/>`/api/v1/dashboard/metrics`<br/>`/api/v1/reviews?status=OPEN` | `GET` | None | `QueueItem[]`<br/>`Record<string, Any>`<br/>`HumanReview[]` | Page did not exist. Supervisor was forced to use generic RM queue. | Build dedicated `RMSupervisorDashboardPage.tsx` with pipeline SLA breach monitor, RM case load distribution, and operational exception waivers. |
| **Risk & Trust Console**<br/>`/risk` | `RISK_OFFICER`<br/>`RISK_MANAGER`<br/>`AUDIT_OFFICER` | `/api/v1/dashboard/queue`<br/>`/api/v1/fraud/network`<br/>`/api/v1/dashboard/metrics` | `GET` | None | `QueueItem[]`<br/>`FraudNetworkResponse`<br/>`Record<string, Any>` | KPI metrics ("48 Nodes", "₹45.0 Lakhs") were hardcoded numbers in `RiskConsolePage.tsx`. Trust graph hardcoded to `jrn_apex_003`. | Bind KPIs to `fraudNetwork.nodes.length`, `fraudNetwork.edges.length`, and `fraudNetwork.signals.length`. Render live cross-application fraud network. |
| **Risk Case Audit & Detail**<br/>`/risk/cases/:id` | `RISK_OFFICER`<br/>`RISK_MANAGER`<br/>`CREDIT_APPROVER` | `/api/v1/journeys/{id}`<br/>`/api/v1/journeys/{id}/consistency`<br/>`/api/v1/journeys/{id}/trust-graph`<br/>`/api/v1/journeys/{id}/fraud-signals`<br/>`/api/v1/journeys/{id}/reviews`<br/>`/api/v1/journeys/{id}/review/{revId}/submit` | `GET`<br/>`POST` | `SubmitReviewRequest` | `ConsistencyReport`<br/>`TrustGraph`<br/>`JourneyFraudSignalsResponse`<br/>`HumanReview[]` | Human review form was in separate component, not unified into case workflow. | Mount unified `RiskOfficerConsole` displaying Consistency Engine, Trust Graph, Cross-App Fraud Signals, Decision Replay, and Human Review Workflow with live API submission. |
| **Senior Risk Manager Desk**<br/>`/risk-manager` *(NEW)* | `RISK_MANAGER` | `/api/v1/reviews?role=RISK_OFFICER`<br/>`/api/v1/audit/cases`<br/>`/api/v1/dashboard/metrics` | `GET` | None | `HumanReview[]`<br/>`Record<string, Any>` | Page did not exist. Senior Risk Manager lacked supervisory challenge desk. | Build `RiskManagerDeskPage.tsx`: Review Risk Officer assessments, challenge rationale, approve up to ₹1 Crore, or escalate to Credit Approver. |
| **Credit Approver Chamber**<br/>`/approvals` *(NEW)* | `CREDIT_APPROVER` | `/api/v1/reviews?status=ESCALATED`<br/>`/api/v1/journeys/{id}/decision`<br/>`/api/v1/journeys/{id}/review/{revId}/submit` | `GET`<br/>`POST` | `SubmitReviewRequest` | `HumanReview[]`<br/>`DecisionRecord` | Page did not exist. Credit Approver lacked executive sanction desk. | Build `CreditSanctionChamberPage.tsx`: Inspect sealed Decision Packages (Evidence + ML + SHAP + RM Rec + Risk Mgr Rec), approve/decline with mandatory terms. |
| **Independent Audit Console**<br/>`/audit` *(NEW)* | `AUDIT_OFFICER` | `/api/v1/audit/cases`<br/>`/api/v1/audit/findings`<br/>`/api/v1/audit/findings` (POST)<br/>`/api/v1/audit/override-analytics`<br/>`/api/v1/journeys/{id}/replay` | `GET`<br/>`POST` | `CreateFindingRequest` | `List[AuditCase]`<br/>`List[AuditFinding]`<br/>`OverrideAnalyticsResponse`<br/>`DecisionReplayResponse` | Audit Officer was routed to generic `/risk/replay` with no findings or override pattern analytics. | Build `AuditGovernanceConsolePage.tsx`: Full Decision Replay, Evidence Ledger verification, live Override Pattern Analytics, and Audit Finding issuance. |
| **System Admin Console**<br/>`/admin` | `SYS_ADMIN`<br/>(`ADMIN` alias) | `/api/v1/dashboard/metrics`<br/>`/api/v1/feedback/learning-stats`<br/>`/api/v1/auth/claims` (POST) | `GET`<br/>`POST` | `AssignRoleRequest` | `Record<string, Any>` | System Admin had buttons to inspect case credit overrides, violating SoD. | Clean `AdminConsole.tsx` to display pure technical telemetry (API latency, STP rate, database connectivity, role claim provisioning). |

---

## 3. Core Contract & State Enforcements

### 3.1 Loading States
Every page must render high-fidelity, shimmer skeleton loaders (`<Skeleton variant="rect" />`) matching the layout geometry while live queries execute, preventing layout shift.

### 3.2 Error States
When network or authorization errors occur (e.g. HTTP 403 Forbidden due to delegated limit breach), the page must render a themed `<ErrorState title="..." message="..." onRetry={...} />` detailing the exact institutional reason rather than a blank screen or raw alert.

### 3.3 Empty States
When a queue, audit finding list, or document list is empty, render a helpful empty state with clear next actions (e.g. *"No pending cases in your underwriting queue. Switch persona or re-seed benchmark data to test."*).

---

## 4. Next Implementation Execution Plan

1. **Fix `Sidebar.tsx`:** Filter navigation items strictly by active `role`. Remove cross-role options.
2. **Build Dedicated Role Dashboards:**
   - Role 4: `RMSupervisorDashboardPage.tsx` (`/operations`)
   - Role 5: `RiskManagerDeskPage.tsx` (`/risk-manager`)
   - Role 6: `CreditSanctionChamberPage.tsx` (`/approvals`)
   - Role 7: `AuditGovernanceConsolePage.tsx` (`/audit`)
3. **Enhance Customer Pages with Live API Data:**
   - Replace hardcoded metrics in `CustomerDashboardPage.tsx` with live data from `getCashFlowMetrics()`, `getDecision()`, and `listDocuments()`.
   - Add the 5-stage Customer Transparency Chain.
4. **Fix Backend Role Guards in `governance_router.py`:**
   - Update `get_officer_queue` and `get_portfolio_metrics` to accept all institutional roles.
5. **Verify All Routes & Role Transitions:**
   - Test seamless navigation from Sign-In $\rightarrow$ Persona Switch $\rightarrow$ Correct Role Dashboard $\rightarrow$ Action execution.
