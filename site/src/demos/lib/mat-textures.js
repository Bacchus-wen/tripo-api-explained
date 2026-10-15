// Procedural PBR maps for the treasure chest, generated on canvases at a chosen resolution.
// Wood: albedo / roughness / normal with grain, plank seams and worn edges.
// Iron: albedo / roughness / metalness with scratches and rust spots.
// Results are cached per resolution; call disposeMatTextures() when the demo unmounts.
import * as THREE from 'three';

const cache = new Map();

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function canvas(n) {
  const c = document.createElement('canvas');
  c.width = c.height = n;
  return c;
}

function toTex(c, srgb) {
  const tx = new THREE.CanvasTexture(c);
  tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
  tx.anisotropy = 8;
  if (srgb) tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
}

function normalFrom(h, n, strength) {
  const c = canvas(n), g = c.getContext('2d'), img = g.createImageData(n, n), d = img.data;
  const at = (x, y) => h[((y + n) % n) * n + ((x + n) % n)];
  const k = strength * n / 512;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * k, dy = (at(x, y + 1) - at(x, y - 1)) * k;
    const l = Math.hypot(dx, dy, 1), o = (y * n + x) * 4;
    d[o] = (-dx / l * 0.5 + 0.5) * 255; d[o + 1] = (dy / l * 0.5 + 0.5) * 255; d[o + 2] = (1 / l * 0.5 + 0.5) * 255; d[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return toTex(c, false);
}

function wood(n) {
  const rand = rng(7), planks = 6;
  const cA = canvas(n), cR = canvas(n);
  const A = cA.getContext('2d').createImageData(n, n), R = cR.getContext('2d').createImageData(n, n);
  const h = new Float32Array(n * n);
  const seeds = Array.from({ length: planks }, () => [rand(), rand(), rand()]);
  // fine detail frequency scales with resolution so higher quality shows more pores/grain
  const fine = n / 512;
  for (let y = 0; y < n; y++) {
    const v = y / n, pv = v * planks, pk = Math.floor(pv), f = pv - pk, [s0, s1, s2] = seeds[pk];
    const edge = Math.min(f, 1 - f);
    for (let x = 0; x < n; x++) {
      const u = x / n, i = y * n + x;
      const warp = Math.sin(u * 9 + s0 * 20) * 0.04 + Math.sin(u * 23 + s1 * 9) * 0.015;
      const ring = Math.sin((f + warp) * (18 + s2 * 10) * Math.PI) * 0.5 + 0.5;
      const pore = Math.sin(u * 900 * fine + Math.sin(v * 400 * fine) * 2) * Math.sin(v * 1300 * fine + u * 40) * 0.5 + 0.5;
      const knot = Math.exp(-((u - s1) ** 2 * 300 + (f - 0.5) ** 2 * 40)) * (s0 > 0.4 ? 1 : 0);
      const wear = edge < 0.08 ? (1 - edge / 0.08) * (0.6 + 0.4 * Math.sin(u * 60 + s0 * 7)) : 0;
      let r = 112 + s0 * 30 - ring * 34 - knot * 50 + wear * 40 - pore * 10;
      let g = 66 + s1 * 16 - ring * 20 - knot * 32 + wear * 26 - pore * 6;
      let b = 36 + s2 * 8 - ring * 12 - knot * 18 + wear * 14 - pore * 4;
      let rough = 0.62 + ring * 0.16 + pore * 0.1 - wear * 0.25, hh = 0.55 + ring * 0.06 - pore * 0.04 * fine;
      if (edge < 0.012) { r *= 0.3; g *= 0.3; b *= 0.3; rough = 0.95; hh = 0.05; }
      else if (edge < 0.03) hh -= (0.03 - edge) * 10;
      const o = i * 4;
      A.data[o] = r; A.data[o + 1] = g; A.data[o + 2] = b; A.data[o + 3] = 255;
      R.data[o] = R.data[o + 1] = R.data[o + 2] = Math.max(0, Math.min(1, rough)) * 255; R.data[o + 3] = 255;
      h[i] = hh;
    }
  }
  cA.getContext('2d').putImageData(A, 0, 0);
  cR.getContext('2d').putImageData(R, 0, 0);
  return { albedo: toTex(cA, true), rough: toTex(cR, false), normal: normalFrom(h, n, 2.2), canvas: cA };
}

function iron(n) {
  const rand = rng(31);
  const cA = canvas(n), cR = canvas(n), cM = canvas(n);
  const A = cA.getContext('2d').createImageData(n, n), R = cR.getContext('2d').createImageData(n, n);
  const M = cM.getContext('2d').createImageData(n, n);
  const spots = Array.from({ length: 14 }, () => [rand(), rand(), 0.02 + rand() * 0.07]);
  const scratch = new Float32Array(n * n);
  const count = Math.round(60 * n / 512);
  for (let s = 0; s < count; s++) {
    let x = rand() * n, y = rand() * n; const a = rand() * Math.PI, len = (0.05 + rand() * 0.25) * n;
    for (let k = 0; k < len; k++) {
      x += Math.cos(a); y += Math.sin(a);
      scratch[(((y | 0) % n + n) % n) * n + (((x | 0) % n + n) % n)] = 1;
    }
  }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const u = x / n, v = y / n, i = y * n + x, o = i * 4;
    let rust = 0;
    for (const [sx, sy, sr] of spots) {
      const d = Math.hypot(u - sx, v - sy) / sr;
      if (d < 1.4) rust = Math.max(rust, (1.4 - d) * (0.7 + 0.3 * Math.sin(u * 300 + v * 170)));
    }
    rust = Math.min(1, rust);
    const noise = Math.sin(u * 211 + v * 97) * Math.sin(v * 263 - u * 41) * 0.5 + 0.5;
    const sc = scratch[i];
    const base = 70 + noise * 18 + sc * 70;
    A.data[o] = base * (1 - rust) + (120 + noise * 40) * rust;
    A.data[o + 1] = base * (1 - rust) + (58 + noise * 18) * rust;
    A.data[o + 2] = (base + 6) * (1 - rust) + 28 * rust;
    A.data[o + 3] = 255;
    const rr = (0.32 + noise * 0.12 - sc * 0.18) * (1 - rust) + 0.92 * rust;
    R.data[o] = R.data[o + 1] = R.data[o + 2] = rr * 255; R.data[o + 3] = 255;
    M.data[o] = M.data[o + 1] = M.data[o + 2] = (1 - rust * 0.95) * 255; M.data[o + 3] = 255;
  }
  cA.getContext('2d').putImageData(A, 0, 0);
  cR.getContext('2d').putImageData(R, 0, 0);
  cM.getContext('2d').putImageData(M, 0, 0);
  return { albedo: toTex(cA, true), rough: toTex(cR, false), metal: toTex(cM, false), canvas: cA };
}

export function getMatTextures(resolution = 1024) {
  if (!cache.has(resolution)) cache.set(resolution, { wood: wood(resolution), iron: iron(resolution) });
  return cache.get(resolution);
}

export function disposeMatTextures() {
  cache.forEach(({ wood: w, iron: f }) => {
    [w.albedo, w.rough, w.normal, f.albedo, f.rough, f.metal].forEach((tx) => tx.dispose());
  });
  cache.clear();
}
