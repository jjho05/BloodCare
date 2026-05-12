import { motion, AnimatePresence } from 'motion/react';
import { Droplet } from 'lucide-react';

interface GlucoseConfirmDialogProps {
  pendingGlucose: number | null;
  onConfirm: (value: number) => void;
  onCancel: () => void;
}

const GlucoseConfirmDialog = ({ pendingGlucose, onConfirm, onCancel }: GlucoseConfirmDialogProps) => (
  <AnimatePresence>
    {pendingGlucose && (
      <motion.div
        initial={{ y: 200 }}
        animate={{ y: 0 }}
        exit={{ y: 200 }}
        className="fixed inset-x-0 bottom-0 z-[100] p-6"
      >
        <div className="bg-white rounded-[32px] p-8 shadow-2xl border border-zinc-100 flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center text-error animate-pulse">
            <Droplet className="w-8 h-8 fill-current" />
          </div>
          <div>
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Detectado por Voz</p>
            <h3 className="text-4xl font-black text-zinc-900">
              {pendingGlucose} <span className="text-lg font-medium opacity-30">mg/dL</span>
            </h3>
          </div>
          <div className="flex gap-4 w-full">
            <button
              onClick={onCancel}
              className="flex-1 h-14 rounded-2xl bg-zinc-100 text-zinc-500 font-bold active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={() => onConfirm(pendingGlucose)}
              className="flex-1 h-14 rounded-2xl bg-zinc-900 text-white font-bold active:scale-95 transition-all"
            >
              Sí, Guardar
            </button>
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default GlucoseConfirmDialog;
