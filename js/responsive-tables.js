/* ─────────────────────────────────────────────────────────────────────────
   responsive-tables.js — app-wide "rows become cards on mobile" for every
   data table in the app.

   The app has ~20 different table UIs built two ways —

     1. Real  <table>  elements  (.vf-table, .gv-table, .ak-table, .aid-table,
        the accessibility contrast tables, …).
     2. CSS-grid "faux tables"  (a "*-thead" / "*-tbl-head" head over "*-trow"
        rows: .pf-table, .ib-table, .rf-table, .gs-table, .wa-tbl, …).

   Rather than hand-edit every generator and every page stylesheet, this script
   watches each table's width with a ResizeObserver and, once the table gets
   phone-narrow (<= 560px), adds a  .rtbl-cards  class so a single shared block
   in wise.css turns its rows into stacked cards. Each visible cell is tagged
   .rtbl-fld and given a  data-rlabel  (its column header) so the card can show
   a small field label beside the value.

   Design decisions that matter:
     • Width is *measured* (ResizeObserver), not a CSS container query, so it
       works no matter how the module is laid out and — crucially — it adds NO
       `container-type`, which would otherwise hijack the page's existing
       container queries.
     • Only VISIBLE cells are tagged .rtbl-fld. Columns hidden by the page
       (e.g. a toggled-off column) stay hidden — the card layout never forces
       display, so it can't reveal anything that isn't already on screen.

   Skipped: admin (.adm-*) and invoices (.inv-*) grids keep their own bespoke
   breakpoints; the analytics UPF tables ship a table/card toggle; the
   marketing-assets file tree and typography demo aren't row lists. Any
   table/grid can opt out with  data-no-cards .
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var BREAK = 560;                       /* collapse at/under this many px */
  var THEAD_RE = /-(thead|tbl-head)$/;
  var TROW_RE = /-trow$/;
  var ACTION_RE = /^actions?$/i;
  var SKIP_GRID_RE = /^(adm|inv)-/;      /* own responsive behaviour already */
  var SKIP_TABLE = ['upf-table', 'ma-table', 'ds-type-table', 'cmp-grid'];

  var win = window;
  var entries = [];                      /* { root, wrapper, type, headEl } */
  var byRoot = (typeof WeakSet !== 'undefined') ? new WeakSet() : null;
  var ro = (typeof ResizeObserver !== 'undefined')
    ? new ResizeObserver(onResize) : null;

  function norm(s) { return (s || '').replace(/\s+/g, ' ').trim(); }
  function forEach(list, fn) { Array.prototype.forEach.call(list, fn); }

  /* Header label text with icon glyphs / sort chevrons stripped. */
  function labelText(el) {
    if (!el) return '';
    var sel = 'svg, .material-symbols-outlined, .material-symbols-rounded, [class*="sort"], [class*="caret"], [class*="arrow"]';
    if (!(el.querySelector && el.querySelector(sel))) return norm(el.textContent);
    var clone = el.cloneNode(true);
    forEach(clone.querySelectorAll(sel), function (n) {
      if (n.parentNode) n.parentNode.removeChild(n);
    });
    return norm(clone.textContent);
  }

  function classTokens(el) {
    var cls = el && el.className;
    return typeof cls === 'string' ? cls.split(/\s+/) : [];
  }
  function tokenMatches(el, re) {
    var t = classTokens(el);
    for (var i = 0; i < t.length; i++) { if (re.test(t[i])) return true; }
    return false;
  }

  /* A cell's shared "*-col-*" class (e.g. pf-col-shield), for robust pairing. */
  function colKey(el) {
    var t = classTokens(el), key = null;
    for (var i = 0; i < t.length; i++) {
      if (/-col-/.test(t[i]) && !/-col-menu$/.test(t[i])) key = t[i];
    }
    return key;
  }

  function isHidden(el) {
    var cs = win.getComputedStyle(el);
    return cs.display === 'none' || cs.visibility === 'hidden';
  }

  function labelsFrom(cells) {
    return Array.prototype.map.call(cells, function (c) {
      var t = labelText(c);
      return ACTION_RE.test(t) ? '' : t;
    });
  }
  function colMapFrom(cells, labels) {
    var map = {};
    Array.prototype.forEach.call(cells, function (c, i) {
      var k = colKey(c);
      if (k && map[k] == null) map[k] = labels[i] || '';
    });
    return map;
  }

  /* Give a cell its field label + mark it as a shown field (only if visible,
     so hidden columns are never forced back on screen in card mode). */
  function tagCell(cell, label) {
    if (label && cell.getAttribute('data-rlabel') === null) {
      cell.setAttribute('data-rlabel', label);
    }
    if (isHidden(cell)) cell.classList.remove('rtbl-fld');
    else cell.classList.add('rtbl-fld');
  }

  /* (Re)compute labels and (re)tag every current cell of a table. */
  function refresh(entry) {
    if (entry.type === 'table') {
      var thead = entry.root.tHead;
      var tbody = entry.root.tBodies && entry.root.tBodies[0];
      if (!thead || !tbody || !thead.rows.length) return;
      var labels = labelsFrom(thead.rows[thead.rows.length - 1].cells);
      forEach(tbody.rows, function (tr) {
        forEach(tr.cells, function (td, i) {
          if (td.colSpan && td.colSpan > 1) { td.classList.add('rtbl-fld'); return; }
          tagCell(td, labels[i] || '');
        });
      });
    } else {
      var head = entry.headEl;
      if (!head) return;
      var hcells = head.children;
      var glabels = labelsFrom(hcells);
      var cmap = colMapFrom(hcells, glabels);
      var rows = Array.prototype.filter.call(entry.root.querySelectorAll('*'),
        function (el) { return tokenMatches(el, TROW_RE); });
      forEach(rows, function (row) {
        row.classList.add('rtbl-grow');
        forEach(row.children, function (cell, i) {
          var k = colKey(cell);
          var lbl = (k && cmap[k] != null) ? cmap[k] : (glabels[i] || '');
          tagCell(cell, lbl);
        });
      });
    }
  }

  function measureAndToggle(entry) {
    var w = entry.wrapper.getBoundingClientRect().width;
    if (!w) return;                      /* not laid out / detached */
    var on = w <= BREAK;
    if (on === entry.on) return;
    entry.on = on;
    entry.root.classList.toggle('rtbl-cards', on);
    if (on) refresh(entry);              /* ensure labels/visibility current */
  }

  function onResize(records) {
    forEach(records, function (rec) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].wrapper === rec.target) { measureAndToggle(entries[i]); break; }
      }
    });
  }

  function register(root, wrapper, type, headEl) {
    if (byRoot && byRoot.has(root)) return;
    if (byRoot) byRoot.add(root);
    var entry = { root: root, wrapper: wrapper, type: type, headEl: headEl, on: false };
    entries.push(entry);
    if (type === 'table') root.classList.add('rtbl');
    else { root.classList.add('rtbl-grid'); if (headEl) headEl.classList.add('rtbl-ghead'); }
    refresh(entry);
    if (ro) ro.observe(wrapper);
    measureAndToggle(entry);
  }

  /* ── Discovery ────────────────────────────────────────────────────────── */
  function prepTable(table) {
    if (byRoot && byRoot.has(table)) return;   /* refreshed by scan()'s loop */
    if (table.hasAttribute('data-no-cards')) return;
    for (var s = 0; s < SKIP_TABLE.length; s++) {
      if (table.classList.contains(SKIP_TABLE[s])) return;
    }
    if (table.parentNode && table.parentNode.closest &&
        table.parentNode.closest('table')) return;   /* nested table */
    var thead = table.tHead, tbody = table.tBodies && table.tBodies[0];
    if (!thead || !tbody || !thead.rows.length) return;
    register(table, table.parentElement || table, 'table', null);
  }

  function prepGrid(head) {
    if (!tokenMatches(head, THEAD_RE)) return;
    var root = head.parentElement;
    if (!root) return;
    if (byRoot && byRoot.has(root)) return;    /* refreshed by scan()'s loop */
    if (tokenMatches(root, SKIP_GRID_RE)) return;
    if (head.hasAttribute('data-no-cards') || root.hasAttribute('data-no-cards')) return;
    if (!head.children || head.children.length < 2) return;
    register(root, root.parentElement || root, 'grid', head);
  }

  function scan(root) {
    root = root || document;
    forEach(root.querySelectorAll('table'), prepTable);
    forEach(root.querySelectorAll('[class*="thead"], [class*="tbl-head"]'), prepGrid);
    /* Re-tag every known table (rows/columns may have re-rendered or toggled)
       and re-check its width. */
    forEach(entries, function (e) { refresh(e); measureAndToggle(e); });
  }

  function remeasureAll() { forEach(entries, measureAndToggle); }

  function start() {
    scan(document);
    /* Belt-and-braces: re-check widths on window resize too, in case a layout
       change doesn't reach the ResizeObserver (or it's unsupported). */
    win.addEventListener('resize', function () {
      (win.requestAnimationFrame || win.setTimeout)(remeasureAll, 0);
    });
    if (typeof MutationObserver === 'undefined') return;
    var pending = false;
    var obs = new MutationObserver(function () {
      if (pending) return;
      pending = true;
      (win.requestAnimationFrame || win.setTimeout)(function () {
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
