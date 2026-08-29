/**
 * Help module.
 *
 * A help-center surface rendered into #agent-main-scroll on help.html: a search
 * box, browse-by-topic cards, expandable FAQs, and a contact-support panel. A
 * Share-style email form docks as the next sticky module to the right. The
 * persistent WISEcodeAI dock drives it — intent chips search the FAQs, expand a
 * topic, or open the contact form — and each on-page action narrates back.
 */

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const TOPICS = [
  { id: 'getting-started', icon: 'rocket_launch', title: 'Getting started', sub: 'Set up your workspace and add your first products' },
  { id: 'verification', icon: 'verified', title: 'Verification', sub: 'Non-UPF & GRAS verification, attestation, and shields' },
  { id: 'reports', icon: 'description', title: 'Reports & analytics', sub: 'Portfolio scores, distributions, and exports' },
  { id: 'billing', icon: 'credit_card', title: 'Billing & plans', sub: 'Invoices, seats, and upgrades' },
  { id: 'api', icon: 'code', title: 'API & integrations', sub: 'Keys, webhooks, and the WISE API' },
  { id: 'account', icon: 'manage_accounts', title: 'Account & security', sub: 'Profile, passwords, and 2FA' },
];

const FAQS = [
  { topic: 'verification', q: 'How does Non-UPF verification work?', a: 'You select pre-qualified SKUs, sign an attestation that your ingredient data matches the packaging, then pay per SKU. WISE mints a Non-UPF Verified™ shield you can use on packaging and marketing.' },
  { topic: 'verification', q: 'What\u2019s the difference between Non-UPF and GRAS verification?', a: 'Non-UPF verification classifies finished products against the NOVA scale. GRAS verification works at the ingredient level, documenting Generally Recognized As Safe status for each additive.' },
  { topic: 'reports', q: 'How is my portfolio UPF score calculated?', a: 'Each product is classified against the NOVA scale; your score is the share of your line-up that lands as Non-UPF. Open any report to see the per-product and per-ingredient breakdown.' },
  { topic: 'billing', q: 'How do I download an invoice?', a: 'Invoices live under Organization → Invoices. Each is available as a PDF the moment it\u2019s issued.' },
  { topic: 'api', q: 'Where do I find my API keys?', a: 'Open API keys from your profile menu or the Account section of the nav. You can create and revoke keys there, and view your usage and rate limits. A key\u2019s full value is shown only once, when you create it \u2014 copy it right away, because it can\u2019t be revealed again.' },
  { topic: 'account', q: 'How do I enable two-factor authentication?', a: 'Go to My profile → Security → Manage 2FA. We recommend an authenticator app over SMS.' },
  { topic: 'getting-started', q: 'How do I add products to my portfolio?', a: 'The Data Ingestion Agent accepts files, URLs, ERP exports, and product images. Start from Product Portfolio and choose Add products.' },
  { topic: 'getting-started', q: 'How do I replay the WISEowl walkthrough?', a: 'Open Help → Replay the WISEowl walkthrough, or Preferences → Workspace → Replay tour. You can also add ?walkthrough=1 to any app URL. The owl remembers which groups you already finished.' },
];

let hostEl = null;
let openFaqs = new Set();
let query = '';
let topicFilter = 'all';

function faqMatches(f) {
  if (topicFilter !== 'all' && f.topic !== topicFilter) return false;
  if (!query) return true;
  const q = query.toLowerCase();
  return f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q) || f.topic.includes(q);
}

function topicCount(id) {
  if (id === 'all') return FAQS.length;
  return FAQS.filter((f) => f.topic === id).length;
}

/* Pick a scorecard column count that never leaves a lone orphan card. */
function statCols(n) {
  if (n <= 1) return 1;
  for (let c = Math.min(n, 6); c >= 2; c--) if (n % c === 0) return c;
  for (let c = Math.min(n, 6); c >= 2; c--) if (n % c !== 1) return c;
  return 2;
}

function highlight(text) {
  if (!query) return esc(text);
  const q = query.trim();
  if (!q) return esc(text);
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
  return esc(text).replace(re, '<mark class="hc-hl">$1</mark>');
}

function paint() {
  if (!hostEl) return;
  const faqs = FAQS.filter(faqMatches);
  const cards = [{ id: 'all', title: 'All', icon: 'help' }, ...TOPICS];
  hostEl.innerHTML = `
    <div class="wmod-wrap">
      <div class="wmod-masthead">
        <div class="wmod-masthead-main">
          <h1 class="wmod-title">Help center</h1>
          <p class="wmod-sub">Search the help articles, browse by topic, or reach our support team.</p>
          <p class="wmod-desc">Answers to the most common questions about getting started, verification, reports, billing, the API, and your account. Can\u2019t find it? The WISEcodeAI assistant on the right can answer directly.</p>
        </div>
      </div>

      <div class="wmod-toolbar">
        <div class="wmod-search-inline">
          <span class="material-symbols-outlined">search</span>
          <input type="search" class="wmod-search-input" placeholder="Search help articles" aria-label="Search help articles" value="${esc(query)}" data-hc-search />
        </div>
      </div>

      <div class="wmod-stats-wrap">
        <div class="wmod-stats" style="--wmod-cols:${statCols(cards.length)}" role="group" aria-label="Filter help by topic">
          ${cards.map((t) => `<button type="button" class="wmod-stat${t.id === topicFilter ? ' is-active' : ''}" data-hc-topic="${t.id}" aria-pressed="${t.id === topicFilter}">
            <span class="wmod-stat-num">${topicCount(t.id)}</span>
            <span class="wmod-stat-label"><span class="material-symbols-outlined">${esc(t.icon)}</span>${esc(t.title)}</span>
          </button>`).join('')}
        </div>
      </div>

      <div class="wmod-table-card">
        ${faqs.length ? faqs.map((f) => {
          const idx = FAQS.indexOf(f);
          const open = openFaqs.has(idx);
          return `
          <div class="hc-faq${open ? ' is-open' : ''}">
            <button type="button" class="hc-faq-q" data-hc-faq="${idx}">
              <span>${highlight(f.q)}</span>
              <span class="material-symbols-outlined hc-faq-chev">expand_more</span>
            </button>
            <div class="hc-faq-a">${highlight(f.a)}</div>
          </div>`;
        }).join('') : `<div class="wmod-empty"><span class="material-symbols-outlined">search_off</span><div>No articles match your search. Try the assistant on the right \u2014 it can answer directly.</div></div>`}
      </div>

      <section class="wmod-group" data-hc-anchor="support">
        <h2 class="wmod-group-title"><span class="material-symbols-outlined">support_agent</span>Still need help?</h2>
        <div class="wmod-card">
          <button type="button" class="hc-support-row" data-hc-action="tour">
            <span class="hc-support-ic"><span class="material-symbols-outlined">auto_awesome</span></span>
            <span class="hc-support-body"><span class="hc-support-title">Replay the WISEowl walkthrough</span><span class="hc-support-desc">Tour the real pages, skip a group or go one by one</span></span>
            <span class="material-symbols-outlined hc-support-arrow">chevron_right</span>
          </button>
          <button type="button" class="hc-support-row" data-hc-action="chat">
            <span class="hc-support-ic"><span class="material-symbols-outlined">forum</span></span>
            <span class="hc-support-body"><span class="hc-support-title">Chat with WISEcodeAI</span><span class="hc-support-desc">Instant answers from the assistant</span></span>
            <span class="material-symbols-outlined hc-support-arrow">chevron_right</span>
          </button>
          <button type="button" class="hc-support-row" data-hc-action="email">
            <span class="hc-support-ic"><span class="material-symbols-outlined">mail</span></span>
            <span class="hc-support-body"><span class="hc-support-title">Email support</span><span class="hc-support-desc">Fill in the form on the right \u00b7 typically replies within a few hours</span></span>
            <span class="material-symbols-outlined hc-support-arrow">chevron_right</span>
          </button>
          <button type="button" class="hc-support-row" data-hc-action="docs">
            <span class="hc-support-ic"><span class="material-symbols-outlined">menu_book</span></span>
            <span class="hc-support-body"><span class="hc-support-title">Read the docs</span><span class="hc-support-desc">Guides and API reference</span></span>
            <span class="material-symbols-outlined hc-support-arrow">chevron_right</span>
          </button>
        </div>
      </section>
    </div>`;
}

export function renderHelp(mainEl) {
  hostEl = mainEl;
  openFaqs = new Set();
  query = '';
  topicFilter = 'all';
  paint();
  mountContactPane();

  mainEl.addEventListener('click', (e) => {
    const faq = e.target.closest('[data-hc-faq]');
    if (faq) { const i = +faq.dataset.hcFaq; openFaqs.has(i) ? openFaqs.delete(i) : openFaqs.add(i); paint(); return; }
    const topic = e.target.closest('[data-hc-topic]');
    if (topic) { const v = topic.dataset.hcTopic; topicFilter = (topicFilter === v && v !== 'all') ? 'all' : v; paint(); return; }
    const act = e.target.closest('[data-hc-action]');
    if (act) { runHelpIntent(act.dataset.hcAction); }
  });

  mainEl.addEventListener('input', (e) => {
    const s = e.target.closest('[data-hc-search]');
    if (!s) return;
    query = s.value;
    /* Repaint but keep focus + caret in the search field. */
    const pos = s.selectionStart;
    paint();
    const again = hostEl.querySelector('[data-hc-search]');
    if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (_) {} }
  });
}

function setQuery(q) {
  query = q;
  paint();
}

function setTopic(t) {
  topicFilter = t;
  query = '';
  paint();
}

/* ---- WISEcodeAI bridge -------------------------------------------------- */

export function runHelpIntent(action) {
  switch (action) {
    case 'clear_search': query = ''; topicFilter = 'all'; paint(); break;
    case 'tour':
      if (window.WiseWalkthrough && typeof window.WiseWalkthrough.open === 'function') {
        window.WiseWalkthrough.open({ force: true });
      } else {
        document.addEventListener('wise:walkthrough-ready', () => window.WiseWalkthrough?.open({ force: true }), { once: true });
      }
      break;
    case 'chat': document.getElementById('wiseai-dock-panel')?.querySelector('textarea, input')?.focus(); break;
    case 'email': focusContactForm(); break;
    case 'docs': window.location.href = 'docs.html'; break;
    case 'support': focusContactForm(); break;
    default: break;
  }
}

export const HELP_WISEAI = {
  sub: 'Search help, browse topics, or reach support — ask away.',
  chipsFlow: 'wrap',
  sourceLabel: '',
  /* Large "at a glance" cards shown alongside the small chips on the welcome
     screen — each reuses an existing intent so a click drives the same flow. */
  scorecards: {
    label: 'Get help fast',
    cards: [
      { intent: 'getting_started', icon: 'rocket_launch', iconTone: 'brand', pill: { tone: 'up', icon: 'auto_awesome', text: 'Start here' }, title: 'How do I get started?', desc: 'Add products, then run verification — I\u2019ll pull up the getting-started articles.', action: 'Get started', ask: 'How do I get started?' },
      { intent: 'verification_help', icon: 'verified', iconTone: 'brand', pill: { tone: 'up', icon: 'menu_book', text: 'Learn' }, title: 'Explain verification', desc: 'Non-UPF vs GRAS — what each one classifies and documents.', action: 'Explain verification', ask: 'Explain verification' },
      { intent: 'contact', icon: 'support_agent', iconTone: 'brand', pill: { tone: 'up', icon: 'chat', text: 'Support' }, title: 'Contact support', desc: 'Chat here for instant answers, or reach the support team.', action: 'Contact support', ask: 'Contact support' },
      { intent: 'billing_help', icon: 'credit_card', iconTone: 'brand', pill: { tone: 'up', icon: 'credit_card', text: 'Billing' }, title: 'Billing & invoices', desc: 'Payments, invoices and receipts — I\u2019ll point you to the right place.', action: 'Billing & invoices', ask: 'Billing & invoices' },
    ],
  },
  intents: [
    { intent: 'getting_started', label: 'How do I get started?', icon: 'rocket_launch' },
    { intent: 'walkthrough', label: 'Replay the walkthrough', icon: 'explore' },
    { intent: 'verification_help', label: 'Explain verification', icon: 'verified' },
    { intent: 'billing_help', label: 'Billing & invoices', icon: 'credit_card' },
    { intent: 'contact', label: 'Contact support', icon: 'support_agent' },
  ],
  intentReplies: {
    getting_started: 'To get started, add products with the <strong>Data Ingestion Agent</strong> (files, URLs, ERP exports or images), then run verification. I\u2019ve pulled the getting-started articles up for you.',
    walkthrough: 'Opening the <strong>WISEowl walkthrough</strong> \u2014 I\u2019ll walk the real pages with you. Skip a group or go one by one; I\u2019ll remember what you\u2019ve already seen.',
    verification_help: '<strong>Non-UPF verification</strong> classifies finished products on the NOVA scale; <strong>GRAS verification</strong> documents ingredient-level safety. Filtered the help articles to verification.',
    billing_help: 'Invoices live under <strong>Organization → Invoices</strong> and download as PDFs. I\u2019ve surfaced the billing FAQs.',
    contact: 'Opened the <strong>Contact support</strong> form on the right \u2014 pick what\u2019s going on, tell us what happened, and Send Email. I\u2019m still here if you\u2019d rather chat.',
  },
  onIntent: (intent) => {
    if (intent === 'getting_started') { setTopic('getting-started'); return false; }
    if (intent === 'walkthrough') { runHelpIntent('tour'); return false; }
    if (intent === 'verification_help') { setTopic('verification'); return false; }
    if (intent === 'billing_help') { setTopic('billing'); return false; }
    if (intent === 'contact') { focusContactForm(); return false; }
    return false;
  },
};

/* ---- Contact support sticky module (Share-style email form) ------------- */

const SUPPORT_TO = 'support@wisecode.ai';
const MAIL_WIDTH_KEY = 'wise-help-contact-width';
const PROBLEM_TYPES = [
  { id: 'bug', icon: 'bug_report', label: 'A bug' },
  { id: 'billing', icon: 'credit_card', label: 'Billing' },
  { id: 'account', icon: 'manage_accounts', label: 'Account' },
  { id: 'verification', icon: 'verified', label: 'Verification' },
  { id: 'feature', icon: 'lightbulb', label: 'A feature idea' },
  { id: 'other', icon: 'help', label: 'Something else' },
];
const FREQ_OPTS = [
  { id: 'once', label: 'Once' },
  { id: 'sometimes', label: 'Sometimes' },
  { id: 'always', label: 'Every time' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let mailEl = null;
let mailType = '';
let mailFreq = '';
let mailSent = false;
let mailWired = false;
let mailFiles = [];
let mailFileSeq = 0;
const MAIL_MAX_FILES = 8;
const MAIL_MAX_BYTES = 25 * 1024 * 1024;

function currentUser() {
  let user = null;
  try { user = window.WiseAuth?.getUser?.() || null; } catch (_) { user = null; }
  const rawName = user && user.name;
  const isGenericDemo = !rawName || rawName === 'Demo User';
  return {
    name: isGenericDemo ? 'Arthur Krupsky' : rawName,
    email: (!isGenericDemo && user && user.email) ? user.email : 'akrupsky@wisecode.ai',
    org: (user && (user.org || user.orgname)) || 'WISE Foods',
  };
}

function typeLabel(id) {
  return (PROBLEM_TYPES.find((t) => t.id === id) || {}).label || id;
}
function freqLabel(id) {
  return (FREQ_OPTS.find((t) => t.id === id) || {}).label || id;
}

function readMailWidth() {
  try {
    const n = parseInt(localStorage.getItem(MAIL_WIDTH_KEY), 10);
    return Number.isFinite(n) ? Math.max(0, Math.min(4, n)) : 0;
  } catch {
    return 0;
  }
}

function applyMailWidth(tier) {
  const W = window.WPaneWidth;
  if (!mailEl || !W) return;
  W.applyClasses(mailEl, tier, 'panel');
  W.syncButton(mailEl.querySelector('.panel-width-toggle-btn'), tier);
}

function cycleMailWidth() {
  const W = window.WPaneWidth;
  const next = W ? W.next(readMailWidth()) : ((readMailWidth() + 1) % 5);
  try { localStorage.setItem(MAIL_WIDTH_KEY, String(next)); } catch {}
  applyMailWidth(next);
}

function chipRow(items, attr, selected) {
  return items.map((t) =>
    `<button type="button" class="chip ws-intent-chip${t.id === selected ? ' is-on' : ''}" data-${attr}="${esc(t.id)}" aria-pressed="${t.id === selected}">` +
      (t.icon ? `<span class="material-symbols-outlined">${esc(t.icon)}</span>` : '') +
      `<span>${esc(t.label)}</span></button>`
  ).join('');
}

function extraFieldsHTML() {
  if (mailType === 'bug') {
    return `
      <div class="adm-field"><label class="adm-field-label" for="hc-mail-page">Where did it happen?</label>
        <input type="text" id="hc-mail-page" class="adm-input" data-mail-page autocomplete="off"></div>
      <div class="adm-field"><span class="adm-field-label">How often?</span>
        <div class="hc-mail-chips" role="group" aria-label="How often">${chipRow(FREQ_OPTS, 'mail-freq', mailFreq)}</div></div>`;
  }
  if (mailType === 'billing') {
    return `
      <div class="adm-field"><label class="adm-field-label" for="hc-mail-invoice">Invoice number <span class="hc-mail-opt">(optional)</span></label>
        <input type="text" id="hc-mail-invoice" class="adm-input" data-mail-invoice placeholder="INV-…" autocomplete="off"></div>`;
  }
  if (mailType === 'verification') {
    return `
      <div class="adm-field"><label class="adm-field-label" for="hc-mail-sku">Product or UPC <span class="hc-mail-opt">(optional)</span></label>
        <input type="text" id="hc-mail-sku" class="adm-input" data-mail-sku placeholder="Name or barcode" autocomplete="off"></div>`;
  }
  return '';
}

function contactFormHTML(user) {
  return `
    <form class="hc-mail-form" data-mail-form novalidate>
      <div class="adm-field">
        <span class="adm-field-label">What\u2019s going on?</span>
        <div class="hc-mail-chips" role="group" aria-label="What\u2019s going on">${chipRow(PROBLEM_TYPES, 'mail-type', mailType)}</div>
      </div>
      <div class="adm-field">
        <label class="adm-field-label" for="hc-mail-what">What happened?</label>
        <textarea id="hc-mail-what" class="hc-mail-textarea" data-mail-what rows="4" placeholder="What you expected, what you saw, and anything that helps us reproduce it"></textarea>
      </div>
      <div data-mail-extra>${extraFieldsHTML()}</div>
      <div class="adm-field">
        <span class="adm-field-label">Attachments <span class="hc-mail-opt">(optional)</span></span>
        <button type="button" class="hc-mail-drop" data-mail-attach>
          <span class="material-symbols-outlined">attach_file</span>
          <span class="hc-mail-drop-text">
            <span class="hc-mail-drop-name">Attach a file</span>
            <span class="hc-mail-drop-sub">Screenshots, logs, or PDFs</span>
          </span>
        </button>
        <div class="fl-attachments" data-mail-attach-list aria-label="Attached files"></div>
      </div>
      <div class="adm-field">
        <span class="adm-field-label">Who you are</span>
        <div class="hc-mail-who">
          <label class="hc-mail-sr" for="hc-mail-name">Name</label>
          <input type="text" id="hc-mail-name" class="adm-input" data-mail-name placeholder="Your name" autocomplete="name" value="${esc(user.name)}">
          <label class="hc-mail-sr" for="hc-mail-email">Email</label>
          <input type="email" id="hc-mail-email" class="adm-input" data-mail-email placeholder="you@company.com" autocomplete="email" value="${esc(user.email)}">
          <label class="hc-mail-sr" for="hc-mail-org">Organization</label>
          <input type="text" id="hc-mail-org" class="adm-input" data-mail-org placeholder="Organization" autocomplete="organization" value="${esc(user.org)}">
        </div>
      </div>
    </form>`;
}

function contactDoneHTML() {
  const names = mailFiles.map((f) => f.name).filter(Boolean);
  const attachNote = names.length
    ? ` Attach <strong>${esc(names.join(', '))}</strong> in the message before you send \u2014 mail apps cannot pick the files up on their own.`
    : '';
  return `
    <div class="hc-mail-done" data-mail-done>
      <div class="hc-mail-created">
        <div class="hc-mail-created-title">Email ready to send</div>
        <p class="hc-mail-created-sub">Your mail app should open with the message addressed to <strong>${esc(SUPPORT_TO)}</strong>.${attachNote} If it didn\u2019t, copy the details and send them yourself.</p>
        <button type="button" class="adm-btn adm-btn--ghost" data-mail-again>Send another</button>
      </div>
    </div>`;
}

function paintContactBody() {
  if (!mailEl) return;
  const body = mailEl.querySelector('[data-mail-body]');
  const foot = mailEl.querySelector('[data-mail-foot]');
  if (!body || !foot) return;
  if (mailSent) {
    body.innerHTML = contactDoneHTML();
    foot.hidden = true;
    return;
  }
  const user = currentUser();
  body.innerHTML = contactFormHTML(user);
  foot.hidden = false;
  const page = body.querySelector('[data-mail-page]');
  if (page && !page.value) page.value = location.href;
  paintAttachList();
}

function syncTypeChips() {
  if (!mailEl) return;
  mailEl.querySelectorAll('[data-mail-type]').forEach((btn) => {
    const on = btn.dataset.mailType === mailType;
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', String(on));
  });
  const extra = mailEl.querySelector('[data-mail-extra]');
  if (extra) extra.innerHTML = extraFieldsHTML();
  const page = mailEl.querySelector('[data-mail-page]');
  if (page && !page.value) page.value = location.href;
}

function fmtMailSize(n) {
  const b = Number(n) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function clearMailFiles() {
  mailFiles.forEach((f) => {
    if (f.revoke && f.src) { try { URL.revokeObjectURL(f.src); } catch (_) {} }
  });
  mailFiles = [];
}

function paintAttachList() {
  const list = mailEl && mailEl.querySelector('[data-mail-attach-list]');
  if (!list) return;
  list.innerHTML = mailFiles.map((f) => {
    const thumb = f.src
      ? `<span class="fl-attach-thumb" style="background-image:url('${String(f.src).replace(/'/g, '%27')}')"></span>`
      : `<span class="fl-attach-thumb fl-attach-thumb--icon"><span class="material-symbols-outlined">attach_file</span></span>`;
    return `<span class="fl-attach-chip" data-mail-file-id="${esc(f.id)}" title="${esc(f.name)} · ${esc(fmtMailSize(f.size))}">` +
      `<button type="button" class="fl-attach-x" data-mail-file-x="${esc(f.id)}" aria-label="Remove ${esc(f.name)}"><span class="material-symbols-outlined">close</span></button>` +
      `<span class="fl-attach-name">${esc(f.name)}</span>${thumb}</span>`;
  }).join('');
}

function addMailFiles(fileList) {
  if (!fileList || !fileList.length) return;
  const drop = mailEl && mailEl.querySelector('[data-mail-attach]');
  for (let i = 0; i < fileList.length; i++) {
    if (mailFiles.length >= MAIL_MAX_FILES) break;
    const file = fileList[i];
    if (!file || file.size > MAIL_MAX_BYTES) {
      drop?.classList.add('is-invalid');
      continue;
    }
    const dup = mailFiles.some((f) => f.name === file.name && f.size === file.size);
    if (dup) continue;
    const isImg = /^image\//.test(file.type || '');
    const src = isImg ? URL.createObjectURL(file) : '';
    mailFiles.push({
      id: `mf-${++mailFileSeq}`,
      name: file.name || 'attachment',
      size: file.size || 0,
      src,
      revoke: !!src,
    });
    drop?.classList.remove('is-invalid');
  }
  paintAttachList();
}

function removeMailFile(id) {
  const rec = mailFiles.find((f) => f.id === id);
  if (rec && rec.revoke && rec.src) { try { URL.revokeObjectURL(rec.src); } catch (_) {} }
  mailFiles = mailFiles.filter((f) => f.id !== id);
  paintAttachList();
}

function collectMail() {
  const q = (s) => mailEl && mailEl.querySelector(s);
  return {
    type: mailType,
    typeName: typeLabel(mailType),
    what: (q('[data-mail-what]')?.value || '').trim(),
    name: (q('[data-mail-name]')?.value || '').trim(),
    email: (q('[data-mail-email]')?.value || '').trim(),
    org: (q('[data-mail-org]')?.value || '').trim(),
    page: (q('[data-mail-page]')?.value || '').trim(),
    freq: mailFreq,
    invoice: (q('[data-mail-invoice]')?.value || '').trim(),
    sku: (q('[data-mail-sku]')?.value || '').trim(),
  };
}

function markInvalid(sel, on) {
  const el = mailEl && mailEl.querySelector(sel);
  if (el) el.classList.toggle('is-invalid', !!on);
}

function sendSupportEmail() {
  const d = collectMail();
  let ok = true;
  if (!d.type) { ok = false; mailEl.querySelector('[data-mail-type]')?.focus(); }
  markInvalid('[data-mail-what]', !d.what);
  markInvalid('[data-mail-name]', !d.name);
  markInvalid('[data-mail-email]', !d.email || !EMAIL_RE.test(d.email));
  if (!d.type) ok = false;
  if (!d.what) { qFocus('[data-mail-what]'); ok = false; }
  else if (!d.name) { qFocus('[data-mail-name]'); ok = false; }
  else if (!d.email || !EMAIL_RE.test(d.email)) { qFocus('[data-mail-email]'); ok = false; }
  if (!ok) return;

  const lines = [
    `What's going on: ${d.typeName}`,
    `What happened: ${d.what}`,
    '',
    `Name: ${d.name}`,
    `Email: ${d.email}`,
    `Organization: ${d.org || '—'}`,
  ];
  if (d.page) lines.push(`Page: ${d.page}`);
  if (d.freq) lines.push(`How often: ${freqLabel(d.freq)}`);
  if (d.invoice) lines.push(`Invoice: ${d.invoice}`);
  if (d.sku) lines.push(`Product / UPC: ${d.sku}`);
  if (mailFiles.length) {
    lines.push('', 'Attachments (please attach these files in your mail app):');
    mailFiles.forEach((f) => lines.push(`- ${f.name} (${fmtMailSize(f.size)})`));
  }
  lines.push('', `Sent from Help · ${location.href}`);

  const subject = encodeURIComponent(`WISE ${d.typeName}: ${d.what.slice(0, 72)}`);
  const body = encodeURIComponent(lines.join('\n'));
  window.location.href = `mailto:${SUPPORT_TO}?subject=${subject}&body=${body}`;
  mailSent = true;
  paintContactBody();
}

function qFocus(sel) {
  mailEl?.querySelector(sel)?.focus();
}

function focusContactForm() {
  if (!mailEl) mountContactPane();
  if (mailSent) { mailSent = false; paintContactBody(); }
  mailEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  const first = mailEl?.querySelector('[data-mail-type].is-on, [data-mail-type], [data-mail-what]');
  first?.focus();
}

function mountContactPane() {
  const row = document.getElementById('modules-row');
  if (!row) return;
  mailEl = document.getElementById('help-contact');
  if (mailEl && mailEl.querySelector('[data-mail-body]')) {
    applyMailWidth(readMailWidth());
    return;
  }
  if (!mailEl) {
    mailEl = document.createElement('aside');
    mailEl.id = 'help-contact';
    mailEl.className = 'hc-mail';
    mailEl.setAttribute('aria-label', 'Contact support');
    mailEl.setAttribute('data-no-fill-default', '');
    const main = document.getElementById('agent-main');
    if (main && main.nextSibling) row.insertBefore(mailEl, main.nextSibling);
    else row.appendChild(mailEl);
  }
  mailEl.innerHTML = `
      <div class="wch-head">
        <span class="hc-mail-head-text">
          <span class="wch-head-title">Contact support</span>
          <span class="hc-mail-sub">Tell us what\u2019s going on</span>
        </span>
        <div class="wch-controls panel-controls">
          <div class="panel-more-wrap" data-sticky-menu>
            <button type="button" class="panel-more-btn" title="More options" aria-haspopup="menu" aria-expanded="false" aria-label="More options"><span class="material-symbols-outlined">more_vert</span></button>
            <div class="topbar-popover hidden" role="menu"></div>
          </div>
          <button type="button" class="panel-width-toggle-btn" data-panel="help-contact" aria-pressed="false" title="Width (single) — tap to widen" aria-label="Contact support module width"><span class="material-symbols-outlined">width_normal</span></button>
        </div>
      </div>
      <div class="hc-mail-body" data-mail-body></div>
      <div class="hc-mail-foot" data-mail-foot>
        <button type="button" class="adm-btn adm-btn--primary" data-mail-send>
          <span class="material-symbols-outlined">send</span>
          <span>Send Email</span>
        </button>
      </div>
      <input type="file" class="hc-mail-sr" data-mail-file multiple accept="image/*,.pdf,.txt,.log,.csv,.json,.zip,.png,.jpg,.jpeg,.webp,.gif,.mov,.mp4">`;
  mailSent = false;
  paintContactBody();
  applyMailWidth(readMailWidth());
  wireMailMore();
  wireMailAttach();
  if (!mailWired) {
    mailWired = true;
    row.addEventListener('click', onMailClick);
  }
}

function wireMailAttach() {
  const input = mailEl && mailEl.querySelector('[data-mail-file]');
  if (!input || input.dataset.mailFileWired) return;
  input.dataset.mailFileWired = '1';
  input.addEventListener('change', () => {
    addMailFiles(input.files);
    input.value = '';
  });
  const setOver = (on) => mailEl.querySelector('[data-mail-attach]')?.classList.toggle('is-over', !!on);
  mailEl.addEventListener('dragover', (e) => {
    if (!e.target.closest('[data-mail-attach], [data-mail-attach-list]')) return;
    e.preventDefault();
    setOver(true);
  });
  mailEl.addEventListener('dragleave', (e) => {
    if (mailEl.contains(e.relatedTarget)) return;
    setOver(false);
  });
  mailEl.addEventListener('drop', (e) => {
    if (!e.target.closest('[data-mail-attach], [data-mail-attach-list], .hc-mail-body')) return;
    e.preventDefault();
    setOver(false);
    addMailFiles(e.dataTransfer && e.dataTransfer.files);
  });
}

function wireMailMore() {
  const wrap = mailEl && mailEl.querySelector('.panel-more-wrap');
  const btn = wrap && wrap.querySelector('.panel-more-btn');
  const pop = wrap && wrap.querySelector('.topbar-popover');
  if (!wrap || !btn || !pop || wrap.dataset.mailMoreWired) return;
  wrap.dataset.mailMoreWired = '1';
  const close = () => {
    pop.classList.add('hidden');
    btn.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
  };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const opening = pop.classList.contains('hidden');
    pop.classList.toggle('hidden', !opening);
    btn.classList.toggle('is-open', opening);
    btn.setAttribute('aria-expanded', opening ? 'true' : 'false');
  });
  document.addEventListener('click', (e) => {
    if (pop.classList.contains('hidden')) return;
    const host = pop.__plHost || wrap;
    if (host.contains(e.target) || pop.contains(e.target)) return;
    close();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

function onMailClick(e) {
  if (!mailEl || !mailEl.contains(e.target)) return;
  const typeBtn = e.target.closest('[data-mail-type]');
  if (typeBtn) {
    mailType = typeBtn.dataset.mailType === mailType ? '' : typeBtn.dataset.mailType;
    mailFreq = '';
    syncTypeChips();
    return;
  }
  const freqBtn = e.target.closest('[data-mail-freq]');
  if (freqBtn) {
    mailFreq = freqBtn.dataset.mailFreq === mailFreq ? '' : freqBtn.dataset.mailFreq;
    mailEl.querySelectorAll('[data-mail-freq]').forEach((btn) => {
      const on = btn.dataset.mailFreq === mailFreq;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    return;
  }
  if (e.target.closest('[data-mail-attach]')) {
    e.preventDefault();
    mailEl.querySelector('[data-mail-file]')?.click();
    return;
  }
  const fileX = e.target.closest('[data-mail-file-x]');
  if (fileX) {
    e.preventDefault();
    removeMailFile(fileX.getAttribute('data-mail-file-x'));
    return;
  }
  if (e.target.closest('[data-mail-send]')) { e.preventDefault(); sendSupportEmail(); return; }
  if (e.target.closest('[data-mail-again]')) {
    mailSent = false;
    clearMailFiles();
    paintContactBody();
    return;
  }
  if (e.target.closest('.panel-width-toggle-btn')) { e.stopPropagation(); cycleMailWidth(); }
}
