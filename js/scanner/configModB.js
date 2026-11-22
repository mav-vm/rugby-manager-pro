/**
 * Configurazione centrale dello scanner Mod. B.
 * - Modifica APP_VERSION ad ogni rilascio dell'app.
 * - Modifica REQUISITI_MOTORI SOLO quando serve davvero aggiornare Ollama,
 *   il modello Vision locale o i file di Tesseract sul dispositivo dell'utente.
 */

export const APP_VERSION = '1.0.0';

export const REQUISITI_MOTORI = {
  ollamaMinVersion: '0.12.0',
  ollamaModel: 'qwen3-vl:8b-instruct',
  ollamaModelRevision: 1, // Incrementa solo se vuoi richiedere un nuovo modello o re-pull
  tesseractRevision: 1    // Incrementa solo se aggiorni i file locali di Tesseract
};

export const PROMPT_MOD_B = `Analizza questa distinta rugby Mod. B (Federazione Italiana Rugby).
Estrai tutti i giocatori dall'alto verso il basso (prima i titolari, poi le riserve in "Giocatori in panchina") e per ultimo l'allenatore in fondo.
Formato esatto: [{"maglia":"15","ruolo":"E","cognome_nome":"COGNOME,NOME"}]

Regole rigorose:
1. "maglia": numero di maglia. SE il numero stampato è barrato a penna e c'è un numero scritto a mano (anche a lato nel margine sinistro), usa ESCLUSIVAMENTE quello scritto a penna. Per l'allenatore usa "".
2. "ruolo": sigla della colonna Ruolo (E, AD, CS, CD, AS, MA, MM, 3C, 3S, 3D, 2S, 2D, PD, T, PS, RI). Per l'allenatore usa "ALL".
3. "cognome_nome": trascrivi "COGNOME,NOME" in maiuscolo senza spazio dopo la virgola (es. "ROSA,MATTIA"). Mantieni SOLO (1L), (V), (C) se presenti (es. "ORLANDI,DAVIDE (C)", "ZENONI,DANIELE (1L)"). NON includere sigle extra prima linea come (PD), (PS), (T), (PS/T), (PS/T/PD), né tessera FIR o date.
4. Ignora righe vuote, assistenti allenatori, massaggiatori e accompagnatori: in fondo includi solo la riga "Allenatore".`;

export const SCHEMA_MOD_B_GEMINI = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      maglia: { type: 'STRING' },
      ruolo: { type: 'STRING' },
      cognome_nome: { type: 'STRING' }
    },
    required: ['maglia', 'ruolo', 'cognome_nome']
  }
};

export const SCHEMA_MOD_B_OLLAMA = {
  type: 'object',
  properties: {
    lista: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          maglia: { type: 'string' },
          ruolo: { type: 'string' },
          cognome_nome: { type: 'string' }
        },
        required: ['maglia', 'ruolo', 'cognome_nome']
      }
    }
  },
  required: ['lista']
};

/**
 * Normalizza l'output di qualunque motore (Gemini, Ollama, Tesseract)
 * garantendo il formato esatto: COGNOME,NOME e sole sigle (1L), (V), (C).
 */
export function normalizzaListaModB(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.map((riga) => ({
    maglia: String(riga.maglia ?? '').trim(),
    ruolo: String(riga.ruolo ?? '').trim().toUpperCase(),
    cognome_nome: String(riga.cognome_nome ?? '')
      .toUpperCase()
      .replace(/\(IL\)/g, '(1L)')
      .replace(/\s*,\s*/g, ',')
      .replace(/\s*\((?!1L\)|V\)|C\))[^)]+\)/g, '')
      .replace(/(\S)\((1L|V|C)\)/g, '$1 ($2)')
      .replace(/\s+/g, ' ')
      .trim()
  }));
}