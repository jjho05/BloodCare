# 🩸 BloodCare: Personal AI Diabetes Assistant

![BloodCare Banner](https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1200)

BloodCare es un ecosistema inteligente diseñado para la gestión avanzada de la diabetes. Utiliza modelos de **Deep Learning (LSTM)** para predecir niveles de glucosa con alta precisión (MAE 13.88) y ofrece una experiencia de usuario premium basada en **Material Design 3**.

## 🚀 Características Principales

- **Predicción Inteligente:** Motor LSTM que pronostica tendencias de glucosa a 6 horas.
- **Registro Multimodal:** Captura de alimentos mediante voz y texto con mapeo nutricional automático.
- **Arquitectura Cloud:** Persistencia global mediante **Supabase (PostgreSQL)**.
- **Análisis Clínico (NLG):** Generación de narrativas de salud personalizadas mediante IA.
- **Seguridad Industrial:** Autenticación robusta y manejo de secretos mediante variables de entorno.

## 🛠️ Stack Tecnológico

### Backend
- **Framework:** FastAPI (Python)
- **IA/ML:** PyTorch, Scikit-learn (Wide & Shallow LSTM)
- **Base de Datos:** PostgreSQL (Supabase)
- **ORM:** SQLAlchemy

### Frontend
- **Framework:** React + Vite (TypeScript)
- **Styling:** Tailwind CSS + Vanilla CSS (Aesthetics Premium)
- **Animaciones:** Framer Motion
- **Gráficas:** Recharts

## 📦 Instalación y Configuración

### Requisitos Previos
- Python 3.10+
- Node.js 18+
- Instancia de PostgreSQL (o proyecto en Supabase)

### Configuración del Backend
1. Navega a `/backend`.
2. Crea un archivo `.env` con:
   ```env
   DATABASE_URL=tu_url_de_supabase
   GOOGLE_CLIENT_ID=tu_id_de_google
   ```
3. Instala dependencias: `pip install -r requirements.txt`
4. Inicia el servidor: `python bloodcare_server.py`

### Configuración del Frontend
1. Navega a `/frontend`.
2. Instala dependencias: `npm install`
3. Inicia el modo desarrollo: `npm run dev`

## 🛡️ Seguridad y Privacidad
BloodCare sigue estándares de seguridad industrial, asegurando que todos los datos sensibles se manejen fuera del código fuente mediante inyección de dependencias y variables de entorno.

---
Desarrollado con ❤️ para mejorar la calidad de vida de los pacientes metabólicos.
