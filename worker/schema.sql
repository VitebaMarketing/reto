-- El Reto Viteba · esquema de base de datos (Cloudflare D1 / SQLite)
-- Se puede ejecutar varias veces sin perder datos.

CREATE TABLE IF NOT EXISTS participations (
  id                TEXT PRIMARY KEY,            -- UUID generado en la tablet (permite reintentos sin duplicar)
  code              TEXT NOT NULL,               -- identificador corto no sensible que ve la azafata (V-4K7QX)
  event             TEXT NOT NULL,               -- "OAFI 2026"
  created_at        TEXT NOT NULL,               -- ISO 8601 UTC
  first_name        TEXT,                        -- nombre sin apellidos
  contact_type      TEXT NOT NULL CHECK (contact_type IN ('email', 'phone', 'anonymous')),
  contact           TEXT,                        -- email en minúsculas o móvil E.164; NULL si es anónima
  contact_hash      TEXT,                        -- SHA-256 con pepper, solo para detectar duplicados
  marketing_consent INTEGER NOT NULL DEFAULT 0,  -- 1 = aceptó comunicaciones comerciales
  consent_version   TEXT,                        -- versión del texto de consentimiento mostrado
  consent_text      TEXT,                        -- texto literal que aceptó (evidencia)
  consent_at        TEXT,                        -- momento de la aceptación
  privacy_version   TEXT,                        -- versión de la información de privacidad mostrada
  status            TEXT NOT NULL DEFAULT 'registered'
                    CHECK (status IN ('registered', 'playing', 'completed', 'abandoned')),
  score             INTEGER,                     -- aciertos (0-3)
  answers           TEXT,                        -- JSON [{q, ok}] sin datos personales
  completed_at      TEXT,
  delivered_at      TEXT,                        -- NULL = muestra no entregada
  is_duplicate      INTEGER NOT NULL DEFAULT 0,  -- el contacto ya había participado en este evento
  source            TEXT NOT NULL,               -- origen del registro (p. ej. "tablet-stand")
  device            TEXT                         -- etiqueta de la tablet
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_part_code ON participations (event, code);
CREATE INDEX IF NOT EXISTS idx_part_hash ON participations (event, contact_hash);
CREATE INDEX IF NOT EXISTS idx_part_created ON participations (created_at);

-- Eventos analíticos anónimos (sin email ni teléfono)
CREATE TABLE IF NOT EXISTS events (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  at               TEXT NOT NULL,
  event            TEXT NOT NULL,
  type             TEXT NOT NULL,
  device           TEXT,
  participation_id TEXT,
  meta             TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_type ON events (event, type);

-- Intentos de acceso (freno a ataques de fuerza bruta)
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  at TEXT NOT NULL,
  ok INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_login_ip ON login_attempts (ip, at);

-- Registro de acciones sensibles del personal (exportaciones, entregas manuales)
CREATE TABLE IF NOT EXISTS audit (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  at     TEXT NOT NULL,
  role   TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT
);
