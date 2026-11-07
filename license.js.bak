'use strict';

/*
 Rugby Match Manager PRO
 Gestione licenza v0.1
 senza controllo 


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

/* API pubblica 

window.RMMLicense = {
    get: getLicense,
    save: saveLicense,
    show: showLicense,
    activate: activateLicense
};
*/
'use strict';

/*
 Rugby Match Manager PRO
 Gestione licenze v1.0
*/

const LICENSE_KEY = 'rmmLicense';

const LICENSE_SERVER =
    'https://mav-vm.github.io/rugby-license-data/licenses.json';

function defaultLicense() {
    return {
        activated: false,
        hash: '',
        type: 'FREE',
        status: 'inactive',
        activatedAt: null,
        checkedAt: null
    };
}

function getLicense() {
    try {
        return JSON.parse(
            localStorage.getItem(LICENSE_KEY)
        ) || defaultLicense();
    } catch {
        return defaultLicense();
    }
}

function saveLicense(data) {
    localStorage.setItem(
        LICENSE_KEY,
        JSON.stringify(data)
    );
}

async function sha256(text) {
    const msgUint8 =
        new TextEncoder().encode(text);

    const hashBuffer =
        await crypto.subtle.digest(
            'SHA-256',
            msgUint8
        );

    const hashArray =
        Array.from(
            new Uint8Array(hashBuffer)
        );

    return hashArray
        .map(b =>
            b.toString(16)
             .padStart(2, '0')
        )
        .join('');
}

async function fetchLicenses() {

    const response =
        await fetch(
            LICENSE_SERVER,
            {
                cache: 'no-store'
            }
        );

    if (!response.ok) {
        throw new Error(
            'Impossibile contattare il server licenze'
        );
    }

    return response.json();
}

async function activateLicense(code) {

    code = String(code || '')
        .trim()
        .toUpperCase();

    if (!code) {
        alert('Inserire un codice licenza.');
        return;
    }

    try {

        const hash =
            await sha256(code);

        const data =
            await fetchLicenses();

        const match =
            (data.licenses || [])
            .find(
                l =>
                    String(l.hash)
                    .toLowerCase() ===
                    hash.toLowerCase()
            );

        if (!match) {

            alert(
                'Licenza non valida.'
            );

            return;
        }

        if (
            match.status !== 'ACTIVE'
        ) {

            alert(
                'Licenza ' +
                match.status
            );

            return;
        }

        const license = {
            activated: true,
            hash: hash,
            type: match.type || 'PRO',
            status: match.status,
            activatedAt:
                new Date().toISOString(),
            checkedAt:
                new Date().toISOString()
        };

        saveLicense(license);

        alert(
            'Licenza ' +
            license.type +
            ' attivata correttamente.'
        );

        closeLicense();

        if (
            typeof render ===
            'function'
        ) {
            render();
        }

    } catch (err) {

        console.error(err);

        alert(
            'Errore durante la verifica della licenza.'
        );
    }
}

async function validateCurrentLicense() {

    const lic =
        getLicense();

    if (!lic.activated) {
        return false;
    }

    try {

        const data =
            await fetchLicenses();

        const found =
            (data.licenses || [])
            .find(
                l =>
                    l.hash ===
                    lic.hash
            );

        if (!found) {

            saveLicense(
                defaultLicense()
            );

            return false;
        }

        if (
            found.status !==
            'ACTIVE'
        ) {

            saveLicense(
                defaultLicense()
            );

            return false;
        }

        lic.checkedAt =
            new Date().toISOString();

        lic.type =
            found.type;

        lic.status =
            found.status;

        saveLicense(lic);

        return true;

    } catch {

        return true;
    }
}

function deactivateLicense() {

    if (
        !confirm(
            'Disattivare la licenza salvata?'
        )
    ) {
        return;
    }

    saveLicense(
        defaultLicense()
    );

    alert(
        'Licenza rimossa.'
    );

    closeLicense();

    if (
        typeof render ===
        'function'
    ) {
        render();
    }
}

function closeLicense() {
    document
        .querySelector(
            '#licenseModal'
        )
        ?.remove();
}

function getLicenseLabel() {

    const lic =
        getLicense();

    if (
        !lic.activated
    ) {
        return '🔓 FREE';
    }

    if (
        lic.type ===
        'SOCIETA'
    ) {
        return '🏢 SOCIETA';
    }

    return '🔑 PRO';
}

function showLicense() {

    closeLicense();

    const lic =
        getLicense();

    document.body
        .insertAdjacentHTML(
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
            <b>Stato:</b>
            ${getLicenseLabel()}
        </p>

        <p>
            <b>Tipo:</b>
            ${lic.type || 'FREE'}
        </p>

        <label>

            Codice licenza

            <input
                id="licenseCode"
                autocomplete="off"
                placeholder="RMM-PRO-XXXX-XXXX">

        </label>

        <br><br>

        <button
            id="licenseActivate"
            class="btn full">

            ATTIVA LICENZA

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

    document
        .querySelector(
            '#licenseClose'
        ).onclick =
        closeLicense;

    document
        .querySelector(
            '#licenseActivate'
        ).onclick =
        () =>
        activateLicense(
            document
            .querySelector(
                '#licenseCode'
            ).value
        );

    document
        .querySelector(
            '#licenseReset'
        ).onclick =
        deactivateLicense;
}

window.RMMLicense = {

    get: getLicense,

    save: saveLicense,

    show: showLicense,

    activate: activateLicense,

    validate: validateCurrentLicense,

    label: getLicenseLabel
};

validateCurrentLicense();
