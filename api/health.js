module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      ok: false,
      error: "Metodo non consentito."
    });
  }

  const googleConfigured = Boolean(
    process.env.GOOGLE_PLACES_API_KEY
  );

  const supabaseConfigured = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  return res.status(200).json({
    ok: true,
    google_places_api_key: googleConfigured ? "OK" : "MISSING",
    supabase_service_role_key: supabaseConfigured ? "OK" : "MISSING",
    note: "I valori delle chiavi non vengono mai restituiti."
  });
};