// 1 KM E SI MANGIA - Google Places proxy
// Vercel Node Serverless Function (CommonJS)
//
// Cerca ristoranti con Google Places e applica un filtro forte
// per escludere distributori, Autogrill e aree di servizio.

const ENDPOINT = "https://places.googleapis.com/v1/places:searchNearby";

function normalizzaTesto(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contieneParola(testo, parola) {
  const t = ` ${normalizzaTesto(testo)} `;
  const p = ` ${normalizzaTesto(parola)} `;
  return t.includes(p);
}

// =====================================================
// FILTRO ATTIVITÀ AUTOSTRADALI / DISTRIBUTORI
// =====================================================
function eAttivitaDaEscludere(place) {
  const nome = normalizzaTesto(place?.displayName?.text);
  const indirizzo = normalizzaTesto(place?.formattedAddress);
  const tipi = Array.isArray(place?.types)
    ? place.types.map(normalizzaTesto)
    : [];
  const tipoPrincipale = normalizzaTesto(place?.primaryType);

  // Tipi Google che non devono mai arrivare all'utente.
  const tipiDaEscludere = new Set([
    "gas station",
    "convenience store",
    "rest stop",
    "truck stop",
    "fuel station"
  ]);

  if (
    tipiDaEscludere.has(tipoPrincipale) ||
    tipi.some(tipo => tipiDaEscludere.has(tipo))
  ) {
    return true;
  }

  // Marchi e termini tipici di distributori / aree di servizio.
  const marchiCarburante = [
    "tamoil",
    "autogrill",
    "eni",
    "agip",
    "q8",
    "esso",
    "shell",
    "ip",
    "totalenergies",
    "total",
    "saras",
    "api",
    "retitalia",
    "keropetrol",
    "petroli",
    "benzina",
    "diesel",
    "carburanti"
  ];

  if (marchiCarburante.some(parola => contieneParola(nome, parola))) {
    return true;
  }

  // Descrizioni inequivocabili di area di servizio/sosta.
  const paroleAreaServizio = [
    "area di servizio",
    "area servizio",
    "area di sosta",
    "area sosta",
    "area ristoro",
    "stazione di servizio",
    "stazione servizio",
    "service station",
    "service area",
    "rest area",
    "rest stop",
    "truck stop",
    "motorway service",
    "highway service",
    "autogrill"
  ];

  if (
    paroleAreaServizio.some(parola =>
      nome.includes(parola) || indirizzo.includes(parola)
    )
  ) {
    return true;
  }

  // Caso come Ronco Scrivia:
  // "GIOVI EST - A7 MI/GE KM 28 SNC".
  // Escludiamo l'attività quando l'indirizzo ha un riferimento
  // autostradale + chilometraggio, tipico delle aree di servizio.
  const autostrada = /\b(?:a\d+|ra\d+|ss\d+)\b/;
  const kmAutostradale = /\bkm\s*\d+/;
  const direzioneArea = /\b(?:est|ovest|nord|sud)\b/;

  if (
    kmAutostradale.test(indirizzo) &&
    (autostrada.test(indirizzo) || direzioneArea.test(indirizzo))
  ) {
    return true;
  }

  return false;
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

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 || lat > 90 ||
      lon < -180 || lon > 180
    ) {
      return res.status(400).json({
        error: "Coordinate del casello non valide."
      });
    }

    // Manteniamo il raggio richiesto dal frontend, entro i limiti Google.
    const radiusRaw = Number(body.radius);
    const radius = Number.isFinite(radiusRaw)
      ? Math.min(Math.max(radiusRaw, 100), 5000)
      : 2000;

    const rawMax = Number(body.maxResultCount);
    const maxResultCount = Number.isFinite(rawMax)
      ? Math.min(Math.max(Math.floor(rawMax), 1), 20)
      : 15;

    // Chiediamo fino a 20 risultati a Google e filtriamo DOPO.
    // In questo modo distributori/Autogrill non consumano tutti i posti.
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.primaryType"
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
      const message =
        data?.error?.message ||
        `Google Places HTTP ${response.status}`;
      console.error("Google Places API error:", response.status, message);
      return res.status(response.status).json({ error: message });
    }

    const placesGoogle = Array.isArray(data?.places)
      ? data.places
      : [];

    const esclusi = placesGoogle.filter(eAttivitaDaEscludere);
    const placesPuliti = placesGoogle
      .filter(place => !eAttivitaDaEscludere(place))
      .slice(0, maxResultCount);

    console.log("Google Places filtro", {
      ricevuti: placesGoogle.length,
      esclusi: esclusi.length,
      restituiti: placesPuliti.length,
      esclusiNomi: esclusi
        .map(place => place?.displayName?.text)
        .filter(Boolean)
    });

    return res.status(200).json({
      places: placesPuliti
    });
  } catch (error) {
    console.error("Errore /api/places:", error);
    return res.status(500).json({
      error: "Errore interno durante la ricerca Google Places."
    });
  }
};
