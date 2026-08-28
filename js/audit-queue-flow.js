import './date-column.js';

/**
 * Ingredient Audit Review (Audit Queue) — WISEcode Admin module.
 *
 * Rendered into #agent-main-scroll on audit-queue.html, paired with the
 * WISEcodeAI dock. Reviewers triage ingredient mappings flagged by brand users:
 * single-line status filter tiles, a search pill with an in-pill filter
 * popover (action / brand / flagged-date range), and a sortable grid table
 * with a per-row Resolve action. Uses the shared token-driven `adm-*`
 * component set from wise.css.
 */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* Status filter tiles across the top — single-line num + icon-label tiles,
   matching the shared admin scorecard style used across the platform. */
const STATUSES = [
  { key: null,        label: 'All',       num: 209, icon: 'inbox',        accent: '' },
  { key: 'open',      label: 'Open',      num: 8,   icon: 'schedule',     accent: 'adm-stat--blue' },
  { key: 'accepted',  label: 'Accepted',  num: 179, icon: 'check', accent: 'adm-stat--green' },
  { key: 'new_canon', label: 'New Canon', num: 14,  icon: 'add',   accent: 'adm-stat--blue' },
  { key: 'rejected',  label: 'Rejected',  num: 4,   icon: 'cancel',       accent: 'adm-stat--red' },
  { key: 'canceled',  label: 'Canceled',  num: 4,   icon: 'block',        accent: '' },
];

const AUDITS = [
  { brand: 'Karma Wellness Kitchen', food: 'Vegan Cheese Pops',              raw: 'Popped Water Lily Seeds', mapping: 'unmatched', action: 'Suggest New Canon', notes: 'Proposed new canon: Popped Water Lily Seeds (FINISHED PRODUCTS). Popped water lily seeds are water lily seeds that have been heat-popped (similar to puffed grains) to create an expanded snack. This involves industrial thermal processing that alters structure/texture but is not inherently a restricted/banned additive…', when: '48m ago', by: 'Vikita P.', status: 'open' },
  { brand: 'Karma Wellness Kitchen', food: 'Cheddar Cheese Pops',           raw: 'Popped Water Lily Seeds', mapping: 'unmatched', action: 'Suggest New Canon', notes: 'Proposed new canon: Popped Water Lily Seeds (Grain). Water lily seeds are an edible seed traditionally dried and popped (a heat-based physical expansion similar to popping grains). This is a minimal, non-chemical process with no functional additives implied by the name and no specific regulatory concerns. It…', when: '48m ago', by: 'Vikita P.', status: 'open' },
  { brand: 'Karma Wellness Kitchen', food: 'Spicy Masala Pops',             raw: 'Popped Water Lily Seeds', mapping: 'unmatched', action: 'Suggest New Canon', notes: 'Proposed new canon: Popped Water Lily Seeds (Protein). Popped water lily seeds (often sold as makhana/fox nuts) are the edible seeds of the water lily plant that have been heat-popped (similar in concept to popping grains). This is a traditional, minimal processing method (heating/puffing) without chemical solvents or…', when: '50m ago', by: 'Vikita P.', status: 'open' },
  { brand: 'Karma Wellness Kitchen', food: 'Spicy Masala Pops',             raw: 'Chaat Masala',           mapping: 'unmatched', action: 'Suggest New Canon', notes: 'Proposed new canon: Chaat Masala (Additive). Chaat masala is a blended spice/seasoning mix (typically a variable formulation that can include spices plus acidulants such as dried mango powder and often salt). Because the label provides no sub-ingredient breakdown, it is an undisclosed formulation/seasoning…', when: '50m ago', by: 'Vikita P.', status: 'open' },
  { brand: 'Karma Wellness Kitchen', food: 'Turmeric Popped Water Lily S…', raw: 'Cchaat Masala',          mapping: 'unmatched', action: 'Suggest New Canon', notes: 'Proposed new canon: Cchaat Masala (FINISHED PRODUCTS). Chaat masala is a formulated spice-and-salt seasoning blend (commonly including salt and multiple ground spices and dried acids such as mango powder and/or black salt). It is produced by blending multiple processed spice/acid components into a…', when: '51m ago', by: 'Vikita P.', status: 'open' },
  { brand: 'Hoplark',                food: 'The Blood Orange One',           raw: 'Crystalized Blood Orange', mapping: 'unmatched', action: 'Suggest New Canon', notes: 'Proposed new canon: Crystalized Blood Orange (FRUIT). The label specifies a crystallized blood orange ingredient; generic blood oranges or blood orange juice are less specific, and the shortlist only contains crystallized forms of other citrus fruits.', when: '2d ago', by: 'Frances M.', status: 'open' },
  { brand: 'Hoplark',                food: 'The Sprucey One',                raw: 'Fir Tips',                 mapping: 'unmatched', action: 'Not Sure',          notes: 'Spruce tips are the young growths that appear at the end of spruce tree branches in the spring. We proudly source sustainably hand-foraged, American spruce tips that are never extracted or dehydrated — for a unique piney, herbal, and citrusy flavor.', when: '2d ago', by: 'Frances M.', status: 'open' },
  { brand: 'Karma Wellness Kitchen', food: 'Original Popped Lotus Seeds',    raw: 'Sunflower Oil',            mapping: 'Sunflower Oil',      action: 'Remapped',  notes: 'Auditor accepted the brand suggestion and remapped to the existing canonical ingredient Sunflower Oil.', when: '3d ago', by: 'Vikita P.', status: 'accepted' },
  { brand: 'Hoplark',                food: 'The Cola One',                   raw: 'Kola Nut Extract',         mapping: 'Kola Nut Extract',   action: 'Remapped',  notes: 'Accepted with a remap to the existing canonical ingredient Kola Nut Extract.', when: '4d ago', by: 'Frances M.', status: 'accepted' },
  { brand: 'Karma Wellness Kitchen', food: 'Himalayan Salt Pops',           raw: 'Pink Himalayan Salt',      mapping: 'Salt (Himalayan Pink)', action: 'New Canon', notes: 'Reviewer created a new canonical ingredient: Salt (Himalayan Pink).', when: '5d ago', by: 'Vikita P.', status: 'new_canon' },
  { brand: 'Hoplark',                food: 'The Half & Half One',            raw: 'RE-ANALYZE',               mapping: 'unmatched', action: 'Canceled',  notes: 'Withdrawn — superseded by a brand re-analyze of the product ingredient list.', when: '6d ago', by: 'Frances M.', status: 'canceled' },
  { brand: 'Karma Wellness Kitchen', food: 'BBQ Cheese Pops',               raw: 'Natural Smoke Flavor',     mapping: 'unmatched', action: 'Rejected',  notes: 'Rejected — original unmatched mapping kept pending a clearer sub-ingredient breakdown from the brand.', when: '7d ago', by: 'Vikita P.', status: 'rejected' },
];

/* Chip class + leading icon per brand action. */
const ACTION_META = {
  'Suggest New Canon': { cls: 'adm-chip--blue',   icon: 'add' },
  'Not Sure':          { cls: 'adm-chip--amber',  icon: 'help' },
  'Remapped':          { cls: 'adm-chip--green',  icon: 'sync_alt' },
  'New Canon':         { cls: 'adm-chip--blue',   icon: 'auto_awesome' },
  'Rejected':          { cls: 'adm-chip--red',    icon: 'cancel' },
  'Canceled':          { cls: 'adm-chip--muted',  icon: 'block' },
};

/* Select filters shown in the search pill's popover. Date range is handled
   separately with two <input type="date"> fields in the same popover. */
const FILTERS = {
  action: { label: 'Action Type', icon: 'bolt',   opts: ['All actions', 'Suggest New Canon', 'Not Sure', 'Remapped', 'New Canon', 'Rejected', 'Canceled'] },
  brand:  { label: 'Brand',       icon: 'storefront', opts: ['All brands', 'Karma Wellness Kitchen', 'Hoplark'] },
};
const FILTER_DEFAULTS = { action: 'All actions', brand: 'All brands', after: '', before: '' };

/* Reference "now" for the demo data so relative flags ("48m ago", "2d ago")
   and calendar flags sort and date-filter consistently. */
const NOW_REF = Date.parse('2026-08-10T14:00:00');
function flaggedTime(a) {
  const w = a.when;
  let m;
  if ((m = /(\d+)\s*m\s*ago/i.exec(w))) return NOW_REF - Number(m[1]) * 60000;
  if ((m = /(\d+)\s*h\s*ago/i.exec(w))) return NOW_REF - Number(m[1]) * 3600000;
  if ((m = /(\d+)\s*d\s*ago/i.exec(w))) return NOW_REF - Number(m[1]) * 86400000;
  const t = Date.parse(`${w} 2026`);
  return Number.isNaN(t) ? null : t;
}

/* Sortable columns. A wide inline notes column sits among the aligned data
   cells. */
const COLS = [
  { key: 'brand',   label: 'Brand / Food',     sortable: true,  value: (a) => `${a.brand} ${a.food}`.toLowerCase(), type: 'text' },
  { key: 'raw',     label: 'Raw Ingredient',   sortable: true,  value: (a) => a.raw.toLowerCase(), type: 'text' },
  { key: 'mapping', label: 'Current Mapping',  sortable: true,  value: (a) => a.mapping.toLowerCase(), type: 'text' },
  { key: 'action',  label: "Brand's Action",   sortable: true,  value: (a) => a.action.toLowerCase(), type: 'text' },
  { key: 'notes',   label: "Brand's Notes",    sortable: false },
  { key: 'flagged', label: 'Flagged',          sortable: true,  value: (a) => (dc() ? dc().sortValue(auditDates(a), 'audit', dateLead) : (flaggedTime(a) ?? 0)), type: 'num' },
  { key: 'actions', label: '',                 sortable: false, end: true },
];
/* min:0 tracks let every flexible column shrink so the table fits the narrow
   board beside the WISEcodeAI dock (text truncates/clamps). */
const GRID_COLS = 'minmax(0,1.4fr) minmax(0,1fr) minmax(0,0.85fr) 156px minmax(0,2.3fr) 168px 112px';
const ARROW_SVG = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 9.5V2.5M3 6.5L6 9.5l3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

let hostEl = null;
let activeStatus = 'open';
let query = '';
let filters = { ...FILTER_DEFAULTS };
let sortKey = null, sortDir = 1;
let filterOpen = false;
let docListenersBound = false;
let dateLead = 'flagged';
let dateLeadBound = false;

function dc() { return window.WiseDateCol; }
function auditDates(a) {
  const D = dc();
  const flagged = a.when;
  const t = flaggedTime(a);
  const created = (D && t) ? D.fmtDate(t - 2 * 86400000) : flagged;
  const edited = (D && t) ? D.fmtDate(t - 3600000) : flagged;
  return D ? D.complete({ flagged, created, edited }, 'audit') : { flagged };
}

let chatApi = null;
export function setAuditQueueChat(api) { chatApi = api; }
/* respond() streams the shared reasoning trace before the reply lands, so a
   mirrored action reads like any other WISEcodeAI turn — never an instant paste. */
function pushChat(html) { if (chatApi && html) { chatApi.hideWelcome?.(); (chatApi.respond || chatApi.addWISEcodeAI)(html); } }

function toast(msg, icon = 'check') {
  let wrap = document.getElementById('adm-toast-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.id = 'adm-toast-wrap'; document.body.appendChild(wrap); }
  const t = document.createElement('div');
  t.className = 'adm-toast';
  t.innerHTML = `<span class="material-symbols-outlined">${esc(icon)}</span><span>${esc(msg)}</span>`;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('is-in'));
  setTimeout(() => { t.classList.remove('is-in'); setTimeout(() => t.remove(), 260); }, 2600);
}

/* ==================================================================== */
function matches(a) {
  if (activeStatus && a.status !== activeStatus) return false;
  if (filters.action !== 'All actions' && a.action !== filters.action) return false;
  if (filters.brand !== 'All brands' && a.brand !== filters.brand) return false;
  if (filters.after || filters.before) {
    const t = flaggedTime(a);
    if (filters.after) { const lo = Date.parse(filters.after); if (!Number.isNaN(lo) && (t == null || t < lo)) return false; }
    if (filters.before) { const hi = Date.parse(filters.before) + 86400000; if (!Number.isNaN(hi) && (t == null || t > hi)) return false; }
  }
  if (query && !`${a.brand} ${a.food} ${a.raw} ${a.notes}`.toLowerCase().includes(query)) return false;
  return true;
}

/* Count of popover filters that differ from their defaults (drives the "has
   changes" dot on the filter button). The status tiles are a separate
   dimension and aren't counted here. */
function activeFilterCount() {
  return Object.keys(FILTER_DEFAULTS).filter((k) => filters[k] !== FILTER_DEFAULTS[k]).length;
}

function orderedFiltered() {
  const list = AUDITS.filter(matches);
  if (!sortKey) return list;
  const col = COLS.find((c) => c.key === sortKey);
  if (!col || !col.value) return list;
  const idx = list.map((a, i) => ({ a, i }));
  idx.sort((x, y) => {
    const av = col.value(x.a), bv = col.value(y.a);
    const r = col.type === 'text' ? String(av).localeCompare(String(bv), undefined, { numeric: true }) : (av - bv);
    return (r * sortDir) || (x.i - y.i);
  });
  return idx.map((z) => z.a);
}

function rowHtml(a, i) {
  const meta = ACTION_META[a.action] || { cls: 'adm-chip--outline', icon: '' };
  const icon = meta.icon ? `<span class="material-symbols-outlined">${esc(meta.icon)}</span>` : '';
  return `
    <div class="adm-trow adm-trow--audit" data-adm-row="${i}">
      <span class="adm-td"><span class="adm-idcell-body"><span class="adm-idcell-name">${esc(a.brand)}</span><span class="adm-idcell-sub" style="color:var(--primary-ink, var(--primary))">${esc(a.food)}</span></span></span>
      <span class="adm-td" style="font-weight:600;font-size:0.82rem">${esc(a.raw)}</span>
      <span class="adm-td" style="font-style:italic;color:var(--text-subtle);font-size:0.8rem">${esc(a.mapping)}</span>
      <span class="adm-td"><span class="adm-chip ${meta.cls}">${icon}${esc(a.action)}</span></span>
      <span class="adm-td"><span class="adm-notes">${esc(a.notes)}</span></span>
      <span class="adm-td"><span class="w-datecell">${dc() ? dc().cellHtml(auditDates(a), 'audit', dateLead) : `<span class="adm-flagged"><span class="adm-flagged-when">${esc(a.when)}</span><span class="adm-flagged-by">by ${esc(a.by)}</span></span>`}</span></span>
      <span class="adm-td adm-td--end"><span class="adm-actions">
        <button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" data-adm-action="resolve" data-adm-idx="${i}"><span class="material-symbols-outlined">task_alt</span>Resolve</button>
      </span></span>
    </div>`;
}

function statsHtml() {
  return STATUSES.map((s) => {
    const active = s.key === activeStatus;
    return `
      <button type="button" class="adm-stat${s.accent ? ' ' + s.accent : ''}${active ? ' is-active' : ''}" data-adm-filter="${s.key == null ? '' : esc(s.key)}" aria-pressed="${active ? 'true' : 'false'}">
        <span class="adm-stat-num">${s.num}</span>
        <span class="adm-stat-label"><span class="material-symbols-outlined">${esc(s.icon)}</span>${esc(s.label)}</span>
      </button>`;
  }).join('');
}

function theadHtml() {
  const D = dc();
  return COLS.map((c) => {
    const cls = `adm-th${c.end ? ' adm-th--end' : ''}${c.key === 'flagged' ? ' w-date-th' : ''}`;
    if (c.key === 'flagged' && D) {
      const inner = D.headerHtml({ kinds: 'audit', lead: dateLead });
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
      ${selectHtml('action')}
      ${selectHtml('brand')}
      <div class="adm-field"><label class="adm-field-label">Flagged After</label><input type="date" class="adm-input" data-adm-filter-date="after" value="${esc(filters.after)}" aria-label="Flagged after" /></div>
      <div class="adm-field"><label class="adm-field-label">Flagged Before</label><input type="date" class="adm-input" data-adm-filter-date="before" value="${esc(filters.before)}" aria-label="Flagged before" /></div>
      <div class="adm-filter-pop-foot">
        <button type="button" class="adm-filter-clear" data-adm-action="clear-filters">Clear all</button>
        <button type="button" class="adm-btn adm-btn--primary adm-btn--sm" data-adm-action="apply-filters">Done</button>
      </div>
    </div>`;
}

function footText(n) {
  return `Showing ${n ? '1-' + n : 0} of ${n} audits`;
}

function paint() {
  if (!hostEl) return;
  const rows = orderedFiltered();
  hostEl.innerHTML = `
    <div class="adm-wrap adm-wrap--wide" data-w-date-root data-aq-board>
      <header class="adm-head">
        <div class="adm-head-row">
          <div>
            <h1 class="adm-title">Ingredient Audit Review</h1>
            <p class="adm-lede">Review and resolve ingredient mappings flagged by brand users.</p>
          </div>
          <div class="adm-head-actions">
            <button type="button" class="adm-btn adm-btn--primary" data-adm-action="refresh"><span class="material-symbols-outlined">refresh</span>Refresh Queue</button>
          </div>
        </div>
      </header>

      <div class="adm-toolbar">
        <div class="adm-search-inline has-filter">
          <span class="material-symbols-outlined">search</span>
          <input type="text" class="adm-search" data-adm-search placeholder="Search ingredient, food, or notes…" aria-label="Search audits" value="${esc(query)}" />
          <button type="button" class="adm-search-filter${activeFilterCount() ? ' has-dot' : ''}${filterOpen ? ' is-active' : ''}" data-adm-action="toggle-filters" aria-haspopup="true" aria-expanded="${filterOpen}" title="Filters" aria-label="Filters"><span class="material-symbols-outlined">tune</span></button>
          ${filterPopHtml()}
        </div>
      </div>

      <div class="adm-stats" style="margin:0 0 16px">${statsHtml()}</div>

      <div class="adm-card">
        <div class="adm-table-card">
          <div class="adm-table" style="--adm-cols:${GRID_COLS}">
            <div class="adm-thead">${theadHtml()}</div>
            <div data-adm-rows>${rows.map((a) => rowHtml(a, AUDITS.indexOf(a))).join('')}</div>
            <div class="adm-table-foot"><span data-adm-foot>${footText(rows.length)}</span></div>
          </div>
        </div>
      </div>
    </div>`;
}

function repaintRows() {
  const rows = orderedFiltered();
  const wrap = hostEl?.querySelector('[data-adm-rows]');
  if (wrap) wrap.innerHTML = rows.length ? rows.map((a) => rowHtml(a, AUDITS.indexOf(a))).join('') : '<div class="adm-empty">No audits match these filters.</div>';
  const thead = hostEl?.querySelector('.adm-thead');
  if (thead) thead.innerHTML = theadHtml();
  const foot = hostEl?.querySelector('[data-adm-foot]');
  if (foot) foot.textContent = footText(rows.length);
  hostEl?.querySelectorAll('button[data-adm-filter]').forEach((b) => {
    const s = b.dataset.admFilter || null;
    b.classList.toggle('is-active', s === activeStatus);
    b.setAttribute('aria-pressed', s === activeStatus ? 'true' : 'false');
  });
  syncFilterUi();
}

/* Keep the search-pill filter button (active + "has changes" dot) and the
   popover controls in sync with the live filter state. */
function syncFilterUi() {
  if (!hostEl) return;
  const btn = hostEl.querySelector('[data-adm-action="toggle-filters"]');
  if (btn) { btn.classList.toggle('has-dot', activeFilterCount() > 0); btn.classList.toggle('is-active', filterOpen); btn.setAttribute('aria-expanded', String(filterOpen)); }
  Object.keys(FILTERS).forEach((k) => { const sel = hostEl.querySelector(`select[data-adm-filter="${k}"]`); if (sel && sel.value !== filters[k]) sel.value = filters[k]; });
  ['after', 'before'].forEach((k) => { const dt = hostEl.querySelector(`input[data-adm-filter-date="${k}"]`); if (dt && dt.value !== filters[k]) dt.value = filters[k]; });
}

function setFilterOpen(open) {
  filterOpen = open;
  const pop = hostEl?.querySelector('[data-adm-filter-pop]');
  if (pop) pop.hidden = !open;
  syncFilterUi();
}

function clearFilters() {
  filters = { ...FILTER_DEFAULTS };
  repaintRows();
}

function toggleSort(key) {
  const col = COLS.find((c) => c.key === key);
  if (!col || !col.sortable) return;
  if (sortKey === key) sortDir = -sortDir; else { sortKey = key; sortDir = 1; }
  repaintRows();
}

export function setAuditFilter(status) { activeStatus = status || null; repaintRows(); }

function resolve(idx) {
  const a = AUDITS[idx];
  if (!a) return;
  toast(`Resolved · ${a.raw}`, 'task_alt');
  pushChat(`Resolved the flag on <strong>${esc(a.raw)}</strong> for ${esc(a.brand)} — ${esc(a.action === 'Suggest New Canon' ? 'created the new canonical ingredient' : 'confirmed the mapping')}. Moving it out of the open queue.`);
  a.status = 'accepted';
  repaintRows();
}

function runAction(action, idx) {
  switch (action) {
    case 'refresh': toast('Queue refreshed', 'refresh'); repaintRows(); break;
    case 'resolve': resolve(Number(idx)); break;
    case 'toggle-filters': setFilterOpen(!filterOpen); break;
    case 'apply-filters': setFilterOpen(false); break;
    case 'clear-filters': clearFilters(); break;
    default: break;
  }
}

export function renderAuditQueue(mainEl) {
  hostEl = mainEl;
  activeStatus = 'open'; query = ''; filters = { ...FILTER_DEFAULTS }; sortKey = null; sortDir = 1; filterOpen = false;
  if (!dateLeadBound && dc()) {
    dateLeadBound = true;
    dc().onLead(hostEl, (lead, root) => {
      if (!hostEl.querySelector('[data-aq-board]')) return;
      if (root && !hostEl.contains(root)) return;
      dateLead = lead;
      paint();
    });
  }
  paint();

  mainEl.addEventListener('click', (e) => {
    const sortH = e.target.closest('[data-adm-sort]');
    if (sortH && !e.target.closest('.w-datemenu, .pf-datemenu')) { toggleSort(sortH.dataset.admSort); return; }
    const filter = e.target.closest('button[data-adm-filter]');
    if (filter) { const s = filter.dataset.admFilter || null; setAuditFilter(s === activeStatus ? null : s); return; }
    const act = e.target.closest('[data-adm-action]');
    if (act) { e.preventDefault(); runAction(act.dataset.admAction, act.dataset.admIdx); return; }
  });
  mainEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const sortH = e.target.closest('[data-adm-sort]');
    if (!sortH) return;
    e.preventDefault(); toggleSort(sortH.dataset.admSort);
  });
  mainEl.addEventListener('input', (e) => {
    const s = e.target.closest('[data-adm-search]');
    if (s) { query = s.value.trim().toLowerCase(); repaintRows(); }
  });
  mainEl.addEventListener('change', (e) => {
    const sel = e.target.closest('select[data-adm-filter]');
    if (sel) { filters[sel.dataset.admFilter] = sel.value; repaintRows(); return; }
    const dt = e.target.closest('input[data-adm-filter-date]');
    if (dt) { filters[dt.dataset.admFilterDate] = dt.value; repaintRows(); }
  });

  /* Dismiss the filter popover on any outside click (attached once). */
  if (!docListenersBound) {
    docListenersBound = true;
    document.addEventListener('click', (e) => {
      if (filterOpen && !e.target.closest('.adm-search-inline')) setFilterOpen(false);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setFilterOpen(false); });
  }
}

/* ==================================================================== */
function countStatus(k) { return AUDITS.filter((a) => a.status === k).length; }

export const AUDIT_QUEUE_WISEAI = {
  sub: 'Triage flagged ingredient mappings — filter, review, and resolve.',
  chipsFlow: 'wrap',
  /* Large "at a glance" cards shown alongside the small chips on the welcome
     screen — each reuses an existing intent so a click drives the same flow. */
  scorecards: {
    label: 'Your audit queue at a glance',
    cards: [
      { intent: 'show_open', icon: 'schedule', iconTone: 'brand', pill: { tone: 'up', icon: 'priority_high', text: 'Do next' }, title: 'Open audits', desc: 'Rows awaiting reviewer action — mostly new-canon suggestions.', action: 'Show open audits', ask: 'Show open audits' },
      { intent: 'new_canon', icon: 'add', iconTone: 'brand', pill: { tone: 'up', icon: 'rule', text: 'Review' }, title: 'New canon suggestions', desc: 'Brand suggestions to create a new canonical ingredient — resolve to add.', action: 'New canon suggestions', ask: 'New canon suggestions' },
      { intent: 'show_all', icon: 'inbox', iconTone: 'brand', pill: { tone: 'up', icon: 'inbox', text: 'All' }, title: 'All audits', desc: 'Every loaded audit row across all statuses, in one view.', action: 'Show all audits', ask: 'Show all audits' },
      { intent: 'show_accepted', icon: 'check', iconTone: 'brand', pill: { tone: 'up', icon: 'check', text: 'Accepted' }, title: 'Accepted audits', desc: 'Remapped or flag-only resolutions, filtered in one tap.', action: 'Show accepted', ask: 'Show accepted' },
      { intent: 'show_canceled', icon: 'block', iconTone: 'brand', pill: { tone: 'up', icon: 'block', text: 'Canceled' }, title: 'Canceled audits', desc: 'Withdrawn or superseded by a re-analyze.', action: 'Show canceled', ask: 'Show canceled' },
    ],
  },
  intents: [
    { intent: 'show_open',     label: 'Show open audits',      icon: 'schedule' },
    { intent: 'show_accepted', label: 'Show accepted',         icon: 'check' },
    { intent: 'new_canon',     label: 'New canon suggestions', icon: 'add' },
    { intent: 'show_canceled', label: 'Show canceled',         icon: 'block' },
    { intent: 'show_all',      label: 'Show all audits',       icon: 'inbox' },
    { intent: 'refresh',       label: 'Refresh the queue',     icon: 'refresh' },
  ],
  intentReplies: {
    show_open:     () => `There are <strong>${countStatus('open')} open audits</strong> awaiting reviewer action — mostly new-canon suggestions.`,
    show_accepted: () => `Filtered to <strong>Accepted</strong> audits — remapped or flag-only resolutions.`,
    new_canon:     () => 'These are brand suggestions to create a <strong>new canonical ingredient</strong>. Resolve one to add it to the catalog.',
    show_canceled: () => 'Filtered to <strong>Canceled</strong> audits — withdrawn or superseded by a re-analyze.',
    show_all:      () => `Showing all <strong>${AUDITS.length}</strong> loaded audit rows.`,
    refresh:       () => 'Refreshing the audit queue.',
  },
  onIntent: (intent) => {
    switch (intent) {
      case 'show_open':     setAuditFilter('open'); break;
      case 'show_accepted': setAuditFilter('accepted'); break;
      case 'new_canon':     setAuditFilter('new_canon'); break;
      case 'show_canceled': setAuditFilter('canceled'); break;
      case 'show_all':      setAuditFilter(null); break;
      case 'refresh':       toast('Queue refreshed', 'refresh'); break;
      default: break;
    }
    return false;
  },
};
