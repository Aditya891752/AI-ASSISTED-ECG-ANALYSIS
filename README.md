# PS-03 — AI-Assisted ECG Screening System

> **Hackathon Project** · Real-time AI classification of ECG heartbeats into clinical AAMI categories using a trained Random Forest model on 87,000+ beats from the MIT-BIH Arrhythmia + PTB Diagnostic databases.

![CI](https://github.com/Aditya891752/AI-ASSISTED-ECG-ANALYSIS/actions/workflows/ci.yml/badge.svg)

---

## 🚀 Quick Demo (2 minutes)

### Windows — double-click to run:
```
demo_start.bat
```
Opens the app at **http://localhost:5173** automatically.

### Any OS — Docker (full stack):
```bash
docker-compose up --build
# Open http://localhost:3000
```

---

## 🫀 What It Does

PS-03 classifies ECG heartbeats into **5 clinical categories** (AAMI EC57 standard):

| Label | Class | Description | Color |
|-------|-------|-------------|-------|
| **N** | Normal | Normal sinus + bundle branch blocks | 🟢 |
| **S** | Supraventricular | Atrial/junctional ectopic beats | 🟡 |
| **V** | Ventricular | PVCs — most dangerous arrhythmia | 🔴 |
| **F** | Fusion | Fusion of normal + ventricular | 🟣 |
| **Q** | Unknown | Paced or unclassifiable | ⚫ |

Plus **MI Detection** from the PTB Diagnostic Database:

| Label | Meaning | Model Accuracy |
|-------|---------|----------------|
| Normal | Healthy sinus rhythm | 97% / AUC 0.9939 |
| Abnormal | Myocardial infarction & cardiac disease | 97% / AUC 0.9939 |

---

## 📊 Model Results

Three production models trained and validated:

| Model | Dataset | Accuracy | Notes |
|-------|---------|----------|-------|
| `model.pkl` | MIT-BIH (49,687 test beats) | **89%** | 221-dim features with RR intervals |
| `model_ptbdb_rf.pkl` | PTB Diagnostic (2,911 beats) | **97%** | 0.9939 ROC-AUC, MI detection |
| `model_combined_rf.pkl` | MIT-BIH + PTB (17,447 beats) | **99%** | 5-class unified model |

**Key improvement:** RR-interval features (pre_rr, post_rr, ratio_rr) boosted **S-class recall from 2% → 20%** — detecting premature atrial beats that are morphologically identical to normal beats but arrive measurably early.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      PS-03 ECG System                           │
│                                                                 │
│  ┌──────────┐   HTTP/WS   ┌──────────────┐   SQL   ┌────────┐  │
│  │  React   │ ──────────► │   FastAPI    │ ──────► │  PG +  │  │
│  │  + Vite  │             │   (async)    │         │ Timesc │  │
│  └──────────┘             └──────┬───────┘         └────────┘  │
│                                  │                              │
│                           ┌──────▼───────┐   Queue  ┌────────┐ │
│                           │    Redis     │ ──────── │ Celery │ │
│                           │  Cache+Queue │          │ Worker │ │
│                           └──────────────┘          └────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

- **FastAPI** — async REST + WebSocket, auto-generated OpenAPI docs
- **React 18 + TypeScript** — dark medical UI, real-time charts (Recharts)
- **RandomForest (scikit-learn)** — 221-dim feature vectors (waveform + RR intervals)
- **TimescaleDB** — time-series optimised PostgreSQL for ECG result history
- **Redis** — SHA-256 signal deduplication cache + Celery task queue
- **Celery** — async batch processing up to 5,000 signals

---

## 🖥️ App Pages

| Page | What you can do |
|------|----------------|
| **Dashboard** | System health, label distribution donut, 24-hour screening timeline |
| **Screen** | Upload CSV/TXT, paste signal, or generate demo — get beat-by-beat analysis |
| **Stream** | Live WebSocket streaming with real-time ECG waveform and beat ticker |
| **Batch** | Upload multiple CSV files, track async job progress, download results |
| **History** | Paginated, filterable log of all past screenings with label breakdown |

---

## ⚡ API Endpoints

```
POST   /api/v1/screen           Single ECG analysis (< 100ms)
WS     /api/v1/stream           Real-time streaming (WebSocket)
POST   /api/v1/screen/batch     Async batch (up to 5,000 signals)
GET    /api/v1/jobs/{id}        Poll batch job status
GET    /api/v1/history          Paginated result history
GET    /api/v1/history/{id}     Single result by UUID
GET    /health                  System health (model/DB/Redis)
GET    /docs                    Swagger UI
```

---

## 🧠 Feature Engineering

Each beat is represented as a **221-dimensional feature vector**:

```
[0:216]  Bandpass-filtered waveform  (200ms pre + 400ms post R-peak @ 360 Hz)
[216]    pre_rr      — interval before this beat  (seconds)
[217]    post_rr     — interval after this beat   (seconds)
[218]    ratio_rr    — pre_rr / post_rr           (< 1 = compensatory pause → V)
[219]    local_rr    — mean RR ±2 beats           (local heart rate context)
[220]    norm_pre_rr — pre_rr / local_rr          (< 1 = premature beat → S/V)
```

Signal preprocessing: 4th-order Butterworth bandpass (0.5–40 Hz) → Pan-Tompkins R-peak detection → beat segmentation → StandardScaler normalization.

---

## 📦 Project Structure

```
ps03-ecg-backend/
├── app/
│   ├── main.py                 # FastAPI factory
│   ├── config.py               # Pydantic-Settings
│   ├── routers/
│   │   ├── screening.py        # POST /screen, /screen/batch
│   │   ├── streaming.py        # WS /stream
│   │   ├── jobs.py             # GET /jobs/{id}
│   │   ├── history.py          # GET /history, /history/{id}
│   │   └── health.py           # GET /health
│   ├── services/
│   │   ├── model_service.py    # .pkl/.pt auto-detect loader
│   │   ├── preprocessing.py    # Bandpass + R-peak + 221-dim features
│   │   ├── screening_service.py
│   │   └── cache_service.py    # Redis SHA-256 dedup
│   ├── workers/
│   │   ├── celery_app.py
│   │   └── tasks.py            # Batch vectorised sub-batching
│   └── db/
│       ├── models.py           # TimescaleDB-ready ORM
│       └── init_db.py
├── frontend/                   # React 18 + TypeScript + Tailwind
│   ├── src/
│   │   ├── pages/              # Dashboard, Screen, Stream, Batch, History
│   │   ├── components/ecg/     # ECGWaveform, BeatTable, LabelDonut, ...
│   │   ├── api/                # Typed axios wrappers
│   │   └── hooks/              # useScreening, useBatchJob, useWebSocket
│   ├── Dockerfile              # Multi-stage Node→nginx
│   └── nginx.conf              # SPA routing + WS proxy
├── model/
│   ├── model.pkl               # MIT-BIH 5-class (89% acc)
│   ├── model_ptbdb_rf.pkl      # PTBDB MI detection (97% acc)
│   └── model_combined_rf.pkl   # Combined 5-class (99% acc)
├── train_model.py              # RF/GB training (--model rf|gb)
├── rebuild_dataset.py          # MIT-BIH → 221-dim .npy rebuild
├── evaluate_ptbdb.py           # PTBDB transfer eval + training
├── demo_start.bat              # 🖱️ Windows one-click demo launcher
├── docker-compose.yml          # Full stack (DB + Redis + API + Frontend)
├── Dockerfile                  # Backend image
└── requirements.txt
```

---

## 🔧 Manual Setup (without Docker)

### Prerequisites
- Python 3.10+ with: `pip install -r requirements.txt`
- Node.js 18+
- PostgreSQL (optional — API works without it, history won't persist)
- Redis (optional — batch jobs + caching)

### Start backend:
```bash
# Windows
set PYTHONPATH=D:\Lib\site-packages;.
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Mac/Linux
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Start frontend:
```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

---

## 🤖 Retrain the Models

```bash
# Rebuild dataset with RR features (needs MIT-BIH binary files)
python rebuild_dataset.py --local-dir path/to/mit-bih/

# Retrain RandomForest
python train_model.py --model rf

# Try GradientBoosting (+5-10% S/F recall, ~10 min)
python train_model.py --model gb

# PTBDB evaluation + training
python evaluate_ptbdb.py --model rf
```

---

## 🏆 Hackathon Demo Script

1. **Launch** — double-click `demo_start.bat`
2. **Dashboard** — show system health, empty charts
3. **Screen page** — click "Generate demo" → "Analyse ECG" → show waveform + beat table
4. **Stream page** — "Start Streaming" → watch live waveform + beat ticker update in real time
5. **History page** — show the result from step 3 appears here with full metadata
6. **API Docs** — open http://localhost:8000/docs for the judges

---

## 📝 Datasets Used

| Dataset | Source | Beats | Use |
|---------|--------|-------|-----|
| MIT-BIH Arrhythmia Database | PhysioNet | 109,496 | 5-class arrhythmia training |
| PTB Diagnostic ECG Database | PhysioNet | 14,552 | MI detection binary classifier |

Both datasets are open-access research datasets from [PhysioNet](https://physionet.org/).

---

## 👥 Team

**PS-03** — Hackathon submission

---

*Built with FastAPI · React · scikit-learn · TimescaleDB · Redis · Docker*
