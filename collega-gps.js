/* =========================================================
   1 KM E SI MANGIA
   collega-gps.js

   GESTIONE UNICA DEL PULSANTE GPS DI USCITE.HTML

   - collega GPSManager alla mappa Leaflet
   - elimina i vecchi listener del pulsante
   - richiede il GPS direttamente dal click
   - mostra TU SEI QUI
   - centra la mappa
   - mantiene il tracking GPS
   ========================================================= */

   (function () {
    "use strict";
  
    function initGPSButton() {
      const oldButton = document.getElementById("locationButton");
  
      if (!oldButton) {
        console.error("GPS: pulsante locationButton non trovato.");
        return;
      }
  
      /*
       * =====================================================
       * 1. COLLEGA GPSManager ALLA MAPPA REALE
       * =====================================================
       *
       * In script.js la mappa è:
       *
       * const map = L.map("map", ...)
       *
       * Essendo questo script caricato DOPO script.js,
       * possiamo recuperare quella variabile globale.
       */
  
      try {
        if (
          window.GPSManager &&
          typeof window.GPSManager.attachMap === "function"
        ) {
          GPSManager.attachMap(map);
          console.log("GPS: mappa Leaflet collegata.");
        } else {
          console.error("GPS: GPSManager non disponibile.");
        }
      } catch (error) {
        console.error("GPS: impossibile collegare la mappa.", error);
      }
  
      /*
       * =====================================================
       * 2. SOSTITUISCI IL PULSANTE
       * =====================================================
       *
       * script.js ha già registrato un click sul vecchio
       * elemento. Facciamo una copia per eliminare TUTTI
       * i vecchi listener.
       */
  
      const button = oldButton.cloneNode(true);
  
      /*
       * Elimina anche l'eventuale onclick scritto nell'HTML.
       */
      button.removeAttribute("onclick");
  
      /*
       * Garantisce che il pulsante riceva il tocco.
       */
      button.style.pointerEvents = "auto";
      button.style.touchAction = "manipulation";
      button.style.position = "relative";
      button.style.zIndex = "1000";
  
      oldButton.replaceWith(button);
  
      let watchId = null;
      let searching = false;
  
      function resetButton() {
        button.disabled = false;
        button.textContent = "📍 USA LA MIA POSIZIONE";
      }
  
      function errorGPS(error) {
        console.error("GPS ERRORE:", error);
  
        searching = false;
        resetButton();
  
        if (!error) {
          alert("Non siamo riusciti a ottenere la tua posizione.");
          return;
        }
  
        if (error.code === 1) {
          alert(
            "Permesso di posizione negato.\n\n" +
            "Su iPhone vai in:\n" +
            "Impostazioni → Privacy e sicurezza → Localizzazione → Safari\n\n" +
            "e attiva la Posizione precisa."
          );
          return;
        }
  
        if (error.code === 2) {
          alert(
            "La posizione GPS non è disponibile.\n\n" +
            "Controlla che la Localizzazione sia attiva e riprova."
          );
          return;
        }
  
        if (error.code === 3) {
          alert(
            "Il GPS sta impiegando troppo tempo.\n\n" +
            "Riprova tra qualche secondo."
          );
          return;
        }
  
        alert(
          "Non siamo riusciti a ottenere la tua posizione.\n\n" +
          "Riprova."
        );
      }
  
      function mostraPosizione(position, centraMappa) {
        const lat = Number(position.coords.latitude);
        const lng = Number(position.coords.longitude);
        const accuracy = Number(position.coords.accuracy);
  
        console.log("=================================");
        console.log("GPS FIX RICEVUTO");
        console.log("LAT:", lat);
        console.log("LNG:", lng);
        console.log("PRECISIONE:", accuracy, "metri");
        console.log("=================================");
  
        /*
         * Coordinate non valide.
         */
        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          !Number.isFinite(accuracy) ||
          lat < -90 ||
          lat > 90 ||
          lng < -180 ||
          lng > 180
        ) {
          errorGPS({
            code: 2,
            message: "Coordinate GPS non valide."
          });
          return;
        }
  
        /*
         * NON accettiamo una posizione tipo Rimini
         * ottenuta con precisione di centinaia di km.
         */
        if (accuracy <= 0 || accuracy > 1000) {
          searching = false;
          resetButton();
  
          alert(
            "La posizione ricevuta non è abbastanza precisa.\n\n" +
            "Precisione attuale: circa " +
            Math.round(accuracy / 1000) +
            " km.\n\n" +
            "Su iPhone attiva la Posizione precisa per Safari e riprova."
          );
  
          return;
        }
  
        const data = {
          lat: lat,
          lng: lng,
          accuracy: accuracy,
          timestamp: Date.now()
        };
  
        /*
         * Salva la posizione.
         */
        try {
          sessionStorage.setItem(
            "1km-posizione",
            JSON.stringify(data)
          );
        } catch (e) {
          console.warn(
            "GPS: impossibile salvare la posizione.",
            e
          );
        }
  
        /*
         * =====================================================
         * MOSTRA "TU SEI QUI"
         * =====================================================
         *
         * GPSManager.updateMap usa il pin già presente
         * in gps.js.
         */
        if (
          window.GPSManager &&
          typeof window.GPSManager.updateMap === "function"
        ) {
          window.GPSManager.updateMap(
            data,
            centraMappa
          );
        } else {
          console.error(
            "GPS: GPSManager.updateMap non disponibile."
          );
          return;
        }
  
        searching = false;
  
        button.disabled = false;
        button.textContent = "📍 POSIZIONE TROVATA";
      }
  
      function avviaTracking() {
        if (!navigator.geolocation) {
          return;
        }
  
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }
  
        console.log("GPS: tracking continuo attivato.");
  
        watchId = navigator.geolocation.watchPosition(
          function (position) {
            mostraPosizione(position, false);
          },
          function (error) {
            console.warn(
              "GPS tracking error:",
              error
            );
          },
          {
            enableHighAccuracy: true,
            timeout: 60000,
            maximumAge: 0
          }
        );
      }
  
      function avviaGPS() {
        if (searching) {
          return;
        }
  
        console.log("=================================");
        console.log("📍 CLICK GPS RICEVUTO");
        console.log("=================================");
  
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
  
        searching = true;
  
        button.disabled = true;
        button.textContent = "📍 RICERCA GPS...";
  
        /*
         * Ferma un eventuale tracking precedente.
         */
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }
  
        /*
         * =====================================================
         * RICHIESTA GPS DIRETTA DAL CLICK DELL'UTENTE
         * =====================================================
         */
        navigator.geolocation.getCurrentPosition(
          function (position) {
            mostraPosizione(position, true);
  
            /*
             * Solo dopo il primo fix valido
             * avviamo il tracking.
             */
            if (!searching) {
              avviaTracking();
            }
          },
          function (error) {
            errorGPS(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 60000,
            maximumAge: 0
          }
        );
      }
  
      /*
       * UNICO listener del pulsante.
       */
      button.addEventListener(
        "click",
        function (event) {
          event.preventDefault();
          event.stopPropagation();
  
          avviaGPS();
        },
        {
          passive: false
        }
      );
  
      /*
       * Compatibilità con eventuali altri moduli.
       */
      window.avviaGPS = avviaGPS;
  
      console.log(
        "================================="
      );
      console.log(
        "✅ COLLEGA-GPS.JS CORRETTO"
      );
      console.log(
        "✅ MAPPA LEAFLET COLLEGATA A GPSManager"
      );
      console.log(
        "✅ VECCHI LISTENER ELIMINATI"
      );
      console.log(
        "================================="
      );
    }
  
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        initGPSButton
      );
    } else {
      initGPSButton();
    }
  })();