/* ═══════════════════════════════════════════════════════════════════════════
   pane-width.js — the ONE canonical pane-width model for the whole app.

   Every module's "width" control (the .panel-width-toggle-btn) cycles the exact
   same four tiers, everywhere:

       0  single  — the module's natural / default width
       1  double  — one step wider
       2  triple  — two steps wider
       3  fill     — take up ALL the remaining space in the row
                     (then the cycle wraps back to single)

   Two things live here so the behaviour is identical on every page:
     • the shared spec (icons, titles, tier math) on window.WPaneWidth, and
     • the universal `.panel-fill` CSS that makes ANY pane at the fill tier grow
       to absorb the row's leftover space — no matter whether that pane sizes
       itself with fixed pixel widths (the utility panels) or with flex-grow
       (the WISEai result panes). The per-page toggle handlers keep their own
       target-resolution + persistence; they only need to add/remove these
       classes for the tier the shared spec hands them.

   Loaded once from js/agent-menu.js (which every #modules-row page runs) and is
   idempotent.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.WPaneWidth) return;

  var TIERS = 4;

  /* Material Symbols from the width_* family the whole app already uses. There
     are only three width glyphs, so the fill tier reuses `width_full` (the
     widest width icon) rather than borrowing the `fit_screen` fullscreen glyph,
     which reads as "maximize", not "width". Tiers are still distinguished by the
     button's pressed state + title ("Width (fill) — tap to reset"). */
  var ICONS = ['width_normal', 'width_wide', 'width_full', 'width_full'];

  /* Titles carry the state + the next action. Every module reads the SAME text
     so the control is self-describing and identical wherever it appears. */
  var TITLES = [
    'Width (single) — tap to widen',
    'Width (double) — tap to widen',
    'Width (triple) — tap to widen',
    'Width (fill) — tap to reset',
  ];

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

  /* Read a pane's current tier from its width classes. Supports both class
     schemes in the app: the utility/panel scheme (panel-*) and the WISEai
     result-pane scheme (pane-*). */
  function tierOfEl(el) {
    if (!el || !el.classList) return 0;
    var c = el.classList;
    if (c.contains('panel-fill') || c.contains('pane-fill')) return 3;
    if (c.contains('panel-triple') || c.contains('pane-triple')) return 2;
    if (c.contains('panel-wide') || c.contains('pane-wide')) return 1;
    return 0;
  }

  /* Apply a tier's classes to a pane. `alias` picks the class family:
       'panel' (default) → panel-wide / panel-triple / panel-fill
       'pane'            → pane-wide  / pane-triple  / pane-fill
     double/triple stay cumulative (triple keeps wide) so a page's fixed-pixel
     triple width still resolves; fill rides on top and the CSS below overrides
     the pixel width to make the pane grow. */
  function applyClasses(el, tier, alias) {
    if (!el || !el.classList) return;
    tier = clamp(tier);
    var p = alias === 'pane' ? 'pane' : 'panel';
    el.classList.toggle(p + '-wide', tier >= 1);
    el.classList.toggle(p + '-triple', tier >= 2);
    el.classList.toggle(p + '-fill', tier >= 3);
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
    if (ic) ic.textContent = ICONS[tier];
  }

  /* Universal "fill" tier. A pane at the fill tier grows (grow:1000) to take the
     row's remaining space regardless of any fixed width its own stylesheet sets
     — one rule covers the fixed-pixel utility panels AND anything else that opts
     in with .panel-fill. The `.pane-fill` (WISEai result panes) keep their own
     flex-grow rule in wiseai.html; we still list it so drag-resize + querying
     treat them consistently. Fixed-width inner wrappers (…-inner) are stretched
     so a filled pane shows content across its new width instead of a gutter. */
  function injectStyles() {
    if (document.getElementById('pane-width-styles')) return;
    var css =
      '.panel-fill{flex-grow:1000 !important;flex-shrink:1 !important;' +
        'flex-basis:auto !important;width:auto !important;max-width:none !important;}' +
      '.panel-fill>.panel-inner,.panel-fill [class$="-inner"]{' +
        'width:auto !important;max-width:none !important;}';
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

  window.WPaneWidth = {
    TIERS: TIERS,
    ICONS: ICONS,
    TITLES: TITLES,
    clamp: clamp,
    next: next,
    tierOfEl: tierOfEl,
    applyClasses: applyClasses,
    syncButton: syncButton,
  };
})();
