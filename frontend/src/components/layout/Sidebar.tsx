import { Home, TrendingUp, Mic, Utensils, User, History, Settings, Activity } from 'lucide-react';
import type { Screen } from '../../types';
import type { UserSettings } from '../../db';

interface SidebarProps {
  currentScreen: Screen;
  setScreen: (screen: Screen) => void;
  onVoiceStart: () => void;
  isRecording: boolean;
  online: boolean;
  userSettings: UserSettings;
}

const Sidebar = ({
  currentScreen,
  setScreen,
  onVoiceStart,
  isRecording,
  online,
  userSettings
}: SidebarProps) => {
  const menuItems = [
    { id: 'inicio', label: 'Dashboard', icon: Home },
    { id: 'prediccion', label: 'Predicción IA', icon: TrendingUp },
    { id: 'alimentos', label: 'Registro Comida', icon: Utensils },
    { id: 'glucemia', label: 'Historial', icon: History },
    { id: 'perfil', label: 'Configuración', icon: User },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#121C2B] h-screen fixed left-0 top-0 text-white z-50 border-r border-white/5">
      {/* Logo Section */}
      <div className="p-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl grad-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <Activity className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="font-black text-xl tracking-tight leading-none">BloodCare</h1>
          <span className="text-[10px] text-primary font-bold uppercase tracking-widest">AI Dashboard</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setScreen(item.id as Screen)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                  : 'text-white/50 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
              <span className="font-bold text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Panel */}
      <div className="p-6 bg-black/20 mt-auto border-t border-white/5">
        {/* User Info & Status */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/10">
              <User className="text-white/50 w-6 h-6" />
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#121C2B] ${online ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black truncate">{userSettings.name}</p>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
              Meta: {userSettings.target_min}-{userSettings.target_max} mg/dL
            </p>
          </div>
        </div>

        {/* Voice Button Desktop */}
        <button
          onClick={onVoiceStart}
          className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-500 ${
            isRecording 
              ? 'bg-error animate-pulse shadow-lg shadow-error/40' 
              : 'bg-white/5 hover:bg-white/10 text-white'
          }`}
        >
          <Mic className={`w-4 h-4 ${isRecording ? 'animate-bounce' : ''}`} />
          {isRecording ? 'Escuchando...' : 'Dictar Alimento'}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
