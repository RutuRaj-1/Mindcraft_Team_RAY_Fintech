"""
Unit and Integration Tests for FinFlow AI Financial Trust Score Engine
(Adapted from Hack2Ignite FT-03)
"""

from datetime import date
from decimal import Decimal
from types import SimpleNamespace
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.routers.demo_router import seed_demo_data
from backend.modules.module3_risk.financial_trust_score import (
    SCORE_WEIGHTS,
    BusinessCreditFeatures,
    FinancialTrustScoreEngine,
    extract_credit_features,
)

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_seed():
    seed_demo_data()


def make_tx(txn_date: str, amount: float, txn_type: str) -> dict:
    return {
        "amount": amount,
        "transaction_type": txn_type,
        "date": txn_date,
    }


def make_alert(risk_level: str = "LOW", risk_score: int = 10) -> dict:
    return {
        "risk_level": risk_level,
        "risk_score": risk_score,
    }


def make_biz(age_years: float = 3.5, turnover: float = 1_500_000.0) -> dict:
    return {
        "business_age_years": age_years,
        "annual_turnover": turnover,
    }


# ── 1. Weights & Integrity Tests ─────────────────────────────────────────────

def test_weights_sum_to_one():
    """All 7 scoring weights must sum to exactly 1.0 (100%)."""
    total = sum(SCORE_WEIGHTS.values())
    assert abs(total - 1.0) < 1e-6


def test_seven_components_present():
    """All 7 mandatory sub-score dimensions must be configured."""
    expected = {
        "financial_stability": 0.25,
        "cash_flow_health": 0.20,
        "revenue_consistency": 0.15,
        "repayment_capacity": 0.15,
        "expense_discipline": 0.10,
        "transaction_behavior": 0.10,
        "fraud_risk": 0.05,
    }
    assert SCORE_WEIGHTS == expected


# ── 2. Feature Extraction Tests ──────────────────────────────────────────────

def test_empty_transactions():
    """Extracting features from an empty transaction list returns neutral zeroes."""
    features = extract_credit_features([])
    assert features.total_transactions == 0
    assert features.avg_monthly_revenue == 0.0
    assert features.avg_monthly_expense == 0.0
    assert features.net_cash_flow == 0.0
    assert features.fraud_alert_rate == 0.0


def test_multi_month_cashflow_features():
    """Verifies monthly aggregation, credits vs debits, and margin ratios."""
    txns = [
        make_tx("2026-01-10", 100_000, "credit"),
        make_tx("2026-01-15", 60_000, "debit"),
        make_tx("2026-02-10", 120_000, "credit"),
        make_tx("2026-02-15", 70_000, "debit"),
    ]
    biz = make_biz(age_years=4.0, turnover=1_500_000)
    alerts = [make_alert("LOW", 10), make_alert("LOW", 15)]

    features = extract_credit_features(txns, alerts, biz)
    assert features.active_months == 2
    assert features.total_transactions == 4
    assert features.total_credits == 2
    assert features.total_debits == 2
    assert features.avg_monthly_revenue == 110_000.0  # (100k + 120k) / 2
    assert features.avg_monthly_expense == 65_000.0   # (60k + 70k) / 2
    assert features.net_cash_flow == 45_000.0
    assert features.business_age_years == 4.0
    assert features.fraud_alert_rate == 0.0
    assert features.repayment_capacity > 0.30


# ── 3. Sub-Score Calculation & Scoring Tests ─────────────────────────────────

def test_sub_scores_and_weighted_composite():
    """Evaluates healthy enterprise yielding low risk and high trust score."""
    engine = FinancialTrustScoreEngine()
    features = BusinessCreditFeatures(
        avg_monthly_revenue=120_000.0,
        revenue_std=5_000.0,
        avg_monthly_expense=75_000.0,
        expense_ratio=0.625,
        net_cash_flow=45_000.0,
        cash_flow_volatility=4_000.0,
        transaction_frequency=15.0,
        avg_transaction_value=8_000.0,
        revenue_consistency=0.958,
        fraud_alert_rate=0.0,
        repayment_capacity=0.375,
        positive_cash_flow_months_ratio=1.0,
        active_months=6,
        total_transactions=90,
        total_credits=50,
        total_debits=40,
        business_age_years=4.0,
        annual_turnover=1_440_000.0,
    )

    result = engine.score(features)
    assert 80 <= result.trust_score <= 100
    assert 740 <= result.cibil_scaled_score <= 850
    assert 800 <= result.finflow_score <= 1000
    assert result.risk_band == "LOW_RISK"
    assert len(result.positive_factors) > 0
    assert any("Positive Net Cash Flow" in p for p in result.positive_factors)


def test_edge_case_deficit_business():
    """Enterprise running a heavy deficit gets lower cash-flow score and medium/high risk."""
    engine = FinancialTrustScoreEngine()
    features = BusinessCreditFeatures(
        avg_monthly_revenue=50_000.0,
        revenue_std=15_000.0,
        avg_monthly_expense=90_000.0,
        expense_ratio=1.8,
        net_cash_flow=-40_000.0,
        cash_flow_volatility=12_000.0,
        transaction_frequency=4.0,
        avg_transaction_value=4_000.0,
        revenue_consistency=0.40,
        fraud_alert_rate=0.25,
        repayment_capacity=-0.80,
        positive_cash_flow_months_ratio=0.0,
        active_months=3,
        total_transactions=12,
        total_credits=4,
        total_debits=8,
        business_age_years=0.5,
        annual_turnover=600_000.0,
    )

    result = engine.score(features)
    assert result.trust_score < 50
    assert result.cibil_scaled_score < 600
    assert result.risk_band == "HIGH_RISK"
    assert len(result.negative_factors) > 0
    assert any("Operating Cash Flow Deficit" in n for n in result.negative_factors)


def test_cibil_and_finflow_scaling_bounds():
    """Scale transforms must stay clamped strictly within target ranges."""
    engine = FinancialTrustScoreEngine()
    assert engine.to_cibil_scale(0) == 300
    assert engine.to_cibil_scale(100) == 850
    assert engine.to_cibil_scale(50) == 575

    assert engine.to_finflow_scale(0) == 0
    assert engine.to_finflow_scale(100) == 1000
    assert engine.to_finflow_scale(75) == 750


# ── 4. FastAPI Endpoint Integration Tests ────────────────────────────────────

def test_api_financial_trust_score_endpoint():
    """Tests GET /api/v1/journeys/{journey_id}/financial-trust-score."""
    res = client.get(
        "/api/v1/journeys/jrn_priya_001/financial-trust-score",
        headers={"Authorization": "Bearer demo-admin"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "trustScore" in data
    assert "cibilScore" in data
    assert "finflowScore" in data
    assert "riskBand" in data
    assert "components" in data
    assert "positiveFactors" in data
    assert "detailedFactors" in data
    assert "formulaSummary" in data
    assert 300 <= data["cibilScore"] <= 850
    assert 0 <= data["finflowScore"] <= 1000
