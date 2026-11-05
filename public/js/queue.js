import { h, fmtTime } from './util.js';

const FLAME = `
<svg class="reel__lit" viewBox="0 0 20 28" aria-hidden="true">
  <path d="M10 1C14.500 8 16 13 10 21 4 13 5.500 8 10 1Z" fill="#ffc24b"/>
  <path d="M10 11C12 14.500 12 17 10 20 8 17 8 14.500 10 11Z" fill="#fff4c9"/>
</svg>`;

/** Renders the grouped reel list and returns small setters for state. */
export function buildQueue(root, cfg, { onSelect }) {
  root.replaceChildren();
  const items = new Map();

  for (const group of cfg.groups) {
    const reels = cfg.reels.filter((r) => r.group === group.id);
    if (!reels.length) continue;

    const list = h('ol', {}, ...reels.map((reel) => {
      const dur = h('span', { class: 'reel__dur' }, '');
      const btn = h(
        'button',
        { class: 'reel', type: 'button', onclick: () => onSelect(reel.index) },
        h('span', { class: 'reel__n' }, String(reel.index + 1).padStart(2, '0')),
        h('span', {}, h('span', { class: 'reel__name' }, reel.name), h('span', { class: 'reel__note' }, reel.note ?? '')),
        h('span', { class: 'reel__meta', html: FLAME }, dur),
      );
      items.set(reel.index, { btn, dur });
      return h('li', {}, btn);
    }));

    root.append(h('div', { class: 'queue__group' }, h('p', { class: 'queue__label' }, group.label), list));
  }

  // Read each clip's length quietly so the list can show durations
  for (const reel of cfg.reels) {
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.muted = true;
    probe.addEventListener('loadedmetadata', () => {
      items.get(reel.index).dur.textContent = fmtTime(probe.duration);
      probe.removeAttribute('src');
      probe.load();
    }, { once: true });
    probe.src = reel.sources[0].src;
  }

  return {
    setActive(i) {
      items.forEach(({ btn }, k) => {
        btn.classList.toggle('is-active', k === i);
        btn.setAttribute('aria-current', k === i ? 'true' : 'false');
      });
    },
    setWatched(i) { items.get(i)?.btn.classList.add('is-watched'); },
  };
}
