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
    '.ma-rowmenu-pop',
    '.inv-rowmenu-pop',
    '.pf-filter-pop',
    '.ma-filter-pop',
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
    '.adm-rowmenu-pop',
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
    // Desired position in VIEWPORT space: the anchor's live position plus the
    // offset the popover had from it when floated.
    var left = clamp(aRect.left + el.__plDX, 8, window.innerWidth - w - 8);
    var top = clamp(aRect.top + el.__plDY, 8, window.innerHeight - h - 8);
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
