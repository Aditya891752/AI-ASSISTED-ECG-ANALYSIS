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
    Supports single-lead ('signal') or multi-lead dictionary ('signals') across 2–12 lead modes.
    """

    signal: list[float] | None = Field(
        default=None,
        description="Raw single-channel ECG signal samples (minimum 360 samples; defaults to Lead II)",
        examples=[[0.12, 0.15, 0.18, 0.22]],
    )
    signals: dict[str, list[float]] | None = Field(
        default=None,
        description="Multi-lead dictionary mapping lead name to samples (e.g. {'I': [...], 'II': [...], 'V1': [...]})",
    )
    lead_mode: str | None = Field(
        default="auto",
        description="Requested lead mode: '2-lead' | '3-lead' | '5-lead' | '8-lead' | '12-lead' | 'auto'",
    )
    leads: list[str] | None = Field(
        default=None,
        description="Optional list of lead names for multi-channel ordering",
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

    @model_validator(mode="after")
    def validate_signals_presence(self) -> "ScreeningRequest":
        import math
        if self.signal is None and not self.signals:
            raise ValueError("Either 'signal' (1D list) or 'signals' (multi-lead dict) must be provided")

        if self.signal is not None:
            if len(self.signal) < 360:
                raise ValueError("Signal array must contain at least 360 samples")
            if any(not math.isfinite(x) for x in self.signal):
                raise ValueError("Signal contains NaN or Inf values — check your ADC/data pipeline")

        if self.signals is not None:
            for lead_name, vals in self.signals.items():
                if len(vals) < 360:
                    raise ValueError(f"Lead '{lead_name}' must have at least 360 samples")
                if any(not math.isfinite(x) for x in vals):
                    raise ValueError(f"Lead '{lead_name}' contains NaN or Inf values")

        return self

    model_config = {
        "json_schema_extra": {
            "example": {
                "signal": [0.0, 0.05, 0.1, 0.3, 0.6, 1.0, 0.8, 0.4, 0.1, 0.0],
                "sample_rate": 360,
                "lead_mode": "auto",
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
        description="Model confidence (max class probability, lead-calibrated)",
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

    # ── Variable 2–12 Lead Diagnostics ─────────────────────────────────────────
    lead_mode: str = Field(default="2-lead", description="Active lead mode used for analysis")
    leads_analyzed: list[str] = Field(default_factory=lambda: ["II"], description="Leads actively analyzed")
    derived_leads: list[str] = Field(default_factory=list, description="Leads mathematically derived via Einthoven/Goldberger")
    lead_count: int = Field(default=1, description="Number of active leads analyzed")
    benchmark_accuracy: float = Field(default=0.885, description="Empirical benchmark accuracy for this lead mode")
    clinical_tier: str = Field(default="Rural PHC & Handheld Triage", description="Clinical operational tier")
    mi_localization: dict | None = Field(default=None, description="Territorial MI localization analysis (available at >= 8 leads)")
    accuracy_curve: list[dict] = Field(default_factory=list, description="Reference accuracy vs lead count data")

    model_config = {
        "json_schema_extra": {
            "example": {
                "result_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "signal_id": "sig-001",
                "patient_id": "patient-0042",
                "sample_rate": 360,
                "signal_length_samples": 3600,
                "total_beats": 10,
                "lead_mode": "12-lead",
                "leads_analyzed": ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"],
                "derived_leads": ["III", "aVR", "aVL", "aVF"],
                "lead_count": 12,
                "benchmark_accuracy": 0.991,
                "clinical_tier": "Hospital Grade Comprehensive Diagnostic",
                "beats": [
                    {
                        "beat_index": 0,
                        "r_peak_sample": 180,
                        "r_peak_time_s": 0.5,
                        "label": "N",
                        "confidence": 0.99,
                        "probabilities": {"N": 0.99, "S": 0.005, "V": 0.003, "F": 0.001, "Q": 0.001},
                    }
                ],
                "dominant_label": "N",
                "label_summary": {"N": 9, "S": 1, "V": 0, "F": 0, "Q": 0},
                "preprocessing_duration_ms": 14.2,
                "inference_duration_ms": 3.8,
                "created_at": "2026-09-25T13:00:00Z",
            }
        }
    }


# ── Batch Screening ────────────────────────────────────────────────────────────

class SignalRecord(BaseModel):
    """A single signal entry within a batch request."""

    signal: list[float] | None = Field(default=None, description="Single lead samples")
    signals: dict[str, list[float]] | None = Field(default=None, description="Multi-lead dictionary")
    lead_mode: str | None = Field(default="auto")
    sample_rate: int = Field(default=360, ge=100, le=10_000)
    patient_id: str | None = Field(default=None, max_length=64)
    signal_id: str | None = Field(default=None, max_length=64)

    @model_validator(mode="after")
    def validate_record(self) -> "SignalRecord":
        import math
        if self.signal is None and not self.signals:
            raise ValueError("Either 'signal' or 'signals' must be provided in record")
        if self.signal is not None:
            if len(self.signal) < 360:
                raise ValueError("Signal must have at least 360 samples")
            if any(not math.isfinite(x) for x in self.signal):
                raise ValueError("Signal contains NaN or Inf values")
        if self.signals is not None:
            for lead_name, vals in self.signals.items():
                if len(vals) < 360:
                    raise ValueError(f"Lead '{lead_name}' must have at least 360 samples")
                if any(not math.isfinite(x) for x in vals):
                    raise ValueError(f"Lead '{lead_name}' contains NaN or Inf values")
        return self



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
