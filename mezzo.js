(function () {
  "use strict";

  // Profilo unico e condiviso da parcheggi + navigazione mezzi pesanti.
  const STORAGE_KEY = "1km_mezzo_pesante_v2";
  const DEFAULTS = {
    tipo: "Autoarticolato",
    lunghezza: 16.50,
    larghezza: 2.55,
    altezza: 4.00,
    peso: 40,
    rimorchio: true
  };

  const fields = {
    lunghezza: document.getElementById("lunghezza"),
    larghezza: document.getElementById("larghezza"),
    altezza: document.getElementById("altezza"),
    peso: document.getElementById("peso")
  };
  const status = document.getElementById("statusMezzo");

  function numero(value) {
    const n = Number(String(value ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  function mostraStatus(testo, errore) {
    if (!status) return;
    status.textContent = testo;
    status.style.display = "block";
    status.style.borderLeftColor = errore ? "#c83b32" : "#f2a51a";
  }

  function carica() {
    let dati = {};
    try {
      dati = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (_) {}

    const profilo = {
      ...DEFAULTS,
      ...dati
    };

    if (fields.lunghezza) fields.lunghezza.value = profilo.lunghezza;
    if (fields.larghezza) fields.larghezza.value = profilo.larghezza;
    if (fields.altezza) fields.altezza.value = profilo.altezza;
    if (fields.peso) fields.peso.value = profilo.peso;
  }

  function salva() {
    const profilo = {
      tipo: DEFAULTS.tipo,
      lunghezza: numero(fields.lunghezza?.value),
      larghezza: numero(fields.larghezza?.value),
      altezza: numero(fields.altezza?.value),
      peso: numero(fields.peso?.value),
      rimorchio: true
    };

    if (
      !Number.isFinite(profilo.lunghezza) || profilo.lunghezza <= 0 || profilo.lunghezza > 30 ||
      !Number.isFinite(profilo.larghezza) || profilo.larghezza <= 0 || profilo.larghezza > 5 ||
      !Number.isFinite(profilo.altezza) || profilo.altezza <= 0 || profilo.altezza > 6 ||
      !Number.isFinite(profilo.peso) || profilo.peso <= 0 || profilo.peso > 100
    ) {
      mostraStatus("Controlla i valori inseriti: devono essere numerici e realistici.", true);
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(profilo));

    // Manteniamo anche il vecchio formato compatibile con eventuali moduli già pubblicati.
    localStorage.setItem("1km-esimangia-mezzo", JSON.stringify({
      lunghezzaM: profilo.lunghezza,
      larghezzaM: profilo.larghezza,
      altezzaM: profilo.altezza,
      pesoKg: profilo.peso * 1000
    }));

    window.dispatchEvent(new CustomEvent("1km-mezzo-updated", { detail: profilo }));
    mostraStatus("✓ Il tuo mezzo è stato salvato. Queste dimensioni verranno usate anche per la navigazione mezzi pesanti.", false);
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("1km-esimangia-mezzo");
    carica();
    mostraStatus("Dati standard ripristinati.", false);
  }

  document.getElementById("saveMezzo")?.addEventListener("click", salva);
  document.getElementById("resetMezzo")?.addEventListener("click", reset);
  carica();
})();
