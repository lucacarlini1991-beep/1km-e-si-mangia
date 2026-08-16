// =====================================================
// 1 KM E SI MANGIA
// MENU MOBILE - SCRIPT INDIPENDENTE
// =====================================================

(function () {

    function initMenu() {
  
      const menuButton = document.querySelector(".menu-button");
      const mobileMenu = document.getElementById("mobileMenu");
      const menuClose = document.getElementById("menuClose");
  
      if (!mobileMenu) {
        console.warn("MENU: #mobileMenu non trovato");
        return;
      }
  
      console.log("MENU: inizializzato");
  
  
      // =================================================
      // APERTURA
      // =================================================
  
      if (menuButton) {
  
        menuButton.addEventListener("click", function (event) {
  
          event.preventDefault();
          event.stopPropagation();
  
          mobileMenu.style.display = "block";
          mobileMenu.style.visibility = "visible";
          mobileMenu.style.opacity = "1";
          mobileMenu.style.transform = "translateX(0)";
          mobileMenu.style.pointerEvents = "auto";
  
          document.body.style.overflow = "hidden";
  
          mobileMenu.setAttribute(
            "aria-hidden",
            "false"
          );
  
        });
  
      }
  
  
      // =================================================
      // CHIUSURA
      // =================================================
  
      function closeMenu() {
  
        mobileMenu.style.opacity = "0";
        mobileMenu.style.transform = "translateX(100%)";
        mobileMenu.style.pointerEvents = "none";
  
        document.body.style.overflow = "";
  
        mobileMenu.setAttribute(
          "aria-hidden",
          "true"
        );
  
      }
  
  
      // =================================================
      // PULSANTE X
      // =================================================
  
      if (menuClose) {
  
        menuClose.addEventListener(
          "click",
          function (event) {
  
            event.preventDefault();
            event.stopPropagation();
  
            closeMenu();
  
          }
        );
  
      }
  
  
      // =================================================
      // CLICK FUORI DAL MENU
      // =================================================
  
      mobileMenu.addEventListener(
        "click",
        function (event) {
  
          if (event.target === mobileMenu) {
  
            closeMenu();
  
          }
  
        }
      );
  
  
      // =================================================
      // ESC
      // =================================================
  
      document.addEventListener(
        "keydown",
        function (event) {
  
          if (event.key === "Escape") {
  
            closeMenu();
  
          }
  
        }
      );
  
  
      // =================================================
      // LINK DEL MENU
      // =================================================
  
      const links =
        mobileMenu.querySelectorAll(".menu-link");
  
      links.forEach(function (link) {
  
        link.addEventListener(
          "click",
          function () {
  
            closeMenu();
  
          }
        );
  
      });
  
    }
  
  
    // ===================================================
    // AVVIO
    // ===================================================
  
    if (document.readyState === "loading") {
  
      document.addEventListener(
        "DOMContentLoaded",
        initMenu
      );
  
    } else {
  
      initMenu();
  
    }
  
  })();
  