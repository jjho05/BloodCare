import { motion, AnimatePresence } from 'motion/react';

interface ManualGlucoseModalProps {
  isOpen: boolean;
  onSave: (value: number) => void;
  onClose: () => void;
}

const ManualGlucoseModal = ({ isOpen, onSave, onClose }: ManualGlucoseModalProps) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-[40px] p-8 w-full max-w-xs shadow-2xl"
        >
          <h3 className="text-2xl font-bold mb-6 text-center">Registro Manual</h3>
          <input
            type="number"
            autoFocus
            placeholder="000"
            className="w-full text-6xl font-black text-center mb-8 focus:outline-none placeholder:opacity-10"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = parseInt((e.target as HTMLInputElement).value);
                if (val > 0) {
                  onSave(val);
                }
              }
            }}
          />
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 h-12 rounded-xl font-bold text-zinc-400"
            >
              Cerrar
            </button>
            <button
              onClick={() => {
                const input = document.querySelector('input[type="number"]') as HTMLInputElement;
                const val = parseInt(input.value);
                if (val > 0) {
                  onSave(val);
                }
              }}
              className="flex-1 h-12 bg-zinc-900 text-white rounded-xl font-bold"
            >
              Guardar
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default ManualGlucoseModal;
