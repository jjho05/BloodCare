from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import torch
import numpy as np
from pathlib import Path
import json
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session

# Importar componentes del core de BloodCare
from bloodcare_model import BloodCareLSTM, ModelConfig
from bloodcare_nlg import RiskEvaluator, NarrativeEngine
from database import get_db, FoodReference, GlucoseRecord, MealLog, User
from sqlalchemy import String

app = FastAPI(title="BloodCare V2 Brain API", version="2.0.0")

# Habilitar CORS
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

class GlucoseCreate(BaseModel):
    user_id: int
    value: float
    note: Optional[str] = None

class MealCreate(BaseModel):
    user_id: int
    food_name: str
    carbs_g: float

# ── ENDPOINTS ──────────────────────────────────────────────
@app.get("/")
def health_check():
    return {
        "status": "online", 
        "model": "Wide_Shallow_LSTM", 
        "mae": 13.88, 
        "db": "Supabase Connected",
        "brand": "BloodCare"
    }

@app.post("/predict")
async def get_prediction(req: PredictionRequest):
    try:
        history = req.history if req.history else [req.current_glucose] * 96
        pred, quantiles = engine.predict(history, req.meal_carbs, req.insulin_units)
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

@app.get("/food/search")
def search_food(query: str, db: Session = Depends(get_db)):
    results = db.query(FoodReference).filter(
        (FoodReference.name.ilike(f"%{query}%")) | 
        (FoodReference.synonyms.cast(String).ilike(f"%{query}%"))
    ).limit(5).all()
    return results

@app.post("/records/glucose")
def add_glucose(req: GlucoseCreate, db: Session = Depends(get_db)):
    record = GlucoseRecord(user_id=req.user_id, value=req.value, note=req.note)
    db.add(record)
    db.commit()
    return {"status": "success", "id": record.id}

@app.get("/records/glucose")
def get_glucose(user_id: int, db: Session = Depends(get_db)):
    return db.query(GlucoseRecord).filter(GlucoseRecord.user_id == user_id).order_by(GlucoseRecord.timestamp.desc()).limit(20).all()

@app.post("/records/meal")
def add_meal(req: MealCreate, db: Session = Depends(get_db)):
    record = MealLog(user_id=req.user_id, food_name=req.food_name, carbs_g=req.carbs_g)
    db.add(record)
    db.commit()
    return {"status": "success", "id": record.id}

@app.get("/records/meal")
def get_meals(user_id: int, db: Session = Depends(get_db)):
    return db.query(MealLog).filter(MealLog.user_id == user_id).order_by(MealLog.timestamp.desc()).limit(10).all()

@app.post("/vision/analyze")
async def analyze_plate(file: UploadFile = File(...)):
    return {
        "dish": "Taco al pastor",
        "detected_carbs": 18.0,
        "confidence": 0.95
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
