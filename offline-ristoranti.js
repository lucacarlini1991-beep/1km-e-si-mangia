// 1 KM E SI MANGIA
// Ricerca locale OFFLINE migliorata.
// Usa tutto ristoranti.json per trovare candidati vicini all'uscita,
// anche quando il ristorante nel database e' stato associato a un'altra uscita.
(function () {
  "use strict";

  function distanzaMetri(aLat, aLon, bLat, bLon) {
    const R = 6371000;
    const p1 = Number(aLat) * Math.PI / 180;
    const p2 = Number(bLat) * Math.PI / 180;
    const dp = (Number(bLat) - Number(aLat)) * Math.PI / 180;
    const dl = (Number(bLon) - Number(aLon)) * Math.PI / 180;
    const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function candidatiOffline(uscita) {
    if (!uscita || !Array.isArray(window.__1kmOfflineDb)) return [];

    const lat = Number(uscita.lat);
    const lon = Number(uscita.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];

    const trovati = window.__1kmOfflineDb
      .filter(r => Number.isFinite(Number(r?.lat)) && Number.isFinite(Number(r?.lon)))
      .map(r => ({
        r,
        d: distanzaMetri(lat, lon, r.lat, r.lon)
      }))
      // Un ristorante a 4 km in linea d'aria puo' ancora essere entro 2 km
      // di strada in casi particolari; il filtro definitivo e' stradale.
      .filter(x => x.d <= 4500)
      .sort((a, b) => a.d - b.d)
      .slice(0, 40)
      .map(x => x.r);

    return trovati;
  }

  async function ricercaOfflineCompleta(uscita) {
    const locali = candidatiOffline(uscita);
    try {
      return await filtraRistorantiPerStrada(uscita, locali);
    } catch (e) {
      console.warn("Filtro stradale offline non disponibile:", e);
      return locali.filter(r => {
        const d = distanzaMetri(uscita.lat, uscita.lon, r.lat, r.lon);
        return d <= 2200;
      });
    }
  }

  async function ricercaCompleta(uscita) {
    if (!uscita) return;

    chiudiPannelloRistoranti();

    let locali = [];
    try {
      locali = await ricercaOfflineCompleta(uscita);
    } catch (e) {
      console.warn("Ricerca offline ristoranti fallita:", e);
    }

    window._ristorantiVisualizzati = locali;
    mostraRistorantiDatabase(uscita, locali);

    try {
      const response = await fetch("/api/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exit: { lat: Number(uscita.lat), lon: Number(uscita.lon) },
          radius: 2000,
          maxResultCount: 20
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);

      const google = Array.isArray(data.places) ? data.places : [];
      const combinati = unisciRistorantiGoogle(locali, google, uscita);
      let finali = [];

      try {
        finali = await filtraRistorantiPerStrada(uscita, combinati);
      } catch (e) {
        finali = locali;
      }

      window._ristorantiVisualizzati = finali;
      mostraRistorantiDatabase(uscita, finali);

      if (!finali.length) {
        mostraAvvisoGoogle(
          "0 ristoranti trovati",
          "Nessun ristorante entro 2 km di strada da questa uscita."
        );
      }
    } catch (e) {
      console.warn("Google Places non disponibile:", e);
      mostraRistorantiDatabase(uscita, locali);
      if (!locali.length) {
        mostraAvvisoGoogle(
          "0 ristoranti trovati",
          "Nessun ristorante trovato nel database offline vicino a questa uscita."
        );
      }
    }
  }

  // Il listener viene registrato PRIMA di quello del dist/script.js:
  // intercetta il click sull'uscita e usa la ricerca offline completa.
  document.addEventListener("click", function (event) {
    const button = event.target.closest && event.target.closest("[data-ristoranti-uscita]");
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const id = button.getAttribute("data-ristoranti-uscita");
    const uscita = Array.isArray(window.__1kmUsciteDb)
      ? window.__1kmUsciteDb.find(item => String(item.id || "") === String(id))
      : null;

    if (uscita) ricercaCompleta(uscita);
  }, true);

  // Dopo il caricamento del database principale, lo rendiamo disponibile
  // al modulo offline senza duplicarlo nel repository.
  const preparaDb = () => {
    try {
      if (Array.isArray(ristorantiDatabase)) window.__1kmOfflineDb = ristorantiDatabase.slice();
      if (Array.isArray(usciteItaliane)) window.__1kmUsciteDb = usciteItaliane.slice();
    } catch (_) {}
  };

  setTimeout(preparaDb, 1000);
  setTimeout(preparaDb, 2500);
  setTimeout(preparaDb, 5000);
})();
