"""
BloodCare - Fase 3: Entrenamiento y Validación con RMSE
=======================================================
Autor: BloodCare Dev Team
Descripción:
    Bucle de entrenamiento completo para el modelo BloodCareLSTM.
    Incluye:
      - DataLoader con split train/val (80/20 por paciente)
      - Early stopping
      - Learning rate scheduler
      - Métricas RMSE a 30 min y 60 min (estándares de la industria)
      - Guardado del mejor modelo (checkpoint)
      - Log de métricas por época

Requisitos:
    preprocessed/X_train.npy, y_train.npy  (salida de Fase 1)
    bloodcare_model.py                       (salida de Fase 2)

Uso:
    python bloodcare_train.py
"""

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, random_split
from pathlib import Path
import logging
import json
import time
import pickle

from bloodcare_model import BloodCareLSTM, ModelConfig, CombinedLoss

# ─────────────────────────────────────────────
# Configuración
# ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

PREPROCESSED_DIR = Path("preprocessed")
CHECKPOINT_DIR   = Path("checkpoints")
CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)

# Rango de glucosa para desnormalizar (Min-Max inverso)
GLUCOSE_MIN = 40.0   # mg/dL
GLUCOSE_MAX = 400.0  # mg/dL

# Índices en el horizonte de predicción (pasos de 5 min)
STEP_30MIN = 6    # índice 5 → paso 6  = 30 min
STEP_60MIN = 12   # índice 11 → paso 12 = 60 min


# ═══════════════════════════════════════════════════════════════
# 1. DATASET
# ═══════════════════════════════════════════════════════════════

class GlucoseDataset(Dataset):
    """
    Dataset PyTorch que envuelve los arrays X, y generados en Fase 1.

    Args:
        X: np.ndarray (N, lookback, n_features)
        y: np.ndarray (N, horizon)
    """

    def __init__(self, X: np.ndarray, y: np.ndarray):
        self.X = torch.from_numpy(X).float()
        self.y = torch.from_numpy(y).float()

    def __len__(self) -> int:
        return len(self.X)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor]:
        return self.X[idx], self.y[idx]


def build_dataloaders(
    X: np.ndarray,
    y: np.ndarray,
    val_split:  float = 0.176,   # 15/85 ≈ 17.6 % del pool train → reparte 70/15/15 global
    batch_size: int   = 64,
    num_workers: int  = 0,
) -> tuple[DataLoader, DataLoader]:
    """
    Divide el dataset en train/val y construye los DataLoaders.

    Split global objetivo: 70 % train · 15 % val · 15 % test.
    El 15 % de test ya vive en X_test.npy (separado en Fase 1).
    De los datos restantes (85 %), val_split=0.176 entrega exactamente
    15 pp de val y 70 pp de train sobre el total original.

    Args:
        X:           Features (N, lookback, n_features).
        y:           Targets  (N, horizon).
        val_split:   Fracción de val sobre el pool train (default 0.176).
        batch_size:  Tamaño del batch.
        num_workers: Hilos de carga (0 = proceso principal).

    Returns:
        (train_loader, val_loader)
    """
    dataset  = GlucoseDataset(X, y)
    val_size = int(len(dataset) * val_split)
    trn_size = len(dataset) - val_size

    train_ds, val_ds = random_split(
        dataset,
        [trn_size, val_size],
        generator=torch.Generator().manual_seed(42)
    )

    train_loader = DataLoader(
        train_ds, batch_size=batch_size,
        shuffle=True, num_workers=num_workers, pin_memory=True
    )
    val_loader = DataLoader(
        val_ds, batch_size=batch_size * 2,
        shuffle=False, num_workers=num_workers, pin_memory=True
    )

    logger.info(f"Train: {trn_size:,} muestras | Val: {val_size:,} muestras")
    return train_loader, val_loader


# ═══════════════════════════════════════════════════════════════
# 2. MÉTRICAS
# ═══════════════════════════════════════════════════════════════

def denormalize_glucose(x: torch.Tensor | np.ndarray) -> np.ndarray:
    """Invierte la normalización Min-Max sobre glucosa."""
    if isinstance(x, torch.Tensor):
        x = x.detach().cpu().numpy()
    return x * (GLUCOSE_MAX - GLUCOSE_MIN) + GLUCOSE_MIN


def compute_rmse(
    pred: np.ndarray,
    true: np.ndarray,
    step: int
) -> float:
    """
    RMSE en mg/dL para un horizonte específico.

    Args:
        pred: (N, horizon) — predicciones desnormalizadas
        true: (N, horizon) — valores reales desnormalizados
        step: índice del paso a evaluar (1-indexed)

    Returns:
        RMSE en mg/dL
    """
    idx = min(step - 1, pred.shape[1] - 1)
    return float(np.sqrt(np.mean((pred[:, idx] - true[:, idx]) ** 2)))


def compute_mae(pred: np.ndarray, true: np.ndarray) -> float:
    """MAE promedio sobre todo el horizonte."""
    return float(np.mean(np.abs(pred - true)))


# ═══════════════════════════════════════════════════════════════
# 3. EARLY STOPPING
# ═══════════════════════════════════════════════════════════════

class EarlyStopping:
    """
    Detiene el entrenamiento si la pérdida de validación no mejora
    durante `patience` épocas consecutivas.

    Args:
        patience:  Épocas de tolerancia sin mejora.
        min_delta: Mejora mínima para considerarse progreso.
        path:      Ruta donde guardar el mejor modelo.
    """

    def __init__(
        self,
        patience:  int   = 10,
        min_delta: float = 1e-4,
        path:      Path  = CHECKPOINT_DIR / "best_model.pt",
    ):
        self.patience   = patience
        self.min_delta  = min_delta
        self.path       = path
        self.best_loss  = float("inf")
        self.counter    = 0
        self.best_epoch = 0

    def step(self, val_loss: float, model: nn.Module) -> bool:
        """
        Returns:
            True si se debe detener el entrenamiento.
        """
        if val_loss < self.best_loss - self.min_delta:
            self.best_loss  = val_loss
            self.counter    = 0
            self.best_epoch = 0   # se actualiza externamente
            torch.save(model.state_dict(), self.path)
            logger.info(f"  ✓ Mejor modelo guardado (val_loss={val_loss:.5f})")
            return False

        self.counter += 1
        if self.counter >= self.patience:
            logger.info(f"  Early stopping activado tras {self.patience} épocas sin mejora.")
            return True
        return False


# ═══════════════════════════════════════════════════════════════
# 4. EPOCH LOOP
# ═══════════════════════════════════════════════════════════════

def train_one_epoch(
    model:     BloodCareLSTM,
    loader:    DataLoader,
    optimizer: torch.optim.Optimizer,
    criterion: CombinedLoss,
    device:    torch.device,
    scaler_amp: torch.cuda.amp.GradScaler | None,
) -> dict:
    """Ejecuta una época de entrenamiento. Retorna métricas del epoch."""
    model.train()
    total_loss = mse_acc = pinball_acc = 0.0

    for X_batch, y_batch in loader:
        X_batch = X_batch.to(device, non_blocking=True)
        y_batch = y_batch.to(device, non_blocking=True)

        optimizer.zero_grad()

        if scaler_amp is not None:
            with torch.cuda.amp.autocast():
                pred, quantiles = model(X_batch)
                loss, breakdown = criterion(pred, quantiles, y_batch)
            scaler_amp.scale(loss).backward()
            scaler_amp.unscale_(optimizer)
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            scaler_amp.step(optimizer)
            scaler_amp.update()
        else:
            pred, quantiles = model(X_batch)
            loss, breakdown = criterion(pred, quantiles, y_batch)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

        total_loss   += breakdown["total"]
        mse_acc      += breakdown["mse"]
        pinball_acc  += breakdown.get("pinball", 0.0)

    n = len(loader)
    return {
        "loss":    total_loss  / n,
        "mse":     mse_acc     / n,
        "pinball": pinball_acc / n,
    }


@torch.no_grad()
def validate(
    model:     BloodCareLSTM,
    loader:    DataLoader,
    criterion: CombinedLoss,
    device:    torch.device,
) -> dict:
    """Evaluación sobre el conjunto de validación. Retorna métricas."""
    model.eval()
    total_loss = 0.0
    all_pred, all_true = [], []

    for X_batch, y_batch in loader:
        X_batch = X_batch.to(device, non_blocking=True)
        y_batch = y_batch.to(device, non_blocking=True)

        pred, quantiles = model(X_batch)
        loss, breakdown = criterion(pred, quantiles, y_batch)
        total_loss += breakdown["total"]

        all_pred.append(pred.cpu())
        all_true.append(y_batch.cpu())

    # Concatenar todas las predicciones
    pred_np = denormalize_glucose(torch.cat(all_pred, dim=0).numpy())
    true_np = denormalize_glucose(torch.cat(all_true, dim=0).numpy())

    rmse_30 = compute_rmse(pred_np, true_np, step=STEP_30MIN)
    rmse_60 = compute_rmse(pred_np, true_np, step=STEP_60MIN)
    mae     = compute_mae(pred_np, true_np)

    return {
        "val_loss":  total_loss / len(loader),
        "rmse_30":   rmse_30,
        "rmse_60":   rmse_60,
        "mae":       mae,
    }


# ═══════════════════════════════════════════════════════════════
# 5. BUCLE PRINCIPAL DE ENTRENAMIENTO
# ═══════════════════════════════════════════════════════════════

def train(
    config:      ModelConfig | None = None,
    max_epochs:  int   = 100,
    batch_size:  int   = 64,
    lr:          float = 1e-3,
    val_split:   float = 0.176,  # 70 / 15 / 15 global
    patience:    int   = 10,
    use_amp:     bool  = True,   # Automatic Mixed Precision (solo GPU)
) -> BloodCareLSTM:
    """
    Entrenamiento completo del modelo BloodCareLSTM.

    Args:
        config:     Configuración del modelo. None = valores por defecto.
        max_epochs: Máximo de épocas.
        batch_size: Tamaño de batch.
        lr:         Learning rate inicial.
        val_split:  Fracción de datos para validación.
        patience:   Paciencia para early stopping.
        use_amp:    Usar Mixed Precision en GPU.

    Returns:
        Modelo entrenado con los mejores pesos cargados.
    """
    # ── Dispositivo ───────────────────────────────────────────
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Dispositivo: {device}")

    # ── Cargar datos ──────────────────────────────────────────
    logger.info("Cargando datos preprocesados...")
    X_train = np.load(PREPROCESSED_DIR / "X_train.npy")
    y_train = np.load(PREPROCESSED_DIR / "y_train.npy")
    logger.info(f"  X_train: {X_train.shape} | y_train: {y_train.shape}")

    # ── DataLoaders ───────────────────────────────────────────
    train_loader, val_loader = build_dataloaders(
        X_train, y_train, val_split=val_split, batch_size=batch_size
    )

    # ── Modelo ────────────────────────────────────────────────
    if config is None:
        config = ModelConfig(n_features=X_train.shape[2])

    model = BloodCareLSTM(config).to(device)
    model.summary()

    # ── Optimizador y scheduler ───────────────────────────────
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="min", factor=0.5, patience=5
    )

    # ── Pérdida ───────────────────────────────────────────────
    criterion = CombinedLoss(
        quantiles=config.quantiles,
        mse_weight=0.6,
        quantile_weight=0.4,
    )

    # ── AMP (solo CUDA) ───────────────────────────────────────
    scaler_amp = torch.cuda.amp.GradScaler() if (use_amp and device.type == "cuda") else None

    # ── Early stopping ────────────────────────────────────────
    early_stop = EarlyStopping(
        patience=patience,
        path=CHECKPOINT_DIR / "best_model.pt"
    )

    # ── Historial ─────────────────────────────────────────────
    history = []
    best_metrics = {}

    logger.info("\n" + "═" * 60)
    logger.info("Iniciando entrenamiento...")
    logger.info("=" * 60)
    logger.info(f"{'Época':>6} {'Loss':>10} {'Val Loss':>10} "
                f"{'RMSE@30':>9} {'RMSE@60':>9} {'LR':>10}")
    logger.info("-" * 60)

    t0 = time.time()

    for epoch in range(1, max_epochs + 1):
        # ── Train ──────────────────────────────────────────────
        train_metrics = train_one_epoch(
            model, train_loader, optimizer, criterion, device, scaler_amp
        )

        # ── Validación ─────────────────────────────────────────
        val_metrics = validate(model, val_loader, criterion, device)

        # ── Scheduler ──────────────────────────────────────────
        scheduler.step(val_metrics["val_loss"])
        current_lr = optimizer.param_groups[0]["lr"]

        # ── Log ────────────────────────────────────────────────
        logger.info(
            f"{epoch:>6} {train_metrics['loss']:>10.5f} "
            f"{val_metrics['val_loss']:>10.5f} "
            f"{val_metrics['rmse_30']:>8.2f}m "
            f"{val_metrics['rmse_60']:>8.2f}m "
            f"{current_lr:>10.2e}"
        )

        # Alertas de métricas objetivo (estándares de la industria)
        if val_metrics["rmse_30"] < 15.0:
            logger.info("  🎯 RMSE@30 < 15 mg/dL — objetivo alcanzado")
        if val_metrics["rmse_60"] < 26.0:
            logger.info("  🎯 RMSE@60 < 26 mg/dL — objetivo alcanzado")

        # ── Historial ──────────────────────────────────────────
        row = {"epoch": epoch, **train_metrics, **val_metrics, "lr": current_lr}
        history.append(row)

        if val_metrics["val_loss"] <= min(h["val_loss"] for h in history):
            best_metrics = val_metrics.copy()
            best_metrics["epoch"] = epoch

        # ── Early stopping ─────────────────────────────────────
        if early_stop.step(val_metrics["val_loss"], model):
            break

    # ── Resultados finales ────────────────────────────────────
    elapsed = time.time() - t0
    logger.info("=" * 60)
    logger.info(f"Entrenamiento completado en {elapsed/60:.1f} min")
    logger.info(f"Mejor época: {best_metrics.get('epoch', '?')}")
    logger.info(f"  Val loss : {best_metrics.get('val_loss', 0):.5f}")
    logger.info(f"  RMSE@30  : {best_metrics.get('rmse_30', 0):.2f} mg/dL  (objetivo <15)")
    logger.info(f"  RMSE@60  : {best_metrics.get('rmse_60', 0):.2f} mg/dL  (objetivo <26)")
    logger.info(f"  MAE      : {best_metrics.get('mae', 0):.2f} mg/dL")

    # ── Guardar historial y config ────────────────────────────
    history_path = CHECKPOINT_DIR / "history.json"
    with open(history_path, "w") as f:
        json.dump(history, f, indent=2)
    logger.info(f"Historial guardado en {history_path}")

    config.save(CHECKPOINT_DIR / "config.json")

    # ── Cargar mejores pesos ──────────────────────────────────
    model.load_state_dict(
        torch.load(CHECKPOINT_DIR / "best_model.pt", map_location=device)
    )
    model.eval()

    return model


# ═══════════════════════════════════════════════════════════════
# 6. EVALUACIÓN SOBRE TEST SET
# ═══════════════════════════════════════════════════════════════

@torch.no_grad()
def evaluate_test(
    model:  BloodCareLSTM,
    device: torch.device | None = None,
) -> dict:
    """
    Evalúa el modelo sobre el conjunto de test cargado desde disco.

    Returns:
        Diccionario con RMSE@30, RMSE@60 y MAE sobre test.
    """
    if device is None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    X_test = np.load(PREPROCESSED_DIR / "X_test.npy")
    y_test = np.load(PREPROCESSED_DIR / "y_test.npy")

    if X_test.size == 0:
        logger.warning("X_test vacío. Saltando evaluación sobre test.")
        return {}

    dataset     = GlucoseDataset(X_test, y_test)
    test_loader = DataLoader(dataset, batch_size=128, shuffle=False)

    model.eval().to(device)
    all_pred, all_true = [], []

    for X_batch, y_batch in test_loader:
        pred, _ = model(X_batch.to(device))
        all_pred.append(pred.cpu())
        all_true.append(y_batch)

    pred_np = denormalize_glucose(torch.cat(all_pred).numpy())
    true_np = denormalize_glucose(torch.cat(all_true).numpy())

    results = {
        "rmse_30": compute_rmse(pred_np, true_np, step=STEP_30MIN),
        "rmse_60": compute_rmse(pred_np, true_np, step=STEP_60MIN),
        "mae":     compute_mae(pred_np, true_np),
    }

    logger.info("\n── Resultados en Test Set ──")
    logger.info(f"  RMSE@30 : {results['rmse_30']:.2f} mg/dL  (objetivo <15)")
    logger.info(f"  RMSE@60 : {results['rmse_60']:.2f} mg/dL  (objetivo <26)")
    logger.info(f"  MAE     : {results['mae']:.2f} mg/dL")

    return results


# ═══════════════════════════════════════════════════════════════
# 7. ENTRY POINT
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    model = train(
        max_epochs = 100,
        batch_size = 64,
        lr         = 1e-3,
        patience   = 10,
    )
    evaluate_test(model)
