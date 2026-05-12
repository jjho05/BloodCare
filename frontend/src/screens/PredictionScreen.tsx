import { motion } from 'motion/react';
import {
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import type { PredictionData, ChartRecord } from '../types';

interface PredictionScreenProps {
  historyRecords: ChartRecord[];
  data: PredictionData | null;
}

const PredictionScreen = ({ historyRecords, data }: PredictionScreenProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="pb-32 bg-surface min-h-screen"
    >
      <header className="fixed top-0 z-40 w-full h-11 bg-white/80 ios-blur flex items-center px-4 border-b border-outline-variant/30">
        <h1 className="text-[17px] font-semibold text-on-surface">Pronóstico BloodCare IA</h1>
      </header>
      <main className="pt-16 px-4 space-y-6">
        <h2 className="text-3xl font-bold text-on-surface mb-3 tracking-tight">Predicción a 6 horas</h2>
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-outline-variant/20">
          <div className="bg-[#1e293b] p-4 aspect-[16/9]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyRecords.length > 0 ? historyRecords : [{ time: '00:00', value: 120 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                />
                <Area type="monotone" dataKey="value" stroke="#3265ef" strokeWidth={3} fill="#3265ef" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </motion.div>
  );
};

export default PredictionScreen;
