/* ═══════════════════════════════════════════════════════════════════════════
   pane-width.js — the ONE canonical pane-width model for the whole app.

   Every module's "width" control (the .panel-width-toggle-btn) cycles the exact
   same four rest states, everywhere:

       0  single  — the module's natural / default width
       1  double  — one step wider
       3  fill    — take up ALL the remaining space in the row
       4  custom  — none of the presets. Keeps whatever width the module
                     already had (its default / current size). Dragging then
                     sets a free pixel width that is maintained. Custom panes
                     live on a carousel rail (#modules-row.modules-carousel)
                     so the row scrolls horizontally with the content.

   Triple (old tier 2) is gone from the cycle. A leftover stored 2 is treated
   as double (same icon, the last named size the user actually passed).

   Each module remembers its own rest state. Changing module A never writes
   module B's setting, and a window resize never restores a neighbour. Chat
   still uses a SCREEN-based load default (not a persisted user choice).
   Measured against the display (window.screen.width), NOT the browser window:
       ≤ 1512 CSS px  →  single (tier 0)  — 14" MacBook Pro class and below
       >  1512 CSS px  →  double (tier 1)  — larger screens
     `defaultChatTier()` is that rule. In-session, the user can still cycle
     every remaining tier; the next load reapplies the screen default.

   Two things live here so the behaviour is identical on every page:
     • the shared spec (icons, titles, tier math) on window.WPaneWidth, and
     • the universal `.panel-fill` / `.panel-custom` CSS — fill grows to absorb
       leftover row space; custom pins the current pixel width and puts the
       row on a scrollable carousel rail. The per-page toggle handlers keep
       their own target-resolution; persistence of the rest state is shared.

   Loaded once from js/agent-menu.js (which every #modules-row page runs) and is
   idempotent.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.WPaneWidth) return;

  var FILL = 3;
  var CUSTOM = 4;
  var TIERS = 5;                 // numeric ids stay 0–4 so stored values keep working
  var CYCLE = [0, 1, 3, 4];      // single → double → fill → custom
  var PRESETS = [0, 1, 3];       // snap targets — custom never snaps
  var TIER_STORE = 'wise-module-width-tiers-v1';

  /* 14" MacBook Pro at default scaling is 1512 CSS px. That class of screen
     keeps the chat at single pane; anything larger defaults to double. Keep in
     sync with the FOUC guard in js/text-size-fouc.js (WISE_CHAT_SINGLE_MAX_PX). */
  var CHAT_SINGLE_MAX_PX = (typeof window.WISE_CHAT_SINGLE_MAX_PX === 'number')
    ? window.WISE_CHAT_SINGLE_MAX_PX
    : 1512;

  /* Measure the DISPLAY, not the browser window — see the long note in
     js/text-size-fouc.js. Delegates to that file's measurer when it is loaded
     so there is exactly one definition of "how wide is this screen"; the local
     copy is the standalone fallback. */
  function screenWidthPx() {
    if (typeof window.WISE_CHAT_SCREEN_WIDTH_PX === 'function') {
      return window.WISE_CHAT_SCREEN_WIDTH_PX();
    }
    var w = 0;
    try { w = (window.screen && +window.screen.width) || 0; } catch (_) { w = 0; }
    return w > 0 ? w : (window.innerWidth || 0);
  }

  function defaultChatTier() {
    return screenWidthPx() > CHAT_SINGLE_MAX_PX ? 1 : 0;
  }

  /* Marks "the user picked a width this session", so the display-change
     re-apply in js/text-size-fouc.js never overwrites a manual choice. */
  function markUserSet() {
    try { document.documentElement.setAttribute('data-chat-width-user-set', '1'); } catch (_) {}
  }

  /* Four glyphs — one per rest state. Legacy triple shared double's icon and
     is no longer a stop on the cycle.
       single  width_normal
       double  width_wide
       fill    width_full
       custom  fit_width */
  var ICONS = ['width_normal', 'width_wide', 'width_wide', 'width_full', 'fit_width'];

  /* Titles carry the state + the next action. Every module reads the SAME text
     so the control is self-describing and identical wherever it appears.
     Index 2 (old triple) keeps double's copy so a leftover stored 2 never
     surfaces a "triple" caption. */
  var TITLES = [
    'Width (single) — tap to widen',
    'Width (double) — tap to widen',
    'Width (double) — tap to widen',
    'Width (fill) — tap to widen',
    'Width (custom) — drag to any size',
  ];

  var NAMES = ['single', 'double', 'double', 'fill', 'custom'];

  /* Coerce any stored value to a valid tier. Legacy booleans (true/false) map
     to double/single so old persisted state keeps working. Leftover triple (2)
     becomes double (1) — the last named size that still exists. */
  function clamp(v) {
    if (v === true) return 1;
    if (v === false || v == null) return 0;
    var n = typeof v === 'number' ? (v | 0) : parseInt(v, 10);
    if (!isFinite(n)) return 0;
    n = Math.max(0, Math.min(TIERS - 1, n));
    return n === 2 ? 1 : n;
  }

  function next(v) {
    var t = clamp(v);
    var i = CYCLE.indexOf(t);
    if (i < 0) i = 0;
    return CYCLE[(i + 1) % CYCLE.length];
  }

  function hasCustomClass(el) {
    return !!(el && el.classList &&
      (el.classList.contains('panel-custom') || el.classList.contains('pane-custom')));
  }

  /* Read a pane's current tier from its width classes. Supports both class
     schemes in the app: the utility/panel scheme (panel-*) and the WISEcodeAI
     result-pane scheme (pane-*). Custom is checked first so a leftover fill
     class cannot mask it. A leftover triple class without fill reads as double. */
  function tierOfEl(el) {
    if (!el || !el.classList) return 0;
    var c = el.classList;
    if (c.contains('panel-custom') || c.contains('pane-custom')) return CUSTOM;
    if (c.contains('panel-fill') || c.contains('pane-fill')) return FILL;
    if (c.contains('panel-wide') || c.contains('pane-wide')) return 1;
    return 0;
  }

  /* Pin the element at its CURRENT rendered width so switching into custom
     does not jump the size — whatever the default/current width was, it stays
     until the user drags. */
  function pinToCurrent(el) {
    if (!el || !el.style) return 0;
    var w = Math.round(el.getBoundingClientRect().width);
    if (!(w > 0)) return 0;
    el.style.setProperty('flex', '0 0 ' + w + 'px', 'important');
    el.style.setProperty('width', w + 'px', 'important');
    el.style.setProperty('max-width', 'none', 'important');
    return w;
  }

  function clearPin(el) {
    if (!el || !el.style) return;
    el.style.removeProperty('flex');
    el.style.removeProperty('width');
    el.style.removeProperty('max-width');
  }

  /* Mark the modules row as a carousel rail whenever a first-class module
     (a direct child of the row, or a panel inside #panels-row / #panels-row-right)
     is in custom, so the row scrolls the width of the content. Nested demos
     inside a module must not trip this. */
  function syncCarousel(fromEl) {
    if (measuring) return;
    var row = fromEl && fromEl.closest
      ? fromEl.closest('#modules-row, .modules-row')
      : null;
    if (!row) return;
    function isCustomEl(el) {
      return !!(el && el.classList &&
        (el.classList.contains('panel-custom') || el.classList.contains('pane-custom')));
    }
    var on = false;
    for (var c = row.firstElementChild; c; c = c.nextElementSibling) {
      if (isCustomEl(c)) { on = true; break; }
      if (c.id === 'panels-row' || c.id === 'panels-row-right') {
        for (var p = c.firstElementChild; p; p = p.nextElementSibling) {
          if (isCustomEl(p)) { on = true; break; }
        }
        if (on) break;
      }
    }
    row.classList.toggle('modules-carousel', on);
  }

  var measuring = false;
  function measure(fn) {
    measuring = true;
    try { return fn(); }
    finally { measuring = false; }
  }

  /* Apply a tier's classes to a pane. `alias` picks the class family:
       'panel' (default) → panel-wide / panel-triple / panel-fill / panel-custom
       'pane'            → pane-wide  / pane-triple  / pane-fill  / pane-custom
     Fill still rides on the wide (+ leftover triple) classes so existing
     per-page pixel CSS keeps resolving; the fill override then grows the pane.
     Custom is exclusive: it strips the presets and pins the width that was on
     screen at the moment of the switch so the size does not jump. */
  function applyClasses(el, tier, alias) {
    if (!el || !el.classList) return;
    tier = clamp(tier);
    var goingCustom = tier === CUSTOM;
    var wasCustom = hasCustomClass(el);
    var w = goingCustom ? el.getBoundingClientRect().width : 0;
    var p = alias === 'pane' ? 'pane' : 'panel';
    el.classList.toggle(p + '-wide', tier >= 1 && tier < CUSTOM);
    el.classList.toggle(p + '-triple', tier >= FILL && tier < CUSTOM);
    el.classList.toggle(p + '-fill', tier === FILL);
    el.classList.toggle(p + '-custom', goingCustom);
    if (goingCustom && w > 0) {
      var px = Math.round(w);
      el.style.setProperty('flex', '0 0 ' + px + 'px', 'important');
      el.style.setProperty('width', px + 'px', 'important');
      el.style.setProperty('max-width', 'none', 'important');
    } else if (wasCustom && !goingCustom) {
      clearPin(el);
    }
    syncCarousel(el);
  }

  /* Reflect a tier onto a glyph. Used by the header button and by menu-row
     width changers. Clear any leftover FILL 1 from the old fill treatment. */
  function applyIcon(ic, tier) {
    if (!ic) return;
    tier = clamp(tier);
    if (ic.style.fontVariationSettings) ic.style.fontVariationSettings = '';
    /* Write only on a real change. This runs from observers, and an
       unconditional textContent assignment replaces the text node even when the
       string is identical — a fresh childList mutation that re-fires the
       observer. Same guard as syncProgressWidthItem() in add-product-flow.js. */
    if (ic.textContent !== ICONS[tier]) ic.textContent = ICONS[tier];
  }

  /* Reflect a tier onto a toggle button — identical icon/pressed/title logic
     everywhere. */
  function syncButton(btn, tier) {
    if (!btn) return;
    tier = clamp(tier);
    btn.classList.toggle('is-on', tier >= 1);
    btn.classList.toggle('is-width-fill', tier === FILL);
    btn.setAttribute('aria-pressed', tier >= 1 ? 'true' : 'false');
    btn.title = TITLES[tier];
    applyIcon(btn.querySelector('.material-symbols-outlined'), tier);
  }

  /* ── per-module persistence ───────────────────────────────────────────── */
  function pageId() {
    try { return location.pathname; } catch (_) { return '/'; }
  }
  function readTierStore() {
    try { return JSON.parse(localStorage.getItem(TIER_STORE) || '{}') || {}; }
    catch (_) { return {}; }
  }
  function writeTierStore(o) {
    try { localStorage.setItem(TIER_STORE, JSON.stringify(o)); } catch (_) {}
  }
  function keyOf(el) {
    if (!el) return '';
    if (el.id) return '#' + el.id;
    var cls = ((el.className || '') + '').trim().split(/\s+/).filter(Boolean)[0];
    return (el.tagName || 'div').toLowerCase() + (cls ? '.' + cls : '');
  }
  function isChatEl(el) {
    if (!el || !el.classList) return false;
    if (el.id === 'wa-chat' || el.id === 'chat-shell' || el.id === 'rf-chat' ||
        el.id === 'gs-chat' || el.id === 'sa-chat' || el.id === 'aid-chat') return true;
    return el.classList.contains('wiseai-dock') ||
      el.classList.contains('wa-chat') ||
      el.classList.contains('ap-chat') ||
      el.classList.contains('rf-chat') ||
      el.classList.contains('sa-chat') ||
      el.classList.contains('gs-chat') ||
      el.classList.contains('aid-chat') ||
      el.classList.contains('wch-chat-anchor') ||
      el.classList.contains('ar-chat') ||
      el.classList.contains('pl-chat');
  }
  /* Chat keeps its screen-based load default. Every other module — including
     #agent-main — remembers the rest state the user picked, per page, so
     changing or resizing a neighbour cannot write this one. */
  function shouldPersist(el) {
    if (!el) return false;
    return !isChatEl(el);
  }
  function moduleRootFromBtn(btn) {
    if (!btn || !btn.closest) return null;
    var row = btn.closest('#modules-row, .modules-row');
    if (!row) return null;
    var n = btn;
    while (n && n.parentElement) {
      var p = n.parentElement;
      if (p === row || p.id === 'panels-row' || p.id === 'panels-row-right') return n;
      n = p;
    }
    return null;
  }
  function markModuleUserSet(el) {
    if (el && el.setAttribute) el.setAttribute('data-width-user-set', '1');
  }
  function saveTier(el, tier) {
    if (!shouldPersist(el)) return;
    var k = keyOf(el);
    if (!k) return;
    var all = readTierStore();
    var page = all[pageId()] || {};
    page[k] = clamp(tier);
    all[pageId()] = page;
    writeTierStore(all);
    markModuleUserSet(el);
  }
  function readSavedTier(el) {
    if (!shouldPersist(el)) return null;
    var k = keyOf(el);
    if (!k) return null;
    var page = readTierStore()[pageId()] || {};
    if (!Object.prototype.hasOwnProperty.call(page, k)) return null;
    return clamp(page[k]);
  }
  function classAlias(el) {
    if (el && el.classList &&
        (el.classList.contains('wa-pane') ||
         el.classList.contains('pane-wide') ||
         el.classList.contains('pane-fill') ||
         el.classList.contains('pane-custom'))) return 'pane';
    return 'panel';
  }
  function restoreOne(el, tier) {
    if (!el) return;
    tier = clamp(tier);
    applyClasses(el, tier, classAlias(el));
    markModuleUserSet(el);
    var btn = el.querySelector && el.querySelector('.panel-width-toggle-btn');
    if (btn) syncButton(btn, tier);
    if (el.id === 'agent-main') {
      el.classList.toggle('main-w-narrow', tier === 0);
      el.classList.toggle('main-w-wide', tier === 1);
      el.classList.toggle('main-w-triple', false);
    }
  }
  function restoreAll() {
    var page = readTierStore()[pageId()] || {};
    Object.keys(page).forEach(function (k) {
      var el = null;
      try {
        el = k.charAt(0) === '#' ? document.getElementById(k.slice(1)) : document.querySelector(k);
      } catch (_) { el = null; }
      if (!el || !shouldPersist(el)) return;
      restoreOne(el, page[k]);
    });
  }

  /* Universal "fill" + "custom" tiers.
     Fill: a pane grows (grow:1000) to take the row's remaining space.
     Custom: a pane keeps a free pixel width (pinned by applyClasses / drag)
     and the row becomes a carousel rail that scrolls with the content. */
  function injectStyles() {
    if (document.getElementById('pane-width-styles')) return;
    var css =
      '.panel-fill{flex-grow:1000 !important;flex-shrink:1 !important;' +
        'flex-basis:auto !important;width:auto !important;max-width:none !important;}' +
      '.panel-fill>.panel-inner,.panel-fill [class$="-inner"]{' +
        'width:auto !important;max-width:none !important;}' +
      '.panel-custom,.pane-custom{flex-grow:0 !important;flex-shrink:0 !important;' +
        'max-width:none !important;}' +
      '.panel-custom>.panel-inner,.panel-custom [class$="-inner"],' +
      '.pane-custom>.panel-inner,.pane-custom [class$="-inner"]{' +
        'width:100% !important;max-width:none !important;}' +
      '#modules-row.modules-carousel,.modules-row.modules-carousel{' +
        'overflow-x:auto !important;overflow-y:hidden;' +
        'scrollbar-gutter:stable;}' +
      '#modules-row.modules-carousel::-webkit-scrollbar,' +
      '.modules-row.modules-carousel::-webkit-scrollbar{height:10px;}' +
      '#modules-row.modules-carousel::-webkit-scrollbar-thumb,' +
      '.modules-row.modules-carousel::-webkit-scrollbar-thumb{' +
        'background:color-mix(in srgb,var(--text-subtle) 55%,transparent);border-radius:999px;}' +
      '#modules-row.modules-carousel>*,.modules-row.modules-carousel>*{' +
        'flex-shrink:0 !important;}';
    var st = document.createElement('style');
    st.id = 'pane-width-styles';
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectStyles);
  } else {
    injectStyles();
  }
  // Also inject immediately in case the head is already available (defer script).
  try { injectStyles(); } catch (_) {}

  if (typeof window.WISE_CHAT_SINGLE_MAX_PX !== 'number') {
    window.WISE_CHAT_SINGLE_MAX_PX = CHAT_SINGLE_MAX_PX;
  }
  if (typeof window.wiseDefaultChatTier !== 'function') {
    window.wiseDefaultChatTier = defaultChatTier;
  }

  /* ONE delegated listener covers every module's width control, in capture
     phase at document level, so no existing toggle handler had to change. */
  try {
    document.addEventListener('click', function (e) {
      /* Real user clicks only. js/default-fill.js drives right-of-chat modules
         to the fill tier by CLICKING their width control; a synthetic click
         must not be mistaken for the user choosing a width. */
      if (!e.isTrusted) return;
      var t = e.target;
      if (!t || !t.closest) return;
      var btn = t.closest('.panel-width-toggle-btn,[id$="-width"],[id$="-width-btn"],[id$="-width-item"]');
      if (!btn) return;
      /* Nested catalog / motion demos are not first-class modules — do not
         write the host module's persisted rest state from their clicks. */
      if (btn.closest('[data-motion-width], .mi-motion-width, .dsc-states')) return;
      markUserSet();
      var root = moduleRootFromBtn(btn);
      if (root) markModuleUserSet(root);
      /* Save AFTER the page's own handler advances the tier. */
      requestAnimationFrame(function () {
        var el = root || moduleRootFromBtn(btn);
        if (!el) return;
        saveTier(el, tierOfEl(el));
        var icBtn = el.querySelector && el.querySelector('.panel-width-toggle-btn');
        if (icBtn) syncButton(icBtn, tierOfEl(el));
      });
    }, true);
  } catch (_) {}

  function bootRestore() {
    restoreAll();
    [120, 360, 800, 1400].forEach(function (t) {
      setTimeout(restoreAll, t);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootRestore);
  else bootRestore();

  window.WPaneWidth = {
    TIERS: TIERS,
    FILL: FILL,
    CUSTOM: CUSTOM,
    PRESET_TIERS: PRESETS.length,
    PRESETS: PRESETS,
    CYCLE: CYCLE,
    ICONS: ICONS,
    applyIcon: applyIcon,
    TITLES: TITLES,
    NAMES: NAMES,
    CHAT_SINGLE_MAX_PX: CHAT_SINGLE_MAX_PX,
    defaultChatTier: defaultChatTier,
    screenWidthPx: screenWidthPx,
    markUserSet: markUserSet,
    markModuleUserSet: markModuleUserSet,
    clamp: clamp,
    next: next,
    tierOfEl: tierOfEl,
    applyClasses: applyClasses,
    syncButton: syncButton,
    pinToCurrent: pinToCurrent,
    clearPin: clearPin,
    isCustom: hasCustomClass,
    syncCarousel: syncCarousel,
    measure: measure,
    isMeasuring: function () { return measuring; },
    saveTier: saveTier,
    readSavedTier: readSavedTier,
    restoreAll: restoreAll,
    shouldPersist: shouldPersist,
  };
})();
