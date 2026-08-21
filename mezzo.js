(function () {
  "use strict";

  const STORAGE_KEY = "1km-esimangia-mezzo";
  const DEFAULTS = {
    lunghezzaM: 16.50,
    larghezzaM: 2.55,
    altezzaM: 2.80,
    pesoKg: 3500
  };

  const fields = {
    lunghezzaM: document.getElementById("lunghezza"),
    larghezzaM: document.getElementById("larghezza"),
    altezzaM: document.getElementById("altezza"),
    pesoKg: document.getElementById("peso")
  };

  const status = document.getElementById("statusMezzo");

  function numero(value) {
    return Number(String(value).replace(",", "."));
  }

  function mostraStatus(testo, errore) {
    status.textContent = testo;
    status.style.display = "block";
    status.style.borderLeftColor = errore ? "#c83b32" : "#f2a51a";
  }

  function carica() {
    let dati = null;
    try {
      dati = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (_) {}

    const profilo = {
      lunghezzaM: Number.isFinite(numero(dati?.lunghezzaM)) ? numero(dati.lunghezzaM) : DEFAULTS.lunghezzaM,
      larghezzaM: Number.isFinite(numero(dati?.larghezzaM)) ? numero(dati.larghezzaM) : DEFAULTS.larghezzaM,
      altezzaM: Number.isFinite(numero(dati?.altezzaM)) ? numero(dati.altezzaM) : DEFAULTS.altezzaM,
      pesoKg: Number.isFinite(numero(dati?.pesoKg)) ? numero(dati.pesoKg) : DEFAULTS.pesoKg
    };

    fields.lunghezzaM.value = profilo.lunghezzaM;
    fields.larghezzaM.value = profilo.larghezzaM;
    fields.altezzaM.value = profilo.altezzaM;
    fields.pesoKg.value = profilo.pesoKg;
  }

  function salva() {
    const profilo = {
      lunghezzaM: numero(fields.lunghezzaM.value),
      larghezzaM: numero(fields.larghezzaM.value),
      altezzaM: numero(fields.altezzaM.value),
      pesoKg: numero(fields.pesoKg.value)
    };

    if (!Number.isFinite(profilo.lunghezzaM) || profilo.lunghezzaM <= 0 || profilo.lunghezzaM > 30 ||
        !Number.isFinite(profilo.larghezzaM) || profilo.larghezzaM <= 0 || profilo.larghezzaM > 5 ||
        !Number.isFinite(profilo.altezzaM) || profilo.altezzaM <= 0 || profilo.altezzaM > 6 ||
        !Number.isFinite(profilo.pesoKg) || profilo.pesoKg <= 0 || profilo.pesoKg > 100000) {
      mostraStatus("Controlla i valori inseriti: devono essere numerici e realistici.", true);
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(profilo));
    mostraStatus("✓ Profilo mezzo salvato su questo dispositivo. Ora il servizio può utilizzare queste dimensioni per i controlli di compatibilità.", false);
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    carica();
    mostraStatus("Dati standard ripristinati.", false);
  }

  document.getElementById("saveMezzo").addEventListener("click", salva);
  document.getElementById("resetMezzo").addEventListener("click", reset);
  carica();
})();
