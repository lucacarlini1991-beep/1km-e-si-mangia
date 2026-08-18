/* =========================================================
   1 KM E SI MANGIA - collega-gps.js
   Collega il pulsante della pagina USCITE al GPSManager.
   Il GPS non parte automaticamente: parte solo quando l'utente
   preme "USA LA MIA POSIZIONE".
   ========================================================= */
(function () {
  "use strict";

  function initGPSButton() {
    const button = document.getElementById("locationButton");
    const map = window.appMap;

    if (!button) {
      console.warn("GPS: pulsante locationButton non trovato.");
      return;
    }

    if (!window.GPSManager) {
      console.error("GPS: GPSManager non disponibile.");
      button.disabled = true;
      button.textContent = "GPS NON DISPONIBILE";
      return;
    }

    if (map) {
      window.GPSManager.attachMap(map);
    }

    let searching = false;

    function setButton(text, disabled) {
      button.textContent = text;
      button.disabled = !!disabled;
    }

    window.GPSManager.configure({
      watch: true,
      centerMap: true,
      zoom: 15,
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 5000,
      onPosition: function (position) {
        searching = false;
        setButton("📍 POSIZIONE TROVATA", false);
        console.log("GPS posizione:", position);
      },
      onError: function (error) {
        searching = false;
        setButton("📍 USA LA MIA POSIZIONE", false);

        let message = "Non siamo riusciti a ottenere la tua posizione.";
        if (error && error.code === 1) {
          message = "Permesso di posizione negato. Consenti la posizione al browser e riprova.";
        } else if (error && error.code === 2) {
          message = "Posizione non disponibile. Controlla GPS e connessione e riprova.";
        } else if (error && error.code === 3) {
          message = "La ricerca della posizione ha impiegato troppo tempo. Riprova tra qualche secondo.";
        } else if (error && error.code === "INSECURE_CONTEXT") {
          message = "La geolocalizzazione richiede HTTPS. Usa la versione Vercel.";
        }

        alert(message);
      }
    });

    button.addEventListener("click", function () {
      if (searching) return;

      searching = true;
      setButton("📍 RICERCA POSIZIONE...", true);

      const started = window.GPSManager.start({ watch: true });
      if (!started) {
        searching = false;
        setButton("📍 USA LA MIA POSIZIONE", false);
      }
    });

    console.log("COLLEGA-GPS.JS ATTIVO: pulsante GPS collegato.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGPSButton);
  } else {
    initGPSButton();
  }
})();
