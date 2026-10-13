# Documento de diseño

## Concepto

Un concurso de televisión en miniatura con la calma de una marca de bienestar: fondo cálido, verde lima como acento de energía, tipografía enorme y un único gesto por pantalla. Nada clínico, nada infantil.

## Identidad (tomada de viteba.com)

| Elemento | Decisión |
|---|---|
| Tipografía | **Zalando Sans SemiExpanded**, la misma de viteba.com (licencia libre OFL, alojada dentro de la app). Pesos 500-800. |
| Verde lima `#E2EF8F` | Acento: etiquetas, foco de los campos, botón VERDADERO, celebraciones. |
| Carbón `#272727` | Texto y botones principales (texto lima sobre carbón: contraste 12:1). |
| Blanco cálido `#F4F2EE` | Fondo. Tarjetas en blanco puro con sombra suave. |
| Rojo suave `#F8CFC4` | Solo el botón FALSO, siempre con icono ✕ y texto. |
| Logo | SVG oficial de viteba.com, sin modificar. |

## Decisiones para personas de 55 a 85 años

- **Letra grande que se adapta sola**: la pregunta se ajusta al espacio (crece hasta 1,5× en frases cortas; nunca baja de ~28 px). Botón **A+** para un 14 % extra.
- **Un objetivo por pantalla** y sin desplazamiento vertical en ningún momento.
- **Botones enormes**: respuestas de 110-200 px de alto, a todo el ancho; mínimo táctil 56 px en controles secundarios.
- **Sin prisa**: el temporizador es un anillo decorativo que se llena y no hace nada. Tras responder, la explicación se queda en pantalla hasta pulsar SIGUIENTE (decisión de Viteba; `feedbackMs` permite reactivar el avance automático).
- **Nunca solo color**: verdadero/falso llevan icono y palabra; acierto/fallo llevan icono, palabra («¡Correcto!» / «¡Casi!») y frase.
- **Fallo amable**: «¡Casi!» en tono ámbar, sin cruz roja ni sonido de error.
- **Formulario mínimo**: un solo campo, teclado correcto (`inputmode`), botones de dominio (@gmail.com…) para ahorrar tecleo, prefijo +34 por defecto, errores en lenguaje llano («Al correo le falta la arroba»).
- **Consentimiento honesto**: casilla desmarcada, mismo peso visual que el resto, texto que nombra el canal, y la muestra se entrega igual.

## Movimiento

- Solo se animan `transform`, `opacity` y `filter`: todo corre en la capa de composición de la GPU.
- Curvas tipo «easy ease» de After Effects: salida `cubic-bezier(.16,1,.3,1)`, entrada `cubic-bezier(.7,0,.84,0)`, entrada-salida `cubic-bezier(.83,0,.17,1)`, rebote `cubic-bezier(.34,1.56,.64,1)`.
- **Desenfoque de movimiento**: cada elemento entra desenfocado y se enfoca al frenar; las preguntas cambian con un barrido lateral con inclinación y estirado (deformación de velocidad).
- **Calidad adaptativa**: si la tablet no mantiene ~40 fps en una transición, se desactiva el desenfoque automáticamente (clase `.lite`) y el resto queda igual.
- Entradas escalonadas (75 ms entre elementos), transiciones de 0,3-0,85 s: dan ritmo sin retrasar la cola.
- `prefers-reduced-motion` y el interruptor «Movimiento reducido» del menú del personal eliminan animaciones y confeti.

## Sonido

Todo sintetizado en el navegador (Web Audio), sin archivos ni licencias: toque, acierto (tres notas ascendentes), fallo amable (dos notas suaves descendentes), fanfarria final y una música ambiental muy baja durante el juego. Empieza solo tras el primer toque, se silencia con un botón y la preferencia se recuerda.

## Componentes

Botón principal (píldora carbón), botón fantasma, tarjeta de elección, campo gigante, chips, casilla de consentimiento, tarjeta de pregunta, botones de respuesta, insignia de resultado, barra de progreso de 3 tramos, anillo temporizador, botón de pulsación mantenida (personal), diálogo, aviso flotante, carrusel 3D de premios, confeti en canvas.

## Tablet compartida: privacidad

- El contacto solo vive en el campo mientras se escribe; al confirmarlo el servidor se borra de pantalla y memoria.
- Nada personal en `localStorage`/cookies (solo preferencias de sonido y la credencial de la tablet).
- Reinicio automático por inactividad (75 s; 5 min en la pantalla de premio) con aviso «¿Sigues ahí?».
- Acciones del personal protegidas con pulsación mantenida; exportación protegida con clave de administración en cada uso.

## Mejoras a decidir con las métricas del evento

| Si se observa… | Probar… |
|---|---|
| Muchos inicios y pocos registros | Mover el registro al final (antes del premio) o activar la opción anónima. |
| Abandono en el teclado | Teclado numérico propio en pantalla para el móvil. |
| Pocas aceptaciones comerciales | Reescribir el beneficio del texto (nunca premarcar ni condicionar). |
| Partidas de más de 75 s | Acortar las explicaciones o quitar la cuenta atrás. |
