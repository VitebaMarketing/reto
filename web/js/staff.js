// Panel del personal. Todo se pide al servidor con un token de sesión; aquí no hay claves ni contactos.

import { CONFIG } from './config.js';
import { downloadParticipantsExcel } from './export.js';

const $ = (selector) => document.querySelector(selector);
const TOKEN_KEY = 'rv-panel-token'; // sessionStorage: se borra al cerrar la pestaña

let token = null;
let role = null;
let refreshTimer = null;

for (const node of document.querySelectorAll('[data-event]')) node.textContent = CONFIG.event;

async function request(path, { method = 'GET', body, raw = false } = {}) {
  const res = await fetch(CONFIG.apiBase + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (res.status === 401 && token) {
    logout();
    throw new Error('unauthorized');
  }
  if (raw) {
    if (!res.ok) throw new Error('export_failed');
    return res;
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || !data.ok) {
    const err = new Error((data && data.error) || 'server_error');
    err.status = res.status;
    throw err;
  }
  return data;
}

// ---------- acceso ----------

function showPanel() {
  $('#login').hidden = true;
  $('#panel').hidden = false;
  $('#role').textContent = role === 'admin' ? 'Administrador' : 'Staff';
  $('#export-section').hidden = role !== 'admin';
  refresh();
  clearInterval(refreshTimer);
  refreshTimer = setInterval(refresh, 15000);
}

function logout() {
  token = null;
  role = null;
  clearInterval(refreshTimer);
  try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* nada que borrar */ }
  $('#panel').hidden = true;
  $('#login').hidden = false;
  $('#rows').replaceChildren();
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = $('#password');
  const error = $('#login-error');
  error.textContent = '';
  try {
    const data = await request('/api/auth/login', { method: 'POST', body: { password: password.value, scope: 'panel' } });
    token = data.token;
    role = data.role;
    try { sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token, role, exp: data.exp })); } catch { /* sesión solo en memoria */ }
    showPanel();
  } catch (err) {
    error.textContent = err.status === 401 ? 'Clave incorrecta.'
      : err.status === 429 ? 'Demasiados intentos. Espera 15 minutos.'
      : 'No se puede conectar con el servidor.';
  } finally {
    password.value = '';
  }
});

$('#logout').addEventListener('click', logout);
$('#refresh').addEventListener('click', refresh);

// ---------- datos ----------

const fmtPct = (v) => (v === null || v === undefined ? '—' : `${String(v).replace('.', ',')} %`);
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—');

function tile(value, label, sub, modifier) {
  const div = document.createElement('div');
  div.className = `tile${modifier ? ` tile--${modifier}` : ''}`;
  const v = document.createElement('p');
  v.className = 'tile__value';
  v.textContent = value;
  const l = document.createElement('p');
  l.className = 'tile__label';
  l.textContent = label;
  div.append(v, l);
  if (sub) {
    const s = document.createElement('p');
    s.className = 'tile__sub';
    s.textContent = sub;
    div.append(s);
  }
  return div;
}

function setStatus(state, text) {
  $('#status').dataset.state = state;
  $('#status-text').textContent = text;
}

function renderStats(s) {
  $('#tiles-funnel').replaceChildren(
    tile(s.started, 'Partidas iniciadas', 'Pulsaron «Quiero jugar»'),
    tile(s.registered, 'Registros válidos', `${fmtPct(s.rates.registrationFromStart)} de las iniciadas`),
    tile(s.completed, 'Juegos completados', `${fmtPct(s.rates.completionFromStart)} de las iniciadas`),
    tile(s.abandoned, 'Abandonos', `${s.registeredNotCompleted} tras registrarse`),
  );
  $('#tiles-leads').replaceChildren(
    tile(s.contacts.unique, 'Contactos recopilados', 'Personas distintas'),
    tile(s.marketing.contacts, 'Aptos para comunicaciones comerciales', `${fmtPct(s.rates.consentFromRegistered)} de los registros`, 'accent'),
    tile(s.contacts.emails, 'Emails captados'),
    tile(s.contacts.phones, 'Teléfonos captados'),
    tile(s.duplicates, 'Duplicados', 'Contactos que repitieron'),
  );
  $('#tiles-ops').replaceChildren(
    tile(s.delivered, 'Muestras entregadas'),
    tile(s.pendingDelivery, 'Entregas sin registrar', 'Juego completado, sin entrega', s.pendingDelivery ? 'warn' : ''),
    tile(s.errors, 'Errores técnicos', 'Avisos enviados por la tablet', s.errors ? 'warn' : ''),
    tile(fmtTime(s.lastRegistrationAt), 'Último registro guardado'),
  );
}

const STATUS_LABELS = { registered: 'Registrado', playing: 'Jugando', completed: 'Completado', abandoned: 'Abandonado' };

function cell(text, className) {
  const td = document.createElement('td');
  if (className) {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    td.append(span);
  } else {
    td.textContent = text;
  }
  return td;
}

function renderRows(items) {
  if (!items.length) {
    const tr = document.createElement('tr');
    const td = cell('Todavía no hay participaciones.');
    td.colSpan = 7;
    td.className = 'empty';
    tr.append(td);
    $('#rows').replaceChildren(tr);
    return;
  }
  $('#rows').replaceChildren(...items.map((item) => {
    const tr = document.createElement('tr');
    tr.append(
      cell(fmtTime(item.createdAt)),
      cell(item.code),
      cell(item.duplicate ? `${item.contact} · repetido` : item.contact),
      cell(item.consent ? 'Sí' : 'No', item.consent ? 'tag tag--yes' : 'tag'),
      cell(STATUS_LABELS[item.status] || item.status),
      cell(item.score === null ? '—' : `${item.score} de 3`),
      item.deliveredAt ? cell(`Entregada ${fmtTime(item.deliveredAt)}`, 'tag tag--yes')
        : cell('Pendiente', item.status === 'completed' ? 'tag tag--pending' : 'tag'),
    );
    return tr;
  }));
}

async function refresh() {
  if (!token) return;
  try {
    const [health, stats, list] = await Promise.all([
      request('/api/health'), request('/api/staff/stats'), request('/api/staff/deliveries'),
    ]);
    renderStats(stats);
    renderRows(list.items);
    setStatus('ok', `Servidor y base de datos correctos · actualizado ${fmtTime(health.time)}`);
  } catch (err) {
    if (err.message !== 'unauthorized') setStatus('error', 'Sin conexión con el servidor. Los datos mostrados pueden estar desactualizados.');
  }
}

// ---------- acciones ----------

$('#deliver-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = $('#deliver-code');
  const msg = $('#deliver-msg');
  try {
    const res = await request('/api/staff/deliver', { method: 'POST', body: { code: input.value } });
    msg.textContent = res.alreadyDelivered
      ? `La muestra de ${input.value.toUpperCase()} ya constaba como entregada.`
      : `Entrega de ${input.value.toUpperCase()} registrada.`;
    input.value = '';
    refresh();
  } catch (err) {
    msg.textContent = err.status === 404 ? 'No existe ninguna participación con ese código.'
      : err.status === 422 ? 'El código tiene el formato V-XXXXX.'
      : 'No se ha podido registrar. Revisa la conexión.';
  }
});

$('#export-excel').addEventListener('click', async (e) => {
  const warning = 'Vas a descargar los datos personales de todos los participantes. Los que NO aceptaron comunicaciones comerciales no pueden usarse para marketing. ¿Continuar?';
  if (!window.confirm(warning)) return;
  const msg = $('#export-msg');
  e.currentTarget.disabled = true;
  try {
    const result = await downloadParticipantsExcel(CONFIG.apiBase, token);
    msg.textContent = `Descargado: ${result.total} registros, ${result.marketing} aptos para marketing.`;
  } catch {
    msg.textContent = 'No se ha podido exportar. Revisa la conexión y vuelve a intentarlo.';
  } finally {
    $('#export-excel').disabled = false;
  }
});

// ---------- arranque ----------

if (!CONFIG.apiBase) {
  $('#login-hint').textContent = 'El backend todavía no está configurado en esta dirección (js/config.js → apiBase).';
  $('#login-form').querySelector('button').disabled = true;
} else {
  try {
    const saved = JSON.parse(sessionStorage.getItem(TOKEN_KEY));
    if (saved && saved.exp > Date.now() / 1000) {
      token = saved.token;
      role = saved.role;
      showPanel();
    }
  } catch { /* sin sesión guardada */ }
}
