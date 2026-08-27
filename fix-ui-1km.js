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
    if (u.tipo === "svincolo" || u.tipo === "area_servizio") return true;
    const testo = normalizza([u.nome, u.nome_autostrada, u.autostrada].join(" "));
    return paroleNascoste.some(p => testo.includes(normalizza(p)));
  }

  async function filtraMappa() {
    try {
      const response = await fetch("./uscite.json?ui-filter=20260827", { cache: "no-store" });
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
      console.log(`🛡️ Filtro uscite: nascosti ${nascosti.length} elementi non destinazione.`);
    } catch (error) {
      console.warn("Filtro uscite non disponibile:", error);
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
    input.title = "Clicca sulla stella che vuoi assegnare";
  }

  const observer = new MutationObserver(() => sistemaStelline());
  observer.observe(document.body, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", filtraMappa, { once: true });
  } else {
    filtraMappa();
  }

  setTimeout(filtraMappa, 1500);
  setTimeout(filtraMappa, 4000);
  setTimeout(filtraMappa, 8000);
})();
