"""
app/schemas/ecg.py
──────────────────
Pydantic v2 request / response schemas for all ECG screening endpoints.
"""

from enum import Enum
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


class AAMILabel(str, Enum):
    """AAMI EC57 heartbeat classification labels."""

    N = "N"  # Normal / Left-bundle-branch-block / Right-bundle-branch-block
    S = "S"  # Supraventricular ectopic (atrial/junctional)
    V = "V"  # Ventricular ectopic (PVC)
    F = "F"  # Fusion of normal and ventricular
    Q = "Q"  # Unknown / paced / unclassifiable


# ── Single Screening ───────────────────────────────────────────────────────────

class ScreeningRequest(BaseModel):
    """
    Request body for `POST /screen`.
    Send the raw ECG signal as a 1-D array of float samples.
    """

    signal: list[float] = Field(
        ...,
        min_length=360,
        description="Raw ECG signal samples (minimum 360 samples = 1 s at 360 Hz)",
        examples=[[0.12, 0.15, 0.18, 0.22]],
    )
    sample_rate: int = Field(
        default=360,
        ge=100,
        le=10_000,
        description="Sampling frequency in Hz (default 360 Hz for MIT-BIH)",
    )
    patient_id: str | None = Field(
        default=None,
        max_length=64,
        description="Optional patient/device identifier for history lookup",
        examples=["patient-0042"],
    )
    signal_id: str | None = Field(
        default=None,
        max_length=64,
        description="Optional caller-supplied ID for idempotency; auto-generated if omitted",
    )

    @field_validator("signal")
    @classmethod
    def signal_must_be_finite(cls, v: list[float]) -> list[float]:
        import math
        if any(not math.isfinite(x) for x in v):
            raise ValueError("Signal contains NaN or Inf values — check your ADC/data pipeline")
        return v

    model_config = {
        "json_schema_extra": {
            "example": {
                "signal": [0.0, 0.05, 0.1, 0.3, 0.6, 1.0, 0.8, 0.4, 0.1, 0.0],
                "sample_rate": 360,
                "patient_id": "patient-0042",
            }
        }
    }


class BeatClassification(BaseModel):
    """Classification result for a single detected heartbeat."""

    beat_index: int = Field(..., description="0-based index of this beat in the signal")
    r_peak_sample: int = Field(..., description="Sample index of the detected R-peak")
    r_peak_time_s: float = Field(..., description="R-peak position in seconds from signal start")
    label: AAMILabel = Field(..., description="Predicted AAMI class label")
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Model confidence (max class probability)",
    )
    probabilities: dict[str, float] = Field(
        ...,
        description="Full class probability distribution {N, S, V, F, Q}",
    )


class ScreeningResult(BaseModel):
    """Response body for `POST /screen`."""

    result_id: UUID = Field(..., description="Unique ID of this screening result (stored in DB)")
    signal_id: str = Field(..., description="Signal identifier (caller-supplied or auto-generated)")
    patient_id: str | None = None
    sample_rate: int
    signal_length_samples: int
    total_beats: int = Field(..., description="Total R-peaks detected")
    beats: list[BeatClassification]
    dominant_label: AAMILabel | None = Field(
        default=None,
        description="Most frequent label across all beats",
    )
    label_summary: dict[str, int] = Field(
        ...,
        description="Count of each label: {N: x, S: y, V: z, F: w, Q: v}",
    )
    preprocessing_duration_ms: float = Field(..., description="Bandpass + R-peak detection time (ms)")
    inference_duration_ms: float = Field(..., description="Model inference time (ms)")
    created_at: str = Field(..., description="ISO-8601 UTC timestamp")

    model_config = {
        "json_schema_extra": {
            "example": {
                "result_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "signal_id": "sig-001",
                "patient_id": "patient-0042",
                "sample_rate": 360,
                "signal_length_samples": 3600,
                "total_beats": 10,
                "beats": [
                    {
                        "beat_index": 0,
                        "r_peak_sample": 180,
                        "r_peak_time_s": 0.5,
                        "label": "N",
                        "confidence": 0.97,
                        "probabilities": {"N": 0.97, "S": 0.01, "V": 0.01, "F": 0.005, "Q": 0.005},
                    }
                ],
                "dominant_label": "N",
                "label_summary": {"N": 9, "S": 1, "V": 0, "F": 0, "Q": 0},
                "preprocessing_duration_ms": 12.4,
                "inference_duration_ms": 3.1,
                "created_at": "2026-09-25T13:00:00Z",
            }
        }
    }


# ── Batch Screening ────────────────────────────────────────────────────────────

class SignalRecord(BaseModel):
    """A single signal entry within a batch request."""

    signal: list[float] = Field(..., min_length=360)
    sample_rate: int = Field(default=360, ge=100, le=10_000)
    patient_id: str | None = Field(default=None, max_length=64)
    signal_id: str | None = Field(default=None, max_length=64)

    @field_validator("signal")
    @classmethod
    def signal_must_be_finite(cls, v: list[float]) -> list[float]:
        import math
        if any(not math.isfinite(x) for x in v):
            raise ValueError("Signal contains NaN or Inf values")
        return v


class BatchScreeningRequest(BaseModel):
    """
    Request body for `POST /screen/batch`.
    Submit up to 5,000 signals for async processing.
    """

    signals: list[SignalRecord] = Field(
        ...,
        min_length=1,
        max_length=5_000,
        description="Array of signal records to classify",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "signals": [
                    {"signal": [0.0, 0.1, 0.2], "sample_rate": 360, "patient_id": "patient-001"},
                    {"signal": [0.0, 0.1, 0.2], "sample_rate": 360, "patient_id": "patient-002"},
                ]
            }
        }
    }


# ── WebSocket Streaming ────────────────────────────────────────────────────────

class StreamChunk(BaseModel):
    """
    A chunk of ECG samples sent by the client over the WebSocket.
    Send repeatedly as new samples arrive from your ADC/monitor.
    """

    samples: list[float] = Field(
        ...,
        min_length=1,
        description="Raw ECG samples in this chunk",
    )
    sample_rate: int = Field(default=360, ge=100, le=10_000)
    patient_id: str | None = Field(default=None, max_length=64)
    sequence: int = Field(
        default=0,
        ge=0,
        description="Monotonically increasing chunk sequence number for ordering",
    )

    @field_validator("samples")
    @classmethod
    def samples_must_be_finite(cls, v: list[float]) -> list[float]:
        import math
        if any(not math.isfinite(x) for x in v):
            raise ValueError("Chunk contains NaN or Inf values")
        return v


class StreamResult(BaseModel):
    """
    Server → client message pushed over WebSocket for each classified beat.
    """

    beat_index: int
    r_peak_sample: int
    r_peak_time_s: float
    label: AAMILabel
    confidence: float = Field(..., ge=0.0, le=1.0)
    probabilities: dict[str, float]
    buffer_sample_offset: int = Field(
        ...,
        description="Absolute sample offset of this beat from stream start",
    )


class StreamError(BaseModel):
    """Pushed to client when a chunk cannot be processed."""

    error: str
    sequence: int
    detail: str | None = None
