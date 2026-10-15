// Shared three.js stage for feature demos.
// Demo contract: export default function mount(el, { lang, t, base }) -> { dispose() }
//   t(zh, en) returns the string for the current language; base is the public data URL prefix.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const PALETTE = {
  bg: 0x15171c, wood: 0xa06a45, teal: 0x3fa7a0, orange: 0xe07a3f,
  purple: 0xb05cc8, grey: 0x7d8698, glow: 0xffb347, ink: 0xe8e6e1,
};

export function createStage(el, { camPos = [2.4, 1.7, 2.8], target = [0, 0.5, 0], ground = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'stage-canvas';
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.bg);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
  camera.position.set(...camPos);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 0.8;
  controls.maxDistance = 8;

  const key = new THREE.DirectionalLight(0xffe2c4, 2.4);
  key.position.set(-2.5, 4, 2.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 0.5, far: 12 });
  key.shadow.bias = -0.0005;
  scene.add(key, new THREE.HemisphereLight(0xcfd8ff, 0x3a2414, 0.6));
  const rim = new THREE.DirectionalLight(0xffd9b0, 1.0);
  rim.position.set(1.5, 2, -3);
  scene.add(rim);

  if (ground) {
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(1.9, 1.9, 0.06, 96),
      new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.55 }),
    );
    disc.position.y = -0.03;
    disc.receiveShadow = true;
    scene.add(disc);
  }

  const frameFns = new Set();
  const clock = new THREE.Clock();
  let raf = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;
    frameFns.forEach((fn) => fn(dt, time));
    controls.update();
    renderer.render(scene, camera);
  };
  const resize = () => {
    const w = el.clientWidth || 1, h = el.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  resize();
  loop();

  return {
    THREE, scene, camera, renderer, controls,
    onFrame(fn) { frameFns.add(fn); return () => frameFns.delete(fn); },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        mats.forEach((m) => { Object.values(m).forEach((v) => v?.isTexture && v.dispose()); m.dispose(); });
      });
      pmrem.dispose();
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
      return { set(v) { input.value = v; out.textContent = v; } };
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
