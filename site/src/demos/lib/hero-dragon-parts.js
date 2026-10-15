// Procedural parts for the hero baby-dragon figurine: metaball body baked from MarchingCubes,
// plus small lathe/cone/shape parts. All units: figurine ~0.9 tall, bottom at y=0.
import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const S = 1.25; // world size of the marching-cubes cube
const CY = 0.5; // world y of the cube centre

// [x, y, z, radius] in world units (dragon faces +z)
const BALLS = [
  [0, 0.22, 0.0, 0.24], [0, 0.34, 0.02, 0.2], [0, 0.14, 0.05, 0.22], // body / belly
  [0, 0.48, 0.03, 0.12], // neck
  [0, 0.66, 0.04, 0.19], [0, 0.7, -0.02, 0.15], // head
  [0, 0.62, 0.17, 0.11], [0, 0.6, 0.23, 0.08], // snout
  [0.1, 0.62, 0.1, 0.09], [-0.1, 0.62, 0.1, 0.09], // cheeks
  [0.17, 0.12, 0.03, 0.14], [-0.17, 0.12, 0.03, 0.14], // haunches
  [0.15, 0.04, 0.17, 0.08], [-0.15, 0.04, 0.17, 0.08], // feet
  [0.13, 0.35, 0.15, 0.065], [-0.13, 0.35, 0.15, 0.065], // arms
  [0.1, 0.27, 0.2, 0.06], [-0.1, 0.27, 0.2, 0.06], // hands
  // tail curling from the back around the right side (dense chain, generated below)
];

for (let i = 0; i <= 22; i++) {
  const k = i / 22, ang = -Math.PI / 2 + k * Math.PI * 0.7;
  const rad = 0.2 + k * 0.2;
  BALLS.push([Math.cos(ang) * rad, 0.1 - k * 0.055, Math.sin(ang) * rad, 0.11 - k * 0.078]);
}

export const TAIL_TIP = new THREE.Vector3(0.31, 0.05, 0.16);

function hash3(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

// Bake the metaball body. resolution ~72 => smooth hero; ~30 => low source for P1.
export function buildBody(resolution, scales = true) {
  const mc = new MarchingCubes(resolution, new THREE.MeshBasicMaterial(), false, false, 120000);
  mc.isolation = 80;
  mc.reset();
  // Signed-distance field: smooth union of spheres, so every feature keeps its own shape.
  const size = mc.size, f = mc.field, k = 0.045;
  for (let zi = 0; zi < size; zi++) {
    const z = (zi / size - 0.5) * S;
    for (let yi = 0; yi < size; yi++) {
      const y = (yi / size - 0.5) * S + CY;
      for (let xi = 0; xi < size; xi++) {
        const x = (xi / size - 0.5) * S;
        let d = 1e3;
        for (let i = 0; i < BALLS.length; i++) {
          const bl = BALLS[i];
          const dx = x - bl[0], dy = y - bl[1], dz = z - bl[2];
          const di = Math.sqrt(dx * dx + dy * dy + dz * dz) - bl[3];
          const h = Math.max(k - Math.abs(d - di), 0) / k;
          d = Math.min(d, di) - h * h * k * 0.25;
        }
        f[xi + yi * size + zi * size * size] = 80 - d * 600;
      }
    }
  }
  mc.update();
  const n = mc.count;
  const pos = mc.positionArray.slice(0, n * 3);
  for (let i = 0; i < pos.length; i += 3) {
    pos[i] *= S / 2; pos[i + 1] = pos[i + 1] * (S / 2) + CY; pos[i + 2] *= S / 2;
  }
  mc.geometry.dispose();
  mc.material.dispose();
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g = mergeVertices(g, 1e-5);
  g.computeVertexNormals();
  g.computeBoundingBox();
  const minY = g.boundingBox.min.y;
  g.translate(0, -minY, 0);
  g.userData.lift = -minY;
  const p = g.attributes.position, nr = g.attributes.normal;
  // subtle scale texture: cellular-ish bumps along the normal
  if (scales) {
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const f = 38;
      const b = Math.sin(x * f + Math.sin(z * f * 0.7)) * Math.sin(y * f * 1.1) * Math.sin(z * f + x * 9);
      const d = 0.0012 * b;
      p.setXYZ(i, x + nr.getX(i) * d, y + nr.getY(i) * d, z + nr.getZ(i) * d);
    }
    g.computeVertexNormals();
  }
  // vertex colours: warm orange with a cream belly and chin
  const orange = new THREE.Color(0xe07a3f), cream = new THREE.Color(0xeac394), deep = new THREE.Color(0xb8542a);
  const col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), nz = nr.getZ(i);
    let belly = THREE.MathUtils.smoothstep(nz, 0.25, 0.7) * THREE.MathUtils.smoothstep(0.2 - Math.abs(x), 0.0, 0.07);
    belly *= THREE.MathUtils.smoothstep(y, 0.04, 0.12) * (1 - THREE.MathUtils.smoothstep(y, 0.5, 0.58));
    const chin = (1 - THREE.MathUtils.smoothstep(nr.getY(i), -0.6, 0.0)) * THREE.MathUtils.smoothstep(y, 0.5, 0.56)
      * THREE.MathUtils.smoothstep(z, 0.1, 0.18);
    const back = THREE.MathUtils.smoothstep(-nz, 0.3, 0.9) * THREE.MathUtils.smoothstep(y, 0.25, 0.6);
    c.copy(orange).lerp(deep, back * 0.45).lerp(cream, Math.max(belly, chin));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

// Curved horn: lathe of a tapered profile, bent backwards.
export function hornGeo(seg = 18) {
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const k = i / 8;
    pts.push(new THREE.Vector2(0.032 * (1 - k) ** 0.9 + 0.002, k * 0.11));
  }
  const g = new THREE.LatheGeometry(pts, seg);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    p.setZ(i, p.getZ(i) - y * y * 3.2);
  }
  g.computeVertexNormals();
  return g;
}

// Stubby bat wing membrane (thin extrusion) with rounded scallops.
export function wingGeo(curveSeg = 10) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.08, 0.16, 0.2, 0.2);
  s.quadraticCurveTo(0.17, 0.12, 0.2, 0.06);
  s.quadraticCurveTo(0.14, 0.05, 0.13, -0.01);
  s.quadraticCurveTo(0.08, 0.01, 0.06, -0.05);
  s.quadraticCurveTo(0.03, -0.02, 0, 0);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.008, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 3, curveSegments: curveSeg,
  });
  g.translate(0, 0, -0.004);
  return g;
}

export function clawGeo(seg = 8) {
  const g = new THREE.ConeGeometry(0.012, 0.035, seg);
  g.rotateX(Math.PI / 2 + 0.5);
  return g;
}

export function spikeGeo(seg = 10) {
  const g = new THREE.ConeGeometry(0.025, 0.05, seg);
  return g;
}
