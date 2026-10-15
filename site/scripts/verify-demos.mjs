// Open every feature demo in a fresh page and report the ones that log console errors.
// Usage: (npx vite preview --port 4173 &) && node scripts/verify-demos.mjs  → prints JSON {failed: [...]}
import fs from 'node:fs';
import { chromium } from 'playwright';
import api from '../src/data/tripo-api.json' with { type: 'json' };

const URL = process.env.SITE_URL || 'http://localhost:4173/';
fs.mkdirSync('qa/final', { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle'] });
const failed = {};
for (const f of api.features) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await page.goto(`${URL}#hall`);
  await page.click(`.feat[data-id="${f.id}"]`);
  await page.waitForTimeout(2500);
  const empty = await page.$eval('#stage', (el) => el.querySelector('.stage-empty') !== null);
  if (empty) errs.push('demo failed to mount');
  await page.locator('.stage').screenshot({ path: `qa/final/${f.id}.png` });
  if (errs.length) failed[f.demo] = [...new Set(errs)].slice(0, 3);
  await page.close();
}
await browser.close();
console.log(JSON.stringify({ failed }, null, 1));
