// 1 KM E SI MANGIA - Vercel API - Google Places Nearby Search
// La chiave resta SOLO lato server: GOOGLE_PLACES_API_KEY

export default async function handler(req, res) {
  try {
    const lat = Number(req.query?.lat);
    const lng = Number(req.query?.lng);
    const radius = Math.min(Math.max(Number(req.query?.radius) || 2100, 100), 5000);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        ok: false,
        error: "Coordinate GPS non valide."
      });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      console.error("Google Places: manca GOOGLE_PLACES_API_KEY");
      return res.status(500).json({
        ok: false,
        error: "Google Places non configurato sul server."
      });
    }

    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchNearby",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.location,places.formattedAddress,places.googleMapsUri,places.rating,places.userRatingCount,places.regularOpeningHours.openNow"
        },
        body: JSON.stringify({
          includedTypes: ["restaurant"],
          maxResultCount: 20,
          rankPreference: "DISTANCE",
          languageCode: "it",
          regionCode: "IT",
          locationRestriction: {
            circle: {
              center: {
                latitude: lat,
                longitude: lng
              },
              radius
            }
          }
        })
      }
    );

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Google Places risposta non JSON:", response.status, text);
      return res.status(502).json({
        ok: false,
        error: "Risposta non valida da Google Places."
      });
    }

    if (!response.ok) {
      console.error("Google Places API:", response.status, data);
      return res.status(response.status >= 500 ? 502 : response.status).json({
        ok: false,
        error: data?.error?.message || "Errore Google Places."
      });
    }

    const places = Array.isArray(data.places)
      ? data.places.map((place) => ({
          id: place.id || "",
          nome: place.displayName?.text || "Ristorante",
          lat: Number(place.location?.latitude),
          lng: Number(place.location?.longitude),
          indirizzo: place.formattedAddress || "",
          googleMapsUri: place.googleMapsUri || "",
          rating: Number.isFinite(Number(place.rating)) ? Number(place.rating) : null,
          userRatingCount: Number.isFinite(Number(place.userRatingCount)) ? Number(place.userRatingCount) : null,
          openNow: typeof place.regularOpeningHours?.openNow === "boolean"
            ? place.regularOpeningHours.openNow
            : null
        })).filter(place =>
          Number.isFinite(place.lat) &&
          Number.isFinite(place.lng)
        )
      : [];

    return res.status(200).json({
      ok: true,
      source: "google-places",
      center: { lat, lng },
      radius,
      count: places.length,
      places
    });
  } catch (error) {
    console.error("Google Places server error:", error);
    return res.status(500).json({
      ok: false,
      error: "Errore interno Google Places."
    });
  }
}
