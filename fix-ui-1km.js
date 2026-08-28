/* 1 KM E SI MANGIA - fix UI + mappa */
(function () {
  "use strict";

  function sistemaMenu() {
    const button = document.getElementById("menuButton") || document.querySelector(".menu-button");
    const panel = document.getElementById("mobileMenu") || document.querySelector(".mobile-menu") || document.getElementById("menuOverlay") || document.querySelector(".menu-overlay");
    const close = document.getElementById("menuClose") || document.querySelector(".menu-close");
    if (!button || !panel || button.dataset.menuFix === "1") return;
    button.dataset.menuFix = "1";
    function chiudi() {
      panel.classList.remove("open", "active");
      panel.setAttribute("aria-hidden", "true");
      panel.style.visibility = "hidden";
      panel.style.opacity = "0";
      panel.style.pointerEvents = "none";
      document.body.classList.remove("menu-open");
      button.setAttribute("aria-expanded", "false");
    }
    function apri() {
      panel.classList.add("open", "active");
      panel.setAttribute("aria-hidden", "false");
      panel.style.visibility = "visible";
      panel.style.opacity = "1";
      panel.style.pointerEvents = "auto";
      panel.style.zIndex = "9999";
      document.body.classList.add("menu-open");
      button.setAttribute("aria-expanded", "true");
    }
    chiudi();
    button.addEventListener("click", e => {
      e.preventDefault(); e.stopPropagation();
      (panel.classList.contains("open") || panel.classList.contains("active")) ? chiudi() : apri();
    });
    close?.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); chiudi(); });
    panel.addEventListener("click", e => { if (e.target === panel) chiudi(); });
    panel.querySelectorAll("a").forEach(a => a.addEventListener("click", chiudi));
    document.addEventListener("keydown", e => { if (e.key === "Escape") chiudi(); });
  }

  function normalizza(testo) {
    return String(testo || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function eAreaDiServizio(marker) {
    if (!marker) return false;
    const dati = marker.options?.uscita || marker.options?.exit || marker._uscita || marker._exit;
    const testo = normalizza(`${dati?.nome || dati?.name || dati?.descrizione || dati?.tipo || dati?.category || ""} ${marker.getPopup?.()?.getContent?.() || marker._popup?._content || ""}`);
    const parole = ["area di servizio","area servizio","area di sosta","area sosta","area ristoro","stazione di servizio","stazione servizio","autogrill","service station","service area","rest area","rest stop","truck stop","motorway service","highway service"];
    if (parole.some(p => testo.includes(p))) return true;
    if (/\barea\s+giovi\s+(est|ovest)\b/.test(testo)) return true;
    const areaConDirezione = /\barea\s+(?:di\s+)?[a-z0-9' -]+\s+(est|ovest|nord|sud)\b/;
    if (areaConDirezione.test(testo)) return true;
    const autostradaKm = /\b(?:a\d+|ra\d+|ss\d+)\s*(?:mi|me|ge|na|bo|rm|fi|to|ve|pd|ts|ba|it)?\s*km\s*\d+/;
    return autostradaKm.test(testo) && /\b(?:est|ovest|nord|sud)\b/.test(testo);
  }

  function rimuoviAreaDiServizio(cluster, layer) {
    if (!layer || !eAreaDiServizio(layer)) return false;
    layer.__areaServizioNascosta = true;
    if (layer.closePopup) layer.closePopup();
    if (cluster?.removeLayer) {
      cluster.removeLayer(layer);
    } else if (layer.setOpacity) {
      layer.setOpacity(0);
      if (layer._icon) layer._icon.style.display = "none";
      if (layer._shadow) layer._shadow.style.display = "none";
    }
    return true;
  }

  /* Le aree di servizio NON devono mai entrare nella mappa visibile.
     Le togliamo dal layer della mappa, ma NON dal database: un futuro
     aggiornamento OSM non potrà quindi farle comparire per errore. */
  function nascondiAreeDiServizio(cluster) {
    if (!cluster?.eachLayer) return;
    const daRimuovere = [];
    cluster.eachLayer(layer => {
      if (eAreaDiServizio(layer)) daRimuovere.push(layer);
    });
    daRimuovere.forEach(layer => rimuoviAreaDiServizio(cluster, layer));
  }

  function trovaCluster(map) {
    if (!map?.eachLayer) return null;
    let trovato = null;
    map.eachLayer(layer => {
      if (!trovato && layer && typeof layer.eachLayer === "function" && layer.options && "zoomToBoundsOnClick" in layer.options) trovato = layer;
    });
    return trovato;
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
        const markers = gruppo.getAllChildMarkers().filter(m => !m.__areaServizioNascosta && !eAreaDiServizio(m));
        if (!markers.length) return;
        const bounds = L.latLngBounds([]);
        markers.forEach(m => { if (m?.getLatLng) bounds.extend(m.getLatLng()); });
        if (!bounds.isValid()) return;
        const zoomAttuale = map.getZoom();
        const zoomNecessario = map.getBoundsZoom(bounds, false, [55, 55]);
        const zoomTarget = Math.min(14, Math.max(zoomAttuale + 2, zoomNecessario));
        map.flyTo(bounds.getCenter(), zoomTarget, { animate: true, duration: 0.35 });
      });
    }

    if (!map._serviceAreaFix1km) {
      map._serviceAreaFix1km = true;
      map.on("popupopen", event => {
        const source = event?.popup?._source;
        if (source && eAreaDiServizio(source)) {
          if (event.popup) map.closePopup(event.popup);
          rimuoviAreaDiServizio(cluster, source);
          setTimeout(() => sistemaClusterMappa(), 0);
        }
      });
    }
    return true;
  }

  function avviaFixMappa() {
    let tentativi = 0;
    const timer = setInterval(() => {
      tentativi++;
      const pronta = sistemaClusterMappa();
      if (pronta && tentativi >= 40) clearInterval(timer);
      if (tentativi >= 80) clearInterval(timer);
    }, 250);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { sistemaMenu(); avviaFixMappa(); }, { once: true });
  } else {
    sistemaMenu(); avviaFixMappa();
  }
})();
