"""
mitbih_reader.py
─────────────────
Self-contained MIT-BIH binary format reader.
Reads .dat (12-bit signal), .hea (header), and .atr (annotation) files
WITHOUT requiring the wfdb package.

Used by rebuild_dataset.py as a fallback when wfdb is not available.
"""
from __future__ import annotations

import os
import struct
import numpy as np


# MIT-BIH annotation symbol table (AHA/AAMI codes)
# Maps annotation byte code → symbol string
_MIT_ANNOTATION_CODES = {
    1: "N",   # Normal beat
    2: "L",   # Left bundle branch block
    3: "R",   # Right bundle branch block
    4: "A",   # Atrial premature beat
    5: "a",   # Aberrated atrial premature beat
    6: "J",   # Nodal (junctional) premature beat
    7: "S",   # Supraventricular premature beat
    8: "V",   # Premature ventricular contraction
    9: "F",   # Fusion of ventricular and normal beat
    10: "?",  # Unclassified
    11: "!",  # Ventricular flutter wave
    12: "e",  # Atrial escape beat
    13: "j",  # Nodal (junctional) escape beat
    14: "E",  # Ventricular escape beat
    15: "/",  # Paced beat
    16: "f",  # Fusion of paced and normal beat
    17: "Q",  # Unclassified beat
    18: "?",  # Unclassified
    25: "+",  # Rhythm change (not a beat)
    26: "(",  # Waveform onset (not a beat)
    27: ")",  # Waveform end (not a beat)
    28: "p",  # Peak of P-wave
    29: "t",  # Peak of T-wave
    30: "u",  # Peak of U-wave
    38: "~",  # Signal quality change
    40: "|",  # Isolated QRS-like artifact
    41: "s",  # ST change
    42: "T",  # T-wave change
    43: "*",  # Systole
    44: "D",  # Diastole
    48: "=",  # Measurement annotation
    59: "\"", # Comment annotation
}


def read_header(hea_path: str) -> dict:
    """Parse a .hea header file. Returns dict with fs, n_samples, n_signals, gain, baseline."""
    with open(hea_path) as f:
        lines = [l.strip() for l in f if l.strip() and not l.startswith("#")]

    # Line 0: record info
    # Format: record_name n_signals fs n_samples
    parts = lines[0].split()
    n_signals  = int(parts[1])
    fs         = int(parts[2]) if len(parts) > 2 else 360
    n_samples  = int(parts[3]) if len(parts) > 3 else 0

    # Line 1..n_signals: signal info
    # Format: filename fmt gain baseline units
    gain     = 200.0  # default mV per ADU
    baseline = 0
    if len(lines) > 1:
        sig_parts = lines[1].split()
        if len(sig_parts) > 2:
            try:
                gain = float(sig_parts[2].split("/")[0])
            except (ValueError, IndexError):
                gain = 200.0
        if len(sig_parts) > 3:
            try:
                baseline = int(sig_parts[3])
            except ValueError:
                baseline = 0

    return {
        "fs": fs,
        "n_samples": n_samples,
        "n_signals": n_signals,
        "gain": gain,
        "baseline": baseline,
    }


def read_signal_212(dat_path: str, n_samples: int, n_signals: int = 2) -> np.ndarray:
    """
    Read MIT-BIH 212-format signal (12-bit, 2 samples packed per 3 bytes).
    Returns array of shape (n_samples, n_signals) as float64.
    """
    raw = np.frombuffer(open(dat_path, "rb").read(), dtype=np.uint8)

    # Each group of 3 bytes = 2 × 12-bit samples
    n_groups = len(raw) // 3
    samples  = np.zeros((n_groups * 2, n_signals), dtype=np.int16)

    for i in range(n_groups):
        b0, b1, b2 = int(raw[i * 3]), int(raw[i * 3 + 1]), int(raw[i * 3 + 2])
        # First sample: b0 | low nibble of b1 (bits 0-3)
        s1 = (b0 | ((b1 & 0x0F) << 8))
        if s1 >= 2048:
            s1 -= 4096          # sign extend 12-bit

        # Second sample: b2 shifted | high nibble of b1 (bits 4-7)
        s2 = (b2 << 4) | ((b1 & 0xF0) >> 4)
        if s2 >= 2048:
            s2 -= 4096

        samples[i * 2,     0] = s1
        samples[i * 2 + 1, 0] = s2

    # Trim to actual n_samples if known
    if n_samples > 0:
        samples = samples[:n_samples]

    return samples.astype(np.float64)


def read_annotations(atr_path: str) -> tuple[np.ndarray, list[str]]:
    """
    Parse MIT-BIH .atr annotation file.
    Returns (sample_indices, symbols).
    """
    raw = np.frombuffer(open(atr_path, "rb").read(), dtype=np.uint8)

    samples: list[int] = []
    symbols: list[str] = []

    i = 0
    current_sample = 0

    while i < len(raw) - 1:
        word = int(raw[i]) | (int(raw[i + 1]) << 8)
        i += 2

        annotation_type = (word >> 10) & 0x3F
        time_delta      = word & 0x3FF

        if annotation_type == 0 and time_delta == 0:
            break   # end-of-file marker

        if annotation_type == 59:   # SKIP — 4-byte long time increment
            if i + 3 < len(raw):
                next_word = int(raw[i]) | (int(raw[i+1]) << 8) | \
                            (int(raw[i+2]) << 16) | (int(raw[i+3]) << 24)
                current_sample += next_word
                i += 4
            continue

        if annotation_type == 60:   # NOTE — skip aux string
            n_chars = time_delta
            i += n_chars + (n_chars % 2)   # padded to even bytes
            continue

        if annotation_type == 61:   # SUB_TYPE
            continue
        if annotation_type == 62:   # CHAN
            continue
        if annotation_type == 63:   # NUM
            continue

        current_sample += time_delta
        symbol = _MIT_ANNOTATION_CODES.get(annotation_type, "?")
        samples.append(current_sample)
        symbols.append(symbol)

    return np.array(samples, dtype=np.int64), symbols


def load_record(record_name: str, local_dir: str) -> tuple:
    """
    Load a MIT-BIH record from local directory.
    Returns (signal_lead_0, fs, r_peak_samples, r_peak_symbols).
    """
    base = os.path.join(local_dir, record_name)
    hea  = base + ".hea"
    dat  = base + ".dat"
    atr  = base + ".atr"

    for path in (hea, dat, atr):
        if not os.path.exists(path):
            raise FileNotFoundError(f"Missing: {path}")

    header    = read_header(hea)
    raw_signal = read_signal_212(dat, header["n_samples"], header["n_signals"])

    # Lead 0 (MLII), convert ADU → mV
    gain     = header["gain"]
    baseline = header["baseline"]
    signal   = (raw_signal[:, 0] - baseline) / gain

    r_samples, r_symbols = read_annotations(atr)

    return signal, header["fs"], r_samples, r_symbols
