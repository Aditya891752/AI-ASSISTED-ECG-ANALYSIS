"""
Unit tests for variable 2–12 lead ECG processing pipeline:
  • Einthoven & Goldberger derived lead equations
  • Mode resolution and auto-fallback hierarchy
  • Lead presence masking and multi-channel feature shapes
  • Lead-calibrated confidence scores
  • Territorial MI localization rules
"""
import numpy as np
import pytest

from app.schemas.ecg import ScreeningRequest, ScreeningResult
from app.services.lead_confidence import (
    calibrate_confidence_by_lead_mode,
    get_lead_mode_metadata,
)
from app.services.lead_derivation import (
    CANONICAL_12_LEADS,
    compute_derived_leads,
    normalize_lead_name,
    resolve_lead_mode,
)
from app.services.mi_localization import evaluate_mi_localization
from app.services.multi_lead_features import (
    extract_multi_lead_beat_features,
    select_reference_lead,
)


def test_normalize_lead_names():
    assert normalize_lead_name("lead2") == "II"
    assert normalize_lead_name("1") == "I"
    assert normalize_lead_name("avr") == "aVR"
    assert normalize_lead_name("AVF") == "aVF"
    assert normalize_lead_name("v3") == "V3"


def test_einthoven_and_goldberger_derivation():
    # Synthetic signals for I and II
    n_samples = 500
    lead_I = np.sin(np.linspace(0, 10, n_samples))
    lead_II = 2.0 * np.sin(np.linspace(0, 10, n_samples))

    raw_signals = {"I": lead_I, "II": lead_II}
    expanded, derived = compute_derived_leads(raw_signals)

    # All 4 limb leads should be derived
    assert "III" in derived
    assert "aVR" in derived
    assert "aVL" in derived
    assert "aVF" in derived

    # 1. Einthoven's Law: III = II - I
    np.testing.assert_allclose(expanded["III"], lead_II - lead_I, atol=1e-7)

    # 2. Goldberger: aVR = -(I + II) / 2
    np.testing.assert_allclose(expanded["aVR"], -0.5 * (lead_I + lead_II), atol=1e-7)

    # 3. Goldberger: aVL = I - (II / 2)
    np.testing.assert_allclose(expanded["aVL"], lead_I - (0.5 * lead_II), atol=1e-7)

    # 4. Goldberger: aVF = II - (I / 2)
    np.testing.assert_allclose(expanded["aVF"], lead_II - (0.5 * lead_I), atol=1e-7)


def test_lead_mode_resolution_hierarchy():
    # 2-lead minimum
    mode, leads = resolve_lead_mode({"II", "V1"}, "auto")
    assert mode == "2-lead"

    # 3-lead
    mode, leads = resolve_lead_mode({"I", "II", "III"}, "auto")
    assert mode == "3-lead"

    # 5-lead
    mode, leads = resolve_lead_mode({"I", "II", "III", "aVF", "V1"}, "auto")
    assert mode == "5-lead"

    # 8-lead
    eight_leads = {"I", "II", "V1", "V2", "V3", "V4", "V5", "V6"}
    mode, leads = resolve_lead_mode(eight_leads, "auto")
    assert mode == "8-lead"

    # 12-lead (with derived)
    twelve_leads = set(CANONICAL_12_LEADS)
    mode, leads = resolve_lead_mode(twelve_leads, "12-lead")
    assert mode == "12-lead"
    assert len(leads) == 12

    # Incomplete requested mode falls back safely
    mode_fallback, _ = resolve_lead_mode({"II", "V1"}, "12-lead")
    assert mode_fallback == "2-lead"


def test_multi_lead_feature_extraction_and_masking():
    n_samples = 1000
    fs = 360
    # Simulate Lead II with clear R-peaks
    t = np.arange(n_samples) / fs
    sig_II = np.sin(2 * np.pi * 1.2 * t)
    # Inject R-peaks at sample 200, 500, 800
    r_peaks = np.array([200, 500, 800], dtype=np.int64)

    filtered = {
        "II": sig_II,
        "V1": np.zeros(n_samples),
    }

    primary_feats, multi_waveforms, mask, rr_matrix = extract_multi_lead_beat_features(
        filtered_signals=filtered,
        r_peaks=r_peaks,
        fs=fs,
        ref_lead="II",
    )

    # 3 beats detected
    assert primary_feats.shape == (3, 221)  # 216 waveform + 5 RR
    assert multi_waveforms.shape == (3, 12, 216)
    assert mask.shape == (12,)
    assert rr_matrix.shape == (3, 5)

    # Lead II is index 1 in CANONICAL_12_LEADS, V1 is index 6
    assert mask[1] == 1.0  # II present
    assert mask[6] == 1.0  # V1 present
    assert mask[0] == 0.0  # I absent -> masked with 0


def test_mi_localization_rules():
    n_samples = 1000
    fs = 360
    r_peaks = np.array([200, 500, 800])

    # Case A: < 8 leads -> Must be unavailable
    signals_2lead = {"II": np.zeros(n_samples), "V1": np.zeros(n_samples)}
    res_2lead = evaluate_mi_localization(signals_2lead, r_peaks, fs, "2-lead")
    assert res_2lead["available"] is False
    assert res_2lead["status"] == "UNAVAILABLE_LOW_LEAD_COUNT"

    # Case B: 12 leads present -> Evaluated
    signals_12lead = {lead: np.zeros(n_samples) for lead in CANONICAL_12_LEADS}
    res_12lead = evaluate_mi_localization(signals_12lead, r_peaks, fs, "12-lead")
    assert res_12lead["available"] is True
    assert res_12lead["status"] == "EVALUATED"


def test_lead_confidence_calibration():
    raw_conf = 0.95
    conf_2lead = calibrate_confidence_by_lead_mode(raw_conf, "2-lead")
    conf_12lead = calibrate_confidence_by_lead_mode(raw_conf, "12-lead")

    assert conf_2lead < conf_12lead
    assert conf_12lead == raw_conf
    assert conf_2lead == round(0.95 * 0.92, 4)


def test_screening_request_validation():
    # 1. Backward-compatible single lead
    req1 = ScreeningRequest(signal=[0.05] * 400, sample_rate=360)
    assert req1.signal is not None
    assert req1.lead_mode == "auto"

    # 2. Multi-lead dictionary
    req2 = ScreeningRequest(
        signals={"I": [0.1] * 400, "II": [0.2] * 400, "V1": [0.05] * 400},
        lead_mode="3-lead",
        sample_rate=360,
    )
    assert req2.signals is not None
    assert len(req2.signals) == 3
    assert req2.lead_mode == "3-lead"

    # 3. Missing both signal and signals should fail
    with pytest.raises(ValueError):
        ScreeningRequest(sample_rate=360)


if __name__ == "__main__":
    test_normalize_lead_names()
    test_einthoven_and_goldberger_derivation()
    test_lead_mode_resolution_hierarchy()
    test_multi_lead_feature_extraction_and_masking()
    test_mi_localization_rules()
    test_lead_confidence_calibration()
    test_screening_request_validation()
    print("All variable-lead unit tests passed successfully!")
