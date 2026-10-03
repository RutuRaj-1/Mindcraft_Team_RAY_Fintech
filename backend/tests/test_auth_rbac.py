import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.routers.demo_router import seed_demo_data

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_seed():
    seed_demo_data()

def test_auth_session_demo_modes():
    # Customer session
    res = client.post("/api/v1/auth/session", json={"role": "CUSTOMER"})
    assert res.status_code == 200
    data = res.json()
    assert data["token"] == "demo-customer"
    assert data["user"]["role"] == "CUSTOMER"
    assert data["user"]["email"] == "priya.sharma@sharmatextiles.in"

    # RM session
    res = client.post("/api/v1/auth/session", json={"role": "RM"})
    assert res.status_code == 200
    assert res.json()["token"] == "demo-rm"
    assert res.json()["user"]["role"] == "RM"

    # Risk Officer session
    res = client.post("/api/v1/auth/session", json={"role": "RISK_OFFICER"})
    assert res.status_code == 200
    assert res.json()["token"] == "demo-risk-officer"
    assert res.json()["user"]["role"] == "RISK_OFFICER"

def test_auth_me_endpoint():
    # With valid Bearer token
    res = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer demo-rm"})
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Rohan Mehta"
    assert data["role"] == "RM"

def test_admin_claims_endpoint_rbac():
    # Non-admin user (customer) attempting to assign claims -> 403 Forbidden
    res = client.post(
        "/api/v1/auth/claims",
        json={"uid": "usr_test_123", "role": "RM"},
        headers={"Authorization": "Bearer demo-customer"}
    )
    assert res.status_code == 403

    # Admin user assigning claims -> 200 OK
    res_admin = client.post(
        "/api/v1/auth/claims",
        json={"uid": "usr_test_123", "role": "RM"},
        headers={"Authorization": "Bearer demo-admin"}
    )
    assert res_admin.status_code == 200
    assert "status" in res_admin.json()
