from enum import Enum

class UserRole(str, Enum):
    """Canonical 7 Business Roles + 1 Technical Custodian for FinFlow AI."""
    # 1. MSME Customer (Priya Sharma)
    CUSTOMER = "CUSTOMER"

    # 2. Relationship Manager (Rohan Mehta) - First-Line Operations
    RM = "RM"

    # 3. RM Supervisor / Credit Ops Manager (Vikram Malhotra) - First-Line Supervision
    RM_SUPERVISOR = "RM_SUPERVISOR"

    # 4. Risk & Compliance Officer (Ananya Iyer) - Second-Line Independent Risk
    RISK_OFFICER = "RISK_OFFICER"

    # 5. Risk Manager / Senior Credit Risk (Meera Krishnan) - Second-Line Supervisory Risk
    RISK_MANAGER = "RISK_MANAGER"

    # 6. Credit Approver / Committee (Rajesh Singhania) - Governed Sanction Authority
    CREDIT_APPROVER = "CREDIT_APPROVER"

    # 7. Independent Audit & Governance (Sunita Rao) - Third-Line Assurance (Read-Heavy)
    AUDIT_OFFICER = "AUDIT_OFFICER"

    # 8. System Administrator (Amit Verma) - Technical Custodian (Zero Financial Authority)
    SYS_ADMIN = "SYS_ADMIN"
    ADMIN = "SYS_ADMIN"  # Backward-compatible alias for existing tokens/tests
