import { useState, useEffect, useRef } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Search, 
  Mic, 
  User as UserIcon, 
  Settings, 
  Bell, 
  Brain,
  Droplet,
  Utensils,
  Egg,
  Croissant,
  ChevronRight,
  TrendingUp,
  Activity,
  History,
  Lock,
  Plus,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

import foodDictionary from './data/food_dictionary.json';

const GOOGLE_CLIENT_ID = "1058750211058-22740igvp11f42lh4113mlir39dtqa9r.apps.googleusercontent.com";

// ── COMPONENTES DE UI ──────────────────────────────────────

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'info' | 'error', onClose: () => void }) => (
  <motion.div 
    initial={{ y: -100, opacity: 0 }} 
    animate={{ y: 20, opacity: 1 }} 
    exit={{ y: -100, opacity: 0 }}
    className="fixed top-0 left-0 right-0 z-[100] flex justify-center px-6"
  >
    <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl ios-blur border ${
      type === 'success' ? 'bg-success/90 border-success/20 text-white' : 
      type === 'error' ? 'bg-error/90 border-error/20 text-white' : 
      'bg-primary/90 border-primary/20 text-white'
    }`}>
      {type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <span className="font-bold text-sm">{message}</span>
    </div>
  </motion.div>
);

const Header = ({ title }: { title: string }) => (
  <header className="flex items-center justify-between px-5 h-16 w-full sticky top-0 z-40 bg-white/80 ios-blur">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
        <Droplet className="text-primary w-5 h-5" />
      </div>
      <span className="font-bold text-xl tracking-tight text-on-surface">{title}</span>
    </div>
    <div className="flex items-center gap-4">
      <div className="w-9 h-9 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center overflow-hidden">
        <UserIcon className="w-5 h-5 text-on-surface-variant" />
      </div>
    </div>
  </header>
);

const Navbar = ({ currentScreen, setScreen }: { currentScreen: string, setScreen: (s: string) => void }) => {
  const tabs = [
    { id: 'inicio', icon: Home, label: 'Inicio' },
    { id: 'prediccion', icon: TrendingUp, label: 'IA' },
    { id: 'voz', icon: Mic, label: 'Voz' },
    { id: 'perfil', icon: UserIcon, label: 'Perfil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 ios-blur border-t border-outline-variant/30 px-6 pb-8 pt-3">
      <div className="max-w-md mx-auto flex justify-between items-center">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setScreen(tab.id)}
            className={`flex flex-col items-center gap-1 transition-all ${
              currentScreen === tab.id ? 'text-primary scale-110' : 'text-on-surface-variant/40 hover:text-on-surface-variant'
            }`}
          >
            <tab.icon className={`w-6 h-6 ${currentScreen === tab.id ? 'fill-primary/10' : ''}`} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

const LoginScreen = ({ onLoginSuccess }: { onLoginSuccess: (credentialResponse: any) => void }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen flex flex-col items-center justify-center p-8 bg-surface text-on-surface relative overflow-hidden">
    <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
    <div className="w-24 h-24 bg-primary rounded-[32px] flex items-center justify-center shadow-2xl shadow-primary/20 mb-8 relative z-10"><Droplet className="text-white w-12 h-12" /></div>
    <div className="text-center space-y-3 mb-12 relative z-10"><h1 className="text-5xl font-black tracking-tighter">BloodCare</h1><p className="text-on-surface-variant/80 font-medium max-w-[260px] mx-auto leading-tight text-lg">Tu compañero inteligente para la diabetes.</p></div>
    <div className="w-full max-w-xs space-y-4 relative z-10 flex flex-col items-center">
      <GoogleLogin onSuccess={onLoginSuccess} onError={() => console.log('Login Failed')} shape="pill" theme="filled_blue" text="continue_with" width="320" />
    </div>
  </motion.div>
);

const DashboardScreen = ({ data, currentVal, onSave }: { data: any, currentVal: number, onSave: (v: number) => void }) => {
  const [val, setVal] = useState(currentVal);
  const max = data ? Math.round(Math.max(...data.prediction)) : 180;
  const min = data ? Math.round(Math.min(...data.prediction)) : 90;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-32">
      <Header title="BloodCare" />
      <main className="px-5 pt-8 space-y-6">
        <h1 className="text-3xl font-bold text-on-surface mb-6 tracking-tight">¡Hola de nuevo!</h1>
        <div className="bg-white ios-card-shadow p-8 rounded-[32px] border border-outline-variant/20 flex flex-col items-center text-center">
          <span className="text-[11px] font-mono font-bold text-on-surface-variant/60 mb-2 uppercase tracking-wider">REGISTRO RÁPIDO</span>
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => setVal(v => v - 1)} className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-xl text-primary active:scale-90 transition-transform">-</button>
            <div className="flex items-baseline gap-1">
              <span className="text-6xl font-bold text-on-surface tracking-tight">{val}</span>
              <span className="text-lg font-medium text-on-surface-variant/50">mg/dL</span>
            </div>
            <button onClick={() => setVal(v => v + 1)} className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-xl text-primary active:scale-90 transition-transform">+</button>
          </div>
          <button 
            onClick={() => onSave(val)}
            className="w-full h-12 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
          >
            Guardar Medición
          </button>
          <div className="flex gap-6 pt-6 border-t border-outline-variant/10 w-full justify-center mt-6">
            <div className="flex flex-col items-start"><span className="text-[10px] font-mono font-bold opacity-50">MAX (6H)</span><span className="text-lg font-bold">{max}</span></div>
            <div className="flex flex-col items-start"><span className="text-[10px] font-mono font-bold opacity-50">MIN (6H)</span><span className="text-lg font-bold">{min}</span></div>
          </div>
        </div>
        <div className="bg-[#EEF2FF] p-5 rounded-2xl border border-primary/5 flex gap-4">
          <Brain className="text-primary w-6 h-6 flex-shrink-0" />
          <div><h3 className="font-bold text-primary mb-1">Análisis BloodCare IA</h3><p className="text-sm text-on-surface-variant leading-relaxed">{data?.narrative || "Cargando análisis clínico..."}</p></div>
        </div>
      </main>
    </motion.div>
  );
};

const VoiceLogScreen = ({ userMeals, onImageUpload, onVoiceStart, onAddManual, aiStatus }: { userMeals: any[], onImageUpload: (f: File) => void, onVoiceStart: () => void, onAddManual: (m: any) => void, aiStatus: string }) => {
  const [query, setQuery] = useState('');
  const results = query.length > 2 ? foodDictionary.diccionario.filter(f => 
    f.nombre.toLowerCase().includes(query.toLowerCase()) || 
    f.alias.some(a => a.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 5) : [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-32 bg-white min-h-screen">
      <header className="flex items-center justify-between px-5 h-14 w-full sticky top-0 z-40 bg-white/80 ios-blur">
        <Settings className="w-6 h-6 text-on-surface" /><span className="font-bold text-lg tracking-tight">Bitácora Soberana</span><div className="w-10 h-10"></div>
      </header>
      <main className="p-5 space-y-8">
        <div>
          <div className="flex items-center gap-1.5 text-on-surface-variant/80 font-mono font-bold text-[10px] mb-2 uppercase tracking-widest">
            <Lock className="w-3 h-3" /> {aiStatus} 🔒
          </div>
          <h1 className="text-4xl font-bold text-on-surface mb-2">¿Qué comiste?</h1>
          <p className="text-lg text-on-surface-variant">Busca entre tus 150 platillos instantáneamente.</p>
        </div>

        <div className="relative z-50">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Escribe para buscar..." className="w-full h-14 bg-surface-container-low rounded-2xl px-5 border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface" />
          {results.length > 0 && (
            <div className="absolute top-16 left-0 right-0 bg-white border border-outline-variant/20 rounded-2xl shadow-2xl overflow-hidden z-50">
              {results.map((f, i) => (
                <button key={i} onClick={() => { onAddManual(f); setQuery(''); }} className="w-full p-4 text-left hover:bg-primary/5 flex items-center justify-between border-b border-outline-variant/10 last:border-0">
                  <div><p className="font-bold">{f.nombre}</p><p className="text-xs opacity-50">{f.porcion}</p></div>
                  <div className="flex items-center gap-2 text-primary"><span className="font-bold">{f.carbohidratos_g}g</span><Plus className="w-4 h-4" /></div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-on-surface-variant/60 text-xs uppercase tracking-widest">Registros Recientes</h3>
          {userMeals.length > 0 ? userMeals.map((log: any) => (
            <div key={log.id} className="w-full flex items-center justify-between p-4 bg-surface-container-low rounded-[20px] border border-outline-variant/10">
              <div className="flex items-center gap-4"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm"><Utensils className="w-6 h-6" /></div>
              <div><h4 className="font-bold text-lg">{log.food_name}</h4><p className="text-xs opacity-60">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p></div></div>
              <span className="text-lg font-bold text-primary">{log.carbs_g}g</span>
            </div>
          )) : <div className="text-center py-10 opacity-40"><History className="w-12 h-12 mx-auto mb-2" /><p className="text-sm">No hay comidas hoy</p></div>}
        </div>
      </main>
      <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-3">
        <label className="bg-secondary text-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl cursor-pointer active:scale-95 transition-all">
          <Activity className="w-6 h-6" /><input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && onImageUpload(e.target.files[0])} />
        </label>
        <button onClick={onVoiceStart} className="bg-primary text-white rounded-full w-20 h-20 flex items-center justify-center shadow-2xl active:scale-95 transition-all"><Mic className="w-10 h-10" /></button>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [screen, setScreen] = useState('login');
  const [currentGlucose, setCurrentGlucose] = useState(123);
  const [predictionData, setPredictionData] = useState<any>(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [userMeals, setUserMeals] = useState([]);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'info' | 'error'} | null>(null);
  const [aiStatus, setAiStatus] = useState('Modo Offline Activo');
  
  const worker = useRef<Worker | null>(null);

  useEffect(() => {
    // Inicializar Worker de IA Local (Fase 2)
    worker.current = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.current.onmessage = (e) => {
      const { type, message, text } = e.data;
      if (type === 'status') setAiStatus(message);
      if (type === 'result') {
        setToast({ message: `IA Local entendió: ${text}`, type: 'success' });
        // Aquí conectaríamos con el buscador local para guardar
      }
    };
    worker.current.postMessage({ type: 'load' });

    return () => worker.current?.terminate();
  }, []);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchRecords = async () => {
    try {
      const response = await fetch('https://bloodcare-backend-jmv5.onrender.com/records/glucose?user_id=1');
      const data = await response.json();
      setHistoryRecords(data.map((r: any) => ({ time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: r.value })).reverse());
    } catch (error) { console.error(error); }
  };

  const fetchMeals = async () => {
    try {
      const response = await fetch('https://bloodcare-backend-jmv5.onrender.com/records/meal?user_id=1');
      setUserMeals(await response.json());
    } catch (error) { console.error(error); }
  };

  const saveGlucose = async (val: number) => {
    try {
      await fetch('https://bloodcare-backend-jmv5.onrender.com/records/glucose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: 1, value: val, note: 'Registro manual' }) });
      fetchRecords();
      showToast('Medición guardada en Supabase');
    } catch (error) { showToast('Error al guardar', 'error'); }
  };

  const addManualMeal = async (food: any) => {
    try {
      await fetch('https://bloodcare-backend-jmv5.onrender.com/records/meal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: 1, food_name: food.nombre, carbs_g: food.carbohidratos_g }) });
      fetchMeals();
      showToast(`${food.nombre} registrado`);
    } catch (err) { showToast('Error al registrar comida', 'error'); }
  };

  useEffect(() => { if (screen !== 'login') { fetchRecords(); fetchMeals(); } }, [screen]);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="max-w-md mx-auto min-h-screen relative bg-surface">
        <AnimatePresence>
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <div key={screen}>
            {screen === 'login' && <LoginScreen onLoginSuccess={() => { setScreen('inicio'); showToast('¡Bienvenido a BloodCare!'); }} />}
            {screen === 'inicio' && <DashboardScreen data={predictionData} currentVal={currentGlucose} onSave={(v) => { setCurrentGlucose(v); saveGlucose(v); }} />}
            {screen === 'voz' && <VoiceLogScreen userMeals={userMeals} onImageUpload={() => {}} onVoiceStart={() => {}} onAddManual={addManualMeal} aiStatus={aiStatus} />}
            {screen === 'perfil' && <div className="p-10 text-center">Perfil de Usuario</div>}
          </div>
        </AnimatePresence>
        {screen !== 'login' && <Navbar currentScreen={screen} setScreen={setScreen} />}
      </div>
    </GoogleOAuthProvider>
  );
}
