// Exportación de participantes a Excel. Solo funciona con un token de administrador:
// los datos se piden al servidor en el momento y no se guardan en el navegador.

import { buildWorkbook } from './xlsx.js';

const HEADERS = {
  first_name: 'Nombre', code: 'Código', event: 'Evento', created_at: 'Fecha y hora (UTC)', contact_type: 'Tipo de contacto',
  contact: 'Contacto', marketing_consent: 'Acepta comunicaciones comerciales', consent_version: 'Versión del consentimiento',
  consent_text: 'Texto aceptado', consent_at: 'Fecha del consentimiento (UTC)', privacy_version: 'Versión de privacidad',
  status: 'Estado del juego', score: 'Aciertos', delivered_at: 'Muestra entregada (UTC)', is_duplicate: 'Contacto repetido',
  source: 'Origen', device: 'Tablet',
};
const VALUES = {
  contact_type: { email: 'Email', phone: 'Móvil' },
  status: { registered: 'Registrado', playing: 'Jugando', completed: 'Completado', abandoned: 'Abandonado' },
  marketing_consent: { 0: 'No', 1: 'Sí' },
  is_duplicate: { 0: 'No', 1: 'Sí' },
};

async function fetchScope(apiBase, token, scope) {
  const res = await fetch(`${apiBase}/api/admin/export.csv?scope=${scope}&format=json`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || !data.ok) {
    const err = new Error('export_failed');
    err.status = res.status;
    throw err;
  }
  return {
    headers: data.columns.map((c) => HEADERS[c] || c),
    rows: data.rows.map((row) => data.columns.map((c) => {
      const value = row[c];
      if (value === null || value === undefined) return '';
      return VALUES[c] && VALUES[c][value] !== undefined ? VALUES[c][value] : value;
    })),
  };
}

export async function downloadParticipantsExcel(apiBase, token) {
  const [all, marketing] = await Promise.all([
    fetchScope(apiBase, token, 'all'),
    fetchScope(apiBase, token, 'marketing'),
  ]);
  const blob = buildWorkbook([
    { name: 'Todos los participantes', ...all },
    { name: 'Aptos para marketing', ...marketing },
  ]);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `reto-viteba-participantes-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return { total: all.rows.length, marketing: marketing.rows.length };
}
