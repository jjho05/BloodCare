"""
BloodCare - Fase 4: Intervalos de Confianza e Incertidumbre
===========================================================
Autor: BloodCare Dev Team
Descripción:
    Módulo de estimación de incertidumbre que combina tres estrategias:

      1. Quantile Regression       — bandas asimétricas directas del modelo
      2. Monte Carlo Dropout       — incertidumbre epistémica vía muestreo
      3. Conformal Prediction      — cobertura estadísticamente garantizada

    La salida unificada es un objeto PredictionBand con:
      - Valor puntual (mediana)
      - Límite inferior / superior por horizonte
      - Nivel de confianza calibrado

Uso:
    from bloodcare_uncertainty import UncertaintyEstimator, PredictionBand
    estimator = UncertaintyEstimator(model, method="combined")
    band = estimator.predict(x_window)
"""

import numpy as np
import torch
import torch.nn as nn
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal
import logging
import json

from bloodcare_model import BloodCareLSTM, ModelConfig

logger = logging.getLogger(__name__)

GLUCOSE_MIN = 40.0
GLUCOSE_MAX = 400.0


# ═══════════════════════════════════════════════════════════════
# 1. ESTRUCTURA DE SALIDA
# ═══════════════════════════════════════════════════════════════

@dataclass
class PredictionBand:
    """
    Resultado completo de una predicción con incertidumbre.

    Atributos (todos en mg/dL, longitud = horizon_steps):
        point:       Predicción puntual (media o mediana).
        lower:       Límite inferior del intervalo de confianza.
        upper:       Límite superior del intervalo de confianza.
        quantiles:   Dict {q: array} con todos los cuantiles disponibles.
        confidence:  Nivel de confianza nominal del intervalo (ej. 0.8).
        method:      Método utilizado para la estimación.
        timestamps:  Etiquetas de tiempo futuras (opcionales, en minutos).
    """
    point:      np.ndarray
    lower:      np.ndarray
    upper:      np.ndarray
    quantiles:  dict[float, np.ndarray]
    confidence: float
    method:     str
    timestamps: np.ndarray = field(
        default_factory=lambda: np.arange(30, 391, 30)  # 30 min a 360 min
    )

    def width(self) -> np.ndarray:
        """Ancho del intervalo por paso (incertidumbre total)."""
        return self.upper - self.lower

    def to_dict(self) -> dict:
        return {
            "point":      self.point.tolist(),
            "lower":      self.lower.tolist(),
            "upper":      self.upper.tolist(),
            "width":      self.width().tolist(),
            "confidence": self.confidence,
            "method":     self.method,
            "timestamps": self.timestamps.tolist(),
            "quantiles":  {str(k): v.tolist() for k, v in self.quantiles.items()},
        }

    def save(self, path: Path) -> None:
        with open(path, "w") as f:
            json.dump(self.to_dict(), f, indent=2)


# ═══════════════════════════════════════════════════════════════
# 2. UTILIDADES
# ═══════════════════════════════════════════════════════════════

def denorm(x: np.ndarray) -> np.ndarray:
    """Invierte normalización Min-Max a mg/dL."""
    return x * (GLUCOSE_MAX - GLUCOSE_MIN) + GLUCOSE_MIN


def norm(x: np.ndarray) -> np.ndarray:
    """Normaliza mg/dL a [0, 1]."""
    return (x - GLUCOSE_MIN) / (GLUCOSE_MAX - GLUCOSE_MIN)


def enable_dropout(model: nn.Module) -> None:
    """Activa capas Dropout durante inferencia (necesario para MC Dropout)."""
    for m in model.modules():
        if isinstance(m, nn.Dropout):
            m.train()


# ═══════════════════════════════════════════════════════════════
# 3. MÉTODO 1 — QUANTILE REGRESSION
# ═══════════════════════════════════════════════════════════════

class QuantileIntervals:
    """
    Extrae intervalos de confianza directamente de la cabeza de cuantiles
    del modelo BloodCareLSTM (entrenada con Pinball Loss en Fase 3).

    Ventajas:  Rápido, sin muestreo adicional.
    Limitación: Sólo captura incertidumbre aleatoria (no epistémica).
    """

    def __init__(self, model: BloodCareLSTM, config: ModelConfig):
        self.model     = model
        self.quantiles = config.quantiles   # ej. [0.1, 0.25, 0.5, 0.75, 0.9]

        # Mapear cuantiles a índices del tensor de salida
        self.q_idx = {q: i for i, q in enumerate(self.quantiles)}

    @torch.no_grad()
    def predict(
        self,
        x: torch.Tensor,           # (1, lookback, n_features)
        confidence: float = 0.8,   # intervalo 80 % → q=0.1 a q=0.9
    ) -> PredictionBand:
        self.model.eval()
        pred, q_out = self.model(x)  # q_out: (1, horizon, n_q)

        if q_out is None:
            raise RuntimeError("El modelo no tiene cabeza de cuantiles activa.")

        pred_np  = denorm(pred.squeeze(0).cpu().numpy())    # (horizon,)
        q_np     = denorm(q_out.squeeze(0).cpu().numpy())   # (horizon, n_q)

        # Seleccionar límites según nivel de confianza
        alpha  = (1 - confidence) / 2
        q_low  = round(alpha, 2)
        q_high = round(1 - alpha, 2)

        # Usar cuantiles disponibles más cercanos
        available = sorted(self.quantiles)
        q_low_use  = min(available, key=lambda q: abs(q - q_low))
        q_high_use = min(available, key=lambda q: abs(q - q_high))

        lower = q_np[:, self.q_idx[q_low_use]]
        upper = q_np[:, self.q_idx[q_high_use]]

        # Mediana como predicción puntual alternativa
        if 0.5 in self.q_idx:
            point = q_np[:, self.q_idx[0.5]]
        else:
            point = pred_np

        all_quantiles = {q: q_np[:, i] for q, i in self.q_idx.items()}

        return PredictionBand(
            point=point, lower=lower, upper=upper,
            quantiles=all_quantiles, confidence=confidence,
            method="quantile_regression",
        )


# ═══════════════════════════════════════════════════════════════
# 4. MÉTODO 2 — MONTE CARLO DROPOUT
# ═══════════════════════════════════════════════════════════════

class MCDropoutIntervals:
    """
    Estima incertidumbre epistémica realizando T forward passes con
    Dropout activo durante inferencia (Gal & Ghahramani, 2016).

    Ventajas:  Captura incertidumbre epistémica (cuánto sabe el modelo).
    Limitación: Más lento; requiere T muestras por predicción.
    """

    def __init__(self, model: BloodCareLSTM, n_samples: int = 50):
        self.model     = model
        self.n_samples = n_samples

    def predict(
        self,
        x: torch.Tensor,
        confidence: float = 0.8,
    ) -> PredictionBand:
        self.model.eval()
        enable_dropout(self.model)   # Dropout ON durante inferencia

        samples = []
        with torch.no_grad():
            for _ in range(self.n_samples):
                pred, _ = self.model(x)
                samples.append(pred.squeeze(0).cpu().numpy())

        samples_np = np.stack(samples, axis=0)     # (T, horizon)
        samples_dn = denorm(samples_np)             # desnormalizar

        alpha = (1 - confidence) / 2
        lower = np.quantile(samples_dn, alpha,     axis=0)
        upper = np.quantile(samples_dn, 1 - alpha, axis=0)
        point = np.mean(samples_dn, axis=0)
        std   = np.std(samples_dn, axis=0)

        # Cuantiles completos
        q_levels   = [0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95]
        all_quants = {q: np.quantile(samples_dn, q, axis=0) for q in q_levels}

        logger.debug(f"MC Dropout: T={self.n_samples} | std_mean={std.mean():.2f} mg/dL")

        return PredictionBand(
            point=point, lower=lower, upper=upper,
            quantiles=all_quants, confidence=confidence,
            method="mc_dropout",
        )


# ═══════════════════════════════════════════════════════════════
# 5. MÉTODO 3 — CONFORMAL PREDICTION
# ═══════════════════════════════════════════════════════════════

class ConformalIntervals:
    """
    Calibra los intervalos del modelo usando Conformal Prediction
    (Papadopoulos et al. / Angelopoulos & Bates, 2022).

    Garantía estadística: P(y ∈ [lower, upper]) ≥ 1 - α
    bajo la asunción de intercambiabilidad del set de calibración.

    Flujo:
        1. calibrate(X_cal, y_cal) — calcula residuos en val set
        2. predict(x)              — aplica corrección basada en cuantil
    """

    def __init__(self, base_model: BloodCareLSTM):
        self.model    = base_model
        self.q_hat    = None    # Cuantil de corrección por horizonte
        self.is_fit   = False

    @torch.no_grad()
    def calibrate(
        self,
        X_cal: np.ndarray,    # (N, lookback, n_features)
        y_cal: np.ndarray,    # (N, horizon)
        confidence: float = 0.8,
        device: torch.device | None = None,
    ) -> np.ndarray:
        """
        Calcula los cuantiles de corrección sobre el set de calibración.

        Args:
            X_cal:      Features del conjunto de calibración (val set).
            y_cal:      Targets reales desnormalizados (mg/dL).
            confidence: Nivel de cobertura deseado.
            device:     Dispositivo de cómputo.

        Returns:
            q_hat: Array (horizon,) con corrección por paso.
        """
        if device is None:
            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        self.model.eval().to(device)
        alpha = 1 - confidence

        x_t = torch.from_numpy(X_cal).float().to(device)
        pred, _ = self.model(x_t)
        pred_np = denorm(pred.cpu().numpy())     # (N, horizon)
        true_np = denorm(y_cal)                  # (N, horizon)

        # Puntuación de no conformidad: error absoluto por horizonte
        scores = np.abs(pred_np - true_np)       # (N, horizon)

        # Cuantil (1-α)(1 + 1/N) — corrección finita
        N      = len(scores)
        level  = np.ceil((1 - alpha) * (N + 1)) / N
        level  = min(level, 1.0)

        self.q_hat     = np.quantile(scores, level, axis=0)  # (horizon,)
        self.is_fit    = True
        self.confidence = confidence

        logger.info(f"Conformal calibrado | q_hat medio: {self.q_hat.mean():.2f} mg/dL")
        return self.q_hat

    @torch.no_grad()
    def predict(
        self,
        x: torch.Tensor,
        confidence: float | None = None,
    ) -> PredictionBand:
        if not self.is_fit:
            raise RuntimeError("Llama a calibrate() antes de predict().")

        self.model.eval()
        pred, q_out = self.model(x)
        pred_np = denorm(pred.squeeze(0).cpu().numpy())  # (horizon,)

        lower = pred_np - self.q_hat
        upper = pred_np + self.q_hat

        # Cuantiles del modelo como referencia visual
        all_quants = {}
        if q_out is not None:
            q_np = denorm(q_out.squeeze(0).cpu().numpy())
            for i, q in enumerate(self.model.config.quantiles):
                all_quants[q] = q_np[:, i]

        return PredictionBand(
            point=pred_np, lower=lower, upper=upper,
            quantiles=all_quants,
            confidence=confidence or self.confidence,
            method="conformal_prediction",
        )

    def save_calibration(self, path: Path) -> None:
        np.save(path, self.q_hat)
        logger.info(f"Calibración conformal guardada en {path}")

    def load_calibration(self, path: Path) -> None:
        self.q_hat  = np.load(path)
        self.is_fit = True
        logger.info(f"Calibración conformal cargada desde {path}")


# ═══════════════════════════════════════════════════════════════
# 6. ESTIMADOR UNIFICADO
# ═══════════════════════════════════════════════════════════════

class UncertaintyEstimator:
    """
    Interfaz única para los tres métodos de incertidumbre.
    Selecciona o combina los métodos según la configuración.

    Args:
        model:      Modelo BloodCareLSTM entrenado.
        method:     "quantile" | "mc_dropout" | "conformal" | "combined"
        mc_samples: Número de muestras MC Dropout (si aplica).
        confidence: Nivel de confianza del intervalo (default: 0.8).
    """

    def __init__(
        self,
        model:      BloodCareLSTM,
        method:     Literal["quantile", "mc_dropout", "conformal", "combined"] = "combined",
        mc_samples: int   = 50,
        confidence: float = 0.8,
    ):
        self.method     = method
        self.confidence = confidence
        self.config     = model.config

        self.quantile_est  = QuantileIntervals(model, model.config)
        self.mc_est        = MCDropoutIntervals(model, n_samples=mc_samples)
        self.conformal_est = ConformalIntervals(model)

    def calibrate_conformal(
        self,
        X_cal: np.ndarray,
        y_cal: np.ndarray,
        device: torch.device | None = None,
    ) -> None:
        """Calibra el método conformal con el val set. Llamar antes de predict."""
        self.conformal_est.calibrate(X_cal, y_cal, self.confidence, device)

    def predict(
        self,
        x: np.ndarray | torch.Tensor,
        confidence: float | None = None,
    ) -> PredictionBand:
        """
        Genera predicción con intervalo de confianza.

        Args:
            x:          Ventana de entrada (lookback, n_features) o
                        (1, lookback, n_features).
            confidence: Override del nivel de confianza.

        Returns:
            PredictionBand con valores en mg/dL.
        """
        conf = confidence or self.confidence

        # Asegurar shape (1, lookback, n_features)
        if isinstance(x, np.ndarray):
            x = torch.from_numpy(x).float()
        if x.dim() == 2:
            x = x.unsqueeze(0)

        if self.method == "quantile":
            return self.quantile_est.predict(x, conf)

        elif self.method == "mc_dropout":
            return self.mc_est.predict(x, conf)

        elif self.method == "conformal":
            return self.conformal_est.predict(x, conf)

        elif self.method == "combined":
            return self._combined_predict(x, conf)

        else:
            raise ValueError(f"Método desconocido: {self.method}")

    def _combined_predict(
        self,
        x: torch.Tensor,
        confidence: float,
    ) -> PredictionBand:
        """
        Combina MC Dropout y Conformal Prediction:
          - Punto central: media MC Dropout
          - Banda: max(MC banda, Conformal banda) por horizonte
        Provee cobertura más robusta que cualquier método individual.
        """
        mc_band = self.mc_est.predict(x, confidence)

        if self.conformal_est.is_fit:
            cf_band = self.conformal_est.predict(x, confidence)
            # Tomar el intervalo más conservador (más amplio)
            lower = np.minimum(mc_band.lower, cf_band.lower)
            upper = np.maximum(mc_band.upper, cf_band.upper)
        else:
            logger.warning("Conformal no calibrado. Usando solo MC Dropout.")
            lower = mc_band.lower
            upper = mc_band.upper

        return PredictionBand(
            point=mc_band.point, lower=lower, upper=upper,
            quantiles=mc_band.quantiles, confidence=confidence,
            method="combined",
        )


# ═══════════════════════════════════════════════════════════════
# 7. VERIFICACIÓN RÁPIDA
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import numpy as np

    # Modelo dummy para prueba
    config = ModelConfig(n_features=10, lookback_steps=96, horizon_steps=12)
    model  = BloodCareLSTM(config)

    estimator = UncertaintyEstimator(model, method="combined", mc_samples=30)

    # Simular calibración conformal con datos dummy
    X_cal = np.random.rand(200, 96, 10).astype(np.float32)
    y_cal = np.random.rand(200, 12).astype(np.float32)
    estimator.calibrate_conformal(X_cal, y_cal)

    # Predicción con incertidumbre
    x_sample = np.random.rand(96, 10).astype(np.float32)
    band      = estimator.predict(x_sample, confidence=0.8)

    print(f"\nMétodo       : {band.method}")
    print(f"Confianza    : {band.confidence * 100:.0f}%")
    print(f"Punto @30min : {band.point[5]:.1f} mg/dL")
    print(f"Intervalo    : [{band.lower[5]:.1f}, {band.upper[5]:.1f}] mg/dL")
    print(f"Ancho medio  : {band.width().mean():.1f} mg/dL")
    print(f"\nPaso a paso (mg/dL):")
    print(f"  {'Min':>6} {'Pred':>6} {'Tmps':>6}  {'Lower':>6} {'Upper':>6} {'Width':>6}")
    for i, t in enumerate(band.timestamps):
        print(f"  {t:>5}m  {band.point[i]:>6.1f}  "
              f"{band.lower[i]:>6.1f}  {band.upper[i]:>6.1f}  {band.width()[i]:>6.1f}")
