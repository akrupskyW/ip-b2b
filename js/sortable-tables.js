/* ─────────────────────────────────────────────────────────────────────────
   sortable-tables.js — app-wide click-to-sort for every data table.

   Makes column headers sortable (ascending / descending, toggled on click)
   across both table paradigms used in this app:

     1. Real  <table>  elements  → sorts <tbody> <tr> rows by a <th> column.
     2. Grid  ".pf-table"  blocks → sorts ".pf-trow" rows by a ".pf-th"
        column (the header/cell share a ".pf-col-*" class).
     3. Any other grid faux-table (a "*-thead" / "*-tbl-head" head over
        "*-trow" rows) → every labelled column becomes click-to-sortable,
        unless the grid already ships its own sorting.

   It is intentionally generic and self-initialising:
     • Runs on DOMContentLoaded and re-scans on DOM changes (a MutationObserver)
       so tables built later by page scripts are picked up automatically.
     • Skips ".upf-table" (which ships its own sorting) and any table/grid
       marked  data-no-sort .
     • Injects its own CSS, so no per-page stylesheet edits are needed.

   The visual language (a faint chevron that turns primary-coloured and flips
   for asc/desc) matches the existing ".upf-table" headers for consistency.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var ARROW_SVG =
    '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true">' +
    '<path d="M6 9.5V2.5M3 6.5L6 9.5l3-3" stroke="currentColor" stroke-width="1.4" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ── Injected styles ──────────────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('srt-styles')) return;
    var css = [
      '.srt-sortable{cursor:pointer;user-select:none;-webkit-user-select:none;}',
      'th.srt-sortable{white-space:nowrap;}',
      '.srt-arrow{display:inline-flex;align-items:center;justify-content:center;',
      'width:12px;height:12px;margin-left:5px;vertical-align:middle;flex:none;',
      'opacity:.28;transition:opacity .12s ease,transform .12s ease;}',
      '.srt-arrow svg{width:12px;height:12px;display:block;}',
      '.srt-sortable:hover .srt-arrow{opacity:.6;}',
      '.srt-sortable[data-srt-dir="asc"] .srt-arrow{opacity:1;color:var(--primary);transform:rotate(180deg);}',
      '.srt-sortable[data-srt-dir="desc"] .srt-arrow{opacity:1;color:var(--primary);}',
      'html.dark .srt-sortable[data-srt-dir] .srt-arrow{color:var(--primary-bright,var(--primary));}',
      '@media (prefers-reduced-motion: reduce){.srt-arrow{transition:none;}}'
    ].join('');
    var style = document.createElement('style');
    style.id = 'srt-styles';
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  /* ── Value helpers ────────────────────────────────────────────────────── */

  /* Meaningful text for a cell — prefer the human-readable bits used by this
     app (product name, the date value) before falling back to raw text.
     Icon-font glyph text (Material Icons / Symbols ligatures) is stripped so
     it can never leak into the sort key. */
  function cellText(cell) {
    if (!cell) return '';
    var pname = cell.querySelector && cell.querySelector('.pf-pname');
    if (pname) return norm(pname.textContent);
    var dateVal = cell.querySelector && cell.querySelector('.pf-date-val');
    if (dateVal) return norm(dateVal.textContent);
    return norm(textWithoutIcons(cell));
  }

  function textWithoutIcons(el) {
    if (!el.querySelector || !el.querySelector('.material-symbols-outlined, .material-symbols-outlined, .material-symbols-rounded')) {
      return el.textContent;
    }
    var clone = el.cloneNode(true);
    var icons = clone.querySelectorAll('.material-symbols-outlined, .material-symbols-outlined, .material-symbols-rounded');
    Array.prototype.forEach.call(icons, function (n) { n.parentNode.removeChild(n); });
    return clone.textContent;
  }

  function norm(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

  function dateValue(t) {
    if (!/[A-Za-z]{3}|\d{1,2}[\/-]\d{1,2}/.test(t)) return null;
    var ms = Date.parse(t);
    return isNaN(ms) ? null : ms;
  }

  function isPureNumber(t) {
    return /^[-+]?[$£€]?\s?[\d,]+(\.\d+)?%?$/.test(t);
  }
  function numberValue(t) {
    var n = parseFloat(t.replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? null : n;
  }

  /* Decide a column's type from all its cell texts. */
  function columnType(texts) {
    var nonEmpty = texts.filter(function (t) { return t !== ''; });
    if (!nonEmpty.length) return 'text';
    if (nonEmpty.every(function (t) { return dateValue(t) !== null; })) return 'date';
    if (nonEmpty.every(function (t) { return isPureNumber(t); })) return 'num';
    return 'text';
  }

  /* Build a comparator for the given type + direction (dir: 1 asc, -1 desc).
     Empty values always sort to the bottom regardless of direction. */
  function makeComparator(type, dir) {
    return function (aT, bT) {
      var aE = aT === '', bE = bT === '';
      if (aE && bE) return 0;
      if (aE) return 1;
      if (bE) return -1;
      var r;
      if (type === 'date') r = (dateValue(aT) || 0) - (dateValue(bT) || 0);
      else if (type === 'num') r = (numberValue(aT) || 0) - (numberValue(bT) || 0);
      else r = aT.localeCompare(bT, undefined, { numeric: true, sensitivity: 'base' });
      return r * dir;
    };
  }

  /* ── Header decoration ────────────────────────────────────────────────── */
  function decorate(header, onSort) {
    if (header.dataset.srtOn) return;
    header.dataset.srtOn = '1';
    header.classList.add('srt-sortable');
    header.setAttribute('role', header.getAttribute('role') || 'button');
    if (!header.hasAttribute('tabindex')) header.setAttribute('tabindex', '0');
    header.setAttribute('aria-sort', 'none');
    var arrow = document.createElement('span');
    arrow.className = 'srt-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.innerHTML = ARROW_SVG;
    header.appendChild(arrow);
    header.addEventListener('click', onSort);
    header.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        onSort();
      }
    });
  }

  function setDir(header, siblings, dir) {
    siblings.forEach(function (h) {
      if (h === header) return;
      h.removeAttribute('data-srt-dir');
      h.setAttribute('aria-sort', 'none');
    });
    header.setAttribute('data-srt-dir', dir === 1 ? 'asc' : 'desc');
    header.setAttribute('aria-sort', dir === 1 ? 'ascending' : 'descending');
  }

  function nextDir(header) {
    return header.getAttribute('data-srt-dir') === 'asc' ? -1 : 1;
  }

  /* ── Paradigm 1: real <table> ─────────────────────────────────────────── */
  function isSortableTh(th) {
    if (th.hasAttribute('data-no-sort')) return false;
    if (/\bupf-th-(avatar|action)\b/.test(th.className)) return false;
    return norm(th.textContent) !== '';
  }

  function enhanceTable(table) {
    if (table.dataset.srtInit) return;
    if (table.classList.contains('upf-table')) return;   /* has its own sort */
    if (table.hasAttribute('data-no-sort')) return;
    var thead = table.tHead;
    var tbody = table.tBodies && table.tBodies[0];
    if (!thead || !tbody || !thead.rows.length) return;
    table.dataset.srtInit = '1';

    var headerRow = thead.rows[thead.rows.length - 1];
    var headers = Array.prototype.slice.call(headerRow.cells);

    headers.forEach(function (th, colIndex) {
      if (!isSortableTh(th)) return;
      decorate(th, function () {
        var dir = nextDir(th);
        var rows = Array.prototype.slice.call(tbody.rows);
        var texts = rows.map(function (r) { return cellText(r.cells[colIndex]); });
        var type = columnType(texts);
        var cmp = makeComparator(type, dir);
        var indexed = rows.map(function (r, i) { return { r: r, t: texts[i], i: i }; });
        indexed.sort(function (a, b) { return cmp(a.t, b.t) || (a.i - b.i); });
        var frag = document.createDocumentFragment();
        indexed.forEach(function (o) { frag.appendChild(o.r); });
        tbody.appendChild(frag);
        setDir(th, headers, dir);
      });
    });
  }

  /* ── Paradigm 2: grid ".pf-table" ─────────────────────────────────────── */
  function colClassOf(th) {
    var found = null;
    (th.className || '').split(/\s+/).forEach(function (c) {
      if (c.indexOf('pf-col-') === 0 && c !== 'pf-col-menu') found = c;
    });
    return found;
  }

  function enhanceGrid(container) {
    if (container.tagName === 'TABLE') return;              /* real table path */
    if (container.dataset.srtInit) return;
    if (container.hasAttribute('data-no-sort')) return;
    var thead = container.querySelector('.pf-thead');
    if (!thead) return;
    container.dataset.srtInit = '1';

    var headers = Array.prototype.slice.call(thead.querySelectorAll('.pf-th'));
    headers.forEach(function (th) {
      if (th.hasAttribute('data-no-sort')) return;
      if (norm(th.textContent) === '') return;              /* skip menu column */
      var colClass = colClassOf(th);
      if (!colClass) return;
      decorate(th, function () {
        var dir = nextDir(th);
        var rows = Array.prototype.slice.call(container.querySelectorAll('.pf-trow'));
        var foot = container.querySelector('.pf-table-foot');
        var texts = rows.map(function (r) { return cellText(r.querySelector('.' + colClass)); });
        var type = columnType(texts);
        var cmp = makeComparator(type, dir);
        var indexed = rows.map(function (r, i) { return { r: r, t: texts[i], i: i }; });
        indexed.sort(function (a, b) { return cmp(a.t, b.t) || (a.i - b.i); });
        indexed.forEach(function (o) {
          if (foot) container.insertBefore(o.r, foot);
          else container.appendChild(o.r);
        });
        setDir(th, headers, dir);
      });
    });
  }

  /* ── Paradigm 3: generic grid faux-tables ─────────────────────────────────
     Any grid "table" whose header container class ends in  -thead / -tbl-head
     and whose body rows' class ends in  -trow . Makes every labelled data
     column click-to-sortable, so tables that never wired up their own sorting
     (e.g. a static ".rf-table--moves" head) get it for free.

     Grids that already ship sorting are left untouched — detected by existing
     sort markers — as are the ".pf-table" grids handled by paradigm 2. */
  var THEAD_RE = /-(thead|tbl-head)$/;
  var TROW_RE = /-trow$/;
  var ACTION_RE = /^actions?$/i;
  var CUSTOM_SORT_SEL = '[data-sort],[data-inv-sort],[data-adm-sort],[data-key],' +
    '.is-sortable,.srt-sortable,[class*="--sortable"],.wa-tbl-th';

  function classTokenMatches(el, re) {
    var cls = el.className;
    if (typeof cls !== 'string') return false;
    var toks = cls.split(/\s+/);
    for (var i = 0; i < toks.length; i++) { if (re.test(toks[i])) return true; }
    return false;
  }

  function enhanceGenericGrid(thead) {
    if (!classTokenMatches(thead, THEAD_RE)) return;
    if (thead.dataset.srtgInit) return;
    var root = thead.parentElement;
    if (!root) return;
    if (root.classList && root.classList.contains('pf-table')) return;  /* paradigm 2 */
    if (root.dataset && root.dataset.srtInit) return;
    if (thead.hasAttribute('data-no-sort') || root.hasAttribute('data-no-sort')) return;
    if (thead.querySelector(CUSTOM_SORT_SEL)) return;                   /* has its own sort */

    var headers = Array.prototype.slice.call(thead.children);
    if (headers.length < 2) return;

    var rows = Array.prototype.filter.call(root.querySelectorAll('*'), function (el) {
      return classTokenMatches(el, TROW_RE);
    });
    if (!rows.length) return;
    var rowsParent = rows[0].parentNode;
    for (var r = 0; r < rows.length; r++) { if (rows[r].parentNode !== rowsParent) return; }

    thead.dataset.srtgInit = '1';

    headers.forEach(function (th, colIndex) {
      var label = norm(textWithoutIcons(th));
      if (label === '' || ACTION_RE.test(label)) return;    /* skip menu / action columns */
      decorate(th, function () {
        var dir = nextDir(th);
        var liveRows = Array.prototype.filter.call(rowsParent.children, function (el) {
          return classTokenMatches(el, TROW_RE);
        });
        if (!liveRows.length) return;
        var anchor = liveRows[0].previousSibling;
        var texts = liveRows.map(function (row) { return cellText(row.children[colIndex]); });
        var type = columnType(texts);
        var cmp = makeComparator(type, dir);
        var indexed = liveRows.map(function (row, i) { return { r: row, t: texts[i], i: i }; });
        indexed.sort(function (a, b) { return cmp(a.t, b.t) || (a.i - b.i); });
        var frag = document.createDocumentFragment();
        indexed.forEach(function (o) { frag.appendChild(o.r); });
        rowsParent.insertBefore(frag, anchor ? anchor.nextSibling : rowsParent.firstChild);
        setDir(th, headers, dir);
      });
    });
  }

  /* ── Scan + observe ───────────────────────────────────────────────────── */
  function scan(root) {
    root = root || document;
    var tables = root.querySelectorAll('table');
    Array.prototype.forEach.call(tables, enhanceTable);
    var grids = root.querySelectorAll('.pf-table');
    Array.prototype.forEach.call(grids, enhanceGrid);
    var gheads = root.querySelectorAll('[class*="thead"], [class*="tbl-head"]');
    Array.prototype.forEach.call(gheads, enhanceGenericGrid);
  }

  function start() {
    injectStyles();
    scan(document);
    if (typeof MutationObserver === 'undefined') return;
    var pending = false;
    var obs = new MutationObserver(function () {
      if (pending) return;
      pending = true;
      /* Coalesce bursts (e.g. a tbody re-render) into a single rescan. */
      (window.requestAnimationFrame || window.setTimeout)(function () {
        pending = false;
        scan(document);
      }, 0);
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
