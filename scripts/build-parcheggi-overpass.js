/** Esplora Uscite: parcheggi entro 20 km dalle uscite */
const fs = require("fs");
const https = require("https");

const exits = JSON.parse(fs.readFileSync("data/uscite.json", "utf8")).items || [];
const endpoints = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];
const RADIUS = 20000;
const CHUNK = 35;

function post(url, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
        "User-Agent": "1KM-e-si-mangia-data-bot"
      }
    }, (res) => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
        else reject(new Error("HTTP " + res.statusCode));
      });
    });
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

async function fetchAll(selector) {
  const all = [];

  for (let i = 0; i < exits.length; i += CHUNK) {
    const query = "[out:json][timeout:180];(" + selector(exits.slice(i, i + CHUNK)) + ");out center tags;";
    let raw, lastError;

    for (const endpoint of endpoints) {
      try {
        raw = await post(endpoint, "data=" + encodeURIComponent(query));
        break;
      } catch (error) {
        lastError = error;
        console.warn("Endpoint KO:", endpoint, error.message);
      }
    }

    if (!raw) throw lastError || new Error("Nessun endpoint disponibile");

    const elements = JSON.parse(raw).elements || [];
    all.push(...elements);
    console.log("Blocco", Math.floor(i / CHUNK) + 1, "→", all.length);
  }

  return all;
}

function selector(chunk) {
  return circles(chunk, 'nwr["amenity"="parking"]') +
    circles(chunk, 'nwr["highway"="rest_area"]');
}

function type(tags) {
  if (tags.highway === "rest_area") return "rest";
  if (tags.fee === "no") return "free";
  if (tags.fee === "yes") return "paid";
  return "auto";
}

(async () => {
  const seen = new Set();

  const items = (await fetchAll(selector)).map(x => {
    const point = coords(x);
    const tags = x.tags || {};
    const id = x.type + "-" + x.id;

    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng) || seen.has(id)) return null;
    seen.add(id);

    return {
      id,
      name: tags.name || "Parcheggio",
      lat: point.lat,
      lng: point.lng,
      type: type(tags),
      capacity: tags.capacity ? Number(tags.capacity) : null,
      covered: tags.covered === "yes",
      source: "OpenStreetMap",
      osm_type: x.type,
      osm_id: x.id
    };
  }).filter(Boolean);

  fs.writeFileSync("data/parcheggi.json", JSON.stringify({
    version: "2.0",
    source: "OpenStreetMap, entro 20 km dalle uscite",
    updated_at: new Date().toISOString(),
    radius_m: RADIUS,
    items
  }, null, 2));

  console.log("Creati", items.length, "parcheggi");
})();