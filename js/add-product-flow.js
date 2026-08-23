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
  /* Per-letter spans for the staggered gold shimmer on "What can I ask?"
     (same as shimmerLetters in js/wiseai-chat.js). Spaces become real
     .sc-ask-sp elements — flex containers drop bare whitespace text nodes,
     which would scrunch the label into "WhatcanIask?". */
  function shimmerLetters(label) {
    return String(label).split('').map((ch, i) =>
      ch === ' '
        ? '<span class="sc-ask-sp"> </span>'
        : `<span class="sc-ask-ch" style="--ch-i:${i}">${esc(ch)}</span>`
    ).join('');
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
  /* Deep-copy an NFP so a pack starts seeded from the base product but edits
     independently (packs share the base label, only pack-level values differ). */
  function cloneNf(src) {
    src = src || {};
    const nf = { servingsPer: src.servingsPer || '', servingSize: src.servingSize || '', calories: src.calories || '' };
    NF_ROWS.concat(NF_MICRO).forEach((r) => {
      const v = src[r.key] || { amt: '', dv: '' };
      nf[r.key] = { amt: v.amt || '', dv: v.dv || '' };
    });
    return nf;
  }

  const state = {
    step: null,
    productName: '',
    brand: 'Flax4Life',
    brandClaimed: true,   // brand-owned product → shows the "Brand Claimed" chip
    brandLogo: '../assets/brand-flax4life-logo.png', // brand logo image; falls back to a monogram badge
    image: null,          // main product image (data URL or URL)
    images: [],           // additional images: {src,label}
    activeImage: 0,
    packs: [],            // size / pack formats: {label,size,image,upc,servingsPer,servingSize,calories}
    activePack: 0,        // highlighted pack thumbnail
    view: 'product',      // which tab the Product Images / Pack Formats strip is filtering to: 'product' (base) or 'pack' (activePack)
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
    nfpCompare: false,    // ⋯ menu → show every format side by side (compare matrix)
    /* Ingredient analysis (third column). Accordions remember open/closed;
       Analyze increments `iaTick` so row + score animations replay. */
    iaOpen: { list: true, parsed: true, codes: true, nutrients: true, scout: true },
    iaRan: false,
    iaTick: 0,
    iaConfirm: {},        // mapped-name → true once the user confirms a row
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
  /* Fallback when the sizes-strip / header has no product photo (cleared,
     missing, or a broken URL). Prefer the sample product shot; if that
     remote file fails, use the bundled Flax4Life banner. */
  const DEFAULT_PRODUCT_IMAGE = SAMPLE_PARSE.image;
  const DEFAULT_PRODUCT_IMAGE_LOCAL = '../assets/brand-flax4life-banner.jpg';

  /* ─────────────────────────── steps ─────────────────────────── */
  const STEPS = [
    { id: 'photo', label: 'Product photo', icon: 'photo_camera' },
    { id: 'category', label: 'Category', icon: 'category' },
    { id: 'upc', label: 'UPC / barcode', icon: 'qr_code_2' },
    { id: 'nutrition', label: 'Nutrition Facts', icon: 'monitoring' },
    { id: 'ingredients', label: 'Ingredients', icon: 'receipt_long' },
    { id: 'allergens', label: 'Allergens', icon: 'health_and_safety' },
    { id: 'photos', label: 'Additional photos', icon: 'collections' },
    { id: 'save', label: 'Save to portfolio', icon: 'inventory_2' },
  ];

  /* ─────────────────────────── DOM refs ─────────────────────────── */
  let messagesEl, welcomeEl, chipsStartEl, inputEl, nfpBody, progressEl, fileInput;
  let uploadContext = 'main';
  /* Progress module defaults to the minimal (collapsed) view; header button toggles it. */
  let progressMin = true;
  let lastProgressPct = 0;

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

  const prefersReducedMotion = (() => {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (_) { return false; }
  })();
  /* ── Reply reveal ─────────────────────────────────────────────────────────
     Word-by-word text animation is OFF app-wide — this mirrors the shared chat
     module's typeInLine (js/wiseai-chat.js), where the per-word reveal was
     removed so every WISEcodeAI answer lands whole. The signature + `done`
     callback are kept so the downstream reveal chain (timestamp, reply chips)
     keeps firing in the same order; only the text no longer types in. */
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
  /* Rule: every reply ends on topic-related intent chips. Callers that omit
     a row still get a current-step fallback so the transcript never dead-ends. */
  function fallbackChips() {
    const step = state.step || firstMissingStep() || 'save';
    const chips = [];
    const nextLabel = {
      photo: 'Add a photo',
      category: 'Pick a category',
      ingredients: 'Add ingredients',
      nutrition: 'Add Nutrition Facts',
      allergens: 'Declare allergens',
      upc: 'Add a UPC',
      photos: 'Add more photos',
      save: 'Save to Portfolio',
    };
    if (step && step !== state.step) {
      chips.push({ label: nextLabel[step] || 'Continue', icon: 'arrow_forward', action: 'goto:' + step });
    }
    chips.push({ label: 'What can I ask?', icon: 'help', action: 'askHelp' });
    if (state.step && state.step !== 'save') {
      chips.push({ label: 'Skip this', icon: 'skip_next', action: 'skip:' + state.step });
    }
    if (step === 'save' || state.step === 'save') {
      chips.push({ label: 'Save to Portfolio', icon: 'save', action: 'save', primary: true });
    }
    return chips;
  }
  function addWISEcodeAI(html, chips) {
    if (!chips || !chips.length) chips = fallbackChips();
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
  /* Post a WISEcodeAI reply after a short "thinking" beat. Honours the shared
     "Response streaming" setting (three-dot menu, synced app-wide by
     wireStandardChatMenu): OFF lands the answer immediately, "Final only"
     keeps just a brief beat, "Full"/"Steps" keep the standard beat. */
  function wiseSay(html, chips, delay) {
    const stream = (window.__wiseStdMenu && window.__wiseStdMenu.stream)
      ? window.__wiseStdMenu.stream()
      : { on: true, level: 'full' };
    if (!stream.on) { addWISEcodeAI(html, chips); return; }
    const t = showTyping();
    setTimeout(() => { t.remove(); addWISEcodeAI(html, chips); }, stream.level === 'final' ? 300 : (delay || 560));
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
    /* Render at the barcode's natural 1:1 size (viewBox === width/height) so the
       bars never stretch; CSS max-width:100% scales it down proportionally when
       the pill it sits in is narrower. */
    return `<svg class="nfp-barcode-svg" width="${x}" height="${H}" viewBox="0 0 ${x} ${H}" aria-hidden="true">${bars.join('')}</svg>`;
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
    return !!(typeof window !== 'undefined' && (window.WISE_HERO_BRAND || window.WISE_HERO_BRANDROW));
  }
  /* view-product: the first-column hero is lifted into the module header
     (photo as the banner background, left of the ⋯) and the sizes strip
     (title + category + full barcode). add-product keeps the in-column hero. */
  function useHeaderIdentity() {
    return !!(typeof window !== 'undefined' && window.WISE_HERO_BRAND);
  }
  function activePackIndex() {
    if (state.view !== 'pack' || !state.packs.length) return null;
    return Math.min(state.activePack, state.packs.length - 1);
  }
  function activeProductImage() {
    const i = activePackIndex();
    if (i != null) return (state.packs[i] && state.packs[i].image) || state.image || '';
    return state.image || '';
  }
  function productBackgroundSrc() {
    return activeProductImage() || DEFAULT_PRODUCT_IMAGE;
  }
  function productBgImgHTML(src) {
    const used = src || productBackgroundSrc();
    const fallback = used === DEFAULT_PRODUCT_IMAGE
      ? DEFAULT_PRODUCT_IMAGE_LOCAL
      : DEFAULT_PRODUCT_IMAGE;
    return `<img src="${esc(used)}" alt="" data-nfp-bg-fallback="${esc(fallback)}" onerror="if(!this.dataset.fell){this.dataset.fell='1';this.src=this.dataset.nfpBgFallback}">`;
  }
  /* view-product: faint right-side fade on the Product Details banner, plus
     the original "Product image" edit control immediately left of the ⋯. */
  function syncNfpHeaderPhoto() {
    const header = document.querySelector('#nfp-panel .nfp-panel-header');
    if (!header) return;
    if (!useHeaderIdentity()) {
      header.classList.remove('nfp-panel-header--photo');
      header.querySelector('.nfp-header-photo-bg')?.remove();
      header.querySelector('.nfp-header-photo')?.remove();
      const logo = header.querySelector('.nfp-brand-logo');
      if (logo) logo.hidden = false;
      return;
    }
    const controls = header.querySelector('.panel-controls');
    if (!controls) return;
    const src = activeProductImage();
    let bg = header.querySelector('.nfp-header-photo-bg');
    if (!bg) {
      bg = document.createElement('div');
      bg.className = 'nfp-header-photo-bg';
      bg.setAttribute('aria-hidden', 'true');
      header.insertBefore(bg, header.firstChild);
    }
    bg.innerHTML = productBgImgHTML();
    header.classList.add('nfp-panel-header--photo');
    const logo = header.querySelector('.nfp-brand-logo');
    if (logo) logo.hidden = true;
    let hit = header.querySelector('.nfp-header-photo');
    if (!hit) {
      hit = document.createElement('button');
      hit.type = 'button';
      hit.className = 'nfp-header-photo';
      controls.insertBefore(hit, controls.firstChild);
    }
    const label = src ? 'Replace product image' : 'Add product image';
    hit.setAttribute('title', label);
    hit.setAttribute('aria-label', label);
    const i = activePackIndex();
    hit.dataset.nfp = i != null ? 'upload-pack' : 'upload-main';
    if (i != null) hit.dataset.arg = String(i);
    else delete hit.dataset.arg;
    hit.innerHTML = `<span class="material-symbols-outlined">edit</span>`;
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
  /* Segmented UPC-A entry — one box per digit, grouped the way the number
     physically breaks down: 1 (number system) · 5 (manufacturer) · 5 (product)
     · 1 (check digit), with a wider gap between each section (like an SSN or a
     verification code). Above the boxes sits an empty barcode "slot" that is
     kept in the layout from the start and pre-fills with the real barcode once
     all 12 digits are entered. `packIdx` (a number) binds it to a pack format;
     leave it null for the base product. */
  /* Full-width, stylized barcode that fills the top of the UPC card. When all 12
     digits are known it renders the real bars (from the digits); before that it
     shows a faded placeholder in the exact same footprint so nothing shifts. The
     SVG stretches to the card width (preserveAspectRatio=none) so it always reads
     as a big barcode, not the tiny centered pill. */
  function upcBarcodeBig(digits) {
    const raw = String(digits || '').replace(/\D/g, '');
    if (raw.length !== 12) return '<div class="nfp-upc-preview" aria-hidden="true"></div>';
    let x = 0; const bars = []; const H = 100;
    for (let i = 0; i < raw.length * 6; i++) {
      const d = Number(raw[i % raw.length]);
      const w = (d % 4) + 1;
      if (i % 2 === 0) bars.push(`<rect x="${x}" y="0" width="${w}" height="${H}"/>`);
      x += w + ((d % 3) === 0 ? 1 : 0.6);
    }
    return `<svg class="nfp-upc-bc" width="100%" height="100%" viewBox="0 0 ${x} ${H}" preserveAspectRatio="none" aria-hidden="true">${bars.join('')}</svg>`;
  }
  /* One UPC look for every state (empty · editing · complete): a large stylized
     barcode across the top of a white card, and the 12 digits below it as
     individual mono line-inputs grouped 1·5·5·1 (UPC-A). Empty shows the same
     card with a faded barcode and blank slots; a complete code pre-fills the
     slots and swaps in the real bars — no separate UI, no layout shift. Editing
     any digit in place re-commits once all 12 are present. `packIdx` binds it to
     a pack format; leave it null for the base product. */
  function upcSegmentedHTML(onPhoto, packIdx, digits) {
    const isPack = packIdx != null;
    const raw = String(digits || '').replace(/\D/g, '');
    const filled = raw.length === 12;
    /* Flat row of 12 equal-flex cells (every digit identical width). The UPC-A
       sections 1·5·5·1 are shown with a wider gap before the cells that start a
       new section (indices 1, 6, 11) — a fixed margin that never changes the
       cells' shared width, so inner digits are no longer squeezed. */
    const sectionStarts = { 1: true, 6: true, 11: true };
    let cellsHTML = '';
    for (let idx = 0; idx < 12; idx++) {
      const v = filled ? raw[idx] : '';
      const cellCls = 'nfp-upc-cell'
        + (onPhoto ? ' nfp-upc-cell--onphoto' : '')
        + (sectionStarts[idx] ? ' nfp-upc-cell--sep' : '');
      cellsHTML += `<input type="text" inputmode="numeric" autocomplete="off" maxlength="1" class="${cellCls}" data-nfp-upc-cell data-idx="${idx}" value="${v}" aria-label="UPC digit ${idx + 1}">`;
    }
    const wrapCls = 'nfp-upc-entry' + (onPhoto ? ' nfp-upc-entry--onphoto' : '') + (filled ? ' nfp-upc-entry--filled' : '');
    return `<div class="${wrapCls}" data-nfp-upc-entry${isPack ? ` data-pack="${packIdx}"` : ''}>
        <div class="nfp-upc-barcode">${upcBarcodeBig(raw)}</div>
        <div class="nfp-upc-cells" role="group" aria-label="UPC — 12 digits">${cellsHTML}</div>
      </div>`;
  }
  function heroUpcHTML(onPhoto) {
    return `<div class="nfp-hero-upc nfp-hero-upc--seg">${upcSegmentedHTML(onPhoto, null, state.upc)}</div>`;
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
  /* Round brand badge — a real logo image if one is set, otherwise the monogram. */
  function brandLogoInner() {
    return state.brandLogo
      ? `<img src="${esc(state.brandLogo)}" alt="${esc(state.brand)} logo" onerror="this.style.display='none'">`
      : `<span class="nfp-hero-logo-mono">${esc(brandMono())}</span>`;
  }
  /* The brand-logo circle + (when the product is brand-claimed) a Brand-Claimed
     chip, floated on the bottom-left of the product photo. */
  function heroBrandRowHTML() {
    if (!state.brand) return '';
    const claimed = state.brandClaimed
      ? `<span class="nfp-hero-claimed"><span class="material-symbols-outlined">gpp_good</span>Brand Claimed</span>`
      : '';
    return `<div class="nfp-hero-brandrow">
        <span class="nfp-hero-logo" title="${esc(state.brand)}" aria-label="${esc(state.brand)} logo">${brandLogoInner()}</span>
        ${claimed}
      </div>`;
  }
  function richHeroHTML() {
    const onPhoto = !!state.image;
    /* Opt-in (per page) to the branded hero. Two flavors:
         WISE_HERO_BRAND     — legacy: icon edit + top-right logo badge (view-product).
         WISE_HERO_BRANDROW  — icon edit + bottom-left logo + Brand-Claimed chip. */
    const wantHeroBrand = !!(typeof window !== 'undefined' && window.WISE_HERO_BRAND);
    const wantBrandRow = !!(typeof window !== 'undefined' && window.WISE_HERO_BRANDROW);
    const iconEdit = wantHeroBrand || wantBrandRow;
    const stack = `<div class="nfp-hero-stack${onPhoto ? '' : ' nfp-hero-stack--light'}">
        <div class="nfp-hero-name">${editSpan('productName', state.productName, 'Product name')}</div>
        <div class="nfp-hero-actionrow">
          ${heroCatHTML(onPhoto)}
          ${heroUpcHTML(onPhoto)}
        </div>
      </div>`;
    if (!onPhoto) {
      return `<div class="nfp-hero nfp-hero--rich nfp-hero--empty">
        <div class="nfp-hero-edit-tag">
          <span class="nfp-hero-edit-tag-label">Product image</span>
          <button type="button" class="nfp-hero-edit nfp-hero-edit--icon" data-nfp="upload-main" title="Add product image" aria-label="Add product image"><span class="material-symbols-outlined">edit</span></button>
        </div>
        <div class="nfp-hero-empty nfp-hero-photo-input">
          <div class="nfp-hero-name nfp-hero-name--head">${editSpan('productName', state.productName, 'Add product name')}</div>
        </div>
        <div class="nfp-hero-stack nfp-hero-stack--light">
          <div class="nfp-hero-actionrow">
            ${heroCatHTML(onPhoto)}
            ${heroUpcHTML(onPhoto)}
          </div>
        </div>
      </div>`;
    }
    const heroEdit = iconEdit
      ? `<div class="nfp-hero-edit-tag">
          <span class="nfp-hero-edit-tag-label">Product image</span>
          <button type="button" class="nfp-hero-edit nfp-hero-edit--icon" data-nfp="upload-main" title="Replace product image" aria-label="Replace product image"><span class="material-symbols-outlined">edit</span></button>
        </div>`
      : `<button type="button" class="nfp-hero-edit" data-nfp="upload-main"><span class="material-symbols-outlined">photo_camera</span>Replace</button>`;
    /* Legacy top-right monogram badge (view-product); the new brand row lives
       bottom-left and includes the Brand-Claimed chip. */
    const heroLogoTR = (wantHeroBrand && !wantBrandRow && state.brand)
      ? `<span class="nfp-hero-logo" title="${esc(state.brand)}" aria-label="${esc(state.brand)} logo">${brandLogoInner()}</span>`
      : '';
    const brandRow = wantBrandRow ? heroBrandRowHTML() : '';
    return `<div class="nfp-hero nfp-hero--rich">
      <img class="nfp-hero-img" src="${esc(state.image)}" alt="" onerror="this.src='https://placehold.co/300x260/1A2339/ffffff?text=Product'">
      <div class="nfp-hero-scrim" aria-hidden="true"></div>
      ${heroEdit}
      ${heroLogoTR}
      ${brandRow}
      ${stack}
    </div>`;
  }

  /* Pack-format hero — the same rich hero the base product uses, but bound to a
     single pack's photo, size/count label and UPC. Shown below the strip when a
     Pack Format tab is the active filter, so the whole content area reflects the
     selected format (its photo, its Nutrition Facts) instead of the base one. */
  function packUpcHTML(i, onPhoto) {
    const p = state.packs[i];
    /* By default a size carries the same barcode as the single count: when the
       size has no code of its own, reuse the base UPC (with a small note) so the
       same barcode is shown. Editing any digit gives the size its own code. */
    const reuse = !p.upc && !!state.upc;
    const digits = p.upc || state.upc;
    const note = reuse ? `<div class="nfp-pack-upc-note">Same as 1 ct</div>` : '';
    return `<div class="nfp-hero-upc nfp-hero-upc--seg">${note}${upcSegmentedHTML(onPhoto, i, digits)}</div>`;
  }
  function packHeroHTML(i) {
    const p = state.packs[i];
    const img = p.image || state.image || '';
    const onPhoto = !!img;
    const wantBrandRow = !!(typeof window !== 'undefined' && window.WISE_HERO_BRANDROW);
    const stack = `<div class="nfp-hero-stack${onPhoto ? '' : ' nfp-hero-stack--light'}">
        <div class="nfp-hero-name">${editSpan('productName', state.productName, 'Product name')}</div>
        <div class="nfp-hero-brand">${editSpan('packs.' + i + '.label', p.label, 'Pack size / count')}</div>
        <div class="nfp-hero-actionrow">
          ${packUpcHTML(i, onPhoto)}
        </div>
      </div>`;
    if (!onPhoto) {
      /* Exact same shape as the single-count (base) empty hero: the Product
         image icon pinned top-right, a size/count input as the headline, and
         the UPC below (reused from the single count by default). */
      return `<div class="nfp-hero nfp-hero--rich nfp-hero--empty">
        <div class="nfp-hero-edit-tag">
          <span class="nfp-hero-edit-tag-label">Product image</span>
          <button type="button" class="nfp-hero-edit nfp-hero-edit--icon" data-nfp="upload-pack" data-arg="${i}" title="Add product image" aria-label="Add product image"><span class="material-symbols-outlined">edit</span></button>
        </div>
        <div class="nfp-hero-empty nfp-hero-photo-input">
          <div class="nfp-hero-name nfp-hero-name--head">${editSpan('packs.' + i + '.label', p.label, 'Add pack size or count')}</div>
        </div>
        <div class="nfp-hero-stack nfp-hero-stack--light">
          <div class="nfp-hero-actionrow">
            ${packUpcHTML(i, false)}
          </div>
        </div>
      </div>`;
    }
    return `<div class="nfp-hero nfp-hero--rich">
      <img class="nfp-hero-img" src="${esc(img)}" alt="" onerror="this.src='https://placehold.co/300x260/1A2339/ffffff?text=Product'">
      <div class="nfp-hero-scrim" aria-hidden="true"></div>
      <button type="button" class="nfp-hero-edit nfp-hero-edit--icon" data-nfp="upload-pack" data-arg="${i}" title="Replace photo" aria-label="Replace photo"><span class="material-symbols-outlined">edit</span></button>
      ${wantBrandRow ? heroBrandRowHTML() : ''}
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

  /* Product sizes — one section across the top. It starts with the default
     "Single unit" (the base product itself), then any additional quantities
     (multipacks / larger sizes) the user adds. The product photo is handled by
     the hero thumbnail control, so there's no separate Product Images column. */
  function productSizesGroupHTML() {
    const unitActive = state.view === 'product';
    const unitThumb = `
      <div class="nfp-fi-thumb${unitActive ? ' active' : ''}" data-nfp="pick-image" data-arg="0" title="1 ct (default)">
        ${state.image
          ? `<img class="nfp-fi-thumb-img" src="${esc(state.image)}" alt="1 ct" onerror="this.src='https://placehold.co/40x40/f3f4f6/9ca3af?text=?'">`
          : `<span class="nfp-fi-thumb-img nfp-fi-thumb-icon"><span class="material-symbols-outlined">nutrition</span></span>`}
        <span class="nfp-fi-thumb-label">1 ct</span>
      </div>`;
    const thumbs = state.packs.map((p, i) => `
      <div class="nfp-fi-thumb${(state.view === 'pack' && i === state.activePack) ? ' active' : ''}" data-nfp="pick-pack" data-arg="${i}" title="${esc(p.label || 'Size')}">
        ${p.image
          ? `<img class="nfp-fi-thumb-img" src="${esc(p.image)}" alt="${esc(p.label || '')}" onerror="this.src='https://placehold.co/40x40/f3f4f6/9ca3af?text=?'">`
          : `<span class="nfp-fi-thumb-img nfp-fi-thumb-icon"><span class="material-symbols-outlined">inventory_2</span></span>`}
        <span class="nfp-fi-thumb-label">${esc(p.label || 'Size')}</span>
      </div>`).join('');
    const hint = state.packs.length
      ? ''
      : `<div class="nfp-pack-caption">Starts with a single unit — add any multipacks or larger quantities this product also ships in.</div>`;
    const identity = useHeaderIdentity();
    const packIdx = activePackIndex();
    const title = identity
      ? `<div class="nfp-fi-header">
          <span class="nfp-fi-title">Add product sizes for our ${editSpan('productName', state.productName, 'product name')}</span>
        </div>`
      : `<div class="nfp-fi-header"><span class="nfp-fi-title">Add Product Sizes</span></div>`;
    const stripExtras = identity
      ? `<div class="nfp-fi-cat">${heroCatHTML(false)}</div>
         <div class="nfp-fi-upc">${packIdx != null ? packUpcHTML(packIdx, false) : heroUpcHTML(false)}</div>`
      : '';
    const stripPhoto = identity
      ? `<div class="nfp-fi-strip-photo" aria-hidden="true">${productBgImgHTML()}</div>`
      : '';
    return `<div class="nfp-fi-group nfp-fi-group--packs${identity ? ' nfp-fi-group--identity' : ''}">
      ${stripPhoto}
      ${title}
      ${hint}
      <div class="nfp-fi-thumbs">
        ${unitThumb}
        ${thumbs}
        <div class="nfp-fi-add" data-nfp="add-pack" title="Add another quantity"><span class="material-symbols-outlined">add</span></div>
        ${stripExtras}
      </div>
    </div>`;
  }
  /* Single-pane: the Product sizes section across the top. */
  function imagesAndPacksHTML() {
    return `<div class="nfp-fi">${productSizesGroupHTML()}</div>`;
  }
  /* Wide (two-pane): the same Product sizes section in the left column. */
  function packFormatsHTML() {
    return `<div class="nfp-fi nfp-fi--packs">${productSizesGroupHTML()}</div>`;
  }

  function nfRowHTML(r, nf, prefix) {
    nf = nf || state.nf;
    prefix = prefix || 'nf';
    const val = nf[r.key] || { amt: '', dv: '' };
    const errKey = prefix + '.' + r.key;
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

  function nutritionHTML(nf, prefix) {
    nf = nf || state.nf;
    prefix = prefix || 'nf';
    return `<div class="nfp-nf-panel">
      <div class="nfp-nf-title">Nutrition Facts</div>
      <div class="nfp-nf-serving">
        <div class="nfp-nf-spc-row">${editSpan(prefix + '.servingsPer', nf.servingsPer, '0')} servings per container</div>
        <div class="nfp-nf-ss-row"><span>Serving size</span><strong>${editSpan(prefix + '.servingSize', nf.servingSize, 'e.g. 1 muffin (57g)')}</strong></div>
      </div>
      <div class="nfp-nf-rule8"></div>
      <div class="nfp-nf-cal-band">
        <div class="nfp-nf-cal-left"><span class="nfp-nf-cal-sm">Amount Per Serving</span><span class="nfp-nf-cal-text">Calories</span></div>
        <span class="nfp-nf-cal-num">${editSpan(prefix + '.calories', nf.calories, '0')}</span>
      </div>
      <div class="nfp-nf-dv-hdr">% Daily Value*</div>
      ${NF_ROWS.map((r) => nfRowHTML(r, nf, prefix)).join('')}
      <div class="nfp-nf-rule8"></div>
      ${NF_MICRO.map((r) => nfRowHTML(r, nf, prefix)).join('')}
      <div class="nfp-nf-footer">* The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.</div>
    </div>`;
  }

  /* Editable Nutrition Facts for the currently-selected pack format. A pack's
     NFP is seeded from the base product (cloneNf) but edits independently, so a
     multipack can carry its own servings-per-container etc. Rendered only once a
     pack exists; switching the active pack thumbnail swaps which one shows. */
  function packNfSectionHTML() {
    if (!state.packs.length) return '';
    const i = Math.min(state.activePack, state.packs.length - 1);
    const p = state.packs[i];
    if (!p.nf) p.nf = cloneNf(state.nf);
    return `<div class="nfp-pack-nf" id="pack-nf">
      ${nutritionHTML(p.nf, 'packs.' + i + '.nf')}
    </div>`;
  }

  /* ── Ingredient analysis (third column) ───────────────────────────────
     Ingredient list + Analyze, then Parsed / Codes / Nutrients /
     Wise Code AI as collapsible accordions. Analyze re-parses the live
     list and replays the row + score animations. */
  const IA_CATALOG = [
    { keys: ['ground flaxseed', 'flaxseed', 'flax seed'], mapped: 'FLAXSEED', cat: 'Protein', sub: 'Nut & Seed', pl: 1, match: 'ok' },
    { keys: ['cane sugar'], mapped: 'CANE SUGAR', cat: 'Sweetener', sub: 'Sugars', pl: 2, match: 'ok' },
    { keys: ['egg whites', 'egg white'], mapped: 'EGG WHITE', cat: 'Protein', sub: 'Egg', pl: 1, match: 'ok' },
    { keys: ['water'], mapped: 'WATER', cat: 'Water', sub: 'Water', pl: 1, match: 'ok' },
    { keys: ['chocolate chips', 'chocolate chip'], mapped: 'CHOCOLATE CHIP', cat: 'Confection', sub: 'Chocolate', pl: 2, match: 'ok' },
    { keys: ['unsweetened chocolate'], mapped: 'CHOCOLATE', cat: 'Confection', sub: 'Chocolate', pl: 1, match: 'ok' },
    { keys: ['cocoa butter'], mapped: 'COCOA BUTTER', cat: 'Fat', sub: 'Cocoa', pl: 1, match: 'ok' },
    { keys: ['canola oil', 'non-gmo expeller-pressed canola oil', 'non-gmo canola oil'], mapped: 'CANOLA OIL', cat: 'Fat', sub: 'Oil', pl: 2, match: 'ok' },
    { keys: ['cocoa'], mapped: 'COCOA', cat: 'Flavor', sub: 'Cocoa', pl: 1, match: 'ok' },
    { keys: ['baking soda', 'sodium bicarbonate'], mapped: 'SODIUM BICARBONATE', cat: 'Additive', sub: 'Leavening', pl: 2, match: 'ok' },
    { keys: ['baking powder'], mapped: 'BAKING POWDER', cat: 'Additive', sub: 'Leavening', pl: 2, match: 'ok' },
    { keys: ['sea salt', 'salt'], mapped: 'SEA SALT', cat: 'Mineral', sub: 'Salt', pl: 1, match: 'ok' },
    { keys: ['xanthan gum'], mapped: 'XANTHAN GUM', cat: 'Additive', sub: 'Gum', pl: 2, match: 'part' },
    { keys: ['natural flavor', 'natural flavour'], mapped: 'NATURAL FLAVOR', cat: 'Additive', sub: 'Flavor', pl: 2, match: 'bad' },
    { keys: ['dates', 'organic dates', '100% organic dates'], mapped: 'DATES', cat: 'Fruit', sub: 'Stone Fruits', pl: 1, match: 'ok' },
    { keys: ['almond', 'almonds'], mapped: 'ALMOND', cat: 'Protein', sub: 'Nut & Seed', pl: 1, match: 'ok' },
    { keys: ['cashew', 'cashews'], mapped: 'CASHEW', cat: 'Protein', sub: 'Nut & Seed', pl: 1, match: 'ok' },
    { keys: ['oat', 'oats'], mapped: 'OAT', cat: 'Grain', sub: 'Cereal', pl: 1, match: 'ok' },
    { keys: ['orange juice powder'], mapped: 'ORANGE JUICE POWDER', cat: 'Fruit', sub: 'Citrus', pl: 2, match: 'ok' },
    { keys: ['cinnamon'], mapped: 'CINNAMON', cat: 'Spice', sub: 'Bark', pl: 1, match: 'ok' },
    { keys: ['turmeric'], mapped: 'TURMERIC', cat: 'Spice', sub: 'Root', pl: 1, match: 'ok' },
    { keys: ['ginger'], mapped: 'GINGER', cat: 'Spice', sub: 'Root', pl: 1, match: 'ok' },
    { keys: ['reishi extract'], mapped: 'REISHI', cat: 'Additive', sub: 'Extract', pl: 2, match: 'ok' },
    { keys: ['lion\'s mane extract', 'lions mane extract'], mapped: 'LION\'S MANE', cat: 'Additive', sub: 'Extract', pl: 2, match: 'bad' },
    { keys: ['ashwagandha extract'], mapped: 'ASHWAGANDHA', cat: 'Additive', sub: 'Extract', pl: 2, match: 'part' },
  ];

  function splitIngredientTokens(text) {
    const parts = [];
    let buf = '';
    let depth = 0;
    String(text || '').split('').forEach((ch) => {
      if (ch === '(') { depth += 1; buf += ch; return; }
      if (ch === ')') { depth = Math.max(0, depth - 1); buf += ch; return; }
      if (ch === ',' && depth === 0) {
        if (buf.trim()) parts.push(buf.trim());
        buf = '';
        return;
      }
      buf += ch;
    });
    if (buf.trim()) parts.push(buf.trim());
    return parts;
  }

  function lookupIngredient(raw) {
    const clean = String(raw || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
    const key = clean.toLowerCase().replace(/^100%\s+/, '').replace(/^organic\s+/, '');
    const hit = IA_CATALOG.find((c) => c.keys.some((k) => key === k || key.endsWith(' ' + k) || key.startsWith(k)));
    if (hit) return { raw: clean || raw, mapped: hit.mapped, cat: hit.cat, sub: hit.sub, pl: hit.pl, match: hit.match };
    const mapped = clean.toUpperCase() || String(raw || '').toUpperCase();
    return { raw: clean || raw, mapped, cat: 'Ingredient', sub: 'Unclassified', pl: 2, match: 'ok' };
  }

  function parseIngredientTree(text) {
    const rows = [];
    splitIngredientTokens(text).forEach((token) => {
      const m = token.match(/^(.*?)(?:\s*\((.*)\))\s*$/);
      const parentRaw = m ? m[1].trim() : token;
      const inner = m && m[2] ? m[2] : '';
      const parent = lookupIngredient(parentRaw);
      parent.children = inner ? splitIngredientTokens(inner).map((c) => lookupIngredient(c)) : [];
      rows.push(parent);
    });
    return rows;
  }

  function flattenParsed(tree) {
    const out = [];
    tree.forEach((row) => {
      out.push(row);
      (row.children || []).forEach((c) => out.push(c));
    });
    return out;
  }

  function iaMatchOf(row) {
    if (state.iaConfirm[row.mapped]) return 'ok';
    return row.match || 'ok';
  }

  function iaMatchPill(match, mapped) {
    if (match === 'ok') return `<span class="nfp-ia-pill nfp-ia-pill--ok">Matched</span>`;
    if (match === 'part') {
      return `<span class="nfp-ia-pill-wrap"><span class="nfp-ia-pill nfp-ia-pill--part">Partly</span>`
        + `<button type="button" class="nfp-ia-confirm" data-nfp="ia-confirm" data-arg="${esc(mapped)}">Confirm</button></span>`;
    }
    return `<span class="nfp-ia-pill-wrap"><span class="nfp-ia-pill nfp-ia-pill--bad">Mismatch</span>`
      + `<span class="material-symbols-outlined nfp-ia-pill-ico" aria-hidden="true">search</span></span>`;
  }

  function iaCurrentNf() {
    if (state.view === 'pack' && state.packs.length) {
      const i = Math.min(state.activePack, state.packs.length - 1);
      const p = state.packs[i];
      return (p && p.nf) || state.nf;
    }
    return state.nf;
  }

  function iaCodesRows() {
    const declared = state.allergens.map((a) => String(a).toLowerCase());
    const present = (name) => {
      const n = name.toLowerCase();
      return declared.some((d) => d === n || d.includes(n) || n.includes(d.replace(/s$/, '')));
    };
    const names = ['Eggs', 'Fish', 'Milk', 'Peanuts', 'Sesame', 'Shellfish', 'Soy', 'Tree Nuts', 'Wheat'];
    const rows = [
      { code: 'Allergens', interp: declared.length ? 'Present' : 'None', tone: declared.length ? 'bad' : 'ok', score: declared.length ? 0 : 100 },
    ];
    names.forEach((n) => {
      const on = present(n);
      rows.push({ code: n, interp: on ? 'Present' : 'None', tone: on ? 'bad' : 'ok', score: on ? 0 : 100 });
    });
    rows.push(
      { code: 'California Assembly UPF', interp: 'Not UPF', tone: 'ok', score: 100 },
      { code: 'Calorie Quality', interp: 'Ok', tone: 'warn', score: 58 },
      { code: 'Carbohydrate Quality', interp: 'Excellent', tone: 'ok', score: 86 },
      { code: 'Crown Label', interp: 'Poor', tone: 'bad', score: 18 },
    );
    return rows;
  }

  function iaNutrientRows() {
    const nf = iaCurrentNf();
    const rows = [];
    const cal = String(nf.calories || '').replace(/[^\d.]/g, '');
    if (cal) rows.push({ name: 'Energy', amt: cal, unit: 'kcal', dv: '—' });
    NF_ROWS.concat(NF_MICRO).forEach((r) => {
      const v = nf[r.key] || {};
      const raw = String(v.amt || '').trim();
      if (!raw) return;
      const m = raw.match(/^([\d.]+)\s*(.*)$/);
      rows.push({
        name: NF_LABELS[r.key] || r.key,
        amt: m ? m[1] : raw,
        unit: m ? (m[2] || '') : '',
        dv: v.dv || '—',
      });
    });
    return rows;
  }

  function iaAccord(id, title, inner) {
    const open = state.iaOpen[id] !== false;
    return `<section class="nfp-ia-sec${open ? '' : ' is-collapsed'}" data-ia-sec="${id}">
      <button type="button" class="nfp-ia-head" data-nfp="ia-toggle" data-arg="${id}" aria-expanded="${open ? 'true' : 'false'}">
        <span class="nfp-ia-title">${title}</span>
        <span class="material-symbols-outlined nfp-ia-chev" aria-hidden="true">expand_more</span>
      </button>
      <div class="nfp-ia-body">${inner}</div>
    </section>`;
  }

  function parsedPanelHTML(tree) {
    const flat = flattenParsed(tree);
    const matches = flat.map(iaMatchOf);
    const ok = matches.filter((m) => m === 'ok').length;
    const part = matches.filter((m) => m === 'part').length;
    const bad = matches.filter((m) => m === 'bad').length;
    const pending = part + bad;
    const banner = pending
      ? `<div class="nfp-ia-banner nfp-ia-banner--warn"><span class="material-symbols-outlined">warning</span>${pending} mapping${pending === 1 ? '' : 's'} still need a review.</div>`
      : `<div class="nfp-ia-banner nfp-ia-banner--ok"><span class="material-symbols-outlined">check_circle</span>All ingredients matched and waiting for your confirmation.</div>`;
    const actions = `<div class="nfp-ia-actions">
        <button type="button" class="nfp-ia-btn nfp-ia-btn--ghost" data-nfp="ia-review">${pending ? `Review ${pending} mapping${pending === 1 ? '' : 's'}` : 'Review mappings'}</button>
        <button type="button" class="nfp-ia-btn nfp-ia-btn--ghost" data-nfp="ia-analyze">Re-analyze all ${flat.length}</button>
        <button type="button" class="nfp-ia-btn nfp-ia-btn--ok" data-nfp="ia-confirm-all">Confirm ${ok} matched</button>
      </div>`;
    const rows = flat.map((row, i) => {
      const match = iaMatchOf(row);
      return `<div class="nfp-ia-row nfp-ia-parsed-row" style="--i:${i}" data-ia-match="${match}">
        <div class="nfp-ia-td nfp-ia-td--ing">${esc(row.raw)}</div>
        <div class="nfp-ia-td nfp-ia-td--mapstack">
          <span class="nfp-ia-mapped">${esc(row.mapped)}</span>
          ${iaMatchPill(match, row.mapped)}
        </div>
      </div>`;
    }).join('');
    return `${banner}${actions}
      <div class="nfp-ia-table nfp-ia-table--parsed">
        <div class="nfp-ia-th"><span>Ingredient</span><span>Mapped / Match</span></div>
        ${rows}
      </div>`;
  }

  function codesPanelHTML() {
    const rows = iaCodesRows();
    return `<div class="nfp-ia-table nfp-ia-table--codes">
      <div class="nfp-ia-th nfp-ia-th--codes"><span>Code</span><span>Interpretation / Score</span></div>
      ${rows.map((r, i) => `<div class="nfp-ia-row nfp-ia-code-row" style="--i:${i}">
        <div class="nfp-ia-td">${esc(r.code)}</div>
        <div class="nfp-ia-td nfp-ia-td--mapstack">
          <span class="nfp-ia-pill nfp-ia-pill--${r.tone}">${esc(r.interp)}</span>
          <span class="nfp-ia-td--num"><span class="nfp-ia-score" data-countup>${r.score}</span><span class="nfp-ia-den">/100</span></span>
        </div>
      </div>`).join('')}
    </div>`;
  }

  function nutrientsPanelHTML() {
    const rows = iaNutrientRows();
    if (!rows.length) {
      return `<p class="nfp-ia-empty">Fill the Nutrition Facts to populate this table.</p>`;
    }
    return `<div class="nfp-ia-table nfp-ia-table--nut">
      <div class="nfp-ia-th nfp-ia-th--nut"><span>Name</span><span>Amount</span><span>% DV</span></div>
      ${rows.map((r, i) => `<div class="nfp-ia-row nfp-ia-nut-row" style="--i:${i}">
        <div class="nfp-ia-td">${esc(r.name)}</div>
        <div class="nfp-ia-td nfp-ia-td--num nfp-ia-td--amt"><span class="nfp-ia-score" data-countup>${esc(r.amt)}</span>${r.unit ? `<span class="nfp-ia-unit">${esc(r.unit)}</span>` : ''}</div>
        <div class="nfp-ia-td">${esc(r.dv)}</div>
      </div>`).join('')}
    </div>`;
  }

  function scoutPanelHTML(tree) {
    const rows = [];
    tree.forEach((row) => {
      rows.push({ ...row, indent: 0 });
      (row.children || []).forEach((c) => rows.push({ ...c, indent: 1 }));
    });
    return `<div class="nfp-ia-table nfp-ia-table--scout">
      <div class="nfp-ia-th nfp-ia-th--scout"><span>Name / alt</span><span>Mapped to</span><span>Category / Sub-category</span><span>Process</span></div>
      ${rows.map((r, i) => `<div class="nfp-ia-row nfp-ia-scout-row${r.indent ? ' is-child' : ''}" style="--i:${i}">
        <div class="nfp-ia-td">${esc(r.raw)}</div>
        <div class="nfp-ia-td">${esc(r.mapped)}</div>
        <div class="nfp-ia-td nfp-ia-td--mapstack">
          <span class="nfp-ia-mapped">${esc(r.cat)}</span>
          ${r.sub ? `<span class="nfp-ia-subcat">${esc(r.sub)}</span>` : ''}
        </div>
        <div class="nfp-ia-td"><span class="nfp-ia-pl nfp-ia-pl--${r.pl}" title="Process level ${r.pl}">${r.pl}</span></div>
      </div>`).join('')}
    </div>`;
  }

  function ingredientsHTML() {
    const err = state.errors.ingredients;
    const listInner = `<div class="nfp-ingred-wrap">
      <div class="nfp-ingred-body${err ? ' nfp-block-err' : ''}">
        <textarea class="nfp-ingred-edit" data-field="ingredients" rows="1" placeholder="Paste or type the ingredient list">${esc(state.ingredients)}</textarea>
        ${err ? `<div class="nfp-field-note"><span class="material-symbols-outlined">error_outline</span>${esc(err)}</div>` : ''}
      </div>
      <button type="button" class="nfp-ia-analyze" data-nfp="ia-analyze"${state.ingredients ? '' : ' disabled'}>
        <span class="material-symbols-outlined">science</span>Analyze Ingredients
      </button>
    </div>`;
    const tree = parseIngredientTree(state.ingredients);
    const analyzed = state.iaRan && tree.length;
    const extras = analyzed
      ? iaAccord('parsed', 'Parsed Ingredients', parsedPanelHTML(tree))
        + iaAccord('codes', 'Codes', codesPanelHTML())
        + iaAccord('nutrients', 'Nutrients', nutrientsPanelHTML())
        + iaAccord('scout', 'Wise Code AI Engine Flavor Results', scoutPanelHTML(tree))
      : '';
    return `<div class="nfp-ia" data-ia-tick="${state.iaTick}">
      ${iaAccord('list', 'Ingredient List', listInner)}
      ${extras}
    </div>`;
  }

  /* Allergens + Contains sit under the Nutrition Facts panel (facts column),
     not with the ingredients list in the third column. */
  function allergensHTML() {
    const allergTags = state.allergens.length
      ? state.allergens.map((a, i) => `<span class="nfp-allergen-tag"><span class="nfp-allergen-emoji">${allergenEmoji(a)}</span>${esc(a)} <span data-nfp="remove-allergen" data-arg="${i}" style="cursor:pointer;color:#9ca3af;margin-left:1px" title="Remove">×</span></span>`).join('')
      : '<span style="font-size:0.66rem;color:#9ca3af;font-style:italic">None declared yet</span>';
    return `<div class="nfp-decl-wrap">
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
    return `<div class="nfp-rcol-upc">${upcSegmentedHTML(true, null, state.upc)}</div>`;
  }
  function rightColumnHTML() {
    const all = allImages();
    const wantBrandRow = !!(typeof window !== 'undefined' && window.WISE_HERO_BRANDROW);
    if (!all.length) {
      /* Keep the name/brand editable before a photo exists, mirroring the
         single-pane hero and the chat's "type the name" action. The brand is
         already known by default, so show the logo + Brand-Claimed chip in the
         same bottom-left spot they occupy once a photo is added. */
      return `<div class="nfp-rcol-empty">
        <div class="nfp-hero-empty nfp-hero-empty--fill" data-nfp="upload-main">
          <span class="material-symbols-outlined">add_a_photo</span>
          <span class="neh-t">Add a product photo</span>
          <span class="neh-d">Fills the whole right pane</span>
        </div>
        ${wantBrandRow ? heroBrandRowHTML() : ''}
        <div class="nfp-rcol-foot">
          <div class="nfp-rcol-name">${editSpan('productName', state.productName, 'Product name')}</div>
          ${rUpcHTML()}
        </div>
      </div>`;
    }
    const active = all[Math.min(state.activeImage, all.length - 1)];
    return `<div class="nfp-rcol">
      <img class="nfp-rcol-img" src="${esc(active.src)}" alt="" onerror="this.src='https://placehold.co/400x640/1A2339/ffffff?text=Product'">
      <div class="nfp-rcol-scrim" aria-hidden="true"></div>
      <button type="button" class="nfp-rcol-replace" data-nfp="upload-main" title="Replace photo" aria-label="Replace photo"><span class="material-symbols-outlined">edit</span></button>
      ${wantBrandRow ? heroBrandRowHTML() : ''}
      <div class="nfp-rcol-top">${rThumbsHTML(all)}</div>
      <div class="nfp-rcol-bottom">
        <div class="nfp-rcol-name">${editSpan('productName', state.productName, 'Product name')}</div>
        ${rUpcHTML()}
      </div>
    </div>`;
  }

  /* ── Compare view ──────────────────────────────────────────────────────
     Every format the product ships in, laid out side by side (base product +
     each pack format), as a product-comparison-style matrix: a left rail of
     field labels and one read-only column per format so their Nutrition Facts
     line up. Toggled from the Product Details ⋯ menu. */
  function compareEntities() {
    const list = [{
      key: 'base',
      name: state.productName || 'Product',
      sub: 'Base product',
      img: state.image,
      upc: state.upc,
      nf: state.nf,
    }];
    state.packs.forEach((p, i) => {
      if (!p.nf) p.nf = cloneNf(state.nf);
      list.push({
        key: 'pack' + i,
        name: p.label || ('Pack ' + (i + 1)),
        sub: 'Pack format',
        img: p.image || state.image,
        upc: p.upc,
        nf: p.nf,
      });
    });
    return list;
  }

  function cmpCell(text, opts) {
    opts = opts || {};
    const empty = text === undefined || text === null || text === '';
    const cls = 'nfp-cmp-cell nfp-cmp-ent'
      + (opts.baseCol ? ' is-base-col' : '')
      + (opts.diff ? ' nfp-cmp-diff' : '')
      + (opts.mono ? ' nfp-cmp-cell--mono' : '');
    const inner = empty
      ? '<span class="nfp-cmp-empty">—</span>'
      : `<span class="nfp-cmp-amt">${esc(String(text))}</span>${opts.dv ? `<span class="nfp-cmp-dv">${esc(opts.dv)} DV</span>` : ''}`;
    return `<div class="${cls}"><div class="nfp-cmp-val">${inner}</div></div>`;
  }

  /* Read-only barcode card for a format's UPC column — the same white barcode
     card the single product view shows (big bars + spaced digits below), so the
     UPC reads as a real, scannable code inside the comparison too. */
  function cmpBarcodeCard(e, baseCol) {
    const raw = String(e.upc || '').replace(/\D/g, '');
    const cls = 'nfp-cmp-cell nfp-cmp-ent nfp-cmp-bc-cell' + (baseCol ? ' is-base-col' : '');
    if (raw.length !== 12) {
      return `<div class="${cls}"><span class="nfp-cmp-empty">—</span></div>`;
    }
    return `<div class="${cls}">
      <div class="nfp-cmp-bc-card">
        <div class="nfp-cmp-bc">${upcBarcodeBig(raw)}</div>
        <div class="nfp-cmp-bc-num">${esc(formatUpc(raw))}</div>
      </div>
    </div>`;
  }

  function compareHTML() {
    const ents = compareEntities();
    const n = ents.length;
    const cols = `minmax(104px, 128px) repeat(${n}, minmax(120px, 1fr))`;
    const base = ents[0];

    const head = `<div class="nfp-cmp-cell nfp-cmp-rail nfp-cmp-head-rail">Format</div>` + ents.map((e) => {
      const isBase = e.key === 'base';
      const media = e.img
        ? `<img class="nfp-cmp-tile-img" src="${esc(e.img)}" alt="" onerror="this.style.display='none'">`
        : `<span class="nfp-cmp-tile-ph"><span class="material-symbols-outlined">inventory_2</span></span>`;
      const badge = isBase ? '<span class="nfp-cmp-tile-badge">BASE</span>' : '';
      return `<div class="nfp-cmp-cell nfp-cmp-ent nfp-cmp-head${isBase ? ' is-base is-base-col' : ''}">
        <div class="nfp-cmp-tile">
          ${media}${badge}
          <div class="nfp-cmp-tile-overlay">
            <div class="nfp-cmp-tile-name">${esc(e.name || '—')}</div>
            <div class="nfp-cmp-tile-sub">${esc(e.sub)}</div>
          </div>
        </div>
      </div>`;
    }).join('');

    function metricRow(label, getter, o) {
      o = o || {};
      const baseVal = getter(base);
      const cells = ents.map((e) => {
        const v = getter(e);
        const diff = e !== base
          && String(v.text || '') !== String(baseVal.text || '')
          && !!(v.text || baseVal.text);
        return cmpCell(v.text, { dv: v.dv, diff, mono: o.mono, baseCol: e === base });
      }).join('');
      return `<div class="nfp-cmp-cell nfp-cmp-rail">${esc(label)}</div>${cells}`;
    }

    let rows = '';
    rows += metricRow('Serving size', (e) => ({ text: e.nf.servingSize }));
    rows += metricRow('Servings/container', (e) => ({ text: e.nf.servingsPer }));
    rows += metricRow('Calories', (e) => ({ text: e.nf.calories }));
    NF_ROWS.forEach((r) => {
      rows += metricRow(NF_LABELS[r.key], (e) => {
        const v = e.nf[r.key] || {};
        return { text: v.amt, dv: r.noDV ? '' : v.dv };
      });
    });
    NF_MICRO.forEach((r) => {
      rows += metricRow(NF_LABELS[r.key], (e) => {
        const v = e.nf[r.key] || {};
        return { text: v.amt, dv: v.dv };
      });
    });
    rows += `<div class="nfp-cmp-cell nfp-cmp-rail">UPC / Barcode</div>`
      + ents.map((e) => cmpBarcodeCard(e, e === base)).join('');

    const note = n <= 1
      ? `<div class="nfp-cmp-note"><span class="material-symbols-outlined">info</span>Only the base product exists so far. Add pack formats (sizes / multipacks) to line them up side by side here.</div>`
      : '';
    return `<div class="nfp-cmp">
      <div class="nfp-cmp-intro">Comparing ${n} ${n === 1 ? 'format' : 'formats'} side by side</div>
      ${note}
      <div class="nfp-cmp-scroll">
        <div class="nfp-cmp-grid" style="grid-template-columns:${cols}">
          ${head}${rows}
        </div>
      </div>
    </div>`;
  }

  /* ── Product Insights ──────────────────────────────────────────────────
     The Non-UPF shield CTA sits directly under the product photo in the
     single-pane media column. The three scorecards (UPF / GRAS / WISEscore)
     stay as a row below both columns — same idea as the Key Takeaways row
     on pages/product-comparison.html. Styling is .nfp-ins-* (add-product /
     view-product), reusing the analytics-types debossed stamp discs. */
  function shieldHTML() {
    return `<div class="nfp-ins-next">
        <span class="nfp-ins-next-ic" aria-hidden="true"><span class="material-symbols-outlined">gpp_good</span></span>
        <div class="nfp-ins-next-body">
          <div class="nfp-ins-next-title">Get the Non-UPF Shield</div>
          <div class="nfp-ins-next-desc">This product qualifies for Non-UPF verification. Earn the shield so it stands out on retail listings.</div>
        </div>
        <a class="nfp-ins-next-btn" href="non-upf-dashboard.html"><span class="material-symbols-outlined">gpp_good</span>Get the Non-UPF Shield</a>
      </div>`;
  }
  function insightsGridHTML() {
    /* Same claim-row chrome as the top scorecards on overview.html
       (.dash-claim / .dash-bignum / stamp discs) — no rating chips. */
    const name = esc(state.productName || 'this product');
    return `<section class="dash-claim nfp-ins-scores">
        <div class="dash-claim-col">
          <div class="dash-progress-pct">
            <span class="dash-pct-wrap"><span class="dash-bignum" data-countup>100</span><span class="dash-pct">%</span></span>
            <span class="dash-bignum-cap"><strong>Non-UPF</strong><br>Minimally processed · Qualifies for the verification shield</span>
            <span class="dash-stamp-icon" aria-hidden="true"><span class="material-symbols-outlined">eco</span></span>
          </div>
        </div>
        <div class="dash-claim-divider"></div>
        <div class="dash-claim-col">
          <div class="dash-progress-pct">
            <span class="dash-pct-wrap"><span class="dash-bignum" data-countup>67</span><span class="dash-pct">%</span></span>
            <span class="dash-bignum-cap"><strong>GRAS</strong><br>2 of 3 screened ingredients are GRAS · 1 flagged Unclear</span>
            <span class="dash-stamp-icon" aria-hidden="true"><span class="material-symbols-outlined">biotech</span></span>
          </div>
        </div>
        <div class="dash-claim-divider"></div>
        <div class="dash-claim-col">
          <div class="dash-bignum-row">
            <span class="dash-bignum" data-countup>84</span>
            <span class="dash-bignum-cap"><strong>WISEscore&#8482;</strong><br>for ${name}</span>
            <span class="dash-stamp-icon" aria-hidden="true"><span class="material-symbols-outlined">verified</span></span>
          </div>
        </div>
      </section>`;
  }
  function insightsCardsHTML() {
    return `<div class="nfp-ins">${insightsGridHTML()}</div>`;
  }
  function insightsHTML() {
    return `<div class="nfp-ins">${shieldHTML()}${insightsGridHTML()}</div>`;
  }

  /* Product Details ⋯ menu lives in the header (.panel-controls). sticky-modules.js
     injects Share / Copy link / Export into the same popover; we add the
     layout rows (two-pane photo + compare formats) once it exists. */
  function closeNfpMenu(pop) {
    const wrap = pop && pop.closest('.panel-more-wrap, .pf-module-menu');
    const btn = wrap && wrap.querySelector('.panel-more-btn, .pf-module-menu-btn');
    if (pop) pop.classList.add('hidden');
    if (btn) { btn.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }
  }
  function installNfpLayoutMenuItems() {
    const panel = document.getElementById('nfp-panel');
    if (!panel) return;
    let done = false;
    function tryInject() {
      if (done) return true;
      const pop = panel.querySelector('.panel-more-wrap .topbar-popover, .pf-module-menu .pf-module-menu-pop');
      if (!pop) return false;
      if (pop.querySelector('#nfp-compare-item')) { done = true; return true; }
      pop.insertAdjacentHTML('beforeend',
        '<div class="topbar-menu-divider"></div>'
        + '<button type="button" class="topbar-menu-item sc-mcp-item" id="nfp-twopane-item" role="menuitemcheckbox" aria-checked="false">'
        + '<span class="material-symbols-outlined topbar-menu-icon">view_sidebar</span>'
        + '<span>Two-pane photo layout</span>'
        + '<span class="sc-switch" aria-hidden="true"></span>'
        + '</button>'
        + '<button type="button" class="topbar-menu-item sc-mcp-item" id="nfp-compare-item" role="menuitemcheckbox" aria-checked="false">'
        + '<span class="material-symbols-outlined topbar-menu-icon">view_column</span>'
        + '<span>Compare formats side by side</span>'
        + '<span class="sc-switch" aria-hidden="true"></span>'
        + '</button>');
      const two = pop.querySelector('#nfp-twopane-item');
      const item = pop.querySelector('#nfp-compare-item');
      const sync = () => {
        two.classList.toggle('is-on', state.nfpWide);
        two.setAttribute('aria-checked', state.nfpWide ? 'true' : 'false');
        item.classList.toggle('is-on', state.nfpCompare);
        item.setAttribute('aria-checked', state.nfpCompare ? 'true' : 'false');
      };
      two.addEventListener('click', (e) => {
        e.stopPropagation();
        state.nfpWide = !state.nfpWide;
        if (panel) panel.classList.toggle('nfp-wide', state.nfpWide);
        sync();
        closeNfpMenu(pop);
        renderNFP();
      });
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        state.nfpCompare = !state.nfpCompare;
        sync();
        closeNfpMenu(pop);
        renderNFP();
      });
      sync();
      done = true;
      return true;
    }
    if (tryInject()) return;
    const obs = new MutationObserver(() => { if (tryInject()) obs.disconnect(); });
    obs.observe(panel, { childList: true, subtree: true });
    let tries = 0;
    const iv = setInterval(() => { if (tryInject() || ++tries > 60) clearInterval(iv); }, 120);
  }

  function wireNfpModuleMenu() {
    const wrap = document.getElementById('nfp-menu-wrap');
    const btn = document.getElementById('nfp-menu-btn');
    const pop = document.getElementById('nfp-menu');
    if (!wrap || !btn || !pop || wrap.dataset.stickyMenuWired) return;
    wrap.dataset.stickyMenuWired = '1';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const opening = pop.classList.contains('hidden');
      document.querySelectorAll('.panel-more-wrap[data-sticky-menu] .topbar-popover').forEach((p) => p.classList.add('hidden'));
      document.querySelectorAll('.panel-more-wrap[data-sticky-menu] .panel-more-btn').forEach((b) => {
        b.classList.remove('is-open');
        b.setAttribute('aria-expanded', 'false');
      });
      pop.classList.toggle('hidden', !opening);
      btn.classList.toggle('is-open', opening);
      btn.setAttribute('aria-expanded', opening ? 'true' : 'false');
    });
    document.addEventListener('click', (e) => {
      if (pop.classList.contains('hidden')) return;
      if (wrap.contains(e.target)) return;
      closeNfpMenu(pop);
    });
  }

  /* ── Single-pane column resize ─────────────────────────────────────────
     Three columns (photo · Nutrition Facts · ingredients) can be drag-resized
     along the seams — same grip language as js/pane-resize.js. Widths are
     remembered as fractions. Below the container-query breakpoint the
     columns stack and the splitters hide, so a narrow module never traps
     the user in three skinny panes. Double-click a seam to reset. */
  const NFP_COL_KEY = 'wise-nfp-cols-v4';
  const NFP_COL_KEY_2 = 'wise-nfp-cols-noidentity-v1';
  const NFP_COL_BP = 640;
  const NFP_COL_MIN = [120, 200, 240];
  const NFP_COL_MIN_2 = [200, 240];
  const NFP_COL_DEFAULT = [0.20, 0.40, 0.40];
  const NFP_COL_DEFAULT_2 = [0.50, 0.50];
  function nfpColWide() { return !!(nfpBody && nfpBody.clientWidth >= NFP_COL_BP); }
  function nfpIsTwoCol(sp) { return !!(sp && sp.classList.contains('nfp-sp--noidentity')); }
  function readNfpCols(sp) {
    const two = nfpIsTwoCol(sp);
    const key = two ? NFP_COL_KEY_2 : NFP_COL_KEY;
    const def = two ? NFP_COL_DEFAULT_2 : NFP_COL_DEFAULT;
    const expect = two ? 2 : 3;
    try {
      const o = JSON.parse(localStorage.getItem(key) || 'null');
      if (Array.isArray(o) && o.length === expect && o.every((n) => typeof n === 'number' && n > 0)) return o;
    } catch (_) {}
    return def.slice();
  }
  function saveNfpCols(fr, sp) {
    const two = nfpIsTwoCol(sp) || (fr && fr.length === 2);
    try { localStorage.setItem(two ? NFP_COL_KEY_2 : NFP_COL_KEY, JSON.stringify(fr)); } catch (_) {}
  }
  function applyNfpCols(sp, fr) {
    if (!sp || !fr) return;
    if (nfpIsTwoCol(sp) || fr.length === 2) {
      sp.style.setProperty('--nfp-w-facts', fr[0] + 'fr');
      sp.style.setProperty('--nfp-w-ingred', fr[1] + 'fr');
      return;
    }
    sp.style.setProperty('--nfp-w-media', fr[0] + 'fr');
    sp.style.setProperty('--nfp-w-facts', fr[1] + 'fr');
    sp.style.setProperty('--nfp-w-ingred', fr[2] + 'fr');
  }
  function nfpColEls(sp) {
    const media = sp.querySelector('.nfp-sp-media');
    const facts = sp.querySelector('.nfp-sp-facts');
    const ingred = sp.querySelector('.nfp-sp-ingred');
    return nfpIsTwoCol(sp) || !media ? [facts, ingred] : [media, facts, ingred];
  }
  function nfpColMins(sp) {
    return nfpIsTwoCol(sp) ? NFP_COL_MIN_2 : NFP_COL_MIN;
  }
  function nudgeNfpCols(sp, idx, dxPx) {
    const cols = nfpColEls(sp);
    if (cols.some((c) => !c) || idx < 0 || idx + 1 >= cols.length) return;
    const mins = nfpColMins(sp);
    const widths = cols.map((c) => c.getBoundingClientRect().width);
    const next = widths.slice();
    next[idx] = widths[idx] + dxPx;
    next[idx + 1] = widths[idx + 1] - dxPx;
    if (next[idx] < mins[idx]) {
      next[idx + 1] -= (mins[idx] - next[idx]);
      next[idx] = mins[idx];
    }
    if (next[idx + 1] < mins[idx + 1]) {
      next[idx] -= (mins[idx + 1] - next[idx + 1]);
      next[idx + 1] = mins[idx + 1];
    }
    const sum = next.reduce((a, b) => a + b, 0);
    if (sum <= 0) return;
    const fr = next.map((w) => w / sum);
    applyNfpCols(sp, fr);
    return fr;
  }
  function wireNfpColumns() {
    const sp = nfpBody && nfpBody.querySelector('.nfp-sp');
    if (!sp) return;
    applyNfpCols(sp, readNfpCols(sp));
    sp.querySelectorAll('[data-nfp-split]').forEach((split) => {
      split.addEventListener('pointerdown', (e) => {
        if (e.button != null && e.button !== 0) return;
        if (!nfpColWide()) return;
        e.preventDefault();
        const idx = Number(split.dataset.nfpSplit);
        const cols = nfpColEls(sp);
        const mins = nfpColMins(sp);
        if (!cols[idx] || !cols[idx + 1]) return;
        const startX = e.clientX;
        const startW = cols.map((c) => c.getBoundingClientRect().width);
        document.documentElement.classList.add('nfp-col-dragging');
        split.classList.add('is-on');
        try { split.setPointerCapture(e.pointerId); } catch (_) {}
        const move = (ev) => {
          const dx = ev.clientX - startX;
          const next = startW.slice();
          next[idx] = startW[idx] + dx;
          next[idx + 1] = startW[idx + 1] - dx;
          if (next[idx] < mins[idx]) {
            next[idx + 1] -= (mins[idx] - next[idx]);
            next[idx] = mins[idx];
          }
          if (next[idx + 1] < mins[idx + 1]) {
            next[idx] -= (mins[idx + 1] - next[idx + 1]);
            next[idx + 1] = mins[idx + 1];
          }
          const sum = next.reduce((a, b) => a + b, 0);
          if (sum > 0) applyNfpCols(sp, next.map((w) => w / sum));
        };
        const up = (ev) => {
          document.documentElement.classList.remove('nfp-col-dragging');
          split.classList.remove('is-on');
          try { split.releasePointerCapture(ev.pointerId); } catch (_) {}
          split.removeEventListener('pointermove', move);
          split.removeEventListener('pointerup', up);
          split.removeEventListener('pointercancel', up);
          const now = nfpColEls(sp).map((c) => c && c.getBoundingClientRect().width);
          const sum = now.reduce((a, b) => a + (b || 0), 0);
          if (sum > 0) saveNfpCols(now.map((w) => w / sum), sp);
        };
        split.addEventListener('pointermove', move);
        split.addEventListener('pointerup', up);
        split.addEventListener('pointercancel', up);
      });
      split.addEventListener('dblclick', () => {
        const def = (nfpIsTwoCol(sp) ? NFP_COL_DEFAULT_2 : NFP_COL_DEFAULT).slice();
        saveNfpCols(def, sp);
        applyNfpCols(sp, def);
      });
      split.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        if (!nfpColWide()) return;
        e.preventDefault();
        const idx = Number(split.dataset.nfpSplit);
        const step = (e.shiftKey ? 40 : 16) * (e.key === 'ArrowRight' ? 1 : -1);
        const fr = nudgeNfpCols(sp, idx, step);
        if (fr) saveNfpCols(fr, sp);
      });
    });
  }

  /* Third column matches the full second column (Nutrition Facts + allergens
     + contains). When the photo/shield column is taller, stretch to that
     bottom too so the column meets the score-card divider. */
  let nfpIaHeightRo = null;
  function syncIngredColHeight() {
    const sp = nfpBody && nfpBody.querySelector('.nfp-sp');
    if (!sp) return;
    const facts = sp.querySelector('.nfp-sp-facts');
    const media = sp.querySelector('.nfp-sp-media');
    const ingred = sp.querySelector('.nfp-sp-ingred');
    if (!facts || !ingred) return;
    const fr = facts.getBoundingClientRect();
    const ir = ingred.getBoundingClientRect();
    const mr = media && media.getBoundingClientRect();
    let h;
    if (nfpColWide() && ir.top < fr.bottom - 8) {
      const bottom = Math.max(fr.bottom, mr ? mr.bottom : fr.bottom);
      h = Math.round(bottom - ir.top);
    } else {
      h = Math.round(fr.height);
    }
    if (h < 120) h = Math.round(fr.height);
    ingred.style.setProperty('--nfp-ia-h', h + 'px');
    ingred.classList.add('has-ia-h');
  }
  function wireIngredColHeight() {
    if (nfpIaHeightRo) {
      nfpIaHeightRo.disconnect();
      nfpIaHeightRo = null;
    }
    const sp = nfpBody && nfpBody.querySelector('.nfp-sp');
    if (!sp) return;
    const facts = sp.querySelector('.nfp-sp-facts');
    const media = sp.querySelector('.nfp-sp-media');
    if (typeof ResizeObserver === 'function') {
      nfpIaHeightRo = new ResizeObserver(() => {
        sizeIngredEdit();
        syncIngredColHeight();
      });
      if (facts) nfpIaHeightRo.observe(facts);
      if (media) nfpIaHeightRo.observe(media);
      nfpIaHeightRo.observe(sp);
      if (nfpBody) nfpIaHeightRo.observe(nfpBody);
      const ingred = sp.querySelector('.nfp-sp-ingred');
      if (ingred) nfpIaHeightRo.observe(ingred);
    }
    requestAnimationFrame(() => { sizeIngredEdit(); syncIngredColHeight(); });
  }

  function renderNFP() {
    if (!nfpBody) return;
    if (state.nfpCompare) {
      /* Compare takes precedence over the single/double-pane layout: the whole
         body becomes the side-by-side matrix of every format. */
      nfpBody.innerHTML = compareHTML();
      syncNfpHeaderPhoto();
      updateSaveState();
      return;
    }
    if (state.nfpWide) {
      /* Double-pane: LEFT = category + Nutrition Facts + allergens/contains +
         ingredients; RIGHT = the product photo column with the gallery + UPC
         overlaid on it. */
      nfpBody.innerHTML =
        `<div class="nfp-cols">
          <div class="nfp-col-left">${categoryHTML()}${nutritionHTML()}${allergensHTML()}${ingredientsHTML()}${packFormatsHTML()}${packNfSectionHTML()}${insightsHTML()}</div>
          <div class="nfp-col-right">${rightColumnHTML()}</div>
        </div>`;
    } else {
      /* Single-pane: three columns once the module is wide enough —
         photo, Nutrition Facts, ingredients — with drag-resize splitters
         between them. Narrow widths stack into a single column. Driven by
         the .nfp-sp container query so it tracks the MODULE's width. */
      const strip = imagesAndPacksHTML();
      let media, facts;
      if (state.view === 'pack' && state.packs.length) {
        const i = Math.min(state.activePack, state.packs.length - 1);
        media = packHeroHTML(i);
        facts = packNfSectionHTML();
      } else {
        media = richHeroHTML();
        facts = nutritionHTML();
      }
      if (useHeaderIdentity()) {
        nfpBody.innerHTML =
          `<div class="nfp-sp nfp-sp--noidentity">
            <div class="nfp-sp-strip">${strip}</div>
            <div class="nfp-sp-shield">${shieldHTML()}</div>
            <div class="nfp-sp-facts">${facts}${allergensHTML()}</div>
            <div class="nfp-sp-split" data-nfp-split="0" role="separator" aria-orientation="vertical" aria-label="Resize Nutrition Facts and ingredients" tabindex="0"><span class="nfp-sp-grip" aria-hidden="true"></span></div>
            <div class="nfp-sp-ingred">${ingredientsHTML()}</div>
          </div><div class="nfp-ins">${insightsGridHTML()}</div>`;
      } else {
        nfpBody.innerHTML =
          `<div class="nfp-sp">
            <div class="nfp-sp-strip">${strip}</div>
            <div class="nfp-sp-media">${media}${shieldHTML()}</div>
            <div class="nfp-sp-split" data-nfp-split="0" role="separator" aria-orientation="vertical" aria-label="Resize photo and Nutrition Facts" tabindex="0"><span class="nfp-sp-grip" aria-hidden="true"></span></div>
            <div class="nfp-sp-facts">${facts}${allergensHTML()}</div>
            <div class="nfp-sp-split" data-nfp-split="1" role="separator" aria-orientation="vertical" aria-label="Resize Nutrition Facts and ingredients" tabindex="0"><span class="nfp-sp-grip" aria-hidden="true"></span></div>
            <div class="nfp-sp-ingred">${ingredientsHTML()}</div>
          </div>${insightsCardsHTML()}`;
      }
      wireNfpColumns();
      wireIngredColHeight();
      requestAnimationFrame(sizeIngredEdit);
    }
    syncNfpHeaderPhoto();
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
    /* Re-apply the module's width tier after each re-render (the innerHTML wipe
       drops the width classes when collapsed and restores them when expanded). */
    applyProgressWidth();
    /* The fill is recreated at its target width on every render, so kick it
       from the previous pct (0 on first paint) to animate the bar. */
    const fill = progressEl.querySelector('.vfp-progress-fill');
    if (fill) {
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) {
        fill.style.width = pct + '%';
      } else {
        fill.style.width = lastProgressPct + '%';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => { fill.style.width = pct + '%'; });
        });
      }
      lastProgressPct = pct;
    }
    syncProgressResizeLock();
  }

  /* Lock the progress pane out of js/pane-resize.js only while it is the
     collapsed 64px rail — a pinned drag width would out-specify that rail.
     While expanded, the Product Details right edge must stay freely
     draggable, so the lock comes off. */
  function syncProgressResizeLock() {
    if (!progressEl) return;
    if (progressMin) {
      progressEl.setAttribute('data-pr-lock', '');
      try { window.WisePaneResize && window.WisePaneResize.release(progressEl); } catch (_) {}
    } else {
      progressEl.removeAttribute('data-pr-lock');
    }
  }

  /* ── Progress module width changer (in the ⋯ menu) ──────────────────────
     A four-tier width control (single / double / triple / fill) lives in the
     module's three-dot menu rather than a header button — the collapsed rail is
     too narrow for one. The control is hidden while the module is collapsed. */
  const AP_PW_ICONS = ['width_normal', 'width_wide', 'width_full', 'width_full'];
  const AP_PW_LABELS = ['Single width', 'Double width', 'Triple width', 'Fill width'];
  let progressWidthTier = 0;
  try {
    const v = parseInt(localStorage.getItem('wise-ap-progress-width') || '0', 10);
    if (isFinite(v)) progressWidthTier = Math.max(0, Math.min(3, v));
  } catch (_) {}

  function applyProgressWidth() {
    if (!progressEl) return;
    const on = !progressMin;
    progressEl.classList.toggle('panel-wide', on && progressWidthTier >= 1);
    progressEl.classList.toggle('panel-triple', on && progressWidthTier >= 2);
    progressEl.classList.toggle('panel-fill', on && progressWidthTier >= 3);
    syncProgressWidthItem();
  }

  function syncProgressWidthItem() {
    const item = document.getElementById('ap-progress-width-item');
    if (!item) return;
    /* No width changer while collapsed. */
    item.hidden = progressMin;
    /* Write-only-on-change: this runs from a MutationObserver on the module,
       and an unconditional textContent assignment replaces the text node even
       when the string is identical — a fresh childList mutation that re-fires
       the observer in an infinite microtask loop and freezes the page. */
    const ic = item.querySelector('.topbar-menu-icon');
    if (ic && ic.textContent !== AP_PW_ICONS[progressWidthTier]) ic.textContent = AP_PW_ICONS[progressWidthTier];
    const lbl = item.querySelector('.ap-pw-label');
    if (lbl && lbl.textContent !== AP_PW_LABELS[progressWidthTier]) lbl.textContent = AP_PW_LABELS[progressWidthTier];
    const title = 'Panel width — ' + AP_PW_LABELS[progressWidthTier].toLowerCase();
    if (item.title !== title) item.title = title;
  }

  /* Inject the width row into the ⋯ menu that sticky-modules.js builds for this
     module (same menu that hosts Share / Copy link / Export / Remove panel).
     renderProgress() wipes the header — and that menu — on every re-render, so a
     persistent observer re-injects the row whenever the menu reappears. */
  function installProgressWidthMenu() {
    if (!progressEl) return;
    function tryInject() {
      const pop = progressEl.querySelector('.panel-more-wrap .topbar-popover');
      if (!pop) return;
      if (pop.querySelector('#ap-progress-width-item')) { syncProgressWidthItem(); return; }
      pop.insertAdjacentHTML('afterbegin',
        '<button type="button" class="topbar-menu-item" id="ap-progress-width-item" role="menuitem">'
        + '<span class="material-symbols-outlined topbar-menu-icon">width_normal</span>'
        + '<span class="ap-pw-label">Single width</span>'
        + '</button>'
        + '<div class="topbar-menu-divider"></div>');
      const item = document.getElementById('ap-progress-width-item');
      /* Cycle the tier in place; keep the menu open so it can be cycled again. */
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        progressWidthTier = (progressWidthTier + 1) % 4;
        try { localStorage.setItem('wise-ap-progress-width', String(progressWidthTier)); } catch (_) {}
        applyProgressWidth();
      });
      syncProgressWidthItem();
    }
    tryInject();
    new MutationObserver(tryInject).observe(progressEl, { childList: true, subtree: true });
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
      packs: state.packs,
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
  /* Human label for any editable panel field path (name, category, a Nutrition
     cell, a pack's Nutrition cell, …) — used to phrase the mirrored user turn. */
  function panelFieldLabel(path) {
    if (path.startsWith('nf.')) {
      const parts = path.split('.'); // nf, key, [amt|dv]
      const base = NF_LABELS[parts[1]] || parts[1];
      return parts[2] === 'dv' ? base + ' % Daily Value' : base;
    }
    if (/^packs\.\d+\.nf\./.test(path)) {
      const parts = path.split('.'); // packs, i, nf, key, [amt|dv]
      const base = NF_LABELS[parts[3]] || parts[3];
      const pack = state.packs[Number(parts[1])];
      const suffix = parts[4] === 'dv' ? ' % Daily Value' : '';
      return base + suffix + ' (' + ((pack && pack.label) || 'pack') + ')';
    }
    if (/^packs\.\d+\.(label|upc)$/.test(path)) {
      const parts = path.split('.'); // packs, i, [label|upc]
      const pack = state.packs[Number(parts[1])];
      const which = parts[2] === 'upc' ? 'UPC' : 'size / count';
      return which + ' (' + ((pack && pack.label) || 'pack') + ')';
    }
    const MAP = {
      productName: 'product name', category: 'category', ingredients: 'ingredient list',
      contains: 'contains statement', upc: 'UPC',
    };
    return MAP[path] || path;
  }
  /* Short value for a bot bubble (long lists like ingredients get trimmed so the
     answer stays readable — the user's own bubble keeps the full text). */
  function shortVal(value) {
    const v = String(value || '');
    return v.length > 72 ? v.slice(0, 69).trimEnd() + '…' : v;
  }
  /* Build the WISEcodeAI reply to a panel edit: confirm the value, surface any
     remaining flagged Nutrition fields, and offer the natural next move. */
  function panelEditReply(path, value, label) {
    if (!value) {
      return { html: `Cleared the <strong>${esc(label)}</strong> on the panel — done. Add a value whenever you're ready.` };
    }
    const isNf = path.startsWith('nf.') || /^packs\.\d+\.nf\./.test(path);
    const nfErrs = nfErrorCount();
    if (isNf && nfErrs > 0) {
      return {
        html: `Got it — <strong>${esc(label)}</strong> is now <strong>${esc(shortVal(value))}</strong>. ${nfErrs} nutrition field${nfErrs > 1 ? 's' : ''} still need${nfErrs > 1 ? '' : 's'} attention — I've flagged ${nfErrs > 1 ? 'them' : 'it'} in red on the panel.`,
        chips: [{ label: 'Fix flagged fields', icon: 'error_outline', action: 'focusNf' }],
      };
    }
    const missing = requiredMissing();
    if (missing.length === 0 && !nfErrs) {
      return {
        html: `Updated <strong>${esc(label)}</strong> to <strong>${esc(shortVal(value))}</strong>. That's everything required — you're ready to save this to your portfolio.`,
        chips: [{ label: 'Save to Portfolio', icon: 'inventory_2', action: 'save', primary: true }],
      };
    }
    const next = nextStep();
    const nextStepDef = STEPS.find((s) => s.id === next);
    const chips = (next && next !== 'save' && next !== state.step && nextStepDef)
      ? [{ label: 'Next: ' + nextStepDef.label, icon: 'arrow_forward', action: 'goto:' + next }]
      : undefined;
    return {
      html: `Updated <strong>${esc(label)}</strong> to <strong>${esc(shortVal(value))}</strong> on the panel — got it.`,
      chips,
    };
  }
  /* Mirror a Product Details edit into the transcript as the user's OWN turn
     (their AK bubble, as if they'd typed it), then answer it with a proper
     streamed WISEcodeAI reply — never a silent grey system note. */
  function announcePanelEdit(path, value) {
    const label = panelFieldLabel(path);
    if (value) {
      const disp = /(^|\.)upc$/.test(path) ? formatUpc(value) : value;
      addUser(`Set the ${label} to “${disp}”.`);
    } else {
      addUser(`Clear the ${label}.`);
    }
    const reply = panelEditReply(path, value, label);
    wiseSay(reply.html, reply.chips);
  }

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
    else if (/^packs\.\d+\.nf\./.test(path)) {
      const parts = path.split('.'); // packs, i, nf, key, [amt|dv]
      const i = Number(parts[1]);
      const key = parts[3];
      const pack = state.packs[i];
      if (pack) {
        if (!pack.nf) pack.nf = cloneNf(state.nf);
        if (parts.length === 5) {
          if (!pack.nf[key]) pack.nf[key] = { amt: '', dv: '' };
          pack.nf[key][parts[4]] = value;
        } else {
          pack.nf[key] = value;
          /* Keep the legacy summary fields (used to seed / caption) in sync. */
          if (key === 'servingSize') pack.servingSize = value;
          if (key === 'servingsPer') pack.servingsPer = value;
          if (key === 'calories') pack.calories = value;
        }
        label = (NF_LABELS[key] || key) + ' · ' + (pack.label || 'pack');
      }
      delete state.errors['packs.' + i + '.nf.' + key];
    }
    else if (/^packs\.\d+\.(label|upc)$/.test(path)) {
      const parts = path.split('.'); // packs, i, [label|upc]
      const i = Number(parts[1]);
      const pack = state.packs[i];
      if (pack) {
        if (parts[2] === 'upc') { pack.upc = value.replace(/[^0-9]/g, ''); label = 'Pack UPC · ' + (pack.label || 'pack'); }
        else { pack.label = value; pack.size = value; label = 'Pack size / count'; }
      }
    }
    /* A change made in the Product Details panel is a real user action — mirror
       it into the transcript as the user's own turn and answer it properly
       (streamed), exactly like a typed message. Everything else keeps the quiet
       system note (or stays silent when the caller already added the turn). */
    if (opts.fromPanel && label) {
      announcePanelEdit(path, value);
    } else if (opts.silent !== true && label) {
      addSysNote(`${label} ${value ? 'set to “' + value + '”' : 'cleared'}.`, 'edit');
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
        promptCategory('What <strong>category</strong> does this product belong to? Pick one below or type your own.');
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
        promptUpc();
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

  /* Category prompt: offers the taxonomy's top categories as one-tap chips (the
     same list the panel's dropdown carries) plus a "type my own" escape hatch,
     so category options show up in BOTH the chat and the panel. */
  function promptCategory(lead) {
    state.awaiting = null;
    const chips = CATEGORIES.slice(0, 6).map((c) => ({ label: c, icon: 'sell', action: 'setCat', arg: c }));
    chips.push({ label: 'Type my own', icon: 'edit', action: 'field:category' });
    addWISEcodeAI(lead || 'What <strong>category</strong> does this product belong to? Pick one below or type your own.', chips);
  }

  /* UPC-specific prompt: TYPING is the primary path — the chat input is armed
     (state.awaiting = 'upc') and focused so the next thing typed is captured as
     the UPC number. Scanning a barcode photo and skipping are secondary chips,
     so nobody is funnelled into an image upload when they just want to key in a
     number. */
  function promptUpc() {
    state.awaiting = 'upc';
    addWISEcodeAI('What\u2019s the <strong>UPC / barcode number</strong>? Type the 12 digits right here in the chat and I\u2019ll build a clean barcode on the panel. No number handy? Scan a barcode photo or skip for now.',
      [
        { label: 'Scan barcode photo', icon: 'qr_code_scanner', action: 'scanUpc' },
        { label: 'No UPC — skip', icon: 'skip_next', action: 'skip:upc' },
      ]);
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
        packSize: 'Type the pack size / count (e.g. 12-pack)…',
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
      } else if (ctx === 'pack') {
        const p = state.packs[state.activePack];
        if (p) p.image = src;
        addUserImage(src, file.name);
        renderNFP(); renderProgress();
        wiseSay('Added that photo to the <strong>' + esc((p && p.label) || 'pack') + '</strong> format.',
          [{ label: 'Done with packs', icon: 'check', action: 'packsDone', primary: true }]);
      } else if (ctx === 'packUpc') {
        scanPackUpcFromImage(src, file.name);
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
        applyMainPhoto(src, file.name);
      }
    };
    reader.readAsDataURL(file);
  }

  /* Commit a chosen image (data URL from an upload, or a pasted remote URL) as
     the primary product photo — shared by the file picker and the photo modal.
     Any previous primary is kept as an extra gallery image. */
  function applyMainPhoto(src, name) {
    if (!src) return;
    if (state.image) state.images.unshift({ src: state.image, label: 'Photo ' + (state.images.length + 1) });
    state.image = src;
    addUserImage(src, name || 'Product photo');
    renderNFP(); renderProgress();
    wiseSay('Nice — that\'s the primary photo. ' + (state.productName ? '' : 'What\'s the product called?'),
      state.productName ? undefined : [{ label: 'Type the name', icon: 'edit', action: 'field:productName' }]);
    if (state.productName) maybeAdvanceAfter();
  }

  /* ─── Product-photo modal ───────────────────────────────────────────────
     The main "Add a product photo" affordance opens a centered panel (the same
     one the overview hero uses — dash-modal styling from wise.css) that offers
     drag/drop or file upload AND a paste-a-URL field, rather than jumping
     straight to the OS file dialog. On save the choice becomes the primary. */
  let photoModalEls = null;
  function ensurePhotoModal() {
    if (photoModalEls) return photoModalEls;
    const scrim = document.createElement('div');
    scrim.className = 'dash-modal-scrim';
    const modal = document.createElement('div');
    modal.className = 'dash-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    scrim.appendChild(modal);
    document.body.appendChild(scrim);
    scrim.addEventListener('click', (e) => { if (e.target === scrim) closePhotoModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePhotoModal(); });
    photoModalEls = { scrim, modal };
    return photoModalEls;
  }
  function closePhotoModal() {
    if (photoModalEls) photoModalEls.scrim.classList.remove('is-open');
  }
  function openPhotoModal(packIdx) {
    const { scrim, modal } = ensurePhotoModal();
    const isPack = packIdx != null && !isNaN(packIdx);
    const pack = isPack ? state.packs[packIdx] : null;
    const replacing = isPack ? !!(pack && pack.image) : !!state.image;
    const title = replacing ? 'Replace product photo' : 'Add a product photo';
    modal.setAttribute('aria-label', title);
    let draft = '';      // data URL (upload) or remote URL (pasted)
    let draftName = '';  // file name carried into the transcript chip

    modal.innerHTML = `
      <header class="dash-modal-head">
        <div class="dash-modal-titles">
          <span class="dash-modal-eyebrow">Product photo</span>
          <h2 class="dash-modal-title">${esc(title)}</h2>
        </div>
        <button class="dash-modal-close" type="button" data-photo-close aria-label="Close"><span class="material-symbols-outlined">close</span></button>
      </header>
      <div class="dash-modal-body">
        <div class="dash-banner-preview">
          <div class="dash-banner-preview-img" id="ap-photo-preview-img"></div>
          <span class="dash-banner-preview-empty" id="ap-photo-preview-empty"><span class="material-symbols-outlined">image</span>No photo yet</span>
        </div>
        <label class="dash-banner-drop" id="ap-photo-drop">
          <input type="file" accept="image/*" id="ap-photo-file" hidden>
          <span class="material-symbols-outlined">cloud_upload</span>
          <span class="dash-banner-drop-text"><strong>Upload an image</strong> or drag &amp; drop<br><span class="dash-banner-drop-hint">PNG, JPG or WEBP</span></span>
        </label>
        <div class="dash-banner-or"><span>or paste a URL</span></div>
        <input type="url" class="dash-banner-url" id="ap-photo-url" placeholder="https://…/product.jpg" autocomplete="off">
      </div>
      <footer class="dash-modal-foot">
        <span></span>
        <div class="dash-modal-foot-right">
          <button class="dash-btn dash-btn--ghost" type="button" data-photo-close>Cancel</button>
          <button class="dash-btn dash-btn--primary" type="button" data-photo-save disabled><span class="material-symbols-outlined">check</span>${replacing ? 'Replace photo' : 'Add photo'}</button>
        </div>
      </footer>`;

    const previewImg = modal.querySelector('#ap-photo-preview-img');
    const previewEmpty = modal.querySelector('#ap-photo-preview-empty');
    const urlInput = modal.querySelector('#ap-photo-url');
    const fileInputEl = modal.querySelector('#ap-photo-file');
    const drop = modal.querySelector('#ap-photo-drop');
    const saveBtn = modal.querySelector('[data-photo-save]');

    const setPreview = (val, name) => {
      draft = val || '';
      if (name != null) draftName = name;
      if (draft) {
        previewImg.style.backgroundImage = `url('${String(draft).replace(/'/g, '%27')}')`;
        previewImg.style.display = 'block';
        previewEmpty.style.display = 'none';
      } else {
        previewImg.style.backgroundImage = '';
        previewImg.style.display = 'none';
        previewEmpty.style.display = '';
      }
      saveBtn.disabled = !draft;
    };

    urlInput.addEventListener('input', () => setPreview(urlInput.value.trim(), 'Product photo'));

    const readFile = (file) => {
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => { urlInput.value = ''; setPreview(reader.result, file.name); };
      reader.readAsDataURL(file);
    };
    fileInputEl.addEventListener('change', () => readFile(fileInputEl.files[0]));
    ['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-drag'); }));
    ['dragleave', 'dragend'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('is-drag')));
    drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('is-drag'); readFile(e.dataTransfer.files[0]); });

    saveBtn.addEventListener('click', () => {
      if (!draft) return;
      const src = draft, name = draftName;
      closePhotoModal();
      if (isPack) applyPackPhoto(packIdx, src, name);
      else applyMainPhoto(src, name);
    });
    modal.querySelectorAll('[data-photo-close]').forEach((b) => b.addEventListener('click', closePhotoModal));

    const current = isPack ? ((pack && pack.image) || '') : (state.image || '');
    if (current) {
      setPreview(current, '');
      saveBtn.disabled = true;
    } else {
      setPreview('', '');
      previewImg.style.backgroundImage = `url('${DEFAULT_PRODUCT_IMAGE.replace(/'/g, '%27')}')`;
      previewImg.style.display = 'block';
      previewEmpty.style.display = 'none';
    }
    requestAnimationFrame(() => { scrim.classList.add('is-open'); urlInput.focus(); });
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

  /* ─────────────────────────── pack / size formats ─────────────────────────── */
  /* Adding a size is the same flow as adding a product — one shows up right
     away (under Product sizes), then it captures its own photo, UPC and
     Nutrition Facts. Only the size-level values differ (e.g. servings per
     container), so a new size is seeded from the base product and adjusted. */
  function createPack() {
    /* Seed the pack's Nutrition Facts nutrient rows from the base product, but
       DON'T assume the pack's size, count or label — the user specifies those.
       Servings-per-container is a pack-level count, so it's left blank to fill
       too (never guessed from the pack index). */
    const nf = cloneNf(state.nf);
    nf.servingsPer = '';
    const pack = {
      label: '',
      size: '',
      image: state.image || null,
      upc: '',
      servingSize: nf.servingSize,
      servingsPer: '',
      calories: nf.calories,
      nf,
    };
    state.packs.push(pack);
    state.activePack = state.packs.length - 1;
    state.view = 'pack';
    renderNFP(); renderProgress();
    return pack;
  }
  function startAddPack() {
    addUser('Add a pack format');
    createPack();
    /* The pack has no assumed size/count — ask for it FIRST and capture the next
       typed message as the pack's size. Streamed like every other answer. */
    state.awaiting = 'packSize';
    if (inputEl) inputEl.placeholder = 'Type the pack size / count (e.g. 12-pack, 12 oz)…';
    wiseSay(`Added a new size under <strong>Product sizes</strong>. First — what <strong>size or count</strong> is this quantity? Type it in (e.g. <strong>12-pack</strong>, <strong>6 × 14 oz</strong>, or <strong>1 muffin (57g)</strong>). I don't set that by default. Its Nutrition Facts are seeded from the base product, so you'll only adjust the size-level values afterward.`,
      [
        { label: 'Upload pack photo', icon: 'add_photo_alternate', action: 'packPhoto' },
        { label: 'Scan pack UPC', icon: 'qr_code_scanner', action: 'packUpc' },
      ]);
    if (inputEl) setTimeout(() => inputEl.focus(), 60);
  }

  /* Scroll the (just-added or selected) pack's Nutrition Facts panel into view
     and drop the caret in its first field so it can be filled out in-page. */
  function focusPackNf() {
    if (!state.packs.length) { startAddPack(); return; }
    state.view = 'pack';
    renderNFP();
    const sec = nfpBody.querySelector('#pack-nf');
    if (sec) {
      sec.scrollIntoView({ block: 'center', behavior: 'smooth' });
      const first = sec.querySelector('[data-field]');
      if (first) setTimeout(() => placeCaret(first), 320);
    }
    const p = state.packs[Math.min(state.activePack, state.packs.length - 1)];
    addWISEcodeAI(`Fill in the <strong>Nutrition Facts</strong> for the <strong>${esc((p && p.label) || 'pack')}</strong> format on the right — I seeded it from the base product, so just adjust the pack-level values (like <strong>servings per container</strong>). Every field saves as you type.`,
      [
        { label: 'Add another pack', icon: 'add', action: 'addPack' },
        { label: 'Done with packs', icon: 'check', action: 'packsDone', primary: true },
      ]);
  }
  function scanPackUpcFromImage(src, name) {
    addUserImage(src, name);
    const t = showTyping();
    setTimeout(() => {
      t.remove();
      const digits = extractUpcDigits();
      const p = state.packs[state.activePack];
      if (p) p.upc = digits;
      renderNFP(); renderProgress();
      addWISEcodeAI(`Scanned the pack barcode — UPC <strong>${esc(formatUpc(digits))}</strong> is set on the <strong>${esc((p && p.label) || 'pack')}</strong> format.`,
        [{ label: 'Done with packs', icon: 'check', action: 'packsDone', primary: true }]);
    }, 900);
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
      case 'mainUpload': openPhotoModal(); break;
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
      case 'addPack': startAddPack(); break;
      case 'packPhoto': addUser('Upload a pack photo'); openPicker('pack'); break;
      case 'packUpc': addUser('Scan the pack barcode'); openPicker('packUpc'); break;
      case 'packSize': addUser('Set the size / count'); promptFor('packSize', 'What size or count is this pack? (e.g. 12-pack, 12 oz)'); break;
      case 'packNf': addUser('Fill the pack Nutrition Facts'); focusPackNf(); break;
      case 'packsDone': addUser('Done with pack formats'); addSysNote('Pack formats saved.', 'inventory_2'); break;
      case 'askHelp': startWhatCanIAsk(); break;
      case 'save': doSave(); break;
      case 'restart': restart(); break;
      case 'exit': window.location.href = 'product-portfolio.html'; break;
      case 'ia-review': reviewIaMappings(); break;
      case 'ia-analyze': runIngredientAnalysis(true); break;
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
      if (el.matches && el.matches('textarea, input')) {
        const n = el.value.length;
        el.setSelectionRange(n, n);
        return;
      }
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
    if (awaiting === 'packSize') {
      addUser(v);
      const p = state.packs[state.activePack];
      if (p) { p.size = v; p.label = v; }
      renderNFP(); renderProgress();
      wiseSay(`Set this pack to <strong>${esc(v)}</strong>. Now add its photo and UPC, or fill its pack-level Nutrition Facts — the nutrient rows are seeded from the base product, so you only adjust what differs (like <strong>servings per container</strong>).`,
        [
          { label: 'Upload pack photo', icon: 'add_photo_alternate', action: 'packPhoto' },
          { label: 'Scan pack UPC', icon: 'qr_code_scanner', action: 'packUpc' },
          { label: 'Fill Nutrition Facts', icon: 'nutrition', action: 'packNf' },
          { label: 'Add another pack', icon: 'add', action: 'addPack' },
          { label: 'Done with packs', icon: 'check', action: 'packsDone', primary: true },
        ]);
      return;
    }
    if (awaiting === 'allergens') {
      addUser(v);
      v.split(/[,;]+/).map((s) => s.trim()).filter(Boolean).forEach(addAllergen);
      addSysNote('Allergens updated.', 'edit');
      maybeAdvanceAfter();
      return;
    }
    if (awaiting === 'upc') {
      addUser(v);
      const digits = v.replace(/[^0-9]/g, '');
      if (digits.length < 8) {
        state.awaiting = 'upc';
        wiseSay('That doesn\u2019t look like a full <strong>UPC</strong> yet — a UPC-A is 12 digits (EAN-13 is 13). Type the number again, or scan a barcode photo instead.',
          [
            { label: 'Scan barcode photo', icon: 'qr_code_scanner', action: 'scanUpc' },
            { label: 'No UPC — skip', icon: 'skip_next', action: 'skip:upc' },
          ]);
        if (inputEl) { inputEl.placeholder = 'Type the 12-digit UPC…'; inputEl.focus(); }
        return;
      }
      commitField('upc', v, { silent: true });
      addSysNote('UPC captured.', 'edit');
      wiseSay('Got it — I rendered a clean barcode for <strong>' + esc(formatUpc(digits)) + '</strong> on the panel.');
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
      wiseSay('No problem. This flow collects, in order: a <strong>photo</strong>, <strong>category</strong>, a <strong>UPC</strong>, <strong>Nutrition Facts</strong>, <strong>ingredients</strong>, and <strong>allergens</strong>. You can upload a label and I\'ll read most of it at once, edit anything live in <strong>Product Details</strong>, and nothing saves until you press <strong>Save to Portfolio</strong>. Where do you want to start?',
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

  /* "What can I ask?" — the standing gold affordance (below-input link + welcome
     chip). Opens the in-chat side panel (break-out-able as a sticky module) AND
     starts a real chat turn enumerating what THIS surface can do, the same way
     the shared mount's askHelpReplyHtml() does on every other page. */
  function ensureAskPanel() {
    if (window.__wiseChatAsk) return window.__wiseChatAsk;
    if (!window.WiseChatAsk) return null;
    window.__wiseChatAsk = window.WiseChatAsk.mount({
      host: document.querySelector('.ap-chat-body'),
      container: '#modules-row',
      anchor: document.querySelector('.ap-chat'),
      label: 'What can I ask?',
      inputEl: inputEl,
      /* Shared rich catalog — identical to wiseai.html's panel (single source
         of truth in js/ask-catalog.js), so every chat surface stays in sync. */
      catalog: (typeof window !== 'undefined' ? window.WISE_ASK_CATALOG : null),
      onAsk: (text, intent) => {
        if (intent) dispatch(intent);
        else { addUser(text); interpret(text); }
      },
    });
    return window.__wiseChatAsk;
  }
  function startWhatCanIAsk() {
    try { ensureAskPanel()?.open(); } catch (_) {}
    addUser('What can I ask?');
    wiseSay(
      'You\'re on <strong>Add Product</strong>, so everything here drives one product build. Here\'s what you can ask or do:'
      + '<ul class="sc-askhelp-list">'
      + '<li><strong>Upload a label</strong> — attach a photo of the package and I\'ll read the name, ingredients, Nutrition Facts, allergens and UPC in one pass.</li>'
      + '<li><strong>Paste a URL</strong> — a product or retailer page works too; I\'ll pull in everything I can from it.</li>'
      + '<li><strong>Type any value</strong> — the product name, a 12-digit UPC, or a field like \u201cSodium is 135mg\u201d lands straight on the panel.</li>'
      + '<li><strong>Go step by step</strong> — I\'ll prompt for each field in order: photo, category, UPC, Nutrition Facts, ingredients, allergens.</li>'
      + '<li><strong>Edit on the panel</strong> — click any field in Product Details to change it; the chat keeps up.</li>'
      + '<li><strong>Say \u201csave\u201d</strong> — when it looks right, I\'ll save the draft to your portfolio.</li>'
      + '</ul>Nothing is stored until you press <strong>Save to Portfolio</strong>.',
      [
        { label: 'Upload a label', icon: 'document_scanner', action: 'labelUpload' },
        { label: 'Paste a URL', icon: 'link', action: 'url' },
        { label: 'Go step by step', icon: 'list', action: 'manual' },
      ]);
  }

  /* ─────────────────────────── entry points ─────────────────────────── */
  function beginManual() {
    addUser('Enter details manually');
    wiseSay('Great — we\'ll go step by step. You can jump around using the progress list on the right anytime.', undefined, 380);
    setTimeout(() => promptStep('photo'), 900);
  }
  /* Seed the sample product's additional quantities for the Product sizes
     section. The default single unit is the base product itself, so these are
     just the larger multipacks it also ships in (Flax4Life Chocolate Chip
     Muffin lineup). */
  function seedSamplePacks() {
    state.packs = [
      { label: '4 ct', size: '4-count box', image: state.image, upc: '065776631520', servingSize: state.nf.servingSize || '1 muffin (57g)', servingsPer: '4', calories: state.nf.calories || '190' },
      { label: '6 ct', size: '6-count box', image: state.image, upc: '461272475918', servingSize: state.nf.servingSize || '1 muffin (57g)', servingsPer: '6', calories: state.nf.calories || '190' },
    ];
    state.view = 'product';
    state.activePack = 0;
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
    seedSamplePacks();
    state.iaRan = true;
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
    seedSamplePacks();
    state.iaRan = true;
    /* Deep-link ?compare=1 — open the side-by-side matrix of every format
       (base product + each pack) for screenshots / portfolio review. */
    if (params.get('compare') === '1') {
      state.nfpCompare = true;
      progressWidthTier = 2;
      try { localStorage.setItem('wise-ap-progress-width', '2'); } catch (_) {}
      applyProgressWidth();
    }
    hideWelcome();
    renderNFP(); renderProgress();
    // Deep-linked from the portfolio's ⋮ menu → "Add pack formats / sizes":
    // open the product and drop straight into the add-a-pack flow, with the
    // Pack Formats section scrolled into view.
    if (params.get('packs') === '1' || params.get('focus') === 'packs') {
      const tag = document.querySelector('.ap-topbar-tag');
      if (tag && tag.firstChild && tag.firstChild.nodeType === 3) {
        tag.firstChild.textContent = 'Product sizes · ';
      }
      addWISEcodeAI(`Let\u2019s add another size for <strong>${esc(state.productName)}</strong>. Its current sizes are listed under <strong>Product sizes</strong> on the right — starting with a single unit, add each additional multipack or larger quantity it ships in.`);
      startAddPack();
      setTimeout(() => {
        document.querySelector('.nfp-fi-group--packs')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
      return;
    }
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
      packs: [], activePack: 0, view: 'product',
      category: '', ingredients: '', allergens: [], contains: '', upc: '',
      nf: blankNf(), errors: {}, done: {}, skipped: {}, awaiting: null, saved: false,
      iaRan: false, iaTick: 0, iaConfirm: {},
      iaOpen: { list: true, parsed: true, codes: true, nutrients: true, scout: true },
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
    { label: 'This comes in multiple sizes / packs', icon: 'inventory_2', action: 'addPack' },
    { label: 'Show me an example', icon: 'auto_awesome', action: 'sample' },
  ];

  /* Below-input meta row — wires the two canonical affordances the page's
     markup docks under the composer (mirroring what mountWISEcodeAIChat builds
     on every shared-mount surface):
       • the gold "What can I ask?" link (left) — shimmer letters, left edge
         aligned to the composer's placeholder text, click starts the ask turn;
       • the live-activity dots (center) — pulse while a typing line is on
         screen and, on hover, show a believable per-turn telemetry read-out. */
  function wireBelowInput() {
    const askBtn = $('ap-ask-help');
    if (askBtn) {
      askBtn.innerHTML = `<span aria-hidden="true">${shimmerLetters('What can I ask?')}</span>`;
      askBtn.addEventListener('click', (e) => { e.stopPropagation(); startWhatCanIAsk(); });
      /* Keep the label's text left-aligned with the input's placeholder text —
         measured at runtime since the "+" button / input padding shift with
         layout (same as alignAskHelp in js/wiseai-chat.js). */
      const row = askBtn.closest('.sc-belowinput');
      const align = () => {
        if (!inputEl || !row) return;
        const inRect = inputEl.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();
        if (!inRect.width || !rowRect.width) return;
        const inPadL = parseFloat(getComputedStyle(inputEl).paddingLeft) || 0;
        const btnPadL = parseFloat(getComputedStyle(askBtn).paddingLeft) || 0;
        askBtn.style.margin = '7px 0 1px';
        askBtn.style.marginLeft = `${Math.max(0, Math.round((inRect.left + inPadL) - rowRect.left - btnPadL))}px`;
      };
      align();
      setTimeout(align, 200);
      window.addEventListener('resize', align);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(align).catch(() => {});
    }

    const activityEl = $('ap-activity');
    const actTurnEl = $('ap-activity-turn');
    const actConvEl = $('ap-activity-conv');
    if (!activityEl || !messagesEl) return;
    const telemetry = { turns: 0, ops: 0, tools: 0, tokIn: 0, tokOut: 0, cached: 0, cost: 0, turnStart: 0, last: null };
    const fmtTok = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(Math.round(n)));
    const fmtDur = (ms) => { const s = Math.max(1, Math.round(ms / 1000)); return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`; };
    function renderActivity() {
      if (telemetry.last) {
        const t = telemetry.last;
        const pct = t.tokIn ? Math.round((t.cached / t.tokIn) * 100) : 0;
        if (actTurnEl) actTurnEl.innerHTML =
          `${fmtTok(t.tokIn)} in / ${fmtTok(t.tokOut)} out · <em>${fmtTok(t.cached)} cached (${pct}%)</em> · `
          + `<b>$${t.cost.toFixed(4)}</b> · ${fmtDur(t.dur)} · ${t.ops} ops · ${t.tools} tools`;
      } else if (actTurnEl) {
        actTurnEl.innerHTML = 'Idle — <span class="sc-activity-muted">nothing running</span>';
      }
      if (actConvEl) {
        if (telemetry.turns === 0) { actConvEl.innerHTML = 'No turns yet'; }
        else {
          const pct = telemetry.tokIn ? Math.round((telemetry.cached / telemetry.tokIn) * 100) : 0;
          actConvEl.innerHTML =
            `${fmtTok(telemetry.tokIn)} in / ${fmtTok(telemetry.tokOut)} out · <em>${fmtTok(telemetry.cached)} cached (${pct}%)</em> · `
            + `<b>$${telemetry.cost.toFixed(2)}</b> · ${telemetry.turns} turn${telemetry.turns === 1 ? '' : 's'}`;
        }
      }
    }
    /* Fold a finished turn into the running totals — synthesized (with jitter)
       so the read-out reads like a real meter, same as the shared mount. */
    function accrueTurn() {
      const rnd = (a, b) => a + Math.random() * (b - a);
      const tokIn = Math.round(rnd(6000, 22000));
      const tokOut = Math.round(rnd(400, 2600));
      const cached = Math.round(tokIn * rnd(0.7, 0.9));
      const cost = +(tokIn / 1e6 * 0.9 + tokOut / 1e6 * 4.5).toFixed(4);
      const dur = telemetry.turnStart ? (Date.now() - telemetry.turnStart) : Math.round(rnd(2000, 9000));
      telemetry.turns += 1;
      telemetry.tokIn += tokIn; telemetry.tokOut += tokOut; telemetry.cached += cached; telemetry.cost += cost;
      const ops = Math.round(rnd(1, 4)); const tools = Math.round(rnd(0, 3));
      telemetry.ops += ops; telemetry.tools += tools;
      telemetry.last = { tokIn, tokOut, cached, cost, ops, tools, dur };
      renderActivity();
    }
    /* Watch the transcript for a typing line and mirror it onto the dots —
       decoupled from every showTyping call site. */
    const observer = new MutationObserver(() => {
      const typing = !!messagesEl.querySelector('.sc-line-typing');
      activityEl.classList.toggle('is-thinking', typing);
      if (typing && !telemetry.turnStart) telemetry.turnStart = Date.now();
      if (!typing && telemetry.turnStart) { accrueTurn(); telemetry.turnStart = 0; }
    });
    observer.observe(messagesEl, { childList: true, subtree: true });
    renderActivity();
  }

  function init() {
    messagesEl = $('chat-messages');
    welcomeEl = $('welcome-screen');
    chipsStartEl = $('ws-chips-start');
    inputEl = $('chat-input');
    nfpBody = $('nfp-body');
    progressEl = $('ap-progress');
    fileInput = $('ap-file');
    if (!messagesEl || !nfpBody || !progressEl) return;

    /* Rail lock only — expanded progress stays in the shared splitter so the
       Product Details right edge can be grabbed. */
    syncProgressResizeLock();

    // Welcome chips. The gold "What can I ask?" chip is hidden for now; the
    // below-input gold link still opens the catalog panel.
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
    /* Add the width changer to this module's ⋯ menu (once it's built). */
    installProgressWidthMenu();

    // Chip clicks (welcome + inline reply chips)
    document.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-action]');
      if (chip && (welcomeEl?.contains(chip) || messagesEl.contains(chip))) {
        dispatch(chip.dataset.action, chip.dataset.arg);
        return;
      }
      // NFP panel affordances
      const nfpBtn = e.target.closest('[data-nfp]');
      const nfpPanel = document.getElementById('nfp-panel');
      if (nfpBtn && nfpPanel && nfpPanel.contains(nfpBtn)) { handleNfpClick(nfpBtn.dataset.nfp, nfpBtn.dataset.arg); return; }
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
      const val = (ed.matches('textarea, input:not([data-nfp-upc-cell])') ? ed.value : ed.textContent).trim();
      const ph = ed.dataset.ph || '';
      if (val === ph) return; // untouched placeholder
      const current = getPath(path);
      if (!val && !current) { renderNFP(); return; } // empty stayed empty — just restore placeholder
      const cur = String(current == null ? '' : current);
      /* UPC is shown grouped (e.g. "8 53620 00627 9") but stored as raw digits —
         compare digits-only so re-formatting an untouched value isn't seen as an edit. */
      if (path === 'upc' ? val.replace(/\D/g, '') === cur : val === cur) return; // unchanged
      /* Nutrition cells update in place (keeps caret while fixing flagged rows);
         other fields (name, UPC, ingredients, contains) rebuild the card. */
      commitField(path, val, { fromPanel: true, inPlace: path.startsWith('nf.') || /^packs\.\d+\.nf\./.test(path) });
    });
    /* Segmented UPC entry (product + pack) — one digit per box, auto-advancing
       to the next box and auto-committing once all 12 are filled. */
    nfpBody.addEventListener('input', (e) => {
      const ing = e.target.closest('textarea[data-field="ingredients"]');
      if (ing) {
        sizeIngredEdit(ing);
        const btn = nfpBody.querySelector('.nfp-ia-analyze');
        if (btn) btn.disabled = !ing.value.trim();
        return;
      }
      const cell = e.target.closest('[data-nfp-upc-cell]');
      if (!cell) return;
      handleUpcCellInput(cell);
    });
    /* Pasting a full number into any box distributes it across the boxes. */
    nfpBody.addEventListener('paste', (e) => {
      const cell = e.target.closest('[data-nfp-upc-cell]');
      if (!cell) return;
      const raw = (e.clipboardData || window.clipboardData).getData('text') || '';
      const digits = raw.replace(/\D/g, '');
      if (!digits) return;
      e.preventDefault();
      fillUpcCellsFrom(cell, digits);
    });
    nfpBody.addEventListener('keydown', (e) => {
      /* Inline empty-hero URL box — apply the pasted image URL on Enter. */
      const urlInp = e.target.closest('[data-nfp-photo-url]');
      if (urlInp) { if (e.key === 'Enter') { e.preventDefault(); applyMainPhotoUrl(urlInp.value); } return; }
      const packUrlInp = e.target.closest('[data-nfp-pack-photo-url]');
      if (packUrlInp) { if (e.key === 'Enter') { e.preventDefault(); applyPackPhotoUrl(Number(packUrlInp.dataset.arg), packUrlInp.value); } return; }
      const upcCell = e.target.closest('[data-nfp-upc-cell]');
      if (upcCell) {
        const entry = upcCell.closest('[data-nfp-upc-entry]');
        const cells = upcCellsOf(entry);
        const i = cells.indexOf(upcCell);
        if (e.key === 'Backspace' && !upcCell.value && i > 0) { e.preventDefault(); cells[i - 1].value = ''; cells[i - 1].focus(); return; }
        if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); cells[i - 1].focus(); return; }
        if (e.key === 'ArrowRight' && i < cells.length - 1) { e.preventDefault(); cells[i + 1].focus(); return; }
        if (e.key === 'Enter') { e.preventDefault(); commitUpcCells(entry); return; }
        return;
      }
      const ed = e.target.closest('[data-field]');
      if (!ed) return;
      if (e.key === 'Enter') {
        if (ed.matches('textarea')) return;
        e.preventDefault();
        ed.blur();
      }
    });
    nfpBody.addEventListener('focusin', (e) => {
      const ed = e.target.closest('.nfp-edit-empty[data-field]');
      if (ed) { ed.textContent = ''; ed.classList.remove('nfp-edit-empty'); }
      /* A pre-filled UPC digit: select it on focus so typing replaces it in one
         keystroke (edit any single number in place). */
      const cell = e.target.closest('[data-nfp-upc-cell]');
      if (cell && cell.value) { try { cell.select(); } catch (_) {} }
    });

    // Category dropdown — commit the picked category (rebuilds the card).
    nfpBody.addEventListener('change', (e) => {
      const sel = e.target.closest('select[data-nfp-cat]');
      if (!sel) return;
      const val = sel.value;
      if (val && val !== state.category) commitField('category', val, { fromPanel: true });
    });

    /* Drag & drop an image straight onto the product-photo hero — the empty
       hero is styled as a dropzone, so honor it here (and on an existing photo,
       and the wide right column) without having to open the photo modal. In a
       pack view the hero carries an `upload-pack` control, so the drop targets
       that size's photo instead of the base product. */
    wireHeroDrop();

    // Input send
    $('ap-send')?.addEventListener('click', onSubmit);
    inputEl?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(); } });

    // Below-input meta row — the gold "What can I ask?" link + activity dots.
    wireBelowInput();
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

    // Product Details width — the canonical four-tier cycle (single → double →
    // triple → fill), identical to every other .panel-width-toggle-btn. Fill is
    // the default (right-of-chat rule). The old header control that flipped the
    // internal two-pane photo layout now lives in the ⋯ menu.
    let nfpWidthTier = 3;
    const nfpWidthBtn = $('nfp-width');
    function applyNfpWidth() {
      const panel = $('nfp-panel');
      const W = window.WPaneWidth;
      if (panel) {
        try { window.WisePaneResize && window.WisePaneResize.release && window.WisePaneResize.release([panel]); } catch (_) {}
        if (W) W.applyClasses(panel, nfpWidthTier, 'panel');
        else {
          panel.classList.toggle('panel-wide', nfpWidthTier >= 1);
          panel.classList.toggle('panel-triple', nfpWidthTier >= 2);
          panel.classList.toggle('panel-fill', nfpWidthTier >= 3);
        }
      }
      if (W) W.syncButton(nfpWidthBtn, nfpWidthTier);
      else if (nfpWidthBtn) {
        const ic = nfpWidthBtn.querySelector('.material-symbols-outlined');
        if (ic) ic.textContent = ['width_normal', 'width_wide', 'width_full', 'width_full'][nfpWidthTier];
        nfpWidthBtn.classList.toggle('is-on', nfpWidthTier >= 1);
        nfpWidthBtn.setAttribute('aria-pressed', nfpWidthTier >= 1 ? 'true' : 'false');
        nfpWidthBtn.title = ['Width (single) — tap to widen', 'Width (double) — tap to widen', 'Width (triple) — tap to widen', 'Width (fill) — tap to reset'][nfpWidthTier];
      }
    }
    nfpWidthBtn?.addEventListener('click', () => {
      const W = window.WPaneWidth;
      nfpWidthTier = W ? W.next(nfpWidthTier) : (nfpWidthTier + 1) % 4;
      applyNfpWidth();
    });
    applyNfpWidth();

    wireNfpModuleMenu();
    installNfpLayoutMenuItems();

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

  /* Apply a pasted/typed remote image URL as the product photo, straight from
     the inline empty-hero input (no modal). */
  function applyMainPhotoUrl(url) {
    url = String(url || '').trim();
    if (!url) return;
    applyMainPhoto(url, 'Product photo');
  }
  /* Segmented UPC entry helpers — the entry is a row of single-digit boxes
     grouped 1·5·5·1 (UPC-A), sitting under an empty barcode slot. */
  function upcCellsOf(entry) {
    return entry ? Array.prototype.slice.call(entry.querySelectorAll('[data-nfp-upc-cell]')) : [];
  }
  /* Keep one digit per box; advance to the next box as you type. */
  function handleUpcCellInput(cell) {
    const v = String(cell.value || '').replace(/\D/g, '');
    if (v.length > 1) { fillUpcCellsFrom(cell, v); return; }
    cell.value = v;
    const entry = cell.closest('[data-nfp-upc-entry]');
    const cells = upcCellsOf(entry);
    const i = cells.indexOf(cell);
    if (v && i < cells.length - 1) cells[i + 1].focus();
    if (cells.length && cells.every((c) => c.value)) commitUpcCells(entry);
  }
  /* Spread a string of digits across the boxes starting at `cell` (typed or
     pasted), then focus the next empty box and commit when full. */
  function fillUpcCellsFrom(cell, digits) {
    const entry = cell.closest('[data-nfp-upc-entry]');
    const cells = upcCellsOf(entry);
    let i = cells.indexOf(cell);
    for (let k = 0; k < digits.length && i < cells.length; k++, i++) cells[i].value = digits[k];
    cells[Math.min(i, cells.length - 1)].focus();
    if (cells.length && cells.every((c) => c.value)) commitUpcCells(entry);
  }
  /* Commit a UPC (12-digit UPC-A) from a segmented entry — product or a pack.
     Only fires once all 12 digits are present, then the barcode renders. */
  function commitUpcCells(entry) {
    const cells = upcCellsOf(entry);
    const digits = cells.map((c) => String(c.value || '').replace(/\D/g, '')).join('').slice(0, 12);
    if (digits.length !== 12) return;
    if (entry.hasAttribute('data-pack')) {
      const i = Number(entry.dataset.pack);
      if (!isNaN(i)) { state.view = 'pack'; state.activePack = i; commitField('packs.' + i + '.upc', digits, { fromPanel: true }); }
    } else {
      commitField('upc', digits, { fromPanel: true });
    }
  }

  /* Commit a chosen image (upload data URL or pasted URL) as a size's photo —
     shared by the size photo modal and the file picker. */
  function applyPackPhoto(i, src, name) {
    if (!src || isNaN(i)) return;
    const p = state.packs[i];
    if (!p) return;
    state.view = 'pack'; state.activePack = i;
    p.image = src;
    addUserImage(src, name || 'Size photo');
    renderNFP(); renderProgress();
    wiseSay('Added that photo to the <strong>' + esc(p.label || 'size') + '</strong> format.',
      [{ label: 'Done with sizes', icon: 'check', action: 'packsDone', primary: true }]);
  }
  /* Same, for a size's photo entered as a URL (legacy inline field). */
  function applyPackPhotoUrl(i, url) {
    applyPackPhoto(i, String(url || '').trim(), 'Size photo');
  }

  /* ── Drag & drop an image onto the product-photo hero ──────────────────
     The hero (single-pane, its empty state, or the wide right column) reads as
     a dropzone, so accept a dragged image file straight onto it. Delegated on
     nfpBody since the hero markup is re-rendered on every state change. */
  function heroDropTarget(el) {
    return el && el.closest ? el.closest('.nfp-hero, .nfp-rcol, .nfp-rcol-empty, .nfp-header-photo, .nfp-panel-header--photo') : null;
  }
  function dragHasImageFile(dt) {
    if (!dt) return false;
    const types = dt.types;
    if (!types) return false;
    return Array.prototype.indexOf.call(types, 'Files') !== -1;
  }
  function firstImageFile(dt) {
    const files = dt && dt.files;
    if (!files || !files.length) return null;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f && f.type && f.type.startsWith('image/')) return f;
    }
    return null;
  }
  function wireHeroDrop() {
    let activeHero = null;
    const host = document.getElementById('nfp-panel') || nfpBody;
    const clear = () => { if (activeHero) { activeHero.classList.remove('nfp-hero-drag'); activeHero = null; } };
    host.addEventListener('dragover', (e) => {
      const hero = heroDropTarget(e.target);
      if (!hero || !dragHasImageFile(e.dataTransfer)) return;
      e.preventDefault();
      try { e.dataTransfer.dropEffect = 'copy'; } catch (_) {}
      if (activeHero !== hero) { clear(); activeHero = hero; }
      hero.classList.add('nfp-hero-drag');
    });
    host.addEventListener('dragleave', (e) => {
      const hero = heroDropTarget(e.target);
      if (hero && !hero.contains(e.relatedTarget)) hero.classList.remove('nfp-hero-drag');
    });
    host.addEventListener('drop', (e) => {
      const hero = heroDropTarget(e.target);
      if (!hero) return;
      e.preventDefault();
      clear();
      hero.classList.remove('nfp-hero-drag');
      const file = firstImageFile(e.dataTransfer);
      if (!file) return;
      const packBtn = hero.matches && hero.matches('[data-nfp="upload-pack"]')
        ? hero
        : hero.querySelector('[data-nfp="upload-pack"]');
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result;
        if (packBtn) {
          const i = Number(packBtn.dataset.arg);
          if (!isNaN(i)) applyPackPhoto(i, src, file.name);
        } else {
          applyMainPhoto(src, file.name);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  function handleNfpClick(action, arg) {
    switch (action) {
      case 'upload-main': openPhotoModal(); break;
      /* Inline empty-hero photo field: "Upload" opens the picker (offers camera
         on device); the URL box + arrow apply a pasted image URL right away. */
      case 'photo-upload': openPicker('main', { accept: 'image/*' }); break;
      case 'photo-url-go': { const inp = nfpBody.querySelector('[data-nfp-photo-url]'); if (inp) applyMainPhotoUrl(inp.value); break; }
      case 'pack-photo-url-go': { const i = Number(arg); const inp = nfpBody.querySelector('[data-nfp-pack-photo-url]'); if (inp) applyPackPhotoUrl(i, inp.value); break; }
      case 'add-image': openPicker('photos'); break;
      case 'cat-edit': promptCategory(); break;
      case 'upc-edit': promptUpc(); break;
      case 'add-allergen': promptFor('allergens', 'Which allergens? List them comma-separated.'); break;
      case 'remove-allergen': {
        const i = Number(arg);
        if (!isNaN(i) && state.allergens[i] != null) {
          const removed = state.allergens[i];
          state.allergens.splice(i, 1);
          renderNFP(); renderProgress();
          /* Removing an allergen on the panel is a real user action — mirror it
             as their own turn and answer it, same as a typed message. */
          addUser(`Remove the ${removed} allergen.`);
          wiseSay(state.allergens.length
            ? `Removed <strong>${esc(removed)}</strong>. Still declaring: <strong>${esc(state.allergens.join(', '))}</strong>.`
            : `Removed <strong>${esc(removed)}</strong> — no allergens are declared now.`);
        }
        break;
      }
      case 'pick-image': { const i = Number(arg); if (!isNaN(i)) { state.view = 'product'; state.activeImage = i; renderNFP(); } break; }
      case 'add-pack': startAddPack(); break;
      case 'pick-pack': { const i = Number(arg); if (!isNaN(i)) { state.view = 'pack'; state.activePack = i; renderNFP(); } break; }
      case 'upload-pack': { const i = Number(arg); if (!isNaN(i)) { state.view = 'pack'; state.activePack = i; renderNFP(); openPhotoModal(i); } break; }
      case 'pack-upc-edit': { const i = Number(arg); if (!isNaN(i)) { state.view = 'pack'; state.activePack = i; } openPicker('packUpc'); break; }
      case 'ia-toggle': toggleIaSection(arg); break;
      case 'ia-analyze': runIngredientAnalysis(true); break;
      case 'ia-confirm': confirmIaRow(arg); break;
      case 'ia-confirm-all': confirmAllIaRows(); break;
      case 'ia-review': reviewIaMappings(); break;
      default: break;
    }
  }

  function toggleIaSection(id) {
    if (!id || !state.iaOpen.hasOwnProperty(id)) return;
    state.iaOpen[id] = !state.iaOpen[id];
    const sec = nfpBody && nfpBody.querySelector(`[data-ia-sec="${id}"]`);
    if (!sec) return;
    const open = !!state.iaOpen[id];
    sec.classList.toggle('is-collapsed', !open);
    const head = sec.querySelector('.nfp-ia-head');
    if (head) head.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function sizeIngredEdit(el) {
    const ta = el || (nfpBody && nfpBody.querySelector('textarea.nfp-ingred-edit'));
    if (!ta) return;
    ta.style.height = '0px';
    ta.style.height = ta.scrollHeight + 'px';
  }

  function replaceIaPanel() {
    const host = nfpBody && nfpBody.querySelector('.nfp-ia');
    if (!host) { renderNFP(); return; }
    const wrap = document.createElement('div');
    wrap.innerHTML = ingredientsHTML();
    const next = wrap.firstElementChild;
    if (next) host.replaceWith(next);
    requestAnimationFrame(() => { sizeIngredEdit(); syncIngredColHeight(); });
  }

  function flushIngredientsFromPanel() {
    const ed = nfpBody && nfpBody.querySelector('[data-field="ingredients"]');
    if (!ed) return;
    const val = (ed.matches('textarea, input') ? ed.value : ed.textContent).trim();
    if (val === (ed.dataset.ph || '')) return;
    if (val !== state.ingredients) {
      state.ingredients = val;
      delete state.errors.ingredients;
    }
  }

  function runIngredientAnalysis(fromUser) {
    flushIngredientsFromPanel();
    if (!state.ingredients) {
      if (fromUser) {
        addUser('Analyze the ingredients.');
        wiseSay('There isn\'t an ingredient list yet. Paste or type one in the <strong>Ingredient List</strong> panel, then hit Analyze.');
      }
      return;
    }
    state.iaRan = true;
    state.iaTick += 1;
    state.iaOpen.parsed = true;
    state.iaOpen.codes = true;
    state.iaOpen.nutrients = true;
    state.iaOpen.scout = true;
    replaceIaPanel();
    if (fromUser) {
      const tree = parseIngredientTree(state.ingredients);
      const flat = flattenParsed(tree);
      const ok = flat.filter((r) => iaMatchOf(r) === 'ok').length;
      addUser('Analyze the ingredients.');
      wiseSay(`Re-analyzed the list — <strong>${flat.length}</strong> ingredients parsed, <strong>${ok}</strong> matched. Codes, nutrients and Wise Code AI results updated in the ingredients column.`,
        [
          { label: 'Review mappings', icon: 'rule', action: 'ia-review' },
          { label: 'Edit ingredients', icon: 'science', action: 'field:ingredients' },
          { label: 'Save to Portfolio', icon: 'save', action: 'goto:save', primary: true },
        ]);
    }
  }

  function confirmIaRow(mapped) {
    if (!mapped) return;
    state.iaConfirm[mapped] = true;
    replaceIaPanel();
    addUser(`Confirm the ${mapped} mapping.`);
    wiseSay(`Confirmed <strong>${esc(mapped)}</strong> as matched.`);
  }

  function confirmAllIaRows() {
    flattenParsed(parseIngredientTree(state.ingredients)).forEach((r) => {
      if (iaMatchOf(r) === 'ok') state.iaConfirm[r.mapped] = true;
    });
    replaceIaPanel();
    addUser('Confirm matched ingredients.');
    wiseSay('Confirmed every currently matched mapping.');
  }

  function reviewIaMappings() {
    state.iaOpen.parsed = true;
    const sec = nfpBody && nfpBody.querySelector('[data-ia-sec="parsed"]');
    if (sec) {
      sec.classList.remove('is-collapsed');
      const head = sec.querySelector('.nfp-ia-head');
      if (head) head.setAttribute('aria-expanded', 'true');
      const first = sec.querySelector('.nfp-ia-parsed-row[data-ia-match="bad"], .nfp-ia-parsed-row[data-ia-match="part"]');
      const col = first && first.closest('.nfp-sp-ingred');
      if (first && col) {
        const cr = col.getBoundingClientRect();
        const fr = first.getBoundingClientRect();
        const next = col.scrollTop + (fr.top - cr.top) - 12;
        col.scrollTo({
          top: Math.max(0, next),
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
