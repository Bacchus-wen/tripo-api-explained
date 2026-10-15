// Hero prop: an adventurer's treasure chest. Bottom at y=0, ~0.9 wide.
// buildChest() -> { group, meshes, lid, glowLight, setMaterials({wood, iron, gold, glow}) }
// Every mesh carries userData.kind ('wood' | 'iron' | 'gold' | 'glow') so a demo can swap materials per mode.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const W = 0.9, D = 0.56, H = 0.4, R = D / 2;

function merged(list) {
  const g = mergeGeometries(list.map((x) => (x.index ? x.toNonIndexed() : x)));
  list.forEach((x) => x.dispose());
  return g;
}

function box(w, h, d, x, y, z) {
  return new THREE.BoxGeometry(w, h, d).translate(x, y, z);
}

// Half-cylinder shell along X used for the curved lid and its straps.
function arc(radius, len, x, segs = 40) {
  return new THREE.CylinderGeometry(radius, radius, len, segs, 1, true, 0, Math.PI)
    .rotateZ(Math.PI / 2).translate(x, 0, 0);
}

export function buildChest() {
  const group = new THREE.Group();
  group.name = 'chest';
  const meshes = [];
  const add = (geo, kind, name, parent = group) => {
    const m = new THREE.Mesh(geo, null);
    m.name = name; m.userData.kind = kind;
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m); meshes.push(m);
    return m;
  };

  // Body: planks stacked vertically, slightly inset so seams read in silhouette.
  const planks = [];
  for (let i = 0; i < 4; i++) {
    const y = 0.02 + (i + 0.5) * (H - 0.02) / 4, h = (H - 0.02) / 4 - 0.006;
    planks.push(box(W - 0.02, h, D - 0.02, 0, y, 0));
  }
  planks.push(box(W - 0.04, 0.02, D - 0.04, 0, 0.01, 0));
  add(merged(planks), 'wood', 'body');

  // Inner tray (dark) and glowing treasure surface.
  add(box(W - 0.06, 0.006, D - 0.06, 0, H + 0.002, 0), 'glow', 'treasureGlow');

  // Iron: corner posts, vertical straps, top/bottom bands, rivets.
  const iron = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    iron.push(box(0.05, H, 0.012, sx * (W / 2 - 0.02), H / 2, sz * (D / 2 + 0.002)));
    iron.push(box(0.012, H, 0.05, sx * (W / 2 + 0.002), H / 2, sz * (D / 2 - 0.02)));
  }
  for (const sx of [-0.27, 0.27]) {
    iron.push(box(0.05, H, D + 0.012, sx, H / 2, 0));
    iron.push(box(0.05, 0.012, D + 0.012, sx, 0.004, 0));
  }
  for (const sz of [-1, 1]) iron.push(box(W + 0.012, 0.03, 0.03, 0, H - 0.015, sz * (D / 2 - 0.009)));
  for (const sx of [-1, 1]) iron.push(box(0.03, 0.03, D - 0.02, sx * (W / 2 - 0.009), H - 0.015, 0));
  iron.push(box(W + 0.012, 0.03, D + 0.012, 0, 0.03, 0));
  const rivet = () => new THREE.SphereGeometry(0.009, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2);
  for (const sx of [-0.27, 0.27]) for (let k = 0; k < 4; k++) {
    const y = 0.08 + k * 0.085;
    iron.push(rivet().translate(sx, y, D / 2 + 0.006));
    iron.push(rivet().rotateY(Math.PI).translate(sx, y, -D / 2 - 0.006));
  }
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
    iron.push(rivet().rotateY(sx * Math.PI / 2).translate(sx * (W / 2 + 0.008), 0.08 + k * 0.13, D / 2 - 0.02));
    iron.push(rivet().rotateY(sx * Math.PI / 2).translate(sx * (W / 2 + 0.008), 0.08 + k * 0.13, -D / 2 + 0.02));
  }
  add(merged(iron), 'iron', 'straps');

  // Lock plate with keyhole recess and hasp.
  const lock = [box(0.11, 0.13, 0.014, 0, H - 0.07, D / 2 + 0.012)];
  for (const [dx, dy] of [[-0.04, 0.05], [0.04, 0.05], [-0.04, -0.05], [0.04, -0.05]]) lock.push(rivet().scale(0.8, 0.8, 0.8).translate(dx, H - 0.07 + dy, D / 2 + 0.019));
  add(merged(lock), 'iron', 'lockPlate');
  add(new THREE.CylinderGeometry(0.011, 0.011, 0.01, 16).rotateX(Math.PI / 2).translate(0, H - 0.06, D / 2 + 0.02), 'glow', 'keyhole');

  // Lid pivots on the back top edge.
  const lid = new THREE.Group();
  lid.name = 'lid';
  lid.position.set(0, H, -R);
  group.add(lid);
  const inner = new THREE.Group();
  inner.position.set(0, 0, R);
  lid.add(inner);
  const lidWood = arc(R, W - 0.02, 0, 48);
  const cap = (x) => new THREE.CircleGeometry(R, 32, 0, Math.PI).rotateY(x > 0 ? Math.PI / 2 : -Math.PI / 2).translate(x, 0, 0);
  add(merged([lidWood, cap(W / 2 - 0.01), cap(-W / 2 + 0.01), box(W - 0.02, 0.012, D - 0.01, 0, 0.006, 0)]), 'wood', 'lidShell', inner);
  const lidIron = [arc(R + 0.006, 0.05, -0.27), arc(R + 0.006, 0.05, 0.27), arc(R + 0.006, 0.03, -W / 2 + 0.02), arc(R + 0.006, 0.03, W / 2 - 0.02)];
  for (const sx of [-0.27, 0.27]) for (let k = 1; k < 6; k++) {
    const a = (k / 6) * Math.PI;
    lidIron.push(rivet().rotateX(-a + Math.PI / 2).translate(sx, Math.sin(a) * (R + 0.008), Math.cos(a) * (R + 0.008)));
  }
  lidIron.push(box(0.06, 0.08, 0.012, 0, -0.01, R + 0.008));
  add(merged(lidIron), 'iron', 'lidStraps', inner);
  lid.rotation.x = -0.42;

  // Gold coins: a little heap peeking out plus a few spilled at the front.
  const coins = [];
  const rand = (() => { let s = 5; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  for (let i = 0; i < 26; i++) {
    const c = new THREE.CylinderGeometry(0.03, 0.03, 0.006, 20);
    c.rotateX((rand() - 0.5) * 0.9).rotateZ((rand() - 0.5) * 0.9);
    const a = rand() * Math.PI * 2, rr = rand() * 0.24;
    c.translate(Math.cos(a) * rr * 1.3, H + 0.01 + (0.24 - rr) * 0.16 + rand() * 0.02, Math.sin(a) * rr * 0.7);
    coins.push(c);
  }
  for (const [x, z, ry] of [[0.18, 0.4, 0.3], [0.26, 0.36, 1.2], [-0.22, 0.42, 2.1], [0.21, 0.43, 0.1]]) {
    coins.push(new THREE.CylinderGeometry(0.03, 0.03, 0.006, 20).rotateY(ry).translate(x, 0.003, z));
  }
  add(merged(coins), 'gold', 'coins');
  add(new THREE.OctahedronGeometry(0.04, 0).scale(1, 1.4, 1).translate(-0.12, H + 0.05, 0.05), 'gold', 'gem');

  const glowLight = new THREE.PointLight(0xffb347, 0.8, 1.2, 2);
  glowLight.position.set(0, H + 0.06, 0.05);
  group.add(glowLight);

  return {
    group, meshes, lid, glowLight,
    setMaterials(byKind) { meshes.forEach((m) => { m.material = byKind[m.userData.kind] || byKind.wood; }); },
    dispose() { meshes.forEach((m) => m.geometry.dispose()); },
  };
}
