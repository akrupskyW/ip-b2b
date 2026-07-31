/**
 * Alerts module.
 *
 * A full-page alerts inbox rendered into #agent-main-scroll on alerts.html (the
 * side-panel bell stays available elsewhere; this is the roomy, filterable
 * view). Alerts group by day, can be filtered by category, marked read, or
 * cleared. The persistent WISEai dock drives it — intent chips filter to
 * unread, mark everything read, or jump to a category — and each on-page action
 * narrates back into the conversation.
 */

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* Alert feed (demo). `cat` groups filtering; `href` (optional) makes an alert
   jump to the relevant page. */
const ALERTS = [
  { id: 'a1', cat: 'verification', icon: 'verified', tone: 'green', title: 'Verification ready: Sample Co.', sub: 'Portfolio Agent', when: 'today', time: '2m ago', read: false, href: 'verification.html' },
  { id: 'a2', cat: 'ingredient', icon: 'science', tone: 'amber', title: '3 ingredient flags need review', sub: 'Ingredient Parsing Agent', when: 'today', time: '14m ago', read: false, href: 'product-portfolio.html' },
  { id: 'a3', cat: 'trends', icon: 'trending_up', tone: 'cyan', title: 'New trend signal: low-FODMAP snacking', sub: 'Trends Agent', when: 'today', time: '1h ago', read: false, href: '' },
  { id: 'a4', cat: 'reformulation', icon: 'fact_check', tone: 'blue', title: 'Reformulation simulation complete', sub: 'Audit & Reformulation Agent', when: 'today', time: '3h ago', read: true, href: 'reformulation.html' },
  { id: 'a5', cat: 'reports', icon: 'description', tone: 'blue', title: '“Q3 Portfolio UPF Report” published', sub: 'Reports', when: 'yesterday', time: 'Yesterday · 4:11 PM', read: true, href: '' },
  { id: 'a6', cat: 'verification', icon: 'workspace_premium', tone: 'green', title: '12 Non-UPF shields minted', sub: 'Verification Lifecycle Agent', when: 'yesterday', time: 'Yesterday · 9:24 AM', read: true, href: 'verification.html' },
  { id: 'a7', cat: 'ingredient', icon: 'inventory_2', tone: 'amber', title: 'Data ingestion finished: 48 SKUs', sub: 'Data Ingestion Agent', when: 'earlier', time: 'Mon · 2:03 PM', read: true, href: 'product-portfolio.html' },
  { id: 'a8', cat: 'account', icon: 'key', tone: 'blue', title: 'Production API key rotated', sub: 'API keys', when: 'earlier', time: 'Mon · 11:40 AM', read: true, href: 'api-keys.html' },
];

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'verification', label: 'Verification' },
  { id: 'ingredient', label: 'Ingredients' },
  { id: 'reports', label: 'Reports' },
  { id: 'trends', label: 'Trends' },
  { id: 'account', label: 'Account' },
];

const DAY_LABEL = { today: 'Today', yesterday: 'Yesterday', earlier: 'Earlier this week' };

let hostEl = null;
let filter = 'all';

function toneColor(tone) {
  const map = { green: 'var(--sec-green, #2e7d32)', amber: 'var(--ter-amber, #e0a800)', cyan: 'var(--sec-cyan, #22b8cf)', blue: 'var(--primary)' };
  return map[tone] || 'var(--primary)';
}

function matches(a) {
  if (filter === 'all') return true;
  if (filter === 'unread') return !a.read;
  return a.cat === filter;
}

function toast(msg, icon = 'check_circle') {
  let wrap = document.getElementById('al-toast-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.id = 'al-toast-wrap'; document.body.appendChild(wrap); }
  const t = document.createElement('div');
  t.className = 'al-toast';
  t.innerHTML = `<span class="material-icons">${esc(icon)}</span><span>${esc(msg)}</span>`;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('is-in'));
  setTimeout(() => { t.classList.remove('is-in'); setTimeout(() => t.remove(), 260); }, 2600);
}

function paint() {
  if (!hostEl) return;
  const shown = ALERTS.filter(matches);
  const unread = ALERTS.filter((a) => !a.read).length;
  const groups = ['today', 'yesterday', 'earlier']
    .map((d) => ({ day: d, items: shown.filter((a) => a.when === d) }))
    .filter((g) => g.items.length);

  hostEl.innerHTML = `
    <div class="al-wrap">
      <div class="al-breadcrumb"><span>Account</span><span class="material-icons">chevron_right</span><span class="al-breadcrumb-here">Alerts</span></div>
      <div class="al-head-row">
        <div>
          <h1 class="al-title">Alerts</h1>
          <p class="al-lede">${unread ? `You have <strong>${unread}</strong> unread alert${unread === 1 ? '' : 's'} across your agents.` : 'You\u2019re all caught up.'}</p>
        </div>
        <button type="button" class="al-btn al-btn--ghost" data-al-action="mark_all"${unread ? '' : ' disabled'}><span class="material-icons">done_all</span>Mark all read</button>
      </div>

      <div class="al-filters" role="tablist">
        ${CATEGORIES.map((c) => {
          const count = c.id === 'all' ? ALERTS.length : c.id === 'unread' ? unread : ALERTS.filter((a) => a.cat === c.id).length;
          if (count === 0 && c.id !== 'all' && c.id !== 'unread') return '';
          return `<button type="button" class="al-filter${c.id === filter ? ' is-active' : ''}" data-al-filter="${c.id}">${esc(c.label)}<span class="al-filter-count">${count}</span></button>`;
        }).join('')}
      </div>

      ${groups.length ? groups.map((g) => `
        <div class="al-group">
          <div class="al-group-title">${esc(DAY_LABEL[g.day])}</div>
          <div class="al-list">
            ${g.items.map((a) => `
              <div class="al-item${a.read ? '' : ' is-unread'}" data-al-id="${a.id}"${a.href ? ` data-al-href="${esc(a.href)}"` : ''}>
                <span class="al-item-ic" style="--ic:${toneColor(a.tone)}"><span class="material-icons">${esc(a.icon)}</span></span>
                <div class="al-item-body">
                  <div class="al-item-title">${esc(a.title)}</div>
                  <div class="al-item-sub">${esc(a.sub)} · ${esc(a.time)}</div>
                </div>
                ${a.read ? '' : '<span class="al-unread-dot" title="Unread"></span>'}
                <button type="button" class="al-item-x" data-al-action="dismiss" data-id="${a.id}" title="Dismiss"><span class="material-icons">close</span></button>
              </div>`).join('')}
          </div>
        </div>`).join('') : `
        <div class="al-empty">
          <span class="material-icons">notifications_off</span>
          <div>No ${filter === 'unread' ? 'unread ' : ''}alerts${filter !== 'all' && filter !== 'unread' ? ` in ${esc(filter)}` : ''}.</div>
        </div>`}
    </div>`;
}

export function renderAlerts(mainEl) {
  hostEl = mainEl;
  filter = 'all';
  paint();

  mainEl.addEventListener('click', (e) => {
    const f = e.target.closest('[data-al-filter]');
    if (f) { filter = f.dataset.alFilter; paint(); return; }

    const x = e.target.closest('[data-al-action="dismiss"]');
    if (x) { e.stopPropagation(); dismiss(x.dataset.id); return; }

    const act = e.target.closest('[data-al-action]');
    if (act) { runAlertsIntent(act.dataset.alAction); return; }

    const item = e.target.closest('[data-al-id]');
    if (item) { openAlert(item.dataset.alId); }
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
  toast(`Dismissed “${a.title}”`, 'delete_outline');
}

function markAllRead() {
  ALERTS.forEach((a) => { a.read = true; });
  paint();
  toast('All alerts marked read', 'done_all');
}

/* ---- WISEai bridge -------------------------------------------------- */

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
  sub: 'Triage your alerts — filter, read, or clear them for you.',
  chipsFlow: 'wrap',
  sourceLabel: '',
  intents: [
    { intent: 'show_unread', label: 'Show only unread', icon: 'mark_email_unread' },
    { intent: 'mark_all', label: 'Mark everything read', icon: 'done_all' },
    { intent: 'flags', label: 'What needs my review?', icon: 'flag' },
    { intent: 'verification', label: 'Verification alerts', icon: 'verified' },
  ],
  intentReplies: {
    show_unread: () => { const u = ALERTS.filter((a) => !a.read).length; return `Filtered to your <strong>${u}</strong> unread alert${u === 1 ? '' : 's'}.`; },
    mark_all: 'Marked <strong>every alert</strong> as read — your inbox is clear.',
    flags: 'The one that needs you most is <strong>“3 ingredient flags need review”</strong> from the Ingredient Parsing Agent. I\u2019ve filtered to ingredient alerts — open it to jump to the products.',
    verification: 'Filtered to <strong>verification</strong> alerts — a Sample Co. verification is ready and 12 shields were minted yesterday.',
  },
  onIntent: (intent) => {
    if (intent === 'show_unread') { runAlertsIntent('unread'); return false; }
    if (intent === 'mark_all') { runAlertsIntent('mark_all'); return false; }
    if (intent === 'flags') { runAlertsIntent('ingredient'); return false; }
    if (intent === 'verification') { runAlertsIntent('verification'); return false; }
    return false;
  },
};
