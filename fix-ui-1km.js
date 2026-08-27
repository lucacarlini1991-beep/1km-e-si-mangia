/* 1 KM E SI MANGIA - fix UI + mappa
   Gestisce il menu e piccoli fix esclusivamente lato interfaccia.
   Non modifica il database delle uscite.
*/
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
      e.preventDefault();
      e.stopPropagation();
      (panel.classList.contains("open") || panel.classList.contains("active")) ? chiudi() : apri();
    });

    close?.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      chiudi();
    });

    panel.addEventListener("click", e => {
      if (e.target === panel) chiudi();
    });

    panel.querySelectorAll("a").forEach(a => a.addEventListener("click", chiudi));
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") chiudi();
    });
  }

  function normalizza(testo) {
    return String(testo || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function trovaCluster(map) {
    if (!map?.eachLayer) return null;
    let trovato = null;
    map.eachLayer(layer => {
      if (!trovato && layer && typeof layer.eachLayer === "function" && layer.options && "zoomToBoundsOnClick" in layer.options) {
        trovato = layer;
      }
    });
    return trovato;
  }

  function eAreaDiServizio(marker) {
    if (!marker) return false;

    const dati = marker.options?.uscita || marker.options?.exit || marker._uscita || marker._exit;
    const testoDati = normalizza(
      dati?.nome || dati?.name || dati?.descrizione || dati?.tipo || dati?.category
    );

    const testoPopup = normalizza(
      marker.getPopup?.()?.getContent?.() || marker._popup?._content || ""
    );

    const testo = `${testoDati} ${testoPopup}`;

    const paroleServizio = [
      "area di servizio",
      "area servizio",
      "area di sosta",
      "area sosta",
      "area ristoro",
      "stazione di servizio",
      "stazione servizio",
      "autogrill",
      "service station",
      "service area",
      "rest area",
      "rest stop",
      "truck stop",
      "motorway service",
      "highway service"
    ];

    if (paroleServizio.some(p => testo.includes(p))) return true;
    if (/\barea\s+giovi\s+(est|ovest)\b/.test(testo)) return true;

    const autostradaKm = /\b(?:a\d+|ra\d+|ss\d+)\s*(?:mi|me|ge|na|bo|rm|fi|to|ve|pd|ts|ba|it)?\s*km\s*\d+/;
    if (autostradaKm.test(testo) && /\b(?:est|ovest|nord|sud)\b/.test(testo)) return true;

    return false;
  }

  function filtraAreeDiServizioMappa(cluster) {
    if (!cluster) return;

    const daRimuovere = [];
    cluster.eachLayer(layer => {
      if (eAreaDiServizio(layer)) daRimuovere.push(layer);
    });

    if (daRimuovere.length) {
      daRimuovere.forEach(layer => cluster.removeLayer(layer));
      console.log("Aree di servizio escluse dalla mappa:", daRimuovere.length);
    }
  }

  function sistemaClusterMappa() {
    const map = window.appMap || window.map;
    if (!map) return false;

    const cluster = trovaCluster(map);
    if (!cluster) return false;

    cluster.options.zoomToBoundsOnClick = false;
    cluster.options.removeOutsideVisibleBounds = false;
    cluster.options.maxClusterRadius = window.innerWidth <= 750 ? 30 : 40;

    if (!cluster._clickFix1km) {
      cluster._clickFix1km = true;
      cluster.on("clusterclick", function (event) {
        const gruppo = event.layer;
        if (!gruppo || typeof gruppo.getAllChildMarkers !== "function") return;

        const markers = gruppo.getAllChildMarkers();
        if (!markers.length) return;

        const bounds = L.latLngBounds([]);
        markers.forEach(marker => {
          if (marker?.getLatLng) bounds.extend(marker.getLatLng());
        });
        if (!bounds.isValid()) return;

        const centro = bounds.getCenter();
        const zoomAttuale = map.getZoom();
        const zoomNecessario = map.getBoundsZoom(bounds, false, [55, 55]);
        const zoomTarget = Math.min(14, Math.max(zoomAttuale + 2, zoomNecessario));

        map.flyTo(centro, zoomTarget, {
          animate: true,
          duration: 0.35
        });
      });
    }

    filtraAreeDiServizioMappa(cluster);

    if (typeof cluster.refreshClusters === "function") {
      cluster.refreshClusters();
    }

    return true;
  }

  function avviaFixMappa() {
    let tentativi = 0;
    const timer = setInterval(() => {
      tentativi++;
      const pronta = sistemaClusterMappa();
      if (pronta && tentativi >= 8) clearInterval(timer);
      if (tentativi >= 40) clearInterval(timer);
    }, 250);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      sistemaMenu();
      avviaFixMappa();
    }, { once: true });
  } else {
    sistemaMenu();
    avviaFixMappa();
  }
})();
