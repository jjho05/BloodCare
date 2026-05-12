import { pipeline, env } from '@xenova/transformers';

env.allowRemoteModels = true;
env.useBrowserCache = true;

let transcriber: any = null;
let extractor: any = null;
let dictionaryVectors: any[] = [];
let dictionaryData: any[] = [];

// Función para calcular similitud de cosenos
function cosineSimilarity(a: number[], b: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

const init = async () => {
  if (!transcriber) {
    self.postMessage({ type: 'status', message: 'Cargando Whisper...' });
    transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
  }
  if (!extractor) {
    self.postMessage({ type: 'status', message: 'Cargando Buscador Semántico...' });
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  self.postMessage({ type: 'status', message: 'IA Local Lista ✅' });
};

self.onmessage = async (e) => {
  const { type, audio, text, dictionary } = e.data;

  if (type === 'load') await init();

  if (type === 'index' && dictionary) {
    self.postMessage({ type: 'status', message: 'Indexando Diccionario Local...' });
    dictionaryData = dictionary;
    dictionaryVectors = await Promise.all(dictionary.map(async (item: any) => {
      const output = await extractor(item.nombre, { pooling: 'mean', normalize: true });
      return { id: item.nombre, vector: Array.from(output.data) };
    }));
    self.postMessage({ type: 'status', message: 'Diccionario Indexado 📖' });
  }

  if (type === 'transcribe' && audio) {
    if (!transcriber) await init();
    const output = await transcriber(audio, { language: 'spanish', task: 'transcribe' });
    const transcript = output.text;
    
    // Búsqueda Semántica
    if (extractor && dictionaryVectors.length > 0) {
      const queryOutput = await extractor(transcript, { pooling: 'mean', normalize: true });
      const queryVector = Array.from(queryOutput.data) as number[];
      
      const scores = dictionaryVectors.map(dv => ({
        id: dv.id,
        score: cosineSimilarity(queryVector, dv.vector as number[])
      })).sort((a, b) => b.score - a.score);

      self.postMessage({ type: 'result', text: transcript, match: scores[0] });
    } else {
      self.postMessage({ type: 'result', text: transcript });
    }
  }
};
