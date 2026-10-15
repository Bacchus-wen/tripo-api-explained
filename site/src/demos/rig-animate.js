// 绑骨与动画 — a procedural humanoid whose parts ride on bones: static → auto-rig → animate.
import { createStage, createPanel, PALETTE } from './_stage.js';

export default function mount(el, { t }) {
  const stage = createStage(el, { camPos: [2.0, 1.55, 3.9], target: [-0.28, 0.85, 0] });
  const { THREE, scene } = stage;
  const panel = createPanel(el);
  const body = new THREE.MeshStandardMaterial({ color: PALETTE.teal, roughness: 0.5, transparent: true });
  const accent = new THREE.MeshStandardMaterial({ color: PALETTE.orange, roughness: 0.45, transparent: true });
  const glow = new THREE.MeshBasicMaterial({ color: PALETTE.glow, depthTest: false, transparent: true, toneMapped: false });
  const jointGeo = new THREE.SphereGeometry(0.028, 12, 8);
  const bones = {}, joints = [];

  const bone = (name, parent, x, y, z = 0) => {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(x, y, z);
    (parent ? bones[parent] : scene).add(b);
    bones[name] = b;
    const j = new THREE.Mesh(jointGeo, glow);
    j.renderOrder = 10;
    j.visible = false;
    b.add(j);
    joints.push(j);
    return b;
  };
  const part = (name, geo, mat, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(0, y, z);
    m.castShadow = true;
    bones[name].add(m);
  };
  const cap = (r, len) => new THREE.CapsuleGeometry(r, len, 6, 14);

  bone('hips', null, 0, 0.82);
  bone('spine', 'hips', 0, 0.12);
  bone('chest', 'spine', 0, 0.2);
  bone('neck', 'chest', 0, 0.2);
  bone('head', 'neck', 0, 0.07);
  part('hips', new THREE.BoxGeometry(0.3, 0.14, 0.17), accent, -0.02);
  part('spine', cap(0.09, 0.08), body, 0.1);
  part('chest', new THREE.BoxGeometry(0.36, 0.24, 0.2), body, 0.08);
  part('head', new THREE.SphereGeometry(0.13, 24, 16), body, 0.12);
  part('head', new THREE.BoxGeometry(0.17, 0.05, 0.04), accent, 0.14, 0.11);
  for (const [s, k] of [[1, 'L'], [-1, 'R']]) {
    bone('shoulder' + k, 'chest', 0.2 * s, 0.17);
    bone('elbow' + k, 'shoulder' + k, 0, -0.27);
    bone('hand' + k, 'elbow' + k, 0, -0.25);
    bone('thigh' + k, 'hips', 0.09 * s, -0.06);
    bone('knee' + k, 'thigh' + k, 0, -0.36);
    bone('foot' + k, 'knee' + k, 0, -0.36);
    part('shoulder' + k, cap(0.05, 0.18), body, -0.135);
    part('elbow' + k, cap(0.045, 0.17), body, -0.125);
    part('hand' + k, new THREE.SphereGeometry(0.05, 14, 10), accent, -0.03);
    part('thigh' + k, cap(0.065, 0.24), body, -0.18);
    part('knee' + k, cap(0.055, 0.24), body, -0.18);
    part('foot' + k, new THREE.BoxGeometry(0.1, 0.06, 0.2), accent, -0.03, 0.04);
  }
  const skel = new THREE.SkeletonHelper(bones.hips);
  skel.material.linewidth = 2;
  skel.setColors?.(new THREE.Color(PALETTE.glow), new THREE.Color(0xfff0c0));
  skel.visible = false;
  scene.add(skel);
  // Scan ring that sweeps down the body during auto-rig.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.006, 6, 64),
    new THREE.MeshBasicMaterial({ color: PALETTE.glow, transparent: true, toneMapped: false }));
  ring.rotation.x = Math.PI / 2;
  ring.visible = false;
  scene.add(ring);

  const NAMES = Object.keys(bones);
  const rest = {};
  NAMES.forEach((n) => { rest[n] = bones[n].rotation.clone(); });
  const A = 0.12; // A-pose arms
  const target = {};
  let step = 'static', motion = 'walk', rigT = 0, animT = 0;
  const setStat = panel.stat();

  function pose(time) {
    NAMES.forEach((n) => { target[n] = [0, 0, 0]; });
    target.shoulderL[2] = A; target.shoulderR[2] = -A;
    let hipY = 0.82;
    if (step === 'anim') {
      const w = time * 5.2;
      if (motion === 'walk') {
        const s = Math.sin(w);
        target.thighL[0] = -0.55 * s; target.thighR[0] = 0.55 * s;
        target.kneeL[0] = 0.6 * Math.max(0, Math.sin(w - 1.4)); target.kneeR[0] = 0.6 * Math.max(0, -Math.sin(w - 1.4));
        target.shoulderL[0] = 0.45 * s; target.shoulderR[0] = -0.45 * s;
        target.elbowL[0] = -0.3; target.elbowR[0] = -0.3;
        target.chest[1] = 0.12 * s; target.spine[0] = 0.05;
        hipY += 0.025 * Math.abs(Math.cos(w));
      } else if (motion === 'wave') {
        target.shoulderR[2] = -2.6; target.shoulderR[0] = -0.2;
        target.elbowR[2] = -0.5 + 0.45 * Math.sin(time * 8);
        target.shoulderL[2] = 0.15; target.head[2] = 0.12 * Math.sin(time * 2); target.chest[2] = 0.05;
      } else {
        const p = (time * 0.75) % 1;
        const crouch = p < 0.3 ? Math.sin((p / 0.3) * Math.PI) : 0;
        const air = p >= 0.3 && p < 0.75 ? Math.sin(((p - 0.3) / 0.45) * Math.PI) : 0;
        hipY += -0.14 * crouch + 0.45 * air;
        target.thighL[0] = target.thighR[0] = -0.9 * crouch - 0.35 * air;
        target.kneeL[0] = target.kneeR[0] = 1.6 * crouch + 0.6 * air;
        target.footL[0] = target.footR[0] = -0.6 * crouch;
        target.spine[0] = 0.35 * crouch;
        target.shoulderL[2] = A + 2.4 * air; target.shoulderR[2] = -A - 2.4 * air;
        target.shoulderL[0] = target.shoulderR[0] = 0.6 * crouch;
      }
    }
    return hipY;
  }

  stage.onFrame((dt, time) => {
    const k = 1 - Math.exp(-dt * 12);
    if (step === 'anim') animT += dt;
    const hipY = pose(animT);
    bones.hips.position.y += (hipY - bones.hips.position.y) * k;
    NAMES.forEach((n) => {
      const r = bones[n].rotation, g = target[n];
      r.x += (rest[n].x + g[0] - r.x) * k; r.y += (rest[n].y + g[1] - r.y) * k; r.z += (rest[n].z + g[2] - r.z) * k;
    });
    if (step !== 'static') rigT = Math.min(1, rigT + dt / 1.6);
    ring.visible = step !== 'static' && rigT < 1;
    ring.position.y = 1.62 - rigT * 1.62;
    const opacity = step === 'static' ? 1 : step === 'rig' ? 0.35 : 0.6;
    body.opacity += (opacity - body.opacity) * k;
    accent.opacity = body.opacity;
    body.depthWrite = accent.depthWrite = body.opacity > 0.95;
    joints.forEach((j) => {
      const wy = j.getWorldPosition(tmp).y;
      j.visible = step !== 'static' && wy > ring.position.y - 0.02;
      j.scale.setScalar(1 + 0.25 * Math.sin(time * 4 + wy * 6));
    });
    skel.visible = step !== 'static' && rigT > 0.2;
    skel.material.opacity = Math.min(1, (rigT - 0.2) * 2);
    const n = joints.filter((j) => j.visible).length;
    setStat(step === 'static'
      ? t('只是一个网格，没有骨骼，动不了', 'Just a mesh — no bones, can’t move')
      : t(`骨骼 ${n} / ${joints.length}`, `Bones ${n} / ${joints.length}`) + (step === 'anim' ? t(' · 动作播放中', ' · animation playing') : ''));
  });
  const tmp = new THREE.Vector3();

  const segs = () => el.querySelectorAll('.demo-panel .demo-seg');
  const mark = (i, v) => segs()[i]?.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.value === v));
  const setStep = (s) => {
    if (s === 'static') rigT = 0;
    if (s === 'anim') animT = 0;
    step = s;
    mark(0, s);
    mark(1, s === 'anim' ? motion : '');
  };
  panel.buttons(t('步骤', 'Step'), [['static', t('① 静态模型', '① Static mesh')], ['rig', t('② 自动绑骨', '② Auto-rig')],
    ['anim', t('③ 套用动作', '③ Apply animation')]], 'static', setStep);
  panel.buttons(t('动作', 'Motion'), [['walk', t('走路', 'Walk')], ['wave', t('挥手', 'Wave')], ['jump', t('跳跃', 'Jump')]],
    '', (m) => { motion = m; animT = 0; if (step !== 'anim') setStep('anim'); });
  panel.caption(t('Tripo 可以给生成的角色自动绑骨，再套用或重定向预设动作——原本要手工花几个小时绑骨的活，一步完成。',
    'Tripo can auto-rig a generated character and apply or retarget preset animations — replacing hours of manual rigging.'));

  return {
    dispose() {
      jointGeo.dispose();
      skel.dispose?.();
      panel.dispose();
      stage.dispose();
      el.innerHTML = '';
    },
  };
}
