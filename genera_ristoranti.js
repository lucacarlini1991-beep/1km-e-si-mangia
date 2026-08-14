// =====================================================
// 1 KM E SI MANGIA
// GENERATORE DATABASE RISTORANTI
// =====================================================
//
// INPUT:
//   uscite.json
//
// OUTPUT:
//   ristoranti.json
//
// DATI:
//   OpenStreetMap / Overpass
//
// REGOLA:
//   ristorante entro 2.000 m
//   + 100 m di tolleranza
//   = 2.100 m massimi
// =====================================================


const fs = require("fs");


// =====================================================
// CONFIGURAZIONE
// =====================================================

const CONFIG = {

  fileUscite:
    "./uscite.json",

  fileOutput:
    "./ristoranti.json",

  distanzaRistorante:
    2100,

  distanzaParcheggio:
    300,

  batchUscite:
    20,

  pausaTraRichieste:
    1200,

  timeoutOverpass:
    120

};


// =====================================================
// OVERPASS
// =====================================================

const OVERPASS_URL =
  "https://overpass-api.de/api/interpreter";


// =====================================================
// LETTURA USCITE
// =====================================================

function caricaUscite() {

  console.log(
    "Caricamento uscite.json..."
  );


  const contenuto =
    fs.readFileSync(
      CONFIG.fileUscite,
      "utf8"
    );


  const database =
    JSON.parse(
      contenuto
    );


  if (
    !Array.isArray(database)
  ) {

    throw new Error(
      "uscite.json non contiene un array."
    );

  }


  const uscite =
    database.filter(

      function (uscita) {

        return (

          uscita &&

          typeof uscita.lat ===
            "number" &&

          typeof uscita.lon ===
            "number"

        );

      }

    );


  console.log(
    "Uscite valide:",
    uscite.length
  );


  return uscite;

}


// =====================================================
// PAUSA
// =====================================================

function sleep(ms) {

  return new Promise(

    function (resolve) {

      setTimeout(
        resolve,
        ms
      );

    }

  );

}


// =====================================================
// DISTANZA GPS
// =====================================================

function distanzaMetri(

  lat1,
  lon1,
  lat2,
  lon2

) {

  const R =
    6371000;


  const rad =
    Math.PI / 180;


  const dLat =
    (lat2 - lat1) * rad;


  const dLon =
    (lon2 - lon1) * rad;


  const a =

    Math.sin(
      dLat / 2
    ) ** 2

    +

    Math.cos(
      lat1 * rad
    )

    *

    Math.cos(
      lat2 * rad
    )

    *

    Math.sin(
      dLon / 2
    ) ** 2;


  const c =

    2 *

    Math.atan2(

      Math.sqrt(a),

      Math.sqrt(
        1 - a
      )

    );


  return R * c;

}


// =====================================================
// CENTRO ELEMENTO OSM
// =====================================================

function coordinateElemento(
  elemento
) {

  if (
    typeof elemento.lat ===
      "number" &&
    typeof elemento.lon ===
      "number"
  ) {

    return {

      lat:
        elemento.lat,

      lon:
        elemento.lon

    };

  }


  if (
    elemento.center &&
    typeof elemento.center.lat ===
      "number" &&
    typeof elemento.center.lon ===
      "number"
  ) {

    return {

      lat:
        elemento.center.lat,

      lon:
        elemento.center.lon

    };

  }


  return null;

}


// =====================================================
// CREAZIONE QUERY OVERPASS
// =====================================================

function creaQuery(
  uscite
) {

  let query =

    `[out:json][timeout:${CONFIG.timeoutOverpass}];\n(\n`;


  uscite.forEach(

    function (uscita) {

      const lat =
        uscita.lat;

      const lon =
        uscita.lon;


      // ---------------------------------------------
      // RISTORANTI
      // ---------------------------------------------

      query +=

        `nwr["amenity"="restaurant"](around:${CONFIG.distanzaRistorante},${lat},${lon});\n`;


      // ---------------------------------------------
      // PARCHEGGI
      // ---------------------------------------------

      query +=

        `nwr["amenity"="parking"](around:${CONFIG.distanzaRistorante},${lat},${lon});\n`;

    }

  );


  query +=

    `);\nout center tags;`;


  return query;

}


// =====================================================
// CHIAMATA OVERPASS
// =====================================================

async function interrogaOverpass(
  query
) {

  const response =
    await fetch(
      OVERPASS_URL,
      {

        method:
          "POST",

        headers: {

          "Content-Type":
            "application/x-www-form-urlencoded"

        },

        body:
          "data=" +
          encodeURIComponent(
            query
          )

      }

    );


  if (
    !response.ok
  ) {

    const testo =
      await response.text();


    throw new Error(

      "Overpass HTTP " +
      response.status +
      ": " +
      testo.substring(
        0,
        500
      )

    );

  }


  return response.json();

}


// =====================================================
// CREA CHIAVE UNICA OSM
// =====================================================

function osmKey(
  elemento
) {

  return (

    elemento.type +
    "/" +
    elemento.id

  );

}


// =====================================================
// ESTRAE TAG
// =====================================================

function tag(
  elemento,
  nome
) {

  if (
    !elemento.tags
  ) {

    return null;

  }


  return (
    elemento.tags[nome] ||
    null
  );

}


// =====================================================
// CREA RECORD RISTORANTE
// =====================================================

function creaRistorante(

  elemento,
  uscita

) {

  const coordinate =
    coordinateElemento(
      elemento
    );


  if (!coordinate) {

    return null;

  }


  const tags =
    elemento.tags ||
    {};


  const distanza =
    distanzaMetri(

      coordinate.lat,
      coordinate.lon,

      uscita.lat,
      uscita.lon

    );


  if (
    distanza >
    CONFIG.distanzaRistorante
  ) {

    return null;

  }


  return {

    id:
      "osm-" +
      elemento.type +
      "-" +
      elemento.id,

    osm_id:
      elemento.id,

    osm_type:
      elemento.type,


    nome:
      tags.name ||
      "Ristorante senza nome",


    lat:
      coordinate.lat,

    lon:
      coordinate.lon,


    categoria:
      "ristorante",


    cucina:
      tags.cuisine ||
      "",


    telefono:
      tags.phone ||
      tags["contact:phone"] ||
      "",


    sito:
      tags.website ||
      tags["contact:website"] ||
      "",


    apertura:
      tags.opening_hours ||
      "",


    takeaway:
      tags.takeaway ||
      null,


    delivery:
      tags.delivery ||
      null,


    wheelchair:
      tags.wheelchair ||
      null,


    uscita: {

      id:
        uscita.id ||
        "",

      nome:
        uscita.nome ||
        "",

      autostrada:
        uscita.autostrada ||
        "",

      distanza_m:
        Math.round(
          distanza
        )

    },


    parcheggio: {

      presente:
        null,

      tipo:
        null,

      distanza_m:
        null,

      osm_id:
        null,

      accesso:
        null,

      capacity:
        null

    },


    mezzi_voluminosi: {

      stato:
        "non_verificato",

      hgv:
        null,

      maxheight:
        null,

      maxweight:
        null,

      maxlength:
        null

    },


    area_manovra: {

      stato:
        "non_verificato",

      fonte:
        null

    },


    fonti: [

      "OpenStreetMap"

    ],


    ultima_verifica:
      new Date()
        .toISOString()

  };

}


// =====================================================
// TROVA PARCHEGGIO VICINO
// =====================================================

function associaParcheggio(

  ristorante,
  parcheggi

) {

  let migliore =
    null;


  let distanzaMigliore =
    Infinity;


  parcheggi.forEach(

    function (parcheggio) {

      const coordinate =
        coordinateElemento(
          parcheggio
        );


      if (!coordinate) {

        return;

      }


      const distanza =
        distanzaMetri(

          ristorante.lat,
          ristorante.lon,

          coordinate.lat,
          coordinate.lon

        );


      if (

        distanza <=
        CONFIG.distanzaParcheggio &&

        distanza <
        distanzaMigliore

      ) {

        migliore =
          parcheggio;

        distanzaMigliore =
          distanza;

      }

    }

  );


  if (!migliore) {

    ristorante.parcheggio = {

      presente:
        false,

      tipo:
        null,

      distanza_m:
        null,

      osm_id:
        null,

      accesso:
        null,

      capacity:
        null

    };


    return;

  }


  const tags =
    migliore.tags ||
    {};


  ristorante.parcheggio = {

    presente:
      true,

    tipo:
      tags.parking ||
      null,

    distanza_m:
      Math.round(
        distanzaMigliore
      ),

    osm_id:
      migliore.id,

    accesso:
      tags.access ||
      null,

    capacity:
      tags.capacity ||
      null

  };


  // ---------------------------------------------
  // PRIMA INFORMAZIONE SUI MEZZI
  // ---------------------------------------------

  const hgv =
    tags.hgv ||
    null;


  const maxheight =
    tags.maxheight ||
    tags["maxheight:physical"] ||
    null;


  const maxweight =
    tags.maxweight ||
    null;


  const maxlength =
    tags.maxlength ||
    null;


  if (

    hgv ||

    maxheight ||

    maxweight ||

    maxlength

  ) {

    ristorante.mezzi_voluminosi = {

      stato:
        "dati_osm",

      hgv:
        hgv,

      maxheight:
        maxheight,

      maxweight:
        maxweight,

      maxlength:
        maxlength

    };

  }


  // ---------------------------------------------
  // ACCESSO
  // ---------------------------------------------

  if (
    tags.access
  ) {

    ristorante.area_manovra = {

      stato:
        "da_verificare",

      fonte:
        "OpenStreetMap"

    };

  }

}


// =====================================================
// DEDUPLICAZIONE
// =====================================================

function deduplica(
  ristoranti
) {

  const mappa =
    new Map();


  ristoranti.forEach(

    function (ristorante) {

      const chiave =
        ristorante.osm_type +
        "/" +
        ristorante.osm_id;


      const esistente =
        mappa.get(
          chiave
        );


      if (!esistente) {

        mappa.set(
          chiave,
          ristorante
        );

        return;

      }


      // Mantiene il collegamento
      // all'uscita più vicina.

      if (

        ristorante.uscita.distanza_m <

        esistente.uscita.distanza_m

      ) {

        mappa.set(
          chiave,
          ristorante
        );

      }

    }

  );


  return Array.from(
    mappa.values()
  );

}


// =====================================================
// MAIN
// =====================================================

async function main() {

  console.log(
    "========================================"
  );

  console.log(
    "1 KM E SI MANGIA"
  );

  console.log(
    "GENERATORE DATABASE RISTORANTI"
  );

  console.log(
    "========================================"
  );


  const uscite =
    caricaUscite();


  const tuttiRistoranti =
    [];


  // ---------------------------------------------
  // BATCH
  // ---------------------------------------------

  for (

    let i = 0;

    i < uscite.length;

    i += CONFIG.batchUscite

  ) {

    const batch =
      uscite.slice(

        i,

        i +
        CONFIG.batchUscite

      );


    console.log(
      ""
    );


    console.log(

      "Batch",

      Math.floor(
        i /
        CONFIG.batchUscite
      ) + 1,

      "/",

      Math.ceil(
        uscite.length /
        CONFIG.batchUscite
      ),

      "- uscite",

      i + 1,

      "-",

      Math.min(
        i +
        CONFIG.batchUscite,
        uscite.length
      )

    );


    try {

      const query =
        creaQuery(
          batch
        );


      const dati =
        await interrogaOverpass(
          query
        );


      const elementi =
        dati.elements ||
        [];


      console.log(

        "Elementi OSM ricevuti:",

        elementi.length

      );


      // -----------------------------------------
      // SEPARA RISTORANTI E PARCHEGGI
      // -----------------------------------------

      const ristorantiOSM =
        elementi.filter(

          function (elemento) {

            return (

              elemento.tags &&

              elemento.tags.amenity ===
                "restaurant"

            );

          }

        );


      const parcheggiOSM =
        elementi.filter(

          function (elemento) {

            return (

              elemento.tags &&

              elemento.tags.amenity ===
                "parking"

            );

          }

        );


      // -----------------------------------------
      // CREA RISTORANTI
      // -----------------------------------------

      ristorantiOSM.forEach(

        function (elemento) {

          let uscitaPiuVicino =
            null;


          let distanzaMigliore =
            Infinity;


          batch.forEach(

            function (uscita) {

              const coordinate =
                coordinateElemento(
                  elemento
                );


              if (!coordinate) {

                return;

              }


              const distanza =
                distanzaMetri(

                  coordinate.lat,
                  coordinate.lon,

                  uscita.lat,
                  uscita.lon

                );


              if (

                distanza <=
                CONFIG.distanzaRistorante &&

                distanza <
                distanzaMigliore

              ) {

                uscitaPiuVicino =
                  uscita;

                distanciaMigliore =
                  distanciaSeguro(
                    distancia
                  );

              }

            }

          );


          if (
            !uscitaPiuVicino
          ) {

            return;

          }


          const ristorante =
            creaRistorante(

              elemento,

              uscitaPiuVicino

            );


          if (!ristorante) {

            return;

          }


          associaParcheggio(

            ristorante,

            parcheggiOSM

          );


          tuttiRistoranti.push(
            ristorante
          );

        }

      );


    } catch (errore) {

      console.error(

        "Errore batch:",

        errore.message

      );

    }


    // -----------------------------------------
    // PAUSA
    // -----------------------------------------

    if (
      i +
      CONFIG.batchUscite <
      uscite.length
    ) {

      await sleep(
        CONFIG.pausaTraRichieste
      );

    }

  }


  // =================================================
  // DEDUPLICAZIONE
  // =================================================

  const ristoranti =
    deduplica(
      tuttiRistoranti
    );


  // =================================================
  // ORDINAMENTO
  // =================================================

  ristoranti.sort(

    function (a, b) {

      return (

        a.uscita.distanza_m -

        b.uscita.distanza_m

      );

    }

  );


  // =================================================
  // SCRITTURA FILE
  // =================================================

  fs.writeFileSync(

    CONFIG.fileOutput,

    JSON.stringify(

      ristoranti,

      null,

      2

    ),

    "utf8"

  );


  console.log(
    ""
  );


  console.log(
    "========================================"
  );


  console.log(

    "RISTORANTI TROVATI:",

    ristoranti.length

  );


  console.log(

    "DATABASE SALVATO:",

    CONFIG.fileOutput

  );


  console.log(
    "========================================"
  );

}


// =====================================================
// SICUREZZA NUMERICA
// =====================================================

function distanciaSeguro(
  valore
) {

  if (
    typeof valore !==
    "number"
  ) {

    return Infinity;

  }


  return valore;

}


// =====================================================
// AVVIO
// =====================================================

main()

  .catch(

    function (errore) {

      console.error(
        ""
      );

      console.error(
        "ERRORE FATALE:"
      );

      console.error(
        errore
      );

      process.exit(
        1
      );

    }

  );