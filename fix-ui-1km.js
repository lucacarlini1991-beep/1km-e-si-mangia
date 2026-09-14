/* 1 KM E SI MANGIA - stile UI globale */
(function () {
  "use strict";
  if (window.__1kmGlobalUiFix) return;
  window.__1kmGlobalUiFix = true;

  function lockScroll() {
    document.documentElement.classList.add("ui-scroll-locked");
    document.body?.classList.add("ui-scroll-locked");
  }
  function unlockScroll() {
    document.documentElement.classList.remove("ui-scroll-locked");
    document.body?.classList.remove("ui-scroll-locked");
  }

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

  // Il comportamento del menu NON viene gestito qui: ogni pagina mantiene il
  // proprio handler/unified menu. Qui uniformiamo solo lo stile e lo scroll.
  function sistemaMenu() {
    const panel = document.getElementById("mobileMenu") || document.querySelector(".mobile-menu") || document.getElementById("menuOverlay") || document.querySelector(".menu-overlay");
    if (!panel) return;
    panel.style.overscrollBehavior = "contain";
    panel.style.webkitOverflowScrolling = "touch";
    panel.style.touchAction = "pan-y";
  }

  function normalizza(testo) {
    return String(testo || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function sistemaSchedaRistoranti() {
    const paroleTitolo = ["ristoranti", "entro 2 km di strada"];
    const elementi = document.body ? document.body.querySelectorAll("div") : [];
    let pannello = null;
    for (const el of elementi) {
      const testo = normalizza(el.textContent || "");
      if (!paroleTitolo.every(p => testo.includes(p))) continue;
      const stile = window.getComputedStyle(el);
      if (stile.position !== "fixed" && stile.position !== "absolute") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < window.innerWidth * 0.65 || rect.height < window.innerHeight * 0.35) continue;
      if (!pannello || rect.width * rect.height < pannello.getBoundingClientRect().width * pannello.getBoundingClientRect().height) pannello = el;
    }
    if (!pannello) return;
    lockScroll();
    if (pannello.dataset.schedaRistorantiFix === "global-1") return;
    pannello.dataset.schedaRistorantiFix = "global-1";
    pannello.classList.add("ui-standard-card");
    pannello.style.left = "50%";
    pannello.style.right = "auto";
    pannello.style.top = "50%";
    pannello.style.bottom = "auto";
    pannello.style.transform = "translate(-50%, -50%)";
    pannello.style.overflow = "hidden";
    pannello.style.display = "flex";
    pannello.style.flexDirection = "column";
    pannello.style.boxSizing = "border-box";
    pannello.style.zIndex = "99999";
    pannello.style.touchAction = "pan-y";

    const figli = Array.from(pannello.querySelectorAll("div"));
    let lista = null, maxCards = 0;
    for (const el of figli) {
      const cards = Array.from(el.children || []).filter(child => {
        const r = child.getBoundingClientRect();
        return r.height >= 70 && r.width >= pannello.getBoundingClientRect().width * 0.65;
      }).length;
      if (cards >= 2 && cards > maxCards) { maxCards = cards; lista = el; }
    }
    if (lista) {
      lista.style.flex = "1 1 auto";
      lista.style.minHeight = "0";
      lista.style.overflowY = "auto";
      lista.style.overflowX = "hidden";
      lista.style.webkitOverflowScrolling = "touch";
      lista.style.overscrollBehavior = "contain";
      lista.style.touchAction = "pan-y";
      lista.style.paddingBottom = "18px";
    } else {
      pannello.style.overflowY = "auto";
      pannello.style.webkitOverflowScrolling = "touch";
    }
  }

  function sistemaAltreSchede() {
    const candidati = document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="overlay"]');
    let trovato = false;
    candidati.forEach(el => {
      if (el.classList.contains("auth-modal") || el.classList.contains("mobile-menu") || el.classList.contains("menu-overlay") || el.classList.contains("unified-menu-overlay")) return;
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
    if (trovato) lockScroll();
  }

  function avvia() {
    installGlobalStyle();
    sistemaMenu();
    sistemaSchedaRistoranti();
    sistemaAltreSchede();
    const observer = new MutationObserver(() => {
      sistemaMenu();
      sistemaSchedaRistoranti();
      sistemaAltreSchede();
    });
    if (document.body) observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:["class","style","aria-hidden"] });
    setTimeout(() => observer.disconnect(), 30000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", avvia, { once:true });
  else avvia();
})();
