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

// =====================================================
// POST-PROCESSING DELLE PAGINE HTML
// =====================================================
// Tutte le pagine ricevono Vercel Web Analytics senza
// mostrare alcun contatore all'utente. I dati si leggono
// dal pannello Analytics di Vercel.
const analyticsSnippet = `\n<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};</script>\n<script defer src="/_vercel/insights/script.js"></script>\n`;

const htmlFiles = fs.readdirSync(out).filter(name => name.toLowerCase().endsWith('.html'));

for (const file of htmlFiles) {
  const filePath = path.join(out, file);
  let html = fs.readFileSync(filePath, 'utf8');

  // Titolo e descrizione della sezione uscite: il progetto
  // evolve da "Esplora le uscite" a "Esplora cosa offre l'uscita".
  html = html.replaceAll('ESPLORA LE USCITE', "ESPLORA COSA OFFRE L'USCITA");
  html = html.replaceAll('Esplora le uscite', "Esplora cosa offre l'uscita");
  html = html.replaceAll("Trova l'uscita più vicina", "Scopri cosa offre ogni uscita");
  html = html.replaceAll(
    'Avvicinati sulla mappa per visualizzare le singole uscite autostradali.',
    "Avvicinati sulla mappa e scopri cosa offre ogni uscita autostradale."
  );

  // Aggiunge una voce Coming Soon ai menu esistenti, prima dei Contatti.
  if (!html.includes('href="coming-soon.html"')) {
    const comingSoonLink = '<a href="coming-soon.html" class="menu-link"><strong>🚧 PROSSIME NOVITÀ</strong><span>Scopri cosa stiamo preparando</span></a>\n';
    html = html.replace(/(<a href="contatti\.html"[^>]*>)/g, comingSoonLink + '$1');
  }

  // Analytics invisibile: viene inserito una sola volta nel body.
  if (!html.includes('/_vercel/insights/script.js')) {
    html = html.replace(/<\/body>/i, `${analyticsSnippet}</body>`);
  }

  fs.writeFileSync(filePath, html);
}

console.log('Sito sincronizzato in dist/.');
console.log('Pagine:', fs.readdirSync(out).filter(x => x.endsWith('.html')).join(', '));
console.log('Analytics Vercel: snippet inserito nelle pagine HTML.');
console.log('gps.js e gps-camion.js:', fs.existsSync(path.join(out,'gps.js')), fs.existsSync(path.join(out,'gps-camion.js')));
