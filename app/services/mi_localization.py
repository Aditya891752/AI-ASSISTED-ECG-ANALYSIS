"""
app/services/mi_localization.py
───────────────────────────────
Territorial Myocardial Infarction (MI) coronary territory localization engine.

Per PRD:
  - Enabled ONLY at 8-lead and 12-lead modes (where precordial spatial information exists).
  - Explicitly flagged UNAVAILABLE below 8-lead mode with clinical rationale.

Coronary Anatomy & Anatomical Lead Groupings:
  • Inferior:        II, III, aVF       (Right Coronary Artery - RCA)
  • Septal:          V1, V2             (LAD - Left Anterior Descending)
  • Anterior:        V3, V4             (LAD - Mid/Distal)
  • Anteroseptal:    V1, V2, V3, V4     (LAD - Proximal)
  • Lateral / Apical: I, aVL, V5, V6    (LCx - Left Circumflex)
  • Extensive Anterior: I, aVL, V1–V6   (Main LAD Occlusion)
"""
from typing import Dict, List, Optional
import numpy as np
import structlog

logger = structlog.get_logger(__name__)

TERRITORIES = {
    "Inferior": ["II", "III", "aVF"],
    "Septal": ["V1", "V2"],
    "Anterior": ["V3", "V4"],
    "Anteroseptal": ["V1", "V2", "V3", "V4"],
    "Lateral": ["I", "aVL", "V5", "V6"],
}

CULPRIT_ARTERIES = {
    "Inferior": "RCA (Right Coronary Artery)",
    "Septal": "LAD (Proximal Left Anterior Descending)",
    "Anterior": "LAD (Mid-to-Distal Left Anterior Descending)",
    "Anteroseptal": "LAD (Proximal Left Anterior Descending)",
    "Lateral": "LCx (Left Circumflex Artery)",
    "Extensive Anterior": "LAD (Left Main / Proximal LAD Occlusion)",
}


def evaluate_mi_localization(
    signals: Dict[str, np.ndarray],
    r_peaks: np.ndarray,
    fs: int,
    lead_mode: str,
) -> Dict:
    """
    Evaluates territorial ST-segment elevation and coronary territory localization.
    
    Args:
        signals: Dictionary of preprocessed/filtered 1D lead signals.
        r_peaks: Sample indices of detected R-peaks.
        fs: Sampling frequency in Hz.
        lead_mode: Active lead mode ('2-lead', '3-lead', '5-lead', '8-lead', '12-lead').
        
    Returns:
        Structured MI localization dictionary.
    """
    if lead_mode in ["2-lead", "3-lead", "5-lead"] or len(signals) < 8:
        return {
            "available": False,
            "status": "UNAVAILABLE_LOW_LEAD_COUNT",
            "reason": (
                f"Territorial MI localization requires complete precordial leads (8-lead or 12-lead input). "
                f"Current mode is {lead_mode} with {len(signals)} active leads."
            ),
            "territory": None,
            "elevation_detected": False,
            "affected_leads": [],
            "culprit_artery": None,
            "max_elevation_mv": 0.0,
            "clinical_summary": f"Spatial localization unavailable at {lead_mode}. Upgrade to 8/12 leads for coronary mapping.",
        }

    if len(r_peaks) == 0:
        return {
            "available": True,
            "status": "INSUFFICIENT_BEATS",
            "reason": "No beats detected to measure ST segment.",
            "territory": "Indeterminate",
            "elevation_detected": False,
            "affected_leads": [],
            "culprit_artery": None,
            "max_elevation_mv": 0.0,
            "clinical_summary": "Indeterminate — insufficient beat morphology detected.",
        }

    # Evaluate ST segment displacement per lead
    # J-point is approximately 60ms to 80ms post R-peak
    st_offset_samples = int(0.080 * fs)
    lead_st_elevations: Dict[str, float] = {}

    for lead_name, sig in signals.items():
        if len(sig) == 0:
            continue
        elevations = []
        for rp in r_peaks:
            st_idx = rp + st_offset_samples
            baseline_idx = max(0, rp - int(0.120 * fs))
            if st_idx < len(sig):
                elev = float(sig[st_idx] - sig[baseline_idx])
                elevations.append(elev)
        if elevations:
            lead_st_elevations[lead_name] = float(np.median(elevations))

    # Identify leads with clinically significant ST elevation (> 0.1 mV / threshold)
    ELEVATION_THRESHOLD = 0.15  # normalized mV
    elevated_leads = [
        lead for lead, elev in lead_st_elevations.items()
        if elev >= ELEVATION_THRESHOLD
    ]

    # Check territories
    detected_territories = []
    for territory, leads in TERRITORIES.items():
        matching = [l for l in leads if l in elevated_leads]
        if len(matching) >= 2 or (territory == "Septal" and len(matching) >= 1):
            detected_territories.append(territory)

    if "Anterior" in detected_territories and "Septal" in detected_territories:
        primary_territory = "Anteroseptal"
    elif "Anteroseptal" in detected_territories and "Lateral" in detected_territories:
        primary_territory = "Extensive Anterior"
    elif detected_territories:
        primary_territory = detected_territories[0]
    else:
        primary_territory = "None Detected"

    culprit = CULPRIT_ARTERIES.get(primary_territory, "No Coronary Occlusion Identified")
    max_elev = max([abs(v) for v in lead_st_elevations.values()], default=0.0)

    is_elevated = len(elevated_leads) > 0 and primary_territory != "None Detected"

    if is_elevated:
        summary = f"STEMI Alert: {primary_territory} ST-elevation pattern detected across {', '.join(elevated_leads)}. Suspected {culprit} involvement."
    else:
        summary = f"No territorial ST-elevation pattern detected across {len(signals)} leads (max deviation {max_elev:.2f} mV)."

    return {
        "available": True,
        "status": "EVALUATED",
        "territory": primary_territory,
        "elevation_detected": is_elevated,
        "affected_leads": elevated_leads,
        "culprit_artery": culprit if is_elevated else None,
        "max_elevation_mv": round(max_elev, 3),
        "clinical_summary": summary,
    }
