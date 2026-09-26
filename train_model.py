"""
train_model.py
──────────────
Trains an ECG beat classifier on the MIT-BIH dataset prepared by dataset_builder.py.
Produces model/model.pkl (scikit-learn RandomForest) ready for the PS-03 backend.

Usage:
    python train_model.py                  # RandomForest (default, fast)
    python train_model.py --model xgb      # XGBoost (requires xgboost package)
    python train_model.py --model rf --balanced  # use oversampled training set

The script also prints a classification report on the held-out test set so you
can quote accuracy numbers during the demo.
"""
from __future__ import annotations

import argparse
import os
import sys

import numpy as np

# Fix site-packages path for this environment
sys.path.insert(0, "D:\\Lib\\site-packages")

import joblib
from collections import Counter
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, confusion_matrix
import warnings
warnings.filterwarnings("ignore")


LABEL_CLASSES = ["N", "S", "V", "F", "Q"]


def load_data(use_balanced: bool = True):
    print("Loading dataset...")
    X_train = np.load("X_train_balanced.npy" if use_balanced else "X_train.npy")
    y_train = np.load("y_train_balanced.npy" if use_balanced else "y_train.npy", allow_pickle=True)
    X_val   = np.load("X_val.npy")
    y_val   = np.load("y_val.npy", allow_pickle=True)
    X_test  = np.load("X_test.npy")
    y_test  = np.load("y_test.npy", allow_pickle=True)

    print(f"  Train: {X_train.shape}  labels: {dict(Counter(y_train.tolist()))}")
    print(f"  Val:   {X_val.shape}    labels: {dict(Counter(y_val.tolist()))}")
    print(f"  Test:  {X_test.shape}   labels: {dict(Counter(y_test.tolist()))}")
    return X_train, y_train, X_val, y_val, X_test, y_test


def build_rf_pipeline() -> Pipeline:
    return Pipeline([
        ("scaler", StandardScaler()),
        ("clf", RandomForestClassifier(
            n_estimators=200,
            max_depth=None,
            min_samples_leaf=2,
            max_features="sqrt",
            class_weight="balanced",
            n_jobs=-1,
            random_state=42,
        )),
    ])


def build_gb_pipeline() -> Pipeline:
    """Gradient Boosted Trees — slower to train but often higher accuracy."""
    return Pipeline([
        ("scaler", StandardScaler()),
        ("clf", GradientBoostingClassifier(
            n_estimators=200,
            max_depth=5,
            learning_rate=0.1,
            subsample=0.8,
            random_state=42,
        )),
    ])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", choices=["rf", "gb"], default="rf",
                        help="Model type: rf=RandomForest (fast), gb=GradientBoosting (slower/better)")
    parser.add_argument("--balanced", action="store_true", default=True,
                        help="Use oversampled balanced training set (default: True)")
    parser.add_argument("--no-balanced", dest="balanced", action="store_false")
    args = parser.parse_args()

    X_train, y_train, X_val, y_val, X_test, y_test = load_data(use_balanced=args.balanced)

    print(f"\nTraining {args.model.upper()} classifier...")
    pipeline = build_rf_pipeline() if args.model == "rf" else build_gb_pipeline()
    pipeline.fit(X_train, y_train)
    print("Training complete.")

    # Validation set quick check
    val_acc = pipeline.score(X_val, y_val)
    print(f"\nValidation accuracy: {val_acc:.4f}")

    # Full test-set evaluation
    print("\n=== Test Set Classification Report ===")
    y_pred = pipeline.predict(X_test)
    present_labels = sorted(set(y_test.tolist()) | set(y_pred.tolist()))
    print(classification_report(y_test, y_pred, labels=present_labels,
                                 target_names=present_labels, zero_division=0))

    print("=== Confusion Matrix ===")
    print(confusion_matrix(y_test, y_pred, labels=present_labels))

    # Verify predict_proba works (required by model_service.py)
    proba_sample = pipeline.predict_proba(X_test[:5])
    print(f"\npredict_proba shape: {proba_sample.shape}")
    print(f"Classes: {list(pipeline.classes_)}")

    # Save model
    os.makedirs("model", exist_ok=True)
    model_path = "model/model.pkl"
    joblib.dump(pipeline, model_path, compress=3)
    size_mb = os.path.getsize(model_path) / 1024 / 1024
    print(f"\nModel saved to {model_path} ({size_mb:.1f} MB)")
    print("Drop this file in ps03-ecg-backend/model/ and restart the API.")


if __name__ == "__main__":
    main()
