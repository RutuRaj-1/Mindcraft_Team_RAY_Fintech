import os
import logging
from typing import Optional, List, Callable
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
    team_id: Optional[str] = None
    supervisor_id: Optional[str] = None
    delegated_limit_inr: float = 0.0
    claims: dict = {}

# Demo user profiles for instantaneous hackathon switching across all 7 business roles + 1 SysAdmin
DEMO_USERS: dict[str, AuthenticatedUser] = {
    # 1. MSME Customer
    "demo-customer": AuthenticatedUser(
        uid="usr_priya_001",
        email="priya.sharma@sharmatextiles.in",
        name="Priya Sharma",
        role=UserRole.CUSTOMER,
        business_id="biz_sharma_textiles",
        delegated_limit_inr=0.0,
        claims={"role": "CUSTOMER"}
    ),
    # 2. Relationship Manager (First-Line Operations)
    "demo-rm": AuthenticatedUser(
        uid="usr_rohan_002",
        email="rohan.mehta@finflowbank.com",
        name="Rohan Mehta",
        role=UserRole.RM,
        team_id="team_west_sme",
        delegated_limit_inr=0.0,
        claims={"role": "RM", "team_id": "team_west_sme"}
    ),
    # 3. RM Supervisor (First-Line Operations Oversight)
    "demo-rm-supervisor": AuthenticatedUser(
        uid="usr_vikram_004",
        email="vikram.malhotra@finflowbank.com",
        name="Vikram Malhotra",
        role=UserRole.RM_SUPERVISOR,
        team_id="team_west_sme",
        delegated_limit_inr=0.0,
        claims={"role": "RM_SUPERVISOR", "team_id": "team_west_sme"}
    ),
    # 4. Risk & Compliance Officer (Second-Line Independent Risk)
    "demo-risk-officer": AuthenticatedUser(
        uid="usr_ananya_003",
        email="ananya.iyer@finflowbank.com",
        name="Ananya Iyer",
        role=UserRole.RISK_OFFICER,
        delegated_limit_inr=2500000.0,  # ₹25 Lakhs fast-track limit
        claims={"role": "RISK_OFFICER", "delegated_limit_inr": 2500000.0}
    ),
    # 5. Risk Manager (Second-Line Supervisory Risk Oversight)
    "demo-risk-manager": AuthenticatedUser(
        uid="usr_meera_005",
        email="meera.krishnan@finflowbank.com",
        name="Meera Krishnan",
        role=UserRole.RISK_MANAGER,
        delegated_limit_inr=10000000.0,  # ₹1 Crore limit
        claims={"role": "RISK_MANAGER", "delegated_limit_inr": 10000000.0}
    ),
    # 6. Credit Approver / Committee (Governed Sanction Authority)
    "demo-credit-approver": AuthenticatedUser(
        uid="usr_rajesh_006",
        email="rajesh.singhania@finflowbank.com",
        name="Rajesh Singhania",
        role=UserRole.CREDIT_APPROVER,
        delegated_limit_inr=50000000.0,  # ₹5 Crore limit
        claims={"role": "CREDIT_APPROVER", "delegated_limit_inr": 50000000.0}
    ),
    # 7. Independent Audit & Governance Officer (Third-Line Read-Heavy Assurance)
    "demo-audit-officer": AuthenticatedUser(
        uid="usr_sunita_007",
        email="sunita.rao@finflowbank.com",
        name="Sunita Rao",
        role=UserRole.AUDIT_OFFICER,
        delegated_limit_inr=0.0,
        claims={"role": "AUDIT_OFFICER"}
    ),
    # 8. System Administrator (Master Infrastructure & Demonstration Controller)
    "demo-admin": AuthenticatedUser(
        uid="usr_admin_master",
        email="bhomeruturaj@gmail.com",
        name="Ruturaj Bhome",
        role=UserRole.SYS_ADMIN,
        delegated_limit_inr=0.0,
        claims={"role": "SYS_ADMIN"}
    ),
    "demo-sys-admin": AuthenticatedUser(
        uid="usr_admin_master",
        email="bhomeruturaj@gmail.com",
        name="Ruturaj Bhome",
        role=UserRole.SYS_ADMIN,
        delegated_limit_inr=0.0,
        claims={"role": "SYS_ADMIN"}
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
            email = decoded.get("email", "").lower()
            role_claim = decoded.get("role", "").upper()

            # Master Administrator Grant: bhomeruturaj@gmail.com has end-to-end control
            if email == "bhomeruturaj@gmail.com":
                user_role = UserRole.SYS_ADMIN
                decoded["role"] = "SYS_ADMIN"
            elif role_claim in ("ADMIN", "SYS_ADMIN"):
                user_role = UserRole.SYS_ADMIN
            else:
                try:
                    user_role = UserRole(role_claim) if role_claim else UserRole.CUSTOMER
                except ValueError:
                    user_role = UserRole.CUSTOMER

            return AuthenticatedUser(
                uid=decoded.get("uid"),
                email=decoded.get("email", ""),
                name=decoded.get("name", "Ruturaj Bhome" if email == "bhomeruturaj@gmail.com" else decoded.get("email", "User")),
                role=user_role,
                business_id=decoded.get("business_id"),
                team_id=decoded.get("team_id"),
                supervisor_id=decoded.get("supervisor_id"),
                delegated_limit_inr=float(decoded.get("delegated_limit_inr", 0.0)),
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
        lower_token = clean_token.lower()
        if "customer" in lower_token:
            return DEMO_USERS["demo-customer"]
        if "rm-supervisor" in lower_token or "supervisor" in lower_token:
            return DEMO_USERS["demo-rm-supervisor"]
        if "rm" in lower_token:
            return DEMO_USERS["demo-rm"]
        if "risk-manager" in lower_token:
            return DEMO_USERS["demo-risk-manager"]
        if "risk-officer" in lower_token or "risk" in lower_token:
            return DEMO_USERS["demo-risk-officer"]
        if "credit-approver" in lower_token or "approver" in lower_token:
            return DEMO_USERS["demo-credit-approver"]
        if "audit" in lower_token:
            return DEMO_USERS["demo-audit-officer"]
        if "admin" in lower_token:
            return DEMO_USERS["demo-admin"]
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

def require_role(allowed_roles: List[UserRole]) -> Callable:
    """Generic role-checking dependency."""
    def role_checker(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role in {[r.value for r in allowed_roles]}, but user has role {user.role.value}"
            )
        return user
    return role_checker

# Explicit role dependencies enforcing strict Separation of Duties
def require_customer(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    """Enforces CUSTOMER role access (Audit Officer can view in read-only mode)."""
    if user.role not in [UserRole.CUSTOMER, UserRole.AUDIT_OFFICER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Customer privileges required, but current role is {user.role.value}"
        )
    return user

def require_rm(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    """Enforces Relationship Manager (RM) or RM Supervisor access."""
    if user.role not in [UserRole.RM, UserRole.RM_SUPERVISOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Relationship Manager privileges required, but current role is {user.role.value}"
        )
    return user

def require_rm_supervisor(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    """Enforces RM Supervisor privileges for team reassignments and ops exceptions."""
    if user.role != UserRole.RM_SUPERVISOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. RM Supervisor privileges required, but current role is {user.role.value}"
        )
    return user

def require_risk_officer(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    """Enforces Risk & Compliance Officer or Senior Risk Manager access."""
    if user.role not in [UserRole.RISK_OFFICER, UserRole.RISK_MANAGER, UserRole.AUDIT_OFFICER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Risk Officer privileges required, but current role is {user.role.value}"
        )
    return user

def require_risk_manager(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    """Enforces Senior Risk Manager or Credit Approver access."""
    if user.role not in [UserRole.RISK_MANAGER, UserRole.CREDIT_APPROVER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Risk Manager privileges required, but current role is {user.role.value}"
        )
    return user

def require_credit_approver(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    """Enforces final Credit Approver / Committee authority."""
    if user.role != UserRole.CREDIT_APPROVER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Credit Approver privileges required, but current role is {user.role.value}"
        )
    return user

def require_audit_officer(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    """Enforces Independent Audit & Governance Officer access."""
    if user.role != UserRole.AUDIT_OFFICER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Independent Audit privileges required, but current role is {user.role.value}"
        )
    return user

def require_admin(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    """Enforces System Administrator role access.
    IMPORTANT: SysAdmin has NO authority to approve loans or alter credit risk decisions!
    """
    if user.role != UserRole.SYS_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. System Administrator privileges required, but current role is {user.role.value}"
        )
    return user

def require_sanction_authority(requested_amount_inr: float = 0.0, risk_band: str = "LOW_RISK") -> Callable:
    """Dependency checking that the caller has adequate delegated authority to sanction."""
    def checker(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
        # 1. Must be in the authorized sanction hierarchy
        if user.role not in [UserRole.RISK_OFFICER, UserRole.RISK_MANAGER, UserRole.CREDIT_APPROVER]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role.value}' does not possess loan sanction authority."
            )

        # 2. High-Risk cases strictly require Credit Approver / Committee
        if risk_band == "HIGH_RISK" and user.role != UserRole.CREDIT_APPROVER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="High-Risk loans require final approval from a Credit Approver or Credit Committee."
            )

        # 3. Check monetary limits
        if requested_amount_inr > user.delegated_limit_inr:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Requested amount ₹{requested_amount_inr:,.2f} exceeds "
                    f"officer's delegated limit of ₹{user.delegated_limit_inr:,.2f}."
                )
            )
        return user
    return checker

def set_firebase_custom_role(uid: str, role: UserRole, delegated_limit_inr: float = 0.0) -> bool:
    """Admin utility to assign custom role claims in Firebase Auth."""
    if not firebase_initialized:
        logger.warning(f"Cannot set claims for {uid}: Firebase Admin not initialized.")
        return False
    try:
        from firebase_admin import auth as fb_auth
        claims = {"role": role.value, "delegated_limit_inr": delegated_limit_inr}
        fb_auth.set_custom_user_claims(uid, claims)
        logger.info(f"Custom claims {claims} set for UID {uid}")
        return True
    except Exception as e:
        logger.error(f"Failed to set custom claim: {e}")
        return False
