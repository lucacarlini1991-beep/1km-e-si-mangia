/* 1 KM E SI MANGIA - MENU UNIFICATO
   Compatibile con le varianti di markup usate nelle pagine.
   Un solo listener: niente conflitti tra script.js e menu.js.
*/
(function () {
  "use strict";

  function initMenu() {
    const button = document.getElementById("menuButton") || document.querySelector(".menu-button");
    const panel = document.getElementById("mobileMenu") || document.querySelector(".mobile-menu") ||
                  document.getElementById("siteMenu") || document.querySelector(".site-menu");
    const close = document.getElementById("menuClose") || document.querySelector(".menu-close") || document.querySelector(".site-menu-close");
    const overlay = document.getElementById("menuOverlay") || document.querySelector(".menu-overlay") ||
                    document.querySelector(".mobile-menu-overlay") || document.querySelector(".site-menu-overlay");

    if (!button || !panel) {
      console.warn("MENU: elementi non trovati", { button: !!button, panel: !!panel });
      return;
    }

    let open = false;

    function setState(value) {
      open = value;
      panel.classList.toggle("open", value);
      panel.classList.toggle("active", value);
      panel.setAttribute("aria-hidden", value ? "false" : "true");
      button.setAttribute("aria-expanded", value ? "true" : "false");
      document.body.classList.toggle("menu-open", value);

      panel.style.visibility = value ? "visible" : "hidden";
      panel.style.opacity = value ? "1" : "0";
      panel.style.pointerEvents = value ? "auto" : "none";
      panel.style.zIndex = "9999";

      if (overlay && overlay !== panel) {
        overlay.classList.toggle("open", value);
        overlay.classList.toggle("active", value);
        overlay.style.visibility = value ? "visible" : "hidden";
        overlay.style.opacity = value ? "1" : "0";
        overlay.style.pointerEvents = value ? "auto" : "none";
        overlay.style.zIndex = "9998";
      }
    }

    function openMenu(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      setState(true);
    }

    function closeMenu(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      setState(false);
    }

    setState(false);

    button.addEventListener("click", function (e) {
      if (open) closeMenu(e); else openMenu(e);
    });

    if (close) close.addEventListener("click", closeMenu);
    if (overlay && overlay !== panel) overlay.addEventListener("click", closeMenu);

    panel.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        closeMenu();
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && open) closeMenu();
    });

    console.log("MENU.JS ATTIVO: menu unificato");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMenu, { once: true });
  } else {
    initMenu();
  }
})();
