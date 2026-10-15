// 文生图 / 图生图 — cinematic explainer built from the real images made for this site:
// a prompt is typed → the concept develops → four props are boxed and fly out into
// image-to-image reference cards (input = the concept's task_id) → on to image-to-3D.
import { createPanel } from './_stage.js';
import { IG_CSS } from './lib/info-imagegen-css.js';
import { createModelSheet } from './lib/info-imagegen-models.js';
import { createZoom } from './lib/info-zoom.js';
import { createClock, createBag, injectStyle, h, preload, relRect, svgEl, prefersReduced, ease } from './lib/info-motion.js';

const CONCEPT = 'workshop-concept-v2';
const TASK = '0d626fb5';
const PROMPT = 'Stylized 3D miniature diorama of an "AI 3D asset production workshop" on a warm-wood tabletop, 3/4 isometric camera, soft warm key light… four machines on a conveyor: generator, workbench, camera pedestal, shelf --no text, logos, people';
// [file, zh, en, box on the concept as x, y, w, h fractions]
const PROPS = [
  ['prop-printer-ref-v1', '生成机', 'Generator', [0.04, 0.145, 0.21, 0.32]],
  ['prop-workbench-ref-v1', '修整工作台', 'Workbench', [0.285, 0.25, 0.19, 0.31]],
  ['prop-critic-ref-v1', '多机位展台', 'Camera stand', [0.515, 0.265, 0.2, 0.37]],
  ['prop-shelf-ref-v1', '成品货架', 'Shelf', [0.77, 0.195, 0.215, 0.49]],
];
const bez = (a, b, c, d, k) => (1 - k) ** 3 * a + 3 * (1 - k) ** 2 * k * b + 3 * (1 - k) * k * k * c + k ** 3 * d;

export default function mount(el, { t, base }) {
  el.classList.add('d-ig');
  injectStyle(el, IG_CSS);
  const clock = createClock();
  const bag = createBag();
  const panel = createPanel(el);
  const zoom = createZoom(el);
  const sheet = createModelSheet(el, t);
  const src = (n) => `${base}images/${n}.png`;

  // ---- layout ----
  const head1 = h('div.ig-head', {}, `<b>1</b><span>${t('文生图', 'Text-to-image')} · <code>POST /generation/text-to-image</code></span>`);
  const prompt = h('div.ig-prompt');
  const img = h('img', { alt: t('文生图生成的车间概念图', 'Workshop concept from text-to-image') });
  const noise = h('canvas', { width: 120, height: 80 });
  const scan = h('div.ig-scan');
  const status = h('div.ig-status');
  const frame = h('div.ig-frame', {}, [img, noise, scan, status]);
  const facts = h('div.ig-facts');
  [['chat_image_2.5_flare', 1], ['1536×1024'], ['quality: medium'], [t('约 25 秒', '~25 s')], ['10 credits', 1]].forEach(([s, hl]) =>
    facts.append(h(`span${hl ? '.hl' : ''}`, { text: s })));
  const left = h('div.ig-col', {}, [head1, prompt, h('div.ig-stagewrap', {}, [frame]), facts]);
  const head2 = h('div.ig-head', {}, `<b>2</b><span>${t('图生图', 'Image-to-image')} · <code>input = ${t('上一个任务的 task_id', 'the previous task_id')}</code></span>`);
  const grid = h('div.ig-cards');
  const right = h('div.ig-col', {}, [head2, grid]);
  const main = h('div.ig-main', {}, [left, right]);
  const svg = svgEl('svg', { class: 'ig-links' });
  const to3d = h('div.ig-to3d', {}, `<span class="arr">→</span><b>${t('图生 3D', 'Image-to-3D')}</b><small>${t('每张参考图 → 一个模型', 'one reference → one model')}</small>`);
  el.append(main, svg, to3d);

  const panelEl = el.querySelector('.demo-panel');
  const replayBtn = h('button', { type: 'button', text: `↻ ${t('重播', 'Replay')}` });
  const modelBtn = h('button', { type: 'button', text: `${t('模型', 'Models')} · 8` });
  const steps = h('div.ig-steps', {}, '<i></i><i></i><i></i>');
  panelEl.append(h('div.demo-row', {}, [h('div.demo-seg', {}, [replayBtn, modelBtn]), steps]));
  const setStep = (n, zh, en) => {
    [...steps.children].forEach((d, i) => d.classList.toggle('on', i < n));
    head1.classList.toggle('on', n >= 1);
    head2.classList.toggle('on', n >= 2);
    panel.caption(t(zh, en));
  };

  // ---- state ----
  let cards = []; // { el, thumb, ref, box, name, zh, en }
  let conceptOk = false;
  let developing = false;
  const nctx = noise.getContext('2d');
  const nData = nctx.createImageData(120, 80);
  const drawNoise = () => {
    const d = nData.data;
    for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255; d[i] = v; d[i + 1] = v * 0.82; d[i + 2] = v * 0.6; d[i + 3] = 255; }
    nctx.putImageData(nData, 0, 0);
  };
  clock.onFrame(() => { if (developing) drawNoise(); });

  const typeTo = (k) => {
    const n = Math.round(PROMPT.length * k);
    prompt.innerHTML = `<i>prompt:</i> ${PROMPT.slice(0, n).replace(/</g, '&lt;')}${k < 1 ? '<span class="caret"></span>' : ''}`;
  };
  const develop = (k) => {
    img.style.opacity = Math.min(1, k * 3);
    img.style.filter = `blur(${22 * (1 - k)}px) saturate(${0.2 + 0.8 * k}) brightness(${0.7 + 0.3 * k})`;
    img.style.transform = `scale(${1.08 - 0.08 * k})`;
    noise.style.opacity = 0.75 * (1 - k);
    scan.style.opacity = k < 1 ? 1 : 0;
    scan.style.top = `${k * 100}%`;
  };
  const setStatus = (ok) => {
    status.className = `ig-status${ok ? ' ok' : ''}`;
    status.innerHTML = ok ? `<i></i>success · task ${TASK}…` : `<i></i>running · ${t('约 25 秒', '~25 s')}`;
    status.style.opacity = 1;
  };
  const geom = (c) => {
    const b = relRect(c.box, el), r = relRect(c.thumb, el);
    const x0 = b.x + b.w, y0 = b.cy, x1 = r.x - 6, y1 = r.cy;
    const dx = Math.max(40, x1 - x0);
    return { b, r, p: [x0, y0, x0 + dx * 0.55, y0, x1 - dx * 0.4, y1, x1, y1] };
  };
  const pathD = ({ p }) => `M${p[0]},${p[1]} C${p[2]},${p[3]} ${p[4]},${p[5]} ${p[6]},${p[7]}`;
  const redrawLinks = () => {
    svg.querySelectorAll('path.flow').forEach((n) => n.remove());
    cards.filter((c) => c.el.classList.contains('got') && conceptOk).forEach((c) =>
      svg.append(svgEl('path', { class: 'flow', d: pathD(geom(c)) })));
  };

  function reset() {
    clock.clear();
    developing = false;
    svg.innerHTML = '';
    el.querySelectorAll('.ig-ghost').forEach((n) => n.remove());
    typeTo(0);
    [...facts.children].forEach((s) => s.classList.remove('in'));
    develop(0);
    status.style.opacity = 0;
    cards.forEach((c) => { c.el.classList.remove('got'); c.box.classList.remove('in'); c.rect.style.strokeDashoffset = 1; });
    to3d.classList.remove('in');
  }
  function finalState() {
    reset();
    typeTo(1);
    [...facts.children].forEach((s) => s.classList.add('in'));
    develop(1);
    setStatus(true);
    cards.forEach((c) => { c.el.classList.add('got'); c.box.classList.add('in'); c.rect.style.strokeDashoffset = 0; });
    to3d.classList.add('in');
    setStep(3, '文生图出概念图 → 图生图用它的 task_id 逐个抠出道具 → 交给图生 3D。点任意图片可放大。',
      'Text-to-image makes the concept → image-to-image reuses its task_id to isolate each prop → on to image-to-3D. Click any image to zoom.');
    redrawLinks();
  }
  function fly(c, at) {
    clock.at(at, () => { c.box.classList.add('in'); });
    clock.tween(at, 320, (k) => { c.rect.style.strokeDashoffset = 1 - k; });
    const path = svgEl('path');
    let g = null, ghost = null, len = 1;
    clock.at(at + 300, () => {
      g = geom(c);
      path.setAttribute('d', pathD(g));
      svg.append(path);
      len = path.getTotalLength();
      path.style.strokeDasharray = `${len} ${len}`;
      path.style.strokeDashoffset = len;
      const [x, y, w, hh] = c.frac;
      ghost = h('div.ig-ghost', { style: {
        left: `${g.b.x}px`, top: `${g.b.y}px`, width: `${g.b.w}px`, height: `${g.b.h}px`, backgroundImage: `url(${src(CONCEPT)})`,
        backgroundSize: `${100 / w}% ${100 / hh}%`, backgroundPosition: `${(x / (1 - w)) * 100}% ${(y / (1 - hh)) * 100}%` } });
      el.append(ghost);
    });
    clock.tween(at + 320, 760, (k) => {
      if (!ghost) return;
      path.style.strokeDashoffset = len * (1 - Math.min(1, k * 1.3));
      const { b, r, p } = g;
      const s = Math.min(r.w / b.w, r.h / b.h) * 0.92;
      const cx = bez(p[0] - b.w / 2, p[2], p[4], r.cx, k), cy = bez(p[1], p[3], p[5], r.cy, k);
      const sc = 1 + (s - 1) * k;
      Object.assign(ghost.style, { left: `${cx - (b.w * sc) / 2}px`, top: `${cy - (b.h * sc) / 2}px`, width: `${b.w * sc}px`, height: `${b.h * sc}px` });
    }, ease.inOut);
    clock.at(at + 1100, () => {
      c.el.classList.add('got');
      ghost?.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: 380, fill: 'forwards' });
      path.classList.add('flow');
      path.style.strokeDasharray = '';
      path.style.strokeDashoffset = '';
    });
    clock.at(at + 1500, () => ghost?.remove());
  }
  function play() {
    sheet.toggle(false);
    if (prefersReduced()) { finalState(); return; }
    reset();
    setStep(1, '① 文生图：一句提示词 → 整个车间的概念图', '① Text-to-image: one prompt → the whole workshop concept');
    clock.tween(0, 1500, (k) => typeTo(k), (k) => k);
    [...facts.children].forEach((s, i) => clock.at(1500 + i * 90, () => s.classList.add('in')));
    clock.at(1650, () => { if (conceptOk) { setStatus(false); developing = true; } });
    clock.tween(1700, 2300, (k) => develop(k), ease.inOut);
    clock.at(4000, () => { developing = false; if (conceptOk) setStatus(true); });
    const t2 = 4500;
    clock.at(t2, () => setStep(2, `② 图生图：把概念图的 task_id（${TASK}…）当 input，每次只抠出一个道具——同一张源图，风格天然统一`,
      `② Image-to-image: the concept's task_id (${TASK}…) goes in as input, one prop per call — one source, so every prop shares the look`));
    cards.forEach((c, i) => (conceptOk ? fly(c, t2 + 400 + i * 650) : clock.at(t2 + 400 + i * 300, () => c.el.classList.add('got'))));
    clock.at(t2 + 600 + cards.length * 650 + 700, () => {
      to3d.classList.add('in');
      setStep(3, '③ 干净的单物体参考图 → 交给「图生 3D」变成模型。点任意图片可放大。', '③ Clean single-object references → image-to-3D turns each into a model. Click any image to zoom.');
    });
  }

  // ---- interactions ----
  bag.on(replayBtn, 'click', play);
  bag.on(modelBtn, 'click', (e) => { e.stopPropagation(); sheet.toggle(); });
  bag.on(el, 'click', (e) => { if (sheet.open && !sheet.contains(e.target) && e.target !== modelBtn) sheet.toggle(false); });
  bag.on(frame, 'click', () => conceptOk && zoom.open(src(CONCEPT), frame, `${t('文生图概念图', 'Text-to-image concept')} · <code>chat_image_2.5_flare · 1536×1024 · task ${TASK}…</code>`));
  const ro = new ResizeObserver(() => redrawLinks());
  ro.observe(el);
  bag.add(() => ro.disconnect());

  // ---- load: only request files listed in index.json, so missing images never 404 ----
  let alive = true;
  const listed = fetch(`${base}index.json`).then((r) => (r.ok ? r.json() : null)).then((d) => d?.images || null).catch(() => null);
  listed.then(async (names) => {
    const want = (n) => !names || names.includes(n);
    const [cImg, ...pImgs] = await Promise.all([CONCEPT, ...PROPS.map((p) => p[0])].map((n) => (want(n) ? preload(src(n)) : null)));
    if (!alive) return;
    conceptOk = !!cImg;
    if (conceptOk) img.src = cImg.src;
    else frame.append(h('div.ig-empty', { text: t('概念图还没生成', 'Concept image not generated yet') }));
    PROPS.forEach(([name, zh, en, frac], i) => {
      if (!pImgs[i]) return;
      const box = h('div.ig-box', { style: { left: `${frac[0] * 100}%`, top: `${frac[1] * 100}%`, width: `${frac[2] * 100}%`, height: `${frac[3] * 100}%` } },
        `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="1" y="1" width="98" height="98" rx="4" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/></svg><em>${t(zh, en)}</em>`);
      if (conceptOk) frame.append(box);
      const ref = h('img', { alt: t(zh, en), src: pImgs[i].src });
      const thumb = h('div.ig-thumb', {}, [ref]);
      const card = h('div.ig-card', {}, [thumb, h('div.ig-lab', {}, `<span>${t(zh, en)}</span><code>← ${TASK}</code>`)]);
      grid.append(card);
      const c = { el: card, thumb, box, rect: box.querySelector('rect'), frac };
      bag.on(card, 'click', () => zoom.open(ref.src, ref, `${t('图生图 · 从概念图中只抠出', 'Image-to-image · isolated from the concept:')} ${t(zh, en)} · <code>input = task ${TASK}…</code>`));
      cards.push(c);
    });
    if (!cards.length) grid.append(h('div.ig-empty', { style: { position: 'relative' }, text: t('道具参考图还在生成中，稍后会出现在这里。', 'Prop references are still being generated — they will appear here.') }));
    if (cards.length && cards.length <= 2) grid.classList.add('one');
    play();
  });

  return {
    dispose() {
      alive = false;
      clock.dispose();
      bag.dispose();
      zoom.dispose();
      sheet.dispose();
      panel.dispose();
      el.classList.remove('d-ig');
      el.innerHTML = '';
    },
  };
}
