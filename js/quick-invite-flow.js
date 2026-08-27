/**
 * Quick Invite — WISEcode Admin module.
 *
 * Rendered into #agent-main-scroll on quick-invite.html and paired with the
 * WISEcodeAI dock. A serif page header, at-a-glance status scorecards, a single
 * search (name, email, org, salesperson, status) with an in-pill filter for
 * salesperson + CSV export, and a history table whose first column is a
 * three-dot menu (copy link, resend, cancel).
 *
 * Uses the shared, token-driven `adm-*` component set from wise.css.
 */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const STATUS_CHIP = {
  sent:      { cls: 'adm-chip--blue',  label: 'Sent' },
  accepted:  { cls: 'adm-chip--green', label: 'Accepted' },
  pending:   { cls: 'adm-chip--amber', label: 'Pending' },
  expired:   { cls: 'adm-chip--muted', label: 'Expired' },
  cancelled: { cls: 'adm-chip--red',   label: 'Cancelled' },
};

/* Status scorecards across the history board — these are the status filters. */
const FILTERS = [
  { key: null,        label: 'All',       num: 24, sub: 'All invitations',   icon: 'history',       accent: '' },
  { key: 'pending',   label: 'Pending',   num: 4,  sub: 'Awaiting response',  icon: 'hourglass_top', accent: 'adm-stat--amber' },
  { key: 'accepted',  label: 'Accepted',  num: 5,  sub: 'Have joined',        icon: 'check',  accent: 'adm-stat--green' },
  { key: 'expired',   label: 'Expired',   num: 3,  sub: 'Past 7 days',        icon: 'schedule',      accent: '' },
  { key: 'cancelled', label: 'Cancelled', num: 12, sub: 'No longer valid',    icon: 'cancel',        accent: 'adm-stat--red' },
];

const INVITES = [
  { name: 'Kelly Z Crackers', email: 'kswanzy+magiczcrackers@wise…', org: 'Z Crackers',     status: 'sent',      when: 'Jul 30, 1:55 PM', day: 'Jul 30, 2026', by: 'Kelly Swanzy' },
  { name: 'Kelly Wai Lana',   email: 'kswanzy+magicwailanasnacks@…', org: 'Wai Lana Snacks', status: 'sent',      when: 'Jul 30, 1:49 PM', day: 'Jul 30, 2026', by: 'Kelly Swanzy' },
  { name: 'Kelly Snackios',   email: 'kswanzy+magicsnackios@wisec…', org: 'Snackios',        status: 'sent',      when: 'Jul 30, 12:56 PM', day: 'Jul 30, 2026', by: 'Kelly Swanzy' },
  { name: 'Rob Simmermon',    email: 'rsimmermon+aboottest@wisec…',  org: "Abbot's Butcher", status: 'sent',      when: 'Jul 29, 9:35 AM', day: 'Jul 29, 2026', by: 'Rob Simmermon' },
  { name: 'Rob Simmermon',    email: 'rsimmermon+testinvite@wiseco…', org: 'Vive Juicery',   status: 'cancelled', when: 'Jul 17, 11:20 AM', day: 'Jul 17, 2026', by: 'Rob Simmermon' },
  { name: 'Ada Applegate',    email: 'aapplegate+beta@wisecode.ai',  org: 'Applegate',       status: 'accepted',  when: 'Jul 17, 10:02 AM', day: 'Jul 17, 2026', by: 'Kelly Swanzy' },
  { name: 'Tom Arti',         email: 'tarti+launch@wisecode.ai',     org: 'Arti Bars',       status: 'pending',   when: 'Jul 17, 9:41 AM', day: 'Jul 17, 2026', by: 'Rob Simmermon' },
  { name: 'Nina Tropic',      email: 'ntropic+trial@wisecode.ai',    org: 'Artisan Tropic',  status: 'expired',   when: 'Jul 17, 9:10 AM', day: 'Jul 17, 2026', by: 'Rob Simmermon' },
];

const SALESPEOPLE = ['All salespeople', 'Kelly Swanzy', 'Rob Simmermon'];

const ARROW_SVG = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 9.5V2.5M3 6.5L6 9.5l3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* A sortable timestamp built from the invite's day (has the year) + the time
   portion of `when`, e.g. "Jul 30, 2026" + "1:55 PM" → a parseable datetime. */
function whenTs(i) {
  const time = String(i.when).split(', ').slice(1).join(' ');
  const ms = Date.parse(`${i.day} ${time}`);
  return isNaN(ms) ? 0 : ms;
}

const STATUS_ORDER = { pending: 0, sent: 1, accepted: 2, expired: 3, cancelled: 4 };

const COLS = [
  { key: 'actions', label: 'Actions',     sortable: false },
  { key: 'name',    label: 'Invitee',     sortable: true,  value: (i) => i.name.toLowerCase(), type: 'text' },
  { key: 'org',     label: 'Organization', sortable: true, value: (i) => i.org.toLowerCase(),  type: 'text' },
  { key: 'status',  label: 'Status',      sortable: true,  value: (i) => STATUS_ORDER[i.status] ?? 9, type: 'num' },
  { key: 'when',    label: 'Sent',        sortable: true,  value: (i) => (dc() ? dc().sortValue(inviteDates(i), 'invite', dateLead) : whenTs(i)), type: 'num' },
];
const GRID_COLS = '72px minmax(220px, 2.4fr) minmax(150px, 1.3fr) 118px minmax(186px, 1.15fr)';

function initials(name) {
  return String(name).trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

let hostEl = null;
let activeStatus = null;
let query = '';
let salesperson = 'All salespeople';
let sortKey = null, sortDir = 1;
let filterOpen = false;
let docListenersBound = false;
let dateLead = 'sent';
let dateLeadBound = false;

function dc() { return window.WiseDateCol; }
function inviteDates(i) {
  const D = dc();
  const sent = i.day;
  const accepted = i.status === 'accepted' ? i.day : '—';
  const t = Date.parse(sent);
  const expires = (D && !isNaN(t)) ? D.fmtDate(t + 7 * 86400000) : sent;
  const partial = { sent, created: sent, edited: sent, expires, accepted };
  return D ? D.complete(partial, 'invite') : partial;
}

/* ---- Chat bridge + toast -------------------------------------------- */
let chatApi = null;
export function setQuickInviteChat(api) { chatApi = api; }
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

function haystack(i) {
  const chip = STATUS_CHIP[i.status];
  return `${i.name} ${i.email} ${i.org} ${i.status} ${chip ? chip.label : ''} ${i.by} ${i.when} ${i.day}`.toLowerCase();
}

function findInvite(org, email) {
  return INVITES.find((i) => i.org === org && (!email || i.email === email)) || null;
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

function inviteLink(org) {
  return `https://app.wisecode.ai/invite/${encodeURIComponent(org)}`;
}

/* ==================================================================== */
function filteredInvites() {
  return INVITES.filter((i) => {
    if (activeStatus && i.status !== activeStatus) return false;
    if (salesperson !== 'All salespeople' && i.by !== salesperson) return false;
    if (query && !haystack(i).includes(query)) return false;
    return true;
  });
}

function activeFilterCount() {
  return salesperson !== 'All salespeople' ? 1 : 0;
}

function theadHtml() {
  const D = dc();
  return COLS.map((c) => {
    const cls = `adm-th${c.end ? ' adm-th--end' : ''}${c.key === 'when' ? ' w-date-th' : ''}`;
    if (c.key === 'when' && D) {
      const inner = D.headerHtml({ kinds: 'invite', lead: dateLead });
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

function rowMenuHtml(i) {
  const canCancel = i.status === 'sent' || i.status === 'pending';
  const items = [
    { action: 'copy',   icon: 'link',   label: 'Copy invite link' },
    { action: 'resend', icon: 'send',   label: 'Resend invite', variant: 'primary' },
    { action: 'cancel', icon: 'cancel', label: 'Cancel invite', variant: 'danger', disabled: !canCancel },
  ].map((a) =>
    `<button type="button" class="adm-rowmenu-item${a.variant ? ' adm-rowmenu-item--' + a.variant : ''}" role="menuitem" data-adm-action="${esc(a.action)}" data-adm-org="${esc(i.org)}" data-adm-email="${esc(i.email)}"${a.disabled ? ' disabled' : ''}><span class="material-symbols-outlined">${esc(a.icon)}</span>${esc(a.label)}</button>`
  ).join('');
  return `<div class="adm-rowmenu"><button type="button" class="adm-rowmenu-btn" aria-haspopup="true" aria-expanded="false" aria-label="Actions"><span class="material-symbols-outlined">more_vert</span></button><div class="adm-rowmenu-pop" role="menu" hidden>${items}</div></div>`;
}

function inviteRowHtml(i) {
  const chip = STATUS_CHIP[i.status];
  return `
    <div class="adm-trow" data-adm-row="${esc(i.email)}" data-adm-org="${esc(i.org)}">
      <span class="adm-td adm-td--actions">${rowMenuHtml(i)}</span>
      <span class="adm-td">
        <span class="adm-idcell">
          <span class="adm-avatar adm-avatar--round">${esc(initials(i.name))}</span>
          <span class="adm-idcell-body">
            <span class="adm-idcell-name">${esc(i.name)}</span>
            <span class="adm-idcell-sub">${esc(i.email)}</span>
          </span>
        </span>
      </span>
      <span class="adm-td"><span class="adm-idcell" style="gap:6px"><span class="material-symbols-outlined" style="font-size:15px;color:var(--text-subtle)">apartment</span>${esc(i.org)}</span></span>
      <span class="adm-td"><span class="adm-chip ${chip.cls}">${esc(chip.label)}</span></span>
      <span class="adm-td">
        <span class="adm-idcell-body">
          <span class="w-datecell">${dc() ? dc().cellHtml(inviteDates(i), 'invite', dateLead) : esc(i.when)}</span>
          <span class="adm-idcell-sub">by ${esc(i.by)}</span>
        </span>
      </span>
    </div>`;
}

function orderedInvites() {
  const rows = filteredInvites();
  if (!sortKey) return rows;
  const col = COLS.find((c) => c.key === sortKey);
  if (!col) return rows;
  const idx = rows.map((i, n) => ({ i, n }));
  idx.sort((a, b) => {
    const av = col.value(a.i), bv = col.value(b.i);
    const r = col.type === 'text' ? String(av).localeCompare(String(bv), undefined, { numeric: true }) : (av - bv);
    return (r * sortDir) || (a.n - b.n);
  });
  return idx.map((x) => x.i);
}

function historyHtml() {
  const rows = orderedInvites();
  if (!rows.length) return '<div class="adm-empty">No invitations match these filters.</div>';
  return `
    <div class="adm-table" style="--adm-cols:${GRID_COLS}">
      <div class="adm-thead">${theadHtml()}</div>
      <div data-adm-rows>${rows.map(inviteRowHtml).join('')}</div>
      <div class="adm-table-foot">Showing ${rows.length} of ${INVITES.length} invitations</div>
    </div>`;
}

function statsHtml() {
  return FILTERS.map((f) => {
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
        <label class="adm-field-label" for="qi-salesperson">Salesperson</label>
        <select id="qi-salesperson" class="adm-select" data-adm-salesperson aria-label="Filter by salesperson">
          ${SALESPEOPLE.map((s) => `<option${s === salesperson ? ' selected' : ''}>${esc(s)}</option>`).join('')}
        </select>
      </div>
      <div class="adm-filter-pop-foot">
        <button type="button" class="adm-filter-clear" data-adm-action="clear-filters">Clear all</button>
        <button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" data-adm-action="export"><span class="material-symbols-outlined">download</span>Export CSV</button>
      </div>
    </div>`;
}

function paint() {
  if (!hostEl) return;
  hostEl.innerHTML = `
    <div class="adm-wrap adm-wrap--wide" data-w-date-root data-qi-board>
      <header class="adm-head">
        <div class="adm-head-row">
          <div>
            <h1 class="adm-title">Quick Invite</h1>
          </div>
        </div>
      </header>

      <div class="adm-stats" style="margin-bottom:16px">${statsHtml()}</div>

      <div class="adm-toolbar">
        <div class="adm-search-inline has-filter">
          <span class="material-symbols-outlined">search</span>
          <input type="text" class="adm-search" data-adm-search placeholder="Search name, email, organization…" aria-label="Search invites by name, email, or organization" value="${esc(query)}" />
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
}

function applyFilter() {
  const wrap = hostEl?.querySelector('[data-adm-history]');
  if (wrap) wrap.innerHTML = historyHtml();
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
  const sel = hostEl.querySelector('[data-adm-salesperson]');
  if (sel && sel.value !== salesperson) sel.value = salesperson;
}

export function setInviteFilter(status) { activeStatus = status || null; applyFilter(); }

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
  salesperson = 'All salespeople';
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

/* Anchor the menu to the button with fixed positioning so it can never be
   clipped by the scrollable main pane. Opens to the right of the kebab, or
   above when there isn't room — never parked directly under the trigger. */
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

function runAction(action, org, email) {
  const row = org ? findInvite(org, email) : null;
  switch (action) {
    case 'toggle-filters': setFilterOpen(!filterOpen); break;
    case 'clear-filters': clearFilters(); break;
    case 'export':
      setFilterOpen(false);
      toast('Exporting invite history', 'download');
      pushChat('Preparing a CSV of your <strong>invite history</strong> — it\u2019ll download shortly.');
      break;
    case 'copy':
      try { navigator.clipboard.writeText(inviteLink(org)); } catch (e) { /* clipboard unavailable */ }
      toast(`Invite link copied · ${org}`, 'link');
      pushChat(`Copied the invite link for <strong>${esc(org)}</strong>. Paste it into an email or Slack to send it on.`);
      break;
    case 'resend':
      if (row) {
        const stamp = stampNow();
        row.status = 'sent';
        row.when = stamp.when;
        row.day = stamp.day;
        applyFilter();
      }
      toast(`Invite resent · ${org}`, 'send');
      pushChat(`Resent the invitation for <strong>${esc(org)}</strong>. I\u2019ll flag it under <em>Need attention</em> if it isn\u2019t accepted within 7 days.`);
      break;
    case 'cancel':
      if (row && (row.status === 'sent' || row.status === 'pending')) {
        row.status = 'cancelled';
        applyFilter();
      }
      toast(`Invite cancelled · ${org}`, 'cancel');
      pushChat(`Cancelled the pending invite for <strong>${esc(org)}</strong>.`);
      break;
    default: break;
  }
}

export function renderQuickInvite(mainEl) {
  hostEl = mainEl;
  activeStatus = null; query = ''; salesperson = 'All salespeople'; sortKey = null; sortDir = 1; filterOpen = false;
  if (!dateLeadBound && dc()) {
    dateLeadBound = true;
    dc().onLead(hostEl, (lead, root) => {
      if (!hostEl.querySelector('[data-qi-board]')) return;
      if (root && !hostEl.contains(root)) return;
      dateLead = lead;
      applyFilter();
    });
  }
  paint();

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
    if (filter) { const s = filter.dataset.admFilter || null; setInviteFilter(s && s === activeStatus ? null : s); return; }
    const act = e.target.closest('[data-adm-action]');
    if (act) {
      if (act.disabled) return;
      closeRowMenus(null);
      runAction(act.dataset.admAction, act.dataset.admOrg || '', act.dataset.admEmail || '');
    }
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
    const sp = e.target.closest('[data-adm-salesperson]');
    if (sp) { salesperson = sp.value; applyFilter(); }
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

/* ==================================================================== */
export const QUICK_INVITE_WISEAI = {
  sub: 'Send an org invite or triage your invite history — just ask.',
  chipsFlow: 'wrap',
  /* Large "at a glance" cards shown alongside the small chips on the welcome
     screen — each reuses an existing intent so a click drives the same flow. */
  scorecards: {
    label: 'Your invites at a glance',
    cards: [
      { intent: 'need_attention', icon: 'priority_high', iconTone: 'brand', pill: { tone: 'up', icon: 'priority_high', text: 'Do next' }, metric: '3', metricUnit: ' invites', title: 'Need attention', desc: 'Expired or unaccepted past 7 days — resend or cancel them.', action: 'What needs attention?', ask: 'What needs attention?' },
      { intent: 'show_pending', icon: 'hourglass_top', iconTone: 'brand', pill: { tone: 'up', icon: 'hourglass_top', text: 'Pending' }, metric: '4', metricUnit: ' pending', title: 'Awaiting a response', desc: 'Nudge or cancel the invites still waiting to be accepted.', action: 'Show pending', ask: 'Show pending invites' },
      { intent: 'show_all', icon: 'history', iconTone: 'brand', pill: { tone: 'up', icon: 'history', text: 'All' }, metric: '24', metricUnit: ' total', title: 'All invitations', desc: 'Every invite you\u2019ve sent, most recent first.', action: 'Show all invites', ask: 'Show all invites' },
      { intent: 'show_accepted', icon: 'check', iconTone: 'brand', pill: { tone: 'up', icon: 'check', text: 'Accepted' }, title: 'Accepted invitations', desc: '5 people have joined from your invites.', action: 'Show accepted', ask: 'Show accepted' },
      { intent: 'show_cancelled', icon: 'cancel', iconTone: 'brand', pill: { tone: 'up', icon: 'cancel', text: 'Cancelled' }, title: 'Cancelled invitations', desc: 'Invites you withdrew — 12 in total.', action: 'Show cancelled', ask: 'Show cancelled' },
    ],
  },
  intents: [
    { intent: 'need_attention', label: 'What needs attention?', icon: 'priority_high' },
    { intent: 'show_pending',   label: 'Show pending invites',  icon: 'hourglass_top' },
    { intent: 'show_accepted',  label: 'Show accepted',         icon: 'check' },
    { intent: 'show_cancelled', label: 'Show cancelled',        icon: 'cancel' },
    { intent: 'show_all',       label: 'Show all invites',      icon: 'history' },
    { intent: 'export',         label: 'Export CSV',            icon: 'download' },
  ],
  intentReplies: {
    need_attention: () => 'You have <strong>3</strong> invitations that need attention — expired or unaccepted past 7 days. Resend or cancel them from the history rows.',
    show_pending:   () => 'Filtered to <strong>Pending</strong> invitations — 4 awaiting a response.',
    show_accepted:  () => 'Filtered to <strong>Accepted</strong> invitations — 5 have joined.',
    show_cancelled: () => 'Filtered to <strong>Cancelled</strong> invitations — 12 total.',
    show_all:       () => 'Showing all <strong>24</strong> invitations, most recent first.',
    export:         () => 'Preparing a CSV of your <strong>invite history</strong>.',
  },
  onIntent: (intent) => {
    switch (intent) {
      case 'need_attention': setInviteFilter('expired'); break;
      case 'show_pending':   setInviteFilter('pending'); break;
      case 'show_accepted':  setInviteFilter('accepted'); break;
      case 'show_cancelled': setInviteFilter('cancelled'); break;
      case 'show_all':       setInviteFilter(null); break;
      case 'export':         toast('Exporting invite history', 'download'); break;
      default: break;
    }
    return false;
  },
};
