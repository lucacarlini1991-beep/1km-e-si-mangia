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
);// =====================================================
// 1 KM E SI MANGIA
// INTEGRAZIONE RISTORANTI
// =====================================================

let ristorantiItaliani = [];


// =====================================================
// CONFIGURAZIONE
// =====================================================

const RISTORANTI_CONFIG = {

  distanzaMassima: 2100,

  risultatiIniziali: 5

};


// =====================================================
// CARICA RISTORANTI.JSON
// =====================================================

fetch("./ristoranti.json")

  .then(function(response) {

    if (!response.ok) {

      throw new Error(
        "Impossibile caricare ristoranti.json"
      );

    }

    return response.json();

  })

  .then(function(database) {

    if (!Array.isArray(database)) {

      throw new Error(
        "ristoranti.json non contiene un array valido"
      );

    }

    ristorantiItaliani = database;

    console.log(
      "RISTORANTI CARICATI:",
      ristorantiItaliani.length
    );

  })

  .catch(function(error) {

    console.error(
      "Errore ristoranti.json:",
      error
    );

  });


// =====================================================
// FORMATTA DISTANZA
// =====================================================

function formattaDistanzaRistorante(
  metri
) {

  if (
    typeof metri !== "number"
  ) {

    return "n/d";

  }

  if (metri < 1000) {

    return (
      Math.round(metri) +
      " m"
    );

  }

  return (
    (metri / 1000)
      .toFixed(1)
      .replace(".", ",") +
    " km"
  );

}


// =====================================================
// DEDUPLICA RISTORANTI
// =====================================================

function deduplicaRistoranti(
  lista
) {

  const risultati = [];

  lista.forEach(function(ristorante) {

    const nome =
      String(
        ristorante.nome || ""
      )
      .trim()
      .toLowerCase();

    const duplicato =
      risultati.some(function(esistente) {

        const nomeEsistente =
          String(
            esistente.nome || ""
          )
          .trim()
          .toLowerCase();

        if (
          !nome ||
          !nomeEsistente ||
          nome !== nomeEsistente
        ) {

          return false;

        }

        if (
          typeof ristorante.lat !== "number" ||
          typeof ristorante.lon !== "number" ||
          typeof esistente.lat !== "number" ||
          typeof esistente.lon !== "number"
        ) {

          return false;

        }

        const distanza =
          distanzaTraCoordinate(
            ristorante.lat,
            ristorante.lon,
            esistente.lat,
            esistente.lon
          );

        return distanza <= 30;

      });

    if (!duplicato) {

      risultati.push(
        ristorante
      );

    }

  });

  return risultati;

}


// =====================================================
// DISTANZA TRA COORDINATE
// =====================================================

function distanzaTraCoordinate(

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

    Math.sin(dLat / 2) ** 2

    +

    Math.cos(lat1 * rad) *

    Math.cos(lat2 * rad) *

    Math.sin(dLon / 2) ** 2;

  return (

    2 *

    R *

    Math.atan2(

      Math.sqrt(a),

      Math.sqrt(1 - a)

    )

  );

}


// =====================================================
// STATO PARCHEGGIO
// =====================================================

function descrizioneParcheggio(
  ristorante
) {

  const parcheggio =
    ristorante.parcheggio;

  if (!parcheggio) {

    return "🅿️ Parcheggio: da verificare";

  }

  if (
    parcheggio.presente !== true
  ) {

    return "🅿️ Parcheggio: non verificato";

  }

  if (
    String(
      parcheggio.accesso || ""
    ).toLowerCase() === "private"
  ) {

    return (
      "⚠️ Parcheggio privato · " +
      formattaDistanzaRistorante(
        parcheggio.distanza_m
      )
    );

  }

  if (
    typeof parcheggio.distanza_m === "number"
  ) {

    return (
      "🅿️ Parcheggio · " +
      formattaDistanzaRistorante(
        parcheggio.distanza_m
      )
    );

  }

  return "🅿️ Parcheggio presente";

}


// =====================================================
// STATO MEZZO
// =====================================================

function descrizioneMezzo(
  ristorante
) {

  const mezzo =
    ristorante.mezzi_voluminosi;

  if (!mezzo) {

    return "🚐 Mezzo: da verificare";

  }

  if (
    mezzo.stato === "compatibile"
  ) {

    return "🟢 Mezzo: compatibile";

  }

  if (
    mezzo.stato === "non_compatibile"
  ) {

    return "🔴 Mezzo: non compatibile";

  }

  return "🟡 Mezzo: da verificare";

}


// =====================================================
// TROVA RISTORANTI DELL'USCITA
// =====================================================

function trovaRistorantiUscita(
  uscita
) {

  if (!uscita) {

    return [];

  }

  const trovati =
    ristorantiItaliani.filter(
      function(ristorante) {

        return (

          ristorante.uscita &&

          ristorante.uscita.id ===
          uscita.id &&

          typeof ristorante.uscita.distanza_m ===
          "number" &&

          ristorante.uscita.distanza_m <=
          RISTORANTI_CONFIG.distanzaMassima

        );

      }
    );

  return deduplicaRistoranti(
    trovati
  ).sort(
    function(a, b) {

      return (
        a.uscita.distanza_m -
        b.uscita.distanza_m
      );

    }
  );

}


// =====================================================
// CREA HTML RISTORANTE
// =====================================================

function creaRistoranteHTML(
  ristorante
) {

  const nome =
    ristorante.nome ||
    "Ristorante";

  const distanza =
    formattaDistanzaRistorante(
      ristorante.uscita.distanza_m
    );

  return `

    <div
      style="
        border:1px solid #ddd;
        border-radius:10px;
        padding:10px;
        margin-top:8px;
        background:white;
      "
    >

      <strong>
        ${nome}
      </strong>

      <div style="margin-top:5px;">
        📍 ${distanza} dall'uscita
      </div>

      <div style="margin-top:4px;">
        ${descrizioneParcheggio(
          ristorante
        )}
      </div>

      <div style="margin-top:4px;">
        ${descrizioneMezzo(
          ristorante
        )}
      </div>

      <button
        type="button"
        data-naviga-ristorante="
          ${ristorante.id}
        "
        style="
          width:100%;
          margin-top:8px;
          padding:8px;
          border:0;
          border-radius:8px;
          cursor:pointer;
        "
      >
        🧭 NAVIGA
      </button>

    </div>

  `;

}


// =====================================================
// MOSTRA RISTORANTI
// =====================================================

function mostraRistorantiUscita(
  uscita,
  mostraTutti
) {

  const ristoranti =
    trovaRistorantiUscita(
      uscita
    );

  const visibili =
    mostraTutti
      ? ristoranti
      : ristoranti.slice(
          0,
          RISTORANTI_CONFIG.risultatiIniziali
        );


  let html = `

    <div
      style="
        min-width:260px;
        max-width:340px;
      "
    >

      <strong>
        🍝 RISTORANTI
      </strong>

      <div
        style="
          margin-top:4px;
          font-size:12px;
        "
      >
        ${uscita.nome || "Uscita"}
      </div>

  `;


  if (
    ristoranti.length === 0
  ) {

    html += `

      <div
        style="
          margin-top:12px;
        "
      >
        Nessun ristorante trovato
        entro 2,1 km.
      </div>

    `;

  }

  else {

    visibili.forEach(
      function(ristorante) {

        html +=
          creaRistoranteHTML(
            ristorante
          );

      }
    );


    if (
      ristoranti.length > 5
    ) {

      html += `

        <button
          type="button"
          data-toggle-ristoranti="
            ${uscita.id}
          "
          style="
            width:100%;
            margin-top:10px;
            padding:9px;
            border:0;
            border-radius:8px;
            cursor:pointer;
          "
        >

          ${
            mostraTutti
              ? "MOSTRA SOLO I 5 PRINCIPALI"
              : "MOSTRA TUTTI (" +
                ristoranti.length +
                ")"
          }

        </button>

      `;

    }

  }


  html += `

    </div>

  `;


  return html;

}


// =====================================================
// AGGIUNGE IL PULSANTE AL POPUP DELL'USCITA
// =====================================================

if (
  typeof map !== "undefined"
) {

  map.on(
    "popupopen",
    function(event) {

      const popup =
        event.popup;

      const source =
        popup._source;

      if (!source) {

        return;

      }

      const latlng =
        popup.getLatLng();

      if (!latlng) {

        return;

      }

      const uscita =
        usciteItaliane.find(
          function(item) {

            return (

              typeof item.lat === "number" &&

              typeof item.lon === "number" &&

              distanzaTraCoordinate(
                item.lat,
                item.lon,
                latlng.lat,
                latlng.lng
              ) < 50

            );

          }
        );


      if (!uscita) {

        return;

      }


      // Evita di aggiungere due volte
      // il pulsante.

      const elemento =
        popup.getElement();

      if (!elemento) {

        return;

      }


      if (
        elemento.querySelector(
          "[data-mostra-ristoranti]"
        )
      ) {

        return;

      }


      const contenitore =
        elemento.querySelector(
          ".leaflet-popup-content"
        );

      if (!contenitore) {

        return;

      }


      const pulsante =
        document.createElement(
          "button"
        );


      pulsante.type =
        "button";


      pulsante.textContent =
        "🍝 MOSTRA RISTORANTI";


      pulsante.setAttribute(
        "data-mostra-ristoranti",
        uscita.id
      );


      pulsante.style.width =
        "100%";

      pulsante.style.marginTop =
        "10px";

      pulsante.style.padding =
        "9px";

      pulsante.style.border =
        "0";

      pulsante.style.borderRadius =
        "8px";

      pulsante.style.cursor =
        "pointer";


      contenitore.appendChild(
        pulsante
      );


      pulsante.addEventListener(
        "click",
        function() {

          popup.setContent(
            mostraRistorantiUscita(
              uscita,
              false
            )
          );

        }
      );

    }
  );

}


// =====================================================
// MOSTRA TUTTI / NAVIGAZIONE
// =====================================================

document.addEventListener(
  "click",
  function(event) {

    const toggle =
      event.target.closest(
        "[data-toggle-ristoranti]"
      );


    if (toggle) {

      const uscitaId =
        toggle.getAttribute(
          "data-toggle-ristoranti"
        );


      const uscita =
        usciteItaliane.find(
          function(item) {

            return (
              item.id ===
              uscitaId
            );

          }
        );


      if (!uscita) {

        return;

      }


      const ristoranti =
        trovaRistorantiUscita(
          uscita
        );


      const tuttiVisibili =
        toggle.textContent
          .includes(
            "SOLO I 5"
          );


      const popup =
        toggle.closest(
          ".leaflet-popup"
        );


      if (!popup) {

        return;

      }


      // Recuperiamo il popup Leaflet
      // dalla mappa.

      const popupElement =
        map._popup;


      if (!popupElement) {

        return;

      }


      popupElement.setContent(
        mostraRistorantiUscita(
          uscita,
          !tuttiVisibili
        )
      );


      return;

    }


    const naviga =
      event.target.closest(
        "[data-naviga-ristorante]"
      );


    if (naviga) {

      const id =
        naviga.getAttribute(
          "data-naviga-ristorante"
        );


      const ristorante =
        ristorantiItaliani.find(
          function(item) {

            return (
              item.id === id
            );

          }
        );


      if (!ristorante) {

        return;

      }


      console.log(
        "RISTORANTE SELEZIONATO:",
        ristorante
      );


      alert(

        "Hai selezionato:\n\n" +

        ristorante.nome +

        "\n\nLa navigazione uscita → ristorante verrà collegata nel prossimo passaggio."

      );

    }

  }
);


// =====================================================
// FINE INTEGRAZIONE RISTORANTI
// =====================================================

console.log(
  "1 KM E SI MANGIA - modulo ristoranti pronto"
);// =====================================================
// CORREZIONE POPUP RISTORANTI
// - niente spostamento della mappa
// - lista scrollabile
// - mantiene il popup attuale
// =====================================================

let popupRistorantiAttivo = null;


// Memorizza sempre il popup realmente aperto
if (typeof map !== "undefined") {

  map.on("popupopen", function (event) {

    popupRistorantiAttivo = event.popup;

  });

  map.on("popupclose", function (event) {

    if (
      popupRistorantiAttivo === event.popup
    ) {

      popupRistorantiAttivo = null;

    }

  });

}


// =====================================================
// FORMATTA IL POPUP RISTORANTI
// =====================================================

function aggiornaPopupRistorantiCorretto(
  uscita,
  mostraTutti
) {

  if (
    !popupRistorantiAttivo ||
    !uscita
  ) {

    return;

  }

  const popup =
    popupRistorantiAttivo;


  // Fondamentale:
  // impedisce a Leaflet di spostare
  // automaticamente la mappa.

  popup.options.autoPan = false;


  popup.setContent(
    mostraRistorantiUscita(
      uscita,
      mostraTutti
    )
  );


  popup.update();


  // Rende il contenuto compatto
  // e scrollabile.

  setTimeout(function () {

    const elemento =
      popup.getElement();

    if (!elemento) {

      return;

    }


    const contenitore =
      elemento.querySelector(
        ".leaflet-popup-content"
      );

    if (contenitore) {

      contenitore.style.maxHeight =
        "55vh";

      contenitore.style.overflowY =
        "auto";

      contenitore.style.overflowX =
        "hidden";

      contenitore.style.paddingRight =
        "4px";

    }


    const lista =
      elemento.querySelector(
        ".restaurants-popup"
      );

    if (lista) {

      lista.style.maxHeight =
        "52vh";

      lista.style.overflowY =
        "auto";

      lista.style.overflowX =
        "hidden";

    }

  }, 0);

}


// =====================================================
// INTERCETTA I CLICK PRIMA DEL VECCHIO CODICE
// =====================================================

document.addEventListener(
  "click",
  function (event) {


    // -----------------------------------------------
    // MOSTRA RISTORANTI
    // -----------------------------------------------

    const mostra =
      event.target.closest(
        "[data-mostra-ristoranti]"
      );


    if (mostra) {

      event.preventDefault();

      event.stopImmediatePropagation();


      const uscitaId =
        mostra.getAttribute(
          "data-mostra-ristoranti"
        );


      const uscita =
        usciteItaliane.find(
          function (item) {

            return (
              item.id ===
              uscitaId
            );

          }
        );


      if (!uscita) {

        return;

      }


      aggiornaPopupRistorantiCorretto(
        uscita,
        false
      );


      return;

    }


    // -----------------------------------------------
    // MOSTRA TUTTI
    // -----------------------------------------------

    const toggle =
      event.target.closest(
        "[data-toggle-ristoranti]"
      );


    if (toggle) {

      event.preventDefault();

      event.stopImmediatePropagation();


      const uscitaId =
        toggle.getAttribute(
          "data-toggle-ristoranti"
        );


      const uscita =
        usciteItaliane.find(
          function (item) {

            return (
              item.id ===
              uscitaId
            );

          }
        );


      if (!uscita) {

        return;

      }


      const mostraSolo5 =
        toggle.textContent
          .includes(
            "SOLO I 5"
          );


      aggiornaPopupRistorantiCorretto(
        uscita,
        mostraSolo5
      );


      return;

    }


    // -----------------------------------------------
    // NAVIGA
    // -----------------------------------------------

    const naviga =
      event.target.closest(
        "[data-naviga-ristorante]"
      );


    if (naviga) {

      event.preventDefault();

      event.stopImmediatePropagation();


      const id =
        naviga.getAttribute(
          "data-naviga-ristorante"
        );


      const ristorante =
        ristorantiItaliani.find(
          function (item) {

            return (
              item.id === id
            );

          }
        );


      if (!ristorante) {

        return;

      }


      console.log(
        "RISTORANTE SELEZIONATO:",
        ristorante
      );


      alert(
        "Hai selezionato:\n\n" +
        ristorante.nome +
        "\n\nLa navigazione verrà collegata nel prossimo passaggio."
      );


      return;

    }


  },
  true
);