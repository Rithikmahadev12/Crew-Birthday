import { $, fmtTime, emit } from './util.js';

/**
 * Custom reel player.
 * - two <video> elements: the sharp one, plus a muted blurred copy behind it
 * - custom controls, keyboard shortcuts, auto-advance, fullscreen, Media Session
 * Emits: reel:change, reel:play, reel:ended
 */
export class Player {
  constructor(reels) {
    this.reels = reels;
    this.index = 0;
    this.sources = 0;
    this.failed = 0;
    this.dragging = false;
    this.idleTimer = 0;

    this.screen = $('#screen');
    this.main = $('#video-main');
    this.bg = $('#video-bg');
    this.bigPlay = $('#big-play');
    this.btnPlay = $('#ctl-play');
    this.btnMute = $('#ctl-mute');
    this.btnFull = $('#ctl-full');
    this.scrub = $('#scrub');
    this.tCur = $('#time-cur');
    this.tDur = $('#time-dur');
    this.nameEl = $('#reel-name');
    this.groupEl = $('#reel-group');

    this.bind();
  }

  /* ───────── wiring ───────── */
  bind() {
    const m = this.main;

    this.bigPlay.addEventListener('click', () => this.toggle());
    this.btnPlay.addEventListener('click', () => this.toggle());
    m.addEventListener('click', () => this.toggle());
    this.btnMute.addEventListener('click', () => this.setMuted(!m.muted));
    this.btnFull.addEventListener('click', () => this.fullscreen());

    m.addEventListener('play',  () => { this.state('playing'); this.bg.play().catch(() => {}); this.loop(); emit('reel:play', { index: this.index }); });
    m.addEventListener('pause', () => { if (!m.ended) this.state('paused'); this.bg.pause(); });
    m.addEventListener('ended', () => { this.state('ended'); emit('reel:ended', { index: this.index }); this.advance(); });
    m.addEventListener('waiting', () => this.screen.dataset.buffering = 'true');
    m.addEventListener('playing', () => delete this.screen.dataset.buffering);
    m.addEventListener('seeked', () => { this.bg.currentTime = m.currentTime; });
    m.addEventListener('loadedmetadata', () => { this.tDur.textContent = fmtTime(m.duration); if (this.state() === 'loading') this.state('paused'); });
    m.addEventListener('durationchange', () => { this.tDur.textContent = fmtTime(m.duration); });
    m.addEventListener('error', () => this.fail());
    m.addEventListener('timeupdate', () => this.paint());

    // Scrubbing
    this.scrub.addEventListener('input', () => {
      this.dragging = true;
      const t = (this.scrub.value / 1000) * (m.duration || 0);
      this.tCur.textContent = fmtTime(t);
      this.scrub.style.setProperty('--p', `${this.scrub.value / 10}%`);
      if (Number.isFinite(t)) m.currentTime = t;
    });
    this.scrub.addEventListener('change', () => { this.dragging = false; });

    // Controls fade out while playing and the pointer is still
    const wake = () => {
      this.screen.dataset.idle = 'false';
      clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => { this.screen.dataset.idle = 'true'; }, 2600);
    };
    ['pointermove', 'pointerdown', 'focusin'].forEach((ev) => this.screen.addEventListener(ev, wake));
    this.screen.addEventListener('pointerleave', () => { this.screen.dataset.idle = 'true'; });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t.matches?.('input, textarea, select')) return;
      switch (e.key) {
        case ' ':
          if (t.tagName === 'BUTTON') return; // let the focused button handle space
          e.preventDefault(); this.toggle(); break;
        case 'ArrowRight': this.step(1);  break;
        case 'ArrowLeft':  this.step(-1); break;
        case 'm': case 'M': this.setMuted(!m.muted); break;
        case 'f': case 'F': this.fullscreen(); break;
        default: return;
      }
    });

    // Keep bg video from drifting
    this.drift = setInterval(() => {
      if (!this.main.paused && Math.abs(this.bg.currentTime - this.main.currentTime) > .4) {
        this.bg.currentTime = this.main.currentTime;
      }
    }, 1000);

    this.screen.dataset.muted = String(m.muted);
  }

  /* ───────── state ───────── */
  state(next) {
    if (next === undefined) return this.screen.dataset.state;
    this.screen.dataset.state = next;
    const playing = next === 'playing';
    this.btnPlay.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    this.bigPlay.setAttribute('aria-label', playing ? 'Pause reel' : 'Play reel');
  }

  fail() {
    this.failed++;
    this.state('missing');
    this.tDur.textContent = '0:00';
  }

  /* ───────── loading ───────── */
  setSources(video, reel, track) {
    video.pause();
    video.removeAttribute('src');
    video.replaceChildren();
    let failed = 0;
    for (const s of reel.sources) {
      const el = document.createElement('source');
      el.src = s.src;
      if (s.type) el.type = s.type;
      if (track) el.addEventListener('error', () => { if (++failed === reel.sources.length) this.fail(); });
      video.append(el);
    }
    video.load();
  }

  load(i, { autoplay = false } = {}) {
    const reel = this.reels[i];
    if (!reel) return;
    this.index = i;
    this.state('loading');

    this.setSources(this.main, reel, true);
    this.setSources(this.bg, reel, false);

    this.nameEl.textContent = reel.name;
    this.groupEl.textContent = reel.groupLabel;
    this.scrub.value = 0;
    this.scrub.style.setProperty('--p', '0%');
    this.tCur.textContent = '0:00';
    this.tDur.textContent = '0:00';

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: reel.name, artist: reel.groupLabel, album: 'Happy Birthday Mrs. Frieboth' });
      navigator.mediaSession.setActionHandler('previoustrack', () => this.step(-1));
      navigator.mediaSession.setActionHandler('nexttrack', () => this.step(1));
    }

    emit('reel:change', { index: i });
    if (autoplay) this.play();
  }

  /* ───────── transport ───────── */
  async play() {
    try { await this.main.play(); } catch { /* blocked or interrupted: the button stays visible */ }
  }
  pause() { this.main.pause(); }
  toggle() { this.main.paused ? this.play() : this.pause(); }

  step(dir) {
    const next = (this.index + dir + this.reels.length) % this.reels.length;
    this.load(next, { autoplay: !this.main.paused || this.state() === 'ended' });
  }

  advance() {
    if (this.index < this.reels.length - 1) this.load(this.index + 1, { autoplay: true });
  }

  setMuted(v) {
    this.main.muted = v;
    this.screen.dataset.muted = String(v);
    this.btnMute.setAttribute('aria-label', v ? 'Unmute' : 'Mute');
  }

  async fullscreen() {
    const el = this.screen;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (this.main.webkitEnterFullscreen) this.main.webkitEnterFullscreen(); // iPhone Safari
    } catch { /* not allowed here */ }
  }

  /* ───────── progress ───────── */
  paint() {
    const m = this.main;
    if (this.dragging || !m.duration) return;
    const p = (m.currentTime / m.duration) * 1000;
    this.scrub.value = p;
    this.scrub.style.setProperty('--p', `${p / 10}%`);
    this.tCur.textContent = fmtTime(m.currentTime);
  }

  loop() {
    const tick = () => {
      if (this.main.paused) return;
      this.paint();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
