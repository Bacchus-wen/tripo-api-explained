// Geometry kit for the hero robot: bevelled plates, bolts, panel lines, domes, extruded plates.
// A kit caches geometries by key so repeated details (bolts, fingers) share one buffer.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export function createKit() {
  const cache = new Map();
  const geo = (key, make) => {
    if (!cache.has(key)) cache.set(key, make());
    return cache.get(key);
  };
  const kit = {
    geo,
    // Add a mesh to parent at x,y,z with optional Euler rotation.
    mesh(g, mat, parent, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
      const m = new THREE.Mesh(g, mat);
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, rz);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    },
    plate(w, h, d, r = 0.03, seg = 4) {
      return geo(`plate:${w}:${h}:${d}:${r}:${seg}`, () => new RoundedBoxGeometry(w, h, d, seg, r));
    },
    // Hex bolt head facing +Z.
    bolt(r = 0.011) {
      return geo(`bolt:${r}`, () => {
        const g = new THREE.CylinderGeometry(r, r * 1.08, r * 0.7, 6);
        g.rotateX(Math.PI / 2);
        return g;
      });
    },
    // Thin dark strip used as an engraved panel line (sits 1 mm proud of the surface).
    line(len, thick = 0.006, depth = 0.004) {
      return geo(`line:${len}:${thick}:${depth}`, () => new THREE.BoxGeometry(len, thick, depth));
    },
    sphere(r, w = 24, h = 16) {
      return geo(`sph:${r}:${w}:${h}`, () => new THREE.SphereGeometry(r, w, h));
    },
    cyl(rt, rb, h, seg = 24, open = false) {
      return geo(`cyl:${rt}:${rb}:${h}:${seg}:${open}`, () => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open));
    },
    torus(r, tube, seg = 48) {
      return geo(`tor:${r}:${tube}:${seg}`, () => new THREE.TorusGeometry(r, tube, 10, seg));
    },
    capsule(r, len, seg = 18) {
      return geo(`cap:${r}:${len}:${seg}`, () => new THREE.CapsuleGeometry(r, len, 6, seg));
    },
    // Rounded shoulder-pad dome (lathe), opening facing -Y, height h.
    dome(r, h, lip = 0.012) {
      return geo(`dome:${r}:${h}:${lip}`, () => {
        const pts = [];
        const n = 14;
        pts.push(new THREE.Vector2(r * 0.86, -lip));
        pts.push(new THREE.Vector2(r + lip * 0.3, -lip * 0.4));
        for (let i = 0; i <= n; i++) {
          const a = (i / n) * Math.PI * 0.5;
          pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * h));
        }
        pts[pts.length - 1].x = 0.0001;
        return new THREE.LatheGeometry(pts, 48);
      });
    },
    // Extruded, chamfered plate (e.g. chest armour) facing +Z, centered on origin.
    chamferPlate(w, h, d, cut, bevel = 0.012) {
      return geo(`cham:${w}:${h}:${d}:${cut}:${bevel}`, () => {
        const s = new THREE.Shape();
        const x = w / 2, y = h / 2;
        s.moveTo(-x + cut, -y);
        s.lineTo(x - cut, -y);
        s.lineTo(x, -y + cut);
        s.lineTo(x, y - cut * 0.4);
        s.lineTo(x - cut * 0.4, y);
        s.lineTo(-x + cut * 0.4, y);
        s.lineTo(-x, y - cut * 0.4);
        s.lineTo(-x, -y + cut);
        s.closePath();
        const g = new THREE.ExtrudeGeometry(s, {
          depth: d, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 4,
        });
        g.translate(0, 0, -d / 2);
        g.computeVertexNormals();
        return g;
      });
    },
    // Ring of hex bolts on the +Z face of a parent, centred at (cx, cy, z).
    boltRing(parent, mat, cx, cy, z, radius, count, r = 0.009) {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + Math.PI / count;
        kit.mesh(kit.bolt(r), mat, parent, cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, z);
      }
    },
    dispose() {
      cache.forEach((g) => g.dispose());
      cache.clear();
    },
  };
  return kit;
}
