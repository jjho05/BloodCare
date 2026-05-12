# 🩸 BloodCare AI: Ecosistema Metabólico Soberano

> **Proyecto Oficial ITCM - Hackatec Etapa Local 2026**
> "Transformando el monitoreo metabólico mediante Inteligencia Artificial Soberana y Resiliencia en el Borde."

---

## 🚀 Visión Estratégica
BloodCare no es solo una PWA de monitoreo; es una **infraestructura de salud soberana**. En un mundo donde la privacidad de los datos clínicos es vulnerable, BloodCare desplaza la inteligencia del servidor central al **dispositivo del usuario**. Nuestra filosofía es "Privacidad por Diseño, Potencia por Arquitectura".

---

## 🛠️ Stack Tecnológico (Sovereign Edge Stack)

### 🧠 Inteligencia Artificial Local (On-Device AI)
- **ASR Engine:** Integración de `Transformers.js` ejecutando modelos de **Whisper** en un Web Worker. Transcripción de voz a texto sin enviar audio a la nube.
- **Semantic Search:** Motor de búsqueda vectorial local que utiliza *embeddings* para encontrar alimentos en el diccionario clínico, permitiendo lenguaje natural (ej: "Me comí un par de tacos" -> Detecta cantidad y alimento).
- **Metabolic Forecasting:** Algoritmo predictivo que proyecta niveles de glucosa a 6 horas basado en el historial persistido localmente.

### 💾 Resiliencia y Persistencia (Offline-First)
- **Engine:** `Dexie.js` (IndexedDB) para almacenamiento de grado industrial.
- **Data Safety:** Persistencia total de registros de glucosa, comidas y perfiles de usuario.
- **Sync Motor:** Algoritmo de sincronización en segundo plano que detecta recuperación de red y consolida datos locales con el backend **FastAPI / Supabase**.

### 🎨 Interfaz de Alta Fidelidad (Master Design)
- **Framework:** React + Vite + Tailwind CSS v4.
- **Aesthetics:** Diseño basado en el **Master Design de GlucoGen**, optimizado para responsividad extrema y fluidez cinemática con `motion/react`.
- **Identity:** Branding institucional del **ITCM** (Instituto Tecnológico de Ciudad Madero).

---

## 🌟 Funcionalidades de Grado Industrial

1.  **Dashboard Editorial:** Visualización dinámica de métricas vitales (Promedio, Máximos, Mínimos) con codificación de color semántica basada en umbrales metabólicos personalizados.
2.  **Bitácora Multimodal:** Registro de alimentos mediante voz o búsqueda inteligente con extracción automática de porciones.
3.  **Perfil Soberano:** Configuración de metas metabólicas (Target Range) que gobiernan la lógica de alerta de toda la aplicación.
4.  **Autenticación Híbrida:** Sistema dual de acceso mediante Correo/Password y Google OAuth oficial.
5.  **PWA Pro:** Instalable en iOS/Android con caché inteligente de modelos de IA (~50MB) para funcionamiento 100% autónomo.

---

## 🛡️ Seguridad y Gobernanza de Datos (Hardening)

BloodCare implementa protocolos de seguridad inspirados en los estándares **HIPAA** y **OWASP**:
- **Local Sanitization:** Todos los inputs de voz y texto son sanitizados en el cliente antes de ser procesados por los modelos de IA.
- **Sovereign Encryption:** Los datos sensibles almacenados en `IndexedDB` están protegidos por las políticas de origen del navegador, garantizando que ninguna otra aplicación pueda acceder a la bitácora metabólica.
- **Zero-Cloud Audio:** El audio capturado por el micrófono se destruye en memoria inmediatamente después de la transcripción local; nunca se almacena ni se transmite.

---

## 📈 Casos de Uso Estratégicos

### 🏔️ Zonas de Baja Conectividad
Ideal para pacientes en áreas rurales o con infraestructura de red inestable, donde el monitoreo constante es crítico pero la conexión a la nube es intermitente.
### 🔐 Privacidad Extrema
Para usuarios que requieren un control absoluto de su información clínica, evitando que sus hábitos alimenticios y niveles de glucosa sean perfilados por grandes corporaciones tecnológicas.
### 🏃‍♂️ Atletas de Alto Rendimiento
Optimización de la ventana metabólica mediante el análisis de impacto glucémico inmediato procesado al borde de la actividad física.

---

## 🔬 Metodología de Ingeniería

El desarrollo de BloodCare sigue el **Estatuto Arquitectónico Antigravity 4.0**:
- **Auditoría Adversaria:** Cada componente ha sido sometido a pruebas de estrés para garantizar que la lógica de IA no bloquee el hilo principal de la interfaz (UI Thread).
- **Multi-Agent Swarm Logic:** El sistema fue orquestado simulando departamentos de ingeniería especializados en Frontend, Backend e Infraestructura de IA.
- **Modularidad Radical:** Cada módulo (DB, Worker, UI) es independiente, permitiendo actualizaciones en caliente sin comprometer la integridad global.

---

## 🏗️ Arquitectura del Sistema

```mermaid
graph TD
    A[Usuario] --> B[UI React / Master Design]
    B --> C{Estado de Red}
    C -- Offline --> D[Dexie.js / IndexedDB]
    C -- Online --> E[Sync Engine]
    E --> F[API FastAPI / Supabase]
    B --> G[Web Worker / IA Local]
    G --> H[Transformers.js - Whisper]
    G --> I[Vector Search Engine]
    D --> J[Metabolic Forecaster]
    J --> B
```

---

## 🚀 Roadmap 2026 (Próximas Fases)

- **Fase 5: Vision Edge:** Implementación de reconocimiento de platillos mediante Computer Vision local (MobileNet/YOLOv8-tiny).
- **Fase 6: Wearable Bridge:** Integración directa con CGMs (Continuous Glucose Monitors) vía Bluetooth Web API.
- **Fase 7: Health Insights:** Generación de reportes PDF clínicos automatizados con análisis estadístico avanzado.

---

## 🎓 Impacto Institucional (Hackatec ITCM)
BloodCare representa el compromiso del **Instituto Tecnológico de Ciudad Madero** con la innovación disruptiva. Es una solución diseñada para democratizar el acceso a herramientas de salud avanzada, eliminando la barrera de la conectividad y priorizando la soberanía tecnológica del paciente mexicano.

---

## 🛠️ Instalación para Desarrolladores

```bash
# Clonar el repositorio
git clone https://github.com/jjho05/BloodCare.git

# Entrar al frontend
cd BloodCare/frontend

# Instalar dependencias industriales
npm install

# Iniciar motor de desarrollo (Puerto 3005)
npm run dev
```

---
**Desarrollado con ❤️ para el ITCM por Antigravity Architect.**
*"La tecnología es soberana o no es tecnología."*
