// Confeti en <canvas>: una sola capa, sin tocar el DOM por partícula, y se apaga solo al terminar.

const COLORS = ['#E2EF8F', '#CFE05F', '#272727', '#FFFFFF', '#D9B86A', '#EDE6D6'];
const GRAVITY = 1500;
const DURATION = 4200;

export function createConfetti(canvas) {
  const ctx = canvas.getContext('2d');
  let particles = [];
  let raf = 0;
  let last = 0;
  let startedAt = 0;
  let width = 0;
  let height = 0;

  function resize() {
    // Densidad limitada: en pantallas retina dibujar al doble no se nota y cuesta el doble.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function burst(x, y, angle, count) {
    for (let i = 0; i < count; i++) {
      const dir = angle + (Math.random() - 0.5) * 1.1;
      const speed = 600 + Math.random() * 900;
      particles.push({
        x, y,
        vx: Math.cos(dir) * speed,
        vy: Math.sin(dir) * speed,
        w: 10 + Math.random() * 12,
        h: 6 + Math.random() * 8,
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 12,
        tilt: Math.random() * Math.PI,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        round: Math.random() < 0.25,
      });
    }
  }

  function frame(time) {
    const dt = Math.min((time - last) / 1000, 0.032);
    last = time;
    const age = time - startedAt;
    const fade = age > DURATION - 900 ? Math.max((DURATION - age) / 900, 0) : 1;

    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = fade;
    for (const p of particles) {
      p.vy += GRAVITY * dt;
      p.vx *= 1 - 1.6 * dt;
      p.vy *= 1 - 0.9 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      p.tilt += 6 * dt;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.h * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // El "giro" del papel se simula estrechando el rectángulo.
        ctx.fillRect(-p.w / 2, (-p.h / 2) * Math.cos(p.tilt), p.w, p.h * Math.cos(p.tilt));
      }
      ctx.restore();
    }

    if (age < DURATION) {
      raf = requestAnimationFrame(frame);
    } else {
      stop();
    }
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    particles = [];
    ctx.clearRect(0, 0, width, height);
    canvas.hidden = true;
  }

  return {
    stop,
    fire({ small = false } = {}) {
      stop();
      canvas.hidden = false;
      resize();
      if (small) {
        burst(width / 2, height * 0.45, -Math.PI / 2, 26);
      } else {
        burst(width * 0.08, height * 0.75, -Math.PI / 3, 70);
        burst(width * 0.92, height * 0.75, (-2 * Math.PI) / 3, 70);
      }
      startedAt = last = performance.now();
      raf = requestAnimationFrame(frame);
    },
  };
}
