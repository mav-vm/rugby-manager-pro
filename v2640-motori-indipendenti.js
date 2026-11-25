/* Mantiene la gestione motori come pannello autonomo nella schermata Partita. */
import { montaPannelloMotori } from './js/scanner/pannelloMotoriUI.js';

const app = document.getElementById('app');
if (app) {
  const montaIndipendente = () => {
    const passoTabellone = app.querySelector('.final-step');
    if (!passoTabellone) return;

    let box = document.getElementById('v2634MotoriBox');
    const creatoOra = !box;
    if (!box) {
      box = document.createElement('div');
      box.id = 'v2634MotoriBox';
    }

    // Il pannello è un fratello dei passi, non un figlio del Passo 3.
    if (box.parentElement !== app || box.nextElementSibling !== passoTabellone) {
      app.insertBefore(box, passoTabellone);
    }

    // La UI originale monta l'host già presente all'avvio. Montiamo qui solo
    // gli host creati dopo un nuovo render della schermata Partita.
    if (creatoOra && !box.dataset.motoriMounting) {
      box.dataset.motoriMounting = 'true';
      montaPannelloMotori(box).catch((error) => {
        delete box.dataset.motoriMounting;
        console.error('Impossibile caricare il pannello motori:', error);
      });
    }
  };

  montaIndipendente();
  new MutationObserver(montaIndipendente).observe(app, { childList: true, subtree: true });
}
