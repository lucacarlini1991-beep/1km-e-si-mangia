/* =========================================================
   1 KM E SI MANGIA - collega-gps.js
   GPS DIRETTO - versione definitiva

   IMPORTANTE:
   La prima posizione NON passa da GPSManager.
   Il click chiama direttamente navigator.geolocation.
   ========================================================= */

(function () {
  "use strict";

  let marker = null;
  let circle = null;
  let watchId = null;
  let busy = false;

  const MAX_ACCURACY = 10000; // oltre 10 km = posizione inutilizzabile

  function button() {
    return document.getElementById("locationButton");
  }

  function setButton(text, disabled) {
    const b = button();
    if (!b) return;
    b.textContent = text;
    b.disabled = !!disabled;
  }

  function getMap() {
    if (window.appMap) return window.appMap;
    if (window.map) return window.map;

    // Cerca una mappa Leaflet già presente nelle variabili globali.
    for (const key in window) {
      try {
        const value = window[key];
        if (value && typeof value.setView === "function" &&
            typeof value.addLayer === "function" &&
            value._container) {
          return value;
        }
      } catch (e) {}
    }

    return null;
  }

  function save(position) {
    const data = {
      lat: Number(position.coords.latitude),
      lng: Number(position.coords.longitude),
      accuracy: Number(position.coords.accuracy),
      timestamp: Date.now()
    };

    try {
      sessionStorage.setItem("1km-posizione", JSON.stringify(data));
    } catch (e) {}

    return data;
  }

  function valid(position) {
    const c = position && position.coords;
    if (!c) return false;

    const lat = Number(c.latitude);
    const lng = Number(c.longitude);
    const accuracy = Number(c.accuracy);

    return Number.isFinite(lat) &&
           Number.isFinite(lng) &&
           Number.isFinite(accuracy) &&
           accuracy <= MAX_ACCURACY;
  }

  function show(position) {
    if (!valid(position)) {
      console.warn(
        "GPS: posizione rifiutata, precisione:",
        position && position.coords && position.coords.accuracy
      );
      return false;
    }

    const map = getMap();

    if (!map) {
      console.warn("GPS: Leaflet non ancora disponibile.");
      return false;
    }

    const lat = Number(position.coords.latitude);
    const lng = Number(position.coords.longitude);
    const accuracy = Number(position.coords.accuracy);
    const point = [lat, lng];

    if (marker) {
      try { map.removeLayer(marker); } catch (e) {}
    }

    if (circle) {
      try { map.removeLayer(circle); } catch (e) {}
    }

    let icon;

    try {
      icon = L.icon({
        iconUrl: "assets/pin-posizione.png",
        iconSize: [46, 46],
        iconAnchor: [23, 46],
        popupAnchor: [0, -46]
      });
    } catch (e) {
      icon = null;
    }

    marker = icon
      ? L.marker(point, { icon: icon, zIndexOffset: 10000 })
      : L.marker(point, { zIndexOffset: 10000 });

    marker.addTo(map);

    marker.bindPopup(
      "<strong>📍 TU SEI QUI</strong><br>" +
      "Precisione: circa " + Math.round(accuracy) + " m"
    );

    circle = L.circle(point, {
      radius: accuracy,
      weight: 1,
      fillOpacity: 0.08
    }).addTo(map);

    map.setView(point, 14, { animate: true });

    try {
      marker.openPopup();
    } catch (e) {}

    save(position);

    console.log(
      "✅ TU SEI QUI",
      lat,
      lng,
      "precisione:",
      accuracy
    );

    return true;
  }

  function errorText(error) {
    if (!error) return "Errore GPS.";

    if (error.code === 1) {
      return "Posizione negata. Su iPhone consenti la posizione a Safari per questo sito e riprova.";
    }

    if (error.code === 2) {
      return "Posizione non disponibile. Controlla la Localizzazione dell'iPhone e riprova.";
    }

    if (error.code === 3) {
      return "Il GPS sta impiegando troppo tempo. Riprova tra qualche secondo.";
    }

    return "Non siamo riusciti a ottenere la tua posizione. Riprova.";
  }

  function startWatch() {
    if (!navigator.geolocation) return;

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }

    watchId = navigator.geolocation.watchPosition(
      function (position) {
        console.log(
          "📡 GPS UPDATE:",
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy
        );

        if (valid(position)) {
          show(position);
          setButton("📍 POSIZIONE TROVATA", false);
        }
      },
      function (error) {
        console.warn("GPS watch:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 60000,
        maximumAge: 0
      }
    );
  }

  function startGPS() {
    console.log("🟢 CLICK GPS RICEVUTO");

    if (busy) return;

    if (!navigator.geolocation) {
      alert("La geolocalizzazione non è disponibile su questo dispositivo.");
      return;
    }

    if (!window.isSecureContext) {
      alert("La posizione richiede HTTPS. Apri il sito Vercel.");
      return;
    }

    busy = true;
    setButton("📍 RICERCA GPS...", true);

    navigator.geolocation.getCurrentPosition(
      function (position) {
        console.log(
          "📍 RISPOSTA GPS:",
          position.coords.latitude,
          position.coords.longitude,
          "precisione:",
          position.coords.accuracy
        );

        if (show(position)) {
          busy = false;
          setButton("📍 POSIZIONE TROVATA", false);
          startWatch();
          return;
        }

        // Non accettiamo posizioni tipo Rimini con precisione di centinaia di km.
        setButton("📍 CERCO GPS PRECISO...", true);

        startWatch();

        // Se entro 90 secondi non arriva un fix valido,
        // lasciamo comunque il pulsante riprovabile.
        setTimeout(function () {
          if (busy) {
            busy = false;
            setButton("📍 USA LA MIA POSIZIONE", false);
            alert(
              "Il telefono non ha fornito una posizione GPS abbastanza precisa. " +
              "Controlla la Localizzazione precisa per Safari e riprova."
            );
          }
        }, 90000);
      },

      function (error) {
        console.error("❌ GPS ERROR:", error);

        busy = false;
        setButton("📍 USA LA MIA POSIZIONE", false);

        alert(errorText(error));
      },

      {
        enableHighAccuracy: true,
        timeout: 60000,
        maximumAge: 0
      }
    );
  }

  function init() {
    const b = button();

    if (!b) {
      console.error("❌ GPS: locationButton non trovato.");
      return;
    }

    window.avviaGPS = startGPS;

    // Evita doppi listener.
    if (b.dataset.gpsDirect === "1") return;
    b.dataset.gpsDirect = "1";

    b.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      startGPS();
    }, false);

    console.log("✅ GPS DIRETTO CARICATO");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
