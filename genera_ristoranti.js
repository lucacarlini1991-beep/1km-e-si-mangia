// Generatore database ristoranti OSM
// Versione ottimizzata: richieste piccole, timeout brevi e fallback Overpass.

const fs = require("fs");

const CONFIG = {
  input: "uscite.json",
  output: "ristoranti.json",
  distanzaMassima: 2100,
  batchSize: 5,
  timeoutMs: 45000,
  pausaMs: 1200,
  tentativi: 2
};

const OVERPASS_SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter"
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizzaTesto(valore) {
  return String(valore || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function distanzaMetri(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function coordinateElemento(elemento) {
  if (typeof elemento.lat === "number" && typeof elemento.lon === "number") {
    return { lat: elemento.lat, lon: elemento.lon };
  }
  if (elemento.center && typeof elemento.center.lat === "number" && typeof elemento.center.lon === "number") {
    return { lat: elemento.center.lat, lon: elemento.center.lon };
  }
  return null;
}

function caricaUscite() {
  const dati = JSON.parse(fs.readFileSync(CONFIG.input, "utf8"));
  const uscite = Array.isArray(dati) ? dati : (dati.uscite || []);
  return uscite.filter(u => Number.isFinite(Number(u.lat)) && Number.isFinite(Number(u.lon)));
}

function eAreaDiServizio(tags) {
  if (!tags) return false;
  const testo = normalizzaTesto([
    tags.name, tags.operator, tags.description, tags.amenity, tags.shop
  ].filter(Boolean).join(" "));
  return [
    "area di servizio", "area servizio", "area di sosta", "area sosta",
    "autogrill", "service area", "service station", "rest area", "truck stop"
  ].some(p => testo.includes(p));
}

function creaQuery(uscite) {
  let query = "[out:json][timeout:45];\n(\n";
  for (const u of uscite) {
    query += `nwr["amenity"="restaurant"]["name"](around:2100,${u.lat},${u.lon});\n`;
    query += `nwr["amenity"="parking"](around:2100,${u.lat},${u.lon});\n`;
    query += `nwr["amenity"="parking_entrance"](around:2100,${u.lat},${u.lon});\n`;
  }
  query += ");\nout center tags;";
  return query;
}

async function richiestaOverpass(query) {
  let ultimoErrore = null;
  for (let tentativo = 0; tentativo < CONFIG.tentativi; tentativo++) {
    for (const server of OVERPASS_SERVERS) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), CONFIG.timeoutMs);
      try {
        console.log("Overpass:", server);
        const response = await fetch(server, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "User-Agent": "1KMESIMANGIA/1.0 (+https://1kmesimangia.it)"
          },
          body: "data=" + encodeURIComponent(query),
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        clearTimeout(timer);
        return json;
      } catch (errore) {
        clearTimeout(timer);
        ultimoErrore = errore;
        console.warn("Overpass fallito:", server, errore.message);
      }
    }
    await sleep(1500 * (tentativo + 1));
  }
  throw ultimoErrore || new Error("Overpass non disponibile");
}

function creaRistorante(elemento, uscita, distanza) {
  const coordinate = coordinateElemento(elemento);
  if (!coordinate || eAreaDiServizio(elemento.tags)) return null;
  if (distanza > CONFIG.distanzaMassima) return null;
  const tags = elemento.tags || {};
  return {
    id: `osm-${elemento.type}-${elemento.id}`,
    osm_id: elemento.id,
    osm_type: elemento.type,
    nome: tags.name || "",
    lat: coordinate.lat,
    lon: coordinate.lon,
    categoria: "ristorante",
    cucina: tags.cuisine || "",
    telefono: tags.phone || tags["contact:phone"] || "",
    sito: tags.website || tags["contact:website"] || "",
    apertura: tags.opening_hours || "",
    takeaway: tags.takeaway ?? null,
    delivery: tags.delivery ?? null,
    wheelchair: tags.wheelchair ?? null,
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
    mezzi_voluminosi: { stato: "non_verificato", hgv: null, maxheight: null, maxweight: null, maxlength: null },
    area_manovra: { stato: "non_verificato", fonte: null },
    fonti: ["OpenStreetMap"],
    ultima_verifica: new Date().toISOString()
  };
}

function associaParcheggio(ristorante, parcheggi) {
  let migliore = null;
  let distanzaMigliore = Infinity;
  for (const parcheggio of parcheggi) {
    const c = coordinateElemento(parcheggio);
    if (!c) continue;
    const d = distanzaMetri(ristorante.lat, ristorante.lon, c.lat, c.lon);
    if (d <= 300 && d < distanzaMigliore) {
      migliore = parcheggio;
      distanzaMigliore = d;
    }
  }
  if (!migliore) return;
  const tags = migliore.tags || {};
  const c = coordinateElemento(migliore);
  ristorante.parcheggio = {
    presente: true,
    tipo: tags.parking || null,
    distanza_m: Math.round(distanzaMigliore),
    osm_id: migliore.id,
    lat: c?.lat || null,
    lon: c?.lon || null,
    accesso: tags.access || null,
    capacity: tags.capacity || null
  };
  const hgv = tags.hgv || null;
  const maxheight = tags.maxheight || tags["maxheight:physical"] || null;
  const maxweight = tags.maxweight || null;
  const maxlength = tags.maxlength || null;
  if (hgv || maxheight || maxweight || maxlength) {
    ristorante.mezzi_voluminosi = { stato: "dati_osm", hgv, maxheight, maxweight, maxlength };
  }
  if (tags.access) ristorante.area_manovra = { stato: "da_verificare", fonte: "OpenStreetMap" };
}

function deduplica(ristoranti) {
  const mappa = new Map();
  for (const r of ristoranti) {
    const chiave = `${r.osm_type}/${r.osm_id}`;
    const precedente = mappa.get(chiave);
    if (!precedente || r.uscita.distanza_m < precedente.uscita.distanza_m) mappa.set(chiave, r);
  }
  return [...mappa.values()];
}

async function main() {
  console.log("==========================================");
  console.log("1 KM E SI MANGIA - DATABASE RISTORANTI");
  console.log("Distanza massima:", CONFIG.distanzaMassima, "m");
  const uscite = caricaUscite();
  const risultati = [];
  const totaleBatch = Math.ceil(uscite.length / CONFIG.batchSize);

  for (let i = 0; i < uscite.length; i += CONFIG.batchSize) {
    const batch = uscite.slice(i, i + CONFIG.batchSize);
    const numero = Math.floor(i / CONFIG.batchSize) + 1;
    console.log(`BATCH ${numero}/${totaleBatch} - ${batch.length} uscite`);
    try {
      const dati = await richiestaOverpass(creaQuery(batch));
      const elementi = dati.elements || [];
      const ristorantiOSM = elementi.filter(e => e.tags?.amenity === "restaurant" && e.tags?.name);
      const parcheggiOSM = elementi.filter(e => e.tags?.amenity === "parking" || e.tags?.amenity === "parking_entrance");
      console.log("Elementi:", elementi.length, "Ristoranti:", ristorantiOSM.length, "Parcheggi:", parcheggiOSM.length);

      for (const elemento of ristorantiOSM) {
        const c = coordinateElemento(elemento);
        if (!c) continue;
        let uscitaPiuVicino = null;
        let distanzaPiuVicino = Infinity;
        for (const uscita of batch) {
          const d = distanzaMetri(c.lat, c.lon, uscita.lat, uscita.lon);
          if (d <= CONFIG.distanzaMassima && d < distanzaPiuVicino) {
            uscitaPiuVicino = uscita;
            distanzaPiuVicino = d;
          }
        }
        if (!uscitaPiuVicino) continue;
        const ristorante = creaRistorante(elemento, uscitaPiuVicino, distanzaPiuVicino);
        if (!ristorante) continue;
        associaParcheggio(ristorante, parcheggiOSM);
        risultati.push(ristorante);
      }
    } catch (errore) {
      console.error("ERRORE BATCH:", errore.message);
    }
    if (i + CONFIG.batchSize < uscite.length) await sleep(CONFIG.pausaMs);
  }

  const databaseFinale = deduplica(risultati).sort((a, b) => a.uscita.distanza_m - b.uscita.distanza_m);
  fs.writeFileSync(CONFIG.output, JSON.stringify(databaseFinale, null, 2), "utf8");
  console.log("==========================================");
  console.log("DATABASE COMPLETATO");
  console.log("Ristoranti totali:", databaseFinale.length);
  console.log("File:", CONFIG.output);
  console.log("==========================================");
}

main().catch(errore => {
  console.error("ERRORE FATALE:", errore);
  process.exit(1);
});
