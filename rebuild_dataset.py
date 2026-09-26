"""
rebuild_dataset.py
──────────────────
Rebuild the MIT-BIH .npy dataset with the new 221-dimensional feature vectors
(216 waveform + 5 RR-interval features).

This script reads directly from the local MIT-BIH zip so you don't need
an internet connection. It extracts the zip temporarily if needed.

Requirements:
    pip install wfdb

Usage:
    python rebuild_dataset.py                          # uses mit-bih zip in current dir
    python rebuild_dataset.py --zip path/to/mitbih.zip
    python rebuild_dataset.py --local-dir path/to/extracted/mitbih/

Output: overwrites X_train.npy, y_train.npy, X_train_balanced.npy,
        y_train_balanced.npy, X_val.npy, y_val.npy, X_test.npy, y_test.npy
"""
from __future__ import annotations

import argparse
import os
import sys
import tempfile
import zipfile

import numpy as np

sys.path.insert(0, "D:\\Lib\\site-packages")      # fix for this environment

from collections import Counter
from dataset_builder import (
    DS1_RECORDS,
    DS2_RECORDS,
    AAMI_MAP,
    compute_class_weights,
    oversample_minority_classes,
    segment_labeled_beats,                          # ← now includes RR features
)


def load_record(record_name: str, local_dir: str):
    """Load a single MIT-BIH record. Tries wfdb first, falls back to local reader."""
    try:
        sys.path.insert(0, "D:\\Lib\\site-packages")
        import wfdb
        record_path = os.path.join(local_dir, record_name)
        record      = wfdb.rdrecord(record_path)
        annotation  = wfdb.rdann(record_path, "atr")
        signal      = record.p_signal[:, 0]
        fs          = record.fs
        r_samples   = annotation.sample
        r_symbols   = annotation.symbol
        return signal, fs, r_samples, r_symbols
    except ImportError:
        pass  # fall through to local reader

    # Fall back: our pure-Python MIT-BIH reader (no wfdb needed)
    from mitbih_reader import load_record as local_load
    return local_load(record_name, local_dir)


def build_split(record_names: list[str], local_dir: str, split_name: str):
    all_beats, all_labels = [], []
    for rec in record_names:
        print(f"  [{split_name}] Processing record {rec} ...", end=" ", flush=True)
        try:
            signal, fs, r_samples, r_symbols = load_record(rec, local_dir)
            beats, labels = segment_labeled_beats(signal, fs, r_samples, r_symbols)
            all_beats.append(beats)
            all_labels.append(labels)
            print(f"{len(labels)} beats | dist: {dict(Counter(labels.tolist()))}")
        except Exception as exc:
            print(f"SKIPPED ({exc})")

    if not all_beats:
        raise RuntimeError(f"No beats extracted for split '{split_name}'")

    return np.concatenate(all_beats), np.concatenate(all_labels)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", default="mit-bih-arrhythmia-database-1.0.0.zip",
                        help="Path to the MIT-BIH zip file")
    parser.add_argument("--local-dir", default=None,
                        help="Path to pre-extracted MIT-BIH directory (skips zip extraction)")
    args = parser.parse_args()

    # ── Resolve MIT-BIH data directory ────────────────────────────────────────
    tmp_dir = None
    if args.local_dir:
        local_dir = args.local_dir
        print(f"Using pre-extracted MIT-BIH data from: {local_dir}")
    elif os.path.exists(args.zip):
        print(f"Extracting {args.zip} ...")
        tmp_dir  = tempfile.mkdtemp(prefix="mitbih_")
        with zipfile.ZipFile(args.zip) as zf:
            zf.extractall(tmp_dir)
        # The zip creates a subdirectory: mit-bih-arrhythmia-database-1.0.0/
        subdirs = [d for d in os.listdir(tmp_dir) if os.path.isdir(os.path.join(tmp_dir, d))]
        local_dir = os.path.join(tmp_dir, subdirs[0]) if subdirs else tmp_dir
        print(f"Extracted to: {local_dir}")
    else:
        print(f"ERROR: MIT-BIH zip not found at '{args.zip}'")
        print("Download from: https://physionet.org/content/mitdb/1.0.0/")
        sys.exit(1)

    try:
        # ── Inter-patient split (de Chazal et al., 2004) ──────────────────────
        # DS1 = training patients, DS2 = test patients — NEVER overlap
        # Val comes from first 20% of DS1 patients
        n_val = max(1, len(DS1_RECORDS) // 5)
        val_records   = DS1_RECORDS[:n_val]
        train_records = DS1_RECORDS[n_val:]
        test_records  = DS2_RECORDS

        print(f"\nSplit: {len(train_records)} train / {len(val_records)} val / {len(test_records)} test patients")
        print(f"NOTE: Feature vector = 216 waveform + 5 RR = 221 dimensions\n")

        print("Building TRAIN set ...")
        X_train, y_train = build_split(train_records, local_dir, "train")

        print("\nBuilding VAL set ...")
        X_val, y_val = build_split(val_records, local_dir, "val")

        print("\nBuilding TEST set ...")
        X_test, y_test = build_split(test_records, local_dir, "test")

        # ── Class imbalance ────────────────────────────────────────────────────
        print("\n--- Train class distribution (before balancing) ---")
        print(Counter(y_train.tolist()))

        weights = compute_class_weights(y_train)
        print("Class weights:", weights)

        X_bal, y_bal = oversample_minority_classes(X_train, y_train)
        print("\n--- Train class distribution (after oversampling) ---")
        print(Counter(y_bal.tolist()))

        # ── Save ───────────────────────────────────────────────────────────────
        np.save("X_train.npy",          X_train)
        np.save("y_train.npy",          y_train)
        np.save("X_train_balanced.npy", X_bal)
        np.save("y_train_balanced.npy", y_bal)
        np.save("X_val.npy",            X_val)
        np.save("y_val.npy",            y_val)
        np.save("X_test.npy",           X_test)
        np.save("y_test.npy",           y_test)

        print(f"\n✅ Dataset rebuilt with 221-dim features:")
        print(f"   X_train:          {X_train.shape}")
        print(f"   X_train_balanced: {X_bal.shape}")
        print(f"   X_val:            {X_val.shape}")
        print(f"   X_test:           {X_test.shape}")
        print(f"\nNow run: python train_model.py --model rf")
        print(f"     or:  python train_model.py --model gb")

    finally:
        # Clean up temp extraction
        if tmp_dir and os.path.exists(tmp_dir):
            import shutil
            shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
