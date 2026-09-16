import { chromium } from 'playwright';
import fs from 'node:fs';

const URL = process.env.TICKETAG_URL || 'https://sampdoria-ticketag.ticketone.it/Partita/25dcc650-296c-4652-874e-58f9e4f947c3?tickets=1';
const TARGETS = ['gradinata sud', 'gradinata sud inferiore', 'gradinata sud superiore'];
const POSITIVE = /(acquista|disponibil|disponibile|compra|seleziona|posto|bigliett|€)/i;
const NEGATIVE = /(non disponibile|esaurit|sold out|terminat|nessun bigliett)/i;

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

    // TicketOne can render sector information dynamically. Consider the sector
    // available only when positive purchase/availability wording is nearby and
    // there is no explicit sold-out/unavailable wording in that same area.
    const negative = NEGATIVE.test(snippet);
    available = !negative && POSITIVE.test(snippet);
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
