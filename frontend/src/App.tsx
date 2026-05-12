import { useState, useEffect, useRef } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, Search, Mic, User as UserIcon, Settings, Bell, Brain, Droplet, Utensils, 
  Egg, Croissant, ChevronRight, TrendingUp, Activity, History, Lock, Plus, 
  CheckCircle2, AlertCircle, StopCircle, CloudOff, Cloud
} from 'lucide-react';
import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import foodDictionary from './data/food_dictionary.json';
import { db } from './db';

const GOOGLE_CLIENT_ID = "1058750211058-22740igvp11f42lh4113mlir39dtqa9r.apps.googleusercontent.com";

// ── COMPONENTES DE UI ──────────────────────────────────────

const Toast = ({ message, type }: { message: string, type: 'success' | 'info' | 'error' }) => (
  <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: -100, opacity: 0 }} className="fixed top-0 left-0 right-0 z-[100] flex justify-center px-6">
    <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl ios-blur border ${type === 'success' ? 'bg-success/90 border-success/20 text-white' : type === 'error' ? 'bg-error/90 border-error/20 text-white' : 'bg-primary/90 border-primary/20 text-white'}`}>
      {type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <span className="font-bold text-sm">{message}</span>
    </div>
  </motion.div>
);

const Header = ({ title, online }: { title: string, online: boolean }) => (
  <header className="flex items-center justify-between px-5 h-16 w-full sticky top-0 z-40 bg-white/80 ios-blur">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center"><Droplet className="text-primary w-5 h-5" /></div>
      <span className="font-bold text-xl tracking-tight text-on-surface">{title}</span>
      {online ? <Cloud className="w-4 h-4 text-success opacity-50" /> : <CloudOff className="w-4 h-4 text-error" />}
    </div>
    <div className="w-9 h-9 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center overflow-hidden"><UserIcon className="w-5 h-5 text-on-surface-variant" /></div>
  </header>
);

const Navbar = ({ currentScreen, setScreen }: { currentScreen: string, setScreen: (s: string) => void }) => {
  const tabs = [{ id: 'inicio', icon: Home, label: 'Inicio' }, { id: 'prediccion', icon: TrendingUp, label: 'IA' }, { id: 'voz', icon: Mic, label: 'Voz' }, { id: 'perfil', icon: UserIcon, label: 'Perfil' }];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 ios-blur border-t border-outline-variant/30 px-6 pb-8 pt-3">
      <div className="max-w-md mx-auto flex justify-between items-center">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setScreen(tab.id)} className={`flex flex-col items-center gap-1 transition-all ${currentScreen === tab.id ? 'text-primary scale-110' : 'text-on-surface-variant/40 hover:text-on-surface-variant'}`}><tab.icon className={`w-6 h-6 ${currentScreen === tab.id ? 'fill-primary/10' : ''}`} /><span className="text-[10px] font-bold uppercase tracking-tighter">{tab.label}</span></button>
        ))}
      </div>
    </nav>
  );
};

const LoginScreen = ({ onLoginSuccess }: { onLoginSuccess: () => void }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen flex flex-col items-center justify-center p-8 bg-surface text-on-surface relative overflow-hidden">
    <div className="w-24 h-24 bg-primary rounded-[32px] flex items-center justify-center shadow-2xl mb-8"><Droplet className="text-white w-12 h-12" /></div>
    <h1 className="text-5xl font-black tracking-tighter mb-12">BloodCare</h1>
    <GoogleLogin onSuccess={onLoginSuccess} onError={() => {}} shape="pill" theme="filled_blue" width="320" />
  </motion.div>
);

const DashboardScreen = ({ data, currentVal, onSave, online }: any) => {
  const [val, setVal] = useState(currentVal);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-32">
      <Header title="BloodCare" online={online} />
      <main className="px-5 pt-8 space-y-6">
        <div className="bg-white ios-card-shadow p-8 rounded-[32px] border border-outline-variant/20 flex flex-col items-center text-center">
          <span className="text-[11px] font-mono font-bold text-on-surface-variant/60 mb-2 uppercase tracking-wider">REGISTRO RÁPIDO</span>
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => setVal(v => v - 1)} className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-xl text-primary">-</button>
            <div className="flex items-baseline gap-1"><span className="text-6xl font-bold text-on-surface tracking-tight">{val}</span><span className="text-lg font-medium text-on-surface-variant/50">mg/dL</span></div>
            <button onClick={() => setVal(v => v + 1)} className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-xl text-primary">+</button>
          </div>
          <button onClick={() => onSave(val)} className="w-full h-12 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all">Guardar Medición</button>
        </div>
        <div className="bg-[#EEF2FF] p-5 rounded-2xl border border-primary/5 flex gap-4"><Brain className="text-primary w-6 h-6 flex-shrink-0" /><div><h3 className="font-bold text-primary mb-1">Análisis BloodCare IA</h3><p className="text-sm text-on-surface-variant leading-relaxed">{data?.narrative || "Generando análisis..."}</p></div></div>
      </main>
    </motion.div>
  );
};

const VoiceLogScreen = ({ userMeals, onImageUpload, onVoiceStart, isRecording, onAddManual, aiStatus, online }: any) => {
  const [query, setQuery] = useState('');
  const results = query.length > 2 ? foodDictionary.diccionario.filter(f => f.nombre.toLowerCase().includes(query.toLowerCase()) || f.alias.some(a => a.toLowerCase().includes(query.toLowerCase()))).slice(0, 5) : [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-32 bg-white min-h-screen">
      <header className="px-5 h-14 w-full sticky top-0 z-40 bg-white/80 ios-blur flex items-center justify-between">
        <Settings className="w-6 h-6" /><span className="font-bold text-lg">Bitácora Soberana</span>
        {online ? <Cloud className="w-4 h-4 text-success opacity-50" /> : <CloudOff className="w-4 h-4 text-error" />}
      </header>
      <main className="p-5 space-y-8">
        <div><div className="flex items-center gap-1.5 text-on-surface-variant/80 font-mono font-bold text-[10px] mb-2 uppercase tracking-widest"><Lock className="w-3 h-3" /> {aiStatus}</div><h1 className="text-4xl font-bold mb-2">¿Qué comiste?</h1></div>
        <div className="relative z-50"><input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Busca tu comida..." className="w-full h-14 bg-surface-container-low rounded-2xl px-5 focus:outline-none focus:ring-2 focus:ring-primary/20" />
        {results.length > 0 && <div className="absolute top-16 left-0 right-0 bg-white border rounded-2xl shadow-2xl overflow-hidden">{results.map((f, i) => (<button key={i} onClick={() => { onAddManual(f); setQuery(''); }} className="w-full p-4 text-left hover:bg-primary/5 flex justify-between border-b last:border-0"><div><p className="font-bold">{f.nombre}</p><p className="text-xs opacity-50">{f.porcion}</p></div><div className="flex items-center gap-2 text-primary"><span className="font-bold">{f.carbohidratos_g}g</span><Plus className="w-4 h-4" /></div></button>))}</div>}</div>
        <div className="space-y-4">
          <h3 className="font-bold text-on-surface-variant/60 text-xs uppercase tracking-widest">Registros</h3>
          {userMeals.map((log: any, i: number) => (<div key={i} className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm"><Utensils /></div><div><h4 className="font-bold text-lg">{log.food_name}</h4><p className="text-xs opacity-60">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} {log.synced === 0 && '⌛'}</p></div></div><span className="text-lg font-bold text-primary">{log.carbs_g}g</span></div>))}
        </div>
      </main>
      <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-3">
        <label className="bg-secondary text-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl cursor-pointer"><Activity /><input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && onImageUpload(e.target.files[0])} /></label>
        <button onClick={onVoiceStart} className={`rounded-full w-20 h-20 flex items-center justify-center shadow-2xl transition-all ${isRecording ? 'bg-error animate-pulse' : 'bg-primary'}`}>
          {isRecording ? <StopCircle className="w-10 h-10 text-white" /> : <Mic className="w-10 h-10 text-white" />}
        </button>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [screen, setScreen] = useState('login');
  const [currentGlucose, setCurrentGlucose] = useState(123);
  const [userMeals, setUserMeals] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [aiStatus, setAiStatus] = useState('Modo Offline Activo');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'info' | 'error'} | null>(null);
  const [online, setOnline] = useState(navigator.onLine);

  const worker = useRef<Worker | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    window.addEventListener('online', () => { setOnline(true); syncAll(); });
    window.addEventListener('offline', () => setOnline(false));

    worker.current = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.current.onmessage = (e) => {
      const { type, message, text, match, quantity } = e.data;
      if (type === 'status') setAiStatus(message);
      if (type === 'result') {
        const foodMatch = match && match.score > 0.6 ? foodDictionary.diccionario.find(f => f.nombre === match.id) : null;
        if (foodMatch) {
          const qty = quantity || 1;
          const adjustedFood = { ...foodMatch, nombre: `${qty}x ${foodMatch.nombre}`, carbohidratos_g: foodMatch.carbohidratos_g * qty };
          addManualMeal(adjustedFood);
          showToast(`IA detectó: ${adjustedFood.nombre} (${adjustedFood.carbohidratos_g}g)`, 'success');
        }
        else showToast(`No reconocido: ${text}`, 'info');
      }
    };
    worker.current.postMessage({ type: 'load' });
    worker.current.postMessage({ type: 'index', dictionary: foodDictionary.diccionario });
    loadLocalData();
    return () => worker.current?.terminate();
  }, []);

  const loadLocalData = async () => {
    const localMeals = await db.meals.toArray();
    setUserMeals(localMeals.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  };

  const syncAll = async () => {
    const pendingMeals = await db.meals.where('synced').equals(0).toArray();
    for (const meal of pendingMeals) {
      try {
        await fetch('https://bloodcare-backend-jmv5.onrender.com/records/meal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: meal.user_id, food_name: meal.food_name, carbs_g: meal.carbs_g }) });
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
    const newMeal = { user_id: 1, food_name: food.nombre, carbs_g: food.carbohidratos_g, timestamp: new Date().toISOString(), synced: 0 };
    const id = await db.meals.add(newMeal);
    loadLocalData();
    showToast(`${food.nombre} guardado localmente`);
    if (online) syncAll();
  };

  const saveGlucose = async (val: number) => {
    const newRecord = { user_id: 1, value: val, timestamp: new Date().toISOString(), note: 'Registro manual', synced: 0 };
    await db.glucose.add(newRecord);
    showToast('Glucosa guardada localmente');
    if (online) {
      try {
        await fetch('https://bloodcare-backend-jmv5.onrender.com/records/glucose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRecord) });
        await db.glucose.where('timestamp').equals(newRecord.timestamp).modify({ synced: 1 });
      } catch (e) {}
    }
  };

  useEffect(() => { if (screen !== 'login') { fetchMeals(); } }, [screen]);

  const fetchMeals = async () => {
    if (online) {
      try {
        const response = await fetch('https://bloodcare-backend-jmv5.onrender.com/records/meal?user_id=1');
        const data = await response.json();
        // Mezclar con locales no sincronizados
        loadLocalData();
      } catch (error) { loadLocalData(); }
    } else {
      loadLocalData();
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="max-w-md mx-auto min-h-screen relative bg-surface">
        <AnimatePresence>{toast && <Toast message={toast.message} type={toast.type} />}</AnimatePresence>
        <AnimatePresence mode="wait">
          <div key={screen}>
            {screen === 'login' && <LoginScreen onLoginSuccess={() => setScreen('inicio')} />}
            {screen === 'inicio' && <DashboardScreen data={null} currentVal={currentGlucose} online={online} onSave={(v) => { setCurrentGlucose(v); saveGlucose(v); }} />}
            {screen === 'voz' && <VoiceLogScreen userMeals={userMeals} onVoiceStart={isRecording ? stopRecording : startRecording} isRecording={isRecording} onAddManual={addManualMeal} aiStatus={aiStatus} online={online} />}
            {screen === 'perfil' && <div className="p-10 text-center">Perfil de Usuario</div>}
          </div>
        </AnimatePresence>
        {screen !== 'login' && <Navbar currentScreen={screen} setScreen={setScreen} />}
      </div>
    </GoogleOAuthProvider>
  );
}
