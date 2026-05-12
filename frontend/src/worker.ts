import { pipeline, env } from '@xenova/transformers';

env.allowRemoteModels = true;
env.useBrowserCache = true;

let GROQ_API_KEY = "";
let extractor: any = null;
let dictionaryVectors: any[] = [];
let isReady = false;

function cosineSimilarity(a: number[], b: number[]) {
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

const numberMap: Record<string, number> = {
  'un': 1, 'una': 1, 'uno': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
  'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10
};

function extractQuantity(text: string): number {
  const numMatch = text.match(/\d+/);
  if (numMatch) return parseInt(numMatch[0]);
  for (const word of text.toLowerCase().split(' ')) {
    if (numberMap[word]) return numberMap[word];
  }
  return 1;
}

const init = async () => {
  try {
    if (!extractor) {
      self.postMessage({ type: 'status', message: 'Iniciando Motor Semántico...' });
      extractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2');
    }
    isReady = true;
    self.postMessage({ type: 'status', message: 'Motor de Inteligencia Listo ⚡️' });
  } catch (err) {
    self.postMessage({ type: 'status', message: 'Error en Motor: ' + err });
  }
};

self.onmessage = async (e) => {
  const { type, audioBlob, dictionary, apiKey } = e.data;

  if (type === 'load') {
    if (apiKey) GROQ_API_KEY = apiKey;
    await init();
  }

  if (type === 'index' && dictionary) {
    while (!isReady) await new Promise(r => setTimeout(r, 200));
    try {
      self.postMessage({ type: 'status', message: 'Indexando diccionario...' });
      dictionaryVectors = await Promise.all(dictionary.map(async (item: any) => {
        const output = await extractor(item.nombre, { pooling: 'mean', normalize: true });
        return { id: item.nombre, vector: Array.from(output.data) as number[] };
      }));
      self.postMessage({ type: 'status', message: 'Diccionario Listo 📖' });
    } catch (err) { console.error('Error indexando:', err); }
  }

  if (type === 'transcribe' && audioBlob) {
    try {
      self.postMessage({ type: 'status', message: 'Transcribiendo con Groq... ⚡️' });
      
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('language', 'es');
      formData.append('prompt', 'Comida mexicana, carbohidratos, diabetes, glucosa.');

      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: formData
      });

      if (!response.ok) throw new Error(`Groq API Error: ${response.status}`);
      const data = await response.json();
      const transcript = (data.text ?? '').trim().toLowerCase();
      
      console.log('[Groq] Transcripción:', transcript);

      if (!transcript || transcript.length < 2) {
        self.postMessage({ type: 'result', text: '', match: null, quantity: 1 });
        return;
      }

      const quantity = extractQuantity(transcript);
      
      if (extractor && dictionaryVectors.length > 0) {
        const queryOutput = await extractor(transcript, { pooling: 'mean', normalize: true });
        const queryVector = Array.from(queryOutput.data) as number[];
        
        const scores = dictionaryVectors.map(dv => ({
          id: dv.id,
          score: cosineSimilarity(queryVector, dv.vector)
        })).sort((a, b) => b.score - a.score);

        self.postMessage({ type: 'result', text: transcript, match: scores[0], quantity });
      } else {
        self.postMessage({ type: 'result', text: transcript, match: null, quantity });
      }
    } catch (err) {
      self.postMessage({ type: 'status', message: 'Error Groq: ' + err });
    }
  }
};
