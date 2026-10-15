// Shared three.js stage for feature demos.
// Demo contract: export default function mount(el, { lang, t, base }) -> { dispose() }
//   t(zh, en) returns the string for the current language; base is the public data URL prefix.
// The stage gives every demo the same studio look: gradient backdrop, walnut turntable with a
// glowing rim, soft shadows, image-based lighting, subtle bloom and an idle auto-rotate.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export const PALETTE = {
  bg: 0x15171c, wood: 0x6b3a1e, teal: 0x3fa7a0, orange: 0xe07a3f,
  purple: 0xb05cc8, grey: 0x7d8698, glow: 0xffb347, ink: 0xe8e6e1,
};

function backdrop() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(256, 210, 20, 256, 300, 380);
  r.addColorStop(0, '#2f2a27');
  r.addColorStop(0.45, '#1b1c21');
  r.addColorStop(1, '#0c0d10');
  g.fillStyle = r;
  g.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function turntable(radius) {
  const group = new THREE.Group();
  const profile = [
    [0, -0.1], [radius * 0.98, -0.1], [radius, -0.085], [radius, -0.02], [radius * 0.985, 0], [0, 0],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const top = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 128),
    new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.42, metalness: 0.05 }),
  );
  top.receiveShadow = true;
  group.add(top);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.004, 0.006, 8, 160),
    new THREE.MeshBasicMaterial({ color: 0xffb347 }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.05;
  group.add(rim);
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.9, radius * 0.95, 0.12, 96),
    new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.6, metalness: 0.4 }),
  );
  base.position.y = -0.16;
  group.add(base);
  return group;
}

export function createStage(el, {
  camPos = [2.4, 1.7, 2.8], target = [0, 0.5, 0], ground = true, radius = 1.9,
  bloom = 0.3, autoRotate = true, exposure = 1.0,
} = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.domElement.className = 'stage-canvas';
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const bgTex = backdrop();
  scene.background = bgTex;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.6;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
  camera.position.set(...camPos);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 0.8;
  controls.maxDistance = 8;
  controls.autoRotate = autoRotate && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  controls.autoRotateSpeed = 0.6;
  let idleTimer = 0;
  const pauseRotate = () => {
    controls.autoRotate = false;
    clearTimeout(idleTimer);
    if (autoRotate) idleTimer = setTimeout(() => { controls.autoRotate = true; }, 6000);
  };
  controls.addEventListener('start', pauseRotate);

  const key = new THREE.DirectionalLight(0xffe0bd, 2.6);
  key.position.set(-2.6, 4.2, 2.4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 8;
  key.shadow.blurSamples = 16;
  Object.assign(key.shadow.camera, { left: -2.4, right: 2.4, top: 2.4, bottom: -2.4, near: 0.5, far: 12 });
  key.shadow.bias = -0.0004;
  const rim = new THREE.DirectionalLight(0xa9c4ff, 1.4);
  rim.position.set(2.2, 2.2, -3.2);
  const fill = new THREE.HemisphereLight(0xd8e2ff, 0x2a160a, 0.45);
  scene.add(key, rim, fill);

  if (ground) {
    const table = turntable(radius);
    scene.add(table);
  }

  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType, samples: 4,
  }));
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), bloom, 0.45, 1.05);
  bloomPass.enabled = bloom > 0;
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  const frameFns = new Set();
  let raf = 0;
  let last = performance.now();
  let time = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time += dt;
    frameFns.forEach((fn) => fn(dt, time));
    controls.update(dt);
    composer.render(dt);
  };
  const resize = () => {
    const w = el.clientWidth || 1, h = el.clientHeight || 1;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloomPass.setSize(w / 2, h / 2);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  resize();
  loop();

  return {
    THREE, scene, camera, renderer, controls, composer, bloomPass, keyLight: key,
    onFrame(fn) { frameFns.add(fn); return () => frameFns.delete(fn); },
    // Smoothly move camera and target (e.g. to frame a part). duration in seconds.
    flyTo(position, lookAt, duration = 0.9) {
      const p0 = camera.position.clone(), t0 = controls.target.clone();
      const p1 = new THREE.Vector3(...position), t1 = new THREE.Vector3(...lookAt);
      let k = 0;
      pauseRotate();
      const off = this.onFrame((dt) => {
        k = Math.min(1, k + dt / duration);
        const e = 1 - (1 - k) ** 3;
        camera.position.lerpVectors(p0, p1, e);
        controls.target.lerpVectors(t0, t1, e);
        if (k >= 1) off();
      });
    },
    dispose() {
      cancelAnimationFrame(raf);
      clearTimeout(idleTimer);
      ro.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        mats.forEach((m) => { Object.values(m).forEach((v) => v?.isTexture && v.dispose()); m.dispose(); });
      });
      bgTex.dispose();
      envRT.dispose();
      pmrem.dispose();
      bloomPass.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

// Small overlay control panel inside the demo element.
export function createPanel(el) {
  const panel = document.createElement('div');
  panel.className = 'demo-panel';
  el.appendChild(panel);
  const caption = document.createElement('div');
  caption.className = 'demo-caption';
  el.appendChild(caption);
  return {
    caption(text) { caption.textContent = text; },
    slider(label, { min, max, step = 1, value }, onInput) {
      const row = document.createElement('label');
      row.className = 'demo-row';
      const name = document.createElement('span');
      const out = document.createElement('output');
      const input = Object.assign(document.createElement('input'), { type: 'range', min, max, step, value });
      name.textContent = label;
      out.textContent = value;
      input.addEventListener('input', () => { out.textContent = input.value; onInput(Number(input.value)); });
      row.append(name, input, out);
      panel.appendChild(row);
      return { set(v) { input.value = v; out.textContent = v; }, input };
    },
    buttons(label, options, active, onPick) {
      const row = document.createElement('div');
      row.className = 'demo-row';
      const name = document.createElement('span');
      name.textContent = label;
      const group = document.createElement('div');
      group.className = 'demo-seg';
      const btns = options.map(([value, text]) => {
        const b = document.createElement('button');
        b.textContent = text;
        b.dataset.value = value;
        b.className = value === active ? 'on' : '';
        b.addEventListener('click', () => {
          btns.forEach((x) => x.classList.toggle('on', x === b));
          onPick(value);
        });
        group.appendChild(b);
        return b;
      });
      row.append(name, group);
      panel.appendChild(row);
      return { pick(value) { btns.find((b) => b.dataset.value === value)?.click(); } };
    },
    stat() {
      const s = document.createElement('div');
      s.className = 'demo-stat';
      panel.appendChild(s);
      return (text) => { s.textContent = text; };
    },
    dispose() { panel.remove(); caption.remove(); },
  };
}
