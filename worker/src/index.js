// El Reto Viteba · API (Cloudflare Worker + D1)
// Toda la validación y el control de acceso viven aquí: el frontend nunca lee contactos.

import { signToken, verifyToken, safeEqual, sha256Hex } from './auth.js';
import { normalizeContact, isUuid, cleanAnswers, maskContact, csvCell } from './validate.js';

const EVENT_TYPES = new Set([
  'start', 'choose_email', 'choose_phone', 'choose_anonymous', 'register_ok', 'consent_yes',
  'game_start', 'answer', 'game_complete', 'reward_delivered', 'error', 'abandon', 'reset',
]);
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const KIOSK_TTL = 6 * 24 * 3600;
const PANEL_TTL = 12 * 3600;
const LOGIN_WINDOW_MIN = 15;
const LOGIN_MAX_FAILS = 8;
const REG_WINDOW_MIN = 5;
const REG_MAX_PER_DEVICE = 40;
const EVENTS_MAX_PER_DEVICE = 900;

class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(origin, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      if (origin && !cors['Access-Control-Allow-Origin']) throw new HttpError(403, 'origin_not_allowed');
      const res = await route(request, env);
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return res;
    } catch (err) {
      if (err instanceof HttpError) return json({ ok: false, error: err.code }, err.status, cors);
      console.error('unhandled', err && err.stack ? err.stack : err);
      return json({ ok: false, error: 'server_error' }, 500, cors);
    }
  },
};

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');
  const method = request.method;

  if (method === 'GET' && path === '/api/health') return health(env);
  if (method === 'POST' && path === '/api/auth/login') return login(request, env);
  if (method === 'POST' && path === '/api/play/session') return publicSession(request, env);

  if (method === 'POST' && path === '/api/participations') {
    return createParticipation(request, env, await requireRole(request, env, ['kiosk', 'participant']));
  }
  const m = path.match(/^\/api\/participations\/([0-9a-f-]{36})\/(progress|deliver)$/);
  if (method === 'POST' && m) {
    const auth = await requireRole(request, env, ['kiosk', 'participant']);
    if (auth.role === 'participant' && auth.pid !== m[1]) throw new HttpError(403, 'not_your_participation');
    return m[2] === 'progress' ? progress(request, env, auth, m[1]) : deliver(request, env, auth, m[1]);
  }
  if (method === 'POST' && path === '/api/events') {
    return trackEvent(request, env, await requireRole(request, env, ['kiosk', 'participant']));
  }

  if (method === 'GET' && path === '/api/staff/stats') {
    await requireRole(request, env, ['staff', 'admin']);
    return stats(env);
  }
  if (method === 'GET' && path === '/api/staff/deliveries') {
    await requireRole(request, env, ['staff', 'admin']);
    return deliveries(env);
  }
  if (method === 'POST' && path === '/api/staff/deliver') {
    return staffDeliver(request, env, await requireRole(request, env, ['staff', 'admin']));
  }
  if (method === 'GET' && path === '/api/admin/export.csv') {
    return exportCsv(env, await requireRole(request, env, ['admin']), url.searchParams.get('scope'), url.searchParams.get('format'));
  }
  throw new HttpError(404, 'not_found');
}

// ---------- utilidades ----------

function corsHeaders(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const headers = { Vary: 'Origin' };
  if (origin && allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return headers;
}

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extra,
    },
  });
}

async function readJson(request) {
  const text = await request.text();
  if (text.length > 4000) throw new HttpError(413, 'too_large');
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('shape');
    return body;
  } catch {
    throw new HttpError(400, 'bad_json');
  }
}

function configured(env) {
  return Boolean(env.DB && env.SESSION_SECRET && env.STAFF_PASSWORD && env.ADMIN_PASSWORD && env.HASH_PEPPER);
}

async function requireRole(request, env, roles) {
  if (!configured(env)) throw new HttpError(503, 'not_configured');
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const payload = token ? await verifyToken(token, env.SESSION_SECRET) : null;
  if (!payload || !roles.includes(payload.role)) throw new HttpError(401, 'unauthorized');
  return payload;
}

const now = () => new Date().toISOString();
const minutesAgo = (min) => new Date(Date.now() - min * 60000).toISOString();
const eventName = (env) => env.EVENT_NAME || 'OAFI 2026';

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  let out = 'V-';
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}

// ---------- endpoints públicos ----------

async function health(env) {
  let db = false;
  try {
    await env.DB.prepare('SELECT 1 FROM participations LIMIT 1').first();
    db = true;
  } catch {
    db = false;
  }
  const ok = db && configured(env);
  return json({ ok, db, configured: configured(env), event: eventName(env), time: now() }, ok ? 200 : 503);
}

async function publicSession(request, env) {
  if (!configured(env)) throw new HttpError(503, 'not_configured');
  const body = await readJson(request);
  if (!isUuid(body.id)) throw new HttpError(400, 'bad_id');
  const existing = await env.DB.prepare('SELECT id FROM participations WHERE id = ?').bind(body.id).first();
  if (existing) throw new HttpError(409, 'session_already_registered');
  // Una credencial distinta por participación: no da acceso al panel ni a otras partidas.
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const device = `public-${(await sha256Hex(`${env.HASH_PEPPER}:${ip}`)).slice(0, 24)}`;
  const exp = Math.floor(Date.now() / 1000) + 2 * 3600;
  const token = await signToken({ role: 'participant', pid: body.id, device, exp }, env.SESSION_SECRET);
  return json({ ok: true, token, exp });
}

async function login(request, env) {
  if (!configured(env)) throw new HttpError(503, 'not_configured');
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const fails = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND ok = 0 AND at > ?'
  ).bind(ip, minutesAgo(LOGIN_WINDOW_MIN)).first();
  if (fails.n >= LOGIN_MAX_FAILS) throw new HttpError(429, 'too_many_attempts');

  const body = await readJson(request);
  const password = typeof body.password === 'string' ? body.password.slice(0, 200) : '';
  const scope = body.scope === 'kiosk' ? 'kiosk' : 'panel';
  const isAdmin = await safeEqual(password, env.ADMIN_PASSWORD);
  const isStaff = await safeEqual(password, env.STAFF_PASSWORD);

  await env.DB.prepare('INSERT INTO login_attempts (ip, at, ok) VALUES (?, ?, ?)')
    .bind(ip, now(), isAdmin || isStaff ? 1 : 0).run();
  if (!isAdmin && !isStaff) throw new HttpError(401, 'bad_credentials');

  const role = scope === 'kiosk' ? 'kiosk' : isAdmin ? 'admin' : 'staff';
  const ttl = role === 'kiosk' ? KIOSK_TTL : PANEL_TTL;
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const device = String(body.device || 'tablet').replace(/[^\w -]/g, '').slice(0, 30) || 'tablet';
  const token = await signToken({ role, exp, device }, env.SESSION_SECRET);
  return json({ ok: true, token, role, exp, event: eventName(env) });
}

// ---------- endpoints de la tablet ----------

async function createParticipation(request, env, auth) {
  const body = await readJson(request);
  if (!isUuid(body.id)) throw new HttpError(400, 'bad_id');
  if (auth.role === 'participant' && auth.pid !== body.id) throw new HttpError(403, 'not_your_participation');
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim().replace(/\s+/g, ' ') : '';
  if (firstName && !/^[\p{L}\p{M}][\p{L}\p{M} ’'·-]{0,39}$/u.test(firstName)) throw new HttpError(422, 'bad_name');

  const allowAnonymous = env.ALLOW_ANONYMOUS === 'true';
  const parsed = normalizeContact(body.contactType, body.contact);
  if (!parsed.ok) throw new HttpError(422, parsed.error);
  if (parsed.type === 'anonymous' && !allowAnonymous) throw new HttpError(422, 'anonymous_disabled');

  const consent = parsed.type !== 'anonymous' && body.marketingConsent === true;
  const consentVersion = String(body.consentVersion || '').slice(0, 40);
  const consentText = String(body.consentText || '').slice(0, 500);
  if (consent && (!consentVersion || !consentText)) throw new HttpError(422, 'consent_evidence_required');
  const privacyVersion = String(body.privacyVersion || '').slice(0, 40);
  if (parsed.type !== 'anonymous' && !privacyVersion) throw new HttpError(422, 'privacy_version_required');

  const event = eventName(env);
  const hash = parsed.contact ? await sha256Hex(`${env.HASH_PEPPER}:${event}:${parsed.contact}`) : null;

  // Reintento de la misma petición: se devuelve el mismo resultado sin crear otro registro.
  const existing = await env.DB.prepare('SELECT id, code, contact_hash FROM participations WHERE id = ?')
    .bind(body.id).first();
  if (existing) {
    if (existing.contact_hash !== hash) throw new HttpError(409, 'id_conflict');
    return json({ ok: true, id: existing.id, code: existing.code });
  }

  const recent = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM participations WHERE device = ? AND created_at > ?'
  ).bind(auth.device, minutesAgo(REG_WINDOW_MIN)).first();
  if (recent.n >= REG_MAX_PER_DEVICE) throw new HttpError(429, 'rate_limited');

  let duplicate = 0;
  if (hash) {
    const dup = await env.DB.prepare(
      'SELECT 1 AS x FROM participations WHERE event = ? AND contact_hash = ? LIMIT 1'
    ).bind(event, hash).first();
    duplicate = dup ? 1 : 0;
  }

  const at = now();
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = randomCode();
    try {
      await env.DB.prepare(
        `INSERT INTO participations
          (id, code, event, created_at, first_name, contact_type, contact, contact_hash, marketing_consent,
           consent_version, consent_text, consent_at, privacy_version, status, is_duplicate, source, device)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'registered', ?, ?, ?)`
      ).bind(
        body.id, code, event, at, firstName || null, parsed.type, parsed.contact, hash, consent ? 1 : 0,
        consent ? consentVersion : null, consent ? consentText : null, consent ? at : null,
        privacyVersion || null, duplicate, String(body.source || 'tablet-stand').slice(0, 40), auth.device
      ).run();
      // La respuesta es idéntica haya o no duplicado: no se revela si alguien ya participó.
      return json({ ok: true, id: body.id, code });
    } catch (err) {
      if (!String(err && err.message).includes('UNIQUE')) throw err;
    }
  }
  throw new HttpError(500, 'code_generation_failed');
}

function readScore(body) {
  if (body.score === undefined || body.score === null) return null;
  if (!Number.isInteger(body.score) || body.score < 0 || body.score > 3) throw new HttpError(422, 'bad_score');
  return body.score;
}

async function progress(request, env, auth, id) {
  const body = await readJson(request);
  const status = body.status;
  if (!['playing', 'completed', 'abandoned'].includes(status)) throw new HttpError(422, 'bad_status');
  const row = await env.DB.prepare('SELECT status FROM participations WHERE id = ?').bind(id).first();
  if (!row) throw new HttpError(404, 'not_found');
  if (row.status === 'completed') return json({ ok: true, status: 'completed' });

  if (status === 'completed') {
    const score = readScore(body);
    if (score === null) throw new HttpError(422, 'bad_score');
    await env.DB.prepare(
      "UPDATE participations SET status = 'completed', score = ?, answers = ?, completed_at = ? WHERE id = ?"
    ).bind(score, JSON.stringify(cleanAnswers(body.answers)), now(), id).run();
  } else {
    await env.DB.prepare('UPDATE participations SET status = ? WHERE id = ?').bind(status, id).run();
  }
  return json({ ok: true, status });
}

async function markDelivered(env, row, score, answers) {
  if (row.delivered_at) return { delivered: true, alreadyDelivered: true, deliveredAt: row.delivered_at };
  const at = now();
  if (row.status !== 'completed' && score !== null) {
    await env.DB.prepare(
      "UPDATE participations SET status = 'completed', score = ?, answers = ?, completed_at = ? WHERE id = ?"
    ).bind(score, JSON.stringify(answers), at, row.id).run();
  }
  // "delivered_at IS NULL" garantiza una sola entrega aunque lleguen dos peticiones a la vez.
  const res = await env.DB.prepare(
    'UPDATE participations SET delivered_at = ? WHERE id = ? AND delivered_at IS NULL'
  ).bind(at, row.id).run();
  const changed = res.meta && res.meta.changes > 0;
  return { delivered: true, alreadyDelivered: !changed, deliveredAt: at };
}

async function deliver(request, env, auth, id) {
  const body = await readJson(request);
  const row = await env.DB.prepare('SELECT id, status, delivered_at FROM participations WHERE id = ?')
    .bind(id).first();
  if (!row) throw new HttpError(404, 'not_found');
  const result = await markDelivered(env, row, readScore(body), cleanAnswers(body.answers));
  return json({ ok: true, ...result });
}

async function trackEvent(request, env, auth) {
  const body = await readJson(request);
  if (!EVENT_TYPES.has(body.type)) throw new HttpError(422, 'bad_event');
  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM events WHERE device = ? AND at > ?')
    .bind(auth.device, minutesAgo(REG_WINDOW_MIN)).first();
  if (recent.n >= EVENTS_MAX_PER_DEVICE) throw new HttpError(429, 'rate_limited');

  let meta = null;
  if (body.meta && typeof body.meta === 'object') {
    meta = JSON.stringify(body.meta);
    // Los eventos son anónimos: se descarta cualquier meta que parezca contener un contacto.
    if (meta.length > 300 || /@|\+?\d{7,}/.test(meta)) meta = null;
  }
  const pid = isUuid(body.participationId) ? body.participationId : null;
  if (auth.role === 'participant' && pid && auth.pid !== pid) throw new HttpError(403, 'not_your_participation');
  await env.DB.prepare('INSERT INTO events (at, event, type, device, participation_id, meta) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(now(), eventName(env), body.type, auth.device, pid, meta).run();
  return json({ ok: true });
}

// ---------- endpoints del personal ----------

async function stats(env) {
  const event = eventName(env);
  const p = await env.DB.prepare(
    `SELECT
       COUNT(*) AS total,
       SUM(contact_type != 'anonymous') AS registered,
       SUM(contact_type = 'anonymous') AS anonymous,
       SUM(contact_type = 'email') AS emailRows,
       SUM(contact_type = 'phone') AS phoneRows,
       COUNT(DISTINCT CASE WHEN contact_type = 'email' THEN contact_hash END) AS emails,
       COUNT(DISTINCT CASE WHEN contact_type = 'phone' THEN contact_hash END) AS phones,
       COUNT(DISTINCT contact_hash) AS uniqueContacts,
       COUNT(DISTINCT CASE WHEN marketing_consent = 1 THEN contact_hash END) AS marketingContacts,
       SUM(marketing_consent = 1) AS consentRows,
       SUM(status = 'completed') AS completed,
       SUM(delivered_at IS NOT NULL) AS delivered,
       SUM(status = 'completed' AND delivered_at IS NULL) AS pendingDelivery,
       SUM(status != 'completed') AS registeredNotCompleted,
       SUM(is_duplicate = 1) AS duplicates,
       MAX(created_at) AS lastRegistrationAt
     FROM participations WHERE event = ?`
  ).bind(event).first();
  const ev = await env.DB.prepare(
    `SELECT SUM(type = 'start') AS started, SUM(type = 'error') AS errors
     FROM events WHERE event = ?`
  ).bind(event).first();

  const n = (v) => Number(v || 0);
  const started = Math.max(n(ev.started), n(p.total));
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);
  return json({
    ok: true,
    event,
    time: now(),
    started,
    registered: n(p.registered),
    anonymous: n(p.anonymous),
    completed: n(p.completed),
    abandoned: Math.max(started - n(p.completed), 0),
    registeredNotCompleted: n(p.registeredNotCompleted),
    contacts: { unique: n(p.uniqueContacts), emails: n(p.emails), phones: n(p.phones) },
    marketing: { contacts: n(p.marketingContacts), acceptances: n(p.consentRows) },
    delivered: n(p.delivered),
    pendingDelivery: n(p.pendingDelivery),
    duplicates: n(p.duplicates),
    errors: n(ev.errors),
    lastRegistrationAt: p.lastRegistrationAt || null,
    rates: {
      registrationFromStart: pct(n(p.registered), started),
      completionFromStart: pct(n(p.completed), started),
      consentFromRegistered: pct(n(p.consentRows), n(p.registered)),
    },
  });
}

async function deliveries(env) {
  const rows = await env.DB.prepare(
    `SELECT code, created_at, contact_type, contact, marketing_consent, status, score, delivered_at, is_duplicate
     FROM participations WHERE event = ? ORDER BY created_at DESC LIMIT 150`
  ).bind(eventName(env)).all();
  return json({
    ok: true,
    items: rows.results.map((r) => ({
      code: r.code,
      createdAt: r.created_at,
      type: r.contact_type,
      contact: maskContact(r.contact_type, r.contact),
      consent: r.marketing_consent === 1,
      status: r.status,
      score: r.score,
      deliveredAt: r.delivered_at,
      duplicate: r.is_duplicate === 1,
    })),
  });
}

async function staffDeliver(request, env, auth) {
  const body = await readJson(request);
  const code = String(body.code || '').toUpperCase().trim();
  if (!/^V-[2-9A-Z]{5}$/.test(code)) throw new HttpError(422, 'bad_code');
  const row = await env.DB.prepare(
    'SELECT id, status, delivered_at FROM participations WHERE event = ? AND code = ?'
  ).bind(eventName(env), code).first();
  if (!row) throw new HttpError(404, 'not_found');
  const result = await markDelivered(env, row, null, []);
  await env.DB.prepare('INSERT INTO audit (at, role, action, detail) VALUES (?, ?, ?, ?)')
    .bind(now(), auth.role, 'manual_delivery', code).run();
  return json({ ok: true, ...result });
}

async function exportCsv(env, auth, scopeParam, format) {
  const scope = scopeParam === 'marketing' ? 'marketing' : 'all';
  const event = eventName(env);
  // "marketing": un contacto por fila, solo quienes aceptaron, con la evidencia de su primera aceptación.
  const sql = scope === 'marketing'
    ? `SELECT p.* FROM participations p
       WHERE p.event = ? AND p.marketing_consent = 1
         AND p.created_at = (SELECT MIN(q.created_at) FROM participations q
                             WHERE q.event = p.event AND q.contact_hash = p.contact_hash AND q.marketing_consent = 1)
       ORDER BY p.created_at`
    : `SELECT * FROM participations WHERE event = ? AND contact_type != 'anonymous' ORDER BY created_at`;
  const rows = await env.DB.prepare(sql).bind(event).all();

  const cols = ['code', 'first_name', 'event', 'created_at', 'contact_type', 'contact', 'marketing_consent', 'consent_version',
    'consent_text', 'consent_at', 'privacy_version', 'status', 'score', 'delivered_at', 'is_duplicate', 'source', 'device'];
  await env.DB.prepare('INSERT INTO audit (at, role, action, detail) VALUES (?, ?, ?, ?)')
    .bind(now(), auth.role, 'export', `${scope}:${rows.results.length}`).run();

  // format=json alimenta la descarga en Excel del panel y de la tablet.
  if (format === 'json') {
    return json({ ok: true, scope, columns: cols, rows: rows.results.map((r) => Object.fromEntries(cols.map((c) => [c, r[c]]))) });
  }

  const lines = [cols.join(',')];
  for (const r of rows.results) lines.push(cols.map((c) => csvCell(r[c], c === 'contact')).join(','));

  return new Response('﻿' + lines.join('\r\n') + '\r\n', {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="reto-viteba-${scope}.csv"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
