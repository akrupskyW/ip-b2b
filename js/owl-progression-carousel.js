/* =============================================================================
   owl-progression-carousel.js — Wise Owl Progression strip for chat.

   Edge-to-edge horizontal strip: Lottie owls, transparent stills, then
   theme-aware silent videos (linen / light vs deep-harbor / dark). Background
   stays the chat surface — no black rail. One shared definition; pages host
   it via owlProgressionCarouselHtml() + auto-mount.

   Lottie and video wait for a click (play once, click again to replay).
   Stills are PNG with a punched-out studio matte so the chat shows through.
   ========================================================================== */

const STYLE_ID = 'wise-owl-progression-styles';
const LOTTIE_CDN = 'https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie_light.min.js';

const DEFAULT_BASE = '../assets/owl-progression';

/* Shared media box — Lottie, stills, and videos all fill the same square. */
export const OWL_PROG_MEDIA_H = 220;

function asset(base, name) {
  return `${String(base || DEFAULT_BASE).replace(/\/$/, '')}/${name}`;
}

function isDarkTheme() {
  try {
    return !!(document.documentElement && document.documentElement.classList.contains('dark'));
  } catch (_) {
    return false;
  }
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Item list. Theme-paired videos expose lightSrc + darkSrc; mount picks one.
 * Order: Lotties → stills → videos.
 */
export function owlProgressionSlides(base) {
  const b = base || DEFAULT_BASE;
  return [
    { kind: 'lottie', src: asset(b, 'owl-green-anim.json'), label: 'Green owl · thumbs up', tone: 'green' },
    { kind: 'lottie', src: asset(b, 'owl-red-anim.json'), label: 'Red owl · thumbs down', tone: 'red' },
    { kind: 'lottie', src: asset(b, 'owl-blue-anim.json'), label: 'Blue owl · celebrate', tone: 'blue' },
    { kind: 'image', src: asset(b, 'owl-green.png'), label: 'Green owl · still', tone: 'green' },
    { kind: 'image', src: asset(b, 'owl-blue.png'), label: 'Blue owl · still', tone: 'blue' },
    { kind: 'image', src: asset(b, 'owl-red.png'), label: 'Red owl · still', tone: 'red' },
    {
      kind: 'video',
      lightSrc: asset(b, 'owl-linen.mp4'),
      darkSrc: asset(b, 'owl-deep-harbor.mp4'),
      label: 'Blue owl · motion',
      tone: 'blue',
    },
    {
      kind: 'video',
      lightSrc: asset(b, 'owl-red-linen.mp4'),
      darkSrc: asset(b, 'owl-red-deep-harbor.mp4'),
      label: 'Red owl · motion',
      tone: 'red',
    },
    {
      kind: 'video',
      lightSrc: asset(b, 'owl-scan-green-light.mp4'),
      darkSrc: asset(b, 'owl-scan-green-dark.mp4'),
      label: 'Green owl · scan',
      tone: 'green',
    },
  ];
}

function itemInnerHtml(slide, i) {
  const lab = esc(slide.label);
  if (slide.kind === 'lottie') {
    return `<div class="sc-owl-prog-media sc-owl-prog-lottie" data-owl-lottie="${esc(slide.src)}" data-owl-i="${i}" aria-hidden="true"></div>`;
  }
  if (slide.kind === 'image') {
    return `<img class="sc-owl-prog-media sc-owl-prog-img" src="${esc(slide.src)}" alt="${lab}" loading="lazy" decoding="async" draggable="false">`;
  }
  /* Theme sources live on data-*; mount swaps src when the theme flips. */
  return `<video class="sc-owl-prog-media sc-owl-prog-vid" data-owl-light="${esc(slide.lightSrc)}" data-owl-dark="${esc(slide.darkSrc)}" muted playsinline preload="metadata" disablepictureinpicture controlslist="nodownload noplaybackrate noremoteplayback" aria-hidden="true"></video>`;
}

/**
 * Markup for one strip. Drop inside a WISEcodeAI reply; auto-mount wires it.
 * @param {{ base?: string, id?: string }} [opts]
 */
export function owlProgressionCarouselHtml(opts) {
  const base = (opts && opts.base) || DEFAULT_BASE;
  const id = (opts && opts.id) || `owl-prog-${Math.random().toString(36).slice(2, 9)}`;
  const slides = owlProgressionSlides(base);
  const items = slides.map((s, i) => {
    const playable = s.kind === 'lottie' || s.kind === 'video';
    const playAttrs = playable
      ? ` tabindex="0" role="button" aria-label="Play ${esc(s.label)}"`
      : '';
    return (
      `<div class="sc-owl-prog-item${playable ? ' is-playable' : ''}" data-owl-slide="${i}" data-owl-kind="${esc(s.kind)}" data-owl-tone="${esc(s.tone || '')}"${playAttrs}>`
      + itemInnerHtml(s, i)
      + `<span class="sc-owl-prog-cap">${esc(s.label)}</span>`
      + `</div>`
    );
  }).join('');
  return (
    `<figure class="sc-owl-prog" data-owl-prog="${esc(id)}" role="region" aria-roledescription="carousel" aria-label="Wise Owl Progression">`
    + `<div class="sc-owl-prog-viewport" data-owl-viewport>`
    + `<div class="sc-owl-prog-track" data-owl-track>${items}</div>`
    + `</div>`
    + `<div class="sc-owl-prog-chrome">`
    + `<button type="button" class="sc-owl-prog-nav sc-owl-prog-prev" data-owl-dir="-1" aria-label="Scroll previous">`
    + `<span class="material-symbols-outlined" aria-hidden="true">chevron_left</span>`
    + `</button>`
    + `<figcaption class="sc-owl-prog-figcap">Wise Owl Progression</figcaption>`
    + `<button type="button" class="sc-owl-prog-nav sc-owl-prog-next" data-owl-dir="1" aria-label="Scroll next">`
    + `<span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>`
    + `</button>`
    + `</div>`
    + `</figure>`
  );
}

/* Write the stylesheet exactly once. Rewriting textContent mutates the DOM,
   and the document-wide observer below reacts to DOM mutations — so a
   re-write here feeds that observer its own change and the two spin forever,
   starving every timer on the page. */
function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  document.head.appendChild(style);
  style.textContent = `
/* Edge-to-edge of the chat MODULE: cancel the avatar column and the
   messages-area padding using the sc-chat-body container inline size.
   Background stays transparent so the chat surface shows through the gaps. */
.sc-line-body > .sc-owl-prog {
  --sc-owl-pad: max(3rem, calc((100cqi - var(--sc-transcript-max, 860px)) / 2));
  --sc-owl-media-h: ${OWL_PROG_MEDIA_H}px;
  --sc-owl-gap: 14px;
  box-sizing: border-box;
  width: 100cqi;
  max-width: 100cqi;
  margin: 0.85em 0 0.35em;
  margin-left: calc(-1 * (var(--sc-avatar-size, 30px) + 12px + var(--sc-owl-pad)));
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text);
}
.sc-owl-prog-viewport {
  position: relative;
  overflow-x: auto;
  overflow-y: hidden;
  background: transparent;
  scroll-snap-type: x proximity;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  padding-inline: var(--sc-owl-pad, 3rem);
  scroll-padding-inline: var(--sc-owl-pad, 3rem);
}
.sc-owl-prog-track {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: var(--sc-owl-gap, 14px);
  width: max-content;
  min-width: 100%;
  background: transparent;
}
.sc-owl-prog-item {
  flex: 0 0 auto;
  width: var(--sc-owl-media-h, ${OWL_PROG_MEDIA_H}px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  scroll-snap-align: start;
  background: transparent;
  user-select: none;
}
.sc-owl-prog-item.is-playable { cursor: pointer; }
.sc-owl-prog-item.is-playable:focus {
  outline: none;
}
.sc-owl-prog-item.is-playable:focus-visible {
  outline: 2px solid var(--primary, #1d4ed8);
  outline-offset: 4px;
  border-radius: 14px;
}
.sc-owl-prog-media {
  display: block;
  width: var(--sc-owl-media-h, ${OWL_PROG_MEDIA_H}px);
  height: var(--sc-owl-media-h, ${OWL_PROG_MEDIA_H}px);
  max-height: var(--sc-owl-media-h, ${OWL_PROG_MEDIA_H}px);
  object-fit: contain;
  object-position: center;
  background: transparent;
  border: 0;
  border-radius: 12px;
  pointer-events: none;
}
.sc-owl-prog-lottie { overflow: hidden; }
.sc-owl-prog-lottie svg {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
.sc-owl-prog-cap {
  display: block;
  margin-top: 8px;
  width: 100%;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .02em;
  line-height: 1.3;
  color: var(--text-muted);
  text-align: center;
  pointer-events: none;
}
.sc-owl-prog-chrome {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 12px 2px;
  background: transparent;
}
.sc-owl-prog-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
}
.sc-owl-prog-nav:hover {
  color: var(--text);
  background: color-mix(in srgb, var(--text) 8%, transparent);
}
.sc-owl-prog-nav .material-symbols-outlined { font-size: 22px; }
.sc-owl-prog-figcap {
  margin: 0;
  font-size: 0.78em;
  line-height: 1.45;
  color: var(--text-muted);
  text-align: center;
  min-width: 10em;
}
@media (prefers-reduced-motion: reduce) {
  .sc-owl-prog-viewport { scroll-behavior: auto; }
}
`;
}

let lottiePromise = null;
function loadLottie() {
  if (typeof window !== 'undefined' && window.lottie) return Promise.resolve(window.lottie);
  if (lottiePromise) return lottiePromise;
  lottiePromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-wise-lottie]');
    if (existing && window.lottie) { resolve(window.lottie); return; }
    const s = document.createElement('script');
    s.src = LOTTIE_CDN;
    s.async = true;
    s.dataset.wiseLottie = '1';
    s.onload = () => resolve(window.lottie);
    s.onerror = () => reject(new Error('lottie-web failed to load'));
    document.head.appendChild(s);
  });
  return lottiePromise;
}

function applyVideoTheme(vid) {
  if (!vid) return;
  const dark = isDarkTheme();
  const next = dark ? (vid.dataset.owlDark || '') : (vid.dataset.owlLight || '');
  if (!next) return;
  const abs = (() => {
    try { return new URL(next, document.baseURI || window.location.href).href; }
    catch (_) { return next; }
  })();
  const cur = vid.currentSrc || vid.src || '';
  if (cur === abs || vid.getAttribute('src') === next) return;
  const wasPlaying = !vid.paused && !vid.ended;
  vid.setAttribute('src', next);
  vid.load();
  if (wasPlaying) {
    try {
      vid.currentTime = 0;
      const p = vid.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_) { /* autoplay may be blocked */ }
  } else {
    showVideoPoster(vid);
  }
}

function lottieStartFrame(anim) {
  if (!anim) return 0;
  if (typeof anim.firstFrame === 'number') return anim.firstFrame;
  return 0;
}

/* Green/red are 900×900 with margin; blue is 600×600 and fills the box.
   Pad the smaller canvas to the largest in this strip so the owls match.
   (A CSS scale cannot win — lottie-web writes an inline transform on the SVG.) */
function normalizeLottieSizes(nodes) {
  const sizes = nodes.map((el) => {
    const data = el.__wiseLottie && el.__wiseLottie.animationData;
    return data && data.w;
  }).filter((n) => typeof n === 'number' && n > 0);
  if (sizes.length < 2) return;
  const ref = Math.max.apply(null, sizes);
  nodes.forEach((el) => {
    const data = el.__wiseLottie && el.__wiseLottie.animationData;
    const w = data && data.w;
    const h = data && data.h;
    const svg = el.querySelector('svg');
    if (!svg || !w || !h || w >= ref) return;
    const ox = (ref - w) / 2;
    const oy = (ref - h) / 2;
    svg.setAttribute('viewBox', `${-ox} ${-oy} ${ref} ${ref}`);
  });
}

function pauseItemMedia(item) {
  if (!item) return;
  item.querySelectorAll('video').forEach((v) => {
    try { v.pause(); } catch (_) { /* */ }
  });
}

function showVideoPoster(vid) {
  if (!vid) return;
  const pin = () => {
    try {
      if (vid.currentTime < 0.05) vid.currentTime = 0.001;
    } catch (_) { /* */ }
  };
  if (vid.readyState >= 1) pin();
  else vid.addEventListener('loadeddata', pin, { once: true });
}

function playItemMedia(item) {
  if (!item) return;
  item.querySelectorAll('video').forEach((v) => {
    applyVideoTheme(v);
    try {
      v.loop = false;
      v.currentTime = 0;
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_) { /* */ }
  });
  item.querySelectorAll('[data-owl-lottie]').forEach((el) => {
    const anim = el.__wiseLottie;
    if (!anim) return;
    try {
      anim.loop = false;
      const start = lottieStartFrame(anim);
      if (typeof anim.goToAndPlay === 'function') anim.goToAndPlay(start, true);
      else if (typeof anim.play === 'function') anim.play();
    } catch (_) { /* */ }
  });
  const strip = item.closest('.sc-owl-prog');
  if (strip) normalizeLottieSizes(Array.from(strip.querySelectorAll('[data-owl-lottie]')));
}

function scrollByItem(root, dir) {
  const viewport = root.querySelector('[data-owl-viewport]');
  const item = root.querySelector('.sc-owl-prog-item');
  if (!viewport || !item) return;
  const gap = parseFloat(getComputedStyle(root).getPropertyValue('--sc-owl-gap')) || 14;
  const step = item.getBoundingClientRect().width + gap;
  viewport.scrollBy({ left: dir * step, behavior: 'smooth' });
}

async function mountLotties(root) {
  const nodes = Array.from(root.querySelectorAll('[data-owl-lottie]'));
  if (!nodes.length) return;
  let lottie;
  try { lottie = await loadLottie(); }
  catch (_) { return; }
  if (!lottie) return;
  const reduced = (() => {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (_) { return false; }
  })();
  nodes.forEach((el) => {
    if (el.__wiseLottie) return;
    const path = el.getAttribute('data-owl-lottie');
    if (!path) return;
    try {
      const anim = lottie.loadAnimation({
        container: el,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        path,
      });
      el.__wiseLottie = anim;
      const holdFirst = () => {
        try {
          const start = lottieStartFrame(anim);
          if (typeof anim.goToAndStop === 'function') anim.goToAndStop(start, true);
        } catch (_) { /* */ }
        normalizeLottieSizes(nodes);
      };
      anim.addEventListener('DOMLoaded', holdFirst);
      if (reduced) holdFirst();
    } catch (_) { /* skip broken JSON */ }
  });
}

function mountOne(root) {
  if (!root || root.dataset.owlMounted === '1') return;
  root.dataset.owlMounted = '1';
  injectStyles();

  root.querySelectorAll('video.sc-owl-prog-vid').forEach((vid) => {
    applyVideoTheme(vid);
    showVideoPoster(vid);
  });

  root.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-owl-dir]');
    if (nav && root.contains(nav)) {
      const dir = parseInt(nav.getAttribute('data-owl-dir'), 10) || 0;
      scrollByItem(root, dir);
      return;
    }
    const item = e.target.closest('.sc-owl-prog-item.is-playable');
    if (item && root.contains(item)) playItemMedia(item);
  });

  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); scrollByItem(root, -1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); scrollByItem(root, 1); }
    else if (e.key === 'Enter' || e.key === ' ') {
      const item = e.target.closest('.sc-owl-prog-item.is-playable');
      if (item && root.contains(item)) {
        e.preventDefault();
        playItemMedia(item);
      }
    }
  });
  if (!root.hasAttribute('tabindex')) root.setAttribute('tabindex', '0');

  const items = Array.from(root.querySelectorAll('.sc-owl-prog-item'));
  const viewport = root.querySelector('[data-owl-viewport]');

  /* Pause clips that leave the strip so they are not decoding off-screen.
     Do not auto-start — play is click-only. */
  if (typeof IntersectionObserver !== 'undefined') {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) pauseItemMedia(en.target);
      });
    }, { root: viewport || null, threshold: 0.05 });
    items.forEach((item) => io.observe(item));
  }

  mountLotties(root);
}

/** Mount every unmounted strip under `scope` (default: document). */
export function mountOwlProgressionCarousels(scope) {
  injectStyles();
  const root = scope && scope.querySelectorAll ? scope : document;
  root.querySelectorAll('.sc-owl-prog:not([data-owl-mounted="1"])').forEach(mountOne);
}

let themeBound = false;
function bindThemeWatcher() {
  if (themeBound || typeof document === 'undefined') return;
  themeBound = true;
  const sync = () => {
    document.querySelectorAll('video.sc-owl-prog-vid').forEach(applyVideoTheme);
  };
  const mo = new MutationObserver(sync);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('storage', (e) => {
    if (e && (e.key === 'wise-theme' || e.key === 'chat-theme')) sync();
  });
}

let observing = false;
/**
 * Watch a transcript (or document) and mount strips as replies stream in.
 * Safe to call multiple times.
 */
export function observeOwlProgression(scope) {
  injectStyles();
  bindThemeWatcher();
  mountOwlProgressionCarousels(scope || document);
  if (observing || typeof MutationObserver === 'undefined') return;
  observing = true;
  /* Only look when an element actually arrived, so streaming a reply does not
     re-scan the whole document on every text node. */
  const mo = new MutationObserver((records) => {
    for (const r of records) {
      for (const node of r.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.('.sc-owl-prog') || node.querySelector?.('.sc-owl-prog')) {
          mountOwlProgressionCarousels(document);
          return;
        }
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
}

if (typeof window !== 'undefined') {
  window.WiseOwlProgression = {
    html: owlProgressionCarouselHtml,
    mount: mountOwlProgressionCarousels,
    observe: observeOwlProgression,
    slides: owlProgressionSlides,
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => observeOwlProgression(document), { once: true });
  } else {
    observeOwlProgression(document);
  }
}
