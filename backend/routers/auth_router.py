from fastapi import APIRouter, Depends, HTTPException, Body, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
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

@router.post("/session", response_model=SessionResponse)
def establish_session(req: SessionRequest):
    """Establishes or verifies an authentication session.
    When a token is provided, it is cryptographically verified.
    When no token is provided in demo mode, returns the corresponding demo token.
    """
    if req.token:
        user = verify_token(req.token)
        return SessionResponse(token=req.token, user=user)
    
    # If role is requested for instant persona switching in demo mode:
    role = req.role or UserRole.CUSTOMER
    role_token_map = {
        UserRole.CUSTOMER: "demo-customer",
        UserRole.RM: "demo-rm",
        UserRole.RISK_OFFICER: "demo-risk-officer",
        UserRole.ADMIN: "demo-admin"
    }
    demo_token = role_token_map.get(role, "demo-customer")
    user = DEMO_USERS[demo_token]
    return SessionResponse(token=demo_token, user=user)

@router.get("/me", response_model=AuthenticatedUser)
def get_current_profile(user: AuthenticatedUser = Depends(get_current_user)):
    """Returns the authenticated profile resolved strictly from verified tokens."""
    return user

@router.post("/claims")
def assign_role_claims(
    req: AssignRoleRequest,
    admin: AuthenticatedUser = Depends(require_admin)
):
    """Admin-only endpoint to assign Firebase custom role claims to a user."""
    success = set_firebase_custom_role(req.uid, req.role)
    if not success:
        return {
            "status": "simulated",
            "message": f"Assigned role {req.role.value} to {req.uid} (running in demo mode)."
        }
    return {
        "status": "success",
        "message": f"Successfully assigned role {req.role.value} to Firebase UID {req.uid}."
    }
