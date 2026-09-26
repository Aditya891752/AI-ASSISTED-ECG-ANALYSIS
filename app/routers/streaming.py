"""
app/routers/streaming.py
─────────────────────────
WebSocket /api/v1/stream

Architecture
────────────
The client sends ECG chunks as JSON frames matching the `StreamChunk` schema.
The server accumulates samples in a ring buffer. Whenever the buffer contains
enough samples to detect and classify at least one beat, it runs preprocessing
and inference and pushes `StreamResult` frames back to the client immediately.

The "sliding window" strategy means:
  • Low latency — beats are reported ~200 ms after their R-peak is detected
  • Correct edge handling — beats spanning chunk boundaries are not missed
  • The buffer retains the last N samples (configurable) to catch cross-chunk beats

Protocol:
  Client → Server: StreamChunk JSON
  Server → Client: StreamResult JSON | StreamError JSON | {"type":"ping"}
"""
from __future__ import annotations

import asyncio
import collections
import json
import time
from collections import deque

import numpy as np
import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from app.config import get_settings
from app.schemas.ecg import AAMILabel, BeatClassification, StreamChunk, StreamError, StreamResult
from app.services.model_service import ModelService, ModelNotLoadedError
from app.services.preprocessing import detect_r_peaks, bandpass_filter, extract_beat_features
from app.utils.metrics import WS_ACTIVE_CONNECTIONS, WS_CHUNKS_RECEIVED

router = APIRouter()
logger = structlog.get_logger(__name__)
settings = get_settings()

# How many samples to keep in the look-behind buffer after classifying beats.
# Ensures beats straddling chunk boundaries are not missed.
_LOOKBEHIND = 360  # 1 second at 360 Hz


@router.websocket("/stream")
async def ecg_stream(websocket: WebSocket) -> None:
    """
    **WebSocket ECG Streaming Endpoint**

    Connect and stream ECG chunks; receive per-beat classifications in real-time.

    **Client → Server (JSON):**
    ```json
    {
      "samples": [0.1, 0.2, ...],
      "sample_rate": 360,
      "patient_id": "patient-001",
      "sequence": 0
    }
    ```

    **Server → Client (JSON):**
    ```json
    {
      "beat_index": 0,
      "r_peak_sample": 180,
      "r_peak_time_s": 0.5,
      "label": "N",
      "confidence": 0.97,
      "probabilities": {"N": 0.97, "S": 0.01, "V": 0.01, "F": 0.005, "Q": 0.005},
      "buffer_sample_offset": 0
    }
    ```

    Send `{"action": "close"}` to close the stream gracefully.
    """
    model_service: ModelService | None = getattr(websocket.app.state, "model_service", None)
    if model_service is None or not model_service.is_loaded:
        await websocket.close(code=1011, reason="Model not loaded")
        return

    await websocket.accept()
    WS_ACTIVE_CONNECTIONS.inc()

    buffer: deque[float] = deque(maxlen=settings.ecg_stream_buffer_size * 4)
    buffer_sample_offset = 0  # absolute position of buffer[0] from stream start
    beat_index_global = 0
    last_classified_offset = 0  # avoid reclassifying already-reported beats
    fs = settings.ecg_sample_rate

    logger.info("WebSocket connection opened")

    try:
        while True:
            # Receive with a timeout so we can send keepalive pings
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
            except asyncio.TimeoutError:
                await websocket.send_text(json.dumps({"type": "ping"}))
                continue

            # Client-initiated close
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_text(
                    StreamError(error="invalid_json", sequence=-1).model_dump_json()
                )
                continue

            if msg.get("action") == "close":
                break

            # ── Parse chunk ────────────────────────────────────────────────────
            try:
                chunk = StreamChunk.model_validate(msg)
            except Exception as exc:  # noqa: BLE001
                await websocket.send_text(
                    StreamError(
                        error="validation_error",
                        sequence=msg.get("sequence", -1),
                        detail=str(exc),
                    ).model_dump_json()
                )
                continue

            WS_CHUNKS_RECEIVED.inc()
            fs = chunk.sample_rate
            buffer.extend(chunk.samples)

            # ── Classify new beats in buffer ───────────────────────────────────
            if len(buffer) < fs * 0.5:
                # Not enough data yet for reliable R-peak detection
                continue

            signal_arr = np.array(buffer, dtype=np.float64)
            try:
                filtered = bandpass_filter(signal_arr, fs)
                r_peaks = detect_r_peaks(filtered, fs)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Preprocessing error in stream", exc_info=exc)
                continue

            # Only classify R-peaks that are NEW (beyond what we've already sent)
            min_absolute_sample = last_classified_offset - buffer_sample_offset
            new_peaks = r_peaks[r_peaks > min_absolute_sample]

            # Leave the last beat un-classified — it might be incomplete
            # (its post-beat window might extend past the buffer end)
            if len(new_peaks) <= 1:
                continue

            classifiable_peaks = new_peaks[:-1]
            features = extract_beat_features(filtered, classifiable_peaks, fs)

            if features.shape[0] == 0:
                continue

            try:
                labels, confidences, proba_dicts = await model_service.predict(features)
            except ModelNotLoadedError:
                await websocket.close(code=1011, reason="Model unavailable")
                return

            # ── Push results to client ─────────────────────────────────────────
            for i, peak_local in enumerate(classifiable_peaks):
                peak_absolute = buffer_sample_offset + int(peak_local)
                result = StreamResult(
                    beat_index=beat_index_global,
                    r_peak_sample=peak_absolute,
                    r_peak_time_s=round(peak_absolute / fs, 4),
                    label=AAMILabel(labels[i]),
                    confidence=round(confidences[i], 4),
                    probabilities={k: round(v, 4) for k, v in proba_dicts[i].items()},
                    buffer_sample_offset=peak_absolute,
                )
                await websocket.send_text(result.model_dump_json())
                beat_index_global += 1
                last_classified_offset = peak_absolute + 1

            # Advance the buffer offset tracker
            buffer_sample_offset += len(chunk.samples)

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as exc:  # noqa: BLE001
        logger.error("Unexpected WebSocket error", exc_info=exc)
    finally:
        WS_ACTIVE_CONNECTIONS.dec()
        logger.info(
            "WebSocket connection closed",
            beats_classified=beat_index_global,
        )
