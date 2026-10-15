// Screenshot every view of the built site and fail on console errors.
// Usage: npm run build && (npx vite preview --port 4173 &) && node scripts/screenshots.mjs
import fs from 'node:fs';
import { chromium } from 'playwright';
import api from '../src/data/tripo-api.json' with { type: 'json' };

const URL = process.env.SITE_URL || 'http://localhost:4173/';
fs.mkdirSync('qa/site', { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

for (const lang of ['zh', 'en']) {
  await page.goto(`${URL}#hall`);
  await page.evaluate((l) => localStorage.setItem('lang', l), lang);
  await page.reload();
  for (const f of api.features) {
    await page.click(`.feat[data-id="${f.id}"]`);
    await page.waitForTimeout(f.id === 'image-gen' ? 1800 : 1400);
    await page.screenshot({ path: `qa/site/hall-${f.id}-${lang}.png` });
  }
  for (const view of ['run', 'modules']) {
    await page.goto(`${URL}#${view}`);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `qa/site/${view}-${lang}.png`, fullPage: view === 'modules' });
  }
}
await browser.close();
console.log(errors.length ? `ERRORS:\n${[...new Set(errors)].join('\n')}` : 'no console errors');
process.exit(errors.length ? 1 : 0);
