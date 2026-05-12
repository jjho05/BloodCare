from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import torch
import numpy as np
from pathlib import Path
import json
from datetime import datetime
from typing import List, Optional

# Importar componentes del core de BloodCare
from bloodcare_model import BloodCareLSTM, ModelConfig
from bloodcare_nlg import RiskEvaluator, NarrativeEngine

app = FastAPI(title="BloodCare V2 Brain API", version="2.0.0")

# Habilitar CORS para conexión con la App (React)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── CARGA DEL MODELO (SINGLETON) ───────────────────────────
MODEL_PATH = Path("checkpoints/best_model.pt")
CONFIG_PATH = Path("checkpoints/config.json")

class BloodCareEngine:
    def __init__(self):
        self.model = BloodCareLSTM.load(MODEL_PATH, CONFIG_PATH)
        self.model.eval()
        self.risk_evaluator = RiskEvaluator()
        self.nlg = NarrativeEngine()
        
    def predict(self, history_glucose: List[float], carbs: float = 0.0, insulin: float = 0.0):
        """
        history_glucose: lista de los últimos 96 valores (8 horas)
        """
        # Convertir a tensor (batch, seq, features)
        # Por ahora simplificamos a 1 feature (glucosa) o 10 si tenemos el historial completo
        # Para una app sin sensor, el historial se puede "sintetizar" o pedir los últimos valores
        
        # Simulación de entrada para el modelo de 10 features
        # [glucose, delta, delta2, carbs, basal, bolus, sin, cos, t_meal, t_bolus]
        x = torch.zeros(1, 96, 10)
        x[0, -len(history_glucose):, 0] = torch.tensor(history_glucose)
        
        with torch.no_grad():
            pred, quantiles = self.model(x)
            
        return pred[0].numpy(), quantiles[0].numpy() if quantiles is not None else None

engine = BloodCareEngine()

# ── MODELOS DE DATOS ───────────────────────────────────────
class PredictionRequest(BaseModel):
    current_glucose: float
    history: Optional[List[float]] = None
    meal_carbs: Optional[float] = 0.0
    insulin_units: Optional[float] = 0.0

# ── ENDPOINTS ──────────────────────────────────────────────
@app.get("/")
def health_check():
    return {"status": "online", "model": "Wide_Shallow_LSTM", "mae": 13.88}

@app.post("/predict")
async def get_prediction(req: PredictionRequest):
    try:
        # Si no hay historial, creamos una línea base con la glucosa actual
        history = req.history if req.history else [req.current_glucose] * 96
        
        pred, quantiles = engine.predict(history, req.meal_carbs, req.insulin_units)
        
        # Evaluar riesgo y generar narrativa
        # (Aquí usamos la lógica de bloodcare_nlg.py)
        risk = engine.risk_evaluator.evaluate(pred)
        narrative = engine.nlg.generate(pred, quantiles, risk)
        
        return {
            "prediction": pred.tolist(),
            "confidence_intervals": quantiles.tolist() if quantiles is not None else None,
            "risk_level": risk.level.name,
            "narrative": narrative,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/vision/analyze")
async def analyze_plate(file: UploadFile = File(...)):
    # Aquí irá la integración con el VLM Local (Llava/Moondream)
    # Por ahora simulamos la detección para el Front
    return {
        "dish": "Taco al pastor",
        "detected_carbs": 18.0,
        "confidence": 0.95
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
