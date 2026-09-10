import fs from 'node:fs';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);

// I sorgenti pubblicati devono vivere nella root del progetto.
// Non dipendiamo più dalla vecchia cartella dist/, che viene ricreata a ogni build.
const required = [
  'uscite-main.js',
  'uscite.json',
  'ristoranti.json',
  'parcheggi-database.json'
];

for (const file of required) {
  const target = path.join(root, file);
  if (!fs.existsSync(target)) {
    throw new Error(`Sorgente richiesto non trovato: ${file}`);
  }
  const size = fs.statSync(target).size;
  if (size < 10) {
    throw new Error(`Sorgente ${file} sembra vuoto (${size} byte).`);
  }
  console.log(`Sorgente verificato: ${file} (${size} byte)`);
}

console.log('Build indipendente dalla vecchia cartella dist/.');
