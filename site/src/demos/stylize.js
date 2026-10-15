// Demo: one base model (a rubber duck) restyled as original / voxel bricks / faceted low-poly.
import { createStage, createPanel } from './_stage.js';

// The duck as ellipsoids: [name, centre, radii, colour]. Later entries win in voxel tests.
const PARTS = [
  ['body', [0, 0.3, 0], [0.36, 0.26, 0.46], 0xf5c518],
  ['tail', [0, 0.46, -0.38], [0.13, 0.12, 0.15], 0xf5c518],
  ['wingL', [0.31, 0.36, -0.03], [0.08, 0.13, 0.26], 0xe2ae0e],
  ['wingR', [-0.31, 0.36, -0.03], [0.08, 0.13, 0.26], 0xe2ae0e],
  ['head', [0, 0.72, 0.2], [0.21, 0.2, 0.21], 0xf5c518],
  ['beak', [0, 0.67, 0.42], [0.11, 0.045, 0.11], 0xe8742c],
  ['eyeL', [0.09, 0.78, 0.37], [0.04, 0.045, 0.03], 0x1b1b22],
  ['eyeR', [-0.09, 0.78, 0.37], [0.04, 0.045, 0.03], 0x1b1b22],
];

export default function mount(el, { t }) {
  const stage = createStage(el, { camPos: [1.75, 1.15, 2.0], target: [0, 0.42, 0] });
  const { THREE, scene } = stage;
  const owned = [];
  const own = (x) => { owned.push(x); return x; };

  // Smooth original and faceted low-poly versions share the same primitives.
  function buildMeshModel(flat) {
    const g = new THREE.Group();
    const geo = own(flat ? new THREE.IcosahedronGeometry(1, 1) : new THREE.SphereGeometry(1, 64, 40));
    const small = own(flat ? new THREE.IcosahedronGeometry(1, 0) : geo);
    for (const [name, c, r, color] of PARTS) {
      const mat = own(new THREE.MeshStandardMaterial({ color, roughness: flat ? 0.75 : 0.32, flatShading: flat }));
      const m = new THREE.Mesh(name.startsWith('eye') ? small : geo, mat);
      m.position.set(...c);
      m.scale.set(...r);
      m.castShadow = true;
      g.add(m);
    }
    return g;
  }
  const original = buildMeshModel(false);
  const lowpoly = buildMeshModel(true);

  // Voxelize: sample a grid, keep cells inside the duck that touch the outside (surface shell only).
  const S = 0.04;
  const inside = (x, y, z) => {
    let hit = -1;
    PARTS.forEach(([name, c, r], i) => {
      const grow = name.startsWith('eye') ? S * 0.2 : 0;
      const dx = (x - c[0]) / (r[0] + grow), dy = (y - c[1]) / (r[1] + grow), dz = (z - c[2]) / (r[2] + grow);
      if (dx * dx + dy * dy + dz * dz <= 1) hit = i;
    });
    return hit;
  };
  const cells = [];
  for (let x = -0.42; x <= 0.42; x += S) {
    for (let y = S / 2; y <= 0.96; y += S) {
      for (let z = -0.56; z <= 0.56; z += S) {
        const id = inside(x, y, z);
        if (id < 0) continue;
        const shell = [[S, 0, 0], [-S, 0, 0], [0, S, 0], [0, -S, 0], [0, 0, S], [0, 0, -S]]
          .some(([a, b, c]) => inside(x + a, y + b, z + c) < 0);
        if (shell || id >= 5) cells.push([x, y, z, id]);
      }
    }
  }
  const voxCount = Math.min(cells.length, 6000);
  const vox = new THREE.InstancedMesh(own(new THREE.BoxGeometry(S * 0.92, S * 0.92, S * 0.92)),
    own(new THREE.MeshStandardMaterial({ roughness: 0.45 })), voxCount);
  vox.castShadow = true;
  const col = new THREE.Color(), mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < voxCount; i++) {
    col.setHex(PARTS[cells[i][3]][3]).offsetHSL(0, 0, (Math.random() - 0.5) * 0.05);
    vox.setColorAt(i, col);
  }
  const setVoxels = (k) => {
    for (let i = 0; i < voxCount; i++) {
      const [x, y, z] = cells[i];
      const s0 = Math.min(1, Math.max(0, k * 1.8 - y * 0.6 - Math.abs(x) * 0.2));
      const s = s0 < 1 ? 1 + 2.7 * (s0 - 1) ** 3 + 1.7 * (s0 - 1) ** 2 : 1; // ease-out-back
      p.set(x, y + (1 - s0) * 0.25, z);
      sc.setScalar(Math.max(0.0001, s));
      vox.setMatrixAt(i, mtx.compose(p, q, sc));
    }
    vox.instanceMatrix.needsUpdate = true;
  };
  setVoxels(1);

  const root = new THREE.Group();
  root.add(original, lowpoly, vox);
  scene.add(root);

  const panel = createPanel(el);
  let stat = () => {};
  let mode = 'orig', anim = 1, pop = 1;
  const triCount = (g) => {
    let n = 0;
    g.traverse((o) => { if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
    return n.toLocaleString('en-US');
  };
  const copy = {
    orig: t('原始模型：平滑、写实的生成结果。', 'Original: the smooth generated model.'),
    voxel: t('体素 / 积木风格：把同一个模型重新搭成一颗颗小方块，像乐高或像素游戏。', 'Voxel / brick: the same model rebuilt from little cubes — LEGO-like or for blocky games.'),
    lowpoly: t('低多边形风格：用少量平面切出棱角，适合轻量、卡通风的游戏。', 'Low-poly: a few flat facets give a crisp, lightweight look for stylised games.'),
  };
  const setMode = (m) => {
    mode = m;
    original.visible = m === 'orig';
    lowpoly.visible = m === 'lowpoly';
    vox.visible = m === 'voxel';
    if (m === 'voxel') { anim = 0; setVoxels(0); } else pop = 0;
    stat(m === 'voxel'
      ? t(`${voxCount.toLocaleString('en-US')} 个方块`, `${voxCount.toLocaleString('en-US')} cubes`)
      : t(`${triCount(m === 'orig' ? original : lowpoly)} 个三角面`, `${triCount(m === 'orig' ? original : lowpoly)} triangles`));
    panel.caption(`${copy[m]} ${t('同一个模型，经过 Tripo 的风格化后处理，就能变成不同游戏需要的美术风格。',
      'One model, many art styles — Tripo\'s stylization post-process adapts it for different games.')}`);
  };
  panel.buttons(t('风格', 'Style'), [['orig', t('原始', 'Original')], ['voxel', t('体素 / 积木', 'Voxel / brick')],
    ['lowpoly', t('低多边形', 'Low-poly')]], 'orig', setMode);
  stat = panel.stat();
  setMode('orig');

  stage.onFrame((dt) => {
    root.rotation.y += dt * 0.3;
    if (mode === 'voxel' && anim < 1) { anim = Math.min(1, anim + dt * 0.8); setVoxels(anim); }
    if (pop < 1) {
      pop = Math.min(1, pop + dt * 3);
      const s = 0.85 + 0.15 * (1 - (1 - pop) ** 3);
      original.scale.setScalar(s);
      lowpoly.scale.setScalar(s);
    }
  });

  return {
    dispose() {
      owned.forEach((x) => x.dispose());
      vox.dispose();
      stage.dispose();
      panel.dispose();
    },
  };
}
