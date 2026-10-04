from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.config import settings
from backend.routers import (
    auth_router,
    journeys_router,
    documents_router,
    financial_router,
    risk_decision_router,
    governance_router,
    demo_router,
    intent_router,
    policy_rag_router,
    fraud_network_router,
    reviews_router,
    audit_router,
    applications_router,
    system_router,
)
from backend.modules.rag import PolicyIngestionService

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Seed demo benchmark data & institutional credit policies
    demo_router.seed_demo_data()
    PolicyIngestionService.seed_default_policies()
    yield

app = FastAPI(
    title="FinFlow AI — Intelligent & Explainable Financial Journey Orchestration API",
    description="MVP Backend providing end-to-end SME working capital journey orchestration, document intelligence, deterministic hard rules, scikit-learn ML risk model, SHAP explainability, and Module 7 Financial Trust Intelligence.",
    version="2.1.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local uploads static directory for document access
app.mount("/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="uploads")

# Include API Routers
app.include_router(auth_router.router)
app.include_router(journeys_router.router)
app.include_router(documents_router.router)
app.include_router(financial_router.router)
app.include_router(risk_decision_router.router)
app.include_router(governance_router.router)
app.include_router(demo_router.router)
app.include_router(intent_router.router)
app.include_router(policy_rag_router.router)
app.include_router(fraud_network_router.router)
app.include_router(reviews_router.router)
app.include_router(audit_router.router)
app.include_router(applications_router.router)
app.include_router(system_router.router)

@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "service": "FinFlow AI Backend",
        "version": "2.1.0",
        "environment": settings.ENVIRONMENT,
        "demo_mode": settings.DEMO_MODE
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=True)
