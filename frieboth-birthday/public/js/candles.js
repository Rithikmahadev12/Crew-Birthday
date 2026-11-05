import { h } from './util.js';

let uid = 0;

function candleSVG() {
  const id = ++uid;
  return `
  <svg viewBox="0 0 48 150" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="glow${id}" cx="50%" cy="50%" r="50%">
        <stop offset="0" stop-color="#ffc24b" stop-opacity=".55"/>
        <stop offset="1" stop-color="#ffc24b" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="fl${id}" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="#ff7a38"/>
        <stop offset="1" stop-color="#ffc24b"/>
      </linearGradient>
      <clipPath id="body${id}"><rect x="14" y="48" width="20" height="100" rx="2"/></clipPath>
    </defs>
    <circle class="glow" cx="24" cy="26" r="34" fill="url(#glow${id})"/>
    <g class="flame"><g class="flame__in">
      <path d="M24 5C31.500 17 34 27 24 40 14 27 16.500 17 24 5Z" fill="url(#fl${id})"/>
      <path d="M24 22C27.800 28 27.800 33.500 24 39 20.200 33.500 20.200 28 24 22Z" fill="#fff4c9"/>
    </g></g>
    <line x1="24" y1="40" x2="24" y2="49" stroke="#3a2a28" stroke-width="2" stroke-linecap="round"/>
    <rect x="14" y="48" width="20" height="100" rx="2" fill="#f4eadc"/>
    <g clip-path="url(#body${id})" stroke="#8a2442" stroke-width="6">
      <path d="M8 76 40 60M8 104 40 88M8 132 40 116M8 160 40 144"/>
    </g>
    <rect x="14" y="48" width="20" height="6" rx="2" fill="#000" opacity=".12"/>
  </svg>`;
}

/**
 * Builds a row of candles inside `container`.
 * interactive: renders buttons that call onSelect(index)
 */
export function buildCandles(container, { count, interactive = false, names = [], onSelect } = {}) {
  container.replaceChildren();
  const nodes = [];

  for (let i = 0; i < count; i++) {
    const label = `Reel ${i + 1}${names[i] ? `: ${names[i]}` : ''}`;
    const node = h(
      interactive ? 'button' : 'div',
      {
        class: 'candle',
        style: `--i:${i}`,
        type: interactive ? 'button' : false,
        'aria-label': interactive ? label : false,
        onclick: interactive ? () => onSelect?.(i) : false,
        html: candleSVG() + (interactive ? `<span class="candle__n">${String(i + 1).padStart(2, '0')}</span>` : ''),
      },
    );
    nodes.push(node);
    container.append(node);
  }

  return {
    nodes,
    light(i, on = true) { nodes[i]?.classList.toggle('is-lit', on); },
    setActive(i) {
      nodes.forEach((n, k) => {
        n.classList.toggle('is-active', k === i);
        if (n.tagName === 'BUTTON') n.setAttribute('aria-pressed', String(k === i));
      });
    },
    /** Light every candle one after another */
    async lightInSequence(gap = 140) {
      for (let i = 0; i < nodes.length; i++) {
        this.light(i, true);
        await new Promise((r) => setTimeout(r, gap));
      }
    },
  };
}
