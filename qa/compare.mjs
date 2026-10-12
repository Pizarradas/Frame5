// QA medido, idéntico para FRAME IV y FRAME V: mismo navegador, mismas posiciones, mismos umbrales.
// node compare.mjs <url> <label> <outdir>
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { PNG } from 'pngjs';

const [, , url, label, outdir] = process.argv;
mkdirSync(outdir, { recursive: true });
const axeSrc = readFileSync(new URL('../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const browser = await chromium.launch();
const report = { label, url };

const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

// Contraste REAL: píxeles renderizados de la caja de cada texto, partidos en 2 grupos (k-means)
function measured(png, box, dpr) {
  const x0 = Math.max(0, Math.floor(box.x * dpr)), y0 = Math.max(0, Math.floor(box.y * dpr));
  const x1 = Math.min(png.width, Math.ceil((box.x + box.w) * dpr)), y1 = Math.min(png.height, Math.ceil((box.y + box.h) * dpr));
  const px = [];
  const step = Math.max(1, Math.floor(Math.sqrt(((x1 - x0) * (y1 - y0)) / 4000)));
  for (let y = y0; y < y1; y += step) for (let x = x0; x < x1; x += step) { const i = (y * png.width + x) * 4; px.push([png.data[i], png.data[i + 1], png.data[i + 2]]); }
  if (px.length < 20) return null;
  const L = px.map(lum);
  let a = px[L.indexOf(Math.min(...L))], b = px[L.indexOf(Math.max(...L))];
  for (let it = 0; it < 8; it++) {
    const A = [], B = [];
    for (const p of px) { const da = (p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2 + (p[2] - a[2]) ** 2, db = (p[0] - b[0]) ** 2 + (p[1] - b[1]) ** 2 + (p[2] - b[2]) ** 2; (da < db ? A : B).push(p); }
    const mean = (S, d) => (S.length ? [0, 1, 2].map((k) => S.reduce((s, p) => s + p[k], 0) / S.length) : d);
    a = mean(A, a); b = mean(B, b);
    if (it === 7) return { ratio: ratio(a, b), minority: Math.min(A.length, B.length) / px.length };
  }
}

async function sweep(viewport, tag, reduced, dark) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: dark ? 'dark' : 'light', reducedMotion: reduced ? 'reduce' : 'no-preference', isMobile: viewport.width < 600, hasTouch: viewport.width < 600 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const N = 40;
  const fails = [], ghosts = [], clipped = [], blurry = [];
  let samples = 0;
  for (let s = 0; s <= N; s++) {
    const y = Math.round((H * s) / N);
    await page.evaluate((y) => scrollTo(0, y), y);
    await page.waitForTimeout(450);
    const buf = await page.screenshot();
    const png = PNG.sync.read(buf);
    if (s % 4 === 0) writeFileSync(`${outdir}/${tag}-${String(s).padStart(2, '0')}.png`, buf);
    const items = await page.evaluate(() => {
      const out = [];
      const W = innerWidth, Hh = innerHeight;
      const fixedAncestor = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) { const p = getComputedStyle(e).position; if (p === 'fixed') return true; } return false; };
      // opacidad pintada (producto de ancestros) y si está fuera del árbol accesible (aria-hidden/inert)
      const paint = (el) => { let op = 1, hidden = false; for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const cs = getComputedStyle(e); if (e.getAttribute('aria-hidden') === 'true' || e.inert) hidden = true; if (cs.visibility === 'hidden' || cs.display === 'none') return { op: 0, hidden }; op *= parseFloat(cs.opacity); } return { op, hidden }; };
      const blocks = new Map(); const blockOf = (el) => { const b = el.closest('h1,h2,h3,p,li,summary,label,button,a,figcaption,dd,dt') || el; if (!blocks.has(b)) blocks.set(b, blocks.size); return blocks.get(b); };
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const seen = new Set();
      while (walker.nextNode()) {
        const n = walker.currentNode; if (!n.textContent.trim()) continue;
        const el = n.parentElement; if (seen.has(el) || el.closest('dialog,script,style,canvas,svg')) continue; seen.add(el);
        const { op, hidden } = paint(el); if (op < 0.05) continue;
        if (el.checkVisibility && !el.checkVisibility({ contentVisibilityAuto: true })) continue;
        const rng = document.createRange(); rng.selectNodeContents(el);
        const r = rng.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        const inView = r.bottom > 0 && r.top < Hh && r.right > 0 && r.left < W;
        if (!inView) continue;
        const cs = getComputedStyle(el);
        const fs = parseFloat(cs.fontSize), fw = parseInt(cs.fontWeight, 10);
        const large = fs >= 24 || (fs >= 18.66 && fw >= 700);
        const fixed = fixedAncestor(el);
        let blur = 0; for (let e = el; e && e !== document.body; e = e.parentElement) { const m = /blur\(([\d.]+)px\)/.exec(getComputedStyle(e).filter); if (m) blur = Math.max(blur, parseFloat(m[1])); }
        out.push({ hidden, block: blockOf(el), el: null, text: el.textContent.trim().slice(0, 40), x: r.left, y: r.top, w: r.width, h: r.height, large, op, fixed, blur,
          cutX: r.left < -1 || r.right > W + 1, visW: Math.min(r.right, W) - Math.max(r.left, 0) });
      }
      return out;
    });
    for (const it of items) {
      if (it.hidden) continue; // contraste: solo el texto que llega a la persona (no decorativo)
      const box = { x: Math.max(0, it.x), y: Math.max(0, it.y), w: Math.min(it.w, viewport.width - Math.max(0, it.x)), h: Math.min(it.h, viewport.height - Math.max(0, it.y)) };
      if (box.h < 0.6 * it.h || box.w < 0.6 * Math.min(it.w, viewport.width)) continue; // texto cortado por el borde: no se mide
      const m = measured(png, box, 1);
      if (!m) continue;
      samples++;
      const need = it.large ? 3 : 4.5;
      if (m.ratio < need && m.minority > 0.01) fails.push({ y, text: it.text, ratio: +m.ratio.toFixed(2), need, fixed: it.fixed });
      if (it.blur > 1.5) blurry.push({ y, text: it.text, blur: it.blur });
      if (it.cutX && !it.fixed) clipped.push({ y, text: it.text, visible: Math.round((it.visW / it.w) * 100) + '%' });
    }
    // Fantasmas: dos textos de contenido (no fijos) que se pisan en pantalla
    // Incluye texto decorativo pintado (aria-hidden): un fantasma se ve aunque el lector no lo lea
    const content = items.filter((i) => !i.fixed && i.op > 0.05);
    for (let i = 0; i < content.length; i++) for (let j = i + 1; j < content.length; j++) {
      const a = content[i], b = content[j];
      if (a.block === b.block) continue;
      if (a.text.includes(b.text) || b.text.includes(a.text)) continue;
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ix > 8 && iy > 8 && ix * iy > 0.15 * Math.min(a.w * a.h, b.w * b.h)) ghosts.push({ y, a: a.text, b: b.text });
    }
  }
  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await ctx.close();
  const uniq = (arr, key) => [...new Map(arr.map((x) => [key(x), x])).values()];
  return {
    positions: N + 1, textSamples: samples, overflowX, errors,
    contrastFails: fails.length, contrastFailsUnique: uniq(fails, (f) => f.text).length, contrastWorst: fails.sort((a, b) => a.ratio - b.ratio).slice(0, 12),
    overlapEvents: ghosts.length, overlapPairs: uniq(ghosts, (g) => g.a + '|' + g.b).slice(0, 12),
    clippedEvents: clipped.length, clipped: uniq(clipped, (c) => c.text).slice(0, 12),
    blurredEvents: blurry.length,
  };
}

async function axe(viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.addScriptTag({ content: axeSrc });
  const r = await page.evaluate(async () => {
    const res = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
    return res.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help }));
  });
  await ctx.close();
  return r;
}

async function perf() {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  let bytes = 0, reqs = 0; const byType = {};
  page.on('response', async (res) => { try { const b = (await res.body()).length; bytes += b; reqs++; const t = res.request().resourceType(); byType[t] = (byType[t] || 0) + b; } catch {} });
  await page.addInitScript(() => {
    window.__lcp = 0; window.__cls = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const before = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  // recorrido completo a velocidad de rueda: 120 pasos
  const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const t0 = Date.now();
  const frames = await page.evaluate(async (H) => {
    const deltas = []; let last = performance.now(), run = true;
    const loop = (t) => { deltas.push(t - last); last = t; if (run) requestAnimationFrame(loop); }; requestAnimationFrame(loop);
    for (let i = 1; i <= 120; i++) { scrollTo(0, (H * i) / 120); await new Promise((r) => setTimeout(r, 33)); }
    run = false; return deltas;
  }, H);
  const after = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  const vitals = await page.evaluate(() => ({ lcp: Math.round(window.__lcp), cls: +window.__cls.toFixed(4), dom: document.getElementsByTagName('*').length }));
  await ctx.close();
  const long = frames.filter((d) => d > 50).length;
  const sorted = [...frames].sort((a, b) => a - b);
  return {
    initialBytesKB: Math.round(bytes / 1024), requests: reqs, byTypeKB: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, Math.round(v / 1024)])),
    lcpMs: vitals.lcp, cls: vitals.cls, domNodes: vitals.dom,
    scrollScriptMs: Math.round((after.ScriptDuration - before.ScriptDuration) * 1000), scrollLayoutMs: Math.round((after.LayoutDuration - before.LayoutDuration) * 1000), scrollStyleMs: Math.round((after.RecalcStyleDuration - before.RecalcStyleDuration) * 1000),
    frameP95ms: +sorted[Math.floor(sorted.length * 0.95)].toFixed(1), framesOver50ms: long, sweepMs: Date.now() - t0,
  };
}

async function keyboard() {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const stops = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(250);
    const s = await page.evaluate(() => {
      const el = document.activeElement; if (!el || el === document.body) return null;
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      const ring = (parseFloat(cs.outlineWidth) > 0 && cs.outlineStyle !== 'none') || (cs.boxShadow && cs.boxShadow !== 'none');
      return { tag: el.tagName, text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30), inView: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth, w: Math.round(r.width), h: Math.round(r.height), ring };
    });
    if (!s) continue;
    if (stops.length && stops[0].text === s.text && stops[0].tag === s.tag && i > 3) break;
    stops.push(s);
  }
  await ctx.close();
  return { stops: stops.length, notInView: stops.filter((s) => !s.inView).map((s) => s.text), noRing: stops.filter((s) => !s.ring).map((s) => s.text), under24: stops.filter((s) => s.w < 24 || s.h < 24).map((s) => s.text), under44: stops.filter((s) => s.w < 44 || s.h < 44).map((s) => s.text) };
}

report.desktop = await sweep({ width: 1440, height: 900 }, 'desk', false);
report.laptop = await sweep({ width: 1280, height: 720 }, 'lap', false);
report.mobile = await sweep({ width: 390, height: 844 }, 'mob', false);
report.reduced = await sweep({ width: 1440, height: 900 }, 'red', true);
report.dark = await sweep({ width: 1440, height: 900 }, 'dark', false, true);
report.axeDesktop = await axe({ width: 1440, height: 900 });
report.axeMobile = await axe({ width: 390, height: 844 });
report.keyboard = await keyboard();
report.perf = await perf();
await browser.close();
writeFileSync(`${outdir}/report.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify({ label, desk: { cf: report.desktop.contrastFails, ov: report.desktop.overlapEvents, cl: report.desktop.clippedEvents, err: report.desktop.errors.length }, lap: { cf: report.laptop.contrastFails, ov: report.laptop.overlapEvents, cl: report.laptop.clippedEvents }, mob: { cf: report.mobile.contrastFails, ov: report.mobile.overlapEvents, cl: report.mobile.clippedEvents, ox: report.mobile.overflowX }, red: { cf: report.reduced.contrastFails, ov: report.reduced.overlapEvents }, axe: report.axeDesktop.map((v) => v.id + ':' + v.impact + ':' + v.nodes), axeM: report.axeMobile.map((v) => v.id + ':' + v.nodes), kb: report.keyboard, perf: report.perf }, null, 1));
