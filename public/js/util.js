export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function fmtTime(t) {
  if (!Number.isFinite(t) || t < 0) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Tiny element builder: h('div', {class:'x', onclick}, child, 'text') */
export function h(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (val === false || val == null) continue;
    if (key === 'class') node.className = val;
    else if (key === 'html') node.innerHTML = val;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), val);
    else node.setAttribute(key, val === true ? '' : val);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    node.append(kid.nodeType ? kid : document.createTextNode(kid));
  }
  return node;
}

/** App-wide event bus so modules stay decoupled. */
const bus = new EventTarget();
export const on   = (name, fn) => bus.addEventListener(name, (e) => fn(e.detail));
export const emit = (name, detail) => bus.dispatchEvent(new CustomEvent(name, { detail }));

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
