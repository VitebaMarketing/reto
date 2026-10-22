// Configuración de la experiencia. Todo lo que el equipo puede querer ajustar está aquí.

const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);

export const CONFIG = {
  event: 'OAFI 2026',

  // URL del backend (Cloudflare Worker). Vacío = la web pública funciona solo en modo DEMO.
  apiBase: isLocal ? 'http://localhost:8787' : 'https://reto-viteba-api.reto-viteba-api.workers.dev',

  // Modo demostración: no guarda nada y lo indica en pantalla. Se fuerza con ?demo=1.
  demo: new URLSearchParams(location.search).has('demo'),

  questionsPerGame: 3,
  countdown: true,           // cuenta atrás 3-2-1 antes de la primera pregunta (se salta tocando)
  timerSeconds: 15,          // anillo decorativo: no penaliza ni corta la pregunta
  feedbackMs: 0,             // 0 = solo se avanza pulsando SIGUIENTE; >0 = avanza sola tras esos milisegundos
  allowAnonymous: false,     // jugar sin dejar contacto (debe coincidir con ALLOW_ANONYMOUS del backend)

  // Carrusel de premio: los 3 sticks que se regalan (web/assets/img/<img>.webp, fondo transparente).
  // Si el archivo del stick aún no existe, se muestra la foto oficial de `fallback`.
  prizes: [
    { img: 'stick-essential', fallback: 'sticks-essential' },
    { img: 'stick-beauty', fallback: 'sticks-beauty' },
    { img: 'stick-puro', fallback: 'sticks-puro' },
  ],

  idleMs: 75000,             // sin tocar la pantalla durante el juego → "¿Sigues ahí?"
  idleRewardMs: 300000,      // margen extra en la pantalla de premio
  idleConfirmSeconds: 20,
  requestTimeoutMs: 8000,

  source: 'tablet-stand',
  version: '1.1.0',
};
