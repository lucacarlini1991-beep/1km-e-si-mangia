/* 1 KM E SI MANGIA - protezioni UI definitive */
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
    if (/\barea\s+di\s+/.test(testo) && /\b(sud|nord|ovest|est)\b/.test(testo)) return true;
    return false;
  }

  async function filtraMappa() {
    try {
      const response = await fetch("./uscite.json?ui-filter=20260827-2", { cache: "no-store" });
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
    } catch (error) {
      console.warn("Filtro uscite non disponibile:", error);
    }
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
    button.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const aperto = panel.classList.contains("open") || panel.classList.contains("active");
      aperto ? chiudi() : apri();
    });
    close?.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      chiudi();
    });
    panel.addEventListener("click", function (e) {
      if (e.target === panel) chiudi();
    });
    panel.querySelectorAll("a").forEach(a => a.addEventListener("click", chiudi));
    document.addEventListener("keydown", e => { if (e.key === "Escape") chiudi(); });
  }

  async function assicuraMappa() {
    // Se lo script principale ha gia' creato la mappa, non facciamo nulla.
    if (window.appMap || !window.L || !document.getElementById("map")) return;

    try {
      const map = L.map("map", { center: [42.5, 12.5], zoom: 6, scrollWheelZoom: true });
      window.appMap = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      const dati = await fetch("./uscite.json?fallback-map=20260827-2", { cache: "no-store" }).then(r => r.json());
      const validi = (Array.isArray(dati) ? dati : []).filter(u => !daNascondere(u) && Number.isFinite(Number(u.lat)) && Number.isFinite(Number(u.lon)));
      const layer = L.layerGroup().addTo(map);
      const bounds = [];

      validi.forEach(u => {
        const marker = L.circleMarker([Number(u.lat), Number(u.lon)], {
          radius: 9, color: "#ffffff", weight: 3, fillColor: "#f5a719", fillOpacity: 1
        });
        const id = String(u.id || "").replace(/"/g, "&quot;");
        marker.bindPopup(`<strong>${String(u.nome || "Uscita autostradale")}</strong><br><small>${String(u.autostrada || "")}</small><br><button type="button" data-ristoranti-uscita="${id}" style="margin-top:10px;width:100%;padding:9px;border:0;border-radius:8px;background:#075c3b;color:#fff;font-weight:700">🍴 MOSTRA RISTORANTI</button>`);
        marker.addTo(layer);
        bounds.push([Number(u.lat), Number(u.lon)]);
      });

      if (bounds.length) map.fitBounds(bounds, { padding: [20, 20] });
      setTimeout(() => map.invalidateSize(), 200);
      console.log("Fallback mappa attivato: uscite", validi.length);
    } catch (error) {
      console.error("Fallback mappa non disponibile:", error);
    }
  }

  function sistemaStelline() {
    const input = document.getElementById("stelleInput1km");
    if (!input) return;
    input.style.setProperty("width", "220px", "important");
    input.style.setProperty("max-width", "220px", "important");
    input.style.setProperty("min-width", "220px", "important");
    input.style.setProperty("height", "44px", "important");
    input.style.setProperty("display", "flex", "important");
    input.style.setProperty("align-items", "center", "important");
    input.style.setProperty("justify-content", "flex-start", "important");
    input.style.setProperty("font-family", "Arial, sans-serif", "important");
    input.style.setProperty("font-size", "32px", "important");
    input.style.setProperty("letter-spacing", "4px", "important");
    input.style.setProperty("line-height", "44px", "important");
    input.style.setProperty("text-align", "left", "important");
    input.style.setProperty("box-sizing", "border-box", "important");
    input.style.setProperty("padding", "0", "important");
    input.style.setProperty("user-select", "none", "important");
    input.style.setProperty("touch-action", "manipulation", "important");
  }

  const observer = new MutationObserver(() => sistemaStelline());
  observer.observe(document.body, { childList: true, subtree: true });

  function avvia() {
    sistemaMenu();
    assicuraMappa();
    filtraMappa();
    sistemaStelline();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", avvia, { once: true });
  else avvia();

  setTimeout(() => { sistemaMenu(); assicuraMappa(); filtraMappa(); }, 1500);
  setTimeout(() => { sistemaMenu(); assicuraMappa(); filtraMappa(); }, 4000);
  setTimeout(() => { sistemaMenu(); filtraMappa(); }, 8000);
})();
