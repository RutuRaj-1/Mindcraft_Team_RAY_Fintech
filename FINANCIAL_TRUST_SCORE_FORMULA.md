# FinFlow AI — Financial Trust Score Mathematical Specification & Adaptation Guide
**Origin Project:** Hack2Ignite (FT-03: Alternative Credit Assessment Engine)  
**Destination Platform:** FinFlow AI (Mindcraft Team RAY)  
**Classification:** Enterprise Alternative Credit Scoring & Explainability  

---

## 1. Overview & Architectural Philosophy

Traditional credit underwriting relies almost exclusively on centralized credit bureau registries (such as CIBIL, Experian, or Equifax). For micro, small, and medium enterprises (MSMEs), this creates a severe market failure:
- **Thin-File / New-to-Credit Exclusion:** Businesses without prior commercial loans have no bureau score.
- **Collateral Bias:** Traditional scores reward legacy pledged assets rather than daily commercial cash velocity.
- **Opaque Black-Boxes:** Legacy bureau algorithms do not provide actionable, transaction-backed factor attributions.

The **Financial Trust Score Engine** (adapted from Hack2Ignite) resolves this by computing a deterministic, explainable, and verifiable alternative credit score directly from the enterprise's digital transaction stream, cash-flow exhaust, operational stability, and risk telemetry.

---

## 2. Core Mathematical Formulations

### 2.1 The Master Weighted Linear Formulation (0 – 100 Base)

The foundational Financial Trust Score ($T \in [0, 100]$) is computed as the scalar product of seven modular, domain-specific sub-scores ($S_k \in [0, 100]$) and their strictly regulated normative weights ($W_k$):

$$\text{Trust Score}_{0-100} = \sum_{k=1}^{7} \left( S_k \times W_k \right)$$

$$\text{Subject to:} \quad \sum_{k=1}^{7} W_k = 1.00 \quad (100\%), \quad \forall k: 0 \le S_k \le 100, \quad W_k \ge 0$$

### 2.2 Normative 7-Pillar Weights Table

| Index ($k$) | Sub-Score Component ($S_k$) | Weight ($W_k$) | Financial Significance |
|---|---|---|---|
| 1 | **Financial Stability** | **25% (0.25)** | Operating vintage, transaction depth, baseline revenue scale |
| 2 | **Cash Flow Health** | **20% (0.20)** | Net monthly surplus, positivity ratio, volatility penalty |
| 3 | **Revenue Consistency** | **15% (0.15)** | Normalized Coefficient of Variation ($1 - \text{CV}$) |
| 4 | **Repayment Capacity** | **15% (0.15)** | Free operating margin buffer for debt servicing |
| 5 | **Expense Discipline** | **10% (0.10)** | Operating Expense Ratio (OER) against industry benchmarks |
| 6 | **Transaction Behaviour** | **10% (0.10)** | Digital velocity, ticket size realism, bilateral flow mix |
| 7 | **Fraud / Risk Signals** | **5% (0.05)** | Inverted anomaly and accommodation alert rate penalty |
| **Total** | **Composite Engine** | **100% (1.00)** | **Holistic Alternative Credit Assessment** |

---

### 2.3 Bureau-Comparable & Platform Scaling

To interface seamlessly with existing banking rails and FinFlow's enterprise consoles, the base score is projected into two standardized institutional scales:

#### A. CIBIL-Equivalent Bureau Scale ($300 - 850$)
$$\text{Score}_{\text{CIBIL}} = \max\left(300, \, \min\left(850, \, 300 + \left\lfloor 5.5 \times \text{Trust Score}_{0-100} \right\rfloor - P_{\text{fraud}}\right)\right)$$

*Where $P_{\text{fraud}}$ is any additional severe compliance deduction.*

#### B. FinFlow Platform Institutional Trust Index ($0 - 1000$)
$$\text{Index}_{\text{FinFlow}} = \max\left(0, \, \min\left(1000, \, \text{Trust Score}_{0-100} \times 10\right)\right)$$

#### C. Enterprise Risk Tier Categorization
$$\text{Risk Band} = \begin{cases} 
\text{LOW\_RISK} & \text{if } \text{Trust Score}_{0-100} \ge 75 \quad (\text{CIBIL} \ge 712, \; \text{FinFlow} \ge 750) \\
\text{MEDIUM\_RISK} & \text{if } 50 \le \text{Trust Score}_{0-100} < 75 \quad (575 \le \text{CIBIL} < 712) \\
\text{HIGH\_RISK} & \text{if } \text{Trust Score}_{0-100} < 50 \quad (\text{CIBIL} < 575)
\end{cases}$$

---

## 3. Detailed Sub-Score Mathematical Derivations

### Pillar 1: Financial Stability ($S_1$, $W_1 = 0.25$)

Evaluates institutional resilience through enterprise longevity, continuous transaction history, and revenue scale.

$$S_1 = \min\left(100, \, \text{AgePts} + \text{HistoryPts} + \text{RevBasePts}\right)$$

1. **Business Vintage Points ($\text{AgePts} \le 35$):**
   $$\text{AgePts} = \begin{cases}
   35 & \text{if } \text{Vintage} \ge 5.0\text{ years} \\
   28 & \text{if } 3.0 \le \text{Vintage} < 5.0 \\
   20 & \text{if } 1.0 \le \text{Vintage} < 3.0 \\
   12 & \text{if } 0.0 < \text{Vintage} < 1.0 \\
   5 & \text{otherwise}
   \end{cases}$$

2. **Active History Depth ($\text{HistoryPts} \le 35$):**
   $$\text{HistoryPts} = \begin{cases}
   35 & \text{if Active Months } \ge 6 \\
   25 & \text{if } 3 \le \text{Active Months} < 6 \\
   15 & \text{if } 1 \le \text{Active Months} < 3 \text{ and } N_{\text{tx}} > 0 \\
   0 & \text{otherwise}
   \end{cases}$$

3. **Baseline Inflow Scale ($\text{RevBasePts} \le 30$):**
   $$\text{RevBasePts} = \begin{cases}
   30 & \text{if Average Monthly Revenue } (\bar{R}) \ge \text{₹}1,00,000 \\
   24 & \text{if } 30,000 \le \bar{R} < 1,00,000 \\
   16 & \text{if } 0 < \bar{R} < 30,000 \\
   0 & \text{otherwise}
   \end{cases}$$

---

### Pillar 2: Cash Flow Health ($S_2$, $W_2 = 0.20$)

Measures operational net surplus, monthly reliability, and penalizes extreme net cash-flow fluctuation.

Let $\text{NCF} = \bar{R} - \bar{E}$ (Average Monthly Net Cash Flow).

- **Case A: Zero Revenue & Expenses** ($\bar{R} = 0, \bar{E} = 0$):
  $$S_2 = 0$$

- **Case B: Operating Cash Deficit** ($\text{NCF} < 0$):
  $$\text{Deficit Ratio} = \frac{|\text{NCF}|}{\max(\bar{R}, 1.0)}$$
  $$S_2 = \max\left(0, \, \left\lfloor 35 - \min(35, 25 \times \text{Deficit Ratio})\right\rfloor\right)$$

- **Case C: Operating Cash Surplus** ($\text{NCF} \ge 0$):
  $$S_2 = \max\left(0, \, \min\left(100, \, 50 + \text{Bonus}_{\text{vol}} + \text{Bonus}_{\text{rel}} - \text{Penalty}_{\text{vol}}\right)\right)$$
  $$\text{Bonus}_{\text{vol}} = \min\left(25, \, \left\lfloor \frac{\text{NCF}}{50,000} \times 15 \right\rfloor\right)$$
  $$\text{Bonus}_{\text{rel}} = \left\lfloor \text{Ratio}_{\text{pos}} \times 25 \right\rfloor \quad \left(\text{where } \text{Ratio}_{\text{pos}} = \frac{N_{\text{months with } R \ge E}}{N_{\text{total months}}}\right)$$
  $$\text{Penalty}_{\text{vol}} = \begin{cases}
  \min\left(15, \, \left\lfloor \frac{\sigma_{\text{ncf}}}{\text{NCF}} \times 5 \right\rfloor\right) & \text{if } \sigma_{\text{ncf}} > 1.5 \times \text{NCF} \\
  0 & \text{otherwise}
  \end{cases}$$

---

### Pillar 3: Revenue Consistency ($S_3$, $W_3 = 0.15$)

Measures predictable revenue predictability using the normalized **Coefficient of Variation (CV)**.

Let $R_1, R_2, \dots, R_N$ be monthly gross credit inflows:

$$\bar{R} = \frac{1}{N}\sum_{m=1}^{N} R_m, \quad \sigma_R = \sqrt{\frac{1}{N}\sum_{m=1}^{N}(R_m - \bar{R})^2}$$

$$\text{CV} = \frac{\sigma_R}{\bar{R}} \quad (\text{for } \bar{R} > 0)$$

$$\text{Revenue Consistency Index} = \max\left(0.0, \, 1.0 - \min(\text{CV}, 1.0)\right)$$

$$S_3 = \begin{cases}
0 & \text{if } \bar{R} = 0 \\
70 & \text{if } N = 1 \text{ (Single-month baseline)} \\
\max\left(0, \, \min\left(100, \, \left\lfloor \text{Consistency Index} \times 100 \right\rfloor\right)\right) & \text{if } N > 1
\end{cases}$$

---

### Pillar 4: Repayment Capacity ($S_4$, $W_4 = 0.15$)

Quantifies the net operational buffer available for servicing debt obligations:

$$\text{Net Margin Ratio } (M) = \frac{\text{NCF}}{\bar{R}} = \frac{\bar{R} - \bar{E}}{\bar{R}}$$

$$S_4 = \begin{cases}
\min\left(100, \, 85 + \left\lfloor (M - 0.30) \times 50 \right\rfloor\right) & \text{if } M \ge 0.30 \quad (\ge 30\% \text{ Net Margin}) \\
\left\lfloor 70 + \frac{M - 0.15}{0.15} \times 15 \right\rfloor & \text{if } 0.15 \le M < 0.30 \quad (15\% - 30\%) \\
\left\lfloor 50 + \frac{M - 0.05}{0.10} \times 20 \right\rfloor & \text{if } 0.05 \le M < 0.15 \quad (5\% - 15\%) \\
\left\lfloor 35 + \frac{M}{0.05} \times 15 \right\rfloor & \text{if } 0.0 \le M < 0.05 \quad (0\% - 5\%) \\
\max\left(0, \, \left\lfloor 30 - \min(30, |M| \times 60) \right\rfloor\right) & \text{if } M < 0.0 \quad (\text{Deficit Margin})
\end{cases}$$

---

### Pillar 5: Expense Discipline ($S_5$, $W_5 = 0.10$)

Evaluates cost management discipline via the **Operating Expense Ratio (OER)**:

$$\text{OER} = \frac{\bar{E}}{\bar{R}}$$

Healthy MSMEs operate with an OER between $50\%$ and $75\%$.

$$S_5 = \begin{cases}
95 & \text{if } \text{OER} \le 0.65 \quad (\le 65\% \text{ Overhead}) \\
\left\lfloor 94 - \frac{\text{OER} - 0.65}{0.15} \times 14 \right\rfloor & \text{if } 0.65 < \text{OER} \le 0.80 \\
\left\lfloor 79 - \frac{\text{OER} - 0.80}{0.15} \times 19 \right\rfloor & \text{if } 0.80 < \text{OER} \le 0.95 \\
\left\lfloor 59 - \frac{\text{OER} - 0.95}{0.10} \times 29 \right\rfloor & \text{if } 0.95 < \text{OER} \le 1.05 \\
\max\left(0, \, \left\lfloor 25 - \min(25, (\text{OER} - 1.05) \times 20) \right\rfloor\right) & \text{if } \text{OER} > 1.05
\end{cases}$$

---

### Pillar 6: Transaction Behaviour ($S_6$, $W_6 = 0.10$)

Measures active commercial circulation, banking frequency, and bilateral cash velocity:

$$S_6 = \min\left(100, \, \text{FreqPts} + \text{BilateralPts} + \text{TicketPts}\right)$$

1. **Monthly Transaction Velocity ($\lambda = \frac{N_{\text{tx}}}{N_{\text{months}}}$):**
   $$\text{FreqPts} = \begin{cases}
   45 & \text{if } \lambda \ge 20\text{ tx/month} \\
   38 & \text{if } 10 \le \lambda < 20 \\
   28 & \text{if } 5 \le \lambda < 10 \\
   15 & \text{otherwise}
   \end{cases}$$

2. **Bilateral Flow Mix (Credits & Debits Present):**
   $$\text{BilateralPts} = \begin{cases}
   35 & \text{if Total Credits} > 0 \text{ and Total Debits} > 0 \\
   18 & \text{if Total Credits} > 0 \text{ or Total Debits} > 0 \\
   0 & \text{otherwise}
   \end{cases}$$

3. **Average Ticket Size ($\bar{T} = \frac{\sum |\text{Amount}_i|}{N_{\text{tx}}}$):**
   $$\text{TicketPts} = \begin{cases}
   20 & \text{if } \bar{T} \ge \text{₹}500 \\
   12 & \text{if } 0 < \bar{T} < 500 \\
   0 & \text{otherwise}
   \end{cases}$$

---

### Pillar 7: Fraud / Risk Signals ($S_7$, $W_7 = 0.05$)

Inverted risk scoring where a pristine risk record achieves near-perfect score:

$$\text{Fraud Alert Rate } (r_{\text{fraud}}) = \frac{N_{\text{flagged alerts}}}{\max(N_{\text{tx}}, 1)}$$

$$S_7 = \begin{cases}
50 & \text{if } N_{\text{tx}} = 0 \text{ (Neutral Baseline)} \\
98 & \text{if } r_{\text{fraud}} = 0.0 \text{ (Pristine Profile)} \\
82 & \text{if } 0 < r_{\text{fraud}} \le 0.05 \\
60 & \text{if } 0.05 < r_{\text{fraud}} \le 0.15 \\
35 & \text{if } 0.15 < r_{\text{fraud}} \le 0.30 \\
\max\left(5, \, \left\lfloor 25 - (r_{\text{fraud}} - 0.30) \times 30 \right\rfloor\right) & \text{if } r_{\text{fraud}} > 0.30
\end{cases}$$

---

## 4. End-to-End Worked Numerical Example

### Profile: Priya Sharma Enterprise (MSME Artisan Textiles)
- **Business Vintage:** 3.5 years ($3 \le \text{age} < 5$)
- **Active History:** 6 months ($N_{\text{months}} = 6$)
- **Monthly Gross Inflows:** ₹1,20,000, ₹1,25,000, ₹1,18,000, ₹1,30,000, ₹1,22,000, ₹1,25,000
- **Average Monthly Revenue ($\bar{R}$):** ₹1,23,333.33
- **Monthly Operating Expenses ($\bar{E}$):** ₹78,000.00
- **Net Cash Flow ($\text{NCF}$):** ₹45,333.33
- **Expense Ratio ($\text{OER}$):** $78,000 / 123,333.33 = 0.6324 \quad (63.24\%)$
- **Net Margin ($M$):** $45,333.33 / 123,333.33 = 0.3676 \quad (36.76\%)$
- **Revenue Std Dev ($\sigma_R$):** ₹3,844.19 $\rightarrow \text{CV} = 3,844.19 / 123,333.33 = 0.0312 \quad (3.12\%)$
- **Total Transactions:** 84 ($14\text{ tx/month}$) with credits and debits
- **Fraud Alerts:** 0 ($r_{\text{fraud}} = 0.0$)

### Step-by-Step Sub-Score Calculation:
1. **$S_1$ (Stability):** $\text{AgePts}(28) + \text{HistoryPts}(35) + \text{RevBasePts}(30) = \mathbf{93}$
2. **$S_2$ (Cash Flow):** $50 + \min(25, \lfloor 45,333/50,000 \times 15 \rfloor = 13) + \lfloor 1.0 \times 25 \rfloor = 50 + 13 + 25 = \mathbf{88}$
3. **$S_3$ (Consistency):** $\lfloor (1.0 - 0.0312) \times 100 \rfloor = \mathbf{96}$
4. **$S_4$ (Repayment Capacity):** $M = 36.76\% \ge 30\% \rightarrow 85 + \lfloor (0.3676 - 0.30) \times 50 \rfloor = 85 + 3 = \mathbf{88}$
5. **$S_5$ (Expense Discipline):** $\text{OER} = 63.24\% \le 65\% \rightarrow \mathbf{95}$
6. **$S_6$ (Tx Behaviour):** $\text{FreqPts}(38) + \text{BilateralPts}(35) + \text{TicketPts}(20) = \mathbf{93}$
7. **$S_7$ (Fraud Risk):** Pristine profile ($0$ flags) $\rightarrow \mathbf{98}$

### Weighted Total:
$$\text{Trust Score}_{0-100} = (93 \times 0.25) + (88 \times 0.20) + (96 \times 0.15) + (88 \times 0.15) + (95 \times 0.10) + (93 \times 0.10) + (98 \times 0.05)$$
$$\text{Trust Score}_{0-100} = 23.25 + 17.60 + 14.40 + 13.20 + 9.50 + 9.30 + 4.90 = \mathbf{92.15} \approx \mathbf{92}$$

### Scaled Outputs:
- **CIBIL Equivalent:** $300 + \lfloor 5.5 \times 92 \rfloor = 300 + 506 = \mathbf{806\text{ / 850 (Prime Tier)}}$
- **FinFlow Platform Index:** $92 \times 10 = \mathbf{920\text{ / 1000}}$
- **Risk Band:** **LOW_RISK**

---

## 5. Architectural Adaptation in FinFlow AI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 FinFlow AI Platform Integration                             │
│                                                                             │
│  [Banking & GST Evidence]                                                   │
│           │                                                                 │
│           ▼                                                                 │
│  [extract_credit_features()]                                                │
│           │                                                                 │
│           ▼                                                                 │
│  [FinancialTrustScoreEngine] (backend/modules/module3_risk/)               │
│    ├── 7-Pillar Sub-Scores (Stability, Cash Flow, Consistency, etc.)        │
│    ├── Multi-Scale Resolution (0-100, 300-850 CIBIL, 0-1000 FinFlow)        │
│    └── Metric-Backed Explainable Positive & Negative Factors                │
│           │                                                                 │
│           ├───────────────────────────────┬─────────────────────────────────┤
│           ▼                               ▼                                 ▼
│  [GET /financial-trust-score]   [Trust Graph Service]            [Decision Engine]
│  (REST API for Consoles)       (Module 7 Trust Nodes)           (Policy RAG & SHAP)
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Python Implementation:** `backend/modules/module3_risk/financial_trust_score.py`
2. **REST Route:** `backend/routers/financial_router.py` -> `GET /api/v1/journeys/{journey_id}/financial-trust-score`
3. **Automated Testing:** `backend/tests/test_financial_trust_score.py`
