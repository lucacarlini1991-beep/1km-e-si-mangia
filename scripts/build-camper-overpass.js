/**
 * Esplora Uscite: database aree camper locale.
 * Fonte: OpenStreetMap via Overpass.
 * Cerca strutture camper vicino alle uscite della nuova interfaccia.
 */
const fs = require("fs");
const https = require("https");

const rawExits = fs.readFileSync("uscita2-data.js", "utf8");
const match = rawExits.match(/window\.USCITE2\s*=\s*(\[[\s\S]*\])\s*;?\s*$/);
if (!match) throw new Error("Impossibile leggere uscita2-data.js");

const exits = JSON.parse(match[1]);
const endpoints = [
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];

const RADIUS = 15000;
const CHUNK = 20;
const RETRIES = 2;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function post(url, body, timeout = 180000) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
        "User-Agent": "1KM-e-si-mangia-data-bot"
      },
      timeout
    }, res => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", chunk => data += chunk);
      res.on("end", () => res.statusCode >= 200 && res.statusCode < 300
        ? resolve(data)
        : reject(new Error("HTTP " + res.statusCode)));
    });
    req.on("timeout", () => req.destroy(new Error("Timeout")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function coords(x) {
  return x.type === "node"
    ? { lat: x.lat, lng: x.lon }
    : { lat: x.center?.lat, lng: x.center?.lon };
}

function uniqueExits(items) {
  const seen = new Set();
  return items.filter(e => {
    if (!Number.isFinite(Number(e.lat)) || !Number.isFinite(Number(e.lng))) return false;
    const key = Number(e.lat).toFixed(4) + "," + Number(e.lng).toFixed(4);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function circles(chunk, selector) {
  return chunk.map(e => selector + "(around:" + RADIUS + "," + e.lat + "," + e.lng + ");").join("");
}

async function fetchChunk(chunk, index, total) {
  const query =
    "[out:json][timeout:120];(" +
    circles(chunk, 'nwr["tourism"="caravan_site"]') +
    circles(chunk, 'nwr["amenity"="sanitary_dump_station"]') +
    circles(chunk, 'nwr["amenity"="motorhome_service"]') +
    circles(chunk, 'nwr["amenity"="parking"]["caravan"~"yes|designated",i]') +
    ");out center tags;";

  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    for (const endpoint of endpoints) {
      try {
        const raw = await post(endpoint, "data=" + encodeURIComponent(query));
        const json = JSON.parse(raw);
        console.log("Blocco " + index + "/" + total + " OK → " + (json.elements || []).length + " elementi");
        return json.elements || [];
      } catch (error) {
        lastError = error;
        console.warn("Blocco " + index + "/" + total + " KO:", endpoint, error.message);
      }
    }
    await sleep(1500 * attempt);
  }
  console.warn("Blocco " + index + "/" + total + " saltato:", lastError?.message);
  return [];
}

function kind(tags) {
  if (tags.tourism === "caravan_site") return "area_camper";
  if (tags.amenity === "sanitary_dump_station" || tags.amenity === "motorhome_service") return "servizio_camper";
  return "parcheggio_camper";
}

(async () => {
  const selectedExits = uniqueExits(exits);
  console.log("Uscite usate:", selectedExits.length);
  console.log("Raggio database camper:", RADIUS / 1000, "km");

  const seen = new Set();
  const items = [];
  const total = Math.ceil(selectedExits.length / CHUNK);

  for (let i = 0; i < selectedExits.length; i += CHUNK) {
    const elements = await fetchChunk(selectedExits.slice(i, i + CHUNK), Math.floor(i / CHUNK) + 1, total);
    for (const x of elements) {
      const point = coords(x);
      const tags = x.tags || {};
      const id = x.type + "-" + x.id;
      if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng) || seen.has(id)) continue;
      seen.add(id);

      items.push({
        id,
        name: tags.name || (kind(tags) === "area_camper" ? "Area camper" : kind(tags) === "servizio_camper" ? "Servizio camper" : "Parcheggio camper"),
        lat: point.lat,
        lng: point.lng,
        type: kind(tags),
        fee: tags.fee || null,
        capacity: tags.capacity && Number.isFinite(Number(tags.capacity)) ? Number(tags.capacity) : null,
        power: tags.electricity === "yes" || tags["power_supply"] === "yes",
        water: tags.drinking_water === "yes",
        toilets: tags.toilets === "yes",
        shower: tags.shower === "yes",
        website: tags.website || tags["contact:website"] || null,
        phone: tags.phone || tags["contact:phone"] || null,
        source: "OpenStreetMap",
        osm_type: x.type,
        osm_id: x.id
      });
    }
    console.log("Totale unico:", items.length);
  }

  fs.writeFileSync("data/camper.json", JSON.stringify({
    version: "3.0",
    source: "OpenStreetMap / Overpass, strutture camper vicino alle uscite di Esplora Uscite",
    updated_at: new Date().toISOString(),
    radius_m: RADIUS,
    exits_count: selectedExits.length,
    items
  }, null, 2));

  console.log("Database creato:", items.length, "strutture camper uniche");
})();
// Trigger aggiornamento database camper.
