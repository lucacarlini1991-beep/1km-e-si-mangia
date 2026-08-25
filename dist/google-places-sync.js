// =====================================================
// 1 KM E SI MANGIA
// GOOGLE PLACES - SINCRONIZZAZIONE DATABASE
// =====================================================
//
// SCOPO:
//   Usa Google Places (Nearby Search New) per trovare i
//   ristoranti intorno alle nostre uscite e collega il
//   relativo Google Place ID ai record gia presenti nel
//   nostro database.
//
// IMPORTANTE:
//   La API key NON deve mai essere scritta qui.
//   Variabile richiesta: GOOGLE_PLACES_API_KEY
//
//   Salviamo nel database solo il Place ID Google e la
//   data del nostro controllo. I dati Google ricevuti per
//   il matching restano temporanei e non vengono copiati
//   nel JSON del sito.
//
// TEST:
//   GOOGLE_PLACES_MAX_EXITS=25 node google-places-sync.js
//
// COMPLETO:
//   GOOGLE_PLACES_MAX_EXITS=1651 node google-places-sync.js
//
// =====================================================

const fs = require("fs");

const CONFIG = {
  uscite: "./uscite.json",
  ristoranti: "./ristoranti.json",
  radius: 2100,
  maxResultCount: 20,
  maxExits: Number(process.env.GOOGLE_PLACES_MAX_EXITS || 25),
  pausaMs: 120,
  minMatchDistance: 180,
  strongMatchDistance: 45,
  nameThreshold: 0.55,
  endpoint: "https://places.googleapis.com/v1/places:searchNearby"
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value) {
  return new Set(
    normalize(value)
      .split(" ")
      .filter(token => token.length >= 2)
  );
}

function nameSimilarity(a, b) {
  const aa = tokens(a);
  const bb = tokens(b);

  if (!aa.size || !bb.size) return 0;

  let common = 0;
  for (const token of aa) {
    if (bb.has(token)) common++;
  }

  return common / Math.max(aa.size, bb.size);
}

function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) *
    Math.cos(lat2 * rad) *
    Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function caricaJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function coordinateUscita(uscita) {
  const lat = Number(
    uscita.lat ?? uscita.latitude ?? uscita.coordinate?.lat
  );
  const lon = Number(
    uscita.lon ?? uscita.lng ?? uscita.longitude ?? uscita.coordinate?.lon
  );

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

function coordinateRistorante(ristorante) {
  const lat = Number(ristorante.lat);
  const lon = Number(ristorante.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

function nomeGoogle(place) {
  return place?.displayName?.text || "";
}

async function cercaGoogle(apiKey, lat, lon) {
  const response = await fetch(CONFIG.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.location"
    },
    body: JSON.stringify({
      includedTypes: ["restaurant"],
      maxResultCount: CONFIG.maxResultCount,
      rankPreference: "DISTANCE",
      languageCode: "it",
      regionCode: "IT",
      locationRestriction: {
        circle: {
          center: {
            latitude: lat,
            longitude: lon
          },
          radius: CONFIG.radius
        }
      }
    })
  });

  const text = await response.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Risposta Google non JSON (${response.status})`);
  }

  if (!response.ok) {
    const message = data?.error?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return Array.isArray(data.places) ? data.places : [];
}

function trovaMiglioreMatch(place, ristoranti) {
  const pc = place?.location;
  if (!pc) return null;

  const googleName = nomeGoogle(place);
  let migliore = null;

  for (const ristorante of ristoranti) {
    const rc = coordinateRistorante(ristorante);
    if (!rc) continue;

    const distanza = distanceMeters(
      pc.latitude,
      pc.longitude,
      rc.lat,
      rc.lon
    );

    if (distanza > CONFIG.minMatchDistance) continue;

    const similarita = nameSimilarity(googleName, ristorante.nome);

    const matchForte =
      distanza <= CONFIG.strongMatchDistance && similarita >= 0.30;

    const matchNome = similarita >= CONFIG.nameThreshold;

    if (!matchForte && !matchNome) continue;

    const punteggio =
      (matchForte ? 1 : 0) * 1000 +
      similarita * 100 -
      distanza / 10;

    if (!migliore || punteggio > migliore.punteggio) {
      migliore = {
        ristorante,
        distanza,
        similarita,
        punteggio
      };
    }
  }

  return migliore;
}

async function main() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Manca GOOGLE_PLACES_API_KEY. Inseriscila come variabile d'ambiente / GitHub Secret."
    );
  }

  if (!Number.isInteger(CONFIG.maxExits) || CONFIG.maxExits < 1) {
    throw new Error("GOOGLE_PLACES_MAX_EXITS deve essere un intero positivo.");
  }

  const uscite = caricaJson(CONFIG.uscite);
  const ristoranti = caricaJson(CONFIG.ristoranti);

  if (!Array.isArray(uscite)) {
    throw new Error("uscite.json deve contenere un array.");
  }

  if (!Array.isArray(ristoranti)) {
    throw new Error("ristoranti.json deve contenere un array.");
  }

  const usciteValide = uscite
    .map((uscita, index) => ({ uscita, index, coordinate: coordinateUscita(uscita) }))
    .filter(item => item.coordinate)
    .slice(0, CONFIG.maxExits);

  const oggi = new Date().toISOString();
  const giaAssociati = new Set();
  let chiamate = 0;
  let luoghiGoogle = 0;
  let associati = 0;
  let nonAssociati = 0;
  let errori = 0;

  for (const item of usciteValide) {
    const { lat, lon } = item.coordinate;
    const nomeUscita = item.uscita.nome || `uscita ${item.index + 1}`;

    try {
      const places = await cercaGoogle(apiKey, lat, lon);
      chiamate++;
      luoghiGoogle += places.length;

      for (const place of places) {
        if (!place.id) continue;

        const match = trovaMiglioreMatch(place, ristoranti);

        if (!match) {
          nonAssociati++;
          continue;
        }

        const record = match.ristorante;
        const id = record.id || record.osm_id || record.nome;

        // Un singolo ristorante puo comparire vicino a piu uscite.
        // Lo associamo comunque una sola volta per questa esecuzione.
        if (giaAssociati.has(id)) continue;
        giaAssociati.add(id);

        if (record.google_place_id !== place.id) {
          record.google_place_id = place.id;
          record.google_place_id_verificato = oggi;
          associati++;
        } else {
          record.google_place_id_verificato = oggi;
        }
      }

      console.log(
        `✓ ${nomeUscita}: ${places.length} risultati Google`
      );
    } catch (error) {
      errori++;
      console.error(`✗ ${nomeUscita}: ${error.message}`);
    }

    await sleep(CONFIG.pausaMs);
  }

  // Ordine stabile: non riscriviamo inutilmente la struttura del file.
  fs.writeFileSync(
    CONFIG.ristoranti,
    JSON.stringify(ristoranti, null, 2) + "\n",
    "utf8"
  );

  console.log("");
  console.log("==========================================");
  console.log("GOOGLE PLACES - SINCRONIZZAZIONE COMPLETATA");
  console.log("==========================================");
  console.log(`Uscite controllate: ${usciteValide.length}`);
  console.log(`Chiamate Google: ${chiamate}`);
  console.log(`Luoghi Google ricevuti: ${luoghiGoogle}`);
  console.log(`Ristoranti associati: ${associati}`);
  console.log(`Risultati non associati: ${nonAssociati}`);
  console.log(`Errori: ${errori}`);
  console.log(`Database aggiornato: ${CONFIG.ristoranti}`);
  console.log("==========================================");
}

main().catch(error => {
  console.error("");
  console.error("ERRORE GOOGLE PLACES:");
  console.error(error.message);
  process.exit(1);
});
