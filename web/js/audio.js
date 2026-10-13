// Sonido 100 % sintetizado con Web Audio: original, sin archivos ni licencias de terceros.
// Volumen bajo a propósito: tiene que acompañar en un stand, no molestar.

const PREF_KEY = 'rv-sound';
const note = (semitonesFromA4) => 440 * 2 ** (semitonesFromA4 / 12);

// Progresión suave (Do mayor): Cmaj7 · Am7 · Fmaj7 · G6
const CHORDS = [
  [-9, -5, -2, 2],
  [-12, -9, -5, -2],
  [-16, -12, -9, -5],
  [-14, -10, -7, -5],
];
const MELODY = [3, 7, 10, 12, 15, 10, 7, 12];
const BAR_SECONDS = 3.2;

export function createSound() {
  let ctx = null;
  let master = null;
  let musicBus = null;
  let enabled = true;
  let musicOn = false;
  let nextBar = 0;
  let bar = 0;
  let scheduler = null;

  try {
    enabled = localStorage.getItem(PREF_KEY) !== 'off';
  } catch {
    enabled = true;
  }

  // Los navegadores solo permiten audio tras un gesto: se llama desde el primer toque.
  function unlock() {
    if (!enabled) return false;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;
    if (!ctx) {
      // iPhone/iPad: sin esto, el interruptor lateral de silencio enmudece todo el audio de la web.
      try {
        if (navigator.audioSession) navigator.audioSession.type = 'playback';
      } catch { /* navegador sin esta opción */ }
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1400;
      musicBus.connect(filter).connect(master);
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    return true;
  }

  function tone(freq, { at = 0, dur = 0.3, type = 'sine', gain = 0.12, attack = 0.01, out = master } = {}) {
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function scheduleBar(start) {
    const chord = CHORDS[bar % CHORDS.length];
    const at = Math.max(start - ctx.currentTime, 0);
    for (const semitone of chord) {
      tone(note(semitone), { at, dur: BAR_SECONDS * 1.15, gain: 0.05, attack: 0.9, out: musicBus });
      tone(note(semitone) * 1.004, { at, dur: BAR_SECONDS * 1.15, gain: 0.03, attack: 1.1, type: 'triangle', out: musicBus });
    }
    // Dos notas de melodía por compás, tipo caja de música.
    for (let i = 0; i < 2; i++) {
      const m = MELODY[(bar * 2 + i) % MELODY.length];
      tone(note(m), { at: at + 0.8 + i * 1.2, dur: 1.4, gain: 0.045, type: 'triangle', out: musicBus });
    }
    bar++;
  }

  function tick() {
    if (!ctx || !musicOn) return;
    while (nextBar < ctx.currentTime + 1) {
      scheduleBar(nextBar);
      nextBar += BAR_SECONDS;
    }
  }

  function fadeMusic(to, seconds) {
    if (!ctx) return;
    const g = musicBus.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(g.value, ctx.currentTime);
    g.linearRampToValueAtTime(to, ctx.currentTime + seconds);
  }

  const api = {
    get enabled() { return enabled; },
    unlock,
    setEnabled(value) {
      enabled = value;
      try { localStorage.setItem(PREF_KEY, value ? 'on' : 'off'); } catch { /* preferencia no persistida */ }
      if (!value) {
        api.stopMusic(0.2);
      } else {
        unlock();
      }
    },
    tap() {
      if (!unlock()) return;
      tone(note(7), { dur: 0.09, gain: 0.07, type: 'triangle' });
    },
    correct() {
      if (!unlock()) return;
      tone(note(3), { dur: 0.35, gain: 0.11, type: 'triangle' });
      tone(note(7), { at: 0.1, dur: 0.4, gain: 0.11, type: 'triangle' });
      tone(note(15), { at: 0.2, dur: 0.7, gain: 0.09 });
    },
    // Fallo amable: dos notas descendentes y suaves, sin bocina ni zumbido.
    wrong() {
      if (!unlock()) return;
      tone(note(0), { dur: 0.4, gain: 0.08 });
      tone(note(-4), { at: 0.16, dur: 0.6, gain: 0.08 });
    },
    win() {
      if (!unlock()) return;
      [3, 7, 10, 15, 19].forEach((n, i) => tone(note(n), { at: i * 0.11, dur: 0.9, gain: 0.1, type: 'triangle' }));
      tone(note(-9), { at: 0, dur: 1.6, gain: 0.08 });
      tone(note(27), { at: 0.6, dur: 1.4, gain: 0.04 });
    },
    startMusic() {
      if (!unlock() || musicOn) return;
      musicOn = true;
      nextBar = ctx.currentTime + 0.1;
      fadeMusic(1, 2.5);
      tick();
      scheduler = setInterval(tick, 400);
    },
    stopMusic(seconds = 1.2) {
      if (!musicOn) return;
      musicOn = false;
      clearInterval(scheduler);
      fadeMusic(0, seconds);
    },
  };
  return api;
}
