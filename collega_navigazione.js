// =====================================================
// 1 KM E SI MANGIA
// COLLEGAMENTO NAVIGAZIONE
// =====================================================
//
// Collega i ristoranti mostrati nel pannello
// "MOSTRA TUTTI" al modulo navigazione.js.
//
// NON modifica script.js.
// =====================================================


let databaseNavigazione = [];


// =====================================================
// CARICA RISTORANTI
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

    databaseNavigazione = database;

    console.log(
      "NAVIGAZIONE: database caricato:",
      databaseNavigazione.length
    );

    avviaControlloRistoranti();

  })

  .catch(function(error) {

    console.error(
      "NAVIGAZIONE: errore caricamento database",
      error
    );

  });


// =====================================================
// TROVA RISTORANTE PER NOME
// =====================================================

function trovaRistorante(
  nome
) {

  if (!nome) {

    return null;

  }


  const nomePulito =
    String(nome)
      .trim()
      .toLowerCase();


  // Corrispondenza esatta

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


  // Corrispondenza parziale

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

function creaBottoneNaviga(
  ristorante
) {

  const bottone =
    document.createElement(
      "button"
    );


  bottone.type =
    "button";


  bottone.className =
    "bottone-naviga-1km";


  bottone.textContent =
    "🧭 NAVIGA";


  bottone.style.cssText = `

    display:block;

    width:100%;

    margin-top:10px;

    padding:10px 14px;

    border:0;

    border-radius:10px;

    background:#075c3b;

    color:white;

    font-size:14px;

    font-weight:800;

    cursor:pointer;

  `;


  bottone.addEventListener(
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


  return bottone;

}


// =====================================================
// CERCA LE SCHEDE DEI RISTORANTI
// =====================================================

function cercaSchedeRistoranti() {

  if (
    !databaseNavigazione.length
  ) {

    return;

  }


  /*
   * Cerchiamo gli elementi che contengono
   * "dall'uscita".
   *
   * Nella finestra MOSTRA TUTTI ogni ristorante
   * contiene questa informazione.
   */

  const elementi =
    Array.from(
      document.querySelectorAll(
        "div"
      )
    );


  elementi.forEach(
    function(elemento) {

      const testo =
        elemento.textContent
          ?.trim() || "";


      if (!testo) {

        return;

      }


      if (
        !testo.includes(
          "dall'uscita"
        )
      ) {

        return;

      }


      /*
       * Evitiamo di prendere contenitori
       * troppo grandi che comprendono
       * più ristoranti.
       */

      const figliDiv =
        elemento.querySelectorAll(
          ":scope > div"
        );


      if (
        figliDiv.length > 8
      ) {

        return;

      }


      /*
       * Cerchiamo il titolo del ristorante.
       */

      let titolo =
        elemento.querySelector(
          "strong"
        );


      if (!titolo) {

        titolo =
          elemento.querySelector(
            "b"
          );

      }


      if (!titolo) {

        return;

      }


      const nome =
        titolo.textContent
          .trim()
          .replace(
            /^\d+\.\s*/,
            ""
          );


      if (!nome) {

        return;

      }


      /*
       * Se il pulsante esiste già,
       * non facciamo nulla.
       */

      if (
        elemento.querySelector(
          ".bottone-naviga-1km"
        )
      ) {

        return;

      }


      /*
       * Cerchiamo il ristorante
       * nel database.
       */

      const ristorante =
        trovaRistorante(
          nome
        );


      if (!ristorante) {

        console.warn(
          "NAVIGAZIONE: ristorante non trovato:",
          nome
        );

        return;

      }


      const lat =
        Number(
          ristorante.lat
        );


      const lon =
        Number(
          ristorante.lon
        );


      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon)
      ) {

        console.warn(
          "NAVIGAZIONE: coordinate mancanti:",
          nome
        );

        return;

      }


      /*
       * Aggiungiamo il pulsante
       * direttamente nella scheda.
       */

      const bottone =
        creaBottoneNaviga(
          ristorante
        );


      elemento.appendChild(
        bottone
      );


      console.log(
        "NAVIGA aggiunto:",
        nome
      );

    }
  );

}


// =====================================================
// CONTROLLO AUTOMATICO
// =====================================================

let controlloNavigazione = null;


function avviaControlloRistoranti() {

  if (
    controlloNavigazione
  ) {

    return;

  }


  /*
   * Il pannello MOSTRA TUTTI viene creato
   * dinamicamente da script.js.
   *
   * Controlliamo quindi periodicamente
   * se sono apparse nuove schede.
   */

  controlloNavigazione =
    setInterval(
      function() {

        cercaSchedeRistoranti();

      },
      500
    );


  /*
   * Primo controllo immediato.
   */

  cercaSchedeRistoranti();

}


// =====================================================
// MUTATION OBSERVER
// =====================================================
//
// In aggiunta al controllo periodico,
// osserviamo le modifiche della pagina.
// =====================================================

if (
  document.body
) {

  const observer =
    new MutationObserver(
      function() {

        cercaSchedeRistoranti();

      }
    );


  observer.observe(
    document.body,
    {
      childList:true,
      subtree:true
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
  "In attesa delle schede ristorante..."
);

console.log(
  "================================="
);