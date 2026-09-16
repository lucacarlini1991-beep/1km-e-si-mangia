import { chromium } from 'playwright';
import fs from 'node:fs';

const URL = process.env.TICKETAG_URL || 'https://sampdoria-ticketag.ticketone.it/Partita/25dcc650-296c-4652-874e-58f9e4f947c3?tickets=1';
const TARGETS = ['gradinata sud', 'gradinata sud inferiore', 'gradinata sud superiore'];
const PURCHASE = /(acquista|compra|seleziona|procedi all'acquisto|aggiungi al carrello|continua|scegli|disponibil)/i;
const SOLD = /(venduto|esaurit|sold out|non disponibile|terminat)/i;

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

    // Important: Ticketag also shows a history of recently SOLD tickets.
    // Never use that history as proof of availability. Instead inspect actual
    // interactive purchase controls and their nearby sector container.
    const controls = await page.locator('button, a, [role="button"], input[type="submit"]')
      .evaluateAll((els, targets) => els.map(el => {
        let node = el;
        const parents = [];
        for (let i = 0; i < 7 && node; i++, node = node.parentElement) {
          parents.push((node.innerText || '').replace(/\s+/g, ' ').trim());
        }
        const text = parents.find(t => t && t.length <= 1800 && targets.some(x => t.toLowerCase().includes(x))) || '';
        return {
          control: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('value') || '').replace(/\s+/g, ' ').trim(),
          container: text
        };
      }), TARGETS);

    const valid = controls.find(c => {
      const combined = `${c.control} ${c.container}`;
      if (!c.container) return false;
      if (SOLD.test(combined)) return false;
      return PURCHASE.test(combined);
    });

    if (valid) {
      available = true;
      details = valid.container;
    }
  }

  if (process.env.SAVE_SCREENSHOT === '1') {
    await page.screenshot({ path: 'ticketag-bot.png', fullPage: true });
  }
} catch (e) {
  error = e?.message || String(e);
} finally {
  await browser.close();
}

const result = {
  checkedAt: new Date().toISOString(),
  available,
  details,
  url: URL,
  error
};

fs.writeFileSync('bot-status.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
