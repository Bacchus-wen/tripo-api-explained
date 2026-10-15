// Demo: bare clay -> base-colour texture -> full PBR on a little wooden barrel with iron bands.
import { createStage, createPanel } from './_stage.js';

// Procedural maps: colour, ORM (G=roughness, B=metalness) and a normal map from a height field.
function makeMaps(THREE) {
  const W = 1024, H = 512, PL = 14;
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const cCol = mk(), cOrm = mk(), cNor = mk();
  const col = cCol.getContext('2d').createImageData(W, H);
  const orm = cOrm.getContext('2d').createImageData(W, H);
  const nor = cNor.getContext('2d').createImageData(W, H);
  const hgt = new Float32Array(W * H);
  const bands = [0.13, 0.87];
  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      const u = x / W, p = u * PL, k = Math.floor(p), f = p - k, i = y * W + x;
      const seed = Math.sin(k * 91.7) * 0.5 + 0.5;
      const grain = Math.sin((v * (7 + seed * 4) + Math.sin(v * 5 + k * 2.3 + f * 2) * 0.35 + f * 0.6) * Math.PI * 2) * 0.5 + 0.5;
      let r = 118 + seed * 34 - grain * 30, g = 72 + seed * 20 - grain * 20, b = 42 + seed * 10 - grain * 12;
      let rough = 0.72 + grain * 0.18, metal = 0, h = 0.5 + grain * 0.05;
      if (f < 0.035 || f > 0.965) { r *= 0.35; g *= 0.35; b *= 0.35; h = 0.1; rough = 0.95; }
      for (const bv of bands) {
        const d = Math.abs(v - bv);
        if (d < 0.05) {
          const rust = Math.max(0, Math.sin(u * 97 + v * 31) * Math.sin(u * 23) - 0.4);
          const rv = (u * 24) % 1, rivet = Math.hypot((rv - 0.5) * W / 24, (v - bv) * H) < 6;
          r = 120 + rust * 160; g = 118 + rust * 50; b = 116 - rust * 40;
          rough = 0.28 + rust * 0.6; metal = 1 - rust; h = rivet ? 1 : 0.85 - (d > 0.044 ? 0.3 : 0);
        }
      }
      const o = i * 4;
      col.data.set([r, g, b, 255], o);
      orm.data.set([255, rough * 255, metal * 255, 255], o);
      hgt[i] = h;
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const at = (xx, yy) => hgt[((yy + H) % H) * W + ((xx + W) % W)];
      const dx = (at(x + 1, y) - at(x - 1, y)) * 3, dy = (at(x, y + 1) - at(x, y - 1)) * 3;
      const len = Math.hypot(dx, dy, 1);
      nor.data.set([(-dx / len * 0.5 + 0.5) * 255, (dy / len * 0.5 + 0.5) * 255, (1 / len * 0.5 + 0.5) * 255, 255], (y * W + x) * 4);
    }
  }
  const tex = (c, data, srgb) => {
    c.getContext('2d').putImageData(data, 0, 0);
    const tx = new THREE.CanvasTexture(c);
    tx.wrapS = THREE.RepeatWrapping;
    tx.anisotropy = 4;
    if (srgb) tx.colorSpace = THREE.SRGBColorSpace;
    return tx;
  };
  return { map: tex(cCol, col, true), orm: tex(cOrm, orm, false), normal: tex(cNor, nor, false) };
}

export default function mount(el, { t }) {
  const stage = createStage(el, { camPos: [1.65, 1.1, 1.9], target: [0, 0.46, 0] });
  const { THREE, scene } = stage;
  const maps = makeMaps(THREE);

  // Barrel body (lathe profile) + lids with UVs remapped onto a plain plank region.
  const prof = [];
  for (let j = 0; j <= 24; j++) {
    const s = j / 24;
    prof.push(new THREE.Vector2(0.3 + 0.07 * Math.sin(s * Math.PI), s * 0.92));
  }
  const body = new THREE.LatheGeometry(prof, 96);
  const lid = new THREE.CircleGeometry(0.3, 64).rotateX(-Math.PI / 2);
  const luv = lid.attributes.uv;
  for (let i = 0; i < luv.count; i++) luv.setY(i, 0.3 + luv.getY(i) * 0.35);
  const bottom = lid.clone().rotateX(Math.PI);
  lid.translate(0, 0.9, 0);
  bottom.translate(0, 0.005, 0);

  const mats = {
    bare: new THREE.MeshStandardMaterial({ color: 0xa3a6ad, roughness: 0.85, metalness: 0 }),
    base: new THREE.MeshStandardMaterial({ map: maps.map, roughness: 0.85, metalness: 0 }),
    pbr: new THREE.MeshStandardMaterial({
      map: maps.map, roughnessMap: maps.orm, metalnessMap: maps.orm, normalMap: maps.normal,
      roughness: 1, metalness: 1, normalScale: new THREE.Vector2(1.2, 1.2),
    }),
  };
  const barrel = new THREE.Group();
  const parts = [body, lid, bottom].map((g) => {
    const m = new THREE.Mesh(g, mats.bare);
    m.castShadow = true; m.receiveShadow = true;
    barrel.add(m);
    return m;
  });
  scene.add(barrel);

  // A slowly orbiting warm light so reflections visibly move across the surface.
  const orbit = new THREE.PointLight(0xffd2a1, 3.5, 6, 1.5);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffd2a1 }));
  orbit.add(bulb);
  scene.add(orbit);

  const panel = createPanel(el);
  let stat = () => {};
  const copy = {
    bare: [t('裸模：只有形状，没有颜色——像一块灰色黏土。', 'Bare: shape only, no colour — like grey clay.'), 'texture=false'],
    base: [t('基础贴图：给表面“刷上颜色”——木纹和铁箍都有了，但木头和金属对光的反应一样，看起来像印在纸上。',
      'Base colour: the surface is “painted” — wood grain and iron bands appear, but wood and metal react to light the same way, like a printed sticker.'),
    'texture=true · pbr=false'],
    pbr: [t('PBR（基于物理的材质）：额外告诉引擎每一处有多粗糙、是不是金属、有多少凹凸。于是铁箍会反光，木头保持哑光，缝隙有阴影——在任何灯光下都像真的。',
      'PBR (physically based rendering): the model also says how rough, how metallic and how bumpy every spot is. Iron bands now shine, wood stays matte and gaps catch shadows — it looks real under any lighting.'),
    'texture=true · pbr=true'],
  };
  const setMode = (mode) => {
    parts.forEach((m) => { m.material = mats[mode]; });
    panel.caption(copy[mode][0]);
    stat(copy[mode][1]);
  };
  panel.buttons(t('材质', 'Material'), [['bare', t('裸模', 'Bare')], ['base', t('基础贴图', 'Base colour')], ['pbr', 'PBR']], 'pbr', setMode);
  stat = panel.stat();
  setMode('pbr');

  stage.onFrame((dt, time) => {
    barrel.rotation.y += dt * 0.15;
    orbit.position.set(Math.cos(time * 0.6) * 1.1, 0.95 + Math.sin(time * 0.4) * 0.25, Math.sin(time * 0.6) * 1.1);
  });

  return {
    dispose() {
      Object.values(mats).forEach((m) => m.dispose());
      Object.values(maps).forEach((tx) => tx.dispose());
      stage.dispose();
      panel.dispose();
    },
  };
}
