import './date-column.js';

/**
 * API keys module.
 *
 * A developer-console surface rendered into #agent-main-scroll on api-keys.html,
 * built on the canonical `wmod-` module (serif headline + subtext + description,
 * a search field with an inline funnel filter, scorecard metrics, and a table of
 * keys). The persistent WISEcodeAI dock drives it — intent chips create a key,
 * jump to usage, or open the reference docs — and each on-page action narrates
 * back.
 *
 * Secret keys are shown exactly once, at creation time, inside a modal ("copy it
 * now"). After that they're a secret: the table only ever shows a masked preview
 * and there is no reveal. Lose one and you regenerate it. Everything lives only
 * in memory (demo) — nothing is persisted or sent anywhere.
 */

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function randKey() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `sk_demo_${s}`;
}

/* A masked preview keeps the recognizable prefix + last four, hiding the middle
   forever. This is the only representation stored once a key exists. */
function maskFrom(full) {
  return `${full.slice(0, 11)}${'\u2022'.repeat(10)}${full.slice(-4)}`;
}

let hostEl = null;
let query = '';
let statusFilter = 'all';
let scopeFilter = 'all';
let filterOpen = false;
let dateLead = 'used';
let dateLeadBound = false;
function dc() { return window.WiseDateCol; }
function keyDates(k) {
  const D = dc();
  return D ? D.complete({ created: k.created, used: k.lastUsed, edited: k.edited }, 'key') : { created: k.created, used: k.lastUsed };
}

/* Keys store — only a masked preview is ever kept (never the full secret). */
const KEYS = [
  { id: 'k1', name: 'Production', preview: maskFrom('sk_demo_9f2Ka7Lm3Qp8Rz1Vx6Ty4Bn0Cd5Ef7Gh'), created: 'Mar 14, 2024', lastUsed: '2 hours ago', scope: 'Full access', status: 'active' },
  { id: 'k2', name: 'Analytics pipeline', preview: maskFrom('sk_demo_2Hj5Km8Np1Qr4St7Uv0Wx3Yz6Ab9Cd2'), created: 'Apr 02, 2024', lastUsed: 'Yesterday', scope: 'Read-only', status: 'active' },
  { id: 'k3', name: 'Legacy import', preview: maskFrom('sk_demo_5Lm8No1Pq4Rs7Tu0Vw3Xy6Za9Bc2De5'), created: 'Jan 08, 2024', lastUsed: '3 weeks ago', scope: 'Write', status: 'stale' },
];

const SCOPES = ['Full access', 'Read-only', 'Write'];

function toast(msg, icon = 'check') {
  let wrap = document.getElementById('ak-toast-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.id = 'ak-toast-wrap'; wrap.className = 'wmod-toast-wrap'; document.body.appendChild(wrap); }
  const t = document.createElement('div');
  t.className = 'wmod-toast';
  t.innerHTML = `<span class="material-symbols-outlined">${esc(icon)}</span><span>${esc(msg)}</span>`;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('is-in'));
  setTimeout(() => { t.classList.remove('is-in'); setTimeout(() => t.remove(), 260); }, 2600);
}

function statusPill(status) {
  if (status === 'stale') return '<span class="wmod-pill wmod-pill--warn">Rotate soon</span>';
  if (status === 'revoked') return '<span class="wmod-pill wmod-pill--off">Revoked</span>';
  return '<span class="wmod-pill wmod-pill--on">Active</span>';
}

function matches(k) {
  if (statusFilter !== 'all' && k.status !== statusFilter) return false;
  if (scopeFilter !== 'all' && k.scope !== scopeFilter) return false;
  if (query) {
    const hay = (k.name + ' ' + k.scope + ' ' + k.status).toLowerCase();
    if (!hay.includes(query)) return false;
  }
  return true;
}

function anyFilter() { return query !== '' || statusFilter !== 'all' || scopeFilter !== 'all'; }

function paint() {
  if (!hostEl) return;
  const active = KEYS.filter((k) => k.status !== 'revoked').length;
  const shown = KEYS.filter(matches);
  hostEl.innerHTML = `
    <div class="wmod-wrap" data-w-date-root data-ak-board>
      <div class="wmod-masthead">
        <div class="wmod-masthead-main">
          <h1 class="wmod-title">API keys</h1>
          <p class="wmod-sub">Authenticate requests to the WISE API.</p>
          <p class="wmod-desc">Keep your secret keys safe — never expose them in client-side code. A key's full value is shown only once, when it's created; after that it's a secret. If you lose one, revoke it and generate a new one.</p>
        </div>
        <div class="wmod-head-actions">
          <button type="button" class="wise-btn wise-btn--primary" data-ak-action="create"><span class="material-symbols-outlined">add</span>Create key</button>
        </div>
      </div>

      <div class="wmod-toolbar">
        <div class="wmod-search-inline">
          <span class="material-symbols-outlined">search</span>
          <input type="search" class="wmod-search-input" placeholder="Search keys by name, scope, or status" aria-label="Search API keys" value="${esc(query)}" data-ak-search />
          <button type="button" class="wmod-filter-btn${anyFilter() ? ' has-filters' : ''}" data-ak-filter-btn aria-haspopup="dialog" aria-expanded="${filterOpen}" title="Filter keys" aria-label="Filter keys">
            <span class="material-symbols-outlined">tune</span>
            <span class="wmod-filter-dot" aria-hidden="true"></span>
          </button>
          <div class="wmod-filter-pop" role="dialog" aria-label="Filter keys"${filterOpen ? '' : ' hidden'}>
            <div class="wmod-filter-pop-head">
              <span class="wmod-filter-pop-title">Filter keys</span>
              <button type="button" class="wmod-filter-clear" data-ak-action="clear_filters">Clear all</button>
            </div>
            <div class="wmod-filter-group">
              <div class="wmod-filter-label">Status</div>
              <div class="wmod-filter-chips">
                ${[['all', 'All'], ['active', 'Active'], ['stale', 'Rotate soon'], ['revoked', 'Revoked']].map(([v, l]) =>
                  `<button type="button" class="wmod-fchip${statusFilter === v ? ' is-on' : ''}" data-ak-status="${v}">${l}</button>`).join('')}
              </div>
            </div>
            <div class="wmod-filter-group">
              <div class="wmod-filter-label">Scope</div>
              <div class="wmod-filter-chips">
                <button type="button" class="wmod-fchip${scopeFilter === 'all' ? ' is-on' : ''}" data-ak-scope="all">All</button>
                ${SCOPES.map((s) => `<button type="button" class="wmod-fchip${scopeFilter === s ? ' is-on' : ''}" data-ak-scope="${esc(s)}">${esc(s)}</button>`).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="wmod-stats-wrap" data-ak-anchor="usage">
        <div class="wmod-stats" style="--wmod-cols:4">
          <div class="wmod-stat"><span class="wmod-stat-num">128.4k</span><span class="wmod-stat-label">Requests this month</span></div>
          <div class="wmod-stat wmod-stat--verified"><span class="wmod-stat-num">${active}</span><span class="wmod-stat-label"><span class="material-symbols-outlined">vpn_key</span>Active keys</span></div>
          <div class="wmod-stat"><span class="wmod-stat-num">1,000</span><span class="wmod-stat-label">Rate limit /min</span></div>
          <div class="wmod-stat wmod-stat--good"><span class="wmod-stat-num">99.98</span><span class="wmod-stat-label">Success rate %</span></div>
        </div>
      </div>

      <div class="wmod-table-card ak-table">
        <div class="wmod-table">
          <div class="wmod-thead">
            <div class="wmod-th">Name</div>
            <div class="wmod-th">Key</div>
            <div class="wmod-th ak-col-scope">Scope</div>
            <div class="wmod-th ak-col-used w-date-th">${dc() ? dc().headerHtml({ kinds: 'key', lead: dateLead }) : 'Last used'}</div>
            <div class="wmod-th">Status</div>
            <div class="wmod-th ak-row-actions">Actions</div>
          </div>
          ${shown.length ? shown.map((k) => `
            <div class="wmod-trow ak-row${k.status === 'revoked' ? ' is-revoked' : ''}">
              <div class="wmod-td"><div class="wmod-td-primary">${esc(k.name)}</div></div>
              <div class="wmod-td"><code class="wmod-td-code">${esc(k.preview)}</code></div>
              <div class="wmod-td ak-col-scope"><span class="wmod-pill wmod-pill--muted">${esc(k.scope)}</span></div>
              <div class="wmod-td ak-col-used"><span class="w-datecell">${dc() ? dc().cellHtml(keyDates(k), 'key', dateLead) : esc(k.lastUsed)}</span></div>
              <div class="wmod-td">${statusPill(k.status)}</div>
              <div class="wmod-td ak-row-actions">${k.status !== 'revoked' ? `<button type="button" class="wmod-linkbtn" data-ak-action="revoke" data-id="${k.id}">Revoke</button>` : ''}</div>
            </div>`).join('') : `
            <div class="wmod-empty">
              <span class="material-symbols-outlined">key_off</span>
              <div>No keys match your filters.</div>
            </div>`}
        </div>
      </div>
    </div>`;
}

/* ---- Create-key modal — generates a fresh secret, shows it once. ---- */
function openCreateModal() {
  closeModal();
  const full = randKey();
  const overlay = document.createElement('div');
  overlay.className = 'wmod-modal-overlay';
  overlay.id = 'ak-modal';
  overlay.innerHTML = `
    <div class="wmod-modal" role="dialog" aria-modal="true" aria-labelledby="ak-modal-title">
      <h2 class="wmod-modal-title" id="ak-modal-title">Your new secret key</h2>
      <p class="wmod-modal-sub">Copy this key now and store it somewhere safe. For security, WISE will never show the full value again — if you lose it, revoke this key and generate a new one.</p>
      <div class="wmod-modal-field">
        <span class="wmod-modal-flabel">Key name</span>
        <input class="wmod-input" type="text" value="New key" maxlength="48" data-ak-modal-name aria-label="Key name" />
      </div>
      <div class="wmod-modal-field">
        <span class="wmod-modal-flabel">Secret key</span>
        <div class="wmod-secret"><code data-ak-modal-key>${esc(full)}</code><button type="button" class="wmod-icon-btn" data-ak-action="copy_modal" title="Copy key"><span class="material-symbols-outlined">content_copy</span></button></div>
      </div>
      <div class="wmod-modal-actions">
        <button type="button" class="wise-btn wise-btn--ghost" data-ak-action="copy_modal"><span class="material-symbols-outlined">content_copy</span>Copy</button>
        <button type="button" class="wise-btn wise-btn--primary" data-ak-action="modal_done">Done</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.dataset.full = full;
  requestAnimationFrame(() => overlay.classList.add('is-in'));

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) { finalizeCreate(overlay); return; }
    const btn = e.target.closest('[data-ak-action]');
    if (!btn) return;
    if (btn.dataset.akAction === 'copy_modal') { copyVal(overlay.dataset.full); return; }
    if (btn.dataset.akAction === 'modal_done') { finalizeCreate(overlay); }
  });
  setTimeout(() => overlay.querySelector('[data-ak-modal-name]')?.focus(), 40);
  document.addEventListener('keydown', modalEsc, true);
}

function modalEsc(e) {
  if (e.key !== 'Escape') return;
  const overlay = document.getElementById('ak-modal');
  if (overlay) { e.stopPropagation(); finalizeCreate(overlay); }
}

/* Commit the key into the table as a masked-only record and drop the plaintext. */
function finalizeCreate(overlay) {
  const full = overlay.dataset.full;
  const name = (overlay.querySelector('[data-ak-modal-name]')?.value || 'New key').trim() || 'New key';
  KEYS.unshift({ id: 'k' + Date.now(), name, preview: maskFrom(full), created: 'Just now', lastUsed: 'Never', scope: 'Full access', status: 'active' });
  closeModal();
  paint();
  toast('New API key created', 'vpn_key');
}

function closeModal() {
  document.removeEventListener('keydown', modalEsc, true);
  const overlay = document.getElementById('ak-modal');
  if (!overlay) return;
  overlay.classList.remove('is-in');
  overlay.dataset.full = '';
  setTimeout(() => overlay.remove(), 200);
}

export function renderApiKeys(mainEl) {
  hostEl = mainEl;
  query = '';
  statusFilter = 'all';
  scopeFilter = 'all';
  filterOpen = false;
  if (!dateLeadBound && dc()) {
    dateLeadBound = true;
    dc().onLead(hostEl, (lead, root) => {
      if (!hostEl.querySelector('[data-ak-board]')) return;
      if (root && !hostEl.contains(root)) return;
      dateLead = lead;
      paint();
    });
  }
  paint();

  mainEl.addEventListener('click', (e) => {
    const st = e.target.closest('[data-ak-status]');
    if (st) { statusFilter = st.dataset.akStatus; paint(); return; }
    const sc = e.target.closest('[data-ak-scope]');
    if (sc) { scopeFilter = sc.dataset.akScope; paint(); return; }
    const fb = e.target.closest('[data-ak-filter-btn]');
    if (fb) { e.stopPropagation(); filterOpen = !filterOpen; paint(); return; }
    if (e.target.closest('.wmod-filter-pop')) { e.stopPropagation(); }
    const btn = e.target.closest('[data-ak-action]');
    if (!btn) return;
    const action = btn.dataset.akAction;
    if (action === 'revoke') { revokeKey(btn.dataset.id); return; }
    if (action === 'clear_filters') { query = ''; statusFilter = 'all'; scopeFilter = 'all'; paint(); return; }
    runApiKeysIntent(action);
  });

  mainEl.addEventListener('input', (e) => {
    const s = e.target.closest('[data-ak-search]');
    if (!s) return;
    query = s.value.trim().toLowerCase();
    filterOpen = false;
    const pos = s.selectionStart;
    paint();
    const again = hostEl.querySelector('[data-ak-search]');
    if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (_) {} }
  });

  document.addEventListener('click', () => { if (filterOpen) { filterOpen = false; paint(); } });
}

function copyVal(val) {
  try { navigator.clipboard?.writeText(val); } catch (_) {}
  toast('Copied to clipboard', 'content_copy');
}

function revokeKey(id) {
  const k = KEYS.find((x) => x.id === id);
  if (!k) return;
  k.status = 'revoked';
  paint();
  toast(`Revoked \u201c${k.name}\u201d`, 'block');
}

/* ---- WISEcodeAI bridge -------------------------------------------------- */

export function runApiKeysIntent(action) {
  switch (action) {
    case 'create': openCreateModal(); break;
    case 'usage': hostEl?.querySelector('[data-ak-anchor="usage"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); break;
    case 'rotate': statusFilter = 'stale'; paint(); break;
    case 'open_docs': window.location.href = 'docs.html'; break;
    default: break;
  }
}

export const API_KEYS_WISEAI = {
  sub: 'Create and manage your API keys — I can do it for you.',
  chipsFlow: 'wrap',
  sourceLabel: '',
  scorecards: {
    label: 'Your API keys at a glance',
    cards: [
      { intent: 'create_key', icon: 'add', iconTone: 'brand', pill: { tone: 'up', icon: 'vpn_key', text: 'Do next' }, title: 'Create a new API key', desc: 'Generate a fresh secret key \u2014 shown once, so copy it right away.', action: 'Create a key', ask: 'Create a new API key' },
      { intent: 'usage', icon: 'insights', iconTone: 'brand', pill: { tone: 'up', icon: 'trending_up', text: 'Usage' }, metric: '128.4k', metricUnit: ' reqs', title: 'This month\u2019s usage', desc: '99.98% success against a 1,000/min limit \u2014 jump to the usage panel.', action: 'Show my usage', ask: 'Show my usage' },
      { intent: 'rotate', icon: 'autorenew', iconTone: 'brand', pill: { tone: 'up', icon: 'warning', text: 'Review' }, title: 'Rotate a stale key', desc: 'Your \u201cLegacy import\u201d key hasn\u2019t been used in 3 weeks \u2014 rotate it out.', action: 'Which key should I rotate?', ask: 'Which key should I rotate?' },
      { intent: 'docs', icon: 'menu_book', iconTone: 'brand', pill: { tone: 'up', icon: 'menu_book', text: 'Docs' }, title: 'Open the API reference', desc: 'Authentication, endpoints and rate limits, all in one place.', action: 'Open the API reference', ask: 'Open the API reference' },
    ],
  },
  intents: [
    { intent: 'create_key', label: 'Create a new API key', icon: 'add' },
    { intent: 'usage', label: 'Show my usage', icon: 'insights' },
    { intent: 'rotate', label: 'Which key should I rotate?', icon: 'autorenew' },
    { intent: 'docs', label: 'Open the API reference', icon: 'menu_book' },
  ],
  intentReplies: {
    create_key: 'Opened the <strong>Create key</strong> dialog and generated a fresh secret. Copy it now \u2014 for security the full value is shown only once; after that it\u2019s a secret you can\u2019t reveal again.',
    usage: 'You\u2019ve made <strong>128.4k requests</strong> this month with a <strong>99.98%</strong> success rate, against a 1,000/min rate limit. Scrolled you to the usage panel.',
    rotate: 'Your <strong>\u201cLegacy import\u201d</strong> key is flagged <em>Rotate soon</em> \u2014 it hasn\u2019t been used in 3 weeks. Filtered to it; create a new key, swap it in, then revoke the old one.',
    docs: 'Opening the <strong>API reference</strong> \u2014 authentication, endpoints, and rate limits are all covered there.',
  },
  onIntent: (intent) => {
    const map = { create_key: 'create', usage: 'usage', rotate: 'rotate', docs: 'open_docs' };
    if (map[intent]) { runApiKeysIntent(map[intent]); return intent === 'docs'; }
    return false;
  },
};
