# Funcionamiento del Modelo de Red Neuronal: BloodCare LSTM

Este documento detalla la arquitectura, el proceso de entrenamiento y la lógica detrás del modelo de inteligencia artificial utilizado en **BloodCare** para la predicción de niveles de glucosa.

---

## 1. Arquitectura del Modelo: Stacked LSTM

El modelo se basa en una arquitectura de **Memoria a Corto y Largo Plazo (LSTM)**, diseñada específicamente para procesar datos secuenciales o series temporales (como los niveles de glucosa recolectados cada 5 minutos).

### Componentes Principales:
1.  **Encoder (Codificador) LSTM:**
    *   Procesa la secuencia de entrada (historia del paciente).
    *   Utiliza capas LSTM apiladas (Stacked LSTM) que permiten capturar patrones complejos y dependencias temporales de largo plazo.
    *   Opcionalmente puede ser **Bidireccional (Bi-LSTM)** para analizar la secuencia en ambos sentidos.
2.  **Cabeza de Regresión Puntual (Regression Head):**
    *   Toma la salida del Encoder y proyecta la predicción del valor exacto de glucosa esperado.
    *   Utiliza capas lineales (Dense) con activación ReLU y una salida final Sigmoid (escalada a mg/dL).
3.  **Cabeza de Cuantiles (Quantile Head):**
    *   Genera múltiples niveles de predicción (cuantiles como 0.1, 0.25, 0.5, 0.75, 0.9).
    *   Esto permite que el sistema no solo dé un número, sino un **intervalo de confianza** (ej. "Hay un 80% de probabilidad de que tu glucosa esté entre 110 y 130 mg/dL").

---

## 2. Funcionamiento de la Predicción

El modelo opera bajo una configuración de **ventana deslizante**:

*   **Entrada (Lookback):** 8 horas de historia (96 pasos de tiempo, ya que se toma una lectura cada 5 minutos).
*   **Salida (Horizonte):** 6 horas de predicción (12 pasos de tiempo en intervalos de 30 min, o según la configuración del pipeline).
*   **Características (Features):** No solo usa la glucosa, sino también variables como la hora del día, eventos de insulina, carbohidratos consumidos y actividad física.

---

## 3. El Entrenador (Trainer Model)

El script `bloodcare_train.py` es el encargado de "enseñar" a la red neuronal utilizando datos históricos de pacientes (UCI Dataset y otros).

### Proceso de Aprendizaje:
1.  **Pérdida Combinada (Combined Loss):**
    *   **MSE (Mean Squared Error):** Penaliza al modelo si la predicción puntual se aleja del valor real.
    *   **Pinball Loss:** Se usa específicamente para los cuantiles, asegurando que los intervalos de confianza sean precisos y calibrados.
2.  **Optimización:** Utiliza el algoritmo **AdamW**, que es un estándar en deep learning por su eficiencia y manejo de pesos.
3.  **Mecanismos de Control:**
    *   **Early Stopping:** Detiene el entrenamiento automáticamente si el modelo deja de mejorar, evitando el "sobreajuste" (overfitting).
    *   **Learning Rate Scheduler:** Reduce la velocidad de aprendizaje cuando el modelo está cerca de su punto óptimo para lograr una mayor precisión.

---

## 4. Métricas de Éxito (Estándares de la Industria)

El éxito del modelo no se mide solo por "acertar", sino por su precisión en tiempos críticos para la salud:
*   **RMSE a 30 min:** El error cuadrático medio en la predicción a media hora (objetivo: < 15 mg/dL).
*   **RMSE a 60 min:** El error en la predicción a una hora (objetivo: < 26 mg/dL).
*   **MAE (Mean Absolute Error):** El error promedio general en mg/dL.

---

## 5. Resumen del Flujo de Datos

1.  **Preprocesamiento:** Los datos brutos se limpian, normalizan (escalan entre 0 y 1) y se dividen en secuencias.
2.  **Entrenamiento:** El modelo ajusta sus neuronas para minimizar el error de predicción.
3.  **Validación:** Se prueba con datos que el modelo nunca ha visto para asegurar que pueda predecir casos nuevos.
4.  **Inferencia:** Una vez entrenado, el modelo recibe datos en tiempo real del usuario y genera la gráfica de tendencia futura.
