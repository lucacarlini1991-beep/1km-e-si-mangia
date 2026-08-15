// =====================================================
// 1 KM E SI MANGIA
// NAVIGAZIONE
// =====================================================
//
// Gestisce la scelta dell'app di navigazione:
//
//   Google Maps
//   Waze
//   Apple Maps
//
// Non modifica la mappa e non richiede API key.
// =====================================================


// =====================================================
// CONFIGURAZIONE
// =====================================================

const NAVIGAZIONE_CONFIG = {

    nomeApplicazione:
      "1 KM E SI MANGIA",
  
    zoomDestinazione:
      17
  
  };
  
  
  // =====================================================
  // SICUREZZA TESTO
  // =====================================================
  
  function navigazioneEscapeHtml(
    valore
  ) {
  
    return String(
      valore == null
        ? ""
        : valore
    )
  
      .replace(
        /&/g,
        "&amp;"
      )
  
      .replace(
        /</g,
        "&lt;"
      )
  
      .replace(
        />/g,
        "&gt;"
      )
  
      .replace(
        /"/g,
        "&quot;"
      )
  
      .replace(
        /'/g,
        "&#039;"
      );
  
  }
  
  
  // =====================================================
  // VERIFICA COORDINATE
  // =====================================================
  
  function coordinateNavigazioneValide(
    lat,
    lon
  ) {
  
    const latNumero =
      Number(lat);
  
    const lonNumero =
      Number(lon);
  
  
    if (
      !Number.isFinite(
        latNumero
      ) ||
      !Number.isFinite(
        lonNumero
      )
    ) {
  
      return false;
  
    }
  
  
    if (
      latNumero < -90 ||
      latNumero > 90
    ) {
  
      return false;
  
    }
  
  
    if (
      lonNumero < -180 ||
      lonNumero > 180
    ) {
  
      return false;
  
    }
  
  
    return true;
  
  }
  
  
  // =====================================================
  // URL GOOGLE MAPS
  // =====================================================
  
  function creaUrlGoogleMaps(
    lat,
    lon,
    nome
  ) {
  
    const destinazione =
      encodeURIComponent(
        `${lat},${lon}`
      );
  
  
    const nomeEncoded =
      encodeURIComponent(
        nome || ""
      );
  
  
    return (
  
      "https://www.google.com/maps/dir/" +
  
      "?api=1" +
  
      "&destination=" +
      destinazione +
  
      "&travelmode=driving" +
  
      (
        nomeEncoded
          ? "&destination_place_id=" +
            ""
          : ""
      )
  
    );
  
  }
  
  
  // =====================================================
  // URL WAZE
  // =====================================================
  
  function creaUrlWaze(
    lat,
    lon
  ) {
  
    return (
  
      "https://www.waze.com/ul" +
  
      "?ll=" +
      encodeURIComponent(
        `${lat},${lon}`
      ) +
  
      "&navigate=yes" +
  
      "&zoom=" +
      NAVIGAZIONE_CONFIG.zoomDestinazione
  
    );
  
  }
  
  
  // =====================================================
  // URL APPLE MAPS
  // =====================================================
  
  function creaUrlAppleMaps(
    lat,
    lon,
    nome
  ) {
  
    const destinazione =
      encodeURIComponent(
        `${lat},${lon}`
      );
  
  
    const query =
      encodeURIComponent(
        nome ||
        `${lat},${lon}`
      );
  
  
    return (
  
      "https://maps.apple.com/" +
  
      "?daddr=" +
      destinazione +
  
      "&dirflg=d" +
  
      "&q=" +
      query
  
    );
  
  }
  
  
  // =====================================================
  // APERTURA URL
  // =====================================================
  
  function apriUrlNavigazione(
    url
  ) {
  
    if (!url) {
  
      return;
  
    }
  
  
    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  
  }
  
  
  // =====================================================
  // CHIUDI PANNELLO
  // =====================================================
  
  function chiudiSceltaNavigazione() {
  
    const pannello =
      document.getElementById(
        "sceltaNavigazionePanel"
      );
  
  
    if (pannello) {
  
      pannello.remove();
  
    }
  
  }
  
  
  // =====================================================
  // CREA PANNELLO SCELTA
  // =====================================================
  
  function mostraSceltaNavigazione(
    ristorante
  ) {
  
    if (!ristorante) {
  
      return;
  
    }
  
  
    const lat =
      Number(
        ristorante.lat
      );
  
  
    const lon =
      Number(
        ristorante.lon
      );
  
  
    if (
      !coordinateNavigazioneValide(
        lat,
        lon
      )
    ) {
  
      alert(
        "Questo ristorante non ha coordinate valide per la navigazione."
      );
  
      return;
  
    }
  
  
    chiudiSceltaNavigazione();
  
  
    const nome =
      navigazioneEscapeHtml(
        ristorante.nome ||
        "Ristorante"
      );
  
  
    const pannello =
      document.createElement(
        "div"
      );
  
  
    pannello.id =
      "sceltaNavigazionePanel";
  
  
    pannello.style.cssText = `
  
      position:fixed;
  
      z-index:30000;
  
      left:50%;
  
      top:50%;
  
      transform:
        translate(-50%,-50%);
  
      width:min(
        92vw,
        430px
      );
  
      background:#ffffff;
  
      border-radius:20px;
  
      box-shadow:
        0 15px 50px
        rgba(0,0,0,.35);
  
      padding:20px;
  
      font-family:
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
  
    `;
  
  
    pannello.innerHTML = `
  
      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:12px;
          margin-bottom:18px;
        "
      >
  
        <div>
  
          <div
            style="
              font-size:20px;
              font-weight:800;
            "
          >
            🧭 COME VUOI NAVIGARE?
          </div>
  
          <div
            style="
              margin-top:5px;
              font-size:14px;
              color:#555;
            "
          >
            ${nome}
          </div>
  
        </div>
  
  
        <button
          type="button"
          id="chiudiSceltaNavigazione"
          style="
            border:0;
            width:36px;
            height:36px;
            border-radius:50%;
            background:#eeeeee;
            font-size:22px;
            cursor:pointer;
          "
        >
          ×
        </button>
  
      </div>
  
  
      <button
        type="button"
        data-navigazione="google"
        style="
          display:flex;
          align-items:center;
          gap:14px;
          width:100%;
          padding:15px;
          margin-bottom:10px;
          border:1px solid #dddddd;
          border-radius:14px;
          background:#ffffff;
          cursor:pointer;
          text-align:left;
          font-size:16px;
          font-weight:700;
        "
      >
  
        <span
          style="
            font-size:27px;
          "
        >
          🗺️
        </span>
  
        <span>
          Google Maps
          <small
            style="
              display:block;
              font-size:12px;
              color:#666;
              font-weight:400;
              margin-top:2px;
            "
          >
            Avvia indicazioni stradali
          </small>
        </span>
  
      </button>
  
  
      <button
        type="button"
        data-navigazione="waze"
        style="
          display:flex;
          align-items:center;
          gap:14px;
          width:100%;
          padding:15px;
          margin-bottom:10px;
          border:1px solid #dddddd;
          border-radius:14px;
          background:#ffffff;
          cursor:pointer;
          text-align:left;
          font-size:16px;
          font-weight:700;
        "
      >
  
        <span
          style="
            font-size:27px;
          "
        >
          🚗
        </span>
  
        <span>
          Waze
          <small
            style="
              display:block;
              font-size:12px;
              color:#666;
              font-weight:400;
              margin-top:2px;
            "
          >
            Apri Waze e naviga
          </small>
        </span>
  
      </button>
  
  
      <button
        type="button"
        data-navigazione="apple"
        style="
          display:flex;
          align-items:center;
          gap:14px;
          width:100%;
          padding:15px;
          margin-bottom:10px;
          border:1px solid #dddddd;
          border-radius:14px;
          background:#ffffff;
          cursor:pointer;
          text-align:left;
          font-size:16px;
          font-weight:700;
        "
      >
  
        <span
          style="
            font-size:27px;
          "
        >
          🍎
        </span>
  
        <span>
          Apple Maps
          <small
            style="
              display:block;
              font-size:12px;
              color:#666;
              font-weight:400;
              margin-top:2px;
            "
          >
            Apri Mappe e naviga
          </small>
        </span>
  
      </button>
  
  
      <button
        type="button"
        id="annullaNavigazione"
        style="
          width:100%;
          margin-top:5px;
          padding:12px;
          border:0;
          border-radius:12px;
          background:#eeeeee;
          cursor:pointer;
          font-weight:700;
        "
      >
        ANNULLA
      </button>
  
    `;
  
  
    document.body.appendChild(
      pannello
    );
  
  
    // ---------------------------------------------------
    // CHIUDI
    // ---------------------------------------------------
  
    pannello
      .querySelector(
        "#chiudiSceltaNavigazione"
      )
      .addEventListener(
        "click",
        chiudiSceltaNavigazione
      );
  
  
    pannello
      .querySelector(
        "#annullaNavigazione"
      )
      .addEventListener(
        "click",
        chiudiSceltaNavigazione
      );
  
  
    // ---------------------------------------------------
    // GOOGLE
    // ---------------------------------------------------
  
    pannello
      .querySelector(
        '[data-navigazione="google"]'
      )
      .addEventListener(
        "click",
        function() {
  
          const url =
            creaUrlGoogleMaps(
              lat,
              lon,
              ristorante.nome
            );
  
  
          apriUrlNavigazione(
            url
          );
  
        }
      );
  
  
    // ---------------------------------------------------
    // WAZE
    // ---------------------------------------------------
  
    pannello
      .querySelector(
        '[data-navigazione="waze"]'
      )
      .addEventListener(
        "click",
        function() {
  
          const url =
            creaUrlWaze(
              lat,
              lon
            );
  
  
          apriUrlNavigazione(
            url
          );
  
        }
      );
  
  
    // ---------------------------------------------------
    // APPLE MAPS
    // ---------------------------------------------------
  
    pannello
      .querySelector(
        '[data-navigazione="apple"]'
      )
      .addEventListener(
        "click",
        function() {
  
          const url =
            creaUrlAppleMaps(
              lat,
              lon,
              ristorante.nome
            );
  
  
          apriUrlNavigazione(
            url
          );
  
        }
      );
  
  }
  
  
  // =====================================================
  // FUNZIONE PUBBLICA
  // =====================================================
  
  window.mostraSceltaNavigazione =
    mostraSceltaNavigazione;
  
  
  // =====================================================
  // FUNZIONE PUBBLICA ALTERNATIVA
  // =====================================================
  //
  // Possiamo usarla direttamente come:
  //
  //   apriNavigazione(ristorante)
  //
  
  window.apriNavigazione =
    mostraSceltaNavigazione;
  
  
  // =====================================================
  // ESC
  // =====================================================
  
  document.addEventListener(
    "keydown",
    function(event) {
  
      if (
        event.key === "Escape"
      ) {
  
        chiudiSceltaNavigazione();
  
      }
  
    }
  );
  
  
  // =====================================================
  // AVVIO
  // =====================================================
  
  console.log(
    "================================="
  );
  
  console.log(
    "NAVIGAZIONE.JS ATTIVO"
  );
  
  console.log(
    "Google Maps / Waze / Apple Maps"
  );
  
  console.log(
    "================================="
  );