import { useState } from 'react';
import { motion } from 'motion/react';
import { User, Target, TrendingUp, Trash2, RefreshCcw } from 'lucide-react';
import type { UserSettings } from '../db';

interface ProfileScreenProps {
  userSettings: UserSettings;
  onUpdate: (settings: UserSettings) => void;
  onLogout: () => void;
  onClearMeals: () => void;
  onResetAll: () => void;
}

const ProfileScreen = ({ userSettings, onUpdate, onLogout, onClearMeals, onResetAll }: ProfileScreenProps) => {
  const [name, setName] = useState(userSettings.name);
  const [min, setMin] = useState(userSettings.target_min);
  const [max, setMax] = useState(userSettings.target_max);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-32 bg-white min-h-screen">
      <header className="px-5 h-16 w-full sticky top-0 z-40 bg-[#121C2B] flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Configuración</h1>
        <button
          onClick={() => onUpdate({ ...userSettings, name, target_min: min, target_max: max })}
          className="text-primary-container font-bold bg-white/10 px-4 py-1 rounded-full text-sm"
        >
          Guardar
        </button>
      </header>
      <main className="p-6 space-y-8">
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20">
            <User className="w-10 h-10 text-primary" />
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-2xl font-bold text-center bg-transparent border-b border-primary/20 focus:outline-none w-full"
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-[11px] font-mono font-bold text-on-surface-variant/60 uppercase tracking-widest">
            Metas Metabólicas (mg/dL)
          </h3>
          <div className="bg-surface-container-low p-6 rounded-[28px] space-y-6 border border-outline-variant/10">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Target className="text-primary w-5 h-5" />
                <p className="font-bold text-sm">Límite Inferior</p>
              </div>
              <input
                type="number"
                value={min}
                onChange={(e) => setMin(parseInt(e.target.value) || 0)}
                className="w-16 h-10 bg-white rounded-xl text-center font-bold border border-outline-variant/30"
              />
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <TrendingUp className="text-secondary w-5 h-5" />
                <p className="font-bold text-sm">Límite Superior</p>
              </div>
              <input
                type="number"
                value={max}
                onChange={(e) => setMax(parseInt(e.target.value) || 0)}
                className="w-16 h-10 bg-white rounded-xl text-center font-bold border border-outline-variant/30"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[11px] font-mono font-bold text-on-surface-variant/60 uppercase tracking-widest">
            Mantenimiento de Datos
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={onClearMeals}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-error/5 rounded-[28px] border border-error/10 hover:bg-error/10 transition-colors group"
            >
              <Trash2 className="w-5 h-5 text-error group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black text-error uppercase tracking-widest text-center">Borrar Comidas</span>
            </button>
            <button
              onClick={onResetAll}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-on-surface/5 rounded-[28px] border border-on-surface/5 hover:bg-on-surface/10 transition-colors group"
            >
              <RefreshCcw className="w-5 h-5 text-on-surface/60 group-hover:rotate-180 transition-transform duration-500" />
              <span className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest text-center">Reiniciar Todo</span>
            </button>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full h-14 border-2 border-error/20 text-error rounded-2xl font-bold active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          Cerrar Sesión
        </button>
      </main>
    </motion.div>
  );
};

export default ProfileScreen;
