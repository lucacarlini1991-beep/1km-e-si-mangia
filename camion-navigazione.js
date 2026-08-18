/* =========================================================
   1 KM E SI MANGIA
   camion-navigazione.js

   Gestione della futura MODALITÀ MEZZI PESANTI.

   Questo file NON gestisce direttamente il GPS.
   Per la posizione utilizzerà GPSManager di gps.js.

   Regola principale:
   RISTORANTE → PARCHEGGIO COMPATIBILE
   Il parcheggio deve essere massimo 600 metri
   dal ristorante scelto.
   ========================================================= */

   (function () {
    "use strict";
  
    const MAX_PARKING_DISTANCE_METERS = 600;
  
    /* =========================================================
       DISTANZA
       ========================================================= */
  
    function distanceMeters(
      lat1,
      lng1,
      lat2,
      lng2
    ) {
      const R = 6371000;
  
      const dLat =
        (lat2 - lat1) *
        Math.PI /
        180;
  
      const dLng =
        (lng2 - lng1) *
        Math.PI /
        180;
  
      const a =
        Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +
  
        Math.cos(
          lat1 * Math.PI / 180
        ) *
        Math.cos(
          lat2 * Math.PI / 180
        ) *
  
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
  
      return (
        2 *
        R *
        Math.atan2(
          Math.sqrt(a),
          Math.sqrt(1 - a)
        )
      );
    }
  
    /* =========================================================
       COORDINATE VALIDE
       ========================================================= */
  
    function validCoordinates(
      lat,
      lng
    ) {
      return (
        Number.isFinite(
          Number(lat)
        ) &&
        Number.isFinite(
          Number(lng)
        ) &&
        Number(lat) >= -90 &&
        Number(lat) <= 90 &&
        Number(lng) >= -180 &&
        Number(lng) <= 180
      );
    }
  
    /* =========================================================
       DISTANZA RISTORANTE → PARCHEGGIO
       ========================================================= */
  
    function parkingDistance(
      restaurant,
      parking
    ) {
      if (
        !restaurant ||
        !parking
      ) {
        return null;
      }
  
      const restaurantLat =
        Number(
          restaurant.lat
        );
  
      const restaurantLng =
        Number(
          restaurant.lng
        );
  
      const parkingLat =
        Number(
          parking.lat
        );
  
      const parkingLng =
        Number(
          parking.lng
        );
  
      if (
        !validCoordinates(
          restaurantLat,
          restaurantLng
        ) ||
        !validCoordinates(
          parkingLat,
          parkingLng
        )
      ) {
        return null;
      }
  
      return distanceMeters(
        restaurantLat,
        restaurantLng,
        parkingLat,
        parkingLng
      );
    }
  
    /* =========================================================
       VERIFICA PARCHEGGIO ENTRO 600 METRI
       ========================================================= */
  
    function isParkingCompatible(
      restaurant,
      parking
    ) {
      const distance =
        parkingDistance(
          restaurant,
          parking
        );
  
      if (
        distance === null
      ) {
        return false;
      }
  
      return (
        distance <=
        MAX_PARKING_DISTANCE_METERS
      );
    }
  
    /* =========================================================
       CERCA IL PARCHEGGIO MIGLIORE
       ========================================================= */
  
    function findBestParking(
      restaurant,
      parkings
    ) {
      if (
        !restaurant ||
        !Array.isArray(
          parkings
        )
      ) {
        return null;
      }
  
      let bestParking = null;
      let bestDistance =
        Infinity;
  
      parkings.forEach(
        function (parking) {
  
          if (
            !isParkingCompatible(
              restaurant,
              parking
            )
          ) {
            return;
          }
  
          const distance =
            parkingDistance(
              restaurant,
              parking
            );
  
          if (
            distance !== null &&
            distance <
            bestDistance
          ) {
            bestDistance =
              distance;
  
            bestParking =
              parking;
          }
        }
      );
  
      if (
        !bestParking
      ) {
        return null;
      }
  
      return {
        parking:
          bestParking,
  
        distanceMeters:
          Math.round(
            bestDistance
          )
      };
    }
  
    /* =========================================================
       PREPARA LA MODALITÀ DEMO
       ========================================================= */
  
    function prepareDemo(
      restaurant,
      parkings
    ) {
      const result =
        findBestParking(
          restaurant,
          parkings
        );
  
      return {
        enabled:
          true,
  
        restaurant:
          restaurant,
  
        parking:
          result
            ? result.parking
            : null,
  
        parkingDistanceMeters:
          result
            ? result.distanceMeters
            : null,
  
        hasNearbyParking:
          Boolean(
            result
          ),
  
        maxParkingDistanceMeters:
          MAX_PARKING_DISTANCE_METERS
      };
    }
  
    /* =========================================================
       DESTINAZIONE DEMO
       ========================================================= */
  
    function getDestination(
      restaurant,
      parkings
    ) {
      const demo =
        prepareDemo(
          restaurant,
          parkings
        );
  
      /*
        Se esiste un parcheggio
        compatibile entro 600 m,
        la modalità camion propone
        il parcheggio come destinazione.
      */
  
      if (
        demo.hasNearbyParking
      ) {
        return {
          type:
            "parking",
  
          data:
            demo.parking,
  
          distanceMeters:
            demo.parkingDistanceMeters
        };
      }
  
      /*
        Se non esiste un parcheggio
        compatibile, la funzione
        restituisce il ristorante.
  
        Sarà poi la UI a decidere
        come informare l'autista.
      */
  
      return {
        type:
          "restaurant",
  
        data:
          restaurant,
  
        distanceMeters:
          null
      };
    }
  
    /* =========================================================
       API PUBBLICA
       ========================================================= */
  
    const api = {
  
      MAX_PARKING_DISTANCE_METERS:
        MAX_PARKING_DISTANCE_METERS,
  
      distanceMeters:
        distanceMeters,
  
      parkingDistance:
        parkingDistance,
  
      isParkingCompatible:
        isParkingCompatible,
  
      findBestParking:
        findBestParking,
  
      prepareDemo:
        prepareDemo,
  
      getDestination:
        getDestination
    };
  
    window.CamionNavigazione =
      api;
  
    console.log(
      "Camion Navigazione caricato."
    );
  
  })();