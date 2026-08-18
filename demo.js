/* =========================================================
   1 KM E SI MANGIA
   demo.js

   REGIA DELLA MODALITÀ DEMO MEZZI PESANTI

   Questo file collega:
   - gps.js
   - camion-navigazione.js
   - navigazione.js

   NON gestisce direttamente:
   - Leaflet
   - mappa
   - database ristoranti
   - database uscite

   Regola fondamentale:
   PARCHEGGIO COMPATIBILE = massimo 600 metri
   dal ristorante scelto.
   ========================================================= */

   (function () {

    "use strict";
  
  
    /* =========================================================
       CONFIGURAZIONE
       ========================================================= */
  
    const CONFIG = {
  
      enabled: false,
  
      maxParkingDistanceMeters: 600
  
    };
  
  
    /* =========================================================
       STATO
       ========================================================= */
  
    let selectedRestaurant = null;
  
    let availableParkings = [];
  
  
    /* =========================================================
       ATTIVAZIONE MODALITÀ DEMO
       ========================================================= */
  
    function enable() {
  
      CONFIG.enabled = true;
  
      console.log(
        "DEMO MEZZI PESANTI attivata."
      );
  
      return true;
    }
  
  
    /* =========================================================
       DISATTIVAZIONE
       ========================================================= */
  
    function disable() {
  
      CONFIG.enabled = false;
  
      selectedRestaurant = null;
  
      availableParkings = [];
  
      console.log(
        "DEMO MEZZI PESANTI disattivata."
      );
  
      return true;
    }
  
  
    /* =========================================================
       STATO
       ========================================================= */
  
    function isEnabled() {
  
      return CONFIG.enabled;
  
    }
  
  
    /* =========================================================
       IMPOSTA RISTORANTE
       ========================================================= */
  
    function setRestaurant(
      restaurant
    ) {
  
      if (
        !restaurant
      ) {
  
        console.error(
          "DEMO: ristorante non valido."
        );
  
        selectedRestaurant =
          null;
  
        return false;
      }
  
      selectedRestaurant =
        restaurant;
  
      return true;
    }
  
  
    /* =========================================================
       IMPOSTA PARCHEGGI DISPONIBILI
       ========================================================= */
  
    function setParkings(
      parkings
    ) {
  
      if (
        !Array.isArray(
          parkings
        )
      ) {
  
        availableParkings =
          [];
  
        return false;
      }
  
      availableParkings =
        parkings;
  
      return true;
    }
  
  
    /* =========================================================
       CERCA PARCHEGGIO COMPATIBILE
       ========================================================= */
  
    function findParking() {
  
      if (
        !selectedRestaurant
      ) {
  
        return null;
      }
  
      if (
        !window.CamionNavigazione
      ) {
  
        console.error(
          "DEMO: camion-navigazione.js non caricato."
        );
  
        return null;
      }
  
      return (
        window.CamionNavigazione
          .findBestParking(
            selectedRestaurant,
            availableParkings
          )
      );
    }
  
  
    /* =========================================================
       PREPARA DESTINAZIONE
       ========================================================= */
  
    function prepareDestination() {
  
      if (
        !selectedRestaurant
      ) {
  
        return null;
      }
  
      if (
        !window.CamionNavigazione
      ) {
  
        console.error(
          "DEMO: modulo camion non disponibile."
        );
  
        return null;
      }
  
      return (
        window.CamionNavigazione
          .getDestination(
            selectedRestaurant,
            availableParkings
          )
      );
    }
  
  
    /* =========================================================
       DESTINAZIONE RISTORANTE
       ========================================================= */
  
    function getRestaurantDestination() {
  
      if (
        !selectedRestaurant
      ) {
  
        return null;
      }
  
      return {
  
        type:
          "restaurant",
  
        name:
          selectedRestaurant.name ??
          selectedRestaurant.nome ??
          "Ristorante",
  
        lat:
          Number(
            selectedRestaurant.lat ??
            selectedRestaurant.latitude
          ),
  
        lng:
          Number(
            selectedRestaurant.lng ??
            selectedRestaurant.lon ??
            selectedRestaurant.longitude
          )
      };
    }
  
  
    /* =========================================================
       DESTINAZIONE PARCHEGGIO
       ========================================================= */
  
    function getParkingDestination(
      parkingResult
    ) {
  
      if (
        !parkingResult ||
        !parkingResult.parking
      ) {
  
        return null;
      }
  
      const parking =
        parkingResult.parking;
  
      return {
  
        type:
          "parking",
  
        name:
          parking.name ??
          parking.nome ??
          "Parcheggio",
  
        lat:
          Number(
            parking.lat ??
            parking.latitude
          ),
  
        lng:
          Number(
            parking.lng ??
            parking.lon ??
            parking.longitude
          ),
  
        distanceMeters:
          Number(
            parkingResult.distanceMeters
          )
      };
    }
  
  
    /* =========================================================
       DESTINAZIONE FINALE DEMO
       ========================================================= */
  
    function getDemoDestination() {
  
      if (
        !selectedRestaurant
      ) {
  
        return null;
      }
  
      const result =
        prepareDestination();
  
      if (
        !result
      ) {
  
        return null;
      }
  
  
      /*
        Se esiste un parcheggio
        entro 600 metri dal ristorante,
        la modalità camion propone
        il parcheggio.
      */
  
      if (
        result.type ===
        "parking"
      ) {
  
        const parking =
          getParkingDestination(
            {
              parking:
                result.data,
  
              distanceMeters:
                result.distanceMeters
            }
          );
  
        if (
          parking &&
          parking.distanceMeters <=
          CONFIG.maxParkingDistanceMeters
        ) {
  
          return parking;
        }
      }
  
  
      /*
        Nessun parcheggio compatibile:
        destinazione = ristorante.
      */
  
      return (
        getRestaurantDestination()
      );
    }
  
  
    /* =========================================================
       VERIFICA DISPONIBILITÀ PARCHEGGIO
       ========================================================= */
  
    function hasNearbyParking() {
  
      return Boolean(
        findParking()
      );
  
    }
  
  
    /* =========================================================
       DISTANZA PARCHEGGIO
       ========================================================= */
  
    function getParkingDistance() {
  
      const result =
        findParking();
  
      if (
        !result
      ) {
  
        return null;
      }
  
      return Number(
        result.distanceMeters
      );
  
    }
  
  
    /* =========================================================
       GPS ATTUALE
       ========================================================= */
  
    function getCurrentPosition() {
  
      if (
        !window.GPSManager
      ) {
  
        return null;
      }
  
      return (
        window.GPSManager
          .getLastPosition()
      );
  
    }
  
  
    /* =========================================================
       NAVIGAZIONE
       ========================================================= */
  
    function navigate(
      navigatorName
    ) {
  
      if (
        !selectedRestaurant
      ) {
  
        console.error(
          "DEMO: nessun ristorante selezionato."
        );
  
        return false;
      }
  
      if (
        !window.Navigazione
      ) {
  
        console.error(
          "DEMO: navigazione.js non caricato."
        );
  
        return false;
      }
  
  
      const destination =
        getDemoDestination();
  
  
      if (
        !destination
      ) {
  
        console.error(
          "DEMO: impossibile determinare la destinazione."
        );
  
        return false;
      }
  
  
      return (
        window.Navigazione.open(
          navigatorName,
          destination
        )
      );
    }
  
  
    /* =========================================================
       DATI PER LA UI
       ========================================================= */
  
    function getStatus() {
  
      const parking =
        findParking();
  
      return {
  
        enabled:
          CONFIG.enabled,
  
        restaurant:
          selectedRestaurant,
  
        hasNearbyParking:
          Boolean(
            parking
          ),
  
        parkingDistanceMeters:
          parking
            ? Number(
                parking.distanceMeters
              )
            : null,
  
        maxParkingDistanceMeters:
          CONFIG.maxParkingDistanceMeters,
  
        destination:
          getDemoDestination()
  
      };
    }
  
  
    /* =========================================================
       RESET
       ========================================================= */
  
    function reset() {
  
      selectedRestaurant =
        null;
  
      availableParkings =
        [];
  
      return true;
  
    }
  
  
    /* =========================================================
       API PUBBLICA
       ========================================================= */
  
    const api = {
  
      enable:
        enable,
  
      disable:
        disable,
  
      isEnabled:
        isEnabled,
  
      setRestaurant:
        setRestaurant,
  
      setParkings:
        setParkings,
  
      findParking:
        findParking,
  
      prepareDestination:
        prepareDestination,
  
      getRestaurantDestination:
        getRestaurantDestination,
  
      getParkingDestination:
        getParkingDestination,
  
      getDemoDestination:
        getDemoDestination,
  
      hasNearbyParking:
        hasNearbyParking,
  
      getParkingDistance:
        getParkingDistance,
  
      getCurrentPosition:
        getCurrentPosition,
  
      navigate:
        navigate,
  
      getStatus:
        getStatus,
  
      reset:
        reset
  
    };
  
  
    /* =========================================================
       ESPOSIZIONE GLOBALE
       ========================================================= */
  
    window.DemoCamion =
      api;
  
  
    console.log(
      "Demo Camion caricata."
    );
  
  
  })();