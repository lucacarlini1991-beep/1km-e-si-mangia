// =====================================================
// 1 KM E SI MANGIA
// SCRIPT PRINCIPALE
// =====================================================


// =====================================================
// CONFIGURAZIONE
// =====================================================

const CONFIG = {

  // Distanza massima teorica dal ristorante
  distanzaMassimaRistoranteKm: 2,

  // Tolleranza tecnica
  tolleranzaDistanzaMetri: 100,

  // Distanza effettiva
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
// DATABASE USCITE
// =====================================================

let usciteItaliane = [];


// =====================================================
// FUNZIONE:
// CONTROLLA SE È UN'AREA DI SERVIZIO
// =====================================================

function eAreaDiServizio(uscita) {

  if (!uscita) {

    return true;

  }


  // ---------------------------------------------------
  // TIPO DATABASE
  // ---------------------------------------------------

  const tipo =
    String(
      usci­taTipo(uscita)
    ).toLowerCase();


  if (

    tipo.includes("servizio") ||

    tipo.includes("sosta") ||

    tipo.includes("autogrill") ||

    tipo.includes("ristoro") ||

    tipo.includes("service")

  ) {

    return true;

  }


  // ---------------------------------------------------
  // NOME
  // ---------------------------------------------------

  const nome = (

    String(
      uscita.nome || ""
    ) +

    " " +

    String(
      uscita.nome_autostrada || ""
    ) +

    " " +

    String(
      uscita.autostrada || ""
    )

  )

    .toLowerCase()

    .replace(/\s+/g, " ");


  const paroleAreaServizio = [

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


  return paroleAreaServizio.some(

    function (parola) {

      return nome.includes(parola);

    }

  );

}


// =====================================================
// LETTURA SICURA DEL CAMPO TIPO
// =====================================================

function usci­taTipo(uscita) {

  if (
    uscita.tipo !== undefined &&
    uscita.tipo !== null
  ) {

    return uscita.tipo;

  }


  return "";

}


// =====================================================
// CONTROLLA SE L'USCITA DEVE ESSERE VISIBILE
// =====================================================

function uscitaVisibile(uscita) {

  if (!uscita) {

    return false;

  }


  // ---------------------------------------------------
  // COORDINATE
  // ---------------------------------------------------

  if (

    typeof uscita.lat !== "number" ||

    typeof uscita.lon !== "number"

  ) {

    return false;

  }


  // ---------------------------------------------------
  // CAMPO visualizza_mappa
  // ---------------------------------------------------

  if (
    uscita.visualizza_mappa === false
  ) {

    return false;

  }


  // ---------------------------------------------------
  // ESCLUSIONE AREE DI SERVIZIO
  // ---------------------------------------------------

  if (
    eAreaDiServizio(uscita)
  ) {

    return false;

  }


  return true;

}


// =====================================================
// CREA POPUP USCITA
// =====================================================

function creaPopupUscita(uscita) {

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
// CREA MARKER
// =====================================================

function creaMarkerUscita(uscita) {

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

    creaPopupUscita(
      uscita
    )

  );


  // ---------------------------------------------------
  // CLICK MARKER
  // ---------------------------------------------------

  marker.on(

    "click",

    function () {

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


  return marker;

}


// =====================================================
// CARICAMENTO DATABASE
// =====================================================

fetch("./uscite.json")

  .then(

    function (response) {

      if (!response.ok) {

        throw new Error(

          "Impossibile caricare uscite.json"

        );

      }


      return response.json();

    }

  )

  .then(

    function (database) {

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


      let conteggioVisibili = 0;

      let conteggioEscluse = 0;


      // ------------------------------------------------
      // CREA MARKER
      // ------------------------------------------------

      usciteItaliane.forEach(

        function (uscita) {


          // --------------------------------------------
          // FILTRO PRINCIPALE
          // --------------------------------------------

          if (
            !uscitaVisibile(uscita)
          ) {

            conteggioEscluse++;

            return;

          }


          // --------------------------------------------
          // CREA MARKER
          // --------------------------------------------

          const marker =
            creaMarkerUscita(
              uscita
            );


          clusterUscite.addLayer(
            marker
          );


          conteggioVisibili++;

        }

      );


      console.log(

        "Uscite visibili:",

        conteggioVisibili

      );


      console.log(

        "Elementi esclusi:",

        conteggioEscluse

      );


      console.log(

        "Filtro ristoranti:",

        CONFIG.distanzaMassimaRistoranteKm,

        "km +",

        CONFIG.tolleranzaDistanzaMetri,

        "m"

      );

    }

  )

  .catch(

    function (error) {

      console.error(

        "Errore database:",

        error

      );

    }

  );


// =====================================================
// PULSANTE ESPLORA LA MAPPA
// =====================================================

const mapButton =
  document.getElementById(
    "mapButton"
  );


const mapSection =
  document.getElementById(
    "mappa"
  );


if (mapButton) {

  mapButton.addEventListener(

    "click",

    function () {

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

    function () {


      if (!navigator.geolocation) {

        alert(

          "La geolocalizzazione " +
          "non è disponibile."

        );

        return;

      }


      locationButton.textContent =
        "📍 RICERCA POSIZIONE...";


      navigator.geolocation.getCurrentPosition(

        function (position) {


          const lat =
            position.coords.latitude;


          const lng =
            position.coords.longitude;


          console.log(

            "Posizione GPS:",

            lat,

            lng

          );


          // -------------------------------------------
          // RIMUOVI VECCHIO MARKER
          // -------------------------------------------

          if (userMarker) {

            map.removeLayer(
              userMarker
            );

          }


          // -------------------------------------------
          // MARKER UTENTE
          // -------------------------------------------

          userMarker =
            L.circleMarker(

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


          // -------------------------------------------
          // ZOOM
          // -------------------------------------------

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


          // -------------------------------------------
          // SCROLL MAPPA
          // -------------------------------------------

          if (mapSection) {

            mapSection.scrollIntoView({

              behavior: "smooth"

            });

          }


          locationButton.textContent =
            "📍 POSIZIONE TROVATA";

        },


        function (error) {

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


// -----------------------------------------------------
// ELEMENTI MENU
// -----------------------------------------------------

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


// -----------------------------------------------------
// APRI MENU
// -----------------------------------------------------

function openMenu() {

  if (!siteMenu) {

    console.warn(
      "Menu non trovato."
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


// -----------------------------------------------------
// CHIUDI MENU
// -----------------------------------------------------

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


// -----------------------------------------------------
// PULSANTE MENU
// -----------------------------------------------------

if (menuButton) {

  menuButton.addEventListener(

    "click",

    function () {

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


// -----------------------------------------------------
// CHIUDI CON X
// -----------------------------------------------------

if (menuClose) {

  menuClose.addEventListener(

    "click",

    function () {

      closeMenu();

    }

  );

}


// -----------------------------------------------------
// CHIUDI CLICCANDO SULLO SFONDO
// -----------------------------------------------------

if (menuOverlay) {

  menuOverlay.addEventListener(

    "click",

    function () {

      closeMenu();

    }

  );

}


// -----------------------------------------------------
// ESC PER CHIUDERE
// -----------------------------------------------------

document.addEventListener(

  "keydown",

  function (event) {

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

const menuLinks =
  document.querySelectorAll(
    ".menu-link"
  );


menuLinks.forEach(

  function (link) {

    link.addEventListener(

      "click",

      function (event) {

        const target =
          link.getAttribute(
            "href"
          );


        // ---------------------------------------------
        // LINK INTERNI
        // ---------------------------------------------

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

              function () {

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
// AGGIORNA MAPPA DOPO SCROLL
// =====================================================

window.addEventListener(

  "resize",

  function () {

    setTimeout(

      function () {

        map.invalidateSize();

      },

      100

    );

  }

);


// =====================================================
// LOG AVVIO
// =====================================================

console.log(
  "================================="
);

console.log(
  "1 KM E SI MANGIA - SCRIPT AVVIATO"
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

console.log(
  "================================="
);