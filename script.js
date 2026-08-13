// =====================================================
// 1 KM E SI MANGIA
// DATABASE USCITE AUTOSTRADALI
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
// CARICA IL NOSTRO DATABASE
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


    // ---------------------------------------------
    // CREA I MARKER
    // ---------------------------------------------

    usciteItaliane.forEach(function(uscita) {

      if (
        typeof uscita.lat !== "number" ||
        typeof uscita.lon !== "number"
      ) {

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


      // -------------------------------------------
      // INFORMAZIONI USCITA
      // -------------------------------------------

      let popup = `

        <div class="exit-popup">

          <strong>
            ${uscita.nome}
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


      marker.bindPopup(popup);


      // -------------------------------------------
      // CLICK
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

  mapButton.addEventListener(

    "click",

    function() {

      mapSection.scrollIntoView({

        behavior: "smooth"

      });

    }

  );

}


// =====================================================
// GEOLOCALIZZAZIONE
// =====================================================

const locationButton =
  document.getElementById("locationButton");

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
          // ZOOM SULLA POSIZIONE
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


          mapSection.scrollIntoView({

            behavior: "smooth"

          });


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