// ─── Helpers ──────────────────────────────────────────────────────────────────
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
  const total = cfg.reels.length;

  const s1 = $('#screen1');
  const s2 = $('#screen2');
  const enterBtn = $('#enter-btn');
  const backBtn = $('#back-btn');
  const statusEl = $('#reel-status');
  const wishEl = $('#wish');
  const candleStage = $('#candle-stage');
  const screenEl = $('#screen');
  const audioPlayerEl = $('#audio-player');

  statusEl.textContent = `0 of ${total} lit`;

  // ── Screen 1 → 2 transition ───────────────────────────────────────────────
  enterBtn.addEventListener('click', () => {
    s1.classList.add('hidden');
    s2.classList.remove('hidden');
    s2.classList.add('visible');
    s2.removeAttribute('aria-hidden');
  }, { once: true });

  backBtn.addEventListener('click', () => {
    pauseAll();
    s2.classList.remove('visible');
    s2.classList.add('hidden');
    s1.classList.remove('hidden');
    s1.removeAttribute('aria-hidden');
    candleStage.style.display = '';
    screenEl.style.display = 'none';
    audioPlayerEl.style.display = 'none';
    currentIndex = -1;
  });

  // ── Candle row ────────────────────────────────────────────────────────────
  const candleRow = $('#candle-row');
  const candleDots = [];
  const watched = new Set();
  let currentIndex = -1;

  cfg.reels.forEach((reel, idx) => {
    const btn = document.createElement('button');
    btn.className = 'candle-btn';
    btn.setAttribute('aria-label', `Unlock reel ${idx + 1}`);
    btn.dataset.index = idx;
    btn.innerHTML = `
      <div class="candle-wrap">
        <svg class="candle-svg" viewBox="0 0 48 150" aria-hidden="true">
          <defs>
            <radialGradient id="glow${idx}" cx="50%" cy="50%" r="50%">
              <stop offset="0" stop-color="#f5b944" stop-opacity=".6"/>
              <stop offset="1" stop-color="#f5b944" stop-opacity="0"/>
            </radialGradient>
            <linearGradient id="fl${idx}" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stop-color="#f07030"/>
              <stop offset="1" stop-color="#f5b944"/>
            </linearGradient>
          </defs>
          <circle class="c-glow" cx="24" cy="26" r="34" fill="url(#glow${idx})"/>
          <g class="c-flame">
            <path d="M24 5C31.5 17 34 27 24 40 14 27 16.5 17 24 5Z" fill="url(#fl${idx})"/>
            <path d="M24 22C27.8 28 27.8 33.5 24 39 20.2 33.5 20.2 28 24 22Z" fill="#fff4c9"/>
          </g>
          <line x1="24" y1="40" x2="24" y2="49" stroke="#3a2a28" stroke-width="2" stroke-linecap="round"/>
          <rect x="14" y="48" width="20" height="100" rx="2" fill="#f4eadc"/>
          <g stroke="#8a2442" stroke-width="6">
            <path d="M8 76 40 60M8 104 40 88M8 132 40 116"/>
          </g>
        </svg>
        <span class="candle-num">${String(idx + 1).padStart(2, '0')}</span>
      </div>`;
    btn.addEventListener('click', () => selectReel(idx));
    candleRow.appendChild(btn);
  });

  // ── Sidebar candle dots ───────────────────────────────────────────────────
  const dotsEl = $('#reel-candles');
  cfg.reels.forEach((_, idx) => {
    const dot = document.createElement('div');
    dot.className = 'candle-dot';
    dot.dataset.index = idx;
    dotsEl.appendChild(dot);
    candleDots.push(dot);
  });

  // ── Build queue ───────────────────────────────────────────────────────────
  const queueEl = $('#queue');
  for (const g of cfg.groups) {
    const reels = cfg.reels.filter(r => r.group === g.id);
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
      const isAudioType = reel.type === 'audio' || reel.type === 'video-as-audio';
      const typeIcon = isAudioType
        ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 18V6l12-2v12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="18" cy="16" r="3" fill="currentColor"/></svg>`
        : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 4.5v15l14-7.5-14-7.5z" fill="currentColor"/></svg>`;
      item.innerHTML = `
        <span class="q-item__num">${String(idx + 1).padStart(2, '0')}</span>
        <div class="q-item__info">
          <p class="q-item__name">${reel.name}</p>
          <p class="q-item__tag">${g.label} &nbsp;${typeIcon}</p>
        </div>
        <div class="q-item__lock" data-index="${idx}">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor" opacity=".5"/><path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </div>`;
      item.addEventListener('click', () => selectReel(idx));
      group.appendChild(item);
    }
    queueEl.appendChild(group);
  }

  // ── Hidden video element for video-as-audio ───────────────────────────────
  const hiddenVideo = document.createElement('video');
  hiddenVideo.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none;';
  hiddenVideo.muted = false;
  hiddenVideo.playsInline = true;
  hiddenVideo.preload = 'metadata';
  document.body.appendChild(hiddenVideo);

  // ── Video player wiring (for "last" crew / pure video type) ───────────────
  const videoEl = $('#video-main');
  const bigPlay = $('#big-play');
  const ctlPlay = $('#ctl-play');
  const ctlMute = $('#ctl-mute');
  const ctlFull = $('#ctl-full');
  const scrub = $('#scrub');
  const timeCur = $('#time-cur');
  const timeDur = $('#time-dur');
  const reelName = $('#reel-name');
  const reelGroup = $('#reel-group');

  function toggleVideoPlay() {
    if (videoEl.paused) videoEl.play().then(() => { screenEl.dataset.state = 'playing'; markWatched(currentIndex); }).catch(() => {});
    else { videoEl.pause(); screenEl.dataset.state = 'paused'; }
  }

  bigPlay.addEventListener('click', toggleVideoPlay);
  ctlPlay.addEventListener('click', toggleVideoPlay);
  videoEl.addEventListener('ended', () => { screenEl.dataset.state = 'paused'; });
  videoEl.addEventListener('timeupdate', () => {
    if (!videoEl.duration) return;
    scrub.value = (videoEl.currentTime / videoEl.duration) * 1000;
    timeCur.textContent = fmtTime(videoEl.currentTime);
  });
  videoEl.addEventListener('loadedmetadata', () => { timeDur.textContent = fmtTime(videoEl.duration); });
  scrub.addEventListener('input', () => {
    if (videoEl.duration) videoEl.currentTime = (scrub.value / 1000) * videoEl.duration;
  });
  ctlMute.addEventListener('click', () => {
    videoEl.muted = !videoEl.muted;
    screenEl.toggleAttribute('data-muted', videoEl.muted);
  });
  ctlFull.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else screenEl.requestFullscreen?.();
  });

  // ── Shared audio player state ─────────────────────────────────────────────
  // activeAudioEl points to either the Audio() object (for pure audio)
  // or the hiddenVideo element (for video-as-audio)
  let activeAudioEl = null;

  const aCtlPlay = $('#a-ctl-play');
  const aCtlMute = $('#a-ctl-mute');
  const aScrub = $('#a-scrub');
  const aTimeCur = $('#a-time-cur');
  const aTimeDur = $('#a-time-dur');
  const audioName = $('#audio-name');
  const audioGroup = $('#audio-group');
  let audioPlaying = false;
  let audioMuted = false;

  // Pure audio element (for type === 'audio')
  const pureAudioEl = new Audio();

  // ── Waveform canvas ───────────────────────────────────────────────────────
  const waveCanvas = $('#wave-canvas');
  const waveCtx = waveCanvas.getContext('2d');
  let waveRaf;
  let wavePhase = 0;

  function drawWave(playing) {
    const w = waveCanvas.width;
    const h = waveCanvas.height;
    waveCtx.clearRect(0, 0, w, h);
    const bars = 48;
    const gap = 3;
    const barW = (w - gap * (bars - 1)) / bars;
    for (let i = 0; i < bars; i++) {
      const amp = playing
        ? 0.15 + 0.7 * Math.abs(Math.sin(wavePhase + i * 0.4 + Math.sin(i * 0.2 + wavePhase * 0.5) * 1.2))
        : 0.08 + 0.06 * Math.sin(i * 0.5);
      const barH = amp * h;
      const x = i * (barW + gap);
      const y = (h - barH) / 2;
      const alpha = 0.3 + amp * 0.7;
      waveCtx.fillStyle = `rgba(245,185,68,${alpha})`;
      waveCtx.beginPath();
      waveCtx.roundRect(x, y, barW, barH, 2);
      waveCtx.fill();
    }
    if (playing) {
      wavePhase += 0.07;
      waveRaf = requestAnimationFrame(() => drawWave(true));
    }
  }

  function resizeWave() {
    const container = document.getElementById('audio-wave');
    waveCanvas.width = container.clientWidth || 300;
    waveCanvas.height = container.clientHeight || 80;
    drawWave(audioPlaying);
  }
  window.addEventListener('resize', resizeWave);

  // ── Audio card play/pause (works for both pure audio + video-as-audio) ────
  function toggleAudioPlay() {
    if (!activeAudioEl) return;
    if (audioPlaying) {
      activeAudioEl.pause();
      audioPlaying = false;
      audioPlayerEl.dataset.state = 'paused';
      cancelAnimationFrame(waveRaf);
      drawWave(false);
    } else {
      activeAudioEl.play().then(() => {
        audioPlaying = true;
        audioPlayerEl.dataset.state = 'playing';
        markWatched(currentIndex);
        drawWave(true);
      }).catch(() => {});
    }
  }

  function syncAudioProgress() {
    if (!activeAudioEl || !activeAudioEl.duration) return;
    aScrub.value = (activeAudioEl.currentTime / activeAudioEl.duration) * 1000;
    aTimeCur.textContent = fmtTime(activeAudioEl.currentTime);
  }

  function onAudioLoaded() {
    aTimeDur.textContent = fmtTime(activeAudioEl.duration);
  }

  function onAudioEnded() {
    audioPlaying = false;
    audioPlayerEl.dataset.state = 'paused';
    cancelAnimationFrame(waveRaf);
    drawWave(false);
  }

  // Wire shared controls to whatever activeAudioEl is at time of event
  aCtlPlay.addEventListener('click', toggleAudioPlay);
  aCtlMute.addEventListener('click', () => {
    audioMuted = !audioMuted;
    if (activeAudioEl) activeAudioEl.muted = audioMuted;
    audioPlayerEl.toggleAttribute('data-muted', audioMuted);
  });
  aScrub.addEventListener('input', () => {
    if (activeAudioEl && activeAudioEl.duration)
      activeAudioEl.currentTime = (aScrub.value / 1000) * activeAudioEl.duration;
  });

  // Forward events from both audio sources through shared handlers
  function attachAudioEvents(el) {
    el.addEventListener('timeupdate', syncAudioProgress);
    el.addEventListener('loadedmetadata', onAudioLoaded);
    el.addEventListener('ended', onAudioEnded);
  }
  attachAudioEvents(pureAudioEl);
  attachAudioEvents(hiddenVideo);

  // ── Select reel ───────────────────────────────────────────────────────────
  function selectReel(idx) {
    pauseAll();
    currentIndex = idx;
    const reel = cfg.reels[idx];
    const g = cfg.groups.find(gr => gr.id === reel.group);

    document.querySelectorAll('.q-item').forEach(el => {
      el.classList.toggle('active', Number(el.dataset.index) === idx);
    });
    document.querySelectorAll('.candle-btn').forEach(el => {
      el.classList.toggle('active', Number(el.dataset.index) === idx);
    });

    candleStage.style.display = 'none';

    if (reel.type === 'audio') {
      // ── Pure audio card ──────────────────────────────────────────────────
      screenEl.style.display = 'none';
      audioPlayerEl.style.display = 'flex';
      audioName.textContent = reel.name;
      audioGroup.textContent = g ? g.label : '';

      activeAudioEl = pureAudioEl;
      pureAudioEl.src = reel.sources[0];
      pureAudioEl.load();
      audioPlaying = false;
      audioPlayerEl.dataset.state = 'paused';
      aScrub.value = 0;
      aTimeCur.textContent = '0:00';
      aTimeDur.textContent = '0:00';
      setTimeout(resizeWave, 50);
      drawWave(false);

    } else if (reel.type === 'video-as-audio') {
      // ── Video playing hidden, audio card shown on top ────────────────────
      screenEl.style.display = 'none';
      audioPlayerEl.style.display = 'flex';
      audioName.textContent = reel.name;
      audioGroup.textContent = g ? g.label : '';

      activeAudioEl = hiddenVideo;
      hiddenVideo.src = reel.sources[0];
      hiddenVideo.load();
      audioPlaying = false;
      audioPlayerEl.dataset.state = 'paused';
      aScrub.value = 0;
      aTimeCur.textContent = '0:00';
      aTimeDur.textContent = '0:00';
      setTimeout(resizeWave, 50);
      drawWave(false);

    } else {
      // ── Normal video player ──────────────────────────────────────────────
      audioPlayerEl.style.display = 'none';
      screenEl.style.display = 'block';
      reelName.textContent = reel.name;
      reelGroup.textContent = g ? g.label : '';
      screenEl.dataset.state = 'idle';
      videoEl.pause();
      videoEl.removeAttribute('src');
      videoEl.load();
      videoEl.src = reel.sources[0];
      videoEl.load();
      videoEl.onerror = () => { screenEl.dataset.state = 'error'; };
      scrub.value = 0;
      timeCur.textContent = '0:00';
      timeDur.textContent = '0:00';
    }
  }

  function pauseAll() {
    // Pause video player
    videoEl.pause();
    screenEl.dataset.state = 'paused';
    // Pause hidden video
    hiddenVideo.pause();
    // Pause pure audio
    pureAudioEl.pause();
    audioPlaying = false;
    cancelAnimationFrame(waveRaf);
    activeAudioEl = null;
  }

  // ── Mark watched ──────────────────────────────────────────────────────────
  function markWatched(idx) {
    if (watched.has(idx)) return;
    watched.add(idx);

    const btn = document.querySelector(`.candle-btn[data-index="${idx}"]`);
    if (btn) btn.classList.add('lit');

    if (candleDots[idx]) candleDots[idx].classList.add('lit');

    const lock = document.querySelector(`.q-item__lock[data-index="${idx}"]`);
    if (lock) {
      lock.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#f5b944" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }
    const qItem = document.querySelector(`.q-item[data-index="${idx}"]`);
    if (qItem) qItem.classList.add('watched');

    statusEl.textContent = `${watched.size} of ${total} lit`;

    if (watched.size === total) {
      wishEl.textContent = 'Make a wish. 🕯️';
      wishEl.classList.add('show');
    }
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (!s2.classList.contains('visible')) return;
    if (e.key === ' ') {
      e.preventDefault();
      if (currentIndex < 0) return;
      const reel = cfg.reels[currentIndex];
      if (reel.type === 'audio' || reel.type === 'video-as-audio') toggleAudioPlay();
      else toggleVideoPlay();
    }
    if (e.key === 'ArrowRight' && currentIndex >= 0) selectReel(Math.min(currentIndex + 1, total - 1));
    if (e.key === 'ArrowLeft' && currentIndex >= 0) selectReel(Math.max(currentIndex - 1, 0));
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
      vx: rand(-.1, .1), vy: rand(-.18, -.08),
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
    const target = Math.round((w * h) / 55000);
    if (parts.length < target && Math.random() < .4) spawn();
    parts = parts.filter(p => p.life < p.max && p.y > -20);
    for (const p of parts) {
      p.life += dt;
      p.sway += dt * 1.2;
      p.x += (p.vx + Math.sin(p.sway) * .1) * 60 * dt;
      p.y += p.vy * 60 * dt;
      const a = Math.sin(Math.PI * Math.min(p.life / p.max, 1)) * .4;
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
