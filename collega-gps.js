/* =========================================================
   1 KM E SI MANGIA
   collega-gps.js

   UNICO COMPITO:
   collegare il pulsante USCITE al GPSManager.
   ========================================================= */

   (function () {
    "use strict";
  
    function initGPSButton() {
  
      const button =
        document.getElementById("locationButton");
  
      if (!button) {
        console.error(
          "GPS: locationButton non trovato."
        );
        return;
      }
  
      /*
       * La mappa viene esposta da script.js come window.appMap.
       */
      if (
        window.GPSManager &&
        window.appMap &&
        typeof window.GPSManager.attachMap === "function"
      ) {
        window.GPSManager.attachMap(
          window.appMap
        );
  
        console.log(
          "✅ GPS: mappa collegata."
        );
      } else {
        console.warn(
          "GPS: mappa o GPSManager non ancora disponibili."
        );
      }
  
      /*
       * Evitiamo qualunque onclick HTML.
       */
      button.removeAttribute("onclick");
  
      button.style.pointerEvents = "auto";
      button.style.touchAction = "manipulation";
      button.style.cursor = "pointer";
  
      let working = false;
  
      function resetButton() {
  
        working = false;
  
        button.disabled = false;
  
        button.textContent =
          "📍 USA LA MIA POSIZIONE";
      }
  
      function startGPS() {
  
        if (working) return;
  
        console.log(
          "📍 USCITE: CLICK GPS RICEVUTO"
        );
  
        if (!window.isSecureContext) {
  
          alert(
            "La geolocalizzazione richiede HTTPS.\n\n" +
            "Apri il sito pubblicato su Vercel."
          );
  
          return;
        }
  
        if (!navigator.geolocation) {
  
          alert(
            "La geolocalizzazione non è disponibile su questo dispositivo."
          );
  
          return;
        }
  
        if (
          !window.GPSManager ||
          typeof window.GPSManager.start !== "function"
        ) {
  
          alert(
            "Modulo GPS non disponibile.\n\n" +
            "Ricarica la pagina e riprova."
          );
  
          return;
        }
  
        /*
         * IMPORTANTISSIMO:
         * la richiesta parte direttamente dal TAP.
         */
        working = true;
  
        button.disabled = true;
  
        button.textContent =
          "📍 RICERCA POSIZIONE...";
  
        console.log(
          "📍 USCITE: avvio GPSManager.start()"
        );
  
        window.GPSManager.start({
  
          enableHighAccuracy: true,
  
          timeout: 60000,
  
          maximumAge: 0,
  
          watch: true,
  
          centerMap: true
  
        });
      }
  
      /*
       * Un solo listener.
       */
      button.addEventListener(
        "click",
        function (event) {
  
          event.preventDefault();
          event.stopPropagation();
  
          startGPS();
  
        },
        false
      );
  
      /*
       * Compatibilità con l'HTML precedente.
       */
      window.avviaGPS = startGPS;
  
      console.log(
        "================================="
      );
  
      console.log(
        "✅ USCITE GPS PRONTO"
      );
  
      console.log(
        "📍 Pulsante collegato"
      );
  
      console.log(
        "================================="
      );
    }
  
    if (
      document.readyState === "loading"
    ) {
  
      document.addEventListener(
        "DOMContentLoaded",
        initGPSButton
      );
  
    } else {
  
      initGPSButton();
  
    }
  
  })();