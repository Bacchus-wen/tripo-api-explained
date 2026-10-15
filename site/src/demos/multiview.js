// 多视图建模 — four photos of one object ([front, left, back, right]) flow into a 3D result.
import * as THREE from 'three';
import { createStage, PALETTE } from './_stage.js';

const VIEWS = [['front', '正面', 'Front', 0], ['left', '左侧', 'Left', -Math.PI / 2],
  ['back', '背面', 'Back', Math.PI], ['right', '右侧', 'Right', Math.PI / 2]];
const CSS = `
.d-multiview .mv-card{position:absolute;width:150px;z-index:4;background:#1d2026;border:1px solid #2f333c;border-radius:10px;overflow:hidden;transition:opacity .4s,filter .4s}
.d-multiview .mv-card canvas{display:block;width:150px;height:118px}
.d-multiview .mv-card div{display:flex;justify-content:space-between;padding:3px 8px;font-size:12px;color:#e8e6e1}
.d-multiview .mv-card b{color:#ffb347;font-weight:600}
.d-multiview .mv-card.off{opacity:.25;filter:grayscale(1)}
.d-multiview svg.mv-flow{position:absolute;inset:0;width:100%;height:100%;z-index:3;pointer-events:none}
.d-multiview .mv-flow path{fill:none;stroke:#b05cc8;stroke-width:1.5;stroke-dasharray:4 6;opacity:.75;animation:mvflow 1s linear infinite}
.d-multiview .mv-flow circle{fill:#ffb347}
@keyframes mvflow{to{stroke-dashoffset:-20}}
.d-multiview .mv-ctl{position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:5;display:flex;gap:8px;align-items:center}
.d-multiview .mv-note{position:absolute;top:50px;left:50%;transform:translateX(-50%);z-index:5;font-size:12px;color:#ffb347;background:rgba(21,23,28,.75);padding:2px 10px;border-radius:12px;white-space:nowrap}
`;

function buildRobot(mats) {
  const g = new THREE.Group();
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  add(new THREE.BoxGeometry(0.5, 0.46, 0.36), mats.body, 0, 0.42, 0);
  add(new THREE.BoxGeometry(0.4, 0.3, 0.32), mats.body, 0, 0.83, 0);
  add(new THREE.BoxGeometry(0.3, 0.09, 0.03), mats.face, 0, 0.86, 0.165);
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.18), mats.dark, 0.1, 1.07, 0);
  add(new THREE.SphereGeometry(0.035, 12, 8), mats.face, 0.1, 1.17, 0);
  add(new THREE.BoxGeometry(0.3, 0.32, 0.12), mats.pack, 0, 0.46, -0.24).userData.detail = true;
  add(new THREE.CylinderGeometry(0.06, 0.06, 0.34, 16), mats.dark, 0.31, 0.42, 0);
  add(new THREE.CylinderGeometry(0.06, 0.06, 0.34, 16), mats.dark, -0.31, 0.42, 0);
  add(new THREE.BoxGeometry(0.02, 0.5, 0.02), mats.dark, -0.4, 0.5, 0.06);
  add(new THREE.BoxGeometry(0.02, 0.14, 0.2), mats.face, -0.4, 0.68, 0.16);
  Object.assign(add(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 16), mats.face, 0, 0.88, -0.17).rotation, { x: Math.PI / 2 });
  g.children.at(-1).userData.detail = true;
  add(new THREE.BoxGeometry(0.16, 0.18, 0.2), mats.dark, 0.12, 0.1, 0);
  add(new THREE.BoxGeometry(0.16, 0.18, 0.2), mats.dark, -0.12, 0.1, 0);
  return g;
}
const makeMats = () => ({
  body: new THREE.MeshStandardMaterial({ color: PALETTE.teal, roughness: 0.5 }),
  face: new THREE.MeshStandardMaterial({ color: PALETTE.orange, roughness: 0.4, emissive: 0x3a1500 }),
  pack: new THREE.MeshStandardMaterial({ color: PALETTE.purple, roughness: 0.5 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x3b4150, roughness: 0.6 }),
});

export default function mount(el, { t }) {
  el.classList.add('d-multiview');
  const style = document.createElement('style');
  style.textContent = CSS;
  el.appendChild(style);
  const stage = createStage(el, { camPos: [0, 1.25, 3.6], target: [0, 0.55, 0] });
  const mats = makeMats();
  const model = buildRobot(mats);
  Object.values(mats).forEach((m) => { m.transparent = true; });
  stage.scene.add(model);

  // Render the four "photos" once with a throwaway renderer.
  const shot = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  shot.setSize(300, 236, false);
  shot.toneMapping = THREE.ACESFilmicToneMapping;
  const pscene = new THREE.Scene();
  pscene.background = new THREE.Color(0xd9dbe0);
  const pm = makeMats();
  pscene.add(buildRobot(pm), new THREE.HemisphereLight(0xffffff, 0x777777, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(2, 3, 2.5);
  pscene.add(sun);
  const pcam = new THREE.PerspectiveCamera(30, 300 / 236, 0.1, 20);
  const cards = VIEWS.map(([id, zh, en, ang], i) => {
    pcam.position.set(Math.sin(ang) * 3, 1.0, Math.cos(ang) * 3);
    pcam.lookAt(0, 0.6, 0);
    shot.render(pscene, pcam);
    const card = document.createElement('div');
    card.className = 'mv-card';
    const c = Object.assign(document.createElement('canvas'), { width: 300, height: 236 });
    c.getContext('2d').drawImage(shot.domElement, 0, 0);
    card.append(c);
    card.insertAdjacentHTML('beforeend', `<div><span>${t(zh, en)}</span><b>${i + 1}</b></div>`);
    const left = i < 2;
    card.style[left ? 'left' : 'right'] = '18px';
    card.style.top = i % 2 === 0 ? '24px' : '206px';
    el.appendChild(card);
    return card;
  });
  pscene.traverse((o) => o.geometry?.dispose());
  Object.values(pm).forEach((m) => m.dispose());
  shot.dispose();
  shot.forceContextLoss();

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'mv-flow');
  el.appendChild(svg);
  const ctl = document.createElement('div');
  ctl.className = 'mv-ctl';
  ctl.innerHTML = `<div class="demo-seg"><button data-v="1">${t('只给 1 张', '1 photo')}</button><button data-v="4" class="on">${t('给 4 个视角', '4 views')}</button></div>
    <div class="demo-seg"><button data-v="re">↻ ${t('重新生成', 'Rebuild')}</button></div>`;
  const note = document.createElement('div');
  note.className = 'mv-note';
  const caption = document.createElement('div');
  caption.className = 'demo-caption';
  caption.textContent = t('给 Tripo 同一物体的几个角度，生成的 3D 比只给一张照片更忠实——看不见的背面不用靠猜。视图顺序固定为 [正面, 左侧, 背面, 右侧]。',
    'Give Tripo several angles of the same object and the 3D result is more faithful than from a single photo — the hidden back isn’t guessed. Views are ordered [front, left, back, right].');
  el.append(ctl, note, caption);

  let views = 4, build = 0;
  const details = model.children.filter((o) => o.userData.detail);
  function drawFlow() {
    const r = el.getBoundingClientRect();
    const cx = r.width / 2, cy = r.height * 0.5;
    svg.innerHTML = cards.map((c, i) => {
      if (views === 1 && i > 0) return '';
      const cr = c.getBoundingClientRect();
      const left = i < 2;
      const x = (left ? cr.right : cr.left) - r.left, y = cr.top + cr.height / 2 - r.top;
      const d = `M${x},${y} C${(x + cx) / 2},${y} ${(x + cx) / 2},${cy} ${cx + (left ? -90 : 90)},${cy}`;
      return `<path id="mvp${i}" d="${d}"/><circle r="3.5"><animateMotion dur="1.6s" begin="${i * 0.25}s" repeatCount="indefinite"><mpath href="#mvp${i}"/></animateMotion></circle>`;
    }).join('');
  }
  function apply() {
    cards.forEach((c, i) => c.classList.toggle('off', views === 1 && i > 0));
    ctl.querySelectorAll('[data-v="1"],[data-v="4"]').forEach((b) => b.classList.toggle('on', Number(b.dataset.v) === views));
    details.forEach((o) => { o.visible = views === 4; });
    mats.body.color.set(views === 4 ? PALETTE.teal : 0x5f8f8c);
    note.textContent = views === 4 ? t('四个角度都看过：背后的背包和按钮也还原了', 'All four angles seen: the backpack and dial on the back are reproduced')
      : t('只有正面：背后的背包和按钮看不到，只能靠猜——于是丢了', 'Front only: the backpack and dial on the back are never seen, so they get lost');
    build = 0;
    drawFlow();
  }
  ctl.addEventListener('click', (e) => {
    const v = e.target.closest('button')?.dataset.v;
    if (v === 're') build = 0; else if (v) { views = Number(v); apply(); }
  });
  apply();
  const ro = new ResizeObserver(drawFlow);
  ro.observe(el);

  stage.onFrame((dt, time) => {
    build = Math.min(1, build + dt / 1.8);
    const e = 1 - Math.pow(1 - build, 3);
    model.scale.setScalar(0.4 + 0.6 * e);
    model.position.y = 0.3 * (1 - e);
    model.rotation.y = time * 0.5;
    Object.values(mats).forEach((m) => { m.opacity = e; m.depthWrite = e > 0.9; });
  });

  return {
    dispose() {
      ro.disconnect();
      stage.dispose();
      el.classList.remove('d-multiview');
      el.innerHTML = '';
    },
  };
}
