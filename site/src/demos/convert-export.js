// 格式转换 — quad vs triangle topology on one model, plus which file format goes where.
import { createStage, createPanel, PALETTE } from './_stage.js';

const FORMATS = [
  ['GLB', '网页和 three.js：一个文件装下模型、贴图', 'Web & three.js: one file holds mesh and textures'],
  ['FBX', 'Unreal / Unity / Maya 等游戏和动画软件', 'Unreal, Unity, Maya and other game/animation tools'],
  ['OBJ', '最通用的老格式，几乎所有软件都能打开', 'The universal classic — almost any app opens it'],
  ['USDZ', '苹果 AR 快速查看（iPhone / iPad）', 'Apple AR Quick Look on iPhone / iPad'],
  ['STL', '3D 打印：只有形状，没有颜色', '3D printing: shape only, no colour'],
];
const CSS = `
.d-convert .cv-list{position:absolute;right:14px;top:14px;width:250px;z-index:5;display:flex;flex-direction:column;gap:6px}
.d-convert .cv-chip{display:flex;gap:10px;align-items:center;text-align:left;background:rgba(29,32,38,.88);border:1px solid #2f333c;border-radius:9px;padding:6px 10px;color:#cfd2d8;font:12px/1.4 inherit;cursor:pointer;transition:border-color .25s,background .25s}
.d-convert .cv-chip b{font:600 12px ui-monospace,Menlo,monospace;color:#e8e6e1;min-width:42px;padding:3px 0;text-align:center;border-radius:5px;background:#2a2e36}
.d-convert .cv-chip.on{border-color:#e07a3f;background:rgba(224,122,63,.14)}
.d-convert .cv-chip.on b{background:#e07a3f;color:#15171c}
.d-convert .cv-note{font-size:11.5px;line-height:1.5;color:#ffb347;background:rgba(21,23,28,.85);border:1px dashed #6b4a2c;border-radius:9px;padding:6px 10px;transition:opacity .3s}
.d-convert .cv-note.dim{opacity:.7;color:#9aa0ad;border-color:#3a3f4a}
`;

// A soft rounded box built from quads only: six subdivided faces pushed toward a sphere.
function quadModel(THREE, N = 6) {
  const pos = [], idx = [], quadEdges = [], triEdges = [];
  const faces = [[0, 1, 2, 1], [0, 1, 2, -1], [1, 2, 0, 1], [1, 2, 0, -1], [2, 0, 1, 1], [2, 0, 1, -1]];
  faces.forEach(([a, b, c, s]) => {
    const start = pos.length / 3;
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const v = [0, 0, 0];
      v[a] = (i / N) * 2 - 1; v[b] = (j / N) * 2 - 1; v[c] = s;
      if (s < 0) v[a] = -v[a];
      const len = Math.hypot(...v), k = 0.55;
      pos.push(...v.map((x, n) => (x * (1 - k) + (x / len) * k) * (n === 1 ? 0.42 : 0.5)));
    }
    const id = (i, j) => start + j * (N + 1) + i;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const q = [id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)];
      idx.push(q[0], q[1], q[2], q[0], q[2], q[3]);
      for (let e = 0; e < 4; e++) quadEdges.push(q[e], q[(e + 1) % 4]);
      triEdges.push(q[0], q[2]);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const lines = (list) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', geo.getAttribute('position'));
    g.setIndex(list);
    return g;
  };
  return { geo, quad: lines(quadEdges), tri: lines([...quadEdges, ...triEdges]), quads: idx.length / 6 };
}

export default function mount(el, { t }) {
  el.classList.add('d-convert');
  const style = document.createElement('style');
  style.textContent = CSS;
  el.appendChild(style);
  const stage = createStage(el, { camPos: [1.9, 1.5, 2.4], target: [-0.35, 0.5, 0] });
  const { THREE, scene } = stage;
  const m = quadModel(THREE);
  const group = new THREE.Group();
  group.position.set(-0.35, 0.5, 0);
  scene.add(group);
  const solid = new THREE.Mesh(m.geo, new THREE.MeshStandardMaterial({
    color: PALETTE.orange, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  }));
  solid.castShadow = true;
  const wireMat = new THREE.LineBasicMaterial({ color: 0x15171c, transparent: true, opacity: 0.85 });
  const quadWire = new THREE.LineSegments(m.quad, wireMat);
  const triWire = new THREE.LineSegments(m.tri, wireMat);
  group.add(solid, quadWire, triWire);
  stage.onFrame((dt) => { group.rotation.y += dt * 0.45; });

  const panel = createPanel(el);
  const setStat = panel.stat();
  const list = document.createElement('div');
  list.className = 'cv-list';
  const note = document.createElement('div');
  note.className = 'cv-note';
  note.textContent = t('注：H 系列「图生模型」若选择四边面，输出会被强制为 FBX。',
    'Note: on H-series image-to-model, choosing quads forces FBX output.');
  const chips = FORMATS.map(([id, zh, en]) => {
    const b = document.createElement('button');
    b.className = 'cv-chip';
    b.dataset.id = id;
    b.innerHTML = `<b>${id}</b><span>${t(zh, en)}</span>`;
    b.addEventListener('click', () => pickFormat(id));
    list.appendChild(b);
    return b;
  });
  list.appendChild(note);
  el.appendChild(list);
  let topo = 'tri';
  const pickFormat = (id) => chips.forEach((c) => c.classList.toggle('on', c.dataset.id === id));
  const setTopo = (v) => {
    topo = v;
    quadWire.visible = v === 'quad';
    triWire.visible = v === 'tri';
    note.classList.toggle('dim', v !== 'quad');
    if (v === 'quad') pickFormat('FBX');
    setStat(v === 'quad'
      ? t(`四边面 ${m.quads} 个 · 布线整齐，方便再编辑和做动画`, `${m.quads} quads · clean edge loops, easy to edit and animate`)
      : t(`三角面 ${m.quads * 2} 个 · 引擎和打印机最终都吃三角面`, `${m.quads * 2} triangles · what engines and printers ultimately consume`));
  };
  panel.buttons(t('拓扑', 'Topology'), [['tri', t('三角面', 'Triangles')], ['quad', t('四边面', 'Quads')]], 'tri', setTopo);
  panel.caption(t('同一个模型可以导出成不同格式、不同面型：先想好它要去哪里（网页、游戏引擎、AR 还是打印机），再选格式。',
    'The same model can be exported in different formats and face types — decide where it is going (web, game engine, AR or a printer), then pick the format.'));
  setTopo(topo);
  pickFormat('GLB');

  return {
    dispose() {
      panel.dispose();
      m.quad.dispose();
      m.tri.dispose();
      stage.dispose();
      el.classList.remove('d-convert');
      el.innerHTML = '';
    },
  };
}
