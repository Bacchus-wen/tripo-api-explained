import collab from '../data/collab.json';
import { createStage } from '../demos/_stage.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function renderTeam(view, { t, L, base, data }) {
  const role = Object.fromEntries(collab.roles.map((r) => [r.id, r]));
  const run = data.runs[0];
  view.innerHTML = `
    <section class="team">
      <div class="run-head">
        <p class="eyebrow">${t('Astra 分工', 'Astra roles')}</p>
        <h1>${t('Tripo 出单件，Astra 分角色在 Blender 里把它做好', 'Tripo makes the pieces; Astra, in several roles, finishes them in Blender')}</h1>
        <p class="muted">${t('Tripo 不是一站式的。它的强项是快速、并行地生成单件底模；复杂场景要先拆成单件，再组合，最后由 Astra 的不同角色分别修材质、补建模、做氛围。',
          'Tripo is not one-stop. Its strength is fast, parallel base models per piece; complex scenes are split into pieces, recombined, then each flaw goes to the Astra role best suited to it — materials, missing parts, mood.')}</p>
      </div>
      <div class="roles roles-5">${collab.roles.map((r) => `
        <div style="--c:${r.color}"><b><i class="swatch"></i>${r.who}</b><span>${L(r.what)}</span></div>`).join('')}</div>
      <ol class="flow">${collab.flow.map((f, i) => `
        <li style="--c:${role[f.who].color}"><span class="flow-n">${i + 1}</span><b>${L(f.title)}</b>
          <small>${role[f.who].who}</small><p>${L(f.text)}</p></li>`).join('')}</ol>
      <h2 class="team-h2">${t('同一个场景，问题分给谁修', 'One scene: who fixes what')}</h2>
      <p class="muted">${t('下面是这次真实运行组装好的场景和评审指出的问题。点一个问题，看它交给哪一家、怎么修，以及用 Tripo 哪个功能也能修。',
        'The scene assembled in the real run, with the flaws the critic found. Pick one to see who fixes it, how, and which Tripo feature could also fix it.')}</p>
      <div class="team-split">
        <div class="viewer"><div class="stage-inner" id="team-viewer"></div></div>
        <div class="fixes">${collab.fixes.map((f) => `
          <button class="fix" data-id="${f.id}" style="--c:${role[f.owner].color}">
            <span class="fix-owner">${role[f.owner].who}</span><b>${L(f.title)}</b></button>`).join('')}
          <div class="fix-detail" id="fix-detail"></div>
        </div>
      </div>
    </section>`;

  const el = document.getElementById('team-viewer');
  const stage = createStage(el, { camPos: [1.5, 1.0, 1.8], target: [0, 0.15, 0] });
  const { THREE } = stage;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.008, 12, 64),
    new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.9 }));
  ring.rotation.x = Math.PI / 2;
  ring.visible = false;
  stage.scene.add(ring);
  let scale = 1, offset = new THREE.Vector3();
  const toWorld = ([x, y, z]) => new THREE.Vector3(x, y, z).multiplyScalar(scale).add(offset);
  if (run?.scene?.model) {
    new GLTFLoader().load(`${base}${run.scene.model}`, (g) => {
      const root = g.scene;
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      scale = 1.8 / Math.max(size.x, size.z);
      root.scale.setScalar(scale);
      const c = box.getCenter(new THREE.Vector3()).multiplyScalar(scale);
      offset = new THREE.Vector3(-c.x, -box.min.y * scale, -c.z);
      root.position.copy(offset);
      root.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = o.receiveShadow = true;
        const name = o.material?.name || '';
        if (name.startsWith('wood')) o.material.color.set(0x7a3f1c);
        if (name.startsWith('glow')) o.material.emissive.set(0xff6a00);
      });
      stage.scene.add(root);
    });
  }

  // camera fly-to
  let fly = null;
  stage.onFrame((dt, time) => {
    ring.scale.setScalar(1 + Math.sin(time * 4) * 0.08);
    if (!fly) return;
    fly.k = Math.min(1, fly.k + dt * 1.6);
    const e = 1 - (1 - fly.k) ** 3;
    stage.controls.target.lerpVectors(fly.t0, fly.t1, e);
    stage.camera.position.lerpVectors(fly.p0, fly.p1, e);
    if (fly.k >= 1) fly = null;
  });

  const detail = document.getElementById('fix-detail');
  const pick = (id) => {
    const f = collab.fixes.find((x) => x.id === id);
    const r = role[f.owner];
    view.querySelectorAll('.fix').forEach((b) => b.classList.toggle('on', b.dataset.id === id));
    detail.innerHTML = `
      <h5>${t('交给', 'Owner')}</h5><p><b style="color:${r.color}">${r.who}</b></p>
      <h5>${t('怎么修', 'How')}</h5><p>${L(f.how)}</p>
      <h5>${t('Tripo 的替代做法', 'Tripo alternative')}</h5><p class="muted">${L(f.tripo)}</p>
      ${f.tripoFeature ? `<a class="doc" href="#hall" data-feature="${f.tripoFeature}">${t('在能力馆里看这个功能', 'See this feature in the Hall')} →</a>` : ''}`;
    detail.querySelector('[data-feature]')?.addEventListener('click', (e) => localStorage.setItem('feature', e.currentTarget.dataset.feature));
    const target = toWorld(f.target);
    ring.position.copy(target).setY(Math.max(0.01, target.y - 0.12 * scale + 0.01));
    ring.visible = true;
    const dir = new THREE.Vector3(0.55, 0.45, 0.9).normalize();
    fly = { k: 0, t0: stage.controls.target.clone(), t1: target, p0: stage.camera.position.clone(),
      p1: target.clone().addScaledVector(dir, 0.95) };
  };
  view.querySelectorAll('.fix').forEach((b) => b.addEventListener('click', () => pick(b.dataset.id)));
  setTimeout(() => pick(collab.fixes[0].id), 600);
  return () => stage.dispose();
}
