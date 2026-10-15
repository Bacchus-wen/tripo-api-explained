// In-stage zoom view: the clicked image grows (FLIP via WAAPI) from its thumbnail into a
// centred, letterboxed view with a caption. Click anywhere or press Esc to close.
import { prefersReduced } from './info-motion.js';

const CSS = `
.info-zoom{position:absolute;inset:0;z-index:30;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;
  padding:48px 56px 40px;background:rgba(9,10,13,.82);backdrop-filter:blur(6px);cursor:zoom-out;opacity:0;transition:opacity .28s ease}
.info-zoom.in{opacity:1}
.info-zoom img{max-width:100%;max-height:calc(100% - 44px);min-height:0;border-radius:12px;box-shadow:0 30px 80px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.06);
  transform-origin:0 0;will-change:transform}
.info-zoom figcaption{font-size:13px;color:#d6d3cd;text-align:center;max-width:46em;line-height:1.5}
.info-zoom figcaption code{font-family:var(--mono);font-size:12px;color:#ffb347}
.info-zoom .iz-x{position:absolute;top:12px;right:14px;width:30px;height:30px;border-radius:50%;border:1px solid #3a3f4a;background:#1b1e24;
  color:#ece9e3;font-size:16px;line-height:1;cursor:pointer;display:grid;place-items:center}
.info-zoom .iz-x:hover{border-color:#ffb347}
`;

export function createZoom(root) {
  const style = document.createElement('style');
  style.textContent = CSS;
  root.appendChild(style);
  let layer = null;
  let onKey = null;

  function close() {
    if (!layer) return;
    const l = layer;
    layer = null;
    window.removeEventListener('keydown', onKey);
    l.classList.remove('in');
    setTimeout(() => l.remove(), prefersReduced() ? 0 : 280);
  }

  function open(src, fromNode, captionHtml) {
    close();
    const l = document.createElement('figure');
    l.className = 'info-zoom';
    l.setAttribute('role', 'dialog');
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    const cap = document.createElement('figcaption');
    cap.innerHTML = captionHtml || '';
    const x = document.createElement('button');
    x.className = 'iz-x';
    x.type = 'button';
    x.textContent = '×';
    x.setAttribute('aria-label', 'close');
    l.append(img, cap, x);
    root.appendChild(l);
    layer = l;
    l.addEventListener('click', close);
    onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    requestAnimationFrame(() => {
      l.classList.add('in');
      if (prefersReduced() || !fromNode?.isConnected || !img.animate) return;
      const a = fromNode.getBoundingClientRect(), b = img.getBoundingClientRect();
      if (!b.width || !a.width) return;
      const sx = a.width / b.width, sy = a.height / b.height, s = Math.min(sx, sy);
      img.animate([
        { transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${s})`, opacity: 0.6 },
        { transform: 'none', opacity: 1 },
      ], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  }

  return {
    open,
    close,
    get isOpen() { return !!layer; },
    dispose() {
      if (onKey) window.removeEventListener('keydown', onKey);
      layer?.remove();
      layer = null;
      style.remove();
    },
  };
}
