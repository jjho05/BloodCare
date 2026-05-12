import { pipeline, env } from '@xenova/transformers';

env.allowRemoteModels = true;
env.useBrowserCache = true;

let GROQ_API_KEY = "";
let extractor: any = null;
let dictionaryVectors: any[] = [];
let fullDictionary: any[] = [];
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
      fullDictionary = dictionary;
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
      const result = await response.json();
      const text = result.text.toLowerCase();
    
      // 1. Detección de Glucosa (Números) - Rápida
      const glucoseMatch = text.match(/\b(\d{2,3})\b/);
      if (glucoseMatch && (text.includes('glucosa') || text.includes('tengo') || text.includes('nivel') || text.includes('azúcar') || (glucoseMatch[0].length >= 2 && !text.includes('taco')))) {
        self.postMessage({ 
          type: 'result', 
          dataType: 'glucose', 
          value: parseInt(glucoseMatch[1]),
          text: text 
        });
        return;
      }

      // 2. Razonamiento Inteligente con LLM (Llama 3)
      self.postMessage({ type: 'status', message: 'Analizando con IA... 🧠' });
      
      const dictionaryContext = fullDictionary.map((f: any) => `- ${f.nombre} (Alias: ${f.alias.join(', ')})`).join('\n');
      
      const chatResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [
            { 
              role: "system", 
              content: `Eres BloodCare AI. Tu tarea es mapear el texto del usuario a un alimento de este diccionario:\n${dictionaryContext}\n\nSi el alimento NO está en el diccionario, usa tu conocimiento general para identificarlo y estimar sus carbohidratos (por 1 porción estándar).\n\nResponde estrictamente en formato JSON: {"match": "Nombre Exacto o Nuevo", "quantity": numero, "is_food": boolean, "is_new": boolean, "carbs_est": numero, "portion_est": "string"}` 
            },
            { role: "user", content: text }
          ],
          response_format: { type: "json_object" }
        })
      });

      const chatData = await chatResponse.json();
      
      if (!chatData.choices || chatData.choices.length === 0) {
        throw new Error('La IA no devolvió opciones de respuesta.');
      }

      const content = chatData.choices[0]?.message?.content;
      if (!content) throw new Error('Contenido de respuesta vacío.');

      const aiResult = JSON.parse(content);

      if (aiResult.is_food && aiResult.match) {
        if (aiResult.is_new) {
          // El alimento es nuevo, devolvemos la estimación
          self.postMessage({ 
            type: 'result', 
            text: text, 
            dataType: 'new_food',
            food: {
              nombre: aiResult.match,
              carbohidratos_g: aiResult.carbs_est || 20,
              porcion: aiResult.portion_est || '1 porción',
              alias: [aiResult.match.toLowerCase()]
            },
            quantity: aiResult.quantity || 1 
          });
        } else {
          const foodItem = fullDictionary.find((f: any) => f.nombre === aiResult.match);
          self.postMessage({ 
            type: 'result', 
            text: text, 
            match: foodItem ? { id: foodItem.nombre, score: 1 } : null, 
            quantity: aiResult.quantity || 1 
          });
        }
      } else {
        self.postMessage({ type: 'result', text: text, match: null, quantity: 1 });
      }

    } catch (err) {
      self.postMessage({ type: 'status', message: 'Error IA: ' + err });
    }
  }
};
