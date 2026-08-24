/**
 * Add Catalog flow — the bulk-upload builder that powers pages/add-catalog.html.
 *
 * Same three-module frame as Add Product, re-used verbatim:
 *   • Chat (left)      — WISEcodeAI walks you through the CSV upload with intent
 *                        chips (upload, download the template / example, read the
 *                        field guide) — no long chit-chat, just the next action.
 *   • Catalog (middle) — a live module that mirrors those same actions in a
 *                        minimal UI: dropzone → column mapping → import results
 *                        (imported vs. rows to fix) → whole-catalog ingredient
 *                        verification. Built from the app's existing surfaces.
 *   • Progress (right) — the shared vfp-* progress module tracking every step.
 *
 * Nothing is imported until "Import to Portfolio" is pressed.
 */
(function () {
  'use strict';

  /* ─────────────────────────── helpers ─────────────────────────── */
  const $ = (id) => document.getElementById(id);
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function nowLabel() {
    try { return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
    catch (_) { return ''; }
  }
  const OWL = '<svg viewBox="0 0 193 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M10.9834 35.6522C10.9834 35.6522 3.30615 47.7494 3.30615 58.0481C3.30615 81.1921 20.324 99.6409 43.3405 99.9915C51.5363 100.052 60.4175 99.9915 67.533 92.6894C41.5052 92.6894 25.589 73.777 25.589 58.0481C25.589 58.0481 25.2144 45.6894 30.832 35.9526L10.9834 35.6522Z"/><path d="M83.8241 14.7368C90.9396 14.7368 94.8008 22.7337 96.3699 29.2111H96.5571C98.1262 22.7337 101.987 14.7368 109.103 14.7368H170.521C175.169 14.7368 175.169 12.8643 175.169 7.32269C175.169 2.80876 178.108 0 182.131 0H189.384V14.7368C189.384 27.7131 182.131 28.5339 174.794 28.5339L160.347 28.583H118.091C113.597 28.583 113.335 29.2111 111.537 33.7051C110.051 37.4206 96.5571 73.0277 96.5571 73.0277H96.3699C96.3699 73.0277 82.8761 37.4206 81.3899 33.7051C79.5923 29.2111 79.3301 28.583 74.8361 28.583H32.5803L18.133 28.5339C10.7965 28.5339 3.54341 27.7131 3.54341 14.7368V0H10.7965C14.5415 0 17.7585 3.37051 17.7585 7.32269C17.7585 12.8643 17.7585 14.7368 22.406 14.7368H83.8241Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M71.8001 35.9523C74.4284 35.9523 74.6161 37.2826 75.1793 38.6953L87.9434 71.5913C82.9358 80.6013 74.4289 85.7609 63.9558 85.7609C48.1132 85.7608 33.2662 72.7999 33.2663 54.6695C33.2664 48.2288 34.5088 40.1469 39.2583 35.9523H71.8001ZM63.486 44.5345C58.3905 44.5345 54.2598 48.6005 54.2598 54.0781C54.2598 59.5557 58.3905 63.6217 63.486 63.6217C68.5814 63.6216 72.7122 59.5556 72.7122 54.0781C72.7122 48.6005 68.5814 44.5346 63.486 44.5345Z"/><path d="M181.756 35.6522C181.756 35.6522 189.433 47.7494 189.433 58.0481C189.433 81.1921 172.416 99.6409 149.399 99.9915C141.203 100.052 132.322 99.9915 125.206 92.6894C151.234 92.6894 167.151 73.777 167.151 58.0481C167.151 58.0481 167.525 45.6894 161.908 35.9526L181.756 35.6522Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M120.94 35.9523C118.311 35.9523 118.124 37.2826 117.56 38.6953L104.796 71.5913C109.804 80.6013 118.311 85.7609 128.784 85.7609C144.626 85.7608 159.473 72.7999 159.473 54.6695C159.473 48.2288 158.231 40.1469 153.481 35.9523H120.94ZM129.254 44.5345C134.349 44.5345 138.48 48.6005 138.48 54.0781C138.48 59.5557 134.349 63.6217 129.254 63.6217C124.158 63.6216 120.027 59.5556 120.027 54.0781C120.027 48.6005 124.158 44.5346 129.254 44.5345Z"/></svg>';

  /* ─────────────────────────── catalog columns ───────────────────────────
     The exact fields the import expects — the UPC / name / brand keys plus the
     ingredient list, both serving-size measures, servings per container, and
     the full Nutrition-Facts value + %DV set (mirrors add-product-flow's
     NF_ROWS). These drive the downloadable template + example CSVs, so the
     download is always in step with what the flow validates. `req` marks the
     fields a regular product can't import without. */
  const COLUMNS = [
    { key: 'upc', field: 'UPC', req: true },
    { key: 'product_name', field: 'Product name', req: true },
    { key: 'brand', field: 'Brand', req: true },
    { key: 'category', field: 'Category' },
    { key: 'ingredients', field: 'Ingredient list', req: true },
    { key: 'allergens', field: 'Allergens' },
    { key: 'contains', field: 'Contains statement' },
    { key: 'serving_size_metric', field: 'Serving size (metric)', req: true },
    { key: 'serving_size_household', field: 'Serving size (household)', req: true },
    { key: 'servings_per_container', field: 'Servings per container', req: true },
    { key: 'calories', field: 'Calories', req: true },
    { key: 'total_fat', field: 'Total Fat', req: true },
    { key: 'total_fat_dv', field: 'Total Fat %DV', req: true },
    { key: 'saturated_fat', field: 'Saturated Fat', req: true },
    { key: 'saturated_fat_dv', field: 'Saturated Fat %DV', req: true },
    { key: 'trans_fat', field: 'Trans Fat', req: true },
    { key: 'cholesterol', field: 'Cholesterol', req: true },
    { key: 'cholesterol_dv', field: 'Cholesterol %DV', req: true },
    { key: 'sodium', field: 'Sodium', req: true },
    { key: 'sodium_dv', field: 'Sodium %DV', req: true },
    { key: 'total_carbohydrate', field: 'Total Carbohydrate', req: true },
    { key: 'total_carbohydrate_dv', field: 'Total Carbohydrate %DV', req: true },
    { key: 'dietary_fiber', field: 'Dietary Fiber', req: true },
    { key: 'dietary_fiber_dv', field: 'Dietary Fiber %DV', req: true },
    { key: 'total_sugars', field: 'Total Sugars', req: true },
    { key: 'added_sugars', field: 'Added Sugars', req: true },
    { key: 'added_sugars_dv', field: 'Added Sugars %DV', req: true },
    { key: 'protein', field: 'Protein', req: true },
    { key: 'vitamin_d', field: 'Vitamin D', req: true },
    { key: 'vitamin_d_dv', field: 'Vitamin D %DV', req: true },
    { key: 'calcium', field: 'Calcium', req: true },
    { key: 'calcium_dv', field: 'Calcium %DV', req: true },
    { key: 'iron', field: 'Iron', req: true },
    { key: 'iron_dv', field: 'Iron %DV', req: true },
    { key: 'potassium', field: 'Potassium', req: true },
    { key: 'potassium_dv', field: 'Potassium %DV', req: true },
    { key: 'image_url', field: 'Product image URL' },
  ];

  /* Four completed product examples for the example CSV — grounded in the
     Flax4Life products already shown in the portfolio board. */
  const EXAMPLE_ROWS = [
    {
      upc: '857287004203', product_name: 'Toasted Coconut Brownies', brand: 'Flax4Life', category: 'Bakery Products',
      ingredients: 'Ground Flaxseed, Cane Sugar, Egg Whites, Water, Chocolate Chips (Cane Sugar, Unsweetened Chocolate, Cocoa Butter), Coconut, Cocoa, Baking Soda, Sea Salt, Xanthan Gum, Natural Flavor.',
      allergens: 'Eggs', contains: 'Eggs',
      serving_size_metric: '57g', serving_size_household: '1 brownie', servings_per_container: '4', calories: '200',
      total_fat: '12g', total_fat_dv: '15%', saturated_fat: '2g', saturated_fat_dv: '10%', trans_fat: '0g',
      cholesterol: '0mg', cholesterol_dv: '0%', sodium: '190mg', sodium_dv: '8%',
      total_carbohydrate: '20g', total_carbohydrate_dv: '7%', dietary_fiber: '6g', dietary_fiber_dv: '21%',
      total_sugars: '11g', added_sugars: '10g', added_sugars_dv: '20%', protein: '5g',
      vitamin_d: '0mcg', vitamin_d_dv: '0%', calcium: '40mg', calcium_dv: '3%', iron: '2mg', iron_dv: '10%', potassium: '95mg', potassium_dv: '2%',
      image_url: '',
    },
    {
      upc: '065776631520', product_name: 'Chocolate Chip Muffins', brand: 'Flax4Life', category: 'Bakery Products',
      ingredients: 'Ground Flaxseed, Cane Sugar, Egg Whites, Water, Chocolate Chips, Non-GMO Canola Oil, Cocoa, Baking Soda, Baking Powder, Sea Salt, Xanthan Gum, Natural Flavor.',
      allergens: 'Eggs', contains: 'Eggs',
      serving_size_metric: '57g', serving_size_household: '1 muffin', servings_per_container: '4', calories: '190',
      total_fat: '11g', total_fat_dv: '14%', saturated_fat: '1.5g', saturated_fat_dv: '8%', trans_fat: '0g',
      cholesterol: '0mg', cholesterol_dv: '0%', sodium: '210mg', sodium_dv: '9%',
      total_carbohydrate: '18g', total_carbohydrate_dv: '7%', dietary_fiber: '5g', dietary_fiber_dv: '18%',
      total_sugars: '9g', added_sugars: '8g', added_sugars_dv: '16%', protein: '5g',
      vitamin_d: '0mcg', vitamin_d_dv: '0%', calcium: '40mg', calcium_dv: '3%', iron: '2mg', iron_dv: '10%', potassium: '90mg', potassium_dv: '2%',
      image_url: '',
    },
    {
      upc: '853620006279', product_name: 'Cinnamon Raisin Flax Bread', brand: 'Flax4Life', category: 'Bakery Products',
      ingredients: 'Ground Flaxseed, Water, Egg Whites, Raisins, Cane Sugar, Cinnamon, Baking Soda, Baking Powder, Sea Salt, Xanthan Gum.',
      allergens: 'Eggs', contains: 'Eggs',
      serving_size_metric: '38g', serving_size_household: '1 slice', servings_per_container: '12', calories: '90',
      total_fat: '5g', total_fat_dv: '6%', saturated_fat: '0.5g', saturated_fat_dv: '3%', trans_fat: '0g',
      cholesterol: '0mg', cholesterol_dv: '0%', sodium: '160mg', sodium_dv: '7%',
      total_carbohydrate: '9g', total_carbohydrate_dv: '3%', dietary_fiber: '4g', dietary_fiber_dv: '14%',
      total_sugars: '3g', added_sugars: '1g', added_sugars_dv: '2%', protein: '4g',
      vitamin_d: '0mcg', vitamin_d_dv: '0%', calcium: '30mg', calcium_dv: '2%', iron: '1.5mg', iron_dv: '8%', potassium: '120mg', potassium_dv: '2%',
      image_url: '',
    },
    {
      upc: '853620006286', product_name: 'Everything Flax Bagels', brand: 'Flax4Life', category: 'Bakery Products',
      ingredients: 'Ground Flaxseed, Egg Whites, Water, Sesame Seeds, Poppy Seeds, Dried Garlic, Dried Onion, Cane Sugar, Baking Soda, Sea Salt, Xanthan Gum.',
      allergens: 'Eggs, Sesame', contains: 'Eggs, Sesame',
      serving_size_metric: '85g', serving_size_household: '1 bagel', servings_per_container: '4', calories: '230',
      total_fat: '13g', total_fat_dv: '17%', saturated_fat: '1.5g', saturated_fat_dv: '8%', trans_fat: '0g',
      cholesterol: '0mg', cholesterol_dv: '0%', sodium: '340mg', sodium_dv: '15%',
      total_carbohydrate: '22g', total_carbohydrate_dv: '8%', dietary_fiber: '9g', dietary_fiber_dv: '32%',
      total_sugars: '2g', added_sugars: '1g', added_sugars_dv: '2%', protein: '9g',
      vitamin_d: '0mcg', vitamin_d_dv: '0%', calcium: '80mg', calcium_dv: '6%', iron: '3mg', iron_dv: '15%', potassium: '180mg', potassium_dv: '4%',
      image_url: '',
    },
  ];

  /* Column mapping shown after a file is read — our field ← the header we found
     in the file. Most match cleanly; a couple are flagged as "unsure" so the
     user confirms them (mirrors "we ask about anything we are unsure of"). */
  const SAMPLE_MAPPING = [
    { field: 'UPC', col: 'GTIN / UPC' },
    { field: 'Product name', col: 'Item Description' },
    { field: 'Brand', col: 'Brand' },
    { field: 'Ingredient list', col: 'Ingredients' },
    { field: 'Serving size (metric)', col: 'Net Serving (g)' },
    { field: 'Serving size (household)', col: null, unsure: true },
    { field: 'Servings per container', col: 'Servings' },
    { field: 'Calories', col: 'Calories' },
    { field: 'Nutrition Facts values', col: '15 columns matched' },
    { field: '% Daily Value figures', col: '11 columns matched' },
  ];

  /* Simulated import outcome for the demo upload. */
  const SAMPLE_RESULT = {
    total: 65,
    imported: 62,
    fix: [
      { upc: '810034563217', reason: 'Missing Dietary Fiber %DV' },
      { upc: '810034563224', reason: 'No serving size (metric or household)' },
      { upc: '810034563231', reason: 'Ingredient list is empty' },
    ],
  };

  const state = {
    brand: 'Flax4Life',
    stage: 'start',      // start → mapped → imported → verified
    file: null,          // uploaded file name
    mapped: false,
    imported: false,
    verified: false,
    result: null,        // SAMPLE_RESULT once imported
    analyzePct: 0,
    step: 'upload',
    awaiting: null,
  };

  /* ─────────────────────────── steps ─────────────────────────── */
  const STEPS = [
    { id: 'upload', label: 'Upload file', icon: 'upload_file' },
    { id: 'map', label: 'Match columns', icon: 'table_view' },
    { id: 'import', label: 'Import products', icon: 'inventory_2' },
    { id: 'analyze', label: 'Analyze ingredients', icon: 'science' },
    { id: 'verify', label: 'Verify catalog', icon: 'verified' },
  ];

  /* ─────────────────────────── DOM refs ─────────────────────────── */
  let messagesEl, welcomeEl, chipsStartEl, inputEl, catBody, progressEl, fileInput;
  let progressMin = true;

  /* ─────────────────────────── chat primitives (shared pattern) ─────────────────────────── */
  function scrollDown(force) {
    if (!messagesEl) return;
    const bottom = Math.max(0, messagesEl.scrollHeight - messagesEl.clientHeight);
    const yours = messagesEl.querySelectorAll('.sc-line-you');
    const anchor = yours.length ? yours[yours.length - 1] : null;
    let target = bottom;
    if (anchor) {
      const cap = anchor.getBoundingClientRect().top - messagesEl.getBoundingClientRect().top + messagesEl.scrollTop - 10;
      target = Math.min(bottom, Math.max(0, cap));
    }
    const last = messagesEl.__followPos;
    if (!force && typeof last === 'number' && messagesEl.scrollTop < last - 48) return;
    if (force || target > messagesEl.scrollTop) messagesEl.scrollTop = target;
    messagesEl.__followPos = messagesEl.scrollTop;
  }
  function hideWelcome() { if (welcomeEl) welcomeEl.classList.add('sc-hidden'); }

  const prefersReducedMotion = (() => {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (_) { return false; }
  })();
  function typeInLine(bodyEl, done) {
    if (typeof window.WiseTypeInTranscript === 'function') {
      window.WiseTypeInTranscript(bodyEl, done, { scroll: scrollDown, reduced: prefersReducedMotion });
      return;
    }
    scrollDown();
    if (done) done();
  }

  function addUser(text) {
    hideWelcome();
    messagesEl.insertAdjacentHTML('beforeend',
      `<div class="sc-line sc-line-you"><span class="sc-avatar sc-avatar-you" role="img" aria-label="You">AK</span><div class="sc-line-body">${esc(text)}<div class="sc-line-meta"><span class="sc-line-time">${esc(nowLabel())}</span></div></div></div>`);
    scrollDown(true);
  }
  function fileIconFor(name) {
    const k = (name || '').toLowerCase();
    if (k.endsWith('.json')) return 'data_object';
    if (k.endsWith('.xml')) return 'code';
    if (k.endsWith('.xls') || k.endsWith('.xlsx')) return 'grid_on';
    if (k.endsWith('.numbers')) return 'table_chart';
    return 'table_rows';
  }
  function addUserFile(name) {
    hideWelcome();
    messagesEl.insertAdjacentHTML('beforeend',
      `<div class="sc-line sc-line-you"><span class="sc-avatar sc-avatar-you" role="img" aria-label="You">AK</span><div class="sc-line-body">${esc(name || 'File')}<div class="ap-file-chip"><span class="material-symbols-outlined">${fileIconFor(name)}</span><span>${esc(name || 'File')}</span></div><div class="sc-line-meta"><span class="sc-line-time">${esc(nowLabel())}</span></div></div></div>`);
    scrollDown(true);
  }
  function chipsRow(chips) {
    if (!chips || !chips.length) return '';
    return `<div class="sc-reply-chips">${chips.map((c) =>
      `<button type="button" class="chip${c.primary ? ' chip-primary' : ''}" data-action="${esc(c.action)}"${c.arg != null ? ` data-arg="${esc(c.arg)}"` : ''}><span class="material-symbols-outlined">${esc(c.icon || 'bolt')}</span>${esc(c.label)}</button>`).join('')}</div>`;
  }
  function apPrimeLeft(el) {
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateX(-6px)';
    el.style.transition = 'opacity .2s ease, transform .2s ease';
  }
  function apPrimeRight(el) {
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateX(30px)';
    el.style.transition = 'opacity .28s ease, transform .38s cubic-bezier(0.22, 0.85, 0.25, 1)';
  }
  function apRevealStaggered(els, startDelay, gap, done) {
    const list = (els || []).filter(Boolean);
    if (!list.length) { if (done) setTimeout(done, startDelay || 0); return; }
    let idx = 0;
    const showNext = () => {
      list[idx].style.opacity = '1';
      list[idx].style.transform = 'none';
      idx += 1;
      scrollDown();
      if (idx < list.length) setTimeout(showNext, gap);
      else if (done) setTimeout(done, gap);
    };
    setTimeout(showNext, startDelay);
  }
  function revealWelcome() {
    if (!welcomeEl) return;
    const heading = welcomeEl.querySelector('.ws-heading');
    const subEl = welcomeEl.querySelector('.ws-sub');
    const chips = chipsStartEl ? Array.from(chipsStartEl.querySelectorAll('.chip')) : [];
    if (prefersReducedMotion) {
      chips.forEach((c) => { c.style.opacity = ''; c.style.transform = ''; c.style.transition = ''; });
      return;
    }
    chips.forEach(apPrimeRight);
    const typeText = (el, next) => { if (el) typeInLine(el, next); else next(); };
    typeText(heading, () => typeText(subEl, () => { apRevealStaggered(chips, 90, 60, null); }));
  }
  function addWISEcodeAI(html, chips) {
    hideWelcome();
    const footer = `<div class="sc-line-meta"><span class="sc-line-time">${esc(nowLabel())}</span></div>`;
    messagesEl.insertAdjacentHTML('beforeend',
      `<div class="sc-line sc-line-wiseai"><span class="sc-avatar sc-avatar-wiseai" role="img" aria-label="WISEcodeAI">${OWL}</span><div class="sc-line-body">${html}${footer}</div></div>`);
    const line = messagesEl.lastElementChild;
    const body = line && line.querySelector('.sc-line-body');
    const metaEl = body && body.querySelector('.sc-line-meta');
    if (metaEl && !prefersReducedMotion) metaEl.style.opacity = '0';
    scrollDown();
    typeInLine(body, () => {
      const row = chipsRow(chips);
      let chipsEl = null;
      if (row) { messagesEl.insertAdjacentHTML('beforeend', row); chipsEl = messagesEl.lastElementChild; }
      if (prefersReducedMotion) { scrollDown(); return; }
      if (metaEl) metaEl.style.opacity = '';
      const timeEl = metaEl && metaEl.querySelector('.sc-line-time');
      const chipBtns = chipsEl ? Array.from(chipsEl.children) : [];
      if (timeEl) apPrimeLeft(timeEl);
      chipBtns.forEach(apPrimeRight);
      scrollDown();
      apRevealStaggered(timeEl ? [timeEl] : [], 120, 0, () => {
        apRevealStaggered(chipBtns, 110, 55, scrollDown);
      });
    });
  }
  function addSysNote(text, icon) {
    messagesEl.insertAdjacentHTML('beforeend',
      `<div class="ap-sys-note"><span class="material-symbols-outlined">${esc(icon || 'check')}</span><span>${esc(text)}</span></div>`);
    scrollDown();
    typeInLine(messagesEl.lastElementChild);
  }
  function showTyping() {
    hideWelcome();
    const el = document.createElement('div');
    el.className = 'sc-line sc-line-wiseai sc-line-typing';
    el.innerHTML = `<span class="sc-avatar sc-avatar-wiseai" role="img" aria-label="WISEcodeAI">${OWL}</span><div class="sc-line-body"><span class="sc-typing-status"><span class="sc-typing-spin" aria-hidden="true"></span><span class="sc-typing-label">WISEcodeAI is thinking…</span></span></div>`;
    messagesEl.appendChild(el);
    scrollDown();
    return el;
  }
  function wiseSay(html, chips, delay) {
    const stream = (window.__wiseStdMenu && window.__wiseStdMenu.stream)
      ? window.__wiseStdMenu.stream()
      : { on: true, level: 'full' };
    if (!stream.on) { addWISEcodeAI(html, chips); return; }
    const t = showTyping();
    setTimeout(() => { t.remove(); addWISEcodeAI(html, chips); }, stream.level === 'final' ? 300 : (delay || 560));
  }

  /* ─────────────────────────── CSV downloads ─────────────────────────── */
  function csvCell(v) {
    const s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }
  function buildCsv(rows) {
    const header = COLUMNS.map((c) => c.key).join(',');
    const body = rows.map((r) => COLUMNS.map((c) => csvCell(r[c.key])).join(',')).join('\n');
    return body ? header + '\n' + body : header;
  }
  function downloadCsv(filename, text) {
    const blob = new Blob([text], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
  function downloadTemplate() {
    const blank = {};
    COLUMNS.forEach((c) => { blank[c.key] = ''; });
    downloadCsv('wisecode-catalog-template.csv', buildCsv([blank]));
  }
  function downloadExample() {
    downloadCsv('wisecode-catalog-example.csv', buildCsv(EXAMPLE_ROWS));
  }

  /* ─────────────────────────── module render ─────────────────────────── */
  function requirementsHTML() {
    return `<div class="ac-section ac-section--plain">
      <div class="ac-sec-head"><span class="ac-sec-title">What your file should include</span></div>
      <div class="ac-sec-body">
        <div class="ac-list">
          <div class="ac-list-item"><span class="material-symbols-outlined">tag</span><span>Every product needs a <strong>UPC</strong>, <strong>product name</strong> and <strong>brand</strong>.</span></div>
          <div class="ac-list-item"><span class="material-symbols-outlined">receipt_long</span><span>Regular products also need an <strong>ingredient list</strong>, a <strong>serving size</strong> (metric + household), <strong>servings per container</strong>, the <strong>15 Nutrition Facts values</strong> and the <strong>11 %DV figures</strong>.</span></div>
          <div class="ac-list-item"><span class="material-symbols-outlined">inventory_2</span><span>Multi-packs and products that don't require a Nutrition Facts panel follow the notes in the guide.</span></div>
          <div class="ac-list-item"><span class="material-symbols-outlined">rule</span><span>Rows missing anything aren't imported — I list them with the reason, you fix those rows and upload again, matched by UPC.</span></div>
        </div>
      </div>
    </div>`;
  }
  function startHTML() {
    return `<div class="ac-head">
      <h2 class="ac-head-title">Add your catalog</h2>
      <p class="ac-head-meta">Upload a product list and I'll match your columns, validate every row, and import everything that checks out — in one pass.</p>
    </div>
    <div class="ac-section ac-section--plain">
      <div class="ac-sec-head"><span class="ac-sec-title">Send us your product list</span><span class="ac-sec-badge">up to 500</span></div>
      <div class="ac-sec-body">
        <div class="ac-drop" id="cat-drop" data-ac="upload" role="button" tabindex="0" aria-label="Upload a catalog CSV">
          <span class="material-symbols-outlined">upload_file</span>
          <span class="ac-drop-t">Drop your catalog CSV here</span>
          <span class="ac-drop-d">or click to browse — CSV, Excel, Numbers, or a retailer export</span>
        </div>
        <div class="ac-mini-row">
          <button type="button" class="ac-mini-btn" data-ac="template"><span class="material-symbols-outlined">download</span>CSV template</button>
          <button type="button" class="ac-mini-btn" data-ac="example"><span class="material-symbols-outlined">table_view</span>Example CSV</button>
          <button type="button" class="ac-mini-btn" data-ac="instructions"><span class="material-symbols-outlined">menu_book</span>Instructions</button>
        </div>
        <div class="ac-empty-hint">Only have one product? <button type="button" class="ac-linklike" data-ac="single">Add it the usual way</button>.</div>
      </div>
    </div>
    ${requirementsHTML()}`;
  }
  function mappingHTML() {
    const rows = SAMPLE_MAPPING.map((m) => {
      const col = m.unsure
        ? `<span class="ac-map-col ac-map-missing"><span class="material-symbols-outlined">help</span>Not found — confirm</span>`
        : (/columns matched/.test(m.col)
          ? `<span class="ac-map-col"><span class="material-symbols-outlined" style="color:var(--sec-green);font-size:14px">check_circle</span>${esc(m.col)}</span>`
          : `<span class="ac-map-col"><code>${esc(m.col)}</code></span>`);
      return `<div class="ac-map-row"><span class="ac-map-field">${esc(m.field)}</span><span class="ac-map-arrow"><span class="material-symbols-outlined">arrow_back</span></span>${col}</div>`;
    }).join('');
    return `<div class="ac-section">
      <div class="ac-sec-head"><span class="material-symbols-outlined">table_view</span><span class="ac-sec-title">Column mapping</span><span class="ac-sec-badge">${esc(state.file || 'catalog.csv')}</span></div>
      <div class="ac-sec-body">
        <div class="ac-map">${rows}</div>
        <div class="ac-empty-hint" style="text-align:left;padding-top:10px">${SAMPLE_RESULT.total} rows detected · 1 field to confirm. Adjust the mapping in chat, or import to bring in everything that validates.</div>
      </div>
    </div>`;
  }
  function resultHTML() {
    const r = state.result || SAMPLE_RESULT;
    const fixRows = r.fix.map((f) =>
      `<div class="ac-fix-row"><span class="material-symbols-outlined">error_outline</span><span><span class="ac-fix-upc">${esc(f.upc)}</span> — <span class="ac-fix-reason">${esc(f.reason)}</span></span></div>`).join('');
    const analyze = state.verified
      ? `<div class="ac-section">
          <div class="ac-sec-head"><span class="material-symbols-outlined">verified</span><span class="ac-sec-title">Ingredient verification</span><span class="ac-sec-badge" style="color:var(--sec-green);background:color-mix(in srgb, var(--sec-green) 14%, transparent)">Complete</span></div>
          <div class="ac-sec-body"><div class="ac-list"><div class="ac-list-item"><span class="material-symbols-outlined" style="color:var(--sec-green)">check_circle</span><span>All <strong>${r.imported}</strong> imported products verified in one pass. They're in <strong>Claimed</strong> in your portfolio.</span></div></div></div>
        </div>`
      : `<div class="ac-section">
          <div class="ac-sec-head"><span class="material-symbols-outlined">science</span><span class="ac-sec-title">Ingredient analysis</span></div>
          <div class="ac-sec-body">
            <div class="ac-analyze">
              <div class="ac-analyze-head"><span>Analyzing every ingredient statement</span><strong>${state.analyzePct}%</strong></div>
              <div class="ac-bar-track"><div class="ac-bar-fill" style="width:${state.analyzePct}%"></div></div>
              <div class="ac-empty-hint" style="text-align:left;padding-top:2px">${state.analyzePct >= 100 ? 'Analysis done — verify the whole catalog in one pass from chat.' : 'Runs in the background — you can keep working.'}</div>
            </div>
          </div>
        </div>`;
    return `<div class="ac-section">
      <div class="ac-sec-head"><span class="material-symbols-outlined">inventory_2</span><span class="ac-sec-title">Import results</span><span class="ac-sec-badge">${esc(state.file || 'catalog.csv')}</span></div>
      <div class="ac-sec-body">
        <div class="ac-stats">
          <div class="ac-stat ac-stat--ok"><div class="ac-stat-num">${r.imported}</div><div class="ac-stat-label">Imported</div></div>
          <div class="ac-stat ac-stat--warn"><div class="ac-stat-num">${r.fix.length}</div><div class="ac-stat-label">To fix</div></div>
          <div class="ac-stat"><div class="ac-stat-num">${r.total}</div><div class="ac-stat-label">Rows read</div></div>
        </div>
      </div>
    </div>
    <div class="ac-section">
      <div class="ac-sec-head"><span class="material-symbols-outlined">rule</span><span class="ac-sec-title">Rows to fix</span><span class="ac-sec-badge" style="color:var(--sec-red);background:color-mix(in srgb, var(--sec-red) 14%, transparent)">${r.fix.length}</span></div>
      <div class="ac-sec-body">
        <div class="ac-fix">${fixRows}</div>
        <div class="ac-mini-row"><button type="button" class="ac-mini-btn" data-ac="upload"><span class="material-symbols-outlined">upload_file</span>Upload fixed rows</button></div>
      </div>
    </div>
    ${analyze}`;
  }
  function renderCatalog() {
    if (!catBody) return;
    if (state.stage === 'start') catBody.innerHTML = startHTML();
    else if (state.stage === 'mapped') catBody.innerHTML = mappingHTML() + requirementsHTML();
    else catBody.innerHTML = resultHTML();
    updateImportState();
  }

  function updateImportState() {
    const btn = $('cat-import-btn');
    const status = $('cat-import-status');
    if (!btn) return;
    if (state.stage === 'start') {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined">cloud_upload</span>Import to Portfolio';
      if (status) status.innerHTML = '<span class="material-symbols-outlined">info</span><span>No file yet — nothing imported</span>';
    } else if (state.stage === 'mapped') {
      btn.disabled = false;
      btn.innerHTML = `<span class="material-symbols-outlined">cloud_upload</span>Import ${SAMPLE_RESULT.total} products`;
      if (status) status.innerHTML = '<span class="material-symbols-outlined" style="color:var(--sec-green)">task_alt</span><span>Columns matched — ready to import</span>';
    } else if (!state.verified) {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined">verified</span>Verify catalog';
      if (status) {
        const r = state.result || SAMPLE_RESULT;
        status.innerHTML = `<span class="material-symbols-outlined" style="color:var(--sec-green)">check</span><span><strong>${r.imported}</strong> imported · <strong>${r.fix.length}</strong> to fix</span>`;
      }
    } else {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined">check</span>Catalog imported';
      if (status) status.innerHTML = '<span class="material-symbols-outlined" style="color:var(--sec-green)">check</span><span>Imported &amp; verified</span>';
    }
  }

  /* ─────────────────────────── progress render ─────────────────────────── */
  function stepFilled(id) {
    switch (id) {
      case 'upload': return !!state.file;
      case 'map': return state.mapped;
      case 'import': return state.imported;
      case 'analyze': return state.imported && state.analyzePct >= 100;
      case 'verify': return state.verified;
      default: return false;
    }
  }
  function stepHasError(id) {
    if (id === 'import') return !!(state.result && state.result.fix.length);
    return false;
  }
  function stepFields(id) {
    const r = state.result || SAMPLE_RESULT;
    switch (id) {
      case 'upload': return [{ label: 'Catalog file', val: state.file || 'None', done: !!state.file }];
      case 'map': return [{ label: 'Columns', val: state.mapped ? 'Matched' : 'Pending', done: state.mapped }];
      case 'import': return state.imported
        ? [
            { label: 'Imported', val: String(r.imported), done: true },
            { label: 'Rows to fix', val: String(r.fix.length), done: r.fix.length === 0, err: r.fix.length > 0 },
          ]
        : [{ label: 'Products', val: 'Pending', done: false }];
      case 'analyze': return [{ label: 'Ingredients', val: state.imported ? (state.analyzePct >= 100 ? 'Analyzed' : state.analyzePct + '%') : 'Pending', done: state.imported && state.analyzePct >= 100 }];
      case 'verify': return [{ label: 'Verification', val: state.verified ? 'Complete' : 'Pending', done: state.verified }];
      default: return [];
    }
  }
  function completedCount() { return STEPS.filter((s) => stepFilled(s.id) && !stepHasError(s.id)).length; }

  function renderProgress() {
    if (!progressEl) return;
    const activeIdx = STEPS.findIndex((s) => s.id === state.step);
    const completed = completedCount();
    const pct = Math.round((completed / STEPS.length) * 100);

    const stepsHtml = STEPS.map((s, i) => {
      const filled = stepFilled(s.id);
      const err = stepHasError(s.id);
      const isActive = i === activeIdx;
      let cls = '';
      if (err) cls = 'vfp-step--err';
      else if (filled) cls = 'vfp-step--done';
      else if (isActive) cls = 'vfp-step--active';
      const num = err ? '<span class="material-symbols-outlined">priority_high</span>'
        : filled ? '<span class="material-symbols-outlined">check</span>' : String(i + 1);
      let sub = '';
      if (err) sub = 'Needs attention';
      else if (filled) sub = 'Completed';
      else if (isActive) sub = 'In progress';
      let fieldsHtml = '';
      if (filled || isActive || err) {
        const rows = stepFields(s.id).map((f) => {
          const icon = f.err ? 'error_outline' : f.done ? 'check' : 'radio_button_unchecked';
          const st = f.err ? 'vfp-field--err' : f.done ? 'vfp-field--done' : 'vfp-field--active';
          return `<div class="vfp-field ${st}"><span class="material-symbols-outlined">${icon}</span><span class="vfp-field-label">${esc(f.label)}</span><span class="vfp-field-val">${esc(f.val)}</span></div>`;
        }).join('');
        fieldsHtml = `<div class="vfp-fields">${rows}</div>`;
      }
      return `<div class="vfp-step ${cls}">
        <div class="vfp-step-track"><div class="vfp-step-num">${num}</div><div class="vfp-step-line"></div></div>
        <div class="vfp-step-body">
          <div class="vfp-step-title">${esc(s.label)}</div>
          ${sub ? `<div class="vfp-step-sub">${esc(sub)}</div>` : ''}
          ${fieldsHtml}
        </div>
      </div>`;
    }).join('');

    progressEl.innerHTML = `<div class="vfp-inner ${progressMin ? 'is-min' : ''}">
      <div class="vfp-header">
        <div class="vfp-pct-ring" style="--pct:${pct}"><span>${pct}%</span></div>
        <div class="vfp-header-text">
          <div class="vfp-title">Add catalog progress</div>
          <div class="vfp-subtitle">${esc(state.brand)} · ${STEPS.length} steps</div>
        </div>
        <button type="button" class="vfp-min-btn" data-ap-min aria-label="${progressMin ? 'Expand progress' : 'Collapse progress'}" title="${progressMin ? 'Expand' : 'Collapse'}"><span class="material-symbols-outlined">${progressMin ? 'chevron_left' : 'chevron_right'}</span></button>
      </div>
      <div class="vfp-progress">
        <div class="vfp-progress-head"><span>${completed} of ${STEPS.length} steps</span><span class="vfp-progress-pct">${pct}%</span></div>
        <div class="vfp-progress-track"><div class="vfp-progress-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="vfp-steps">${stepsHtml}</div>
      <div class="vfp-foot">
        <div class="vfp-foot-row"><span>Products imported</span><span>${state.imported ? (state.result || SAMPLE_RESULT).imported : 0}</span></div>
        <div class="vfp-foot-row vfp-foot-total"><span>Catalog verified</span><span class="vfp-foot-amt">${state.verified ? 'Yes' : 'No'}</span></div>
      </div>
    </div>`;
  }

  function render() { renderCatalog(); renderProgress(); }

  /* ─────────────────────────── flow actions ─────────────────────────── */
  function openPicker() {
    if (!fileInput) return;
    fileInput.value = '';
    fileInput.click();
  }
  function onFile(file) {
    if (!file) return;
    addUserFile(file.name);
    state.file = file.name;
    state.step = 'map';
    render();
    const t = showTyping();
    setTimeout(() => {
      t.remove();
      state.stage = 'mapped';
      state.mapped = true;
      render();
      addWISEcodeAI(`Read <strong>${esc(file.name)}</strong> — <strong>${SAMPLE_RESULT.total} rows</strong>. I matched your columns to our fields (see <strong>Catalog</strong>). One I'm unsure of: <strong>Serving size (household)</strong> — I couldn't find a column for it. Confirm it, then import.`,
        [
          { label: 'Use "Net Serving" for both', icon: 'check', action: 'confirmMap' },
          { label: 'Import everything valid', icon: 'cloud_upload', action: 'import', primary: true },
          { label: 'Download the template', icon: 'download', action: 'template' },
        ]);
    }, 1000);
  }
  function doImport() {
    if (state.imported) { onVerify(); return; }
    if (!state.mapped) { openPicker(); return; }
    addUser('Import everything that validates');
    state.step = 'import';
    render();
    const t = showTyping();
    setTimeout(() => {
      t.remove();
      state.stage = 'imported';
      state.imported = true;
      state.result = SAMPLE_RESULT;
      state.step = 'analyze';
      render();
      runAnalyze();
      addWISEcodeAI(`Imported <strong>${SAMPLE_RESULT.imported}</strong> of ${SAMPLE_RESULT.total} products into your <strong>${esc(state.brand)}</strong> portfolio. <strong>${SAMPLE_RESULT.fix.length} rows</strong> didn't validate — they're listed with the reason in <strong>Catalog</strong>. I'm analyzing every ingredient statement in the background now.`,
        [
          { label: 'Show rows to fix', icon: 'rule', action: 'showFix' },
          { label: 'Verify the whole catalog', icon: 'verified', action: 'verify', primary: true },
          { label: 'Fix & re-upload', icon: 'upload_file', action: 'upload' },
        ]);
    }, 1100);
  }
  function runAnalyze() {
    state.analyzePct = 0;
    const tick = () => {
      state.analyzePct = Math.min(100, state.analyzePct + 20);
      if (state.stage === 'imported') { renderCatalog(); renderProgress(); }
      if (state.analyzePct < 100) setTimeout(tick, 420);
    };
    setTimeout(tick, 420);
  }
  function onVerify() {
    if (state.verified) return;
    addUser('Verify the whole catalog');
    state.analyzePct = 100;
    state.verified = true;
    state.step = 'verify';
    render();
    wiseSay(`Done — I verified all <strong>${(state.result || SAMPLE_RESULT).imported}</strong> imported products' ingredients in one pass. They're in <strong>Claimed</strong> now. Fix the ${(state.result || SAMPLE_RESULT).fix.length} flagged rows and upload again anytime, or head back to the portfolio.`,
      [
        { label: 'Back to portfolio', icon: 'inventory_2', action: 'exit' },
        { label: 'Upload another catalog', icon: 'upload_file', action: 'restart' },
      ]);
  }
  function showInstructions() {
    addUser('Read the upload instructions');
    wiseSay(`Here's the field-by-field guide. Each row is one product, keyed by <strong>UPC</strong>:
      <br>• <strong>Identity</strong> — UPC, product name, brand (all required), category (optional).
      <br>• <strong>Ingredients</strong> — the full statement as printed, plus optional allergens and a Contains line.
      <br>• <strong>Serving</strong> — the metric amount (e.g. 57g) <em>and</em> the household measure (e.g. 1 muffin), plus servings per container.
      <br>• <strong>Nutrition Facts</strong> — calories, the 15 required values and the 11 %DV figures.
      <br>• <strong>Multi-packs / no-panel products</strong> — leave the Nutrition Facts columns blank and note the pack in the category.
      <br>Download the template to see every column, or the example to see four filled-in products.`,
      [
        { label: 'Download CSV template', icon: 'download', action: 'template' },
        { label: 'Download example CSV', icon: 'table_view', action: 'example' },
        { label: 'Upload my catalog', icon: 'upload_file', action: 'upload', primary: true },
      ]);
  }

  /* ─────────────────────────── dispatch ─────────────────────────── */
  function dispatch(action) {
    switch (action) {
      case 'upload': addUser('Upload my catalog'); openPicker(); break;
      case 'template': downloadTemplate(); addSysNote('Downloaded wisecode-catalog-template.csv.', 'download'); break;
      case 'example': downloadExample(); addSysNote('Downloaded wisecode-catalog-example.csv.', 'download'); break;
      case 'instructions': showInstructions(); break;
      case 'confirmMap': addUser('Use the net serving for both'); addSysNote('Serving size (household) confirmed.', 'check'); wiseSay('Confirmed. Ready to import whenever you are.', [{ label: 'Import everything valid', icon: 'cloud_upload', action: 'import', primary: true }]); break;
      case 'import': doImport(); break;
      case 'showFix': addUser('Show me the rows to fix'); wiseSay(`The ${SAMPLE_RESULT.fix.length} rows that didn't validate are listed in <strong>Catalog</strong> with each reason. Fix them in your file and upload again — I match on UPC, so nothing duplicates.`, [{ label: 'Fix & re-upload', icon: 'upload_file', action: 'upload' }, { label: 'Verify the imported ones', icon: 'verified', action: 'verify', primary: true }]); break;
      case 'verify': onVerify(); break;
      case 'single': window.location.href = 'add-product.html'; break;
      case 'restart': restart(); break;
      case 'exit': window.location.href = 'product-portfolio.html'; break;
      default: break;
    }
  }

  function restart() {
    Object.assign(state, {
      stage: 'start', file: null, mapped: false, imported: false, verified: false,
      result: null, analyzePct: 0, step: 'upload', awaiting: null,
    });
    if (messagesEl) messagesEl.innerHTML = '';
    if (welcomeEl) { welcomeEl.classList.remove('sc-hidden'); welcomeEl.style.display = ''; }
    render();
    revealWelcome();
  }

  /* ─────────────────────────── input handling ─────────────────────────── */
  function onSubmit() {
    const v = (inputEl.value || '').trim();
    if (!v) return;
    inputEl.value = '';
    addUser(v);
    interpret(v);
  }
  function interpret(text) {
    const t = text.toLowerCase();
    if (/(template)/.test(t)) { dispatch('template'); return; }
    if (/(example|sample)/.test(t)) { dispatch('example'); return; }
    if (/(instruction|guide|how|field|help)/.test(t)) { showInstructions(); return; }
    if (/(one product|single|just one)/.test(t)) { dispatch('single'); return; }
    if (/(upload|csv|import|file)/.test(t) && state.stage === 'start') { openPicker(); return; }
    if (/(import)/.test(t) && state.mapped && !state.imported) { doImport(); return; }
    if (/(verif)/.test(t) && state.imported) { onVerify(); return; }
    wiseSay('Attach your catalog with the <strong>+</strong> button (CSV, Excel, Numbers or a retailer export), or grab the template / example / field guide. Nothing imports until you say go.',
      [
        { label: 'Upload a CSV', icon: 'upload_file', action: 'upload', primary: true },
        { label: 'Download the template', icon: 'download', action: 'template' },
        { label: 'Read the instructions', icon: 'menu_book', action: 'instructions' },
      ]);
  }

  /* ─────────────────────────── init ─────────────────────────── */
  const WELCOME_CHIPS = [
    { label: 'Upload a CSV', icon: 'upload_file', action: 'upload' },
    { label: 'Download CSV template', icon: 'download', action: 'template' },
    { label: 'View an example CSV', icon: 'table_view', action: 'example' },
    { label: 'Read upload instructions', icon: 'menu_book', action: 'instructions' },
    { label: 'I only have one product', icon: 'inventory_2', action: 'single' },
  ];

  function init() {
    messagesEl = $('chat-messages');
    welcomeEl = $('welcome-screen');
    chipsStartEl = $('ws-chips-start');
    inputEl = $('chat-input');
    catBody = $('cat-body');
    progressEl = $('ap-progress');
    fileInput = $('ap-file');
    if (!messagesEl || !catBody || !progressEl) return;

    if (chipsStartEl) {
      chipsStartEl.innerHTML = WELCOME_CHIPS.map((c) =>
        `<button type="button" class="chip ws-intent-chip" data-action="${esc(c.action)}"><span class="material-symbols-outlined">${esc(c.icon)}</span>${esc(c.label)}</button>`).join('');
    }

    revealWelcome();
    render();

    // Chip clicks (welcome + inline reply chips)
    document.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-action]');
      if (chip && (welcomeEl?.contains(chip) || messagesEl.contains(chip))) {
        dispatch(chip.dataset.action);
        return;
      }
      // Catalog module affordances
      const acBtn = e.target.closest('[data-ac]');
      if (acBtn && catBody.contains(acBtn)) { dispatch(acBtn.dataset.ac); return; }
      // Progress module minimize toggle
      const minBtn = e.target.closest('[data-ap-min]');
      if (minBtn && progressEl.contains(minBtn)) { progressMin = !progressMin; renderProgress(); return; }
    });
    // Dropzone keyboard + drag/drop
    catBody.addEventListener('keydown', (e) => {
      const drop = e.target.closest('#cat-drop');
      if (drop && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openPicker(); }
    });
    catBody.addEventListener('dragover', (e) => {
      const drop = e.target.closest('#cat-drop');
      if (drop) { e.preventDefault(); drop.classList.add('is-drag'); }
    });
    catBody.addEventListener('dragleave', (e) => {
      const drop = e.target.closest('#cat-drop');
      if (drop) drop.classList.remove('is-drag');
    });
    catBody.addEventListener('drop', (e) => {
      const drop = e.target.closest('#cat-drop');
      if (!drop) return;
      e.preventDefault();
      drop.classList.remove('is-drag');
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) onFile(f);
    });

    // Input send
    $('ap-send')?.addEventListener('click', onSubmit);
    inputEl?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(); } });

    // Attach popover (left, inside the input) → routes every file type to the picker
    const attachBtn = $('ap-attach');
    const attachPop = $('ap-attach-pop');
    const closeAttach = () => { attachPop?.classList.remove('open'); attachBtn?.setAttribute('aria-expanded', 'false'); };
    attachBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !attachPop.classList.contains('open');
      attachPop.classList.toggle('open', open);
      attachBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    attachPop?.addEventListener('click', (e) => {
      const it = e.target.closest('[data-up]');
      if (!it) return;
      closeAttach();
      openPicker();
    });
    document.addEventListener('click', (e) => {
      if (attachPop?.classList.contains('open') && !attachPop.contains(e.target) && !attachBtn.contains(e.target)) closeAttach();
    });
    fileInput?.addEventListener('change', () => onFile(fileInput.files && fileInput.files[0]));

    // Footer import / verify button
    $('cat-import-btn')?.addEventListener('click', () => {
      if (state.stage === 'mapped') doImport();
      else if (state.imported && !state.verified) onVerify();
    });

    // Chat width toggle — the canonical four-step cycle (matches Add Product).
    const WIDTH_ICONS = ['width_normal', 'width_wide', 'width_full', 'width_full'];
    const WIDTH_TITLES = ['Widen chat', 'Widen chat further', 'Widen chat to triple', 'Fill remaining space'];
    let widthTier = 0;
    const widthBtn = $('ap-width');
    function syncWidth() {
      const chat = document.querySelector('.ap-chat');
      if (chat) {
        chat.classList.toggle('panel-wide', widthTier >= 1);
        chat.classList.toggle('panel-triple', widthTier >= 2);
        chat.classList.toggle('panel-fill', widthTier >= 3);
      }
      if (widthBtn) {
        const ic = widthBtn.querySelector('.material-symbols-outlined');
        if (ic) ic.textContent = WIDTH_ICONS[widthTier];
        widthBtn.classList.toggle('is-on', widthTier >= 1);
        widthBtn.setAttribute('aria-pressed', widthTier >= 1 ? 'true' : 'false');
        widthBtn.title = WIDTH_TITLES[widthTier];
      }
    }
    widthBtn?.addEventListener('click', () => { widthTier = (widthTier + 1) % 4; syncWidth(); });

    // Chat topbar menu (restart / export / share / close)
    const menuBtn = $('ap-chat-menu-btn');
    const menu = $('ap-chat-menu');
    menuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = menu.classList.contains('hidden');
      menu.classList.toggle('hidden', !open);
      menuBtn.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    menu?.addEventListener('click', (e) => {
      const item = e.target.closest('[data-ap]');
      if (!item) return;
      menu.classList.add('hidden'); menuBtn.classList.remove('is-open');
      const a = item.dataset.ap;
      if (a === 'restart' || a === 'close') restart();
      else if (a === 'export') exportTranscript();
      else if (a === 'share') shareTranscript();
    });
    document.addEventListener('click', (e) => {
      if (menu && !menu.classList.contains('hidden') && !menu.contains(e.target) && e.target !== menuBtn && !menuBtn?.contains(e.target)) {
        menu.classList.add('hidden'); menuBtn.classList.remove('is-open');
      }
    });
  }

  function getTranscriptText() {
    return Array.from(messagesEl.querySelectorAll('.sc-line-body, .ap-sys-note')).map((n) => n.innerText).join('\n');
  }
  function exportTranscript() {
    const blob = new Blob([getTranscriptText()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'wiseai-conversation.txt';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
  function shareTranscript() {
    const text = getTranscriptText();
    if (navigator.share) { navigator.share({ title: 'WISEcodeAI conversation', text }).catch(() => {}); return; }
    try { navigator.clipboard.writeText(text); } catch (_) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
