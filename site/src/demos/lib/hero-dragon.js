// Hero baby-dragon figurine (procedural). buildDragon({ detail: 'high' | 'low' })
// -> { group, mergedGeometry, materials, update(dt, time), dispose() }
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildBody, hornGeo, wingGeo, clawGeo, spikeGeo } from './hero-dragon-parts.js';

const SPINE = [
  [0.86, -0.06, -0.35], [0.8, -0.13, -0.75], [0.56, -0.15, -1.45], [0.44, -0.19, -1.6], [0.32, -0.215, -1.75],
];

export function buildDragon({ detail = 'high' } = {}) {
  const hi = detail !== 'low';
  const body = buildBody(hi ? 76 : 30, hi);
  const lift = body.userData.lift;
  const materials = {
    paint: new THREE.MeshPhysicalMaterial({
      vertexColors: true, roughness: 0.55, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.45,
      sheen: 0.25, sheenColor: new THREE.Color(0xffb27a), sheenRoughness: 0.5,
    }),
    horn: new THREE.MeshPhysicalMaterial({ color: 0xf3dcb4, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
    wing: new THREE.MeshPhysicalMaterial({
      color: 0xc95f2e, roughness: 0.5, clearcoat: 0.5, side: THREE.DoubleSide,
      transmission: 0.0, sheen: 0.6, sheenColor: new THREE.Color(0xff9a5a),
    }),
    eye: new THREE.MeshPhysicalMaterial({ color: 0x120c0a, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 }),
    iris: new THREE.MeshPhysicalMaterial({ color: 0x5a2e12, roughness: 0.2, clearcoat: 1, emissive: 0x2a1004 }),
    glint: new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.8, 3.4), toneMapped: false }),
    dark: new THREE.MeshStandardMaterial({ color: 0x4a2010, roughness: 0.6 }),
  };
  const group = new THREE.Group();
  const bodyMesh = new THREE.Mesh(body, materials.paint);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);
  const parts = new THREE.Group(); // coordinates in the un-lifted metaball space
  parts.position.y = lift;
  group.add(parts);
  const forMerge = []; // [geometry, object, colour]
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, s = 1, color = null, parent = parts) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.scale.setScalar(s);
    m.castShadow = true;
    parent.add(m);
    if (color != null) forMerge.push([geo, m, color]);
    return m;
  };
  const seg = hi ? 1 : 0.5;
  const horn = hornGeo(Math.round(20 * seg));
  const claw = clawGeo(Math.round(10 * seg));
  const spike = spikeGeo(Math.round(12 * seg));
  const wing = wingGeo(hi ? 14 : 4);
  const eyeG = new THREE.SphereGeometry(0.048, hi ? 40 : 12, hi ? 28 : 8);
  const irisG = new THREE.SphereGeometry(0.03, 24, 16);
  const glintG = new THREE.SphereGeometry(0.011, 12, 8);
  const nostrilG = new THREE.SphereGeometry(0.009, 10, 6);
  const geos = [horn, claw, spike, wing, eyeG, irisG, glintG, nostrilG];

  // horns (two big, two small) and back spikes
  add(horn, materials.horn, 0.075, 0.79, -0.01, -0.35, 0, -0.35, 1, 0xf3dcb4);
  add(horn, materials.horn, -0.075, 0.79, -0.01, -0.35, 0, 0.35, 1, 0xf3dcb4);
  add(horn, materials.horn, 0.14, 0.73, -0.04, -0.2, 0, -1.0, 0.55, 0xf3dcb4);
  add(horn, materials.horn, -0.14, 0.73, -0.04, -0.2, 0, 1.0, 0.55, 0xf3dcb4);
  SPINE.forEach(([y, z, rx], i) => add(spike, materials.horn, 0, y, z, rx, 0, 0, 1 - i * 0.12, 0xf3dcb4));

  // eyes: glossy black ball, warm iris, bright glints that catch bloom
  const eyes = [];
  for (const sx of [1, -1]) {
    const e = new THREE.Group();
    e.position.set(sx * 0.088, 0.685, 0.175);
    e.rotation.y = sx * 0.35;
    parts.add(e);
    add(eyeG, materials.eye, 0, 0, 0, 0, 0, 0, 1, 0x120c0a, e);
    add(irisG, materials.iris, 0, -0.004, 0.024, 0, 0, 0, 1, null, e).scale.set(1, 1.15, 0.6);
    add(glintG, materials.glint, sx * -0.012, 0.018, 0.043, 0, 0, 0, 1, null, e);
    add(glintG, materials.glint, sx * 0.012, -0.014, 0.045, 0, 0, 0, 0.45, null, e);
    eyes.push(e);
    add(nostrilG, materials.dark, sx * 0.026, 0.625, 0.303, 0, 0, 0, 1, null);
  }

  // stubby wings on the back
  const wings = [];
  for (const sx of [1, -1]) {
    const w = new THREE.Group();
    w.position.set(sx * 0.1, 0.44, -0.13);
    w.rotation.set(0.15, sx * 1.25, sx * -0.2);
    parts.add(w);
    const m = add(wing, materials.wing, 0, 0, 0, 0, 0, 0, 1, 0xc95f2e, w);
    m.scale.x = sx;
    wings.push(w);
  }

  // claws on feet and hands
  for (const sx of [1, -1]) {
    for (const dx of [-0.032, 0, 0.032]) add(claw, materials.horn, sx * 0.15 + dx, 0.0, 0.245, 0, sx * dx * 3, 0, 1, 0xf3dcb4);
    for (const dx of [-0.018, 0.018]) add(claw, materials.horn, sx * 0.1 + dx, 0.24, 0.255, 0.4, 0, 0, 0.8, 0xf3dcb4);
  }

  // single merged geometry (position/normal/color) for simplification
  group.updateMatrixWorld(true);
  const list = [body.clone()];
  const col = new THREE.Color();
  for (const [g, m, hex] of (hi ? forMerge : [])) {
    const c = g.clone();
    c.deleteAttribute('uv');
    c.applyMatrix4(m.matrixWorld);
    col.set(hex);
    const n = c.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
    c.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    list.push(c.index ? c.toNonIndexed() : c);
    if (c.index) c.dispose();
  }
  list[0] = list[0].toNonIndexed();
  const merged0 = mergeGeometries(list, false);
  list.forEach((g) => g.dispose());
  const mergedGeometry = mergeVertices(merged0, 1e-4);
  merged0.dispose();
  mergedGeometry.computeVertexNormals();

  let blinkT = 2.5;
  function update(dt, time) {
    const br = Math.sin(time * 2.1);
    bodyMesh.scale.set(1 + br * 0.008, 1 + br * 0.004, 1 + br * 0.01);
    parts.position.y = lift + br * 0.003;
    wings.forEach((w, i) => { w.rotation.y = (i ? -1.25 : 1.25) + (i ? -1 : 1) * Math.sin(time * 2.6) * 0.12; });
    blinkT -= dt;
    let s = 1;
    if (blinkT < 0.16) s = Math.max(0.08, Math.abs(blinkT - 0.08) / 0.08);
    if (blinkT < 0) blinkT = 2.2 + Math.random() * 2.5;
    eyes.forEach((e) => { e.scale.y = s; });
    group.rotation.z = Math.sin(time * 0.9) * 0.012;
  }

  return {
    group, mergedGeometry, materials, update, eyes, bodyMesh,
    triangles: body.index.count / 3,
    dispose() {
      body.dispose();
      mergedGeometry.dispose();
      geos.forEach((g) => g.dispose());
      Object.values(materials).forEach((m) => m.dispose());
    },
  };
}
