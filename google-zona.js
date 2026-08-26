/*
 * 1 KM E SI MANGIA - Google Places in zona
 *
 * Non blocca mai la ricerca dei ristoranti sul GPS.
 * Se una posizione GPS valida è già disponibile e il dispositivo
 * si trova entro 5 km dall'uscita selezionata, aggiunge quella
 * posizione alla richiesta Google come secondo centro di ricerca.
 * Il filtro stradale esistente resta il filtro definitivo.
 */
(function () {
  "use strict";

  const originalFetch = window.fetch.bind(window);
  const URL_API = "/api/places";
  const MAX_DISTANCE_METERS = 5000;

  function numero(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function distanzaMetri(aLat, aLon, bLat, bLon) {
    const R = 6371000;
    const p1 = Number(aLat) * Math.PI / 180;
    const p2 = Number(bLat) * Math.PI / 180;
    const dp = (Number(bLat) - Number(aLat)) * Math.PI / 180;
    const dl = (Number(bLon) - Number(aLon)) * Math.PI / 180;
    const x = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  window.fetch = async function (input, init) {
    try {
      const url = typeof input === "string" ? input : input?.url;

      if (url && url.includes(URL_API) && init?.method === "POST" && typeof init.body === "string") {
        const body = JSON.parse(init.body);
        const exitLat = numero(body?.exit?.lat);
        const exitLon = numero(body?.exit?.lon);

        const posizione = window.GPSManager?.getLastPosition?.();
        const userLat = numero(posizione?.lat);
        const userLon = numero(posizione?.lng ?? posizione?.lon);

        if (exitLat !== null && exitLon !== null && userLat !== null && userLon !== null) {
          const distanza = distanzaMetri(exitLat, exitLon, userLat, userLon);

          if (distanza <= MAX_DISTANCE_METERS) {
            body.searchOrigin = {
              lat: userLat,
              lon: userLon
            };
          }
        }

        init = { ...init, body: JSON.stringify(body) };
      }
    } catch (error) {
      // In caso di qualsiasi problema lasciamo passare la richiesta originale.
      console.warn("Google zona: richiesta invariata", error);
    }

    return originalFetch(input, init);
  };

  console.log("✅ Google Places: ricerca aggiuntiva in zona attiva");
})();
