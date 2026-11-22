/**
 * Motore 2: estrazione offline ad alta precisione tramite Ollama locale (es. qwen3-vl).
 */

import { PROMPT_MOD_B, SCHEMA_MOD_B_OLLAMA, normalizzaListaModB } from './configModB.js';

export async function estraiConOllamaOffline(canvasElement, modello, ollamaUrl, onStatusUpdate) {
  const inizio = Date.now();
  const timeoutOllamaMs = 120000;
  let timerId = null;

  if (onStatusUpdate) {
    onStatusUpdate(`Analisi offline con Ollama (${modello})... 0s`);
    timerId = setInterval(() => {
      const trascorsi = Math.floor((Date.now() - inizio) / 1000);
      onStatusUpdate(`Analisi offline con Ollama (${modello})... ${trascorsi}s`);
    }, 1000);
  }

  const dataUrl = canvasElement.toDataURL('image/jpeg', 0.85);
  const base64Image = dataUrl.substring(dataUrl.indexOf(',') + 1);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutOllamaMs);

  let res;
  try {
    res = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modello,
        stream: false,
        think: false,
        options: { temperature: 0 },
        format: SCHEMA_MOD_B_OLLAMA,
        messages: [
          {
            role: 'user',
            content: PROMPT_MOD_B,
            images: [base64Image]
          }
        ]
      }),
      signal: controller.signal
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (timerId) clearInterval(timerId);
    throw new Error(err.name === 'AbortError' ? 'Timeout Ollama locale (120s)' : err.message);
  }

  clearTimeout(timeoutId);
  if (timerId) clearInterval(timerId);

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} da Ollama: ${errText}`);
  }

  if (onStatusUpdate) {
    onStatusUpdate(`Completato offline con Ollama in ${((Date.now() - inizio) / 1000).toFixed(1)}s!`);
  }

  const data = await res.json();
  const rawContent = data?.message?.content || '{"lista":[]}';
  const parsed = JSON.parse(rawContent);

  return normalizzaListaModB(parsed.lista || parsed);
}