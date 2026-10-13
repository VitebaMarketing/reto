// Validación y normalización de datos. Sin dependencias: también la usan las pruebas.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;

export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

export function normalizeEmail(raw) {
  const email = String(raw || '').trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email) || email.includes('..')) return null;
  return email;
}

// Devuelve el móvil en formato E.164 (+34612345678) o null.
export function normalizePhone(raw) {
  let phone = String(raw || '').replace(/[\s().-]/g, '');
  if (phone.startsWith('00')) phone = '+' + phone.slice(2);
  if (!/^\+[1-9]\d{6,14}$/.test(phone)) return null;
  if (phone.startsWith('+34') && !/^\+34[67]\d{8}$/.test(phone)) return null;
  return phone;
}

export function normalizeContact(type, raw) {
  if (type === 'anonymous') return { ok: true, type, contact: null };
  if (type === 'email') {
    const contact = normalizeEmail(raw);
    return contact ? { ok: true, type, contact } : { ok: false, error: 'bad_email' };
  }
  if (type === 'phone') {
    const contact = normalizePhone(raw);
    return contact ? { ok: true, type, contact } : { ok: false, error: 'bad_phone' };
  }
  return { ok: false, error: 'bad_contact_type' };
}

export function cleanAnswers(answers) {
  if (!Array.isArray(answers)) return [];
  return answers.slice(0, 3).map((a) => ({
    q: String((a && a.q) || '').replace(/[^\w-]/g, '').slice(0, 40),
    ok: Boolean(a && a.ok),
  }));
}

// El panel de azafatas solo ve contactos enmascarados: m•••@g•••.com / +34 ••• ••• 678
export function maskContact(type, contact) {
  if (!contact) return '—';
  if (type === 'email') {
    const [user, domain] = contact.split('@');
    const dot = domain.lastIndexOf('.');
    return `${user[0]}•••@${domain[0]}•••${domain.slice(dot)}`;
  }
  return `${contact.slice(0, 3)} ••• ••• ${contact.slice(-3)}`;
}

// Evita que una hoja de cálculo interprete una celda como fórmula.
export function csvCell(value, trusted = false) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (!trusted && /^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
