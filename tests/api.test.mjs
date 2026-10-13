// Pruebas de la API contra un servidor en marcha (local: `npm run dev` en /worker).
//   node --test tests/            → usa http://localhost:8787 y las claves de worker/.dev.vars
//   API_URL=https://... STAFF_PASSWORD=... ADMIN_PASSWORD=... node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const API = process.env.API_URL || 'http://localhost:8787';
const ORIGIN = process.env.TEST_ORIGIN || 'http://localhost:5173';

function devVars() {
  const file = new URL('../worker/.dev.vars', import.meta.url);
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()])
  );
}
const vars = devVars();
const STAFF = process.env.STAFF_PASSWORD || vars.STAFF_PASSWORD;
const ADMIN = process.env.ADMIN_PASSWORD || vars.ADMIN_PASSWORD;

async function call(path, { method = 'GET', token, body, origin = ORIGIN } = {}) {
  const headers = { Origin: origin };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* CSV */ }
  return { status: res.status, data, text, headers: res.headers };
}

const login = (password, scope) => call('/api/auth/login', { method: 'POST', body: { password, scope, device: 'test-tablet' } });
const unique = () => randomUUID().slice(0, 8);
const reg = (token, extra) => call('/api/participations', {
  method: 'POST', token,
  body: { id: randomUUID(), privacyVersion: 'test-1', source: 'test', ...extra },
});

let kiosk, staff, admin;

test('salud: backend y base de datos responden', async () => {
  const r = await call('/api/health');
  assert.equal(r.status, 200);
  assert.equal(r.data.db, true);
  assert.equal(r.data.configured, true);
});

test('acceso: clave incorrecta rechazada, claves correctas dan el rol adecuado', async () => {
  assert.equal((await login('clave-incorrecta', 'panel')).status, 401);
  kiosk = (await login(STAFF, 'kiosk')).data;
  staff = (await login(STAFF, 'panel')).data;
  admin = (await login(ADMIN, 'panel')).data;
  assert.equal(kiosk.role, 'kiosk');
  assert.equal(staff.role, 'staff');
  assert.equal(admin.role, 'admin');
});

test('bloqueo: sin token o con token manipulado no se accede a nada', async () => {
  assert.equal((await call('/api/staff/stats')).status, 401);
  assert.equal((await call('/api/staff/deliveries')).status, 401);
  assert.equal((await call('/api/admin/export.csv')).status, 401);
  assert.equal((await reg(null, { contactType: 'email', contact: 'a@b.es' })).status, 401);
  const forged = kiosk.token.slice(0, -3) + 'abc';
  assert.equal((await reg(forged, { contactType: 'email', contact: 'a@b.es' })).status, 401);
});

test('bloqueo por rol: la tablet no ve estadísticas, las azafatas no exportan', async () => {
  assert.equal((await call('/api/staff/stats', { token: kiosk.token })).status, 401);
  assert.equal((await call('/api/admin/export.csv', { token: staff.token })).status, 401);
  assert.equal((await reg(staff.token, { contactType: 'email', contact: 'a@b.es' })).status, 401);
});

test('origen no autorizado rechazado', async () => {
  const r = await call('/api/health', { origin: 'https://sitio-ajeno.example' });
  assert.equal(r.status, 403);
});

test('registro por email: se normaliza y devuelve código', async () => {
  const r = await reg(kiosk.token, { contactType: 'email', contact: `  Maria.${unique()}@Example.COM ` });
  assert.equal(r.status, 200);
  assert.match(r.data.code, /^V-[2-9A-Z]{5}$/);
  assert.equal(r.data.duplicate, undefined, 'la respuesta no revela duplicados');
});

test('registro por móvil: acepta formatos habituales', async () => {
  const n = String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
  const r = await reg(kiosk.token, { contactType: 'phone', contact: `+34 6${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}` });
  assert.equal(r.status, 200);
});

test('formatos inválidos rechazados con 422', async () => {
  for (const contact of ['maria', 'maria@', 'maria@gmail', 'a b@c.es', '']) {
    assert.equal((await reg(kiosk.token, { contactType: 'email', contact })).status, 422, contact);
  }
  for (const contact of ['+34 912 345 678', '+34 612 34', '612345678', '+34 abc', '']) {
    assert.equal((await reg(kiosk.token, { contactType: 'phone', contact })).status, 422, contact);
  }
  assert.equal((await reg(kiosk.token, { contactType: 'fax', contact: 'x' })).status, 422);
  assert.equal((await call('/api/participations', { method: 'POST', token: kiosk.token, body: { id: 'no-uuid', contactType: 'email', contact: 'a@b.es' } })).status, 400);
});

test('consentimiento: exige evidencia si se acepta; funciona si se rechaza', async () => {
  const email = `consent.${unique()}@example.com`;
  const sinEvidencia = await reg(kiosk.token, { contactType: 'email', contact: email, marketingConsent: true });
  assert.equal(sinEvidencia.status, 422);
  const si = await reg(kiosk.token, { contactType: 'email', contact: email, marketingConsent: true, consentVersion: 'v-test', consentText: 'Sí, quiero recibir…' });
  assert.equal(si.status, 200);
  const no = await reg(kiosk.token, { contactType: 'email', contact: `no.${unique()}@example.com`, marketingConsent: false });
  assert.equal(no.status, 200);
});

test('participación anónima desactivada por defecto', async () => {
  assert.equal((await reg(kiosk.token, { contactType: 'anonymous' })).status, 422);
});

test('reintento con el mismo id no duplica; contacto repetido se marca sin revelarlo', async () => {
  const before = (await call('/api/staff/stats', { token: staff.token })).data;
  const id = randomUUID();
  const body = { id, contactType: 'email', contact: `dup.${unique()}@example.com`, privacyVersion: 'test-1', marketingConsent: true, consentVersion: 'v-test', consentText: 'Sí' };
  const a = await call('/api/participations', { method: 'POST', token: kiosk.token, body });
  const retry = await call('/api/participations', { method: 'POST', token: kiosk.token, body });
  assert.equal(retry.data.code, a.data.code);
  // Misma persona vuelve más tarde y NO marca la casilla: el consentimiento anterior se conserva.
  const again = await call('/api/participations', { method: 'POST', token: kiosk.token, body: { ...body, id: randomUUID(), marketingConsent: false } });
  assert.equal(again.status, 200);
  assert.deepEqual(Object.keys(again.data).sort(), ['code', 'id', 'ok']);

  const after = (await call('/api/staff/stats', { token: staff.token })).data;
  assert.equal(after.registered - before.registered, 2);
  assert.equal(after.duplicates - before.duplicates, 1);
  assert.equal(after.contacts.unique - before.contacts.unique, 1);
  assert.equal(after.marketing.contacts - before.marketing.contacts, 1);

  const conflict = await call('/api/participations', { method: 'POST', token: kiosk.token, body: { ...body, contact: 'otro@example.com' } });
  assert.equal(conflict.status, 409);
});

test('juego completo: progreso, entrega única y persistencia', async () => {
  const before = (await call('/api/staff/stats', { token: staff.token })).data;
  const r = await reg(kiosk.token, { contactType: 'email', contact: `juego.${unique()}@example.com` });
  const base = `/api/participations/${r.data.id}`;
  assert.equal((await call(`${base}/progress`, { method: 'POST', token: kiosk.token, body: { status: 'playing' } })).status, 200);
  assert.equal((await call(`${base}/progress`, { method: 'POST', token: kiosk.token, body: { status: 'completed', score: 7 } })).status, 422);
  const answers = [{ q: 'colageno-edad', ok: true }, { q: 'vitamina-c', ok: false }, { q: 'solo-piel', ok: true }];
  assert.equal((await call(`${base}/progress`, { method: 'POST', token: kiosk.token, body: { status: 'completed', score: 2, answers } })).status, 200);

  const d1 = await call(`${base}/deliver`, { method: 'POST', token: kiosk.token, body: { score: 2, answers } });
  assert.equal(d1.data.alreadyDelivered, false);
  const d2 = await call(`${base}/deliver`, { method: 'POST', token: kiosk.token, body: { score: 2, answers } });
  assert.equal(d2.data.alreadyDelivered, true, 'la segunda entrega no cuenta');

  const after = (await call('/api/staff/stats', { token: staff.token })).data;
  assert.equal(after.completed - before.completed, 1);
  assert.equal(after.delivered - before.delivered, 1);

  const list = (await call('/api/staff/deliveries', { token: staff.token })).data.items;
  const row = list.find((i) => i.code === r.data.code);
  assert.equal(row.score, 2);
  assert.ok(row.deliveredAt);
  assert.ok(!row.contact.includes('juego'), 'el panel muestra el contacto enmascarado');
});

test('cero aciertos también recibe muestra; entrega sin progreso previo completa la partida', async () => {
  const r = await reg(kiosk.token, { contactType: 'email', contact: `cero.${unique()}@example.com` });
  const d = await call(`/api/participations/${r.data.id}/deliver`, { method: 'POST', token: kiosk.token, body: { score: 0, answers: [] } });
  assert.equal(d.data.delivered, true);
  const row = (await call('/api/staff/deliveries', { token: staff.token })).data.items.find((i) => i.code === r.data.code);
  assert.equal(row.status, 'completed');
  assert.equal(row.score, 0);
});

test('entrega manual desde el panel por código', async () => {
  const r = await reg(kiosk.token, { contactType: 'email', contact: `manual.${unique()}@example.com` });
  const d = await call('/api/staff/deliver', { method: 'POST', token: staff.token, body: { code: r.data.code.toLowerCase() } });
  assert.equal(d.data.delivered, true);
  assert.equal((await call('/api/staff/deliver', { method: 'POST', token: staff.token, body: { code: 'V-ZZZZZ' } })).status, 404);
});

test('eventos analíticos: solo tipos conocidos y sin datos personales', async () => {
  assert.equal((await call('/api/events', { method: 'POST', token: kiosk.token, body: { type: 'start' } })).status, 200);
  assert.equal((await call('/api/events', { method: 'POST', token: kiosk.token, body: { type: 'inventado' } })).status, 422);
  assert.equal((await call('/api/events', { method: 'POST', token: kiosk.token, body: { type: 'error', meta: { where: 'maria@example.com' } } })).status, 200);
});

test('exportación: solo admin; "marketing" contiene únicamente quien aceptó', async () => {
  const yes = `export.si.${unique()}@example.com`;
  const no = `export.no.${unique()}@example.com`;
  await reg(kiosk.token, { contactType: 'email', contact: yes, marketingConsent: true, consentVersion: 'v-test', consentText: 'Sí, "quiero", recibir' });
  await reg(kiosk.token, { contactType: 'email', contact: no });

  const all = await call('/api/admin/export.csv?scope=all', { token: admin.token });
  assert.equal(all.status, 200);
  assert.match(all.headers.get('content-type'), /text\/csv/);
  assert.ok(all.text.includes(yes) && all.text.includes(no));

  const mk = await call('/api/admin/export.csv?scope=marketing', { token: admin.token });
  assert.ok(mk.text.includes(yes));
  assert.ok(!mk.text.includes(no), 'quien no aceptó no aparece en la lista comercial');
  assert.ok(mk.text.includes('"Sí, ""quiero"", recibir"'), 'CSV bien escapado');
});

test('exportación en JSON para Excel: solo admin, con columnas y filas', async () => {
  const r = await call('/api/admin/export.csv?scope=all&format=json', { token: admin.token });
  assert.equal(r.status, 200);
  assert.ok(r.data.columns.includes('contact') && r.data.rows.length > 0);
  assert.equal((await call('/api/admin/export.csv?scope=all&format=json', { token: staff.token })).status, 401);
});
