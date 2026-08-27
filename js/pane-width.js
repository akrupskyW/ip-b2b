/* ═══════════════════════════════════════════════════════════════════════════
   pane-width.js — the ONE canonical pane-width model for the whole app.

   Every module's "width" control (the .panel-width-toggle-btn) cycles the exact
   same five tiers, everywhere:

       0  single  — the module's natural / default width
       1  double  — one step wider
       2  triple  — two steps wider
       3  fill     — take up ALL the remaining space in the row
       4  custom   — none of the presets. Keeps whatever width the module
                     already had (its default / current size). Dragging then
                     sets a free pixel width that is maintained. Custom panes
                     live on a carousel rail (#modules-row.modules-carousel)
                     so the row scrolls horizontally with the content.

   Chat modules have a SCREEN-based DEFAULT (not a persisted user choice).
   Measured against the display (window.screen.width), NOT the browser window,
   so resizing or un-maximising the window never changes the tier:
       ≤ 1512 CSS px  →  single (tier 0)  — 14" MacBook Pro class and below
       >  1512 CSS px  →  double (tier 1)  — larger screens
     `defaultChatTier()` is that rule. In-session, the user can still cycle
     every tier; the next load reapplies the screen default, same as today.

   Two things live here so the behaviour is identical on every page:
     • the shared spec (icons, titles, tier math) on window.WPaneWidth, and
     • the universal `.panel-fill` / `.panel-custom` CSS — fill grows to absorb
       leftover row space; custom pins the current pixel width and puts the
       row on a scrollable carousel rail. The per-page toggle handlers keep
       their own target-resolution + persistence; they only need to add/remove
       these classes for the tier the shared spec hands them.

   Loaded once from js/agent-menu.js (which every #modules-row page runs) and is
   idempotent.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.WPaneWidth) return;

  var FILL = 3;
  var CUSTOM = 4;
  var PRESET_TIERS = 4;   // single/double/triple/fill — the snap scale
  var TIERS = 5;

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

  /* Material Symbols from the width_* family for the four presets. Custom is
     none of those sizes, so it uses `crop_free` (an unconstrained frame) rather
     than borrowing `fit_screen`, which reads as "maximize". Tiers are still
     distinguished by the button's pressed state + title. */
  var ICONS = ['width_normal', 'width_wide', 'width_full', 'width_full', 'crop_free'];

  /* Titles carry the state + the next action. Every module reads the SAME text
     so the control is self-describing and identical wherever it appears. */
  var TITLES = [
    'Width (single) — tap to widen',
    'Width (double) — tap to widen',
    'Width (triple) — tap to widen',
    'Width (fill) — tap to widen',
    'Width (custom) — drag to any size',
  ];

  var NAMES = ['single', 'double', 'triple', 'fill', 'custom'];

  /* Coerce any stored value to a valid tier. Legacy booleans (true/false) map
     to double/single so old persisted state keeps working. */
  function clamp(v) {
    if (v === true) return 1;
    if (v === false || v == null) return 0;
    var n = typeof v === 'number' ? (v | 0) : parseInt(v, 10);
    if (!isFinite(n)) return 0;
    return Math.max(0, Math.min(TIERS - 1, n));
  }

  function next(v) { return (clamp(v) + 1) % TIERS; }

  function hasCustomClass(el) {
    return !!(el && el.classList &&
      (el.classList.contains('panel-custom') || el.classList.contains('pane-custom')));
  }

  /* Read a pane's current tier from its width classes. Supports both class
     schemes in the app: the utility/panel scheme (panel-*) and the WISEcodeAI
     result-pane scheme (pane-*). Custom is checked first so a leftover fill
     class cannot mask it. */
  function tierOfEl(el) {
    if (!el || !el.classList) return 0;
    var c = el.classList;
    if (c.contains('panel-custom') || c.contains('pane-custom')) return CUSTOM;
    if (c.contains('panel-fill') || c.contains('pane-fill')) return FILL;
    if (c.contains('panel-triple') || c.contains('pane-triple')) return 2;
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

  /* Apply a tier's classes to a pane. `alias` picks the class family:
       'panel' (default) → panel-wide / panel-triple / panel-fill / panel-custom
       'pane'            → pane-wide  / pane-triple  / pane-fill  / pane-custom
     double/triple stay cumulative (triple keeps wide) so a page's fixed-pixel
     triple width still resolves; fill rides on top and the CSS below overrides
     the pixel width to make the pane grow. Custom is exclusive: it strips the
     presets and pins the width that was on screen at the moment of the switch
     (the module's default), so the size does not jump. */
  function applyClasses(el, tier, alias) {
    if (!el || !el.classList) return;
    tier = clamp(tier);
    var goingCustom = tier === CUSTOM;
    var wasCustom = hasCustomClass(el);
    var w = goingCustom ? el.getBoundingClientRect().width : 0;
    var p = alias === 'pane' ? 'pane' : 'panel';
    el.classList.toggle(p + '-wide', tier >= 1 && tier < CUSTOM);
    el.classList.toggle(p + '-triple', tier >= 2 && tier < CUSTOM);
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

  /* Reflect a tier onto a toggle button — identical icon/pressed/title logic
     everywhere. */
  function syncButton(btn, tier) {
    if (!btn) return;
    tier = clamp(tier);
    btn.classList.toggle('is-on', tier >= 1);
    btn.setAttribute('aria-pressed', tier >= 1 ? 'true' : 'false');
    btn.title = TITLES[tier];
    var ic = btn.querySelector('.material-symbols-outlined');
    /* Write only on a real change. This runs from observers, and an
       unconditional textContent assignment replaces the text node even when the
       string is identical — a fresh childList mutation that re-fires the
       observer. Same guard as syncProgressWidthItem() in add-product-flow.js. */
    if (ic && ic.textContent !== ICONS[tier]) ic.textContent = ICONS[tier];
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
      if (t.closest('.panel-width-toggle-btn,[id$="-width"],[id$="-width-btn"],[id$="-width-item"]')) {
        markUserSet();
      }
    }, true);
  } catch (_) {}

  window.WPaneWidth = {
    TIERS: TIERS,
    FILL: FILL,
    CUSTOM: CUSTOM,
    PRESET_TIERS: PRESET_TIERS,
    ICONS: ICONS,
    TITLES: TITLES,
    NAMES: NAMES,
    CHAT_SINGLE_MAX_PX: CHAT_SINGLE_MAX_PX,
    defaultChatTier: defaultChatTier,
    screenWidthPx: screenWidthPx,
    markUserSet: markUserSet,
    clamp: clamp,
    next: next,
    tierOfEl: tierOfEl,
    applyClasses: applyClasses,
    syncButton: syncButton,
    pinToCurrent: pinToCurrent,
    clearPin: clearPin,
    isCustom: hasCustomClass,
    syncCarousel: syncCarousel,
  };
})();
