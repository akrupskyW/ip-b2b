/**
 * WISEcode Portfolio — The Truth Layer module.
 *
 * A single-page module (mirroring the ai-chat.html shell) whose left-rail
 * sub-navigation maps to "Zoom" surfaces of the Portfolio:
 *
 *   command-deck  — The Nexus / Pulse (entry point, brand-health + agent briefing)
 *   ledger        — Zoom In: the full product table (deep-dive on row select)
 *   intake        — Pathway 1: Intake & Growth Engine (Managing the Truth)
 *   verified      — Pathway 2: Verified Pipeline (Managing the Trust)
 *   identity      — Pathway 3: Identity Portal (Managing the Presence)
 *   recipes       — Recipe Lab (live NFP+ formulation)
 *   vault         — Asset Vault (gated premium wing)
 *
 * The persistent AI Portfolio Agent lives in the bottom command bar and is
 * contextual to the active surface.
 */

import {
  mountAgentMenu,
  PORTFOLIO_SECTIONS,
  PORTFOLIO_SECTION_IDS,
  getPortfolioSection,
  iconClassFor,
} from './agent-menu.js';
import { mountScoutChat } from './scout-chat.js';
import { initLirTooltip } from './lir-tooltip.js';
import { mountTopbar } from './topbar.js';

/* ------------------------------------------------------------------ */
/* Utilities                                                           */
/* ------------------------------------------------------------------ */

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toast(msg, icon = 'auto_awesome') {
  let wrap = document.getElementById('pf-toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'pf-toast-wrap';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = 'pf-toast';
  t.innerHTML = `<span class="material-icons">${esc(icon)}</span><span>${esc(msg)}</span>`;
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity .3s ease, transform .3s ease';
    t.style.opacity = '0';
    t.style.transform = 'translateY(8px)';
    setTimeout(() => t.remove(), 320);
  }, 2600);
}

/* ------------------------------------------------------------------ */
/* Mock data                                                          */
/* ------------------------------------------------------------------ */

const PULSE = [
  { value: '248', label: 'Total Products', meta: '+12 this week', tone: 'is-up', section: 'ledger' },
  { value: '198', label: 'Brand Verified', meta: 'Gold Standard', section: 'ledger' },
  { value: '99', label: 'Verified · Shielded', meta: '40% coverage', section: 'verified' },
  { value: '154 / 94', label: 'Public / Private', meta: 'Discovery feed', section: 'intake' },
];

const GAUGES = [
  { val: 80, ring: 'var(--ter-amber)', title: 'Data Resolution Score', sub: '80% at Brand Verified Gold Standard (15 nutrients + image + ingredients).', section: 'ledger' },
  { val: 40, ring: 'var(--sec-green)', title: 'Trust Coverage', sub: '40% of portfolio protected by a WISEcode Shield (e.g. Non-UPF).', section: 'verified' },
  { val: 62, ring: 'var(--primary)', title: 'Market Transparency Index', sub: '62% of data is public on the global Discovery Feed.', section: 'intake' },
  { val: 75, ring: 'var(--ter-violet)', title: 'Identity Completion', sub: '75% — B2B/B2C profile, logos, mission, certifications.', section: 'identity' },
];

const MISSIONS = [
  { tag: 'Active Audits', icon: 'rule', title: '12 products ready for Brand Verified', text: 'A bulk upload finished. 12 products have parsed cleanly and are ready for a Gold Standard audit.', actions: [{ label: 'Audit now', primary: true, go: 'ledger' }, { label: 'Review later' }] },
  { tag: 'Verification', icon: 'verified', title: '5 products eligible for the Non-UPF Shield', text: 'I’ve pre-qualified 5 UPCs against the non-UPF standard. Want to kick off the Verification flow?', actions: [{ label: 'Get Verified', primary: true, go: 'verified' }, { label: 'See list', go: 'ledger' }] },
  { tag: 'Regulatory Alert', icon: 'gavel', title: 'New “Clean Label” standard published', text: '14 of your products are eligible. Should I run a pre-qualification audit against it?', actions: [{ label: 'Pre-qualify', primary: true, go: 'verified' }] },
  { tag: 'Competitive Gap', icon: 'insights', title: 'Retailers searching for “Sodium-Reduced”', text: 'You have 3 products that match but aren’t tagged. Update Discovery Tags to be found?', actions: [{ label: 'Update tags', primary: true, go: 'intake' }] },
  { tag: 'Renewal Sentinel', icon: 'event_repeat', title: 'Non-UPF Shield for “V3 Shake” expires in 15 days', text: 'Formulation hasn’t changed — want me to automate the attestation and renew now?', actions: [{ label: 'Auto-renew', primary: true, go: 'verified' }, { label: 'Snooze' }] },
];

const PRODUCTS = [
  { name: 'V3 Recovery Shake', cat: 'Beverages · Protein', upc: '8 5012 00410', res: 'gold', shield: 'Non-UPF', vis: 'public', nutrients: '15/15' },
  { name: 'High-Fiber Oat Bar', cat: 'Snacks · Bars', upc: '8 5012 00411', res: 'gold', shield: 'Non-UPF', vis: 'public', nutrients: '15/15' },
  { name: 'Seed-Oil-Free Crackers', cat: 'Snacks · Crackers', upc: '8 5012 00412', res: 'gold', shield: 'Seed-Oil Free', vis: 'public', nutrients: '15/15' },
  { name: 'Low-Sodium Veggie Broth', cat: 'Pantry · Soups', upc: '8 5012 00413', res: 'verified', shield: null, vis: 'public', nutrients: '15/15' },
  { name: 'Cold-Brew Concentrate', cat: 'Beverages · Coffee', upc: '8 5012 00414', res: 'verified', shield: null, vis: 'private', nutrients: '14/15' },
  { name: 'Sprouted Trail Mix', cat: 'Snacks · Mixes', upc: '8 5012 00415', res: 'gold', shield: 'Non-UPF', vis: 'public', nutrients: '15/15' },
  { name: 'Almond Butter Cups', cat: 'Confection', upc: '8 5012 00416', res: 'draft', shield: null, vis: 'private', nutrients: '9/15' },
  { name: 'Electrolyte Hydration Mix', cat: 'Beverages · Mixes', upc: '8 5012 00417', res: 'verified', shield: null, vis: 'public', nutrients: '15/15' },
  { name: 'Sourdough Pretzels', cat: 'Snacks · Pretzels', upc: '8 5012 00418', res: 'draft', shield: null, vis: 'private', nutrients: '7/15' },
];

const RES_BADGE = {
  gold: '<span class="pf-badge pf-badge--gold"><span class="material-icons">workspace_premium</span>Brand Verified</span>',
  verified: '<span class="pf-badge pf-badge--blue"><span class="material-icons">check_circle</span>Verified</span>',
  draft: '<span class="pf-badge pf-badge--muted"><span class="material-icons">edit_note</span>Draft</span>',
};

const VAULT_ASSETS = [
  { name: 'Non-UPF Shield — Web', sub: 'SVG · PNG · 4 sizes', art: 'art-green', icon: 'verified', folder: 'Non-UPF', fmt: 'SVG' },
  { name: 'Retail Shelf Talker', sub: 'Print-ready PDF', art: '', icon: 'sell', folder: 'Non-UPF', fmt: 'PDF' },
  { name: 'Social Tile — Square', sub: '1080×1080', art: 'art-violet', icon: 'image', folder: 'Non-UPF', fmt: 'PNG' },
  { name: 'Back-to-School Tile', sub: 'New · Seasonal', art: 'art-amber', icon: 'auto_awesome', folder: 'Clean Label', fmt: 'PNG' },
  { name: 'Seed-Oil-Free Badge', sub: 'SVG · PNG', art: 'art-green', icon: 'eco', folder: 'Seed-Oil Free', fmt: 'SVG' },
  { name: 'Amazon A+ Module', sub: 'Retail template', art: '', icon: 'storefront', folder: 'Clean Label', fmt: 'ZIP' },
];

/* ------------------------------------------------------------------ */
/* Section header + agent-bar context                                  */
/* ------------------------------------------------------------------ */

/* Suggested Scout intent chips for the Portfolio context (Truth Layer flows).
   Each maps to a section so the chat ties back into the module. */
const PORTFOLIO_INTENTS = [
  { intent: 'go-verified', label: 'Get products verified', icon: 'verified', go: 'verified' },
  { intent: 'go-intake', label: 'Ingest new data', icon: 'cloud_upload', go: 'intake' },
  { intent: 'go-ledger', label: 'Open the Ledger', icon: 'table_rows', go: 'ledger' },
  { intent: 'faq_intro', label: 'Summarize portfolio risk', icon: 'help_outline' },
  { intent: 'go-recipes', label: 'Open the Recipe Lab', icon: 'restaurant_menu', go: 'recipes' },
  { intent: 'go-identity', label: 'Manage my identity', icon: 'badge', go: 'identity' },
  { intent: 'go-vault', label: 'Open the Asset Vault', icon: 'folder_special', go: 'vault' },
];

/* Intent-keyed openers for the Portfolio chips. A clicked chip always continues
   with a reply that matches the module it opens — no generic Truth-Layer
   fallback for intents the label regex would otherwise miss (Ledger, Identity). */
const PORTFOLIO_INTENT_REPLIES = {
  'go-verified': 'I’ve pre-qualified <strong>5 UPCs</strong> for the Non-UPF Shield. Opening the Verified Pipeline — ready to run <strong>Confirm → Attest → Activate</strong>?',
  'go-intake': 'Opening Intake &amp; Growth. Drop a spec sheet, ERP export, URL, or label photo and I’ll parse it toward the <strong>Brand Verified</strong> Gold Standard.',
  'go-ledger': 'Opening your Portfolio Ledger — every product with its resolution, shield status, and visibility in one place. Want me to filter to what needs attention?',
  faq_intro: 'Here’s your portfolio risk at a glance: beverages carry the highest exposure with <strong>3 SKUs</strong> that need attention. Want me to open them in the Ledger?',
  'go-recipes': 'Opening the Recipe Lab. I can recompute NFP+™ live — trimming added sugar by 4g, for example, keeps a product Clean-Label eligible. Which recipe should we tune?',
  'go-identity': 'Opening your Identity Portal. Retailers are searching <strong>“Seed-Oil-Free”</strong> and <strong>“Sodium-Reduced”</strong> — you have 3 untagged matches I can fix to boost discovery.',
  'go-vault': 'Opening your Asset Vault — <strong>10 new “Back-to-School” tiles</strong> plus refreshed retail sheets are waiting in the Non-UPF folder. Want the latest badges?',
};

function portfolioReply(text, intent) {
  /* Intent id wins so a clicked chip continues on the surface it opens. */
  if (intent && PORTFOLIO_INTENT_REPLIES[intent]) return PORTFOLIO_INTENT_REPLIES[intent];
  const q = String(text).toLowerCase();
  if (/(verif|shield|non-upf|clean label|attest)/.test(q))
    return 'I’ve pre-qualified <strong>5 UPCs</strong> for the Non-UPF Shield. I can run <strong>Confirm → Attest → Activate</strong> whenever you’re ready.';
  if (/(risk|high-risk|beverage)/.test(q))
    return 'Beverages carry your highest exposure — <strong>3 SKUs</strong> need attention. Want me to open them in the Ledger?';
  if (/(tag|discover|retail|search)/.test(q))
    return 'Retailers are searching <strong>“Seed-Oil-Free”</strong> and <strong>“Sodium-Reduced.”</strong> You have 3 untagged matches I can fix.';
  if (/(recipe|nfp|ingredient|sugar)/.test(q))
    return 'I recomputed the NFP+™ live. Trimming added sugar by 4g keeps it Clean-Label eligible. Save to your portfolio?';
  if (/(asset|vault|sheet|tile|social)/.test(q))
    return 'Your Vault has <strong>10 new “Back-to-School” tiles</strong> plus refreshed retail sheets in the Non-UPF folder.';
  if (/(ingest|upload|parse|erp|csv)/.test(q))
    return 'Drop a spec sheet, ERP export, URL, or label photo — I’ll parse it toward the <strong>Brand Verified</strong> Gold Standard.';
  return 'On it. I’ll handle the complexity across your Truth Layer — data, trust, and identity in one place.';
}

/* Header strip for a section module — mirrors the .agent-main-header used by
   the shared shell. The trailing control is a left/right SWITCHER that moves
   the module to the other side of the Scout chat (mirrors flipPanel() in
   ai-chat.html). Opening/closing a module is done only from the top-bar rail. */
function moduleHeaderHTML(sectionId) {
  const sec = getPortfolioSection(sectionId);
  if (!sec) return '';
  return `
    <span class="agent-main-icon"><span class="${iconClassFor(sec.icon)}">${esc(sec.icon)}</span></span>
    <div class="agent-main-titles">
      <div class="agent-main-title">${esc(sec.label)}</div>
      <div class="agent-main-sub">WISEcode Portfolio · ${esc(sec.sub)}</div>
    </div>
    <div class="panel-controls">
      <div class="panel-flip" data-side="right" role="group" aria-label="Move module to the other side of Scout">
        <button type="button" class="panel-flip-btn" data-flip="${esc(sectionId)}" title="Move to the other side of Scout" aria-label="Move ${esc(sec.label)} to the other side of Scout">
          <span class="material-symbols-outlined">side_navigation</span>
        </button>
      </div>
      <button type="button" class="panel-width-toggle-btn" data-wide="${esc(sectionId)}" aria-pressed="false" title="Normal width — tap to double" aria-label="Double ${esc(sec.label)} module width">
        <span class="material-symbols-outlined">transition_slide</span>
      </button>
    </div>`;
}

function heroFor(sectionId, eyebrow) {
  const sec = getPortfolioSection(sectionId);
  return `
    <section class="pf-hero">
      <div class="pf-hero-eyebrow">${esc(eyebrow || 'The Truth Layer')}</div>
      <h1 class="pf-hero-title">${esc(sec.label)}</h1>
      <p class="pf-hero-desc">${esc(sec.tagline)}</p>
    </section>`;
}

/* ------------------------------------------------------------------ */
/* Views                                                              */
/* ------------------------------------------------------------------ */

function viewCommandDeck() {
  const stats = PULSE.map((s) => `
    <button class="pf-stat" data-go="${esc(s.section)}" style="text-align:left;cursor:pointer;border:1px solid var(--border);">
      <span class="pf-stat-value">${esc(s.value)}</span>
      <span class="pf-stat-label">${esc(s.label)}</span>
      <span class="pf-stat-meta ${s.tone || ''}">${esc(s.meta)}</span>
    </button>`).join('');

  const gauges = GAUGES.map((g) => `
    <button class="pf-gauge" data-go="${esc(g.section)}">
      <span class="pf-ring" style="--val:${g.val};--ring:${g.ring};"><span class="pf-ring-num">${g.val}%</span></span>
      <span class="pf-gauge-body">
        <span class="pf-gauge-title">${esc(g.title)}</span>
        <span class="pf-gauge-sub">${esc(g.sub)}</span>
      </span>
    </button>`).join('');

  const missions = MISSIONS.map((m) => `
    <article class="pf-mission">
      <div class="pf-mission-head">
        <span class="pf-mission-icon"><span class="material-icons">${esc(m.icon)}</span></span>
        <div>
          <div class="pf-mission-tag">${esc(m.tag)}</div>
          <div class="pf-mission-title">${esc(m.title)}</div>
        </div>
      </div>
      <p class="pf-mission-text">${esc(m.text)}</p>
      <div class="pf-mission-actions">
        ${m.actions.map((a) => `<button class="pf-btn ${a.primary ? 'pf-btn--primary' : ''}" ${a.go ? `data-go="${esc(a.go)}"` : `data-dismiss="${esc(a.label)}"`}>${esc(a.label)}</button>`).join('')}
      </div>
    </article>`).join('');

  return `
    <section class="pf-hero">
      <div class="pf-hero-eyebrow">AI Portfolio Agent · Intelligence Briefing</div>
      <h1 class="pf-hero-title">Command Deck</h1>
      <p class="pf-hero-desc">Good afternoon, Maya. Your portfolio looks <strong>stable</strong>. You're at <strong>80% Brand Verified</strong> with <strong>40% Trust Coverage</strong>. I've surfaced <strong>5 missions</strong> below — the highest value is verifying 5 Non-UPF-eligible products. You set the strategy; I'll handle the complexity.</p>
    </section>

    <div class="pf-section-label"><span class="material-icons">monitor_heart</span>Portfolio Pulse</div>
    <div class="pf-pulse-bar">${stats}</div>

    <div class="pf-section-label"><span class="material-icons">speed</span>Brand Health</div>
    <div class="pf-gauge-grid">${gauges}</div>

    <div class="pf-section-label"><span class="material-icons">flag</span>Intelligent Pathways · Missions</div>
    <div class="pf-mission-grid">${missions}</div>`;
}

function ledgerRowHTML(p, i) {
  return `
    <tr data-product="${i}">
      <td>
        <div class="pf-prod">
          <span class="pf-prod-thumb"><span class="material-icons">nutrition</span></span>
          <span>
            <div class="pf-prod-name">${esc(p.name)}</div>
            <div class="pf-prod-cat">${esc(p.cat)}</div>
          </span>
        </div>
      </td>
      <td>${RES_BADGE[p.res]}</td>
      <td>${p.shield ? `<span class="pf-badge pf-badge--green"><span class="material-icons">shield</span>${esc(p.shield)}</span>` : '<span class="pf-prod-cat">—</span>'}</td>
      <td>${p.vis === 'public' ? '<span class="pf-badge pf-badge--blue"><span class="material-icons">public</span>Public</span>' : '<span class="pf-badge pf-badge--muted"><span class="material-icons">lock</span>Private</span>'}</td>
      <td><span class="pf-prod-cat">${esc(p.nutrients)}</span></td>
    </tr>`;
}

/* Re-render the Ledger tbody from the (possibly mutated) PRODUCTS array and
   re-apply the active search/filters. Called after a product is added or a
   product's resolution/shield changes via a flow. */
function rebuildLedgerBody() {
  const body = document.getElementById('pf-ledger-body');
  if (!body) return;
  body.innerHTML = PRODUCTS.map(ledgerRowHTML).join('');
  applyLedgerFilter?.();
}

function viewLedger() {
  const rows = PRODUCTS.map(ledgerRowHTML).join('');

  return `
    ${heroFor('ledger', 'Zoom In · The Ledger')}
    <div class="pf-ledger-toolbar">
      <div class="pf-search"><span class="material-icons">search</span><input type="text" placeholder="Search products, UPCs, categories…" id="pf-ledger-search" /></div>
      <button class="pf-chip" data-filter="gold"><span class="material-icons">workspace_premium</span>Brand Verified</button>
      <button class="pf-chip" data-filter="shield"><span class="material-icons">shield</span>Shielded</button>
      <button class="pf-chip" data-filter="public"><span class="material-icons">public</span>Public</button>
      <button class="pf-btn pf-btn--primary" data-sheet="new-product"><span class="material-icons">add</span>New product</button>
    </div>
    <div class="pf-table-wrap">
      <table class="pf-table">
        <thead><tr><th>Product</th><th>Resolution</th><th>Shield</th><th>Visibility</th><th>Nutrients</th></tr></thead>
        <tbody id="pf-ledger-body">${rows}</tbody>
      </table>
    </div>
    <p class="pf-card-desc" style="margin-top:12px;">Select any row to open the Deep Dive — a 360° view of that product's DNA and verification lifecycle.</p>`;
}

function viewIntake() {
  return `
    ${heroFor('intake', 'Pathway 1 · Managing the Truth')}
    <div class="pf-section-label"><span class="material-icons">upload_file</span>AI-First Ingestion — Meet the data where it is</div>
    <div class="pf-grid-2">
      ${[
        ['picture_as_pdf', 'PDF Specs', 'Drop supplier spec sheets — the Agent parses NFP + ingredients.', 'ingest-pdf'],
        ['table_view', 'ERP / CSV', 'Sync an ERP export or bulk CSV in a single pass.', 'ingest-erp'],
        ['link', 'Product URL', 'Paste a product page; the Agent scrapes and normalizes.', 'ingest-url'],
        ['photo_camera', 'Label Photo', 'Snap a raw label photo — OCR + reconciliation.', 'ingest-photo'],
      ].map(([ic, t, d, flow]) => `
        <div class="pf-card">
          <div class="pf-card-title"><span class="material-icons">${ic}</span>${esc(t)}</div>
          <p class="pf-card-desc">${esc(d)}</p>
          <div style="margin-top:10px;"><button class="pf-btn" data-flow="${esc(flow)}"><span class="material-icons">bolt</span>Start ingest</button></div>
        </div>`).join('')}
    </div>

    <div class="pf-section-label"><span class="material-icons">workspace_premium</span>The Brand Verified Gold Standard</div>
    <div class="pf-card">
      <p class="pf-card-desc">The Agent runs a real-time integrity audit — flagging gaps and normalizing errors. <em>“I've parsed the ingredients for ‘V3 Shake.’ Review and save to make it Brand Verified.”</em></p>
      <div class="pf-mission-actions" style="margin-top:10px;">
        <button class="pf-btn pf-btn--primary" data-flow="integrity-audit">Run integrity audit</button>
        <button class="pf-btn" data-go="ledger">Open the Ledger</button>
      </div>
    </div>

    <div class="pf-grid-2" style="margin-top:14px;">
      <div class="pf-card">
        <div class="pf-card-title"><span class="material-icons">visibility</span>Market Governance</div>
        <p class="pf-card-desc">Precision control over visibility. <em>“V3 Shake is Brand Verified. Launch to the Global Discovery Feed, or keep Private for R&amp;D?”</em></p>
        <div class="pf-mission-actions" style="margin-top:10px;"><button class="pf-btn" data-flow="go-public"><span class="material-icons">public</span>Go Public</button><button class="pf-btn pf-btn--ghost" data-flow="keep-private"><span class="material-icons">lock</span>Keep Private</button></div>
      </div>
      <div class="pf-card">
        <div class="pf-card-title"><span class="material-icons">sell</span>Discovery Tags &amp; Smart Sets</div>
        <p class="pf-card-desc">Signal the ecosystem and organize dynamically. <em>“Create a set of all high-fiber snacks.”</em></p>
        <div class="pf-taglist">
          <span class="pf-tag"><span class="material-icons">label</span>West Coast Distribution</span>
          <span class="pf-tag"><span class="material-icons">label</span>Seed-Oil Free</span>
          <span class="pf-tag"><span class="material-icons">label</span>Sodium-Reduced</span>
          <button type="button" class="pf-tag pf-tag--add" data-add-tag><span class="material-icons">add</span>Add tag</button>
        </div>
      </div>
    </div>`;
}

function viewVerified() {
  return `
    ${heroFor('verified', 'Pathway 2 · Managing the Trust')}
    <div class="pf-card" style="margin-bottom:18px;">
      <div class="pf-card-title"><span class="material-icons">radar</span>Pre-Qualification</div>
      <p class="pf-card-desc">The Agent constantly scans your Brand Verified foods against global standards. <em>“I've pre-qualified 5 UPCs as eligible for the Non-UPF Shield.”</em></p>
    </div>

    <div class="pf-section-label"><span class="material-icons">bolt</span>The Get Verified Flow</div>
    <div class="pf-stepper">
      <div class="pf-step" data-step="confirm">
        <div class="pf-step-num">1</div>
        <div><div class="pf-step-title">Confirm eligibility</div><p class="pf-step-text">“I've pre-qualified these 5 UPCs as eligible for the Non-UPF Shield. Would you like to get verified?”</p>
        <div style="margin-top:8px;"><button class="pf-btn pf-btn--primary" data-flow="confirm-upcs">Confirm 5 UPCs</button></div></div>
      </div>
      <div class="pf-step" data-step="attest">
        <div class="pf-step-num">2</div>
        <div><div class="pf-step-title">Attest</div><p class="pf-step-text">“Do you confirm these ingredients are accurate and complete?”</p>
        <div style="margin-top:8px;"><button class="pf-btn" data-flow="attest">Attest accuracy</button></div></div>
      </div>
      <div class="pf-step" data-step="activate">
        <div class="pf-step-num">3</div>
        <div><div class="pf-step-title">Activate</div><p class="pf-step-text">“Confirm payment and the Agent issues the Shield — your digital asset kit lands in your Vault.”</p>
        <div style="margin-top:8px;"><button class="pf-btn pf-btn--primary" data-flow="activate-shield">Activate &amp; pay</button> <button class="pf-btn" data-go="vault"><span class="material-icons">folder_special</span>Open Asset Vault</button></div></div>
      </div>
    </div>

    <div class="pf-section-label"><span class="material-icons">event_repeat</span>Lifecycle Watchdog</div>
    <div class="pf-card">
      <p class="pf-card-desc"><em>“A renewal is due for your top-selling SKU ‘V3 Shake’ in 15 days. Formulation hasn't changed — shall I re-verify based on current data?”</em></p>
      <div class="pf-mission-actions" style="margin-top:10px;"><button class="pf-btn pf-btn--primary" data-flow="auto-renew">Automate renewal</button><button class="pf-btn pf-btn--ghost" data-ack="Reminder snoozed — I'll nudge you in 7 days.">Snooze</button></div>
    </div>`;
}

function viewIdentity() {
  return `
    ${heroFor('identity', 'Pathway 3 · Managing the Presence')}
    <div class="pf-recipe">
      <div class="pf-card">
        <div class="pf-card-title"><span class="material-icons">badge</span>Public-Facing Profile</div>
        <p class="pf-card-desc">B2B/B2C synthesis — logos, mission, and Identity Assets that sync across the platform and the consumer app.</p>
        <div class="pf-taglist" style="margin-top:12px;" id="pf-identity-tags">
          <span class="pf-tag"><span class="material-icons">verified</span>USDA Organic</span>
          <span class="pf-tag"><span class="material-icons">eco</span>B-Corp</span>
          <span class="pf-tag"><span class="material-icons">recycling</span>Carbon Neutral 2030</span>
        </div>
        <div class="pf-mission-actions" style="margin-top:14px;"><button class="pf-btn pf-btn--primary" data-add-tag data-tag-target="pf-identity-tags" data-tag-label="Sustainability" data-tag-icon="recycling">Add Sustainability Tag</button><button class="pf-btn" data-sheet="edit-mission">Edit mission</button></div>
      </div>
      <div class="pf-card">
        <div class="pf-card-title"><span class="material-icons">hub</span>Connectivity Management</div>
        <p class="pf-card-desc">See who is searching for your Discovery Tags.</p>
        <button type="button" class="pf-ingredient-row pf-row-btn" data-sheet="identity-matches" data-match="Seed-Oil-Free brands"><span class="pf-ing-name">Seed-Oil-Free brands</span><span class="pf-ing-amt">14 retailers <span class="material-icons" style="font-size:14px;vertical-align:-2px;">chevron_right</span></span></button>
        <button type="button" class="pf-ingredient-row pf-row-btn" data-sheet="identity-matches" data-match="Sodium-Reduced snacks"><span class="pf-ing-name">Sodium-Reduced snacks</span><span class="pf-ing-amt">9 retailers <span class="material-icons" style="font-size:14px;vertical-align:-2px;">chevron_right</span></span></button>
        <button type="button" class="pf-ingredient-row pf-row-btn" data-sheet="identity-matches" data-match="West Coast distribution"><span class="pf-ing-name">West Coast distribution</span><span class="pf-ing-amt">6 partners <span class="material-icons" style="font-size:14px;vertical-align:-2px;">chevron_right</span></span></button>
        <div style="margin-top:10px;"><button class="pf-btn" data-sheet="identity-matches" data-match="Seed-Oil-Free brands"><span class="material-icons">visibility</span>View matches</button></div>
      </div>
    </div>`;
}

/* The Recipe Lab is a live formulation surface: ingredients live in state and
   the NFP+™ panel recomputes whenever one is added, so the buttons produce a
   visible, numeric result rather than a static mockup. */
const RECIPE = {
  name: 'High-Protein Overnight Oats',
  ingredients: [
    { icon: 'grain', name: 'Rolled oats', amt: '80 g', kcal: 303, protein: 11, carbs: 51, fiber: 8, sugar: 1, fat: 5 },
    { icon: 'water_drop', name: 'Almond milk', amt: '200 ml', kcal: 30, protein: 1, carbs: 1, fiber: 1, sugar: 0, fat: 3 },
    { icon: 'fitness_center', name: 'Whey isolate', amt: '30 g', kcal: 110, protein: 25, carbs: 2, fiber: 0, sugar: 1, fat: 1 },
    { icon: 'spa', name: 'Chia seeds', amt: '12 g', kcal: 58, protein: 2, carbs: 5, fiber: 4, sugar: 0, fat: 4 },
  ],
};

/* A small library the ingredient-picker sheet draws from. */
const INGREDIENT_LIBRARY = [
  { icon: 'eco', name: 'Flax seeds', amt: '10 g', kcal: 53, protein: 2, carbs: 3, fiber: 3, sugar: 0, fat: 4 },
  { icon: 'nutrition', name: 'Blueberries', amt: '50 g', kcal: 29, protein: 0, carbs: 7, fiber: 1, sugar: 5, fat: 0 },
  { icon: 'cookie', name: 'Almond butter', amt: '16 g', kcal: 98, protein: 3, carbs: 3, fiber: 2, sugar: 1, fat: 9 },
  { icon: 'set_meal', name: 'Greek yogurt', amt: '60 g', kcal: 36, protein: 6, carbs: 2, fiber: 0, sugar: 2, fat: 1 },
  { icon: 'grass', name: 'Pumpkin seeds', amt: '15 g', kcal: 84, protein: 4, carbs: 2, fiber: 1, sugar: 0, fat: 7 },
  { icon: 'icecream', name: 'Maple syrup', amt: '10 g', kcal: 26, protein: 0, carbs: 7, fiber: 0, sugar: 6, fat: 0 },
];

function recipeTotals() {
  return RECIPE.ingredients.reduce((t, i) => ({
    kcal: t.kcal + i.kcal, protein: t.protein + i.protein, carbs: t.carbs + i.carbs,
    fiber: t.fiber + i.fiber, sugar: t.sugar + i.sugar, fat: t.fat + i.fat,
  }), { kcal: 0, protein: 0, carbs: 0, fiber: 0, sugar: 0, fat: 0 });
}

function recipeIngredientRowHTML(i) {
  return `<div class="pf-ingredient-row"><span class="material-icons" style="color:var(--text-subtle);font-size:17px;">${esc(i.icon)}</span><span class="pf-ing-name">${esc(i.name)}</span><span class="pf-ing-amt">${esc(i.amt)}</span></div>`;
}

function recipeNfpHTML() {
  const t = recipeTotals();
  const line = (k, v) => `<div class="pf-nfp-line"><span class="pf-nfp-k">${esc(k)}</span><span class="pf-nfp-v">${esc(v)}</span></div>`;
  return [
    line('Calories', `${t.kcal} kcal`),
    line('Protein', `${t.protein} g`),
    line('Total Carbs', `${t.carbs} g`),
    line('Fiber', `${t.fiber} g`),
    line('Added Sugar', `${t.sugar} g`),
    line('Total Fat', `${t.fat} g`),
  ].join('');
}

/* Repaint the live recipe ingredient list + NFP+ panel in place (no full view
   rebuild, so the module keeps its scroll position). */
function renderRecipe() {
  const ings = document.getElementById('pf-recipe-ings');
  const nfp = document.getElementById('pf-recipe-nfp');
  if (ings) ings.innerHTML = RECIPE.ingredients.map(recipeIngredientRowHTML).join('');
  if (nfp) nfp.innerHTML = recipeNfpHTML();
}

function viewRecipes() {
  return `
    ${heroFor('recipes', 'Composed Formulations')}
    <div class="pf-recipe">
      <div class="pf-card">
        <div class="pf-card-title"><span class="material-icons">restaurant_menu</span>${esc(RECIPE.name)}</div>
        <p class="pf-card-desc">Composed recipe — add ingredients and watch NFP+™ recalculate live.</p>
        <div style="margin-top:12px;" id="pf-recipe-ings">${RECIPE.ingredients.map(recipeIngredientRowHTML).join('')}</div>
        <button class="pf-btn pf-btn--primary" data-sheet="add-ingredient" style="margin-top:8px;"><span class="material-icons">add</span>Add ingredient</button>
      </div>
      <div class="pf-card">
        <div class="pf-card-title"><span class="material-icons">receipt_long</span>Live NFP+™</div>
        <div style="margin-top:8px;" id="pf-recipe-nfp">${recipeNfpHTML()}</div>
        <div style="margin-top:12px;"><button class="pf-btn" data-flow="save-recipe"><span class="material-icons">save</span>Save to portfolio</button></div>
      </div>
    </div>`;
}

let vaultUnlocked = true; /* 99 products already shielded → vault is live */

function viewVault() {
  if (!vaultUnlocked) {
    return `
      ${heroFor('vault', 'Premium Wing · Locked')}
      <div class="pf-vault-gate">
        <div class="pf-vault-lock"><span class="material-icons">lock</span></div>
        <div class="pf-card-title" style="justify-content:center;">Unlock the Brand Growth Toolkit</div>
        <p class="pf-card-desc" style="max-width:520px;">You have 5 products eligible for Non-UPF verification. Once verified, you'll unlock 50+ high-res Shields, retail sheets, and social assets.</p>
        <button class="pf-btn pf-btn--primary" data-go="verified"><span class="material-icons">verified</span>Start verification</button>
      </div>`;
  }
  const folders = ['All', 'Non-UPF', 'Seed-Oil Free', 'Clean Label'];
  const assets = VAULT_ASSETS.map((a, i) => `
    <article class="pf-asset" data-asset="${i}" data-folder="${esc(a.folder)}" tabindex="0" role="button" aria-label="Download ${esc(a.name)}">
      <div class="pf-asset-art ${a.art}"><span class="material-icons">${esc(a.icon)}</span></div>
      <div class="pf-asset-meta">
        <div class="pf-asset-name">${esc(a.name)}</div>
        <div class="pf-asset-sub">${esc(a.sub)}</div>
      </div>
    </article>`).join('');
  return `
    ${heroFor('vault', 'Premium Wing · Unlocked')}
    <div class="pf-briefing" style="margin-bottom:16px;">
      <div class="pf-agent-avatar"><span class="material-icons">smart_toy</span></div>
      <div class="pf-briefing-body">
        <div class="pf-briefing-name"><span class="pf-live-dot"></span>AI Portfolio Agent</div>
        <p class="pf-briefing-text">I've added <strong>10 new “Back-to-School” social tiles</strong> to your Non-UPF Asset Vault. Want to see them?</p>
      </div>
    </div>
    <div class="pf-ledger-toolbar" id="pf-vault-folders">
      ${folders.map((f, i) => `<button class="pf-chip ${i === 0 ? 'is-on' : ''}" data-folder="${esc(f)}"><span class="material-icons">${i === 0 ? 'folder_open' : 'folder'}</span>${esc(f)}</button>`).join('')}
    </div>
    <div class="pf-vault-grid" id="pf-vault-grid">${assets}</div>`;
}

/* Show only the assets in the chosen folder ('All' shows everything). */
function filterVault(folder) {
  document.querySelectorAll('#pf-vault-folders .pf-chip').forEach((c) =>
    c.classList.toggle('is-on', c.dataset.folder === folder));
  document.querySelectorAll('#pf-vault-grid .pf-asset').forEach((el) => {
    el.style.display = (folder === 'All' || el.dataset.folder === folder) ? '' : 'none';
  });
}

/* ------------------------------------------------------------------ */
/* Analytics — charts & graphs (Chart.js)                              */
/* ------------------------------------------------------------------ */

/* Small KPI stat cards rendered above the charts. Each carries a sparkline
   trend drawn with Chart.js (see makeAnalyticsSparks). */
const ANALYTICS_KPIS = [
  { label: 'Brand Verified', value: '80%', delta: '▲ 6 pts', tone: 'is-up', spark: 'kpi-verified', kind: 'up', color: 'amber', section: 'ledger' },
  { label: 'Trust Coverage', value: '40%', delta: '▲ 4 pts', tone: 'is-up', spark: 'kpi-trust', kind: 'up', color: 'green', section: 'verified' },
  { label: 'Market Transparency', value: '62%', delta: '▲ 3 pts', tone: 'is-up', spark: 'kpi-transparency', kind: 'wave', color: 'primary', section: 'intake' },
  { label: 'Identity Completion', value: '75%', delta: '▲ 5 pts', tone: 'is-up', spark: 'kpi-identity', kind: 'up', color: 'violet', section: 'identity' },
];

/* A single chart card. `lg` gives the canvas extra height for hero charts. */
function chartCard(id, icon, title, desc, lg = false) {
  return `
    <div class="pf-card pf-chart-card">
      <div class="pf-card-title"><span class="material-icons">${esc(icon)}</span>${esc(title)}</div>
      <p class="pf-card-desc">${esc(desc)}</p>
      <div class="pf-chart-wrap${lg ? ' pf-chart-wrap--lg' : ''}"><canvas id="${esc(id)}"></canvas></div>
    </div>`;
}

function viewAnalytics() {
  const kpis = ANALYTICS_KPIS.map((k) => `
    <button class="pf-kpi" data-go="${esc(k.section)}">
      <div class="pf-kpi-top">
        <span class="pf-kpi-label">${esc(k.label)}</span>
        <span class="pf-kpi-delta ${k.tone}">${esc(k.delta)}</span>
      </div>
      <span class="pf-kpi-value">${esc(k.value)}</span>
      <div class="pf-kpi-spark"><canvas id="pf-${esc(k.spark)}"></canvas></div>
    </button>`).join('');

  return `
    ${heroFor('analytics', 'Visual Intelligence · Charts & graphs')}

    <div class="pf-kpi-grid">${kpis}</div>

    <div class="pf-section-label"><span class="material-icons">insights</span>Portfolio Overview</div>
    ${chartCard('pf-chart-trend', 'stacked_line_chart', 'Brand Verified & Trust Coverage', '12-month rolling — % of portfolio at the Gold Standard and protected by a WISEcode Shield.', true)}
    <div class="pf-chart-grid">
      ${chartCard('pf-chart-risk-trend', 'show_chart', 'Portfolio Risk Trend', '12-month rolling risk score vs. the category average.')}
      ${chartCard('pf-chart-category', 'donut_small', 'Risk Distribution', 'Products grouped by processing-risk band.')}
    </div>

    <div class="pf-section-label"><span class="material-icons">inventory_2</span>Products</div>
    <div class="pf-chart-grid">
      ${chartCard('pf-chart-product-risk', 'bar_chart', 'Product Risk by Category', 'Risk severity split across product categories.')}
      ${chartCard('pf-chart-product-verif', 'donut_small', 'Product Verification Status', 'Verification state across the portfolio.')}
    </div>

    <div class="pf-section-label"><span class="material-icons">science</span>Ingredients</div>
    <div class="pf-chart-grid">
      ${chartCard('pf-chart-ing-flags', 'leaderboard', 'Ingredient Flag Frequency', 'SKUs affected by the most-flagged ingredients.')}
      ${chartCard('pf-chart-ing-cats', 'donut_small', 'Ingredient Categories', 'Flagged ingredients grouped by category.')}
    </div>

    <div class="pf-section-label"><span class="material-icons">precision_manufacturing</span>Processing</div>
    <div class="pf-chart-grid">
      ${chartCard('pf-chart-proc-severity', 'bar_chart', 'Processing Severity', 'Severity bands across product categories.')}
      ${chartCard('pf-chart-proc-markers', 'radar', 'Processing Markers', 'Your portfolio vs. the category average.')}
    </div>

    <div class="pf-section-label"><span class="material-icons">verified</span>Verification & Trust</div>
    <div class="pf-chart-grid">
      ${chartCard('pf-chart-verif-queue', 'bar_chart', 'Verification Queue Status', 'Weekly queue composition — ready, review, missing.')}
      ${chartCard('pf-chart-verif-throughput', 'bar_chart', 'Verification Throughput', 'Approved, review, and rejected per week.')}
      ${chartCard('pf-chart-shields', 'shield', 'Shield Coverage by Category', 'Verified shields issued across product categories.')}
    </div>

    <div class="pf-section-label"><span class="material-icons">gavel</span>Compliance</div>
    <div class="pf-chart-grid">
      ${chartCard('pf-chart-claims', 'show_chart', 'Claims Review Outcomes', 'Resolved claims over the last 8 weeks.')}
      ${chartCard('pf-chart-jurisdictions', 'donut_small', 'Jurisdiction Coverage', 'Open claims by regulatory body.')}
    </div>

    <div class="pf-section-label"><span class="material-icons">leaderboard</span>Competitive & Reporting</div>
    <div class="pf-chart-grid">
      ${chartCard('pf-chart-radar', 'radar', 'Competitive Position', 'Your Truth Layer vs. the category average.')}
      ${chartCard('pf-chart-report-activity', 'show_chart', 'Reporting Activity', 'Drafts vs. published reports per week.')}
      ${chartCard('pf-chart-visibility', 'public', 'Discovery Visibility', 'Public vs. private products on the Discovery Feed, by month.')}
    </div>`;
}

/* --- Chart.js theming helpers ------------------------------------- */

/* Resolve a CSS custom property (e.g. '--primary') to its computed value so
   charts follow the active light/dark theme. */
function pfColor(name, fallback = '#025ED3') {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function pfAlpha(hex, alpha) {
  const h = String(hex).replace('#', '');
  if (h.length < 6) return hex;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function pfGrid() {
  return isDark() ? 'rgba(255,255,255,0.08)' : 'rgba(17,24,39,0.08)';
}

function pfTooltip() {
  return {
    backgroundColor: pfColor('--surface', '#0D1B24'),
    titleColor: pfColor('--text', '#fff'),
    bodyColor: pfColor('--text-muted', '#94A3B8'),
    borderColor: pfGrid(),
    borderWidth: 1,
    padding: 10,
    cornerRadius: 10,
    usePointStyle: true,
  };
}

function pfChartBase() {
  const text = pfColor('--text-muted', '#94A3B8');
  const grid = pfGrid();
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 700, easing: 'easeOutCubic' },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 14, color: text, font: { size: 11.5 } } },
      tooltip: pfTooltip(),
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: text, font: { size: 11 } } },
      y: { grid: { color: grid }, ticks: { color: text, font: { size: 11 } } },
    },
  };
}

/* Stacked / grouped bar options (theme-aware axes). */
function pfBarOpts(stacked = false) {
  const text = pfColor('--text-muted', '#94A3B8');
  const grid = pfGrid();
  return {
    ...pfChartBase(),
    scales: {
      x: { stacked, grid: { display: false }, ticks: { color: text, font: { size: 11 } } },
      y: { stacked, grid: { color: grid }, ticks: { color: text, font: { size: 11 } } },
    },
  };
}

/* Horizontal bar options. */
function pfHBarOpts() {
  const text = pfColor('--text-muted', '#94A3B8');
  const grid = pfGrid();
  return {
    ...pfChartBase(),
    indexAxis: 'y',
    plugins: { legend: { display: false }, tooltip: pfTooltip() },
    scales: {
      x: { grid: { color: grid }, ticks: { color: text, font: { size: 11 } } },
      y: { grid: { display: false }, ticks: { color: text, font: { size: 11 } } },
    },
  };
}

function pfDoughnutOpts() {
  return {
    responsive: true, maintainAspectRatio: false, cutout: '64%',
    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12, boxWidth: 8, color: pfColor('--text-muted', '#94A3B8'), font: { size: 11.5 } } }, tooltip: pfTooltip() },
  };
}

function pfRadarOpts() {
  const text = pfColor('--text-muted', '#94A3B8');
  const grid = pfGrid();
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12, boxWidth: 8, color: text, font: { size: 11 } } }, tooltip: pfTooltip() },
    scales: { r: { grid: { color: grid }, angleLines: { color: grid }, pointLabels: { color: text, font: { size: 11 } }, ticks: { display: false, stepSize: 20 }, suggestedMin: 0, suggestedMax: 100 } },
  };
}

/* Build a chart by id; the factory receives the 2d context (for gradients).
   No-op if the canvas isn't present or Chart.js hasn't loaded. */
function pfChart(id, build) {
  const el = document.getElementById(id);
  if (!el || !globalThis.Chart) return;
  const ctx = el.getContext('2d');
  analyticsCharts[id] = new globalThis.Chart(ctx, build(ctx));
}

/* Active Chart.js instances, keyed so we can destroy + rebuild on theme change. */
const analyticsCharts = {};
let analyticsBuilt = false;

function destroyAnalyticsCharts() {
  Object.keys(analyticsCharts).forEach((k) => {
    try { analyticsCharts[k]?.destroy(); } catch (_) {}
    delete analyticsCharts[k];
  });
  analyticsBuilt = false;
}

function makeAnalyticsSpark(id, kind, colorName) {
  const el = document.getElementById(`pf-${id}`);
  if (!el || !globalThis.Chart) return;
  const ctx = el.getContext('2d');
  const c = pfColor(colorName, '#025ED3');
  const data = kind === 'up' ? [10, 14, 11, 18, 16, 22, 21, 28, 30]
    : kind === 'down' ? [28, 22, 24, 20, 18, 14, 16, 12, 8]
    : [16, 19, 14, 21, 17, 23, 19, 24, 22];
  const grad = ctx.createLinearGradient(0, 0, 0, 46);
  grad.addColorStop(0, pfAlpha(c, 0.35));
  grad.addColorStop(1, pfAlpha(c, 0));
  analyticsCharts[id] = new globalThis.Chart(ctx, {
    type: 'line',
    data: { labels: data.map((_, i) => i), datasets: [{ data, borderColor: c, backgroundColor: grad, tension: 0.4, fill: true, borderWidth: 1.6, pointRadius: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, animation: { duration: 600 }, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } },
  });
}

function makeAnalyticsCharts() {
  if (!globalThis.Chart) return;

  const primary = pfColor('--primary', '#025ED3');
  const green = pfColor('--sec-green', '#3BAA5C');
  const amber = pfColor('--ter-amber', '#F5A524');
  const violet = pfColor('--ter-violet', '#7C3AED');
  const cyan = pfColor('--ter-cyan', '#06B6D4');
  const red = pfColor('--sec-red', '#D94C4C');
  const surface = pfColor('--surface', '#0D1B24');

  /* KPI sparklines. */
  const sparkVar = { primary: '--primary', green: '--sec-green', amber: '--ter-amber', violet: '--ter-violet', cyan: '--ter-cyan', red: '--sec-red' };
  ANALYTICS_KPIS.forEach((k) => makeAnalyticsSpark(k.spark, k.kind, sparkVar[k.color] || '--primary'));

  /* ---- Portfolio Overview ---- */

  /* Brand Verified & Trust Coverage (dual line, hero). */
  pfChart('pf-chart-trend', (ctx) => {
    const g1 = ctx.createLinearGradient(0, 0, 0, 300);
    g1.addColorStop(0, pfAlpha(amber, 0.28)); g1.addColorStop(1, pfAlpha(amber, 0));
    const g2 = ctx.createLinearGradient(0, 0, 0, 300);
    g2.addColorStop(0, pfAlpha(green, 0.22)); g2.addColorStop(1, pfAlpha(green, 0));
    return {
      type: 'line',
      data: {
        labels: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'],
        datasets: [
          { label: 'Brand Verified %', data: [62, 64, 66, 68, 69, 71, 72, 74, 76, 77, 79, 80], borderColor: amber, backgroundColor: g1, tension: 0.4, fill: true, borderWidth: 2.4, pointRadius: 0, pointHoverRadius: 5, pointBackgroundColor: amber },
          { label: 'Trust Coverage %', data: [18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40], borderColor: green, backgroundColor: g2, tension: 0.4, fill: true, borderWidth: 2.4, pointRadius: 0, pointHoverRadius: 5, pointBackgroundColor: green },
        ],
      },
      options: pfChartBase(),
    };
  });

  /* Portfolio Risk Trend (dual line). */
  pfChart('pf-chart-risk-trend', (ctx) => {
    const g1 = ctx.createLinearGradient(0, 0, 0, 240);
    g1.addColorStop(0, pfAlpha(primary, 0.28)); g1.addColorStop(1, pfAlpha(primary, 0));
    const g2 = ctx.createLinearGradient(0, 0, 0, 240);
    g2.addColorStop(0, pfAlpha(violet, 0.18)); g2.addColorStop(1, pfAlpha(violet, 0));
    return {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [
          { label: 'Portfolio risk %', data: [8.2, 8.8, 9.4, 9.1, 9.8, 10.4, 11.0, 10.6, 11.4, 11.9, 12.1, 12.4], borderColor: primary, backgroundColor: g1, tension: 0.4, fill: true, borderWidth: 2.4, pointRadius: 0, pointHoverRadius: 5, pointBackgroundColor: primary },
          { label: 'Category average', data: [10.0, 10.2, 10.4, 10.6, 10.8, 11.0, 11.2, 11.4, 11.6, 11.8, 12.0, 12.2], borderColor: violet, backgroundColor: g2, tension: 0.4, fill: true, borderWidth: 2, pointRadius: 0, borderDash: [6, 4] },
        ],
      },
      options: pfChartBase(),
    };
  });

  /* Risk Distribution (doughnut). */
  pfChart('pf-chart-category', () => ({
    type: 'doughnut',
    data: { labels: ['Low risk', 'Medium', 'High', 'Critical'], datasets: [{ data: [620, 410, 168, 50], backgroundColor: [green, amber, red, violet], borderColor: surface, borderWidth: 4, hoverOffset: 8 }] },
    options: pfDoughnutOpts(),
  }));

  /* ---- Products ---- */

  /* Product Risk by Category (stacked bar). */
  pfChart('pf-chart-product-risk', () => ({
    type: 'bar',
    data: {
      labels: ['Beverage', 'Snack', 'Pasta', 'Spreads', 'Cereal', 'Dairy'],
      datasets: [
        { label: 'Low', data: [120, 86, 138, 64, 42, 78], backgroundColor: green, borderRadius: 6, stack: 's' },
        { label: 'Medium', data: [42, 58, 32, 28, 22, 26], backgroundColor: amber, borderRadius: 6, stack: 's' },
        { label: 'High', data: [22, 18, 4, 8, 14, 12], backgroundColor: red, borderRadius: 6, stack: 's' },
      ],
    },
    options: pfBarOpts(true),
  }));

  /* Product Verification Status (doughnut). */
  pfChart('pf-chart-product-verif', () => ({
    type: 'doughnut',
    data: { labels: ['Verified', 'Ready', 'Review', 'Missing'], datasets: [{ data: [612, 380, 196, 60], backgroundColor: [green, primary, amber, red], borderColor: surface, borderWidth: 4, hoverOffset: 8 }] },
    options: pfDoughnutOpts(),
  }));

  /* ---- Ingredients ---- */

  /* Ingredient Flag Frequency (horizontal bar). */
  pfChart('pf-chart-ing-flags', () => ({
    type: 'bar',
    data: {
      labels: ['Carrageenan', 'Polysorbate-80', 'Mono- & diglycerides', 'HFCS', 'Sodium benzoate', 'Red 40', 'BHA / BHT'],
      datasets: [{ label: 'SKUs', data: [148, 132, 121, 96, 84, 67, 52], backgroundColor: amber, borderRadius: 6 }],
    },
    options: pfHBarOpts(),
  }));

  /* Ingredient Categories (doughnut). */
  pfChart('pf-chart-ing-cats', () => ({
    type: 'doughnut',
    data: { labels: ['Emulsifiers', 'Sweeteners', 'Preservatives', 'Colors', 'Flavors', 'Other'], datasets: [{ data: [68, 42, 38, 24, 18, 24], backgroundColor: [primary, amber, violet, red, cyan, green], borderColor: surface, borderWidth: 4, hoverOffset: 8 }] },
    options: pfDoughnutOpts(),
  }));

  /* ---- Processing ---- */

  /* Processing Severity (stacked bar). */
  pfChart('pf-chart-proc-severity', () => ({
    type: 'bar',
    data: {
      labels: ['Beverage', 'Snack', 'Pasta', 'Spreads', 'Cereal', 'Dairy'],
      datasets: [
        { label: 'Low', data: [88, 74, 142, 58, 38, 72], backgroundColor: green, borderRadius: 6, stack: 's' },
        { label: 'Medium', data: [58, 62, 28, 32, 28, 30], backgroundColor: amber, borderRadius: 6, stack: 's' },
        { label: 'High', data: [38, 26, 4, 10, 12, 8], backgroundColor: red, borderRadius: 6, stack: 's' },
      ],
    },
    options: pfBarOpts(true),
  }));

  /* Processing Markers (radar). */
  pfChart('pf-chart-proc-markers', () => ({
    type: 'radar',
    data: {
      labels: ['Additives', 'Emulsifiers', 'Sweeteners', 'Preservatives', 'Colors', 'Markers'],
      datasets: [
        { label: 'Your portfolio', data: [74, 82, 68, 60, 48, 72], borderColor: red, backgroundColor: pfAlpha(red, 0.18), borderWidth: 2, pointRadius: 3, pointBackgroundColor: red },
        { label: 'Category avg', data: [62, 68, 58, 56, 42, 60], borderColor: violet, backgroundColor: pfAlpha(violet, 0.10), borderWidth: 2, pointRadius: 0, borderDash: [5, 3] },
      ],
    },
    options: pfRadarOpts(),
  }));

  /* ---- Verification & Trust ---- */

  /* Verification Queue Status (stacked bar). */
  pfChart('pf-chart-verif-queue', () => ({
    type: 'bar',
    data: {
      labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6', 'Wk 7', 'Wk 8'],
      datasets: [
        { label: 'Ready', data: [42, 48, 52, 58, 62, 68, 72, 78], backgroundColor: green, borderRadius: 6, stack: 's' },
        { label: 'Review', data: [18, 22, 18, 24, 22, 20, 24, 28], backgroundColor: amber, borderRadius: 6, stack: 's' },
        { label: 'Missing', data: [8, 6, 10, 8, 12, 9, 7, 6], backgroundColor: red, borderRadius: 6, stack: 's' },
      ],
    },
    options: pfBarOpts(true),
  }));

  /* Verification Throughput (stacked bar). */
  pfChart('pf-chart-verif-throughput', () => ({
    type: 'bar',
    data: {
      labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'],
      datasets: [
        { label: 'Approved', data: [42, 48, 52, 58, 62, 68, 72, 78], backgroundColor: green, borderRadius: 6, stack: 's' },
        { label: 'Review', data: [18, 22, 18, 24, 22, 20, 24, 28], backgroundColor: amber, borderRadius: 6, stack: 's' },
        { label: 'Rejected', data: [4, 3, 5, 4, 6, 5, 4, 3], backgroundColor: red, borderRadius: 6, stack: 's' },
      ],
    },
    options: pfBarOpts(true),
  }));

  /* Shield Coverage by Category (stacked bar). */
  pfChart('pf-chart-shields', () => ({
    type: 'bar',
    data: {
      labels: ['Beverages', 'Snacks', 'Pantry', 'Confection', 'Mixes'],
      datasets: [
        { label: 'Non-UPF', data: [22, 28, 12, 4, 9], backgroundColor: green, borderRadius: 6, stack: 's' },
        { label: 'Seed-Oil Free', data: [10, 16, 6, 2, 5], backgroundColor: cyan, borderRadius: 6, stack: 's' },
        { label: 'Clean Label', data: [6, 9, 4, 1, 3], backgroundColor: violet, borderRadius: 6, stack: 's' },
      ],
    },
    options: pfBarOpts(true),
  }));

  /* ---- Compliance ---- */

  /* Claims Review Outcomes (line). */
  pfChart('pf-chart-claims', (ctx) => {
    const grad = ctx.createLinearGradient(0, 0, 0, 240);
    grad.addColorStop(0, pfAlpha(amber, 0.4)); grad.addColorStop(1, pfAlpha(amber, 0));
    return {
      type: 'line',
      data: { labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'], datasets: [{ label: 'Resolved', data: [12, 16, 14, 22, 18, 26, 24, 30], borderColor: amber, backgroundColor: grad, tension: 0.4, fill: true, borderWidth: 2.4, pointRadius: 0 }] },
      options: pfChartBase(),
    };
  });

  /* Jurisdiction Coverage (doughnut). */
  pfChart('pf-chart-jurisdictions', () => ({
    type: 'doughnut',
    data: { labels: ['US-FDA', 'EU', 'USDA', 'US-FTC', 'CA-CFIA', 'Other'], datasets: [{ data: [10, 6, 3, 2, 2, 1], backgroundColor: [primary, violet, green, cyan, amber, red], borderColor: surface, borderWidth: 4, hoverOffset: 8 }] },
    options: pfDoughnutOpts(),
  }));

  /* ---- Competitive & Reporting ---- */

  /* Competitive Position (radar). */
  pfChart('pf-chart-radar', () => ({
    type: 'radar',
    data: {
      labels: ['Data', 'Trust', 'Transparency', 'Identity', 'Discovery', 'Freshness'],
      datasets: [
        { label: 'Your portfolio', data: [80, 40, 62, 75, 68, 84], borderColor: primary, backgroundColor: pfAlpha(primary, 0.18), borderWidth: 2, pointRadius: 3, pointBackgroundColor: primary },
        { label: 'Category avg', data: [58, 30, 50, 60, 55, 62], borderColor: violet, backgroundColor: pfAlpha(violet, 0.10), borderWidth: 2, pointRadius: 0, borderDash: [5, 3] },
      ],
    },
    options: pfRadarOpts(),
  }));

  /* Reporting Activity (dual line). */
  pfChart('pf-chart-report-activity', (ctx) => {
    const grad = ctx.createLinearGradient(0, 0, 0, 240);
    grad.addColorStop(0, pfAlpha(primary, 0.35)); grad.addColorStop(1, pfAlpha(primary, 0));
    return {
      type: 'line',
      data: {
        labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'],
        datasets: [
          { label: 'Drafts', data: [4, 6, 3, 8, 7, 9, 6, 7], borderColor: amber, tension: 0.4, borderWidth: 2, pointRadius: 0 },
          { label: 'Published', data: [2, 3, 4, 3, 5, 4, 6, 8], borderColor: primary, backgroundColor: grad, tension: 0.4, fill: true, borderWidth: 2.4, pointRadius: 0 },
        ],
      },
      options: pfChartBase(),
    };
  });

  /* Discovery Visibility (grouped bar). */
  pfChart('pf-chart-visibility', () => ({
    type: 'bar',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
      datasets: [
        { label: 'Public', data: [118, 128, 138, 146, 154], backgroundColor: primary, borderRadius: 6 },
        { label: 'Private', data: [110, 104, 100, 96, 94], backgroundColor: pfAlpha(violet, 0.7), borderRadius: 6 },
      ],
    },
    options: pfBarOpts(false),
  }));

  analyticsBuilt = true;
}

/* Build the Analytics charts once the module is visible (so Chart.js measures
   real layout). Re-run after a theme toggle to repaint with new colors. */
function initAnalyticsCharts() {
  if (analyticsBuilt) return;
  if (!document.getElementById('pf-chart-trend')) return;
  requestAnimationFrame(() => requestAnimationFrame(makeAnalyticsCharts));
}

function rerenderAnalyticsCharts() {
  if (!analyticsBuilt) return;
  destroyAnalyticsCharts();
  requestAnimationFrame(makeAnalyticsCharts);
}

const VIEWS = {
  'command-deck': viewCommandDeck,
  analytics: viewAnalytics,
  ledger: viewLedger,
  intake: viewIntake,
  verified: viewVerified,
  identity: viewIdentity,
  recipes: viewRecipes,
  vault: viewVault,
};

/* ------------------------------------------------------------------ */
/* Deep Dive (Product Detail)                                          */
/* ------------------------------------------------------------------ */

function ensureDeepDive() {
  let scrim = document.getElementById('pf-deepdive-scrim');
  if (scrim) return scrim;
  scrim = document.createElement('div');
  scrim.id = 'pf-deepdive-scrim';
  scrim.className = 'pf-deepdive-scrim';
  const panel = document.createElement('aside');
  panel.id = 'pf-deepdive';
  panel.className = 'pf-deepdive';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Product detail');
  document.body.appendChild(scrim);
  document.body.appendChild(panel);
  scrim.addEventListener('click', closeDeepDive);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDeepDive(); });
  /* The deep-dive lives at the body level (outside #modules-row), so its
     action buttons need their own delegated handler. */
  panel.addEventListener('click', (e) => {
    const flow = e.target.closest('[data-flow]');
    if (!flow) return;
    e.preventDefault();
    if (flow.dataset.flow === 'ask-agent') askAgentAboutProduct(Number(flow.dataset.idx));
    else openFlow(flow.dataset.flow, flow);
  });
  return scrim;
}

let currentDeepDiveIdx = null;

function openDeepDive(idx) {
  const p = PRODUCTS[idx];
  if (!p) return;
  currentDeepDiveIdx = idx;
  ensureDeepDive();
  const scrim = document.getElementById('pf-deepdive-scrim');
  const panel = document.getElementById('pf-deepdive');
  panel.innerHTML = `
    <div class="pf-deepdive-head">
      <span class="pf-prod-thumb"><span class="material-icons">nutrition</span></span>
      <div>
        <div class="pf-deepdive-title">${esc(p.name)}</div>
        <div class="pf-deepdive-sub">${esc(p.cat)} · UPC ${esc(p.upc)}</div>
      </div>
      <button class="pf-deepdive-close" id="pf-dd-close" aria-label="Close"><span class="material-icons">close</span></button>
    </div>
    <div class="pf-deepdive-body">
      <div class="pf-dd-section">
        <div class="pf-dd-label">Status</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${RES_BADGE[p.res]}
          ${p.shield ? `<span class="pf-badge pf-badge--green"><span class="material-icons">shield</span>${esc(p.shield)}</span>` : ''}
          ${p.vis === 'public' ? '<span class="pf-badge pf-badge--blue"><span class="material-icons">public</span>Public</span>' : '<span class="pf-badge pf-badge--muted"><span class="material-icons">lock</span>Private</span>'}
        </div>
      </div>
      <div class="pf-dd-section">
        <div class="pf-dd-label">Product DNA · NFP+™</div>
        <div class="pf-card" style="box-shadow:none;">
          <div class="pf-nfp-line"><span class="pf-nfp-k">Data resolution</span><span class="pf-nfp-v">${esc(p.nutrients)} nutrients</span></div>
          <div class="pf-nfp-line"><span class="pf-nfp-k">Image</span><span class="pf-nfp-v">${p.res === 'draft' ? 'Missing' : 'On file'}</span></div>
          <div class="pf-nfp-line"><span class="pf-nfp-k">Ingredients</span><span class="pf-nfp-v">${p.res === 'draft' ? 'Needs review' : 'Parsed'}</span></div>
        </div>
      </div>
      <div class="pf-dd-section">
        <div class="pf-dd-label">Verification lifecycle</div>
        <p class="pf-card-desc">${p.shield ? `Shielded under <strong>${esc(p.shield)}</strong>. Next renewal in 11 months.` : 'Not yet shielded. The Agent can pre-qualify this product for an eligible standard.'}</p>
      </div>
      <div class="pf-mission-actions">
        ${p.res === 'draft'
          ? `<button class="pf-btn pf-btn--primary" data-flow="make-verified" data-idx="${idx}">Make Brand Verified</button>`
          : (p.shield ? `<button class="pf-btn pf-btn--primary" data-flow="renew-shield" data-idx="${idx}">Renew shield</button>` : `<button class="pf-btn pf-btn--primary" data-flow="get-verified" data-idx="${idx}">Get Verified</button>`)}
        <button class="pf-btn" data-flow="ask-agent" data-idx="${idx}">Ask the Agent</button>
      </div>
    </div>`;
  panel.querySelector('#pf-dd-close').addEventListener('click', closeDeepDive);
  requestAnimationFrame(() => {
    scrim.classList.add('is-open');
    panel.classList.add('is-open');
  });
}

function closeDeepDive() {
  const scrim = document.getElementById('pf-deepdive-scrim');
  const panel = document.getElementById('pf-deepdive');
  if (scrim) scrim.classList.remove('is-open');
  if (panel) panel.classList.remove('is-open');
}

/* ------------------------------------------------------------------ */
/* Bottom sheet — the in-module action surface (progress + results)    */
/* Every primary button opens a sheet that runs a real, animated       */
/* multi-step flow and lands on a result with a follow-on action, so a  */
/* click always produces visible progress + an outcome (never a no-op). */
/* ------------------------------------------------------------------ */

let sheetEls = null;
let pendingSheetDownload = null;

function ensureSheet() {
  if (sheetEls) return sheetEls;
  const scrim = document.createElement('div');
  scrim.id = 'pf-sheet-scrim';
  scrim.className = 'pf-sheet-scrim';
  const sheet = document.createElement('div');
  sheet.id = 'pf-sheet';
  sheet.className = 'pf-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  document.body.appendChild(scrim);
  document.body.appendChild(sheet);
  scrim.addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
  /* Delegated controls that work in any sheet body: close, navigate to a
     module, run another flow, fire a toast, or trigger a download. */
  sheet.addEventListener('click', (e) => {
    const dl = e.target.closest('[data-sheet-download]');
    if (dl) { e.preventDefault(); pendingSheetDownload?.(); return; }
    const cta = e.target.closest('[data-sheet-cta]');
    if (cta) { e.preventDefault(); const go = cta.dataset.sheetCta; closeSheet(); if (go) openModule(go); return; }
    const flow = e.target.closest('[data-flow]');
    if (flow) { e.preventDefault(); openFlow(flow.dataset.flow, flow); return; }
    const t = e.target.closest('[data-toast]');
    if (t) { e.preventDefault(); toast(t.dataset.toast, 'check_circle'); if (t.hasAttribute('data-sheet-close')) closeSheet(); return; }
    if (e.target.closest('[data-sheet-close]')) { e.preventDefault(); closeSheet(); }
  });
  sheetEls = { scrim, sheet };
  return sheetEls;
}

function openSheet({ eyebrow = 'WISEcode Portfolio', title = '', icon = 'bolt' } = {}) {
  const { scrim, sheet } = ensureSheet();
  sheet.innerHTML = `
    <div class="pf-sheet-handle" aria-hidden="true"></div>
    <header class="pf-sheet-head">
      <span class="pf-sheet-icon"><span class="material-icons">${esc(icon)}</span></span>
      <div class="pf-sheet-titles">
        <div class="pf-sheet-eyebrow">${esc(eyebrow)}</div>
        <div class="pf-sheet-title">${esc(title)}</div>
      </div>
      <button class="pf-sheet-close" data-sheet-close="1" aria-label="Close"><span class="material-icons">close</span></button>
    </header>
    <div class="pf-sheet-body" id="pf-sheet-body"></div>`;
  requestAnimationFrame(() => { scrim.classList.add('is-open'); sheet.classList.add('is-open'); });
  return sheet.querySelector('#pf-sheet-body');
}

function closeSheet() {
  if (!sheetEls) return;
  sheetEls.scrim.classList.remove('is-open');
  sheetEls.sheet.classList.remove('is-open');
}

/* Animate a labeled, multi-step progress run inside `host`, then swap to a
   success card. Returns a promise that resolves when the run finishes. */
function runProgress(host, cfg = {}) {
  const { steps = [], doneTitle = 'Done', doneText = '', doneIcon = 'check_circle', result = '', cta = null, download = null } = cfg;
  pendingSheetDownload = download ? download.fn : null;
  host.innerHTML = `
    <div class="pf-flow">
      <div class="pf-flow-bar"><span class="pf-flow-fill" id="pf-flow-fill"></span></div>
      <div class="pf-flow-pct" id="pf-flow-pct">0%</div>
      <ul class="pf-flow-steps" id="pf-flow-steps">
        ${steps.map((s, i) => `<li class="pf-flow-step" data-i="${i}"><span class="pf-flow-dot"><span class="material-icons">radio_button_unchecked</span></span><span class="pf-flow-label">${esc(typeof s === 'string' ? s : s.label)}</span></li>`).join('')}
      </ul>
    </div>`;
  const fill = host.querySelector('#pf-flow-fill');
  const pct = host.querySelector('#pf-flow-pct');
  const stepEls = Array.from(host.querySelectorAll('.pf-flow-step'));
  const n = steps.length || 1;
  return new Promise((resolve) => {
    let i = 0;
    const tick = () => {
      if (i > 0) {
        const prev = stepEls[i - 1];
        prev?.classList.remove('is-active');
        prev?.classList.add('is-done');
        const ic = prev?.querySelector('.material-icons');
        if (ic) ic.textContent = 'check_circle';
      }
      if (i < n) {
        const cur = stepEls[i];
        cur?.classList.add('is-active');
        const ic = cur?.querySelector('.material-icons');
        if (ic) ic.textContent = 'autorenew';
        const target = Math.round(((i + 1) / n) * 100);
        if (fill) fill.style.width = target + '%';
        if (pct) pct.textContent = target + '%';
        const dur = (typeof steps[i] === 'object' && steps[i].ms) ? steps[i].ms : 560;
        i++;
        setTimeout(tick, dur);
      } else {
        host.innerHTML = `
          <div class="pf-flow-done">
            <div class="pf-flow-done-icon"><span class="material-icons">${esc(doneIcon)}</span></div>
            <div class="pf-flow-done-title">${esc(doneTitle)}</div>
            ${doneText ? `<p class="pf-flow-done-text">${doneText}</p>` : ''}
            ${result || ''}
            <div class="pf-sheet-actions">
              ${download ? `<button class="pf-btn pf-btn--primary" data-sheet-download="1"><span class="material-icons">download</span>${esc(download.label || 'Download')}</button>` : ''}
              ${cta ? `<button class="pf-btn ${download ? '' : 'pf-btn--primary'}" data-sheet-cta="${esc(cta.go || '')}">${esc(cta.label)}</button>` : ''}
              <button class="pf-btn" data-sheet-close="1">Close</button>
            </div>
          </div>`;
        resolve();
      }
    };
    setTimeout(tick, 220);
  });
}

/* ------------------------------------------------------------------ */
/* Flow registry — each key is a progress-driven action sheet.         */
/* ------------------------------------------------------------------ */

const FLOWS = {
  'ingest-pdf': { icon: 'picture_as_pdf', title: 'Parse PDF spec sheet',
    steps: ['Uploading spec sheet…', 'Extracting the NFP table…', 'Parsing the ingredient list…', 'Reconciling to the Gold Standard…'],
    doneTitle: 'Spec sheet parsed', doneText: 'Parsed <strong>15/15 nutrients</strong> and a full ingredient list. The draft is ready for a Brand Verified audit.',
    cta: { label: 'Open the Ledger', go: 'ledger' } },
  'ingest-erp': { icon: 'table_view', title: 'Sync ERP / CSV',
    steps: ['Connecting to source…', 'Reading 248 rows…', 'Normalizing fields…', 'De-duplicating SKUs…'],
    doneTitle: 'Import complete', doneText: 'Synced <strong>248 products</strong> — 12 parsed cleanly and are ready for audit.',
    cta: { label: 'Open the Ledger', go: 'ledger' } },
  'ingest-url': { icon: 'link', title: 'Scrape product URL',
    steps: ['Fetching the page…', 'Extracting structured data…', 'Mapping to NFP+…'],
    doneTitle: 'Page scraped', doneText: 'Pulled the product name, NFP, and an image. Review the draft and save to make it Brand Verified.',
    cta: { label: 'Open the Ledger', go: 'ledger' } },
  'ingest-photo': { icon: 'photo_camera', title: 'OCR label photo',
    steps: ['Reading the image…', 'Running OCR…', 'Reconciling against the database…'],
    doneTitle: 'Label digitized', doneText: 'OCR captured the panel with <strong>96% confidence</strong>. Two values are flagged for your review.',
    cta: { label: 'Open the Ledger', go: 'ledger' } },
  'integrity-audit': { icon: 'rule', title: 'Brand Verified integrity audit',
    steps: ['Loading product data…', 'Checking 15 required nutrients…', 'Validating the ingredient parse…', 'Scoring data resolution…'],
    doneTitle: 'Audit passed', doneText: 'Data resolution is at the <strong>Gold Standard</strong> — 12 products are ready to publish as Brand Verified.',
    cta: { label: 'Get them verified', go: 'verified' } },
  'go-public': { icon: 'public', title: 'Publish to Discovery Feed',
    steps: ['Validating visibility rules…', 'Publishing to the global feed…'],
    doneTitle: 'Now public', doneText: 'This product is live on the Global Discovery Feed.', toast: 'Published to Discovery Feed.', toastIcon: 'public' },
  'keep-private': { icon: 'lock', title: 'Set to private',
    steps: ['Updating visibility…'], doneTitle: 'Set to private', doneText: 'Kept private for R&D — hidden from the Discovery Feed.', toast: 'Visibility set to Private.', toastIcon: 'lock' },
  'confirm-upcs': { icon: 'fact_check', title: 'Confirm eligibility',
    steps: ['Re-checking the 5 UPCs…', 'Validating against the Non-UPF standard…'],
    doneTitle: '5 UPCs confirmed', doneText: 'All 5 products meet the Non-UPF standard. Next: attest the ingredient accuracy.', onDone: markStepDone },
  'attest': { icon: 'gavel', title: 'Attest accuracy',
    steps: ['Recording your attestation…', 'Writing to the audit trail…'],
    doneTitle: 'Attestation recorded', doneText: 'Your attestation is logged immutably. Next: activate the Shield.', onDone: markStepDone },
  'activate-shield': { icon: 'verified', title: 'Activate the Shield',
    steps: ['Confirming payment…', 'Issuing the Non-UPF Shield…', 'Generating your asset kit…'],
    doneTitle: 'Shield activated', doneText: 'The Non-UPF Shield is live and your digital asset kit is in the Vault.',
    cta: { label: 'Open Asset Vault', go: 'vault' }, onDone: markStepDone },
  'auto-renew': { icon: 'event_repeat', title: 'Automate renewal',
    steps: ['Re-checking the formulation…', 'Scheduling auto-attestation…'],
    doneTitle: 'Auto-renewal on', doneText: 'V3 Shake will auto-renew its Shield 7 days before expiry — no action needed.', toast: 'Auto-renewal scheduled.', toastIcon: 'event_repeat' },
  'save-recipe': { icon: 'save', title: 'Save formulation',
    steps: ['Computing the final NFP+…', 'Creating the product draft…', 'Adding it to your Ledger…'],
    doneTitle: 'Saved to portfolio', doneText: 'Your formulation is now a draft product in the Ledger.', onDone: saveRecipeToLedger, cta: { label: 'Open the Ledger', go: 'ledger' } },
  'make-verified': { icon: 'workspace_premium', title: 'Make Brand Verified',
    steps: ['Running the integrity audit…', 'Filling nutrient gaps…', 'Parsing ingredients…', 'Promoting to the Gold Standard…'],
    doneTitle: 'Brand Verified', doneText: 'This product now meets the Gold Standard and is Brand Verified.', onDone: setProductVerified },
  'get-verified': { icon: 'verified', title: 'Get Verified',
    steps: ['Pre-qualifying against standards…', 'Confirming eligibility…', 'Issuing the Non-UPF Shield…'],
    doneTitle: 'Shield issued', doneText: 'This product is now protected by the Non-UPF Shield.', onDone: setProductShielded },
  'renew-shield': { icon: 'event_repeat', title: 'Renew shield',
    steps: ['Re-validating the formulation…', 'Renewing the Shield…'],
    doneTitle: 'Shield renewed', doneText: 'Renewed for another 12 months.', toast: 'Shield renewed.', toastIcon: 'event_repeat' },
  'connect-retailer': { icon: 'hub', title: 'Connect with retailer',
    steps: ['Sending the connection request…'], doneTitle: 'Request sent', doneText: 'The retailer will see your verified profile and Discovery Tags.' },
};

function openFlow(key, btn) {
  const f = FLOWS[key];
  if (!f) { toast('Working on it…', 'autorenew'); return; }
  const body = openSheet({ eyebrow: f.eyebrow, title: f.title, icon: f.icon });
  runProgress(body, f).then(() => {
    if (typeof f.onDone === 'function') f.onDone(btn);
    if (f.toast) toast(f.toast, f.toastIcon || 'check_circle');
  });
}

/* ----- Flow side effects ----- */

function markStepDone(btn) {
  const stepEl = btn?.closest('.pf-step');
  if (!stepEl) return;
  stepEl.querySelector('.pf-step-num')?.classList.add('is-done');
  btn.disabled = true;
  btn.classList.add('is-done');
}

function setProductVerified(btn) {
  const p = PRODUCTS[Number(btn?.dataset.idx)];
  if (!p) return;
  p.res = 'gold';
  p.nutrients = '15/15';
  rebuildLedgerBody();
  if (currentDeepDiveIdx != null) openDeepDive(currentDeepDiveIdx);
}

function setProductShielded(btn) {
  const p = PRODUCTS[Number(btn?.dataset.idx)];
  if (!p) return;
  p.shield = p.shield || 'Non-UPF';
  if (p.res === 'draft') { p.res = 'verified'; p.nutrients = '15/15'; }
  rebuildLedgerBody();
  if (currentDeepDiveIdx != null) openDeepDive(currentDeepDiveIdx);
}

function saveRecipeToLedger() {
  PRODUCTS.unshift({ name: RECIPE.name, cat: 'Recipes · Composed', upc: '8 5012 00' + (420 + PRODUCTS.length), res: 'verified', shield: null, vis: 'private', nutrients: '15/15' });
  rebuildLedgerBody();
}

function askAgentAboutProduct(idx) {
  const p = PRODUCTS[idx];
  closeDeepDive();
  const q = p ? `Tell me about “${p.name}” — what should I do next?` : 'Tell me about this product.';
  if (scout && typeof scout.ask === 'function') {
    document.getElementById('pf-chat-panel')?.scrollIntoView({ behavior: 'smooth', inline: 'end', block: 'nearest' });
    scout.ask(q);
  } else {
    toast('Ask Scout in the chat dock.', 'chat');
  }
}

/* ------------------------------------------------------------------ */
/* Form / list sheets (non-progress)                                   */
/* ------------------------------------------------------------------ */

const RETAILER_MATCHES = {
  'Seed-Oil-Free brands': [
    { name: 'Whole Harvest Market', sub: 'Grocery · 412 stores · West region' },
    { name: 'Verdant Foods Co-op', sub: 'Natural grocer · 88 stores' },
    { name: 'PureCart (e-commerce)', sub: 'DTC marketplace · 1.2M shoppers' },
  ],
  'Sodium-Reduced snacks': [
    { name: 'HeartSmart Pharmacy', sub: 'Retail health · 240 stores' },
    { name: 'Coastal Grocers', sub: 'Regional grocery · 130 stores' },
  ],
  'West Coast distribution': [
    { name: 'Pacific Provisions', sub: 'Distributor · CA / OR / WA' },
    { name: 'SunBelt Logistics', sub: 'Cold-chain · Southwest' },
  ],
};

function openSheetByKey(key, ctx = {}) {
  switch (key) {
    case 'new-product': return sheetNewProduct();
    case 'add-ingredient': return sheetAddIngredient();
    case 'edit-mission': return sheetEditMission();
    case 'identity-matches': return sheetIdentityMatches(ctx.match);
    default: toast('Opening…', 'open_in_new');
  }
}

function sheetNewProduct() {
  const body = openSheet({ title: 'New product', icon: 'add_box' });
  body.innerHTML = `
    <p class="pf-sheet-lead">Add a draft product to your Ledger. The Agent queues it for a Brand Verified audit.</p>
    <label class="pf-field"><span class="pf-field-label">Product name</span><input class="pf-input" id="pf-np-name" placeholder="e.g. Maple Almond Granola" autocomplete="off" /></label>
    <label class="pf-field"><span class="pf-field-label">Category</span><input class="pf-input" id="pf-np-cat" placeholder="e.g. Snacks · Granola" autocomplete="off" /></label>
    <div class="pf-sheet-actions">
      <button class="pf-btn pf-btn--primary" id="pf-np-create"><span class="material-icons">add</span>Create draft</button>
      <button class="pf-btn" data-sheet-close="1">Cancel</button>
    </div>`;
  const nameI = body.querySelector('#pf-np-name');
  nameI.focus();
  body.querySelector('#pf-np-create').addEventListener('click', () => {
    const name = nameI.value.trim() || 'Untitled product';
    const cat = body.querySelector('#pf-np-cat').value.trim() || 'Uncategorized';
    PRODUCTS.unshift({ name, cat, upc: '8 5012 00' + (420 + PRODUCTS.length), res: 'draft', shield: null, vis: 'private', nutrients: '0/15' });
    rebuildLedgerBody();
    openModule('ledger');
    closeSheet();
    toast(`“${name}” added as a draft.`, 'check_circle');
  });
}

function sheetAddIngredient() {
  const body = openSheet({ title: 'Add ingredient', icon: 'add_circle' });
  body.innerHTML = `
    <p class="pf-sheet-lead">Pick an ingredient — the live NFP+™ panel recomputes as you add each one.</p>
    <div class="pf-pick-grid">
      ${INGREDIENT_LIBRARY.map((ing, i) => `
        <button type="button" class="pf-pick" data-ing="${i}">
          <span class="pf-pick-icon"><span class="material-icons">${esc(ing.icon)}</span></span>
          <span class="pf-pick-text"><span class="pf-pick-name">${esc(ing.name)}</span><span class="pf-pick-sub">${esc(ing.amt)} · ${ing.kcal} kcal · ${ing.protein}g protein</span></span>
          <span class="pf-pick-add"><span class="material-icons">add</span></span>
        </button>`).join('')}
    </div>
    <div class="pf-sheet-actions"><button class="pf-btn pf-btn--primary" data-sheet-close="1">Done</button></div>`;
  body.querySelectorAll('.pf-pick[data-ing]').forEach((b) => b.addEventListener('click', () => {
    const ing = INGREDIENT_LIBRARY[Number(b.dataset.ing)];
    RECIPE.ingredients.push({ ...ing });
    renderRecipe();
    const t = recipeTotals();
    toast(`Added ${ing.name} — now ${t.kcal} kcal · ${t.protein}g protein`, 'restaurant_menu');
    b.classList.add('is-added');
    const sub = b.querySelector('.pf-pick-sub');
    if (sub) sub.textContent = 'Added to recipe ✓';
  }));
}

function sheetEditMission() {
  const body = openSheet({ title: 'Edit brand mission', icon: 'edit_note' });
  const current = 'We make whole-food nutrition radically transparent — every product Brand Verified, every claim provable.';
  body.innerHTML = `
    <p class="pf-sheet-lead">Your public B2B/B2C mission syncs across the platform and the consumer app.</p>
    <textarea class="pf-input pf-textarea" id="pf-mission">${esc(current)}</textarea>
    <div class="pf-sheet-actions">
      <button class="pf-btn pf-btn--primary" id="pf-mission-save"><span class="material-icons">save</span>Save mission</button>
      <button class="pf-btn" data-sheet-close="1">Cancel</button>
    </div>`;
  body.querySelector('#pf-mission-save').addEventListener('click', () => { closeSheet(); toast('Mission updated and synced.', 'check_circle'); });
}

function sheetIdentityMatches(match) {
  const label = match || 'Seed-Oil-Free brands';
  const list = RETAILER_MATCHES[label] || RETAILER_MATCHES['Seed-Oil-Free brands'];
  const body = openSheet({ eyebrow: 'Connectivity · Discovery Feed', title: label, icon: 'hub' });
  body.innerHTML = `
    <p class="pf-sheet-lead">Retailers and partners actively searching for <strong>${esc(label)}</strong>.</p>
    <div class="pf-match-list">
      ${list.map((r) => `
        <div class="pf-match">
          <span class="pf-match-logo"><span class="material-icons">storefront</span></span>
          <div class="pf-match-body"><div class="pf-match-name">${esc(r.name)}</div><div class="pf-match-sub">${esc(r.sub)}</div></div>
          <button class="pf-btn" data-flow="connect-retailer">Connect</button>
        </div>`).join('')}
    </div>`;
}

/* ----- Discovery tags ----- */

function handleAddTag(btn) {
  const targetId = btn.dataset.tagTarget;
  if (targetId && btn.dataset.tagLabel) {
    const list = document.getElementById(targetId);
    if (list) list.insertAdjacentHTML('beforeend',
      `<span class="pf-tag"><span class="material-icons">${esc(btn.dataset.tagIcon || 'label')}</span>${esc(btn.dataset.tagLabel)}</span>`);
    toast(`“${btn.dataset.tagLabel}” tag added.`, 'sell');
    btn.disabled = true;
    btn.classList.add('is-done');
    return;
  }
  sheetAddTagInline(btn);
}

function sheetAddTagInline(btn) {
  const list = btn.closest('.pf-taglist');
  const body = openSheet({ title: 'Add discovery tag', icon: 'sell' });
  body.innerHTML = `
    <p class="pf-sheet-lead">Tag products so retailers searching the Discovery Feed can find them.</p>
    <input class="pf-input" id="pf-tag-input" placeholder="e.g. High-Protein" autocomplete="off" />
    <div class="pf-suggest">
      ${['High-Protein', 'Gluten-Free', 'Low-Sugar', 'Plant-Based', 'Keto'].map((s) => `<button type="button" class="pf-chip" data-suggest="${esc(s)}">${esc(s)}</button>`).join('')}
    </div>
    <div class="pf-sheet-actions">
      <button class="pf-btn pf-btn--primary" id="pf-tag-add"><span class="material-icons">add</span>Add tag</button>
      <button class="pf-btn" data-sheet-close="1">Cancel</button>
    </div>`;
  const input = body.querySelector('#pf-tag-input');
  input.focus();
  body.querySelectorAll('[data-suggest]').forEach((s) => s.addEventListener('click', () => { input.value = s.dataset.suggest; input.focus(); }));
  body.querySelector('#pf-tag-add').addEventListener('click', () => {
    const v = input.value.trim();
    if (!v) { input.focus(); return; }
    if (list && btn) {
      const chip = document.createElement('span');
      chip.className = 'pf-tag';
      chip.innerHTML = `<span class="material-icons">label</span>${esc(v)}`;
      list.insertBefore(chip, btn);
    }
    closeSheet();
    toast(`“${v}” tag added.`, 'sell');
  });
}

/* ----- Vault asset download ----- */

function openAssetDownload(i) {
  const a = VAULT_ASSETS[i];
  if (!a) return;
  const body = openSheet({ eyebrow: `Asset Vault · ${a.folder}`, title: a.name, icon: a.icon });
  runProgress(body, {
    steps: ['Preparing the asset…', `Rendering ${a.fmt}…`, 'Packaging the download…'],
    doneTitle: 'Ready to download', doneText: `<strong>${esc(a.name)}</strong> · ${esc(a.sub)}`,
    download: { label: `Download ${a.fmt}`, fn: () => { downloadAssetFile(a); toast(`${a.name} downloaded.`, 'download'); } },
  });
}

function downloadAssetFile(a) {
  const ext = (a.fmt || 'TXT').toLowerCase();
  const blob = new Blob([`WISEcode Asset Vault\n\nAsset: ${a.name}\nFolder: ${a.folder}\nFormat: ${a.fmt}\nNote: ${a.sub}\n`], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${a.name.replace(/[^\w]+/g, '-').toLowerCase()}.${ext}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/* ----- Portfolio export / share (used by the More popover) ----- */

function exportPortfolio() {
  const header = ['Product', 'Category', 'Resolution', 'Shield', 'Visibility', 'Nutrients'].join('\t');
  const rows = PRODUCTS.map((p) => [p.name, p.cat, p.res, p.shield || '—', p.vis, p.nutrients].join('\t'));
  const blob = new Blob([`WISEcode Portfolio export\nGenerated ${new Date().toLocaleString()}\n\n${header}\n${rows.join('\n')}\n`], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'wisecode-portfolio.txt';
  document.body.appendChild(link);
  link.click();
  link.remove();
  toast('Portfolio exported.', 'download');
}

function sharePortfolio() {
  const url = window.location.href;
  if (navigator.share) {
    navigator.share({ title: 'WISEcode Portfolio', url }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => toast('Link copied to clipboard.', 'link')).catch(() => toast('Could not copy link.', 'error'));
  } else {
    toast('Sharing is not supported here.', 'info');
  }
}

/* ------------------------------------------------------------------ */
/* Modules — every Portfolio surface is an independent panel that can be   */
/* popped open at the same time, side by side, mirroring ai-chat.html.     */
/* ------------------------------------------------------------------ */

const OPEN_KEY = 'pf-open-modules';
const SIDE_KEY = 'pf-module-sides';
const WIDE_KEY = 'pf-module-wide';

/* The set of currently-open section modules (insertion order is irrelevant;
   panels always render in canonical PORTFOLIO_SECTION_IDS order via flex
   `order`, set when each module element is built). */
let openModules = new Set();

/* Which side of the Scout chat each module sits on. Modules open to the LEFT
   of Scout by default (the always-visible frozen zone between the menu rail and
   Scout); the in-header switcher can move one to the right. Alerts always docks
   to the right of Scout regardless. */
let moduleSide = {};
let moduleWide = {};

function loadOpenModules() {
  let ids = ['command-deck'];
  try {
    const raw = JSON.parse(localStorage.getItem(OPEN_KEY) || 'null');
    if (Array.isArray(raw)) {
      const valid = raw.filter((id) => PORTFOLIO_SECTION_IDS.includes(id));
      if (valid.length) ids = valid;
    }
  } catch (_) {}
  openModules = new Set(ids);
}

function persistOpenModules() {
  try { localStorage.setItem(OPEN_KEY, JSON.stringify([...openModules])); } catch (_) {}
}

function loadSides() {
  try {
    const raw = JSON.parse(localStorage.getItem(SIDE_KEY) || 'null');
    if (raw && typeof raw === 'object') {
      PORTFOLIO_SECTION_IDS.forEach((id) => {
        if (raw[id] === 'left' || raw[id] === 'right') moduleSide[id] = raw[id];
      });
    }
  } catch (_) {}
}

function persistSides() {
  try { localStorage.setItem(SIDE_KEY, JSON.stringify(moduleSide)); } catch (_) {}
}

function loadWide() {
  try {
    const raw = JSON.parse(localStorage.getItem(WIDE_KEY) || 'null');
    if (raw && typeof raw === 'object') {
      PORTFOLIO_SECTION_IDS.forEach((id) => {
        if (typeof raw[id] === 'boolean') moduleWide[id] = raw[id];
      });
    }
  } catch (_) {}
}

function persistWide() {
  try { localStorage.setItem(WIDE_KEY, JSON.stringify(moduleWide)); } catch (_) {}
}

/* Default side is LEFT (modules open to the left of Scout, in the always-visible
   frozen zone between the menu rail and Scout); only an explicit flip to the
   right is stored as 'right'. Right-side modules get tucked under the sticky,
   space-filling Scout panel when the row scrolls, so left is the safe default. */
function sideOf(sectionId) {
  return moduleSide[sectionId] === 'right' ? 'right' : 'left';
}

/* Flex order keeps the row laid out as:
     menu (sticky, -9999) → LEFT modules (10–16) → Scout (99)
       → RIGHT modules (100–106) → Alerts (200, always right of Scout). */
function applySide(sectionId) {
  const el = moduleEl(sectionId);
  if (!el) return;
  const i = PORTFOLIO_SECTION_IDS.indexOf(sectionId);
  const right = sideOf(sectionId) === 'right';
  el.style.order = String((right ? 100 : 10) + i);
  el.querySelectorAll('.panel-flip').forEach((f) => f.setAttribute('data-side', right ? 'right' : 'left'));
}

function applyWide(sectionId) {
  const el = moduleEl(sectionId);
  if (!el) return;
  const wide = !!moduleWide[sectionId];
  el.classList.toggle('panel-wide', wide);
  el.querySelectorAll('.panel-width-toggle-btn').forEach((btn) => {
    btn.classList.toggle('is-on', wide);
    btn.setAttribute('aria-pressed', wide ? 'true' : 'false');
    btn.title = wide ? 'Double width — tap for normal width' : 'Normal width — tap to double';
  });
}

function flipModule(sectionId) {
  if (!PORTFOLIO_SECTION_IDS.includes(sectionId)) return;
  moduleSide[sectionId] = sideOf(sectionId) === 'right' ? 'left' : 'right';
  persistSides();
  applySide(sectionId);
  scrollToModule(sectionId);
}

function toggleModuleWidth(sectionId) {
  if (!PORTFOLIO_SECTION_IDS.includes(sectionId)) return;
  moduleWide[sectionId] = !moduleWide[sectionId];
  persistWide();
  applyWide(sectionId);
  scrollToModule(sectionId);
}

function moduleEl(sectionId) {
  return document.getElementById(`pf-mod-${sectionId}`);
}

function railBtn(sectionId) {
  return document.querySelector(`.pf-module-btn[data-section="${sectionId}"]`);
}

/* Build all section module shells once (hidden) and inject them into the
   modules row, immediately before the persistent Scout chat. */
function buildModules() {
  const row = document.getElementById('modules-row');
  const chat = document.getElementById('pf-chat-panel');
  if (!row || !chat) return;

  PORTFOLIO_SECTION_IDS.forEach((sectionId) => {
    if (moduleEl(sectionId)) return;
    const sec = getPortfolioSection(sectionId);
    const el = document.createElement('section');
    el.id = `pf-mod-${sectionId}`;
    el.className = 'pf-module';
    el.dataset.section = sectionId;
    el.setAttribute('aria-label', sec ? sec.label : sectionId);
    el.innerHTML = `
      <div class="pf-module-inner">
        <header class="pf-module-header">${moduleHeaderHTML(sectionId)}</header>
        <div class="pf-module-scroll" id="pf-view-${sectionId}">${(VIEWS[sectionId] || viewCommandDeck)()}</div>
      </div>`;
    row.insertBefore(el, chat);
    applySide(sectionId);
    applyWide(sectionId);
  });

  wireLedger();
}

/* Apply the open/closed visual state for every module + rail button. */
function syncModules() {
  PORTFOLIO_SECTION_IDS.forEach((sectionId) => {
    const open = openModules.has(sectionId);
    moduleEl(sectionId)?.classList.toggle('is-open', open);
    const btn = railBtn(sectionId);
    if (btn) {
      btn.classList.toggle('lir-active', open);
      btn.setAttribute('aria-pressed', open ? 'true' : 'false');
    }
    document.querySelectorAll(`.menu-nav-subitem[data-section-id="${sectionId}"]`).forEach((el) => {
      el.classList.toggle('is-active', open);
    });
  });
}

function scrollToModule(sectionId) {
  const el = moduleEl(sectionId);
  if (!el) return;
  requestAnimationFrame(() =>
    el.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
  );
}

function openModule(sectionId, { scroll = true } = {}) {
  if (!PORTFOLIO_SECTION_IDS.includes(sectionId)) return;
  openModules.add(sectionId);
  persistOpenModules();
  syncModules();
  const view = document.getElementById(`pf-view-${sectionId}`);
  if (view) view.scrollTop = 0;
  if (sectionId === 'analytics') initAnalyticsCharts();
  if (scroll) scrollToModule(sectionId);
}

function closeModule(sectionId) {
  openModules.delete(sectionId);
  persistOpenModules();
  syncModules();
}

function toggleModule(sectionId) {
  if (openModules.has(sectionId)) closeModule(sectionId);
  else openModule(sectionId);
}

/* Backwards-compatible alias used by intent chips + in-module data-go links. */
function navigateTo(sectionId) {
  openModule(sectionId);
}

/* Build the top-bar section rail: one icon per Portfolio surface. */
function buildModuleRail() {
  const rail = document.getElementById('pf-module-rail');
  if (!rail) return;
  rail.innerHTML = PORTFOLIO_SECTION_IDS.map((sectionId) => {
    const sec = getPortfolioSection(sectionId);
    const short = RAIL_LABELS[sectionId] || sec.label;
    return `
      <button type="button" class="lir-btn lir-panel-btn pf-module-btn" data-section="${esc(sectionId)}"
        title="${esc(sec.label)} — ${esc(sec.sub)}" aria-label="Toggle ${esc(sec.label)} module" aria-pressed="false">
        <span class="${iconClassFor(sec.icon)}">${esc(sec.icon)}</span>
        <span class="lir-label">${esc(short)}</span>
      </button>`;
  }).join('');

  /* A top-bar icon toggles its module: it turns the module on (and scrolls it
     into view) if it's off, and turns it off if it's already open. */
  rail.addEventListener('click', (e) => {
    const btn = e.target.closest('.pf-module-btn[data-section]');
    if (!btn) return;
    toggleModule(btn.dataset.section);
  });
}

/* Short labels for the compact top-bar rail buttons. */
const RAIL_LABELS = {
  analytics: 'Dashboard',
  'command-deck': 'Deck',
  ledger: 'Ledger',
  intake: 'Intake',
  verified: 'Verified',
  identity: 'Identity',
  recipes: 'Recipes',
  vault: 'Vault',
};

/* ------------------------------------------------------------------ */
/* Column / grid layout toggle — mirrors ai-chat.html's setModuleLayout */
/* ------------------------------------------------------------------ */

const LAYOUT_KEY = 'wise-module-layout';

/* Split view docks Scout across the bottom half of the screen. Because Scout is
   a mid-row sibling of the other modules, the only way to pin it full-width
   below them (while the rest keep their normal horizontal-scroll behaviour) is
   to gather every non-Scout child into a #modules-top wrapper. This toggles that
   wrapper in/out without disturbing the modules' DOM order when it's removed. */
function applySplitWrap(on) {
  const row = document.getElementById('modules-row');
  const scout = document.getElementById('pf-chat-panel');
  if (!row || !scout) return;
  const wrapped = row.classList.contains('modules-split');
  if (on && !wrapped) {
    const top = document.createElement('div');
    top.id = 'modules-top';
    Array.from(row.children).forEach((child) => {
      if (child !== scout) top.appendChild(child);
    });
    row.appendChild(top);
    row.appendChild(scout);
    row.classList.add('modules-split');
  } else if (!on && wrapped) {
    const top = document.getElementById('modules-top');
    row.classList.remove('modules-split');
    if (top) {
      while (top.firstChild) row.insertBefore(top.firstChild, top);
      top.remove();
    }
  }
}

function setModuleLayout(mode) {
  if (mode !== 'grid' && mode !== 'split' && mode !== 'stack') mode = 'col';
  const row = document.getElementById('modules-row');
  if (!row) return;
  applySplitWrap(mode === 'split');
  row.classList.toggle('modules-grid', mode === 'grid');
  row.classList.toggle('modules-stack', mode === 'stack');
  /* Stack mode un-pins the menu rail into a full-width row at the top of the
     scroll, which would shove all the content down. Collapse the navigation
     module so the stack opens straight onto the modules. */
  if (mode === 'stack') {
    document.getElementById('menu-panel')?.classList.remove('mp-open');
  }
  const setBtn = (id, active) => {
    const btn = document.getElementById(id);
    btn?.classList.toggle('lir-layout-active', active);
    btn?.setAttribute('aria-pressed', active ? 'true' : 'false');
  };
  setBtn('lir-layout-col', mode === 'col');
  setBtn('lir-layout-grid', mode === 'grid');
  setBtn('lir-layout-split', mode === 'split');
  setBtn('lir-layout-stack', mode === 'stack');
  try { localStorage.setItem(LAYOUT_KEY, mode); } catch (_) {}
}

function setupLayoutToggle() {
  document.getElementById('lir-layout-col')?.addEventListener('click', () => setModuleLayout('col'));
  document.getElementById('lir-layout-grid')?.addEventListener('click', () => setModuleLayout('grid'));
  document.getElementById('lir-layout-split')?.addEventListener('click', () => setModuleLayout('split'));
  document.getElementById('lir-layout-stack')?.addEventListener('click', () => setModuleLayout('stack'));
  let mode = 'col';
  try {
    const saved = localStorage.getItem(LAYOUT_KEY);
    if (saved === 'grid' || saved === 'split' || saved === 'stack') mode = saved;
  } catch (_) {}
  setModuleLayout(mode);
}

/* Holds the Ledger's active-filter applier so rebuildLedgerBody() can re-run it
   after the PRODUCTS array changes (new product / resolution change). */
let applyLedgerFilter = null;

/* Live filtering for the Ledger: free-text search + filter chips. */
function wireLedger() {
  const search = document.getElementById('pf-ledger-search');
  const body = document.getElementById('pf-ledger-body');
  if (!body) return;

  const apply = () => {
    const q = (search?.value || '').trim().toLowerCase();
    const onChips = Array.from(document.querySelectorAll('.pf-ledger-toolbar .pf-chip.is-on'))
      .map((c) => c.dataset.filter)
      .filter(Boolean);
    Array.from(body.querySelectorAll('tr[data-product]')).forEach((row) => {
      const p = PRODUCTS[Number(row.dataset.product)];
      const matchesText = !q || `${p.name} ${p.cat} ${p.upc}`.toLowerCase().includes(q);
      const matchesChips = onChips.every((f) =>
        f === 'gold' ? p.res === 'gold' : f === 'shield' ? !!p.shield : f === 'public' ? p.vis === 'public' : true
      );
      row.style.display = matchesText && matchesChips ? '' : 'none';
    });
  };

  search?.addEventListener('input', apply);
  document.querySelectorAll('.pf-ledger-toolbar .pf-chip[data-filter]').forEach((chip) => {
    chip.addEventListener('click', () => { chip.classList.toggle('is-on'); apply(); });
  });
  applyLedgerFilter = apply;
  apply();
}

/* ------------------------------------------------------------------ */
/* Agent command bar                                                  */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Scout chat module (right rail) — the ONE shared chat component       */
/* ------------------------------------------------------------------ */

let scout = null;

function setupChat() {
  const panel = document.getElementById('pf-chat-panel');
  if (!panel) return;
  scout = mountScoutChat(panel, {
    title: 'Scout',
    agentCount: 1,
    heading: 'What can Scout help with?',
    sub: 'Your Portfolio agent — the Truth Layer for data, trust & identity',
    intents: PORTFOLIO_INTENTS,
    reply: portfolioReply,
    /* Trust + microcopy tuned to the Portfolio: reassure the user their data
       stays theirs, that Scout only drafts (never auto-publishes), and that
       every answer is traceable back to their own portfolio. */
    trust: [
      { icon: 'verified_user', label: 'Grounded in your portfolio' },
      { icon: 'lock', label: 'Private & encrypted' },
      { icon: 'history', label: 'Every change is logged' },
    ],
    disclaimer: '',
    sourceLabel: 'Grounded in your portfolio',
    statusLabel: 'Scout is checking your portfolio',
    /* Intent chips that map to a surface also drive the module navigation,
       tying the shared chat back into the Portfolio. */
    /* 'choose_agents' is handled inside the shared chat (it opens the in-chat
       Agent Settings panel), so no navigation/toast is needed here. */
    onIntent: (intent) => {
      const def = PORTFOLIO_INTENTS.find((d) => d.intent === intent);
      if (def && def.go) { navigateTo(def.go); }
      return false; /* let Scout also reply */
    },
  });
}

/* ------------------------------------------------------------------ */
/* Trailing rail (Alerts module + More popover) — mirrors agent pages  */
/* ------------------------------------------------------------------ */

const NOTIFICATIONS = [
  { title: '5 products eligible for Non-UPF Shield', sub: '2m ago · Verification', icon: 'verified', tone: 'green', go: 'verified' },
  { title: '12 products ready for Brand Verified', sub: '14m ago · Intake & Growth', icon: 'rule', tone: 'amber', go: 'intake' },
  { title: 'Retailers searching “Sodium-Reduced”', sub: '1h ago · Identity Portal', icon: 'insights', tone: 'cyan', go: 'identity' },
  { title: 'V3 Shake shield renews in 15 days', sub: '3h ago · Lifecycle Watchdog', icon: 'event_repeat', tone: 'blue', go: 'verified' },
];

function renderAlertsPanel() {
  const items = NOTIFICATIONS.map((n, i) => `
    <button type="button" class="notif-row" data-notif="${i}">
      <span class="notif-row-icon notif-ic-${esc(n.tone)}"><span class="material-icons">${esc(n.icon)}</span></span>
      <div class="notif-row-body">
        <div class="notif-row-title">${esc(n.title)}</div>
        <div class="notif-row-sub">${esc(n.sub)}</div>
      </div>
    </button>`).join('');
  return `
    <div class="alerts-inner">
      <header class="alerts-panel-header">
        <div class="alerts-panel-icon"><span class="material-icons">notifications</span></div>
        <div class="alerts-panel-titles">
          <div class="alerts-panel-title">Alerts</div>
          <div class="alerts-panel-sub">${NOTIFICATIONS.length} new from your Agent</div>
        </div>
      </header>
      <div class="alerts-panel-body">${items}</div>
      <div class="alerts-panel-footer">
        <button type="button" class="notif-view-all" data-action="mark-all-read"><span class="material-icons">done_all</span>Mark all as read</button>
      </div>
    </div>`;
}

function renderMorePopover() {
  return `
    <button type="button" class="topbar-menu-item" data-action="back-workspace"><span class="material-icons topbar-menu-icon">arrow_back</span><span>Back to workspace</span></button>
    <button type="button" class="topbar-menu-item" data-action="open-chat"><span class="material-icons topbar-menu-icon">chat</span><span>Open WISEowl chat</span></button>
    <div class="topbar-menu-divider"></div>
    <button type="button" class="topbar-menu-item" data-action="export"><span class="material-icons topbar-menu-icon">download</span><span>Export portfolio</span></button>
    <button type="button" class="topbar-menu-item" data-action="share"><span class="material-icons topbar-menu-icon">share</span><span>Share</span></button>
    <div class="topbar-menu-divider"></div>
    <button type="button" class="topbar-menu-item topbar-menu-item--danger" data-action="close"><span class="material-icons topbar-menu-icon">close</span><span>Close</span></button>`;
}

function setupTrailingRail() {
  const notifBtn = document.getElementById('topbar-notif-btn');
  const moreBtn = document.getElementById('topbar-more-btn');
  const row = document.getElementById('modules-row');

  let alertsPanel = document.getElementById('alerts-panel');
  if (!alertsPanel && row) {
    alertsPanel = document.createElement('aside');
    alertsPanel.id = 'alerts-panel';
    alertsPanel.innerHTML = renderAlertsPanel();
    row.appendChild(alertsPanel);
  }

  let morePop = document.getElementById('topbar-more-popover');
  const wrap = moreBtn?.closest('.topbar-menu-wrap');
  if (!morePop && wrap) {
    morePop = document.createElement('div');
    morePop.id = 'topbar-more-popover';
    morePop.className = 'topbar-popover hidden';
    morePop.setAttribute('role', 'menu');
    wrap.appendChild(morePop);
  }
  if (morePop) morePop.innerHTML = renderMorePopover();

  /* The Alerts icon always reveals the alerts panel and scrolls to it — it
     never closes it on click (close via "mark all read" or opening an alert).
     This makes a single click transport you there whether it was on or off. */
  function toggleAlerts() {
    if (!alertsPanel) return;
    alertsPanel.classList.add('alerts-open');
    if (notifBtn) {
      notifBtn.setAttribute('aria-expanded', 'true');
      notifBtn.classList.add('lir-active');
      notifBtn.classList.add('is-read');
    }
    requestAnimationFrame(() => alertsPanel.scrollIntoView({ behavior: 'smooth', inline: 'end', block: 'nearest' }));
  }
  function closeMore() {
    if (!morePop) return;
    morePop.classList.add('hidden');
    if (moreBtn) { moreBtn.setAttribute('aria-expanded', 'false'); moreBtn.classList.remove('lir-active'); }
  }
  function toggleMore() {
    if (!morePop) return;
    const opening = morePop.classList.contains('hidden');
    morePop.classList.toggle('hidden', !opening);
    if (moreBtn) { moreBtn.setAttribute('aria-expanded', opening ? 'true' : 'false'); moreBtn.classList.toggle('lir-active', opening); }
  }

  notifBtn?.addEventListener('click', (e) => { e.stopPropagation(); toggleAlerts(); });
  moreBtn?.addEventListener('click', (e) => { e.stopPropagation(); toggleMore(); });

  alertsPanel?.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]');
    if (action && action.dataset.action === 'mark-all-read') {
      notifBtn?.classList.add('is-read');
      alertsPanel.classList.remove('alerts-open');
      notifBtn?.classList.remove('lir-active');
      return;
    }
    const row = e.target.closest('.notif-row[data-notif]');
    if (row) {
      const n = NOTIFICATIONS[Number(row.dataset.notif)];
      row.classList.add('is-read');
      if (n?.go) {
        openModule(n.go);
        toast(`Opened ${getPortfolioSection(n.go)?.label || n.go}`, n.icon || 'open_in_new');
      }
      alertsPanel.classList.remove('alerts-open');
      notifBtn?.classList.remove('lir-active');
    }
  });

  morePop?.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]');
    if (!action) return;
    closeMore();
    switch (action.dataset.action) {
      case 'back-workspace': window.location.href = '../index.html'; break;
      case 'open-chat': window.location.href = 'ai-chat.html'; break;
      case 'export': exportPortfolio(); break;
      case 'share': sharePortfolio(); break;
      case 'close': if (window.history.length > 1) window.history.back(); else window.location.href = '../index.html'; break;
      default: toast('Action queued.', 'check_circle');
    }
  });

  document.addEventListener('click', (e) => {
    if (!morePop || morePop.classList.contains('hidden')) return;
    if (wrap && wrap.contains(e.target)) return;
    closeMore();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    alertsPanel?.classList.remove('alerts-open');
    notifBtn?.classList.remove('lir-active');
    closeMore();
  });
}

/* ------------------------------------------------------------------ */
/* Avatar / user popover + font size (mirrors agent pages)            */
/* ------------------------------------------------------------------ */

const FZ_SCALE = { sm: 0.82, md: 1, lg: 1.18, xl: 1.36 };
const FZ_LINE = { sm: 1.45, md: 1.6, lg: 1.65, xl: 1.7 };

function getStoredFontSize() {
  let fz = 'md';
  try { fz = localStorage.getItem('chat-font-size') || 'md'; } catch (_) {}
  return fz in FZ_SCALE ? fz : 'md';
}
function setFontSize(size) {
  if (!FZ_SCALE[size]) return;
  document.querySelectorAll('.pf-module-scroll').forEach((content) => {
    content.style.zoom = String(FZ_SCALE[size]);
    content.style.setProperty('--chat-line-height', String(FZ_LINE[size]));
  });
  document.querySelectorAll('.fz-btn[data-fz]').forEach((b) => b.classList.toggle('fz-active', b.dataset.fz === size));
  try { localStorage.setItem('chat-font-size', size); } catch (_) {}
}
function isDark() { return document.documentElement.classList.contains('dark'); }
function setDark(on) {
  document.documentElement.classList.toggle('dark', on);
  try { localStorage.setItem('wise-theme', on ? 'dark' : 'light'); } catch (_) {}
  if (activeAvatarPopover) renderAvatarBody(activeAvatarPopover);
  rerenderAnalyticsCharts();
}

let activeAvatarPopover = null;
let activeAvatarAnchor = null;

function renderAvatarBody(pop) {
  const fz = getStoredFontSize();
  const dark = isDark();
  pop.innerHTML = `
    <div class="wise-popover-header">Maya Chen</div>
    <div class="wise-popover-item" data-pop-action="profile"><span class="material-icons">person</span>My profile</div>
    <div class="wise-popover-item" data-pop-action="prefs"><span class="material-icons">tune</span>Preferences</div>
    <div class="wise-popover-item" data-pop-action="help"><span class="material-icons">help</span>Help &amp; docs</div>
    <div class="wise-popover-divider"></div>
    <div class="fz-row">
      <span class="fz-row-label">Text size</span>
      <div class="fz-btns">
        ${['sm', 'md', 'lg', 'xl'].map((s) => `<button type="button" class="fz-btn${fz === s ? ' fz-active' : ''}" data-fz="${s}">${s === 'sm' ? 'S' : s === 'md' ? 'M' : s === 'lg' ? 'L' : 'XL'}</button>`).join('')}
      </div>
    </div>
    <div class="wise-popover-item" data-pop-action="theme"><span class="material-icons">${dark ? 'light_mode' : 'dark_mode'}</span><span>${dark ? 'Switch to Light mode' : 'Switch to Dark mode'}</span></div>
    <div class="wise-popover-divider"></div>
    <div class="wise-popover-item danger" data-pop-action="signout"><span class="material-icons">logout</span>Sign out</div>`;
}

function closeAvatar() {
  if (!activeAvatarPopover) return;
  activeAvatarAnchor?.classList.remove('is-open');
  activeAvatarPopover.classList.remove('open');
  const p = activeAvatarPopover;
  setTimeout(() => p.remove(), 210);
  activeAvatarPopover = null;
  activeAvatarAnchor = null;
}

function openAvatar(anchor) {
  if (activeAvatarAnchor === anchor) { closeAvatar(); return; }
  closeAvatar();
  const pop = document.createElement('div');
  pop.className = 'wise-popover';
  document.body.appendChild(pop);
  renderAvatarBody(pop);
  const rect = anchor.getBoundingClientRect();
  const pw = pop.offsetWidth || 240;
  pop.style.left = Math.max(8, Math.min(rect.right - pw, window.innerWidth - pw - 8)) + 'px';
  pop.style.top = (rect.bottom + 8) + 'px';
  requestAnimationFrame(() => pop.classList.add('open'));
  activeAvatarPopover = pop;
  activeAvatarAnchor = anchor;
  anchor.classList.add('is-open');
  pop.addEventListener('click', (ev) => {
    const fzBtn = ev.target.closest('.fz-btn[data-fz]');
    if (fzBtn) { ev.stopPropagation(); setFontSize(fzBtn.dataset.fz); return; }
    const theme = ev.target.closest('[data-pop-action="theme"]');
    if (theme) { ev.stopPropagation(); setDark(!isDark()); return; }
    if (ev.target.closest('.fz-row, .wise-popover-header, .wise-popover-divider')) { ev.stopPropagation(); return; }
    closeAvatar();
  });
}

function setupAvatar() {
  const btn = document.querySelector('.topbar-profile');
  if (!btn) return;
  btn.setAttribute('role', 'button');
  btn.setAttribute('tabindex', '0');
  btn.setAttribute('aria-haspopup', 'menu');
  btn.addEventListener('click', (e) => { e.stopPropagation(); openAvatar(btn); });
  btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); } });
  document.addEventListener('click', (e) => { if (activeAvatarPopover && !activeAvatarPopover.contains(e.target)) closeAvatar(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAvatar(); });
}

/* ------------------------------------------------------------------ */
/* Bootstrap                                                          */
/* ------------------------------------------------------------------ */

function bootstrap() {
  /* Build the shared top bar (menu toggle, WISE logo, profile + trailing
     Alerts/More). The portfolio variant also renders the section-module
     rail + layout switcher; #pf-module-rail is populated by buildModuleRail. */
  mountTopbar({ variant: 'portfolio', logoHref: 'portfolio.html' });

  const navEl = document.getElementById('agent-menu-nav');
  if (navEl) {
    mountAgentMenu(navEl, null, {
      fromAgentPage: true,
      activeProductId: 'wisecode-portfolio',
    });
  }

  /* Seed open modules (persisted, default Command Deck) + per-module sides,
     build the top-bar section rail + the module shells, then apply state. */
  loadOpenModules();
  loadSides();
  loadWide();
  buildModuleRail();
  buildModules();

  /* Delegated clicks for the whole modules row: side switcher, in-view section
     navigation, acknowledgements, and product deep-dive. (Open/close lives in
     the top-bar rail.) */
  const row = document.getElementById('modules-row');
  row?.addEventListener('click', (e) => {
    const flip = e.target.closest('.panel-flip-btn');
    if (flip) { e.preventDefault(); flipModule(flip.dataset.flip || flip.closest('.pf-module')?.dataset.section); return; }
    const wide = e.target.closest('.panel-width-toggle-btn');
    if (wide) { e.preventDefault(); toggleModuleWidth(wide.dataset.wide || wide.closest('.pf-module')?.dataset.section); return; }

    /* Progress-driven action flows (open a bottom sheet). "ask-agent" is a
       special case that hands the question to the Scout dock instead. */
    const flow = e.target.closest('[data-flow]');
    if (flow) {
      e.preventDefault();
      if (flow.dataset.flow === 'ask-agent') askAgentAboutProduct(Number(flow.dataset.idx));
      else openFlow(flow.dataset.flow, flow);
      return;
    }
    /* Form / list bottom sheets. */
    const sheetBtn = e.target.closest('[data-sheet]');
    if (sheetBtn) { e.preventDefault(); openSheetByKey(sheetBtn.dataset.sheet, { ...sheetBtn.dataset }); return; }
    /* Add a discovery tag (preset or via an input sheet). */
    const addTag = e.target.closest('[data-add-tag]');
    if (addTag) { e.preventDefault(); handleAddTag(addTag); return; }
    /* Vault folder filter chips. */
    const folder = e.target.closest('#pf-vault-folders .pf-chip[data-folder]');
    if (folder) { e.preventDefault(); filterVault(folder.dataset.folder); return; }
    /* Vault asset → download flow. */
    const asset = e.target.closest('.pf-asset[data-asset]');
    if (asset) { e.preventDefault(); openAssetDownload(Number(asset.dataset.asset)); return; }
    /* Dismiss a mission card. */
    const dismiss = e.target.closest('[data-dismiss]');
    if (dismiss) {
      e.preventDefault();
      const card = dismiss.closest('.pf-mission');
      if (card) {
        card.style.transition = 'opacity .2s ease, transform .2s ease';
        card.style.opacity = '0';
        card.style.transform = 'translateY(6px)';
        setTimeout(() => card.remove(), 200);
      }
      toast(dismiss.dataset.dismiss || 'Dismissed.', 'inbox');
      return;
    }

    const go = e.target.closest('[data-go]');
    if (go) { e.preventDefault(); openModule(go.dataset.go); return; }
    const ack = e.target.closest('[data-ack]');
    if (ack) { e.preventDefault(); toast(ack.dataset.ack === '1' ? 'Done.' : ack.dataset.ack, 'check_circle'); return; }
    const tr = e.target.closest('tr[data-product]');
    if (tr) { openDeepDive(Number(tr.dataset.product)); }
  });

  /* Keyboard activation for the role="button" vault assets. */
  row?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const asset = e.target.closest('.pf-asset[data-asset]');
    if (asset) { e.preventDefault(); openAssetDownload(Number(asset.dataset.asset)); }
  });

  /* Left-menu section links open (and scroll to) the matching module instead
     of routing away — keeps the SPA, multi-module feel. */
  navEl?.addEventListener('click', (e) => {
    const sub = e.target.closest('.menu-nav-subitem[data-section-id]');
    if (sub && !e.target.closest('.menu-nav-chevron-btn')) {
      e.preventDefault();
      openModule(sub.dataset.sectionId);
    }
  });

  /* A #section hash (e.g. a deep link) opens that module on load + on change. */
  const openFromHash = () => {
    const id = (location.hash || '').replace(/^#/, '');
    if (PORTFOLIO_SECTION_IDS.includes(id)) openModule(id);
  };
  window.addEventListener('hashchange', openFromHash);

  setupChat();
  setupTrailingRail();
  setupAvatar();
  setupLayoutToggle();
  initLirTooltip();
  syncModules();
  openFromHash();
  /* If Analytics was restored open from a previous session, build its charts
     (persisted modules are shown via syncModules, which doesn't call openModule). */
  if (openModules.has('analytics')) initAnalyticsCharts();
  setFontSize(getStoredFontSize());
}

document.addEventListener('DOMContentLoaded', bootstrap);
