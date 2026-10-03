from enum import Enum

class UserRole(str, Enum):
    CUSTOMER = "CUSTOMER"
    RM = "RM"
    RISK_OFFICER = "RISK_OFFICER"
    ADMIN = "ADMIN"
