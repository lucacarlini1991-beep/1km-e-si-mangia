// 1 KM E SI MANGIA - controllo server API
// NON restituisce mai le chiavi.

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  "https://pyiheodneyvtcotuonpt.supabase.co";

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      error: "Metodo non consentito."
    });
  }

  const googleConfigured =
    Boolean(process.env.GOOGLE_PLACES_API_KEY);

  const supabaseConfigured =
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  let supabaseConnection = false;

  if (supabaseConfigured) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/google_places_cache?select=cache_key&limit=1`,
        {
          method: "GET",
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization:
              `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
          }
        }
      );

      supabaseConnection = response.ok;
    } catch (error) {
      console.error(
        "Supabase health check error:",
        error
      );
    }
  }

  return res.status(200).json({
    ok:
      googleConfigured &&
      supabaseConfigured &&
      supabaseConnection,

    google_places_api_key:
      googleConfigured ? "OK" : "MISSING",

    supabase_service_role_key:
      supabaseConfigured ? "OK" : "MISSING",

    supabase_connection:
      supabaseConnection ? "OK" : "ERROR"
  });
};