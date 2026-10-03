# FinFlow AI — Demonstration & Evaluation Guide
**Audience:** Hackathon Judges, Financial Underwriters & Systems Evaluators

---

## 1. Quick Access Credentials

Click the persona switch buttons in the application header or log in using:

| Persona | Role | Identifier | Demonstration Focus |
|---|---|---|---|
| **Priya Sharma** | `CUSTOMER` | `priya@sharmatextiles.com` | End-to-end clean journey, What-If simulation, instant sanction |
| **Rohan Mehta** | `RM` | `rohan.mehta@finflow.bank` | Intake queue, missing evidence requests, customer interaction |
| **Ananya Iyer** | `RISK_OFFICER` | `ananya.iyer@finflow.bank` | Discrepancy resolution, linked-entity signals, underwriter override |
| **Vikram Malhotra**| `CREDIT_APPROVER`| `approver@finflow.bank` | Authorized credit sanction chamber, co-signing overrides |
| **Meera Joshi** | `AUDIT_OFFICER` | `audit@finflow.bank` | 18-milestone Decision Replay, cryptographic hash validation |

---

## 2. Walkthrough Scenarios

### Scenario A (Hero Case): Sharma Textiles Private Limited (`jrn_priya_001`)
*The complete, seamless end-to-end journey from intake to disbursal.*

1. **Switch to Persona:** Priya Sharma (Customer).
2. **Navigate to:** `/customer/journey/jrn_priya_001` or click **View Active Application**.
3. **Inspect Evidence Ledger:**
   - Note the verified HDFC Bank Statement and GSTR-3B filings.
   - Click any evidence line to inspect optical bounding boxes and SHA-256 document fingerprints.
4. **Inspect Cash Flow & Reconciliation:**
   - 2.07% variance between GST turnover (₹1.45 Cr) and banking credits (₹1.42 Cr) -> Matched.
   - Healthy DSCR of 1.85x, 0 cheque bounces, 38 buffer days.
5. **View Sanction Offer & SHAP Explainability:**
   - Trust Score: 920/1000 (LOW_RISK, 8% PD).
   - Review the green SHAP bars highlighting DSCR (+1.85x) as the dominant risk-reducer.
   - Review cited policy clauses (`POL-SME-4.1`, `POL-SME-5.2`).
6. **Accept Sanction:** Click **Accept & Electronically Sign Sanction Letter** to trigger instant sanction celebration and status completion.

---

### Scenario B: Missing Mandatory KYC (`jrn_kavita_002`)
*Demonstrates state guardrails and proactive Next Best Action guidance.*

1. **Switch to Persona:** Rohan Mehta (RM).
2. **Navigate to:** `/rm` or `/rm/cases/jrn_kavita_002`.
3. **Observe System State:**
   - Journey state is flagged as `NEEDS_REVIEW`.
   - Next Best Action prominently displays: **"Upload Missing Document: Bank Statement"**.
4. **Action Execution:** Loan officer sends proactive notification to borrower requesting 6-month statement without unblocking unauthorized credit decisions.

---

### Scenario C: Discrepancy & Fraud Investigation (`jrn_apex_003`)
*Demonstrates cross-document triangulation and human escalation.*

1. **Switch to Persona:** Ananya Iyer (Risk & Compliance Officer).
2. **Navigate to:** `/risk/cases/jrn_apex_003`.
3. **Examine Discrepancy Alert:**
   - GST declared turnover: ₹80,00,000.
   - Bank statement total credits: ₹50,00,000.
   - Discrepancy: **37.5% variance** (exceeds 15% tolerance limit).
4. **Inspect Cross-Application Risk Intelligence:**
   - Entity shares phone number, facility address, and bank account with `SwiftTrans Freightways`.
   - Explanatory note accurately highlights: *"Potential linked-case risk detected."*
5. **Observe Automated Routing:** System prevents autonomous approval and routes directly to the Human Review Queue.

---

### Scenario D: Authorized Underwriter Override
*Demonstrates institutional governance, separation of duties, and co-signing.*

1. **Switch to Persona:** Ananya Iyer (Risk Officer).
2. **Open Case:** `jrn_kavita_002` (Conditional Approval).
3. **Initiate Override:**
   - Scroll to **Underwriter Override Action Panel**.
   - Change Outcome to `APPROVED`.
   - Enter Approved Amount: `₹25,00,000`.
   - Select Reason Code: `COLLATERAL_BACKED`.
   - Enter Mandatory Justification: *"Managing director pledged additional commercial facility as secondary collateral."*
   - Enter Co-Signer: *"Senior Credit Approver"*.
4. **Submit Override:**
   - Original AI decision is preserved in the audit log.
   - Updated decision reflects `Rohan Mehta (RM)` or `Ananya Iyer (RISK_OFFICER)`.
   - Decision card displays the amber/emerald **Independent Review / Authorized Decision** badge.

---

### Scenario E: What-If Counterfactual Sensitivity Simulation
*Demonstrates non-mutating borrower what-if exploration.*

1. **Switch to Persona:** Priya Sharma (Customer).
2. **Navigate to:** `/customer/what-if`.
3. **Adjust Simulation Sliders:**
   - Move **Revenue Shock** to `-20%`.
   - Move **Facility Tenor** from 12 to 18 months.
   - Add **Offered Collateral**: `₹5,00,000`.
4. **Observe Dynamic Recalculation:**
   - DSCR dynamically adjusts in real time.
   - Base application records in the database remain strictly unmodified.

---

### Scenario F: Cryptographic Decision Replay
*Demonstrates regulatory compliance and full audit reproducibility.*

1. **Switch to Persona:** Meera Joshi (Audit Officer).
2. **Navigate to:** `/audit/replay/jrn_priya_001` or click **Decision Replay**.
3. **Explore the 18 Milestones:**
   - Step through the chronological milestones from `INTENT_RECEIVED` to `JOURNEY_RESOLVED`.
   - Click each milestone to inspect raw inputs, model version tags, and output payloads.
   - Click **Verify Cryptographic Seals** to validate tamper-proof SHA-256 hashes.
