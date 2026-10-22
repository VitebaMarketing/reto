import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
// Importar módulos del navegador sin cambiar la configuración del proyecto.
const moduleUrl = async path => 'data:text/javascript;base64,' + Buffer.from(await readFile(new URL(path, import.meta.url))).toString('base64');
const gameUrl = await moduleUrl('../web/js/game.js');
const { pickQuestions } = await import(gameUrl);
const { QUESTIONS } = await import(await moduleUrl('../web/data/questions.js'));
function rng(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
}

test('banco de 10–15 preguntas únicas; tres por partida', () => {
  assert.ok(QUESTIONS.length >= 10 && QUESTIONS.length <= 15);
  assert.equal(new Set(QUESTIONS.map(q => q.id)).size, QUESTIONS.length);
  assert.equal(pickQuestions(QUESTIONS, 3, rng(1), {}, []).length, 3);
});

test('100 secuencias de 30 partidas: ninguna repetición en ventanas de tres partidas', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const random = rng(seed), history = [], uses = {};
    for (let round = 0; round < 30; round++) {
      const picked = pickQuestions(QUESTIONS, 3, random, uses, history);
      const ids = picked.map(q => q.id);
      const window = history.slice(-2).flat().concat(ids);
      assert.equal(new Set(window).size, window.length, `semilla ${seed}, partida ${round}`);
      for (const id of ids) uses[id] = (uses[id] || 0) + 1;
      history.push(ids);
    }
  }
});

test('la no repetición tiene prioridad sobre contadores antiguos o mezclar respuestas', () => {
  const unseen = QUESTIONS.filter(q => q.answer).slice(0, 3);
  const history = [QUESTIONS.filter(q => !unseen.includes(q)).map(q => q.id)];
  const uses = Object.fromEntries(unseen.map(q => [q.id, 500]));
  assert.deepEqual(new Set(pickQuestions(QUESTIONS, 3, rng(5), uses, history).map(q => q.id)), new Set(unseen.map(q => q.id)));
});

test('sin historial hay temas distintos y mezcla de verdadero/falso', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const picked = pickQuestions(QUESTIONS, 3, rng(seed), {}, []);
    assert.equal(new Set(picked.map(q => q.topic)).size, 3);
    assert.equal(new Set(picked.map(q => q.answer)).size, 2);
  }
});

test('el resultado cambia entre sorteos y conserva todos los IDs originales', () => {
  const results = new Set();
  for (let seed = 1; seed <= 100; seed++) {
    const picked = pickQuestions(QUESTIONS, 3, rng(seed), {}, []);
    picked.forEach(q => assert.ok(QUESTIONS.includes(q)));
    results.add(picked.map(q => q.id).join(','));
  }
  assert.ok(results.size > 20);
});

test('banco pequeño: repite el mínimo inevitable y evita la última partida si puede', () => {
  const bank = QUESTIONS.slice(0, 7);
  const history = [bank.slice(0, 3).map(q => q.id), bank.slice(3, 6).map(q => q.id)];
  const picked = pickQuestions(bank, 3, rng(8), {}, history);
  assert.ok(picked.some(q => q.id === bank[6].id));
  assert.equal(picked.filter(q => history[1].includes(q.id)).length, 0);
  assert.equal(new Set(picked.map(q => q.id)).size, 3);
  assert.equal(pickQuestions([], 3, rng(9), {}, []).length, 0);
  assert.equal(pickQuestions(bank.slice(0, 2), 3, rng(9), {}, []).length, 2);
});

test('el historial persiste tras recarga; datos corruptos o almacenamiento bloqueado no rompen el juego', async () => {
  const storage = new Map();
  globalThis.localStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) };
  const firstModule = await import(gameUrl + '#persistence1');
  const first = firstModule.pickQuestions(QUESTIONS, 3, rng(1));
  firstModule.rememberUse(first);
  const reloaded = await import(gameUrl + '#persistence2');
  const second = reloaded.pickQuestions(QUESTIONS, 3, rng(2));
  assert.ok(second.every(q => !first.some(p => p.id === q.id)));
  reloaded.rememberUse(second);
  const third = reloaded.pickQuestions(QUESTIONS, 3, rng(3));
  assert.equal(new Set([...first, ...second, ...third].map(q => q.id)).size, 9);
  storage.set('rv-question-uses', 'broken'); storage.set('rv-question-history', '{');
  const corrupt = await import(gameUrl + '#corrupt');
  assert.equal(corrupt.pickQuestions(QUESTIONS).length, 3);
  globalThis.localStorage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  const blocked = await import(gameUrl + '#blocked');
  const a = blocked.pickQuestions(QUESTIONS); blocked.rememberUse(a);
  const b = blocked.pickQuestions(QUESTIONS); blocked.rememberUse(b);
  const c = blocked.pickQuestions(QUESTIONS);
  assert.equal(new Set([...a, ...b, ...c].map(q => q.id)).size, 9);
  delete globalThis.localStorage;
});
