// 异步任务 — animated life of one task, plus two failure lessons (429 concurrency, network drop).
const CSS = `
.d-lifecycle{position:absolute;inset:0;padding:16px 18px;box-sizing:border-box;display:flex;flex-direction:column;gap:12px;color:#e8e6e1;font-size:13px}
.d-lifecycle .lc-ctl{display:flex;gap:8px;flex-wrap:wrap}
.d-lifecycle .lc-ctl button{background:#1d2026;color:#e8e6e1;border:1px solid #333844;border-radius:8px;padding:6px 12px;font:inherit;cursor:pointer}
.d-lifecycle .lc-ctl button.on{border-color:#e07a3f;background:rgba(224,122,63,.16)}
.d-lifecycle .lc-steps{display:flex;align-items:flex-start}
.d-lifecycle .lc-step{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;position:relative;font-size:12px;color:#7d8698;text-align:center}
.d-lifecycle .lc-step:not(:first-child)::before{content:"";position:absolute;top:13px;right:50%;width:100%;height:2px;background:#2f333c;z-index:0}
.d-lifecycle .lc-step.done:not(:first-child)::before,.d-lifecycle .lc-step.active:not(:first-child)::before{background:#3fa7a0}
.d-lifecycle .lc-dot{width:26px;height:26px;border-radius:50%;border:2px solid #3a3f4a;background:#15171c;z-index:1;display:grid;place-items:center;font-size:12px;font-weight:700;transition:all .3s}
.d-lifecycle .done .lc-dot{background:#3fa7a0;border-color:#3fa7a0;color:#15171c}
.d-lifecycle .active .lc-dot{border-color:#ffb347;box-shadow:0 0 0 5px rgba(255,179,71,.18);color:#ffb347}
.d-lifecycle .fail .lc-dot{background:#d9534f;border-color:#d9534f;color:#fff}
.d-lifecycle .warn .lc-dot{border-color:#ffb347;background:#4a3415;color:#ffb347}
.d-lifecycle .done,.d-lifecycle .active{color:#e8e6e1}
.d-lifecycle .lc-body{flex:1;min-height:0;display:grid;grid-template-columns:1.25fr 1fr;gap:12px}
.d-lifecycle .lc-log{background:#101216;border:1px solid #262a32;border-radius:10px;padding:10px 12px;font:12px/1.75 ui-monospace,Menlo,monospace;overflow:hidden;display:flex;flex-direction:column}
.d-lifecycle .lc-log h4{margin:0 0 4px;font:600 12px system-ui,sans-serif;color:#9aa0ad}
.d-lifecycle .lc-log div{animation:lcin .3s}
.d-lifecycle .lc-log .bad{color:#ff7b72}.d-lifecycle .lc-log .ok{color:#7ee0a1}.d-lifecycle .lc-log .hint{color:#ffb347}
.d-lifecycle .lc-log s{color:#7d8698}
@keyframes lcin{from{opacity:0;transform:translateY(4px)}}
.d-lifecycle .lc-side{display:flex;flex-direction:column;gap:10px;min-height:0}
.d-lifecycle .lc-box{background:#1d2026;border:1px solid #2f333c;border-radius:10px;padding:10px 12px}
.d-lifecycle .lc-box h4{margin:0 0 7px;font-size:12px;font-weight:600;color:#9aa0ad}
.d-lifecycle .lc-bar{height:10px;border-radius:6px;background:#2a2e36;overflow:hidden}
.d-lifecycle .lc-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#3fa7a0,#ffb347)}
.d-lifecycle .lc-pills{display:flex;gap:6px}
.d-lifecycle .lc-pills span{flex:1;text-align:center;padding:4px 0;border-radius:7px;border:1px solid #333844;color:#7d8698;font-size:12px;transition:all .3s}
.d-lifecycle .lc-pills span.on{border-color:#ffb347;color:#15171c;background:#ffb347;font-weight:600}
.d-lifecycle .lc-small{font-size:11.5px;color:#9aa0ad;margin-top:6px;line-height:1.5}
.d-lifecycle .lc-dl{border-color:#3fa7a0;opacity:.3;transition:opacity .4s}
.d-lifecycle .lc-dl.live{opacity:1}
.d-lifecycle .lc-dl b{color:#ffb347;font-variant-numeric:tabular-nums}
.d-lifecycle .lc-lesson{background:rgba(255,179,71,.08);border:1px solid #6b4a2c;border-radius:10px;padding:9px 12px;line-height:1.6;min-height:3.2em}
`;

export default function mount(el, { t }) {
  el.classList.add('d-lifecycle');
  const timers = [];
  let tick = 0;
  const S = [[t('提交 POST', 'Submit (POST)'), '1'], [t('拿到 task_id', 'Get task_id'), '2'], [t('排队 queued', 'Queued'), '3'],
    [t('运行 running', 'Running'), '4'], [t('成功 success', 'Success'), '5'], [t('下载 model_url', 'Download model_url'), '6']];
  el.innerHTML = `<style>${CSS}</style>
    <div class="lc-ctl"><button data-a="ok" class="on">▶ ${t('重新播放', 'Replay')}</button>
      <button data-a="429">⚠ ${t('分支 A：429 并发上限', 'Branch A: 429 concurrency')}</button>
      <button data-a="net">⚡ ${t('分支 B：提交后断网', 'Branch B: network drop')}</button></div>
    <div class="lc-steps">${S.map(([l, n]) => `<div class="lc-step"><div class="lc-dot">${n}</div><span>${l}</span></div>`).join('')}</div>
    <div class="lc-body"><div class="lc-log"><h4>${t('你的程序 ↔ Tripo', 'Your app ↔ Tripo')}</h4></div><div class="lc-side">
      <div class="lc-box"><h4>${t('进度', 'Progress')} <span class="pct">0%</span></h4><div class="lc-bar"><i></i></div></div>
      <div class="lc-box"><h4>${t('积分', 'Credits')}</h4><div class="lc-pills"><span data-c="frozen">${t('冻结', 'Frozen')}</span>
        <span data-c="charged">${t('扣除', 'Charged')}</span><span data-c="released">${t('释放', 'Released')}</span></div>
        <div class="lc-small">${t('提交时冻结 → 成功才扣除 → 失败则释放', 'Frozen at submit → charged on success → released on failure')}</div></div>
      <div class="lc-box lc-dl"><h4>${t('下载链接', 'Download link')}</h4>
        <div>model_url · ${t('约', 'expires in ~')}<b class="cd">5:00</b>${t(' 后失效', '')}</div>
        <div class="lc-small">${t('链接很快过期，拿到就立刻下载保存。', 'The link expires soon — download it right away.')}</div></div>
    </div></div>
    <div class="lc-lesson"></div>`;
  const $ = (s) => el.querySelector(s);
  const steps = [...el.querySelectorAll('.lc-step')];
  const log = $('.lc-log'), bar = $('.lc-bar i'), pct = $('.pct'), dl = $('.lc-dl'), lesson = $('.lc-lesson');

  const mark = (i, cls) => { steps[i].className = 'lc-step ' + cls; };
  const say = (html, cls = '') => {
    const d = document.createElement('div');
    d.className = cls;
    d.innerHTML = html;
    log.appendChild(d);
    while (log.children.length > 12) log.children[1].remove();
  };
  const credits = (c) => el.querySelectorAll('.lc-pills span').forEach((s) => s.classList.toggle('on', s.dataset.c === c));
  const progress = (p) => { bar.style.width = p + '%'; pct.textContent = Math.round(p) + '%'; };
  const ramp = (from, to, ms) => {
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      progress(from + (to - from) * k);
      if (k < 1) timers.push(requestAnimationFrame(step) * -1);
    };
    step();
  };
  const reset = () => {
    timers.forEach((id) => (id < 0 ? cancelAnimationFrame(-id) : clearTimeout(id)));
    timers.length = 0;
    clearInterval(tick);
    steps.forEach((_, i) => mark(i, ''));
    [...log.querySelectorAll('div')].forEach((d) => d.remove()); lesson.innerHTML = ''; dl.classList.remove('live'); $('.cd').textContent = '5:00';
    credits(''); progress(0);
  };
  const play = (script) => { reset(); script.forEach(([ms, fn]) => timers.push(setTimeout(fn, ms))); };
  const download = () => {
    mark(5, 'active'); dl.classList.add('live');
    say(`← model_url ${t('（约 5 分钟有效）', '(valid ~5 min)')}`, 'hint');
    let s = 300;
    tick = setInterval(() => { s -= 1; $('.cd').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; if (s <= 0) clearInterval(tick); }, 1000);
  };
  const ID = '0d626fb5-…-3077c1a5b9d6';
  const head = [
    [0, () => { mark(0, 'active'); say(`→ POST ${t('提交任务', 'submit task')}`); credits('frozen'); }],
    [900, () => { mark(0, 'done'); mark(1, 'active'); say(`← task_id: ${ID}`, 'ok'); }],
    [1600, () => { mark(1, 'done'); mark(2, 'active'); say('status: queued'); }],
    [2500, () => { mark(2, 'done'); mark(3, 'active'); say('status: running'); }],
  ];
  const happy = () => play([...head,
    [2500, () => ramp(0, 100, 3000)],
    [5600, () => { mark(3, 'done'); mark(4, 'done'); say('status: success', 'ok'); credits('charged'); }],
    [6400, download],
    [6400, () => { lesson.textContent = t('一个任务：提交 → 拿 task_id → 轮询状态 → 成功后立刻下载。积分提交时冻结、成功才扣。',
      'One task: submit → get task_id → poll status → download as soon as it succeeds. Credits are frozen at submit and only charged on success.'); }],
  ]);
  const limit = () => play([
    [0, () => { mark(0, 'active'); say(`→ POST ${t('提交第 2 个同类任务', 'submit a 2nd task of the same kind')}`); }],
    [900, () => { mark(0, 'fail'); say('← 429 · code 2000', 'bad'); say(t('请求被拒绝：没有冻结、也没有扣积分', 'Rejected: nothing frozen, nothing charged'), 'hint'); }],
    [1900, () => say(t('→ 排队：等正在跑的那个完成，再一个一个提交', '→ queue: wait for the running one, then submit one by one'))],
    [1900, () => { lesson.textContent = t('429 · code 2000 并发上限：账号同一类任务一次只能跑一个。搭建本站时就真的遇到了——请求被拒绝，所以没扣积分；我们把剩下的任务排好队，一个接一个提交。',
      '429 · code 2000, concurrency limit: the account runs one task of this kind at a time. This exact error happened while building this site — the request was rejected, so nothing was charged; we queued the rest and ran them one by one.'); }],
  ]);
  const drop = () => play([...head,
    [1100, () => say(t('  已把 task_id 存到本地', '  task_id saved locally'), 'hint')],
    [2500, () => ramp(0, 40, 1000)],
    [3600, () => { mark(3, 'warn'); say(t('✕ 网络断开——任务状态未知', '✕ Network dropped — task status unknown'), 'bad'); }],
    [4600, () => say(`<s>→ POST ${t('重新提交', 'resubmit')}</s> ${t('✗ 不要！付费请求可能被重复扣费', '✗ never — a paid request could be charged twice')}`, 'bad')],
    [5600, () => { mark(3, 'active'); say(`→ GET ${t('查询已保存的', 'query saved')} task_id`); }],
    [6300, () => { say('← status: running', 'ok'); ramp(40, 100, 1600); }],
    [8000, () => { mark(3, 'done'); mark(4, 'done'); say('status: success', 'ok'); credits('charged'); }],
    [8600, download],
    [3600, () => { lesson.textContent = t('POST 之后网络断了 → 状态未知。付费请求绝不自动重新提交；用保存好的 task_id 去查询，接着等结果。',
      'Network dropped after POST → status unknown. Never auto-resubmit a paid request; resume by querying the saved task_id.'); }],
  ]);
  const actions = { ok: happy, 429: limit, net: drop };
  const ctl = $('.lc-ctl');
  const onClick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    ctl.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    actions[b.dataset.a]();
  };
  ctl.addEventListener('click', onClick);
  happy();

  return {
    dispose() {
      reset();
      ctl.removeEventListener('click', onClick);
      el.classList.remove('d-lifecycle');
      el.innerHTML = '';
    },
  };
}
