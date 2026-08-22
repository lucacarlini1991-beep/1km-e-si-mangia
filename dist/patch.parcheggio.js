const fs = require("fs");
const { spawnSync } = require("child_process");

const file = "./genera_ristoranti.js";

let codice = fs.readFileSync(
  file,
  "utf8"
);

// =====================================================
// AGGIUNGE LAT/LON AL PARCHEGGIO VUOTO
// =====================================================

const vecchioVuoto = `      osm_id:

        null,


      accesso:
`;

const nuovoVuoto = `      osm_id:

        null,


      lat:

        null,


      lon:

        null,


      accesso:
`;

if (
  codice.includes(vecchioVuoto) &&
  !codice.includes(
    `      lat:

        null,


      lon:`
  )
) {

  codice = codice.replace(
    vecchioVuoto,
    nuovoVuoto
  );

}


// =====================================================
// AGGIUNGE LAT/LON AL PARCHEGGIO TROVATO
// =====================================================

const vecchioTrovato = `    osm_id:
      migliore.id,


    accesso:
      tags.access || null,
`;

const nuovoTrovato = `    osm_id:
      migliore.id,


    lat:
      coordinateElemento(
        migliore
      )?.lat || null,


    lon:
      coordinateElemento(
        migliore
      )?.lon || null,


    accesso:
      tags.access || null,
`;

if (
  codice.includes(vecchioTrovato) &&
  !codice.includes(
    `    lat:
      coordinateElemento(
        migliore`
  )
) {

  codice = codice.replace(
    vecchioTrovato,
    nuovoTrovato
  );

}


// =====================================================
// SALVA
// =====================================================

fs.writeFileSync(
  file,
  codice,
  "utf8"
);

console.log("");
console.log(
  "=========================================="
);
console.log(
  "PATCH PARCHEGGIO COMPLETATO"
);
console.log(
  "=========================================="
);
console.log(
  "Il generatore ora salva latitudine e"
);
console.log(
  "longitudine del parcheggio."
);
console.log("");


// =====================================================
// CONTROLLA CHE LA MODIFICA SIA PRESENTE
// =====================================================

const verificato =
  codice.includes(
    `    lat:
      coordinateElemento(
        migliore`
  ) &&
  codice.includes(
    `    lon:
      coordinateElemento(
        migliore`
  );


if (!verificato) {

  console.error(
    "ERRORE: modifica non trovata."
  );

  process.exit(1);

}


console.log(
  "Verifica OK."
);
console.log(
  "Ora puoi rilanciare genera_ristoranti.js."
);
console.log("");