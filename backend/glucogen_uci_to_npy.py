import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.preprocessing import MinMaxScaler
import pickle

def create_sequences_from_csv(csv_path: Path, output_dir: Path, lookback=96, horizon=12):
    """
    Convierte el CSV preprocesado de UCI en arrays NPY para el modelo LSTM.
    96 pasos (8h) -> 12 pasos (1h)
    """
    df = pd.read_csv(csv_path, index_col=0)
    
    # Normalización (usamos la misma lógica que en OhioT1DM si es posible)
    # pero aquí generaremos un scaler específico para UCI por ahora.
    scaler = MinMaxScaler()
    df_scaled = pd.DataFrame(scaler.fit_transform(df), columns=df.columns, index=df.index)
    
    X, y = [], []
    
    # Usamos solo glucosa, insulina y carbs como features
    features = df_scaled.values
    target   = df_scaled['glucose'].values
    
    for i in range(len(features) - lookback - horizon):
        X.append(features[i : i + lookback])
        y.append(target[i + lookback : i + lookback + horizon])
        
    X = np.array(X)
    y = np.array(y)
    
    output_dir.mkdir(parents=True, exist_ok=True)
    np.save(output_dir / "X_uci_train.npy", X)
    np.save(output_dir / "y_uci_train.npy", y)
    
    with open(output_dir / "scaler_uci.pkl", "wb") as f:
        pickle.dump(scaler, f)
        
    print(f"✅ Secuencias generadas: {X.shape}")
    print(f"📂 Archivos guardados en {output_dir}")

if __name__ == "__main__":
    create_sequences_from_csv(
        Path("preprocessed/uci_dataset_ready.csv"),
        Path("preprocessed")
    )
