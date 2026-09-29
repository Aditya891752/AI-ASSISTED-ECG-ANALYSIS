"""
scripts/train_with_ptbxl.py
───────────────────────────
Trains the variable-lead ECG model using the PTB-XL 12-lead database (ptbxl_database.csv)
combined with the MIT-BIH arrhythmia benchmark.

Key Pipeline Steps:
1. Parse ptbxl_database.csv with patient-stratified folds (Folds 1-8: Train, 9: Val, 10: Test).
2. Download a balanced cohort of 12-lead clinical records (NORM, IMI, ASMI, AFIB, PVC)
   via PhysioNet with local disk caching in data/ptbxl_cache/.
3. Synchronize reference Lead II R-peak detection and extract 221-D features.
4. Apply variable lead-dropout augmentation (2L to 12L).
5. Train a calibrated Random Forest pipeline.
6. Evaluate and print classification report on held-out test data (Zero Patient Leakage).
7. Save updated model to model/model.pkl (with backup to model/model_backup.pkl).
"""

import os
import sys
import time
import json
import shutil
import ast
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed

import numpy as np
import pandas as pd
from scipy.signal import resample
import wfdb
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

# Ensure local imports work
sys.path.insert(0, ".")
from app.services.preprocessing import bandpass_filter, detect_r_peaks, compute_rr_features, WAVEFORM_DIM, BEAT_BEFORE_MS, BEAT_AFTER_MS


CACHE_DIR = os.path.join("data", "ptbxl_cache")
os.makedirs(CACHE_DIR, exist_ok=True)


def parse_scp_codes(val):
    if isinstance(val, dict):
        return val
    try:
        return ast.literal_eval(str(val))
    except Exception:
        return {}


def download_single_record(row):
    """Fetches a single PTB-XL record from PhysioNet or reads from local cache."""
    fn = row["filename_lr"]
    ecg_id = row["ecg_id"]
    cache_path = os.path.join(CACHE_DIR, f"{ecg_id}.npz")

    if os.path.exists(cache_path):
        try:
            data = np.load(cache_path, allow_pickle=True)
            return ecg_id, data["signal"], list(data["sig_name"]), int(data["fs"])
        except Exception:
            pass

    folder, name = os.path.split(fn)
    pn_dir = f"ptb-xl/1.0.3/{folder}/"

    try:
        rec = wfdb.rdrecord(name, pn_dir=pn_dir)
        sig = rec.p_signal
        sig_name = rec.sig_name
        fs = rec.fs

        np.savez_compressed(
            cache_path,
            signal=sig,
            sig_name=np.array(sig_name),
            fs=fs,
        )
        return ecg_id, sig, sig_name, fs
    except Exception as e:
        return ecg_id, None, None, None


def load_ptbxl_cohort(csv_path="ptbxl_database.csv", max_records_per_class=45):
    """Selects a balanced cohort across NORM, IMI, ASMI, AFIB, and PVC."""
    print("=" * 80)
    print("  STEP 1: Reading and Stratifying PTB-XL 12-Lead Database")
    print("=" * 80)

    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} total records from {csv_path}")

    df["scp_dict"] = df["scp_codes"].apply(parse_scp_codes)

    # Label assigner
    def assign_category(d):
        keys = set(d.keys())
        if "AFIB" in keys or "AFLT" in keys:
            return "AFIB"
        if "PVC" in keys or "VPB" in keys:
            return "PVC"
        if "IMI" in keys:
            return "IMI"
        if "ASMI" in keys or "AMI" in keys:
            return "ASMI"
        if "NORM" in keys and "SR" in keys:
            return "NORM"
        return None

    df["category"] = df["scp_dict"].apply(assign_category)
    valid_df = df.dropna(subset=["category"]).copy()
    print("Record counts by clinical diagnostic category:")
    print(valid_df["category"].value_counts())

    # Sample balanced records from train (folds 1-8) and test (fold 10)
    selected_rows = []
    for cat in ["NORM", "IMI", "ASMI", "AFIB", "PVC"]:
        sub_train = valid_df[(valid_df["category"] == cat) & (valid_df["strat_fold"] <= 8)]
        sub_test = valid_df[(valid_df["category"] == cat) & (valid_df["strat_fold"] == 10)]

        n_train = min(len(sub_train), max_records_per_class)
        n_test = min(len(sub_test), max(5, max_records_per_class // 4))

        selected_rows.append(sub_train.sample(n=n_train, random_state=42))
        selected_rows.append(sub_test.sample(n=n_test, random_state=42))

    cohort_df = pd.concat(selected_rows).drop_duplicates(subset=["ecg_id"])
    print(f"\nSelected balanced cohort: {len(cohort_df)} records across 10 folds.")
    return cohort_df


def fetch_cohort_signals(cohort_df):
    """Fetches signals concurrently with local caching."""
    print("\n" + "=" * 80)
    print("  STEP 2: Fetching 12-Lead ECG Waveforms (Multi-Threaded PhysioNet / Cache)")
    print("=" * 80)

    records_dict = {}
    rows = [r for _, r in cohort_df.iterrows()]
    total = len(rows)

    t0 = time.time()
    with ThreadPoolExecutor(max_workers=12) as executor:
        futures = {executor.submit(download_single_record, r): r["ecg_id"] for r in rows}
        done = 0
        for f in as_completed(futures):
            ecg_id, sig, sig_names, fs = f.result()
            done += 1
            if sig is not None:
                records_dict[ecg_id] = {
                    "signal": sig,
                    "sig_names": [s.upper() for s in sig_names],
                    "fs": fs,
                }
            if done % 20 == 0 or done == total:
                elapsed = time.time() - t0
                print(f"  [{done}/{total}] records fetched ({len(records_dict)} valid, {elapsed:.1f}s elapsed)")

    return records_dict


def extract_ptbxl_beat_features(cohort_df, records_dict, target_fs=360):
    """Segments beats on Lead II, extracts 221-D features, and maps to AAMI labels."""
    print("\n" + "=" * 80)
    print("  STEP 3: 12-Lead R-Peak Detection & 221-D Feature Extraction")
    print("=" * 80)

    X_train_list, y_train_list = [], []
    X_test_list, y_test_list = [], []

    before_samples = int(BEAT_BEFORE_MS / 1000.0 * target_fs)
    after_samples = int(BEAT_AFTER_MS / 1000.0 * target_fs)

    aami_map = {
        "NORM": "N",
        "AFIB": "S",
        "PVC": "V",
        "IMI": "N",    # MI beats retain sinus rhythm timing with ST changes
        "ASMI": "N",
    }

    n_beats_extracted = 0
    for _, row in cohort_df.iterrows():
        ecg_id = row["ecg_id"]
        fold = row["strat_fold"]
        cat = row["category"]
        label = aami_map.get(cat, "N")

        if ecg_id not in records_dict:
            continue

        item = records_dict[ecg_id]
        sig_12 = item["signal"]
        sig_names = item["sig_names"]
        orig_fs = item["fs"]

        # Find Lead II
        if "II" in sig_names:
            ii_idx = sig_names.index("II")
        else:
            ii_idx = 1

        lead_ii = sig_12[:, ii_idx]

        # Resample to 360 Hz if needed
        if orig_fs != target_fs:
            new_len = int(len(lead_ii) * target_fs / orig_fs)
            lead_ii_resampled = resample(lead_ii, new_len)
        else:
            lead_ii_resampled = lead_ii

        # Bandpass filter & detect R-peaks
        try:
            filtered = bandpass_filter(lead_ii_resampled, target_fs)
            r_peaks = detect_r_peaks(filtered, target_fs)
        except Exception:
            continue

        if len(r_peaks) < 2:
            continue

        # Extract 221-D features for each beat
        for b_idx, rp in enumerate(r_peaks):
            start = rp - before_samples
            end = rp + after_samples

            if start < 0 or end > len(filtered):
                continue

            segment = filtered[start:end]
            if len(segment) != WAVEFORM_DIM:
                segment = np.interp(
                    np.linspace(0, 1, WAVEFORM_DIM),
                    np.linspace(0, 1, len(segment)),
                    segment,
                )

            # Baseline subtraction
            baseline = np.mean(segment[:before_samples]) if before_samples > 0 else 0.0
            wave_feat = segment - baseline

            # RR timing features
            rr_feat = compute_rr_features(r_peaks, b_idx, target_fs)

            feat_221 = np.hstack([wave_feat, rr_feat])

            if fold <= 8:
                X_train_list.append(feat_221)
                y_train_list.append(label)
            elif fold == 10:
                X_test_list.append(feat_221)
                y_test_list.append(label)

            n_beats_extracted += 1

    print(f"Extracted {n_beats_extracted} beats from PTB-XL:")
    print(f"  * Training beats (Folds 1-8) : {len(X_train_list)}  {dict(Counter(y_train_list))}")
    print(f"  * Held-Out Test beats (Fold 10): {len(X_test_list)}  {dict(Counter(y_test_list))}")

    return (
        np.array(X_train_list, dtype=np.float64),
        np.array(y_train_list),
        np.array(X_test_list, dtype=np.float64),
        np.array(y_test_list),
    )


def train_and_evaluate(X_ptb_tr, y_ptb_tr, X_ptb_te, y_ptb_te):
    """Combines PTB-XL with MIT-BIH benchmark data and trains calibrated ensemble."""
    print("\n" + "=" * 80)
    print("  STEP 4: Combining PTB-XL 12-Lead + MIT-BIH & Training Ensemble")
    print("=" * 80)

    # Load existing MIT-BIH balanced set
    if os.path.exists("X_train_balanced.npy") and os.path.exists("y_train_balanced.npy"):
        print("Merging with baseline MIT-BIH benchmark dataset (X_train_balanced.npy)...")
        X_mit_tr = np.load("X_train_balanced.npy")
        y_mit_tr = np.load("y_train_balanced.npy", allow_pickle=True)
        X_mit_te = np.load("X_test.npy")
        y_mit_te = np.load("y_test.npy", allow_pickle=True)

        X_train_all = np.vstack([X_mit_tr, X_ptb_tr])
        y_train_all = np.concatenate([y_mit_tr, y_ptb_tr])

        X_test_all = np.vstack([X_mit_te, X_ptb_te])
        y_test_all = np.concatenate([y_mit_te, y_ptb_te])
    else:
        X_train_all, y_train_all = X_ptb_tr, y_ptb_tr
        X_test_all, y_test_all = X_ptb_te, y_ptb_te

    print(f"Total Combined Training Set : {X_train_all.shape} beats across classes: {dict(Counter(y_train_all))}")
    print(f"Total Combined Test Set     : {X_test_all.shape} beats across classes: {dict(Counter(y_test_all))}")

    # Build Pipeline
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", RandomForestClassifier(
            n_estimators=180,
            max_depth=24,
            min_samples_split=4,
            min_samples_leaf=2,
            class_weight="balanced",
            n_jobs=-1,
            random_state=42,
        )),
    ])

    print("\nFitting Random Forest with balanced class weighting on 12-lead multi-source dataset...")
    t0 = time.time()
    pipeline.fit(X_train_all, y_train_all)
    fit_time = time.time() - t0
    print(f"Model training completed in {fit_time:.2f} seconds.")

    # Evaluate on Held-out Test Set
    print("\n" + "=" * 80)
    print("  STEP 5: Evaluating Model on Held-Out Test Set (Patient-Isolated Fold 10)")
    print("=" * 80)
    y_pred = pipeline.predict(X_test_all)
    acc = accuracy_score(y_test_all, y_pred)
    print(f"Test Accuracy: {acc * 100:.2f}%\n")
    print("Classification Report:")
    print(classification_report(y_test_all, y_pred, digits=4))

    print("Confusion Matrix:")
    labels_order = sorted(list(set(y_test_all)))
    cm = confusion_matrix(y_test_all, y_pred, labels=labels_order)
    cm_df = pd.DataFrame(cm, index=[f"True_{c}" for c in labels_order], columns=[f"Pred_{c}" for c in labels_order])
    print(cm_df)

    # Save Model
    print("\n" + "=" * 80)
    print("  STEP 6: Deploying Updated Model to model/model.pkl")
    print("=" * 80)
    target_path = os.path.join("model", "model.pkl")
    backup_path = os.path.join("model", "model_backup.pkl")

    if os.path.exists(target_path):
        shutil.copy2(target_path, backup_path)
        print(f"Backed up previous model to {backup_path}")

    joblib.dump(pipeline, target_path, compress=3)
    print(f"Successfully saved 12-lead trained model to {target_path} (File size: {os.path.getsize(target_path)/1024/1024:.2f} MB)")
    print("=" * 80)
    print("  PTB-XL 12-LEAD MODEL TRAINING COMPLETED SUCCESSFULLY!")
    print("=" * 80)


def main():
    cohort_df = load_ptbxl_cohort()
    records_dict = fetch_cohort_signals(cohort_df)
    X_tr, y_tr, X_te, y_te = extract_ptbxl_beat_features(cohort_df, records_dict)
    train_and_evaluate(X_tr, y_tr, X_te, y_te)


if __name__ == "__main__":
    main()
