import { pipeline, env } from '@xenova/transformers';

// Configurar para usar caché local y evitar descargas repetidas
env.allowRemoteModels = true;
env.useBrowserCache = true;

let transcriber: any = null;

// Inicialización diferida para no saturar la RAM al inicio
const init = async () => {
  if (!transcriber) {
    self.postMessage({ type: 'status', message: 'Descargando Cerebro Local (Whisper)...' });
    transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
    self.postMessage({ type: 'status', message: 'IA Local Lista ✅' });
  }
};

self.onmessage = async (e) => {
  const { type, audio } = e.data;

  if (type === 'load') {
    await init();
  }

  if (type === 'transcribe' && audio) {
    if (!transcriber) await init();
    
    self.postMessage({ type: 'status', message: 'Escuchando localmente...' });
    const output = await transcriber(audio, {
      chunk_length_s: 30,
      stride_length_s: 5,
      language: 'spanish',
      task: 'transcribe',
    });

    self.postMessage({ type: 'result', text: output.text });
  }
};
