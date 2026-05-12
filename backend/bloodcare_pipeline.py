"""
BloodCare - Pipeline Maestro
============================
Autor: BloodCare Dev Team
Descripción:
    Punto de entrada único que orquesta los 5 módulos del Roadmap:

      Fase 1 → bloodcare_preprocessing.py   (preprocesamiento OhioT1DM)
      Fase 2 → bloodcare_model.py           (arquitectura LSTM)
      Fase 3 → bloodcare_train.py           (entrenamiento + RMSE)
      Fase 4 → bloodcare_uncertainty.py     (intervalos de confianza)
      Fase 5 → bloodcare_nlg.py             (narrativa en lenguaje natural)

    Modos de ejecución:
      --mode train     Preprocesa datos y entrena el modelo desde cero.
      --mode predict   Carga modelo entrenado y genera una predicción demo.
      --mode full      Ejecuta train + predict en secuencia.

Uso:
    python bloodcare_pipeline.py --mode train
    python bloodcare_pipeline.py --mode predict
    python bloodcare_pipeline.py --mode full
"""

import argparse
import logging
import time
import json
import numpy as np
import torch
import pickle
from pathlib import Path

# ── Módulos BloodCare ──────────────────────────────────────────
from bloodcare_preprocessing import run_full_pipeline, TRAIN_DIR, TEST_DIR
from bloodcare_model          import BloodCareLSTM, ModelConfig
from bloodcare_train          import train, evaluate_test
from bloodcare_uncertainty    import UncertaintyEstimator, PredictionBand
from bloodcare_nlg            import NarrativeEngine, PatientContext

# ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

# Rutas estándar
PREPROCESSED_DIR = Path("preprocessed")
CHECKPOINT_DIR   = Path("checkpoints")
OUTPUT_DIR       = Path("outputs")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ═══════════════════════════════════════════════════════════════
# FASE 1 + 3 — ENTRENAMIENTO COMPLETO
# ═══════════════════════════════════════════════════════════════

def phase_train() -> BloodCareLSTM:
    """
    Ejecuta Fase 1 (preprocesamiento) y Fase 3 (entrenamiento).
    Guarda modelo, config y scaler en disco.

    Returns:
        Modelo entrenado con los mejores pesos.
    """
    logger.info("╔══════════════════════════════════════╗")
    logger.info("║  BloodCare  |  Modo: TRAIN            ║")
    logger.info("╚══════════════════════════════════════╝")
    t0 = time.time()

    # ── Fase 1: Preprocesamiento ──────────────────────────────
    logger.info("\n── Fase 1: Preprocesamiento ──────────────────────────")
    data = run_full_pipeline(train_dir=TRAIN_DIR, test_dir=TEST_DIR)

    # ── Fase 2: Configuración del modelo ─────────────────────
    logger.info("\n── Fase 2: Configuración del Modelo ─────────────────")
    n_features = data["X_train"].shape[2]
    config = ModelConfig(
        n_features     = n_features,
        lookback_steps = data["X_train"].shape[1],
        horizon_steps  = data["y_train"].shape[1],
        hidden_size    = 128,
        num_layers     = 2,
        bidirectional  = False,
        dropout        = 0.2,
        use_quantiles  = True,
        quantiles      = [0.1, 0.25, 0.5, 0.75, 0.9],
    )

    # ── Fase 3: Entrenamiento ─────────────────────────────────
    logger.info("\n── Fase 3: Entrenamiento ─────────────────────────────")
    model = train(
        config     = config,
        max_epochs = 100,
        batch_size = 64,
        lr         = 1e-3,
        val_split  = 0.176,   # 70 / 15 / 15
        patience   = 10,
    )

    # ── Evaluación en test ────────────────────────────────────
    logger.info("\n── Evaluación en Test Set ────────────────────────────")
    test_metrics = evaluate_test(model)

    # Guardar métricas finales
    metrics_path = CHECKPOINT_DIR / "test_metrics.json"
    with open(metrics_path, "w") as f:
        json.dump(test_metrics, f, indent=2)
    logger.info(f"Métricas guardadas en {metrics_path}")

    elapsed = (time.time() - t0) / 60
    logger.info(f"\n✅ Entrenamiento completado en {elapsed:.1f} min")
    return model


# ═══════════════════════════════════════════════════════════════
# FASE 4 + 5 — PREDICCIÓN CON NARRATIVA
# ═══════════════════════════════════════════════════════════════

def phase_predict(model: BloodCareLSTM | None = None) -> dict:
    """
    Carga el modelo entrenado (o usa el provisto) y genera una
    predicción completa con intervalos de confianza y narrativa.

    Args:
        model: Modelo ya entrenado (None = carga desde checkpoint).

    Returns:
        Diccionario con band, narrative y métricas de la predicción.
    """
    logger.info("╔══════════════════════════════════════╗")
    logger.info("║  BloodCare  |  Modo: PREDICT          ║")
    logger.info("╚══════════════════════════════════════╝")

    # ── Cargar modelo si no fue provisto ──────────────────────
    if model is None:
        config_path  = CHECKPOINT_DIR / "config.json"
        weights_path = CHECKPOINT_DIR / "best_model.pt"
        if not config_path.exists() or not weights_path.exists():
            raise FileNotFoundError(
                "No se encontraron checkpoints. Ejecuta primero --mode train."
            )
        model = BloodCareLSTM.load(weights_path, config_path)
        logger.info("Modelo cargado desde checkpoint.")

    model.eval()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model  = model.to(device)

    # ── Cargar datos para calibración conformal ───────────────
    X_train = np.load(PREPROCESSED_DIR / "X_train.npy")
    y_train = np.load(PREPROCESSED_DIR / "y_train.npy")

    # Usar el 15% final como conjunto de calibración (val set)
    cal_size = int(len(X_train) * 0.176)
    X_cal    = X_train[-cal_size:]
    y_cal    = y_train[-cal_size:]

    # ── Fase 4: Estimación de incertidumbre ───────────────────
    logger.info("\n── Fase 4: Intervalos de Confianza ───────────────────")
    estimator = UncertaintyEstimator(
        model      = model,
        method     = "combined",
        mc_samples = 50,
        confidence = 0.80,
    )
    estimator.calibrate_conformal(X_cal, y_cal, device=device)
    logger.info("Calibración conformal completada.")

    # Muestra aleatoria de test para demo
    X_test = np.load(PREPROCESSED_DIR / "X_test.npy")
    y_test = np.load(PREPROCESSED_DIR / "y_test.npy")

    if X_test.size == 0:
        # Fallback a último sample de train si no hay test
        x_sample = X_train[-1]
        y_true   = y_train[-1]
    else:
        idx      = np.random.randint(0, len(X_test))
        x_sample = X_test[idx]
        y_true   = y_test[idx]

    band: PredictionBand = estimator.predict(x_sample, confidence=0.80)

    # ── Fase 5: Narrativa NLG ─────────────────────────────────
    logger.info("\n── Fase 5: Narrativa NLG ─────────────────────────────")
    context = PatientContext(
        current_glucose     = float(band.point[0]),
        minutes_since_meal  = 45.0,   # demo
        last_meal_carbs     = 60.0,
        minutes_since_bolus = 50.0,
        last_bolus_units    = 4.0,
        activity_level      = "low",
    )

    engine    = NarrativeEngine(lang="es")
    narrative = engine.generate(band, context)

    # ── Mostrar resultado ─────────────────────────────────────
    logger.info("\n" + "═" * 60)
    logger.info("RESULTADO DE PREDICCIÓN")
    logger.info("═" * 60)
    print(f"\n{narrative.full_text}\n")

    # ── RMSE de esta predicción ───────────────────────────────
    from bloodcare_train import denormalize_glucose, compute_rmse
    pred_np = band.point.reshape(1, -1)
    true_np = denormalize_glucose(y_true).reshape(1, -1)
    rmse_30 = compute_rmse(pred_np, true_np, step=6)
    rmse_60 = compute_rmse(pred_np, true_np, step=12)
    logger.info(f"RMSE@30min (muestra): {rmse_30:.2f} mg/dL")
    logger.info(f"RMSE@60min (muestra): {rmse_60:.2f} mg/dL")

    # ── Guardar salida ────────────────────────────────────────
    output = {
        "narrative": narrative.to_dict(),
        "prediction": band.to_dict(),
        "sample_rmse": {"rmse_30": rmse_30, "rmse_60": rmse_60},
    }
    out_path = OUTPUT_DIR / "prediction_output.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    logger.info(f"Salida guardada en {out_path}")

    return output


# ═══════════════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════════════

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="BloodCare — Motor de Predicción de Glucosa"
    )
    parser.add_argument(
        "--mode",
        choices=["train", "predict", "full"],
        default="full",
        help="Modo de ejecución (default: full)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    logger.info("╔══════════════════════════════════════════════╗")
    logger.info("║           BloodCare  v1.0  — Pipeline        ║")
    logger.info("╚══════════════════════════════════════════════╝\n")

    if args.mode == "train":
        phase_train()

    elif args.mode == "predict":
        phase_predict()

    elif args.mode == "full":
        model = phase_train()
        phase_predict(model=model)

    logger.info("\n✅ Pipeline finalizado.")


if __name__ == "__main__":
    main()
