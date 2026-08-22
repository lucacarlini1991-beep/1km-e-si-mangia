/* 1 KM E SI MANGIA - MENU UNIFICATO */
(function () {
  "use strict";

  function initMenu() {
    const button = document.getElementById("menuButton") || document.querySelector(".menu-button");
    const menu = document.getElementById("mobileMenu") || document.querySelector(".mobile-menu") || document.getElementById("menuOverlay") || document.querySelector(".menu-overlay");
    const close = document.getElementById("menuClose") || document.querySelector(".menu-close");

    if (!button || !menu) {
      console.warn("MENU: elementi non trovati.");
      return;
    }

    function openMenu(event) {
      if (event) { event.preventDefault(); event.stopPropagation(); }
      menu.classList.add("open", "active");
      menu.setAttribute("aria-hidden", "false");
      button.setAttribute("aria-expanded", "true");
      menu.style.visibility = "visible";
      menu.style.opacity = "1";
      menu.style.pointerEvents = "auto";
      document.body.classList.add("menu-open");
      document.body.style.overflow = "hidden";
    }

    function closeMenu(event) {
      if (event) { event.preventDefault(); event.stopPropagation(); }
      menu.classList.remove("open", "active");
      menu.setAttribute("aria-hidden", "true");
      button.setAttribute("aria-expanded", "false");
      menu.style.visibility = "hidden";
      menu.style.opacity = "0";
      menu.style.pointerEvents = "none";
      document.body.classList.remove("menu-open");
      document.body.style.overflow = "";
    }

    closeMenu();

    button.addEventListener("click", openMenu);
    if (close) close.addEventListener("click", closeMenu);

    menu.addEventListener("click", function (event) {
      if (event.target === menu) closeMenu();
      const link = event.target.closest && event.target.closest("a");
      if (link) closeMenu();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu();
    });

    console.log("MENU UNIFICATO ATTIVO");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMenu);
  } else {
    initMenu();
  }
})();
