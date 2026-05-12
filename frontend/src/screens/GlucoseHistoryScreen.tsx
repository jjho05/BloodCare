import { motion } from 'motion/react';
import { Droplet } from 'lucide-react';

interface GlucoseHistoryScreenProps {
  records: any[];
}

const GlucoseHistoryScreen = ({ records }: GlucoseHistoryScreenProps) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-32 bg-surface min-h-screen">
      <header className="px-6 h-16 flex items-center justify-center relative border-b border-zinc-100 bg-white">
        <h1 className="text-xl font-bold text-zinc-900">Historial Glucemia</h1>
      </header>
      <main className="p-6 space-y-4">
        {records.length > 0 ? (
          [...records].reverse().map((rec, i) => (
            <div key={i} className="bg-white p-5 rounded-3xl border border-zinc-100 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-error/10 rounded-full flex items-center justify-center text-error">
                  <Droplet className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Lectura</p>
                  <p className="text-sm font-medium text-zinc-500">
                    {new Date(rec.timestamp).toLocaleDateString()} - {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-zinc-900">{rec.value}</span>
                <span className="text-[10px] ml-1 text-zinc-300 font-bold uppercase">mg/dL</span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 opacity-20">
            <Droplet className="w-20 h-20 mx-auto mb-4" />
            <p className="font-bold">Sin lecturas registradas</p>
          </div>
        )}
      </main>
    </motion.div>
  );
};

export default GlucoseHistoryScreen;
