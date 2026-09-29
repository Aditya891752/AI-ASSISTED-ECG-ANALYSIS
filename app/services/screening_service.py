"""
app/services/screening_service.py
──────────────────────────────────
Core orchestration layer for single-shot & multi-lead (2–12 lead) ECG screening.

Flow:
  1. Parse & normalize input (single lead or multi-lead dictionary).
  2. Compute derived leads via Einthoven's Law & Goldberger's equations.
  3. Resolve lead mode (2/3/5/8/12-lead) with auto-fallback.
  4. Check Redis cache (SHA-256 matched).
  5. Multi-lead bandpass filter + synchronized reference R-peak detection.
  6. Extract multi-lead beat features with lead presence masking.
  7. Run batched model inference.
  8. Calibrate confidence scores based on lead count uncertainty.
  9. Evaluate territorial MI localization (enabled for >= 8 leads).
  10. Persist to DB + Cache in Redis + Record in history.
"""
import asyncio
import datetime
import time
import uuid
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional

import numpy as np
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ScreeningResult as ScreeningResultModel
from app.schemas.ecg import (
    AAMILabel,
    BeatClassification,
    ScreeningRequest,
    ScreeningResult,
    SignalRecord,
)
from app.services import cache_service
from app.services.lead_confidence import (
    calibrate_confidence_by_lead_mode,
    get_lead_mode_metadata,
)
from app.services.lead_derivation import (
    compute_derived_leads,
    normalize_lead_name,
    resolve_lead_mode,
)
from app.services.mi_localization import evaluate_mi_localization
from app.services.model_service import ModelService
from app.services.multi_lead_features import (
    extract_multi_lead_beat_features,
    select_reference_lead,
)
from app.services.preprocessing import bandpass_filter, detect_r_peaks
from app.utils.metrics import (
    ABNORMAL_BEATS,
    BEATS_CLASSIFIED,
    PREPROCESSING_LATENCY,
)

logger = structlog.get_logger(__name__)

_PREPROCESS_EXECUTOR = ThreadPoolExecutor(
    max_workers=4,
    thread_name_prefix="ecg-preproc",
)


async def screen_single(
    request: ScreeningRequest,
    model_service: ModelService,
    db: AsyncSession,
) -> ScreeningResult:
    """
    Screen a single or multi-lead ECG signal end-to-end (2–12 lead support).
    Returns a fully validated ScreeningResult schema.
    """
    # ── 0. Parse & Normalize Input Signals ────────────────────────────────────
    raw_signals: Dict[str, np.ndarray] = {}
    if request.signals:
        for k, v in request.signals.items():
            raw_signals[normalize_lead_name(k)] = np.asarray(v, dtype=np.float64)
    elif request.signal:
        raw_signals["II"] = np.asarray(request.signal, dtype=np.float64)
    else:
        raise ValueError("Either 'signal' or 'signals' must be provided")

    primary_len = len(next(iter(raw_signals.values())))
    signal_hash = cache_service.hash_signal(request.signals if request.signals else request.signal)

    # ── 1. Cache lookup ────────────────────────────────────────────────────────
    if cached := await cache_service.get_cached_result(signal_hash):
        logger.debug("Cache hit for signal", hash=signal_hash)
        return ScreeningResult(**cached)

    # ── 2. Mathematical Lead Derivation & Mode Resolution ─────────────────────
    expanded_signals, derived_leads = compute_derived_leads(raw_signals)
    active_mode, required_leads = resolve_lead_mode(set(expanded_signals.keys()), request.lead_mode)

    # ── 3. Preprocessing & Multi-Lead Feature Extraction ──────────────────────
    t0 = time.perf_counter()
    loop = asyncio.get_running_loop()

    def _sync_process():
        filtered_sigs = {
            k: bandpass_filter(v, request.sample_rate)
            for k, v in expanded_signals.items()
        }
        ref_lead = select_reference_lead(list(filtered_sigs.keys()))
        r_peaks = detect_r_peaks(filtered_sigs[ref_lead], request.sample_rate)
        primary_feats, multi_waveforms, mask, rr_feats = extract_multi_lead_beat_features(
            filtered_signals=filtered_sigs,
            r_peaks=r_peaks,
            fs=request.sample_rate,
            ref_lead=ref_lead,
        )
        return filtered_sigs, r_peaks, primary_feats, ref_lead

    filtered_sigs, r_peaks, feature_matrix, ref_lead = await loop.run_in_executor(
        _PREPROCESS_EXECUTOR,
        _sync_process,
    )
    preprocessing_ms = (time.perf_counter() - t0) * 1000
    PREPROCESSING_LATENCY.observe(preprocessing_ms / 1000)

    # MI territorial localization
    mi_analysis = evaluate_mi_localization(
        signals=filtered_sigs,
        r_peaks=r_peaks,
        fs=request.sample_rate,
        lead_mode=active_mode,
    )

    lead_meta = get_lead_mode_metadata(
        lead_mode=active_mode,
        leads_analyzed=list(expanded_signals.keys()),
        derived_leads=derived_leads,
    )

    if feature_matrix.shape[0] == 0:
        return _build_result(
            request=request,
            r_peaks=np.array([], dtype=np.int64),
            labels=[],
            confidences=[],
            proba_dicts=[],
            preprocessing_ms=preprocessing_ms,
            inference_ms=0.0,
            db=db,
            persist=False,
            primary_len=primary_len,
            lead_mode=active_mode,
            lead_meta=lead_meta,
            mi_analysis=mi_analysis,
        )

    # ── 4. Batched inference ───────────────────────────────────────────────────
    t1 = time.perf_counter()
    labels, raw_confidences, proba_dicts = await model_service.predict(feature_matrix)
    inference_ms = (time.perf_counter() - t1) * 1000

    # Calibrate confidence based on lead mode uncertainty
    calibrated_confidences = [
        calibrate_confidence_by_lead_mode(c, active_mode)
        for c in raw_confidences
    ]

    # ── 5. Metrics ────────────────────────────────────────────────────────────
    for label in labels:
        BEATS_CLASSIFIED.labels(label=label).inc()
        if label != "N":
            ABNORMAL_BEATS.labels(label=label).inc()

    # ── 6. Persist + cache ────────────────────────────────────────────────────
    result = await _build_result(
        request=request,
        r_peaks=r_peaks,
        labels=labels,
        confidences=calibrated_confidences,
        proba_dicts=proba_dicts,
        preprocessing_ms=preprocessing_ms,
        inference_ms=inference_ms,
        db=db,
        persist=True,
        primary_len=primary_len,
        lead_mode=active_mode,
        lead_meta=lead_meta,
        mi_analysis=mi_analysis,
    )

    await cache_service.cache_result(signal_hash, result.model_dump(mode="json"))
    return result


async def screen_signal_record(
    record: SignalRecord,
    model_service: ModelService,
    db: AsyncSession,
    batch_job_id: Optional[str] = None,
) -> ScreeningResult:
    """Adapter used by the Celery batch task — wraps SignalRecord into a ScreeningRequest."""
    req = ScreeningRequest(
        signal=record.signal,
        signals=record.signals,
        lead_mode=record.lead_mode,
        sample_rate=record.sample_rate,
        patient_id=record.patient_id,
        signal_id=record.signal_id,
    )
    return await screen_single(req, model_service, db)


async def _build_result(
    *,
    request: ScreeningRequest,
    r_peaks: np.ndarray,
    labels: List[str],
    confidences: List[float],
    proba_dicts: List[Dict[str, float]],
    preprocessing_ms: float,
    inference_ms: float,
    db: AsyncSession,
    persist: bool,
    primary_len: int,
    lead_mode: str,
    lead_meta: Dict[str, Any],
    mi_analysis: Dict[str, Any],
) -> ScreeningResult:
    """Assemble the result schema and optionally persist to DB."""
    signal_id = request.signal_id or str(uuid.uuid4())
    result_id = uuid.uuid4()
    n_beats = len(labels)

    beats = [
        BeatClassification(
            beat_index=i,
            r_peak_sample=int(r_peaks[i]),
            r_peak_time_s=round(int(r_peaks[i]) / request.sample_rate, 4),
            label=AAMILabel(labels[i]),
            confidence=round(confidences[i], 4),
            probabilities={k: round(v, 4) for k, v in proba_dicts[i].items()},
        )
        for i in range(n_beats)
    ]

    label_counts = Counter(labels)
    label_summary = {lbl: label_counts.get(lbl, 0) for lbl in ["N", "S", "V", "F", "Q"]}
    dominant_label = max(label_summary, key=label_summary.get) if labels else None  # type: ignore[arg-type]

    created_at = datetime.datetime.now(datetime.timezone.utc)

    if persist and db is not None:
        try:
            orm = ScreeningResultModel(
                id=result_id,
                patient_id=request.patient_id,
                signal_id=signal_id,
                beats=[b.model_dump(mode="json") for b in beats],
                total_beats=n_beats,
                dominant_label=dominant_label,
                count_n=label_summary["N"],
                count_s=label_summary["S"],
                count_v=label_summary["V"],
                count_f=label_summary["F"],
                count_q=label_summary["Q"],
                sample_rate=request.sample_rate,
                signal_length=primary_len,
                preprocessing_duration_ms=preprocessing_ms,
                inference_duration_ms=inference_ms,
                created_at=created_at,
            )
            db.add(orm)
            await db.flush()
            logger.info(
                "Screening result persisted",
                result_id=str(result_id),
                patient_id=request.patient_id,
                total_beats=n_beats,
                lead_mode=lead_mode,
            )
        except Exception as exc:  # noqa: BLE001
            logger.debug("Database persistence skipped (running in demo mode)", error=str(exc))

    res = ScreeningResult(
        result_id=result_id,
        signal_id=signal_id,
        patient_id=request.patient_id,
        sample_rate=request.sample_rate,
        signal_length_samples=primary_len,
        total_beats=n_beats,
        beats=beats,
        dominant_label=AAMILabel(dominant_label) if dominant_label else None,
        label_summary=label_summary,
        preprocessing_duration_ms=round(preprocessing_ms, 2),
        inference_duration_ms=round(inference_ms, 2),
        created_at=created_at.isoformat(),
        lead_mode=lead_mode,
        leads_analyzed=lead_meta["leads_analyzed"],
        derived_leads=lead_meta["derived_leads"],
        lead_count=lead_meta["lead_count"],
        benchmark_accuracy=lead_meta["benchmark_accuracy"],
        clinical_tier=lead_meta["clinical_tier"],
        mi_localization=mi_analysis,
        accuracy_curve=lead_meta["accuracy_curve"],
    )

    try:
        from app.services.history_service import history_service
        history_service.add(res)
    except Exception as exc:
        logger.debug("Failed to record result to history_service", error=str(exc))

    return res
