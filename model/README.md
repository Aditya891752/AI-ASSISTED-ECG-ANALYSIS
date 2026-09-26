# model/README.md
# Model Directory

Place your trained model file here before starting the API.

## Supported Formats

| File | Framework | How it's loaded |
|------|-----------|-----------------|
| `model.pkl` | scikit-learn (any joblib-serialized pipeline) | `joblib.load()` |
| `model.pt` | PyTorch `nn.Module` | `torch.load()` |

## Trained Model (included)

A `RandomForestClassifier` pipeline (`StandardScaler` + `RandomForest`) is
already trained on the MIT-BIH Arrhythmia Database and saved here as `model.pkl`.

```
Training set:  72,682 beats (oversampled for balance)
Test accuracy: 88%  (weighted F1)
Classes:       N (Normal), S (Supraventricular), V (Ventricular), F (Fusion)
Feature dim:   216 samples / beat  (200ms pre + 400ms post R-peak at 360 Hz)
```

## Retraining

```bash
# From ps03-ecg-backend/
python train_model.py                  # RandomForest (default, ~1 min)
python train_model.py --model gb       # GradientBoosting (slower, often better S/F recall)
python train_model.py --no-balanced    # Skip oversampling (faster, lower minority recall)
```

## Swapping to PyTorch

1. Train your model and save with `torch.save(model, "model/model.pt")`
2. Set `MODEL_PATH=model/model.pt` in `.env`
3. Restart the API — the loader auto-detects `.pt` vs `.pkl`

The model must:
- Accept `torch.Tensor` of shape `(N, 216)` (float32)
- Return logits of shape `(N, 4)` or `(N, 5)` (softmaxed internally)
