# FinFlow AI — Setup & Local Development Guide

This guide walks you through setting up and running **FinFlow AI** locally for development, evaluation, and demonstration.

---

## 1. Prerequisites

Before setting up FinFlow AI, ensure you have the following installed:
- **Python:** Version 3.11, 3.12, 3.13, or 3.14
- **Node.js:** Version 18.0.0 or higher (LTS recommended)
- **Package Manager:** `npm` (v9+) or `pnpm`
- **Git**

---

## 2. Directory Structure

```
Mindcraft_RAY_Fintech/
├── backend/
│   ├── config.py                 # Pydantic system settings & env parsers
│   ├── main.py                   # FastAPI initialization & middleware
│   ├── requirements.txt          # Python dependencies
│   ├── database/                 # In-Memory & Firestore Client abstractions
│   ├── modules/                  # 7 Bounded Business Modules
│   ├── routers/                  # Modular REST route handlers
│   └── tests/                    # 204 Pytest integration & unit test cases
├── frontend/
│   ├── package.json              # React 19 dependencies & scripts
│   ├── vite.config.ts            # Vite configuration with rolldown/chunking
│   ├── src/
│   │   ├── api/                  # Typed API clients & Axios interceptors
│   │   ├── components/           # Reusable fintech components & governance badges
│   │   ├── context/              # Authentication & Role context providers
│   │   └── pages/                # Role-specific route views
│   └── public/                   # Static assets & sample PDF files
├── firebase.json                 # Firebase Hosting & Firestore emulator config
├── firestore.indexes.json        # Composite indexes configuration
└── firestore.rules               # Production-grade Firestore security rules
```

---

## 3. Backend Setup

### Step 3.1: Python Virtual Environment
Open a terminal in the project root:

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
```

### Step 3.2: Install Dependencies
```bash
pip install --upgrade pip
pip install -r backend/requirements.txt
```

### Step 3.3: Configure Environment Variables
Create `backend/.env` (or copy from `backend/.env.example`):

```ini
APP_NAME=FinFlow-AI
ENVIRONMENT=development
PORT=8000
DEBUG=True

ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173
SECRET_KEY=finflow-super-secure-production-key-for-jwt-and-signing

# In-Memory Firestore mock allows instant zero-config startup:
USE_IN_MEMORY_FIRESTORE=True
FIREBASE_PROJECT_ID=finflow-mindcraft

# Deterministic fallback mode enables rock-solid offline demo reliability:
FALLBACK_DETERMINISTIC_LLM=True
```

### Step 3.4: Launch the Backend
```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
Check health endpoint:
```bash
curl http://localhost:8000/health
# Response: {"status":"healthy","version":"2.1.0","environment":"development"}
```
Access interactive OpenAPI / Swagger docs:
`http://localhost:8000/docs`

---

## 4. Frontend Setup

### Step 4.1: Install Dependencies
Open a second terminal:

```bash
cd frontend
npm install
```

### Step 4.2: Configure Environment Variables
Create `frontend/.env` (or copy from `frontend/.env.example`):

```ini
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_FIREBASE_API_KEY=mock-api-key
VITE_FIREBASE_AUTH_DOMAIN=finflow-mindcraft.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=finflow-mindcraft
```

### Step 4.3: Launch Development Server
```bash
npm run dev -- --port 5173
```
Open `http://localhost:5173` in your browser.

---

## 5. Running with Firebase Emulator (Optional)

If you wish to test with Google Cloud's official local Firestore Emulator instead of in-memory mode:

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```
2. Start the local Firestore emulator:
```bash
firebase emulators:start --only firestore
```
3. Set environment variable in `backend/.env`:
```ini
USE_IN_MEMORY_FIRESTORE=False
FIRESTORE_EMULATOR_HOST=localhost:8080
```
4. Restart the FastAPI backend.

---

## 6. Seed Demo Data

FinFlow AI automatically seeds benchmark data on startup. If you ever need to reset to the clean benchmark baseline during evaluation:
- Use the UI: Click the **Demo Benchmark Reset** button in the header bar or Admin console.
- Or use the terminal:
```bash
curl -X POST http://localhost:8000/api/v1/demo/reset
```

---

## 7. Running Tests & Code Verification

Ensure system integrity by running the full automated verification:

```bash
# 1. Full Backend Pytest Suite (204 tests)
python -m pytest

# 2. Acceptance Test Suite (TC-01 to TC-11)
python -m pytest backend/tests/test_final_acceptance_tcs.py -v

# 3. Frontend Quality Checks
cd frontend
npm run lint       # 0 errors
npx tsc --noEmit   # Type safety check
npm run build      # Production bundle compilation
```
