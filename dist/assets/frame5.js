/* FRAME V — Moving Matter · coreografía, visor, señal y reel.
   Mejora progresiva: sin JS, sin GSAP o con movimiento reducido la página
   se lee entera en su estado final (marcos abiertos, pasos y texto visibles). */
(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const sysReduce = matchMedia('(prefers-reduced-motion: reduce)');
  let userStill = false;
  try { userStill = localStorage.getItem('frame5-still') === '1'; } catch { /* almacenamiento no disponible */ }
  const still = () => sysReduce.matches || userStill;

  // ------------------------------------------------------------
  // Capítulo activo, tono del cromo y código de tiempo
  // ------------------------------------------------------------
  const chapters = $$('[data-chapter]');
  const now = $('#now');
  const tc = $('#timecode');
  const links = $$('.frame5-index a');
  const box = (el) => (el.parentElement.classList.contains('pin-spacer') ? el.parentElement : el).getBoundingClientRect();
  let ticking = false;

  function frame() {
    ticking = false;
    const headerY = 28, midY = innerHeight / 2;
    let toneSec = chapters[0], nowSec = chapters[0];
    for (const s of chapters) {
      const r = box(s);
      if (r.top <= headerY && r.bottom > headerY) toneSec = s;
      if (r.top <= midY && r.bottom > midY) nowSec = s;
    }
    if (root.dataset.tone !== toneSec.dataset.tone) root.dataset.tone = toneSec.dataset.tone;
    const label = nowSec.dataset.label;
    if (now.textContent !== label) {
      now.textContent = label;
      const id = '#' + nowSec.id;
      links.forEach((a) => (a.getAttribute('href') === id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
    }
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    const f = Math.round(p * 120 * 24); // 2 minutos a 24 fps
    const pad = (n) => String(n).padStart(2, '0');
    tc.textContent = `TC 00:${pad(Math.floor(f / 1440))}:${pad(Math.floor(f / 24) % 60)}:${pad(f % 24)}`;
    signal.fromScroll();
  }
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request);

  // ------------------------------------------------------------
  // Vídeos de fondo: solo suenan a la vista (no suenan: van sin audio)
  // ------------------------------------------------------------
  const dialog = $('#reel');
  const reelVideo = $('#reel-video');
  const bgVideos = $$('video[data-autoplay]');
  const visible = new Set();
  function syncVideos() {
    for (const v of bgVideos) {
      const ok = visible.has(v) && !still() && !document.hidden && !dialog.open;
      if (ok && v.paused) {
        if (v.preload === 'none') v.preload = 'auto';
        v.play().catch(() => {});
      } else if (!ok && !v.paused) v.pause();
    }
  }
  const vio = new IntersectionObserver((es) => {
    for (const e of es) e.isIntersecting ? visible.add(e.target) : visible.delete(e.target);
    syncVideos();
  }, { rootMargin: '10% 0px' });
  bgVideos.forEach((v) => vio.observe(v));
  document.addEventListener('visibilitychange', () => { syncVideos(); signal.loop(); });

  // ------------------------------------------------------------
  // Reel en mol-dialog (diálogo nativo de SYX)
  // ------------------------------------------------------------
  const reels = {
    color: { title: 'Color in Motion — Reel', src: 'assets/video/color-reel.mp4' },
    process: { title: 'First Principles — Proceso', src: 'assets/video/process.mp4' },
  };
  $$('[data-reel]').forEach((b) => b.addEventListener('click', () => {
    const r = reels[b.dataset.reel];
    $('#reel-title').textContent = r.title;
    if (reelVideo.getAttribute('src') !== r.src) reelVideo.src = r.src;
    dialog.showModal();
    syncVideos();
    if (!still()) reelVideo.play().catch(() => {});
  }));
  dialog.addEventListener('close', () => { reelVideo.pause(); syncVideos(); });
  dialog.addEventListener('click', (e) => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
  });

  // ------------------------------------------------------------
  // Manifiesto: palabras que se encienden al leerlas
  // ------------------------------------------------------------
  const words = [];
  const textBox = $('[data-reveal-words]');
  for (const p of $$('p', textBox)) {
    const parts = p.textContent.split(/(\s+)/);
    p.textContent = '';
    for (const part of parts) {
      if (/^\s+$/.test(part) || !part) { p.append(part); continue; }
      const s = document.createElement('span');
      s.className = 'frame5-word';
      s.textContent = part;
      p.append(s);
      words.push(s);
    }
  }
  const steps = $$('.frame5-process__steps li');
  const light = (list, progress) => {
    const n = Math.round(progress * list.length);
    list.forEach((el, i) => el.classList.toggle('is-lit', i < n));
  };

  // ------------------------------------------------------------
  // 04 · Señal — líneas de cresta: el scroll ordena el ruido
  // ------------------------------------------------------------
  const signal = (() => {
    const sec = $('.frame5-signal');
    const cv = $('.frame5-signal__canvas');
    const ctx = cv.getContext('2d');
    const range = $('#noise');
    const out = $('#noise-out');
    const freeze = $('#signal-toggle');
    let w = 0, h = 0, dpr = 1, p = 0, t = 0, raf = 0, frozen = false, onScreen = false;
    const pointer = { x: -1e4, y: -1e4, k: 0 };
    let ink = '#360b23', paper = '#5bbeb3';
    const seeds = Array.from({ length: 96 }, (_, i) => [Math.sin(i * 12.9898) * 43758.5453 % 1, Math.sin(i * 78.233) * 12345.678 % 1]);

    function colors() {
      const R = window.SYX && window.SYX.resolveColor;
      try {
        if (R) { ink = R('--frame5-plum', { scope: sec }); paper = R('--frame5-teal', { scope: sec }); return; }
      } catch { /* sin conversor: se usa el color computado */ }
      const cs = getComputedStyle(sec);
      ink = cs.color; paper = cs.backgroundColor;
    }
    function size() {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function draw() {
      if (!w) size();
      const noise = Number(range.value) / 100;
      const gap = Math.max(12, Math.min(18, h / 52));
      const lines = Math.floor((h - gap * 6) / gap);
      const top = gap * 4;
      const cx = w * 0.5, spread = w * 0.2;
      const chaos = (1 - p * 0.92) * noise;
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1.25;
      ctx.lineJoin = 'round';
      for (let i = 0; i < lines; i++) {
        const y0 = top + i * gap;
        const [a, b] = seeds[i % seeds.length];
        const centre = Math.exp(-(((i - lines * 0.55) / (lines * 0.16)) ** 2));
        ctx.beginPath();
        ctx.moveTo(0, y0);
        for (let x = 0; x <= w + 6; x += 6) {
          const env = Math.exp(-(((x - cx) / spread) ** 2));
          const clean = env * centre * gap * 11 * p * (0.6 + 0.4 * Math.sin(x * 0.012 - t * 0.6));
          const n = (Math.sin(x * (0.011 + a * 0.01) + t * (0.7 + b) + i) * 0.55 + Math.sin(x * 0.043 + b * 9 - t * 1.4) * 0.3 + Math.sin(x * 0.17 + a * 31 + t * 3.1) * 0.15);
          const rough = Math.abs(n) * gap * 3.2 * chaos * (0.35 + env);
          const d = Math.hypot(x - pointer.x, y0 - pointer.y);
          const poke = pointer.k * Math.exp(-((d / 110) ** 2)) * gap * 3.5 * Math.abs(Math.sin(x * 0.21 + t * 5 + i));
          ctx.lineTo(x, y0 - clean - rough - poke);
        }
        ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
        ctx.fillStyle = paper; ctx.fill();
        ctx.strokeStyle = ink; ctx.stroke();
      }
      sec.style.setProperty('--frame5-noise-blur', still() ? '0px' : ((1 - p) * noise * 10).toFixed(2) + 'px');
    }
    function tick() {
      raf = 0;
      t += 0.016;
      pointer.k *= 0.94;
      draw();
      loop();
    }
    function loop() {
      if (raf || !onScreen || still() || frozen || document.hidden) return;
      raf = requestAnimationFrame(tick);
    }
    function fromScroll() {
      const r = sec.getBoundingClientRect();
      // 0 cuando la sección asoma; 1 cuando su centro pasa el centro de la pantalla
      const q = 1 - (r.top + r.height / 2 - innerHeight / 2) / (innerHeight * 0.9);
      p = still() ? 1 : Math.min(1, Math.max(0, q));
      if (still() || frozen) draw();
    }
    new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) { size(); fromScroll(); draw(); } loop(); }).observe(sec);
    new ResizeObserver(() => { size(); draw(); }).observe(cv);
    range.addEventListener('input', () => { out.value = range.value; draw(); });
    freeze.addEventListener('click', () => {
      frozen = !frozen;
      freeze.setAttribute('aria-pressed', String(frozen));
      freeze.textContent = frozen ? 'Reanudar señal' : 'Congelar señal';
      loop();
    });
    sec.addEventListener('pointermove', (e) => {
      const r = cv.getBoundingClientRect();
      pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.k = 1;
      if (still() || frozen) draw();
    });
    return { colors, draw, loop, fromScroll, refresh() { size(); fromScroll(); draw(); loop(); } };
  })();

  // ------------------------------------------------------------
  // Coreografía (GSAP + ScrollTrigger)
  // ------------------------------------------------------------
  const motionBtn = $('#motion');
  let mm = null;

  function staticState() {
    root.classList.add('is-still');
    delete textBox.dataset.ready;
    delete $('.frame5-process__steps').dataset.ready;
  }

  function setup() {
    if (mm) { mm.revert(); mm = null; }
    root.classList.remove('is-still');
    motionBtn.disabled = sysReduce.matches;
    motionBtn.setAttribute('aria-pressed', String(still()));
    motionBtn.textContent = sysReduce.matches ? 'Movimiento reducido' : still() ? 'Reanudar movimiento' : 'Pausar movimiento';
    signal.colors();

    if (still() || !window.gsap || !window.ScrollTrigger) {
      staticState();
      syncVideos(); signal.refresh(); request();
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    textBox.dataset.ready = '';
    $('.frame5-process__steps').dataset.ready = '';
    mm = gsap.matchMedia();
    const hero = $('.frame5-hero');
    const desktop = '(min-width: 64em) and (min-height: 600px)';

    mm.add({ desktop, mobile: '(max-width: 63.99em), (max-height: 599px)' }, (c) => {
      const { desktop: d } = c.conditions;
      const stage = $('.frame5-hero__stage');
      const H = stage.clientHeight, W = stage.clientWidth;
      // En pantallas estrechas el marco arranca justo debajo del titular (2 o 3 renglones según el ancho)
      const titleBottom = $('.frame5-hero__title').getBoundingClientRect().bottom - stage.getBoundingClientRect().top;
      const u = parseFloat(getComputedStyle(root).getPropertyValue('--frame5-unit')) * 16 || 24;
      const start = d ? { top: H * 0.2, bottom: H * 0.18, x: W / 3 } : { top: Math.max(H * 0.3, titleBottom + u / 2), bottom: H * 0.22, x: parseFloat(getComputedStyle(stage).paddingLeft) };

      // 01 · el marco se abre hasta salirse de cuadro
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: d
          ? { trigger: hero, start: 'top top', end: '+=140%', pin: true, scrub: 0.6, anticipatePin: 1 }
          : { trigger: hero, start: 'top top', end: 'bottom 20%', scrub: 0.5 },
      });
      tl.fromTo(hero, { '--frame5-hero-top': start.top + 'px', '--frame5-hero-bottom': start.bottom + 'px', '--frame5-hero-x': start.x + 'px' },
        { '--frame5-hero-top': '0px', '--frame5-hero-bottom': '0px', '--frame5-hero-x': '0px', ease: 'power2.inOut', duration: 1 }, 0)
        .to('.frame5-hero__line[data-line="a"]', { xPercent: d ? -118 : -60, ease: 'power2.in', duration: 0.85 }, 0.1)
        .to('.frame5-hero__line[data-line="b"]', { xPercent: d ? 118 : 60, ease: 'power2.in', duration: 0.85 }, 0.1)
        .to('.frame5-hero__hint', { autoAlpha: 0, duration: 0.15 }, 0)
        .to('.frame5-hero__corner', { autoAlpha: 0, duration: 0.2 }, 0.8);
      if (d) tl.to({}, { duration: 0.25 });

      // 03 · las persianas de la paleta se abren sobre el vídeo
      const blinds = $$('.frame5-color__blind');
      gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: d
          ? { trigger: '.frame5-color', start: 'top top', end: '+=110%', pin: true, scrub: 0.6, anticipatePin: 1 }
          : { trigger: '.frame5-color__media', start: 'top 70%', end: 'bottom 45%', scrub: 0.5 },
      })
        .fromTo(blinds, { scaleY: 1 }, { scaleY: 0, duration: 1, stagger: 0.14 }, 0)
        .fromTo('.frame5-color__caption', { yPercent: 0, autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.55)
        .to({}, { duration: d ? 0.3 : 0 });
    });

    mm.add('(min-width: 0px)', () => {
      // 02 · titular que entra desde los dos bordes y palabras que se encienden
      $$('.frame5-manifesto__line').forEach((el) => {
        gsap.fromTo(el, { xPercent: 14 * Number(el.dataset.dir) }, {
          xPercent: 0, ease: 'none',
          scrollTrigger: { trigger: '.frame5-manifesto', start: 'top bottom', end: 'top 25%', scrub: 0.5 },
        });
      });
      ScrollTrigger.create({
        trigger: textBox, start: 'top 80%', end: 'bottom 50%',
        onUpdate: (s) => light(words, s.progress), onLeave: () => light(words, 1),
      });

      // 05 · el marco se dibuja a lápiz y después aparece el vídeo
      const media = $('.frame5-process__media');
      gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: media, start: 'top 85%', end: 'bottom 45%', scrub: 0.5 } })
        .fromTo(media, { '--frame5-pencil': 1 }, { '--frame5-pencil': 0, duration: 1 }, 0)
        .fromTo(media, { '--frame5-process-clip': '50%' }, { '--frame5-process-clip': '0%', duration: 0.8, ease: 'power2.out' }, 0.55)
        .fromTo(media, { '--frame5-construction': 0.6 }, { '--frame5-construction': 0.18, duration: 0.5 }, 0.9);
      ScrollTrigger.create({
        trigger: '.frame5-process__steps', start: 'top 80%', end: 'bottom 55%',
        onUpdate: (s) => light(steps, s.progress), onLeave: () => light(steps, 1),
      });

      // Cierre
      gsap.fromTo('.frame5-outro__title span', { xPercent: (i) => (i ? 1 : -1) * (innerWidth < 1024 ? 3 : 12) }, {
        xPercent: 0, ease: 'none',
        scrollTrigger: { trigger: '.frame5-outro', start: 'top bottom', end: 'top 20%', scrub: 0.5 },
      });
    });

    ScrollTrigger.refresh();
    syncVideos(); signal.refresh(); request();
  }

  motionBtn.addEventListener('click', () => {
    userStill = !userStill;
    try { localStorage.setItem('frame5-still', userStill ? '1' : '0'); } catch { /* sin almacenamiento */ }
    setup();
  });
  sysReduce.addEventListener('change', setup);

  // Índice: salto sin animación si se ha pedido quietud
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const target = document.getElementById(a.getAttribute('href').slice(1));
    if (!target) return;
    e.preventDefault();
    const top = box(target).top + scrollY;
    scrollTo({ top, behavior: still() ? 'auto' : 'smooth' });
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }));

  const ready = document.fonts ? document.fonts.ready : Promise.resolve();
  ready.then(setup);
  addEventListener('load', () => window.ScrollTrigger && ScrollTrigger.refresh());
})();
