// 文生图 / 图生图 — real images generated for this project: one concept, then props isolated from it.
const PROPS = [
  ['prop-printer-ref-v1', '生成机', 'Generator'],
  ['prop-workbench-ref-v1', '修整工作台', 'Workbench'],
  ['prop-critic-ref-v1', '多机位展台', 'Camera stand'],
  ['prop-shelf-ref-v1', '成品货架', 'Shelf'],
];
const MODELS = [
  ['Seedream', [['seedream_v4', '默认模型：不指定时就用它', 'The default when you don’t pick one'],
    ['seedream_v5', 'Seedream 系列的较新版本', 'A newer version of the Seedream family']]],
  ['Banana', [['banana', 'Banana 系列基础款', 'Base model of the Banana family'],
    ['banana_pro', 'Banana 系列的 Pro 档', 'Pro tier of the Banana family'],
    ['banana2', 'Banana 系列第二代', 'Second generation of the Banana family']]],
  ['Chat Image', [['chat_image_2', 'Chat Image 系列', 'The Chat Image family'],
    ['chat_image_2.5_flare', '本站所用：概念图和全部道具都由它生成', 'Used here: made the concept and every prop'],
    ['chat_image_2.5_sunburst', 'Chat Image 2.5 的另一个变体', 'Another variant of Chat Image 2.5']]],
];
const CSS = `
.d-imagegen{position:absolute;inset:0;display:flex;flex-direction:column;gap:10px;padding:14px 16px;box-sizing:border-box;color:#e8e6e1;font-size:13px}
.d-imagegen .ig-main{flex:1;min-height:0;display:grid;grid-template-columns:1.45fr 64px 1fr;gap:0}
.d-imagegen .ig-col{display:flex;flex-direction:column;min-height:0;gap:6px}
.d-imagegen .ig-tag{font-size:12px;color:#9aa0ad;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.d-imagegen .ig-tag b{color:#ffb347;font-weight:600;margin-right:6px}
.d-imagegen .ig-concept{flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center}
.d-imagegen .ig-concept img{max-width:100%;max-height:100%;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.45);opacity:0;transform:scale(.97);transition:opacity .7s,transform .7s}
.d-imagegen .ig-concept img.in{opacity:1;transform:none}
.d-imagegen .ig-facts{display:flex;flex-wrap:wrap;gap:5px}
.d-imagegen .ig-facts span{background:#22252c;border:1px solid #2f333c;border-radius:20px;padding:1px 8px;font-size:11.5px;color:#cfd2d8;font-variant-numeric:tabular-nums}
.d-imagegen .ig-props{flex:1;min-height:0;display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:minmax(0,1fr);gap:8px}
.d-imagegen .ig-card{position:relative;min-height:0;display:flex;flex-direction:column;background:#1d2026;border:1px solid #2f333c;border-radius:10px;overflow:hidden;opacity:0;transform:translateY(8px);transition:opacity .5s,transform .5s}
.d-imagegen .ig-card.in{opacity:1;transform:none}
.d-imagegen .ig-card img{flex:1;min-height:0;width:100%;object-fit:cover;display:block;background:#2a2d33}
.d-imagegen .ig-card div{padding:4px 8px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.d-imagegen .ig-tag code{font-size:11px;color:#3fa7a0}
.d-imagegen .ig-empty{grid-column:1/-1;grid-row:1/-1;display:flex;align-items:center;justify-content:center;text-align:center;border:1px dashed #3a3f4a;border-radius:10px;color:#9aa0ad;padding:16px;line-height:1.6}
.d-imagegen svg.ig-links{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.d-imagegen .ig-links path{fill:none;stroke:#ffb347;stroke-width:1.6;stroke-dasharray:5 5;opacity:.8;animation:igflow 1.2s linear infinite}
@keyframes igflow{to{stroke-dashoffset:-20}}
.d-imagegen .ig-cap{line-height:1.6;color:#d8d6d1}
.d-imagegen .ig-cap code{background:#22252c;border-radius:4px;padding:0 4px;color:#ffb347;font-size:12px}
.d-imagegen .ig-models{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px}
.d-imagegen .ig-fam{display:flex;align-items:center;gap:4px}
.d-imagegen .ig-fam>span{font-size:11px;color:#7d8698;margin-right:2px}
.d-imagegen .ig-chip{font:11.5px ui-monospace,Menlo,monospace;background:#1d2026;color:#cfd2d8;border:1px solid #333844;border-radius:6px;padding:2px 7px;cursor:pointer}
.d-imagegen .ig-chip.used{border-color:#e07a3f;color:#ffb347}
.d-imagegen .ig-chip.on{background:#e07a3f;color:#15171c;border-color:#e07a3f}
.d-imagegen .ig-desc{font-size:12px;color:#9aa0ad;min-height:1.4em}
.d-imagegen .ig-desc b{color:#e8e6e1;font-weight:600;font-family:ui-monospace,Menlo,monospace;margin-right:6px}
`;

export default function mount(el, { t, base }) {
  el.classList.add('d-imagegen');
  const timers = [];
  const style = document.createElement('style');
  style.textContent = CSS;
  el.appendChild(style);

  const main = document.createElement('div');
  main.className = 'ig-main';
  main.innerHTML = `
    <div class="ig-col">
      <div class="ig-tag"><b>①</b>${t('文生图 · 一句话 → 整个场景的概念图', 'Text-to-image · one prompt → whole-scene concept')}</div>
      <div class="ig-concept"><img alt=""></div>
      <div class="ig-facts">
        <span>chat_image_2.5_flare</span><span>1536×1024</span><span>quality: medium</span>
        <span>${t('约 25 秒', '~25 s')}</span><span>${t('10 积分', '10 credits')}</span>
      </div>
    </div>
    <div></div>
    <div class="ig-col">
      <div class="ig-tag"><b>②</b>${t('图生图 · 逐个抠出道具', 'Image-to-image · one prop each')} · <code>input = task_id</code></div>
      <div class="ig-props"></div>
    </div>`;
  el.appendChild(main);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'ig-links');
  el.appendChild(svg);

  const cap = document.createElement('div');
  cap.className = 'ig-cap';
  cap.innerHTML = t(
    '① 文生图先画出整个车间的概念图。② 图生图直接把上一个任务的 <code>task_id</code> 当作 <code>input</code>，每次只抠出一个道具——同一张源图，所以所有道具风格统一。③ 这些参考图接着交给「图生模型」，变成 3D。',
    '① Text-to-image paints the whole workshop concept. ② Image-to-image passes the previous task’s <code>task_id</code> straight in as <code>input</code> and isolates one prop at a time — same source, so every prop shares one style. ③ These references then feed image-to-model to become 3D.');
  el.appendChild(cap);

  const models = document.createElement('div');
  models.className = 'ig-models';
  const desc = document.createElement('div');
  desc.className = 'ig-desc';
  const chips = [];
  const pick = (id, zh, en) => {
    chips.forEach((c) => c.classList.toggle('on', c.dataset.id === id));
    desc.innerHTML = `<b>${id}</b>${t(zh, en)}`;
  };
  MODELS.forEach(([fam, list]) => {
    const g = document.createElement('div');
    g.className = 'ig-fam';
    g.innerHTML = `<span>${fam}</span>`;
    list.forEach(([id, zh, en]) => {
      const c = document.createElement('button');
      c.className = 'ig-chip' + (id === 'chat_image_2.5_flare' ? ' used' : '');
      c.dataset.id = id;
      c.textContent = id === 'chat_image_2.5_flare' ? `★ ${id}` : id;
      c.title = t(zh, en);
      c.addEventListener('click', () => pick(id, zh, en));
      c.addEventListener('mouseenter', () => pick(id, zh, en));
      chips.push(c);
      g.appendChild(c);
    });
    models.appendChild(g);
  });
  const modelLabel = document.createElement('div');
  modelLabel.className = 'ig-tag';
  modelLabel.textContent = t('可选模型（点一下看说明）', 'Available models (tap one for a note)');
  el.append(modelLabel, models, desc);
  pick('chat_image_2.5_flare', MODELS[2][1][1][1], MODELS[2][1][1][2]);

  // Concept image
  const conceptImg = main.querySelector('.ig-concept img');
  conceptImg.alt = t('文生图生成的车间概念图', 'Workshop concept from text-to-image');
  conceptImg.addEventListener('load', () => { conceptImg.classList.add('in'); drawLinks(); });
  conceptImg.addEventListener('error', () => { conceptImg.style.display = 'none'; });
  conceptImg.src = `${base}images/workshop-concept-v2.png`;

  // Prop cards: hide any that fail to load.
  const grid = main.querySelector('.ig-props');
  const cards = [];
  let settled = 0;
  const settle = () => {
    settled += 1;
    if (settled < PROPS.length) return;
    const ok = cards.filter((c) => c.isConnected);
    if (!ok.length) {
      const empty = document.createElement('div');
      empty.className = 'ig-empty';
      empty.textContent = t('道具参考图还在生成中，稍后会出现在这里。', 'Prop references are still being generated — they will appear here.');
      grid.appendChild(empty);
    }
    ok.forEach((c, i) => timers.push(setTimeout(() => { c.classList.add('in'); drawLinks(); }, 500 + i * 220)));
    if (ok.length && ok.length <= 2) grid.style.gridTemplateColumns = '1fr';
    drawLinks();
  };
  PROPS.forEach(([name, zh, en]) => {
    const card = document.createElement('div');
    card.className = 'ig-card';
    const img = document.createElement('img');
    img.alt = t(zh, en);
    card.appendChild(img);
    const lab = document.createElement('div');
    lab.textContent = t(zh, en);
    card.appendChild(lab);
    grid.appendChild(card);
    cards.push(card);
    img.addEventListener('load', settle, { once: true });
    img.addEventListener('error', () => { card.remove(); settle(); }, { once: true });
    img.src = `${base}images/${name}.png`;
  });

  // Dashed arrows from the concept's right edge to each visible card.
  function drawLinks() {
    const r0 = el.getBoundingClientRect();
    const ir = conceptImg.getBoundingClientRect();
    const shown = cards.filter((c) => c.isConnected && c.classList.contains('in'));
    if (!ir.width) { svg.innerHTML = ''; return; }
    const x0 = ir.right - r0.left + 4, y0 = ir.top + ir.height / 2 - r0.top;
    const paths = shown.map((c) => {
      const cr = c.getBoundingClientRect();
      const x1 = cr.left - r0.left - 6, y1 = cr.top + cr.height / 2 - r0.top;
      const mx = (x0 + x1) / 2;
      return `<path d="M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1}" marker-end="url(#igArrow)"/>`;
    });
    svg.innerHTML = `<defs><marker id="igArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" style="fill:#ffb347;stroke:none;animation:none"/></marker></defs>${paths.join('')}`;
  }
  const ro = new ResizeObserver(drawLinks);
  ro.observe(el);

  return {
    dispose() {
      timers.forEach(clearTimeout);
      ro.disconnect();
      el.classList.remove('d-imagegen');
      el.innerHTML = '';
    },
  };
}
