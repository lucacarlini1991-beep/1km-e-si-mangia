// =====================================================
// 1 KM E SI MANGIA — SCELTA NAVIGATORE
// Destinazione indipendente dal GPS dell'utente.
// =====================================================
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

  function coordinateValide(item) {
    return item && Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon));
  }

  function urlsNavigazione(item) {
    const lat = Number(item.lat);
    const lon = Number(item.lon);
    const nome = encodeURIComponent(item.nome || "Destinazione");

    return {
      google: "https://www.google.com/maps/dir/?api=1&destination=" + lat + "," + lon,
      waze: "https://www.waze.com/ul?ll=" + lat + "%2C" + lon + "&navigate=yes&utm_source=1km-e-si-mangia",
      apple: "https://maps.apple.com/?daddr=" + lat + "," + lon + "&dirflg=d&q=" + nome
    };
  }

  function chiudiModal() {
    const modal = document.getElementById("modalSceltaNavigazione");
    if (modal) modal.remove();
  }

  function apriUrl(url) {
    // Link universali: su smartphone aprono l'app se installata,
    // altrimenti la versione web del navigatore.
    window.location.href = url;
  }

  function creaLogo(tipo) {
    if (tipo === "google") {
      return '<img class="nav-brand-logo" src="https://commons.wikimedia.org/wiki/Special:Redirect/file/Google_Maps_icon_(2026).svg" alt="Google Maps">';
    }
    if (tipo === "waze") {
      return '<img class="nav-brand-logo nav-brand-waze" src="https://commons.wikimedia.org/wiki/Special:Redirect/file/Waze_logo_2022.png" alt="Waze">';
    }
    return '<img class="nav-brand-logo nav-brand-apple" src="https://commons.wikimedia.org/wiki/Special:Redirect/file/Apple_Maps_logo.svg" alt="Mappe Apple">';
  }

  function apriNavigazione(destinazione) {
    if (!coordinateValide(destinazione)) {
      alert("Coordinate della destinazione non disponibili.");
      return;
    }

    chiudiModal();

    const urls = urlsNavigazione(destinazione);
    const nome = escapeHtml(destinazione.nome || "Destinazione");
    const tipo = destinazione.destinazione_tipo === "parcheggio"
      ? "Parcheggio vicino al ristorante"
      : (destinazione.demo_mezzo_pesante ? "Destinazione demo mezzo pesante" : "Destinazione");

    const modal = document.createElement("div");
    modal.id = "modalSceltaNavigazione";
    modal.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:12000",
      "background:rgba(0,0,0,.55)",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "padding:16px",
      "box-sizing:border-box"
    ].join(";");

    modal.innerHTML = `
      <div class="nav-modal-card" style="width:min(94vw,520px);background:#fff;border-radius:22px;box-shadow:0 18px 55px rgba(0,0,0,.35);padding:20px;box-sizing:border-box;font-family:system-ui,sans-serif">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
          <div>
            <div style="font-size:12px;font-weight:800;letter-spacing:1.5px;color:#075c3b">NAVIGAZIONE</div>
            <h2 style="margin:4px 0 3px;font-size:22px;line-height:1.15">Scegli come arrivare</h2>
            <div style="font-size:13px;color:#666">${tipo}</div>
          </div>
          <button type="button" data-nav-close aria-label="Chiudi" style="border:0;background:#f1f1f1;border-radius:50%;width:38px;height:38px;font-size:22px;cursor:pointer;flex:0 0 auto">×</button>
        </div>

        <div style="margin:15px 0 14px;padding:10px 12px;border-radius:12px;background:#f7f7f7;font-size:14px;font-weight:700">${nome}</div>

        <div class="nav-choice-grid" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">
          <button type="button" data-nav="google" class="nav-choice">
            ${creaLogo("google")}
            <span>Google Maps</span>
          </button>
          <button type="button" data-nav="waze" class="nav-choice">
            ${creaLogo("waze")}
            <span>Waze</span>
          </button>
          <button type="button" data-nav="apple" class="nav-choice">
            ${creaLogo("apple")}
            <span>Mappe Apple</span>
          </button>
        </div>

        <button type="button" data-nav-close-bottom style="width:100%;margin-top:14px;height:44px;border:1px solid #ddd;border-radius:12px;background:#fff;color:#333;font-weight:700;cursor:pointer">ANNULLA</button>
      </div>
    `;

    const style = document.createElement("style");
    style.id = "stileNavigazione1Km";
    style.textContent = `
      .nav-choice{
        min-width:0;
        min-height:132px;
        border:1px solid #e1e1e1;
        border-radius:15px;
        background:#fff;
        padding:12px 8px;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:9px;
        cursor:pointer;
        font:700 14px/1.15 system-ui,sans-serif;
        color:#075c3b;
      }
      .nav-choice:hover{border-color:#075c3b;box-shadow:0 3px 12px rgba(0,0,0,.08)}
      .nav-brand-logo{
        width:58px;
        height:58px;
        object-fit:contain;
        display:block;
      }
      .nav-brand-waze{width:68px;height:52px}
      .nav-brand-apple{width:68px;height:44px}
      @media(max-width:520px){
        .nav-choice-grid{grid-template-columns:1fr !important}
        .nav-choice{min-height:70px;flex-direction:row;justify-content:flex-start;padding:10px 14px;font-size:16px}
        .nav-brand-logo{width:46px;height:46px;flex:0 0 46px}
        .nav-brand-waze{width:54px;height:42px;flex-basis:54px}
        .nav-brand-apple{width:58px;height:34px;flex-basis:58px}
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(modal);

    modal.querySelectorAll("[data-nav-close],[data-nav-close-bottom]").forEach(function (button) {
      button.addEventListener("click", chiudiModal);
    });

    modal.addEventListener("click", function (event) {
      if (event.target === modal) chiudiModal();
    });

    modal.querySelectorAll("[data-nav]").forEach(function (button) {
      button.addEventListener("click", function () {
        const tipoNav = button.getAttribute("data-nav");
        chiudiModal();
        if (tipoNav === "google") apriUrl(urls.google);
        if (tipoNav === "waze") apriUrl(urls.waze);
        if (tipoNav === "apple") apriUrl(urls.apple);
      });
    });
  }

  window.apriNavigazione = apriNavigazione;
})();
