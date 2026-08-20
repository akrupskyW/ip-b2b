/**
 * GRAS Verification flow module.
 *
 * The second verification type on the platform (the twin of the Non-UPF flow in
 * verification-flow.js). Where Non-UPF is product-centric, GRAS is
 * INGREDIENT-centric: an ingredient with no established GRAS basis flags every
 * product that contains it, so you document the ingredient ONCE and the status
 * applies portfolio-wide.
 *
 * Rendered into #agent-main-scroll on gras-verification.html (an app-nav shell
 * page). The persistent WISEcodeAI chat docks to the LEFT (via
 * data-default-dock="left"); this module is the "right" surface, with a
 * dedicated progress pane docked to its right — the exact same chat → flow →
 * progress arrangement as the Non-UPF flow.
 *
 * Screens (state.screen):
 *   report      — flagged ingredients + portfolio impact (the landing surface).
 *   wizard      — the 5-step documentation wizard for one ingredient:
 *                   1. Impact            — what this verification unlocks
 *                   2. Documentation type — pick the GRAS pathway
 *                   3. Provide documents  — pathway-specific fields + upload
 *                   4. Attestation        — sign off
 *                   5. Review & submit    — confirm everything
 *   confirm     — submission received, pending WISEcode review.
 *   submissions — the review queue (a submission can be reviewed → verified).
 *   result      — the ingredient is now GRAS; products moved portfolio-wide.
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

function gvToast(msg, icon = 'check') {
  let wrap = document.getElementById('gv-toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'gv-toast-wrap';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = 'gv-toast';
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

/* The brand's whole portfolio (for the coverage math). Only a slice of it is
   flagged for GRAS documentation — those flagged ingredients live below. */
const PORTFOLIO_TOTAL = 40;
const BASE_GRAS_PRODUCTS = 14; /* products already resting on an established GRAS basis */

/* GRAS documentation pathways — the four real routes to establish a GRAS basis.
   The wizard recommends one per ingredient but any can be chosen. */
const DOC_TYPES = [
  {
    id: 'self',
    name: 'Self-Affirmation GRAS',
    icon: 'fact_check',
    forText: 'Any ingredient',
    desc: 'A GRAS self-determination dossier with an independent expert-panel safety conclusion.',
  },
  {
    id: 'fema',
    name: 'FEMA GRAS',
    icon: 'science',
    forText: 'Flavorings',
    desc: 'A FEMA GRAS™ flavor declaration citing the FEMA number(s) for each flavor substance.',
  },
  {
    id: 'grn',
    name: 'FDA GRAS Notice',
    icon: 'gavel',
    forText: 'Filed ingredients',
    desc: 'A GRAS Notice filed with FDA that received a “no questions” response letter (GRN).',
  },
  {
    id: 'supplier',
    name: 'Supplier GRAS Letter',
    icon: 'description',
    forText: 'Sourced ingredients',
    desc: 'A certificate of GRAS compliance issued by your ingredient supplier.',
  },
];

/* Flagged ingredients — each has no established GRAS basis in WISEcode, so every
   product that contains it is flagged. `products` is the portfolio-wide count
   that clears once the ingredient is verified; `samples` are representative
   SKUs (real Nutrient Survival products, mirroring the Non-UPF flow). */
const INGREDIENTS = [
  {
    id: 'maltodextrin',
    name: 'Maltodextrin',
    kind: 'Carrier / processing aid',
    pct: 45,
    products: 18,
    rec: 'self',
    blocks: 'Unclear',
    aiNote:
      'Maltodextrin is your single highest-leverage GRAS gap — it carries the vitamin blend in 45% of your portfolio and is why 18 products read as “Unclear.” A self-affirmation GRAS dossier with an expert-panel conclusion is the fastest way to establish its basis across every SKU.',
    samples: [
      { n: 'Powdered Vitamin Eggs', upc: '818491020984' },
      { n: 'Instant Vitamin Potato', upc: '818491021820' },
      { n: 'Powdered Vitamin Milk', upc: '818491021226' },
    ],
  },
  {
    id: 'natural-flavor',
    name: 'Natural Flavor',
    kind: 'Flavoring',
    pct: 30,
    products: 12,
    rec: 'fema',
    blocks: 'Unknown Flavors',
    aiNote:
      '“Natural Flavor” reads as unknown only because the individual flavor substances aren’t declared. A FEMA GRAS declaration citing the FEMA number for each substance resolves all 12 products at once.',
    samples: [
      { n: 'Protein Cereal — Chocolate', upc: '818491021332' },
      { n: 'Freeze-Dried Mixed Vegetables', upc: '818491021905' },
      { n: 'Homestyle Scramble — Protein Meal', upc: '818491021554' },
    ],
  },
  {
    id: 'modified-food-starch',
    name: 'Modified Food Starch',
    kind: 'Thickener',
    pct: 22,
    products: 9,
    rec: 'self',
    blocks: 'Unclear',
    aiNote:
      'Modified Food Starch is a well-characterized thickener. A self-affirmation GRAS dossier naming the base starch and its modification clears all 9 products.',
    samples: [
      { n: 'Freeze-Dried Mixed Vegetables', upc: '818491021905' },
      { n: 'Triple Cheese Mac — Protein Meal', upc: '818491021561' },
    ],
  },
  {
    id: 'autolyzed-yeast-extract',
    name: 'Autolyzed Yeast Extract',
    kind: 'Flavor enhancer',
    pct: 15,
    products: 6,
    rec: 'supplier',
    blocks: 'Unclear',
    aiNote:
      'Autolyzed Yeast Extract is sourced, not made in-house — so a supplier GRAS letter naming the strain and its processing is the cleanest path to clear its 6 products.',
    samples: [
      { n: 'Freeze-Dried Mixed Vegetables', upc: '818491021905' },
      { n: 'Homestyle Scramble — Protein Meal', upc: '818491021554' },
    ],
  },
  {
    id: 'disodium-inosinate',
    name: 'Disodium Inosinate',
    kind: 'Flavor enhancer',
    pct: 12,
    products: 5,
    rec: 'grn',
    blocks: 'Unclear',
    aiNote:
      'Disodium Inosinate already has an FDA GRAS Notice on file for this use. Attaching the GRN and its “no questions” letter clears all 5 products immediately.',
    samples: [
      { n: 'Freeze-Dried Mixed Vegetables', upc: '818491021905' },
      { n: 'Triple Cheese Mac — Protein Meal', upc: '818491021561' },
    ],
  },
  {
    id: 'soluble-maize-fiber',
    name: 'Soluble Maize Fiber',
    kind: 'Dietary fiber',
    pct: 10,
    products: 4,
    rec: 'supplier',
    blocks: 'Unclear',
    aiNote:
      'Soluble Maize Fiber is a sourced fiber with a supplier GRAS basis. A supplier GRAS letter naming the source and process resolves its 4 products.',
    samples: [
      { n: 'Instant Vitamin Potato', upc: '818491021820' },
    ],
  },
];

const STEP_DEFS = [
  { id: 'impact', label: 'Impact', sub: 'What this unlocks' },
  { id: 'docs', label: 'Documentation', sub: 'Pick a pathway & provide it' },
  { id: 'attest', label: 'Attestation', sub: 'Sign off' },
  { id: 'review', label: 'Review & submit', sub: 'Confirm everything' },
];

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

const state = {
  screen: 'report',
  wizardStep: 0,
  activeIngredientId: null,
  docType: null,
  fields: {},
  attest: { a: false, b: false, c: false },
  submissions: [],
  verified: [],
  lastResult: null,
  lastSubmissionId: '',
  search: '',
  filterOpen: false,
  filters: { status: [], kind: [], rec: [] },
};

/* ------------------------------------------------------------------ */
/* Selectors / derived                                                 */
/* ------------------------------------------------------------------ */

const ingredientById = (id) => INGREDIENTS.find((i) => i.id === id) || null;
const docTypeById = (id) => DOC_TYPES.find((d) => d.id === id) || null;

function statusOf(id) {
  if (state.verified.includes(id)) return 'verified';
  if (state.submissions.some((s) => s.ingredientId === id && s.status === 'pending')) return 'pending';
  return 'unclear';
}

function metrics() {
  const flipped = state.verified.reduce((sum, id) => sum + (ingredientById(id)?.products || 0), 0);
  /* Flagged ingredients overlap products, so cap coverage at the portfolio. */
  const grasProducts = Math.min(PORTFOLIO_TOTAL, BASE_GRAS_PRODUCTS + flipped);
  const grasPct = Math.round((grasProducts / PORTFOLIO_TOTAL) * 100);
  const flaggedRemaining = INGREDIENTS.filter((i) => statusOf(i.id) === 'unclear').length;
  const inReview = INGREDIENTS.filter((i) => statusOf(i.id) === 'pending').length;
  const verifiedCount = state.verified.length;
  return { grasProducts, grasPct, flaggedRemaining, inReview, verifiedCount, flipped };
}

function moreText(ing, verbPast) {
  if (!ing) return '';
  const extra = ing.products - ing.samples.length;
  return extra > 0 ? `+ ${extra} more product${extra === 1 ? '' : 's'} ${verbPast}` : 'All affected products shown';
}

function matchesSearch(ing) {
  const q = state.search.trim().toLowerCase();
  if (!q) return true;
  return ing.name.toLowerCase().includes(q) || ing.kind.toLowerCase().includes(q);
}

/* Popover filters — each dimension is an OR within itself, AND across
   dimensions (an ingredient must match every non-empty dimension). */
function matchesFilters(ing) {
  const f = state.filters;
  if (f.status.length && !f.status.includes(statusOf(ing.id))) return false;
  if (f.kind.length && !f.kind.includes(ing.kind)) return false;
  if (f.rec.length && !f.rec.includes(ing.rec)) return false;
  return true;
}

function activeFilterCount() {
  const f = state.filters;
  return f.status.length + f.kind.length + f.rec.length;
}

function toggleFilter(dim, val) {
  const arr = state.filters[dim] || [];
  state.filters = {
    ...state.filters,
    [dim]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val],
  };
  render();
}

function clearFilters() {
  state.filters = { status: [], kind: [], rec: [] };
  render();
}

/* Prefill the wizard's document fields with plausible values for the
   ingredient's recommended pathway, so the flow reads as "already known". */
function prefillFor(ing) {
  const base = {
    fileName: '',
    femaNumber: '', flavorName: '', femaSupplier: '',
    panelChair: '', panelMembers: '', conclusionDate: '', intendedUse: '',
    grnNumber: '', filingDate: '', fdaResponse: 'No questions',
    supplierName: '', letterDate: '', contact: '',
  };
  if (ing.rec === 'fema') {
    return { ...base, femaNumber: '2922, 3107', flavorName: 'Natural Flavor (fruit & savory systems)', femaSupplier: 'Givaudan / Symrise' };
  }
  if (ing.rec === 'self') {
    return { ...base, panelChair: 'Dr. Elaine Voss, Ph.D., DABT', panelMembers: '3', conclusionDate: '2025-11-12', intendedUse: `${ing.name} as used in shelf-stable meals` };
  }
  if (ing.rec === 'supplier') {
    return { ...base, supplierName: 'Harmony Ingredients Co.', contact: 'compliance@harmonyingredients.com', letterDate: '2026-01-20' };
  }
  if (ing.rec === 'grn') {
    return { ...base, grnNumber: 'GRN 000783', filingDate: '2024-06-15', fdaResponse: 'No questions' };
  }
  return base;
}

function requiredFilled() {
  const f = state.fields;
  const t = state.docType;
  if (!f.fileName) return false;
  if (t === 'fema') return !!f.femaNumber;
  if (t === 'self') return !!f.panelChair;
  if (t === 'grn') return !!f.grnNumber;
  if (t === 'supplier') return !!f.supplierName;
  return false;
}

function canProceed() {
  const st = state.wizardStep;
  /* Prototype: the Documentation step's Continue is always enabled (we don't
     gate on a real upload here). Attestation still requires the sign-offs. */
  if (st === 2) return state.attest.a && state.attest.b && state.attest.c;
  return true;
}

function reviewRef() {
  const f = state.fields;
  const t = state.docType;
  if (t === 'fema') return 'FEMA ' + (f.femaNumber || '—');
  if (t === 'self') return f.panelChair || '—';
  if (t === 'grn') return f.grnNumber || '—';
  if (t === 'supplier') return f.supplierName || '—';
  return '—';
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

function startVerify(id) {
  const ing = ingredientById(id);
  if (!ing) return;
  if (statusOf(id) !== 'unclear') { goto('submissions'); return; }
  state.screen = 'wizard';
  state.wizardStep = 0;
  state.activeIngredientId = id;
  state.docType = ing.rec;
  state.fields = prefillFor(ing);
  state.attest = { a: false, b: false, c: false };
  animateStep = true;
  render();
  scrollTop();
}

function goto(screen) {
  state.screen = screen;
  animateStep = true;
  render();
  scrollTop();
}

function setStep(n) { state.wizardStep = n; animateStep = true; render(); }
function pickDoc(id) { state.docType = id; render(); }
function setField(k, v) { state.fields = { ...state.fields, [k]: v }; render(true); }
function toggleAttest(k) { state.attest = { ...state.attest, [k]: !state.attest[k] }; render(); }

function uploadFile() {
  const ing = ingredientById(state.activeIngredientId);
  const name = `${state.docType}-${ing ? ing.id : 'doc'}-2026.pdf`;
  state.fields = { ...state.fields, fileName: name };
  render();
}

function nextStep() { if (state.wizardStep < STEP_DEFS.length - 1 && canProceed()) setStep(state.wizardStep + 1); }
function backStep() { if (state.wizardStep > 0) setStep(state.wizardStep - 1); else goto('report'); }

function submitGras() {
  const ing = ingredientById(state.activeIngredientId);
  if (!ing) return;
  const sub = {
    id: 'GRAS-' + Math.floor(1000 + Math.random() * 9000),
    ingredientId: ing.id,
    docType: state.docType,
    status: 'pending',
    date: 'Jun 22, 2026',
    products: ing.products,
    ref: reviewRef(),
  };
  state.submissions = [sub, ...state.submissions];
  state.lastSubmissionId = sub.id;
  goto('confirm');
}

function reviewSubmission(subId) {
  const sub = state.submissions.find((s) => s.id === subId);
  if (!sub) return;
  state.submissions = state.submissions.map((x) => (x.id === subId ? { ...x, status: 'verified' } : x));
  if (!state.verified.includes(sub.ingredientId)) state.verified = [...state.verified, sub.ingredientId];
  state.lastResult = sub.ingredientId;
  state.docType = sub.docType;
  state.activeIngredientId = sub.ingredientId;
  goto('result');
}

function scrollTop() {
  rootEl?.closest('.agent-main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ------------------------------------------------------------------ */
/* Shared chrome                                                       */
/* ------------------------------------------------------------------ */

function headerHTML() {
  let back = '';
  let title = 'GRAS Verification';
  let meta = '';
  let action = '';

  if (state.screen === 'wizard') {
    const ing = ingredientById(state.activeIngredientId);
    back = `<button class="gv-back" type="button" data-gv="wizard-back" aria-label="Back" title="Back"><span class="material-symbols-outlined">arrow_back</span></button>`;
    title = `Verify · ${esc(ing ? ing.name : '')}`;
    meta = `${esc(ing ? ing.kind : 'Ingredient')} · ${ing ? ing.products : 0} products affected`;
  } else if (state.screen === 'submissions') {
    back = `<button class="gv-back" type="button" data-gv="go-report" aria-label="Back to GRAS Verification" title="Back to GRAS Verification"><span class="material-symbols-outlined">arrow_back</span></button>`;
    title = 'GRAS Submissions';
    meta = 'Review queue';
  } else if (state.screen === 'confirm' || state.screen === 'result') {
    back = `<button class="gv-back" type="button" data-gv="go-report" aria-label="Back to GRAS Verification" title="Back to GRAS Verification"><span class="material-symbols-outlined">arrow_back</span></button>`;
  } else {
    /* Report screen — the Submissions / Review-queue action floats right on the
       headline row, so the search below can span the full width. */
    action = headActionHTML();
  }

  return `
    <header class="gv-head">
      ${back}
      <div class="gv-head-main">
        <h1 class="gv-head-title">${esc(title)}</h1>
        ${meta ? `<p class="gv-head-meta">${meta}</p>` : ''}
      </div>
      ${action}
    </header>`;
}

/* The Submissions / Review-queue action that sits on the headline row. */
function headActionHTML() {
  const m = metrics();
  return m.inReview
    ? `<button class="gv-cta gv-head-action" type="button" data-gv="go-submissions"><span class="material-symbols-outlined">assignment_turned_in</span>Review queue · ${m.inReview}</button>`
    : `<button class="gv-cta gv-cta--ghost gv-head-action" type="button" data-gv="go-submissions"><span class="material-symbols-outlined">assignment_turned_in</span>Submissions</button>`;
}

/* Report toolbar — the search pill spans the full width, with a filter control
   tucked inside its trailing edge that pops a panel to slice the flagged list by
   the same facets shown on the page (status, ingredient type, pathway). */
function toolbarHTML() {
  const count = activeFilterCount();
  return `
    <div class="gv-toolbar">
      <div class="gv-search-inline">
        <span class="material-symbols-outlined">search</span>
        <input id="gv-search" class="gv-search gv-search--hasfilter" type="text" placeholder="Search ingredients or type" value="${esc(state.search)}" data-gv="search" autocomplete="off" aria-label="Search ingredients" />
        <button type="button" class="gv-filter-btn${count ? ' is-active' : ''}${state.filterOpen ? ' is-open' : ''}" data-gv="filter-open" aria-haspopup="dialog" aria-expanded="${state.filterOpen}" aria-label="Filter ingredients" title="Filter ingredients">
          <span class="material-symbols-outlined">tune</span>
          ${count ? `<span class="gv-filter-count">${count}</span>` : ''}
        </button>
        ${state.filterOpen ? filterPopoverHTML() : ''}
      </div>
    </div>`;
}

/* A single toggle row inside the filter popover. */
function filterOptionRow(dim, val, label, icon) {
  const on = (state.filters[dim] || []).includes(val);
  return `
    <button type="button" class="gv-fopt${on ? ' is-on' : ''}" data-gv="filter-toggle" data-dim="${esc(dim)}" data-val="${esc(val)}" role="checkbox" aria-checked="${on}">
      <span class="gv-fopt-check material-symbols-outlined">${on ? 'check_box' : 'check_box_outline_blank'}</span>
      ${icon ? `<span class="gv-fopt-ic material-symbols-outlined">${esc(icon)}</span>` : ''}
      <span class="gv-fopt-label">${esc(label)}</span>
    </button>`;
}

/* The filter popover — one section per facet the report already exposes:
   GRAS status, ingredient type, and recommended documentation pathway. */
function filterPopoverHTML() {
  const kinds = [...new Set(INGREDIENTS.map((i) => i.kind))];
  const count = activeFilterCount();
  const statusOrder = ['unclear', 'pending', 'verified'];
  return `
    <div class="gv-filter-pop" role="dialog" aria-label="Filter ingredients">
      <div class="gv-filter-pop-head">
        <span class="gv-filter-pop-title">Filter</span>
        ${count ? `<button type="button" class="gv-filter-clear" data-gv="filter-clear">Clear all</button>` : ''}
      </div>
      <div class="gv-filter-sec">
        <div class="gv-filter-sec-label">GRAS status</div>
        <div class="gv-filter-opts">
          ${statusOrder.map((s) => filterOptionRow('status', s, STATUS_META[s].label, STATUS_META[s].icon)).join('')}
        </div>
      </div>
      <div class="gv-filter-sec">
        <div class="gv-filter-sec-label">Ingredient type</div>
        <div class="gv-filter-opts">
          ${kinds.map((k) => filterOptionRow('kind', k, k, KIND_ICON[k])).join('')}
        </div>
      </div>
      <div class="gv-filter-sec">
        <div class="gv-filter-sec-label">Recommended pathway</div>
        <div class="gv-filter-opts">
          ${DOC_TYPES.map((d) => filterOptionRow('rec', d.id, d.name, d.icon)).join('')}
        </div>
      </div>
    </div>`;
}

/* Scorecards — one tile per portfolio-level GRAS metric, mirroring the Non-UPF
   glance strip. */
function glanceHTML() {
  const m = metrics();
  const tile = (num, cap, mod, icon) =>
    `<div class="gv-stat${mod ? ' ' + mod : ''}">` +
    `<span class="gv-stat-num">${esc(num)}</span>` +
    `<span class="gv-stat-label">${icon ? `<span class="material-symbols-outlined">${esc(icon)}</span>` : ''}${esc(cap)}</span>` +
    `</div>`;
  return `
    <div class="gv-stats">
      ${tile(`${m.grasPct}%`, 'GRAS coverage', 'gv-stat--verified', 'verified_user')}
      ${tile(String(m.flaggedRemaining), 'Flagged ingredients', 'gv-stat--warn')}
      ${tile(String(m.inReview), 'In review', 'gv-stat--info')}
      ${tile(String(m.verifiedCount), 'Verified', 'gv-stat--ok')}
    </div>`;
}

/* Ingredient status chip — the shield lifecycle in GRAS language. */
const STATUS_META = {
  unclear: { cls: 'gv-chip--warn', icon: 'help', label: 'Unclear' },
  pending: { cls: 'gv-chip--info', icon: 'hourglass_top', label: 'In review' },
  verified: { cls: 'gv-chip--ok', icon: 'verified_user', label: 'GRAS' },
};
function statusPill(status) {
  const m = STATUS_META[status] || STATUS_META.unclear;
  return `<span class="gv-chip ${m.cls}"><span class="material-symbols-outlined">${m.icon}</span>${esc(m.label)}</span>`;
}

/* Round ingredient glyph, echoing the Non-UPF circular thumb but flavour-coded
   by pathway kind. */
const KIND_ICON = {
  'Flavoring': 'local_florist',
  'Flavor enhancer': 'restaurant',
  'Thickener': 'blender',
  'Dietary fiber': 'grass',
  'Carrier / processing aid': 'science',
};
function ingredientGlyph(ing) {
  const icon = KIND_ICON[ing.kind] || 'science';
  return `<span class="gv-glyph"><span class="material-symbols-outlined">${esc(icon)}</span></span>`;
}

/* ------------------------------------------------------------------ */
/* Screen — Report (flagged ingredients)                               */
/* ------------------------------------------------------------------ */

function reportHTML() {
  const rows = INGREDIENTS.filter((ing) => matchesSearch(ing) && matchesFilters(ing));
  const bodyRows = rows.map((ing) => {
    const status = statusOf(ing.id);
    const rec = docTypeById(ing.rec);
    const action = status === 'unclear'
      ? `<button class="gv-row-cta" type="button" data-gv="verify" data-ing="${ing.id}">Verify<span class="material-symbols-outlined">arrow_forward</span></button>`
      : status === 'pending'
        ? `<button class="gv-row-cta gv-row-cta--ghost" type="button" data-gv="go-submissions"><span class="material-symbols-outlined">hourglass_top</span>In review</button>`
        : `<span class="gv-row-done"><span class="material-symbols-outlined">check</span>Verified</span>`;
    return `
      <tr class="gv-row" data-ing="${ing.id}">
        <td>
          <div class="gv-icell">
            ${ingredientGlyph(ing)}
            <div class="gv-icell-text">
              <div class="gv-iname-row"><span class="gv-iname">${esc(ing.name)}</span></div>
              <span class="gv-ikind">${esc(ing.kind)} · rec. ${esc(rec ? rec.name : '')}</span>
            </div>
          </div>
        </td>
        <td class="gv-col-impact">
          <div class="gv-impact-cell">
            <span class="gv-impact-num">${ing.products}</span>
            <span class="gv-impact-cap">product${ing.products === 1 ? '' : 's'} · ${ing.pct}% of portfolio</span>
          </div>
        </td>
        <td class="gv-col-status">${statusPill(status)}</td>
        <td class="gv-col-action">${action}</td>
      </tr>`;
  }).join('');

  return `
    ${toolbarHTML()}
    <div class="gv-board">
      ${glanceHTML()}
      <div class="gv-board-divider"></div>
      <p class="gv-board-lead">These ingredients have <strong>no established GRAS basis</strong> in WISEcode, so every product containing them is flagged. Document an ingredient once and the status applies portfolio-wide.</p>
      <table class="gv-table">
        <thead>
          <tr>
            <th>Ingredient</th>
            <th class="gv-col-impact">Portfolio impact</th>
            <th class="gv-col-status">GRAS status</th>
            <th class="gv-col-action"></th>
          </tr>
        </thead>
        <tbody>
          ${bodyRows || `<tr><td colspan="4" class="gv-empty">No ingredients match your ${activeFilterCount() ? 'filters' : 'search'}.</td></tr>`}
        </tbody>
      </table>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Screen — Wizard                                                     */
/* ------------------------------------------------------------------ */

function wizardBodyHTML() {
  const st = state.wizardStep;
  if (st === 0) return stepImpactHTML();
  if (st === 1) return stepDocsHTML();
  if (st === 2) return stepAttestHTML();
  return stepReviewHTML();
}

/* The step's primary action lives in a toolbar at the TOP of the wizard (like
   the product-portfolio / Non-UPF toolbars) — not a footer. "Back" is the
   header arrow, so there's no Cancel here. */
function wizardTopHTML() {
  const st = state.wizardStep;
  const disabled = !canProceed();
  const primary = st < STEP_DEFS.length - 1
    ? `<button class="gv-cta" type="button" data-gv="next" ${disabled ? 'disabled' : ''}>Continue<span class="material-symbols-outlined">arrow_forward</span></button>`
    : `<button class="gv-cta" type="button" data-gv="submit"><span class="material-symbols-outlined">verified_user</span>Submit for review</button>`;
  return `<div class="gv-toolbar gv-toolbar--wizard">${primary}</div>`;
}

function wizardHTML() {
  return `
    ${wizardTopHTML()}
    <div class="gv-wizard-card">
      <div class="gv-wizard-body">${wizardBodyHTML()}</div>
    </div>`;
}

function stepImpactHTML() {
  const ing = ingredientById(state.activeIngredientId);
  if (!ing) return '';
  const rows = ing.samples.map((s) => `
    <div class="gv-prod-row">
      <div class="gv-prod-main">
        <span class="material-symbols-outlined gv-prod-ic">inventory_2</span>
        <div class="gv-prod-text">
          <span class="gv-prod-name">${esc(s.n)}</span>
          <span class="gv-prod-upc">UPC · ${esc(s.upc)}</span>
        </div>
      </div>
      <span class="gv-prod-status">${esc(ing.blocks)}</span>
    </div>`).join('');
  return `
    <div class="${stepAnim()}">
      <h2 class="gv-step-title">What this verification unlocks</h2>
      <p class="gv-step-desc">“${esc(ing.name)}” currently has no established GRAS basis in WISEcode, so every product containing it is flagged. Provide documentation once and the status applies portfolio-wide.</p>

      <div class="gv-impact-grid">
        <div class="gv-impact-tile gv-impact-tile--primary">
          <div class="gv-impact-tile-cap">Products affected</div>
          <div class="gv-impact-tile-num">${ing.products}</div>
          <div class="gv-impact-tile-sub">${ing.pct}% of your portfolio</div>
        </div>
        <div class="gv-impact-tile">
          <div class="gv-impact-tile-cap">Status they block</div>
          <div class="gv-impact-tile-num gv-impact-tile-num--warn">${esc(ing.blocks)}</div>
          <div class="gv-impact-tile-sub">→ becomes <strong class="gv-ok-text">GRAS</strong> once verified</div>
        </div>
      </div>

      <div class="gv-subhead">Products that will clear (${ing.products})</div>
      <div class="gv-prod-list">
        ${rows}
        ${ing.samples.length < ing.products ? `<div class="gv-prod-more">${esc(moreText(ing, 'will clear'))}</div>` : ''}
      </div>
    </div>`;
}

function fieldRow(label, key, opts = {}) {
  const val = state.fields[key] || '';
  const type = opts.type || 'text';
  const ph = opts.placeholder || '';
  return `
    <label class="gv-field">
      <span class="gv-field-label">${esc(label)}</span>
      <input class="gv-input" type="${type}" value="${esc(val)}" placeholder="${esc(ph)}" data-gv-field="${key}" autocomplete="off" />
    </label>`;
}

function stepDocsHTML() {
  const t = state.docType;
  const doc = docTypeById(t);
  const ing = ingredientById(state.activeIngredientId);
  const hasFile = !!state.fields.fileName;

  /* Pathway selection cards (previously its own step, now folded in). */
  const cards = DOC_TYPES.map((d) => {
    const active = d.id === state.docType;
    const recommended = ing && ing.rec === d.id;
    return `
      <button type="button" class="gv-doc-card ${active ? 'is-active' : ''}" data-gv="pick-doc" data-doc="${d.id}">
        ${recommended ? '<span class="gv-doc-rec">Recommended</span>' : ''}
        <span class="gv-doc-ic"><span class="material-symbols-outlined">${d.icon}</span></span>
        <span class="gv-doc-text">
          <span class="gv-doc-name">${esc(d.name)}</span>
          <span class="gv-doc-for">For: ${esc(d.forText)}</span>
          <span class="gv-doc-desc">${esc(d.desc)}</span>
        </span>
      </button>`;
  }).join('');

  let fields = '';
  if (t === 'fema') {
    fields = `
      ${fieldRow('FEMA number(s)', 'femaNumber', { placeholder: 'e.g. 2922, 3107' })}
      ${fieldRow('Flavor name', 'flavorName', { placeholder: 'Named flavor substance(s)' })}
      ${fieldRow('Flavor supplier', 'femaSupplier', { placeholder: 'Supplier / house' })}`;
  } else if (t === 'self') {
    fields = `
      ${fieldRow('Expert-panel chair', 'panelChair', { placeholder: 'Name, credentials' })}
      ${fieldRow('Panel members', 'panelMembers', { type: 'number', placeholder: 'e.g. 3' })}
      ${fieldRow('Conclusion date', 'conclusionDate', { type: 'date' })}
      ${fieldRow('Intended use', 'intendedUse', { placeholder: 'How the ingredient is used' })}`;
  } else if (t === 'grn') {
    fields = `
      ${fieldRow('GRAS Notice (GRN) number', 'grnNumber', { placeholder: 'e.g. GRN 000783' })}
      ${fieldRow('Filing date', 'filingDate', { type: 'date' })}
      ${fieldRow('FDA response', 'fdaResponse', { placeholder: 'No questions' })}`;
  } else {
    fields = `
      ${fieldRow('Supplier name', 'supplierName', { placeholder: 'Issuing supplier' })}
      ${fieldRow('Letter date', 'letterDate', { type: 'date' })}
      ${fieldRow('Compliance contact', 'contact', { placeholder: 'name@supplier.com' })}`;
  }

  const upload = hasFile
    ? `<div class="gv-file gv-file--done">
         <span class="gv-file-ic"><span class="material-symbols-outlined">description</span></span>
         <div class="gv-file-text"><span class="gv-file-name">${esc(state.fields.fileName)}</span><span class="gv-file-sub">Attached · PDF</span></div>
         <button class="gv-file-x" type="button" data-gv="remove-file" aria-label="Remove file"><span class="material-symbols-outlined">close</span></button>
       </div>`
    : `<button type="button" class="gv-file gv-file--drop" data-gv="upload">
         <span class="gv-file-ic"><span class="material-symbols-outlined">upload_file</span></span>
         <div class="gv-file-text"><span class="gv-file-name">Attach your ${esc(doc ? doc.name : 'GRAS')} document</span><span class="gv-file-sub">PDF up to 25 MB</span></div>
       </button>`;

  return `
    <div class="${stepAnim()}">
      <h2 class="gv-step-title">Choose a pathway &amp; provide your documentation</h2>
      <p class="gv-step-desc">Pick the GRAS pathway for “${esc(ing ? ing.name : '')}” — we've pre-selected the recommended route — then attach the document and confirm its key details.</p>
      <div class="gv-doc-grid">${cards}</div>
      <div class="gv-subhead gv-subhead--spaced">Provide your ${esc(doc ? doc.name : 'GRAS')} document</div>
      ${upload}
      <div class="gv-field-grid">${fields}</div>
    </div>`;
}

function stepAttestHTML() {
  const at = state.attest;
  const items = [
    { key: 'a', label: 'I am authorized to submit GRAS documentation on behalf of Nutrient Survival.' },
    { key: 'b', label: 'The attached documentation is accurate, complete, and current.' },
    { key: 'c', label: 'I understand WISEcode will review this submission before the GRAS status is updated.' },
  ];
  const rows = items.map((it) => {
    const on = at[it.key];
    return `
      <label class="gv-attest ${on ? 'is-checked' : ''}">
        <button class="gv-check" type="button" data-gv="attest" data-key="${it.key}" role="checkbox" aria-checked="${on}">
          <span class="material-symbols-outlined">${on ? 'check_box' : 'check_box_outline_blank'}</span>
        </button>
        <span class="gv-attest-text">${esc(it.label)}</span>
      </label>`;
  }).join('');
  return `
    <div class="${stepAnim()}">
      <h2 class="gv-step-title">Attestation</h2>
      <p class="gv-step-desc">Confirm the following before this GRAS submission enters review.</p>
      <div class="gv-attest-list">${rows}</div>
    </div>`;
}

function stepReviewHTML() {
  const ing = ingredientById(state.activeIngredientId);
  const doc = docTypeById(state.docType);
  const rows = [
    { label: 'Ingredient', val: ing ? ing.name : '—' },
    { label: 'Documentation type', val: doc ? doc.name : '—' },
    { label: 'Key reference', val: reviewRef() },
    { label: 'Attached document', val: state.fields.fileName || '—' },
    { label: 'Products it will clear', val: ing ? `${ing.products} (${ing.pct}% of portfolio)` : '—' },
    { label: 'Attestation', val: 'Signed · 3 of 3 confirmed' },
  ];
  return `
    <div class="${stepAnim()}">
      <h2 class="gv-step-title">Review &amp; submit</h2>
      <p class="gv-step-desc">Confirm the packet below. On submit it enters the WISEcode review queue; once cleared, “${esc(ing ? ing.name : '')}” flips to GRAS across all ${ing ? ing.products : 0} products.</p>
      <div class="gv-review">
        ${rows.map((r) => `<div class="gv-review-row"><span class="gv-review-label">${esc(r.label)}</span><span class="gv-review-val">${esc(r.val)}</span></div>`).join('')}
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Screen — Confirm                                                    */
/* ------------------------------------------------------------------ */

function confirmHTML() {
  const ing = ingredientById(state.activeIngredientId);
  return `
    <div class="gv-outcome gv-step-anim">
      <div class="gv-outcome-icon gv-outcome-icon--info"><span class="material-symbols-outlined">hourglass_top</span></div>
      <h2 class="gv-outcome-title">Submission received</h2>
      <p class="gv-outcome-text">Your GRAS documentation for <strong>${esc(ing ? ing.name : '')}</strong> is in the WISEcode review queue as <strong>${esc(state.lastSubmissionId)}</strong>. Once cleared it will flip <strong>${ing ? ing.products : 0} products</strong> to GRAS automatically.</p>
      <div class="gv-outcome-actions">
        <button class="gv-btn gv-btn--ghost" type="button" data-gv="go-report">Verify another ingredient</button>
        <button class="gv-btn gv-btn--primary" type="button" data-gv="go-submissions"><span class="material-symbols-outlined">assignment_turned_in</span>View submissions</button>
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Screen — Submissions (review queue)                                 */
/* ------------------------------------------------------------------ */

function submissionsHTML() {
  if (!state.submissions.length) {
    return `
      <div class="gv-board">
        <div class="gv-empty gv-empty--pad">
          <span class="material-symbols-outlined">inbox</span>
          <p>No submissions yet. Verify a flagged ingredient to start a GRAS submission.</p>
          <button class="gv-btn gv-btn--primary" type="button" data-gv="go-report"><span class="material-symbols-outlined">arrow_back</span>Back to ingredients</button>
        </div>
      </div>`;
  }
  const rows = state.submissions.map((s) => {
    const ing = ingredientById(s.ingredientId);
    const doc = docTypeById(s.docType);
    const status = s.status;
    const chip = status === 'verified' ? statusPill('verified') : statusPill('pending');
    const action = status === 'pending'
      ? `<button class="gv-row-cta" type="button" data-gv="review-sub" data-sub="${s.id}"><span class="material-symbols-outlined">rule</span>Run WISEcode review</button>`
      : `<button class="gv-row-cta gv-row-cta--ghost" type="button" data-gv="open-result" data-ing="${s.ingredientId}"><span class="material-symbols-outlined">visibility</span>View result</button>`;
    return `
      <tr class="gv-row">
        <td>
          <div class="gv-icell">
            ${ingredientGlyph(ing)}
            <div class="gv-icell-text">
              <div class="gv-iname-row"><span class="gv-iname">${esc(ing.name)}</span></div>
              <span class="gv-ikind">${esc(doc ? doc.name : '')} · ${esc(s.ref)}</span>
            </div>
          </div>
        </td>
        <td class="gv-col-mono">${esc(s.id)}</td>
        <td class="gv-col-status">${chip}</td>
        <td class="gv-col-action">${action}</td>
      </tr>`;
  }).join('');
  return `
    <div class="gv-board">
      ${glanceHTML('Submissions in the GRAS review queue')}
      <div class="gv-board-divider"></div>
      <table class="gv-table">
        <thead>
          <tr>
            <th>Ingredient · pathway</th>
            <th class="gv-col-mono">Submission</th>
            <th class="gv-col-status">Status</th>
            <th class="gv-col-action"></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Screen — Result                                                     */
/* ------------------------------------------------------------------ */

function resultHTML() {
  const ing = ingredientById(state.lastResult);
  if (!ing) return '';
  const m = metrics();
  const prevProducts = Math.min(PORTFOLIO_TOTAL, BASE_GRAS_PRODUCTS + (m.flipped - ing.products));
  const prevPct = Math.round((prevProducts / PORTFOLIO_TOTAL) * 100);
  const rows = ing.samples.map((s) => `
    <div class="gv-prod-row">
      <div class="gv-prod-main">
        <span class="material-symbols-outlined gv-prod-ic">inventory_2</span>
        <div class="gv-prod-text">
          <span class="gv-prod-name">${esc(s.n)}</span>
          <span class="gv-prod-upc">UPC · ${esc(s.upc)}</span>
        </div>
      </div>
      <span class="gv-prod-status gv-prod-status--ok"><span class="material-symbols-outlined">verified_user</span>GRAS</span>
    </div>`).join('');
  return `
    <div class="gv-outcome gv-step-anim">
      <div class="gv-outcome-icon gv-outcome-icon--ok"><span class="material-symbols-outlined">verified_user</span></div>
      <h2 class="gv-outcome-title">${esc(ing.name)} is now GRAS</h2>
      <p class="gv-outcome-text">WISEcode reviewed your documentation and established a GRAS basis for <strong>${esc(ing.name)}</strong>. <strong>${ing.products} products</strong> just moved to GRAS across your portfolio.</p>
      <div class="gv-outcome-jump">
        <span class="gv-jump-from">${prevPct}%</span>
        <span class="material-symbols-outlined">trending_flat</span>
        <span class="gv-jump-to">${m.grasPct}%</span>
        <span class="gv-jump-cap">portfolio GRAS coverage</span>
      </div>
      <div class="gv-subhead">Products moved to GRAS (${ing.products})</div>
      <div class="gv-prod-list">
        ${rows}
        ${ing.samples.length < ing.products ? `<div class="gv-prod-more">${esc(moreText(ing, 'moved to GRAS'))}</div>` : ''}
      </div>
      <div class="gv-outcome-actions">
        <button class="gv-btn gv-btn--ghost" type="button" data-gv="go-submissions">Back to submissions</button>
        <button class="gv-btn gv-btn--primary" type="button" data-gv="go-report"><span class="material-symbols-outlined">verified</span>Verify another ingredient</button>
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Progress module (right-hand pane)                                   */
/* ------------------------------------------------------------------ */

/* The pane tracks a single in-flight verification, so it's only ever rendered
   while the wizard is open (renderProgress hides it otherwise): a 5-step
   vertical stepper mirroring the Non-UPF progress module. */
function progressPaneHTML() {
  return progressWizardHTML();
}

function stepFields(idx) {
  const f = state.fields;
  const doc = docTypeById(state.docType);
  const ing = ingredientById(state.activeIngredientId);
  if (idx === 0) return [{ label: 'Ingredient', val: ing ? ing.name : '—', done: true }];
  if (idx === 1) return [
    { label: 'Pathway', val: doc ? doc.name : 'Not chosen', done: !!state.docType },
    { label: 'Document', val: f.fileName ? 'Attached' : 'Pending', done: !!f.fileName },
    { label: 'Key reference', val: reviewRef(), done: requiredFilled() },
  ];
  if (idx === 2) {
    const n = ['a', 'b', 'c'].filter((k) => state.attest[k]).length;
    return [{ label: 'Attestation', val: `${n} of 3`, done: n === 3 }];
  }
  return [{ label: 'Ready', val: 'Confirm & submit', done: false }];
}

function progressWizardHTML() {
  const ws = state.wizardStep;
  const ing = ingredientById(state.activeIngredientId);
  const completed = ws; /* steps before the active one are done */
  const pct = Math.round((completed / STEP_DEFS.length) * 100);

  const stepsHtml = STEP_DEFS.map((s, i) => {
    const done = i < ws;
    const isActive = i === ws;
    const cls = done ? 'gvp-step--done' : isActive ? 'gvp-step--active' : '';
    const num = done ? '<span class="material-symbols-outlined">check</span>' : String(i + 1);
    let sub = '';
    if (done) sub = 'Completed';
    else if (isActive) sub = 'In progress';
    const nodeAttrs = done ? `role="button" tabindex="0" data-gv-step="${i}" aria-label="Back to ${esc(s.label)}"` : '';

    let fieldsHtml = '';
    if (done || isActive) {
      const rows = stepFields(i).map((f) => {
        const icon = f.done ? 'check' : 'radio_button_unchecked';
        const st = f.done ? 'gvp-field--done' : 'gvp-field--active';
        return `<div class="gvp-field ${st}"><span class="material-symbols-outlined">${icon}</span><span class="gvp-field-label">${esc(f.label)}</span><span class="gvp-field-val">${esc(f.val)}</span></div>`;
      }).join('');
      fieldsHtml = `<div class="gvp-fields">${rows}</div>`;
    }

    return `
      <div class="gvp-step ${cls}">
        <div class="gvp-step-track"><div class="gvp-step-num" ${nodeAttrs}>${num}</div><div class="gvp-step-line"></div></div>
        <div class="gvp-step-body">
          <div class="gvp-step-title">${esc(s.label)}</div>
          ${sub ? `<div class="gvp-step-sub">${esc(sub)}</div>` : ''}
          ${fieldsHtml}
        </div>
      </div>`;
  }).join('');

  return `
    <div class="gvp-inner ${progressMin ? 'is-min' : ''}">
      <div class="gvp-header">
        <div class="gvp-pct-ring" style="--pct:${pct}"><span>${pct}%</span></div>
        <div class="gvp-header-text">
          <div class="gvp-title">Verification progress</div>
          <div class="gvp-subtitle">GRAS · ${STEP_DEFS.length} steps</div>
        </div>
        <button type="button" class="gvp-min-btn" data-gv-min aria-label="${progressMin ? 'Expand progress' : 'Collapse progress'}" title="${progressMin ? 'Expand' : 'Collapse'}"><span class="material-symbols-outlined">${progressMin ? 'chevron_left' : 'chevron_right'}</span></button>
      </div>
      <div class="gvp-progress">
        <div class="gvp-progress-head"><span>${completed} of ${STEP_DEFS.length} steps</span><span class="gvp-progress-pct">${pct}%</span></div>
        <div class="gvp-progress-track"><div class="gvp-progress-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="gvp-steps">${stepsHtml}</div>
      ${ing ? `
      <div class="gvp-foot">
        <div class="gvp-foot-row"><span>Verifying</span><span>${esc(ing.name)}</span></div>
        <div class="gvp-foot-row gvp-foot-total"><span>Products it clears</span><span class="gvp-foot-amt">${ing.products}</span></div>
      </div>` : ''}
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Render + wiring                                                     */
/* ------------------------------------------------------------------ */

let rootEl = null;
let progressEl = null;
/* Guards the one-time document listeners that dismiss the filter popover. */
let filterDismissBound = false;
/* Progress module defaults to the minimal (collapsed) view; header button toggles it. */
let progressMin = true;
/* The entrance "pop" animation should only play when the step/screen actually
   CHANGES — not on in-step re-renders (doc pick, field input, attest toggle),
   otherwise every click replays the animation and the panel appears to blink.
   setStep / goto / startVerify flip this on; render() consumes it. */
let animateStep = false;
function stepAnim() { return animateStep ? 'gv-step-anim' : ''; }

function bodyHTML() {
  switch (state.screen) {
    case 'wizard': return wizardHTML();
    case 'confirm': return confirmHTML();
    case 'submissions': return submissionsHTML();
    case 'result': return resultHTML();
    default: return reportHTML();
  }
}

function renderProgress() {
  if (!progressEl) return;
  /* The pane tracks a single in-flight verification, so it only exists while the
     wizard is open — off the wizard it's hidden entirely (not just emptied), so
     the flow surface gets the full width until Verify is clicked. */
  const show = state.screen === 'wizard';
  progressEl.hidden = !show;
  progressEl.innerHTML = show ? progressPaneHTML() : '';
}

function render(preserveFocus) {
  if (!rootEl) return;
  const active = document.activeElement;
  const focusKey = preserveFocus && active && active.dataset ? (active.id === 'gv-search' ? 'gv-search' : active.dataset.gvField || null) : null;
  /* selectionStart throws on number/date inputs (used in the docs step), so
     read it defensively — losing the caret is fine, a thrown re-render isn't. */
  let caret = null;
  if (focusKey) { try { caret = active.selectionStart; } catch (_) { caret = null; } }

  rootEl.innerHTML = `
    ${headerHTML()}
    <div class="gv-body gv-body--${state.screen}">${bodyHTML()}</div>`;

  if (focusKey) {
    const sel = focusKey === 'gv-search' ? '#gv-search' : `[data-gv-field="${focusKey}"]`;
    const inp = rootEl.querySelector(sel);
    if (inp) { inp.focus(); if (caret != null && inp.setSelectionRange) { try { inp.setSelectionRange(caret, caret); } catch (_) {} } }
  }
  renderProgress();
  /* Consume the one-shot entrance-animation flag so the next in-step re-render
     (doc pick, field input, attest toggle) doesn't replay it. */
  animateStep = false;
}

function mountProgressPane() {
  const row = document.getElementById('modules-row');
  if (!row) return;
  progressEl = document.getElementById('gv-progress-pane');
  if (!progressEl) {
    progressEl = document.createElement('aside');
    progressEl.id = 'gv-progress-pane';
    progressEl.className = 'gv-progress-pane';
    progressEl.setAttribute('aria-label', 'GRAS verification progress');
    const main = document.getElementById('agent-main');
    if (main && main.nextSibling) row.insertBefore(progressEl, main.nextSibling);
    else row.appendChild(progressEl);
  }
}

function onAction(action, el) {
  switch (action) {
    case 'verify': startVerify(el.dataset.ing); break;
    case 'filter-open': state.filterOpen = !state.filterOpen; render(); break;
    case 'filter-toggle': toggleFilter(el.dataset.dim, el.dataset.val); break;
    case 'filter-clear': clearFilters(); break;
    case 'next': nextStep(); break;
    case 'wizard-back': backStep(); break;
    case 'pick-doc': pickDoc(el.dataset.doc); break;
    case 'upload': uploadFile(); break;
    case 'remove-file': setField('fileName', ''); break;
    case 'attest': toggleAttest(el.dataset.key); break;
    case 'submit': submitGras(); gvToast('Submitted for WISEcode review.', 'verified_user'); break;
    case 'go-report': goto('report'); break;
    case 'go-submissions': goto('submissions'); break;
    case 'review-sub':
      reviewSubmission(el.dataset.sub);
      gvToast('WISEcode review complete — GRAS basis established.', 'verified_user');
      break;
    case 'open-result':
      state.lastResult = el.dataset.ing;
      goto('result');
      break;
    default: break;
  }
  /* Mirror the interaction into the chat so clicking the UI reads like driving
     it from WISEcodeAI — the same you + reply turn a chip would produce. */
  mirrorUIAction(action, el);
}

/**
 * Render the GRAS verification flow into a host element (#agent-main-scroll).
 * @param {HTMLElement} mainEl
 */
export function renderGrasVerificationFlow(mainEl) {
  if (!mainEl) return;
  mainEl.innerHTML = '<div class="gv-root"></div>';
  rootEl = mainEl.querySelector('.gv-root');

  mountProgressPane();
  render();

  /* Flow clicks — action buttons + done-step jumps. */
  rootEl.addEventListener('click', (e) => {
    const el = e.target.closest('[data-gv]');
    if (el) { if (el.tagName === 'A') e.preventDefault(); onAction(el.dataset.gv, el); return; }
  });

  rootEl.addEventListener('input', (e) => {
    if (e.target.id === 'gv-search') { state.search = e.target.value; render(true); return; }
    const fieldEl = e.target.closest('[data-gv-field]');
    if (fieldEl) setField(fieldEl.dataset.gvField, fieldEl.value);
  });

  /* Dismiss the filter popover on an outside click or Escape. The re-render on
     each toggle detaches the clicked node, but its old ancestors still carry the
     popover/button markers, so closest() keeps those interactions from closing. */
  if (!filterDismissBound) {
    filterDismissBound = true;
    document.addEventListener('click', (e) => {
      if (!state.filterOpen) return;
      if (e.target.closest('.gv-filter-pop') || e.target.closest('[data-gv="filter-open"]')) return;
      state.filterOpen = false;
      render();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.filterOpen) { state.filterOpen = false; render(); }
    });
  }

  /* Progress pane — jump back to a completed step (wizard) or open an
     ingredient (portfolio summary). */
  const paneActivate = (target) => {
    const step = target.closest('[data-gv-step]');
    if (step) { setStep(Number(step.dataset.gvStep)); pushChat('Go back a step', stepNarration()); return; }
    const ing = target.closest('[data-gv-ing]');
    if (ing) {
      const v = ingredientById(ing.dataset.gvIng);
      if (v) {
        const st = statusOf(v.id);
        startVerify(v.id);
        if (st === 'unclear') pushChat(`Verify ${v.name}`, verifyStartedReply(v));
        else pushChat(`Open ${v.name}`, st === 'pending'
          ? `<strong>${v.name}</strong> is in review — opening the submission queue.`
          : `<strong>${v.name}</strong> is already GRAS. Opening the submission queue.`);
      }
    }
  };
  progressEl?.addEventListener('click', (e) => {
    if (e.target.closest('[data-gv-min]')) { progressMin = !progressMin; renderProgress(); return; }
    paneActivate(e.target);
  });
  progressEl?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (!e.target.closest('[data-gv-step],[data-gv-ing]')) return;
    e.preventDefault();
    paneActivate(e.target);
  });
}

/* ------------------------------------------------------------------ */
/* WISEcodeAI chat module (dock configuration)                             */
/* ------------------------------------------------------------------ */

/* The mounted shared-chat instance, handed over by agent-overview once the dock
   is up, so a direct UI interaction can be mirrored into the conversation. */
let chatApi = null;
export function setGrasChat(api) { chatApi = api; }

/* Post a mirrored turn into the chat — the action as a "you" line + WISEcodeAI's
   narration — so clicking in the flow reads exactly like driving it from chat. */
function pushChat(userLabel, replyHtml) {
  if (!chatApi) return;
  chatApi.hideWelcome?.();
  if (userLabel) chatApi.addUser(userLabel);
  /* respond() streams the shared reasoning trace before the reply lands, so a
     mirrored action reads like any other WISEcodeAI turn — never an instant paste. */
  if (replyHtml) (chatApi.respond || chatApi.addWISEcodeAI)(replyHtml);
}

/* Highest-leverage still-flagged ingredient (falls back to the first). */
function topFlagged() {
  return INGREDIENTS.find((i) => statusOf(i.id) === 'unclear') || INGREDIENTS[0];
}
function firstPending() {
  return state.submissions.find((s) => s.status === 'pending') || null;
}

/* ---- Shared reply builders — one source of truth for every narration, used
   by both the chat intent chips AND the UI-click mirroring. ---- */
function verifyStartedReply(ing) {
  const rec = docTypeById(ing.rec);
  return `Starting with <strong>${ing.name}</strong> — ${ing.products} products (${ing.pct}% of the portfolio) read as “${ing.blocks}”. I've opened the wizard and pre-selected the recommended <strong>${rec.name}</strong> pathway.<br><br>${ing.aiNote}`;
}
function pathwayReply(ing, doc) {
  return `Locked in the <strong>${doc.name}</strong> pathway for <strong>${ing.name}</strong> — the right basis for a ${ing.kind.toLowerCase()}. Next: attach the document.`;
}
function docsReply(ing, doc) {
  return `Attached a sample <strong>${doc.name}</strong> document and filled the key fields for <strong>${ing.name}</strong>. Review them, then sign the attestation.`;
}
function attestReply(ing, n) {
  return n >= 3
    ? `Attestation signed for <strong>${ing.name}</strong> — all three confirmations checked. You're ready to submit for review.`
    : `Attestation ${n} of 3 confirmed for <strong>${ing.name}</strong>. Check the remaining boxes to continue.`;
}
function submittedReply(sub, ing) {
  return sub
    ? `Submitted — <strong>${ing ? ing.name : 'the ingredient'}</strong> is in the review queue as <strong>${sub.id}</strong>. Once cleared it flips <strong>${sub.products} products</strong> to GRAS. Say “run the WISEcode review” to simulate the outcome.`
    : `Let's finish the wizard first — pick an ingredient and I'll take you straight through to submit.`;
}
function reviewedReply(ing) {
  return ing
    ? `WISEcode reviewed <strong>${ing.name}</strong> and established its GRAS basis — <strong>${ing.products} products</strong> just moved to GRAS. Your portfolio coverage is now <strong>${metrics().grasPct}%</strong>.`
    : `There's nothing in the review queue yet. Verify a flagged ingredient and submit it, then I can run the review.`;
}
function queueReply() {
  const m = metrics();
  if (!state.submissions.length) return `The review queue is empty. Verify a flagged ingredient to start a GRAS submission.`;
  return `You have <strong>${state.submissions.length}</strong> submission${state.submissions.length === 1 ? '' : 's'} — ${m.inReview} in review, ${m.verifiedCount} verified. Open a pending one to run the WISEcode review.`;
}
function resultReply(ing) {
  return `<strong>${ing.name}</strong> is now GRAS — ${ing.products} products moved across your portfolio. Coverage is <strong>${metrics().grasPct}%</strong>.`;
}
function reportReply() {
  const m = metrics();
  return `Here are your flagged ingredients — <strong>${m.flaggedRemaining}</strong> still need a GRAS basis. Pick one to verify and I'll drive the documentation from here.`;
}
/* Narrate whatever wizard step is now active (post-action). */
function stepNarration() {
  const st = state.wizardStep;
  const ing = ingredientById(state.activeIngredientId);
  const doc = docTypeById(state.docType);
  if (st === 0) return `You're on <strong>Impact</strong> for ${ing ? ing.name : 'this ingredient'} — ${ing ? ing.products : 0} products will clear. Continue when you're ready.`;
  if (st === 1) return requiredFilled()
    ? `Pathway chosen and the document's in — continue to the attestation.`
    : `Choose the GRAS pathway${doc ? ` (<strong>${doc.name}</strong> is recommended)` : ''}, then attach the document and confirm its key fields to continue.`;
  if (st === 2) return canProceed() ? `Attestation signed. Continue to review.` : `Sign all three attestations to continue.`;
  return `Everything's ready on <strong>Review &amp; submit</strong> — submit to send the packet to WISEcode.`;
}

/* Mirror a direct UI interaction into the chat as a you + WISEcodeAI turn, reading
   post-action state so the narration matches what the surface now shows. */
function mirrorUIAction(action, el) {
  const ing = ingredientById(state.activeIngredientId);
  switch (action) {
    case 'verify': {
      const v = ingredientById(el.dataset.ing);
      if (v) pushChat(`Verify ${v.name}`, verifyStartedReply(v));
      break;
    }
    case 'pick-doc': {
      const doc = docTypeById(el.dataset.doc);
      if (ing && doc) pushChat(`Use the ${doc.name} pathway`, pathwayReply(ing, doc));
      break;
    }
    case 'upload':
      if (ing) pushChat('Attach the document', docsReply(ing, docTypeById(state.docType)));
      break;
    case 'remove-file':
      pushChat('Remove the document', `Removed the attachment${ing ? ` for ${ing.name}` : ''}. Attach a document to continue.`);
      break;
    case 'attest': {
      const n = ['a', 'b', 'c'].filter((k) => state.attest[k]).length;
      if (ing) pushChat(n >= 3 ? 'Sign the attestation' : 'Update the attestation', attestReply(ing, n));
      break;
    }
    case 'next':
      pushChat('Continue', stepNarration());
      break;
    case 'wizard-back':
      pushChat('Go back', state.screen === 'report' ? reportReply() : stepNarration());
      break;
    case 'submit': {
      const sub = state.submissions[0];
      pushChat('Submit for review', submittedReply(sub, sub ? ingredientById(sub.ingredientId) : null));
      break;
    }
    case 'go-submissions':
      pushChat('Open the review queue', queueReply());
      break;
    case 'go-report':
      pushChat('Verify another ingredient', reportReply());
      break;
    case 'review-sub':
      pushChat('Run the WISEcode review', reviewedReply(ingredientById(state.lastResult)));
      break;
    case 'open-result': {
      const r = ingredientById(el.dataset.ing);
      if (r) pushChat('View the result', resultReply(r));
      break;
    }
    default: break;
  }
}

export const GRAS_WISEAI = {
  sub: 'Your GRAS verification assistant — I can run the whole documentation flow for you.',
  chipsFlow: 'wrap',
  /* Render the intent chips INLINE in the transcript (like a regular chat's
     suggested replies) — trailing the latest WISEcodeAI turn — instead of a docked
     rail, so every route stays one tap away without a weird bottom carousel. */
  inlineChips: true,
  sourceLabel: '',
  /* A chip for every route the flow can take: start → each wizard step → submit
     → review → navigate → repeat, plus the three explainers. */
  /* Large "at a glance" cards shown alongside the small chips on the welcome
     screen — each reuses an existing intent so a click drives the same flow. */
  scorecards: {
    label: 'Your GRAS verification at a glance',
    cards: [
      { intent: 'verify_top', icon: 'verified', iconTone: 'brand', title: 'Verify your top ingredient', desc: 'Clear the biggest blocker first — documenting one ingredient clears every product that contains it.', action: 'Verify top ingredient', ask: 'Verify my top ingredient' },
      { intent: 'view_submissions', icon: 'assignment_turned_in', iconTone: 'brand', title: 'Open the review queue', desc: 'Track everything you\u2019ve submitted for WISEcode review in one place.', action: 'Open the review queue', ask: 'Open the review queue' },
      { intent: 'autofill_docs', icon: 'upload_file', iconTone: 'brand', title: 'Attach & fill the documents', desc: 'Auto-fill the GRAS documentation for your ingredient in one pass.', action: 'Attach & fill the documents', ask: 'Attach & fill the documents' },
      { intent: 'sign_attestation', icon: 'verified_user', iconTone: 'brand', title: 'Sign the attestation', desc: 'Confirm your GRAS attestation to submit for WISEcode review.', action: 'Sign the attestation', ask: 'Sign the attestation' },
      { variant: 'wiseai', intent: 'explain_gras', icon: 'smart_toy', title: 'What is GRAS verification?', desc: 'Impact \u2192 Docs \u2192 Attest \u2192 Review — I can run any step for you.', action: 'Explain GRAS', ask: 'What is GRAS verification?' },
    ],
  },
  intents: [
    { intent: 'verify_top', label: 'Verify my top ingredient', icon: 'verified', nextIntents: ['use_recommended', 'explain_gras'] },
    { intent: 'use_recommended', label: 'Use the recommended pathway', icon: 'fact_check', nextIntents: ['autofill_docs', 'doc_pathways'] },
    { intent: 'autofill_docs', label: 'Attach & fill the documents', icon: 'upload_file', nextIntents: ['next_step', 'sign_attestation'] },
    { intent: 'next_step', label: 'Continue to the next step', icon: 'arrow_forward', nextIntents: ['sign_attestation', 'submit_gras'] },
    { intent: 'sign_attestation', label: 'Sign the attestation', icon: 'verified_user', nextIntents: ['submit_gras'] },
    { intent: 'submit_gras', label: 'Submit for review', icon: 'send', nextIntents: ['run_review', 'view_submissions'] },
    { intent: 'run_review', label: 'Run the WISEcode review', icon: 'rule', nextIntents: ['view_submissions', 'verify_another'] },
    { intent: 'view_submissions', label: 'Open the review queue', icon: 'assignment_turned_in', nextIntents: ['verify_another', 'explain_gras'] },
    { intent: 'verify_another', label: 'Verify another ingredient', icon: 'restart_alt', nextIntents: ['verify_top', 'explain_gras'] },
    { intent: 'explain_gras', label: 'What is GRAS verification?', icon: 'help_outline', nextIntents: ['doc_pathways', 'what_clears', 'verify_top'] },
    { intent: 'doc_pathways', label: 'Which pathway do I need?', icon: 'category', nextIntents: ['use_recommended', 'what_clears'] },
    { intent: 'what_clears', label: 'What will this clear?', icon: 'inventory_2', nextIntents: ['verify_top', 'use_recommended'] },
  ],
  intentReplies: {
    verify_top: () => verifyStartedReply(ingredientById(state.activeIngredientId) || topFlagged()),
    use_recommended: () => {
      const ing = ingredientById(state.activeIngredientId) || topFlagged();
      return pathwayReply(ing, docTypeById(ing.rec));
    },
    autofill_docs: () => {
      const ing = ingredientById(state.activeIngredientId) || topFlagged();
      return docsReply(ing, docTypeById(state.docType || ing.rec));
    },
    next_step: () => stepNarration(),
    sign_attestation: () => attestReply(ingredientById(state.activeIngredientId) || topFlagged(), 3),
    submit_gras: () => {
      const sub = state.submissions[0];
      return submittedReply(sub, sub ? ingredientById(sub.ingredientId) : null);
    },
    run_review: () => reviewedReply(ingredientById(state.lastResult)),
    view_submissions: () => queueReply(),
    verify_another: () => reportReply(),
    explain_gras:
      'GRAS = “Generally Recognized As Safe.” Every ingredient in your portfolio needs an established GRAS basis; the ones without it flag their products. Verification runs in five steps — <strong>Impact → Documentation type → Provide documents → Attestation → Review &amp; submit</strong> — and because it works at the ingredient level, documenting one ingredient clears every product that contains it. I can run any step for you from here.',
    doc_pathways:
      'There are four GRAS pathways: <strong>Self-Affirmation GRAS</strong> (an expert-panel dossier, works for any ingredient), <strong>FEMA GRAS</strong> (for flavorings, cites FEMA numbers), <strong>FDA GRAS Notice</strong> (a filed GRN with a “no questions” letter), and a <strong>Supplier GRAS Letter</strong> (for sourced ingredients). WISEcode recommends one per ingredient, but you can choose any.',
    what_clears: () => {
      const ing = ingredientById(state.activeIngredientId) || topFlagged();
      return `Verifying <strong>${ing.name}</strong> clears <strong>${ing.products} products</strong> — ${ing.pct}% of your portfolio — moving them from “${ing.blocks}” to GRAS in one step. That's the whole point of documenting at the ingredient level.`;
    },
  },
  /* Perform the requested step on the flow surface, then return false so the
     state-aware reply above is shown alongside the change. These call the flow's
     own functions directly (not onAction), so they never double-fire the
     UI-click mirroring. */
  onIntent: (intent) => {
    switch (intent) {
      case 'verify_top': {
        const ing = topFlagged();
        if (state.screen !== 'wizard' || state.activeIngredientId !== ing.id) startVerify(ing.id);
        return false;
      }
      case 'use_recommended': {
        const ing = ingredientById(state.activeIngredientId) || topFlagged();
        if (state.screen !== 'wizard') startVerify(ing.id);
        pickDoc(ing.rec);
        if (state.wizardStep < 1) setStep(1);
        return false;
      }
      case 'autofill_docs': {
        const ing = ingredientById(state.activeIngredientId) || topFlagged();
        if (state.screen !== 'wizard') startVerify(ing.id);
        if (state.wizardStep < 1) setStep(1);
        uploadFile();
        return false;
      }
      case 'next_step': {
        if (state.screen !== 'wizard') startVerify(topFlagged().id);
        else nextStep();
        return false;
      }
      case 'sign_attestation': {
        const ing = ingredientById(state.activeIngredientId) || topFlagged();
        if (state.screen !== 'wizard') startVerify(ing.id);
        if (!state.fields.fileName) uploadFile();
        state.attest = { a: true, b: true, c: true };
        setStep(2);
        return false;
      }
      case 'submit_gras': {
        if (state.screen === 'wizard' && canProceedThroughSubmit()) submitGras();
        return false;
      }
      case 'run_review': {
        const p = firstPending();
        if (p) reviewSubmission(p.id);
        return false;
      }
      case 'view_submissions':
        goto('submissions');
        return false;
      case 'verify_another':
        goto('report');
        return false;
      case 'what_clears':
      case 'explain_gras':
      case 'doc_pathways':
      default:
        return false;
    }
  },
};

/* The chat's "submit" driver may be invoked from any wizard step, so ensure the
   packet is complete before submitting (attach + attest) rather than bailing. */
function canProceedThroughSubmit() {
  const ing = ingredientById(state.activeIngredientId);
  if (!ing) return false;
  if (!state.fields.fileName) uploadFile();
  state.attest = { a: true, b: true, c: true };
  return true;
}
