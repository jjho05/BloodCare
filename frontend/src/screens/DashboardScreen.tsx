import { motion } from 'motion/react';
import { History, Mic, Droplet, ShieldCheck } from 'lucide-react';
import type { UserSettings } from '../db';
import type { Screen } from '../types';
import Header from '../components/layout/Header';

interface DashboardScreenProps {
  currentVal: number;
  online: boolean;
  historyRecords: any[];
  userSettings: UserSettings;
  setScreen: (screen: Screen) => void;
  onManualGlucose: () => void;
  onVoiceStart: () => void;
  isRecording: boolean;
}

const DashboardScreen = ({
  currentVal,
  online,
  historyRecords,
  userSettings,
  setScreen,
  onManualGlucose,
  onVoiceStart,
  isRecording,
}: DashboardScreenProps) => {
  const avg =
    historyRecords.length > 0
      ? Math.round(historyRecords.reduce((a: any, b: any) => a + b.value, 0) / historyRecords.length)
      : 0;
  const max = historyRecords.length > 0 ? Math.max(...historyRecords.map((r: any) => r.value)) : 0;
  const min = historyRecords.length > 0 ? Math.min(...historyRecords.map((r: any) => r.value)) : 0;
  const isSafe = avg >= userSettings.target_min && avg <= userSettings.target_max;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-32 bg-surface min-h-screen">
      <Header title="BloodCare" online={online} />

      <main className="px-5 pt-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-on-surface mb-6 tracking-tight">¡Hola de nuevo!</h1>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <button
              onClick={() => setScreen('glucemia')}
              className="bg-white text-zinc-500 h-16 rounded-3xl font-bold flex flex-col items-center justify-center gap-1 active:scale-95 transition-all border border-zinc-100 shadow-sm"
            >
              <History className="w-5 h-5" />
              <span className="text-[10px] uppercase tracking-tighter">Glucemia</span>
            </button>
            <button
              onClick={onVoiceStart}
              className={`h-16 rounded-3xl font-bold flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-lg ${
                isRecording
                  ? 'bg-error animate-pulse text-white shadow-error/20'
                  : 'bg-primary text-white shadow-primary/20'
              }`}
            >
              <Mic className="w-6 h-6" />
              <span className="text-[10px] uppercase tracking-tighter">{isRecording ? '...' : 'Dictar'}</span>
            </button>
            <button
              onClick={onManualGlucose}
              className="bg-white text-error h-16 rounded-3xl font-bold flex flex-col items-center justify-center gap-1 active:scale-95 transition-all border border-error/10 shadow-sm"
            >
              <Droplet className="w-5 h-5 fill-current" />
              <span className="text-[10px] uppercase tracking-tighter">Glucosa</span>
            </button>
          </div>
          <div className="flex justify-center">
            <div className="inline-flex items-center bg-white px-3 py-1.5 rounded-full border border-outline-variant/10 shadow-sm">
              <span className={`w-2 h-2 rounded-full mr-2 ${online ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-widest">
                ÚLTIMA LECTURA: {currentVal} MG/DL
              </span>
            </div>
          </div>
        </div>

        {/* Hero Card */}
        <div className="bg-white ios-card-shadow p-8 rounded-[32px] border border-outline-variant/20 flex flex-col items-center text-center">
          <span className="text-[11px] font-mono font-bold text-on-surface-variant/60 mb-2 uppercase tracking-wider">
            PROMEDIO DEL DÍA
          </span>
          <div className="flex items-baseline gap-1 mb-2">
            <span className={`text-6xl font-bold tracking-tight ${isSafe ? 'text-on-surface' : 'text-error'}`}>
              {avg}
            </span>
            <span className="text-lg font-medium text-on-surface-variant/50">mg/dL</span>
          </div>
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border mb-8 ${
              isSafe
                ? 'bg-green-50 border-green-100 text-green-700'
                : 'bg-red-50 border-red-100 text-red-700'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isSafe ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-[12px] font-semibold">{isSafe ? 'En rango normal' : 'Fuera de meta'}</span>
          </div>

          <div className="flex gap-6 pt-6 border-t border-outline-variant/10 w-full justify-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-error"></div>
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-mono font-bold text-on-surface-variant/50 uppercase">MÁXIMO</span>
                <span className="text-lg font-bold text-on-surface">
                  {max}{' '}
                  <span className="text-[10px] font-medium opacity-40 uppercase">Día</span>
                </span>
              </div>
            </div>
            <div className="w-[1px] h-8 bg-outline-variant/20"></div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-tertiary"></div>
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-mono font-bold text-on-surface-variant/50 uppercase">MÍNIMO</span>
                <span className="text-lg font-bold text-on-surface">
                  {min}{' '}
                  <span className="text-[10px] font-medium opacity-40 uppercase">Día</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Security Detail */}
        <div className="bg-white ios-card-shadow p-5 rounded-2xl border border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="font-bold text-on-surface-variant text-sm">Privacidad Local Garantizada</span>
          </div>
          <ShieldCheck className="text-on-surface-variant/40 w-5 h-5" />
        </div>
      </main>
    </motion.div>
  );
};

export default DashboardScreen;
