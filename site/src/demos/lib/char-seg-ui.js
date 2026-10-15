// HTML overlay for the segmentation demo: semantic labels with thin SVG leader lines, plus a
// part card (bottom-right, clear of the caption and the panel) with recolour / swap / animate.
import * as THREE from 'three';

const SVGNS = 'http://www.w3.org/2000/svg';

export function createSegOverlay(el, parts, t, actions) {
  const layer = document.createElement('div');
  layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:1;';
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;');
  layer.appendChild(svg);
  el.appendChild(layer);
  const items = parts.map((p) => {
    const line = document.createElementNS(SVGNS, 'line');
    line.setAttribute('stroke', `#${p.color.getHexString()}`);
    line.setAttribute('stroke-width', '1');
    line.setAttribute('stroke-opacity', '0.8');
    const dot = document.createElementNS(SVGNS, 'circle');
    dot.setAttribute('r', '2.5');
    dot.setAttribute('fill', `#${p.color.getHexString()}`);
    svg.append(line, dot);
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;left:0;top:0;padding:2px 8px 2px 6px;border-radius:999px;white-space:nowrap;'
      + 'background:rgba(16,18,23,.82);color:#f2efe9;font:600 11px/1.4 system-ui,sans-serif;display:flex;gap:5px;'
      + 'align-items:center;border:1px solid rgba(255,255,255,.12);opacity:0;transition:opacity .35s;will-change:transform;';
    const sw = document.createElement('span');
    sw.style.cssText = `width:7px;height:7px;border-radius:50%;background:#${p.color.getHexString()}`;
    d.append(sw, document.createTextNode(t(p.zh, p.en)));
    layer.appendChild(d);
    return { p, line, dot, d, sw, on: false };
  });

  // Part card.
  const card = document.createElement('div');
  card.style.cssText = 'position:absolute;right:14px;bottom:14px;z-index:3;min-width:190px;max-width:240px;padding:12px 14px;'
    + 'border-radius:12px;background:rgba(21,23,28,.9);border:1px solid rgba(255,255,255,.12);color:#e8e6e1;'
    + 'font:12px/1.45 system-ui,sans-serif;display:none;';
  const title = document.createElement('div');
  title.style.cssText = 'font-weight:700;font-size:14px;display:flex;align-items:center;gap:7px;';
  const note = document.createElement('div');
  note.style.cssText = 'color:#a9a6a0;margin:4px 0 9px;';
  note.textContent = t('可单独换色 / 替换 / 做动画', 'Recolour / swap / animate on its own');
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
  const btn = (label, fn) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'background:#2a2e37;color:#e8e6e1;border:1px solid #3d424d;border-radius:7px;padding:4px 9px;cursor:pointer;font:inherit;';
    b.addEventListener('click', () => current && fn(current));
    row.appendChild(b);
    return b;
  };
  btn(t('换色', 'Recolour'), actions.onRecolor);
  btn(t('替换', 'Swap'), actions.onSwap);
  btn(t('做动画', 'Animate'), actions.onAnimate);
  const close = document.createElement('button');
  close.textContent = '×';
  close.setAttribute('aria-label', 'close');
  close.style.cssText = 'position:absolute;right:8px;top:6px;background:none;border:0;color:#a9a6a0;font-size:16px;cursor:pointer;';
  close.addEventListener('click', () => { api.select(null); actions.onClose(); });
  card.append(close, title, note, row);
  el.appendChild(card);
  let current = null;

  const a = new THREE.Vector3(), b = new THREE.Vector3();
  const api = {
    select(p) {
      current = p;
      card.style.display = p ? 'block' : 'none';
      if (!p) return;
      title.innerHTML = '';
      const sw = document.createElement('span');
      sw.style.cssText = `width:10px;height:10px;border-radius:50%;background:#${p.seg.color.getHexString()}`;
      title.append(sw, document.createTextNode(t(p.zh, p.en)));
    },
    update(camera, visible, selected) {
      const w = el.clientWidth, h = el.clientHeight;
      items.forEach((it) => {
        const p = it.p;
        const on = visible && p.revealed;
        if (on !== it.on) {
          it.on = on;
          it.d.style.opacity = on ? '1' : '0';
          it.line.style.display = it.dot.style.display = on ? '' : 'none';
        }
        if (!on) return;
        a.copy(p.center).addScaledVector(p.dir, p.amt);
        b.copy(a).addScaledVector(p.dir, 1);
        if (p.dir.lengthSq() < 0.02) b.y += 0.3;
        a.project(camera);
        b.project(camera);
        const ax = (a.x * 0.5 + 0.5) * w, ay = (-a.y * 0.5 + 0.5) * h;
        let dx = (b.x - a.x) * w, dy = (a.y - b.y) * h;
        const len = Math.hypot(dx, dy) || 1;
        const reach = 26 + 30 * Math.min(1, p.amt * 3);
        dx = (dx / len) * reach;
        dy = (dy / len) * reach;
        const lx = ax + dx, ly = ay + dy;
        it.line.setAttribute('x1', ax.toFixed(1));
        it.line.setAttribute('y1', ay.toFixed(1));
        it.line.setAttribute('x2', lx.toFixed(1));
        it.line.setAttribute('y2', ly.toFixed(1));
        it.dot.setAttribute('cx', ax.toFixed(1));
        it.dot.setAttribute('cy', ay.toFixed(1));
        const ox = dx >= 0 ? 0 : -100;
        it.d.style.transform = `translate(${lx.toFixed(1)}px,${ly.toFixed(1)}px) translate(${ox}%,-50%)`;
        it.d.style.outline = selected === p ? '1px solid #ffb347' : 'none';
      });
    },
    dispose() { layer.remove(); card.remove(); },
  };
  return api;
}
