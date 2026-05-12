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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/70 ios-blur border-t border-outline/5 px-6 pt-3 pb-8">
      <div className="flex items-end justify-between max-w-md mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'voz') onVoiceStart?.();
              else setScreen(tab.id as Screen);
            }}
            className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${
              currentScreen === tab.id ? 'text-primary' : 'text-accent/40'
            }`}
          >
            {tab.id === 'voz' ? (
              <div className="relative -top-5">
                <div
                  className={`rounded-2xl w-14 h-14 flex items-center justify-center shadow-xl shadow-primary/20 transition-all duration-500 active:scale-90 ${
                    isRecording ? 'bg-error animate-pulse' : 'grad-primary'
                  }`}
                >
                  <Mic className={`text-white w-7 h-7 ${isRecording ? 'animate-bounce' : ''}`} />
                </div>
              </div>
            ) : (
              <>
                <tab.icon className={`w-6 h-6 transition-transform ${currentScreen === tab.id ? 'scale-110' : 'hover:scale-105'}`} />
                <span className={`text-[9px] font-black uppercase tracking-widest ${currentScreen === tab.id ? 'opacity-100' : 'opacity-0'}`}>
                  {tab.label}
                </span>
              </>
            )}
            {tab.id === 'voz' && (
              <span className={`text-[9px] font-black uppercase tracking-widest mt-[-8px] ${isRecording ? 'text-error animate-pulse' : 'text-primary'}`}>
                {isRecording ? 'Grabando' : 'Voz'}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;
