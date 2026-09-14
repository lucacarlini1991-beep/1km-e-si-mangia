// Server-side proxy for the public fuel search.
// The frontend only talks to /api/fuel-nearby.
const UPSTREAM = process.env.FUEL_UPSTREAM_URL || "https://pyiheodneyvtcotuonpt.supabase.co/functions/v1/fuel-nearby";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });

  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    return res.status(400).json({ error: "invalid_coordinates" });
  }

  const radius = Math.min(Math.max(Number(req.query.radius) || 10, 0.5), 30);
  const limit = Math.min(Math.max(Math.floor(Number(req.query.limit) || 100), 1), 150);

  try {
    const upstream = new URL(UPSTREAM);
    upstream.searchParams.set("lat", lat);
    upstream.searchParams.set("lon", lon);
    upstream.searchParams.set("radius", radius);
    upstream.searchParams.set("limit", limit);

    const response = await fetch(upstream, {
      headers: { "Accept": "application/json", "User-Agent": "1KM-e-SI-MANGIA/1.0" }
    });
    const data = await response.json();
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=60");
    return res.status(response.status).json(data);
  } catch {
    return res.status(502).json({ error: "fuel_service_unavailable" });
  }
}