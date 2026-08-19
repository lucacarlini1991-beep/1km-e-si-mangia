/* =========================================================
   1 KM E SI MANGIA - collega-gps.js
   GPS PAGINA USCITE

   - Il GPS parte SOLO quando si preme il pulsante
   - Funziona con Safari / iPhone
   - Richiede posizione precisa
   - Rifiuta coordinate palesemente errate
   - Mostra il pin TU SEI QUI
   - Centra la mappa
   - Continua ad aggiornare la posizione mentre ci si muove
   ========================================================= */

   (function () {
    "use strict";
  
    let watchId = null;
    let searching = false;
  
    function initGPSButton() {
  
      const button = document.getElementById("locationButton");
  
      if (!button) {
        console.warn("GPS: locationButton non trovato.");
        return;
      }
  
      const TESTO = "📍 USA LA MIA POSIZIONE";
  
      function setButton(text, disabled) {
        button.disabled = !!disabled;
        button.textContent = text;
      }
  
      function salvaPosizione(position) {
  
        const lat = Number(position.coords.latitude);
        const lng = Number(position.coords.longitude);
        const accuracy = Number(position.coords.accuracy);
  
        console.log("📍 GPS RICEVUTO");
        console.log("Latitudine:", lat);
        console.log("Longitudine:", lng);
        console.log("Precisione:", accuracy, "metri");
  
        /*
         * CONTROLLO FONDAMENTALE
         *
         * Se Safari restituisce una posizione con precisione
         * enorme (es. 273 km), NON la utilizziamo.
         */
        if (!Number.isFinite(lat) ||
            !Number.isFinite(lng) ||
            !Number.isFinite(accuracy)) {
  
          console.warn("GPS: coordinate non valide.");
          setButton(TESTO, false);
          searching = false;
  
          alert("La posizione ricevuta non è valida. Riprova.");
          return;
        }
  
        if (accuracy > 1000) {
  
          console.warn(
            "GPS: posizione troppo imprecisa:",
            accuracy,
            "metri"
          );
  
          setButton(TESTO, false);
          searching = false;
  
          alert(
            "La posizione ricevuta non è abbastanza precisa.\n\n" +
            "Precisione attuale: circa " +
            Math.round(accuracy / 1000) +
            " km.\n\n" +
            "Su iPhone attiva:\n" +
            "Impostazioni → Privacy e sicurezza → Localizzazione → Safari → Posizione precisa.\n\n" +
            "Poi torna sul sito e riprova."
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
         * Salviamo la posizione per eventuali altre pagine.
         */
        try {
          sessionStorage.setItem(
            "1km-posizione",
            JSON.stringify(data)
          );
        } catch (e) {
          console.warn("GPS: impossibile salvare posizione.", e);
        }
  
        /*
         * Aggiorniamo la mappa.
         */
        if (window.GPSManager &&
            typeof window.GPSManager.updateMap === "function") {
  
          window.GPSManager.updateMap(data, true);
  
        } else {
  
          console.warn(
            "GPSManager non disponibile."
          );
        }
  
        setButton("📍 POSIZIONE TROVATA", false);
        searching = false;
  
        console.log(
          "📍 POSIZIONE ACCETTATA:",
          data
        );
      }
  
  
      function erroreGPS(error) {
  
        searching = false;
        setButton(TESTO, false);
  
        console.error(
          "GPS ERROR:",
          error
        );
  
        if (!error) {
          alert(
            "Non siamo riusciti a ottenere la tua posizione."
          );
          return;
        }
  
        if (error.code === 1) {
  
          alert(
            "Hai negato l'accesso alla posizione.\n\n" +
            "Su iPhone vai in:\n" +
            "Impostazioni → Privacy e sicurezza → Localizzazione → Safari\n\n" +
            "e consenti l'accesso alla posizione."
          );
  
        } else if (error.code === 2) {
  
          alert(
            "La posizione non è disponibile.\n\n" +
            "Controlla che la Localizzazione sia attiva sull'iPhone e riprova."
          );
  
        } else if (error.code === 3) {
  
          alert(
            "Il GPS sta impiegando troppo tempo.\n\n" +
            "Assicurati di avere una buona visuale del cielo e riprova."
          );
  
        } else {
  
          alert(
            "Non siamo riusciti a ottenere la tua posizione.\n\n" +
            "Riprova."
          );
        }
      }
  
  
      function avviaGPS() {
  
        /*
         * Evita doppi click.
         */
        if (searching) {
          console.log("GPS: ricerca già in corso.");
          return;
        }
  
        /*
         * Controllo browser.
         */
        if (!navigator.geolocation) {
  
          alert(
            "La geolocalizzazione non è disponibile su questo dispositivo."
          );
  
          return;
        }
  
        /*
         * HTTPS obbligatorio.
         */
        if (!window.isSecureContext) {
  
          alert(
            "La posizione richiede una connessione HTTPS.\n\n" +
            "Apri il sito pubblicato su Vercel."
          );
  
          return;
        }
  
        searching = true;
  
        setButton(
          "📍 RICERCA GPS...",
          true
        );
  
        console.log(
          "📍 AVVIO GPS DA CLICK UTENTE"
        );
  
        /*
         * FERMIAMO EVENTUALE WATCH PRECEDENTE.
         */
        if (watchId !== null) {
  
          navigator.geolocation.clearWatch(
            watchId
          );
  
          watchId = null;
        }
  
  
        /*
         * PRIMA POSIZIONE.
         *
         * maximumAge: 0
         * = non utilizzare una posizione vecchia.
         *
         * enableHighAccuracy: true
         * = chiediamo la massima precisione disponibile.
         */
        navigator.geolocation.getCurrentPosition(
  
          function (position) {
  
            console.log(
              "📍 PRIMO FIX GPS:",
              position.coords
            );
  
            salvaPosizione(position);
  
            /*
             * Se la posizione è stata accettata,
             * iniziamo il tracking.
             */
            if (!searching) {
  
              avviaTracking();
            }
          },
  
          erroreGPS,
  
          {
            enableHighAccuracy: true,
            timeout: 60000,
            maximumAge: 0
          }
        );
      }
  
  
      function avviaTracking() {
  
        /*
         * Se esiste già un tracking lo fermiamo.
         */
        if (watchId !== null) {
  
          navigator.geolocation.clearWatch(
            watchId
          );
        }
  
        console.log(
          "📍 TRACKING GPS ATTIVO"
        );
  
        watchId = navigator.geolocation.watchPosition(
  
          function (position) {
  
            const accuracy =
              Number(position.coords.accuracy);
  
            console.log(
              "📍 AGGIORNAMENTO GPS:",
              position.coords.latitude,
              position.coords.longitude,
              "precisione:",
              accuracy,
              "m"
            );
  
            /*
             * Ignoriamo aggiornamenti totalmente
             * inutilizzabili.
             */
            if (
              !Number.isFinite(accuracy) ||
              accuracy > 1000
            ) {
              console.warn(
                "GPS: aggiornamento ignorato, precisione:",
                accuracy
              );
  
              return;
            }
  
            const data = {
  
              lat: Number(
                position.coords.latitude
              ),
  
              lng: Number(
                position.coords.longitude
              ),
  
              accuracy: accuracy,
  
              timestamp: Date.now()
            };
  
            try {
  
              sessionStorage.setItem(
                "1km-posizione",
                JSON.stringify(data)
              );
  
            } catch (e) {}
  
            if (
              window.GPSManager &&
              typeof window.GPSManager.updateMap === "function"
            ) {
  
              /*
               * true = aggiorna anche la mappa.
               */
              window.GPSManager.updateMap(
                data,
                false
              );
            }
  
            setButton(
              "📍 POSIZIONE TROVATA",
              false
            );
          },
  
          function (error) {
  
            console.warn(
              "GPS tracking error:",
              error
            );
  
            /*
             * Non cancelliamo immediatamente il tracking
             * per errori temporanei.
             */
          },
  
          {
            enableHighAccuracy: true,
            timeout: 60000,
            maximumAge: 0
          }
        );
      }
  
  
      /*
       * IMPORTANTE:
       *
       * Il pulsante può essere chiamato sia normalmente
       * sia dall'HTML con:
       *
       * onclick="window.avviaGPS()"
       */
      window.avviaGPS = avviaGPS;
  
  
      /*
       * Event listener normale.
       */
      button.addEventListener(
        "click",
        avviaGPS
      );
  
  
      /*
       * Recuperiamo una posizione già ottenuta
       * nella stessa sessione, ma SOLO se è precisa.
       */
      try {
  
        const raw =
          sessionStorage.getItem(
            "1km-posizione"
          );
  
        if (raw) {
  
          const saved =
            JSON.parse(raw);
  
          if (
            saved &&
            Number.isFinite(Number(saved.lat)) &&
            Number.isFinite(Number(saved.lng)) &&
            Number.isFinite(Number(saved.accuracy)) &&
            Number(saved.accuracy) <= 1000
          ) {
  
            console.log(
              "📍 Posizione salvata trovata:",
              saved
            );
  
            if (
              window.GPSManager &&
              typeof window.GPSManager.updateMap === "function"
            ) {
  
              window.GPSManager.updateMap(
                {
                  lat: Number(saved.lat),
                  lng: Number(saved.lng),
                  accuracy: Number(saved.accuracy),
                  timestamp:
                    Number(saved.timestamp) ||
                    Date.now()
                },
                true
              );
  
              setButton(
                "📍 POSIZIONE TROVATA",
                false
              );
            }
          }
        }
  
      } catch (e) {
  
        console.warn(
          "GPS: impossibile leggere posizione salvata."
        );
      }
  
  
      console.log(
        "✅ COLLEGA-GPS.JS ATTIVO"
      );
  
      console.log(
        "📍 GPS parte SOLO premendo il pulsante."
      );
    }
  
  
    /*
     * Avvio quando la pagina è pronta.
     */
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