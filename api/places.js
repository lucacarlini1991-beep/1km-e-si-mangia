// Vercel Serverless Function
// POST /api/places
//
// La chiave Google NON va nel JavaScript del browser.
// Imposta su Vercel la variabile d'ambiente:
// GOOGLE_PLACES_API_KEY

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const apiKey =
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Chiave Google Places non configurata su Vercel."
    });
  }

  try {
    const body = req.body || {};
    const lat = Number(body?.exit?.lat);
    const lon = Number(body?.exit?.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({
        error: "Coordinate uscita non valide."
      });
    }

    // Cerchiamo Google fino a 5 km dall'uscita.
    // Il filtro definitivo del frontend continua a usare la distanza
    // stradale di 2 km, quindi aumentiamo solo la copertura della ricerca.
    const radiusRaw = Number(body.radius);
    const requestedRadius = Number.isFinite(radiusRaw) ? radiusRaw : 5000;
    const radius = Math.min(Math.max(requestedRadius, 5000), 5000);

    const maxRaw = Number(body.maxResultCount);
    const maxResultCount = Number.isFinite(maxRaw)
      ? Math.min(Math.max(Math.round(maxRaw), 1), 20)
      : 15;

    const googleResponse = await fetch(
      "https://places.googleapis.com/v1/places:searchNearby",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.types"
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
      }
    );

    const data = await googleResponse.json().catch(() => ({}));

    if (!googleResponse.ok) {
      console.error("Google Places API error:", googleResponse.status, data);
      return res.status(googleResponse.status).json({
        error:
          data?.error?.message ||
          `Google Places ha restituito HTTP ${googleResponse.status}`
      });
    }

    return res.status(200).json({
      places: Array.isArray(data?.places) ? data.places : []
    });
  } catch (error) {
    console.error("Errore /api/places:", error);
    return res.status(500).json({
      error: "Errore interno durante la ricerca Google Places."
    });
  }
}
