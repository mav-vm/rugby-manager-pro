/**
 * Motore 3: OCR offline puro nel browser tramite Tesseract.js (funziona anche su smartphone/tablet).
 */

import { normalizzaListaModB } from './configModB.js';

function caricaScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => resolve(window.Tesseract);
    script.onerror = () => reject(new Error('Errore caricamento locale: ' + url));
    document.head.appendChild(script);
  });
}

async function esisteFile(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function verificaTesseractLocale() {
  if (typeof window.Tesseract !== 'undefined') return true;
  return (await esisteFile('./tesseract.min.js')) || (await esisteFile('./tesseract/tesseract.min.js'));
}

export async function assicuraTesseract() {
  if (typeof window.Tesseract !== 'undefined') return window.Tesseract;
  if (await esisteFile('./tesseract.min.js')) return await caricaScript('./tesseract.min.js');
  return await caricaScript('./tesseract/tesseract.min.js');
}

function preparaStrisciaOCR(sourceCanvas, xPct, wPct) {
  const margine = wPct * 0.04;
  const sx = Math.max(0, Math.round(sourceCanvas.width * (xPct + margine)));
  const sw = Math.max(10, Math.round(sourceCanvas.width * (wPct - margine * 2)));
  const sh = sourceCanvas.height;

  const scala = 1.5;
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = Math.round(sw * scala);
  tempCanvas.height = Math.round(sh * scala);

  const ctx = tempCanvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  ctx.filter = 'grayscale(100%) contrast(180%) brightness(115%)';
  ctx.drawImage(sourceCanvas, sx, 0, sw, sh, 0, 0, tempCanvas.width, tempCanvas.height);
  return tempCanvas;
}

function combinaColonneModB(testoMaglie, testoNomi) {
  const righeNomi = testoNomi.split('\n')
    .map(r => r.toUpperCase().replace(/^[IL|1]\s+/, '').replace(/\s+[IL|1]$/, '').replace(/\s+/g, ' ').trim())
    .filter(r => r.length >= 4 && !r.includes('COGNOME') && !r.includes('PANCHINA') && !r.includes('GIOCATORI') && !r.includes('SOSTITUZIONI') && !r.includes('ALLENATORE'));

  const numeriMaglia = testoMaglie.split('\n')
    .map(r => r.replace(/\D/g, '').trim())
    .filter(n => n.length >= 1 && n.length <= 2);

  const ruoliFissi = ['E', 'AD', 'CS', 'CD', 'AS', 'MA', 'MM', '3C', '3S', '3D', '2S', '2D', 'PD', 'T', 'PS'];
  const maglieFisse = ['15', '14', '13', '12', '11', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1'];

  const giocatori = righeNomi.map((nome, idx) => {
    const isTitolare = idx < 15;
    return {
      maglia: numeriMaglia.at(idx) || (isTitolare ? maglieFisse.at(idx) : String(16 + (idx - 15))),
      ruolo: isTitolare ? ruoliFissi.at(idx) : 'RI',
      cognome_nome: nome
    };
  });

  return normalizzaListaModB(giocatori);
}

export async function estraiConTesseractOffline(canvasElement, onStatusUpdate) {
  onStatusUpdate('Avvio OCR a colonne isolate...');
  const TesseractLib = await assicuraTesseract();

  const colMagliaPct = (parseInt(document.getElementById('rangeColMaglia')?.value, 10) || 12) / 100;
  const colRuoloPct = (parseInt(document.getElementById('rangeColRuolo')?.value, 10) || 9) / 100;
  const colNomeStart = colMagliaPct + colRuoloPct;

  const canvasNomi = preparaStrisciaOCR(canvasElement, colNomeStart, 1 - colNomeStart);
  const canvasMaglie = preparaStrisciaOCR(canvasElement, 0, colMagliaPct);

  const hasSubfolder = await esisteFile('./tesseract/worker.min.js');
  const workerOpts = {
    logger: m => {
      if (m.status === 'recognizing text') {
        onStatusUpdate(`Lettura OCR colonne: ${Math.round(m.progress * 100)}%`);
      }
    }
  };
  if (hasSubfolder) {
    workerOpts.workerPath = './tesseract/worker.min.js';
    workerOpts.corePath = './tesseract/tesseract-core.wasm.js';
    workerOpts.langPath = './tesseract';
    workerOpts.gzip = false;
  }

  const worker = await TesseractLib.createWorker('ita', 1, workerOpts);

  await worker.setParameters({ tessedit_pageseg_mode: '6', tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ¿»…Ã“Ÿ'.,()- " });
  const resNomi = await worker.recognize(canvasNomi);

  await worker.setParameters({ tessedit_pageseg_mode: '6', tessedit_char_whitelist: '0123456789' });
  const resMaglie = await worker.recognize(canvasMaglie);

  await worker.terminate();
  return combinaColonneModB(resMaglie.data.text, resNomi.data.text);
}