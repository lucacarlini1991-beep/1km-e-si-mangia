/* =========================================================
   1 KM E SI MANGIA
   gps.js
   Gestione centralizzata della geolocalizzazione

   Questo file NON gestisce:
   - ristoranti
   - uscite
   - navigazione
   - Google Maps / Apple Mappe / Waze

   Gestisce solo:
   - posizione GPS
   - GPS in movimento
   - controllo qualità delle coordinate
   - salvataggio posizione
   - pin "TU SEI QUI" quando viene fornita una mappa Leaflet
   ========================================================= */

(function () {
  "use strict";

  const STORAGE_KEY = "1km-posizione";

  let watchId = null;
  let lastPosition = null;
  let lastAcceptedPosition = null;

  let map = null;
  let userMarker = null;
  let userAccuracyCircle = null;

  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 45000,
    maximumAge: 10000,

    // Non accettiamo fix con precisione dichiarata peggiore di questo valore.
    // Un fix molto impreciso può essere la causa di posizioni completamente errate.
    maxAccuracy: 1000,

    // Se abbiamo già una posizione valida, non accettiamo un salto
    // incompatibile con il movimento reale di un veicolo.
    maxSpeedKmh: 180,

    // Distanza minima prima di aggiornare graficamente il pin.
    minMoveMeters: 5,

    // Se true, la prima posizione valida centra la mappa.
    centerMap: true,

    // Zoom automatico sul punto GPS.
    zoom: 15
  };

  let options = Object.assign({}, defaultOptions);

  /* =========================================================
     UTILITÀ
     ========================================================= */

  function isFiniteNumber(value) {
    return Number.isFinite(Number(value));
  }

  function normalizePosition(position) {
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

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return null;
    }

    if (accuracy <= 0 || accuracy > options.maxAccuracy) {
      return null;
    }

    return {
      lat: lat,
      lng: lng,
      accuracy: accuracy,
      timestamp: Date.now()
    };
  }

  function distanceMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function isPlausibleMovement(position) {
    if (!lastAcceptedPosition) return true;

    const distance = distanceMeters(
      lastAcceptedPosition.lat,
      lastAcceptedPosition.lng,
      position.lat,
      position.lng
    );

    const elapsedSeconds =
      Math.max(
        1,
        (position.timestamp - lastAcceptedPosition.timestamp) / 1000
      );

    const speedKmh = (distance / 1000) / (elapsedSeconds / 3600);

    if (speedKmh > options.maxSpeedKmh) {
      console.warn(
        "GPS: fix scartato per salto anomalo:",
        Math.round(distance),
        "m in",
        Math.round(elapsedSeconds),
        "s =",
        Math.round(speedKmh),
        "km/h"
      );
      return false;
    }

    return true;
  }

  function savePosition(position) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    } catch (error) {
      console.warn("GPS: impossibile salvare la posizione.", error);
    }
  }

  function readStoredPosition() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const position = JSON.parse(raw);

      if (
        !position ||
        !isFiniteNumber(position.lat) ||
        !isFiniteNumber(position.lng)
      ) {
        return null;
      }

      return position;
    } catch (error) {
      return null;
    }
  }

  /* =========================================================
     PIN "TU SEI QUI"
     ========================================================= */

  function createUserIcon() {
    if (!window.L) return null;

    // Usa il vero asset del progetto, non un pin disegnato in CSS/SVG.
    return L.icon({
      iconUrl: "assets/pin-posizione.png",
      iconRetinaUrl: "assets/pin-posizione.png",
      iconSize: [48, 48],
      iconAnchor: [24, 48],
      popupAnchor: [0, -44],
      className: "gps-user-location-icon"
    });
  }

  function updateMap(position, centerMap) {
    if (!map || !window.L) return;

    const latLng = [position.lat, position.lng];

    if (userMarker) {
      userMarker.setLatLng(latLng);
    } else {
      userMarker = L.marker(latLng, {
        icon: createUserIcon(),
        zIndexOffset: 10000,
        interactive: true
      }).addTo(map);
    }

    if (userAccuracyCircle) {
      userAccuracyCircle.setLatLng(latLng);
      userAccuracyCircle.setRadius(position.accuracy);
    } else {
      userAccuracyCircle = L.circle(latLng, {
        radius: position.accuracy,
        color: "#075c3b",
        weight: 2,
        fillColor: "#075c3b",
        fillOpacity: 0.10,
        interactive: false
      }).addTo(map);
    }

    userMarker.bindPopup(
      "<strong>📍 TU SEI QUI</strong><br>" +
      "Precisione GPS circa " +
      Math.round(position.accuracy) +
      " m"
    );

    if (centerMap) {
      map.setView(
        latLng,
        Math.max(14, Math.min(17, Number(options.zoom) || 15)),
        { animate: true }
      );
    }
  }

  function removeMapPosition() {
    if (!map) return;

    if (userMarker) {
      map.removeLayer(userMarker);
      userMarker = null;
    }

    if (userAccuracyCircle) {
      map.removeLayer(userAccuracyCircle);
      userAccuracyCircle = null;
    }
  }

  /* =========================================================
     POSIZIONE RICEVUTA
     ========================================================= */

  function handlePosition(position) {
    const normalized = normalizePosition(position);

    if (!normalized) {
      console.warn(
        "GPS: posizione rifiutata per coordinate/precisione non valide."
      );
      return false;
    }

    if (!isPlausibleMovement(normalized)) {
      return false;
    }

    const previous = lastAcceptedPosition;

    lastPosition = normalized;
    lastAcceptedPosition = normalized;

    savePosition(normalized);

    const movedEnough =
      !previous ||
      distanceMeters(
        previous.lat,
        previous.lng,
        normalized.lat,
        normalized.lng
      ) >= options.minMoveMeters;

    if (movedEnough) {
      updateMap(normalized, options.centerMap && !previous);
    }

    if (typeof options.onPosition === "function") {
      options.onPosition(normalized);
    }

    return true;
  }

  function handleError(error) {
    console.error(
      "GPS:",
      error && error.code,
      error && error.message
    );

    if (typeof options.onError === "function") {
      options.onError(error);
    }
  }

  /* =========================================================
     API PUBBLICA
     ========================================================= */

  function configure(newOptions) {
    options = Object.assign(
      {},
      defaultOptions,
      newOptions || {}
    );

    return api;
  }

  function attachMap(leafletMap) {
    map = leafletMap || null;
    return api;
  }

  function getLastPosition() {
    return lastPosition || readStoredPosition();
  }

  function start(newOptions) {
    configure(newOptions);

    if (!window.isSecureContext) {
      const error = new Error(
        "La geolocalizzazione richiede HTTPS."
      );
      error.code = "INSECURE_CONTEXT";
      handleError(error);
      return false;
    }

    if (!navigator.geolocation) {
      const error = new Error(
        "La geolocalizzazione non è disponibile su questo dispositivo."
      );
      error.code = "NOT_SUPPORTED";
      handleError(error);
      return false;
    }

    stop();

    navigator.geolocation.getCurrentPosition(
      function (position) {
        handlePosition(position);

        if (options.watch) {
          startWatch();
        }
      },
      function (error) {
        handleError(error);

        // Se la prima lettura fallisce, non avviamo il tracking
        // alla cieca: aspettiamo che il chiamante riprovi.
      },
      {
        enableHighAccuracy: options.enableHighAccuracy,
        timeout: options.timeout,
        maximumAge: options.maximumAge
      }
    );

    return true;
  }

  function startWatch() {
    if (!navigator.geolocation) return false;

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }

    watchId = navigator.geolocation.watchPosition(
      function (position) {
        handlePosition(position);
      },
      function (error) {
        handleError(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 2000
      }
    );

    return true;
  }

  function stop() {
    if (
      watchId !== null &&
      navigator.geolocation
    ) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }

    return api;
  }

  function clearSavedPosition() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("GPS: impossibile cancellare la posizione.", error);
    }

    lastPosition = null;
    lastAcceptedPosition = null;

    return api;
  }

  function isRunning() {
    return watchId !== null;
  }

  const api = {
    configure: configure,
    attachMap: attachMap,
    start: start,
    startWatch: startWatch,
    stop: stop,
    getLastPosition: getLastPosition,
    clearSavedPosition: clearSavedPosition,
    isRunning: isRunning,
    updateMap: updateMap,
    removeMapPosition: removeMapPosition,
    distanceMeters: distanceMeters
  };

  window.GPSManager = api;

  console.log("GPS Manager caricato.");
})();
