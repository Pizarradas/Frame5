/* SYX syx-colors.js (copia clásica generada por scripts/build.mjs) */
(() => {
/**
 * SYX — Colores para librerías que pintan en canvas
 * ─────────────────────────────────────────────────
 * ECharts, Chart.js y D3 sobre canvas no entienden `oklch()`, y todo SYX está
 * escrito en `oklch()`. Esto lee el token tal como lo resuelve la página —tema,
 * modo oscuro, overrides de la aplicación incluidos— y lo devuelve en hex o rgb:
 *
 *   import { resolveColor } from 'syx-design-system/js/syx-colors.js';
 *   resolveColor('--semantic-color-primary');                    // '#1e3aff'
 *   resolveColor('var(--lumen-chart-accent)', { format: 'rgb' }); // 'rgb(30, 58, 255)'
 *   resolveColors(['--semantic-color-primary', '--semantic-color-state-success']);
 *
 * Sin empaquetador, `<script type="module" src=".../js/syx-colors.js">` deja lo
 * mismo en `window.SYX.resolveColor` y `window.SYX.resolveColors`.
 *
 * CÓMO
 * Un elemento sonda, oculto, recibe `color: var(--token)` dentro de `scope`
 * (por defecto <body>) y se lee su color calculado: así el navegador resuelve
 * las cadenas de var(), color-mix() y oklch(from …) y aplica el tema y el modo
 * vigentes. El navegador devuelve ese color en su espacio (oklch(), oklab(),
 * color(srgb …), rgb()); aquí se pasa a sRGB con las matrices de CSS Color 4.
 * Sin canvas ni getImageData.
 *
 * GAMA
 * Un color fuera de sRGB se RECORTA canal a canal en lineal, como hace
 * scripts/lib/contraste.js (y resolveColor() de Node); no se aplica el mapeo
 * de gama de CSS Color 4, que reduce croma. lab()/lch() no se leen: SYX no los
 * usa, y un color que no sabe leer LANZA un error en vez de inventarse.
 *
 * Opciones: format ('hex' | 'rgb' | 'oklch', 'hex' por defecto) y scope (el
 * elemento cuyo contexto manda: un contenedor con su propio tema o un override
 * local de tokens). El resultado vale para el momento de la llamada: si cambia
 * el modo (data-theme, prefers-color-scheme), hay que volver a pedirlo.
 * check:colores contrasta esta conversión con la de Node token a token.
 */

const recortar = (x) => Math.min(1, Math.max(0, x));
const aGamma = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
const aLineal = (x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);

function oklabALineal(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

function linealAOklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

// display-p3 lineal → sRGB lineal (misma curva de transferencia que sRGB).
const P3 = [
  [1.2249401762805598, -0.22494017628055996, 0],
  [-0.04205695470968816, 1.0420569547096881, 0],
  [-0.019637554590334432, -0.07863604555063188, 1.0982736001409663],
];

/** Un canal: número, porcentaje (sobre `escala`) o `none`. */
function canal(t, escala = 1) {
  if (t === 'none') return 0;
  if (t.endsWith('%')) return (parseFloat(t) / 100) * escala;
  return parseFloat(t);
}

/** Un color calculado por el navegador → { rgb: sRGB lineal [0..1] sin recortar, alpha } o null. */
function parseColor(valor) {
  const v = String(valor).trim().toLowerCase();
  const hex = /^#([0-9a-f]{3,8})$/.exec(v);
  if (hex) {
    let d = hex[1];
    if (d.length < 6) d = d.split('').map((c) => c + c).join('');
    if (d.length !== 6 && d.length !== 8) return null;
    const p = (i) => parseInt(d.slice(i, i + 2), 16) / 255;
    return { rgb: [p(0), p(2), p(4)].map(aLineal), alpha: d.length === 8 ? p(6) : 1 };
  }
  const f = /^([a-z-]+)\((.*)\)$/.exec(v);
  if (!f) return v === 'transparent' ? { rgb: [0, 0, 0], alpha: 0 } : null;
  const [cuerpo, a] = f[2].split('/');
  const partes = cuerpo.replace(/,/g, ' ').trim().split(/\s+/);
  let alpha = a !== undefined ? canal(a.trim()) : 1;
  let rgb = null;
  if (f[1] === 'rgb' || f[1] === 'rgba') {
    if (partes.length === 4 && a === undefined) alpha = canal(partes.pop());
    if (partes.length !== 3) return null;
    rgb = partes.map((x) => aLineal(canal(x, 255) / 255));
  } else if (f[1] === 'oklch' && partes.length === 3) {
    const [L, C, H] = [canal(partes[0]), canal(partes[1], 0.4), canal(partes[2].replace(/deg$/, ''))];
    const h = (H * Math.PI) / 180;
    rgb = oklabALineal(L, C * Math.cos(h), C * Math.sin(h));
  } else if (f[1] === 'oklab' && partes.length === 3) {
    rgb = oklabALineal(canal(partes[0]), canal(partes[1], 0.4), canal(partes[2], 0.4));
  } else if (f[1] === 'color' && partes.length === 4) {
    const [espacio, ...c] = partes;
    const n = c.map((x) => canal(x));
    if (espacio === 'srgb') rgb = n.map(aLineal);
    else if (espacio === 'srgb-linear') rgb = n;
    else if (espacio === 'display-p3') {
      const l = n.map(aLineal);
      rgb = P3.map((fila) => fila.reduce((s, k, i) => s + k * l[i], 0));
    }
  }
  if (!rgb || rgb.some((x) => !Number.isFinite(x)) || !Number.isFinite(alpha)) return null;
  return { rgb, alpha: recortar(alpha) };
}

/** { rgb lineal, alpha } → la cadena pedida. Recorta a la gama sRGB. */
function formatColor({ rgb, alpha }, format = 'hex') {
  const lin = rgb.map(recortar);
  const n255 = lin.map((x) => Math.round(recortar(aGamma(x)) * 255));
  const al = Math.round(alpha * 1000) / 1000;
  if (format === 'hex') {
    const h = (x) => x.toString(16).padStart(2, '0');
    return '#' + n255.map(h).join('') + (al < 1 ? h(Math.round(al * 255)) : '');
  }
  if (format === 'rgb') return al < 1 ? `rgba(${n255.join(', ')}, ${al})` : `rgb(${n255.join(', ')})`;
  if (format === 'oklch') {
    const [L, x, y] = linealAOklab(lin);
    const C = Math.hypot(x, y);
    const H = C < 1e-4 ? 0 : ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
    const r = (v, d) => String(Math.round(v * 10 ** d) / 10 ** d);
    return `oklch(${r(L, 4)} ${r(C, 4)} ${r(H, 2)}${al < 1 ? ` / ${al}` : ''})`;
  }
  throw new Error(`syx-colors: unknown format "${format}" (hex | rgb | oklch)`);
}

function calcular(entrada, scope, sonda) {
  const bruto = String(entrada).trim();
  const nombre = (/^var\(\s*(--[\w-]+)\s*\)$/.exec(bruto) || [])[1] || (bruto.startsWith('--') ? bruto : null);
  if (nombre) {
    // Un token inexistente no invalida `color: var(--x)`: el color se hereda y
    // saldría el del texto sin avisar. Por eso se mira antes.
    const declarado = getComputedStyle(scope).getPropertyValue(nombre).trim();
    if (!declarado) throw new Error(`syx-colors: ${nombre} is not defined in this scope`);
    if (typeof CSS !== 'undefined' && CSS.supports && !CSS.supports('color', declarado)) {
      throw new Error(`syx-colors: ${nombre} is not a colour (${declarado})`);
    }
  }
  sonda.style.color = '';
  sonda.style.color = nombre ? `var(${nombre})` : bruto;
  if (!sonda.style.color) throw new Error(`syx-colors: not a CSS colour: ${bruto}`);
  return getComputedStyle(sonda).color;
}

/** Varios a la vez, con una sola sonda. Mismo contrato que resolveColor. */
function resolveColors(entradas, { format = 'hex', scope } = {}) {
  const ambito = scope || document.body || document.documentElement;
  const sonda = document.createElement('span');
  sonda.setAttribute('aria-hidden', 'true');
  sonda.style.display = 'none';
  ambito.appendChild(sonda);
  try {
    return entradas.map((e) => {
      const calculado = calcular(e, ambito, sonda);
      const color = parseColor(calculado);
      if (!color) throw new Error(`syx-colors: cannot convert ${e} (computed as ${calculado})`);
      return formatColor(color, format);
    });
  } finally {
    sonda.remove();
  }
}

/** Un token (`--x` o `var(--x)`) o un color CSS → hex, rgb u oklch en sRGB. */
function resolveColor(entrada, opciones) {
  return resolveColors([entrada], opciones)[0];
}

if (typeof globalThis !== 'undefined') {
  globalThis.SYX = Object.assign(globalThis.SYX || {}, { resolveColor, resolveColors });
}

})();
