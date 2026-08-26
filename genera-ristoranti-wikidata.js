// =====================================================
// 1 KM E SI MANGIA
// SECONDA FONTE RISTORANTI - WIKIDATA
// =====================================================
//
// Wikidata viene usato come fonte aggiuntiva e non sostituisce
// OpenStreetMap. I record trovati entro 2,1 km da un'uscita
// vengono salvati in ristoranti-wikidata.json e poi aggiunti
// a ristoranti.json se non risultano già presenti in OSM.
//
// Wikidata è un database aperto/CC0 e dispone di coordinate
// geografiche interrogabili tramite il servizio SPARQL.
// =====================================================

const fs = require("fs");

const INPUT_USCITE = "./uscite.json";
const INPUT_OSM = "./ristoranti.json";
const OUTPUT_WIKIDATA = "./ristoranti-wikidata.json";
const OUTPUT_MERGED = "./ristoranti.json";
const MAX_DISTANCE_METERS = 2100;
const DEDUPE_DISTANCE_METERS = 120;
const ENDPOINT = "https://query.wikidata.org/sparql";

const USER_AGENT =
  "1KM-E-SI-MANGIA/1.0 (https://1km-e-si-mangia.it; database enrichment)";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function numero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizza(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function distanzaMetri(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function caricaJson(path) {
  if (!fs.existsSync(path)) return [];
  const value = JSON.parse(fs.readFileSync(path, "utf8"));
  return Array.isArray(value) ? value : [];
}

function trovaUscitaPiuVicino(lat, lon, uscite) {
  let migliore = null;
  let distanzaMigliore = Infinity;

  for (const uscita of uscite) {
    const d = distanzaMetri(lat, lon, uscita.lat, uscita.lon);
    if (d < distanzaMigliore) {
      distanzaMigliore = d;
      migliore = uscita;
    }
  }

  if (!migliore || distanzaMigliore > MAX_DISTANCE_METERS) return null;
  return { uscita: migliore, distanza: distanzaMigliore };
}

function costruisciQuery(uscite) {
  const validi = uscite.filter(u => Number.isFinite(Number(u.lat)) && Number.isFinite(Number(u.lon)));
  if (!validi.length) throw new Error("Nessuna uscita valida.");

  const minLat = Math.min(...validi.map(u => Number(u.lat))) - 0.05;
  const maxLat = Math.max(...validi.map(u => Number(u.lat))) + 0.05;
  const minLon = Math.min(...validi.map(u => Number(u.lon))) - 0.08;
  const maxLon = Math.max(...validi.map(u => Number(u.lon))) + 0.08;

  // wikibase:box restringe prima la ricerca geografica; il filtro
  // preciso a 2,1 km viene poi eseguito localmente in JavaScript.
  return `
SELECT ?item ?itemLabel ?coord ?website ?phone WHERE {
  SERVICE wikibase:box {
    ?item wdt:P625 ?coord .
    bd:serviceParam wikibase:cornerWest "Point(${minLon} ${minLat})"^^geo:wktLiteral .
    bd:serviceParam wikibase:cornerEast "Point(${maxLon} ${maxLat})"^^geo:wktLiteral .
  }

  ?item wdt:P31/wdt:P279* wd:Q11707 .

  OPTIONAL { ?item wdt:P856 ?website . }
  OPTIONAL { ?item wdt:P1329 ?phone . }

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "it,en" .
  }
}
LIMIT 30000
`;
}

async function scaricaWikidata(query) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);

  try {
    const response = await fetch(`${ENDPOINT}?query=${encodeURIComponent(query)}&format=json`, {
      method: "GET",
      headers: {
        Accept: "application/sparql-results+json",
        "User-Agent": USER_AGENT
      },
      signal: controller.signal
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Wikidata HTTP ${response.status}: ${text.slice(0, 300)}`);
    }

    const json = JSON.parse(text);
    return Array.isArray(json?.results?.bindings) ? json.results.bindings : [];
  } finally {
    clearTimeout(timeout);
  }
}

function estraiCoordinata(wkt) {
  const match = String(wkt || "").match(/Point\\(([-0-9.]+)\\s+([-0-9.]+)\\)/i);
  if (!match) return null;
  const lon = numero(match[1]);
  const lat = numero(match[2]);
  if (lat === null || lon === null) return null;
  return { lat, lon };
}

function creaRecord(binding, uscita, distanza) {
  const qid = String(binding?.item?.value || "").split("/").pop();
  const coord = estraiCoordinata(binding?.coord?.value);
  if (!qid || !coord || !uscita) return null;

  return {
    id: `wikidata-${qid}`,
    osm_id: null,
    osm_type: null,
    wikidata_id: qid,
    nome: binding?.itemLabel?.value || "",
    lat: coord.lat,
    lon: coord.lon,
    categoria: "ristorante",
    cucina: "",
    telefono: binding?.phone?.value || "",
    sito: binding?.website?.value || "",
    apertura: "",
    takeaway: null,
    delivery: null,
    wheelchair: null,
    uscita: {
      id: uscita.id || "",
      nome: uscita.nome || "",
      autostrada: uscita.autostrada || "",
      distanza_m: Math.round(distanza)
    },
    parcheggio: {
      presente: false,
      tipo: null,
      distanza_m: null,
      osm_id: null,
      lat: null,
      lon: null,
      accesso: null,
      capacity: null
    },
    mezzi_voluminosi: {
      stato: "non_verificato",
      hgv: null,
      maxheight: null,
      maxweight: null,
      maxlength: null
    },
    area_manovra: {
      stato: "non_verificato",
      fonte: null
    },
    fonti: ["Wikidata"],
    ultima_verifica: new Date().toISOString()
  };
}

function eDuplicato(record, esistenti) {
  const nome = normalizza(record.nome);

  return esistenti.some(existing => {
    const sameId = record.wikidata_id && existing.wikidata_id === record.wikidata_id;
    if (sameId) return true;

    const d = distanzaMetri(
      record.lat,
      record.lon,
      Number(existing.lat),
      Number(existing.lon)
    );

    if (d > DEDUPE_DISTANCE_METERS) return false;

    const nomeEsistente = normalizza(existing.nome);
    if (nome && nomeEsistente && (nome === nomeEsistente || nome.includes(nomeEsistente) || nomeEsistente.includes(nome))) {
      return true;
    }

    const sitoA = normalizza(record.sito);
    const sitoB = normalizza(existing.sito);
    return Boolean(sitoA && sitoB && sitoA === sitoB);
  });
}

async function main() {
  const uscite = caricaJson(INPUT_USCITE);
  const osm = caricaJson(INPUT_OSM);

  if (!uscite.length) throw new Error("uscite.json vuoto o non disponibile.");

  console.log(`🚗 Uscite disponibili: ${uscite.length}`);
  console.log("🌐 Interrogo Wikidata come seconda fonte aperta...");

  const query = costruisciQuery(uscite);
  let bindings;

  try {
    bindings = await scaricaWikidata(query);
  } catch (error) {
    console.warn("⚠️ Wikidata non disponibile: mantengo il database OSM senza modifiche.");
    console.warn(error.message);
    fs.writeFileSync(OUTPUT_WIKIDATA, "[]\n", "utf8");
    return;
  }

  console.log(`📚 Record Wikidata ricevuti: ${bindings.length}`);

  const candidati = new Map();

  for (const binding of bindings) {
    const coord = estraiCoordinata(binding?.coord?.value);
    if (!coord) continue;

    const vicino = trovaUscitaPiuVicino(coord.lat, coord.lon, uscite);
    if (!vicino) continue;

    const record = creaRecord(binding, vicino.uscita, vicino.distanza);
    if (!record || !record.nome.trim()) continue;

    const key = record.wikidata_id;
    if (!candidati.has(key) || record.uscita.distanza_m < candidati.get(key).uscita.distanza_m) {
      candidati.set(key, record);
    }
  }

  const secondDatabase = Array.from(candidati.values()).sort(
    (a, b) => a.uscita.distanza_m - b.uscita.distanza_m || a.nome.localeCompare(b.nome, "it")
  );

  fs.writeFileSync(
    OUTPUT_WIKIDATA,
    JSON.stringify(secondDatabase, null, 2) + "\n",
    "utf8"
  );

  const merged = [...osm];
  let aggiunti = 0;

  for (const record of secondDatabase) {
    if (eDuplicato(record, merged)) continue;
    merged.push(record);
    aggiunti++;
  }

  merged.sort((a, b) =>
    String(a.uscita?.autostrada || "ZZZ").localeCompare(String(b.uscita?.autostrada || "ZZZ"), "it") ||
    String(a.uscita?.nome || "").localeCompare(String(b.uscita?.nome || ""), "it") ||
    Number(a.uscita?.distanza_m || 0) - Number(b.uscita?.distanza_m || 0)
  );

  fs.writeFileSync(
    OUTPUT_MERGED,
    JSON.stringify(merged, null, 2) + "\n",
    "utf8"
  );

  console.log(`✅ Secondo database: ${secondDatabase.length} ristoranti Wikidata entro 2,1 km.`);
  console.log(`➕ Nuovi ristoranti aggiunti al database principale: ${aggiunti}`);
  console.log(`📦 Database finale: ${merged.length} ristoranti.`);

  await sleep(100);
}

main().catch(error => {
  console.error("❌ Arricchimento Wikidata fallito:", error);
  process.exit(1);
});
