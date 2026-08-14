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
        📍 Uscita autostradale
      </small>

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


          // ---------------------------------------
          // SCROLL MAPPA
          // ---------------------------------------

          if (mapSection) {

            mapSection.scrollIntoView({

              behavior: "smooth"

            });

          }


          locationButton.textContent =
            "📍 POSIZIONE TROVATA";

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
// MENU LATERALE
// =====================================================

const menuButton =
  document.querySelector(
    ".menu-button"
  );


const siteMenu =
  document.querySelector(
    ".site-menu"
  );


const menuOverlay =
  document.querySelector(
    ".site-menu-overlay"
  );


const menuClose =
  document.querySelector(
    ".site-menu-close"
  );


// =====================================================
// APRI MENU
// =====================================================

function openMenu() {

  if (!siteMenu) {

    console.warn(
      "Menu non trovato"
    );

    return;

  }


  siteMenu.classList.add(
    "open"
  );


  if (menuOverlay) {

    menuOverlay.classList.add(
      "open"
    );

  }


  document.body.classList.add(
    "menu-open"
  );

}


// =====================================================
// CHIUDI MENU
// =====================================================

function closeMenu() {

  if (siteMenu) {

    siteMenu.classList.remove(
      "open"
    );

  }


  if (menuOverlay) {

    menuOverlay.classList.remove(
      "open"
    );

  }


  document.body.classList.remove(
    "menu-open"
  );

}


// =====================================================
// TASTO MENU
// =====================================================

if (menuButton) {

  menuButton.addEventListener(

    "click",

    function() {

      if (

        siteMenu &&

        siteMenu.classList.contains(
          "open"
        )

      ) {

        closeMenu();

      } else {

        openMenu();

      }

    }

  );

}


// =====================================================
// TASTO X
// =====================================================

if (menuClose) {

  menuClose.addEventListener(

    "click",

    function() {

      closeMenu();

    }

  );

}


// =====================================================
// CLICK OVERLAY
// =====================================================

if (menuOverlay) {

  menuOverlay.addEventListener(

    "click",

    function() {

      closeMenu();

    }

  );

}


// =====================================================
// TASTO ESC
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
// LINK DEL MENU
// =====================================================

const menuLinks =
  document.querySelectorAll(
    ".menu-link"
  );


menuLinks.forEach(

  function(link) {

    link.addEventListener(

      "click",

      function(event) {

        const target =
          link.getAttribute(
            "href"
          );


        if (

          target &&

          target.startsWith("#")

        ) {

          event.preventDefault();


          const elemento =
            document.querySelector(
              target
            );


          closeMenu();


          if (elemento) {

            setTimeout(

              function() {

                elemento.scrollIntoView({

                  behavior: "smooth",

                  block: "start"

                });

              },

              150

            );

          }

        }

      }

    );

  }

);


// =====================================================
// RESIZE MAPPA
// =====================================================

window.addEventListener(

  "resize",

  function() {

    setTimeout(

      function() {

        map.invalidateSize();

      },

      100

    );

  }

);


// =====================================================
// AVVIO
// =====================================================

console.log(
  "================================="
);

console.log(
  "1 KM E SI MANGIA - SCRIPT AVVIATO"
);

console.log(
  "Filtro:",
  CONFIG.distanzaMassimaRistoranteKm +
  " km + " +
  CONFIG.tolleranzaDistanzaMetri +
  " m"
);

console.log(
  "================================="
);
// =====================================================
// MENU PRINCIPALE
// =====================================================

document.addEventListener("DOMContentLoaded", function () {

  const menuButton = document.querySelector(".menu-button");
  const mobileMenu = document.getElementById("mobileMenu");
  const menuClose = document.getElementById("menuClose");

  if (!menuButton || !mobileMenu) {
    console.warn("Menu principale: elementi non trovati");
    return;
  }

  function openMenu() {

    mobileMenu.classList.add("open");
    mobileMenu.setAttribute("aria-hidden", "false");

    document.body.classList.add("menu-open");
  }


  function closeMenu() {

    mobileMenu.classList.remove("open");
    mobileMenu.setAttribute("aria-hidden", "true");

    document.body.classList.remove("menu-open");
  }


  // APERTURA
  menuButton.addEventListener("click", function (event) {

    event.preventDefault();
    event.stopPropagation();

    openMenu();

  });


  // CHIUSURA CON X
  if (menuClose) {

    menuClose.addEventListener("click", function (event) {

      event.preventDefault();
      event.stopPropagation();

      closeMenu();

    });

  }


  // CHIUSURA CLICCANDO FUORI DAL PANNELLO
  mobileMenu.addEventListener("click", function (event) {

    if (event.target === mobileMenu) {

      closeMenu();

    }

  });


  // CHIUSURA CON ESC
  document.addEventListener("keydown", function (event) {

    if (event.key === "Escape") {

      closeMenu();

    }

  });


  // LINK DEL MENU
  const menuLinks =
    mobileMenu.querySelectorAll(".menu-link");

  menuLinks.forEach(function (link) {

    link.addEventListener("click", function () {

      closeMenu();

    });

  });


  console.log("MENU PRINCIPALE ATTIVO");

});