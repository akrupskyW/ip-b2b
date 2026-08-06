/**
 * Non-UPF Verification Dashboard — WISEcode Admin module.
 *
 * Rendered into #agent-main-scroll on non-upf-dashboard.html, paired with the
 * WISEai dock. Mirrors the analytics-types.html chart language (custom SVG
 * donut, a vertical processing-spectrum bar chart, and a verification-status
 * progress list) over a filterable product table. Uses the shared,
 * token-driven `adm-*` component set from wise.css.
 */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* Token-tracking chart colors (resolved live so they follow light/dark). */
function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
const GREEN = () => cssVar('--sec-green', '#32A966');
const RED = () => cssVar('--sec-red', '#DC3038');
const AMBER = () => cssVar('--ter-amber', '#FFC434');
const BLUE = () => cssVar('--primary', '#25507C');
/* The two intermediate tiers of the canonical five-status palette (mirrors the
   C palette in js/dashboard-home.js): a lighter "Good" green and a "Fair"
   orange, so the processing spectrum runs green → light-green → amber → orange
   → red, worst-to-best like every other status chart in the app. */
const GREEN_LIGHT = () => '#7DC470';
const ORANGE = () => '#D27326';

/* ---- Portfolio split (donut) ---------------------------------------- */
const PORTFOLIO = { nonUpf: 9, upf: 3 };

/* ---- Processing spectrum (vertical bars) ---------------------------- */
const SPECTRUM = [
  { label: 'Minimally Processed',   value: 5, color: () => GREEN() },
  { label: 'Lightly Processed',     value: 2, color: () => GREEN_LIGHT() },
  { label: 'Moderately Processed',  value: 2, color: () => AMBER() },
  { label: 'Ultra-Processed',       value: 2, color: () => ORANGE() },
  { label: 'Super Ultra-Processed', value: 1, color: () => RED() },
];

/* ---- Verification-status progress list + filter tiles --------------- */
const STATUSES = [
  { key: 'pre_qualified', label: 'Pre-Qualified',        num: 0,  icon: 'task_alt',       color: () => GREEN(), sub: 'Meets criteria, ready to verify' },
  { key: 'action',        label: 'Action Required',      num: 10, icon: 'warning',        color: () => RED(),   sub: 'Missing mandatory data', action: 'Edit' },
  { key: 'pending_att',   label: 'Pending Attestation',  num: 19, icon: 'fact_check',     color: () => BLUE(),  sub: 'Selected products need review and attestation', action: 'Attest' },
  { key: 'att_complete',  label: 'Attestation Complete', num: 2,  icon: 'verified_user',  color: () => BLUE(),  sub: 'Attested, ready for payment', action: 'Pay' },
  { key: 'pending_pay',   label: 'Pending Payment',      num: 0,  icon: 'payments',       color: () => AMBER(), sub: 'Invoice sent, awaiting payment' },
  { key: 'ineligible',    label: 'Ineligible',           num: 51, icon: 'do_not_disturb', color: () => AMBER(), sub: 'Does not meet criteria', action: 'Edit' },
  { key: 'verified',      label: 'Verified',             num: 8,  icon: 'verified',       color: () => GREEN(), sub: 'Fully verified (shield verification)' },
];
const TOTAL_PRODUCTS = 90;

/* ---- Product table -------------------------------------------------- */
const UPF_CHIP = { upf: { cls: 'adm-chip--red', label: 'UPF' }, nonupf: { cls: 'adm-chip--green', label: 'Non-UPF' } };
const PROD_STATUS = {
  ineligible:  { cls: 'adm-chip--amber', icon: 'do_not_disturb', label: 'Ineligible' },
  action:      { cls: 'adm-chip--red',   icon: 'warning',        label: 'Action Required' },
  verified:    { cls: 'adm-chip--green', icon: 'verified',       label: 'Verified' },
  pending_att: { cls: 'adm-chip--blue',  icon: 'fact_check',     label: 'Pending Attestation' },
};
const IMG = '../assets/verification/';
const PRODUCTS = [
  { name: 'Powdered Vitamin Eggs', upc: '818491020984', upf: 'nonupf', status: 'verified', updated: 'May 22, 2026', time: '8:12 AM', img: IMG + 'ns-powdered-vitamin-eggs.png', icon: 'egg' },
  { name: 'Instant Vitamin Potato', upc: '818491021820', upf: 'nonupf', status: 'pending_att', updated: 'May 21, 2026', time: '3:04 PM', img: IMG + 'ns-powdered-vitamin-potato.png', icon: 'nutrition' },
  { name: 'Powdered Vitamin Milk', upc: '818491021226', upf: 'nonupf', status: 'verified', updated: 'May 20, 2026', time: '2:41 PM', img: IMG + 'ns-powdered-vitamin-milk.png', icon: 'water_drop' },
  { name: 'Protein Cereal — Chocolate', upc: '818491021332', upf: 'upf', status: 'action', updated: 'May 19, 2026', time: '11:03 AM', img: IMG + 'ns-protein-cereal-chocolate.png', icon: 'grain' },
  { name: 'Powdered Vitamin Butter', upc: '818491021097', upf: 'nonupf', status: 'verified', updated: 'May 18, 2026', time: '9:20 AM', img: IMG + 'ns-powdered-vitamin-butter.png', icon: 'blender' },
  { name: 'Homestyle Scramble — Protein Meal', upc: '818491021554', upf: 'nonupf', status: 'pending_att', updated: 'May 17, 2026', time: '4:55 PM', img: IMG + 'ns-homestyle-scramble.png', icon: 'egg_alt' },
  { name: 'Triple Cheese Mac — Protein Meal', upc: '818491021561', upf: 'upf', status: 'ineligible', updated: 'May 16, 2026', time: '1:08 PM', img: IMG + 'ns-triple-cheese-mac.png', icon: 'ramen_dining' },
  { name: 'Freeze-Dried Mixed Vegetables', upc: '818491021905', upf: 'upf', status: 'ineligible', updated: 'May 15, 2026', time: '10:30 AM', img: IMG + 'ns-freeze-dried-mixed-vegetables.png', icon: 'eco' },
];

/* Colored-chip class per verification stat — mirrors the in-chat intent chips
   so the scorecards carry a filled pill instead of a bare icon + label. */
const STAT_CHIP = {
  '': 'adm-chip--blue',
  pre_qualified: 'adm-chip--green',
  action: 'adm-chip--red',
  pending_att: 'adm-chip--blue',
  att_complete: 'adm-chip--blue',
  pending_pay: 'adm-chip--amber',
  ineligible: 'adm-chip--amber',
  verified: 'adm-chip--green',
};

/* Sortable table columns. UPC now lives under the product name, so it is not a
   column of its own — but products stay searchable/sortable by every field. */
const COLS = [
  { key: 'name',    label: 'Product Name',  sortable: true,  value: (p) => p.name.toLowerCase(), type: 'text' },
  { key: 'upf',     label: 'Verification',  sortable: true,  value: (p) => UPF_CHIP[p.upf].label, type: 'text' },
  { key: 'status',  label: 'Status',        sortable: true,  value: (p) => PROD_STATUS[p.status].label, type: 'text' },
  { key: 'updated', label: 'Updated Last',  sortable: true,  value: (p) => Date.parse(`${p.updated} ${p.time}`) || 0, type: 'num' },
  { key: 'actions', label: 'Actions',       sortable: false, end: true },
];
const ARROW_SVG = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 9.5V2.5M3 6.5L6 9.5l3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const FILTERS = {
  brand:  { label: 'Brand',               opts: ['All Brands', 'Nutrient Survival', 'Flax4Life', 'Goodles'] },
  status: { label: 'Verification Status', opts: ['All', 'Ineligible', 'Action Required', 'Pending Attestation', 'Verified'] },
  list:   { label: 'Ingredient List',     opts: ['All', 'Complete', 'Incomplete'] },
};
const FILTER_DEFAULTS = { brand: 'All Brands', status: 'All', list: 'All' };

let hostEl = null;
let query = '';
let filters = { ...FILTER_DEFAULTS };
let sortKey = null, sortDir = 1;
let filterOpen = false;
let docListenersBound = false;

let chatApi = null;
export function setNonUpfChat(api) { chatApi = api; }
function pushChat(html) { if (chatApi && html) { chatApi.hideWelcome?.(); chatApi.addWISEai(html); } }

function toast(msg, icon = 'check_circle') {
  let wrap = document.getElementById('adm-toast-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.id = 'adm-toast-wrap'; document.body.appendChild(wrap); }
  const t = document.createElement('div');
  t.className = 'adm-toast';
  t.innerHTML = `<span class="material-icons">${esc(icon)}</span><span>${esc(msg)}</span>`;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('is-in'));
  setTimeout(() => { t.classList.remove('is-in'); setTimeout(() => t.remove(), 260); }, 2600);
}

/* ==================================================================== */
/* Charts                                                               */
/* ==================================================================== */

/* Segmented donut — ported from the shared dashboard donut (js/dashboard-home.js)
   so the design + entrance animation match analytics-types / overview exactly.
   Slices are rounded annular-sector <path>s (not thin strokes) that sweep around
   the ring on mount (see sweepDonut in animateCharts). */
function polarPt(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
}

/* Annular-sector path with gently rounded corners — a softer end than a fully
   round stroke cap. `cr` is the corner radius, clamped so it never exceeds the
   slice's radial or angular room. */
function roundedSector(cx, cy, ri, ro, a0, a1, cr) {
  const spanRad = ((a1 - a0) * Math.PI) / 180;
  const r = Math.max(0, Math.min(cr, (ro - ri) / 2, (ri * spanRad) / 2));
  const offO = (r / ro) * (180 / Math.PI);
  const offI = (r / ri) * (180 / Math.PI);
  const big = a1 - offO - (a0 + offO) > 180 ? 1 : 0;
  const P = (rad, deg) => polarPt(cx, cy, rad, deg);
  return [
    `M ${P(ro, a0 + offO)}`,
    `A ${ro} ${ro} 0 ${big} 1 ${P(ro, a1 - offO)}`,
    `A ${r} ${r} 0 0 1 ${P(ro - r, a1)}`,
    `L ${P(ri + r, a1)}`,
    `A ${r} ${r} 0 0 1 ${P(ri, a1 - offI)}`,
    `A ${ri} ${ri} 0 ${big} 0 ${P(ri, a0 + offI)}`,
    `A ${r} ${r} 0 0 1 ${P(ri + r, a0)}`,
    `L ${P(ro - r, a0)}`,
    `A ${r} ${r} 0 0 1 ${P(ro, a0 + offO)}`,
    'Z',
  ].join(' ');
}

function donutRing(parts, cx, cy, r, sw, gapPx) {
  const circ = 2 * Math.PI * r;
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const ro = r + sw / 2;
  const ri = r - sw / 2;
  const gapDeg = (gapPx / circ) * 360;
  const minDeg = (4 / circ) * 360; /* floor so a tiny sliver still shows */
  const cr = 7;
  let acc = 0;
  return parts
    .filter((p) => p.value > 0)
    .map((p) => {
      const startDeg = (acc / total) * 360;
      const endDeg = ((acc + p.value) / total) * 360;
      acc += p.value;
      let a0 = startDeg + gapDeg / 2;
      let a1 = endDeg - gapDeg / 2;
      if (a1 - a0 < minDeg) {
        const mid = (startDeg + endDeg) / 2;
        a0 = mid - minDeg / 2;
        a1 = mid + minDeg / 2;
      }
      const pct = Math.round((p.value / total) * 100);
      const d = roundedSector(cx, cy, ri, ro, a0, a1, cr);
      return `<path class="adm-donut-arc" d="" data-full-d="${esc(d)}" data-a0="${a0}" data-a1="${a1}" data-ri="${ri}" data-ro="${ro}" data-cr="${cr}" data-cx="${cx}" data-cy="${cy}" fill="${p.color}" data-label="${esc(p.label)}" data-value="${p.value}" data-pct="${pct}"></path>`;
    })
    .join('');
}

function donutCard() {
  const total = PORTFOLIO.nonUpf + PORTFOLIO.upf;
  const pct = Math.round((PORTFOLIO.nonUpf / total) * 100);
  const parts = [
    { label: 'NON-UPF', value: PORTFOLIO.nonUpf, color: GREEN() },
    { label: 'UPF', value: PORTFOLIO.upf, color: RED() },
  ];
  return `
    <div class="adm-chart-card">
      <h3 class="adm-chart-title">Non-UPF Portfolio</h3>
      <div class="adm-chart-body">
        <div class="adm-donut-wrap">
          <div class="adm-donut">
            <svg class="adm-donut-svg" viewBox="0 0 300 300" role="img" aria-label="Non-UPF portfolio split">
              <g transform="rotate(-90 150 150)">${donutRing(parts, 150, 150, 124, 26, 11)}</g>
            </svg>
            <div class="adm-donut-center">
              <span class="adm-donut-num" data-count-to="${pct}">0%</span>
              <span class="adm-donut-label">Non-UPF</span>
              <span class="adm-donut-sub">${PORTFOLIO.nonUpf} of ${total} products</span>
            </div>
          </div>
        </div>
        <div class="adm-legend">
          <div class="adm-legend-row"><span class="adm-legend-dot" style="background:${GREEN()}"></span><span class="adm-legend-label">NON-UPF</span><span class="adm-legend-val">${PORTFOLIO.nonUpf}</span></div>
          <div class="adm-legend-row"><span class="adm-legend-dot" style="background:${RED()}"></span><span class="adm-legend-label">UPF</span><span class="adm-legend-val">${PORTFOLIO.upf}</span></div>
        </div>
      </div>
    </div>`;
}

function barsCard() {
  const total = SPECTRUM.reduce((a, s) => a + s.value, 0);
  const max = Math.max(...SPECTRUM.map((s) => s.value)) || 1;
  const bars = SPECTRUM.map((s) => {
    const h = Math.round((s.value / max) * 100);
    return `
      <div class="adm-bar">
        <div class="adm-bar-track">
          <div class="adm-bar-fill" style="height:0;background:${s.color()}" data-h="${h}"><span class="adm-bar-val">${s.value}</span></div>
        </div>
        <span class="adm-bar-label">${esc(s.label)}</span>
      </div>`;
  }).join('');
  return `
    <div class="adm-chart-card">
      <h3 class="adm-chart-title">WISEcode UPFs <span style="font-family:'Noto Serif',Georgia,serif;color:var(--text-subtle);font-weight:700">${total}</span></h3>
      <div class="adm-chart-body"><div class="adm-bars">${bars}</div></div>
    </div>`;
}

function statusListCard() {
  const max = Math.max(...STATUSES.map((s) => s.num)) || 1;
  const rows = STATUSES.map((s) => {
    const w = Math.round((s.num / max) * 100);
    return `
      <div class="adm-vrow">
        <span class="material-icons adm-vrow-ic" style="color:${s.color()}">${esc(s.icon)}</span>
        <div class="adm-vrow-main">
          <div class="adm-vrow-label">${esc(s.label)}</div>
          <div class="adm-vrow-bar"><span style="width:0;background:${s.color()}" data-w="${w}"></span></div>
        </div>
        <span class="adm-vrow-val">${s.num}</span>
      </div>`;
  }).join('');
  return `
    <div class="adm-chart-card">
      <h3 class="adm-chart-title">Verification Status</h3>
      <div class="adm-chart-body"><div class="adm-vstatus">${rows}</div></div>
    </div>`;
}

/* Big stat-card row beneath the charts. */
function statCardsHtml() {
  const cards = [
    { key: null, num: TOTAL_PRODUCTS, icon: 'inventory_2', label: 'Products', sub: 'Items in Registry', primary: true },
    ...STATUSES.map((s) => ({
      key: s.key, num: s.num, icon: s.icon, label: s.label, sub: s.sub, action: s.action,
      accent: s.key === 'action' ? 'adm-stat--red' : s.key === 'ineligible' ? 'adm-stat--amber' : s.key === 'verified' ? 'adm-stat--blue' : s.key === 'pre_qualified' ? 'adm-stat--green' : '',
    })),
  ];
  return cards.map((c) => {
    const chipCls = STAT_CHIP[c.key == null ? '' : c.key] || 'adm-chip--muted';
    return `
    <div class="adm-vf-stat${c.primary ? ' is-active' : ''}${c.accent ? ' ' + c.accent : ''}" data-adm-vf="${c.key == null ? '' : esc(c.key)}" role="button" tabindex="0">
      <span class="adm-vf-stat-num" style="${c.key === 'action' ? 'color:var(--sec-red)' : c.key === 'ineligible' ? 'color:var(--ter-amber-text)' : c.key === 'pending_att' || c.key === 'att_complete' ? 'color:var(--primary)' : c.key === 'pre_qualified' || c.key === 'verified' ? 'color:var(--sec-green)' : ''}">${c.num}</span>
      <span class="adm-vf-stat-chipwrap"><span class="adm-chip ${chipCls}"><span class="material-icons">${esc(c.icon)}</span>${esc(c.label)}</span></span>
      <span class="adm-vf-stat-sub">${esc(c.sub)}</span>
      ${c.action ? `<button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" data-adm-action="${esc(c.action.toLowerCase())}">${esc(c.action)}</button>` : ''}
    </div>`;
  }).join('');
}

/* ---- Product table -------------------------------------------------- */
const GRID_COLS = 'minmax(220px, 2.4fr) 150px 190px 160px 88px';

function theadHtml() {
  return COLS.map((c) => {
    const cls = `adm-th${c.end ? ' adm-th--end' : ''}`;
    if (!c.sortable) return `<span class="${cls}">${esc(c.label)}</span>`;
    const active = c.key === sortKey;
    const dir = active ? ` data-adm-dir="${sortDir === 1 ? 'asc' : 'desc'}"` : '';
    return `<span class="${cls} adm-th--sortable" role="button" tabindex="0" data-adm-sort="${esc(c.key)}"${dir}>${esc(c.label)}<span class="adm-sort-arrow">${ARROW_SVG}</span></span>`;
  }).join('');
}

function thumbHtml(p) {
  return `<span class="adm-avatar adm-avatar--round adm-avatar--photo adm-avatar--lg">` +
    `<img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'">` +
    `<span class="material-icons" style="display:none;font-size:18px">${esc(p.icon || 'lunch_dining')}</span></span>`;
}

function productRow(p) {
  const upf = UPF_CHIP[p.upf];
  const st = PROD_STATUS[p.status];
  return `
    <div class="adm-trow" data-adm-prow="${esc(p.upc)}" data-adm-pstatus="${esc(p.status)}" data-adm-pupf="${esc(p.upf)}">
      <span class="adm-td"><span class="adm-idcell">${thumbHtml(p)}<span class="adm-idcell-body"><span class="adm-idcell-name"><a href="#" data-adm-action="open-product" data-adm-upc="${esc(p.upc)}">${esc(p.name)}</a></span><span class="adm-idcell-sub" style="font-family:'SF Mono',ui-monospace,Menlo,monospace">UPC · ${esc(p.upc)}</span></span></span></span>
      <span class="adm-td"><span class="adm-chip ${upf.cls}">${esc(upf.label)}</span></span>
      <span class="adm-td"><span class="adm-chip ${st.cls}"><span class="material-icons">${esc(st.icon)}</span>${esc(st.label)}</span></span>
      <span class="adm-td"><span class="adm-idcell-body"><span style="font-weight:600;font-size:0.82rem">${esc(p.updated)}</span><span class="adm-idcell-sub">${esc(p.time)}</span></span></span>
      <span class="adm-td adm-td--end"><span class="adm-actions"><button type="button" class="adm-icon-btn" title="Manage product" aria-haspopup="menu" data-adm-action="manage-product" data-adm-upc="${esc(p.upc)}"><span class="material-icons">more_horiz</span></button></span></span>
    </div>`;
}

function orderedProducts() {
  if (!sortKey) return PRODUCTS.slice();
  const col = COLS.find((c) => c.key === sortKey);
  if (!col || !col.value) return PRODUCTS.slice();
  const idx = PRODUCTS.map((p, i) => ({ p, i }));
  idx.sort((a, b) => {
    const av = col.value(a.p), bv = col.value(b.p);
    const r = col.type === 'text' ? String(av).localeCompare(String(bv), undefined, { numeric: true }) : (av - bv);
    return (r * sortDir) || (a.i - b.i);
  });
  return idx.map((x) => x.p);
}

function productMatches(p) {
  if (query && !`${p.name} ${p.upc}`.toLowerCase().includes(query)) return false;
  const smap = { 'Ineligible': 'ineligible', 'Action Required': 'action', 'Pending Attestation': 'pending_att', 'Verified': 'verified' };
  if (filters.status !== 'All' && p.status !== smap[filters.status]) return false;
  return true;
}

function activeFilterCount() {
  return Object.keys(FILTER_DEFAULTS).filter((k) => filters[k] !== FILTER_DEFAULTS[k]).length;
}

function selectHtml(key) {
  const f = FILTERS[key];
  return `
    <div class="adm-field">
      <label class="adm-field-label">${esc(f.label)}</label>
      <select class="adm-select" data-adm-filter="${key}" aria-label="${esc(f.label)}">${f.opts.map((o) => `<option${o === filters[key] ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>
    </div>`;
}

function filterPopHtml() {
  return `
    <div class="adm-filter-pop"${filterOpen ? '' : ' hidden'} data-adm-filter-pop>
      ${selectHtml('brand')}
      ${selectHtml('status')}
      ${selectHtml('list')}
      <div class="adm-filter-pop-foot">
        <button type="button" class="adm-filter-clear" data-adm-action="clear-filters">Clear all</button>
        <button type="button" class="adm-btn adm-btn--primary adm-btn--sm" data-adm-action="apply-filters">Done</button>
      </div>
    </div>`;
}

function paint() {
  if (!hostEl) return;
  hostEl.innerHTML = `
    <div class="adm-wrap adm-wrap--wide">
      <header class="adm-head">
        <div class="adm-head-row">
          <div>
            <h1 class="adm-title">Your Non-UPF Verification Dashboard</h1>
          </div>
          <div class="adm-head-actions">
            <a class="adm-btn adm-btn--ghost" href="invoices.html"><span class="material-icons">receipt_long</span>View invoices</a>
            <button type="button" class="adm-btn adm-btn--primary" data-adm-action="export"><span class="material-icons">download</span>Export</button>
          </div>
        </div>
      </header>

      <div class="adm-toolbar">
        <div class="adm-search-inline has-filter">
          <span class="material-icons">search</span>
          <input type="text" class="adm-search" data-adm-search placeholder="Search products by name or brand" aria-label="Search products" value="${esc(query)}" />
          <button type="button" class="adm-search-filter${activeFilterCount() ? ' has-dot' : ''}${filterOpen ? ' is-active' : ''}" data-adm-action="toggle-filters" aria-haspopup="true" aria-expanded="${filterOpen}" title="Filters"><span class="material-icons">tune</span></button>
          ${filterPopHtml()}
        </div>
      </div>

      <div class="adm-chart-grid">
        ${donutCard()}
        ${barsCard()}
        ${statusListCard()}
      </div>

      <div class="adm-vf-stats" style="margin-top:14px">${statCardsHtml()}</div>

      <div class="adm-card" style="margin-top:16px">
        <div class="adm-table-card">
          <div class="adm-table" style="--adm-cols:${GRID_COLS}">
            <div class="adm-thead">${theadHtml()}</div>
            <div data-adm-rows>${orderedProducts().map(productRow).join('')}</div>
            <div class="adm-table-foot"><span data-adm-foot></span></div>
          </div>
        </div>
      </div>
    </div>`;
  applyProductFilter();
  animateCharts();
}

function easeOutCubic(t) { return 1 - (1 - t) ** 3; }

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* Sweep each donut segment around the ring on entrance — the exact motion the
   shared dashboard donut uses (animateDonutSweep in js/dashboard-home.js). */
function sweepDonut(duration = 1400) {
  if (!hostEl) return;
  const arcs = hostEl.querySelectorAll('.adm-donut-arc');
  if (!arcs.length) return;
  if (prefersReducedMotion()) {
    arcs.forEach((arc) => arc.setAttribute('d', arc.getAttribute('data-full-d') || ''));
    return;
  }
  const start = performance.now();
  const tick = (now) => {
    const t = easeOutCubic(Math.min(1, (now - start) / duration));
    const sweep = t * 360;
    arcs.forEach((arc) => {
      const fullD = arc.getAttribute('data-full-d');
      const a0 = parseFloat(arc.dataset.a0);
      const a1 = parseFloat(arc.dataset.a1);
      if (!fullD || !Number.isFinite(a0) || !Number.isFinite(a1)) return;
      if (sweep <= a0) { arc.setAttribute('d', ''); return; }
      if (sweep >= a1) { arc.setAttribute('d', fullD); return; }
      arc.setAttribute('d', roundedSector(+arc.dataset.cx, +arc.dataset.cy, +arc.dataset.ri, +arc.dataset.ro, a0, sweep, +arc.dataset.cr));
    });
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* Count the center percentage up from 0, easing in sync with the ring sweep. */
function countUpDonut(duration = 1400) {
  if (!hostEl) return;
  const el = hostEl.querySelector('.adm-donut-num[data-count-to]');
  if (!el) return;
  const to = parseInt(el.dataset.countTo, 10);
  if (!Number.isFinite(to)) return;
  if (prefersReducedMotion()) { el.textContent = `${to}%`; return; }
  const start = performance.now();
  const tick = (now) => {
    const t = easeOutCubic(Math.min(1, (now - start) / duration));
    el.textContent = `${Math.round(to * t)}%`;
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = `${to}%`;
  };
  requestAnimationFrame(tick);
}

function animateCharts() {
  if (!hostEl) return;
  requestAnimationFrame(() => {
    sweepDonut();
    countUpDonut();
    hostEl.querySelectorAll('.adm-bar-fill[data-h]').forEach((b) => { b.style.height = b.dataset.h + '%'; });
    hostEl.querySelectorAll('.adm-vrow-bar span[data-w]').forEach((s) => { s.style.width = s.dataset.w + '%'; });
  });
}

/* Clicking a chart card replays its entrance animation — mirrors the
   click-to-replay on the shared dashboard charts (setupChartReplay). */
function replayCharts() {
  if (!hostEl) return;
  hostEl.querySelectorAll('.adm-donut-arc').forEach((arc) => arc.setAttribute('d', ''));
  hostEl.querySelectorAll('.adm-bar-fill[data-h]').forEach((b) => { b.style.height = '0'; });
  hostEl.querySelectorAll('.adm-vrow-bar span[data-w]').forEach((s) => { s.style.width = '0'; });
  const num = hostEl.querySelector('.adm-donut-num[data-count-to]');
  if (num) num.textContent = '0%';
  animateCharts();
}

function applyProductFilter() {
  if (!hostEl) return;
  let shown = 0;
  PRODUCTS.forEach((p) => {
    const row = hostEl.querySelector(`[data-adm-prow="${CSS.escape(p.upc)}"]`);
    if (!row) return;
    const ok = productMatches(p);
    row.classList.toggle('adm-row-hidden', !ok);
    if (ok) shown++;
  });
  const foot = hostEl.querySelector('[data-adm-foot]');
  if (foot) foot.textContent = `Showing ${shown} of ${TOTAL_PRODUCTS} products`;
  syncFilterUi();
}

/* Keep the in-search filter button (active state + "has changes" dot) and the
   popover selects in sync with the live filter state. */
function syncFilterUi() {
  const btn = hostEl?.querySelector('[data-adm-action="toggle-filters"]');
  if (btn) { btn.classList.toggle('has-dot', activeFilterCount() > 0); btn.classList.toggle('is-active', filterOpen); btn.setAttribute('aria-expanded', String(filterOpen)); }
  Object.keys(FILTER_DEFAULTS).forEach((k) => {
    const sel = hostEl?.querySelector(`[data-adm-filter="${k}"]`);
    if (sel && sel.value !== filters[k]) sel.value = filters[k];
  });
}

/* ---- Sorting -------------------------------------------------------- */
function applySort() {
  const rows = hostEl?.querySelector('[data-adm-rows]');
  if (rows) rows.innerHTML = orderedProducts().map(productRow).join('');
  const thead = hostEl?.querySelector('.adm-thead');
  if (thead) thead.innerHTML = theadHtml();
  applyProductFilter();
}
function toggleSort(key) {
  const col = COLS.find((c) => c.key === key);
  if (!col || !col.sortable) return;
  if (sortKey === key) sortDir = -sortDir; else { sortKey = key; sortDir = 1; }
  applySort();
}

/* ---- Filter popover ------------------------------------------------- */
function setFilterOpen(open) {
  filterOpen = open;
  const pop = hostEl?.querySelector('[data-adm-filter-pop]');
  if (pop) pop.hidden = !open;
  syncFilterUi();
}
function clearFilters() {
  filters = { ...FILTER_DEFAULTS };
  applyProductFilter();
}

/* ---- Row CRUD menu (portalled to <body>) ---------------------------- */
const MENU_ITEMS = [
  { action: 'open-product',   icon: 'open_in_new',    label: 'Open product' },
  { action: 'edit-product',   icon: 'edit',           label: 'Edit details' },
  { action: 'verify-product', icon: 'verified',       label: 'Re-run verification' },
  { action: 'duplicate-product', icon: 'content_copy', label: 'Duplicate' },
  { sep: true },
  { action: 'delete-product', icon: 'delete',         label: 'Delete product', danger: true },
];
let openMenuEl = null;
function closeRowMenu() {
  if (openMenuEl) { openMenuEl.remove(); openMenuEl = null; }
  document.removeEventListener('scroll', closeRowMenu, true);
  window.removeEventListener('resize', closeRowMenu);
}
function openRowMenu(btn, upc) {
  closeRowMenu();
  const menu = document.createElement('div');
  menu.className = 'adm-menu';
  menu.setAttribute('role', 'menu');
  menu.innerHTML = MENU_ITEMS.map((it) => it.sep
    ? '<div class="adm-menu-sep"></div>'
    : `<button type="button" role="menuitem" class="adm-menu-item${it.danger ? ' adm-menu-item--danger' : ''}" data-adm-menu-action="${it.action}" data-adm-upc="${esc(upc)}"><span class="material-icons">${it.icon}</span>${esc(it.label)}</button>`
  ).join('');
  document.body.appendChild(menu);
  const r = btn.getBoundingClientRect();
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  let left = r.right - mw;
  let top = r.bottom + 6;
  if (left < 8) left = 8;
  if (top + mh > window.innerHeight - 8) top = r.top - mh - 6;
  menu.style.left = `${Math.round(left)}px`;
  menu.style.top = `${Math.round(Math.max(8, top))}px`;
  openMenuEl = menu;
  menu.addEventListener('click', (e) => {
    const item = e.target.closest('[data-adm-menu-action]');
    if (!item) return;
    const action = item.dataset.admMenuAction;
    const ctx = item.dataset.admUpc || '';
    closeRowMenu();
    runAction(action, ctx);
  });
  document.addEventListener('scroll', closeRowMenu, true);
  window.addEventListener('resize', closeRowMenu);
}

/* Map a verification stat tile → the product-table status filter. */
export function setNonUpfStatus(statusKey) {
  const map = { action: 'Action Required', ineligible: 'Ineligible', verified: 'Verified', pending_att: 'Pending Attestation' };
  filters.status = map[statusKey] || 'All';
  const sel = hostEl?.querySelector('[data-adm-filter="status"]');
  if (sel) sel.value = filters.status;
  hostEl?.querySelectorAll('[data-adm-vf]').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.admVf === (statusKey || '') || (!statusKey && el.dataset.admVf === ''));
  });
  applyProductFilter();
  hostEl?.querySelector('.adm-table')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function productName(upc) { return (PRODUCTS.find((p) => p.upc === upc) || {}).name || `product ${upc}`; }

function runAction(action, ctx) {
  switch (action) {
    case 'export': toast('Exporting dashboard', 'download'); pushChat('Exporting your <strong>Non-UPF verification dashboard</strong> — portfolio split, processing spectrum, and product statuses.'); break;
    case 'edit': toast('Fixing action-required products', 'edit'); pushChat('Opening the <strong>10 products that need attention</strong> — each is missing mandatory data before it can be verified.'); setNonUpfStatus('action'); break;
    case 'attest': toast('Opening attestation', 'fact_check'); pushChat('Starting attestation for the <strong>19 products</strong> pending review. I\u2019ll walk you through the required confirmations.'); setNonUpfStatus('pending_att'); break;
    case 'pay': toast('Opening payment', 'payments'); pushChat('Two products are <strong>attested and ready for payment</strong> — I\u2019ll take you to checkout to activate their shields.'); break;
    case 'toggle-filters': setFilterOpen(!filterOpen); break;
    case 'apply-filters': setFilterOpen(false); break;
    case 'clear-filters': clearFilters(); break;
    case 'open-product': toast(`Opening ${productName(ctx)}`, 'open_in_new'); pushChat(`Opening <strong>${esc(productName(ctx))}</strong> — full ingredient breakdown, processing spectrum, and verification history.`); break;
    case 'edit-product': toast(`Editing ${productName(ctx)}`, 'edit'); pushChat(`Editing <strong>${esc(productName(ctx))}</strong> — update product data, ingredients, or packaging before re-verifying.`); break;
    case 'verify-product': toast(`Re-running verification for ${productName(ctx)}`, 'verified'); pushChat(`Re-running Non-UPF verification for <strong>${esc(productName(ctx))}</strong>. I\u2019ll flag any ultra-processed ingredients.`); break;
    case 'duplicate-product': toast(`Duplicated ${productName(ctx)}`, 'content_copy'); break;
    case 'delete-product': toast(`Deleted ${productName(ctx)}`, 'delete'); pushChat(`Removed <strong>${esc(productName(ctx))}</strong> from the registry. Say <em>undo</em> to restore it.`); break;
    case 'manage-product': break;
    default: break;
  }
}

export function renderNonUpfDashboard(mainEl) {
  hostEl = mainEl;
  query = ''; filters = { ...FILTER_DEFAULTS }; sortKey = null; sortDir = 1; filterOpen = false;
  paint();

  mainEl.addEventListener('click', (e) => {
    const chartCard = e.target.closest('.adm-chart-card');
    if (chartCard) { replayCharts(); return; }
    const sortH = e.target.closest('[data-adm-sort]');
    if (sortH) { toggleSort(sortH.dataset.admSort); return; }
    const menuBtn = e.target.closest('[data-adm-action="manage-product"]');
    if (menuBtn) { e.preventDefault(); e.stopPropagation(); openRowMenu(menuBtn, menuBtn.dataset.admUpc || ''); return; }
    const vf = e.target.closest('[data-adm-vf]');
    if (vf && !e.target.closest('[data-adm-action]')) { const k = vf.dataset.admVf || null; const next = (k === filters._active) ? null : k; setNonUpfStatus(next); filters._active = next; return; }
    const act = e.target.closest('[data-adm-action]');
    if (act) { e.preventDefault(); runAction(act.dataset.admAction, act.dataset.admUpc || ''); return; }
  });
  mainEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const sortH = e.target.closest('[data-adm-sort]');
    if (sortH) { e.preventDefault(); toggleSort(sortH.dataset.admSort); return; }
    const vf = e.target.closest('[data-adm-vf]');
    if (vf) { e.preventDefault(); const k = vf.dataset.admVf || null; setNonUpfStatus(k); }
  });
  mainEl.addEventListener('input', (e) => {
    const s = e.target.closest('[data-adm-search]');
    if (s) { query = s.value.trim().toLowerCase(); applyProductFilter(); }
  });
  mainEl.addEventListener('change', (e) => {
    const sel = e.target.closest('[data-adm-filter]');
    if (sel) { filters[sel.dataset.admFilter] = sel.value; applyProductFilter(); }
  });

  /* Dismiss the filter popover / row menu on any outside click (attached once). */
  if (!docListenersBound) {
    docListenersBound = true;
    document.addEventListener('click', (e) => {
      if (filterOpen && !e.target.closest('.adm-search-inline')) setFilterOpen(false);
      if (openMenuEl && !e.target.closest('.adm-menu') && !e.target.closest('[data-adm-action="manage-product"]')) closeRowMenu();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setFilterOpen(false); closeRowMenu(); } });
  }
}

/* ==================================================================== */
export const NON_UPF_WISEAI = {
  sub: 'Ask about your Non-UPF portfolio, statuses, or what to verify next.',
  chipsFlow: 'wrap',
  /* Large "at a glance" cards shown alongside the small chips on the welcome
     screen — each reuses an existing intent so a click drives the same flow. */
  scorecards: {
    label: 'Your Non-UPF portfolio at a glance',
    cards: [
      { intent: 'action_required', icon: 'warning', iconTone: 'brand', pill: { tone: 'up', icon: 'priority_high', text: 'Do next' }, metric: '10', metricUnit: ' products', title: 'Need attention', desc: 'Each is missing mandatory data — I\u2019ll filter the table so you can fix them.', action: 'What needs attention?', ask: 'What needs attention?' },
      { intent: 'ready_to_attest', icon: 'fact_check', iconTone: 'brand', pill: { tone: 'up', icon: 'fact_check', text: 'Attest' }, metric: '19', metricUnit: ' pending', title: 'Ready to attest', desc: '19 pending attestation, 2 attested and ready for payment.', action: 'What\u2019s ready to attest?', ask: 'What\u2019s ready to attest?' },
      { intent: 'portfolio_split', icon: 'donut_large', iconTone: 'brand', pill: { tone: 'up', icon: 'insights', text: 'Overview' }, title: 'Your UPF split', desc: 'See the Non-UPF vs UPF breakdown across your whole portfolio.', action: 'What\u2019s my UPF split?', ask: 'What\u2019s my UPF split?' },
      { intent: 'verified', icon: 'verified', iconTone: 'brand', pill: { tone: 'up', icon: 'verified', text: 'Verified' }, title: 'Show verified products', desc: '8 products carrying the Non-UPF shield — filtered in one tap.', action: 'Show verified products', ask: 'Show verified products' },
      { intent: 'ineligible', icon: 'do_not_disturb', iconTone: 'brand', pill: { tone: 'up', icon: 'do_not_disturb', text: 'Review' }, title: 'Why are products ineligible?', desc: '51 products don\u2019t meet the Non-UPF criteria — see the specific flag.', action: 'Why ineligible?', ask: 'Why are products ineligible?' },
    ],
  },
  intents: [
    { intent: 'portfolio_split', label: 'What\u2019s my UPF split?',    icon: 'donut_large' },
    { intent: 'action_required', label: 'What needs attention?',    icon: 'warning' },
    { intent: 'ready_to_attest', label: 'What\u2019s ready to attest?', icon: 'fact_check' },
    { intent: 'verified',        label: 'Show verified products',   icon: 'verified' },
    { intent: 'ineligible',      label: 'Why are products ineligible?', icon: 'do_not_disturb' },
    { intent: 'export',          label: 'Export the dashboard',     icon: 'download' },
  ],
  intentReplies: {
    portfolio_split: () => `Your portfolio is <strong>${Math.round((PORTFOLIO.nonUpf / (PORTFOLIO.nonUpf + PORTFOLIO.upf)) * 100)}% Non-UPF</strong> — ${PORTFOLIO.nonUpf} Non-UPF products vs ${PORTFOLIO.upf} UPF. The processing spectrum shows most sit in the minimally-processed tier.`,
    action_required: () => 'You have <strong>10 products</strong> that need attention — each is missing mandatory data. I\u2019ve filtered the table so you can fix them.',
    ready_to_attest: () => 'There are <strong>19 products pending attestation</strong> and <strong>2 already attested</strong> and ready for payment.',
    verified:        () => 'You have <strong>8 verified products</strong> carrying the shield. I\u2019ve filtered the table to them.',
    ineligible:      () => '<strong>51 products are ineligible</strong> — they don\u2019t meet the Non-UPF criteria (usually an ultra-processed ingredient). Open one to see the specific flag.',
    export:          () => 'Exporting your <strong>Non-UPF verification dashboard</strong>.',
  },
  onIntent: (intent) => {
    switch (intent) {
      case 'action_required': setNonUpfStatus('action'); break;
      case 'ready_to_attest': setNonUpfStatus('pending_att'); break;
      case 'verified':        setNonUpfStatus('verified'); break;
      case 'ineligible':      setNonUpfStatus('ineligible'); break;
      case 'export':          toast('Exporting dashboard', 'download'); break;
      default: break;
    }
    return false;
  },
};
