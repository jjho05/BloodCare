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
          <div className="grid grid-cols-3 gap-4 mb-8">
            <button
              onClick={() => setScreen('glucemia')}
              className="bg-white/80 h-20 rounded-[28px] font-bold flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all border border-outline/5 premium-shadow group"
            >
              <div className="w-8 h-8 bg-accent/10 rounded-xl flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                <History className="w-5 h-5" />
              </div>
              <span className="text-[9px] uppercase font-black tracking-widest text-on-surface-variant/70">Glucemia</span>
            </button>
            <button
              onClick={onVoiceStart}
              className={`h-20 rounded-[28px] font-bold flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xl shadow-primary/20 grad-primary text-white relative overflow-hidden group`}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Mic className={`w-7 h-7 ${isRecording ? 'animate-bounce' : ''}`} />
              <span className="text-[9px] uppercase font-black tracking-widest">{isRecording ? 'Escuchando' : 'Dictar'}</span>
            </button>
            <button
              onClick={onManualGlucose}
              className="bg-white/80 h-20 rounded-[28px] font-bold flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all border border-outline/5 premium-shadow group"
            >
              <div className="w-8 h-8 bg-error/10 rounded-xl flex items-center justify-center text-error group-hover:scale-110 transition-transform">
                <Droplet className="w-5 h-5 fill-current" />
              </div>
              <span className="text-[9px] uppercase font-black tracking-widest text-on-surface-variant/70">Glucosa</span>
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
        <div className="bg-white premium-shadow p-8 rounded-[32px] border border-outline/10 flex flex-col items-center text-center">
          <span className="text-[11px] font-mono font-bold text-on-surface-variant mb-2 uppercase tracking-widest opacity-60">
            PROMEDIO DEL DÍA
          </span>
          <div className="flex items-baseline gap-1 mb-4">
            <span className={`text-7xl font-black tracking-tighter ${isSafe ? 'text-primary' : 'text-error'}`}>
              {avg}
            </span>
            <span className="text-xl font-bold text-on-surface-variant/30">mg/dL</span>
          </div>
          <div
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full mb-8 transition-colors ${
              isSafe
                ? 'bg-success/10 text-success'
                : 'bg-error/10 text-error'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isSafe ? 'bg-success shadow-[0_0_8px_rgba(110,239,200,0.5)]' : 'bg-error'}`}></span>
            <span className="text-[13px] font-bold uppercase tracking-wide">{isSafe ? 'Metabolismo Estable' : 'Fuera de meta'}</span>
          </div>

          <div className="flex gap-10 pt-8 border-t border-outline-variant w-full justify-center">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono font-bold text-on-surface-variant mb-1 uppercase opacity-40">MÁXIMO</span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-error"></div>
                <span className="text-xl font-black text-on-surface">{max}</span>
              </div>
            </div>
            <div className="w-[1px] h-10 bg-outline-variant"></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono font-bold text-on-surface-variant mb-1 uppercase opacity-40">MÍNIMO</span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                <span className="text-xl font-black text-on-surface">{min}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security Detail */}
        <div className="bg-white/50 backdrop-blur-md p-5 rounded-3xl border border-outline/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-success"></div>
            <span className="font-bold text-on-surface-variant text-sm tracking-tight">Privacidad Local Garantizada</span>
          </div>
          <ShieldCheck className="text-primary/30 w-5 h-5" />
        </div>
      </main>
    </motion.div>
  );
};

export default DashboardScreen;
