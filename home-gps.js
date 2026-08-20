(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {

    const button = document.getElementById("homeLocationButton");

    if (!button) {
      alert("ERRORE: pulsante HOME NON TROVATO");
      return;
    }

    button.addEventListener("click", function () {

      alert("IL TAP FUNZIONA");

    });

    console.log("HOME TEST: PULSANTE COLLEGATO");

  });

})();