# Despliegue

Dos piezas: el **juego** (GitHub Pages, gratis) y el **backend** (Cloudflare Workers + D1, plan gratuito: 100.000 peticiones/día y 5 GB, muy por encima de lo que necesita un stand).

## 1. Backend (Cloudflare)

```bash
cd worker
npx wrangler login                                   # abre el navegador para autorizar la cuenta de Viteba
npx wrangler d1 create reto-viteba --jurisdiction eu # datos alojados en la UE; copia el database_id en wrangler.toml
npm run db:remote                                    # crea las tablas
npx wrangler secret put SESSION_SECRET               # cadena aleatoria larga (p. ej. `openssl rand -hex 32`)
npx wrangler secret put HASH_PEPPER                  # otra cadena aleatoria larga
npx wrangler secret put STAFF_PASSWORD               # clave de las azafatas (activa tablets y abre el panel)
npx wrangler secret put ADMIN_PASSWORD               # clave de marketing (además permite exportar)
```

En `wrangler.toml`, pon en `ALLOWED_ORIGINS` la URL pública del juego (por ejemplo `https://viteba.github.io`) y despliega:

```bash
npm run deploy     # devuelve la URL de la API: https://reto-viteba-api.<cuenta>.workers.dev
```

Comprueba `https://…workers.dev/api/health` → debe responder `"ok":true`.

## 2. Juego (GitHub Pages)

1. En `web/js/config.js`, pon la URL de la API en `apiBase` (la línea del valor de producción).
2. Sube el repositorio a GitHub y activa Pages con la carpeta `web/` (el flujo `.github/workflows/pages.yml` lo publica en cada push a `main`).
3. Abre la URL pública, activa la tablet con la clave del personal y juega una partida de prueba. Comprueba en `staff.html` que aparece.

Mientras `apiBase` esté vacío, la web pública funciona **solo en modo demostración** (no guarda datos y lo indica).

## 3. Validar producción

```bash
API_URL=https://…workers.dev TEST_ORIGIN=https://viteba.github.io STAFF_PASSWORD=… ADMIN_PASSWORD=… node --test tests/api.test.mjs
```

Las pruebas crean registros `@example.com`. Bórralos antes del evento:

```bash
npx wrangler d1 execute reto-viteba --remote --command "DELETE FROM participations WHERE contact LIKE '%@example.com'; DELETE FROM events;"
```

## 4. Después del evento

- Exporta el Excel desde el panel (perfil administrador).
- Borra los contactos sin consentimiento comercial en el plazo comprometido en la información de privacidad (30 días en el borrador):
  `DELETE FROM participations WHERE marketing_consent = 0;`
- Cambia o elimina las claves (`wrangler secret put …`) para desactivar tablets y panel.

## Tablet en modo quiosco

- **iPad**: abre la URL en Safari → Compartir → «Añadir a pantalla de inicio» (se abre a pantalla completa). Después: Ajustes → Accesibilidad → **Acceso guiado** → activar, y triple clic en el botón superior con el juego abierto. Desactiva el bloqueo automático (Ajustes → Pantalla y brillo → Nunca).
- **Android**: Chrome → menú → «Añadir a pantalla de inicio»; luego Ajustes → Seguridad → **Fijar aplicación**. Pantalla siempre activa mientras carga.
- Volumen al 30-40 %, brillo alto, tablet enchufada, wifi del stand o datos móviles compartidos.
