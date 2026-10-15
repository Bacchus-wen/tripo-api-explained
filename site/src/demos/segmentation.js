// Demo: part segmentation — a fused grey "raw scan" robot is swept by a scanning plane, parts light
// up with v2-style semantic labels, explode apart along designed vectors, and can be completed
// (/mesh/complete caps the faces hidden by the joint). Click a part to fly to it.
import * as THREE from 'three';
import { createStage, createPanel, PALETTE } from './_stage.js';
import { buildRobot } from './lib/char-robot.js';
import { createSegOverlay } from './lib/char-seg-ui.js';

export default function mount(el, { t }) {
  const stage = createStage(el, { camPos: [2.9, 1.65, 4.0], target: [0, 0.86, 0], bloom: 0.32 });
  const { scene, camera } = stage;
  const robot = buildRobot({ skinned: false });
  scene.add(robot.root);
  robot.root.updateMatrixWorld(true);
  const flat = new THREE.Group();
  scene.add(flat);
  const raw = new THREE.MeshStandardMaterial({ color: 0xa4a8b0, roughness: 0.62, metalness: 0.05 });
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x050506, side: THREE.DoubleSide });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xff8a3d, toneMapped: false });
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x9ff7ee, wireframe: true, transparent: true, toneMapped: false });
  const own = [raw, holeMat, edgeMat, wireMat];
  const Z = new THREE.Vector3(0, 0, 1);
  const box = new THREE.Box3(), tmp = new THREE.Vector3();

  const parts = robot.parts.map((p, i) => {
    p.groups.forEach((g) => flat.attach(g));
    box.makeEmpty();
    p.groups.forEach((g) => box.expandByObject(g));
    const center = box.getCenter(new THREE.Vector3());
    const seg = new THREE.MeshPhysicalMaterial({ color: p.color, roughness: 0.38, clearcoat: 0.8, emissive: p.color, emissiveIntensity: 0 });
    own.push(seg);
    p.meshes.forEach((m) => { m.userData.orig = m.material; m.material = raw; });
    const seams = p.seams.map(([gi, pos, n, r]) => {
      const holder = new THREE.Group();
      const nv = new THREE.Vector3(...n);
      holder.position.set(...pos).addScaledVector(nv, 0.003);
      holder.quaternion.setFromUnitVectors(Z, nv);
      const circ = robot.kit.geo(`seam:${r}`, () => new THREE.CircleGeometry(r, 20));
      const ring = robot.kit.geo(`seamEdge:${r}`, () => new THREE.EdgesGeometry(new THREE.CircleGeometry(r, 20)));
      const hole = new THREE.Mesh(circ, holeMat);
      const cap = new THREE.Mesh(circ, seg);
      const wire = new THREE.Mesh(circ, wireMat);
      wire.position.z = 0.001;
      const edge = new THREE.LineSegments(ring, edgeMat);
      holder.add(hole, cap, wire, edge);
      holder.visible = false;
      p.groups[gi].add(holder);
      return { holder, hole, cap, wire, edge };
    });
    return { ...p, i, center, seg, seams, amt: 0, flash: 0, revealed: false, spin: 0, chrome: false,
      base: p.groups.map((g) => g.position.clone()), baseRot: p.groups.map((g) => g.rotation.y) };
  });
  const meshes = parts.flatMap((p) => p.meshes);

  // Scanning plane: translucent sheet + bright rim, sweeps top → bottom.
  const scan = new THREE.Group();
  const sheetMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.14, side: THREE.DoubleSide,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const rimMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9ff7ee).multiplyScalar(2.2), toneMapped: false });
  own.push(sheetMat, rimMat);
  const sheet = new THREE.Mesh(new THREE.CircleGeometry(0.95, 64), sheetMat);
  sheet.rotation.x = -Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.005, 6, 128), rimMat);
  rim.rotation.x = Math.PI / 2;
  const grid = new THREE.GridHelper(1.8, 18, 0x67e8f9, 0x2b6f78);
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  scan.add(sheet, rim, grid);
  scan.visible = false;
  scene.add(scan);

  let mode = 'raw', scanY = 2, explodeTarget = 0, complete = false, selected = null;
  const ui = createSegOverlay(el, parts, t, {
    onRecolor(p) { p.seg.color.offsetHSL(0.13, 0, 0); p.seg.emissive.copy(p.seg.color); p.flash = 1; },
    onSwap(p) { p.chrome = !p.chrome; p.meshes.forEach((m) => { m.material = p.chrome ? robot.M.steel : (mode === 'paint' ? m.userData.orig : p.seg); }); p.flash = 1; },
    onAnimate(p) { p.spin = 1; },
    onClose() { selected = null; stage.flyTo([2.9, 1.65, 4.0], [0, 0.86, 0]); },
  });
  const applyMats = () => parts.forEach((p) => p.meshes.forEach((m) => {
    m.material = mode === 'raw' || !p.revealed ? raw : p.chrome ? robot.M.steel : mode === 'paint' ? m.userData.orig : p.seg;
  }));

  const panel = createPanel(el);
  const steps = panel.buttons(t('步骤', 'Step'), [['raw', t('① 原始网格', '① Raw mesh')], ['seg', t('② 分件', '② Segment')],
    ['paint', t('③ 各自上色', '③ Paint parts')]], 'raw', (v) => {
    if (v !== 'raw' && mode === 'raw') { scanY = 1.95; parts.forEach((p) => { p.revealed = false; }); }
    if (v === 'raw') { parts.forEach((p) => { p.revealed = false; p.chrome = false; }); slider.set(0); explodeTarget = 0; ui.select(null); }
    mode = v;
    applyMats();
  });
  const slider = panel.slider(t('拆开', 'Explode'), { min: 0, max: 100, value: 0 }, (v) => {
    explodeTarget = v / 100 * 0.8;
    if (v > 0 && mode === 'raw') steps.pick('seg');
  });
  panel.buttons(t('补全', 'Complete'), [['off', t('关', 'Off')], ['on', t('补全断面', 'Cap hidden faces')]], 'off', (v) => {
    complete = v === 'on';
    parts.forEach((p) => p.seams.forEach((s) => { s.grow = complete ? 0 : 1; }));
  });
  const stat = panel.stat();
  panel.caption(t('Tripo 把一整块扫描网格拆成带语义标签的独立部件（v2）：扫描面扫过，零件逐个点亮。拖动“拆开”，点任意零件飞过去看；“补全”会把拆开后露出的断面补齐（/mesh/complete）。',
    'Tripo splits one fused mesh into separate parts with semantic labels (v2): a scan sweeps through and each part lights up. Drag Explode, click any part to fly to it; Complete caps the faces the split exposes (/mesh/complete).'));

  // Click (not drag) → raycast → fly to part.
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null;
  const onDown = (e) => { down = [e.clientX, e.clientY]; };
  const onUp = (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5 || mode === 'raw') return;
    const r = stage.renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(meshes, false)[0];
    if (!hit) return;
    selected = parts.find((p) => p.id === hit.object.userData.part);
    const c = tmp.copy(selected.center).addScaledVector(selected.dir, selected.amt);
    const d = camera.position.clone().sub(c).normalize().multiplyScalar(1.35);
    stage.flyTo([c.x + d.x, c.y + d.y + 0.15, c.z + d.z], [c.x, c.y, c.z]);
    selected.flash = 1;
    ui.select(selected);
  };
  stage.renderer.domElement.addEventListener('pointerdown', onDown);
  stage.renderer.domElement.addEventListener('pointerup', onUp);

  stage.onFrame((dt, time) => {
    if (mode !== 'raw' && scanY > -0.1) {
      scanY -= dt * 0.95;
      parts.forEach((p) => {
        if (!p.revealed && scanY < p.center.y) { p.revealed = true; p.flash = 1; applyMats(); }
      });
    }
    scan.visible = mode !== 'raw' && scanY > -0.1;
    scan.position.y = Math.max(0.01, scanY);
    sheetMat.opacity = 0.1 + 0.05 * Math.sin(time * 12);
    let shown = 0;
    parts.forEach((p) => {
      const target = mode === 'raw' ? 0 : explodeTarget;
      const k = 1 - Math.exp(-dt * (4.5 - p.i * 0.12));
      p.amt += (target - p.amt) * k;
      p.groups.forEach((g, gi) => {
        g.position.copy(p.base[gi]).addScaledVector(p.dir, p.amt);
        g.position.y += Math.sin(time * 1.5 + p.i) * 0.008 * p.amt;
      });
      if (p.spin > 0) {
        p.spin = Math.max(0, p.spin - dt * 0.8);
        const w = Math.sin((1 - p.spin) * Math.PI * 4) * 0.35 * p.spin;
        p.groups.forEach((g, gi) => { g.rotation.y = p.baseRot[gi] + w; });
      }
      p.flash = Math.max(0, p.flash - dt * 1.6);
      p.seg.emissiveIntensity = p.flash * 1.4;
      const open = mode !== 'raw' && p.revealed && p.amt > 0.06;
      p.seams.forEach((s) => {
        s.holder.visible = open;
        if (!open) return;
        s.grow = Math.min(1, (s.grow ?? 1) + dt * 1.4);
        s.hole.visible = !complete || s.grow < 1;
        s.edge.visible = !complete;
        s.cap.visible = s.wire.visible = complete;
        s.cap.scale.setScalar(complete ? Math.max(0.001, s.grow) : 1);
        s.wire.scale.copy(s.cap.scale);
      });
      if (p.revealed && mode !== 'raw') shown++;
    });
    wireMat.opacity = 0.55 + 0.35 * Math.sin(time * 5);
    ui.update(camera, mode !== 'raw', selected);
    stat(mode === 'raw'
      ? t('1 个整体网格 · 尚未分件', '1 fused mesh · not segmented')
      : t(`${shown} / ${parts.length} 个部件 · 分割 40 · 补全 50 credits`, `${shown} / ${parts.length} parts · segment 40 · complete 50 credits`));
  });

  return {
    dispose() {
      stage.renderer.domElement.removeEventListener('pointerdown', onDown);
      stage.renderer.domElement.removeEventListener('pointerup', onUp);
      ui.dispose();
      panel.dispose();
      robot.dispose();
      own.forEach((m) => m.dispose());
      stage.dispose();
    },
  };
}
