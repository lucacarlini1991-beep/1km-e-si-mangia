/* 1 KM E SI MANGIA - fix UI definitivo */
(function () {
  "use strict";

  function normalizza(v) {
    return String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  const paroleNascoste = [
    "svincolo", "svincoli", "snodo", "snodi", "interconnessione", "interconnessioni",
    "raccordo", "raccordi", "diramazione", "diramazioni", "bretella", "bretelle",
    "allacciamento", "allacciamenti", "deviazione", "deviazioni", "intersezione autostradale",
    "area di servizio", "area servizio", "area di sosta", "area sosta", "autogrill",
    "service area", "service station", "rest area", "truck stop"
  ];

  function daNascondere(u) {
    if (!u) return true;
    if (u.visibile === false || u.visualizza_mappa === false) return true;
    const tipo = normalizza(u.tipo);
    if (tipo.includes("servizio") || tipo.includes("autogrill") || tipo.includes("ristoro") || tipo.includes("sosta") || tipo === "area_servizio") return true;
    const testo = normalizza([u.nome, u.nome_autostrada, u.autostrada, u.description].join(" "));
    if (paroleNascoste.some(p => testo.includes(normalizza(p)))) return true;
    return /\barea\s+di\s+/.test(testo) && /\b(sud|nord|ovest|est)\b/.test(testo);
  }

  async function filtraMappa() {
    try {
      const response = await fetch("./uscite.json?ui-filter=20260827-3", { cache: "no-store" });
      if (!response.ok) return;
      const database = await response.json();
      const nascosti = (Array.isArray(database) ? database : []).filter(daNascondere);
      const chiavi = new Set(nascosti.map(u => `${Number(u.lat).toFixed(6)}|${Number(u.lon).toFixed(6)}`));
      if (!window.appMap || !chiavi.size) return;
      window.appMap.eachLayer(layer => {
        if (!layer || typeof layer.getLayers !== "function") return;
        layer.getLayers().slice().forEach(marker => {
          if (!marker.getLatLng) return;
          const p = marker.getLatLng();
          const key = `${Number(p.lat).toFixed(6)}|${Number(p.lng).toFixed(6)}`;
          if (chiavi.has(key)) layer.removeLayer(marker);
        });
      });
    } catch (_) {}
  }

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
    button.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); (panel.classList.contains("open") || panel.classList.contains("active")) ? chiudi() : apri(); });
    close?.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); chiudi(); });
    panel.addEventListener("click", e => { if (e.target === panel) chiudi(); });
    panel.querySelectorAll("a").forEach(a => a.addEventListener("click", chiudi));
    document.addEventListener("keydown", e => { if (e.key === "Escape") chiudi(); });
  }

  function raggruppaUscite() {
    if (!window.appMap || !window.L || typeof L.markerClusterGroup !== "function") return;

    const map = window.appMap;
    const clusters = [];
    const markersDiretti = [];

    map.eachLayer(layer => {
      if (!layer) return;
      if (layer instanceof L.MarkerClusterGroup) {
        clusters.push(layer);
        return;
      }
      // Solo i marker delle uscite: i ristoranti e gli altri layer vengono lasciati fuori.
      if (layer instanceof L.Marker && !layer.options?.restaurant) markersDiretti.push(layer);
    });

    let markers = [];
    clusters.forEach(cluster => {
      cluster.getLayers().forEach(m => markers.push(m));
      map.removeLayer(cluster);
    });

    markers.push(...markersDiretti);
    if (!markers.length) return;

    // Evita duplicati se un marker è stato trovato sia nel gruppo sia direttamente sulla mappa.
    const unici = [];
    const visti = new Set();
    markers.forEach(m => {
      if (!m || !m.getLatLng) return;
      const p = m.getLatLng();
      const key = `${p.lat.toFixed(7)}|${p.lng.toFixed(7)}`;
      if (visti.has(key)) return;
      visti.add(key);
      unici.push(m);
      if (map.hasLayer(m)) map.removeLayer(m);
    });

    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
      removeOutsideVisibleBounds: true,
      maxClusterRadius: 80,
      disableClusteringAtZoom: 12,
      animate: true
    });
    cluster.addLayers(unici);
    map.addLayer(cluster);
    window._clusterUsciteFix = cluster;
    console.log("Raggruppamento uscite ripristinato:", unici.length);
  }

  function avvia() {
    sistemaMenu();
    raggruppaUscite();
    filtraMappa();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", avvia, { once: true });
  else avvia();

  setTimeout(avvia, 1200);
  setTimeout(() => { sistemaMenu(); filtraMappa(); }, 3000);
})();
