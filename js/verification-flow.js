import './date-column.js';

/**
 * Non-UPF Verification flow module.
 *
 * A self-contained, 3-step wizard rendered into #agent-main-scroll on
 * verification.html (an app-nav shell page). The persistent WISEcodeAI chat docks
 * to the LEFT (via data-default-dock="left"); this module is the "right"
 * surface — the twin of the ai-chat split/dock pattern.
 *
 * Steps:
 *   1. Select Foods — choose pre-qualified UPCs to include.
 *   2. Attest       — review each SKU's data + formally attest to accuracy.
 *   3. Payment      — pick a plan, pay, and unlock the brand asset pack.
 *
 * "Non-UPF" is the first of several verification types the platform will
 * offer, so the flow is data-driven and the shield/labels are parameterised.
 */

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

const money = (n) => `$${Number(n).toFixed(2)}`;

function vfToast(msg, icon = 'check') {
  let wrap = document.getElementById('vf-toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'vf-toast-wrap';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = 'vf-toast';
  t.innerHTML = `<span class="material-symbols-outlined">${esc(icon)}</span><span>${esc(msg)}</span>`;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('is-in'));
  setTimeout(() => {
    t.classList.remove('is-in');
    setTimeout(() => t.remove(), 320);
  }, 2800);
}

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const PRICE_PER_ITEM = 99;

/* Foods entering the Non-UPF verification flow. Already-verified items live in
   the portfolio ledger, not here — this table only carries products still moving
   through the shield lifecycle: pre-qualified → pending attestation, with
   ineligible as the terminal hold. Each row uses a real product photo. */
const FOODS = [
  {
    id: 'egg-blend',
    name: 'Powdered Vitamin Eggs',
    brand: 'Nutrient Survival',
    upc: '818491020984',
    shield: 'prequal',
    updated: 'Jul 29, 2026',
    edited: 'Jul 22, 2026',
    thumbIcon: 'egg',
    img: '../assets/verification/ns-powdered-vitamin-eggs.png',
    selected: false,
    ingredients:
      'Nutrient Survival Food Blend (Whole Eggs, Egg Whites, Nonfat Milk, Starch, Citric Acid), ' +
      'Nutrient Survival Vitamin Blend (Vitamin C (Ascorbic Acid), Vitamin E (DL Alpha-Tocopheryl Acetate), ' +
      'D-Biotin, Vitamin A (Retinyl Palmitate), Vitamin B3 (Niacinamide), Maltodextrin, ' +
      'Vitamin B5 (D-Calcium Pantothenate), Vitamin K1 (Phytonadione), Vitamin D3 (Cholecalciferol), ' +
      'Folic Acid, Vitamin B1 (Thiamin Mononitrate), Vitamin B6 (Pyridoxine Hydrochloride), ' +
      'Vitamin B2 (Riboflavin), Vitamin B12 (Cyanocobalamin))',
  },
  {
    id: 'potato',
    name: 'Instant Vitamin Potato',
    brand: 'Nutrient Survival',
    upc: '818491021820',
    shield: 'prequal',
    updated: 'Jun 24, 2026',
    edited: 'Jun 18, 2026',
    thumbIcon: 'nutrition',
    img: '../assets/verification/ns-powdered-vitamin-potato.png',
    selected: false,
    ingredients:
      'Nutrient Survival Food Blend (Potato Flakes, Soluble Maize Fiber, Sea Salt, Minced Green Onion, ' +
      'Garlic Powder, Black Pepper, Onion Powder, Palm Kernel Oil, Oat Fiber) Nutrient Survival Mineral Blend ' +
      '(Calcium Lactate, Dipotassium Phosphate, Potassium Gluconate, Magnesium Malate, Tripotassium Citrate, ' +
      'Ferrous Bisglycinate Chelate, Zinc Citrate Dihydrate, L-Selenomethionine, Manganese Sulfate, ' +
      'Copper Gluconate, Molybdenum, Potassium Iodide, Chromium Chloride) Nutrient Survival Vitamin Blend ' +
      '(Choline Bitartrate, Vitamin C (Ascorbic Acid), Vitamin E (DL Alpha-Tocopheryl Acetate), D-Biotin, ' +
      'Vitamin A (Retinyl Palmitate), Vitamin B3 (Niacinamide), Maltodextrin, Vitamin B5 (D-Calcium Pantothenate), ' +
      'Vitamin K1 (Phytonadione), Vitamin D3 (Cholecalciferol), Folic Acid, Vitamin B1 (Thiamin Mononitrate), ' +
      'Vitamin B6 (Pyridoxine Hydrochloride), Vitamin B2 (Riboflavin), Vitamin B12 (Cyanocobalamin))',
  },
  {
    id: 'milk',
    name: 'Powdered Vitamin Milk',
    brand: 'Nutrient Survival',
    upc: '818491021226',
    shield: 'prequal',
    updated: 'Jul 26, 2026',
    edited: 'Jul 20, 2026',
    thumbIcon: 'water_drop',
    img: '../assets/verification/ns-powdered-vitamin-milk.png',
    selected: false,
    ingredients:
      'Nutrient Survival Vitamin Milk Blend (Nonfat Milk, Lactose, Vitamin C (Ascorbic Acid), ' +
      'Vitamin E (DL Alpha-Tocopheryl Acetate), D-Biotin, Vitamin A (Retinyl Palmitate), Vitamin B3 (Niacinamide), ' +
      'Maltodextrin, Vitamin B5 (D-Calcium Pantothenate), Vitamin K1 (Phytonadione), Vitamin D3 (Cholecalciferol), ' +
      'Folic Acid, Vitamin B1 (Thiamin Mononitrate), Vitamin B6 (Pyridoxine Hydrochloride), ' +
      'Vitamin B2 (Riboflavin), Vitamin B12 (Cyanocobalamin))',
  },
  {
    id: 'protein-cereal',
    name: 'Protein Cereal — Chocolate',
    brand: 'Nutrient Survival',
    upc: '818491021332',
    shield: 'prequal',
    updated: 'Jul 21, 2026',
    edited: 'Jul 14, 2026',
    thumbIcon: 'grain',
    img: '../assets/verification/ns-protein-cereal-chocolate.png',
    selected: false,
    ingredients:
      'Whole Grain Oat Flour, Pea Protein, Cocoa (Processed with Alkali), Chicory Root Fiber, Cane Sugar, ' +
      'Sea Salt, Nutrient Survival Vitamin & Mineral Blend (Calcium Lactate, Vitamin C (Ascorbic Acid), ' +
      'Vitamin A (Retinyl Palmitate), Vitamin B3 (Niacinamide), Vitamin D3 (Cholecalciferol), ' +
      'Vitamin B12 (Cyanocobalamin)).',
  },
  {
    id: 'butter',
    name: 'Powdered Vitamin Butter',
    brand: 'Nutrient Survival',
    upc: '818491021097',
    shield: 'attest',
    updated: 'Jul 12, 2026',
    edited: 'Jul 05, 2026',
    thumbIcon: 'blender',
    img: '../assets/verification/ns-powdered-vitamin-butter.png',
    selected: false,
    ingredients:
      'Sweet Cream (Milk), Nonfat Milk, Sea Salt, Sunflower Lecithin, ' +
      'Nutrient Survival Vitamin Blend (Vitamin A (Retinyl Palmitate), Vitamin E (DL Alpha-Tocopheryl Acetate), ' +
      'Vitamin D3 (Cholecalciferol)).',
  },
  {
    id: 'scramble',
    name: 'Homestyle Scramble — Protein Meal',
    brand: 'Nutrient Survival',
    upc: '818491021554',
    shield: 'attest',
    updated: 'Jul 15, 2026',
    edited: 'Jul 09, 2026',
    thumbIcon: 'egg_alt',
    img: '../assets/verification/ns-homestyle-scramble.png',
    selected: false,
    ingredients:
      'Whole Eggs, Egg Whites, Freeze-Dried Sausage Crumbles (Pork, Sea Salt, Spices), Nonfat Milk, ' +
      'Cheddar Cheese (Cultured Milk, Salt, Enzymes), Sea Salt, Nutrient Survival Vitamin & Mineral Blend ' +
      '(Calcium Lactate, Vitamin C (Ascorbic Acid), Vitamin A (Retinyl Palmitate), Vitamin B12 (Cyanocobalamin)).',
  },
  {
    id: 'triple-cheese-mac',
    name: 'Triple Cheese Mac — Protein Meal',
    brand: 'Nutrient Survival',
    upc: '818491021561',
    shield: 'attest',
    updated: 'Jul 08, 2026',
    edited: 'Jul 01, 2026',
    thumbIcon: 'ramen_dining',
    img: '../assets/verification/ns-triple-cheese-mac.png',
    selected: false,
    ingredients:
      'Enriched Macaroni (Semolina, Niacin, Ferrous Sulfate, Thiamin Mononitrate, Riboflavin, Folic Acid), ' +
      'Cheddar Cheese (Cultured Milk, Salt, Enzymes), Nonfat Milk, Whey, Sea Salt, ' +
      'Nutrient Survival Vitamin & Mineral Blend (Calcium Lactate, Vitamin C (Ascorbic Acid), ' +
      'Vitamin A (Retinyl Palmitate), Vitamin B12 (Cyanocobalamin)).',
  },
  {
    id: 'mixed-veg',
    name: 'Freeze-Dried Mixed Vegetables',
    brand: 'Nutrient Survival',
    upc: '818491021905',
    shield: 'ineligible',
    updated: 'Jun 12, 2026',
    edited: 'Jun 05, 2026',
    thumbIcon: 'eco',
    img: '../assets/verification/ns-freeze-dried-mixed-vegetables.png',
    selected: false,
    ingredients:
      'Freeze-Dried Vegetables (Carrots, Green Peas, Sweet Corn, Green Beans), Modified Food Starch, ' +
      'Maltodextrin, Natural Flavor, Autolyzed Yeast Extract, Disodium Inosinate.',
  },
];

/* Same catalog as the Product Portfolio brand chip — Nutrient Survival is
   first because this flow's foods belong to it. Rows start unchecked; the
   Continue CTA stays on regardless. */
const BRANDS = [
  { name: 'Nutrient Survival', color: '#3D6B4F', avatar: '../assets/marketing/logos/nutrient-survival.png' },
  { name: 'Flax4Life', color: '#2E7D5B', avatar: null, claimed: 5, discovered: 47 },
  { name: 'Simple Truth', color: '#4E7D5A', avatar: '../assets/compare/simpletruth.png', claimed: 10, discovered: 10 },
  { name: 'Purely Elizabeth', color: '#C9736B', avatar: '../assets/compare/sug_purely.jpg', claimed: 10, discovered: 10 },
  { name: 'Siete', color: '#C0392B', avatar: '../assets/compare/sug_siete.jpg', claimed: 10, discovered: 10 },
  { name: 'KIND', color: '#E0A100', avatar: '../assets/compare/kind.jpg', claimed: 10, discovered: 10 },
];

const STEPS = [
  { id: 'select', label: 'Select Foods', sub: 'Confirm items for verification', icon: 'insights' },
  { id: 'attest', label: 'Attest', sub: 'Review and sign off', icon: 'fact_check' },
  { id: 'payment', label: 'Payment', sub: 'Finalize and secure assets', icon: 'verified_user' },
];

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

const state = {
  step: 'select',
  attested: false,
  vsa: false,
  paid: false,
  payMethod: 'card',
  search: '',
  brand: 'Nutrient Survival',
  shieldFilter: 'all',
  expanded: new Set(['milk', 'scramble']),
  discount: 0,
  dateLead: 'updated',
};

function dc() { return window.WiseDateCol; }
function dateHeaderHtml() {
  const D = dc();
  const inner = D ? D.headerHtml({ kinds: 'product', lead: state.dateLead }) : 'Updated';
  return `<span class="pf-th pf-col-updated w-date-th">${inner}</span>`;
}
function datesOf(f) {
  const D = dc();
  const partial = { updated: f.updated, edited: f.edited };
  return D ? D.complete(partial, 'product') : partial;
}

const stepIndex = (id) => STEPS.findIndex((s) => s.id === id);
const brandFoods = () => FOODS.filter((f) => f.brand === state.brand);
const selectedFoods = () => FOODS.filter((f) => f.selected);
const selectedCount = () => selectedFoods().length;
const countShield = (s) => brandFoods().filter((f) => f.shield === s).length;
const currentBrand = () => BRANDS.find((b) => b.name === state.brand) || BRANDS[0];
const subtotal = () => selectedCount() * PRICE_PER_ITEM;
const total = () => Math.max(0, subtotal() - (Number(state.discount) || 0));

function matchesSearch(f) {
  const q = state.search.trim().toLowerCase();
  if (!q) return true;
  return f.name.toLowerCase().includes(q) || f.upc.includes(q);
}

function matchesShield(f) {
  const k = state.shieldFilter;
  if (!k || k === 'all') return true;
  return f.shield === k;
}

function matchesBrand(f) {
  return f.brand === state.brand;
}

function visibleFoods(list) {
  return list.filter((f) => matchesBrand(f) && matchesSearch(f) && matchesShield(f));
}

/* ------------------------------------------------------------------ */
/* Markup — shared chrome                                              */
/* ------------------------------------------------------------------ */

/* ---------- Right-hand progress module ----------
   A separate pane docked to the right of the flow (mirrors the account-creation
   "Account setup" pane: sp-/vs-step in wise.css). It replaces the old inline
   horizontal stepper so progress lives beside the flow, not on top of it. */

/* Whether each macro step counts as complete, in flow order. */
function stepDone(id) {
  if (id === 'select') return selectedCount() > 0 && stepIndex(state.step) > 0;
  if (id === 'attest') return state.attested && stepIndex(state.step) > 1;
  if (id === 'payment') return state.paid;
  return false;
}

/* Per-step field rows shown under a done/active step (label + value). */
function stepFields(id) {
  if (id === 'select') {
    return [{ label: 'Foods selected', val: `${selectedCount()} of ${FOODS.length}`, done: selectedCount() > 0 }];
  }
  if (id === 'attest') {
    return [
      { label: 'Items reviewed', val: `${selectedCount()}`, done: selectedCount() > 0 },
      { label: 'Attestation', val: state.attested ? 'Signed' : 'Pending', done: state.attested },
    ];
  }
  const methodLabel = { card: 'Credit card', invoice: 'Invoice', ach: 'ACH' }[state.payMethod] || 'Credit card';
  return [
    { label: 'Payment method', val: methodLabel, done: true },
    { label: 'Agreement (VSA)', val: state.vsa ? 'Accepted' : 'Pending', done: state.vsa },
    { label: 'Total', val: money(total()), done: state.paid },
  ];
}

/* Progress modules default to the minimal (collapsed) view: a compact
   percentage ring in the header replaces the health bar, and the steps show
   their numbers + field results. Toggled via the header minimize button. */
let progressMin = true;

function progressPaneHTML() {
  const active = stepIndex(state.step);
  const completed = STEPS.filter((s) => stepDone(s.id)).length;
  const pct = Math.round((completed / STEPS.length) * 100);

  const stepsHtml = STEPS.map((s, i) => {
    const done = stepDone(s.id);
    const isActive = i === active;
    const cls = done ? 'vfp-step--done' : isActive ? 'vfp-step--active' : '';
    const num = done ? '<span class="material-symbols-outlined">check</span>' : String(i + 1);
    let sub = '';
    if (done) sub = 'Completed';
    else if (isActive) sub = 'In progress';
    const nodeAttrs = done ? `role="button" tabindex="0" data-goto="${s.id}" aria-label="Back to ${esc(s.label)}"` : '';

    let fieldsHtml = '';
    if (done || isActive) {
      const rows = stepFields(s.id).map((f) => {
        const icon = f.done ? 'check' : 'radio_button_unchecked';
        const st = f.done ? 'vfp-field--done' : 'vfp-field--active';
        return `<div class="vfp-field ${st}"><span class="material-symbols-outlined">${icon}</span><span class="vfp-field-label">${esc(f.label)}</span><span class="vfp-field-val">${esc(f.val)}</span></div>`;
      }).join('');
      fieldsHtml = `<div class="vfp-fields">${rows}</div>`;
    }

    return `
      <div class="vfp-step ${cls}">
        <div class="vfp-step-track"><div class="vfp-step-num" ${nodeAttrs}>${num}</div><div class="vfp-step-line"></div></div>
        <div class="vfp-step-body">
          <div class="vfp-step-title">${esc(s.label)}</div>
          ${sub ? `<div class="vfp-step-sub">${esc(sub)}</div>` : ''}
          ${fieldsHtml}
        </div>
      </div>`;
  }).join('');

  /* On the Payment step the selected foods become billable line items, so they
     live inside this progress module (not a separate card) — each with its
     per-SKU cost, above the running total in the footer. */
  const itemsHtml = state.step === 'payment' && selectedCount()
    ? `
      <div class="vfp-items">
        <div class="vfp-items-head">
          <span class="vfp-items-title">Foods submitting for verification</span>
          <span class="vfp-items-count">${selectedCount()} ready</span>
        </div>
        ${selectedFoods().map((f) => `
          <div class="vfp-item">
            ${thumb(f)}
            <span class="vfp-item-text"><span class="vfp-item-name">${esc(f.name)}</span><span class="vfp-item-brand">${esc(f.brand)}</span></span>
            <span class="vfp-item-cost">${money(PRICE_PER_ITEM)}</span>
          </div>`).join('')}
      </div>`
    : '';

  return `
    <div class="vfp-inner ${progressMin ? 'is-min' : ''}">
      <div class="vfp-header">
        <div class="vfp-pct-ring" style="--pct:${pct}"><span>${pct}%</span></div>
        <div class="vfp-header-text">
          <div class="vfp-title">Verification progress</div>
          <div class="vfp-subtitle">Non-UPF · ${STEPS.length} steps</div>
        </div>
        <button type="button" class="vfp-min-btn" data-vf="togglemin" aria-label="${progressMin ? 'Expand progress' : 'Collapse progress'}" title="${progressMin ? 'Expand' : 'Collapse'}"><span class="material-symbols-outlined">${progressMin ? 'chevron_left' : 'chevron_right'}</span></button>
      </div>
      <div class="vfp-progress">
        <div class="vfp-progress-head"><span>${completed} of ${STEPS.length} steps</span><span class="vfp-progress-pct">${pct}%</span></div>
        <div class="vfp-progress-track"><div class="vfp-progress-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="vfp-steps">${stepsHtml}</div>
      ${itemsHtml}
      <div class="vfp-foot">
        <div class="vfp-foot-row"><span>Foods selected</span><span>${selectedCount()}</span></div>
        <div class="vfp-foot-row vfp-foot-total"><span>Estimated total</span><span class="vfp-foot-amt">${money(total())}</span></div>
      </div>
    </div>`;
}

function headCtaHTML() {
  if (state.step === 'select') {
    /* On by default — selection is independent of whether the CTA is enabled. */
    return `<button class="vf-cta" type="button" data-vf="open-confirm">
      Continue to Review &amp; Attest <span class="material-symbols-outlined">arrow_forward</span></button>`;
  }
  if (state.step === 'attest') {
    return `<button class="vf-cta" type="button" data-vf="to-payment" ${state.attested ? '' : 'disabled'}>
      Next <span class="material-symbols-outlined">arrow_forward</span></button>`;
  }
  return '';
}

function brandAvatarHTML(b, cls) {
  const letter = esc(b.name.charAt(0));
  const bg = `style="background:${esc(b.color || 'var(--primary)')}"`;
  if (b.avatar) {
    return `<span class="${cls}" ${bg}><img src="${esc(b.avatar)}" alt="" onerror="this.parentNode.textContent='${letter}'"></span>`;
  }
  return `<span class="${cls}" ${bg}>${letter}</span>`;
}

function brandOptMeta(b) {
  if (b.claimed != null && b.discovered != null) {
    return `${b.claimed} claimed · ${b.discovered} discovered`;
  }
  const n = FOODS.filter((f) => f.brand === b.name).length;
  return n ? `${n} to verify` : 'No foods in this flow';
}

function brandChipHTML() {
  const b = currentBrand();
  const opts = BRANDS.map((brand) => {
    const on = brand.name === b.name;
    return `<button type="button" class="pf-brand-opt${on ? ' is-active' : ''}" role="option"` +
      ` data-vf="select-brand" data-brand="${esc(brand.name)}" data-name="${esc(brand.name.toLowerCase())}"` +
      ` aria-selected="${on ? 'true' : 'false'}">` +
      `${brandAvatarHTML(brand, 'pf-brand-opt-avatar')}` +
      `<span class="pf-brand-opt-text"><span class="pf-brand-opt-name">${esc(brand.name)}</span>` +
      `<span class="pf-brand-opt-meta">${esc(brandOptMeta(brand))}</span></span>` +
      `<span class="material-symbols-outlined pf-brand-opt-check" aria-hidden="true">check</span></button>`;
  }).join('');
  return `
    <div class="pf-brand" id="vf-brand">
      <button type="button" class="pf-brand-chip" id="vf-brand-chip" aria-haspopup="listbox"
        aria-expanded="false" aria-controls="vf-brand-opts" data-vf="toggle-brand">
        ${brandAvatarHTML(b, 'pf-brand-avatar')}
        <span class="pf-brand-name" id="vf-brand-name">${esc(b.name)}</span>
        <span class="material-symbols-outlined pf-brand-caret" aria-hidden="true">expand_more</span>
      </button>
      <div class="pf-brand-menu" id="vf-brand-menu" hidden>
        <div class="pf-brand-search">
          <span class="material-symbols-outlined" aria-hidden="true">search</span>
          <input type="search" id="vf-brand-search" data-vf="brand-search" placeholder="Search brands…" aria-label="Search brands" autocomplete="off" />
        </div>
        <div class="pf-brand-opts" id="vf-brand-opts" role="listbox" aria-label="Select a brand">${opts}</div>
        <div class="pf-brand-empty" id="vf-brand-empty" hidden>No brands match</div>
      </div>
    </div>`;
}

function headerHTML() {
  const idx = stepIndex(state.step);
  const back = idx > 0
    ? `<button class="vf-back" type="button" data-vf="go-back" aria-label="Back to ${esc(STEPS[idx - 1].label)}" title="Back to ${esc(STEPS[idx - 1].label)}"><span class="material-symbols-outlined">arrow_back</span></button>`
    : '';
  const cta = headCtaHTML();
  return `
    <header class="vf-head">
      ${back}
      <h1 class="vf-head-title">Non-UPF Verification</h1>
      <div class="vf-head-actions">${cta}${brandChipHTML()}</div>
    </header>`;
}

/* Search bar — a clean search pill that fills the row. The step CTA lives
   inline with the headline, not here. The search input keeps id/vf hooks so
   focus + filtering survive. */
function toolbarHTML() {
  return `
    <div class="vf-toolbar">
      <div class="vf-search-inline">
        <span class="material-symbols-outlined">search</span>
        <input id="vf-search" class="vf-search" type="text" placeholder="Search by product name or UPC" value="${esc(state.search)}" data-vf="search" autocomplete="off" aria-label="Search foods" />
      </div>
    </div>`;
}

/* Scorecards sit above the table card, never inside it — same rule as Product
   Portfolio. Light-blue tiles are click-to-filter (no eyebrow). One tile per
   Non-UPF Shield chip plus an "All foods" total; clicking the active tile
   clears back to all. */
function glanceHTML() {
  const active = state.shieldFilter || 'all';
  const tile = (key, num, cap, mod) => {
    const on = active === key;
    return `<button type="button" class="vf-stat${mod ? ' ' + mod : ''}${on ? ' is-active' : ''}"` +
      ` data-vf="filter-shield" data-shield="${esc(key)}"` +
      ` aria-pressed="${on ? 'true' : 'false'}"` +
      ` aria-label="Show ${esc(cap)}">` +
      `<span class="vf-stat-num">${esc(num)}</span>` +
      `<span class="vf-stat-label">${esc(cap)}</span>` +
      `</button>`;
  };
  return `
    <div class="vf-glance">
      <div class="vf-stats" role="group" aria-label="Filter foods by Non-UPF Shield status">
        ${tile('all', String(brandFoods().length), 'All foods')}
        ${tile('prequal', String(countShield('prequal')), 'Pre-qualified', 'vf-stat--warn')}
        ${tile('attest', String(countShield('attest')), 'Pending attestation', 'vf-stat--info')}
        ${tile('ineligible', String(countShield('ineligible')), 'Ineligible', 'vf-stat--muted')}
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Markup — table rows                                                 */
/* ------------------------------------------------------------------ */

/* Non-UPF Shield chip — mirrors the product-portfolio `pf-chip` shield
   lifecycle so the verification table speaks the same visual language as the
   rest of the app: pre-qualified → amber, pending attestation → teal,
   verified → blue, ineligible → muted. Static per food, like the ledger. */
const SHIELD_META = {
  prequal:    { cls: 'vf-chip--prequal',  icon: 'schedule',   label: 'Pre-Qualified' },
  attest:     { cls: 'vf-chip--attest',   icon: 'fact_check', label: 'Pending Attestation' },
  verified:   { cls: 'vf-chip--verified', icon: 'gpp_good',   label: 'Verified' },
  ineligible: { cls: 'vf-chip--inelig',   icon: 'block',      label: 'Ineligible' },
};
function statusPill(f) {
  const m = SHIELD_META[f.shield] || SHIELD_META.prequal;
  return `<span class="vf-chip ${m.cls}"><span class="material-symbols-outlined">${m.icon}</span>${esc(m.label)}</span>`;
}

/* Dates cell — stacked primary + pair, matching Product Portfolio. */
function datesCell(f) {
  const D = dc();
  const html = D ? D.cellHtml(datesOf(f), 'product', state.dateLead) : `${esc(f.updated)}`;
  return `<div class="vf-dates w-datecell">${html}</div>`;
}

/* Shared table product photo (the real pack shot), with the themed
   material icon kept only as a graceful fallback if the image can't load —
   same `.pf-thumb` used by Product Portfolio. */
function thumb(f) {
  return `<span class="pf-thumb">` +
    `<img class="pf-thumb-img" src="${esc(f.img)}" alt="${esc(f.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'">` +
    `<span class="material-symbols-outlined" style="display:none">${esc(f.thumbIcon)}</span></span>`;
}

/* Product cell — thumbnail + a name / UPC stack (UPC sits directly under the
   name). Same markup as Product Portfolio `.pf-col-product`. `extra` lets
   the attest step slot an expand toggle before the name. */
function productCell(f, extra) {
  return `<span class="pf-td pf-col-product">${thumb(f)}` +
    `<span class="pf-pcell-text"><span class="pf-pname-row">${extra || ''}<span class="pf-pname">${esc(f.name)}</span></span>` +
    `<span class="pf-upc">UPC · ${esc(f.upc)}</span></span></span>`;
}

/* Pre-qualified and pending-attestation rows can enter Review & Attest;
   ineligible foods cannot. */
function canReview(f) {
  return f.shield === 'prequal' || f.shield === 'attest';
}

function productHref(f, edit) {
  const params = new URLSearchParams();
  params.set('name', f.name);
  params.set('upc', f.upc);
  if (f.img) params.set('img', f.img);
  params.set('from', 'verification');
  if (edit) params.set('mode', 'edit');
  return `view-product.html?${params.toString()}`;
}

/* Per-row ⋮ — same shell as Product Portfolio. View / Edit open the product
   page; Review & Attest (eligible rows only) starts this flow for that SKU. */
function rowMenuHtml(f) {
  const review = canReview(f)
    ? `<button type="button" class="pf-rowmenu-item" role="menuitem" data-vf="review-one" data-food="${esc(f.id)}"><span class="material-symbols-outlined">fact_check</span>Review &amp; Attest</button>`
    : '';
  return `<span class="pf-td pf-col-menu"><div class="pf-rowmenu">` +
    `<button type="button" class="pf-rowmenu-btn" aria-haspopup="true" aria-expanded="false" aria-label="Actions for ${esc(f.name)}"><span class="material-symbols-outlined">more_vert</span></button>` +
    `<div class="pf-rowmenu-pop" role="menu" hidden>` +
    review +
    `<a class="pf-rowmenu-item" role="menuitem" href="${esc(productHref(f))}"><span class="material-symbols-outlined">visibility</span>View</a>` +
    `<a class="pf-rowmenu-item" role="menuitem" href="${esc(productHref(f, true))}"><span class="material-symbols-outlined">edit</span>Edit</a>` +
    `<div class="pf-rowmenu-sep"></div>` +
    `<div class="pf-rowmenu-info"><span class="material-symbols-outlined">update</span>Updated · ${esc(f.updated)}</div>` +
    `<div class="pf-rowmenu-info"><span class="material-symbols-outlined">edit_calendar</span>Last edited · ${esc(f.edited)}</div>` +
    `</div></div></span>`;
}

function rowActionHtml(f) {
  if (!canReview(f)) return `<span class="pf-td pf-col-action"></span>`;
  return `<span class="pf-td pf-col-action"><button type="button" class="pf-claim-btn" data-vf="review-one" data-food="${esc(f.id)}">Review &amp; Attest</button></span>`;
}

/* ------------------------------------------------------------------ */
/* Step 1 — Select Foods                                               */
/* ------------------------------------------------------------------ */

function selectStepHTML() {
  const rows = visibleFoods(FOODS);
  const reviewable = brandFoods().filter(canReview);
  const allSel = reviewable.length > 0 && reviewable.every((f) => f.selected);
  const noneSel = reviewable.every((f) => !f.selected);
  const headState = allSel ? 'check_box' : noneSel ? 'check_box_outline_blank' : 'indeterminate_check_box';
  return `
    ${toolbarHTML()}
    ${glanceHTML()}
    <div class="vf-board">
      <div class="pf-table pf-table--verify">
        <div class="pf-thead">
          <span class="pf-th pf-col-check">
            <button class="vf-check vf-check--head" type="button" data-vf="toggle-all" aria-label="Select all foods">
              <span class="material-symbols-outlined">${headState}</span>
            </button>
          </span>
          <span class="pf-th pf-col-menu"></span>
          <span class="pf-th pf-col-action"></span>
          <span class="pf-th pf-col-product">Product</span>
          <span class="pf-th">Non-UPF Shield</span>
          ${dateHeaderHtml()}
        </div>
          ${rows.map((f) => `
            <div class="pf-trow ${f.selected ? 'is-selected' : ''}" data-food="${f.id}">
              <span class="pf-td pf-col-check">
                <button class="vf-check" type="button" data-vf="toggle-food" data-food="${f.id}" aria-label="Select ${esc(f.name)}" aria-pressed="${f.selected}">
                  <span class="material-symbols-outlined">${f.selected ? 'check_box' : 'check_box_outline_blank'}</span>
                </button>
              </span>
              ${rowMenuHtml(f)}
              ${rowActionHtml(f)}
              ${productCell(f)}
              <span class="pf-td">${statusPill(f)}</span>
              <span class="pf-td">${datesCell(f)}</span>
            </div>`).join('')}
          ${rows.length ? '' : '<div class="pf-trow"><span class="pf-td pf-empty">No foods match.</span></div>'}
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Step 2 — Attest                                                     */
/* ------------------------------------------------------------------ */

function attestStepHTML() {
  const rows = visibleFoods(selectedFoods());
  return `
    ${toolbarHTML()}
    ${glanceHTML()}
    <div class="vf-board">
      <div class="pf-table pf-table--verify-attest">
        <div class="pf-thead">
          <span class="pf-th pf-col-check"><span class="material-symbols-outlined vf-head-glyph">check_box</span></span>
          <span class="pf-th pf-col-menu"></span>
          <span class="pf-th"></span>
          <span class="pf-th pf-col-product">Product</span>
          <span class="pf-th">Non-UPF Shield</span>
          ${dateHeaderHtml()}
        </div>
          ${rows.map((f) => {
            const open = state.expanded.has(f.id);
            const expandBtn = `<button class="vf-expand ${open ? 'is-open' : ''}" type="button" data-vf="toggle-expand" data-food="${f.id}" aria-label="Toggle ingredients" aria-expanded="${open}"><span class="material-symbols-outlined">expand_more</span></button>`;
            return `
            <div class="pf-trow is-selected" data-food="${f.id}">
              <span class="pf-td pf-col-check">
                <button class="vf-check" type="button" data-vf="toggle-food" data-food="${f.id}" aria-label="Deselect ${esc(f.name)}" aria-pressed="true">
                  <span class="material-symbols-outlined">check_box</span>
                </button>
              </span>
              ${rowMenuHtml(f)}
              <span class="pf-td">${expandBtn}</span>
              ${productCell(f)}
              <span class="pf-td">${statusPill(f)}</span>
              <span class="pf-td">${datesCell(f)}</span>
            </div>
            <div class="pf-trow--detail ${open ? 'is-open' : ''}" data-detail="${f.id}">
              <div class="vf-detail">
                <div class="vf-detail-label">Ingredients</div>
                <p class="vf-detail-text">${esc(f.ingredients)}</p>
              </div>
            </div>`;
          }).join('')}
          ${rows.length ? '' : '<div class="pf-trow"><span class="pf-td pf-empty">No selected foods match.</span></div>'}
      </div>
    </div>

    <label class="vf-attest vf-attest--sticky ${state.attested ? 'is-checked' : ''}">
      <button class="vf-check vf-check--attest" type="button" data-vf="toggle-attest" role="checkbox" aria-checked="${state.attested}">
        <span class="material-symbols-outlined">${state.attested ? 'check_box' : 'check_box_outline_blank'}</span>
      </button>
      <span class="vf-attest-text">I attest to the accuracy of the data for the above selected foods and that it matches the physical product packaging and the actual formulation of each SKU.</span>
    </label>`;
}

/* ------------------------------------------------------------------ */
/* Step 3 — Payment                                                    */
/* ------------------------------------------------------------------ */

function paymentStepHTML() {
  const methods = [
    { id: 'card', label: 'Credit Card', icon: 'credit_card', enabled: true },
    { id: 'invoice', label: 'Request Invoice', icon: 'request_quote', enabled: true },
    { id: 'ach', label: 'ACH Banking', icon: 'account_balance', enabled: false },
  ];
  return `
    <div class="vf-pay-grid">
      <section class="vf-pay-form">
        <h2 class="vf-pay-title">Payment Information</h2>
        <p class="vf-pay-desc">Complete your payment to finalize the verification process. Once confirmed, you will receive your official certification and be granted access to your brand asset pack.</p>

        <label class="vf-field-label">Billing Plan</label>
        <div class="vf-select">
          <select class="vf-select-el">
            <option>Non-UPF Verification – Expo West Price: $99.00/year - Yearly</option>
            <option>Non-UPF Verification – Standard: $149.00/year - Yearly</option>
          </select>
          <span class="material-symbols-outlined vf-select-chevron">expand_more</span>
        </div>

        <label class="vf-field-label">Payment Method</label>
        <div class="vf-methods">
          ${methods.map((m) => `
            <button type="button" class="vf-method ${state.payMethod === m.id ? 'is-active' : ''} ${m.enabled ? '' : 'is-disabled'}"
              data-vf="pay-method" data-method="${m.id}" ${m.enabled ? '' : 'disabled'}>
              <span class="material-symbols-outlined">${m.enabled ? m.icon : 'lock'}</span>${esc(m.label)}
            </button>`).join('')}
        </div>

        ${state.payMethod === 'card' ? `
        <label class="vf-field-label">Card Details</label>
        <div class="vf-card-input">
          <span class="material-symbols-outlined vf-card-glyph">credit_card</span>
          <input class="vf-input" type="text" inputmode="numeric" placeholder="Card number" aria-label="Card number" />
        </div>
        <div class="vf-note">
          <span class="material-symbols-outlined">info</span>
          <div><strong>Immediate Payment</strong><br>Your card will be charged immediately upon submission. Your verification process will begin right away.</div>
        </div>` : ''}

        ${state.payMethod === 'invoice' ? `
        <div class="vf-note">
          <span class="material-symbols-outlined">receipt_long</span>
          <div><strong>Request an Invoice</strong><br>We'll email a net-30 invoice for this verification. Your assets unlock once payment clears.</div>
        </div>` : ''}

        <label class="vf-field-label">Coupon Code (Optional)</label>
        <div class="vf-coupon">
          <input class="vf-input" type="text" placeholder="Enter coupon code" aria-label="Coupon code" />
          <button type="button" class="vf-apply" data-vf="apply-coupon">Apply</button>
        </div>

        <div class="vf-admin">
          <div class="vf-admin-head"><span class="material-symbols-outlined">sell</span>Admin Discount (Internal Use Only)</div>
          <div class="vf-admin-grid">
            <label class="vf-admin-field">
              <span>Discount Amount ($)</span>
              <input class="vf-input" type="number" min="0" value="${esc(String(state.discount))}" data-vf="discount" aria-label="Discount amount" />
            </label>
            <label class="vf-admin-field">
              <span>Reason (Required if discount &gt; 0)</span>
              <input class="vf-input" type="text" placeholder="e.g., Loyal customer, Promotion" aria-label="Discount reason" />
            </label>
          </div>
        </div>

        <label class="vf-attest ${state.vsa ? 'is-checked' : ''}">
          <button class="vf-check vf-check--attest" type="button" data-vf="toggle-vsa" role="checkbox" aria-checked="${state.vsa}">
            <span class="material-symbols-outlined">${state.vsa ? 'check_box' : 'check_box_outline_blank'}</span>
          </button>
          <span class="vf-attest-text">I have read and agree to the <a href="#" data-vf="noop">Verification Service Agreement (VSA)</a>, the legally binding terms for this verification.</span>
        </label>

        <button class="vf-pay-btn" type="button" data-vf="process-payment" ${state.vsa ? '' : 'disabled'}>
          <span class="material-symbols-outlined">verified_user</span> Get my shield &amp; Process Payment
        </button>
        <div class="vf-secure"><span class="material-symbols-outlined">lock</span> Your payment information is secure and encrypted</div>
      </section>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Confirmation modal                                                  */
/* ------------------------------------------------------------------ */

function modalHTML() {
  const n = selectedCount();
  return `
    <div class="vf-modal-overlay">
      <div class="vf-modal" role="dialog" aria-modal="true" aria-labelledby="vf-modal-title">
        <button class="vf-modal-x" type="button" data-vf="close-confirm" aria-label="Close"><span class="material-symbols-outlined">close</span></button>
        <h2 class="vf-modal-title" id="vf-modal-title">Proceed to Attestation?</h2>
        <p class="vf-modal-text">You are about to proceed to the <strong>Review &amp; Attest</strong> step with <strong>${n} selected food${n === 1 ? '' : 's'}</strong>. This is a critical stage where you will review and formally attest to the accuracy of your selected food items.</p>
        <div class="vf-modal-callout">
          <strong>Important:</strong> Once you complete the attestation, you will be making a formal declaration about the NON-UPF status of these products.
        </div>
        <div class="vf-modal-actions">
          <button class="vf-modal-btn vf-modal-btn--ghost" type="button" data-vf="close-confirm">Cancel</button>
          <button class="vf-modal-btn vf-modal-btn--primary" type="button" data-vf="confirm-attest">Yes, Continue</button>
        </div>
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Render + wiring                                                     */
/* ------------------------------------------------------------------ */

let rootEl = null;
let progressEl = null;

function bodyHTML() {
  if (state.step === 'select') return selectStepHTML();
  if (state.step === 'attest') return attestStepHTML();
  return paymentStepHTML();
}

/* When minimized the pane becomes a fixed slim icon rail (the .vfp-inner.is-min
   CSS collapses it to 64px). But pane-resize.js pins an inline width on every
   resizable module — with a 300px floor — which would out-specify that rail width
   and leave the content minimized inside a still-full-width column. So while the
   rail is showing we (a) tag the pane data-pr-lock so pane-resize stands down
   (mirrors the History module's rail lock) and (b) drop any inline width it may
   have pinned, letting the CSS rail width win. */
function applyProgressRailLock(show) {
  if (!progressEl) return;
  if (show && progressMin) {
    progressEl.setAttribute('data-pr-lock', '');
    progressEl.style.removeProperty('flex');
    progressEl.style.removeProperty('width');
    progressEl.style.removeProperty('max-width');
  } else {
    progressEl.removeAttribute('data-pr-lock');
  }
}

function renderProgress() {
  if (!progressEl) return;
  /* The progress module only appears once the user has started a selection;
     with nothing checked there's no progress to show. */
  const show = selectedCount() > 0;
  progressEl.hidden = !show;
  progressEl.setAttribute('aria-hidden', show ? 'false' : 'true');
  if (show) progressEl.innerHTML = progressPaneHTML();
  else progressEl.innerHTML = '';
  applyProgressRailLock(show);
}

function popOfRowMenu(menu) {
  if (!menu) return null;
  const inner = menu.querySelector('.pf-rowmenu-pop');
  if (inner) return inner;
  return Array.from(document.querySelectorAll('.pf-rowmenu-pop')).find((p) => p.__plHost === menu) || null;
}

function closeRowMenus(keep) {
  if (!rootEl) return;
  rootEl.querySelectorAll('.pf-rowmenu.is-open').forEach((menu) => {
    if (menu === keep) return;
    menu.classList.remove('is-open');
    const btn = menu.querySelector('.pf-rowmenu-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    const pop = popOfRowMenu(menu);
    if (pop) pop.hidden = true;
  });
  document.querySelectorAll('body > .pf-rowmenu-pop').forEach((pop) => {
    const host = pop.__plHost;
    if (keep && host === keep) return;
    if (host && host.isConnected && rootEl.contains(host) && host.classList.contains('is-open')) return;
    pop.hidden = true;
    if (!host || !host.isConnected) pop.remove();
  });
}

function brandMenuEl() {
  return document.getElementById('vf-brand-menu')
    || Array.from(document.querySelectorAll('.pf-brand-menu')).find((m) => m.__plHost?.id === 'vf-brand')
    || null;
}

function filterBrandMenu(query) {
  const q = String(query || '').trim().toLowerCase();
  const list = document.getElementById('vf-brand-opts')
    || brandMenuEl()?.querySelector('.pf-brand-opts');
  if (!list) return;
  let shown = 0;
  list.querySelectorAll('.pf-brand-opt').forEach((o) => {
    const match = !q || (o.getAttribute('data-name') || '').indexOf(q) !== -1;
    o.hidden = !match;
    if (match) shown++;
  });
  const empty = document.getElementById('vf-brand-empty')
    || brandMenuEl()?.querySelector('.pf-brand-empty');
  if (empty) empty.hidden = shown > 0;
}

function resetBrandSearch() {
  const input = document.getElementById('vf-brand-search')
    || brandMenuEl()?.querySelector('#vf-brand-search');
  if (input) input.value = '';
  filterBrandMenu('');
}

function closeBrandMenu(discard) {
  const menu = brandMenuEl();
  const chip = document.getElementById('vf-brand-chip');
  if (chip) chip.setAttribute('aria-expanded', 'false');
  if (!menu) return;
  menu.setAttribute('hidden', '');
  resetBrandSearch();
  /* A full re-render wipes the wrap before popover-layer's observer can
     restore a portaled menu — drop the body copy so it cannot orphan. */
  if (discard && menu.parentElement === document.body) {
    if (menu.__plMarker && menu.__plMarker.parentNode) menu.__plMarker.parentNode.removeChild(menu.__plMarker);
    menu.remove();
  }
}

function toggleBrandMenu() {
  const menu = brandMenuEl();
  const chip = document.getElementById('vf-brand-chip');
  if (!menu) return;
  const open = menu.hasAttribute('hidden');
  if (open) {
    resetBrandSearch();
    menu.removeAttribute('hidden');
    const input = document.getElementById('vf-brand-search')
      || menu.querySelector('#vf-brand-search');
    if (input) setTimeout(() => input.focus(), 0);
  } else {
    menu.setAttribute('hidden', '');
    resetBrandSearch();
  }
  if (chip) chip.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function render(preserveFocus) {
  if (!rootEl) return;
  closeBrandMenu(true);
  closeRowMenus(null);
  const focusSearch = preserveFocus && document.activeElement?.id === 'vf-search';
  const caret = focusSearch ? document.activeElement.selectionStart : null;
  rootEl.innerHTML = `
    ${headerHTML()}
    <div class="vf-body vf-body--${state.step}">${bodyHTML()}</div>`;
  if (focusSearch) {
    const inp = document.getElementById('vf-search');
    if (inp) { inp.focus(); if (caret != null) inp.setSelectionRange(caret, caret); }
  }
  renderProgress();
}

function goStep(id) {
  if (!STEPS.some((s) => s.id === id)) return;
  state.step = id;
  render();
  rootEl?.closest('.agent-main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
}

function openModal() {
  if (document.getElementById('vf-modal-host')) return;
  const host = document.createElement('div');
  host.id = 'vf-modal-host';
  host.innerHTML = modalHTML();
  document.body.appendChild(host);
  requestAnimationFrame(() => host.querySelector('.vf-modal-overlay')?.classList.add('is-open'));
  document.addEventListener('keydown', modalEsc);
}

function closeModal() {
  const host = document.getElementById('vf-modal-host');
  if (!host) return;
  host.querySelector('.vf-modal-overlay')?.classList.remove('is-open');
  document.removeEventListener('keydown', modalEsc);
  setTimeout(() => host.remove(), 200);
}

function modalEsc(e) { if (e.key === 'Escape') closeModal(); }

function onAction(action, el) {
  switch (action) {
    case 'filter-shield': {
      const key = el.dataset.shield || 'all';
      state.shieldFilter = state.shieldFilter === key ? 'all' : key;
      render();
      break;
    }
    case 'toggle-all': {
      const reviewable = brandFoods().filter(canReview);
      const allSel = reviewable.length > 0 && reviewable.every((f) => f.selected);
      reviewable.forEach((f) => { f.selected = !allSel; });
      render();
      break;
    }
    case 'review-one': {
      const f = FOODS.find((x) => x.id === el.dataset.food);
      if (!f || !canReview(f)) break;
      f.selected = true;
      closeRowMenus(null);
      if (state.step === 'select') openModal();
      else render();
      break;
    }
    case 'toggle-food': {
      const f = FOODS.find((x) => x.id === el.dataset.food);
      if (f) f.selected = !f.selected;
      /* Deselecting the last item on Attest sends you back to Select. */
      if (state.step === 'attest' && selectedCount() === 0) { state.attested = false; goStep('select'); }
      else render();
      break;
    }
    case 'toggle-expand': {
      const id = el.dataset.food;
      if (state.expanded.has(id)) state.expanded.delete(id); else state.expanded.add(id);
      render();
      break;
    }
    case 'toggle-attest':
      state.attested = !state.attested;
      render();
      break;
    case 'toggle-vsa':
      state.vsa = !state.vsa;
      render();
      break;
    case 'pay-method':
      state.payMethod = el.dataset.method || 'card';
      render();
      break;
    case 'toggle-brand':
      toggleBrandMenu();
      break;
    case 'select-brand': {
      const name = el.dataset.brand;
      if (name && BRANDS.some((b) => b.name === name)) {
        if (state.brand !== name) {
          state.brand = name;
          state.search = '';
        }
        render();
      }
      break;
    }
    case 'open-confirm':
      if (selectedCount() > 0) openModal();
      else vfToast('Select at least one food to continue.', 'info');
      break;
    case 'close-confirm':
      closeModal();
      break;
    case 'confirm-attest':
      closeModal();
      goStep('attest');
      break;
    case 'to-payment':
      if (state.attested) goStep('payment');
      break;
    case 'go-back': {
      const i = stepIndex(state.step);
      if (i > 0) goStep(STEPS[i - 1].id);
      break;
    }
    case 'apply-coupon':
      vfToast('No valid coupon entered.', 'info');
      break;
    case 'process-payment':
      if (state.vsa) {
        state.paid = true;
        vfToast('Payment processed — your Non-UPF shields are being minted.', 'verified_user');
        render();
      }
      break;
    case 'noop':
      break;
    default:
      break;
  }
}

/* Create the right-hand progress pane inside #modules-row (once). It sits after
   #agent-main in the flex row; the left-docked WISEcodeAI chat keeps order:-1, so
   the row reads chat → flow → progress. */
function mountProgressPane() {
  const row = document.getElementById('modules-row');
  if (!row) return;
  progressEl = document.getElementById('vf-progress-pane');
  if (!progressEl) {
    progressEl = document.createElement('aside');
    progressEl.id = 'vf-progress-pane';
    progressEl.className = 'vf-progress-pane';
    progressEl.setAttribute('aria-label', 'Verification progress');
    const main = document.getElementById('agent-main');
    if (main && main.nextSibling) row.insertBefore(progressEl, main.nextSibling);
    else row.appendChild(progressEl);
  }
}

/**
 * Render the Non-UPF verification flow into a host element (#agent-main-scroll).
 * @param {HTMLElement} mainEl
 */
export function renderVerificationFlow(mainEl) {
  if (!mainEl) return;
  mainEl.innerHTML = '<div class="vf-root" data-w-date-root></div>';
  rootEl = mainEl.querySelector('.vf-root');
  if (dc() && !rootEl._wDateBound) {
    rootEl._wDateBound = true;
    dc().onLead(rootEl, (lead) => { state.dateLead = lead; render(); });
  }

  /* Progress module — a sibling pane docked to the RIGHT of the flow inside
     #modules-row (the WISEcodeAI chat docks to the left). Mirrors the account-
     creation setup pane. Created once; updated on every render(). */
  mountProgressPane();
  render();

  progressEl?.addEventListener('click', (e) => {
    const min = e.target.closest('[data-vf="togglemin"]');
    if (min) { progressMin = !progressMin; renderProgress(); return; }
    const goto = e.target.closest('[data-goto]');
    if (goto) goStep(goto.dataset.goto);
  });
  progressEl?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const goto = e.target.closest('[data-goto]');
    if (goto) { e.preventDefault(); goStep(goto.dataset.goto); }
  });

  rootEl.addEventListener('click', (e) => {
    const menuBtn = e.target.closest('.pf-rowmenu-btn');
    if (menuBtn && rootEl.contains(menuBtn)) {
      const menu = menuBtn.closest('.pf-rowmenu');
      const open = !menu.classList.contains('is-open');
      closeRowMenus(open ? menu : null);
      menu.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      const pop = popOfRowMenu(menu);
      if (pop) pop.hidden = !open;
      return;
    }
    const goto = e.target.closest('[data-goto]');
    if (goto) { goStep(goto.dataset.goto); return; }
    const el = e.target.closest('[data-vf]');
    if (!el) return;
    if (el.tagName === 'A') e.preventDefault();
    onAction(el.dataset.vf, el);
  });

  rootEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const goto = e.target.closest('[data-goto]');
    if (goto) { e.preventDefault(); goStep(goto.dataset.goto); }
  });

  rootEl.addEventListener('input', (e) => {
    const el = e.target.closest('[data-vf]');
    if (!el) return;
    if (el.dataset.vf === 'search') { state.search = el.value; render(true); }
    else if (el.dataset.vf === 'brand-search') { filterBrandMenu(el.value); }
    else if (el.dataset.vf === 'discount') { state.discount = Math.max(0, Number(el.value) || 0); render(); }
  });

  /* Modal host is appended to <body>, so its clicks are wired globally.
     Clicking the backdrop (the overlay itself) closes; clicks that land on an
     explicit [data-vf] control inside the dialog run their action. Clicks on
     inert dialog chrome do nothing. Portalled row menus also live on <body>. */
  document.addEventListener('click', (e) => {
    const overlay = e.target.closest('#vf-modal-host .vf-modal-overlay');
    if (overlay) {
      if (e.target === overlay) { closeModal(); return; }
      const el = e.target.closest('[data-vf]');
      if (el && overlay.contains(el)) onAction(el.dataset.vf, el);
      return;
    }
    const brandAct = e.target.closest && e.target.closest('.pf-brand-menu [data-vf]:not([data-vf="brand-search"])');
    if (brandAct && rootEl && !rootEl.contains(brandAct)) {
      onAction(brandAct.dataset.vf, brandAct);
      return;
    }
    const menuAct = e.target.closest && e.target.closest('.pf-rowmenu-pop [data-vf]');
    if (menuAct && rootEl && !rootEl.contains(menuAct)) {
      onAction(menuAct.dataset.vf, menuAct);
      return;
    }
    if (e.target.closest && (e.target.closest('.pf-rowmenu') || e.target.closest('.pf-rowmenu-pop'))) return;
    closeRowMenus(null);
    if (!(e.target instanceof Element) || !e.target.closest('#vf-brand, .pf-brand-menu')) closeBrandMenu();
  });
  document.addEventListener('input', (e) => {
    const el = e.target.closest && e.target.closest('[data-vf="brand-search"]');
    if (el) filterBrandMenu(el.value);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeBrandMenu();
  });
}

/* ------------------------------------------------------------------ */
/* WISEcodeAI dock configuration for the verification page                 */
/* ------------------------------------------------------------------ */

const plural = (n) => (n === 1 ? '' : 's');

export const VERIFICATION_WISEAI = {
  sub: 'Your Non-UPF verification assistant — I can run the whole flow for you.',
  /* Intent chips live ONLY on the welcome screen (a single wrapped stack); we do
     not persist a second chip carousel above the input during the conversation.
     Also drop the per-reply "Grounded in WISE data" caption on this surface. */
  chipsFlow: 'wrap',
  sourceLabel: '',
  /* The chat can DRIVE every step of the flow (not just answer questions): each
     action chip performs the step on the surface to the right, then confirms
     with a state-aware reply. Q&A chips follow. */
  /* Large "at a glance" cards shown alongside the small chips on the welcome
     screen — each reuses an existing intent so a click drives the same flow. */
  scorecards: {
    label: 'Your verification at a glance',
    cards: [
      { intent: 'select_all', icon: 'library_add_check', iconTone: 'brand', title: 'Select every pre-qualified food', desc: 'Add all pre-qualified SKUs to this verification in one tap — ready to attest.', action: 'Select all foods', ask: 'Select all foods' },
      { intent: 'go_payment', icon: 'payments', iconTone: 'brand', title: 'Review & pay', desc: 'Choose a method, review your total, accept the VSA, and finalize.', action: 'Go to payment', ask: 'Go to payment' },
      { intent: 'go_attest', icon: 'fact_check', iconTone: 'brand', title: 'Continue to attestation', desc: 'Move your selected foods into attestation, ready to sign.', action: 'Continue to attestation', ask: 'Continue to attestation' },
      { intent: 'do_attest', icon: 'verified', iconTone: 'brand', title: 'Sign the attestation', desc: 'Confirm your Non-UPF attestation to lock in the claim.', action: 'Sign the attestation', ask: 'Sign the attestation' },
      { variant: 'wiseai', intent: 'explain_flow', icon: 'smart_toy', title: 'Let WISEcodeAI run verification', desc: 'Select \u2192 Attest \u2192 Pay — I can drive every step for you.', action: 'How does verification work?', ask: 'How does verification work?' },
    ],
  },
  intents: [
    { intent: 'select_all', label: 'Select all foods', icon: 'library_add_check' },
    { intent: 'go_attest', label: 'Continue to attestation', icon: 'fact_check' },
    { intent: 'do_attest', label: 'Sign the attestation', icon: 'verified' },
    { intent: 'go_payment', label: 'Go to payment', icon: 'payments' },
    { intent: 'pay_now', label: 'Pay & mint my shields', icon: 'verified_user' },
    { intent: 'explain_flow', label: 'How does verification work?', icon: 'help_outline' },
    { intent: 'pricing', label: 'How is pricing calculated?', icon: 'request_quote' },
    { intent: 'what_you_get', label: 'What do I get after?', icon: 'workspace_premium' },
    { intent: 'other_types', label: 'Other verification types', icon: 'category' },
  ],
  intentReplies: {
    select_all: () => `Selected all <strong>${FOODS.length}</strong> pre-qualified foods — that's <strong>${money(subtotal())}</strong> at ${money(PRICE_PER_ITEM)}/SKU. They're checked on the table to your right. Ready to <strong>continue to attestation</strong>?`,
    go_attest: () => selectedCount()
      ? `You're on <strong>Attest</strong> with <strong>${selectedCount()}</strong> food${plural(selectedCount())}. Expand any SKU to confirm its ingredient data matches the packaging, then <strong>sign the attestation</strong>.`
      : `Select at least one food first and I'll take you straight to attestation.`,
    do_attest: () => selectedCount()
      ? `Attestation signed for <strong>${selectedCount()}</strong> food${plural(selectedCount())}. Next is <strong>Payment</strong> — just say “go to payment”.`
      : `Pick at least one food before we attest.`,
    go_payment: () => (state.attested && selectedCount())
      ? `You're on <strong>Payment</strong>. Choose a method, review your <strong>${money(total())}</strong> total, accept the VSA, and I can finalize it.`
      : `You'll need a signed attestation before payment. Want me to sign it for the ${selectedCount()} selected food${plural(selectedCount())}?`,
    pay_now: () => state.paid
      ? `Done — payment processed and your Non-UPF shields for <strong>${selectedCount()}</strong> food${plural(selectedCount())} are being minted. Your brand asset pack unlocks next.`
      : `To pay I need at least one selected food and a signed attestation. Let's finish those first and I'll come right back.`,
    explain_flow: 'Verification runs in three steps: <strong>Select Foods</strong> → <strong>Attest</strong> → <strong>Payment</strong>. Pick the pre-qualified SKUs, formally attest their data matches the packaging, then pay to mint your shields and unlock the brand asset pack. I can run any of these for you from here.',
    pricing: () => `Non-UPF verification is <strong>${money(PRICE_PER_ITEM)} per SKU / year</strong> at the current Expo West price. Your total is the number of selected foods × the per-item price — right now that's <strong>${selectedCount()} × ${money(PRICE_PER_ITEM)} = ${money(subtotal())}</strong>.`,
    what_you_get: 'Once payment clears you receive your official certification plus a <strong>brand asset pack</strong>: web + print shields, retail shelf-talkers, and social tiles for every verified SKU.',
    other_types: 'Non-UPF is the first of several verification types. Seed-Oil-Free, Clean Label, and state-compliance shields use the same Select → Attest → Pay flow, so once you know one you know them all.',
  },
  /* Perform the requested step on the flow surface, then fall through (return
     false) so the state-aware reply above is shown. */
  onIntent: (intent) => {
    switch (intent) {
      case 'select_all':
        brandFoods().filter(canReview).forEach((f) => { f.selected = true; });
        if (state.step !== 'select') goStep('select'); else render();
        return false;
      case 'go_attest':
        if (selectedCount() > 0) goStep('attest'); else render();
        return false;
      case 'do_attest':
        if (selectedCount() > 0) {
          if (state.step !== 'attest') goStep('attest');
          state.attested = true;
          render();
        }
        return false;
      case 'go_payment':
        if (state.attested && selectedCount() > 0) goStep('payment'); else render();
        return false;
      case 'pay_now':
        if (state.attested && selectedCount() > 0) {
          if (state.step !== 'payment') goStep('payment');
          state.vsa = true;
          onAction('process-payment');
        } else { render(); }
        return false;
      default:
        return false;
    }
  },
};
