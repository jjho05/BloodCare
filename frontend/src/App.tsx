import { useState, useEffect } from 'react';
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
  ShieldCheck, 
  CheckCircle,
  Utensils,
  History,
  Egg,
  Croissant,
  Brain,
  LayoutDashboard,
  Lock
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  Tooltip
} from 'recharts';

// --- Types ---
type Screen = 'login' | 'inicio' | 'prediccion' | 'voz' | 'perfil';

interface PredictionData {
  prediction: number[];
  confidence_intervals?: number[][];
  risk_level: string;
  narrative: string;
}

// --- Components ---

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

const Header = ({ title, showNotification = true }: { title: string, showNotification?: boolean }) => {
  return (
    <header className="flex items-center justify-between px-5 h-16 w-full bg-[#121C2B] md:bg-white md:border-b md:border-outline-variant sticky top-0 z-40">
      <span className="text-[20px] font-bold text-white md:text-primary tracking-tight">{title}</span>
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen flex flex-col items-center justify-center p-5 space-y-10">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 bg-primary-container rounded-lg flex items-center justify-center text-on-primary">
          <LayoutDashboard className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-on-surface">BloodCare</h1>
          <p className="text-on-surface-variant">Bienvenido a BloodCare</p>
        </div>
      </div>

      <div className="w-full max-w-[400px] flex flex-col space-y-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider px-1">Correo Electrónico</label>
            <input type="email" placeholder="ejemplo@correo.com" className="w-full h-12 bg-surface-container-lowest border border-outline-variant rounded-lg px-4 focus:ring-1 focus:ring-primary outline-none transition-all" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Contraseña</label>
              <button className="text-xs font-bold text-primary">Olvidé mi contraseña</button>
            </div>
            <input type="password" placeholder="••••••••" className="w-full h-12 bg-surface-container-lowest border border-outline-variant rounded-lg px-4 focus:ring-1 focus:ring-primary outline-none transition-all" />
          </div>
        </div>
        <button onClick={onLogin} className="w-full h-12 bg-primary text-white font-semibold rounded-lg hover:opacity-90 active:scale-[0.98] transition-all">
          Iniciar Sesión
        </button>
        <div className="flex items-center gap-4">
          <div className="h-[0.5px] flex-1 bg-outline-variant"></div>
          <span className="text-[10px] font-mono font-bold text-outline uppercase">O</span>
          <div className="h-[0.5px] flex-1 bg-outline-variant"></div>
        </div>
        <button onClick={onLogin} className="w-full h-12 bg-surface-container-lowest border border-outline-variant text-on-surface font-semibold rounded-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-all">
          <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-5 h-5" alt="Google" />
          <span>Continuar con Google</span>
        </button>
      </div>
    </motion.div>
  );
};

const DashboardScreen = ({ data, currentVal }: { data: PredictionData | null, currentVal: number }) => {
  const max = data ? Math.round(Math.max(...data.prediction)) : 180;
  const min = data ? Math.round(Math.min(...data.prediction)) : 90;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-32">
      <Header title="BloodCare" />
      <main className="px-5 pt-8 space-y-6">
        <h1 className="text-3xl font-bold text-on-surface mb-6">¡Hola de nuevo!</h1>
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

const PredictionScreen = ({ chartData, data }: { chartData: any[], data: PredictionData | null }) => {
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

const VoiceLogScreen = () => {
  const foodLogs = [
    { id: 1, name: 'Tacos de frijol', kcal: 380, time: '14:15', category: 'Almuerzo', impact: 'Bajo', amount: '35g', icon: Utensils },
    { id: 2, name: 'Huevo con nopales', kcal: 210, time: '08:30', category: 'Desayuno', impact: 'Bajo', amount: '12g', icon: Egg },
    { id: 3, name: 'Pan dulce', kcal: 320, time: '18:20', category: 'Merienda', impact: 'Alto', amount: '45g', icon: Croissant },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-32 bg-white min-h-screen">
      <header className="flex items-center justify-between px-5 h-14 w-full sticky top-0 z-40 bg-white/80 ios-blur">
        <Settings className="w-6 h-6 text-on-surface" /><span className="font-bold text-lg tracking-tight">BloodCare</span><div className="w-10 h-10"></div>
      </header>
      <main className="p-5 space-y-8">
        <div>
          <div className="flex items-center gap-1.5 text-on-surface-variant/80 font-mono font-bold text-[10px] mb-2 uppercase tracking-widest"><Lock className="w-3 h-3" />Procesado en tu celular 🔒</div>
          <h1 className="text-4xl font-bold text-on-surface mb-2">¿Qué comiste?</h1>
          <p className="text-lg text-on-surface-variant">Dilo en voz alta. Privacidad total.</p>
        </div>
        <div className="space-y-4">
          {foodLogs.map((log) => (
            <div key={log.id} className="w-full flex items-center justify-between p-4 bg-surface-container-low rounded-[20px] border border-outline-variant/10">
              <div className="flex items-center gap-4"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary"><log.icon className="w-7 h-7" /></div>
              <div><h4 className="font-bold text-lg">{log.name}</h4><p className="text-xs opacity-60">{log.kcal} kcal • {log.time}</p></div></div>
              <span className="text-lg font-bold">{log.amount}</span>
            </div>
          ))}
        </div>
      </main>
      <div className="fixed bottom-24 right-6 z-50"><button className="bg-primary text-white rounded-full w-20 h-20 flex items-center justify-center shadow-2xl"><Mic className="w-10 h-10" /></button></div>
    </motion.div>
  );
};

// --- Main App Component ---
export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [currentGlucose, setCurrentGlucose] = useState(123);
  const [predictionData, setPredictionData] = useState<PredictionData | null>(null);

  // Lógica de cableado con la API
  const [historyRecords, setHistoryRecords] = useState([]);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const response = await fetch('https://bloodcare-backend-jmv5.onrender.com/records/glucose?user_id=1');
      const data = await response.json();
      // Transformar para la gráfica
      const formatted = data.map((r: any) => ({
        time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: r.value
      })).reverse();
      setHistoryRecords(formatted);
    } catch (error) { console.error('Error cargando historial:', error); }
  };

  const saveGlucose = async (val: number) => {
    try {
      await fetch('https://bloodcare-backend-jmv5.onrender.com/records/glucose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 1, value: val, note: 'Registro manual' })
      });
      fetchRecords(); // Recargar gráfica
    } catch (error) { console.error('Error guardando:', error); }
  };

  const fetchPrediction = async (glucose: number) => {
    try {
      // Guardar el registro actual antes de predecir
      saveGlucose(glucose);
      
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

  const chartData = predictionData ? predictionData.prediction.map((val, i) => ({ time: `${i * 30}m`, pred: Math.round(val) })) : [];

  const renderScreen = () => {
    switch (screen) {
      case 'login': return <LoginScreen onLogin={() => setScreen('inicio')} />;
      case 'inicio': return <DashboardScreen data={predictionData} currentVal={currentGlucose} />;
      case 'prediccion': return <PredictionScreen chartData={chartData} data={predictionData} />;
      case 'voz': return <VoiceLogScreen />;
      case 'perfil': return <div className="p-10 text-center">Perfil de Usuario</div>;
      default: return <DashboardScreen data={predictionData} currentVal={currentGlucose} />;
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen relative overflow-x-hidden bg-surface">
      <AnimatePresence mode="wait"><div key={screen}>{renderScreen()}</div></AnimatePresence>
      {screen !== 'login' && <Navbar currentScreen={screen} setScreen={setScreen} />}
    </div>
  );
}
