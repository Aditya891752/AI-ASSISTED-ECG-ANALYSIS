# Tech Stack Document
## BIOFORGE: CardioAI — Variable Lead ECG Support (2–12 Leads)

**Version:** 1.0  
**Stack Status:** Extended on `feature/v2-redesign` branch

---

### 1. Existing System Stack (Retained & Hardened)

#### Backend
- **FastAPI (Python 3.11 / 3.14):** Async REST endpoints, OpenAPI/Swagger 3.0 autodocs, Pydantic v2 schemas.
- **Uvicorn:** ASGI web server supporting dynamic `$PORT` for Docker and cloud PaaS (Render).
- **PostgreSQL + TimescaleDB:** Time-series hypertable for historical ECG records and multi-lead metadata.
- **Redis + Celery:** Distributed background task queue, SHA-256 signal deduplication cache.
- **Docker + Multi-Stage Dockerfile:** Lightweight production container image with non-root security.

#### Frontend
- **React 18 + Vite:** Modern single-page application with fast HMR.
- **Tailwind CSS:** Medical clinical workstation design, authentic 25mm/s grid paper, oscilloscope glow waveforms.
- **Recharts & HTML5 Canvas:** High-frequency waveform rendering and biometric telemetry.
- **Lucide Icons:** Clean medical icon system.

#### ML
- **scikit-learn (Random Forest):** Fast baseline ensemble classifier with 221-D feature vectors.
- **PyTorch:** Multi-channel 1D-CNN architecture supporting variable channel input tensors.

---

### 2. New & Extended Architecture for 2–12 Lead Variable Pipeline

| Layer | Component | Implementation Details |
| :--- | :--- | :--- |
| **Data Ingestion** | PTB-XL & PTB Diagnostic Loaders | Native 12-lead signal ingestion supporting standard WFDB format and NumPy multi-channel arrays. |
| **Signal Processing** | Derived-Lead Calculator | Computes missing augmented limb leads using **Einthoven's Law** ($\text{III} = \text{II} - \text{I}$) and **Goldberger's Equations** ($\text{aVR}, \text{aVL}, \text{aVF}$). |
| **Feature Engineering** | Lead-Masking & Standardization | Standardizes to canonical 12-lead order: `[I, II, III, aVR, aVL, aVF, V1, V2, V3, V4, V5, V6]`. Absent channels are zero-filled, complemented by a 12-D binary mask tensor. |
| **Model Ingestion** | Lead-Dropout Training & Inference | Model trained with stochastic lead masking to perform robust inference regardless of whether 2, 3, 5, 8, or 12 channels are provided. |
| **API Endpoints** | Unified `/api/v1/screen` | Single endpoint accepts optional `lead_mode` (`"2-lead" \| "3-lead" \| "5-lead" \| "8-lead" \| "12-lead"`) and multi-channel signals (`{"II": [...], "V1": [...]}`). |
| **UI Components** | Lead Mode Selector | Clinical segmented toggle (2 / 3 / 5 / 8 / 12 leads) with interactive channel indicators and upload slots. |
| **Visualization** | Accuracy-vs-Lead-Count Chart | Recharts interactive curve highlighting empirical accuracy tradeoffs (87% ➔ 93% ➔ 97% ➔ 99%) and active tier. |
| **Clinical Intelligence** | MI Territorial Localization | Coronary artery territory localization (Anterior, Inferior, Lateral) activated automatically when $\ge 8$ leads are present. |

---

### 3. Canonical 12-Lead Definition

```python
CANONICAL_12_LEADS = [
    "I", "II", "III",        # Standard Limb Leads
    "aVR", "aVL", "aVF",    # Augmented Limb Leads
    "V1", "V2", "V3",        # Precordial (Septal / Anterior)
    "V4", "V5", "V6"         # Precordial (Apical / Lateral)
]

LEAD_MODES = {
    "2-lead":  ["II", "V1"],
    "3-lead":  ["I", "II", "III"],
    "5-lead":  ["I", "II", "III", "aVF", "V1"],
    "8-lead":  ["I", "II", "V1", "V2", "V3", "V4", "V5", "V6"],
    "12-lead": CANONICAL_12_LEADS,
}
```
