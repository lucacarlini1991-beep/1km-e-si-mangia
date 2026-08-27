import fs from 'node:fs';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
const source = path.join(root, 'dist', 'script.js');
const target = path.join(root, 'uscite-main.js');

if (!fs.existsSync(source)) {
  throw new Error('dist/script.js non trovato: impossibile preservare il motore della mappa uscite.');
}

fs.copyFileSync(source, target);
console.log('Motore mappa uscite preservato in uscite-main.js');
