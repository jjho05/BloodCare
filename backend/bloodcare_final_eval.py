import torch
from pathlib import Path
from bloodcare_model import BloodCareLSTM, ModelConfig
from bloodcare_train import evaluate_test
import logging

logging.basicConfig(level=logging.INFO)

def final_eval():
    weights = Path("checkpoints/best_model.pt")
    config_p = Path("checkpoints/config.json")
    
    if not weights.exists() or not config_p.exists():
        print("❌ Error: No se encontraron los archivos del modelo.")
        return

    model = BloodCareLSTM.load(weights, config_p)
    print("\n" + "="*50)
    print("🏆 EVALUACIÓN FINAL DEL CEREBRO OPTIMIZADO")
    print("="*50)
    model.summary()
    
    results = evaluate_test(model)
    print("\n📈 MÉTRICAS FINALES EN TEST SET (OhioT1DM):")
    print(f"   RMSE @ 30 min : {results['rmse_30']:.2f} mg/dL")
    print(f"   RMSE @ 60 min : {results['rmse_60']:.2f} mg/dL")
    print(f"   MAE           : {results['mae']:.2f} mg/dL")
    print("="*50)

if __name__ == "__main__":
    final_eval()
