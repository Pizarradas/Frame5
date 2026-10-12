// FRAME V — compila el tema SYX a medida y la capa de la app; copia GSAP y las fuentes.
import { writeFileSync, mkdirSync, copyFileSync, readFileSync } from 'node:fs';
import * as sass from 'sass';
const silence = ['mixed-decls'];
for (const [entry, out] of [['src/syx.scss', 'dist/assets/syx-frame5.css'], ['src/frame5.scss', 'dist/assets/frame5.css']]) {
  const r = sass.compile(entry, { style: 'compressed', silenceDeprecations: silence });
  writeFileSync(out, r.css);
  console.log(out, (r.css.length / 1024).toFixed(1) + ' KB');
}
mkdirSync('dist/assets/gsap', { recursive: true });
for (const n of ['gsap.min.js', 'ScrollTrigger.min.js']) copyFileSync('node_modules/gsap/dist/' + n, 'dist/assets/gsap/' + n);
// Conversor oklch → hex de SYX para el canvas. Se publica como script clásico (IIFE, sin export)
// para que dist/index.html funcione abierto con doble clic: los módulos ES no cargan desde file://.
{
  const src = readFileSync('vendor/syx/js/syx-colors.js', 'utf8').replace(/^export\s+/gm, '');
  writeFileSync('dist/assets/syx-colors.js', `/* SYX syx-colors.js (copia clásica generada por scripts/build.mjs) */\n(() => {\n${src}\n})();\n`);
}
const fonts = { 'google-syne': ['Syne-Bold'], 'google-inter': ['Inter-Regular', 'Inter-Medium'], 'google-dm-mono': ['DMMono-Regular', 'DMMono-Medium'] };
for (const [dir, files] of Object.entries(fonts)) {
  mkdirSync('dist/fonts/' + dir, { recursive: true });
  for (const f of files) copyFileSync(`vendor/syx/fonts/${dir}/${f}.woff2`, `dist/fonts/${dir}/${f}.woff2`);
  try { copyFileSync(`vendor/syx/fonts/${dir}/LICENSE`, `dist/fonts/${dir}/LICENSE`); } catch { /* sin LICENSE en el origen: OFL, ver README */ }
}
console.log('FRAME V: build ok');
