import { chromium } from 'playwright';
import fs from 'node:fs';

const URL = process.env.TICKETAG_URL || 'https://ticketag.it/';
const TARGETS = ['gradinata sud', 'gradinata sud inferiore', 'gradinata sud superiore'];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'it-IT' });
let available = false;
let details = '';
let error = null;

try {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  // Read the rendered page, not just the initial HTML. Ticketag may populate
  // availability through JavaScript after the page loads.
  const text = (await page.locator('body').innerText()).toLowerCase();
  const hasTarget = TARGETS.some(t => text.includes(t));

  if (hasTarget) {
    // Look for a target sector and nearby purchase/availability language.
    const body = text.replace(/\s+/g, ' ');
    const idx = TARGETS.map(t => body.indexOf(t)).find(i => i >= 0);
    const snippet = idx >= 0 ? body.slice(Math.max(0, idx - 150), idx + 500) : '';
    available = /(acquista|disponibil|disponibile|compra|posto|bigliett)/i.test(snippet);
    details = snippet.trim();
  }

  // Save a screenshot for diagnostics only when requested.
  if (process.env.SAVE_SCREENSHOT === '1') await page.screenshot({ path: 'ticketag-bot.png', fullPage: true });
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
