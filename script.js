// =====================================================
// 1 KM E SI MANGIA
// SCRIPT PRINCIPALE
// =====================================================


// =====================================================
// CONFIGURAZIONE
// =====================================================

const CONFIG = {

  // Distanza massima ristorante
  distanzaMassimaRistoranteKm: 2,

  // Tolleranza
  tolleranzaDistanzaMetri: 100,

  // Distanza effettiva = 2 km + 100 m
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
// FUNZIONE:
// CONTROLLA AREA DI SERVIZIO / AUTOGRILL
// =====================================================

function eAreaDiServizio(uscita) {

  if (!uscita) {

    return true;

  }


  // ---------------------------------------------
  // TESTO COMPLESSIVO
  // ---------------------------------------------

  const testo = normalizzaTesto(

    [

      uscita.nome,

      uscita.tipo,

      uscita.nome_autostrada,

      uscita.autostrada,

      uscita.descrizione,

      uscita.categoria,

      uscita.name,

      uscita.amenity,

      uscita.shop,

      uscita.operator

    ]

      .filter(Boolean)

      .join(" ")

  );


  // ---------------------------------------------
  // PAROLE CHE IDENTIFICANO
  // AREE DI SERVIZIO
  // ---------------------------------------------

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

    "truck stop",

    "parcheggio autostradale",

    "sosta autostradale"

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


  // ---------------------------------------------
  // CONTROLLO CAMPO TIPO
  // ---------------------------------------------

  const tipo = normalizzaTesto(

    uscita.tipo

  );


  if (

    tipo === "service" ||

    tipo === "service_area" ||

    tipo === "rest_area" ||

    tipo === "rest stop" ||

    tipo === "autogrill" ||

    tipo === "area di servizio" ||

    tipo === "area servizio" ||

    tipo === "area di sosta"

  ) {

    return true;

  }


  return false;

}


// =====================================================
// USCITA VALIDA
// =====================================================

function uscitaValida(uscita) {

  if (!uscita) {

    return false;

  }


  // Coordinate obbligatorie

  if (

    typeof uscita.lat !== "number" ||

    typeof uscita.lon !== "number"

  ) {

    return false;

  }


  // Se esplicitamente nascosta

  if (

    uscita.visualizza_mappa === false

  ) {

    return false;

  }


  // Escludi aree di servizio

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
// FUNZIONE:
// TROVA SEZIONE MAPPA
// =====================================================

function getMapSection() {

  return (

    document.getElementById("mapSection") ||

    document.getElementById("mappa")

  );

}


// =====================================================
// PULSANTE ESPLORA LA MAPPA
// =====================================================

const mapButton =

  document.getElementById(

    "mapButton"

  );


if (mapButton) {

  mapButton.addEventListener(

    "click",

    function() {

      const mapSection =

        getMapSection();


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

          const mapSection =

            getMapSection();


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
// MENU PRINCIPALE
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


    // ---------------------------------------------
    // CONTROLLO ELEMENTI
    // ---------------------------------------------

    if (

      !menuButton ||

      !mobileMenu

    ) {

      console.warn(

        "Menu principale: elementi non trovati"

      );

      return;

    }


    // ---------------------------------------------
    // APRI MENU
    // ---------------------------------------------

    function openMenu() {

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

    }


    // ---------------------------------------------
    // CHIUDI MENU
    // ---------------------------------------------

    function closeMenu() {

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

    }


    // ---------------------------------------------
    // PULSANTE HAMBURGER
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
    // PULSANTE X
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
    // CLICK SULLO SFONDO
    // ---------------------------------------------

    mobileMenu.addEventListener(

      "click",

      function(event) {


        if (

          event.target === mobileMenu

        ) {

          closeMenu();

        }

      }

    );


    // ---------------------------------------------
    // TASTO ESC
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
    // LINK DEL MENU
    // ---------------------------------------------

    const menuLinks =

      mobileMenu.querySelectorAll(

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


    console.log(

      "MENU PRINCIPALE ATTIVO"

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