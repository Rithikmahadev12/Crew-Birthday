import { $$ } from './util.js';

/** Splits [data-split] text into masked words and characters for the intro animation. */
export function splitText() {
  for (const el of $$('[data-split]')) {
    const text = el.textContent;
    const base = Number(el.dataset.splitBase || 0);
    el.textContent = '';
    el.style.setProperty('--base', `${base}ms`);

    let i = 0;
    text.split(' ').forEach((word, wi, words) => {
      const w = document.createElement('span');
      w.className = 'word';
      for (const ch of word) {
        const c = document.createElement('span');
        c.className = 'char';
        c.style.setProperty('--i', i++);
        c.textContent = ch;
        w.append(c);
      }
      el.append(w);
      if (wi < words.length - 1) el.append(' ');
    });
  }
}

/** Fades sections in as they scroll into view. */
export function watchReveals() {
  const els = $$('[data-reveal]');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  );
  els.forEach((el) => io.observe(el));
}
