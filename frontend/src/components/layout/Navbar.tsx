import { Home, TrendingUp, Mic, Utensils, User } from 'lucide-react';
import type { Screen } from '../../types';

interface NavbarProps {
  currentScreen: Screen;
  setScreen: (screen: Screen) => void;
  onVoiceStart?: () => void;
  isRecording?: boolean;
}

const Navbar = ({ currentScreen, setScreen, onVoiceStart, isRecording }: NavbarProps) => {
  const tabs = [
    { id: 'inicio', label: 'Inicio', icon: Home },
    { id: 'prediccion', label: 'IA', icon: TrendingUp },
    { id: 'voz', label: 'Voz', icon: Mic },
    { id: 'alimentos', label: 'Comida', icon: Utensils },
    { id: 'perfil', label: 'Perfil', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 ios-blur border-t border-outline-variant/30 px-6 pt-3 pb-8 shadow-lg">
      <div className="flex items-end justify-between max-w-md mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'voz') onVoiceStart?.();
              else setScreen(tab.id as Screen);
            }}
            className={`flex flex-col items-center gap-1 transition-colors ${
              currentScreen === tab.id ? 'text-primary' : 'text-on-surface-variant/60'
            }`}
          >
            {tab.id === 'voz' ? (
              <div className="relative -top-4">
                <div
                  className={`rounded-full w-14 h-14 flex items-center justify-center shadow-xl shadow-primary/30 transition-transform active:scale-90 ${
                    isRecording ? 'bg-error animate-pulse' : 'bg-primary'
                  }`}
                >
                  <Mic className="text-white w-7 h-7" />
                </div>
              </div>
            ) : (
              <>
                <tab.icon className={`w-6 h-6 ${currentScreen === tab.id ? 'fill-current' : ''}`} />
                <span className="text-[10px] font-semibold">{tab.label}</span>
              </>
            )}
            {tab.id === 'voz' && <span className="text-[10px] font-semibold mt-[-8px]">{tab.label}</span>}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;
