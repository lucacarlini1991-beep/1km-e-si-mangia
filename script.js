// =====================================================
// FILTRO USCITE
// ESCLUDE AREE DI SERVIZIO / AUTOGRILL
// =====================================================

(function () {

  console.log(
    "================================="
  );

  console.log(
    "FILTRO AREE DI SERVIZIO ATTIVATO"
  );

  console.log(
    "================================="
  );


  // ---------------------------------------------------
  // PAROLE CHE IDENTIFICANO UN'AREA DI SERVIZIO
  // ---------------------------------------------------

  const paroleAreaServizio = [

    "area di servizio",
    "area servizio",
    "area di sosta",
    "area sosta",
    "autogrill",
    "ristoro",
    "service area",
    "service station"

  ];


  // ---------------------------------------------------
  // FUNZIONE DI CONTROLLO
  // ---------------------------------------------------

  function eAreaDiServizio(marker) {

    if (!marker) {

      return false;

    }


    const popup =
      marker.getPopup();


    if (!popup) {

      return false;

    }


    const contenuto =
      popup.getContent();


    if (
      typeof contenuto !==
      "string"
    ) {

      return false;

    }


    const testo =
      contenuto
        .replace(/<[^>]*>/g, " ")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();


    return paroleAreaServizio.some(

      function (parola) {

        return testo.includes(
          parola
        );

      }

    );

  }


  // ---------------------------------------------------
  // RIMOZIONE DAL CLUSTER
  // ---------------------------------------------------

  function filtraAreeServizio() {

    if (
      typeof clusterUscite ===
      "undefined"
    ) {

      console.warn(
        "clusterUscite non disponibile."
      );

      return;

    }


    const daRimuovere = [];


    clusterUscite.eachLayer(

      function (marker) {

        if (
          eAreaDiServizio(marker)
        ) {

          daRimuovere.push(
            marker
          );

        }

      }

    );


    daRimuovere.forEach(

      function (marker) {

        clusterUscite.removeLayer(
          marker
        );

      }

    );


    console.log(
      "Aree di servizio rimosse:",
      daRimuovere.length
    );

  }


  // ---------------------------------------------------
  // ASPETTA CHE IL DATABASE SIA STATO CARICATO
  // ---------------------------------------------------

  let tentativi = 0;

  const intervallo =
    setInterval(

      function () {

        tentativi++;


        if (
          typeof clusterUscite !==
          "undefined" &&
          clusterUscite.getLayers().length > 0
        ) {

          filtraAreeServizio();

          clearInterval(
            intervallo
          );

          return;

        }


        if (
          tentativi >= 20
        ) {

          console.warn(
            "Filtro aree servizio: " +
            "database non trovato."
          );

          clearInterval(
            intervallo
          );

        }

      },

      500

    );

})();