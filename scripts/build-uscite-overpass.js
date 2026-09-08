/**
 * ESPLORA USCITE - Database nazionale delle uscite autostradali.
 * Estrae gli svincoli motorway_junction italiani da OpenStreetMap.
 */
const fs = require("fs");
const https = require("https");

const endpoints = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];

const query = `[out:json][timeout:240];
area["ISO3166-1"="IT"][admin_level=2]->.it;
node["highway"="motorway_junction"](area.it);
out body;`;

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

function slug(value) {
  return String(value).normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function road(tags) {
  return tags.ref || tags.motorway || tags["destination:it"] || tags.destination || "Autostrada";
}

(async () => {
  let raw, lastError;

  for (const endpoint of endpoints) {
    try {
      raw = await post(endpoint, "data=" + encodeURIComponent(query));
      console.log("Fonte:", endpoint);
      break;
    } catch (error) {
      lastError = error;
      console.warn("Endpoint KO:", endpoint, error.message);
    }
  }

  if (!raw) throw lastError || new Error("Nessun endpoint disponibile");

  const seen = new Set();
  const items = JSON.parse(raw).elements.map(element => {
    const tags = element.tags || {};
    const name = tags.name || tags.exit_to || tags["destination:it"] || tags.destination;

    if (!name || !Number.isFinite(element.lat) || !Number.isFinite(element.lon)) return null;

    const key = Math.round(element.lat * 100000) + ":" + Math.round(element.lon * 100000);
    if (seen.has(key)) return null;
    seen.add(key);

    return {
      id: slug(name) + "-" + element.id,
      name: String(name).trim(),
      road: road(tags),
      city: String(tags["addr:city"] || tags.destination || name).trim(),
      lat: element.lat,
      lng: element.lon,
      source: "OpenStreetMap",
      osm_id: element.id
    };
  }).filter(Boolean).sort((a, b) =>
    a.road.localeCompare(b.road, "it") || a.name.localeCompare(b.name, "it")
  );

  const output = {
    version: "2.0",
    source: "OpenStreetMap motorway_junction",
    updated_at: new Date().toISOString(),
    description: "Database nazionale delle uscite e svincoli autostradali italiani per Esplora Uscite.",
    items
  };

  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync("data/uscite.json", JSON.stringify(output, null, 2));
  console.log("Create", items.length, "uscite");
})();