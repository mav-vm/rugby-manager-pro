/**
 * Pannello grafico a scomparsa per la Sezione 2 + Popup automatico richiesta chiave Gemini
 * quando si tenta una lettura AI online senza aver ancora inserito la chiave.
 */

import {
  verificaStatoMotori,
  salvaPreferenzeMotori,
  scaricaModelloOllama,
  ottieniInfoInstallerOllama
} from './gestoreMotori.js';
import { ottieniModelliDisponibili } from './motoreGemini.js';
import { REQUISITI_MOTORI } from './configModB.js';

export async function montaPannelloMotori(targetIdOrEl = 'v2634MotoriBox', mantieniAperto = false) {
  const container = typeof targetIdOrEl === 'string'
    ? document.getElementById(targetIdOrEl)
    : targetIdOrEl;

  if (!container) return;

  const eraAperto = mantieniAperto || Boolean(container.querySelector('details[open]'));

  container.innerHTML = `
    <details class="card" style="margin-top:12px" ${eraAperto ? 'open' : ''}>
      <summary class="head" style="cursor:pointer;list-style:none">
        <b>⚙ Motori lettura distinta (Online / Offline) ▾</b>
        <span class="status">Controllo...</span>
      </summary>
      <p class="help" style="margin-top:8px">Verifica dei motori già installati in corso...</p>
    </details>
  `;

  const stato = await verificaStatoMotori();
  disegnaPannello(container, stato, eraAperto);
}

export function chiediChiaveGeminiModal() {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modalbox">
        <button type="button" class="close" aria-label="Chiudi">&times;</button>
        <h3 style="margin-top:0">Hai una chiave API Gemini?</h3>
        <p class="help">
          Con una chiave API Gemini gratuita (<code>://google.com</code>) l'app legge anche le <b>correzioni scritte a penna</b> (circa 38s se c'è campo, altrimenti passa all'OCR in 1,5s).
        </p>

        <label for="modalInpGeminiKey">Chiave API Gemini (facoltativa)</label>
        <input id="modalInpGeminiKey" type="text" placeholder="Incolla qui la chiave (AIza...)">

        <label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-weight:600;cursor:pointer">
          <input id="modalChkNonChiedere" type="checkbox" style="width:18px;height:18px;margin:0">
          Non chiedermelo più (usa sempre OCR offline)
        </label>

        <div class="actions" style="margin-top:14px">
          <button type="button" class="btn full" id="modalBtnUsaGemini">Salva chiave e leggi con Gemini</button>
          <button type="button" class="outline full" id="modalBtnUsaOffline">Continua senza chiave (OCR offline)</button>
        </div>
      </div>
    `;

    const chiudi = (risultato) => {
      modal.remove();
      resolve(risultato);
    };

    modal.querySelector('.close').onclick = () => chiudi(null);
    modal.addEventListener('click', (e) => { if (e.target === modal) chiudi(null); });

    modal.querySelector('#modalBtnUsaGemini').onclick = () => {
      const key = modal.querySelector('#modalInpGeminiKey').value.trim();
      if (!key) {
        alert('Incolla prima la chiave API oppure premi "Continua senza chiave (OCR offline)".');
        return;
      }
      salvaPreferenzeMotori({ geminiApiKey: key, saltaRichiestaGemini: false });
      if (document.getElementById('v2634MotoriBox')) {
        montaPannelloMotori('v2634MotoriBox');
      }
      chiudi({ apiKey: key, usaOffline: false });
    };

    modal.querySelector('#modalBtnUsaOffline').onclick = () => {
      const nonChiedere = modal.querySelector('#modalChkNonChiedere').checked;
      salvaPreferenzeMotori({ saltaRichiestaGemini: nonChiedere });
      chiudi({ apiKey: '', usaOffline: true });
    };

    document.body.appendChild(modal);
  });
}
function disegnaPannello(container, stato, aperto = false) {
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
      ? 'Su telefono/tablet in offline viene usato Tesseract integrato. Se c\'è campo puoi usare Gemini (ping 1,5s / timeout 55s).'
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

  let testoBtnOllama = '';
  let classeBtnOllama = 'btn';
  if (!isMobile) {
    if (!ollama.raggiungibile || ollama.aggiornaOllamaApp) {
      testoBtnOllama = `Installa Ollama (${REQUISITI_MOTORI.ollamaMinVersion}+) senza digitare`;
    } else if (ollama.aggiornaModello) {
      testoBtnOllama = `Scarica / Aggiorna modello AI (${REQUISITI_MOTORI.ollamaModel})`;
    } else {
      testoBtnOllama = `Reinstalla / Aggiorna modello AI (${REQUISITI_MOTORI.ollamaModel})`;
      classeBtnOllama = 'outline';
    }
  }

  container.innerHTML = `
    <details class="card" style="margin-top:12px" ${aperto ? 'open' : ''}>
      <summary class="head" style="cursor:pointer;list-style:none;user-select:none">
        <b>⚙ Motori lettura distinta ▾</b>
        ${badgeHtml}
      </summary>

      <div style="margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0">
        <p class="help" style="margin:0 0 10px 0">${descrizione}</p>

        <!-- Sezione Chiave API Gemini (Online - INTATTA) -->
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
              <option value="${preferenze.geminiModel || 'gemini-4-hydrogen'}">${preferenze.geminiModel || 'gemini-4-hydrogen'}</option>
            </select>
          </div>
          <small class="help" style="margin-top:6px">Resta salvata solo su questo dispositivo. Chiave gratuita su Google AI Studio (://google.com).</small>
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

        ${!isMobile ? `
          <div style="margin-top:10px">
            <button type="button" class="${classeBtnOllama} full" id="btnAzioneOllama">
              ${testoBtnOllama}
            </button>
            <small id="statoDownloadOllama" class="help" style="display:none;margin-top:6px;font-weight:700;color:var(--g)"></small>
          </div>
        ` : ''}
      </div>
    </details>
  `;

  // --- Eventi Sezione Gemini ---
  const inpKey = container.querySelector('#inpGeminiKey');
  const btnToggle = container.querySelector('#btnToggleKey');
  const btnVerifica = container.querySelector('#btnVerificaGemini');
  const selModel = container.querySelector('#selGeminiModel');
  const boxModel = container.querySelector('#boxModelloGemini');
  const badgeKey = container.querySelector('#badgeGeminiKey');

  btnToggle.onclick = () => {
    inpKey.type = inpKey.type === 'password' ? 'text' : 'password';
  };

  btnVerifica.onclick = async () => {
    const key = inpKey.value.trim();
    if (!key) {
      salvaPreferenzeMotori({ geminiApiKey: '' });
      badgeKey.textContent = 'Non inserita';
      badgeKey.className = 'status';
      boxModel.style.display = 'none';
      return;
    }

    btnVerifica.disabled = true;
    btnVerifica.textContent = 'Verifica...';
    try {
      const modelli = await ottieniModelliDisponibili(key);
      salvaPreferenzeMotori({ geminiApiKey: key, saltaRichiestaGemini: false });
      badgeKey.textContent = 'Chiave verificata ✓';
      badgeKey.className = 'status ok';
      if (Array.isArray(modelli) && modelli.length > 0) {
        selModel.innerHTML = modelli.map(m =>
          `<option value="${m}" ${m === preferenze.geminiModel ? 'selected' : ''}>${m}</option>`
        ).join('');
        salvaPreferenzeMotori({ geminiModel: selModel.value });
      }
      boxModel.style.display = 'block';
    } catch (err) {
      alert(`Chiave non valida o errore di rete: ${err.message}`);
    } finally {
      btnVerifica.disabled = false;
      btnVerifica.textContent = 'Salva e verifica';
    }
  };

  selModel.onchange = () => {
    salvaPreferenzeMotori({ geminiModel: selModel.value });
  };

  // --- Eventi Sezione Offline ---
  const selOffline = container.querySelector('#selModalitaOffline');
  selOffline.onchange = () => {
    salvaPreferenzeMotori({ modalitaOffline: selOffline.value });
    montaPannelloMotori(container, true);
  };

  // --- Evento Pulsante 1-Click Ollama con conferma ---
  const btnOllama = container.querySelector('#btnAzioneOllama');
  const lblProgresso = container.querySelector('#statoDownloadOllama');

  if (btnOllama) {
    btnOllama.onclick = async () => {
      const modelloTarget = REQUISITI_MOTORI.ollamaModel;

      // CASO A: Ollama non installato o versione precedente a ollamaMinVersion
      if (!ollama.raggiungibile || ollama.aggiornaOllamaApp) {
        const info = ottieniInfoInstallerOllama();
        const conferma = confirm(
          `Ollama non risulta attivo o aggiornato (richiesta v${REQUISITI_MOTORI.ollamaMinVersion}+).\n\n` +
          `Vuoi scaricare subito l'installer ufficiale per ${info.os} (${info.file})?\n\n` +
          `Una volta completata l'installazione, torna qui e premi di nuovo questo pulsante per scaricare automaticamente il modello ${modelloTarget}.`
        );
        if (!conferma) return;

        try { await navigator.clipboard.writeText(info.comandoRapido); } catch {}

        const link = document.createElement('a');
        link.href = info.url;
        link.download = info.file;
        document.body.appendChild(link);
        link.click();
        link.remove();

        lblProgresso.style.display = 'block';
        lblProgresso.textContent = `Download di ${info.file} avviato. Dopo l'installazione premi di nuovo il pulsante.`;
        return;
      }

      // CASO B: Ollama è già attivo -> scarica direttamente il modello senza digitare nulla
      const confermaModello = confirm(
        `Confermi il download e l'installazione automatica del modello "${modelloTarget}" su Ollama?\n\n` +
        `L'operazione avverrà in automatico senza digitare comandi.`
      );
      if (!confermaModello) return;

      btnOllama.disabled = true;
      lblProgresso.style.display = 'block';
      lblProgresso.textContent = 'Connessione a Ollama in corso...';

      try {
        await scaricaModelloOllama(modelloTarget, ({ status, percentuale }) => {
          lblProgresso.textContent = percentuale !== null
            ? `${status}: ${percentuale}%`
            : status;
        });
        alert(`Modello ${modelloTarget} installato e pronto!`);
        montaPannelloMotori(container, true);
      } catch (err) {
      	alert(Errore durante il download del modello: ${err.message});
				btnOllama.disabled = false;
			}
		};
	}
}
