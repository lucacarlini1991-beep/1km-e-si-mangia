/**
 * Esplora Uscite: database parcheggi locale.
 * Fonte: OpenStreetMap via Overpass.
 * Usa esclusivamente le uscite della nuova interfaccia (uscita2-data.js).
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

const RADIUS = 10000;
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
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
        else reject(new Error("HTTP " + res.statusCode));
      });
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

function circles(chunk, tag) {
  return chunk.map(e => tag + "(around:" + RADIUS + "," + e.lat + "," + e.lng + ");").join("");
}

function uniqueExits(items) {
  const seen = new Set();
  return items.filter(e => {
    const key = Number(e.lat).toFixed(4) + "," + Number(e.lng).toFixed(4);
    if (seen.has(key)) return false;
    seen.add(key);
    return Number.isFinite(e.lat) && Number.isFinite(e.lng);
  });
}

async function fetchChunk(chunk, index, total) {
  const query =
    "[out:json][timeout:120];(" +
    circles(chunk, 'nwr["amenity"="parking"]') +
    circles(chunk, 'nwr["highway"="rest_area"]') +
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
        console.warn("Blocco " + index + "/" + total + " tentativo " + attempt + " KO:", endpoint, error.message);
      }
    }
    await sleep(1500 * attempt);
  }
  console.warn("Blocco " + index + "/" + total + " saltato dopo i tentativi:", lastError?.message);
  return [];
}

function type(tags) {
  if (tags.highway === "rest_area") return "rest";
  if (tags.fee === "no") return "free";
  if (tags.fee === "yes") return "paid";
  return "auto";
}

(async () => {
  const selectedExits = uniqueExits(exits);
  console.log("Uscite usate:", selectedExits.length, "su", exits.length);
  console.log("Raggio database:", RADIUS / 1000, "km");

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
        name: tags.name || (tags.highway === "rest_area" ? "Area di sosta" : "Parcheggio"),
        lat: point.lat,
        lng: point.lng,
        type: type(tags),
        capacity: tags.capacity && Number.isFinite(Number(tags.capacity)) ? Number(tags.capacity) : null,
        covered: tags.covered === "yes",
        source: "OpenStreetMap",
        osm_type: x.type,
        osm_id: x.id
      });
    }

    console.log("Totale unico:", items.length);
  }

  fs.writeFileSync("data/parcheggi.json", JSON.stringify({
    version: "3.0",
    source: "OpenStreetMap / Overpass, vicino alle uscite di Esplora Uscite",
    updated_at: new Date().toISOString(),
    radius_m: RADIUS,
    exits_count: selectedExits.length,
    items
  }, null, 2));

  console.log("Database creato:", items.length, "parcheggi unici");
})();