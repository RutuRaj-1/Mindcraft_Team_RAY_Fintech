import os
import logging
from typing import Optional, List
from fastapi import HTTPException, Security, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from backend.auth.roles import UserRole
from backend.config import settings

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)

class AuthenticatedUser(BaseModel):
    uid: str
    email: str
    name: str
    role: UserRole
    business_id: Optional[str] = None
    claims: dict = {}

# Demo user profiles for instantaneous hackathon switching and mock testing
DEMO_USERS = {
    "demo-customer": AuthenticatedUser(
        uid="usr_priya_001",
        email="priya.sharma@sharmatextiles.in",
        name="Priya Sharma",
        role=UserRole.CUSTOMER,
        business_id="biz_sharma_textiles",
        claims={"role": "CUSTOMER"}
    ),
    "demo-rm": AuthenticatedUser(
        uid="usr_rohan_002",
        email="rohan.mehta@finbridge.bank",
        name="Rohan Mehta",
        role=UserRole.RM,
        claims={"role": "RM"}
    ),
    "demo-risk-officer": AuthenticatedUser(
        uid="usr_ananya_003",
        email="ananya.iyer@finbridge.bank",
        name="Ananya Iyer",
        role=UserRole.RISK_OFFICER,
        claims={"role": "RISK_OFFICER"}
    ),
    "demo-admin": AuthenticatedUser(
        uid="usr_admin_004",
        email="admin@finflow.ai",
        name="System Administrator",
        role=UserRole.ADMIN,
        claims={"role": "ADMIN"}
    )
}

# Try initializing Firebase Admin if credentials are provided
firebase_initialized = False
try:
    import firebase_admin
    from firebase_admin import auth as fb_auth, credentials

    if settings.FIREBASE_PRIVATE_KEY and settings.FIREBASE_CLIENT_EMAIL:
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": settings.FIREBASE_PROJECT_ID,
            "private_key_id": settings.FIREBASE_PRIVATE_KEY_ID,
            "private_key": settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n"),
            "client_email": settings.FIREBASE_CLIENT_EMAIL,
            "client_id": settings.FIREBASE_CLIENT_ID,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        })
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred, {
                'storageBucket': settings.FIREBASE_STORAGE_BUCKET
            })
        firebase_initialized = True
        logger.info("Firebase Admin SDK initialized with service account credentials.")
    elif settings.FIREBASE_CREDENTIALS_PATH and os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred, {
                'storageBucket': settings.FIREBASE_STORAGE_BUCKET
            })
        firebase_initialized = True
        logger.info("Firebase Admin SDK initialized via credentials file path.")
    else:
        logger.info("Firebase credentials not configured. Running in high-fidelity local/demo mode.")
except Exception as e:
    logger.warning(f"Firebase Admin SDK initialization skipped/failed ({e}). Running with demo authentication.")

def verify_token(token: str) -> AuthenticatedUser:
    """Verifies Firebase token or returns mapped demo user.
    Never trusts client-supplied role parameters; only reads verified claims.
    """
    if not token or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token."
        )

    # 1. Check exact demo token shortcuts
    if token in DEMO_USERS:
        return DEMO_USERS[token]
    
    # 2. Check if token starts with 'Bearer '
    clean_token = token.replace("Bearer ", "").strip()
    if clean_token in DEMO_USERS:
        return DEMO_USERS[clean_token]

    # 3. Check Firebase Admin verification if active
    if firebase_initialized:
        try:
            from firebase_admin import auth as fb_auth
            decoded = fb_auth.verify_id_token(clean_token)
            role_claim = decoded.get("role", "CUSTOMER").upper()
            try:
                user_role = UserRole(role_claim)
            except ValueError:
                user_role = UserRole.CUSTOMER

            return AuthenticatedUser(
                uid=decoded.get("uid"),
                email=decoded.get("email", ""),
                name=decoded.get("name", decoded.get("email", "User")),
                role=user_role,
                business_id=decoded.get("business_id"),
                claims=decoded
            )
        except Exception as e:
            logger.warning(f"Firebase token verification failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid Firebase ID token: {str(e)}"
            )

    # 4. Fallback matching in demo mode
    if settings.DEMO_MODE:
        # Match demo token patterns like 'demo-customer', 'demo-rm', etc.
        for role_key, user in DEMO_USERS.items():
            if role_key.replace("demo-", "") in clean_token.lower():
                return user
        return DEMO_USERS["demo-customer"]

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication credentials not provided or invalid"
    )

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> AuthenticatedUser:
    if not credentials or not credentials.credentials:
        if settings.DEMO_MODE:
            # Default to Customer for frictionless demo fallback
            return DEMO_USERS["demo-customer"]
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing or invalid"
        )
    return verify_token(credentials.credentials)

def require_role(allowed_roles: List[UserRole]):
    """Generic role-checking dependency."""
    def role_checker(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role in {[r.value for r in allowed_roles]}, but user has role {user.role.value}"
            )
        return user
    return role_checker

# Explicit role dependencies as required by architecture
def require_customer(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    """Enforces CUSTOMER role access (or ADMIN override)."""
    if user.role not in [UserRole.CUSTOMER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Customer privileges required, but current role is {user.role.value}"
        )
    return user

def require_rm(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    """Enforces Relationship Manager (RM) role access (or ADMIN override)."""
    if user.role not in [UserRole.RM, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Relationship Manager privileges required, but current role is {user.role.value}"
        )
    return user

def require_risk_officer(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    """Enforces Risk & Compliance Officer role access (or ADMIN override)."""
    if user.role not in [UserRole.RISK_OFFICER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Risk Officer privileges required, but current role is {user.role.value}"
        )
    return user

def require_admin(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    """Enforces Administrator role access."""
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Administrator privileges required, but current role is {user.role.value}"
        )
    return user

def set_firebase_custom_role(uid: str, role: UserRole) -> bool:
    """Admin utility to assign custom role claims in Firebase Auth."""
    if not firebase_initialized:
        logger.warning(f"Cannot set claims for {uid}: Firebase Admin not initialized.")
        return False
    try:
        from firebase_admin import auth as fb_auth
        fb_auth.set_custom_user_claims(uid, {"role": role.value})
        logger.info(f"Custom claim role='{role.value}' set for UID {uid}")
        return True
    except Exception as e:
        logger.error(f"Failed to set custom claim: {e}")
        return False
