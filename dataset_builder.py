"""
PS-03: AI-Assisted ECG Screening — Step 1a: Dataset builder

Turns raw MIT-BIH records into a model-ready labeled beat dataset.

Pipeline:
  1. Download MIT-BIH records + their expert annotations (via wfdb)
  2. Filter each signal (reuses the bandpass filter from ecg_preprocessing.py)
  3. Segment beats around each ANNOTATED R-peak (ground truth locations,
     not detected ones -- for training we want the real peak positions)
  4. Map MIT-BIH's raw annotation symbols to the standard AAMI 5-class scheme
  5. Split by PATIENT (not by beat) into train/val/test -- this matters:
     if beats from the same patient land in both train and test, the model
     can "cheat" by learning that patient's specific ECG morphology instead
     of learning general arrhythmia patterns. This is the single most common
     mistake in ECG classification projects.
  6. Handle class imbalance (normal beats vastly outnumber abnormal ones)
  7. Save everything as .npy arrays ready for Step 2 (model training)

Usage:
  python dataset_builder.py                  # runs on simulated multi-patient data
  python dataset_builder.py --real           # downloads & uses real MIT-BIH
                                              # (requires internet access to physionet.org)
"""

import argparse
import os
import sys
import numpy as np
from collections import Counter
from scipy.signal import butter, sosfiltfilt

sys.path.insert(0, "D:\\Lib\\site-packages")


def bandpass_filter(signal, fs, lowcut=0.5, highcut=40.0):
    """Butterworth zero-phase bandpass filter (0.5-40 Hz). Matches preprocessing.py."""
    nyq = fs / 2.0
    if highcut >= nyq:
        highcut = nyq * 0.95
    sos = butter(N=4, Wn=[lowcut / nyq, highcut / nyq], btype="band", output="sos")
    return sosfiltfilt(sos, signal).astype(np.float64)


# ---------------------------------------------------------------------------
# AAMI 5-class mapping (the standard scheme used in ECG classification research)
#   N = Normal                (N, L, R, e, j)
#   S = Supraventricular      (A, a, J, S)
#   V = Ventricular ectopic   (V, E)
#   F = Fusion                (F)
#   Q = Unknown/paced         (P, /, f, u)
# ---------------------------------------------------------------------------

AAMI_MAP = {
    "N": "N", "L": "N", "R": "N", "e": "N", "j": "N",
    "A": "S", "a": "S", "J": "S", "S": "S",
    "V": "V", "E": "V",
    "F": "F",
    "P": "Q", "/": "Q", "f": "Q", "u": "Q",
}
CLASS_LABELS = ["N", "S", "V", "F", "Q"]

# Standard inter-patient split from de Chazal et al. (2004) -- the accepted
# way to split MIT-BIH so no patient's beats appear in both train and test.
DS1_RECORDS = ["101", "106", "108", "109", "112", "114", "115", "116", "118", "119",
               "122", "124", "201", "203", "205", "207", "208", "209", "215", "220",
               "223", "230"]
DS2_RECORDS = ["100", "103", "105", "111", "113", "117", "121", "123", "200", "202",
               "210", "212", "213", "214", "219", "221", "222", "228", "231", "232",
               "233", "234"]


# ---------------------------------------------------------------------------
# Real data path (requires internet access to physionet.org)
# ---------------------------------------------------------------------------

def load_real_record_with_annotations(record_name, local_dir=None, pn_dir="mitdb"):
    """Loads a record either from a local directory (extracted MIT-BIH zip) or
    by downloading from PhysioNet if local_dir is not provided."""
    import wfdb
    if local_dir:
        record_path = os.path.join(local_dir, record_name)
        record = wfdb.rdrecord(record_path)
        annotation = wfdb.rdann(record_path, "atr")
    else:
        record = wfdb.rdrecord(record_name, pn_dir=pn_dir)
        annotation = wfdb.rdann(record_name, "atr", pn_dir=pn_dir)
    signal = record.p_signal[:, 0]
    fs = record.fs
    r_peak_samples = annotation.sample
    r_peak_symbols = annotation.symbol
    return signal, fs, r_peak_samples, r_peak_symbols


# ---------------------------------------------------------------------------
# Simulated data path (no internet needed -- for testing this script)
# ---------------------------------------------------------------------------

def simulate_record_with_annotations(record_name, seed):
    """Generates a fake 'patient' with a random heart rate/noise profile and
    randomly-assigned beat labels, just to exercise the full pipeline logic."""
    import neurokit2 as nk
    rng = np.random.default_rng(seed)
    fs = 360
    hr = rng.integers(55, 100)
    noise = rng.uniform(0.01, 0.05)
    signal = np.asarray(nk.ecg_simulate(duration=30, sampling_rate=fs, heart_rate=hr, noise=noise))

    from ecg_preprocessing import pan_tompkins_r_peaks
    filtered_preview = bandpass_filter(signal, fs)
    r_peak_samples = pan_tompkins_r_peaks(filtered_preview, fs)

    # Simulate realistic class imbalance: mostly Normal, occasional other classes
    symbol_pool = ["N"] * 90 + ["V"] * 5 + ["A"] * 3 + ["F"] * 1 + ["/"] * 1
    r_peak_symbols = [rng.choice(symbol_pool) for _ in r_peak_samples]

    return signal, fs, r_peak_samples, r_peak_symbols


# ---------------------------------------------------------------------------
# RR-interval feature computation
# MUST stay in sync with app/services/preprocessing.py:compute_rr_features()
# ---------------------------------------------------------------------------

def compute_rr_features(r_peak_samples, beat_idx, fs):
    """
    Compute 5 RR-interval features for the beat at beat_idx.

    Identical logic to preprocessing.py — training and inference MUST match.

    Features (all in seconds):
      pre_rr      — RR before this beat        (premature → S/V indicator)
      post_rr     — RR after this beat          (compensatory pause → V indicator)
      ratio_rr    — pre_rr / post_rr            (< 1.0 → V; ≈ 1.0 → N/F)
      local_rr    — mean RR ±2-beat window      (instantaneous heart rate context)
      norm_pre_rr — pre_rr / local_rr           (< 1.0 → early beat → S/V)
    """
    n = len(r_peak_samples)
    if n < 2:
        return np.array([1.0, 1.0, 1.0, 1.0, 1.0])

    rr = np.diff(r_peak_samples.astype(np.float64)) / fs
    mean_rr = float(rr.mean())

    pre_idx = beat_idx - 1
    pre_rr  = float(rr[pre_idx]) if 0 <= pre_idx < len(rr) else mean_rr
    post_rr = float(rr[beat_idx]) if 0 <= beat_idx < len(rr) else mean_rr

    win_s    = max(0, beat_idx - 2)
    win_e    = min(len(rr), beat_idx + 2)
    local_rr = float(rr[win_s:win_e].mean()) if win_e > win_s else mean_rr

    ratio_rr    = np.clip(pre_rr / (post_rr  + 1e-6), 0.1, 10.0)
    norm_pre_rr = np.clip(pre_rr / (local_rr + 1e-6), 0.1, 10.0)

    return np.array([pre_rr, post_rr, ratio_rr, local_rr, norm_pre_rr])


# ---------------------------------------------------------------------------
# Beat segmentation with labels
# ---------------------------------------------------------------------------

def segment_labeled_beats(signal, fs, r_peak_samples, r_peak_symbols, before_ms=200, after_ms=400):
    """
    Segment beats around annotated R-peaks, extract waveform + RR features.

    Feature vector layout (221 total):
      [0:216]  — raw filtered waveform segment
      [216:221] — [pre_rr, post_rr, ratio_rr, local_rr, norm_pre_rr]

    This MUST match app/services/preprocessing.py:extract_beat_features().
    """
    filtered = bandpass_filter(signal, fs)
    before = int(before_ms / 1000 * fs)
    after  = int(after_ms  / 1000 * fs)

    # Convert to numpy array once for vectorised RR computation
    r_peak_samples = np.asarray(r_peak_samples, dtype=np.int64)

    # Build index mapping: only beats with valid AAMI symbol get included,
    # but RR features must reference the FULL annotated peak list (not just
    # the filtered subset) so timing context is preserved.
    beats, labels = [], []
    beat_counter = 0  # counts annotations we've actually accepted

    # Track original indices for RR computation
    accepted_indices = []  # positions in r_peak_samples of accepted beats
    for orig_idx, (sample, symbol) in enumerate(zip(r_peak_samples, r_peak_symbols)):
        if symbol not in AAMI_MAP:
            continue
        start, end = int(sample) - before, int(sample) + after
        if start >= 0 and end <= len(filtered):
            accepted_indices.append(orig_idx)

    # Build feature vectors using accepted peaks for RR computation
    accepted_peaks = r_peak_samples[accepted_indices]  # sub-array of valid peaks

    for local_idx, orig_idx in enumerate(accepted_indices):
        sample = r_peak_samples[orig_idx]
        symbol = r_peak_symbols[orig_idx]
        start, end = int(sample) - before, int(sample) + after

        waveform = filtered[start:end]
        rr_feats = compute_rr_features(accepted_peaks, local_idx, fs)

        beats.append(np.concatenate([waveform, rr_feats]))
        labels.append(AAMI_MAP[symbol])

    return np.array(beats), np.array(labels)



# ---------------------------------------------------------------------------
# Class imbalance handling
# ---------------------------------------------------------------------------

def compute_class_weights(labels):
    """Inverse-frequency class weights -- pass these to your model's training
    call (e.g. sklearn's class_weight= or PyTorch's loss weight=) instead of
    physically duplicating minority-class beats, which is usually the safer
    starting point for a hackathon timeline."""
    counts = Counter(labels)
    total = len(labels)
    n_classes = len(counts)
    weights = {cls: total / (n_classes * count) for cls, count in counts.items()}
    return weights


def oversample_minority_classes(beats, labels, target_ratio=0.3):
    """Simple random oversampling: duplicates minority-class beats until each
    class has at least target_ratio * majority_class_count samples.
    Use this OR class_weights, not necessarily both."""
    counts = Counter(labels)
    majority_count = max(counts.values())
    target_count = int(majority_count * target_ratio)

    beats_out, labels_out = list(beats), list(labels)
    rng = np.random.default_rng(42)
    for cls, count in counts.items():
        if count < target_count:
            idx = np.where(labels == cls)[0]
            needed = target_count - count
            extra_idx = rng.choice(idx, size=needed, replace=True)
            beats_out.extend(beats[extra_idx])
            labels_out.extend(labels[extra_idx])
    return np.array(beats_out), np.array(labels_out)


# ---------------------------------------------------------------------------
# Main dataset build
# ---------------------------------------------------------------------------

def build_dataset(record_names, use_real, local_dir=None):
    all_beats, all_labels = [], []
    for i, rec in enumerate(record_names):
        print(f"  Processing record {rec}...")
        if use_real:
            signal, fs, r_samples, r_symbols = load_real_record_with_annotations(rec, local_dir=local_dir)
        else:
            signal, fs, r_samples, r_symbols = simulate_record_with_annotations(rec, seed=i)
        beats, labels = segment_labeled_beats(signal, fs, r_samples, r_symbols)
        all_beats.append(beats)
        all_labels.append(labels)
    return np.concatenate(all_beats), np.concatenate(all_labels)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--real", action="store_true",
                         help="Use real MIT-BIH data. Default: simulated data.")
    parser.add_argument("--local-dir", type=str, default=None,
                         help="Path to a local folder of extracted MIT-BIH .dat/.hea/.atr files "
                              "(skips downloading from PhysioNet).")
    args = parser.parse_args()

    if args.real:
        train_records, test_records = DS1_RECORDS, DS2_RECORDS
    else:
        print("No --real flag: using simulated multi-patient data to test the pipeline.\n")
        # Use small fake record lists so the demo runs fast
        train_records, test_records = ["train_pt_1", "train_pt_2", "train_pt_3", "train_pt_4"], \
                                       ["test_pt_1", "test_pt_2"]

    print(f"Building TRAIN set from {len(train_records)} patient records (DS1)...")
    X_train_full, y_train_full = build_dataset(train_records, use_real=args.real, local_dir=args.local_dir)

    print(f"\nBuilding TEST set from {len(test_records)} patient records (DS2)...")
    X_test, y_test = build_dataset(test_records, use_real=args.real, local_dir=args.local_dir)

    # Carve a validation set out of TRAIN patients only (still no patient overlap with test)
    n_val_patients = max(1, len(train_records) // 5)
    val_records = train_records[:n_val_patients]
    train_records_final = train_records[n_val_patients:]
    print(f"\nSplitting off {n_val_patients} of the train patients for validation...")
    X_val, y_val = build_dataset(val_records, use_real=args.real, local_dir=args.local_dir)
    X_train, y_train = build_dataset(train_records_final, use_real=args.real, local_dir=args.local_dir)

    print("\n--- Class distribution before balancing (train) ---")
    print(Counter(y_train))

    class_weights = compute_class_weights(y_train)
    print("\nComputed class weights (use with your model's loss function):")
    print(class_weights)

    X_train_bal, y_train_bal = oversample_minority_classes(X_train, y_train)
    print("\n--- Class distribution after oversampling (train) ---")
    print(Counter(y_train_bal))

    os.makedirs("dataset", exist_ok=True)
    np.save("dataset/X_train.npy", X_train)
    np.save("dataset/y_train.npy", y_train)
    np.save("dataset/X_train_balanced.npy", X_train_bal)
    np.save("dataset/y_train_balanced.npy", y_train_bal)
    np.save("dataset/X_val.npy", X_val)
    np.save("dataset/y_val.npy", y_val)
    np.save("dataset/X_test.npy", X_test)
    np.save("dataset/y_test.npy", y_test)

    print("\nSaved to dataset/:")
    print(f"  X_train {X_train.shape}, X_train_balanced {X_train_bal.shape}, "
          f"X_val {X_val.shape}, X_test {X_test.shape}")
    print("\nThese four (train/train_balanced/val/test) are what Step 2's model training script loads.")


if __name__ == "__main__":
    main()
