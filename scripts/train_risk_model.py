"""
train_risk_model.py — FinFlow ML Risk Model Training Script
============================================================
Standalone script to train, evaluate, and inspect the GBM risk model
on the synthetic SME dataset.

Usage:
    python -m scripts.train_risk_model [--samples N] [--evaluate] [--feature-importance]

Output:
    - Training summary (accuracy, AUC, default rate)
    - Cross-validation scores
    - Feature importance rankings
    - Model configuration summary for audit
"""

import sys
import os
import argparse
import json
import hashlib
from datetime import datetime, timezone

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np

try:
    from sklearn.model_selection import cross_val_score, StratifiedKFold
    from sklearn.metrics import (
        classification_report, roc_auc_score, average_precision_score,
        confusion_matrix,
    )
except ImportError:
    print("ERROR: scikit-learn not installed. Run: pip install scikit-learn")
    sys.exit(1)


def train_and_evaluate(n_samples: int = 800, verbose: bool = True):
    """
    Trains the FinFlow GBM risk model and prints evaluation metrics.
    Uses the same training logic as MLRiskModel._generate_synthetic_training_data().
    """
    print("=" * 60)
    print("  FinFlow ML Risk Model -- Training Script")
    print(f"  Model Version: scikit-learn-gbm-sme-v3.0")
    print(f"  Training Samples: {n_samples}")
    print(f"  Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)

    # ── Import after ensuring backend is in path ──────────────────────────────
    try:
        from backend.modules.module4_decision.ml_risk_model import MLRiskModel, MODEL_VERSION
        from backend.modules.module4_decision.risk_feature_engineer import (
            FEATURE_NAMES, FEATURE_DISPLAY,
        )
    except ImportError as e:
        print(f"\nERROR: Could not import FinFlow modules: {e}")
        print("Run this script from the project root directory.")
        sys.exit(1)

    # Reset singleton to force fresh training
    MLRiskModel.reset_instance()
    model = MLRiskModel.get_instance()

    print(f"\n[OK] Model trained: {MODEL_VERSION}")
    print(f"[OK] Model signature: {model.model_signature()}")
    print(f"[OK] Features: {len(FEATURE_NAMES)}")

    # ── Generate evaluation dataset ───────────────────────────────────────────
    print("\n--- Generating evaluation dataset ---")
    X_eval, y_eval = model._generate_synthetic_training_data()
    print(f"  Samples: {len(X_eval)}")
    print(f"  Default rate: {y_eval.mean()*100:.1f}%")

    # ── Predictions on training set (in-sample for development check) ─────────
    X_eval_arr = np.array(X_eval)
    proba = model._pipeline.predict_proba(X_eval_arr)[:, 1]
    y_pred = (proba > 0.5).astype(int)

    print("\n--- Classification Report ---")
    print(classification_report(y_eval, y_pred, target_names=["Performing", "Default"]))

    roc  = roc_auc_score(y_eval, proba)
    ap   = average_precision_score(y_eval, proba)
    cm   = confusion_matrix(y_eval, y_pred)
    tn, fp, fn, tp = cm.ravel()

    print(f"  ROC-AUC:           {roc:.4f}")
    print(f"  Average Precision: {ap:.4f}")
    print(f"  True Negatives:    {tn}  (correctly identified Performing)")
    print(f"  False Positives:   {fp}  (falsely flagged as Default)")
    print(f"  False Negatives:   {fn}  (missed Defaults -- riskier error)")
    print(f"  True Positives:    {tp}  (correctly identified Default)")

    # ── Cross-validation ──────────────────────────────────────────────────────
    print("\n--- 5-Fold Stratified Cross-Validation ---")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_auc = cross_val_score(model._pipeline, X_eval_arr, y_eval, cv=cv, scoring="roc_auc")
    cv_ap  = cross_val_score(model._pipeline, X_eval_arr, y_eval, cv=cv, scoring="average_precision")
    print(f"  ROC-AUC:  {cv_auc.mean():.4f} +/- {cv_auc.std():.4f}")
    print(f"  Avg Prec: {cv_ap.mean():.4f} +/- {cv_ap.std():.4f}")

    # ── Feature importance ────────────────────────────────────────────────────
    print("\n--- Feature Importances (GBM) ---")
    clf = model._pipeline.named_steps["clf"]
    importances = clf.feature_importances_
    ranked = sorted(zip(FEATURE_NAMES, importances), key=lambda x: x[1], reverse=True)
    for rank, (fname, imp) in enumerate(ranked, 1):
        bar = "#" * int(imp * 50)
        display = FEATURE_DISPLAY.get(fname, fname)
        print(f"  {rank:2d}. {display[:40]:<40} {imp:.4f} {bar}")

    # ── Sample predictions ────────────────────────────────────────────────────
    print("\n--- Sample Risk Assessments ---")
    test_cases = [
        {
            "label": "Strong MSME (should be LOW_RISK)",
            "annual_turnover": 12_000_000.0,
            "monthly_inflow": 1_000_000.0,
            "revenue_consistency": 0.90,
            "dscr": 2.1,
            "net_monthly_surplus": 150_000.0,
            "operating_margin_proxy": 0.15,
            "surplus_after_obligations": 100_000.0,
            "debt_service_burden_pct": 18.0,
            "existing_emi_monthly": 25_000.0,
            "exposure_ratio": 0.25,
            "buffer_days": 45.0,
            "volatility_index": 0.08,
            "cheque_bounces_6m": 0.0,
            "vintage_months": 72.0,
            "avg_doc_confidence": 0.92,
        },
        {
            "label": "Borderline MSME (should be MEDIUM_RISK)",
            "annual_turnover": 4_200_000.0,
            "monthly_inflow": 350_000.0,
            "revenue_consistency": 0.65,
            "dscr": 1.35,
            "net_monthly_surplus": 42_000.0,
            "operating_margin_proxy": 0.12,
            "surplus_after_obligations": 15_000.0,
            "debt_service_burden_pct": 32.0,
            "existing_emi_monthly": 45_000.0,
            "exposure_ratio": 0.42,
            "buffer_days": 22.0,
            "volatility_index": 0.18,
            "cheque_bounces_6m": 1.0,
            "vintage_months": 30.0,
            "avg_doc_confidence": 0.78,
        },
        {
            "label": "Distressed MSME (should be HIGH_RISK)",
            "annual_turnover": 2_800_000.0,
            "monthly_inflow": 220_000.0,
            "revenue_consistency": 0.38,
            "dscr": 0.85,
            "net_monthly_surplus": -15_000.0,
            "operating_margin_proxy": -0.07,
            "surplus_after_obligations": -45_000.0,
            "debt_service_burden_pct": 62.0,
            "existing_emi_monthly": 80_000.0,
            "exposure_ratio": 0.72,
            "buffer_days": 8.0,
            "volatility_index": 0.42,
            "cheque_bounces_6m": 3.0,
            "vintage_months": 18.0,
            "avg_doc_confidence": 0.58,
        },
    ]

    for case in test_cases:
        label = case.pop("label")
        pd_val, trust, band, _ = model.predict_risk(case)
        print(f"\n  [{label}]")
        print(f"    PD: {pd_val:.4f}  |  Trust Score: {trust}/1000  |  Band: {band.value}")
        case["label"] = label  # restore

    print("\n" + "=" * 60)
    print("  Training complete.")
    print("=" * 60)

    return {
        "model_version": MODEL_VERSION,
        "roc_auc": round(roc, 4),
        "average_precision": round(ap, 4),
        "cv_auc_mean": round(cv_auc.mean(), 4),
        "feature_count": len(FEATURE_NAMES),
        "training_samples": len(X_eval),
        "default_rate_pct": round(y_eval.mean() * 100, 1),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FinFlow ML Risk Model Training Script")
    parser.add_argument("--samples", type=int, default=800, help="Number of synthetic training samples")
    args = parser.parse_args()

    result = train_and_evaluate(n_samples=args.samples, verbose=True)
    print("\nSummary JSON:")
    print(json.dumps(result, indent=2))
