/**
 * Docs module.
 *
 * A documentation browser rendered into #agent-main-scroll on docs.html: a
 * sidebar of grouped articles beside a reading pane. The persistent WISEcodeAI dock
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
      <div class="dc-callout"><span class="material-symbols-outlined">lightbulb</span><div>Tip: the WISEcodeAI assistant can run the entire verification flow for you — just ask it to “verify all pre-qualified foods.”</div></div>`,
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
    body: `<p>The left rail is your primary navigation — Overview, Portfolio, Studio, Organization and Admin. The WISEcodeAI chat docks alongside every page and can drive the interface for you.</p>
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
      <div class="dc-callout"><span class="material-symbols-outlined">verified</span><div>Both flows can be driven end-to-end from the WISEcodeAI chat.</div></div>`,
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

/* Group icon + membership, derived from NAV so each doc card carries its
   category badge and the scorecards can filter by group. */
const GROUP_ICON = { 'Get started': 'rocket_launch', 'Guides': 'menu_book', 'Developers': 'code', 'Reference': 'bookmark' };
const GROUP_OF = {};
const READ_OF = {};
NAV.forEach((grp) => grp.items.forEach((it) => { GROUP_OF[it.id] = grp.group; READ_OF[it.id] = it.read; }));

/* Pick a scorecard column count that never leaves a lone orphan card. */
function statCols(n) {
  if (n <= 1) return 1;
  for (let c = Math.min(n, 6); c >= 2; c--) if (n % c === 0) return c;
  for (let c = Math.min(n, 6); c >= 2; c--) if (n % c !== 1) return c;
  return 2;
}

/* A one-line excerpt = the first paragraph of the article body, stripped and
   entity-decoded (so `&amp;` reads as `&` once the template re-escapes it). */
function excerptOf(id) {
  const body = ARTICLES[id]?.body || '';
  const m = body.match(/<p>([\s\S]*?)<\/p>/i);
  return (m ? m[1] : body)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

let hostEl = null;
let currentId = null;       /* null = browse (card grid); else the reader */
let query = '';
let groupFilter = 'all';

function docMatches(id, title) {
  if (groupFilter !== 'all' && GROUP_OF[id] !== groupFilter) return false;
  if (query) {
    const hay = (title + ' ' + excerptOf(id)).toLowerCase();
    if (!hay.includes(query)) return false;
  }
  return true;
}

function groupCount(name) {
  const ids = Object.keys(ARTICLES);
  if (name === 'all') return ids.length;
  return ids.filter((id) => GROUP_OF[id] === name).length;
}

function paint() {
  if (!hostEl) return;
  if (currentId) { paintReader(); return; }

  const cards = [{ id: 'all', label: 'All', icon: 'menu_book' },
    ...NAV.map((g) => ({ id: g.group, label: g.group, icon: GROUP_ICON[g.group] || 'article' }))];
  const docs = NAV.flatMap((g) => g.items).filter((it) => docMatches(it.id, it.title));

  hostEl.innerHTML = `
    <div class="wmod-wrap">
      <div class="wmod-masthead">
        <div class="wmod-masthead-main">
          <h1 class="wmod-title">Documentation</h1>
          <p class="wmod-sub">Everything you need to get the most out of WISE.</p>
          <p class="wmod-desc">Guides, references and release notes \u2014 from a ten-minute quickstart to the full API reference. Search across every article, or filter by section, then open one to read it right here.</p>
        </div>
      </div>

      <div class="wmod-toolbar">
        <div class="wmod-search-inline">
          <span class="material-symbols-outlined">search</span>
          <input type="search" class="wmod-search-input" placeholder="Search the documentation" aria-label="Search docs" value="${esc(query)}" data-dc-search />
        </div>
      </div>

      <div class="wmod-stats-wrap">
        <div class="wmod-stats" style="--wmod-cols:${statCols(cards.length)}" role="group" aria-label="Filter docs by section">
          ${cards.map((c) => `<button type="button" class="wmod-stat${c.id === groupFilter ? ' is-active' : ''}" data-dc-group="${esc(c.id)}" aria-pressed="${c.id === groupFilter}">
            <span class="wmod-stat-num">${groupCount(c.id)}</span>
            <span class="wmod-stat-label"><span class="material-symbols-outlined">${esc(c.icon)}</span>${esc(c.label)}</span>
          </button>`).join('')}
        </div>
      </div>

      ${docs.length ? `
      <div class="dc-grid">
        ${docs.map((it) => `
          <button type="button" class="dc-card" data-dc-article="${it.id}">
            <div class="dc-card-top">
              <span class="dc-card-badge"><span class="material-symbols-outlined">${esc(GROUP_ICON[GROUP_OF[it.id]] || 'article')}</span>${esc(GROUP_OF[it.id])}</span>
              <span class="dc-card-read">${esc(it.read)}</span>
            </div>
            <div class="dc-card-title">${esc(it.title)}</div>
            <div class="dc-card-excerpt">${esc(excerptOf(it.id))}</div>
          </button>`).join('')}
      </div>` : `
      <div class="wmod-table-card"><div class="wmod-empty"><span class="material-symbols-outlined">search_off</span><div>No documentation matches your search.</div></div></div>`}
    </div>`;
}

function paintReader() {
  const art = ARTICLES[currentId] || ARTICLES.quickstart;
  const group = GROUP_OF[currentId] || 'Docs';
  hostEl.innerHTML = `
    <div class="wmod-wrap">
      <article class="dc-reader">
        <button type="button" class="dc-back" data-dc-back><span class="material-symbols-outlined">arrow_back</span>All documentation</button>
        <div class="dc-article-eyebrow"><span class="material-symbols-outlined">${esc(GROUP_ICON[group] || 'article')}</span>${esc(group)} \u00b7 ${esc(READ_OF[currentId] || '')}</div>
        <h1 class="dc-article-title">${esc(art.title)}</h1>
        <div class="dc-article-body">${art.body}</div>
      </article>
    </div>`;
  hostEl.querySelector('.dc-reader')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function renderDocs(mainEl) {
  hostEl = mainEl;
  currentId = null;
  query = '';
  groupFilter = 'all';
  paint();

  mainEl.addEventListener('click', (e) => {
    if (e.target.closest('[data-dc-back]')) { currentId = null; paint(); return; }
    const g = e.target.closest('[data-dc-group]');
    if (g) { const v = g.dataset.dcGroup; groupFilter = (groupFilter === v && v !== 'all') ? 'all' : v; paint(); return; }
    const item = e.target.closest('[data-dc-article]');
    if (item) { openArticle(item.dataset.dcArticle); }
  });

  mainEl.addEventListener('input', (e) => {
    const s = e.target.closest('[data-dc-search]');
    if (!s) return;
    query = s.value.trim().toLowerCase();
    const pos = s.selectionStart;
    paint();
    const again = hostEl.querySelector('[data-dc-search]');
    if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (_) {} }
  });
}

function openArticle(id) {
  if (!ARTICLES[id]) return;
  currentId = id;
  paint();
}

/* ---- WISEcodeAI bridge -------------------------------------------------- */

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
