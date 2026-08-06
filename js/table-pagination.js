/* ─────────────────────────────────────────────────────────────────────────
   table-pagination.js — app-wide "load more" pagination for every data table.

   Companion to sortable-tables.js. Where that file gives every table a
   consistent sortable header, this file gives every table a consistent
   pagination footer:

       Showing 10 of 47 products              Load more ⌄

   It is intentionally generic and self-initialising:
     • Runs on DOMContentLoaded and re-scans on DOM changes (a MutationObserver)
       so tables rendered later by page scripts are picked up automatically.
     • Non-destructive: it never removes rows. Rows beyond the current window
       are hidden with a `.wtp-clip` class, so it coexists with the per-page
       sort/filter/search code (which reorders or re-renders rows freely).
     • Injects its own CSS, so no per-page stylesheet edits are needed and the
       footer looks identical on every page and in both themes.

   Supported table paradigms (each mapped to its rows + existing footer):
     • Real  <table>            → tbody > tr        (incl. .upf-table)
     • Grid  .adm-table         → [data-adm-rows] .adm-trow  (.adm-table-foot)
     • Grid  .inv-table         → .inv-trow                  (.inv-table-foot)
     • Grid  .pf-table          → .pf-trow                   (.pf-table-foot)
     • Grid  .rf-table          → .rf-trow                   (.rf-table-foot)
     • Grid  .gs-table          → .gs-trow                   (.gs-table-foot)

   Skipped: .wa-tbl (ships its own load-more pager), .vf-table / .ma-table
   (tiny inline receipts / file-tree), and anything marked data-wtp-skip,
   data-no-paginate, or data-no-sort.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var STEP = 10;                 /* rows revealed initially and per "Load more" */
  var MAP = new WeakMap();       /* table element → pagination state            */

  var EXPAND_ICON =
    '<span class="material-icons" aria-hidden="true">expand_more</span>';

  /* Row classes other page code uses to mark a row filtered-out. Such rows are
     excluded from the pagination count (they're already hidden by that code). */
  var FILTER_HIDDEN = [
    'adm-row-hidden', 'inv-row-hidden', 'rf-row-hidden',
    'pf-row-hidden', 'wf-row-hidden', 'is-hidden'
  ];

  /* ── Injected styles ──────────────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('wtp-styles')) return;
    var css = [
      '.wtp-foot{display:flex;align-items:center;justify-content:space-between;',
      'gap:12px;flex-wrap:wrap;padding:11px 14px 10px;border-top:1px solid var(--border);',
      'font-size:.76rem;color:var(--text-subtle);font-variant-numeric:tabular-nums;}',
      '.wtp-foot .wtp-count{font-size:.76rem;color:var(--text-subtle);line-height:1.4;}',
      '.wtp-foot .wtp-count b{font-weight:700;color:var(--text-muted,var(--text));}',
      '.wtp-more{display:inline-flex;align-items:center;gap:4px;cursor:pointer;',
      'background:transparent;border:0;padding:2px 4px;margin:-2px -4px;border-radius:6px;',
      'color:var(--primary);font-family:inherit;font-size:.76rem;font-weight:700;',
      'letter-spacing:.01em;transition:color .12s ease;}',
      'html.dark .wtp-more{color:var(--primary-bright,var(--primary));}',
      '.wtp-more:hover{text-decoration:underline;}',
      '.wtp-more .material-icons{font-size:16px;line-height:1;}',
      '.wtp-more[hidden]{display:none;}',
      '.wtp-clip{display:none !important;}',
      '.wtp-hidden-foot{display:none !important;}'
    ].join('');
    var style = document.createElement('style');
    style.id = 'wtp-styles';
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  /* ── Helpers ──────────────────────────────────────────────────────────── */
  function norm(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function isFilteredOut(row) {
    if (row.hasAttribute('hidden')) return true;
    for (var i = 0; i < FILTER_HIDDEN.length; i++) {
      if (row.classList.contains(FILTER_HIDDEN[i])) return true;
    }
    /* Inline display:none set by other code (not our own clip). */
    if (!row.classList.contains('wtp-clip') && row.style &&
        /(?:^|;)\s*display\s*:\s*none/i.test(row.style.cssText)) return true;
    return false;
  }

  /* Map a candidate element to { rowsRoot, rowSel, foot, noun, table, tableEl }
     or null when it isn't a paginatable data table. */
  function resolve(el) {
    if (el.closest('[data-wtp-skip],[data-no-paginate]')) return null;

    var cl = el.classList;
    if (cl.contains('adm-table')) {
      return { rowsRoot: el.querySelector('[data-adm-rows]') || el, rowSel: '.adm-trow',
               foot: el.querySelector('.adm-table-foot'), noun: null };
    }
    if (cl.contains('inv-table')) {
      return { rowsRoot: el, rowSel: '.inv-trow',
               foot: el.querySelector('.inv-table-foot'), noun: 'invoices' };
    }
    if (cl.contains('pf-table')) {
      return { rowsRoot: el, rowSel: '.pf-trow',
               foot: el.querySelector('.pf-table-foot'), noun: 'products' };
    }
    if (cl.contains('rf-table')) {
      return { rowsRoot: el, rowSel: '.rf-trow',
               foot: el.querySelector('.rf-table-foot'), noun: 'products' };
    }
    if (cl.contains('gs-table')) {
      return { rowsRoot: el, rowSel: '.gs-trow',
               foot: el.querySelector('.gs-table-foot'), noun: 'products' };
    }
    if (el.tagName === 'TABLE') {
      if (cl.contains('wa-tbl') || cl.contains('vf-table') || cl.contains('ma-table')) return null;
      var tb = el.tBodies && el.tBodies[0];
      if (!tb) return null;
      return { rowsRoot: tb, rowSel: ':scope > tr', foot: null, table: true, tableEl: el,
               noun: el.getAttribute('data-wtp-noun') || (cl.contains('upf-table') ? 'products' : 'rows') };
    }
    return null;
  }

  /* Derive a human noun for the count text — reuse whatever the page's own
     footer says ("…of 47 products") when we can, else the paradigm default. */
  function deriveNoun(st, desc) {
    if (st.nounFixed) return st.noun;
    if (desc.foot) {
      var m = norm(desc.foot.textContent).match(/of\s+[\d,]+\s+([A-Za-z][A-Za-z ]*)$/);
      if (m) { st.noun = m[1].trim(); st.nounFixed = true; return st.noun; }
    }
    return st.noun || desc.noun || 'items';
  }

  /* ── Footer element ───────────────────────────────────────────────────── */
  function ensureFoot(el, st, desc) {
    if (st.footEl && st.footEl.isConnected) return;

    /* Reuse a footer we (or a previous scan) already placed. */
    var probe = desc.foot ? desc.foot.nextElementSibling
              : desc.table ? desc.tableEl.nextElementSibling
              : el.querySelector(':scope > .wtp-foot');
    if (probe && probe.classList && probe.classList.contains('wtp-foot')) {
      st.footEl = probe;
      probe._wtpOwner = el;
      return;
    }

    var foot = document.createElement('div');
    foot.className = 'wtp-foot';
    foot.innerHTML =
      '<span class="wtp-count"></span>' +
      '<button type="button" class="wtp-more" data-wtp-more hidden>Load more ' + EXPAND_ICON + '</button>';
    foot._wtpOwner = el;

    if (desc.foot) {
      desc.foot.classList.add('wtp-hidden-foot');
      desc.foot.parentNode.insertBefore(foot, desc.foot.nextSibling);
    } else if (desc.table) {
      desc.tableEl.parentNode.insertBefore(foot, desc.tableEl.nextSibling);
    } else {
      el.appendChild(foot);
    }
    st.footEl = foot;
  }

  function updateFoot(foot, shown, total, noun) {
    var html = 'Showing <b>' + shown + '</b> of <b>' + total + '</b> ' + escHtml(noun);
    var countEl = foot.querySelector('.wtp-count');
    if (countEl && countEl.getAttribute('data-wtp-html') !== html) {
      countEl.setAttribute('data-wtp-html', html);   /* guard: only touch DOM on change */
      countEl.innerHTML = html;
    }
    var more = foot.querySelector('.wtp-more');
    if (more) more.hidden = shown >= total;
  }

  /* ── Sync one table to its current data ───────────────────────────────── */
  function sync(el, st) {
    var desc = resolve(el);
    if (!desc) return;
    var root = desc.rowsRoot;
    if (!root || !root.isConnected) return;

    var rows = Array.prototype.slice.call(root.querySelectorAll(desc.rowSel));
    if (!rows.length) {
      if (st.footEl) st.footEl.remove();
      st.footEl = null;
      st.lastSig = null;
      return;
    }

    ensureFoot(el, st, desc);

    for (var i = 0; i < rows.length; i++) rows[i].classList.remove('wtp-clip');

    var eligible = rows.filter(function (r) { return !isFilteredOut(r); });
    var total = eligible.length;

    /* Reset to the first window whenever the row set changes (filter/search). */
    if (st.lastSig !== null && st.lastSig !== total) st.revealed = STEP;
    st.lastSig = total;
    if (st.revealed < STEP) st.revealed = STEP;

    var shown = Math.min(st.revealed, total);
    for (var j = shown; j < eligible.length; j++) eligible[j].classList.add('wtp-clip');

    updateFoot(st.footEl, shown, total, deriveNoun(st, desc));
  }

  function ensure(el) {
    if (!resolve(el)) return;
    var st = MAP.get(el);
    if (!st) { st = { revealed: STEP, lastSig: null, noun: null, nounFixed: false, footEl: null }; MAP.set(el, st); }
    sync(el, st);
  }

  /* ── Load-more click (delegated) ──────────────────────────────────────── */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.wtp-more');
    if (!btn) return;
    var foot = btn.closest('.wtp-foot');
    var owner = foot && foot._wtpOwner;
    if (!owner) return;
    var st = MAP.get(owner);
    if (!st) return;
    st.revealed += STEP;
    sync(owner, st);
  });

  /* ── Scan + observe ───────────────────────────────────────────────────── */
  var SELECTOR = 'table,.adm-table,.inv-table,.pf-table,.rf-table,.gs-table';

  function scan(root) {
    root = root || document;
    var els = root.querySelectorAll(SELECTOR);
    Array.prototype.forEach.call(els, ensure);
  }

  function start() {
    injectStyles();
    scan(document);
    if (typeof MutationObserver === 'undefined') return;
    var pending = false;
    var obs = new MutationObserver(function () {
      if (pending) return;
      pending = true;
      (window.requestAnimationFrame || window.setTimeout)(function () {
        pending = false;
        scan(document);
      }, 0);
    });
    /* childList catches both re-rendered rows and the page's own "Showing X of Y"
       text updates on filter (assigning textContent replaces child nodes). Our own
       row-hiding toggles a class (an attribute mutation) which we don't observe, and
       updateFoot() only writes when the text actually changes — so no feedback loop. */
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
