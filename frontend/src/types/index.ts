// --- BloodCare App Types ---

export type Screen = 'login' | 'inicio' | 'prediccion' | 'voz' | 'perfil' | 'glucemia' | 'alimentos';

export interface PredictionData {
  prediction: number[];
  narrative: string;
}

export interface ChartRecord {
  time: string;
  value: number;
}
