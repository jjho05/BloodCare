"""
BloodCare - Fase 2: Definición del Modelo LSTM
==============================================
Autor: BloodCare Dev Team
Descripción:
    Define la arquitectura del modelo de predicción de glucosa basada en
    LSTM apilado con cabeza de regresión puntual y cabeza de cuantiles
    para generación de intervalos de confianza.

    Arquitectura:
        Input  → [N, lookback=96, n_features=10]
        LSTM   → Stacked LSTM (2-3 capas) con Dropout
        Output → [N, horizon=12]  (regresión puntual)
               → [N, horizon=12, n_quantiles]  (intervalos de confianza)

Uso:
    from bloodcare_model import BloodCareLSTM, ModelConfig
    config = ModelConfig()
    model  = BloodCareLSTM(config)
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from dataclasses import dataclass, field
from pathlib import Path
import json
import logging

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════
# 1. CONFIGURACIÓN DEL MODELO
# ═══════════════════════════════════════════════════════════════

@dataclass
class ModelConfig:
    """
    Hiperparámetros del modelo BloodCare LSTM.
    Modifica estos valores para experimentar con la arquitectura.
    """
    # Dimensiones de entrada/salida
    n_features:    int   = 10          # Número de características (FEATURE_COLS)
    lookback_steps: int  = 96          # Pasos de historia (8 horas × 12 pasos/hora)
    horizon_steps:  int  = 12          # Pasos de predicción (6 horas × 2 pasos/hora)

    # Arquitectura LSTM
    hidden_size:   int   = 128         # Neuronas por capa LSTM
    num_layers:    int   = 2           # Capas LSTM apiladas
    bidirectional: bool  = False       # True = Bi-LSTM (más potente, más lento)
    dropout:       float = 0.2         # Dropout entre capas LSTM

    # Cabeza de regresión
    fc_hidden_size: int  = 64          # Neuronas en capa FC intermedia

    # Intervalos de confianza (Quantile Regression)
    use_quantiles:  bool = True
    quantiles: list      = field(
        default_factory=lambda: [0.1, 0.25, 0.5, 0.75, 0.9]
    )
    # q=0.1 y q=0.9 → intervalo de confianza del 80%
    # q=0.5          → mediana (predicción puntual alternativa)

    def save(self, path: Path) -> None:
        with open(path, "w") as f:
            json.dump(self.__dict__, f, indent=2)
        logger.info(f"Config guardada en {path}")

    @classmethod
    def load(cls, path: Path) -> "ModelConfig":
        with open(path) as f:
            data = json.load(f)
        return cls(**data)


# ═══════════════════════════════════════════════════════════════
# 2. ENCODER LSTM
# ═══════════════════════════════════════════════════════════════

class LSTMEncoder(nn.Module):
    """
    Codificador LSTM apilado que procesa la secuencia de entrada.

    Input:  (batch, lookback, n_features)
    Output: (batch, lstm_output_size)  — último estado oculto
    """

    def __init__(self, config: ModelConfig):
        super().__init__()
        self.config = config

        self.lstm = nn.LSTM(
            input_size    = config.n_features,
            hidden_size   = config.hidden_size,
            num_layers    = config.num_layers,
            dropout       = config.dropout if config.num_layers > 1 else 0.0,
            bidirectional = config.bidirectional,
            batch_first   = True,
        )

        # Dropout aplicado a la salida del LSTM
        self.dropout = nn.Dropout(config.dropout)

        # Tamaño de la salida: ×2 si bidireccional
        self.output_size = config.hidden_size * (2 if config.bidirectional else 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: (batch, lookback, n_features)
        Returns:
            context: (batch, output_size) — representación comprimida de la secuencia
        """
        # lstm_out: (batch, seq_len, hidden*directions)
        # h_n:      (num_layers*directions, batch, hidden)
        lstm_out, (h_n, _) = self.lstm(x)

        if self.config.bidirectional:
            # Concatenar último estado hacia adelante y hacia atrás
            # h_n[-2] = forward  última capa
            # h_n[-1] = backward última capa
            context = torch.cat([h_n[-2], h_n[-1]], dim=-1)
        else:
            context = h_n[-1]  # (batch, hidden_size)

        return self.dropout(context)


# ═══════════════════════════════════════════════════════════════
# 3. CABEZA DE REGRESIÓN PUNTUAL
# ═══════════════════════════════════════════════════════════════

class RegressionHead(nn.Module):
    """
    Proyecta el contexto del encoder hacia la predicción puntual de glucosa.

    Output: (batch, horizon_steps)  — valores de glucosa normalizados [0, 1]
    """

    def __init__(self, input_size: int, config: ModelConfig):
        super().__init__()

        self.net = nn.Sequential(
            nn.Linear(input_size, config.fc_hidden_size),
            nn.ReLU(),
            nn.Dropout(config.dropout),
            nn.Linear(config.fc_hidden_size, config.horizon_steps),
            nn.Sigmoid(),   # Salida en [0, 1] (Min-Max normalizado)
        )

    def forward(self, context: torch.Tensor) -> torch.Tensor:
        """
        Args:
            context: (batch, input_size)
        Returns:
            pred: (batch, horizon_steps)
        """
        return self.net(context)


# ═══════════════════════════════════════════════════════════════
# 4. CABEZA DE CUANTILES (INTERVALOS DE CONFIANZA)
# ═══════════════════════════════════════════════════════════════

class QuantileHead(nn.Module):
    """
    Genera múltiples cuantiles de la distribución predictiva.
    Permite construir intervalos de confianza calibrados.

    Output: (batch, horizon_steps, n_quantiles)
    """

    def __init__(self, input_size: int, config: ModelConfig):
        super().__init__()
        self.n_quantiles  = len(config.quantiles)
        self.horizon      = config.horizon_steps

        self.net = nn.Sequential(
            nn.Linear(input_size, config.fc_hidden_size),
            nn.ReLU(),
            nn.Dropout(config.dropout),
            nn.Linear(config.fc_hidden_size, self.horizon * self.n_quantiles),
            nn.Sigmoid(),
        )

    def forward(self, context: torch.Tensor) -> torch.Tensor:
        """
        Args:
            context: (batch, input_size)
        Returns:
            quantiles: (batch, horizon, n_quantiles)
        """
        out = self.net(context)                                    # (batch, horizon×n_q)
        return out.view(-1, self.horizon, self.n_quantiles)        # reshape


# ═══════════════════════════════════════════════════════════════
# 5. MODELO PRINCIPAL
# ═══════════════════════════════════════════════════════════════

class BloodCareLSTM(nn.Module):
    """
    Modelo principal de predicción de glucosa para BloodCare.

    Combina:
      - LSTMEncoder:     procesa la secuencia de historia
      - RegressionHead:  predicción puntual (valor esperado)
      - QuantileHead:    intervalos de confianza (opcional)

    Ejemplo de uso:
        config = ModelConfig()
        model  = BloodCareLSTM(config)

        x = torch.randn(32, 96, 10)  # batch=32
        pred, quantiles = model(x)
        # pred.shape      → (32, 12)
        # quantiles.shape → (32, 12, 5)
    """

    def __init__(self, config: ModelConfig):
        super().__init__()
        self.config = config

        self.encoder  = LSTMEncoder(config)
        self.reg_head = RegressionHead(self.encoder.output_size, config)

        self.quant_head = None
        if config.use_quantiles:
            self.quant_head = QuantileHead(self.encoder.output_size, config)

    def forward(
        self,
        x: torch.Tensor
    ) -> tuple[torch.Tensor, torch.Tensor | None]:
        """
        Args:
            x: (batch, lookback, n_features)

        Returns:
            pred:      (batch, horizon)        — predicción puntual
            quantiles: (batch, horizon, n_q)   — cuantiles, o None
        """
        context    = self.encoder(x)
        pred       = self.reg_head(context)
        quantiles  = self.quant_head(context) if self.quant_head else None

        return pred, quantiles

    # ── Utilidades ────────────────────────────────────────────

    def count_parameters(self) -> int:
        return sum(p.numel() for p in self.parameters() if p.requires_grad)

    def save(self, path: Path, config_path: Path | None = None) -> None:
        torch.save(self.state_dict(), path)
        logger.info(f"Modelo guardado en {path}")
        if config_path:
            self.config.save(config_path)

    @classmethod
    def load(cls, weights_path: Path, config_path: Path) -> "BloodCareLSTM":
        config = ModelConfig.load(config_path)
        model  = cls(config)
        model.load_state_dict(torch.load(weights_path, map_location="cpu"))
        model.eval()
        logger.info(f"Modelo cargado desde {weights_path}")
        return model

    def summary(self) -> None:
        dirs = "Bi-LSTM" if self.config.bidirectional else "LSTM"
        print("=" * 50)
        print(f"  BloodCare — {dirs} x{self.config.num_layers} capas")
        print("=" * 50)
        print(f"  Entrada     : ({self.config.lookback_steps}, {self.config.n_features})")
        print(f"  Hidden size : {self.config.hidden_size}")
        print(f"  Horizonte   : {self.config.horizon_steps} pasos (6 horas)")
        print(f"  Cuantiles   : {self.config.quantiles if self.config.use_quantiles else 'Desactivado'}")
        print(f"  Parámetros  : {self.count_parameters():,}")
        print("=" * 50)


# ═══════════════════════════════════════════════════════════════
# 6. PÉRDIDA DE CUANTILES (Pinball Loss)
# ═══════════════════════════════════════════════════════════════

class PinballLoss(nn.Module):
    """
    Función de pérdida para regresión de cuantiles (Quantile / Pinball Loss).

    Para cada cuantil τ ∈ (0,1):
        L(y, ŷ) = τ·max(y-ŷ, 0) + (1-τ)·max(ŷ-y, 0)

    Penaliza asimétricamente los errores según el cuantil objetivo.
    """

    def __init__(self, quantiles: list[float]):
        super().__init__()
        self.register_buffer(
            "quantiles",
            torch.tensor(quantiles, dtype=torch.float32)
        )

    def forward(
        self,
        pred_q: torch.Tensor,  # (batch, horizon, n_quantiles)
        target: torch.Tensor,  # (batch, horizon)
    ) -> torch.Tensor:
        # Expandir target para broadcast con n_quantiles
        target_exp = target.unsqueeze(-1)                    # (batch, horizon, 1)
        errors     = target_exp - pred_q                     # (batch, horizon, n_q)

        # Pinball loss por cuantil
        loss = torch.max(
            self.quantiles * errors,
            (self.quantiles - 1) * errors
        )                                                    # (batch, horizon, n_q)

        return loss.mean()


class CombinedLoss(nn.Module):
    """
    Pérdida combinada para entrenar simultáneamente:
      - MSE sobre la predicción puntual
      - Pinball loss sobre los cuantiles

    Args:
        quantiles:       Lista de cuantiles objetivo.
        mse_weight:      Peso de la pérdida MSE (default: 0.5).
        quantile_weight: Peso de la Pinball loss (default: 0.5).
    """

    def __init__(
        self,
        quantiles:       list[float],
        mse_weight:      float = 0.5,
        quantile_weight: float = 0.5,
    ):
        super().__init__()
        self.mse_weight      = mse_weight
        self.quantile_weight = quantile_weight
        self.mse_loss        = nn.MSELoss()
        self.pinball_loss    = PinballLoss(quantiles)

    def forward(
        self,
        pred:      torch.Tensor,          # (batch, horizon)
        pred_q:    torch.Tensor | None,   # (batch, horizon, n_q) o None
        target:    torch.Tensor,          # (batch, horizon)
    ) -> tuple[torch.Tensor, dict]:
        mse   = self.mse_loss(pred, target)
        total = self.mse_weight * mse

        losses = {"mse": mse.item()}

        if pred_q is not None:
            pinball        = self.pinball_loss(pred_q, target)
            total          = total + self.quantile_weight * pinball
            losses["pinball"] = pinball.item()

        losses["total"] = total.item()
        return total, losses


# ═══════════════════════════════════════════════════════════════
# 7. VERIFICACIÓN RÁPIDA
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    config = ModelConfig()
    model  = BloodCareLSTM(config)
    model.summary()

    # Tensor de prueba (batch=8, lookback=96, n_features=10)
    x_dummy = torch.randn(8, config.lookback_steps, config.n_features)

    pred, quantiles = model(x_dummy)
    print(f"\nForward pass OK:")
    print(f"  pred.shape      → {tuple(pred.shape)}")
    print(f"  quantiles.shape → {tuple(quantiles.shape)}")

    # Prueba de pérdida
    target   = torch.rand(8, config.horizon_steps)
    criterion = CombinedLoss(config.quantiles)
    loss, breakdown = criterion(pred, quantiles, target)

    print(f"\nLoss test OK:")
    for k, v in breakdown.items():
        print(f"  {k:10s}: {v:.6f}")
