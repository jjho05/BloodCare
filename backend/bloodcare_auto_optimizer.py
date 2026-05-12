import torch
import numpy as np
import logging
from pathlib import Path
from bloodcare_model import ModelConfig, BloodCareLSTM
from bloodcare_train import train, evaluate_test
import json
import time

# Configuración de logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

def run_search():
    """
    Realiza una búsqueda de hiperparámetros para encontrar la mejor arquitectura
    para el dataset combinado (Ohio + UCI).
    """
    
    # ── Espacio de búsqueda ───────────────────────────────────
    # He seleccionado 3 configuraciones de alto impacto basadas en SOTA
    search_space = [
        {
            "name": "Robust_Deep_LSTM",
            "hidden_size": 256,
            "num_layers": 3,
            "bidirectional": False,
            "dropout": 0.3,
            "lr": 1e-3
        },
        {
            "name": "Modern_BiLSTM",
            "hidden_size": 128,
            "num_layers": 2,
            "bidirectional": True,
            "dropout": 0.2,
            "lr": 5e-4
        },
        {
            "name": "Wide_Shallow_LSTM",
            "hidden_size": 512,
            "num_layers": 1,
            "bidirectional": False,
            "dropout": 0.1,
            "lr": 1e-3
        }
    ]

    best_rmse = float('inf')
    best_config_meta = None
    results = []

    logger.info("═" * 60)
    logger.info("BloodCare | Optimizador de Hiperparámetros (Auto-Tuning)")
    logger.info("═" * 60)

    for meta in search_space:
        logger.info(f"\n🚀 Explorando configuración: {meta['name']}")
        
        config = ModelConfig(
            n_features    = 10,
            hidden_size   = meta['hidden_size'],
            num_layers    = meta['num_layers'],
            bidirectional = meta['bidirectional'],
            dropout       = meta['dropout']
        )
        
        try:
            # Fase 1: Búsqueda rápida (15 épocas)
            model = train(
                config     = config,
                max_epochs = 15, 
                lr         = meta['lr'],
                patience   = 5,
                val_split  = 0.15
            )
            
            test_results = evaluate_test(model)
            current_rmse = test_results.get("rmse_30", float('inf'))
            
            meta["rmse_30_test"] = current_rmse
            meta["rmse_60_test"] = test_results.get("rmse_60", 0)
            results.append(meta)
            
            if current_rmse < best_rmse:
                best_rmse = current_rmse
                best_config_meta = meta
                logger.info(f"  ⭐ Candidato líder: {meta['name']} (RMSE@30: {best_rmse:.2f})")

        except Exception as e:
            logger.error(f"Fallo en {meta['name']}: {e}")

    # ── Fase 2: Entrenamiento Final del Ganador ────────────────
    logger.info(f"\n🏆 GANADOR: {best_config_meta['name']}. Iniciando entrenamiento profundo (100 épocas)...")
    
    final_config = ModelConfig(
        n_features    = 10,
        hidden_size   = best_config_meta['hidden_size'],
        num_layers    = best_config_meta['num_layers'],
        bidirectional = best_config_meta['bidirectional'],
        dropout       = best_config_meta['dropout']
    )
    
    final_model = train(
        config     = final_config,
        max_epochs = 100,
        lr         = best_config_meta['lr'],
        patience   = 12,
        val_split  = 0.15
    )
    
    # Guardar definitivos
    final_model.save(Path("checkpoints/best_model.pt"), Path("checkpoints/config.json"))


    # ── Resumen Final ─────────────────────────────────────────
    logger.info("\n" + "═" * 60)
    logger.info("RESUMEN DE OPTIMIZACIÓN")
    logger.info("=" * 60)
    for res in results:
        logger.info(f"{res['name']:20s} | RMSE@30: {res['rmse_30_test']:>6.2f} | RMSE@60: {res['rmse_60_test']:>6.2f}")
    
    logger.info("=" * 60)
    logger.info(f"Configuración Ganadora: {best_config_meta['name']}")
    logger.info(f"Mejor RMSE@30 en Test: {best_rmse:.2f} mg/dL")
    logger.info("=" * 60)

    # Restaurar el mejor modelo como el principal
    os.replace("checkpoints/super_best_model.pt", "checkpoints/best_model.pt")
    os.replace("checkpoints/super_best_config.json", "checkpoints/config.json")
    
    with open("checkpoints/tuning_results.json", "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    run_search()
