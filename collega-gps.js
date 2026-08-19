/* =========================================================
   1 KM E SI MANGIA
   collega-gps.js - GPS DIRETTO

   Il pulsante:
   1. chiede direttamente la posizione al browser
   2. NON dipende da GPSManager
   3. rifiuta posizioni palesemente sbagliate (es. Rimini da IP)
   4. mette TU SEI QUI sulla mappa
   5. centra la mappa
   6. salva la posizione
   7. continua ad aggiornare la posizione
   ========================================================= */

   (function () {
    "use strict";
  
    let posizioneMarker = null;
    let precisionCircle = null;
    let watchId = null;
    let inRicerca = false;
  
    const MAX_ACCURACY = 10000; // 10 km: oltre è quasi certamente posizione da rete/IP
  
    function getButton() {
      return document.getElementById("locationButton");
    }
  
    function setButton(text, disabled) {
      const button = getButton();
      if (!button) return;
  
      button.textContent = text;
      button.disabled = !!disabled;
    }
  
    function getMap() {
      if (window.appMap) return window.appMap;
  
      if (window.map) return window.map;
  
      return null;
    }
  
    function salvaPosizione(position) {
      const lat = Number(position.coords.latitude);
      const lng = Number(position.coords.longitude);
      const accuracy = Number(position.coords.accuracy);
  
      const data = {
        lat: lat,
        lng: lng,
        accuracy: accuracy,
        timestamp: Date.now()
      };
  
      try {
        sessionStorage.setItem(
          "1km-posizione",
          JSON.stringify(data)
        );
      } catch (e) {
        console.warn("GPS: impossibile salvare sessionStorage", e);
      }
  
      return data;
    }
  
    function mostraSullaMappa(position) {
      const lat = Number(position.coords.latitude);
      const lng = Number(position.coords.longitude);
      const accuracy = Number(position.coords.accuracy);
  
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        console.warn("GPS: coordinate non valide.");
        return false;
      }
  
      /*
        BLOCCO DELLA POSIZIONE IP.
  
        Se il browser restituisce per esempio:
        accuracy = 273000 metri
  
        NON la mostriamo sulla mappa.
      */
      if (!Number.isFinite(accuracy) || accuracy > MAX_ACCURACY) {
        console.warn(
          "GPS: posizione rifiutata perché troppo imprecisa:",
          accuracy,
          "metri"
        );
  
        return false;
      }
  
      const map = getMap();
  
      if (!map) {
        console.warn("GPS: mappa non ancora disponibile.");
        return false;
      }
  
      const latLng = [lat, lng];
  
      /*
        Icona TU SEI QUI.
      */
      let icon = null;
  
      try {
        icon = L.icon({
          iconUrl: "assets/pin-posizione.png",
          iconSize: [46, 46],
          iconAnchor: [23, 46],
          popupAnchor: [0, -46]
        });
      } catch (e) {
        console.warn("GPS: impossibile creare icona personalizzata.");
      }
  
      /*
        Elimina il vecchio marker.
      */
      if (posizioneMarker) {
        try {
          map.removeLayer(posizioneMarker);
        } catch (e) {}
      }
  
      if (precisionCircle) {
        try {
          map.removeLayer(precisionCircle);
        } catch (e) {}
      }
  
      /*
        Crea il marker.
      */
      if (icon) {
        posizioneMarker = L.marker(latLng, {
          icon: icon,
          zIndexOffset: 10000
        }).addTo(map);
      } else {
        posizioneMarker = L.marker(latLng, {
          zIndexOffset: 10000
        }).addTo(map);
      }
  
      posizioneMarker.bindPopup(
        "<strong>📍 TU SEI QUI</strong><br>" +
        "Precisione: circa " +
        Math.round(accuracy) +
        " metri"
      );
  
      /*
        Cerchio della precisione.
      */
      precisionCircle = L.circle(latLng, {
        radius: accuracy,
        weight: 1,
        fillOpacity: 0.08
      }).addTo(map);
  
      /*
        Centra la mappa ESATTAMENTE sulla posizione.
      */
      map.setView(latLng, 13, {
        animate: true
      });
  
      console.log(
        "📍 TU SEI QUI:",
        lat,
        lng,
        "precisione:",
        accuracy,
        "m"
      );
  
      return true;
    }
  
    function posizioneValida(position) {
      const accuracy = Number(position.coords.accuracy);
  
      if (!Number.isFinite(accuracy)) return false;
  
      return accuracy <= MAX_ACCURACY;
    }
  
    function erroreGPS(error) {
      inRicerca = false;
  
      setButton(
        "📍 USA LA MIA POSIZIONE",
        false
      );
  
      console.error(
        "GPS errore:",
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
          "Posizione negata.\n\n" +
          "Su iPhone vai in:\n" +
          "Impostazioni → Privacy e sicurezza → Localizzazione\n\n" +
          "e consenti la posizione per Safari."
        );
        return;
      }
  
      if (error.code === 2) {
        alert(
          "La posizione non è disponibile.\n\n" +
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
        "Non siamo riusciti a ottenere la tua posizione. Riprova."
      );
    }
  
    function gestionePosizione(position) {
      console.log(
        "📍 GPS ricevuto:",
        position.coords.latitude,
        position.coords.longitude,
        "precisione:",
        position.coords.accuracy
      );
  
      /*
        Se la posizione è troppo imprecisa,
        NON la utilizziamo.
      */
      if (!posizioneValida(position)) {
        console.warn(
          "⚠️ Posizione troppo imprecisa:",
          position.coords.accuracy,
          "m"
        );
  
        setButton(
          "📍 CERCO POSIZIONE PRECISA...",
          true
        );
  
        return false;
      }
  
      const data = salvaPosizione(position);
  
      const mostrata = mostraSullaMappa(position);
  
      if (mostrata) {
        setButton(
          "📍 POSIZIONE TROVATA",
          false
        );
  
        inRicerca = false;
  
        console.log(
          "✅ POSIZIONE VISUALIZZATA:",
          data
        );
  
        return true;
      }
  
      return false;
    }
  
    function avviaWatch() {
      if (!navigator.geolocation) return;
  
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
  
      watchId = navigator.geolocation.watchPosition(
        function (position) {
          console.log(
            "📡 Aggiornamento GPS:",
            position.coords.accuracy,
            "m"
          );
  
          if (posizioneValida(position)) {
            gestionePosizione(position);
          }
        },
  
        function (error) {
          console.warn(
            "GPS watch error:",
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
      if (inRicerca) return;
  
      if (!navigator.geolocation) {
        alert(
          "Questo dispositivo non supporta la geolocalizzazione."
        );
        return;
      }
  
      if (!window.isSecureContext) {
        alert(
          "La posizione richiede HTTPS.\n\n" +
          "Apri il sito tramite Vercel."
        );
        return;
      }
  
      inRicerca = true;
  
      setButton(
        "📍 RICERCA POSIZIONE...",
        true
      );
  
      console.log(
        "📍 AVVIO GPS DIRETTO"
      );
  
      navigator.geolocation.getCurrentPosition(
  
        function (position) {
  
          console.log(
            "📍 PRIMA POSIZIONE:",
            position.coords
          );
  
          /*
            Se è precisa, la visualizziamo.
          */
          if (gestionePosizione(position)) {
            avviaWatch();
            return;
          }
  
          /*
            Se è troppo imprecisa,
            NON mostriamo quella posizione.
            Aspettiamo il vero GPS.
          */
          setButton(
            "📍 CERCO GPS PRECISO...",
            true
          );
  
          avviaWatch();
        },
  
        function (error) {
  
          console.warn(
            "Prima richiesta GPS fallita:",
            error
          );
  
          inRicerca = false;
  
          setButton(
            "📍 USA LA MIA POSIZIONE",
            false
          );
  
          erroreGPS(error);
        },
  
        {
          enableHighAccuracy: true,
          timeout: 60000,
          maximumAge: 0
        }
      );
    }
  
    function collegaPulsante() {
  
      const button = getButton();
  
      if (!button) {
        console.warn(
          "GPS: locationButton non trovato."
        );
        return;
      }
  
      /*
        Evita doppi collegamenti.
      */
      if (button.dataset.gpsCollegato === "1") {
        return;
      }
  
      button.dataset.gpsCollegato = "1";
  
      /*
        IMPORTANTISSIMO:
        rendiamo disponibile la funzione anche
        all'HTML con onclick="window.avviaGPS()".
      */
      window.avviaGPS = avviaGPS;
  
      /*
        Collegamento diretto al click.
      */
      button.addEventListener(
        "click",
        function (event) {
  
          event.preventDefault();
          event.stopPropagation();
  
          console.log(
            "🟢 CLICK GPS RICEVUTO"
          );
  
          avviaGPS();
        },
        {
          passive: false
        }
      );
  
      console.log(
        "✅ GPS DIRETTO ATTIVO"
      );
    }
  
    /*
      Aspettiamo che la pagina sia pronta.
    */
    if (document.readyState === "loading") {
  
      document.addEventListener(
        "DOMContentLoaded",
        collegaPulsante
      );
  
    } else {
  
      collegaPulsante();
  
    }
  
  })();