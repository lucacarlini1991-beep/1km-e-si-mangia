/* =========================================================
   1 KM E SI MANGIA - GPS HOME
   Un solo gestore GPS per la Home.
   ========================================================= */

   (function () {
    "use strict";
  
    function initHomeGPS() {
      const button = document.getElementById("homeLocationButton");
  
      if (!button) {
        console.warn("HOME GPS: pulsante non trovato.");
        return;
      }
  
      const TESTO = "📍 USA LA MIA POSIZIONE";
  
      function resetButton() {
        button.disabled = false;
        button.textContent = TESTO;
      }
  
      function salvaEApri(position) {
        const data = {
          lat: Number(position.coords.latitude),
          lng: Number(position.coords.longitude),
          accuracy: Number(position.coords.accuracy),
          timestamp: Date.now()
        };
  
        console.log("📍 HOME GPS POSIZIONE:", data);
  
        try {
          sessionStorage.setItem(
            "1km-posizione",
            JSON.stringify(data)
          );
        } catch (e) {
          console.warn("GPS: impossibile salvare posizione", e);
        }
  
        window.location.href = "uscite.html?posizione=1";
      }
  
      function errore(error) {
        console.error("HOME GPS:", error);
  
        resetButton();
  
        if (error && error.code === 1) {
          alert(
            "Permesso di posizione negato. " +
            "Su iPhone consenti la posizione per questo sito e riprova."
          );
        } else if (error && error.code === 2) {
          alert(
            "Posizione non disponibile. " +
            "Controlla la Localizzazione dell'iPhone e riprova."
          );
        } else if (error && error.code === 3) {
          alert(
            "La ricerca della posizione sta impiegando troppo tempo. " +
            "Riprova."
          );
        } else {
          alert(
            "Non siamo riusciti a ottenere la tua posizione. Riprova."
          );
        }
      }
  
      function trovaPosizione() {
        if (button.disabled) return;
  
        if (!window.isSecureContext) {
          alert(
            "La geolocalizzazione richiede HTTPS. " +
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
  
        button.disabled = true;
        button.textContent = "📍 RICERCA POSIZIONE...";
  
        console.log("📍 HOME: richiesta GPS avviata");
  
        navigator.geolocation.getCurrentPosition(
          salvaEApri,
          errore,
          {
            enableHighAccuracy: true,
            timeout: 45000,
            maximumAge: 0
          }
        );
      }
  
      button.addEventListener("click", trovaPosizione);
  
      console.log("HOME GPS ATTIVO");
    }
  
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initHomeGPS);
    } else {
      initHomeGPS();
    }
  })();