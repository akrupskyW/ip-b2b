/**
 * User & Role Management — WISEcode Admin module.
 *
 * Rendered into #agent-main-scroll on user-management.html, paired with the
 * WISEai dock. A filterable directory of platform users: at-a-glance status
 * scorecards, a search with an in-pill filter popover, and a grid table whose
 * first column stacks each user's handle, email, ID, and name. Uses the shared
 * token-driven `adm-*` component set from wise.css.
 */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* beta: '' none · 'wait' waiting for access (*) · 'granted' access granted (**) */
const USERS = [
  { name: 'Arthur Krupsky',  email: 'akrupsky@wisecode.ai',        id: '019b0b57', role: 'Admin', email_status: 'confirmed', lockout: 'active', orgs: 0, beta: 'granted' },
  { name: 'Craig Anderson',  email: 'canderson@wisecode.ai',       id: '019b0b59', role: 'Admin', email_status: 'confirmed', lockout: 'active', orgs: 0, beta: '' },
  { name: 'Chad Greenleaf',  email: 'cgreenleaf@wisecode.ai',      id: '019f142d', role: 'Admin', email_status: 'confirmed', lockout: 'active', orgs: 0, beta: '' },
  { name: 'Christopher X Knoch', email: 'cknoch@wisecode.ai',      id: '019b0a06', role: 'Admin', email_status: 'confirmed', lockout: 'active', orgs: 0, beta: '' },
  { name: 'Denny',           email: 'dwebb@wisecode.ai',           id: '019a3a0', role: 'Admin', email_status: 'confirmed', lockout: 'active', orgs: 0, beta: '' },
  { name: 'Frances Martinez', email: 'fmartinez@wisecode.ai',      id: '019b8efe', role: 'Admin', email_status: 'confirmed', lockout: 'active', orgs: 0, beta: 'granted' },
  { name: 'Giuliano Tortoreto', email: 'gtortoreto@wisecode.ai',   id: '019f3e6c', role: 'Admin', email_status: 'confirmed', lockout: 'active', orgs: 0, beta: 'granted' },
  { name: 'Kevin Jones',     email: 'kjones+arti@wisecode.ai',     id: '019f6d5b', role: '',      email_status: 'pending',   lockout: 'active', orgs: 0, beta: '' },
  { name: 'Kevin Jones',     email: 'kjones+emailtest@wisecode.ai', id: '019f24b3', role: 'User',  email_status: 'confirmed', lockout: 'active', orgs: 1, beta: '' },
  { name: 'Kevin Jones',     email: 'kjones+magicdump2@wisecode.ai', id: '019f7a11', role: 'User',  email_status: 'confirmed', lockout: 'locked', orgs: 2, beta: 'wait' },
  { name: 'Maya Chen',       email: 'mchen+brand@flax4life.com',   id: '01a2c410', role: 'User',  email_status: 'confirmed', lockout: 'active', orgs: 1, beta: 'wait' },
  { name: 'Rob Simmermon',   email: 'rsimmermon@wisecode.ai',      id: '019c88a2', role: 'Admin', email_status: 'confirmed', lockout: 'active', orgs: 0, beta: 'granted' },
];

const ROLE_CHIP = {
  Admin: 'adm-chip--blue',
  User:  'adm-chip--muted',
};

const FILTERS = {
  role:    { label: 'All Roles',        icon: 'badge',        opts: ['All Roles', 'Admin', 'User', 'No roles'] },
  email:   { label: 'All Email Status', icon: 'mark_email_read', opts: ['All Email Status', 'Confirmed', 'Pending'] },
  lockout: { label: 'All Lockout',      icon: 'lock',         opts: ['All Lockout', 'Active', 'Locked'] },
  waitlist: { label: 'All Waitlists',   icon: 'schedule',     opts: ['All Waitlists', 'Waiting for access', 'Access granted'] },
};
const FILTER_DEFAULTS = { role: 'All Roles', email: 'All Email Status', lockout: 'All Lockout', waitlist: 'All Waitlists' };

/* ---- Status scorecards -----------------------------------------------
   Each tile maps to a single filter dimension/value; clicking it toggles
   that filter. `dim: null` is the "Total" reset tile. Counts are derived
   from the loaded USERS so the tile numbers always match the visible rows. */
const STATS = [
  { id: 'total',     dim: null,       val: null,                icon: 'group',             label: 'Total Users',  accent: '' },
  { id: 'admins',    dim: 'role',     val: 'Admin',             icon: 'badge',             label: 'Admins',       accent: 'adm-stat--blue' },
  { id: 'members',   dim: 'role',     val: 'User',              icon: 'person',            label: 'Members',      accent: '' },
  { id: 'confirmed', dim: 'email',    val: 'Confirmed',         icon: 'mark_email_read',   label: 'Confirmed',    accent: 'adm-stat--green' },
  { id: 'pending',   dim: 'email',    val: 'Pending',           icon: 'mark_email_unread', label: 'Pending',      accent: 'adm-stat--amber' },
  { id: 'locked',    dim: 'lockout',  val: 'Locked',            icon: 'lock',              label: 'Locked',       accent: 'adm-stat--red' },
  { id: 'waitlist',  dim: 'waitlist', val: 'Waiting for access', icon: 'schedule',         label: 'Waiting Beta', accent: 'adm-stat--amber' },
  { id: 'granted',   dim: 'waitlist', val: 'Access granted',    icon: 'verified',          label: 'Beta Granted', accent: 'adm-stat--green' },
];

function dimMatch(dim, val, u) {
  switch (dim) {
    case 'role':
      if (val === 'Admin') return u.role === 'Admin';
      if (val === 'User') return u.role === 'User';
      if (val === 'No roles') return u.role === '';
      return true;
    case 'email':
      if (val === 'Confirmed') return u.email_status === 'confirmed';
      if (val === 'Pending') return u.email_status === 'pending';
      return true;
    case 'lockout':
      if (val === 'Active') return u.lockout === 'active';
      if (val === 'Locked') return u.lockout === 'locked';
      return true;
    case 'waitlist':
      if (val === 'Waiting for access') return u.beta === 'wait';
      if (val === 'Access granted') return u.beta === 'granted';
      return true;
    default:
      return true;
  }
}
function statCount(s) { return s.dim == null ? USERS.length : USERS.filter((u) => dimMatch(s.dim, s.val, u)).length; }

function initials(name) {
  return String(name).trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}
function betaMark(b) { return b === 'granted' ? '**' : b === 'wait' ? '*' : ''; }
function handle(email) { return String(email).split('@')[0]; }

const COLS = [
  { key: 'name',    label: 'User',         sortable: true,  value: (u) => handle(u.email).toLowerCase(), type: 'text' },
  { key: 'role',    label: 'Roles',        sortable: true,  value: (u) => u.role, type: 'text' },
  { key: 'email_status', label: 'Email Status', sortable: true, value: (u) => u.email_status, type: 'text' },
  { key: 'lockout', label: 'Lockout',      sortable: true,  value: (u) => u.lockout, type: 'text' },
  { key: 'orgs',    label: 'Orgs',         sortable: true,  value: (u) => u.orgs, type: 'num', num: true },
  { key: 'actions', label: 'Actions',      sortable: false, end: true },
];
const GRID_COLS = 'minmax(240px, 2.6fr) 96px 132px 108px 64px 84px';
const ARROW_SVG = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 9.5V2.5M3 6.5L6 9.5l3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

let hostEl = null;
let query = '';
let filters = { ...FILTER_DEFAULTS };
let sortKey = null, sortDir = 1;
let filterOpen = false;
let docListenersBound = false;

let chatApi = null;
export function setUserManagementChat(api) { chatApi = api; }
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
function matches(u) {
  if (query && !`${u.name} ${u.email} ${u.role} ${u.id}`.toLowerCase().includes(query)) return false;
  if (filters.role === 'Admin' && u.role !== 'Admin') return false;
  if (filters.role === 'User' && u.role !== 'User') return false;
  if (filters.role === 'No roles' && u.role !== '') return false;
  if (filters.email === 'Confirmed' && u.email_status !== 'confirmed') return false;
  if (filters.email === 'Pending' && u.email_status !== 'pending') return false;
  if (filters.lockout === 'Active' && u.lockout !== 'active') return false;
  if (filters.lockout === 'Locked' && u.lockout !== 'locked') return false;
  if (filters.waitlist === 'Waiting for access' && u.beta !== 'wait') return false;
  if (filters.waitlist === 'Access granted' && u.beta !== 'granted') return false;
  return true;
}

function activeFilterCount() {
  return Object.keys(FILTER_DEFAULTS).filter((k) => filters[k] !== FILTER_DEFAULTS[k]).length;
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

function statsHtml() {
  return STATS.map((s) => {
    const active = s.dim == null ? activeFilterCount() === 0 : filters[s.dim] === s.val;
    return `
      <button type="button" class="adm-stat${s.accent ? ' ' + s.accent : ''}${active ? ' is-active' : ''}" data-adm-stat="${esc(s.id)}" aria-pressed="${active ? 'true' : 'false'}">
        <span class="adm-stat-num">${statCount(s)}</span>
        <span class="adm-stat-label"><span class="material-icons">${esc(s.icon)}</span>${esc(s.label)}</span>
      </button>`;
  }).join('');
}

function rowHtml(u) {
  const roleCell = u.role
    ? `<span class="adm-chip ${ROLE_CHIP[u.role]}">${esc(u.role)}</span>`
    : `<span class="adm-chip adm-chip--outline">No roles</span>`;
  const emailStatus = u.email_status === 'confirmed'
    ? '<span class="adm-chip adm-chip--green"><span class="material-icons">check_circle</span>Confirmed</span>'
    : '<span class="adm-chip adm-chip--amber"><span class="material-icons">hourglass_top</span>Pending</span>';
  const lockout = u.lockout === 'active'
    ? '<span class="adm-chip adm-chip--green"><span class="material-icons">lock_open</span>Active</span>'
    : '<span class="adm-chip adm-chip--red"><span class="material-icons">lock</span>Locked</span>';
  const mark = betaMark(u.beta);
  return `
    <div class="adm-trow" data-adm-row="${esc(u.email)}">
      <span class="adm-td">
        <span class="adm-idcell" style="align-items:flex-start">
          <span class="adm-avatar adm-avatar--round" style="margin-top:2px">${esc(initials(u.name))}</span>
          <span class="adm-idcell-body">
            <span class="adm-idcell-name">${esc(handle(u.email))}${mark ? `<span style="color:var(--primary)">${mark}</span>` : ''}</span>
            <span class="adm-idcell-sub">${esc(u.email)}</span>
            <span class="adm-idcell-sub">ID: ${esc(u.id)}</span>
            <span class="adm-idcell-sub">${esc(u.name)}</span>
          </span>
        </span>
      </span>
      <span class="adm-td">${roleCell}</span>
      <span class="adm-td">${emailStatus}</span>
      <span class="adm-td">${lockout}</span>
      <span class="adm-td adm-td--num${u.orgs ? ' is-hot' : ''}">${u.orgs}</span>
      <span class="adm-td adm-td--end"><span class="adm-actions"><button type="button" class="adm-icon-btn" title="Edit user" data-adm-action="edit" data-adm-user="${esc(u.email)}"><span class="material-icons">edit</span></button></span></span>
    </div>`;
}

function orderedUsers() {
  if (!sortKey) return USERS.slice();
  const col = COLS.find((c) => c.key === sortKey);
  if (!col) return USERS.slice();
  const idx = USERS.map((u, i) => ({ u, i }));
  idx.sort((a, b) => {
    const av = col.value(a.u), bv = col.value(b.u);
    let r = col.type === 'text' ? String(av).localeCompare(String(bv), undefined, { numeric: true }) : (av - bv);
    return (r * sortDir) || (a.i - b.i);
  });
  return idx.map((x) => x.u);
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
      ${selectHtml('role')}
      ${selectHtml('email')}
      ${selectHtml('lockout')}
      ${selectHtml('waitlist')}
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
            <h1 class="adm-title">User &amp; Role Management</h1>
            <p class="adm-lede" data-adm-count>Showing ${USERS.length} of 40 users · 3 roles</p>
          </div>
          <div class="adm-head-actions">
            <button type="button" class="adm-btn adm-btn--primary" data-adm-action="new-user"><span class="material-icons">person_add</span>New User</button>
          </div>
        </div>
      </header>

      <div class="adm-stats" style="margin-bottom:16px">${statsHtml()}</div>

      <div class="adm-toolbar">
        <div class="adm-search-inline has-filter">
          <span class="material-icons">search</span>
          <input type="text" class="adm-search" data-adm-search placeholder="Search users…" aria-label="Search users" value="${esc(query)}" />
          <button type="button" class="adm-search-filter${activeFilterCount() ? ' has-dot' : ''}${filterOpen ? ' is-active' : ''}" data-adm-action="toggle-filters" aria-haspopup="true" aria-expanded="${filterOpen}" title="Filters" aria-label="Filters"><span class="material-icons">tune</span></button>
          ${filterPopHtml()}
        </div>
      </div>
      <p class="adm-lede" style="margin:-8px 2px 14px;font-size:0.76rem"><span style="color:var(--primary)">*</span> Waiting for beta access &nbsp;&nbsp; <span style="color:var(--primary)">**</span> Beta access granted</p>

      <div class="adm-card">
        <div class="adm-table-card">
          <div class="adm-table" style="--adm-cols:${GRID_COLS}">
            <div class="adm-thead">${theadHtml()}</div>
            <div data-adm-rows>${orderedUsers().map(rowHtml).join('')}</div>
            <div class="adm-table-foot"><span data-adm-foot></span></div>
          </div>
        </div>
      </div>
    </div>`;
  applyFilter();
}

function applyFilter() {
  if (!hostEl) return;
  let shown = 0;
  USERS.forEach((u) => {
    const row = hostEl.querySelector(`[data-adm-row="${CSS.escape(u.email)}"]`);
    if (!row) return;
    const ok = matches(u);
    row.classList.toggle('adm-row-hidden', !ok);
    if (ok) shown++;
  });
  const foot = hostEl.querySelector('[data-adm-foot]');
  if (foot) foot.textContent = `Showing ${shown} of ${USERS.length} loaded users`;
  syncFilterUi();
}

/* Keep the scorecards, the in-search filter button (active + "has changes"
   dot), and the popover selects all in sync with the live filter state. */
function syncFilterUi() {
  if (!hostEl) return;
  const btn = hostEl.querySelector('[data-adm-action="toggle-filters"]');
  if (btn) { btn.classList.toggle('has-dot', activeFilterCount() > 0); btn.classList.toggle('is-active', filterOpen); btn.setAttribute('aria-expanded', String(filterOpen)); }
  Object.keys(FILTER_DEFAULTS).forEach((k) => {
    const sel = hostEl.querySelector(`[data-adm-filter="${k}"]`);
    if (sel && sel.value !== filters[k]) sel.value = filters[k];
  });
  STATS.forEach((s) => {
    const tile = hostEl.querySelector(`[data-adm-stat="${s.id}"]`);
    if (!tile) return;
    const active = s.dim == null ? activeFilterCount() === 0 : filters[s.dim] === s.val;
    tile.classList.toggle('is-active', active);
    tile.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function applySort() {
  const rows = hostEl?.querySelector('[data-adm-rows]');
  if (rows) rows.innerHTML = orderedUsers().map(rowHtml).join('');
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

/* ---- Filter popover ------------------------------------------------- */
function setFilterOpen(open) {
  filterOpen = open;
  const pop = hostEl?.querySelector('[data-adm-filter-pop]');
  if (pop) pop.hidden = !open;
  syncFilterUi();
}
function clearFilters() {
  filters = { ...FILTER_DEFAULTS };
  applyFilter();
}

/* ---- Scorecard → filter -------------------------------------------- */
function toggleStat(id) {
  const s = STATS.find((x) => x.id === id);
  if (!s) return;
  if (s.dim == null) { filters = { ...FILTER_DEFAULTS }; }
  else { filters[s.dim] = filters[s.dim] === s.val ? FILTER_DEFAULTS[s.dim] : s.val; }
  applyFilter();
}

export function setUserFilter(key, value) {
  if (!(key in filters)) return;
  filters[key] = value;
  applyFilter();
}

function runAction(action, user) {
  switch (action) {
    case 'new-user': toast('New user', 'person_add'); pushChat('Let\u2019s add a user. Share their <strong>email</strong> and the <strong>role</strong> (Admin or User) and I\u2019ll provision the account.'); break;
    case 'toggle-filters': setFilterOpen(!filterOpen); break;
    case 'apply-filters': setFilterOpen(false); break;
    case 'clear-filters': clearFilters(); break;
    case 'edit': toast(`Editing ${user}`, 'edit'); pushChat(`Editing <strong>${esc(user)}</strong> — change roles, reset lockout, confirm email, or grant beta access.`); break;
    default: break;
  }
}

export function renderUserManagement(mainEl) {
  hostEl = mainEl;
  query = ''; filters = { ...FILTER_DEFAULTS }; sortKey = null; sortDir = 1; filterOpen = false;
  paint();

  mainEl.addEventListener('click', (e) => {
    const sortH = e.target.closest('[data-adm-sort]');
    if (sortH) { toggleSort(sortH.dataset.admSort); return; }
    const stat = e.target.closest('[data-adm-stat]');
    if (stat) { toggleStat(stat.dataset.admStat); return; }
    const act = e.target.closest('[data-adm-action]');
    if (act) { e.preventDefault(); runAction(act.dataset.admAction, act.dataset.admUser || ''); return; }
  });
  mainEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const sortH = e.target.closest('[data-adm-sort]');
    if (!sortH) return;
    e.preventDefault(); toggleSort(sortH.dataset.admSort);
  });
  mainEl.addEventListener('input', (e) => {
    const s = e.target.closest('[data-adm-search]');
    if (s) { query = s.value.trim().toLowerCase(); applyFilter(); }
  });
  mainEl.addEventListener('change', (e) => {
    const sel = e.target.closest('[data-adm-filter]');
    if (sel) { filters[sel.dataset.admFilter] = sel.value; applyFilter(); }
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
function countRole(role) { return USERS.filter((u) => (role === 'No roles' ? u.role === '' : u.role === role)).length; }

export const USER_MANAGEMENT_WISEAI = {
  sub: 'Find users, filter by role or status, and manage access — just ask.',
  chipsFlow: 'wrap',
  /* Large "at a glance" cards shown alongside the small chips on the welcome
     screen — each reuses an existing intent so a click drives the same flow. */
  scorecards: {
    label: 'Your users at a glance',
    cards: [
      { intent: 'show_pending', icon: 'mark_email_unread', iconTone: 'brand', pill: { tone: 'up', icon: 'priority_high', text: 'Do next' }, title: 'Pending email confirmation', desc: 'Users who haven\u2019t confirmed yet — nudge or resend from the row.', action: 'Show pending email', ask: 'Pending email' },
      { intent: 'show_locked', icon: 'lock', iconTone: 'brand', pill: { tone: 'up', icon: 'lock_open', text: 'Resolve' }, title: 'Locked-out accounts', desc: 'Resolve a lockout from the row edit action.', action: 'Show locked out', ask: 'Locked out' },
      { intent: 'show_admins', icon: 'badge', iconTone: 'brand', pill: { tone: 'up', icon: 'badge', text: 'Filter' }, title: 'Show admins', desc: 'Filter to admin users across your organization.', action: 'Show admins', ask: 'Show admins' },
      { intent: 'show_all', icon: 'group', iconTone: 'brand', pill: { tone: 'up', icon: 'group', text: 'All' }, title: 'All users', desc: 'Every loaded user in one list.', action: 'Show all users', ask: 'Show all users' },
      { intent: 'new_user', icon: 'person_add', iconTone: 'brand', pill: { tone: 'up', icon: 'person_add', text: 'Add' }, title: 'Add a user', desc: 'Invite someone new — I\u2019ll ask for their email and role.', action: 'Add a user', ask: 'Add a user' },
    ],
  },
  intents: [
    { intent: 'show_admins',   label: 'Show admins',           icon: 'badge' },
    { intent: 'show_pending',  label: 'Pending email',         icon: 'mark_email_unread' },
    { intent: 'show_locked',   label: 'Locked out',            icon: 'lock' },
    { intent: 'show_waitlist', label: 'Waiting for beta',      icon: 'schedule' },
    { intent: 'show_all',      label: 'Show all users',        icon: 'group' },
    { intent: 'new_user',      label: 'Add a user',            icon: 'person_add' },
  ],
  intentReplies: {
    show_admins:   () => `Filtered to <strong>Admin</strong> users — ${countRole('Admin')} loaded.`,
    show_pending:  () => `Filtered to users with a <strong>Pending</strong> email confirmation.`,
    show_locked:   () => `Filtered to <strong>Locked</strong> accounts — resolve a lockout from the row edit action.`,
    show_waitlist: () => 'Filtered to users <strong>waiting for beta access</strong> (marked *).',
    show_all:      () => `Showing all <strong>${USERS.length}</strong> loaded users.`,
    new_user:      () => 'Let\u2019s add a user. What\u2019s their email and role?',
  },
  onIntent: (intent) => {
    switch (intent) {
      case 'show_admins':   setUserFilter('role', 'Admin'); break;
      case 'show_pending':  setUserFilter('email', 'Pending'); break;
      case 'show_locked':   setUserFilter('lockout', 'Locked'); break;
      case 'show_waitlist': setUserFilter('waitlist', 'Waiting for access'); break;
      case 'show_all':      filters = { ...FILTER_DEFAULTS }; applyFilter(); break;
      case 'new_user':      runAction('new-user', ''); break;
      default: break;
    }
    return false;
  },
};
