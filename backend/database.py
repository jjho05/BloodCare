import os
import json
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, JSON, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import dotenv

# Cargar variables de entorno
dotenv.load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ── MODELOS DE BASE DE DATOS ───────────────────────────────

class FoodReference(Base):
    __tablename__ = "food_reference"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    carbs_per_100g = Column(Float)
    serving_size_g = Column(Float)
    total_carbs = Column(Float)
    category = Column(String)
    synonyms = Column(JSON)  # Para búsqueda por voz/texto
    metadata_info = Column(JSON)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    google_id = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class GlucoseRecord(Base):
    __tablename__ = "glucose_records"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    value = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
    note = Column(String, nullable=True)

class MealLog(Base):
    __tablename__ = "meal_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    food_name = Column(String)
    carbs_g = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
    image_url = Column(String, nullable=True) # Para la visión AI futura

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ── SEEDER PARA PLATILLOS ──────────────────────────────────
def seed_foods(json_path: str):
    db = SessionLocal()
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # El JSON usa la clave "diccionario"
            platillos = data.get("diccionario", [])
            
            for p in platillos:
                food = FoodReference(
                    name=p["nombre"],
                    carbs_per_100g=p.get("carbohidratos_g", 0), # Ajustado según JSON
                    serving_size_g=0, # No disponible directamente
                    total_carbs=p.get("carbohidratos_g", 0),
                    category=p.get("categoria", "General"),
                    synonyms=p.get("alias", []), # Usamos "alias" del JSON
                    metadata_info={"porcion": p.get("porcion", "")}
                )
                db.add(food)
            db.commit()
            print(f"✅ {len(platillos)} platillos insertados exitosamente.")
    except Exception as e:
        print(f"❌ Error en el seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Crear tablas
    Base.metadata.create_all(bind=engine)
    print("🚀 Tablas creadas en PostgreSQL.")
