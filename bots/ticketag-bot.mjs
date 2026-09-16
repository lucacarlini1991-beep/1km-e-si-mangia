import { chromium } from 'playwright';
import fs from 'node:fs';

const URL = process.env.TICKETAG_URL || 'https://sampdoria-ticketag.ticketone.it/Partita/25dcc650-296c-4652-874e-58f9e4f947c3?tickets=1';
const TARGETS = ['gradinata sud', 'gradinata sud inferiore', 'gradinata sud superiore'];
const PURCHASE = /(acquista|compra|seleziona posto|scegli posto|aggiungi al carrello|procedi all'acquisto)/i;
const SOLD = /(venduto|esaurit|sold out|non disponibile|terminat)/i;

const previous = fs.existsSync('bot-status.json')
  ? JSON.parse(fs.readFileSync('bot-status.json', 'utf8'))
  : null;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 }, locale: 'it-IT' });
let available = false;
let details = '';
let error = null;

try {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(5000);

  const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
  const lower = body.toLowerCase();
  const target = TARGETS.find(t => lower.includes(t));

  if (!target) {
    details = 'Gradinata Sud non trovata nella pagina renderizzata.';
  } else {
    const idx = lower.indexOf(target);
    details = body.slice(Math.max(0, idx - 250), idx + 900).trim();

    const controls = await page.locator('button, a, [role="button"], input[type="submit"]')
      .evaluateAll((els, targets) => els.map(el => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const visible = style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        const disabled = el.disabled || el.getAttribute('aria-disabled') === 'true';
        let node = el;
        const parents = [];
        for (let i = 0; i < 8 && node; i++, node = node.parentElement) {
          parents.push((node.innerText || '').replace(/\s+/g, ' ').trim());
        }
        const container = parents.find(t => t && t.length <= 2500 && targets.some(x => t.toLowerCase().includes(x))) || '';
        const control = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('value') || '').replace(/\s+/g, ' ').trim();
        return { control, container, visible, disabled };
      }), TARGETS);

    const valid = controls.find(c => {
      if (!c.visible || c.disabled || !c.container) return false;
      if (!PURCHASE.test(c.control)) return false;
      const combined = `${c.control} ${c.container}`;
      return !SOLD.test(combined);
    });

    if (valid) {
      available = true;
      details = valid.container;
    } else {
      details = 'Gradinata Sud presente, ma nessun controllo di acquisto/selezione attivo rilevato.';
    }
  }
} catch (e) {
  error = e?.message || String(e);
} finally {
  await browser.close();
}

const stateChanged = !previous || previous.available !== available || previous.error !== error;
const result = {
  checkedAt: stateChanged ? new Date().toISOString() : (previous.checkedAt || new Date().toISOString()),
  available,
  details: stateChanged ? details : (previous.details || details),
  url: URL,
  error
};

// Keep the published status stable while repeated 15-second checks find the same state.
// A Git commit is therefore created only when availability/error actually changes.
fs.writeFileSync('bot-status.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ ...result, stateChanged }, null, 2));
