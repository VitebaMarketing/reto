// Selección equilibrada de preguntas: temas distintos, mezcla de verdaderas y falsas,
// y rotación para que todo el banco salga con la misma frecuencia a lo largo del día.

const STORE_KEY = 'rv-question-uses'; // solo contadores por id de pregunta, sin datos personales

function loadUses() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
}

function shuffle(list, random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pickQuestions(bank, count = 3, random = Math.random, uses = loadUses()) {
  const byLeastUsed = shuffle(bank, random).sort((a, b) => (uses[a.id] || 0) - (uses[b.id] || 0));
  const picked = [];
  for (const q of byLeastUsed) {
    if (picked.length === count) break;
    if (picked.some((p) => p.topic === q.topic)) continue;
    // La última plaza garantiza que haya al menos una verdadera y una falsa.
    const lastSlot = picked.length === count - 1;
    if (lastSlot && picked.every((p) => p.answer === q.answer)) continue;
    picked.push(q);
  }
  // Red de seguridad si el banco editado no permite cumplir todas las reglas.
  for (const q of byLeastUsed) {
    if (picked.length === count) break;
    if (!picked.includes(q)) picked.push(q);
  }
  return shuffle(picked, random);
}

export function rememberUse(questions) {
  const uses = loadUses();
  for (const q of questions) uses[q.id] = (uses[q.id] || 0) + 1;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(uses));
  } catch {
    /* almacenamiento no disponible: la rotación pasa a ser aleatoria */
  }
}
