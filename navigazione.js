/* =========================================================
   1 KM E SI MANGIA
   navigazione.js

   Gestione esclusiva della navigazione verso una
   destinazione.

   NON gestisce:
   - GPS
   - posizione dell'utente
   - ristoranti
   - uscite
   - modalità camion

   Riceve semplicemente:
   nome + latitudine + longitudine

   Navigatori:
   - Google Maps
   - Waze
   - Mappe Apple
   ========================================================= */

   (function () {

    "use strict";
  
    /* =========================================================
       CONTROLLO COORDINATE
       ========================================================= */
  
    function validCoordinates(lat, lng) {
  
      lat = Number(lat);
      lng = Number(lng);
  
      return (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      );
    }
  
  
    /* =========================================================
       NORMALIZZA DESTINAZIONE
       ========================================================= */
  
    function normalizeDestination(destination) {
  
      if (!destination) {
        return null;
      }
  
      const lat = Number(
        destination.lat ??
        destination.latitude
      );
  
      const lng = Number(
        destination.lng ??
        destination.lon ??
        destination.longitude
      );
  
      if (
        !validCoordinates(
          lat,
          lng
        )
      ) {
  
        console.error(
          "Navigazione: coordinate destinazione non valide.",
          destination
        );
  
        return null;
      }
  
      return {
  
        name:
          String(
            destination.name ??
            destination.nome ??
            "Destinazione"
          ),
  
        lat:
          lat,
  
        lng:
          lng
      };
    }
  
  
    /* =========================================================
       URL GOOGLE MAPS
       ========================================================= */
  
    function googleMapsUrl(destination) {
  
      const d =
        normalizeDestination(
          destination
        );
  
      if (!d) {
        return null;
      }
  
      return (
        "https://www.google.com/maps/dir/?api=1" +
        "&destination=" +
        encodeURIComponent(
          d.lat + "," + d.lng
        ) +
        "&travelmode=driving"
      );
    }
  
  
    /* =========================================================
       URL WAZE
       ========================================================= */
  
    function wazeUrl(destination) {
  
      const d =
        normalizeDestination(
          destination
        );
  
      if (!d) {
        return null;
      }
  
      return (
        "https://www.waze.com/ul" +
        "?ll=" +
        encodeURIComponent(
          d.lat + "," + d.lng
        ) +
        "&navigate=yes"
      );
    }
  
  
    /* =========================================================
       URL APPLE MAPS
       ========================================================= */
  
    function appleMapsUrl(destination) {
  
      const d =
        normalizeDestination(
          destination
        );
  
      if (!d) {
        return null;
      }
  
      return (
        "https://maps.apple.com/" +
        "?daddr=" +
        encodeURIComponent(
          d.lat + "," + d.lng
        ) +
        "&dirflg=d"
      );
    }
  
  
    /* =========================================================
       APERTURA NAVIGATORE
       ========================================================= */
  
    function openGoogleMaps(
      destination
    ) {
  
      const url =
        googleMapsUrl(
          destination
        );
  
      if (!url) {
        return false;
      }
  
      window.location.href =
        url;
  
      return true;
    }
  
  
    function openWaze(
      destination
    ) {
  
      const d =
        normalizeDestination(
          destination
        );
  
      if (!d) {
        return false;
      }
  
      /*
        Prima proviamo il link Waze
        standard.
  
        Su smartphone Waze può
        intercettare automaticamente
        l'URL e aprire l'app.
      */
  
      const appUrl =
        "waze://?ll=" +
        encodeURIComponent(
          d.lat + "," + d.lng
        ) +
        "&navigate=yes";
  
      const webUrl =
        wazeUrl(
          d
        );
  
      let appOpened = false;
  
      function fallback() {
  
        if (!appOpened) {
  
          window.location.href =
            webUrl;
        }
      }
  
      try {
  
        window.location.href =
          appUrl;
  
        appOpened = true;
  
        setTimeout(
          fallback,
          1200
        );
  
      } catch (error) {
  
        window.location.href =
          webUrl;
      }
  
      return true;
    }
  
  
    function openAppleMaps(
      destination
    ) {
  
      const url =
        appleMapsUrl(
          destination
        );
  
      if (!url) {
        return false;
      }
  
      window.location.href =
        url;
  
      return true;
    }
  
  
    /* =========================================================
       APERTURA GENERICA
       ========================================================= */
  
    function open(
      navigatorName,
      destination
    ) {
  
      switch (
        String(
          navigatorName
        ).toLowerCase()
      ) {
  
        case "google":
  
        case "google maps":
  
          return openGoogleMaps(
            destination
          );
  
  
        case "waze":
  
          return openWaze(
            destination
          );
  
  
        case "apple":
  
        case "apple maps":
  
        case "mappe apple":
  
        case "mappe":
  
          return openAppleMaps(
            destination
          );
  
  
        default:
  
          console.error(
            "Navigatore non riconosciuto:",
            navigatorName
          );
  
          return false;
      }
    }
  
  
    /* =========================================================
       DATI PER LA SCHERMATA DI SCELTA
       ========================================================= */
  
    function getNavigators() {
  
      return [
  
        {
          id:
            "google",
  
          name:
            "Google Maps",
  
          logo:
            "assets/google-maps.png"
        },
  
        {
          id:
            "waze",
  
          name:
            "Waze",
  
          logo:
            "assets/waze.png"
        },
  
        {
          id:
            "apple",
  
          name:
            "Mappe Apple",
  
          logo:
            "assets/apple-maps.png"
        }
  
      ];
    }
  
  
    /* =========================================================
       API PUBBLICA
       ========================================================= */
  
    const api = {
  
      validCoordinates:
        validCoordinates,
  
      normalizeDestination:
        normalizeDestination,
  
      googleMapsUrl:
        googleMapsUrl,
  
      wazeUrl:
        wazeUrl,
  
      appleMapsUrl:
        appleMapsUrl,
  
      openGoogleMaps:
        openGoogleMaps,
  
      openWaze:
        openWaze,
  
      openAppleMaps:
        openAppleMaps,
  
      open:
        open,
  
      getNavigators:
        getNavigators
  
    };
  
  
    window.Navigazione =
      api;
  
  
    console.log(
      "Navigazione caricata."
    );
  
  })();