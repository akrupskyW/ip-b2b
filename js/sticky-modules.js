/* ══════════════════════════════════════════════════════════════════════════
   sticky-modules.js — app-wide "Sticky module" toggle
   ──────────────────────────────────────────────────────────────────────────
   Brings pages/wiseai.html's per-pane "Sticky module" admin toggle to EVERY
   page: any module that sits to the RIGHT of the chat inside #modules-row gets
   a pink Admin "Sticky module" switch in its three-dot (⋯) menu — and a menu is
   created for it if it doesn't already have one. ON (the default) tucks the
   module in behind its left neighbour like a drawer (see the generic
   `.sticky-mod.is-sticky` rules in pages/wise.css).

   Two module families are handled separately so nothing double-applies:
     • Generic content modules  → toggles `.sticky-mod` + `.is-sticky` (wise.css)
     • Docked Turns sidebars     → toggles `.wch-unsticky` (chat-history.js CSS),
       which already owns its own tuck via `#modules-row.modules-sticky`.

   Skipped entirely:
     • The chat module itself (marked `.sticky-chat` so it rides above drawers)
     • History (a `.wch-sidebar` LEFT of the chat — out of scope)
     • Modules that already ship a native sticky toggle (wiseai.html panes and
       the wiseai-chat.js Turns module) — left exactly as-is.

   Auto-inits on DOMContentLoaded and re-runs via a MutationObserver so
   JS-injected modules (Turns, #agent-main, progress panes, portfolio panels)
   are wired as they appear. Also exposed as window.WiseStickyModules.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* Elements that ARE the chat (never a right-of-chat module). Covers every
     chat host across the app: wiseai, reformulation, studio-ai, ai-dashboard,
     add/view-product, report-guiding-stars, portfolio/comparison, and the
     agent-overview dock. */
  var CHAT_SEL = '#wa-chat,#rf-chat,#sa-chat,#aid-chat,.ap-chat,#gs-chat,#chat-shell,#wiseai-dock-panel';

  /* A module that already owns one of these is left untouched (wiseai panes +
     wiseai-chat.js Turns). */
  var NATIVE_STICKY_SEL = '[data-pane-act="sticky"],[data-turns-act="sticky"]';

  /* Chrome that lives in the row but is not a module. */
  var EXCLUDE_RE = /scrim|resize|handle|backdrop|drag|grip|overlay/i;

  /* Wrappers whose CHILDREN are the real modules (not the wrapper). */
  var GROUP_SEL = '#panels-row-right';

  /* Modules that build their OWN three-dot menu asynchronously (e.g. the agent
     overview main panel via agent-overview.js setupMainPanelControls). We must
     NOT create a menu for these — doing so would leave two ⋯ buttons. Instead we
     wait and inject only once their native menu appears (the observer re-scans). */
  var WAIT_FOR_NATIVE = '#agent-main';

  /* Preferred controls container to drop a created menu into, per module. The
     first selector that matches inside the module wins; otherwise a generic
     list (below) is tried, then a floating top-right menu as a last resort. */
  var MENU_INTO = [
    { sel: '.aid-dash-card', into: '.aid-top-actions' },
    { sel: '.sa-panel', into: '.sa-panel-head' },
    { sel: '.vf-progress-pane', into: '.vfp-header' },
    { sel: '.gv-progress-pane', into: '.gvp-header' }
  ];
  var GENERIC_CONTROLS = [
    '.wa-pane-controls', '.rf-head-controls', '.panel-controls', '.wch-controls',
    '.aid-top-actions', '.sa-panel-head', '.vfp-header', '.gvp-header',
    '[class*="head-controls"]', '[class*="top-actions"]', '.agent-main-header'
  ];

  var STICKY_TOGGLE_ATTR = 'data-sticky-toggle';

  function stickyItemHTML(on) {
    return '<button type="button" class="topbar-menu-item topbar-menu-item--admin topbar-menu-item--toggle' +
      (on ? ' is-on' : '') + '" ' + STICKY_TOGGLE_ATTR + ' role="menuitemcheckbox" aria-checked="' +
      (on ? 'true' : 'false') + '">' +
      '<span class="material-symbols-outlined topbar-menu-icon">dock_to_right</span>' +
      '<span>Sticky module</span>' +
      '<span class="topbar-menu-badge">Admin</span>' +
      '<span class="topbar-menu-switch"><span class="topbar-menu-switch-thumb"></span></span>' +
      '</button>';
  }

  function getRow() { return document.getElementById('modules-row'); }

  function isExcluded(el) {
    if (!el || el.nodeType !== 1) return true;
    var tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEMPLATE') return true;
    if (tag === 'INPUT' || tag === 'LINK') return true;
    var token = (el.id || '') + ' ' + (el.className && el.className.baseVal !== undefined ? el.className.baseVal : (el.className || ''));
    if (EXCLUDE_RE.test(token)) return true;
    return false;
  }

  /* A candidate is "module-like": a real panel container, not a decorative div. */
  function isModuleLike(el) {
    if (isExcluded(el)) return false;
    var tag = el.tagName;
    if (tag === 'SECTION' || tag === 'ASIDE' || tag === 'MAIN') return true;
    var token = (el.id || '') + ' ' + (typeof el.className === 'string' ? el.className : '');
    return /panel|card|module|pane|main|sidebar|dash/i.test(token);
  }

  function isChat(el) { return el.matches && el.matches(CHAT_SEL); }

  /* Docked Turns/History sidebar? `.wch-right` = right (Turns), else left
     (History → out of scope). */
  function isWchSidebar(el) { return el.classList && el.classList.contains('wch-sidebar'); }
  function isWchRight(el) { return isWchSidebar(el) && el.classList.contains('wch-right'); }

  /* Right of the chat? Structural hints first (robust for hidden panels), then
     geometry, then DOM order. */
  function isRightOfChat(mod, chat) {
    if (isWchSidebar(mod)) return mod.classList.contains('wch-right');
    if (chat) {
      var mr = mod.getBoundingClientRect();
      var cr = chat.getBoundingClientRect();
      if (mr.width > 0 && cr.width > 0) return (mr.left + mr.width / 2) >= (cr.left + cr.width / 2);
      /* Zero-size (hidden) → fall back to document order. */
      var pos = chat.compareDocumentPosition(mod);
      return !!(pos & Node.DOCUMENT_POSITION_FOLLOWING);
    }
    return true;
  }

  /* Collect module-like candidates in the row, descending into group wrappers.
     Geometry (right-of-chat) is intentionally NOT evaluated here — it's deferred
     to ensureToggle so that on chatty pages (where the observer fires on every
     streamed message) already-wired modules cost nothing and never force layout. */
  function collectCandidates() {
    var row = getRow();
    if (!row) return null;
    var chat = row.querySelector(CHAT_SEL);
    /* No chat in the row (e.g. analytics-types.html hides WISEcodeAI) → there is
       nothing to be "right of the chat", so wire nothing. The observer will
       re-scan if a chat gets mounted later. */
    if (!chat) return null;
    chat.classList.add('sticky-chat');
    var mods = [];
    Array.prototype.forEach.call(row.children, function (child) {
      if (isChat(child) || isExcluded(child)) return;
      if (child.matches && child.matches(GROUP_SEL)) {
        Array.prototype.forEach.call(child.children, function (g) {
          if (isModuleLike(g)) mods.push(g);
        });
        return;
      }
      if (isModuleLike(child)) mods.push(child);
    });
    return { chat: chat, mods: mods };
  }

  /* Wire a ⋯ button + popover pair to open/close (mirrors the shared pane
     menu behaviour; the popover reuses .topbar-popover styling). */
  function wireMenuOpenClose(wrap) {
    if (wrap.dataset.stickyMenuWired) return;
    wrap.dataset.stickyMenuWired = '1';
    var btn = wrap.querySelector('.panel-more-btn');
    var pop = wrap.querySelector('.topbar-popover');
    if (!btn || !pop) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var opening = pop.classList.contains('hidden');
      /* Close any other open sticky-created menus first. */
      document.querySelectorAll('.panel-more-wrap[data-sticky-menu] .topbar-popover').forEach(function (p) { p.classList.add('hidden'); });
      document.querySelectorAll('.panel-more-wrap[data-sticky-menu] .panel-more-btn').forEach(function (b) { b.classList.remove('is-open'); });
      pop.classList.toggle('hidden', !opening);
      btn.classList.toggle('is-open', opening);
      btn.setAttribute('aria-expanded', opening ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (pop.classList.contains('hidden')) return;
      if (wrap.contains(e.target)) return;
      pop.classList.add('hidden');
      btn.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    });
  }

  /* Build a fresh three-dot menu (used when a module has none). */
  function createMenu() {
    var wrap = document.createElement('div');
    wrap.className = 'panel-more-wrap';
    wrap.setAttribute('data-sticky-menu', '1');
    wrap.innerHTML =
      '<button type="button" class="panel-more-btn" title="Module options" aria-haspopup="menu" aria-expanded="false" aria-label="Module options"><span class="material-symbols-outlined">more_vert</span></button>' +
      '<div class="topbar-popover hidden" role="menu"></div>';
    return wrap;
  }

  /* Find where a created menu should live inside the module. */
  function findControlsHost(mod) {
    for (var i = 0; i < MENU_INTO.length; i++) {
      if (mod.matches(MENU_INTO[i].sel)) {
        var host = mod.querySelector(MENU_INTO[i].into);
        if (host) return { host: host, floating: false };
      }
    }
    for (var j = 0; j < GENERIC_CONTROLS.length; j++) {
      var g = mod.querySelector(GENERIC_CONTROLS[j]);
      if (g) return { host: g, floating: false };
    }
    return null;
  }

  /* Ensure the module has a popover we can inject into; return it (or null if
     we chose to wait for a natively-built menu that hasn't appeared yet). */
  function ensureMenu(mod) {
    var existing = mod.querySelector('.panel-more-wrap');
    if (existing) {
      var pop = existing.querySelector('.topbar-popover');
      if (pop) return pop;
      return null;
    }
    /* Builds its own menu later → wait for it rather than creating a duplicate. */
    if (mod.matches(WAIT_FOR_NATIVE)) return null;
    /* No menu yet. Create one in the best available controls host. */
    var target = findControlsHost(mod);
    var wrap = createMenu();
    if (target) {
      /* Append so the ⋯ right-aligns (via `.panel-more-wrap { margin-left:auto }`)
         without reflowing the header's existing left-hand content. */
      target.host.appendChild(wrap);
    } else {
      /* Floating fallback: pin a ⋯ to the module's top-right corner. */
      wrap.style.position = 'absolute';
      wrap.style.top = '10px';
      wrap.style.right = '10px';
      wrap.style.zIndex = '5';
      var cs = window.getComputedStyle(mod);
      if (cs.position === 'static') mod.style.position = 'relative';
      mod.appendChild(wrap);
    }
    wireMenuOpenClose(wrap);
    return wrap.querySelector('.topbar-popover');
  }

  function syncToggleItem(item, on) {
    item.classList.toggle('is-on', on);
    item.setAttribute('aria-checked', on ? 'true' : 'false');
  }

  /* GENERIC content module: drive `.sticky-mod` + `.is-sticky`. */
  function setGenericSticky(mod, on) {
    mod.classList.add('sticky-mod');
    mod.classList.toggle('is-sticky', on);
    var item = mod.querySelector('[' + STICKY_TOGGLE_ATTR + ']');
    if (item) syncToggleItem(item, on);
  }

  /* DOCKED Turns sidebar: drive `.wch-unsticky` (ON = not unsticky) and make
     sure the row carries `.modules-sticky` so chat-history.js's tuck CSS fires. */
  function setWchSticky(mod, on) {
    var row = getRow();
    if (row) row.classList.add('modules-sticky');
    mod.classList.toggle('wch-unsticky', !on);
    var item = mod.querySelector('[' + STICKY_TOGGLE_ATTR + ']');
    if (item) syncToggleItem(item, on);
  }

  /* Idempotently give a module its sticky toggle + wire it. Safe to re-call as
     the DOM changes (waits for async-built menus). `chat` is used only for the
     right-of-chat test, evaluated lazily so wired modules stay cheap. */
  function ensureToggle(mod, chat) {
    if (isWchSidebar(mod) && !isWchRight(mod)) return; /* History (left) */
    if (mod.querySelector(NATIVE_STICKY_SEL)) return;  /* native toggle → leave */
    if (mod.querySelector('[' + STICKY_TOGGLE_ATTR + ']')) return; /* already done */
    if (!isRightOfChat(mod, chat)) return; /* left of the chat → out of scope */

    var wch = isWchRight(mod);
    var pop = ensureMenu(mod);
    if (!pop) return; /* native menu not built yet — retry on next mutation */

    /* Default ON (matches wiseai.html), but preserve any prior state — some
       modules (e.g. progress panes) re-render their innerHTML, which wipes the
       toggle button while the module's own `.is-sticky`/`.wch-unsticky` class
       survives; re-derive from that so a user's choice isn't reset. */
    var on = wch
      ? !mod.classList.contains('wch-unsticky')
      : (mod.classList.contains('sticky-mod') ? mod.classList.contains('is-sticky') : true);
    pop.insertAdjacentHTML('afterbegin', stickyItemHTML(on) + '<div class="topbar-menu-divider"></div>');
    var item = pop.querySelector('[' + STICKY_TOGGLE_ATTR + ']');

    item.addEventListener('click', function (e) {
      e.stopPropagation();
      var nowOn = !item.classList.contains('is-on');
      if (wch) setWchSticky(mod, nowOn); else setGenericSticky(mod, nowOn);
    });

    /* Apply the default. */
    if (wch) setWchSticky(mod, on); else setGenericSticky(mod, on);
  }

  function scan() {
    var found = collectCandidates();
    if (!found) return;
    found.mods.forEach(function (mod) { ensureToggle(mod, found.chat); });
  }

  var observer = null;
  function observe() {
    var row = getRow();
    if (!row || observer) return;
    observer = new MutationObserver(function () {
      /* Coalesce bursts of mutations into a single scan. */
      if (observe._raf) return;
      observe._raf = requestAnimationFrame(function () { observe._raf = 0; scan(); });
    });
    observer.observe(row, { childList: true, subtree: true });
  }

  function init() {
    if (!getRow()) return;
    scan();
    observe();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.WiseStickyModules = { init: init, scan: scan, ensureToggle: ensureToggle };
})();
