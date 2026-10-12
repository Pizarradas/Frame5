# FRAME V — Moving Matter

Quinta exploración de FRAME, construida sobre el mismo encargo, el mismo texto y los mismos vídeos que FRAME IV. Una idea sale del cuadro: un marco de vídeo se abre hasta los bordes del soporte, la paleta se levanta como persianas sobre el vídeo del que sale, el ruido se ordena en señal y un marco se dibuja a lápiz antes de llenarse.

## Abrir

Doble clic en `dist/index.html`: funciona desde el disco, sin servidor (todos los scripts son clásicos, sin módulos ES, y todo es local: GSAP, fuentes y vídeos). También vale `python -m http.server 8000 --directory dist`. Para recompilar: `npm ci` y `npm run build`. Para validar contra SYX: `npm run check` (instantánea del tema, `syx-scan` y contraste del tema).

## La pieza

| Capítulo | Qué pasa | Escritorio (≥ 64em y ≥ 600 px de alto) | Móvil / ventana baja |
|---|---|---|---|
| 01 Fuera de cuadro | El marco de vídeo crece hasta salirse del visor; los dos renglones del titular salen por los laterales | escena fijada, scrub | scrub sin fijar; el marco arranca bajo el titular |
| 02 La idea | El titular entra desde los dos bordes; el manifiesto se enciende palabra a palabra al leerlo | flujo normal | igual |
| 03 Color | Cinco persianas con los colores del tema (y su valor OKLCH) se abren sobre el vídeo del que salen | escena fijada | scrub sin fijar |
| 04 Señal | Líneas de cresta en canvas: el scroll ordena el ruido, el puntero lo vuelve a agitar; deslizador de ruido y botón para congelar | flujo normal | igual |
| 05 Proceso | El marco se dibuja a lápiz (SVG) y después se abre el vídeo; los cinco pasos se encienden en orden | flujo normal | igual |

Visor de cámara fijo: marcas de encuadre, código de tiempo ligado al scroll, capítulo activo (anunciado con `aria-live`) y selector de escena. La tinta del cromo cambia con el tono de cada capítulo.

**Movimiento.** Un único control, «Pausar movimiento», detiene vídeos, canvas y coreografía, y deja cada capítulo en su estado final (WCAG 2.2.2 y 2.3.3). Con `prefers-reduced-motion` el sitio arranca así. Sin JS o sin GSAP, la página se lee completa: marcos abiertos, persianas recogidas, texto encendido.

**Modo oscuro.** Sigue al sistema. Los capítulos de color propio (agua, magenta) mantienen su tinta; el resto pasa a ciruela.

## Arquitectura

- `src/theme/_theme.scss` — tema SYX `frame5`, copiado de `themes/_template`. La paleta sale de los vídeos (cuantización median cut de fotogramas → OKLCH). Claro y oscuro con las dos entradas del contrato.
- `src/theme/_grid-tokens.scss` — tokens de composición calculados con `gridcalc.py` (ver `docs/GRID-SPEC.md`).
- `src/syx.scss` — SYX a medida: núcleo + los cinco componentes que usa la página (`atom-btn`, `atom-icon`, `atom-link`, `mol-disclosure`, `mol-dialog`).
- `src/frame5.scss` — la capa de la app, en `@layer syx.app`, prefijo `frame5-`, tokens `--frame5-*` que solo leen `--semantic-*`, posición y transición por los mixins de SYX, una línea `syx-reuse:` encima de cada bloque propio.
- `dist/assets/frame5.js` — coreografía (GSAP 3.15 + ScrollTrigger), visor, señal, reel. El canvas lee los colores del tema con `syx-colors.js` de SYX, no con hex copiados.
- `scripts/snapshot.scss` — instantánea del vocabulario completo con el tema, contra la que compara `syx-scan`.
- `vendor/syx` — SYX v5.0.0 (commit 7deff28).

## Validación

Medida en Chromium real con Playwright (`docs/qa/`), con el mismo script y los mismos umbrales para FRAME IV y FRAME V:

- Contraste medido en píxeles renderizados de cada texto en 41 posiciones de scroll × 5 configuraciones (1440×900, 1280×720, 390×844, movimiento reducido, oscuro).
- Textos que se pisan, textos cortados por el borde, errores de consola.
- axe-core (WCAG 2.2 AA + buenas prácticas) en escritorio y móvil.
- Recorrido de teclado: foco visible y dentro de pantalla en cada parada.
- LCP, CLS y coste de un recorrido completo de scroll.
- `syx-scan` sobre la app: 0 hallazgos. `check-contraste` del tema: 436 medidas, 0 fallos.

Lo que no se ha podido medir aquí: la reproducción de los vídeos (el Chromium de pruebas no trae H.264; las capturas muestran los pósteres), el rendimiento en dispositivos reales y el comportamiento con lector de pantalla real.

Créditos: SYX https://github.com/Pizarradas/syx · GRID https://github.com/Pizarradas/skill--grid-system · GSAP https://gsap.com/standard-license · Syne, Inter y DM Mono bajo SIL OFL. Vídeos aportados por el cliente; `color-pile.mp4` es un recorte optimizado del reel (s. 28–38), sin alterar el original.
