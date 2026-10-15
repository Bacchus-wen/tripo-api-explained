// Demo: bare clay -> base colour -> full PBR on an ornate treasure chest, with a wipe that
// compares the chosen mode (left) against PBR (right) on the very same model.
import { createStage, createPanel } from './_stage.js';
import { buildChest } from './lib/mat-chest.js';
import { getMatTextures, disposeMatTextures } from './lib/mat-textures.js';

const RES = { standard: 512, detailed: 1024, extreme: 2048 };

export default function mount(el, { t }) {
  const stage = createStage(el, { camPos: [1.55, 1.05, 1.75], target: [0, 0.36, 0], bloom: 0.25, exposure: 1.05 });
  const { THREE, scene, camera, renderer } = stage;
  renderer.localClippingEnabled = true;

  const planeL = new THREE.Plane(), planeR = new THREE.Plane();
  const M = THREE.MeshStandardMaterial;
  const set = (planes, defs) => Object.fromEntries(Object.entries(defs).map(([k, v]) => [k, new M({ ...v, clippingPlanes: planes })]));
  const sets = {
    bare: set([planeL], {
      wood: { color: 0x9a9da4, roughness: 0.85 }, iron: { color: 0x8c8f96, roughness: 0.85 },
      gold: { color: 0xa0a3a9, roughness: 0.85 }, glow: { color: 0x8a8d93, roughness: 0.9 },
    }),
    base: set([planeL], {
      wood: { roughness: 1, metalness: 0 }, iron: { roughness: 1, metalness: 0 },
      gold: { color: 0xd9a83c, roughness: 1 }, glow: { color: 0xffc46b, roughness: 1 },
    }),
    pbr: set([planeL], {
      wood: { roughness: 1, normalScale: new THREE.Vector2(1.4, 1.4) },
      iron: { roughness: 1, metalness: 1, envMapIntensity: 1.3 },
      gold: { color: 0xffc94d, roughness: 0.22, metalness: 1, envMapIntensity: 1.6 },
      glow: { color: 0x331a00, emissive: 0xffa22e, emissiveIntensity: 1.3 },
    }),
    right: set([planeR], {
      wood: { roughness: 1, normalScale: new THREE.Vector2(1.4, 1.4) },
      iron: { roughness: 1, metalness: 1, envMapIntensity: 1.3 },
      gold: { color: 0xffc94d, roughness: 0.22, metalness: 1, envMapIntensity: 1.6 },
      glow: { color: 0x331a00, emissive: 0xffa22e, emissiveIntensity: 1.3 },
    }),
  };
  const applyMaps = (res) => {
    const { wood, iron } = getMatTextures(res);
    sets.base.wood.map = wood.albedo; sets.base.iron.map = iron.albedo;
    for (const s of [sets.pbr, sets.right]) {
      Object.assign(s.wood, { map: wood.albedo, roughnessMap: wood.rough, normalMap: wood.normal });
      Object.assign(s.iron, { map: iron.albedo, roughnessMap: iron.rough, metalnessMap: iron.metal, bumpMap: iron.rough, bumpScale: -0.6 });
    }
    Object.values(sets).forEach((s) => Object.values(s).forEach((m) => { m.needsUpdate = true; }));
  };

  const left = buildChest(), right = buildChest();
  scene.add(left.group, right.group);
  right.setMaterials(sets.right);
  right.glowLight.visible = false;

  // Warm spotlight orbiting the chest so metal highlights travel while wood stays matte.
  const spot = new THREE.SpotLight(0xffc98a, 9, 5, 0.5, 0.6, 1.6);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.bias = -0.0005;
  spot.target.position.set(0, 0.3, 0);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffd9a8 }));
  spot.add(bulb);
  scene.add(spot, spot.target);

  // Glowing divider drawn in DOM, positioned at the wipe.
  const divider = document.createElement('div');
  divider.style.cssText = 'position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;pointer-events:none;'
    + 'background:linear-gradient(#ffb34700,#ffcf7a 20%,#ffcf7a 80%,#ffb34700);box-shadow:0 0 12px 2px #ffb347aa;';
  const tag = (txt, side) => {
    const d = document.createElement('div');
    d.style.cssText = `position:absolute;top:50%;${side}:8px;font:600 11px/1 system-ui;color:#ffe2b0;letter-spacing:.06em;`
      + 'background:#0009;padding:4px 7px;border-radius:6px;white-space:nowrap;';
    d.textContent = txt; divider.appendChild(d); return d;
  };
  const tagL = tag('', 'right'), tagR = tag('PBR', 'left');
  el.appendChild(divider);

  const panel = createPanel(el);
  let stat = () => {}, mode = 'base', quality = 'detailed', wipe = 0.5;
  const names = { bare: t('裸模', 'Bare'), base: t('基础贴图', 'Base colour'), pbr: 'PBR' };
  const copy = {
    bare: [t('裸模：只有形状，没有颜色，像一块灰色黏土。拖动下方滑块和右边的 PBR 对比。', 'Bare: shape only, no colour, like grey clay. Drag the wipe to compare with PBR on the right.'), 'texture=false'],
    base: [t('基础贴图：表面“刷上颜色”，木纹和铁件都有了，但木头和金属对光的反应一样，像印在纸上。', 'Base colour: the surface is “painted” with grain and iron, but wood and metal react to light the same way, like a printed sticker.'), 'texture=true · pbr=false'],
    pbr: [t('PBR：还告诉引擎每处多粗糙、是不是金属、有多少凹凸。铁件和金币会反光，木头保持哑光，缝隙有阴影。', 'PBR: the model also says how rough, how metallic and how bumpy every spot is. Iron and coins shine, wood stays matte, seams catch shadow.'), 'texture=true · pbr=true'],
  };
  const refresh = () => {
    left.setMaterials(sets[mode]);
    panel.caption(copy[mode][0]);
    tagL.textContent = names[mode];
    stat(`${copy[mode][1]} · texture_quality=${quality} · ${RES[quality]}px`);
  };
  panel.buttons(t('材质', 'Material'), [['bare', names.bare], ['base', names.base], ['pbr', 'PBR']], mode, (v) => { mode = v; refresh(); });
  panel.buttons('texture_quality', [['standard', 'standard'], ['detailed', 'detailed'], ['extreme', 'extreme']], quality, (v) => {
    quality = v; applyMaps(RES[v]); refresh();
  });
  panel.slider(t('对比', 'Wipe'), { min: 0, max: 100, step: 1, value: 50 }, (v) => { wipe = v / 100; });
  stat = panel.stat();
  applyMaps(RES[quality]);
  refresh();

  // Screen-space split: a world plane through the camera that projects to a vertical line at x=wipe.
  const ndc = new THREE.Vector3(), dir = new THREE.Vector3(), up = new THREE.Vector3(), n = new THREE.Vector3();
  stage.onFrame((dt, time) => {
    ndc.set(wipe * 2 - 1, 0, 0.5).unproject(camera);
    dir.copy(ndc).sub(camera.position).normalize();
    up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    n.crossVectors(up, dir).normalize();
    planeL.setFromNormalAndCoplanarPoint(n, camera.position);
    planeR.copy(planeL).negate();
    divider.style.left = `${wipe * 100}%`;
    divider.style.opacity = mode === 'pbr' || wipe <= 0.005 || wipe >= 0.995 ? '0' : '1';

    spot.position.set(Math.cos(time * 0.45) * 1.25, 1.05 + Math.sin(time * 0.3) * 0.2, Math.sin(time * 0.45) * 1.25);
    const lidA = -0.42 - Math.sin(time * 0.8) * 0.03;
    left.lid.rotation.x = right.lid.rotation.x = lidA;
    const g = 0.8 + Math.sin(time * 3.1) * 0.15 + Math.sin(time * 7.3) * 0.08;
    left.glowLight.intensity = right.glowLight.intensity = mode === 'bare' ? g * 0.3 : g;
  });

  return {
    dispose() {
      Object.values(sets).forEach((s) => Object.values(s).forEach((m) => m.dispose()));
      left.dispose(); right.dispose();
      disposeMatTextures();
      divider.remove();
      panel.dispose();
      stage.dispose();
    },
  };
}
