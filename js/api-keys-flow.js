/**
 * API keys module.
 *
 * A developer-console surface rendered into #agent-main-scroll on api-keys.html.
 * It shows usage headline stats and a table of API keys with create / reveal /
 * copy / revoke, plus a one-time "new key" banner. The persistent WISEai dock
 * drives it: intent chips create a key, reveal the masked values, jump to usage,
 * or open the reference docs — and each on-page action narrates back.
 *
 * Keys live only in memory (demo) — nothing is persisted or sent anywhere.
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

let hostEl = null;
let revealAll = false;
let justCreated = null; /* full plaintext of the last-created key (shown once) */

const KEYS = [
  { id: 'k1', name: 'Production', full: 'sk_demo_9f2Ka7Lm3Qp8Rz1Vx6Ty4Bn0Cd5Ef7Gh', created: 'Mar 14, 2024', lastUsed: '2 hours ago', scope: 'Full access', status: 'active' },
  { id: 'k2', name: 'Analytics pipeline', full: 'sk_demo_2Hj5Km8Np1Qr4St7Uv0Wx3Yz6Ab9Cd2', created: 'Apr 02, 2024', lastUsed: 'Yesterday', scope: 'Read-only', status: 'active' },
  { id: 'k3', name: 'Legacy import (rotate)', full: 'sk_demo_5Lm8No1Pq4Rs7Tu0Vw3Xy6Za9Bc2De5', created: 'Jan 08, 2024', lastUsed: '3 weeks ago', scope: 'Write', status: 'stale' },
];

function toast(msg, icon = 'check_circle') {
  let wrap = document.getElementById('ak-toast-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.id = 'ak-toast-wrap'; document.body.appendChild(wrap); }
  const t = document.createElement('div');
  t.className = 'ak-toast';
  t.innerHTML = `<span class="material-symbols-outlined">${esc(icon)}</span><span>${esc(msg)}</span>`;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('is-in'));
  setTimeout(() => { t.classList.remove('is-in'); setTimeout(() => t.remove(), 260); }, 2600);
}

function mask(full) {
  return `${full.slice(0, 11)}${'•'.repeat(18)}${full.slice(-4)}`;
}

function statusPill(status) {
  if (status === 'stale') return '<span class="ak-pill ak-pill--warn">Rotate soon</span>';
  if (status === 'revoked') return '<span class="ak-pill ak-pill--off">Revoked</span>';
  return '<span class="ak-pill ak-pill--on">Active</span>';
}

function paint() {
  if (!hostEl) return;
  const active = KEYS.filter((k) => k.status !== 'revoked').length;
  hostEl.innerHTML = `
    <div class="ak-wrap">
      <div class="ak-breadcrumb"><span>Account</span><span class="material-symbols-outlined">chevron_right</span><span class="ak-breadcrumb-here">API keys</span></div>
      <div class="ak-head-row">
        <div>
          <h1 class="ak-title">API keys</h1>
          <p class="ak-lede">Authenticate requests to the WISE API. Keep your secret keys safe — never expose them in client-side code.</p>
        </div>
        <button type="button" class="ak-btn ak-btn--primary" data-ak-action="create"><span class="material-symbols-outlined">add</span>Create key</button>
      </div>

      <div class="ak-stats" data-ak-anchor="usage">
        <div class="ak-stat"><div class="ak-stat-num">128.4k</div><div class="ak-stat-label">Requests this month</div></div>
        <div class="ak-stat"><div class="ak-stat-num">${active}</div><div class="ak-stat-label">Active keys</div></div>
        <div class="ak-stat"><div class="ak-stat-num">1,000<span class="ak-stat-unit">/min</span></div><div class="ak-stat-label">Rate limit</div></div>
        <div class="ak-stat"><div class="ak-stat-num">99.98<span class="ak-stat-unit">%</span></div><div class="ak-stat-label">Success rate</div></div>
      </div>

      ${justCreated ? `
      <div class="ak-newkey" role="alert">
        <span class="material-symbols-outlined">vpn_key</span>
        <div class="ak-newkey-body">
          <div class="ak-newkey-title">Your new secret key — copy it now</div>
          <div class="ak-newkey-sub">For security this key is shown only once. Store it somewhere safe.</div>
          <div class="ak-newkey-code"><code>${esc(justCreated)}</code><button type="button" class="ak-icon-btn" data-ak-action="copy" data-val="${esc(justCreated)}" title="Copy"><span class="material-symbols-outlined">content_copy</span></button></div>
        </div>
        <button type="button" class="ak-icon-btn" data-ak-action="dismiss_new" title="Dismiss"><span class="material-symbols-outlined">close</span></button>
      </div>` : ''}

      <div class="ak-toolbar">
        <div class="ak-toolbar-title">Your keys</div>
        <button type="button" class="ak-btn ak-btn--ghost" data-ak-action="toggle_reveal"><span class="material-symbols-outlined">${revealAll ? 'visibility_off' : 'visibility'}</span>${revealAll ? 'Hide keys' : 'Reveal keys'}</button>
      </div>

      <div class="ak-card">
        <table class="ak-table">
          <thead><tr><th>Name</th><th>Key</th><th>Scope</th><th>Last used</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${KEYS.map((k) => `
              <tr class="ak-row${k.status === 'revoked' ? ' is-revoked' : ''}">
                <td><div class="ak-name">${esc(k.name)}</div><div class="ak-meta">Created ${esc(k.created)}</div></td>
                <td><code class="ak-key">${esc(revealAll ? k.full : mask(k.full))}</code>${k.status !== 'revoked' ? `<button type="button" class="ak-icon-btn" data-ak-action="copy" data-val="${esc(k.full)}" title="Copy"><span class="material-symbols-outlined">content_copy</span></button>` : ''}</td>
                <td><span class="ak-scope">${esc(k.scope)}</span></td>
                <td class="ak-muted">${esc(k.lastUsed)}</td>
                <td>${statusPill(k.status)}</td>
                <td class="ak-row-actions">${k.status !== 'revoked' ? `<button type="button" class="ak-linkbtn" data-ak-action="revoke" data-id="${k.id}">Revoke</button>` : ''}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <div class="ak-docs-cta">
        <span class="material-symbols-outlined">menu_book</span>
        <div class="ak-docs-body"><strong>Building an integration?</strong> The API reference covers authentication, endpoints, and rate limits.</div>
        <button type="button" class="ak-btn ak-btn--ghost" data-ak-action="open_docs">Open API reference</button>
      </div>
    </div>`;
}

export function renderApiKeys(mainEl) {
  hostEl = mainEl;
  revealAll = false;
  justCreated = null;
  paint();

  mainEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ak-action]');
    if (!btn) return;
    const action = btn.dataset.akAction;
    if (action === 'copy') { copyVal(btn.dataset.val); return; }
    if (action === 'revoke') { revokeKey(btn.dataset.id); return; }
    if (action === 'dismiss_new') { justCreated = null; paint(); return; }
    runApiKeysIntent(action);
  });
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
  toast(`Revoked “${k.name}”`, 'block');
}

function createKey() {
  const full = randKey();
  KEYS.unshift({ id: 'k' + Date.now(), name: 'New key', full, created: 'Just now', lastUsed: 'Never', scope: 'Full access', status: 'active' });
  justCreated = full;
  paint();
  toast('New API key created', 'vpn_key');
}

/* ---- WISEai bridge -------------------------------------------------- */

export function runApiKeysIntent(action) {
  switch (action) {
    case 'create': createKey(); break;
    case 'toggle_reveal': revealAll = !revealAll; paint(); toast(revealAll ? 'Keys revealed' : 'Keys hidden', revealAll ? 'visibility' : 'visibility_off'); break;
    case 'usage': hostEl?.querySelector('[data-ak-anchor="usage"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); break;
    case 'open_docs': window.location.href = 'docs.html'; break;
    default: break;
  }
}

export const API_KEYS_WISEAI = {
  sub: 'Create, reveal and manage your API keys — I can do it for you.',
  chipsFlow: 'wrap',
  sourceLabel: '',
  /* Large "at a glance" cards shown alongside the small chips on the welcome
     screen — each reuses an existing intent so a click drives the same flow. */
  scorecards: {
    label: 'Your API keys at a glance',
    cards: [
      { intent: 'create_key', icon: 'add', iconTone: 'brand', pill: { tone: 'up', icon: 'vpn_key', text: 'Do next' }, title: 'Create a new API key', desc: 'Generate a fresh secret key — shown once, so copy it right away.', action: 'Create a key', ask: 'Create a new API key' },
      { intent: 'usage', icon: 'insights', iconTone: 'brand', pill: { tone: 'up', icon: 'trending_up', text: 'Usage' }, metric: '128.4k', metricUnit: ' reqs', title: 'This month\u2019s usage', desc: '99.98% success against a 1,000/min limit — jump to the usage panel.', action: 'Show my usage', ask: 'Show my usage' },
      { intent: 'rotate', icon: 'autorenew', iconTone: 'brand', pill: { tone: 'up', icon: 'warning', text: 'Review' }, title: 'Rotate a stale key', desc: 'Your \u201cLegacy import\u201d key hasn\u2019t been used in 3 weeks — rotate it out.', action: 'Which key should I rotate?', ask: 'Which key should I rotate?' },
      { intent: 'reveal_keys', icon: 'visibility', iconTone: 'brand', pill: { tone: 'up', icon: 'visibility', text: 'Reveal' }, title: 'Reveal my keys', desc: 'Show the full key values in the table — re-masked when you hide them.', action: 'Reveal my keys', ask: 'Reveal my keys' },
      { intent: 'docs', icon: 'menu_book', iconTone: 'brand', pill: { tone: 'up', icon: 'menu_book', text: 'Docs' }, title: 'Open the API reference', desc: 'Authentication, endpoints and rate limits, all in one place.', action: 'Open the API reference', ask: 'Open the API reference' },
    ],
  },
  intents: [
    { intent: 'create_key', label: 'Create a new API key', icon: 'add' },
    { intent: 'reveal_keys', label: 'Reveal my keys', icon: 'visibility' },
    { intent: 'usage', label: 'Show my usage', icon: 'insights' },
    { intent: 'rotate', label: 'Which key should I rotate?', icon: 'autorenew' },
    { intent: 'docs', label: 'Open the API reference', icon: 'menu_book' },
  ],
  intentReplies: {
    create_key: 'Created a fresh <strong>secret key</strong> — it\u2019s shown at the top of the page. Copy it now; for security the full value won\u2019t be shown again.',
    reveal_keys: 'Revealed the full key values in the table. I\u2019ll re-mask them when you hide them again — don\u2019t share these in client-side code.',
    usage: 'You\u2019ve made <strong>128.4k requests</strong> this month with a <strong>99.98%</strong> success rate, against a 1,000/min rate limit. Scrolled you to the usage panel.',
    rotate: 'Your <strong>“Legacy import”</strong> key is flagged <em>Rotate soon</em> — it hasn\u2019t been used in 3 weeks and predates your current setup. Create a new key, swap it in, then revoke the old one.',
    docs: 'Opening the <strong>API reference</strong> — authentication, endpoints, and rate limits are all covered there.',
  },
  onIntent: (intent) => {
    const map = { create_key: 'create', reveal_keys: 'toggle_reveal', usage: 'usage', docs: 'open_docs' };
    if (intent === 'rotate') { runApiKeysIntent('usage'); return false; }
    if (map[intent]) { runApiKeysIntent(map[intent]); return intent === 'docs'; }
    return false;
  },
};
