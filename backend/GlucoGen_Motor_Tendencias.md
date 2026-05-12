# Especificaciones Técnicas: Motor de Tendencias (BloodCare)

Este documento detalla los requerimientos para el desarrollo del **Motor de Tendencias** de BloodCare, un sistema de predicción de glucosa basado en **Deep Learning (LSTM)** diseñado para ejecutarse de forma local.

## 1. Objetivo del Componente
Desarrollar un modelo de redes neuronales recurrentes (LSTM) capaz de predecir niveles de glucosa en un horizonte de **6 horas**, proporcionando intervalos de confianza y una explicación narrativa del comportamiento esperado.

## 2. Fuentes de Datos (Datasets)
El modelo se basará en arquitecturas validadas con los siguientes conjuntos de datos internacionales:
* **OhioT1DM:** Datos de monitoreo continuo de glucosa (CGM), insulina y eventos de vida de pacientes con Diabetes Tipo 1.
* **DiaTrend:** Un dataset masivo de tecnología avanzada en diabetes para soluciones analíticas.

## 3. Arquitectura del Modelo (Propuesta)
* **Tipo de Red:** LSTM (Long Short-Term Memory) apilada o Bi-LSTM.
* **Ventana de Entrada (Look-back):** Historial de las últimas 4 a 8 horas de registros (Glucosa, Carbohidratos, Insulina/Medicación).
* **Horizonte de Predicción:** 12 pasos de 30 minutos cada uno (total 6 horas).
* **Capas de Salida:**
    * Regresión lineal para el valor puntual de glucosa.
    * Capa de cuantiles o varianza para generar el **Intervalo de Confianza**.

## 4. Requerimientos de Implementación
### A. Preprocesamiento
* Normalización de datos (Min-Max Scaling).
* Manejo de valores faltantes (Interpolación lineal o splines).
* Ingeniería de características: Diferenciales de glucosa (ΔG), hora del día (codificación cíclica), y tiempo transcurrido desde la última ingesta.

### B. Generación de Explicaciones (NLG)
El sistema debe traducir la tendencia matemática en lenguaje natural:
* *Ejemplo:* "Se detecta una tendencia al alza moderada debido a la ingesta registrada hace 30 minutos. Se espera estabilidad en las próximas 2 horas."

### C. Restricciones de Edge AI
* El modelo final debe ser exportable a formatos ligeros (**TFLite** o **ONNX**) para ejecución local en dispositivos móviles.
* Optimización de pesos para reducir latencia y consumo de batería.

## 5. Métricas de Éxito
Se busca alcanzar o mejorar los estándares de la industria referenciados en la memoria técnica:
* **RMSE a 30 min:** < 15 mg/dL.
* **RMSE a 60 min:** < 26 mg/dL.

## 6. Roadmap de Desarrollo (Claude)
1.  **Fase 1:** Diseño de la estructura de datos y carga de datasets (CSV loaders).
2.  **Fase 2:** Definición de la clase del modelo en PyTorch/TensorFlow.
3.  **Fase 3:** Entrenamiento básico y validación con métricas RMSE.
4.  **Fase 4:** Implementación de la lógica de incertidumbre (Intervalos de Confianza).
5.  **Fase 5:** Creación del módulo de traducción de tendencias a texto.
