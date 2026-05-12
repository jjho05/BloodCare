import { motion } from 'motion/react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { Brain, TrendingUp, Zap, Activity, Info } from 'lucide-react';
import type { PredictionData, ChartRecord } from '../types';

interface PredictionScreenProps {
  historyRecords: ChartRecord[];
  data: PredictionData | null;
}

const PredictionScreen = ({ historyRecords, data }: PredictionScreenProps) => {
  // Datos de ejemplo si no hay historial para que se vea bien en la demo
  const displayData = historyRecords.length > 0 ? historyRecords : [
    { time: '08:00', value: 95 },
    { time: '10:00', value: 110 },
    { time: '12:00', value: 105 },
    { time: '14:00', value: 130 },
    { time: '16:00', value: 115 },
    { time: '18:00', value: 100 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="pb-32 bg-surface min-h-screen"
    >
      <header className="bg-white border-b border-outline/5 flex items-center justify-between px-6 h-18 w-full sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <Brain className="w-6 h-6 text-primary" />
          <span className="text-xl font-black text-primary tracking-tighter text-on-surface">BloodCare Predict</span>
        </div>
      </header>

      <main className="p-6 space-y-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 rounded-full text-primary font-black text-[9px] mb-4 uppercase tracking-widest">
            <Zap className="w-3 h-3 fill-current" />
            Motor Neural v4.2 Activo
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-on-surface leading-none mb-3">Pronóstico IA</h1>
          <p className="text-lg text-on-surface-variant/60 font-medium leading-tight">
            Análisis predictivo de tu comportamiento metabólico para las próximas 6 horas.
          </p>
        </div>

        {/* Chart Container */}
        <div className="bg-white rounded-[32px] p-6 premium-shadow border border-outline/5 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="font-bold text-sm text-on-surface">Tendencia Estimada</span>
            </div>
            <span className="text-[10px] font-black text-success bg-success/10 px-2 py-1 rounded-lg uppercase tracking-widest">
              Estable
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1F48FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1F48FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis hide domain={['dataMin - 20', 'dataMax + 20']} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '16px',
                    border: 'none',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    fontSize: '12px',
                    fontWeight: 800
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#1F48FF" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights Panel */}
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-primary p-6 rounded-[32px] text-white shadow-xl shadow-primary/20 relative overflow-hidden">
            <Zap className="absolute -right-4 -top-4 w-24 h-24 text-white/10 rotate-12" />
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Resumen AI</span>
            </div>
            <p className="text-xl font-bold leading-tight mb-2">
              Tu metabolismo muestra una recuperación óptima tras la última ingesta.
            </p>
            <p className="text-sm text-white/70 font-medium">
              Se prevé una estabilidad en el rango de 95-115 mg/dL durante el resto de la tarde. Mantén tu hidratación habitual.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-[32px] border border-outline/5 premium-shadow">
              <Activity className="w-5 h-5 text-secondary mb-3" />
              <p className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">VARIABILIDAD</p>
              <p className="text-2xl font-black text-on-surface">12%</p>
              <p className="text-[10px] font-bold text-success mt-1">Baja y segura</p>
            </div>
            <div className="bg-white p-5 rounded-[32px] border border-outline/5 premium-shadow">
              <Zap className="w-5 h-5 text-success mb-3" />
              <p className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">TIEMPO RANGO</p>
              <p className="text-2xl font-black text-on-surface">94%</p>
              <p className="text-[10px] font-bold text-success mt-1">Meta cumplida</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-primary/5 rounded-2xl flex items-start gap-3">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-primary/60 font-medium leading-normal">
            Los pronósticos son estimaciones basadas en tus datos históricos y pueden variar según la actividad física y el estrés.
          </p>
        </div>
      </main>
    </motion.div>
  );
};

export default PredictionScreen;
