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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-32 bg-white min-h-screen">
      <header className="px-6 h-16 flex items-center justify-center relative border-b border-zinc-100">
        <h1 className="text-xl font-bold text-zinc-900">BloodCare Bitácora</h1>
      </header>

      <main className="p-5 space-y-8">
        <div>
          <div className="flex items-center gap-1.5 text-on-surface-variant/80 font-mono font-bold text-[10px] mb-2 uppercase tracking-widest">
            <Lock className="w-3 h-3" />
            {aiStatus} 🔒
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-on-surface leading-[1.1] mb-2">¿Qué comiste?</h1>
          <p className="text-lg text-on-surface-variant leading-snug">
            Dilo en voz alta o busca. Procesamiento 100% privado.
          </p>
        </div>

        <div className="relative z-50">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca tu comida..."
            className="w-full h-14 bg-surface-container-low rounded-2xl px-5 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {results.length > 0 && (
            <div className="absolute top-16 left-0 right-0 bg-white border rounded-2xl shadow-2xl overflow-hidden">
              {results.map((f, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onAddManual(f);
                    setQuery('');
                  }}
                  className="w-full p-4 text-left hover:bg-primary/5 flex justify-between border-b last:border-0"
                >
                  <div>
                    <p className="font-bold">{f.nombre}</p>
                    <p className="text-xs opacity-50">{f.porcion}</p>
                  </div>
                  <div className="flex items-center gap-2 text-primary">
                    <span className="font-bold">{f.carbohidratos_g}g</span>
                    <Plus className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-mono font-bold text-on-surface-variant uppercase tracking-widest">
              RECIENTES
            </h2>
            <button className="text-sm font-bold text-primary flex items-center gap-1">
              <History className="w-4 h-4" />
              Historial
            </button>
          </div>

          <div className="space-y-4">
            {userMeals.length > 0 ? (
              userMeals.map((log: any, i: number) => (
                <button
                  key={i}
                  className="w-full flex items-center justify-between p-4 bg-surface-container-low rounded-[20px] active:scale-[0.98] transition-transform text-left border border-outline-variant/10"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-primary">
                      <Utensils className="w-7 h-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-on-surface text-lg leading-tight truncate">
                        {log.nombre || log.food_name || 'Comida Registrada'}
                      </h4>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                        {log.synced === 0 && '⌛'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-center">
                    <span className="text-xl font-black text-primary">
                      {log.carbohidratos_g || log.carbs_g || 0}
                      <span className="text-[10px] ml-0.5 opacity-50 uppercase">g</span>
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-10 opacity-30">
                <History className="w-10 h-10 mx-auto mb-2" />
                <p className="text-sm font-bold">Sin registros hoy</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <div className="fixed bottom-24 right-6 z-50 flex flex-col items-center gap-3">
        {isRecording && (
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="bg-white/90 ios-blur px-4 py-2 rounded-full text-xs font-bold text-primary shadow-sm border border-primary/10"
          >
            Escuchando...
          </motion.div>
        )}
        <button
          onClick={onVoiceStart}
          className={`rounded-full w-20 h-20 flex items-center justify-center shadow-2xl transition-all ${
            isRecording ? 'bg-error animate-pulse shadow-error/40' : 'bg-primary shadow-primary/40'
          }`}
        >
          {isRecording ? (
            <StopCircle className="w-10 h-10 text-white" />
          ) : (
            <Mic className="w-10 h-10 text-white" />
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default VoiceLogScreen;
