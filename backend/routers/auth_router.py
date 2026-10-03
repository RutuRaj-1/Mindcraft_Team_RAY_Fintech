from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from typing import Optional
from backend.auth.firebase_auth import get_current_user, AuthenticatedUser, DEMO_USERS, verify_token
from backend.auth.roles import UserRole

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication & Profiles"])

class SessionRequest(BaseModel):
    token: Optional[str] = None
    role: Optional[UserRole] = None

class SessionResponse(BaseModel):
    token: str
    user: AuthenticatedUser

@router.post("/session", response_model=SessionResponse)
def establish_session(req: SessionRequest):
    if req.token:
        user = verify_token(req.token)
        return SessionResponse(token=req.token, user=user)
    
    # If role is requested for instant persona switching:
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
    return user
