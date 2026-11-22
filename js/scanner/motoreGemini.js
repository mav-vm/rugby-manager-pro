/**
 * Motore 1: estrazione online tramite Google Gemini API (predefinito: gemini-4-hydrogen).
 * - Pre-controllo campo/connessione rapido: 1,5 secondi
 * - Timeout lettura immagine completa: 55 secondi
 */

import { PROMPT_MOD_B, SCHEMA_MOD_B_GEMINI, normalizzaListaModB } from './configModB.js';

const TIMEOUT_PING_CAMPO_MS = 1500; // 1,5s per capire se c'è campo reale
const TIMEOUT_GEMINI_MS = 55000;    // 55s per completare la lettura (~38s tipici)

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
      return n.includes('gemini') && (n.includes('hydrogen') || n.includes('flash')) && !n.includes('image') && !n.includes('tts') && !n.includes('audio') && !n.includes('live');
    })
    .map(m => m.name.replace('models/', ''));

  validi.sort((a, b) => {
    const score = (nome) => {
      let s = 0;
      if (nome.includes('4-hydrogen') || nome.includes('hydrogen')) s += 50;
      else if (nome.includes('3.8')) s += 40;
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
    throw new Error('Nessun modello Gemini Hydrogen/Flash trovato su questa chiave API.');
  }
  return validi;
}

async function verificaCampoGemini(apiKey) {
  const pingCtrl = new AbortController();
  const pingTimer = setTimeout(() => pingCtrl.abort(), TIMEOUT_PING_CAMPO_MS);

  try {
    const urlPing = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=' + encodeURIComponent(apiKey.trim());
    const res = await fetch(urlPing, { method: 'GET', signal: pingCtrl.signal });
    clearTimeout(pingTimer);

    if (res.status === 400 || res.status === 401 || res.status === 403) {
      const err = await res.json().catch(() => ({}));
      throw new Error('API_KEY_INVALID: ' + (err.error?.message || 'Chiave API Gemini non valida'));
    }
  } catch (err) {
    clearTimeout(pingTimer);
    if (String(err.message).startsWith('API_KEY_INVALID:')) {
      throw err;
    }
    throw new Error('NO_FIELD_1500MS: Campo assente o rete troppo lenta (1,5s)');
  }
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

export async function estraiConGemini(canvasElement, apiKey, onStatusUpdate, modelloPreferito = 'gemini-4-hydrogen') {
  // 1. Verifica campo in massimo 1,5 secondi
  if (onStatusUpdate) {
    onStatusUpdate('Controllo campo / connessione Gemini (1,5s)...');
  }
  await verificaCampoGemini(apiKey);

  // 2. Campo presente: lettura completa con timeout 55 secondi
  const inizio = Date.now();
  const secondiContoAllaRovescia = 45;
  let timerId = null;

  if (onStatusUpdate) {
    onStatusUpdate('Analisi con Gemini AI... attendi ~38s (timeout 55s)');
    timerId = setInterval(() => {
      const trascorsi = Math.floor((Date.now() - inizio) / 1000);
      const rimanenti = secondiContoAllaRovescia - trascorsi;
      onStatusUpdate(
        rimanenti > 0
          ? `Analisi con Gemini AI... ${trascorsi}s (max 55s)`
          : `Quasi pronto... ${trascorsi}s (max 55s)`
      );
    }, 1000);
  }

  const dataUrl = canvasElement.toDataURL('image/jpeg', 0.85);
  const base64Image = dataUrl.substring(dataUrl.indexOf(',') + 1);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_GEMINI_MS);

  let res;
  try {
    res = await chiamaGenerateContent(modelloPreferito, apiKey, base64Image, controller.signal);

    if (res.status === 404) {
      const disponibili = await ottieniModelliDisponibili(apiKey).catch(() => ['gemini-3.8-flash']);
      const alternativo = disponibili[0] || 'gemini-3.8-flash';
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