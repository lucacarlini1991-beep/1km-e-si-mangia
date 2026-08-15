// =====================================================
// 1 KM E SI MANGIA
// COLLEGAMENTO NAVIGAZIONE
// =====================================================
//
// Collega le schede dei ristoranti alla funzione
// contenuta in navigazione.js.
//
// NON modifica script.js.
// =====================================================


let databaseNavigazione = [];


// =====================================================
// CARICA DATABASE
// =====================================================

fetch("./ristoranti.json")

  .then(function(response) {

    if (!response.ok) {

      throw new Error(
        "Impossibile caricare ristoranti.json"
      );

    }

    return response.json();

  })

  .then(function(database) {

    if (!Array.isArray(database)) {

      throw new Error(
        "ristoranti.json non contiene un array"
      );

    }

    databaseNavigazione =
      database;

    console.log(
      "COLLEGAMENTO NAVIGAZIONE: database caricato",
      databaseNavigazione.length
    );

    collegaPulsantiNavigazione();

  })

  .catch(function(error) {

    console.error(
      "COLLEGAMENTO NAVIGAZIONE:",
      error
    );

  });


// =====================================================
// SICUREZZA TESTO
// =====================================================

function escapeNavigazione(
  valore
) {

  return String(
    valore == null
      ? ""
      : valore
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


// =====================================================
// TROVA RISTORANTE
// =====================================================

function trovaRistoranteNavigazione(
  nome
) {

  const nomePulito =
    String(
      nome || ""
    )
      .trim()
      .toLowerCase();


  if (!nomePulito) {

    return null;

  }


  // ---------------------------------------------------
  // Prima ricerca: corrispondenza esatta
  // ---------------------------------------------------

  let risultato =
    databaseNavigazione.find(
      function(ristorante) {

        return String(
          ristorante.nome || ""
        )
          .trim()
          .toLowerCase() ===
          nomePulito;

      }
    );


  if (risultato) {

    return risultato;

  }


  // ---------------------------------------------------
  // Seconda ricerca: corrispondenza parziale
  // ---------------------------------------------------

  risultato =
    databaseNavigazione.find(
      function(ristorante) {

        const nomeDatabase =
          String(
            ristorante.nome || ""
          )
            .trim()
            .toLowerCase();


        return (

          nomeDatabase.includes(
            nomePulito
          ) ||

          nomePulito.includes(
            nomeDatabase
          )

        );

      }
    );


  return risultato || null;

}


// =====================================================
// CREA PULSANTE NAVIGA
// =====================================================

function creaPulsanteNavigazione(
  ristorante
) {

  const button =
    document.createElement(
      "button"
    );


  button.type =
    "button";


  button.className =
    "pulsante-navigazione-ristorante";


  button.innerHTML =
    "🧭 NAVIGA";


  button.style.cssText = `

    flex:1;

    border:0;

    border-radius:10px;

    background:#075c3b;

    color:#ffffff;

    padding:9px 10px;

    font-weight:700;

    cursor:pointer;

    min-width:90px;

  `;


  button.addEventListener(
    "click",
    function(event) {

      event.preventDefault();

      event.stopPropagation();


      if (
        typeof window.apriNavigazione !==
        "function"
      ) {

        alert(
          "Modulo di navigazione non disponibile."
        );

        return;

      }


      window.apriNavigazione(
        ristorante
      );

    }
  );


  return button;

}


// =====================================================
// AGGIUNGE NAVIGA ALLE SCHEDE
// =====================================================

function collegaPulsantiNavigazione() {

  const panel =
    document.getElementById(
      "ristorantiMapPanel"
    );


  if (!panel) {

    return;

  }


  const mapButtons =
    panel.querySelectorAll(
      "[data-ristorante-index]"
    );


  mapButtons.forEach(
    function(mapButton) {

      const card =
        mapButton.closest(
          "div[style*='border:1px solid']"
        );


      if (!card) {

        return;

      }


      if (
        card.querySelector(
          ".pulsante-navigazione-ristorante"
        )
      ) {

        return;

      }


      // ---------------------------------------------
      // Recupera il nome dalla scheda
      // ---------------------------------------------

      const titolo =
        card.querySelector(
          "strong"
        );


      if (!titolo) {

        return;

      }


      let nome =
        titolo.textContent
          .trim();


      // Rimuove "1. " / "2. " ecc.
      nome =
        nome.replace(
          /^\d+\.\s*/,
          ""
        );


      const ristorante =
        trovaRistoranteNavigazione(
          nome
        );


      if (!ristorante) {

        console.warn(
          "Navigazione: ristorante non trovato:",
          nome
        );

        return;

      }


      if (
        typeof ristorante.lat !== "number" ||
        typeof ristorante.lon !== "number"
      ) {

        console.warn(
          "Navigazione: coordinate mancanti:",
          nome
        );

        return;

      }


      // ---------------------------------------------
      // Crea contenitore pulsanti
      // ---------------------------------------------

      const contenitore =
        document.createElement(
          "div"
        );


      contenitore.style.cssText = `

        display:flex;

        gap:8px;

        margin-top:10px;

      `;


      // Spostiamo MAPPA dentro il contenitore
      mapButton.style.flex =
        "1";


      contenitore.appendChild(
        mapButton
      );


      contenitore.appendChild(
        creaPulsanteNavigazione(
          ristorante
        )
      );


      // Inseriamo il contenitore
      // nel punto originale del pulsante

      mapButton.parentNode
        ?.appendChild(
          contenitore
        );

    }
  );

}


// =====================================================
// OSSERVA LA CREAZIONE DEL PANNELLO
// =====================================================
//
// Il pannello viene creato dinamicamente da script.js.
// Per questo non possiamo cercarlo solamente al caricamento.
// =====================================================

const osservatoreNavigazione =
  new MutationObserver(
    function() {

      if (
        databaseNavigazione.length
      ) {

        collegaPulsantiNavigazione();

      }

    }
  );


if (
  document.body
) {

  osservatoreNavigazione.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );

}


// =====================================================
// AVVIO
// =====================================================

console.log(
  "================================="
);

console.log(
  "COLLEGA_NAVIGAZIONE.JS ATTIVO"
);

console.log(
  "NAVIGA pronto per Google / Waze / Apple"
);

console.log(
  "================================="
);