// 1 KM E SI MANGIA - Google Places proxy + cache Place ID
// Google key: GOOGLE_PLACES_API_KEY (Vercel)
// Supabase service key: SUPABASE_SERVICE_ROLE_KEY (Vercel)

const ENDPOINT_NEARBY = "https://places.googleapis.com/v1/places:searchNearby";
const ENDPOINT_DETAILS = "https://places.googleapis.com/v1/places/";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://pyiheodneyvtcotuonpt.supabase.co";
const DEFAULT_RADIUS = 2000;
const MAX_RADIUS = 2000;
const DEFAULT_MAX_RESULTS = 15;
const MAX_RESULTS = 15;
const CACHE_DETAILS_LIMIT = 5;
const ONSITE_MAX_DISTANCE_METERS = 5000;
const MIN_SECOND_CENTER_DISTANCE_METERS = 250;

function numero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function distanzaMetri(aLat, aLon, bLat, bLon) {
  const R = 6371000;
  const p1 = Number(aLat) * Math.PI / 180;
  const p2 = Number(bLat) * Math.PI / 180;
  const dp = (Number(bLat) - Number(aLat)) * Math.PI / 180;
  const dl = (Number(bLon) - Number(aLon)) * Math.PI / 180;
  const x = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function cacheKey(lat, lon, radius) {
  return `restaurant:${Number(lat).toFixed(5)}:${Number(lon).toFixed(5)}:${Math.round(radius)}`;
}

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json"
  };
}

async function leggiCache(key) {
  const headers = supabaseHeaders();
  if (!headers) return null;

  try {
    const url = `${SUPABASE_URL}/rest/v1/google_places_cache?select=place_ids,updated_at&cache_key=eq.${encodeURIComponent(key)}&limit=1`;
    const response = await fetch(url, { headers });
    if (!response.ok) return null;
    const rows = await response.json();
    if (!Array.isArray(rows) || !rows[0]) return null;
    const ids = Array.isArray(rows[0].place_ids) ? rows[0].place_ids.map(String).filter(Boolean) : [];
    return ids.length ? { ids, updatedAt: rows[0].updated_at || null } : null;
  } catch (error) {
    console.warn("Google Places cache read error:", error);
    return null;
  }
}

async function salvaCache(key, lat, lon, radius, placeIds) {
  const headers = supabaseHeaders();
  if (!headers || !Array.isArray(placeIds) || !placeIds.length) return;

  try {
    const url = `${SUPABASE_URL}/rest/v1/google_places_cache?on_conflict=cache_key`;
    const response = await fetch(url, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        cache_key: key,
        exit_lat: lat,
        exit_lon: lon,
        radius_m: Math.round(radius),
        place_ids: placeIds,
        updated_at: new Date().toISOString()
      })
    });
    if (!response.ok) {
      console.warn("Google Places cache write error:", response.status, await response.text().catch(() => ""));
    }
  } catch (error) {
    console.warn("Google Places cache write error:", error);
  }
}

async function dettagliPlace(apiKey, placeId) {
  const response = await fetch(`${ENDPOINT_DETAILS}${encodeURIComponent(placeId)}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "id,displayName,formattedAddress,location,types"
    }
  });

  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  return data && data.id ? data : null;
}

async function recuperaDaCache(apiKey, cache) {
  const ids = cache.ids.slice(0, CACHE_DETAILS_LIMIT);
  const risultati = await Promise.all(ids.map((id) => dettagliPlace(apiKey, id)));
  return risultati.filter(Boolean);
}

async function cercaCentro(apiKey, center, radius, maxResultCount) {
  const key = cacheKey(center.lat, center.lon, radius);

  const cached = await leggiCache(key);
  if (cached) {
    const places = await recuperaDaCache(apiKey, cached);
    if (places.length) {
      console.log("Google Places CACHE HIT", {
        cacheKey: key,
        placeIds: cached.ids.length,
        dettagli: places.length
      });
      return { places, cache: "hit" };
    }
  }

  const response = await fetch(ENDPOINT_NEARBY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types"
    },
    body: JSON.stringify({
      includedTypes: ["restaurant"],
      maxResultCount,
      rankPreference: "DISTANCE",
      languageCode: "it",
      regionCode: "IT",
      locationRestriction: {
        circle: {
          center: { latitude: center.lat, longitude: center.lon },
          radius
        }
      }
    })
  });

  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (_) { data = {}; }

  if (!response.ok) {
    console.error("Google Places error:", response.status, data?.error || text);
    throw new Error(data?.error?.message || `Google Places HTTP ${response.status}`);
  }

  const places = Array.isArray(data.places) ? data.places : [];
  const placeIds = places.map((place) => place?.id).filter(Boolean).map(String);
  await salvaCache(key, center.lat, center.lon, radius, placeIds);

  return { places, cache: "miss" };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metodo non consentito." });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error("GOOGLE_PLACES_API_KEY non configurata.");
    return res.status(500).json({ error: "Google Places non configurato sul server." });
  }

  const body = req.body || {};
  const lat = numero(body?.exit?.lat);
  const lon = numero(body?.exit?.lon);
  const radius = Math.min(MAX_RADIUS, Math.max(100, numero(body.radius) || DEFAULT_RADIUS));
  const maxResultCount = Math.min(MAX_RESULTS, Math.max(1, Math.floor(numero(body.maxResultCount) || DEFAULT_MAX_RESULTS)));

  if (lat === null || lon === null || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return res.status(400).json({ error: "Coordinate del casello non valide." });
  }

  const originLat = numero(body?.searchOrigin?.lat);
  const originLon = numero(body?.searchOrigin?.lon);
  const originValido = originLat !== null && originLon !== null &&
    originLat >= -90 && originLat <= 90 && originLon >= -180 && originLon <= 180;

  const centri = [{ lat, lon, tipo: "uscita" }];

  // Se il dispositivo ha una posizione reale e si trova entro 5 km
  // dall'uscita, eseguiamo una seconda Nearby Search centrata su di lui.
  // In questo modo Google può restituire locali che non emergono nella
  // ricerca centrata esattamente sul casello. Il filtro stradale finale
  // del sito continua comunque a decidere quali risultati sono validi.
  if (originValido) {
    const distanza = distanzaMetri(lat, lon, originLat, originLon);
    if (distanza <= ONSITE_MAX_DISTANCE_METERS && distanza >= MIN_SECOND_CENTER_DISTANCE_METERS) {
      centri.push({ lat: originLat, lon: originLon, tipo: "posizione" });
    }
  }

  try {
    const risposte = await Promise.all(
      centri.map((centro) => cercaCentro(apiKey, centro, radius, maxResultCount))
    );

    const unici = new Map();
    for (const risposta of risposte) {
      for (const place of risposta.places || []) {
        if (place?.id && !unici.has(String(place.id))) {
          unici.set(String(place.id), place);
        }
      }
    }

    const places = Array.from(unici.values());

    return res.status(200).json({
      places,
      cache: risposte.every((r) => r.cache === "hit") ? "hit" : "mixed",
      ricercaInZona: centri.length > 1
    });
  } catch (error) {
    console.error("Google Places proxy error:", error);
    return res.status(502).json({ error: "Impossibile contattare Google Places." });
  }
};
