import { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, History, Utensils, StopCircle, Mic, Plus } from 'lucide-react';
import foodDictionary from '../data/food_dictionary.json';

interface VoiceLogScreenProps {
  userMeals: any[];
  onVoiceStart: () => void;
  isRecording: boolean;
  onAddManual: (food: any) => void;
  aiStatus: string;
  online: boolean;
}

const VoiceLogScreen = ({ userMeals, onVoiceStart, isRecording, onAddManual, aiStatus, online }: VoiceLogScreenProps) => {
  const [query, setQuery] = useState('');
  const results =
    query.length > 2
      ? foodDictionary.diccionario
          .filter(
            (f) =>
              f.nombre.toLowerCase().includes(query.toLowerCase()) ||
              f.alias.some((a) => a.toLowerCase().includes(query.toLowerCase()))
          )
          .slice(0, 5)
      : [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-32 bg-surface min-h-screen">
      <header className="glass-header ios-blur flex items-center justify-center h-18 w-full sticky top-0 z-40">
        <h1 className="text-xl font-black text-primary tracking-tighter">Bitácora Nutricional</h1>
      </header>

      <main className="p-6 space-y-10">
        <div className="pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 rounded-full text-primary font-black text-[9px] mb-4 uppercase tracking-widest">
            <Lock className="w-3 h-3" />
            {aiStatus}
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-on-surface leading-none mb-4">¿Qué comiste?</h1>
          <p className="text-xl text-on-surface-variant/60 font-medium leading-tight">
            Usa tu voz o busca manualmente. Tu privacidad es nuestra prioridad.
          </p>
        </div>

        <div className="relative z-50">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe aquí para buscar..."
            className="w-full h-16 bg-white rounded-3xl px-6 focus:outline-none focus:ring-4 focus:ring-primary/10 premium-shadow border border-outline/5 transition-all"
          />
          {results.length > 0 && (
            <div className="absolute top-20 left-0 right-0 bg-white/90 ios-blur rounded-[32px] shadow-2xl overflow-hidden border border-outline/10">
              {results.map((f, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onAddManual(f);
                    setQuery('');
                  }}
                  className="w-full p-5 text-left hover:bg-primary/5 flex justify-between border-b border-outline/5 last:border-0 transition-colors"
                >
                  <div>
                    <p className="font-bold text-lg">{f.nombre}</p>
                    <p className="text-xs text-on-surface-variant font-bold opacity-40 uppercase tracking-widest">{f.porcion}</p>
                  </div>
                  <div className="flex items-center gap-3 text-primary">
                    <span className="text-lg font-black">{f.carbohidratos_g}g</span>
                    <Plus className="w-5 h-5" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em]">
              REGISTROS RECIENTES
            </h2>
            <button className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
              <History className="w-4 h-4" />
              Ver todo
            </button>
          </div>

          <div className="space-y-4">
            {userMeals.length > 0 ? (
              userMeals.map((log: any, i: number) => (
                <button
                  key={i}
                  className="w-full flex items-center justify-between p-5 bg-white rounded-[32px] active:scale-[0.98] transition-all text-left premium-shadow border border-outline/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center text-primary">
                      <Utensils className="w-7 h-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-on-surface text-xl leading-none truncate mb-1">
                        {log.nombre || log.food_name || 'Comida'}
                      </h4>
                      <p className="text-[11px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                        {log.synced === 0 && '⌛'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-center pr-2">
                    <span className="text-2xl font-black text-primary">
                      {log.carbohidratos_g || log.carbs_g || 0}
                      <span className="text-xs ml-1 font-bold opacity-30">g</span>
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-16 opacity-10">
                <History className="w-16 h-16 mx-auto mb-4" />
                <p className="font-black text-xs uppercase tracking-[0.3em]">Historial Vacío</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <div className="fixed bottom-28 right-6 z-50 flex flex-col items-center gap-4">
        {isRecording && (
          <motion.div
            animate={{ y: [0, -8, 0], scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="bg-white/90 ios-blur px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-primary shadow-xl border border-primary/10"
          >
            Escuchando...
          </motion.div>
        )}
        <button
          onClick={onVoiceStart}
          className={`rounded-[32px] w-20 h-20 flex items-center justify-center shadow-[0_20px_50px_rgba(31,72,255,0.3)] transition-all duration-500 active:scale-90 ${
            isRecording ? 'bg-error animate-pulse shadow-error/40' : 'grad-primary'
          }`}
        >
          {isRecording ? (
            <StopCircle className="w-10 h-10 text-white" />
          ) : (
            <Mic className={`w-10 h-10 text-white ${isRecording ? '' : 'animate-pulse'}`} />
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default VoiceLogScreen;
