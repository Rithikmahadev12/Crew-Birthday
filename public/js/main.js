// ─── Music ───────────────────────────────────────────────────────────────────
let music = null;
let musicMuted = false;

function initMusic() {
  if (music) return;
  music = new Audio('assets/Birthday.mp3');
  music.loop = true;
  music.volume = 0.35;
}

function playMusic() {
  initMusic();
  if (!musicMuted) music.play().catch(() => {});
}

function toggleMusic(btn) {
  initMusic();
  musicMuted = !musicMuted;
  btn.classList.toggle('muted', musicMuted);
  if (musicMuted) {
    music.pause();
  } else {
    music.play().catch(() => {});
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const $ = (s) => document.querySelector(s);
const fmtTime = (s) => {
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function boot() {
  const res = await fetch('data/crew.json');
  const cfg = await res.json();

  const s1 = $('#screen1');
  const s2 = $('#screen2');
  const enterBtn = $('#enter-btn');
  const backBtn = $('#back-btn');

  // ── Screen transition ──────────────────────────────────────────────────────
  enterBtn.addEventListener('click', () => {
    playMusic();
    s1.classList.add('hidden');
    s2.classList.remove('hidden');
    s2.classList.add('visible');
    s2.removeAttribute('aria-hidden');
    s1.setAttribute('aria-hidden', 'true');
    loadReel(0);
  }, { once: true });

  backBtn.addEventListener('click', () => {
    s2.classList.remove('visible');
    s2.classList.add('hidden');
    s1.classList.remove('hidden');
    s1.removeAttribute('aria-hidden');
    s2.setAttribute('aria-hidden', 'true');
    if (music) { music.pause(); music.currentTime = 0; }
    musicMuted = false;
  });

  // ── Build queue ────────────────────────────────────────────────────────────
  const queueEl = $('#queue');
  const watched = new Set();
  const total = cfg.reels.length;

  for (const g of cfg.groups) {
    const reels = cfg.reels.filter((r) => r.group === g.id);
    if (!reels.length) continue;

    const group = document.createElement('div');
    group.className = 'q-group';

    const label = document.createElement('p');
    label.className = 'q-group__label';
    label.textContent = g.label;
    group.appendChild(label);

    for (const reel of reels) {
      const idx = cfg.reels.indexOf(reel);
      const item = document.createElement('div');
      item.className = 'q-item';
      item.dataset.index = idx;
      item.innerHTML = `
        <span class="q-item__num">${String(idx + 1).padStart(2, '0')}</span>
        <div class="q-item__info">
          <p class="q-item__name">${reel.name}</p>
          <p class="q-item__tag">${g.label}</p>
        </div>
        <div class="q-item__check">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1.5 4l2 2 3-3" stroke="#000" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>`;
      item.addEventListener('click', () => loadReel(idx));
      group.appendChild(item);
    }

    queueEl.appendChild(group);
  }

  // ── Candle dots ────────────────────────────────────────────────────────────
  const candlesEl = $('#reel-candles');
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('div');
    dot.className = 'candle-dot';
    dot.dataset.index = i;
    candlesEl.appendChild(dot);
  }

  // ── Player ─────────────────────────────────────────────────────────────────
  const screenEl = $('#screen');
  const videoEl = $('#video-main');
  const bigPlay = $('#big-play');
  const ctlPlay = $('#ctl-play');
  const ctlMute = $('#ctl-mute');
  const ctlFull = $('#ctl-full');
  const ctlMusic = $('#ctl-music');
  const scrub = $('#scrub');
  const timeCur = $('#time-cur');
  const timeDur = $('#time-dur');
  const reelName = $('#reel-name');
  const reelGroup = $('#reel-group');
  const statusEl = $('#reel-status');
  const wishEl = $('#s2__wish') || $('.s2__wish') || document.querySelector('.s2__wish');

  let currentIndex = -1;

  function loadReel(idx) {
    const reel = cfg.reels[idx];
    if (!reel) return;
    currentIndex = idx;

    // Update active state in queue
    document.querySelectorAll('.q-item').forEach((el) => {
      el.classList.toggle('active', Number(el.dataset.index) === idx);
    });

    // Caption
    reelName.textContent = reel.name;
    const g = cfg.groups.find((gr) => gr.id === reel.group);
    reelGroup.textContent = g ? g.label : '';

    // Load video
    screenEl.dataset.state = 'idle';
    videoEl.pause();
    videoEl.removeAttribute('src');
    videoEl.load();

    const src = reel.sources[0];
    videoEl.src = src;
    videoEl.load();

    videoEl.onerror = () => { screenEl.dataset.state = 'error'; };
    videoEl.oncanplay = () => { screenEl.dataset.state = 'paused'; };
  }

  function togglePlay() {
    if (videoEl.paused) {
      videoEl.play().then(() => {
        screenEl.dataset.state = 'playing';
        // Mark watched on first play
        if (!watched.has(currentIndex)) {
          watched.add(currentIndex);
          markWatched(currentIndex);
        }
      }).catch(() => {});
    } else {
      videoEl.pause();
      screenEl.dataset.state = 'paused';
    }
  }

  function markWatched(idx) {
    // Queue item
    const item = document.querySelector(`.q-item[data-index="${idx}"]`);
    if (item) item.classList.add('watched');

    // Candle dot
    const dot = document.querySelector(`.candle-dot[data-index="${idx}"]`);
    if (dot) dot.classList.add('lit');

    // Status
    statusEl.textContent = `${watched.size} of ${total} watched`;

    // All watched
    if (watched.size === total) {
      const w = document.querySelector('.s2__wish');
      if (w) { w.textContent = 'Make a wish. 🕯️'; w.classList.add('show'); }
    }
  }

  bigPlay.addEventListener('click', togglePlay);
  ctlPlay.addEventListener('click', togglePlay);

  videoEl.addEventListener('ended', () => {
    screenEl.dataset.state = 'paused';
    // Auto-advance
    const next = currentIndex + 1;
    if (next < total) loadReel(next);
  });

  videoEl.addEventListener('timeupdate', () => {
    if (!videoEl.duration) return;
    scrub.value = (videoEl.currentTime / videoEl.duration) * 1000;
    timeCur.textContent = fmtTime(videoEl.currentTime);
  });

  videoEl.addEventListener('loadedmetadata', () => {
    timeDur.textContent = fmtTime(videoEl.duration);
  });

  scrub.addEventListener('input', () => {
    if (!videoEl.duration) return;
    videoEl.currentTime = (scrub.value / 1000) * videoEl.duration;
  });

  ctlMute.addEventListener('click', () => {
    videoEl.muted = !videoEl.muted;
    screenEl.toggleAttribute('data-muted', videoEl.muted);
  });

  ctlFull.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else screenEl.requestFullscreen?.();
  });

  ctlMusic.addEventListener('click', () => toggleMusic(ctlMusic));

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!s2.classList.contains('visible')) return;
    if (e.key === ' ') { e.preventDefault(); togglePlay(); }
    if (e.key === 'ArrowRight') loadReel(Math.min(currentIndex + 1, total - 1));
    if (e.key === 'ArrowLeft') loadReel(Math.max(currentIndex - 1, 0));
    if (e.key === 'm' || e.key === 'M') { videoEl.muted = !videoEl.muted; screenEl.toggleAttribute('data-muted', videoEl.muted); }
  });

  // Pause music while video plays, resume after
  videoEl.addEventListener('play', () => {
    if (music && !musicMuted) music.volume = 0.1;
  });
  videoEl.addEventListener('pause', () => {
    if (music && !musicMuted) music.volume = 0.35;
  });
  videoEl.addEventListener('ended', () => {
    if (music && !musicMuted) music.volume = 0.35;
  });
}

// ─── Embers ───────────────────────────────────────────────────────────────────
(function embers() {
  const canvas = document.getElementById('embers');
  const ctx = canvas.getContext('2d');
  let w, h, dpr;
  let parts = [];
  let raf;
  let last = performance.now();

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const rand = (a, b) => a + Math.random() * (b - a);

  function spawn() {
    parts.push({
      x: rand(0, w), y: h + 8,
      vx: rand(-.12, .12), vy: rand(-.18, -.08),
      r: rand(.6, 1.8),
      life: 0, max: rand(7, 14),
      sway: rand(0, Math.PI * 2),
      hot: Math.random() < .3,
    });
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, .05);
    last = now;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    const target = Math.round((w * h) / 50000);
    if (parts.filter(p => !p.burst).length < target && Math.random() < .4) spawn();

    parts = parts.filter(p => p.life < p.max && p.y > -20);
    for (const p of parts) {
      p.life += dt;
      p.sway += dt * 1.2;
      p.x += (p.vx + Math.sin(p.sway) * .1) * 60 * dt;
      p.y += p.vy * 60 * dt;

      const a = Math.sin(Math.PI * Math.min(p.life / p.max, 1)) * .45;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
      const c = p.hot ? '255,120,55' : '245,185,68';
      g.addColorStop(0, `rgba(${c},${a})`);
      g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else { last = performance.now(); raf = requestAnimationFrame(frame); }
  });

  resize();
  raf = requestAnimationFrame(frame);
})();

boot().catch(console.error);
