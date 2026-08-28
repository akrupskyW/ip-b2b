/* =============================================================================
   sticky-report.js — pre-built Product Details and UPF reports.

   Shared by the Product Portfolio sticky Report module and the Reports
   library. The bodies are finished reports (not placeholders): scorecards,
   a product table, nutrition, and ingredients — the same two titles you
   pick from the portfolio reports popover.
   ============================================================================= */
(function () {
  'use strict';
  if (window.WiseStickyReport) return;

  var TITLES = {
    details: 'Product Details Report',
    upf: 'Product UPF',
  };

  var UPF_ROWS = [
    { name: 'Toasted Coconut Brownies-12 ct', upc: '8 57287 00420 3', cls: 'Non-UPF', proc: 'Lightly Processed', shield: 'Verified', img: '../assets/portfolio/coconut_brownies.png' },
    { name: 'Chocolate Chip Muffins-4 ct', upc: '0 65776 63152 0', cls: 'Non-UPF', proc: 'Lightly Processed', shield: 'Verified', img: '../assets/portfolio/chocolate_chip_muffins.png' },
    { name: 'Carrot Raisin Muffins- 4 ct', upc: '0 65776 63151 3', cls: 'Non-UPF', proc: 'Minimally Processed', shield: 'Verified', img: '../assets/portfolio/carrot_raisin_muffins.png' },
    { name: 'Chocolate Brownies-12 ct', upc: '0 65776 63550 4', cls: 'Non-UPF', proc: 'Lightly Processed', shield: 'Verified', img: '../assets/portfolio/chocolate_brownies.png' },
    { name: 'Vegan Carrot Raisin Mini Muffins', upc: '8 57287 00482 1', cls: 'Non-UPF', proc: 'Lightly Processed', shield: 'Pending Attestation', img: '../assets/portfolio/vegan_carrot_raisin_mini.png' },
    { name: 'Chunky Chocolate Granola', upc: '8 57287 00427 2', cls: 'Non-UPF', proc: 'Minimally Processed', shield: 'Pending Attestation', img: '../assets/portfolio/granola.jpg' },
    { name: 'Oatmeal Raisin Cookies-5 ct', upc: '8 57287 00456 2', cls: 'Non-UPF', proc: 'Minimally Processed', shield: 'Pre-qualified', img: '../assets/portfolio/oatmeal_raisin_cookies.png' },
    { name: 'Vegan Blueberry Mini Muffins', upc: '8 57287 00481 4', cls: 'UPF', proc: 'Ultra-Processed', shield: 'Ineligible', img: '../assets/portfolio/vegan_blueberry_mini.png' },
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function countVal(n, extraClass) {
    var cls = 'dash-report-stat-val' + (extraClass ? ' ' + extraClass : '');
    return '<span class="' + cls + '" data-countup>' + esc(String(n)) + '</span>';
  }

  function stat(label, valueHtml) {
    return '<div class="dash-report-stat">' +
      valueHtml +
      '<span class="dash-report-stat-label">' + esc(label) + '</span>' +
      '</div>';
  }

  function pill(text, tone) {
    return '<span class="pf-rpt-pill pf-rpt-pill--' + esc(tone) + '">' + esc(text) + '</span>';
  }

  function shieldTone(s) {
    if (s === 'Verified') return 'verified';
    if (s === 'Pre-qualified') return 'prequal';
    if (s === 'Pending Attestation') return 'attest';
    if (s === 'Ineligible') return 'inelig';
    return 'muted';
  }

  function clsTone(s) {
    return s === 'Non-UPF' ? 'verified' : 'inelig';
  }

  function detailsHTML(product) {
    var name = (product && product.name) || 'Toasted Coconut Brownies-12 ct';
    var upc = (product && product.upc) || '8 57287 00420 3';
    var img = (product && product.img) || '../assets/portfolio/coconut_brownies.png';
    return '' +
      '<article class="pf-rpt-doc" aria-label="Product Details Report">' +
        '<header class="pf-rpt-hero">' +
          '<span class="pf-rpt-hero-img"><img src="' + esc(img) + '" alt="' + esc(name) + '"></span>' +
          '<div class="pf-rpt-hero-copy">' +
            '<h2 class="pf-rpt-title">' + esc(name) + '</h2>' +
            '<p class="pf-rpt-lede">Flax4Life · UPC ' + esc(upc) + ' · Complete data · Non-UPF Verified</p>' +
            '<div class="pf-rpt-hero-pills">' +
              pill('Non-UPF Verified', 'verified') +
              pill('Data complete', 'complete') +
              pill('12-count pack', 'muted') +
            '</div>' +
          '</div>' +
        '</header>' +
        '<div class="dash-report-stats">' +
          stat('WISEscore', countVal(82)) +
          stat('Non-UPF', '<span class="dash-pct-wrap">' + countVal(100) + '<span class="dash-pct">%</span></span>') +
          stat('Calories / serving', countVal(160)) +
        '</div>' +
        '<section class="pf-rpt-sec">' +
          '<h3 class="pf-rpt-sec-title">Nutrition</h3>' +
          '<p class="pf-rpt-sec-lede">Per serving · 1 brownie (42 g) · 12 servings per container.</p>' +
          '<div class="pf-rpt-nutri">' +
            '<div class="pf-rpt-nutri-row"><span>Total Fat</span><strong>9 g</strong></div>' +
            '<div class="pf-rpt-nutri-row"><span>Saturated Fat</span><strong>4.5 g</strong></div>' +
            '<div class="pf-rpt-nutri-row"><span>Sodium</span><strong>95 mg</strong></div>' +
            '<div class="pf-rpt-nutri-row"><span>Total Carbohydrate</span><strong>18 g</strong></div>' +
            '<div class="pf-rpt-nutri-row"><span>Dietary Fiber</span><strong>3 g</strong></div>' +
            '<div class="pf-rpt-nutri-row"><span>Total Sugars</span><strong>9 g</strong></div>' +
            '<div class="pf-rpt-nutri-row"><span>Protein</span><strong>3 g</strong></div>' +
          '</div>' +
        '</section>' +
        '<section class="pf-rpt-sec">' +
          '<h3 class="pf-rpt-sec-title">Ingredients</h3>' +
          '<p class="pf-rpt-body">Organic flaxseed meal, organic coconut sugar, organic coconut, organic cocoa, organic eggs, organic coconut oil, baking soda, sea salt, vanilla extract.</p>' +
        '</section>' +
        '<section class="pf-rpt-sec">' +
          '<h3 class="pf-rpt-sec-title">Classification</h3>' +
          '<p class="pf-rpt-body">Classified <strong>Non-UPF</strong> · Lightly Processed. No industrial markers, no emulsifiers, no artificial colours. Eligible for — and currently carrying — the Non-UPF Verified shield.</p>' +
        '</section>' +
      '</article>';
  }

  function upfHTML() {
    var rows = UPF_ROWS.map(function (r) {
      return '<div class="pf-rpt-trow">' +
        '<span class="pf-rpt-prod">' +
          '<span class="pf-rpt-thumb"><img src="' + esc(r.img) + '" alt=""></span>' +
          '<span class="pf-rpt-prod-text">' +
            '<span class="pf-rpt-pname">' + esc(r.name) + '</span>' +
            '<span class="pf-rpt-upc">UPC · ' + esc(r.upc) + '</span>' +
          '</span>' +
        '</span>' +
        pill(r.cls, clsTone(r.cls)) +
        '<span class="pf-rpt-proc">' + esc(r.proc) + '</span>' +
        pill(r.shield, shieldTone(r.shield)) +
      '</div>';
    }).join('');

    return '' +
      '<article class="pf-rpt-doc" aria-label="Product UPF">' +
        '<header class="pf-rpt-hero pf-rpt-hero--plain">' +
          '<div class="pf-rpt-hero-copy">' +
            '<h2 class="pf-rpt-title">Product UPF</h2>' +
            '<p class="pf-rpt-lede">Flax4Life · ultra-processed food classification across the claimed portfolio.</p>' +
          '</div>' +
        '</header>' +
        '<p class="dash-report-summary is-teal">8 of 10 claimed products are Non-UPF. Two sit outside the shield — one ineligible, one still in review on processing.</p>' +
        '<div class="dash-report-stats">' +
          stat('Non-UPF score', '<span class="dash-pct-wrap">' + countVal(80) + '<span class="dash-pct">%</span></span>') +
          stat('Non-UPF products', countVal(8)) +
          stat('Claimed products', countVal(10)) +
        '</div>' +
        '<section class="pf-rpt-sec">' +
          '<h3 class="pf-rpt-sec-title">Processing levels</h3>' +
          '<div class="pf-rpt-bars" role="img" aria-label="Processing level mix">' +
            '<div class="pf-rpt-bar" style="--n:4"><span class="pf-rpt-bar-fill pf-rpt-bar-fill--green"></span><span class="pf-rpt-bar-label">Minimally Processed · 4</span></div>' +
            '<div class="pf-rpt-bar" style="--n:4"><span class="pf-rpt-bar-fill pf-rpt-bar-fill--teal"></span><span class="pf-rpt-bar-label">Lightly Processed · 4</span></div>' +
            '<div class="pf-rpt-bar" style="--n:1"><span class="pf-rpt-bar-fill pf-rpt-bar-fill--red"></span><span class="pf-rpt-bar-label">Ultra-Processed · 1</span></div>' +
            '<div class="pf-rpt-bar" style="--n:1"><span class="pf-rpt-bar-fill pf-rpt-bar-fill--amber"></span><span class="pf-rpt-bar-label">In review · 1</span></div>' +
          '</div>' +
        '</section>' +
        '<section class="pf-rpt-sec">' +
          '<h3 class="pf-rpt-sec-title">Claimed products</h3>' +
          '<div class="pf-rpt-table">' +
            '<div class="pf-rpt-thead"><span>Product</span><span>UPF</span><span>Processing</span><span>Shield</span></div>' +
            rows +
          '</div>' +
        '</section>' +
      '</article>';
  }

  function bodyHTML(id, product) {
    if (id === 'details') return detailsHTML(product);
    if (id === 'upf') return upfHTML();
    return '';
  }

  function fill(panel, id, product) {
    if (!panel || !bodyHTML(id, product)) return false;
    var titleEl = panel.querySelector('#pf-report-title');
    var subEl = panel.querySelector('#pf-report-sub');
    var body = panel.querySelector('#pf-report-body');
    var name = (product && product.name) || '';
    if (titleEl) titleEl.textContent = TITLES[id] || 'Report';
    if (subEl) {
      if (id === 'details') subEl.textContent = (name || 'Toasted Coconut Brownies-12 ct') + ' · Flax4Life';
      else subEl.textContent = name ? (name + ' · Flax4Life') : 'Flax4Life · Claimed portfolio';
    }
    if (body) body.innerHTML = bodyHTML(id, product);
    panel.dataset.reportId = id;
    return true;
  }

  window.WiseStickyReport = {
    titles: TITLES,
    bodyHTML: bodyHTML,
    fill: fill,
  };
})();
