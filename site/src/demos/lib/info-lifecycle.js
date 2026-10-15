// 异步任务 — animated sequence diagram: your app ↔ Tripo, with a status ring, a credits meter
// and a 5-minute download countdown; two real failure branches (429 code 2000, network drop).
import { createPanel } from '../_stage.js';
import { LC_CSS } from './info-lifecycle-css.js';
import { createClock, createBag, injectStyle, h, prefersReduced } from './info-motion.js';

const ID = '0d626fb5-…-3077c1a5b9d6';
const MAX_ROWS = 9;

export default function mount(el, { t }) {
  el.classList.add('d-lc');
  injectStyle(el, LC_CSS);
  const clock = createClock();
  const bag = createBag();
  const panel = createPanel(el);

  const rows = h('div.lc-rows');
  const seq = h('div.lc-seq', {}, [
    h('div.lc-lanes', {}, `<div class="lc-lane"><b>${t('你的程序', 'Your app')}</b><small>client</small></div>
      <div class="lc-lane"><b>Tripo API</b><small>openapi.tripo3d.ai/v3</small></div>`),
    h('div.lc-life', { style: { left: '6%' } }), h('div.lc-life', { style: { right: '6%' } }), rows]);
  const C = 2 * Math.PI * 26;
  const ringBox = h('div.lc-box', {}, `<h4>${t('任务状态', 'Task status')}</h4><div class="lc-ringw">
    <svg class="lc-ring" viewBox="0 0 64 64"><circle class="bg" cx="32" cy="32" r="26"/><circle class="fg" cx="32" cy="32" r="26" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg>
    <div><div class="lc-pct">0%</div><span class="lc-chip">—</span></div></div>`);
  const credBox = h('div.lc-box', {}, `<h4>${t('积分', 'Credits')}</h4><div class="lc-meter"><i></i></div>
    <div class="lc-cred"><span class="lc-cs">—</span><b class="lc-cv"></b></div>
    <div class="lc-small">${t('提交时冻结 → 成功才扣除 → 失败释放', 'Frozen at submit → charged on success → released on failure')}</div>`);
  const dlBox = h('div.lc-box.lc-dl', {}, `<h4>${t('下载 model_url', 'Download model_url')}</h4><div class="lc-cd">5:00</div>
    <div class="lc-cdbar"><i></i></div><div class="lc-small">${t('链接约 5 分钟失效；过期就重新查询原任务，不要重新提交。', 'Expires in ~5 min; if it lapses, re-query the same task — never resubmit.')}</div>`);
  el.append(h('div.lc-main', {}, [seq, h('div.lc-side', {}, [ringBox, credBox, dlBox])]));
  const $ = (s) => el.querySelector(s);
  const fg = $('.lc-ring .fg'), pct = $('.lc-pct'), chip = $('.lc-chip'), meter = $('.lc-meter i'), cs = $('.lc-cs'), cv = $('.lc-cv');
  const cd = $('.lc-cd'), cdbar = $('.lc-cdbar i');

  // ---- primitives ----
  const msg = (dir, cls, html) => {
    const r = h(`div.lc-row.${cls}${dir === 'rtl' ? '.rtl' : ''}${dir === 'note' ? '.note' : ''}`, {}, `<div class="ln"></div><div class="tx">${html}</div>`);
    rows.append(r);
    while (rows.children.length > MAX_ROWS) rows.firstChild.remove();
    return r;
  };
  const note = (html, kind = '') => msg('note', kind, html);
  const prog = (p) => { fg.style.strokeDashoffset = C * (1 - p / 100); pct.textContent = `${Math.round(p)}%`; };
  const status = (s, label = s) => { chip.className = `lc-chip ${s}`; chip.textContent = label; fg.style.stroke = s === 'success' ? '#7cc49a' : s === 'unknown' ? '#e8b85c' : '#ffb347'; };
  const credits = (state) => {
    meter.className = state === 'frozen' || state === 'charged' ? state : '';
    meter.style.width = state === 'frozen' || state === 'charged' ? '22%' : '0%';
    const L = { frozen: [t('冻结中', 'Frozen'), '10'], charged: [t('已扣除', 'Charged'), '−10'], released: [t('已释放', 'Released'), '0'],
      none: [t('未冻结', 'Nothing frozen'), '0'], '': ['—', ''] }[state];
    cs.textContent = L[0]; cv.textContent = L[1];
  };
  const poll = (at, p, s = 'running') => {
    clock.at(at, () => {
      const r = msg('ltr', 'c-poll', `GET /tasks/{task_id}`);
      const dot = h('i.lc-dot');
      r.append(dot);
      dot.style.opacity = 0;
      dot.animate?.([{ left: '6%', opacity: 1 }, { left: '93%', opacity: 1 }, { left: '6%', opacity: 0 }], { duration: 700 / clock.speed, easing: 'ease-in-out', fill: 'forwards' });
      clock.at(380, () => { status(s); if (p != null) prog(p); r.querySelector('.tx').innerHTML += ` <em>→ ${s}${p != null ? ` · ${p}%` : ''}</em>`; });
    });
  };
  const download = (at) => {
    clock.at(at, () => { msg('rtl', 'c-dl', `← output.model_url <em>${t('（约 5 分钟有效）', '(valid ~5 min)')}</em>`); dlBox.classList.add('live'); });
    clock.tween(at, 300000, (k) => {
      const s = Math.max(0, Math.ceil(300 * (1 - k)));
      cd.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      cdbar.style.width = `${(1 - k) * 100}%`;
    }, (k) => k);
  };
  const reset = () => {
    clock.clear(); rows.innerHTML = ''; prog(0); status('', '—'); credits('');
    dlBox.classList.remove('live'); cd.textContent = '5:00'; cdbar.style.width = '100%';
  };
  const submit = (at, label) => {
    clock.at(at, () => msg('ltr', 'c-req', `POST /generation/… <em>${label}</em>`));
  };

  // ---- scenarios ----
  const happy = () => {
    panel.caption(t('一个任务的一生：提交 → 拿 task_id → 轮询状态 → 成功后立刻下载。积分提交时冻结，成功才扣。',
      'Life of one task: submit → get task_id → poll → download right after success. Credits freeze at submit, charge on success.'));
    submit(0, t('提交任务', 'submit task'));
    clock.at(700, () => { msg('rtl', 'c-res', `← 200 · task_id: ${ID}`); credits('frozen'); status('queued'); });
    poll(1600, 0, 'queued');
    poll(2700, 35);
    poll(3800, 72);
    poll(4900, 100, 'success');
    clock.at(5400, () => { credits('charged'); note(t('success：积分正式扣除', 'success: credits are now charged'), 'ok'); });
    download(6000);
  };
  const limit = () => {
    panel.caption(t('分支 A · 429 · code 2000 并发上限：同类任务一次只能跑一个。搭建本站时真实遇到——请求被拒绝，所以什么都没冻结。',
      'Branch A · 429 · code 2000 concurrency limit: one task of a kind at a time. Really happened while building this site — rejected, so nothing was frozen.'));
    clock.at(0, () => { msg('rtl', 'c-res', `← task A · running`); status('running', 'A · running'); prog(40); credits('frozen'); });
    submit(700, t('第 2 个同类任务 B', 'a 2nd task B of the same kind'));
    clock.at(1400, () => { msg('rtl', 'c-bad', '← 429 · {"code": 2000}'); status('rejected', 'B · rejected'); });
    clock.at(2000, () => note(t('B 被拒绝：没有冻结、也没扣积分（冻结的 10 只属于 A）', 'B rejected: nothing frozen or charged for it (the 10 frozen belong to A)'), 'bad'));
    clock.at(2900, () => note(t('→ 排队：等 A 完成，再一个一个提交', '→ queue it: wait for A, then submit one by one')));
    poll(3600, 100, 'success');
    clock.at(4200, () => { credits('charged'); note(t('A 成功 → 现在提交 B', 'A succeeded → now submit B'), 'ok'); });
    submit(4900, t('任务 B（排队后）', 'task B (after queueing)'));
    clock.at(5600, () => { msg('rtl', 'c-res', `← 200 · task_id: …`); credits('frozen'); status('queued'); prog(0); });
    poll(6500, 50);
    poll(7600, 100, 'success');
    clock.at(8100, () => credits('charged'));
  };
  const drop = () => {
    panel.caption(t('分支 B · 提交后断网：状态未知。付费请求绝不重新提交——用保存好的 task_id 去查询，接着等结果。',
      'Branch B · network drops after submit: status unknown. Never resubmit a paid request — resume by querying the saved task_id.'));
    submit(0, t('提交任务', 'submit task'));
    clock.at(700, () => { msg('rtl', 'c-res', `← 200 · task_id: ${ID}`); credits('frozen'); status('queued'); });
    clock.at(1200, () => note(t('✓ 先把 task_id 存到本地', '✓ save the task_id locally first'), 'ok'));
    poll(2000, 30);
    clock.at(3000, () => { msg('ltr', 'c-bad', `GET /tasks/{task_id} <em>✕ ${t('网络断开', 'network down')}</em>`); status('unknown', t('状态未知', 'unknown')); });
    clock.at(3900, () => msg('ltr', 'c-bad', `<s>POST /generation/… ${t('重新提交', 'resubmit')}</s> <em>✗ ${t('可能重复扣费', 'may charge twice')}</em>`));
    clock.at(4600, () => note(t('没有幂等键 → 付费请求绝不盲目重发', 'No idempotency key → never blindly resend a paid request'), 'bad'));
    poll(5600, 80);
    poll(6700, 100, 'success');
    clock.at(7200, () => credits('charged'));
    download(7800);
  };
  const SC = { ok: happy, 429: limit, net: drop };
  let current = 'ok';
  const run = (k) => {
    current = k;
    reset();
    SC[k]();
    if (prefersReduced()) clock.setSpeed(40);
  };

  const panelEl = el.querySelector('.demo-panel');
  const mk = (a, text) => h('button', { type: 'button', 'data-a': a, text });
  const scen = h('div.demo-seg', {}, [mk('ok', `▶ ${t('正常流程', 'Happy path')}`), mk('429', `A · 429`), mk('net', `B · ${t('断网', 'Net drop')}`)]);
  const speedBtn = mk('speed', '1×');
  panelEl.append(h('div.demo-row', {}, [scen, h('div.demo-seg', {}, [mk('replay', `↻ ${t('重播', 'Replay')}`), speedBtn])]));
  const mark = () => scen.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.a === current));
  bag.on(panelEl, 'click', (e) => {
    const a = e.target.closest('button')?.dataset.a;
    if (!a) return;
    if (a === 'speed') {
      const s = clock.speed >= 2 || prefersReduced() ? 1 : 2;
      clock.setSpeed(s);
      speedBtn.textContent = `${s}×`;
      speedBtn.classList.toggle('on', s > 1);
      return;
    }
    run(a === 'replay' ? current : a);
    mark();
  });
  run('ok');
  mark();

  return {
    dispose() {
      clock.dispose();
      bag.dispose();
      panel.dispose();
      el.classList.remove('d-lc');
      el.innerHTML = '';
    },
  };
}
