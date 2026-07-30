/**
 * Non-UPF Verification flow module.
 *
 * A self-contained, 3-step wizard rendered into #agent-main-scroll on
 * verification.html (an app-nav shell page). The persistent WISEai chat docks
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

function vfToast(msg, icon = 'check_circle') {
  let wrap = document.getElementById('vf-toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'vf-toast-wrap';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = 'vf-toast';
  t.innerHTML = `<span class="material-icons">${esc(icon)}</span><span>${esc(msg)}</span>`;
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
    selected: true,
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
    selected: true,
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
    selected: true,
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
  expanded: new Set(['milk', 'scramble']),
  discount: 0,
};

const stepIndex = (id) => STEPS.findIndex((s) => s.id === id);
const selectedFoods = () => FOODS.filter((f) => f.selected);
const selectedCount = () => selectedFoods().length;
const countShield = (s) => FOODS.filter((f) => f.shield === s).length;
const subtotal = () => selectedCount() * PRICE_PER_ITEM;
const total = () => Math.max(0, subtotal() - (Number(state.discount) || 0));

function matchesSearch(f) {
  const q = state.search.trim().toLowerCase();
  if (!q) return true;
  return f.name.toLowerCase().includes(q) || f.upc.includes(q);
}

/* ------------------------------------------------------------------ */
/* Markup — shared chrome                                              */
/* ------------------------------------------------------------------ */

/* ---------- Right-hand progress module ----------
   A separate pane docked to the right of the flow (mirrors the account-creation
   "Account setup" pane: sp-/vs-step in auth.css). It replaces the old inline
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

function progressPaneHTML() {
  const active = stepIndex(state.step);
  const completed = STEPS.filter((s) => stepDone(s.id)).length;
  const pct = Math.round((completed / STEPS.length) * 100);

  const stepsHtml = STEPS.map((s, i) => {
    const done = stepDone(s.id);
    const isActive = i === active;
    const cls = done ? 'vfp-step--done' : isActive ? 'vfp-step--active' : '';
    const num = done ? '<span class="material-icons">check</span>' : String(i + 1);
    let sub = '';
    if (done) sub = 'Completed';
    else if (isActive) sub = 'In progress';
    const nodeAttrs = done ? `role="button" tabindex="0" data-goto="${s.id}" aria-label="Back to ${esc(s.label)}"` : '';

    let fieldsHtml = '';
    if (done || isActive) {
      const rows = stepFields(s.id).map((f) => {
        const icon = f.done ? 'check_circle' : 'radio_button_unchecked';
        const st = f.done ? 'vfp-field--done' : 'vfp-field--active';
        return `<div class="vfp-field ${st}"><span class="material-icons">${icon}</span><span class="vfp-field-label">${esc(f.label)}</span><span class="vfp-field-val">${esc(f.val)}</span></div>`;
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
    <div class="vfp-inner">
      <div class="vfp-header">
        <div class="vfp-header-text">
          <div class="vfp-title">Verification progress</div>
          <div class="vfp-subtitle">Non-UPF · ${STEPS.length} steps</div>
        </div>
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
    const n = selectedCount();
    return `<button class="vf-cta" type="button" data-vf="open-confirm" ${n ? '' : 'disabled'}>
      Continue to Review &amp; Attest <span class="material-icons">arrow_forward</span></button>`;
  }
  if (state.step === 'attest') {
    return `<button class="vf-cta" type="button" data-vf="to-payment" ${state.attested ? '' : 'disabled'}>
      Next <span class="material-icons">arrow_forward</span></button>`;
  }
  return '';
}

function headerHTML() {
  const idx = stepIndex(state.step);
  const back = idx > 0
    ? `<button class="vf-back" type="button" data-vf="go-back" aria-label="Back to ${esc(STEPS[idx - 1].label)}" title="Back to ${esc(STEPS[idx - 1].label)}"><span class="material-icons">arrow_back</span></button>`
    : '';
  return `
    <header class="vf-head">
      ${back}
      <h1 class="vf-head-title">Non-UPF Verification</h1>
      <p class="vf-head-meta">Nutrient Survival · Non-UPF verification</p>
    </header>`;
}

/* Controls bar — a clean search pill that fills the row plus the primary step
   CTA on the right, mirroring the product-portfolio toolbar (search + Add
   Product). The search input keeps id/vf hooks so focus + filtering survive. */
function toolbarHTML(cta) {
  return `
    <div class="vf-toolbar">
      <div class="vf-search-inline">
        <span class="material-icons">search</span>
        <input id="vf-search" class="vf-search" type="text" placeholder="Search by product name or UPC" value="${esc(state.search)}" data-vf="search" autocomplete="off" aria-label="Search foods" />
      </div>
      <span class="vf-tool-spacer"></span>
      ${cta || ''}
    </div>`;
}

/* Scorecards — one tile per possible Non-UPF Shield chip that can appear in the
   table below (plus an "All foods" total), mirroring the product-portfolio
   status filter cards. Each tile is colored to its matching chip. */
function glanceHTML(label) {
  const tile = (num, cap, mod, icon) =>
    `<div class="vf-stat${mod ? ' ' + mod : ''}">` +
    `<span class="vf-stat-num">${esc(num)}</span>` +
    `<span class="vf-stat-label">${icon ? `<span class="material-icons">${esc(icon)}</span>` : ''}${esc(cap)}</span>` +
    `</div>`;
  return `
    <div class="vf-stats-bar"><span class="vf-stats-label">${esc(label)}</span></div>
    <div class="vf-stats">
      ${tile(String(FOODS.length), 'All foods')}
      ${tile(String(countShield('prequal')), 'Pre-qualified', 'vf-stat--warn')}
      ${tile(String(countShield('attest')), 'Pending attestation', 'vf-stat--info')}
      ${tile(String(countShield('ineligible')), 'Ineligible', 'vf-stat--muted')}
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
  return `<span class="vf-chip ${m.cls}"><span class="material-icons">${m.icon}</span>${esc(m.label)}</span>`;
}

/* Dates cell — the product-portfolio two-line "Updated / Last edited" stack,
   each date carrying an uppercase status label above its value. */
function datesCell(f) {
  return `<div class="vf-dates">` +
    `<span class="vf-date"><span class="vf-date-status">Updated</span><span class="vf-date-val">${esc(f.updated)}</span></span>` +
    `<span class="vf-date"><span class="vf-date-status">Last edited</span><span class="vf-date-val">${esc(f.edited)}</span></span>` +
    `</div>`;
}

/* Circular product photo (the real 10-can render), with the themed material
   icon kept only as a graceful fallback if the image can't load — identical to
   the product-portfolio `pf-thumb` pattern. */
function thumb(f) {
  return `<span class="vf-thumb">` +
    `<img class="vf-thumb-img" src="${esc(f.img)}" alt="${esc(f.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'">` +
    `<span class="material-icons" style="display:none">${esc(f.thumbIcon)}</span></span>`;
}

/* Product cell — thumbnail + a name / UPC stack (UPC sits directly under the
   name), matching the product-portfolio `pf-col-product` layout. `extra` lets
   the attest step slot an expand toggle before the name. */
function productCell(f, extra) {
  return `<div class="vf-pcell">${thumb(f)}` +
    `<div class="vf-pcell-text"><div class="vf-pname-row">${extra || ''}<span class="vf-pname">${esc(f.name)}</span></div>` +
    `<span class="vf-upc">UPC · ${esc(f.upc)}</span></div></div>`;
}

/* ------------------------------------------------------------------ */
/* Step 1 — Select Foods                                               */
/* ------------------------------------------------------------------ */

function selectStepHTML() {
  const rows = FOODS.filter(matchesSearch);
  const allSel = FOODS.every((f) => f.selected);
  const noneSel = FOODS.every((f) => !f.selected);
  const headState = allSel ? 'check_box' : noneSel ? 'check_box_outline_blank' : 'indeterminate_check_box';
  return `
    ${toolbarHTML(headCtaHTML())}
    <div class="vf-board">
      ${glanceHTML('Select foods to review & attest')}
      <div class="vf-board-divider"></div>
      <table class="vf-table">
        <thead>
          <tr>
            <th class="vf-col-check">
              <button class="vf-check vf-check--head" type="button" data-vf="toggle-all" aria-label="Select all foods">
                <span class="material-icons">${headState}</span>
              </button>
            </th>
            <th>Product</th>
            <th class="vf-col-status">Non-UPF Shield</th>
            <th class="vf-col-updated">Updated</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((f) => `
            <tr class="vf-row ${f.selected ? 'is-selected' : ''}" data-food="${f.id}">
              <td class="vf-col-check">
                <button class="vf-check" type="button" data-vf="toggle-food" data-food="${f.id}" aria-label="Select ${esc(f.name)}" aria-pressed="${f.selected}">
                  <span class="material-icons">${f.selected ? 'check_box' : 'check_box_outline_blank'}</span>
                </button>
              </td>
              <td>${productCell(f)}</td>
              <td class="vf-col-status">${statusPill(f)}</td>
              <td class="vf-col-updated">${datesCell(f)}</td>
            </tr>`).join('')}
          ${rows.length ? '' : '<tr><td colspan="4" class="vf-empty">No foods match your search.</td></tr>'}
        </tbody>
      </table>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Step 2 — Attest                                                     */
/* ------------------------------------------------------------------ */

function attestStepHTML() {
  const rows = selectedFoods().filter(matchesSearch);
  return `
    ${toolbarHTML(headCtaHTML())}
    <div class="vf-board">
      ${glanceHTML('Review & attest your selections')}
      <div class="vf-board-divider"></div>
      <table class="vf-table vf-table--attest">
        <thead>
          <tr>
            <th class="vf-col-expand"></th>
            <th class="vf-col-check"><span class="material-icons vf-head-glyph">check_box</span></th>
            <th>Product</th>
            <th class="vf-col-status">Non-UPF Shield</th>
            <th class="vf-col-updated">Updated</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((f) => {
            const open = state.expanded.has(f.id);
            const expandBtn = `<button class="vf-expand ${open ? 'is-open' : ''}" type="button" data-vf="toggle-expand" data-food="${f.id}" aria-label="Toggle ingredients" aria-expanded="${open}"><span class="material-icons">expand_more</span></button>`;
            return `
            <tr class="vf-row is-selected" data-food="${f.id}">
              <td class="vf-col-expand">${expandBtn}</td>
              <td class="vf-col-check">
                <button class="vf-check" type="button" data-vf="toggle-food" data-food="${f.id}" aria-label="Deselect ${esc(f.name)}" aria-pressed="true">
                  <span class="material-icons">check_box</span>
                </button>
              </td>
              <td>${productCell(f)}</td>
              <td class="vf-col-status">${statusPill(f)}</td>
              <td class="vf-col-updated">${datesCell(f)}</td>
            </tr>
            <tr class="vf-detail-row ${open ? 'is-open' : ''}" data-detail="${f.id}">
              <td colspan="5">
                <div class="vf-detail">
                  <div class="vf-detail-label">Ingredients</div>
                  <p class="vf-detail-text">${esc(f.ingredients)}</p>
                </div>
              </td>
            </tr>`;
          }).join('')}
          ${rows.length ? '' : '<tr><td colspan="5" class="vf-empty">No selected foods match your search.</td></tr>'}
        </tbody>
      </table>
    </div>

    <label class="vf-attest vf-attest--sticky ${state.attested ? 'is-checked' : ''}">
      <button class="vf-check vf-check--attest" type="button" data-vf="toggle-attest" role="checkbox" aria-checked="${state.attested}">
        <span class="material-icons">${state.attested ? 'check_box' : 'check_box_outline_blank'}</span>
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
          <span class="material-icons vf-select-chevron">expand_more</span>
        </div>

        <label class="vf-field-label">Payment Method</label>
        <div class="vf-methods">
          ${methods.map((m) => `
            <button type="button" class="vf-method ${state.payMethod === m.id ? 'is-active' : ''} ${m.enabled ? '' : 'is-disabled'}"
              data-vf="pay-method" data-method="${m.id}" ${m.enabled ? '' : 'disabled'}>
              <span class="material-icons">${m.enabled ? m.icon : 'lock'}</span>${esc(m.label)}
            </button>`).join('')}
        </div>

        ${state.payMethod === 'card' ? `
        <label class="vf-field-label">Card Details</label>
        <div class="vf-card-input">
          <span class="material-icons vf-card-glyph">credit_card</span>
          <input class="vf-input" type="text" inputmode="numeric" placeholder="Card number" aria-label="Card number" />
        </div>
        <div class="vf-note">
          <span class="material-icons">info</span>
          <div><strong>Immediate Payment</strong><br>Your card will be charged immediately upon submission. Your verification process will begin right away.</div>
        </div>` : ''}

        ${state.payMethod === 'invoice' ? `
        <div class="vf-note">
          <span class="material-icons">receipt_long</span>
          <div><strong>Request an Invoice</strong><br>We'll email a net-30 invoice for this verification. Your assets unlock once payment clears.</div>
        </div>` : ''}

        <label class="vf-field-label">Coupon Code (Optional)</label>
        <div class="vf-coupon">
          <input class="vf-input" type="text" placeholder="Enter coupon code" aria-label="Coupon code" />
          <button type="button" class="vf-apply" data-vf="apply-coupon">Apply</button>
        </div>

        <div class="vf-admin">
          <div class="vf-admin-head"><span class="material-icons">sell</span>Admin Discount (Internal Use Only)</div>
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
            <span class="material-icons">${state.vsa ? 'check_box' : 'check_box_outline_blank'}</span>
          </button>
          <span class="vf-attest-text">I have read and agree to the <a href="#" data-vf="noop">Verification Service Agreement (VSA)</a>, the legally binding terms for this verification.</span>
        </label>

        <button class="vf-pay-btn" type="button" data-vf="process-payment" ${state.vsa ? '' : 'disabled'}>
          <span class="material-icons">verified_user</span> Get my shield &amp; Process Payment
        </button>
        <div class="vf-secure"><span class="material-icons">lock</span> Your payment information is secure and encrypted</div>
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
        <button class="vf-modal-x" type="button" data-vf="close-confirm" aria-label="Close"><span class="material-icons">close</span></button>
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

function renderProgress() {
  if (progressEl) progressEl.innerHTML = progressPaneHTML();
}

function render(preserveFocus) {
  if (!rootEl) return;
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
    case 'toggle-all': {
      const allSel = FOODS.every((f) => f.selected);
      FOODS.forEach((f) => { f.selected = !allSel; });
      render();
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
    case 'open-confirm':
      if (selectedCount() > 0) openModal();
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
   #agent-main in the flex row; the left-docked WISEai chat keeps order:-1, so
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
  mainEl.innerHTML = '<div class="vf-root"></div>';
  rootEl = mainEl.querySelector('.vf-root');

  /* Progress module — a sibling pane docked to the RIGHT of the flow inside
     #modules-row (the WISEai chat docks to the left). Mirrors the account-
     creation setup pane. Created once; updated on every render(). */
  mountProgressPane();
  render();

  progressEl?.addEventListener('click', (e) => {
    const goto = e.target.closest('[data-goto]');
    if (goto) goStep(goto.dataset.goto);
  });
  progressEl?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const goto = e.target.closest('[data-goto]');
    if (goto) { e.preventDefault(); goStep(goto.dataset.goto); }
  });

  rootEl.addEventListener('click', (e) => {
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
    else if (el.dataset.vf === 'discount') { state.discount = Math.max(0, Number(el.value) || 0); render(); }
  });

  /* Modal host is appended to <body>, so its clicks are wired globally.
     Clicking the backdrop (the overlay itself) closes; clicks that land on an
     explicit [data-vf] control inside the dialog run their action. Clicks on
     inert dialog chrome do nothing. */
  document.addEventListener('click', (e) => {
    const overlay = e.target.closest('#vf-modal-host .vf-modal-overlay');
    if (!overlay) return;
    if (e.target === overlay) { closeModal(); return; }
    const el = e.target.closest('[data-vf]');
    if (el && overlay.contains(el)) onAction(el.dataset.vf, el);
  });
}

/* ------------------------------------------------------------------ */
/* WISEai dock configuration for the verification page                 */
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
        FOODS.forEach((f) => { f.selected = true; });
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
