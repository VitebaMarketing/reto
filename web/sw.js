// Service worker mínimo: siempre intenta la red (versión más reciente) y, si falla,
// sirve la copia guardada para que la tablet pueda recargar aunque el wifi del recinto flaquee.
// Nunca toca las llamadas a la API: un registro solo vale si el servidor lo confirma.
const CACHE = 'reto-viteba-v2';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }).then((hit) => hit || Response.error()))
  );
});
