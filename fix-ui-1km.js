/* 1 KM E SI MANGIA - fix UI
   Questo file gestisce SOLO il menu.
   Il caricamento e il filtro dei caselli sono gestiti da dist/script.js.
   Non deve modificare, rimuovere o ricreare i layer della mappa.
*/
(function () {
  "use strict";

  function sistemaMenu() {
    const button = document.getElementById("menuButton") || document.querySelector(".menu-button");
    const panel = document.getElementById("mobileMenu") || document.querySelector(".mobile-menu") || document.getElementById("menuOverlay") || document.querySelector(".menu-overlay");
    const close = document.getElementById("menuClose") || document.querySelector(".menu-close");

    if (!button || !panel || button.dataset.menuFix === "1") return;
    button.dataset.menuFix = "1";

    function chiudi() {
      panel.classList.remove("open", "active");
      panel.setAttribute("aria-hidden", "true");
      panel.style.visibility = "hidden";
      panel.style.opacity = "0";
      panel.style.pointerEvents = "none";
      document.body.classList.remove("menu-open");
      button.setAttribute("aria-expanded", "false");
    }

    function apri() {
      panel.classList.add("open", "active");
      panel.setAttribute("aria-hidden", "false");
      panel.style.visibility = "visible";
      panel.style.opacity = "1";
      panel.style.pointerEvents = "auto";
      panel.style.zIndex = "9999";
      document.body.classList.add("menu-open");
      button.setAttribute("aria-expanded", "true");
    }

    chiudi();

    button.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      (panel.classList.contains("open") || panel.classList.contains("active")) ? chiudi() : apri();
    });

    close?.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      chiudi();
    });

    panel.addEventListener("click", e => {
      if (e.target === panel) chiudi();
    });

    panel.querySelectorAll("a").forEach(a => a.addEventListener("click", chiudi));
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") chiudi();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sistemaMenu, { once: true });
  } else {
    sistemaMenu();
  }
})();
