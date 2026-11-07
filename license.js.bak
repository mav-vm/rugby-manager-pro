'use strict';

/*
 Rugby Match Manager PRO
 Gestione licenza v0.1
*/

const LICENSE_KEY = 'rmmLicense';

function getLicense() {
    try {
        return JSON.parse(
            localStorage.getItem(LICENSE_KEY)
        ) || defaultLicense();
    } catch {
        return defaultLicense();
    }
}

function defaultLicense() {
    return {
        key: '',
        type: 'FREE',
        status: 'inactive',
        activatedAt: null
    };
}

function saveLicense(data) {
    localStorage.setItem(
        LICENSE_KEY,
        JSON.stringify(data)
    );
}

function activateLicense(code) {

    code = String(code || '').trim().toUpperCase();

    if (!code) {
        alert('Inserire un codice licenza.');
        return;
    }

    let type = 'PRO';

    if (code.startsWith('RMM-SOC-')) {
        type = 'SOCIETA';
    }

    saveLicense({
        key: code,
        type,
        status: 'active',
        activatedAt: new Date().toISOString()
    });

    alert('Licenza attivata.');

    closeLicense();
}

function deactivateLicense() {

    if (!confirm('Disattivare la licenza salvata?')) {
        return;
    }

    saveLicense(defaultLicense());

    alert('Licenza rimossa.');

    closeLicense();
}

function closeLicense() {
    document.querySelector('#licenseModal')?.remove();
}

function showLicense() {

    closeLicense();

    const lic = getLicense();

    document.body.insertAdjacentHTML(
        'beforeend',
        `
        <div class="modal" id="licenseModal">
            <div class="modalbox">

                <button
                    class="close"
                    id="licenseClose">
                    ✕
                </button>

                <h2>Gestione Licenza</h2>

                <p>
                    <b>Tipo:</b>
                    ${lic.type}
                </p>

                <p>
                    <b>Stato:</b>
                    ${lic.status}
                </p>

                <p>
                    <b>Codice:</b>
                    ${lic.key || 'Nessuno'}
                </p>

                <label>
                    Codice licenza
                    <input
                        id="licenseCode"
                        placeholder="RMM-PRO-XXXX-XXXX"
                        value="${lic.key || ''}">
                </label>

                <br><br>

                <button
                    id="licenseActivate"
                    class="btn full">
                    ATTIVA
                </button>

                <br>

                <button
                    id="licenseReset"
                    class="outline full">
                    RIMUOVI LICENZA
                </button>

            </div>
        </div>
        `
    );

    document.querySelector('#licenseClose').onclick =
        closeLicense;

    document.querySelector('#licenseActivate').onclick =
        () => activateLicense(
            document.querySelector('#licenseCode').value
        );

    document.querySelector('#licenseReset').onclick =
        deactivateLicense;
}

/* API pubblica */

window.RMMLicense = {
    get: getLicense,
    save: saveLicense,
    show: showLicense,
    activate: activateLicense
};