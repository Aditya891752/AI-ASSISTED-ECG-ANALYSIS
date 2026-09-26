"""
app/services/model_service.py
──────────────────────────────
Thread-safe ML model loader and inference service.

Supports two model formats — auto-detected by file extension:
  • .pkl  → scikit-learn (or any joblib-serialised object with predict_proba)
  • .pt   → PyTorch (nn.Module saved with torch.save)

All inference runs in a thread-pool executor so it never blocks the
FastAPI event loop. Batching is handled internally: a list of beat feature
vectors is stacked into a single matrix / tensor and forwarded in one call.
"""
from __future__ import annotations

import asyncio
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

import numpy as np
import structlog

from app.utils.metrics import INFERENCE_BATCH_SIZE, INFERENCE_LATENCY

logger = structlog.get_logger(__name__)

AAMI_LABELS = ["N", "S", "V", "F", "Q"]

# Number of worker threads for model inference.
# Keep at CPU count (or 1 for GPU-only torch models).
_EXECUTOR = ThreadPoolExecutor(max_workers=4, thread_name_prefix="ecg-infer")


class ModelNotLoadedError(RuntimeError):
    """Raised when inference is attempted before the model is loaded."""


class ModelService:
    """
    Singleton service that owns the loaded model and exposes a single
    async `predict` method. Instantiated once in app lifespan.
    """

    def __init__(self, model_path: str) -> None:
        self._model_path = Path(model_path)
        self._model: Any = None
        self._model_type: str | None = None  # "sklearn" | "pytorch"
        self._loaded: bool = False

    # ── Loading ───────────────────────────────────────────────────────────────

    async def load(self) -> None:
        """
        Load the model from disk. Called once at startup.
        Offloaded to executor so it doesn't block the event loop during
        large model deserialization.
        """
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(_EXECUTOR, self._load_sync)

    def _load_sync(self) -> None:
        path = self._model_path
        if not path.exists():
            # Fallback 1: Resolve relative to project root (app/services/../../..)
            project_root = Path(__file__).resolve().parent.parent.parent
            candidate = project_root / path
            if candidate.exists():
                path = candidate
            else:
                # Fallback 2: Check inside project_root / "model"
                model_dir = project_root / "model"
                candidates = [
                    model_dir / "model.pkl",
                    model_dir / "model_combined_rf.pkl",
                    model_dir / "model_ptbdb_rf.pkl",
                ]
                found = next((c for c in candidates if c.exists()), None)
                if found:
                    path = found
                else:
                    raise FileNotFoundError(
                        f"Model file not found at '{self._model_path}' or '{candidate}'. "
                        "Ensure model/model.pkl exists in the project root."
                    )

        suffix = path.suffix.lower()

        if suffix == ".pkl":
            self._load_sklearn(path)
        elif suffix in (".pt", ".pth"):
            self._load_pytorch(path)
        else:
            raise ValueError(
                f"Unsupported model format '{suffix}'. Expected .pkl or .pt/.pth"
            )

        self._loaded = True
        logger.info(
            "Model loaded",
            type=self._model_type,
            path=str(path),
        )

    def _load_sklearn(self, path: Path) -> None:
        import joblib
        self._model = joblib.load(path)
        self._model_type = "sklearn"
        # Verify the model has predict_proba (required for confidence scores)
        if not hasattr(self._model, "predict_proba"):
            logger.warning(
                "Loaded sklearn model lacks predict_proba — confidence scores will be 1.0 for predicted class"
            )

    def _load_pytorch(self, path: Path) -> None:
        import torch
        checkpoint = torch.load(path, map_location="cpu", weights_only=False)

        if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
            # Checkpoint dict format from train_pytorch_cnn.py
            from train_pytorch_cnn import ECGNet
            n_classes  = checkpoint.get("n_classes", 4)
            input_dim  = checkpoint.get("input_dim", 221)
            self._classes = checkpoint.get("classes", ["F", "N", "S", "V"])

            model = ECGNet(n_classes=n_classes, input_dim=input_dim)
            model.load_state_dict(checkpoint["model_state_dict"])
            self._model = model
        else:
            # Raw model save: torch.save(model, path)
            self._model  = checkpoint
            self._classes = None   # fall back to AAMI_LABELS order

        self._model.eval()
        self._model_type = "pytorch"
        logger.info(
            "PyTorch model loaded",
            classes=getattr(self, "_classes", None),
        )

    # ── Public API ────────────────────────────────────────────────────────────

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    @property
    def model_type(self) -> str | None:
        return self._model_type

    async def predict(
        self,
        feature_matrix: np.ndarray,
    ) -> tuple[list[str], list[float], list[dict[str, float]]]:
        """
        Classify a batch of beats.

        Parameters
        ----------
        feature_matrix : np.ndarray, shape (n_beats, n_features)
            Pre-extracted feature matrix from the preprocessing pipeline.

        Returns
        -------
        labels      : list[str]         — Predicted AAMI label for each beat
        confidences : list[float]       — Max class probability for each beat
        proba_dicts : list[dict]        — Full {N/S/V/F/Q: prob} per beat
        """
        if not self._loaded:
            raise ModelNotLoadedError(
                "Model is not loaded. Check the model/ directory and restart."
            )

        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            _EXECUTOR,
            self._predict_sync,
            feature_matrix,
        )
        return result

    def _predict_sync(
        self,
        feature_matrix: np.ndarray,
    ) -> tuple[list[str], list[float], list[dict[str, float]]]:
        """Synchronous inference — runs in thread pool."""
        n_beats = feature_matrix.shape[0]
        INFERENCE_BATCH_SIZE.observe(n_beats)

        start = time.perf_counter()

        if self._model_type == "sklearn":
            labels, confidences, proba_dicts = self._predict_sklearn(feature_matrix)
        elif self._model_type == "pytorch":
            labels, confidences, proba_dicts = self._predict_pytorch(feature_matrix)
        else:
            raise ModelNotLoadedError("Unknown model type")

        elapsed = time.perf_counter() - start
        INFERENCE_LATENCY.labels(model_type=self._model_type).observe(elapsed)

        logger.debug(
            "Batch inference complete",
            n_beats=n_beats,
            elapsed_ms=round(elapsed * 1000, 2),
        )
        return labels, confidences, proba_dicts

    def _predict_sklearn(
        self,
        X: np.ndarray,
    ) -> tuple[list[str], list[float], list[dict[str, float]]]:
        if hasattr(self._model, "predict_proba"):
            proba = self._model.predict_proba(X)  # shape (n, 5)
            # Model classes may not be in AAMI order — align them
            model_classes = [str(c) for c in self._model.classes_]
            proba_dicts = []
            for row in proba:
                d = {cls: float(p) for cls, p in zip(model_classes, row)}
                # Fill missing classes with 0.0
                proba_dicts.append({lbl: d.get(lbl, 0.0) for lbl in AAMI_LABELS})

            confidences = [max(d.values()) for d in proba_dicts]
            labels = [max(d, key=d.get) for d in proba_dicts]  # type: ignore[arg-type]
        else:
            # Fallback: hard predictions only
            raw_labels = self._model.predict(X)
            labels = [str(l) for l in raw_labels]
            confidences = [1.0] * len(labels)
            proba_dicts = [
                {lbl: (1.0 if lbl == l else 0.0) for lbl in AAMI_LABELS}
                for l in labels
            ]

        return labels, confidences, proba_dicts

    def _predict_pytorch(
        self,
        X: np.ndarray,
    ) -> tuple[list[str], list[float], list[dict[str, float]]]:
        import torch
        import torch.nn.functional as F

        # ECGNet expects (batch, 1, L) — add channel dim
        tensor = torch.from_numpy(X).float().unsqueeze(1)  # (n, 1, feature_dim)
        with torch.no_grad():
            logits = self._model(tensor)             # (n, n_classes)
            proba  = F.softmax(logits, dim=-1).numpy()

        # Use the class order saved in the checkpoint (may be a subset of AAMI_LABELS)
        model_classes = getattr(self, "_classes", None) or AAMI_LABELS

        proba_dicts = []
        for row in proba:
            d = {cls: float(p) for cls, p in zip(model_classes, row)}
            # Pad missing classes with 0.0 so response always has all 5 labels
            full_d = {lbl: d.get(lbl, 0.0) for lbl in AAMI_LABELS}
            proba_dicts.append(full_d)

        confidences = [max(d.values()) for d in proba_dicts]
        labels      = [max(d, key=d.get) for d in proba_dicts]  # type: ignore[arg-type]

        return labels, confidences, proba_dicts
