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

// Espone la mappa al modulo GPS.
window.appMap = map;


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

const ristorantiLayer =
  L.layerGroup().addTo(map);

const ristorantiPerUscitaMap =
  new Map();

const restaurantIcon =
  L.divIcon({

    className:
      "restaurant-map-icon",

    html:
      '<div style="width:34px;height:34px;border-radius:50%;background:#ffffff;border:3px solid #075c3b;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,.35);">🍴</div>',

    iconSize:
      [34, 34],

    iconAnchor:
      [17, 17],

    popupAnchor:
      [0, -17]

  });


function escapeHtml(value) {

  return String(
    value == null
      ? ""
      : value
  )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


function ristorantiPerUscita(uscita) {

  if (!uscita || !uscita.id) {

    return [];

  }

  return ristorantiPerUscitaMap.get(
    String(uscita.id)
  ) || [];

}


function creaPopupRistorante(ristorante) {

  const nome =
    escapeHtml(
      ristorante.nome ||
      "Ristorante"
    );

  const distanza =
    Number.isFinite(
      Number(
        ristorante?.uscita?.distanza_m
      )
    )
      ? `<small>📍 ${
          Math.round(
            Number(
              ristorante.uscita.distanza_m
            )
          )
        } m dall'uscita</small>`
      : "";

  const parcheggio =
    ristorante.parcheggio?.presente === true
      ? `<small>🅿️ Parcheggio ${
          ristorante.parcheggio.distanza_m != null
            ? Math.round(
                Number(
                  ristorante.parcheggio.distanza_m
                )
              ) + " m"
            : "presente"
        }</small>`
      : `<small>🅿️ Parcheggio da verificare</small>`;

  return `
    <div style="min-width:190px;line-height:1.4">
      <strong>${nome}</strong>
      ${
        ristorante.cucina
          ? `<small>🍽️ ${escapeHtml(
              ristorante.cucina
            )}</small>`
          : ""
      }
      ${distanza}
      ${parcheggio}
      ${
        ristorante.telefono
          ? `<small>📞 ${escapeHtml(
              ristorante.telefono
            )}</small>`
          : ""
      }
    </div>
  `;

}


function creaMarkerRistorante(ristorante) {

  if (
    typeof ristorante.lat !== "number" ||
    typeof ristorante.lon !== "number"
  ) {

    return null;

  }

  const marker =
    L.marker(
      [
        ristorante.lat,
        ristorante.lon
      ],
      {
        icon:
          restaurantIcon
      }
    );

  marker.bindPopup(
    creaPopupRistorante(
      ristorante
    )
  );

  return marker;

}


function chiudiPannelloRistoranti() {

  const panel =
    document.getElementById(
      "ristorantiMapPanel"
    );

  if (panel) {

    panel.remove();

  }

}


function mostraTuttiRistoranti(uscita) {

  if (!uscita) {

    return;

  }

  const ristoranti =
    ristorantiPerUscita(
      uscita
    );

  ristorantiLayer.clearLayers();

  chiudiPannelloRistoranti();


  // -----------------------------------------------
  // CREA MARKER
  // -----------------------------------------------

  const bounds =
    L.latLngBounds(
      [
        [
          uscita.lat,
          uscita.lon
        ]
      ]
    );

  let markerCount = 0;

  ristoranti.forEach(
    function(ristorante) {

      const marker =
        creaMarkerRistorante(
          ristorante
        );

      if (!marker) {

        return;

      }

      marker.addTo(
        ristorantiLayer
      );

      bounds.extend(
        [
          ristorante.lat,
          ristorante.lon
        ]
      );

      markerCount++;

    }
  );


  if (bounds.isValid()) {

    map.fitBounds(
      bounds,
      {
        padding:
          [45, 45],

        maxZoom:
          15
      }
    );

  }


  // -----------------------------------------------
  // PANNELLO
  // -----------------------------------------------

  const panel =
    document.createElement(
      "div"
    );

  panel.id =
    "ristorantiMapPanel";

  panel.style.cssText =
    "position:fixed;z-index:10000;left:50%;top:50%;transform:translate(-50%,-50%);width:min(92vw,520px);max-height:80vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 10px 40px rgba(0,0,0,.35);padding:18px;font-family:system-ui,sans-serif;";


  if (!ristoranti.length) {

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong style="font-size:20px">
          Nessun ristorante
        </strong>

        <button
          id="chiudiRistorantiMap"
          type="button"
          style="border:0;border-radius:50%;width:36px;height:36px;font-size:20px;cursor:pointer"
        >
          ×
        </button>
      </div>

      <p>
        Non risultano ristoranti associati
        a questa uscita nel database.
      </p>
    `;

    document.body.appendChild(
      panel
    );

    panel
      .querySelector(
        "#chiudiRistorantiMap"
      )
      .addEventListener(
        "click",
        chiudiPannelloRistoranti
      );

    return;

  }


  const cards =
    ristoranti.map(
      function(
        ristorante,
        index
      ) {

        const nome =
          escapeHtml(
            ristorante.nome ||
            "Ristorante"
          );

        const distanza =
          Number.isFinite(
            Number(
              ristorante?.uscita?.distanza_m
            )
          )
            ? Math.round(
                Number(
                  ristorante.uscita.distanza_m
                )
              ) + " m dall'uscita"
            : "";

        const parcheggio =
          ristorante.parcheggio?.presente === true
            ? "🅿️ Parcheggio " +
              (
                ristorante.parcheggio.distanza_m != null
                  ? Math.round(
                      Number(
                        ristorante.parcheggio.distanza_m
                      )
                    ) + " m"
                  : "presente"
              )
            : "🅿️ Parcheggio da verificare";

        return `
          <div
            style="border:1px solid #e5e5e5;border-radius:14px;padding:12px;margin-top:10px"
          >

            <div
              style="display:flex;justify-content:space-between;gap:10px"
            >

              <div>

                <strong>
                  ${index + 1}. ${nome}
                </strong>

                ${
                  ristorante.cucina
                    ? `<div style="font-size:12px;color:#555;margin-top:3px">
                        🍽️ ${escapeHtml(
                          ristorante.cucina
                        )}
                      </div>`
                    : ""
                }

              </div>

              ${
                typeof ristorante.lat === "number" &&
                typeof ristorante.lon === "number"

                  ? `<button
                      type="button"
                      data-ristorante-index="${index}"
                      style="border:0;border-radius:10px;background:#075c3b;color:#fff;padding:8px 10px;font-weight:700;cursor:pointer"
                    >
                      📍 MAPPA
                    </button>`

                  : ""
              }

            </div>

            <div
              style="font-size:12px;color:#555;margin-top:7px;display:grid;gap:3px"
            >

              ${
                distanza
                  ? `<span>📍 ${distanza}</span>`
                  : ""
              }

              <span>
                ${parcheggio}
              </span>

              ${
                ristorante.telefono
                  ? `<span>
                      📞 ${escapeHtml(
                        ristorante.telefono
                      )}
                    </span>`
                  : ""
              }

            </div>

          </div>
        `;

      }
    )
    .join("");


  panel.innerHTML = `

    <div
      style="display:flex;justify-content:space-between;align-items:center;gap:10px;position:sticky;top:0;background:#fff;padding-bottom:10px"
    >

      <div>

        <strong style="font-size:20px">
          🍴 Ristoranti
        </strong>

        <div style="font-size:13px;color:#555">
          ${escapeHtml(
            uscita.nome ||
            "Uscita autostradale"
          )}

          ·

          ${ristoranti.length}
          trovati

        </div>

      </div>


      <button
        id="chiudiRistorantiMap"
        type="button"
        style="border:0;border-radius:50%;width:36px;height:36px;font-size:20px;cursor:pointer"
      >
        ×
      </button>

    </div>

    ${cards}

    <button
      id="chiudiRistorantiMapBottom"
      type="button"
      style="width:100%;margin-top:14px;border:0;border-radius:12px;background:#075c3b;color:#fff;padding:12px;font-weight:700;cursor:pointer"
    >
      CHIUDI
    </button>

  `;

  document.body.appendChild(
    panel
  );


  panel
    .querySelector(
      "#chiudiRistorantiMap"
    )
    .addEventListener(
      "click",
      chiudiPannelloRistoranti
    );

  panel
    .querySelector(
      "#chiudiRistorantiMapBottom"
    )
    .addEventListener(
      "click",
      chiudiPannelloRistoranti
    );


  panel
    .querySelectorAll(
      "[data-ristorante-index]"
    )
    .forEach(
      function(button) {

        button.addEventListener(
          "click",
          function() {

            const index =
              Number(
                button.getAttribute(
                  "data-ristorante-index"
                )
              );

            const ristorante =
              ristoranti[index];

            if (!ristorante) {

              return;

            }

            chiudiPannelloRistoranti();

            map.setView(
              [
                ristorante.lat,
                ristorante.lon
              ],
              17,
              {
                animate:
                  true
              }
            );


            ristorantiLayer.eachLayer(
              function(layer) {

                if (
                  layer.getLatLng &&
                  Math.abs(
                    layer.getLatLng().lat -
                    ristorante.lat
                  ) < 0.000001 &&
                  Math.abs(
                    layer.getLatLng().lng -
                    ristorante.lon
                  ) < 0.000001
                ) {

                  layer.openPopup();

                }

              }
            );

          }
        );

      }
    );


  console.log(
    "Ristoranti mostrati:",
    ristoranti.length,
    "Marker:",
    markerCount,
    "Uscita:",
    uscita.nome
  );

}


window.mostraTuttiRistoranti =
  mostraTuttiRistoranti;


fetch("./ristoranti.json")
  .then(
    function(response) {

      if (!response.ok) {

        throw new Error(
          "Impossibile caricare ristoranti.json"
        );

      }

      return response.json();

    }
  )
  .then(
    function(database) {

      if (
        !Array.isArray(database)
      ) {

        throw new Error(
          "ristoranti.json non contiene un array"
        );

      }

      ristorantiDatabase =
        database;

      ristorantiPerUscitaMap.clear();

      ristorantiDatabase.forEach(
        function(ristorante) {

          const id =
            ristorante?.uscita?.id;

          if (!id) {

            return;

          }

          const chiave =
            String(id);

          if (
            !ristorantiPerUscitaMap.has(
              chiave
            )
          ) {

            ristorantiPerUscitaMap.set(
              chiave,
              []
            );

          }

          ristorantiPerUscitaMap
            .get(chiave)
            .push(
              ristorante
            );

        }
      );

      console.log(
        "Ristoranti caricati:",
        ristorantiDatabase.length
      );

      console.log(
        "Uscite con ristoranti:",
        ristorantiPerUscitaMap.size
      );

    }
  )
  .catch(
    function(error) {

      console.error(
        "Errore database ristoranti:",
        error
      );

    }
  );


// =====================================================
// CLICK "MOSTRA TUTTI" DAL POPUP
// =====================================================

document.addEventListener(
  "click",
  function(event) {

    const button =
      event.target.closest(
        ".mostra-tutti-ristoranti"
      );

    if (!button) {

      return;

    }

    event.preventDefault();
    event.stopPropagation();

    const id =
      button.getAttribute(
        "data-uscita-id"
      );

    if (!id) {

      return;

    }

    const uscita =
      usciteItaliane.find(
        function(item) {

          return String(
            item.id || ""
          ) === String(id);

        }
      );

    if (!uscita) {

      console.error(
        "Uscita non trovata:",
        id
      );

      return;

    }

    mostraTuttiRistoranti(
      uscita
    );

  },
  true
);


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

  const id =
    escapeHtml(
      String(
        uscita.id || ""
      )
    );

  const ristoranti =
    ristorantiPerUscita(
      uscita
    );

  const numero =
    ristoranti.length;

  let popup = `

    <div class="exit-popup">

      <strong>
        ${escapeHtml(
          uscita.nome ||
          "Uscita autostradale"
        )}
      </strong>

  `;


  if (uscita.autostrada) {

    popup += `

      <small>
        ${escapeHtml(
          uscita.autostrada
        )}

    `;


    if (uscita.numero_uscita) {

      popup +=
        ` · Uscita ${escapeHtml(
          uscita.numero_uscita
        )}`;

    }


    popup += `

      </small>

    `;

  }


  if (uscita.nome_autostrada) {

    popup += `

      <small>
        ${escapeHtml(
          uscita.nome_autostrada
        )}
      </small>

    `;

  }


  popup += `

      <small>
        📍 Uscita autostradale
      </small>

      <button
        type="button"
        class="mostra-tutti-ristoranti"
        data-uscita-id="${id}"
        style="
          display:block;
          width:100%;
          margin-top:10px;
          border:0;
          border-radius:10px;
          background:#075c3b;
          color:#fff;
          padding:10px 12px;
          font-weight:700;
          cursor:pointer;
        "
      >
        🍴 MOSTRA TUTTI
        ${
          numero
            ? `(${numero})`
            : ""
        }
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
  document.getElementById("mapButton");

const mapSection =
  document.getElementById("mapSection");

if (mapButton) {
  mapButton.addEventListener("click", function () {
    if (mapSection) {
      mapSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  });
}


// =====================================================
// GEOLOCALIZZAZIONE
// =====================================================
// La geolocalizzazione è gestita esclusivamente da gps.js
// + home-gps.js / collega-gps.js.
// =====================================================

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