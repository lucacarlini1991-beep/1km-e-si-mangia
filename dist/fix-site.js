const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const pages = [
  "index.html",
  "uscite.html",
  "come-funziona.html",
  "distanze.html",
  "parcheggi.html",
  "contatti.html"
];

const logoCss = `
/* === LOGO ORIGINALE 1 KM E SI MANGIA === */
.logo-link{
  display:flex !important;
  align-items:center !important;
  text-decoration:none !important;
  line-height:0 !important;
}
.site-logo{
  width:108px !important;
  height:72px !important;
  object-fit:contain !important;
  display:block !important;
}
.mobile-menu-logo{
  display:block !important;
  width:150px !important;
  height:auto !important;
  margin:10px 0 0 !important;
}
@media (max-width:750px){
  .site-logo{
    width:82px !important;
    height:58px !important;
  }
  .mobile-menu-logo{
    width:135px !important;
  }
}
`;

function patch(file) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) {
    console.log("SKIP:", file, "(non presente)");
    return;
  }

  let html = fs.readFileSync(full, "utf8");

  // 1) Desktop header: sostituisce sia il vecchio pin SVG/CSS
  //    sia il vecchio logo testuale con il logo originale.
  const desktopPatterns = [
    /<div class="logo">[\s\S]*?<\/div>\s*<\/div>/,
    /<a[^>]*class="logo-link"[^>]*>[\s\S]*?<\/a>/
  ];

  const newLogo =
`<a href="index.html" class="logo-link" aria-label="1 KM E SI MANGIA">
  <img src="logo-definitivo.png" alt="1 KM E SI MANGIA" class="site-logo">
</a>`;

  let desktopDone = false;
  for (const re of desktopPatterns) {
    if (re.test(html)) {
      html = html.replace(re, newLogo);
      desktopDone = true;
      break;
    }
  }

  // 2) Menu mobile: sostituisce il vecchio titolo testuale.
  const mobileRe =
    /<div class="mobile-menu-title">[\s\S]*?<\/div>/;
  if (mobileRe.test(html)) {
    html = html.replace(
      mobileRe,
`<div class="mobile-menu-title">
  <img src="logo-definitivo.png" alt="1 KM E SI MANGIA" class="mobile-menu-logo">
</div>`
    );
  }

  // 3) Se la pagina ha un vecchio blocco logo ma la regex sopra non lo ha
  //    intercettato, aggiunge comunque un logo-link nel punto del topbar.
  if (!desktopDone && !html.includes('class="site-logo"')) {
    html = html.replace(
      /(<header[^>]*class="topbar"[^>]*>)/,
      `$1\n  ${newLogo}`
    );
  }

  // 4) CSS comune.
  if (!html.includes("LOGO ORIGINALE 1 KM E SI MANGIA")) {
    if (html.includes("</style>")) {
      html = html.replace("</style>", logoCss + "\n</style>");
    } else {
      html = `<style>${logoCss}</style>\n` + html;
    }
  }

  // 5) Correzione definitiva delle distanze, se presenti nella pagina.
  html = html
    .replace(/<strong>\s*3 KM\s*<\/strong>/g, "<strong>2 KM</strong>")
    .replace(/<strong>\s*5 KM\+\s*<\/strong>/g, "<strong>PIÃ™ DI 2 KM</strong>")
    .replace(/PRATICAMENTE SULL['â€™]USCITA/g, "PRATICAMENTE ALL'USCITA")
    .replace(/VALE LA PENA\?/g, "GUIDA ANCORA UN PO' FINO ALLA PROSSIMA USCITA");

  fs.writeFileSync(full, html, "utf8");
  console.log("OK:", file);
}

for (const page of pages) patch(page);

console.log("\nFatto. Ora esegui:");
console.log("npm run build");