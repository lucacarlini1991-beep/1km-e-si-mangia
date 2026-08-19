/* 1 KM E SI MANGIA - collegamento GPS
   Gestisce il pulsante della pagina USCITE e il passaggio GPS dalla Home.
*/
(function () {
  "use strict";

  function init() {
    const button = document.getElementById("locationButton");
    const map = window.appMap;

    if (window.GPSManager && map) window.GPSManager.attachMap(map);

    function setButton(text, disabled) {
      if (!button) return;
      button.textContent = text;
      button.disabled = !!disabled;
    }

    function startGPS(fromHome) {
      if (!window.GPSManager) {
        if (button) setButton("GPS NON DISPONIBILE", true);
        console.error("GPSManager non disponibile");
        return;
      }

      setButton("📍 RICERCA POSIZIONE...", true);
      window.GPSManager.configure({
        watch: true,
        centerMap: true,
        zoom: 15,
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 2000,
        onPosition: function (position) {
          setButton("📍 POSIZIONE TROVATA", false);
          console.log("GPS posizione:", position);
        },
        onError: function (error) {
          setButton("📍 USA LA MIA POSIZIONE", false);
          let message = "Non siamo riusciti a ottenere la tua posizione.";
          if (error && error.code === 1) message = "Permesso di posizione negato. Consenti la posizione al browser e riprova.";
          else if (error && error.code === 2) message = "Posizione non disponibile. Controlla GPS e riprova.";
          else if (error && error.code === 3) message = "La ricerca della posizione ha impiegato troppo tempo. Riprova.";
          else if (error && error.code === "INSECURE_CONTEXT") message = "La geolocalizzazione richiede HTTPS. Usa Vercel.";
          alert(message);
        }
      });
      window.GPSManager.start();
    }

    if (button) {
      button.addEventListener("click", function () {
        startGPS(false);
      });
    }

    // Se arriviamo dalla Home dopo aver premuto USA LA MIA POSIZIONE,
    // la posizione viene richiesta una sola volta in Home e poi il GPS
    // continua ad aggiornarsi qui senza chiedere un secondo consenso.
    const params = new URLSearchParams(window.location.search);
    if (params.get("posizione") === "1" || params.get("gps") === "1") {
      setTimeout(function () {
        startGPS(true);
      }, 150);
    }

    console.log("COLLEGA-GPS.JS ATTIVO");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
