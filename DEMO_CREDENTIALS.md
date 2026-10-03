# FinFlow AI — Demo Personas & Governed Credentials Mapping

> **Document Status:** Authoritative Demo & Evaluation Reference  
> **Version:** 2.1.0  
> **Environment:** Safe Demo Mode (FastAPI + Firestore / In-Memory Seeded Repository)

---

## 1. Demo User Mapping (7 Institutional Roles + 1 Customer)

All roles are pre-seeded in the system and compatible with both **Demo Mode** (instant JWT/bearer injection) and **Firebase Auth Mode** (standard email/password sign-in).

| Role Key | Name | Email | Authorized Scope / Limits | Default Workspace Route | Demo Token Header |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CUSTOMER** | Priya Sharma | `priya@sharmatextiles.in` | Own Applications Only | `/customer` | `Bearer demo-customer` |
| **RM** | Rohan Mehta | `rohan.mehta@finflowbank.com` | First-Line Triage, Intake, Docs | `/rm` | `Bearer demo-rm` |
| **RM_SUPERVISOR** | Vikram Malhotra | `vikram.malhotra@finflowbank.com` | Operations Queue, Team Oversight | `/operations` | `Bearer demo-rm-supervisor` |
| **RISK_OFFICER** | Ananya Iyer | `ananya.iyer@finflowbank.com` | Second-Line Risk Desk (≤ ₹25 Lakhs) | `/risk` | `Bearer demo-risk-officer` |
| **RISK_MANAGER** | Meera Krishnan | `meera.krishnan@finflowbank.com` | Second-Line Review & Exceptions | `/risk-manager` | `Bearer demo-risk-manager` |
| **CREDIT_APPROVER** | Rajesh Singhania | `rajesh.singhania@finflowbank.com` | Sanction Authority (> ₹25 Lakhs) | `/approvals` | `Bearer demo-credit-approver` |
| **AUDIT_OFFICER** | Sunita Rao | `sunita.rao@finflowbank.com` | Independent Third-Line Assurance | `/audit` | `Bearer demo-audit-officer` |
| **ADMIN** | Admin User | `admin@finflowbank.com` | Technical System Custodian | `/admin` | `Bearer demo-admin` |

> [!IMPORTANT]
> **No Production Credentials Committed:**
> Passwords for local testing are pre-configured to `DemoPass@123` when using Firebase Authentication. In Demo Mode, password authentication is bypassed entirely in favor of deterministic persona token injection.

---

## 2. Seeded Benchmark Scenarios (Cases A through E)

FinFlow AI provides five canonical end-to-end benchmark scenarios accessible directly via `/demo`:

### Case A — Clean & Prime Approved (`jrn_priya_001`)
- **Borrower:** Sharma Textiles Private Limited (Priya Sharma)
- **Requested Facility:** ₹15,00,000 (12M working capital)
- **Evidence Status:** 100% complete (GSTR-3B filings, 6M HDFC Bank Statement with SHA-256 provenance)
- **Financial Metrics:** Healthy DSCR of **1.85x**, 0 inward cheque bounces, consistent turnover of ₹1.45 Cr
- **Model Verdict:** Low Risk, FinFlow Trust Score: **920 / 1000**
- **Decision:** Auto-Approved @ 10.75% prime interest rate
- **Next Best Action:** Issue digital sanction agreement for borrower electronic acceptance

### Case B — Missing Evidence (`jrn_kavita_002`)
- **Borrower:** Kavita Electronics Retail LLP
- **Requested Facility:** ₹25,00,000 (18M)
- **Evidence Status:** Missing 6-month operational bank statement
- **Model Verdict:** Halted at `EVIDENCE_COLLECTION` stage (62% completeness)
- **Decision Outcome:** `NEEDS_REVIEW`
- **Next Best Action:** RM requests missing bank statement document from applicant

### Case C — Inconsistent Evidence (`jrn_apex_003`)
- **Borrower:** Apex Logistics & Freight Solutions
- **Requested Facility:** ₹35,00,000
- **Evidence Status:** 37.5% turnover discrepancy detected between GST returns (₹80L) and Bank credits (₹50L)
- **Policy Flag:** Hard Rule `R05_CONSISTENCY` fails (>15% variance threshold)
- **Model Verdict:** High Risk, FinFlow Trust Score drops to **410 / 1000**
- **Decision Outcome:** `HUMAN_REVIEW` mandatory routing
- **Next Best Action:** Risk Officer review & institutional override request (conditional approval with collateral pledge)

### Case D — Linked Application Signal (`jrn_swifttrans_004`)
- **Borrower:** SwiftTrans Freightways Pvt Ltd
- **Scenario:** Multi-entity Trust Graph detects shared synthetic telephone identifier, duplicate bank routing, and shared document hashes with Apex Logistics
- **Model Verdict:** `POTENTIAL_LINKED_CASE_SIGNAL` (Phrased neutrally: "Potential linked-case signal", never "Fraud confirmed")
- **Governance Route:** Escalated to Second-Line Risk Review

### Case E — What-If Counterfactual Sandbox (`jrn_priya_001`)
- **Baseline:** ₹15,00,000 working capital @ 10.75% APR, DSCR 1.85x
- **Scenario:** Hypothetical stress-test (e.g. increase facility to ₹25,00,000 or apply -20% revenue shock)
- **Behavior:** Real-time recalculation of EMI, DSCR, affordability, and SHAP risk impact. **Baseline data remains untouched and immutable.**

---

## 3. Separation of Duties (SoD) & Negative Test Matrix

The FastAPI backend enforces strict role-based access control (RBAC). The following negative security tests are verified in `backend/tests/test_auth_rbac.py` and `backend/tests/test_rbac_end_to_end.py`:

| Role Attempting Action | Target Endpoint / Action | Expected Result | Enforcement Layer |
| :--- | :--- | :--- | :--- |
| **CUSTOMER** | `GET /api/v1/rm/queue` | `403 Forbidden` | FastAPI Dependency (`require_role`) |
| **RM** | `POST /api/v1/decisions/{id}/approve` | `403 Forbidden` | Credit Authority Gate |
| **RISK_OFFICER** | `GET /api/v1/admin/users` | `403 Forbidden` | System Admin Boundary |
| **AUDIT_OFFICER** | `POST /api/v1/reviews/override` | `403 Forbidden` | SoD: Audit is strictly Read-Only |
| **ADMIN** | `POST /api/v1/decisions/{id}/approve` | `403 Forbidden` | SoD: Admin has ZERO financial power |
| **CUSTOMER A** | Access Customer B's Journey / Docs | `403 Forbidden` | Application Ownership Check |
| **ANY** | Invalid / Malformed / Expired Token | `401 Unauthorized` | JWT Signature Validation |

---

## 4. How to Run & Verify

### Backend Test Suite
```bash
python -m pytest
# 193 passed in 13.10s
```

### Frontend Build
```bash
cd frontend
npm run build
# tsc -b && vite build (Exit Code 0)
```

### Accessing Demo Mode
1. Open browser at `http://localhost:5173/demo`.
2. Select any of the 5 canonical benchmark scenarios.
3. Click any of the 6 governed role buttons (`OPEN CUSTOMER VIEW`, `OPEN RM VIEW`, `OPEN RISK VIEW`, `OPEN SUPERVISOR VIEW`, `OPEN APPROVER VIEW`, `OPEN AUDIT VIEW`).
4. The system updates the authenticated session token and navigates directly into that persona's governed workspace.
