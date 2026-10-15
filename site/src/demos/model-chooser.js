// Demo: H-series (dense, smooth) vs P1 (low-poly with an exact face budget) on one sculpture.
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createStage, createPanel, PALETTE } from './_stage.js';

export default function mount(el, { t }) {
  const stage = createStage(el, { camPos: [2.3, 1.6, 2.7], target: [0, 0.72, 0] });
  const { THREE, scene } = stage;

  // Dense source: torus-knot sculpture with fine rings carved along the tube.
  let src = new THREE.TorusKnotGeometry(0.42, 0.14, 400, 48, 2, 3);
  const pos = src.attributes.position, nor = src.attributes.normal, uv = src.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const d = 0.006 * Math.sin(uv.getX(i) * Math.PI * 2 * 120) + 0.02 * Math.sin(uv.getX(i) * Math.PI * 2 * 9);
    pos.setXYZ(i, pos.getX(i) + nor.getX(i) * d, pos.getY(i) + nor.getY(i) * d, pos.getZ(i) + nor.getZ(i) * d);
  }
  src.deleteAttribute('uv');
  src.deleteAttribute('normal');
  const dense = mergeVertices(src, 1e-4);
  src.dispose();
  dense.computeVertexNormals();
  const denseTris = dense.index.count / 3;

  const hMat = new THREE.MeshPhysicalMaterial({ color: 0xd9cbb8, roughness: 0.32, metalness: 0.0, clearcoat: 0.5, clearcoatRoughness: 0.25 });
  const pMat = new THREE.MeshStandardMaterial({ color: PALETTE.teal, roughness: 0.6, flatShading: true });
  const mesh = new THREE.Mesh(dense, hMat);
  mesh.castShadow = true;
  const pivot = new THREE.Group();
  pivot.position.y = 0.74;
  pivot.add(mesh);
  scene.add(pivot);

  const wireMat = new THREE.LineBasicMaterial({ color: 0xf4f1ea, transparent: true, opacity: 0.4 });
  let wire = null;
  let showWire = false;
  function refreshWire() {
    if (wire) { pivot.remove(wire); wire.geometry.dispose(); wire = null; }
    if (!showWire) return;
    wire = new THREE.LineSegments(new THREE.WireframeGeometry(mesh.geometry), wireMat);
    wire.scale.setScalar(1.002);
    pivot.add(wire);
  }

  // UI
  const panel = createPanel(el);
  let series = 'h', faceLimit = 2000, lowGeo = null, busy = false, pending = false, disposed = false;
  panel.buttons(t('模型', 'Model'), [['h', 'H · v3.1-20260211'], ['p', 'P1 · P1-20260311']], 'h', (v) => {
    series = v;
    applySeries();
  });
  panel.slider('face_limit', { min: 50, max: 20000, step: 50, value: faceLimit }, (v) => {
    faceLimit = v;
    if (series === 'p') requestSimplify();
  });
  const rows = el.querySelectorAll('.demo-panel .demo-row');
  const limitRow = rows[rows.length - 1];
  const limitInput = limitRow.querySelector('input');
  panel.buttons(t('线框', 'Wireframe'), [['off', t('关', 'Off')], ['on', t('开', 'On')]], 'off', (v) => {
    showWire = v === 'on';
    refreshWire();
  });
  const stat = panel.stat();
  const fmt = (n) => n.toLocaleString('en-US');

  function updateStat() {
    const tris = mesh.geometry.index ? mesh.geometry.index.count / 3 : mesh.geometry.attributes.position.count / 3;
    stat(series === 'h'
      ? t(`三角面：${fmt(tris)}（高精度、平滑）`, `Triangles: ${fmt(tris)} (high precision, smooth)`)
      : t(`三角面：${fmt(tris)}  ≤ face_limit ${fmt(faceLimit)}`, `Triangles: ${fmt(tris)}  ≤ face_limit ${fmt(faceLimit)}`));
  }

  async function requestSimplify() {
    if (busy) { pending = true; return; }
    busy = true;
    const target = Math.min(faceLimit, denseTris);
    try {
      const verts = dense.attributes.position.count;
      const remove = Math.floor(verts * (1 - target / denseTris));
      let geo = await new SimplifyModifier().modify(dense, remove);
      // Never exceed the face budget: trim a little further if the simplifier overshot.
      for (let k = 0; k < 4 && geo.index.count / 3 > target; k++) {
        const over = geo.index.count / 3 / target;
        const next = await new SimplifyModifier().modify(geo, Math.ceil(geo.attributes.position.count * (1 - 1 / over)) + 1);
        geo.dispose();
        geo = next;
      }
      if (disposed) { geo.dispose(); return; }
      if (lowGeo) lowGeo.dispose();
      lowGeo = geo;
      if (series === 'p') { mesh.geometry = lowGeo; refreshWire(); updateStat(); }
    } catch (err) {
      stat(t('简化失败', 'Simplification unavailable'));
    } finally {
      busy = false;
      if (pending && !disposed) { pending = false; requestSimplify(); }
    }
  }

  function applySeries() {
    const isP = series === 'p';
    limitInput.disabled = !isP;
    limitRow.style.opacity = isP ? '1' : '0.4';
    mesh.material = isP ? pMat : hMat;
    if (isP) {
      if (lowGeo) mesh.geometry = lowGeo;
      requestSimplify();
    } else {
      mesh.geometry = dense;
    }
    refreshWire();
    updateStat();
    panel.caption(isP
      ? t('P1（P1-20260311）：干净的低面数模型，面数严格控制在 face_limit 以内——适合直接放进游戏、手机和网页。拖动滑块，三角面会真实减少。',
        'P1 (P1-20260311): clean, game-ready low-poly with an exact face budget (face_limit). Drag the slider — the triangles are really being removed.')
      : t('H 系列（v3.1-20260211）：高精度、表面平滑、细节密集——适合主角级资产、宣传图和 3D 打印。',
        'H-series (v3.1-20260211): high precision, smooth and densely detailed — best for hero assets, renders and 3D printing.'));
  }
  applySeries();

  stage.onFrame((dt) => { pivot.rotation.y += dt * 0.25; });

  return {
    dispose() {
      disposed = true;
      if (wire) { pivot.remove(wire); wire.geometry.dispose(); }
      mesh.geometry = dense;
      if (lowGeo) lowGeo.dispose();
      hMat.dispose(); pMat.dispose(); wireMat.dispose();
      stage.dispose();
      panel.dispose();
    },
  };
}
