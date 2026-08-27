/* Roll / Crawl / Walk / Run rollout toggle — a floating segmented control pinned to
   the right edge, vertically centered, present on every pages/*.html.

   The chosen mode is stored in localStorage ('wise-cwr-mode') and applied as
   a class on <html> (cwr-roll / cwr-crawl / cwr-walk / cwr-run) so every page
   picks the same mode up. What each mode gates:

     roll  — Crawl, plus a stripped primary nav: Overview, Product Portfolio,
             Reports, Profile, Invoices, and WISEcode Admin (Organizations,
             User Management, Audit Queue, Quick Invite, Admin Utils). Studio,
             comparison, dashboards, and the upgrade card are hidden.
     crawl — SaaS only. Every WISEcodeAI chat surface is hidden AND taken out
             of the a11y/focus tree (inert + aria-hidden). Remaining modules
             grow to fill the modules-row — no leftover empty width. The
             primary nav has no borders; the first remaining module keeps its
             card border and rounded corners.
     walk  — Chat turns on. Four-tier widths (single / double / triple / fill)
             stay fluid. The composer rail is hidden and inert; intent chips
             stay visible. Focus never lands in the hidden input.
     run   — Unlocks the composer and docks it at the very bottom of the chat.
             Focus goes to the actual <textarea>, while .fl-input-wrap (the
             focus container) shows the focused UI via :focus-within.

   The floating widget is ON by default, with the mode set to Run. The
   Appearance popover switch persists 'wise-cwr-ui' and toggles `cwr-ui-on`
   on <html>. While the widget is hidden, mode gating is suspended too.

   Chrome lives in a Shadow DOM so page-level button / .material-symbols-outlined
   rules cannot restyle it. One component, one look, every page. Drag it
   anywhere; the spot is stored in localStorage ('wise-cwr-pos') so every page
   opens it where you left it. Double-click restores the default right-edge seat.

   Include with: <script src="../js/cwr-toggle.js"></script> in <head>. */
(function () {
  'use strict';

  var KEY = 'wise-cwr-mode';
  var UI_KEY = 'wise-cwr-ui';
  var POS_KEY = 'wise-cwr-pos';
  var EDGE = 8;
  var DRAG_THRESHOLD = 6;
  var MODES = ['roll', 'crawl', 'walk', 'run'];
  var META = {
    roll: { icon: 'cached', label: 'Roll', desc: 'SaaS nav only — crawl without extra destinations' },
    crawl: { icon: 'child_care', label: 'Crawl', desc: 'SaaS modules fill the row — no chat' },
    walk: { icon: 'directions_walk', label: 'Walk', desc: 'Chat on — chips, four-tier widths, no composer' },
    run: { icon: 'directions_run', label: 'Run', desc: 'Unlock the composer at the bottom' }
  };

  var hostRef = null;
  var pillRef = null;
  var shadowRef = null;
  var dragLive = false;

  function cwrButtons() {
    if (pillRef) return Array.prototype.slice.call(pillRef.querySelectorAll('.cwr-btn'));
    var root = shadowRef || (hostRef && hostRef.shadowRoot);
    if (!root) return [];
    return Array.prototype.slice.call(root.querySelectorAll('.cwr-btn'));
  }

  function isSaasMode(mode) {
    return mode === 'roll' || mode === 'crawl';
  }

  /* Every chat surface the modes hide. Keep in sync with the CSS list below. */
  var CHAT_SEL = [
    '.wch-chat-anchor', '.wiseai-dock', '.wiseai-dock-fab',
    '#chat-shell', '#wa-chat', '.wa-chat',
    '.ap-chat', '.rf-chat', '.gs-chat', '.sa-chat', '.aid-chat',
    '#wiseai-dock-panel', '#wiseai-panel', '#pf-chat-panel',
    '.wch-sidebar'
  ].join(',');
  var RAIL_SEL = '.chat-input-rail';
  var ACTUAL_INPUT_SEL = RAIL_SEL + ' textarea.fl-input, ' + RAIL_SEL + ' input.fl-input, ' + RAIL_SEL + ' .fl-input';

  function readMode() {
    try {
      var v = localStorage.getItem(KEY);
      return MODES.indexOf(v) !== -1 ? v : 'run';
    } catch (e) { return 'run'; }
  }

  function isUiOn() {
    try { return localStorage.getItem(UI_KEY) !== '0'; } catch (e) { return true; }
  }

  function prefersReduced() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e) { return false; }
  }

  function applyUi() {
    document.documentElement.classList.toggle('cwr-ui-on', isUiOn());
  }

  function applyMode(mode, opts) {
    opts = opts || {};
    var root = document.documentElement;
    var prev = MODES.filter(function (m) { return root.classList.contains('cwr-' + m); })[0] || '';
    MODES.forEach(function (m) { root.classList.toggle('cwr-' + m, m === mode); });
    try { localStorage.setItem(KEY, mode); } catch (e) { /* private mode */ }
    gateA11y(mode);
    if (isSaasMode(mode) && isUiOn()) fillCrawlLeftover();
    else clearCrawlFill();
    reflow();
    if (opts.fromUser && mode === 'run' && prev !== 'run') unlockComposer();
    if (opts.fromUser && mode === 'walk' && (prev === 'crawl' || prev === 'roll')) {
      root.classList.add('cwr-walking');
      setTimeout(function () { root.classList.remove('cwr-walking'); }, 480);
    }
    try { window.dispatchEvent(new CustomEvent('wise:cwr-mode', { detail: { mode: mode } })); } catch (e) {}
    schedulePlace();
    setTimeout(placeToggle, 400);
  }

  /* ---- a11y: hidden surfaces leave the focus/AT tree; focus never stays
     inside a display:none / inert container. The visual control (the circular
     radio) — not the outer pill — is what receives :focus-visible. ---- */
  function setInert(el, on) {
    if (!el || el.nodeType !== 1) return;
    if (on) {
      el.setAttribute('inert', '');
      el.setAttribute('aria-hidden', 'true');
    } else {
      el.removeAttribute('inert');
      el.removeAttribute('aria-hidden');
    }
  }

  function each(sel, fn) {
    var list = document.querySelectorAll(sel);
    for (var i = 0; i < list.length; i++) fn(list[i]);
  }

  function isInsideGated(el) {
    if (!el || el.nodeType !== 1) return false;
    return !!(el.closest('[inert]') || el.closest('[aria-hidden="true"]'));
  }

  function evictFocus() {
    var active = document.activeElement;
    if (!active || active === document.body || active === document.documentElement) return;
    if (!isInsideGated(active)) return;
    var btns = cwrButtons();
    var fallback = btns.filter(function (b) { return b.tabIndex === 0; })[0] ||
      btns.filter(function (b) { return b.getAttribute('aria-checked') === 'true'; })[0];
    if (fallback && typeof fallback.focus === 'function') {
      try { fallback.focus({ preventScroll: true }); } catch (e) { fallback.focus(); }
      return;
    }
    if (typeof active.blur === 'function') active.blur();
  }

  function gateA11y(mode) {
    var ui = isUiOn();
    var hideChat = ui && isSaasMode(mode);
    var hideRail = ui && (isSaasMode(mode) || mode === 'walk');
    each(CHAT_SEL, function (el) { setInert(el, hideChat); });
    each(RAIL_SEL, function (el) { setInert(el, hideRail); });
    evictFocus();
  }

  function unlockComposer() {
    var root = document.documentElement;
    root.classList.add('cwr-unlocking');
    setTimeout(function () { root.classList.remove('cwr-unlocking'); }, prefersReduced() ? 0 : 980);
    /* Focus the actual input, not the wrap. The wrap is the focus container
       and paints its ring via :focus-within once the textarea is focused. */
    var input = document.querySelector(ACTUAL_INPUT_SEL);
    if (!input || input.hasAttribute('readonly') || input.getAttribute('aria-disabled') === 'true') return;
    requestAnimationFrame(function () {
      try { input.focus({ preventScroll: false }); } catch (e) { try { input.focus(); } catch (e2) {} }
    });
  }

  function isVisiblePane(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.id === 'menu-panel' || (el.classList && el.classList.contains('menu-panel'))) return false;
    if (el.hasAttribute('hidden') || el.hasAttribute('inert')) return false;
    var st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden') return false;
    return el.offsetWidth > 8 && el.offsetHeight > 0;
  }

  function clearCrawlFill() {
    each('[data-cwr-fill]', function (el) {
      el.style.removeProperty('flex');
      el.style.removeProperty('width');
      el.style.removeProperty('max-width');
      el.removeAttribute('data-cwr-fill');
    });
    each('[data-cwr-nav-seam]', function (el) {
      el.removeAttribute('data-cwr-nav-seam');
    });
  }

  /* First visible module in the row — the one that now sits against the
     primary nav once chat is gone. Group wrappers (#panels-row etc.) are
     skipped so the seam lands on the actual card. */
  function firstSeamModule(visible) {
    var el = visible[0];
    if (!el) return null;
    if (el.id === 'panels-row' || el.id === 'panels-row-right' || el.id === 'intent-stack-column') {
      for (var c = el.firstElementChild; c; c = c.nextElementSibling) {
        if (isVisiblePane(c)) return c;
      }
    }
    return el;
  }

  /* Pick the actual SaaS work surface (not a thin progress/icon rail) and let
     it absorb the width the hidden chat freed. */
  function fillCrawlLeftover() {
    clearCrawlFill();
    var row = document.getElementById('modules-row') || document.querySelector('.modules-row');
    if (!row) return;
    var dir = (getComputedStyle(row).flexDirection || '');
    if (dir.indexOf('row') !== 0) return;

    var visible = [];
    for (var c = row.firstElementChild; c; c = c.nextElementSibling) {
      if (isVisiblePane(c)) visible.push(c);
    }
    if (!visible.length) return;

    var preferred = row.querySelector('#agent-main, #nfp-panel, [data-pr-fill]');
    var absorber = (preferred && visible.indexOf(preferred) !== -1) ? preferred : null;
    if (!absorber) {
      var bestW = 0;
      visible.forEach(function (el) {
        var w = el.getBoundingClientRect().width;
        if (w > bestW && w >= 200) { bestW = w; absorber = el; }
      });
    }
    if (!absorber) absorber = visible[0];
    absorber.setAttribute('data-cwr-fill', '1');
    var seam = firstSeamModule(visible);
    if (seam) seam.setAttribute('data-cwr-nav-seam', '1');
  }

  function reflow() {
    var row = document.getElementById('modules-row') || document.querySelector('.modules-row');
    if (row && window.WisePaneResize && typeof window.WisePaneResize.release === 'function') {
      var kids = [];
      for (var c = row.firstElementChild; c; c = c.nextElementSibling) kids.push(c);
      window.WisePaneResize.release(kids);
    }
    if (window.WiseDefaultFill && typeof window.WiseDefaultFill.refresh === 'function') {
      window.WiseDefaultFill.refresh();
    }
    /* Skip the synthetic resize while the Appearance popover is open — shells
       close that menu on window resize, and this reflow is not a viewport
       change. Pane-resize / default-fill above already handled the layout. */
    try {
      if (!document.querySelector('.wise-popover.open')) {
        window.dispatchEvent(new Event('resize'));
      }
    } catch (e) {}
    schedulePlace();
  }

  /* Keep the stadium off 1px module seams and thin right-hand rails
     (progress tracker, resize handle). A straight border in the cap
     pockets is what reads as "the pill's border going past the radius". */
  var RAIL_MAX_W = 88;
  var PLACE_GAP = 32;
  var placeRaf = 0;

  function schedulePlace() {
    if (placeRaf) cancelAnimationFrame(placeRaf);
    placeRaf = requestAnimationFrame(function () {
      placeRaf = 0;
      requestAnimationFrame(placeToggle);
    });
  }

  function isThinRail(el, box) {
    if (!el) return false;
    if (el.id === 'ap-progress') return true;
    var cls = (el.className && el.className.toString) ? el.className.toString() : '';
    if (el.classList && el.classList.contains('vf-progress-pane')) return true;
    if (el.classList && el.classList.contains('gv-progress-pane')) return true;
    return !!(box && box.width > 0 && box.width < RAIL_MAX_W && cls.indexOf('progress') !== -1);
  }

  function seamInsidePill(pillBox) {
    var row = document.getElementById('modules-row') || document.querySelector('.modules-row');
    if (!row) return 0;
    var x0 = pillBox.left;
    var x1 = pillBox.right;
    var nodes = row.querySelectorAll('*');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.id === 'cwr-toggle' || el.id === 'cwr-toggle-anchor') continue;
      var b = el.getBoundingClientRect();
      if (b.height < 80 || b.width < 1) continue;
      if (b.bottom < pillBox.top || b.top > pillBox.bottom) continue;
      var st = getComputedStyle(el);
      var bl = parseFloat(st.borderLeftWidth) || 0;
      var br = parseFloat(st.borderRightWidth) || 0;
      var ol = st.outlineStyle !== 'none' ? (parseFloat(st.outlineWidth) || 0) : 0;
      if (bl >= 1 && b.left >= x0 && b.left <= x1) return b.left;
      if (br >= 1 && b.right >= x0 && b.right <= x1) return b.right;
      if (ol >= 1 && b.right >= x0 && b.right <= x1) return b.right;
      if (ol >= 1 && b.left >= x0 && b.left <= x1) return b.left;
    }
    return 0;
  }

  function readPos() {
    try {
      var raw = localStorage.getItem(POS_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (o && typeof o.left === 'number' && typeof o.top === 'number' &&
          isFinite(o.left) && isFinite(o.top)) return o;
    } catch (e) { /* private mode / bad JSON */ }
    return null;
  }

  function writePos(left, top) {
    try { localStorage.setItem(POS_KEY, JSON.stringify({ left: left, top: top })); }
    catch (e) { /* private mode */ }
  }

  function clearPos() {
    try { localStorage.removeItem(POS_KEY); } catch (e) { /* private mode */ }
  }

  function pillSize() {
    var pill = pillRef;
    var w = (pill && pill.offsetWidth) || 58;
    var h = (pill && pill.offsetHeight) || 208;
    return { w: w, h: h };
  }

  function clampPos(left, top) {
    var size = pillSize();
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var maxL = Math.max(EDGE, vw - size.w - EDGE);
    var maxT = Math.max(EDGE, vh - size.h - EDGE);
    return {
      left: Math.min(maxL, Math.max(EDGE, Math.round(left))),
      top: Math.min(maxT, Math.max(EDGE, Math.round(top)))
    };
  }

  function applyCustomPos(left, top) {
    var anchor = hostRef || document.getElementById('cwr-toggle-anchor');
    if (!anchor) return null;
    var c = clampPos(left, top);
    anchor.style.left = c.left + 'px';
    anchor.style.top = c.top + 'px';
    anchor.style.right = 'auto';
    anchor.style.transform = 'none';
    anchor.classList.add('cwr-custom');
    return c;
  }

  function clearCustomPosStyle() {
    var anchor = hostRef || document.getElementById('cwr-toggle-anchor');
    if (!anchor) return;
    anchor.style.left = '';
    anchor.style.top = '';
    anchor.style.right = '';
    anchor.style.transform = '';
    anchor.classList.remove('cwr-custom');
  }

  function placeToggle() {
    var anchor = hostRef || document.getElementById('cwr-toggle-anchor');
    var pill = pillRef;
    if (!anchor || !pill || !isUiOn() || dragLive) return;
    var saved = readPos();
    if (saved) {
      var placed = applyCustomPos(saved.left, saved.top);
      if (placed && (placed.left !== saved.left || placed.top !== saved.top)) {
        writePos(placed.left, placed.top);
      }
      return;
    }
    clearCustomPosStyle();
    var vw = window.innerWidth;
    var pillW = pill.offsetWidth || 40;
    var rightPx = 24;
    var row = document.getElementById('modules-row') || document.querySelector('.modules-row');
    if (row) {
      var rightmost = null;
      var maxR = 0;
      for (var c = row.firstElementChild; c; c = c.nextElementSibling) {
        if (!isVisiblePane(c)) continue;
        var b = c.getBoundingClientRect();
        if (b.right >= maxR) { maxR = b.right; rightmost = c; }
      }
      if (rightmost) {
        var rb = rightmost.getBoundingClientRect();
        var targetRight = isThinRail(rightmost, rb)
          ? rb.left - PLACE_GAP
          : rb.right - PLACE_GAP;
        rightPx = vw - targetRight;
      }
    }
    if (rightPx < EDGE) rightPx = EDGE;
    if (rightPx + pillW > vw - EDGE) rightPx = EDGE;
    anchor.style.right = Math.round(rightPx) + 'px';

    var box = pill.getBoundingClientRect();
    var n = 0;
    while (n < 6) {
      var seam = seamInsidePill(box);
      if (!seam) break;
      var onRight = seam >= box.right - 8;
      var onLeft = seam <= box.left + 8;
      if (!onRight && !onLeft) break;
      if (onRight) rightPx += 8;
      else rightPx = Math.max(EDGE, rightPx - 8);
      if (rightPx + pillW > vw - EDGE) break;
      anchor.style.right = Math.round(rightPx) + 'px';
      box = pill.getBoundingClientRect();
      n += 1;
    }
  }

  /* ---- mode CSS + widget chrome (injected so it works on every page) ---- */
  var css = [
    /* ===== CRAWL — hide every chat surface; SaaS fills the row ===== */
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) .wch-chat-anchor,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) .wiseai-dock,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) .wiseai-dock-fab,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #chat-shell,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #wa-chat,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) .wa-chat,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) .ap-chat,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) .rf-chat,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) .gs-chat,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) .sa-chat,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) .aid-chat,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #wiseai-dock-panel,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #wiseai-panel,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #pf-chat-panel,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) .wch-sidebar,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) .chat-input-rail { display: none !important; }',

    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) .modules-row {',
    '  container-type: inline-size; container-name: cwr-row;',
    '}',
    /* Roll / Crawl: the primary nav has no frame. Chat is gone, so un-tuck
       the first remaining module and restore its full card — border on every
       side, rounded corners on top and bottom. The usual nav↔module gap stays
       so those corners can read. Nested drawers keep their tuck. */
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #menu-panel.mp-open:not(.mp-pivot) .menu-inner {',
    '  border: none !important;',
    '}',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row [data-cwr-nav-seam],',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row [data-cwr-nav-seam].sticky-mod.is-sticky,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row [data-cwr-nav-seam].wa-pane.is-open.is-sticky,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row #agent-main[data-cwr-nav-seam],',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row #nfp-panel[data-cwr-nav-seam],',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row #agent-main[data-cwr-nav-seam].sticky-mod.is-sticky {',
    '  margin-left: 0 !important;',
    '  padding-left: 0 !important;',
    '  height: 100% !important;',
    '  max-height: 100% !important;',
    '  align-self: stretch !important;',
    '}',
    /* Direct-card modules: restore the left edge the sticky tuck strips. */
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row [data-cwr-nav-seam].sticky-mod.is-sticky:not(:has(> .panel-inner)):not(:has(> [class*="-inner"])),',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row [data-cwr-nav-seam].wa-pane.is-open.is-sticky,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row #wa-results[data-cwr-nav-seam],',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row #wa-visuals[data-cwr-nav-seam],',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row #wa-unified[data-cwr-nav-seam] {',
    '  border-left: 1px solid var(--border) !important;',
    '  border-radius: var(--r-md, 16px) !important;',
    '}',
    /* Wrapper-based modules: the inner card is the visible frame. */
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row [data-cwr-nav-seam].sticky-mod.is-sticky > .panel-inner,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row [data-cwr-nav-seam].sticky-mod.is-sticky > [class*="-inner"],',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row #nfp-panel[data-cwr-nav-seam] > .nfp-inner,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row #nfp-panel[data-cwr-nav-seam].sticky-mod.is-sticky > .nfp-inner,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row #agent-main[data-cwr-nav-seam] > .agent-main-inner,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row #agent-main[data-cwr-nav-seam].sticky-mod.is-sticky > .agent-main-inner {',
    '  border-left: 1px solid var(--border) !important;',
    '  border-radius: var(--r-md, 16px) !important;',
    '}',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row [data-cwr-nav-seam].sticky-mod.is-sticky:has(> .panel-inner)::before,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row [data-cwr-nav-seam].sticky-mod.is-sticky:has(> [class*="-inner"])::before {',
    '  display: none;',
    '}',
    /* Nested drawers stay tucked in Roll / Crawl (chat is gone; they still
       sit behind their left neighbour). Beat any leftover un-tuck. */
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row #help-contact.sticky-mod.is-sticky,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row .vf-progress-pane.sticky-mod.is-sticky,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row .gv-progress-pane.sticky-mod.is-sticky,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row #ap-progress.sticky-mod.is-sticky,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row #wa-report.wa-pane.is-open.is-sticky {',
    '  margin-left: calc(-14px - var(--modules-gap, 8px)) !important;',
    '  padding-left: 14px !important;',
    '  border-left: 0 !important;',
    '  border-top-left-radius: 0 !important;',
    '  border-bottom-left-radius: 0 !important;',
    '}',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row .vf-progress-pane.sticky-mod.is-sticky > .vfp-inner,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row .gv-progress-pane.sticky-mod.is-sticky > .gvp-inner,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #modules-row #ap-progress.sticky-mod.is-sticky > .vfp-inner {',
    '  border-left: 0 !important;',
    '  border-top-left-radius: 0 !important;',
    '  border-bottom-left-radius: 0 !important;',
    '}',
    /* The actual SaaS work surface absorbs leftover width. Fixed rails
       (progress, icon columns) keep their natural size so they do not
       become empty "focus containers" beside a stretched void. */
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #agent-main,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #agent-main.main-w-narrow,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #agent-main.main-w-wide,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #agent-main.main-w-triple,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #nfp-panel,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) [data-cwr-fill] {',
    '  flex: 1 1 0% !important;',
    '  width: auto !important;',
    '  min-width: 0 !important;',
    '  max-width: none !important;',
    '}',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #agent-main > .agent-main-inner,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) #nfp-panel > .nfp-inner,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) [data-cwr-fill] > [class$="-inner"],',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) [data-cwr-fill] > .panel-inner {',
    '  width: 100% !important;',
    '  max-width: none !important;',
    '  flex: 1 1 auto !important;',
    '  min-width: 0 !important;',
    '}',
    /* Empty product-identity column: the actual fields fill the grid cell
       instead of sitting as a small island in a tall beige focus container. */
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) .nfp-sp-media {',
    '  display: flex !important;',
    '  flex-direction: column !important;',
    '  min-width: 0 !important;',
    '}',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) .nfp-sp-media .nfp-hero--rich,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) .nfp-sp-media .nfp-hero--rich.nfp-hero--empty {',
    '  flex: 1 1 auto !important;',
    '  height: auto !important;',
    '  min-height: 100% !important;',
    '  display: flex !important;',
    '  flex-direction: column !important;',
    '}',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) .nfp-sp-media .nfp-hero--empty .nfp-hero-stack {',
    '  flex: 1 1 auto !important;',
    '  justify-content: center !important;',
    '  width: 100% !important;',
    '}',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) .nfp-hero-cat,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) .nfp-hero-upc,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) .nfp-hero-upc.nfp-rupc {',
    '  max-width: min(520px, 92%) !important;',
    '  width: 100% !important;',
    '}',
    /* Chat card is never the focus ring — the composer wrap is. */
    'html.cwr-ui-on :is(.ap-chat, .rf-chat, .sa-chat, .gs-chat, .wa-chat, .sc-card, .wch-chat-anchor, #chat-shell):focus,',
    'html.cwr-ui-on :is(.ap-chat, .rf-chat, .sa-chat, .gs-chat, .wa-chat, .sc-card, .wch-chat-anchor, #chat-shell):focus-visible {',
    '  outline: none;',
    '}',

    /* ===== ROLL — crawl, plus a stripped SaaS nav ===== */
    'html.cwr-ui-on.cwr-roll .menu-nav [data-nav-id="comparison"],',
    'html.cwr-ui-on.cwr-roll .menu-nav [data-nav-id="non-upf-dashboard"],',
    'html.cwr-ui-on.cwr-roll .menu-nav [data-nav-id="ai-dashboard"],',
    'html.cwr-ui-on.cwr-roll .menu-nav [data-nav-id="marketing-assets"],',
    'html.cwr-ui-on.cwr-roll .menu-nav [data-nav-id="reformulation"],',
    'html.cwr-ui-on.cwr-roll .menu-nav [data-nav-id="studio-ai"],',
    'html.cwr-ui-on.cwr-roll .menu-nav [data-nav-id="wiseai"],',
    'html.cwr-ui-on.cwr-roll .menu-nav [data-nav-id="wiseai-chat"],',
    'html.cwr-ui-on.cwr-roll .menu-nav [data-nav-id="library"],',
    'html.cwr-ui-on.cwr-roll .menu-nav [data-nav-id="ingredients"],',
    'html.cwr-ui-on.cwr-roll .menu-nav-group[data-group="wiseai"],',
    'html.cwr-ui-on.cwr-roll .menu-nav-group[data-group="nav-history"],',
    'html.cwr-ui-on.cwr-roll .menu-nav-upgrade,',
    'html.cwr-ui-on.cwr-roll .menu-nav-section[data-nav-section="studio"] {',
    '  display: none !important;',
    '}',

    /* ===== WALK — chat on, composer gone, four-tier widths stay fluid ===== */
    'html.cwr-ui-on.cwr-walk .chat-input-rail { display: none !important; }',
    'html.cwr-ui-on.cwr-walk .sc-intent-chips-hidden .sc-welcome .ws-chips-scroll { display: block !important; }',
    'html.cwr-ui-on.cwr-walk .sc-intent-chips-hidden .sc-welcome .ws-chips-wrap,',
    'html.cwr-ui-on.cwr-walk .sc-intent-chips-hidden .sc-welcome > .ws-chips { display: flex !important; }',
    'html.cwr-ui-on.cwr-walk .sc-body,',
    'html.cwr-ui-on.cwr-walk .ap-chat-body,',
    'html.cwr-ui-on.cwr-walk .rf-chat-body,',
    'html.cwr-ui-on.cwr-walk .sa-chat-body {',
    '  flex: 1 1 auto !important;',
    '  min-height: 0 !important;',
    '}',
    'html.cwr-ui-on.cwr-walk #modules-row { container-type: inline-size; container-name: cwr-row; }',
    /* Single / double / triple stay fluid; fill takes leftover. */
    'html.cwr-ui-on.cwr-walk :is(.wch-chat-anchor, .ap-chat, .rf-chat, .sa-chat, .gs-chat, .aid-chat, #chat-shell, .wiseai-dock).panel-wide:not(.panel-triple) {',
    '  flex-basis: clamp(320px, 42cqi, 580px) !important;',
    '  width: clamp(320px, 42cqi, 580px) !important;',
    '  max-width: 100% !important;',
    '}',
    'html.cwr-ui-on.cwr-walk :is(.wch-chat-anchor, .ap-chat, .rf-chat, .sa-chat, .gs-chat, .aid-chat, #chat-shell, .wiseai-dock).panel-triple:not(.panel-fill) {',
    '  flex-basis: clamp(420px, 56cqi, 760px) !important;',
    '  width: clamp(420px, 56cqi, 760px) !important;',
    '  max-width: 100% !important;',
    '}',
    'html.cwr-ui-on.cwr-walk :is(.wch-chat-anchor, .ap-chat, .rf-chat, .sa-chat, .gs-chat, .aid-chat, #chat-shell, .wiseai-dock, #wa-chat, .wa-chat).panel-fill {',
    '  flex: 1 1 auto !important;',
    '  width: auto !important;',
    '  min-width: 0 !important;',
    '  max-width: none !important;',
    '}',
    'html.cwr-ui-on.cwr-walk.cwr-walking :is(.wch-chat-anchor, .ap-chat, .rf-chat, .sa-chat, .gs-chat, .wa-chat, #wa-chat, #chat-shell, .wiseai-dock) {',
    '  animation: cwrWalkIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;',
    '}',
    '@keyframes cwrWalkIn {',
    '  from { opacity: 0; transform: translateX(-18px) scale(0.97); }',
    '  to { opacity: 1; transform: none; }',
    '}',

    /* ===== RUN — composer docks to the very bottom; unlock is trippy ===== */
    'html.cwr-ui-on.cwr-run :is(.wch-chat-anchor, .ap-chat, .rf-chat, .sa-chat, .gs-chat, .wa-chat, .sc-card) {',
    '  display: flex !important;',
    '  flex-direction: column !important;',
    '}',
    'html.cwr-ui-on.cwr-run .chat-input-rail {',
    '  display: flex !important;',
    '  flex-direction: column;',
    '  margin-top: auto;',
    '  position: sticky;',
    '  bottom: 0;',
    '  z-index: 30;',
    '  padding-bottom: max(10px, env(safe-area-inset-bottom, 0px));',
    '}',
    'html.cwr-ui-on.cwr-run.cwr-unlocking .chat-input-rail {',
    '  animation: cwrUnlockDrop 0.92s cubic-bezier(0.22, 1.25, 0.36, 1) both;',
    '  transform-origin: center bottom;',
    '}',
    'html.cwr-ui-on.cwr-run.cwr-unlocking .fl-input-wrap {',
    '  animation: cwrUnlockChroma 0.92s ease both;',
    '}',
    '@keyframes cwrUnlockDrop {',
    '  0% { transform: translate3d(0, -46%, 0) scale(0.84, 1.12); filter: hue-rotate(260deg) saturate(2.4) contrast(1.3) blur(2px); opacity: 0; }',
    '  22% { transform: translate3d(-8px, -8%, 0) scale(1.07, 0.93); filter: hue-rotate(-70deg) saturate(2.1); opacity: 1; }',
    '  40% { transform: translate3d(7px, 16%, 0) scale(0.95, 1.07); filter: hue-rotate(130deg) saturate(1.8); }',
    '  58% { transform: translate3d(-3px, 3%, 0) scale(1.03, 0.97); filter: hue-rotate(-16deg) saturate(1.35); }',
    '  76% { transform: translate3d(0, -2%, 0); filter: hue-rotate(18deg) saturate(1.12); }',
    '  100% { transform: none; filter: none; opacity: 1; }',
    '}',
    '@keyframes cwrUnlockChroma {',
    '  0%, 100% { box-shadow: none; }',
    '  24% { box-shadow: -8px 0 0 -3px #ff2bd6, 8px 0 0 -3px #18f0ff, 0 0 28px color-mix(in srgb, var(--primary) 50%, transparent); }',
    '  52% { box-shadow: 6px 0 0 -3px #ff2bd6, -6px 0 0 -3px #18f0ff, 0 14px 36px color-mix(in srgb, var(--primary) 36%, transparent); }',
    '}',
    '@media (prefers-reduced-motion: reduce) {',
    '  html.cwr-ui-on.cwr-walk.cwr-walking :is(.wch-chat-anchor, .ap-chat, .rf-chat, .sa-chat, .gs-chat, .wa-chat, #wa-chat, #chat-shell, .wiseai-dock),',
    '  html.cwr-ui-on.cwr-run.cwr-unlocking .chat-input-rail,',
    '  html.cwr-ui-on.cwr-run.cwr-unlocking .fl-input-wrap { animation: none !important; filter: none !important; }',
    '}',

    /* ===== Widget host — transform lives on the OUTER anchor, never on
       the bordered pill. A 1px border + translateY on the same node paints
       a straight edge past the radius (the spike at the caps). The pill
       itself is styled inside the shadow tree so page CSS cannot leak in. ===== */
    '#cwr-toggle-anchor { display: none; }',
    'html.cwr-ui-on #cwr-toggle-anchor {',
    '  display: block;',
    '  position: fixed; right: 26px; top: 50%; transform: translateY(-50%);',
    '  z-index: 10500;',
    '  filter: drop-shadow(0 6px 16px rgba(17, 24, 39, 0.18));',
    '  touch-action: none;',
    '}',
    'html.cwr-ui-on #cwr-toggle-anchor.cwr-custom {',
    '  transform: none;',
    '  right: auto;',
    '}',
    'html.cwr-ui-on #cwr-toggle-anchor.is-dragging {',
    '  z-index: 10600;',
    '  cursor: grabbing;',
    '}',
    'html.dark.cwr-ui-on #cwr-toggle-anchor {',
    '  filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.5));',
    '}'
  ].join('\n');

  /* Shadow-tree chrome — px sizes, full Material Symbols face, no rem.
     Matches the canonical stadium: 48px circular radios, icon above label,
     selected fill is brand primary. */
  var widgetCss = [
    ':host { display: block; }',
    '#cwr-toggle {',
    '  display: flex; flex-direction: column; align-items: center;',
    '  gap: 2px; padding: 4px; border-radius: 999px;',
    '  box-sizing: border-box;',
    '  overflow: hidden;',
    '  isolation: isolate;',
    '  background: var(--surface, #fff);',
    '  border: 1px solid var(--border-strong, rgba(37, 80, 124, 0.28));',
    '  font-family: "DM Sans", system-ui, sans-serif;',
    '  outline: none;',
    '  -webkit-user-select: none; user-select: none;',
    '  cursor: grab;',
    '  touch-action: none;',
    '}',
    ':host(.is-dragging) #cwr-toggle { cursor: grabbing; }',
    '#cwr-toggle:focus, #cwr-toggle:focus-visible, #cwr-toggle:focus-within { outline: none; }',
    '.cwr-btn {',
    '  -webkit-appearance: none; appearance: none;',
    '  display: flex; flex-direction: column; align-items: center; justify-content: center;',
    '  gap: 2px;',
    '  box-sizing: border-box;',
    '  width: 48px; height: 48px; min-width: 48px; min-height: 48px;',
    '  max-width: 48px; max-height: 48px;',
    '  margin: 0; padding: 0;',
    '  border: none; border-radius: 999px; flex-shrink: 0;',
    '  background: transparent; cursor: grab;',
    '  color: var(--text-muted, #444B55);',
    '  font-family: inherit; font-size: 8px; line-height: 1;',
    '  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;',
    '  outline: none;',
    '}',
    '.cwr-btn:hover { background: var(--primary-soft, rgba(37, 80, 124, 0.08)); color: var(--primary, #25507C); }',
    '.cwr-btn[aria-checked="true"],',
    '.cwr-btn[aria-checked="true"]:hover { background: var(--primary, #25507C); color: #fff; }',
    ':host-context(html.dark) .cwr-btn:hover { color: var(--primary-bright, #8B9FAF); }',
    ':host-context(html.dark) .cwr-btn[aria-checked="true"],',
    ':host-context(html.dark) .cwr-btn[aria-checked="true"]:hover { background: var(--primary, #25507C); color: #fff; }',
    '.cwr-btn:focus-visible {',
    '  outline: 2px solid var(--primary, #25507C);',
    '  outline-offset: 1px;',
    '  z-index: 1;',
    '}',
    '.cwr-btn[aria-checked="true"]:focus-visible {',
    '  outline-color: #fff;',
    '  box-shadow: 0 0 0 2px var(--primary, #25507C);',
    '}',
    ':host-context(html.dark) .cwr-btn:focus-visible {',
    '  outline-color: var(--primary-bright, #8B9FAF);',
    '}',
    ':host-context(html.dark) .cwr-btn[aria-checked="true"]:focus-visible {',
    '  outline-color: #fff;',
    '  box-shadow: 0 0 0 2px var(--primary-bright, #8B9FAF);',
    '}',
    '.cwr-btn .material-symbols-outlined {',
    '  font-family: "Material Symbols Outlined";',
    '  font-weight: normal; font-style: normal;',
    '  font-size: 20px; line-height: 1;',
    '  letter-spacing: normal; text-transform: none;',
    '  display: block; white-space: nowrap; word-wrap: normal;',
    '  direction: ltr;',
    '  -webkit-font-feature-settings: "liga";',
    '  font-feature-settings: "liga";',
    '  -webkit-font-smoothing: antialiased;',
    '  font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;',
    '}',
    '.cwr-btn .cwr-btn-label {',
    '  display: block;',
    '  font-family: inherit;',
    '  font-size: 8px; font-weight: 700;',
    '  letter-spacing: 0.06em; text-transform: uppercase;',
    '  line-height: 1; white-space: nowrap;',
    '  color: inherit;',
    '}'
  ].join('\n');

  var style = document.createElement('style');
  style.id = 'cwr-toggle-style';
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  applyMode(readMode());
  applyUi();

  function mountWidget() {
    if (document.getElementById('cwr-toggle-anchor')) return;
    var anchor = document.createElement('div');
    anchor.id = 'cwr-toggle-anchor';
    var shadow = anchor.attachShadow({ mode: 'open' });
    var shadowStyle = document.createElement('style');
    shadowStyle.textContent = widgetCss;
    var wrap = document.createElement('div');
    wrap.id = 'cwr-toggle';
    wrap.setAttribute('role', 'radiogroup');
    wrap.setAttribute('aria-label', 'Rollout mode. Drag to move. Double-click to restore the default position.');
    wrap.setAttribute('title', 'Drag to move · Double-click to restore');
    wrap.innerHTML = MODES.map(function (m) {
      var meta = META[m];
      return '<button type="button" class="cwr-btn" role="radio" id="cwr-btn-' + m + '"' +
        ' data-mode="' + m + '"' +
        ' aria-label="' + meta.label + ' — ' + meta.desc + '"' +
        ' title="' + meta.label + ' — ' + meta.desc + '">' +
        '<span class="material-symbols-outlined" aria-hidden="true">' + meta.icon + '</span>' +
        '<span class="cwr-btn-label" aria-hidden="true">' + meta.label + '</span>' +
        '</button>';
    }).join('');

    hostRef = anchor;
    pillRef = wrap;
    shadowRef = shadow;

    function sync() {
      var mode = readMode();
      cwrButtons().forEach(function (btn) {
        var on = btn.dataset.mode === mode;
        btn.setAttribute('aria-checked', on ? 'true' : 'false');
        /* Roving tabindex: only the selected radio is in the tab order.
           Arrow keys move between them. Focus stays on the actual button. */
        btn.tabIndex = on ? 0 : -1;
      });
    }

    function select(mode, fromUser) {
      applyMode(mode, { fromUser: !!fromUser });
      sync();
    }

    var suppressClick = false;
    var dragOrigin = null;

    function onWinMove(e) {
      if (!dragOrigin || e.pointerId !== dragOrigin.id) return;
      var dx = e.clientX - dragOrigin.x;
      var dy = e.clientY - dragOrigin.y;
      if (!dragLive) {
        if ((dx * dx + dy * dy) < DRAG_THRESHOLD * DRAG_THRESHOLD) return;
        dragLive = true;
        anchor.classList.add('is-dragging');
        applyCustomPos(dragOrigin.left, dragOrigin.top);
      }
      e.preventDefault();
      applyCustomPos(dragOrigin.left + dx, dragOrigin.top + dy);
    }

    function endDrag(e) {
      if (!dragOrigin) return;
      if (e && dragOrigin.id !== e.pointerId) return;
      window.removeEventListener('pointermove', onWinMove, true);
      window.removeEventListener('pointerup', endDrag, true);
      window.removeEventListener('pointercancel', endDrag, true);
      var moved = dragLive;
      dragOrigin = null;
      dragLive = false;
      anchor.classList.remove('is-dragging');
      if (moved) {
        if (e) e.preventDefault();
        suppressClick = true;
        var box = anchor.getBoundingClientRect();
        var saved = applyCustomPos(box.left, box.top);
        if (saved) writePos(saved.left, saved.top);
      }
    }

    wrap.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 && e.pointerType !== 'touch') return;
      var box = anchor.getBoundingClientRect();
      dragOrigin = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        left: box.left,
        top: box.top
      };
      dragLive = false;
      window.addEventListener('pointermove', onWinMove, true);
      window.addEventListener('pointerup', endDrag, true);
      window.addEventListener('pointercancel', endDrag, true);
    });

    wrap.addEventListener('dblclick', function (e) {
      e.preventDefault();
      e.stopPropagation();
      clearPos();
      clearCustomPosStyle();
      placeToggle();
    });

    wrap.addEventListener('click', function (e) {
      if (suppressClick) {
        e.preventDefault();
        e.stopPropagation();
        suppressClick = false;
        return;
      }
      var btn = e.target.closest('.cwr-btn');
      if (!btn) return;
      select(btn.dataset.mode, true);
      btn.focus();
    });

    wrap.addEventListener('keydown', function (e) {
      var btns = cwrButtons();
      var i = btns.indexOf(shadow.activeElement);
      if (i < 0) return;
      var next = -1;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (i + 1) % btns.length;
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (i - 1 + btns.length) % btns.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = btns.length - 1;
      else return;
      e.preventDefault();
      select(btns[next].dataset.mode, true);
      btns[next].focus();
    });

    shadow.appendChild(shadowStyle);
    shadow.appendChild(wrap);
    sync();
    document.body.appendChild(anchor);
    gateA11y(readMode());
    schedulePlace();
    setTimeout(placeToggle, 400);
    window.addEventListener('resize', schedulePlace);

    window.addEventListener('storage', function (e) {
      if (e.key === KEY) { applyMode(readMode()); sync(); }
      else if (e.key === UI_KEY) { applyUi(); gateA11y(readMode()); }
      else if (e.key === POS_KEY) { schedulePlace(); }
    });
  }

  document.addEventListener('wise:cwr-ui', function () {
    applyUi();
    var mode = readMode();
    gateA11y(mode);
    if (isUiOn() && isSaasMode(mode)) fillCrawlLeftover();
    else clearCrawlFill();
    reflow();
    schedulePlace();
  });

  /* Late-mounted chats (dock, shared mount) need the same inert/aria-hidden. */
  if (typeof MutationObserver !== 'undefined') {
    var moPending = false;
    var mo = new MutationObserver(function () {
      if (moPending) return;
      moPending = true;
      requestAnimationFrame(function () {
        moPending = false;
        var mode = readMode();
        gateA11y(mode);
        if (isUiOn() && isSaasMode(mode)) fillCrawlLeftover();
        schedulePlace();
      });
    });
    function watch() {
      if (!document.body) return;
      mo.observe(document.body, { childList: true, subtree: true });
    }
    if (document.body) watch();
    else document.addEventListener('DOMContentLoaded', watch);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      mountWidget();
      var mode = readMode();
      gateA11y(mode);
      if (isUiOn() && isSaasMode(mode)) fillCrawlLeftover();
      schedulePlace();
    });
  } else {
    mountWidget();
    var mode = readMode();
    gateA11y(mode);
    if (isSaasMode(mode) && isUiOn()) fillCrawlLeftover();
    schedulePlace();
  }
})();
