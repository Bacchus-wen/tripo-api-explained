// Shared motion helpers for the info demos (image-gen, multiview, task-lifecycle).
// createClock: one rAF loop that runs scheduled events and tweens on a scalable "demo time",
// so a whole storyboard can be replayed, sped up or cleared without leaking timers.

export const prefersReduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const ease = {
  out: (k) => 1 - (1 - k) ** 3,
  inOut: (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2),
  back: (k) => 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2,
};

export function createClock() {
  let items = [];
  let now = 0;
  let speed = 1;
  let raf = 0;
  let last = 0;
  let seq = 0;
  const frameFns = new Set();
  const loop = (ts) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(64, ts - (last || ts));
    last = ts;
    now += dt * speed;
    frameFns.forEach((fn) => fn(dt * speed, now));
    if (!items.length) return;
    const due = items.filter((it) => it.at <= now);
    if (!due.length) return;
    items = items.filter((it) => it.at > now || it.dur);
    due.sort((a, b) => a.at - b.at || a.id - b.id).forEach((it) => {
      if (!it.dur) { it.fn(); return; }
      const k = Math.min(1, (now - it.at) / it.dur);
      it.fn(it.ease ? it.ease(k) : k, k);
      if (k >= 1) items = items.filter((x) => x !== it);
    });
  };
  raf = requestAnimationFrame(loop);
  return {
    get time() { return now; },
    get speed() { return speed; },
    setSpeed(s) { speed = s; },
    /** Run fn once when demo time reaches `ms` (relative to now). */
    at(ms, fn) { items.push({ at: now + ms, fn, id: seq++ }); },
    /** Call fn(easedK, k) every frame from `ms` for `dur` ms (relative to now). */
    tween(ms, dur, fn, easing = ease.out) {
      items.push({ at: now + ms, dur: Math.max(1, dur), fn, ease: easing, id: seq++ });
    },
    onFrame(fn) { frameFns.add(fn); return () => frameFns.delete(fn); },
    clear() { items = []; },
    dispose() { cancelAnimationFrame(raf); items = []; frameFns.clear(); },
  };
}

// Listener bag: every addEventListener goes through here so dispose() removes all of them.
export function createBag() {
  const offs = [];
  return {
    on(target, type, fn, opts) {
      target.addEventListener(type, fn, opts);
      offs.push(() => target.removeEventListener(type, fn, opts));
      return fn;
    },
    add(off) { offs.push(off); },
    dispose() { offs.splice(0).forEach((f) => f()); },
  };
}

// Inject scoped CSS once inside el.
export function injectStyle(el, css) {
  const s = document.createElement('style');
  s.textContent = css;
  el.appendChild(s);
  return s;
}

// Tiny DOM helper: h('div.cls', {attrs}, children|html)
export function h(tag, attrs = {}, kids) {
  const [name, ...cls] = tag.split('.');
  const n = document.createElement(name || 'div');
  if (cls.length) n.className = cls.join(' ');
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'html') n.innerHTML = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'style') Object.assign(n.style, v);
    else n.setAttribute(k, v);
  });
  if (Array.isArray(kids)) n.append(...kids.filter(Boolean));
  else if (typeof kids === 'string') n.innerHTML = kids;
  return n;
}

// Preload an image without ever logging a 404: resolves with the Image or null.
export function preload(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Rect of `node` relative to `root` (in CSS px).
export function relRect(node, root) {
  const a = node.getBoundingClientRect(), b = root.getBoundingClientRect();
  return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height, cx: a.left - b.left + a.width / 2, cy: a.top - b.top + a.height / 2 };
}

export const svgNS = 'http://www.w3.org/2000/svg';
export function svgEl(tag, attrs = {}) {
  const n = document.createElementNS(svgNS, tag);
  Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
  return n;
}
