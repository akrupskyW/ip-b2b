/**
 * Invoices & Downloads module.
 *
 * A self-contained account surface rendered into #agent-main-scroll on
 * invoices.html (an app-nav shell page). It presents the signed-in
 * organization's invoices as a filterable board — at-a-glance status cards
 * (All / Invoice Sent / Paid / Failed / Cancelled) that toggle a row filter,
 * a live search, and per-row actions (Pay, Retry, Cancel, Mark paid, Download,
 * Invoice).
 *
 * Like the other account modules it pairs with the persistent WISEai chat dock
 * to its LEFT (invoices.html pins `data-default-dock="left"`):
 *   • chat → board  Intent chips filter the board, download paid invoices, or
 *                   jump to the oldest outstanding invoice.
 *   • board → chat  Row actions (Pay, Retry, Cancel, Download …) narrate back
 *                   into the conversation via the live chat handle.
 *
 * All classes are token-driven (var(--surface) / var(--border) / var(--text) …)
 * so the module tracks light/dark exactly like the rest of the app.
 */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ---- Invoice data — seeded to match the Flax4Life sample org --------- */
const INVOICES = [
  { id: 'RQVPPYUX-0001', date: 'Apr 20, 2026', desc: 'SKU Verification', sub: '9 items', amount: '$891.00', status: 'sent' },
  { id: 'RQVPPYUX-0002', date: 'Apr 18, 2026', desc: 'Non-UPF Shield Activation', sub: '9 shields', amount: '$1,350.00', status: 'sent' },
  { id: 'RQVPPYUX-0003', date: 'Apr 12, 2026', desc: 'Marketing Assets Pack', sub: '24 assets', amount: '$480.00', status: 'paid' },
  { id: 'RQVPPYUX-0004', date: 'Mar 30, 2026', desc: 'GRAS Verification', sub: '4 items', amount: '$620.00', status: 'paid' },
  { id: 'RQVPPYUX-0005', date: 'Mar 22, 2026', desc: 'Bulk UPC Import', sub: '128 UPCs', amount: '$256.00', status: 'failed' },
  { id: 'RQVPPYUX-0006', date: 'Mar 15, 2026', desc: 'Reformulation Report', sub: '2 items', amount: '$340.00', status: 'cancelled' },
];

const STATUS_META = {
  sent:      { label: 'Invoice Sent', icon: 'schedule',     cls: 'inv-chip--sent' },
  paid:      { label: 'Paid',         icon: 'check', cls: 'inv-chip--paid' },
  failed:    { label: 'Failed',       icon: 'error',        cls: 'inv-chip--failed' },
  cancelled: { label: 'Cancelled',    icon: 'cancel',       cls: 'inv-chip--cancelled' },
};

/* The at-a-glance filter cards, in display order. `status: null` is the "All"
   card that clears the active filter. */
const FILTERS = [
  { status: null,        label: 'All',          accent: '' },
  { status: 'sent',      label: 'Invoice Sent', accent: 'inv-stat--sent',      icon: 'schedule' },
  { status: 'paid',      label: 'Paid',         accent: 'inv-stat--paid',      icon: 'check' },
  { status: 'failed',    label: 'Failed',       accent: 'inv-stat--failed',    icon: 'error' },
  { status: 'cancelled', label: 'Cancelled',    accent: 'inv-stat--cancelled', icon: 'cancel' },
];

let hostEl = null;
let activeStatus = null; // null = show all; otherwise a status key
let query = '';          // current search text (lowercased)

/* ---- Live chat bridge ---------------------------------------------- */
let chatApi = null;
export function setInvoicesChat(api) { chatApi = api; }
function pushChat(html) {
  if (!chatApi || !html) return;
  chatApi.hideWelcome?.();
  chatApi.addWISEai(html);
}

/* ---- Toast --------------------------------------------------------- */
function toast(msg, icon = 'check') {
  let wrap = document.getElementById('inv-toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'inv-toast-wrap';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = 'inv-toast';
  t.innerHTML = `<span class="material-symbols-outlined">${esc(icon)}</span><span>${esc(msg)}</span>`;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('is-in'));
  setTimeout(() => { t.classList.remove('is-in'); setTimeout(() => t.remove(), 260); }, 2600);
}

/* ==================================================================== */
/* Rendering                                                            */
/* ==================================================================== */

function countFor(status) {
  return status ? INVOICES.filter((i) => i.status === status).length : INVOICES.length;
}

/* Per-status actions, mirroring the original board's affordances. One source
   of truth is rendered two ways: as an inline button row (wide) and as a
   three-dot popover menu (narrow / mobile). */
function actionListFor(inv) {
  const invoice = { variant: 'ghost', icon: 'description', label: 'Invoice', action: 'invoice' };
  switch (inv.status) {
    case 'sent':
      return [
        { variant: 'primary', icon: 'credit_card',     label: 'Pay Now',              action: 'pay' },
        { variant: 'danger',  icon: 'cancel',          label: 'Cancel',               action: 'cancel' },
        { variant: 'good',    icon: 'account_balance', label: 'Mark paid externally', action: 'mark-paid' },
        invoice,
      ];
    case 'failed':
      return [
        { variant: 'primary', icon: 'refresh', label: 'Retry Payment', action: 'retry' },
        { variant: 'danger',  icon: 'cancel',  label: 'Cancel',        action: 'cancel' },
        invoice,
      ];
    case 'paid':
      return [{ variant: 'ghost', icon: 'download', label: 'Download', action: 'download' }, invoice];
    case 'cancelled':
    default:
      return [invoice];
  }
}

/* Inline button row (shown on a wide board). */
function actionsFor(inv) {
  return actionListFor(inv).map((a) =>
    `<button type="button" class="inv-btn inv-btn--${esc(a.variant)}" data-inv-action="${esc(a.action)}" data-inv-id="${esc(inv.id)}"><span class="material-symbols-outlined">${esc(a.icon)}</span>${esc(a.label)}</button>`
  ).join('');
}

/* Three-dot menu + popover (shown when the board is too narrow for the row). */
function menuFor(inv) {
  const items = actionListFor(inv).map((a) =>
    `<button type="button" class="inv-rowmenu-item inv-rowmenu-item--${esc(a.variant)}" role="menuitem" data-inv-action="${esc(a.action)}" data-inv-id="${esc(inv.id)}"><span class="material-symbols-outlined">${esc(a.icon)}</span>${esc(a.label)}</button>`
  ).join('');
  return `<div class="inv-rowmenu"><button type="button" class="inv-rowmenu-btn" aria-haspopup="true" aria-expanded="false" aria-label="Actions" title="Actions"><span class="material-symbols-outlined">more_vert</span></button><div class="inv-rowmenu-pop" role="menu" hidden>${items}</div></div>`;
}

function rowHtml(inv) {
  const m = STATUS_META[inv.status];
  return `
    <div class="inv-trow" data-inv-row="${esc(inv.id)}" data-inv-status="${esc(inv.status)}">
      <span class="inv-td"><span class="inv-meta"><span class="inv-date">${esc(inv.date)}</span><span class="inv-num">#${esc(inv.id)}</span><span class="inv-state inv-state--${esc(inv.status)}"><span class="material-symbols-outlined">${esc(m.icon)}</span>${esc(m.label)}</span></span></span>
      <span class="inv-td inv-desc"><span class="inv-amount">${esc(inv.amount)}</span><span class="inv-desc-name">${esc(inv.desc)}</span><span class="inv-desc-sub">${esc(inv.sub)}</span></span>
      <span class="inv-td"><span class="inv-actions">${actionsFor(inv)}</span>${menuFor(inv)}</span>
    </div>`;
}

/* ---- Sorting -------------------------------------------------------- */
/* Each sortable column knows how to derive a comparable key from a row. The
   combined columns sort by their primary (top) field: Date for the
   Date/Invoice/Status column and Amount for the Amount/Description column.
   Actions is not sortable. */
const SORT_COLS = [
  { key: 'date',   label: 'Date / Invoice',        sortable: true,  value: (i) => Date.parse(i.date) || 0, type: 'num' },
  { key: 'amount', label: 'Amount / Description',  sortable: true,  value: (i) => parseFloat(String(i.amount).replace(/[^0-9.\-]/g, '')) || 0, type: 'num' },
  { key: 'actions', label: 'Actions',              sortable: false },
];

let sortKey = null;   // null = original seeded order
let sortDir = 1;      // 1 asc, -1 desc

const ARROW_SVG =
  '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true">' +
  '<path d="M6 9.5V2.5M3 6.5L6 9.5l3-3" stroke="currentColor" stroke-width="1.4" ' +
  'stroke-linecap="round" stroke-linejoin="round"/></svg>';

function theadHtml() {
  return SORT_COLS.map((c) => {
    if (!c.sortable) return `<span class="inv-th">${esc(c.label)}</span>`;
    const active = c.key === sortKey;
    const dirAttr = active ? ` data-inv-dir="${sortDir === 1 ? 'asc' : 'desc'}"` : '';
    const ariaSort = active ? (sortDir === 1 ? 'ascending' : 'descending') : 'none';
    return `<span class="inv-th inv-th--sortable" role="button" tabindex="0" data-inv-sort="${esc(c.key)}" aria-sort="${ariaSort}"${dirAttr}>${esc(c.label)}<span class="inv-sort-arrow" aria-hidden="true">${ARROW_SVG}</span></span>`;
  }).join('');
}

/* The invoice list in current sort order (falls back to seeded order). */
function orderedInvoices() {
  if (!sortKey) return INVOICES.slice();
  const col = SORT_COLS.find((c) => c.key === sortKey);
  if (!col) return INVOICES.slice();
  const indexed = INVOICES.map((inv, i) => ({ inv, i }));
  indexed.sort((a, b) => {
    const av = col.value(a.inv);
    const bv = col.value(b.inv);
    let r;
    if (col.type === 'text') r = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
    else r = (av - bv);
    return (r * sortDir) || (a.i - b.i);
  });
  return indexed.map((o) => o.inv);
}

/* Re-order the rendered rows in place, then re-apply the active filter and
   refresh the header arrows. */
function applySort() {
  if (!hostEl) return;
  const rowsWrap = hostEl.querySelector('[data-inv-rows]');
  if (rowsWrap) rowsWrap.innerHTML = orderedInvoices().map(rowHtml).join('');
  const thead = hostEl.querySelector('.inv-thead');
  if (thead) thead.innerHTML = theadHtml();
  applyFilter();
}

/* Click a header: same column toggles asc↔desc, a new column starts ascending. */
function toggleSort(key) {
  const col = SORT_COLS.find((c) => c.key === key);
  if (!col || !col.sortable) return;
  if (sortKey === key) sortDir = -sortDir;
  else { sortKey = key; sortDir = 1; }
  applySort();
}

function statsHtml() {
  return FILTERS.map((f) => {
    const isAll = f.status === null;
    const active = isAll ? activeStatus === null : activeStatus === f.status;
    const accent = f.accent ? ` ${f.accent}` : '';
    const icon = f.icon ? `<span class="material-symbols-outlined">${esc(f.icon)}</span>` : '';
    return `
      <button type="button" class="inv-stat${accent}${active ? ' is-active' : ''}" data-inv-filter="${f.status == null ? '' : esc(f.status)}" aria-pressed="${active ? 'true' : 'false'}">
        <span class="inv-stat-num">${countFor(f.status)}</span>
        <span class="inv-stat-label">${icon}${esc(f.label)}</span>
      </button>`;
  }).join('');
}

function paint() {
  if (!hostEl) return;
  hostEl.innerHTML = `
    <div class="inv-wrap">
      <header class="inv-head">
        <h1 class="inv-title">Invoices &amp; Downloads</h1>
        <p class="inv-lede">Flax4Life · Manage your invoices and download marketing resources.</p>
      </header>

      <div class="inv-toolbar">
        <div class="inv-search-inline">
          <span class="material-symbols-outlined">search</span>
          <input type="text" class="inv-search" data-inv-search placeholder="Search by description or invoice #" aria-label="Search invoices" value="${esc(query)}" />
        </div>
        <button type="button" class="inv-btn inv-btn--primary" data-inv-action="download-all"><span class="material-symbols-outlined">download</span>Download all</button>
      </div>

      <div class="inv-card inv-board">
        <div class="inv-stats-bar"><span class="inv-stats-label">Your invoices at a glance</span></div>
        <div class="inv-stats" role="group" aria-label="Filter invoices by status">
          ${statsHtml()}
        </div>
        <div class="inv-board-divider"></div>
        <div class="inv-table-card">
          <div class="inv-table">
            <div class="inv-thead">${theadHtml()}</div>
            <div data-inv-rows>${orderedInvoices().map(rowHtml).join('')}</div>
            <div class="inv-table-foot"><span data-inv-foot></span></div>
          </div>
        </div>
      </div>
    </div>`;
  applyFilter();
}

/* ==================================================================== */
/* Filtering                                                            */
/* ==================================================================== */

function matches(inv) {
  if (activeStatus && inv.status !== activeStatus) return false;
  if (query) {
    const hay = `${inv.desc} ${inv.sub} ${inv.id}`.toLowerCase();
    if (!hay.includes(query)) return false;
  }
  return true;
}

function applyFilter() {
  if (!hostEl) return;
  let shown = 0;
  INVOICES.forEach((inv) => {
    const row = hostEl.querySelector(`[data-inv-row="${inv.id}"]`);
    if (!row) return;
    const ok = matches(inv);
    row.classList.toggle('inv-row-hidden', !ok);
    if (ok) shown++;
  });
  const foot = hostEl.querySelector('[data-inv-foot]');
  if (foot) foot.textContent = `Showing ${shown} of ${INVOICES.length} invoices`;
  hostEl.querySelectorAll('[data-inv-filter]').forEach((b) => {
    const s = b.dataset.invFilter || null;
    const active = s === activeStatus;
    b.classList.toggle('is-active', active);
    b.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

/** Set the active status filter (null clears it) and scroll the board up. */
export function setInvoiceFilter(status) {
  activeStatus = status || null;
  applyFilter();
  hostEl?.querySelector('.inv-board')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ==================================================================== */
/* Actions                                                              */
/* ==================================================================== */

function invById(id) { return INVOICES.find((i) => i.id === id) || null; }

function runAction(action, id, source) {
  const inv = id ? invById(id) : null;
  let msg = '';
  let icon = 'check';
  let html = '';

  switch (action) {
    case 'download-all':
      msg = 'Preparing all invoices for download'; icon = 'download';
      html = 'Preparing a ZIP of <strong>all invoices</strong> — your download will start shortly.';
      break;
    case 'pay':
      msg = `Opening payment for #${id}`; icon = 'credit_card';
      html = `Opening secure checkout for <strong>#${esc(id)}</strong> (${esc(inv?.desc || '')}, ${esc(inv?.amount || '')}).`;
      break;
    case 'retry':
      msg = `Retrying payment for #${id}`; icon = 'refresh';
      html = `Retrying the failed payment on <strong>#${esc(id)}</strong> (${esc(inv?.amount || '')}).`;
      break;
    case 'cancel':
      msg = `Cancelling #${id}`; icon = 'cancel';
      html = `Cancelling invoice <strong>#${esc(id)}</strong>. This can't be undone once processed.`;
      break;
    case 'mark-paid':
      msg = `Marked #${id} paid externally`; icon = 'account_balance';
      html = `Marked <strong>#${esc(id)}</strong> as paid externally — we'll reconcile it on your next statement.`;
      break;
    case 'download':
      msg = `Downloading #${id}`; icon = 'download';
      html = `Downloading the deliverables for <strong>#${esc(id)}</strong> (${esc(inv?.desc || '')}).`;
      break;
    case 'invoice':
      msg = `Opening invoice #${id}`; icon = 'description';
      html = `Opening the PDF for invoice <strong>#${esc(id)}</strong>.`;
      break;
    default:
      return;
  }
  toast(msg, icon);
  if (source === 'chat') return html;
  pushChat(html);
}

/* ==================================================================== */
/* Mount                                                                */
/* ==================================================================== */

export function renderInvoices(mainEl) {
  hostEl = mainEl;
  activeStatus = null;
  query = '';
  sortKey = null;
  sortDir = 1;
  paint();

  mainEl.addEventListener('click', (e) => {
    const filter = e.target.closest('[data-inv-filter]');
    if (filter) {
      const s = filter.dataset.invFilter || null;
      /* Clicking the active status card toggles it back off. */
      activeStatus = (s && s === activeStatus) ? null : s;
      applyFilter();
      return;
    }
    const sortHeader = e.target.closest('[data-inv-sort]');
    if (sortHeader) {
      toggleSort(sortHeader.dataset.invSort);
      return;
    }
    /* Row-actions three-dot menu (narrow board). */
    const menuBtn = e.target.closest('.inv-rowmenu-btn');
    if (menuBtn) {
      const menu = menuBtn.closest('.inv-rowmenu');
      const open = !menu.classList.contains('is-open');
      closeMenus(open ? menu : null);
      menu.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      const pop = menu.querySelector('.inv-rowmenu-pop');
      if (pop) pop.hidden = !open;
      return;
    }
    const actionBtn = e.target.closest('[data-inv-action]');
    if (actionBtn) {
      runAction(actionBtn.dataset.invAction, actionBtn.dataset.invId || null, 'form');
      closeMenus(null);
      return;
    }
    /* A click anywhere else on the board closes any open row menu. */
    closeMenus(null);
  });

  mainEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeMenus(null); return; }
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    const sortHeader = e.target.closest('[data-inv-sort]');
    if (!sortHeader) return;
    e.preventDefault();
    toggleSort(sortHeader.dataset.invSort);
  });

  mainEl.addEventListener('input', (e) => {
    const search = e.target.closest('[data-inv-search]');
    if (!search) return;
    query = search.value.trim().toLowerCase();
    applyFilter();
  });

  /* Close an open row menu when clicking outside the board entirely. */
  document.addEventListener('click', (e) => {
    if (!hostEl) return;
    if (e.target.closest && e.target.closest('.inv-rowmenu')) return;
    closeMenus(null);
  });
}

/* Close every open row-actions menu except `keep` (pass null to close all). */
function closeMenus(keep) {
  if (!hostEl) return;
  hostEl.querySelectorAll('.inv-rowmenu.is-open').forEach((menu) => {
    if (menu === keep) return;
    menu.classList.remove('is-open');
    const btn = menu.querySelector('.inv-rowmenu-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    const pop = menu.querySelector('.inv-rowmenu-pop');
    if (pop) pop.hidden = true;
  });
}

/* ==================================================================== */
/* WISEai bridge (chat → board)                                         */
/* ==================================================================== */

function statusFromText(t) {
  if (/\bpaid\b/.test(t)) return 'paid';
  if (/\bfail/.test(t)) return 'failed';
  if (/\bcancel/.test(t)) return 'cancelled';
  if (/\bsent\b|\boutstanding\b|\bunpaid\b|\bpending\b|\bopen\b/.test(t)) return 'sent';
  return undefined;
}

function reply(text) {
  const t = String(text || '').trim().toLowerCase();
  if (!t) return 'I can filter your invoices, download paid ones, or jump to what\u2019s outstanding — just ask.';

  if (/download all|download everything|all invoices/.test(t)) {
    return runAction('download-all', null, 'chat');
  }
  if (/show all|clear|reset|everything/.test(t)) {
    setInvoiceFilter(null);
    return 'Cleared the filter — showing <strong>all invoices</strong>.';
  }
  const status = statusFromText(t);
  if (status) {
    setInvoiceFilter(status);
    const n = countFor(status);
    return `Filtered to <strong>${STATUS_META[status].label}</strong> invoices — ${n} match${n === 1 ? '' : 'es'}.`;
  }
  if (/oldest|next|pay/.test(t)) {
    const outstanding = INVOICES.filter((i) => i.status === 'sent' || i.status === 'failed');
    if (!outstanding.length) return 'You have no outstanding invoices — everything is paid or closed.';
    const target = outstanding[outstanding.length - 1];
    setInvoiceFilter(null);
    return `Your oldest outstanding invoice is <strong>#${esc(target.id)}</strong> (${esc(target.desc)}, ${esc(target.amount)}). Use <strong>Pay Now</strong> on its row to settle it.`;
  }
  return 'Try \u201cshow failed invoices\u201d, \u201cdownload all\u201d, or \u201cwhat\u2019s outstanding?\u201d.';
}

export const INVOICES_WISEAI = {
  sub: 'Filter, pay, and download your invoices \u2014 tap a chip or just ask.',
  chipsFlow: 'wrap',
  sourceLabel: '',
  reply,
  /* Large "at a glance" cards shown alongside the small chips on the welcome
     screen — each reuses an existing intent so a click drives the same flow. */
  scorecards: {
    label: 'Your invoices at a glance',
    cards: [
      { intent: 'outstanding', icon: 'schedule', iconTone: 'brand', pill: { tone: 'up', icon: 'priority_high', text: 'Do next' }, title: 'What\u2019s outstanding?', desc: 'Invoice-sent or failed payments — settle up right from the row.', action: 'What\u2019s outstanding?', ask: 'What\u2019s outstanding?' },
      { intent: 'show_failed', icon: 'error', iconTone: 'brand', pill: { tone: 'up', icon: 'autorenew', text: 'Retry' }, title: 'Failed payments', desc: 'Retry any failed charge directly from its row.', action: 'Show failed payments', ask: 'Show failed payments' },
      { intent: 'show_paid', icon: 'check', iconTone: 'brand', pill: { tone: 'up', icon: 'check', text: 'Paid' }, title: 'Paid invoices', desc: 'Everything already settled, filtered in one tap.', action: 'Show paid', ask: 'Show paid invoices' },
      { intent: 'show_all', icon: 'receipt_long', iconTone: 'brand', pill: { tone: 'up', icon: 'receipt_long', text: 'All' }, title: 'All invoices', desc: 'Your full billing history in one list.', action: 'Show all', ask: 'Show all invoices' },
      { intent: 'download_all', icon: 'download', iconTone: 'brand', pill: { tone: 'up', icon: 'folder_zip', text: 'Export' }, title: 'Download all', desc: 'Grab a ZIP of every invoice for your records.', action: 'Download all', ask: 'Download all' },
    ],
  },
  intents: [
    { intent: 'outstanding', label: 'What\u2019s outstanding?', icon: 'schedule' },
    { intent: 'show_paid', label: 'Show paid invoices', icon: 'check' },
    { intent: 'show_failed', label: 'Show failed payments', icon: 'error' },
    { intent: 'show_cancelled', label: 'Show cancelled', icon: 'cancel' },
    { intent: 'show_all', label: 'Show all invoices', icon: 'receipt_long' },
    { intent: 'download_all', label: 'Download all', icon: 'download' },
  ],
  intentReplies: {
    outstanding: () => {
      const n = INVOICES.filter((i) => i.status === 'sent' || i.status === 'failed').length;
      return `You have <strong>${n}</strong> outstanding invoice${n === 1 ? '' : 's'} (Invoice Sent or Failed). I\u2019ve highlighted your invoices — use <strong>Pay Now</strong> or <strong>Retry Payment</strong> on a row to settle up.`;
    },
    show_paid: () => `Filtered to <strong>Paid</strong> invoices — ${countFor('paid')} total.`,
    show_failed: () => `Filtered to <strong>Failed</strong> payments — ${countFor('failed')} total. You can retry each from its row.`,
    show_cancelled: () => `Filtered to <strong>Cancelled</strong> invoices — ${countFor('cancelled')} total.`,
    show_all: () => `Showing all <strong>${INVOICES.length}</strong> invoices.`,
    download_all: () => 'Preparing a ZIP of <strong>all invoices</strong> — your download will start shortly.',
  },
  onIntent: (intent) => {
    switch (intent) {
      case 'outstanding':    setInvoiceFilter(null); break;
      case 'show_paid':      setInvoiceFilter('paid'); break;
      case 'show_failed':    setInvoiceFilter('failed'); break;
      case 'show_cancelled': setInvoiceFilter('cancelled'); break;
      case 'show_all':       setInvoiceFilter(null); break;
      case 'download_all':   toast('Preparing all invoices for download', 'download'); break;
      default: break;
    }
    return false; // let the matching guidance reply post
  },
};
