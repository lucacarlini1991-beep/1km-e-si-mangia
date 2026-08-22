/* 1 KM E SI MANGIA — collegamento navigazione camion
   NON modifica il GPS esistente.
   Aggiunge il pulsante HGV ai popup delle uscite e passa al modulo
   camion-navigazione.js solo le coordinate della destinazione.
*/
(function () {
  "use strict";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function addButtonToPopup(e) {
    const popup = e && e.popup;
    const marker = popup && popup._source;
    if (!popup || !marker || !marker.getLatLng) return;

    const content = popup.getElement && popup.getElement();
    if (!content) return;

    const popupContent = content.querySelector(".leaflet-popup-content");
    if (!popupContent || popupContent.querySelector("[data-naviga-camion]") ) return;

    const point = marker.getLatLng();
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return;

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-naviga-camion", "1");
    button.style.cssText = [
      "display:block",
      "width:100%",
      "margin-top:10px",
      "padding:10px 12px",
      "border:0",
      "border-radius:9px",
      "background:#f5a719",
      "color:#073f2e",
      "font-size:14px",
      "font-weight:800",
      "cursor:pointer"
    ].join(";");
    button.textContent = "🚛 NAVIGA CON IL CAMION";

    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      if (!window.CamionNavigazione || typeof window.CamionNavigazione.naviga !== "function") {
        alert("La navigazione camion non è disponibile. Ricarica la pagina.");
        return;
      }

      const title = popupContent.querySelector("h3,h2,strong");
      const nome = title ? title.textContent.trim() : "Uscita autostradale";

      window.CamionNavigazione.naviga({
        id: "uscita-" + point.lat.toFixed(5) + "-" + point.lng.toFixed(5),
        nome: nome,
        lat: point.lat,
        lon: point.lng,
        destinazione_tipo: "uscita_autostradale"
      });
    });

    popupContent.appendChild(button);
  }

  function attach() {
    const map = window.appMap;
    if (!map || !map.on) {
      setTimeout(attach, 100);
      return;
    }

    map.on("popupopen", addButtonToPopup);
    console.log("🚛 COLLEGA-CAMION ATTIVO — GPS esistente lasciato intatto");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach, { once: true });
  } else {
    attach();
  }
})();
