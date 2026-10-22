# El Reto Viteba · OAFI 2026

Juego de verdadero o falso para la tablet del stand: el visitante deja su nombre y email (móvil en «Otros…»), responde 3 preguntas sobre colágeno y recoge su muestra. Incluye backend real para guardar contactos y consentimientos, panel del personal y exportación a Excel.

| Carpeta | Qué contiene |
|---|---|
| `web/` | La aplicación (HTML, CSS y JavaScript sin frameworks). Es lo que se publica en GitHub Pages. |
| `worker/` | El backend: API en Cloudflare Workers + base de datos D1. |
| `tests/` | Pruebas automáticas de la API y del generador de Excel. |
| `tools/` | Optimización de imágenes (`design/originales` → `web/assets/img`). |
| `docs/` | Diseño, prompts de imágenes, informe de pruebas, manual de Staff de Viteba, despliegue. |

## Probarlo en local

Requisitos: Node.js 22 o superior y Python 3 (solo para servir archivos estáticos).

```bash
cd worker && npm install && cp .dev.vars.example .dev.vars   # y pon claves de prueba en .dev.vars
npm run db:local        # crea la base de datos local
npm run dev             # API en http://localhost:8787
```

```bash
python3 -m http.server 5173 --directory web     # juego en http://localhost:5173
```

- `http://localhost:5173/` → juego real. Acceso público, también desde un QR; no pide clave del personal.
- `http://localhost:5173/?demo=1` → modo demostración: no guarda nada y lo indica en pantalla.
- `http://localhost:5173/staff.html` → panel del personal.

Pruebas (con la API en marcha): `node --test tests/api.test.mjs tests/xlsx.test.mjs`

## Qué se edita y dónde

| Quiero cambiar… | Archivo |
|---|---|
| Preguntas, respuestas y explicaciones | `web/data/questions.js` |
| Cualquier texto de pantalla y los textos legales | `web/data/copy.js` |
| Tiempos, cuenta atrás, avance automático, imágenes del premio, URL del backend | `web/js/config.js` |
| Colores, tamaños de letra y curvas de animación | `web/css/tokens.css` |

## Arquitectura en una frase

Frontend estático → llama a una API pequeña → la API valida todo y escribe en la base de datos. El navegador nunca puede leer contactos: cada visitante recibe una sesión temporal que solo permite registrar y actualizar su propia participación, el Staff de Viteba ven estadísticas y contactos **enmascarados**, y solo el perfil administrador exporta.

Publicación y puesta en producción: ver [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md).

## Antes de usarlo con datos reales

1. Backend desplegado con claves propias (nunca las de prueba) y `ALLOWED_ORIGINS` con la URL pública.
2. Prueba completa en la tablet real del evento.

Textos legales y preguntas: aprobados por Viteba el 13/10/2026.
