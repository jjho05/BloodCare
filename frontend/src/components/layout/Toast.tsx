import { motion } from 'motion/react';
import { CheckCircle, Info } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'info' | 'error';
}

const Toast = ({ message, type }: ToastProps) => (
  <motion.div
    initial={{ y: -100, opacity: 0 }}
    animate={{ y: 20, opacity: 1 }}
    exit={{ y: -100, opacity: 0 }}
    className="fixed top-0 left-0 right-0 z-[100] flex justify-center px-6"
  >
    <div
      className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl ios-blur border ${
        type === 'success'
          ? 'bg-success/90 border-success/20 text-white'
          : type === 'error'
            ? 'bg-error/90 border-error/20 text-white'
            : 'bg-primary/90 border-primary/20 text-white'
      }`}
    >
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
      <span className="font-bold text-sm">{message}</span>
    </div>
  </motion.div>
);

export default Toast;
