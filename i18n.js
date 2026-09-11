(function () {
  const translations = {
    it: {
      menu: "MENU",
      close: "Chiudi menu",
      how: "COME FUNZIONA",
      howDesc: "Scopri come utilizzare il servizio",
      homeDesc: "La nostra idea",
      eatDesc: "Trova dove mangiare vicino all'uscita",
      explore: "ESPLORA USCITE",
      exploreDesc: "Scopri cosa c'è intorno alla tua uscita",
      parking: "PARCHEGGI MEZZI PESANTI",
      parkingDesc: "Trova un parcheggio per il tuo mezzo",
      contacts: "CONTATTI",
      contactsDesc: "Scrivici",
      sources: "FONTI E LICENZE",
      sourcesDesc: "Dati, fonti e informazioni legali",
      exit: "ESCI.",
      eat: "MANGIA.",
      go: "RIPARTI.",
      hero: "Sei in autostrada? Trova dove mangiare alla prossima uscita.",
      myLocation: "USA LA MIA POSIZIONE",
      whereEat: "Dove mangiare vicino all'autostrada?",
      seo1: "1 KM E SI MANGIA nasce per aiutarti a trovare ristoranti, trattorie e pizzerie vicino alle uscite autostradali. L'obiettivo è semplice: uscire dall'autostrada, mangiare e ripartire senza perdere tempo in lunghe deviazioni.",
      seo2: "Usa la tua posizione oppure scegli un'uscita per trovare ristoranti e locali nelle vicinanze. Per parcheggi, camper e luoghi da scoprire puoi usare Esplora Uscite.",
      footer: "Mangia bene.<br>Perdi poco tempo.<br>Riparti."
    },
    en: {
      menu: "MENU",
      close: "Close menu",
      how: "HOW IT WORKS",
      howDesc: "Find out how to use the service",
      homeDesc: "Our idea",
      eatDesc: "Find somewhere to eat near the motorway exit",
      explore: "EXPLORE EXITS",
      exploreDesc: "Discover what's around your motorway exit",
      parking: "HEAVY VEHICLE PARKING",
      parkingDesc: "Find parking for your vehicle",
      contacts: "CONTACTS",
      contactsDesc: "Write to us",
      sources: "SOURCES AND LICENCES",
      sourcesDesc: "Data, sources and legal information",
      exit: "EXIT.",
      eat: "EAT.",
      go: "GO.",
      hero: "Are you on the motorway? Find somewhere to eat at the next exit.",
      myLocation: "USE MY LOCATION",
      whereEat: "Where to eat near the motorway?",
      seo1: "1 KM E SI MANGIA helps you find restaurants, trattorias and pizzerias near motorway exits. The goal is simple: leave the motorway, eat and get back on the road without wasting time on long detours.",
      seo2: "Use your location or choose an exit to find restaurants and places nearby. For parking, camper stops and places to discover, use Explore Exits.",
      footer: "Eat well.<br>Waste little time.<br>Get back on the road."
    }
  };

  function getLang() {
    return localStorage.getItem("1kmesimangia_lang") || "it";
  }

  function setLang(lang) {
    localStorage.setItem("1kmesimangia_lang", lang);
    document.documentElement.lang = lang;
    apply(lang);
  }

  function apply(lang) {
    const t = translations[lang] || translations.it;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      const key = el.getAttribute("data-i18n");
      if (t[key] !== undefined) el.innerHTML = t[key];
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      const key = el.getAttribute("data-i18n-aria");
      if (t[key] !== undefined) el.setAttribute("aria-label", t[key]);
    });
    document.querySelectorAll("[data-lang]").forEach(function (el) {
      el.classList.toggle("active", el.getAttribute("data-lang") === lang);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    apply(getLang());
    document.querySelectorAll("[data-lang]").forEach(function (button) {
      button.addEventListener("click", function () {
        setLang(button.getAttribute("data-lang"));
      });
    });
  });

  window.I18N = { getLang, setLang, apply, translations };
})();