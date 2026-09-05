/**
 * Analytics palette — the floating, draggable control card for the chart
 * gallery on pages/analytics-types.html.
 *
 * One card holds everything that steers the report:
 *   • Filter — narrows the jump list to whatever the member types. The list is
 *     the entire catalog, so it is long enough that scanning it is slower than
 *     typing; the field is pinned under the head so it never scrolls away.
 *   • Chart size — Mobile / Tablet / Laptop / Desktop presets, one per screen
 *     class, each captioned with the display widths it stands for.
 *     Each one narrows the whole report container to that device's width, so
 *     every chart reflows the way it would on that screen instead of merely
 *     shrinking inside a full-width card. The charts are replayed afterwards
 *     so the entrance animation and its count-ups run again at the new size.
 *     The preset matching the current display width is selected on load; a
 *     member can still switch in-session, but the next load re-derives from
 *     the screen rather than restoring the last toggle.
 *   • Skinny bars — the slim WISEscore health-bar mode.
 *   • Jump to — every chart and section from the shared catalog, with a
 *     scrollspy that lights up whatever is currently in view.
 *
 * It drags by its head the same way the Helix card does (grabber pill, drag
 * handle, clamped to the viewport, seat remembered), and collapses to a single
 * launcher button so it never crowds the report.
 *
 * This module owns its own markup, behavior, and stylesheet. Nothing here is
 * restated in the page.
 */

import { ANALYTICS_NAV } from './analytics-types-catalog.js';

const STYLE_ID = 'azp-styles';
const MENU_OPEN_ID = 'azp-menu-open';
const MENU_SKINNY_ID = 'azp-menu-skinny';
const SKINNY_KEY = 'az-skinny-bars';
const OPEN_KEY = 'az-palette-open';
const POS_KEY = 'az-palette-pos';

/* Below this width the report has no room to spare, so the palette starts
   collapsed to its launcher until the member opens it. */
const WIDE_AT = 1180;
const EDGE = 16;
/* The right edge at mid-height already belongs to the rollout-mode pill and the
   feedback FAB, both of which outrank this card. Take the default seat clear of
   that lane — the same inset the shared feedback panel uses for the same
   reason. A drag can still put the card anywhere. */
const RIGHT_LANE = 74;
const DRAG_THRESHOLD = 4;

/* One preset per screen class, smallest → largest.

   `minW` is the preset's minimum display width in CSS px; the report opens at
   the last preset the current screen clears. `frame` is the width the report
   container is held to while the preset is on — a real device content width,
   so the charts reflow exactly as they would on that screen. Tablet is the
   portrait width of a 10.9" iPad, which is why it sits between the phone
   column and the laptop. Desktop has no frame: it fills whatever the report
   pane gives it.

   `range` is the caption printed under the label — the span of display widths
   the preset stands for, so a member can see which one matches the screen in
   front of them. Keep it in step with `minW`.

   Ids are single letters and the applied CSS (`body[data-az-chart-size]`) is
   keyed off them, so an id is not free to change. */
const SIZES = [
  { id: 's', label: 'Mobile',  minW: 0,    frame: 380,  range: '320–767',   hint: 'Hold the report to a phone-width column (380px)' },
  { id: 't', label: 'Tablet',  minW: 768,  frame: 820,  range: '768–1023',  hint: 'Hold the report to a tablet in portrait (820px)' },
  { id: 'm', label: 'Laptop',  minW: 1024, frame: 1280, range: '1024–1919', hint: 'Hold the report to a laptop width (1280px)' },
  { id: 'l', label: 'Desktop', minW: 1920, frame: 0,    range: '1920+',     hint: 'Let the report fill the full pane width' },
];

/* The printed range is set with an en dash and a bare "+", which a screen
   reader either skips or reads as punctuation. Say it in words instead. */
const spokenRange = (s) => (/\+$/.test(s.range)
  ? s.range.replace('+', '') + ' pixels wide and up'
  : s.range.replace('–', ' to ') + ' pixels wide');

/* The report container every chart lives in. Narrowing this is what makes a
   preset visible: `.dash` is a `container-type: inline-size` query container,
   so every multi-column grid, matrix, and donut row inside it re-lays itself
   against the framed width rather than the pane. */
const FRAME = '#agent-main-scroll .dash';

/* Chart stages that redraw on click, so a resize can be replayed through them
   rather than reaching into a dozen private players. */
const STAGES = ['.atx-stage', '.inf-chart', '.cf-chart', '.dash-scatter-plot', '.dash-radar'];

const reduceMotion = () =>
  !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/* Chart size follows the *display*, not the browser viewport — the same
   measurement the chat-width default uses, so a given machine always opens
   the report at the same preset. `js/text-size-fouc.js` publishes the shared
   measurer; fall back to screen.width, then innerWidth, if it is absent. */
const screenWidthPx = () =>
  (typeof window.WISE_CHAT_SCREEN_WIDTH_PX === 'function')
    ? window.WISE_CHAT_SCREEN_WIDTH_PX()
    : (((window.screen && +window.screen.width) || window.innerWidth || 0));

const read = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v == null ? fallback : v; }
  catch (_) { return fallback; }
};
const write = (key, value) => {
  try { localStorage.setItem(key, value); } catch (_) {}
};

const scroller = () => document.getElementById('agent-main-scroll');

/* ── Stylesheet ─────────────────────────────────────────────────────────── */

function injectCss() {
  if (document.getElementById(STYLE_ID)) return;
  const css = [
    /* Launcher — a solid primary circle, so its icon is the filled twin. */
    '.azp-launch{position:fixed;right:18px;bottom:18px;z-index:9001;',
      'display:inline-flex;align-items:center;justify-content:center;',
      'width:46px;height:46px;padding:0;border:0;border-radius:50%;',
      'background:var(--primary);color:#fff;cursor:pointer;',
      'box-shadow:0 8px 24px rgba(8,15,26,.28);',
      'transition:filter .15s ease,transform .15s ease;}',
    '.azp-launch .material-symbols-outlined{font-size:22px!important;line-height:1!important;',
      "font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;}",
    '.azp-launch:hover{filter:brightness(1.07);transform:translateY(-1px);}',
    '.azp-launch[hidden]{display:none;}',
    'html.dark .azp-launch{box-shadow:0 10px 28px rgba(0,0,0,.55);}',

    /* Card */
    '.azp{position:fixed;z-index:9000;box-sizing:border-box;',
      'display:flex;flex-direction:column;',
      'width:300px;max-width:calc(100vw - 32px);max-height:min(82vh,calc(100vh - 32px));',
      'background:var(--surface-2);border:1px solid var(--border-strong);',
      'border-radius:14px;box-shadow:var(--shadow-card);',
      'overflow:hidden;}',
    '.azp[hidden]{display:none;}',
    'html.dark .azp{background:#112633;border-color:rgba(255,255,255,.12);',
      'box-shadow:0 18px 44px rgba(0,0,0,.55);}',
    '.azp.is-dragging{user-select:none;}',

    /* Head — the drag surface */
    '.azp-head{flex:0 0 auto;display:flex;align-items:center;gap:6px;flex-wrap:wrap;',
      'padding:8px 8px 10px 10px;cursor:grab;user-select:none;touch-action:none;',
      'border-bottom:1px solid var(--border);background:var(--surface-2);}',
    'html.dark .azp-head{background:#112633;border-bottom-color:rgba(255,255,255,.1);}',
    '.azp.is-dragging .azp-head{cursor:grabbing;}',
    '.azp-grabber{flex:1 1 100%;display:flex;align-items:center;justify-content:center;',
      'height:12px;margin:0 0 4px;pointer-events:none;}',
    '.azp-grabber::before{content:"";width:44px;height:5px;border-radius:999px;',
      'background:var(--text-muted);opacity:.55;}',
    '.azp-drag{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;',
      'width:22px;height:22px;color:var(--text-muted);pointer-events:none;}',
    '.azp-drag .material-symbols-outlined{font-size:20px!important;line-height:1!important;}',
    '.azp-title{flex:1 1 auto;min-width:0;margin:0;',
      "font-family:'WISE Digits',var(--font-serif);",
      'font-size:1.05rem;font-weight:800;letter-spacing:-.01em;line-height:1.2;color:var(--text);',
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.azp-close{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;',
      'width:24px;height:24px;padding:0;border:0;border-radius:50%;',
      'background:transparent;color:var(--text-subtle);cursor:pointer;opacity:.78;',
      'transition:background .15s ease,color .15s ease,opacity .15s ease;}',
    '.azp-close .material-symbols-outlined{font-size:17px!important;line-height:1!important;}',
    '.azp-close:hover{opacity:1;color:var(--text);background:var(--surface-3);}',
    'html.dark .azp-close:hover{background:rgba(255,255,255,.08);}',

    /* Filter — outside the scrolling body on purpose, so it stays put while
       the member is deep in the list it filters. */
    '.azp-search{flex:0 0 auto;position:relative;padding:9px 10px;',
      'border-bottom:1px solid var(--border);background:var(--surface-2);}',
    'html.dark .azp-search{background:#112633;border-bottom-color:rgba(255,255,255,.1);}',
    '.azp-search-icon{position:absolute;left:20px;top:50%;transform:translateY(-50%);',
      'color:var(--text-subtle);pointer-events:none;}',
    '.azp-search-icon .material-symbols-outlined{font-size:17px!important;line-height:1!important;}',
    '.azp-input{box-sizing:border-box;display:block;width:100%;height:32px;',
      'padding:0 30px 0 32px;border:1px solid var(--border-strong);border-radius:999px;',
      'background:var(--surface);color:var(--text);',
      'font:inherit;font-size:12.5px;font-weight:600;}',
    'html.dark .azp-input{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.16);}',
    '.azp-input::placeholder{color:var(--text-subtle);font-weight:600;}',
    '.azp-input:focus{outline:none;border-color:var(--primary);',
      'box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 18%,transparent);}',
    /* WebKit's own clear affordance would sit on top of ours. */
    '.azp-input::-webkit-search-cancel-button,.azp-input::-webkit-search-decoration',
      '{-webkit-appearance:none;appearance:none;}',
    '.azp-clear{position:absolute;right:19px;top:50%;transform:translateY(-50%);',
      'display:none;align-items:center;justify-content:center;',
      'width:20px;height:20px;padding:0;border:0;border-radius:50%;',
      'background:var(--surface-3);color:var(--text-subtle);cursor:pointer;',
      'transition:color .12s ease;}',
    '.azp-clear .material-symbols-outlined{font-size:14px!important;line-height:1!important;}',
    '.azp-clear:hover{color:var(--text);}',
    '.azp-clear:focus-visible{outline:2px solid var(--primary);outline-offset:1px;}',
    'html.dark .azp-clear{background:rgba(255,255,255,.12);}',
    '.azp-search.has-q .azp-clear{display:inline-flex;}',

    /* Body */
    '.azp-body{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;',
      'padding:12px 10px 12px;scrollbar-width:thin;}',
    '.azp-group{margin:0 0 14px;}',
    '.azp-group:last-child{margin-bottom:0;}',
    '.azp-group-head{display:block;margin:0 2px 7px;font-size:.6875rem;font-weight:700;',
      'letter-spacing:.06em;text-transform:uppercase;color:var(--text-subtle);}',
    '.azp-group-head--row{display:flex;align-items:baseline;justify-content:space-between;gap:8px;}',
    '.azp-count{flex:0 0 auto;font-weight:600;letter-spacing:.02em;text-transform:none;',
      'opacity:.85;font-variant-numeric:tabular-nums;}',

    /* Size segmented control */
    '.azp-sizes{display:flex;gap:3px;padding:3px;border-radius:999px;',
      'background:var(--surface-3);}',
    'html.dark .azp-sizes{background:rgba(255,255,255,.06);}',
    '.azp-size{flex:1 1 0;min-width:0;display:flex;flex-direction:column;',
      'align-items:center;justify-content:center;gap:1px;',
      'padding:4px 3px 5px;border:0;border-radius:999px;',
      'background:transparent;color:var(--text-muted);cursor:pointer;',
      'font:inherit;font-size:11.5px;font-weight:700;line-height:1.15;white-space:nowrap;',
      'transition:background .14s ease,color .14s ease;}',
    /* The width span the preset stands for, kept small enough that four
       presets still fit one row of the card. The page's 12px floor exempts
       the palette so this stays a caption rather than a second label. */
    '.azp-size-range{font-size:9px;font-weight:600;letter-spacing:.01em;opacity:.7;',
      'font-variant-numeric:tabular-nums;}',
    '.azp-size:hover{color:var(--text);}',
    '.azp-size[aria-pressed="true"]{background:var(--primary);color:#fff;font-weight:800;}',
    '.azp-size[aria-pressed="true"] .azp-size-range{opacity:.85;font-weight:700;}',
    '.azp-size:focus-visible{outline:2px solid var(--primary);outline-offset:2px;}',

    /* Skinny-bar switch */
    '.azp{--azp-pink:#ec4899;}',
    '.azp-switch{display:flex;align-items:center;gap:8px;width:100%;padding:6px 6px;',
      'border:0;border-radius:9px;background:none;color:var(--text-muted);cursor:pointer;',
      'font:inherit;font-size:12.5px;font-weight:600;text-align:left;',
      'transition:background .12s ease,color .12s ease;}',
    '.azp-switch:hover,.azp-switch:focus-visible{color:var(--text);outline:none;',
      'background:color-mix(in srgb,var(--azp-pink) 12%,transparent);}',
    '.azp-switch-label{flex:1 1 auto;min-width:0;}',
    '.azp-track{flex:none;position:relative;width:26px;height:15px;border-radius:999px;',
      'background:var(--border);transition:background .16s ease;}',
    'html.dark .azp-track{background:rgba(255,255,255,.22);}',
    '.azp-dot{position:absolute;top:2px;left:2px;width:11px;height:11px;border-radius:50%;',
      'background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.3);transition:transform .16s ease;}',
    '.azp-switch[aria-checked="true"]{color:var(--azp-pink);font-weight:800;}',
    '.azp-switch[aria-checked="true"] .azp-track{background:var(--azp-pink);}',
    '.azp-switch[aria-checked="true"] .azp-dot{transform:translateX(11px);}',

    /* Jump list */
    '.azp-list{display:flex;flex-direction:column;gap:1px;}',
    /* A filtered-out row is display:flex, which outranks the hidden attribute. */
    '.azp-item[hidden]{display:none;}',
    '.azp-empty{margin:2px 6px 0;font-size:12px;line-height:1.45;color:var(--text-subtle);}',
    '.azp-item{display:flex;align-items:center;gap:8px;width:100%;padding:5px 6px;',
      'border:0;border-radius:9px;background:none;color:var(--text-muted);cursor:pointer;',
      'font:inherit;font-size:12.5px;font-weight:600;line-height:1.25;text-align:left;',
      'transition:background .12s ease,color .12s ease;}',
    '.azp-item-icon{flex:0 0 auto;color:var(--text-subtle);}',
    '.azp-item .material-symbols-outlined{font-size:17px!important;line-height:1!important;}',
    '.azp-item-label{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.azp-tick{flex:0 0 auto;width:3px;height:14px;border-radius:2px;background:transparent;',
      'transition:background .14s ease;}',
    '.azp-item:hover,.azp-item:focus-visible{outline:none;color:var(--text);',
      'background:color-mix(in srgb,var(--primary) 10%,transparent);}',
    '.azp-item:hover .azp-item-icon,.azp-item:focus-visible .azp-item-icon{color:var(--text);}',
    '.azp-item.is-active{color:var(--text);font-weight:800;}',
    '.azp-item.is-active .azp-item-icon{color:var(--primary);}',
    'html.dark .azp-item.is-active .azp-item-icon{color:var(--primary-bright,var(--primary));}',
    '.azp-item.is-active .azp-tick{background:var(--primary);}',
    'html.dark .azp-item.is-active .azp-tick{background:var(--primary-bright,var(--primary));}',

    /* Chart size — the report container is held to the preset's device width
       and centred in the pane, so the charts inside reflow to it. */
    SIZES.filter((s) => s.frame)
      .map((s) => 'body[data-az-chart-size="' + s.id + '"]{--az-frame:' + s.frame + 'px;}')
      .join(''),
    'body[data-az-chart-size] ' + FRAME + '{max-width:var(--az-frame,none);',
      'margin-left:auto;margin-right:auto;transition:max-width .26s ease;}',

    /* Paper always gets the full desktop report — the page's own print rules
       lay it out at a small-desktop width on purpose, so a phone-width frame
       must not follow the member into the export. */
    '@media print{.azp,.azp-launch{display:none!important;}',
      FRAME + '{max-width:none!important;}}',
    '@media (prefers-reduced-motion:reduce){',
      '.azp-launch,.azp-close,.azp-size,.azp-switch,.azp-track,.azp-dot,',
      '.azp-item,.azp-tick{transition:none;}',
      'body[data-az-chart-size] ' + FRAME + '{transition:none;}}',
  ].join('');
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);
}

/* ── Chart size ─────────────────────────────────────────────────────────── */

/* The preset for the current display: the largest one whose minimum width the
   screen clears. Laptop-class screens (a 14" MacBook is 1512 CSS px) land on
   Laptop; only a wide desktop reaches Desktop. */
function defaultSizeForScreen() {
  const w = screenWidthPx();
  let id = SIZES[0].id;
  for (const s of SIZES) { if (w >= s.minW) id = s.id; }
  return id;
}

function applySize(size) {
  if (document.body) document.body.setAttribute('data-az-chart-size', size);
}

/* A resized chart has to draw itself again, or it keeps the sweep and the
   count-up totals it settled on at the old size. Every one of these surfaces
   already replays on click, so hand each visible one a click rather than
   reaching into a dozen private players. Off-screen charts replay on their own
   when they scroll back in. */
function replayVisibleCharts() {
  const sc = scroller();
  if (!sc) return;
  const box = sc.getBoundingClientRect();
  const stages = sc.querySelectorAll(STAGES.join(','));
  stages.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.bottom < box.top - 40 || r.top > box.bottom + 40) return;
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

/* ── Skinny bars ────────────────────────────────────────────────────────── */

/* The chunky WISEscore bars keep their score inside the fill, which has
   nowhere to go once the track is slim — so lift a copy of the value into the
   row's head. Read it off the count-up's target so it is right whether or not
   the animation has finished. */
function enhanceBars() {
  const sc = scroller();
  const root = (sc && sc.querySelector('.dash')) || document.body;
  if (!root) return;
  root.querySelectorAll('.dash-ws-health-bar').forEach((bar) => {
    if (bar.dataset.azScore) return;
    const num = bar.querySelector('.dash-ws-health-num');
    if (!num) return;
    bar.dataset.azScore = '1';
    const to = num.getAttribute('data-count-to') || (num.textContent || '').trim();
    let suffix = num.getAttribute('data-count-suffix') || '';
    if (!suffix && num.closest('.dash-pct-wrap')) suffix = '%';
    const chip = document.createElement('span');
    chip.className = 'az-score-chip';
    chip.textContent = to + suffix;
    const fill = bar.querySelector('.dash-ws-health-fill');
    if (fill && fill.style.background) chip.style.color = fill.style.background;
    const head = bar.previousElementSibling;
    if (head && head.nodeType === 1 && /-bar-head\b/.test(head.className || '')) {
      head.appendChild(chip);
    } else {
      chip.classList.add('az-score-chip--overlay');
      bar.appendChild(chip);
    }
  });
}

function applySkinny(on) {
  if (document.body) document.body.classList.toggle('az-skinny-bars', on);
  write(SKINNY_KEY, on ? '1' : '0');
}

/* ── Seat ───────────────────────────────────────────────────────────────── */

function clamp(card, left, top) {
  const w = card.offsetWidth || 300;
  const h = card.offsetHeight || 320;
  const maxL = Math.max(EDGE, window.innerWidth - w - EDGE);
  const maxT = Math.max(EDGE, window.innerHeight - h - EDGE);
  card.style.left = Math.round(Math.min(Math.max(left, EDGE), maxL)) + 'px';
  card.style.top = Math.round(Math.min(Math.max(top, EDGE), maxT)) + 'px';
}

function defaultSeat(card) {
  const w = card.offsetWidth || 300;
  const h = card.offsetHeight || 320;
  return {
    left: window.innerWidth - w - RIGHT_LANE,
    top: Math.max(EDGE, window.innerHeight - h - 76),
  };
}

function seat(card) {
  let pos = null;
  try { pos = JSON.parse(read(POS_KEY, 'null')); } catch (_) { pos = null; }
  const at = (pos && Number.isFinite(pos.left) && Number.isFinite(pos.top))
    ? pos
    : defaultSeat(card);
  clamp(card, at.left, at.top);
}

/* The jump list is filled in after the report renders, so the card is short
   when it first takes its seat and tall once every section has landed. Re-clamp
   as it grows, or a bottom-anchored seat ends up hanging off the screen. The
   correction is never persisted — only a drag writes a seat. */
function wireReclamp(card) {
  if (typeof ResizeObserver !== 'function') return;
  const ro = new ResizeObserver(() => {
    if (card.hidden || card.classList.contains('is-dragging')) return;
    clamp(card, parseFloat(card.style.left) || EDGE, parseFloat(card.style.top) || EDGE);
  });
  ro.observe(card);
}

function wireDrag(card) {
  card.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button !== 0) return;
    const head = e.target.closest && e.target.closest('.azp-head');
    if (!head || !card.contains(head)) return;
    if (e.target.closest('button, input, a')) return;
    e.preventDefault();
    const r = card.getBoundingClientRect();
    const dx = e.clientX - r.left;
    const dy = e.clientY - r.top;
    let live = false;
    const onMove = (ev) => {
      if (!live) {
        if (Math.abs(ev.clientX - e.clientX) + Math.abs(ev.clientY - e.clientY) < DRAG_THRESHOLD) return;
        live = true;
        card.classList.add('is-dragging');
      }
      clamp(card, ev.clientX - dx, ev.clientY - dy);
    };
    const onUp = () => {
      card.classList.remove('is-dragging');
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerup', onUp, true);
      document.removeEventListener('pointercancel', onUp, true);
      if (live) {
        write(POS_KEY, JSON.stringify({
          left: parseFloat(card.style.left) || 0,
          top: parseFloat(card.style.top) || 0,
        }));
      }
    };
    document.addEventListener('pointermove', onMove, true);
    document.addEventListener('pointerup', onUp, true);
    document.addEventListener('pointercancel', onUp, true);
  });
}

/* ── Rows in the report module's ⋯ menu ─────────────────────────────────── */

/* Closing the palette leaves a 46px launcher in the corner of a page that is
   already the busiest in the app — easy to lose, and the only way back. The
   report module's three-dot is where a member looks for a control they have put
   away, so this module hangs its own two switches there: the palette itself and
   the skinny-bar mode. Injected into the shared menu (the same way the chat dock
   adds its History row) rather than restated in the page. */
function menuRowHTML(id, icon, label, on) {
  return '<button type="button" class="topbar-menu-item topbar-menu-item--toggle"' +
    ' id="' + id + '" role="switch" aria-checked="' + (on ? 'true' : 'false') + '">' +
      '<span class="material-symbols-outlined topbar-menu-icon">' + icon + '</span>' +
      '<span>' + label + '</span>' +
      '<span class="topbar-menu-switch" aria-hidden="true">' +
        '<span class="topbar-menu-switch-thumb"></span></span>' +
    '</button>';
}

/* Neither row carries a `data-action`, so the menu's shared click handler steps
   over both — which is what keeps the popover open while a member flips them,
   the same as the other switch rows in it. */
function mountMenuRows(api) {
  /* The panel header cluster is built during the overview's own mount, which can
     land either side of this one. Wait for it rather than race it. */
  let tries = 0;
  (function attach() {
    const pop = document.getElementById('agent-main-more-pop');
    if (!pop) {
      if (tries++ > 240) return;
      requestAnimationFrame(attach);
      return;
    }
    if (document.getElementById(MENU_OPEN_ID)) return;
    const rows = document.createElement('div');
    rows.innerHTML =
      menuRowHTML(MENU_OPEN_ID, 'tune', 'Chart palette', api.isOpen()) +
      menuRowHTML(MENU_SKINNY_ID, 'density_small', 'Skinny bars', api.isSkinny());
    /* This module's own controls lead the menu — they are what the panel does. */
    pop.insertBefore(rows, pop.firstChild);
    rows.querySelector('#' + MENU_OPEN_ID)
      .addEventListener('click', () => { api.setOpen(!api.isOpen()); });
    rows.querySelector('#' + MENU_SKINNY_ID)
      .addEventListener('click', () => { api.setSkinny(!api.isSkinny()); });
    syncMenuRows(api);
  })();
}

function syncMenuRows(api) {
  const openRow = document.getElementById(MENU_OPEN_ID);
  const skinnyRow = document.getElementById(MENU_SKINNY_ID);
  if (openRow) openRow.setAttribute('aria-checked', api.isOpen() ? 'true' : 'false');
  if (skinnyRow) skinnyRow.setAttribute('aria-checked', api.isSkinny() ? 'true' : 'false');
}

/* ── Mount ──────────────────────────────────────────────────────────────── */

export function mountAnalyticsPalette() {
  if (!document.body || document.getElementById('az-palette')) return;
  injectCss();

  let size = defaultSizeForScreen();
  let skinny = read(SKINNY_KEY, '0') === '1';
  let open = read(OPEN_KEY, null);
  open = open == null ? window.innerWidth > WIDE_AT : open === '1';

  applySize(size);
  applySkinny(skinny);

  const launch = document.createElement('button');
  launch.type = 'button';
  launch.id = 'az-palette-launch';
  launch.className = 'azp-launch';
  launch.title = 'Chart palette';
  launch.setAttribute('aria-label', 'Open the chart palette');
  launch.setAttribute('aria-expanded', 'false');
  launch.setAttribute('aria-controls', 'az-palette');
  launch.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">tune</span>';

  const card = document.createElement('section');
  card.id = 'az-palette';
  card.className = 'azp';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Chart palette');
  card.innerHTML =
    '<header class="azp-head">' +
      '<span class="azp-grabber" aria-hidden="true"></span>' +
      '<span class="azp-drag" aria-hidden="true"><span class="material-symbols-outlined">drag_indicator</span></span>' +
      '<h2 class="azp-title">Charts</h2>' +
      '<button type="button" class="azp-close" aria-label="Close the chart palette">' +
        '<span class="material-symbols-outlined" aria-hidden="true">close</span>' +
      '</button>' +
    '</header>' +
    '<div class="azp-search">' +
      '<span class="azp-search-icon" aria-hidden="true">' +
        '<span class="material-symbols-outlined">search</span></span>' +
      '<input type="search" class="azp-input" id="azp-filter" autocomplete="off"' +
        ' spellcheck="false" placeholder="Filter charts and tables"' +
        ' aria-label="Filter charts and tables" aria-controls="azp-list">' +
      '<button type="button" class="azp-clear" aria-label="Clear the filter">' +
        '<span class="material-symbols-outlined" aria-hidden="true">close</span>' +
      '</button>' +
    '</div>' +
    '<div class="azp-body">' +
      '<div class="azp-group">' +
        '<span class="azp-group-head" id="azp-size-label">Chart size</span>' +
        '<div class="azp-sizes" role="group" aria-labelledby="azp-size-label">' +
          SIZES.map((s) =>
            '<button type="button" class="azp-size" data-azp-size="' + s.id + '"' +
            ' title="' + s.hint + '"' +
            ' aria-label="' + s.label + ', ' + spokenRange(s) + '"' +
            ' aria-pressed="' + (s.id === size ? 'true' : 'false') + '">' +
              '<span class="azp-size-label">' + s.label + '</span>' +
              '<span class="azp-size-range" aria-hidden="true">' + s.range + '</span>' +
            '</button>'
          ).join('') +
        '</div>' +
      '</div>' +
      '<div class="azp-group">' +
        '<span class="azp-group-head">Display</span>' +
        '<button type="button" class="azp-switch" role="switch" aria-checked="' + (skinny ? 'true' : 'false') + '">' +
          '<span class="azp-switch-label">Skinny bars</span>' +
          '<span class="azp-track" aria-hidden="true"><span class="azp-dot"></span></span>' +
        '</button>' +
      '</div>' +
      '<div class="azp-group">' +
        '<span class="azp-group-head azp-group-head--row">Jump to' +
          '<span class="azp-count" id="azp-count" aria-live="polite"></span>' +
        '</span>' +
        '<div class="azp-list" id="azp-list"></div>' +
        '<p class="azp-empty" id="azp-empty" hidden></p>' +
      '</div>' +
    '</div>';

  document.body.appendChild(launch);
  document.body.appendChild(card);

  const list = card.querySelector('#azp-list');
  const sizeBtns = Array.from(card.querySelectorAll('.azp-size'));
  const switchBtn = card.querySelector('.azp-switch');
  const searchRow = card.querySelector('.azp-search');
  const input = card.querySelector('#azp-filter');
  const clearBtn = card.querySelector('.azp-clear');
  const countEl = card.querySelector('#azp-count');
  const emptyEl = card.querySelector('#azp-empty');

  /* ---- open / close ---- */
  function setOpen(next, remember) {
    open = !!next;
    card.hidden = !open;
    launch.hidden = open;
    launch.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) seat(card);
    if (remember) write(OPEN_KEY, open ? '1' : '0');
    syncMenuRows(menuApi);
  }
  launch.addEventListener('click', () => { setOpen(true, true); });
  card.querySelector('.azp-close').addEventListener('click', () => { setOpen(false, true); });

  /* One state, two places to change it from — the card's own controls and the
     module's ⋯ rows — so both run through the same setters and re-sync each
     other afterwards. */
  const menuApi = {
    isOpen: () => open,
    setOpen: (next) => setOpen(next, true),
    isSkinny: () => skinny,
    setSkinny: (next) => setSkinny(next),
  };
  mountMenuRows(menuApi);

  setOpen(open, false);
  wireDrag(card);
  wireReclamp(card);
  window.addEventListener('resize', () => {
    if (!card.hidden) clamp(card, parseFloat(card.style.left) || EDGE, parseFloat(card.style.top) || EDGE);
  });

  /* ---- chart size ---- */
  let replayTimer = 0;
  sizeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.azpSize;
      if (!next || next === size) return;
      size = next;
      sizeBtns.forEach((b) => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
      /* A narrower frame makes the report far taller, so the scroll offset the
         member was at now points at a different chart entirely. Hold onto the
         section they were reading and put it back under them once the reflow
         has settled, before replaying what is on screen. */
      const held = activeEl;
      applySize(size);
      clearTimeout(replayTimer);
      replayTimer = setTimeout(() => {
        if (held && held.isConnected) scrollToSection(held, false, 'auto');
        replayVisibleCharts();
      }, reduceMotion() ? 0 : 300);
    });
  });

  /* ---- skinny bars ---- */
  function setSkinny(next) {
    skinny = !!next;
    switchBtn.setAttribute('aria-checked', skinny ? 'true' : 'false');
    enhanceBars();
    applySkinny(skinny);
    syncMenuRows(menuApi);
  }
  switchBtn.addEventListener('click', () => { setSkinny(!skinny); });

  /* ---- jump list + scrollspy ---- */
  let entries = [];
  let spy = null;
  let activeEl = null;

  /* ---- filter ----
     Every whitespace-separated term has to land, and each is matched against
     the label, the catalog blurb and the catalog's search keywords — so
     "donut" reaches the pie variations, "table" reaches all of the table
     specimens, and "upf table" finds the same row whichever order the two
     words arrive in. */
  let query = '';

  const firstHit = () => entries.find((e) => !e.btn.hidden);

  function applyFilter() {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    entries.forEach((e) => {
      const hit = !terms.length || terms.every((t) => e.hay.indexOf(t) !== -1);
      e.btn.hidden = !hit;
      if (hit) shown += 1;
    });
    searchRow.classList.toggle('has-q', terms.length > 0);
    countEl.textContent = terms.length
      ? shown + ' of ' + entries.length
      : String(entries.length);
    emptyEl.hidden = !terms.length || shown > 0;
    if (!emptyEl.hidden) emptyEl.textContent = 'Nothing matches “' + query.trim() + '”.';
  }

  function setQuery(next) {
    query = next || '';
    if (input.value !== query) input.value = query;
    applyFilter();
  }

  input.addEventListener('input', () => { setQuery(input.value); });
  clearBtn.addEventListener('click', () => { setQuery(''); input.focus(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      /* Clear the field rather than let a global Escape handler close
         something out from under the member mid-filter. */
      if (!query) return;
      e.preventDefault();
      e.stopPropagation();
      setQuery('');
      return;
    }
    if (e.key !== 'Enter' && e.key !== 'ArrowDown') return;
    const hit = firstHit();
    if (!hit) return;
    e.preventDefault();
    /* Enter takes the top match; ArrowDown steps into the list to walk it. */
    if (e.key === 'Enter') hit.btn.click();
    else hit.btn.focus();
  });

  function setActive(el) {
    if (el === activeEl) return;
    activeEl = el;
    entries.forEach((e) => e.btn.classList.toggle('is-active', e.el === el));
  }

  function scrollToSection(el, toTop, how) {
    const sc = scroller();
    if (!sc) return;
    const behavior = how || (reduceMotion() ? 'auto' : 'smooth');
    /* The page header sits above the scroll pane rather than inside it, so
       there is nothing to scroll to — send the pane back to the top. */
    if (toTop) { sc.scrollTo({ top: 0, behavior }); return; }
    const top = el.getBoundingClientRect().top
      - sc.getBoundingClientRect().top + sc.scrollTop - 18;
    sc.scrollTo({ top: Math.max(0, top), behavior });
  }

  /* A section is current while its top sits in the upper band of the scroll
     pane. Keep the in-band set and light up the earliest one in document
     order, so a tall section does not lose the highlight to the one below. */
  function wireSpy() {
    const sc = scroller();
    if (!sc || !('IntersectionObserver' in window)) return;
    if (spy) spy.disconnect();
    const visible = new Set();
    spy = new IntersectionObserver((obs) => {
      obs.forEach((o) => {
        if (o.isIntersecting) visible.add(o.target);
        else visible.delete(o.target);
      });
      for (const e of entries) {
        if (visible.has(e.el)) { setActive(e.el); return; }
      }
    }, { root: sc, rootMargin: '-12% 0px -70% 0px', threshold: 0 });
    /* The page header lives outside the scroll root, so the observer can never
       report it. It stays click-to-top only. */
    entries.forEach((e) => { if (!e.doc) spy.observe(e.el); });
  }

  function build() {
    const sc = scroller();
    const dash = sc && sc.querySelector('.dash');
    if (!dash) return false;

    const found = [];
    ANALYTICS_NAV.forEach((s) => {
      let el;
      try { el = s.doc ? document.querySelector(s.sel) : dash.querySelector(s.sel); }
      catch (_) { el = null; }
      if (el && !found.some((f) => f.el === el)) {
        found.push({
          el, label: s.label, icon: s.icon || 'chevron_right',
          doc: !!s.doc, desc: s.desc || '', keywords: s.keywords || '',
        });
      }
    });
    if (!found.length) return false;

    found.sort((a, b) =>
      (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1);

    /* Skip the rebuild when the same sections are already listed, so the live
       observer cannot thrash the list on unrelated DOM churn. */
    const sig = found.map((f) => f.label).join('|');
    if (sig === list.dataset.sig) return found.length === ANALYTICS_NAV.length;
    list.dataset.sig = sig;

    list.innerHTML = '';
    enhanceBars();
    applySkinny(skinny);
    entries = found.map((f) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'azp-item';
      btn.title = f.label;   /* the longest names ellipsize at this width */
      btn.innerHTML =
        '<span class="azp-item-icon material-symbols-outlined" aria-hidden="true">' + f.icon + '</span>' +
        '<span class="azp-item-label">' + f.label + '</span>' +
        '<span class="azp-tick" aria-hidden="true"></span>';
      btn.addEventListener('click', () => { setActive(f.el); scrollToSection(f.el, f.doc); });
      list.appendChild(btn);
      return {
        el: f.el, btn, doc: f.doc,
        hay: (f.label + ' ' + f.desc + ' ' + f.keywords).toLowerCase(),
      };
    });

    activeEl = null;
    /* The list was just rebuilt from scratch, so a live filter has to be
       re-applied or every row it had hidden comes back. */
    applyFilter();
    wireSpy();
    return found.length === ANALYTICS_NAV.length;
  }

  /* The dashboard body, the matrix, and the chart variations all land at
     different times, so keep rebuilding until every known section exists. */
  const complete = build();
  const host = scroller() || document.body;
  const obs = new MutationObserver(() => { if (build()) obs.disconnect(); });
  obs.observe(host, { childList: true, subtree: true });
  if (!complete) setTimeout(() => obs.disconnect(), 16000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountAnalyticsPalette);
} else {
  mountAnalyticsPalette();
}
