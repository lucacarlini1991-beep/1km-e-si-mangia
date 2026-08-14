// =====================================================
// 1 KM E SI MANGIA
// SCRIPT PRINCIPALE
// =====================================================


// =====================================================
// CONFIGURAZIONE
// =====================================================

const CONFIG = {

  // Database uscite
  databaseUscite: "./uscite_classificate.json",

  // Filtro ristoranti futuro
  distanzaMassimaRistorante: 2000,

  // Tolleranza: 100 metri
  tolleranzaDistanza: 100,

  // Distanza effettiva massima
  distanzaMassimaEffettiva: 2100

};


// =====================================================
// ELEMENTI PAGINA
// =====================================================

const mapButton =
  document.getElementById("mapButton");

const locationButton =
  document.getElementById("locationButton");

const mapSection =
  document.getElementById("mappa");

const menuButton =
  document.querySelector(".menu-button");


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
// GRUPPO MARKER
// =====================================================

// Usiamo il clustering se il plugin è disponibile.
// Altrimenti il sito continua comunque a funzionare.

let clusterUscite;

if (typeof L.markerClusterGroup === "function") {

  clusterUscite = L.markerClusterGroup({

    showCoverageOnHover: false,

    spiderfyOnMaxZoom: true,

    zoomToBoundsOnClick: true,

    removeOutsideVisibleBounds: true,

    maxClusterRadius: 55

  });

} else {

  console.warn(
    "MarkerCluster non disponibile: uso LayerGroup."
  );

  clusterUscite = L.layerGroup();

}

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
// CARICAMENTO DATABASE USCITE
// =====================================================

fetch(CONFIG.databaseUscite)

  .then(function(response) {

    if (!response.ok) {

      throw new Error(
        "Impossibile caricare " +
        CONFIG.databaseUscite
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
      "Record caricati:",
      usciteItaliane.length
    );

    console.log(
      "================================="
    );


    // ---------------------------------------------
    // CREA MARKER
    // ---------------------------------------------

    usciteItaliane.forEach(function(uscita) {

      // -------------------------------------------
      // COORDINATE VALIDE
      // -------------------------------------------

      if (

        typeof uscita.lat !== "number" ||

        typeof uscita.lon !== "number"

      ) {

        return;

      }


      // -------------------------------------------
      // FILTRO DATABASE
      // -------------------------------------------

      // Se il nuovo database contiene il campo
      // visualizza_mappa, rispettiamo quello.

      if (
        uscita.visualizza_mappa === false
      ) {

        return;

      }


      // -------------------------------------------
      // CREA MARKER
      // -------------------------------------------

      const marker = L.marker(

        [
          uscita.lat,
          uscita.lon
        ],

        {
          icon: exitIcon
        }

      );


      // -------------------------------------------
      // POPUP
      // -------------------------------------------

      let popup = `

        <div class="exit-popup">

          <strong>
            ${escapeHTML(
              uscita.nome || "Uscita autostradale"
            )}
          </strong>

      `;


      if (uscita.autostrada) {

        popup += `

          <small>

            ${escapeHTML(
              uscita.autostrada
            )}

        `;


        if (uscita.numero_uscita) {

          popup +=

            ` · Uscita ${
              escapeHTML(
                String(uscita.numero_uscita)
              )
            }`;

        }


        popup += `

          </small>

        `;

      }


      if (uscita.nome_autostrada) {

        popup += `

          <small>
            ${escapeHTML(
              uscita.nome_autostrada
            )}
          </small>

        `;

      }


      popup += `

          <small>
            📍 Uscita autostradale
          </small>

        </div>

      `;


      marker.bindPopup(popup);


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


      clusterUscite.addLayer(marker);

    });


  })

  .catch(function(error) {

    console.error(
      "Errore database uscite:",
      error
    );

  });


// =====================================================
// SICUREZZA TESTO POPUP
// =====================================================

function escapeHTML(value) {

  return String(value)

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(/'/g, "&#039;");

}


// =====================================================
// PULSANTE ESPLORA LA MAPPA
// =====================================================

if (mapButton) {

  mapButton.addEventListener(

    "click",

    function() {

      if (!mapSection) {

        return;

      }


      mapSection.scrollIntoView({

        behavior: "smooth",

        block: "start"

      });


      // Necessario quando Leaflet viene visualizzato
      // dopo uno scroll.

      setTimeout(function() {

        map.invalidateSize();

      }, 500);

    }

  );

}


// =====================================================
// GEOLOCALIZZAZIONE
// =====================================================

let userMarker = null;


if (locationButton) {

  locationButton.addEventListener(

    "click",

    function() {

      if (!navigator.geolocation) {

        alert(
          "La geolocalizzazione non è disponibile."
        );

        return;

      }


      locationButton.textContent =
        "📍 RICERCA POSIZIONE...";


      navigator.geolocation.getCurrentPosition(

        function(position) {

          const lat =
            position.coords.latitude;

          const lng =
            position.coords.longitude;


          console.log(
            "Posizione GPS:",
            lat,
            lng
          );


          // ---------------------------------------
          // RIMUOVI VECCHIO MARKER
          // ---------------------------------------

          if (userMarker) {

            map.removeLayer(
              userMarker
            );

          }


          // ---------------------------------------
          // MARKER UTENTE
          // ---------------------------------------

          userMarker = L.circleMarker(

            [
              lat,
              lng
            ],

            {

              radius: 9,

              color: "#ffffff",

              weight: 4,

              fillColor: "#075c3b",

              fillOpacity: 1

            }

          );


          userMarker.addTo(map);


          userMarker

            .bindPopup(
              "📍 Sei qui"
            )

            .openPopup();


          // ---------------------------------------
          // ZOOM
          // ---------------------------------------

          map.flyTo(

            [
              lat,
              lng
            ],

            13,

            {
              duration: 1.5
            }

          );


          if (mapSection) {

            mapSection.scrollIntoView({

              behavior: "smooth",

              block: "start"

            });

          }


          locationButton.textContent =
            "📍 POSIZIONE TROVATA";


          setTimeout(function() {

            map.invalidateSize();

          }, 700);

        },


        function(error) {

          console.error(
            "Errore GPS:",
            error
          );


          alert(

            "Non siamo riusciti ad ottenere " +
            "la tua posizione. " +
            "Controlla l'autorizzazione " +
            "alla geolocalizzazione."

          );


          locationButton.textContent =
            "📍 USA LA MIA POSIZIONE";

        },


        {

          enableHighAccuracy: true,

          timeout: 10000,

          maximumAge: 30000

        }

      );

    }

  );

}


// =====================================================
// MENU PRINCIPALE
// =====================================================

let menuOverlay = null;


// -----------------------------------------------------
// CREA MENU
// -----------------------------------------------------

function createMenu() {

  if (menuOverlay) {

    return;

  }


  menuOverlay =
    document.createElement("div");


  menuOverlay.className =
    "site-menu-overlay";


  menuOverlay.innerHTML = `

    <div
      class="site-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu principale"
    >

      <div class="site-menu-header">

        <div class="site-menu-brand">

          <strong>
            1 KM
          </strong>

          <span>
            E SI MANGIA
          </span>

        </div>


        <button
          class="site-menu-close"
          type="button"
          aria-label="Chiudi menu"
        >
          ×
        </button>

      </div>


      <nav class="site-menu-nav">

        <button
          class="menu-link"
          type="button"
          data-target="top"
        >
          <span>🏠</span>
          <strong>HOME</strong>
        </button>


        <button
          class="menu-link"
          type="button"
          data-target="mappa"
        >
          <span>🗺️</span>
          <strong>ESPLORA LE USCITE</strong>
        </button>


        <button
          class="menu-link"
          type="button"
          data-target="come-funziona"
        >
          <span>❓</span>
          <strong>COME FUNZIONA</strong>
        </button>


        <button
          class="menu-link"
          type="button"
          data-target="distanze"
        >
          <span>📏</span>
          <strong>QUANTO TI ALLONTANI?</strong>
        </button>

      </nav>


      <div class="site-menu-footer">

        <strong>
          ESci. MANGIA. RIPARTI.
        </strong>

        <span>
          Trova il posto giusto senza perdere tempo.
        </span>

      </div>

    </div>

  `;


  document.body.appendChild(
    menuOverlay
  );


  // -----------------------------------------------
  // CHIUDI
  // -----------------------------------------------

  const closeButton =
    menuOverlay.querySelector(
      ".site-menu-close"
    );


  closeButton.addEventListener(

    "click",

    closeMenu

  );


  // -----------------------------------------------
  // CLICK FUORI
  // -----------------------------------------------

  menuOverlay.addEventListener(

    "click",

    function(event) {

      if (
        event.target === menuOverlay
      ) {

        closeMenu();

      }

    }

  );


  // -----------------------------------------------
  // LINK MENU
  // -----------------------------------------------

  const links =
    menuOverlay.querySelectorAll(
      ".menu-link"
    );


  links.forEach(function(link) {

    link.addEventListener(

      "click",

      function() {

        const target =
          link.dataset.target;


        closeMenu();


        setTimeout(function() {

          scrollToMenuTarget(
            target
          );

        }, 200);

      }

    );

  });

}


// -----------------------------------------------------
// APRI MENU
// -----------------------------------------------------

function openMenu() {

  createMenu();


  menuOverlay.classList.add(
    "is-open"
  );


  document.body.classList.add(
    "menu-open"
  );


  document.querySelector(
    ".site-menu-close"
  ).focus();

}


// -----------------------------------------------------
// CHIUDI MENU
// -----------------------------------------------------

function closeMenu() {

  if (!menuOverlay) {

    return;

  }


  menuOverlay.classList.remove(
    "is-open"
  );


  document.body.classList.remove(
    "menu-open"
  );

}


// -----------------------------------------------------
// CLICK TASTO MENU
// -----------------------------------------------------

if (menuButton) {

  menuButton.addEventListener(

    "click",

    function(event) {

      event.preventDefault();

      event.stopPropagation();

      openMenu();

    }

  );

}


// =====================================================
// ESC PER CHIUDERE IL MENU
// =====================================================

document.addEventListener(

  "keydown",

  function(event) {

    if (
      event.key === "Escape"
    ) {

      closeMenu();

    }

  }

);


// =====================================================
// NAVIGAZIONE MENU
// =====================================================

function scrollToMenuTarget(target) {

  if (target === "top") {

    window.scrollTo({

      top: 0,

      behavior: "smooth"

    });

    return;

  }


  let element = null;


  if (target === "mappa") {

    element =
      document.getElementById(
        "mappa"
      );

  }


  if (target === "come-funziona") {

    element =
      document.querySelector(
        ".how-it-works"
      );

  }


  if (target === "distanze") {

    element =
      document.querySelector(
        ".rules"
      );

  }


  if (!element) {

    return;

  }


  element.scrollIntoView({

    behavior: "smooth",

    block: "start"

  });


  if (target === "mappa") {

    setTimeout(function() {

      map.invalidateSize();

    }, 600);

  }

}


// =====================================================
// FILTRO DISTANZA
// =====================================================
//
// PREPARAZIONE PER IL DATABASE RISTORANTI.
//
// Regola:
// 2.000 metri + 100 metri di tolleranza
// = 2.100 metri massimi.
//
// Non viene ancora applicato ai ristoranti perché
// il database ristoranti verrà costruito nel prossimo
// passaggio.
// =====================================================

function ristoranteDentroDistanza(
  distanzaMetri
) {

  return (

    typeof distanzaMetri === "number" &&

    distanzaMetri <=
      CONFIG.distanzaMassimaEffettiva

  );

}


// =====================================================
// DISTANZA TRA DUE COORDINATE
// =====================================================

function distanzaMetri(

  lat1,
  lon1,
  lat2,
  lon2

) {

  const R = 6371000;

  const rad =
    Math.PI / 180;


  const phi1 =
    lat1 * rad;

  const phi2 =
    lat2 * rad;


  const deltaPhi =
    (lat2 - lat1) * rad;


  const deltaLambda =
    (lon2 - lon1) * rad;


  const a =

    Math.sin(deltaPhi / 2) *
    Math.sin(deltaPhi / 2)

    +

    Math.cos(phi1) *
    Math.cos(phi2) *

    Math.sin(deltaLambda / 2) *
    Math.sin(deltaLambda / 2);


  const c =

    2 *
    Math.atan2(

      Math.sqrt(a),

      Math.sqrt(1 - a)

    );


  return R * c;

}


// =====================================================
// TROVA USCITE VICINE
// =====================================================
//
// Funzione che utilizzeremo quando collegheremo
// posizione GPS + uscita + ristoranti.
// =====================================================

function trovaUsciteVicino(

  lat,
  lon,
  distanzaMassima = 2000

) {

  return usciteItaliane.filter(

    function(uscita) {

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


      const distanza =

        distanzaMetri(

          lat,
          lon,

          uscita.lat,
          uscita.lon

        );


      return (
        distanza <= distanzaMassima
      );

    }

  );

}


// =====================================================
// RESIZE MAPPA
// =====================================================

window.addEventListener(

  "resize",

  function() {

    setTimeout(function() {

      map.invalidateSize();

    }, 200);

  }

);


// =====================================================
// FINE SCRIPT
// =====================================================

console.log(
  "1 KM E SI MANGIA - SCRIPT CARICATO"
);

console.log(
  "Filtro ristoranti:",
  CONFIG.distanzaMassimaRistorante,
  "m +",
  CONFIG.tolleranzaDistanza,
  "m =",
  CONFIG.distanzaMassimaEffettiva,
  "m"
);