/**
 * Pannello grafico per la Sezione 2:
 * - Inserimento e verifica della chiave API Gemini (per lettura online)
 * - Scelta e stato motori offline (Modalità Leggera Tesseract vs Ollama AI)
 * - Riconoscimento automatico dei motori già presenti anche dopo aggiornamenti dell'app
 */

import {
  verificaStatoMotori,
  salvaPreferenzeMotori,
  scaricaModelloOllama
} from './gestoreMotori.js';
import { ottieniModelliDisponibili } from './motoreGemini.js';
import { REQUISITI_MOTORI } from './configModB.js';

export async function montaPannelloMotori(targetIdOrEl = 'v2634MotoriBox') {
  const container = typeof targetIdOrEl === 'string'
    ? document.getElementById(targetIdOrEl)
    : targetIdOrEl;

  if (!container) return;

  container.innerHTML = `
    <div class="card" style="margin-top:12px">
      <div class="head">
        <b>Motori lettura distinta (Online / Offline)</b>
        <span class="status">Controllo dispositivo...</span>
      </div>
      <p class="help">Verifica dei motori già installati in corso...</p>
    </div>
  `;

  const stato = await verificaStatoMotori();
  disegnaPannello(container, stato);
}

function disegnaPannello(container, stato) {
  const { isMobile, preferenze, ollama, tesseract } = stato;
  const hasKey = Boolean((preferenze.geminiApiKey || '').trim());

  let badgeHtml = '<span class="status">Solo Tesseract</span>';
  let descrizione = '';

  if (ollama.raggiungibile && ollama.modelloPresente && !ollama.aggiornaModello && !ollama.aggiornaOllamaApp) {
    badgeHtml = `<span class="status ok">AI Offline pronta ✓ (${ollama.modelloAttivo})</span>`;
    descrizione = 'Ollama e il modello Vision sono già installati sul dispositivo: anche senza internet legge i numeri corretti a penna.';
  } else if (preferenze.modalitaOffline === 'tesseract' || (isMobile && preferenze.modalitaOffline === 'auto')) {
    badgeHtml = tesseract.pronto
      ? '<span class="status ok">Modalità Leggera pronta ✓ (Tesseract)</span>'
      : '<span class="status">Tesseract non trovato</span>';
    descrizione = isMobile
      ? 'Su telefono/tablet in offline viene usato Tesseract integrato (zero installazioni). Inserisci una API Key Gemini per la massima precisione online.'
      : 'Modalità leggera attiva: in offline usa Tesseract (zero installazioni extra).';
  } else if (ollama.raggiungibile && ollama.aggiornaOllamaApp) {
    badgeHtml = `<span class="status">Aggiorna Ollama (${ollama.versione} → ${REQUISITI_MOTORI.ollamaMinVersion}+)</span>`;
    descrizione = 'Questa versione dell’app richiede una versione più recente di Ollama.';
  } else if (ollama.raggiungibile && ollama.aggiornaModello) {
    badgeHtml = '<span class="status">Modello AI da scaricare/aggiornare</span>';
    descrizione = `Ollama è attivo (v${ollama.versione}), ma serve scaricare il modello ${REQUISITI_MOTORI.ollamaModel}.`;
  } else {
    badgeHtml = tesseract.pronto
      ? '<span class="status ok">Fallback Tesseract pronto ✓</span>'
      : '<span class="status">Configura offline</span>';
    descrizione = 'Puoi usare Gemini online inserendo la chiave qui sotto, oppure installare Ollama su PC per avere AI anche offline.';
  }

  container.innerHTML = `
    <div class="card" style="margin-top:12px">
      <div class="head">
        <b>Motori lettura distinta</b>
        ${badgeHtml}
      </div>

      <p class="help" style="margin:8px 0">${descrizione}</p>

      <!-- Sezione Chiave API Gemini (Online) -->
      <div style="padding:10px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;margin-bottom:10px">
        <div class="head">
          <label for="inpGeminiKey" style="margin:0">Chiave API Gemini (Online)</label>
          <span id="badgeGeminiKey" class="status ${hasKey ? 'ok' : ''}" style="margin-left:0">
            ${hasKey ? 'Chiave salvata ✓' : 'Non inserita'}
          </span>
        </div>
        <div class="actions" style="margin-top:6px;align-items:center">
          <input id="inpGeminiKey" type="password" placeholder="Incolla la tua Gemini API Key (AIza...)" value="${preferenze.geminiApiKey || ''}" style="flex:1;margin-top:0">
          <button type="button" class="outline" id="btnToggleKey" title="Mostra/Nascondi">👁</button>
          <button type="button" class="btn" id="btnVerificaGemini">Salva e verifica</button>
        </div>
        <div id="boxModelloGemini" style="margin-top:8px;${hasKey ? '' : 'display:none'}">
          <label for="selGeminiModel">Modello Gemini attivo</label>
          <select id="selGeminiModel">
            <option value="${preferenze.geminiModel || 'gemini-3.8-flash'}">${preferenze.geminiModel || 'gemini-3.8-flash'}</option>
          </select>
        </div>
        <small class="help" style="margin-top:6px">Resta salvata solo su questo dispositivo. Chiave gratuita su Google AI Studio (aistudio.google.com/apikey).</small>
      </div>

      <!-- Sezione Motore Offline -->
      <label for="selModalitaOffline">Modalità offline preferita</label>
      <select id="selModalitaOffline">
        <option value="auto" ${preferenze.modalitaOffline === 'auto' ? 'selected' : ''}>
          Automatica (Ollama se presente, altrimenti Tesseract)
        </option>
        <option value="tesseract" ${preferenze.modalitaOffline === 'tesseract' ? 'selected' : ''}>
          Modalità Leggera — solo Tesseract (consigliata su Tablet/Telefono)
        </option>
        <option value="ollama" ${preferenze.modalitaOffline === 'ollama' ? 'selected' : ''}>
          Modalità AI Massima Precisione — Ollama locale (PC/Mac)
        </option>
      </select>

      <div class="actions" style="margin-top:10px">
        ${ollama.raggiungibile && ollama.aggiornaModello ? `
          <button type="button" class="btn" id="btnScaricaModelloOllama">
            Scarica / Aggiorna AI (${REQUISITI_MOTORI.ollamaModel})
          </button>
        ` : ''}

        ${!ollama.raggiungibile && !isMobile ? `
          <button type="button" class="outline" id="btnGuidaOllama">
            Installa AI Offline (Ollama)
          </button>
        ` : ''}

        <button type="button" class="outline" id="btnRicontrollaMotori">
          Ricontrolla stato
        </button>
      </div>

      <div id="boxProgressoOllama" class="help" style="margin-top:8px; display:none"></div>

      ${preferenze.modalitaOffline === 'ollama' || (!isMobile && !ollama.raggiungibile) ? `
        <details style="margin-top:10px">
          <summary class="help" style="cursor:pointer">Impostazioni avanzate indirizzo Ollama (es. PC in Wi-Fi)</summary>
          <label style="margin-top:6px">URL Ollama</label>
          <div class="actions" style="margin-top:4px; align-items:center">
            <input id="inpOllamaUrl" type="text" value="${preferenze.ollamaUrl}" style="flex:1; margin-top:0">
            <button type="button" class="outline" id="btnSalvaOllamaUrl">Salva URL</button>
          </div>
        </details>
      ` : ''}
    </div>
  `;

  const inpKey = container.querySelector('#inpGeminiKey');
  const badgeKey = container.querySelector('#badgeGeminiKey');
  const selModel = container.querySelector('#selGeminiModel');
  const boxModel = container.querySelector('#boxModelloGemini');

  container.querySelector('#btnToggleKey')?.addEventListener('click', () => {
    inpKey.type = inpKey.type === 'password' ? 'text' : 'password';
  });

  container.querySelector('#btnVerificaGemini')?.addEventListener('click', async () => {
    const key = inpKey.value.trim();
    salvaPreferenzeMotori({ geminiApiKey: key });

    if (!key) {
      badgeKey.className = 'status';
      badgeKey.textContent = 'Rimossa';
      boxModel.style.display = 'none';
      return;
    }

    badgeKey.className = 'status';
    badgeKey.textContent = 'Verifica...';

    try {
      const modelli = await ottieniModelliDisponibili(key);
      const modelloScelto = modelli.includes(preferenze.geminiModel) ? preferenze.geminiModel : modelli[0];
      salvaPreferenzeMotori({ geminiModel: modelloScelto });

      selModel.innerHTML = modelli
        .map(m => `<option value="${m}" ${m === modelloScelto ? 'selected' : ''}>${m}</option>`)
        .join('');
      boxModel.style.display = 'block';
      badgeKey.className = 'status ok';
      badgeKey.textContent = 'Chiave valida ✓';
    } catch (err) {
      badgeKey.className = 'status';
      badgeKey.textContent = 'Errore chiave';
      alert('Verifica Gemini: ' + err.message);
    }
  });

  selModel?.addEventListener('change', (e) => {
    salvaPreferenzeMotori({ geminiModel: e.target.value });
  });

  container.querySelector('#selModalitaOffline')?.addEventListener('change', async (e) => {
    salvaPreferenzeMotori({ modalitaOffline: e.target.value });
    await montaPannelloMotori(container);
  });

  container.querySelector('#btnRicontrollaMotori')?.addEventListener('click', () => {
    montaPannelloMotori(container);
  });

  container.querySelector('#btnSalvaOllamaUrl')?.addEventListener('click', () => {
    const val = container.querySelector('#inpOllamaUrl')?.value.trim() || 'http://localhost:11434';
    salvaPreferenzeMotori({ ollamaUrl: val.replace(/\/+$/, '') });
    montaPannelloMotori(container);
  });

  container.querySelector('#btnScaricaModelloOllama')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const boxProg = container.querySelector('#boxProgressoOllama');
    btn.disabled = true;
    boxProg.style.display = 'block';
    boxProg.textContent = 'Avvio download modello...';

    try {
      await scaricaModelloOllama(REQUISITI_MOTORI.ollamaModel, ({ status, percentuale }) => {
        boxProg.textContent = percentuale !== null ? `${status}: ${percentuale}%` : status;
      });
      await montaPannelloMotori(container);
    } catch (err) {
      boxProg.textContent = 'Errore download: ' + err.message;
      btn.disabled = false;
    }
  });

  container.querySelector('#btnGuidaOllama')?.addEventListener('click', apriGuidaOllamaModal);
}

function apriGuidaOllamaModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modalbox">
      <button type="button" class="close" aria-label="Chiudi">&times;</button>
      <h3 style="margin-top:0">Attiva AI Offline sul tuo PC/Mac</h3>
      <p class="help">Operazione da fare <b>una sola volta</b> mentre hai internet. Dopo funzionerà offline anche aggiornando l'app.</p>
      <ol style="padding-left:18px; line-height:1.5">
        <li>Scarica e installa <b>Ollama</b> (gratuito) da <code>ollama.com/download</code>.</li>
        <li>Abilita i permessi browser impostando la variabile d'ambiente <code>OLLAMA_ORIGINS=*</code> e riavvia Ollama.</li>
        <li>Apri il Terminale e scarica il modello Vision:<br>
          <code>ollama pull ${REQUISITI_MOTORI.ollamaModel}</code>
        </li>
        <li>Torna qui e premi <b>Ricontrolla stato</b>.</li>
      </ol>
      <button type="button" class="btn full" id="btnChiudiGuidaOllama">Ho capito</button>
    </div>
  `;
  const chiudi = () => modal.remove();
  modal.querySelector('.close').onclick = chiudi;
  modal.querySelector('#btnChiudiGuidaOllama').onclick = chiudi;
  modal.addEventListener('click', (e) => { if (e.target === modal) chiudi(); });
  document.body.appendChild(modal);
}

window.montaPannelloMotori = montaPannelloMotori;

if (document.getElementById('v2634MotoriBox')) {
  montaPannelloMotori('v2634MotoriBox');
}