# Informe de pruebas · 13 de octubre de 2026

Entorno: Mac (Chromium integrado, ventana de 1180 × 820 y 820 × 1180), backend real en local (`wrangler dev` con base de datos D1 local). **No** se ha probado en una tablet física ni en la URL pública.

## Pruebas automáticas — 18 de 18 superadas

`node --test tests/api.test.mjs tests/xlsx.test.mjs`

Cubren: salud del backend, acceso con clave correcta e incorrecta, bloqueo sin token / con token manipulado / por rol / por origen, registro por email y por móvil, formatos inválidos, consentimiento aceptado y rechazado (con evidencia obligatoria), duplicados sin revelarlos, reintento sin duplicar, progreso del juego, entrega única, cero aciertos, entrega manual, eventos sin datos personales, exportación CSV y JSON solo para administrador, y validez del archivo Excel.

## Pruebas en navegador (ejecutadas a mano con el navegador automatizado)

| # | Prueba | Resultado |
|---|---|---|
| 1 | Inicio del juego | ✅ |
| 2 | Registro por email (con botón de dominio) | ✅ |
| 3 | Registro por móvil (+34) | ✅ |
| 4 | Formatos inválidos: mensaje claro y no avanza | ✅ |
| 5 | Consentimiento aceptado → queda guardado con texto y versión | ✅ |
| 6 | Consentimiento rechazado → participa igual | ✅ |
| 7 | Duplicados: marcados en el panel, nada visible para el participante | ✅ |
| 8-9 | Respuestas verdadero / falso, doble pulsación ignorada | ✅ |
| 10 | Tres aciertos | ✅ |
| 11 | Cero aciertos → mismo premio | ✅ |
| 12 | Pantalla de premio con código y carrusel | ✅ (con fotos de caja; faltan los sticks sueltos) |
| 13 | Entrega: pulsación corta no entrega, mantenida sí | ✅ |
| 14 | Reinicio de partida | ✅ |
| 15 | Separación entre participantes: campo, casilla y código vacíos tras reiniciar | ✅ |
| 16 | Pérdida de conexión (backend apagado): avisa de que NO está guardado | ✅ |
| 17 | Recuperación: REINTENTAR con el backend de nuevo en marcha | ✅ |
| 18 | Persistencia: los registros aparecen en el panel tras recargar | ✅ |
| 19 | Acceso autorizado al panel (azafata y administrador) | ✅ |
| 20 | Accesos no autorizados bloqueados (panel, exportación, tablet sin activar) | ✅ |
| 21 | Sonido: el botón cambia de estado y de etiqueta | ✅ estado · ⚠️ no se ha podido **escuchar** el audio |
| 22 | Movimiento reducido (menú del personal) | ✅ se activa · ⚠️ sin revisión visual detallada |
| 23 | Tablet horizontal 1180 × 820: todas las pantallas | ✅ |
| 24 | Tablet vertical 820 × 1180 | ✅ premio · ⚠️ resto solo revisado parcialmente |
| 25 | Teclado: foco visible, Enter en los botones, foco al título de cada pantalla | ✅ básico · ⚠️ sin lector de pantalla |
| 26 | Consola sin errores propios | ✅ (solo avisos provocados por las pruebas y 3 imágenes de sticks pendientes) |
| 27 | Peso de carga | ✅ ≈ 0,9 MB en total, sin dependencias externas |
| 28 | Publicación de la URL | ⛔ pendiente (falta acceso a GitHub y Cloudflare) |

Además: sin avance automático tras responder (9 s esperando, sigue en la misma pregunta), aviso de inactividad y reinicio, exportación a Excel desde la bienvenida (clave de azafata rechazada, clave de administrador aceptada).

## No verificado — hay que hacerlo en la tablet real

- **60 fps**: no medible aquí (el navegador de pruebas limita los fotogramas en segundo plano). El código solo anima propiedades aceleradas por GPU y reduce efectos si detecta lentitud, pero la fluidez real hay que verla en la tablet del evento.
- Safari de iPad y Chrome de Android: teclado en pantalla, pantalla completa, descarga del Excel, audio.
- Carrusel 3D en Safari.
- Recarga sin conexión (service worker) y modo quiosco.
- Sesión continua de varias horas.
- Backend desplegado en Cloudflare (las mismas pruebas automáticas sirven contra la URL real).

## Pendiente de terceros

- Revisión jurídica de los textos de privacidad y consentimiento (borrador).
- Revisión científica/regulatoria de las 14 preguntas.
- Imágenes de los 3 sticks sueltos con fondo transparente.
