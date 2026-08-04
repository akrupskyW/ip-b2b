/**
 * Docs module.
 *
 * A documentation browser rendered into #agent-main-scroll on docs.html: a
 * sidebar of grouped articles beside a reading pane. The persistent WISEai dock
 * drives it — intent chips open the quickstart, the API reference, the SDK guide
 * or the changelog — and each on-page selection narrates back into the chat.
 */

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* Each article carries a small HTML body — enough to read like real docs. */
const NAV = [
  {
    group: 'Get started', items: [
      { id: 'quickstart', title: 'Quickstart', read: '4 min' },
      { id: 'concepts', title: 'Core concepts', read: '6 min' },
      { id: 'workspace', title: 'Your workspace', read: '3 min' },
    ],
  },
  {
    group: 'Guides', items: [
      { id: 'verification', title: 'Running verification', read: '7 min' },
      { id: 'reports', title: 'Reading reports', read: '5 min' },
      { id: 'reformulation', title: 'Reformulation', read: '8 min' },
    ],
  },
  {
    group: 'Developers', items: [
      { id: 'api', title: 'API reference', read: '12 min' },
      { id: 'sdk', title: 'SDK & clients', read: '6 min' },
      { id: 'webhooks', title: 'Webhooks', read: '5 min' },
    ],
  },
  {
    group: 'Reference', items: [
      { id: 'changelog', title: 'Changelog', read: '2 min' },
    ],
  },
];

const ARTICLES = {
  quickstart: {
    title: 'Quickstart',
    body: `
      <p>Welcome to WISE. This guide gets you from zero to your first Non-UPF Verified™ shield in about ten minutes.</p>
      <h3>1 · Add your products</h3>
      <p>Open <strong>Product Portfolio</strong> and choose <em>Add products</em>. The Data Ingestion Agent accepts files, URLs, ERP exports, and product images, then the Ingredient Parsing Agent normalizes every ingredient.</p>
      <h3>2 · Review classifications</h3>
      <p>Each product is classified against the NOVA scale. Flagged ingredients are highlighted so you can see exactly what pushes a product into the ultra-processed tier.</p>
      <h3>3 · Verify</h3>
      <p>Select pre-qualified SKUs, sign the attestation, and pay per SKU. WISE mints a shield you can use on packaging and marketing.</p>
      <div class="dc-callout"><span class="material-icons">lightbulb</span><div>Tip: the WISEai assistant can run the entire verification flow for you — just ask it to “verify all pre-qualified foods.”</div></div>`,
  },
  concepts: {
    title: 'Core concepts',
    body: `
      <p>A few ideas underpin everything in WISE:</p>
      <h3>Agents</h3>
      <p>Specialized workers — Portfolio, Data Ingestion, Verification, Analytics, and more — that each own one part of the pipeline. You configure them under <strong>Agents</strong>.</p>
      <h3>Portfolio</h3>
      <p>Your products, their ingredients, and their classifications. The portfolio is the source of truth every report and verification draws from.</p>
      <h3>Shields</h3>
      <p>A minted, verifiable proof that a product meets a standard (Non-UPF, GRAS). Shields come with a marketing toolkit.</p>`,
  },
  workspace: {
    title: 'Your workspace',
    body: `<p>The left rail is your primary navigation — Overview, Portfolio, Studio, Organization and Admin. The WISEai chat docks alongside every page and can drive the interface for you.</p>
      <h3>Personalizing it</h3>
      <p>Under <strong>Preferences</strong> you can switch theme, scale text, choose where the chat docks, and tune notifications.</p>`,
  },
  verification: {
    title: 'Running verification',
    body: `<p>Verification turns your ingredient data into a public, verifiable claim.</p>
      <h3>Non-UPF</h3>
      <p>Classifies finished products against the NOVA scale. Select SKUs, attest that your data matches packaging, and pay per SKU.</p>
      <h3>GRAS</h3>
      <p>Works at the ingredient level, documenting Generally Recognized As Safe status for each additive across five documentation steps.</p>
      <div class="dc-callout"><span class="material-icons">verified</span><div>Both flows can be driven end-to-end from the WISEai chat.</div></div>`,
  },
  reports: {
    title: 'Reading reports',
    body: `<p>Reports summarize your portfolio health. The headline UPF score is the share of products that land as Non-UPF.</p>
      <h3>Drill down</h3>
      <p>Open any report to see per-product and per-ingredient breakdowns, distributions, and flagged items. Everything exports to PDF.</p>`,
  },
  reformulation: {
    title: 'Reformulation',
    body: `<p>The Audit &amp; Reformulation Agent simulates ingredient swaps and shows the impact on classification and nutrition before you change a recipe.</p>
      <h3>What-if simulation</h3>
      <p>Swap a flagged emulsifier or seed oil and instantly see whether the product flips to Non-UPF, plus the effect on the live NFP+ panel.</p>`,
  },
  api: {
    title: 'API reference',
    body: `<p>The WISE API is REST over HTTPS. Authenticate with a secret key from <strong>API keys</strong>.</p>
      <h3>Authentication</h3>
      <pre class="dc-pre"><code>curl https://api.wisecode.ai/v1/products \\
  -H "Authorization: Bearer sk_demo_..."</code></pre>
      <h3>Rate limits</h3>
      <p>1,000 requests per minute per key. Responses include <code>X-RateLimit-Remaining</code>.</p>
      <h3>Endpoints</h3>
      <ul>
        <li><code>GET /v1/products</code> — list portfolio products</li>
        <li><code>POST /v1/verifications</code> — start a verification</li>
        <li><code>GET /v1/reports/:id</code> — fetch a report</li>
      </ul>`,
  },
  sdk: {
    title: 'SDK & clients',
    body: `<p>Official clients wrap the REST API with typed helpers.</p>
      <pre class="dc-pre"><code>import { WISE } from "@wisecode/sdk";
const wise = new WISE(process.env.WISE_API_KEY);
const products = await wise.products.list();</code></pre>
      <p>Clients are available for JavaScript/TypeScript and Python.</p>`,
  },
  webhooks: {
    title: 'Webhooks',
    body: `<p>Subscribe to events so your systems react the moment something changes.</p>
      <h3>Events</h3>
      <ul><li><code>verification.completed</code></li><li><code>report.published</code></li><li><code>product.flagged</code></li></ul>
      <p>Every payload is signed; verify the <code>WISE-Signature</code> header against your signing secret.</p>`,
  },
  changelog: {
    title: 'Changelog',
    body: `<div class="dc-log"><span class="dc-log-date">Jul 2026</span><div><strong>Marketing Assets browser</strong> — nested, searchable co-branding toolkit.</div></div>
      <div class="dc-log"><span class="dc-log-date">Jun 2026</span><div><strong>GRAS verification</strong> — ingredient-level documentation flow.</div></div>
      <div class="dc-log"><span class="dc-log-date">May 2026</span><div><strong>Reformulation simulator</strong> — live what-if impact on classification.</div></div>`,
  },
};

let hostEl = null;
let currentId = 'quickstart';

function articleTitle(id) { return ARTICLES[id]?.title || id; }

function paint() {
  if (!hostEl) return;
  const art = ARTICLES[currentId] || ARTICLES.quickstart;
  hostEl.innerHTML = `
    <div class="dc-wrap">
      <aside class="dc-sidebar" aria-label="Documentation">
        <div class="dc-side-title"><span class="material-icons">menu_book</span>Documentation</div>
        ${NAV.map((grp) => `
          <div class="dc-side-group">
            <div class="dc-side-group-title">${esc(grp.group)}</div>
            ${grp.items.map((it) => `
              <button type="button" class="dc-side-item${it.id === currentId ? ' is-active' : ''}" data-dc-article="${it.id}">
                <span>${esc(it.title)}</span><span class="dc-side-read">${esc(it.read)}</span>
              </button>`).join('')}
          </div>`).join('')}
      </aside>
      <article class="dc-article">
        <div class="dc-breadcrumb"><span>Docs</span><span class="material-icons">chevron_right</span><span class="dc-breadcrumb-here">${esc(art.title)}</span></div>
        <h1 class="dc-article-title">${esc(art.title)}</h1>
        <div class="dc-article-body">${art.body}</div>
      </article>
    </div>`;
}

export function renderDocs(mainEl) {
  hostEl = mainEl;
  currentId = 'quickstart';
  paint();
  mainEl.addEventListener('click', (e) => {
    const item = e.target.closest('[data-dc-article]');
    if (!item) return;
    openArticle(item.dataset.dcArticle);
  });
}

function openArticle(id) {
  if (!ARTICLES[id]) return;
  currentId = id;
  paint();
  hostEl?.querySelector('.dc-article')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---- WISEai bridge -------------------------------------------------- */

export const DOCS_WISEAI = {
  sub: 'Ask about any part of WISE — I\u2019ll open the right doc.',
  chipsFlow: 'wrap',
  sourceLabel: '',
  /* Large "at a glance" cards shown alongside the small chips on the welcome
     screen — each reuses an existing intent so a click drives the same flow. */
  scorecards: {
    label: 'Explore the docs',
    cards: [
      { intent: 'quickstart', icon: 'rocket_launch', iconTone: 'brand', pill: { tone: 'up', icon: 'auto_awesome', text: 'Start here' }, title: 'Show me the quickstart', desc: 'Add products, review classifications, then verify — about ten minutes.', action: 'Open the quickstart', ask: 'Show me the quickstart' },
      { intent: 'api', icon: 'code', iconTone: 'brand', pill: { tone: 'up', icon: 'menu_book', text: 'Reference' }, title: 'Open the API reference', desc: 'Auth, endpoints and rate limits — 1,000 requests/min per key.', action: 'Open API reference', ask: 'Open the API reference' },
      { intent: 'sdk', icon: 'terminal', iconTone: 'brand', pill: { tone: 'up', icon: 'menu_book', text: 'Reference' }, title: 'How do I use the SDK?', desc: 'Install the client, pass your key, call typed helpers. JS/TS and Python.', action: 'Use the SDK', ask: 'How do I use the SDK?' },
      { intent: 'webhooks', icon: 'webhook', iconTone: 'brand', pill: { tone: 'up', icon: 'menu_book', text: 'Reference' }, title: 'Set up webhooks', desc: 'Subscribe to events like verification.completed — every payload is signed.', action: 'Set up webhooks', ask: 'Set up webhooks' },
      { intent: 'changelog', icon: 'new_releases', iconTone: 'brand', pill: { tone: 'up', icon: 'bolt', text: 'New' }, title: 'What\u2019s new?', desc: 'Marketing Assets, GRAS verification, and the reformulation simulator.', action: 'What\u2019s new?', ask: 'What\u2019s new?' },
    ],
  },
  intents: [
    { intent: 'quickstart', label: 'Show me the quickstart', icon: 'rocket_launch' },
    { intent: 'api', label: 'Open the API reference', icon: 'code' },
    { intent: 'sdk', label: 'How do I use the SDK?', icon: 'terminal' },
    { intent: 'webhooks', label: 'Set up webhooks', icon: 'webhook' },
    { intent: 'changelog', label: 'What\u2019s new?', icon: 'new_releases' },
  ],
  intentReplies: {
    quickstart: 'Opened the <strong>Quickstart</strong> — add products, review classifications, then verify. It takes about ten minutes end to end.',
    api: 'Opened the <strong>API reference</strong>. Authenticate with a secret key as a Bearer token; you get 1,000 requests/min per key. The core endpoints are products, verifications and reports.',
    sdk: 'Opened <strong>SDK &amp; clients</strong>. Install the client, pass your API key, and call typed helpers like <code>wise.products.list()</code>. Available for JS/TS and Python.',
    webhooks: 'Opened <strong>Webhooks</strong>. Subscribe to events like <code>verification.completed</code>; every payload is signed so verify the <code>WISE-Signature</code> header.',
    changelog: 'Opened the <strong>Changelog</strong> — most recently the Marketing Assets browser, GRAS verification, and the reformulation simulator.',
  },
  onIntent: (intent) => {
    if (ARTICLES[intent]) { openArticle(intent); return false; }
    return false;
  },
};
