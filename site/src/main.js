import './style.css';
import api from './data/tripo-api.json';
import { renderRun } from './views/run.js';
import { renderModules } from './views/modules.js';

const demos = import.meta.glob('./demos/[!_]*.js');
const BASE = `${import.meta.env.BASE_URL}data/`;

const state = {
  lang: localStorage.getItem('lang') || 'zh',
  view: location.hash.replace('#', '') || 'hall',
  feature: api.features[0].id,
  data: null,
};
const t = (zh, en) => (state.lang === 'zh' ? zh : en);
const L = (o) => (o ? o[state.lang] ?? o.en : '');

const STATUS = {
  verified: ['本项目实测', 'Verified here'],
  documented: ['文档确认', 'Documented'],
  unconfirmed: ['待核实', 'To confirm'],
};
const statusChip = (s) => `<span class="chip chip-${s}">${t(...STATUS[s])}</span>`;

const app = document.getElementById('app');
let mounted = null;
let cleanupView = null;

function shell() {
  app.innerHTML = `
    <header class="top">
      <div class="brand">
        <span class="brand-mark"></span>
        <div>
          <strong>${t('Tripo API 图解', 'Tripo API, Explained')}</strong>
          <small>${t('看得见、摸得着的 3D 生成接口', 'The 3D generation API you can see and touch')}</small>
        </div>
      </div>
      <nav class="tabs">
        ${[['hall', '能力馆', 'Feature Hall'], ['run', '真实流程', 'Real Run'], ['modules', '产线模块', 'Pipeline']]
          .map(([id, zh, en]) => `<a href="#${id}" class="${state.view === id ? 'on' : ''}">${t(zh, en)}</a>`).join('')}
      </nav>
      <button class="lang" id="lang">${state.lang === 'zh' ? 'EN' : '中文'}</button>
    </header>
    <main id="view"></main>
    <footer class="foot">
      <span>${t('数据来自 Tripo V3 官方文档与本项目的真实调用记录。', 'Data from the official Tripo V3 docs and this project’s real API calls.')}</span>
      <a href="${api.docs}" target="_blank" rel="noopener">developers.tripo3d.ai</a>
      <a href="/llms.txt">llms.txt</a>
    </footer>`;
  document.getElementById('lang').onclick = () => {
    state.lang = state.lang === 'zh' ? 'en' : 'zh';
    localStorage.setItem('lang', state.lang);
    document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
    render();
  };
}

function hall(view) {
  const groups = api.groups.map((g) => `
    <div class="group">
      <h4>${L(g.name)}</h4>
      ${api.features.filter((f) => f.group === g.id).map((f) => `
        <button class="feat ${f.id === state.feature ? 'on' : ''}" data-id="${f.id}">
          <span>${L(f.name)}</span>${f.status === 'verified' ? '<i class="dot" title="verified"></i>' : ''}
        </button>`).join('')}
    </div>`).join('');
  view.innerHTML = `
    <section class="hall">
      <aside class="feat-list">${groups}</aside>
      <div class="stage"><div class="stage-inner" id="stage"></div></div>
      <article class="card" id="card"></article>
    </section>`;
  view.querySelectorAll('.feat').forEach((b) => b.addEventListener('click', () => {
    state.feature = b.dataset.id;
    view.querySelectorAll('.feat').forEach((x) => x.classList.toggle('on', x === b));
    showFeature();
  }));
  showFeature();
}

function card(f) {
  const models = f.models.length ? `<h5>${t('可选模型', 'Models')}</h5><ul class="models">${f.models
    .map((m) => `<li><code>${m.id}</code><span>${L(m.note)}</span></li>`).join('')}</ul>` : '';
  const params = f.params.length ? `<h5>${t('关键参数', 'Key parameters')}</h5><ul class="params">${f.params
    .map((p) => `<li><code>${p.name}</code><span>${L(p.note)}</span></li>`).join('')}</ul>` : '';
  const req = f.request ? `<h5>${t('一次调用长这样', 'What a call looks like')}</h5><pre>${f.request.replace(/</g, '&lt;')}</pre>` : '';
  return `
    <div class="card-head">${statusChip(f.status)}<h2>${L(f.name)}</h2>
      ${f.endpoint ? `<code class="endpoint">${f.endpoint}</code>` : ''}</div>
    <h5>${t('这是什么', 'What it is')}</h5><p>${L(f.what)}</p>
    <h5>${t('什么时候用', 'When to use it')}</h5><p>${L(f.when)}</p>
    ${models}${params}${req}
    <h5>${t('花费', 'Cost')}</h5><p class="muted">${L(f.credits)}</p>`;
}

async function showFeature() {
  const f = api.features.find((x) => x.id === state.feature);
  document.getElementById('card').innerHTML = card(f);
  const el = document.getElementById('stage');
  mounted?.dispose();
  mounted = null;
  el.innerHTML = '';
  const loader = demos[`./demos/${f.demo}.js`];
  if (!loader) {
    el.innerHTML = `<div class="stage-empty">${t('演示制作中', 'Demo in progress')}</div>`;
    return;
  }
  const token = Symbol();
  showFeature.token = token;
  const mod = await loader();
  if (showFeature.token !== token) return;
  try {
    mounted = mod.default(el, { lang: state.lang, t, base: BASE });
  } catch (err) {
    console.error(err);
    el.innerHTML = `<div class="stage-empty">${t('演示加载失败', 'Demo failed to load')}</div>`;
  }
}

async function render() {
  mounted?.dispose();
  mounted = null;
  cleanupView?.();
  cleanupView = null;
  shell();
  const view = document.getElementById('view');
  if (state.view === 'hall') return hall(view);
  state.data ??= await fetch(`${BASE}index.json`).then((r) => r.json()).catch(() => ({ modules: [], runs: [], images: [] }));
  const ctx = { lang: state.lang, t, L, base: BASE, data: state.data, statusChip };
  cleanupView = state.view === 'run' ? renderRun(view, ctx) : renderModules(view, ctx);
}

window.addEventListener('hashchange', () => {
  state.view = location.hash.replace('#', '') || 'hall';
  render();
});
document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
render();
