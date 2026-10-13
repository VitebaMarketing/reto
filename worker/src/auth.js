// Tokens firmados (HMAC-SHA256) y comparación de contraseñas en tiempo constante.

const enc = new TextEncoder();

function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(str) {
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmac(data, secret) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

export async function sha256Hex(text) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text)));
  return [...digest].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// Se comparan los hashes, no los textos, para que la duración no dependa de la contraseña.
export async function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !b) return false;
  const [ha, hb] = await Promise.all([sha256Hex(a), sha256Hex(b)]);
  return bytesEqual(enc.encode(ha), enc.encode(hb));
}

export async function signToken(payload, secret) {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  return `${body}.${b64url(await hmac(body, secret))}`;
}

export async function verifyToken(token, secret) {
  const [body, sig] = String(token).split('.');
  if (!body || !sig) return null;
  try {
    if (!bytesEqual(fromB64url(sig), await hmac(body, secret))) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    if (!payload.exp || payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}
