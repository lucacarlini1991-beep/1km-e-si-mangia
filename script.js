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
// NORMALIZZA TESTO
// =====================================================

function normalizzaTesto(valore) {

  return String(valore || "")

    .toLowerCase()

    .normalize("NFD")

    .replace(/[\u0300-\u036f]/g, "")

    .replace(/\s+/g, " ")

    .trim();

}


// =====================================================
// CONTROLLA AREA DI SERVIZIO / AUTOGRILL
// =====================================================

function eAreaDiServizio(uscita) {

  if (!uscita) {

    return true;

  }


  const tipo =
    normalizzaTesto(
      uscita.tipo
    );


  const nome =
    normalizzaTesto(
      uscita.nome
    );


  const nomeAutostrada =
    normalizzaTesto(
      uscita.nome_autostrada
    );


  const autostrada =
    normalizzaTesto(
      uscita.autostrada
    );


  // ---------------------------------------------
  // TIPO
  // ---------------------------------------------

  if (

    tipo === "area_servizio" ||

    tipo === "area di servizio" ||

    tipo === "area servizio" ||

    tipo === "area_sosta" ||

    tipo === "area di sosta" ||

    tipo === "autogrill" ||

    tipo === "service_area" ||

    tipo === "service area" ||

    tipo === "rest_area"

  ) {

    return true;

  }


  // ---------------------------------------------
  // NOME
  // ---------------------------------------------

  const testo =

    nome + " " +
    nomeAutostrada + " " +
    autostrada;


  const paroleEscluse = [

    "area di servizio",

    "area servizio",

    "area di sosta",

    "area sosta",

    "area di ristoro",

    "area ristoro",

    "autogrill",

    "service area",

    "service station",

    "rest area",

    "rest stop",

    "truck stop"

  ];


  for (

    let i = 0;

    i < paroleEscluse.length;

    i++

  ) {

    if (

      testo.includes(
        paroleEscluse[i]
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


  // Coordinate

  if (

    typeof uscita.lat !== "number" ||

    typeof uscita.lon !== "number"

  ) {

    return false;

  }


  // Database: se false, non mostrare

  if (

    uscita.visualizza_mappa === false

  ) {

    return false;

  }


  // Area di servizio / autogrill

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
// CARICA DATABASE
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
      "Record caricati:",
      usciteItaliane.length
    );

    console.log(
      "================================="
    );


    let visibili = 0;

    let escluse = 0;


    usciteItaliane.forEach(

      function(uscita) {


        if (
          !uscitaValida(uscita)
        ) {

          escluse++;

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


        visibili++;

      }

    );


    console.log(
      "Uscite visibili:",
      visibili
    );


    console.log(
      "Record esclusi:",
      escluse
    );

  })


  .catch(function(error) {

    console.error(
      "Errore database:",
      error
    );

  });


// =====================================================
// MAPPA - PULSANTE ESPLORA
// =====================================================

const mapButton =
  document.getElementById(
    "mapButton"
  );


const mapSection =
  document.getElementById(
    "mappa"
  ) ||
  document.getElementById(
    "mapSection"
  );


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


      setTimeout(

        function() {

          map.invalidateSize();

        },

        500

      );

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


          if (userMarker) {

            map.removeLayer(
              userMarker
            );

          }


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


          userMarker.addTo(
            map
          );


          userMarker

            .bindPopup(
              "📍 Sei qui"
            )

            .openPopup();


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
// MENU MOBILE
// =====================================================

document.addEventListener(

  "DOMContentLoaded",

  function() {


    const menuButton =
      document.querySelector(
        ".menu-button"
      );


    const mobileMenu =
      document.getElementById(
        "mobileMenu"
      );


    const menuClose =
      document.getElementById(
        "menuClose"
      );


    console.log(
      "MENU BUTTON:",
      menuButton
    );


    console.log(
      "MOBILE MENU:",
      mobileMenu
    );


    console.log(
      "MENU CLOSE:",
      menuClose
    );


    if (!menuButton) {

      console.error(
        "ERRORE: pulsante menu non trovato."
      );

      return;

    }


    if (!mobileMenu) {

      console.error(
        "ERRORE: #mobileMenu non trovato."
      );

      return;

    }


    // ---------------------------------------------
    // APRI
    // ---------------------------------------------

    function openMenu() {

      console.log(
        "APERTURA MENU"
      );


      mobileMenu.classList.add(
        "open"
      );


      mobileMenu.setAttribute(
        "aria-hidden",
        "false"
      );


      document.body.classList.add(
        "menu-open"
      );


      // Fallback visivo.
      // Serve se il CSS attuale non riconosce
      // correttamente la classe .open.

      mobileMenu.style.visibility =
        "visible";

      mobileMenu.style.opacity =
        "1";

      mobileMenu.style.pointerEvents =
        "auto";

      mobileMenu.style.transform =
        "translateX(0)";

    }


    // ---------------------------------------------
    // CHIUDI
    // ---------------------------------------------

    function closeMenu() {

      console.log(
        "CHIUSURA MENU"
      );


      mobileMenu.classList.remove(
        "open"
      );


      mobileMenu.setAttribute(
        "aria-hidden",
        "true"
      );


      document.body.classList.remove(
        "menu-open"
      );


      mobileMenu.style.opacity =
        "";

      mobileMenu.style.pointerEvents =
        "";

      mobileMenu.style.transform =
        "";

    }


    // ---------------------------------------------
    // HAMBURGER
    // ---------------------------------------------

    menuButton.addEventListener(

      "click",

      function(event) {

        event.preventDefault();

        event.stopPropagation();


        if (

          mobileMenu.classList.contains(
            "open"
          )

        ) {

          closeMenu();

        } else {

          openMenu();

        }

      }

    );


    // ---------------------------------------------
    // X
    // ---------------------------------------------

    if (menuClose) {

      menuClose.addEventListener(

        "click",

        function(event) {

          event.preventDefault();

          event.stopPropagation();


          closeMenu();

        }

      );

    }


    // ---------------------------------------------
    // ESC
    // ---------------------------------------------

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


    // ---------------------------------------------
    // LINK MENU
    // ---------------------------------------------

    const menuLinks =
      mobileMenu.querySelectorAll(
        "a"
      );


    menuLinks.forEach(

      function(link) {

        link.addEventListener(

          "click",

          function() {

            closeMenu();

          }

        );

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
// DISTANZA GPS
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


  const dLat =
    (lat2 - lat1) * rad;


  const dLon =
    (lon2 - lon1) * rad;


  const a =

    Math.sin(
      dLat / 2
    ) ** 2

    +

    Math.cos(
      lat1 * rad
    )

    *

    Math.cos(
      lat2 * rad
    )

    *

    Math.sin(
      dLon / 2
    ) ** 2;


  const c =

    2 *

    Math.atan2(

      Math.sqrt(a),

      Math.sqrt(1 - a)

    );


  return R * c;

}


// =====================================================
// CONTROLLO RISTORANTE
// 2 KM + 100 METRI
// =====================================================

function ristoranteEntroDistanza(

  latRistorante,
  lonRistorante,
  latUscita,
  lonUscita

) {

  const distanza =

    distanzaMetri(

      latRistorante,
      lonRistorante,

      latUscita,
      lonUscita

    );


  return {

    distanzaMetri:
      Math.round(
        distanza
      ),

    entroLimite:

      distanza <=
      CONFIG.distanzaMassimaEffettivaMetri

  };

}


// =====================================================
// AVVIO
// =====================================================

console.log(
  "================================="
);

console.log(
  "1 KM E SI MANGIA - AVVIATO"
);

console.log(
  "Distanza ristorante:",
  CONFIG.distanzaMassimaRistoranteKm +
  " km + " +
  CONFIG.tolleranzaDistanzaMetri +
  " m"
);

console.log(
  "Limite effettivo:",
  CONFIG.distanzaMassimaEffettivaMetri +
  " m"
);

console.log(
  "================================="
);