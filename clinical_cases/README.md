# CardioAI Open Clinical Benchmark Dataset (10-Case Cohort)

This directory houses the standardized 10-patient clinical benchmark dataset for evaluating multi-lead ECG diagnostic algorithms, territorial MI coronary artery localization, and AAMI EC57 arrhythmia classification.

## Benchmark Cohort Summary

| Case # | Identifier | Age / Sex | Primary Diagnosis | Priority Tier | Culprit Vessel / Electrophysiology | Key Lead Signatures |
|--------|------------|-----------|-------------------|---------------|------------------------------------|---------------------|
| 01 | `PT #CF-8042` | 58 M | Acute Anteroseptal STEMI | Tier-1 (Stat) | LAD (Proximal Left Anterior Descending) | Elevated V1–V4; Reciprocal II, III, aVF |
| 02 | `PT #MI-1092` | 64 F | Acute Inferior STEMI | Tier-1 (Stat) | RCA (Right Coronary Artery) | Elevated II, III, aVF; Reciprocal I, aVL |
| 03 | `PT #AF-4410` | 71 M | Rapid Atrial Fibrillation w/ RVR | Tier-2 (Urgent) | Supraventricular Fibrillatory Conduction | Absent P waves, irregular RR, HR 136 |
| 04 | `PT #VE-2104` | 52 M | Frequent Ventricular Trigeminy | Tier-2 (Urgent) | RVOT Ectopic Focus (PVC Burden 18%) | Wide QRS ectopic pairs, discordant ST |
| 05 | `PT #NS-0018` | 29 F | Normal Sinus Rhythm (Physiological) | Tier-3 (Routine) | Normal SA Nodal Conduction | Isoelectric ST, PR 148ms, HR 72 |
| 06 | `PT #LC-3389` | 61 M | Acute Extensive Lateral STEMI | Tier-1 (Stat) | LCx (Left Circumflex Artery - OM1) | Elevated I, aVL, V5, V6; Reciprocal III, aVF |
| 07 | `PT #VT-9912` | 67 M | Sustained Monomorphic VT | Tier-1 (Stat) | Ventricular Ectopic Focus / Re-entry | Wide QRS 168ms, Extreme Northwest Axis, HR 178 |
| 08 | `PT #HB-5511` | 76 F | Complete 3rd-Degree AV Block | Tier-1 (Stat) | AV Nodal Dissociation / Junctional Escape | Dissociated P-waves, Ventricular Rate 34 BPM |
| 09 | `PT #WP-6720` | 24 M | Wolff-Parkinson-White (WPW) | Tier-2 (Urgent) | Left Posterior Kent Bundle (Accessory) | Short PR 96ms, Slurred Delta Wave, QRS 132ms |
| 10 | `PT #BR-1804` | 41 M | Type-1 Brugada Syndrome | Tier-1 (Stat) | SCN5A Cardiac Sodium Channelopathy | Coved ST elevation ≥2.5mm in V1–V2, T-inversion |

## Contributing Cases on GitHub

Clinicians and biomedical researchers can contribute validated cases to this open cohort directly from the CardioAI Clinical Workstation or via GitHub Pull Requests:

1. Validate the 12-lead ECG signal and diagnostic annotations.
2. Export the verified JSON schema file.
3. Open a Pull Request following the `feat(dataset): add clinical case PT #...` schema convention.
