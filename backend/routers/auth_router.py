from fastapi import APIRouter, Depends, HTTPException, Body, status
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from backend.auth.firebase_auth import (
    get_current_user,
    require_admin,
    AuthenticatedUser,
    DEMO_USERS,
    verify_token,
    set_firebase_custom_role
)
from backend.auth.roles import UserRole

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication & Profiles"])

class SessionRequest(BaseModel):
    token: Optional[str] = None
    role: Optional[UserRole] = None

class SessionResponse(BaseModel):
    token: str
    user: AuthenticatedUser

class AssignRoleRequest(BaseModel):
    uid: str
    role: UserRole
    delegated_limit_inr: Optional[float] = 0.0

class PersonaInfo(BaseModel):
    role: UserRole
    name: str
    email: str
    title: str
    delegated_limit_inr: float
    token: str
    category: str

@router.post("/session", response_model=SessionResponse)
def establish_session(req: SessionRequest):
    """Establishes or verifies an authentication session.
    When a token is provided, it is cryptographically verified.
    When no token is provided in demo mode, returns the corresponding demo token.
    """
    if req.token:
        user = verify_token(req.token)
        return SessionResponse(token=req.token, user=user)
    
    # If role is requested for instant persona switching across all 8 roles:
    role = req.role or UserRole.CUSTOMER
    role_token_map = {
        UserRole.CUSTOMER: "demo-customer",
        UserRole.RM: "demo-rm",
        UserRole.RM_SUPERVISOR: "demo-rm-supervisor",
        UserRole.RISK_OFFICER: "demo-risk-officer",
        UserRole.RISK_MANAGER: "demo-risk-manager",
        UserRole.CREDIT_APPROVER: "demo-credit-approver",
        UserRole.AUDIT_OFFICER: "demo-audit-officer",
        UserRole.SYS_ADMIN: "demo-admin",
    }
    demo_token = role_token_map.get(role, "demo-customer")
    user = DEMO_USERS[demo_token]
    return SessionResponse(token=demo_token, user=user)

@router.get("/me", response_model=AuthenticatedUser)
def get_current_profile(user: AuthenticatedUser = Depends(get_current_user)):
    """Returns the authenticated profile resolved strictly from verified tokens."""
    return user

@router.get("/personas", response_model=List[PersonaInfo])
def list_available_personas():
    """Returns all 8 personas configured for FinFlow AI."""
    personas = [
        PersonaInfo(
            role=UserRole.CUSTOMER,
            name="Priya Sharma",
            email="priya.sharma@sharmatextiles.in",
            title="Managing Director & Founder, Sharma Textiles",
            delegated_limit_inr=0.0,
            token="demo-customer",
            category="Customer"
        ),
        PersonaInfo(
            role=UserRole.RM,
            name="Rohan Mehta",
            email="rohan.mehta@finflowbank.com",
            title="Senior Relationship Manager",
            delegated_limit_inr=0.0,
            token="demo-rm",
            category="First-Line Operations"
        ),
        PersonaInfo(
            role=UserRole.RM_SUPERVISOR,
            name="Vikram Malhotra",
            email="vikram.malhotra@finflowbank.com",
            title="Credit Operations Manager / RM Supervisor",
            delegated_limit_inr=0.0,
            token="demo-rm-supervisor",
            category="First-Line Operations"
        ),
        PersonaInfo(
            role=UserRole.RISK_OFFICER,
            name="Ananya Iyer",
            email="ananya.iyer@finflowbank.com",
            title="Chief Credit Risk & Fraud Officer",
            delegated_limit_inr=2500000.0,
            token="demo-risk-officer",
            category="Second-Line Risk"
        ),
        PersonaInfo(
            role=UserRole.RISK_MANAGER,
            name="Meera Krishnan",
            email="meera.krishnan@finflowbank.com",
            title="Senior Credit Risk Officer / Risk Manager",
            delegated_limit_inr=10000000.0,
            token="demo-risk-manager",
            category="Second-Line Risk"
        ),
        PersonaInfo(
            role=UserRole.CREDIT_APPROVER,
            name="Rajesh Singhania",
            email="rajesh.singhania@finflowbank.com",
            title="Chief Credit Officer / Committee Chair",
            delegated_limit_inr=50000000.0,
            token="demo-credit-approver",
            category="Sanction Authority"
        ),
        PersonaInfo(
            role=UserRole.AUDIT_OFFICER,
            name="Sunita Rao",
            email="sunita.rao@finflowbank.com",
            title="Director of Internal Audit & Algorithmic Governance",
            delegated_limit_inr=0.0,
            token="demo-audit-officer",
            category="Third-Line Assurance"
        ),
        PersonaInfo(
            role=UserRole.SYS_ADMIN,
            name="Amit Verma",
            email="admin@finflow.ai",
            title="Platform Infrastructure Lead",
            delegated_limit_inr=0.0,
            token="demo-admin",
            category="Technical Custodian"
        ),
    ]
    return personas

@router.post("/claims")
def assign_role_claims(
    req: AssignRoleRequest,
    admin: AuthenticatedUser = Depends(require_admin)
):
    """Admin-only endpoint to assign Firebase custom role claims and limits to a user."""
    success = set_firebase_custom_role(req.uid, req.role, req.delegated_limit_inr or 0.0)
    if not success:
        return {
            "status": "simulated",
            "message": f"Assigned role {req.role.value} to {req.uid} with limit ₹{req.delegated_limit_inr:,.2f} (running in demo mode)."
        }
    return {
        "status": "success",
        "message": f"Successfully assigned role {req.role.value} with limit ₹{req.delegated_limit_inr:,.2f} to UID {req.uid}."
    }

class MSMEProfileUpdateRequest(BaseModel):
    business_name: Optional[str] = None
    promoter_name: Optional[str] = None
    legal_entity_type: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    pan: Optional[str] = None
    gstin: Optional[str] = None
    industry_sector: Optional[str] = None
    vintage_months: Optional[int] = None
    annual_turnover: Optional[float] = None
    registered_address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None

@router.get("/profile")
def get_user_msme_profile(user: AuthenticatedUser = Depends(get_current_user)):
    """Returns the MSME profile for the authenticated user, or a personalized default."""
    from backend.database.firestore_client import db
    from datetime import datetime, timezone
    profile = db.get("msme_profiles", user.uid)
    if not profile:
        email = user.email or "borrower@enterprise.com"
        is_ruturaj = "bhomeruturaj" in email.lower() or "ruturaj" in (user.name or "").lower()
        derived_name = user.name or ("Ruturaj Bhome" if is_ruturaj else email.split("@")[0].replace(".", " ").title())
        biz_name = "SkillBridge Enterprises" if is_ruturaj else f"{derived_name} Enterprises"
        profile = {
            "user_id": user.uid,
            "email": email,
            "promoter_name": derived_name,
            "business_name": biz_name,
            "legal_entity_type": "PRIVATE_LIMITED",
            "phone": "8468812201" if is_ruturaj else "+91 98765 43210",
            "pan": "SKLBR1234A" if is_ruturaj else "",
            "gstin": "27SKLBR1234A1Z5" if is_ruturaj else "",
            "industry_sector": "Information Technology & Software" if is_ruturaj else "Manufacturing & Services",
            "vintage_months": 48 if is_ruturaj else 24,
            "annual_turnover": 30000000.0 if is_ruturaj else 5000000.0,
            "registered_address": "",
            "city": "Mumbai",
            "pincode": "400001",
            "is_profile_complete": bool(is_ruturaj),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        db.set("msme_profiles", user.uid, profile)
    else:
        # Guarantee registered account email is synchronized (never keep stale demo bank employee email)
        if user.email and (
            not profile.get("email")
            or profile.get("email").endswith("@finflowbank.com")
            or profile.get("email") in ("customer@example.com", "borrower@enterprise.com")
        ):
            profile["email"] = user.email
            db.set("msme_profiles", user.uid, profile)
        if "bhomeruturaj" in (user.email or "").lower() and not profile.get("business_name"):
            profile["business_name"] = "SkillBridge Enterprises"
            profile["promoter_name"] = "Ruturaj Bhome"
            db.set("msme_profiles", user.uid, profile)
    return profile

@router.put("/profile")
def update_user_msme_profile(data: MSMEProfileUpdateRequest, user: AuthenticatedUser = Depends(get_current_user)):
    """Updates the MSME business profile for the authenticated user and syncs related applications."""
    from backend.database.firestore_client import db
    from datetime import datetime, timezone
    existing = db.get("msme_profiles", user.uid) or {}
    updated = {**existing, **{k: v for k, v in data.model_dump().items() if v is not None}}
    updated["user_id"] = user.uid

    # Validate email to ensure it does not revert to bank staff
    clean_email = data.email
    if clean_email and clean_email.endswith("@finflowbank.com"):
        clean_email = user.email
    updated["email"] = clean_email or user.email or existing.get("email", "")
    updated["is_profile_complete"] = bool(updated.get("business_name") and updated.get("promoter_name"))
    updated["updated_at"] = datetime.now(timezone.utc).isoformat()
    db.set("msme_profiles", user.uid, updated)

    # Cascade business name updates to all user journeys and applications
    new_biz = updated.get("business_name")
    if new_biz:
        try:
            user_journeys = db.list("journeys", filters={"applicant_id": user.uid})
            for j in user_journeys:
                if "intent" in j and isinstance(j["intent"], dict):
                    j["intent"]["business_name"] = new_biz
                j["business_name"] = new_biz
                db.set("journeys", j["journey_id"], j)

            user_apps = db.list("applications", filters={"user_id": user.uid})
            for a in user_apps:
                a["business_name"] = new_biz
                db.set("applications", a["application_id"], a)
        except Exception:
            pass

    return updated

