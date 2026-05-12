import { useState, useEffect, useRef } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';

import foodDictionary from './data/food_dictionary.json';
import { db, type UserSettings } from './db';
import type { Screen, PredictionData } from './types';

// --- Layout ---
import AppShell from './components/layout/AppShell';

// --- Screens ---
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import PredictionScreen from './screens/PredictionScreen';
import VoiceLogScreen from './screens/VoiceLogScreen';
import GlucoseHistoryScreen from './screens/GlucoseHistoryScreen';
import ProfileScreen from './screens/ProfileScreen';

const GOOGLE_CLIENT_ID = "1058750211058-22740igvp11f42lh4113mlir39dtqa9r.apps.googleusercontent.com";

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
          }
        } else {
          const heardText = text ? `"${text}"` : "nada";
          showToast(`Escuché ${heardText}, pero no sé qué comida es. 🤔`, 'info');
        }
      }
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
    const pendingGlucoseRecords = await db.glucose.where('synced').equals(0).toArray();
    for (const record of pendingGlucoseRecords) {
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

  const toggleRecording = isRecording ? stopRecording : startRecording;

  const renderScreen = () => {
    switch (screen) {
      case 'login':
        return <LoginScreen onLogin={() => setScreen('inicio')} />;
      case 'inicio':
        return (
          <DashboardScreen 
            currentVal={currentGlucose} 
            online={online} 
            historyRecords={historyRecords} 
            userSettings={userSettings} 
            setScreen={setScreen} 
            onManualGlucose={() => setShowManualGlucose(true)} 
            onVoiceStart={toggleRecording}
            isRecording={isRecording}
          />
        );
      case 'prediccion':
        return <PredictionScreen historyRecords={chartData} data={predictionData} />;
      case 'alimentos':
        return (
          <VoiceLogScreen
            userMeals={userMeals}
            onVoiceStart={toggleRecording}
            isRecording={isRecording}
            onAddManual={addManualMeal}
            aiStatus={aiStatus}
            online={online}
          />
        );
      case 'glucemia':
        return <GlucoseHistoryScreen records={historyRecords} />;
      case 'perfil':
        return <ProfileScreen userSettings={userSettings} onUpdate={updateSettings} onLogout={() => setScreen('login')} />;
      default:
        return <DashboardScreen currentVal={0} online={false} historyRecords={[]} userSettings={userSettings} setScreen={setScreen} onManualGlucose={() => {}} onVoiceStart={() => {}} isRecording={false} />;
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppShell
        currentScreen={screen}
        screenKey={screen}
        setScreen={setScreen}
        toast={toast}
        isRecording={isRecording}
        onVoiceStart={toggleRecording}
        pendingGlucose={pendingGlucose}
        onConfirmGlucose={(val) => { saveGlucose(val); setPendingGlucose(null); }}
        onCancelGlucose={() => setPendingGlucose(null)}
        showManualGlucose={showManualGlucose}
        onSaveManualGlucose={(val) => { saveGlucose(val); setShowManualGlucose(false); }}
        onCloseManualGlucose={() => setShowManualGlucose(false)}
      >
        {renderScreen()}
      </AppShell>
    </GoogleOAuthProvider>
  );
}
