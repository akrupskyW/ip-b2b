import './date-column.js';

/**
 * Team — brand people for the signed-in organization.
 *
 * Rendered into #agent-main-scroll on teams.html and paired with the
 * WISEcodeAI dock. Same board language as Quick Invite: a serif page header,
 * at-a-glance status scorecards, a single search with an in-pill role filter,
 * and a history-style table whose first column is a three-dot menu.
 *
 * Seeded with the Flax4Life sample brand (three active seats matching the
 * Organizations count, plus invited / pending / deactivated rows so the
 * filters have something to show).
 *
 * Uses the shared, token-driven `adm-*` component set from wise.css.
 */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const BRANDS = [
  { name: 'Flax4Life',        color: '#2E7D5B', avatar: null,                                 seats: 10 },
  { name: 'Simple Truth',     color: '#4E7D5A', avatar: '../assets/compare/simpletruth.png',  seats: 8 },
  { name: 'Purely Elizabeth', color: '#C9736B', avatar: '../assets/compare/sug_purely.jpg',   seats: 6 },
  { name: 'Siete',            color: '#C0392B', avatar: '../assets/compare/sug_siete.jpg',    seats: 12 },
  { name: 'KIND',             color: '#E0A100', avatar: '../assets/compare/kind.jpg',         seats: 5 },
];

const STATUS_CHIP = {
  active:       { cls: 'adm-chip--green', label: 'Active' },
  invited:      { cls: 'adm-chip--blue',  label: 'Invited' },
  pending:      { cls: 'adm-chip--amber', label: 'Pending' },
  deactivated:  { cls: 'adm-chip--muted', label: 'Deactivated' },
};

const ROLE_CHIP = {
  Owner:  'adm-chip--blue',
  Admin:  'adm-chip--blue',
  Member: 'adm-chip--muted',
  Editor: 'adm-chip--muted',
  Viewer: 'adm-chip--outline',
};

const MEMBERS_BY_BRAND = {
  Flax4Life: [
    { name: 'Kasondra Shippen', email: 'kasondra@flax4life.net', role: 'Owner',  status: 'active',      when: 'Apr 18, 9:12 AM',  day: 'Apr 18, 2026', sent: 'Apr 4, 2026',  active: 'Aug 31, 2026', by: 'WISEcode' },
    { name: 'Maya Chen',        email: 'mchen@flax4life.net',    role: 'Admin',  status: 'active',      when: 'May 2, 2:40 PM',   day: 'May 2, 2026',  sent: 'Apr 25, 2026', active: 'Aug 29, 2026', by: 'Kasondra Shippen' },
    { name: 'Jordan Hale',      email: 'jhale@flax4life.net',    role: 'Member', status: 'active',      when: 'Jun 11, 10:05 AM', day: 'Jun 11, 2026', sent: 'Jun 3, 2026',  active: 'Aug 28, 2026', by: 'Maya Chen' },
    { name: 'Priya Nair',       email: 'pnair@flax4life.net',    role: 'Editor', status: 'invited',     when: 'Aug 20, 4:18 PM',  day: 'Aug 20, 2026', sent: 'Aug 20, 2026', active: '—',            by: 'Maya Chen' },
    { name: 'Riley Cho',        email: 'rcho@flax4life.net',     role: 'Member', status: 'invited',     when: 'Aug 12, 11:22 AM', day: 'Aug 12, 2026', sent: 'Aug 12, 2026', active: '—',            by: 'Kasondra Shippen' },
    { name: 'Sam Ortiz',        email: 'sortiz@flax4life.net',   role: 'Viewer', status: 'pending',     when: 'Aug 28, 8:51 AM',  day: 'Aug 28, 2026', sent: 'Aug 28, 2026', active: '—',            by: 'Maya Chen' },
    { name: 'Alex Kim',         email: 'akim@flax4life.net',     role: 'Viewer', status: 'deactivated', when: 'Jul 3, 3:14 PM',   day: 'Jul 3, 2026',  sent: 'May 10, 2026', active: 'Jul 3, 2026',  edited: 'Jul 3, 2026', by: 'Kasondra Shippen' },
  ],
  'Simple Truth': [
    { name: 'Elena Vargas', email: 'evargas@simpletruth.com', role: 'Owner',  status: 'active',  when: 'Jan 9, 11:04 AM',  day: 'Jan 9, 2026',  sent: 'Jan 2, 2026',  active: 'Aug 30, 2026', by: 'WISEcode' },
    { name: 'Chris Patel',  email: 'cpatel@simpletruth.com',  role: 'Admin',  status: 'active',  when: 'Feb 14, 3:22 PM',  day: 'Feb 14, 2026', sent: 'Feb 8, 2026',  active: 'Aug 28, 2026', by: 'Elena Vargas' },
    { name: 'Nora Singh',   email: 'nsingh@simpletruth.com',  role: 'Member', status: 'invited', when: 'Aug 22, 9:40 AM',  day: 'Aug 22, 2026', sent: 'Aug 22, 2026', active: '—',            by: 'Chris Patel' },
  ],
  'Purely Elizabeth': [
    { name: 'Elizabeth Stein', email: 'estein@purelyelizabeth.com', role: 'Owner',  status: 'active', when: 'Mar 3, 8:15 AM',  day: 'Mar 3, 2026', sent: 'Feb 20, 2026', active: 'Aug 31, 2026', by: 'WISEcode' },
    { name: 'Tom Rivera',      email: 'trivera@purelyelizabeth.com', role: 'Editor', status: 'active', when: 'Apr 7, 1:50 PM',  day: 'Apr 7, 2026', sent: 'Apr 1, 2026',  active: 'Aug 27, 2026', by: 'Elizabeth Stein' },
  ],
  Siete: [
    { name: 'Veronica Garza', email: 'vgarza@sietefoods.com', role: 'Owner',  status: 'active',  when: 'Nov 12, 10:02 AM', day: 'Nov 12, 2025', sent: 'Nov 4, 2025',  active: 'Aug 31, 2026', by: 'WISEcode' },
    { name: 'Luis Ortega',    email: 'lortega@sietefoods.com', role: 'Admin',  status: 'active',  when: 'Dec 2, 4:11 PM',   day: 'Dec 2, 2025',  sent: 'Nov 28, 2025', active: 'Aug 29, 2026', by: 'Veronica Garza' },
    { name: 'Camila Reyes',   email: 'creyes@sietefoods.com',  role: 'Member', status: 'active',  when: 'Jan 18, 9:33 AM',  day: 'Jan 18, 2026', sent: 'Jan 10, 2026', active: 'Aug 26, 2026', by: 'Luis Ortega' },
    { name: 'Diego Solis',    email: 'dsolis@sietefoods.com',  role: 'Member', status: 'pending', when: 'Aug 26, 2:05 PM',  day: 'Aug 26, 2026', sent: 'Aug 26, 2026', active: '—',            by: 'Luis Ortega' },
  ],
  KIND: [
    { name: 'Daniel Lubetzky', email: 'dlubetzky@kindsnacks.com', role: 'Owner',  status: 'active',  when: 'May 1, 8:00 AM',  day: 'May 1, 2026', sent: 'Apr 20, 2026', active: 'Aug 30, 2026', by: 'WISEcode' },
    { name: 'Jamie Cole',      email: 'jcole@kindsnacks.com',     role: 'Viewer', status: 'invited', when: 'Aug 18, 11:44 AM', day: 'Aug 18, 2026', sent: 'Aug 18, 2026', active: '—',            by: 'Daniel Lubetzky' },
  ],
};

const ROLES = ['All roles', 'Owner', 'Admin', 'Member', 'Editor', 'Viewer'];

const ARROW_SVG = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 9.5V2.5M3 6.5L6 9.5l3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function whenTs(m) {
  const time = String(m.when).split(', ').slice(1).join(' ');
  const ms = Date.parse(`${m.day} ${time}`);
  return isNaN(ms) ? 0 : ms;
}

const STATUS_ORDER = { pending: 0, invited: 1, active: 2, deactivated: 3 };

const COLS = [
  { key: 'actions', label: 'Actions',  sortable: false },
  { key: 'name',    label: 'Member',   sortable: true,  value: (m) => m.name.toLowerCase(), type: 'text' },
  { key: 'role',    label: 'Role',     sortable: true,  value: (m) => m.role.toLowerCase(), type: 'text' },
  { key: 'status',  label: 'Status',   sortable: true,  value: (m) => STATUS_ORDER[m.status] ?? 9, type: 'num' },
  { key: 'when',    label: 'Joined',   sortable: true,  value: (m) => (dc() ? dc().sortValue(memberDates(m), 'team', dateLead) : whenTs(m)), type: 'num' },
];
const GRID_COLS = '72px minmax(220px, 2.4fr) 118px 132px minmax(220px, 1.2fr)';

function initials(name) {
  return String(name).trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

let hostEl = null;
let activeStatus = null;
let query = '';
let roleFilter = 'All roles';
let sortKey = null, sortDir = 1;
let filterOpen = false;
let docListenersBound = false;
let dateLead = 'joined';
let dateLeadBound = false;
let currentBrandName = 'Flax4Life';
const currentBrand = () => BRANDS.find((b) => b.name === currentBrandName) || BRANDS[0];
const brandName = () => currentBrand().name;
function members() { return MEMBERS_BY_BRAND[currentBrandName] || MEMBERS_BY_BRAND.Flax4Life; }
function seatsLeft() {
  const used = members().filter((m) => m.status === 'active').length;
  return Math.max(0, (currentBrand().seats || 0) - used);
}
function filterCards() {
  const list = members();
  const n = (k) => list.filter((m) => m.status === k).length;
  const seats = currentBrand().seats;
  return [
    { key: null,          label: 'All',          num: list.length, sub: 'Everyone on this brand', icon: 'group',             accent: '' },
    { key: 'active',      label: 'Active',       num: n('active'), sub: 'Signed in and working',  icon: 'check',             accent: 'adm-stat--green' },
    { key: 'invited',     label: 'Invited',      num: n('invited'), sub: 'Invite still open',      icon: 'mail',              accent: 'adm-stat--blue' },
    { key: 'pending',     label: 'Pending',      num: n('pending'), sub: 'Has not confirmed yet',  icon: 'hourglass_top',     accent: 'adm-stat--amber' },
    { key: 'deactivated', label: 'Deactivated',  num: n('deactivated'), sub: 'Access turned off',  icon: 'do_not_disturb_on', accent: 'adm-stat--red' },
    { key: 'seats',       label: 'Seats left',   num: seatsLeft(), sub: `${seats} on this plan`,   icon: 'event_seat',        accent: 'adm-stat--blue', action: 'invite' },
  ];
}

function dc() { return window.WiseDateCol; }
function memberDates(m) {
  const D = dc();
  const joined = (m.status === 'active' || m.status === 'deactivated') ? m.day : '—';
  const sent = m.sent || m.day;
  const accepted = m.status === 'active' || m.status === 'deactivated' ? m.day : '—';
  const active = m.active || (m.status === 'active' ? m.day : '—');
  const edited = m.edited || (m.status === 'deactivated' ? m.day : undefined);
  const partial = { joined, sent, accepted, created: sent, active, edited };
  return D ? D.complete(partial, 'team') : partial;
}

let chatApi = null;
export function setTeamChat(api) { chatApi = api; }
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

function haystack(m) {
  const chip = STATUS_CHIP[m.status];
  return `${m.name} ${m.email} ${m.role} ${m.status} ${chip ? chip.label : ''} ${m.by} ${m.when} ${m.day} ${brandName()}`.toLowerCase();
}

function findMember(email) {
  return members().find((m) => m.email === email) || null;
}

function stampNow() {
  const d = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const h = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = (h % 12) || 12;
  return {
    when: `${months[d.getMonth()]} ${d.getDate()}, ${h12}:${mins} ${ampm}`,
    day: `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`,
  };
}

function filteredMembers() {
  return members().filter((m) => {
    if (activeStatus && m.status !== activeStatus) return false;
    if (roleFilter !== 'All roles' && m.role !== roleFilter) return false;
    if (query && !haystack(m).includes(query)) return false;
    return true;
  });
}

function activeFilterCount() {
  return roleFilter !== 'All roles' ? 1 : 0;
}

function theadHtml() {
  const D = dc();
  return COLS.map((c) => {
    const cls = `adm-th${c.end ? ' adm-th--end' : ''}${c.key === 'when' ? ' w-date-th' : ''}`;
    if (c.key === 'when' && D) {
      const inner = D.headerHtml({ kinds: 'team', lead: dateLead });
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

function rowMenuHtml(m) {
  const canResend = m.status === 'invited' || m.status === 'pending';
  const canRemove = m.role !== 'Owner';
  const items = [
    { action: 'role',   icon: 'badge',        label: 'Change role' },
    { action: 'resend', icon: 'send',         label: 'Resend invite', variant: 'primary', disabled: !canResend },
    { action: 'remove', icon: 'person_remove', label: 'Remove from team', variant: 'danger', disabled: !canRemove },
  ].map((a) =>
    `<button type="button" class="adm-rowmenu-item${a.variant ? ' adm-rowmenu-item--' + a.variant : ''}" role="menuitem" data-adm-action="${esc(a.action)}" data-adm-email="${esc(m.email)}"${a.disabled ? ' disabled' : ''}><span class="material-symbols-outlined">${esc(a.icon)}</span>${esc(a.label)}</button>`
  ).join('');
  return `<div class="adm-rowmenu"><button type="button" class="adm-rowmenu-btn" aria-haspopup="true" aria-expanded="false" aria-label="Actions"><span class="material-symbols-outlined">more_vert</span></button><div class="adm-rowmenu-pop" role="menu" hidden>${items}</div></div>`;
}

function byLabel(m) {
  if (m.status === 'deactivated') return 'Removed by';
  if (m.status === 'invited' || m.status === 'pending') return 'Invited by';
  return 'Joined by';
}

function memberRowHtml(m) {
  const chip = STATUS_CHIP[m.status];
  const roleCls = ROLE_CHIP[m.role] || 'adm-chip--muted';
  const dates = dc()
    ? `<span class="w-datecell">${dc().cellHtml(memberDates(m), 'team', dateLead)}</span>`
    : `<span class="adm-idcell-name">${esc(m.day)}</span>`;
  return `
    <div class="adm-trow" data-adm-row="${esc(m.email)}" data-no-row-click>
      <span class="adm-td adm-td--actions">${rowMenuHtml(m)}</span>
      <span class="adm-td">
        <span class="adm-idcell">
          <span class="adm-avatar adm-avatar--round">${esc(initials(m.name))}</span>
          <span class="adm-idcell-body">
            <span class="adm-idcell-name">${esc(m.name)}</span>
            <span class="adm-idcell-sub">${esc(m.email)}</span>
          </span>
        </span>
      </span>
      <span class="adm-td"><span class="adm-chip ${roleCls}">${esc(m.role)}</span></span>
      <span class="adm-td"><span class="adm-chip ${chip.cls}">${esc(chip.label)}</span></span>
      <span class="adm-td">
        <span class="adm-idcell-body">
          ${dates}
          <span class="adm-idcell-sub">${esc(byLabel(m))} ${esc(m.by)}</span>
        </span>
      </span>
    </div>`;
}

function orderedMembers() {
  const rows = filteredMembers();
  if (!sortKey) return rows;
  const col = COLS.find((c) => c.key === sortKey);
  if (!col) return rows;
  const idx = rows.map((m, n) => ({ m, n }));
  idx.sort((a, b) => {
    const av = col.value(a.m), bv = col.value(b.m);
    const r = col.type === 'text' ? String(av).localeCompare(String(bv), undefined, { numeric: true }) : (av - bv);
    return (r * sortDir) || (a.n - b.n);
  });
  return idx.map((x) => x.m);
}

function historyHtml() {
  const rows = orderedMembers();
  if (!rows.length) return '<div class="adm-empty">No teammates match these filters.</div>';
  return `
    <div class="adm-table" style="--adm-cols:${GRID_COLS}">
      <div class="adm-thead">${theadHtml()}</div>
      <div data-adm-rows>${rows.map(memberRowHtml).join('')}</div>
      <div class="adm-table-foot">Showing ${rows.length} of ${members().length} people on ${esc(brandName())}</div>
    </div>`;
}

function statsHtml() {
  return filterCards().map((f) => {
    if (f.action) {
      return `
      <button type="button" class="adm-stat${f.accent ? ' ' + f.accent : ''}" data-adm-action="${esc(f.action)}">
        <span class="adm-stat-num">${f.num}</span>
        <span class="adm-stat-label"><span class="material-symbols-outlined">${esc(f.icon)}</span>${esc(f.label)}</span>
        <span class="adm-stat-sub">${esc(f.sub)}</span>
      </button>`;
    }
    const active = f.key === activeStatus;
    return `
      <button type="button" class="adm-stat${f.accent ? ' ' + f.accent : ''}${active ? ' is-active' : ''}" data-adm-filter="${f.key == null ? '' : esc(f.key)}" aria-pressed="${active ? 'true' : 'false'}">
        <span class="adm-stat-num">${f.num}</span>
        <span class="adm-stat-label"><span class="material-symbols-outlined">${esc(f.icon)}</span>${esc(f.label)}</span>
        <span class="adm-stat-sub">${esc(f.sub)}</span>
      </button>`;
  }).join('');
}

function filterPopHtml() {
  return `
    <div class="adm-filter-pop"${filterOpen ? '' : ' hidden'} data-adm-filter-pop>
      <div class="adm-field">
        <label class="adm-field-label" for="tm-role">Role</label>
        <select id="tm-role" class="adm-select" data-adm-role aria-label="Filter by role">
          ${ROLES.map((s) => `<option${s === roleFilter ? ' selected' : ''}>${esc(s)}</option>`).join('')}
        </select>
      </div>
      <div class="adm-filter-pop-foot">
        <button type="button" class="adm-filter-clear" data-adm-action="clear-filters">Clear all</button>
        <button type="button" class="wise-btn wise-btn--ghost wise-btn--sm" data-adm-action="export"><span class="material-symbols-outlined">download</span>Export CSV</button>
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
  const list = MEMBERS_BY_BRAND[b.name] || [];
  const n = list.length;
  const left = Math.max(0, (b.seats || 0) - list.filter((m) => m.status === 'active').length);
  return `${n} people · ${left} seat${left === 1 ? '' : 's'} left`;
}

function brandChipHTML() {
  const b = currentBrand();
  const opts = BRANDS.map((brand) => {
    const on = brand.name === b.name;
    return `<button type="button" class="pf-brand-opt${on ? ' is-active' : ''}" role="option"` +
      ` data-tm="select-brand" data-brand="${esc(brand.name)}" data-name="${esc(brand.name.toLowerCase())}"` +
      ` aria-selected="${on ? 'true' : 'false'}">` +
      `${brandAvatarHTML(brand, 'pf-brand-opt-avatar')}` +
      `<span class="pf-brand-opt-text"><span class="pf-brand-opt-name">${esc(brand.name)}</span>` +
      `<span class="pf-brand-opt-meta">${esc(brandOptMeta(brand))}</span></span>` +
      `<span class="material-symbols-outlined pf-brand-opt-check" aria-hidden="true">check</span></button>`;
  }).join('');
  return `
    <div class="pf-brand" id="tm-brand">
      <button type="button" class="pf-brand-chip" id="tm-brand-chip" aria-haspopup="listbox"
        aria-expanded="false" aria-controls="tm-brand-opts" data-tm="toggle-brand">
        ${brandAvatarHTML(b, 'pf-brand-avatar')}
        <span class="pf-brand-name" id="tm-brand-name">${esc(b.name)}</span>
        <span class="material-symbols-outlined pf-brand-caret" aria-hidden="true">expand_more</span>
      </button>
      <div class="pf-brand-menu" id="tm-brand-menu" hidden>
        <div class="pf-brand-search">
          <span class="material-symbols-outlined" aria-hidden="true">search</span>
          <input type="search" id="tm-brand-search" data-tm="brand-search" placeholder="Search brands…" aria-label="Search brands" autocomplete="off" />
        </div>
        <div class="pf-brand-opts" id="tm-brand-opts" role="listbox" aria-label="Select a brand">${opts}</div>
        <div class="pf-brand-empty" id="tm-brand-empty" hidden>No brands match</div>
      </div>
    </div>`;
}

function brandMenuEl() {
  return document.getElementById('tm-brand-menu')
    || Array.from(document.querySelectorAll('.pf-brand-menu')).find((m) => m.__plHost?.id === 'tm-brand')
    || null;
}

function filterBrandMenu(q) {
  const query = String(q || '').trim().toLowerCase();
  const list = document.getElementById('tm-brand-opts')
    || brandMenuEl()?.querySelector('.pf-brand-opts');
  if (!list) return;
  let shown = 0;
  list.querySelectorAll('.pf-brand-opt').forEach((o) => {
    const match = !query || (o.getAttribute('data-name') || '').indexOf(query) !== -1;
    o.hidden = !match;
    if (match) shown++;
  });
  const empty = document.getElementById('tm-brand-empty')
    || brandMenuEl()?.querySelector('.pf-brand-empty');
  if (empty) empty.hidden = shown > 0;
}

function resetBrandSearch() {
  const input = document.getElementById('tm-brand-search')
    || brandMenuEl()?.querySelector('#tm-brand-search');
  if (input) input.value = '';
  filterBrandMenu('');
}

function closeBrandMenu() {
  const menu = brandMenuEl();
  const chip = document.getElementById('tm-brand-chip');
  if (chip) chip.setAttribute('aria-expanded', 'false');
  if (!menu) return;
  menu.setAttribute('hidden', '');
  resetBrandSearch();
}

function toggleBrandMenu() {
  const menu = brandMenuEl();
  const chip = document.getElementById('tm-brand-chip');
  if (!menu) return;
  const open = menu.hasAttribute('hidden');
  if (open) {
    resetBrandSearch();
    menu.removeAttribute('hidden');
    const input = document.getElementById('tm-brand-search')
      || menu.querySelector('#tm-brand-search');
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
  currentBrandName = next.name;
  closeBrandMenu();
  activeStatus = null;
  query = '';
  roleFilter = 'All roles';
  sortKey = null;
  sortDir = 1;
  filterOpen = false;
  paint();
  pushChat(`Showing the <strong>${esc(next.name)}</strong> team — ${seatsLeft()} seat${seatsLeft() === 1 ? '' : 's'} left on a ${next.seats}-seat plan.`);
}

function mountBrandSwitcher() {
  const controls = document.querySelector('#agent-main-header .panel-controls');
  if (!controls) {
    requestAnimationFrame(mountBrandSwitcher);
    return;
  }
  let trail = controls.querySelector('#tm-brand-trail');
  if (!trail) {
    trail = document.createElement('div');
    trail.id = 'tm-brand-trail';
    trail.className = 'pf-head-trail tm-brand-trail';
    controls.insertBefore(trail, controls.firstChild);
  }
  trail.innerHTML = brandChipHTML();
}

function wireBrandSwitcher() {
  if (typeof document === 'undefined' || document.__tmBrandWired) return;
  document.__tmBrandWired = true;
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('[data-tm="toggle-brand"]')) {
      e.stopPropagation();
      toggleBrandMenu();
      return;
    }
    const pick = t.closest('[data-tm="select-brand"]');
    if (pick) {
      e.stopPropagation();
      applyBrand(pick.getAttribute('data-brand'));
      return;
    }
    if (!t.closest('#tm-brand, .pf-brand-menu')) closeBrandMenu();
  });
  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'tm-brand-search') filterBrandMenu(e.target.value);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeBrandMenu(); return; }
    if (e.key !== 'Enter' || e.target?.id !== 'tm-brand-search') return;
    e.preventDefault();
    const first = (document.getElementById('tm-brand-opts')
      || brandMenuEl()?.querySelector('.pf-brand-opts'))
      ?.querySelector('.pf-brand-opt:not([hidden])');
    if (first) applyBrand(first.getAttribute('data-brand'));
  });
}

function paint() {
  if (!hostEl) return;
  hostEl.innerHTML = `
    <div class="adm-wrap adm-wrap--wide" data-w-date-root data-tm-board>
      <header class="adm-head">
        <div class="adm-head-row">
          <h1 class="adm-title">Team</h1>
          <button type="button" class="wise-btn wise-btn--primary" data-adm-action="invite"><span class="material-symbols-outlined">person_add</span>Invite teammate</button>
        </div>
      </header>

      <div class="adm-stats" data-tm-stats style="margin-bottom:16px">${statsHtml()}</div>

      <div class="adm-toolbar">
        <div class="adm-search-inline has-filter">
          <span class="material-symbols-outlined">search</span>
          <input type="text" class="adm-search" data-adm-search placeholder="Search name, email, role…" aria-label="Search teammates by name, email, or role" value="${esc(query)}" />
          <button type="button" class="adm-search-filter${activeFilterCount() ? ' has-dot' : ''}${filterOpen ? ' is-active' : ''}" data-adm-action="toggle-filters" aria-haspopup="true" aria-expanded="${filterOpen}" title="Filters" aria-label="Filters"><span class="material-symbols-outlined">tune</span></button>
          ${filterPopHtml()}
        </div>
      </div>

      <div class="adm-card">
        <div class="adm-table-card">
          <div data-adm-history>${historyHtml()}</div>
        </div>
      </div>
    </div>`;
  mountBrandSwitcher();
}

function applyFilter() {
  const wrap = hostEl?.querySelector('[data-adm-history]');
  if (wrap) wrap.innerHTML = historyHtml();
  const stats = hostEl?.querySelector('[data-tm-stats]');
  if (stats) stats.innerHTML = statsHtml();
  hostEl?.querySelectorAll('button[data-adm-filter]').forEach((b) => {
    const s = b.dataset.admFilter || null;
    b.classList.toggle('is-active', s === activeStatus);
    b.setAttribute('aria-pressed', s === activeStatus ? 'true' : 'false');
  });
  syncFilterUi();
}

function syncFilterUi() {
  if (!hostEl) return;
  const btn = hostEl.querySelector('[data-adm-action="toggle-filters"]');
  if (btn) {
    btn.classList.toggle('has-dot', activeFilterCount() > 0);
    btn.classList.toggle('is-active', filterOpen);
    btn.setAttribute('aria-expanded', String(filterOpen));
  }
  const sel = hostEl.querySelector('[data-adm-role]');
  if (sel && sel.value !== roleFilter) sel.value = roleFilter;
}

export function setTeamFilter(status) { activeStatus = status || null; applyFilter(); }

function toggleSort(key) {
  const col = COLS.find((c) => c.key === key);
  if (!col || !col.sortable) return;
  if (sortKey === key) sortDir = -sortDir; else { sortKey = key; sortDir = 1; }
  applyFilter();
}

function setFilterOpen(open) {
  filterOpen = open;
  const pop = hostEl?.querySelector('[data-adm-filter-pop]');
  if (pop) pop.hidden = !open;
  syncFilterUi();
}

function clearFilters() {
  roleFilter = 'All roles';
  applyFilter();
}

function closeRowMenus(keep) {
  if (!hostEl) return;
  hostEl.querySelectorAll('.adm-rowmenu.is-open').forEach((menu) => {
    if (menu === keep) return;
    menu.classList.remove('is-open');
    const btn = menu.querySelector('.adm-rowmenu-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    const pop = menu.querySelector('.adm-rowmenu-pop');
    if (pop) { pop.hidden = true; pop.style.cssText = ''; }
  });
}

function placeRowMenu(menuBtn, pop) {
  const PAD = 8;
  pop.style.position = 'fixed';
  pop.style.zIndex = '1000';
  pop.style.visibility = 'hidden';
  pop.style.right = 'auto';
  pop.hidden = false;
  const btnRect = menuBtn.getBoundingClientRect();
  const w = pop.offsetWidth, h = pop.offsetHeight;
  let left = btnRect.right + 4;
  if (left + w > window.innerWidth - PAD) left = Math.max(PAD, btnRect.left - w - 4);
  let top = btnRect.top - h - 4;
  if (top < PAD) top = Math.min(btnRect.top, window.innerHeight - h - PAD);
  top = Math.max(PAD, top);
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
  pop.style.visibility = '';
}

function nextRole(current) {
  const cycle = ['Viewer', 'Member', 'Editor', 'Admin'];
  const i = cycle.indexOf(current);
  return cycle[(i + 1) % cycle.length] || 'Member';
}

function runAction(action, email) {
  const row = email ? findMember(email) : null;
  switch (action) {
    case 'toggle-filters': setFilterOpen(!filterOpen); break;
    case 'clear-filters': clearFilters(); break;
    case 'export':
      setFilterOpen(false);
      toast(`Exporting ${brandName()} team`, 'download');
      pushChat(`Preparing a CSV of the <strong>${esc(brandName())}</strong> team — it\u2019ll download shortly.`);
      break;
    case 'invite':
      toast('Invite a teammate', 'person_add');
      pushChat(`Who should join <strong>${esc(brandName())}</strong>? Share their <strong>email</strong> and the <strong>role</strong> (Admin, Member, Editor, or Viewer) and I\u2019ll send the invite.`);
      break;
    case 'role':
      if (row && row.role !== 'Owner') {
        const next = nextRole(row.role);
        row.role = next;
        applyFilter();
        toast(`${row.name} is now ${next}`, 'badge');
        pushChat(`Updated <strong>${esc(row.name)}</strong> to <strong>${esc(next)}</strong> on ${esc(brandName())}.`);
      } else if (row) {
        toast('The owner role cannot change from here', 'lock');
      }
      break;
    case 'resend':
      if (row && (row.status === 'invited' || row.status === 'pending')) {
        const stamp = stampNow();
        row.status = 'invited';
        row.when = stamp.when;
        row.day = stamp.day;
        row.sent = stamp.day;
        applyFilter();
      }
      toast(`Invite resent · ${row ? row.name : email}`, 'send');
      pushChat(`Resent the ${esc(brandName())} invite to <strong>${esc(row ? row.name : email)}</strong>.`);
      break;
    case 'remove':
      if (row && row.role !== 'Owner') {
        row.status = 'deactivated';
        applyFilter();
        toast(`Removed ${row.name}`, 'person_remove');
        pushChat(`Removed <strong>${esc(row.name)}</strong> from the <strong>${esc(brandName())}</strong> team.`);
      }
      break;
    default: break;
  }
}

export function renderTeam(mainEl) {
  hostEl = mainEl;
  activeStatus = null; query = ''; roleFilter = 'All roles'; sortKey = null; sortDir = 1; filterOpen = false;
  if (!dateLeadBound && dc()) {
    dateLeadBound = true;
    dc().onLead(hostEl, (lead, root) => {
      if (!hostEl.querySelector('[data-tm-board]')) return;
      if (root && !hostEl.contains(root)) return;
      dateLead = lead;
      applyFilter();
    });
  }
  paint();
  wireBrandSwitcher();

  mainEl.addEventListener('click', (e) => {
    const menuBtn = e.target.closest('.adm-rowmenu-btn');
    if (menuBtn) {
      const menu = menuBtn.closest('.adm-rowmenu');
      const open = !menu.classList.contains('is-open');
      closeRowMenus(open ? menu : null);
      menu.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      const pop = menu.querySelector('.adm-rowmenu-pop');
      if (pop) {
        if (open) placeRowMenu(menuBtn, pop);
        else { pop.hidden = true; pop.style.cssText = ''; }
      }
      return;
    }
    const sortH = e.target.closest('[data-adm-sort]');
    if (sortH && !e.target.closest('.w-datemenu, .pf-datemenu')) { toggleSort(sortH.dataset.admSort); return; }
    const filter = e.target.closest('button[data-adm-filter]');
    if (filter) { const s = filter.dataset.admFilter || null; setTeamFilter(s && s === activeStatus ? null : s); return; }
    const act = e.target.closest('[data-adm-action]');
    if (act) {
      if (act.disabled) return;
      closeRowMenus(null);
      runAction(act.dataset.admAction, act.dataset.admEmail || '');
    }
  });
  mainEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const sortH = e.target.closest('[data-adm-sort]');
    if (!sortH || e.target.closest('.w-datemenu, .pf-datemenu')) return;
    e.preventDefault(); toggleSort(sortH.dataset.admSort);
  });
  mainEl.addEventListener('input', (e) => {
    const s = e.target.closest('[data-adm-search]');
    if (s) { query = s.value.trim().toLowerCase(); applyFilter(); }
  });
  mainEl.addEventListener('change', (e) => {
    const role = e.target.closest('[data-adm-role]');
    if (role) { roleFilter = role.value; applyFilter(); }
  });

  if (!docListenersBound) {
    docListenersBound = true;
    document.addEventListener('click', (e) => {
      if (filterOpen && !e.target.closest('.adm-search-inline')) setFilterOpen(false);
      if (!hostEl) return;
      if (e.target.closest && e.target.closest('.adm-rowmenu')) return;
      closeRowMenus(null);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      setFilterOpen(false);
      closeRowMenus(null);
    });
    window.addEventListener('scroll', () => closeRowMenus(null), { capture: true, passive: true });
    window.addEventListener('resize', () => closeRowMenus(null));
  }
}

export const TEAM_WISEAI = {
  sub: 'See who is on this brand, invite a teammate, or change a role — just ask.',
  chipsFlow: 'wrap',
  scorecards: {
    label: 'Your team at a glance',
    cards: [
      { intent: 'show_active', icon: 'check', iconTone: 'brand', pill: { tone: 'up', icon: 'check', text: 'Active' }, metric: '3', metricUnit: ' seats', title: 'Active teammates', desc: 'Kasondra, Maya, and Jordan are signed in on Flax4Life.', action: 'Show active', ask: 'Show active teammates' },
      { intent: 'show_invited', icon: 'mail', iconTone: 'brand', pill: { tone: 'up', icon: 'mail', text: 'Invited' }, metric: '2', metricUnit: ' open', title: 'Open invites', desc: 'Priya and Riley have not joined yet — resend from the row.', action: 'Show invited', ask: 'Show invited' },
      { intent: 'show_pending', icon: 'hourglass_top', iconTone: 'brand', pill: { tone: 'up', icon: 'hourglass_top', text: 'Pending' }, metric: '1', metricUnit: ' pending', title: 'Awaiting confirmation', desc: 'Sam has the invite but has not confirmed.', action: 'Show pending', ask: 'Show pending' },
      { intent: 'show_all', icon: 'group', iconTone: 'brand', pill: { tone: 'up', icon: 'group', text: 'All' }, metric: '7', metricUnit: ' people', title: 'Everyone on Flax4Life', desc: 'Active seats, open invites, and anyone deactivated.', action: 'Show everyone', ask: 'Show everyone' },
      { intent: 'invite', icon: 'person_add', iconTone: 'brand', pill: { tone: 'up', icon: 'person_add', text: 'Invite' }, title: 'Invite a teammate', desc: 'Send a seat on Flax4Life — I\u2019ll ask for email and role.', action: 'Invite teammate', ask: 'Invite a teammate' },
    ],
  },
  intents: [
    { intent: 'show_active',   label: 'Show active teammates', icon: 'check' },
    { intent: 'show_invited',  label: 'Show invited',          icon: 'mail' },
    { intent: 'show_pending',  label: 'Show pending',          icon: 'hourglass_top' },
    { intent: 'show_all',      label: 'Show everyone',         icon: 'group' },
    { intent: 'invite',        label: 'Invite a teammate',     icon: 'person_add' },
    { intent: 'export',        label: 'Export CSV',            icon: 'download' },
  ],
  intentReplies: {
    show_active:  () => `Filtered to <strong>Active</strong> teammates on ${esc(brandName())}.`,
    show_invited: () => `Filtered to <strong>Invited</strong> people on ${esc(brandName())}.`,
    show_pending: () => `Filtered to <strong>Pending</strong> on ${esc(brandName())}.`,
    show_all:     () => `Showing everyone on <strong>${esc(brandName())}</strong> — ${members().length} people.`,
    invite:      () => `Who should join <strong>${esc(brandName())}</strong>? Share their email and role. ${seatsLeft()} seat${seatsLeft() === 1 ? '' : 's'} left.`,
    export:      () => `Preparing a CSV of the <strong>${esc(brandName())}</strong> team.`,
  },
  onIntent: (intent) => {
    switch (intent) {
      case 'show_active':  setTeamFilter('active'); break;
      case 'show_invited': setTeamFilter('invited'); break;
      case 'show_pending': setTeamFilter('pending'); break;
      case 'show_all':     setTeamFilter(null); break;
      case 'invite':       runAction('invite', ''); break;
      case 'export':       toast(`Exporting ${brandName()} team`, 'download'); break;
      default: break;
    }
    return false;
  },
};
