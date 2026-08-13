const fs = require("fs");

const INPUT = "./export.geojson";
const OUTPUT = "./uscite.json";

console.log("📂 Lettura database OSM...");

const geojson = JSON.parse(
  fs.readFileSync(INPUT, "utf8")
);

const features = geojson.features || [];

console.log(`📊 Elementi trovati: ${features.length}`);


// =====================================================
// 1. PRENDIAMO LE USCITE
// =====================================================

const uscite = features.filter(feature => {

  return (
    feature.geometry &&
    feature.geometry.type === "Point" &&
    feature.properties &&
    feature.properties.highway === "motorway_junction"
  );

});

console.log(`🟠 Uscite trovate: ${uscite.length}`);


// =====================================================
// 2. PRENDIAMO LE AUTOSTRADE
// =====================================================

const autostrade = features.filter(feature => {

  return (
    feature.geometry &&
    feature.geometry.type === "LineString" &&
    feature.properties &&
    feature.properties.highway === "motorway"
  );

});

console.log(`🛣️ Autostrade trovate: ${autostrade.length}`);


// =====================================================
// FUNZIONE DISTANZA TRA DUE PUNTI
// =====================================================

function distanzaKm(lat1, lon1, lat2, lon2) {

  const R = 6371;

  const dLat =
    (lat2 - lat1) * Math.PI / 180;

  const dLon =
    (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  const c =
    2 * Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;

}


// =====================================================
// 3. TROVA L'AUTOSTRADA PIÙ VICINA
// =====================================================

function trovaAutostrada(lat, lon) {

  let migliore = null;

  let distanzaMinima = Infinity;


  for (const strada of autostrade) {

    const coordinates =
      strada.geometry.coordinates || [];


    const tags =
      strada.properties || {};


    const ref =
      tags.ref || "";


    const name =
      tags.name || "";


    // -----------------------------------------------
    // Controllo veloce del bounding box
    // -----------------------------------------------

    let vicino = false;


    for (const punto of coordinates) {

      const distanza =
        distanzaKm(
          lat,
          lon,
          punto[1],
          punto[0]
        );


      if (distanza <= 0.25) {

        vicino = true;
        break;

      }

    }


    if (!vicino) {

      continue;

    }


    // -----------------------------------------------
    // Calcolo distanza reale dai vertici
    // -----------------------------------------------

    for (const punto of coordinates) {

      const distanza =
        distanzaKm(
          lat,
          lon,
          punto[1],
          punto[0]
        );


      if (distanza < distanzaMinima) {

        distanzaMinima = distanza;


        migliore = {

          ref: ref,

          name: name,

          distanzaKm:
            Number(distanza.toFixed(3))

        };

      }

    }

  }


  return migliore;

}


// =====================================================
// 4. COSTRUZIONE DATABASE
// =====================================================

const database = [];


// Usiamo l'ID OSM per evitare duplicazioni esatte

const idUsati = new Set();


for (const feature of uscite) {

  const properties =
    feature.properties || {};


  const id =
    properties["@id"] ||
    feature.id ||
    `junction-${database.length}`;


  if (idUsati.has(id)) {

    continue;

  }


  idUsati.add(id);


  const coordinates =
    feature.geometry.coordinates;


  const lon =
    coordinates[0];


  const lat =
    coordinates[1];


  const nome =
    properties.name ||
    "Uscita senza nome";


  console.log(
    `🔎 ${nome}`
  );


  const autostrada =
    trovaAutostrada(lat, lon);


  database.push({

    id: id,

    nome: nome,

    autostrada: autostrada
      ? autostrada.ref
      : null,

    nomeAutostrada: autostrada
      ? autostrada.name
      : null,

    lat: lat,

    lon: lon,

    distanzaAutostradaKm:
      autostrada
        ? autostrada.distanzaKm
        : null,

    osm: {

      highway:
        properties.highway,

      osmId:
        properties["@id"] ||
        feature.id,

      tags:
        properties

    }

  });

}


// =====================================================
// 5. ORDINAMENTO
// =====================================================

database.sort(

  (a, b) => {

    const autostradaA =
      a.autostrada || "ZZZ";

    const autostradaB =
      b.autostrada || "ZZZ";

    if (autostradaA !== autostradaB) {

      return autostradaA.localeCompare(
        autostradaB
      );

    }

    return a.nome.localeCompare(
      b.nome
    );

  }

);


// =====================================================
// 6. SALVATAGGIO
// =====================================================

fs.writeFileSync(

  OUTPUT,

  JSON.stringify(
    database,
    null,
    2
  ),

  "utf8"

);


console.log("");
console.log("================================");
console.log("✅ DATABASE CREATO");
console.log("================================");
console.log(
  `🟠 Uscite: ${database.length}`
);
console.log(
  `📄 File: ${OUTPUT}`
);
console.log("================================");