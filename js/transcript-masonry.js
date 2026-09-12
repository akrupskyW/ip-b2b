/* =============================================================================
   transcript-masonry.js — edge-to-edge galleries inside a chat transcript.

   Two layouts, one component. The masonry grid puts every piece on screen at
   once, packed at its own aspect ratio; the card rail is one scrolling row for
   a set that is all the same shape, where packing would only add ragged edges.
   Both run from one edge of the chat module to the other, and both open the
   same viewer: tap a tile and that piece fills the shared modal, with the rest
   of the set on the arrows either side of it.

   One shared definition. A host supplies items and drops the markup into a
   reply; auto-mount wires the packing, the scrolling and the viewer.

     masonryGridHtml({ id, label, caption, items })
     cardRailHtml({ id, label, caption, items, aspect })
     items: [{ src, thumb, w, h, title, meta }]
   ========================================================================== */

import { esc } from './escape-html.js';
import { openModal, modalHTML } from './wise-modal.js';

const STYLE_ID = 'wise-transcript-masonry-styles';
const DETAIL_ID = 'wise-masonry-detail';

/* Row unit + gutter the packing math runs on. Kept in one place because the
   CSS declares them and the JS measures against them. */
const ROW_PX = 6;
const GAP_PX = 10;

/* One tile, shared by both layouts. The rail leaves the caption off: a set of
   cards carries its own names in the artwork, and a line of prose under every
   one of twelve identical shapes is noise. */
function tileHtml(it, i, label, ar, withCap) {
  const alt = it.title ? `${it.title}${it.meta ? ` — ${it.meta}` : ''}` : label;
  return (
    `<button type="button" class="sc-mgrid-item" data-mgrid-i="${i}"`
    + ` data-mgrid-full="${esc(it.src)}"`
    + ` data-mgrid-title="${esc(it.title || '')}"`
    + ` data-mgrid-meta="${esc(it.meta || '')}"`
    + ` style="--mgrid-ar: ${ar.toFixed(4)}"`
    + ` aria-label="Open ${esc(it.title || label)} full size">`
    + `<span class="sc-mgrid-frame">`
    + `<img class="sc-mgrid-img" src="${esc(it.thumb || it.src)}" alt="${esc(alt)}"`
    + ` width="${esc(it.w || 1200)}" height="${esc(it.h || 800)}" loading="lazy" decoding="async" draggable="false">`
    + `<span class="sc-mgrid-open material-symbols-outlined" aria-hidden="true">open_in_full</span>`
    + `</span>`
    + (withCap
      ? `<span class="sc-mgrid-cap">`
        + `<span class="sc-mgrid-cap-title">${esc(it.title || '')}</span>`
        + (it.meta ? `<span class="sc-mgrid-cap-meta">${esc(it.meta)}</span>` : '')
        + `</span>`
      : '')
    + `</button>`
  );
}

/** Markup for one grid. `items` may be any mix of portrait and landscape. */
export function masonryGridHtml(opts) {
  const o = opts || {};
  const id = o.id || `mgrid-${Math.random().toString(36).slice(2, 9)}`;
  const label = o.label || 'Gallery';
  const items = Array.isArray(o.items) ? o.items : [];
  const tiles = items.map((it, i) => (
    tileHtml(it, i, label, it.w && it.h ? (it.w / it.h) : 1.5, true)
  )).join('');
  return (
    `<figure class="sc-mgrid" data-mgrid="${esc(id)}" data-mgrid-label="${esc(label)}" role="region" aria-label="${esc(label)}">`
    + `<div class="sc-mgrid-grid" data-mgrid-grid>${tiles}</div>`
    + (o.caption ? `<figcaption class="sc-mgrid-figcap">${esc(o.caption)}</figcaption>` : '')
    + `</figure>`
  );
}

/**
 * Markup for one rail: a scrolling row of same-shape tiles with a chevron
 * either side of the caption. `aspect` is the shape they all share (default
 * 2:3); a set with mixed shapes belongs in the grid instead.
 */
export function cardRailHtml(opts) {
  const o = opts || {};
  const id = o.id || `mrail-${Math.random().toString(36).slice(2, 9)}`;
  const label = o.label || 'Gallery';
  const items = Array.isArray(o.items) ? o.items : [];
  const ar = typeof o.aspect === 'number' && o.aspect > 0 ? o.aspect : (2 / 3);
  const tiles = items.map((it, i) => tileHtml(it, i, label, ar, false)).join('');
  const nav = (dir, icon, lab) => (
    `<button type="button" class="sc-mgrid-step" data-mgrid-scroll="${dir}" aria-label="${lab}">`
    + `<span class="material-symbols-outlined" aria-hidden="true">${icon}</span>`
    + `</button>`
  );
  return (
    `<figure class="sc-mgrid sc-mgrid--rail" data-mgrid="${esc(id)}" data-mgrid-label="${esc(label)}"`
    + ` role="region" aria-roledescription="carousel" aria-label="${esc(label)}">`
    + `<div class="sc-mgrid-railvp" data-mgrid-railvp>`
    + `<div class="sc-mgrid-rail" data-mgrid-rail>${tiles}</div>`
    + `</div>`
    + `<div class="sc-mgrid-chrome">`
    + nav(-1, 'chevron_left', 'Scroll previous')
    + (o.caption ? `<figcaption class="sc-mgrid-figcap">${esc(o.caption)}</figcaption>` : '')
    + nav(1, 'chevron_right', 'Scroll next')
    + `</div>`
    + `</figure>`
  );
}

/* Write the stylesheet exactly once — rewriting it would feed the document
   observer below its own mutation. */
function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  document.head.appendChild(style);
  style.textContent = `
/* Edge-to-edge of the chat MODULE: cancel the avatar column and the messages
   area's own padding. Same formula the sent-ask wash and the output rails read,
   with the FLOOR taken from --sc-pad-floor rather than restated, so compact
   spacing cannot move one and not the other. */
.sc-line-body > .sc-mgrid {
  --mgrid-pad: var(--sc-gutter, max(var(--sc-pad-floor, 3rem), calc((100cqi - var(--sc-transcript-max, 860px)) / 2)));
  box-sizing: border-box;
  max-width: none;
  margin: 1em 0 0.35em;
  margin-left: calc(-1 * (var(--sc-avatar-size, 30px) + 12px + var(--mgrid-pad)));
  margin-right: calc(-1 * var(--mgrid-pad));
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text);
}
/* Column floor is a length OR a share of the grid, whichever is smaller: a wide
   chat gets ~250px columns so a finished piece reads as artwork, and a
   single-width chat still gets two columns instead of one tall stack.
   Dense flow lets a short piece backfill the hole a portrait one left beside
   it — without it the packing leaves half-empty rows down the set. */
.sc-mgrid-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(240px, 46%), 1fr));
  grid-auto-rows: ${ROW_PX}px;
  grid-auto-flow: row dense;
  gap: ${GAP_PX}px;
  align-items: start;
}
/* The rail scrolls edge to edge, but the row it holds starts on the prose
   column — same inline padding the owl strip uses, so a carousel reads as
   anchored to the text and still runs off both sides of the module. */
/* No scroll snapping and no CSS smooth scrolling, both deliberately. A snap
   container re-snaps to the card it last landed on after any layout change,
   and once the viewer has been opened over the thread the browser drops
   programmatic smooth scrolls on this box entirely — either one silently
   undoes the chevron. The chevron animates itself and steps by exactly one
   card, so the stops stay aligned without the snap engine. */
.sc-mgrid-railvp {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  padding-inline: var(--mgrid-pad, 3rem);
  scroll-padding-inline: var(--mgrid-pad, 3rem);
}
.sc-mgrid-rail {
  display: flex;
  align-items: flex-start;
  gap: ${GAP_PX}px;
  width: max-content;
  min-width: 100%;
}
.sc-mgrid-rail > .sc-mgrid-item {
  flex: 0 0 auto;
  width: var(--mgrid-card-w, 196px);
}
.sc-mgrid-chrome {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 12px 0;
}
.sc-mgrid-chrome .sc-mgrid-figcap { margin: 0; text-align: center; }
.sc-mgrid-step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}
.sc-mgrid-step:hover {
  color: var(--text);
  background: color-mix(in srgb, var(--text) 8%, transparent);
}
.sc-mgrid-step .material-symbols-outlined { font-size: 22px !important; }
.sc-mgrid-item {
  /* Plausible height before the packing pass measures — a tile that paints at
     one row tall would stack the set on top of itself for a frame. */
  grid-row-end: span 34;
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  font-family: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.sc-mgrid-frame {
  position: relative;
  display: block;
  overflow: hidden;
  border-radius: 12px;
  background: color-mix(in srgb, var(--text) 8%, transparent);
}
.sc-mgrid-img {
  display: block;
  width: 100%;
  aspect-ratio: var(--mgrid-ar, 1.5);
  height: auto;
  object-fit: cover;
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.sc-mgrid-item:hover .sc-mgrid-img { transform: scale(1.03); }
.sc-mgrid-open {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 20px !important;
  color: #fff;
  opacity: 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.55);
  transition: opacity 0.15s ease;
  pointer-events: none;
}
.sc-mgrid-item:hover .sc-mgrid-open,
.sc-mgrid-item:focus-visible .sc-mgrid-open { opacity: 1; }
.sc-mgrid-item:focus-visible { outline: none; }
.sc-mgrid-item:focus-visible .sc-mgrid-frame {
  outline: 2px solid var(--primary, #1d4ed8);
  outline-offset: 3px;
}
.sc-mgrid-cap { display: flex; flex-direction: column; gap: 1px; padding: 0 2px; }
.sc-mgrid-cap-title {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--text);
}
.sc-mgrid-cap-meta {
  font-size: 11px;
  line-height: 1.35;
  color: var(--text-muted);
}
/* The pictures bleed; the caption is prose, so it lines up with the paragraph
   above it rather than starting at the module edge. */
.sc-mgrid-figcap {
  margin: 12px 2px 0;
  font-size: 0.78em;
  line-height: 1.45;
  color: var(--text-muted);
}
.sc-line-body > .sc-mgrid > .sc-mgrid-figcap {
  margin-left: calc(var(--sc-avatar-size, 30px) + 12px + var(--mgrid-pad));
}

/* ── The viewer: one piece at full size, the set on the arrows ── */
.wise-modal-scrim--panel.sc-mgrid-scrim .wise-modal.sc-mgrid-modal {
  width: min(1120px, calc(100vw - 40px));
  max-width: min(1120px, calc(100vw - 40px));
}
/* A deck of portraits does not need a landscape frame around it. Only a rail
   gets this: every tile there is the same shape, so the panel cannot end up
   the wrong size for the next piece on the arrows. */
.wise-modal-scrim--panel.sc-mgrid-scrim--tall .wise-modal.sc-mgrid-modal {
  width: min(660px, calc(100vw - 40px));
  max-width: min(660px, calc(100vw - 40px));
}
.sc-mgrid-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}
.sc-mgrid-full {
  display: block;
  width: auto;
  max-width: 100%;
  max-height: min(68vh, 760px);
  object-fit: contain;
  border-radius: 12px;
  background: color-mix(in srgb, var(--text) 8%, transparent);
}
.sc-mgrid-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgba(12, 16, 28, 0.55);
  color: #fff;
  cursor: pointer;
  backdrop-filter: blur(6px);
}
.sc-mgrid-nav:hover { background: rgba(12, 16, 28, 0.78); }
.sc-mgrid-nav:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
.sc-mgrid-nav .material-symbols-outlined { font-size: 24px !important; }
.sc-mgrid-nav--prev { left: 10px; }
.sc-mgrid-nav--next { right: 10px; }
@media (prefers-reduced-motion: reduce) {
  .sc-mgrid-img { transition: none; }
  .sc-mgrid-item:hover .sc-mgrid-img { transform: none; }
}
`;
}

/* ── Packing ───────────────────────────────────────────────────────────────
   Each tile is left at its natural height (align-items: start) and told how
   many 6px rows to reserve. Measuring first and writing second keeps the
   browser to one layout pass per resize instead of one per tile. */
function packGrid(grid) {
  if (!grid) return;
  const tiles = Array.from(grid.querySelectorAll('.sc-mgrid-item'));
  if (!tiles.length) return;
  const cs = getComputedStyle(grid);
  const row = parseFloat(cs.gridAutoRows) || ROW_PX;
  const gap = parseFloat(cs.rowGap) || GAP_PX;
  const heights = tiles.map((t) => t.getBoundingClientRect().height);
  tiles.forEach((t, i) => {
    const h = heights[i];
    if (!h) return;
    const span = Math.max(1, Math.ceil((h + gap) / (row + gap)));
    t.style.gridRowEnd = `span ${span}`;
  });
}

function packRoot(root) {
  packGrid(root && root.querySelector('[data-mgrid-grid]'));
}

/* ── The viewer ────────────────────────────────────────────────────────── */

function itemsOf(root) {
  return Array.from(root.querySelectorAll('.sc-mgrid-item')).map((t) => ({
    full: t.getAttribute('data-mgrid-full') || '',
    title: t.getAttribute('data-mgrid-title') || '',
    meta: t.getAttribute('data-mgrid-meta') || '',
  }));
}

/**
 * Open one tile full size. The rest of that gallery rides along — grid or
 * rail — so the arrows and the left / right keys move through the set
 * without reopening.
 */
export function openMasonryItem(tile) {
  if (!tile) return null;
  const root = tile.closest('.sc-mgrid');
  if (!root) return null;
  const set = itemsOf(root);
  if (!set.length) return null;
  const label = root.getAttribute('data-mgrid-label') || 'Gallery';
  let at = parseInt(tile.getAttribute('data-mgrid-i'), 10) || 0;
  if (at < 0 || at >= set.length) at = 0;

  let scrimEl = null;
  const paint = () => {
    if (!scrimEl) return;
    const it = set[at];
    const eyebrow = scrimEl.querySelector('.wise-modal-eyebrow');
    const title = scrimEl.querySelector('.wise-modal-title');
    const sub = scrimEl.querySelector('.wise-modal-sub');
    const img = scrimEl.querySelector('.sc-mgrid-full');
    if (eyebrow) eyebrow.textContent = `${label} · ${at + 1} of ${set.length}`;
    if (title) title.textContent = it.title;
    if (sub) sub.textContent = it.meta;
    if (img) {
      img.src = it.full;
      img.alt = it.meta ? `${it.title} — ${it.meta}` : it.title;
    }
  };
  const step = (dir) => {
    if (set.length < 2) return;
    at = (at + dir + set.length) % set.length;
    paint();
  };

  const first = set[at];
  const multi = set.length > 1;
  /* Capture phase, and the event stops here: a rail behind the viewer listens
     for the same keys, and both acting on one press would scroll the thread
     under the piece the member is looking at. */
  const onKey = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    e.stopPropagation();
    step(e.key === 'ArrowLeft' ? -1 : 1);
  };

  let ar = 0;
  try { ar = parseFloat(getComputedStyle(tile).getPropertyValue('--mgrid-ar')) || 0; }
  catch (_) { /* fall back to the wide panel */ }
  const tall = ar > 0 && ar < 0.85 && root.classList.contains('sc-mgrid--rail');

  const opened = openModal({
    id: DETAIL_ID,
    panel: true,
    extraScrimClass: `sc-mgrid-scrim${tall ? ' sc-mgrid-scrim--tall' : ''}`,
    html: modalHTML({
      eyebrow: `${esc(label)} · ${at + 1} of ${set.length}`,
      title: esc(first.title),
      titleId: 'wise-masonry-detail-title',
      sub: esc(first.meta),
      modalClass: 'sc-mgrid-modal',
      body:
        '<div class="sc-mgrid-stage">'
        + (multi
          ? '<button type="button" class="sc-mgrid-nav sc-mgrid-nav--prev" data-mgrid-step="-1" aria-label="Previous piece">'
            + '<span class="material-symbols-outlined" aria-hidden="true">chevron_left</span></button>'
          : '')
        + `<img class="sc-mgrid-full" src="${esc(first.full)}" alt="${esc(first.meta ? `${first.title} — ${first.meta}` : first.title)}">`
        + (multi
          ? '<button type="button" class="sc-mgrid-nav sc-mgrid-nav--next" data-mgrid-step="1" aria-label="Next piece">'
            + '<span class="material-symbols-outlined" aria-hidden="true">chevron_right</span></button>'
          : '')
        + '</div>',
    }),
    onOpen(scrim) {
      scrimEl = scrim;
      const close = scrim.querySelector('.wise-modal-close');
      if (close) close.focus();
      scrim.addEventListener('click', (e) => {
        const nav = e.target.closest && e.target.closest('[data-mgrid-step]');
        if (!nav) return;
        e.preventDefault();
        step(parseInt(nav.getAttribute('data-mgrid-step'), 10) || 1);
      });
      document.addEventListener('keydown', onKey, true);
    },
    onClose() {
      document.removeEventListener('keydown', onKey, true);
      scrimEl = null;
    },
  });
  return opened;
}

/* ── Mount ─────────────────────────────────────────────────────────────── */

/* Every write is instant; the easing is ours. See the stylesheet for why the
   browser's own smooth scroll cannot be trusted on this box. */
function glideTo(vp, to) {
  const max = Math.max(0, vp.scrollWidth - vp.clientWidth);
  const end = Math.min(max, Math.max(0, to));
  const from = vp.scrollLeft;
  if (Math.abs(end - from) < 1) return;
  const token = (vp.__mgridGlide || 0) + 1;
  vp.__mgridGlide = token;
  let reduced = false;
  try { reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  catch (_) { /* treat as motion allowed */ }
  if (reduced) {
    vp.scrollTo({ left: end, behavior: 'instant' });
    return;
  }
  const t0 = performance.now();
  const tick = (now) => {
    if (vp.__mgridGlide !== token) return;
    const p = Math.min(1, (now - t0) / 320);
    const e = p < 0.5 ? 2 * p * p : 1 - ((2 - 2 * p) * (2 - 2 * p)) / 2;
    vp.scrollTo({ left: from + (end - from) * e, behavior: 'instant' });
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* One card plus its gutter — the step a chevron or an arrow key moves by. */
function scrollRail(root, dir) {
  const vp = root.querySelector('[data-mgrid-railvp]');
  const tile = root.querySelector('.sc-mgrid-rail > .sc-mgrid-item');
  if (!vp || !tile) return;
  const step = tile.getBoundingClientRect().width + GAP_PX;
  glideTo(vp, vp.scrollLeft + dir * step);
}

function mountRail(root) {
  root.addEventListener('click', (e) => {
    const nav = e.target.closest && e.target.closest('[data-mgrid-scroll]');
    if (!nav || !root.contains(nav)) return;
    scrollRail(root, parseInt(nav.getAttribute('data-mgrid-scroll'), 10) || 1);
  });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); scrollRail(root, -1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); scrollRail(root, 1); }
  });
  if (!root.hasAttribute('tabindex')) root.setAttribute('tabindex', '0');
}

function mountOne(root) {
  if (!root || root.dataset.mgridMounted === '1') return;
  root.dataset.mgridMounted = '1';
  injectStyles();

  root.addEventListener('click', (e) => {
    const tile = e.target.closest && e.target.closest('.sc-mgrid-item');
    if (tile && root.contains(tile)) openMasonryItem(tile);
  });

  if (root.querySelector('[data-mgrid-rail]')) {
    mountRail(root);
    return;
  }

  /* Repack when the chat changes width (module width toggle, pane docking,
     window resize) and once each image has decoded, in case a caption wrapped
     differently than the first measurement. */
  packRoot(root);
  requestAnimationFrame(() => packRoot(root));
  root.querySelectorAll('.sc-mgrid-img').forEach((img) => {
    if (img.complete) return;
    img.addEventListener('load', () => packRoot(root), { once: true });
  });
  const grid = root.querySelector('[data-mgrid-grid]');
  if (grid && typeof ResizeObserver !== 'undefined') {
    /* Width only: writing the spans changes the grid's HEIGHT, and repacking on
       that would feed the observer its own result. */
    let lastW = 0;
    const ro = new ResizeObserver(() => {
      const w = Math.round(grid.getBoundingClientRect().width);
      if (w === lastW) return;
      lastW = w;
      packGrid(grid);
    });
    ro.observe(grid);
  } else if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => packRoot(root));
  }
}

/** Mount every unmounted gallery under `scope` (default: document). */
export function mountMasonryGrids(scope) {
  injectStyles();
  const root = scope && scope.querySelectorAll ? scope : document;
  root.querySelectorAll('.sc-mgrid:not([data-mgrid-mounted="1"])').forEach(mountOne);
}

let observing = false;
/** Watch a transcript (or document) and mount grids as replies stream in. */
export function observeMasonryGrids(scope) {
  injectStyles();
  mountMasonryGrids(scope || document);
  if (observing || typeof MutationObserver === 'undefined') return;
  observing = true;
  const mo = new MutationObserver((records) => {
    for (const r of records) {
      for (const node of r.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.('.sc-mgrid') || node.querySelector?.('.sc-mgrid')) {
          mountMasonryGrids(document);
          return;
        }
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
}

if (typeof window !== 'undefined') {
  window.WiseTranscriptMasonry = {
    html: masonryGridHtml,
    railHtml: cardRailHtml,
    mount: mountMasonryGrids,
    observe: observeMasonryGrids,
    pack: packRoot,
    openItem: openMasonryItem,
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => observeMasonryGrids(document), { once: true });
  } else {
    observeMasonryGrids(document);
  }
}
