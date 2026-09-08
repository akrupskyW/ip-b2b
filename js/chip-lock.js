/* ─────────────────────────────────────────────────────────────────────────
   chip-lock.js — a transcript only moves forward.

   App-wide rule: once the member has moved past a row of intent chips, that
   row is history. Every chip in it goes disabled, so a thread can never be
   replayed from a point it has already left. Only the newest row — the one
   that carries the conversation forward — takes a click.

   A row is spent when either the member has said something beneath it (a
   `you` line landed below) or a newer chip row has arrived beneath it.

   Rows glued together as adjacent siblings are ONE step, and the whole run
   stays live: the signup multi-select posts its suggestions and its
   Continue / Skip controls as two rows, and the portfolio posts its report
   scopes as three.

   Two things are never locked. The shared re-parked row (.sc-inline-chips) is
   always the live one by construction — it is a single element that moves to
   the end of the thread after every reply. And output chips are not intent
   chips: an output the member never opened must still open three turns later
   (see the outputs-open-on-request rule).

   Locking is sticky. Transcripts only grow, and a thread saved to history
   restores in the state it was saved in.

   Injected from agent-menu.js on every page that renders the WISE nav, and
   loaded directly by the chat pages that have no nav (create-account).
   Delegated + observed, so dynamically built rows are covered.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  if (typeof document === 'undefined') return;
  if (window.WiseChipLock) return;

  /* Every chat transcript in the app is one of these. Chip specimens in the
     component catalog live outside them, so they are never touched. */
  var THREAD_SEL = '.chat-messages-area, #chat-messages';
  /* A step's chip row, under each surface's name for it. */
  var ROW_SEL = '.sc-reply-chips, .sc-inline-chips, .gs-chips-inline, .rf-chips-inline';
  var MEMBER_SEL = '.sc-line-you';
  var CHIP_SEL = '.chip, .ws-intent-chip, .gs-chip, .ac-route';
  /* The shared row that re-parks itself at the end of the thread. */
  var ALWAYS_LIVE_SEL = '.sc-inline-chips';
  /* Openers stay tappable for the life of the thread. */
  var KEEP_SEL = '.sc-surface-card, .sc-open-chip, .wa-merge-chip, ' +
    '[data-open-module], [data-web-ref], [data-chip-more]';
  var SKIP_SEL = '[data-chip-lock-skip]';

  function deaden(chip) {
    if (chip.closest(KEEP_SEL)) return;
    chip.setAttribute('aria-disabled', 'true');
    chip.setAttribute('tabindex', '-1');
    if (chip.tagName === 'BUTTON') chip.disabled = true;
  }

  function lockRow(row) {
    if (!row || !row.matches) return;
    if (row.hasAttribute('data-chips-spent')) return;
    if (row.matches(ALWAYS_LIVE_SEL)) return;
    row.setAttribute('data-chips-spent', '1');
    row.classList.add('is-done');
    Array.prototype.forEach.call(row.querySelectorAll(CHIP_SEL), deaden);
  }

  /* A chip that lands in a row after the lock still reads the lock — the
     signup multi-select appends typed tokens to a row it may already have
     left. */
  function lockLateChips(row) {
    Array.prototype.forEach.call(row.querySelectorAll(CHIP_SEL), function (chip) {
      if (chip.getAttribute('aria-disabled') !== 'true') deaden(chip);
    });
  }

  function syncThread(thread) {
    if (!thread || (thread.closest && thread.closest(SKIP_SEL))) return;
    var marks = thread.querySelectorAll(ROW_SEL + ', ' + MEMBER_SEL);
    var rows = [];
    var lastMember = -1;
    for (var i = 0; i < marks.length; i++) {
      var el = marks[i];
      if (el.matches(MEMBER_SEL)) { lastMember = i; continue; }
      /* A row nested inside another row is part of that step, not a step. */
      var nested = false;
      for (var r = 0; r < rows.length; r++) {
        if (rows[r].el.contains(el)) { nested = true; break; }
      }
      if (!nested) rows.push({ el: el, i: i });
    }
    if (!rows.length) return;
    /* Walk back from the end. The trailing run of rows the member has not
       spoken past, glued together as adjacent siblings, is the live step. */
    var liveFrom = rows.length;
    for (var k = rows.length - 1; k >= 0; k--) {
      if (rows[k].i < lastMember) break;
      if (k < rows.length - 1 && rows[k].el.nextElementSibling !== rows[k + 1].el) break;
      liveFrom = k;
    }
    for (var j = 0; j < rows.length; j++) {
      if (j < liveFrom) lockRow(rows[j].el);
      else if (rows[j].el.hasAttribute('data-chips-spent')) lockLateChips(rows[j].el);
    }
  }

  function syncAll() {
    var threads = document.querySelectorAll(THREAD_SEL);
    for (var i = 0; i < threads.length; i++) syncThread(threads[i]);
  }

  var pending = 0;
  function schedule() {
    if (pending) return;
    pending = requestAnimationFrame(function () { pending = 0; syncAll(); });
  }

  /* A spent chip that is not a <button> — or one whose handler runs off a
     synthetic click — still must not act. */
  function guard(e) {
    var chip = e.target && e.target.closest && e.target.closest(CHIP_SEL);
    if (!chip || !chip.closest('[data-chips-spent]')) return;
    if (chip.closest(KEEP_SEL)) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
  }
  window.addEventListener('click', guard, true);
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') guard(e);
  }, true);

  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(schedule).observe(document.documentElement, {
      childList: true, subtree: true,
    });
  }
  document.addEventListener('DOMContentLoaded', schedule);
  schedule();

  window.WiseChipLock = {
    sync: syncAll,
    /* Lock every chip row a thread is holding — for a caller that knows the
       member has just left all of them (the signup chat answers a step before
       the next one is posted). */
    lockPrior: function (root) {
      var scope = root && root.querySelectorAll ? root : document;
      Array.prototype.forEach.call(scope.querySelectorAll(ROW_SEL), lockRow);
    },
  };
})();
