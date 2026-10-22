// Tres preguntas aleatorias por partida. La prioridad es no repetir ninguna de las
// dos partidas anteriores; después se equilibran respuestas, temas y uso acumulado.
// Solo se guardan IDs y contadores locales, nunca datos del participante.
const STORE_KEY = 'rv-question-uses';
const HISTORY_KEY = 'rv-question-history';
let memoryUses = {};
let memoryHistory = [];

function loadUses() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      memoryUses = Object.fromEntries(Object.entries(parsed).filter(([, n]) => Number.isFinite(n) && n >= 0));
    }
  } catch { /* La rotación continúa en memoria si el almacenamiento está bloqueado. */ }
  return memoryUses;
}

function loadHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY));
    if (Array.isArray(parsed)) {
      memoryHistory = parsed.filter(Array.isArray).map(ids => ids.filter(id => typeof id === 'string')).slice(-2);
    }
  } catch { /* Mantener las dos partidas anteriores en memoria. */ }
  return memoryHistory;
}

function compare(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function shuffle(list, random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pickQuestions(bank, count = 3, random = Math.random, uses = loadUses(), history = loadHistory()) {
  const uniqueBank = [...new Map(bank.map(q => [q.id, q])).values()];
  const size = Math.min(Math.max(0, Math.floor(count)), uniqueBank.length);
  if (!size) return [];
  const recent = new Set(history.slice(-2).flat());
  const last = new Set(history.at(-1) || []);
  let best = [];
  let bestRank = null;
  let ties = 0;

  function consider(picked) {
    const rank = [
      picked.filter(q => recent.has(q.id)).length,
      picked.filter(q => last.has(q.id)).length,
      size > 1 && picked.every(q => q.answer === picked[0].answer) ? 1 : 0,
      size - new Set(picked.map(q => q.topic)).size,
      picked.reduce((sum, q) => sum + (uses[q.id] || 0), 0),
    ];
    const comparison = bestRank ? compare(rank, bestRank) : -1;
    if (comparison < 0) {
      best = [...picked];
      bestRank = rank;
      ties = 1;
    } else if (comparison === 0) {
      // Muestreo uniforme entre combinaciones igualmente buenas, sin orden fijo.
      ties++;
      if (random() < 1 / ties) best = [...picked];
    }
  }

  function visit(start, picked) {
    if (picked.length === size) return consider(picked);
    for (let i = start; i <= uniqueBank.length - (size - picked.length); i++) {
      picked.push(uniqueBank[i]);
      visit(i + 1, picked);
      picked.pop();
    }
  }
  visit(0, []); // Con 14 preguntas y 3 por partida solo hay 364 combinaciones.
  return shuffle(best, random);
}

export function rememberUse(questions) {
  const uses = { ...loadUses() };
  const ids = [...new Set(questions.map(q => q.id))];
  if (!ids.length) return;
  for (const id of ids) uses[id] = (uses[id] || 0) + 1;
  memoryUses = uses;
  memoryHistory = [...loadHistory(), ids].slice(-2);
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(memoryUses));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(memoryHistory));
  } catch { /* La protección frente a repeticiones se conserva durante esta sesión. */ }
}
