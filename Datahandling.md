You are working on the existing FinFlow AI project.

THIS IS A CONTROLLED INTEGRATION TASK.

The backend is already working and backend tests have successfully passed after previous implementation stages.

The frontend is visually strong and already contains the FinFlow AI enterprise FinTech design language.

DO NOT rebuild the system.

DO NOT replace working architecture.

DO NOT rewrite working backend business logic.

DO NOT replace Firebase.

DO NOT replace FastAPI.

DO NOT remove working RBAC logic.

DO NOT remove existing pages simply because they currently contain demo data.

The purpose of this task is to transition the application from:

HARDCODED / PREPOPULATED FRONTEND DATA

to:

LIVE BACKEND + FIREBASE DATA

while keeping the system stable.

==================================================
PRIMARY OBJECTIVES
==================================================

Implement all of the following:

1. Remove hardcoded business/application data from normal application pages.
2. Make the application start in a clean/raw state.
3. Ensure all business data comes from FastAPI/Firebase.
4. Ensure documents uploaded from the frontend are actually stored in Firebase Storage.
5. Ensure document/application metadata is actually stored in Firestore.
6. Ensure FastAPI can retrieve and process the data.
7. Ensure processed evidence is persisted properly.
8. Ensure Firebase Authentication and user profiles are connected correctly.
9. Ensure signup automatically creates a CUSTOMER/MSME role.
10. Ensure every new signup goes directly to the MSME Customer Dashboard.
11. Prevent public signup from selecting privileged roles.
12. Preserve the existing internal RBAC roles for authorized users.
13. Preserve the current UI design.
14. Preserve backend tests.
15. Verify the frontend/backend integration with a real document upload.
16. Do not introduce frontend-only fake API responses.
17. Maintain the existing demo functionality separately.

==================================================
CRITICAL SAFETY RULE
==================================================

BEFORE MODIFYING CODE:

Inspect the existing project.

Do not immediately delete files.

First identify:

- all hardcoded business data
- all mock API responses
- all frontend seed data
- all static application objects
- all demo-specific code
- all Firebase configuration
- all API clients
- all route guards
- all role resolution logic
- all Firestore repositories
- all Firebase Storage functions
- all FastAPI endpoints used by frontend
- all existing tests

Create an internal migration plan.

Then modify the smallest possible set of files.

==================================================
1. DEFINE "RAW MODE"
==================================================

After this task, the NORMAL APPLICATION must open with no real-looking prepopulated customer/application data.

Example:

Wrong:

Welcome back, Priya Sharma

Pre-Approved Limit:
₹15.00 Lakhs

Trust Score:
780/1000

DSCR:
1.45x

Verified Documents:
4/4

Decision:
Approved

These values must not appear unless they are returned from the backend for a real or deliberately seeded demo case.

Correct RAW state:

Welcome to FinFlow AI

No active application yet.

Start your financial journey by describing your requirement.

[Start New Application]

Dashboard metrics should show:

Active Applications: 0
Pending Verification: 0
Documents: 0
Reviews: 0

when the new account has no application data.

DO NOT replace hardcoded values with frontend-generated zeros by editing the JSX blindly.

The frontend should receive an actual empty state from the backend/database.

==================================================
2. DO NOT DELETE DEMO MODE
==================================================

There must be TWO distinct concepts:

NORMAL MODE
---------
Real user data.
No hardcoded business cases.
No preloaded customer applications.
No fake dashboard metrics.

DEMO MODE
---------
Synthetic seeded data.
Used for judging/demo scenarios.

Demo mode remains accessible through:

/demo

or the project's existing demo mechanism.

Demo data must still enter the application through backend/Firebase APIs.

DO NOT:

React
→ local demo JSON

Instead:

Demo Seeder
→ Firestore
→ FastAPI
→ Frontend

This means the same application architecture is used in the demo.

==================================================
3. IDENTIFY AND REMOVE HARDCODED BUSINESS DATA
==================================================

Search the entire frontend for hardcoded examples such as:

Priya Sharma
Sharma Textiles
SkillBridge
SafeEra
fixed GST numbers
fixed CINs
fixed PANs
fixed application IDs
fixed loan amounts
fixed risk scores
fixed trust scores
fixed DSCR
fixed document counts
fixed decisions
fixed revenue values
fixed cash flow values
fixed review counts
fixed risk distributions
fixed audit events
fixed journey state
fixed Next Best Action

Do NOT automatically remove:

- UI labels
- placeholder text
- empty-state examples
- documentation text
- design-system constants
- status labels
- configurable thresholds

Only remove hardcoded BUSINESS/CASE DATA from normal runtime state.

==================================================
4. REMOVE MOCK API RESPONSES
==================================================

Search for:

mock
mockData
dummy
sampleData
fakeData
demoData
staticResponse
setTimeout
hardcoded JSON
inline application objects
fake fetch wrappers
local constants representing backend responses

For every occurrence determine:

A. Is this production application data?
B. Is this demo-only data?
C. Is it actually a reusable UI fixture?
D. Is it a test fixture?

Do not destroy legitimate tests or demo seed data.

Production runtime pages must consume the live API.

==================================================
5. CREATE A SINGLE API DATA PATH
==================================================

The frontend data path must be:

React
 ↓
Typed API Client
 ↓
Firebase ID Token
 ↓
FastAPI
 ↓
Backend Service
 ↓
Firestore / Firebase Storage
 ↓
AI / OCR / ML services where applicable
 ↓
FastAPI response
 ↓
React

Do NOT allow:

React
 ↓
local hardcoded financial object

Do NOT allow:

React
 ↓
direct Firestore business decision logic

Keep business orchestration in FastAPI.

==================================================
6. FIREBASE AUTHENTICATION
==================================================

The signup process must be changed.

PUBLIC SIGNUP ROLE:

customer

Do NOT allow users to select:

relationship_manager
risk_compliance_officer
rm_supervisor
risk_manager
credit_approver
audit_governance_officer
system_admin

from the public signup form.

Public signup should contain:

Full Name
Email
Password
Confirm Password
Terms/Privacy acceptance

No privileged role selector.

==================================================
7. DEFAULT SIGNUP FLOW
==================================================

Implement:

User visits:

/signup

↓
Firebase createUserWithEmailAndPassword()

↓
Firebase authenticated user

↓
Create Firestore user profile

Example:

users/{uid}

{
  uid,
  name,
  email,
  role: "customer",
  status: "active",
  createdAt,
  updatedAt
}

The role MUST default to:

customer

Do not allow frontend input to override this.

==================================================
8. FIRST LOGIN ROUTING
==================================================

After successful signup:

Firebase Auth
↓
Firestore profile
↓
role = customer
↓
route to:

/customer

or the existing MSME customer dashboard route.

The user must NOT be sent to:

/rm
/risk
/rm-supervisor
/risk-manager
/credit-approval
/audit
/admin

unless the backend-authoritative role has later been changed.

==================================================
9. RETURNING USER ROUTING
==================================================

After login:

authenticate with Firebase

↓
retrieve authenticated identity

↓
retrieve authoritative role

↓
route according to role:

customer
→ /customer

relationship_manager
→ /rm

risk_compliance_officer
→ /risk

rm_supervisor
→ /rm-supervisor

risk_manager
→ /risk-manager

credit_approver
→ /credit-approval

audit_governance_officer
→ /audit

system_admin
→ /admin

Do not always route to /customer.

The only default role is customer for NEW SIGNUPS.

==================================================
10. PRIVILEGED ROLE ASSIGNMENT
==================================================

Privileged roles must be assigned through authorized administration.

Possible mechanism:

System Admin
OR
controlled backend role-management operation

changes:

customer
→ relationship_manager

etc.

The frontend must never be able to simply send:

role = "risk_manager"

during signup.

The backend must ignore/reject client-supplied privileged role requests.

==================================================
11. ROLE SECURITY
==================================================

Frontend route guards are for user experience.

Backend authorization remains authoritative.

Every protected FastAPI endpoint must verify:

1. Firebase ID token
2. user identity
3. role
4. resource/application scope
5. operation permission

Never trust a role stored only in:

localStorage
sessionStorage
React state
URL parameters
frontend forms

==================================================
12. RAW CUSTOMER DASHBOARD
==================================================

Preserve the current visual quality of the Customer Dashboard.

However, when the user has no application:

show:

WELCOME TO FINFLOW AI

"You haven't started a financial journey yet."

[Start New Application]

Optional dashboard metrics:

Active Applications
0

Documents
0

Pending Actions
0

Reviews
0

Do not display synthetic company information.

Do not display a fake active case.

Do not display:

Sharma Textiles
Priya Sharma
Pre-Approved Limit
Trust Score
DSCR

unless those are returned by backend data belonging to the authenticated user.

==================================================
13. ACTIVE CASE SELECTOR
==================================================

The current top navigation contains:

Active Case

Replace hardcoded active-case data with a live API call.

When a customer has:

0 applications

show:

"No active applications"

When they have one:

show that application.

When they have multiple:

show a backend-derived application list.

The selected application ID should be stored in frontend state.

All customer modules must use that selected application ID.

==================================================
14. EMPTY STATE ARCHITECTURE
==================================================

Every major customer module must support:

LOADING
EMPTY
SUCCESS
ERROR

Examples:

Evidence:

"No evidence available yet."

Documents:

"No documents uploaded."

Risk:

"Risk assessment will appear after required evidence is verified."

Decision:

"No decision has been generated yet."

Next Best Action:

"No action is currently pending."

Journey:

"Your financial journey will appear here after you start an application."

Do not invent data to fill empty UI.

==================================================
15. CREATE NEW APPLICATION
==================================================

The first real customer operation must be:

Start New Application

Flow:

Customer
↓
Intent Capture
↓
FastAPI
↓
Application/Journey Creation
↓
Firestore
↓
Return application ID
↓
Frontend stores application ID
↓
Navigate to application workspace

Do not create the application only in React state.

The backend must persist it.

==================================================
16. INTENT CAPTURE
==================================================

Intent Capture must call the existing FastAPI journey endpoint.

Send only the validated input required by the backend.

Example conceptual request:

{
  intent,
  requested_amount,
  purpose,
  business_type
}

Backend response should provide:

application_id
journey_id
current_stage
parsed_intent
created_at

Frontend then renders the backend response.

Do not locally fabricate:

application_id
journey stage
risk
decision

==================================================
17. DOCUMENT UPLOAD
==================================================

Document upload must use the real backend/Firebase flow.

Expected architecture:

Customer selects file
↓
Frontend validation
↓
Firebase Storage upload OR existing authorized backend upload flow
↓
Storage path returned
↓
FastAPI document endpoint
↓
Document record in Firestore
↓
Processing status
↓
OCR
↓
Evidence
↓
Evidence stored in Firestore
↓
Frontend refreshes document/evidence state

Use the project's existing implementation where possible.

Do not create a second upload architecture if one already exists.

==================================================
18. FIREBASE STORAGE VALIDATION
==================================================

For every uploaded document verify:

- actual object exists in Firebase Storage
- correct storage path
- authenticated ownership
- metadata exists
- document record exists in Firestore
- document is associated with correct application
- processing status is persisted

Do not merely show:

"Upload successful"

unless backend/storage confirmation succeeded.

==================================================
19. FIRESTORE DOCUMENT MODEL
==================================================

Follow the project's existing Firestore model.

Conceptually:

users/{uid}

applications/{applicationId}

applications/{applicationId}/documents/{documentId}

applications/{applicationId}/evidence/{evidenceId}

applications/{applicationId}/audit/{eventId}

Keep the actual existing schema if it already differs.

Do not rewrite the schema unnecessarily.

==================================================
20. FIRESTORE OWNERSHIP
==================================================

A customer must only access their own applications.

Verify:

authenticated_uid == application.customer_id

on the backend.

Do not rely on:

application ID in frontend
URL ID
React state

for ownership security.

==================================================
21. RAW MODE DATA VERIFICATION
==================================================

After creating a fresh account:

Verify Firestore contains:

User
Role = customer

and contains NO applications.

Customer dashboard should therefore be empty.

Then create a new application.

Verify Firestore contains:

Application
Journey
Initial Journey Step
Audit Event

Then upload one document.

Verify:

Firebase Storage object
+
Firestore document record

Then process it.

Verify:

Evidence records

Then run verification.

Verify:

Evidence verification status

Then run risk.

Verify:

Risk Assessment

Then decision.

Verify:

Decision

Then Next Best Action.

Verify:

Next Action

Everything displayed in frontend must correspond to persisted backend state.

==================================================
22. DO NOT USE FRONTEND-ONLY CASCADE
==================================================

Wrong:

Upload
→ immediately display "Verified"

Correct:

Upload
→ backend processes
→ backend persists status
→ frontend polls/refreshes
→ UI displays actual status

Wrong:

Click Run Risk
→ frontend sets:

risk = "Low"

Correct:

Click Run Risk
→ FastAPI
→ Risk Engine
→ Firestore
→ API response
→ React renders result

==================================================
23. CUSTOMER NAVIGATION
==================================================

The customer navigation must show only customer-authorized modules.

Use role-aware navigation.

Customer should see:

Customer Portal
Start / Apply
Live Journey
Documents & Verification
Evidence
Risk & Eligibility
Decision
Cash Flow
What-If
Next Best Action
Resolution

Do not show:

RM Queue
Risk Queue
RM Supervisor
Risk Manager
Credit Approval
Audit
System Administration

==================================================
24. INTERNAL ROLE NAVIGATION
==================================================

Do not remove internal role functionality.

Maintain separate role dashboards:

/rm
/risk
/rm-supervisor
/risk-manager
/credit-approval
/audit
/admin

Their navigation should remain role-specific.

==================================================
25. REMOVE HARDCODED DASHBOARD METRICS
==================================================

For internal dashboards:

Active Applications
Pending Verification
Needs Review
High Risk
Overrides
Audit Events
etc.

must come from backend aggregation APIs.

If backend doesn't provide a metric yet:

DO NOT hardcode it.

Instead:

show:

"Not available"

or add a narrowly scoped backend aggregation endpoint.

Do not fabricate the value.

==================================================
26. EXISTING DEMO CASES
==================================================

The following synthetic cases may continue to exist:

SkillBridge
SafeEra
Sharma Textiles
other seed cases

BUT:

They must NOT appear automatically in a newly created real customer account.

They must exist only in:

/demo

or through explicit seeded demo users.

Ensure demo data is isolated from normal fresh-signup data.

==================================================
27. DEMO ACCOUNT ISOLATION
==================================================

Do not accidentally attach:

SkillBridge
SafeEra

to every newly registered customer.

New customer:

applications = []

Demo user:

applications = seeded demo records

This distinction is mandatory.

==================================================
28. BACKEND TEST PROTECTION
==================================================

Before changing backend code:

RUN CURRENT TEST SUITE.

Record:

PASS / FAIL

After each backend change:

RUN FULL TEST SUITE AGAIN.

Do not proceed with known regressions.

If backend tests were previously passing and a change breaks them:

STOP.

Diagnose the specific issue.

Do not modify unrelated functionality simply to make tests pass.

==================================================
29. FRONTEND TESTING
==================================================

Run:

npm run build
npm run lint
npm run typecheck

or the project's actual commands.

Fix all:

TypeScript errors
broken imports
routing errors
Firebase errors
API URL errors
CORS errors
runtime errors

==================================================
30. ENVIRONMENT VARIABLES
==================================================

Ensure the frontend uses:

VITE_API_BASE_URL

or the project's existing equivalent.

Do not hardcode:

http://localhost:8000

throughout the codebase.

Backend environment must contain its Firebase configuration.

Never commit:

service account keys
private keys
API secrets
LLM API keys

==================================================
31. FIREBASE CONNECTION DIAGNOSTICS
==================================================

Add a safe developer/admin diagnostic mechanism to verify:

Firebase Auth:
CONNECTED / ERROR

Firestore:
CONNECTED / ERROR

Firebase Storage:
CONNECTED / ERROR

FastAPI:
CONNECTED / ERROR

Do not expose secrets.

Do not display service credentials.

The diagnostic should test actual connectivity, not simply check whether configuration variables exist.

==================================================
32. FIRESTORE WRITE VERIFICATION
==================================================

For development/demo testing, create a controlled health-check mechanism.

Example:

Create a temporary/diagnostic record in a protected location.

Write
→ read
→ verify
→ optionally clean up

Do NOT test connectivity by modifying customer financial records.

==================================================
33. FIREBASE STORAGE TEST
==================================================

Verify:

small test upload
→ Firebase Storage
→ confirm object
→ read metadata
→ optionally delete test object

This should be restricted to authorized development/system-admin contexts.

Do not expose it to ordinary customers.

==================================================
34. API INTEGRATION LOGGING
==================================================

During development, make API failures easy to diagnose.

Log safely:

method
endpoint
status
request ID if available
duration

Do NOT log:

passwords
Firebase tokens
financial documents
sensitive personal information

Use browser developer tools for frontend debugging where appropriate.

==================================================
35. API RESPONSE MAPPING
==================================================

For every API consumed by React:

Identify:

request type
response type
error type

Create TypeScript types based on the actual FastAPI schemas.

Do not guess response property names.

Example:

If backend returns:

risk_score

do not expect:

riskScore

unless the API client intentionally transforms it.

Centralize transformations.

==================================================
36. REQUEST/RESPONSE DEBUGGING
==================================================

For every currently broken integration:

Use this procedure:

1. Trigger frontend action.
2. Inspect browser Network request.
3. Verify request URL.
4. Verify Authorization header.
5. Verify request body.
6. Inspect FastAPI status.
7. Inspect response body.
8. Compare against Pydantic schema.
9. Verify Firestore side effect.
10. Verify frontend state update.

Do NOT "fix" the issue by hardcoding a frontend value.

==================================================
37. APPLICATION DATA REFETCH
==================================================

After every important mutation:

create application
upload document
process document
verify evidence
run risk
generate decision
request review
approve
decline
override
generate next action

refetch or update frontend state from backend.

Important financial state should never depend solely on optimistic frontend state.

==================================================
38. PAGE REFRESH TEST
==================================================

This is mandatory.

After creating an application:

Refresh browser.

The application must still exist.

After uploading a document:

Refresh.

Document must still exist.

After evidence processing:

Refresh.

Evidence must still exist.

After risk:

Refresh.

Risk must still exist.

After decision:

Refresh.

Decision must still exist.

After human review:

Refresh.

Review state must still exist.

This proves Firebase + FastAPI persistence is actually working.

==================================================
39. LOGOUT / LOGIN TEST
==================================================

After creating real application data:

Logout.

Login again.

Verify:

- same customer
- same role
- same applications
- same documents
- same evidence
- same journey state

No data should disappear because it was previously held only in React state.

==================================================
40. NEW USER TEST
==================================================

Create a brand-new customer account.

Expected:

Firebase account created

Firestore profile created

role = customer

customer dashboard

zero applications

no demo cases

no internal navigation

No inherited data from any previous account.

==================================================
41. CROSS-USER ISOLATION TEST
==================================================

Create:

Customer A

Customer B

Customer A creates an application.

Customer B must NOT see Customer A's application.

Direct API manipulation from frontend must NOT bypass backend authorization.

Test both:

frontend route
and
direct FastAPI API request

==================================================
42. DEFAULT CUSTOMER EXPERIENCE
==================================================

Immediately after signup:

Landing/Welcome
↓
Customer Dashboard
↓
"No active application"
↓
Start New Application

The experience should feel intentional.

Do not show:

fake approval
fake trust score
fake DSCR
fake business
fake documents

==================================================
43. ACTIVE APPLICATION AFTER CREATION
==================================================

After customer creates an application:

dashboard should dynamically show:

Active Application
Current Stage
Requested Amount
Purpose
Created At
Next Action

All from backend.

==================================================
44. DO NOT DESTROY THE CURRENT VISUAL DESIGN
==================================================

The current frontend design is already strong.

Keep:

- FinFlow logo
- enterprise styling
- navigation structure
- cards
- typography
- journey tracker
- status indicators
- evidence presentation
- risk presentation
- decision layout
- Next Best Action design

Improve only where needed for:

live data
empty states
loading
errors
role isolation
responsive behavior
consistency

Do NOT replace the interface with a generic dashboard.

==================================================
45. CURRENT SCREEN DATA BINDING
==================================================

The following visual areas should become backend-driven:

Welcome user
Active case
Pre-approved limit
Trust Score
DSCR
Verified Documents
Next Best Action
Journey Tracker

If backend data doesn't exist:

show empty/awaiting state.

Never invent data.

==================================================
46. CLEAN DEMO / REAL MODE SEPARATION
==================================================

Add an application-level environment/configuration distinction:

NORMAL

and:

DEMO

Do not scatter:

if demo then...

throughout the application.

Centralize demo-mode behavior.

==================================================
47. HARDcoded DATA AUDIT REPORT
==================================================

After migration, create a report identifying all remaining hardcoded business data.

Categorize:

SAFE:
UI copy
labels
constants
design values

DEMO:
seeded scenario data

TEST:
test fixtures

REMOVE:
production runtime business data

The goal is:

NORMAL RUNTIME
=
NO HARD-CODED BUSINESS DATA

==================================================
48. BACKEND SEEDING
==================================================

Keep demo seeding scripts intact where useful.

But make them explicitly target:

DEMO DATA

and never default user data.

If a reset mechanism exists:

ensure it only modifies synthetic demo data.

==================================================
49. ROUTING SAFETY
==================================================

Protected routes must check authentication.

Role routes must check role.

Example:

Customer cannot access:

/rm
/risk
/audit
/admin

RM cannot access admin.

Audit cannot approve.

Admin cannot make financial decisions simply because they have technical authority.

Unauthorized:

→ proper Unauthorized page

not silent access.

==================================================
50. FIREBASE ROLE SOURCE OF TRUTH
==================================================

Use the project's chosen authoritative method.

Prefer:

Firebase Auth identity
+
Firestore profile / controlled claims

Do not allow users to modify their own privileged role.

If custom claims are already implemented:

use them appropriately.

If role is stored in Firestore:

backend retrieves it securely.

Keep role resolution consistent across frontend/backend.

==================================================
51. SECURITY RULES
==================================================

Review Firestore Security Rules.

At minimum verify conceptually:

Customer:
read/write only permitted own-user/application resources.

Internal roles:
scope according to backend authorization model.

Audit:
append-only where appropriate.

System configuration:
admin-only.

Do not solve all security only through frontend checks.

==================================================
52. RAW DATA DISPLAY RULE
==================================================

Never display a financial value unless it comes from:

1. persisted backend record
2. current API response
3. explicit backend-generated derived metric

No value should originate only from:

React constant
mock object
random generator
hardcoded JSX
localStorage

==================================================
53. FINANCIAL DERIVED VALUES
==================================================

Do not move financial calculations into React.

For example:

DSCR
Cash Flow
Risk
Trust Score
Affordability

must be returned by backend services.

Frontend only formats and displays the result.

==================================================
54. REAL DOCUMENT TEST
==================================================

After implementation, test using one of the synthetic PDF files prepared for FinFlow AI.

For example:

SkillBridge_Bank_Statement_12M.pdf

Upload it as a real customer.

Verify:

1. Firebase Storage object exists.
2. Firestore document record exists.
3. FastAPI receives the document.
4. OCR processes it.
5. Evidence is generated.
6. Evidence is persisted.
7. Frontend displays the actual extracted data.

Then test:

SkillBridge GST
SkillBridge ITR
SkillBridge Registration

and verify cross-document consistency.

==================================================
55. NEGATIVE DOCUMENT TEST
==================================================

Repeat with:

SafeEra

Verify the negative scenario remains backend-driven.

Do not inject the expected answer into the frontend.

FinFlow should derive:

evidence
→ risk signals
→ risk
→ decision
→ next action

from the actual processed data.

==================================================
56. NO FAKE SUCCESS STATES
==================================================

Avoid:

"Success" before backend confirms success.

Examples:

Upload:
only display completed after confirmed storage/API response.

OCR:
only display processed after backend completion.

Risk:
only display risk after backend response.

Decision:
only display decision after persisted backend result.

==================================================
57. FAILURE RECOVERY
==================================================

If upload succeeds in Storage but Firestore creation fails:

show an actionable error.

If Firestore creates record but OCR fails:

show processing failure.

If OCR succeeds but risk is unavailable:

show:

"Evidence processed. Risk assessment is currently unavailable."

Do not pretend the full journey completed.

==================================================
58. PRESERVE JOURNEY STATE MACHINE
==================================================

Do not allow frontend navigation to imply stage completion.

If backend says:

EVIDENCE

the frontend should show:

Evidence active

even if the user manually navigates to:

/decision

The decision page should display:

"Decision is not yet available because the journey has not reached the decision stage."

Backend remains authoritative.

==================================================
59. PRESERVE AUDIT TRAIL
==================================================

Every important mutation must still create backend audit records.

At minimum:

application created
document uploaded
document processed
evidence generated
evidence verified
risk assessed
decision generated
review opened
review action
override
resolution

Do not fabricate audit events in React.

==================================================
60. PERFORMANCE
==================================================

Do not make every component independently refetch the same application.

Use a sensible data-fetching architecture.

Fetch application context once where appropriate.

Then fetch only relevant child datasets.

Avoid request storms.

==================================================
61. FINAL INTEGRATION TEST
==================================================

Perform exactly this:

STEP 1
Open application in a clean browser/session.

STEP 2
Create NEW account.

STEP 3
Verify role = customer.

STEP 4
Verify automatic route to /customer.

STEP 5
Verify dashboard is EMPTY.

STEP 6
Create new financial journey.

STEP 7
Verify Firestore application.

STEP 8
Upload one real synthetic PDF.

STEP 9
Verify Firebase Storage.

STEP 10
Verify Firestore document record.

STEP 11
Process OCR.

STEP 12
Verify Evidence Ledger persistence.

STEP 13
Verify frontend displays extracted evidence.

STEP 14
Upload remaining documents.

STEP 15
Run consistency checks.

STEP 16
Run financial analytics.

STEP 17
Run eligibility/risk.

STEP 18
Generate explanation.

STEP 19
Generate Next Best Action.

STEP 20
Refresh browser.

STEP 21
Logout.

STEP 22
Login again.

STEP 23
Verify all data persists.

STEP 24
Verify unauthorized role access fails.

STEP 25
Run backend tests.

STEP 26
Run frontend build.

==================================================
62. ACCEPTANCE CRITERIA
==================================================

The task is NOT complete unless:

✓ New signup creates Firebase user
✓ Firestore profile created
✓ New signup defaults to customer
✓ Customer automatically routed to /customer
✓ New customer has no fake application
✓ Customer navigation contains no internal-role menus
✓ Customer can create real application
✓ Application persisted in Firestore
✓ Document reaches Firebase Storage
✓ Document metadata reaches Firestore
✓ OCR processing is backend-driven
✓ Evidence persists
✓ Risk persists
✓ Decision persists
✓ Next Best Action persists
✓ Audit events persist
✓ Browser refresh preserves data
✓ Logout/login preserves data
✓ Users cannot see other users' applications
✓ Privileged roles remain restricted
✓ Demo data remains isolated
✓ No production page depends on hardcoded business data
✓ Frontend consumes actual FastAPI responses
✓ Backend tests remain passing
✓ Frontend build succeeds
✓ No obvious runtime/API errors

==================================================
63. FINAL REPORT
==================================================

At the end report:

1. Hardcoded business data removed
2. Mock API responses removed
3. Demo data preserved separately
4. Firebase Auth flow
5. Firestore persistence flow
6. Firebase Storage flow
7. Signup routing
8. RBAC routing
9. API integration map
10. Files modified
11. Files created
12. Backend changes
13. Frontend changes
14. Tests executed
15. Firebase connectivity verification
16. Real document upload verification
17. Remaining issues

==================================================
64. ABSOLUTE DO-NOT-BREAK RULE
==================================================

If an existing feature already works:

DO NOT REWRITE IT.

If integration is unclear:

INSPECT IT FIRST.

If an API is missing:

ADD THE SMALLEST COMPATIBLE ENDPOINT.

If frontend and backend schemas differ:

CREATE A CLEAN ADAPTER.

Do not rewrite the domain service.

If a change may affect backend tests:

RUN THE TESTS BEFORE AND AFTER.

If a migration fails:

STOP AND FIX THE SPECIFIC FAILURE.

Never create a "temporary fake" implementation to make the UI appear functional.

==================================================
FINAL ARCHITECTURAL GOAL
==================================================

The final FinFlow AI application should behave like this:

NEW USER
   ↓
Firebase Signup
   ↓
Firestore User Profile
   ↓
role = customer
   ↓
/customer
   ↓
EMPTY MSME DASHBOARD
   ↓
Start Financial Journey
   ↓
FastAPI
   ↓
Firestore Application
   ↓
Upload Documents
   ↓
Firebase Storage
   ↓
FastAPI Processing
   ↓
OCR
   ↓
Evidence Ledger
   ↓
Consistency
   ↓
Financial Analytics
   ↓
Rules + ML
   ↓
Explainability
   ↓
Next Best Action
   ↓
Human Governance
   ↓
Audit / Resolution

SOURCE OF TRUTH:

Authentication
→ Firebase

User Profile
→ Firestore

Application State
→ FastAPI + Firestore

Documents
→ Firebase Storage

Evidence
→ Firestore

Risk
→ FastAPI risk engine + Firestore

Decision
→ FastAPI decision engine + Firestore

Audit
→ Firestore

Frontend
→ Presentation + interaction layer

The most important objective:

TURN FINFLOW AI FROM A PREPOPULATED DEMONSTRATION UI INTO A REAL, EMPTY-BY-DEFAULT, DATA-DRIVEN APPLICATION THAT PROVES ITS ENTIRE PIPELINE THROUGH ACTUAL FIREBASE + FASTAPI PERSISTENCE.