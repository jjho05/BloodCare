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
  ChevronLeft,
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
  Plus,
  Target,
  RefreshCw
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
type Screen = 'login' | 'inicio' | 'prediccion' | 'voz' | 'perfil' | 'glucemia' | 'alimentos';
interface PredictionData {
  prediction: number[];
  narrative: string;
}

// --- UI Components ---

const Toast = ({ message, type }: { message: string, type: 'success' | 'info' | 'error' }) => (
  <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: -100, opacity: 0 }} className="fixed top-0 left-0 right-0 z-[100] flex justify-center px-6">
    <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl ios-blur border ${type === 'success' ? 'bg-success/90 border-success/20 text-white' : type === 'error' ? 'bg-error/90 border-error/20 text-white' : 'bg-primary/90 border-primary/20 text-white'}`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
      <span className="font-bold text-sm">{message}</span>
    </div>
  </motion.div>
);

const Navbar = ({ currentScreen, setScreen, onVoiceStart, isRecording }: { currentScreen: Screen, setScreen: (s: Screen) => void, onVoiceStart?: () => void, isRecording?: boolean }) => {
  const tabs = [
    { id: 'inicio', label: 'Inicio', icon: Home },
    { id: 'prediccion', label: 'IA', icon: TrendingUp },
    { id: 'voz', label: 'Voz', icon: Mic },
    { id: 'alimentos', label: 'Comida', icon: Utensils },
    { id: 'perfil', label: 'Perfil', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-outline-variant/20 px-6 pt-3 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
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
                <div className={`rounded-full w-14 h-14 flex items-center justify-center shadow-xl shadow-primary/30 transition-transform active:scale-90 ${
                  isRecording ? 'bg-error animate-pulse' : 'bg-primary'
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
  const [isRegistering, setIsRegistering] = useState(false);
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
          <p className="text-on-surface-variant font-medium">
            {isRegistering ? 'Crea tu cuenta soberana' : 'Bienvenido a BloodCare AI'}
          </p>
        </div>
      </div>

      <div className="w-full max-w-[400px] flex flex-col space-y-6">
        <div className="space-y-4">
          {isRegistering && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider px-1">Nombre Completo</label>
              <input 
                type="text" 
                placeholder="Tu nombre" 
                className="w-full h-12 bg-white border border-outline-variant rounded-xl px-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
          )}
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
              {!isRegistering && <button className="text-xs font-bold text-primary">Olvidé mi contraseña</button>}
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
          {isRegistering ? 'Registrarse' : 'Iniciar Sesión'}
        </button>

        <button 
          onClick={() => setIsRegistering(!isRegistering)}
          className="text-sm font-bold text-primary text-center"
        >
          {isRegistering ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate'}
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

const DashboardScreen = ({ currentVal, online, historyRecords, userSettings, setScreen, onManualGlucose, onVoiceStart, isRecording }: any) => {
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
          <div className="grid grid-cols-3 gap-3 mb-6">
            <button onClick={() => setScreen('glucemia')} className="bg-white text-zinc-500 h-16 rounded-3xl font-bold flex flex-col items-center justify-center gap-1 active:scale-95 transition-all border border-zinc-100 shadow-sm">
              <History className="w-5 h-5" />
              <span className="text-[10px] uppercase tracking-tighter">Glucemia</span>
            </button>
            <button 
              onClick={onVoiceStart} 
              className={`h-16 rounded-3xl font-bold flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-lg ${isRecording ? 'bg-error animate-pulse text-white shadow-error/20' : 'bg-primary text-white shadow-primary/20'}`}
            >
              <Mic className="w-6 h-6" />
              <span className="text-[10px] uppercase tracking-tighter">{isRecording ? '...' : 'Dictar'}</span>
            </button>
            <button onClick={onManualGlucose} className="bg-white text-error h-16 rounded-3xl font-bold flex flex-col items-center justify-center gap-1 active:scale-95 transition-all border border-error/10 shadow-sm">
              <Droplet className="w-5 h-5 fill-current" />
              <span className="text-[10px] uppercase tracking-tighter">Glucosa</span>
            </button>
          </div>
          <div className="flex justify-center">
            <div className="inline-flex items-center bg-white px-3 py-1.5 rounded-full border border-outline-variant/10 shadow-sm">
              <span className={`w-2 h-2 rounded-full mr-2 ${online ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-widest">
                ÚLTIMA LECTURA: {currentVal} MG/DL
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


        {/* Security Detail */}
        <div className="bg-white ios-card-shadow p-5 rounded-2xl border border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="font-bold text-on-surface-variant text-sm">Privacidad Local Garantizada</span>
          </div>
          <ShieldCheck className="text-on-surface-variant/40 w-5 h-5" />
        </div>
      </main>
    </motion.div>
  );
};

const PredictionScreen = ({ historyRecords, data }: { historyRecords: any[], data: PredictionData | null }) => {
  const lastVal = historyRecords.length > 0 ? historyRecords[historyRecords.length - 1]?.value : 120;
  const maxVal = historyRecords.length > 0 ? Math.max(...historyRecords.map((r:any) => r.value)) : 120;
  const minVal = historyRecords.length > 0 ? Math.min(...historyRecords.map((r:any) => r.value)) : 120;
  const trend = historyRecords.length > 1 
    ? historyRecords[historyRecords.length - 1]?.value - historyRecords[0]?.value 
    : 0;

  const generateNarrative = () => {
    if (data?.narrative) return data.narrative;
    const lines: string[] = [];
    if (lastVal >= 70 && lastVal <= 140) {
      lines.push(`📊 Tu glucosa actual de ${lastVal} mg/dL se encuentra dentro del rango normal (70-140 mg/dL). ¡Buen trabajo!`);
    } else if (lastVal > 140) {
      lines.push(`⚠️ Tu glucosa actual de ${lastVal} mg/dL está por encima del rango recomendado. Considera consultar a tu médico.`);
    } else {
      lines.push(`⚠️ Tu glucosa actual de ${lastVal} mg/dL está baja. Considera comer algo con carbohidratos.`);
    }
    if (trend > 15) lines.push(`📈 Se observa una tendencia al alza de +${trend} mg/dL en el periodo registrado.`);
    else if (trend < -15) lines.push(`📉 Se observa una tendencia a la baja de ${trend} mg/dL en el periodo registrado.`);
    else lines.push(`➡️ Tu glucosa se ha mantenido estable durante este periodo.`);
    lines.push(`🔎 Rango del día: mínimo ${minVal} mg/dL, máximo ${maxVal} mg/dL.`);
    if (maxVal - minVal > 80) lines.push(`⚡ Se detectó una variabilidad alta (${maxVal - minVal} mg/dL). Esto puede indicar picos por alimentación o actividad física.`);
    else lines.push(`✅ La variabilidad glucémica es baja (${maxVal - minVal} mg/dL), lo cual es positivo.`);
    return lines.join('\n\n');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-32 bg-surface min-h-screen">
      <header className="sticky top-0 z-40 w-full h-16 bg-[#121C2B] flex items-center px-5">
        <h1 className="text-[20px] font-bold text-white tracking-tight">Pronóstico BloodCare IA</h1>
      </header>
      <main className="px-4 pt-6 space-y-5">
        <h2 className="text-3xl font-bold text-on-surface tracking-tight">Predicción a 6 horas</h2>
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-outline-variant/20">
          <div className="bg-[#1e293b] p-4 aspect-[16/9]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyRecords.length > 0 ? historyRecords : [{time: '00:00', value: 120}]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#fff' }} />
                <Area type="monotone" dataKey="value" stroke="#3265ef" strokeWidth={3} fill="#3265ef" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Explicación en Lenguaje Natural */}
        <div className="bg-white rounded-[28px] p-6 shadow-sm border border-outline-variant/10 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="text-[11px] font-mono font-bold text-on-surface-variant/60 uppercase tracking-widest">ANÁLISIS INTELIGENTE</h3>
          </div>
          <div className="space-y-3">
            {generateNarrative().split('\n\n').map((paragraph, i) => (
              <p key={i} className="text-[15px] text-on-surface-variant leading-relaxed">{paragraph}</p>
            ))}
          </div>
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 text-center border border-outline-variant/10 shadow-sm">
            <p className="text-[10px] font-mono font-bold text-on-surface-variant/50 uppercase mb-1">Actual</p>
            <p className="text-2xl font-black text-on-surface">{lastVal}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center border border-outline-variant/10 shadow-sm">
            <p className="text-[10px] font-mono font-bold text-on-surface-variant/50 uppercase mb-1">Mínimo</p>
            <p className="text-2xl font-black text-tertiary">{minVal}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center border border-outline-variant/10 shadow-sm">
            <p className="text-[10px] font-mono font-bold text-on-surface-variant/50 uppercase mb-1">Máximo</p>
            <p className="text-2xl font-black text-error">{maxVal}</p>
          </div>
        </div>
      </main>
    </motion.div>
  );
};

const VoiceLogScreen = ({ userMeals, onVoiceStart, isRecording, onAddManual, aiStatus, online }: any) => {
  const [query, setQuery] = useState('');
  
  const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const searchQ = normalize(query);

  const results = query.length > 1 ? foodDictionary.diccionario
    .map(f => {
      const normNombre = normalize(f.nombre);
      const normAlias = f.alias.map(normalize);
      let score = 0;
      
      // Asignar puntuación basada en la relevancia
      if (normNombre === searchQ) score = 100;
      else if (normNombre.startsWith(searchQ)) score = 50;
      else if (normNombre.includes(` ${searchQ}`)) score = 30;
      else if (normNombre.includes(searchQ)) score = 10;
      else if (normAlias.some(a => a === searchQ)) score = 80;
      else if (normAlias.some(a => a.startsWith(searchQ))) score = 40;
      else if (normAlias.some(a => a.includes(` ${searchQ}`))) score = 20;
      else if (normAlias.some(a => a.includes(searchQ))) score = 5;
      
      return { item: f, score };
    })
    .filter(res => res.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(res => res.item) : [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-32 bg-white min-h-screen">
      <header className="px-6 h-16 flex items-center justify-center relative border-b border-zinc-100">
        <h1 className="text-xl font-bold text-zinc-900">BloodCare Bitácora</h1>
      </header>

      <main className="p-5 space-y-8">
        <div>
          <div className="flex items-center gap-1.5 text-on-surface-variant/80 font-mono font-bold text-[10px] mb-2 uppercase tracking-widest">
            <Lock className="w-3 h-3" />
            {aiStatus} 🔒
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-on-surface leading-[1.1] mb-2">¿Qué comiste?</h1>
          <p className="text-lg text-on-surface-variant leading-snug">Dilo en voz alta o busca. Procesamiento 100% privado.</p>
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
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-on-surface text-lg leading-tight truncate">
                      {log.nombre || log.food_name || "Comida Registrada"}
                    </h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} {log.synced === 0 && '⌛'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-center">
                  <span className="text-xl font-black text-primary">
                    {log.carbohidratos_g || log.carbs_g || 0}
                    <span className="text-[10px] ml-0.5 opacity-50 uppercase">g</span>
                  </span>
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
          {isRecording ? <StopCircle className="w-10 h-10 text-white" /> : <Mic className="w-10 h-10 text-white" />}
        </button>
      </div>
    </motion.div>
  );
};

const GlucoseHistoryScreen = ({ records, onBack }: { records: any[], onBack: () => void }) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-32 bg-surface min-h-screen">
      <header className="px-5 h-16 flex items-center gap-3 sticky top-0 z-40 bg-[#121C2B]">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-90 transition-transform">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-white">Historial Glucemia</h1>
      </header>
      <main className="p-6 space-y-4">
        {records.length > 0 ? [...records].reverse().map((rec, i) => (
          <div key={i} className="bg-white p-5 rounded-3xl border border-zinc-100 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-error/10 rounded-full flex items-center justify-center text-error">
                <Droplet className="w-5 h-5 fill-current" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Lectura</p>
                <p className="text-sm font-medium text-zinc-500">
                  {new Date(rec.timestamp).toLocaleDateString()} - {new Date(rec.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-zinc-900">{rec.value}</span>
              <span className="text-[10px] ml-1 text-zinc-300 font-bold uppercase">mg/dL</span>
            </div>
          </div>
        )) : (
          <div className="text-center py-20 opacity-20">
            <Droplet className="w-20 h-20 mx-auto mb-4" />
            <p className="font-bold">Sin lecturas registradas</p>
          </div>
        )}
      </main>
    </motion.div>
  );
};

const ProfileScreen = ({ userSettings, onUpdate, onLogout }: { userSettings: UserSettings, onUpdate: (s: UserSettings) => void, onLogout: () => void }) => {
  const [name, setName] = useState(userSettings.name);
  const [min, setMin] = useState(userSettings.target_min);
  const [max, setMax] = useState(userSettings.target_max);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-32 bg-white min-h-screen">
      <header className="flex items-center justify-between px-5 h-16 w-full bg-[#121C2B] sticky top-0 z-40">
        <span className="text-[20px] font-bold text-white tracking-tight">Configuración</span>
        <button onClick={() => onUpdate({ ...userSettings, name, target_min: min, target_max: max })} className="text-white font-bold bg-primary px-5 py-1.5 rounded-full text-sm shadow-lg shadow-primary/20 active:scale-95 transition-transform">Guardar</button>
      </header>
      <main className="p-6 space-y-8">
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20">
            <User className="w-10 h-10 text-primary" />
          </div>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="text-2xl font-bold text-center bg-transparent border-b border-primary/20 focus:outline-none w-full" />
        </div>
        
        <div className="space-y-4">
          <h3 className="text-[11px] font-mono font-bold text-on-surface-variant/60 uppercase tracking-widest">Metas Metabólicas (mg/dL)</h3>
          <div className="bg-surface-container-low p-6 rounded-[28px] space-y-6 border border-outline-variant/10">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Target className="text-primary w-5 h-5" />
                <p className="font-bold text-sm">Límite Inferior</p>
              </div>
              <input type="number" value={min} onChange={(e) => setMin(parseInt(e.target.value) || 0)} className="w-16 h-10 bg-white rounded-xl text-center font-bold border border-outline-variant/30" />
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <TrendingUp className="text-secondary w-5 h-5" />
                <p className="font-bold text-sm">Límite Superior</p>
              </div>
              <input type="number" value={max} onChange={(e) => setMax(parseInt(e.target.value) || 0)} className="w-16 h-10 bg-white rounded-xl text-center font-bold border border-outline-variant/30" />
            </div>
          </div>
        </div>

        <button onClick={onLogout} className="w-full h-14 border-2 border-error/20 text-error rounded-2xl font-bold active:scale-95 transition-all flex items-center justify-center gap-2">
           Cerrar Sesión Soberana
        </button>
      </main>
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
  const [pendingGlucose, setPendingGlucose] = useState<number | null>(null);
  const [showManualGlucose, setShowManualGlucose] = useState(false);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const animationFrame = useRef<number | null>(null);
  const worker = useRef<Worker | null>(null);

  useEffect(() => {
    const handleOnline = () => { setOnline(true); syncAll(); };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    worker.current = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.current.onmessage = (e) => {
      try {
        const { type, message, match, quantity, text } = e.data;
        if (type === 'status') setAiStatus(message);
        if (type === 'result') {
          if (e.data.dataType === 'glucose') {
            setPendingGlucose(e.data.value);
            showToast(`¿Tu glucosa es ${e.data.value} mg/dL?`, 'info');
            return;
          }
          if (match && match.score > 0.35) {
            const foodMatch = foodDictionary.diccionario.find(f => f.nombre === match.id);
            if (foodMatch) {
              const qty = quantity || 1;
              addManualMeal({ ...foodMatch, nombre: qty > 1 ? `${qty}x ${foodMatch.nombre}` : foodMatch.nombre, carbohidratos_g: foodMatch.carbohidratos_g * qty });
              showToast(`¡Detectado! ${qty > 1 ? qty + 'x ' : ''}${foodMatch.nombre} ✅`);
            } else {
              showToast(`No encontré "${match.id}" en el diccionario local. 🤔`, 'info');
            }
          } else {
            const heardText = text ? `"${text}"` : "nada";
            showToast(`Escuché ${heardText}, pero no sé qué comida es. 🤔`, 'info');
          }
        }
      } catch (err) {
        console.error('[App] Error procesando mensaje del worker:', err);
        setAiStatus('Error IA: ' + (err instanceof Error ? err.message : String(err)));
      }
    };
    worker.current.onerror = (e) => {
      console.error('[App] Worker error:', e);
      setAiStatus('Error en Motor IA');
    };
    worker.current.postMessage({ 
      type: 'load', 
      apiKey: import.meta.env.VITE_GROQ_API_KEY 
    });
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
    const pendingGlucose = await db.glucose.where('synced').equals(0).toArray();
    for (const record of pendingGlucose) {
      try {
        await fetch('https://bloodcare-backend-jmv5.onrender.com/records/glucose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: 1, value: record.value, timestamp: record.timestamp, note: record.note }) });
        await db.glucose.update(record.id!, { synced: 1 });
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
      const mimeType = recorder.mimeType;

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      
      recorder.onstop = async () => {
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());

        if (chunks.length === 0) {
          showToast('No se captó audio', 'error');
          return;
        }

        showToast('Transcribiendo con Groq... ⚡️', 'info');
        const audioBlob = new Blob(chunks, { type: mimeType });
        
        // Mandar el Blob directo al worker (Groq se encarga del resto)
        worker.current?.postMessage({
          type: 'transcribe',
          audioBlob: audioBlob
        });
      };

      recorder.start(250);
      mediaRecorder.current = recorder;
      setIsRecording(true);
      showToast('Escuchando...', 'info');

      // Detección de silencio (Inspirado en Olvera Suite / Master Code)
      const audioCtxLive = new (window.AudioContext || (window as any).webkitAudioContext)();
      const sourceLive = audioCtxLive.createMediaStreamSource(stream);
      const analyserNode = audioCtxLive.createAnalyser();
      analyserNode.fftSize = 512;
      sourceLive.connect(analyserNode);

      const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
      let silenceStart: number | null = null;

      const checkSilence = () => {
        if (mediaRecorder.current?.state !== 'recording') {
          audioCtxLive.close();
          return;
        }
        analyserNode.getByteFrequencyData(dataArray);
        const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

        if (volume < 8) { // umbral de silencio
          if (!silenceStart) silenceStart = Date.now();
          else if (Date.now() - silenceStart > 1500) {
            audioCtxLive.close();
            stopRecording();
            return;
          }
        } else {
          silenceStart = null;
        }
        animationFrame.current = requestAnimationFrame(checkSilence);
      };
      animationFrame.current = requestAnimationFrame(checkSilence);

    } catch (err) { showToast('Error de micro', 'error'); }
  };

  const stopRecording = () => { if (mediaRecorder.current?.state === 'recording') mediaRecorder.current.stop(); };

  const addManualMeal = async (food: any) => {
    await db.meals.add({ ...food, user_id: 1, timestamp: new Date().toISOString(), synced: 0 });
    loadLocalData();
    showToast(`${food.nombre} guardado`);
    if (online) syncAll();
  };

  const saveGlucose = async (val: number) => {
    await db.glucose.add({ user_id: 1, value: val, timestamp: new Date().toISOString(), note: 'Manual', synced: 0 });
    loadLocalData();
    showToast('Glucosa guardada');
    if (online) syncAll();
  };

  const updateSettings = async (newSettings: UserSettings) => {
    await db.settings.clear();
    await db.settings.add(newSettings);
    setUserSettings(newSettings);
    showToast('Perfil actualizado');
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

  const chartData = historyRecords.length > 0 
    ? historyRecords.slice(0, 20).map(r => ({ time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: r.value })).reverse()
    : [];

  const renderScreen = () => {
    switch (screen) {
      case 'login': return <LoginScreen onLogin={() => setScreen('inicio')} />;
      case 'inicio': return (
        <DashboardScreen 
          currentVal={currentGlucose} 
          online={online} 
          historyRecords={historyRecords} 
          userSettings={userSettings} 
          setScreen={setScreen} 
          onManualGlucose={() => setShowManualGlucose(true)} 
          onVoiceStart={isRecording ? stopRecording : startRecording}
          isRecording={isRecording}
        />
      );
      case 'prediccion': return <PredictionScreen historyRecords={chartData} data={predictionData} />;
      case 'alimentos': return <VoiceLogScreen userMeals={userMeals} onVoiceStart={isRecording ? stopRecording : startRecording} isRecording={isRecording} onAddManual={addManualMeal} aiStatus={aiStatus} online={online} />;
      case 'glucemia': return <GlucoseHistoryScreen records={historyRecords} onBack={() => setScreen('inicio')} />;
      case 'perfil': return <ProfileScreen userSettings={userSettings} onUpdate={updateSettings} onLogout={() => setScreen('login')} />;
      default: return <DashboardScreen />;
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {/* ── Wrapper global ──────────────────────────────────── */}
      <div className="min-h-screen bg-[#0f172a] md:flex md:items-stretch">

        {/* ── SIDEBAR (solo desktop) ──────────────────────── */}
        {screen !== 'login' && (
          <aside className="hidden md:flex flex-col justify-between w-64 min-h-screen bg-[#121C2B] border-r border-white/5 px-6 py-8 fixed left-0 top-0 bottom-0 z-40">
            {/* Logo */}
            <div>
              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                  <Droplet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white font-black text-lg tracking-tight">BloodCare</p>
                  <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest">AI Dashboard</p>
                </div>
              </div>

              {/* Nav items */}
              <nav className="space-y-1">
                {[
                  { id: 'inicio', label: 'Dashboard', icon: Home },
                  { id: 'prediccion', label: 'Predicción IA', icon: TrendingUp },
                  { id: 'alimentos', label: 'Registro Comida', icon: Utensils },
                  { id: 'glucemia', label: 'Historial', icon: History },
                  { id: 'perfil', label: 'Configuración', icon: User },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setScreen(item.id as Screen)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                      screen === item.id
                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                        : 'text-white/50 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Estado y usuario al fondo del sidebar */}
            <div className="space-y-4">
              <div className="bg-white/5 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-400' : 'bg-red-400'}`}></span>
                  <span className="text-white/60 text-xs font-mono font-bold uppercase tracking-widest">
                    {online ? 'Sincronizado' : 'Sin conexión'}
                  </span>
                </div>
                <p className="text-white font-bold">{userSettings.name}</p>
                <p className="text-white/40 text-xs">Meta: {userSettings.target_min}–{userSettings.target_max} mg/dL</p>
              </div>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                  isRecording ? 'bg-red-500 animate-pulse text-white' : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                <Mic className="w-4 h-4" />
                {isRecording ? 'Detener Grabación' : 'Dictar Alimento'}
              </button>
            </div>
          </aside>
        )}

        {/* ── CONTENIDO PRINCIPAL ─────────────────────────── */}
        <main className={`flex-1 flex ${screen !== 'login' ? 'md:ml-64' : ''} md:justify-center md:items-start md:bg-[#0f172a]`}>
          {/* Vista de teléfono en desktop */}
          <div className={`w-full ${
            screen !== 'login'
              ? 'md:max-w-[390px] md:min-h-screen md:shadow-2xl md:my-0'
              : 'md:max-w-md md:my-8 md:rounded-3xl md:shadow-2xl md:overflow-hidden'
          } max-w-md mx-auto min-h-screen relative overflow-x-hidden bg-surface`}>
            <AnimatePresence>{toast && <Toast message={toast.message} type={toast.type} />}</AnimatePresence>
            <AnimatePresence mode="wait">
              <div key={screen}>
                {renderScreen()}
              </div>
            </AnimatePresence>
            {/* Navbar en móvil solamente */}
            {screen !== 'login' && (
              <div className="md:hidden">
                <Navbar currentScreen={screen} setScreen={setScreen} onVoiceStart={isRecording ? stopRecording : startRecording} isRecording={isRecording} />
              </div>
            )}

            {/* Diálogo de Confirmación de Glucosa */}
            <AnimatePresence>
              {pendingGlucose && (
                <motion.div initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }} className="fixed inset-x-0 bottom-0 z-[100] p-6">
                  <div className="bg-white rounded-[32px] p-8 shadow-2xl border border-zinc-100 flex flex-col items-center text-center space-y-6">
                    <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center text-error animate-pulse">
                      <Droplet className="w-8 h-8 fill-current" />
                    </div>
                    <div>
                      <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Detectado por Voz</p>
                      <h3 className="text-4xl font-black text-zinc-900">{pendingGlucose} <span className="text-lg font-medium opacity-30">mg/dL</span></h3>
                    </div>
                    <div className="flex gap-4 w-full">
                      <button onClick={() => setPendingGlucose(null)} className="flex-1 h-14 rounded-2xl bg-zinc-100 text-zinc-500 font-bold active:scale-95 transition-all">Cancelar</button>
                      <button onClick={() => { saveGlucose(pendingGlucose!); setPendingGlucose(null); }} className="flex-1 h-14 rounded-2xl bg-zinc-900 text-white font-bold active:scale-95 transition-all">Sí, Guardar</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Modal de Glucosa Manual */}
            <AnimatePresence>
              {showManualGlucose && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[40px] p-8 w-full max-w-xs shadow-2xl">
                    <h3 className="text-2xl font-bold mb-6 text-center">Registro Manual</h3>
                    <input
                      type="number"
                      autoFocus
                      placeholder="000"
                      className="w-full text-6xl font-black text-center mb-8 focus:outline-none placeholder:opacity-10"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = parseInt((e.target as HTMLInputElement).value);
                          if (val > 0) { saveGlucose(val); setShowManualGlucose(false); }
                        }
                      }}
                    />
                    <div className="flex gap-3">
                      <button onClick={() => setShowManualGlucose(false)} className="flex-1 h-12 rounded-xl font-bold text-zinc-400">Cerrar</button>
                      <button onClick={() => {
                        const input = document.querySelector('input[type="number"]') as HTMLInputElement;
                        const val = parseInt(input.value);
                        if (val > 0) { saveGlucose(val); setShowManualGlucose(false); }
                      }} className="flex-1 h-12 bg-zinc-900 text-white rounded-xl font-bold">Guardar</button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </GoogleOAuthProvider>
  );
}
