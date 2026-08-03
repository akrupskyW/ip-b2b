/**
 * Ingredient Audit Review (Audit Queue) — WISEcode Admin module.
 *
 * Rendered into #agent-main-scroll on audit-queue.html, paired with the
 * WISEai dock. Reviewers triage ingredient mappings flagged by brand users:
 * a filter card, status filter tiles, and a grid table with per-row Resolve
 * actions. Uses the shared token-driven `adm-*` component set from wise.css.
 */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* Status filter tiles across the top. */
const STATUSES = [
  { key: null,        label: 'All',       num: 23, icon: 'inbox',        sub: 'Every audit row, all parses',            accent: '' },
  { key: 'open',      label: 'Open',      num: 6,  icon: 'schedule',     sub: '0 flags · 0 overrides · 6 new canon · 0 not sure', accent: 'adm-stat--blue' },
  { key: 'accepted',  label: 'Accepted',  num: 14, icon: 'check_circle', sub: '10 remapped · 4 flag only',              accent: 'adm-stat--green' },
  { key: 'new_canon', label: 'New Canon', num: 1,  icon: 'add_circle',   sub: 'Created by reviewer',                    accent: 'adm-stat--blue' },
  { key: 'rejected',  label: 'Rejected',  num: 0,  icon: 'cancel',       sub: 'Original mapping kept',                  accent: 'adm-stat--red' },
  { key: 'canceled',  label: 'Canceled',  num: 2,  icon: 'block',        sub: 'Withdrawn or superseded by a re-analyze', accent: '' },
];

const AUDITS = [
  { brand: 'Flax4Life', food: 'Blueberry Muffin–Single Serve', raw: 'new canon3', mapping: 'unmatched', action: 'Suggest New Canon', notes: 'Proposed new canon: new canon3 (Additives). "new canon3" is not a recognizable ingredient name and appears to be a placeholder or internal marker rather than a food substance…', when: '24d ago', by: 'Kelly S.', status: 'open' },
  { brand: 'Flax4Life', food: 'Carrot Cake Flax, Carrot Cake', raw: 'VEGAN NATURAL FLAVORS', mapping: 'unmatched', action: 'Suggest New Canon', notes: 'Proposed new canon: VEGAN NATURAL FLAVORS. No detailed AI research available for this ingredient. The ingredient name will be used as the proposed canon name.', when: '25d ago', by: 'Rob S.', status: 'open' },
  { brand: 'Goodles', food: 'Kirkland Signature Organic Har…', raw: 'Organic Hard Red Wheat Flour', mapping: 'unmatched', action: 'Suggest New Canon', notes: 'Proposed new canon: Organic Hard Red Wheat Flour (Grain). Hard red wheat flour is produced by milling cleaned hard red wheat kernels into flour. This is a traditional minimal processing…', when: '25d ago', by: 'Kevin J.', status: 'open' },
  { brand: 'Goodles', food: 'Cheddy Mac – Creamy Chedd…', raw: 'Dried Maple Syrup', mapping: 'unmatched', action: 'Suggest New Canon', notes: 'Proposed new canon: DRIED MAPLE SYRUP (Additives). Dried maple syrup is maple syrup that has been dehydrated into solids/powder (often via evaporation and drying, sometimes with…', when: '25d ago', by: 'Kevin J.', status: 'open' },
  { brand: 'Goodles', food: 'Cheddy Mac (Creamy Chedd…', raw: 'Cranberry', mapping: 'unmatched', action: 'Suggest New Canon', notes: 'Proposed new canon: Cranberry. No detailed AI research available for this ingredient. The ingredient name will be used as the proposed canon name.', when: '25d ago', by: 'Kevin J.', status: 'open' },
  { brand: 'Giffard', food: "Pip's Heirloom Snacks Twists…", raw: 'Upcycled Ground Yellow Corn', mapping: 'unmatched', action: 'Suggest New Canon', notes: 'Proposed new canon: Upcycled Ground Yellow Corn — Grain. Ground yellow corn is produced by milling whole yellow corn kernels into smaller particles. This is a physical size reduction…', when: 'Jun 17', by: 'Rob S.', status: 'open' },
  { brand: 'Flax4Life', food: 'Cinnamon Flax Muffin', raw: 'Sunflower Lecithin', mapping: 'Lecithin (Sunflower)', action: 'Remapped', notes: 'Auditor accepted the brand suggestion and remapped to the existing canonical ingredient Lecithin (Sunflower).', when: '26d ago', by: 'Kelly S.', status: 'accepted' },
  { brand: 'Goodles', food: 'Shells & White Cheddar', raw: 'Organic Semolina', mapping: 'Semolina (Durum Wheat)', action: 'Remapped', notes: 'Accepted with a remap to Semolina (Durum Wheat).', when: '27d ago', by: 'Kevin J.', status: 'accepted' },
  { brand: 'Giffard', food: 'Heirloom Twists – Sea Salt', raw: 'RE-ANALYZE', mapping: 'unmatched', action: 'Canceled', notes: 'Withdrawn — superseded by a brand re-analyze of the product ingredient list.', when: '28d ago', by: 'Rob S.', status: 'canceled' },
  { brand: 'Flax4Life', food: 'Ancient Grain Loaf', raw: 'Teff Flour', mapping: 'Teff Flour', action: 'New Canon', notes: 'Reviewer created a new canonical ingredient: Teff Flour (Grain).', when: '29d ago', by: 'Kelly S.', status: 'new_canon' },
];

const ACTION_CHIP = {
  'Suggest New Canon': 'adm-chip--canon',
  'Remapped':          'adm-chip--green',
  'New Canon':         'adm-chip--blue',
  'Canceled':          'adm-chip--muted',
};

const FILTERS = {
  action: { label: 'Action Type', opts: ['All actions', 'Suggest New Canon', 'Remapped', 'New Canon', 'Canceled'] },
  brand:  { label: 'Brand',       opts: ['All brands', 'Flax4Life', 'Goodles', 'Giffard'] },
};
const FILTER_DEFAULTS = { action: 'All actions', brand: 'All brands', after: '', before: '' };

/* Reference "today" for the demo data so relative flags ("24d ago") and
   calendar flags ("Jun 17") sort and date-filter consistently. */
const NOW_REF = Date.parse('2026-08-01');
function flaggedTime(a) {
  const m = /(\d+)\s*d\s*ago/i.exec(a.when);
  if (m) return NOW_REF - Number(m[1]) * 86400000;
  const t = Date.parse(`${a.when} 2026`);
  return Number.isNaN(t) ? null : t;
}
function flaggedDays(a) {
  const t = flaggedTime(a);
  return t == null ? Number.MAX_SAFE_INTEGER : Math.round((NOW_REF - t) / 86400000);
}

/* Sortable columns. Notes are rendered on their own full-width row beneath
   the aligned cells, so they aren't part of the column grid. */
const COLS = [
  { key: 'brand',   label: 'Brand / Food',    sortable: true,  value: (a) => `${a.brand} ${a.food}`.toLowerCase(), type: 'text' },
  { key: 'raw',     label: 'Raw Ingredient',  sortable: true,  value: (a) => a.raw.toLowerCase(), type: 'text' },
  { key: 'mapping', label: 'Current Mapping', sortable: true,  value: (a) => a.mapping.toLowerCase(), type: 'text' },
  { key: 'action',  label: "Brand's Action",  sortable: true,  value: (a) => a.action.toLowerCase(), type: 'text' },
  { key: 'flagged', label: 'Flagged',         sortable: true,  value: (a) => flaggedDays(a), type: 'num' },
  { key: 'actions', label: 'Actions',         sortable: false, end: true },
];
const GRID_COLS = 'minmax(150px, 1.5fr) minmax(130px, 1.2fr) 124px 150px 112px 120px';
const ARROW_SVG = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 9.5V2.5M3 6.5L6 9.5l3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

let hostEl = null;
let activeStatus = 'open';
let query = '';
let filters = { ...FILTER_DEFAULTS };
let sortKey = null, sortDir = 1;
let filterOpen = false;
let docListenersBound = false;

let chatApi = null;
export function setAuditQueueChat(api) { chatApi = api; }
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
  const chip = ACTION_CHIP[a.action] || 'adm-chip--outline';
  const canonIcon = a.action === 'Suggest New Canon' ? '<span class="material-icons">add_circle</span>' : '';
  return `
    <div class="adm-trow adm-trow--audit" data-adm-row="${i}">
      <span class="adm-td"><span class="adm-idcell-body"><span class="adm-idcell-name">${esc(a.brand)}</span><span class="adm-idcell-sub" style="color:var(--primary)">${esc(a.food)}</span></span></span>
      <span class="adm-td" style="font-weight:600;font-size:0.82rem">${esc(a.raw)}</span>
      <span class="adm-td" style="font-style:italic;color:var(--text-subtle);font-size:0.8rem">${esc(a.mapping)}</span>
      <span class="adm-td"><span class="adm-chip ${chip}">${canonIcon}${esc(a.action)}</span></span>
      <span class="adm-td"><span class="adm-flagged"><span class="adm-flagged-when">${esc(a.when)}</span><span class="adm-flagged-by">by ${esc(a.by)}</span></span></span>
      <span class="adm-td adm-td--end"><span class="adm-actions"><button type="button" class="adm-btn adm-btn--primary adm-btn--sm" data-adm-action="resolve" data-adm-idx="${i}"><span class="material-icons">task_alt</span>Resolve</button></span></span>
      <div class="adm-trow-notes"><span class="material-icons">sticky_note_2</span><span class="adm-notes adm-notes--full">${esc(a.notes)}</span></div>
    </div>`;
}

function statsHtml() {
  return STATUSES.map((s) => {
    const active = s.key === activeStatus;
    return `
      <button type="button" class="adm-stat${s.accent ? ' ' + s.accent : ''}${active ? ' is-active' : ''}" data-adm-filter="${s.key == null ? '' : esc(s.key)}" aria-pressed="${active ? 'true' : 'false'}">
        <span class="adm-stat-num">${s.num}</span>
        <span class="adm-stat-label"><span class="material-icons">${esc(s.icon)}</span>${esc(s.label)}</span>
        <span class="adm-stat-sub">${esc(s.sub)}</span>
      </button>`;
  }).join('');
}

function theadHtml() {
  return COLS.map((c) => {
    const cls = `adm-th${c.end ? ' adm-th--end' : ''}`;
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

function paint() {
  if (!hostEl) return;
  const rows = orderedFiltered();
  hostEl.innerHTML = `
    <div class="adm-wrap adm-wrap--wide">
      <header class="adm-head">
        <div class="adm-head-row">
          <div>
            <h1 class="adm-title">Ingredient Audit Review</h1>
            <p class="adm-lede">Review and resolve ingredient mappings flagged by brand users.</p>
          </div>
          <div class="adm-head-actions">
            <button type="button" class="adm-btn adm-btn--primary" data-adm-action="refresh"><span class="material-icons">refresh</span>Refresh Queue</button>
          </div>
        </div>
      </header>

      <div class="adm-toolbar">
        <div class="adm-search-inline has-filter">
          <span class="material-icons">search</span>
          <input type="text" class="adm-search" data-adm-search placeholder="Search ingredient, food, or notes…" aria-label="Search audits" value="${esc(query)}" />
          <button type="button" class="adm-search-filter${activeFilterCount() ? ' has-dot' : ''}${filterOpen ? ' is-active' : ''}" data-adm-action="toggle-filters" aria-haspopup="true" aria-expanded="${filterOpen}" title="Filters" aria-label="Filters"><span class="material-icons">tune</span></button>
          ${filterPopHtml()}
        </div>
      </div>

      <div class="adm-stats" style="margin-bottom:14px">${statsHtml()}</div>

      <div class="adm-card">
        <div class="adm-table-card">
          <div class="adm-table" style="--adm-cols:${GRID_COLS}">
            <div class="adm-thead">${theadHtml()}</div>
            <div data-adm-rows>${rows.map((a) => rowHtml(a, AUDITS.indexOf(a))).join('')}</div>
            <div class="adm-table-foot"><span data-adm-foot>Showing ${rows.length ? '1-' + rows.length : 0} of ${rows.length} audits</span></div>
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
  if (foot) foot.textContent = `Showing ${rows.length ? '1-' + rows.length : 0} of ${rows.length} audits`;
  hostEl?.querySelectorAll('button[data-adm-filter]').forEach((b) => {
    const s = b.dataset.admFilter || null;
    b.classList.toggle('is-active', s === activeStatus);
    b.setAttribute('aria-pressed', s === activeStatus ? 'true' : 'false');
  });
  syncFilterUi();
}

/* Keep the in-search filter button (active + "has changes" dot), the popover
   controls, and open/closed state in sync with the live filter state. */
function syncFilterUi() {
  if (!hostEl) return;
  const btn = hostEl.querySelector('[data-adm-action="toggle-filters"]');
  if (btn) { btn.classList.toggle('has-dot', activeFilterCount() > 0); btn.classList.toggle('is-active', filterOpen); btn.setAttribute('aria-expanded', String(filterOpen)); }
  const pop = hostEl.querySelector('[data-adm-filter-pop]');
  if (pop) pop.hidden = !filterOpen;
  Object.keys(FILTERS).forEach((k) => { const sel = hostEl.querySelector(`select[data-adm-filter="${k}"]`); if (sel && sel.value !== filters[k]) sel.value = filters[k]; });
  ['after', 'before'].forEach((k) => { const dt = hostEl.querySelector(`input[data-adm-filter-date="${k}"]`); if (dt && dt.value !== filters[k]) dt.value = filters[k]; });
}

function setFilterOpen(open) { filterOpen = open; syncFilterUi(); }
function clearFilters() { filters = { ...FILTER_DEFAULTS }; repaintRows(); }

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
    case 'toggle-filters': setFilterOpen(!filterOpen); break;
    case 'apply-filters': setFilterOpen(false); break;
    case 'clear-filters': clearFilters(); break;
    case 'resolve': resolve(Number(idx)); break;
    case 'ai': { const a = AUDITS[Number(idx)]; if (a) pushChat(`Let\u2019s look at <strong>${esc(a.raw)}</strong> (${esc(a.brand)} · ${esc(a.food)}). ${esc(a.notes)}`); break; }
    default: break;
  }
}

export function renderAuditQueue(mainEl) {
  hostEl = mainEl;
  activeStatus = 'open'; query = ''; filters = { ...FILTER_DEFAULTS }; sortKey = null; sortDir = 1; filterOpen = false;
  paint();

  mainEl.addEventListener('click', (e) => {
    const sortH = e.target.closest('[data-adm-sort]');
    if (sortH) { toggleSort(sortH.dataset.admSort); return; }
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

  /* Dismiss the filter popover on any outside click / Escape (bound once). */
  if (!docListenersBound) {
    docListenersBound = true;
    document.addEventListener('click', (e) => {
      if (filterOpen && !e.target.closest('.adm-search-inline')) setFilterOpen(false);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && filterOpen) setFilterOpen(false); });
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
      { intent: 'new_canon', icon: 'add_circle', iconTone: 'brand', pill: { tone: 'up', icon: 'rule', text: 'Review' }, title: 'New canon suggestions', desc: 'Brand suggestions to create a new canonical ingredient — resolve to add.', action: 'New canon suggestions', ask: 'New canon suggestions' },
      { intent: 'show_all', icon: 'inbox', iconTone: 'brand', pill: { tone: 'up', icon: 'inbox', text: 'All' }, title: 'All audits', desc: 'Every loaded audit row across all statuses, in one view.', action: 'Show all audits', ask: 'Show all audits' },
    ],
  },
  intents: [
    { intent: 'show_open',     label: 'Show open audits',      icon: 'schedule' },
    { intent: 'show_accepted', label: 'Show accepted',         icon: 'check_circle' },
    { intent: 'new_canon',     label: 'New canon suggestions', icon: 'add_circle' },
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
