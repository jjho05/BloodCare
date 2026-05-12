import { useState, useEffect, useRef } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  TrendingUp, 
  Mic, 
  User, 
  Settings, 
  Bell, 
  PlusCircle, 
  Info, 
  ChevronRight, 
  Lock, 
  ShieldCheck, 
  CheckCircle,
  Utensils,
  History,
  Egg,
  Croissant,
  Brain,
  LayoutDashboard,
  Droplet,
  Cloud,
  CloudOff,
  StopCircle,
  Plus
} from 'lucide-react';
import { 
  XAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart,
  Area
} from 'recharts';

import foodDictionary from './data/food_dictionary.json';
import { db, type UserSettings } from './db';

const GOOGLE_CLIENT_ID = "1058750211058-22740igvp11f42lh4113mlir39dtqa9r.apps.googleusercontent.com";

// --- Types ---
type Screen = 'login' | 'inicio' | 'prediccion' | 'voz' | 'perfil';

// --- UI Components ---

const Toast = ({ message, type }: { message: string, type: 'success' | 'info' | 'error' }) => (
  <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: -100, opacity: 0 }} className="fixed top-0 left-0 right-0 z-[100] flex justify-center px-6">
    <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl ios-blur border ${type === 'success' ? 'bg-success/90 border-success/20 text-white' : type === 'error' ? 'bg-error/90 border-error/20 text-white' : 'bg-primary/90 border-primary/20 text-white'}`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
      <span className="font-bold text-sm">{message}</span>
    </div>
  </motion.div>
);

const Navbar = ({ currentScreen, setScreen }: { currentScreen: Screen, setScreen: (s: Screen) => void }) => {
  const tabs = [
    { id: 'inicio', label: 'Inicio', icon: Home },
    { id: 'prediccion', label: 'IA', icon: TrendingUp },
    { id: 'voz', label: 'Voz', icon: Mic },
    { id: 'perfil', label: 'Perfil', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 ios-blur border-t border-outline-variant/30 px-6 pt-3 pb-8 shadow-lg">
      <div className="flex items-end justify-between max-w-md mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setScreen(tab.id as Screen)}
            className={`flex flex-col items-center gap-1 transition-colors ${
              currentScreen === tab.id ? 'text-primary' : 'text-on-surface-variant/60'
            }`}
          >
            {tab.id === 'voz' ? (
              <div className="relative -top-4">
                <div className={`rounded-full w-14 h-14 flex items-center justify-center shadow-xl shadow-primary/30 transition-transform active:scale-90 ${
                  currentScreen === 'voz' ? 'bg-primary' : 'bg-primary/90'
                }`}>
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

const Header = ({ title, online, showNotification = true }: { title: string, online?: boolean, showNotification?: boolean }) => {
  return (
    <header className="flex items-center justify-between px-5 h-16 w-full bg-[#121C2B] md:bg-white md:border-b md:border-outline-variant sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <span className="text-[20px] font-bold text-white md:text-primary tracking-tight">{title}</span>
        {online !== undefined && (online ? <Cloud className="w-4 h-4 text-success opacity-50" /> : <CloudOff className="w-4 h-4 text-error" />)}
      </div>
      {showNotification && (
        <button className="w-10 h-10 rounded-full bg-white/10 md:bg-surface-container flex items-center justify-center text-white md:text-on-surface">
          <Bell className="w-5 h-5" />
        </button>
      )}
    </header>
  );
};

// --- Screens ---

const LoginScreen = ({ onLogin }: { onLogin: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="min-h-screen flex flex-col items-center justify-center p-5 space-y-10 bg-surface"
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20">
          <Droplet className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-on-surface">BloodCare</h1>
          <p className="text-on-surface-variant font-medium">Bienvenido a BloodCare AI</p>
        </div>
      </div>

      <div className="w-full max-w-[400px] flex flex-col space-y-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider px-1">Correo Electrónico</label>
            <input 
              type="email" 
              placeholder="ejemplo@correo.com" 
              className="w-full h-12 bg-white border border-outline-variant rounded-xl px-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Contraseña</label>
              <button className="text-xs font-bold text-primary">Olvidé mi contraseña</button>
            </div>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="w-full h-12 bg-white border border-outline-variant rounded-xl px-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
        </div>

        <button 
          onClick={onLogin}
          className="w-full h-12 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Iniciar Sesión
        </button>

        <div className="flex items-center gap-4">
          <div className="h-[0.5px] flex-1 bg-outline-variant/30"></div>
          <span className="text-[10px] font-bold text-outline-variant uppercase tracking-widest">O</span>
          <div className="h-[0.5px] flex-1 bg-outline-variant/30"></div>
        </div>

        <GoogleLogin 
          onSuccess={onLogin} 
          onError={() => {}}
          shape="pill"
          theme="outline"
          width="100%"
        />

        <p className="mt-4 text-center text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-widest">
          Hackatec ITCM Local Stage 2026
        </p>
      </div>
    </motion.div>
  );
};

const DashboardScreen = ({ currentVal, onSave, online, historyRecords, userSettings }: any) => {
  const avg = historyRecords.length > 0 ? Math.round(historyRecords.reduce((a:any, b:any) => a + b.value, 0) / historyRecords.length) : 0;
  const max = historyRecords.length > 0 ? Math.max(...historyRecords.map((r:any) => r.value)) : 0;
  const min = historyRecords.length > 0 ? Math.min(...historyRecords.map((r:any) => r.value)) : 0;
  const isSafe = avg >= userSettings.target_min && avg <= userSettings.target_max;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-32 bg-surface min-h-screen">
      <Header title="BloodCare" online={online} />
      
      <main className="px-5 pt-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-on-surface mb-6 tracking-tight">¡Hola de nuevo!</h1>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button className="bg-primary text-white h-12 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-primary/20">
              <TrendingUp className="w-5 h-5" />
              Predicción
            </button>
            <button className="bg-white text-on-surface h-12 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all border border-outline-variant/30">
              <PlusCircle className="w-5 h-5" />
              Registro
            </button>
          </div>
          <div className="flex justify-center">
            <div className="inline-flex items-center bg-white px-3 py-1.5 rounded-full border border-outline-variant/10 shadow-sm">
              <span className={`w-2 h-2 rounded-full mr-2 ${online ? 'bg-success' : 'bg-error'}`}></span>
              <span className="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-widest">
                LECTURA ACTUAL: {currentVal} MG/DL
              </span>
            </div>
          </div>
        </div>

        {/* Hero Card */}
        <div className="bg-white ios-card-shadow p-8 rounded-[32px] border border-outline-variant/20 flex flex-col items-center text-center">
          <span className="text-[11px] font-mono font-bold text-on-surface-variant/60 mb-2 uppercase tracking-wider">PROMEDIO DEL DÍA</span>
          <div className="flex items-baseline gap-1 mb-2">
            <span className={`text-6xl font-bold tracking-tight ${isSafe ? 'text-on-surface' : 'text-error'}`}>{avg}</span>
            <span className="text-lg font-medium text-on-surface-variant/50">mg/dL</span>
          </div>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border mb-8 ${isSafe ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isSafe ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-[12px] font-semibold">{isSafe ? 'En rango normal' : 'Fuera de meta'}</span>
          </div>
          
          <div className="flex gap-6 pt-6 border-t border-outline-variant/10 w-full justify-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-error"></div>
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-mono font-bold text-on-surface-variant/50 uppercase">MÁXIMO</span>
                <span className="text-lg font-bold text-on-surface">{max} <span className="text-[10px] font-medium opacity-40 uppercase">Día</span></span>
              </div>
            </div>
            <div className="w-[1px] h-8 bg-outline-variant/20"></div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-tertiary"></div>
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-mono font-bold text-on-surface-variant/50 uppercase">MÍNIMO</span>
                <span className="text-lg font-bold text-on-surface">{min} <span className="text-[10px] font-medium opacity-40 uppercase">Día</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insight */}
        <div className="bg-[#EEF2FF] p-5 rounded-2xl border border-primary/5 flex gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Brain className="text-primary w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-primary mb-1">Análisis BloodCare IA</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Sistema de sincronización <span className="font-semibold text-primary">Offline-First</span> activo para el ITCM.
            </p>
          </div>
        </div>

        {/* Security Detail */}
        <div className="bg-white ios-card-shadow p-5 rounded-2xl border border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="font-bold text-on-surface-variant text-sm">Privacidad Soberana Activa</span>
          </div>
          <ShieldCheck className="text-on-surface-variant/40 w-5 h-5" />
        </div>
      </main>
    </motion.div>
  );
};

const VoiceLogScreen = ({ userMeals, onVoiceStart, isRecording, onAddManual, aiStatus, online }: any) => {
  const [query, setQuery] = useState('');
  const results = query.length > 2 ? foodDictionary.diccionario.filter(f => f.nombre.toLowerCase().includes(query.toLowerCase()) || f.alias.some(a => a.toLowerCase().includes(query.toLowerCase()))).slice(0, 5) : [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-32 bg-white min-h-screen">
      <header className="flex items-center justify-between px-5 h-14 w-full sticky top-0 z-40 bg-white/80 ios-blur">
        <button className="w-10 h-10 flex items-center justify-center -ml-2">
          <Settings className="w-6 h-6 text-on-surface" />
        </button>
        <span className="font-bold text-lg tracking-tight">BloodCare AI</span>
        {online ? <Cloud className="w-4 h-4 text-success opacity-50" /> : <CloudOff className="w-4 h-4 text-error" />}
      </header>

      <main className="p-5 space-y-8">
        <div>
          <div className="flex items-center gap-1.5 text-on-surface-variant/80 font-mono font-bold text-[10px] mb-2 uppercase tracking-widest">
            <Lock className="w-3 h-3" />
            {aiStatus} 🔒
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-on-surface leading-[1.1] mb-2">¿Qué comiste?</h1>
          <p className="text-lg text-on-surface-variant leading-snug">Dilo en voz alta o busca. Procesamiento 100% privado en tu dispositivo.</p>
        </div>

        <div className="relative z-50">
          <input 
            type="text" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="Busca tu comida..." 
            className="w-full h-14 bg-surface-container-low rounded-2xl px-5 focus:outline-none focus:ring-2 focus:ring-primary/20" 
          />
          {results.length > 0 && (
            <div className="absolute top-16 left-0 right-0 bg-white border rounded-2xl shadow-2xl overflow-hidden">
              {results.map((f, i) => (
                <button key={i} onClick={() => { onAddManual(f); setQuery(''); }} className="w-full p-4 text-left hover:bg-primary/5 flex justify-between border-b last:border-0">
                  <div><p className="font-bold">{f.nombre}</p><p className="text-xs opacity-50">{f.porcion}</p></div>
                  <div className="flex items-center gap-2 text-primary"><span className="font-bold">{f.carbohidratos_g}g</span><Plus className="w-4 h-4" /></div>
                </button>
              ))}
            </div>
          )}
        </div>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-mono font-bold text-on-surface-variant uppercase tracking-widest">RECIENTES</h2>
            <button className="text-sm font-bold text-primary flex items-center gap-1">
              <History className="w-4 h-4" />
              Historial
            </button>
          </div>
          
          <div className="space-y-4">
            {userMeals.length > 0 ? userMeals.map((log: any, i: number) => (
              <button key={i} className="w-full flex items-center justify-between p-4 bg-surface-container-low rounded-[20px] active:scale-[0.98] transition-transform text-left border border-outline-variant/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-primary">
                    <Utensils className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface text-lg leading-tight">{log.food_name}</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} {log.synced === 0 && '⌛'}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-lg font-bold text-on-surface">{log.carbs_g}g</span>
                </div>
              </button>
            )) : (
              <div className="text-center py-10 opacity-30">
                <History className="w-10 h-10 mx-auto mb-2" />
                <p className="text-sm font-bold">Sin registros hoy</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <div className="fixed bottom-24 right-6 z-50 flex flex-col items-center gap-3">
        {isRecording && (
          <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="bg-white/90 ios-blur px-4 py-2 rounded-full text-xs font-bold text-primary shadow-sm border border-primary/10">
            Escuchando...
          </motion.div>
        )}
        <button onClick={onVoiceStart} className={`rounded-full w-20 h-20 flex items-center justify-center shadow-2xl transition-all ${isRecording ? 'bg-error animate-pulse shadow-error/40' : 'bg-primary shadow-primary/40'}`}>
          {isRecording ? <StopCircle className="w-10 h-10 text-white" /> : <Mic className="w-10 h-10 text-white fill-current" />}
        </button>
      </div>
    </motion.div>
  );
};

// --- Main App Component ---
export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [currentGlucose, setCurrentGlucose] = useState(123);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [userMeals, setUserMeals] = useState<any[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings>({ name: 'Usuario ITCM', target_min: 70, target_max: 140 });
  const [isRecording, setIsRecording] = useState(false);
  const [aiStatus, setAiStatus] = useState('IA Local Lista');
  const [online, setOnline] = useState(navigator.onLine);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'info' | 'error'} | null>(null);

  const worker = useRef<Worker | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    const handleOnline = () => { setOnline(true); syncAll(); };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    worker.current = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.current.onmessage = (e) => {
      const { type, message, match, quantity } = e.data;
      if (type === 'status') setAiStatus(message);
      if (type === 'result' && match && match.score > 0.6) {
        const foodMatch = foodDictionary.diccionario.find(f => f.nombre === match.id);
        if (foodMatch) {
          const qty = quantity || 1;
          addManualMeal({ ...foodMatch, nombre: qty > 1 ? `${qty}x ${foodMatch.nombre}` : foodMatch.nombre, carbohidratos_g: foodMatch.carbohidratos_g * qty });
        }
      }
    };
    worker.current.postMessage({ type: 'load' });
    worker.current.postMessage({ type: 'index', dictionary: foodDictionary.diccionario });
    loadLocalData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      worker.current?.terminate();
    };
  }, []);

  const loadLocalData = async () => {
    const localMeals = await db.meals.toArray();
    const localGlucose = await db.glucose.toArray();
    const settings = await db.settings.toCollection().first();
    if (settings) setUserSettings(settings);
    setUserMeals(localMeals.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setHistoryRecords(localGlucose.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  };

  const syncAll = async () => {
    if (!navigator.onLine) return;
    const pendingMeals = await db.meals.where('synced').equals(0).toArray();
    for (const meal of pendingMeals) {
      try {
        await fetch('https://bloodcare-backend-jmv5.onrender.com/records/meal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: 1, food_name: meal.food_name, carbs_g: meal.carbs_g }) });
        await db.meals.update(meal.id!, { synced: 1 });
      } catch (e) { break; }
    }
    loadLocalData();
  };

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const audioCtx = new AudioContext({ sampleRate: 16000 });
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const float32Data = audioBuffer.getChannelData(0);
        worker.current?.postMessage({ type: 'transcribe', audio: float32Data });
        audioCtx.close();
      };
      recorder.start();
      mediaRecorder.current = recorder;
      setIsRecording(true);
      showToast('Escuchando...', 'info');
    } catch (err) { showToast('Permiso denegado', 'error'); }
  };

  const stopRecording = () => { mediaRecorder.current?.stop(); setIsRecording(false); };

  const addManualMeal = async (food: any) => {
    await db.meals.add({ ...food, user_id: 1, timestamp: new Date().toISOString(), synced: 0 });
    loadLocalData();
    showToast(`${food.nombre} guardado`);
    if (online) syncAll();
  };

  const renderScreen = () => {
    switch (screen) {
      case 'login': return <LoginScreen onLogin={() => setScreen('inicio')} />;
      case 'inicio': return <DashboardScreen currentVal={currentGlucose} online={online} historyRecords={historyRecords} userSettings={userSettings} />;
      case 'voz': return <VoiceLogScreen userMeals={userMeals} onVoiceStart={isRecording ? stopRecording : startRecording} isRecording={isRecording} onAddManual={addManualMeal} aiStatus={aiStatus} online={online} />;
      case 'perfil': return (
        <div className="p-8 text-center pt-20">
          <Header title="Perfil" />
          <User className="w-20 h-20 mx-auto text-primary mb-4" />
          <h2 className="text-2xl font-bold mb-2">{userSettings.name}</h2>
          <p className="text-on-surface-variant mb-10">Configuración de salud soberana activa.</p>
          <button onClick={() => setScreen('login')} className="w-full h-12 border border-error text-error rounded-xl font-bold">Cerrar Sesión</button>
        </div>
      );
      default: return <DashboardScreen />;
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="max-w-md mx-auto min-h-screen relative overflow-x-hidden bg-surface">
        <AnimatePresence>{toast && <Toast message={toast.message} type={toast.type} />}</AnimatePresence>
        <AnimatePresence mode="wait">
          <div key={screen}>
            {renderScreen()}
          </div>
        </AnimatePresence>
        {screen !== 'login' && <Navbar currentScreen={screen} setScreen={setScreen} />}
      </div>
    </GoogleOAuthProvider>
  );
}
