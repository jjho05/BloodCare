"""
BloodCare - Fase 1: Preprocesamiento del Dataset OhioT1DM
=========================================================
Autor: BloodCare Dev Team
Descripción:
    Script de carga y preprocesamiento del dataset OhioT1DM (formato XML).
    Incluye:
      - Parseo de XML por paciente
      - Alineación temporal de señales (CGM, insulina, carbohidratos)
      - Manejo de valores faltantes (interpolación lineal / splines)
      - Ingeniería de características (ΔG, codificación cíclica, tiempo desde ingesta)
      - Normalización Min-Max
      - Generación de ventanas secuenciales para LSTM

Estructura esperada del dataset OhioT1DM:
    data/
    ├── train/
    │   ├── 540-ws-training.xml
    │   ├── 544-ws-training.xml
    │   └── ...
    └── test/
        ├── 540-ws-testing.xml
        └── ...

Uso:
    python bloodcare_preprocessing.py
"""

import os
import xml.etree.ElementTree as ET
import numpy as np
import pandas as pd
from pathlib import Path
from scipy.interpolate import CubicSpline
from sklearn.preprocessing import MinMaxScaler
import pickle
import logging

# ─────────────────────────────────────────────
# Configuración global
# ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

# Rutas
DATA_DIR       = Path("data")
TRAIN_DIR      = DATA_DIR / "train"
TEST_DIR       = DATA_DIR / "test"
OUTPUT_DIR     = Path("preprocessed")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Hiperparámetros de ventana
RESAMPLE_FREQ  = "5min"        # Frecuencia de remuestreo (CGM = cada 5 min)
LOOKBACK_STEPS = 96            # 8 horas × 12 pasos/hora = 96 pasos
HORIZON_STEPS  = 12            # 6 horas de predicción (12 × 30 min)
STEP_SIZE      = 6             # Stride entre ventanas (30 min)

# Columnas de características
FEATURE_COLS = [
    "glucose",          # mg/dL
    "glucose_delta",    # ΔG: diferencial de glucosa
    "glucose_delta2",   # Δ²G: aceleración
    "carbs",            # g de carbohidratos
    "basal",            # Insulina basal (U/hr)
    "bolus",            # Insulina en bolo (U)
    "time_sin",         # Codificación cíclica hora del día (seno)
    "time_cos",         # Codificación cíclica hora del día (coseno)
    "time_since_meal",  # Minutos desde la última ingesta
    "time_since_bolus", # Minutos desde el último bolo
]
TARGET_COL = "glucose"


# ═══════════════════════════════════════════════════════════════
# 1. PARSEO DEL XML
# ═══════════════════════════════════════════════════════════════

def parse_ohio_xml(xml_path: Path) -> dict[str, pd.Series]:
    """
    Parsea un archivo XML del dataset OhioT1DM.

    Args:
        xml_path: Ruta al archivo .xml del paciente.

    Returns:
        Diccionario con Series de pandas por tipo de evento:
        {
            "glucose": pd.Series (index=datetime, values=mg/dL),
            "basal":   pd.Series,
            "bolus":   pd.Series,
            "meal":    pd.Series (carbohidratos en gramos),
        }
    """
    logger.info(f"Parseando: {xml_path.name}")
    tree = ET.parse(xml_path)
    root = tree.getroot()

    data = {
        "glucose": {},
        "basal":   {},
        "bolus":   {},
        "meal":    {},
    }

    for event_type, xml_tag, value_attr in [
        ("glucose", "glucose_level",  "value"),
        ("basal",   "basal",          "value"),
        ("bolus",   "bolus",          "dose"),
        ("meal",    "meal",           "carbs"),
    ]:
        events = root.find(xml_tag)
        if events is None:
            logger.warning(f"  Tag <{xml_tag}> no encontrado en {xml_path.name}")
            continue

        for event in events.findall("event"):
            ts_str = event.get("ts")
            val    = event.get(value_attr)

            if ts_str is None or val is None:
                continue

            try:
                # Formato OhioT1DM: "DD-MM-YYYY HH:MM:SS"
                ts = pd.to_datetime(ts_str, format="%d-%m-%Y %H:%M:%S")
                data[event_type][ts] = float(val)
            except (ValueError, TypeError):
                continue

    # Convertir a Series ordenadas
    return {
        k: pd.Series(v).sort_index()
        for k, v in data.items()
    }


# ═══════════════════════════════════════════════════════════════
# 2. ALINEACIÓN TEMPORAL
# ═══════════════════════════════════════════════════════════════

def align_signals(signals: dict[str, pd.Series]) -> pd.DataFrame:
    """
    Alinea todas las señales sobre un índice temporal uniforme de 5 minutos.

    - Glucosa: remuestreada directamente (ya es cada 5 min).
    - Basal:   interpolación hacia adelante (forward-fill).
    - Bolo:    suma de eventos dentro de cada ventana de 5 min.
    - Comida:  suma de carbohidratos dentro de cada ventana.

    Args:
        signals: Salida de parse_ohio_xml().

    Returns:
        DataFrame alineado con columnas [glucose, basal, bolus, carbs].
    """
    glucose = signals["glucose"]
    if glucose.empty:
        raise ValueError("La señal de glucosa está vacía. Verifica el XML.")

    # Índice temporal unificado
    idx = pd.date_range(
        start=glucose.index.min(),
        end=glucose.index.max(),
        freq=RESAMPLE_FREQ
    )

    df = pd.DataFrame(index=idx)

    # Glucosa: reindex + NaN donde no hay dato CGM
    df["glucose"] = glucose.reindex(idx)

    # Basal: forward-fill (la tasa se mantiene hasta nueva orden)
    basal_resampled = signals["basal"].reindex(idx, method="nearest", tolerance="5min")
    df["basal"] = basal_resampled.ffill()

    # Bolo y comida: suma de eventos dentro de cada intervalo de 5 min
    for col, signal in [("bolus", signals["bolus"]), ("carbs", signals["meal"])]:
        if signal.empty:
            df[col] = 0.0
        else:
            resampled = signal.resample(RESAMPLE_FREQ).sum()
            df[col] = resampled.reindex(idx, fill_value=0.0)

    return df


# ═══════════════════════════════════════════════════════════════
# 3. MANEJO DE VALORES FALTANTES
# ═══════════════════════════════════════════════════════════════

def handle_missing_values(df: pd.DataFrame, max_gap_minutes: int = 30) -> pd.DataFrame:
    """
    Imputa valores faltantes en la señal de glucosa.

    Estrategia:
      - Gaps ≤ max_gap_minutes: interpolación cúbica (spline).
      - Gaps > max_gap_minutes: se marcan como NaN (segmento inválido).

    Args:
        df:              DataFrame alineado.
        max_gap_minutes: Umbral máximo para interpolar (default: 30 min = 6 pasos).

    Returns:
        DataFrame con glucosa imputada y columna auxiliar 'glucose_imputed' (bool).
    """
    df = df.copy()

    # Identificar posiciones faltantes
    missing_mask = df["glucose"].isna()
    df["glucose_imputed"] = missing_mask  # bandera de imputación

    if missing_mask.any():
        # Detectar grupos de NaN consecutivos
        group_ids = (missing_mask != missing_mask.shift()).cumsum()
        gap_sizes = df[missing_mask].groupby(group_ids[missing_mask]).size()

        max_gap_steps = max_gap_minutes // 5  # pasos de 5 min

        # Interpolación cúbica solo para gaps pequeños
        small_gaps = gap_sizes[gap_sizes <= max_gap_steps].index
        large_gaps = gap_sizes[gap_sizes > max_gap_steps].index

        # Para gaps pequeños: spline cúbico
        valid_idx  = df.index[~missing_mask]
        valid_vals = df.loc[~missing_mask, "glucose"].values

        if len(valid_idx) > 3:
            valid_numeric = (valid_idx - valid_idx[0]).total_seconds()
            all_numeric   = (df.index - valid_idx[0]).total_seconds()

            cs = CubicSpline(valid_numeric, valid_vals, extrapolate=False)

            for gid in small_gaps:
                gap_mask = (group_ids == gid) & missing_mask
                gap_ts   = (df.index[gap_mask] - valid_idx[0]).total_seconds()
                df.loc[gap_mask, "glucose"] = cs(gap_ts)

            logger.info(f"  Gaps pequeños interpolados: {len(small_gaps)}")

        # Para gaps grandes: dejar NaN (se excluirán al crear ventanas)
        logger.info(f"  Gaps grandes sin interpolar: {len(large_gaps)}")

    # Resto de columnas: interpolación lineal simple
    for col in ["basal", "bolus", "carbs"]:
        df[col] = df[col].interpolate(method="linear").fillna(0.0)

    return df


# ═══════════════════════════════════════════════════════════════
# 4. INGENIERÍA DE CARACTERÍSTICAS
# ═══════════════════════════════════════════════════════════════

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Crea características derivadas para el modelo LSTM.

    Características generadas:
      - glucose_delta:    ΔG = diferencia entre lecturas consecutivas.
      - glucose_delta2:   Δ²G = diferencia de ΔG (aceleración).
      - time_sin/cos:     Codificación cíclica de la hora del día.
      - time_since_meal:  Minutos transcurridos desde la última ingesta con carbs.
      - time_since_bolus: Minutos desde el último bolo de insulina.

    Args:
        df: DataFrame con señales alineadas e imputadas.

    Returns:
        DataFrame enriquecido con nuevas columnas.
    """
    df = df.copy()

    # ── Diferenciales de glucosa ──────────────────────────────
    df["glucose_delta"]  = df["glucose"].diff().fillna(0.0)
    df["glucose_delta2"] = df["glucose_delta"].diff().fillna(0.0)

    # ── Codificación cíclica de la hora del día ───────────────
    # Mapea 0h→0 y 23:55→≈2π para capturar periodicidad diaria
    minutes_in_day = 24 * 60
    time_of_day = df.index.hour * 60 + df.index.minute  # minutos del día
    angle = 2 * np.pi * time_of_day / minutes_in_day

    df["time_sin"] = np.sin(angle)
    df["time_cos"] = np.cos(angle)

    # ── Tiempo desde la última ingesta (minutos) ──────────────
    meal_times = df.index[df["carbs"] > 0]
    df["time_since_meal"] = _minutes_since_event(df.index, meal_times)

    # ── Tiempo desde el último bolo (minutos) ─────────────────
    bolus_times = df.index[df["bolus"] > 0]
    df["time_since_bolus"] = _minutes_since_event(df.index, bolus_times)

    logger.info("  Características de ingeniería generadas correctamente.")
    return df


def _minutes_since_event(
    index: pd.DatetimeIndex,
    event_times: pd.DatetimeIndex,
    cap_minutes: float = 480.0
) -> np.ndarray:
    """
    Para cada timestamp en `index`, calcula cuántos minutos han pasado
    desde el evento más reciente en `event_times`.

    Args:
        index:       Índice temporal completo del DataFrame.
        event_times: Timestamps donde ocurrió el evento.
        cap_minutes: Valor máximo a reportar (default: 8 horas).

    Returns:
        Array de float con minutos transcurridos (capado en cap_minutes).
    """
    result = np.full(len(index), cap_minutes, dtype=float)

    if len(event_times) == 0:
        return result

    event_times_arr = np.array(event_times, dtype="datetime64[ns]")
    index_arr       = np.array(index,       dtype="datetime64[ns]")

    for i, ts in enumerate(index_arr):
        past = event_times_arr[event_times_arr <= ts]
        if len(past) > 0:
            delta_min = (ts - past[-1]) / np.timedelta64(1, "m")
            result[i] = min(delta_min, cap_minutes)

    return result


# ═══════════════════════════════════════════════════════════════
# 5. NORMALIZACIÓN MIN-MAX
# ═══════════════════════════════════════════════════════════════

def fit_and_normalize(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame | None = None,
    scaler_path: Path = OUTPUT_DIR / "scaler.pkl"
) -> tuple[pd.DataFrame, pd.DataFrame | None, MinMaxScaler]:
    """
    Ajusta un scaler Min-Max sobre los datos de entrenamiento y lo aplica
    tanto a train como a test.

    IMPORTANTE: El scaler se ajusta SOLO sobre train para evitar data leakage.

    Args:
        train_df:    DataFrame de entrenamiento.
        test_df:     DataFrame de test (opcional).
        scaler_path: Ruta donde guardar el scaler serializado.

    Returns:
        (train_normalized, test_normalized, scaler)
    """
    cols_to_scale = [c for c in FEATURE_COLS if c in train_df.columns]

    scaler = MinMaxScaler(feature_range=(0, 1))
    train_scaled = train_df.copy()
    train_scaled[cols_to_scale] = scaler.fit_transform(train_df[cols_to_scale])

    test_scaled = None
    if test_df is not None:
        test_scaled = test_df.copy()
        test_scaled[cols_to_scale] = scaler.transform(test_df[cols_to_scale])

    # Guardar scaler para inferencia futura
    with open(scaler_path, "wb") as f:
        pickle.dump(scaler, f)
    logger.info(f"  Scaler guardado en: {scaler_path}")

    return train_scaled, test_scaled, scaler


# ═══════════════════════════════════════════════════════════════
# 6. GENERACIÓN DE VENTANAS PARA LSTM
# ═══════════════════════════════════════════════════════════════

def create_sequences(
    df: pd.DataFrame,
    lookback: int  = LOOKBACK_STEPS,
    horizon: int   = HORIZON_STEPS,
    step: int      = STEP_SIZE,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Genera pares (X, y) de ventanas deslizantes para el entrenamiento LSTM.

    Esquema:
        [t-lookback ... t-1] → X  (shape: lookback × n_features)
        [t ... t+horizon-1] → y  (shape: horizon,)  — valores de glucosa futuros

    Args:
        df:       DataFrame normalizado con columnas en FEATURE_COLS.
        lookback: Pasos de historia (default: 96 = 8 horas).
        horizon:  Pasos a predecir (default: 12 = 6 horas).
        step:     Stride entre ventanas (default: 6 = 30 min).

    Returns:
        X: np.ndarray de shape (N, lookback, n_features)
        y: np.ndarray de shape (N, horizon)
    """
    feature_cols = [c for c in FEATURE_COLS if c in df.columns]
    values       = df[feature_cols].values
    glucose_idx  = feature_cols.index(TARGET_COL)

    X_list, y_list = [], []
    total_len = len(df)

    for start in range(0, total_len - lookback - horizon + 1, step):
        x_window = values[start : start + lookback]
        y_window = values[start + lookback : start + lookback + horizon, glucose_idx]

        # Descartar ventanas con NaN (gaps grandes)
        if np.isnan(x_window).any() or np.isnan(y_window).any():
            continue

        X_list.append(x_window)
        y_list.append(y_window)

    if not X_list:
        logger.warning("No se generaron secuencias. Revisa los datos o parámetros de ventana.")
        return np.empty((0, lookback, len(feature_cols))), np.empty((0, horizon))

    X = np.array(X_list, dtype=np.float32)
    y = np.array(y_list, dtype=np.float32)

    logger.info(f"  Secuencias generadas — X: {X.shape}, y: {y.shape}")
    return X, y


# ═══════════════════════════════════════════════════════════════
# 7. PIPELINE COMPLETO
# ═══════════════════════════════════════════════════════════════

def process_patient(xml_path: Path) -> pd.DataFrame | None:
    """
    Ejecuta el pipeline completo para un único paciente.

    Args:
        xml_path: Ruta al archivo XML del paciente.

    Returns:
        DataFrame procesado con todas las características, o None si falla.
    """
    try:
        signals = parse_ohio_xml(xml_path)
        df      = align_signals(signals)
        df      = handle_missing_values(df)
        df      = engineer_features(df)
        return df
    except Exception as e:
        logger.error(f"Error procesando {xml_path.name}: {e}")
        return None


def run_full_pipeline(
    train_dir: Path = TRAIN_DIR,
    test_dir:  Path = TEST_DIR,
) -> dict:
    """
    Pipeline completo para todos los pacientes del dataset OhioT1DM.

    Pasos:
      1. Procesar cada XML de train y test.
      2. Concatenar todos los DataFrames de train para ajustar el scaler.
      3. Normalizar train y test.
      4. Generar ventanas LSTM.
      5. Guardar arrays en disco.

    Returns:
        Diccionario con X_train, y_train, X_test, y_test y el scaler.
    """
    logger.info("═" * 55)
    logger.info("BloodCare | Fase 1: Preprocesamiento OhioT1DM")
    logger.info("═" * 55)

    # ── Procesar XMLs ───────────────────────────────────────
    train_dfs = {}
    for xml_file in sorted(train_dir.glob("*.xml")):
        patient_id = xml_file.stem.split("-")[0]
        df = process_patient(xml_file)
        if df is not None:
            train_dfs[patient_id] = df
            logger.info(f"  ✓ Paciente {patient_id} (train): {len(df)} pasos")

    test_dfs = {}
    for xml_file in sorted(test_dir.glob("*.xml")):
        patient_id = xml_file.stem.split("-")[0]
        df = process_patient(xml_file)
        if df is not None:
            test_dfs[patient_id] = df
            logger.info(f"  ✓ Paciente {patient_id} (test):  {len(df)} pasos")

    if not train_dfs:
        raise RuntimeError("No se procesó ningún paciente de train. Revisa las rutas.")

    # ── Concatenar y normalizar ─────────────────────────────
    all_train = pd.concat(list(train_dfs.values()))
    all_test  = pd.concat(list(test_dfs.values())) if test_dfs else None

    logger.info("\nNormalizando datos (Min-Max)...")
    all_train_norm, all_test_norm, scaler = fit_and_normalize(all_train, all_test)

    # ── Generar secuencias LSTM ─────────────────────────────
    logger.info("\nGenerando ventanas LSTM...")
    X_train_parts, y_train_parts = [], []
    for pid, df_raw in train_dfs.items():
        df_norm = all_train_norm.loc[df_raw.index]
        X, y = create_sequences(df_norm)
        X_train_parts.append(X)
        y_train_parts.append(y)

    X_train = np.concatenate(X_train_parts, axis=0)
    y_train = np.concatenate(y_train_parts, axis=0)

    X_test, y_test = np.array([]), np.array([])
    if all_test_norm is not None:
        X_test_parts, y_test_parts = [], []
        for pid, df_raw in test_dfs.items():
            df_norm = all_test_norm.loc[df_raw.index]
            X, y = create_sequences(df_norm)
            X_test_parts.append(X)
            y_test_parts.append(y)
        X_test = np.concatenate(X_test_parts, axis=0)
        y_test = np.concatenate(y_test_parts, axis=0)

    # ── Guardar en disco ────────────────────────────────────
    logger.info("\nGuardando arrays preprocesados...")
    np.save(OUTPUT_DIR / "X_train.npy", X_train)
    np.save(OUTPUT_DIR / "y_train.npy", y_train)
    np.save(OUTPUT_DIR / "X_test.npy",  X_test)
    np.save(OUTPUT_DIR / "y_test.npy",  y_test)

    logger.info("\n✅ Preprocesamiento completado.")
    logger.info(f"   X_train : {X_train.shape}")
    logger.info(f"   y_train : {y_train.shape}")
    logger.info(f"   X_test  : {X_test.shape}")
    logger.info(f"   y_test  : {y_test.shape}")
    logger.info(f"   Archivos en: {OUTPUT_DIR.resolve()}")

    return {
        "X_train": X_train,
        "y_train": y_train,
        "X_test":  X_test,
        "y_test":  y_test,
        "scaler":  scaler,
        "train_dfs": train_dfs,
        "test_dfs":  test_dfs,
    }


# ═══════════════════════════════════════════════════════════════
# 8. ENTRY POINT
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    results = run_full_pipeline()
