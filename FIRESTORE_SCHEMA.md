# FinFlow AI — Firestore Schema Reference

> **Version:** 2.1.0
> **Last Updated:** 2026-10-03
> **Architecture Rule:** Frontend MUST NOT call Firestore directly. All mutations flow through FastAPI + Repository layer.

---

## Architecture Overview

```
Frontend (React)
    | HTTP REST only
    v
FastAPI Routes (/api/v1/...)
    | calls
    v
Repository Layer (backend/database/repositories/)
    | uses
    v
FirestoreClient (backend/database/firestore_client.py)
    | talks to
    v
Firebase Firestore  <->  Local Emulator (FIRESTORE_EMULATOR_HOST)
```

**Key rules:**
- Repositories expose typed methods -- no raw `db.set()` in route handlers.
- `audit_logs` is **append-only** -- no `update` or `delete` methods exposed.
- All timestamps are ISO-8601 UTC strings.
- Pagination via `limit` + `start_after` cursor (document ID).

---

## Collection Index

| # | Collection | Document Key | Repository Class |
|---|---|---|---|
| 1 | `users` | `userId` | `UserRepository` |
| 2 | `applications` | `applicationId` | `ApplicationRepository` |
| 3 | `documents` | `documentId` | `DocumentRepository` |
| 4 | `evidence_items` | `evidenceId` | `EvidenceItemRepository` |
| 5 | `journey_steps` | `stepId` | `JourneyStepRepository` |
| 6 | `risk_assessments` | `riskId` | `RiskAssessmentRepository` |
| 7 | `decisions` | `decisionId` | `DecisionRepository` |
| 8 | `next_best_actions` | `actionId` | `NextBestActionRepository` |
| 9 | `audit_logs` | `auditId` | `AuditLogRepository` (append-only) |
| 10 | `policy_documents` | `policyId` | `PolicyDocumentRepository` |
| 11 | `policy_chunks` | `chunkId` | `PolicyChunkRepository` |
| 12 | `financial_snapshots` | `snapshotId` | `FinancialSnapshotRepository` |
| 13 | `trust_graph_nodes` | `nodeId` | `TrustGraphNodeRepository` |
| 14 | `trust_graph_edges` | `edgeId` | `TrustGraphEdgeRepository` |
| 15 | `fraud_signals` | `signalId` | `FraudSignalRepository` |
| 16 | `what_if_scenarios` | `scenarioId` | `WhatIfScenarioRepository` |
| 17 | `human_reviews` | `reviewId` | `HumanReviewRepository` |
| 18 | `feedback_events` | `feedbackId` | `FeedbackEventRepository` |
| 19 | `notifications` | `notificationId` | `NotificationRepository` |
| 20 | `system_events` | `eventId` | `SystemEventRepository` |

---

## 1. `users`

| Field | Type | Required | Description |
|---|---|---|---|
| `userId` | string | YES | Firebase Auth UID (document ID) |
| `email` | string | YES | User email address |
| `role` | string | YES | CUSTOMER, RM, RISK_OFFICER, ADMIN |
| `name` | string | YES | Display name |
| `businessId` | string | NO | Linked business entity ID |
| `createdAt` | ISO-8601 | YES | Account creation timestamp |
| `updatedAt` | ISO-8601 | YES | Last profile update timestamp |

**Allowed operations:** create, get, update, list

---

## 2. `applications`

| Field | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | YES | Unique application ID (document ID) |
| `userId` | string | YES | Applicant Firebase UID |
| `businessName` | string | YES | Legal business name |
| `productType` | string | YES | sme_working_capital |
| `requestedAmount` | float | YES | Loan amount in INR |
| `purpose` | string | YES | Financing purpose |
| `status` | string | YES | ACTIVE, PAUSED, COMPLETED, FLAGGED |
| `currentStage` | string | YES | Current FSM stage |
| `vintageMonths` | int | NO | Business age in months |
| `annualTurnover` | float | NO | Annual revenue in INR |
| `tenorMonths` | int | NO | Loan tenor |
| `pan` | string | NO | PAN number |
| `gstin` | string | NO | GSTIN number |
| `createdAt` | ISO-8601 | YES | Creation timestamp |
| `updatedAt` | ISO-8601 | YES | Last update timestamp |

**Allowed operations:** create, get, update, list
**Recommended Indexes:** userId, status, currentStage

---

## 3. `documents`

| Field | Type | Required | Description |
|---|---|---|---|
| `documentId` | string | YES | Unique document ID (document ID) |
| `applicationId` | string | YES | Parent application |
| `type` | string | YES | BANK_STATEMENT, GST_RETURN, ITR, PAN, UDYAM_AADHAAR, FINANCIAL_AUDIT, OTHER |
| `fileName` | string | YES | Original filename |
| `storagePath` | string | YES | Storage path (Firebase Storage or local) |
| `mimeType` | string | YES | MIME type (default: application/pdf) |
| `fileHash` | string | YES | SHA-256 fingerprint |
| `uploadedAt` | ISO-8601 | YES | Upload timestamp |
| `ocrStatus` | string | YES | PENDING, PROCESSING, COMPLETED, FAILED |
| `verificationStatus` | string | YES | PENDING, VERIFIED, REJECTED, FLAGGED |
| `pageCount` | int | NO | Number of pages |

**Allowed operations:** create, get, update, list
**Recommended Indexes:** applicationId, ocrStatus, verificationStatus

---

## 4. `evidence_items`

| Field | Type | Required | Description |
|---|---|---|---|
| `evidenceId` | string | YES | Unique evidence ID (document ID) |
| `applicationId` | string | YES | Parent application |
| `documentId` | string | YES | Source document |
| `fieldName` | string | YES | Extracted field name |
| `value` | any | YES | Raw extracted value |
| `normalizedValue` | any | NO | Normalized/cleaned value |
| `confidence` | float [0,1] | YES | Extraction confidence score |
| `sourcePage` | int | YES | Page number in source document |
| `sourceText` | string | NO | Raw text snippet |
| `extractionMethod` | string | YES | Engine identifier |
| `verificationStatus` | string | YES | PENDING, VERIFIED, REJECTED, FLAGGED |
| `boundingBox` | object | NO | {x, y, w, h} pixel coordinates |
| `createdAt` | ISO-8601 | YES | Extraction timestamp |

**Allowed operations:** create, get, update, list
**Recommended Indexes:** applicationId, documentId, verificationStatus

---

## 5. `journey_steps`

| Field | Type | Required | Description |
|---|---|---|---|
| `stepId` | string | YES | Unique step ID (document ID) |
| `applicationId` | string | YES | Parent application |
| `stage` | string | YES | Journey stage name |
| `status` | string | YES | COMPLETED, SKIPPED, FAILED |
| `notes` | string | NO | Transition notes |
| `enteredAt` | ISO-8601 | YES | Stage entry timestamp |
| `completedAt` | ISO-8601 | NO | Stage exit timestamp |
| `durationSeconds` | float | NO | Time spent in stage |
| `createdAt` | ISO-8601 | YES | Record creation timestamp |

**Allowed operations:** create, get, list

---

## 6. `risk_assessments`

| Field | Type | Required | Description |
|---|---|---|---|
| `riskId` | string | YES | Unique risk assessment ID (document ID) |
| `applicationId` | string | YES | Parent application |
| `riskScore` | int [0-1000] | YES | Trust Score |
| `riskBand` | string | YES | LOW_RISK, MEDIUM_RISK, HIGH_RISK |
| `featureValues` | object | YES | Feature dict used in ML model |
| `modelVersion` | string | YES | ML model version identifier |
| `ruleResults` | array | YES | Deterministic rule evaluation results |
| `probabilityOfDefault` | float [0,1] | NO | PD from ML model |
| `createdAt` | ISO-8601 | YES | Assessment timestamp |

**Allowed operations:** create, get, list
**Recommended Indexes:** applicationId

---

## 7. `decisions`

| Field | Type | Required | Description |
|---|---|---|---|
| `decisionId` | string | YES | Unique decision ID (document ID) |
| `applicationId` | string | YES | Parent application |
| `outcome` | string | YES | APPROVED, CONDITIONAL_APPROVAL, NEEDS_REVIEW, REJECTED |
| `reasons` | string[] | YES | Human-readable reasoning |
| `evidenceReferences` | string[] | YES | Evidence IDs cited |
| `policyReferences` | string[] | YES | Policy clause IDs cited |
| `modelReferences` | string[] | YES | Model/version references |
| `approvedAmount` | float | NO | Sanctioned loan amount |
| `interestRate` | float | NO | Annual interest rate |
| `tenorMonths` | int | NO | Approved tenor |
| `decidedBy` | string | YES | AI_ORCHESTRATOR or officer ID |
| `createdAt` | ISO-8601 | YES | Decision timestamp |

**Allowed operations:** create, get, list
**Recommended Indexes:** applicationId, outcome

---

## 8. `next_best_actions`

| Field | Type | Required | Description |
|---|---|---|---|
| `actionId` | string | YES | Unique action ID (document ID) |
| `applicationId` | string | YES | Parent application |
| `title` | string | YES | Short action title |
| `description` | string | YES | Detailed action description |
| `actionType` | string | YES | UPLOAD_DOCUMENT, VERIFY_DISCREPANCY, etc. |
| `priority` | int | YES | Lower = higher priority |
| `guardrailStatus` | string | YES | SAFE, CAUTION, BLOCKED |
| `ctaLabel` | string | NO | Button label for UI |
| `targetPersona` | string | YES | CUSTOMER, RM, RISK_OFFICER |
| `createdAt` | ISO-8601 | YES | Creation timestamp |

**Allowed operations:** create, get, list

---

## 9. `audit_logs` -- APPEND-ONLY

Immutable event ledger. **No update or delete operations are permitted.**

| Field | Type | Required | Description |
|---|---|---|---|
| `auditId` | string | YES | Unique audit event ID (document ID) |
| `applicationId` | string | YES | Related application |
| `actorId` | string | YES | Firebase UID of actor |
| `actorRole` | string | YES | Role at time of action |
| `action` | string | YES | Action type (e.g., STAGE_ADVANCED) |
| `details` | object | YES | Arbitrary structured event details |
| `oldState` | string | NO | Previous state value |
| `newState` | string | NO | New state value |
| `ipAddress` | string | NO | Client IP address |
| `timestamp` | ISO-8601 | YES | Event timestamp (server-generated) |

**Allowed operations:** append (create only), get, list
**NOT ALLOWED:** update, delete

---

## 10. `policy_documents`

| Field | Type | Required | Description |
|---|---|---|---|
| `policyId` | string | YES | Unique policy ID (document ID) |
| `title` | string | YES | Policy document title |
| `category` | string | YES | CREDIT_RISK, COMPLIANCE, KYC, etc. |
| `version` | string | YES | Policy version |
| `effectiveDate` | ISO-8601 | YES | Effective date |
| `content` | string | YES | Full policy text |
| `createdAt` | ISO-8601 | YES | Creation timestamp |

**Allowed operations:** create, get, list, update

---

## 11. `policy_chunks`

| Field | Type | Required | Description |
|---|---|---|---|
| `chunkId` | string | YES | Unique chunk ID (document ID) |
| `policyId` | string | YES | Parent policy document |
| `clauseId` | string | YES | Clause identifier |
| `text` | string | YES | Chunk text content |
| `relevanceKeywords` | string[] | YES | Keywords for retrieval |
| `embedding` | float[] | NO | Vector embedding |
| `createdAt` | ISO-8601 | YES | Creation timestamp |

**Allowed operations:** create, get, list
**Recommended Indexes:** policyId

---

## 12. `financial_snapshots`

| Field | Type | Required | Description |
|---|---|---|---|
| `snapshotId` | string | YES | Unique snapshot ID (document ID) |
| `applicationId` | string | YES | Parent application |
| `dscr` | float | YES | Debt Service Coverage Ratio |
| `avgMonthlyInflow` | float | YES | Average monthly inflow |
| `avgMonthlyOutflow` | float | YES | Average monthly outflow |
| `operatingCashFlow` | float | YES | Operating cash flow |
| `cashBurnRate` | float | YES | Monthly cash burn rate |
| `bufferDays` | int | YES | Working capital buffer days |
| `volatilityIndex` | float | YES | Inflow/outflow volatility |
| `seasonalityRatio` | float | YES | Peak-to-base seasonality |
| `monthlyBreakdown` | array | YES | [{month, inflow, outflow, net_flow}] |
| `createdAt` | ISO-8601 | YES | Calculation timestamp |

**Allowed operations:** create, get, list
**Recommended Indexes:** applicationId

---

## 13. `trust_graph_nodes`

| Field | Type | Required | Description |
|---|---|---|---|
| `nodeId` | string | YES | Unique node ID (document ID) |
| `applicationId` | string | YES | Associated application |
| `label` | string | YES | Display label |
| `nodeType` | string | YES | BUSINESS, DIRECTOR, GSTIN, BANK_ACCOUNT |
| `riskLevel` | string | YES | LOW, MEDIUM, HIGH |
| `trustScore` | int | YES | Node trust score 0-1000 |
| `details` | object | YES | Additional metadata |
| `createdAt` | ISO-8601 | YES | Creation timestamp |

**Allowed operations:** create, get, list, update
**Recommended Indexes:** applicationId

---

## 14. `trust_graph_edges`

| Field | Type | Required | Description |
|---|---|---|---|
| `edgeId` | string | YES | Unique edge ID (document ID) |
| `applicationId` | string | YES | Associated application |
| `source` | string | YES | Source node ID |
| `target` | string | YES | Target node ID |
| `relation` | string | YES | OWNS, INVOICED, TRANSFERRED_FUNDS, CO_LOCATED |
| `weight` | float | YES | Relationship weight/strength |
| `flagged` | bool | YES | Fraud signal flag |
| `flagReason` | string | NO | Reason for flag |
| `createdAt` | ISO-8601 | YES | Creation timestamp |

**Allowed operations:** create, get, list, update
**Recommended Indexes:** applicationId, flagged

---

## 15. `fraud_signals`

| Field | Type | Required | Description |
|---|---|---|---|
| `signalId` | string | YES | Unique signal ID (document ID) |
| `applicationId` | string | YES | Associated application |
| `signalType` | string | YES | CIRCULAR_INVOICE, IDENTITY_MISMATCH, DUPLICATE_GSTIN |
| `severity` | string | YES | LOW, MEDIUM, HIGH, CRITICAL |
| `description` | string | YES | Human-readable description |
| `evidenceIds` | string[] | YES | Supporting evidence item IDs |
| `details` | object | YES | Structured signal details |
| `detectedAt` | ISO-8601 | YES | Detection timestamp |

**Allowed operations:** create, get, list
**Recommended Indexes:** applicationId, severity

---

## 16. `what_if_scenarios`

| Field | Type | Required | Description |
|---|---|---|---|
| `scenarioId` | string | YES | Unique scenario ID (document ID) |
| `applicationId` | string | YES | Parent application |
| `requestedInputs` | object | YES | Simulator input parameters |
| `simulatedOutputs` | object | YES | Computed simulation results |
| `insights` | string[] | YES | Narrative insights |
| `createdAt` | ISO-8601 | YES | Simulation timestamp |

**Allowed operations:** create, get, list
**Note:** Simulations are read-only snapshots; they do NOT modify the parent application.

---

## 17. `human_reviews`

| Field | Type | Required | Description |
|---|---|---|---|
| `reviewId` | string | YES | Unique review ID (document ID) |
| `applicationId` | string | YES | Associated application |
| `decisionId` | string | YES | Original AI decision being overridden |
| `officerId` | string | YES | Override officer Firebase UID |
| `officerRole` | string | YES | RM, RISK_OFFICER |
| `originalOutcome` | string | YES | Original AI decision outcome |
| `newOutcome` | string | YES | Override outcome |
| `reasonCode` | string | YES | Structured reason taxonomy code |
| `rationaleNotes` | string | YES | Free-text override justification |
| `coSignedBy` | string | NO | Supervisor UID for dual-control |
| `timestamp` | ISO-8601 | YES | Override timestamp |

**Allowed operations:** create, get, list

---

## 18. `feedback_events`

| Field | Type | Required | Description |
|---|---|---|---|
| `feedbackId` | string | YES | Unique feedback event ID (document ID) |
| `applicationId` | string | YES | Associated application |
| `decisionId` | string | YES | Loan decision being evaluated |
| `performanceOutcome` | string | YES | ON_TIME_REPAYMENT, DELINQUENT, DEFAULT |
| `repaymentRatePct` | float | YES | Repayment rate percentage |
| `notes` | string | NO | Additional notes |
| `recordedAt` | ISO-8601 | YES | Feedback recording timestamp |

**Allowed operations:** create, get, list

---

## 19. `notifications`

| Field | Type | Required | Description |
|---|---|---|---|
| `notificationId` | string | YES | Unique notification ID (document ID) |
| `userId` | string | NO | Target user UID (null if role-based) |
| `role` | string | NO | Target role (null if user-specific) |
| `title` | string | YES | Notification title |
| `message` | string | YES | Message body |
| `type` | string | YES | INFO, WARNING, SUCCESS, ALERT |
| `read` | bool | YES | Read status (default: false) |
| `actionLink` | string | NO | Deep link URL |
| `createdAt` | ISO-8601 | YES | Creation timestamp |

**Allowed operations:** create, get, update (mark as read), list
**Recommended Indexes:** userId, role, read

---

## 20. `system_events`

| Field | Type | Required | Description |
|---|---|---|---|
| `eventId` | string | YES | Unique event ID (document ID) |
| `eventType` | string | YES | Event type identifier |
| `sourceComponent` | string | YES | Originating service/module |
| `payload` | object | YES | Event payload |
| `timestamp` | ISO-8601 | YES | Event timestamp |

**Allowed operations:** create, get, list

---

## Firestore Emulator Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Start Firestore emulator
firebase emulators:start --only firestore

# Configure in .env
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_PROJECT_ID=finflow-ai-demo
```

Or via PowerShell before starting FastAPI:

```powershell
$env:FIRESTORE_EMULATOR_HOST="localhost:8080"
uvicorn backend.main:app --reload
```
