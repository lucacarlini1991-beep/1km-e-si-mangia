/* 1 KM E SI MANGIA - fix UI + mappa */
(function () {
  "use strict";

  function normalizza(testo) {
    return String(testo || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function eAreaDiServizio(marker) {
    if (!marker) return false;
    const dati = marker.options?.uscita || marker.options?.exit || marker._uscita || marker._exit;
    const testo = normalizza(`${dati?.nome || dati?.name || dati?.descrizione || dati?.tipo || dati?.category || ""} ${marker.getPopup?.()?.getContent?.() || marker._popup?._content || ""}`);
    return ["area di servizio","area servizio","area di sosta","area sosta","area ristoro","stazione di servizio","stazione servizio","autogrill","service station","service area","rest area","rest stop","truck stop","motorway service","highway service"].some(p => testo.includes(p)) || /\barea\s+giovi\s+(est|ovest)\b/.test(testo);
  }

  function trovaCluster(map) {
    if (!map?.eachLayer) return null;
    let trovato = null;
    map.eachLayer(layer => {
      if (!trovato && layer && typeof layer.eachLayer === "function" && layer.options && "zoomToBoundsOnClick" in layer.options) trovato = layer;
    });
    return trovato;
  }

  function nascondiAreeDiServizio(cluster) {
    if (!cluster?.eachLayer) return;
    cluster.eachLayer(layer => {
      if (!eAreaDiServizio(layer)) return;
      layer.__areaServizioNascosta = true;
      if (layer.setOpacity) layer.setOpacity(0);
      if (layer._icon) layer._icon.style.display = "none";
      if (layer._shadow) layer._shadow.style.display = "none";
    });
  }

  function sistemaClusterMappa() {
    const map = window.appMap || window.map;
    if (!map) return false;
    const cluster = trovaCluster(map);
    if (!cluster) return false;

    nascondiAreeDiServizio(cluster);
    cluster.options.zoomToBoundsOnClick = false;
    cluster.options.removeOutsideVisibleBounds = false;
    cluster.options.maxClusterRadius = window.innerWidth <= 750 ? 30 : 40;

    if (!cluster._clickFix1km) {
      cluster._clickFix1km = true;
      cluster.on("clusterclick", event => {
        const gruppo = event.layer;
        if (!gruppo?.getAllChildMarkers) return;
        const markers = gruppo.getAllChildMarkers().filter(m => !m.__areaServizioNascosta);
        if (!markers.length) return;
        const bounds = L.latLngBounds([]);
        markers.forEach(m => { if (m?.getLatLng) bounds.extend(m.getLatLng()); });
        if (!bounds.isValid()) return;
        const zoomAttuale = map.getZoom();
        const zoomNecessario = map.getBoundsZoom(bounds, false, [55, 55]);
        map.flyTo(bounds.getCenter(), Math.min(14, Math.max(zoomAttuale + 2, zoomNecessario)), { animate: true, duration: 0.35 });
      });
    }
    return true;
  }

  function avviaFixMappa() {
    let tentativi = 0;
    const timer = setInterval(() => {
      tentativi++;
      if (sistemaClusterMappa() && tentativi >= 8 || tentativi >= 40) clearInterval(timer);
    }, 250);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", avviaFixMappa, { once: true });
  else avviaFixMappa();
})();
