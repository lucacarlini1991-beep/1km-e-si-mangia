// 1 KM E SI MANGIA — FILTRO USCITE OSM
// Nasconde dalla mappa i nodi autostradali generici che non rappresentano
// una vera uscita nominata (es. "A7", "A21", "Diramazione A26").
const fs = require("fs");

function uscitaGenerica(nome) {
  const n = String(nome || "").trim();
  return /^(?:A|RA|SS|SP)\d{1,3}(?:\/[A-Z0-9]+)?$/i.test(n) ||
         /\bDiramazione\b/i.test(n) ||
         /^Autostrada(?:\s+.+)?$/i.test(n);
}

for (const file of ["./uscite.json", "./dist/uscite.json"]) {
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  let hidden = 0;
  for (const exit of data) {
    if (uscitaGenerica(exit.nome)) {
      exit.visualizza_mappa = false;
      hidden++;
    }
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`${file}: ${hidden} nodi generici esclusi dalla mappa.`);
}
