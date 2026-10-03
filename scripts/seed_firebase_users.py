#!/usr/bin/env python3
"""
Seed Firebase Users & Custom Claims
FinFlow AI — Hackathon & Enterprise Provisioning Script

Creates demo accounts for the 4 core personas and stamps their custom claims:
- Priya Sharma (CUSTOMER)
- Rohan Mehta (RM)
- Ananya Iyer (RISK_OFFICER)
- System Admin (ADMIN)

Usage:
  python scripts/seed_firebase_users.py
"""

import sys
import os
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.config import settings

DEMO_USERS = [
    {
        "email": "priya.sharma@sharmatextiles.in",
        "password": "Password123!",
        "display_name": "Priya Sharma",
        "role": "CUSTOMER",
        "business_id": "biz_sharma_textiles"
    },
    {
        "email": "rohan.mehta@finbridge.bank",
        "password": "Password123!",
        "display_name": "Rohan Mehta",
        "role": "RM",
        "business_id": None
    },
    {
        "email": "ananya.iyer@finbridge.bank",
        "password": "Password123!",
        "display_name": "Ananya Iyer",
        "role": "RISK_OFFICER",
        "business_id": None
    },
    {
        "email": "admin@finflow.ai",
        "password": "Password123!",
        "display_name": "System Administrator",
        "role": "ADMIN",
        "business_id": None
    }
]

def main():
    print("==================================================")
    print(" FinFlow AI — Firebase Demo User Provisioning")
    print("==================================================")

    try:
        import firebase_admin
        from firebase_admin import auth, credentials
    except ImportError:
        print("[ERROR] firebase-admin is not installed. Run: pip install firebase-admin")
        return

    # Check credentials
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
            firebase_admin.initialize_app(cred)
        print(f"[OK] Initialized Firebase Admin using service account for: {settings.FIREBASE_PROJECT_ID}")
    elif settings.FIREBASE_CREDENTIALS_PATH and os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        print(f"[OK] Initialized Firebase Admin from file: {settings.FIREBASE_CREDENTIALS_PATH}")
    else:
        print("[INFO] No production Firebase credentials configured in environment.")
        print("[INFO] Running in mock/dry-run mode for local development verification:")
        for u in DEMO_USERS:
            print(f"  -> Mock Persona: {u['display_name']} <{u['email']}> | Role: {u['role']}")
        print("\n[OK] Local demo tokens already configured in backend/auth/firebase_auth.py:DEMO_USERS.")
        return

    for u in DEMO_USERS:
        email = u["email"]
        role = u["role"]
        display_name = u["display_name"]
        password = u["password"]
        claims = {"role": role}
        if u["business_id"]:
            claims["business_id"] = u["business_id"]

        try:
            # Check if user already exists
            user_record = auth.get_user_by_email(email)
            print(f"[*] User {email} already exists (UID: {user_record.uid}). Updating claims...")
        except auth.UserNotFoundError:
            # Create user
            user_record = auth.create_user(
                email=email,
                password=password,
                display_name=display_name,
                email_verified=True
            )
            print(f"[+] Created user {email} (UID: {user_record.uid})")

        # Set custom claims
        auth.set_custom_user_claims(user_record.uid, claims)
        print(f"    Set custom claims for {email}: {claims}")

    print("\n==================================================")
    print(" Successfully provisioned all FinFlow demo personas!")
    print("==================================================")

if __name__ == "__main__":
    main()
