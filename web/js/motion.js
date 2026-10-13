// Entradas y salidas con clases CSS (las curvas y el desenfoque están en css/motion.css).

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function isReduced() {
  return document.documentElement.classList.contains('reduce-motion')
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const STAGGER_MS = 75;

export function enter(el, baseMs = 900) {
  if (!el) return;
  el.hidden = false;
  const items = el.querySelectorAll('[data-anim]');
  items.forEach((item, i) => item.style.setProperty('--i', i));
  el.classList.remove('is-leaving');
  el.classList.add('is-entering');
  clearTimeout(el._enterTimer);
  el._enterTimer = setTimeout(
    () => el.classList.remove('is-entering'),
    isReduced() ? 0 : baseMs + items.length * STAGGER_MS
  );
}

export async function leave(el, ms = 320) {
  if (!el || el.hidden) return;
  clearTimeout(el._enterTimer);
  el.classList.remove('is-entering');
  el.classList.add('is-leaving');
  await wait(isReduced() ? 0 : ms);
  el.hidden = true;
  el.classList.remove('is-leaving');
}

// Calidad adaptativa: si la tablet no llega a ~40 fps durante una transición,
// se desactiva el desenfoque de movimiento (clase .lite) y el resto sigue igual.
export function watchFrames(durationMs = 1400) {
  if (document.documentElement.classList.contains('lite') || document.hidden) return;
  const start = performance.now();
  let last = start;
  let frames = 0;
  let slow = 0;
  function frame(now) {
    const delta = now - last;
    last = now;
    frames++;
    if (delta > 26) slow++;
    if (now - start < durationMs) {
      requestAnimationFrame(frame);
    } else if (frames > 20 && slow / frames > 0.25) {
      document.documentElement.classList.add('lite');
      try { sessionStorage.setItem('rv-lite', '1'); } catch { /* se volverá a medir */ }
    }
  }
  requestAnimationFrame(frame);
}

// Pulsación mantenida (acciones del personal): evita toques accidentales del participante.
export function onHold(el, ms, callback) {
  let timer = null;
  const start = (e) => {
    if (el.disabled || timer) return;
    if (e.type === 'keydown' && (e.repeat || (e.key !== 'Enter' && e.key !== ' '))) return;
    if (e.type === 'keydown') e.preventDefault();
    el.style.setProperty('--hold-ms', `${ms}ms`);
    el.classList.add('is-holding');
    timer = setTimeout(() => {
      cancel();
      callback();
    }, ms);
  };
  const cancel = () => {
    clearTimeout(timer);
    timer = null;
    el.classList.remove('is-holding');
  };
  el.addEventListener('pointerdown', start);
  el.addEventListener('keydown', start);
  for (const type of ['pointerup', 'pointerleave', 'pointercancel', 'keyup', 'blur']) el.addEventListener(type, cancel);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
