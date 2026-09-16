import { chromium } from 'playwright';
import fs from 'node:fs';

const URL = process.env.TICKETAG_URL || 'https://sampdoria-ticketag.ticketone.it/Partita/25dcc650-296c-4652-874e-58f9e4f947c3?tickets=1';
const TARGETS = ['gradinata sud', 'gradinata sud inferiore', 'gradinata sud superiore'];
const PURCHASE = /(acquista|compra|seleziona|procedi all'acquisto|aggiungi al carrello)/i;
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

  if (target) {
    const idx = lower.indexOf(target);
    const snippet = body.slice(Math.max(0, idx - 250), idx + 900).trim();
    details = snippet;

    // Do not treat the "Ultimi biglietti venduti" history as availability.
    // Look for an actual purchase control in an element containing the target
    // sector, and reject containers explicitly marked as sold/unavailable.
    const candidates = await page.locator('body *').evaluateAll((els, targets) => {
      const out = [];
      for (const el of els) {
        const text = (el.innerText || '').replace(/\s+/g, ' ').trim();
        if (!text) continue;
        const low = text.toLowerCase();
        if (!targets.some(t => low.includes(t))) continue;
        if (text.length > 2500) continue;

        let node = el;
        for (let level = 0; level < 6 && node; level++, node = node.parentElement) {
          const t = (node.innerText || '').replace(/\s+/g, ' ').trim();
          const html = (node.outerHTML || '').toLowerCase();
          if (t.length > 1800) continue;
          out.push({ text: t, html: html.slice(0, 5000) });
        }
      }
      return out;
    }, TARGETS);

    const valid = candidates.find(c => {
      const t = c.text;
      const h = c.html;
      const hasPurchase = PURCHASE.test(t) || /\b(button|btn|acquista|compra|seleziona)\b/.test(h);
      const hasSold = SOLD.test(t);
      return hasPurchase && !hasSold;
    });

    available = !!valid;
    if (available) details = valid.text;
  } else {
    details = 'Gradinata Sud non trovata nella pagina renderizzata.';
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
