(function () {
    "use strict";
  
    // =========================================================
    // GPS - 1 KM E SI MANGIA
    // =========================================================
  
    let watchId = null;
    let posizioneUtente = null;
    let markerUtente = null;
    let accuracyCircle = null;
  
    const POSIZIONE_MASSIMA_ACCURATEZZA = 10000; // 10 km
    const TIMEOUT_GPS = 15000;
  
    // ---------------------------------------------------------
    // Trova la mappa Leaflet già presente nella pagina
    // ---------------------------------------------------------
  
    function trovaMappa() {
      if (window.map && typeof window.map.setView === "function") {
        return window.map;
      }
  
      // Cerca eventuali mappe Leaflet presenti nella pagina
      if (window.L && window.L.Map) {
        let trovata = null;
  
        document.querySelectorAll(".leaflet-container").forEach(function (elemento) {
          if (elemento._leaflet_map) {
            trovata = elemento._leaflet_map;
          }
        });
  
        if (trovata) return trovata;
      }
  
      return null;
    }
  
    // ---------------------------------------------------------
    // Crea/aggiorna il pin "TU SEI QUI"
    // ---------------------------------------------------------
  
    function aggiornaPin(lat, lng, accuracy) {
      const mappa = trovaMappa();
  
      if (!mappa || !window.L) {
        return;
      }
  
      // Pin grande e ben visibile
      const iconaUtente = L.divIcon({
        className: "gps-utente-icon",
        html: `
          <div style="
            width:44px;
            height:44px;
            border-radius:50%;
            background:#006b45;
            border:4px solid white;
            box-shadow:0 3px 12px rgba(0,0,0,.45);
            display:flex;
            align-items:center;
            justify-content:center;
            position:relative;
          ">
            <div style="
              width:18px;
              height:18px;
              border-radius:50%;
              background:white;
              border:5px solid #f5a400;
            "></div>
  
            <div style="
              position:absolute;
              bottom:-13px;
              left:50%;
              transform:translateX(-50%);
              width:0;
              height:0;
              border-left:9px solid transparent;
              border-right:9px solid transparent;
              border-top:15px solid #006b45;
            "></div>
          </div>
        `,
        iconSize: [44, 58],
        iconAnchor: [22, 58],
        popupAnchor: [0, -58]
      });
  
      // Primo rilevamento
      if (!markerUtente) {
        markerUtente = L.marker([lat, lng], {
          icon: iconaUtente,
          zIndexOffset: 10000
        }).addTo(mappa);
  
        markerUtente.bindPopup(
          `<strong>📍 TU SEI QUI</strong><br>
           Precisione GPS circa ${Math.round(accuracy)} m`
        );
      } else {
        markerUtente.setLatLng([lat, lng]);
  
        if (markerUtente.getPopup()) {
          markerUtente.setPopupContent(
            `<strong>📍 TU SEI QUI</strong><br>
             Precisione GPS circa ${Math.round(accuracy)} m`
          );
        }
      }
  
      // Cerchio della precisione
      if (!accuracyCircle) {
        accuracyCircle = L.circle([lat, lng], {
          radius: accuracy,
          color: "#006b45",
          fillColor: "#006b45",
          fillOpacity: 0.10,
          weight: 2
        }).addTo(mappa);
      } else {
        accuracyCircle.setLatLng([lat, lng]);
        accuracyCircle.setRadius(accuracy);
      }
    }
  
    // ---------------------------------------------------------
    // Controllo posizione
    // Evita coordinate palesemente errate
    // ---------------------------------------------------------
  
    function posizioneValida(position) {
      if (!position || !position.coords) {
        return false;
      }
  
      const lat = Number(position.coords.latitude);
      const lng = Number(position.coords.longitude);
      const accuracy = Number(position.coords.accuracy);
  
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return false;
      }
  
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return false;
      }
  
      if (!Number.isFinite(accuracy) || accuracy <= 0) {
        return false;
      }
  
      // Non accettiamo una posizione con precisione completamente inutilizzabile
      if (accuracy > POSIZIONE_MASSIMA_ACCURATEZZA) {
        console.warn(
          "GPS ignorato: precisione insufficiente",
          accuracy
        );
        return false;
      }
  
      return true;
    }
  
    // ---------------------------------------------------------
    // Posizione ricevuta
    // ---------------------------------------------------------
  
    function riceviPosizione(position, centraMappa) {
  
      if (!posizioneValida(position)) {
        console.warn("Posizione GPS non valida:", position);
        return;
      }
  
      const lat = Number(position.coords.latitude);
      const lng = Number(position.coords.longitude);
      const accuracy = Number(position.coords.accuracy);
  
      posizioneUtente = {
        lat: lat,
        lng: lng,
        accuracy: accuracy,
        timestamp: Date.now()
      };
  
      // Salva anche globalmente per gli altri moduli
      window.posizioneUtente = posizioneUtente;
  
      aggiornaPin(lat, lng, accuracy);
  
      const mappa = trovaMappa();
  
      // Primo rilevamento: porta la mappa sull'utente
      if (centraMappa && mappa) {
        const zoom = accuracy <= 100 ? 15 :
                     accuracy <= 500 ? 14 :
                     accuracy <= 2000 ? 12 : 10;
  
        mappa.setView([lat, lng], zoom, {
          animate: true
        });
  
        if (markerUtente) {
          setTimeout(function () {
            markerUtente.openPopup();
          }, 500);
        }
      }
  
      // Evento globale per eventuali altri moduli
      window.dispatchEvent(
        new CustomEvent("gps:position", {
          detail: posizioneUtente
        })
      );
  
      console.log(
        "GPS:",
        lat,
        lng,
        "precisione:",
        Math.round(accuracy) + " m"
      );
    }
  
    // ---------------------------------------------------------
    // Errore GPS
    // ---------------------------------------------------------
  
    function erroreGPS(error) {
  
      console.warn("Errore GPS:", error);
  
      let messaggio = "";
  
      switch (error.code) {
  
        case 1:
          messaggio =
            "Permesso di localizzazione negato. " +
            "Abilita la posizione nelle impostazioni del dispositivo/browser.";
          break;
  
        case 2:
          messaggio =
            "Posizione GPS momentaneamente non disponibile. " +
            "Riprova tra qualche secondo.";
          break;
  
        case 3:
          messaggio =
            "Il GPS sta impiegando troppo tempo. " +
            "Riprova in un luogo con una migliore ricezione.";
          break;
  
        default:
          messaggio =
            "Impossibile ottenere la posizione GPS.";
      }
  
      // NON usiamo più alert bloccanti.
      mostraMessaggioGPS(messaggio);
    }
  
    // ---------------------------------------------------------
    // Messaggio discreto
    // ---------------------------------------------------------
  
    function mostraMessaggioGPS(testo) {
  
      let box = document.getElementById("gps-messaggio");
  
      if (!box) {
  
        box = document.createElement("div");
        box.id = "gps-messaggio";
  
        box.style.cssText = `
          position:fixed;
          left:50%;
          bottom:25px;
          transform:translateX(-50%);
          z-index:99999;
          background:#006b45;
          color:white;
          padding:14px 20px;
          border-radius:10px;
          box-shadow:0 4px 18px rgba(0,0,0,.30);
          font-size:14px;
          max-width:90%;
          text-align:center;
        `;
  
        document.body.appendChild(box);
      }
  
      box.textContent = testo;
      box.style.display = "block";
  
      clearTimeout(box._timer);
  
      box._timer = setTimeout(function () {
        box.style.display = "none";
      }, 5000);
    }
  
    // ---------------------------------------------------------
    // Richiesta posizione singola
    // ---------------------------------------------------------
  
    function ottieniPosizione() {
  
      if (!("geolocation" in navigator)) {
        mostraMessaggioGPS(
          "La geolocalizzazione non è supportata da questo dispositivo."
        );
        return;
      }
  
      mostraMessaggioGPS("📍 Ricerca posizione...");
  
      navigator.geolocation.getCurrentPosition(
        function (position) {
          riceviPosizione(position, true);
          nascondiMessaggioGPS();
          avviaSeguimento();
        },
        erroreGPS,
        {
          enableHighAccuracy: true,
          timeout: TIMEOUT_GPS,
          maximumAge: 5000
        }
      );
    }
  
    // ---------------------------------------------------------
    // Seguimento GPS in movimento
    // ---------------------------------------------------------
  
    function avviaSeguimento() {
  
      if (!("geolocation" in navigator)) {
        return;
      }
  
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
  
      watchId = navigator.geolocation.watchPosition(
        function (position) {
  
          // Dopo il primo rilevamento aggiorniamo il pin
          // senza spostare continuamente la mappa.
          riceviPosizione(position, false);
        },
        function (error) {
  
          // Durante il movimento non mostriamo continuamente
          // messaggi fastidiosi.
          console.warn("GPS movimento:", error);
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 3000
        }
      );
  
      console.log("Seguimento GPS attivo");
    }
  
    // ---------------------------------------------------------
    // Ferma seguimento
    // ---------------------------------------------------------
  
    function fermaSeguimento() {
  
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
  
      console.log("Seguimento GPS fermato");
    }
  
    // ---------------------------------------------------------
    // Nasconde messaggio
    // ---------------------------------------------------------
  
    function nascondiMessaggioGPS() {
  
      const box = document.getElementById("gps-messaggio");
  
      if (box) {
        box.style.display = "none";
      }
    }
  
    // ---------------------------------------------------------
    // API globale
    // ---------------------------------------------------------
  
    window.ottieniPosizione = ottieniPosizione;
    window.avviaSeguimentoGPS = avviaSeguimento;
    window.fermaSeguimentoGPS = fermaSeguimento;
  
    window.getPosizioneUtente = function () {
      return posizioneUtente;
    };
  
    // ---------------------------------------------------------
    // Collega automaticamente il pulsante HOME
    // ---------------------------------------------------------
  
    function collegaPulsanteGPS() {
  
      const possibiliID = [
        "usa-posizione",
        "usaLaMiaPosizione",
        "btn-posizione",
        "btnPosizione"
      ];
  
      let button = null;
  
      for (const id of possibiliID) {
        button = document.getElementById(id);
        if (button) break;
      }
  
      // Se non trova l'ID, cerca il pulsante dal testo
      if (!button) {
  
        const buttons = document.querySelectorAll(
          "button, a"
        );
  
        for (const elemento of buttons) {
  
          const testo = (
            elemento.textContent || ""
          ).toLowerCase();
  
          if (
            testo.includes("usa la mia posizione") ||
            testo.includes("usa la mia posizione")
          ) {
            button = elemento;
            break;
          }
        }
      }
  
      if (!button) {
        console.warn(
          "GPS: pulsante 'USA LA MIA POSIZIONE' non trovato."
        );
        return;
      }
  
      // Evita doppio collegamento
      if (button.dataset.gpsCollegato === "true") {
        return;
      }
  
      button.dataset.gpsCollegato = "true";
  
      button.addEventListener("click", function (event) {
        event.preventDefault();
        ottieniPosizione();
      });
  
      console.log("GPS: pulsante collegato");
    }
  
    // ---------------------------------------------------------
    // Avvio
    // ---------------------------------------------------------
  
    if (document.readyState === "loading") {
  
      document.addEventListener(
        "DOMContentLoaded",
        collegaPulsanteGPS
      );
  
    } else {
  
      collegaPulsanteGPS();
    }
  
  })();