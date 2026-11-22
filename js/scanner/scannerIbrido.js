/**
 * Orchestratore leggero dello scanner Mod. B:
 * 1) Gemini Cloud (check campo 1,5s + lettura max 55s)
 * 2) Ollama locale (se offline/senza campo e installato)
 * 3) Tesseract OCR (fallback universale offline su qualsiasi dispositivo)
 */

import { estraiConGemini, ottieniModelliDisponibili } from './motoreGemini.js';
import { estraiConOllamaOffline } from './motoreOllama.js';
import { estraiConTesseractOffline } from './motoreTesseract.js';
import {
  verificaStatoMotori,
  salvaPreferenzeMotori,
  leggiPreferenzeMotori,
  scaricaModelloOllama
} from './gestoreMotori.js';

export async function elaboraDistinta(canvasElement, apiKey, onStatusUpdate) {
  const prefAttuali = leggiPreferenzeMotori();
  const chiavePulita = (apiKey || prefAttuali.geminiApiKey || '').trim();
  const aggiornaStato = onStatusUpdate || (() => {});

  // 1. ONLINE CON GEMINI (ping 1,5s -> invio max 55s)
  if (navigator.onLine && chiavePulita) {
    try {
      const giocatori = await estraiConGemini(
        canvasElement,
        chiavePulita,
        aggiornaStato,
        prefAttuali.geminiModel || 'gemini-4-hydrogen'
      );
      return { fonte: 'GEMINI_CLOUD', dati: giocatori };
    } catch (errore) {
      console.warn('Gemini non riuscito:', errore.message);
      const isErroreCampoORete = /NO_FIELD_1500MS|Failed to fetch|NetworkError|Timeout/i.test(errore.message);

      if (!isErroreCampoORete) {
        const msgPulito = errore.message.replace(/^API_KEY_INVALID:\s*/, '');
        const boxJson = document.getElementById('outputJson');
        if (boxJson) boxJson.textContent = 'ERRORE GEMINI:\n' + msgPulito;
        throw new Error('Gemini non disponibile: ' + msgPulito);
      }

      aggiornaStato('Campo assente o rete scaduta: passo subito al motore offline...');
    }
  }

  // 2. SCELTA MOTORI OFFLINE
  const stato = await verificaStatoMotori();
  const pref = stato.preferenze;

  const usaOllama =
    pref.modalitaOffline !== 'tesseract' &&
    stato.ollama.raggiungibile &&
    stato.ollama.modelloPresente;

  if (usaOllama) {
    aggiornaStato(`Offline: analisi AI con Ollama (${stato.ollama.modelloAttivo})...`);
    const datiOllama = await estraiConOllamaOffline(
      canvasElement,
      stato.ollama.modelloAttivo,
      pref.ollamaUrl,
      aggiornaStato
    );
    return { fonte: 'OLLAMA_OFFLINE', dati: datiOllama };
  }

  if (pref.modalitaOffline === 'ollama' && !stato.ollama.raggiungibile) {
    throw new Error('Hai selezionato Ollama ma non risulta avviato su ' + pref.ollamaUrl);
  }

  // 3. FALLBACK FINALE TESSERACT
  aggiornaStato('Offline: avvio OCR locale Tesseract...');
  const datiTesseract = await estraiConTesseractOffline(canvasElement, aggiornaStato);
  return { fonte: 'TESSERACT_OFFLINE', dati: datiTesseract };
}

window.elaboraDistinta = elaboraDistinta;
window.ottieniModelliDisponibili = ottieniModelliDisponibili;
window.GestoreMotori = {
  verificaStatoMotori,
  salvaPreferenzeMotori,
  leggiPreferenzeMotori,
  scaricaModelloOllama
};