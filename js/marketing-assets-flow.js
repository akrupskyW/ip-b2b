import './date-column.js';

/**
 * Marketing Assets browser.
 *
 * A self-contained, nested-table file browser rendered into #agent-main-scroll
 * on marketing-assets.html (an app-nav shell page). The whole asset library is
 * modelled as a deep tree and rendered with the same CSS-grid table the rest
 * of the app uses (portfolio / invoices). Opening a folder drops a nested
 * list of rows indented under it, so the hierarchy nests visibly as many
 * levels as the data runs.
 *
 * Behaviour:
 *   - Click a folder row (or the chevron in the first column) to expand/collapse its nested table.
 *   - Sort by Name / Size / Date from the table column headers (folders stay first).
 *   - Filters live in a tune icon inside the search pill (type + expand/collapse).
 *   - Preview (images + SVG) opens a lightbox; Download fires a confirmation.
 *   - A brand chip sits left of the module ⋯ (same switcher as Product Portfolio).
 */

/* ------------------------------------------------------------------ */
/* Utilities                                                           */
/* ------------------------------------------------------------------ */

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const KB = (n) => Math.round(n * 1024);
const MB = (n) => Math.round(n * 1024 * 1024);

function fmtBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

/* Map a filename extension to a material icon + tone class. Images + SVG are
   the only types that carry a live Preview; everything else is download-only. */
function fileMeta(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const previewable = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
  const map = {
    pdf:  { icon: 'picture_as_pdf', tone: 'ma-ic--pdf' },
    png:  { icon: 'image', tone: 'ma-ic--img' },
    jpg:  { icon: 'image', tone: 'ma-ic--img' },
    jpeg: { icon: 'image', tone: 'ma-ic--img' },
    gif:  { icon: 'gif_box', tone: 'ma-ic--img' },
    webp: { icon: 'image', tone: 'ma-ic--img' },
    svg:  { icon: 'shape_line', tone: 'ma-ic--vector' },
    psd:  { icon: 'layers', tone: 'ma-ic--vector' },
    ai:   { icon: 'brush', tone: 'ma-ic--vector' },
    eps:  { icon: 'polyline', tone: 'ma-ic--vector' },
    doc:  { icon: 'article', tone: 'ma-ic--doc' },
    docx: { icon: 'article', tone: 'ma-ic--doc' },
  };
  const m = map[ext] || { icon: 'insert_drive_file', tone: '' };
  return { ext, previewable, ...m };
}

/* Group a file into one of the library's high-level types. These map 1:1 to the
   score cards above the table (Images, Vectors & Source, PDFs, Documents) and
   drive the type filter. Anything unrecognised falls into 'other'. */
function fileCategory(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
  if (['svg', 'psd', 'ai', 'eps'].includes(ext)) return 'vector';
  if (['doc', 'docx'].includes(ext)) return 'doc';
  return 'other';
}

/* Card definitions, in display order. The leading "all" card clears the filter;
   the rest each scope the table to their file type. */
const TYPE_CARDS = [
  { key: 'all',    label: 'All assets' },
  { key: 'image',  label: 'Images' },
  { key: 'vector', label: 'Vectors & Source' },
  { key: 'pdf',    label: 'PDFs' },
  { key: 'doc',    label: 'Documents' },
];

/* Count every file in the tree by category, plus the grand total (used by the
   "All assets" card). Folders don't count toward any type. */
function typeCounts() {
  const counts = { all: 0, image: 0, vector: 0, pdf: 0, doc: 0, other: 0 };
  (function walk(node) {
    if (node.type === 'file') { counts[fileCategory(node.name)]++; counts.all++; return; }
    (node.children || []).forEach(walk);
  })(TREE);
  return counts;
}

/* Folder glyphs are chosen from the folder's own label so each row reads as
   what it holds (a shield, an envelope, a package…) rather than a generic
   folder. Order matters — the more specific keywords are tested first. */
function folderIcon(name) {
  const n = name.toLowerCase();
  if (n.includes('email')) return 'mail';
  if (n.includes('digital')) return 'devices';
  if (n.includes('print')) return 'print';
  if (n.includes('permission')) return 'lock';
  if (n.includes('shield')) return 'verified_user';
  if (n.includes('one-sheet') || n.includes('one sheet')) return 'description';
  if (n.includes('packaging')) return 'inventory_2';
  if (n.includes('social')) return 'share';
  if (n.includes('website')) return 'language';
  if (n.includes('template')) return 'dashboard_customize';
  if (n.includes('banner')) return 'panorama';
  if (n.includes('header')) return 'web_asset';
  if (/post\b/.test(n)) return 'collections';
  return 'folder';
}

function toast(msg, icon = 'check') {
  let wrap = document.getElementById('ma-toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'ma-toast-wrap';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = 'ma-toast';
  t.innerHTML = `<span class="material-symbols-outlined">${esc(icon)}</span><span>${esc(msg)}</span>`;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('is-in'));
  setTimeout(() => {
    t.classList.remove('is-in');
    setTimeout(() => t.remove(), 320);
  }, 2800);
}

/* ------------------------------------------------------------------ */
/* Data — the full asset library (transcribed from the toolkit)        */
/* ------------------------------------------------------------------ */

const UPDATED_17 = 'Apr 17, 2026';
const UPDATED_21 = 'Apr 21, 2026';

const file = (name, bytes, updated = UPDATED_17) => ({ type: 'file', name, bytes, updated });
const folder = (name, children) => ({ type: 'folder', name, children });

const TREE = folder('Marketing Assets', [
  folder('One-Sheet Toolkit', [
    folder('Template A', [
      file('Non-UPF Verified Co-Branded Onesheet – Template A.png', MB(1.9)),
      file('Non-UPF Verified Co-Branded Onesheet – Template A.psd', MB(11.6)),
      file('Non-UPF Verified Co-Branded Onesheet – Template A Example – DO NOT USE.png', MB(1.9)),
    ]),
    folder('Template B', [
      file('Non-UPF Verified Co-Branded Onesheet – Template B.png', MB(1.9)),
      file('Non-UPF Verified Co-Branded Onesheet – Template B.psd', MB(12.4)),
      file('Non-UPF Verified Co-Branded Onesheet – Template B Example – DO NOT USE.png', MB(1.9)),
    ]),
    folder('Template C', [
      file('Non-UPF Verified Co-Branded Onesheet – Template C.psd', MB(6.1)),
      file('Non-UPF Verified Co-Branded Onesheet – Template C - Crop Marks.png', MB(1.2)),
      file('Non-UPF Verified Co-Branded Onesheet – Template C - No Crop Marks.png', MB(1.9)),
    ]),
    file('1 – Instructions – WISEcode One Sheet Toolkit.pdf', MB(3.7)),
  ]),

  folder('Packaging Resources', [
    file('WISEcode Non-UPF Verified™ Shield Examples.pdf', KB(988.6)),
    file('WISEcode Trademark Use Guide and Brand Standards.pdf', MB(2.5), UPDATED_21),
  ]),

  folder('Social Media Toolkit', [
    folder('Post 1', []),
    folder('Post 2', []),
    folder('Post 3', []),
    file('1 – Instructions – WISEcode Social Media Toolkit.pdf', MB(2)),
  ]),

  folder('Website Assets', [
    file('Website Blurb Press Release.docx', KB(232.6)),
  ]),

  folder('WISEcode Email-SMS Toolkit', [
    folder('Email Banner', [
      file('Email Banner 1080x1080.png', KB(636.4)),
      file('Email Banner 1920x1080.png', KB(831.2)),
    ]),
    folder('Email Header', [
      file('Email Header 1 – 1400x1400.png', KB(81.2)),
      file('Email Header 1 – 1400x1400.psd', MB(1.3), UPDATED_21),
      file('Email Header 1 – 1400x1400 – Template – DO NOT USE.png', KB(95.2)),
      file('Email Header 2 – 1400x962.png', KB(94.5)),
    ]),
    file('1 – Instructions – WISEcode Email SMS Toolkit.pdf', KB(829.1)),
  ]),

  folder('WISEcode Non-UPF Verified™ Shield', [
    folder('WISEcode Non-UPF Verified™ Shield Digital', [
      folder('USE WITH PERMISSION ONLY', [
        file('WISEcode Non-UPF Verified™ Shield Black.png', KB(40.5)),
        file('WISEcode Non-UPF Verified™ Shield White.png', KB(38.1)),
      ]),
      file('WISEcode Non-UPF Verified™ Shield.png', KB(50.1)),
    ]),
    folder('WISEcode Non-UPF Verified™ Shield Print', [
      folder('USE WITH PERMISSION ONLY', [
        file('WISEcode Non-UPF Verified™ Shield Black.ai', KB(77.8)),
        file('WISEcode Non-UPF Verified™ Shield Black.eps', KB(476.6)),
        file('WISEcode Non-UPF Verified™ Shield Black.svg', KB(64.2)),
        file('WISEcode Non-UPF Verified™ Shield White.ai', KB(59.5)),
        file('WISEcode Non-UPF Verified™ Shield White.eps', KB(452.5)),
        file('WISEcode Non-UPF Verified™ Shield White.svg', KB(63.7)),
      ]),
      file('WISEcode Non-UPF Verified™ Shield.ai', KB(80.1)),
      file('WISEcode Non-UPF Verified™ Shield.eps', KB(494.9)),
      file('WISEcode Non-UPF Verified™ Shield.svg', KB(15.5)),
    ]),
  ]),
]);

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

/* Same catalog as the Product Portfolio brand chip (Flax4Life first). */
const BRANDS = [
  { name: 'Flax4Life', color: '#2E7D5B', avatar: null, claimed: 5, discovered: 47 },
  { name: 'Simple Truth', color: '#4E7D5A', avatar: '../assets/compare/simpletruth.png', claimed: 10, discovered: 10 },
  { name: 'Purely Elizabeth', color: '#C9736B', avatar: '../assets/compare/sug_purely.jpg', claimed: 10, discovered: 10 },
  { name: 'Siete', color: '#C0392B', avatar: '../assets/compare/sug_siete.jpg', claimed: 10, discovered: 10 },
  { name: 'KIND', color: '#E0A100', avatar: '../assets/compare/kind.jpg', claimed: 10, discovered: 10 },
];

const state = {
  sortKey: 'name',   // 'name' | 'size' | 'date'
  sortDir: 1,        // 1 asc, -1 desc
  open: new Set(),   // set of open folder path ids
  query: '',         // live search text (matches names at any depth)
  typeFilter: null,  // null | 'image' | 'vector' | 'pdf' | 'doc' — score-card / popover filter
  filterOpen: false, // in-search filter popover
  dateLead: 'updated',
  brand: 'Flax4Life',
};
const currentBrand = () => BRANDS.find((b) => b.name === state.brand) || BRANDS[0];
let dateLeadBound = false;
function dc() { return window.WiseDateCol; }
function nodeDates(node) {
  const D = dc();
  const partial = { updated: node._updated, created: node._created, viewed: node._viewed || node._updated };
  return D ? D.complete(partial, 'asset') : partial;
}

const ARROW_SVG = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 9.5V2.5M3 6.5L6 9.5l3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const TYPE_CHIP = [
  { key: null,     label: 'All',      icon: 'apps' },
  { key: 'image',  label: 'Images',   icon: 'image' },
  { key: 'vector', label: 'Vectors',  icon: 'shape_line' },
  { key: 'pdf',    label: 'PDFs',     icon: 'picture_as_pdf' },
  { key: 'doc',    label: 'Documents', icon: 'article' },
];

/* Give every node a stable path id from the root, so open-state + node lookup
   survive re-renders. Files count too (used by the modal + downloads). */
function assignPaths(node, path = '') {
  node._path = path || node.name;
  if (node.type === 'folder' && node.children) {
    node.children.forEach((c) => assignPaths(c, `${node._path}/${c.name}`));
  }
}
assignPaths(TREE);

/* Roll size + latest date up the tree so folders have real Size / Date cells
   and can sort on those columns the same way files do. */
function rollup(node) {
  const D = dc();
  if (node.type === 'file') {
    node._bytes = node.bytes || 0;
    node._updated = node.updated || '';
    node._created = node.created || (D ? D.shiftDate(node._updated, -14) : node._updated);
    node._viewed = node.viewed || node._updated;
    return;
  }
  let bytes = 0;
  let latest = '';
  let latestTs = 0;
  let earliest = '';
  let earliestTs = Infinity;
  (node.children || []).forEach((c) => {
    rollup(c);
    bytes += c._bytes || 0;
    const ts = Date.parse(c._updated) || 0;
    if (ts >= latestTs) { latestTs = ts; latest = c._updated; }
    const cts = Date.parse(c._created) || 0;
    if (cts && cts < earliestTs) { earliestTs = cts; earliest = c._created; }
  });
  node._bytes = bytes;
  node._updated = latest;
  node._created = earliest || latest;
  node._viewed = latest;
}
rollup(TREE);

/* Flat lookup so click handlers can resolve a node from its path id. */
const NODE_BY_PATH = new Map();
(function index(node) {
  NODE_BY_PATH.set(node._path, node);
  if (node.children) node.children.forEach(index);
})(TREE);

function isImportant(node) {
  /* "DO NOT USE" template/example files get a subtle warning tint. */
  return /DO NOT USE/i.test(node.name);
}

/* ------------------------------------------------------------------ */
/* Sorting                                                             */
/* ------------------------------------------------------------------ */

function sortChildren(children) {
  const dir = state.sortDir;
  const folders = children.filter((c) => c.type === 'folder');
  const files = children.filter((c) => c.type === 'file');

  const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }) * dir;
  const bySize = (a, b) => ((a._bytes || 0) - (b._bytes || 0)) * dir;
  const byDate = (a, b) => {
    const D = dc();
    const av = D ? D.sortValue(nodeDates(a), 'asset', state.dateLead) : (Date.parse(a._updated) || 0);
    const bv = D ? D.sortValue(nodeDates(b), 'asset', state.dateLead) : (Date.parse(b._updated) || 0);
    return (av - bv) * dir;
  };
  const cmp = state.sortKey === 'size' ? bySize : state.sortKey === 'date' ? byDate : byName;

  /* Folders stay grouped above files; both groups honour the active column. */
  folders.sort(cmp);
  files.sort(cmp);
  return [...folders, ...files];
}

function fmtNodeBytes(node) {
  if (node.type === 'folder' && !node._bytes) return '—';
  return fmtBytes(node._bytes || 0);
}
function fmtNodeDate(node) {
  return node._updated || '—';
}

/* ------------------------------------------------------------------ */
/* Search — queries every name in the tree, at any depth                */
/* ------------------------------------------------------------------ */

function q() { return state.query.trim().toLowerCase(); }
function searching() { return q().length > 0; }
function typeActive() { return !!state.typeFilter; }
/* Any active constraint (text search OR score-card type filter) puts the tree
   into "filtered" mode: matching folders auto-expand and non-matches drop. */
function filtering() { return searching() || typeActive(); }

function nodeMatches(node) {
  return node.name.toLowerCase().includes(q());
}

/* Does a file pass the active score-card type filter? */
function fileTypeOk(node) {
  return !typeActive() || fileCategory(node.name) === state.typeFilter;
}

/* A file is visible when it satisfies BOTH the text query and the type filter.
   A folder is kept if anything beneath it is visible — except when a plain text
   search (no type filter) hits the folder's own name, which reveals all of its
   contents so the match reads in context. */
function subtreeMatches(node) {
  if (node.type === 'file') return nodeMatches(node) && fileTypeOk(node);
  if (searching() && !typeActive() && nodeMatches(node)) return true;
  return node.children.some(subtreeMatches);
}

/* Children to show for a node given the current query + type filter. */
function visibleChildren(node) {
  if (!filtering()) return node.children;
  if (searching() && !typeActive() && nodeMatches(node)) return node.children;
  return node.children.filter(subtreeMatches);
}

/* Total matching files anywhere under the tree — drives the results count. */
function countMatches() {
  let n = 0;
  (function walk(node) {
    if (node.type === 'file') { if (nodeMatches(node) && fileTypeOk(node)) n++; return; }
    node.children.forEach(walk);
  })(TREE);
  return n;
}

/* Wrap the matched span in a <mark> so hits stand out in long file names. */
function highlight(name) {
  const safe = esc(name);
  if (!searching()) return safe;
  const rx = new RegExp(`(${q().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
  return safe.replace(rx, '<mark class="ma-hl">$1</mark>');
}

function countChildren(node) {
  const kids = visibleChildren(node);
  const f = kids.filter((c) => c.type === 'folder').length;
  const d = kids.filter((c) => c.type === 'file').length;
  const parts = [];
  if (f) parts.push(`${f} folder${f === 1 ? '' : 's'}`);
  if (d) parts.push(`${d} file${d === 1 ? '' : 's'}`);
  return parts.join(' · ') || 'Empty';
}

/* ------------------------------------------------------------------ */
/* Rendering — CSS-grid table (same shell as invoices / portfolio)      */
/* ------------------------------------------------------------------ */

function renderThead() {
  const D = dc();
  const th = (key, label, extraCls = '') => {
    const active = state.sortKey === key;
    const dir = active ? ` data-ma-dir="${state.sortDir === 1 ? 'asc' : 'desc'}"` : '';
    const inner = (key === 'date' && D) ? D.headerHtml({ kinds: 'asset', lead: state.dateLead }) : esc(label);
    const dateCls = key === 'date' ? ' w-date-th' : '';
    return `<span class="ma-th ma-th--sortable ${extraCls}${dateCls}" role="columnheader" tabindex="0" data-ma-sort="${key}"${dir} aria-sort="${active ? (state.sortDir === 1 ? 'ascending' : 'descending') : 'none'}">${inner}<span class="ma-sort-arrow">${ARROW_SVG}</span></span>`;
  };
  return `<div class="ma-thead">
    <span class="ma-th ma-th-expand" aria-label="Expand"></span>
    <span class="ma-th ma-th-actions" aria-label="Actions"></span>
    ${th('name', 'Name')}
    ${th('size', 'Size', 'ma-th-size ma-th--num')}
    ${th('date', 'Date', 'ma-th-date')}
  </div>`;
}

function rowMenuItem(act, path, icon, label) {
  return `<button type="button" class="ma-rowmenu-item" role="menuitem" data-ma-act="${esc(act)}" data-ma-path="${esc(path)}"><span class="material-symbols-outlined">${icon}</span>${esc(label)}</button>`;
}

function renderRowMenu(node, open) {
  const items = node.type === 'folder'
    ? rowMenuItem(open ? 'collapse' : 'expand', node._path, open ? 'unfold_less' : 'unfold_more', open ? 'Collapse' : 'Expand')
    : [
        fileMeta(node.name).previewable ? rowMenuItem('preview', node._path, 'visibility', 'Preview') : '',
        rowMenuItem('download', node._path, 'download', 'Download'),
      ].join('');
  return `<div class="ma-rowmenu">
    <button type="button" class="ma-rowmenu-btn" aria-haspopup="true" aria-expanded="false" aria-label="Actions"><span class="material-symbols-outlined">more_vert</span></button>
    <div class="ma-rowmenu-pop" role="menu" hidden>${items}</div>
  </div>`;
}

function renderRows(children) {
  if (!children.length) {
    const msg = filtering() ? 'No assets match the current filter.' : 'This folder is empty.';
    return `<div class="ma-row ma-row--empty"><span class="ma-empty">${msg}</span></div>`;
  }
  return sortChildren(children).map((node) =>
    node.type === 'folder' ? renderFolderRow(node) : renderFileRow(node)
  ).join('');
}

function renderFolderRow(node) {
  /* While filtering (search or a type card), folders on the path to a hit render
     open so results are visible without any clicking; otherwise honour the
     manual open state. */
  const open = filtering() ? true : state.open.has(node._path);
  const nested = open
    ? `<div class="ma-nest">${renderRows(visibleChildren(node))}</div>`
    : '';
  return `
    <div class="ma-row ma-row--folder ${open ? 'is-open' : ''}" data-folder="${esc(node._path)}"
        role="button" tabindex="0" aria-expanded="${open}">
      <span class="ma-td ma-cell-expand">
        <span class="ma-chevron"><span class="material-symbols-outlined">chevron_right</span></span>
      </span>
      <span class="ma-td ma-cell-actions">${renderRowMenu(node, open)}</span>
      <span class="ma-td ma-cell-main">
        <span class="ma-name-wrap">
          <span class="ma-ic ma-ic--folder"><span class="material-symbols-outlined">${folderIcon(node.name)}</span></span>
          <span class="ma-name-block">
            <span class="ma-name">${highlight(node.name)}</span>
            <span class="ma-count-pill">${esc(countChildren(node))}</span>
          </span>
        </span>
      </span>
      <span class="ma-td ma-cell-size">${esc(fmtNodeBytes(node))}</span>
      <span class="ma-td ma-cell-date"><span class="w-datecell">${dc() ? dc().cellHtml(nodeDates(node), 'asset', state.dateLead) : esc(fmtNodeDate(node))}</span></span>
    </div>${nested}`;
}

function renderFileRow(node) {
  const m = fileMeta(node.name);
  const icon = `<span class="ma-ic ${m.tone || ''}"><span class="material-symbols-outlined">${m.icon}</span></span>`;
  const warn = isImportant(node) ? ' ma-name--warn' : '';
  return `
    <div class="ma-row ma-row--file" data-file="${esc(node._path)}">
      <span class="ma-td ma-cell-expand"></span>
      <span class="ma-td ma-cell-actions">${renderRowMenu(node, false)}</span>
      <span class="ma-td ma-cell-main">
        <span class="ma-name-wrap">
          ${icon}
          <span class="ma-name-block">
            <span class="ma-name${warn}">${highlight(node.name)}</span>
          </span>
        </span>
      </span>
      <span class="ma-td ma-cell-size">${esc(fmtNodeBytes(node))}</span>
      <span class="ma-td ma-cell-date"><span class="w-datecell">${dc() ? dc().cellHtml(nodeDates(node), 'asset', state.dateLead) : esc(fmtNodeDate(node))}</span></span>
    </div>`;
}

/* Score cards — one per file type in the library (plus an "All assets" card),
   each showing its count and doubling as a filter for the table below. */
function renderScorecards() {
  const counts = typeCounts();
  const cards = TYPE_CARDS
    .filter((c) => c.key === 'all' || counts[c.key] > 0)
    .map((c) => {
      const active = c.key === 'all' ? !state.typeFilter : state.typeFilter === c.key;
      return `
        <button type="button" class="ma-scorecard ma-scorecard--${c.key}${active ? ' is-active' : ''}"
                data-type="${c.key}" aria-pressed="${active}">
          <span class="ma-sc-metric">${counts[c.key]}</span>
          <span class="ma-sc-label">${esc(c.label)}</span>
        </button>`;
    }).join('');
  return `<div class="ma-scorecards" role="group" aria-label="Filter assets by file type">${cards}</div>`;
}

function typeChipHtml() {
  return TYPE_CHIP.map((c) => {
    const on = c.key == null ? !state.typeFilter : state.typeFilter === c.key;
    const type = c.key == null ? 'all' : c.key;
    return `<button type="button" class="ma-fchip${on ? ' is-on' : ''}" data-ma-type="${type}">
      <span class="material-symbols-outlined">${c.icon}</span>${esc(c.label)}
    </button>`;
  }).join('');
}

function renderFilterPop() {
  return `
    <div class="ma-filter-pop" id="ma-filter-pop" role="dialog" aria-label="Filter assets"${state.filterOpen ? '' : ' hidden'}>
      <div class="ma-filter-pop-head">
        <span class="ma-filter-pop-title">Filters</span>
        <button type="button" class="ma-filter-clear" id="ma-filter-clear">Clear all</button>
      </div>
      <div class="ma-filter-group">
        <div class="ma-filter-label">Type</div>
        <div class="ma-filter-chips" role="group" aria-label="Filter by file type">${typeChipHtml()}</div>
      </div>
      <div class="ma-filter-group">
        <div class="ma-filter-label">Folders</div>
        <div class="ma-filter-chips">
          <button type="button" class="ma-fchip" id="ma-expand-toggle">
            <span class="material-symbols-outlined">unfold_more</span><span id="ma-expand-label">Expand all</span>
          </button>
        </div>
      </div>
      <div class="ma-filter-pop-foot">
        <button type="button" class="wise-btn wise-btn--primary wise-btn--sm" id="ma-filter-done">Done</button>
      </div>
    </div>`;
}

function brandAvatarHTML(b, cls) {
  const letter = esc(b.name.charAt(0));
  const bg = `style="background:${esc(b.color || 'var(--primary)')}"`;
  if (b.avatar) {
    return `<span class="${cls}" ${bg}><img src="${esc(b.avatar)}" alt="" onerror="this.parentNode.textContent='${letter}'"></span>`;
  }
  return `<span class="${cls}" ${bg}>${letter}</span>`;
}

function brandOptMeta(b) {
  return `${b.claimed} claimed · ${b.discovered} discovered`;
}

function brandChipHTML() {
  const b = currentBrand();
  const opts = BRANDS.map((brand) => {
    const on = brand.name === b.name;
    return `<button type="button" class="pf-brand-opt${on ? ' is-active' : ''}" role="option"` +
      ` data-ma="select-brand" data-brand="${esc(brand.name)}" data-name="${esc(brand.name.toLowerCase())}"` +
      ` aria-selected="${on ? 'true' : 'false'}">` +
      `${brandAvatarHTML(brand, 'pf-brand-opt-avatar')}` +
      `<span class="pf-brand-opt-text"><span class="pf-brand-opt-name">${esc(brand.name)}</span>` +
      `<span class="pf-brand-opt-meta">${esc(brandOptMeta(brand))}</span></span>` +
      `<span class="material-symbols-outlined pf-brand-opt-check" aria-hidden="true">check</span></button>`;
  }).join('');
  return `
    <div class="pf-brand" id="ma-brand">
      <button type="button" class="pf-brand-chip" id="ma-brand-chip" aria-haspopup="listbox"
        aria-expanded="false" aria-controls="ma-brand-opts" data-ma="toggle-brand">
        ${brandAvatarHTML(b, 'pf-brand-avatar')}
        <span class="pf-brand-name" id="ma-brand-name">${esc(b.name)}</span>
        <span class="material-symbols-outlined pf-brand-caret" aria-hidden="true">expand_more</span>
      </button>
      <div class="pf-brand-menu" id="ma-brand-menu" hidden>
        <div class="pf-brand-search">
          <span class="material-symbols-outlined" aria-hidden="true">search</span>
          <input type="search" id="ma-brand-search" data-ma="brand-search" placeholder="Search brands…" aria-label="Search brands" autocomplete="off" />
        </div>
        <div class="pf-brand-opts" id="ma-brand-opts" role="listbox" aria-label="Select a brand">${opts}</div>
        <div class="pf-brand-empty" id="ma-brand-empty" hidden>No brands match</div>
      </div>
    </div>`;
}

function brandMenuEl() {
  return document.getElementById('ma-brand-menu')
    || Array.from(document.querySelectorAll('.pf-brand-menu')).find((m) => m.__plHost?.id === 'ma-brand')
    || null;
}

function filterBrandMenu(query) {
  const q = String(query || '').trim().toLowerCase();
  const list = document.getElementById('ma-brand-opts')
    || brandMenuEl()?.querySelector('.pf-brand-opts');
  if (!list) return;
  let shown = 0;
  list.querySelectorAll('.pf-brand-opt').forEach((o) => {
    const match = !q || (o.getAttribute('data-name') || '').indexOf(q) !== -1;
    o.hidden = !match;
    if (match) shown++;
  });
  const empty = document.getElementById('ma-brand-empty')
    || brandMenuEl()?.querySelector('.pf-brand-empty');
  if (empty) empty.hidden = shown > 0;
}

function resetBrandSearch() {
  const input = document.getElementById('ma-brand-search')
    || brandMenuEl()?.querySelector('#ma-brand-search');
  if (input) input.value = '';
  filterBrandMenu('');
}

function closeBrandMenu() {
  const menu = brandMenuEl();
  const chip = document.getElementById('ma-brand-chip');
  if (chip) chip.setAttribute('aria-expanded', 'false');
  if (!menu) return;
  menu.setAttribute('hidden', '');
  resetBrandSearch();
}

function toggleBrandMenu() {
  const menu = brandMenuEl();
  const chip = document.getElementById('ma-brand-chip');
  if (!menu) return;
  const open = menu.hasAttribute('hidden');
  if (open) {
    resetBrandSearch();
    menu.removeAttribute('hidden');
    const input = document.getElementById('ma-brand-search')
      || menu.querySelector('#ma-brand-search');
    if (input) setTimeout(() => input.focus(), 0);
  } else {
    menu.setAttribute('hidden', '');
    resetBrandSearch();
  }
  if (chip) chip.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function applyBrand(name) {
  const next = BRANDS.find((b) => b.name === name);
  if (!next) return;
  state.brand = next.name;
  const chip = document.getElementById('ma-brand-chip');
  if (chip) {
    const av = chip.querySelector('.pf-brand-avatar');
    const label = chip.querySelector('#ma-brand-name');
    if (av) av.outerHTML = brandAvatarHTML(next, 'pf-brand-avatar');
    if (label) label.textContent = next.name;
  }
  const list = document.getElementById('ma-brand-opts')
    || brandMenuEl()?.querySelector('.pf-brand-opts');
  list?.querySelectorAll('.pf-brand-opt').forEach((o) => {
    const on = o.getAttribute('data-brand') === next.name;
    o.classList.toggle('is-active', on);
    o.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  const meta = document.querySelector('.ma-head-meta');
  if (meta) {
    meta.textContent = `Marketing materials, shield resources, and templates for ${next.name}.`;
  }
  closeBrandMenu();
}

function mountBrandSwitcher() {
  const controls = document.querySelector('#agent-main-header .panel-controls');
  if (!controls) {
    requestAnimationFrame(mountBrandSwitcher);
    return;
  }
  let trail = controls.querySelector('#ma-brand-trail');
  if (!trail) {
    trail = document.createElement('div');
    trail.id = 'ma-brand-trail';
    trail.className = 'pf-head-trail ma-brand-trail';
    controls.insertBefore(trail, controls.firstChild);
  }
  trail.innerHTML = brandChipHTML();
}

function wireBrandSwitcher() {
  if (typeof document === 'undefined' || document.__maBrandWired) return;
  document.__maBrandWired = true;
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('[data-ma="toggle-brand"]')) {
      e.stopPropagation();
      toggleBrandMenu();
      return;
    }
    const pick = t.closest('[data-ma="select-brand"]');
    if (pick) {
      e.stopPropagation();
      applyBrand(pick.getAttribute('data-brand'));
      return;
    }
    if (!t.closest('#ma-brand, .pf-brand-menu')) closeBrandMenu();
  });
  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'ma-brand-search') filterBrandMenu(e.target.value);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeBrandMenu(); return; }
    if (e.key !== 'Enter' || e.target?.id !== 'ma-brand-search') return;
    e.preventDefault();
    const first = (document.getElementById('ma-brand-opts')
      || brandMenuEl()?.querySelector('.pf-brand-opts'))
      ?.querySelector('.pf-brand-opt:not([hidden])');
    if (first) applyBrand(first.getAttribute('data-brand'));
  });
}

function renderShell() {
  const brand = currentBrand();
  return `
    <div data-w-date-root data-ma-board>
    <header class="ma-head">
      <div class="ma-head-titles">
        <h1 class="ma-head-title">Marketing Assets</h1>
        <p class="ma-head-meta">Marketing materials, shield resources, and templates for ${esc(brand.name)}.</p>
      </div>
    </header>
    <div class="ma-body">
      <!-- Score cards: file-type totals for the library that also filter the
           table below (mirrors the product-portfolio score cards). -->
      ${renderScorecards()}
      <!-- Search fills the row; a tune icon inside the pill opens the filter
           popover (type + expand/collapse). Sort lives on the table headers. -->
      <div class="ma-toolbar">
        <div class="ma-search-inline">
          <span class="material-symbols-outlined">search</span>
          <input type="text" class="ma-search" id="ma-search" placeholder="Search all assets by name, type, or toolkit"
                 autocomplete="off" spellcheck="false" aria-label="Search marketing assets" value="${esc(state.query)}" />
          <button type="button" class="ma-search-clear" id="ma-search-clear" aria-label="Clear search" hidden><span class="material-symbols-outlined">close</span></button>
          <button type="button" class="ma-filter-btn${typeActive() ? ' has-filters' : ''}${state.filterOpen ? ' is-active' : ''}" id="ma-filter-btn"
                  aria-haspopup="dialog" aria-expanded="${state.filterOpen}" title="Filters" aria-label="Filters">
            <span class="material-symbols-outlined">tune</span>
            <span class="ma-filter-dot" aria-hidden="true"></span>
          </button>
          ${renderFilterPop()}
        </div>
      </div>
      <div class="ma-searchbar-meta" id="ma-search-meta" hidden></div>
      <div class="ma-card">
        <div class="ma-table" id="ma-root-table" data-no-sort data-no-cards>
          ${renderThead()}
          <div class="ma-tbody">${renderRows(visibleChildren(TREE))}</div>
        </div>
      </div>
    </div>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Preview modal                                                       */
/* ------------------------------------------------------------------ */

let modalEl = null;

function openPreview(node) {
  const m = fileMeta(node.name);
  closePreview();
  const scrim = document.createElement('div');
  scrim.className = 'ma-modal-scrim';
  scrim.innerHTML = `
    <div class="ma-modal" role="dialog" aria-modal="true" aria-label="Preview ${esc(node.name)}">
      <div class="ma-modal-head">
        <span class="ma-modal-title">${esc(node.name)}</span>
        <button type="button" class="ma-modal-close" data-close aria-label="Close preview"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div class="ma-modal-preview">
        <div class="ma-modal-preview-tile"><span class="material-symbols-outlined">${m.icon}</span></div>
        <div class="ma-modal-preview-name">${esc(node.name)}</div>
      </div>
      <div class="ma-modal-foot">
        <span class="ma-modal-info">${esc(m.ext.toUpperCase())} · ${esc(fmtBytes(node.bytes))} · updated ${esc(node.updated)}</span>
        <button type="button" class="wise-btn wise-btn--primary" data-modal-download><span class="material-symbols-outlined">download</span><span>Download</span></button>
      </div>
    </div>`;
  document.body.appendChild(scrim);
  modalEl = scrim;
  requestAnimationFrame(() => scrim.classList.add('is-open'));

  scrim.addEventListener('click', (e) => {
    if (e.target === scrim || e.target.closest('[data-close]')) { closePreview(); return; }
    if (e.target.closest('[data-modal-download]')) { closePreview(); download(node); }
  });
}

function closePreview() {
  if (!modalEl) return;
  const el = modalEl;
  modalEl = null;
  el.classList.remove('is-open');
  setTimeout(() => el.remove(), 220);
}

function download(node) {
  toast(`Downloading ${node.name}`, 'download');
}

/* ------------------------------------------------------------------ */
/* WISEcodeAI intents — each chip in the dock maps to a real thing you can  */
/* do in this module (open a toolkit, grab the shield, expand it all).  */
/* ------------------------------------------------------------------ */

function topFolder(name) {
  return TREE.children.find((c) => c.type === 'folder' && c.name === name) || null;
}

function scrollToPath(host, path) {
  const row = [...host.querySelectorAll('.ma-row--folder')].find((r) => r.dataset.folder === path);
  if (!row) return;
  row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  row.classList.remove('ma-flash');
  void row.offsetWidth; // restart the pulse if it's still mid-animation
  row.classList.add('ma-flash');
  setTimeout(() => row.classList.remove('ma-flash'), 1400);
}

function openAndReveal(host, node, alsoFirstChild) {
  if (!node) return;
  state.open.add(node._path);
  if (alsoFirstChild) {
    const child = node.children.find((c) => c.type === 'folder');
    if (child) state.open.add(child._path);
  }
  repaint(host);
  requestAnimationFrame(() => scrollToPath(host, node._path));
}

function handleMarketingIntent(host, intent) {
  switch (intent) {
    case 'onesheet':       openAndReveal(host, topFolder('One-Sheet Toolkit')); break;
    case 'packaging':      openAndReveal(host, topFolder('Packaging Resources')); break;
    case 'social':         openAndReveal(host, topFolder('Social Media Toolkit')); break;
    case 'email_sms':      openAndReveal(host, topFolder('WISEcode Email-SMS Toolkit')); break;
    case 'shield':         openAndReveal(host, topFolder('WISEcode Non-UPF Verified™ Shield'), true); break;
    case 'brand_standards': {
      openAndReveal(host, topFolder('Packaging Resources'));
      const guide = NODE_BY_PATH.get('Marketing Assets/Packaging Resources/WISEcode Trademark Use Guide and Brand Standards.pdf');
      if (guide) download(guide);
      break;
    }
    case 'expand_all':
      allFolderPaths().forEach((p) => state.open.add(p));
      repaint(host);
      break;
    default:
      break;
  }
}

/* Resolve nodes by a fragment of their name so the chat's follow-up chips can
   point at real files without hard-coding fragile full paths. */
function findNode(pred) {
  let hit = null;
  (function walk(node) {
    if (hit) return;
    if (pred(node)) { hit = node; return; }
    (node.children || []).forEach(walk);
  })(TREE);
  return hit;
}
const fileByName = (frag) => findNode((n) => n.type === 'file' && n.name.includes(frag));
const folderByName = (frag) => findNode((n) => n.type === 'folder' && n.name.includes(frag));

/* One follow-up chip → a real action (download / preview / open) on a resolved
   node. Reuses the chat's own `.chip` styling so it reads as a suggested reply.
   Chips whose node can't be resolved are dropped rather than rendered broken. */
function replyChip({ node, act, label, icon }) {
  if (!node) return '';
  const a = act || (node.type === 'folder' ? 'open' : 'download');
  const ic = icon || (a === 'open' ? 'folder_open' : a === 'preview' ? 'visibility' : 'download');
  return `<button type="button" class="chip ma-do-chip" data-ma-do="${a}" data-ma-path="${esc(node._path)}"><span class="material-symbols-outlined">${ic}</span>${esc(label)}</button>`;
}
function replyChips(items) {
  const html = items.map(replyChip).filter(Boolean).join('');
  return html ? `<div class="ma-reply-chips" role="list" aria-label="Suggested actions">${html}</div>` : '';
}

/* The chat reply for each dock intent: a short narration PLUS contextual chips
   that let you download / open exactly what was just discussed, right in the
   thread. Exposed on window so agent-overview's intentReplies can call it. */
function marketingReply(intent) {
  switch (intent) {
    case 'onesheet':
      return 'Opened the <strong>One-Sheet Toolkit</strong> — co-branded Non-UPF one-sheets in Templates A, B and C (editable PSDs plus print-ready PNGs) and a setup guide. Grab one:' +
        replyChips([
          { node: fileByName('One Sheet Toolkit.pdf'), label: 'Download instructions', icon: 'download' },
          { node: folderByName('Template A'), act: 'open', label: 'Open Template A' },
          { node: folderByName('Template B'), act: 'open', label: 'Open Template B' },
          { node: folderByName('Template C'), act: 'open', label: 'Open Template C' },
        ]);
    case 'shield':
      return 'Opened the <strong>WISEcode Non-UPF Verified\u2122 Shield</strong> — web PNGs plus print-ready vectors. Download the one you need:' +
        replyChips([
          { node: fileByName('Shield.png'), label: 'Download shield (PNG)' },
          { node: fileByName('Shield.svg'), label: 'Download shield (SVG)' },
          { node: fileByName('Shield.ai'), label: 'Download shield (AI)' },
        ]);
    case 'brand_standards':
      return 'Here\u2019s the <strong>Trademark Use Guide &amp; Brand Standards</strong> — clear space, color, and approved shield usage. Reference art is alongside it:' +
        replyChips([
          { node: fileByName('Trademark Use Guide'), label: 'Download brand standards' },
          { node: fileByName('Shield Examples'), label: 'Download shield examples' },
        ]);
    case 'social':
      return 'Opened the <strong>Social Media Toolkit</strong> — post packs plus the instructions PDF. Start here:' +
        replyChips([
          { node: fileByName('Social Media Toolkit.pdf'), label: 'Download instructions', icon: 'download' },
          { node: folderByName('Post 1'), act: 'open', label: 'Open Post 1' },
          { node: folderByName('Post 2'), act: 'open', label: 'Open Post 2' },
        ]);
    case 'email_sms':
      return 'Opened the <strong>WISEcode Email-SMS Toolkit</strong> — ready-made banners and headers in multiple sizes. Pull one:' +
        replyChips([
          { node: fileByName('Email SMS Toolkit.pdf'), label: 'Download instructions', icon: 'download' },
          { node: fileByName('Banner 1080x1080'), label: 'Download 1080\u00d71080 banner' },
          { node: fileByName('Banner 1920x1080'), label: 'Download 1920\u00d71080 banner' },
          { node: folderByName('Email Header'), act: 'open', label: 'Open headers' },
        ]);
    case 'packaging':
      return 'Opened <strong>Packaging Resources</strong> — the shield examples and the trademark / brand-standards guide for getting the mark onto packaging correctly:' +
        replyChips([
          { node: fileByName('Trademark Use Guide'), label: 'Download brand standards' },
          { node: fileByName('Shield Examples'), label: 'Download shield examples' },
        ]);
    case 'expand_all':
      return 'Expanded the whole library so you can see every toolkit, folder and file at once. Click a column header to sort by name, size, or date, or search to jump straight to a file.';
    default:
      return '';
  }
}

/* ------------------------------------------------------------------ */
/* Wiring                                                              */
/* ------------------------------------------------------------------ */

function allFolderPaths() {
  const out = [];
  (function walk(node) {
    if (node.type === 'folder') {
      if (node !== TREE) out.push(node._path);
      node.children.forEach(walk);
    }
  })(TREE);
  return out;
}

function repaint(host) {
  const table = host.querySelector('#ma-root-table');
  if (table) {
    const thead = table.querySelector('.ma-thead');
    const tbody = table.querySelector('.ma-tbody');
    if (thead) thead.outerHTML = renderThead();
    if (tbody) tbody.innerHTML = renderRows(visibleChildren(TREE));
  }
  syncExpandLabel(host);
  syncFilterUi(host);
  updateSearchMeta(host);
}

function toggleSort(key) {
  if (state.sortKey === key) state.sortDir *= -1;
  else { state.sortKey = key; state.sortDir = 1; }
}

function setFilterOpen(host, open) {
  state.filterOpen = open;
  const pop = host.querySelector('#ma-filter-pop');
  if (pop) pop.hidden = !open;
  syncFilterUi(host);
}

function popOfRowMenu(menu) {
  if (!menu) return null;
  const inner = menu.querySelector('.ma-rowmenu-pop');
  if (inner) return inner;
  return Array.from(document.querySelectorAll('.ma-rowmenu-pop')).find((p) => p.__plHost === menu) || null;
}

function closeRowMenus(host, keep) {
  if (!host) return;
  host.querySelectorAll('.ma-rowmenu.is-open').forEach((menu) => {
    if (menu === keep) return;
    menu.classList.remove('is-open');
    const btn = menu.querySelector('.ma-rowmenu-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    const pop = popOfRowMenu(menu);
    if (pop) pop.hidden = true;
  });
}

function toggleFolder(host, path) {
  if (state.open.has(path)) state.open.delete(path);
  else state.open.add(path);
  repaint(host);
}

function syncFilterUi(host) {
  const btn = host.querySelector('#ma-filter-btn');
  if (btn) {
    btn.classList.toggle('has-filters', typeActive());
    btn.classList.toggle('is-active', state.filterOpen);
    btn.setAttribute('aria-expanded', String(state.filterOpen));
  }
  const chips = host.querySelector('#ma-filter-pop .ma-filter-chips[aria-label="Filter by file type"]');
  if (chips) chips.innerHTML = typeChipHtml();
}

/* Reflect the active type filter on the score cards (which one reads pressed). */
function syncScorecards(host) {
  host.querySelectorAll('.ma-scorecard').forEach((card) => {
    const t = card.dataset.type;
    const active = t === 'all' ? !state.typeFilter : state.typeFilter === t;
    card.classList.toggle('is-active', active);
    card.setAttribute('aria-pressed', String(active));
  });
}

/* Results line + clear button visibility, shown while a search OR type filter
   is active. Communicates how many assets survive the combined filter. */
function updateSearchMeta(host) {
  const meta = host.querySelector('#ma-search-meta');
  const clear = host.querySelector('#ma-search-clear');
  if (clear) clear.hidden = !searching();
  if (!meta) return;
  if (!filtering()) { meta.hidden = true; meta.textContent = ''; return; }

  const n = countMatches();
  const typeLabel = () => {
    const c = TYPE_CARDS.find((x) => x.key === state.typeFilter);
    return c ? c.label.toLowerCase() : 'files';
  };
  let scope;
  if (searching() && typeActive()) scope = `${typeLabel()} matching \u201c${esc(state.query.trim())}\u201d`;
  else if (searching()) scope = `match \u201c${esc(state.query.trim())}\u201d`;
  else scope = `in ${typeLabel()}`;

  meta.hidden = false;
  meta.innerHTML = n
    ? `<span class="material-symbols-outlined">filter_list</span>${n} asset${n === 1 ? '' : 's'} ${scope}`
    : `<span class="material-symbols-outlined">search_off</span>No assets ${scope}`;
}

function syncExpandLabel(host) {
  const total = allFolderPaths().length;
  const allOpen = total > 0 && state.open.size >= total;
  const label = host.querySelector('#ma-expand-label');
  const icon = host.querySelector('#ma-expand-toggle .material-symbols-outlined');
  if (label) label.textContent = allOpen ? 'Collapse all' : 'Expand all';
  if (icon) icon.textContent = allOpen ? 'unfold_less' : 'unfold_more';
}

export function renderMarketingAssets(host) {
  if (!host) return;
  host.innerHTML = renderShell();
  mountBrandSwitcher();
  wireBrandSwitcher();
  syncExpandLabel(host);
  syncScorecards(host);
  syncFilterUi(host);
  updateSearchMeta(host);
  if (!dateLeadBound && dc()) {
    dateLeadBound = true;
    dc().onLead(host, (lead, root) => {
      if (!host.querySelector('[data-ma-board]')) return;
      if (root && !host.contains(root)) return;
      state.dateLead = lead;
      repaint(host);
    });
  }

  /* Row + toolbar interactions. Event delegation stays live across nested
     table re-renders. Filter / sort handlers run first so a click inside the
     search pill or a column header never toggles a folder. */
  host.addEventListener('click', (e) => {
    const sortH = e.target.closest('[data-ma-sort]');
    if (sortH && !e.target.closest('.w-datemenu, .pf-datemenu')) {
      e.stopPropagation();
      toggleSort(sortH.dataset.maSort);
      repaint(host);
      return;
    }
    const filterBtn = e.target.closest('#ma-filter-btn');
    if (filterBtn) {
      e.stopPropagation();
      setFilterOpen(host, !state.filterOpen);
      return;
    }
    const filterDone = e.target.closest('#ma-filter-done');
    if (filterDone) {
      e.stopPropagation();
      setFilterOpen(host, false);
      return;
    }
    const filterClear = e.target.closest('#ma-filter-clear');
    if (filterClear) {
      e.stopPropagation();
      state.typeFilter = null;
      syncScorecards(host);
      repaint(host);
      return;
    }
    const typeChip = e.target.closest('[data-ma-type]');
    if (typeChip) {
      e.stopPropagation();
      const type = typeChip.dataset.maType;
      state.typeFilter = (type === 'all' || state.typeFilter === type) ? null : type;
      syncScorecards(host);
      repaint(host);
      return;
    }
    const expandBtn = e.target.closest('#ma-expand-toggle');
    if (expandBtn) {
      e.stopPropagation();
      const all = allFolderPaths();
      if (state.open.size >= all.length) state.open.clear();
      else all.forEach((p) => state.open.add(p));
      repaint(host);
      return;
    }
    const menuBtn = e.target.closest('.ma-rowmenu-btn');
    if (menuBtn) {
      e.stopPropagation();
      const menu = menuBtn.closest('.ma-rowmenu');
      const open = !menu.classList.contains('is-open');
      closeRowMenus(host, open ? menu : null);
      menu.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      const pop = popOfRowMenu(menu);
      if (pop) pop.hidden = !open;
      return;
    }
    const menuAct = e.target.closest('[data-ma-act]');
    if (menuAct) {
      e.stopPropagation();
      closeRowMenus(host, null);
      const node = NODE_BY_PATH.get(menuAct.dataset.maPath);
      const act = menuAct.dataset.maAct;
      if (act === 'preview' && node) openPreview(node);
      else if (act === 'download' && node) download(node);
      else if ((act === 'expand' || act === 'collapse') && node) toggleFolder(host, node._path);
      return;
    }
    if (e.target.closest('.ma-rowmenu') || e.target.closest('.ma-rowmenu-pop')) {
      e.stopPropagation();
      return;
    }
    const folderRow = e.target.closest('.ma-row--folder');
    if (folderRow) toggleFolder(host, folderRow.dataset.folder);
  });

  host.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const sortH = e.target.closest('[data-ma-sort]');
    if (sortH && !e.target.closest('.w-datemenu, .pf-datemenu')) {
      e.preventDefault();
      toggleSort(sortH.dataset.maSort);
      repaint(host);
      return;
    }
    if (e.target.closest('.ma-rowmenu')) return;
    const folderRow = e.target.closest('.ma-row--folder');
    if (!folderRow) return;
    e.preventDefault();
    toggleFolder(host, folderRow.dataset.folder);
  });

  /* Score cards — click one to scope the table to that file type; click the
     active card again (or "All assets") to clear back to the full library. */
  const scorecards = host.querySelector('.ma-scorecards');
  if (scorecards) scorecards.addEventListener('click', (e) => {
    const card = e.target.closest('.ma-scorecard');
    if (!card) return;
    const type = card.dataset.type;
    state.typeFilter = (type === 'all' || state.typeFilter === type) ? null : type;
    syncScorecards(host);
    repaint(host);
  });

  /* Search — filters every name in the tree as you type, auto-revealing hits
     inside their nested tables (mirrors the portfolio search field). */
  const search = host.querySelector('#ma-search');
  if (search) {
    search.addEventListener('input', () => { state.query = search.value; repaint(host); });
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && search.value) { e.stopPropagation(); search.value = ''; state.query = ''; repaint(host); }
    });
  }
  const searchClear = host.querySelector('#ma-search-clear');
  if (searchClear) searchClear.addEventListener('click', () => {
    state.query = '';
    if (search) { search.value = ''; search.focus(); }
    repaint(host);
  });

  /* Expose the intent + reply hooks so the WISEcodeAI dock drives real actions in
     this module (open a toolkit, grab the shield, expand everything) AND so its
     replies can carry contextual download/open chips right in the thread. */
  activeHost = host;
  window.__wiseMarketingIntent = (intent) => handleMarketingIntent(host, intent);
  window.__wiseMarketingReply = (intent) => marketingReply(intent);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (host.querySelector('.ma-rowmenu.is-open')) { closeRowMenus(host, null); return; }
    if (state.filterOpen) { setFilterOpen(host, false); return; }
    closePreview();
  });
}

/* The WISEcodeAI dock lives in a separate part of the document (not inside `host`),
   so the follow-up chips in its replies are wired with a single document-level
   delegate. Registered once; it always targets the most recently rendered host. */
let activeHost = null;
if (typeof document !== 'undefined' && !window.__maReplyChipsWired) {
  window.__maReplyChipsWired = true;
  document.addEventListener('click', (e) => {
    if (state.filterOpen && activeHost && !e.target.closest('.ma-search-inline')) {
      setFilterOpen(activeHost, false);
    }
    if (activeHost && !e.target.closest('.ma-rowmenu') && !e.target.closest('.ma-rowmenu-pop')) closeRowMenus(activeHost, null);
    const chip = e.target.closest('.ma-do-chip[data-ma-do]');
    if (!chip) return;
    e.preventDefault();
    const act = chip.dataset.maDo;
    const node = chip.dataset.maPath ? NODE_BY_PATH.get(chip.dataset.maPath) : null;
    if (act === 'expand_all') { handleMarketingIntent(activeHost, 'expand_all'); return; }
    if (!node) return;
    if (act === 'preview') openPreview(node);
    else if (act === 'open') openAndReveal(activeHost, node);
    else download(node);
  });
}
