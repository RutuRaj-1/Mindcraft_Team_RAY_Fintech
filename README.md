# FinFlow AI — Intelligent & Explainable Financial Journey Orchestration
**Hackathon Project:** MindCraft · **Domain:** Fintech · **Team RAY:** Ruturaj Bhome

---

## Executive Summary

**FinFlow AI** unifies fragmented SME working-capital lending into a continuous, guided, and explainable journey. By pairing deterministic financial guardrails with scikit-learn probability models, SHAP feature attributions, and a graph-based **Financial Trust Intelligence Layer**, FinFlow AI enables sub-2-minute underwriting decisions with zero hallucination and complete auditability.

```
Intent Capture ──► Evidence & OCR ──► Reconciliation ──► Risk & Scoring ──► Explainable Sanction ──► Action & Human Oversight
```

---

## Architecture & Technology Stack

| Layer | Technology | Key Capabilities |
|---|---|---|
| **Frontend** | React 19 + TypeScript + Vite | TailwindCSS v4, Recharts, Lucide Icons, Canvas Confetti, Force-directed Trust Graph |
| **Backend** | FastAPI + Python 3.11+ | Asynchronous REST API, In-memory Firestore Client, Modular Router Architecture |
| **Machine Learning** | scikit-learn + SHAP | Gradient-boosted probability-of-default model, TreeExplainer marginal attributions |
| **Decision Intelligence** | Deterministic Rules + RAG | Hard eligibility gates, Cosine similarity policy retrieval over institutional credit guidelines |
| **Trust Intelligence** | Network Graph + SHA-256 | Circular fund-routing detection, cross-entity duplicate PAN/GST alerts, tamper-proof hashes |

---

## 7 Bounded Modules

1. **Module 1 — Intent & Problem Understanding**: Structured capture of borrowing needs, operational vintage, turnover, and facility tenor.
2. **Module 2 — Journey Orchestration & State Machine**: Append-only canonical state machine (`INTENT_CAPTURE` → `EVIDENCE_COLLECTION` → `VERIFICATION` → `RISK_SCORING` → `EXPLAINABLE_DECISION` → `SANCTIONED` / `HUMAN_REVIEW`).
3. **Module 3 — Core Financial Processing**: 6-month cash-flow analysis, Debt Service Coverage Ratio (DSCR), runway burn rate, and multi-source cross-reconciliation (Bank Statements vs GSTR-3B vs ITR).
4. **Module 4 — AI Decision Intelligence**: Deterministic eligibility gates (DSCR ≥ 1.25x, Vintage ≥ 24m, Bounces = 0) + calibrated ML risk scores + SHAP waterfall explanations + RAG policy citations.
5. **Module 5 — Trust, Governance & Human Oversight**: Underwriter override ledger with co-signing, append-only cryptographic audit logs, and Straight-Through Processing (STP) observability.
6. **Module 6 — Product, Dashboard & Demo Layer**: Role-aware consoles for SME Customer, Relationship Manager, Risk Officer, and System Administrator.
7. **Module 7 — Financial Trust Intelligence Layer**: Interactive force-directed network graph identifying promoter ownership, buyer/supplier tiers, circular funds transfers, and shell entity linkages.

---

## 3 Pre-Seeded Benchmark Scenarios

FinFlow AI automatically seeds 3 benchmark cases upon startup for zero-config demonstration:

1. **Sharma Textiles Pvt Ltd** (`jrn_priya_001`) — *Prime SME Tier*
   - **Requested:** ₹15,00,000 · 48m Vintage · ₹1.45Cr Annual Turnover
   - **Metrics:** DSCR 1.85x, 0 Cheque Bounces, Trust Score 885/1000
   - **Outcome:** `APPROVED` at 11.5% p.a. straight-through processing.
2. **Kavita Electronics** (`jrn_kavita_002`) — *Borderline Solvency Case*
   - **Requested:** ₹25,00,000 · 30m Vintage · DSCR 1.30x (Tight buffer)
   - **Metrics:** Trust Score 740/1000, 1 Minor 3-day tax filing delay
   - **Outcome:** `CONDITIONAL_APPROVAL` at ₹21,25,000 with promoter co-obligation.
3. **Apex Logistics & Freight** (`jrn_apex_003`) — *Adverse Network & Fraud Detection*
   - **Requested:** ₹35,00,000 · Discrepancies in GSTR-3B reported turnover vs bank credits
   - **Trust Graph:** Circular round-tripping detected between *Apex Logistics* and *Apex Intermediaries LLP* (Network Risk Score: 0.68)
   - **Outcome:** `NEEDS_REVIEW` routed directly to the Risk Officer console.

---

## Quickstart & Local Execution

### 1. Start the FastAPI Backend
```bash
# From repository root
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
*API documentation and Swagger UI are accessible at: `http://localhost:8000/docs`*

### 2. Start the Vite Frontend
```bash
# In another terminal
cd frontend
npm install
npm run dev -- --port 5173
```
*Open `http://localhost:5173/` in your browser.*

---

## Key Features Demonstrated

- **Interactive What-If Counterfactual Simulator**: Real-time slider recalculations of DSCR, facility amount, and rate incentives based on growth trajectory or collateral pledges.
- **Dynamic Force-Directed Trust Graph**: Interactive SVG visualization of company directors, banks, suppliers, and shell entities with clickable node inspection and circular risk rings.
- **Underwriter Override Workflow**: Risk officers can override model recommendations with audited rationale codes and co-signatures, feeding into continuous model calibration metrics.
- **Instant Confetti Facility Sanction**: Clean e-sanction letter generation upon borrower offer acceptance.
