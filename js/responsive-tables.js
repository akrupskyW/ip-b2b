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

   A column with NO header holds a control or the row's identity, and a card
   gives each of those its own place — so this script also reads what is in
   those cells and tags them (see kindOf / layoutRow):

     .rtbl-lead      the identity — the product, the person, the company. Leads
                     the card.
     .rtbl-ctl       an icon-only control (checkbox, reports icon), riding the
                     identity's row, flush right;  .rtbl-ctl--menu  is the ⋮,
                     which always ends that row hard against the card's edge.
     .rtbl-act       a control that says what it does in words. Lands at the
                     foot, centred;  .rtbl-act--link  carries an arrow (it
                     leaves for somewhere else) and trails the foot on the right.
     .rtbl-dupe      a date cell's own key ("Updated") when the card's field
                     label already says the same word.

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

  /* Icon glyphs, sort chevrons and anything that is not on screen — stripped
     before a cell's text is read. The row menus matter here: a ⋮ carries its
     whole popover ("Edit", "View", "Reports") inside the cell, so a naive read
     makes the most icon-only cell in the app look like the wordiest one. */
  var STRIP_SEL = 'svg, .material-symbols-outlined, .material-symbols-rounded, ' +
    '[class*="sort"], [class*="caret"], [class*="arrow"], ' +
    '[role="menu"], [role="tooltip"], [hidden], .hidden, .sr-only, .visually-hidden, .attb-sr';

  /* A control that reads as a link out to somewhere else rather than an action
     on the row. Its arrow is the tell. */
  var ARROW_RE = /^(arrow_outward|arrow_forward|arrow_right_alt|arrow_right|north_east|open_in_new|call_made|chevron_right|trending_flat|east)$/;
  var CTRL_SEL = 'button, a[href], [role="button"], input, select';

  /* The two icon controls a card places by name rather than by source order:
     row selection leads, and the ⋮ always closes the line. Everything else
     icon-only sits between the identity and the ⋮. */
  var KEBAB_RE = /^(more_vert|more_horiz)$/;
  var CHECK_RE = /^(check_box|check_box_outline_blank|indeterminate_check_box|select_check_box)$/;
  var GLYPH_SEL = '.material-symbols-outlined, .material-symbols-rounded';

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
    if (!(el.querySelector && el.querySelector(STRIP_SEL))) return norm(el.textContent);
    var clone = el.cloneNode(true);
    forEach(clone.querySelectorAll(STRIP_SEL), function (n) {
      if (n.parentNode) n.parentNode.removeChild(n);
    });
    return norm(clone.textContent);
  }

  /* True when any glyph inside `el` matches. Read against the ligature text,
     because that is the only thing that tells a ⋮ from a reports icon — both
     are icon-only buttons that own a popover. */
  function hasGlyph(el, re) {
    var glyphs = el.querySelectorAll(GLYPH_SEL);
    for (var i = 0; i < glyphs.length; i++) {
      if (re.test(norm(glyphs[i].textContent))) return true;
    }
    return false;
  }

  /* ── What an unlabelled cell is ───────────────────────────────────────────
     A column with no header holds one of three things, and each has its own
     place in a card:

       'ctl'   an icon-only control — the ⋮, the reports icon, the row
               checkbox. Rides the identity row, flush right.
       'act'   a control that says what it does in words ("Review & Claim",
               "Edit"). Lands at the foot of the card, centred.
       'link'  the same, but arrowed — it leaves for somewhere else, so it
               trails the foot on the right rather than sitting centre stage.
       'id'    everything else: the product, the person, the company. This is
               what the card is about, so it leads. */
  function kindOf(cell) {
    if (!labelText(cell)) return 'ctl';
    if (!cell.querySelector(CTRL_SEL)) return 'id';
    /* Everything the cell says, it says through its controls — so the cell IS
       the controls. Take them out and look at what is left, rather than compare
       the cell against its first button: the invoice row carries four of them,
       and matching only the first read that whole cell as an identity. */
    var rest = cell.cloneNode(true);
    forEach(rest.querySelectorAll(CTRL_SEL), function (n) {
      if (n.parentNode) n.parentNode.removeChild(n);
    });
    if (labelText(rest)) return 'id';
    return hasGlyph(cell, ARROW_RE) ? 'link' : 'act';
  }

  /* A date cell prints its own key ("Updated", "Joined") beside the value, and
     the card prints the column's name above it — so the word arrives twice.
     Mark the copy. Only a key paired with a value qualifies: a cell whose whole
     value happens to match its header keeps it. */
  function dedupeLabel(cell, label) {
    var key = label.toLowerCase();
    forEach(cell.querySelectorAll('*'), function (n) {
      var dupe = !n.children.length
        && n.parentElement && n.parentElement.children.length > 1
        && norm(n.textContent).toLowerCase() === key;
      n.classList.toggle('rtbl-dupe', dupe);
    });
  }

  /* Sort one row's unlabelled cells into the places a card has for them. Only
     the first identity cell leads — a second one is just another line. */
  function layoutRow(cells) {
    var lead = null, firstCtl = null, firstField = null;
    forEach(cells, function (cell) {
      cell.classList.remove('rtbl-ctl', 'rtbl-ctl--lead', 'rtbl-ctl--menu',
        'rtbl-ctl--check', 'rtbl-act', 'rtbl-act--link', 'rtbl-lead');
      if (!cell.classList.contains('rtbl-fld')) return;
      var label = cell.getAttribute('data-rlabel');
      if (label) {
        if (!firstField) firstField = cell;
        dedupeLabel(cell, label);
        return;
      }
      var kind = kindOf(cell);
      if (kind === 'ctl') {
        cell.classList.add('rtbl-ctl');
        /* Match the glyph, not "owns a popover" — the portfolio's reports icon
           owns one too, and it is not the row menu. */
        if (cell.querySelector('.panel-more-btn') || hasGlyph(cell, KEBAB_RE)) {
          cell.classList.add('rtbl-ctl--menu');
        } else if (cell.querySelector('input[type="checkbox"], [role="checkbox"]')
            || hasGlyph(cell, CHECK_RE)) {
          cell.classList.add('rtbl-ctl--check');
        }
        if (!firstCtl) firstCtl = cell;
        return;
      }
      if (kind === 'act' || kind === 'link') {
        cell.classList.add('rtbl-act');
        if (kind === 'link') cell.classList.add('rtbl-act--link');
        return;
      }
      if (!lead) { lead = cell; cell.classList.add('rtbl-lead'); }
    });
    /* Plenty of tables name their identity column ("Product Name", "Company +
       Type"), so there is no unlabelled cell to lead the card. The first
       labelled field takes the job instead — otherwise the ⋮ spends a whole
       line of the card on itself and pushes the product down. */
    if (!lead && firstCtl && firstField) {
      lead = firstField;
      firstField.classList.add('rtbl-lead');
    }
    /* With nothing at all to lead the row, the icon controls have no one to
       push them over — so the first of them takes the free space instead. */
    if (firstCtl) firstCtl.classList.toggle('rtbl-ctl--lead', !lead);
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
        layoutRow(tr.cells);
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
        layoutRow(row.children);
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
