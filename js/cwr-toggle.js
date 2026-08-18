/* Crawl / Walk / Run rollout toggle — a floating segmented control pinned to
   the right edge, vertically centered, present on every pages/*.html.

   The chosen mode is stored in localStorage ('wise-cwr-mode') and applied as
   a class on <html> (cwr-crawl / cwr-walk / cwr-run) so every page picks the
   same mode up. What each mode gates:

     crawl — SaaS only. Every WISEcodeAI chat surface is hidden AND taken out
             of the a11y/focus tree (inert + aria-hidden). Remaining modules
             grow to fill the modules-row — no leftover empty width.
     walk  — Chat turns on. Four-tier widths (single / double / triple / fill)
             stay fluid. The composer rail is hidden and inert; intent chips
             stay visible. Focus never lands in the hidden input.
     run   — Unlocks the composer and docks it at the very bottom of the chat.
             Focus goes to the actual <textarea>, while .fl-input-wrap (the
             focus container) shows the focused UI via :focus-within.

   The floating widget is ON by default, with the mode set to Run. The
   Appearance popover switch persists 'wise-cwr-ui' and toggles `cwr-ui-on`
   on <html>. While the widget is hidden, mode gating is suspended too.

   Include with: <script src="../js/cwr-toggle.js"></script> in <head>. */
(function () {
  'use strict';

  var KEY = 'wise-cwr-mode';
  var UI_KEY = 'wise-cwr-ui';
  var MODES = ['crawl', 'walk', 'run'];
  var META = {
    crawl: { icon: 'child_care', label: 'Crawl', desc: 'SaaS modules fill the row — no chat' },
    walk: { icon: 'directions_walk', label: 'Walk', desc: 'Chat on — chips, four-tier widths, no composer' },
    run: { icon: 'directions_run', label: 'Run', desc: 'Unlock the composer at the bottom' }
  };

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
    if (mode === 'crawl' && isUiOn()) fillCrawlLeftover();
    else clearCrawlFill();
    reflow();
    if (opts.fromUser && mode === 'run' && prev !== 'run') unlockComposer();
    if (opts.fromUser && mode === 'walk' && prev === 'crawl') {
      root.classList.add('cwr-walking');
      setTimeout(function () { root.classList.remove('cwr-walking'); }, 480);
    }
    try { window.dispatchEvent(new CustomEvent('wise:cwr-mode', { detail: { mode: mode } })); } catch (e) {}
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
    var fallback = document.querySelector('#cwr-toggle .cwr-btn[tabindex="0"]') ||
      document.querySelector('#cwr-toggle .cwr-btn[aria-checked="true"]');
    if (fallback && typeof fallback.focus === 'function') {
      try { fallback.focus({ preventScroll: true }); } catch (e) { fallback.focus(); }
      return;
    }
    if (typeof active.blur === 'function') active.blur();
  }

  function gateA11y(mode) {
    var ui = isUiOn();
    var hideChat = ui && mode === 'crawl';
    var hideRail = ui && (mode === 'crawl' || mode === 'walk');
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
    try { window.dispatchEvent(new Event('resize')); } catch (e) {}
  }

  /* ---- mode CSS + widget chrome (injected so it works on every page) ---- */
  var css = [
    /* ===== CRAWL — hide every chat surface; SaaS fills the row ===== */
    'html.cwr-ui-on.cwr-crawl .wch-chat-anchor,',
    'html.cwr-ui-on.cwr-crawl .wiseai-dock,',
    'html.cwr-ui-on.cwr-crawl .wiseai-dock-fab,',
    'html.cwr-ui-on.cwr-crawl #chat-shell,',
    'html.cwr-ui-on.cwr-crawl #wa-chat,',
    'html.cwr-ui-on.cwr-crawl .wa-chat,',
    'html.cwr-ui-on.cwr-crawl .ap-chat,',
    'html.cwr-ui-on.cwr-crawl .rf-chat,',
    'html.cwr-ui-on.cwr-crawl .gs-chat,',
    'html.cwr-ui-on.cwr-crawl .sa-chat,',
    'html.cwr-ui-on.cwr-crawl .aid-chat,',
    'html.cwr-ui-on.cwr-crawl #wiseai-dock-panel,',
    'html.cwr-ui-on.cwr-crawl #wiseai-panel,',
    'html.cwr-ui-on.cwr-crawl #pf-chat-panel,',
    'html.cwr-ui-on.cwr-crawl .wch-sidebar,',
    'html.cwr-ui-on.cwr-crawl .chat-input-rail { display: none !important; }',

    'html.cwr-ui-on.cwr-crawl #modules-row,',
    'html.cwr-ui-on.cwr-crawl .modules-row {',
    '  container-type: inline-size; container-name: cwr-row;',
    '}',
    /* The actual SaaS work surface absorbs leftover width. Fixed rails
       (progress, icon columns) keep their natural size so they do not
       become empty "focus containers" beside a stretched void. */
    'html.cwr-ui-on.cwr-crawl #agent-main,',
    'html.cwr-ui-on.cwr-crawl #agent-main.main-w-narrow,',
    'html.cwr-ui-on.cwr-crawl #agent-main.main-w-wide,',
    'html.cwr-ui-on.cwr-crawl #agent-main.main-w-triple,',
    'html.cwr-ui-on.cwr-crawl #nfp-panel,',
    'html.cwr-ui-on.cwr-crawl [data-cwr-fill] {',
    '  flex: 1 1 0% !important;',
    '  width: auto !important;',
    '  min-width: 0 !important;',
    '  max-width: none !important;',
    '}',
    'html.cwr-ui-on.cwr-crawl #agent-main > .agent-main-inner,',
    'html.cwr-ui-on.cwr-crawl #nfp-panel > .nfp-inner,',
    'html.cwr-ui-on.cwr-crawl [data-cwr-fill] > [class$="-inner"],',
    'html.cwr-ui-on.cwr-crawl [data-cwr-fill] > .panel-inner {',
    '  width: 100% !important;',
    '  max-width: none !important;',
    '  flex: 1 1 auto !important;',
    '  min-width: 0 !important;',
    '}',
    /* Empty product-identity column: the actual fields fill the grid cell
       instead of sitting as a small island in a tall beige focus container. */
    'html.cwr-ui-on.cwr-crawl .nfp-sp-media {',
    '  display: flex !important;',
    '  flex-direction: column !important;',
    '  min-width: 0 !important;',
    '}',
    'html.cwr-ui-on.cwr-crawl .nfp-sp-media .nfp-hero--rich,',
    'html.cwr-ui-on.cwr-crawl .nfp-sp-media .nfp-hero--rich.nfp-hero--empty {',
    '  flex: 1 1 auto !important;',
    '  height: auto !important;',
    '  min-height: 100% !important;',
    '  display: flex !important;',
    '  flex-direction: column !important;',
    '}',
    'html.cwr-ui-on.cwr-crawl .nfp-sp-media .nfp-hero--empty .nfp-hero-stack {',
    '  flex: 1 1 auto !important;',
    '  justify-content: center !important;',
    '  width: 100% !important;',
    '}',
    'html.cwr-ui-on.cwr-crawl .nfp-hero-cat,',
    'html.cwr-ui-on.cwr-crawl .nfp-hero-upc,',
    'html.cwr-ui-on.cwr-crawl .nfp-hero-upc.nfp-rupc {',
    '  max-width: min(520px, 92%) !important;',
    '  width: 100% !important;',
    '}',
    /* Chat card is never the focus ring — the composer wrap is. */
    'html.cwr-ui-on :is(.ap-chat, .rf-chat, .sa-chat, .gs-chat, .wa-chat, .sc-card, .wch-chat-anchor, #chat-shell):focus,',
    'html.cwr-ui-on :is(.ap-chat, .rf-chat, .sa-chat, .gs-chat, .wa-chat, .sc-card, .wch-chat-anchor, #chat-shell):focus-visible {',
    '  outline: none;',
    '}',

    /* ===== WALK — chat on, composer gone, four-tier widths stay fluid ===== */
    'html.cwr-ui-on.cwr-walk .chat-input-rail { display: none !important; }',
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

    /* ===== Widget — focus ring on the actual radio, never the pill ===== */
    '#cwr-toggle { display: none; }',
    'html.cwr-ui-on #cwr-toggle {',
    '  position: fixed; right: 10px; top: 50%; transform: translateY(-50%);',
    '  z-index: 10500; display: flex; flex-direction: column; gap: 4px;',
    '  padding: 5px; border-radius: 999px;',
    '  background: var(--surface, #fff);',
    '  border: 1px solid var(--border-strong, rgba(37, 80, 124, 0.28));',
    '  box-shadow: 0 6px 20px rgba(17, 24, 39, 0.14);',
    '  font-family: inherit;',
    '  outline: none;',
    '}',
    'html.cwr-ui-on #cwr-toggle:focus,',
    'html.cwr-ui-on #cwr-toggle:focus-visible,',
    'html.cwr-ui-on #cwr-toggle:focus-within {',
    '  outline: none;',
    '  box-shadow: 0 6px 20px rgba(17, 24, 39, 0.14);',
    '}',
    'html.dark.cwr-ui-on #cwr-toggle,',
    'html.dark.cwr-ui-on #cwr-toggle:focus-within {',
    '  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);',
    '}',
    '#cwr-toggle .cwr-btn {',
    '  display: flex; flex-direction: column; align-items: center; justify-content: center;',
    '  gap: 1px; width: 46px; height: 46px; border-radius: 999px;',
    '  border: none; background: transparent; cursor: pointer;',
    '  color: var(--text-muted, #444B55);',
    '  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;',
    '  outline: none;',
    '}',
    '#cwr-toggle .cwr-btn:hover { background: var(--primary-soft, rgba(37, 80, 124, 0.08)); color: var(--primary-ink, var(--primary, #25507C)); }',
    '#cwr-toggle .cwr-btn[aria-checked="true"] { background: var(--primary, #25507C); color: #fff; }',
    /* Actual control — the circle — gets the ring. The pill never does. */
    '#cwr-toggle .cwr-btn:focus-visible {',
    '  outline: 2px solid var(--primary, #25507C);',
    '  outline-offset: 2px;',
    '  z-index: 1;',
    '}',
    '#cwr-toggle .cwr-btn[aria-checked="true"]:focus-visible {',
    '  outline-color: #fff;',
    '  box-shadow: 0 0 0 2px var(--primary, #25507C);',
    '}',
    'html.dark #cwr-toggle .cwr-btn:focus-visible {',
    '  outline-color: var(--primary-bright, #8B9FAF);',
    '}',
    'html.dark #cwr-toggle .cwr-btn[aria-checked="true"]:focus-visible {',
    '  outline-color: #fff;',
    '  box-shadow: 0 0 0 2px var(--primary-bright, #8B9FAF);',
    '}',
    '#cwr-toggle .cwr-btn .material-symbols-outlined { font-size: 18px; line-height: 1; }',
    '#cwr-toggle .cwr-btn .cwr-btn-label {',
    '  font-size: 0.5rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; line-height: 1.1;',
    '}'
  ].join('\n');

  var style = document.createElement('style');
  style.id = 'cwr-toggle-style';
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  applyMode(readMode());
  applyUi();

  function mountWidget() {
    if (document.getElementById('cwr-toggle')) return;
    var wrap = document.createElement('div');
    wrap.id = 'cwr-toggle';
    wrap.setAttribute('role', 'radiogroup');
    wrap.setAttribute('aria-label', 'Rollout mode');
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

    function sync() {
      var mode = readMode();
      wrap.querySelectorAll('.cwr-btn').forEach(function (btn) {
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

    wrap.addEventListener('click', function (e) {
      var btn = e.target.closest('.cwr-btn');
      if (!btn) return;
      select(btn.dataset.mode, true);
      btn.focus();
    });

    wrap.addEventListener('keydown', function (e) {
      var btns = Array.prototype.slice.call(wrap.querySelectorAll('.cwr-btn'));
      var i = btns.indexOf(document.activeElement);
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

    sync();
    document.body.appendChild(wrap);
    gateA11y(readMode());

    window.addEventListener('storage', function (e) {
      if (e.key === KEY) { applyMode(readMode()); sync(); }
      else if (e.key === UI_KEY) { applyUi(); gateA11y(readMode()); }
    });
  }

  document.addEventListener('wise:cwr-ui', function () {
    applyUi();
    var mode = readMode();
    gateA11y(mode);
    if (isUiOn() && mode === 'crawl') fillCrawlLeftover();
    else clearCrawlFill();
    reflow();
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
        if (mode === 'crawl' && isUiOn()) fillCrawlLeftover();
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
      if (mode === 'crawl' && isUiOn()) fillCrawlLeftover();
    });
  } else {
    mountWidget();
    var mode = readMode();
    gateA11y(mode);
    if (mode === 'crawl' && isUiOn()) fillCrawlLeftover();
  }
})();
