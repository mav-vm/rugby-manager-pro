/**
 * Motore 1: estrazione online tramite Google Gemini API.
 */

import { PROMPT_MOD_B, SCHEMA_MOD_B_GEMINI, normalizzaListaModB } from './configModB.js';

export async function ottieniModelliDisponibili(apiKey) {
  const urlLista = 'https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent((apiKey || '').trim());
  const res = await fetch(urlLista);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error && err.error.message ? err.error.message : ('Chiave API non valida (HTTP ' + res.status + ')'));
  }
  const data = await res.json();
  const tutti = data.models || [];

  const validi = tutti
    .filter(m => {
      if (!m.name || !Array.isArray(m.supportedGenerationMethods) || !m.supportedGenerationMethods.includes('generateContent')) return false;
      const n = m.name.toLowerCase();
      return n.includes('gemini') && n.includes('flash') && !n.includes('image') && !n.includes('tts') && !n.includes('audio') && !n.includes('live');
    })
    .map(m => m.name.replace('models/', ''));

  validi.sort((a, b) => {
    const score = (nome) => {
      let s = 0;
      if (nome.includes('3.8')) s += 40;
      else if (nome.includes('3.6')) s += 35;
      else if (nome.includes('3.5')) s += 30;
      else if (nome.includes('3')) s += 20;
      if (nome.includes('lite')) s -= 5;
      if (nome.includes('preview') || nome.includes('exp')) s -= 2;
      return s;
    };
    return score(b) - score(a);
  });

  if (validi.length === 0) {
    throw new Error('Nessun modello Gemini Flash trovato su questa chiave API.');
  }
  return validi;
}

async function chiamaGenerateContent(modelId, apiKey, base64Image, signal) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
  return await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: PROMPT_MOD_B },
          { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
        ]
      }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: SCHEMA_MOD_B_GEMINI
      }
    }),
    signal
  });
}

export async function estraiConGemini(canvasElement, apiKey, onStatusUpdate, modelloPreferito = 'gemini-3.8-flash') {
  const inizio = Date.now();
  const secondiContoAllaRovescia = 45;
  const timeoutRealeMs = 55000;
  let timerId = null;

  if (onStatusUpdate) {
    onStatusUpdate('Analisi con Gemini AI... attendi circa ' + secondiContoAllaRovescia + 's');
    timerId = setInterval(() => {
      const trascorsi = Math.floor((Date.now() - inizio) / 1000);
      const rimanenti = secondiContoAllaRovescia - trascorsi;
      onStatusUpdate(
        rimanenti > 0
          ? 'Analisi con Gemini AI... attendi circa ' + rimanenti + 's'
          : 'Quasi pronto... completamento estrazione in corso'
      );
    }, 1000);
  }

  const dataUrl = canvasElement.toDataURL('image/jpeg', 0.85);
  const base64Image = dataUrl.substring(dataUrl.indexOf(',') + 1);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutRealeMs);

  let res;
  try {
    res = await chiamaGenerateContent(modelloPreferito, apiKey, base64Image, controller.signal);

    if (res.status === 404) {
      const disponibili = await ottieniModelliDisponibili(apiKey).catch(() => ['gemini-flash-latest']);
      const alternativo = disponibili[0] || 'gemini-flash-latest';
      res = await chiamaGenerateContent(alternativo, apiKey, base64Image, controller.signal);
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (timerId) clearInterval(timerId);
    throw new Error(err.name === 'AbortError' ? 'Timeout connessione (55s)' : err.message);
  }
  clearTimeout(timeoutId);
  if (timerId) clearInterval(timerId);

  if (onStatusUpdate) {
    onStatusUpdate('Completato in ' + ((Date.now() - inizio) / 1000).toFixed(1) + 's!');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error && err.error.message ? err.error.message : 'HTTP ' + res.status);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  const jsonPulito = rawText.replace(/```json|```/g, '').trim();

  return normalizzaListaModB(JSON.parse(jsonPulito));
}