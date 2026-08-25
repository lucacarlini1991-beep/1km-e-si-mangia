/* 1 KM E SI MANGIA - gps.js - MOTORE GPS UNICO */
(function () {
  "use strict";

  const KEY = "1km-posizione";

  let map = null;
  let marker = null;
  let circle = null;
  let watchId = null;
  let last = null;

  const opt = {
    enableHighAccuracy: true,
    timeout: 60000,
    maximumAge: 0,
    maxAccuracy: 5000,
    zoom: 15
  };

  // --------------------------------------------------
  // NORMALIZZA POSIZIONE
  // --------------------------------------------------

  function normalize(position) {
    if (!position || !position.coords) return null;

    const lat = Number(position.coords.latitude);
    const lng = Number(position.coords.longitude);
    const accuracy = Number(position.coords.accuracy);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !Number.isFinite(accuracy)
    ) {
      return null;
    }

    if (
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return null;
    }

    if (accuracy <= 0 || accuracy > opt.maxAccuracy) {
      return null;
    }

    return {
      lat,
      lng,
      accuracy,
      timestamp: Date.now()
    };
  }

  // --------------------------------------------------
  // SALVA POSIZIONE
  // --------------------------------------------------

  function save(position) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(position));
    } catch (e) {}
  }

  // --------------------------------------------------
  // PULSANTE
  // --------------------------------------------------

  function setLocationButton(text, disabled) {
    const button = document.getElementById("locationButton");

    if (!button) return;

    button.disabled = !!disabled;

    button.innerHTML =
      '<img src="assets/pin-posizione.png" alt="" aria-hidden="true" ' +
      'style="width:28px;height:34px;object-fit:contain;display:inline-block;' +
      'vertical-align:middle;margin-right:8px;">' +
      text;
  }

  // --------------------------------------------------
  // MAPPA
  // --------------------------------------------------

  function attachMap(m) {
    map = m || null;
    return api;
  }

  function getMap() {
    if (map) return map;

    // Cerca i riferimenti più comuni usati dall'app
    if (
      window.appMap &&
      typeof window.appMap.setView === "function"
    ) {
      map = window.appMap;
      return map;
    }

    if (
      window.map &&
      typeof window.map.setView === "function"
    ) {
      map = window.map;
      return map;
    }

    if (
      window.leafletMap &&
      typeof window.leafletMap.setView === "function"
    ) {
      map = window.leafletMap;
      return map;
    }

    return null;
  }

  // --------------------------------------------------
  // ICONA UTENTE
  // --------------------------------------------------

  function icon() {
    if (!window.L) return null;

    return L.divIcon({
      className: "gps-user-location-icon",

      html:
        '<div style="' +
        'width:22px;' +
        'height:22px;' +
        'border-radius:50%;' +
        'background:#075c3b;' +
        'border:4px solid #fff;' +
        'box-shadow:0 2px 8px rgba(0,0,0,.35);' +
        'box-sizing:border-box;' +
        '"></div>',

      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -14]
    });
  }

  // --------------------------------------------------
  // AGGIORNA MAPPA
  // --------------------------------------------------

  function updateMap(position, center) {
    const m = getMap();

    // IMPORTANTISSIMO:
    // Il GPS deve funzionare anche se la mappa
    // non è ancora disponibile.
    if (!m || !window.L) {
      console.warn("GPS: posizione trovata, mappa non ancora disponibile.");
      return false;
    }

    const latLng = [position.lat, position.lng];

    if (!marker) {
      marker = L.marker(latLng, {
        icon: icon(),
        zIndexOffset: 10000
      }).addTo(m);
    } else {
      marker.setLatLng(latLng);
    }

    if (!circle) {
      circle = L.circle(latLng, {
        radius: position.accuracy,
        color: "#075c3b",
        weight: 2,
        fillColor: "#075c3b",
        fillOpacity: 0.10,
        interactive: false
      }).addTo(m);
    } else {
      circle.setLatLng(latLng);
      circle.setRadius(position.accuracy);
    }

    marker.bindPopup(
      "<strong>📍 TU SEI QUI</strong><br>" +
      "Precisione GPS circa " +
      Math.round(position.accuracy) +
      " m"
    );

    if (center) {
      m.setView(
        latLng,
        opt.zoom,
        { animate: true }
      );
    }

    return true;
  }

  // --------------------------------------------------
  // ERRORE GPS
  // --------------------------------------------------

  function error(e) {
    console.error(
      "GPS ERRORE:",
      e && e.code,
      e && e.message
    );

    setLocationButton(
      "USA LA MIA POSIZIONE",
      false
    );

    let msg =
      "Non siamo riusciti a ottenere la tua posizione.";

    if (e && e.code === 1) {
      msg =
        "Permesso di posizione negato.\n\n" +
        "Controlla le autorizzazioni della posizione " +
        "per questo sito nel browser e riprova.";
    }

    else if (e && e.code === 2) {
      msg =
        "La posizione non è disponibile.\n\n" +
        "Controlla che la posizione sia attiva " +
        "e riprova.";
    }

    else if (e && e.code === 3) {
      msg =
        "Il GPS sta impiegando troppo tempo.\n\n" +
        "Riprova tra qualche secondo.";
    }

    else if (e && e.code === "INSECURE_CONTEXT") {
      msg =
        "La posizione GPS richiede una connessione HTTPS.";
    }

    else if (e && e.code === "NOT_SUPPORTED") {
      msg =
        "Il browser non supporta la geolocalizzazione.";
    }

    alert(msg);
  }

  // --------------------------------------------------
  // AVVIO GPS
  // --------------------------------------------------

  function start(newOpt) {
    if (newOpt) {
      Object.assign(opt, newOpt);
    }

    console.log("📍 GPS: avvio richiesta posizione...");

    if (!window.isSecureContext) {
      const e = new Error(
        "La geolocalizzazione richiede HTTPS."
      );

      e.code = "INSECURE_CONTEXT";
      error(e);
      return false;
    }

    if (!navigator.geolocation) {
      const e = new Error(
        "Geolocalizzazione non disponibile."
      );

      e.code = "NOT_SUPPORTED";
      error(e);
      return false;
    }

    stop();

    // Proviamo a collegare la mappa, ma NON è obbligatoria
    getMap();

    setLocationButton(
      "RICERCA POSIZIONE...",
      true
    );

    navigator.geolocation.getCurrentPosition(
      function (position) {

        console.log(
          "📍 GPS: posizione ricevuta",
          position.coords.latitude,
          position.coords.longitude,
          "precisione:",
          position.coords.accuracy
        );

        const data = normalize(position);

        if (!data) {
          error({
            code: 2,
            message: "Coordinate GPS non valide."
          });
          return;
        }

        last = data;
        save(data);

        // La posizione è valida.
        // Aggiorniamo la mappa se disponibile.
        updateMap(data, true);

        setLocationButton(
          "POSIZIONE TROVATA",
          false
        );

        // Avvia il tracking senza bloccare il GPS
        startWatch();

        // Evento utile per il resto dell'app
        try {
          window.dispatchEvent(
            new CustomEvent(
              "gps:position",
              {
                detail: data
              }
            )
          );
        } catch (e) {}

      },

      function (e) {
        error(e);
      },

      {
        enableHighAccuracy: true,
        timeout: 60000,
        maximumAge: 0
      }
    );

    return true;
  }

  // --------------------------------------------------
  // TRACKING
  // --------------------------------------------------

  function startWatch() {
    if (!navigator.geolocation) {
      return false;
    }

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }

    watchId = navigator.geolocation.watchPosition(
      function (position) {

        const data = normalize(position);

        if (!data) return;

        last = data;
        save(data);

        updateMap(data, false);

        try {
          window.dispatchEvent(
            new CustomEvent(
              "gps:position",
              {
                detail: data
              }
            )
          );
        } catch (e) {}
      },

      function (e) {
        console.warn(
          "GPS tracking:",
          e && e.code,
          e && e.message
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 5000
      }
    );

    console.log(
      "📍 GPS: tracking attivo"
    );

    return true;
  }

  // --------------------------------------------------
  // STOP
  // --------------------------------------------------

  function stop() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }

    return api;
  }

  // --------------------------------------------------
  // ULTIMA POSIZIONE
  // --------------------------------------------------

  function getLastPosition() {
    if (last) return last;

    try {
      const saved =
        sessionStorage.getItem(KEY);

      return saved
        ? JSON.parse(saved)
        : null;
    } catch (e) {
      return null;
    }
  }

  // --------------------------------------------------
  // CANCELLA POSIZIONE
  // --------------------------------------------------

  function clearSavedPosition() {
    try {
      sessionStorage.removeItem(KEY);
    } catch (e) {}

    last = null;

    return api;
  }

  // --------------------------------------------------
  // API PUBBLICA
  // --------------------------------------------------

  const api = {
    attachMap,
    start,
    startWatch,
    stop,
    updateMap,
    getLastPosition,
    clearSavedPosition
  };

  window.GPSManager = api;

  console.log(
    "✅ GPS MANAGER CARICATO — motore GPS unico"
  );

})();