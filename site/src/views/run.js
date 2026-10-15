import { createStage } from '../demos/_stage.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const STEP = { ok: ['通过', 'OK'], warn: ['有警告', 'Warning'], fail: ['失败', 'Failed'], skipped: ['跳过', 'Skipped'] };

export function renderRun(view, { t, L, base, data }) {
  const run = data.runs[0];
  if (!run) {
    view.innerHTML = `<section class="run"><div class="run-head"><h1>${t('真实流程正在跑', 'The real run is in progress')}</h1>
      <p class="muted">${t('下面是已经生成的图片，完整记录稍后出现在这里。', 'Images generated so far; the full record will appear here.')}</p></div>
      <div class="gallery">${data.images.map((i) => `<figure><img src="${base}images/${i}.png" alt="${i}"><figcaption>${i}</figcaption></figure>`).join('')}</div></section>`;
    return null;
  }
  const mod = Object.fromEntries(data.modules.map((m) => [m.id, m]));
  const assets = Object.fromEntries((run.assets || []).map((a) => [a.id, a]));
  const credits = run.steps.reduce((s, x) => s + (x.cost?.credits || 0), 0);
  view.innerHTML = `
    <section class="run">
      <div class="run-head">
        <p class="eyebrow">${t('真实运行记录', 'Real run record')} · ${run.order_id}</p>
        <h1>${L(run.title)}</h1>
        <p class="muted">${L(run.note)}</p>
        <div class="run-stats">
          <span><b>${run.steps.length}</b>${t('个步骤', ' steps')}</span>
          <span><b>${(run.assets || []).length}</b>${t('个资产', ' assets')}</span>
          <span><b>${credits}</b> Tripo credits</span>
        </div>
      </div>
      <div class="run-top">
        <div class="viewer"><div class="stage-inner" id="viewer"></div><div class="viewer-label" id="viewer-label"></div></div>
        <div class="renders">${(run.scene?.renders || []).map((r) => `<img src="${base}${r}" alt="">`).join('')}</div>
      </div>
      <ol class="steps">${run.steps.map((s, i) => `
        <li class="step step-${s.status}">
          <div class="step-meta"><span class="step-n">${String(i + 1).padStart(2, '0')}</span>
            <span class="chip chip-${s.status}">${t(...(STEP[s.status] || STEP.ok))}</span></div>
          <div class="step-body">
            <h3>${L(mod[s.module]?.name) || s.module}${s.asset ? ` <small>· ${L(assets[s.asset]?.name) || s.asset}</small>` : ''}</h3>
            <p>${L(s.summary)}</p>
            <div class="artifacts">${(s.artifacts || []).map((a) => a.kind === 'image'
              ? `<figure><img src="${base}${a.path}" alt="" loading="lazy"><figcaption>${L(a.label)}</figcaption></figure>`
              : a.kind === 'model'
                ? `<button class="model-btn" data-path="${a.path}" data-label="${L(a.label)}">◆ ${L(a.label)}</button>`
                : `<a class="file" href="${base}${a.path}" target="_blank">${L(a.label)}</a>`).join('')}</div>
            ${s.metrics ? `<div class="metrics">${Object.entries(s.metrics).map(([k, v]) => `<span><i>${k}</i>${v}</span>`).join('')}</div>` : ''}
          </div>
        </li>`).join('')}</ol>
    </section>`;

  const el = document.getElementById('viewer');
  const stage = createStage(el, { camPos: [1.6, 1.0, 1.9], target: [0, 0.15, 0] });
  const loader = new GLTFLoader();
  let current = null;
  const show = (path, label) => {
    document.getElementById('viewer-label').textContent = label;
    loader.load(`${base}${path}`, (g) => {
      if (current) stage.scene.remove(current);
      current = g.scene;
      const box = new stage.THREE.Box3().setFromObject(current);
      const size = box.getSize(new stage.THREE.Vector3());
      const s = 1.6 / Math.max(size.x, size.y, size.z);
      current.scale.setScalar(s);
      const c = box.getCenter(new stage.THREE.Vector3()).multiplyScalar(s);
      current.position.set(-c.x, -box.min.y * s, -c.z);
      // Blender's procedural wood/glow node trees do not survive glTF export; restore them by material name.
      current.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = true;
        o.receiveShadow = true;
        const name = o.material?.name || '';
        if (name.startsWith('wood')) o.material.color.set(0x7a3f1c);
        if (name.startsWith('glow')) o.material.emissive.set(0xff6a00);
      });
      stage.scene.add(current);
      stage.controls.target.set(0, size.y * s * 0.4, 0);
    });
  };
  const first = run.scene?.model;
  if (first) show(first, t('组装好的场景', 'Assembled scene'));
  view.querySelectorAll('.model-btn').forEach((b) => b.addEventListener('click', () => {
    show(b.dataset.path, b.dataset.label);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));
  view.querySelectorAll('.artifacts img, .renders img').forEach((img) => img.addEventListener('click', () => {
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.innerHTML = `<img src="${img.src}" alt="">`;
    box.onclick = () => box.remove();
    document.body.appendChild(box);
  }));
  return () => stage.dispose();
}
