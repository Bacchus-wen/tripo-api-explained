import api from '../data/tripo-api.json';
import { createStage } from '../demos/_stage.js';
import { loadScene } from './scene-loader.js';

export function renderHome(view, { t, L, base, data }) {
  const run = data.runs[0];
  const credits = run ? run.steps.reduce((s, x) => s + (x.cost?.credits || 0), 0) : 0;
  const verified = api.features.filter((f) => f.status === 'verified').length;
  view.innerHTML = `
    <section class="home">
      <div class="home-copy">
        <p class="eyebrow">${t('给普通人的 Tripo API 图解', 'The Tripo API, explained for everyone')}</p>
        <h1>${t('一张图进去，<br>一个能用的 3D 模型出来。', 'An image goes in.<br>A usable 3D model comes out.')}</h1>
        <p class="lead">${t('Tripo 能出图、建模、分件、绑骨、换贴图、转格式。这里把每个接口都做成可以动手玩的 3D 演示，再用一次真实运行告诉你：哪些一步就好，哪些还要 Astra 在 Blender 里接着做。',
          'Tripo makes images and models, splits parts, rigs, re-textures and converts formats. Every endpoint here is a 3D demo you can play with, plus one real run showing what works in one step and what Astra still finishes in Blender.')}</p>
        <div class="home-cta">
          <a class="btn btn-primary" href="#hall">${t('进入能力馆', 'Open the Feature Hall')}</a>
          <a class="btn" href="#run">${t('看真实运行', 'See the real run')}</a>
        </div>
        <dl class="home-stats">
          <div><dt>${api.features.length}</dt><dd>${t('个功能演示', 'feature demos')}</dd></div>
          <div><dt>${verified}</dt><dd>${t('个本站实测', 'verified here')}</dd></div>
          <div><dt>${credits}</dt><dd>${t('credits 跑完一个场景', 'credits for one scene')}</dd></div>
        </dl>
      </div>
      <div class="home-stage">
        <div class="stage-inner" id="home-stage"></div>
        <p class="home-stage-label">${t('这张桌子上的 4 台机器，都是本站用 Tripo 真实生成的', 'All four machines on this table were really generated with Tripo')}</p>
      </div>
    </section>
    <section class="home-strip">
      ${api.groups.map((g) => `
        <a class="strip-card" href="#hall" data-feature="${api.features.find((f) => f.group === g.id).id}">
          <span class="eyebrow">${L(g.name)}</span>
          <b>${api.features.filter((f) => f.group === g.id).map((f) => L(f.name)).join(' · ')}</b>
        </a>`).join('')}
    </section>`;
  view.querySelectorAll('[data-feature]').forEach((a) => a.addEventListener('click', () => localStorage.setItem('feature', a.dataset.feature)));
  const el = document.getElementById('home-stage');
  const stage = createStage(el, { camPos: [1.32, 0.9, 1.66], target: [0.02, 0.1, 0], ground: false, bloom: 0.45 });
  stage.controls.autoRotateSpeed = 0.35;
  stage.controls.enableZoom = false;
  if (run?.scene?.model) loadScene(stage, `${base}${run.scene.model}`, { span: 1.75 });
  return () => stage.dispose();
}
