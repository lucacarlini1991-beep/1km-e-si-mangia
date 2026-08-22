(function () {
  "use strict";

  const STORAGE_KEY = "1km-esimangia-mezzo";
  const PROFILE_KEY = "1km_mezzo_pesante_v2";
  const DEFAULTS = {
    lunghezzaM: 16.50,
    larghezzaM: 2.55,
    altezzaM: 4.00,
    pesoKg: 40000
  };

  const fields = {
    lunghezzaM: document.getElementById("lunghezza"),
    larghezzaM: document.getElementById("larghezza"),
    altezzaM: document.getElementById("altezza"),
    pesoKg: document.getElementById("peso")
  };

  const status = document.getElementById("statusMezzo");

  function numero(value) {
    return Number(String(value ?? "").replace(",", "."));
  }

  function mostraStatus(testo, errore) {
    if (!status) return;
    status.textContent = testo;
    status.style.display = "block";
    status.style.borderLeftColor = errore ? "#c83b32" : "#f2a51a";
  }

  function leggiProfiloSalvato() {
    try {
      const legacy = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (legacy && typeof legacy === "object") return legacy;
    } catch (_) {}

    try {
      const profilo = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
      if (profilo && typeof profilo === "object") {
        return {
          lunghezzaM: numero(profilo.lunghezza),
          larghezzaM: numero(profilo.larghezza),
          altezzaM: numero(profilo.altezza),
          pesoKg: numero(profilo.peso) * 1000
        };
      }
    } catch (_) {}

    return null;
  }

  function carica() {
    const dati = leggiProfiloSalvato() || {};
    const profilo = {
      lunghezzaM: Number.isFinite(numero(dati.lunghezzaM)) ? numero(dati.lunghezzaM) : DEFAULTS.lunghezzaM,
      larghezzaM: Number.isFinite(numero(dati.larghezzaM)) ? numero(dati.larghezzaM) : DEFAULTS.larghezzaM,
      altezzaM: Number.isFinite(numero(dati.altezzaM)) ? numero(dati.altezzaM) : DEFAULTS.altezzaM,
      pesoKg: Number.isFinite(numero(dati.pesoKg)) ? numero(dati.pesoKg) : DEFAULTS.pesoKg
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
      mostraStatus("⚠️ Controlla i valori inseriti: devono essere numerici e realistici.", true);
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profilo));
      localStorage.setItem(PROFILE_KEY, JSON.stringify({
        tipo: "Autoarticolato",
        lunghezza: profilo.lunghezzaM,
        larghezza: profilo.larghezzaM,
        altezza: profilo.altezzaM,
        peso: profilo.pesoKg / 1000,
        rimorchio: true
      }));
      window.dispatchEvent(new CustomEvent("1km-mezzo-updated", { detail: profilo }));
      mostraStatus("✓ PROFILO MEZZO SALVATO — le dimensioni sono memorizzate su questo dispositivo.", false);
    } catch (e) {
      console.error("Salvataggio mezzo:", e);
      mostraStatus("❌ Non riesco a salvare i dati su questo dispositivo.", true);
    }
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PROFILE_KEY);
    carica();
    mostraStatus("✓ Dati standard ripristinati.", false);
  }

  document.getElementById("saveMezzo")?.addEventListener("click", salva);
  document.getElementById("resetMezzo")?.addEventListener("click", reset);
  carica();
})();
