const fs = require("fs");

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
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
  const now = localNow();
  return Math.floor((now - last) / 86400000);
}

const now = localNow();
const hour = now.getHours();

if (!FORCE && hour !== 3) {
  console.log(`⏭️ Skip: ora locale ${hour}:00, non sono le 03:00.`);
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
[out:json][timeout:240];
area["ISO3166-1"="IT"][boundary="administrative"]->.it;
node["highway"="motorway_junction"](area.it)->.junctions;
(
  .junctions;
  way(around.junctions:1000)["highway"="motorway"];
);
out body geom;
`;

async function fetchOverpass() {
  console.log("🌍 Interrogo OpenStreetMap / Overpass...");
  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
    body: new URLSearchParams({ data: query })
  });
  if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`);
  return response.json();
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

function segmentDistanceMeters(lat, lon, a, b) {
  const lat0 = lat * Math.PI / 180;
  const kx = 111320 * Math.cos(lat0);
  const ky = 110540;
  const px = (lon - a[0]) * kx;
  const py = (lat - a[1]) * ky;
  const bx = (b[0] - a[0]) * kx;
  const by = (b[1] - a[1]) * ky;
  const denom = bx * bx + by * by;
  let t = denom ? (px * bx + py * by) / denom : 0;
  t = Math.max(0, Math.min(1, t));
  const dx = px - t * bx;
  const dy = py - t * by;
  return Math.sqrt(dx * dx + dy * dy);
}

function nearestWay(lat, lon, ways) {
  let best = null;
  let bestDistance = Infinity;
  for (const way of ways) {
    const g = way.geometry || [];
    for (let i = 1; i < g.length; i++) {
      const d = segmentDistanceMeters(lat, lon, [g[i - 1].lon, g[i - 1].lat], [g[i].lon, g[i].lat]);
      if (d < bestDistance) {
        bestDistance = d;
        const t = way.tags || {};
        best = {
          ref: t.ref || t.nat_ref || "",
          name: t.name || t.loc_name || ""
        };
      }
    }
  }
  return best ? { ...best, distance: Number(bestDistance.toFixed(1)) } : null;
}

function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function makeId(nodes) {
  return `uscita-${nodes.map(n => n.id).sort((a, b) => a - b)[0]}`;
}

async function main() {
  const data = await fetchOverpass();
  const elements = Array.isArray(data.elements) ? data.elements : [];
  const nodes = elements.filter(e => e.type === "node" && e.tags?.highway === "motorway_junction");
  const ways = elements.filter(e => e.type === "way" && e.tags?.highway === "motorway");

  if (nodes.length < 100) throw new Error(`Risposta Overpass sospetta: solo ${nodes.length} uscite.`);

  console.log(`📍 Uscite OSM: ${nodes.length}`);
  console.log(`🛣️ Tratti autostradali di supporto: ${ways.length}`);

  const enriched = nodes.map(node => {
    const t = node.tags || {};
    const nearest = nearestWay(node.lat, node.lon, ways);
    return {
      node,
      name: normalizeName(t.name),
      number: t.ref || null,
      motorway: nearest?.ref || t["motorway:ref"] || t.nat_ref || null,
      motorwayName: nearest?.name || null,
      motorwayDistance: nearest?.distance ?? null
    };
  });

  // Raggruppa i punti che rappresentano lo stesso casello: stesso nome,
  // stessa autostrada e distanza geografica massima di 5 km.
  const groups = [];
  for (const item of enriched) {
    let group = null;
    if (item.name) {
      group = groups.find(g =>
        g.name === item.name &&
        (g.motorway || "") === (item.motorway || "") &&
        g.nodes.some(n => haversineMeters(n.node.lat, n.node.lon, item.node.lat, item.node.lon) <= 5000)
      );
    }
    if (!group) {
      group = {
        name: item.name || "Uscita senza nome",
        motorway: item.motorway,
        motorwayName: item.motorwayName,
        nodes: []
      };
      groups.push(group);
    }
    group.nodes.push(item);
    if (!group.motorway && item.motorway) group.motorway = item.motorway;
    if (!group.motorwayName && item.motorwayName) group.motorwayName = item.motorwayName;
  }

  const database = groups.map(group => {
    const nodes = group.nodes;
    const lat = nodes.reduce((s, x) => s + x.node.lat, 0) / nodes.length;
    const lon = nodes.reduce((s, x) => s + x.node.lon, 0) / nodes.length;
    const number = nodes.map(x => x.number).find(Boolean) || null;

    return {
      id: makeId(nodes.map(x => x.node)),
      nome: group.name,
      autostrada: group.motorway,
      nome_autostrada: group.motorwayName,
      numero_uscita: number,
      lat: Number(lat.toFixed(7)),
      lon: Number(lon.toFixed(7)),
      punti_osm: nodes.map(x => ({
        osm_id: `node/${x.node.id}`,
        lat: x.node.lat,
        lon: x.node.lon,
        distanza_autostrada_m: x.motorwayDistance
      })),
      punti_osm_count: nodes.length,
      fonte: "OpenStreetMap",
      nota: "Punti OSM raggruppati per nome/autostrada e prossimità; i punti originali sono conservati per la futura gestione della direzione."
    };
  });

  database.sort((a, b) =>
    String(a.autostrada || "ZZZ").localeCompare(String(b.autostrada || "ZZZ"), "it") ||
    String(a.nome || "").localeCompare(String(b.nome || ""), "it")
  );

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(database, null, 2) + "\n", "utf8");
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    lastSuccessfulRun: now.toISOString().slice(0, 10),
    updatedAt: now.toISOString(),
    exits: database.length,
    source: "OpenStreetMap / Overpass"
  }, null, 2) + "\n", "utf8");

  console.log(`✅ DATABASE AGGIORNATO: ${database.length} uscite`);
}

main().catch(error => {
  console.error("❌ Aggiornamento database fallito:", error);
  process.exit(1);
});
