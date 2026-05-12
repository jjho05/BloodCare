# 🩸 BloodCare: Personal AI Diabetes Assistant
### 🚀 Proyecto Hackatec Etapa Local - Instituto Tecnológico de Ciudad Madero (ITCM)

![BloodCare Banner](https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1200)

> **VISIÓN ESTRATÉGICA:** BloodCare es un ecosistema inteligente de grado industrial diseñado para la gestión soberana de la diabetes. Representando al **ITCM**, este proyecto introduce innovaciones críticas en procesamiento de IA en el borde (Edge AI) y resiliencia de datos, garantizando que el paciente nunca esté solo, incluso sin conectividad.

---

## 🏆 Ventajas Competitivas (Hackatec Edition)

- **🧠 Inteligencia Soberana (Fase 2):** Implementación de **Whisper** y **Semantic Search** locales mediante Web Workers. La IA corre en el dispositivo, asegurando latencia cero y privacidad absoluta.
- **🛡️ Resiliencia Extrema (Fase 3):** Arquitectura **Offline-First** con **IndexedDB (Dexie.js)**. Los datos se guardan localmente y se sincronizan automáticamente con la nube al recuperar conexión.
- **👁️ Visión Multimodal:** Análisis de alimentos mediante **Gemini 3 Flash** para una identificación nutricional instantánea.
- **📊 Analítica Predictiva:** Motor **LSTM (Deep Learning)** que pronostica tendencias de glucosa a 6 horas con alta fidelidad.

## 🛠️ Stack Tecnológico de Vanguardia

### Backend (Soberanía de Datos)
- **Framework:** FastAPI (Python)
- **IA/ML:** PyTorch, LSTM (Wide & Shallow), Google Generative AI.
- **Base de Datos:** PostgreSQL (Supabase).

### Frontend (Arquitectura PWA)
- **Framework:** React + Vite (TypeScript).
- **IA Local:** @xenova/transformers (WASM + WebGPU).
- **Persistencia:** Dexie.js (IndexedDB).
- **UX/UI:** Material Design 3 + Framer Motion (Aesthetics Premium).

## 🚀 Instalación y Despliegue

### Requisitos
- Node.js 18+ & Python 3.10+
- Navegador compatible con WebGPU/WASM (Chrome/Edge/Safari).

### Configuración Rápida
1. **Frontend:** `cd frontend && npm install && npm run dev`
2. **Backend:** `cd backend && pip install -r requirements.txt && python bloodcare_server.py`

---

## 🎓 Institución
**Instituto Tecnológico de Ciudad Madero**  
*Departamento de Ingeniería en Sistemas Computacionales*  
**Hackatec 2026 - Etapa Local**

Desarrollado con precisión técnica y compromiso social para elevar la calidad de vida de los pacientes metabólicos en México. 🇲🇽✨
