// Animated background: dark navy field, slow crisp white bubble-rings,
// and infrequent tiny planes trailing short streaks in random directions.
(() => {
  const canvas = document.getElementById('bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const NAVY = '#05070f';
  const rand = (a, b) => a + Math.random() * (b - a);

  let W = 0, H = 0, DPR = 1, worldH = 0, scrollTop = 0, lastW = -1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    worldH = Math.max(document.documentElement.scrollHeight, H);
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // Only re-seed when width actually changes. Mobile browsers fire resize when
    // the URL bar shows/hides (height-only) — reshuffling then causes a flash.
    if (W !== lastW || bubbles.length === 0) { lastW = W; makeBubbles(); }
  }

  /* ---------------- Bubbles ---------------- */
  const bubbles = [];
  function makeBubbles() {
    bubbles.length = 0;
    // Bubbles live in world (document) space so they scroll with the page.
    const count = Math.round(Math.min(55, Math.max(12, (W * worldH) / 115000)));
    for (let i = 0; i < count; i++) {
      bubbles.push({
        x: rand(0, W),
        y: rand(0, worldH),
        r: rand(30, 155),
        vx: rand(-0.1, 0.1),
        vy: rand(-0.15, -0.02),      // gentle upward drift
        alpha: rand(0.05, 0.16),
        lw: rand(1, 2.2),
      });
    }
  }
  function stepBubble(b) {
    b.x += b.vx;
    b.y += b.vy;
    const m = b.r + 24;
    if (b.x < -m) b.x = W + m; else if (b.x > W + m) b.x = -m;
    if (b.y < -m) b.y = worldH + m; else if (b.y > worldH + m) b.y = -m;
  }
  function drawBubble(b) {
    const sy = b.y - scrollTop;                 // shift into viewport by scroll
    if (sy + b.r < 0 || sy - b.r > H) return;   // cull off-screen
    ctx.beginPath();
    ctx.arc(b.x, sy, b.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${b.alpha * 0.10})`;
    ctx.fill();
    ctx.lineWidth = b.lw;
    ctx.strokeStyle = `rgba(255,255,255,${b.alpha})`;
    ctx.stroke();
  }

  /* ---------------- Planes ---------------- */
  const planes = [];
  let nextPlane = 0;
  function spawnPlane() {
    const angle = Math.random() * Math.PI * 2;
    const dir = { x: Math.cos(angle), y: Math.sin(angle) };
    const diag = Math.hypot(W, H);
    // aim through a point near the middle (with some scatter) so it crosses
    const spread = Math.min(W, H) * 0.4;
    const midX = W / 2 + (Math.random() - 0.5) * spread;
    const midY = H / 2 + (Math.random() - 0.5) * spread;
    planes.push({
      x: midX - dir.x * diag * 0.62,
      y: midY - dir.y * diag * 0.62,
      dir,
      angle,
      speed: rand(1.3, 2.3),
      size: rand(5, 7.5),
      trail: [],
      maxTrail: Math.round(rand(16, 28)),
      travelled: 0,
      life: diag * 1.4,
    });
  }
  function stepPlane(p) {
    p.x += p.dir.x * p.speed;
    p.y += p.dir.y * p.speed;
    p.travelled += p.speed;
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > p.maxTrail) p.trail.shift();
  }
  function drawPlane(p) {
    for (let i = 1; i < p.trail.length; i++) {
      const a = i / p.trail.length;
      ctx.beginPath();
      ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y);
      ctx.lineTo(p.trail[i].x, p.trail[i].y);
      ctx.strokeStyle = `rgba(255,255,255,${a * 0.32})`;
      ctx.lineWidth = a * 1.5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    const s = p.size;
    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(-s * 0.7, s * 0.62);
    ctx.lineTo(-s * 0.34, 0);
    ctx.lineTo(-s * 0.7, -s * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* ---------------- Loop ---------------- */
  function drawStatic() {
    scrollTop = window.scrollY || window.pageYOffset || 0;
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, W, H);
    bubbles.forEach(drawBubble);
  }

  let raf = null;
  function frame(now) {
    scrollTop = window.scrollY || window.pageYOffset || 0;
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, W, H);

    for (const b of bubbles) { stepBubble(b); drawBubble(b); }

    if (now > nextPlane) {
      spawnPlane();
      nextPlane = now + rand(5400, 11500);
    }
    for (let i = planes.length - 1; i >= 0; i--) {
      const p = planes[i];
      stepPlane(p);
      drawPlane(p);
      if (p.travelled > p.life) planes.splice(i, 1);
    }

    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (raf || reduceMotion) return;
    nextPlane = performance.now() + rand(1800, 4000);
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  window.addEventListener('resize', resize);
  window.addEventListener('load', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });

  resize();
  if (reduceMotion) {
    drawStatic();
    // still couple the field to scroll, without continuous animation
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { drawStatic(); ticking = false; });
    }, { passive: true });
  } else {
    start();
  }
})();
