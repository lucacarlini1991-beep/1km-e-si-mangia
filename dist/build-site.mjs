import fs from 'node:fs';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
const out = path.join(root, 'dist');
const skip = new Set(['dist', 'node_modules', '.git', '.env']);

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (skip.has(entry.name)) continue;
  if (entry.isDirectory()) {
    if (entry.name === 'assets') {
      fs.cpSync(path.join(root, entry.name), path.join(out, entry.name), { recursive: true });
    }
    continue;
  }

  const ext = path.extname(entry.name).toLowerCase();
  const skipFiles = new Set(['package.json', 'package-lock.json', 'vercel.json', 'build-database.js', 'genera_ristoranti.js']);
  const allowed = ['.html', '.js', '.css', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico', '.txt'];
  const copyJson = ['ristoranti.json', 'uscite.json', 'parcheggi-database.json'].includes(entry.name);
  if (!skipFiles.has(entry.name) && (allowed.includes(ext) || copyJson)) {
    fs.copyFileSync(path.join(root, entry.name), path.join(out, entry.name));
  }
}
// Copia i file necessari per Google AdSense e Google
for (const file of ['ads.txt', 'robots.txt', 'sitemap.xml']) {
  const source = path.join(root, file);
  const destination = path.join(out, file);

  if (fs.existsSync(source)) {
    fs.copyFileSync(source, destination);
    console.log(`Copiato in dist/: ${file}`);
  } else {
    console.warn(`ATTENZIONE: ${file} non trovato`);
  }
}
console.log('Sito sincronizzato in dist/.');
console.log('Pagine:', fs.readdirSync(out).filter(x => x.endsWith('.html')).join(', '));
console.log('gps.js e gps-camion.js:', fs.existsSync(path.join(out,'gps.js')), fs.existsSync(path.join(out,'gps-camion.js')));
