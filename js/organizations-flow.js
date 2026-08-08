/**
 * Organizations — WISEcode Admin module.
 *
 * Rendered into #agent-main-scroll on organizations.html (an app-nav shell
 * page) and paired with the persistent WISEai dock to its LEFT. Mirrors the
 * Product Portfolio / Invoices module language: a serif header, at-a-glance
 * count tiles, a status filter strip, a live search, and a grid "table" of
 * customer organizations with per-row admin actions.
 *
 * All classes are the shared, token-driven `adm-*` set in wise.css, so the
 * surface tracks light/dark exactly like the rest of the app.
 */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ---- At-a-glance organization counts (top metric strip) ------------- */
const COUNTS = [
  { id: 'total',     icon: 'apartment',    label: 'Total Orgs',           num: 315, sub: 'All organizations' },
  { id: 'active',    icon: 'bolt',         label: 'Active Orgs',          num: 15,  sub: 'Active status', accent: true },
  { id: 'nonupf',    icon: 'verified',     label: 'Non-UPF Partners',     num: 49,  sub: 'Have a verified shield' },
  { id: 'selfreg',   icon: 'how_to_reg',   label: 'Self Registered',      num: 12,  sub: 'Signed up directly' },
  { id: 'invited',   icon: 'mark_email_read', label: 'Activated by Invitation', num: 5, sub: 'Invited & joined' },
  { id: 'studio',    icon: 'workspace_premium', label: 'With Studio Access', num: 2, sub: 'Granted, not waitlisted' },
  { id: 'claimed',   icon: 'inventory_2',  label: 'With Claimed Products', num: 74, sub: 'Have at least one' },
];

/* ---- Metric card ordering (drag-and-drop, persisted) ---------------- */
const METRIC_ORDER_KEY = 'wise-org-metric-order';

function loadMetricOrder() {
  try {
    const raw = localStorage.getItem(METRIC_ORDER_KEY);
    if (!raw) return;
    const ids = JSON.parse(raw);
    if (!Array.isArray(ids)) return;
    COUNTS.sort((a, b) => {
      const ai = ids.indexOf(a.id), bi = ids.indexOf(b.id);
      return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
    });
  } catch (e) { /* ignore malformed order */ }
}

function saveMetricOrder() {
  try { localStorage.setItem(METRIC_ORDER_KEY, JSON.stringify(COUNTS.map((c) => c.id))); }
  catch (e) { /* storage unavailable */ }
}

/* ---- Status filter tiles (segmented board) -------------------------- */
const STATUSES = [
  { key: null,       label: 'All',           num: 315, sub: 'All organizations',   accent: '' },
  { key: 'invited',  label: 'Invited',       num: 5,   sub: 'Has an active invite', accent: 'adm-stat--blue',  icon: 'mail' },
  { key: 'pending',  label: 'Pending Review', num: 0,  sub: 'Awaiting review',      accent: 'adm-stat--amber', icon: 'hourglass_top' },
  { key: 'active',   label: 'Active',        num: 15,  sub: 'Has a signable user',  accent: 'adm-stat--green', icon: 'check_circle' },
  { key: 'suspended', label: 'Suspended',    num: 0,   sub: 'Account suspended',    accent: 'adm-stat--red',   icon: 'block' },
  { key: 'inactive', label: 'Inactive',      num: 295, sub: 'No users or invites',  accent: '',                icon: 'do_not_disturb_on' },
];

const STATUS_CHIP = {
  active:   { cls: 'adm-chip--green', icon: 'check_circle', label: 'Active' },
  inactive: { cls: 'adm-chip--muted', icon: 'do_not_disturb_on', label: 'Inactive' },
  invited:  { cls: 'adm-chip--blue',  icon: 'mail',         label: 'Invited' },
  pending:  { cls: 'adm-chip--amber', icon: 'hourglass_top', label: 'Pending' },
  suspended: { cls: 'adm-chip--red',  icon: 'block',        label: 'Suspended' },
};

/* ---- Seeded organizations ------------------------------------------- */
const TYPE = 'Independent Food/Beverage Brand';
const ORGS = [
  { name: '2 Degrees',      type: TYPE, status: 'inactive', joined: '—',            via: 'Self Registered',   users: 0, products: 3,   claimed: 1 },
  { name: '88 Acres',       type: TYPE, status: 'inactive', joined: '—',            via: '',                  users: 0, products: 0,   claimed: 0 },
  { name: "Abbot's Butcher", type: TYPE, status: 'active',  joined: 'Jun 26, 2026', via: 'Invitation',        users: 1, products: 6,   claimed: 6 },
  { name: 'Actual Veggies', type: TYPE, status: 'inactive', joined: '—',            via: '',                  users: 0, products: 27,  claimed: 22 },
  { name: 'Aldi',           type: TYPE, status: 'inactive', joined: '—',            via: '',                  users: 0, products: 250, claimed: 193 },
  { name: "Aleia's",        type: TYPE, status: 'active',   joined: 'Jun 5, 2026',  via: 'Self Registered',   users: 1, products: 0,   claimed: 0 },
  { name: 'Amazifoods',     type: TYPE, status: 'inactive', joined: '—',            via: '',                  users: 0, products: 0,   claimed: 0 },
  { name: 'Applegate',      type: TYPE, status: 'inactive', joined: '—',            via: '',                  users: 0, products: 0,   claimed: 0 },
  { name: 'Arti Bars',      type: TYPE, status: 'inactive', joined: '—',            via: '',                  users: 0, products: 0,   claimed: 0 },
  { name: 'Artisan Tropic', type: TYPE, status: 'inactive', joined: '—',            via: '',                  users: 0, products: 33,  claimed: 23 },
  { name: 'Brave Foods',    type: TYPE, status: 'invited',  joined: '—',            via: 'Invite sent',       users: 0, products: 0,   claimed: 0 },
  { name: 'Flax4Life',      type: TYPE, status: 'active',   joined: 'Apr 18, 2026', via: 'Invitation',        users: 3, products: 9,   claimed: 9 },
  { name: 'Goodles',        type: TYPE, status: 'active',   joined: 'May 2, 2026',  via: 'Invitation',        users: 2, products: 4,   claimed: 4 },
  { name: 'Vive Juicery',   type: TYPE, status: 'invited',  joined: '—',            via: 'Invite sent',       users: 0, products: 0,   claimed: 0 },
];

function initials(name) {
  return String(name).replace(/[^A-Za-z0-9 ]/g, '').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

/* ---- Sorting -------------------------------------------------------- */
const COLS = [
  { key: 'name',     label: 'Company + Type', sortable: true,  value: (o) => o.name.toLowerCase(), type: 'text' },
  { key: 'status',   label: 'Status',         sortable: true,  value: (o) => o.status, type: 'text' },
  { key: 'joined',   label: 'Joined',         sortable: true,  value: (o) => (o.joined === '—' ? 0 : Date.parse(o.joined) || 0), type: 'num' },
  { key: 'users',    label: 'Users',          sortable: true,  value: (o) => o.users, type: 'num', num: true },
  { key: 'products', label: 'Products',       sortable: true,  value: (o) => o.products, type: 'num', num: true },
  { key: 'actions',  label: 'Actions',        sortable: false, end: true },
];
const GRID_COLS = 'minmax(210px, 2.2fr) 128px 148px 80px 96px 72px';

/* ---- Per-row actions (collapsed into a three-dot menu) -------------- */
const ROW_ACTIONS = [
  { action: 'manage', icon: 'dashboard_customize', label: 'Manage organization' },
  { action: 'users',  icon: 'group',               label: 'Manage users' },
  { action: 'invite', icon: 'bolt',  variant: 'primary', label: 'Quick invite' },
  { action: 'edit',   icon: 'edit',                label: 'Edit' },
];

const ARROW_SVG = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 9.5V2.5M3 6.5L6 9.5l3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

let hostEl = null;
let activeStatus = null;
let query = '';
let sortKey = null;
let sortDir = 1;

/* ---- Chat bridge + toast -------------------------------------------- */
let chatApi = null;
export function setOrganizationsChat(api) { chatApi = api; }
function pushChat(html) { if (chatApi && html) { chatApi.hideWelcome?.(); chatApi.addWISEai(html); } }

function toast(msg, icon = 'check_circle') {
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
function metricsHtml() {
  return COUNTS.map((c) => `
    <div class="adm-metric${c.accent ? ' adm-metric--accent' : ''}" draggable="true" data-adm-metric="${esc(c.id)}">
      <span class="adm-metric-grip" aria-hidden="true"><span class="material-symbols-outlined">drag_indicator</span></span>
      <span class="adm-metric-top"><span class="material-symbols-outlined">${esc(c.icon)}</span>${esc(c.label)}</span>
      <span class="adm-metric-num">${c.num}</span>
      <span class="adm-metric-sub">${esc(c.sub)}</span>
    </div>`).join('');
}

function statsHtml() {
  return STATUSES.map((s) => {
    const active = s.key === activeStatus;
    const icon = s.icon ? `<span class="material-symbols-outlined">${esc(s.icon)}</span>` : '';
    return `
      <button type="button" class="adm-stat${s.accent ? ' ' + s.accent : ''}${active ? ' is-active' : ''}" data-adm-filter="${s.key == null ? '' : esc(s.key)}" aria-pressed="${active ? 'true' : 'false'}">
        <span class="adm-stat-num">${s.num}</span>
        <span class="adm-stat-label">${icon}${esc(s.label)}</span>
        <span class="adm-stat-sub">${esc(s.sub)}</span>
      </button>`;
  }).join('');
}

function theadHtml() {
  return COLS.map((c) => {
    const cls = `adm-th${c.num ? ' adm-th--num' : ''}${c.end ? ' adm-th--end' : ''}`;
    if (!c.sortable) return `<span class="${cls}">${esc(c.label)}</span>`;
    const active = c.key === sortKey;
    const dir = active ? ` data-adm-dir="${sortDir === 1 ? 'asc' : 'desc'}"` : '';
    return `<span class="${cls} adm-th--sortable" role="button" tabindex="0" data-adm-sort="${esc(c.key)}"${dir}>${esc(c.label)}<span class="adm-sort-arrow">${ARROW_SVG}</span></span>`;
  }).join('');
}

function rowMenuHtml(o) {
  const items = ROW_ACTIONS.map((a) =>
    `<button type="button" class="adm-rowmenu-item${a.variant ? ' adm-rowmenu-item--' + a.variant : ''}" role="menuitem" data-adm-action="${esc(a.action)}" data-adm-org="${esc(o.name)}"><span class="material-symbols-outlined">${esc(a.icon)}</span>${esc(a.label)}</button>`
  ).join('');
  return `<div class="adm-rowmenu"><button type="button" class="adm-rowmenu-btn" aria-haspopup="true" aria-expanded="false" aria-label="Actions" title="Actions"><span class="material-symbols-outlined">more_vert</span></button><div class="adm-rowmenu-pop" role="menu" hidden>${items}</div></div>`;
}

function rowHtml(o) {
  const chip = STATUS_CHIP[o.status];
  const joined = o.joined === '—'
    ? '<span style="color:var(--text-subtle)">—</span>'
    : `<span class="adm-idcell-body"><span style="font-weight:600">${esc(o.joined)}</span>${o.via ? `<span class="adm-idcell-sub">${esc(o.via)}</span>` : ''}</span>`;
  return `
    <div class="adm-trow" data-adm-row="${esc(o.name)}" data-adm-status="${esc(o.status)}">
      <span class="adm-td"><span class="adm-idcell"><span class="adm-avatar">${esc(initials(o.name))}</span><span class="adm-idcell-body"><span class="adm-idcell-name">${esc(o.name)}</span><span class="adm-idcell-sub">${esc(o.type)}</span></span></span></span>
      <span class="adm-td"><span class="adm-chip ${chip.cls}"><span class="material-symbols-outlined">${esc(chip.icon)}</span>${esc(chip.label)}</span></span>
      <span class="adm-td" style="font-size:0.8rem">${joined}</span>
      <span class="adm-td adm-td--num${o.users ? ' is-hot' : ''}">${o.users}</span>
      <span class="adm-td adm-td--num${o.products ? ' is-hot' : ''}">${o.products}</span>
      <span class="adm-td adm-td--end">${rowMenuHtml(o)}</span>
    </div>`;
}

function orderedOrgs() {
  if (!sortKey) return ORGS.slice();
  const col = COLS.find((c) => c.key === sortKey);
  if (!col) return ORGS.slice();
  const idx = ORGS.map((o, i) => ({ o, i }));
  idx.sort((a, b) => {
    const av = col.value(a.o), bv = col.value(b.o);
    let r = col.type === 'text' ? String(av).localeCompare(String(bv), undefined, { numeric: true }) : (av - bv);
    return (r * sortDir) || (a.i - b.i);
  });
  return idx.map((x) => x.o);
}

function paint() {
  if (!hostEl) return;
  hostEl.innerHTML = `
    <div class="adm-wrap adm-wrap--wide">
      <header class="adm-head">
        <div class="adm-head-row">
          <div>
            <h1 class="adm-title">Organizations</h1>
            <p class="adm-lede">Create, edit and manage customer organizations.</p>
          </div>
          <div class="adm-head-actions">
            <button type="button" class="adm-btn adm-btn--ghost" data-adm-action="export"><span class="material-symbols-outlined">download</span>Export CSV</button>
            <a class="adm-btn adm-btn--ghost" href="quick-invite.html"><span class="material-symbols-outlined">bolt</span>Quick Invite</a>
            <button type="button" class="adm-btn adm-btn--primary" data-adm-action="add-org"><span class="material-symbols-outlined">add</span>Add Organization</button>
          </div>
        </div>
      </header>

      <div class="adm-metrics">${metricsHtml()}</div>

      <div class="adm-toolbar" style="margin-top:18px">
        <div class="adm-search-inline has-filter">
          <span class="material-symbols-outlined">search</span>
          <input type="text" class="adm-search" data-adm-search placeholder="Search organization, brand, contact, or email…" aria-label="Search organizations" value="${esc(query)}" />
          <button type="button" class="adm-search-filter" data-adm-action="filters" title="Filters" aria-label="Filters"><span class="material-symbols-outlined">filter_list</span></button>
        </div>
      </div>

      <div class="adm-stats" style="margin-bottom:14px">${statsHtml()}</div>

      <div class="adm-card">
        <div class="adm-table-card">
          <div class="adm-table" style="--adm-cols:${GRID_COLS}">
            <div class="adm-thead">${theadHtml()}</div>
            <div data-adm-rows>${orderedOrgs().map(rowHtml).join('')}</div>
            <div class="adm-table-foot"><span data-adm-foot></span></div>
          </div>
        </div>
      </div>
    </div>`;
  applyFilter();
}

function matches(o) {
  if (activeStatus && o.status !== activeStatus) return false;
  if (query) { if (!`${o.name} ${o.type} ${o.status}`.toLowerCase().includes(query)) return false; }
  return true;
}

function applyFilter() {
  if (!hostEl) return;
  let shown = 0;
  ORGS.forEach((o) => {
    const row = hostEl.querySelector(`[data-adm-row="${CSS.escape(o.name)}"]`);
    if (!row) return;
    const ok = matches(o);
    row.classList.toggle('adm-row-hidden', !ok);
    if (ok) shown++;
  });
  const foot = hostEl.querySelector('[data-adm-foot]');
  if (foot) foot.textContent = `Showing ${shown} of ${ORGS.length} organizations`;
  hostEl.querySelectorAll('[data-adm-filter]').forEach((b) => {
    const s = b.dataset.admFilter || null;
    const active = s === activeStatus;
    b.classList.toggle('is-active', active);
    b.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

export function setOrgFilter(status) {
  activeStatus = status || null;
  const rows = hostEl?.querySelector('[data-adm-rows]');
  if (rows) rows.innerHTML = orderedOrgs().map(rowHtml).join('');
  applyFilter();
  hostEl?.querySelector('.adm-stats')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function applySort() {
  const rows = hostEl?.querySelector('[data-adm-rows]');
  if (rows) rows.innerHTML = orderedOrgs().map(rowHtml).join('');
  const thead = hostEl?.querySelector('.adm-thead');
  if (thead) thead.innerHTML = theadHtml();
  applyFilter();
}
function toggleSort(key) {
  const col = COLS.find((c) => c.key === key);
  if (!col || !col.sortable) return;
  if (sortKey === key) sortDir = -sortDir; else { sortKey = key; sortDir = 1; }
  applySort();
}

function runAction(action, org) {
  switch (action) {
    case 'export': toast('Exporting organizations to CSV', 'download'); pushChat('Preparing a CSV export of <strong>all organizations</strong> — your download will start shortly.'); break;
    case 'add-org': toast('New organization', 'add'); pushChat('Let\u2019s create a new organization. Give me the <strong>company name</strong> and I\u2019ll set up the workspace and a first admin seat.'); break;
    case 'filters': toast('Filters', 'filter_list'); break;
    case 'manage': toast(`Opening ${org}`, 'dashboard_customize'); pushChat(`Opening the admin console for <strong>${esc(org)}</strong> — products, users, verification, and billing in one place.`); break;
    case 'users': toast(`Users · ${org}`, 'group'); pushChat(`Showing the users on <strong>${esc(org)}</strong>. You can add a seat, resend an invite, or change roles from here.`); break;
    case 'invite': window.location.href = 'quick-invite.html'; break;
    case 'edit': toast(`Editing ${org}`, 'edit'); pushChat(`Editing <strong>${esc(org)}</strong> — update the brand name, type, contact and Studio access.`); break;
    default: break;
  }
}

let dragId = null;

function closeRowMenus(keep) {
  if (!hostEl) return;
  hostEl.querySelectorAll('.adm-rowmenu.is-open').forEach((menu) => {
    if (menu === keep) return;
    menu.classList.remove('is-open');
    const btn = menu.querySelector('.adm-rowmenu-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    const pop = menu.querySelector('.adm-rowmenu-pop');
    if (pop) pop.hidden = true;
  });
}

function repaintMetrics() {
  const grid = hostEl?.querySelector('.adm-metrics');
  if (grid) grid.innerHTML = metricsHtml();
}

function wireMetricDnD(mainEl) {
  mainEl.addEventListener('dragstart', (e) => {
    const card = e.target.closest('[data-adm-metric]');
    if (!card) return;
    dragId = card.dataset.admMetric;
    card.classList.add('is-dragging');
    if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); }
  });
  mainEl.addEventListener('dragover', (e) => {
    if (dragId == null) return;
    const card = e.target.closest('[data-adm-metric]');
    if (!card || card.dataset.admMetric === dragId) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    hostEl?.querySelectorAll('.adm-metric.is-drop-target').forEach((el) => el.classList.remove('is-drop-target'));
    card.classList.add('is-drop-target');
  });
  mainEl.addEventListener('drop', (e) => {
    const card = e.target.closest('[data-adm-metric]');
    if (dragId == null || !card) return;
    e.preventDefault();
    const targetId = card.dataset.admMetric;
    if (targetId === dragId) return;
    const from = COUNTS.findIndex((c) => c.id === dragId);
    const to = COUNTS.findIndex((c) => c.id === targetId);
    if (from === -1 || to === -1) return;
    const [moved] = COUNTS.splice(from, 1);
    COUNTS.splice(to, 0, moved);
    saveMetricOrder();
    repaintMetrics();
    toast('Reordered organization counts', 'drag_indicator');
  });
  mainEl.addEventListener('dragend', () => {
    dragId = null;
    hostEl?.querySelectorAll('.adm-metric.is-dragging, .adm-metric.is-drop-target')
      .forEach((el) => el.classList.remove('is-dragging', 'is-drop-target'));
  });
}

export function renderOrganizations(mainEl) {
  hostEl = mainEl;
  activeStatus = null; query = ''; sortKey = null; sortDir = 1;
  loadMetricOrder();
  paint();
  wireMetricDnD(mainEl);

  mainEl.addEventListener('click', (e) => {
    const menuBtn = e.target.closest('.adm-rowmenu-btn');
    if (menuBtn) {
      const menu = menuBtn.closest('.adm-rowmenu');
      const open = !menu.classList.contains('is-open');
      closeRowMenus(open ? menu : null);
      menu.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      const pop = menu.querySelector('.adm-rowmenu-pop');
      if (pop) pop.hidden = !open;
      return;
    }
    const filter = e.target.closest('[data-adm-filter]');
    if (filter) { const s = filter.dataset.admFilter || null; setOrgFilter(s && s === activeStatus ? null : s); return; }
    const sortH = e.target.closest('[data-adm-sort]');
    if (sortH) { toggleSort(sortH.dataset.admSort); return; }
    const act = e.target.closest('[data-adm-action]');
    if (act) { closeRowMenus(null); runAction(act.dataset.admAction, act.dataset.admOrg || ''); return; }
  });
  document.addEventListener('click', (e) => {
    if (!hostEl) return;
    if (e.target.closest && e.target.closest('.adm-rowmenu')) return;
    closeRowMenus(null);
  });
  mainEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const sortH = e.target.closest('[data-adm-sort]');
    if (!sortH) return;
    e.preventDefault(); toggleSort(sortH.dataset.admSort);
  });
  mainEl.addEventListener('input', (e) => {
    const s = e.target.closest('[data-adm-search]');
    if (!s) return; query = s.value.trim().toLowerCase(); applyFilter();
  });
}

/* ==================================================================== */
/* WISEai bridge                                                        */
/* ==================================================================== */
function countFor(status) { return status ? ORGS.filter((o) => o.status === status).length : ORGS.length; }

export const ORGANIZATIONS_WISEAI = {
  sub: 'Filter, invite, and manage organizations — tap a chip or just ask.',
  chipsFlow: 'wrap',
  /* Large "at a glance" cards shown alongside the small chips on the welcome
     screen — each reuses an existing intent so a click drives the same flow. */
  scorecards: {
    label: 'Your organizations at a glance',
    cards: [
      { intent: 'show_active', icon: 'check_circle', iconTone: 'brand', pill: { tone: 'up', icon: 'filter_alt', text: 'Do next' }, title: 'Active organizations', desc: 'The orgs currently live on the platform, filtered in one tap.', action: 'Show active orgs', ask: 'Show active orgs' },
      { intent: 'add_org', icon: 'add', iconTone: 'brand', pill: { tone: 'up', icon: 'add_business', text: 'Create' }, title: 'Add an organization', desc: 'Spin up a new org — I\u2019ll ask for the company name to start.', action: 'Add an organization', ask: 'Add an organization' },
      { intent: 'quick_invite', icon: 'bolt', iconTone: 'brand', pill: { tone: 'up', icon: 'mail', text: 'Invite' }, title: 'Quick invite', desc: 'Find or create an org and send the invite in one step.', action: 'Quick invite', ask: 'Quick invite' },
      { intent: 'show_invited', icon: 'mail', iconTone: 'brand', pill: { tone: 'up', icon: 'mail', text: 'Invited' }, title: 'Invited organizations', desc: 'Orgs with an open invite still awaiting acceptance.', action: 'Show invited orgs', ask: 'Show invited orgs' },
      { intent: 'show_all', icon: 'apartment', iconTone: 'brand', pill: { tone: 'up', icon: 'apartment', text: 'All' }, title: 'All organizations', desc: 'Every org on the platform in one list.', action: 'Show all', ask: 'Show all' },
    ],
  },
  intents: [
    { intent: 'show_active',   label: 'Show active orgs',      icon: 'check_circle' },
    { intent: 'show_invited',  label: 'Show invited orgs',     icon: 'mail' },
    { intent: 'show_inactive', label: 'Show inactive orgs',    icon: 'do_not_disturb_on' },
    { intent: 'show_all',      label: 'Show all',              icon: 'apartment' },
    { intent: 'add_org',       label: 'Add an organization',   icon: 'add' },
    { intent: 'quick_invite',  label: 'Quick invite',          icon: 'bolt' },
    { intent: 'export',        label: 'Export CSV',            icon: 'download' },
  ],
  intentReplies: {
    show_active:   () => `Filtered to <strong>Active</strong> organizations — ${countFor('active')} of ${ORGS.length}.`,
    show_invited:  () => `Filtered to <strong>Invited</strong> organizations — ${countFor('invited')} with an open invite.`,
    show_inactive: () => `Filtered to <strong>Inactive</strong> organizations — ${countFor('inactive')} with no users or invites.`,
    show_all:      () => `Showing all <strong>${ORGS.length}</strong> organizations.`,
    add_org:       () => 'Let\u2019s create a new organization. What\u2019s the company name?',
    quick_invite:  () => 'Opening <strong>Quick Invite</strong> so you can find or create an org and send the invite in one step.',
    export:        () => 'Preparing a CSV export of <strong>all organizations</strong>.',
  },
  onIntent: (intent) => {
    switch (intent) {
      case 'show_active':   setOrgFilter('active'); break;
      case 'show_invited':  setOrgFilter('invited'); break;
      case 'show_inactive': setOrgFilter('inactive'); break;
      case 'show_all':      setOrgFilter(null); break;
      case 'add_org':       runAction('add-org', ''); break;
      case 'quick_invite':  window.location.href = 'quick-invite.html'; return true;
      case 'export':        toast('Exporting organizations to CSV', 'download'); break;
      default: break;
    }
    return false;
  },
};
