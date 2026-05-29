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
} from './agent-menu.js';
import { mountScoutChat } from './scout-chat.js';

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
  { name: 'Non-UPF Shield — Web', sub: 'SVG · PNG · 4 sizes', art: 'art-green', icon: 'verified' },
  { name: 'Retail Shelf Talker', sub: 'Print-ready PDF', art: '', icon: 'sell' },
  { name: 'Social Tile — Square', sub: '1080×1080', art: 'art-violet', icon: 'image' },
  { name: 'Back-to-School Tile', sub: 'New · Seasonal', art: 'art-amber', icon: 'auto_awesome' },
  { name: 'Seed-Oil-Free Badge', sub: 'SVG · PNG', art: 'art-green', icon: 'eco' },
  { name: 'Amazon A+ Module', sub: 'Retail template', art: '', icon: 'storefront' },
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

function portfolioReply(text) {
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
    <span class="agent-main-icon"><span class="material-icons">${esc(sec.icon)}</span></span>
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
        ${m.actions.map((a) => `<button class="pf-btn ${a.primary ? 'pf-btn--primary' : ''}" ${a.go ? `data-go="${esc(a.go)}"` : 'data-ack="1"'}>${esc(a.label)}</button>`).join('')}
      </div>
    </article>`).join('');

  return `
    <section class="pf-briefing">
      <div class="pf-agent-avatar"><span class="material-icons">smart_toy</span></div>
      <div class="pf-briefing-body">
        <div class="pf-briefing-name"><span class="pf-live-dot"></span>AI Portfolio Agent · Intelligence Briefing</div>
        <p class="pf-briefing-text">Good afternoon, Maya. Your portfolio looks <strong>stable</strong>. You're at <strong>80% Brand Verified</strong> with <strong>40% Trust Coverage</strong>. I've surfaced <strong>5 missions</strong> below — the highest value is verifying 5 Non-UPF-eligible products. You set the strategy; I'll handle the complexity.</p>
      </div>
    </section>

    <div class="pf-section-label"><span class="material-icons">monitor_heart</span>Portfolio Pulse</div>
    <div class="pf-pulse-bar">${stats}</div>

    <div class="pf-section-label"><span class="material-icons">speed</span>Brand Health</div>
    <div class="pf-gauge-grid">${gauges}</div>

    <div class="pf-section-label"><span class="material-icons">flag</span>Intelligent Pathways · Missions</div>
    <div class="pf-mission-grid">${missions}</div>`;
}

function viewLedger() {
  const rows = PRODUCTS.map((p, i) => `
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
    </tr>`).join('');

  return `
    ${heroFor('ledger', 'Zoom In · The Ledger')}
    <div class="pf-ledger-toolbar">
      <div class="pf-search"><span class="material-icons">search</span><input type="text" placeholder="Search products, UPCs, categories…" id="pf-ledger-search" /></div>
      <button class="pf-chip" data-filter="gold"><span class="material-icons">workspace_premium</span>Brand Verified</button>
      <button class="pf-chip" data-filter="shield"><span class="material-icons">shield</span>Shielded</button>
      <button class="pf-chip" data-filter="public"><span class="material-icons">public</span>Public</button>
      <button class="pf-btn pf-btn--primary" data-ack="1"><span class="material-icons">add</span>New product</button>
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
        ['picture_as_pdf', 'PDF Specs', 'Drop supplier spec sheets — the Agent parses NFP + ingredients.'],
        ['table_view', 'ERP / CSV', 'Sync an ERP export or bulk CSV in a single pass.'],
        ['link', 'Product URL', 'Paste a product page; the Agent scrapes and normalizes.'],
        ['photo_camera', 'Label Photo', 'Snap a raw label photo — OCR + reconciliation.'],
      ].map(([ic, t, d]) => `
        <div class="pf-card">
          <div class="pf-card-title"><span class="material-icons">${ic}</span>${esc(t)}</div>
          <p class="pf-card-desc">${esc(d)}</p>
          <div style="margin-top:10px;"><button class="pf-btn" data-ack="1">Start ingest</button></div>
        </div>`).join('')}
    </div>

    <div class="pf-section-label"><span class="material-icons">workspace_premium</span>The Brand Verified Gold Standard</div>
    <div class="pf-card">
      <p class="pf-card-desc">The Agent runs a real-time integrity audit — flagging gaps and normalizing errors. <em>“I've parsed the ingredients for ‘V3 Shake.’ Review and save to make it Brand Verified.”</em></p>
      <div class="pf-mission-actions" style="margin-top:10px;">
        <button class="pf-btn pf-btn--primary" data-go="verified">Run integrity audit</button>
        <button class="pf-btn" data-go="ledger">Open the Ledger</button>
      </div>
    </div>

    <div class="pf-grid-2" style="margin-top:14px;">
      <div class="pf-card">
        <div class="pf-card-title"><span class="material-icons">visibility</span>Market Governance</div>
        <p class="pf-card-desc">Precision control over visibility. <em>“V3 Shake is Brand Verified. Launch to the Global Discovery Feed, or keep Private for R&amp;D?”</em></p>
        <div class="pf-mission-actions" style="margin-top:10px;"><button class="pf-btn" data-ack="1"><span class="material-icons">public</span>Go Public</button><button class="pf-btn pf-btn--ghost" data-ack="1"><span class="material-icons">lock</span>Keep Private</button></div>
      </div>
      <div class="pf-card">
        <div class="pf-card-title"><span class="material-icons">sell</span>Discovery Tags &amp; Smart Sets</div>
        <p class="pf-card-desc">Signal the ecosystem and organize dynamically. <em>“Create a set of all high-fiber snacks.”</em></p>
        <div class="pf-taglist">
          <span class="pf-tag"><span class="material-icons">label</span>West Coast Distribution</span>
          <span class="pf-tag"><span class="material-icons">label</span>Seed-Oil Free</span>
          <span class="pf-tag"><span class="material-icons">label</span>Sodium-Reduced</span>
          <span class="pf-tag"><span class="material-icons">add</span>Add tag</span>
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
      <div class="pf-step">
        <div class="pf-step-num">1</div>
        <div><div class="pf-step-title">Confirm eligibility</div><p class="pf-step-text">“I've pre-qualified these 5 UPCs as eligible for the Non-UPF Shield. Would you like to get verified?”</p>
        <div style="margin-top:8px;"><button class="pf-btn pf-btn--primary" data-ack="Eligibility confirmed for 5 UPCs.">Confirm 5 UPCs</button></div></div>
      </div>
      <div class="pf-step">
        <div class="pf-step-num">2</div>
        <div><div class="pf-step-title">Attest</div><p class="pf-step-text">“Do you confirm these ingredients are accurate and complete?”</p>
        <div style="margin-top:8px;"><button class="pf-btn" data-ack="Attestation recorded.">Attest accuracy</button></div></div>
      </div>
      <div class="pf-step">
        <div class="pf-step-num is-done">3</div>
        <div><div class="pf-step-title">Activate</div><p class="pf-step-text">“Payment processed. Your digital asset kit is now in your Vault.”</p>
        <div style="margin-top:8px;"><button class="pf-btn" data-go="vault"><span class="material-icons">folder_special</span>Open Asset Vault</button></div></div>
      </div>
    </div>

    <div class="pf-section-label"><span class="material-icons">event_repeat</span>Lifecycle Watchdog</div>
    <div class="pf-card">
      <p class="pf-card-desc"><em>“A renewal is due for your top-selling SKU ‘V3 Shake’ in 15 days. Formulation hasn't changed — shall I re-verify based on current data?”</em></p>
      <div class="pf-mission-actions" style="margin-top:10px;"><button class="pf-btn pf-btn--primary" data-ack="Auto-renewal scheduled.">Automate renewal</button><button class="pf-btn pf-btn--ghost" data-ack="Reminder snoozed.">Snooze</button></div>
    </div>`;
}

function viewIdentity() {
  return `
    ${heroFor('identity', 'Pathway 3 · Managing the Presence')}
    <div class="pf-recipe" style="grid-template-columns:1.3fr 1fr;">
      <div class="pf-card">
        <div class="pf-card-title"><span class="material-icons">badge</span>Public-Facing Profile</div>
        <p class="pf-card-desc">B2B/B2C synthesis — logos, mission, and Identity Assets that sync across the platform and the consumer app.</p>
        <div class="pf-taglist" style="margin-top:12px;">
          <span class="pf-tag"><span class="material-icons">verified</span>USDA Organic</span>
          <span class="pf-tag"><span class="material-icons">eco</span>B-Corp</span>
          <span class="pf-tag"><span class="material-icons">recycling</span>Carbon Neutral 2030</span>
        </div>
        <div class="pf-mission-actions" style="margin-top:14px;"><button class="pf-btn pf-btn--primary" data-ack="Sustainability Discovery Tag added to your B2B profile.">Add Sustainability Tag</button><button class="pf-btn" data-ack="1">Edit mission</button></div>
      </div>
      <div class="pf-card">
        <div class="pf-card-title"><span class="material-icons">hub</span>Connectivity Management</div>
        <p class="pf-card-desc">See who is searching for your Discovery Tags.</p>
        <div class="pf-ingredient-row"><span class="pf-ing-name">Seed-Oil-Free brands</span><span class="pf-ing-amt">14 retailers</span></div>
        <div class="pf-ingredient-row"><span class="pf-ing-name">Sodium-Reduced snacks</span><span class="pf-ing-amt">9 retailers</span></div>
        <div class="pf-ingredient-row"><span class="pf-ing-name">West Coast distribution</span><span class="pf-ing-amt">6 partners</span></div>
        <div style="margin-top:10px;"><button class="pf-btn" data-ack="1"><span class="material-icons">visibility</span>View matches</button></div>
      </div>
    </div>`;
}

function viewRecipes() {
  return `
    ${heroFor('recipes', 'Composed Formulations')}
    <div class="pf-recipe">
      <div class="pf-card">
        <div class="pf-card-title"><span class="material-icons">restaurant_menu</span>High-Protein Overnight Oats</div>
        <p class="pf-card-desc">Composed recipe — add ingredients and watch NFP+™ recalculate live.</p>
        <div style="margin-top:12px;">
          <div class="pf-ingredient-row"><span class="material-icons" style="color:var(--text-subtle);font-size:17px;">grain</span><span class="pf-ing-name">Rolled oats</span><span class="pf-ing-amt">80 g</span></div>
          <div class="pf-ingredient-row"><span class="material-icons" style="color:var(--text-subtle);font-size:17px;">water_drop</span><span class="pf-ing-name">Almond milk</span><span class="pf-ing-amt">200 ml</span></div>
          <div class="pf-ingredient-row"><span class="material-icons" style="color:var(--text-subtle);font-size:17px;">fitness_center</span><span class="pf-ing-name">Whey isolate</span><span class="pf-ing-amt">30 g</span></div>
          <div class="pf-ingredient-row"><span class="material-icons" style="color:var(--text-subtle);font-size:17px;">spa</span><span class="pf-ing-name">Chia seeds</span><span class="pf-ing-amt">12 g</span></div>
        </div>
        <button class="pf-btn pf-btn--primary" data-ack="Ingredient picker opened." style="margin-top:8px;"><span class="material-icons">add</span>Add ingredient</button>
      </div>
      <div class="pf-card">
        <div class="pf-card-title"><span class="material-icons">receipt_long</span>Live NFP+™</div>
        <div style="margin-top:8px;">
          <div class="pf-nfp-line"><span class="pf-nfp-k">Calories</span><span class="pf-nfp-v">438 kcal</span></div>
          <div class="pf-nfp-line"><span class="pf-nfp-k">Protein</span><span class="pf-nfp-v">34 g</span></div>
          <div class="pf-nfp-line"><span class="pf-nfp-k">Total Carbs</span><span class="pf-nfp-v">52 g</span></div>
          <div class="pf-nfp-line"><span class="pf-nfp-k">Fiber</span><span class="pf-nfp-v">11 g</span></div>
          <div class="pf-nfp-line"><span class="pf-nfp-k">Added Sugar</span><span class="pf-nfp-v">2 g</span></div>
          <div class="pf-nfp-line"><span class="pf-nfp-k">Total Fat</span><span class="pf-nfp-v">12 g</span></div>
        </div>
        <div style="margin-top:12px;"><button class="pf-btn" data-go="ledger"><span class="material-icons">save</span>Save to portfolio</button></div>
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
  const folders = ['Non-UPF', 'Seed-Oil Free', 'Clean Label'];
  const assets = VAULT_ASSETS.map((a) => `
    <article class="pf-asset" data-ack="${esc(a.name)} downloaded.">
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
    <div class="pf-ledger-toolbar">
      ${folders.map((f, i) => `<button class="pf-chip ${i === 0 ? 'is-on' : ''}"><span class="material-icons">folder</span>${esc(f)}</button>`).join('')}
    </div>
    <div class="pf-vault-grid">${assets}</div>`;
}

const VIEWS = {
  'command-deck': viewCommandDeck,
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
  return scrim;
}

function openDeepDive(idx) {
  const p = PRODUCTS[idx];
  if (!p) return;
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
          ? '<button class="pf-btn pf-btn--primary" data-ack="Integrity audit started.">Make Brand Verified</button>'
          : (p.shield ? '<button class="pf-btn pf-btn--primary" data-ack="Renewal scheduled.">Renew shield</button>' : '<button class="pf-btn pf-btn--primary" data-ack="Pre-qualification started.">Get Verified</button>')}
        <button class="pf-btn" data-ack="Asked the Agent about this product.">Ask the Agent</button>
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

/* Which side of the Scout chat each module sits on. Modules open to the RIGHT
   of Scout by default; the in-header switcher can move one to the left.
   Alerts always docks to the right of Scout regardless. */
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

/* Default side is RIGHT (modules open to the right of Scout); only an explicit
   flip to the left is stored as 'left'. */
function sideOf(sectionId) {
  return moduleSide[sectionId] === 'left' ? 'left' : 'right';
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
        <span class="material-icons">${esc(sec.icon)}</span>
        <span class="lir-label">${esc(short)}</span>
      </button>`;
  }).join('');

  rail.addEventListener('click', (e) => {
    const btn = e.target.closest('.pf-module-btn[data-section]');
    if (!btn) return;
    toggleModule(btn.dataset.section);
  });
}

/* Short labels for the compact top-bar rail buttons. */
const RAIL_LABELS = {
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

function setModuleLayout(mode) {
  const row = document.getElementById('modules-row');
  const colBtn = document.getElementById('lir-layout-col');
  const gridBtn = document.getElementById('lir-layout-grid');
  if (!row) return;
  const grid = mode === 'grid';
  row.classList.toggle('modules-grid', grid);
  colBtn?.classList.toggle('lir-layout-active', !grid);
  colBtn?.setAttribute('aria-pressed', grid ? 'false' : 'true');
  gridBtn?.classList.toggle('lir-layout-active', grid);
  gridBtn?.setAttribute('aria-pressed', grid ? 'true' : 'false');
  try { localStorage.setItem(LAYOUT_KEY, grid ? 'grid' : 'col'); } catch (_) {}
}

function setupLayoutToggle() {
  document.getElementById('lir-layout-col')?.addEventListener('click', () => setModuleLayout('col'));
  document.getElementById('lir-layout-grid')?.addEventListener('click', () => setModuleLayout('grid'));
  let mode = 'col';
  try { mode = localStorage.getItem(LAYOUT_KEY) === 'grid' ? 'grid' : 'col'; } catch (_) {}
  setModuleLayout(mode);
}

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
  apply();
}

/* ------------------------------------------------------------------ */
/* Agent command bar                                                  */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Scout chat module (right rail) — the ONE shared chat component       */
/* ------------------------------------------------------------------ */

function setupChat() {
  const panel = document.getElementById('pf-chat-panel');
  if (!panel) return;
  mountScoutChat(panel, {
    title: 'Scout',
    agentCount: 1,
    heading: 'What can Scout help with?',
    sub: 'Your Portfolio agent — the Truth Layer for data, trust & identity',
    intents: PORTFOLIO_INTENTS,
    reply: portfolioReply,
    /* Intent chips that map to a surface also drive the module navigation,
       tying the shared chat back into the Portfolio. */
    onIntent: (intent) => {
      const def = PORTFOLIO_INTENTS.find((d) => d.intent === intent);
      if (def && def.go) { navigateTo(def.go); }
      else if (intent === 'choose_agents') { toast('Agent settings open in WISEcode AI.', 'smart_toy'); }
      return false; /* let Scout also reply */
    },
  });
}

/* ------------------------------------------------------------------ */
/* Trailing rail (Alerts module + More popover) — mirrors agent pages  */
/* ------------------------------------------------------------------ */

const NOTIFICATIONS = [
  { title: '5 products eligible for Non-UPF Shield', sub: '2m ago · Verification', icon: 'verified', tone: 'green' },
  { title: '12 products ready for Brand Verified', sub: '14m ago · Intake & Growth', icon: 'rule', tone: 'amber' },
  { title: 'Retailers searching “Sodium-Reduced”', sub: '1h ago · Identity Portal', icon: 'insights', tone: 'cyan' },
  { title: 'V3 Shake shield renews in 15 days', sub: '3h ago · Lifecycle Watchdog', icon: 'event_repeat', tone: 'blue' },
];

function renderAlertsPanel() {
  const items = NOTIFICATIONS.map((n) => `
    <button type="button" class="notif-row">
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

  function toggleAlerts() {
    if (!alertsPanel) return;
    const opening = !alertsPanel.classList.contains('alerts-open');
    alertsPanel.classList.toggle('alerts-open', opening);
    if (notifBtn) {
      notifBtn.setAttribute('aria-expanded', opening ? 'true' : 'false');
      notifBtn.classList.toggle('lir-active', opening);
      if (opening) notifBtn.classList.add('is-read');
    }
    if (opening) requestAnimationFrame(() => alertsPanel.scrollIntoView({ behavior: 'smooth', inline: 'end', block: 'nearest' }));
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
    }
  });

  morePop?.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]');
    if (!action) return;
    closeMore();
    switch (action.dataset.action) {
      case 'back-workspace': window.location.href = '../index.html'; break;
      case 'open-chat': window.location.href = 'ai-chat.html'; break;
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
/* Logo (mirrors agent-overview.js)                                   */
/* ------------------------------------------------------------------ */

const TOPBAR_LOGO_HTML = `
  <a href="portfolio.html" aria-label="WISE home" style="display:flex;flex-direction:column;align-items:flex-end;pointer-events:auto;color:inherit;text-decoration:none;cursor:pointer;">
  <svg class="tl-full" width="177" height="28" viewBox="0 0 656 104" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="WISE">
    <path d="M362.659 21.7629C366.348 21.7629 369.907 22.3486 373.334 23.5183C376.793 24.6553 379.828 26.3275 382.438 28.5362C385.082 30.713 386.977 33.3619 388.119 36.4808L378.474 39.942C377.92 38.35 376.857 36.9699 375.291 35.8003C373.724 34.5984 371.832 33.6552 369.613 32.9729C367.426 32.2906 365.107 31.9477 362.659 31.9477C360.048 31.9153 357.6 32.3381 355.315 33.2154C353.063 34.0601 351.22 35.2316 349.784 36.7262C348.348 38.2207 347.628 39.958 347.628 41.9398C347.628 44.3767 348.299 46.2281 349.638 47.4952C350.976 48.7622 352.77 49.7053 355.022 50.3226C357.307 50.9074 359.852 51.4446 362.659 51.9319C367.164 52.6467 371.325 53.8324 375.144 55.4895C378.996 57.1465 382.081 59.355 384.398 62.1168C386.748 64.8459 387.922 68.2091 387.922 72.2053C387.922 76.2342 386.748 79.777 384.398 82.8312C382.081 85.8528 378.996 88.2071 375.144 89.8966C371.325 91.5537 367.164 92.3823 362.659 92.3823C358.906 92.3822 355.298 91.7994 351.838 90.6298C348.379 89.4601 345.359 87.7857 342.781 85.6089C340.202 83.3996 338.359 80.7821 337.25 77.7607L346.797 74.2031C347.352 75.7623 348.412 77.16 349.978 78.3945C351.577 79.5967 353.472 80.5395 355.659 81.2218C357.878 81.9041 360.211 82.247 362.659 82.247C365.27 82.247 367.719 81.8241 370.004 80.9794C372.321 80.1346 374.181 78.9632 375.584 77.4686C377.02 75.974 377.738 74.2197 377.738 72.2053C377.738 70.1261 376.989 68.42 375.487 67.088C374.019 65.7559 372.124 64.7016 369.807 63.9219C367.522 63.1421 365.14 62.5563 362.659 62.1665C357.862 61.3867 353.553 60.2495 349.734 58.7549C345.948 57.2603 342.946 55.1632 340.727 52.4664C338.54 49.7697 337.446 46.2612 337.446 41.9398C337.446 37.8785 338.603 34.3356 340.92 31.3139C343.27 28.2925 346.356 25.9551 350.175 24.2981C354.026 22.6086 358.188 21.7629 362.659 21.7629Z" fill="currentColor"/>
    <path d="M471.956 40.9614C475.938 40.9615 479.627 41.8872 483.021 43.7391C486.447 45.5908 489.269 48.0773 491.489 51.1959L482.384 56.1204C481.013 54.496 479.414 53.2586 477.587 52.4139C475.759 51.5368 473.881 51.0997 471.956 51.0995C469.28 51.0995 466.846 51.8309 464.659 53.293C462.505 54.7226 460.791 56.623 459.518 58.9945C458.278 61.3334 457.658 63.9001 457.658 66.6937C457.658 69.4555 458.295 72.024 459.568 74.3959C460.841 76.7349 462.555 78.6182 464.709 80.0477C466.896 81.4773 469.312 82.1945 471.956 82.1945C473.979 82.1943 475.906 81.7371 477.733 80.8275C479.561 79.9179 481.111 78.7173 482.384 77.2232L491.489 82.1448C489.269 85.2309 486.447 87.7002 483.021 89.552C479.627 91.4038 475.938 92.3295 471.956 92.3297C467.452 92.3297 463.339 91.1779 459.618 88.8714C455.93 86.5645 452.974 83.476 450.754 79.6095C448.568 75.7109 447.477 71.4045 447.477 66.6937C447.477 63.1205 448.111 59.7906 449.384 56.7045C450.657 53.5855 452.405 50.8568 454.624 48.5175C456.876 46.1458 459.485 44.2913 462.455 42.9592C465.426 41.627 468.594 40.9614 471.956 40.9614Z" fill="currentColor"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M520.232 40.9614C524.735 40.9615 528.832 42.1158 532.52 44.4225C536.24 46.7294 539.194 49.8323 541.381 53.7312C543.6 57.6297 544.711 61.9505 544.711 66.6937C544.711 70.2348 544.074 73.5498 542.801 76.6362C541.528 79.7228 539.766 82.4542 537.514 84.8261C535.294 87.1652 532.699 88.9998 529.729 90.3319C526.792 91.6639 523.626 92.3295 520.232 92.3297C515.728 92.3297 511.614 91.1779 507.893 88.8714C504.205 86.5645 501.252 83.476 499.032 79.6095C496.845 75.7106 495.752 71.405 495.752 66.6937C495.752 63.1205 496.387 59.7906 497.659 56.7045C498.932 53.5855 500.68 50.8568 502.9 48.5175C505.152 46.1456 507.763 44.2913 510.734 42.9592C513.703 41.6275 516.87 40.9614 520.232 40.9614ZM520.232 51.0995C517.555 51.0995 515.121 51.8137 512.934 53.2434C510.781 54.6729 509.066 56.5734 507.794 58.9448C506.554 61.3163 505.934 63.8999 505.933 66.6937C505.933 69.5855 506.588 72.2025 507.893 74.5419C509.199 76.8808 510.927 78.75 513.081 80.147C515.268 81.5116 517.653 82.1945 520.232 82.1945C522.94 82.1943 525.372 81.4771 527.526 80.0477C529.679 78.6182 531.376 76.7347 532.617 74.3959C533.889 72.024 534.527 69.4555 534.527 66.6937C534.526 63.868 533.874 61.2692 532.57 58.8981C531.297 56.5262 529.58 54.6405 527.426 53.2434C525.272 51.8144 522.874 51.0997 520.232 51.0995Z" fill="currentColor"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M600.847 91.065H590.666V83.9002C589.066 86.4343 586.976 88.4803 584.398 90.0398C581.82 91.5668 578.8 92.3296 575.341 92.3297C571.783 92.3297 568.453 91.6639 565.353 90.3319C562.252 88.9997 559.508 87.1655 557.125 84.8261C554.775 82.4543 552.933 79.7227 551.595 76.6362C550.257 73.5498 549.588 70.2349 549.588 66.6937C549.588 63.1526 550.256 59.8376 551.595 56.7513C552.933 53.6328 554.776 50.9032 557.125 48.5642C559.508 46.1924 562.252 44.341 565.353 43.0088C568.453 41.6768 571.783 41.011 575.341 41.011C578.8 41.0111 581.82 41.7911 584.398 43.3506C586.976 44.8776 589.066 46.8922 590.666 49.3937C590.666 49.3937 590.666 32.9313 590.666 25.6154C590.666 21.8856 592.645 18.3248 596.563 17.957H600.847V91.065ZM575.437 50.8074C572.598 50.8075 570.003 51.5217 567.653 52.9513C565.336 54.3809 563.476 56.2981 562.072 58.7024C560.702 61.1064 560.016 63.77 560.016 66.6937C560.016 69.6504 560.716 72.3333 562.119 74.7376C563.555 77.1092 565.433 79.0095 567.75 80.4391C570.1 81.8361 572.663 82.5332 575.437 82.5333C578.31 82.5333 580.824 81.8362 582.978 80.4391C585.132 79.0095 586.797 77.0922 587.972 74.688C589.18 72.2837 589.782 69.6179 589.782 66.6937C589.782 63.7375 589.18 61.0567 587.972 58.6527C586.764 56.2485 585.082 54.3484 582.928 52.9513C580.807 51.5218 578.31 50.8074 575.437 50.8074Z" fill="currentColor"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M631.491 40.9614C635.245 40.9614 638.689 41.7413 641.822 43.3009C644.955 44.8279 647.631 46.9569 649.85 49.6858C652.07 52.3826 653.703 55.5025 654.747 59.0441C655.792 62.553 656.102 66.2905 655.677 70.2542H617.93C618.354 72.4952 619.17 74.5252 620.377 76.3441C621.617 78.131 623.184 79.5454 625.077 80.5851C627.003 81.6248 629.141 82.162 631.491 82.1945C633.972 82.1945 636.225 81.5773 638.249 80.3427C640.304 79.1083 641.984 77.4016 643.289 75.2254L653.62 77.6117C651.662 81.9331 648.709 85.4758 644.759 88.2376C640.81 90.9668 636.387 92.3297 631.491 92.3297C626.987 92.3297 622.874 91.1782 619.153 88.8714C615.465 86.5645 612.512 83.476 610.292 79.6095C608.105 75.7107 607.012 71.4048 607.012 66.6937C607.012 63.1202 607.649 59.7908 608.922 56.7045C610.195 53.5857 611.94 50.8567 614.159 48.5175C616.411 46.1456 619.023 44.2913 621.993 42.9592C624.963 41.6272 628.13 40.9614 631.491 40.9614ZM631.491 49.9282C629.174 49.9283 627.018 50.4826 625.027 51.5873C623.069 52.6919 621.438 54.2038 620.133 56.1204C618.861 58.0044 618.011 60.1312 617.586 62.5023H645.396C645.07 60.1634 644.237 58.0513 642.899 56.1671C641.594 54.2504 639.946 52.7386 637.955 51.634C635.997 50.4968 633.841 49.9282 631.491 49.9282Z" fill="currentColor"/>
    <path d="M246.344 72.9384L259.122 22.8845H268.377L281.205 72.9384L294.03 22.8845H304.508L287.079 91.1146H275.377L263.773 45.9355L252.171 91.1146H240.567L223.038 22.8845H233.516L246.344 72.9384Z" fill="currentColor"/>
    <path d="M325.02 91.1146H314.836V22.8845H325.02V91.1146Z" fill="currentColor"/>
    <path d="M441.784 33.0226H409.421V49.493H435.467V59.6312H409.421V80.9794H441.784V91.1146H399.236V22.8845H441.784V33.0226Z" fill="currentColor"/>
    <path d="M7.94367 36.7217C7.94367 36.7217 0 49.1818 0 59.7896C0 83.6278 17.6083 102.63 41.4236 102.991C49.9038 103.053 59.0932 102.991 66.4556 95.4701C39.5246 95.4701 23.056 75.9903 23.056 59.7896C23.056 59.7896 22.6685 47.0601 28.481 37.0312L7.94367 36.7217Z" fill="currentColor"/>
    <path d="M83.312 15.1789C90.6744 15.1789 94.6695 23.4157 96.2931 30.0874H96.4868C98.1104 23.4157 102.106 15.1789 109.468 15.1789H173.017C177.826 15.1789 177.826 13.2503 177.826 7.54237C177.826 2.89302 180.868 0 185.03 0H192.534V15.1789C192.534 28.5445 185.03 29.39 177.439 29.39L162.49 29.4405H118.768C114.118 29.4405 113.847 30.0874 111.987 34.7162C110.449 38.5432 96.4868 75.2185 96.4868 75.2185H96.2931C96.2931 75.2185 82.331 38.5432 80.7932 34.7162C78.9333 30.0874 78.662 29.4405 74.0121 29.4405H30.29L15.3414 29.39C7.75024 29.39 0.245492 28.5445 0.245492 15.1789V0H7.75024C11.6252 0 14.9539 3.47162 14.9539 7.54237C14.9539 13.2503 14.9539 15.1789 19.7626 15.1789H83.312Z" fill="currentColor"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M70.8707 37.0309C73.5902 37.0309 73.7844 38.4011 74.3672 39.8562L87.5742 73.739C82.3928 83.0194 73.5907 88.3337 62.7542 88.3337C46.3619 88.3336 30.9997 74.9839 30.9998 56.3096C30.9998 49.6757 32.2854 41.3513 37.1997 37.0309H70.8707ZM62.2681 45.8705C56.9958 45.8705 52.7218 50.0585 52.7218 55.7004C52.7218 61.3424 56.9958 65.5303 62.2681 65.5303C67.5403 65.5302 71.8144 61.3423 71.8144 55.7004C71.8144 50.0585 67.5403 45.8706 62.2681 45.8705Z" fill="currentColor"/>
    <path d="M184.642 36.7217C184.642 36.7217 192.586 49.1818 192.586 59.7896C192.586 83.6278 174.978 102.63 151.162 102.991C142.682 103.053 133.493 102.991 126.13 95.4701C153.061 95.4701 169.53 75.9903 169.53 59.7896C169.53 59.7896 169.917 47.0601 164.105 37.0312L184.642 36.7217Z" fill="currentColor"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M121.715 37.0309C118.996 37.0309 118.802 38.4011 118.219 39.8562L105.012 73.739C110.193 83.0194 118.995 88.3337 129.832 88.3337C146.224 88.3336 161.586 74.9839 161.586 56.3096C161.586 49.6757 160.301 41.3513 155.386 37.0309H121.715ZM130.318 45.8705C135.59 45.8705 139.864 50.0585 139.864 55.7004C139.864 61.3424 135.59 65.5303 130.318 65.5303C125.046 65.5302 120.772 61.3423 120.772 55.7004C120.772 50.0585 125.046 45.8706 130.318 45.8705Z" fill="currentColor"/>
  </svg>
  <svg class="tl-bug" width="54" height="28" viewBox="0 0 193 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M10.9834 35.6522C10.9834 35.6522 3.30615 47.7494 3.30615 58.0481C3.30615 81.1921 20.324 99.6409 43.3405 99.9915C51.5363 100.052 60.4175 99.9915 67.533 92.6894C41.5052 92.6894 25.589 73.777 25.589 58.0481C25.589 58.0481 25.2144 45.6894 30.832 35.9526L10.9834 35.6522Z" fill="currentColor"/>
    <path d="M83.8241 14.7368C90.9396 14.7368 94.8008 22.7337 96.3699 29.2111H96.5571C98.1262 22.7337 101.987 14.7368 109.103 14.7368H170.521C175.169 14.7368 175.169 12.8643 175.169 7.32269C175.169 2.80876 178.108 0 182.131 0H189.384V14.7368C189.384 27.7131 182.131 28.5339 174.794 28.5339L160.347 28.583H118.091C113.597 28.583 113.335 29.2111 111.537 33.7051C110.051 37.4206 96.5571 73.0277 96.5571 73.0277H96.3699C96.3699 73.0277 82.8761 37.4206 81.3899 33.7051C79.5923 29.2111 79.3301 28.583 74.8361 28.583H32.5803L18.133 28.5339C10.7965 28.5339 3.54341 27.7131 3.54341 14.7368V0H10.7965C14.5415 0 17.7585 3.37051 17.7585 7.32269C17.7585 12.8643 17.7585 14.7368 22.406 14.7368H83.8241Z" fill="currentColor"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M71.8001 35.9523C74.4284 35.9523 74.6161 37.2826 75.1793 38.6953L87.9434 71.5913C82.9358 80.6013 74.4289 85.7609 63.9558 85.7609C48.1132 85.7608 33.2662 72.7999 33.2663 54.6695C33.2664 48.2288 34.5088 40.1469 39.2583 35.9523H71.8001ZM63.486 44.5345C58.3905 44.5345 54.2598 48.6005 54.2598 54.0781C54.2598 59.5557 58.3905 63.6217 63.486 63.6217C68.5814 63.6216 72.7122 59.5556 72.7122 54.0781C72.7122 48.6005 68.5814 44.5346 63.486 44.5345Z" fill="currentColor"/>
    <path d="M181.756 35.6522C181.756 35.6522 189.433 47.7494 189.433 58.0481C189.433 81.1921 172.416 99.6409 149.399 99.9915C141.203 100.052 132.322 99.9915 125.206 92.6894C151.234 92.6894 167.151 73.777 167.151 58.0481C167.151 58.0481 167.525 45.6894 161.908 35.9526L181.756 35.6522Z" fill="currentColor"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M120.94 35.9523C118.311 35.9523 118.124 37.2826 117.56 38.6953L104.796 71.5913C109.804 80.6013 118.311 85.7609 128.784 85.7609C144.626 85.7608 159.473 72.7999 159.473 54.6695C159.473 48.2288 158.231 40.1469 153.481 35.9523H120.94ZM129.254 44.5345C134.349 44.5345 138.48 48.6005 138.48 54.0781C138.48 59.5557 134.349 63.6217 129.254 63.6217C124.158 63.6216 120.027 59.5556 120.027 54.0781C120.027 48.6005 124.158 44.5346 129.254 44.5345Z" fill="currentColor"/>
  </svg>
  <span class="topbar-tagline">Intelligence Platform</span>
  </a>`;

/* ------------------------------------------------------------------ */
/* Bootstrap                                                          */
/* ------------------------------------------------------------------ */

function bootstrap() {
  const logoEl = document.querySelector('.topbar-logo');
  if (logoEl && !logoEl.querySelector('svg')) logoEl.innerHTML = TOPBAR_LOGO_HTML;

  const navEl = document.getElementById('agent-menu-nav');
  if (navEl) {
    mountAgentMenu(navEl, null, {
      fromAgentPage: true,
      activeProductId: 'wisecode-portfolio',
    });
  }

  const toggle = document.getElementById('topbar-menu-toggle');
  toggle?.addEventListener('click', () => document.getElementById('menu-panel')?.classList.toggle('mp-open'));

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
    const go = e.target.closest('[data-go]');
    if (go) { e.preventDefault(); openModule(go.dataset.go); return; }
    const ack = e.target.closest('[data-ack]');
    if (ack) { e.preventDefault(); toast(ack.dataset.ack === '1' ? 'Done.' : ack.dataset.ack, 'check_circle'); return; }
    const tr = e.target.closest('tr[data-product]');
    if (tr) { openDeepDive(Number(tr.dataset.product)); }
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
  syncModules();
  openFromHash();
  setFontSize(getStoredFontSize());
}

document.addEventListener('DOMContentLoaded', bootstrap);
