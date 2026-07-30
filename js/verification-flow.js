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

/* Pre-qualified foods eligible for the Non-UPF shield. */
const FOODS = [
  {
    id: 'egg-blend',
    name: 'Nutrient Survival Powdered Vitamin Egg Blend',
    brand: 'Nutrient Survival',
    upc: '818491020984',
    status: 'Pre-Qualified',
    updated: 'Jul 29, 2026',
    thumbIcon: 'egg',
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
    name: 'Powdered Vitamin Potato',
    brand: 'Nutrient Survival',
    upc: '818491021820',
    status: 'Pre-Qualified',
    updated: 'Jun 24, 2026',
    thumbIcon: 'nutrition',
    selected: true,
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
  payMethod: 'card',
  search: '',
  expanded: new Set(['egg-blend', 'potato']),
  discount: 0,
};

const stepIndex = (id) => STEPS.findIndex((s) => s.id === id);
const selectedFoods = () => FOODS.filter((f) => f.selected);
const selectedCount = () => selectedFoods().length;
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

function stepperHTML() {
  const active = stepIndex(state.step);
  return `
    <ol class="vf-stepper" aria-label="Verification progress">
      ${STEPS.map((s, i) => {
        const done = i < active;
        const isActive = i === active;
        const cls = done ? 'is-done' : isActive ? 'is-active' : 'is-upcoming';
        const nodeAttrs = done
          ? `role="button" tabindex="0" data-goto="${s.id}" aria-label="Back to ${esc(s.label)}"`
          : '';
        const icon = done ? 'check' : s.icon;
        return `
          ${i > 0 ? `<li class="vf-step-line ${i <= active ? 'is-filled' : ''}" aria-hidden="true"></li>` : ''}
          <li class="vf-step ${cls}">
            <span class="vf-step-dot" ${nodeAttrs}><span class="material-icons">${icon}</span></span>
            <span class="vf-step-label">${esc(s.label)}</span>
            <span class="vf-step-sub">${esc(s.sub)}</span>
          </li>`;
      }).join('')}
    </ol>`;
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
  return `
    <div class="vf-head">
      <h1 class="vf-title">Non-UPF Verification</h1>
      <div class="vf-head-actions">${headCtaHTML()}</div>
    </div>
    ${stepperHTML()}`;
}

/* ------------------------------------------------------------------ */
/* Markup — table rows                                                 */
/* ------------------------------------------------------------------ */

function statusPill(status) {
  return `<span class="vf-pill"><span class="material-icons">verified</span>${esc(status)}</span>`;
}

function thumb(f) {
  return `<span class="vf-thumb"><span class="material-icons">${esc(f.thumbIcon)}</span></span>`;
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
    <div class="vf-section-head">
      <div>
        <h2 class="vf-section-title">Select Foods to Review and Attest</h2>
        <p class="vf-section-desc">Choose which pre-qualified items to include in this verification. You can review the required data set for these selections in the next step.</p>
      </div>
      <span class="vf-counter">${selectedCount()} selected for attestation</span>
    </div>

    ${searchHTML()}

    <div class="vf-table-card">
      <table class="vf-table">
        <thead>
          <tr>
            <th class="vf-col-check">
              <button class="vf-check vf-check--head" type="button" data-vf="toggle-all" aria-label="Select all foods">
                <span class="material-icons">${headState}</span>
              </button>
            </th>
            <th class="vf-col-sort"><span class="material-icons vf-sort">unfold_more</span></th>
            <th>Product Name <span class="material-icons vf-sort">unfold_more</span></th>
            <th class="vf-col-upc">UPC</th>
            <th class="vf-col-status">Status</th>
            <th class="vf-col-updated">Updated Last <span class="material-icons vf-sort">unfold_more</span></th>
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
              <td class="vf-col-sort"><span class="material-icons vf-sort">unfold_more</span></td>
              <td class="vf-name-cell">${thumb(f)}<span class="vf-name">${esc(f.name)}</span></td>
              <td class="vf-col-upc vf-mono">${esc(f.upc)}</td>
              <td class="vf-col-status">${statusPill(f.status)}</td>
              <td class="vf-col-updated">${esc(f.updated)}</td>
            </tr>`).join('')}
          ${rows.length ? '' : '<tr><td colspan="6" class="vf-empty">No foods match your search.</td></tr>'}
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
    <div class="vf-section-head">
      <div>
        <h2 class="vf-section-title">Review &amp; Attest to Your Selections</h2>
        <p class="vf-section-desc">Check your selected items one last time to ensure all mandatory data is accurate. Complete the attestation below to move forward to verification.</p>
      </div>
    </div>

    ${searchHTML()}

    <div class="vf-table-card">
      <div class="vf-table-card-title">Selected Foods for Verification</div>
      <table class="vf-table vf-table--attest">
        <thead>
          <tr>
            <th class="vf-col-check"><span class="material-icons vf-head-glyph">check_box_outline_blank</span></th>
            <th class="vf-col-sort"><span class="material-icons vf-sort">unfold_more</span></th>
            <th>Product Name</th>
            <th class="vf-col-upc">UPC</th>
            <th class="vf-col-status">Status</th>
            <th class="vf-col-updated">Updated Last</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((f) => {
            const open = state.expanded.has(f.id);
            return `
            <tr class="vf-row is-selected" data-food="${f.id}">
              <td class="vf-col-check">
                <button class="vf-check" type="button" data-vf="toggle-food" data-food="${f.id}" aria-label="Deselect ${esc(f.name)}" aria-pressed="true">
                  <span class="material-icons">check_box</span>
                </button>
              </td>
              <td class="vf-col-sort">
                <button class="vf-expand ${open ? 'is-open' : ''}" type="button" data-vf="toggle-expand" data-food="${f.id}" aria-label="Toggle ingredients" aria-expanded="${open}">
                  <span class="material-icons">expand_more</span>
                </button>
              </td>
              <td class="vf-name-cell">${thumb(f)}<span class="vf-name">${esc(f.name)}</span></td>
              <td class="vf-col-upc vf-mono">${esc(f.upc)}</td>
              <td class="vf-col-status">${statusPill(f.status)}</td>
              <td class="vf-col-updated">${esc(f.updated)}</td>
            </tr>
            <tr class="vf-detail-row ${open ? 'is-open' : ''}" data-detail="${f.id}">
              <td colspan="6">
                <div class="vf-detail">
                  <div class="vf-detail-label">Ingredients</div>
                  <p class="vf-detail-text">${esc(f.ingredients)}</p>
                </div>
              </td>
            </tr>`;
          }).join('')}
          ${rows.length ? '' : '<tr><td colspan="6" class="vf-empty">No selected foods match your search.</td></tr>'}
        </tbody>
      </table>
    </div>

    <label class="vf-attest ${state.attested ? 'is-checked' : ''}">
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
          <button type="button" class="vf-autofill" data-vf="autofill">Autofill <span class="material-icons">chevron_right</span></button>
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

        <div class="vf-summary">
          <div class="vf-summary-title">Payment Summary</div>
          <div class="vf-summary-row"><span>Food Items to Verify:</span><span>${selectedCount()} items</span></div>
          <div class="vf-summary-row"><span>Price per Item:</span><span>${money(PRICE_PER_ITEM)}</span></div>
          <div class="vf-summary-row"><span>Subtotal:</span><span>${money(subtotal())}</span></div>
          ${state.discount > 0 ? `<div class="vf-summary-row"><span>Discount:</span><span>-${money(state.discount)}</span></div>` : ''}
          <div class="vf-summary-total"><span>Total Amount:</span><span class="vf-total-amt">${money(total())}</span></div>
          <div class="vf-summary-fine">* Billed yearly. Cancel anytime.</div>
        </div>

        <label class="vf-vsa ${state.vsa ? 'is-checked' : ''}">
          <button class="vf-check" type="button" data-vf="toggle-vsa" role="checkbox" aria-checked="${state.vsa}">
            <span class="material-icons">${state.vsa ? 'check_box' : 'check_box_outline_blank'}</span>
          </button>
          <span>I have read and agree to the <a href="#" data-vf="noop">Verification Service Agreement (VSA)</a>, the legally binding terms for this verification.</span>
        </label>

        <button class="vf-pay-btn" type="button" data-vf="process-payment" ${state.vsa ? '' : 'disabled'}>
          <span class="material-icons">verified_user</span> Get my shield &amp; Process Payment
        </button>
        <div class="vf-secure"><span class="material-icons">lock</span> Your payment information is secure and encrypted</div>
      </section>

      <aside class="vf-pay-side">
        <div class="vf-side-head">
          <h2 class="vf-pay-title">Foods Submitting for Verification</h2>
          <span class="vf-side-ready">${selectedCount()} foods ready</span>
        </div>
        <table class="vf-side-table">
          <thead>
            <tr><th>Product Name</th><th>Brand</th><th class="vf-side-cost">Cost per Item</th></tr>
          </thead>
          <tbody>
            ${selectedFoods().map((f) => `
              <tr>
                <td class="vf-side-name">${esc(f.name)}</td>
                <td class="vf-side-brand">${esc(f.brand)}</td>
                <td class="vf-side-cost vf-mono">${money(PRICE_PER_ITEM)}</td>
              </tr>`).join('')}
          </tbody>
          <tfoot>
            <tr><td colspan="2" class="vf-side-total-label">Total Verification Cost:</td><td class="vf-side-cost vf-side-total-val">${money(subtotal())}</td></tr>
          </tfoot>
        </table>
      </aside>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Search input (shared)                                               */
/* ------------------------------------------------------------------ */

function searchHTML() {
  return `
    <div class="vf-search-card">
      <label class="vf-search-label" for="vf-search">Search</label>
      <div class="vf-search">
        <span class="material-icons">search</span>
        <input id="vf-search" class="vf-input" type="text" placeholder="Search by product name or UPC" value="${esc(state.search)}" data-vf="search" autocomplete="off" />
      </div>
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

function bodyHTML() {
  if (state.step === 'select') return selectStepHTML();
  if (state.step === 'attest') return attestStepHTML();
  return paymentStepHTML();
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
    case 'autofill':
      vfToast('Card details autofilled.', 'bolt');
      break;
    case 'apply-coupon':
      vfToast('No valid coupon entered.', 'info');
      break;
    case 'process-payment':
      if (state.vsa) vfToast('Payment processed — your Non-UPF shields are being minted.', 'verified_user');
      break;
    case 'noop':
      break;
    default:
      break;
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
  render();

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

export const VERIFICATION_WISEAI = {
  sub: 'Your verification guide — Non-UPF and beyond.',
  chipsFlow: 'wrap',
  intents: [
    { intent: 'explain_flow', label: 'How does verification work?', icon: 'help_outline' },
    { intent: 'what_is_nonupf', label: 'What is a Non-UPF shield?', icon: 'verified' },
    { intent: 'pricing', label: 'How is pricing calculated?', icon: 'payments' },
    { intent: 'what_you_get', label: 'What do I get after?', icon: 'workspace_premium' },
    { intent: 'other_types', label: 'Other verification types', icon: 'category' },
  ],
  intentReplies: {
    explain_flow: 'Verification runs in three steps: <strong>Select Foods</strong> → <strong>Attest</strong> → <strong>Payment</strong>. Pick the pre-qualified SKUs, formally attest their data matches the packaging, then pay to mint your shields and unlock the brand asset pack.',
    what_is_nonupf: 'The <strong>Non-UPF shield</strong> certifies a product is Not Ultra-Processed against the WISEcode standard. Verified SKUs stand out on retail listings and unlock badges, shelf-talkers, and social assets.',
    pricing: 'Non-UPF verification is <strong>$99 per SKU / year</strong> at the current Expo West price. Your total is simply the number of selected foods × the per-item price — you can review it in the Payment step before confirming.',
    what_you_get: 'Once payment clears you receive your official certification plus a <strong>brand asset pack</strong>: web + print shields, retail shelf-talkers, and social tiles for every verified SKU.',
    other_types: 'Non-UPF is the first of several verification types. Seed-Oil-Free, Clean Label, and state-compliance shields use the same Select → Attest → Pay flow, so once you know one you know them all.',
  },
  onIntent: () => false,
};
