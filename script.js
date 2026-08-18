// =====================================================
// 1 KM E SI MANGIA
// SCRIPT PRINCIPALE
// =====================================================


// =====================================================
// CONFIGURAZIONE
// =====================================================

const CONFIG = {

  distanzaMassimaRistoranteKm: 2,

  tolleranzaDistanzaMetri: 100,

  get distanzaMassimaEffettivaMetri() {

    return (
      this.distanzaMassimaRistoranteKm * 1000 +
      this.tolleranzaDistanzaMetri
    );

  }

};


// =====================================================
// MAPPA
// =====================================================

const map = L.map("map", {

  center: [42.5, 12.5],

  zoom: 6,

  scrollWheelZoom: true

});


// =====================================================
// OPENSTREETMAP
// =====================================================

L.tileLayer(

  "https://tile.openstreetmap.org/{z}/{x}/{y}.png",

  {

    maxZoom: 19,

    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

  }

).addTo(map);


// =====================================================
// GRUPPO USCITE
// =====================================================

const clusterUscite = L.markerClusterGroup({

  showCoverageOnHover: false,

  spiderfyOnMaxZoom: true,

  zoomToBoundsOnClick: true,

  removeOutsideVisibleBounds: true,

  maxClusterRadius: 55

});

map.addLayer(clusterUscite);


// =====================================================
// ICONA USCITA
// =====================================================

const exitIcon = L.divIcon({

  className: "",

  html:
    '<div class="custom-marker"></div>',

  iconSize: [36, 36],

  iconAnchor: [18, 18],

  popupAnchor: [0, -18]

});


// =====================================================
// DATABASE
// =====================================================

let usciteItaliane = [];


// =====================================================
// DATABASE RISTORANTI
// =====================================================

let ristorantiDatabase = [];

const ristorantiLayer = L.layerGroup().addTo(map);
const ristorantiPerUscitaMap = new Map();

const restaurantIcon = L.divIcon({
  className: "restaurant-map-icon",
  html:
    '<div style="width:34px;height:34px;border-radius:50%;background:#ffffff;border:3px solid #075c3b;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,.35);">🍴</div>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -17]
});

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function ristorantiPerUscita(uscita) {
  if (!uscita || !uscita.id) return [];
  return ristorantiPerUscitaMap.get(String(uscita.id)) || [];
}

function creaPopupRistorante(ristorante) {
  const nome = escapeHtml(ristorante.nome || "Ristorante");
  const distanza = Number.isFinite(Number(ristorante?.uscita?.distanza_m))
    ? `<small>📏 ${Math.round(Number(ristorante.uscita.distanza_m))} m dall'uscita</small>`
    : "";
  const parcheggio = ristorante.parcheggio?.presente === true
    ? `<small>🅿️ Parcheggio ${ristorante.parcheggio.distanza_m != null ? Math.round(Number(ristorante.parcheggio.distanza_m)) + " m" : "presente"}</small>`
    : `<small>🅿️ Parcheggio da verificare</small>`;

  return `
    <div style="min-width:190px;line-height:1.4">
      <strong>${nome}</strong>
      ${ristorante.cucina ? `<small>🍽️ ${escapeHtml(ristorante.cucina)}</small>` : ""}
      ${distanza}
      ${parcheggio}
      ${ristorante.telefono ? `<small>📞 ${escapeHtml(ristorante.telefono)}</small>` : ""}
    </div>
  `;
}

function creaMarkerRistorante(ristorante) {
  if (typeof ristorante.lat !== "number" || typeof ristorante.lon !== "number") {
    return null;
  }

  const marker = L.marker([ristorante.lat, ristorante.lon], {
    icon: restaurantIcon
  });

  marker.bindPopup(creaPopupRistorante(ristorante));
  return marker;
}

function chiudiPannelloRistoranti() {
  const panel = document.getElementById("ristorantiMapPanel");
  if (panel) panel.remove();
}

function mostraTuttiRistoranti(uscita) {
  if (!uscita) return;

  const ristoranti = ristorantiPerUscita(uscita);
  ristorantiLayer.clearLayers();
  chiudiPannelloRistoranti();

  const bounds = L.latLngBounds([[uscita.lat, uscita.lon]]);
  let markerCount = 0;

  ristoranti.forEach(function(ristorante) {
    const marker = creaMarkerRistorante(ristorante);
    if (!marker) return;

    marker.addTo(ristorantiLayer);
    bounds.extend([ristorante.lat, ristorante.lon]);
    markerCount++;
  });

  if (bounds.isValid()) {
    map.fitBounds(bounds, {
      padding: [45, 45],
      maxZoom: 15
    });
  }

  const panel = document.createElement("div");
  panel.id = "ristorantiMapPanel";
  panel.style.cssText =
    "position:fixed;z-index:10000;left:50%;top:50%;transform:translate(-50%,-50%);width:min(92vw,520px);max-height:80vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 10px 40px rgba(0,0,0,.35);padding:18px;font-family:system-ui,sans-serif;";

  if (!ristoranti.length) {
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong style="font-size:20px">Nessun ristorante</strong>
        <button id="chiudiRistorantiMap" type="button" style="border:0;border-radius:50%;width:36px;height:36px;font-size:20px;cursor:pointer">×</button>
      </div>
      <p>Non risultano ristoranti associati a questa uscita nel database.</p>
    `;
  } else {
    const cards = ristoranti.map(function(ristorante, index) {
      const nome = escapeHtml(ristorante.nome || "Ristorante");
      const distanza = Number.isFinite(Number(ristorante?.uscita?.distanza_m))
        ? Math.round(Number(ristorante.uscita.distanza_m)) + " m dall'uscita"
        : "";
      const parcheggio = ristorante.parcheggio?.presente === true
        ? "🅿️ Parcheggio " + (ristorante.parcheggio.distanza_m != null ? Math.round(Number(ristorante.parcheggio.distanza_m)) + " m" : "presente")
        : "🅿️ Parcheggio da verificare";

      return `
        <div style="border:1px solid #e5e5e5;border-radius:14px;padding:12px;margin-top:10px">
          <div style="display:flex;justify-content:space-between;gap:10px">
            <div>
              <strong>${index + 1}. ${nome}</strong>
              ${ristorante.cucina ? `<div style="font-size:12px;color:#555;margin-top:3px">🍽️ ${escapeHtml(ristorante.cucina)}</div>` : ""}
            </div>
            ${typeof ristorante.lat === "number" && typeof ristorante.lon === "number"
              ? `<button type="button" data-ristorante-index="${index}" style="box-sizing:border-box;min-width:132px;height:42px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border:0;border-radius:10px;background:#075c3b;color:#fff;padding:8px 12px;font-weight:700;cursor:pointer;white-space:nowrap"><svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true"><path d="M9 3 6 29M23 3l3 26" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M16 4v5M16 13v5M16 22v6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="5 4"/></svg> NAVIGA</button>` + (ristorante.parcheggio?.presente === true && Number.isFinite(Number(ristorante.parcheggio.distanza_m)) && Number(ristorante.parcheggio.distanza_m) <= 600
                ? ` <button type="button" data-demo-ristorante-index="${index}" style="box-sizing:border-box;min-width:132px;height:42px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid #075c3b;border-radius:10px;background:#fff;color:#075c3b;padding:8px 12px;font-weight:700;cursor:pointer;white-space:nowrap">🚛 DEMO</button>`
                : "")
              : ""}
          </div>
          <div style="font-size:12px;color:#555;margin-top:7px;display:grid;gap:3px">
            ${distanza ? `<span>📏 ${distanza}</span>` : ""}
            <span>${parcheggio}</span>
            ${ristorante.telefono ? `<span>📞 ${escapeHtml(ristorante.telefono)}</span>` : ""}
          </div>
        </div>
      `;
    }).join("");

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;position:sticky;top:0;background:#fff;padding-bottom:10px">
        <div>
          <strong style="font-size:20px">🍴 Ristoranti</strong>
          <div style="font-size:13px;color:#555">${escapeHtml(uscita.nome || "Uscita autostradale")} · ${ristoranti.length} trovati</div>
        </div>
        <button id="chiudiRistorantiMap" type="button" style="border:0;border-radius:50%;width:36px;height:36px;font-size:20px;cursor:pointer">×</button>
      </div>
      ${cards}
      <button id="chiudiRistorantiMapBottom" type="button" style="width:100%;margin-top:14px;border:0;border-radius:12px;background:#075c3b;color:#fff;padding:12px;font-weight:700;cursor:pointer">CHIUDI</button>
    `;
  }

  document.body.appendChild(panel);

  const closeTop = panel.querySelector("#chiudiRistorantiMap");
  if (closeTop) closeTop.addEventListener("click", chiudiPannelloRistoranti);

  const closeBottom = panel.querySelector("#chiudiRistorantiMapBottom");
  if (closeBottom) closeBottom.addEventListener("click", chiudiPannelloRistoranti);

  panel.querySelectorAll("[data-ristorante-index]").forEach(function(button) {
    button.addEventListener("click", function() {
      const index = Number(button.getAttribute("data-ristorante-index"));
      const ristorante = ristoranti[index];
      if (!ristorante) return;

      chiudiPannelloRistoranti();

      // Il pulsante della scheda ristorante porta direttamente
      // alla scelta dell'app di navigazione.
      // navigazione.js espone apriNavigazione().
      if (typeof window.apriNavigazione === "function") {
        window.apriNavigazione(ristorante);
        return;
      }

      // Fallback: se navigazione.js non fosse ancora disponibile,
      // manteniamo comunque il comportamento precedente.
      map.setView([ristorante.lat, ristorante.lon], 17, { animate: true });

      ristorantiLayer.eachLayer(function(layer) {
        if (
          layer.getLatLng &&
          Math.abs(layer.getLatLng().lat - ristorante.lat) < 0.000001 &&
          Math.abs(layer.getLatLng().lng - ristorante.lon) < 0.000001
        ) {
          layer.openPopup();
        }
      });
    });
  });


  // =====================================================
  // MODALITÀ DEMO MEZZI PESANTI
  // =====================================================
  panel.querySelectorAll("[data-demo-ristorante-index]").forEach(function(button) {
    button.addEventListener("click", function() {
      const index = Number(button.getAttribute("data-demo-ristorante-index"));
      const ristorante = ristoranti[index];
      if (!ristorante) return;

      const parcheggio = ristorante.parcheggio;
      const distanza = Number(parcheggio?.distanza_m);

      if (
        parcheggio?.presente !== true ||
        !Number.isFinite(distanza) ||
        distanza > 600 ||
        !Number.isFinite(Number(parcheggio?.lat)) ||
        !Number.isFinite(Number(parcheggio?.lon))
      ) {
        alert("Per questo ristorante non è disponibile un parcheggio entro 600 m.");
        return;
      }

      const overlay = document.createElement("div");
      overlay.id = "demoMezziPesanti";
      overlay.style.cssText =
        "position:fixed;inset:0;z-index:11000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:18px;";

      const nome = escapeHtml(ristorante.nome || "Ristorante");
      overlay.innerHTML = `
        <div style="width:min(94vw,460px);background:#fff;border-radius:20px;padding:20px;box-shadow:0 15px 50px rgba(0,0,0,.35);font-family:system-ui,sans-serif">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
            <div>
              <div style="font-size:13px;font-weight:800;letter-spacing:1px;color:#075c3b">MODALITÀ DEMO</div>
              <h2 style="margin:4px 0 0;font-size:23px">🚛 Mezzo pesante</h2>
            </div>
            <button type="button" data-demo-close style="border:0;background:#f2f2f2;border-radius:50%;width:38px;height:38px;font-size:22px;cursor:pointer">×</button>
          </div>

          <p style="margin:16px 0 8px"><strong>${nome}</strong></p>
          <p style="margin:0 0 16px;color:#444">
            Parcheggio disponibile a <strong>${Math.round(distanza)} m</strong> dal ristorante.
          </p>

          <div style="display:grid;gap:10px">
            <button type="button" data-demo-destination="restaurant" style="height:48px;border:0;border-radius:12px;background:#075c3b;color:#fff;font-weight:800;cursor:pointer">
              NAVIGA AL RISTORANTE
            </button>
            <button type="button" data-demo-destination="parking" style="height:48px;border:1px solid #075c3b;border-radius:12px;background:#fff;color:#075c3b;font-weight:800;cursor:pointer">
              🅿️ NAVIGA AL PARCHEGGIO
            </button>
          </div>

          <p style="margin:14px 0 0;font-size:12px;line-height:1.4;color:#666">
            Demo: la destinazione parcheggio è limitata a 600 m dal ristorante.
            Le app esterne possono non applicare automaticamente i profili e le restrizioni specifiche per mezzi pesanti: verificare sempre segnaletica e limiti locali.
          </p>
        </div>
      `;

      document.body.appendChild(overlay);

      function chiudiDemo() {
        overlay.remove();
      }

      overlay.querySelector("[data-demo-close]").addEventListener("click", chiudiDemo);

      overlay.addEventListener("click", function(event) {
        if (event.target === overlay) chiudiDemo();
      });

      overlay.querySelectorAll("[data-demo-destination]").forEach(function(action) {
        action.addEventListener("click", function() {
          const tipo = action.getAttribute("data-demo-destination");

          let destinazione;

          if (tipo === "parking") {
            destinazione = {
              ...ristorante,
              nome: "Parcheggio vicino a " + (ristorante.nome || "ristorante"),
              lat: Number(parcheggio.lat),
              lon: Number(parcheggio.lon),
              demo_mezzo_pesante: true,
              destinazione_tipo: "parcheggio"
            };
          } else {
            destinazione = {
              ...ristorante,
              demo_mezzo_pesante: true,
              destinazione_tipo: "ristorante"
            };
          }

          if (typeof window.apriNavigazione === "function") {
            chiudiDemo();
            window.apriNavigazione(destinazione);
          } else {
            alert("Sistema di navigazione non disponibile.");
          }
        });
      });
    });
  });

  console.log("Ristoranti mostrati:", ristoranti.length, "Marker:", markerCount, "Uscita:", uscita.nome);
}

window.mostraTuttiRistoranti = mostraTuttiRistoranti;

// Carica e indicizza il database ristoranti per ID uscita.
fetch("./ristoranti.json")
  .then(function(response) {
    if (!response.ok) throw new Error("Impossibile caricare ristoranti.json");
    return response.json();
  })
  .then(function(database) {
    if (!Array.isArray(database)) {
      throw new Error("ristoranti.json non contiene un array");
    }

    ristorantiDatabase = database;
    ristorantiPerUscitaMap.clear();

    ristorantiDatabase.forEach(function(ristorante) {
      const id = ristorante?.uscita?.id;
      if (!id) return;

      const chiave = String(id);
      if (!ristorantiPerUscitaMap.has(chiave)) {
        ristorantiPerUscitaMap.set(chiave, []);
      }

      // Manteniamo solo il raggio configurato: 2 km + 100 m.
      const distanza = Number(ristorante?.uscita?.distanza_m);
      if (!Number.isFinite(distanza) || distanza <= CONFIG.distanzaMassimaEffettivaMetri) {
        ristorantiPerUscitaMap.get(chiave).push(ristorante);
      }
    });

    console.log("DATABASE RISTORANTI - caricati:", ristorantiDatabase.length);
    console.log("Uscite con ristoranti:", ristorantiPerUscitaMap.size);
  })
  .catch(function(error) {
    console.error("Errore database ristoranti:", error);
  });

// Pulsante presente nel popup dell'uscita.
document.addEventListener("click", function(event) {
  const button = event.target.closest("[data-ristoranti-uscita]");
  if (!button) return;

  event.preventDefault();
  event.stopPropagation();

  const id = button.getAttribute("data-ristoranti-uscita");
  const uscita = usciteItaliane.find(function(item) {
    return String(item.id || "") === String(id);
  });

  if (!uscita) {
    console.error("Uscita non trovata:", id);
    return;
  }

  mostraTuttiRistoranti(uscita);
}, true);


// =====================================================
// CONTROLLA SE E' AREA DI SERVIZIO / AUTOGRILL
// =====================================================

function eAreaDiServizio(uscita) {

  if (!uscita) {

    return true;

  }


  // ---------------------------------------------
  // CONTROLLO CAMPO TIPO
  // ---------------------------------------------

  const tipo = String(
    uscita.tipo || ""
  ).toLowerCase();


  if (

    tipo.includes("servizio") ||

    tipo.includes("autogrill") ||

    tipo.includes("ristoro") ||

    tipo.includes("sosta") ||

    tipo.includes("service")

  ) {

    return true;

  }


  // ---------------------------------------------
  // CONTROLLO NOME
  // ---------------------------------------------

  const nome = (

    String(uscita.nome || "") +

    " " +

    String(uscita.nome_autostrada || "") +

    " " +

    String(uscita.autostrada || "")

  ).toLowerCase();


  const paroleDaEscludere = [

    "area di servizio",

    "area servizio",

    "area di sosta",

    "area sosta",

    "autogrill",

    "area ristoro",

    "ristoro",

    "service area",

    "service station"

  ];


  for (
    let i = 0;
    i < paroleDaEscludere.length;
    i++
  ) {

    if (
      nome.includes(
        paroleDaEscludere[i]
      )
    ) {

      return true;

    }

  }


  return false;

}


// =====================================================
// CONTROLLA USCITA VALIDA
// =====================================================

function uscitaValida(uscita) {

  if (!uscita) {

    return false;

  }


  if (

    typeof uscita.lat !== "number" ||

    typeof uscita.lon !== "number"

  ) {

    return false;

  }


  if (
    uscita.visualizza_mappa === false
  ) {

    return false;

  }


  // ESCLUDI AUTOGRILL / AREE DI SERVIZIO

  if (
    eAreaDiServizio(uscita)
  ) {

    return false;

  }


  return true;

}


// =====================================================
// CREA POPUP
// =====================================================

function creaPopup(uscita) {

  let popup = `

    <div class="exit-popup">

      <strong>
        ${uscita.nome || "Uscita autostradale"}
      </strong>

  `;


  if (uscita.autostrada) {

    popup += `

      <small>
        ${uscita.autostrada}

    `;


    if (uscita.numero_uscita) {

      popup +=
        ` · Uscita ${uscita.numero_uscita}`;

    }


    popup += `

      </small>

    `;

  }


  if (uscita.nome_autostrada) {

    popup += `

      <small>
        ${uscita.nome_autostrada}
      </small>

    `;

  }


  popup += `

      <small>
        🛣️ Uscita autostradale
      </small>

      <button
        type="button"
        data-ristoranti-uscita="${escapeHtml(uscita.id)}"
        style="margin-top:10px;width:100%;padding:9px;border:0;border-radius:8px;cursor:pointer;background:#075c3b;color:#fff;font-weight:700;"
      >
        🍴 MOSTRA RISTORANTI
      </button>

    </div>

  `;


  return popup;

}


// =====================================================
// CARICA DATABASE USCITE
// =====================================================

fetch("./uscite.json")

  .then(function(response) {

    if (!response.ok) {

      throw new Error(
        "Impossibile caricare uscite.json"
      );

    }

    return response.json();

  })

  .then(function(database) {

    usciteItaliane = database;


    console.log(
      "================================="
    );

    console.log(
      "DATABASE 1 KM E SI MANGIA"
    );

    console.log(
      "Uscite caricate:",
      usciteItaliane.length
    );

    console.log(
      "================================="
    );


    let usciteVisibili = 0;

    let usciteEscluse = 0;


    // ---------------------------------------------
    // CREA MARKER
    // ---------------------------------------------

    usciteItaliane.forEach(function(uscita) {

      if (
        !uscitaValida(uscita)
      ) {

        usciteEscluse++;

        return;

      }


      const marker = L.marker(

        [
          uscita.lat,
          uscita.lon
        ],

        {
          icon: exitIcon
        }

      );


      marker.bindPopup(
        creaPopup(uscita)
      );


      // -------------------------------------------
      // CLICK MARKER
      // -------------------------------------------

      marker.on(

        "click",

        function() {

          map.flyTo(

            [
              uscita.lat,
              uscita.lon
            ],

            14,

            {
              duration: 1
            }

          );

        }

      );


      clusterUscite.addLayer(
        marker
      );


      usciteVisibili++;

    });


    console.log(
      "Uscite visibili:",
      usciteVisibili
    );


    console.log(
      "Elementi esclusi:",
      usciteEscluse
    );


    console.log(
      "Filtro ristoranti:",
      CONFIG.distanzaMassimaRistoranteKm +
      " km + " +
      CONFIG.tolleranzaDistanzaMetri +
      " m"
    );


    console.log(
      "Distanza effettiva:",
      CONFIG.distanzaMassimaEffettivaMetri +
      " m"
    );

  })


  .catch(function(error) {

    console.error(
      "Errore database:",
      error
    );

  });


// =====================================================
// PULSANTE "ESPLORA LA MAPPA"
// =====================================================

const mapButton =
  document.getElementById(
    "mapButton"
  );


const mapSection =
  document.getElementById(
    "mapSection"
  );


if (mapButton) {

  mapButton.addEventListener(

    "click",

    function() {

      if (mapSection) {

        mapSection.scrollIntoView({

          behavior: "smooth"

        });

      }

    }

  );

}


// =====================================================
// GEOLOCALIZZAZIONE
// =====================================================

const locationButton =
  document.getElementById(
    "locationButton"
  );

let userMarker = null;
let userAccuracyCircle = null;

if (locationButton) {

  locationButton.addEventListener(
    "click",
    function() {

      if (!window.isSecureContext) {

        alert(
          "La posizione può essere usata solo tramite HTTPS. " +
          "Apri il sito dalla versione Vercel."
        );

        return;

      }

      if (!navigator.geolocation) {

        alert(
          "La geolocalizzazione non è disponibile " +
          "su questo dispositivo/browser."
        );

        return;

      }

      locationButton.disabled = true;
      locationButton.textContent =
        "RICERCA POSIZIONE...";

      function posizioneTrovata(position) {

        const lat =
          position.coords.latitude;

        const lng =
          position.coords.longitude;

        const accuracy =
          Number(position.coords.accuracy) || 100;

        console.log(
          "POSIZIONE GPS:",
          lat,
          lng,
          "precisione:",
          accuracy,
          "metri"
        );

        // ---------------------------------------
        // RIMUOVI VECCHIA POSIZIONE
        // ---------------------------------------

        if (userMarker) {

          map.removeLayer(
            userMarker
          );

        }

        if (userAccuracyCircle) {

          map.removeLayer(
            userAccuracyCircle
          );

        }

        // ---------------------------------------
        // PIN "TU SEI QUI"
        // ---------------------------------------

        const userIcon =
          L.divIcon({
            className: "user-location-pin",
            html: `
              <svg viewBox="0 0 48 58" xmlns="http://www.w3.org/2000/svg" width="48" height="58" aria-hidden="true">
                <path d="M24 2C12 2 3 11 3 23c0 15 21 33 21 33s21-18 21-33C45 11 36 2 24 2Z" fill="#075c3b" stroke="#fff" stroke-width="2.5"/>
                <circle cx="24" cy="23" r="9" fill="none" stroke="#fff" stroke-width="2.5"/>
                <path d="M17 18v-6M20 18v-7M23 18v-7M26 18v-6M17 18c0 4 2 6 5 7v7M31 14v11M31 25c-2 1-3 3-3 5v2" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
              </svg>
            `,
            iconSize: [48, 58],
            iconAnchor: [24, 56],
            popupAnchor: [0, -52]
          });

        userMarker =
          L.marker(
            [lat, lng],
            {
              icon: userIcon,
              zIndexOffset: 10000
            }
          ).addTo(map);

        // ---------------------------------------
        // CERCHIO DI PRECISIONE GPS
        // ---------------------------------------

        userAccuracyCircle =
          L.circle(
            [lat, lng],
            {
              radius: accuracy,
              color: "#075c3b",
              weight: 2,
              fillColor: "#075c3b",
              fillOpacity: 0.12
            }
          ).addTo(map);

        userMarker
          .bindPopup(
            "<strong>TU SEI QUI</strong><br>" +
            "Precisione GPS circa " +
            Math.round(accuracy) +
            " m"
          )
          .openPopup();

        // ---------------------------------------
        // PORTA LA MAPPA SULL'UTENTE
        // ---------------------------------------

        if (mapSection) {

          mapSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

        }

        // Dopo lo scroll Leaflet deve ricalcolare
        // le dimensioni del contenitore.
        setTimeout(
          function() {

            map.invalidateSize();

            map.setView(
              [lat, lng],
              Math.max(
                14,
                Math.min(
                  17,
                  Math.round(
                    17 -
                    Math.log2(
                      Math.max(
                        1,
                        accuracy / 50
                      )
                    )
                  )
                )
              ),
              {
                animate: true
              }
            );

          },
          450
        );

        locationButton.disabled = false;

        locationButton.textContent =
          "POSIZIONE TROVATA";

      }

      function errorePosizione(error) {

        console.error(
          "ERRORE GPS:",
          error.code,
          error.message
        );

        let messaggio =
          "Non siamo riusciti a ottenere la tua posizione.";

        if (error.code === 1) {

          messaggio =
            "Permesso di posizione negato. " +
            "Consenti la posizione al browser e riprova.";

        } else if (error.code === 2) {

          messaggio =
            "Posizione non disponibile. " +
            "Controlla GPS e connessione e riprova.";

        } else if (error.code === 3) {

          messaggio =
            "La ricerca della posizione ha impiegato troppo tempo. " +
            "Riprova tra qualche secondo.";

        }

        alert(messaggio);

        locationButton.disabled = false;

        locationButton.textContent =
          "USA LA MIA POSIZIONE";

      }

      // Primo tentativo: rapido e compatibile.
      navigator.geolocation.getCurrentPosition(
        posizioneTrovata,
        function() {

          // Secondo tentativo: GPS più preciso.
          navigator.geolocation.getCurrentPosition(
            posizioneTrovata,
            errorePosizione,
            {
              enableHighAccuracy: true,
              timeout: 20000,
              maximumAge: 0
            }
          );

        },
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 60000
        }
      );

    }
  );

}


// =====================================================
// MENU PRINCIPALE - GESTIONE UNIFICATA
// =====================================================


(function () {

  function initMenu() {

    const menuButton = document.querySelector(".menu-button");

    // Supportiamo entrambe le versioni che abbiamo usato:
    // #mobileMenu / .mobile-menu
    // #siteMenu / .site-menu
    const menuPanel =
      document.getElementById("mobileMenu") ||
      document.querySelector(".mobile-menu") ||
      document.getElementById("siteMenu") ||
      document.querySelector(".site-menu");

    const menuClose =
      document.getElementById("menuClose") ||
      document.querySelector(".menu-close") ||
      document.querySelector(".site-menu-close");

    const overlay =
      document.querySelector(".site-menu-overlay") ||
      document.querySelector(".mobile-menu-overlay");

    if (!menuButton || !menuPanel) {
      console.warn("MENU: elementi non trovati", {
        menuButton: !!menuButton,
        menuPanel: !!menuPanel
      });
      return;
    }

    let aperto = false;

    function openMenu() {

      aperto = true;

      menuPanel.classList.add("open");
      menuPanel.classList.add("active");

      menuPanel.setAttribute("aria-hidden", "false");

      menuButton.setAttribute("aria-expanded", "true");

      document.body.classList.add("menu-open");

      // Forziamo anche lo stile essenziale in modo che il menu
      // funzioni anche se una vecchia regola CSS è rimasta nel file.
      menuPanel.style.visibility = "visible";
      menuPanel.style.opacity = "1";
      menuPanel.style.pointerEvents = "auto";
      menuPanel.style.zIndex = "9999";

      if (overlay) {
        overlay.classList.add("open");
        overlay.classList.add("active");
        overlay.style.visibility = "visible";
        overlay.style.opacity = "1";
        overlay.style.pointerEvents = "auto";
        overlay.style.zIndex = "9998";
      }

      console.log("MENU APERTO");
    }

    function closeMenu() {

      aperto = false;

      menuPanel.classList.remove("open");
      menuPanel.classList.remove("active");

      menuPanel.setAttribute("aria-hidden", "true");

      menuButton.setAttribute("aria-expanded", "false");

      document.body.classList.remove("menu-open");

      menuPanel.style.visibility = "hidden";
      menuPanel.style.opacity = "0";
      menuPanel.style.pointerEvents = "none";

      if (overlay) {
        overlay.classList.remove("open");
        overlay.classList.remove("active");
        overlay.style.visibility = "hidden";
        overlay.style.opacity = "0";
        overlay.style.pointerEvents = "none";
      }

      console.log("MENU CHIUSO");
    }

    // Stato iniziale
    closeMenu();

    // Pulsante hamburger
    menuButton.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      if (aperto) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Pulsante X
    if (menuClose) {
      menuClose.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
      });
    }

    // Overlay
    if (overlay) {
      overlay.addEventListener("click", function () {
        closeMenu();
      });
    }

    // ESC
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu();
      }
    });

    // Link del menu
    const menuLinks = menuPanel.querySelectorAll(".menu-link");

    menuLinks.forEach(function (link) {

      link.addEventListener("click", function (event) {

        const target = link.getAttribute("href");

        closeMenu();

        if (target && target.startsWith("#")) {

          const elemento = document.querySelector(target);

          if (elemento) {
            event.preventDefault();

            setTimeout(function () {
              elemento.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });
            }, 150);
          }
        }
      });
    });

    console.log("MENU PRINCIPALE ATTIVO");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMenu);
  } else {
    initMenu();
  }

})();


// =====================================================
// RESIZE MAPPA
// =====================================================

window.addEventListener("resize", function () {

  setTimeout(function () {
    map.invalidateSize();
  }, 100);

});


// =====================================================
// AVVIO
// =====================================================

console.log("=================================");
console.log("1 KM E SI MANGIA - SCRIPT AVVIATO");
console.log(
  "Filtro:",
  CONFIG.distanzaMassimaRistoranteKm +
  " km + " +
  CONFIG.tolleranzaDistanzaMetri +
  " m"
);
console.log("=================================");
