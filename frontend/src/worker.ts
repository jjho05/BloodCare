import { pipeline, env } from '@xenova/transformers';

env.allowRemoteModels = true;
env.useBrowserCache = true;

let transcriber: any = null;
let extractor: any = null;
let dictionaryVectors: any[] = [];

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
  const words = text.toLowerCase().split(' ');
  const numMatch = text.match(/\d+/);
  if (numMatch) return parseInt(numMatch[0]);
  for (let word of words) {
    if (numberMap[word]) return numberMap[word];
  }
  return 1;
}

const init = async () => {
  try {
    if (!transcriber) {
      self.postMessage({ type: 'status', message: 'Cargando Whisper...' });
      transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
    }
    if (!extractor) {
      self.postMessage({ type: 'status', message: 'Cargando Buscador Semántico...' });
      extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    self.postMessage({ type: 'status', message: 'IA Local Lista ✅' });
  } catch (err) {
    self.postMessage({ type: 'status', message: 'Error cargando IA: ' + err });
  }
};

self.onmessage = async (e) => {
  const { type, audio, text, dictionary } = e.data;

  if (type === 'load') await init();

  if (type === 'index' && dictionary) {
    try {
      dictionaryVectors = await Promise.all(dictionary.map(async (item: any) => {
        const output = await extractor(item.nombre, { pooling: 'mean', normalize: true });
        return { id: item.nombre, vector: Array.from(output.data) };
      }));
      self.postMessage({ type: 'status', message: 'Diccionario Listo 📖' });
    } catch (err) {
      self.postMessage({ type: 'status', message: 'Error indexando: ' + err });
    }
  }

  if (type === 'transcribe' && audio) {
    try {
      self.postMessage({ type: 'status', message: 'Analizando audio... 🧠' });
      if (!transcriber) await init();
      
      const output = await transcriber(audio, { 
        language: 'spanish', 
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5
      });
      
      const transcript = output.text.trim();
      if (!transcript) {
        self.postMessage({ type: 'result', text: '', match: null, quantity: 1 });
        return;
      }

      const quantity = extractQuantity(transcript);
      
      if (extractor && dictionaryVectors.length > 0) {
        const queryOutput = await extractor(transcript, { pooling: 'mean', normalize: true });
        const queryVector = Array.from(queryOutput.data) as number[];
        
        const scores = dictionaryVectors.map(dv => ({
          id: dv.id,
          score: cosineSimilarity(queryVector, dv.vector as number[])
        })).sort((a, b) => b.score - a.score);

        self.postMessage({ type: 'result', text: transcript, match: scores[0], quantity });
      } else {
        self.postMessage({ type: 'result', text: transcript, quantity });
      }
    } catch (err) {
      self.postMessage({ type: 'status', message: 'Error en IA: ' + err });
    }
  }
};
