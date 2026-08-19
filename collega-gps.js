/* =========================================================
   1 KM E SI MANGIA - collega-gps.js
   GPS della pagina USCITE.
   Il pulsante deve essere realmente cliccabile e deve:
   - chiedere il permesso al browser
   - ottenere la posizione
   - mostrare il pin TU SEI QUI usando assets/pin-posizione.png
   - centrare la mappa
   - continuare ad aggiornare la posizione mentre ci si muove
   ========================================================= */
(function () {
  "use strict";

  function initGPSButton() {
    const button = document.getElementById("locationButton");
    if (!button) {
      console.warn("GPS: locationButton non trovato.");
      return;
    }

    let searching = false;

    function setButton(text, disabled) {
      button.disabled = !!disabled;
      button.textContent = text;
    }

    function showPosition(position) {
      if (!window.GPSManager) return;

      const accepted = window.GPSManager.updateMap(
        {
          lat: Number(position.coords.latitude),
          lng: Number(position.coords.longitude),
          accuracy: Number(position.coords.accuracy),
          timestamp: Date.now()
        },
        true
      );

      try {
        sessionStorage.setItem("1km-posizione", JSON.stringify({
          lat: Number(position.coords.latitude),
          lng: Number(position.coords.longitude),
          accuracy: Number(position.coords.accuracy),
          timestamp: Date.now()
        }));
      } catch (e) {}

      setButton("📍 POSIZIONE TROVATA", false);
      searching = false;
      return accepted;
    }

    function errorMessage(error) {
      if (error && error.code === 1) {
        return "Permesso di posizione negato. Su iPhone consenti la posizione al browser per questo sito e riprova.";
      }
      if (error && error.code === 2) {
        return "Posizione non disponibile. Controlla GPS/localizzazione e riprova.";
      }
      if (error && error.code === 3) {
        return "La ricerca della posizione ha impiegato troppo tempo. Riprova tra qualche secondo.";
      }
      if (error && error.code === "INSECURE_CONTEXT") {
        return "La geolocalizzazione richiede HTTPS. Usa il sito Vercel.";
      }
      return "Non siamo riusciti a ottenere la tua posizione. Riprova.";
    }

    function startGPS() {
      if (searching) return;

      if (!window.isSecureContext) {
        alert(errorMessage({ code: "INSECURE_CONTEXT" }));
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

      // Il modulo principale crea la mappa prima di questo file.
      if (window.appMap) {
        window.GPSManager.attachMap(window.appMap);
      }

      searching = true;
      setButton("📍 RICERCA POSIZIONE...", true);

      // Prima lettura esplicita: così il click produce immediatamente un fix
      // e il browser mostra la richiesta di autorizzazione quando necessaria.
      navigator.geolocation.getCurrentPosition(
        function (position) {
          showPosition(position);

          // Poi manteniamo la posizione aggiornata in movimento.
          window.GPSManager.startWatch();
        },
        function (error) {
          searching = false;
          setButton("📍 USA LA MIA POSIZIONE", false);
          console.error("GPS errore:", error);
          alert(errorMessage(error));
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0
        }
      );
    }

    button.addEventListener("click", startGPS);

    // Se la Home ha già ottenuto la posizione, visualizzala subito.
    try {
      const raw = sessionStorage.getItem("1km-posizione");
      if (raw && window.GPSManager && window.appMap) {
        const saved = JSON.parse(raw);
        if (saved && Number.isFinite(Number(saved.lat)) && Number.isFinite(Number(saved.lng))) {
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

    console.log("COLLEGA-GPS.JS ATTIVO: pulsante GPS collegato correttamente.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGPSButton);
  } else {
    initGPSButton();
  }
})();
