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
  <header className="flex items-center justify-between px-5 h-16 w-full sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 ios-blur">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center"><Droplet className="text-primary w-5 h-5" /></div>
      <span className="font-bold text-xl tracking-tight text-on-surface dark:text-white">{title}</span>
      {online ? <Cloud className="w-4 h-4 text-success opacity-50" /> : <CloudOff className="w-4 h-4 text-error" />}
    </div>
    <div className="w-9 h-9 rounded-full bg-surface-container-high dark:bg-slate-800 border border-outline-variant/30 flex items-center justify-center overflow-hidden"><UserIcon className="w-5 h-5 text-on-surface-variant dark:text-slate-400" /></div>
  </header>
);

const Navbar = ({ currentScreen, setScreen }: { currentScreen: string, setScreen: (s: string) => void }) => {
  const tabs = [{ id: 'inicio', icon: Home, label: 'Inicio' }, { id: 'prediccion', icon: TrendingUp, label: 'IA' }, { id: 'voz', icon: Mic, label: 'Voz' }, { id: 'perfil', icon: UserIcon, label: 'Perfil' }];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 ios-blur border-t border-outline-variant/30 dark:border-white/5 px-6 pb-8 pt-3">
      <div className="max-w-md mx-auto flex justify-between items-center">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setScreen(tab.id)} className={`flex flex-col items-center gap-1 transition-all ${currentScreen === tab.id ? 'text-primary scale-110' : 'text-on-surface-variant/40 dark:text-slate-500 hover:text-on-surface-variant'}`}><tab.icon className={`w-6 h-6 ${currentScreen === tab.id ? 'fill-primary/10' : ''}`} /><span className="text-[10px] font-bold uppercase tracking-tighter">{tab.label}</span></button>
        ))}
      </div>
    </nav>
  );
};

const DashboardScreen = ({ currentVal, onSave, online, historyRecords, userMeals, userSettings }: any) => {
  const [val, setVal] = useState(currentVal);
  const avg = historyRecords.length > 0 ? Math.round(historyRecords.reduce((a:any, b:any) => a + b.value, 0) / historyRecords.length) : 0;
  const totalCarbs = userMeals.reduce((a:any, b:any) => a + b.carbs_g, 0);

  const isSafe = avg >= userSettings.target_min && avg <= userSettings.target_max;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-32">
      <Header title="BloodCare" online={online} />
      <main className="px-5 pt-8 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl ios-card-shadow border border-outline-variant/10 dark:border-white/5">
            <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest dark:text-slate-400">Promedio Hoy</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-2xl font-bold ${isSafe ? 'text-success' : 'text-error'}`}>{avg}</span>
              <span className="text-[10px] opacity-40 dark:text-slate-500">mg/dL</span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl ios-card-shadow border border-outline-variant/10 dark:border-white/5">
            <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest dark:text-slate-400">Total Carbs</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold text-primary">{totalCarbs}</span>
              <span className="text-[10px] opacity-40 dark:text-slate-500">g</span>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-outline-variant/20 dark:border-white/5 flex flex-col items-center text-center ios-card-shadow">
          <span className="text-[11px] font-mono font-bold text-on-surface-variant/60 dark:text-slate-400 mb-2 uppercase tracking-wider">REGISTRO RÁPIDO</span>
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => setVal(v => v - 1)} className="w-10 h-10 rounded-full bg-surface-container-high dark:bg-slate-700 flex items-center justify-center font-bold text-xl text-primary">-</button>
            <div className="flex items-baseline gap-1"><span className="text-6xl font-bold text-on-surface dark:text-white tracking-tight">{val}</span><span className="text-lg font-medium text-on-surface-variant/50">mg/dL</span></div>
            <button onClick={() => setVal(v => v + 1)} className="w-10 h-10 rounded-full bg-surface-container-high dark:bg-slate-700 flex items-center justify-center font-bold text-xl text-primary">+</button>
          </div>
          <button onClick={() => onSave(val)} className="w-full h-12 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all">Guardar Medición</button>
        </div>
      </main>
    </motion.div>
  );
};

const ProfileScreen = ({ userSettings, onUpdate }: { userSettings: UserSettings, onUpdate: (s: UserSettings) => void }) => {
  const [name, setName] = useState(userSettings.name);
  const [min, setMin] = useState(userSettings.target_min);
  const [max, setMax] = useState(userSettings.target_max);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-32 bg-white dark:bg-slate-900 min-h-screen">
      <header className="px-5 h-16 w-full sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 ios-blur flex items-center justify-between border-b dark:border-white/5"><h1 className="text-xl font-bold dark:text-white">Mi Perfil</h1><button onClick={() => onUpdate({ ...userSettings, name, target_min: min, target_max: max })} className="text-primary font-bold">Guardar</button></header>
      <main className="p-6 space-y-8">
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20"><UserIcon className="w-10 h-10 text-primary" /></div>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="text-2xl font-bold text-center bg-transparent border-b border-primary/20 focus:outline-none dark:text-white" />
        </div>
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-on-surface-variant/60 dark:text-slate-500 uppercase tracking-widest">Metas Metabólicas</h3>
          <div className="bg-surface-container-low dark:bg-slate-800 p-6 rounded-[28px] border dark:border-white/5 space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3"><Target className="text-primary w-5 h-5" /><div><p className="font-bold dark:text-white text-sm">Límite Inferior</p><p className="text-[10px] opacity-40 dark:text-slate-500">Mínimo sugerido (mg/dL)</p></div></div>
              <input type="number" value={min} onChange={(e) => setMin(parseInt(e.target.value))} className="w-16 h-10 bg-white dark:bg-slate-700 rounded-xl text-center font-bold border dark:border-white/10" />
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3"><TrendingUp className="text-secondary w-5 h-5" /><div><p className="font-bold dark:text-white text-sm">Límite Superior</p><p className="text-[10px] opacity-40 dark:text-slate-500">Máximo sugerido (mg/dL)</p></div></div>
              <input type="number" value={max} onChange={(e) => setMax(parseInt(e.target.value))} className="w-16 h-10 bg-white dark:bg-slate-700 rounded-xl text-center font-bold border dark:border-white/10" />
            </div>
          </div>
        </div>
      </main>
    </motion.div>
  );
};

export default function App() {
  const [screen, setScreen] = useState('login');
  const [currentGlucose, setCurrentGlucose] = useState(123);
  const [userMeals, setUserMeals] = useState<any[]>([]);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings>({ name: 'Usuario ITCM', target_min: 70, target_max: 140 });
  const [isRecording, setIsRecording] = useState(false);
  const [aiStatus, setAiStatus] = useState('Modo Offline Activo');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'info' | 'error'} | null>(null);
  const [online, setOnline] = useState(navigator.onLine);

  const worker = useRef<Worker | null>(null);

  useEffect(() => {
    window.addEventListener('online', () => { setOnline(true); });
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
          showToast(`IA detectó: ${adjustedFood.nombre}`, 'success');
        }
      }
    };
    worker.current.postMessage({ type: 'load' });
    worker.current.postMessage({ type: 'index', dictionary: foodDictionary.diccionario });
    loadLocalData();
    return () => worker.current?.terminate();
  }, []);

  const loadLocalData = async () => {
    const localMeals = await db.meals.toArray();
    const localGlucose = await db.glucose.toArray();
    const settings = await db.settings.toCollection().first();
    if (settings) setUserSettings(settings);
    setUserMeals(localMeals.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setHistoryRecords(localGlucose.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  };

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const updateSettings = async (newSettings: UserSettings) => {
    await db.settings.clear();
    await db.settings.add(newSettings);
    setUserSettings(newSettings);
    showToast('Perfil actualizado ✨');
  };

  const addManualMeal = async (food: any) => {
    const newMeal = { user_id: 1, food_name: food.nombre, carbs_g: food.carbohidratos_g, timestamp: new Date().toISOString(), synced: 0 };
    await db.meals.add(newMeal);
    loadLocalData();
  };

  const saveGlucose = async (val: number) => {
    const newRecord = { user_id: 1, value: val, timestamp: new Date().toISOString(), note: 'Registro manual', synced: 0 };
    await db.glucose.add(newRecord);
    loadLocalData();
    showToast('Glucosa registrada');
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="max-w-md mx-auto min-h-screen relative bg-surface dark:bg-[#0f172a] text-on-surface dark:text-slate-100 transition-colors duration-300">
        <AnimatePresence>{toast && <Toast message={toast.message} type={toast.type} />}</AnimatePresence>
        <AnimatePresence mode="wait">
          <div key={screen}>
            {screen === 'login' && <LoginScreen onLoginSuccess={() => setScreen('inicio')} />}
            {screen === 'inicio' && <DashboardScreen currentVal={currentGlucose} online={online} historyRecords={historyRecords} userMeals={userMeals} userSettings={userSettings} onSave={(v: number) => { setCurrentGlucose(v); saveGlucose(v); }} />}
            {screen === 'voz' && <div className="p-10 text-center">Pantalla de Voz</div>}
            {screen === 'perfil' && <ProfileScreen userSettings={userSettings} onUpdate={updateSettings} />}
          </div>
        </AnimatePresence>
        {screen !== 'login' && <Navbar currentScreen={screen} setScreen={setScreen} />}
      </div>
    </GoogleOAuthProvider>
  );
}
