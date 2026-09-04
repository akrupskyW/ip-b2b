import './date-column.js';
import { esc } from './escape-html.js';
import { ARROW_SVG } from './sort-arrow.js';
import { createToast } from './toast.js';
import { searchToolbarHTML } from './wise-toolbar.js';
import { openModal, closeModal, modalHTML } from './wise-modal.js';
import { createChatBridge } from './chat-bridge.js';
const toast = createToast('adm');

/**
 * Non-UPF Verification Dashboard — WISEcode Admin module.
 *
 * Rendered into #agent-main-scroll on non-upf-dashboard.html, paired with the
 * WISEcodeAI dock. Mirrors the analytics-types.html chart language (custom SVG
 * donut, a vertical processing-spectrum bar chart, and a verification-status
 * progress list) over a filterable product table. Uses the shared,
 * token-driven `adm-*` component set from wise.css.
 */

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
   C palette in js/dashboard-home.js). Read from --chart-status-* so Accessible
   colors can retune them off a second green / leftover orange. */
const GREEN_LIGHT = () => cssVar('--chart-status-good', '#7DC470');
const ORANGE = () => cssVar('--chart-status-fair', '#D27326');

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
  { key: 'actions', label: 'Actions',       sortable: false },
  { key: 'name',    label: 'Product Name',  sortable: true,  value: (p) => p.name.toLowerCase(), type: 'text' },
  { key: 'upf',     label: 'Verification',  sortable: true,  value: (p) => UPF_CHIP[p.upf].label, type: 'text' },
  { key: 'status',  label: 'Status',        sortable: true,  value: (p) => PROD_STATUS[p.status].label, type: 'text' },
  { key: 'updated', label: 'Updated Last',  sortable: true,  value: (p) => (dc() ? dc().sortValue(prodDates(p), 'product', dateLead) : (Date.parse(`${p.updated} ${p.time}`) || 0)), type: 'num' },
];

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
let dateLead = 'updated';
let dateLeadBound = false;

function dc() { return window.WiseDateCol; }
function prodDates(p) {
  const D = dc();
  return D ? D.complete({ updated: p.updated, edited: p.edited }, 'product') : { updated: p.updated };
}

/* Product-table layout: 'rows' (default) or 'cards'. Persisted so the choice
   survives navigation. True mobile forces cards via CSS regardless. */
const VIEW_KEY = 'nonupf-table-view';
let viewMode = 'rows';
function loadViewMode() {
  try { return localStorage.getItem(VIEW_KEY) === 'cards' ? 'cards' : 'rows'; }
  catch (e) { return 'rows'; }
}
function setViewMode(mode) {
  viewMode = mode === 'cards' ? 'cards' : 'rows';
  try { localStorage.setItem(VIEW_KEY, viewMode); } catch (e) { /* ignore */ }
  hostEl?.querySelector('.adm-table')?.classList.toggle('adm-table--cards', viewMode === 'cards');
  syncPageMenuChecks();
}

const { setChat, pushChat } = createChatBridge();
export const setNonUpfChat = setChat;

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
              <span class="adm-donut-num">${pct}%</span>
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
      <h3 class="adm-chart-title">WISEcode UPFs <span style="font-family:'WISE Digits', 'Noto Serif',serif;color:var(--text-subtle);font-weight:700">${total}</span></h3>
      <div class="adm-chart-body"><div class="adm-bars">${bars}</div></div>
    </div>`;
}

function statusListCard() {
  const max = Math.max(...STATUSES.map((s) => s.num)) || 1;
  const rows = STATUSES.map((s) => {
    const w = Math.round((s.num / max) * 100);
    return `
      <div class="adm-vrow">
        <span class="material-symbols-outlined adm-vrow-ic" style="color:${s.key === 'pending_att' || s.key === 'att_complete' ? 'var(--primary-ink, var(--primary))' : s.color()}">${esc(s.icon)}</span>
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
      accent: s.key === 'action' ? 'adm-stat--red' : s.key === 'ineligible' || s.key === 'pending_pay' ? 'adm-stat--amber' : s.key === 'pending_att' || s.key === 'att_complete' ? 'adm-stat--blue' : s.key === 'pre_qualified' || s.key === 'verified' ? 'adm-stat--green' : '',
    })),
  ];
  return cards.map((c) => {
    const chipCls = STAT_CHIP[c.key == null ? '' : c.key] || 'adm-chip--muted';
    return `
    <div class="adm-vf-stat${c.primary ? ' is-active' : ''}${c.accent ? ' ' + c.accent : ''}" data-adm-vf="${c.key == null ? '' : esc(c.key)}" role="button" tabindex="0">
      <span class="adm-vf-stat-num">${c.num}</span>
      <span class="adm-vf-stat-chipwrap"><span class="adm-chip ${chipCls}"><span class="material-symbols-outlined">${esc(c.icon)}</span>${esc(c.label)}</span></span>
      <span class="adm-vf-stat-sub">${esc(c.sub)}</span>
      ${c.action ? `<button type="button" class="wise-btn wise-btn--ghost wise-btn--sm" data-adm-action="${esc(c.action.toLowerCase())}">${esc(c.action)}</button>` : ''}
    </div>`;
  }).join('');
}

/* ---- Product table -------------------------------------------------- */
const GRID_COLS = '88px minmax(220px, 2.4fr) 150px 190px 186px';

function theadHtml() {
  const D = dc();
  return COLS.map((c) => {
    const cls = `adm-th${c.end ? ' adm-th--end' : ''}${c.key === 'updated' ? ' w-date-th' : ''}`;
    if (c.key === 'updated' && D) {
      const inner = D.headerHtml({ kinds: 'product', lead: dateLead });
      if (!c.sortable) return `<span class="${cls}">${inner}</span>`;
      const active = c.key === sortKey;
      const dir = active ? ` data-adm-dir="${sortDir === 1 ? 'asc' : 'desc'}"` : '';
      return `<span class="${cls} adm-th--sortable" role="button" tabindex="0" data-adm-sort="${esc(c.key)}"${dir}>${inner}<span class="adm-sort-arrow">${ARROW_SVG}</span></span>`;
    }
    if (!c.sortable) return `<span class="${cls}">${esc(c.label)}</span>`;
    const active = c.key === sortKey;
    const dir = active ? ` data-adm-dir="${sortDir === 1 ? 'asc' : 'desc'}"` : '';
    return `<span class="${cls} adm-th--sortable" role="button" tabindex="0" data-adm-sort="${esc(c.key)}"${dir}>${esc(c.label)}<span class="adm-sort-arrow">${ARROW_SVG}</span></span>`;
  }).join('');
}

function thumbHtml(p) {
  return `<span class="adm-avatar adm-avatar--round adm-avatar--photo">` +
    `<img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'">` +
    `<span class="material-symbols-outlined" style="display:none;font-size:18px">${esc(p.icon || 'lunch_dining')}</span></span>`;
}

function productRow(p) {
  const upf = UPF_CHIP[p.upf];
  const st = PROD_STATUS[p.status];
  return `
    <div class="adm-trow" data-adm-prow="${esc(p.upc)}" data-adm-pstatus="${esc(p.status)}" data-adm-pupf="${esc(p.upf)}">
      <span class="adm-td"><span class="adm-actions nud-actions"><button type="button" class="adm-icon-btn nud-rowmenu-btn" title="Manage product" aria-haspopup="menu" data-adm-action="manage-product" data-adm-upc="${esc(p.upc)}"><span class="material-symbols-outlined">more_vert</span></button></span></span>
      <span class="adm-td"><span class="adm-idcell">${thumbHtml(p)}<span class="adm-idcell-body"><span class="adm-idcell-name"><a href="#" data-adm-action="open-product" data-adm-upc="${esc(p.upc)}">${esc(p.name)}</a></span><span class="adm-idcell-sub" style="font-family:var(--font-mono)">UPC · ${esc(p.upc)}</span></span></span></span>
      <span class="adm-td"><span class="adm-chip ${upf.cls}">${esc(upf.label)}</span></span>
      <span class="adm-td"><span class="adm-chip ${st.cls}"><span class="material-symbols-outlined">${esc(st.icon)}</span>${esc(st.label)}</span></span>
      <span class="adm-td"><span class="w-datecell">${dc() ? dc().cellHtml(prodDates(p), 'product', dateLead) : `<span class="adm-idcell-body nud-updated"><span class="nud-updated-date">${esc(p.updated)}</span><span class="adm-idcell-sub">${esc(p.time)}</span></span>`}</span></span>
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
        <button type="button" class="wise-btn wise-btn--primary wise-btn--sm" data-adm-action="apply-filters">Done</button>
      </div>
    </div>`;
}

function paint() {
  if (!hostEl) return;
  hostEl.innerHTML = `
    <div class="adm-wrap adm-wrap--wide" data-w-date-root data-nud-board>
      <header class="adm-head">
        <h1 class="adm-title">Your Non-UPF Verification Dashboard</h1>
      </header>

      ${searchToolbarHTML({
        variant: 'adm',
        placeholder: 'Search products by name or brand',
        ariaLabel: 'Search products',
        value: query,
        inputType: 'text',
        inputAttrs: 'data-adm-search',
        filter: {
          attrs: 'data-adm-action="toggle-filters"',
          open: filterOpen,
          active: activeFilterCount() > 0,
          popHtml: filterPopHtml(),
        },
      })}

      <div class="adm-chart-grid">
        ${donutCard()}
        ${barsCard()}
        ${statusListCard()}
      </div>

      <div class="adm-vf-stats" style="margin-top:14px">${statCardsHtml()}</div>

      <div class="adm-card" style="margin-top:16px">
        <div class="adm-table-card">
          <div class="adm-table${viewMode === 'cards' ? ' adm-table--cards' : ''}" style="--adm-cols:${GRID_COLS}">
            <div class="adm-thead">${theadHtml()}</div>
            <div data-adm-rows>${orderedProducts().map(productRow).join('')}</div>
            <div class="adm-table-foot"><span data-adm-foot></span></div>
          </div>
        </div>
      </div>
    </div>`;
  applyProductFilter();
  animateCharts();
  injectPageMenu();
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

/* Replay just the chart visuals (donut sweep, bar fills, status bars).
   Scorecard and donut numerals count up via js/count-up-all.js. */
function animateChartVisuals() {
  if (!hostEl) return;
  requestAnimationFrame(() => {
    sweepDonut();
    hostEl.querySelectorAll('.adm-bar-fill[data-h]').forEach((b) => { b.style.height = b.dataset.h + '%'; });
    hostEl.querySelectorAll('.adm-vrow-bar span[data-w]').forEach((s) => { s.style.width = s.dataset.w + '%'; });
  });
}

function animateCharts() {
  if (!hostEl) return;
  animateChartVisuals();
}

/* Clicking a chart card replays its entrance animation — mirrors the
   click-to-replay on the shared dashboard charts (setupChartReplay). */
function replayCharts() {
  if (!hostEl) return;
  hostEl.querySelectorAll('.adm-donut-arc').forEach((arc) => arc.setAttribute('d', ''));
  hostEl.querySelectorAll('.adm-bar-fill[data-h]').forEach((b) => { b.style.height = '0'; });
  hostEl.querySelectorAll('.adm-vrow-bar span[data-w]').forEach((s) => { s.style.width = '0'; });
  animateChartVisuals();
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

/* Anchor a portalled .adm-menu to a trigger button, flipping above / clamping
   to the viewport so it never spills off-screen. Shared by every ⋮ menu. */
function placeMenu(menu, btn) {
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
  document.addEventListener('scroll', closeRowMenu, true);
  window.addEventListener('resize', closeRowMenu);
}

function openRowMenu(btn, upc) {
  closeRowMenu();
  const menu = document.createElement('div');
  menu.className = 'adm-menu';
  menu.setAttribute('role', 'menu');
  menu.innerHTML = MENU_ITEMS.map((it) => it.sep
    ? '<div class="adm-menu-sep"></div>'
    : `<button type="button" role="menuitem" class="adm-menu-item${it.danger ? ' adm-menu-item--danger' : ''}" data-adm-menu-action="${it.action}" data-adm-upc="${esc(upc)}"><span class="material-symbols-outlined">${it.icon}</span>${esc(it.label)}</button>`
  ).join('');
  placeMenu(menu, btn);
  menu.addEventListener('click', (e) => {
    const item = e.target.closest('[data-adm-menu-action]');
    if (!item) return;
    const action = item.dataset.admMenuAction;
    const ctx = item.dataset.admUpc || '';
    closeRowMenu();
    runAction(action, ctx);
  });
}

/* Dashboard-only rows live in the module ⋯ (next to width) — same cluster
   as verification. A second ⋮ above the search used to duplicate that one. */
const VIEW_MENU_ITEMS = [
  { view: 'rows',  icon: 'table_rows', label: 'Row view' },
  { view: 'cards', icon: 'grid_view',  label: 'Card view' },
];

function pageMenuItemsHTML() {
  return `
    <div class="topbar-menu-divider" data-nud-page-menu></div>
    <button type="button" class="topbar-menu-item" data-nud-page-menu data-adm-menu-action="view-invoices" role="menuitem">
      <span class="material-symbols-outlined topbar-menu-icon">receipt_long</span>
      <span>View invoices</span>
    </button>
    <button type="button" class="topbar-menu-item" data-nud-page-menu data-adm-menu-action="export" role="menuitem">
      <span class="material-symbols-outlined topbar-menu-icon">download</span>
      <span>Export dashboard</span>
    </button>
    <div class="topbar-menu-divider nud-view-sep" data-nud-page-menu></div>
    ${VIEW_MENU_ITEMS.map((it) => {
      const on = viewMode === it.view;
      return `<button type="button" role="menuitemradio" aria-checked="${on}" class="topbar-menu-item nud-view-item${on ? ' is-active' : ''}" data-nud-page-menu data-adm-view-menu="${it.view}"><span class="material-symbols-outlined topbar-menu-icon">${it.icon}</span><span class="nud-view-item-label">${esc(it.label)}</span><span class="material-symbols-outlined nud-view-item-check">${on ? 'check' : ''}</span></button>`;
    }).join('')}`;
}

function syncPageMenuChecks() {
  document.querySelectorAll('#agent-main-more-pop [data-adm-view-menu]').forEach((b) => {
    const on = b.dataset.admViewMenu === viewMode;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
    const check = b.querySelector('.nud-view-item-check');
    if (check) check.textContent = on ? 'check' : '';
  });
}

function closeHeaderMenu() {
  const btn = document.getElementById('agent-main-more-btn');
  const pop = document.getElementById('agent-main-more-pop');
  if (pop) pop.classList.add('hidden');
  if (btn) {
    btn.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
  }
}

function injectPageMenu() {
  const pop = document.getElementById('agent-main-more-pop');
  if (!pop) {
    requestAnimationFrame(injectPageMenu);
    return;
  }
  if (pop.querySelector('[data-nud-page-menu]')) {
    syncPageMenuChecks();
    return;
  }
  pop.insertAdjacentHTML('beforeend', pageMenuItemsHTML());
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
}

function productByUpc(upc) { return PRODUCTS.find((p) => p.upc === upc) || null; }
function productName(upc) { return (productByUpc(upc) || {}).name || `product ${upc}`; }

/* Deep-link into the read/edit product page (view-product.html) — the same
   fully filled-in, editable surface the portfolio table opens. The product's
   name / UPC / thumbnail travel over in the URL; `mode=edit` opens the exact
   same page in edit mode, where the chat greets you asking what to change. */
function viewHref(upc, mode) {
  const p = productByUpc(upc);
  const params = new URLSearchParams();
  if (p) { if (p.name) params.set('name', p.name); if (p.upc) params.set('upc', p.upc); if (p.img) params.set('img', p.img); }
  if (mode === 'edit') params.set('mode', 'edit');
  const qs = params.toString();
  return 'view-product.html' + (qs ? '?' + qs : '');
}

/* Re-run verification → the Non-UPF verification page. The product context
   travels in the URL so the flow can deep-link to it when supported. */
function verifyHref(upc) {
  const p = productByUpc(upc);
  const params = new URLSearchParams();
  if (p) { if (p.name) params.set('name', p.name); if (p.upc) params.set('upc', p.upc); if (p.img) params.set('img', p.img); }
  const qs = params.toString();
  return 'verification.html' + (qs ? '?' + qs : '');
}

/* Duplicate → "Modify fields in a new product": start a brand-new product in
   the add-product builder, pre-filled with this product's fields and opened in
   the editable surface (mode=edit). It's a fresh product, so the UPC is left
   blank for a new one to be assigned. */
function duplicateEditHref(upc) {
  const p = productByUpc(upc);
  const params = new URLSearchParams();
  if (p) { if (p.name) params.set('name', `${p.name} (Copy)`); if (p.img) params.set('img', p.img); }
  params.set('mode', 'edit');
  params.set('dup', '1');
  return 'add-product.html?' + params.toString();
}

/* ---- Duplicate modal (portalled to <body>) -------------------------- */
let dupModalEl = null;
function closeDupModal() {
  if (!dupModalEl) return;
  const scrim = dupModalEl;
  dupModalEl = null;
  closeModal(scrim);
}
function openDupModal(upc) {
  closeDupModal();
  const name = productName(upc);
  const { scrim } = openModal({
    id: 'adm-dup-modal',
    html: modalHTML({
      eyebrow: 'Duplicate product',
      title: `Duplicate &ldquo;${esc(name)}&rdquo;`,
      titleId: 'adm-dup-title',
      sub: 'How would you like to duplicate this product?',
      closeAttrs: 'data-adm-dup="close" data-wise-modal-close',
      modalClass: 'adm-modal--dup',
      body: `
        <button type="button" class="adm-dup-opt" data-adm-dup="copy" data-adm-upc="${esc(upc)}">
          <span class="adm-dup-opt-ic"><span class="material-symbols-outlined">content_copy</span></span>
          <span class="adm-dup-opt-body">
            <span class="adm-dup-opt-title">Duplicate everything</span>
            <span class="adm-dup-opt-desc">Create an exact copy &mdash; every field, ingredient, and Nutrition Facts value carried over to a new product.</span>
          </span>
          <span class="material-symbols-outlined adm-dup-opt-arrow">chevron_right</span>
        </button>
        <button type="button" class="adm-dup-opt" data-adm-dup="modify" data-adm-upc="${esc(upc)}">
          <span class="adm-dup-opt-ic"><span class="material-symbols-outlined">edit_note</span></span>
          <span class="adm-dup-opt-body">
            <span class="adm-dup-opt-title">Modify fields in a new product</span>
            <span class="adm-dup-opt-desc">Start a brand-new product pre-filled with these fields, then change anything before you save.</span>
          </span>
          <span class="material-symbols-outlined adm-dup-opt-arrow">chevron_right</span>
        </button>`,
    }),
    onClose: () => { if (dupModalEl === scrim) dupModalEl = null; },
  });
  dupModalEl = scrim;
  scrim.addEventListener('click', (e) => {
    const opt = e.target.closest('[data-adm-dup]');
    if (!opt) return;
    const kind = opt.dataset.admDup;
    const ctx = opt.dataset.admUpc || upc;
    if (kind === 'close') { closeDupModal(); return; }
    if (kind === 'copy') {
      closeDupModal();
      toast(`Duplicated ${productName(ctx)}`, 'content_copy');
      pushChat(`Created an exact copy of <strong>${esc(productName(ctx))}</strong> &mdash; &ldquo;${esc(productName(ctx))} (Copy)&rdquo; has been added to your registry with every field carried over.`);
      return;
    }
    if (kind === 'modify') { closeDupModal(); window.location.href = duplicateEditHref(ctx); return; }
  });
}

function runAction(action, ctx) {
  switch (action) {
    case 'export': toast('Exporting dashboard', 'download'); pushChat('Exporting your <strong>Non-UPF verification dashboard</strong> — portfolio split, processing spectrum, and product statuses.'); break;
    case 'view-invoices': window.location.href = 'invoices.html'; break;
    case 'edit': toast('Fixing action-required products', 'edit'); pushChat('Opening the <strong>10 products that need attention</strong> — each is missing mandatory data before it can be verified.'); setNonUpfStatus('action'); break;
    case 'attest': toast('Opening attestation', 'fact_check'); pushChat('Starting attestation for the <strong>19 products</strong> pending review. I\u2019ll walk you through the required confirmations.'); setNonUpfStatus('pending_att'); break;
    case 'pay': toast('Opening payment', 'payments'); pushChat('Two products are <strong>attested and ready for payment</strong> — I\u2019ll take you to checkout to activate their shields.'); break;
    case 'toggle-filters': setFilterOpen(!filterOpen); break;
    case 'apply-filters': setFilterOpen(false); break;
    case 'clear-filters': clearFilters(); break;
    case 'open-product': window.location.href = viewHref(ctx); break;
    case 'edit-product': window.location.href = viewHref(ctx, 'edit'); break;
    case 'verify-product': window.location.href = verifyHref(ctx); break;
    case 'duplicate-product': openDupModal(ctx); break;
    case 'delete-product': toast(`Deleted ${productName(ctx)}`, 'delete'); pushChat(`Removed <strong>${esc(productName(ctx))}</strong> from the registry. Say <em>undo</em> to restore it.`); break;
    case 'manage-product': break;
    default: break;
  }
}

export function renderNonUpfDashboard(mainEl) {
  hostEl = mainEl;
  query = ''; filters = { ...FILTER_DEFAULTS }; sortKey = null; sortDir = 1; filterOpen = false;
  viewMode = loadViewMode();
  if (!dateLeadBound && dc()) {
    dateLeadBound = true;
    dc().onLead(hostEl, (lead, root) => {
      if (!hostEl.querySelector('[data-nud-board]')) return;
      if (root && !hostEl.contains(root)) return;
      dateLead = lead;
      paint();
    });
  }
  paint();

  mainEl.addEventListener('click', (e) => {
    const chartCard = e.target.closest('.adm-chart-card');
    if (chartCard) { replayCharts(); return; }
    const sortH = e.target.closest('[data-adm-sort]');
    if (sortH && !e.target.closest('.w-datemenu, .pf-datemenu')) { toggleSort(sortH.dataset.admSort); return; }
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
    window.WisePopover?.bindFilterPop({
      isOpen: () => filterOpen,
      setOpen: setFilterOpen,
      insideSel: '.wise-search-inline, .adm-search-inline',
    });
    document.addEventListener('click', (e) => {
      const view = e.target.closest('#agent-main-more-pop [data-adm-view-menu], .topbar-popover [data-adm-view-menu]');
      if (view) {
        e.preventDefault();
        setViewMode(view.dataset.admViewMenu);
        closeHeaderMenu();
        return;
      }
      const pageItem = e.target.closest('#agent-main-more-pop [data-adm-menu-action], .topbar-popover [data-adm-menu-action]');
      if (pageItem && pageItem.hasAttribute('data-nud-page-menu')) {
        e.preventDefault();
        closeHeaderMenu();
        runAction(pageItem.dataset.admMenuAction, '');
        return;
      }
      if (openMenuEl && !e.target.closest('.adm-menu') && !e.target.closest('[data-adm-action="manage-product"]')) closeRowMenu();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeRowMenu(); });
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
