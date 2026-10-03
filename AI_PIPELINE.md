# FinFlow AI — AI & Machine Learning Pipeline Specification
**Component:** Underwriting Intelligence Layer · **Core Stack:** Scikit-Learn · SHAP · Vector RAG

---

## 1. Pipeline Overview

FinFlow AI completely rejects black-box or non-deterministic credit underwriting. The AI pipeline is architected into 4 deterministic, verifiable stages:

```
┌─────────────────────────────────┐
│     1. Hard Policy Gates        │ ──(Fails)──► Immediate Rejection / Mandatory Review
└────────────────┬────────────────┘              (Authoritative over ML probability)
                 │ (Passes)
                 ▼
┌─────────────────────────────────┐
│   2. Calibrated ML Risk Model   │ ──► Probability of Default (PD) & Trust Score (300-1000)
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│     3. SHAP TreeExplainer       │ ──► Marginal Log-Odds Attributions for Every Feature
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│     4. Dense Policy RAG         │ ──► Verifiable Regulatory & Institutional Policy Citations
└─────────────────────────────────┘
```

---

## 2. Stage 1: Deterministic Hard Policy Gates

Before executing any statistical model, the applicant's extracted evidence is tested against institutional hard policy rules:

| Rule Code | Rule Description | Minimum Threshold | Authoritative Action on Failure |
|---|---|---|---|
| `R01_VINTAGE` | Minimum Operational Vintage | $\ge 24\text{ months}$ | `REJECTED` or Escalated to Senior Underwriter |
| `R02_TURNOVER` | Minimum Annual Taxable Turnover | $\ge \text{₹}25,00,000$ | `REJECTED` |
| `R03_CHEQUE_BOUNCES` | Inward Cheque Returns in 6 Months | $\le 2\text{ instances}$ | `NEEDS_REVIEW` |
| `R04_DSCR` | Debt Service Coverage Ratio | $\ge 1.25\text{x}$ | `NEEDS_REVIEW` or Scaled-down facility |
| `R05_REGISTRATION` | Active GSTIN & PAN Status | Active, No Cancellation | `REJECTED` |

**Invariant:** If any hard rule fails, favorable ML output CANNOT override the failure. The hard rule remains authoritative.

---

## 3. Stage 2: Scikit-Learn Calibrated SME Default Model

- **Model Family:** Gradient Boosting Classifier (`HistGradientBoostingClassifier` / `RandomForestClassifier`) with calibrated sigmoid probability mapping.
- **Input Features ($X$):**
  1. `annual_turnover`: Annual credit/sales turnover (in INR).
  2. `vintage_months`: Operational vintage in continuous months.
  3. `dscr`: Debt Service Coverage Ratio ($> 1.0$).
  4. `average_monthly_balance`: Average balance maintained in operational accounts.
  5. `bounces_6m`: Count of inward cheque bounces in preceding 180 days.
  6. `buffer_days`: Days of working capital liquidity without fresh receipts.
- **Output:**
  - Probability of Default ($PD \in [0.0, 1.0]$)
  - FinFlow Trust Score:
    $$\text{Score} = 300 + (1.0 - PD) \times 700 \quad (\text{Range: } 300 - 1000)$$
  - Risk Band:
    - `LOW_RISK`: Score $\ge 800$ ($PD \le 0.15$)
    - `MEDIUM_RISK`: Score $650 - 799$ ($0.15 < PD \le 0.35$)
    - `HIGH_RISK`: Score $< 650$ ($PD > 0.35$)

---

## 4. Stage 3: SHAP Feature Explainability

- **Explainer:** `shap.TreeExplainer` computed over the calibrated ensemble model.
- **Base Value:** The portfolio background expected default log-odds (typically $\approx 0.22$).
- **Marginal Additivity:**
  $$\text{Model Output } f(x) = \phi_0 + \sum_{i=1}^{M} \phi_i(x)$$
  Where:
  - $\phi_0$ is the base expected value.
  - $\phi_i(x)$ is the Shapley value of feature $i$.
- **Directional Categorization:**
  - If $\phi_i < 0$: The feature **reduces** credit risk (e.g. high DSCR or zero cheque bounces). Displayed in green.
  - If $\phi_i > 0$: The feature **increases** credit risk (e.g. low buffer days or tight margins). Displayed in crimson.

---

## 5. Stage 4: Dense Vector Policy RAG

- **Corpus:** Institutional Credit Norms, RBI Master Directions on SME Lending, and Collateral Guidelines.
- **Retrieval Engine:** Dense Vector Embedding (`bge-small-en-v1.5` / Cosine Similarity) over chunked policy clauses.
- **Citation Model:** Every recommended credit term, haircut, or requirement must link to a specific clause identifier (e.g., `POL-SME-4.1`).
- **No Hallucination Fallback:** If an external LLM call times out or encounters network latency, the **Fallback Explanation Generator** deterministically compiles the structured synthesis using rule evaluation records, SHAP rankings, and policy citations.
