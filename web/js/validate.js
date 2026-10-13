// Validación en la tablet con mensajes en lenguaje llano. El servidor vuelve a validar siempre.

export const PREFIXES = [
  ['+34', 'España'], ['+351', 'Portugal'], ['+33', 'Francia'], ['+39', 'Italia'], ['+376', 'Andorra'],
  ['+44', 'Reino Unido'], ['+49', 'Alemania'], ['+41', 'Suiza'], ['+32', 'Bélgica'], ['+31', 'Países Bajos'],
  ['+1', 'EE. UU. / Canadá'], ['+52', 'México'], ['+54', 'Argentina'], ['+57', 'Colombia'], ['+56', 'Chile'],
  ['+51', 'Perú'], ['+58', 'Venezuela'], ['+593', 'Ecuador'], ['+212', 'Marruecos'],
];

export function checkEmail(raw, t) {
  const value = String(raw || '').trim().toLowerCase();
  if (!value) return { ok: false, message: t.emailEmpty };
  if (!value.includes('@')) return { ok: false, message: t.emailNoAt };
  if (/\s/.test(value)) return { ok: false, message: t.emailSpaces };
  if (!/^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(value) || value.includes('..')) {
    return { ok: false, message: t.emailBad };
  }
  return { ok: true, value };
}

export function checkPhone(raw, prefix, t) {
  let digits = String(raw || '').replace(/[\s().-]/g, '');
  if (!digits) return { ok: false, message: t.phoneEmpty };
  if (digits.startsWith('00')) digits = '+' + digits.slice(2);
  const value = digits.startsWith('+') ? digits : prefix + digits;
  if (!/^\+\d+$/.test(value)) return { ok: false, message: t.phoneBad };
  if (value.startsWith('+34')) {
    const national = value.slice(3);
    if (national.length !== 9) return { ok: false, message: t.phoneLength };
    if (!/^[67]/.test(national)) return { ok: false, message: t.phoneNotMobile };
  } else if (!/^\+[1-9]\d{6,14}$/.test(value)) {
    return { ok: false, message: t.phoneBad };
  }
  return { ok: true, value };
}
