// Server-side proxy for the official MIMIT Osservaprezzi Carburanti API.
// The frontend only talks to /api/fuel-nearby, while prices are read live
// from the Ministry endpoint instead of the stale Supabase cache.

const UPSTREAM = "https://carburanti.mise.gov.it/ospzApi/search/zone";

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickFuel(fuels, names) {
  const rows = (Array.isArray(fuels) ? fuels : []).filter(Boolean);
  const matches = rows.filter(f => names.includes(String(f.name || "").trim().toLowerCase()));
  // Prefer self-service. If it is not available, keep the first reported price.
  const self = matches.find(f => f.isSelf === true || f.isSelf === 1 || String(f.isSelf).toLowerCase() === "true");
  return num((self || matches[0] || {}).price);
}

function normalizeStation(s, originLat, originLon) {
  const location = s?.location || {};
  const lat = num(location.lat);
  const lon = num(location.lng ?? location.lon);
  if (lat == null || lon == null) return null;

  const fuels = Array.isArray(s.fuels) ? s.fuels : [];
  const distance = num(s.distance);

  return {
    mimit_id: s.id != null ? String(s.id) : "",
    name: s.name || s.id || "Distributore carburanti",
    brand: s.brand || s.name || "Distributore carburanti",
    address: s.address || "",
    municipality: "",
    lat,
    lon,
    distance_km: distance != null ? distance : haversineKm(originLat, originLon, lat, lon),
    benzina: pickFuel(fuels, ["benzina"]),
    gasolio: pickFuel(fuels, ["gasolio"]),
    gpl: pickFuel(fuels, ["gpl"]),
    metano: pickFuel(fuels, ["metano", "cng"])
  };
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });

  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    return res.status(400).json({ error: "invalid_coordinates" });
  }

  const radiusRequested = Math.min(Math.max(Number(req.query.radius) || 10, 0.5), 30);
  const limit = Math.min(Math.max(Math.floor(Number(req.query.limit) || 100), 1), 150);

  try {
    // MIMIT currently caps this endpoint at 10 km.
    const radius = Math.min(radiusRequested, 10);
    const response = await fetch(UPSTREAM, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "1KM-e-SI-MANGIA/1.0"
      },
      body: JSON.stringify({
        points: [{ lat, lng: lon }],
        radius
      })
    });

    if (!response.ok) throw new Error("mimit_http_" + response.status);
    const data = await response.json();
    if (!data || data.success === false || !Array.isArray(data.results)) {
      throw new Error("mimit_invalid_response");
    }

    const stations = data.results
      .map(s => normalizeStation(s, lat, lon))
      .filter(Boolean)
      .filter(s => s.distance_km <= radius + 0.15)
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, limit);

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    res.setHeader("X-Fuel-Source", "MIMIT-live");
    res.setHeader("X-Fuel-Source-Radius", String(radius));
    return res.status(200).json({
      success: true,
      source: "MIMIT Osservaprezzi Carburanti",
      source_live: true,
      requested_radius_km: radiusRequested,
      effective_radius_km: radius,
      stations
    });
  } catch (error) {
    // Keep the endpoint explicit if MIMIT is temporarily unavailable.
    // We do not silently serve stale prices as if they were current.
    res.setHeader("Cache-Control", "no-store");
    return res.status(503).json({
      error: "fuel_service_unavailable",
      source: "MIMIT Osservaprezzi Carburanti",
      message: "Il servizio prezzi MIMIT non è momentaneamente raggiungibile."
    });
  }
}
