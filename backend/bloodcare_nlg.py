"""
BloodCare - Fase 5: Motor de Traducción de Tendencias a Texto (NLG)
===================================================================
Autor: BloodCare Dev Team
Descripción:
    Módulo de Generación de Lenguaje Natural (NLG) que convierte la salida
    numérica del motor de predicción (PredictionBand) en mensajes clínicamente
    orientados y comprensibles para el paciente.

    Capas del módulo:
      1. TrendAnalyzer   — clasifica la tendencia matemática
      2. RiskEvaluator   — detecta zonas de riesgo clínico
      3. NarrativeEngine — genera el texto final por plantillas + contexto

Uso:
    from bloodcare_nlg import NarrativeEngine
    engine   = NarrativeEngine(lang="es")
    narrative = engine.generate(band, context)
    print(narrative.full_text)
"""

import numpy as np
from dataclasses import dataclass, field
from enum import Enum
from typing import Literal
import logging

from bloodcare_uncertainty import PredictionBand

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════
# 1. ENUMERACIONES CLÍNICAS
# ═══════════════════════════════════════════════════════════════

class GlucoseTrend(Enum):
    SHARP_RISE   = "sharp_rise"     # Δ > +2 mg/dL/min
    MODERATE_RISE = "moderate_rise" # Δ +1 a +2 mg/dL/min
    SLIGHT_RISE  = "slight_rise"    # Δ +0.5 a +1 mg/dL/min
    STABLE       = "stable"         # |Δ| < 0.5 mg/dL/min
    SLIGHT_FALL  = "slight_fall"    # Δ -0.5 a -1 mg/dL/min
    MODERATE_FALL = "moderate_fall" # Δ -1 a -2 mg/dL/min
    SHARP_FALL   = "sharp_fall"     # Δ < -2 mg/dL/min


class GlucoseZone(Enum):
    SEVERE_HYPO  = "severe_hypo"    # < 54 mg/dL
    HYPO         = "hypo"           # 54 – 69 mg/dL
    LOW_NORMAL   = "low_normal"     # 70 – 99 mg/dL
    TARGET       = "target"         # 100 – 180 mg/dL
    HIGH_NORMAL  = "high_normal"    # 181 – 250 mg/dL
    HYPER        = "hyper"          # 251 – 350 mg/dL
    SEVERE_HYPER = "severe_hyper"   # > 350 mg/dL


class AlertLevel(int, Enum):
    NONE     = 0
    INFO     = 1
    CAUTION  = 2
    WARNING  = 3
    CRITICAL = 4


# ═══════════════════════════════════════════════════════════════
# 2. CONTEXTO DEL PACIENTE
# ═══════════════════════════════════════════════════════════════

@dataclass
class PatientContext:
    """
    Variables de contexto disponibles en el momento de la predicción.
    Todos los campos son opcionales; el NLG los usa cuando están presentes.

    Args:
        current_glucose:     Glucosa actual en mg/dL.
        minutes_since_meal:  Minutos desde la última ingesta.
        last_meal_carbs:     Carbohidratos de la última comida (g).
        minutes_since_bolus: Minutos desde el último bolo de insulina.
        last_bolus_units:    Unidades del último bolo.
        basal_rate:          Tasa basal activa (U/hr).
        time_of_day:         Hora del día en minutos (0–1439).
        activity_level:      Nivel de actividad: "low" | "moderate" | "high".
    """
    current_glucose:     float | None = None
    minutes_since_meal:  float | None = None
    last_meal_carbs:     float | None = None
    minutes_since_bolus: float | None = None
    last_bolus_units:    float | None = None
    basal_rate:          float | None = None
    time_of_day:         int   | None = None
    activity_level:      str   | None = None   # "low" | "moderate" | "high"


# ═══════════════════════════════════════════════════════════════
# 3. ANALIZADOR DE TENDENCIA
# ═══════════════════════════════════════════════════════════════

class TrendAnalyzer:
    """
    Clasifica la tendencia numérica de la predicción.
    Analiza la pendiente media y detecta cambios de dirección.
    """

    # Umbrales en mg/dL por paso de 30 min
    SHARP_THRESHOLD    = 60.0   # ~2 mg/dL/min × 30 min
    MODERATE_THRESHOLD = 30.0
    SLIGHT_THRESHOLD   = 15.0

    @staticmethod
    def classify(point: np.ndarray) -> GlucoseTrend:
        """Clasifica la tendencia dominante en el horizonte completo."""
        total_delta = point[-1] - point[0]           # Cambio total en 6h
        return TrendAnalyzer._delta_to_trend(total_delta)

    @staticmethod
    def classify_short(point: np.ndarray, steps: int = 2) -> GlucoseTrend:
        """Tendencia en los primeros `steps` pasos (≈ 60 min)."""
        delta = point[min(steps, len(point) - 1)] - point[0]
        return TrendAnalyzer._delta_to_trend(delta)

    @staticmethod
    def _delta_to_trend(delta: float) -> GlucoseTrend:
        t = TrendAnalyzer
        if   delta >  t.SHARP_THRESHOLD:    return GlucoseTrend.SHARP_RISE
        elif delta >  t.MODERATE_THRESHOLD: return GlucoseTrend.MODERATE_RISE
        elif delta >  t.SLIGHT_THRESHOLD:   return GlucoseTrend.SLIGHT_RISE
        elif delta < -t.SHARP_THRESHOLD:    return GlucoseTrend.SHARP_FALL
        elif delta < -t.MODERATE_THRESHOLD: return GlucoseTrend.MODERATE_FALL
        elif delta < -t.SLIGHT_THRESHOLD:   return GlucoseTrend.SLIGHT_FALL
        else:                               return GlucoseTrend.STABLE

    @staticmethod
    def detect_inflection(point: np.ndarray) -> int | None:
        """
        Detecta el primer punto de inflexión (cambio de dirección).
        Returns el índice en minutos, o None si no hay inflexión.
        """
        deltas = np.diff(point)
        signs  = np.sign(deltas)
        changes = np.where(np.diff(signs) != 0)[0]
        return int(changes[0] + 1) * 30 if len(changes) > 0 else None

    @staticmethod
    def zone_at(value: float) -> GlucoseZone:
        """Clasifica un valor de glucosa en su zona clínica."""
        if   value <  54:  return GlucoseZone.SEVERE_HYPO
        elif value <  70:  return GlucoseZone.HYPO
        elif value < 100:  return GlucoseZone.LOW_NORMAL
        elif value <= 180: return GlucoseZone.TARGET
        elif value <= 250: return GlucoseZone.HIGH_NORMAL
        elif value <= 350: return GlucoseZone.HYPER
        else:              return GlucoseZone.SEVERE_HYPER


# ═══════════════════════════════════════════════════════════════
# 4. EVALUADOR DE RIESGO
# ═══════════════════════════════════════════════════════════════

@dataclass
class RiskReport:
    alert_level:    AlertLevel
    risk_events:    list[str]        # Eventos de riesgo detectados
    min_predicted:  float            # mg/dL mínimo en el horizonte
    max_predicted:  float            # mg/dL máximo en el horizonte
    time_in_range:  float            # % del horizonte en rango 70-180 mg/dL
    zone_current:   GlucoseZone
    zone_final:     GlucoseZone


class RiskEvaluator:
    """
    Evalúa eventos de riesgo clínico en el horizonte de predicción.
    Considera tanto el valor puntual como los límites del intervalo.
    """

    @staticmethod
    def evaluate(band: PredictionBand, context: PatientContext) -> RiskReport:
        point  = band.point
        lower  = band.lower
        upper  = band.upper

        events     : list[str] = []
        alert_level = AlertLevel.NONE

        # ── Calcular métricas base ──────────────────────────────
        min_pred = float(lower.min())
        max_pred = float(upper.max())
        tir       = float(np.mean((point >= 70) & (point <= 180)) * 100)

        current_val = context.current_glucose or float(point[0])
        zone_now    = TrendAnalyzer.zone_at(current_val)
        zone_end    = TrendAnalyzer.zone_at(float(point[-1]))

        # ── Detección de eventos ────────────────────────────────

        # Hipoglucemia severa inminente
        if min_pred < 54:
            events.append("hypo_severe")
            alert_level = AlertLevel.CRITICAL

        # Hipoglucemia probable
        elif min_pred < 70:
            events.append("hypo_risk")
            alert_level = max(alert_level, AlertLevel.WARNING)

        # Hipoglucemia posible (límite inferior)
        elif lower.min() < 70:
            events.append("hypo_possible")
            alert_level = max(alert_level, AlertLevel.CAUTION)

        # Hiperglucemia severa
        if max_pred > 350:
            events.append("hyper_severe")
            alert_level = max(alert_level, AlertLevel.CRITICAL)

        # Hiperglucemia probable
        elif max_pred > 250:
            events.append("hyper_risk")
            alert_level = max(alert_level, AlertLevel.WARNING)

        # Caída rápida
        total_fall = float(point[0] - point[-1])
        if total_fall > 80:
            events.append("rapid_fall")
            alert_level = max(alert_level, AlertLevel.WARNING)

        # Subida rápida
        total_rise = float(point[-1] - point[0])
        if total_rise > 80:
            events.append("rapid_rise")
            alert_level = max(alert_level, AlertLevel.CAUTION)

        # Post-comida (pico esperado)
        meal_min = context.minutes_since_meal
        if meal_min is not None and 30 <= meal_min <= 90:
            events.append("post_meal_peak")
            alert_level = max(alert_level, AlertLevel.INFO)

        # Actividad física + tendencia bajista
        if context.activity_level == "high" and point[-1] < point[0]:
            events.append("activity_drop")
            alert_level = max(alert_level, AlertLevel.CAUTION)

        if not events:
            alert_level = AlertLevel.NONE

        return RiskReport(
            alert_level=alert_level,
            risk_events=events,
            min_predicted=min_pred,
            max_predicted=max_pred,
            time_in_range=tir,
            zone_current=zone_now,
            zone_final=zone_end,
        )


# ═══════════════════════════════════════════════════════════════
# 5. PLANTILLAS DE TEXTO
# ═══════════════════════════════════════════════════════════════

TEMPLATES_ES = {
    # ── Tendencia ────────────────────────────────────────────
    GlucoseTrend.SHARP_RISE:    "Se detecta una tendencia al alza pronunciada",
    GlucoseTrend.MODERATE_RISE: "Se detecta una tendencia al alza moderada",
    GlucoseTrend.SLIGHT_RISE:   "Se detecta una ligera tendencia al alza",
    GlucoseTrend.STABLE:        "Se espera estabilidad glucémica",
    GlucoseTrend.SLIGHT_FALL:   "Se detecta una ligera tendencia a la baja",
    GlucoseTrend.MODERATE_FALL: "Se detecta una tendencia a la baja moderada",
    GlucoseTrend.SHARP_FALL:    "Se detecta una tendencia a la baja pronunciada",

    # ── Zona clínica ─────────────────────────────────────────
    GlucoseZone.SEVERE_HYPO:  "en hipoglucemia severa",
    GlucoseZone.HYPO:         "en rango hipoglucémico",
    GlucoseZone.LOW_NORMAL:   "en rango bajo-normal",
    GlucoseZone.TARGET:       "dentro del rango objetivo",
    GlucoseZone.HIGH_NORMAL:  "en rango alto-normal",
    GlucoseZone.HYPER:        "en rango hiperglucémico",
    GlucoseZone.SEVERE_HYPER: "en hiperglucemia severa",

    # ── Eventos de riesgo ────────────────────────────────────
    "hypo_severe":    "⚠️ ALERTA CRÍTICA: Se predice hipoglucemia severa (<54 mg/dL). Tome acción inmediata.",
    "hypo_risk":      "⚠️ Riesgo de hipoglucemia (<70 mg/dL) en las próximas horas. Monitoree con atención.",
    "hypo_possible":  "ℹ️ Posibilidad de hipoglucemia dentro del intervalo de incertidumbre.",
    "hyper_severe":   "⚠️ ALERTA CRÍTICA: Se predice hiperglucemia severa (>350 mg/dL). Consulte a su médico.",
    "hyper_risk":     "⚠️ Riesgo de hiperglucemia (>250 mg/dL). Considere una corrección.",
    "rapid_fall":     "📉 Caída rápida detectada. Verifique actividad física o dosis de insulina reciente.",
    "rapid_rise":     "📈 Alza rápida detectada. Verifique ingesta de carbohidratos reciente.",
    "post_meal_peak": "🍽️ Se espera pico post-prandial en los próximos 30–60 minutos.",
    "activity_drop":  "🏃 Actividad física detectada: el descenso podría acelerarse. Considere snack preventivo.",

    # ── Contexto ─────────────────────────────────────────────
    "meal_cause":   "debido a la ingesta registrada hace {mins} minutos",
    "bolus_effect": "bajo el efecto del bolo de insulina administrado hace {mins} minutos",
    "stability":    "en las próximas {hours} horas",
    "confidence":   "Intervalo de confianza del {pct}%: {low:.0f}–{high:.0f} mg/dL",
}


# ═══════════════════════════════════════════════════════════════
# 6. RESULTADO NARRATIVO
# ═══════════════════════════════════════════════════════════════

@dataclass
class Narrative:
    """
    Texto narrativo generado para el paciente.

    Atributos:
        headline:   Frase corta de una línea (para notificación push).
        summary:    Párrafo principal de 2-3 oraciones.
        alerts:     Lista de mensajes de alerta (puede estar vacía).
        confidence_note: Nota sobre el intervalo de confianza.
        full_text:  Composición completa lista para mostrar.
    """
    headline:         str
    summary:          str
    alerts:           list[str]
    confidence_note:  str
    full_text:        str

    def to_dict(self) -> dict:
        return {
            "headline":        self.headline,
            "summary":         self.summary,
            "alerts":          self.alerts,
            "confidence_note": self.confidence_note,
            "full_text":       self.full_text,
        }


# ═══════════════════════════════════════════════════════════════
# 7. MOTOR NARRATIVO (NLG)
# ═══════════════════════════════════════════════════════════════

class NarrativeEngine:
    """
    Genera lenguaje natural a partir de PredictionBand + PatientContext.

    Pasos internos:
      1. TrendAnalyzer  → tendencia global y a corto plazo
      2. RiskEvaluator  → reporte de riesgo clínico
      3. Composición    → headline + summary + alerts

    Args:
        lang: Idioma de salida. Actualmente: "es" (español).
    """

    def __init__(self, lang: Literal["es"] = "es"):
        self.lang      = lang
        self.templates = TEMPLATES_ES   # expandible a otros idiomas

    def generate(
        self,
        band:    PredictionBand,
        context: PatientContext | None = None,
    ) -> Narrative:
        """
        Genera la narrativa completa para una predicción.

        Args:
            band:    Salida del UncertaintyEstimator.
            context: Contexto del paciente en el momento actual.

        Returns:
            Narrative con headline, summary, alerts y full_text.
        """
        if context is None:
            context = PatientContext()

        T    = self.templates
        pt   = band.point

        # ── Análisis de tendencia ──────────────────────────────
        trend_global = TrendAnalyzer.classify(pt)
        trend_short  = TrendAnalyzer.classify_short(pt, steps=2)
        inflection   = TrendAnalyzer.detect_inflection(pt)
        zone_now     = TrendAnalyzer.zone_at(float(pt[0]))

        # ── Evaluación de riesgo ───────────────────────────────
        risk = RiskEvaluator.evaluate(band, context)

        # ── Headline ───────────────────────────────────────────
        headline = self._build_headline(trend_short, zone_now, risk)

        # ── Summary ────────────────────────────────────────────
        summary = self._build_summary(
            trend_global, trend_short, zone_now,
            risk, inflection, band, context
        )

        # ── Alerts ─────────────────────────────────────────────
        alerts = [T[e] for e in risk.risk_events if e in T]

        # ── Nota de confianza ──────────────────────────────────
        conf_pct  = int(band.confidence * 100)
        conf_low  = float(band.lower.mean())
        conf_high = float(band.upper.mean())
        conf_note = T["confidence"].format(
            pct=conf_pct, low=conf_low, high=conf_high
        )

        # ── Composición full_text ──────────────────────────────
        full_text = self._compose(headline, summary, alerts, conf_note)

        return Narrative(
            headline=headline,
            summary=summary,
            alerts=alerts,
            confidence_note=conf_note,
            full_text=full_text,
        )

    # ── Construcción de headline ──────────────────────────────

    def _build_headline(
        self,
        trend: GlucoseTrend,
        zone:  GlucoseZone,
        risk:  RiskReport,
    ) -> str:
        T = self.templates

        if risk.alert_level == AlertLevel.CRITICAL:
            return "🚨 Situación crítica detectada — acción inmediata requerida"
        if risk.alert_level == AlertLevel.WARNING:
            return f"⚠️ {T[trend]} — monitoreo cercano recomendado"

        return f"{T[trend]} — glucosa {T[zone]}"

    # ── Construcción de summary ───────────────────────────────

    def _build_summary(
        self,
        trend_global: GlucoseTrend,
        trend_short:  GlucoseTrend,
        zone_now:     GlucoseZone,
        risk:         RiskReport,
        inflection:   int | None,
        band:         PredictionBand,
        ctx:          PatientContext,
    ) -> str:
        T    = self.templates
        pt   = band.point
        parts: list[str] = []

        # Frase 1: tendencia principal + causa si disponible
        sentence1 = T[trend_global]
        if ctx.minutes_since_meal is not None and ctx.minutes_since_meal < 120:
            sentence1 += f", {T['meal_cause'].format(mins=int(ctx.minutes_since_meal))}"
        elif ctx.minutes_since_bolus is not None and ctx.minutes_since_bolus < 180:
            sentence1 += f", {T['bolus_effect'].format(mins=int(ctx.minutes_since_bolus))}"
        sentence1 += "."
        parts.append(sentence1)

        # Frase 2: comportamiento a corto plazo
        val_1h = float(pt[1]) if len(pt) > 1 else float(pt[0])
        val_2h = float(pt[3]) if len(pt) > 3 else float(pt[-1])
        parts.append(
            f"En la próxima hora se estima un nivel de {val_1h:.0f} mg/dL, "
            f"llegando a {val_2h:.0f} mg/dL hacia las 2 horas."
        )

        # Frase 3: estabilidad / inflexión
        if inflection is not None:
            inflection_h = inflection / 60
            parts.append(
                f"Se anticipa un cambio de dirección alrededor de las "
                f"{inflection_h:.1f} horas."
            )
        elif trend_global == GlucoseTrend.STABLE:
            parts.append(
                f"Se espera estabilidad {T['stability'].format(hours=6)}."
            )

        # Frase 4: tiempo en rango
        if risk.time_in_range < 70:
            parts.append(
                f"Solo el {risk.time_in_range:.0f}% del horizonte "
                f"se encuentra en rango objetivo (70–180 mg/dL)."
            )
        elif risk.time_in_range >= 90:
            parts.append(
                f"El {risk.time_in_range:.0f}% del horizonte "
                f"permanece dentro del rango objetivo."
            )

        return " ".join(parts)

    # ── Composición final ─────────────────────────────────────

    def _compose(
        self,
        headline:  str,
        summary:   str,
        alerts:    list[str],
        conf_note: str,
    ) -> str:
        lines = [headline, "", summary]
        if alerts:
            lines.append("")
            lines.extend(alerts)
        lines += ["", f"📊 {conf_note}"]
        return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════
# 8. VERIFICACIÓN RÁPIDA
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # Simular una PredictionBand realista
    horizon = 12
    t       = np.linspace(0, 1, horizon)
    point   = 140 + 60 * np.sin(np.pi * t)          # Sube y baja
    lower   = point - 15
    upper   = point + 20

    band = PredictionBand(
        point=point, lower=lower, upper=upper,
        quantiles={0.1: lower, 0.5: point, 0.9: upper},
        confidence=0.8, method="combined",
    )

    context = PatientContext(
        current_glucose    = 142.0,
        minutes_since_meal = 45.0,
        last_meal_carbs    = 60.0,
        minutes_since_bolus= 50.0,
        last_bolus_units   = 4.0,
        activity_level     = "low",
    )

    engine    = NarrativeEngine(lang="es")
    narrative = engine.generate(band, context)

    print("=" * 60)
    print(narrative.full_text)
    print("=" * 60)
    print(f"\nHeadline : {narrative.headline}")
    print(f"Alerts   : {narrative.alerts}")
