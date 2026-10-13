# Prompts de imágenes · El Reto Viteba

## Estado actual

Las seis imágenes que enviaste ya están integradas y optimizadas:

| Archivo (`web/assets/img/`) | Dónde aparece |
|---|---|
| `escena.webp` | Fondo de la bienvenida (texto a la izquierda, escultura a la derecha). |
| `forma.webp` | Decoración flotante en el registro. |
| `vf-iconos.webp` | Pantalla «¡Es muy fácil!». |
| `vitamina-c.webp` | Preguntas de vitamina C. |
| `movimiento.webp` | Preguntas de movimiento. |
| `podio.webp` | Pantalla de premio, bajo el carrusel de productos. |

Para sustituir cualquiera: guarda el original en `design/originales/` con el mismo nombre y ejecuta `cd tools && npm run images`.

**Productos:** nunca se generan con IA. El carrusel usa fotos oficiales (`config.js → prizes`).

## Bloque de estilo común (pegar al inicio de cada prompt)

> Render 3D de producto, estilo editorial premium de marca de bienestar. Materiales mate suaves tipo cerámica y silicona, con algún detalle de satén marfil. Paleta estricta: verde lima pastel #E2EF8F, carbón #272727, marfil #F4F2EE, toques mínimos de dorado suave. Iluminación de estudio difusa desde arriba a la izquierda, sombras suaves, sin reflejos duros. Formas redondeadas y amables. Sin texto, sin letras, sin logotipos, sin personas, sin envases ni productos, sin elementos médicos (huesos, radiografías, pastillas, jeringas). Sensación de vitalidad, calma y movimiento.

## Imágenes que faltan y merece la pena generar

Hoy 9 de las 14 preguntas (colágeno, articulaciones y huesos) salen sin ilustración. Tres imágenes más darían a cada tema la suya.

### 1 · `colageno.webp` — tema Colágeno

- **Objetivo:** representar el colágeno como estructura que sostiene, de forma abstracta y bella.
- **Escena:** tres cintas gruesas (lima, marfil y una fina carbón) trenzadas en triple hélice suave, flotando en diagonal ascendente.
- **Composición:** objeto centrado que ocupa el 75 % del encuadre, margen libre alrededor.
- **Formato:** cuadrado 1:1, 1254 × 1254 px, **fondo transparente** (PNG o WebP con alfa).
- **Evitar:** aspecto de ADN científico, moléculas, texto, brillo plástico.

### 2 · `articulaciones.webp` — tema Articulaciones

- **Objetivo:** evocar una articulación que se mueve con suavidad, sin anatomía.
- **Escena:** dos piezas redondeadas tipo canto rodado (una lima, una marfil) encajadas como bisagra orgánica, con una almohadilla translúcida de vidrio esmerilado entre ambas; una cinta de satén sugiere el arco del movimiento.
- **Composición:** centrado, 75 % del encuadre.
- **Formato:** 1:1, 1254 × 1254 px, fondo transparente.
- **Evitar:** huesos reales, rodillas, esqueletos, rojo o señales de dolor.

### 3 · `huesos.webp` — tema Huesos

- **Objetivo:** transmitir solidez y estructura viva.
- **Escena:** torre equilibrada de tres piezas cerámicas apiladas (marfil, lima, marfil) con textura de piedra caliza muy fina, una esfera carbón pequeña al lado y una hoja verde apoyada.
- **Composición:** centrado, vertical, 75 % del encuadre.
- **Formato:** 1:1, 1254 × 1254 px, fondo transparente.
- **Evitar:** huesos literales, calaveras, radiografías.

Al recibirlas: copiarlas a `design/originales/`, añadirlas a `tools/optimize-images.mjs` y poner `image: 'colageno'` (etc.) en las preguntas correspondientes de `web/data/questions.js`.

### 4 · (Opcional) `escena-vertical.webp` — bienvenida con la tablet en vertical

- **Objetivo:** versión vertical de la escena actual; hoy se recorta la horizontal.
- **Escena:** la misma escultura (arco lima, vidrio esmerilado, onda lima, satén marfil, esfera carbón) situada en el **tercio inferior**; los dos tercios superiores, pared marfil lisa y vacía para los textos.
- **Formato:** 3:4, 1536 × 2048 px, fondo integrado (no transparente).
- **Evitar:** cualquier objeto en la mitad superior.

## Prompts de las imágenes ya integradas (por si hay que regenerarlas)

Todas con el bloque de estilo común.

- **`escena`** — 16:9, 1672 × 941, fondo integrado. Arco lima mate con panel de vidrio esmerilado, onda lima en primer plano, tela de satén marfil que cae por detrás, esfera carbón, plataforma circular lima. Todo en el **tercio derecho**; los dos tercios izquierdos, pared y suelo marfil vacíos para texto.
- **`forma`** — 1:1, transparente. Forma orgánica lima y forma de satén marfil entrelazadas en espiral, con un canto rodado carbón veteado.
- **`vf-iconos`** — 1:1, transparente. Dos fichas cuadradas de esquinas redondeadas inclinadas: lima con marca de verificación carbón y carbón con aspa marfil; cinta de satén dorado claro y una esfera lima.
- **`vitamina-c`** — 1:1, transparente. Cuenco cerámico marfil con medio kiwi, un gajo de naranja, un trozo de pimiento rojo, dos hojas verdes y un canto carbón. Fotorrealista (única excepción a la paleta: los colores naturales de los alimentos).
- **`movimiento`** — 1:1, transparente. Par de zapatillas de punto marfil con talón lima, **sin marca ni logotipo**, flotando sobre un canto rodado beige, con cinta de satén lima alrededor.
- **`podio`** — 1:1, transparente. Podio circular de dos alturas marfil con filo dorado, **centro superior vacío** para colocar el producto, cintas de satén lima a ambos lados y confeti dorado, lima y carbón.
