// =====================================================
// 1 KM E SI MANGIA
// SCRIPT PRINCIPALE
// =====================================================


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

const clusterUscite =
  L.markerClusterGroup({

    showCoverageOnHover: false,

    spiderfyOnMaxZoom: true,

    zoomToBoundsOnClick: true,

    removeOutsideVisibleBounds: true,

    maxClusterRadius: 55

  });


map.addLayer(
  clusterUscite
);



// =====================================================
// ICONA USCITA
// =====================================================

const exitIcon =
  L.divIcon({

    className: "",

    html:
      '<div class="custom-marker"></div>',

    iconSize: [
      36,
      36
    ],

    iconAnchor: [
      18,
      18
    ],

    popupAnchor: [
      0,
      -18
    ]

  });



// =====================================================
// DATABASE USCITE
// =====================================================

let usciteItaliane = [];



// =====================================================
// CARICAMENTO DATABASE
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

    usciteItaliane =
      database;


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


    // =================================================
    // CREA MARKER
    // =================================================

    usciteItaliane.forEach(
      function(uscita) {


        // -----------------------------------------------
        // CONTROLLO COORDINATE
        // -----------------------------------------------

        if (

          typeof uscita.lat !== "number" ||

          typeof uscita.lon !== "number"

        ) {

          return;

        }


        // -----------------------------------------------
        // CREA MARKER
        // -----------------------------------------------

        const marker =
          L.marker(

            [
              uscita.lat,
              uscita.lon
            ],

            {
              icon:
                exitIcon
            }

          );


        // -----------------------------------------------
        // POPUP
        // -----------------------------------------------

        let popup = `

          <div class="exit-popup">

            <strong>
              ${uscita.nome || "Uscita autostradale"}
            </strong>

        `;


        // -----------------------------------------------
        // AUTOSTRADA
        // -----------------------------------------------

        if (
          uscita.autostrada
        ) {

          popup += `

            <small>
              ${uscita.autostrada}

          `;


          if (
            uscita.numero_uscita
          ) {

            popup +=
              ` · Uscita ${uscita.numero_uscita}`;

          }


          popup += `

            </small>

          `;

        }


        // -----------------------------------------------
        // NOME AUTOSTRADA
        // -----------------------------------------------

        if (
          uscita.nome_autostrada
        ) {

          popup += `

            <small>
              ${uscita.nome_autostrada}
            </small>

          `;

        }


        // -----------------------------------------------
        // TIPO
        // -----------------------------------------------

        popup += `

            <small>
              📍 Uscita autostradale
            </small>

          </div>

        `;


        marker.bindPopup(
          popup
        );


        // -----------------------------------------------
        // CLICK MARKER
        // -----------------------------------------------

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


        // -----------------------------------------------
        // AGGIUNGI AL CLUSTER
        // -----------------------------------------------

        clusterUscite.addLayer(
          marker
        );

      }

    );

  })


  .catch(function(error) {

    console.error(
      "Errore database:",
      error
    );

  });



// =====================================================
// SEZIONE MAPPA
// =====================================================

const mapButton =
  document.getElementById(
    "mapButton"
  );


const mapSection =
  document.getElementById(
    "mapSection"
  );



// =====================================================
// PULSANTE ESPLORA LA MAPPA
// =====================================================

if (
  mapButton &&
  mapSection
) {

  mapButton.addEventListener(

    "click",

    function() {

      mapSection.scrollIntoView({

        behavior:
          "smooth",

        block:
          "start"

      });

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


let userMarker =
  null;



if (
  locationButton
) {

  locationButton.addEventListener(

    "click",

    function() {


      // -----------------------------------------------
      // CONTROLLO SUPPORTO GPS
      // -----------------------------------------------

      if (
        !navigator.geolocation
      ) {

        alert(
          "La geolocalizzazione non è disponibile."
        );

        return;

      }


      // -----------------------------------------------
      // STATO PULSANTE
      // -----------------------------------------------

      locationButton.textContent =
        "📍 RICERCA POSIZIONE...";


      // -----------------------------------------------
      // RICHIESTA POSIZIONE
      // -----------------------------------------------

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


          // ---------------------------------------------
          // RIMUOVI VECCHIO MARKER
          // ---------------------------------------------

          if (
            userMarker
          ) {

            map.removeLayer(
              userMarker
            );

          }


          // ---------------------------------------------
          // CREA MARKER UTENTE
          // ---------------------------------------------

          userMarker =
            L.circleMarker(

              [
                lat,
                lng
              ],

              {

                radius:
                  9,

                color:
                  "#ffffff",

                weight:
                  4,

                fillColor:
                  "#075c3b",

                fillOpacity:
                  1

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


          // ---------------------------------------------
          // ZOOM
          // ---------------------------------------------

          map.flyTo(

            [
              lat,
              lng
            ],

            13,

            {

              duration:
                1.5

            }

          );


          // ---------------------------------------------
          // SCROLL ALLA MAPPA
          // ---------------------------------------------

          if (
            mapSection
          ) {

            mapSection.scrollIntoView({

              behavior:
                "smooth",

              block:
                "start"

            });

          }


          // ---------------------------------------------
          // PULSANTE
          // ---------------------------------------------

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

          enableHighAccuracy:
            true,

          timeout:
            10000,

          maximumAge:
            30000

        }

      );

    }

  );

}



// =====================================================
// MENU
// =====================================================

const menuButton =
  document.getElementById(
    "menuButton"
  );


const mobileMenu =
  document.getElementById(
    "mobileMenu"
  );


const menuClose =
  document.getElementById(
    "menuClose"
  );


const menuLinks =
  document.querySelectorAll(
    ".menu-link"
  );



// =====================================================
// APERTURA MENU
// =====================================================

function openMenu() {

  if (
    !mobileMenu
  ) {

    console.error(
      "Menu non trovato."
    );

    return;

  }


  mobileMenu.classList.add(
    "active"
  );


  mobileMenu.setAttribute(
    "aria-hidden",
    "false"
  );


  if (
    menuButton
  ) {

    menuButton.setAttribute(
      "aria-expanded",
      "true"
    );

  }


  document.body.style.overflow =
    "hidden";

}



// =====================================================
// CHIUSURA MENU
// =====================================================

function closeMenu() {

  if (
    !mobileMenu
  ) {

    return;

  }


  mobileMenu.classList.remove(
    "active"
  );


  mobileMenu.setAttribute(
    "aria-hidden",
    "true"
  );


  if (
    menuButton
  ) {

    menuButton.setAttribute(
      "aria-expanded",
      "false"
    );

  }


  document.body.style.overflow =
    "";

}



// =====================================================
// TASTO ☰
// =====================================================

if (
  menuButton
) {

  menuButton.addEventListener(

    "click",

    function() {

      openMenu();

    }

  );

}



// =====================================================
// TASTO X
// =====================================================

if (
  menuClose
) {

  menuClose.addEventListener(

    "click",

    function() {

      closeMenu();

    }

  );

}



// =====================================================
// LINK MENU
// =====================================================

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



// =====================================================
// ESC PER CHIUDERE
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
// FINE SCRIPT
// =====================================================