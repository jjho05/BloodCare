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
      <main className={`flex-1 flex flex-col ${!isLogin ? 'md:ml-64' : ''} transition-all duration-500`}>
        {/* Full Screen Content Wrapper */}
        <div 
          className={`
            w-full min-h-screen relative bg-surface
            ${!isLogin ? 'md:p-8 lg:p-12' : 'max-w-md mx-auto'}
            transition-all duration-700 ease-out
          `}
        >
          <div className={`${!isLogin ? 'max-w-7xl mx-auto' : ''}`}>
            {/* Toast de notificaciones */}
            <AnimatePresence>
              {toast && <Toast message={toast.message} type={toast.type} />}
            </AnimatePresence>

            {/* Contenido de la pantalla activa */}
            <AnimatePresence mode="wait">
              <div key={screenKey} className="pb-32 md:pb-0">
                {children}
              </div>
            </AnimatePresence>
          </div>

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

