/* 1 KM E SI MANGIA - collega-gps.js
   GPS USCITE - versione semplificata
*/
(function () {
  "use strict";

  function initGPS() {
    const button = document.getElementById("locationButton");
    if (!button) return;

    let searching = false;

    function setButton(text, disabled) {
      button.disabled = !!disabled;
      button.textContent = text;
    }

    function gpsError(error) {
      console.error("GPS errore:", error);
      searching = false;
      setButton("📍 USA LA MIA POSIZIONE", false);

      if (error && error.code === 1) {
        alert("Permesso di posizione negato. Consenti la localizzazione per questo sito su iPhone e riprova.");
      } else if (error && error.code === 2) {
        alert("Posizione non disponibile. Controlla la Localizzazione dell'iPhone e riprova.");
      } else if (error && error.code === 3) {
        alert("Il GPS sta impiegando troppo tempo. Riprova.");
      } else {
        alert("Non siamo riusciti a ottenere la tua posizione. Riprova.");
      }
    }

    function savePosition(position) {
      const data = {
        lat: Number(position.coords.latitude),
        lng: Number(position.coords.longitude),
        accuracy: Number(position.coords.accuracy) || 30,
        timestamp: Date.now()
      };

      console.log("GPS posizione ricevuta:", data);

      try {
        sessionStorage.setItem("1km-posizione", JSON.stringify(data));
      } catch (e) {
        console.warn("Impossibile salvare la posizione:", e);
      }

      if (!window.GPSManager) {
        gpsError({ code: 0 });
        return;
      }

      if (window.appMap && typeof window.GPSManager.attachMap === "function") {
        window.GPSManager.attachMap(window.appMap);
      }

      window.GPSManager.updateMap(data, true);

      searching = false;
      setButton("📍 POSIZIONE TROVATA", false);

      if (typeof window.GPSManager.startWatch === "function") {
        window.GPSManager.startWatch();
      }
    }

    function avviaGPS() {
      if (searching) return;

      if (!window.isSecureContext) {
        alert("La geolocalizzazione richiede HTTPS. Usa il link Vercel.");
        return;
      }

      if (!navigator.geolocation) {
        alert("La geolocalizzazione non è disponibile su questo dispositivo.");
        return;
      }

      if (!window.GPSManager) {
        alert("Modulo GPS non disponibile. Ricarica la pagina e riprova.");
        return;
      }

      if (window.appMap && typeof window.GPSManager.attachMap === "function") {
        window.GPSManager.attachMap(window.appMap);
      }

      searching = true;
      setButton("📍 RICERCA POSIZIONE...", true);

      navigator.geolocation.getCurrentPosition(
        savePosition,
        gpsError,
        {
          enableHighAccuracy: true,
          timeout: 45000,
          maximumAge: 0
        }
      );
    }

    window.avviaGPS = avviaGPS;
    button.addEventListener("click", avviaGPS);

    try {
      const raw = sessionStorage.getItem("1km-posizione");
      if (raw && window.GPSManager) {
        const saved = JSON.parse(raw);
        if (
          saved &&
          Number.isFinite(Number(saved.lat)) &&
          Number.isFinite(Number(saved.lng))
        ) {
          if (window.appMap && typeof window.GPSManager.attachMap === "function") {
            window.GPSManager.attachMap(window.appMap);
          }

          window.GPSManager.updateMap({
            lat: Number(saved.lat),
            lng: Number(saved.lng),
            accuracy: Number(saved.accuracy) || 30,
            timestamp: Number(saved.timestamp) || Date.now()
          }, true);

          setButton("📍 POSIZIONE TROVATA", false);
        }
      }
    } catch (e) {
      console.warn("GPS: posizione salvata non leggibile.", e);
    }

    console.log("COLLEGA-GPS.JS ATTIVO - avviaGPS disponibile.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGPS);
  } else {
    initGPS();
  }
})();
