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

   The fix: while a popover is OPEN, promote it to `position:fixed` pinned to the
   exact spot it already occupies in-flow. Fixed positioning leaves every
   ancestor's overflow/scroll context, so the menu floats above everything. The
   node is NOT moved in the DOM — only its CSS position changes — so delegated
   handlers, click-outside checks (`e.target.closest(...)`) and `:has()` styling
   keep working unchanged. It reverts the instant the popover hides.

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
    '.pf-filter-pop',
    '.pf-gs-infopop',
    '#lir-more-popover',
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
