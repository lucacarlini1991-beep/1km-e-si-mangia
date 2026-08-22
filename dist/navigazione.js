// =====================================================
// 1 KM E SI MANGIA
// MODULO NAVIGAZIONE
// =====================================================
//
// Google Maps = coordinate
// Waze       = coordinate
// Apple Maps = coordinate
//
// IMPORTANTE:
// la posizione reale del ristorante viene determinata
// esclusivamente da latitudine e longitudine.
// =====================================================


// =====================================================
// STILI
// =====================================================

(function creaStiliNavigazione() {

  if (
    document.getElementById(
      "stili-navigazione-1km"
    )
  ) {
    return;
  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "stili-navigazione-1km";


  style.textContent = `

    .navigazione-overlay-1km {

      position:fixed;

      inset:0;

      z-index:999999;

      display:flex;

      align-items:center;

      justify-content:center;

      padding:20px;

      background:rgba(0,0,0,.55);

      box-sizing:border-box;

    }


    .navigazione-box-1km {

      width:min(440px,100%);

      max-height:90vh;

      overflow:auto;

      background:#fff;

      border-radius:22px;

      box-shadow:
        0 20px 60px
        rgba(0,0,0,.30);

      padding:20px;

      box-sizing:border-box;

      font-family:
        Arial,
        Helvetica,
        sans-serif;

    }


    .navigazione-header-1km {

      display:flex;

      align-items:center;

      justify-content:space-between;

      gap:12px;

      margin-bottom:16px;

    }


    .navigazione-titolo-1km {

      margin:0;

      color:#075c3b;

      font-size:21px;

      font-weight:800;

    }


    .navigazione-sottotitolo-1km {

      margin:4px 0 0;

      color:#666;

      font-size:14px;

    }


    .navigazione-chiudi-1km {

      width:38px;

      height:38px;

      border:0;

      border-radius:50%;

      background:#f0f0f0;

      color:#222;

      font-size:20px;

      font-weight:700;

      cursor:pointer;

      flex-shrink:0;

    }


    .navigazione-opzione-1km {

      width:100%;

      display:flex;

      align-items:center;

      gap:14px;

      margin-top:10px;

      padding:14px;

      border:1px solid #e1e1e1;

      border-radius:15px;

      background:#fff;

      text-align:left;

      cursor:pointer;

      transition:
        transform .12s ease,
        background .12s ease,
        box-shadow .12s ease;

      box-sizing:border-box;

    }


    .navigazione-opzione-1km:hover {

      background:#f7f7f7;

      transform:translateY(-1px);

      box-shadow:
        0 4px 14px
        rgba(0,0,0,.08);

    }


    .navigazione-icona-1km {

      width:48px;

      height:48px;

      min-width:48px;

      display:flex;

      align-items:center;

      justify-content:center;

      border-radius:12px;

      background:#f3f3f3;

      overflow:hidden;

    }


    .navigazione-icona-1km img {

      width:38px;

      height:38px;

      object-fit:contain;

      display:block;

    }


    .navigazione-icona-neutra-1km {

      font-size:27px;

      line-height:1;

    }


    .navigazione-testo-1km {

      min-width:0;

      flex:1;

    }


    .navigazione-nome-1km {

      display:block;

      color:#222;

      font-size:16px;

      font-weight:800;

      line-height:1.2;

    }


    .navigazione-descrizione-1km {

      display:block;

      margin-top:4px;

      color:#777;

      font-size:13px;

      line-height:1.25;

    }


    .navigazione-annulla-1km {

      width:100%;

      margin-top:14px;

      padding:12px;

      border:0;

      border-radius:12px;

      background:#eeeeee;

      color:#222;

      font-size:14px;

      font-weight:700;

      cursor:pointer;

    }


    @media (max-width:480px) {

      .navigazione-overlay-1km {

        padding:12px;

      }


      .navigazione-box-1km {

        border-radius:18px;

        padding:16px;

      }


      .navigazione-opzione-1km {

        padding:12px;

      }

    }

  `;


  document.head.appendChild(
    style
  );

})();


// =====================================================
// COORDINATE
// =====================================================

function coordinateNavigazione(
  ristorante
) {

  if (!ristorante) {

    return null;

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
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {

    console.error(
      "NAVIGAZIONE: coordinate non valide",
      ristorante
    );

    return null;

  }


  return {
    lat,
    lon
  };

}


// =====================================================
// GOOGLE MAPS
// =====================================================
//
// DESTINAZIONE = SOLO COORDINATE
// =====================================================

function apriGoogleMaps(
  ristorante
) {

  const coordinate =
    coordinateNavigazione(
      ristorante
    );


  if (!coordinate) {

    return;

  }


  const url =
    "https://www.google.com/maps/dir/?api=1" +

    "&destination=" +

    encodeURIComponent(
      coordinate.lat +
      "," +
      coordinate.lon
    ) +

    "&travelmode=driving";


  console.log(
    "NAVIGAZIONE GOOGLE:",
    url
  );


  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );

}


// =====================================================
// WAZE
// =====================================================
//
// DESTINAZIONE = SOLO LAT/LON
// =====================================================

function apriWaze(
  ristorante
) {

  const coordinate =
    coordinateNavigazione(
      ristorante
    );


  if (!coordinate) {

    return;

  }


  const url =
    "https://waze.com/ul" +

    "?ll=" +

    encodeURIComponent(
      coordinate.lat +
      "," +
      coordinate.lon
    ) +

    "&navigate=yes" +

    "&zoom=17";


  console.log(
    "NAVIGAZIONE WAZE:",
    url
  );


  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );

}


// =====================================================
// APPLE MAPS
// =====================================================
//
// IMPORTANTISSIMO:
//
// NON usiamo:
// q=nome ristorante
//
// perché q è una ricerca.
//
// Usiamo invece:
//
// /directions
// destination=LAT,LON
// mode=driving
//
// In questo modo Apple riceve direttamente
// il punto geografico.
// =====================================================

function apriAppleMaps(
  ristorante
) {

  const coordinate =
    coordinateNavigazione(
      ristorante
    );


  if (!coordinate) {

    return;

  }


  // =================================================
  // APPLE MAPS
  // =================================================
  //
  // Usiamo il formato Apple Maps classico:
  //
  // https://maps.apple.com/?daddr=LAT,LON&dirflg=d
  //
  // NON passiamo il nome del ristorante.
  // In questo modo Apple non deve effettuare
  // una ricerca testuale che potrebbe portare
  // a un'attività diversa o all'Outlet.
  //
  // La destinazione è esclusivamente il punto
  // geografico del ristorante.
  // =================================================

  const destinazione =
    coordinate.lat +
    "," +
    coordinate.lon;


  const url =
    "https://maps.apple.com/" +
    "?daddr=" +
    encodeURIComponent(
      destinazione
    ) +
    "&dirflg=d";


  console.log(
    "NAVIGAZIONE APPLE:",
    url
  );


  // Su iPhone/iPad/macOS il link maps.apple.com
  // viene gestito dal sistema e può aprire
  // direttamente Apple Maps.
  //
  // Su altri dispositivi verrà aperta la versione
  // web di Apple Maps.

  window.location.href =
    url;

}


// =====================================================
// ICONA GOOGLE MAPS
// =====================================================

function creaIconaGoogleMaps() {

  const contenitore =
    document.createElement(
      "div"
    );


  contenitore.className =
    "navigazione-icona-1km";


  const immagine =
    document.createElement(
      "img"
    );


  immagine.src =
    "assets/google-maps.svg";


  immagine.alt =
    "Google Maps";


  immagine.onerror =
    function() {

      immagine.remove();


      const fallback =
        document.createElement(
          "span"
        );


      fallback.className =
        "navigazione-icona-neutra-1km";


      fallback.textContent =
        "🗺️";


      contenitore.appendChild(
        fallback
      );

    };


  contenitore.appendChild(
    immagine
  );


  return contenitore;

}


// =====================================================
// ICONE SVG DA ASSETS
// =====================================================

function creaIconaSVG(
  percorso,
  alt,
  fallback
) {

  const contenitore =
    document.createElement(
      "div"
    );

  contenitore.className =
    "navigazione-icona-1km";

  const immagine =
    document.createElement(
      "img"
    );

  immagine.src =
    percorso;

  immagine.alt =
    alt;

  immagine.loading =
    "eager";

  immagine.decoding =
    "async";

  immagine.onerror =
    function() {

      immagine.remove();

      const fallbackElement =
        document.createElement(
          "span"
        );

      fallbackElement.className =
        "navigazione-icona-neutra-1km";

      fallbackElement.textContent =
        fallback;

      contenitore.appendChild(
        fallbackElement
      );

    };

  contenitore.appendChild(
    immagine
  );

  return contenitore;
}


function creaIconaWaze() {

  return creaIconaSVG(
    "assets/waze.svg",
    "Waze",
    "🚗"
  );
}


function creaIconaAppleMaps() {

  return creaIconaSVG(
    "assets/apple-maps.svg",
    "Apple Maps",
    "🧭"
  );
}


function creaIconaNeutra(emoji) {

  const contenitore = document.createElement("div");
  contenitore.className = "navigazione-icona-1km";

  const span = document.createElement("span");
  span.className = "navigazione-icona-neutra-1km";
  span.textContent = emoji;
  contenitore.appendChild(span);

  return contenitore;
}


// =====================================================
// CREA OPZIONE
// =====================================================

function creaOpzioneNavigazione(
  nome,
  descrizione,
  icona,
  funzione
) {

  const bottone =
    document.createElement(
      "button"
    );


  bottone.type =
    "button";


  bottone.className =
    "navigazione-opzione-1km";


  bottone.appendChild(
    icona
  );


  const testo =
    document.createElement(
      "div"
    );


  testo.className =
    "navigazione-testo-1km";


  const titolo =
    document.createElement(
      "span"
    );


  titolo.className =
    "navigazione-nome-1km";


  titolo.textContent =
    nome;


  const sotto =
    document.createElement(
      "span"
    );


  sotto.className =
    "navigazione-descrizione-1km";


  sotto.textContent =
    descrizione;


  testo.appendChild(
    titolo
  );


  testo.appendChild(
    sotto
  );


  bottone.appendChild(
    testo
  );


  bottone.addEventListener(
    "click",
    function(event) {

      event.preventDefault();

      event.stopPropagation();


      funzione();


      chiudiNavigazione();

    }
  );


  return bottone;

}


// =====================================================
// CHIUDI
// =====================================================

function chiudiNavigazione() {

  const overlay =
    document.getElementById(
      "navigazione-overlay-1km"
    );


  if (overlay) {

    overlay.remove();

  }


  document.body.style.overflow =
    "";

}


// =====================================================
// APRI PANNELLO
// =====================================================

function apriNavigazione(
  ristorante
) {

  const coordinate =
    coordinateNavigazione(
      ristorante
    );


  if (!coordinate) {

    alert(
      "Coordinate del ristorante non disponibili."
    );

    return;

  }


  chiudiNavigazione();


  const overlay =
    document.createElement(
      "div"
    );


  overlay.id =
    "navigazione-overlay-1km";


  overlay.className =
    "navigazione-overlay-1km";


  overlay.addEventListener(
    "click",
    function(event) {

      if (
        event.target ===
        overlay
      ) {

        chiudiNavigazione();

      }

    }
  );


  const box =
    document.createElement(
      "div"
    );


  box.className =
    "navigazione-box-1km";


  box.addEventListener(
    "click",
    function(event) {

      event.stopPropagation();

    }
  );


  // ---------------------------------------------------
  // HEADER
  // ---------------------------------------------------

  const header =
    document.createElement(
      "div"
    );


  header.className =
    "navigazione-header-1km";


  const testoHeader =
    document.createElement(
      "div"
    );


  const titolo =
    document.createElement(
      "h2"
    );


  titolo.className =
    "navigazione-titolo-1km";


  titolo.textContent =
    "COME VUOI NAVIGARE?";


  const sottotitolo =
    document.createElement(
      "p"
    );


  sottotitolo.className =
    "navigazione-sottotitolo-1km";


  sottotitolo.textContent =
    String(
      ristorante.nome ||
      "Ristorante"
    );


  testoHeader.appendChild(
    titolo
  );


  testoHeader.appendChild(
    sottotitolo
  );


  const chiudi =
    document.createElement(
      "button"
    );


  chiudi.type =
    "button";


  chiudi.className =
    "navigazione-chiudi-1km";


  chiudi.textContent =
    "×";


  chiudi.addEventListener(
    "click",
    chiudiNavigazione
  );


  header.appendChild(
    testoHeader
  );


  header.appendChild(
    chiudi
  );


  box.appendChild(
    header
  );


  // ---------------------------------------------------
  // GOOGLE MAPS
  // ---------------------------------------------------

  box.appendChild(

    creaOpzioneNavigazione(

      "Google Maps",

      "Avvia indicazioni stradali",

      creaIconaGoogleMaps(),

      function() {

        apriGoogleMaps(
          ristorante
        );

      }

    )

  );


  // ---------------------------------------------------
  // WAZE
  // ---------------------------------------------------

  box.appendChild(

    creaOpzioneNavigazione(

      "Waze",

      "Apri Waze e naviga",

      creaIconaWaze(),

      function() {

        apriWaze(
          ristorante
        );

      }

    )

  );


  // ---------------------------------------------------
  // APPLE MAPS
  // ---------------------------------------------------

  box.appendChild(

    creaOpzioneNavigazione(

      "Apple Maps",

      "Apri Mappe e naviga",

      creaIconaAppleMaps(),

      function() {

        apriAppleMaps(
          ristorante
        );

      }

    )

  );


  // ---------------------------------------------------
  // NAVIGAZIONE MEZZO PESANTE
  // ---------------------------------------------------

  if (window.CamionNavigazione && typeof window.CamionNavigazione.naviga === "function") {

    box.appendChild(

      creaOpzioneNavigazione(

        "🚛 Mezzo pesante",

        "Percorso calcolato con le dimensioni del tuo mezzo",

        creaIconaNeutra("🚛"),

        function() {

          chiudiNavigazione();
          window.CamionNavigazione.naviga(ristorante);

        }

      )

    );

  }


  // ---------------------------------------------------
  // ANNULLA
  // ---------------------------------------------------

  const annulla =
    document.createElement(
      "button"
    );


  annulla.type =
    "button";


  annulla.className =
    "navigazione-annulla-1km";


  annulla.textContent =
    "ANNULLA";


  annulla.addEventListener(
    "click",
    chiudiNavigazione
  );


  box.appendChild(
    annulla
  );


  overlay.appendChild(
    box
  );


  document.body.appendChild(
    overlay
  );


  document.body.style.overflow =
    "hidden";

}


// =====================================================
// FUNZIONI PUBBLICHE
// =====================================================

window.apriNavigazione =
  apriNavigazione;


window.chiudiNavigazione =
  chiudiNavigazione;


// =====================================================
// AVVIO
// =====================================================

console.log(
  "=========================================="
);

console.log(
  "NAVIGAZIONE.JS ATTIVO"
);

console.log(
  "DESTINAZIONE: COORDINATE"
);

console.log(
  "Google Maps / Waze / Apple Maps"
);

console.log(
  "=========================================="
);