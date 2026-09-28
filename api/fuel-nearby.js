// Server-side fuel proxy.
// Primary source: official MIMIT Osservaprezzi live endpoint.
// Fallback: Supabase cache, explicitly marked as cached/stale with its timestamp.

const UPSTREAM = "https://carburanti.mise.gov.it/ospzApi/search/zone";
const SUPABASE_URL = "https://pyiheodneyvtcotuonpt.supabase.co";
const SUPABASE_KEY = "sb_publishable_6FGQBm1zXfwY8zVSuNmTlA_DRW5DMfQ";

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickFuel(fuels, names) {
  const rows = (Array.isArray(fuels) ? fuels : []).filter(Boolean);
  const matches = rows.filter(f => names.includes(String(f.name || "").trim().toLowerCase()));
  const self = matches.find(f => f.isSelf === true || f.isSelf === 1 || String(f.isSelf).toLowerCase() === "true");
  return num((self || matches[0] || {}).price);
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
    metano: pickFuel(fuels, ["metano", "cng"]),
    price_updated_at: new Date().toISOString()
  };
}

async function fetchWithTimeout(url, options, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function loadMimit(lat, lon, radius, limit) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetchWithTimeout(UPSTREAM, {
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
      }, 8000);

      if (!response.ok) throw new Error("mimit_http_" + response.status);
      const data = await response.json();
      if (!data || data.success === false || !Array.isArray(data.results)) {
        throw new Error("mimit_invalid_response");
      }

      return data.results
        .map(s => normalizeStation(s, lat, lon))
        .filter(Boolean)
        .filter(s => s.distance_km <= radius + 0.15)
        .sort((a, b) => a.distance_km - b.distance_km)
        .slice(0, limit);
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 350));
    }
  }
  throw lastError || new Error("mimit_unavailable");
}

function sbHeaders() {
  return {
    "apikey": SUPABASE_KEY,
    "Authorization": "Bearer " + SUPABASE_KEY,
    "Accept": "application/json"
  };
}

async function loadSupabaseCache(lat, lon, radius, limit) {
  // Query a geographic bounding box first; exact distance is calculated locally.
  const latDelta = radius / 111.32;
  const lonDelta = radius / Math.max(20, 111.32 * Math.cos(lat * Math.PI / 180));
  const params = new URLSearchParams({
    select: "mimit_id,name,brand,address,municipality,lat,lon,active,imported_at",
    active: "eq.true",
    lat: "gte." + (lat - latDelta) + ",lte." + (lat + latDelta),
    lon: "gte." + (lon - lonDelta) + ",lte." + (lon + lonDelta),
    order: "imported_at.desc",
    limit: "300"
  });

  // PostgREST cannot combine two operators in one value reliably on all versions,
  // so build the range parameters explicitly.
  params.delete("lat");
  params.delete("lon");
  params.set("lat", "gte." + (lat - latDelta));
  params.append("lat", "lte." + (lat + latDelta));
  params.set("lon", "gte." + (lon - lonDelta));
  params.append("lon", "lte." + (lon + lonDelta));

  const stationsResponse = await fetchWithTimeout(
    SUPABASE_URL + "/rest/v1/fuel_stations?" + params.toString(),
    { headers: sbHeaders() },
    6000
  );
  if (!stationsResponse.ok) throw new Error("supabase_stations_http_" + stationsResponse.status);
  const stations = await stationsResponse.json();

  const nearby = stations
    .map(s => ({
      ...s,
      distance_km: haversineKm(lat, lon, num(s.lat), num(s.lon))
    }))
    .filter(s => Number.isFinite(s.distance_km) && s.distance_km <= radius + 0.15)
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, limit);

  if (!nearby.length) return [];

  const ids = nearby.map(s => s.mimit_id).filter(Boolean);
  const inList = ids.map(id => '"' + String(id).replace(/"/g, '') + '"').join(",");
  const priceUrl = SUPABASE_URL + "/rest/v1/fuel_prices?select=station_mimit_id,fuel_type,sale_type,price,updated_at&station_mimit_id=in.(" + encodeURIComponent(inList) + ")";
  const pricesResponse = await fetchWithTimeout(priceUrl, { headers: sbHeaders() }, 6000);
  if (!pricesResponse.ok) throw new Error("supabase_prices_http_" + pricesResponse.status);
  const prices = await pricesResponse.json();

  const byStation = {};
  for (const p of prices || []) {
    const id = String(p.station_mimit_id || "");
    if (!byStation[id]) byStation[id] = [];
    byStation[id].push(p);
  }

  function cachedPrice(id, type) {
    const rows = (byStation[id] || []).filter(p => String(p.fuel_type || "").toLowerCase() === type);
    const self = rows.find(p => String(p.sale_type || "").toLowerCase() === "self");
    return num((self || rows[0] || {}).price);
  }

  function cachedUpdated(id) {
    return (byStation[id] || [])
      .map(p => p.updated_at)
      .filter(Boolean)
      .sort()
      .pop() || null;
  }

  return nearby.map(s => ({
    mimit_id: String(s.mimit_id || ""),
    name: s.name || s.brand || "Distributore carburanti",
    brand: s.brand || s.name || "Distributore carburanti",
    address: s.address || "",
    municipality: s.municipality || "",
    lat: num(s.lat),
    lon: num(s.lon),
    distance_km: s.distance_km,
    benzina: cachedPrice(String(s.mimit_id), "benzina"),
    gasolio: cachedPrice(String(s.mimit_id), "gasolio"),
    gpl: cachedPrice(String(s.mimit_id), "gpl"),
    metano: cachedPrice(String(s.mimit_id), "metano"),
    price_updated_at: cachedUpdated(String(s.mimit_id)),
    cached: true
  }));
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });

  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    return res.status(400).json({ error: "invalid_coordinates" });
  }

  const radiusRequested = Math.min(Math.max(Number(req.query.radius) || 10, 0.5), 30);
  // MIMIT currently caps this endpoint at 10 km.
  const radius = Math.min(radiusRequested, 10);
  const limit = Math.min(Math.max(Math.floor(Number(req.query.limit) || 100), 1), 150);

  try {
    const stations = await loadMimit(lat, lon, radius, limit);
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    res.setHeader("X-Fuel-Source", "MIMIT-live");
    return res.status(200).json({
      success: true,
      source: "MIMIT Osservaprezzi Carburanti",
      source_live: true,
      requested_radius_km: radiusRequested,
      effective_radius_km: radius,
      stations
    });
  } catch (mimitError) {
    try {
      const stations = await loadSupabaseCache(lat, lon, radius, limit);
      const newest = stations.map(s => s.price_updated_at).filter(Boolean).sort().pop() || null;
      res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
      res.setHeader("X-Fuel-Source", "Supabase-cache");
      return res.status(200).json({
        success: true,
        source: "MIMIT Osservaprezzi Carburanti",
        source_live: false,
        cached: true,
        cache_updated_at: newest,
        warning: "Prezzi temporaneamente recuperati dalla cache. Data ultimo aggiornamento indicata per ogni distributore.",
        requested_radius_km: radiusRequested,
        effective_radius_km: radius,
        stations
      });
    } catch (cacheError) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(503).json({
        error: "fuel_service_unavailable",
        source: "MIMIT Osservaprezzi Carburanti",
        message: "Il servizio prezzi MIMIT non è momentaneamente raggiungibile e non è disponibile una cache.",
        details: {
          mimit: String(mimitError?.message || mimitError),
          cache: String(cacheError?.message || cacheError)
        }
      });
    }
  }
}
