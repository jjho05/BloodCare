import { pipeline, env } from '@xenova/transformers';

env.allowRemoteModels = true;
env.useBrowserCache = true;

let GROQ_API_KEY = "";
let extractor: any = null;
let dictionaryVectors: any[] = [];
let isReady = false;

/**
 * Safely extract the float array from the extractor output.
 * Handles different output shapes from @xenova/transformers:
 *   - output.data          (Float32Array)
 *   - output[0].data       (nested tensor)
 *   - output.tolist()[0]   (fallback)
 */
function safeExtractVector(output: any): number[] {
  try {
    // Case 1: output has .data directly as a typed array
    if (output?.data && typeof output.data[Symbol.iterator] === 'function') {
      return Array.from(output.data) as number[];
    }
    // Case 2: output is array-like and first element has .data
    if (output?.[0]?.data && typeof output[0].data[Symbol.iterator] === 'function') {
      return Array.from(output[0].data) as number[];
    }
    // Case 3: output has a tolist() method (onnx tensor)
    if (typeof output?.tolist === 'function') {
      const list = output.tolist();
      // tolist() may return nested arrays, flatten the first level
      return Array.isArray(list[0]) ? list[0] : list;
    }
    // Case 4: output itself is iterable (e.g. Float32Array)
    if (typeof output?.[Symbol.iterator] === 'function') {
      return Array.from(output) as number[];
    }
  } catch (_) { /* fall through */ }
  return [];
}

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
      dictionaryVectors = [];
      for (const item of dictionary) {
        try {
          const output = await extractor(item.nombre, { pooling: 'mean', normalize: true });
          const vector = safeExtractVector(output);
          if (vector.length > 0) {
            dictionaryVectors.push({ id: item.nombre, vector });
          } else {
            console.warn('[worker] Vector vacío para:', item.nombre);
          }
        } catch (err) {
          console.warn('[worker] Error indexando:', item.nombre, err);
        }
      }
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
      const result = await response.json();
      const text = result.text.toLowerCase();
    
      // 1. Detección de Glucosa (Números)
      const glucoseMatch = text.match(/\b(\d{2,3})\b/);
      if (glucoseMatch && (text.includes('glucosa') || text.includes('tengo') || text.includes('nivel') || text.includes('azúcar') || glucoseMatch[0].length >= 2)) {
        self.postMessage({ 
          type: 'result', 
          dataType: 'glucose', 
          value: parseInt(glucoseMatch[1]),
          text: text 
        });
        return;
      }

      // 2. Detección de Comida (Semántica)
      const transcript = text;
      
      console.log('[Groq] Transcripción:', transcript);

      if (!transcript || transcript.length < 2) {
        self.postMessage({ type: 'result', text: '', match: null, quantity: 1 });
        return;
      }

      const quantity = extractQuantity(transcript);
      
      if (extractor && dictionaryVectors.length > 0) {
        const queryOutput = await extractor(transcript, { pooling: 'mean', normalize: true });
        const queryVector = safeExtractVector(queryOutput);
        if (queryVector.length === 0) {
          self.postMessage({ type: 'result', text: transcript, match: null, quantity });
          return;
        }
        
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
