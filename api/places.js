// 1 KM E SI MANGIA - Google Places proxy
// La chiave Google resta esclusivamente in Vercel:
// GOOGLE_PLACES_API_KEY

const ENDPOINT = "https://places.googleapis.com/v1/places:searchNearby";
const DEFAULT_RADIUS = 2000;
const MAX_RADIUS = 2000;
const DEFAULT_MAX_RESULTS = 15;
const MAX_RESULTS = 20;

function numero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        // Solo i campi necessari per mostrare i locali.
        // Niente foto, recensioni, telefono, orari o altri dati costosi.
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
            center: {
              latitude: lat,
              longitude: lon
            },
            radius
          }
        }
      })
    });

    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (_) {
      data = {};
    }

    if (!response.ok) {
      console.error("Google Places error:", response.status, data?.error || text);
      return res.status(response.status).json({
        error: data?.error?.message || `Google Places HTTP ${response.status}`
      });
    }

    return res.status(200).json({
      places: Array.isArray(data.places) ? data.places : []
    });
  } catch (error) {
    console.error("Google Places proxy error:", error);
    return res.status(502).json({ error: "Impossibile contattare Google Places." });
  }
};
