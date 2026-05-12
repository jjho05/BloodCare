import { pipeline, env } from '@xenova/transformers';

env.allowRemoteModels = true;
env.useBrowserCache = true;

let transcriber: any = null;
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
    if (!transcriber) {
      self.postMessage({ type: 'status', message: 'Cargando Whisper Small (Español)...' });
      transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small');
    }
    if (!extractor) {
      self.postMessage({ type: 'status', message: 'Cargando Buscador Multilingüe...' });
      extractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2');
    }
    isReady = true;
    self.postMessage({ type: 'status', message: 'IA Local Lista ✅' });
  } catch (err) {
    self.postMessage({ type: 'status', message: 'Error cargando IA: ' + err });
  }
};

self.onmessage = async (e) => {
  const { type, audio, dictionary } = e.data;

  if (type === 'load') await init();

  if (type === 'index' && dictionary) {
    while (!isReady) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    try {
      self.postMessage({ type: 'status', message: 'Indexando diccionario...' });
      dictionaryVectors = await Promise.all(dictionary.map(async (item: any) => {
        const output = await extractor(item.nombre, { pooling: 'mean', normalize: true });
        return { id: item.nombre, vector: Array.from(output.data) as number[] };
      }));
      self.postMessage({ type: 'status', message: 'Diccionario Listo 📖' });
    } catch (err) {
      self.postMessage({ type: 'status', message: 'Error indexando: ' + err });
    }
  }

  if (type === 'transcribe' && audio) {
    try {
      self.postMessage({ type: 'status', message: 'Analizando audio... 🧠' });
      if (!isReady) await init();

      const audioInput = audio.array ?? audio;

      const output = await transcriber(audioInput, { 
        language: 'spanish', 
        task: 'transcribe',
        sampling_rate: 16000,
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: false
      });
      
      const transcript = (output.text ?? '').trim().toLowerCase();
      console.log('[Worker] Transcripción:', transcript);

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

        console.log('[Worker] Top 3 matches:', scores.slice(0, 3));
        self.postMessage({ type: 'result', text: transcript, match: scores[0], quantity });
      } else {
        self.postMessage({ type: 'result', text: transcript, match: null, quantity });
      }
    } catch (err) {
      console.error('[Worker] Error en transcripción:', err);
      self.postMessage({ type: 'status', message: 'Error en IA: ' + err });
    }
  }
};
