/* ══════════════════════════════════════════════════════════════════════════
   sticky-modules.js — app-wide sticky modules + module ⋯ menu
   ──────────────────────────────────────────────────────────────────────────
   Sticky is now the ONLY module style: any module that sits to the RIGHT of the
   chat inside #modules-row is permanently tucked in behind its left neighbour
   like a drawer (see the generic `.sticky-mod.is-sticky` rules in wise.css).
   There is no longer a "Sticky module" toggle — it's always on.

   Each such module still gets a three-dot (⋯) menu (created if it lacks one),
   but the menu now hosts USEFUL module actions instead of the old toggle:
   Share, Copy link and Export. Modules that already ship their own ⋯ menu
   (wiseai panes, the Turns / "What can I ask?" modules) keep it as-is.

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
  var CHAT_SEL = '#wa-chat,#rf-chat,#sa-chat,#aid-chat,#pl-chat,#ar-chat,.ap-chat,#gs-chat,#chat-shell,#wiseai-dock-panel';

  /* A module that already owns its OWN ⋯ menu is left untouched (wiseai panes,
     the wiseai-chat.js Turns module, and its "What can I ask?" module). Detected
     by the stable action attributes those menus always carry (export / share /
     close / breakout …) — NOT by the old sticky toggle, which no longer exists. */
  var SELF_MANAGED_SEL = '[data-pane-act],[data-turns-act],[data-ask-act]';

  /* Chrome that lives in the row but is not a module. */
  var EXCLUDE_RE = /scrim|resize|handle|backdrop|drag|grip|overlay/i;

  /* Wrappers whose CHILDREN are the real modules (not the wrapper). Groups may
     nest (product-comparison's #intent-stack-column lives INSIDE
     #panels-row-right and stacks two .launch-panel modules). */
  var GROUP_SEL = '#panels-row-right,#intent-stack-column';

  /* Modules that build their OWN three-dot menu asynchronously (e.g. the agent
     overview main panel via agent-overview.js setupMainPanelControls). We must
     NOT create a menu for these — doing so would leave two ⋯ buttons. Instead we
     wait and inject only once their native menu appears (the observer re-scans). */
  var WAIT_FOR_NATIVE = '#agent-main';

  /* Progress modules (the right-hand step tracker: verification, GRAS,
     add catalog). These share `.vf-progress-pane` / `.gv-progress-pane`
     and re-render their innerHTML constantly. They get two extra behaviours over
     a plain content module: they ALWAYS default to Sticky (tucked drawer) so the
     tracker reads as a slim drawer off its left neighbour rather than a full
     flat column, and they gain a "Remove panel" row to hide the tracker outright
     (with a small restore tab left behind). Add / View Product keep progress
     in the chat transcript instead. */
  var PROGRESS_SEL = '.vf-progress-pane,.gv-progress-pane';
  /* Next-level drawers that sit to the RIGHT of another sticky module (Help's
     contact form, the generated Report pane). Same geometry rule as progress:
     always treat as right-of-chat so a mid-layout probe cannot strip `.is-sticky`
     and leave them as a flush peer card. Do NOT add Remove-panel — that is
     progress-tracker only. */
  /* Nested drawers (progress + this list) use --sticky-nested-tuck in wise.css.
     Chat-adjacent drawers (Output, NFP, studio, Turns) stay on --sticky-tuck.
     Do not mix the two. */
  var NESTED_DRAWER_SEL = '#help-contact,#wa-report,#rf-report,#pf-report-panel,#workflow-panel,.rf-dash,#ia-panel';
  var REMOVE_TOGGLE_ATTR = 'data-progress-remove';

  function isProgressPane(el) { return !!(el && el.matches && el.matches(PROGRESS_SEL)); }
  function isNestedDrawer(el) { return !!(el && el.matches && el.matches(NESTED_DRAWER_SEL)); }
  function progressKey(mod) {
    return 'wise-progress-removed:' + location.pathname + ':' + (mod.id || (typeof mod.className === 'string' ? mod.className : 'progress'));
  }
  function isPanelRemoved(mod) {
    try { return localStorage.getItem(progressKey(mod)) === '1'; } catch (_) { return false; }
  }

  /* Preferred controls container to drop a created menu into, per module. The
     first selector that matches inside the module wins; otherwise a generic
     list (below) is tried, then a floating top-right menu as a last resort. */
  var MENU_INTO = [
    { sel: '#nfp-panel', into: '.nfp-panel-header .panel-controls' },
    { sel: '#ia-panel', into: '.ia-panel-header .panel-controls' },
    { sel: '.aid-dash-card', into: '.aid-top-actions' },
    { sel: '.sa-panel', into: '.sa-panel-head' },
    { sel: '.vf-progress-pane', into: '.vfp-header' },
    { sel: '.gv-progress-pane', into: '.gvp-header' }
  ];
  var GENERIC_CONTROLS = [
    '.wa-pane-controls', '.rf-head-controls', '.panel-controls', '.wch-controls',
    '.aid-top-actions', '.sa-panel-head', '.vfp-header', '.gvp-header',
    '[class*="head-controls"]', '[class*="top-actions"]', '.agent-main-header',
    '.nfp-panel-header'
  ];

  var ACTION_ATTR = 'data-sticky-act';

  /* Useful module actions for a created ⋯ menu — Share, Copy link, Export. */
  function menuActionsHTML() {
    return '<button type="button" class="topbar-menu-item" ' + ACTION_ATTR + '="share" role="menuitem">' +
        '<span class="material-symbols-outlined topbar-menu-icon">share</span><span>Share</span></button>' +
      '<button type="button" class="topbar-menu-item" ' + ACTION_ATTR + '="copy" role="menuitem">' +
        '<span class="material-symbols-outlined topbar-menu-icon">link</span><span>Copy link</span></button>' +
      '<div class="topbar-menu-divider"></div>' +
      '<button type="button" class="topbar-menu-item" ' + ACTION_ATTR + '="export" role="menuitem">' +
        '<span class="material-symbols-outlined topbar-menu-icon">download</span><span>Export</span></button>';
  }

  /* Briefly swap a menu item's label to give click feedback (e.g. "Copied!"). */
  function flashLabel(item, msg) {
    var span = item.querySelector('span:not(.material-symbols-outlined)');
    if (!span || span.dataset.flashing) return;
    span.dataset.flashing = '1';
    var prev = span.textContent;
    span.textContent = msg;
    setTimeout(function () { span.textContent = prev; delete span.dataset.flashing; }, 1200);
  }

  function copyLink(item) {
    var url = location.href;
    var done = function () { flashLabel(item, 'Copied!'); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, done);
        return;
      }
    } catch (_) {}
    done();
  }

  function exportModule(mod) {
    var name = (mod.id || 'module').replace(/[^a-z0-9_-]+/gi, '-');
    try {
      var blob = new Blob(['WISE export placeholder — ' + name + '\n'], { type: 'text/plain' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'wise-' + name + '.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    } catch (_) {}
  }

  /* Delegate clicks on the injected action rows. Share hands off to the app's
     own share panel when present, otherwise falls back to copying the link. */
  function wireActions(pop, mod) {
    pop.addEventListener('click', function (e) {
      var it = e.target.closest('[' + ACTION_ATTR + ']');
      if (!it) return;
      e.stopPropagation();
      var act = it.getAttribute(ACTION_ATTR);
      if (act === 'share') {
        if (typeof window.openShareModal === 'function') {
          try { window.openShareModal(); closeMenu(pop); return; } catch (_) {}
        }
        copyLink(it);
      } else if (act === 'copy') {
        copyLink(it);
      } else if (act === 'export') {
        exportModule(mod);
        closeMenu(pop);
      }
    });
  }

  function closeMenu(pop) {
    pop.classList.add('hidden');
    /* After js/popover-layer.js portals the popover onto <body>, closest()
       from the pop misses the wrap — use the saved host instead. */
    var wrap = pop.closest('.panel-more-wrap') || pop.__plHost;
    var btn = wrap && wrap.querySelector('.panel-more-btn');
    if (btn) { btn.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }
  }

  /* "Remove panel" row — progress modules only. Bespoke `.pf-module-menu`
     variants (portfolio / comparison) don't host progress panes, so a single
     topbar-styled row is enough. */
  function removeItemHTML() {
    return '<button type="button" class="topbar-menu-item topbar-menu-item--danger" ' +
      REMOVE_TOGGLE_ATTR + ' role="menuitem">' +
      '<span class="material-symbols-outlined topbar-menu-icon">visibility_off</span>' +
      '<span>Remove panel</span>' +
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
    /* `screen` covers side-panel modules named that way (e.g. the
       product-portfolio/comparison #settings-screen panel). */
    return /panel|card|module|pane|main|sidebar|dash|screen/i.test(token);
  }

  function isChat(el) { return el.matches && el.matches(CHAT_SEL); }

  /* Docked Turns/History sidebar? `.wch-right` = right (Turns), else left
     (History → out of scope). */
  function isWchSidebar(el) { return el.classList && el.classList.contains('wch-sidebar'); }
  function isWchRight(el) { return isWchSidebar(el) && el.classList.contains('wch-right'); }

  /* Right of the chat? Structural hints first (robust for hidden panels), then
     geometry, then DOM order. */
  function isRightOfChat(mod, chat) {
    /* Progress trackers are, by construction, always the rightmost module of
       the flow (add product / catalog / verification / view product / GRAS).
       Skip the geometry probe for them: on the heavy flows it can momentarily
       report a stale/left position mid-render, and syncSide would then STRIP
       their default `.is-sticky` — leaving the tracker un-tucked. Force true so
       progress panes are sticky by default and never lose it. */
    if (isProgressPane(mod) || isNestedDrawer(mod)) return true;
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
    function collect(el) {
      if (isChat(el) || isExcluded(el)) return;
      if (el.matches && el.matches(GROUP_SEL)) {
        Array.prototype.forEach.call(el.children, collect);
        return;
      }
      if (isModuleLike(el)) mods.push(el);
    }
    Array.prototype.forEach.call(row.children, collect);
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
      /* Close any other open sticky-created menus first. Pops may be on
         <body> (js/popover-layer.js), so walk each wrap + its portaled pop. */
      document.querySelectorAll('.panel-more-wrap[data-sticky-menu]').forEach(function (w) {
        var p = w.querySelector('.topbar-popover');
        if (!p) {
          document.querySelectorAll('.topbar-popover').forEach(function (cand) {
            if (cand.__plHost === w) p = cand;
          });
        }
        if (p && p !== pop) p.classList.add('hidden');
        var b = w.querySelector('.panel-more-btn');
        if (b && b !== btn) {
          b.classList.remove('is-open');
          b.setAttribute('aria-expanded', 'false');
        }
      });
      pop.classList.toggle('hidden', !opening);
      btn.classList.toggle('is-open', opening);
      btn.setAttribute('aria-expanded', opening ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (pop.classList.contains('hidden')) return;
      if (wrap.contains(e.target) || pop.contains(e.target)) return;
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
    /* product-portfolio / product-comparison build a bespoke `.pf-module-menu`
       (via consolidatePanelControls) instead of a `.panel-more-wrap`. Reuse ITS
       popover so we drop the Sticky toggle INTO the module's own ⋯ menu rather
       than adding a second ⋯ button beside it. */
    var pfMenu = mod.querySelector('.pf-module-menu');
    if (pfMenu) return pfMenu.querySelector('.pf-module-menu-pop');
    /* A module that still ships only raw `.panel-controls` will have its
       `.pf-module-menu` built asynchronously — wait for it (the observer
       re-scans) rather than creating a duplicate ⋯ now. */
    if (mod.querySelector('.panel-controls')) return null;
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

  /* Drop one-shot entrance animations after they finish so a later reflow
     (nav rail expand/collapse) cannot replay opacity-from keyframes. */
  function settleAnim(el) {
    if (!el || el.classList.contains('is-entered')) return;
    /* Hidden drawers must not latch `.is-entered` — that would suppress
       stickySlideRight the first time they are actually shown. */
    if (el.hidden || (el.style && el.style.display === 'none')) return;
    var mark = function () { el.classList.add('is-entered'); };
    el.addEventListener('animationend', function (e) {
      if (e.target === el) mark();
    }, { once: true });
    setTimeout(mark, 800);
  }

  /* GENERIC content module: drive `.sticky-mod` + `.is-sticky`. Sticky is now
     permanent, but the tuck is still suppressed while the module sits LEFT of
     the chat — e.g. after the WISEcodeAI dock's Appearance side-mode moves panes
     across — via the isRightOfChat guard. */
  function setGenericSticky(mod, on, chat) {
    mod.dataset.stickyPref = on ? 'on' : 'off';
    mod.classList.add('sticky-mod');
    if (chat === undefined) {
      var row = getRow();
      chat = row ? row.querySelector(CHAT_SEL) : null;
    }
    var want = on && isRightOfChat(mod, chat);
    if (!want) mod.classList.remove('is-entered');
    mod.classList.toggle('is-sticky', want);
    if (want) settleAnim(mod);
  }

  /* Re-apply the pref against the module's CURRENT side of the chat. Called on
     every scan so side flips (inline `order` / class changes, which never fire
     childList mutations) tuck/untuck the module correctly. */
  function syncSide(mod, chat) {
    if (isWchSidebar(mod)) return;
    if (!mod.dataset.stickyPref) return;
    if (mod.querySelector(SELF_MANAGED_SEL)) return;
    var want = mod.dataset.stickyPref === 'on' && isRightOfChat(mod, chat);
    if (mod.classList.contains('is-sticky') !== want) {
      if (!want) mod.classList.remove('is-entered');
      mod.classList.toggle('is-sticky', want);
      if (want) settleAnim(mod);
    }
  }

  /* DOCKED Turns sidebar: drive `.wch-unsticky` (ON = not unsticky) and make
     sure the row carries `.modules-sticky` so chat-history.js's tuck CSS fires. */
  function setWchSticky(mod, on) {
    var row = getRow();
    if (row) row.classList.add('modules-sticky');
    mod.classList.toggle('wch-unsticky', !on);
  }

  /* ── Remove / restore a progress panel ──────────────────────────────────
     "Remove panel" hides the tracker outright and drops a slim restore tab at
     the row's right edge so it can be brought back. The choice persists per
     page. Hidden state is enforced with an inline `display:none` because some
     pages pin the pane's display at id-level (e.g. add-catalog's
     `#ap-progress { display:flex }`), which out-ranks the shared
     `.vf-progress-pane[hidden]` rule. */
  function applyRemoved(mod) {
    mod.hidden = true;
    mod.style.display = 'none';
    ensureRestoreTab(mod);
  }
  function removePanel(mod) {
    try { localStorage.setItem(progressKey(mod), '1'); } catch (_) {}
    applyRemoved(mod);
  }
  function restorePanel(mod) {
    try { localStorage.removeItem(progressKey(mod)); } catch (_) {}
    mod.hidden = false;
    mod.style.removeProperty('display');
    var tab = document.querySelector('[data-progress-restore="' + restoreId(mod) + '"]');
    if (tab) tab.remove();
    scan(); /* re-wire the toggle/menu that was hidden away with the panel */
  }
  function restoreId(mod) { return mod.id || 'progress'; }
  function ensureRestoreTab(mod) {
    var row = getRow();
    if (!row) return;
    var id = restoreId(mod);
    if (row.querySelector('[data-progress-restore="' + id + '"]')) return;
    var tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'wise-progress-restore';
    tab.setAttribute('data-progress-restore', id);
    tab.title = 'Show progress panel';
    tab.setAttribute('aria-label', 'Show progress panel');
    tab.innerHTML = '<span class="material-symbols-outlined">chevron_left</span><span class="wpr-label">Progress</span>';
    tab.addEventListener('click', function (e) { e.stopPropagation(); restorePanel(mod); });
    row.appendChild(tab);
  }

  /* Idempotently make a module permanently sticky and give it a ⋯ menu of
     useful actions. Safe to re-call as the DOM changes (waits for async-built
     menus). `chat` is used only for the right-of-chat test, evaluated lazily so
     already-wired modules stay cheap. */
  function ensureToggle(mod, chat) {
    /* Progress panel the user removed → keep it hidden (survives re-renders and
       reloads) and leave the restore tab in place. */
    if (isProgressPane(mod) && isPanelRemoved(mod)) { applyRemoved(mod); return; }
    if (isWchSidebar(mod) && !isWchRight(mod)) return; /* History (left) */
    if (mod.querySelector(SELF_MANAGED_SEL)) return;   /* owns its own ⋯ menu → leave */

    var wch = isWchRight(mod);

    /* Menu WE injected is already present → just keep the tuck in sync with the
       module's current side of the chat and bail. (Progress panes re-render and
       wipe the menu; this test goes false then, so we re-inject below.) */
    if (mod.querySelector('[' + ACTION_ATTR + ']')) { if (!wch) syncSide(mod, chat); return; }

    /* Reused native menu we can't inject into (e.g. the portfolio/comparison
       pf-menu) — already forced sticky once; keep the side in sync and bail. */
    if (mod.dataset.stickyForced === '1' && !isProgressPane(mod)) { if (!wch) syncSide(mod, chat); return; }

    if (!isRightOfChat(mod, chat)) return; /* left of the chat (for now) → skip;
      the attribute-aware observer re-scans if it ever moves right of it. */

    /* Force sticky ON — the only module style now. */
    if (wch) setWchSticky(mod, true); else setGenericSticky(mod, true, chat);
    mod.dataset.stickyForced = '1';

    var pop = ensureMenu(mod);
    if (!pop) return; /* native menu not built yet — retry on next mutation */

    /* Only enrich menus WE created (marked data-sticky-menu). Reused native
       menus — the pf-menu on portfolio/comparison — keep their own rows. */
    var created = pop.closest('.panel-more-wrap[data-sticky-menu]');
    if (!created) return;

    pop.insertAdjacentHTML('afterbegin', menuActionsHTML());
    wireActions(pop, mod);

    /* Progress modules only: append a "Remove panel" row that hides the tracker
       outright (leaving a restore tab behind). */
    if (isProgressPane(mod)) {
      pop.insertAdjacentHTML('beforeend', '<div class="topbar-menu-divider"></div>' + removeItemHTML());
      var rm = pop.querySelector('[' + REMOVE_TOGGLE_ATTR + ']');
      if (rm) rm.addEventListener('click', function (e) {
        e.stopPropagation();
        removePanel(mod);
      });
    }
  }

  function scan() {
    var found = collectCandidates();
    if (!found) return;
    found.mods.forEach(function (mod) {
      ensureToggle(mod, found.chat);
      if (mod.classList.contains('is-sticky')) settleAnim(mod);
    });
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
    /* Also observe class/style attribute flips: panels open/close and the
       WISEcodeAI dock's side modes move panes with class toggles and inline
       `order` styles only — no childList mutation — so without this a module
       that BECOMES right-of-chat would never get wired (or untucked when it
       moves back left). Scans stay cheap: wired modules early-return. */
    observer.observe(row, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }

  function init() {
    if (!getRow()) return;
    scan();
    observe();
    var inner = document.querySelector('.agent-main-inner');
    if (inner) inner.classList.add('is-entered');
    var menuInner = document.querySelector('#menu-panel .menu-inner');
    if (menuInner) menuInner.classList.add('is-entered');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.WiseStickyModules = { init: init, scan: scan, ensureToggle: ensureToggle };
})();
