// 1 KM E SI MANGIA - Google Routes proxy
// Calcola la distanza stradale reale tra uscita e ristorante.
// Usa la stessa chiave Google già configurata per Places.

const ENDPOINT = "https://routes.googleapis.com/directions/v2:computeRoutes";

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
    return res.status(500).json({ error: "Google Routes non configurato sul server." });
  }

  try {
    const body = req.body || {};
    const origin = body.origin || {};
    const destination = body.destination || {};

    const oLat = Number(origin.lat);
    const oLon = Number(origin.lon);
    const dLat = Number(destination.lat);
    const dLon = Number(destination.lon);

    if (![oLat, oLon, dLat, dLon].every(Number.isFinite)) {
      return res.status(400).json({ error: "Coordinate non valide." });
    }

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.distanceMeters"
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: oLat,
              longitude: oLon
            }
          }
        },
        destination: {
          location: {
            latLng: {
              latitude: dLat,
              longitude: dLon
            }
          }
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
        languageCode: "it",
        units: "METRIC"
      })
    });

    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (_) {}

    if (!response.ok) {
      const message = data?.error?.message || `Google Routes HTTP ${response.status}`;
      console.error("Google Routes API error:", response.status, message);
      return res.status(response.status).json({ error: message });
    }

    const distance = Number(data?.routes?.[0]?.distanceMeters);
    if (!Number.isFinite(distance)) {
      return res.status(502).json({ error: "Google Routes non ha restituito una distanza." });
    }

    return res.status(200).json({ distanceMeters: distance });
  } catch (error) {
    console.error("Errore /api/route:", error);
    return res.status(500).json({ error: "Errore interno durante il calcolo della distanza stradale." });
  }
};
