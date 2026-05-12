import pandas as pd
import numpy as np
from pathlib import Path
import logging
import pickle
from sklearn.preprocessing import MinMaxScaler
import os

# Importamos funciones de ingeniería del script original para mantener consistencia
from bloodcare_preprocessing import (
    engineer_features, 
    fit_and_normalize, 
    create_sequences, 
    handle_missing_values,
    FEATURE_COLS,
    OUTPUT_DIR,
    run_full_pipeline
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

def load_uci_dataframes(raw_dir: Path):
    logger.info(f"🔍 Procesando UCI con interpolación agresiva para datos dispersos...")
    GLUCOSE_CODES = [48, 57, 58, 59, 60, 61, 62, 63, 64]
    BASAL_CODES   = [34, 35] 
    BOLUS_CODES   = [33]     
    MEAL_CODES     = [66, 67, 68]

    uci_dfs = []
    files = sorted(raw_dir.glob("data-*"))

    for file_path in files:
        try:
            df = pd.read_csv(file_path, sep=None, engine='python', header=None, names=['date', 'time', 'code', 'value'], on_bad_lines='skip')
            df['timestamp'] = pd.to_datetime(df['date'] + ' ' + df['time'], errors='coerce')
            df = df.dropna(subset=['timestamp']).sort_values('timestamp')
            df['value'] = pd.to_numeric(df['value'], errors='coerce')
            df = df.dropna(subset=['value'])
            
            patient_df = pd.DataFrame(index=df['timestamp'].unique()).sort_index()
            
            for code in df['code'].unique():
                vals = df[df['code'] == code].set_index('timestamp')['value']
                vals = vals.groupby(level=0).mean()
                
                if code in GLUCOSE_CODES:
                    patient_df['glucose'] = vals
                elif code in BASAL_CODES:
                    patient_df['basal'] = vals
                elif code in BOLUS_CODES:
                    patient_df['bolus'] = vals
                elif code in MEAL_CODES:
                    patient_df['carbs'] = 10.0
            
            for col in ['glucose', 'basal', 'bolus', 'carbs']:
                if col not in patient_df.columns:
                    patient_df[col] = np.nan if col == 'glucose' else 0.0
            
            idx = pd.date_range(start=patient_df.index.min(), end=patient_df.index.max(), freq="5min")
            patient_df = patient_df.reindex(idx)
            patient_df[['basal', 'bolus', 'carbs']] = patient_df[['basal', 'bolus', 'carbs']].fillna(0.0)
            
            # --- MODIFICACIÓN: Interpolación agresiva para UCI (limit=48 = 4 horas) ---
            # Esto es necesario porque UCI es fingerstick, no CGM.
            patient_df['glucose'] = patient_df['glucose'].interpolate(method='pchip', limit=48)
            
            patient_df = engineer_features(patient_df)
            
            if patient_df['glucose'].notna().sum() > 200:
                uci_dfs.append(patient_df)
            
        except Exception as e:
            continue

    return uci_dfs

def combine_and_train():
    logger.info("Starting merge v4 (Aggressive Interpolation for UCI)...")
    ohio_results = run_full_pipeline()
    ohio_train_dfs = list(ohio_results["train_dfs"].values())
    ohio_test_dfs  = list(ohio_results["test_dfs"].values())
    
    uci_raw_dir = Path("data/uci_raw/extracted/Diabetes-Data")
    uci_dfs = load_uci_dataframes(uci_raw_dir)
    
    logger.info(f"📊 CONTEO FINAL:")
    logger.info(f"   Ohio Train Patients: {len(ohio_train_dfs)}")
    logger.info(f"   UCI Train Patients:  {len(uci_dfs)}")
    
    all_train_dfs = ohio_train_dfs + uci_dfs
    
    combined_train_df = pd.concat(all_train_dfs)
    combined_test_df  = pd.concat(ohio_test_dfs) if ohio_test_dfs else None
    
    train_norm, test_norm, scaler = fit_and_normalize(combined_train_df, combined_test_df)
    
    X_train_list, y_train_list = [], []
    for df in all_train_dfs:
        cols_to_scale = [c for c in FEATURE_COLS if c in df.columns]
        df_norm = df.copy()
        df_norm[cols_to_scale] = scaler.transform(df[cols_to_scale])
        X, y = create_sequences(df_norm)
        if len(X) > 0:
            X_train_list.append(X)
            y_train_list.append(y)
    
    X_train = np.concatenate(X_train_list, axis=0)
    y_train = np.concatenate(y_train_list, axis=0)
    
    X_test_list, y_test_list = [], []
    for df in ohio_test_dfs:
        cols_to_scale = [c for c in FEATURE_COLS if c in df.columns]
        df_norm = df.copy()
        df_norm[cols_to_scale] = scaler.transform(df[cols_to_scale])
        X, y = create_sequences(df_norm)
        X_test_list.append(X)
        y_test_list.append(y)
            
    X_test = np.concatenate(X_test_list, axis=0)
    y_test = np.concatenate(y_test_list, axis=0)
    
    np.save(OUTPUT_DIR / "X_train.npy", X_train)
    np.save(OUTPUT_DIR / "y_train.npy", y_train)
    np.save(OUTPUT_DIR / "X_test.npy",  X_test)
    np.save(OUTPUT_DIR / "y_test.npy",  y_test)
    
    logger.info(f"🚀 EXITO: X_train shape final: {X_train.shape}")
    return X_train, y_train

if __name__ == "__main__":
    combine_and_train()
