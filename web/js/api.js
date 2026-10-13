// Cliente de la API. Dos implementaciones con la misma interfaz:
//  - real: habla con el backend y solo da por bueno lo que el servidor confirma.
//  - demo: no envía ni guarda nada (la pantalla lo indica con una etiqueta visible).

const TOKEN_KEY = 'rv-kiosk-token'; // credencial de la tablet, no es un dato del participante

export class ApiError extends Error {
  // kind: 'network' | 'unauthorized' | 'invalid' | 'busy' | 'server'
  constructor(kind, code) {
    super(code || kind);
    this.kind = kind;
    this.code = code;
  }
}

function createRealApi(config) {
  let token = null;
  try {
    token = localStorage.getItem(TOKEN_KEY);
  } catch {
    token = null;
  }

  async function request(path, { method = 'GET', body, auth = true } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);
    let res;
    try {
      res = await fetch(config.apiBase + path, {
        method,
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        cache: 'no-store',
      });
    } catch {
      throw new ApiError('network');
    } finally {
      clearTimeout(timer);
    }
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (res.ok && data && data.ok) return data;
    const code = data && data.error;
    if (res.status === 401) throw new ApiError('unauthorized', code);
    if (res.status === 422 || res.status === 400) throw new ApiError('invalid', code);
    if (res.status === 429) throw new ApiError('busy', code);
    throw new ApiError('server', code);
  }

  return {
    demo: false,
    isActivated: () => Boolean(token),
    deactivate() {
      token = null;
      try { localStorage.removeItem(TOKEN_KEY); } catch { /* nada que borrar */ }
    },
    async activate(password, device) {
      const data = await request('/api/auth/login', { method: 'POST', auth: false, body: { password, scope: 'kiosk', device } });
      token = data.token;
      try { localStorage.setItem(TOKEN_KEY, token); } catch { /* se pedirá de nuevo al recargar */ }
    },
    health: () => request('/api/health', { auth: false }),
    register: (payload) => request('/api/participations', { method: 'POST', body: payload }),
    progress: (id, payload) => request(`/api/participations/${id}/progress`, { method: 'POST', body: payload }),
    deliver: (id, payload) => request(`/api/participations/${id}/deliver`, { method: 'POST', body: payload }),
    track: (type, meta, participationId) => request('/api/events', { method: 'POST', body: { type, meta, participationId } }),
  };
}

function createDemoApi() {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  return {
    demo: true,
    isActivated: () => true,
    deactivate() {},
    async activate() {},
    async health() { return { ok: true, demo: true }; },
    async register(payload) {
      await wait(400);
      let code = 'V-';
      for (let i = 0; i < 5; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
      return { ok: true, id: payload.id, code };
    },
    async progress() { return { ok: true }; },
    async deliver() { await wait(300); return { ok: true, delivered: true, alreadyDelivered: false }; },
    async track() { return { ok: true }; },
  };
}

export function createApi(config) {
  return config.demo || !config.apiBase ? createDemoApi() : createRealApi(config);
}

// Envíos secundarios (progreso, analítica): se reintentan en segundo plano y nunca bloquean el juego.
export function createBackgroundQueue(onChange = () => {}) {
  let pending = 0;
  let failed = 0;
  return {
    get pending() { return pending; },
    get failed() { return failed; },
    async run(task) {
      pending++;
      onChange();
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await task();
          pending--;
          onChange();
          return true;
        } catch (err) {
          if (err.kind !== 'network' && err.kind !== 'server') break;
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        }
      }
      pending--;
      failed++;
      onChange();
      return false;
    },
  };
}
