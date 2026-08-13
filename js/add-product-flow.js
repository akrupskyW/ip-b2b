/**
 * Add Product flow — the conversational product-builder that powers
 * pages/add-product.html.
 *
 * Three modules work as one:
 *   • Chat (left)      — WISEcodeAI walks you through collecting each field. You can
 *                        answer with intent chips, free text, or uploads.
 *   • Product Details  — a live, editable Nutrition-Facts-style card (nfp-*).
 *     (NFP, middle)      Anything you edit here echoes back into the chat, and
 *                        anything the chat collects renders here instantly.
 *   • Progress (right) — the shared vfp-* progress module tracking every step.
 *
 * Nothing is persisted until "Save to Portfolio" is pressed — until then it is
 * just a conversation (a draft).
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

  /* ─────────────────────────── model ─────────────────────────── */
  /* Nutrition rows, in label order. `amt` = amount text (e.g. "12g"),
     `dv` = % Daily Value text. */
  const NF_ROWS = [
    { key: 'totalFat', label: 'Total Fat', bold: true },
    { key: 'satFat', label: 'Saturated Fat', ind: 1 },
    { key: 'transFat', label: '<em>Trans</em> Fat', ind: 1, noDV: true },
    { key: 'cholesterol', label: 'Cholesterol', bold: true },
    { key: 'sodium', label: 'Sodium', bold: true },
    { key: 'totalCarb', label: 'Total Carbohydrate', bold: true },
    { key: 'fiber', label: 'Dietary Fiber', ind: 1 },
    { key: 'totalSugars', label: 'Total Sugars', ind: 1, noDV: true },
    { key: 'addedSugars', label: 'Includes Added Sugars', ind: 2, includes: true },
    { key: 'protein', label: 'Protein', bold: true, noDV: true, noBorder: true },
  ];
  const NF_MICRO = [
    { key: 'vitaminD', label: 'Vitamin D' },
    { key: 'calcium', label: 'Calcium' },
    { key: 'iron', label: 'Iron' },
    { key: 'potassium', label: 'Potassium', noBorder: true },
  ];
  const NF_LABELS = {};
  NF_ROWS.concat(NF_MICRO).forEach((r) => { NF_LABELS[r.key] = r.label.replace(/<[^>]+>/g, ''); });
  NF_LABELS.calories = 'Calories';
  NF_LABELS.servingSize = 'Serving size';
  NF_LABELS.servingsPer = 'Servings per container';

  function blankNf() {
    const nf = { servingsPer: '', servingSize: '', calories: '' };
    NF_ROWS.concat(NF_MICRO).forEach((r) => { nf[r.key] = { amt: '', dv: '' }; });
    return nf;
  }

  const state = {
    step: null,
    productName: '',
    brand: 'Flax4Life',
    image: null,          // main product image (data URL or URL)
    images: [],           // additional images: {src,label}
    activeImage: 0,
    category: '',
    ingredients: '',
    allergens: [],        // ['Wheat','Soy']
    contains: '',
    upc: '',
    nf: blankNf(),
    errors: {},           // fieldKey -> message
    done: {},             // stepId -> true (completed or skipped)
    skipped: {},          // stepId -> true
    awaiting: null,       // field the chat input is currently capturing
    saved: false,
    nfpWide: false,       // false = single pane; true = double-pane (photo column)
  };

  const ALLERGEN_EMOJI = {
    milk: '🥛', dairy: '🥛', egg: '🥚', eggs: '🥚', fish: '🐟', shellfish: '🦐',
    'tree nuts': '🌰', treenuts: '🌰', nuts: '🌰', peanut: '🥜', peanuts: '🥜',
    wheat: '🌾', gluten: '🌾', soy: '🫘', soybeans: '🫘', sesame: '🌱',
  };
  function allergenEmoji(name) {
    return ALLERGEN_EMOJI[String(name).toLowerCase().trim()] || '⚠️';
  }

  /* Demo payload used when a label photo / URL is "parsed". Micronutrients are
     intentionally left unreadable to demonstrate error highlighting + repair. */
  const SAMPLE_PARSE = {
    productName: 'Flax4Life Chocolate Chip Muffins',
    category: 'Bakery › Muffins',
    ingredients: 'Ground Flaxseed, Cane Sugar, Egg Whites, Water, Chocolate Chips (Cane Sugar, Unsweetened Chocolate, Cocoa Butter), Non-GMO Expeller-Pressed Canola Oil, Cocoa, Baking Soda, Baking Powder, Sea Salt, Xanthan Gum, Natural Flavor.',
    allergens: ['Eggs'],
    contains: 'Eggs. Made in a facility that also processes tree nuts and soy.',
    nf: {
      servingsPer: '4', servingSize: '1 muffin (57g)', calories: '190',
      totalFat: { amt: '11g', dv: '14%' }, satFat: { amt: '1.5g', dv: '8%' },
      transFat: { amt: '0g', dv: '' }, cholesterol: { amt: '0mg', dv: '0%' },
      sodium: { amt: '210mg', dv: '9%' }, totalCarb: { amt: '18g', dv: '7%' },
      fiber: { amt: '5g', dv: '18%' }, totalSugars: { amt: '9g', dv: '' },
      addedSugars: { amt: '8g', dv: '16%' }, protein: { amt: '5g', dv: '' },
      vitaminD: { amt: '', dv: '' }, calcium: { amt: '', dv: '' },
      iron: { amt: '', dv: '' }, potassium: { amt: '', dv: '' },
    },
    errors: {
      'nf.vitaminD': 'Unreadable — low resolution',
      'nf.calcium': 'Unreadable — low resolution',
      'nf.iron': 'Unreadable — low resolution',
      'nf.potassium': 'Unreadable — low resolution',
    },
    image: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=640&q=70',
  };

  /* ─────────────────────────── steps ─────────────────────────── */
  const STEPS = [
    { id: 'photo', label: 'Product photo', icon: 'photo_camera' },
    { id: 'category', label: 'Category', icon: 'category' },
    { id: 'ingredients', label: 'Ingredients', icon: 'receipt_long' },
    { id: 'nutrition', label: 'Nutrition Facts', icon: 'monitoring' },
    { id: 'allergens', label: 'Allergens', icon: 'health_and_safety' },
    { id: 'upc', label: 'UPC / barcode', icon: 'qr_code_2' },
    { id: 'photos', label: 'Additional photos', icon: 'collections' },
    { id: 'save', label: 'Save to portfolio', icon: 'inventory_2' },
  ];

  /* ─────────────────────────── DOM refs ─────────────────────────── */
  let messagesEl, welcomeEl, chipsStartEl, inputEl, nfpBody, progressEl, fileInput;
  let uploadContext = 'main';
  /* Progress module defaults to the minimal (collapsed) view; header button toggles it. */
  let progressMin = true;

  /* ─────────────────────────── chat primitives ─────────────────────────── */
  /* Follow the conversation without losing the reader's place: advance the
     scroll toward the bottom, but never push the reader's latest message above
     the top of the viewport — a long reply stops there so they keep reading
     from where they typed. Never scrolls back up; pass `force` (a fresh user
     action) to re-engage a reader who scrolled away. */
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

  /* Word-by-word reveal DISABLED — chat text appears whole. The typeInLine
     signature is kept so the timestamp / chip reveal chain runs unchanged. */
  const prefersReducedMotion = (() => {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (_) { return false; }
  })();
  function typeInLine(bodyEl, done) {
    scrollDown();
    if (done) done();
  }

  function addUser(text) {
    hideWelcome();
    messagesEl.insertAdjacentHTML('beforeend',
      `<div class="sc-line sc-line-you"><span class="sc-avatar sc-avatar-you" role="img" aria-label="You">AK</span><div class="sc-line-body">${esc(text)}<div class="sc-line-meta"><span class="sc-line-time">${esc(nowLabel())}</span></div></div></div>`);
    scrollDown(true); /* fresh user action — always bring their message into view */
  }
  function addUserImage(src, name) {
    hideWelcome();
    messagesEl.insertAdjacentHTML('beforeend',
      `<div class="sc-line sc-line-you"><span class="sc-avatar sc-avatar-you" role="img" aria-label="You">AK</span><div class="sc-line-body">${esc(name || 'Photo')}<div class="ap-attach-preview"><img src="${esc(src)}" alt="" onerror="this.style.display='none'"></div><div class="sc-line-meta"><span class="sc-line-time">${esc(nowLabel())}</span></div></div></div>`);
    scrollDown(true); /* fresh user action — always bring their message into view */
  }
  function chipsRow(chips) {
    if (!chips || !chips.length) return '';
    /* A chip flagged `primary` is the conclusive/result action for the step
       (e.g. "Done", "Save to Portfolio") — render it as the brand-blue pill so
       it reads as the emphasized choice. */
    return `<div class="sc-reply-chips">${chips.map((c) =>
      `<button type="button" class="chip${c.primary ? ' chip-primary' : ''}" data-action="${esc(c.action)}"${c.arg != null ? ` data-arg="${esc(c.arg)}"` : ''}><span class="material-symbols-outlined">${esc(c.icon || 'bolt')}</span>${esc(c.label)}</button>`).join('')}</div>`;
  }
  /* Prime an element to slide in from the left, then reveal a set of them one
     after another (left→right) so the timestamp and reply chips each animate in,
     in order, once the answer has finished typing. */
  function apPrimeLeft(el) {
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateX(-6px)';
    el.style.transition = 'opacity .2s ease, transform .2s ease';
  }
  /* Prime an element to FLY IN from the right; apRevealStaggered clears the
     transform so it sails right→left and lands. Used for the welcome intent
     chips so they arrive only after the heading + sub have typed in. */
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
  /* Welcome-screen reveal: type the heading, then the sub, WORD-BY-WORD (just
     like every WISEcodeAI answer), then fly the intent chips in from the right so
     they land AFTER all the copy — never sitting there before it. Honors
     reduced-motion (everything just shows). */
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
    typeText(heading, () => typeText(subEl, () => {
      apRevealStaggered(chips, 90, 60, null);
    }));
  }
  function addWISEcodeAI(html, chips) {
    hideWelcome();
    const footer = `<div class="sc-line-meta"><span class="sc-line-time">${esc(nowLabel())}</span></div>`;
    /* Insert the line WITHOUT its reply chips, type the reply in word-by-word,
       then bring in the timestamp, then the chips (left→right) — text, timestamp,
       chips, in order. */
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
      /* Reply chips fly in from the RIGHT — the same animation the welcome
         chips use — so every chip animates identically across the module. */
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
    const note = messagesEl.lastElementChild;
    scrollDown();
    typeInLine(note);
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
  /* Post a WISEcodeAI reply after a short "thinking" beat. */
  function wiseSay(html, chips, delay) {
    const t = showTyping();
    setTimeout(() => { t.remove(); addWISEcodeAI(html, chips); }, delay || 560);
  }

  /* ─────────────────────────── NFP module render ─────────────────────────── */
  function barcodeSVG(digits) {
    const seed = String(digits || '').replace(/\D/g, '') || '000000000000';
    let x = 0; const bars = []; const H = 42;
    for (let i = 0; i < seed.length * 4; i++) {
      const d = Number(seed[i % seed.length]);
      const w = (d % 4) + 1;
      if (i % 2 === 0) bars.push(`<rect x="${x}" y="0" width="${w}" height="${H}" fill="#111"/>`);
      x += w + ((d % 3) === 0 ? 1 : 0.5);
    }
    return `<svg class="nfp-barcode-svg" width="${Math.min(x, 220)}" height="${H}" viewBox="0 0 ${x} ${H}" preserveAspectRatio="none" aria-hidden="true">${bars.join('')}</svg>`;
  }

  function editSpan(fieldPath, value, placeholder) {
    const empty = !value;
    return `<span class="nfp-edit${empty ? ' nfp-edit-empty' : ''}" contenteditable="true" role="textbox" data-field="${esc(fieldPath)}" data-ph="${esc(placeholder || '')}">${empty ? esc(placeholder || '—') : esc(value)}</span>`;
  }

  /* Product categories — the "proper" finished-product categories mirrored from
     the Ingredient Browser taxonomy (pages/ingredient-browser.html). */
  const CATEGORIES = [
    'Bakery Products',
    'Beverages',
    'Confections',
    'Frozen desserts',
    'Grain Food Products',
    'Plant-based Products',
    'Prepared Condiments',
    'Prepared Fruit products',
    'Prepared Soup & Bases',
    'Processed Meat Foods',
    'Seafood Products',
    'Spice & Seasoning Blends',
    'Vegetables, Dry Snacks',
  ];
  function useCatDropdown() {
    return !!(typeof window !== 'undefined' && window.WISE_HERO_BRAND);
  }
  /* One self-contained dropdown (a native <select>, so it escapes the hero's
     overflow:hidden clipping) that replaces the old chip + separate "Change"
     button. Any pre-set value not in the list is preserved as the first option. */
  function catSelectInner(onPhoto) {
    const list = CATEGORIES.slice();
    if (state.category && !list.includes(state.category)) list.unshift(state.category);
    const err = state.errors.category;
    const opts = list.map((c) => `<option value="${esc(c)}"${c === state.category ? ' selected' : ''}>${esc(c)}</option>`).join('');
    const ph = state.category ? '' : '<option value="" disabled selected>Select a category…</option>';
    return `<div class="nfp-cat-select${onPhoto ? ' nfp-cat-select--onphoto' : ''}${state.category ? '' : ' nfp-cat-select--empty'}${err ? ' nfp-cat-select--err' : ''}">
        <span class="material-symbols-outlined nfp-cat-select-ic">sell</span>
        <select class="nfp-cat-native" data-nfp-cat aria-label="Product category">${ph}${opts}</select>
        <span class="material-symbols-outlined nfp-cat-select-caret">expand_more</span>
      </div>`;
  }

  /* Category + UPC affordances rendered as overlays inside the combined hero.
     `onPhoto` switches to on-photo (light-on-dark) styling. */
  function heroCatHTML(onPhoto) {
    const err = state.errors.category;
    const note = err ? `<div class="nfp-hero-field-note"><span class="material-symbols-outlined">error_outline</span>${esc(err)}</div>` : '';
    if (useCatDropdown()) {
      return `<div class="nfp-hero-cat">${catSelectInner(onPhoto)}</div>${note}`;
    }
    const btnCls = onPhoto ? 'nfp-mini-btn nfp-mini-btn--onphoto' : 'nfp-mini-btn';
    const inner = state.category
      ? `<span class="nfp-cat-chip${onPhoto ? ' nfp-cat-chip--onphoto' : ''}"><span class="material-symbols-outlined">sell</span>${esc(state.category)}</span>
         <button type="button" class="${btnCls}" data-nfp="cat-edit"><span class="material-symbols-outlined">edit</span>Change</button>`
      : `<button type="button" class="${btnCls}" data-nfp="cat-edit"><span class="material-symbols-outlined">add</span>Add category <span class="nfp-req">*</span></button>`;
    return `<div class="nfp-hero-cat">${inner}</div>${note}`;
  }
  function heroUpcHTML(onPhoto) {
    if (!state.upc) {
      const btnCls = onPhoto ? 'nfp-mini-btn nfp-mini-btn--onphoto' : 'nfp-mini-btn';
      return `<div class="nfp-hero-upc"><button type="button" class="${btnCls}" data-nfp="upc-edit"><span class="material-symbols-outlined">qr_code_2</span>Add a UPC</button></div>`;
    }
    return `<div class="nfp-hero-upc nfp-rupc">${barcodeSVG(state.upc)}<div class="nfp-rupc-num">${editSpan('upc', state.upc, 'UPC digits')}</div></div>`;
  }

  /* Combined hero — one container holding the product photo (or the upload
     dropzone) with the name, brand, category and UPC all stacked on top of it.
     When a photo exists they overlay it (light-on-dark); before a photo they
     sit on a light panel so every field stays visible and editable. */
  /* Compact brand monogram (e.g. "Flax4Life" → "F4L") for the hero badge. */
  function brandMono() {
    const b = String(state.brand || '').trim();
    if (!b) return '';
    const caps = b.replace(/[^A-Za-z0-9]/g, '').match(/[A-Z0-9]/g);
    let mono = caps ? caps.join('') : '';
    if (mono.length < 2) mono = b.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
    return mono.slice(0, 3);
  }
  function richHeroHTML() {
    const onPhoto = !!state.image;
    /* Opt-in (per page) to the branded hero: icon-only edit affordance plus a
       small circular brand-logo badge in the top-right corner. */
    const wantHeroBrand = !!(typeof window !== 'undefined' && window.WISE_HERO_BRAND);
    const stack = `<div class="nfp-hero-stack${onPhoto ? '' : ' nfp-hero-stack--light'}">
        <div class="nfp-hero-name">${editSpan('productName', state.productName, 'Product name')}</div>
        ${state.brand ? `<div class="nfp-hero-brand">${esc(state.brand)}</div>` : ''}
        ${heroCatHTML(onPhoto)}
        ${heroUpcHTML(onPhoto)}
      </div>`;
    if (!onPhoto) {
      return `<div class="nfp-hero nfp-hero--rich nfp-hero--empty">
        <div class="nfp-hero-empty" data-nfp="upload-main">
          <span class="material-symbols-outlined">add_a_photo</span>
          <span class="neh-t">Add a product photo</span>
          <span class="neh-d">Upload, take a photo, or paste a URL</span>
        </div>
        ${stack}
      </div>`;
    }
    const heroEdit = wantHeroBrand
      ? `<button type="button" class="nfp-hero-edit nfp-hero-edit--icon" data-nfp="upload-main" title="Replace photo" aria-label="Replace photo"><span class="material-symbols-outlined">edit</span></button>`
      : `<button type="button" class="nfp-hero-edit" data-nfp="upload-main"><span class="material-symbols-outlined">photo_camera</span>Replace</button>`;
    const heroLogo = wantHeroBrand && state.brand
      ? `<span class="nfp-hero-logo" title="${esc(state.brand)}" aria-label="${esc(state.brand)} logo"><span class="nfp-hero-logo-mono">${esc(brandMono())}</span></span>`
      : '';
    return `<div class="nfp-hero nfp-hero--rich">
      <img class="nfp-hero-img" src="${esc(state.image)}" alt="" onerror="this.src='https://placehold.co/300x260/1A2339/ffffff?text=Product'">
      <div class="nfp-hero-scrim" aria-hidden="true"></div>
      ${heroEdit}
      ${heroLogo}
      ${stack}
    </div>`;
  }

  function categoryHTML() {
    const err = state.errors.category;
    const chip = useCatDropdown()
      ? catSelectInner(false)
      : (state.category
        ? `<span class="nfp-cat-chip"><span class="material-symbols-outlined">sell</span>${esc(state.category)}</span>
         <button type="button" class="nfp-mini-btn" data-nfp="cat-edit"><span class="material-symbols-outlined">edit</span>Change</button>`
        : `<button type="button" class="nfp-mini-btn" data-nfp="cat-edit"><span class="material-symbols-outlined">add</span>Add category <span class="nfp-req">*</span></button>`);
    return `<div class="nfp-cat${err ? ' nfp-block-err' : ''}">
      <div class="nfp-cat-label">Category</div>
      <div class="nfp-cat-row">${chip}</div>
      ${err ? `<div class="nfp-field-note"><span class="material-symbols-outlined">error_outline</span>${esc(err)}</div>` : ''}
    </div>`;
  }

  function foodIdentityHTML() {
    const all = [];
    if (state.image) all.push({ src: state.image, label: 'Primary' });
    state.images.forEach((im) => all.push(im));
    const thumbs = all.map((im, i) => `
      <div class="nfp-fi-thumb${i === state.activeImage ? ' active' : ''}" data-nfp="pick-image" data-arg="${i}" title="${esc(im.label || 'Photo')}">
        <img class="nfp-fi-thumb-img" src="${esc(im.src)}" alt="${esc(im.label || '')}" onerror="this.src='https://placehold.co/40x40/f3f4f6/9ca3af?text=?'">
        <span class="nfp-fi-thumb-label">${esc(im.label || 'Photo')}</span>
      </div>`).join('');
    return `<div class="nfp-fi">
      <div class="nfp-fi-header">
        <span class="nfp-fi-title">Product Images</span>
        <span class="nfp-fi-badge">${all.length} ${all.length === 1 ? 'image' : 'images'}</span>
      </div>
      <div class="nfp-fi-thumbs">
        ${thumbs}
        <div class="nfp-fi-add" data-nfp="add-image" title="Add another image"><span class="material-symbols-outlined">add</span></div>
      </div>
    </div>`;
  }

  function nfRowHTML(r) {
    const val = state.nf[r.key] || { amt: '', dv: '' };
    const errKey = 'nf.' + r.key;
    const err = state.errors[errKey];
    const indCls = r.ind === 1 ? ' nfp-nf-ind1' : r.ind === 2 ? ' nfp-nf-ind2' : '';
    const noB = r.noBorder ? ' nfp-nf-no-b' : '';
    let main;
    if (r.includes) {
      main = `Includes ${editSpan(errKey + '.amt', val.amt, '—')} Added Sugars`;
    } else if (r.bold) {
      main = `<strong>${r.label}</strong>&nbsp;${editSpan(errKey + '.amt', val.amt, '—')}`;
    } else {
      main = `${r.label}&nbsp;${editSpan(errKey + '.amt', val.amt, '—')}`;
    }
    const dv = r.noDV ? '' : editSpan(errKey + '.dv', val.dv, '—');
    return `<div class="nfp-nf-row${indCls}${noB}${err ? ' nfp-row-err' : ''}">
        <div class="nfp-nf-main">${main}${err ? `<span class="nfp-field-note" style="margin-left:8px"><span class="material-symbols-outlined">error_outline</span>${esc(err)}</span>` : ''}</div>
        <div class="nfp-nf-dv${err ? ' nfp-err-val' : ''}">${dv}</div>
      </div>`;
  }

  function nutritionHTML() {
    return `<div class="nfp-nf-panel">
      <div class="nfp-nf-title">Nutrition Facts</div>
      <div class="nfp-nf-serving">
        <div class="nfp-nf-spc-row">${editSpan('nf.servingsPer', state.nf.servingsPer, '0')} servings per container</div>
        <div class="nfp-nf-ss-row"><span>Serving size</span><strong>${editSpan('nf.servingSize', state.nf.servingSize, 'e.g. 1 muffin (57g)')}</strong></div>
      </div>
      <div class="nfp-nf-rule8"></div>
      <div class="nfp-nf-cal-band">
        <div class="nfp-nf-cal-left"><span class="nfp-nf-cal-sm">Amount Per Serving</span><span class="nfp-nf-cal-text">Calories</span></div>
        <span class="nfp-nf-cal-num">${editSpan('nf.calories', state.nf.calories, '0')}</span>
      </div>
      <div class="nfp-nf-dv-hdr">% Daily Value*</div>
      ${NF_ROWS.map(nfRowHTML).join('')}
      <div class="nfp-nf-rule8"></div>
      ${NF_MICRO.map(nfRowHTML).join('')}
      <div class="nfp-nf-footer">* The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.</div>
    </div>`;
  }

  function ingredientsHTML() {
    const err = state.errors.ingredients;
    const ingredBody = state.ingredients
      ? `<span class="nfp-ingred-label">Ingredients:</span> ${editSpan('ingredients', state.ingredients, '')}`
      : `<span class="nfp-ingred-label">Ingredients:</span> ${editSpan('ingredients', '', 'Tap to add the ingredient list')} <span class="nfp-req">*</span>`;
    const allergTags = state.allergens.length
      ? state.allergens.map((a, i) => `<span class="nfp-allergen-tag"><span class="nfp-allergen-emoji">${allergenEmoji(a)}</span>${esc(a)} <span data-nfp="remove-allergen" data-arg="${i}" style="cursor:pointer;color:#9ca3af;margin-left:1px" title="Remove">×</span></span>`).join('')
      : '<span style="font-size:0.66rem;color:#9ca3af;font-style:italic">None declared yet</span>';
    return `<div class="nfp-ingred-wrap">
      <div class="nfp-ingred-body${err ? ' nfp-block-err' : ''}">
        <p class="nfp-ingred-text">${ingredBody}</p>
        ${err ? `<div class="nfp-field-note"><span class="material-symbols-outlined">error_outline</span>${esc(err)}</div>` : ''}
      </div>
      <div class="nfp-allergen-wrap">
        <div class="nfp-allergen-heading">Allergens</div>
        <div class="nfp-allergen-tags">${allergTags}
          <button type="button" class="nfp-mini-btn" data-nfp="add-allergen" style="margin-left:2px"><span class="material-symbols-outlined">add</span>Add</button>
        </div>
      </div>
      <div class="nfp-contains"><strong>Contains:</strong> ${editSpan('contains', state.contains, 'e.g. Wheat, Soy')}</div>
    </div>`;
  }

  /* ── Wide (double-pane) right column: the product photo fills the whole
     right column, with the image gallery + UPC barcode overlaid on it. ── */
  function allImages() {
    const all = [];
    if (state.image) all.push({ src: state.image, label: 'Primary' });
    state.images.forEach((im) => all.push(im));
    return all;
  }
  function rThumbsHTML(all) {
    const thumbs = all.map((im, i) => `
      <button type="button" class="nfp-rthumb${i === state.activeImage ? ' active' : ''}" data-nfp="pick-image" data-arg="${i}" title="${esc(im.label || 'Photo')}">
        <img src="${esc(im.src)}" alt="${esc(im.label || '')}" onerror="this.src='https://placehold.co/40x40/1A2339/ffffff?text=?'">
      </button>`).join('');
    return `<div class="nfp-rthumbs">
      <span class="nfp-rthumbs-badge">${all.length} ${all.length === 1 ? 'IMG' : 'IMGS'}</span>
      ${thumbs}
      <button type="button" class="nfp-rthumb nfp-rthumb-add" data-nfp="add-image" title="Add another image"><span class="material-symbols-outlined">add</span></button>
    </div>`;
  }
  function rUpcHTML() {
    if (!state.upc) {
      return `<div class="nfp-rupc nfp-rupc-empty">
        <button type="button" class="nfp-mini-btn nfp-mini-btn--onphoto" data-nfp="upc-edit"><span class="material-symbols-outlined">qr_code_2</span>Add a UPC</button>
      </div>`;
    }
    return `<div class="nfp-rupc">
      ${barcodeSVG(state.upc)}
      <div class="nfp-rupc-num">${editSpan('upc', state.upc, 'UPC digits')}</div>
    </div>`;
  }
  function rightColumnHTML() {
    const all = allImages();
    if (!all.length) {
      /* Keep the name/brand editable before a photo exists, mirroring the
         single-pane hero and the chat's "type the name" action. */
      return `<div class="nfp-rcol-empty">
        <div class="nfp-hero-empty nfp-hero-empty--fill" data-nfp="upload-main">
          <span class="material-symbols-outlined">add_a_photo</span>
          <span class="neh-t">Add a product photo</span>
          <span class="neh-d">Fills the whole right pane</span>
        </div>
        <div class="nfp-rcol-foot">
          <div class="nfp-rcol-name">${editSpan('productName', state.productName, 'Product name')}</div>
          ${state.brand ? `<div class="nfp-rcol-brand">${esc(state.brand)}</div>` : ''}
          ${rUpcHTML()}
        </div>
      </div>`;
    }
    const active = all[Math.min(state.activeImage, all.length - 1)];
    return `<div class="nfp-rcol">
      <img class="nfp-rcol-img" src="${esc(active.src)}" alt="" onerror="this.src='https://placehold.co/400x640/1A2339/ffffff?text=Product'">
      <div class="nfp-rcol-scrim" aria-hidden="true"></div>
      <button type="button" class="nfp-rcol-replace" data-nfp="upload-main" title="Replace photo"><span class="material-symbols-outlined">photo_camera</span></button>
      <div class="nfp-rcol-top">${rThumbsHTML(all)}</div>
      <div class="nfp-rcol-bottom">
        <div class="nfp-rcol-name">${editSpan('productName', state.productName, 'Product name')}</div>
        ${state.brand ? `<div class="nfp-rcol-brand">${esc(state.brand)}</div>` : ''}
        ${rUpcHTML()}
      </div>
    </div>`;
  }

  function renderNFP() {
    if (!nfpBody) return;
    if (state.nfpWide) {
      /* Double-pane: LEFT = category + Nutrition Facts + ingredients; RIGHT =
         the product photo column with the gallery + UPC overlaid on it. */
      nfpBody.innerHTML =
        `<div class="nfp-cols">
          <div class="nfp-col-left">${categoryHTML()}${nutritionHTML()}${ingredientsHTML()}</div>
          <div class="nfp-col-right">${rightColumnHTML()}</div>
        </div>`;
    } else {
      nfpBody.innerHTML = richHeroHTML() + foodIdentityHTML() + nutritionHTML() + ingredientsHTML();
    }
    updateSaveState();
  }

  /* Clear a single Nutrition-Facts field's error visuals in place — used when a
     value is committed from the panel so we DON'T rebuild the whole card (which
     would drop focus while the user is fixing several flagged rows in a row). */
  function clearNfFieldVisual(path) {
    const span = nfpBody.querySelector(`[data-field="${path}"]`);
    if (!span) return;
    span.classList.remove('nfp-edit-empty');
    const row = span.closest('.nfp-nf-row');
    if (row) {
      row.classList.remove('nfp-row-err');
      const note = row.querySelector('.nfp-field-note');
      if (note) note.remove();
      const dv = row.querySelector('.nfp-nf-dv');
      if (dv) dv.classList.remove('nfp-err-val');
    }
  }

  /* ─────────────────────────── progress module render ─────────────────────────── */
  function stepFilled(id) {
    switch (id) {
      case 'photo': return !!state.image;
      case 'category': return !!state.category;
      case 'ingredients': return !!state.ingredients;
      case 'nutrition': return !!state.nf.calories && !!state.nf.servingSize;
      case 'allergens': return !!state.done.allergens;
      case 'upc': return !!state.upc || !!state.skipped.upc;
      case 'photos': return state.images.length > 0 || !!state.done.photos;
      case 'save': return state.saved;
      default: return false;
    }
  }
  function stepHasError(id) {
    if (id === 'nutrition') return Object.keys(state.errors).some((k) => k.startsWith('nf.'));
    if (id === 'category') return !!state.errors.category;
    if (id === 'ingredients') return !!state.errors.ingredients;
    return false;
  }
  function stepFields(id) {
    switch (id) {
      case 'photo': return [{ label: 'Primary photo', val: state.image ? 'Added' : 'Missing', done: !!state.image }];
      case 'category': return [{ label: 'Category', val: state.category || 'Missing', done: !!state.category }];
      case 'ingredients': return [{ label: 'Ingredient list', val: state.ingredients ? 'Added' : 'Missing', done: !!state.ingredients }];
      case 'nutrition': return [
        { label: 'Serving size', val: state.nf.servingSize || '—', done: !!state.nf.servingSize },
        { label: 'Calories', val: state.nf.calories || '—', done: !!state.nf.calories },
        { label: 'Nutrients', val: nfErrorCount() ? `${nfErrorCount()} to fix` : 'Complete', done: !nfErrorCount() && !!state.nf.calories, err: !!nfErrorCount() },
      ];
      case 'allergens': return [{ label: 'Allergens', val: state.allergens.length ? state.allergens.join(', ') : (state.done.allergens ? 'None declared' : 'Pending'), done: !!state.done.allergens }];
      case 'upc': return [{ label: 'UPC', val: state.upc || (state.skipped.upc ? 'Skipped' : 'Pending'), done: !!state.upc || !!state.skipped.upc }];
      case 'photos': return [{ label: 'Extra images', val: String(state.images.length), done: state.images.length > 0 || !!state.done.photos }];
      case 'save': return [{ label: 'Status', val: state.saved ? 'Saved' : 'Draft', done: state.saved }];
      default: return [];
    }
  }
  function nfErrorCount() { return Object.keys(state.errors).filter((k) => k.startsWith('nf.')).length; }
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
      const nodeAttrs = `role="button" tabindex="0" data-goto="${s.id}" aria-label="Go to ${esc(s.label)}"`;

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
        <div class="vfp-step-track"><div class="vfp-step-num" ${nodeAttrs}>${num}</div><div class="vfp-step-line"></div></div>
        <div class="vfp-step-body">
          <div class="vfp-step-title">${esc(s.label)}</div>
          ${sub ? `<div class="vfp-step-sub">${esc(sub)}</div>` : ''}
          ${fieldsHtml}
        </div>
      </div>`;
    }).join('');

    const requiredLeft = requiredMissing();
    progressEl.innerHTML = `<div class="vfp-inner ${progressMin ? 'is-min' : ''}">
      <div class="vfp-header">
        <div class="vfp-pct-ring" style="--pct:${pct}"><span>${pct}%</span></div>
        <div class="vfp-header-text">
          <div class="vfp-title">Add product progress</div>
          <div class="vfp-subtitle">${state.brand} · ${STEPS.length} steps</div>
        </div>
        <button type="button" class="vfp-min-btn" data-ap-min aria-label="${progressMin ? 'Expand progress' : 'Collapse progress'}" title="${progressMin ? 'Expand' : 'Collapse'}"><span class="material-symbols-outlined">${progressMin ? 'chevron_left' : 'chevron_right'}</span></button>
      </div>
      <div class="vfp-progress">
        <div class="vfp-progress-head"><span>${completed} of ${STEPS.length} steps</span><span class="vfp-progress-pct">${pct}%</span></div>
        <div class="vfp-progress-track"><div class="vfp-progress-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="vfp-steps">${stepsHtml}</div>
      <div class="vfp-foot">
        <div class="vfp-foot-row"><span>Required left</span><span>${requiredLeft.length}</span></div>
        <div class="vfp-foot-row vfp-foot-total"><span>Ready to save</span><span class="vfp-foot-amt">${requiredLeft.length === 0 && !nfErrorCount() ? 'Yes' : 'No'}</span></div>
      </div>
    </div>`;
  }

  /* ─────────────────────────── required / save ─────────────────────────── */
  const REQUIRED = [
    { key: 'productName', label: 'Product name' },
    { key: 'category', label: 'Category' },
    { key: 'ingredients', label: 'Ingredients' },
    { key: 'nf.servingSize', label: 'Serving size' },
    { key: 'nf.calories', label: 'Calories' },
  ];
  function getPath(path) {
    const parts = path.split('.');
    let cur = state;
    for (const p of parts) { if (cur == null) return undefined; cur = cur[p]; }
    return cur;
  }
  function requiredMissing() {
    return REQUIRED.filter((r) => { const v = getPath(r.key); return !v || (typeof v === 'string' && !v.trim()); });
  }
  function updateSaveState() {
    const btn = $('nfp-save-btn');
    const status = $('nfp-save-status');
    if (!btn) return;
    const missing = requiredMissing();
    const errs = nfErrorCount();
    const ready = missing.length === 0 && errs === 0;
    btn.disabled = !ready || state.saved;
    if (status) status.title = '';
    if (state.saved) {
      if (status) status.innerHTML = '<span class="material-symbols-outlined" style="color:var(--sec-green)">check</span><span>Saved to portfolio</span>';
      btn.innerHTML = '<span class="material-symbols-outlined">check</span>Saved';
    } else if (ready) {
      if (status) status.innerHTML = '<span class="material-symbols-outlined" style="color:var(--sec-green)">task_alt</span><span>Ready to save</span>';
      btn.innerHTML = '<span class="material-symbols-outlined">save</span>Save to Portfolio';
    } else if (errs) {
      if (status) status.innerHTML = `<span class="material-symbols-outlined" style="color:var(--sec-red)">error_outline</span><span>${errs} field${errs > 1 ? 's' : ''} need attention</span>`;
      btn.innerHTML = '<span class="material-symbols-outlined">save</span>Save to Portfolio';
    } else {
      /* Name exactly which required fields are still empty (out of the total)
         so "N left" never reads as if only those N fields are required. */
      const names = missing.map((m) => m.label);
      if (status) {
        status.innerHTML = `<span class="material-symbols-outlined">info</span><span>Draft — still need <strong>${esc(names.join(', '))}</strong> (${missing.length} of ${REQUIRED.length} required)</span>`;
        status.title = 'Required to save: ' + names.join(', ');
      }
      btn.innerHTML = '<span class="material-symbols-outlined">save</span>Save to Portfolio';
    }
  }
  function doSave() {
    const missing = requiredMissing();
    if (missing.length || nfErrorCount()) {
      wiseSay(`Before I can save, a few things still need attention: <strong>${esc(missing.map((m) => m.label).join(', ') || 'flagged nutrients')}</strong>. Want me to jump to the first one?`,
        [{ label: 'Fix it', icon: 'build', action: 'goto:' + (missing.length ? firstMissingStep() : 'nutrition') }]);
      return;
    }
    const record = {
      id: 'ap-' + Date.now(),
      name: state.productName, brand: state.brand, category: state.category,
      ingredients: state.ingredients, allergens: state.allergens, contains: state.contains,
      upc: state.upc, nf: state.nf, image: state.image, images: state.images,
      savedAt: new Date().toISOString(),
    };
    try {
      const key = 'wise-portfolio-additions';
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      arr.push(record);
      localStorage.setItem(key, JSON.stringify(arr));
    } catch (_) {}
    state.saved = true;
    state.step = 'save';
    state.done.save = true;
    renderNFP(); renderProgress();
    addUser('Save it to my portfolio');
    wiseSay(`Done — <strong>${esc(state.productName)}</strong> is saved to your <strong>${esc(state.brand)}</strong> portfolio. It'll show under <strong>Claimed → Needs Info</strong> until ingredients are verified. Want to add another, or head back?`,
      [
        { label: 'Add another product', icon: 'add_box', action: 'restart' },
        { label: 'Back to portfolio', icon: 'inventory_2', action: 'exit' },
      ]);
  }
  function firstMissingStep() {
    const m = requiredMissing()[0];
    if (!m) return 'save';
    if (m.key === 'productName' || m.key === 'photo') return 'photo';
    if (m.key === 'category') return 'category';
    if (m.key === 'ingredients') return 'ingredients';
    if (m.key.startsWith('nf.')) return 'nutrition';
    return 'photo';
  }

  /* ─────────────────────────── commit / sync ─────────────────────────── */
  /* Central write for every field, from chat OR panel. Echoes a system note into
     the transcript, clears any error on that field, and refreshes both modules. */
  function commitField(path, rawVal, opts) {
    opts = opts || {};
    const value = String(rawVal == null ? '' : rawVal).trim();
    let label = '';
    if (path === 'productName') { state.productName = value; label = 'Product name'; }
    else if (path === 'category') { state.category = value; label = 'Category'; delete state.errors.category; }
    else if (path === 'ingredients') { state.ingredients = value; label = 'Ingredients'; delete state.errors.ingredients; }
    else if (path === 'contains') { state.contains = value; label = 'Contains statement'; }
    else if (path === 'upc') { state.upc = value.replace(/[^0-9]/g, ''); label = 'UPC'; }
    else if (path.startsWith('nf.')) {
      const parts = path.split('.'); // nf, key, [amt|dv]
      const key = parts[1];
      if (parts.length === 3) {
        if (!state.nf[key]) state.nf[key] = { amt: '', dv: '' };
        state.nf[key][parts[2]] = value;
      } else {
        state.nf[key] = value;
      }
      delete state.errors['nf.' + key];
      label = NF_LABELS[key] || key;
    }
    if (opts.silent !== true && label) {
      addSysNote(`${label} ${value ? 'set to “' + value + '”' : 'cleared'}${opts.fromPanel ? ' (from Product Details)' : ''}.`, 'edit');
    }
    /* Panel edits of a nutrition cell update in place so focus/caret survive
       while fixing several flagged rows; everything else rebuilds the card. */
    if (opts.inPlace) { clearNfFieldVisual(path); renderProgress(); updateSaveState(); }
    else { renderNFP(); renderProgress(); }
    if (opts.advance) maybeAdvanceAfter(path);
  }

  /* After a value is captured during the guided flow, move to the next step. */
  function maybeAdvanceAfter() {
    const next = nextStep();
    if (next) setTimeout(() => promptStep(next), 260);
  }
  function nextStep() {
    for (const s of STEPS) {
      if (s.id === 'save') continue;
      if (!stepFilled(s.id) && !state.skipped[s.id]) return s.id;
    }
    return 'save';
  }

  /* ─────────────────────────── guided prompts ─────────────────────────── */
  function promptStep(id) {
    state.step = id;
    state.awaiting = null;
    renderProgress();
    switch (id) {
      case 'photo':
        addWISEcodeAI('Let\'s start with a <strong>product photo</strong>. Upload one, snap it, or paste a URL — you can also just tell me the product name to keep going.',
          [
            { label: 'Upload a photo', icon: 'upload', action: 'mainUpload' },
            { label: 'Paste a URL', icon: 'link', action: 'url' },
            { label: 'Type the name', icon: 'edit', action: 'field:productName' },
            { label: 'Skip for now', icon: 'skip_next', action: 'skip:photo' },
          ]);
        break;
      case 'category':
        addWISEcodeAI('What <strong>category</strong> does this product belong to? Pick a suggestion or type your own.',
          [
            { label: 'Bakery › Muffins', icon: 'sell', action: 'setCat', arg: 'Bakery › Muffins' },
            { label: 'Snacks › Bars', icon: 'sell', action: 'setCat', arg: 'Snacks › Bars' },
            { label: 'Bakery › Bread', icon: 'sell', action: 'setCat', arg: 'Bakery › Bread' },
            { label: 'Type a category', icon: 'edit', action: 'field:category' },
          ]);
        break;
      case 'ingredients':
        addWISEcodeAI('Now the <strong>ingredient list</strong>. Paste it as text, upload a label photo and I\'ll read it, or type it in.',
          [
            { label: 'Upload label photo', icon: 'document_scanner', action: 'labelUpload' },
            { label: 'Paste / type list', icon: 'edit', action: 'field:ingredients' },
          ]);
        break;
      case 'nutrition':
        addWISEcodeAI('Time for the <strong>Nutrition Facts</strong>. Upload the panel and I\'ll parse it, or fill the values directly in <strong>Product Details</strong> on the right — I\'ll flag anything I can\'t read.',
          [
            { label: 'Upload NFP photo', icon: 'document_scanner', action: 'labelUpload' },
            { label: 'I\'ll type it in', icon: 'edit', action: 'focusNf' },
          ]);
        break;
      case 'allergens':
        addWISEcodeAI('Any <strong>allergens</strong> to declare? Tap the common ones, or tell me there are none.',
          [
            { label: 'Milk', icon: 'add', action: 'addAllergen', arg: 'Milk' },
            { label: 'Eggs', icon: 'add', action: 'addAllergen', arg: 'Eggs' },
            { label: 'Wheat', icon: 'add', action: 'addAllergen', arg: 'Wheat' },
            { label: 'Soy', icon: 'add', action: 'addAllergen', arg: 'Soy' },
            { label: 'Tree Nuts', icon: 'add', action: 'addAllergen', arg: 'Tree Nuts' },
            { label: 'None', icon: 'block', action: 'noAllergens' },
            { label: 'Done', icon: 'check', action: 'allergensDone', primary: true },
          ]);
        break;
      case 'upc':
        addWISEcodeAI('Does this product have a <strong>UPC / barcode</strong>? Type the digits or upload a photo of the barcode and I\'ll read the number. No UPC yet? You can skip — WISEcodeAI can help you request one later.',
          [
            { label: 'Enter UPC', icon: 'edit', action: 'field:upc' },
            { label: 'Scan barcode photo', icon: 'qr_code_scanner', action: 'scanUpc' },
            { label: 'No UPC — skip', icon: 'skip_next', action: 'skip:upc' },
          ]);
        break;
      case 'photos':
        addWISEcodeAI('Want to add <strong>more product images</strong> — angles, packaging, lifestyle shots? Add as many as you like, or move on.',
          [
            { label: 'Add images', icon: 'add_photo_alternate', action: 'photosUpload' },
            { label: 'That\'s enough', icon: 'check', action: 'skip:photos' },
          ]);
        break;
      case 'save': {
        const missing = requiredMissing();
        if (missing.length || nfErrorCount()) {
          addWISEcodeAI(`We\'re almost there. Still needed before saving: <strong>${esc(missing.map((m) => m.label).join(', ') || 'fix flagged nutrients')}</strong>.`,
            [{ label: 'Fix the first one', icon: 'build', action: 'goto:' + firstMissingStep() }]);
        } else {
          addWISEcodeAI('Everything required is in and nothing\'s flagged. Ready when you are — hit <strong>Save to Portfolio</strong> on the right, or save from here. Until you save, this stays a draft.',
            [{ label: 'Save to Portfolio', icon: 'save', action: 'save', primary: true }]);
        }
        break;
      }
    }
  }

  function goStep(id) { promptStep(id); }
  function skipStep(id) {
    state.skipped[id] = true;
    if (id === 'photos') state.done.photos = true;
    addUser('Skip this for now');
    renderProgress();
    maybeAdvanceAfter();
  }

  /* UPC-specific prompt: offers both typing and scanning, and arms the input so
     an attached image is read as a barcode (not stored as the product photo). */
  function promptUpc() {
    state.awaiting = 'upc';
    addWISEcodeAI('Add the <strong>UPC</strong> — type the 12 digits, or upload a photo of the barcode and I\'ll read the number and build a clean barcode.',
      [{ label: 'Scan barcode photo', icon: 'qr_code_scanner', action: 'scanUpc' }]);
    if (inputEl) { inputEl.placeholder = 'Type the 12-digit UPC…'; inputEl.focus(); }
  }

  /* Ask the user to type a value into the chat input for a specific field. */
  function promptFor(field, question) {
    state.awaiting = field;
    if (question) addWISEcodeAI(question);
    if (inputEl) {
      const hints = {
        productName: 'Type the product name…',
        category: 'Type a category (e.g. Bakery › Muffins)…',
        ingredients: 'Paste or type the ingredient list…',
        upc: 'Type the 12-digit UPC…',
        url: 'Paste the product URL…',
        allergens: 'List allergens, comma-separated…',
      };
      inputEl.placeholder = hints[field] || 'Type your answer…';
      inputEl.focus();
    }
  }

  /* ─────────────────────────── uploads ─────────────────────────── */
  /* File-type map behind the attach popover. Images route to their existing
     contexts; everything else is treated as a document/spec sheet to parse. */
  const UPLOAD_TYPES = {
    camera:  { ctx: 'main',  accept: 'image/*', capture: 'environment' },
    photo:   { ctx: 'main',  accept: 'image/*' },
    label:   { ctx: 'label', accept: 'image/*' },
    upc:     { ctx: 'upc',   accept: 'image/*' },
    pdf:     { ctx: 'doc',   accept: '.pdf,application/pdf', kind: 'PDF' },
    word:    { ctx: 'doc',   accept: '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document', kind: 'Word document' },
    text:    { ctx: 'doc',   accept: '.txt,.rtf,text/plain', kind: 'text file' },
    excel:   { ctx: 'doc',   accept: '.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', kind: 'Excel spreadsheet' },
    csv:     { ctx: 'doc',   accept: '.csv,text/csv', kind: 'CSV' },
    numbers: { ctx: 'doc',   accept: '.numbers,.csv', kind: 'spreadsheet' },
    json:    { ctx: 'doc',   accept: '.json,application/json', kind: 'JSON file' },
    xml:     { ctx: 'doc',   accept: '.xml,text/xml,application/xml', kind: 'XML file' },
    hl7:     { ctx: 'doc',   accept: '.hl7,.ccd,.ccda,.xml', kind: 'HL7 / CCD' },
    edi:     { ctx: 'doc',   accept: '.edi,.txt', kind: 'EDI file' },
  };
  let docKind = '';
  function openPicker(ctx, opts) {
    opts = opts || {};
    uploadContext = ctx;
    docKind = opts.kind || '';
    if (fileInput) {
      fileInput.accept = opts.accept || 'image/*';
      if (opts.capture) fileInput.setAttribute('capture', opts.capture);
      else fileInput.removeAttribute('capture');
      fileInput.value = '';
      fileInput.click();
    }
  }
  function fileIconFor(kind) {
    const k = (kind || '').toLowerCase();
    if (k.includes('pdf')) return 'picture_as_pdf';
    if (k.includes('word')) return 'description';
    if (k.includes('excel') || k.includes('spreadsheet') || k.includes('csv')) return 'grid_on';
    if (k.includes('json')) return 'data_object';
    if (k.includes('xml')) return 'code';
    if (k.includes('hl7') || k.includes('ccd')) return 'health_and_safety';
    if (k.includes('edi')) return 'receipt_long';
    return 'insert_drive_file';
  }
  function addUserFile(name, kind) {
    hideWelcome();
    messagesEl.insertAdjacentHTML('beforeend',
      `<div class="sc-line sc-line-you"><span class="sc-avatar sc-avatar-you" role="img" aria-label="You">AK</span><div class="sc-line-body">${esc(name || 'File')}<div class="ap-file-chip"><span class="material-symbols-outlined">${fileIconFor(kind)}</span><span>${esc(kind || 'File')}</span></div><div class="sc-line-meta"><span class="sc-line-time">${esc(nowLabel())}</span></div></div></div>`);
    scrollDown();
  }
  /* Parse an uploaded document / spec sheet. Like a label parse, but a spec
     sheet reads cleanly (no low-res OCR errors) and never becomes the photo. */
  function parseDoc(kind) {
    const t = showTyping();
    setTimeout(() => {
      t.remove();
      const p = SAMPLE_PARSE;
      if (!state.productName) state.productName = p.productName;
      if (!state.category) state.category = p.category;
      state.ingredients = p.ingredients;
      state.contains = p.contains;
      if (!state.allergens || !state.allergens.length) state.allergens = p.allergens.slice();
      state.done.allergens = true;
      Object.assign(state.nf, JSON.parse(JSON.stringify(p.nf)));
      renderNFP(); renderProgress();
      addWISEcodeAI(`Read your <strong>${esc(kind || 'file')}</strong> — I pulled the product name, category, ingredients, allergens and the full Nutrition Facts into <strong>Product Details</strong>. Review anything, then add a photo and UPC and save.`,
        [
          { label: 'Add a photo', icon: 'add_photo_alternate', action: 'mainUpload' },
          { label: 'Add a UPC', icon: 'qr_code_2', action: 'field:upc' },
          { label: 'Review & save', icon: 'save', action: 'goto:save' },
        ]);
    }, 1000);
  }

  /* Read a UPC/EAN from an uploaded barcode image. Real OCR/scan would live
     server-side; here we synthesize a plausible 12-digit UPC-A so the flow
     extracts a number and rebuilds a clean barcode instead of treating the
     photo as the product image. */
  function extractUpcDigits() {
    let d = '';
    for (let i = 0; i < 12; i++) d += Math.floor(Math.random() * 10);
    return d;
  }
  function formatUpc(d) {
    d = String(d).replace(/\D/g, '');
    if (d.length === 12) return `${d[0]} ${d.slice(1, 6)} ${d.slice(6, 11)} ${d[11]}`;
    return d;
  }
  function scanUpcFromImage(src, name) {
    addUserImage(src, name);
    const t = showTyping();
    setTimeout(() => {
      t.remove();
      const digits = extractUpcDigits();
      state.upc = digits;
      state.awaiting = null;
      if (inputEl) inputEl.placeholder = 'Type a value, paste a URL, or ask me anything…';
      renderNFP(); renderProgress();
      addWISEcodeAI(`Scanned the barcode — I read UPC <strong>${esc(formatUpc(digits))}</strong> and rebuilt a clean barcode on the panel. I did <em>not</em> touch your product photo. Look right?`,
        [
          { label: 'Looks right — continue', icon: 'arrow_forward', action: 'goto:' + nextStep() },
          { label: 'Edit the digits', icon: 'edit', action: 'field:upc' },
          { label: 'Rescan', icon: 'qr_code_scanner', action: 'scanUpc' },
        ]);
    }, 900);
  }

  function onFile(file) {
    if (!file) return;
    const ctx = uploadContext;
    /* Documents/spec sheets aren't images — show a file chip and parse them
       without reading the bytes as a data URL. */
    if (ctx === 'doc') {
      addUserFile(file.name, docKind);
      parseDoc(docKind);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      if (ctx === 'upc') {
        scanUpcFromImage(src, file.name);
      } else if (ctx === 'label') {
        addUserImage(src, file.name);
        parseLabel(src);
      } else if (ctx === 'photos') {
        state.images.push({ src, label: 'Photo ' + (state.images.length + 1) });
        state.done.photos = true;
        addUserImage(src, file.name);
        renderNFP(); renderProgress();
        wiseSay('Added to the gallery. Add more or continue.',
          [{ label: 'Add another', icon: 'add', action: 'photosUpload' }, { label: 'Continue', icon: 'arrow_forward', action: 'skip:photos' }]);
      } else {
        // main product photo — keep any previous primary as an extra image
        if (state.image) state.images.unshift({ src: state.image, label: 'Photo ' + (state.images.length + 1) });
        state.image = src;
        addUserImage(src, file.name);
        renderNFP(); renderProgress();
        wiseSay('Nice — that\'s the primary photo. ' + (state.productName ? '' : 'What\'s the product called?'),
          state.productName ? undefined : [{ label: 'Type the name', icon: 'edit', action: 'field:productName' }]);
        if (state.productName) maybeAdvanceAfter();
      }
    };
    reader.readAsDataURL(file);
  }

  /* Simulate reading a label photo: fills what it can, flags the rest. */
  function parseLabel(src) {
    const t = showTyping();
    setTimeout(() => {
      t.remove();
      const p = SAMPLE_PARSE;
      if (!state.image && src) state.image = src;
      if (!state.productName) state.productName = p.productName;
      if (!state.category) state.category = p.category;
      state.ingredients = p.ingredients;
      state.contains = p.contains;
      if (!state.allergens.length) state.allergens = p.allergens.slice();
      state.done.allergens = true;
      Object.assign(state.nf, JSON.parse(JSON.stringify(p.nf)));
      state.errors = Object.assign({}, state.errors, p.errors);
      renderNFP(); renderProgress();
      addWISEcodeAI('I read most of the label into <strong>Product Details</strong> — name, category, ingredients, allergens and the Nutrition Facts. But the bottom row of micronutrients (<strong>Vitamin D, Calcium, Iron, Potassium</strong>) came through <strong>unreadable — low resolution</strong>. They\'re flagged red on the panel. Fix them there, upload a sharper crop, or type them here.',
        [
          { label: 'Upload a sharper photo', icon: 'document_scanner', action: 'labelUpload' },
          { label: 'I\'ll type the flagged values', icon: 'edit', action: 'focusNf' },
          { label: 'Continue anyway', icon: 'arrow_forward', action: 'goto:allergens' },
        ]);
    }, 900);
  }

  function simulateUrlParse(url) {
    addUser(url);
    const t = showTyping();
    setTimeout(() => {
      t.remove();
      const p = SAMPLE_PARSE;
      state.image = p.image;
      state.productName = p.productName;
      state.category = p.category;
      state.ingredients = p.ingredients;
      state.contains = p.contains;
      state.allergens = p.allergens.slice();
      state.done.allergens = true;
      Object.assign(state.nf, JSON.parse(JSON.stringify(p.nf)));
      // URL sources give clean nutrition — no errors here.
      renderNFP(); renderProgress();
      addWISEcodeAI('Pulled that product page in — photo, name, category, ingredients, allergens and full Nutrition Facts are all in <strong>Product Details</strong>. Give it a look and edit anything that\'s off. Add a UPC and more photos, then save.',
        [
          { label: 'Add a UPC', icon: 'qr_code_2', action: 'field:upc' },
          { label: 'Add more photos', icon: 'add_photo_alternate', action: 'photosUpload' },
          { label: 'Review & save', icon: 'save', action: 'goto:save' },
        ]);
    }, 1000);
  }

  /* ─────────────────────────── allergens ─────────────────────────── */
  function addAllergen(name) {
    name = String(name).trim();
    if (!name) return;
    if (!state.allergens.some((a) => a.toLowerCase() === name.toLowerCase())) state.allergens.push(name);
    state.done.allergens = true;
    renderNFP(); renderProgress();
  }

  /* ─────────────────────────── chip / click dispatch ─────────────────────────── */
  function dispatch(action, arg) {
    if (!action) return;
    if (action.startsWith('field:')) {
      const f = action.slice(6);
      if (f === 'upc') { addUser('Enter the UPC'); promptUpc(); return; }
      const FIELD_ASK = {
        productName: 'What should the product name be?',
        category: 'What category should this be? (e.g. Bakery \u203a Muffins)',
        ingredients: 'Paste or type the full ingredient list and I\u2019ll update it.',
        allergens: 'Which allergens should be declared? List them comma-separated.',
      };
      addUser('I\'ll type it'); promptFor(f, FIELD_ASK[f]); return;
    }
    if (action.startsWith('goto:')) { goStep(action.slice(5)); return; }
    if (action.startsWith('skip:')) { skipStep(action.slice(5)); return; }
    switch (action) {
      case 'mainUpload': addUser('Upload a photo'); openPicker('main'); break;
      case 'scanUpc': addUser('Scan the barcode'); openPicker('upc'); break;
      case 'labelUpload': addUser('Upload the label'); openPicker('label'); break;
      case 'photosUpload': openPicker('photos'); break;
      case 'url': promptFor('url', 'Paste the product page or retailer URL and I\'ll pull in everything I can.'); break;
      case 'manual': beginManual(); break;
      case 'sample': loadSample(); break;
      case 'setCat': addUser(arg); commitField('category', arg, { silent: true }); addSysNote('Category set to “' + arg + '”.', 'edit'); maybeAdvanceAfter(); break;
      case 'addAllergen': addUser(arg); addAllergen(arg); break;
      case 'noAllergens': addUser('No allergens'); state.allergens = []; state.done.allergens = true; renderNFP(); renderProgress(); addSysNote('No allergens declared.', 'edit'); maybeAdvanceAfter(); break;
      case 'allergensDone': addUser('Done with allergens'); state.done.allergens = true; renderProgress(); maybeAdvanceAfter(); break;
      case 'focusNf': addUser('I\'ll type it in the panel'); focusFirstNfError(); break;
      case 'save': doSave(); break;
      case 'restart': restart(); break;
      case 'exit': window.location.href = 'product-portfolio.html'; break;
      default: break;
    }
  }

  function focusFirstNfError() {
    const errKey = Object.keys(state.errors).find((k) => k.startsWith('nf.'));
    const target = errKey ? errKey + '.amt' : 'nf.servingSize';
    const el = nfpBody.querySelector(`[data-field="${target}"]`);
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setTimeout(() => { placeCaret(el); }, 300);
      addWISEcodeAI('Go ahead — click any red field on the panel and type the correct value. Each one clears as you fix it.');
    }
  }
  function placeCaret(el) {
    el.focus();
    try {
      const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    } catch (_) {}
  }

  /* ─────────────────────────── input handling ─────────────────────────── */
  function onSubmit() {
    const v = (inputEl.value || '').trim();
    if (!v) return;
    inputEl.value = '';
    const awaiting = state.awaiting;
    state.awaiting = null;
    if (inputEl) inputEl.placeholder = 'Type a value, paste a URL, or ask me anything…';

    if (awaiting === 'url') { simulateUrlParse(v); return; }
    if (awaiting === 'allergens') {
      addUser(v);
      v.split(/[,;]+/).map((s) => s.trim()).filter(Boolean).forEach(addAllergen);
      addSysNote('Allergens updated.', 'edit');
      maybeAdvanceAfter();
      return;
    }
    if (awaiting) {
      addUser(v);
      commitField(awaiting, v, { silent: true });
      addSysNote(`${NF_LABELS[awaiting] || cap(awaiting)} set.`, 'edit');
      maybeAdvanceAfter();
      return;
    }
    // No active prompt — interpret freely.
    addUser(v);
    interpret(v);
  }
  function cap(s) { return String(s).charAt(0).toUpperCase() + String(s).slice(1); }

  function interpret(text) {
    const t = text.toLowerCase();
    if (/^https?:\/\//i.test(text) || /www\./i.test(text)) { simulateUrlParse(text); return; }
    if (/^\d[\d\s-]{6,}$/.test(text)) { commitField('upc', text, { silent: true }); addSysNote('UPC captured.', 'edit'); wiseSay('Got the UPC — rendered it on the panel.'); maybeAdvanceAfter(); return; }
    if (/(help|how|what|stuck|confus)/.test(t)) {
      wiseSay('No problem. This flow collects, in order: a <strong>photo</strong>, <strong>category</strong>, <strong>ingredients</strong>, <strong>Nutrition Facts</strong>, <strong>allergens</strong>, and a <strong>UPC</strong>. You can upload a label and I\'ll read most of it at once, edit anything live in <strong>Product Details</strong>, and nothing saves until you press <strong>Save to Portfolio</strong>. Where do you want to start?',
        [
          { label: 'Upload a label', icon: 'document_scanner', action: 'labelUpload' },
          { label: 'Paste a URL', icon: 'link', action: 'url' },
          { label: 'Go step by step', icon: 'list', action: 'manual' },
        ]);
      return;
    }
    if (/(save|finish|done|submit)/.test(t)) { goStep('save'); return; }
    // Otherwise treat it as the product name if we don't have one yet.
    if (!state.productName) {
      commitField('productName', text, { silent: true });
      addSysNote('Product name set.', 'edit');
      wiseSay('Set the name. Continuing…');
      maybeAdvanceAfter();
      return;
    }
    wiseSay('Noted. You can keep filling fields on the right, upload a label, or tell me the next value. Want me to pick up the next missing item?',
      [{ label: 'Next step', icon: 'arrow_forward', action: 'goto:' + nextStep() }]);
  }

  /* ─────────────────────────── entry points ─────────────────────────── */
  function beginManual() {
    addUser('Enter details manually');
    wiseSay('Great — we\'ll go step by step. You can jump around using the progress list on the right anytime.', undefined, 380);
    setTimeout(() => promptStep('photo'), 900);
  }
  function loadSample() {
    addUser('Show me an example');
    const p = SAMPLE_PARSE;
    state.image = p.image; state.productName = p.productName; state.category = p.category;
    state.ingredients = p.ingredients; state.contains = p.contains; state.allergens = p.allergens.slice();
    state.done.allergens = true; state.upc = '853620006279';
    Object.assign(state.nf, JSON.parse(JSON.stringify(p.nf)));
    ['vitaminD', 'calcium', 'iron', 'potassium'].forEach((k) => {
      state.nf[k] = { amt: k === 'vitaminD' ? '0mcg' : k === 'calcium' ? '40mg' : k === 'iron' ? '2mg' : '95mg', dv: k === 'vitaminD' ? '0%' : k === 'calcium' ? '3%' : k === 'iron' ? '10%' : '2%' };
    });
    renderNFP(); renderProgress();
    wiseSay('Here\'s a fully filled example so you can see the finished shape. Edit anything on the panel, then save — or start your own.',
      [{ label: 'Save this example', icon: 'save', action: 'goto:save', primary: true }, { label: 'Start fresh', icon: 'restart_alt', action: 'restart' }]);
  }
  /* View mode — used by view-product.html. Opens with a fully filled-in,
     editable Product Details card (the same finished example loadSample builds),
     but with no "Show me an example" chatter, and reflecting whichever product
     the user opened from the portfolio (name / UPC / photo travel over in the
     URL). Everything on the panel stays editable so they can keep working. */
  function openFilledProduct(mode) {
    const editMode = mode === 'edit';
    const p = SAMPLE_PARSE;
    const params = new URLSearchParams(location.search);
    state.image = p.image; state.category = p.category;
    state.ingredients = p.ingredients; state.contains = p.contains;
    state.allergens = p.allergens.slice(); state.done.allergens = true;
    state.upc = '853620006279';
    Object.assign(state.nf, JSON.parse(JSON.stringify(p.nf)));
    ['vitaminD', 'calcium', 'iron', 'potassium'].forEach((k) => {
      state.nf[k] = { amt: k === 'vitaminD' ? '0mcg' : k === 'calcium' ? '40mg' : k === 'iron' ? '2mg' : '95mg', dv: k === 'vitaminD' ? '0%' : k === 'calcium' ? '3%' : k === 'iron' ? '10%' : '2%' };
    });
    // Reflect the specific product opened from the portfolio, when provided.
    const nm = params.get('name'); const upc = params.get('upc'); const img = params.get('img');
    state.productName = (nm && nm.trim()) || p.productName;
    if (upc) { const d = upc.replace(/\D/g, ''); if (d) state.upc = d; }
    if (img) state.image = img;
    state.errors = {};
    hideWelcome();
    renderNFP(); renderProgress();
    if (editMode) {
      // Retitle the chat topbar for the edit surface (same page as View).
      const tag = document.querySelector('.ap-topbar-tag');
      if (tag && tag.firstChild && tag.firstChild.nodeType === 3) {
        tag.firstChild.textContent = 'Edit Product · ';
      }
      addUser(`Edit ${state.productName}`);
      addWISEcodeAI(`Editing <strong>${esc(state.productName)}</strong> — everything\u2019s loaded on the right and every field is editable. Tell me what you\u2019d like to change, or just click any value on the panel. What should we update?`,
        [
          { label: 'Edit the Nutrition Facts', icon: 'nutrition', action: 'focusNf' },
          { label: 'Edit ingredients', icon: 'science', action: 'field:ingredients' },
          { label: 'Update allergens', icon: 'warning', action: 'field:allergens' },
          { label: 'Change the category', icon: 'category', action: 'field:category' },
          { label: 'Replace the photo', icon: 'photo_camera', action: 'mainUpload' },
          { label: 'Update the UPC', icon: 'qr_code_2', action: 'field:upc' },
          { label: 'Save changes', icon: 'save', action: 'goto:save', primary: true },
          { label: 'Back to portfolio', icon: 'inventory_2', action: 'exit' },
        ]);
      return;
    }
    addWISEcodeAI(`Here\u2019s <strong>${esc(state.productName)}</strong> — its full Product Details are loaded on the right and every field is editable. Click any value to change it, swap the photo, or update the Nutrition Facts, then save your changes back to the portfolio.`,
      [
        { label: 'Edit the Nutrition Facts', icon: 'edit', action: 'focusNf' },
        { label: 'Save changes', icon: 'save', action: 'goto:save', primary: true },
        { label: 'Back to portfolio', icon: 'inventory_2', action: 'exit' },
      ]);
  }
  function restart() {
    Object.assign(state, {
      step: null, productName: '', image: null, images: [], activeImage: 0,
      category: '', ingredients: '', allergens: [], contains: '', upc: '',
      nf: blankNf(), errors: {}, done: {}, skipped: {}, awaiting: null, saved: false,
    });
    messagesEl.innerHTML = '';
    if (welcomeEl) { welcomeEl.classList.remove('sc-hidden'); welcomeEl.style.display = ''; }
    renderNFP(); renderProgress();
  }

  /* ─────────────────────────── init ─────────────────────────── */
  const WELCOME_CHIPS = [
    { label: 'Upload a label photo', icon: 'document_scanner', action: 'labelUpload' },
    { label: 'Paste a product URL', icon: 'link', action: 'url' },
    { label: 'Enter details manually', icon: 'edit_note', action: 'manual' },
    { label: 'I have a barcode / UPC', icon: 'qr_code_2', action: 'field:upc' },
    { label: 'Show me an example', icon: 'auto_awesome', action: 'sample' },
  ];

  function init() {
    messagesEl = $('chat-messages');
    welcomeEl = $('welcome-screen');
    chipsStartEl = $('ws-chips-start');
    inputEl = $('chat-input');
    nfpBody = $('nfp-body');
    progressEl = $('ap-progress');
    fileInput = $('ap-file');
    if (!messagesEl || !nfpBody || !progressEl) return;

    // Welcome chips
    if (chipsStartEl) {
      chipsStartEl.innerHTML = WELCOME_CHIPS.map((c) =>
        `<button type="button" class="chip ws-intent-chip" data-action="${esc(c.action)}"${c.arg != null ? ` data-arg="${esc(c.arg)}"` : ''}><span class="material-symbols-outlined">${esc(c.icon)}</span>${esc(c.label)}</button>`).join('');
    }

    // Play the welcome in: heading + sub type in word-by-word, then the intent
    // chips fly in from the right and land — so the chips always trail the copy.
    revealWelcome();

    // First paint
    renderNFP();
    renderProgress();

    // Chip clicks (welcome + inline reply chips)
    document.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-action]');
      if (chip && (welcomeEl?.contains(chip) || messagesEl.contains(chip))) {
        dispatch(chip.dataset.action, chip.dataset.arg);
        return;
      }
      // NFP panel affordances
      const nfpBtn = e.target.closest('[data-nfp]');
      if (nfpBtn && nfpBody.contains(nfpBtn)) { handleNfpClick(nfpBtn.dataset.nfp, nfpBtn.dataset.arg); return; }
      // Progress module minimize/maximize toggle
      const minBtn = e.target.closest('[data-ap-min]');
      if (minBtn && progressEl.contains(minBtn)) { progressMin = !progressMin; renderProgress(); return; }
      // Progress step jump
      const goto = e.target.closest('[data-goto]');
      if (goto && progressEl.contains(goto)) { goStep(goto.dataset.goto); return; }
    });

    // Progress step keyboard
    progressEl.addEventListener('keydown', (e) => {
      const goto = e.target.closest('[data-goto]');
      if (goto && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); goStep(goto.dataset.goto); }
    });

    // Editable NFP fields — commit on blur / Enter.
    nfpBody.addEventListener('focusout', (e) => {
      const ed = e.target.closest('[data-field]');
      if (!ed) return;
      const path = ed.dataset.field;
      const val = ed.textContent.trim();
      const ph = ed.dataset.ph || '';
      if (val === ph) return; // untouched placeholder
      const current = getPath(path);
      if (!val && !current) { renderNFP(); return; } // empty stayed empty — just restore placeholder
      if (val === String(current == null ? '' : current)) return; // unchanged
      /* Nutrition cells update in place (keeps caret while fixing flagged rows);
         other fields (name, UPC, ingredients, contains) rebuild the card. */
      commitField(path, val, { fromPanel: true, inPlace: path.startsWith('nf.') });
    });
    nfpBody.addEventListener('keydown', (e) => {
      const ed = e.target.closest('[data-field]');
      if (!ed) return;
      if (e.key === 'Enter') { e.preventDefault(); ed.blur(); }
    });
    nfpBody.addEventListener('focusin', (e) => {
      const ed = e.target.closest('.nfp-edit-empty[data-field]');
      if (ed) { ed.textContent = ''; ed.classList.remove('nfp-edit-empty'); }
    });

    // Category dropdown — commit the picked category (rebuilds the card).
    nfpBody.addEventListener('change', (e) => {
      const sel = e.target.closest('select[data-nfp-cat]');
      if (!sel) return;
      const val = sel.value;
      if (val && val !== state.category) commitField('category', val, { fromPanel: true });
    });

    // Input send
    $('ap-send')?.addEventListener('click', onSubmit);
    inputEl?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(); } });
    /* Attach lives inside the input on the left and opens a grouped file-type
       popover (photos, docs, spreadsheets, data/specs, link). */
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
      const key = it.dataset.up;
      if (key === 'url') { dispatch('url'); return; }
      const t = UPLOAD_TYPES[key];
      if (t) openPicker(t.ctx, { accept: t.accept, capture: t.capture, kind: t.kind });
    });
    document.addEventListener('click', (e) => {
      if (attachPop?.classList.contains('open') && !attachPop.contains(e.target) && !attachBtn.contains(e.target)) closeAttach();
    });
    fileInput?.addEventListener('change', () => onFile(fileInput.files && fileInput.files[0]));

    // Chat width toggle — the canonical four-step cycle (single → double →
    // triple → fill), identical to every other module in the app.
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

    // NFP width toggle — single pane ↔ double pane (photo column on the right).
    const nfpWidthBtn = $('nfp-width');
    nfpWidthBtn?.addEventListener('click', () => {
      state.nfpWide = !state.nfpWide;
      const panel = $('nfp-panel');
      if (panel) panel.classList.toggle('nfp-wide', state.nfpWide);
      const ic = nfpWidthBtn.querySelector('.material-symbols-outlined');
      if (ic) ic.textContent = state.nfpWide ? 'width_wide' : 'width_normal';
      nfpWidthBtn.classList.toggle('is-on', state.nfpWide);
      nfpWidthBtn.setAttribute('aria-pressed', state.nfpWide ? 'true' : 'false');
      nfpWidthBtn.title = state.nfpWide ? 'Back to single pane' : 'Widen to two panes';
      renderNFP();
    });

    // Save button
    $('nfp-save-btn')?.addEventListener('click', doSave);

    // Chat topbar menu
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
      if (a === 'restart') restart();
      else if (a === 'close') restart();
      else if (a === 'export') exportTranscript();
      else if (a === 'share') shareTranscript();
    });
    document.addEventListener('click', (e) => {
      if (menu && !menu.classList.contains('hidden') && !menu.contains(e.target) && e.target !== menuBtn && !menuBtn?.contains(e.target)) {
        menu.classList.add('hidden'); menuBtn.classList.remove('is-open');
      }
    });

    // View / Edit mode (view-product.html) — skip the welcome and open straight
    // into a fully filled-in, editable product instead of the blank builder.
    // Edit mode is the exact same surface; only the chat greeting differs (it
    // asks what you'd like to change and offers per-field options).
    const modeParams = new URLSearchParams(location.search);
    const isEditMode = document.body.dataset.apMode === 'edit'
      || modeParams.get('mode') === 'edit' || modeParams.get('edit') === '1';
    if (isEditMode || document.body.dataset.apMode === 'view' || modeParams.get('view') === '1') {
      openFilledProduct(isEditMode ? 'edit' : 'view');
      return;
    }

    // Opening line
    setTimeout(() => {
      if (welcomeEl && !welcomeEl.classList.contains('sc-hidden')) return; // let welcome breathe
    }, 0);
  }

  function getTranscriptText() {
    return Array.from(messagesEl.querySelectorAll('.sc-line-body, .ap-sys-note')).map((n) => n.innerText).join('\n');
  }

  function exportTranscript() {
    const text = getTranscriptText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wiseai-conversation.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function shareTranscript() {
    const text = getTranscriptText();
    if (navigator.share) { navigator.share({ title: 'WISEcodeAI conversation', text }).catch(() => {}); return; }
    try { navigator.clipboard.writeText(text); } catch (_) {}
  }

  function handleNfpClick(action, arg) {
    switch (action) {
      case 'upload-main': openPicker('main'); break;
      case 'add-image': openPicker('photos'); break;
      case 'cat-edit': promptFor('category', 'What category should this be?'); break;
      case 'upc-edit': promptUpc(); break;
      case 'add-allergen': promptFor('allergens', 'Which allergens? List them comma-separated.'); break;
      case 'remove-allergen': {
        const i = Number(arg); if (!isNaN(i)) { state.allergens.splice(i, 1); renderNFP(); renderProgress(); }
        break;
      }
      case 'pick-image': { const i = Number(arg); if (!isNaN(i)) { state.activeImage = i; renderNFP(); } break; }
      default: break;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
