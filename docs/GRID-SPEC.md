# GRID SPEC — FRAME V

```
Contexto       : web de agencia conceptual, experiencia de scroll en 5 capítulos + cierre · expresividad experimental
Tipografía     : cuerpo Inter 400 (xh 0,546 · char 0,482 em, es) · 16→18 px / 1,5 · medida 60 car. reales = 30,85 em
                 display Syne 700 (cap 0,647 · ch 0,738) · mayúsculas con interlineado 0,86
                 visor DM Mono 400/500
Densidad       : uso scanning · densidad default · razón de cadena 1,618
Cadena         : micro 6 · inner 10 · padding 14→18 · gutter 16→28 · margen 16→72 · sección 62→74 (px, 320→1440)
Retícula base  : 6 pistas < 48em · 12 pistas ≥ 48em · máx. 90rem
Escala display : 48→184 · 40→136 · 28→64 · 22→32 (gridcalc clamp, 320→1440)
Operadores     : O11 superposición (titular sobre el marco de vídeo; persianas sobre vídeo)
                 O12 ruptura: el marco del cap. 01 crece hasta los bordes del soporte y los dos renglones salen por los laterales
Invariantes    : orden del DOM = orden de lectura · prosa ≤ 30,85 em · objetivo táctil 48 px · cromo fuera del flujo
Transformación : < 48em una columna (6 pistas); 48–64em 12 pistas sin pin; ≥ 64em y ≥ 600 px de alto, pin en 01 y 03
Validación     : medida en navegador real — docs/qa/ (capturas + report.json)
```

## Derivación

```
gridcalc.py font  Inter-Regular.woff2 --lang es
gridcalc.py font  Syne-Bold.woff2 --lang es
gridcalc.py compose --font Inter-Regular.woff2 --lang es --sample <copy real de la página>
                    --use scanning --density default --range 320,1440 --type-ratio 1.333 --heading-steps 8
gridcalc.py clamp --min 48 --max 184 --vmin 320 --vmax 1440   → clamp(3rem, 0.5714rem + 12.1429vw, 11.5rem)
gridcalc.py clamp --min 40 --max 136 …                         → clamp(2.5rem, 0.7857rem + 8.5714vw, 8.5rem)
gridcalc.py clamp --min 28 --max 64 …                          → clamp(1.75rem, 1.1071rem + 3.2143vw, 4rem)
gridcalc.py clamp --min 22 --max 32 …                          → clamp(1.375rem, 1.1964rem + 0.8929vw, 2rem)
```

El titular del capítulo 01 en escritorio se acota además con `min(…, 13.2vw, 21svh)`: «DE CUADRO.»
(10 caracteres de Syne Bold) tiene que caber en el ancho y los dos renglones en el alto de la escena.

## Color

La paleta se extrae de los vídeos del cliente (median cut sobre fotogramas del reel y el póster), no se elige:

| Rol | OKLCH | Origen |
|---|---|---|
| Ciruela (tinta, superficie inversa) | 0,235 0,075 350 | sombras de los corazones (#381a37) |
| Magenta (énfasis) | 0,52 0,215 357 | corazones magenta (#97045b) |
| Magenta 700 (botón primario) | 0,45 0,19 357 | un peldaño: papel encima 7,5:1 |
| Agua (acento) | 0,74 0,095 185 | corazones verde agua (#519590) |
| Caramelo | 0,74 0,075 355 | el set rosa (#b27a8e) |
| Rubor | 0,905 0,035 355 | el set, aclarado |
| Papel | 0,972 0,01 355 | blanco teñido del set |

Contraste del tema con el comprobador de SYX (`check-contraste`): 436 medidas en los 4 estados de modo, 0 fallos.
