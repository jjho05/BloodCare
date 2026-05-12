import { pipeline, env } from '@xenova/transformers';

env.allowRemoteModels = true;
env.useBrowserCache = true;

let transcriber: any = null;
let extractor: any = null;

const init = async () => {
  if (!transcriber) {
    self.postMessage({ type: 'status', message: 'Cargando Oídos (Whisper)...' });
    transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
  }
  if (!extractor) {
    self.postMessage({ type: 'status', message: 'Cargando Cerebro Semántico...' });
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  self.postMessage({ type: 'status', message: 'IA Local Soberana Lista ✅' });
};

self.onmessage = async (e) => {
  const { type, audio, text: input_text } = e.data;

  if (type === 'load') await init();

  if (type === 'transcribe' && audio) {
    if (!transcriber) await init();
    self.postMessage({ type: 'status', message: 'Transcribiendo voz...' });
    const output = await transcriber(audio, { language: 'spanish', task: 'transcribe' });
    self.postMessage({ type: 'result', text: output.text });
  }

  // Lógica futura para comparar semánticamente con el diccionario
  if (type === 'extract' && input_text) {
    if (!extractor) await init();
    // Aquí generaríamos el vector para buscar en el JSON
    self.postMessage({ type: 'status', message: 'Analizando nutrientes...' });
  }
};
