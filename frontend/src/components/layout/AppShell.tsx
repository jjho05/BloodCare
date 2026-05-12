import { AnimatePresence } from 'motion/react';
import type { ReactNode } from 'react';
import type { Screen } from '../../types';
import Navbar from './Navbar';
import Toast from './Toast';
import GlucoseConfirmDialog from './GlucoseConfirmDialog';
import ManualGlucoseModal from './ManualGlucoseModal';

interface AppShellProps {
  children: ReactNode;
  currentScreen: Screen;
  screenKey: string;
  setScreen: (screen: Screen) => void;
  toast: { message: string; type: 'success' | 'info' | 'error' } | null;
  isRecording: boolean;
  onVoiceStart: () => void;
  pendingGlucose: number | null;
  onConfirmGlucose: (value: number) => void;
  onCancelGlucose: () => void;
  showManualGlucose: boolean;
  onSaveManualGlucose: (value: number) => void;
  onCloseManualGlucose: () => void;
}

/**
 * AppShell — Layout principal que envuelve todas las pantallas.
 * Contiene la barra de navegación, toasts, y los modales globales
 * de glucosa (confirmación por voz y registro manual).
 */
const AppShell = ({
  children,
  currentScreen,
  screenKey,
  setScreen,
  toast,
  isRecording,
  onVoiceStart,
  pendingGlucose,
  onConfirmGlucose,
  onCancelGlucose,
  showManualGlucose,
  onSaveManualGlucose,
  onCloseManualGlucose,
}: AppShellProps) => {
  return (
    <div className="max-w-md mx-auto min-h-screen relative overflow-x-hidden bg-surface">
      {/* Toast de notificaciones */}
      <AnimatePresence>{toast && <Toast message={toast.message} type={toast.type} />}</AnimatePresence>

      {/* Contenido de la pantalla activa */}
      <AnimatePresence mode="wait">
        <div key={screenKey}>{children}</div>
      </AnimatePresence>

      {/* Barra de navegación inferior */}
      {currentScreen !== 'login' && (
        <Navbar
          currentScreen={currentScreen}
          setScreen={setScreen}
          onVoiceStart={onVoiceStart}
          isRecording={isRecording}
        />
      )}

      {/* Diálogo de confirmación de glucosa por voz */}
      <GlucoseConfirmDialog
        pendingGlucose={pendingGlucose}
        onConfirm={onConfirmGlucose}
        onCancel={onCancelGlucose}
      />

      {/* Modal de registro manual de glucosa */}
      <ManualGlucoseModal
        isOpen={showManualGlucose}
        onSave={onSaveManualGlucose}
        onClose={onCloseManualGlucose}
      />
    </div>
  );
};

export default AppShell;
