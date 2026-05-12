-- =============================================================================
-- GLUCOGEN V2 - DATABASE SCHEMA (POSTGRESQL)
-- =============================================================================
-- Descripción: Esquema de base de datos de grado industrial para la gestión
--              de pacientes con Diabetes Tipo 1, monitoreo continuo y
--              almacenamiento de predicciones de IA.
-- =============================================================================

-- 1. EXTENSIONES (Opcional, para UUIDs y búsqueda)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TIPOS ENUMERADOS
CREATE TYPE user_role AS ENUM ('admin', 'clinician', 'patient');
CREATE TYPE diabetes_type AS ENUM ('type_1', 'type_2', 'gestational', 'prediabetes');
CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE insulin_type AS ENUM ('rapid', 'basal', 'regular', 'nph', 'mixed');

-- 3. TABLA DE USUARIOS (Identidad Central)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role user_role DEFAULT 'patient',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA DE PACIENTES (Perfiles Médicos)
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    birth_date DATE,
    gender VARCHAR(20),
    diabetes_since DATE,
    type diabetes_type DEFAULT 'type_1',
    weight_kg DECIMAL(5,2),
    target_glucose_min DECIMAL(5,1) DEFAULT 70.0,
    target_glucose_max DECIMAL(5,1) DEFAULT 180.0,
    insulin_sensitivity_factor DECIMAL(5,2), -- mg/dL per Unit
    carb_ratio DECIMAL(5,2),                 -- grams per Unit
    metadata JSONB DEFAULT '{}',             -- Configuración adicional
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLA DE CLÍNICOS (Asociación Paciente-Doctor)
CREATE TABLE IF NOT EXISTS clinicians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    specialization VARCHAR(100),
    license_number VARCHAR(50) UNIQUE
);

CREATE TABLE IF NOT EXISTS patient_clinician (
    patient_id UUID REFERENCES patients(id),
    clinician_id UUID REFERENCES clinicians(id),
    PRIMARY KEY (patient_id, clinician_id)
);

-- 6. TABLA DE BIOMETRÍA (Lecturas de Glucosa)
CREATE TABLE IF NOT EXISTS glucose_readings (
    id BIGSERIAL PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    value DECIMAL(5,1) NOT NULL,             -- mg/dL
    source VARCHAR(50),                      -- 'cgm', 'manual', 'sensor_sync'
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    is_imputed BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_glucose_patient_time ON glucose_readings(patient_id, timestamp DESC);

-- 7. TABLA DE TRATAMIENTOS (Insulina)
CREATE TABLE IF NOT EXISTS insulin_logs (
    id BIGSERIAL PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    dose DECIMAL(5,2) NOT NULL,              -- Unidades
    type insulin_type NOT NULL,
    brand VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_insulin_patient_time ON insulin_logs(patient_id, timestamp DESC);

-- 8. TABLA DE NUTRICIÓN (Carbohidratos)
CREATE TABLE IF NOT EXISTS food_logs (
    id BIGSERIAL PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    carbs_g DECIMAL(6,2) NOT NULL,
    protein_g DECIMAL(6,2),
    fat_g DECIMAL(6,2),
    description TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    image_url TEXT,                          -- Referencia a foto del plato
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABLA DE PREDICCIONES (Resultados de BloodCare)
CREATE TABLE IF NOT EXISTS predictions (
    id BIGSERIAL PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    base_timestamp TIMESTAMP WITH TIME ZONE NOT NULL, -- T_0 (momento de la predicción)
    horizon_minutes INT NOT NULL,                     -- 30, 60, etc.
    predicted_value DECIMAL(5,1) NOT NULL,
    lower_bound_80 DECIMAL(5,1),                     -- Conformal Prediction 80%
    upper_bound_80 DECIMAL(5,1),
    severity alert_severity DEFAULT 'low',
    narrative TEXT,                                  -- NLG output
    model_version VARCHAR(50),                       -- Hash del modelo o version tag
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pred_patient_time ON predictions(patient_id, base_timestamp DESC);

-- 10. TABLA DE ALERTAS Y EVENTOS CRÍTICOS
CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    prediction_id BIGINT REFERENCES predictions(id),
    severity alert_severity NOT NULL,
    type VARCHAR(50),                                -- 'hypo', 'hyper', 'rapid_drop'
    message TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. TABLA DE AUDITORÍA (Logs de Sistema)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- VISTAS ÚTILES
CREATE OR REPLACE VIEW patient_summary AS
SELECT 
    p.id as patient_id,
    u.first_name || ' ' || u.last_name as full_name,
    p.type as diabetes_type,
    (SELECT AVG(value) FROM glucose_readings WHERE patient_id = p.id AND timestamp > NOW() - INTERVAL '7 days') as avg_glucose_7d,
    (SELECT COUNT(*) FROM alerts WHERE patient_id = p.id AND is_resolved = FALSE) as active_alerts
FROM patients p
JOIN users u ON p.user_id = u.id;

-- COMENTARIOS DE TABLA
COMMENT ON TABLE predictions IS 'Almacena los resultados del motor de IA BloodCare V2, incluyendo bandas de confianza y narrativa clínica.';
