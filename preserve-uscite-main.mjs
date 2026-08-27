import fs from 'node:fs';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
const sourceDir = path.join(root, 'dist');
const mainSource = path.join(sourceDir, 'script.js');
const mainTarget = path.join(root, 'uscite-main.js');

if (!fs.existsSync(mainSource)) {
  throw new Error('dist/script.js non trovato: impossibile preservare il motore della mappa uscite.');
}

// Vite svuota/ricrea dist/. Prima del build preserviamo il motore della mappa
// e i database che nella copia funzionante di dist/ sono completi. In root
// uscite.json può essere solo un placeholder vuoto: non dobbiamo sovrascrivere
// il database reale con quello vuoto durante il build.
fs.copyFileSync(mainSource, mainTarget);
console.log('Motore mappa uscite preservato in uscite-main.js');

for (const file of ['uscite.json', 'ristoranti.json', 'parcheggi-database.json']) {
  const source = path.join(sourceDir, file);
  const target = path.join(root, file);

  if (!fs.existsSync(source)) {
    throw new Error(`Database ${file} non trovato in dist/.`);
  }

  const stat = fs.statSync(source);
  if (stat.size < 10) {
    throw new Error(`Database ${file} in dist/ sembra vuoto (${stat.size} byte).`);
  }

  fs.copyFileSync(source, target);
  console.log(`Database preservato: ${file} (${stat.size} byte)`);
}
