/**
 * Table specimens for pages/analytics-types.html.
 *
 * The chart gallery on that page carries the four analytics tables that live
 * there and two table encodings (leaderboard, heat). Every OTHER data table in
 * the app lived only on its own page, which meant none of them could be read
 * against the size palette — the one control that holds the report to a phone,
 * a tablet, a laptop, or a full desktop and makes a layout confess.
 *
 * This module brings the rest of them in: one card per table, faithful to the
 * real column set, cell types and sample values, so a pass at Mobile / Tablet /
 * Laptop / Desktop covers the whole catalog and not just the charts.
 *
 * Each specimen names where the real one lives and links to it. They are
 * specimens, not live records — no row here navigates or mutates anything.
 *
 * Narrow behaviour is NOT hand-rolled: every specimen is a real <table> with a
 * real <thead>, so js/responsive-tables.js measures it and stacks the rows into
 * labelled cards below 560px, exactly as it does on the host page. Between that
 * floor and full width, `minw` keeps the columns legible and lets the card's own
 * scroller take over. A dense table on a phone is a thing you scroll or stack —
 * never a thing you crush.
 *
 * Mounts after the chart variations so the charts stay first.
 */

import {
  card, makePlay, wire, escq, NUM, tierVar, EX, GD, OK, FR, PR, PRI,
} from './analytics-card-kit.js';

(function () {
  /* ── Pill tones ─────────────────────────────────────────────────────────
     Every status label the real tables paint, mapped to one of the four
     `.upf-pill` tones the page already ships. Anything not listed falls back
     to muted rather than guessing a colour with meaning. */
  const TONE = {
    /* good */
    'Verified': 'good', 'Complete': 'good', 'GRAS': 'good', 'Active': 'good',
    'Confirmed': 'good', 'Accepted': 'good', 'Paid': 'good', 'Non-UPF': 'good',
    'Qualifying': 'good', 'Pass': 'good', 'Excellent': 'good', 'Remapped': 'good',
    'New Canon': 'good',
    /* primary */
    'Pre-Qualified': 'primary', 'Pre-qualified': 'primary', 'In review': 'primary',
    'Invited': 'primary', 'Sent': 'primary', 'Quick win': 'primary',
    'Owner': 'primary', 'Admin': 'primary', 'Good': 'primary', 'Invoice Sent': 'primary',
    /* warn */
    'Pending Attestation': 'warn', 'Pending': 'warn', 'Incomplete': 'warn',
    'Action Required': 'warn', 'Rotate soon': 'warn', 'Near-miss': 'warn',
    'Unclear': 'warn', 'Historical': 'warn', 'Suggest New Canon': 'warn',
    'Not Sure': 'warn', 'Close': 'warn', 'OK': 'warn', 'Locked': 'warn',
    /* alert */
    'Ineligible': 'alert', 'Failed': 'alert', 'Revoked': 'alert', 'Expired': 'alert',
    'Cancelled': 'alert', 'Canceled': 'alert', 'Deactivated': 'alert', 'Fail': 'alert',
    'UPF': 'alert', 'Disqualified': 'alert', 'Unsafe': 'alert', 'Rejected': 'alert',
    'Deeper work': 'alert', 'Poor': 'alert', 'Fair': 'alert',
  };

  const tone = (label) => TONE[label] || 'muted';

  /* ── Cell renderers ───────────────────────────────────────────────────── */

  /* Seeded product photo, so a given product keeps the same picture across
     re-renders. The fallback is the product's own initials — never an icon on
     a tile. */
  const photo = (seed, name) =>
    `<span class="attb-thumb" data-attb-initials="${escq(initials(name))}">` +
    `<img src="https://picsum.photos/seed/${encodeURIComponent('attb-' + seed)}/64/64" ` +
    `alt="" loading="lazy" /></span>`;

  function initials(name) {
    return String(name || '').trim().split(/\s+/).slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase()).join('');
  }

  const avatar = (name) =>
    `<span class="attb-avatar" aria-hidden="true">${escq(initials(name))}</span>`;

  const pill = (label) =>
    `<span class="upf-pill upf-pill--${tone(label)}">${escq(label)}</span>`;

  const tags = (list) =>
    `<span class="attb-tags">${list.map((t) =>
      `<span class="attb-tag">${escq(t)}</span>`).join('')}</span>`;

  const stack = (t, sub) =>
    `<span class="attb-stack"><span class="attb-stack-t">${escq(t)}</span>` +
    (sub ? `<span class="attb-stack-sub">${escq(sub)}</span>` : '') + '</span>';

  const dates = (lead, leadVal, sub, subVal) =>
    `<span class="attb-dates"><span class="attb-date"><span class="attb-date-k">${escq(lead)}</span>` +
    `<span class="attb-date-v">${escq(leadVal)}</span></span>` +
    (sub ? `<span class="attb-date attb-date--sub"><span class="attb-date-k">${escq(sub)}</span>` +
      `<span class="attb-date-v">${escq(subVal)}</span></span>` : '') + '</span>';

  const stars = (filled, of) => {
    let out = '<span class="attb-stars" aria-hidden="true">';
    for (let i = 0; i < (of || 3); i++) {
      out += `<span class="material-symbols-outlined attb-star${i < filled ? ' is-on' : ''}">star</span>`;
    }
    return out + `</span><span class="attb-sr">${filled} of ${of || 3} stars</span>`;
  };

  /* Ghost by default. A solid brand-blue primary always carries the FILLED
     icon twin — see the primary-button-filled-icons rule; the fill is set in
     the page stylesheet off `.attb-btn--primary`. */
  const btn = (label, icon, kind) =>
    `<button type="button" class="attb-btn attb-btn--${kind || 'ghost'}" tabindex="-1">` +
    (icon ? `<span class="material-symbols-outlined">${escq(icon)}</span>` : '') +
    escq(label) + '</button>';

  const check = () =>
    '<span class="material-symbols-outlined attb-check" aria-hidden="true">check_box_outline_blank</span>';

  const bar = (pct) =>
    `<span class="attb-barcell"><span class="atx-mini"><span class="atx-mini-fill" ` +
    `style="--atx-mini:${pct}%;background:${tierVar(pct)}"></span></span>` +
    `<span class="attb-barnum" data-to="${pct}">0</span></span>`;

  const code = (s) => `<code class="attb-code">${escq(s)}</code>`;

  let menuSeq = 0;

  /* One ⋮ per row, listing that table's real row actions. It owns a popover,
     so hover opens it (js/kebab-hover.js finds it by `aria-haspopup` + the
     more_vert glyph, and `role="menu"` is its popover selector), and
     js/popover-layer.js floats it clear of the card's scroller.

     `opts.glyph` / `opts.title` cover the columns that are not a ⋮ — the
     portfolio's reports column is a `description` icon over a titled menu. */
  const rowmenu = (items, opts) => {
    const o = opts || {};
    const id = 'attb-menu-' + (++menuSeq);
    return '<span class="attb-rowmenu">' +
      `<button type="button" class="attb-rowmenu-btn" aria-haspopup="true" aria-expanded="false" ` +
      `aria-controls="${id}" aria-label="${escq(o.label || 'Row actions')}">` +
      `<span class="material-symbols-outlined">${escq(o.glyph || 'more_vert')}</span></button>` +
      `<span class="attb-rowmenu-pop" role="menu" id="${id}" hidden>` +
      (o.title ? `<span class="attb-menu-title">${escq(o.title)}</span>` : '') +
      items.map((it) =>
        `<span class="attb-menu-item" role="menuitem">${escq(it)}</span>`).join('') +
      '</span></span>';
  };

  /* ── Specimens ────────────────────────────────────────────────────────────
     `cols` is [label, className] — an empty label is an unlabelled control
     column (checkbox, ⋮, action), which card mode renders full-width because
     it carries no field label. `rows` are arrays of ready HTML cells. */

  const NA = '<span class="attb-na">—</span>';

  function specimens() {
    const S = [];

    /* ---- Portfolio ---------------------------------------------------- */
    S.push({
      id: 'attb-pf-claimed', eyebrow: 'Portfolio grid',
      title: 'Claimed products',
      intro: 'The portfolio’s working grid: three icon columns and a text action ahead of the product, then data completeness, shield status and the date pair. Eight columns is the widest table in the app, which is why it is the first one to scroll and the first one to stack.',
      page: 'Product Portfolio', href: 'product-portfolio.html#pf-view-claimed',
      note: 'Sample data: five Flax4Life SKUs, as the claimed view paints them.',
      minw: 940,
      cols: [['', 'c'], ['', 'c'], ['', 'c'], ['', 'act'], ['Product', 'id'], ['Data', ''], ['Non-UPF Shield', ''], ['Updated', 'dates']],
      rows: [
        ['Toasted Coconut Brownies-12 ct', '8 57287 00420 3', 'Complete', 'Verified', 'Apr 20, 2026', 'Apr 14, 2026'],
        ['Chocolate Chip Muffins-4 ct', '0 65776 63152 0', 'Complete', 'Verified', 'Apr 18, 2026', 'Apr 11, 2026'],
        ['Carrot Raisin Muffins- 4 ct', '0 65776 63151 3', 'Complete', 'Verified', 'Apr 16, 2026', 'Apr 09, 2026'],
        ['Chocolate Brownies-12 ct', '0 65776 63550 4', 'Complete', 'Verified', 'Apr 15, 2026', 'Apr 07, 2026'],
        ['Oatmeal Raisin Cookies-5 ct', '8 57287 00456 2', 'Complete', 'Pre-qualified', 'Apr 12, 2026', 'Apr 03, 2026'],
      ].map((r) => [
        check(), rowmenu(['Edit', 'View']), reportsIcon(),
        btn('Finish and Claim', '', 'link'),
        idCell(r[0], 'UPC · ' + r[1], r[1]),
        pill(r[2]), pill(r[3]), dates('Updated', r[4], 'Last edited', r[5]),
      ]),
    });

    S.push({
      id: 'attb-pf-discovered', eyebrow: 'Discovery grid',
      title: 'Discovered products, waiting to be claimed',
      intro: 'The same grid with one column fewer and two columns deliberately empty: a discovered UPC has no data completeness and no shield until somebody claims it. An em dash is the honest answer, not a zero.',
      page: 'Product Portfolio', href: 'product-portfolio.html#pf-view-discovered',
      note: 'Sample data: four auto-discovered Flax4Life UPCs.',
      minw: 860,
      cols: [['', 'c'], ['', 'c'], ['', 'act'], ['Product', 'id'], ['Data', ''], ['Non-UPF Shield', ''], ['Updated', 'dates']],
      rows: [
        ['Apple Cinnamon Muffins-4 ct', '0 65776 63517 7', 'Apr 20, 2026', 'Apr 13, 2026'],
        ['Banana Coconut Granola', '8 57287 00425 8', 'Apr 19, 2026', 'Apr 12, 2026'],
        ['Blueberry Mini-Muffins-6 ct', '8 57287 00468 5', 'Apr 17, 2026', 'Apr 10, 2026'],
        ['Blueberry Muffin-Single Serve', '8 57287 00412 8', 'Apr 16, 2026', 'Apr 08, 2026'],
      ].map((r) => [
        check(), rowmenu(['Review & claim', 'Preview', 'Not mine']),
        btn('Review & Claim', '', 'link'),
        idCell(r[0], 'UPC · ' + r[1], r[1]),
        NA, NA, dates('Updated', r[2], 'Last edited', r[3]),
      ]),
    });

    S.push({
      id: 'attb-pf-needsinfo', eyebrow: 'Needs-info grid',
      title: 'Products missing data before they can be verified',
      intro: 'Same shape again, with the action column carrying the specific next step per row — verify the ingredients, or go back and complete the details. The shield column tells you which of the two it is.',
      page: 'Product Portfolio', href: 'product-portfolio.html#pf-view-needsinfo',
      note: 'Sample data: four Flax4Life SKUs short of verification.',
      minw: 880,
      cols: [['', 'c'], ['', 'c'], ['', 'act'], ['Product', 'id'], ['Data', ''], ['Non-UPF Shield', ''], ['Updated', 'dates']],
      rows: [
        ['Vegan Carrot Raisin Mini Muffins', '8 57287 00482 1', 'Pending Attestation', 'Verify ingredients', 'Apr 20, 2026', 'Apr 13, 2026'],
        ['Chunky Chocolate Granola', '8 57287 00427 2', 'Pending Attestation', 'Verify ingredients', 'Apr 18, 2026', 'Apr 11, 2026'],
        ['Vegan Blueberry Mini Muffins', '8 57287 00481 4', 'Ineligible', 'Complete details', 'Apr 17, 2026', 'Apr 09, 2026'],
        ['Vegan Chocolate Brownies', '8 57287 00483 8', 'Ineligible', 'Complete details', 'Apr 15, 2026', 'Apr 06, 2026'],
      ].map((r) => [
        check(), rowmenu([r[3], 'Preview', 'Not mine']),
        btn(r[3], '', 'link'),
        idCell(r[0], 'UPC · ' + r[1], r[1]),
        pill('Incomplete'), pill(r[2]), dates('Updated', r[4], 'Last edited', r[5]),
      ]),
    });

    S.push({
      id: 'attb-cmp', eyebrow: 'Comparison matrix',
      title: 'Two products, metric by metric',
      intro: 'The one table read down a column instead of across a row: the left rail names the metric and each remaining column is a whole product. Scores carry the letter grade the comparison board assigns, and the last row is prose rather than a number.',
      page: 'Product Comparison', href: 'product-comparison.html',
      note: 'Sample data: the product-vs-product scope, WISEscore 79 against 61.',
      minw: 560,
      cols: [['Metric', 'rail'], ['Bitchin’ Sauce Original', 'num'], ['Good Foods Plant-Based Dip', 'num']],
      rows: [
        ['UPF Risk', 80, 'A-', 58, 'C+'],
        ['GRAS', 84, 'A-', 63, 'B-'],
        ['Ingredient Integrity', 82, 'A-', 55, 'C-'],
        ['Nutrient Density', 76, 'B+', 61, 'C+'],
      ].map((r) => [
        stack(r[0], ''),
        gradeCell(r[1], r[2]), gradeCell(r[3], r[4]),
      ]).concat([[
        stack('Insight', ''),
        '<span class="attb-prose">Leads on protein density and clean label across the portfolio.</span>',
        '<span class="attb-prose">Held back by additive count and a softer processing score.</span>',
      ]]),
    });

    /* ---- WISEcodeAI Studio -------------------------------------------- */
    S.push({
      id: 'attb-aid-users', eyebrow: 'Usage board',
      title: 'Per-member AI activity',
      intro: 'A usage board: an identity column, four numeric columns that count up, a skill pill, and a budget bar carrying its own percentage. The numbers are compact (184K, 9.1M) so the column stays narrow enough to survive a tablet.',
      page: 'WISEcodeAI Studio dashboard', href: 'ai-dashboard.html',
      note: 'Sample data: four members over a 30-day range.',
      minw: 880,
      cols: [['User', 'id'], ['Requests', 'num'], ['Tokens', 'num'], ['Top skill', ''], ['Budget used', 'bar'], ['Spend', 'num'], ['Last active', '']],
      rows: [
        ['Arthur Krupsky', 'Product Intelligence Lead', '184K', '9.1M', 'RAG Search', 78, '$1,284', '2m ago'],
        ['Dana Owusu', 'Data Scientist', '143K', '7.4M', 'Code Interp.', 64, '$1,042', '11m ago'],
        ['Miguel Santos', 'Compliance Analyst', '98.4K', '5.2M', 'Rules Check', 51, '$733', '38m ago'],
        ['Priya Nair', 'Ops Engineer', '76.1K', '3.9M', 'Agents', 44, '$561', '1h ago'],
      ].map((r) => [
        `<span class="attb-id">${avatar(r[0])}${stack(r[0], r[1])}</span>`,
        `<span class="attb-num">${escq(r[2])}</span>`,
        `<span class="attb-num">${escq(r[3])}</span>`,
        pill(r[4]), bar(r[5]),
        `<span class="attb-num">${escq(r[6])}</span>`,
        `<span class="attb-muted">${escq(r[7])}</span>`,
      ]),
    });

    S.push({
      id: 'attb-ib', eyebrow: 'Registry',
      title: 'The ingredient registry',
      intro: 'Seven columns of reference data, two of them repeating allergen prose that will not shorten. This is the table that most wants a horizontal scroll on anything under a laptop — the real one holds a 960px floor for exactly that reason.',
      page: 'Ingredient Browser', href: 'ingredient-browser.html',
      note: 'Sample data: four rows of the ingredient registry.',
      minw: 980,
      cols: [['Name', ''], ['Category / Subcategory', 'stack'], ['PL', 'c'], ['GRAS', ''], ['US Allergen', ''], ['EU Allergen', ''], ['Flags', 'tags']],
      rows: [
        ['AGED CAYENNE PEPPERS', 'Vegetable', 'Nightshades', '1', 'GRAS', 'Reviewed-No Allergen', 'Reviewed-No Allergen', ['Vegan', 'Gluten Free', 'Dairy Free']],
        ['AGED CHEDDAR CHEESE FLAVOR', 'Additives', 'Functional Additives', '3', 'Unclear', 'Milk', 'Milk', ['Gluten Free', 'Dairy Free']],
        ['AGED RED PEPPERS', 'Vegetable', 'Nightshades', '1', 'GRAS', 'Reviewed-No Allergen', 'Reviewed-No Allergen', ['Vegan', 'Gluten Free', 'Dairy Free']],
        ['AIR POPPED POPCORN', 'Finished Products', 'Vegetables, Dry Snacks', '1', 'Historical', '', '', ['Vegan', 'Gluten Free', 'Dairy Free']],
      ].map((r) => [
        `<span class="attb-strong">${escq(r[0])}</span>`,
        stack(r[1], r[2]),
        `<span class="attb-plnum">${escq(r[3])}</span>`,
        pill(r[4]),
        r[5] ? `<span class="attb-muted">${escq(r[5])}</span>` : NA,
        r[6] ? `<span class="attb-muted">${escq(r[6])}</span>` : NA,
        tags(r[7]),
      ]),
    });

    S.push({
      id: 'attb-wa-tbl', eyebrow: 'In-chat table',
      title: 'A sortable table inside a chat answer',
      intro: 'The narrowest table in the app, because it has to fit a chat column: a rank, a product with its brand, and one score. Three columns is what survives a single-width chat pane, and it is the reason this one never needs to scroll.',
      page: 'WISEcodeAI Chat', href: 'wiseai.html',
      note: 'Sample data: the four lowest-scoring foods, as the chat answer ranks them.',
      minw: 440,
      cols: [['#', 'c'], ['Food', 'id'], ['Score', 'num']],
      rows: [
        [1, 'Member’s Mark Christmas Gourmet Cupcakes, 8 Ct.', 'Member’s Mark', '0.06'],
        [2, 'Freshness Guaranteed White And Chocolate Cupcakes', 'Freshness Guaranteed', '0.12'],
        [3, 'Mini Boston Crm 6-more - Ea', 'Cheesecake & Cream Cakes', '0.17'],
        [4, 'Freshness Guaranteed White Cupcakes With Icing, 52 Oz', 'Freshness Guaranteed', '0.47'],
      ].map((r) => [
        `<span class="attb-rank">${r[0]}</span>`,
        idCell(r[1], r[2], r[1]),
        `<span class="attb-num attb-score">${escq(r[3])}</span>`,
      ]),
    });

    /* ---- Reformulation ------------------------------------------------ */
    S.push({
      id: 'attb-rf-picks', eyebrow: 'Pick list',
      title: 'Products you can pick to reformulate',
      intro: 'The action comes first here, ahead of the product, because the whole list exists to be acted on. Guiding Stars pairs a star glyph with a qualifying pill, and the blockers column is the one that grows a second line on a narrow card.',
      page: 'Reformulation', href: 'reformulation.html#rf-dash-pick',
      note: 'Sample data: four products with their computed blockers.',
      minw: 720,
      cols: [['', 'act'], ['Product', 'id'], ['Guiding Stars', ''], ['Blockers', '']],
      rows: [
        ['Great Value Frosted Toaster Pastries', '0 78742 12908 4', 0, 'Disqualified', 'Sugar 50% of kcal, 12 additives'],
        ['Toasted Coconut Brownies-12 ct', '8 57287 00420 3', 0, 'Disqualified', '3 additives'],
        ['Chocolate Chip Muffins-4 ct', '0 65776 63152 0', 0, 'Disqualified', '2 additives'],
        ['Chunky Chocolate Granola', '8 57287 00427 2', 1, 'Qualifying', 'None'],
      ].map((r) => [
        btn('Reformulate', 'tune', 'primary'),
        idCell(r[0], 'UPC · ' + r[1], r[1]),
        `<span class="attb-starcell">${stars(r[2], 3)}${pill(r[3])}</span>`,
        `<span class="attb-muted">${escq(r[4])}</span>`,
      ]),
    });

    S.push({
      id: 'attb-rf-moves', eyebrow: 'Move list',
      title: 'Recommended moves, with impact and effort',
      intro: 'Two narrow bookends around one long sentence. The impact badge is either a block glyph — this move is what disqualifies the product — or the points it earns, and the recommendation is free to wrap as far as it needs.',
      page: 'Reformulation', href: 'reformulation.html',
      note: 'Sample data: the four moves recommended for Great Value Frosted Toaster Pastries.',
      minw: 640,
      cols: [['', 'act'], ['Impact', 'c'], ['Recommended move', ''], ['Effort', '']],
      rows: [
        ['dq', 'Cut added sugar below 32 g/serving to exit disqualification', 'Higher effort'],
        ['dq', 'Remove 11 of 12 flagged additives to exit disqualification', 'Medium effort'],
        ['+1', 'Raise fiber to ≥4.6 g/serving (now 0.0 g) → +1 credit', 'Low effort'],
        ['+1', 'Fortify one more vitamin/mineral to ≥5% DV per 100 kcal → +1', 'Low effort'],
      ].map((r) => [
        btn('Apply', 'check', 'primary'),
        r[0] === 'dq'
          ? '<span class="attb-impact attb-impact--dq"><span class="material-symbols-outlined">block</span></span>'
          : `<span class="attb-impact attb-impact--credit">${escq(r[0])}</span>`,
        `<span class="attb-prose">${escq(r[1])}</span>`,
        pillEffort(r[2]),
      ]),
    });

    /* ---- Reports ------------------------------------------------------ */
    S.push({
      id: 'attb-gs', eyebrow: 'Action plan',
      title: 'Guiding Stars action plan',
      intro: 'A segment pill sorts the whole plan into quick wins, near-misses and deeper work. The recommended-move column carries a second line that is sometimes an outcome and sometimes a row of blocker pills, so this column changes height row to row.',
      page: 'Guiding Stars report', href: 'report-guiding-stars.html',
      note: 'Sample data: four products across all four plan segments.',
      minw: 860,
      cols: [['Segment', ''], ['Product', 'id'], ['Current', 'c'], ['Recommended move', ''], ['', 'act']],
      rows: [
        ['Quick win', 'Wheat Thins', 'Wheat Thins Original', 0, 'Cut added sugar 4 g → under the 40%-kcal cap', '→ ★', null],
        ['Near-miss', 'Oreo', 'Oreo Thins Original', 0, 'Cut added sugar under cap · trim saturated fat below 1 g / 100 kcal', '2 moves → ★', null],
        ['Deeper work', 'Oreo', 'Oreo Original', 0, 'Reformulate crème + reduce sugar ~35%', null, ['Added sugar', 'Sat fat', 'Additives']],
        ['Earning', 'Triscuit', 'Triscuit Hint of Sea Salt', 2, 'Holding 2★ — protect fiber & sodium on the next change', 'Qualifies', null],
      ].map((r) => [
        pill(r[0]),
        idCell(r[2], r[1], r[2]),
        stars(r[3], 3),
        '<span class="attb-move">' +
          `<span class="attb-prose">${escq(r[4])}</span>` +
          (r[6] ? tags(r[6]) : `<span class="attb-move-out">${escq(r[5])}</span>`) +
        '</span>',
        btn('Open in Studio', '', 'ghost'),
      ]),
    });

    /* ---- Verification ------------------------------------------------- */
    S.push({
      id: 'attb-vf-select', eyebrow: 'Select list',
      title: 'Qualifying SKUs to run through Non-UPF verification',
      intro: 'The portfolio grid trimmed to what the verification step needs: pick the rows, read the shield, attest. Ineligible rows keep the ⋮ but lose the action button, which is how the table says no without an error.',
      page: 'Non-UPF Verification', href: 'verification.html',
      note: 'Sample data: four SKUs at the select step.',
      minw: 820,
      cols: [['', 'c'], ['', 'c'], ['', 'act'], ['Product', 'id'], ['Non-UPF Shield', ''], ['Updated', 'dates']],
      rows: [
        ['Powdered Vitamin Eggs', '818491020984', 'Pre-Qualified', 1, 'Jul 29, 2026', 'Jul 22, 2026'],
        ['Instant Vitamin Potato', '818491021820', 'Pre-Qualified', 1, 'Jun 24, 2026', 'Jun 18, 2026'],
        ['Powdered Vitamin Butter', '818491021097', 'Pending Attestation', 1, 'Jul 12, 2026', 'Jul 05, 2026'],
        ['Freeze-Dried Mixed Vegetables', '818491021905', 'Ineligible', 0, 'Jun 12, 2026', 'Jun 05, 2026'],
      ].map((r) => [
        check(),
        rowmenu(r[3] ? ['Review & Attest', 'View', 'Edit'] : ['View', 'Edit']),
        r[3] ? btn('Review & Attest', '', 'link') : NA,
        idCell(r[0], 'UPC · ' + r[1], r[1]),
        pill(r[2]), dates('Updated', r[4], 'Last edited', r[5]),
      ]),
    });

    S.push({
      id: 'attb-gv', eyebrow: 'Documentation list',
      title: 'Ingredient-level GRAS documentation',
      intro: 'An ingredient, how much of the portfolio it touches, its status, and the one button that moves it forward. The impact column pairs a count with the share it represents, so the number never stands without its denominator.',
      page: 'GRAS Verification', href: 'gras-verification.html',
      note: 'Sample data: four ingredients at first load, all still unclear.',
      minw: 720,
      cols: [['Ingredient', 'stack'], ['Portfolio impact', 'num'], ['GRAS status', ''], ['', 'act']],
      rows: [
        ['Maltodextrin', 'Carrier / processing aid · rec. Self-Affirmation GRAS', 18, 45],
        ['Natural Flavor', 'Flavoring · rec. FEMA GRAS', 12, 30],
        ['Modified Food Starch', 'Thickener · rec. Self-Affirmation GRAS', 9, 22],
        ['Disodium Inosinate', 'Flavor enhancer · rec. FDA GRAS Notice', 5, 12],
      ].map((r) => [
        stack(r[0], r[1]),
        `<span class="attb-impactcell"><span class="attb-num" data-to="${r[2]}">0</span>` +
        `<span class="attb-stack-sub">products · ${r[3]}% of portfolio</span></span>`,
        pill('Unclear'),
        btn('Verify', '', 'primary'),
      ]),
    });

    /* ---- Organization & Admin ----------------------------------------- */
    S.push({
      id: 'attb-team', eyebrow: 'Team board',
      title: 'People on the signed-in brand',
      intro: 'The admin shape: a ⋮ column, an identity column carrying name over email, two pills, and a date that also records who did it. The real admin grids collapse to cards at 720px rather than 560, being denser than they look.',
      page: 'Team', href: 'teams.html',
      note: 'Sample data: four Flax4Life members across all four states.',
      minw: 800,
      cols: [['', 'c'], ['Member', 'id'], ['Role', ''], ['Status', ''], ['Joined', 'dates']],
      rows: [
        ['Kasondra Shippen', 'kasondra@flax4life.net', 'Owner', 'Active', 'Joined', 'Apr 18, 2026', 'Joined by', 'WISEcode'],
        ['Maya Chen', 'mchen@flax4life.net', 'Admin', 'Active', 'Joined', 'May 2, 2026', 'Joined by', 'Kasondra Shippen'],
        ['Priya Nair', 'pnair@flax4life.net', 'Editor', 'Invited', 'Sent', 'Aug 20, 2026', 'Invited by', 'Maya Chen'],
        ['Alex Kim', 'akim@flax4life.net', 'Viewer', 'Deactivated', 'Joined', 'Jul 3, 2026', 'Removed by', 'Kasondra Shippen'],
      ].map((r) => [
        rowmenu(['Change role', 'Resend invite', 'Remove from team']),
        `<span class="attb-id">${avatar(r[0])}${stack(r[0], r[1])}</span>`,
        pill(r[2]), pill(r[3]), dates(r[4], r[5], r[6], r[7]),
      ]),
    });

    S.push({
      id: 'attb-orgs', eyebrow: 'Directory',
      title: 'Customer organization directory',
      intro: 'Six columns, two of them bare counts. Those two are the first thing to look wrong on a phone — as labelled fields in a stacked card they read fine, but crushed into 30px of a table column they do not.',
      page: 'Organizations', href: 'organizations.html',
      note: 'Sample data: four customer organizations.',
      minw: 820,
      cols: [['', 'c'], ['Company + Type', 'id'], ['Status', ''], ['Joined', 'dates'], ['Users', 'num'], ['Products', 'num']],
      rows: [
        ['Abbot’s Butcher', 'Active', 'Jun 26, 2026', 1, 6],
        ['Aldi', 'Inactive', '', 0, 250],
        ['Brave Foods', 'Invited', '', 0, 0],
        ['Flax4Life', 'Active', 'Apr 18, 2026', 3, 9],
      ].map((r) => [
        rowmenu(['Manage organization', 'Manage users', 'Quick invite', 'Edit']),
        `<span class="attb-id">${avatar(r[0])}${stack(r[0], 'Independent Food/Beverage Brand')}</span>`,
        pill(r[1]),
        r[2] ? dates('Joined', r[2], '', '') : NA,
        `<span class="attb-num" data-to="${r[3]}">0</span>`,
        `<span class="attb-num" data-to="${r[4]}">0</span>`,
      ]),
    });

    S.push({
      id: 'attb-users', eyebrow: 'User board',
      title: 'Users and roles across the workspace',
      intro: 'The widest identity cell in the app: handle, email, internal id and full name in one column, then three state pills, a count and an edit control. No ⋮ here — the edit button is the whole row menu.',
      page: 'User Management', href: 'user-management.html',
      note: 'Sample data: four workspace users.',
      minw: 860,
      cols: [['User', 'id'], ['Roles', ''], ['Email Status', ''], ['Lockout', ''], ['Orgs', 'num'], ['', 'act']],
      rows: [
        ['akrupsky', 'akrupsky@wisecode.ai', '019b0b57', 'Arthur Krupsky', 'Admin', 'Confirmed', 'Active', 0],
        ['kjones+emailtest', 'kjones+emailtest@wisecode.ai', '019f24b3', 'Kevin Jones', 'User', 'Confirmed', 'Active', 1],
        ['kjones+magicdump2', 'kjones+magicdump2@wisecode.ai', '019f7a11', 'Kevin Jones', 'User', 'Confirmed', 'Locked', 2],
        ['kjones+arti', 'kjones+arti@wisecode.ai', '019f6d5b', 'Kevin Jones', 'No roles', 'Pending', 'Active', 0],
      ].map((r) => [
        `<span class="attb-id">${avatar(r[3])}<span class="attb-stack">` +
        `<span class="attb-stack-t">${escq(r[0])}</span>` +
        `<span class="attb-stack-sub">${escq(r[1])}</span>` +
        `<span class="attb-stack-sub">ID: ${escq(r[2])} · ${escq(r[3])}</span></span></span>`,
        pill(r[4]), pill(r[5]), pill(r[6]),
        `<span class="attb-num" data-to="${r[7]}">0</span>`,
        btn('Edit', 'edit', 'ghost'),
      ]),
    });

    S.push({
      id: 'attb-audit', eyebrow: 'Review queue',
      title: 'Ingredient audit review queue',
      intro: 'Seven columns where one of them is a free-text note. The note is clamped in the real queue and still sets the row height; it is the clearest case on the page for stacking rather than scrolling, because a clamped note in a 90px column says nothing.',
      page: 'Audit Queue', href: 'audit-queue.html',
      note: 'Sample data: four flagged ingredient mappings.',
      minw: 1040,
      cols: [['Brand / Food', 'stack'], ['Raw Ingredient', ''], ['Current Mapping', ''], ['Brand’s Action', ''], ['Brand’s Notes', ''], ['Flagged', 'dates'], ['', 'act']],
      rows: [
        ['Karma Wellness Kitchen', 'Vegan Cheese Pops', 'Popped Water Lily Seeds', '', 'Suggest New Canon', 'Proposed new canon: Popped Water Lily Seeds.', '48m ago', 'Vikita P.'],
        ['Hoplark', 'The Sprucey One', 'Fir Tips', '', 'Not Sure', 'Spruce tips are the young growths of the tree.', '2d ago', 'Frances M.'],
        ['Karma Wellness Kitchen', 'Original Popped Lotus Seeds', 'Sunflower Oil', 'Sunflower Oil', 'Remapped', 'Auditor accepted the brand suggestion.', '3d ago', 'Vikita P.'],
        ['Hoplark', 'The Half & Half One', 'RE-ANALYZE', '', 'Canceled', 'Withdrawn — superseded by a brand re-analyze.', '6d ago', 'Frances M.'],
      ].map((r) => [
        stack(r[0], r[1]),
        `<span class="attb-strong">${escq(r[2])}</span>`,
        r[3] ? `<span class="attb-mapped">${escq(r[3])}</span>`
          : '<span class="attb-unmapped">unmatched</span>',
        pill(r[4]),
        `<span class="attb-note">${escq(r[5])}</span>`,
        dates('Flagged', r[6], 'by', r[7]),
        btn('Resolve', '', 'ghost'),
      ]),
    });

    S.push({
      id: 'attb-nud', eyebrow: 'Verification board',
      title: 'Verification analytics board',
      intro: 'The admin grid with two status columns instead of one — the verification verdict and the workflow state, which are not the same thing. This is the one admin table that keeps its columns down to 640px before it stacks.',
      page: 'Non-UPF Dashboard', href: 'non-upf-dashboard.html',
      note: 'Sample data: four verified and unverified SKUs.',
      minw: 800,
      cols: [['', 'c'], ['Product Name', 'id'], ['Verification', ''], ['Status', ''], ['Updated', 'dates']],
      rows: [
        ['Powdered Vitamin Eggs', '818491020984', 'Non-UPF', 'Verified', 'May 22, 2026'],
        ['Protein Cereal — Chocolate', '818491021332', 'UPF', 'Action Required', 'May 19, 2026'],
        ['Triple Cheese Mac — Protein Meal', '818491021561', 'UPF', 'Ineligible', 'May 16, 2026'],
        ['Instant Vitamin Potato', '818491021820', 'Non-UPF', 'Pending Attestation', 'May 21, 2026'],
      ].map((r) => [
        rowmenu(['Open product', 'Edit details', 'Re-run verification', 'Duplicate', 'Delete product']),
        idCell(r[0], 'UPC · ' + r[1], r[1]),
        pill(r[2]), pill(r[3]), dates('Updated', r[4], '', ''),
      ]),
    });

    S.push({
      id: 'attb-qi', eyebrow: 'Invite history',
      title: 'Recent one-step organization invitations',
      intro: 'An invitee, the organization they were invited to, the state of the invite, and who sent it. The email is the cell that truncates first — long addresses are the norm here, not the exception.',
      page: 'Quick Invite', href: 'quick-invite.html',
      note: 'Sample data: four recent invitations.',
      minw: 820,
      cols: [['', 'c'], ['Invitee', 'id'], ['Organization', ''], ['Status', ''], ['Sent', 'dates']],
      rows: [
        ['Kelly Z Crackers', 'kswanzy+magiczcrackers@wisecode.ai', 'Z Crackers', 'Sent', 'Jul 30, 2026', 'Kelly Swanzy'],
        ['Ada Applegate', 'aapplegate+beta@wisecode.ai', 'Applegate', 'Accepted', 'Jul 17, 2026', 'Kelly Swanzy'],
        ['Tom Arti', 'tarti+launch@wisecode.ai', 'Arti Bars', 'Pending', 'Jul 17, 2026', 'Rob Simmermon'],
        ['Rob Simmermon', 'rsimmermon+testinvite@wisecode.ai', 'Vive Juicery', 'Cancelled', 'Jul 17, 2026', 'Rob Simmermon'],
      ].map((r) => [
        rowmenu(['Copy invite link', 'Resend invite', 'Cancel invite']),
        `<span class="attb-id">${avatar(r[0])}${stack(r[0], r[1])}</span>`,
        `<span class="attb-org">${escq(r[2])}</span>`,
        pill(r[3]), dates('Sent', r[4], 'by', r[5]),
      ]),
    });

    /* ---- Account ------------------------------------------------------ */
    S.push({
      id: 'attb-inv', eyebrow: 'Billing board',
      title: 'Every invoice and its status',
      intro: 'The only table where status is coloured text beside an icon rather than a pill, and where the action column holds up to four buttons that change with that status. Those buttons are what force this table to stack early.',
      page: 'Invoices', href: 'invoices.html',
      note: 'Sample data: four invoices, one in each state.',
      minw: 800,
      cols: [['', 'c'], ['Issued', 'dates'], ['Amount / Description', 'stack'], ['Actions', 'act']],
      rows: [
        ['#RQVPPYUX-0001', 'Apr 20, 2026', 'May 4, 2026', 'Invoice Sent', '$891.00', 'SKU Verification', '9 items', ['Pay Now', 'Cancel', 'Mark paid externally', 'Invoice']],
        ['#RQVPPYUX-0003', 'Apr 12, 2026', 'Apr 26, 2026', 'Paid', '$480.00', 'Marketing Assets Pack', '24 assets', ['Download', 'Invoice']],
        ['#RQVPPYUX-0005', 'Mar 22, 2026', 'Apr 5, 2026', 'Failed', '$256.00', 'Bulk UPC Import', '128 UPCs', ['Retry Payment', 'Cancel', 'Invoice']],
        ['#RQVPPYUX-0006', 'Mar 15, 2026', 'Mar 29, 2026', 'Cancelled', '$340.00', 'Reformulation Report', '2 items', ['Invoice']],
      ].map((r) => [
        rowmenu(r[7]),
        '<span class="attb-invcell">' + dates('Issued', r[1], 'Due', r[2]) +
        `<span class="attb-invno">${escq(r[0])}</span>` + invStatus(r[3]) + '</span>',
        `<span class="attb-stack"><span class="attb-amount">${escq(r[4])}</span>` +
        `<span class="attb-stack-t">${escq(r[5])}</span>` +
        `<span class="attb-stack-sub">${escq(r[6])}</span></span>`,
        `<span class="attb-btnrow">${r[7].map((b) => btn(b, '', b === r[7][0] && r[3] !== 'Cancelled' ? 'primary' : 'ghost')).join('')}</span>`,
      ]),
    });

    S.push({
      id: 'attb-ma', eyebrow: 'File tree',
      title: 'The co-branding toolkit, as a tree',
      intro: 'Not a flat list: an expand chevron opens a folder and its children are indented beneath it, one table doing the work of a file browser. Rolled-up sizes on the folder rows are the only numbers here.',
      page: 'Marketing Assets', href: 'marketing-assets.html',
      note: 'Sample data: one toolkit folder, expanded two levels.',
      minw: 720,
      cols: [['', 'c'], ['', 'c'], ['Name', ''], ['Size', 'num'], ['Updated', 'dates']],
      rows: [
        [0, 'folder', 'One-Sheet Toolkit', '3 folders · 1 file', '19.1 MB', 'Apr 17, 2026'],
        [1, 'folder', 'Template A', '3 files', '15.4 MB', 'Apr 17, 2026'],
        [2, 'image', 'Non-UPF Verified Co-Branded Onesheet – Template A.png', '', '1.9 MB', 'Apr 17, 2026'],
        [1, 'pdf', '1 – Instructions – WISEcode One Sheet Toolkit.pdf', '', '3.7 MB', 'Apr 17, 2026'],
      ].map((r) => [
        r[1] === 'folder'
          ? '<span class="material-symbols-outlined attb-chev is-open" aria-hidden="true">chevron_right</span>'
          : '',
        rowmenu(r[1] === 'folder' ? ['Collapse'] : ['Preview', 'Download']),
        `<span class="attb-tree" style="--attb-depth:${r[0]}">` +
        `<span class="material-symbols-outlined attb-fileic">${
          r[1] === 'folder' ? 'folder' : r[1] === 'pdf' ? 'picture_as_pdf' : 'image'}</span>` +
        `<span class="attb-strong">${escq(r[2])}</span>` +
        (r[3] ? `<span class="attb-count">${escq(r[3])}</span>` : '') + '</span>',
        `<span class="attb-num">${escq(r[4])}</span>`,
        dates('Updated', r[5], '', ''),
      ]),
    });

    S.push({
      id: 'attb-ak', eyebrow: 'Key board',
      title: 'API keys, with scope and usage',
      intro: 'The one table that already hides columns rather than stacking: below 860px the real board drops Scope and Last used and keeps name, key, status and the revoke action. A masked key never wraps, so it sets the floor.',
      page: 'API Keys', href: 'api-keys.html',
      note: 'Sample data: the three seeded keys.',
      minw: 860,
      cols: [['Name', ''], ['Key', ''], ['Scope', ''], ['Last used', 'dates'], ['Status', ''], ['', 'act']],
      rows: [
        ['Production', 'sk_demo_9f2••••••••••7Gh', 'Full access', '2 hours ago', 'Mar 14, 2024', 'Active'],
        ['Analytics pipeline', 'sk_demo_2Hj••••••••••Cd2', 'Read-only', 'Yesterday', 'Apr 02, 2024', 'Active'],
        ['Legacy import', 'sk_demo_5Lm••••••••••De5', 'Write', '3 weeks ago', 'Jan 08, 2024', 'Rotate soon'],
      ].map((r) => [
        `<span class="attb-strong">${escq(r[0])}</span>`,
        code(r[1]),
        pill(r[2]),
        dates('Last used', r[3], 'Created', r[4]),
        pill(r[5]),
        btn('Revoke', '', 'ghost'),
      ]),
    });

    return S;
  }

  /* ── Small cell helpers used by more than one specimen ──────────────── */

  function idCell(name, sub, seed) {
    return `<span class="attb-id">${photo(seed || name, name)}${stack(name, sub)}</span>`;
  }

  /* The reports column on the portfolio grid is a `description` icon over a
     titled menu, not a second ⋮ — two identical glyphs in one row would read
     as a mistake. */
  function reportsIcon() {
    return rowmenu(['Product Details Report', 'Product UPF', 'Product GRAS', 'Portfolio Insights'],
      { glyph: 'description', title: 'Reports', label: 'Reports for this product' });
  }

  function gradeCell(score, grade) {
    return '<span class="attb-grade">' +
      `<span class="attb-num" data-to="${score}">0</span>` +
      `<span class="atx-mini"><span class="atx-mini-fill" style="--atx-mini:${score}%;background:${tierVar(score)}"></span></span>` +
      `<span class="attb-gradeltr">${escq(grade)}</span></span>`;
  }

  function pillEffort(label) {
    const t = label === 'Low effort' ? 'good' : label === 'Medium effort' ? 'warn' : 'alert';
    return `<span class="upf-pill upf-pill--${t}">${escq(label)}</span>`;
  }

  function invStatus(label) {
    const icon = label === 'Paid' ? 'check_circle'
      : label === 'Failed' ? 'error'
      : label === 'Cancelled' ? 'cancel' : 'send';
    return `<span class="attb-invstatus attb-invstatus--${tone(label)}">` +
      `<span class="material-symbols-outlined">${icon}</span>${escq(label)}</span>`;
  }

  /* ── Build ────────────────────────────────────────────────────────────── */

  function buildSpecimen(spec) {
    const el = card({
      id: spec.id,
      eyebrow: spec.eyebrow,
      title: spec.title,
      intro: spec.intro,
      className: 'attb-card',
      noteHTML: escq(spec.note) + ' Lives on <a class="attb-src" href="' +
        escq(spec.href) + '">' + escq(spec.page) + '</a>.',
    });
    const stage = el.querySelector('.atx-stage');
    const wrap = document.createElement('div');
    wrap.className = 'atx-tbl-wrap attb-wrap';
    stage.appendChild(wrap);

    const head = spec.cols.map(([label, cls]) =>
      `<th class="${cls ? 'attb-th--' + cls : ''}"${label ? '' : ' aria-label="Row controls"'}` +
      `${label ? '' : ' data-no-sort'}>${escq(label)}</th>`).join('');

    /* --attb-minw is a custom property, not min-width: card mode sets
       `min-width: 0` on the table and an inline min-width would beat it. */
    wrap.innerHTML = `<table class="atx-tbl attb-tbl" data-no-paginate ` +
      `style="--attb-minw:${spec.minw}px"><thead><tr>${head}</tr></thead><tbody>` +
      spec.rows.map((cells) => '<tr>' + cells.map((c, i) =>
        `<td class="${spec.cols[i][1] ? 'attb-td--' + spec.cols[i][1] : ''}">${c}</td>`
      ).join('') + '</tr>').join('') +
      '</tbody></table>';

    /* Every number in a specimen counts up with the card, the same as the
       charts above it. */
    const nums = [];
    wrap.querySelectorAll('[data-to]').forEach((node, i) => {
      nums.push({ node, to: Number(node.dataset.to), dur: 1000, delay: i * 30 });
    });

    wire(el, makePlay(stage, { nums }));
    return el;
  }

  /* ── Row menus ────────────────────────────────────────────────────────── */

  /* One delegated toggle for every specimen ⋮. Hover-open (kebab-hover.js)
     synthesizes a click here, so this is the only open path. */
  function wireMenus() {
    document.addEventListener('click', (e) => {
      const btnEl = e.target.closest && e.target.closest('.attb-rowmenu-btn');
      const inside = e.target.closest && e.target.closest('.attb-rowmenu-pop');
      if (inside && !btnEl) { closeMenus(); return; }
      if (!btnEl) { closeMenus(); return; }
      const pop = document.getElementById(btnEl.getAttribute('aria-controls'));
      if (!pop) return;
      const open = btnEl.getAttribute('aria-expanded') === 'true';
      closeMenus();
      if (open) return;
      btnEl.setAttribute('aria-expanded', 'true');
      pop.hidden = false;
      e.preventDefault();
      e.stopPropagation();
    }, true);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });
  }

  function closeMenus() {
    document.querySelectorAll('.attb-rowmenu-btn[aria-expanded="true"]').forEach((b) => {
      b.setAttribute('aria-expanded', 'false');
      const pop = document.getElementById(b.getAttribute('aria-controls'));
      if (pop) pop.hidden = true;
    });
  }

  /* A photo that never arrives falls back to the product's initials — never
     an icon sitting on a tile. */
  function wireThumbs(root) {
    root.querySelectorAll('.attb-thumb img').forEach((img) => {
      img.addEventListener('error', () => {
        const holder = img.closest('.attb-thumb');
        if (!holder) return;
        holder.classList.add('is-fallback');
        holder.textContent = holder.dataset.attbInitials || '';
      }, { once: true });
    });
  }

  function mount() {
    const scroll = document.getElementById('agent-main-scroll');
    const dash = scroll && scroll.querySelector('.dash');
    if (!dash) return false;
    if (document.getElementById('attb-pf-claimed')) return true;
    /* Wait for the variation charts, so the tables land after them. */
    if (!document.getElementById('atx-heat-card')) return false;
    const frag = document.createDocumentFragment();
    specimens().forEach((spec) => {
      try {
        const el = buildSpecimen(spec);
        if (el) frag.appendChild(el);
      } catch (e) { /* one bad specimen never blocks the rest */ }
    });
    dash.appendChild(frag);
    wireThumbs(dash);
    return true;
  }

  function init() {
    wireMenus();
    if (mount()) return;
    const obs = new MutationObserver(() => { if (mount()) obs.disconnect(); });
    obs.observe(document.getElementById('agent-main-scroll') || document.body,
      { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 18000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
