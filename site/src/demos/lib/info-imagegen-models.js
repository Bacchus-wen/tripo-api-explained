// Model sheet for the image-gen demo: image models grouped by family, one-line notes
// (taken from src/data/tripo-api.json), the one measured on this site highlighted.
import { h } from './info-motion.js';

export const FAMILIES = [
  { name: 'Seedream', price: ['一律 5 credits', '5 credits flat'], models: [
    ['seedream_v4', '默认模型，均衡；不指定 model 时用它', 'Default, balanced — used when you omit model'],
    ['seedream_v5', '质量更高，图生图编辑最强', 'Higher quality; strongest for editing'],
  ] },
  { name: 'Banana', price: null, models: [
    ['banana', '快速', 'Fast'],
    ['banana_pro', '高质量', 'Higher quality'],
    ['banana2', '最新的快速档', 'Latest fast tier'],
  ] },
  { name: 'Chat Image', price: ['10 / 10 / 15 credits（≤1K / 2K / 4K）', '10 / 10 / 15 credits (≤1K / 2K / 4K)'], models: [
    ['chat_image_2', 'GPT 系最新', 'Latest GPT-family'],
    ['chat_image_2.5_flare', '速度档 · 本站概念图和道具图都用它', 'Speed tier — made every image on this page'],
    ['chat_image_2.5_sunburst', '保真档，编辑时最能保留原图其余部分', 'Fidelity tier — best at preserving the rest of an image'],
  ] },
];
export const USED = 'chat_image_2.5_flare';

const CSS = `
.d-ig .ig-sheet{position:absolute;right:16px;bottom:70px;z-index:20;width:min(430px,calc(100% - 32px));max-height:calc(100% - 118px);overflow:auto;
  background:rgba(21,23,28,.96);border:1px solid #2c313a;border-radius:14px;padding:12px 14px 10px;box-shadow:0 24px 60px rgba(0,0,0,.55);
  opacity:0;transform:translateY(10px) scale(.98);transform-origin:100% 100%;pointer-events:none;transition:opacity .25s,transform .3s cubic-bezier(.2,.8,.2,1)}
.d-ig .ig-sheet.in{opacity:1;transform:none;pointer-events:auto}
.d-ig .ig-sheet h6{margin:0 0 8px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#6b717c;font-weight:600}
.d-ig .ig-fam{padding:6px 0 8px;border-top:1px solid #23272e}
.d-ig .ig-fam:first-of-type{border-top:0}
.d-ig .ig-famh{display:flex;justify-content:space-between;gap:8px;align-items:baseline;margin-bottom:4px}
.d-ig .ig-famh b{font-size:12.5px}
.d-ig .ig-famh span{font:10.5px var(--mono);color:#6b717c;text-align:right}
.d-ig .ig-m{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center;padding:3px 0}
.d-ig .ig-m code{font:11px var(--mono);color:#cfd3da;background:#1b1e24;border:1px solid #2c313a;border-radius:6px;padding:2px 7px;white-space:nowrap}
.d-ig .ig-m span{font-size:12px;color:#9a9fa8;line-height:1.35}
.d-ig .ig-m.used code{border-color:#e07a3f;color:#ffb347;background:rgba(224,122,63,.12)}
.d-ig .ig-m.used span{color:#ece9e3}
.d-ig .ig-badge{display:inline-block;margin-top:3px;font:600 10.5px var(--mono);color:#15171c;background:#7cc49a;border-radius:999px;padding:1px 8px;white-space:nowrap}
.d-ig .ig-sheet p{margin:6px 0 0;font-size:11px;color:#6b717c;line-height:1.5}
.d-ig .ig-sheet p code{font-family:var(--mono);color:#9a9fa8}
`;

export function createModelSheet(root, t) {
  const style = h('style', { text: CSS });
  const sheet = h('div.ig-sheet', { role: 'dialog' });
  sheet.append(h('h6', { text: t('可选图像模型 · model 参数', 'Image models · the model param') }));
  FAMILIES.forEach((f) => {
    const fam = h('div.ig-fam');
    fam.append(h('div.ig-famh', { html: `<b>${f.name}</b>${f.price ? `<span>${t(...f.price)}</span>` : ''}` }));
    f.models.forEach(([id, zh, en]) => {
      const used = id === USED;
      const row = h(`div.ig-m${used ? '.used' : ''}`);
      const note = used
        ? `${t(zh, en)}<br><span class="ig-badge">${t('本站实测 · 10 credits · ~25 s', 'Measured here · 10 credits · ~25 s')}</span>`
        : t(zh, en);
      row.append(h('code', { text: id }), h('span', { html: note }));
      fam.append(row);
    });
    sheet.append(fam);
  });
  sheet.append(h('p', { html: t(
    '同一个接口、换个 <code>model</code> 就换模型。图像生成每个账户同时只能跑 1 个任务。',
    'Same endpoint — switch models with <code>model</code>. Image generation runs one task per account at a time.') }));
  root.append(style, sheet);
  return {
    toggle(force) { return sheet.classList.toggle('in', force); },
    get open() { return sheet.classList.contains('in'); },
    contains: (n) => sheet.contains(n),
    dispose() { sheet.remove(); style.remove(); },
  };
}
