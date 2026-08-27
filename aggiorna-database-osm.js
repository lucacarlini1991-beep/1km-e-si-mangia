const fs = require("fs");

const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter"
];

const STATE_FILE = "./database-update-state.json";
const OUTPUT_FILE = "./uscite.json";
const FORCE = process.env.FORCE_UPDATE === "1";
const DAYS = 15;

function localNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" }));
}

function daysSince(dateString) {
  if (!dateString) return Infinity;
  const last = new Date(`${dateString}T00:00:00`);
  return Math.floor((localNow() - last) / 86400000);
}

const now = localNow();
if (!FORCE && now.getHours() !== 3) {
  console.log(`⏭️ Skip: ora locale ${now.getHours()}:00, non sono le 03:00.`);
  process.exit(0);
}

let state = {};
if (fs.existsSync(STATE_FILE)) {
  try { state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch (_) { state = {}; }
}

if (!FORCE && daysSince(state.lastSuccessfulRun) < DAYS) {
  console.log(`⏭️ Skip: ultimo aggiornamento ${state.lastSuccessfulRun || "mai"}.`);
  process.exit(0);
}

const query = `
[out:json][timeout:180];
area["ISO3166-1"="IT"][boundary="administrative"]->.it;
(
  node["highway"="motorway_junction"](area.it);
  nwr["highway"="services"](area.it);
  way["highway"="motorway"](area.it);
);
out body geom;
`;

const REQUEST_HEADERS = {
  "User-Agent": "1KM-E-SI-MANGIA/1.0 (https://1km-e-si-mangia.it)",
  "Accept": "application/json,text/plain,*/*"
};

async function fetchOverpass() {
  let lastError = null;
  for (const baseUrl of OVERPASS_URLS) {
    console.log(`🌍 Interrogo OpenStreetMap / Overpass: ${baseUrl}`);
    for (const method of ["POST", "GET"]) {
      try {
        const options = method === "POST"
          ? {
              method,
              headers: { ...REQUEST_HEADERS, "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
              body: new URLSearchParams({ data: query })
            }
          : { method, headers: REQUEST_HEADERS };
        const url = method === "GET" ? `${baseUrl}?data=${encodeURIComponent(query)}` : baseUrl;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 120000);
        options.signal = controller.signal;
        const response = await fetch(url, options);
        clearTimeout(timer);
        if (response.ok) return response.json();
        const text = await response.text().catch(() => "");
        lastError = new Error(`Overpass ${baseUrl} ${method} HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
        console.warn(`⚠️ ${lastError.message}`);
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Errore ${method} Overpass: ${error.message}`);
      }
    }
  }
  throw lastError || new Error("Nessun endpoint Overpass disponibile.");
}

function haversineMeters(aLat, aLon, bLat, bLon) {
  const R = 6371000;
  const p1 = aLat * Math.PI / 180;
  const p2 = bLat * Math.PI / 180;
  const dp = (bLat - aLat) * Math.PI / 180;
  const dl = (bLon - aLon) * Math.PI / 180;
  const x = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeSearch(value) {
  return normalizeName(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function coordinate(element) {
  if (Number.isFinite(Number(element?.lat)) && Number.isFinite(Number(element?.lon))) {
    return { lat: Number(element.lat), lon: Number(element.lon) };
  }
  if (Number.isFinite(Number(element?.center?.lat)) && Number.isFinite(Number(element?.center?.lon))) {
    return { lat: Number(element.center.lat), lon: Number(element.center.lon) };
  }
  return null;
}

function makeId(element) {
  return `uscita-${element.type}-${element.id}`;
}

const SERVICE_WORDS = [
  "area di servizio", "area servizio", "area di sosta", "area sosta",
  "autogrill", "service area", "service station", "rest area", "truck stop",
  "stazione di servizio", "stazione servizio"
];

const HIDDEN_WORDS = [
  "svincolo", "svincoli", "snodo", "snodi", "interconnessione", "interconnessioni",
  "raccordo", "raccordi", "diramazione", "diramazioni", "bretella", "bretelle",
  "allacciamento", "allacciamenti", "deviazione", "deviazioni", "intersezione autostradale"
];

function classify(element) {
  const tags = element?.tags || {};
  const text = normalizeSearch([
    tags.name, tags.operator, tags.description, tags.ref, tags["motorway:ref"],
    tags["junction:ref"], tags.highway, tags.amenity
  ].filter(Boolean).join(" "));

  const isService = tags.highway === "services" || SERVICE_WORDS.some(word => text.includes(normalizeSearch(word)));
  if (isService) {
    return { tipo: "area_servizio", visibile: false, visualizza_mappa: false, mostra_ristoranti: false, mostra_carburante: true };
  }

  const isHidden = HIDDEN_WORDS.some(word => text.includes(normalizeSearch(word))) ||
    ["motorway_link", "trunk_link"].includes(tags.highway) ||
    tags.junction === "interchange";

  if (isHidden) {
    return { tipo: "svincolo", visibile: false, visualizza_mappa: false, mostra_ristoranti: false, mostra_carburante: false };
  }

  return { tipo: "casello", visibile: true, visualizza_mappa: true, mostra_ristoranti: true, mostra_carburante: false };
}

function nearestMotorway(lat, lon, ways) {
  let best = null;
  let bestDistance = Infinity;
  for (const way of ways) {
    const geometry = way.geometry || [];
    for (let i = 1; i < geometry.length; i++) {
      const a = geometry[i - 1];
      const b = geometry[i];
      const candidate = Math.min(
        haversineMeters(lat, lon, a.lat, a.lon),
        haversineMeters(lat, lon, b.lat, b.lon)
      );
      if (candidate < bestDistance) {
        bestDistance = candidate;
        const tags = way.tags || {};
        best = { ref: tags.ref || tags["motorway:ref"] || tags.nat_ref || null, name: tags.name || tags.loc_name || null };
      }
    }
  }
  return best ? { ...best, distanza: Number(bestDistance.toFixed(1)) } : null;
}

async function main() {
  const data = await fetchOverpass();
  const elements = Array.isArray(data.elements) ? data.elements : [];
  const junctions = elements.filter(e => e.type === "node" && e.tags?.highway === "motorway_junction");
  const services = elements.filter(e => e.tags?.highway === "services");
  const motorwayWays = elements.filter(e => e.type === "way" && e.tags?.highway === "motorway");

  if (junctions.length < 100) throw new Error(`Risposta Overpass sospetta: solo ${junctions.length} caselli motorway_junction.`);

  console.log(`📍 Junction OSM: ${junctions.length}`);
  console.log(`⛽ Aree di servizio OSM: ${services.length}`);

  const records = [];
  const seen = new Set();

  for (const element of [...junctions, ...services]) {
    const c = coordinate(element);
    if (!c) continue;
    const classification = classify(element);
    const tags = element.tags || {};
    const motorway = nearestMotorway(c.lat, c.lon, motorwayWays);
    const key = `${classification.tipo}|${normalizeSearch(tags.name)}|${motorway?.ref || ""}|${c.lat.toFixed(5)}|${c.lon.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    records.push({
      id: makeId(element),
      nome: normalizeName(tags.name) || (classification.tipo === "area_servizio" ? "Area di servizio" : "Svincolo autostradale"),
      autostrada: motorway?.ref || tags["motorway:ref"] || tags.nat_ref || null,
      nome_autostrada: motorway?.name || null,
      numero_uscita: tags.ref || tags["junction:ref"] || null,
      lat: Number(c.lat.toFixed(7)),
      lon: Number(c.lon.toFixed(7)),
      tipo: classification.tipo,
      visibile: classification.visibile,
      visualizza_mappa: classification.visualizza_mappa,
      mostra_ristoranti: classification.mostra_ristoranti,
      mostra_carburante: classification.mostra_carburante,
      punti_osm: [{ osm_id: `${element.type}/${element.id}`, lat: c.lat, lon: c.lon, distanza_autostrada_m: motorway?.distanza ?? null }],
      punti_osm_count: 1,
      fonte: "OpenStreetMap",
      nota: classification.tipo === "casello"
        ? "Casello/uscita autostradale visibile."
        : classification.tipo === "area_servizio"
          ? "Area di servizio conservata nel database ma nascosta dalla mappa e senza elenco ristoranti."
          : "Svincolo/snodo autostradale conservato nel database ma non visualizzato."
    });
  }

  records.sort((a, b) =>
    String(a.autostrada || "ZZZ").localeCompare(String(b.autostrada || "ZZZ"), "it") ||
    String(a.nome || "").localeCompare(String(b.nome || ""), "it")
  );

  const visible = records.filter(r => r.visibile).length;
  const servicesCount = records.filter(r => r.tipo === "area_servizio").length;
  const junctionHidden = records.filter(r => r.tipo === "svincolo").length;

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(records, null, 2) + "\n", "utf8");
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    lastSuccessfulRun: now.toISOString().slice(0, 10),
    updatedAt: now.toISOString(),
    exits: records.length,
    visibleExits: visible,
    hiddenElements: records.length - visible,
    serviceAreas: servicesCount,
    hiddenJunctions: junctionHidden,
    source: "OpenStreetMap / Overpass"
  }, null, 2) + "\n", "utf8");

  console.log(`✅ DATABASE AGGIORNATO: ${records.length} elementi`);
  console.log(`🚗 Caselli visibili: ${visible}`);
  console.log(`⛽ Aree servizio nascoste: ${servicesCount}`);
  console.log(`🔀 Svincoli/snodi nascosti: ${junctionHidden}`);
}

main().catch(error => {
  console.error("❌ Aggiornamento database fallito:", error);
  process.exit(1);
});
