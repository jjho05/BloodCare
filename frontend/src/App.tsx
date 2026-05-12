import { useState, useEffect, useRef } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, Search, Mic, User as UserIcon, Settings, Bell, Brain, Droplet, Utensils, 
  Egg, Croissant, ChevronRight, TrendingUp, Activity, History, Lock, Plus, 
  CheckCircle2, AlertCircle, StopCircle, CloudOff, Cloud, Target, Save
} from 'lucide-react';
import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import foodDictionary from './data/food_dictionary.json';
import { db, type UserSettings } from './db';

const GOOGLE_CLIENT_ID = "1058750211058-22740igvp11f42lh4113mlir39dtqa9r.apps.googleusercontent.com";

// --- Types ---
type Screen = 'login' | 'inicio' | 'prediccion' | 'voz' | 'perfil';
interface PredictionData {
  prediction: number[];
  narrative: string;
}

// --- Components ---

const Toast = ({ message, type }: { message: string, type: 'success' | 'info' | 'error' }) => (
  <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: -100, opacity: 0 }} className="fixed top-0 left-0 right-0 z-[100] flex justify-center px-6">
    <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl ios-blur border ${type === 'success' ? 'bg-success/90 border-success/20 text-white' : type === 'error' ? 'bg-error/90 border-error/20 text-white' : 'bg-primary/90 border-primary/20 text-white'}`}>
      {type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <span className="font-bold text-sm">{message}</span>
    </div>
  </motion.div>
);

const Navbar = ({ currentScreen, setScreen }: { currentScreen: Screen, setScreen: (s: Screen) => void }) => {
  const tabs: { id: Screen, icon: any, label: string }[] = [
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
            className={`flex flex-col items-center gap-1 transition-all ${currentScreen === tab.id ? 'text-primary scale-110' : 'text-on-surface-variant/40 hover:text-on-surface-variant'}`}
          >
            <tab.icon className={`w-6 h-6 ${currentScreen === tab.id ? 'fill-primary/10' : ''}`} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

const Header = ({ title, online }: { title: string, online?: boolean }) => (
  <header className="flex items-center justify-between px-5 h-16 w-full sticky top-0 z-40 bg-white/80 ios-blur">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
        <Droplet className="text-primary w-5 h-5" />
      </div>
      <span className="font-bold text-xl tracking-tight text-on-surface">{title}</span>
      {online !== undefined && (online ? <Cloud className="w-4 h-4 text-success opacity-50" /> : <CloudOff className="w-4 h-4 text-error" />)}
    </div>
    <div className="w-9 h-9 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center overflow-hidden">
      <UserIcon className="w-5 h-5 text-on-surface-variant" />
    </div>
  </header>
);

const LoginScreen = ({ onLoginSuccess }: { onLoginSuccess: () => void }) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen flex flex-col p-8 bg-surface overflow-hidden">
      <div className="flex items-center gap-2 mb-12">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center"><Droplet className="text-primary w-5 h-5" /></div>
        <span className="font-bold text-xl tracking-tight text-on-surface">BloodCare</span>
      </div>
      
      <div className="mt-auto mb-12">
        <h1 className="text-5xl font-black tracking-tighter mb-4 leading-[0.9]">
          Toma el<br/>control de tu<br/>
          <span className="text-primary underline decoration-primary/20">salud</span>.
        </h1>
        <p className="text-on-surface-variant/70 font-medium">Asistente inteligente para pacientes metabólicos.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <input type="email" placeholder="Correo electrónico" className="w-full h-12 px-5 bg-white border border-outline-variant/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <input type="password" placeholder="Contraseña" className="w-full h-12 px-5 bg-white border border-outline-variant/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        
        <button onClick={onLoginSuccess} className="w-full h-12 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all">
          Iniciar Sesión
        </button>

        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-outline-variant/20"></div>
          <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase">O</span>
          <div className="flex-1 h-px bg-outline-variant/20"></div>
        </div>

        <GoogleLogin 
          onSuccess={onLoginSuccess} 
          onError={() => console.log('Login Failed')}
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

const DashboardScreen = ({ data, currentVal, online, avg, isSafe }: any) => {
  const max = data ? Math.round(Math.max(...data.prediction)) : 180;
  const min = data ? Math.round(Math.min(...data.prediction)) : 90;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-32">
      <Header title="BloodCare" online={online} />
      <main className="px-5 pt-8 space-y-6">
        <h1 className="text-3xl font-bold text-on-surface mb-6 tracking-tight">¡Hola de nuevo!</h1>
        
        <div className="bg-white ios-card-shadow p-8 rounded-[32px] border border-outline-variant/20 flex flex-col items-center text-center">
          <span className="text-[11px] font-mono font-bold text-on-surface-variant/60 mb-2 uppercase tracking-wider">ESTIMACIÓN ACTUAL</span>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-6xl font-bold text-on-surface tracking-tight">{currentVal}</span>
            <span className="text-lg font-medium text-on-surface-variant/50">mg/dL</span>
          </div>
          <div className="flex gap-6 pt-6 border-t border-outline-variant/10 w-full justify-center">
            <div className="flex flex-col items-start"><span className="text-[10px] font-mono font-bold opacity-50">MAX (6H)</span><span className="text-lg font-bold">{max}</span></div>
            <div className="flex flex-col items-start"><span className="text-[10px] font-mono font-bold opacity-50">MIN (6H)</span><span className="text-lg font-bold">{min}</span></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-outline-variant/10 text-center">
             <p className="text-[10px] font-bold opacity-40 uppercase">Promedio</p>
             <p className={`text-xl font-bold ${isSafe ? 'text-success' : 'text-error'}`}>{avg} <span className="text-[10px] opacity-30">mg/dL</span></p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-outline-variant/10 text-center">
             <p className="text-[10px] font-bold opacity-40 uppercase">Estado</p>
             <p className={`text-xl font-bold ${isSafe ? 'text-success' : 'text-error'}`}>{isSafe ? 'Óptimo' : 'Alerta'}</p>
          </div>
        </div>

        <div className="bg-[#EEF2FF] p-5 rounded-2xl border border-primary/5 flex gap-4">
          <Brain className="text-primary w-6 h-6 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-primary mb-1">Análisis BloodCare IA</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">{data?.narrative || "Cargando análisis clínico..."}</p>
          </div>
        </div>
      </main>
    </motion.div>
  );
};

const PredictionScreen = ({ historyRecords, data }: { historyRecords: any[], data: PredictionData | null }) => {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-32">
      <header className="fixed top-0 z-40 w-full h-11 bg-white/80 ios-blur flex items-center px-4 border-b border-outline-variant/30">
        <h1 className="text-[17px] font-semibold text-on-surface">Pronóstico BloodCare</h1>
      </header>
      <main className="pt-16 px-4 space-y-6">
        <h2 className="text-3xl font-bold text-on-surface mb-3 tracking-tight">Predicción a 6 horas</h2>
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-outline-variant/20">
          <div className="bg-[#1e293b] p-4 aspect-[16/9]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyRecords.length > 0 ? historyRecords : [{time: '00:00', value: 120}]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#3265ef" strokeWidth={3} fill="#3265ef" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/20">
          <h3 className="font-bold mb-2">Narrativa Clínica 📋</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed">{data?.narrative || "Generando análisis..."}</p>
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
        <Settings className="w-6 h-6 text-on-surface" /><span className="font-bold text-lg tracking-tight">BloodCare Bitácora</span>
        {online ? <Cloud className="w-4 h-4 text-success opacity-50" /> : <CloudOff className="w-4 h-4 text-error" />}
      </header>
      <main className="p-5 space-y-8">
        <div>
          <div className="flex items-center gap-1.5 text-on-surface-variant/80 font-mono font-bold text-[10px] mb-2 uppercase tracking-widest"><Lock className="w-3 h-3" /> {aiStatus}</div>
          <h1 className="text-4xl font-bold text-on-surface mb-2">¿Qué comiste?</h1>
          <p className="text-lg text-on-surface-variant">Usa tu voz o busca tu comida.</p>
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

        <div className="space-y-4">
          <h3 className="font-bold text-on-surface-variant/60 text-xs uppercase tracking-widest">Registros Recientes</h3>
          {userMeals.length > 0 ? userMeals.map((log: any, i: number) => (
            <div key={i} className="w-full flex items-center justify-between p-4 bg-surface-container-low rounded-[20px] border border-outline-variant/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm"><Utensils className="w-6 h-6" /></div>
                <div><h4 className="font-bold text-lg">{log.food_name}</h4><p className="text-xs opacity-60">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} {log.synced === 0 && '⌛'}</p></div>
              </div>
              <span className="text-lg font-bold text-primary">{log.carbs_g}g</span>
            </div>
          )) : <div className="text-center py-10 opacity-40"><History className="w-12 h-12 mx-auto mb-2" /><p className="text-sm">No hay comidas hoy</p></div>}
        </div>
      </main>
      <div className="fixed bottom-24 right-6 z-50">
        <button onClick={onVoiceStart} className={`bg-primary text-white rounded-full w-20 h-20 flex items-center justify-center shadow-2xl active:scale-95 transition-all ${isRecording ? 'bg-error animate-pulse' : ''}`}>
          {isRecording ? <StopCircle className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
        </button>
      </div>
    </motion.div>
  );
};

// --- Main App Component ---
export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [currentGlucose, setCurrentGlucose] = useState(123);
  const [predictionData, setPredictionData] = useState<PredictionData | null>(null);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [userMeals, setUserMeals] = useState<any[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings>({ name: 'Usuario ITCM', target_min: 70, target_max: 140 });
  const [online, setOnline] = useState(navigator.onLine);
  const [aiStatus, setAiStatus] = useState('IA Local Lista');
  const [isRecording, setIsRecording] = useState(false);
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
    setHistoryRecords(localGlucose.map(r => ({ time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: r.value })).reverse());
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

  const fetchPrediction = async (glucose: number) => {
    try {
      const response = await fetch('https://bloodcare-backend-jmv5.onrender.com/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_glucose: glucose, history: Array(96).fill(glucose), meal_carbs: 0, insulin_units: 0 })
      });
      const data = await response.json();
      setPredictionData(data);
    } catch (error) { console.error('Error:', error); }
  };

  useEffect(() => { if (screen !== 'login') fetchPrediction(currentGlucose); }, [screen]);

  const avgGlucose = historyRecords.length > 0 ? Math.round(historyRecords.reduce((a, b) => a + b.value, 0) / historyRecords.length) : 0;
  const isSafe = avgGlucose >= userSettings.target_min && avgGlucose <= userSettings.target_max;

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="max-w-md mx-auto min-h-screen relative overflow-x-hidden bg-surface">
        <AnimatePresence>{toast && <Toast message={toast.message} type={toast.type} />}</AnimatePresence>
        <AnimatePresence mode="wait">
          <div key={screen}>
            {screen === 'login' && <LoginScreen onLoginSuccess={() => setScreen('inicio')} />}
            {screen === 'inicio' && <DashboardScreen data={predictionData} currentVal={currentGlucose} online={online} avg={avgGlucose} isSafe={isSafe} />}
            {screen === 'prediccion' && <PredictionScreen historyRecords={historyRecords} data={predictionData} />}
            {screen === 'voz' && <VoiceLogScreen userMeals={userMeals} onVoiceStart={isRecording ? stopRecording : startRecording} isRecording={isRecording} onAddManual={addManualMeal} aiStatus={aiStatus} online={online} />}
            {screen === 'perfil' && <div className="p-10 text-center">Perfil de Usuario</div>}
          </div>
        </AnimatePresence>
        {screen !== 'login' && <Navbar currentScreen={screen} setScreen={setScreen} />}
      </div>
    </GoogleOAuthProvider>
  );
}
