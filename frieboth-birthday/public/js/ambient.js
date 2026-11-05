import { reducedMotion } from './util.js';

/**
 * Embers: slow warm sparks drifting up behind the page, plus a burst() for big moments.
 * Pauses when the tab is hidden. Does nothing for people who prefer reduced motion.
 */
export function startAmbient(canvas) {
  if (reducedMotion()) return { burst() {}, stop() {} };

  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1;
  let parts = [];
  let raf = 0;
  let last = performance.now();

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const rand = (a, b) => a + Math.random() * (b - a);

  function spawn({ x = rand(0, w), y = h + 10, burst = false } = {}) {
    const speed = burst ? rand(1.2, 5.5) : rand(.12, .5);
    const angle = burst ? rand(0, Math.PI * 2) : -Math.PI / 2 + rand(-.35, .35);
    parts.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: burst ? rand(.8, 2.4) : rand(.6, 1.9),
      life: 0,
      max: burst ? rand(1.6, 3.2) : rand(6, 13),
      sway: rand(0, Math.PI * 2),
      hot: Math.random() < .35,
      burst,
    });
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, .05);
    last = now;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    const target = Math.round((w * h) / 42000);
    if (parts.filter((p) => !p.burst).length < target && Math.random() < .5) spawn();

    parts = parts.filter((p) => p.life < p.max && p.y > -20);
    for (const p of parts) {
      p.life += dt;
      p.sway += dt * 1.4;
      p.x += (p.vx + Math.sin(p.sway) * .12) * 60 * dt;
      p.y += p.vy * 60 * dt;
      if (p.burst) { p.vx *= .985; p.vy = p.vy * .985 + .012; }

      const k = p.life / p.max;
      const a = Math.sin(Math.PI * Math.min(k, 1)) * (p.burst ? .95 : .55);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
      const c = p.hot ? '255,122,56' : '255,194,75';
      g.addColorStop(0, `rgba(${c},${a})`);
      g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  }

  function visibility() {
    if (document.hidden) cancelAnimationFrame(raf);
    else { last = performance.now(); raf = requestAnimationFrame(frame); }
  }

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', visibility);
  resize();
  raf = requestAnimationFrame(frame);

  return {
    burst(x = w / 2, y = h / 2, n = 90) {
      for (let i = 0; i < n; i++) spawn({ x, y, burst: true });
    },
    stop() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibility);
    },
  };
}
