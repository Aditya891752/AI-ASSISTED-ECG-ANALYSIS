"""
train_pytorch_cnn.py
─────────────────────
Train a 1D CNN on the MIT-BIH beat dataset and save as model/model.pt.

Architecture: ECGNet — a lightweight residual 1D-CNN for beat classification.

Input shape:  (batch, 1, 221)   ← raw waveform (216) + RR features (5), channel-first
Output shape: (batch, n_classes) logits

Model auto-detects the number of classes from the training labels.

Usage:
    pip install torch torchvision
    python train_pytorch_cnn.py                     # default 30 epochs
    python train_pytorch_cnn.py --epochs 50 --lr 3e-4
    python train_pytorch_cnn.py --raw-only          # use only waveform (216 dims)

Then drop model/model.pt in the project — the API loads it automatically.
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from collections import Counter
from pathlib import Path

import numpy as np

sys.path.insert(0, "D:\\Lib\\site-packages")

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    from torch.utils.data import DataLoader, TensorDataset, WeightedRandomSampler
except ImportError:
    print("PyTorch not installed. Run: pip install torch")
    sys.exit(1)


# ─────────────────────────────────────────────────────────────────────────────
# Model Architecture — ECGNet (Residual 1D-CNN)
# ─────────────────────────────────────────────────────────────────────────────

class ResBlock1D(nn.Module):
    """1D residual block with two Conv1D layers and a skip connection."""

    def __init__(self, channels: int, kernel_size: int = 5):
        super().__init__()
        pad = kernel_size // 2
        self.conv1 = nn.Conv1d(channels, channels, kernel_size, padding=pad, bias=False)
        self.bn1   = nn.BatchNorm1d(channels)
        self.conv2 = nn.Conv1d(channels, channels, kernel_size, padding=pad, bias=False)
        self.bn2   = nn.BatchNorm1d(channels)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        residual = x
        out = F.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        return F.relu(out + residual)


class ECGNet(nn.Module):
    """
    Lightweight 1D CNN for ECG beat classification.

    Architecture:
      Stem:     Conv1d(1→32, k=15) → BN → ReLU → MaxPool(2)
      Block 1:  ResBlock(32) → MaxPool(2)
      Block 2:  ResBlock(64) → MaxPool(2)   [after channel expansion]
      Block 3:  ResBlock(128)
      Head:     GlobalAvgPool → FC(128→64) → Dropout(0.3) → FC(64→n_classes)

    Params: ~180 K  (fast to train, small to deploy)
    """

    def __init__(self, n_classes: int, input_dim: int = 221):
        super().__init__()
        self.input_dim = input_dim

        # Stem: captures large-scale QRS morphology
        self.stem = nn.Sequential(
            nn.Conv1d(1, 32, kernel_size=15, padding=7, bias=False),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.MaxPool1d(2),          # (batch, 32, ~110)
        )

        # Residual blocks + channel expansion
        self.layer1 = nn.Sequential(
            ResBlock1D(32, kernel_size=7),
            nn.MaxPool1d(2),           # (batch, 32, ~55)
        )

        # Channel expansion 32 → 64
        self.expand1 = nn.Sequential(
            nn.Conv1d(32, 64, kernel_size=1, bias=False),
            nn.BatchNorm1d(64),
            nn.ReLU(),
        )

        self.layer2 = nn.Sequential(
            ResBlock1D(64, kernel_size=5),
            nn.MaxPool1d(2),           # (batch, 64, ~27)
        )

        # Channel expansion 64 → 128
        self.expand2 = nn.Sequential(
            nn.Conv1d(64, 128, kernel_size=1, bias=False),
            nn.BatchNorm1d(128),
            nn.ReLU(),
        )

        self.layer3 = ResBlock1D(128, kernel_size=3)

        # Classification head
        self.gap = nn.AdaptiveAvgPool1d(1)   # global average pool
        self.head = nn.Sequential(
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, n_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch, 1, L)
        x = self.stem(x)
        x = self.layer1(x)
        x = self.expand1(x)
        x = self.layer2(x)
        x = self.expand2(x)
        x = self.layer3(x)
        x = self.gap(x).squeeze(-1)   # (batch, 128)
        return self.head(x)            # (batch, n_classes)


# ─────────────────────────────────────────────────────────────────────────────
# Training utilities
# ─────────────────────────────────────────────────────────────────────────────

def make_weighted_sampler(labels: np.ndarray) -> WeightedRandomSampler:
    """Create a sampler that up-weights minority classes per batch."""
    counts  = Counter(labels.tolist())
    weights = {cls: 1.0 / count for cls, count in counts.items()}
    sample_weights = np.array([weights[lbl] for lbl in labels], dtype=np.float32)
    return WeightedRandomSampler(
        weights=torch.from_numpy(sample_weights),
        num_samples=len(sample_weights),
        replacement=True,
    )


def encode_labels(y: np.ndarray, classes: list[str]) -> np.ndarray:
    """Map string labels to integer indices."""
    cls_to_idx = {c: i for i, c in enumerate(classes)}
    return np.array([cls_to_idx[lbl] for lbl in y], dtype=np.int64)


def evaluate(model: nn.Module, loader: DataLoader, device: torch.device) -> dict:
    model.eval()
    all_preds, all_targets = [], []
    total_loss = 0.0
    criterion  = nn.CrossEntropyLoss()

    with torch.no_grad():
        for X_batch, y_batch in loader:
            X_batch, y_batch = X_batch.to(device), y_batch.to(device)
            logits = model(X_batch)
            loss   = criterion(logits, y_batch)
            total_loss += loss.item() * len(y_batch)
            preds = logits.argmax(dim=-1)
            all_preds.extend(preds.cpu().tolist())
            all_targets.extend(y_batch.cpu().tolist())

    all_preds   = np.array(all_preds)
    all_targets = np.array(all_targets)
    accuracy    = (all_preds == all_targets).mean()
    avg_loss    = total_loss / len(all_targets)
    return {"accuracy": accuracy, "loss": avg_loss}


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs",   type=int,   default=30)
    parser.add_argument("--lr",       type=float, default=1e-3)
    parser.add_argument("--batch",    type=int,   default=256)
    parser.add_argument("--raw-only", action="store_true",
                        help="Use only waveform features (216 dims), ignoring RR features")
    parser.add_argument("--no-balanced", dest="balanced", action="store_false", default=True,
                        help="Use unbalanced training set")
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    # ── Load data ──────────────────────────────────────────────────────────────
    print("Loading dataset ...")
    X_train = np.load("X_train_balanced.npy" if args.balanced else "X_train.npy")
    y_train = np.load("y_train_balanced.npy" if args.balanced else "y_train.npy", allow_pickle=True)
    X_val   = np.load("X_val.npy")
    y_val   = np.load("y_val.npy",   allow_pickle=True)
    X_test  = np.load("X_test.npy")
    y_test  = np.load("y_test.npy",  allow_pickle=True)

    if args.raw_only:
        X_train, X_val, X_test = X_train[:, :216], X_val[:, :216], X_test[:, :216]
        print("Using raw waveform only (216 dims)")
    else:
        print(f"Using full feature vector ({X_train.shape[1]} dims incl. RR features)")

    input_dim = X_train.shape[1]
    classes   = sorted(set(y_train.tolist()))
    n_classes = len(classes)
    print(f"Classes: {classes}  ({n_classes} total)")
    print(f"Train: {X_train.shape}  Val: {X_val.shape}  Test: {X_test.shape}")

    # ── Encode labels ──────────────────────────────────────────────────────────
    y_train_enc = encode_labels(y_train, classes)
    y_val_enc   = encode_labels(y_val,   classes)
    y_test_enc  = encode_labels(y_test,  classes)

    # ── Build datasets ─────────────────────────────────────────────────────────
    # Reshape to (N, 1, L) for Conv1d (channel-first)
    def to_tensor(X, y):
        Xt = torch.from_numpy(X.astype(np.float32)).unsqueeze(1)  # (N, 1, L)
        yt = torch.from_numpy(y)
        return TensorDataset(Xt, yt)

    train_ds = to_tensor(X_train, y_train_enc)
    val_ds   = to_tensor(X_val,   y_val_enc)
    test_ds  = to_tensor(X_test,  y_test_enc)

    sampler     = make_weighted_sampler(y_train)
    train_loader = DataLoader(train_ds, batch_size=args.batch, sampler=sampler,  num_workers=0)
    val_loader   = DataLoader(val_ds,   batch_size=args.batch, shuffle=False, num_workers=0)
    test_loader  = DataLoader(test_ds,  batch_size=args.batch, shuffle=False, num_workers=0)

    # ── Model ──────────────────────────────────────────────────────────────────
    model     = ECGNet(n_classes=n_classes, input_dim=input_dim).to(device)
    total_params = sum(p.numel() for p in model.parameters())
    print(f"\nECGNet parameters: {total_params:,}")

    # Class-weighted loss for minority class focus
    class_counts = Counter(y_train.tolist())
    class_weights_arr = np.array(
        [1.0 / class_counts[c] for c in classes], dtype=np.float32
    )
    class_weights_arr /= class_weights_arr.sum()
    criterion = nn.CrossEntropyLoss(
        weight=torch.from_numpy(class_weights_arr).to(device)
    )

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    # ── Training loop ──────────────────────────────────────────────────────────
    best_val_acc = 0.0
    best_state   = None

    print(f"\nTraining for {args.epochs} epochs ...\n")
    print(f"{'Epoch':>6}  {'Train Loss':>10}  {'Val Acc':>8}  {'LR':>10}  {'Time':>6}")
    print("-" * 50)

    for epoch in range(1, args.epochs + 1):
        model.train()
        epoch_loss = 0.0
        t0 = time.time()

        for X_batch, y_batch in train_loader:
            X_batch, y_batch = X_batch.to(device), y_batch.to(device)
            optimizer.zero_grad()
            logits = model(X_batch)
            loss   = criterion(logits, y_batch)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            epoch_loss += loss.item() * len(y_batch)

        scheduler.step()
        avg_loss = epoch_loss / len(train_ds)
        val_metrics = evaluate(model, val_loader, device)
        elapsed = time.time() - t0

        lr_now = optimizer.param_groups[0]["lr"]
        print(f"{epoch:>6}  {avg_loss:>10.4f}  {val_metrics['accuracy']:>8.4f}  {lr_now:>10.2e}  {elapsed:>5.1f}s")

        if val_metrics["accuracy"] > best_val_acc:
            best_val_acc = val_metrics["accuracy"]
            best_state   = {k: v.clone() for k, v in model.state_dict().items()}

    # ── Restore best checkpoint ────────────────────────────────────────────────
    if best_state:
        model.load_state_dict(best_state)
        print(f"\nRestored best checkpoint (val acc = {best_val_acc:.4f})")

    # ── Test set evaluation ────────────────────────────────────────────────────
    print("\n=== Test Set Evaluation ===")
    test_metrics = evaluate(model, test_loader, device)
    print(f"Test accuracy: {test_metrics['accuracy']:.4f}")

    # Per-class breakdown
    model.eval()
    all_preds, all_targets = [], []
    with torch.no_grad():
        for X_batch, y_batch in test_loader:
            logits = model(X_batch.to(device))
            all_preds.extend(logits.argmax(-1).cpu().tolist())
            all_targets.extend(y_batch.tolist())

    from sklearn.metrics import classification_report
    sys.path.insert(0, "D:\\Lib\\site-packages")
    import importlib
    sklearn_metrics = importlib.import_module("sklearn.metrics")
    print(sklearn_metrics.classification_report(
        all_targets, all_preds,
        target_names=classes,
        zero_division=0,
    ))

    # ── Save model ─────────────────────────────────────────────────────────────
    os.makedirs("model", exist_ok=True)
    save_path = "model/model.pt"

    # Save with metadata so the loader knows class order
    torch.save({
        "model_state_dict": model.state_dict(),
        "classes":          classes,
        "input_dim":        input_dim,
        "n_classes":        n_classes,
        "architecture":     "ECGNet",
    }, save_path)

    size_mb = os.path.getsize(save_path) / 1024 / 1024
    print(f"\n✅ Model saved to {save_path} ({size_mb:.1f} MB)")
    print("Set MODEL_PATH=model/model.pt in .env to use it.")
    print("\nIMPORTANT: Update model_service.py to load the checkpoint dict format.")
    print("See the comment in model_service.py _load_pytorch() about checkpoint dicts.")


if __name__ == "__main__":
    main()
