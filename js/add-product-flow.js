/**
 * Add Product flow — the conversational product-builder that powers
 * pages/add-product.html.
 *
 * Three modules work as one:
 *   • Chat (left)      — WISEcodeAI walks you through collecting each field. You can
 *                        answer with intent chips, free text, or uploads. Step
 *                        progress lives in this transcript — prompts, leftover
 *                        chips, and “still needed” replies — not a side pane.
 *   • Product Details  — a live, editable Nutrition-Facts-style card (nfp-*).
 *     (NFP)              Identity, facts, allergens. Anything you edit here
 *                        echoes back into the chat.
 *   • Ingredients      — sticky drawer to the right of Product Details: the
 *     Analyzer           list, Analyze, and Parsed / Codes / Nutrients / Scout.
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
  /* "You" chip — photo from the shared store when set, else initials. */
  function youAvatarSpan() {
    try {
      if (window.WiseUserAvatar && typeof window.WiseUserAvatar.span === 'function') {
        return window.WiseUserAvatar.span('You', 'AK');
      }
      const src = localStorage.getItem('wise-user-avatar');
      if (src) {
        const safe = esc(src);
        return `<span class="sc-avatar sc-avatar-you has-avatar-img" role="img" aria-label="You" data-initials="AK"><img class="wise-avatar-img" src="${safe}" alt="You" /></span>`;
      }
    } catch (_) { /* storage / global unavailable */ }
    return '<span class="sc-avatar sc-avatar-you" role="img" aria-label="You" data-initials="AK">AK</span>';
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
    fromDiscovered: false, // opened from Product Portfolio → Discovered (Review & Claim)
    fromKey: '',          // discovered | claimed | complete | verify | add | ineligible | ''
    lifecyclePeek: null,  // dot the user clicked (preview); null = real step
    lifecycleDone: '',    // complete | verify — in-session advances past the entry banner
    brandLogo: '../assets/brand-flax4life-logo.png', // brand logo image; falls back to a monogram badge
    image: null,          // main product image (data URL or URL)
    images: [],           // additional images: {src,label}
    activeImage: 0,
    packs: [],            // size / pack formats: {label,size,image,upc,price,servingsPer,servingSize,calories}
    activePack: 0,        // highlighted pack thumbnail
    view: 'product',      // which tab the Product Images / Pack Formats strip is filtering to: 'product' (base) or 'pack' (activePack)
    unitLabel: '1 ct',    // label on the base-product size thumb (the SKU the row is named after)
    description: '',      // short product blurb under the identity headline (DESC_MAX)
    price: '',            // base-size price (packs carry their own)
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
    nfpFlip: true,        // ⋯ menu → fold the masthead into the Nutrition Facts column and swap it to the right, ingredients on the left. On by default.
    /* Ingredient analysis (third column). The list is always visible under
       the module title. Parsed / Codes / Nutrients / Scout remember
       open/closed; Analyze increments `iaTick` so row + score animations replay. */
    iaOpen: { list: true, parsed: false, codes: false, nutrients: false, scout: false },
    iaRan: false,
    iaTick: 0,
    iaConfirm: {},        // node id → true once the user confirms a row
  };

  /* FDA Big 9. Icons are Material Symbols (Google SVG via the sprite shim). */
  const ALLERGENS = [
    { name: 'Milk', icon: 'water_drop' },
    { name: 'Eggs', icon: 'egg' },
    { name: 'Fish', icon: 'restaurant' },
    { name: 'Shellfish', icon: 'ramen_dining' },
    { name: 'Tree Nuts', icon: 'nutrition' },
    { name: 'Peanuts', icon: 'grocery' },
    { name: 'Wheat', icon: 'grain' },
    { name: 'Soy', icon: 'eco' },
    { name: 'Sesame', icon: 'spa' },
  ];
  const ALLERGEN_ALIASES = {
    milk: 'Milk', dairy: 'Milk',
    egg: 'Eggs', eggs: 'Eggs',
    fish: 'Fish',
    shellfish: 'Shellfish', crustacean: 'Shellfish', crustaceans: 'Shellfish',
    shrimp: 'Shellfish', crab: 'Shellfish', lobster: 'Shellfish',
    'tree nuts': 'Tree Nuts', 'tree nut': 'Tree Nuts', treenuts: 'Tree Nuts',
    nuts: 'Tree Nuts', almond: 'Tree Nuts', walnut: 'Tree Nuts',
    peanut: 'Peanuts', peanuts: 'Peanuts',
    wheat: 'Wheat', gluten: 'Wheat',
    soy: 'Soy', soya: 'Soy', soybean: 'Soy', soybeans: 'Soy',
    sesame: 'Sesame',
  };
  function canonicalAllergenName(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    const hit = ALLERGENS.find((a) => a.name.toLowerCase() === s.toLowerCase());
    if (hit) return hit.name;
    return ALLERGEN_ALIASES[s.toLowerCase()] || s;
  }
  function allergenIcon(name) {
    const canon = canonicalAllergenName(name);
    const hit = ALLERGENS.find((a) => a.name.toLowerCase() === String(canon).toLowerCase());
    return (hit && hit.icon) || 'allergies';
  }
  function allergenIconHTML(name) {
    return `<span class="material-symbols-outlined nfp-allergen-ico" aria-hidden="true">${allergenIcon(name)}</span>`;
  }
  function allergenDeclared(name) {
    const n = String(name || '').toLowerCase();
    return state.allergens.some((a) => a.toLowerCase() === n);
  }
  function allergenIntentChips() {
    const chips = ALLERGENS.map((a) => ({ label: a.name, icon: a.icon, action: 'addAllergen', arg: a.name }));
    chips.push({ label: 'None', icon: 'block', action: 'noAllergens' });
    chips.push({ label: 'Done', icon: 'check', action: 'allergensDone', primary: true });
    return chips;
  }

  /* Demo payload used when a label photo / URL is "parsed", and as the
     filled example on View Product / “Show me an example”. The ingredient
     string is the Hungry-Man Breaded Chicken Alfredo label — nested with
     (), [], and {} — so Parsed Ingredients can show a real depth tree.
     Label-photo OCR still blanks the micronutrient row (see parseLabel). */
  const SAMPLE_PARSE = {
    productName: 'Double Chicken Bowls, Breaded Chicken Alfredo',
    brand: 'Hungry-Man',
    brandLogo: '',
    category: 'Frozen › Meals',
    ingredients: 'Breaded Chicken Breast Patties with Rib Meat (Chicken Breast with Rib Meat, Breader [Corn Flour, Wheat Flour, Salt, Monosodium Glutamate, Dextrose, Flavorings {Natural Flavor Complex (Yeast Extract [Autolyzed Baker\'s Yeast {Glutamic Acid, Nucleotide Fraction (Inosine Monophosphate, Guanosine Monophosphate)}, Amino Acid Digest], Spice Extractives), Garlic Powder, Onion Powder}], Water, Batter [Water, Wheat Flour, Modified Corn Starch, Salt], Chicken Skin, Salt, Sodium Phosphates, Autolyzed Yeast Extract, Flavorings), Alfredo Sauce (Water, Soybean Oil, Parmesan Cheese [Part-Skim Milk, Cheese Culture, Salt, Enzymes], Spices, Modified Corn Starch, Nonfat Dry Milk, Alfredo Cheese Blend [Parmesan Cheese {Pasteurized Milk, Cultures, Salt, Enzymes}, Water, Cheddar Cheese {Pasteurized Milk, Cultures, Salt, Enzymes}, Nonfat Dry Milk, Salt, Romano Cheese {Pasteurized Cow\'s Milk, Cultures, Salt, Enzymes}, Disodium Phosphate, Sodium Citrate], Salt, Garlic Powder, Xanthan Gum, Guar Gum), Cooked Fettuccine Pasta (Water, Enriched Wheat Flour [Durum Wheat Semolina {Hard Durum Wheat (Wheat Endosperm [Starch Granules, Gluten Protein Matrix {Gliadin, Glutenin}], Wheat Bran, Wheat Germ), Milling Process}, Niacin, Ferrous Sulfate (Iron), Thiamine Mononitrate, Riboflavin, Folic Acid], Soybean Oil, Dried Egg Whites [Pasteurized Egg Albumen {Ovalbumin, Conalbumin, Ovomucoid}, Spray-Drying Aid]).',
    allergens: ['Wheat', 'Milk', 'Eggs', 'Soy'],
    contains: 'Wheat, Milk, Eggs, Soybeans. May contain traces of peanuts and tree nuts.',
    upc: '658276209940',
    nf: {
      servingsPer: '1', servingSize: '1 meal (425g)', calories: '620',
      totalFat: { amt: '27g', dv: '35%' }, satFat: { amt: '5g', dv: '25%' },
      transFat: { amt: '0g', dv: '' }, cholesterol: { amt: '70mg', dv: '23%' },
      sodium: { amt: '2110mg', dv: '92%' }, totalCarb: { amt: '65g', dv: '24%' },
      fiber: { amt: '3g', dv: '11%' }, totalSugars: { amt: '4g', dv: '' },
      addedSugars: { amt: '0g', dv: '0%' }, protein: { amt: '29g', dv: '' },
      vitaminD: { amt: '0mcg', dv: '0%' }, calcium: { amt: '200mg', dv: '15%' },
      iron: { amt: '3mg', dv: '15%' }, potassium: { amt: '460mg', dv: '10%' },
    },
    errors: {
      'nf.vitaminD': 'Unreadable — low resolution',
      'nf.calcium': 'Unreadable — low resolution',
      'nf.iron': 'Unreadable — low resolution',
      'nf.potassium': 'Unreadable — low resolution',
    },
    image: 'https://www.kroger.com/product/images/xlarge/front/0065827620994',
  };
  /* Sample muffin URL — used only when the user asks to preview a filled
     example, or as the empty-state photo in the image picker modal. A brand-new
     product does not fall back to this in the identity strip or header. */
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
  let messagesEl, welcomeEl, chipsStartEl, inputEl, nfpBody, iaBody, fileInput;
  let uploadContext = 'main';
  function iaHost() { return iaBody || nfpBody; }

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
  function hideWelcome() {
    try { document.dispatchEvent(new CustomEvent('wise:chat-engage')); } catch (_) {}
    if (welcomeEl) welcomeEl.classList.add('sc-hidden');
  }

  const prefersReducedMotion = (() => {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (_) { return false; }
  })();
  /* ── Reply reveal ─────────────────────────────────────────────────────────
     Same paragraph-by-paragraph reveal as the shared chat module
     (js/wiseai-chat.js · typeInTranscript): content first, then the
     timestamp / reply-chip chain in `done`. */
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
      `<div class="sc-line sc-line-you">${youAvatarSpan()}<div class="sc-line-body">${esc(text)}<div class="sc-line-meta"><span class="sc-line-time">${esc(nowLabel())}</span></div></div></div>`);
    scrollDown(true); /* fresh user action — always bring their message into view */
  }
  function addUserImage(src, name) {
    hideWelcome();
    messagesEl.insertAdjacentHTML('beforeend',
      `<div class="sc-line sc-line-you">${youAvatarSpan()}<div class="sc-line-body">${esc(name || 'Photo')}<div class="ap-attach-preview"><img src="${esc(src)}" alt="" onerror="this.style.display='none'"></div><div class="sc-line-meta"><span class="sc-line-time">${esc(nowLabel())}</span></div></div></div>`);
    scrollDown(true); /* fresh user action — always bring their message into view */
  }
  function chipsRow(chips) {
    if (!chips || !chips.length) return '';
    /* Same `.ws-intent-chip` surface as every other WISE chat: brand-blue
       leading glyph, fly-in label, clickable. A chip flagged `primary`
       is the conclusive action for the step (Confirm, Test, Save) — the
       solid brand-blue pill. "What can I ask?" wears the gold ask-help twin. */
    return `<div class="sc-reply-chips">${chips.map((c) => {
      const isAsk = c.action === 'askHelp';
      const gold = isAsk ? ' ws-intent-chip--askhelp' : '';
      const labelHtml = isAsk
        ? `<span class="sc-ask-shimmer" aria-hidden="true">${shimmerLetters(c.label)}</span>`
        : esc(c.label);
      const ask = c.ask ? ` data-ask="${esc(c.ask)}"` : '';
      const aria = isAsk ? ` aria-label="${esc(c.label)}"` : '';
      return `<button type="button" class="chip ws-intent-chip${gold}${c.primary ? ' chip-primary' : ''}" data-action="${esc(c.action)}"${c.arg != null ? ` data-arg="${esc(c.arg)}"` : ''}${ask}${aria}><span class="material-symbols-outlined">${esc(c.icon || 'bolt')}</span>${labelHtml}</button>`;
    }).join('')}</div>`;
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
  /* Live NFP ingredient-analysis snapshot — drives which intent chips are
     possible right now (analyze → review/confirm → test codes / Wise Code AI). */
  function iaWorkflow() {
    const list = String(state.ingredients || '').trim();
    const tree = list ? parseIngredientTree(list) : [];
    const stats = tree.length ? iaMatchStats(tree) : null;
    const analyzed = !!(state.iaRan && stats && stats.leaves.length);
    const leaves = analyzed ? stats.leaves : [];
    const fuzzy = leaves.filter((r) => iaMatchOf(r) === 'part');
    const unmatched = leaves.filter((r) => iaMatchOf(r) === 'bad');
    const unconfirmedOk = leaves.filter((r) => iaMatchOf(r) === 'ok' && r.id && !state.iaConfirm[r.id]);
    return {
      list: list,
      stats: stats,
      analyzed: analyzed,
      pending: analyzed ? (stats.part + stats.bad) : 0,
      fuzzy: fuzzy,
      unmatched: unmatched,
      unconfirmedOk: unconfirmedOk,
      confirmedOk: analyzed ? (stats.ok - unconfirmedOk.length) : 0,
    };
  }

  /* Intent chips that mirror what the Product Details (NFP) column can do
     right now. Analyze, confirm, and test rotate in and out as the panel
     state changes — the transcript never offers a dead-end or a stale CTA. */
  function nfpIntentChips(opts) {
    opts = opts || {};
    const skip = new Set(opts.skip || []);
    const wf = iaWorkflow();
    const workflow = [];
    const rest = [];
    const push = (bucket, c) => {
      if (!c || skip.has(c.action)) return;
      if (c.arg != null && skip.has(c.action + ':' + c.arg)) return;
      bucket.push(c);
    };

    if (wf.list) {
      push(workflow, {
        label: wf.analyzed ? 'Re-analyze ingredients' : 'Analyze ingredients',
        ask: wf.analyzed ? 'Re-analyze the ingredients' : 'Analyze the ingredients',
        icon: 'science',
        action: 'ia-analyze',
        primary: !wf.analyzed,
      });
    }
    if (wf.analyzed) {
      if (wf.pending) {
        push(workflow, {
          label: wf.pending === 1 ? 'Review 1 mapping' : `Review ${wf.pending} mappings`,
          ask: 'Review mappings',
          icon: 'rule',
          action: 'ia-review',
        });
      }
      if (wf.unconfirmedOk.length) {
        push(workflow, {
          label: `Confirm ${wf.unconfirmedOk.length} matched`,
          ask: 'Confirm matched ingredients',
          icon: 'check_circle',
          action: 'ia-confirm-all',
          primary: !wf.pending,
        });
      }
      if (wf.fuzzy.length) {
        const first = wf.fuzzy[0];
        const name = first.mapped || first.raw;
        push(workflow, {
          label: `Confirm ${name}`,
          ask: `Confirm the ${name} mapping`,
          icon: 'done',
          action: 'ia-confirm',
          arg: first.id,
        });
      }
      if (wf.unmatched.length) {
        const one = wf.unmatched.length === 1;
        const name = wf.unmatched[0].raw;
        push(workflow, {
          label: one ? `Look up ${name}` : `Look up ${wf.unmatched.length} unmatched`,
          ask: one ? `Look up ${name}` : 'Look up unmatched ingredients',
          icon: 'search',
          action: 'ia-lookup',
        });
      }
      if (!state.iaOpen.codes) {
        push(workflow, {
          label: 'Test code scores',
          ask: 'Test the code scores',
          icon: 'verified',
          action: 'ia-test-codes',
          primary: !wf.pending && !wf.unconfirmedOk.length,
        });
      } else if (!state.iaOpen.scout) {
        push(workflow, {
          label: 'Test Wise Code AI',
          ask: 'Test Wise Code AI results',
          icon: 'psychology',
          action: 'ia-test-scout',
        });
      }
      if (!state.iaOpen.nutrients) {
        push(rest, {
          label: 'Show nutrients',
          ask: 'Show the nutrients table',
          icon: 'nutrition',
          action: 'ia-open-nutrients',
        });
      }
      if (!state.iaOpen.parsed) {
        push(rest, {
          label: 'Show parsed ingredients',
          ask: 'Show parsed ingredients',
          icon: 'account_tree',
          action: 'ia-open-parsed',
        });
      }
    }

    push(rest, { label: 'Edit ingredients', icon: 'science', action: 'field:ingredients' });
    push(rest, { label: 'Edit Nutrition Facts', icon: 'edit', action: 'focusNf' });
    push(rest, { label: 'Update allergens', icon: 'warning', action: 'field:allergens' });

    const bannerKind = nextStepKind();
    if (isClaimPending() || bannerKind === 'claim') {
      push(rest, {
        label: 'Claim this product',
        ask: 'Everything looks right, claim this product',
        icon: 'bookmark_add',
        action: 'claim',
        primary: true,
      });
    } else if (bannerKind === 'complete') {
      push(rest, {
        label: "I've filled in the details",
        ask: "I've filled in the details",
        icon: 'edit_note',
        action: 'complete-details',
        primary: true,
      });
    } else if (bannerKind === 'verify') {
      push(rest, {
        label: 'Verify ingredients',
        ask: 'Verify the ingredients',
        icon: 'fact_check',
        action: 'verify-ingredients',
        primary: true,
      });
    } else if (bannerKind === 'add') {
      push(rest, { label: 'Save to Portfolio', icon: 'save', action: 'save', primary: !state.saved });
    } else if (bannerKind === 'ineligible') {
      push(rest, { label: 'See why and reformulate', icon: 'science', action: 'reformulate' });
    } else {
      push(rest, { label: 'Get the Non-UPF Shield', icon: 'gpp_good', action: 'shield' });
      if (!state.saved && bannerKind !== 'claimed') {
        push(rest, { label: 'Save changes', icon: 'save', action: 'goto:save' });
      }
    }
    if (nfpIsExistingProduct()) {
      push(rest, { label: 'Back to portfolio', icon: 'inventory_2', action: 'exit' });
    }

    /* Lead with the live NFP workflow (analyze / confirm / test). Always
       keep claim / shield / save / back in the tail so those panel CTAs
       never drop off the row. Cap so it stays two wraps, not a wall. */
    const STANDING = new Set(['claim', 'shield', 'goto:save', 'save', 'exit', 'complete-details', 'verify-ingredients', 'reformulate']);
    const seen = new Set();
    const take = (list, n) => {
      const out = [];
      list.forEach((c) => {
        if (out.length >= n) return;
        const key = c.action + (c.arg != null ? ':' + c.arg : '');
        if (seen.has(key)) return;
        seen.add(key);
        out.push(c);
      });
      return out;
    };
    const standing = rest.filter((c) => STANDING.has(c.action));
    const extras = rest.filter((c) => !STANDING.has(c.action));
    const lead = take(workflow, 5);
    const tail = take(standing, 3);
    const room = Math.max(0, 8 - lead.length - tail.length);
    return lead.concat(take(extras, room)).concat(tail);
  }

  /* Rule: every reply ends on topic-related intent chips. On View / Edit
     Product (and once analysis has run) those chips track the NFP. On a
     blank Add Product they stay the builder's next-step fallback. */
  function leftoverStepChips(currentId, existing) {
    if (!state.step || nfpIsExistingProduct() || state.iaRan) return [];
    const have = new Set((existing || []).map((c) => c.action));
    const out = [];
    STEPS.forEach((s) => {
      if (out.length >= 3) return;
      if (s.id === currentId || s.id === 'save') return;
      if (stepFilled(s.id) || state.skipped[s.id]) return;
      const action = 'goto:' + s.id;
      if (have.has(action)) return;
      have.add(action);
      out.push({ label: s.label, icon: s.icon, action });
    });
    return out;
  }
  function fallbackChips() {
    if (nfpIsExistingProduct() || state.iaRan) return nfpIntentChips();
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
    /* Insert the line WITHOUT its reply chips, reveal paragraphs, then the
       timestamp, then the chips (left→right) — content, meta, chips, in order. */
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
  /* Header-identity template (view-product, and add-product matching it):
     the product name and description open the module, then the size photos
     sit in one row — the selected size is a bit larger with a blue border.
     Price, quantity, and barcode below track whichever size is selected. */
  function useHeaderIdentity() {
    return !!(typeof window !== 'undefined' && window.WISE_HERO_BRAND);
  }
  const DESC_MAX = 220;
  function clipDesc(s) {
    const t = String(s == null ? '' : s).trim();
    return t.length > DESC_MAX ? t.slice(0, DESC_MAX).replace(/\s+\S*$/, '').trimEnd() : t;
  }
  function defaultDescription(name) {
    const n = String(name || 'This product').replace(/\s*-\s*\d+(?:\.\d+)?\s*(ct|oz)\b.*$/i, '').trim() || 'This product';
    if (/muffin|brownie|bakery|flax/i.test(n)) {
      return clipDesc(n + ' — a bakery favorite with a moist crumb, simple ingredients, and flavor that holds from the first bite to the last.');
    }
    if (/chicken|alfredo|hungry/i.test(n)) {
      return clipDesc(n + ' — a frozen meal with breaded chicken, Alfredo sauce, and fettuccine. The ingredient tree is fully nested from the label.');
    }
    return clipDesc(n + ' — check the ingredient tree, Nutrition Facts, and codes on the right.');
  }
  function formatPrice(raw) {
    const s = String(raw == null ? '' : raw).replace(/[^0-9.]/g, '');
    if (!s) return '';
    const n = Number(s);
    if (!isFinite(n) || n < 0) return '';
    return n.toFixed(2);
  }
  function displayPrice(raw) {
    const f = formatPrice(raw);
    return f ? '$' + f : '';
  }
  function defaultPriceForLabel(label) {
    const n = Number(countFromSizeLabel(label));
    if (n) {
      const disc = n >= 12 ? 0.82 : n >= 6 ? 0.88 : n >= 4 ? 0.92 : 1;
      return (n * 1.49 * disc).toFixed(2);
    }
    const oz = String(label || '').match(/^(\d+(?:\.\d+)?)\s*oz\b/i);
    if (oz) return (Number(oz[1]) * 0.42).toFixed(2);
    return '';
  }
  function activePricePath() {
    const i = activePackIndex();
    return i != null ? 'packs.' + i + '.price' : 'price';
  }
  function activePriceValue() {
    const i = activePackIndex();
    if (i != null && state.packs[i] && state.packs[i].price != null && state.packs[i].price !== '') {
      return state.packs[i].price;
    }
    return state.price || '';
  }
  function activeSizeLabel() {
    const i = activePackIndex();
    if (i != null && state.packs[i]) return state.packs[i].label || 'Size';
    return state.unitLabel || '1 ct';
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
    /* New products have no photo yet — do not invent a sample muffin. The
       identity strip paints a frozen, enlarged strand-only helix instead. */
    return activeProductImage() || '';
  }
  function productBgImgHTML(src) {
    const used = src || productBackgroundSrc();
    if (!used) return '';
    const fallback = used === DEFAULT_PRODUCT_IMAGE
      ? DEFAULT_PRODUCT_IMAGE_LOCAL
      : DEFAULT_PRODUCT_IMAGE;
    return `<img src="${esc(used)}" alt="" data-nfp-bg-fallback="${esc(fallback)}" onerror="if(!this.dataset.fell){this.dataset.fell='1';this.src=this.dataset.nfpBgFallback}">`;
  }
  /* Frozen, enlarged still of the streaming DNA/RNA strand — no product
     circles — used as the identity-strip background until a real photo exists.
     Decorative, not the chat Scene pose. */
  let nfpHelix = null;
  function syncNfpHelixBg() {
    const host = nfpBody && nfpBody.querySelector('.nfp-fi-strip-photo--helix');
    if (!host) {
      if (nfpHelix) {
        try { nfpHelix.stop(); } catch (_) {}
        nfpHelix = null;
      }
      return;
    }
    if (nfpHelix && host.querySelector('.sc-bganim-canvas')) {
      host.classList.add('sc-bganim-live');
      try { nfpHelix.redraw(); } catch (_) {}
      return;
    }
    const startOn = (createHelixBgAnim) => {
      const h = nfpBody && nfpBody.querySelector('.nfp-fi-strip-photo--helix');
      if (!h || typeof createHelixBgAnim !== 'function') return;
      if (nfpHelix) {
        try { nfpHelix.stop(); } catch (_) {}
        nfpHelix = null;
      }
      nfpHelix = createHelixBgAnim({
        host: h,
        getBody: () => (nfpBody && nfpBody.querySelector('.nfp-fi-strip-photo--helix')) || h,
        getOpacity: () => 0.78,
        getAngle: () => 10,
        getScale: () => ({ x: 1.55, y: 1.55, z: 1.35 }),
        getPitch: () => 0.72,
        getDots: () => 1.85,
        getLength: () => 1.05,
        getThickness: () => 2.6,
        getDepth: () => 1.25,
        getCenterY: () => 0.5,
        hideProducts: true,
        reducedMotion: true,
        isOn: () => true,
        isPaused: () => true,
      });
      nfpHelix.start();
      requestAnimationFrame(() => {
        try {
          if (nfpHelix && typeof nfpHelix.resize === 'function') nfpHelix.resize();
          nfpHelix && nfpHelix.redraw();
        } catch (_) {}
      });
    };
    if (typeof window.createHelixBgAnim === 'function') {
      startOn(window.createHelixBgAnim);
      return;
    }
    import('../js/wiseai-chat.js').then((m) => {
      window.createHelixBgAnim = m.createHelixBgAnim;
      startOn(m.createHelixBgAnim);
    }).catch(() => {});
  }
  /* Identity-strip pages keep the product photo in the left square — never
     as a header banner, and never as a pencil next to ⋯ / width. Leftover
     header photo chrome is stripped on each render. */
  function syncNfpHeaderPhoto() {
    const header = document.querySelector('#nfp-panel .nfp-panel-header');
    if (!header) return;
    header.classList.remove('nfp-panel-header--photo');
    header.querySelector('.nfp-header-photo-bg')?.remove();
    header.querySelector('.nfp-header-photo')?.remove();
    const logo = header.querySelector('.nfp-brand-logo');
    if (logo) logo.hidden = false;
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
  /* Real UPC-A bars — left guard, 6 left digits, center guard, 6 right
     digits, right guard. Guard bars run longer so they read as a printed
     code. Empty still paints the same footprint with a faded zero code. */
  const UPC_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
  const UPC_R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
  function upcABits(digits) {
    const d = String(digits || '').replace(/\D/g, '');
    if (d.length !== 12) return '';
    let bits = '101';
    for (let i = 0; i < 6; i++) bits += UPC_L[Number(d[i])];
    bits += '01010';
    for (let i = 6; i < 12; i++) bits += UPC_R[Number(d[i])];
    bits += '101';
    return bits;
  }
  function upcBarcodeBig(digits) {
    const raw = String(digits || '').replace(/\D/g, '');
    const bits = upcABits(raw.length === 12 ? raw : '000000000000');
    const H = 88;
    const H_DATA = 70;
    const bars = [];
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] === '1') {
        const guard = i < 3 || (i >= 45 && i < 50) || i >= 92;
        bars.push(`<rect x="${i}" y="0" width="1" height="${guard ? H : H_DATA}"/>`);
      }
    }
    const faded = raw.length !== 12 ? ' nfp-upc-bc--preview' : '';
    return `<svg class="nfp-upc-bc${faded}" width="100%" height="100%" viewBox="0 0 ${bits.length} ${H}" preserveAspectRatio="none" shape-rendering="crispEdges" aria-hidden="true">${bars.join('')}</svg>`;
  }
  function upcCellHTML(idx, value, onPhoto, extraCls) {
    return `<input type="text" inputmode="numeric" autocomplete="off" maxlength="1" class="nfp-upc-cell${onPhoto ? ' nfp-upc-cell--onphoto' : ''}${extraCls ? ' ' + extraCls : ''}" data-nfp-upc-cell data-idx="${idx}" value="${value}" aria-label="UPC digit ${idx + 1}">`;
  }
  /* One UPC look for every state (empty · editing · complete): a printed
     UPC-A card — real bars on top, 12 editable mono digits below grouped
     1 · 5 · 5 · 1 (number system · manufacturer · product · check). */
  function upcSegmentedHTML(onPhoto, packIdx, digits) {
    const isPack = packIdx != null;
    const raw = String(digits || '').replace(/\D/g, '');
    const filled = raw.length === 12;
    const val = (i) => (filled ? raw[i] : '');
    const cell = (i, extra) => upcCellHTML(i, val(i), onPhoto, extra);
    const group = (from) => {
      let h = '';
      for (let i = 0; i < 5; i++) h += cell(from + i);
      return `<div class="nfp-upc-group">${h}</div>`;
    };
    const wrapCls = 'nfp-upc-entry' + (onPhoto ? ' nfp-upc-entry--onphoto' : '') + (filled ? ' nfp-upc-entry--filled' : '');
    return `<div class="${wrapCls}" data-nfp-upc-entry${isPack ? ` data-pack="${packIdx}"` : ''}>
        <div class="nfp-upc-mark">
          <div class="nfp-upc-barcode">${upcBarcodeBig(raw)}</div>
          <div class="nfp-upc-cells" role="group" aria-label="UPC — 12 digits">
            ${cell(0, 'nfp-upc-cell--lone')}
            ${group(1)}
            <div class="nfp-upc-gutter" aria-hidden="true"></div>
            ${group(6)}
            ${cell(11, 'nfp-upc-cell--lone')}
          </div>
        </div>
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
       size has no code of its own, reuse the base UPC. Editing any digit gives
       the size its own code. */
    const digits = p.upc || state.upc;
    return `<div class="nfp-hero-upc nfp-hero-upc--seg">${upcSegmentedHTML(onPhoto, i, digits)}</div>`;
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
     (multipacks / larger sizes) the user adds. On the identity strip the
     selected size is the primary photo — a bit larger, blue border — so there
     is no separate lead image. */
  function productSizesGroupHTML() {
    const unitActive = state.view === 'product';
    const unitLabel = state.unitLabel || '1 ct';
    const identity = useHeaderIdentity();
    const foldUpc = identity && state.nfpFlip;
    const packIdx = activePackIndex();
    function thumbEditHTML(active, action, arg) {
      if (!identity || !active) return '';
      const hasImg = action === 'upload-pack'
        ? !!(state.packs[Number(arg)] && state.packs[Number(arg)].image)
        : !!state.image;
      const photoLabel = hasImg ? 'Replace product image' : 'Add product image';
      const argAttr = action === 'upload-pack' ? ` data-arg="${arg}"` : '';
      return `<button type="button" class="nfp-fi-lead-edit" data-nfp="${action}"${argAttr} title="${esc(photoLabel)}" aria-label="${esc(photoLabel)}"><span class="material-symbols-outlined">edit</span></button>`;
    }
    const unitThumb = `
      <div class="nfp-fi-thumb${unitActive ? ' active' : ''}${identity && unitActive ? ' nfp-fi-thumb--primary' : ''}" data-nfp="pick-image" data-arg="0" aria-label="${esc(unitLabel)} (default)">
        <span class="nfp-fi-thumb-frame">
        ${state.image
          ? `<img class="nfp-fi-thumb-img" src="${esc(state.image)}" alt="${esc(unitLabel)}" onerror="this.src='https://placehold.co/40x40/f3f4f6/9ca3af?text=?'">`
          : `<span class="nfp-fi-thumb-img nfp-fi-thumb-icon"><span class="material-symbols-outlined">nutrition</span></span>`}
        ${thumbEditHTML(unitActive, 'upload-main')}
        </span>
        <span class="nfp-fi-thumb-label">${esc(unitLabel)}</span>
      </div>`;
    const title = identity
      ? `<div class="nfp-fi-header">
          <span class="nfp-fi-title">${editSpan('productName', state.productName, 'Product name')}</span>
        </div>`
      : `<div class="nfp-fi-header"><span class="nfp-fi-title">Add Product Sizes</span></div>`;
    const addSizeThumb = `
      <div class="nfp-fi-add" data-nfp="add-pack" title="Add size or variation" role="button">
        <span class="nfp-fi-add-sq" aria-hidden="true"><span class="material-symbols-outlined">add</span></span>
        <span class="nfp-fi-add-label">Add size or variation</span>
      </div>`;
    const upcBlock = identity
      ? `<div class="nfp-fi-upc">${packIdx != null ? packUpcHTML(packIdx, false) : heroUpcHTML(false)}</div>`
      : '';
    /* Barcode sits immediately after the selected size so picking an earlier
       count slides it left instead of leaving it parked at the end of the row. */
    const packThumbs = state.packs.map((p, i) => {
      const label = p.label || 'Size';
      const packActive = state.view === 'pack' && i === state.activePack;
      const thumb = `
      <div class="nfp-fi-thumb${packActive ? ' active' : ''}${identity && packActive ? ' nfp-fi-thumb--primary' : ''}" data-nfp="pick-pack" data-arg="${i}" aria-label="${esc(label)}">
        <span class="nfp-fi-thumb-frame">
        ${p.image
          ? `<img class="nfp-fi-thumb-img" src="${esc(p.image)}" alt="${esc(label)}" onerror="this.src='https://placehold.co/40x40/f3f4f6/9ca3af?text=?'">`
          : `<span class="nfp-fi-thumb-img nfp-fi-thumb-icon"><span class="material-symbols-outlined">inventory_2</span></span>`}
        ${thumbEditHTML(packActive, 'upload-pack', i)}
        ${packDeleteAffordanceHTML(i, label)}
        </span>
        ${packDeletePopHTML(i, label)}
        <span class="nfp-fi-thumb-label">${esc(label)}</span>
      </div>`;
      return (identity && !foldUpc && packIdx === i) ? `<div class="nfp-fi-thumb-upc">${thumb}${upcBlock}</div>` : thumb;
    }).join('');
    const unitBit = identity && !foldUpc && unitActive
      ? `<div class="nfp-fi-thumb-upc">${unitThumb}${upcBlock}</div>`
      : unitThumb;
    const descRow = identity
      ? `<p class="nfp-fi-desc">${editSpan('description', state.description, 'Add a short product description')}</p>`
      : '';
    const priceVal = activePriceValue();
    const priceRow = identity
      ? `<div class="nfp-fi-price">
          ${editSpan(activePricePath(), displayPrice(priceVal), '$0.00')}
          <span class="nfp-fi-price-size">${esc(activeSizeLabel())}</span>
        </div>`
      : '';
    const sizeRow = `<div class="nfp-fi-thumbs">
            ${unitBit}
            ${packThumbs}
            ${addSizeThumb}
          </div>`;
    const upcRow = foldUpc ? upcBlock : '';
    const catRow = identity
      ? `<div class="nfp-fi-cat nfp-fi-cat--dock">${heroCatHTML(false)}</div>`
      : '';
    const upcStack = identity
      ? `<div class="nfp-fi-upc-stack">${upcRow}${catRow}</div>`
      : '';
    const body = identity
      ? `<div class="nfp-fi-copy">
          ${title}
          <div class="nfp-fi-details">
            ${descRow}
            ${sizeRow}
            ${priceRow}
            ${upcStack}
          </div>
        </div>`
      : `${title}
      ${sizeRow}`;
    return `<div class="nfp-fi-group nfp-fi-group--packs${identity ? ' nfp-fi-group--identity' : ''}">
      ${body}
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
    { keys: ['sea salt'], mapped: 'SEA SALT', cat: 'Mineral', sub: 'Salt', pl: 1, match: 'ok' },
    { keys: ['salt'], mapped: 'SALT', cat: 'Mineral', sub: 'Salt', pl: 1, match: 'ok' },
    { keys: ['xanthan gum'], mapped: 'XANTHAN GUM', cat: 'Additive', sub: 'Gum', pl: 2, match: 'part' },
    { keys: ['guar gum'], mapped: 'GUAR GUM', cat: 'Additive', sub: 'Gum', pl: 2, match: 'ok' },
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
    { keys: ['chicken breast with rib meat'], mapped: 'CHICKEN BREAST WITH RIB MEAT', cat: 'Protein', sub: 'Poultry', pl: 1, match: 'ok' },
    { keys: ['corn flour'], mapped: 'CORN FLOUR', cat: 'Grain', sub: 'Cereal', pl: 1, match: 'ok' },
    { keys: ['wheat flour'], mapped: 'WHEAT FLOUR', cat: 'Grain', sub: 'Cereal', pl: 1, match: 'ok' },
    { keys: ['monosodium glutamate'], mapped: 'MSG', cat: 'Additive', sub: 'Flavor', pl: 2, match: 'ok' },
    { keys: ['dextrose'], mapped: 'DEXTROSE', cat: 'Sweetener', sub: 'Sugars', pl: 2, match: 'ok' },
    { keys: ['flavorings', 'flavoring'], mapped: 'FLAVORINGS', cat: 'Additive', sub: 'Flavor', pl: 2, match: 'ok' },
    { keys: ['glutamic acid'], mapped: 'GLUTAMIC ACID', cat: 'Additive', sub: 'Amino Acid', pl: 2, match: 'ok' },
    { keys: ['inosine monophosphate'], mapped: 'IMP', cat: 'Additive', sub: 'Nucleotide', pl: 2, match: 'ok' },
    { keys: ['guanosine monophosphate'], mapped: 'GMP', cat: 'Additive', sub: 'Nucleotide', pl: 2, match: 'ok' },
    { keys: ['amino acid digest'], mapped: 'AMINO ACID DIGEST', cat: 'Additive', sub: 'Protein Hydrolysate', pl: 2, match: 'ok' },
    { keys: ['spice extractives', 'spice extractive'], mapped: 'SPICE EXTRACTIVES', cat: 'Spice', sub: 'Extract', pl: 2, match: 'ok' },
    { keys: ['garlic powder'], mapped: 'GARLIC POWDER', cat: 'Spice', sub: 'Allium', pl: 1, match: 'ok' },
    { keys: ['onion powder'], mapped: 'ONION POWDER', cat: 'Spice', sub: 'Allium', pl: 1, match: 'ok' },
    { keys: ['modified corn starch'], mapped: 'CORN STARCH MODIFIED', cat: 'Additive', sub: 'Starch', pl: 2, match: 'ok' },
    { keys: ['chicken skin'], mapped: 'CHICKEN SKIN', cat: 'Fat', sub: 'Poultry', pl: 1, match: 'ok' },
    { keys: ['sodium phosphates', 'sodium phosphate'], mapped: 'SODIUM PHOSPHATES', cat: 'Additive', sub: 'Phosphate', pl: 2, match: 'ok' },
    { keys: ['autolyzed yeast extract'], mapped: 'AUTOLYZED YEAST EXTRACT', cat: 'Additive', sub: 'Yeast', pl: 2, match: 'ok' },
    { keys: ['soybean oil'], mapped: 'SOYBEAN OIL', cat: 'Fat', sub: 'Oil', pl: 2, match: 'ok' },
    { keys: ['part-skim milk', 'part skim milk'], mapped: 'MILK PART-SKIM', cat: 'Protein', sub: 'Dairy', pl: 1, match: 'ok' },
    { keys: ['cheese culture', 'cheese cultures', 'cultures'], mapped: 'CHEESE CULTURE', cat: 'Additive', sub: 'Culture', pl: 1, match: 'ok' },
    { keys: ['enzymes'], mapped: 'ENZYMES', cat: 'Additive', sub: 'Enzyme', pl: 1, match: 'ok' },
    { keys: ['spices'], mapped: 'SPICES', cat: 'Spice', sub: 'Blend', pl: 1, match: 'ok' },
    { keys: ['nonfat dry milk'], mapped: 'MILK NONFAT DRY', cat: 'Protein', sub: 'Dairy', pl: 2, match: 'ok' },
    { keys: ['pasteurized cow\'s milk', 'pasteurized cows milk', 'pasteurized milk'], mapped: 'MILK PASTEURIZED', cat: 'Protein', sub: 'Dairy', pl: 1, match: 'ok' },
    { keys: ['disodium phosphate'], mapped: 'DISODIUM PHOSPHATE', cat: 'Additive', sub: 'Phosphate', pl: 2, match: 'ok' },
    { keys: ['sodium citrate'], mapped: 'SODIUM CITRATE', cat: 'Additive', sub: 'Salt', pl: 2, match: 'ok' },
    { keys: ['starch granules'], mapped: 'WHEAT STARCH', cat: 'Grain', sub: 'Starch', pl: 1, match: 'ok' },
    { keys: ['gliadin'], mapped: 'GLIADIN', cat: 'Protein', sub: 'Gluten', pl: 1, match: 'ok' },
    { keys: ['glutenin'], mapped: 'GLUTENIN', cat: 'Protein', sub: 'Gluten', pl: 1, match: 'ok' },
    { keys: ['wheat bran'], mapped: 'WHEAT BRAN', cat: 'Grain', sub: 'Bran', pl: 1, match: 'ok' },
    { keys: ['wheat germ'], mapped: 'WHEAT GERM', cat: 'Grain', sub: 'Germ', pl: 1, match: 'ok' },
    { keys: ['milling process'], mapped: 'MILLING', cat: 'Process', sub: 'Milling', pl: 2, match: 'part' },
    { keys: ['niacin'], mapped: 'VITAMIN B-3', cat: 'Vitamin', sub: 'B Vitamin', pl: 2, match: 'ok' },
    { keys: ['ferrous sulfate'], mapped: 'IRON', cat: 'Mineral', sub: 'Iron', pl: 2, match: 'ok' },
    { keys: ['iron'], mapped: 'IRON', cat: 'Mineral', sub: 'Iron', pl: 1, match: 'ok' },
    { keys: ['thiamine mononitrate'], mapped: 'VITAMIN B-1', cat: 'Vitamin', sub: 'B Vitamin', pl: 2, match: 'ok' },
    { keys: ['riboflavin'], mapped: 'VITAMIN B-2', cat: 'Vitamin', sub: 'B Vitamin', pl: 2, match: 'ok' },
    { keys: ['folic acid'], mapped: 'VITAMIN B-9', cat: 'Vitamin', sub: 'B Vitamin', pl: 2, match: 'ok' },
    { keys: ['ovalbumin'], mapped: 'OVALBUMIN', cat: 'Protein', sub: 'Egg', pl: 1, match: 'ok' },
    { keys: ['conalbumin'], mapped: 'MALTODEXTRIN', cat: 'Additive', sub: 'Carrier', pl: 2, match: 'part' },
    { keys: ['ovomucoid'], mapped: 'MALTODEXTRIN', cat: 'Additive', sub: 'Carrier', pl: 2, match: 'part' },
    { keys: ['spray-drying aid', 'spray drying aid'], mapped: 'MALTODEXTRIN', cat: 'Additive', sub: 'Carrier', pl: 2, match: 'part' },
  ];

  const BRACKET_PAIRS = { '(': ')', '[': ']', '{': '}' };
  const BRACKET_OPEN = Object.keys(BRACKET_PAIRS);
  const BRACKET_CLOSE = Object.values(BRACKET_PAIRS);

  function splitIngredientTokens(text) {
    const parts = [];
    let buf = '';
    let depth = 0;
    String(text || '').split('').forEach((ch) => {
      if (BRACKET_OPEN.indexOf(ch) >= 0) { depth += 1; buf += ch; return; }
      if (BRACKET_CLOSE.indexOf(ch) >= 0) { depth = Math.max(0, depth - 1); buf += ch; return; }
      if (ch === ',' && depth === 0) {
        const t = buf.trim().replace(/\.+$/, '');
        if (t) parts.push(t);
        buf = '';
        return;
      }
      buf += ch;
    });
    const t = buf.trim().replace(/\.+$/, '');
    if (t) parts.push(t);
    return parts;
  }

  function firstBracketGroup(token) {
    const s = String(token || '');
    let start = -1;
    let openCh = '';
    for (let i = 0; i < s.length; i++) {
      if (BRACKET_OPEN.indexOf(s[i]) >= 0) { start = i; openCh = s[i]; break; }
    }
    if (start < 0) return null;
    const closeCh = BRACKET_PAIRS[openCh];
    let depth = 0;
    for (let i = start; i < s.length; i++) {
      if (s[i] === openCh) depth += 1;
      else if (s[i] === closeCh) {
        depth -= 1;
        if (depth === 0) {
          return { name: s.slice(0, start).trim(), inner: s.slice(start + 1, i).trim() };
        }
      }
    }
    return { name: s.slice(0, start).trim(), inner: s.slice(start + 1).replace(/[)\]}]+$/g, '').trim() };
  }

  function lookupIngredient(raw) {
    const clean = String(raw || '').replace(/\s+/g, ' ').trim().replace(/\.+$/, '');
    const key = clean.toLowerCase().replace(/^100%\s+/, '').replace(/^organic\s+/, '');
    let best = null;
    let bestLen = -1;
    IA_CATALOG.forEach((c) => {
      c.keys.forEach((k) => {
        if (key === k || key.endsWith(' ' + k)) {
          if (k.length > bestLen) { best = c; bestLen = k.length; }
        }
      });
    });
    if (best) {
      return { raw: clean || raw, mapped: best.mapped, cat: best.cat, sub: best.sub, pl: best.pl, match: best.match, isGroup: false, children: [] };
    }
    const mapped = clean.toUpperCase() || String(raw || '').toUpperCase();
    return { raw: clean || raw, mapped, cat: 'Ingredient', sub: 'Unclassified', pl: 2, match: 'ok', isGroup: false, children: [] };
  }

  function parseIngredientNode(token, id) {
    const trimmed = String(token || '').trim().replace(/\.+$/, '');
    const group = firstBracketGroup(trimmed);
    const name = ((group && group.name) || trimmed).trim();
    if (group && group.inner) {
      const children = splitIngredientTokens(group.inner)
        .map((child, i) => parseIngredientNode(child, id + '.' + i))
        .filter((n) => n && n.raw);
      if (children.length) {
        return {
          id, raw: name, mapped: '', cat: '', sub: '', pl: 0, match: '',
          isGroup: true, children,
        };
      }
    }
    const hit = lookupIngredient(name);
    hit.id = id;
    hit.isGroup = false;
    hit.children = [];
    return hit;
  }

  function parseIngredientTree(text) {
    return splitIngredientTokens(text)
      .map((token, i) => parseIngredientNode(token, String(i)))
      .filter((n) => n && n.raw);
  }

  function flattenParsed(tree) {
    const out = [];
    function walk(nodes, depth) {
      (nodes || []).forEach((row) => {
        out.push(Object.assign({}, row, { depth: depth }));
        if (row.children && row.children.length) walk(row.children, depth + 1);
      });
    }
    walk(tree, 0);
    return out;
  }

  function iaMatchOf(row) {
    if (!row || row.isGroup) return '';
    if (row.id && state.iaConfirm[row.id]) return 'ok';
    return row.match || 'ok';
  }

  function iaMatchStats(tree) {
    const flat = flattenParsed(tree);
    const leaves = flat.filter((r) => !r.isGroup);
    const matches = leaves.map(iaMatchOf);
    return {
      flat,
      leaves,
      ok: matches.filter((m) => m === 'ok').length,
      part: matches.filter((m) => m === 'part').length,
      bad: matches.filter((m) => m === 'bad').length,
    };
  }

  function iaParsedBadges(stats) {
    const bits = [];
    if (stats.ok) bits.push(`<span class="nfp-ia-pill nfp-ia-pill--ok" title="${stats.ok} matched">${stats.ok}</span>`);
    if (stats.part) bits.push(`<span class="nfp-ia-pill nfp-ia-pill--part" title="${stats.part} fuzzy">${stats.part}</span>`);
    if (stats.bad) bits.push(`<span class="nfp-ia-pill nfp-ia-pill--bad" title="${stats.bad} unmatched">${stats.bad}</span>`);
    return bits.length ? `<span class="nfp-ia-head-pills">${bits.join('')}</span>` : '';
  }

  function iaMatchPill(match, rowId) {
    if (match === 'ok') return `<span class="nfp-ia-pill nfp-ia-pill--ok">Matched</span>`;
    if (match === 'part') {
      return `<span class="nfp-ia-pill-wrap"><span class="nfp-ia-pill nfp-ia-pill--part">Fuzzy</span>`
        + `<button type="button" class="nfp-ia-confirm" data-nfp="ia-confirm" data-arg="${esc(rowId)}">Confirm</button></span>`;
    }
    return `<span class="nfp-ia-pill-wrap"><span class="nfp-ia-pill nfp-ia-pill--bad">Unmatched</span>`
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
    const names = ALLERGENS.map((a) => a.name);
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

  function iaAccord(id, title, inner, extra) {
    const open = !!state.iaOpen[id];
    return `<section class="nfp-ia-sec${open ? '' : ' is-collapsed'}" data-ia-sec="${id}">
      <button type="button" class="nfp-ia-head" data-nfp="ia-toggle" data-arg="${id}" aria-expanded="${open ? 'true' : 'false'}">
        <span class="nfp-ia-title">${title}</span>
        ${extra || ''}
        <span class="material-symbols-outlined nfp-ia-chev" aria-hidden="true">expand_more</span>
      </button>
      <div class="nfp-ia-body">${inner}</div>
    </section>`;
  }

  function parsedPanelHTML(tree) {
    const stats = iaMatchStats(tree);
    const pending = stats.part + stats.bad;
    const banner = pending
      ? `<div class="nfp-ia-banner nfp-ia-banner--warn"><span class="material-symbols-outlined">warning</span>${pending} mapping${pending === 1 ? '' : 's'} still need a review.</div>`
      : `<div class="nfp-ia-banner nfp-ia-banner--ok"><span class="material-symbols-outlined">check_circle</span>All ingredients matched and waiting for your confirmation.</div>`;
    const actions = `<div class="nfp-ia-actions">
        <button type="button" class="nfp-ia-btn nfp-ia-btn--ghost" data-nfp="ia-review">${pending ? `Review ${pending} mapping${pending === 1 ? '' : 's'}` : 'Review mappings'}</button>
        <button type="button" class="nfp-ia-btn nfp-ia-btn--ghost" data-nfp="ia-analyze">Re-analyze all ${stats.flat.length}</button>
        <button type="button" class="nfp-ia-btn nfp-ia-btn--ok" data-nfp="ia-confirm-all">Confirm ${stats.ok} matched</button>
      </div>`;
    const rows = stats.flat.map((row, i) => {
      const d = row.depth || 0;
      const match = iaMatchOf(row);
      if (row.isGroup) {
        return `<div class="nfp-ia-row nfp-ia-parsed-row is-group" style="--i:${Math.min(i, 18)};--d:${d}" data-depth="${d}">
        <div class="nfp-ia-td nfp-ia-td--ing"><span class="nfp-ia-tree">${esc(row.raw)}</span></div>
        <div class="nfp-ia-td nfp-ia-td--mapped"></div>
        <div class="nfp-ia-td nfp-ia-td--match"></div>
      </div>`;
      }
      return `<div class="nfp-ia-row nfp-ia-parsed-row" style="--i:${Math.min(i, 18)};--d:${d}" data-depth="${d}" data-ia-id="${esc(row.id)}" data-ia-match="${match}">
        <div class="nfp-ia-td nfp-ia-td--ing"><span class="nfp-ia-tree">${esc(row.raw)}</span></div>
        <div class="nfp-ia-td nfp-ia-td--mapped"><span class="nfp-ia-mapped">${esc(row.mapped)}</span></div>
        <div class="nfp-ia-td nfp-ia-td--match">${iaMatchPill(match, row.id)}</div>
      </div>`;
    }).join('');
    return `${banner}${actions}
      <div class="nfp-ia-table nfp-ia-table--parsed">
        <div class="nfp-ia-th"><span>Ingredient</span><span>Mapped</span><span>Match</span></div>
        ${rows}
      </div>`;
  }

  function codesPanelHTML() {
    const rows = iaCodesRows();
    return `<div class="nfp-ia-table nfp-ia-table--codes">
      <div class="nfp-ia-th nfp-ia-th--codes"><span>Code</span><span>Interpretation</span><span>Score</span></div>
      ${rows.map((r, i) => `<div class="nfp-ia-row nfp-ia-code-row" style="--i:${i}">
        <div class="nfp-ia-td">${esc(r.code)}</div>
        <div class="nfp-ia-td"><span class="nfp-ia-pill nfp-ia-pill--${r.tone}">${esc(r.interp)}</span></div>
        <div class="nfp-ia-td nfp-ia-td--num"><span class="nfp-ia-score" data-countup>${r.score}</span><span class="nfp-ia-den">/100</span></div>
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
    const rows = flattenParsed(tree);
    return `<div class="nfp-ia-table nfp-ia-table--scout">
      <div class="nfp-ia-th nfp-ia-th--scout"><span>Name / alt</span><span>Mapped to</span><span>Category / Sub-category</span><span>Process</span></div>
      ${rows.map((r, i) => {
        const d = r.depth || 0;
        return `<div class="nfp-ia-row nfp-ia-scout-row${r.isGroup ? ' is-group' : ''}${d ? ' is-child' : ''}" style="--i:${Math.min(i, 18)};--d:${d}" data-depth="${d}">
        <div class="nfp-ia-td"><span class="nfp-ia-tree">${esc(r.raw)}</span></div>
        <div class="nfp-ia-td">${r.isGroup ? '' : esc(r.mapped)}</div>
        <div class="nfp-ia-td nfp-ia-td--mapstack">
          ${r.isGroup ? '' : `<span class="nfp-ia-mapped">${esc(r.cat)}</span>`}
          ${!r.isGroup && r.sub ? `<span class="nfp-ia-subcat">${esc(r.sub)}</span>` : ''}
        </div>
        <div class="nfp-ia-td">${r.isGroup ? '' : `<span class="nfp-ia-pl nfp-ia-pl--${r.pl}" title="Process level ${r.pl}">${r.pl}</span>`}</div>
      </div>`;
      }).join('')}
    </div>`;
  }

  function ingredientsHTML() {
    const err = state.errors.ingredients;
    const hasList = !!(state.ingredients || '').trim();
    const listInner = `<div class="nfp-ingred-wrap${hasList ? '' : ' is-empty'}">
      ${hasList ? '' : '<p class="nfp-ingred-lede">Paste the full list from the label — or type it here or in chat — and I\u2019ll map every nested ingredient.</p>'}
      <div class="nfp-ingred-body${err ? ' nfp-block-err' : ''}">
        <textarea class="nfp-ingred-edit" data-field="ingredients" rows="${hasList ? 1 : 5}" placeholder="${hasList ? 'Paste or type the ingredient list' : 'Water, Cane Sugar, Wheat Flour, \u2026'}">${esc(state.ingredients)}</textarea>
        ${err ? `<div class="nfp-field-note"><span class="material-symbols-outlined">error_outline</span>${esc(err)}</div>` : ''}
      </div>
      <button type="button" class="nfp-ia-analyze" id="nfp-ia-analyze-btn" data-nfp="ia-analyze">
        <span class="material-symbols-outlined">science</span>Analyze Ingredients
      </button>
    </div>`;
    const tree = parseIngredientTree(state.ingredients);
    const analyzed = state.iaRan && tree.length;
    const extras = analyzed
      ? iaAccord('parsed', 'Parsed Ingredients', parsedPanelHTML(tree), iaParsedBadges(iaMatchStats(tree)))
        + iaAccord('codes', 'Codes', codesPanelHTML())
        + iaAccord('nutrients', 'Nutrients', nutrientsPanelHTML())
        + iaAccord('scout', 'Wise Code AI Engine Flavor Results', scoutPanelHTML(tree))
      : '';
    return `<div class="nfp-ia" data-ia-tick="${state.iaTick}">
      ${listInner}
      ${extras}
    </div>`;
  }

  /* Allergens + Contains sit under the Nutrition Facts panel, not in the
     Ingredients Analyzer module. */
  function allergenTagSpansHTML() {
    if (!state.allergens.length) {
      return '<span class="nfp-allergen-empty">None declared yet</span>';
    }
    return state.allergens.map((a, i) =>
      `<span class="nfp-allergen-tag">${allergenIconHTML(a)}${esc(a)}` +
      `<button type="button" class="nfp-allergen-x" data-nfp="remove-allergen" data-arg="${i}" aria-label="Remove ${esc(a)}">` +
      `<span class="material-symbols-outlined" aria-hidden="true">close</span></button></span>`
    ).join('');
  }
  function allergenPopoverItemsHTML() {
    const opts = ALLERGENS.map((a) => {
      const on = allergenDeclared(a.name);
      return `<button type="button" class="topbar-menu-item nfp-allergen-opt${on ? ' is-on' : ''}" role="menuitemcheckbox" aria-checked="${on ? 'true' : 'false'}" data-nfp="toggle-allergen" data-arg="${esc(a.name)}">` +
        `<span class="material-symbols-outlined topbar-menu-icon">${a.icon}</span>` +
        `<span>${esc(a.name)}</span>` +
        `<span class="material-symbols-outlined nfp-allergen-check" aria-hidden="true">check</span>` +
        `</button>`;
    }).join('');
    return `<div class="nfp-allergen-pop-title">Allergens</div>${opts}` +
      `<div class="topbar-menu-divider"></div>` +
      `<button type="button" class="topbar-menu-item" data-nfp="allergen-none"><span class="material-symbols-outlined topbar-menu-icon">block</span>None</button>` +
      `<button type="button" class="topbar-menu-item" data-nfp="allergen-pop-done"><span class="material-symbols-outlined topbar-menu-icon">check</span>Done</button>`;
  }
  function allergensHTML() {
    return `<div class="nfp-decl-wrap">
      <div class="nfp-allergen-wrap">
        <div class="nfp-allergen-heading">Allergens</div>
        <div class="nfp-allergen-tags">${allergenTagSpansHTML()}
          <span class="nfp-allergen-add-wrap">
            <button type="button" class="nfp-mini-btn" data-nfp="add-allergen" aria-haspopup="menu" aria-expanded="false" aria-controls="nfp-allergen-pop"><span class="material-symbols-outlined">add</span>Add</button>
            <div class="topbar-popover nfp-allergen-pop hidden" id="nfp-allergen-pop" role="menu" aria-label="Choose allergens">${allergenPopoverItemsHTML()}</div>
          </span>
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
     The next-step banner sits in the same slot as the Non-UPF shield CTA
     (under the photo, or the full-width strip when identity lives in the
     header). Which banner you see is the step you arrived from on
     Product Portfolio — Review & Claim, Finish and Claim, Complete
     details, Verify ingredients, Add a product, or Resolve ineligible.
     Progress is five small dots, not a labelled stepper. Scorecards stay
     as a row below both columns. */
  const CLAIMED_KEY = 'wise-portfolio-claimed';
  const LIFECYCLE_STEPS = [
    { id: 'discovered', label: 'Discovered' },
    { id: 'claimed', label: 'Claimed' },
    { id: 'complete', label: 'Data complete' },
    { id: 'verify', label: 'Ingredients verified' },
    { id: 'shield', label: 'Non-UPF Verified' },
  ];
  const FROM_ALIASES = {
    discovered: 'discovered',
    claimed: 'claimed',
    complete: 'complete',
    needsinfo: 'complete',
    missing: 'complete',
    verify: 'verify',
    add: 'add',
    ineligible: 'ineligible',
    shield: 'shield',
  };
  function readClaimedList() {
    try { return JSON.parse(localStorage.getItem(CLAIMED_KEY) || '[]'); }
    catch (_) { return []; }
  }
  function isProductClaimed(upc, name) {
    const d = String(upc || '').replace(/\D/g, '');
    const n = String(name || '').trim();
    return readClaimedList().some((x) => {
      const u = String(x.upc || '').replace(/\D/g, '');
      if (u && d) return u === d;
      return !!(x.name && n && x.name === n);
    });
  }
  function rememberClaimed() {
    const upc = String(state.upc || '').replace(/\D/g, '');
    const name = (state.productName || '').trim();
    if (isProductClaimed(upc, name)) return;
    const list = readClaimedList();
    list.push({ name, upc, claimedAt: new Date().toISOString() });
    try { localStorage.setItem(CLAIMED_KEY, JSON.stringify(list)); } catch (_) {}
  }
  function applyFromParam(params) {
    const p = params || new URLSearchParams(location.search);
    const raw = String(p.get('from') || '').toLowerCase();
    state.fromKey = FROM_ALIASES[raw] || '';
    if (!state.fromKey && isFreshAdd()) state.fromKey = 'add';
    state.fromDiscovered = state.fromKey === 'discovered';
    if (state.fromKey === 'discovered') {
      const upc = String(p.get('upc') || state.upc || '').replace(/\D/g, '');
      const name = String(p.get('name') || state.productName || '').trim();
      state.brandClaimed = isProductClaimed(upc, name);
    }
  }
  function isFreshAdd() {
    const path = location.pathname || '';
    if (!/add-product\.html/.test(path)) return false;
    return !nfpIsExistingProduct();
  }
  function isClaimPending() {
    return state.fromKey === 'discovered' && !state.brandClaimed && !state.saved;
  }
  /* Real attention step (0–4). Peeking a dot only changes what the banner
     shows — it does not rewrite this. */
  function lifecycleStep() {
    if (isClaimPending()) return 1;
    if (state.fromKey === 'ineligible') return 4;
    if (state.fromKey === 'verify') {
      return state.lifecycleDone === 'verify' ? 4 : 3;
    }
    if (state.fromKey === 'complete') {
      return (state.lifecycleDone === 'complete' || state.saved) ? 3 : 2;
    }
    if (state.fromKey === 'claimed') {
      if (state.lifecycleDone === 'claimed' || state.lifecycleDone === 'complete') return 3;
      return 2;
    }
    if (state.fromKey === 'add' || isFreshAdd()) {
      return state.saved ? 3 : 2;
    }
    if (state.fromKey === 'discovered') return 4;
    return 4;
  }
  function kindForStep(step) {
    if (step <= 0) return 'discovered';
    if (step === 1) return 'claim';
    if (step === 2) {
      if (state.fromKey === 'claimed') return 'claimed';
      if (state.fromKey === 'add' || isFreshAdd()) return 'add';
      return 'complete';
    }
    if (step === 3) return 'verify';
    if (state.fromKey === 'ineligible') return 'ineligible';
    return 'shield';
  }
  function nextStepKind() {
    if (state.lifecyclePeek != null) return kindForStep(state.lifecyclePeek);
    if (state.fromKey === 'ineligible') return 'ineligible';
    if (isClaimPending()) return 'claim';
    if ((state.fromKey === 'add' || isFreshAdd()) && !state.saved) return 'add';
    return kindForStep(lifecycleStep());
  }
  function lifecycleDotsHTML() {
    const current = state.lifecyclePeek != null ? state.lifecyclePeek : lifecycleStep();
    const dots = LIFECYCLE_STEPS.map((s, i) => {
      const cls = i < current ? ' is-done' : i === current ? ' is-current' : '';
      const stateLabel = i < current ? ', complete' : i === current ? ', current' : '';
      const ariaCurrent = i === current ? ' aria-current="step"' : '';
      return `<button type="button" class="nfp-ins-dot${cls}" data-nfp="banner-step" data-arg="${i}" aria-label="${esc(s.label)}${stateLabel}"${ariaCurrent}></button>`;
    }).join('');
    return `<div class="nfp-ins-next-dots" role="navigation" aria-label="Product progress">${dots}</div>`;
  }
  function bannerShell(kind, title, desc, actionHTML) {
    return `<div class="nfp-ins-next nfp-ins-next--${esc(kind)}">
        ${lifecycleDotsHTML()}
        <div class="nfp-ins-next-body">
          <div class="nfp-ins-next-title">${title}</div>
          <div class="nfp-ins-next-desc">${desc}</div>
        </div>
        ${actionHTML}
      </div>`;
  }
  function bannerBtn(nfp, icon, label) {
    return `<button type="button" class="nfp-ins-next-btn" data-nfp="${esc(nfp)}"><span class="material-symbols-outlined">${icon}</span>${label}</button>`;
  }
  function bannerLink(href, icon, label) {
    return `<a class="nfp-ins-next-btn" href="${esc(href)}"><span class="material-symbols-outlined">${icon}</span>${label}</a>`;
  }
  function discoveredHTML() {
    return bannerShell('discovered',
      'This product was discovered',
      'We found this product in public retail data. Review the details and claim it if it is yours.',
      bannerBtn('banner-claim-step', 'bookmark_add', 'Review and claim'));
  }
  function claimHTML() {
    return bannerShell('claim',
      'Reviewing a discovered product',
      'Check the details below. If everything looks right, claim it into your portfolio.',
      bannerBtn('claim-product', 'bookmark_add', 'Everything looks right, claim this product'));
  }
  function claimedHTML() {
    return bannerShell('claimed',
      'Finishing a claimed product',
      'This product is already in your portfolio. Confirm the details below, then continue so it can be verified.',
      bannerBtn('claimed-continue', 'arrow_forward', 'Details look right, continue'));
  }
  function completeHTML() {
    return bannerShell('complete',
      'Complete the missing details',
      'A few fields are still empty. Fill them in below so this product can join your reports.',
      bannerBtn('complete-details', 'edit_note', "I've filled in the details"));
  }
  function addHTML() {
    return bannerShell('add',
      'Adding a new product',
      'Fill in the details below. When everything required is in, save it to your portfolio.',
      bannerBtn('save-product', 'save', 'Save to Portfolio'));
  }
  function verifyHTML() {
    return bannerShell('verify',
      'Verify the ingredients',
      'Walk through the ingredient list so we can confirm what is in this product before it earns a shield.',
      bannerBtn('verify-ingredients', 'fact_check', 'Verify ingredients'));
  }
  function shieldHTML() {
    return bannerShell('shield',
      'Get the Non-UPF Shield',
      'This product qualifies for Non-UPF verification. Earn the shield so it stands out on retail listings.',
      bannerLink('non-upf-dashboard.html', 'gpp_good', 'Get the Non-UPF Shield'));
  }
  function ineligibleHTML() {
    return bannerShell('ineligible',
      'This product cannot earn a shield yet',
      'Something on the label is blocking Non-UPF verification. Review the details below, or reformulate to fix it.',
      bannerLink(productReformulateHref(), 'science', 'See why and reformulate'));
  }
  function productReformulateHref() {
    const params = new URLSearchParams();
    const name = (state.productName || '').trim();
    const upc = String(state.upc || '').replace(/\D/g, '');
    if (name) params.set('name', name);
    if (upc) params.set('upc', upc);
    if (state.image) params.set('img', state.image);
    params.set('product', upc || name);
    return 'reformulation.html?' + params.toString();
  }
  function bannerHTMLForKind(kind) {
    switch (kind) {
      case 'discovered': return discoveredHTML();
      case 'claim': return claimHTML();
      case 'claimed': return claimedHTML();
      case 'complete': return completeHTML();
      case 'add': return addHTML();
      case 'verify': return verifyHTML();
      case 'ineligible': return ineligibleHTML();
      default: return shieldHTML();
    }
  }
  function nextStepHTML() {
    return bannerHTMLForKind(nextStepKind());
  }
  function peekBannerStep(i) {
    const n = Number(i);
    if (!Number.isFinite(n) || n < 0 || n >= LIFECYCLE_STEPS.length) return;
    const real = lifecycleStep();
    state.lifecyclePeek = n === real ? null : n;
    renderNFP();
  }
  function finishCompleteDetails() {
    const missing = requiredMissing();
    if (missing.length || nfErrorCount()) {
      wiseSay(`A few things still need attention: <strong>${esc(missing.map((m) => m.label).join(', ') || 'flagged nutrients')}</strong>. Want me to jump to the first one?`,
        [{ label: 'Fix it', icon: 'build', action: 'goto:' + (missing.length ? firstMissingStep() : 'nutrition') }]);
      return;
    }
    state.lifecycleDone = 'complete';
    state.lifecyclePeek = null;
    renderNFP();
    addUser("I've filled in the details");
    wiseSay(`Details look complete for <strong>${esc(state.productName)}</strong>. Next, verify the ingredients so this product can earn a Non-UPF Shield.`,
      nfpIntentChips());
  }
  function finishClaimedContinue() {
    state.lifecycleDone = 'claimed';
    state.fromKey = requiredMissing().length ? 'complete' : 'verify';
    state.lifecyclePeek = null;
    renderNFP();
    addUser('Details look right, continue');
    wiseSay(state.fromKey === 'complete'
      ? `A few fields still need a look on <strong>${esc(state.productName)}</strong>. Fill those in, then we can verify the ingredients.`
      : `Next, verify the ingredients on <strong>${esc(state.productName)}</strong> so it can earn a Non-UPF Shield.`,
      nfpIntentChips());
  }
  const IA_DOUBLE_TIER = 1;
  let iaWidthTier = IA_DOUBLE_TIER;

  function applyIaWidth() {
    const panel = document.getElementById('ia-panel');
    const btn = document.getElementById('ia-width');
    const W = window.WPaneWidth;
    if (panel) {
      if (iaWidthTier !== 4) {
        try { window.WisePaneResize && window.WisePaneResize.release && window.WisePaneResize.release([panel]); } catch (_) {}
      }
      if (W) W.applyClasses(panel, iaWidthTier, 'panel');
      else {
        panel.classList.toggle('panel-wide', iaWidthTier >= 1 && iaWidthTier < 4);
        panel.classList.toggle('panel-triple', iaWidthTier >= 2 && iaWidthTier < 4);
        panel.classList.toggle('panel-fill', iaWidthTier === 3);
        panel.classList.toggle('panel-custom', iaWidthTier === 4);
      }
    }
    if (W) W.syncButton(btn, iaWidthTier);
    else if (btn) {
      const ic = btn.querySelector('.material-symbols-outlined');
      if (ic) ic.textContent = ['width_normal', 'width_wide', 'width_wide', 'width_full', 'fit_width'][iaWidthTier];
      btn.classList.toggle('is-on', iaWidthTier >= 1);
      btn.setAttribute('aria-pressed', iaWidthTier >= 1 ? 'true' : 'false');
      btn.title = ['Width (single) — tap to widen', 'Width (double) — tap to widen', 'Width (triple) — tap to widen', 'Width (fill) — tap to widen', 'Width (custom) — drag to any size'][iaWidthTier];
    }
  }
  function setIngredientListDouble() {
    iaWidthTier = IA_DOUBLE_TIER;
    applyIaWidth();
    const panel = document.getElementById('ia-panel');
    try { window.WPaneWidth && window.WPaneWidth.saveTier(panel, IA_DOUBLE_TIER); } catch (_) {}
  }
  function revealIngredientList() {
    setIaOpen(true);
    setIngredientListDouble();
    try { window.WiseStickyModules && window.WiseStickyModules.scan(); } catch (_) {}
    const panel = iaPanelEl();
    if (panel) {
      requestAnimationFrame(() => {
        sizeIngredEdit();
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      });
    }
  }
  function applyIngredientListForArrival() {
    if (state.fromKey === 'verify') revealIngredientList();
    else setIaOpen(false);
  }
  function startVerifyFromBanner() {
    state.lifecyclePeek = null;
    revealIngredientList();
    if (!state.iaRan) {
      addUser('Verify the ingredients');
      runIngredientAnalysis(true, false);
      return;
    }
    addUser('Verify the ingredients');
    wiseSay(`The ingredient list for <strong>${esc(state.productName)}</strong> is open on the right. Confirm the mappings, then it can earn a Non-UPF Shield.`,
      nfpIntentChips());
  }
  function nfAmount(key) {
    const v = (state.nf || {})[key];
    if (v == null) return null;
    const raw = typeof v === 'object' ? v.amt : v;
    const n = parseFloat(String(raw || '').replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  function hasNutritionFacts() {
    const nf = state.nf || {};
    if (String(nf.calories || '').trim() || String(nf.servingSize || '').trim()) return true;
    return NF_ROWS.concat(NF_MICRO).some((r) => {
      const v = nf[r.key];
      return !!(v && String(v.amt || '').trim());
    });
  }
  function nutritionFillCount() {
    const nf = state.nf || {};
    let n = 0;
    if (String(nf.calories || '').trim()) n += 1;
    NF_ROWS.concat(NF_MICRO).forEach((r) => {
      const v = nf[r.key];
      if (v && String(v.amt || '').trim()) n += 1;
    });
    return n;
  }
  function nutritionQualityScore() {
    /* A single cell (e.g. calories) is not enough to score the panel —
       wait until a few nutrients are in so one edit cannot yank WISEscore. */
    if (nutritionFillCount() < 3) return null;
    let s = 62;
    const sodium = nfAmount('sodium');
    const added = nfAmount('addedSugars');
    const fiber = nfAmount('fiber');
    const protein = nfAmount('protein');
    const sat = nfAmount('satFat');
    if (sodium != null) {
      if (sodium >= 800) s -= 18;
      else if (sodium >= 400) s -= 8;
      else s += 6;
    }
    if (added != null) {
      if (added >= 10) s -= 14;
      else if (added >= 5) s -= 6;
      else s += 5;
    }
    if (fiber != null) {
      if (fiber >= 5) s += 8;
      else if (fiber >= 3) s += 4;
    }
    if (protein != null && protein >= 10) s += 6;
    if (sat != null) {
      if (sat >= 10) s -= 8;
      else if (sat >= 5) s -= 3;
    }
    return Math.max(0, Math.min(100, s));
  }
  /* Live Non-UPF / GRAS / WISEscore for the score row. A brand-new product
     has nothing to score yet, so all three stay at 0 until ingredients or
     Nutrition Facts land; each commit re-reads the current list and panel. */
  function insightScores() {
    const name = esc(state.productName || 'this product');
    const tree = parseIngredientTree(state.ingredients);
    const stats = iaMatchStats(tree);
    const leaves = stats.leaves;
    const hasIng = leaves.length > 0;

    let upf = 0;
    let upfCap = 'Add ingredients to score processing';
    let gras = 0;
    let grasCap = 'Add ingredients to screen GRAS status';
    if (hasIng) {
      const mini = leaves.filter((r) => Number(r.pl) === 1).length;
      upf = Math.round((mini / leaves.length) * 100);
      if (upf === 100) {
        upfCap = 'Minimally processed · Qualifies for the verification shield';
      } else if (upf === 0) {
        upfCap = 'No minimally processed ingredients in this list yet';
      } else {
        upfCap = mini + ' of ' + leaves.length + ' ingredients are minimally processed';
      }
      const grasN = stats.ok;
      const unclear = stats.part + stats.bad;
      gras = Math.round((grasN / leaves.length) * 100);
      grasCap = grasN + ' of ' + leaves.length + ' screened ingredients are GRAS';
      if (unclear) grasCap += ' · ' + unclear + ' flagged Unclear';
    }

    const nfQ = nutritionQualityScore();
    const parts = [];
    if (hasIng) { parts.push(upf); parts.push(gras); }
    if (nfQ != null) parts.push(nfQ);
    const wise = parts.length ? Math.round(parts.reduce((s, n) => s + n, 0) / parts.length) : 0;
    const wiseCap = parts.length ? ('for ' + name) : 'Add ingredients or Nutrition Facts to score';
    return { upf, gras, wise, upfCap, grasCap, wiseCap };
  }
  function insightsGridHTML() {
    /* Same claim-row chrome as the top scorecards on overview.html
       (.dash-claim / .dash-bignum / stamp discs) — no rating chips. */
    const s = insightScores();
    return `<section class="dash-claim nfp-ins-scores">
        <div class="dash-claim-col">
          <div class="dash-progress-pct">
            <span class="dash-pct-wrap"><span class="dash-bignum" data-countup>${s.upf}</span><span class="dash-pct">%</span></span>
            <span class="dash-bignum-cap"><strong>Non-UPF</strong><br>${s.upfCap}</span>
            <span class="dash-stamp-icon" aria-hidden="true"><span class="material-symbols-outlined">eco</span></span>
          </div>
        </div>
        <div class="dash-claim-divider"></div>
        <div class="dash-claim-col">
          <div class="dash-progress-pct">
            <span class="dash-pct-wrap"><span class="dash-bignum" data-countup>${s.gras}</span><span class="dash-pct">%</span></span>
            <span class="dash-bignum-cap"><strong>GRAS</strong><br>${s.grasCap}</span>
            <span class="dash-stamp-icon" aria-hidden="true"><span class="material-symbols-outlined">biotech</span></span>
          </div>
        </div>
        <div class="dash-claim-divider"></div>
        <div class="dash-claim-col">
          <div class="dash-bignum-row">
            <span class="dash-bignum" data-countup>${s.wise}</span>
            <span class="dash-bignum-cap"><strong>WISEscore&#8482;</strong><br>${s.wiseCap}</span>
            <span class="dash-stamp-icon" aria-hidden="true"><span class="material-symbols-outlined">verified</span></span>
          </div>
        </div>
      </section>`;
  }
  function refreshInsightsGrid() {
    const host = nfpBody && nfpBody.querySelector('.nfp-ins-scores');
    if (!host) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = insightsGridHTML();
    const next = wrap.firstElementChild;
    if (next) host.replaceWith(next);
  }
  function insightsCardsHTML() {
    return `<div class="nfp-ins">${insightsGridHTML()}</div>`;
  }
  function insightsHTML() {
    return `<div class="nfp-ins">${nextStepHTML()}${insightsGridHTML()}</div>`;
  }

  /* Product Details ⋯ menu lives in the header (.panel-controls). sticky-modules.js
     injects Share / Copy link / Export into the same popover; we add the
     compare-formats row (and, for an existing product, Delete product) once
     it exists. */
  function closeNfpMenu(pop) {
    const wrap = pop && (pop.closest('.panel-more-wrap, .pf-module-menu') || pop.__plHost);
    const btn = wrap && wrap.querySelector('.panel-more-btn, .pf-module-menu-btn');
    if (pop) pop.classList.add('hidden');
    if (btn) { btn.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }
  }
  function nfpIsExistingProduct() {
    const p = new URLSearchParams(location.search);
    const path = location.pathname || '';
    return /view-product\.html/.test(path)
      || p.get('mode') === 'edit' || p.get('edit') === '1' || p.get('view') === '1'
      || document.body.dataset.apMode === 'edit'
      || document.body.dataset.apMode === 'view';
  }
  function nfpRememberRemoved() {
    const name = (state.productName || '').trim();
    const upc = String(state.upc || '').replace(/\D/g, '');
    try {
      const key = 'wise-portfolio-removed';
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      const dup = list.some((x) => {
        const u = String(x.upc || '').replace(/\D/g, '');
        if (u && upc) return u === upc;
        return !!(x.name && name && x.name === name);
      });
      if (!dup) {
        list.push({ name, upc });
        localStorage.setItem(key, JSON.stringify(list));
      }
    } catch (_) {}
  }
  function iaPanelEl() { return document.getElementById('ia-panel'); }
  function iaIsOpen() {
    const panel = iaPanelEl();
    return !!(panel && !panel.hidden && panel.style.display !== 'none');
  }
  function syncIaOpenUi() {
    const open = iaIsOpen();
    const nfpItem = document.getElementById('nfp-ia-item');
    if (nfpItem) {
      nfpItem.classList.toggle('is-on', open);
      nfpItem.setAttribute('aria-checked', open ? 'true' : 'false');
    }
    const row = document.getElementById('modules-row');
    const existing = row && row.querySelector('[data-ia-restore]');
    if (open) {
      if (existing) existing.remove();
      return;
    }
    if (!row || existing) return;
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'wise-progress-restore';
    tab.setAttribute('data-ia-restore', '1');
    tab.title = 'Show Ingredient List';
    tab.setAttribute('aria-label', 'Show Ingredient List');
    tab.innerHTML = '<span class="material-symbols-outlined">chevron_left</span><span class="wpr-label">Ingredient List</span>';
    tab.addEventListener('click', (e) => { e.stopPropagation(); setIaOpen(true); });
    row.appendChild(tab);
  }
  function setIaOpen(on) {
    const panel = iaPanelEl();
    if (!panel) return;
    panel.hidden = !on;
    if (on) panel.style.removeProperty('display');
    else panel.style.display = 'none';
    syncIaOpenUi();
  }
  function installIaCloseMenu() {
    const panel = iaPanelEl();
    if (!panel) return;
    let done = false;
    function tryInject() {
      if (done) return true;
      const pop = document.getElementById('ia-menu')
        || panel.querySelector('.panel-more-wrap .topbar-popover');
      if (!pop) return false;
      if (!pop.querySelector('#ia-close-item')) {
        pop.insertAdjacentHTML('beforeend',
          '<div class="topbar-menu-divider"></div>'
          + '<button type="button" class="topbar-menu-item topbar-menu-item--danger" id="ia-close-item" role="menuitem">'
          + '<span class="material-symbols-outlined topbar-menu-icon">close</span>'
          + '<span>Close pane</span>'
          + '</button>');
        pop.querySelector('#ia-close-item').addEventListener('click', (e) => {
          e.stopPropagation();
          closeNfpMenu(pop);
          setIaOpen(false);
        });
      }
      done = true;
      return true;
    }
    if (tryInject()) return;
    const obs = new MutationObserver(() => { if (tryInject()) obs.disconnect(); });
    obs.observe(panel, { childList: true, subtree: true });
    let tries = 0;
    const iv = setInterval(() => { if (tryInject() || ++tries > 60) clearInterval(iv); }, 120);
  }
  function nfpDeleteCurrentProduct() {
    const name = esc(state.productName || 'this product');
    nfpRememberRemoved();
    addUser('Delete ' + (state.productName || 'this product'));
    wiseSay('Removed <strong>' + name + '</strong> from your portfolio. Taking you back.');
    setTimeout(() => { window.location.href = 'product-portfolio.html'; }, 720);
  }
  function installNfpLayoutMenuItems() {
    const panel = document.getElementById('nfp-panel');
    if (!panel) return;
    let done = false;
    function tryInject() {
      if (done) return true;
      const pop = document.getElementById('nfp-menu')
        || panel.querySelector('.panel-more-wrap .topbar-popover, .pf-module-menu .pf-module-menu-pop');
      if (!pop) return false;
      if (!pop.querySelector('#nfp-compare-item')) {
        pop.insertAdjacentHTML('beforeend',
          '<div class="topbar-menu-divider"></div>'
          + '<button type="button" class="topbar-menu-item sc-mcp-item" id="nfp-compare-item" role="menuitemcheckbox" aria-checked="false">'
          + '<span class="material-symbols-outlined topbar-menu-icon">view_column</span>'
          + '<span>Compare formats side by side</span>'
          + '<span class="sc-switch" aria-hidden="true"></span>'
          + '</button>');
        const item = pop.querySelector('#nfp-compare-item');
        const sync = () => {
          item.classList.toggle('is-on', state.nfpCompare);
          item.setAttribute('aria-checked', state.nfpCompare ? 'true' : 'false');
        };
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          state.nfpCompare = !state.nfpCompare;
          sync();
          closeNfpMenu(pop);
          renderNFP();
        });
        sync();
      }
      if (!pop.querySelector('#nfp-ia-item')) {
        pop.insertAdjacentHTML('beforeend',
          '<div class="topbar-menu-divider"></div>'
          + '<button type="button" class="topbar-menu-item sc-mcp-item" id="nfp-ia-item" role="menuitemcheckbox" aria-checked="true">'
          + '<span class="material-symbols-outlined topbar-menu-icon">science</span>'
          + '<span>Ingredient List</span>'
          + '<span class="sc-switch" aria-hidden="true"></span>'
          + '</button>');
        const item = pop.querySelector('#nfp-ia-item');
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          setIaOpen(!iaIsOpen());
          closeNfpMenu(pop);
        });
        syncIaOpenUi();
      }
      if (nfpIsExistingProduct() && !pop.querySelector('#nfp-delete-item')) {
        pop.insertAdjacentHTML('beforeend',
          '<div class="topbar-menu-divider"></div>'
          + '<button type="button" class="topbar-menu-item topbar-menu-item--danger" id="nfp-delete-item" role="menuitem">'
          + '<span class="material-symbols-outlined topbar-menu-icon">delete</span>'
          + '<span>Delete product</span>'
          + '</button>');
        pop.querySelector('#nfp-delete-item').addEventListener('click', (e) => {
          e.stopPropagation();
          closeNfpMenu(pop);
          nfpDeleteCurrentProduct();
        });
      }
      const haveCompare = !!pop.querySelector('#nfp-compare-item');
      const haveIa = !!pop.querySelector('#nfp-ia-item');
      const haveDelete = !nfpIsExistingProduct() || !!pop.querySelector('#nfp-delete-item');
      if (haveCompare && haveIa && haveDelete) { done = true; return true; }
      return false;
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
      if (wrap.contains(e.target) || pop.contains(e.target)) return;
      closeNfpMenu(pop);
    });
  }

  /* ── Single-pane column resize ─────────────────────────────────────────
     Three columns (photo · Nutrition Facts · ingredients) can be drag-resized
     along the seams — same grip language as js/pane-resize.js. Widths are
     remembered as fractions. Below 900px of module width the columns stack
     and the splitters hide, so a medium or narrow module never traps the
     user in skinny panes. Double-click a seam to reset. */
  const NFP_COL_KEY = 'wise-nfp-cols-v4';
  const NFP_COL_KEY_2 = 'wise-nfp-cols-noidentity-v1';
  const NFP_COL_BP = 900;
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
    /* Flipped layout renders the columns right-to-left relative to the [facts,
       ingred] element order, so a seam drag must move the opposite way. */
    if (sp.classList.contains('nfp-sp--flip')) dxPx = -dxPx;
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
        const flipped = sp.classList.contains('nfp-sp--flip');
        const startW = cols.map((c) => c.getBoundingClientRect().width);
        document.documentElement.classList.add('nfp-col-dragging');
        split.classList.add('is-on');
        try { split.setPointerCapture(e.pointerId); } catch (_) {}
        const move = (ev) => {
          const dx = (ev.clientX - startX) * (flipped ? -1 : 1);
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

  /* Shared module scroll: ingredients grow with the tree; Nutrition Facts
     sticks in the right column so it never rides above the module top. */
  let nfpIaHeightRo = null;
  function syncIngredColHeight() {
    const sp = nfpBody && nfpBody.querySelector('.nfp-sp');
    if (!sp) return;
    const ingred = sp.querySelector('.nfp-sp-ingred');
    if (!ingred) return;
    /* Shared module scroll: the ingredients column grows with the tree and
       the Nutrition Facts column sticks. Do not lock a nested scroller. */
    ingred.style.removeProperty('--nfp-ia-h');
    ingred.classList.remove('has-ia-h');
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
    closeAllergenPopover();
    if (!nfpBody) return;
    const helixKeep = [];
    const prevHelix = nfpBody.querySelector('.nfp-fi-strip-photo--helix');
    if (prevHelix) {
      prevHelix.querySelectorAll(':scope > .sc-bganim-canvas, :scope > .wch-helix-card').forEach((el) => helixKeep.push(el));
    }
    if (state.nfpCompare) {
      /* Compare takes precedence over the single/double-pane layout: the whole
         body becomes the side-by-side matrix of every format. */
      nfpBody.innerHTML = compareHTML();
      syncNfpHeaderPhoto();
      syncNfpHelixBg();
      updateSaveState();
      renderIA();
      return;
    }
    if (state.nfpWide) {
      /* Double-pane: LEFT = category + Nutrition Facts + allergens/contains;
         RIGHT = the product photo column with the gallery + UPC overlaid. */
      nfpBody.innerHTML =
        `<div class="nfp-cols">
          <div class="nfp-col-left">${categoryHTML()}${nutritionHTML()}${allergensHTML()}${packFormatsHTML()}${packNfSectionHTML()}${insightsHTML()}</div>
          <div class="nfp-col-right">${rightColumnHTML()}</div>
        </div>`;
    } else {
      /* Product Details is identity + facts + allergens. Ingredients live in
         the sibling Ingredients Analyzer module (#ia-panel). */
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
          `<div class="nfp-sp nfp-sp--noidentity nfp-sp--flip nfp-sp--facts-only">
            <div class="nfp-sp-facts">
              <div class="nfp-sp-strip nfp-sp-strip--folded">${strip}</div>
              <div class="nfp-sp-shield nfp-sp-shield--folded">${nextStepHTML()}</div>
              <div class="nfp-sp-facts-pin">${facts}${allergensHTML()}</div>
            </div>
          </div><div class="nfp-ins">${insightsGridHTML()}</div>`;
      } else {
        nfpBody.innerHTML =
          `<div class="nfp-sp nfp-sp--facts-only">
            <div class="nfp-sp-strip">${strip}</div>
            <div class="nfp-sp-media">${media}${nextStepHTML()}</div>
            <div class="nfp-sp-facts"><div class="nfp-sp-facts-pin">${facts}${allergensHTML()}</div></div>
          </div>${insightsCardsHTML()}`;
      }
    }
    const nextHelix = nfpBody.querySelector('.nfp-fi-strip-photo--helix');
    if (nextHelix && helixKeep.length) {
      helixKeep.forEach((el) => nextHelix.appendChild(el));
      nextHelix.classList.add('sc-bganim-live');
      requestAnimationFrame(() => {
        try {
          if (nfpHelix && typeof nfpHelix.resize === 'function') nfpHelix.resize();
          nfpHelix && nfpHelix.redraw();
        } catch (_) {}
      });
    } else {
      syncNfpHelixBg();
    }
    syncNfpHeaderPhoto();
    updateSaveState();
    renderIA();
  }

  function renderIA() {
    if (!iaBody) return;
    iaBody.innerHTML = ingredientsHTML();
    requestAnimationFrame(() => { sizeIngredEdit(); refreshIaNudgeToast(); });
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

  /* Guided-flow step completion — drives next-step prompts and leftover chips
     in the transcript. There is no side progress pane on Add / View Product. */
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
  function nfErrorCount() { return Object.keys(state.errors).filter((k) => k.startsWith('nf.')).length; }

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
    if (status) { status.title = ''; status.hidden = false; }
    const claimPending = isClaimPending();
    const saveLabel = claimPending
      ? '<span class="material-symbols-outlined">bookmark_add</span>Claim this product'
      : '<span class="material-symbols-outlined">save</span>Save to Portfolio';
    if (state.saved) {
      if (status) status.innerHTML = claimPending || state.fromDiscovered
        ? '<span class="material-symbols-outlined" style="color:var(--sec-green)">check</span><span>Claimed into portfolio</span>'
        : '<span class="material-symbols-outlined" style="color:var(--sec-green)">check</span><span>Saved to portfolio</span>';
      btn.innerHTML = '<span class="material-symbols-outlined">check</span>' + (state.fromDiscovered ? 'Claimed' : 'Saved');
    } else if (ready) {
      if (status) status.innerHTML = claimPending
        ? '<span class="material-symbols-outlined" style="color:var(--sec-green)">task_alt</span><span>Ready to claim</span>'
        : '<span class="material-symbols-outlined" style="color:var(--sec-green)">task_alt</span><span>Ready to save</span>';
      btn.innerHTML = saveLabel;
    } else if (errs) {
      if (status) status.innerHTML = `<span class="material-symbols-outlined" style="color:var(--sec-red)">error_outline</span><span>${errs} field${errs > 1 ? 's' : ''} need attention</span>`;
      btn.innerHTML = saveLabel;
    } else {
      if (status) { status.innerHTML = ''; status.hidden = true; }
      btn.innerHTML = saveLabel;
    }
  }
  function persistPortfolioRecord() {
    const record = {
      id: 'ap-' + Date.now(),
      name: state.productName, brand: state.brand, category: state.category,
      description: state.description, price: state.price,
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
  }
  function doClaim() {
    const missing = requiredMissing();
    if (missing.length || nfErrorCount()) {
      wiseSay(`Before I can claim this, a few things still need attention: <strong>${esc(missing.map((m) => m.label).join(', ') || 'flagged nutrients')}</strong>. Want me to jump to the first one?`,
        [{ label: 'Fix it', icon: 'build', action: 'goto:' + (missing.length ? firstMissingStep() : 'nutrition') }]);
      return;
    }
    persistPortfolioRecord();
    rememberClaimed();
    state.brandClaimed = true;
    state.saved = true;
    state.step = 'save';
    state.done.save = true;
    renderNFP();
    addUser('Everything looks right, claim this product');
    wiseSay(`Claimed — <strong>${esc(state.productName)}</strong> is now in your <strong>${esc(state.brand)}</strong> portfolio. It qualifies for the Non-UPF Shield whenever you are ready to verify it.`,
      [
        { label: 'Get the Non-UPF Shield', icon: 'gpp_good', action: 'shield' },
        { label: 'Back to portfolio', icon: 'inventory_2', action: 'exit' },
      ]);
  }
  function doSave() {
    if (isClaimPending()) { doClaim(); return; }
    const missing = requiredMissing();
    if (missing.length || nfErrorCount()) {
      wiseSay(`Before I can save, a few things still need attention: <strong>${esc(missing.map((m) => m.label).join(', ') || 'flagged nutrients')}</strong>. Want me to jump to the first one?`,
        [{ label: 'Fix it', icon: 'build', action: 'goto:' + (missing.length ? firstMissingStep() : 'nutrition') }]);
      return;
    }
    persistPortfolioRecord();
    state.saved = true;
    state.step = 'save';
    state.done.save = true;
    renderNFP();
    addUser('Save it to my portfolio');
    wiseSay(`Done — <strong>${esc(state.productName)}</strong> is saved to your <strong>${esc(state.brand)}</strong> portfolio. It'll show under <strong>Claimed → Needs Info</strong> until ingredients are verified. Want to verify them now, add another, or head back?`,
      [
        { label: 'Verify ingredients', icon: 'fact_check', action: 'verify-ingredients' },
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
    if (/^packs\.\d+\.(label|upc|price)$/.test(path)) {
      const parts = path.split('.'); // packs, i, [label|upc|price]
      const pack = state.packs[Number(parts[1])];
      const which = parts[2] === 'upc' ? 'UPC' : parts[2] === 'price' ? 'price' : 'size / count';
      return which + ' (' + ((pack && pack.label) || 'pack') + ')';
    }
    const MAP = {
      productName: 'product name', description: 'product description', price: 'price',
      category: 'category', ingredients: 'ingredient list',
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
    else if (path === 'description') { state.description = clipDesc(value); label = 'Product description'; }
    else if (path === 'price') { state.price = formatPrice(value); label = 'Price'; }
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
    else if (/^packs\.\d+\.(label|upc|price)$/.test(path)) {
      const parts = path.split('.'); // packs, i, [label|upc|price]
      const i = Number(parts[1]);
      const pack = state.packs[i];
      if (pack) {
        if (parts[2] === 'upc') { pack.upc = value.replace(/[^0-9]/g, ''); label = 'Pack UPC · ' + (pack.label || 'pack'); }
        else if (parts[2] === 'price') { pack.price = formatPrice(value); label = 'Price · ' + (pack.label || 'pack'); }
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
    if (opts.inPlace) { clearNfFieldVisual(path); updateSaveState(); refreshInsightsGrid(); }
    else { renderNFP(); }
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
  /* Step prompts carry leftover unused fields as chips so you can jump
     without a side progress list. Confirmations and panel replies stay
     on their own chips. */
  function sayStep(html, chips) {
    const row = chips || [];
    addWISEcodeAI(html, row.concat(leftoverStepChips(state.step, row)));
  }
  function promptStep(id) {
    state.step = id;
    state.awaiting = null;
    switch (id) {
      case 'photo':
        sayStep('Let\'s start with a <strong>product photo</strong>. Upload one, snap it, or paste a URL — you can also just tell me the product name to keep going.',
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
        sayStep('Now the <strong>ingredient list</strong>. Paste it as text, upload a label photo and I\'ll read it, or type it in.',
          [
            { label: 'Upload label photo', icon: 'document_scanner', action: 'labelUpload' },
            { label: 'Paste / type list', icon: 'edit', action: 'field:ingredients' },
          ]);
        break;
      case 'nutrition':
        sayStep('Time for the <strong>Nutrition Facts</strong>. Upload the panel and I\'ll parse it, or fill the values directly in <strong>Product Details</strong> on the right — I\'ll flag anything I can\'t read.',
          [
            { label: 'Upload NFP photo', icon: 'document_scanner', action: 'labelUpload' },
            { label: 'I\'ll type it in', icon: 'edit', action: 'focusNf' },
          ]);
        break;
      case 'allergens':
        sayStep('Any <strong>allergens</strong> to declare? Pick from the list — you can select as many as you want — or tell me there are none.',
          allergenIntentChips());
        break;
      case 'upc':
        promptUpc();
        break;
      case 'photos':
        sayStep('Want to add <strong>more product images</strong> — angles, packaging, lifestyle shots? Add as many as you like, or move on.',
          [
            { label: 'Add images', icon: 'add_photo_alternate', action: 'photosUpload' },
            { label: 'That\'s enough', icon: 'check', action: 'skip:photos' },
          ]);
        break;
      case 'save': {
        const missing = requiredMissing();
        if (missing.length || nfErrorCount()) {
          sayStep(`We\'re almost there. Still needed before saving: <strong>${esc(missing.map((m) => m.label).join(', ') || 'fix flagged nutrients')}</strong>.`,
            [{ label: 'Fix the first one', icon: 'build', action: 'goto:' + firstMissingStep() }]);
        } else {
          sayStep('Everything required is in and nothing\'s flagged. Ready when you are — save from the banner, or save from here. Until you save, this stays a draft.',
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
    maybeAdvanceAfter();
  }

  /* Category prompt: offers the taxonomy's top categories as one-tap chips (the
     same list the panel's dropdown carries) plus a "type my own" escape hatch,
     so category options show up in BOTH the chat and the panel. */
  function promptCategory(lead) {
    state.awaiting = null;
    const chips = CATEGORIES.slice(0, 6).map((c) => ({ label: c, icon: 'sell', action: 'setCat', arg: c }));
    chips.push({ label: 'Type my own', icon: 'edit', action: 'field:category' });
    sayStep(lead || 'What <strong>category</strong> does this product belong to? Pick one below or type your own.', chips);
  }

  /* UPC-specific prompt: TYPING is the primary path — the chat input is armed
     (state.awaiting = 'upc') and focused so the next thing typed is captured as
     the UPC number. Scanning a barcode photo and skipping are secondary chips,
     so nobody is funnelled into an image upload when they just want to key in a
     number. */
  function promptUpc() {
    state.awaiting = 'upc';
    sayStep('What\u2019s the <strong>UPC / barcode number</strong>? Type the 12 digits right here in the chat and I\u2019ll build a clean barcode on the panel. No number handy? Scan a barcode photo or skip for now.',
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
        allergens: 'Type an allergen, or pick from the list…',
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
      `<div class="sc-line sc-line-you">${youAvatarSpan()}<div class="sc-line-body">${esc(name || 'File')}<div class="ap-file-chip"><span class="material-symbols-outlined">${fileIconFor(kind)}</span><span>${esc(kind || 'File')}</span></div><div class="sc-line-meta"><span class="sc-line-time">${esc(nowLabel())}</span></div></div></div>`);
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
      renderNFP();
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
      renderNFP();
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
        renderNFP();
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
        renderNFP();
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
    renderNFP();
    wiseSay('Nice — that\'s the primary photo. ' + (state.productName ? '' : 'What\'s the product called?'),
      state.productName
        ? [{ label: 'Save changes', icon: 'save', action: 'goto:save', primary: true }, { label: 'Back to portfolio', icon: 'inventory_2', action: 'exit' }]
        : [{ label: 'Type the name', icon: 'edit', action: 'field:productName' }]);
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
    scrim.className = 'dash-modal-scrim dash-modal-scrim--panel';
    const modal = document.createElement('div');
    modal.className = 'dash-modal dash-modal--panel';
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
    const alreadyOpen = scrim.classList.contains('is-open');
    modal.setAttribute('aria-label', title);
    let draft = '';      // data URL (upload) or remote URL (pasted)
    let draftName = '';  // file name carried into the transcript chip

    if (!alreadyOpen) {
      addUser(replacing ? 'Replace the product photo.' : 'Add a product photo.');
      wiseSay(replacing
        ? 'Opened the photo editor — drop in a new image, upload a file, or paste a URL, then save. I\u2019ll swap it on the panel as soon as you confirm.'
        : 'Opened the photo editor — drop in an image, upload a file, or paste a URL, then save. I\u2019ll place it on the panel as soon as you confirm.',
        [
          { label: 'Edit the Nutrition Facts', icon: 'edit', action: 'focusNf' },
          { label: 'Save changes', icon: 'save', action: 'goto:save', primary: true },
        ]);
    }

    modal.innerHTML = `
      <header class="dash-modal-head">
        <div class="dash-modal-titles">
          <span class="dash-modal-eyebrow">Product photo</span>
          <h2 class="dash-modal-title">${esc(title)}</h2>
        </div>
        <button class="dash-modal-close" type="button" data-photo-close aria-label="Close"><span class="material-symbols-outlined">close</span></button>
      </header>
      <div class="dash-modal-body">
        <div class="dash-banner-preview dash-banner-preview--photo" id="ap-photo-preview-img-wrap">
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
          <button class="wise-btn wise-btn--ghost" type="button" data-photo-close>Cancel</button>
          <button class="wise-btn wise-btn--primary" type="button" data-photo-save disabled><span class="material-symbols-outlined">check</span>${replacing ? 'Replace photo' : 'Add photo'}</button>
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
      ['vitaminD', 'calcium', 'iron', 'potassium'].forEach((k) => {
        state.nf[k] = { amt: '', dv: '' };
      });
      state.errors = Object.assign({}, state.errors, p.errors);
      renderNFP();
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
      if (p.brand) state.brand = p.brand;
      if (p.brandLogo != null) state.brandLogo = p.brandLogo;
      state.ingredients = p.ingredients;
      state.contains = p.contains;
      state.allergens = p.allergens.slice();
      state.done.allergens = true;
      if (p.upc) state.upc = p.upc;
      Object.assign(state.nf, JSON.parse(JSON.stringify(p.nf)));
      // URL sources give clean nutrition — no errors here.
      renderNFP();
      addWISEcodeAI('Pulled that product page in — photo, name, category, ingredients, allergens and full Nutrition Facts are all in <strong>Product Details</strong>. Give it a look and edit anything that\'s off. Add a UPC and more photos, then save.',
        [
          { label: 'Add a UPC', icon: 'qr_code_2', action: 'field:upc' },
          { label: 'Add more photos', icon: 'add_photo_alternate', action: 'photosUpload' },
          { label: 'Review & save', icon: 'save', action: 'goto:save' },
        ]);
    }, 1000);
  }

  /* ─────────────────────────── allergens ─────────────────────────── */
  function syncAllergenPopoverChecks() {
    const pop = document.getElementById('nfp-allergen-pop');
    if (!pop) return;
    pop.querySelectorAll('[data-nfp="toggle-allergen"]').forEach((btn) => {
      const on = allergenDeclared(btn.dataset.arg);
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  }
  /* Refresh the tag row (and popover checks) without wiping Product Details,
     so the allergen picker can stay open while the user selects several. */
  function paintAllergenUi() {
    const row = nfpBody && nfpBody.querySelector('.nfp-allergen-tags');
    if (!row) return false;
    const wrap = row.querySelector('.nfp-allergen-add-wrap');
    row.querySelectorAll('.nfp-allergen-tag, .nfp-allergen-empty').forEach((el) => el.remove());
    const html = allergenTagSpansHTML();
    if (wrap) wrap.insertAdjacentHTML('beforebegin', html);
    else row.insertAdjacentHTML('afterbegin', html);
    syncAllergenPopoverChecks();
    return true;
  }
  function refreshAllergenPanel() {
    if (!paintAllergenUi()) renderNFP();
  }
  function closeAllergenPopover() {
    const pop = document.getElementById('nfp-allergen-pop');
    if (pop && !pop.classList.contains('hidden')) pop.classList.add('hidden');
    const btn = nfpBody && nfpBody.querySelector('[data-nfp="add-allergen"]');
    if (btn) {
      btn.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    }
  }
  function openAllergenPopover() {
    const btn = nfpBody && nfpBody.querySelector('[data-nfp="add-allergen"]');
    const pop = document.getElementById('nfp-allergen-pop');
    if (!btn || !pop) return;
    document.querySelectorAll('.topbar-popover:not(.hidden)').forEach((p) => {
      if (p !== pop) p.classList.add('hidden');
    });
    syncAllergenPopoverChecks();
    pop.classList.remove('hidden');
    btn.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
  }
  function promptAllergens(opts) {
    opts = opts || {};
    if (opts.userText) addUser(opts.userText);
    state.awaiting = 'allergens';
    if (inputEl) {
      inputEl.placeholder = 'Type an allergen, or pick from the list…';
      inputEl.focus();
    }
    wiseSay(opts.question || 'Which allergen do you want to add? Pick as many as you need from the list on the panel, or tap them here.',
      allergenIntentChips());
    openAllergenPopover();
  }
  function addAllergen(name) {
    name = canonicalAllergenName(name);
    if (!name) return;
    if (!allergenDeclared(name)) state.allergens.push(name);
    state.done.allergens = true;
    refreshAllergenPanel();
  }
  function toggleAllergen(name) {
    name = canonicalAllergenName(name);
    if (!name) return;
    const i = state.allergens.findIndex((a) => a.toLowerCase() === name.toLowerCase());
    if (i >= 0) state.allergens.splice(i, 1);
    else state.allergens.push(name);
    state.done.allergens = true;
    refreshAllergenPanel();
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
      price: '',
      servingSize: nf.servingSize,
      servingsPer: '',
      calories: nf.calories,
      nf,
    };
    state.packs.push(pack);
    state.activePack = state.packs.length - 1;
    state.view = 'pack';
    renderNFP();
    return pack;
  }
  function packDeleteAffordanceHTML(i, label) {
    const name = label || 'Size';
    return `<button type="button" class="nfp-fi-thumb-del" data-nfp="del-pack" data-arg="${i}" aria-label="Delete ${esc(name)}" aria-haspopup="dialog" aria-expanded="false"><span class="material-symbols-outlined" aria-hidden="true">delete</span></button>`;
  }
  function packDeletePopHTML(i, label) {
    const name = label || 'Size';
    return `<div class="topbar-popover nfp-fi-thumb-del-pop hidden" data-nfp="del-pack-hold" role="dialog" aria-label="Delete this size?">
      <div class="nfp-fi-thumb-del-pop-title">Delete this size?</div>
      <p class="nfp-fi-thumb-del-pop-text">This permanently removes <strong>${esc(name)}</strong> from this product — its barcode, Nutrition Facts, and photo. You can&rsquo;t undo this.</p>
      <div class="nfp-fi-thumb-del-pop-acts">
        <button type="button" class="nfp-fi-thumb-del-keep" data-nfp="del-pack-cancel">Keep</button>
        <button type="button" class="nfp-fi-thumb-del-go" data-nfp="del-pack-confirm" data-arg="${i}">Delete</button>
      </div>
    </div>`;
  }
  function closePackDeleteConfirm() {
    document.querySelectorAll('.nfp-fi-thumb.is-del-open').forEach((el) => {
      el.classList.remove('is-del-open');
      const btn = el.querySelector('[data-nfp="del-pack"]');
      const pop = el.querySelector('.nfp-fi-thumb-del-pop');
      if (btn) btn.setAttribute('aria-expanded', 'false');
      if (pop) pop.classList.add('hidden');
    });
  }
  function openPackDeleteConfirm(arg) {
    const i = Number(arg);
    const panel = document.getElementById('nfp-panel');
    const btn = panel && panel.querySelector(`[data-nfp="del-pack"][data-arg="${i}"]`);
    const thumb = btn && btn.closest('.nfp-fi-thumb');
    const pop = thumb && thumb.querySelector('.nfp-fi-thumb-del-pop');
    if (!thumb || !pop) return;
    const already = thumb.classList.contains('is-del-open');
    closePackDeleteConfirm();
    if (already) return;
    thumb.classList.add('is-del-open');
    pop.classList.remove('hidden');
    btn.setAttribute('aria-expanded', 'true');
  }
  function confirmDeletePack(arg) {
    const i = Number(arg);
    if (isNaN(i) || !state.packs[i]) return;
    const p = state.packs[i];
    const label = (p.label || '').trim() || 'Size';
    const wasActive = state.view === 'pack' && state.activePack === i;
    const wasAwaiting = state.awaiting === 'packSize' && wasActive;
    state.packs.splice(i, 1);
    const nextErrors = {};
    Object.keys(state.errors).forEach((k) => {
      const m = /^packs\.(\d+)\.(.*)$/.exec(k);
      if (!m) { nextErrors[k] = state.errors[k]; return; }
      const idx = Number(m[1]);
      if (idx === i) return;
      const ni = idx > i ? idx - 1 : idx;
      nextErrors['packs.' + ni + '.' + m[2]] = state.errors[k];
    });
    state.errors = nextErrors;
    if (!state.packs.length) {
      state.view = 'product';
      state.activePack = 0;
    } else if (state.view === 'pack') {
      if (state.activePack > i) state.activePack -= 1;
      else if (state.activePack >= state.packs.length) state.activePack = state.packs.length - 1;
    } else if (state.activePack > i) {
      state.activePack -= 1;
    }
    if (wasAwaiting) {
      state.awaiting = null;
      if (inputEl) inputEl.placeholder = 'Type a value, paste a URL, or ask me anything…';
    }
    closePackDeleteConfirm();
    renderNFP();
    addUser('Delete the ' + label + ' size');
    wiseSay(
      `Removed the <strong>${esc(label)}</strong> size — its barcode, Nutrition Facts, and photo are gone.` +
      (state.packs.length
        ? ' The other sizes are still here.'
        : ' This product is back to a single size.'),
      nfpIntentChips());
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
      renderNFP();
      addWISEcodeAI(`Scanned the pack barcode — UPC <strong>${esc(formatUpc(digits))}</strong> is set on the <strong>${esc((p && p.label) || 'pack')}</strong> format.`,
        [{ label: 'Done with packs', icon: 'check', action: 'packsDone', primary: true }]);
    }, 900);
  }

  /* ─────────────────────────── chip / click dispatch ─────────────────────────── */
  function dispatch(action, arg, echoUser) {
    const echo = echoUser !== false;
    if (!action) return;
    if (action.startsWith('field:')) {
      const f = action.slice(6);
      if (echo) {
        if (f === 'upc') { addUser('Enter the UPC'); promptUpc(); return; }
        if (f === 'allergens') { addUser('I\'ll type it'); promptAllergens(); return; }
      } else {
        if (f === 'upc') { promptUpc(); return; }
        if (f === 'allergens') { promptAllergens(); return; }
      }
      const FIELD_ASK = {
        productName: 'What should the product name be?',
        category: 'What category should this be? (e.g. Bakery \u203a Muffins)',
        ingredients: 'Paste or type the full ingredient list and I\u2019ll update it.',
        allergens: 'Which allergen do you want to add?',
      };
      if (echo) addUser('I\'ll type it');
      promptFor(f, FIELD_ASK[f]); return;
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
      case 'noAllergens': addUser('No allergens'); state.allergens = []; state.done.allergens = true; refreshAllergenPanel(); addSysNote('No allergens declared.', 'edit'); maybeAdvanceAfter(); break;
      case 'allergensDone': addUser('Done with allergens'); closeAllergenPopover(); state.done.allergens = true; maybeAdvanceAfter(); break;
      case 'focusNf': if (echo) addUser('I\'ll type it in the panel'); focusFirstNfError(); break;
      case 'addPack': startAddPack(); break;
      case 'packPhoto': addUser('Upload a pack photo'); openPicker('pack'); break;
      case 'packUpc': addUser('Scan the pack barcode'); openPicker('packUpc'); break;
      case 'packSize': addUser('Set the size / count'); promptFor('packSize', 'What size or count is this pack? (e.g. 12-pack, 12 oz)'); break;
      case 'packNf': addUser('Fill the pack Nutrition Facts'); focusPackNf(); break;
      case 'packsDone': addUser('Done with pack formats'); addSysNote('Pack formats saved.', 'inventory_2'); break;
      case 'askHelp': startWhatCanIAsk(); break;
      case 'save': doSave(); break;
      case 'claim': doClaim(); break;
      case 'complete-details': finishCompleteDetails(); break;
      case 'verify-ingredients': startVerifyFromBanner(); break;
      case 'claimed-continue': finishClaimedContinue(); break;
      case 'reformulate': window.location.href = productReformulateHref(); break;
      case 'shield': window.location.href = 'non-upf-dashboard.html'; break;
      case 'restart': restart(); break;
      case 'exit': window.location.href = 'product-portfolio.html'; break;
      case 'ia-review': reviewIaMappings(echo); break;
      case 'ia-analyze': runIngredientAnalysis(true, echo); break;
      case 'ia-confirm': confirmIaRow(arg, echo); break;
      case 'ia-confirm-all': confirmAllIaRows(echo); break;
      case 'ia-lookup': lookupUnmatchedIa(echo); break;
      case 'ia-test-codes': testIaCodes(echo); break;
      case 'ia-test-scout': testIaScout(echo); break;
      case 'ia-open-parsed': openIaSection('parsed', echo); break;
      case 'ia-open-nutrients': openIaSection('nutrients', echo); break;
      case 'ia-browser': window.location.href = 'ingredient-browser.html'; break;
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
      renderNFP();
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
      closeAllergenPopover();
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

  /* Typing a distinctive word from a live NFP intent chip plays that chip —
     same contract as the shared chat module. */
  function matchNfpChip(text) {
    const raw = String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (raw.length < 4) return null;
    const catalog = nfpIntentChips().concat([
      { label: 'Analyze ingredients', ask: 'Analyze the ingredients', action: 'ia-analyze' },
      { label: 'Re-analyze ingredients', ask: 'Re-analyze the ingredients', action: 'ia-analyze' },
      { label: 'Review mappings', ask: 'Review mappings', action: 'ia-review' },
      { label: 'Confirm matched ingredients', ask: 'Confirm matched ingredients', action: 'ia-confirm-all' },
      { label: 'Look up unmatched ingredients', ask: 'Look up unmatched ingredients', action: 'ia-lookup' },
      { label: 'Test code scores', ask: 'Test the code scores', action: 'ia-test-codes' },
      { label: 'Test Wise Code AI', ask: 'Test Wise Code AI results', action: 'ia-test-scout' },
      { label: 'Show nutrients', ask: 'Show the nutrients table', action: 'ia-open-nutrients' },
      { label: 'Show parsed ingredients', ask: 'Show parsed ingredients', action: 'ia-open-parsed' },
    ]);
    let best = null;
    let bestLen = 0;
    catalog.forEach((c) => {
      ['ask', 'label'].forEach((k) => {
        const phrase = String(c[k] || '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (phrase.length < 4) return;
        if (raw === phrase || raw.includes(phrase) || (raw.split(' ').length >= 2 && phrase.includes(raw))) {
          if (phrase.length > bestLen) { bestLen = phrase.length; best = c; }
        }
      });
    });
    return best;
  }

  function interpret(text) {
    const t = text.toLowerCase();
    if (/^https?:\/\//i.test(text) || /www\./i.test(text)) { simulateUrlParse(text); return; }
    if (/^\d[\d\s-]{6,}$/.test(text)) { commitField('upc', text, { silent: true }); addSysNote('UPC captured.', 'edit'); wiseSay('Got the UPC — rendered it on the panel.'); maybeAdvanceAfter(); return; }
    const nfpHit = matchNfpChip(text);
    if (nfpHit) { dispatch(nfpHit.action, nfpHit.arg, false); return; }
    if (/(analy[sz]e|parse).*(ingredient|list)|ingredient.*(analy[sz]e|parse)/.test(t)) {
      runIngredientAnalysis(true, false);
      return;
    }
    if (/(confirm).*(match|ingredient|mapping)/.test(t)) { confirmAllIaRows(false); return; }
    if (/review\s+mapping/.test(t)) { reviewIaMappings(false); return; }
    if (/test.+(code|score)|code scores/.test(t)) { testIaCodes(false); return; }
    if (/test.+(wise\s*code|scout|flavor)/.test(t)) { testIaScout(false); return; }
    if (/(look\s*up|search).*(unmatched|ingredient)/.test(t)) { lookupUnmatchedIa(false); return; }
    if (/(help|how|what|stuck|confus)/.test(t)) {
      if (nfpIsExistingProduct() || state.iaRan) { sayWhatCanIAsk(); return; }
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
      nfpIsExistingProduct() || state.iaRan
        ? nfpIntentChips()
        : [{ label: 'Next step', icon: 'arrow_forward', action: 'goto:' + nextStep() }]);
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
    sayWhatCanIAsk();
  }
  function sayWhatCanIAsk() {
    if (nfpIsExistingProduct() || state.iaRan) {
      wiseSay(
        'You\'re looking at this product\'s <strong>Product Details</strong>. Everything on that panel is also a chat turn — here\'s what you can ask or do:'
        + '<ul class="sc-askhelp-list">'
        + '<li><strong>Analyze ingredients</strong> — split the list into a mapped tree with match status, codes, nutrients, and Wise Code AI results.</li>'
        + '<li><strong>Confirm mappings</strong> — accept matched rows, confirm a fuzzy match, or review anything still pending.</li>'
        + '<li><strong>Test code scores</strong> — open Codes and run the Allergen / UPF / quality scores against this product.</li>'
        + '<li><strong>Test Wise Code AI</strong> — open the engine flavor results (category, sub-category, process level).</li>'
        + '<li><strong>Look up unmatched</strong> — jump to any ingredient that didn\'t map, then search it in the canon.</li>'
        + '<li><strong>Edit on the panel</strong> — Nutrition Facts, the ingredient list, allergens, photo, UPC. The chat keeps up.</li>'
        + '<li><strong>Save or claim</strong> — write changes back to the portfolio, or get the Non-UPF Shield when it qualifies.</li>'
        + '</ul>Tap an intent chip or type the same words — they do the same thing.',
        nfpIntentChips({ skip: ['askHelp'] }));
      return;
    }
    wiseSay(
      'You\'re on <strong>Add Product</strong>, so everything here drives one product build. Here\'s what you can ask or do:'
      + '<ul class="sc-askhelp-list">'
      + '<li><strong>Upload a label</strong> — attach a photo of the package and I\'ll read the name, ingredients, Nutrition Facts, allergens and UPC in one pass.</li>'
      + '<li><strong>Paste a URL</strong> — a product or retailer page works too; I\'ll pull in everything I can from it.</li>'
      + '<li><strong>Type any value</strong> — the product name, a 12-digit UPC, or a field like \u201cSodium is 135mg\u201d lands straight on the panel.</li>'
      + '<li><strong>Go step by step</strong> — I\'ll prompt for each field in order: photo, category, UPC, Nutrition Facts, ingredients, allergens. Ask for a field by name — or tap its chip — to jump.</li>'
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
    wiseSay('Great — we\'ll go step by step, starting with a photo. Ask for any other field by name if you want to jump ahead.', undefined, 380);
    setTimeout(() => promptStep('photo'), 900);
  }
  /* Seed the sample product's additional quantities for the Product sizes
     section. The default single unit is the base product itself, so these are
     just the larger multipacks it also ships in (Flax4Life Chocolate Chip
     Muffin lineup). */
  function normSizeLabel(s) {
    return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }
  /* Count token baked into a size label — "12 ct" → "12". Ounce sizes are not
     a servings-per-container count, so they return ''. */
  function countFromSizeLabel(label) {
    const m = String(label || '').match(/^(\d+(?:\.\d+)?)\s*ct\b/i);
    return m ? m[1] : '';
  }
  /* Swap (or append) a pack-size token on a product name so "Brownies-12 ct"
     opened on 4 ct reads as "Brownies-4 ct". */
  function nameWithSize(name, size) {
    const n = String(name || '').trim();
    const token = String(size || '').replace(/\s+/g, ' ').trim();
    if (!n || !token) return n;
    if (/(\d+(?:\.\d+)?)\s*(ct|oz)\b/i.test(n)) {
      return n.replace(/(\d+(?:\.\d+)?)\s*(ct|oz)\b/i, token);
    }
    return n.replace(/[-\s]+$/, '') + '-' + token;
  }
  /* Build the Product sizes strip from the portfolio's size list. The first
     entry is the original SKU (the row's own count); the rest become packs.
     `selected` (from ?size=) picks which thumb is active and rewrites the
     product name so the page is showing that count. */
  function seedPortfolioPacks(sizeList, selected) {
    const ordered = (sizeList || [])
      .map((s) => String(s).replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    if (!ordered.length) {
      state.packs = [];
      state.activePack = 0;
      state.view = 'product';
      return;
    }
    const unit = ordered[0];
    state.unitLabel = unit;
    const unitCount = countFromSizeLabel(unit);
    if (unitCount) state.nf.servingsPer = unitCount;
    state.price = defaultPriceForLabel(unit) || '4.99';
    state.packs = ordered.slice(1).map((label) => {
      const nf = cloneNf(state.nf);
      const n = countFromSizeLabel(label);
      if (n) nf.servingsPer = n;
      return {
        label,
        size: label,
        image: state.image,
        upc: '',
        price: defaultPriceForLabel(label),
        servingSize: nf.servingSize,
        servingsPer: nf.servingsPer,
        calories: nf.calories,
        nf,
      };
    });
    const want = normSizeLabel(selected);
    const packIdx = want ? state.packs.findIndex((p) => normSizeLabel(p.label) === want) : -1;
    if (packIdx >= 0) {
      state.view = 'pack';
      state.activePack = packIdx;
    } else {
      state.view = 'product';
      state.activePack = 0;
    }
    if (selected) state.productName = nameWithSize(state.productName, selected);
  }
  function seedSamplePacks() {
    const img = state.image;
    const nf = state.nf || {};
    state.packs = [
      { label: '3-Pack', size: '3-pack', image: img, upc: '658276210045', price: '10.99', servingSize: nf.servingSize || '1 meal (425g)', servingsPer: '1', calories: nf.calories || '620' },
    ];
    state.view = 'product';
    state.activePack = 0;
    state.unitLabel = '15 oz';
    state.price = '3.99';
  }
  function loadSample() {
    addUser('Show me an example');
    const p = SAMPLE_PARSE;
    state.image = p.image; state.productName = p.productName; state.category = p.category;
    if (p.brand) state.brand = p.brand;
    if (p.brandLogo != null) state.brandLogo = p.brandLogo;
    state.description = defaultDescription(p.productName);
    state.ingredients = p.ingredients; state.contains = p.contains; state.allergens = p.allergens.slice();
    state.done.allergens = true; state.upc = p.upc || '';
    Object.assign(state.nf, JSON.parse(JSON.stringify(p.nf)));
    seedSamplePacks();
    state.iaRan = true;
    renderNFP();
    wiseSay('Here\'s a fully filled example so you can see the finished shape. Edit anything on the panel, then save — or start your own.',
      [{ label: 'Save this example', icon: 'save', action: 'goto:save', primary: true }, { label: 'Start fresh', icon: 'restart_alt', action: 'restart' }]);
  }
  /* Overlay nutrients the Reformulation Studio actually modeled. Only the
     fields on the saved recipe are written — nothing else is invented. */
  function applySavedReformulation() {
    const store = window.WISEReformulationStore;
    if (!store) return;
    const rec = store.get({ upc: state.upc, name: state.productName });
    if (!rec || !rec.recipe) return;
    const r = rec.recipe;
    if (r.calories != null && r.calories !== '') state.nf.calories = String(r.calories);
    function setAmt(key, n, unit) {
      if (n == null || n === '' || !state.nf[key]) return;
      const cur = state.nf[key] || { amt: '', dv: '' };
      state.nf[key] = { amt: String(n) + unit, dv: cur.dv || '' };
    }
    setAmt('sodium', r.sodium, 'mg');
    setAmt('satFat', r.satFat, 'g');
    setAmt('transFat', r.transFat, 'g');
    setAmt('fiber', r.fiber, 'g');
    setAmt('addedSugars', r.addedSugar, 'g');
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
    if (p.brand) state.brand = p.brand;
    if (p.brandLogo != null) state.brandLogo = p.brandLogo;
    state.ingredients = p.ingredients; state.contains = p.contains;
    state.allergens = p.allergens.slice(); state.done.allergens = true;
    state.upc = p.upc || '';
    Object.assign(state.nf, JSON.parse(JSON.stringify(p.nf)));
    // Reflect the specific product opened from the portfolio, when provided.
    const nm = params.get('name'); const upc = params.get('upc'); const img = params.get('img');
    state.productName = (nm && nm.trim()) || p.productName;
    state.description = defaultDescription(state.productName);
    if (upc) { const d = upc.replace(/\D/g, ''); if (d) state.upc = d; }
    if (img) state.image = img;
    if (nm && nm.trim()) {
      state.brand = 'Flax4Life';
      state.brandLogo = '../assets/brand-flax4life-logo.png';
    }
    applyFromParam(params);
    state.brandClaimed = state.fromKey !== 'discovered' || isProductClaimed(state.upc, state.productName);
    if (state.fromKey === 'discovered' && state.brandClaimed) state.saved = true;
    applySavedReformulation();
    state.errors = {};
    /* Portfolio count links pass `sizes` (ordered, original first) and `size`
       (the count that was clicked). Honour those so the Product sizes strip
       and the product name match the pack that was opened — don't fall back
       to the sample 15 oz / 3-pack sizes. */
    const sizesRaw = params.get('sizes');
    const sizeSel = params.get('size');
    if (sizesRaw || sizeSel || nm || upc) {
      const sizeList = sizesRaw
        ? sizesRaw.split(/[,|]/)
        : (sizeSel ? [sizeSel] : []);
      seedPortfolioPacks(sizeList, sizeSel);
    } else {
      seedSamplePacks();
    }
    if (!state.price) state.price = defaultPriceForLabel(state.unitLabel) || '4.99';
    if (!state.description) state.description = defaultDescription(state.productName);
    state.iaRan = true;
    /* Deep-link ?compare=1 — open the side-by-side matrix of every format
       (base product + each pack) for screenshots / portfolio review. */
    if (params.get('compare') === '1') {
      state.nfpCompare = true;
    }
    hideWelcome();
    renderNFP();
    applyIngredientListForArrival();
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
      addWISEcodeAI(`Editing <strong>${esc(state.productName)}</strong> — everything\u2019s loaded on the right and every field is editable. Analyze the ingredients, confirm mappings, test the code scores, or click any value on the panel. What should we update?`,
        nfpIntentChips());
      return;
    }
    if (isClaimPending()) {
      addWISEcodeAI(`Reviewing <strong>${esc(state.productName)}</strong> — a product we discovered that isn\u2019t in your portfolio yet. Check the details on the right, analyze and confirm the ingredients, then claim it if everything looks right.`,
        nfpIntentChips());
      return;
    }
    if (state.fromKey === 'complete') {
      addWISEcodeAI(`Completing <strong>${esc(state.productName)}</strong> — fill in the missing details on the right. When everything required is in, this product can move on to ingredient verification.`,
        nfpIntentChips());
      return;
    }
    if (state.fromKey === 'verify') {
      addWISEcodeAI(`Verifying ingredients on <strong>${esc(state.productName)}</strong> — analyze and confirm the list on the right so this product can earn a Non-UPF Shield.`,
        nfpIntentChips());
      return;
    }
    if (state.fromKey === 'claimed') {
      addWISEcodeAI(`<strong>${esc(state.productName)}</strong> is already in your portfolio. Confirm the details on the right, then continue to verification.`,
        nfpIntentChips());
      return;
    }
    if (state.fromKey === 'ineligible') {
      addWISEcodeAI(`<strong>${esc(state.productName)}</strong> can\u2019t earn a Non-UPF Shield yet. The details on the right show why — reformulate if you want to fix it.`,
        nfpIntentChips());
      return;
    }
    addWISEcodeAI(`Here\u2019s <strong>${esc(state.productName)}</strong> — its full Product Details are loaded on the right. Analyze the ingredients, confirm mappings, test the code scores, or click any value to change it.`,
      nfpIntentChips());
  }
  function restart() {
    Object.assign(state, {
      step: null, productName: '', image: null, images: [], activeImage: 0,
      packs: [], activePack: 0, view: 'product', unitLabel: '1 ct',
      description: '', price: '',
      brandClaimed: true, fromDiscovered: false, fromKey: '', lifecyclePeek: null, lifecycleDone: '',
      category: '', ingredients: '', allergens: [], contains: '', upc: '',
      nf: blankNf(), errors: {}, done: {}, skipped: {}, awaiting: null, saved: false,
      iaRan: false, iaTick: 0, iaConfirm: {},
      iaOpen: { list: true, parsed: false, codes: false, nutrients: false, scout: false },
      brand: 'Flax4Life', brandLogo: '../assets/brand-flax4life-logo.png',
    });
    iaNudgeTaken = false;
    messagesEl.innerHTML = '';
    if (welcomeEl) { welcomeEl.classList.remove('sc-hidden'); welcomeEl.style.display = ''; }
    renderNFP();
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
    iaBody = $('ia-body');
    fileInput = $('ap-file');
    if (!messagesEl || !nfpBody) return;

    // Welcome chips. The gold "What can I ask?" chip is hidden for now; the
    // below-input gold link still opens the catalog panel.
    if (chipsStartEl) {
      chipsStartEl.innerHTML = WELCOME_CHIPS.map((c) =>
        `<button type="button" class="chip ws-intent-chip" data-action="${esc(c.action)}"${c.arg != null ? ` data-arg="${esc(c.arg)}"` : ''}><span class="material-symbols-outlined">${esc(c.icon)}</span>${esc(c.label)}</button>`).join('');
    }

    // Play the welcome in: heading + sub fade in as paragraphs, then the intent
    // chips fly in from the right and land — so the chips always trail the copy.
    revealWelcome();

    applyFromParam();

    // First paint
    renderNFP();
    wireIaNudgeToast();

    // Chip clicks (welcome + inline reply chips)
    document.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-action]');
      if (chip && (welcomeEl?.contains(chip) || messagesEl.contains(chip))) {
        dispatch(chip.dataset.action, chip.dataset.arg);
        return;
      }
      // NFP panel affordances (allergen picker is portaled to body while open)
      const nfpBtn = e.target.closest('[data-nfp]');
      const nfpPanel = document.getElementById('nfp-panel');
      const iaPanel = document.getElementById('ia-panel');
      const allergenPop = document.getElementById('nfp-allergen-pop');
      if (nfpBtn && ((nfpPanel && nfpPanel.contains(nfpBtn)) || (iaPanel && iaPanel.contains(nfpBtn)) || (allergenPop && allergenPop.contains(nfpBtn)))) {
        handleNfpClick(nfpBtn.dataset.nfp, nfpBtn.dataset.arg);
        return;
      }
      if (!e.target.closest('.nfp-fi-thumb.is-del-open')) closePackDeleteConfirm();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePackDeleteConfirm();
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
      const cell = e.target.closest('[data-nfp-upc-cell]');
      if (!cell) return;
      handleUpcCellInput(cell);
    });
    if (iaBody) {
      iaBody.addEventListener('focusout', (e) => {
        const ed = e.target.closest('[data-field="ingredients"]');
        if (!ed) return;
        const val = (ed.matches('textarea, input') ? ed.value : ed.textContent).trim();
        const ph = ed.dataset.ph || '';
        if (val === ph) return;
        const current = getPath('ingredients');
        if (!val && !current) { renderIA(); return; }
        if (val === String(current == null ? '' : current)) return;
        commitField('ingredients', val, { fromPanel: true });
      });
      iaBody.addEventListener('input', (e) => {
        const ing = e.target.closest('textarea[data-field="ingredients"]');
        if (!ing) return;
        sizeIngredEdit(ing);
        refreshIaNudgeToast();
      });
    }
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
    nfpBody.addEventListener('input', (e) => {
      const ed = e.target.closest('[data-field="description"]');
      if (!ed) return;
      const t = ed.textContent || '';
      if (t.length <= DESC_MAX) return;
      ed.textContent = t.slice(0, DESC_MAX);
      placeCaret(ed);
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

    // Chat width toggle — the canonical five-step cycle (single → double →
    // triple → fill → custom), identical to every other module in the app.
    const WIDTH_ICONS = ['width_normal', 'width_wide', 'width_wide', 'width_full', 'fit_width'];
    const WIDTH_TITLES = [
      'Width (single) — tap to widen',
      'Width (double) — tap to widen',
      'Width (triple) — tap to widen',
      'Width (fill) — tap to widen',
      'Width (custom) — drag to any size',
    ];
    let widthTier = (window.WPaneWidth && typeof window.WPaneWidth.defaultChatTier === 'function')
      ? window.WPaneWidth.defaultChatTier()
      : (typeof window.wiseDefaultChatTier === 'function' ? window.wiseDefaultChatTier() : ((((window.screen && +window.screen.width) || window.innerWidth || 0) > 1512) ? 1 : 0));
    const widthBtn = $('ap-width');
    function syncWidth() {
      const chat = document.querySelector('.ap-chat');
      const W = window.WPaneWidth;
      if (chat) {
        if (W) W.applyClasses(chat, widthTier, 'panel');
        else {
          chat.classList.toggle('panel-wide', widthTier >= 1 && widthTier < 4);
          chat.classList.toggle('panel-triple', widthTier >= 2 && widthTier < 4);
          chat.classList.toggle('panel-fill', widthTier === 3);
          chat.classList.toggle('panel-custom', widthTier === 4);
        }
      }
      if (widthTier < 1) document.documentElement.classList.remove('chat-default-double');
      if (W) W.syncButton(widthBtn, widthTier);
      else if (widthBtn) {
        const ic = widthBtn.querySelector('.material-symbols-outlined');
        if (ic) ic.textContent = WIDTH_ICONS[widthTier];
        widthBtn.classList.toggle('is-on', widthTier >= 1);
        widthBtn.setAttribute('aria-pressed', widthTier >= 1 ? 'true' : 'false');
        widthBtn.title = WIDTH_TITLES[widthTier];
      }
    }
    syncWidth();
    widthBtn?.addEventListener('click', () => {
      const W = window.WPaneWidth;
      widthTier = W ? W.next(widthTier) : (widthTier + 1) % 5;
      syncWidth();
    });

    // Product Details width — the canonical five-tier cycle (single → double →
    // triple → fill → custom), identical to every other .panel-width-toggle-btn.
    // Single pane is the load default; a saved per-module choice still wins.
    const nfpPanelEl = $('nfp-panel');
    const savedNfpTier = (window.WPaneWidth && nfpPanelEl)
      ? window.WPaneWidth.readSavedTier(nfpPanelEl)
      : null;
    let nfpWidthTier = (savedNfpTier == null) ? 0 : savedNfpTier;
    const nfpWidthBtn = $('nfp-width');
    function applyNfpWidth() {
      const panel = $('nfp-panel');
      const W = window.WPaneWidth;
      if (panel) {
        if (nfpWidthTier !== 4) {
          try { window.WisePaneResize && window.WisePaneResize.release && window.WisePaneResize.release([panel]); } catch (_) {}
        }
        if (W) W.applyClasses(panel, nfpWidthTier, 'panel');
        else {
          panel.classList.toggle('panel-wide', nfpWidthTier >= 1 && nfpWidthTier < 4);
          panel.classList.toggle('panel-triple', nfpWidthTier >= 2 && nfpWidthTier < 4);
          panel.classList.toggle('panel-fill', nfpWidthTier === 3);
          panel.classList.toggle('panel-custom', nfpWidthTier === 4);
        }
      }
      if (W) W.syncButton(nfpWidthBtn, nfpWidthTier);
      else if (nfpWidthBtn) {
        const ic = nfpWidthBtn.querySelector('.material-symbols-outlined');
        if (ic) ic.textContent = ['width_normal', 'width_wide', 'width_wide', 'width_full', 'fit_width'][nfpWidthTier];
        nfpWidthBtn.classList.toggle('is-on', nfpWidthTier >= 1);
        nfpWidthBtn.setAttribute('aria-pressed', nfpWidthTier >= 1 ? 'true' : 'false');
        nfpWidthBtn.title = ['Width (single) — tap to widen', 'Width (double) — tap to widen', 'Width (triple) — tap to widen', 'Width (fill) — tap to widen', 'Width (custom) — drag to any size'][nfpWidthTier];
      }
    }
    nfpWidthBtn?.addEventListener('click', () => {
      const W = window.WPaneWidth;
      nfpWidthTier = W ? W.next(nfpWidthTier) : (nfpWidthTier + 1) % 5;
      applyNfpWidth();
    });
    applyNfpWidth();

    /* Ingredient List width — double is the load default (and the size
       Verify ingredients always opens at). Fill / custom still persist. */
    const iaPanelNode = $('ia-panel');
    const savedIaTier = (window.WPaneWidth && iaPanelNode)
      ? window.WPaneWidth.readSavedTier(iaPanelNode)
      : null;
    iaWidthTier = (savedIaTier == null || savedIaTier === 0) ? IA_DOUBLE_TIER : savedIaTier;
    $('ia-width')?.addEventListener('click', () => {
      const W = window.WPaneWidth;
      iaWidthTier = W ? W.next(iaWidthTier) : (iaWidthTier + 1) % 5;
      applyIaWidth();
    });
    applyIaWidth();

    wireNfpModuleMenu();
    installNfpLayoutMenuItems();
    installIaCloseMenu();
    applyIngredientListForArrival();

    // Save button (banner / chat still call doSave; the product-module footer is gone)
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
    renderNFP();
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
    return el && el.closest ? el.closest('.nfp-hero, .nfp-rcol, .nfp-rcol-empty, .nfp-header-photo, .nfp-fi-lead-photo, .nfp-fi-thumb--primary, .nfp-panel-header--photo') : null;
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
      case 'add-allergen': {
        const pop = document.getElementById('nfp-allergen-pop');
        if (pop && !pop.classList.contains('hidden')) { closeAllergenPopover(); break; }
        promptAllergens({ userText: 'Add an allergen.' });
        break;
      }
      case 'toggle-allergen': toggleAllergen(arg); break;
      case 'allergen-none':
        state.allergens = [];
        state.done.allergens = true;
        refreshAllergenPanel();
        closeAllergenPopover();
        break;
      case 'allergen-pop-done':
        closeAllergenPopover();
        state.done.allergens = true;
        break;
      case 'remove-allergen': {
        const i = Number(arg);
        if (!isNaN(i) && state.allergens[i] != null) {
          const removed = state.allergens[i];
          state.allergens.splice(i, 1);
          refreshAllergenPanel();
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
      case 'del-pack': openPackDeleteConfirm(arg); break;
      case 'del-pack-cancel': closePackDeleteConfirm(); break;
      case 'del-pack-confirm': confirmDeletePack(arg); break;
      case 'del-pack-hold': break;
      case 'upload-pack': { const i = Number(arg); if (!isNaN(i)) { state.view = 'pack'; state.activePack = i; renderNFP(); openPhotoModal(i); } break; }
      case 'pack-upc-edit': { const i = Number(arg); if (!isNaN(i)) { state.view = 'pack'; state.activePack = i; } openPicker('packUpc'); break; }
      case 'ia-toggle': toggleIaSection(arg); break;
      case 'ia-analyze': runIngredientAnalysis(true); break;
      case 'ia-confirm': confirmIaRow(arg); break;
      case 'ia-confirm-all': confirmAllIaRows(); break;
      case 'ia-review': reviewIaMappings(true); break;
      case 'claim-product': doClaim(); break;
      case 'banner-step': peekBannerStep(arg); break;
      case 'banner-claim-step': peekBannerStep(1); break;
      case 'claimed-continue': finishClaimedContinue(); break;
      case 'complete-details': finishCompleteDetails(); break;
      case 'verify-ingredients': startVerifyFromBanner(); break;
      case 'save-product': doSave(); break;
      default: break;
    }
  }

  function toggleIaSection(id) {
    if (!id || !state.iaOpen.hasOwnProperty(id)) return;
    state.iaOpen[id] = !state.iaOpen[id];
    const sec = iaHost() && iaHost().querySelector(`[data-ia-sec="${id}"]`);
    if (!sec) return;
    const open = !!state.iaOpen[id];
    sec.classList.toggle('is-collapsed', !open);
    const head = sec.querySelector('.nfp-ia-head');
    if (head) head.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (id === 'list') refreshIaNudgeToast();
  }

  function sizeIngredEdit(el) {
    const ta = el || (iaHost() && iaHost().querySelector('textarea.nfp-ingred-edit'));
    if (!ta) return;
    const empty = !String(ta.value || '').trim();
    ta.style.height = '0px';
    ta.style.height = Math.max(empty ? 96 : 38, ta.scrollHeight) + 'px';
  }

  function replaceIaPanel() {
    const host = iaHost() && iaHost().querySelector('.nfp-ia');
    if (!host) { renderIA(); return; }
    const wrap = document.createElement('div');
    wrap.innerHTML = ingredientsHTML();
    const next = wrap.firstElementChild;
    if (next) host.replaceWith(next);
    refreshInsightsGrid();
    requestAnimationFrame(() => { sizeIngredEdit(); syncIngredColHeight(); refreshIaNudgeToast(); });
  }

  /* Floating Analyze CTA — same body-portalled nudge as Product Portfolio.
     Sits above the Analyze Ingredients button, explains what analysis does and
     that chat works the same, then hides once they run it or dismiss. */
  let iaNudgeTaken = false;
  let iaNudgeWired = false;
  let iaNudgeRo = null;
  const IA_NUDGE_ID = 'nfp-ia-analyze';

  function iaNudgeDismissed() {
    const api = window.WiseNudgeToast;
    return !!(api && typeof api.isDismissed === 'function' && api.isDismissed(IA_NUDGE_ID));
  }

  function ensureIaNudgeToast() {
    let toast = document.getElementById('nfp-ia-nudge');
    if (toast) return toast;
    toast = document.createElement('div');
    toast.id = 'nfp-ia-nudge';
    toast.className = 'dash-score-toast is-portaled';
    toast.setAttribute('data-nudge-id', IA_NUDGE_ID);
    toast.setAttribute('role', 'status');
    toast.hidden = true;
    toast.innerHTML =
      '<span class="dash-score-toast-icon"><span class="material-symbols-outlined">science</span></span>' +
      '<div class="dash-score-toast-body">' +
        '<div class="dash-score-toast-title">Map every nested ingredient now</div>' +
        '<p class="dash-score-toast-text">Analyze splits the list into a mapped tree — canonical WISE names, match status, codes, and nutrients — so you can confirm it before you save. Or skip the button and just say it in chat: “analyze the ingredients.”</p>' +
        '<button type="button" class="dash-score-toast-link" data-nfp="ia-analyze">Analyze Ingredients now<span class="material-symbols-outlined dash-score-toast-link-arrow">arrow_outward</span></button>' +
      '</div>' +
      '<button class="dash-score-toast-close" type="button" aria-label="Dismiss" aria-haspopup="menu" aria-expanded="false"><span class="material-symbols-outlined">close</span></button>';
    document.body.appendChild(toast);
    toast.addEventListener('click', (e) => {
      const go = e.target.closest('[data-nfp="ia-analyze"]');
      if (!go) return;
      e.preventDefault();
      e.stopPropagation();
      runIngredientAnalysis(true);
    });
    return toast;
  }

  function iaNudgeClipRect() {
    const col = iaBody || (nfpBody && nfpBody.querySelector('.nfp-sp-ingred'));
    const box = col || iaHost();
    if (!box) return null;
    const r = box.getBoundingClientRect();
    return {
      top: Math.max(0, r.top),
      bottom: Math.min(window.innerHeight, r.bottom),
      left: Math.max(0, r.left),
      right: Math.min(window.innerWidth, r.right),
    };
  }

  function placeIaNudgeToast(toast, anchor) {
    if (!toast || !anchor || toast.hidden) return;
    const br = anchor.getBoundingClientRect();
    if (br.width < 8 || br.height < 8) {
      toast.style.visibility = 'hidden';
      toast.style.pointerEvents = 'none';
      return;
    }
    const clip = iaNudgeClipRect();
    const onScreen = !clip || (
      br.top >= clip.top - 1 && br.bottom <= clip.bottom + 1 &&
      br.right > clip.left && br.left < clip.right
    );
    if (!onScreen) {
      toast.style.visibility = 'hidden';
      toast.style.pointerEvents = 'none';
      return;
    }
    toast.style.visibility = '';
    toast.style.pointerEvents = '';
    const gap = 12;
    const th = toast.offsetHeight || 148;
    const tw = toast.offsetWidth || 320;
    const canAbove = br.top >= th + gap + 8;
    const canBelow = window.innerHeight - br.bottom >= th + gap + 8;
    const canRight = window.innerWidth - br.right >= tw + gap + 8;
    const canLeft = br.left >= tw + gap + 8;
    toast.classList.remove('is-below', 'is-right', 'is-left');
    let top;
    let left;
    const placeAbove = () => { top = br.top - th - gap; left = br.left + br.width / 2 - tw / 2; };
    const placeBelow = () => { toast.classList.add('is-below'); top = br.bottom + gap; left = br.left + br.width / 2 - tw / 2; };
    const placeRight = () => { toast.classList.add('is-right'); top = br.top + br.height / 2 - th / 2; left = br.right + gap; };
    const placeLeft = () => { toast.classList.add('is-left'); top = br.top + br.height / 2 - th / 2; left = br.left - tw - gap; };
    const order = [
      ['right', canRight, placeRight],
      ['left', canLeft, placeLeft],
      ['above', canAbove, placeAbove],
      ['below', canBelow, placeBelow],
    ];
    const pick = order.find((entry) => entry[1]) || order[0];
    pick[2]();
    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - th - 8));
    toast.style.top = Math.round(top) + 'px';
    toast.style.left = Math.round(left) + 'px';
    const caretX = br.left + br.width / 2 - left - 7;
    const caretY = br.top + br.height / 2 - top - 7;
    toast.style.setProperty('--nudge-toast-caret', Math.round(Math.max(16, Math.min(tw - 24, caretX))) + 'px');
    toast.style.setProperty('--nudge-toast-caret-y', Math.round(Math.max(16, Math.min(th - 24, caretY))) + 'px');
  }

  function refreshIaNudgeToast() {
    const toast = ensureIaNudgeToast();
    const host = iaHost();
    const btn = host && host.querySelector('#nfp-ia-analyze-btn, .nfp-ia-analyze');
    const hasList = !!(btn && !btn.disabled && (state.ingredients || '').trim());
    const show = !iaNudgeTaken && !iaNudgeDismissed() && !state.nfpCompare && hasList && !!btn;
    if (!show) {
      toast.hidden = true;
      toast.setAttribute('hidden', '');
      toast.style.visibility = '';
      toast.style.pointerEvents = '';
      return;
    }
    toast.hidden = false;
    toast.removeAttribute('hidden');
    if (iaNudgeRo) {
      iaNudgeRo.disconnect();
      iaNudgeRo = null;
    }
    if (typeof ResizeObserver !== 'undefined' && btn) {
      iaNudgeRo = new ResizeObserver(() => placeIaNudgeToast(toast, btn));
      iaNudgeRo.observe(btn);
    }
    placeIaNudgeToast(toast, btn);
    requestAnimationFrame(() => placeIaNudgeToast(toast, btn));
  }

  function wireIaNudgeToast() {
    if (iaNudgeWired) return;
    iaNudgeWired = true;
    ensureIaNudgeToast();
    const place = () => {
      const toast = document.getElementById('nfp-ia-nudge');
      const host = iaHost();
      const btn = host && host.querySelector('#nfp-ia-analyze-btn, .nfp-ia-analyze');
      placeIaNudgeToast(toast, btn);
    };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, { passive: true, capture: true });
    nfpBody?.addEventListener('scroll', place, { passive: true });
    iaBody?.addEventListener('scroll', place, { passive: true });
    document.addEventListener('scroll', (e) => {
      if (e.target && e.target.id === 'ia-body') place();
    }, { passive: true, capture: true });
    refreshIaNudgeToast();
    setTimeout(refreshIaNudgeToast, 200);
    setTimeout(refreshIaNudgeToast, 700);
  }

  function flushIngredientsFromPanel() {
    const ed = iaHost() && iaHost().querySelector('[data-field="ingredients"]');
    if (!ed) return;
    const val = (ed.matches('textarea, input') ? ed.value : ed.textContent).trim();
    if (val === (ed.dataset.ph || '')) return;
    if (val !== state.ingredients) {
      state.ingredients = val;
      delete state.errors.ingredients;
    }
  }

  function readClipboardText() {
    if (!navigator.clipboard || typeof navigator.clipboard.readText !== 'function') {
      return Promise.resolve('');
    }
    return navigator.clipboard.readText()
      .then((t) => String(t || '').trim())
      .catch(() => '');
  }

  function applyIngredientsText(val) {
    const next = String(val || '').trim();
    if (!next) return false;
    state.ingredients = next;
    delete state.errors.ingredients;
    const ta = iaHost() && iaHost().querySelector('textarea.nfp-ingred-edit');
    if (ta) {
      ta.value = next;
      sizeIngredEdit(ta);
    }
    return true;
  }

  function runIngredientAnalysis(fromUser, echoUser) {
    revealIngredientList();
    flushIngredientsFromPanel();
    if (!state.ingredients) {
      if (!fromUser) return;
      readClipboardText().then((clip) => {
        if (applyIngredientsText(clip)) {
          runIngredientAnalysis(fromUser, echoUser);
          return;
        }
        const ta = iaHost() && iaHost().querySelector('textarea.nfp-ingred-edit');
        if (ta) {
          ta.focus();
          sizeIngredEdit(ta);
        }
        if (echoUser !== false) addUser('Analyze the ingredients.');
        wiseSay('Add your ingredients list first — paste it from the label or type it in, then hit Analyze. A label photo works too.');
      });
      return;
    }
    const wasRan = !!state.iaRan;
    if (fromUser) iaNudgeTaken = true;
    state.iaRan = true;
    state.iaTick += 1;
    replaceIaPanel();
    if (fromUser) {
      const wf = iaWorkflow();
      const stats = wf.stats;
      if (echoUser !== false) addUser(wasRan ? 'Re-analyze the ingredients.' : 'Analyze the ingredients.');
      const pendingBit = wf.pending
        ? ` <strong>${wf.pending}</strong> mapping${wf.pending === 1 ? '' : 's'} still need a review.`
        : ' Every row matched — confirm them, then test the code scores.';
      wiseSay(
        (wasRan ? 'Re-analyzed' : 'Analyzed')
        + ` the list — <strong>${stats.leaves.length}</strong> ingredients parsed, <strong>${stats.ok}</strong> matched, <strong>${stats.part}</strong> fuzzy, <strong>${stats.bad}</strong> unmatched.`
        + pendingBit
        + ' Codes, nutrients and Wise Code AI results are in the Ingredients Analyzer.',
        nfpIntentChips({ skip: ['ia-analyze'] }));
    }
  }

  function confirmIaRow(id, echoUser) {
    if (!id) return;
    state.iaConfirm[id] = true;
    const row = flattenParsed(parseIngredientTree(state.ingredients)).find((r) => r.id === id);
    const label = (row && (row.mapped || row.raw)) || id;
    replaceIaPanel();
    if (echoUser !== false) addUser(`Confirm the ${label} mapping.`);
    const wf = iaWorkflow();
    const next = wf.fuzzy.length
      ? ` Next fuzzy match is <strong>${esc(wf.fuzzy[0].mapped || wf.fuzzy[0].raw)}</strong>.`
      : (wf.pending ? ' Remaining unmatched rows still need a look-up.' : ' Ready to test the code scores.');
    wiseSay(`Confirmed <strong>${esc(label)}</strong> as matched.` + next,
      nfpIntentChips({ skip: ['ia-confirm:' + id] }));
  }

  function confirmAllIaRows(echoUser) {
    flattenParsed(parseIngredientTree(state.ingredients)).forEach((r) => {
      if (!r.isGroup && iaMatchOf(r) === 'ok' && r.id) state.iaConfirm[r.id] = true;
    });
    replaceIaPanel();
    if (echoUser !== false) addUser('Confirm matched ingredients.');
    const wf = iaWorkflow();
    const next = wf.pending
      ? ` ${wf.pending} mapping${wf.pending === 1 ? '' : 's'} still need a review — confirm the fuzzy ones or look up anything unmatched.`
      : ' All current matches are confirmed. Test the code scores whenever you\'re ready.';
    wiseSay('Confirmed every currently matched mapping.' + next,
      nfpIntentChips({ skip: ['ia-confirm-all'] }));
  }

  function scrollIaRowIntoView(sec, selector) {
    const first = sec && sec.querySelector(selector);
    const scroller = iaHost();
    if (!first || !scroller) return;
    const cr = scroller.getBoundingClientRect();
    const fr = first.getBoundingClientRect();
    const next = scroller.scrollTop + (fr.top - cr.top) - 12;
    scroller.scrollTo({
      top: Math.max(0, next),
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }

  function expandIaSection(id) {
    if (!id || !state.iaOpen.hasOwnProperty(id)) return null;
    state.iaOpen[id] = true;
    const sec = iaHost() && iaHost().querySelector(`[data-ia-sec="${id}"]`);
    if (!sec) return null;
    sec.classList.remove('is-collapsed');
    const head = sec.querySelector('.nfp-ia-head');
    if (head) head.setAttribute('aria-expanded', 'true');
    return sec;
  }

  function reviewIaMappings(echoUser) {
    if (!state.iaRan) {
      state.iaOpen.parsed = true;
      runIngredientAnalysis(true, echoUser);
      return;
    }
    const sec = expandIaSection('parsed');
    scrollIaRowIntoView(sec, '.nfp-ia-parsed-row[data-ia-match="bad"], .nfp-ia-parsed-row[data-ia-match="part"]');
    if (echoUser === false) return;
    const wf = iaWorkflow();
    if (echoUser !== false) addUser(wf.pending ? `Review ${wf.pending} mapping${wf.pending === 1 ? '' : 's'}` : 'Review mappings');
    wiseSay(
      wf.pending
        ? `Opened <strong>Parsed Ingredients</strong> — <strong>${wf.pending}</strong> mapping${wf.pending === 1 ? '' : 's'} still need a look. Confirm the fuzzy matches, or look up anything unmatched.`
        : 'Opened <strong>Parsed Ingredients</strong> — every row is matched. Confirm them when you\'re ready, then test the code scores.',
      nfpIntentChips({ skip: ['ia-review'] }));
  }

  function lookupUnmatchedIa(echoUser) {
    if (!state.iaRan) {
      state.iaOpen.parsed = true;
      runIngredientAnalysis(true, echoUser);
      return;
    }
    const sec = expandIaSection('parsed');
    scrollIaRowIntoView(sec, '.nfp-ia-parsed-row[data-ia-match="bad"]');
    const wf = iaWorkflow();
    const names = wf.unmatched.map((r) => r.raw);
    if (echoUser !== false) {
      addUser(names.length === 1 ? `Look up ${names[0]}` : 'Look up unmatched ingredients');
    }
    if (!names.length) {
      wiseSay('Nothing unmatched — every parsed ingredient has a mapping. Confirm the matches or test the code scores.',
        nfpIntentChips({ skip: ['ia-lookup'] }));
      return;
    }
    const listed = names.slice(0, 4).map((n) => `<strong>${esc(n)}</strong>`).join(', ')
      + (names.length > 4 ? ` and ${names.length - 4} more` : '');
    const chips = nfpIntentChips({ skip: ['ia-lookup'] });
    chips.splice(Math.min(1, chips.length), 0, {
      label: 'Open Ingredient Browser',
      icon: 'travel_explore',
      action: 'ia-browser',
    });
    wiseSay(
      `Opened the unmatched ${names.length === 1 ? 'ingredient' : 'ingredients'} in <strong>Parsed Ingredients</strong>: ${listed}. Search the canon for a better map, or confirm a close match if it\'s right.`,
      chips.slice(0, 8));
  }

  function openIaSection(id, echoUser) {
    const titles = {
      list: (state.ingredients || '').trim() ? 'Ingredient List' : 'Add your ingredients list',
      parsed: 'Parsed Ingredients',
      codes: 'Codes',
      nutrients: 'Nutrients',
      scout: 'Wise Code AI Engine Flavor Results',
    };
    if (!state.iaRan) {
      state.iaOpen[id] = true;
      runIngredientAnalysis(true, echoUser);
      return;
    }
    state.iaTick += 1;
    const sec = expandIaSection(id);
    if (!sec) replaceIaPanel();
    const next = iaHost() && iaHost().querySelector(`[data-ia-sec="${id}"]`);
    if (next) {
      next.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest' });
    }
    if (echoUser === false) return;
    if (echoUser !== false) addUser('Show ' + (titles[id] || id));
    wiseSay(`Opened <strong>${esc(titles[id] || id)}</strong> in the Ingredients Analyzer.`,
      nfpIntentChips({ skip: ['ia-open-' + id] }));
  }

  function testIaCodes(echoUser) {
    if (!state.iaRan) {
      state.iaOpen.codes = true;
      runIngredientAnalysis(true, echoUser);
      return;
    }
    state.iaOpen.codes = true;
    state.iaTick += 1;
    replaceIaPanel();
    const sec = iaHost() && iaHost().querySelector('[data-ia-sec="codes"]');
    if (sec) sec.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest' });
    const rows = iaCodesRows();
    const flagged = rows.filter((r) => r.tone === 'bad' || r.tone === 'warn');
    const flagBit = flagged.length
      ? flagged.slice(0, 3).map((r) => `<strong>${esc(r.code)}</strong> ${esc(r.interp)} (${r.score}/100)`).join('; ')
        + '.'
      : 'no flags.';
    if (echoUser !== false) addUser('Test the code scores');
    wiseSay(
      `Tested the code scores against this product — opened <strong>Codes</strong> in the Ingredients Analyzer. ${flagged.length ? 'Needs a look: ' + flagBit : 'Clean read — ' + flagBit} Next you can test Wise Code AI results or confirm any leftover mappings.`,
      nfpIntentChips({ skip: ['ia-test-codes'] }));
  }

  function testIaScout(echoUser) {
    if (!state.iaRan) {
      state.iaOpen.scout = true;
      runIngredientAnalysis(true, echoUser);
      return;
    }
    state.iaOpen.scout = true;
    state.iaTick += 1;
    replaceIaPanel();
    const sec = iaHost() && iaHost().querySelector('[data-ia-sec="scout"]');
    if (sec) sec.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest' });
    const wf = iaWorkflow();
    const pl2 = wf.analyzed ? wf.stats.leaves.filter((r) => r.pl >= 2).length : 0;
    if (echoUser !== false) addUser('Test Wise Code AI results');
    wiseSay(
      `Opened <strong>Wise Code AI Engine Flavor Results</strong> — category, sub-category and process level for every parsed ingredient. ${pl2 ? `<strong>${pl2}</strong> sit at process level 2 or higher.` : 'Process levels are in.'}`,
      nfpIntentChips({ skip: ['ia-test-scout'] }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
