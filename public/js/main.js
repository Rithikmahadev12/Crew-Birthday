import { $, h, on, sleep } from './util.js';
import { loadConfig } from './config.js';
import { splitText, watchReveals } from './reveal.js';
import { startAmbient } from './ambient.js';
import { buildCandles } from './candles.js';
import { buildQueue } from './queue.js';
import { Player } from './player.js';

const root = document.documentElement;

async function boot() {
  const cfg = await loadConfig();
  const total = cfg.reels.length;
  const pad = (n) => String(n).padStart(2, '0');

  /* Copy that lives in the JSON */
  $('#reel-count').textContent = pad(total);
  $('#letter').textContent = cfg.message;
  $('#reel-status').textContent = `0 of ${total} lit`;
  renderCredits(cfg);

  splitText();
  const ambient = startAmbient($('#embers'));

  /* Hero candles: decorative, light up when the gate opens */
  const heroCandles = buildCandles($('#hero-candles'), { count: total });
  $('#hero-candles').classList.add('candles');

  /* Reels */
  const watched = new Set();
  const player = new Player(cfg.reels);
  const picker = buildCandles($('#reel-candles'), {
    count: total,
    interactive: true,
    names: cfg.reels.map((r) => r.name),
    onSelect: (i) => player.load(i, { autoplay: true }),
  });
  const queue = buildQueue($('#queue'), cfg, { onSelect: (i) => player.load(i, { autoplay: true }) });

  on('reel:change', ({ index }) => { picker.setActive(index); queue.setActive(index); });

  on('reel:play', ({ index }) => {
    if (watched.has(index)) return;
    watched.add(index);
    picker.light(index);
    queue.setWatched(index);
    $('#reel-status').textContent = `${watched.size} of ${total} lit`;

    if (watched.size === total) celebrate();
  });

  function celebrate() {
    root.classList.add('all-lit');
    const r = $('#reel-candles').getBoundingClientRect();
    ambient.burst(r.left + r.width / 2, r.top + r.height / 3, 140);
    $('#reel-status').textContent = `All ${total} lit. Make a wish.`;
    setTimeout(() => $('#wish').scrollIntoView({ behavior: 'smooth', block: 'center' }), 1400);
  }

  player.load(0);

  /* Gate */
  const gateBtn = $('#gate-btn');
  gateBtn.addEventListener('click', async () => {
    root.classList.add('is-open');
    ambient.burst(innerWidth / 2, innerHeight / 2, 60);
    await sleep(500);
    await heroCandles.lightInSequence(170);
    watchReveals();
  }, { once: true });
  gateBtn.focus({ preventScroll: true });

  /* If the gate never shows (no JS styles), still run reveals */
  if (!getComputedStyle($('#gate')).display.includes('grid')) {
    root.classList.add('is-open');
    heroCandles.lightInSequence(0);
    watchReveals();
  }
}

/** Film-style credit roll, grouped by crew */
function renderCredits(cfg) {
  const roll = $('#roll');
  for (const g of cfg.groups) {
    const reels = cfg.reels.filter((r) => r.group === g.id);
    if (!reels.length) continue;
    roll.append(
      h('div', {},
        h('p', { class: 'roll__label' }, g.label),
        ...reels.map((r) => h('div', { class: 'roll__line' },
          h('span', {}, r.name),
          h('span', {}, `Reel ${String(r.index + 1).padStart(2, '0')}`),
        )),
      ),
    );
  }
}

boot().catch((err) => {
  console.error(err);
  root.classList.add('is-open');
  document.querySelector('main').prepend(
    h('p', { style: 'padding:24px;font-family:monospace;color:#ffc24b' },
      'Could not load the site data. Run it from a web server (npm run dev), not by double-clicking index.html.'),
  );
});
