# FinFlow AI — Security & Governance Architecture
**Standard:** Enterprise FinTech Security Standard · **Compliance:** ISO 27001 / SOC 2 / RBI Digital Lending Guidelines

---

## 1. Authentication & Token Verification

- **Dual-Mode Authentication:**
  - **Production Mode:** Server-side verification of Google Firebase ID Tokens using Google public RSA keys (`verify_id_token`).
  - **Deterministic Testing Mode:** Cryptographically verifiable demo bearer tokens (`demo-customer`, `demo-rm`, `demo-risk`, `demo-approver`, `demo-audit`, `demo-admin`) configured for evaluation without external network dependencies.
- **No Secret Leakage:** Frontend client bundles contain zero private keys, service account credentials, or database connection strings. All database queries execute server-side behind the FastAPI gateway.
- **No Plaintext Passwords:** FinFlow AI stores zero passwords in application databases; authentication delegates entirely to Identity Providers (IdP).

---

## 2. Server-Side Role-Based Access Control (RBAC)

RBAC is strictly enforced on the server. Client-side navigation guards provide convenience, but backend FastAPI dependencies (`get_current_user`, `require_role`) reject unauthorized calls with HTTP `403 Forbidden`:

| Resource Endpoint | Customer | Loan Officer (RM) | Risk Officer | Credit Approver | Audit Officer | Admin |
|---|---|---|---|---|---|---|
| `/api/v1/journeys/intent` | Create | Create | Denied | Denied | Denied | Denied |
| `/api/v1/journeys/{id}` (Self) | Read | Read | Read | Read | Read | Read |
| `/api/v1/rm/queue` | **403 Denied** | Full Access | Full Access | Read | Read | Read |
| `/api/v1/risk/assess/*` | **403 Denied** | Execute | Execute | Execute | Read | Read |
| `/api/v1/governance/reviews/override` | **403 Denied** | **403 Denied** | Execute | Co-Sign | **403 Denied** | **403 Denied** |
| `/api/v1/replay/timeline/*` | **403 Denied** | Read | Read | Read | Full Read | Read |
| Autonomous Disbursal | **PROHIBITED** | **PROHIBITED** | **PROHIBITED** | **PROHIBITED** | **PROHIBITED** | **PROHIBITED** |

---

## 3. Separation of Duties (SoD) Invariants

1. **System Administrator Invariant:** The `ADMIN` role is strictly restricted to system configuration, health monitoring, and test data resetting. Admin has **ZERO financial approval authority** and cannot authorize loans or sign overrides.
2. **Customer Isolation Invariant:** SME applicants can only query and mutate their own applications. Direct queries for foreign application IDs return HTTP `404` or `403`.
3. **Four-Tier Governance Invariant:** Model outputs, independent risk reviews, authorized credit sanctions, and independent audit logs are partitioned into explicit tiers.

---

## 4. Cryptographic Proof of Evidence & Tamper Resistance

- **SHA-256 Document Hashing:** When an applicant uploads a PDF or scanned document, FinFlow AI computes its SHA-256 hash immediately in memory before storage:
  ```python
  doc_hash = hashlib.sha256(file_bytes).hexdigest()
  ```
- **Evidence Traceability:** Every extracted evidence metric in the `evidence_ledger` records `sha256_source_hash`, `page_number`, and normalized bounding box coordinates (`x, y, width, height`).
- **Append-Only Auditing:** Records written to `evidence_ledger`, `decisions`, `overrides`, and `audit_events` can never be edited or deleted in production. All modifications are logged as new forward-looking events.

---

## 5. Input Validation & Defense in Depth

- **Pydantic Schemas:** Every request body is validated using strict Pydantic models. Unexpected fields are rejected or stripped.
- **File Type & Size Restrictions:** The document upload gateway only accepts `application/pdf`, `image/png`, and `image/jpeg` with a maximum payload limit of 15MB.
- **CORS Configuration:** Cross-Origin Resource Sharing is locked to configured host domains in `backend/config.py`.
- **Safe Structured Logging:** Sensitive banking data, PANs, and tax IDs are masked or truncated in production application logs.
