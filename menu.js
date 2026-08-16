(function () {
  function initMenu() {
    const menuButton = document.querySelector(".menu-button");
    const mobileMenu = document.getElementById("mobileMenu");
    const menuClose = document.getElementById("menuClose");

    if (!menuButton || !mobileMenu || !menuClose) {
      console.warn("MENU: elementi non trovati");
      return;
    }

    function openMenu() {
      mobileMenu.style.visibility = "visible";
      mobileMenu.style.opacity = "1";
      mobileMenu.style.transform = "translateX(0)";
      mobileMenu.style.pointerEvents = "auto";
      mobileMenu.setAttribute("aria-hidden", "false");
    }

    function closeMenu() {
      mobileMenu.style.visibility = "hidden";
      mobileMenu.style.opacity = "0";
      mobileMenu.style.transform = "translateX(100%)";
      mobileMenu.style.pointerEvents = "none";
      mobileMenu.setAttribute("aria-hidden", "true");
    }

    menuButton.addEventListener("click", openMenu);
    menuClose.addEventListener("click", closeMenu);

    // IMPORTANTE:
    // NON blocchiamo i link del menu.
    // Lasciamo al browser la normale navigazione
    // verso contatti.html, distanze.html, ecc.
    const menuLinks = mobileMenu.querySelectorAll("a");

    menuLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        closeMenu();
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMenu);
  } else {
    initMenu();
  }
})();