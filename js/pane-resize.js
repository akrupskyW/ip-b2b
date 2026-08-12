/* ═══════════════════════════════════════════════════════════════════════════
   pane-resize.js — resize the modules/panes in #modules-row by dragging.

   Behaviour (traditional splitter style):
   • Every module in #modules-row is resizable. The Navigation module lives
     OUTSIDE the row, so it is never affected.
   • Nothing is shown at rest. When you hover the left or right edge between two
     panes (or the outer edge of an end pane), a small drag handle fades in and
     the cursor becomes a col-resize. Drag it to any width; the neighbouring pane
     grows/shrinks to match the direction you drag.
   • Widths are remembered per-page in localStorage. Double-click a handle to
     reset the two panes it sits between.

   Implementation: handles are drawn in a fixed, body-level overlay so they are
   never clipped by a pane's overflow, never cover a pane's buttons/content, and
   never change the row's own DOM — so no existing page code is disturbed. This
   file is loaded once from js/agent-menu.js (which every #modules-row page runs)
   and self-initialises; it is idempotent.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__wisePaneResize) return;
  window.__wisePaneResize = true;

  var STORE_KEY = 'wise-pane-widths-v1';
  var MIN_W = 300;      // px hard floor for every module — never resize below this
  var HIT = 16;         // px width of the (invisible) grab strip
  var STACK_BP = 560;   // px — row stacks vertically below this (wise.css)

  var rows = [];        // managed { row, overlay, handles[], active }

  /* ── storage ──────────────────────────────────────────────────────────── */
  function pageId() { return location.pathname; }
  function readAll() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; }
    catch (_) { return {}; }
  }
  function writeAll(o) { try { localStorage.setItem(STORE_KEY, JSON.stringify(o)); } catch (_) {} }
  function readPage() { return readAll()[pageId()] || {}; }
  function saveWidth(k, w) { var a = readAll(); (a[pageId()] = a[pageId()] || {})[k] = Math.round(w); writeAll(a); }
  function clearWidth(k) { var a = readAll(); if (a[pageId()]) { delete a[pageId()][k]; writeAll(a); } }

  /* ── pane discovery ───────────────────────────────────────────────────── */
  function isOverlay(el) { return el.classList && el.classList.contains('pr-overlay'); }
  function isNav(el) {
    return el.id === 'menu-panel' || el.id === 'topbar-row' ||
           (el.classList && el.classList.contains('menu-panel'));
  }
  function isVisible(el) {
    if (!el || el.nodeType !== 1 || el.hasAttribute('hidden')) return false;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    return el.offsetWidth > 24 && el.offsetHeight > 0;
  }
  function panes(row) {
    var out = [];
    for (var c = row.firstElementChild; c; c = c.nextElementSibling)
      if (!isOverlay(c) && !isNav(c) && isVisible(c)) out.push(c);
    // Order panes by their VISUAL position, not DOM order. Some pages reorder
    // the row with CSS `order` (e.g. the WISEcodeAI Library / reports docks the chat
    // to the LEFT of the module via `order:-1`, even though the dock is appended
    // LAST in the DOM). Seam handles must sit between visually-adjacent panes:
    // if we kept DOM order here, a split's "left" pane could be the one that is
    // visually on the RIGHT, so the seam midpoint would be computed between two
    // non-adjacent edges and the handle would land in the MIDDLE of the row
    // (floating over a module's content) instead of on the real seam. Sorting by
    // the live left edge also keeps outerL/outerR and the drag direction correct.
    out.sort(function (a, b) {
      return a.getBoundingClientRect().left - b.getBoundingClientRect().left;
    });
    return out;
  }
  function positionIndex(row, el) {
    var n = 0;
    for (var c = row.firstElementChild; c; c = c.nextElementSibling) {
      if (isOverlay(c)) continue;
      if (c === el) return n;
      n++;
    }
    return -1;
  }
  function keyOf(row, el) {
    if (el.id) return '#' + el.id;
    var cls = ((el.className || '') + '').trim().split(/\s+/).filter(Boolean)[0] || el.tagName.toLowerCase();
    return el.tagName.toLowerCase() + '.' + cls + '@' + positionIndex(row, el);
  }
  // Preset-width classes toggled by a pane's own "width" button (single → wide →
  // triple). When one is present the page controls that pane's width, so we must
  // stand down and let the preset win rather than force our pinned width.
  function hasPreset(el) {
    return !!(el.classList && (el.classList.contains('panel-wide') || el.classList.contains('panel-triple') ||
              el.classList.contains('panel-fill') || el.classList.contains('pane-wide') ||
              el.classList.contains('pane-triple') || el.classList.contains('pane-fill')));
  }
  // A "fill" pane (marked data-pr-fill) is the flexible middle module that
  // absorbs the row's remaining space (e.g. the WISEcodeAI chat between the
  // broken-out History / Turns modules) — we never pin it or restore a saved
  // width onto it; drags adjust its NEIGHBOUR instead. BUT the flag is only a
  // hint: a page may pin that same element to a FIXED column via CSS in some
  // states (e.g. WISEcodeAI fixes the chat to a 420px column once a result pane
  // opens, making the RESULT panes the flexible fillers). If we still treated
  // it as the absorber there, a drag on an adjacent seam would "restore" it to
  // its CSS width on release — snapping it back to its original place. So a
  // data-pr-fill pane only counts as fill while it is ACTUALLY flexible
  // (flex-grow > 0); when CSS has pinned it fixed we let it be dragged/pinned
  // like any other fixed pane and let the truly-flexible panes absorb.
  function isFill(el) {
    return !!(el && el.nodeType === 1 && el.hasAttribute && el.hasAttribute('data-pr-fill')) && growOf(el) > 0;
  }
  // A "locked" pane (marked data-pr-lock) opts out of resizing entirely — no
  // drag handle is offered on either of its seams and its width is never pinned
  // or restored. Used e.g. by the History module while it is minimized to its
  // fixed-width icon rail: a minimized panel must not be draggable/resizable.
  function isLocked(el) {
    return !!(el && el.nodeType === 1 && el.hasAttribute && el.hasAttribute('data-pr-lock'));
  }

  /* ── width helpers ────────────────────────────────────────────────────── */
  function rectW(el) { return el.getBoundingClientRect().width; }
  function growOf(el) { var g = parseFloat(getComputedStyle(el).flexGrow); return isNaN(g) ? 0 : g; }
  // Every module has a hard 300px floor. A pane may declare a LARGER min-width
  // (which we honour), but never a smaller one — MIN_W always wins.
  function minOf(el) { var m = parseFloat(getComputedStyle(el).minWidth); return (!isNaN(m) && m > 0) ? Math.max(MIN_W, m) : MIN_W; }
  // We pin with !important so a pane's stylesheet rule (e.g. a `width` bound to a
  // CSS variable, or a `.panel-wide` class) can never out-specify a dragged size.
  function snap(el) {
    var s = el.style;
    return {
      flex: s.getPropertyValue('flex'), fp: s.getPropertyPriority('flex'),
      width: s.getPropertyValue('width'), wp: s.getPropertyPriority('width'),
      maxWidth: s.getPropertyValue('max-width'), mp: s.getPropertyPriority('max-width')
    };
  }
  function restore(el, s) {
    s.flex ? el.style.setProperty('flex', s.flex, s.fp) : el.style.removeProperty('flex');
    s.width ? el.style.setProperty('width', s.width, s.wp) : el.style.removeProperty('width');
    s.maxWidth ? el.style.setProperty('max-width', s.maxWidth, s.mp) : el.style.removeProperty('max-width');
  }
  function pin(el, w) {
    w = Math.round(w);
    el.style.setProperty('flex', '0 0 ' + w + 'px', 'important');
    el.style.setProperty('width', w + 'px', 'important');
    el.style.setProperty('max-width', 'none', 'important');
  }
  function clearInline(el) {
    el.style.removeProperty('flex');
    el.style.removeProperty('width');
    el.style.removeProperty('max-width');
    el.style.removeProperty('transition');
  }

  function applyStored(row) {
    var ps = panes(row);
    // A single visible pane always fills the row — never restore a saved fixed
    // width onto it (a lone pane has no drag handle, so any stored width is a
    // leftover from a multi-pane layout, e.g. the WISEcodeAI chat after its result
    // panes were closed). Re-pinning it would wrongly hold it narrow.
    if (ps.length < 2) return;
    var stored = readPage();
    ps.forEach(function (el) {
      if (hasPreset(el)) return;            // preset width button owns this pane
      if (isLocked(el)) return;             // minimized/locked pane owns its own fixed width
      if (isFill(el)) { clearInline(el); return; }  // flexible filler: stays fluid
      var w = stored[keyOf(row, el)];
      // Clamp any previously-saved width up to the hard floor so a width stored
      // before the floor existed can never hold a module below MIN_W.
      if (w != null && isFinite(w)) pin(el, Math.max(minOf(el), w));
    });
  }

  /* ── handle specs ─────────────────────────────────────────────────────── */
  // Returns a list describing each handle for the current pane set:
  //   { mode:'split', left, right }  — divider between two panes
  //   { mode:'outerL', right }       — outer-left edge of the first pane
  //   { mode:'outerR', left }        — outer-right edge of the last pane
  function specsFor(ps) {
    var out = [], n = ps.length;
    if (n < 1) return out;
    var hasFlex = ps.some(function (p) { return growOf(p) > 0; });
    // Skip any split seam that touches a locked pane (e.g. a minimized module).
    for (var i = 0; i < n - 1; i++) {
      if (isLocked(ps[i]) || isLocked(ps[i + 1])) continue;
      out.push({ mode: 'split', left: ps[i], right: ps[i + 1] });
    }
    // Outer handles only for fixed end-panes, and only when a flexible pane can
    // absorb the change (otherwise dragging would open an empty gap).
    if (hasFlex && growOf(ps[0]) === 0 && !isLocked(ps[0])) out.push({ mode: 'outerL', right: ps[0] });
    if (n > 1 && hasFlex && growOf(ps[n - 1]) === 0 && !isLocked(ps[n - 1])) out.push({ mode: 'outerR', left: ps[n - 1] });
    return out;
  }

  function ensureHandles(entry, count) {
    while (entry.handles.length < count) {
      var h = document.createElement('div');
      h.className = 'pr-handle';
      h.setAttribute('role', 'separator');
      h.setAttribute('aria-orientation', 'vertical');
      // Use aria-label (not title) for the hint: a native `title` renders an OS
      // tooltip box at the cursor that overflows onto the neighbouring module's
      // content (e.g. the Library score cards). aria-label keeps it accessible
      // without the intrusive popup — the visual grip + col-resize cursor still
      // signal that the seam is draggable.
      h.setAttribute('aria-label', 'Drag to resize · double-click to reset');
      h.innerHTML = '<i class="pr-grip"></i>';
      // Mouse events (not pointer events) drive the drag: a document-level
      // mousemove/mouseup pair is the classic, universally reliable splitter
      // pattern and needs no pointer-capture. pointerdown is kept only to block
      // the browser's native drag/select from starting on the grip.
      h.addEventListener('mousedown', function (ev) { startDrag(entry, this, ev); });
      h.addEventListener('dragstart', function (ev) { ev.preventDefault(); });
      h.addEventListener('dblclick', function (ev) { resetHandle(entry, this, ev); });
      entry.overlay.appendChild(h);
      entry.handles.push(h);
    }
  }

  function layout(entry) {
    var row = entry.row;
    if (!document.body.contains(row)) { destroy(entry); return; }

    var cs = getComputedStyle(row);
    var horizontal = cs.display.indexOf('flex') >= 0 && cs.flexDirection.indexOf('row') === 0;
    var rr = row.getBoundingClientRect();
    var ok = horizontal && window.innerWidth > STACK_BP && rr.width > 0 && rr.height > 0;
    var specs = ok ? specsFor(panes(row)) : [];

    ensureHandles(entry, specs.length);

    for (var i = 0; i < entry.handles.length; i++) {
      var h = entry.handles[i];
      if (h === entry.active) continue;              // the live drag positions itself
      if (i >= specs.length) { hide(h); continue; }

      var sp = specs[i], x, w, outer = sp.mode !== 'split';
      // Inset top/bottom so the (wide) grab strip never sits over a pane's
      // top/bottom corner buttons.
      var ins = Math.max(28, rr.height * 0.12);
      var top = rr.top + ins;
      var height = Math.max(24, rr.height - ins * 2);
      if (sp.mode === 'split') {
        var lr = sp.left.getBoundingClientRect(), rl = sp.right.getBoundingClientRect();
        x = (lr.right + rl.left) / 2;
        w = Math.min(24, Math.max(16, (rl.left - lr.right) + 12)); // generous, easy to catch
      } else {
        x = sp.mode === 'outerL' ? sp.right.getBoundingClientRect().left
                                 : sp.left.getBoundingClientRect().right;
        w = 18;
      }

      if (x < rr.left - HIT || x > rr.right + HIT) { hide(h); continue; }

      h.style.display = 'flex';
      h.classList.toggle('pr-outer', outer);
      h.style.width = w + 'px';
      h.style.left = (x - w / 2) + 'px';
      h.style.top = top + 'px';
      h.style.height = height + 'px';
      h._spec = sp;
      h._w = w;
    }
  }
  function hide(h) { h.style.display = 'none'; h._spec = null; }

  /* ── drag ─────────────────────────────────────────────────────────────── */
  function startDrag(entry, handle, ev) {
    if (ev.button != null && ev.button !== 0) return;
    var sp = handle._spec;
    if (!sp) return;
    ev.preventDefault();
    ev.stopPropagation();

    var row = entry.row;
    var rr = row.getBoundingClientRect();
    var startX = ev.clientX;
    var startY = ev.clientY;
    var moved = false;
    var mode = sp.mode, left = sp.left || null, right = sp.right || null;

    // When the row can scroll horizontally, a split drag is allowed to push a
    // neighbour to its min and then keep GROWING — expanding the row past the
    // viewport so it scrolls — instead of hard-stopping at a zero-sum trade.
    // On non-scrolling rows we keep the classic zero-sum splitter (no regression).
    var scrollable = /(auto|scroll)/.test(getComputedStyle(row).overflowX);

    // 'split' freezes the whole row so the trade between the two neighbours is
    // exact; outer drags pin only the target and let a flexible pane absorb.
    var isSplit = mode === 'split';
    var frozen = isSplit ? panes(row).map(function (p) { return { el: p, s: snap(p), grow: growOf(p) }; }) : [];
    if (isSplit) frozen.forEach(function (o) { pin(o.el, rectW(o.el)); });
    function fInfo(el) { for (var i = 0; i < frozen.length; i++) if (frozen[i].el === el) return frozen[i]; return null; }

    // Kill width/flex transitions on every pane for the duration of the drag so
    // pinning takes effect instantly (a CSS transition would make it look dead).
    var allPanes = panes(row);
    allPanes.forEach(function (p) { p.style.setProperty('transition', 'none', 'important'); });

    var target = isSplit ? null : (mode === 'outerL' ? right : left);
    var targetSnap = target ? snap(target) : null;

    var lw0 = left ? rectW(left) : 0;
    var rw0 = right ? rectW(right) : 0;
    var minL = left ? minOf(left) : 0;
    var minR = right ? minOf(right) : 0;
    var capMax = rr.width - 40;

    entry.active = handle;
    handle.classList.add('pr-active');
    document.documentElement.classList.add('pr-dragging');

    function place(x) { handle.style.left = (x - handle._w / 2) + 'px'; }

    function move(e) {
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 1) moved = true;
      if (mode === 'split') {
        var newL, newR;
        if (scrollable) {
          // Each side follows the cursor down to its own min; once a side hits
          // its min it stops shrinking and the other side keeps growing, so the
          // row total expands and scrolls. When both sides have slack this is
          // still an exact zero-sum trade (newL + newR === lw0 + rw0).
          newL = Math.max(minL, lw0 + dx);
          newR = Math.max(minR, rw0 - dx);
        } else {
          newL = Math.max(minL, Math.min(lw0 + dx, lw0 + rw0 - minR));
          newR = lw0 + rw0 - newL;
        }
        pin(left, newL);
        pin(right, newR);
        place((left.getBoundingClientRect().right + right.getBoundingClientRect().left) / 2);
      } else if (mode === 'outerL') {
        pin(right, Math.max(minR, Math.min(rw0 - dx, capMax)));   // drag right → narrower
        place(right.getBoundingClientRect().left);
      } else {
        pin(left, Math.max(minL, Math.min(lw0 + dx, capMax)));    // drag right → wider
        place(left.getBoundingClientRect().right);
      }
      schedule();
    }

    function end() {
      document.removeEventListener('mousemove', move, true);
      document.removeEventListener('mouseup', end, true);
      window.removeEventListener('blur', end);
      handle.classList.remove('pr-active');
      document.documentElement.classList.remove('pr-dragging');
      entry.active = null;
      allPanes.forEach(function (p) { p.style.removeProperty('transition'); });

      if (!moved) {                                   // a click, not a drag → revert
        if (isSplit) frozen.forEach(function (o) { restore(o.el, o.s); });
        else if (target) restore(target, targetSnap);
        layout(entry);
        forwardClickToTick(handle, startX, startY);
        return;
      }

      var keep = [];
      if (isSplit) {
        // Treat a fill pane as flexible so we pin its NEIGHBOUR and let the
        // filler re-absorb whatever's left — it must never be pinned or saved.
        var gl = fInfo(left).grow > 0 || isFill(left), gr = fInfo(right).grow > 0 || isFill(right);
        // Both flexible: normally pin one side and let the other re-absorb. But on
        // a scrollable row we may have GROWN the total, so pin both sides (minus any
        // fill pane) to persist the dragged widths and keep the row scrolled.
        if (gl && gr) keep = scrollable ? [left, right] : [isFill(left) ? right : left];
        else { if (!gl) keep.push(left); if (!gr) keep.push(right); }
        keep = keep.filter(function (el) { return !isFill(el); });
        frozen.forEach(function (o) { if (keep.indexOf(o.el) === -1) restore(o.el, o.s); });
      } else {
        keep = isFill(target) ? [] : [target];
      }
      keep.forEach(function (el) { var w = rectW(el); pin(el, w); saveWidth(keyOf(row, el), w); });

      layout(entry);
    }

    // Document-level mouse listeners keep firing even when the cursor leaves the
    // thin strip mid-drag (classic splitter behaviour). Capture phase so nothing
    // downstream can swallow them; blur ends a drag if focus is lost.
    document.addEventListener('mousemove', move, true);
    document.addEventListener('mouseup', end, true);
    window.addEventListener('blur', end);
  }

  /* The chat's activity strip (js/chat-activity-strip.js) lives on the same
     module edge as a seam handle, and this fixed overlay hit-tests above it —
     so a plain click meant for a minimap tick would otherwise die on the
     handle. When a mousedown ends without any drag, peek beneath the handle
     and, if an activity tick is there, pass the click on to it. Scoped to
     ticks only so the seam never "clicks" arbitrary pane content. */
  function forwardClickToTick(handle, x, y) {
    var prev = handle.style.pointerEvents;
    handle.style.pointerEvents = 'none';
    var under = document.elementFromPoint(x, y);
    handle.style.pointerEvents = prev;
    var tick = under && under.closest ? under.closest('.wa-activity-tick') : null;
    if (tick) tick.click();
  }

  function resetHandle(entry, handle, ev) {
    ev.preventDefault();
    var sp = handle._spec;
    if (!sp) return;
    [sp.left, sp.right].forEach(function (el) {
      if (!el) return;
      clearWidth(keyOf(entry.row, el));
      clearInline(el);
    });
    layout(entry);
  }

  /* ── scheduling + observers ───────────────────────────────────────────── */
  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; for (var i = 0; i < rows.length; i++) layout(rows[i]); });
  }
  function watchPanes(entry) {
    panes(entry.row).forEach(function (p) {
      if (p.__prWatched) return;
      p.__prWatched = true;
      entry.ro.observe(p);
      // Watch the pane's own class list so a width-button preset toggle releases
      // our pin (and any saved width) — letting single/wide/triple size it.
      p.__prPreset = hasPreset(p);
      var cmo = new MutationObserver(function () {
        var now = hasPreset(p);
        if (now === p.__prPreset) return;   // only react to preset changes
        p.__prPreset = now;
        if (entry.active) return;           // never fight an in-progress drag
        clearWidth(keyOf(entry.row, p));
        clearInline(p);
        schedule();
      });
      cmo.observe(p, { attributes: true, attributeFilter: ['class'] });
      p.__prClassMo = cmo;
      entry.classObservers.push(cmo);
    });
  }
  function destroy(entry) {
    try { entry.ro.disconnect(); } catch (_) {}
    try { entry.mo.disconnect(); } catch (_) {}
    (entry.classObservers || []).forEach(function (o) { try { o.disconnect(); } catch (_) {} });
    if (entry.overlay.parentNode) entry.overlay.parentNode.removeChild(entry.overlay);
    var i = rows.indexOf(entry);
    if (i >= 0) rows.splice(i, 1);
  }

  function initRow(row) {
    if (row.__pr) return;
    row.__pr = true;

    var overlay = document.createElement('div');
    overlay.className = 'pr-overlay';
    document.body.appendChild(overlay);

    var entry = { row: row, overlay: overlay, handles: [], active: null, classObservers: [] };
    rows.push(entry);

    applyStored(row);

    entry.ro = new ResizeObserver(schedule);
    entry.ro.observe(row);
    watchPanes(entry);

    // We don't watch 'style' — this file writes inline widths itself and would
    // otherwise fight a drag. Size changes are covered by the ResizeObserver.
    entry.mo = new MutationObserver(function () {
      if (!entry.active) applyStored(row);
      watchPanes(entry);
      schedule();
    });
    entry.mo.observe(row, { childList: true, attributes: true, attributeFilter: ['class', 'hidden'] });

    layout(entry);
  }

  function scan() {
    var found = document.querySelectorAll('#modules-row, .modules-row');
    for (var i = 0; i < found.length; i++) initRow(found[i]);
  }

  /* ── styles ───────────────────────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('pr-styles')) return;
    var css =
      '.pr-overlay{position:fixed;inset:0;pointer-events:none;z-index:60;}' +
      '.pr-handle{position:fixed;display:none;align-items:center;justify-content:center;' +
        'pointer-events:auto;cursor:col-resize;touch-action:none;' +
        '-webkit-user-select:none;user-select:none;}' +
      '.pr-grip{display:block;width:6px;height:40px;border-radius:6px;' +
        'background:rgba(16,24,32,.78);border:1px solid rgba(255,255,255,.6);' +
        'box-shadow:0 2px 10px rgba(0,0,0,.45);position:relative;' +
        'opacity:0;transform:scaleY(.5);' +
        'transition:opacity .12s ease,transform .12s ease,width .12s,background .12s,border-color .12s;}' +
      '.pr-grip::before{content:"";position:absolute;top:50%;left:50%;' +
        'transform:translate(-50%,-50%);width:2px;height:2px;border-radius:50%;background:#fff;' +
        'box-shadow:0 -5px 0 #fff,0 5px 0 #fff;}' +
      '.pr-handle:hover .pr-grip,.pr-handle.pr-active .pr-grip{opacity:1;transform:scaleY(1);}' +
      '.pr-handle.pr-active .pr-grip{width:8px;background:var(--primary,#25507C);' +
        'border-color:var(--primary,#25507C);' +
        'box-shadow:0 0 0 3px color-mix(in srgb,var(--primary,#25507C) 32%,transparent),0 3px 14px rgba(0,0,0,.5);}' +
      'html.pr-dragging,html.pr-dragging *{cursor:col-resize !important;' +
        '-webkit-user-select:none !important;user-select:none !important;}' +
      /* Each module/card uses `transform`, so it forms its own stacking context
         that traps header popovers (three-dots menus, filter/info pops) beneath
         the neighbouring module and beneath this resize overlay. While a popover
         is open, lift the whole module above its siblings (and the overlay) so
         the menu is always on top. Reverts the instant the popover closes. */
      '#modules-row>*:has(.topbar-popover:not(.hidden)),' +
      '.modules-row>*:has(.topbar-popover:not(.hidden)),' +
      '#modules-row>*:has(.panel-more-btn.is-open),' +
      '.modules-row>*:has(.panel-more-btn.is-open),' +
      '#modules-row>*:has([role="menu"]:not(.hidden):not([hidden])),' +
      '.modules-row>*:has([role="menu"]:not(.hidden):not([hidden])),' +
      '#modules-row>*:has(.pf-rowmenu-pop:not([hidden])),' +
      '.modules-row>*:has(.pf-rowmenu-pop:not([hidden])),' +
      '#modules-row>*:has(.pf-filter-pop:not([hidden])),' +
      '.modules-row>*:has(.pf-filter-pop:not([hidden])),' +
      '#modules-row>*:has(.pf-gs-infopop:not([hidden])),' +
      '.modules-row>*:has(.pf-gs-infopop:not([hidden]))' +
      '{z-index:500 !important;position:relative;}';
    var st = document.createElement('style');
    st.id = 'pr-styles';
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ── boot ─────────────────────────────────────────────────────────────── */
  function boot() {
    injectStyles();
    scan();
    // Panes on some pages settle to their final widths a beat after load
    // (async content, fonts, chat hydration). Re-scan/relayout a few times so
    // the resting handle positions match the real seams before the user grabs.
    [150, 300, 600, 1000, 1800].forEach(function (t) { setTimeout(function () { scan(); schedule(); }, t); });
    window.addEventListener('load', function () { scan(); schedule(); });
  }

  window.addEventListener('resize', schedule);
  window.addEventListener('scroll', schedule, true);

  // Safety net for stale handle positions: whenever the cursor is over a managed
  // row, keep the handles chasing the live seams (rAF-coalesced, so it's cheap).
  // This guarantees a handle is exactly where the seam is the moment you reach
  // for it, even if an observer missed a late layout change.
  document.addEventListener('mousemove', function (e) {
    if (document.documentElement.classList.contains('pr-dragging')) return;
    for (var i = 0; i < rows.length; i++) {
      var rr = rows[i].row.getBoundingClientRect();
      if (e.clientX >= rr.left - 24 && e.clientX <= rr.right + 24 &&
          e.clientY >= rr.top && e.clientY <= rr.bottom) { schedule(); return; }
    }
  }, true);

  // Pane width transitions/animations don't always trip the ResizeObserver in
  // time; refresh when they finish.
  document.addEventListener('transitionend', schedule, true);
  document.addEventListener('animationend', schedule, true);

  window.WisePaneResize = {
    reset: function () {
      var a = readAll(); delete a[pageId()]; writeAll(a);
      rows.forEach(function (entry) { panes(entry.row).forEach(clearInline); layout(entry); });
    },
    // Release the pinned/saved drag width for specific element(s) so they fall
    // back to their stylesheet sizing (used e.g. when a pane closes and the
    // remaining modules must reflow to fill the freed space). Clears the inline
    // pin even for elements that are currently hidden (a just-closed pane), which
    // panes()/reset() skip because they only touch visible panes.
    release: function (els) {
      els = [].concat(els).filter(Boolean);
      if (!els.length) return;
      rows.forEach(function (entry) {
        els.forEach(function (el) {
          if (!entry.row.contains(el)) return;
          clearWidth(keyOf(entry.row, el));
          clearInline(el);
        });
      });
      schedule();
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
