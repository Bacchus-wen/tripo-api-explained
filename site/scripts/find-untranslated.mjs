// In English mode, list visible text that still contains Chinese characters, per view and per demo.
// Usage: (npx vite preview --port 4173 &) && node scripts/find-untranslated.mjs
import { chromium } from 'playwright';
import api from '../src/data/tripo-api.json' with { type: 'json' };

const URL = process.env.SITE_URL || 'http://localhost:4173/';
const CJK = /[㐀-鿿]/;
const browser = await chromium.launch({ args: ['--use-gl=angle'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.setItem('lang', 'en'));

const grab = async (label, waits = [3000]) => {
  const found = new Set();
  for (const w of waits) {
    await page.waitForTimeout(w);
    const lines = await page.evaluate(() => document.body.innerText.split('\n'));
    lines.map((l) => l.trim()).filter((l) => /[㐀-鿿]/.test(l) && l !== '中文').forEach((l) => found.add(l));
    // also titles/placeholders/aria labels
    const attrs = await page.evaluate(() => [...document.querySelectorAll('[title],[aria-label],[placeholder]')]
      .flatMap((e) => [e.title, e.getAttribute('aria-label'), e.placeholder]).filter(Boolean));
    attrs.filter((a) => CJK.test(a)).forEach((a) => found.add(`[attr] ${a}`));
  }
  if (found.size) console.log(`\n## ${label}\n${[...found].map((l) => `- ${l.slice(0, 140)}`).join('\n')}`);
};

for (const view of ['home', 'team', 'run', 'modules']) {
  await page.goto(`${URL}#${view}`, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await grab(`view: ${view}`);
}
await page.goto(`${URL}#hall`, { waitUntil: 'domcontentloaded' });
await page.reload({ waitUntil: 'domcontentloaded' });
for (const f of api.features) {
  await page.click(`.feat[data-id="${f.id}"]`);
  // click every button inside the demo once to reveal state-dependent text
  await grab(`demo: ${f.id}`, [2500]);
  const n = await page.locator('#stage button').count();
  for (let i = 0; i < Math.min(n, 12); i++) {
    await page.locator('#stage button').nth(i).click({ timeout: 1000 }).catch(() => {});
  }
  await grab(`demo: ${f.id} (after clicks)`, [3500, 6000]);
}
await browser.close();
