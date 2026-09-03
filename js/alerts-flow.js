import './date-column.js';
import { esc } from './escape-html.js';
import { createToast } from './toast.js';
import { searchToolbarHTML } from './wise-toolbar.js';
const toast = createToast('wmod');

/**
 * Alerts module.
 *
 * A full-page alerts view rendered into #agent-main-scroll on alerts.html, built
 * on the canonical `wmod-` module: a serif headline + subtext + description, a
 * search field with an inline funnel filter, a row of scorecard filters, and —
 * below them — a running stream of agent events in the standard table, newest at
 * the top. The persistent WISEcodeAI dock drives it: intent chips filter to
 * unread, mark everything read, or jump to a category, and each on-page action
 * narrates back into the conversation.
 */

/* The event stream (demo). `ts` orders the stream newest-first; `cat` drives the
   scorecard filters; `href` (optional) makes an event jump to a relevant page. */
const ALERTS = [
  { id: 'a1', cat: 'verification', icon: 'verified', tone: 'green', title: 'Verification ready: Sample Co.', sub: 'Portfolio Agent', time: '2m ago', ts: 200, read: false, href: 'verification.html' },
  { id: 'a2', cat: 'ingredient', icon: 'science', tone: 'amber', title: '3 ingredient flags need review', sub: 'Ingredient Parsing Agent', time: '14m ago', ts: 186, read: false, href: 'product-portfolio.html' },
  { id: 'a3', cat: 'trends', icon: 'trending_up', tone: 'cyan', title: 'New trend signal: low-FODMAP snacking', sub: 'Trends Agent', time: '1h ago', ts: 140, read: false, href: '' },
  { id: 'a4', cat: 'reformulation', icon: 'fact_check', tone: 'blue', title: 'Reformulation simulation complete', sub: 'Audit & Reformulation Agent', time: '3h ago', ts: 120, read: true, href: 'reformulation.html' },
  { id: 'a9', cat: 'ingredient', icon: 'science', tone: 'amber', title: 'Ingredient normalization run finished', sub: 'Ingredient Parsing Agent', time: '5h ago', ts: 100, read: true, href: 'product-portfolio.html' },
  { id: 'a5', cat: 'reports', icon: 'description', tone: 'blue', title: '\u201cQ3 Portfolio UPF Report\u201d published', sub: 'Reports', time: 'Yesterday \u00b7 4:11 PM', ts: 80, read: true, href: '' },
  { id: 'a6', cat: 'verification', icon: 'workspace_premium', tone: 'green', title: '12 Non-UPF shields minted', sub: 'Verification Lifecycle Agent', time: 'Yesterday \u00b7 9:24 AM', ts: 70, read: true, href: 'verification.html' },
  { id: 'a10', cat: 'trends', icon: 'insights', tone: 'cyan', title: 'Weekly trend digest generated', sub: 'Trends Agent', time: 'Mon \u00b7 6:00 PM', ts: 55, read: true, href: '' },
  { id: 'a7', cat: 'ingredient', icon: 'inventory_2', tone: 'amber', title: 'Data ingestion finished: 48 SKUs', sub: 'Data Ingestion Agent', time: 'Mon \u00b7 2:03 PM', ts: 40, read: true, href: 'product-portfolio.html' },
  { id: 'a8', cat: 'account', icon: 'key', tone: 'blue', title: 'Production API key rotated', sub: 'API keys', time: 'Mon \u00b7 11:40 AM', ts: 30, read: true, href: 'api-keys.html' },
];

/* Scorecard filters — the old chip row, now the canonical scorecards. */
const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'inbox' },
  { id: 'unread', label: 'Unread', icon: 'mark_email_unread' },
  { id: 'verification', label: 'Verification', icon: 'verified' },
  { id: 'ingredient', label: 'Ingredients', icon: 'science' },
  { id: 'reports', label: 'Reports', icon: 'description' },
  { id: 'trends', label: 'Trends', icon: 'trending_up' },
  { id: 'account', label: 'Account', icon: 'key' },
];

let hostEl = null;
let filter = 'all';
let query = '';
let dateLead = 'occurred';
let dateLeadBound = false;
function dc() { return window.WiseDateCol; }
function alertDates(a) {
  const D = dc();
  const occurred = a.time;
  const read = a.read ? (a.readAt || a.time) : '—';
  const created = a.created;
  return D ? D.complete({ occurred, read, created }, 'alert') : { occurred, read };
}

function toneColor(tone) {
  const map = { green: 'var(--sec-green, #2e7d32)', amber: 'var(--ter-amber, #e0a800)', cyan: 'var(--sec-cyan, #22b8cf)', blue: 'var(--primary)' };
  return map[tone] || 'var(--primary)';
}

function matches(a) {
  if (filter === 'unread') { if (a.read) return false; }
  else if (filter !== 'all' && a.cat !== filter) return false;
  if (query) {
    const hay = (a.title + ' ' + a.sub + ' ' + a.cat).toLowerCase();
    if (!hay.includes(query)) return false;
  }
  return true;
}

function catCount(id) {
  if (id === 'all') return ALERTS.length;
  if (id === 'unread') return ALERTS.filter((a) => !a.read).length;
  return ALERTS.filter((a) => a.cat === id).length;
}

/* Pick a scorecard column count that never leaves a lone orphan card. */
function statCols(n) {
  if (n <= 1) return 1;
  for (let c = Math.min(n, 6); c >= 2; c--) if (n % c === 0) return c;
  for (let c = Math.min(n, 6); c >= 2; c--) if (n % c !== 1) return c;
  return 2;
}

function paint() {
  if (!hostEl) return;
  const unread = ALERTS.filter((a) => !a.read).length;
  const shown = ALERTS.filter(matches).slice().sort((a, b) => b.ts - a.ts);

  hostEl.innerHTML = `
    <div class="wmod-wrap" data-w-date-root data-al-board>
      <div class="wmod-masthead">
        <div class="wmod-masthead-main">
          <h1 class="wmod-title">Alerts</h1>
          <p class="wmod-sub">${unread ? `You have <strong>${unread}</strong> unread alert${unread === 1 ? '' : 's'} across your agents.` : 'You\u2019re all caught up.'}</p>
          <p class="wmod-desc">A live stream of everything your agents do \u2014 verifications, ingredient flags, reports, trend signals and account activity \u2014 newest first. Filter by category, search the stream, or mark it all read.</p>
        </div>
        <div class="wmod-head-actions">
          <button type="button" class="wise-btn wise-btn--ghost" data-al-action="mark_all"${unread ? '' : ' disabled'}><span class="material-symbols-outlined">done_all</span>Mark all read</button>
        </div>
      </div>

      ${searchToolbarHTML({
        variant: 'wmod',
        placeholder: 'Search the alert stream',
        ariaLabel: 'Search alerts',
        value: query,
        inputAttrs: 'data-al-search',
      })}

      ${(() => {
        const cats = CATEGORIES.filter((c) => catCount(c.id) > 0 || c.id === 'all' || c.id === 'unread');
        return `<div class="wmod-stats-wrap">
        <div class="wmod-stats" style="--wmod-cols:${statCols(cats.length)}" role="group" aria-label="Filter alerts">
          ${cats.map((c) => {
            const n = catCount(c.id);
            const tone = c.id === 'unread' ? ' wmod-stat--verified' : '';
            return `<button type="button" class="wmod-stat${tone}${c.id === filter ? ' is-active' : ''}" data-al-filter="${c.id}" aria-pressed="${c.id === filter}">
              <span class="wmod-stat-num">${n}</span>
              <span class="wmod-stat-label"><span class="material-symbols-outlined">${esc(c.icon)}</span>${esc(c.label)}</span>
            </button>`;
          }).join('')}
        </div>
      </div>`; })()}

      <div class="wmod-table-card al-table">
        <div class="wmod-table">
          <div class="wmod-thead">
            <div class="wmod-th"></div>
            <div class="wmod-th">Event</div>
            <div class="wmod-th w-date-th">${dc() ? dc().headerHtml({ kinds: 'alert', lead: dateLead }) : 'When'}</div>
            <div class="wmod-th"></div>
          </div>
          ${shown.length ? shown.map((a) => `
            <div class="wmod-trow is-clickable al-row${a.read ? '' : ' is-unread'}" data-al-id="${a.id}"${a.href ? ` data-al-href="${esc(a.href)}"` : ''}>
              <div class="wmod-td"><span class="wmod-row-ic" style="--ic:${toneColor(a.tone)}"><span class="material-symbols-outlined">${esc(a.icon)}</span></span></div>
              <div class="wmod-td"><div class="wmod-td-primary">${esc(a.title)}</div><div class="wmod-td-meta">${esc(a.sub)}</div></div>
              <div class="wmod-td al-when">${a.read ? '' : '<span class="al-unread-dot" title="Unread"></span>'}<span class="w-datecell">${dc() ? dc().cellHtml(alertDates(a), 'alert', dateLead) : esc(a.time)}</span></div>
              <div class="wmod-td"><button type="button" class="wmod-icon-btn al-x" data-al-action="dismiss" data-id="${a.id}" aria-label="Dismiss"><span class="material-symbols-outlined">close</span></button></div>
            </div>`).join('') : `
            <div class="wmod-empty">
              <span class="material-symbols-outlined">notifications_off</span>
              <div>No ${filter === 'unread' ? 'unread ' : ''}alerts${filter !== 'all' && filter !== 'unread' ? ` in ${esc(filter)}` : ''}.</div>
            </div>`}
        </div>
      </div>
    </div>`;
}

export function renderAlerts(mainEl) {
  hostEl = mainEl;
  filter = 'all';
  query = '';
  if (!dateLeadBound && dc()) {
    dateLeadBound = true;
    dc().onLead(hostEl, (lead, root) => {
      if (!hostEl.querySelector('[data-al-board]')) return;
      if (root && !hostEl.contains(root)) return;
      dateLead = lead;
      paint();
    });
  }
  paint();

  mainEl.addEventListener('click', (e) => {
    const f = e.target.closest('[data-al-filter]');
    if (f) { const v = f.dataset.alFilter; filter = (filter === v && v !== 'all') ? 'all' : v; paint(); return; }

    const x = e.target.closest('[data-al-action="dismiss"]');
    if (x) { e.stopPropagation(); dismiss(x.dataset.id); return; }

    const act = e.target.closest('[data-al-action]');
    if (act) { runAlertsIntent(act.dataset.alAction); return; }

    const item = e.target.closest('[data-al-id]');
    if (item) { openAlert(item.dataset.alId); }
  });

  mainEl.addEventListener('input', (e) => {
    const s = e.target.closest('[data-al-search]');
    if (!s) return;
    query = s.value.trim().toLowerCase();
    const pos = s.selectionStart;
    paint();
    const again = hostEl.querySelector('[data-al-search]');
    if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (_) {} }
  });
}

function openAlert(id) {
  const a = ALERTS.find((x) => x.id === id);
  if (!a) return;
  a.read = true;
  if (a.href) { window.location.href = a.href; return; }
  paint();
}

function dismiss(id) {
  const i = ALERTS.findIndex((x) => x.id === id);
  if (i < 0) return;
  const [a] = ALERTS.splice(i, 1);
  paint();
  toast(`Dismissed \u201c${a.title}\u201d`, 'delete_outline');
}

function markAllRead() {
  ALERTS.forEach((a) => { a.read = true; });
  paint();
  toast('All alerts marked read', 'done_all');
}

/* ---- WISEcodeAI bridge -------------------------------------------------- */

export function runAlertsIntent(action) {
  switch (action) {
    case 'mark_all': markAllRead(); break;
    case 'unread': filter = 'unread'; paint(); break;
    case 'verification': filter = 'verification'; paint(); break;
    case 'ingredient': filter = 'ingredient'; paint(); break;
    default: break;
  }
}

export const ALERTS_WISEAI = {
  sub: 'Triage your alerts \u2014 filter, read, or clear them for you.',
  chipsFlow: 'wrap',
  sourceLabel: '',
  scorecards: {
    label: 'Your alerts at a glance',
    cards: [
      { intent: 'flags', icon: 'flag', iconTone: 'brand', pill: { tone: 'up', icon: 'priority_high', text: 'Do next' }, title: 'What needs my review?', desc: '3 ingredient flags need review \u2014 I\u2019ll filter to them so you can jump to the products.', action: 'Show what needs review', ask: 'What needs my review?' },
      { intent: 'show_unread', icon: 'mark_email_unread', iconTone: 'brand', pill: { tone: 'up', icon: 'filter_alt', text: 'Triage' }, title: 'Show only unread', desc: 'Filter the stream down to just the alerts you haven\u2019t seen yet.', action: 'Show unread', ask: 'Show only unread' },
      { intent: 'verification', icon: 'verified', iconTone: 'brand', pill: { tone: 'up', icon: 'verified', text: 'Verify' }, title: 'Verification alerts', desc: 'A Sample Co. verification is ready and 12 shields were minted yesterday.', action: 'Show verification alerts', ask: 'Verification alerts' },
      { intent: 'mark_all', icon: 'done_all', iconTone: 'brand', pill: { tone: 'up', icon: 'done_all', text: 'Clear' }, title: 'Mark everything read', desc: 'Clear the stream \u2014 mark every alert as read in one tap.', action: 'Mark all read', ask: 'Mark everything read' },
    ],
  },
  intents: [
    { intent: 'show_unread', label: 'Show only unread', icon: 'mark_email_unread' },
    { intent: 'mark_all', label: 'Mark everything read', icon: 'done_all' },
    { intent: 'flags', label: 'What needs my review?', icon: 'flag' },
    { intent: 'verification', label: 'Verification alerts', icon: 'verified' },
  ],
  intentReplies: {
    show_unread: () => { const u = ALERTS.filter((a) => !a.read).length; return `Filtered to your <strong>${u}</strong> unread alert${u === 1 ? '' : 's'}.`; },
    mark_all: 'Marked <strong>every alert</strong> as read \u2014 your stream is clear.',
    flags: 'The one that needs you most is <strong>\u201c3 ingredient flags need review\u201d</strong> from the Ingredient Parsing Agent. I\u2019ve filtered to ingredient alerts \u2014 open it to jump to the products.',
    verification: 'Filtered to <strong>verification</strong> alerts \u2014 a Sample Co. verification is ready and 12 shields were minted yesterday.',
  },
  onIntent: (intent) => {
    if (intent === 'show_unread') { runAlertsIntent('unread'); return false; }
    if (intent === 'mark_all') { runAlertsIntent('mark_all'); return false; }
    if (intent === 'flags') { runAlertsIntent('ingredient'); return false; }
    if (intent === 'verification') { runAlertsIntent('verification'); return false; }
    return false;
  },
};
