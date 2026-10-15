// Demo: part segmentation — one toy robot split into editable, labelled parts.
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createStage, createPanel, PALETTE } from './_stage.js';

export default function mount(el, { t }) {
  const stage = createStage(el, { camPos: [2.55, 1.6, 3.0], target: [0, 0.78, 0] });
  const { THREE, scene, camera } = stage;
  const clay = 0xb9bcc4;

  const robot = new THREE.Group();
  scene.add(robot);
  const dark = new THREE.MeshStandardMaterial({ color: 0x1d2027, roughness: 0.35, metalness: 0.2 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: PALETTE.glow, emissiveIntensity: 1.6 });

  // Each part: a group of meshes sharing one "shell" material, plus an explode direction.
  const parts = [];
  function part(name, color, pos, dir, labelY, build) {
    const g = new THREE.Group();
    const shell = new THREE.MeshStandardMaterial({ color: clay, roughness: 0.5, metalness: 0.05 });
    build(g, shell);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.position.set(...pos);
    robot.add(g);
    parts.push({ name, color: new THREE.Color(color), shell, group: g, base: new THREE.Vector3(...pos),
      dir: new THREE.Vector3(...dir), labelY });
  }
  const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };

  part(t('头部', 'Head'), PALETTE.teal, [0, 1.06, 0], [0, 0.42, 0.05], 0.2, (g, s) => {
    g.add(mesh(new RoundedBoxGeometry(0.46, 0.34, 0.38, 4, 0.09), s));
    g.add(mesh(new RoundedBoxGeometry(0.36, 0.14, 0.04, 2, 0.02), dark, 0, 0.01, 0.19));
    const eye = new THREE.SphereGeometry(0.035, 16, 12);
    g.add(mesh(eye, eyeMat, -0.08, 0.01, 0.21), mesh(eye, eyeMat, 0.08, 0.01, 0.21));
  });
  part(t('天线', 'Antenna'), PALETTE.glow, [0, 1.23, 0], [0, 0.7, 0], 0.22, (g, s) => {
    g.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 10), dark, 0, 0.07, 0));
    g.add(mesh(new THREE.SphereGeometry(0.045, 20, 14), s, 0, 0.16, 0));
  });
  part(t('躯干', 'Torso'), PALETTE.orange, [0, 0.66, 0], [0, 0, 0], -0.3, (g, s) => {
    g.add(mesh(new RoundedBoxGeometry(0.56, 0.44, 0.36, 4, 0.1), s));
    g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 24).rotateX(Math.PI / 2), dark, 0, 0.04, 0.18));
    g.add(mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 20), dark, 0, 0.25, 0));
  });
  for (const side of [-1, 1]) {
    part(side < 0 ? t('右臂', 'Right arm') : t('左臂', 'Left arm'), side < 0 ? PALETTE.purple : 0x5b8def,
      [side * 0.37, 0.68, 0], [side * 0.48, 0.08, 0], 0.22, (g, s) => {
        g.add(mesh(new THREE.SphereGeometry(0.075, 20, 14), s, 0, 0.12, 0));
        g.add(mesh(new THREE.CapsuleGeometry(0.06, 0.24, 6, 16), s, side * 0.02, -0.04, 0));
        g.add(mesh(new THREE.SphereGeometry(0.07, 18, 12), s, side * 0.02, -0.22, 0));
      });
  }
  for (const side of [-1, 1]) {
    part(side < 0 ? t('右腿', 'Right leg') : t('左腿', 'Left leg'), side < 0 ? 0x6cc070 : 0xe0c341,
      [side * 0.14, 0.24, 0], [side * 0.3, -0.02, 0.18], -0.12, (g, s) => {
        g.add(mesh(new THREE.CapsuleGeometry(0.075, 0.2, 6, 16), s, 0, 0.05, 0));
        g.add(mesh(new RoundedBoxGeometry(0.17, 0.08, 0.24, 3, 0.03), s, 0, -0.18, 0.03));
      });
  }

  // HTML labels positioned by projecting each part's anchor point.
  const layer = document.createElement('div');
  layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
  el.appendChild(layer);
  const labels = parts.map((p) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;left:0;top:0;transform:translate(-50%,-50%);padding:3px 9px 3px 7px;'
      + 'border-radius:999px;background:rgba(18,20,26,.82);color:#f2efe9;font:600 12px/1.4 system-ui,sans-serif;'
      + 'white-space:nowrap;display:flex;align-items:center;gap:6px;transition:opacity .3s;opacity:0;'
      + 'border:1px solid rgba(255,255,255,.12)';
    const dot = document.createElement('span');
    dot.style.cssText = `width:9px;height:9px;border-radius:50%;background:#${p.color.getHexString()}`;
    d.append(dot, document.createTextNode(p.name));
    layer.appendChild(d);
    return d;
  });

  const panel = createPanel(el);
  let explodeTarget = 0.21, explode = 0, coloured = true, colourMix = 1;
  panel.buttons(t('显示', 'View'), [['parts', t('分件上色', 'Colour parts')], ['whole', t('整体模型', 'One mesh')]],
    'parts', (v) => { coloured = v === 'parts'; });
  const slider = panel.slider(t('拆开', 'Explode'), { min: 0, max: 100, value: 35 }, (v) => { explodeTarget = v / 100 * 0.6; });
  const stat = panel.stat();
  panel.caption(t(
    'Tripo 可以把一个生成好的模型拆成独立的部件：每一块都能单独换颜色、替换或做动画。拖动滑块把零件拆开看看。',
    'Tripo can split one generated model into separate, editable parts — so you can recolour, swap or animate each piece. Drag the slider to pull the parts apart.',
  ));

  const tmp = new THREE.Vector3();
  const grey = new THREE.Color(clay);
  stage.onFrame((dt, time) => {
    explode += (explodeTarget - explode) * Math.min(1, dt * 6);
    colourMix += ((coloured ? 1 : 0) - colourMix) * Math.min(1, dt * 6);
    const w = el.clientWidth, h = el.clientHeight;
    parts.forEach((p, i) => {
      p.group.position.copy(p.base).addScaledVector(p.dir, explode);
      p.group.position.y += Math.sin(time * 1.6 + i) * 0.012 * explode;
      p.shell.color.copy(grey).lerp(p.color, colourMix);
      const show = coloured && explode > 0.06;
      labels[i].style.opacity = show ? '1' : '0';
      if (!show) return;
      tmp.copy(p.group.position);
      tmp.y += p.labelY;
      if (p.dir.x !== 0) tmp.x += Math.sign(p.dir.x) * 0.14;
      tmp.project(camera);
      labels[i].style.transform = `translate(-50%,-50%) translate(${(tmp.x * 0.5 + 0.5) * w}px,${(-tmp.y * 0.5 + 0.5) * h}px)`;
      labels[i].style.left = '0';
    });
    robot.rotation.y = Math.sin(time * 0.35) * 0.35;
  });
  stat(t(`${parts.length} 个独立部件`, `${parts.length} separate parts`));
  slider.set(35);

  return {
    dispose() {
      stage.dispose();
      panel.dispose();
      layer.remove();
    },
  };
}
