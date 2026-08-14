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
// FONTE DATI:
//   OpenStreetMap tramite Overpass API
//
// DISTANZA:
//   2.000 m + 100 m di tolleranza
//   = 2.100 m
//
// NOTA:
//   I dati relativi a parcheggio e mezzi voluminosi
//   vengono indicati come verificati / non verificati.
//   Non vengono inventate informazioni.
// =====================================================


const fs = require("fs");


// =====================================================
// CONFIGURAZIONE
// =====================================================

const CONFIG = {

  input: "./uscite.json",

  output: "./ristoranti.json",

  distanzaMassima: 2100,

  distanzaParcheggio: 300,

  batchSize: 20,

  pausaMs: 1200,

  tentativi: 3

};


// =====================================================
// SERVER OVERPASS
// =====================================================

const OVERPASS_SERVERS = [

  "https://overpass-api.de/api/interpreter",

  "https://overpass.private.coffee/api/interpreter",

  "https://maps.mail.ru/osm/tools/overpass/api/interpreter"

];


// =====================================================
// TESTO
// =====================================================

function normalizzaTesto(value) {

  return String(value || "")

    .toLowerCase()

    .normalize("NFD")

    .replace(/[\u0300-\u036f]/g, "")

    .replace(/\s+/g, " ")

    .trim();

}


// =====================================================
// PAUSA
// =====================================================

function sleep(ms) {

  return new Promise(function(resolve) {

    setTimeout(resolve, ms);

  });

}


// =====================================================
// DISTANZA HAVERSINE
// =====================================================

function distanzaMetri(

  lat1,
  lon1,
  lat2,
  lon2

) {

  const R = 6371000;

  const rad = Math.PI / 180;

  const dLat =
    (lat2 - lat1) * rad;

  const dLon =
    (lon2 - lon1) * rad;

  const a =

    Math.sin(dLat / 2) *
    Math.sin(dLat / 2)

    +

    Math.cos(lat1 * rad) *
    Math.cos(lat2 * rad) *

    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c =

    2 *

    Math.atan2(

      Math.sqrt(a),

      Math.sqrt(1 - a)

    );

  return R * c;

}


// =====================================================
// COORDINATE ELEMENTO OSM
// =====================================================

function coordinateElemento(elemento) {

  if (

    typeof elemento.lat === "number" &&

    typeof elemento.lon === "number"

  ) {

    return {

      lat: elemento.lat,

      lon: elemento.lon

    };

  }


  if (

    elemento.center &&

    typeof elemento.center.lat === "number" &&

    typeof elemento.center.lon === "number"

  ) {

    return {

      lat: elemento.center.lat,

      lon: elemento.center.lon

    };

  }


  return null;

}


// =====================================================
// LETTURA USCITE
// =====================================================

function caricaUscite() {

  const testo =

    fs.readFileSync(

      CONFIG.input,

      "utf8"

    );


  const database =

    JSON.parse(testo);


  if (!Array.isArray(database)) {

    throw new Error(
      "uscite.json deve contenere un array."
    );

  }


  const uscite =

    database.filter(function(uscita) {

      return (

        uscita &&

        typeof uscita.lat === "number" &&

        typeof uscita.lon === "number"

      );

    });


  console.log(
    "Uscite valide:",
    uscite.length
  );


  return uscite;

}


// =====================================================
// COSTRUZIONE QUERY OVERPASS
// =====================================================

function creaQuery(uscite) {

  let query =

    "[out:json][timeout:180];\n(\n";


  uscite.forEach(function(uscita) {

    const lat = uscita.lat;

    const lon = uscita.lon;


    // -----------------------------------------------
    // RISTORANTI
    // -----------------------------------------------

    query +=

      `nwr["amenity"="restaurant"]["name"](around:2100,${lat},${lon});\n`;


    // -----------------------------------------------
    // PARCHEGGI
    // -----------------------------------------------

    query +=

      `nwr["amenity"="parking"](around:2100,${lat},${lon});\n`;


    // -----------------------------------------------
    // INGRESSI PARCHEGGIO
    // -----------------------------------------------

    query +=

      `nwr["amenity"="parking_entrance"](around:2100,${lat},${lon});\n`;

  });


  query +=

    ");\n";

  query +=

    "out center tags;";


  return query;

}


// =====================================================
// RICHIESTA OVERPASS
// =====================================================

async function richiestaOverpass(query) {

  let ultimoErrore = null;


  for (

    let tentativo = 0;

    tentativo < CONFIG.tentativi;

    tentativo++

  ) {

    for (

      let i = 0;

      i < OVERPASS_SERVERS.length;

      i++

    ) {

      const server =
        OVERPASS_SERVERS[i];


      try {

        console.log(
          "Overpass:",
          server
        );


        const controller =
          new AbortController();


        const timeout =
          setTimeout(

            function() {

              controller.abort();

            },

            180000

          );


        const response =

          await fetch(

            server,

            {

              method: "POST",

              headers: {

                "Content-Type":
                  "application/x-www-form-urlencoded",

                "User-Agent":
                  "1KMESIMANGIA/1.0"

              },

              body:

                "data=" +

                encodeURIComponent(
                  query
                ),

              signal:
                controller.signal

            }

          );


        clearTimeout(timeout);


        if (!response.ok) {

          throw new Error(

            "HTTP " +
            response.status

          );

        }


        const json =
          await response.json();


        return json;

      }

      catch (errore) {

        ultimoErrore =
          errore;

        console.warn(

          "Server Overpass non disponibile:",

          server,

          errore.message

        );

      }

    }


    await sleep(
      3000 *
      (tentativo + 1)
    );

  }


  throw ultimoErrore;

}


// =====================================================
// CONTROLLA SE È UN'AREA DI SERVIZIO
// =====================================================

function eAreaDiServizio(tags) {

  if (!tags) {

    return false;

  }


  const testo = normalizzaTesto(

    [

      tags.name,

      tags.operator,

      tags.description,

      tags.amenity,

      tags.shop

    ]

      .filter(Boolean)

      .join(" ")

  );


  const parole = [

    "area di servizio",

    "area servizio",

    "area di sosta",

    "area sosta",

    "autogrill",

    "service area",

    "service station",

    "rest area",

    "truck stop"

  ];


  return parole.some(function(parola) {

    return testo.includes(parola);

  });

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
    elemento.tags || {};


  if (
    eAreaDiServizio(tags)
  ) {

    return null;

  }


  const distanza =

    distanzaMetri(

      coordinate.lat,

      coordinate.lon,

      uscita.lat,

      uscita.lon

    );


  if (

    distanza >

    CONFIG.distanzaMassima

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

      tags.name || "",


    lat:

      coordinate.lat,


    lon:

      coordinate.lon,


    categoria:

      "ristorante",


    cucina:

      tags.cuisine || "",


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

        uscita.id || "",


      nome:

        uscita.nome || "",


      autostrada:

        uscita.autostrada || "",


      distanza_m:

        Math.round(distanza)

    },


    parcheggio: {

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

      new Date().toISOString()

  };

}


// =====================================================
// ASSOCIA PARCHEGGIO
// =====================================================

function associaParcheggio(

  ristorante,

  parcheggi

) {

  let migliore = null;

  let distanzaMigliore =
    Infinity;


  parcheggi.forEach(function(parcheggio) {

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

      distanciaValida(
        distanciaSeguro(distanza)
      ) &&

      distanciaSeguro(distanza) <
      distanciaSeguro(distanzaMigliore)

    ) {

      migliore =
        parcheggio;

      distanzaMigliore =
        distanza;

    }

  });


  if (!migliore) {

    return;

  }


  const tags =
    migliore.tags || {};


  ristorante.parcheggio = {

    presente:
      true,


    tipo:
      tags.parking || null,


    distanza_m:
      Math.round(
        distanzaMigliore
      ),


    osm_id:
      migliore.id,


    accesso:
      tags.access || null,


    capacity:
      tags.capacity || null

  };


  // -----------------------------------------------
  // LIMITAZIONI MEZZI
  // -----------------------------------------------

  const hgv =
    tags.hgv || null;


  const maxheight =

    tags.maxheight ||

    tags["maxheight:physical"] ||

    null;


  const maxweight =
    tags.maxweight || null;


  const maxlength =
    tags.maxlength || null;


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


  // -----------------------------------------------
  // ACCESSO
  // -----------------------------------------------

  if (tags.access) {

    ristorante.area_manovra = {

      stato:
        "da_verificare",


      fonte:
        "OpenStreetMap"

    };

  }

}


// =====================================================
// FUNZIONI DI SICUREZZA NUMERICA
// =====================================================

function distanciaSeguro(valore) {

  return typeof valore === "number"
    ? valore
    : Infinity;

}


function distanciaValida(valore) {

  return Number.isFinite(valore);

}


// =====================================================
// DEDUPLICAZIONE
// =====================================================

function deduplica(ristoranti) {

  const mappa =
    new Map();


  ristoranti.forEach(function(ristorante) {

    const chiave =

      ristorante.osm_type +

      "/" +

      ristorante.osm_id;


    const precedente =
      mappa.get(chiave);


    if (!precedente) {

      mappa.set(
        chiave,
        ristorante
      );

      return;

    }


    // Mantieni il collegamento
    // all'uscita più vicina.

    if (

      ristorante.uscita.distanza_m <

      precedente.uscita.distanza_m

    ) {

      mappa.set(
        chiave,
        ristorante
      );

    }

  });


  return Array.from(
    mappa.values()
  );

}


// =====================================================
// MAIN
// =====================================================

async function main() {

  console.log(
    ""
  );


  console.log(
    "=========================================="
  );


  console.log(
    "1 KM E SI MANGIA"
  );


  console.log(
    "GENERATORE DATABASE RISTORANTI"
  );


  console.log(
    "=========================================="
  );


  console.log(
    "Distanza massima:",
    CONFIG.distanzaMassima,
    "m"
  );


  const uscite =
    caricaUscite();


  const risultati = [];


  // =================================================
  // BATCH
  // =================================================

  for (

    let i = 0;

    i < uscite.length;

    i += CONFIG.batchSize

  ) {

    const batch =

      uscite.slice(

        i,

        i +
        CONFIG.batchSize

      );


    console.log(
      ""
    );


    console.log(

      "BATCH",

      Math.floor(
        i /
        CONFIG.batchSize
      ) + 1,

      "/",

      Math.ceil(
        uscite.length /
        CONFIG.batchSize
      )

    );


    try {

      const query =
        creaQuery(
          batch
        );


      const dati =
        await richiestaOverpass(
          query
        );


      const elementi =
        dati.elements || [];


      console.log(

        "Elementi ricevuti:",

        elementi.length

      );


      const ristorantiOSM =

        elementi.filter(function(elemento) {

          return (

            elemento.tags &&

            elemento.tags.amenity ===
              "restaurant" &&

            elemento.tags.name

          );

        });


      const parcheggiOSM =

        elementi.filter(function(elemento) {

          return (

            elemento.tags &&

            (

              elemento.tags.amenity ===
                "parking" ||

              elemento.tags.amenity ===
                "parking_entrance"

            )

          );

        });


      console.log(

        "Ristoranti:",

        ristorantiOSM.length

      );


      console.log(

        "Parcheggi:",

        parcheggiOSM.length

      );


      // -------------------------------------------
      // RISTORANTI
      // -------------------------------------------

      ristorantiOSM.forEach(function(elemento) {

        const coordinate =

          coordinateElemento(
            elemento
          );


        if (!coordinate) {

          return;

        }


        let uscitaPiuVicino =
          null;


        let distanzaPiuVicino =
          Infinity;


        batch.forEach(function(uscita) {

          const distanza =

            distanzaMetri(

              coordinate.lat,

              coordinate.lon,

              uscita.lat,

              uscita.lon

            );


          if (

            distanza <=
            CONFIG.distanzaMassima &&

            distanza <
            distanzaPiuVicino

          ) {

            uscitaPiuVicino =
              uscita;

            distanzaPiuVicino =
              distanza;

          }

        });


        if (!uscitaPiuVicino) {

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


        risultati.push(
          ristorante
        );

      });


    }

    catch (errore) {

      console.error(

        "ERRORE BATCH:",

        errore.message

      );

    }


    // ---------------------------------------------
    // PAUSA
    // ---------------------------------------------

    if (

      i +
      CONFIG.batchSize <
      uscite.length

    ) {

      await sleep(
        CONFIG.pausaMs
      );

    }

  }


  // =================================================
  // DEDUPLICA
  // =================================================

  const databaseFinale =

    deduplica(
      risultati
    );


  // =================================================
  // ORDINA PER DISTANZA
  // =================================================

  databaseFinale.sort(function(a, b) {

    return (

      a.uscita.distanza_m -

      b.uscita.distanza_m

    );

  });


  // =================================================
  // SCRIVI JSON
  // =================================================

  fs.writeFileSync(

    CONFIG.output,

    JSON.stringify(

      databaseFinale,

      null,

      2

    ),

    "utf8"

  );


  // =================================================
  // STATISTICHE
  // =================================================

  const conParcheggio =

    databaseFinale.filter(function(r) {

      return (
        r.parcheggio.presente === true
      );

    }).length;


  const conDatiMezzi =

    databaseFinale.filter(function(r) {

      return (

        r.mezzi_voluminosi.stato ===
        "dati_osm"

      );

    }).length;


  console.log(
    ""
  );


  console.log(
    "=========================================="
  );


  console.log(

    "DATABASE COMPLETATO"

  );


  console.log(

    "Ristoranti totali:",

    databaseFinale.length

  );


  console.log(

    "Con parcheggio OSM:",

    conParcheggio

  );


  console.log(

    "Con dati mezzi OSM:",

    conDatiMezzi

  );


  console.log(

    "File:",

    CONFIG.output

  );


  console.log(
    "=========================================="
  );

}


// =====================================================
// AVVIO
// =====================================================

main()

  .catch(function(error) {

    console.error(
      ""
    );


    console.error(
      "ERRORE FATALE:"
    );


    console.error(
      error
    );


    process.exit(1);

  });