// =====================================================
// 1 KM E SI MANGIA
// MODULO FUTURO - FUNZIONI APP
// =====================================================
// NON COLLEGARE ANCORA A index.html/script.js.
// Questo modulo verrà integrato dopo il completamento
// di ristoranti.json.
// =====================================================

const APP_CONFIG = {
  distanzaMassimaRistoranteM: 2100,
  sogliaUnKmM: 1000,
  parcheggioMassimoM: 150,
  defaultLunghezzaM: 16.50,
  defaultLarghezzaM: 2.55,
  defaultAltezzaM: 2.80,
  defaultPesoKg: 3500,
  risultatiIniziali: 5
};

// -----------------------------------------------------
// DISTANZA
// -----------------------------------------------------
function distanzaMetri(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) *
    Math.cos(lat2 * rad) *
    Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// -----------------------------------------------------
// CATEGORIA DISTANZA
// La tolleranza di 100 m serve al filtro, non crea
// una categoria grafica separata.
// -----------------------------------------------------
function categoriaDistanza(metri) {
  if (metri <= APP_CONFIG.sogliaUnKmM) return "1km";
  if (metri <= APP_CONFIG.distanzaMassimaRistoranteM) return "2km";
  return "nessuno";
}

// -----------------------------------------------------
// FILTRO RISTORANTI
// -----------------------------------------------------
function ristorantiValidi(ristoranti, uscita) {
  if (!Array.isArray(ristoranti) || !uscita) return [];

  return ristoranti
    .map((ristorante) => {
      const distanza = distanzaMetri(
        uscita.lat,
        uscita.lon,
        ristorante.lat,
        ristorante.lon
      );

      return {
        ...ristorante,
        distanza_uscita_m: Math.round(distanza),
        categoria_distanza: categoriaDistanza(distanza)
      };
    })
    .filter((r) => r.distanza_uscita_m <= APP_CONFIG.distanzaMassimaRistoranteM);
}

// -----------------------------------------------------
// PARCHEGGIO
// 0-50 m: molto vicino
// 51-150 m: vicino
// >150 m: non associato
// -----------------------------------------------------
function classificaParcheggio(distanzaM) {
  if (typeof distanzaM !== "number" || distanzaM > APP_CONFIG.parcheggioMassimoM) {
    return "nessuno_associato";
  }

  if (distanzaM <= 50) return "molto_vicino";
  return "vicino";
}

// -----------------------------------------------------
// PRIORITÀ UTENTE
// -----------------------------------------------------
function ordinaRistoranti(ristoranti, priorita = "distanza") {
  const lista = [...ristoranti];

  const valoreDistanza = (r) => r.distanza_uscita_m ?? Infinity;
  const valoreParcheggio = (r) => {
    if (r.parcheggio?.presente !== true) return Infinity;
    return r.parcheggio.distanza_m ?? Infinity;
  };

  if (priorita === "parcheggio") {
    return lista.sort((a, b) => valoreParcheggio(a) - valoreParcheggio(b));
  }

  if (priorita === "mezzo") {
    const pesoCompatibilita = (r) => {
      const stato = r.mezzi_voluminosi?.stato;
      if (stato === "compatibile") return 0;
      if (stato === "dati_osm") return 1;
      if (stato === "da_verificare") return 2;
      return 3;
    };

    return lista.sort((a, b) => {
      const differenza = pesoCompatibilita(a) - pesoCompatibilita(b);
      return differenza || valoreDistanza(a) - valoreDistanza(b);
    });
  }

  return lista.sort((a, b) => valoreDistanza(a) - valoreDistanza(b));
}

// -----------------------------------------------------
// RISULTATI INIZIALI
// -----------------------------------------------------
function primiRisultati(ristoranti, numero = APP_CONFIG.risultatiIniziali) {
  return ristoranti.slice(0, numero);
}

// -----------------------------------------------------
// PROFILO MEZZO
// Salvato localmente sul dispositivo.
// -----------------------------------------------------
const MEZZO_STORAGE_KEY = "1km-esimangia-mezzo";

function salvaProfiloMezzo(lunghezzaM, larghezzaM, altezzaM, pesoKg) {
  const profilo = {
    lunghezzaM: Number(lunghezzaM),
    larghezzaM: Number(larghezzaM),
    altezzaM: Number(altezzaM),
    pesoKg: Number(pesoKg)
  };

  if (
    !Number.isFinite(profilo.lunghezzaM) ||
    !Number.isFinite(profilo.larghezzaM) ||
    !Number.isFinite(profilo.altezzaM) ||
    !Number.isFinite(profilo.pesoKg)
  ) {
    throw new Error("Dimensioni o peso non validi.");
  }

  localStorage.setItem(MEZZO_STORAGE_KEY, JSON.stringify(profilo));
  return profilo;
}

function caricaProfiloMezzo() {
  try {
    const dati = JSON.parse(localStorage.getItem(MEZZO_STORAGE_KEY));

    if (dati) {
      return {
        lunghezzaM: Number.isFinite(Number(dati.lunghezzaM)) ? Number(dati.lunghezzaM) : APP_CONFIG.defaultLunghezzaM,
        larghezzaM: Number.isFinite(Number(dati.larghezzaM)) ? Number(dati.larghezzaM) : APP_CONFIG.defaultLarghezzaM,
        altezzaM: Number.isFinite(Number(dati.altezzaM)) ? Number(dati.altezzaM) : APP_CONFIG.defaultAltezzaM,
        pesoKg: Number.isFinite(Number(dati.pesoKg)) ? Number(dati.pesoKg) : APP_CONFIG.defaultPesoKg
      };
    }
  } catch (_) {}

  return {
    lunghezzaM: APP_CONFIG.defaultLunghezzaM,
    larghezzaM: APP_CONFIG.defaultLarghezzaM,
    altezzaM: APP_CONFIG.defaultAltezzaM,
    pesoKg: APP_CONFIG.defaultPesoKg
  };
}

// -----------------------------------------------------
// CONTROLLO RESTRIZIONI OSM
// Non dichiara sicurezza assoluta se mancano dati.
// -----------------------------------------------------
function verificaRestrizioni(altezzaM, pesoKg, restrizioni = {}) {
  const problemi = [];
  let datiInsufficienti = false;

  const maxHeight = parseFloat(restrizioni.maxheight);
  const maxWeight = parseFloat(restrizioni.maxweight);

  if (Number.isFinite(maxHeight)) {
    if (altezzaM > maxHeight) {
      problemi.push("altezza");
    }
  } else {
    datiInsufficienti = true;
  }

  if (Number.isFinite(maxWeight)) {
    // OSM può usare tonnellate in alcuni contesti di dato; il formato
    // effettivo verrà normalizzato nel modulo di importazione.
    if (pesoKg / 1000 > maxWeight) {
      problemi.push("peso");
    }
  } else {
    datiInsufficienti = true;
  }

  if (problemi.length) {
    return { stato: "non_compatibile", problemi };
  }

  if (datiInsufficienti) {
    return { stato: "da_verificare", problemi: [] };
  }

  return { stato: "compatibile", problemi: [] };
}

// -----------------------------------------------------
// DATI PER NAVIGAZIONE
// La destinazione di ritorno è sempre l'uscita associata.
// -----------------------------------------------------
function creaNavigazione(ristorante, uscita) {
  if (!ristorante || !uscita) return null;

  return {
    andata: {
      da: {
        lat: uscita.lat,
        lon: uscita.lon,
        nome: uscita.nome || "Uscita autostradale"
      },
      a: {
        lat: ristorante.lat,
        lon: ristorante.lon,
        nome: ristorante.nome || "Ristorante"
      }
    },
    ritorno: {
      da: {
        lat: ristorante.lat,
        lon: ristorante.lon,
        nome: ristorante.nome || "Ristorante"
      },
      a: {
        lat: uscita.lat,
        lon: uscita.lon,
        nome: uscita.nome || "Uscita autostradale"
      }
    }
  };
}

// -----------------------------------------------------
// API PUBBLICA DEL MODULO
// -----------------------------------------------------
window.KmSiMangiaApp = {
  config: APP_CONFIG,
  distanzaMetri,
  categoriaDistanza,
  ristorantiValidi,
  classificaParcheggio,
  ordinaRistoranti,
  primiRisultati,
  salvaProfiloMezzo,
  caricaProfiloMezzo,
  verificaRestrizioni,
  creaNavigazione
};
