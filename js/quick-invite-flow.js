/**
 * Quick Invite — WISEcode Admin module.
 *
 * Rendered into #agent-main-scroll on quick-invite.html and paired with the
 * WISEai dock. A one-step org invite composer on top of a filterable Invite
 * History board — at-a-glance totals, status filter chips, a salesperson
 * filter, live search, and per-invite actions (copy link, resend, cancel).
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
  { key: 'accepted',  label: 'Accepted',  num: 5,  sub: 'Have joined',        icon: 'check_circle',  accent: 'adm-stat--green' },
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

function initials(name) {
  return String(name).trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

let hostEl = null;
let activeStatus = null;
let query = '';
let salesperson = 'All salespeople';

/* ---- Chat bridge + toast -------------------------------------------- */
let chatApi = null;
export function setQuickInviteChat(api) { chatApi = api; }
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
function filteredInvites() {
  return INVITES.filter((i) => {
    if (activeStatus && i.status !== activeStatus) return false;
    if (salesperson !== 'All salespeople' && i.by !== salesperson) return false;
    if (query && !`${i.name} ${i.email} ${i.org}`.toLowerCase().includes(query)) return false;
    return true;
  });
}

function inviteRowHtml(i) {
  const chip = STATUS_CHIP[i.status];
  const canCancel = i.status === 'sent' || i.status === 'pending';
  return `
    <div class="adm-invite-row" data-adm-invite="${esc(i.email)}">
      <span class="adm-avatar adm-avatar--round">${esc(initials(i.name))}</span>
      <div class="adm-invite-id">
        <span class="adm-idcell-name">${esc(i.name)}</span>
        <span class="adm-idcell-sub">${esc(i.email)}</span>
      </div>
      <div class="adm-invite-tools">
        <button type="button" class="adm-icon-btn" title="Copy invite link" data-adm-action="copy" data-adm-org="${esc(i.org)}"><span class="material-icons">link</span></button>
        <button type="button" class="adm-icon-btn adm-icon-btn--primary" title="Resend invite" data-adm-action="resend" data-adm-org="${esc(i.org)}"><span class="material-icons">send</span></button>
        <button type="button" class="adm-icon-btn adm-icon-btn--danger" title="Cancel invite" data-adm-action="cancel" data-adm-org="${esc(i.org)}"${canCancel ? '' : ' disabled style="opacity:.4;pointer-events:none"'}><span class="material-icons">cancel</span></button>
      </div>
      <div class="adm-invite-org"><span class="material-icons" style="font-size:15px;color:var(--text-subtle)">apartment</span>${esc(i.org)}</div>
      <span class="adm-chip ${chip.cls}">${esc(chip.label)}</span>
      <div class="adm-invite-meta">
        <span class="adm-invite-when">${esc(i.when)}</span>
        <span class="adm-invite-by">by <strong>${esc(i.by)}</strong></span>
      </div>
    </div>`;
}

function historyHtml() {
  const rows = filteredInvites();
  if (!rows.length) return '<div class="adm-empty">No invitations match these filters.</div>';
  const groups = [];
  const byDay = new Map();
  rows.forEach((i) => { if (!byDay.has(i.day)) { byDay.set(i.day, []); groups.push(i.day); } byDay.get(i.day).push(i); });
  return groups.map((day) => `
    <div class="adm-invite-daygroup">
      <div class="adm-invite-dayhead"><span>${esc(day.toUpperCase())}</span><span class="adm-idcell-sub">${byDay.get(day).length} invite${byDay.get(day).length === 1 ? '' : 's'}</span></div>
      ${byDay.get(day).map(inviteRowHtml).join('')}
    </div>`).join('');
}

function statsHtml() {
  return FILTERS.map((f) => {
    const active = f.key === activeStatus;
    return `
      <button type="button" class="adm-stat${f.accent ? ' ' + f.accent : ''}${active ? ' is-active' : ''}" data-adm-filter="${f.key == null ? '' : esc(f.key)}" aria-pressed="${active ? 'true' : 'false'}">
        <span class="adm-stat-num">${f.num}</span>
        <span class="adm-stat-label"><span class="material-icons">${esc(f.icon)}</span>${esc(f.label)}</span>
        <span class="adm-stat-sub">${esc(f.sub)}</span>
      </button>`;
  }).join('');
}

function paint() {
  if (!hostEl) return;
  hostEl.innerHTML = `
    <div class="adm-wrap">
      <a class="adm-back" href="organizations.html"><span class="material-icons">arrow_back</span>Back to Organizations</a>

      <div class="adm-card adm-card--pad" style="max-width:520px;margin-bottom:26px">
        <div class="adm-util-title" style="font-family:'Noto Serif',Georgia,serif;font-size:1.15rem"><span class="material-icons" style="color:var(--primary)">bolt</span>Quick Invite</div>
        <p class="adm-lede" style="margin:2px 0 16px">Find or create an org, activate it, and send the invite in one step.</p>
        <div class="adm-field" style="min-width:0">
          <label class="adm-field-label" for="qi-org">Organization</label>
          <div class="adm-search-inline" style="min-width:0">
            <span class="material-icons">search</span>
            <input type="text" id="qi-org" class="adm-search" data-adm-org-search placeholder="Search organizations by name…" aria-label="Search organizations by name" />
          </div>
        </div>
        <div id="qi-suggest" class="adm-qi-suggest" hidden></div>
      </div>

      <div class="adm-section-label"><span class="material-icons">history</span>Invite History</div>
      <p class="adm-lede" style="margin:-6px 2px 14px">Invitations across all organizations, most recent first.</p>

      <div class="adm-stats" style="margin-bottom:14px">${statsHtml()}</div>

      <div class="adm-toolbar">
        <div class="adm-search-inline">
          <span class="material-icons">search</span>
          <input type="text" class="adm-search" data-adm-search placeholder="Search name, email, org…" aria-label="Search invites" value="${esc(query)}" />
        </div>
        <select class="adm-select" data-adm-salesperson aria-label="Filter by salesperson">
          ${SALESPEOPLE.map((s) => `<option${s === salesperson ? ' selected' : ''}>${esc(s)}</option>`).join('')}
        </select>
        <button type="button" class="adm-icon-btn" title="Refresh" data-adm-action="refresh"><span class="material-icons">refresh</span></button>
        <button type="button" class="adm-btn adm-btn--ghost" data-adm-action="export"><span class="material-icons">download</span>Export CSV</button>
      </div>

      <div class="adm-card adm-card--pad">
        <div data-adm-history>${historyHtml()}</div>
      </div>
    </div>`;
}

function applyFilter() {
  const wrap = hostEl?.querySelector('[data-adm-history]');
  if (wrap) wrap.innerHTML = historyHtml();
  hostEl?.querySelectorAll('[data-adm-filter]').forEach((b) => {
    const s = b.dataset.admFilter || null;
    b.classList.toggle('is-active', s === activeStatus);
    b.setAttribute('aria-pressed', s === activeStatus ? 'true' : 'false');
  });
}

export function setInviteFilter(status) { activeStatus = status || null; applyFilter(); }

function suggestOrgs(text) {
  const box = hostEl?.querySelector('#qi-suggest');
  if (!box) return;
  const t = text.trim().toLowerCase();
  if (!t) { box.hidden = true; box.innerHTML = ''; return; }
  const known = ['Z Crackers', 'Wai Lana Snacks', 'Snackios', "Abbot's Butcher", 'Vive Juicery', 'Applegate', 'Arti Bars', 'Artisan Tropic', 'Flax4Life', 'Goodles'];
  const hits = known.filter((n) => n.toLowerCase().includes(t)).slice(0, 4);
  box.hidden = false;
  box.innerHTML = hits.length
    ? hits.map((n) => `<button type="button" class="adm-qi-suggest-row" data-adm-action="pick-org" data-adm-org="${esc(n)}"><span class="adm-avatar" style="width:26px;height:26px;font-size:0.62rem">${esc(initials(n))}</span><span>${esc(n)}</span><span class="adm-idcell-sub" style="margin-left:auto">Send invite</span></button>`).join('')
    : `<button type="button" class="adm-qi-suggest-row" data-adm-action="create-org" data-adm-org="${esc(text.trim())}"><span class="material-icons" style="color:var(--primary)">add_business</span><span>Create <strong>${esc(text.trim())}</strong></span><span class="adm-idcell-sub" style="margin-left:auto">New org</span></button>`;
}

function runAction(action, org) {
  switch (action) {
    case 'export': toast('Exporting invite history', 'download'); pushChat('Preparing a CSV of your <strong>invite history</strong> — it\u2019ll download shortly.'); break;
    case 'refresh': toast('Refreshed invite history', 'refresh'); applyFilter(); break;
    case 'copy': toast(`Invite link copied · ${org}`, 'link'); break;
    case 'resend': toast(`Invite resent · ${org}`, 'send'); pushChat(`Resent the invitation for <strong>${esc(org)}</strong>. I\u2019ll flag it under <em>Need attention</em> if it isn\u2019t accepted within 7 days.`); break;
    case 'cancel': toast(`Invite cancelled · ${org}`, 'cancel'); pushChat(`Cancelled the pending invite for <strong>${esc(org)}</strong>.`); break;
    case 'pick-org':
    case 'create-org':
      toast(`Invite sent · ${org}`, 'send');
      pushChat(`Activated <strong>${esc(org)}</strong> and sent the invitation in one step. You\u2019ll see it at the top of the history once it\u2019s delivered.`);
      { const s = hostEl?.querySelector('[data-adm-org-search]'); if (s) s.value = ''; }
      { const box = hostEl?.querySelector('#qi-suggest'); if (box) { box.hidden = true; box.innerHTML = ''; } }
      break;
    default: break;
  }
}

export function renderQuickInvite(mainEl) {
  hostEl = mainEl;
  activeStatus = null; query = ''; salesperson = 'All salespeople';
  paint();

  mainEl.addEventListener('click', (e) => {
    const filter = e.target.closest('[data-adm-filter]');
    if (filter) { const s = filter.dataset.admFilter || null; setInviteFilter(s && s === activeStatus ? null : s); return; }
    const act = e.target.closest('[data-adm-action]');
    if (act) { runAction(act.dataset.admAction, act.dataset.admOrg || ''); return; }
  });
  mainEl.addEventListener('input', (e) => {
    const orgSearch = e.target.closest('[data-adm-org-search]');
    if (orgSearch) { suggestOrgs(orgSearch.value); return; }
    const s = e.target.closest('[data-adm-search]');
    if (s) { query = s.value.trim().toLowerCase(); applyFilter(); }
  });
  mainEl.addEventListener('change', (e) => {
    const sp = e.target.closest('[data-adm-salesperson]');
    if (sp) { salesperson = sp.value; applyFilter(); }
  });
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
      { intent: 'show_accepted', icon: 'check_circle', iconTone: 'brand', pill: { tone: 'up', icon: 'check_circle', text: 'Accepted' }, title: 'Accepted invitations', desc: '5 people have joined from your invites.', action: 'Show accepted', ask: 'Show accepted' },
      { intent: 'show_cancelled', icon: 'cancel', iconTone: 'brand', pill: { tone: 'up', icon: 'cancel', text: 'Cancelled' }, title: 'Cancelled invitations', desc: 'Invites you withdrew — 12 in total.', action: 'Show cancelled', ask: 'Show cancelled' },
    ],
  },
  intents: [
    { intent: 'need_attention', label: 'What needs attention?', icon: 'priority_high' },
    { intent: 'show_pending',   label: 'Show pending invites',  icon: 'hourglass_top' },
    { intent: 'show_accepted',  label: 'Show accepted',         icon: 'check_circle' },
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
