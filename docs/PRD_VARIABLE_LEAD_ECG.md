# Product Requirements Document
## BIOFORGE: CardioAI — Variable Lead ECG Input (2–12 Lead Support)

**Version:** 1.0  
**Owner:** Team BIOFORGE  
**Event:** HEALTHNOVA 2026, IEEE EMBS Innovation Challenge  
**Branch:** `feature/v2-redesign`

---

### 1. Background

BIOFORGE currently uses a 2-lead input (Lead II + Lead V1 style) with a 221-D feature vector (216 waveform samples + 5 RR-interval timing features) feeding a Random Forest ensemble. 

**Limitations:**
- Lack of spatial/electrical axis information (cannot estimate mean electrical axis or resolve complex VT vs SVT with aberrancy).
- Inability to localize Myocardial Infarction (MI) coronary territory (anterior, inferior, lateral).
- Hardware lock-in: Fixed to one tier regardless of whether a clinic has a 2-lead patch, a 3/5-lead transport monitor, or an 8/12-lead diagnostic cart.

---

### 2. Problem Statement

Primary Healthcare Centers (PHCs), rural camps, ambulances, and ICUs possess drastically different ECG acquisition equipment. An AI diagnostic system fixed strictly at 2 leads either under-serves high-resource tertiary facilities or fails where those specific 2 channels are unavailable. BIOFORGE requires **one unified pipeline and one deployable model architecture** that scales dynamically from 2 up to 12 leads.

---

### 3. Goals

- **G1:** Accept 2 to 12 lead input through **one unified pipeline** and **one deployable model**.
- **G2:** Let users explicitly select lead configuration at ingestion time with auto-fallback to the highest supported mode if fewer physical channels are provided.
- **G3:** Quantify and expose the **accuracy-versus-lead-count tradeoff** transparently to clinicians.
- **G4:** Preserve real-time inference latency targets (**< 80 ms end-to-end**) across all lead counts.
- **G5:** Maintain low-cost hardware accessibility without requiring an expensive \$5,000+ hospital ECG cart.

---

### 4. Non-Goals

- Not a certified regulatory-cleared diagnostic device — operates as an assistive screening and triage tool.
- Not building proprietary 12-lead hardware from scratch — utilizes AD8232 / MAX30001 front-ends + mathematical lead derivation.
- Sub-2-lead single-wearable screening remains deferred to Phase 2.

---

### 5. Target Users

1. **Paramedics & Emergency Medical Responders (Ambulance):** Typically operate 3-lead or 5-lead telemetry units.
2. **PHC & Rural Clinic Health Workers:** Operate low-cost 2-lead or 3-lead handheld screening modules.
3. **ICU & Telemetry Nurses:** Monitor 5-lead or 8-lead continuous bedside streams.
4. **Physicians & Cardiologists:** Require full 12-lead diagnostic context and need to know the exact lead count and derived status backing any AI classification.

---

### 6. Functional Requirements

#### 6.1 Lead Modes Hierarchy

| Mode | Active Leads | Clinical Capability & Notes |
| :--- | :--- | :--- |
| **2-lead** | `II`, `V1` | Current baseline; rural PHC triage & rhythm screening |
| **3-lead** | `I`, `II`, `III` | Enables mean electrical axis determination (Einthoven limb leads) |
| **5-lead** | `I`, `II`, `III`, `aVF`, `V1` | Limb leads + precordial; ambulatory/Holter monitoring standard |
| **8-lead** | `I`, `II`, `V1`, `V2`, `V3`, `V4`, `V5`, `V6` | Independently measured minimum; MI localization enabled |
| **12-lead** | Full standard 12 leads | Hospital standard; augmented limb leads (`III`, `aVR`, `aVL`, `aVF`) derived via Einthoven's/Goldberger's laws if not directly sensed |

#### 6.2 Input & Selection
- Single endpoint parameter: `leads: list[str]` and/or `lead_mode: str`.
- Multi-lead dictionary input (`signals: {"II": [...], "V1": [...]}`) or multi-channel matrix.
- Backward compatibility: 1D `signal` input automatically maps to Lead II (2-lead baseline mode).
- Auto-fallback: Gracefully degrades to the highest supported mode if channels are missing.

#### 6.3 Derived Leads & Mathematical Engine
When leads `I` and `II` are sensed, missing augmented limb leads are computed mathematically:
- **Lead III:** $\text{III} = \text{II} - \text{I}$ *(Einthoven's Law)*
- **Lead aVR:** $\text{aVR} = -(\text{I} + \text{II}) / 2$
- **Lead aVL:** $\text{aVL} = \text{I} - (\text{II} / 2) = (\text{I} - \text{III}) / 2$
- **Lead aVF:** $\text{aVF} = \text{II} - (\text{I} / 2) = (\text{II} + \text{III}) / 2$

#### 6.4 Feature Extraction & Masking
- **Reference Lead:** R-peak detection is always synchronized on Lead `II` (highest R-wave amplitude and signal-to-noise ratio).
- **Canonical Ordering:** `["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"]`.
- **Lead Masking:** Missing/absent leads are zero-filled, and an explicit 12-bit presence mask vector $\mathbf{m} \in \{0, 1\}^{12}$ is concatenated with the feature representation.
- **Lead-Dropout Training:** Models are trained with random channel masking to ensure uniform performance across any subset of leads.

#### 6.5 Output & Clinical Reporting
- Every prediction tags `lead_mode_used`, `leads_analyzed`, and `derived_leads`.
- Confidence scores scale dynamically with lead count (calibrated uncertainty).
- **MI Localization:** Flagged available only for $\ge 8$ leads (Anterior: V1–V4, Lateral: I, aVL, V5, V6, Inferior: II, III, aVF). Below 8 leads, localization is marked `UNAVAILABLE_LOW_LEAD_COUNT`.

---

### 7. Non-Functional Requirements

- **Inference Latency:** $< 80\text{ ms}$ total pipeline latency for 12 leads.
- **Backward Compatibility:** Zero breaking changes to existing 2-lead endpoints.
- **Validation Discipline:** Zero patient leakage via patient-stratified cross-validation.

---

### 8. Target Accuracy Benchmarks

| Configuration | Target Accuracy | Primary Diagnostic Scope |
| :--- | :--- | :--- |
| **2-Lead** | ~87% – 89% | Core rhythm screening, ventricular ectopic detection |
| **3-Lead** | ~90% – 91% | Frontal plane axis deviation & bundle branch patterns |
| **5-Lead** | ~93% – 94% | Ambulatory Holter monitoring, chamber enlargement |
| **8-Lead** | ~96% – 97% | Complete independent lead set, MI territorial localization |
| **12-Lead** | ~98% – 99% | Comprehensive diagnostic grade, multi-focal arrhythmias |
