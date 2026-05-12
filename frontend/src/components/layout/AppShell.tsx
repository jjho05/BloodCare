import { AnimatePresence } from 'motion/react';
import type { ReactNode } from 'react';
import type { Screen } from '../../types';
import type { UserSettings } from '../../db';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
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
  online: boolean;
  userSettings: UserSettings;
}

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
  online,
  userSettings,
}: AppShellProps) => {
  const isLogin = currentScreen === 'login';

  return (
    <div className="min-h-screen bg-[#0f172a] flex">
      {/* Sidebar - Solo visible en Desktop */}
      {!isLogin && (
        <Sidebar
          currentScreen={currentScreen}
          setScreen={setScreen}
          onVoiceStart={onVoiceStart}
          isRecording={isRecording}
          online={online}
          userSettings={userSettings}
        />
      )}

      {/* Main Container */}
      <main className={`flex-1 flex justify-center items-center ${!isLogin ? 'md:ml-64' : ''} p-0 md:p-8 transition-all duration-500`}>
        {/* Phone View Wrapper */}
        <div 
          className={`
            w-full min-h-screen relative overflow-x-hidden bg-surface
            ${!isLogin ? 'md:max-w-[390px] md:min-h-[844px] md:rounded-[3rem] md:shadow-2xl md:border-[8px] md:border-[#1e293b]' : 'max-w-md'}
            mx-auto transition-all duration-700 ease-out
          `}
        >
          {/* Toast de notificaciones */}
          <AnimatePresence>
            {toast && <Toast message={toast.message} type={toast.type} />}
          </AnimatePresence>

          {/* Contenido de la pantalla activa */}
          <AnimatePresence mode="wait">
            <div key={screenKey} className="pb-32 md:pb-20">
              {children}
            </div>
          </AnimatePresence>

          {/* Barra de navegación inferior - Solo visible en Móvil */}
          {!isLogin && (
            <div className="md:hidden">
              <Navbar
                currentScreen={currentScreen}
                setScreen={setScreen}
                onVoiceStart={onVoiceStart}
                isRecording={isRecording}
              />
            </div>
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
      </main>
    </div>
  );
};

export default AppShell;

