// 1 KM E SI MANGIA - Google Routes proxy
// Calcola la distanza stradale reale tra uscita e ristorante.
// Se Google Routes non e' disponibile, usa un fallback prudente
// per non far sparire locali realmente adiacenti al casello.

const ENDPOINT = "https://routes.googleapis.com/directions/v2:computeRoutes";

function distanzaGeograficaMetri(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metodo non consentito." });
  }

  const apiKey =
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_API_KEY;

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

    // Fallback prudente: solo per locali molto vicini in linea d'aria.
    // Serve esclusivamente a evitare falsi "nessun ristorante" quando
    // Google Routes/OSRM non riesce a calcolare il percorso dal casello.
    const straight = distanzaGeograficaMetri(oLat, oLon, dLat, dLon);

    if (!apiKey) {
      if (straight <= 900) {
        return res.status(200).json({
          distanceMeters: Math.round(straight),
          fallback: true
        });
      }
      return res.status(500).json({ error: "Google Routes non configurato sul server." });
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

    if (response.ok) {
      const distance = Number(data?.routes?.[0]?.distanceMeters);
      if (Number.isFinite(distance)) {
        return res.status(200).json({
          distanceMeters: distance,
          fallback: false
        });
      }
    }

    // Google Routes ha risposto con errore oppure senza percorso.
    // Non facciamo sparire un ristorante che e' realmente molto vicino.
    if (straight <= 900) {
      console.warn("Google Routes fallback geografico", {
        status: response.status,
        straight
      });
      return res.status(200).json({
        distanceMeters: Math.round(straight),
        fallback: true
      });
    }

    const message = data?.error?.message || `Google Routes HTTP ${response.status}`;
    console.error("Google Routes API error:", response.status, message);
    return res.status(response.status || 502).json({ error: message });
  } catch (error) {
    // Anche in caso di timeout/errore di rete, recuperiamo solo i casi
    // chiaramente vicini al casello.
    try {
      const body = req.body || {};
      const o = body.origin || {};
      const d = body.destination || {};
      const straight = distanzaGeograficaMetri(Number(o.lat), Number(o.lon), Number(d.lat), Number(d.lon));
      if (Number.isFinite(straight) && straight <= 900) {
        return res.status(200).json({
          distanceMeters: Math.round(straight),
          fallback: true
        });
      }
    } catch (_) {}

    console.error("Errore /api/route:", error);
    return res.status(500).json({ error: "Errore interno durante il calcolo della distanza stradale." });
  }
};
