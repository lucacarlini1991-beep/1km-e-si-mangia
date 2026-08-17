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

// =====================================================
// GEOLOCALIZZAZIONE
// =====================================================

const locationButton =
  document.getElementById("locationButton");

let userMarker = null;


if (locationButton) {

  locationButton.addEventListener(
    "click",
    function(event) {

      event.preventDefault();

      console.log("GPS: pulsante premuto");


      if (!navigator.geolocation) {

        alert(
          "La geolocalizzazione non è disponibile su questo dispositivo."
        );

        return;

      }


      locationButton.disabled = true;

      locationButton.textContent =
        "📍 RICERCA POSIZIONE...";


      navigator.geolocation.getCurrentPosition(

        function(position) {

          const lat =
            position.coords.latitude;

          const lng =
            position.coords.longitude;


          console.log(
            "GPS TROVATO:",
            lat,
            lng,
            "precisione:",
            position.coords.accuracy,
            "metri"
          );


          // =========================================
          // SALVA LA POSIZIONE
          // =========================================

          try {

            sessionStorage.setItem(
              "userLatitude",
              String(lat)
            );

            sessionStorage.setItem(
              "userLongitude",
              String(lng)
            );

          } catch (e) {

            console.warn(
              "GPS: impossibile salvare sessionStorage",
              e
            );

          }


          // =========================================
          // RIMUOVI EVENTUALE VECCHIO MARKER
          // =========================================

          if (userMarker) {

            try {

              map.removeLayer(
                userMarker
              );

            } catch (e) {

              console.warn(
                "GPS: errore rimozione vecchio marker",
                e
              );

            }

          }


          // =========================================
          // SCORRI ALLA MAPPA PRIMA DELLO ZOOM
          // =========================================

          if (mapSection) {

            mapSection.scrollIntoView({
              behavior: "smooth",
              block: "center"
            });

          }


          // =========================================
          // AGGIORNA DIMENSIONI LEAFLET
          // =========================================

          setTimeout(
            function() {

              try {

                map.invalidateSize(
                  true
                );

              } catch (e) {

                console.warn(
                  "GPS: invalidateSize fallito",
                  e
                );

              }


              // =====================================
              // CREA PIN "SEI QUI"
              // =====================================

              userMarker =
                L.circleMarker(

                  [
                    lat,
                    lng
                  ],

                  {

                    radius: 10,

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
                  "<strong>📍 Sei qui</strong>"
                )
                .openPopup();


              // =====================================
              // CENTRA LA MAPPA SULL'UTENTE
              // =====================================

              map.setView(

                [
                  lat,
                  lng
                ],

                15,

                {
                  animate: true
                }

              );


              // =====================================
              // AGGIORNA PULSANTE
              // =====================================

              locationButton.textContent =
                "📍 POSIZIONE TROVATA";

              locationButton.disabled =
                false;


              console.log(
                "GPS: pin creato e mappa centrata"
              );


            },
            700
          );

        },


        function(error) {

          console.error(
            "GPS ERRORE:",
            error.code,
            error.message
          );


          let messaggio =
            "Non siamo riusciti ad ottenere la tua posizione.";


          if (error.code === 1) {

            messaggio =
              "Permesso posizione negato. " +
              "Consenti l'accesso alla posizione per questo sito.";

          }


          if (error.code === 2) {

            messaggio =
              "Posizione non disponibile. " +
              "Riprova tra qualche secondo.";

          }


          if (error.code === 3) {

            messaggio =
              "La ricerca della posizione ha impiegato troppo tempo. " +
              "Riprova.";

          }


          alert(
            messaggio
          );


          locationButton.textContent =
            "📍 USA LA MIA POSIZIONE";

          locationButton.disabled =
            false;

        },


        {

          enableHighAccuracy: true,

          timeout: 20000,

          maximumAge: 0

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
