/* =========================================================
   1 KM E SI MANGIA
   gps.js
   GESTIONE UNICA DEL GPS
   ========================================================= */

   (function () {
    "use strict";
  
    const STORAGE_KEY = "1km-posizione";
  
    let map = null;
    let userMarker = null;
    let userAccuracyCircle = null;
    let watchId = null;
    let lastPosition = null;
  
    const options = {
      enableHighAccuracy: true,
      timeout: 60000,
      maximumAge: 0,
      maxAccuracy: 1000,
      zoom: 15
    };
  
    /* =====================================================
       UTILITÀ
       ===================================================== */
  
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
  
    function save(position) {
      try {
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(position)
        );
      } catch (e) {
        console.warn("GPS: impossibile salvare posizione.");
      }
    }
  
    /* =====================================================
       MAPPA
       ===================================================== */
  
    function attachMap(leafletMap) {
      map = leafletMap || null;
      return api;
    }
  
    function getMap() {
      if (map) return map;
  
      if (
        window.appMap &&
        typeof window.appMap.setView === "function"
      ) {
        map = window.appMap;
        return map;
      }
  
      return null;
    }
  
    function createIcon() {
      if (!window.L) return null;
  
      return L.icon({
        iconUrl: "assets/pin-posizione.png",
        iconRetinaUrl: "assets/pin-posizione.png",
        iconSize: [48, 48],
        iconAnchor: [24, 48],
        popupAnchor: [0, -44],
        className: "gps-user-location-icon"
      });
    }
  
    function updateMap(position, center) {
      const leafletMap = getMap();
  
      if (!leafletMap || !window.L) {
        console.error("GPS: mappa Leaflet non disponibile.");
        return false;
      }
  
      const latLng = [
        position.lat,
        position.lng
      ];
  
      if (!userMarker) {
  
        userMarker = L.marker(latLng, {
          icon: createIcon(),
          zIndexOffset: 10000
        }).addTo(leafletMap);
  
      } else {
  
        userMarker.setLatLng(latLng);
  
      }
  
      if (!userAccuracyCircle) {
  
        userAccuracyCircle = L.circle(
          latLng,
          {
            radius: position.accuracy,
            color: "#075c3b",
            weight: 2,
            fillColor: "#075c3b",
            fillOpacity: 0.10,
            interactive: false
          }
        ).addTo(leafletMap);
  
      } else {
  
        userAccuracyCircle.setLatLng(latLng);
        userAccuracyCircle.setRadius(position.accuracy);
  
      }
  
      userMarker.bindPopup(
        "<strong>📍 TU SEI QUI</strong><br>" +
        "Precisione GPS circa " +
        Math.round(position.accuracy) +
        " m"
      );
  
      if (center) {
  
        leafletMap.setView(
          latLng,
          options.zoom,
          {
            animate: true
          }
        );
  
      }
  
      return true;
    }
  
    /* =====================================================
       POSIZIONE
       ===================================================== */
  
    function handlePosition(position) {
  
      const data = normalize(position);
  
      if (!data) {
  
        console.warn(
          "GPS: posizione ricevuta ma non sufficientemente precisa."
        );
  
        return false;
      }
  
      console.log(
        "📍 GPS:",
        data.lat,
        data.lng,
        "precisione:",
        Math.round(data.accuracy) + " m"
      );
  
      lastPosition = data;
  
      save(data);
  
      updateMap(
        data,
        true
      );
  
      const button =
        document.getElementById(
          "locationButton"
        );
  
      if (button) {
  
        button.disabled = false;
  
        button.textContent =
          "📍 POSIZIONE TROVATA";
  
      }
  
      return true;
    }
  
    function gpsError(error) {
  
      console.error(
        "GPS ERRORE:",
        error && error.code,
        error && error.message
      );
  
      const button =
        document.getElementById(
          "locationButton"
        );
  
      if (button) {
  
        button.disabled = false;
  
        button.textContent =
          "📍 USA LA MIA POSIZIONE";
  
      }
  
      let message =
        "Non siamo riusciti a ottenere la tua posizione.";
  
      if (error && error.code === 1) {
  
        message =
          "Permesso di posizione negato.\n\n" +
          "Su iPhone vai in:\n" +
          "Impostazioni → Privacy e sicurezza → Localizzazione → Safari\n\n" +
          "e attiva la Posizione precisa.";
  
      } else if (error && error.code === 2) {
  
        message =
          "La posizione non è disponibile.\n\n" +
          "Controlla la Localizzazione dell'iPhone e riprova.";
  
      } else if (error && error.code === 3) {
  
        message =
          "Il GPS sta impiegando troppo tempo.\n\n" +
          "Riprova tra qualche secondo.";
  
      }
  
      alert(message);
    }
  
    /* =====================================================
       GPS
       ===================================================== */
  
    function start(newOptions) {
  
      if (newOptions) {
        Object.assign(
          options,
          newOptions
        );
      }
  
      if (!window.isSecureContext) {
  
        const error = new Error(
          "La geolocalizzazione richiede HTTPS."
        );
  
        error.code =
          "INSECURE_CONTEXT";
  
        gpsError(error);
  
        return false;
      }
  
      if (!navigator.geolocation) {
  
        const error = new Error(
          "Geolocalizzazione non disponibile."
        );
  
        error.code =
          "NOT_SUPPORTED";
  
        gpsError(error);
  
        return false;
      }
  
      /*
       * Recuperiamo la mappa creata da script.js.
       */
      getMap();
  
      /*
       * Fermiamo un eventuale watch precedente.
       */
      stop();
  
      const button =
        document.getElementById(
          "locationButton"
        );
  
      if (button) {
  
        button.disabled = true;
  
        button.textContent =
          "📍 RICERCA POSIZIONE...";
  
      }
  
      console.log(
        "📍 RICHIESTA GPS AVVIATA"
      );
  
      navigator.geolocation.getCurrentPosition(
  
        function (position) {
  
          const accepted =
            handlePosition(position);
  
          if (accepted) {
            startWatch();
          } else {
            gpsError({
              code: 2,
              message:
                "Posizione non sufficientemente precisa."
            });
          }
  
        },
  
        function (error) {
  
          gpsError(error);
  
        },
  
        {
          enableHighAccuracy: true,
          timeout: 60000,
          maximumAge: 0
        }
      );
  
      return true;
    }
  
    function startWatch() {
  
      if (!navigator.geolocation) {
        return false;
      }
  
      if (watchId !== null) {
  
        navigator.geolocation.clearWatch(
          watchId
        );
  
      }
  
      console.log(
        "📍 TRACKING GPS ATTIVO"
      );
  
      watchId =
        navigator.geolocation.watchPosition(
  
          function (position) {
  
            const data =
              normalize(position);
  
            if (!data) return;
  
            lastPosition =
              data;
  
            save(data);
  
            /*
             * Durante il movimento aggiorniamo
             * il pin senza spostare continuamente
             * la mappa.
             */
            updateMap(
              data,
              false
            );
  
          },
  
          function (error) {
  
            console.warn(
              "GPS tracking:",
              error
            );
  
          },
  
          {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 0
          }
        );
  
      return true;
    }
  
    function stop() {
  
      if (watchId !== null) {
  
        navigator.geolocation.clearWatch(
          watchId
        );
  
        watchId = null;
  
      }
  
      return api;
    }
  
    function getLastPosition() {
  
      if (lastPosition) {
        return lastPosition;
      }
  
      try {
  
        const raw =
          sessionStorage.getItem(
            STORAGE_KEY
          );
  
        if (!raw) return null;
  
        return JSON.parse(raw);
  
      } catch (e) {
  
        return null;
  
      }
    }
  
    function clearSavedPosition() {
  
      try {
  
        sessionStorage.removeItem(
          STORAGE_KEY
        );
  
      } catch (e) {}
  
      lastPosition = null;
  
      return api;
    }
  
    /* =====================================================
       API
       ===================================================== */
  
    const api = {
  
      attachMap: attachMap,
      start: start,
      startWatch: startWatch,
      stop: stop,
      updateMap: updateMap,
      getLastPosition: getLastPosition,
      clearSavedPosition: clearSavedPosition
  
    };
  
    window.GPSManager = api;
  
    /* =====================================================
       PULSANTE GPS
       ===================================================== */
  
    function collegaPulsante() {
  
      const button =
        document.getElementById(
          "locationButton"
        );
  
      if (!button) {
        return;
      }
  
      /*
       * Questo listener è in CAPTURE.
       *
       * In questo modo intercettiamo il tap prima
       * dei listener GPS presenti negli altri file.
       */
      button.addEventListener(
        "click",
        function (event) {
  
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
  
          console.log(
            "📍 CLICK GPS"
          );
  
          start({
            enableHighAccuracy: true,
            timeout: 60000,
            maximumAge: 0
          });
  
        },
        true
      );
  
      console.log(
        "✅ PULSANTE GPS COLLEGATO DA gps.js"
      );
    }
  
    /*
     * Aspettiamo che il DOM sia pronto.
     */
    if (
      document.readyState ===
      "loading"
    ) {
  
      document.addEventListener(
        "DOMContentLoaded",
        collegaPulsante
      );
  
    } else {
  
      collegaPulsante();
  
    }
  
    console.log(
      "✅ GPS MANAGER CARICATO"
    );
  
  })();