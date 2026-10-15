// Hero character: a collectible toy robot built from named semantic parts riding on one
// Skeleton of THREE.Bone joints. Feet rest exactly on y = 0 (turntable top) in the bind pose.
//   buildRobot({ skinned }) -> { root, bones, boneList, skeleton, parts, eyes, lamp, coreGlow,
//                               hands, M, dispose() }
// skinned=true adds a real SkinnedMesh waist bellows weighted across hips/spine/chest;
// otherwise the pelvis gets rigid rubber rings (handy for segmentation, which detaches parts).
import * as THREE from 'three';
import { createKit } from './char-geo.js';
import { createRobotMaterials, disposeMaterials } from './char-mats.js';
import { buildHead, buildVisor, buildAntenna, buildTorso, buildCore, buildBackpack, buildPelvis } from './char-robot-upper.js';
import { buildUpperArm, buildForearm, buildHand, buildThigh, buildShin, buildFoot } from './char-robot-limbs.js';

// [name, parent, x, y, z] in parent space. Robot's left is +X (it faces +Z, toward the viewer).
export const BONES = [
  ['hips', null, 0, 0.74, 0], ['spine', 'hips', 0, 0.08, 0], ['chest', 'spine', 0, 0.1, 0],
  ['neck', 'chest', 0, 0.32, 0], ['head', 'neck', 0, 0.04, 0],
  ['shoulderL', 'chest', 0.33, 0.24, 0], ['elbowL', 'shoulderL', 0, -0.22, 0], ['wristL', 'elbowL', 0, -0.2, 0],
  ['shoulderR', 'chest', -0.33, 0.24, 0], ['elbowR', 'shoulderR', 0, -0.22, 0], ['wristR', 'elbowR', 0, -0.2, 0],
  ['thighL', 'hips', 0.13, -0.04, 0], ['kneeL', 'thighL', 0, -0.3, 0], ['ankleL', 'kneeL', 0, -0.28, 0],
  ['thighR', 'hips', -0.13, -0.04, 0], ['kneeR', 'thighR', 0, -0.3, 0], ['ankleR', 'kneeR', 0, -0.28, 0],
];
// Bind pose: relaxed A-pose with a soft elbow bend.
export const BIND = { shoulderL: [0, 0, 0.17], shoulderR: [0, 0, -0.17], elbowL: [-0.18, 0, 0], elbowR: [-0.18, 0, 0] };
export const LEG = { thigh: 0.3, shin: 0.28, ankle: 0.12 };

const side = (s) => (s > 0 ? 'L' : 'R');
// Part table: id, labels, segment colour, explode vector, [bone, builder, offset, rotZ] groups, seams.
function partTable() {
  const T = [
    { id: 'head', zh: '头部', en: 'Head', color: 0x4fd1c5, dir: [0, 0.28, 0.04],
      groups: [['head', buildHead]], seams: [[0, [0, -0.04, 0], [0, -1, 0], 0.09]] },
    { id: 'visor', zh: '面罩', en: 'Visor', color: 0xa78bfa, dir: [0, 0.3, 0.44],
      groups: [['head', buildVisor, [0, 0.19, 0.205]]], seams: [[0, [0, 0, -0.036], [0, 0, -1], 0.085]] },
    { id: 'antenna', zh: '天线', en: 'Antenna', color: 0xffd166, dir: [0.24, 0.38, -0.06],
      groups: [['head', buildAntenna, [0.12, 0.375, -0.06], -0.15]], seams: [[0, [0, 0, 0], [0, -1, 0], 0.036]] },
    { id: 'torso', zh: '躯干', en: 'Torso', color: 0xf59e0b, dir: [0, 0.07, 0],
      groups: [['chest', buildTorso]], seams: [[0, [0, 0.336, 0], [0, 1, 0], 0.1], [0, [0, -0.086, 0], [0, -1, 0], 0.13],
        [0, [0.306, 0.24, 0], [1, 0, 0], 0.062], [0, [-0.306, 0.24, 0], [-1, 0, 0], 0.062]] },
    { id: 'core', zh: '能量核心', en: 'Power core', color: 0xff5d8f, dir: [0, 0.06, 0.52],
      groups: [['chest', buildCore, [0, 0.14, 0.222]]], seams: [[0, [0, 0, -0.004], [0, 0, -1], 0.058]] },
    { id: 'backpack', zh: '背包', en: 'Backpack', color: 0x6c8cff, dir: [0, 0.1, -0.52],
      groups: [['chest', buildBackpack, [0, 0.14, -0.25]]], seams: [[0, [0, 0, 0.062], [0, 0, 1], 0.11]] },
    { id: 'pelvis', zh: '腰部', en: 'Pelvis', color: 0xa3e635, dir: [0, -0.01, 0.3],
      groups: [['hips', buildPelvis]], seams: [[0, [0, 0.13, 0], [0, 1, 0], 0.1]] },
  ];
  for (const s of [1, -1]) {
    const k = side(s);
    T.push(
      { id: 'arm' + k, zh: s > 0 ? '左臂' : '右臂', en: s > 0 ? 'Left arm' : 'Right arm', color: s > 0 ? 0x38bdf8 : 0x22d3ee,
        dir: [s * 0.44, 0.06, 0], side: s, groups: [['shoulder' + k, buildUpperArm], ['elbow' + k, buildForearm]],
        seams: [[0, [-s * 0.062, 0, 0], [-s, 0, 0], 0.052], [1, [0, -0.186, 0], [0, -1, 0], 0.05]] },
      { id: 'hand' + k, zh: s > 0 ? '左手' : '右手', en: s > 0 ? 'Left hand' : 'Right hand', color: s > 0 ? 0xf472b6 : 0xfb7185,
        dir: [s * 0.66, -0.1, 0.16], side: s, groups: [['wrist' + k, buildHand]], seams: [[0, [0, 0.03, 0], [0, 1, 0], 0.034]] },
      { id: 'leg' + k, zh: s > 0 ? '左腿' : '右腿', en: s > 0 ? 'Left leg' : 'Right leg', color: s > 0 ? 0x34d399 : 0x10b981,
        dir: [s * 0.3, 0.0, 0.1], side: s, groups: [['thigh' + k, buildThigh], ['knee' + k, buildShin]],
        seams: [[0, [-s * 0.06, 0, 0], [-s, 0, 0], 0.05], [1, [0, -0.274, 0], [0, -1, 0], 0.07]] },
      { id: 'foot' + k, zh: s > 0 ? '左脚' : '右脚', en: s > 0 ? 'Left foot' : 'Right foot', color: s > 0 ? 0xfacc15 : 0xfbbf24,
        dir: [s * 0.46, 0.0, 0.3], side: s, groups: [['ankle' + k, buildFoot]], seams: [[0, [0, 0.04, 0], [0, 1, 0], 0.044]] },
    );
  }
  return T;
}

function bellows(k, M) {
  // Ribbed rubber waist from hips (y 0.77) to chest (y 0.93), skinned across three bones.
  const y0 = 0.77, h = 0.16;
  const g = new THREE.CylinderGeometry(0.115, 0.115, h, 36, 24, true);
  const pos = g.attributes.position;
  const idx = [], wts = [];
  for (let i = 0; i < pos.count; i++) {
    const v = (pos.getY(i) + h / 2) / h; // 0 bottom .. 1 top
    const r = 0.104 + 0.014 * Math.cos(v * Math.PI * 10) ** 2;
    const a = Math.atan2(pos.getZ(i), pos.getX(i));
    pos.setXYZ(i, Math.cos(a) * r, y0 + v * h, Math.sin(a) * r);
    // hips=0, spine=1, chest=2 with smooth tent weights.
    const wh = Math.max(0, 1 - v * 2), wc = Math.max(0, v * 2 - 1), ws = 1 - wh - wc;
    idx.push(0, 1, 2, 0);
    wts.push(wh, ws, wc, 0);
  }
  g.computeVertexNormals();
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wts, 4));
  const mesh = new THREE.SkinnedMesh(g, M.rubber);
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  mesh.name = 'waist-bellows';
  return mesh;
}

export function buildRobot({ skinned = false } = {}) {
  const k = createKit();
  const M = createRobotMaterials();
  const root = new THREE.Group();
  root.name = 'robot';
  const bones = {};
  for (const [name, parent, x, y, z] of BONES) {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(x, y, z);
    const r = BIND[name];
    if (r) b.rotation.set(r[0], r[1], r[2]);
    (parent ? bones[parent] : root).add(b);
    bones[name] = b;
  }
  const boneList = BONES.map(([n]) => bones[n]);
  const parts = partTable().map((p) => {
    const groups = p.groups.map(([boneName, build, off, rz]) => {
      const g = new THREE.Group();
      g.name = `${p.id}@${boneName}`;
      if (off) g.position.set(...off);
      if (rz) g.rotation.z = rz;
      build(k, M, g, build === buildPelvis ? !skinned : p.side);
      bones[boneName].add(g);
      return g;
    });
    const meshes = [];
    groups.forEach((g) => g.traverse((o) => { if (o.isMesh) { o.userData.part = p.id; meshes.push(o); } }));
    return { ...p, groups, meshes, color: new THREE.Color(p.color), dir: new THREE.Vector3(...p.dir) };
  });
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(boneList);
  let waist = null;
  if (skinned) {
    waist = bellows(k, M);
    root.add(waist);
    waist.bind(new THREE.Skeleton([bones.hips, bones.spine, bones.chest]), new THREE.Matrix4());
  }
  const byId = (id) => parts.find((p) => p.id === id);
  const visor = byId('visor').groups[0];
  return {
    root, bones, boneList, skeleton, parts, waist, M, kit: k,
    eyes: visor.userData.eyes,
    lamp: byId('antenna').groups[0].userData.lamp,
    coreGlow: byId('core').groups[0].userData.glow,
    hands: { L: byId('handL').groups[0].userData, R: byId('handR').groups[0].userData },
    dispose() {
      waist?.geometry.dispose();
      waist?.skeleton.dispose();
      skeleton.dispose();
      k.dispose();
      disposeMaterials(M);
    },
  };
}
