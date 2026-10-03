# FinFlow AI — Enterprise Intelligent Financial Journey Orchestration
**Product Platform:** FinFlow AI · **Domain:** SME Lending & FinTech Credit Underwriting · **Team RAY:** Ruturaj Bhome

---

## 1. Problem Statement

Traditional Small and Medium Enterprise (SME) lending is severely fragmented, opaque, and sluggish:
- **Disjointed User Journeys:** Applicants submit documents into digital voids without visibility into timeline, underwriting requirements, or status.
- **Manual Verification Bottlenecks:** Human loan officers manually cross-check bank statement credits against Goods & Services Tax (GST) returns and Income Tax Returns (ITR), leading to multi-week turnaround times.
- **Black-Box AI Skepticism:** Unexplainable deep models or generic LLMs hallucinate financial metrics and cannot be cited in regulated credit committees.
- **Fraud & Circular Fund Transfers:** Fraudulent entities deploy accommodation entries, invoice recycling, and shell company networks that slip past isolated document-level checks.
- **Audit Deficits:** Traditional loan management systems fail to cryptographically link raw customer evidence to underwriting feature calculations and final sanction letters.

---

## 2. FinFlow AI Solution

**FinFlow AI** unifies the entire lending lifecycle into one continuous, intelligent, and explainable product:
- **Guided Intent & Journey Orchestration:** Conversational and structured intent ingestion with an append-only canonical state machine (`INTENT_CAPTURE` → `EVIDENCE_COLLECTION` → `VERIFICATION` → `RISK_ASSESSMENT` → `EXPLAINABLE_DECISION` → `SANCTION_AND_DISBURSAL` / `HUMAN_REVIEW`).
- **Cryptographic Evidence Ledger:** Optical Character Recognition (FinFlow OCR v2.1) extracts key financial fields with pixel-level bounding boxes and immutable SHA-256 source document hashes.
- **Deterministic Reconciliation & Cash Flow Engine:** Automated cross-triangulation between GST returns and banking statements with sub-5% variance verification, Debt Service Coverage Ratio (DSCR) calculations, and operating cash-flow volatility analysis.
- **Dual-Engine Underwriting (Rules + ML):** Authoritative hard policy gates (DSCR ≥ 1.25x, Vintage ≥ 24m, Bounces ≤ 2) combined with a calibrated gradient-boosted default model.
- **White-Box Explainability:** TreeExplainer SHAP marginal feature contributions paired with Dense Vector Policy RAG citations to credit policy guidelines.
- **Interactive What-If Simulation:** Borrowers and underwriters simulate revenue stress-tests, buffer-day shifts, and collateral additions to view dynamic credit term impacts without mutating base records.
- **Four-Tier Enterprise Governance:** Visually and programmatically enforces Separation of Duties across `MODEL_OUTPUT` (AI), `INDEPENDENT_REVIEW` (Risk Officer), `AUTHORIZED_DECISION` (Credit Approver), and `INDEPENDENT_AUDIT` (Audit Officer).
- **Cryptographic Decision Replay:** 18 canonical chronological milestones logged to an immutable append-only ledger for instant regulatory audit playback.

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             FinFlow AI Web UI                               │
│        React 19 + TypeScript + Vite + Tailwind CSS + Force Graph            │
└──────┬───────────────────────────────┬───────────────────────────────┬──────┘
       │ (SME Customer Console)        │ (RM Officer Console)          │ (Risk & Audit Consoles)
       ▼                               ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FastAPI Gateway & Routers                         │
│  - Intent & Journey Router         - Cash Flow & Consistency Router         │
│  - Document Gateway & OCR Router   - Risk Assessment & SHAP Router          │
│  - Policy RAG & Decision Router    - Safe Action & Governance Router        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│    Core Analytical Models    │              │   Immutable Storage Layer    │
│ - Scikit-Learn SME Risk      │              │ - Firestore / In-Memory DB   │
│ - SHAP TreeExplainer v0.42   │              │ - Evidence Ledger (SHA-256)  │
│ - Dense Policy RAG (BGE)     │              │ - Append-Only Decision Replay│
│ - Force-Directed Trust Graph │              │ - Human Override Registry    │
└──────────────────────────────┘              └──────────────────────────────┘
```

---

## 4. Technology Stack

| Layer | Component | Description |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite 8 | Ultra-fast client build, strict type safety, zero legacy dependencies |
| **Styling & UI** | Tailwind CSS v4, Lucide Icons | Responsive fintech design system with dark/light glassmorphic tokens |
| **Charts & Graphs** | Recharts, SVG Force-Directed Graph | Cash-flow waterfall charts, DSCR trends, promoter-supplier network maps |
| **Backend API** | FastAPI, Uvicorn, Python 3.11+ | Asynchronous REST endpoints, typed Pydantic v2 schemas, modular routers |
| **Machine Learning**| scikit-learn, NumPy | Calibrated default probability estimator for SME balance sheet risk |
| **Explainability** | SHAP (SHapley Additive exPlanations) | TreeExplainer marginal contributions attributing risk to specific factors |
| **Document OCR** | FinFlow-OCR-v2.1 / LayoutLMv3 | Key-value extraction with bounding boxes and document fingerprinting |
| **Vector RAG** | Dense Embedding Cosine Similarity | Institutional credit policy retrieval without external hallucination |
| **Data & Auth** | Google Cloud Firestore / Firebase Auth | Distributed document store, server-side RBAC, and verified ID tokens |

---

## 5. Local Setup & Quickstart

### Prerequisites
- Python 3.11 or higher
- Node.js 18+ and npm 9+
- Git

### 1. Clone & Environment Configuration
```bash
git clone https://github.com/RutuRaj-1/Mindcraft_Team_RAY_Fintech.git
cd Mindcraft_RAY_Fintech
```

### 2. Backend Setup
```bash
# Optional: create a python virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install backend dependencies
pip install -r backend/requirements.txt

# Start backend server
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
*Backend runs at `http://localhost:8000`. Swagger API documentation is available at `http://localhost:8000/docs`.*

### 3. Frontend Setup
```bash
# In a separate terminal
cd frontend
npm install
npm run dev -- --port 5173
```
*Frontend runs at `http://localhost:5173`.*

---

## 6. Environment Variables

Create `.env` inside `backend/` (template available in `backend/.env.example`):

```ini
# Application Configuration
APP_NAME=FinFlow-AI
ENVIRONMENT=development
PORT=8000
DEBUG=True

# Security & CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173
SECRET_KEY=finflow-super-secure-production-key-for-jwt-and-signing

# Firebase Configuration
FIREBASE_PROJECT_ID=finflow-mindcraft
# Optional: Path to service account json for live Firebase integration
# GOOGLE_APPLICATION_CREDENTIALS=backend/credentials/firebase-service-account.json
USE_IN_MEMORY_FIRESTORE=True

# AI & RAG Configuration
FALLBACK_DETERMINISTIC_LLM=True
POLICY_DOCS_PATH=backend/data/policies
```

Create `.env` inside `frontend/` (template available in `frontend/.env.example`):

```ini
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_FIREBASE_API_KEY=mock-firebase-key
VITE_FIREBASE_AUTH_DOMAIN=finflow-mindcraft.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=finflow-mindcraft
```

---

## 7. Sample Users & Role-Based Access Control (RBAC)

FinFlow AI implements strict role separation. Log in with the following demo credentials via the login interface or quick-switch header:

| Role | Email / Identifier | Persona | Permitted Capabilities |
|---|---|---|---|
| **SME Customer** | `priya@sharmatextiles.com` | Priya Sharma | Apply for loan, upload KYC/GST docs, view personalized decision & What-If simulator |
| **Loan Officer (RM)** | `rohan.mehta@finflow.bank` | Rohan Mehta | Review borrower applications, request missing evidence, verify customer uploads |
| **Risk & Compliance** | `ananya.iyer@finflow.bank` | Ananya Iyer | Audit discrepancy alerts, view cross-app linked signals, inspect SHAP waterfall, execute overrides |
| **Credit Approver** | `approver@finflow.bank` | Vikram Malhotra | Final financial sanction authority, approve conditional terms, co-sign overrides |
| **Audit Officer** | `audit@finflow.bank` | Meera Joshi | Read-only inspection of immutable Decision Replay, cryptographic hash validation |
| **System Admin** | `admin@finflow.bank` | Dev Admin | System configuration, seed data resets (*Zero financial decision authority*) |

---

## 8. End-to-End User Journey

```
1. Customer Login & Intent Capture
   - Enter ₹15,00,000 working capital request for Sharma Textiles
   - Specify 12-month tenor and business operational vintage (48 months)

2. Document Ingestion & Optical OCR
   - Upload 6-month HDFC Bank Statement and GSTR-3B filings
   - Bounding-box visual extraction with tamper-evident SHA-256 hash sealing

3. Evidence Ledger & Consistency Engine
   - 6 financial metrics committed to immutable ledger
   - Cross-reconciliation check: GST sales (₹1.45 Cr) vs Banking credits (₹1.42 Cr) -> Consistent (< 2.1% variance)

4. Cash Flow & Financial Health
   - Debt Service Coverage Ratio computed: 1.85x
   - Inward cheque returns: 0 bounces; working capital buffer: 38 days

5. Underwriting Risk & SHAP Explainability
   - 5/5 Hard Policy Gates passed
   - Scikit-learn Risk Model yields 920/1000 Trust Score (8% PD, LOW_RISK)
   - SHAP Waterfall confirms DSCR and clean banking as primary risk reducers

6. RAG Policy Citation & Sanction Offer
   - System cites "POL-SME-4.1 (Vintage)" and "POL-SME-5.2 (DSCR)"
   - Automated prime approval: ₹15,00,000 @ 10.75% p.a.

7. What-If Counterfactual Simulation
   - Borrower explores tenor adjustments and revenue shocks dynamically

8. Human Oversight & Decision Replay
   - Regulators and audit officers review 18 chronological milestones with full input/output logs
```

---

## 9. API Summary

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/v1/journeys/intent` | Initialize new SME credit journey | Customer, RM |
| `GET` | `/api/v1/journeys/{id}` | Retrieve comprehensive journey state | Authenticated |
| `POST` | `/api/v1/documents/upload` | Upload financial document with SHA-256 | Customer, RM |
| `GET` | `/api/v1/evidence/{app_id}` | Fetch immutable evidence ledger items | Authenticated |
| `GET` | `/api/v1/consistency/{app_id}`| Run cross-document consistency verification | Authenticated |
| `GET` | `/api/v1/cashflow/{app_id}` | Calculate cash-flow metrics (DSCR, AMB) | Authenticated |
| `POST` | `/api/v1/risk/assess/{app_id}`| Execute hard rules + scikit-learn risk engine| Officer, Approver |
| `GET` | `/api/v1/risk/shap/{app_id}` | Fetch SHAP feature attribution waterfall | Authenticated |
| `GET` | `/api/v1/journeys/{id}/decision`| Fetch synthesized explainable decision | Authenticated |
| `POST` | `/api/v1/journeys/{id}/what-if`| Run counterfactual sensitivity simulation | Authenticated |
| `GET` | `/api/v1/journeys/{id}/actions`| Retrieve ranked Next Best Actions | Authenticated |
| `POST` | `/api/v1/governance/reviews/override`| Submit authorized underwriter override | Risk Officer, Approver |
| `GET` | `/api/v1/replay/timeline/{app_id}`| Retrieve chronological 18-milestone audit replay| Audit, Officers |
| `POST` | `/api/v1/demo/reset` | Reset benchmark demonstration cases | All (Demo Mode) |

---

## 10. Screen & Workflow Placeholders

- **SME Customer Journey**: `docs/screenshots/customer_journey.png` (Application submission & status tracking)
- **OCR Evidence Inspector**: `docs/screenshots/evidence_inspector.png` (Bounding box optical verification)
- **Credit Sanction Chamber**: `docs/screenshots/credit_sanction.png` (SHAP waterfall & policy citation breakdown)
- **Financial Trust Graph**: `docs/screenshots/trust_graph.png` (Promoter-supplier transaction topology)
- **Decision Replay Console**: `docs/screenshots/decision_replay.png` (Milestone timeline with cryptographic hash verify)

---

## 11. Testing & Build Verification

```bash
# Run backend test suite (204 passing tests)
python -m pytest

# Run acceptance test cases TC-01 through TC-11
python -m pytest backend/tests/test_final_acceptance_tcs.py

# Run frontend lint, typecheck, and production bundle
cd frontend
npm run lint
npx tsc --noEmit
npm run build
```

---

## License & Attribution
MindCraft Hackathon 2026 · Team RAY · Ruturaj Bhome. Built under MIT License.
