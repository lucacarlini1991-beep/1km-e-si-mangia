/* 1 KM E SI MANGIA - stile UI globale */
(function () {
  "use strict";
  if (window.__1kmGlobalUiFix) return;
  window.__1kmGlobalUiFix = true;

  function installGlobalStyle() {
    if (document.getElementById("one-km-ui-global-style")) return;
    const style = document.createElement("style");
    style.id = "one-km-ui-global-style";
    style.textContent = `
      html.ui-scroll-locked, body.ui-scroll-locked { overflow:hidden !important; }
      .mobile-menu, .menu-overlay { overscroll-behavior:contain !important; }
      .ui-standard-modal {
        position:fixed !important; inset:0 !important; z-index:99990 !important;
        display:flex !important; align-items:center !important; justify-content:center !important;
        padding:12px !important; overflow:auto !important; overscroll-behavior:contain !important;
        -webkit-overflow-scrolling:touch !important;
      }
      .ui-standard-card {
        width:min(96vw,900px) !important; max-width:96vw !important;
        max-height:92vh !important; overflow:auto !important;
        -webkit-overflow-scrolling:touch !important; overscroll-behavior:contain !important;
        box-sizing:border-box !important;
      }
      .auth-modal { z-index:10000 !important; }
      .auth-box { width:min(460px,100%) !important; max-width:calc(100vw - 24px) !important; max-height:92vh !important; overflow:auto !important; -webkit-overflow-scrolling:touch !important; }
      @media(max-width:600px){
        .ui-standard-modal{padding:10px !important}
        .ui-standard-card{width:96vw !important;max-width:96vw !important;max-height:92vh !important}
      }
    `;
    document.head.appendChild(style);
  }

  function sistemaMenu() {
    const panel = document.getElementById("mobileMenu") || document.querySelector(".mobile-menu") || document.getElementById("menuOverlay") || document.querySelector(".menu-overlay");
    if (!panel) return;
    panel.style.overscrollBehavior = "contain";
    panel.style.webkitOverflowScrolling = "touch";
    panel.style.touchAction = "pan-y";
  }

  function sistemaAltreSchede() {
    const candidati = document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="overlay"]');
    let trovato = false;
    candidati.forEach(el => {
      if (el.id === "ristorantiMapPanel" || el.classList.contains("auth-modal") || el.classList.contains("mobile-menu") || el.classList.contains("menu-overlay") || el.classList.contains("unified-menu-overlay")) return;
      const st = window.getComputedStyle(el);
      if (st.display === "none" || st.visibility === "hidden" || st.opacity === "0") return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 240 || rect.height < 120) return;
      if (st.position !== "fixed" && st.position !== "absolute") return;
      el.classList.add("ui-standard-modal");
      const card = el.querySelector(':scope > div, :scope > section, :scope > article') || el;
      if (card !== el && !card.classList.contains("auth-box")) card.classList.add("ui-standard-card");
      trovato = true;
    });
    if (trovato) document.documentElement.classList.add("ui-scroll-locked");
  }

  function avvia() {
    installGlobalStyle();
    sistemaMenu();
    sistemaAltreSchede();
    const observer = new MutationObserver(() => {
      sistemaMenu();
      sistemaAltreSchede();
    });
    if (document.body) observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:["class","style","aria-hidden"] });
    setTimeout(() => observer.disconnect(), 30000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", avvia, { once:true });
  else avvia();
})();
