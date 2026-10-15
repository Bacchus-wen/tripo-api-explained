// Gaussian splat vs mesh: the same shape as soft translucent points or as editable triangles.
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { createStage, createPanel, PALETTE } from './_stage.js';

export default function mount(el, { t }) {
  const stage = createStage(el, { camPos: [0, 1.5, 3.6], target: [0, 0.45, 0] });
  const { THREE, scene } = stage;
  const panel = createPanel(el);
  panel.caption(t('同一个物体：左边是高斯泼溅（几十万个柔和的半透明点），右边是网格（可编辑的三角面）。',
    'One object two ways: a Gaussian splat (many soft translucent points) versus a mesh (editable triangles).'));

  // Source shape: a little mushroom house built from simple solids, sampled into points.
  const parts = [
    [new THREE.CylinderGeometry(0.32, 0.38, 0.6, 48), 0xe8dcc8, 0.3],
    [new THREE.SphereGeometry(0.62, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), PALETTE.orange, 0.6],
    [new THREE.CylinderGeometry(0.09, 0.09, 0.22, 16), 0x6b4329, 0.15],
  ];
  const mesh = new THREE.Group();
  parts.forEach(([g, c, y]) => {
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }));
    m.position.y = y;
    m.castShadow = true;
    mesh.add(m);
  });
  mesh.children[2].position.set(0, 0.12, 0.36);
  mesh.position.x = 0.85;
  mesh.scale.setScalar(0.85);
  scene.add(mesh);

  const N = 26000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const tmp = new THREE.Vector3(), c = new THREE.Color();
  mesh.updateMatrixWorld(true);
  const samplers = mesh.children.map((m) => new MeshSurfaceSampler(m).build());
  const weights = [0.3, 0.55, 0.15];
  for (let i = 0; i < N; i++) {
    const r = Math.random(), k = r < weights[0] ? 0 : r < weights[0] + weights[1] ? 1 : 2;
    const part = mesh.children[k];
    samplers[k].sample(tmp);
    tmp.addScaledVector(tmp.clone().normalize(), (Math.random() - 0.5) * 0.02);
    part.localToWorld(tmp);
    tmp.sub(mesh.position);
    tmp.toArray(pos, i * 3);
    c.set(part.material.color).offsetHSL(0, 0, (Math.random() - 0.5) * 0.18).toArray(col, i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const sprite = (() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
  })();
  const mat = new THREE.PointsMaterial({ size: 0.035, map: sprite, vertexColors: true, transparent: true,
    opacity: 0.55, depthWrite: false, sizeAttenuation: true });
  const points = new THREE.Points(geo, mat);
  points.position.x = -0.85;
  scene.add(points);

  panel.slider(t('点大小', 'Splat size'), { min: 0.01, max: 0.09, step: 0.005, value: 0.035 }, (v) => { mat.size = v; });
  let wire = false;
  panel.buttons(t('网格显示', 'Mesh view'), [['solid', t('实体', 'Solid')], ['wire', t('线框', 'Wireframe')]], 'solid', (v) => {
    wire = v === 'wire';
    mesh.children.forEach((m) => { m.material.wireframe = wire; });
  });
  const stat = panel.stat();
  stat(t(`泼溅：${N.toLocaleString()} 个点 · 网格：可编辑、可进引擎`, `Splat: ${N.toLocaleString()} points · Mesh: editable, engine-ready`));
  stage.onFrame((dt) => { points.rotation.y += dt * 0.15; mesh.rotation.y += dt * 0.15; });

  return {
    dispose() {
      sprite.dispose();
      panel.dispose();
      stage.dispose();
    },
  };
}
