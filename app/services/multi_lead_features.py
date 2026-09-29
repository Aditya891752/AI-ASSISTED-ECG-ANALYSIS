"""
app/services/multi_lead_features.py
───────────────────────────────────
Multi-lead ECG feature engineering with lead-masking support.

Features:
  1. Synchronized R-peak detection on reference lead (Lead II default, fallback to Lead I).
  2. Canonical 12-lead windowing (216 samples per lead: 72 pre-R + 144 post-R).
  3. Lead presence mask: 12-D binary indicator vector [m_I, m_II, ..., m_V6].
  4. Zero-filling for absent/unmeasured channels.
  5. Dual representation:
     - primary_lead_vector: 221-D (216 samples + 5 RR features) for RF baseline compatibility.
     - multi_lead_tensor: (12, 216) waveform matrix + (12,) mask + (5,) RR timing features.
     - unified_masked_vector: 2609-D (12 * 216 + 12 + 5) lead-agnostic representation.
"""
from typing import Dict, List, Optional, Tuple
import numpy as np
import structlog

from app.services.lead_derivation import CANONICAL_12_LEADS
from app.services.preprocessing import (
    BEAT_BEFORE_MS,
    BEAT_AFTER_MS,
    WAVEFORM_DIM,
    RR_DIM,
    FEATURE_DIM,
    bandpass_filter,
    detect_r_peaks,
    compute_rr_features,
)

logger = structlog.get_logger(__name__)


def select_reference_lead(available_leads: List[str]) -> str:
    """Selects the best reference lead for synchronized R-peak detection."""
    if "II" in available_leads:
        return "II"
    if "I" in available_leads:
        return "I"
    if "V1" in available_leads:
        return "V1"
    return available_leads[0] if available_leads else "II"


def extract_multi_lead_beat_features(
    filtered_signals: Dict[str, np.ndarray],
    r_peaks: np.ndarray,
    fs: int,
    ref_lead: str = "II",
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Extracts multi-channel beat waveforms, presence masks, and timing features.
    
    Args:
        filtered_signals: Dict of bandpass-filtered signals for each active/derived lead.
        r_peaks: 1D array of detected R-peak sample indices from reference lead.
        fs: Sampling rate in Hz.
        ref_lead: Name of the reference lead used for R-peak detection.
        
    Returns:
        tuple:
          - primary_features: (N_beats, 221) legacy reference-lead feature matrix
          - multi_lead_waveforms: (N_beats, 12, 216) multi-channel beat tensors
          - presence_mask: (12,) binary mask of canonical lead availability
          - rr_features: (N_beats, 5) timing feature matrix
    """
    n_beats = len(r_peaks)
    if n_beats == 0:
        return (
            np.empty((0, FEATURE_DIM), dtype=np.float64),
            np.empty((0, 12, WAVEFORM_DIM), dtype=np.float64),
            np.zeros(12, dtype=np.float64),
            np.empty((0, RR_DIM), dtype=np.float64),
        )

    before_samples = int(BEAT_BEFORE_MS / 1000.0 * fs)
    after_samples = int(BEAT_AFTER_MS / 1000.0 * fs)
    expected_samples = before_samples + after_samples

    # Compute presence mask for canonical 12 leads
    presence_mask = np.zeros(12, dtype=np.float64)
    for idx, lead_name in enumerate(CANONICAL_12_LEADS):
        if lead_name in filtered_signals and len(filtered_signals[lead_name]) > 0:
            presence_mask[idx] = 1.0

    # 1. Global RR timing features from reference lead
    rr_matrix = np.array(
        [compute_rr_features(r_peaks, i, fs) for i in range(n_beats)],
        dtype=np.float64,
    )


    # 2. Multi-channel beat waveforms (N_beats, 12, 216)
    multi_waveforms = np.zeros((n_beats, 12, WAVEFORM_DIM), dtype=np.float64)

    for lead_idx, lead_name in enumerate(CANONICAL_12_LEADS):
        if presence_mask[lead_idx] == 0.0:
            continue

        sig = filtered_signals[lead_name]
        sig_len = len(sig)

        for b_idx, rp in enumerate(r_peaks):
            start = rp - before_samples
            end = rp + after_samples

            # Slice with edge padding
            if start >= 0 and end <= sig_len:
                segment = sig[start:end]
            else:
                pad_left = max(0, -start)
                pad_right = max(0, end - sig_len)
                valid_start = max(0, start)
                valid_end = min(sig_len, end)
                segment = np.pad(sig[valid_start:valid_end], (pad_left, pad_right), mode="edge")

            # Resample or truncate to exactly WAVEFORM_DIM (216)
            if len(segment) != WAVEFORM_DIM:
                segment = np.interp(
                    np.linspace(0, 1, WAVEFORM_DIM),
                    np.linspace(0, 1, len(segment)),
                    segment,
                )

            # Baseline subtraction (zero mean in pre-R window)
            baseline = np.mean(segment[:before_samples]) if before_samples > 0 else 0.0
            multi_waveforms[b_idx, lead_idx, :] = segment - baseline

    # 3. Primary reference lead 221-D feature matrix
    ref_idx = CANONICAL_12_LEADS.index(ref_lead) if ref_lead in CANONICAL_12_LEADS else 1
    if presence_mask[ref_idx] == 0.0:
        # Fallback to first available lead index
        active_indices = np.where(presence_mask == 1.0)[0]
        ref_idx = int(active_indices[0]) if len(active_indices) > 0 else 1

    primary_waveforms = multi_waveforms[:, ref_idx, :]  # (N_beats, 216)
    primary_features = np.hstack([primary_waveforms, rr_matrix])  # (N_beats, 221)

    return primary_features, multi_waveforms, presence_mask, rr_matrix
