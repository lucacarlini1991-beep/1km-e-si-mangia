/* 1 KM E SI MANGIA - gps-camion.js
 * GPS DEDICATO ALLA PAGINA PARCHEGGI MEZZI PESANTI
 * Non modifica e non condivide lo stato con gps.js / GPSManager.
 */
(function () {
  "use strict";

  const STORAGE_KEY = "1km-posizione-camion";
  const BUTTON_ID = "mpLocate";

  let map = null;
  let marker = null;
  let accuracyCircle = null;
  let watchId = null;
  let lastPosition = null;
  let options = {
    enableHighAccuracy: true,
    timeout: 60000,
    maximumAge: 0,
    maxAccuracy: 1000,
    zoom: 15
  };

  function normalize(position) {
    if (!position || !position.coords) return null;

    const lat = Number(position.coords.latitude);
    const lng = Number(position.coords.longitude);
    const accuracy = Number(position.coords.accuracy);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !Number.isFinite(accuracy) ||
      lat < -90 || lat > 90 ||
      lng < -180 || lng > 180 ||
      accuracy <= 0 ||
      accuracy > options.maxAccuracy
    ) {
      return null;
    }

    return {
      lat,
      lng,
      accuracy,
      timestamp: Date.now()
    };
  }

  function save(position) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    } catch (_) {}
  }

  function getMap() {
    if (map) return map;
    if (window.appMap && typeof window.appMap.setView === "function") {
      map = window.appMap;
    }
    return map;
  }

  function attachMap(leafletMap) {
    map = leafletMap || null;
    return api;
  }

  function icon() {
    if (!window.L) return null;

    return L.divIcon({
      className: "gps-camion-user-location-icon",
      html: '<div style="width:24px;height:24px;border-radius:50%;background:#f6a916;border:4px solid #fff;box-shadow:0 2px 9px rgba(0,0,0,.35);box-sizing:border-box;"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -14]
    });
  }

  function updateMap(position, center) {
    const leafletMap = getMap();
    if (!leafletMap || !window.L) return false;

    const latLng = [position.lat, position.lng];

    if (!marker) {
      marker = L.marker(latLng, {
        icon: icon(),
        zIndexOffset: 10000,
        interactive: true
      }).addTo(leafletMap);
    } else {
      marker.setLatLng(latLng);
    }

    if (!accuracyCircle) {
      accuracyCircle = L.circle(latLng, {
        radius: position.accuracy,
        color: "#f6a916",
        weight: 2,
        fillColor: "#f6a916",
        fillOpacity: 0.10,
        interactive: false
      }).addTo(leafletMap);
    } else {
      accuracyCircle.setLatLng(latLng);
      accuracyCircle.setRadius(position.accuracy);
    }

    marker.bindPopup(
      "<strong>📍 POSIZIONE CAMION</strong><br>" +
      "Precisione GPS circa " + Math.round(position.accuracy) + " m"
    );

    if (center) {
      leafletMap.setView(
        latLng,
        Number(options.zoom) || 15,
        { animate: true }
      );
    }

    return true;
  }

  function removeMapPosition() {
    const leafletMap = getMap();
    if (!leafletMap) return;

    if (marker) {
      leafletMap.removeLayer(marker);
      marker = null;
    }
    if (accuracyCircle) {
      leafletMap.removeLayer(accuracyCircle);
      accuracyCircle = null;
    }
  }

  function resetButton() {
    const button = document.getElementById(BUTTON_ID);
    if (!button) return;
    button.disabled = false;
    button.textContent = "📍 USA LA MIA POSIZIONE";
  }

  function setSearchingButton() {
    const button = document.getElementById(BUTTON_ID);
    if (!button) return;
    button.disabled = true;
    button.textContent = "📍 RICERCA POSIZIONE...";
  }

  function buildError(error) {
    const e = error instanceof Error ? error : new Error("GPS non disponibile");
    e.code = error && typeof error.code === "number" ? error.code : e.code;
    return e;
  }

  function stop() {
    if (watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    return api;
  }

  function handleError(error, callbacks) {
    const e = buildError(error);
    console.warn("GPS camion:", e.code, e.message);
    resetButton();

    if (callbacks && typeof callbacks.onError === "function") {
      callbacks.onError(e);
      return;
    }

    let message = "Non siamo riusciti a ottenere la posizione del camion.";
    if (e.code === 1) {
      message = "Permesso di posizione negato.\n\nControlla le autorizzazioni di localizzazione del browser e attiva la posizione precisa.";
    } else if (e.code === 2) {
      message = "La posizione non è disponibile.\n\nControlla la Localizzazione del dispositivo e riprova.";
    } else if (e.code === 3) {
      message = "Il GPS sta impiegando troppo tempo.\n\nRiprova tra qualche secondo.";
    }
    alert(message);
  }

  function startWatch(callbacks) {
    if (!navigator.geolocation) return false;

    stop();
    watchId = navigator.geolocation.watchPosition(
      function (position) {
        const normalized = normalize(position);
        if (!normalized) return;
        lastPosition = normalized;
        save(normalized);
        updateMap(normalized, false);

        if (callbacks && typeof callbacks.onWatchPosition === "function") {
          callbacks.onWatchPosition(normalized);
        }
      },
      function (error) {
        if (callbacks && typeof callbacks.onWatchError === "function") {
          callbacks.onWatchError(buildError(error));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0
      }
    );

    return true;
  }

  function start(newOptions) {
    const callbacks = newOptions || {};
    options = Object.assign({}, options, callbacks);

    if (!window.isSecureContext) {
      const e = new Error("La geolocalizzazione richiede HTTPS.");
      e.code = "INSECURE_CONTEXT";
      handleError(e, callbacks);
      return false;
    }

    if (!navigator.geolocation) {
      const e = new Error("Geolocalizzazione non disponibile.");
      e.code = "NOT_SUPPORTED";
      handleError(e, callbacks);
      return false;
    }

    getMap();
    stop();
    setSearchingButton();

    navigator.geolocation.getCurrentPosition(
      function (position) {
        const normalized = normalize(position);
        if (!normalized) {
          handleError({ code: 2, message: "Coordinate GPS non valide" }, callbacks);
          return;
        }

        lastPosition = normalized;
        save(normalized);
        updateMap(normalized, false);
        resetButton();

        if (callbacks && typeof callbacks.onPosition === "function") {
          callbacks.onPosition(normalized);
        }

        if (callbacks.watch !== false) {
          startWatch(callbacks);
        }
      },
      function (error) {
        handleError(error, callbacks);
      },
      {
        enableHighAccuracy: true,
        timeout: Number(options.timeout) || 60000,
        maximumAge: Number(options.maximumAge) || 0
      }
    );

    return true;
  }

  function getLastPosition() {
    if (lastPosition) return lastPosition;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function clearSavedPosition() {
    stop();
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
    lastPosition = null;
    removeMapPosition();
    return api;
  }

  function isRunning() {
    return watchId !== null;
  }

  const api = {
    attachMap,
    start,
    startWatch,
    stop,
    updateMap,
    removeMapPosition,
    getLastPosition,
    clearSavedPosition,
    isRunning
  };

  window.GPSCamionManager = api;
  console.log("✅ GPS CAMION CARICATO — stato separato da GPSManager");
})();
