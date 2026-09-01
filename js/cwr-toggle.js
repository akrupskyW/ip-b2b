/* Roll / Crawl / Walk / Run rollout toggle — a floating segmented control pinned to
   the right edge of the screen (12px inset), vertically centered, on every
   pages/*.html. That seat is the load default. Drag moves it for the session
   (and later loads, until a double-click restores the default).

   Load default is per page, not a shared last-used mode:
     run  — pages/wiseai.html, pages/view-product.html, pages/add-product.html, pages/helix.html
     roll — every other page
   Clicking a mode still applies it for this visit; the next load (or a
   different page) re-applies that page's default. localStorage
   ('wise-cwr-mode') is a snapshot of the in-session choice only.

   pages/helix.html is Run-only. Roll, Crawl, and Walk lock on that page
   (dimmed, not-allowed, aria-disabled) so the playground cannot hide
   itself. A click or arrow on a locked mode is ignored.

   What each mode gates:

     roll  — Crawl, plus a stripped primary nav: Overview, Product Portfolio,
             Reports, Profile, Invoices, Marketing Assets, and WISEcode Admin
             (Organizations, User Management, Audit Queue, Quick Invite, Admin
             Utils). Studio, comparison, dashboards, and the upgrade card are
             hidden. History is gone entirely (same as Crawl) — no History
             module, no History-in-nav section, no History icon, no new-chat
             circle.
     crawl — SaaS only. Every WISEcodeAI chat surface is hidden AND taken out
             of the a11y/focus tree (inert + aria-hidden). Remaining modules
             grow to fill the modules-row — no leftover empty width. The
             primary nav has no borders; the first remaining module keeps its
             card border and rounded corners. History is gone entirely — no
             History              module, no History-in-nav section, no History icon, no
             new-chat circle.
     walk  — Chat turns on. Four-tier widths (single / double / triple / fill)
             stay fluid. The composer rail is hidden and inert; intent chips
             stay visible. Focus never lands in the hidden input.
     run   — Unlocks the composer and docks it at the very bottom of the chat.
             Focus goes to the actual <textarea>, while .fl-input-wrap (the
             focus container) shows the focused UI via :focus-within.

   The floating widget is ON by default. The Appearance popover switch
   persists 'wise-cwr-ui' and toggles `cwr-ui-on` on <html>. While the
   widget is hidden, mode gating is suspended too.

   Chrome lives in a Shadow DOM so page-level button / .material-symbols-outlined
   rules cannot restyle it. One component, one look, every page. Drag it
   anywhere; the spot is stored in localStorage ('wise-cwr-pos') so every page
   opens it where you left it. Double-click restores the default seat:
   vertically centered, 12px from the right edge of the viewport. Do not
   dock it to a module, a rail, or the modules-row.

   Include with: <script src="../js/cwr-toggle.js"></script> in <head>. */
(function () {
  'use strict';

  var KEY = 'wise-cwr-mode';
  var UI_KEY = 'wise-cwr-ui';
  var POS_KEY = 'wise-cwr-pos';
  var EDGE = 8;
  var DEFAULT_RIGHT = 12;
  var DRAG_THRESHOLD = 6;
  var MODES = ['roll', 'crawl', 'walk', 'run'];
  var RUN_PAGES = ['wiseai.html', 'view-product.html', 'add-product.html', 'helix.html'];
  var RUN_ONLY_PAGES = ['helix.html'];
  var META = {
    roll: {
      icon: 'cached',
      label: 'Roll',
      desc: 'SaaS core only — no chat, no extra destinations',
      includes: 'Overview, Product Portfolio, Reports, Profile, Invoices, Marketing Assets, and WISEcode Admin (Organizations, User Management, Audit Queue, Quick Invite, Admin Utils). Remaining modules fill the row.',
      excludes: 'Chat, the composer, History (the History module, the History icon, History in the nav, and the new-chat circle), WISEcodeAI (Chat, Library, Ingredient Browser), Comparison, NON-UPF Dashboard, AI Dashboard, Reformulation, and the Studio & AI upgrade card.'
    },
    crawl: {
      icon: 'child_care',
      label: 'Crawl',
      desc: 'Full SaaS nav — still no chat',
      includes: 'Every primary-nav destination (the full SaaS set). Remaining modules fill the row.',
      excludes: 'Chat surfaces, the composer, and History (the History module, the History icon, History in the nav, and the new-chat circle).'
    },
    walk: {
      icon: 'directions_walk',
      label: 'Walk',
      desc: 'Chat on — chips and widths, no typing',
      includes: 'Chat, intent chips, four-tier widths (single, double, triple, fill), and the full primary nav including History.',
      excludes: 'The composer — the typing rail is hidden, so you cannot type or send.'
    },
    run: {
      icon: 'directions_run',
      label: 'Run',
      desc: 'Full experience — unlocked composer',
      includes: 'Everything in Walk, plus an unlocked composer docked at the bottom of the chat. You can type and send.',
      excludes: 'Nothing — this is the full experience.'
    }
  };

  var hostRef = null;
  var pillRef = null;
  var shadowRef = null;
  var tipRef = null;
  var dragLive = false;
  var liveMode = null;

  function pageFile() {
    try {
      var path = (location.pathname || '').replace(/\\/g, '/');
      return (path.split('/').pop() || '').toLowerCase();
    } catch (e) { return ''; }
  }

  function pageDefaultMode() {
    return RUN_PAGES.indexOf(pageFile()) !== -1 ? 'run' : 'roll';
  }

  function isRunOnlyPage() {
    return RUN_ONLY_PAGES.indexOf(pageFile()) !== -1;
  }

  function isModeLocked(mode) {
    return isRunOnlyPage() && mode !== 'run';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function modeAria(meta, locked) {
    var base = meta.label + '. ' + meta.desc + '. Includes: ' + meta.includes + ' Excludes: ' + meta.excludes;
    return locked ? meta.label + '. Locked on this page. Helix stays on Run. ' + base : base;
  }

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
    if (isRunOnlyPage()) return 'run';
    if (liveMode && MODES.indexOf(liveMode) !== -1) return liveMode;
    return pageDefaultMode();
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
    if (isRunOnlyPage()) mode = 'run';
    var root = document.documentElement;
    var prev = MODES.filter(function (m) { return root.classList.contains('cwr-' + m); })[0] || '';
    MODES.forEach(function (m) { root.classList.toggle('cwr-' + m, m === mode); });
    liveMode = mode;
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
    each(CHAT_SEL, function (el) {
      if (el.closest && el.closest('.dsc-ask-live, [data-cwr-keep]')) return;
      if (el.hasAttribute && el.hasAttribute('data-cwr-keep')) return;
      setInert(el, hideChat);
    });
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

  var placeRaf = 0;

  function schedulePlace() {
    if (placeRaf) cancelAnimationFrame(placeRaf);
    placeRaf = requestAnimationFrame(function () {
      placeRaf = 0;
      requestAnimationFrame(placeToggle);
    });
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
    anchor.style.right = DEFAULT_RIGHT + 'px';
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
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) .wch-sidebar:not([data-cwr-keep]),',
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
    'html.cwr-ui-on.cwr-roll .menu-nav [data-nav-id="reformulation"],',
    'html.cwr-ui-on.cwr-roll .menu-nav [data-nav-id="studio-ai"],',
    'html.cwr-ui-on.cwr-roll .menu-nav [data-nav-id="wiseai"],',
    'html.cwr-ui-on.cwr-roll .menu-nav [data-nav-id="wiseai-chat"],',
    'html.cwr-ui-on.cwr-roll .menu-nav [data-nav-id="library"],',
    'html.cwr-ui-on.cwr-roll .menu-nav [data-nav-id="ingredients"],',
    'html.cwr-ui-on.cwr-roll .menu-nav-group[data-group="wiseai"],',
    'html.cwr-ui-on.cwr-roll .menu-nav-upgrade,',
    'html.cwr-ui-on.cwr-roll .menu-nav-section[data-nav-section="studio"] {',
    '  display: none !important;',
    '}',

    /* ===== ROLL / CRAWL — History is a chat surface. Drop it from the
       primary nav: the History-in-nav group, the new-chat circle, and the
       History icon (it only ever opens History — the hamburger owns the
       labelled nav, so the History toggle has nothing to do here). ===== */
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) .menu-nav-group[data-group="nav-history"],',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl) .menu-modules-new,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl).nav-modules #topbar-menu-toggle,',
    'html.cwr-ui-on:is(.cwr-roll,.cwr-crawl).nav-modules .topbar-menu-toggle {',
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
    '  html.cwr-ui-on #cwr-toggle-anchor { transition: none; }',
    '}',

    /* ===== Widget host — transform lives on the OUTER anchor, never on
       the bordered pill. A 1px border + translateY on the same node paints
       a straight edge past the radius (the spike at the caps). The pill
       itself is styled inside the shadow tree so page CSS cannot leak in. ===== */
    '#cwr-toggle-anchor { display: none; }',
    'html.cwr-ui-on #cwr-toggle-anchor {',
    '  display: block;',
    '  position: fixed; right: ' + DEFAULT_RIGHT + 'px; top: 50%; transform: translateY(-50%);',
    '  z-index: 10500;',
    '  filter: drop-shadow(0 6px 16px rgba(17, 24, 39, 0.18));',
    '  transition: filter 0.18s ease;',
    '  touch-action: none;',
    '}',
    'html.cwr-ui-on #cwr-toggle-anchor.cwr-custom {',
    '  transform: none;',
    '  right: auto;',
    '}',
    'html.cwr-ui-on #cwr-toggle-anchor:hover,',
    'html.cwr-ui-on #cwr-toggle-anchor.is-dragging {',
    '  filter: drop-shadow(0 10px 8px rgba(17, 24, 39, 0.22)) drop-shadow(0 28px 52px rgba(17, 24, 39, 0.4));',
    '}',
    'html.cwr-ui-on #cwr-toggle-anchor.is-dragging {',
    '  z-index: 10600;',
    '  cursor: grabbing;',
    '}',
    'html.dark.cwr-ui-on #cwr-toggle-anchor {',
    '  filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.5));',
    '}',
    'html.dark.cwr-ui-on #cwr-toggle-anchor:hover,',
    'html.dark.cwr-ui-on #cwr-toggle-anchor.is-dragging {',
    '  filter: drop-shadow(0 10px 10px rgba(0, 0, 0, 0.55)) drop-shadow(0 28px 56px rgba(0, 0, 0, 0.82));',
    '}',

    /* Tooltip lives in the light DOM (document.body) so host filter/transform
       cannot turn position:fixed into a host-relative box. */
    '.cwr-tip {',
    '  position: fixed; z-index: 10650;',
    '  box-sizing: border-box;',
    '  width: max-content; max-width: min(320px, calc(100vw - 24px));',
    '  padding: 10px 12px 12px;',
    '  background: var(--surface, #fff);',
    '  color: var(--text, #1a2332);',
    '  border: 1px solid var(--border, rgba(37, 80, 124, 0.22));',
    '  border-radius: 12px;',
    '  box-shadow: var(--shadow-card, 0 8px 28px rgba(17, 24, 39, 0.14));',
    '  font-family: "DM Sans", system-ui, sans-serif;',
    '  pointer-events: none;',
    '  opacity: 0;',
    '  transform: translateX(6px);',
    '  transition: opacity 0.08s ease, transform 0.08s ease;',
    '}',
    '.cwr-tip.is-vis { opacity: 1; transform: none; }',
    '.cwr-tip[hidden] { display: none; }',
    '.cwr-tip-title {',
    '  font-family: var(--module-title-family, "Noto Serif", Georgia, serif);',
    '  font-size: 15px; font-weight: 700; line-height: 1.2;',
    '  letter-spacing: 0.02em; color: var(--text, #1a2332);',
    '}',
    '.cwr-tip-desc {',
    '  margin: 4px 0 10px; font-size: 12px; font-weight: 500;',
    '  line-height: 1.4; color: var(--text-muted, #444B55);',
    '}',
    '.cwr-tip-block + .cwr-tip-block { margin-top: 8px; }',
    '.cwr-tip-k {',
    '  font-size: 10px; font-weight: 700; letter-spacing: 0.08em;',
    '  text-transform: uppercase; color: var(--primary, #25507C);',
    '  margin-bottom: 2px;',
    '}',
    '.cwr-tip-block p {',
    '  margin: 0; font-size: 12px; font-weight: 500;',
    '  line-height: 1.45; color: var(--text, #1a2332);',
    '}',
    'html.dark .cwr-tip {',
    '  background: var(--surface, #1A2339);',
    '  color: var(--text, #e8eefb);',
    '  border-color: var(--border, rgba(37, 80, 124, 0.28));',
    '}',
    'html.dark .cwr-tip-title { color: var(--text, #e8eefb); }',
    'html.dark .cwr-tip-desc { color: var(--text-muted, #9aa8bb); }',
    'html.dark .cwr-tip-k { color: var(--primary-bright, #8B9FAF); }',
    'html.dark .cwr-tip-block p { color: var(--text, #e8eefb); }'
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
    '  border: 1px solid rgb(219, 39, 119);',
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
    '  position: relative;',
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
    '  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;',
    '  outline: none;',
    '}',
    '.cwr-btn:hover { background: var(--primary-soft, rgba(37, 80, 124, 0.08)); color: var(--primary, #25507C); }',
    '.cwr-btn.is-locked {',
    '  opacity: 0.42;',
    '  cursor: not-allowed;',
    '  color: var(--text-muted, #444B55);',
    '}',
    '.cwr-btn.is-locked:hover {',
    '  background: transparent;',
    '  color: var(--text-muted, #444B55);',
    '}',
    ':host-context(html.dark) .cwr-btn.is-locked:hover {',
    '  background: transparent;',
    '  color: var(--text-muted, #9aa8bb);',
    '}',
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
    '.cwr-btn[aria-checked="true"] .material-symbols-outlined:not(.cwr-lock) {',
    '  font-variation-settings: "FILL" 1, "wght" 400, "GRAD" 0, "opsz" 24;',
    '}',
    '.cwr-btn .cwr-lock.material-symbols-outlined {',
    '  display: none;',
    '  position: absolute;',
    '  top: 3px; right: 3px;',
    '  font-size: 11px; line-height: 1;',
    '  pointer-events: none;',
    '}',
    '.cwr-btn.is-locked .cwr-lock.material-symbols-outlined { display: block; }',
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
    wrap.innerHTML = MODES.map(function (m) {
      var meta = META[m];
      var locked = isModeLocked(m);
      return '<button type="button" class="cwr-btn' + (locked ? ' is-locked' : '') + '" role="radio" id="cwr-btn-' + m + '"' +
        ' data-mode="' + m + '"' +
        (locked ? ' aria-disabled="true"' : '') +
        ' aria-label="' + esc(modeAria(meta, locked)) + '">' +
        '<span class="material-symbols-outlined" aria-hidden="true">' + meta.icon + '</span>' +
        '<span class="cwr-btn-label" aria-hidden="true">' + meta.label + '</span>' +
        '<span class="cwr-lock material-symbols-outlined" aria-hidden="true">lock</span>' +
        '</button>';
    }).join('');

    var tip = document.createElement('div');
    tip.className = 'cwr-tip';
    tip.id = 'cwr-tip';
    tip.setAttribute('role', 'tooltip');
    tip.hidden = true;

    hostRef = anchor;
    pillRef = wrap;
    shadowRef = shadow;
    tipRef = tip;

    function tipHtml(meta, locked) {
      var lock = locked
        ? '<div class="cwr-tip-block"><div class="cwr-tip-k">Locked</div><p>This page stays on Run. Roll, Crawl, and Walk would hide the Helix.</p></div>'
        : '';
      return '<div class="cwr-tip-title">' + esc(meta.label) + '</div>' +
        '<p class="cwr-tip-desc">' + esc(meta.desc) + '</p>' +
        lock +
        '<div class="cwr-tip-block"><div class="cwr-tip-k">Includes</div><p>' + esc(meta.includes) + '</p></div>' +
        '<div class="cwr-tip-block"><div class="cwr-tip-k">Excludes</div><p>' + esc(meta.excludes) + '</p></div>';
    }

    function hideTip() {
      if (!tipRef) return;
      tipRef.classList.remove('is-vis');
      tipRef.hidden = true;
    }

    function placeTip(btn) {
      if (!tipRef || !btn) return;
      var r = btn.getBoundingClientRect();
      var gap = 10;
      var margin = 8;
      var tw = tipRef.offsetWidth;
      var th = tipRef.offsetHeight;
      var vw = window.innerWidth;
      var vh = window.innerHeight;
      var left = r.left - gap - tw;
      if (left < margin) left = Math.min(r.right + gap, vw - tw - margin);
      var top = r.top + (r.height / 2) - (th / 2);
      if (top < margin) top = margin;
      if (top + th > vh - margin) top = Math.max(margin, vh - th - margin);
      tipRef.style.left = Math.round(left) + 'px';
      tipRef.style.top = Math.round(top) + 'px';
    }

    function showTip(btn) {
      if (!tipRef || !btn || dragLive) return;
      var meta = META[btn.dataset.mode];
      if (!meta) return;
      tipRef.innerHTML = tipHtml(meta, isModeLocked(btn.dataset.mode));
      tipRef.hidden = false;
      placeTip(btn);
      tipRef.offsetWidth;
      tipRef.classList.add('is-vis');
    }

    function sync() {
      var mode = readMode();
      cwrButtons().forEach(function (btn) {
        var m = btn.dataset.mode;
        var locked = isModeLocked(m);
        var on = m === mode;
        var meta = META[m];
        btn.setAttribute('aria-checked', on ? 'true' : 'false');
        btn.setAttribute('aria-disabled', locked ? 'true' : 'false');
        btn.classList.toggle('is-locked', locked);
        if (meta) btn.setAttribute('aria-label', modeAria(meta, locked));
        /* Roving tabindex: only the selected unlocked radio is in the tab
           order. Locked modes stay out of the keyboard path. */
        btn.tabIndex = locked ? -1 : (on ? 0 : -1);
      });
    }

    function select(mode, fromUser) {
      if (isModeLocked(mode)) return;
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
        hideTip();
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
      if (isModeLocked(btn.dataset.mode)) {
        e.preventDefault();
        showTip(btn);
        return;
      }
      hideTip();
      select(btn.dataset.mode, true);
      btn.focus();
    });

    wrap.addEventListener('mouseover', function (e) {
      var btn = e.target.closest && e.target.closest('.cwr-btn');
      if (btn) showTip(btn);
    });
    wrap.addEventListener('mouseout', function (e) {
      var btn = e.target.closest && e.target.closest('.cwr-btn');
      if (!btn) return;
      if (e.relatedTarget && btn.contains(e.relatedTarget)) return;
      hideTip();
    });
    wrap.addEventListener('focusin', function (e) {
      var btn = e.target.closest && e.target.closest('.cwr-btn');
      if (btn) showTip(btn);
    });
    wrap.addEventListener('focusout', function () { hideTip(); });

    wrap.addEventListener('keydown', function (e) {
      var btns = cwrButtons().filter(function (b) {
        return b.getAttribute('aria-disabled') !== 'true';
      });
      if (!btns.length) return;
      var i = btns.indexOf(shadow.activeElement);
      if (i < 0) i = 0;
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
    document.body.appendChild(tip);
    gateA11y(readMode());
    schedulePlace();
    setTimeout(placeToggle, 400);
    window.addEventListener('resize', function () { hideTip(); schedulePlace(); });
    window.addEventListener('scroll', hideTip, true);

    window.addEventListener('storage', function (e) {
      if (e.key === UI_KEY) { applyUi(); gateA11y(readMode()); }
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
