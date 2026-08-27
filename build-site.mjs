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

const analyticsSnippet = `\n<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};</script>\n<script defer src="/_vercel/insights/script.js"></script>\n`;

const htmlFiles = fs.readdirSync(out).filter(name => name.toLowerCase().endsWith('.html'));

for (const file of htmlFiles) {
  const filePath = path.join(out, file);
  let html = fs.readFileSync(filePath, 'utf8');

  html = html.replaceAll('ESPLORA LE USCITE', "ESPLORA COSA OFFRE L'USCITA");
  html = html.replaceAll('Esplora le uscite', "Esplora cosa offre l'uscita");
  html = html.replaceAll("Trova l'uscita più vicina", "Scopri cosa offre ogni uscita");
  html = html.replaceAll(
    'Avvicinati sulla mappa per visualizzare le singole uscite autostradali.',
    "Avvicinati sulla mappa e scopri cosa offre ogni uscita autostradale."
  );

  if (!html.includes('href="coming-soon.html"')) {
    const comingSoonLink = '<a href="coming-soon.html" class="menu-link"><strong>🚧 PROSSIME NOVITÀ</strong><span>Scopri cosa stiamo preparando</span></a>\n';
    html = html.replace(/(<a href="contatti\.html"[^>]*>)/g, comingSoonLink + '$1');
  }

  if (file === 'come-funziona.html' && !html.includes('google-in-zona-box')) {
    const googleBox = `
<section id="google-in-zona-box" style="max-width:850px;margin:70px auto 0;background:#f3f6f3;border:1px solid #dce5df;border-radius:10px;padding:38px 30px;text-align:left">
  <div class="eyebrow">RICERCA INTELLIGENTE</div>
  <h2 style="margin:0 0 18px;font-size:38px;line-height:1.05;font-weight:900">GOOGLE PLACES, MA SOLO QUANDO SERVE</h2>
  <p style="margin:0 0 16px;color:#60746e;font-size:17px;line-height:1.6"><strong>Il nostro database locale è sempre il primo livello</strong>: funziona senza aspettare il GPS e senza dipendere da Google. Quando selezioni un'uscita, il sito calcola le distanze con il nostro sistema e ti mostra subito i risultati disponibili.</p>
  <p style="margin:0 0 16px;color:#60746e;font-size:17px;line-height:1.6"><strong>Google Places è un secondo livello di ricerca.</strong> Se hai una posizione GPS reale e sei effettivamente nella zona dell'uscita, possiamo usare anche la tua posizione come secondo punto di ricerca. Google può così trovare ristoranti aggiuntivi che non sono ancora presenti nel nostro database.</p>
  <p style="margin:0;color:#60746e;font-size:17px;line-height:1.6"><strong>La cosa importante è che il GPS non blocca il servizio:</strong> se non hai una posizione disponibile, la ricerca dell'uscita e il calcolo delle distanze continuano normalmente. E anche i risultati Google vengono poi verificati dal nostro filtro di distanza prima di essere mostrati.</p>
</section>`;
    html = html.replace('<section class="range">', googleBox + '\n<section class="range">');
  }

  if (file === 'uscite.html' && !html.includes('google-zona.js')) {
    html = html.replace(/<\/body>/i, '<script src="google-zona.js?v=20260826"></script>\n</body>');
  }

  // uscita.html nasce con un riferimento alla copia sorgente in dist/.
  // Vercel pubblica già la cartella dist/ come root: il motore della mappa
  // viene quindi preservato dal pre-build e deve essere referenziato direttamente.
  if (file === 'uscite.html') {
    html = html.replaceAll('src="dist/script.js', 'src="uscite-main.js');
  }

  if (!html.includes('/_vercel/insights/script.js')) {
    html = html.replace(/<\/body>/i, `${analyticsSnippet}</body>`);
  }

  fs.writeFileSync(filePath, html);
}

console.log('Sito sincronizzato in dist/.');
console.log('Pagine:', fs.readdirSync(out).filter(x => x.endsWith('.html')).join(', '));
console.log('Analytics Vercel: snippet inserito nelle pagine HTML.');
console.log('Google Places in zona: ricerca aggiuntiva attiva su uscite.html.');
console.log('gps.js e gps-camion.js:', fs.existsSync(path.join(out,'gps.js')), fs.existsSync(path.join(out,'gps-camion.js')));
