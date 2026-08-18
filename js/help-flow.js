/**
 * Help module.
 *
 * A help-center surface rendered into #agent-main-scroll on help.html: a search
 * box, browse-by-topic cards, expandable FAQs, and a contact-support panel. The
 * persistent WISEcodeAI dock drives it — intent chips search the FAQs, expand a
 * topic, or open a support channel — and each on-page action narrates back.
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
  { topic: 'billing', q: 'How do I download an invoice?', a: 'Invoices live under Organization → Invoices & Downloads. Each is available as a PDF the moment it\u2019s issued.' },
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
            <span class="hc-support-body"><span class="hc-support-title">Email support</span><span class="hc-support-desc">support@wisecode.ai \u00b7 typically replies within a few hours</span></span>
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
    case 'email': window.location.href = 'mailto:support@wisecode.ai'; break;
    case 'docs': window.location.href = 'docs.html'; break;
    case 'support': hostEl?.querySelector('[data-hc-anchor="support"]')?.scrollIntoView({ behavior: 'smooth' }); break;
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
    billing_help: 'Invoices live under <strong>Organization → Invoices & Downloads</strong> and download as PDFs. I\u2019ve surfaced the billing FAQs.',
    contact: 'You can chat with me here for instant answers, email <strong>support@wisecode.ai</strong>, or read the docs. Scrolled you to the contact options.',
  },
  onIntent: (intent) => {
    if (intent === 'getting_started') { setTopic('getting-started'); return false; }
    if (intent === 'walkthrough') { runHelpIntent('tour'); return false; }
    if (intent === 'verification_help') { setTopic('verification'); return false; }
    if (intent === 'billing_help') { setTopic('billing'); return false; }
    if (intent === 'contact') { runHelpIntent('support'); return false; }
    return false;
  },
};
