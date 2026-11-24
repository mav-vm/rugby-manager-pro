/**
 * Gestisce le preferenze utente (Chiave API Gemini + Modalità Offline Ollama/Tesseract),
 * verifica i motori realmente installati sul dispositivo e permette di scaricare/aggiornare
 * il modello Ollama direttamente dalla UI.
 */

import { REQUISITI_MOTORI } from './configModB.js';
import { verificaTesseractLocale } from './motoreTesseract.js';

const STORAGE_KEY = 'modb_impostazioni_motori_v1';

const DEFAULT_PREF = {
  geminiApiKey: '',
  geminiModel: 'gemini-4-hydrogen',
  saltaRichiestaGemini: false, // Diventa true solo se l'utente spunta "Non chiedere più"
  modalitaOffline: 'auto',     // 'auto' | 'ollama' | 'tesseract'
  ollamaUrl: 'http://localhost:11434',
  ollamaModelloScelto: REQUISITI_MOTORI.ollamaModel,
  ollamaModelRevisionInstallata: 0,
  tesseractRevisionInstallata: 0
};

export function leggiPreferenzeMotori() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PREF, ...JSON.parse(raw) } : { ...DEFAULT_PREF };
  } catch {
    return { ...DEFAULT_PREF };
  }
}

export function salvaPreferenzeMotori(nuovePref) {
  const unite = { ...leggiPreferenzeMotori(), ...nuovePref };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(unite));
  return unite;
}

function confrontaVersioni(vA, vB) {
  const pulisci = (v) => String(v || '0').split('-')[0].split('.').map(n => parseInt(n, 10) || 0);
  const a = pulisci(vA);
  const b = pulisci(vB);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export async function verificaStatoMotori() {
  const pref = leggiPreferenzeMotori();
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const tesseractPresente = await verificaTesseractLocale();
  const tesseractAggiornamentoRichiesto =
    tesseractPresente &&
    pref.tesseractRevisionInstallata > 0 &&
    pref.tesseractRevisionInstallata < REQUISITI_MOTORI.tesseractRevision;

  if (tesseractPresente && pref.tesseractRevisionInstallata === 0) {
    salvaPreferenzeMotori({ tesseractRevisionInstallata: REQUISITI_MOTORI.tesseractRevision });
  }

  const statoOllama = {
    raggiungibile: false,
    versione: null,
    aggiornaOllamaApp: false,
    modelliInstallati: [],
    modelloAttivo: null,
    modelloPresente: false,
    aggiornaModello: false
  };

  try {
    const ctrl = new AbortController();
    const tId = setTimeout(() => ctrl.abort(), 1500);

    const [resVer, resTags] = await Promise.all([
      fetch(`${pref.ollamaUrl}/api/version`, { signal: ctrl.signal }),
      fetch(`${pref.ollamaUrl}/api/tags`, { signal: ctrl.signal })
    ]);
    clearTimeout(tId);

    if (resVer.ok && resTags.ok) {
      const verData = await resVer.json();
      const tagsData = await resTags.json();

      statoOllama.raggiungibile = true;
      statoOllama.versione = verData.version || '0.0.0';
      statoOllama.aggiornaOllamaApp =
        confrontaVersioni(statoOllama.versione, REQUISITI_MOTORI.ollamaMinVersion) < 0;

      statoOllama.modelliInstallati = (tagsData.models || []).map(m => m.name);

      const preferiti = [
        pref.ollamaModelloScelto,
        REQUISITI_MOTORI.ollamaModel,
        'qwen3-vl:8b-instruct',
        'qwen3-vl:8b',
        'qwen3-vl:4b-instruct',
        'qwen3-vl:4b'
      ];
      const trovato =
        preferiti.find(m => statoOllama.modelliInstallati.includes(m)) ||
        statoOllama.modelliInstallati.find(n => /vl|vision|llava|minicpm-v/i.test(n)) ||
        null;

      statoOllama.modelloAttivo = trovato;
      statoOllama.modelloPresente = Boolean(trovato);

      statoOllama.aggiornaModello =
        !statoOllama.modelloPresente ||
        (pref.ollamaModelRevisionInstallata > 0 &&
          pref.ollamaModelRevisionInstallata < REQUISITI_MOTORI.ollamaModelRevision);

      if (statoOllama.modelloPresente && pref.ollamaModelRevisionInstallata === 0) {
        salvaPreferenzeMotori({ ollamaModelRevisionInstallata: REQUISITI_MOTORI.ollamaModelRevision });
      }
    }
  } catch {
    // Ollama non installato o spento
  }

  return {
    isMobile,
    preferenze: leggiPreferenzeMotori(),
    tesseract: {
      pronto: tesseractPresente,
      aggiornamentoRichiesto: tesseractAggiornamentoRichiesto
    },
    ollama: statoOllama
  };
}

export async function scaricaModelloOllama(nomeModello = REQUISITI_MOTORI.ollamaModel, onProgress = () => {}) {
  const { ollamaUrl } = leggiPreferenzeMotori();

  const res = await fetch(`${ollamaUrl}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: nomeModello, stream: true })
  });

  if (!res.ok) {
    throw new Error(`Impossibile scaricare il modello (HTTP ${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const righe = buffer.split('\n');
    buffer = righe.pop() || '';

    for (const riga of righe) {
      if (!riga.trim()) continue;
      const msg = JSON.parse(riga);
      if (msg.error) throw new Error(msg.error);

      const percentuale = msg.total ? Math.round((msg.completed / msg.total) * 100) : null;
      onProgress({ status: msg.status, percentuale });
    }
  }

  salvaPreferenzeMotori({
    ollamaModelloScelto: nomeModello,
    ollamaModelRevisionInstallata: REQUISITI_MOTORI.ollamaModelRevision
  });
}