// Demo: H-series (dense, smooth hero dragon) vs P1 (flat-shaded low-poly with an exact face budget).
// Also used by the "retopology" feature: the face_limit slider really decimates the mesh.
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createStage, createPanel } from './_stage.js';
import { buildDragon } from './lib/hero-dragon.js';

export default function mount(el, { t }) {
  const stage = createStage(el, { camPos: [1.55, 1.05, 2.05], target: [0, 0.44, 0], bloom: 0.35 });
  const { THREE, scene } = stage;

  const hero = buildDragon({ detail: 'high' });
  const low = buildDragon({ detail: 'low' });
  const lowSrc = low.mergedGeometry;
  const srcTris = lowSrc.index.count / 3;
  const pivot = new THREE.Group();
  pivot.rotation.y = -0.35;
  scene.add(pivot);
  pivot.add(hero.group);

  const pMat = new THREE.MeshStandardMaterial({ color: 0xe07a3f, roughness: 0.55, flatShading: true });
  const pMesh = new THREE.Mesh(lowSrc, pMat);
  pMesh.castShadow = true;
  pMesh.visible = false;
  pivot.add(pMesh);

  const heroTris = (() => {
    let n = 0;
    hero.group.traverse((o) => { if (o.isMesh) n += o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3; });
    return n;
  })();

  const wireMat = new THREE.MeshBasicMaterial({ color: 0xfff1de, wireframe: true, transparent: true, opacity: 0.35, depthWrite: false });
  const wire = new THREE.Mesh(lowSrc, wireMat);
  wire.scale.setScalar(1.002);
  wire.visible = false;
  pivot.add(wire);

  // ---- UI
  const panel = createPanel(el);
  let series = 'h', faceLimit = 2000, showWire = false, disposed = false;
  panel.buttons(t('模型', 'Model'), [['h', 'H · v3.1-20260211'], ['p', 'P1 · P1-20260311']], 'h', (v) => {
    if (v === series) return;
    series = v;
    pulse = 1;
    applySeries();
  });
  const slider = panel.slider('face_limit', { min: 50, max: 20000, step: 50, value: faceLimit }, (v) => {
    faceLimit = v;
    requestSimplify();
  });
  const limitRow = slider.input.closest('.demo-row');
  panel.buttons(t('线框', 'Wireframe'), [['off', t('关', 'Off')], ['on', t('开', 'On')]], 'off', (v) => {
    showWire = v === 'on';
    applySeries();
  });
  const stat = panel.stat();
  const fmt = (n) => n.toLocaleString('en-US');

  // ---- live decimation with a cache of levels and a debounce
  const cache = new Map(); // limit -> geometry
  const modifier = new SimplifyModifier();
  let timer = 0;
  async function levelFor(limit) {
    const target = Math.min(limit, srcTris);
    if (target >= srcTris) return lowSrc;
    if (cache.has(target)) return cache.get(target);
    const verts = lowSrc.attributes.position.count;
    const tc = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
    // always simplify from the clean source (never chain), removing more until under budget
    let keep = Math.min(verts - 1, Math.floor(target * 0.5));
    let geo = await modifier.modify(lowSrc, verts - keep);
    for (let k = 0; k < 6 && tc(geo) > target; k++) {
      keep = Math.max(4, Math.floor(keep * (target / tc(geo)) * 0.97));
      geo.dispose();
      geo = await modifier.modify(lowSrc, verts - keep);
    }
    if (tc(geo) > target) { // last resort: drop trailing triangles so the budget always holds
      const flat = geo.index ? geo.toNonIndexed() : geo;
      const cut = new THREE.BufferGeometry();
      cut.setAttribute('position', new THREE.BufferAttribute(flat.attributes.position.array.slice(0, target * 9), 3));
      if (flat !== geo) flat.dispose();
      geo.dispose();
      geo = cut;
    }
    geo.computeVertexNormals();
    cache.set(target, geo);
    return geo;
  }
  function requestSimplify() {
    clearTimeout(timer);
    stat(t('正在按 face_limit 减面…', 'Decimating to face_limit…'));
    timer = setTimeout(async () => {
      if (disposed) return;
      try {
        const want = faceLimit;
        const g = await levelFor(want);
        if (disposed || want !== faceLimit) return;
        pMesh.geometry = g;
        if (series === 'p') wire.geometry = g;
      } catch (err) {
        stat(t('简化失败', 'Simplification unavailable'));
        return;
      }
      updateStat();
    }, 120);
  }

  function tris(g) { return g.index ? g.index.count / 3 : g.attributes.position.count / 3; }
  function updateStat() {
    stat(series === 'h'
      ? t(`三角面：${fmt(heroTris)}（高精度、平滑）`, `Triangles: ${fmt(heroTris)} (high precision, smooth)`)
      : t(`三角面：${fmt(tris(pMesh.geometry))}  ≤ face_limit ${fmt(faceLimit)}`,
        `Triangles: ${fmt(tris(pMesh.geometry))}  ≤ face_limit ${fmt(faceLimit)}`));
  }

  function applySeries() {
    const isP = series === 'p';
    slider.input.disabled = !isP;
    limitRow.style.opacity = isP ? '1' : '0.4';
    hero.group.visible = !isP;
    pMesh.visible = isP;
    wire.geometry = isP ? pMesh.geometry : hero.bodyMesh.geometry;
    wire.position.copy(isP ? pMesh.position : hero.bodyMesh.position);
    wire.visible = showWire;
    updateStat();
    panel.caption(isP
      ? t('P1（P1-20260311）：同一只小龙，变成干净的低面数模型，面数严格控制在 face_limit（50–20,000）以内——适合直接放进游戏、手机和网页。拖动滑块，三角面会真实减少。',
        'P1 (P1-20260311): the same dragon as clean, game-ready low-poly with an exact face budget (face_limit 50–20,000). Drag the slider — triangles are really being removed.')
      : t('H 系列（v3.1-20260211）：高精度、表面平滑、细节密集——鳞片、爪子、眼睛的高光都在。适合主角级资产、宣传图和 3D 打印。',
        'H-series (v3.1-20260211): high precision, smooth and densely detailed — scales, claws and glossy eyes intact. Best for hero assets, renders and 3D printing.'));
  }
  applySeries();
  requestSimplify();

  let pulse = 0;
  stage.onFrame((dt, time) => {
    hero.update(dt, time);
    if (pulse > 0) {
      pulse = Math.max(0, pulse - dt * 2.6);
      const k = pulse;
      pivot.scale.setScalar(1 - 0.12 * Math.sin(k * Math.PI) * k);
      pivot.rotation.y -= dt * 4 * k;
    }
  });

  return {
    dispose() {
      disposed = true;
      clearTimeout(timer);
      pivot.remove(pMesh, wire);
      cache.forEach((g) => g.dispose());
      hero.dispose();
      low.dispose();
      pMat.dispose();
      wireMat.dispose();
      stage.dispose();
      panel.dispose();
    },
  };
}
