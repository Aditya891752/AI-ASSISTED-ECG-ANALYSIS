"""
app/services/preprocessing.py
──────────────────────────────
ECG preprocessing pipeline — bandpass filter + Pan-Tompkins R-peak detection
+ beat segmentation + RR-interval feature engineering.

FEATURE VECTOR (221 dimensions total):
  [0:216]   Raw waveform segment — 216 samples (200ms pre + 400ms post R-peak)
  [216]     pre_rr       — interval between previous and current beat (seconds)
  [217]     post_rr      — interval between current and next beat (seconds)
  [218]     ratio_rr     — pre_rr / post_rr  (timing asymmetry signature)
  [219]     local_rr     — mean RR over ±2-beat window (local heart rate context)
  [220]     norm_pre_rr  — pre_rr / local_rr  (how early/late this beat arrived)

WHY RR FEATURES MATTER
──────────────────────
S (supraventricular) beats are premature — they arrive early, so pre_rr < local_rr
  → norm_pre_rr < 1.0 is a strong S indicator

V (ventricular) beats are also premature but followed by a compensatory pause:
  pre_rr short, post_rr long → ratio_rr << 1.0 is a strong V indicator

F (fusion) beats have near-normal timing — ratio_rr ≈ 1.0, norm_pre_rr ≈ 1.0
  This separates F from V on timing alone, even if morphology is ambiguous

N beats have regular intervals: ratio_rr ≈ 1.0, norm_pre_rr ≈ 1.0, consistent local_rr

BEAT WINDOW (must match dataset_builder.py segment_labeled_beats):
  before_ms = 200  →  int(200/1000 * 360) = 72 samples before R-peak
  after_ms  = 400  →  int(400/1000 * 360) = 144 samples after R-peak
  Waveform length  = 72 + 144 = 216 samples
  Total features   = 216 + 5 = 221

INTEGRATION GUIDE
─────────────────
To plug in your own Pan-Tompkins implementation:
  Replace detect_r_peaks() below.
  It must accept (signal: np.ndarray, fs: int) and return a 1-D int64 array.

IMPORTANT: if you change the feature vector layout, you MUST also update
dataset_builder.py and retrain the model.
"""
from __future__ import annotations

import numpy as np
import structlog
from scipy.signal import butter, sosfiltfilt

logger = structlog.get_logger(__name__)

# ── Beat window constants ─────────────────────────────────────────────────────
# Must match dataset_builder.py segment_labeled_beats(before_ms=200, after_ms=400)
BEAT_BEFORE_MS = 200
BEAT_AFTER_MS  = 400

# Total feature vector size
WAVEFORM_DIM = 216   # raw samples per beat
RR_DIM       = 5     # RR-interval features
FEATURE_DIM  = WAVEFORM_DIM + RR_DIM   # 221


# ── Bandpass filter ────────────────────────────────────────────────────────────

def bandpass_filter(signal: np.ndarray, fs: int) -> np.ndarray:
    """
    Zero-phase Butterworth bandpass filter (0.5–40 Hz).
    Removes baseline wander (< 0.5 Hz) and high-frequency noise (> 40 Hz).
    """
    lowcut, highcut = 0.5, 40.0
    nyq = fs / 2.0
    if highcut >= nyq:
        highcut = nyq * 0.95
    sos = butter(N=4, Wn=[lowcut / nyq, highcut / nyq], btype="band", output="sos")
    return sosfiltfilt(sos, signal).astype(np.float64)


# ── R-peak detection ───────────────────────────────────────────────────────────

def detect_r_peaks(signal: np.ndarray, fs: int) -> np.ndarray:
    """
    Pan-Tompkins-inspired R-peak detection.

    ⚠️  STUB — Replace with your tuned Pan-Tompkins implementation.
    This simplified version (derivative² + moving-window integration + adaptive
    threshold) works reasonably for clean signals but is not clinical-grade.

    Returns: 1-D int64 array of R-peak sample indices.
    """
    diff       = np.diff(signal, prepend=signal[0])
    squared    = diff ** 2
    window     = max(1, int(0.150 * fs))          # 150 ms MWI window
    integrated = np.convolve(squared, np.ones(window) / window, mode="same")
    threshold  = 0.60 * integrated.max()
    refractory = int(0.200 * fs)                  # 200 ms refractory period

    peaks: list[int] = []
    last_peak = -refractory
    for i in range(len(integrated)):
        if integrated[i] > threshold and (i - last_peak) > refractory:
            peaks.append(i)
            last_peak = i
    return np.array(peaks, dtype=np.int64)


# ── RR-interval feature extraction ────────────────────────────────────────────

def compute_rr_features(
    r_peaks: np.ndarray,
    beat_idx: int,
    fs: int,
) -> np.ndarray:
    """
    Compute 5 RR-interval features for the beat at `beat_idx`.

    All intervals are in seconds (divided by fs) for scale-independence.

    Features:
      pre_rr      — RR interval BEFORE this beat (how early/normal it arrived)
      post_rr     — RR interval AFTER this beat (compensatory pause detection)
      ratio_rr    — pre_rr / post_rr  (< 1 → compensatory pause → V indicator)
      local_rr    — mean RR across ±2 beats (instantaneous heart rate context)
      norm_pre_rr — pre_rr / local_rr (< 1 → premature → S/V indicator; ≈1 → N/F)

    Returns: np.ndarray of shape (5,), dtype float64
    """
    n = len(r_peaks)
    if n < 2:
        # Not enough peaks to compute RR — return neutral values
        return np.array([1.0, 1.0, 1.0, 1.0, 1.0], dtype=np.float64)

    # Convert all R-peak intervals to seconds
    rr = np.diff(r_peaks.astype(np.float64)) / fs   # shape (n-1,)
    mean_rr = float(rr.mean())

    # pre_rr: RR before current beat (index beat_idx-1 in rr array)
    pre_idx = beat_idx - 1
    pre_rr  = float(rr[pre_idx]) if 0 <= pre_idx < len(rr) else mean_rr

    # post_rr: RR after current beat (index beat_idx in rr array)
    post_rr = float(rr[beat_idx]) if 0 <= beat_idx < len(rr) else mean_rr

    # local_rr: mean over a ±2-beat sliding window (robust estimate of local HR)
    win_s = max(0, beat_idx - 2)
    win_e = min(len(rr), beat_idx + 2)
    local_rr = float(rr[win_s:win_e].mean()) if win_e > win_s else mean_rr

    # Ratios (clipped to avoid extreme values on very noisy signals)
    ratio_rr    = np.clip(pre_rr / (post_rr  + 1e-6), 0.1, 10.0)
    norm_pre_rr = np.clip(pre_rr / (local_rr + 1e-6), 0.1, 10.0)

    return np.array([pre_rr, post_rr, ratio_rr, local_rr, norm_pre_rr], dtype=np.float64)


# ── Beat feature extraction ────────────────────────────────────────────────────

def extract_beat_features(
    signal: np.ndarray,
    r_peaks: np.ndarray,
    fs: int,
) -> np.ndarray:
    """
    Build the full 221-dimensional feature vector for each detected beat.

    Layout: [waveform (216)] + [pre_rr, post_rr, ratio_rr, local_rr, norm_pre_rr (5)]

    Parameters
    ----------
    signal  : filtered 1-D ECG signal
    r_peaks : R-peak sample indices (from detect_r_peaks or annotated ground truth)
    fs      : sampling frequency in Hz

    Returns
    -------
    np.ndarray of shape (n_beats, 221)
    """
    before   = int(BEAT_BEFORE_MS / 1000 * fs)   # 72 at 360 Hz
    after    = int(BEAT_AFTER_MS  / 1000 * fs)   # 144 at 360 Hz
    wave_len = before + after                     # 216

    features: list[np.ndarray] = []

    for i, r in enumerate(r_peaks):
        # ── Waveform segment ────────────────────────────────────────────────
        start = int(r) - before
        end   = int(r) + after

        if start < 0 or end > len(signal):
            waveform = np.zeros(wave_len, dtype=np.float64)
            vs  = max(0, start)
            ve  = min(len(signal), end)
            ss  = vs - start
            waveform[ss: ss + (ve - vs)] = signal[vs:ve]
        else:
            waveform = signal[start:end].astype(np.float64)

        # ── RR-interval features ─────────────────────────────────────────────
        rr_feats = compute_rr_features(r_peaks, i, fs)

        features.append(np.concatenate([waveform, rr_feats]))

    if not features:
        return np.empty((0, FEATURE_DIM), dtype=np.float64)

    return np.stack(features, axis=0)   # (n_beats, 221)


# ── Composite preprocessing call (used by screening_service) ──────────────────

def preprocess_ecg(
    signal: np.ndarray,
    fs: int,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Full ECG preprocessing pipeline:
      1. Bandpass filter   (0.5–40 Hz Butterworth, zero-phase)
      2. R-peak detection  (Pan-Tompkins)
      3. Beat segmentation + feature extraction  → shape (n_beats, 221)

    Returns
    -------
    filtered       : bandpass-filtered signal
    r_peaks        : R-peak sample indices
    feature_matrix : (n_beats, 221) feature matrix ready for model.predict()
    """
    filtered       = bandpass_filter(signal, fs)
    r_peaks        = detect_r_peaks(filtered, fs)
    feature_matrix = extract_beat_features(filtered, r_peaks, fs)

    logger.debug(
        "Preprocessing complete",
        signal_length=len(signal),
        fs=fs,
        n_beats=len(r_peaks),
        feature_dim=feature_matrix.shape[1] if feature_matrix.ndim == 2 else 0,
    )
    return filtered, r_peaks, feature_matrix
