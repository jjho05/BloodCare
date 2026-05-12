import pandas as pd
import numpy as np
from pathlib import Path
import logging
import os

# Configuración de logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

def preprocess_all_uci(raw_dir: Path, output_dir: Path):
    """
    Lee todos los archivos data-XX, los unifica y los preprocesa para BloodCare.
    """
    logger.info(f"Escaneando archivos en {raw_dir}...")
    all_dfs = []
    
    # Códigos de interés
    GLUCOSE_CODES = [48, 57, 58, 59, 60, 61, 62, 63, 64]
    INSULIN_CODES  = [33, 34, 35]
    MEAL_CODES     = [66, 67, 68]
    ACTIVITY_CODES = [69, 70, 71]

    for file_path in sorted(raw_dir.glob("data-*")):
        patient_id = file_path.name.split("-")[1]
        try:
            # El archivo es Tab Separated
            df = pd.read_csv(file_path, sep='\t', header=None, names=['date', 'time', 'code', 'value'], on_bad_lines='skip')
            
            # Limpieza básica
            df['patient_id'] = patient_id
            df['timestamp'] = pd.to_datetime(df['date'] + ' ' + df['time'], errors='coerce')
            df = df.dropna(subset=['timestamp'])
            
            # Convertir valor a numérico (algunos pueden tener errores)
            df['value'] = pd.to_numeric(df['value'], errors='coerce')
            df = df.dropna(subset=['value'])
            
            all_dfs.append(df)
        except Exception as e:
            logger.error(f"Error procesando {file_path.name}: {e}")

    if not all_dfs:
        raise ValueError("No se pudieron cargar archivos de datos.")

    full_df = pd.concat(all_dfs, ignore_index=True)
    logger.info(f"Total de registros cargados: {len(full_df)}")

    # Crear columnas para el modelo
    full_df['glucose'] = np.nan
    full_df['insulin'] = 0.0
    full_df['carbs']   = 0.0
    
    # Mapeo
    full_df.loc[full_df['code'].isin(GLUCOSE_CODES), 'glucose'] = full_df['value']
    full_df.loc[full_df['code'].isin(INSULIN_CODES), 'insulin'] = full_df['value']
    full_df.loc[full_df['code'].isin(MEAL_CODES), 'carbs'] = 1.0 # Flag de comida
    
    # Preprocesamiento por paciente para evitar mezclas temporales
    final_parts = []
    for pid, group in full_df.groupby('patient_id'):
        group = group.sort_values('timestamp').set_index('timestamp')
        
        # Resample a 5 min (como OhioT1DM)
        resampled = group[['glucose', 'insulin', 'carbs']].resample('5min').mean()
        
        # Interpolación de glucosa (hasta 30 min)
        resampled['glucose'] = resampled['glucose'].interpolate(method='linear', limit=6)
        
        # Llenar ceros para insulina y carbohidratos
        resampled['insulin'] = resampled['insulin'].fillna(0.0)
        resampled['carbs']   = resampled['carbs'].fillna(0.0)
        
        # Solo mantener segmentos con glucosa (eliminar gaps grandes)
        resampled = resampled.dropna(subset=['glucose'])
        
        if len(resampled) > 100: # Solo si hay suficientes datos
            final_parts.append(resampled)

    if not final_parts:
        raise ValueError("No se generaron secuencias válidas.")

    # Unificar todo
    final_df = pd.concat(final_parts)
    
    # Guardar en formato BloodCare (CSV y opcionalmente .npy para Fase 3)
    output_dir.mkdir(parents=True, exist_ok=True)
    final_df.to_csv(output_dir / "uci_dataset_ready.csv")
    
    logger.info(f"Dataset UCI unificado y listo en {output_dir / 'uci_dataset_ready.csv'}")
    logger.info(f"Total de pasos temporales generados: {len(final_df)}")

if __name__ == "__main__":
    RAW_DIR    = Path("data/uci_raw/extracted/Diabetes-Data")
    OUTPUT_DIR = Path("preprocessed")
    
    preprocess_all_uci(RAW_DIR, OUTPUT_DIR)
    print("\n✅ Dataset UCI (AIM '94) procesado íntegramente.")
