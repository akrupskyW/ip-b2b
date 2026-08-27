/* ═══════════════════════════════════════════════════════════════════════════
   default-fill.js — every module to the RIGHT of the Chat module opens, by
   default, at the fourth width tier: "Fill the Screen" (tier 3).

   Why a shared script (and not a per-page edit): the app has many #modules-row
   pages, each with its own layout + width scheme — the WISEcodeAI result panes
   (pane-* classes), the product utility panels (panel-* classes, flipped into
   #panels-row-right), the reformulation studio (rf-* cards), etc. Rather than
   teach every page a new default, this file expresses the rule ONCE against the
   one thing they all share: the canonical five-tier width control
   (.panel-width-toggle-btn) whose per-tier title text is identical everywhere
   ("Width (single|double|triple|fill|custom) — …" — see pane-width.js).

   How: for each module positioned to the right of the chat, we drive that
   module's OWN width toggle (by clicking it) up to the fill tier. Going through
   the page's native control means we inherit its exact fill behaviour AND its
   persistence — we never guess at classes. It is applied once per "open" of a
   module, so the user can still cycle a right module back to a narrower width;
   closing/hiding it and opening it again re-applies the fill default.

   Loaded once from js/agent-menu.js (which every #modules-row page runs) and is
   idempotent; a no-op on pages that have no chat + right-of-chat modules.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__wiseDefaultFill) return;
  window.__wiseDefaultFill = true;

  var STACK_BP = 560;   // px — below this the row stacks vertically; "right" is moot
  var FILL_TIER = 3;    // the fourth setting: Fill the Screen (custom is 4)

  /* The button's title is the one truly universal signal of a module's current
     tier — every page's width control renders the same "Width (single|double|
     triple|fill|custom) — …" text (pane-width.js). We read the tier from the
     title rather than the icon because the width_* icon family only has three
     glyphs, so the fill tier reuses `width_full` and the icon alone can't tell
     triple from fill. The icon map stays as a fallback for the unambiguous
     tiers. Custom uses `crop_free`. */
  var TITLE_TIER = { single: 0, double: 1, triple: 2, fill: 3, custom: 4 };
  var ICON_TIER = { width_normal: 0, width_wide: 1, width_full: 2, crop_free: 4 };

  /* ── element helpers ──────────────────────────────────────────────────── */
  function isVisible(el) {
    if (!el || el.nodeType !== 1 || el.hasAttribute('hidden')) return false;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    var r = el.getBoundingClientRect();
    return r.width > 24 && r.height > 0;
  }

  /* The chat module inside a row. Prefer stable ids/classes; fall back to the
     mounted chat card (.sc-card) for pages that inject the chat via JS. */
  function findChat(row) {
    return row.querySelector('#wa-chat, #chat-shell, #rf-chat, #gs-chat') ||
           row.querySelector('.wa-chat, .rf-chat, .ap-chat, .sc-card');
  }

  /* Row containers whose direct children are first-class modules. Panels flipped
     to the right live in #panels-row-right; the left rail is #panels-row; panes
     sit straight in the row. */
  function isContainer(el, row) {
    return el === row || el.id === 'panels-row' || el.id === 'panels-row-right';
  }

  /* Walk up from a width button to the module element that actually gets sized —
     the child that sits directly inside a row container. */
  function moduleRoot(btn, row) {
    var n = btn;
    while (n && n.parentElement && !isContainer(n.parentElement, row)) n = n.parentElement;
    return (n && n.parentElement && isContainer(n.parentElement, row)) ? n : null;
  }

  function tierOfBtn(btn) {
    // Title first — it names the tier unambiguously (…"(fill)"… etc).
    var m = /\((single|double|triple|fill|custom)\)/.exec(btn.getAttribute('title') || '');
    if (m) return TITLE_TIER[m[1]];
    // Fallback: the icon glyph resolves the non-fill tiers (fill shares
    // width_full with triple, so it can't be told apart here — hence title first).
    var ic = btn.querySelector('.material-symbols-outlined');
    if (!ic) return 0;
    var t = ICON_TIER[(ic.textContent || '').trim()];
    return t == null ? 0 : t;
  }

  /* Drive the module's own control to the fill tier by clicking it — inheriting
     the page's native fill behaviour + persistence. Returns true once the button
     reports the fill tier (so we only "commit" the default when it took).
     Bails the moment a click stops advancing the detected tier: a page whose
     width control uses a title/icon we can't map up to the fill tier would
     otherwise be clicked forever (each click mutates the row, re-arming our
     observer) — the runaway that makes such a page visibly blink. */
  function driveToFill(btn) {
    var guard = 0;
    var prev = tierOfBtn(btn);
    while (prev < FILL_TIER && guard < 5) {
      btn.click();
      guard++;
      var now = tierOfBtn(btn);
      if (now === FILL_TIER) return true;
      if (now <= prev) break;   // no forward progress — stop rather than spin
      prev = now;
    }
    return tierOfBtn(btn) === FILL_TIER;
  }

  /* ── the rule ─────────────────────────────────────────────────────────── */
  function apply(row) {
    if (!document.body.contains(row)) return;
    if (window.innerWidth <= STACK_BP) return;
    var cs = getComputedStyle(row);
    var horizontal = cs.display.indexOf('flex') >= 0 && cs.flexDirection.indexOf('row') === 0;
    if (!horizontal) return;                       // grid / stacked layouts: skip

    var chat = findChat(row);
    if (!chat || !isVisible(chat)) return;
    var chatRight = chat.getBoundingClientRect().right;

    function isRightOfChat(el) {
      return el.getBoundingClientRect().left >= chatRight - 8;
    }

    var btns = row.querySelectorAll('.panel-width-toggle-btn');
    for (var i = 0; i < btns.length; i++) {
      var btn = btns[i];
      var root = moduleRoot(btn, row);
      if (!root) continue;
      if (root === chat || chat.contains(root) || root.contains(chat)) continue;
      /* Secondary sticky drawers (e.g. the generated Report pane) stay at
         their CSS single width — they must read as a smaller module to the
         right of Output, not a second fill column. */
      if (root.id === 'wa-report' || root.hasAttribute('data-no-fill-default')) continue;
      if (!isVisible(root) || !isRightOfChat(root)) continue;
      if (root.dataset.fillDefaulted) continue;    // already defaulted this open
      // Mark before clicking so the mutations our click triggers don't re-enter.
      root.dataset.fillDefaulted = '1';
      if (driveToFill(btn)) { delete root.dataset.fillAttempts; continue; }
      // Didn't confirm fill. Retry on the next pass (panes settle a beat after
      // load) — but only up to a small cap, then latch: a control we can never
      // read as "fill" must not be re-driven on every mutation forever.
      var tries = (parseInt(root.dataset.fillAttempts, 10) || 0) + 1;
      root.dataset.fillAttempts = String(tries);
      if (tries < 6) delete root.dataset.fillDefaulted;   // keep flag once capped
    }

    // Release the flag once a module leaves the right side (closed, hidden, or
    // flipped left) so a fresh open re-applies the fill default.
    var flagged = row.querySelectorAll('[data-fill-defaulted]');
    for (var j = 0; j < flagged.length; j++) {
      var el = flagged[j];
      if (!isVisible(el) || !isRightOfChat(el)) {
        delete el.dataset.fillDefaulted;
        delete el.dataset.fillAttempts;
      }
    }
  }

  /* ── scheduling ───────────────────────────────────────────────────────── */
  var rows = [];
  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () {
      pending = false;
      for (var i = 0; i < rows.length; i++) apply(rows[i]);
    });
  }

  function initRow(row) {
    if (row.__wiseFill) return;
    row.__wiseFill = true;
    rows.push(row);
    var mo = new MutationObserver(schedule);
    mo.observe(row, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
    schedule();
  }

  function scan() {
    var found = document.querySelectorAll('#modules-row, .modules-row');
    for (var i = 0; i < found.length; i++) initRow(found[i]);
  }

  function boot() {
    scan();
    // Panes settle a beat after load (async content, chat hydration, fonts).
    [150, 350, 700, 1200, 2000].forEach(function (t) { setTimeout(function () { scan(); schedule(); }, t); });
    window.addEventListener('load', function () { scan(); schedule(); });
  }

  window.addEventListener('resize', schedule);
  document.addEventListener('transitionend', schedule, true);
  document.addEventListener('animationend', schedule, true);

  window.WiseDefaultFill = { refresh: function () { scan(); schedule(); } };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
