/* popover-layer.js — make menu/module popovers escape ancestor `overflow`
   clipping so they always render on top of everything, everywhere in the app.

   The problem: most surfaces anchor a popover (the three-dot "More" menu, the
   attach "+" / model menus, row/filter menus, etc.) inside a carded module. To
   keep their rounded corners and scroll their bodies, those cards clip overflow
   (`.sc-card` / `.wa-chat` / `.wa-pane` use overflow:hidden) and the modules row
   itself scrolls horizontally (`#modules-row { overflow-x:auto }`). An
   absolutely-positioned popover is therefore clipped at the module box and gets
   cut off — it can't sit on top of everything from inside a clipping/scroll
   container, and no single-axis CSS trick escapes it.

   The fix: while a popover is OPEN, move it to `document.body` and pin it with
   `position:fixed` at the spot it already occupies in-flow. Staying inside a
   module (even as `position:fixed`) cannot beat a body-level overlay such as
   the chat activity strip — `#wa-chat`'s own z-index is a stacking context,
   so no in-module z-index escapes it. Portaling to `<body>` puts the menu in
   the same layer as those overlays, above everything. A comment marker holds
   its original DOM slot so it restores the instant it hides.

   Dismiss is also central: a capture-phase pointerdown/click (and Escape)
   closes any shown menu whose event landed outside it. Local close handlers
   often look the popover up as a descendant of its wrap (`wrap.querySelector`
   / `wrap.contains`); after the portal that lookup misses, so the menu would
   otherwise stick on screen. Opt out with `data-popover-static`.

   Self-guarding + idempotent; a no-op on pages with no popovers. */
(function () {
  if (typeof document === 'undefined') return;
  if (window.__wisePopoverLayer) return;
  window.__wisePopoverLayer = true;

  /* Above every in-app z-index (module lifts, docks, sticky rows, manifest
     rails) so a floated popover is always the topmost thing on screen. */
  var Z = 2147483000;

  /* Popovers this layer manages. Every one hides via `display:none` (a
     `.hidden` / `[hidden]` toggle, or a default display:none flipped on by an
     `.open` / `.lir-pop-open` class), so a computed-display check is a uniform,
     reliable "is it showing?" test regardless of how each is toggled.

     `.wise-popover` (Appearance / user menu) is intentionally excluded — it is
     already positioned as a fixed layer by topbar.js and must not be re-pinned. */
  var SELECTOR = [
    '.topbar-popover',
    '.wch-more-pop',
    '.fl-more-popover',
    '.fl-model-popover',
    '.pf-rowmenu-pop',
    /* Row menus on the table specimens on analytics-types.html. Their card
       scrolls horizontally, so an in-flow popover is clipped at the card box. */
    '.attb-rowmenu-pop',
    '.ma-rowmenu-pop',
    '.inv-rowmenu-pop',
    '.adm-rowmenu-pop',
    '.pf-filter-pop',
    '.ma-filter-pop',
    '.adm-filter-pop',
    '.wmod-filter-pop',
    '.gv-filter-pop',
    '.wise-filter-pop',
    '.pf-gs-infopop',
    '.pf-add-menu',
    '.pf-brand-menu',
    '.pf-module-menu-pop',
    '.pf-reports-pop',
    '#lir-more-popover',
    /* Chat-module popovers anchored INSIDE the transcript. They're pinned
       absolutely within an answer's meta row (low z-index), so the chat card's
       overflow clipping and any later transcript element (reply chips, the next
       answer) can cover them. The chat rules it all: float them like every
       other menu so they always sit on top of everything on screen. Each toggles
       via `hidden`/`.hidden`, which the observer below already watches.
         .sc-fb-reasons — answer thumbs-up / thumbs-down reason picker
         .sc-fb-menu    — the per-answer three-dot "more" menu
         .sc-fb-pop     — compare-board / portfolio reply feedback reasons */
    '.sc-fb-reasons',
    '.sc-fb-menu',
    '.sc-fb-pop',
    /* Date-column ⋮ picker — tables clip overflow, so this must float like
       every other header menu. Opens above / to the right of the trigger. */
    '.w-datemenu-pop',
    '.pf-datemenu-pop',
  ].join(',');

  /* Three-dot / row menus that are not floated by this layer (they stay in
     flow) but still need the same click-off / Escape dismiss, because their
     own bubble-phase listeners are often eaten by stopPropagation. */
  var DISMISS_EXTRA = [
    '.adm-menu',
  ].join(',');

  var floated = new Set();

  /* `data-popover-static` opts a node out of the layer — used by surfaces that
     render a popover inline as a specimen (e.g. the All Modules component
     library), where pinning it to the viewport would tear it out of its card. */
  function isManaged(el) {
    return el && el.nodeType === 1 && typeof el.matches === 'function' && el.matches(SELECTOR) &&
      !el.hasAttribute('data-popover-static');
  }

  /* Shown = laid out (not display:none). getClientRects() is empty for
     display:none but present for a visible box, so it also rejects detached
     nodes without a second reflow. */
  function isShown(el) {
    return el.isConnected && el.getClientRects().length > 0 &&
      getComputedStyle(el).display !== 'none';
  }

  function clamp(v, min, max) {
    return max < min ? min : Math.max(min, Math.min(v, max));
  }

  /* Pin `el` to the viewport spot it currently occupies in-flow. Captures its
     offset from its anchor (the positioned ancestor it's laid out against) once,
     so it can be kept aligned as that anchor scrolls/moves. */
  function floatEl(el) {
    // Anchor = the element the popover is laid out relative to (its offsetParent
    // while still absolutely positioned). Captured BEFORE we switch to fixed
    // (fixed elements report offsetParent === null).
    var anchor = el.offsetParent || el.parentElement;
    if (!anchor) return;

    // Measure the resting rect with any entry animation (which may carry a
    // translate/scale transform at frame 0) neutralized, so the pin lands on the
    // final position rather than the animation's starting offset.
    var prevAnim = el.style.animation;
    el.style.animation = 'none';
    var aRect = anchor.getBoundingClientRect();
    var pRect = el.getBoundingClientRect();
    el.style.animation = prevAnim;

    el.__plAnchor = anchor;
    el.__plDX = pRect.left - aRect.left;
    el.__plDY = pRect.top - aRect.top;
    // Remember what we overwrote so hiding restores the authored styles exactly.
    el.__plPrev = {
      position: el.style.position,
      top: el.style.top,
      left: el.style.left,
      right: el.style.right,
      bottom: el.style.bottom,
      margin: el.style.margin,
      zIndex: el.style.zIndex,
    };

    /* Lift onto <body> so the menu competes with body-level overlays (the
       activity-strip rail lives there at z-index 70) instead of remaining
       trapped in the chat module's stacking context. A comment marker holds
       the original slot for restore. */
    el.__plHost = isPageRoot(el.parentElement) ? null : el.parentElement;
    if (el.parentNode) {
      var marker = document.createComment('wise-pl');
      el.parentNode.insertBefore(marker, el);
      el.__plMarker = marker;
      document.body.appendChild(el);
    }

    el.style.position = 'fixed';
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    el.style.margin = '0';
    el.style.zIndex = String(Z);
    floated.add(el);
    place(el);
  }

  /* (Re)compute the fixed coordinates from the live anchor rect + captured
     offset, clamped to stay fully on-screen. Cheap enough to run on scroll. */
  function place(el) {
    var anchor = el.__plAnchor;
    if (!anchor || !anchor.isConnected) return;
    var aRect = anchor.getBoundingClientRect();
    var w = el.offsetWidth || 0;
    var h = el.offsetHeight || 0;
    var left;
    var top;
    /* Grouped chat ⋮ grows when Internal admins reveals Helix. Re-hang from
       the kebab's right edge using the live width so the panel does not keep
       the offset captured for the one-column member menu. */
    if (el.classList && el.classList.contains('sc-menu-grouped') &&
        !el.classList.contains('sc-helix-float')) {
      var host = el.__plHost;
      var btn = host && host.querySelector &&
        host.querySelector('.panel-more-btn, [aria-haspopup="menu"]');
      if (btn) {
        var bRect = btn.getBoundingClientRect();
        left = clamp(bRect.right - w, 8, window.innerWidth - w - 8);
        top = clamp(bRect.bottom + 6, 8, window.innerHeight - h - 8);
        if (bRect.bottom + 6 + h > window.innerHeight - 8 &&
            bRect.top - h - 6 >= 8) {
          top = bRect.top - h - 6;
        }
        el.__plDX = left - aRect.left;
        el.__plDY = top - aRect.top;
      }
    }
    if (left == null) {
      // Desired position in VIEWPORT space: the anchor's live position plus the
      // offset the popover had from it when floated.
      left = clamp(aRect.left + el.__plDX, 8, window.innerWidth - w - 8);
      top = clamp(aRect.top + el.__plDY, 8, window.innerHeight - h - 8);
    }
    // A `position:fixed` box is normally viewport-relative — UNLESS an ancestor
    // establishes a containing block (any non-`none` transform/filter/perspective/
    // will-change/contain). Several surfaces have exactly that: e.g. the chat card
    // keeps a settled `transform` from its `both`-filled entry animation, so left/
    // top would resolve against that card's box and the menu would land off its
    // anchor. Probe where the element actually sits at (0,0) and offset by that
    // origin, so the final coordinates are truly viewport-relative no matter what
    // the containing block turns out to be (origin is 0,0 when there's none).
    el.style.left = '0px';
    el.style.top = '0px';
    var origin = el.getBoundingClientRect();
    el.style.left = Math.round(left - origin.left) + 'px';
    el.style.top = Math.round(top - origin.top) + 'px';
  }

  function unfloatEl(el) {
    if (!floated.has(el)) return;
    floated.delete(el);
    var prev = el.__plPrev || {};
    el.style.position = prev.position || '';
    el.style.top = prev.top || '';
    el.style.left = prev.left || '';
    el.style.right = prev.right || '';
    el.style.bottom = prev.bottom || '';
    el.style.margin = prev.margin || '';
    el.style.zIndex = prev.zIndex || '';
    var marker = el.__plMarker;
    if (marker && marker.parentNode) {
      marker.parentNode.insertBefore(el, marker);
      marker.parentNode.removeChild(marker);
    }
    delete el.__plMarker;
    delete el.__plHost;
    delete el.__plAnchor;
    delete el.__plDX;
    delete el.__plDY;
    delete el.__plPrev;
  }

  /* Reconcile one popover to its current shown/hidden state. */
  function sync(el) {
    if (!isManaged(el)) return;
    if (isShown(el)) {
      if (!floated.has(el)) floatEl(el);
      else place(el);
    } else if (floated.has(el)) {
      unfloatEl(el);
    }
  }

  /* Watch class / hidden changes app-wide — that's how every managed popover is
     opened and closed. We only ever write inline `style` (not observed), so this
     never re-triggers itself. */
  var mo = new MutationObserver(function (records) {
    for (var i = 0; i < records.length; i++) {
      var t = records[i].target;
      if (isManaged(t)) sync(t);
    }
  });

  function start() {
    mo.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'hidden'],
    });
    // Catch anything already open at load.
    document.querySelectorAll(SELECTOR).forEach(sync);
  }

  // Keep floated popovers glued to their anchors as the page/module scrolls or
  // resizes. Runs only while something is floated, coalesced to one rAF.
  var raf = 0;
  function refresh() {
    if (!floated.size || raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      floated.forEach(function (el) {
        if (isShown(el)) place(el);
        else unfloatEl(el);
      });
    });
  }
  window.addEventListener('scroll', refresh, true);
  window.addEventListener('resize', refresh);
  /* Accessible colors on/off changes whether a filter containing block exists.
     Re-pin any open menus so they stay on their anchors in both palettes. */
  document.addEventListener('wise:colorblind', refresh);
  /* Internal admins on/off changes the grouped chat ⋮ width (Helix column).
     Wait two frames so applyChatMenuAdminGate can finish hiding/showing
     columns before we re-measure. */
  document.addEventListener('wise:admin-ui', function () {
    requestAnimationFrame(function () { requestAnimationFrame(refresh); });
  });

  /* ── Click-off / Escape dismiss ───────────────────────────────────────
     Capture so a click that another handler stopPropagates still closes the
     menu. Skip the popover itself, its original wrap (the ⋯ trigger lives
     there — the trigger's own toggle owns open/close), and a nested popover
     that was portaled out of this one (both sit on <body>, so contains()
     alone would close the parent while using the child). */

  function isPageRoot(node) {
    return !node || node === document.body || node === document.documentElement;
  }

  function originHost(el) {
    /* Never treat <body> as the trigger wrap — some openers portal onto
       body themselves before this layer does, and a body host would make
       every click look "inside" the menu (so it could never dismiss). */
    var host = el.__plHost;
    if (host && host.nodeType === 1 && host.isConnected && !isPageRoot(host)) return host;
    var markerParent = el.__plMarker && el.__plMarker.parentNode;
    if (markerParent && markerParent.nodeType === 1 && !isPageRoot(markerParent)) return markerParent;
    var parent = el.parentElement;
    return parent && !isPageRoot(parent) ? parent : null;
  }

  function shownPops() {
    var seen = [];
    function add(el) {
      if (!el || el.nodeType !== 1 || el.hasAttribute('data-popover-static')) return;
      if (!isShown(el)) return;
      for (var i = 0; i < seen.length; i++) if (seen[i] === el) return;
      seen.push(el);
    }
    document.querySelectorAll(SELECTOR).forEach(add);
    document.querySelectorAll(DISMISS_EXTRA).forEach(add);
    floated.forEach(add);
    return seen;
  }

  function clickInsideTree(el, target, shown) {
    if (el.contains(target)) return true;
    var host = originHost(el);
    if (host && host.contains && host.contains(target)) return true;
    if (el.id && target.closest) {
      var opener = target.closest('[aria-controls="' + el.id + '"]');
      if (opener) return true;
    }
    for (var i = 0; i < shown.length; i++) {
      var other = shown[i];
      if (other === el || !other.contains(target)) continue;
      var otherHost = originHost(other);
      if (otherHost && el.contains(otherHost)) return true;
    }
    return false;
  }

  /* Reverse the mechanism that showed this popover — do not stack a second
     hide flag the opener doesn't know to clear (e.g. a `hidden` attribute on
     a `.topbar-popover` that only toggles `.hidden`). */
  function hidePop(el) {
    el.classList.remove('open');
    el.classList.remove('lir-pop-open');
    if (el.classList.contains('topbar-popover') ||
        el.classList.contains('wch-more-pop') ||
        el.classList.contains('sc-fb-pop')) {
      el.classList.add('hidden');
    } else if (!el.classList.contains('fl-more-popover') &&
               !el.classList.contains('fl-model-popover') &&
               el.id !== 'lir-more-popover') {
      el.hidden = true;
      el.setAttribute('hidden', '');
    }
    try { el.dispatchEvent(new CustomEvent('wise:popover-dismiss', { bubbles: true })); } catch (err) {}
  }

  function markTriggerClosed(el) {
    var host = originHost(el);
    if (!host || host.nodeType !== 1 || host === document.body) return;
    host.classList.remove('is-open');
    var nodes = host.querySelectorAll('[aria-expanded="true"], .is-open');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.remove('is-open');
      if (nodes[i].hasAttribute('aria-expanded')) nodes[i].setAttribute('aria-expanded', 'false');
    }
  }

  function dismiss(el) {
    if (!el) return;
    markTriggerClosed(el);
    hidePop(el);
  }

  function onDocDismiss(e) {
    var target = e.target;
    if (target && target.nodeType !== 1) target = target.parentElement;
    if (!target) return;
    var shown = shownPops();
    if (!shown.length) return;
    for (var i = 0; i < shown.length; i++) {
      if (!clickInsideTree(shown[i], target, shown)) dismiss(shown[i]);
    }
  }

  function onKeyDismiss(e) {
    if (e.key !== 'Escape') return;
    var shown = shownPops();
    if (!shown.length) return;
    for (var i = shown.length - 1; i >= 0; i--) dismiss(shown[i]);
  }

  document.addEventListener('pointerdown', onDocDismiss, true);
  document.addEventListener('click', onDocDismiss, true);
  document.addEventListener('keydown', onKeyDismiss, true);

  /* ── Open / close state (row menus + filter pops) ───────────────────
     Portaling and click-off live above. Flows used to copy the same
     is-open / aria-expanded / hidden / close-siblings toggle; they now
     call window.WisePopover. */

  var DEFAULT_MENUS = '.adm-rowmenu, .inv-rowmenu, .pf-rowmenu, .ma-rowmenu';
  var DEFAULT_BTNS = '.adm-rowmenu-btn, .inv-rowmenu-btn, .pf-rowmenu-btn, .ma-rowmenu-btn';
  var DEFAULT_POPS = '.adm-rowmenu-pop, .inv-rowmenu-pop, .pf-rowmenu-pop, .ma-rowmenu-pop';

  function popOf(menu, popSel) {
    if (!menu) return null;
    var sel = popSel || DEFAULT_POPS;
    var inner = menu.querySelector(sel);
    if (inner) return inner;
    var all = document.querySelectorAll(sel);
    for (var i = 0; i < all.length; i++) {
      if (all[i].__plHost === menu) return all[i];
    }
    return null;
  }

  function setMenuOpen(menu, open, opts) {
    if (!menu) return;
    opts = opts || {};
    var btn = menu.querySelector(opts.btnSel || DEFAULT_BTNS);
    var pop = popOf(menu, opts.popSel);
    menu.classList.toggle('is-open', !!open);
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (pop) {
      pop.hidden = !open;
      if (open) pop.removeAttribute('hidden');
      else {
        pop.setAttribute('hidden', '');
        pop.style.cssText = '';
      }
    }
  }

  function closeAllMenus(root, keep, opts) {
    opts = opts || {};
    var menuSel = opts.menuSel || DEFAULT_MENUS;
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll(menuSel + '.is-open').forEach(function (menu) {
      if (menu === keep) return;
      setMenuOpen(menu, false, opts);
    });
    var popSel = opts.popSel || DEFAULT_POPS;
    document.querySelectorAll(popSel).forEach(function (pop) {
      if (pop.parentElement !== document.body) return;
      var host = pop.__plHost;
      if (keep && host === keep) return;
      if (host && host.isConnected && host.classList.contains('is-open')) return;
      pop.hidden = true;
      pop.setAttribute('hidden', '');
      if (!host || !host.isConnected) pop.remove();
    });
  }

  function toggleMenu(menu, opts) {
    if (!menu) return false;
    var open = !menu.classList.contains('is-open');
    closeAllMenus(opts && opts.root, open ? menu : null, opts);
    setMenuOpen(menu, open, opts);
    return open;
  }

  function bindRowMenus(root, opts) {
    if (!root || root.__wiseRowMenusBound) return;
    root.__wiseRowMenusBound = true;
    opts = opts || {};
    var btnSel = opts.btnSel || DEFAULT_BTNS;
    var menuSel = opts.menuSel || DEFAULT_MENUS;
    var cfg = { root: root, btnSel: btnSel, menuSel: menuSel, popSel: opts.popSel };
    root.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest(btnSel);
      if (!btn || !root.contains(btn)) return;
      var menu = btn.closest(menuSel);
      if (!menu) return;
      toggleMenu(menu, cfg);
      e.stopPropagation();
    });
    if (root.__wiseRowDismissBound) return;
    root.__wiseRowDismissBound = true;
    document.addEventListener('click', function (e) {
      if (!root.isConnected) return;
      if (e.target.closest && (e.target.closest(menuSel) || e.target.closest(cfg.popSel || DEFAULT_POPS))) return;
      closeAllMenus(root, null, cfg);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAllMenus(root, null, cfg);
    });
    window.addEventListener('scroll', function () { closeAllMenus(root, null, cfg); }, { capture: true, passive: true });
    window.addEventListener('resize', function () { closeAllMenus(root, null, cfg); });
  }

  var FILTER_BOUND = Object.create(null);

  function bindFilterPop(opts) {
    if (!opts || typeof opts.setOpen !== 'function') return function () {};
    var insideSel = opts.insideSel || '.wise-search-inline, .adm-search-inline';
    var popSel = opts.popSel || '[data-adm-filter-pop], .wise-filter-pop, .adm-filter-pop, .wmod-filter-pop, .ma-filter-pop, .gv-filter-pop';
    var key = insideSel + '\0' + popSel;
    if (FILTER_BOUND[key]) return FILTER_BOUND[key];
    function close() {
      if (opts.isOpen && opts.isOpen()) opts.setOpen(false);
    }
    document.addEventListener('click', function (e) {
      if (!opts.isOpen || !opts.isOpen()) return;
      if (e.target.closest && e.target.closest(insideSel)) return;
      close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
    document.addEventListener('wise:popover-dismiss', function (e) {
      if (e.target && e.target.closest && e.target.closest(popSel)) close();
    });
    FILTER_BOUND[key] = close;
    return close;
  }

  window.WisePopover = {
    popOf: popOf,
    setOpen: setMenuOpen,
    closeAll: closeAllMenus,
    toggle: toggleMenu,
    bindRowMenus: bindRowMenus,
    bindFilterPop: bindFilterPop,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
