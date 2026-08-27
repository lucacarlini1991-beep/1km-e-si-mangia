// 1 KM E SI MANGIA - Google Places proxy
// Vercel Node Serverless Function (CommonJS)
//
// Variabile Vercel consigliata: GOOGLE_PLACES_API_KEY
// Sono accettati anche GOOGLE_MAPS_API_KEY e GOOGLE_API_KEY.

const ENDPOINT = "https://places.googleapis.com/v1/places:searchNearby";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metodo non consentito." });
  }

  const apiKey =
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.error("Nessuna chiave Google Places configurata.");
    return res.status(500).json({
      error: "Google Places non configurato sul server."
    });
  }

  try {
    const body = req.body || {};
    const lat = Number(body?.exit?.lat);
    const lon = Number(body?.exit?.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({
        error: "Coordinate del casello non valide."
      });
    }

    // Google cerca in un'area più ampia.
    // Il limite vero resta quello del frontend: massimo 2 km DI STRADA.
    const radius = 5000;
    const rawMax = Number(body.maxResultCount);
    const maxResultCount = Number.isFinite(rawMax)
      ? Math.min(Math.max(Math.floor(rawMax), 1), 20)
      : 15;

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types"
      },
      body: JSON.stringify({
        // IMPORTANTE: la ricerca parte sempre dall'uscita selezionata.
        // Non usiamo il GPS dell'utente come centro della ricerca.
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
      const message = data?.error?.message || `Google Places HTTP ${response.status}`;
      console.error("Google Places API error:", response.status, message);
      return res.status(response.status).json({ error: message });
    }

    const places = Array.isArray(data?.places) ? data.places : [];

    return res.status(200).json({ places });
  } catch (error) {
    console.error("Errore /api/places:", error);
    return res.status(500).json({
      error: "Errore interno durante la ricerca Google Places."
    });
  }
};
