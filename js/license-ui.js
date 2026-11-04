'use strict';

function renderLicenseInfo(){

  const type =
    license.type();

  const status =
    license.status();

  const key =
    license.key();

  const box =
    document.getElementById(
      'licenseInfo'
    );

  if(!box){
    return;
  }

  box.innerHTML = `
    <strong>Tipo:</strong>
    ${type}
    <br>

    <strong>Stato:</strong>
    ${status}
    <br>

    <strong>Codice:</strong>
    ${key || '-'}
  `;
}

function activateLicense(){

  const code =
    document.getElementById(
      'licenseCode'
    ).value.trim();

  if(!code){

    alert(
      'Inserire una chiave'
    );

    return;
  }

  /*
   * Temporaneo
   */

  if(
    code.startsWith(
      'RM-PRO-'
    )
  ){

    license.save({

      key:code,

      type:'PRO',

      status:'ATTIVA'

    });

  }else if(
    code.startsWith(
      'RM-SOC-'
    )
  ){

    license.save({

      key:code,

      type:'SOCIETA',

      status:'ATTIVA'

    });

  }else{

    alert(
      'Licenza non valida'
    );

    return;
  }

  renderLicenseInfo();

  alert(
    'Licenza attivata'
  );
}