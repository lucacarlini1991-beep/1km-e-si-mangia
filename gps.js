/* =========================================================
   1 KM E SI MANGIA
   GPS - gestione posizione smartphone
   ========================================================= */

   (function () {
    "use strict";
  
    let ultimaPosizione = null;
    let watchId = null;
  
    const CONFIG = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
  
      // Evita di accettare posizioni palesemente inutilizzabili
      maxAccuracy: 20000,
  
      // Salto massimo accettato senza una buona precisione
      maxJumpMeters: 50000
    };
  
    /* ---------------------------------------------------------
       DISTANZA TRA DUE COORDINATE
       --------------------------------------------------------- */
  
    function distanzaMetri(lat1, lon1, lat2, lon2) {
      const R = 6371000;
  
      const p1 = lat1 * Math.PI / 180;
      const p2 = lat2 * Math.PI / 180;
  
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
  
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(p1) *
        Math.cos(p2) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
  
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
      return R * c;
    }
  
    /* ---------------------------------------------------------
       VERIFICA COORDINATE
       --------------------------------------------------------- */
  
    function coordinateValide(lat, lon) {
      return (
        Number.isFinite(lat) &&
        Number.isFinite(lon) &&
        lat >= -90 &&
        lat <= 90 &&
        lon >= -180 &&
        lon <= 180
      );
    }
  
    /* ---------------------------------------------------------
       AGGIORNA PULSANTE
       --------------------------------------------------------- */
  
    function aggiornaPulsante(testo, disabilitato) {
      const pulsanti = document.querySelectorAll(
        "#usa-posizione, #btn-posizione, [data-gps]"
      );
  
      pulsanti.forEach(function (button) {
        if (testo) {
          button.textContent = testo;
        }
  
        if (typeof disabilitato === "boolean") {
          button.disabled = disabilitato;
        }
      });
    }
  
    /* ---------------------------------------------------------
       MOSTRA ERRORE
       --------------------------------------------------------- */
  
    function mostraErrore(messaggio) {
      console.warn("GPS:", messaggio);
  
      aggiornaPulsante("📍 USA LA MIA POSIZIONE", false);
  
      // Se esiste un contenitore dedicato, usiamolo
      const box = document.getElementById("gps-status");
  
      if (box) {
        box.textContent = messaggio;
        box.style.display = "block";
      }
    }
  
    /* ---------------------------------------------------------
       POSIZIONE RICEVUTA
       --------------------------------------------------------- */
  
    function posizioneRicevuta(position) {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const accuracy = position.coords.accuracy;
  
      console.log("GPS ricevuto:", {
        lat: lat,
        lon: lon,
        accuracy: accuracy
      });
  
      // Coordinate impossibili
      if (!coordinateValide(lat, lon)) {
        console.warn("GPS: coordinate non valide.");
        return;
      }
  
      // Precisione troppo scarsa
      if (
        Number.isFinite(accuracy) &&
        accuracy > CONFIG.maxAccuracy
      ) {
        console.warn(
          "GPS: posizione scartata per precisione insufficiente:",
          accuracy,
          "m"
        );
        return;
      }
  
      // Evita salti enormi tipo Italia → Africa
      if (ultimaPosizione) {
        const salto = distanzaMetri(
          ultimaPosizione.lat,
          ultimaPosizione.lon,
          lat,
          lon
        );
  
        if (
          salto > CONFIG.maxJumpMeters &&
          accuracy > 1000
        ) {
          console.warn(
            "GPS: salto anomalo scartato:",
            Math.round(salto / 1000),
            "km"
          );
          return;
        }
      }
  
      ultimaPosizione = {
        lat: lat,
        lon: lon,
        accuracy: accuracy,
        timestamp: Date.now()
      };
  
      aggiornaPulsante("📍 POSIZIONE TROVATA", false);
  
      // Salviamo la posizione per le altre pagine
      try {
        localStorage.setItem(
          "1km_ultima_posizione",
          JSON.stringify(ultimaPosizione)
        );
      } catch (e) {
        console.warn("Impossibile salvare la posizione.");
      }
  
      // Evento globale per mappa / ristoranti / uscite
      window.dispatchEvent(
        new CustomEvent("1km:gps", {
          detail: ultimaPosizione
        })
      );
  
      // Se la pagina usa una funzione dedicata, la chiamiamo
      if (typeof window.aggiornaPosizioneMappa === "function") {
        window.aggiornaPosizioneMappa(
          lat,
          lon,
          accuracy
        );
      }
    }
  
    /* ---------------------------------------------------------
       ERRORE GPS
       --------------------------------------------------------- */
  
    function erroreGPS(error) {
      let messaggio = "Impossibile ottenere la posizione.";
  
      if (error) {
        switch (error.code) {
          case 1:
            messaggio =
              "Permesso posizione negato. Attiva la posizione per questo sito.";
            break;
  
          case 2:
            messaggio =
              "Posizione non disponibile. Controlla GPS e connessione.";
            break;
  
          case 3:
            messaggio =
              "Ricerca posizione scaduta. Riprova.";
            break;
        }
      }
  
      mostraErrore(messaggio);
    }
  
    /* ---------------------------------------------------------
       OTTIENI POSIZIONE
       --------------------------------------------------------- */
  
    function ottieniPosizione() {
      if (!("geolocation" in navigator)) {
        mostraErrore(
          "Il GPS non è supportato da questo dispositivo/browser."
        );
        return;
      }
  
      aggiornaPulsante("📍 RICERCA POSIZIONE...", true);
  
      navigator.geolocation.getCurrentPosition(
        posizioneRicevuta,
        erroreGPS,
        CONFIG
      );
    }
  
    /* ---------------------------------------------------------
       AVVIA GPS IN MOVIMENTO
       --------------------------------------------------------- */
  
    function avviaGPS() {
      if (!("geolocation" in navigator)) {
        mostraErrore(
          "Il GPS non è supportato da questo dispositivo/browser."
        );
        return;
      }
  
      if (watchId !== null) {
        return;
      }
  
      console.log("1 KM E SI MANGIA - GPS movimento avviato");
  
      watchId = navigator.geolocation.watchPosition(
        posizioneRicevuta,
        erroreGPS,
        CONFIG
      );
    }
  
    /* ---------------------------------------------------------
       FERMA GPS
       --------------------------------------------------------- */
  
    function fermaGPS() {
      if (
        watchId !== null &&
        "geolocation" in navigator
      ) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    }
  
    /* ---------------------------------------------------------
       ULTIMA POSIZIONE
       --------------------------------------------------------- */
  
    function getUltimaPosizione() {
      if (ultimaPosizione) {
        return ultimaPosizione;
      }
  
      try {
        const salvata = localStorage.getItem(
          "1km_ultima_posizione"
        );
  
        if (salvata) {
          return JSON.parse(salvata);
        }
      } catch (e) {
        console.warn("Errore lettura posizione salvata.");
      }
  
      return null;
    }
  
    /* ---------------------------------------------------------
       API PUBBLICA
       --------------------------------------------------------- */
  
    window.oneKmGPS = {
      ottieniPosizione: ottieniPosizione,
      avvia: avviaGPS,
      ferma: fermaGPS,
  
      getUltimaPosizione: getUltimaPosizione,
  
      getLatitudine: function () {
        const p = getUltimaPosizione();
        return p ? p.lat : null;
      },
  
      getLongitudine: function () {
        const p = getUltimaPosizione();
        return p ? p.lon : null;
      }
    };
  
    /* ---------------------------------------------------------
       COLLEGAMENTO AL PULSANTE
       --------------------------------------------------------- */
  
    function collegaPulsantiGPS() {
      const pulsanti = document.querySelectorAll(
        "#usa-posizione, #btn-posizione, [data-gps]"
      );
  
      pulsanti.forEach(function (button) {
        button.addEventListener(
          "click",
          function (event) {
            event.preventDefault();
            ottieniPosizione();
          }
        );
      });
  
      console.log(
        "GPS: pulsanti trovati:",
        pulsanti.length
      );
    }
  
    /* ---------------------------------------------------------
       AVVIO
       --------------------------------------------------------- */
  
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        collegaPulsantiGPS
      );
    } else {
      collegaPulsantiGPS();
    }
  
  })();