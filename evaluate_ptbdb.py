"""
evaluate_ptbdb.py
──────────────────
Evaluate the existing MIT-BIH trained model on the PTB Diagnostic ECG Database,
AND train a dedicated binary classifier (Normal vs. Abnormal) optimized for PTBDB.

PTBDB Format:
  - 187 pre-segmented, zero-padded, amplitude-normalized beat samples per row
  - Labels: 0 = Normal, 1 = Abnormal (MI and other cardiac diseases)
  - Source: ptbdb_normal.csv.zip (4046 beats) + ptbdb_abnormal.csv.zip (10506 beats)

Since PTBDB is binary (Normal vs. Abnormal) and MIT-BIH is 5-class (N/S/V/F/Q),
we do two things:
  1. Evaluate our MIT-BIH RF model on PTBDB — treating any non-N prediction as "Abnormal"
  2. Train a dedicated PTBDB binary classifier and save as model/model_ptbdb.pkl
  3. Train a combined model across both datasets (unified feature space)

Usage:
    python evaluate_ptbdb.py                   # all three evaluations
    python evaluate_ptbdb.py --only-eval       # only step 1 (no new training)
    python evaluate_ptbdb.py --model gb        # use GradientBoosting for dedicated model
"""
from __future__ import annotations

import argparse
import os
import sys
import zipfile

import numpy as np

sys.path.insert(0, "D:\\Lib\\site-packages")

from collections import Counter
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
import joblib

import warnings
warnings.filterwarnings("ignore")


# ─────────────────────────────────────────────────────────────────────────────
# Data loading
# ─────────────────────────────────────────────────────────────────────────────

def load_ptbdb() -> tuple[np.ndarray, np.ndarray]:
    """Load and merge PTBDB normal + abnormal CSVs. Returns (X, y)."""
    import pandas as pd

    dfs = []
    for zname, label in [("ptbdb_normal.csv.zip", 0), ("ptbdb_abnormal.csv.zip", 1)]:
        if not os.path.exists(zname):
            raise FileNotFoundError(
                f"Missing: {zname}\nPlace the PTBDB zip files in the ps03-ecg-backend/ directory."
            )
        with zipfile.ZipFile(zname) as zf:
            with zf.open(zf.namelist()[0]) as f:
                df = pd.read_csv(f, header=None)
        # Drop last column (label already known from filename)
        dfs.append(df.iloc[:, :-1].values.astype(np.float64))

    X_normal   = dfs[0]   # (4046, 187)
    X_abnormal = dfs[1]   # (10506, 187)

    X = np.vstack([X_normal, X_abnormal])
    y = np.concatenate([
        np.zeros(len(X_normal),   dtype=np.int32),
        np.ones( len(X_abnormal), dtype=np.int32),
    ])

    print(f"PTBDB loaded: {X.shape}  |  Normal: {len(X_normal)}  Abnormal: {len(X_abnormal)}")
    print(f"Signal length: {X.shape[1]} samples (pre-segmented, normalized 0-1)")
    return X, y


def load_mitbih() -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Load the MIT-BIH .npy arrays (may include RR features if rebuilt)."""
    X_train = np.load("X_train_balanced.npy")
    y_train = np.load("y_train_balanced.npy", allow_pickle=True)
    X_test  = np.load("X_test.npy")
    y_test  = np.load("y_test.npy", allow_pickle=True)
    print(f"MIT-BIH: train {X_train.shape}, test {X_test.shape}")
    print(f"  MIT-BIH feature dim: {X_train.shape[1]}  |  PTBDB feature dim: 187")
    return X_train, y_train, X_test, y_test


# ─────────────────────────────────────────────────────────────────────────────
# Step 1: Evaluate MIT-BIH model on PTBDB (cross-dataset transfer)
# ─────────────────────────────────────────────────────────────────────────────

def evaluate_mitbih_on_ptbdb(X_ptbdb: np.ndarray, y_ptbdb: np.ndarray):
    """
    Apply the MIT-BIH RF model to PTBDB data.

    Challenge: MIT-BIH features are 216 or 221 dims; PTBDB features are 187 dims.
    Strategy: pad/trim PTBDB features to MIT-BIH input dim, then map
    multi-class predictions to binary (N → Normal, S/V/F/Q → Abnormal).
    """
    print("\n" + "="*60)
    print("STEP 1: MIT-BIH model evaluated on PTBDB (transfer learning)")
    print("="*60)

    model_path = "model/model.pkl"
    if not os.path.exists(model_path):
        print(f"  model.pkl not found at {model_path} — skipping.")
        return

    model = joblib.load(model_path)
    mit_dim = model.named_steps["clf"].n_features_in_  # actual input dim
    ptbdb_dim = X_ptbdb.shape[1]
    print(f"  MIT-BIH model expects {mit_dim} features, PTBDB provides {ptbdb_dim}")

    # Align feature dimensions by zero-padding or truncating
    if ptbdb_dim < mit_dim:
        pad = np.zeros((len(X_ptbdb), mit_dim - ptbdb_dim))
        X_aligned = np.hstack([X_ptbdb, pad])
        print(f"  Zero-padded PTBDB features to {mit_dim} dims")
    else:
        X_aligned = X_ptbdb[:, :mit_dim]
        print(f"  Truncated PTBDB features to {mit_dim} dims")

    # Predict (multi-class) and map to binary
    y_pred_multi = model.predict(X_aligned)
    y_pred_binary = (y_pred_multi != "N").astype(np.int32)

    print("\n  Binary mapping: N → Normal(0), S/V/F/Q → Abnormal(1)")
    print(f"  Predicted distribution: {dict(Counter(y_pred_multi.tolist()))}")
    print(f"\n  Classification Report (Normal vs Abnormal):")
    print(classification_report(y_ptbdb, y_pred_binary,
                                target_names=["Normal", "Abnormal"], zero_division=0))
    try:
        y_proba = model.predict_proba(X_aligned)
        # Probability of "not Normal" = sum of S+V+F+Q probabilities
        classes = list(model.classes_)
        n_idx   = classes.index("N") if "N" in classes else 0
        abnormal_proba = 1.0 - y_proba[:, n_idx]
        auc = roc_auc_score(y_ptbdb, abnormal_proba)
        print(f"  ROC-AUC (transfer): {auc:.4f}")
    except Exception:
        pass


# ─────────────────────────────────────────────────────────────────────────────
# Step 2: Dedicated PTBDB binary classifier
# ─────────────────────────────────────────────────────────────────────────────

def train_ptbdb_classifier(
    X: np.ndarray,
    y: np.ndarray,
    model_type: str = "rf",
) -> Pipeline:
    """
    Train a dedicated Normal vs. Abnormal classifier on PTBDB.
    Uses stratified 80/20 split.
    """
    print("\n" + "="*60)
    print(f"STEP 2: Dedicated PTBDB Binary Classifier  (model={model_type.upper()})")
    print("="*60)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"  Train: {X_train.shape}  Test: {X_test.shape}")
    print(f"  Train dist: Normal={sum(y_train==0)}  Abnormal={sum(y_train==1)}")

    if model_type == "rf":
        clf = RandomForestClassifier(
            n_estimators=200,
            max_depth=None,
            min_samples_leaf=1,
            class_weight="balanced",
            n_jobs=-1,
            random_state=42,
        )
    else:
        clf = GradientBoostingClassifier(
            n_estimators=200,
            max_depth=5,
            learning_rate=0.1,
            subsample=0.8,
            random_state=42,
        )

    pipeline = Pipeline([("scaler", StandardScaler()), ("clf", clf)])
    print(f"  Training {model_type.upper()}...")
    pipeline.fit(X_train, y_train)

    y_pred  = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)[:, 1]
    auc     = roc_auc_score(y_test, y_proba)

    print(f"\n  Test Classification Report:")
    print(classification_report(y_test, y_pred,
                                target_names=["Normal", "Abnormal"], zero_division=0))
    print(f"  ROC-AUC: {auc:.4f}")
    print(f"  Confusion Matrix:\n{confusion_matrix(y_test, y_pred)}")

    # 5-fold cross-validation for robust estimate
    print(f"\n  5-Fold Cross-Validation AUC...")
    cv_scores = cross_val_score(pipeline, X, y, cv=5, scoring="roc_auc", n_jobs=-1)
    print(f"  CV AUC: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    return pipeline


# ─────────────────────────────────────────────────────────────────────────────
# Step 3: Combined MIT-BIH + PTBDB multi-task model
# ─────────────────────────────────────────────────────────────────────────────

def train_combined_model(
    X_mitbih: np.ndarray,
    y_mitbih: np.ndarray,
    X_ptbdb:  np.ndarray,
    y_ptbdb:  np.ndarray,
    model_type: str = "rf",
):
    """
    Train a unified model that covers both MIT-BIH (5-class AAMI) and PTBDB
    (binary Normal/Abnormal) by projecting both into a shared feature space.

    Strategy:
      - MIT-BIH features: may be 216 or 221 dims
      - PTBDB features:   187 dims
      - Align to 187 dims (minimum) — MIT-BIH waveform only, no RR features
      - PTBDB labels:     "N" (normal=0) or "ABNORMAL" (abnormal=1)
      - Combined labels:  N / S / V / F / ABNORMAL  (PTBDB abnormal is its own class)

    This gives the model exposure to more diverse ECG morphologies.
    """
    print("\n" + "="*60)
    print("STEP 3: Combined MIT-BIH + PTBDB Unified Model")
    print("="*60)

    # Align MIT-BIH features to 187 dims (PTBDB waveform length)
    target_dim = 187
    mit_dim    = X_mitbih.shape[1]
    if mit_dim > target_dim:
        X_mit_aligned = X_mitbih[:, :target_dim]
        print(f"  MIT-BIH: truncated {mit_dim} → {target_dim} dims (waveform only)")
    else:
        pad = np.zeros((len(X_mitbih), target_dim - mit_dim))
        X_mit_aligned = np.hstack([X_mitbih, pad])
        print(f"  MIT-BIH: zero-padded {mit_dim} → {target_dim} dims")

    # PTBDB: keep 187 dims as-is
    print(f"  PTBDB: {X_ptbdb.shape[1]} dims (pre-normalized, no change)")

    # Build combined label set
    y_mit_str  = np.array(y_mitbih, dtype=str)           # N, S, V, F, Q
    y_ptbdb_str = np.where(y_ptbdb == 0, "N", "ABNORMAL")  # N or ABNORMAL

    X_combined = np.vstack([X_mit_aligned, X_ptbdb])
    y_combined = np.concatenate([y_mit_str, y_ptbdb_str])

    print(f"  Combined: {X_combined.shape}")
    print(f"  Label distribution: {dict(Counter(y_combined.tolist()))}")

    X_train, X_test, y_train, y_test = train_test_split(
        X_combined, y_combined, test_size=0.2, random_state=42, stratify=y_combined
    )

    if model_type == "rf":
        clf = RandomForestClassifier(
            n_estimators=300,
            class_weight="balanced",
            n_jobs=-1,
            random_state=42,
        )
    else:
        clf = GradientBoostingClassifier(
            n_estimators=200, max_depth=5, learning_rate=0.1,
            subsample=0.8, random_state=42,
        )

    pipeline = Pipeline([("scaler", StandardScaler()), ("clf", clf)])
    print(f"\n  Training {model_type.upper()} on combined dataset...")
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    print(f"\n  Combined Model Test Classification Report:")
    print(classification_report(y_test, y_pred, zero_division=0))

    return pipeline, target_dim


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model",     choices=["rf", "gb"], default="rf")
    parser.add_argument("--only-eval", action="store_true",
                        help="Only run Step 1 (transfer eval), skip training")
    args = parser.parse_args()

    print("PS-03 — PTBDB Dataset Evaluation\n")

    # Load PTBDB
    X_ptbdb, y_ptbdb = load_ptbdb()

    # ── Step 1: Transfer eval ───────────────────────────────────────────────
    evaluate_mitbih_on_ptbdb(X_ptbdb, y_ptbdb)

    if args.only_eval:
        return

    # ── Step 2: Dedicated PTBDB binary model ────────────────────────────────
    ptbdb_pipeline = train_ptbdb_classifier(X_ptbdb, y_ptbdb, model_type=args.model)

    os.makedirs("model", exist_ok=True)
    ptbdb_model_path = f"model/model_ptbdb_{args.model}.pkl"
    joblib.dump(ptbdb_pipeline, ptbdb_model_path, compress=3)
    size_mb = os.path.getsize(ptbdb_model_path) / 1024 / 1024
    print(f"\n  ✅ PTBDB model saved: {ptbdb_model_path} ({size_mb:.1f} MB)")

    # ── Step 3: Combined model ───────────────────────────────────────────────
    print("\nLoading MIT-BIH data for combined model...")
    X_mit_train, y_mit_train, _, _ = load_mitbih()

    combined_pipeline, combined_dim = train_combined_model(
        X_mit_train, y_mit_train, X_ptbdb, y_ptbdb, model_type=args.model
    )

    combined_path = f"model/model_combined_{args.model}.pkl"
    joblib.dump({"pipeline": combined_pipeline, "feature_dim": combined_dim},
                combined_path, compress=3)
    size_mb = os.path.getsize(combined_path) / 1024 / 1024
    print(f"\n  ✅ Combined model saved: {combined_path} ({size_mb:.1f} MB)")

    print("\n" + "="*60)
    print("SUMMARY OF SAVED MODELS")
    print("="*60)
    print(f"  model/model.pkl             — MIT-BIH 5-class AAMI classifier")
    print(f"  model/model_ptbdb_{args.model}.pkl  — PTBDB binary Normal/Abnormal")
    print(f"  model/model_combined_{args.model}.pkl — Combined (MIT-BIH + PTBDB)")
    print("\nTo use PTBDB model in the API: set MODEL_PATH=model/model_ptbdb_rf.pkl")
    print("The API endpoint contract stays identical — only label values change.")


if __name__ == "__main__":
    main()
