/**
 * Brand Intelligence dashboard home.
 *
 * Renders the welcome/claim/UPF/GRAS/WISEscore overview into the agent
 * shell's main scroll area (#agent-main-scroll). Charts are built with
 * pure CSS (conic-gradient rings + flex segment bars) so the page stays
 * self-contained and themes with the shared tokens in agent-page.css.
 *
 * First pass of the layout — the data below is placeholder copy that we'll
 * iterate on; it mirrors the reference design for "Date Better Snacks".
 */

/* The WISE "bug" mark (mirrors js/topbar.js). Rendered large and faint behind
   the insights CTA so it reads as embossed into the primary-blue banner. */
const BUG_WATERMARK_SVG = `
  <svg class="dash-cta-bug" viewBox="0 0 193 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M10.9834 35.6522C10.9834 35.6522 3.30615 47.7494 3.30615 58.0481C3.30615 81.1921 20.324 99.6409 43.3405 99.9915C51.5363 100.052 60.4175 99.9915 67.533 92.6894C41.5052 92.6894 25.589 73.777 25.589 58.0481C25.589 58.0481 25.2144 45.6894 30.832 35.9526L10.9834 35.6522Z" fill="currentColor"/>
    <path d="M83.8241 14.7368C90.9396 14.7368 94.8008 22.7337 96.3699 29.2111H96.5571C98.1262 22.7337 101.987 14.7368 109.103 14.7368H170.521C175.169 14.7368 175.169 12.8643 175.169 7.32269C175.169 2.80876 178.108 0 182.131 0H189.384V14.7368C189.384 27.7131 182.131 28.5339 174.794 28.5339L160.347 28.583H118.091C113.597 28.583 113.335 29.2111 111.537 33.7051C110.051 37.4206 96.5571 73.0277 96.5571 73.0277H96.3699C96.3699 73.0277 82.8761 37.4206 81.3899 33.7051C79.5923 29.2111 79.3301 28.583 74.8361 28.583H32.5803L18.133 28.5339C10.7965 28.5339 3.54341 27.7131 3.54341 14.7368V0H10.7965C14.5415 0 17.7585 3.37051 17.7585 7.32269C17.7585 12.8643 17.7585 14.7368 22.406 14.7368H83.8241Z" fill="currentColor"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M71.8001 35.9523C74.4284 35.9523 74.6161 37.2826 75.1793 38.6953L87.9434 71.5913C82.9358 80.6013 74.4289 85.7609 63.9558 85.7609C48.1132 85.7608 33.2662 72.7999 33.2663 54.6695C33.2664 48.2288 34.5088 40.1469 39.2583 35.9523H71.8001ZM63.486 44.5345C58.3905 44.5345 54.2598 48.6005 54.2598 54.0781C54.2598 59.5557 58.3905 63.6217 63.486 63.6217C68.5814 63.6216 72.7122 59.5556 72.7122 54.0781C72.7122 48.6005 68.5814 44.5346 63.486 44.5345Z" fill="currentColor"/>
    <path d="M181.756 35.6522C181.756 35.6522 189.433 47.7494 189.433 58.0481C189.433 81.1921 172.416 99.6409 149.399 99.9915C141.203 100.052 132.322 99.9915 125.206 92.6894C151.234 92.6894 167.151 73.777 167.151 58.0481C167.151 58.0481 167.525 45.6894 161.908 35.9526L181.756 35.6522Z" fill="currentColor"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M120.94 35.9523C118.311 35.9523 118.124 37.2826 117.56 38.6953L104.796 71.5913C109.804 80.6013 118.311 85.7609 128.784 85.7609C144.626 85.7608 159.473 72.7999 159.473 54.6695C159.473 48.2288 158.231 40.1469 153.481 35.9523H120.94ZM129.254 44.5345C134.349 44.5345 138.48 48.6005 138.48 54.0781C138.48 59.5557 134.349 63.6217 129.254 63.6217C124.158 63.6216 120.027 59.5556 120.027 54.0781C120.027 48.6005 124.158 44.5346 129.254 44.5345Z" fill="currentColor"/>
  </svg>`;

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* Score element that count-ups from 0 on load. Target is stored in markup so
   animation does not depend on a post-render prep pass. */
function countUpMarkup(value, { tag = 'span', className = '', style = '' } = {}) {
  const match = String(value).trim().match(/^(\d+)(.*)$/);
  const to = match ? match[1] : '0';
  const rawSuffix = match ? match[2] : '';
  /* A trailing percent sign is pulled out of the count-up element (whose
     textContent the animation rewrites each frame) and rendered as a separate
     near-superscript glyph so it survives the count-up and can be styled. */
  const isPct = rawSuffix.trim() === '%';
  const suffix = isPct ? '' : rawSuffix;
  const cls = className ? `dash-count-up ${className}` : 'dash-count-up';
  const styleAttr = style ? ` style="${style}"` : '';
  const el = `<${tag} class="${cls}" data-count-to="${esc(to)}" data-count-suffix="${esc(suffix)}"${styleAttr}>0${esc(suffix)}</${tag}>`;
  /* Reserve exactly as many digit slots as the final value has, so the count-up
     can't shove the trailing label — but a 1-digit percent ("6%") doesn't get a
     2-digit gap that wouldn't match the non-percent columns in the same row. */
  return isPct
    ? `<span class="dash-pct-wrap">${el}<span class="dash-pct">%</span></span>`
    : el;
}

/* A faint brand-linen glyph floated to the far right of a score, representing
   its label. Pressed into the page with the same debossed feel as the hero
   bug (light bottom-edge highlight), so it reads as stamped rather than drawn. */
const STAMP_ICONS = {
  'Nutrient Quality': 'eco',
  'Ingredient Quality': 'grocery',
  'Health Outcomes': 'monitor_heart',
  'Products Discovered': 'search',
  'Products Claimed': 'inventory_2',
  'Products Qualify': 'verified',
};
function stampIcon(label) {
  const name = STAMP_ICONS[label];
  if (!name) return '';
  return `<span class="dash-stamp-icon" aria-hidden="true"><span class="material-symbols-outlined">${name}</span></span>`;
}

/* ------------------------------------------------------------------ */
/* Persisted brand banner (data URL or remote URL). Stored locally so an
   uploaded image survives reloads. Three states are distinguished:
     • a URL / data URL  → a custom banner the user chose
     • unset (no key)     → fresh: show the bundled default product banner
     • the "__none__" sentinel → the user explicitly removed the banner, so the
       hero falls back to the flat WISE-bug pattern instead of the default. */
const BANNER_KEY = 'wise-brand-banner';
const BANNER_NONE = '__none__';
const DEFAULT_BANNER = '../assets/dash-hero-banner.png';
function getStoredBanner() {
  try { return localStorage.getItem(BANNER_KEY) || ''; } catch (_) { return ''; }
}
/* The image actually shown in the hero: a saved custom image, the bundled
   default product banner when nothing has been chosen yet, or '' when the
   banner was explicitly removed (which reveals the flat pattern). */
function getBrandBanner() {
  const v = getStoredBanner();
  if (v === BANNER_NONE) return '';
  return v || DEFAULT_BANNER;
}
function setBrandBanner(url) {
  try {
    localStorage.setItem(BANNER_KEY, url || BANNER_NONE);
  } catch (_) { /* quota (large data URLs) — keep session-only */ }
}

/* Persisted brand logo — mirrors the banner store. Unset → the bundled default
   Date Better badge; the "__none__" sentinel → the logo was removed (the hero
   shows an "add logo" placeholder); otherwise a custom URL / data URL. */
const LOGO_KEY = 'wise-brand-logo';
const LOGO_NONE = '__none__';
const DEFAULT_LOGO = '../assets/date-better-logo.png';
function getStoredLogo() {
  try { return localStorage.getItem(LOGO_KEY) || ''; } catch (_) { return ''; }
}
function getBrandLogo() {
  const v = getStoredLogo();
  if (v === LOGO_NONE) return '';
  return v || DEFAULT_LOGO;
}
function setBrandLogo(url) {
  try {
    localStorage.setItem(LOGO_KEY, url || LOGO_NONE);
  } catch (_) { /* quota (large data URLs) — keep session-only */ }
}

/* One-time reset to the bundled Date Better brand art. An earlier session left
   a custom banner/logo saved in localStorage, which then overrode the default
   Date Better hero banner + logo and survived ordinary cache clears (localStorage
   isn't part of the HTTP cache). Wipe both keys once so the hero falls back to the
   defaults; the version flag means future custom uploads are left untouched. */
(function resetBrandArtToDateBetterOnce() {
  const FLAG = 'wise-brand-reset-datebetter-v1';
  try {
    if (localStorage.getItem(FLAG)) return;
    localStorage.removeItem(BANNER_KEY);
    localStorage.removeItem(LOGO_KEY);
    localStorage.setItem(FLAG, '1');
  } catch (_) { /* storage unavailable — defaults already apply */ }
})();

/* CSS-safe url() value for inline background-image. */
function cssUrl(url) {
  return `url('${String(url).replace(/'/g, '%27')}')`;
}

/* Palette for chart segments (resolves against shared CSS tokens). */
const C = {
  green: 'var(--sec-green)',
  /* A distinctly lighter shade of green — the "Good" tier and the second
     processing level. */
  greenLight: '#7DC470',
  teal: 'var(--ter-cyan)',
  /* Soft, same-hue blue used as the muted complement in the monochromatic
     health-status gauges. */
  tealSoft: 'color-mix(in srgb, var(--ter-cyan) 50%, var(--surface))',
  amber: 'var(--ter-amber)',
  orange: '#D27326',
  red: 'var(--sec-red)',
  ink: 'var(--text-subtle)',
  primary: 'var(--primary)',
};

const DATA = {
  brand: { name: 'Date Better Snacks', initials: 'DB' },
  claim: { discovered: 47, claimedPct: 6, claimed: 3, unclaimed: 44 },
  upf: {
    pct: 92,
    nonCount: 22,
    total: 24,
    split: [
      { label: 'Non-UPF', value: 22, color: C.teal },
      { label: 'UPF', value: 2, color: C.tealSoft },
    ],
    distribution: [
      { label: 'Minimally Processed', value: 14, color: C.green },
      { label: 'Lightly Processed', value: 8, color: C.greenLight },
      { label: 'Moderately Processed', value: 0, color: C.amber },
      { label: 'Ultra-Processed', value: 1, color: C.orange },
      { label: 'Super Ultra-Processed', value: 1, color: C.red },
    ],
  },
  gras: {
    pct: 88,
    grasCount: 21,
    total: 24,
    split: [
      { label: 'GRAS', value: 21, color: C.teal },
      { label: 'Non-GRAS', value: 3, color: C.tealSoft },
    ],
    uniqueIngredients: 61,
    distribution: [
      { label: 'GRAS', value: 15, color: C.green },
      { label: 'Historical', value: 6, color: C.greenLight },
      { label: 'Unclear', value: 1, color: C.amber },
      { label: 'Unknown Flavors', value: 1, color: C.orange },
      { label: 'Unsafe', value: 1, color: C.red },
    ],
  },
  wisescore: {
    average: 79,
    pillars: [
      { name: 'Nutrient Quality', icon: 'eco', score: 75 },
      { name: 'Ingredient Quality', icon: 'biotech', score: 89 },
      { name: 'Health Outcomes', icon: 'favorite', score: 72 },
    ],
  },
  pillars: [
    {
      name: 'Nutrient Quality', tag: 'NQ',
      score: 75,
      metrics: [
        { name: 'Fiber Density', value: 74 },
        { name: 'Sugar Density', value: 68 },
        { name: 'Protein Density', value: 83 },
        { name: 'Carbohydrate Quality', value: 71 },
        { name: 'Fat Quality', value: 79 },
      ],
    },
    {
      name: 'Ingredient Quality', tag: 'IG',
      score: 89,
      metrics: [
        { name: 'Ultra-Processed Food', value: 91 },
        { name: 'Banned / Unsafe Ingredients', value: 96 },
        { name: 'Clean Label', value: 93 },
        { name: 'Emulsifiers of Concern', value: 82 },
        { name: 'Seed Oils of Concern', value: 64 },
      ],
    },
    {
      name: 'Health Outcomes', tag: 'THRIVE',
      score: 72,
      metrics: [
        { name: 'Heart Health', value: 76 },
        { name: 'Diabetes Friendly', value: 69 },
        { name: 'Gut Health', value: 71 },
        { name: 'Muscle Health', value: 80 },
        { name: 'Anti-Inflammatory', value: 66 },
      ],
    },
  ],
  /* Top processing-driving ingredients across the portfolio. `pct` = share of
     products that contain the ingredient; `level` = its processing tier
     (PL4 highest → PL3). Ranked PL4 first, then PL3, each by descending share. */
  topIngredients: [
    { name: 'Citric Acid',        pct: 83, level: 'PL4' },
    { name: 'Natural Flavors',    pct: 42, level: 'PL4' },
    { name: 'Sunflower Lecithin', pct: 33, level: 'PL4' },
    { name: 'Tapioca Syrup',      pct: 25, level: 'PL4' },
    { name: 'Dark Chocolate',     pct: 75, level: 'PL3' },
    { name: 'Cane Sugar',         pct: 67, level: 'PL3' },
    { name: 'Cocoa Powder',       pct: 54, level: 'PL3' },
    { name: 'Pea Protein',        pct: 38, level: 'PL3' },
    { name: 'Rice Flour',         pct: 29, level: 'PL3' },
    { name: 'Coconut Oil',        pct: 21, level: 'PL3' },
  ],
  /* Per-product anti-inflammatory score (0–100), sorted highest to lowest.
     `score` drives both the fat bar fill and its rating tier (Excellent / Good
     / …) via the shared WISEscore status scale. */
  topProducts: [
    { name: 'Ginger Turmeric Bar',        score: 91, img: '../assets/top5-ginger-turmeric-bar.png' },
    { name: 'Almond Coconut Crisp',       score: 89, img: '../assets/top5-almond-coconut-crisp.png' },
    { name: 'Pistachio Rose Bar',         score: 87, img: '../assets/top5-pistachio-rose-bar.png' },
    { name: 'Matcha Cashew Bites',        score: 85, img: '../assets/top5-matcha-cashew-bites.png' },
    { name: 'Walnut Brownie Bar',         score: 84, img: '../assets/top5-walnut-brownie-bar.png' },
    { name: 'Cherry Almond Crisp',        score: 82 },
    { name: 'Macadamia Coconut Crisp',    score: 81 },
    { name: 'Cashew Lime Crisp',          score: 80 },
    { name: 'Pecan Maple Bar',            score: 78 },
    { name: 'Banana Walnut Bites',        score: 76 },
    { name: 'Blueberry Lemon Crisp',      score: 74 },
    { name: 'Lemon Tahini Crisp',         score: 73 },
    { name: 'Hazelnut Cacao Bites',       score: 71 },
    { name: 'Peanut Butter Date Bites',   score: 70 },
    { name: 'Dark Chocolate Date Bar',    score: 69 },
    { name: 'Espresso Date Energy Ball',  score: 67 },
    { name: 'Cinnamon Apple Crisp',       score: 65 },
    { name: 'Vanilla Bean Date Bar',      score: 63 },
    { name: 'Pumpkin Spice Date Bar',     score: 61 },
    { name: 'Tropical Mango Date Bar',    score: 57 },
    { name: 'Strawberry Vanilla Bar',     score: 54 },
    { name: 'Chocolate Peanut Crisp',     score: 47 },
    { name: 'Protein Boost Bar — Choc.',  score: 34 },
    { name: 'Protein Boost Bar — Vanilla', score: 28 },
  ],
  /* GRAS flag lists — top ingredients (by share of products) in the two
     riskiest GRAS buckets. Unsafe = classified unsafe; Unknown = GRAS status
     not established. Each is a "top 5" slice. */
  unsafeIngredients: [
    { name: 'Titanium Dioxide', pct: 8 },
    { name: 'Red 40',           pct: 4 },
  ],
  unknownIngredients: [
    { name: 'Natural Flavors',   pct: 42 },
    { name: 'Lime Oil',          pct: 33 },
    { name: 'Citrus Extract',    pct: 21 },
    { name: 'Vanilla Extract',   pct: 17 },
    { name: 'Sunflower Extract', pct: 12 },
  ],
  /* Distribution of the Anti-Inflammatory score across the portfolio, bucketed
     by rating tier. Drives the segmented bar; the left-hand stat reads off the
     Excellent tier. */
  scoreDistribution: {
    metric: 'Anti-Inflammatory',
    total: 24,
    tiers: [
      { label: 'Excellent', count: 8,  pct: 33, color: 'var(--sec-green)' },
      { label: 'Good',      count: 11, pct: 46, color: '#17B0A0' },
      { label: 'OK',        count: 3,  pct: 13, color: '#2E74D6' },
      { label: 'Fair',      count: 2,  pct: 8,  color: '#E07D1F' },
      { label: 'Poor',      count: 0,  pct: 0,  color: '#9AA3AE' },
    ],
    measures: 'Scores how well a product’s ingredients support the body’s ability to reduce chronic inflammation — a driver of heart disease, metabolic disorders, and immune dysfunction. High scores reflect omega-3 presence, polyphenol density, low seed oil exposure, and absence of pro-inflammatory additives.',
    pillar: 'Health Outcomes Pillar',
  },
  /* Single-metric spotlight rendered report-style below the anti-inflammatory
     card. `dist` is the five-tier share (Excellent → Poor, must read with the
     SPOT_TIERS order); `top`/`low` are the best- and worst-scoring SKUs. */
  metricSpotlight: {
    name: 'Gut Health',
    desc: 'Measures prebiotic fiber and fermentable carbohydrates that support a healthy gut microbiome.',
    score: 71,
    rating: 'Good',
    dist: [21, 42, 25, 8, 4],
    top: { name: 'Turmeric Oatmeal', score: 91 },
    low: { name: 'Frosted Granola', score: 39 },
  },
};

/* ------------------------------------------------------------------ */
/* Alternate brand data — Great Value (mass-market value label)        */
/* A large private-label portfolio: 547 products, mostly moderately    */
/* and ultra-processed, with Fair-range WISEscores across all pillars. */
/* ------------------------------------------------------------------ */

const ALT_BANNER = '../assets/great-value-banner.png';
const ALT_LOGO   = '../assets/great-value-mark.png';

const DATA_ALT = {
  brand: { name: 'Great Value', initials: 'GV' },
  claim: { discovered: 547, claimedPct: 0, claimed: 0, unclaimed: 547 },
  upf: {
    pct: 34,
    nonCount: 186,
    total: 547,
    split: [
      { label: 'Non-UPF', value: 186, color: C.teal },
      { label: 'UPF', value: 361, color: C.tealSoft },
    ],
    distribution: [
      { label: 'Minimally Processed', value: 62, color: C.green },
      { label: 'Lightly Processed', value: 124, color: C.greenLight },
      { label: 'Moderately Processed', value: 198, color: C.amber },
      { label: 'Ultra-Processed', value: 131, color: C.orange },
      { label: 'Super Ultra-Processed', value: 32, color: C.red },
    ],
  },
  gras: {
    pct: 41,
    grasCount: 224,
    total: 547,
    split: [
      { label: 'GRAS', value: 224, color: C.teal },
      { label: 'Non-GRAS', value: 323, color: C.tealSoft },
    ],
    uniqueIngredients: 412,
    distribution: [
      { label: 'GRAS', value: 130, color: C.green },
      { label: 'Historical', value: 94, color: C.greenLight },
      { label: 'Unclear', value: 150, color: C.amber },
      { label: 'Unknown Flavors', value: 130, color: C.orange },
      { label: 'Unsafe', value: 43, color: C.red },
    ],
  },
  wisescore: {
    average: 48,
    pillars: [
      { name: 'Nutrient Quality', icon: 'eco', score: 46 },
      { name: 'Ingredient Quality', icon: 'biotech', score: 51 },
      { name: 'Health Outcomes', icon: 'favorite', score: 44 },
    ],
  },
  pillars: [
    {
      name: 'Nutrient Quality', tag: 'NQ',
      score: 46,
      metrics: [
        { name: 'Fiber Density', value: 42 },
        { name: 'Sugar Density', value: 38 },
        { name: 'Protein Density', value: 54 },
        { name: 'Carbohydrate Quality', value: 44 },
        { name: 'Fat Quality', value: 47 },
      ],
    },
    {
      name: 'Ingredient Quality', tag: 'IG',
      score: 51,
      metrics: [
        { name: 'Ultra-Processed Food', value: 34 },
        { name: 'Banned / Unsafe Ingredients', value: 58 },
        { name: 'Clean Label', value: 46 },
        { name: 'Emulsifiers of Concern', value: 52 },
        { name: 'Seed Oils of Concern', value: 63 },
      ],
    },
    {
      name: 'Health Outcomes', tag: 'THRIVE',
      score: 44,
      metrics: [
        { name: 'Heart Health', value: 41 },
        { name: 'Diabetes Friendly', value: 38 },
        { name: 'Gut Health', value: 43 },
        { name: 'Muscle Health', value: 51 },
        { name: 'Anti-Inflammatory', value: 47 },
      ],
    },
  ],
  topIngredients: [
    { name: 'Maltodextrin',          pct: 71, level: 'PL4' },
    { name: 'Artificial Flavors',    pct: 64, level: 'PL4' },
    { name: 'High-Fructose Corn Syrup', pct: 58, level: 'PL4' },
    { name: 'Soy Lecithin',          pct: 49, level: 'PL4' },
    { name: 'Mono- & Diglycerides',  pct: 41, level: 'PL4' },
    { name: 'Enriched Wheat Flour',  pct: 78, level: 'PL3' },
    { name: 'Cane Sugar',            pct: 69, level: 'PL3' },
    { name: 'Palm Oil',             pct: 52, level: 'PL3' },
    { name: 'Modified Corn Starch',  pct: 44, level: 'PL3' },
    { name: 'Dextrose',              pct: 36, level: 'PL3' },
  ],
  topProducts: [
    { name: 'Trail Mix Clusters',    score: 58 },
    { name: 'Granola Crunch Bar',    score: 54 },
    { name: 'Peanut Butter Bar',     score: 51 },
    { name: 'Fruit & Nut Bar',       score: 49 },
    { name: 'Chocolate Chip Cookie', score: 45 },
    { name: 'Cheese Crackers',       score: 42 },
    { name: 'Sandwich Cremes',       score: 38 },
    { name: 'Toaster Pastry',        score: 34 },
    { name: 'Snack Cake',            score: 29 },
    { name: 'Fruit Snacks',          score: 24 },
  ],
  unsafeIngredients: [
    { name: 'Titanium Dioxide',   pct: 16 },
    { name: 'Red 40',             pct: 12 },
    { name: 'Potassium Bromate',  pct: 8 },
    { name: 'BHA',                pct: 6 },
    { name: 'Azodicarbonamide',   pct: 4 },
  ],
  unknownIngredients: [
    { name: 'Artificial Flavors', pct: 64 },
    { name: 'Caramel Color',      pct: 41 },
    { name: 'Natural Flavors',    pct: 38 },
    { name: 'Yeast Extract',      pct: 22 },
    { name: 'Spice Extract',      pct: 15 },
  ],
  scoreDistribution: {
    metric: 'Anti-Inflammatory',
    total: 547,
    tiers: [
      { label: 'Excellent', count: 27,  pct: 5,  color: 'var(--sec-green)' },
      { label: 'Good',      count: 88,  pct: 16, color: '#17B0A0' },
      { label: 'OK',        count: 197, pct: 36, color: '#2E74D6' },
      { label: 'Fair',      count: 164, pct: 30, color: '#E07D1F' },
      { label: 'Poor',      count: 71,  pct: 13, color: '#9AA3AE' },
    ],
    measures: 'Scores how well a product’s ingredients support the body’s ability to reduce chronic inflammation — a driver of heart disease, metabolic disorders, and immune dysfunction. High scores reflect omega-3 presence, polyphenol density, low seed oil exposure, and absence of pro-inflammatory additives.',
    pillar: 'Health Outcomes Pillar',
  },
  metricSpotlight: {
    name: 'Gut Health',
    desc: 'Measures prebiotic fiber and fermentable carbohydrates that support a healthy gut microbiome.',
    score: 43,
    rating: 'OK',
    dist: [5, 16, 36, 30, 13],
    top: { name: 'Trail Mix Clusters', score: 58 },
    low: { name: 'Fruit Snacks', score: 24 },
  },
};

/* Module-level brand toggle state. */
let _altBrandActive = false;
let _dashboardHost  = null;

/* Product-discovery intro (first load only). The dashboard opens with a thin
   progress line under the hero banner — the rest of the surface stays hidden
   while WISEcode "discovers" the portfolio. Only once the bar reaches 100% is
   the content revealed and every count-up + chart allowed to animate in. A
   brand toggle re-render or a reduced-motion preference skips straight to the
   revealed state (no second discovery run). Counts also tick up slower during
   the reveal via COUNTUP_DURATION_SCALE, so the numbers feel like they're being
   found rather than snapping into place. */
let _discoveryDone = false;
const COUNTUP_DURATION_SCALE = 1.8;
/* How long the simulated discovery takes + how many tokens it "spends". */
const DISCOVERY_DURATION_MS = 7200;
const DISCOVERY_TOKENS = 2840;
/* Rotating status messages shown while discovery runs — each maps to a slice of
   the progress bar so the label reads like a live ingest job working through
   products, imagery, barcodes, ingredients, then a final validation pass. */
const DISCOVERY_STAGES = [
  'Searching for products…',
  'Scanning product images…',
  'Reading barcodes…',
  'Matching ingredients…',
  'Validating results…',
];

/* The currently active dataset. */
function getActiveData() {
  return _altBrandActive ? DATA_ALT : DATA;
}

function legend(parts) {
  return `<div class="dash-legend">${parts
    .map((p) => `<span class="dash-legend-item"><span class="dash-legend-l"><span class="dash-dot" style="background:${p.color}"></span>${esc(p.label)}</span> <strong>${p.value}</strong></span>`)
    .join('')}</div>`;
}

/* Build one segmented ring (a set of <circle> arcs) for the double donut.
   Parts normalize to their own total so the outer (health) and inner
   (levels) rings can use independent denominators.

   Large slices get rounded end-caps for a soft, pill-like look. A rounded cap
   extends half the stroke width past each end, so slices too small to absorb
   that without spilling into a neighbor fall back to flat (butt) caps — this
   keeps the rounded aesthetic while guaranteeing nothing ever overlaps. Each
   drawn dash is centered within its slice so the gaps stay perfectly even.
   `gapPx` is the visual gap left between slices. Data attributes drive the
   hover popover (label / value / share / color). */
function polarPt(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
}

/* Annular-sector path with gently rounded corners — a softer end than a fully
   round stroke cap (which is a half-circle of radius sw/2). `cr` is the corner
   radius, clamped so it never exceeds the slice's radial or angular room. */
function roundedSector(cx, cy, ri, ro, a0, a1, cr) {
  const spanRad = ((a1 - a0) * Math.PI) / 180;
  const r = Math.max(0, Math.min(cr, (ro - ri) / 2, (ri * spanRad) / 2));
  const offO = (r / ro) * (180 / Math.PI);
  const offI = (r / ri) * (180 / Math.PI);
  const big = a1 - offO - (a0 + offO) > 180 ? 1 : 0;
  const P = (rad, deg) => polarPt(cx, cy, rad, deg);
  return [
    `M ${P(ro, a0 + offO)}`,
    `A ${ro} ${ro} 0 ${big} 1 ${P(ro, a1 - offO)}`,
    `A ${r} ${r} 0 0 1 ${P(ro - r, a1)}`,
    `L ${P(ri + r, a1)}`,
    `A ${r} ${r} 0 0 1 ${P(ri, a1 - offI)}`,
    `A ${ri} ${ri} 0 ${big} 0 ${P(ri, a0 + offI)}`,
    `A ${r} ${r} 0 0 1 ${P(ri + r, a0)}`,
    `L ${P(ro - r, a0)}`,
    `A ${r} ${r} 0 0 1 ${P(ro, a0 + offO)}`,
    'Z',
  ].join(' ');
}

function donutRing(parts, ring, cx, cy, r, sw, gapPx) {
  const circ = 2 * Math.PI * r;
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const ro = r + sw / 2;
  const ri = r - sw / 2;
  const gapDeg = (gapPx / circ) * 360;
  const minDeg = (4 / circ) * 360; /* floor so a tiny sliver still shows */
  const cr = 7; /* a little rounded, not a full half-circle cap */
  let acc = 0;
  return parts
    .filter((p) => p.value > 0)
    .map((p) => {
      const startDeg = (acc / total) * 360;
      const endDeg = ((acc + p.value) / total) * 360;
      acc += p.value;
      let a0 = startDeg + gapDeg / 2;
      let a1 = endDeg - gapDeg / 2;
      if (a1 - a0 < minDeg) {
        const mid = (startDeg + endDeg) / 2;
        a0 = mid - minDeg / 2;
        a1 = mid + minDeg / 2;
      }
      const pct = Math.round((p.value / total) * 100);
      const d = roundedSector(cx, cy, ri, ro, a0, a1, cr);
      return `<path class="dash-donut-arc" d="" data-full-d="${esc(d)}" data-a0="${a0}" data-a1="${a1}" data-ri="${ri}" data-ro="${ro}" data-cr="${cr}" data-cx="${cx}" data-cy="${cy}" fill="${p.color}" data-ring="${esc(ring)}" data-label="${esc(p.label)}" data-value="${p.value}" data-pct="${pct}" data-color="${esc(p.color)}"></path>`;
    })
    .join('');
}

/* Double-segmented donut: outer ring = health split, inner ring = levels
   distribution, with a stat stacked in the hole (mirrors the reference). */
function doubleDonut(outer, inner, num, numClass, label, sub, ringNames) {
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 124;
  const rInner = 90;
  const sw = 26;
  return `
    <div class="dash-donut dash-donut-double">
      <svg class="dash-donut-svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(label)} ${num}">
        <g transform="rotate(-90 ${cx} ${cy})">
          ${donutRing(outer, ringNames[0], cx, cy, rOuter, sw, 11)}
          ${donutRing(inner, ringNames[1], cx, cy, rInner, sw, 10)}
        </g>
      </svg>
      <div class="dash-donut-center">
        ${countUpMarkup(num, { className: `dash-donut-num ${numClass}`.trim() })}
        <span class="dash-donut-label">${esc(label)}</span>
        <span class="dash-donut-sub">${esc(sub)}</span>
      </div>
    </div>`;
}

/* Single-segmented donut: just the levels ring, drawn at the outer radius so it
   keeps the exact same diameter/footprint as the double donut it replaces when
   the health-status ring is toggled off. */
function singleDonut(parts, num, numClass, label, sub, ringName) {
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const r = 124;
  const sw = 26;
  return `
    <div class="dash-donut dash-donut-single" aria-hidden="true">
      <svg class="dash-donut-svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(label)} ${num}">
        <g transform="rotate(-90 ${cx} ${cy})">
          ${donutRing(parts, ringName, cx, cy, r, sw, 11)}
        </g>
      </svg>
      <div class="dash-donut-center">
        ${countUpMarkup(num, { className: `dash-donut-num ${numClass}`.trim() })}
        <span class="dash-donut-label">${esc(label)}</span>
        <span class="dash-donut-sub">${esc(sub)}</span>
      </div>
    </div>`;
}

/* Pink switch (default on = health-status ring shown). Toggling it off removes
   the health-status component of the card. */
function healthToggle(key) {
  return `
    <button type="button" class="dash-brand-toggle dash-brand-toggle--bare is-on" role="switch" aria-checked="true" data-dash-action="toggle-${key}-health" title="Show or hide the health status ring" aria-label="Show or hide the health status ring">
      <span class="dash-brand-toggle-track" aria-hidden="true">
        <span class="dash-brand-toggle-thumb"></span>
      </span>
    </button>`;
}

/* Titled legend group used beside the donut (one per ring). An optional
   modifier lets a group be targeted for show/hide (e.g. the health-status ring
   toggle on the GRAS card). */
function legendGroup(title, parts, mod) {
  return `
    <div class="dash-donut-legend-group${mod ? ` dash-donut-legend-group--${mod}` : ''}">
      <div class="dash-donut-legend-title">${esc(title)}</div>
      ${legend(parts)}
    </div>`;
}

/* Vertical three-dot menu: share / export / insert into chat. The `key`
   namespaces the actions so the click handler can route per-card. */
function cardMenu(key, label) {
  return `
    <div class="dash-kebab-wrap">
      <button class="dash-kebab" type="button" data-dash-menu="${key}" aria-haspopup="true" aria-expanded="false" aria-label="${esc(label)} options" title="More">
        <span class="material-icons">more_vert</span>
      </button>
      <div class="dash-kebab-menu" data-dash-menu-for="${key}" role="menu" hidden>
        <button class="dash-kebab-item" type="button" role="menuitem" data-dash-action="${key}-report"><span class="material-icons">description</span>View full report</button>
        <div class="dash-kebab-sep" role="separator"></div>
        <button class="dash-kebab-item" type="button" role="menuitem" data-dash-action="share-${key}"><span class="material-icons">ios_share</span>Share</button>
        <button class="dash-kebab-item" type="button" role="menuitem" data-dash-action="export-${key}"><span class="material-icons">download</span>Export</button>
        <button class="dash-kebab-item" type="button" role="menuitem" data-dash-action="chat-${key}"><span class="material-icons">forum</span>Insert into chat</button>
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Brand image editor — a centered modal panel reused for the hero      */
/* banner and the brand logo. Lets you upload a file (stored as a data  */
/* URL) or paste an image URL, preview it, then save or remove it.      */
/* ------------------------------------------------------------------ */

let imageModalEls = null;

function ensureImageModal() {
  if (imageModalEls) return imageModalEls;
  const scrim = document.createElement('div');
  scrim.className = 'dash-modal-scrim';
  const modal = document.createElement('div');
  modal.className = 'dash-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  scrim.appendChild(modal);
  document.body.appendChild(scrim);
  scrim.addEventListener('click', (e) => { if (e.target === scrim) closeImageModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeImageModal(); });
  imageModalEls = { scrim, modal };
  return imageModalEls;
}

function closeImageModal() {
  if (!imageModalEls) return;
  imageModalEls.scrim.classList.remove('is-open');
}

/* Generic image picker. `cfg` carries the copy + the current/save hooks so the
   same panel serves both the hero banner and the brand logo. */
function openImageModal(cfg) {
  const {
    eyebrow = 'Brand image',
    title = 'Update image',
    emptyLabel = 'Nothing yet',
    dropHint = 'PNG, JPG or WEBP',
    urlPlaceholder = 'https://…/image.jpg',
    saveLabel = 'Save',
    previewMod = '',
    getCurrent,
    onSave,
  } = cfg;
  const { scrim, modal } = ensureImageModal();
  modal.setAttribute('aria-label', title);
  const current = getCurrent();
  let draft = current;

  modal.innerHTML = `
    <header class="dash-modal-head">
      <div class="dash-modal-titles">
        <span class="dash-modal-eyebrow">${esc(eyebrow)}</span>
        <h2 class="dash-modal-title">${esc(title)}</h2>
      </div>
      <button class="dash-modal-close" type="button" data-banner-close aria-label="Close"><span class="material-icons">close</span></button>
    </header>
    <div class="dash-modal-body">
      <div class="dash-banner-preview${previewMod ? ` ${previewMod}` : ''}">
        <div class="dash-banner-preview-img" id="dash-banner-preview-img"></div>
        <span class="dash-banner-preview-empty" id="dash-banner-preview-empty"><span class="material-icons">image</span>${esc(emptyLabel)}</span>
      </div>
      <label class="dash-banner-drop" id="dash-banner-drop">
        <input type="file" accept="image/*" id="dash-banner-file" hidden>
        <span class="material-icons">cloud_upload</span>
        <span class="dash-banner-drop-text"><strong>Upload an image</strong> or drag &amp; drop<br><span class="dash-banner-drop-hint">${esc(dropHint)}</span></span>
      </label>
      <div class="dash-banner-or"><span>or paste a URL</span></div>
      <input type="url" class="dash-banner-url" id="dash-banner-url" placeholder="${esc(urlPlaceholder)}" autocomplete="off">
    </div>
    <footer class="dash-modal-foot">
      <button class="dash-btn dash-btn--ghost" type="button" data-banner-remove><span class="material-icons">delete</span>Remove</button>
      <div class="dash-modal-foot-right">
        <button class="dash-btn dash-btn--ghost" type="button" data-banner-close>Cancel</button>
        <button class="dash-btn dash-btn--primary" type="button" data-banner-save><span class="material-icons">check</span>${esc(saveLabel)}</button>
      </div>
    </footer>`;

  const previewImg = modal.querySelector('#dash-banner-preview-img');
  const previewEmpty = modal.querySelector('#dash-banner-preview-empty');
  const urlInput = modal.querySelector('#dash-banner-url');
  const fileInput = modal.querySelector('#dash-banner-file');
  const drop = modal.querySelector('#dash-banner-drop');

  const setPreview = (val) => {
    draft = val || '';
    if (draft) {
      previewImg.style.backgroundImage = cssUrl(draft);
      previewImg.style.display = 'block';
      previewEmpty.style.display = 'none';
    } else {
      previewImg.style.backgroundImage = '';
      previewImg.style.display = 'none';
      previewEmpty.style.display = '';
    }
  };
  setPreview(current);
  if (current && /^https?:/i.test(current)) urlInput.value = current;

  urlInput.addEventListener('input', () => setPreview(urlInput.value.trim()));

  const readFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => { urlInput.value = ''; setPreview(reader.result); };
    reader.readAsDataURL(file);
  };
  fileInput.addEventListener('change', () => readFile(fileInput.files[0]));
  ['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-drag'); }));
  ['dragleave', 'dragend'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('is-drag')));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('is-drag'); readFile(e.dataTransfer.files[0]); });

  modal.querySelector('[data-banner-remove]').addEventListener('click', () => { urlInput.value = ''; setPreview(''); });
  modal.querySelector('[data-banner-save]').addEventListener('click', () => {
    if (typeof onSave === 'function') onSave(draft);
    closeImageModal();
  });
  modal.querySelectorAll('[data-banner-close]').forEach((b) => b.addEventListener('click', closeImageModal));

  requestAnimationFrame(() => scrim.classList.add('is-open'));
}

/* Public entry point for the brand-banner editor, invoked from the main
   panel's far-right "More" menu (agent-overview.js). Opens the modal and
   applies the chosen image straight to the hero banner. */
export function editBrandBanner() {
  openImageModal({
    eyebrow: 'Brand banner',
    title: 'Update brand image',
    emptyLabel: 'No banner yet',
    dropHint: 'PNG, JPG or WEBP — wide images look best',
    urlPlaceholder: 'https://…/banner.jpg',
    saveLabel: 'Save banner',
    getCurrent: getBrandBanner,
    onSave(url) {
      setBrandBanner(url);
      const bg = document.getElementById('dash-hero-bg');
      const hero = document.getElementById('dash-hero');
      if (bg) bg.style.backgroundImage = url ? cssUrl(url) : '';
      if (hero) hero.classList.toggle('has-image', !!url);
    },
  });
}

/* Markup for the hero's circular logo badge — a button so it's clickable
   (opens the logo editor) and keyboard reachable. Empty state shows an
   "add" affordance instead of an image. */
function heroLogoInner(url, brandName = DATA.brand.name) {
  return `
    ${url
      ? `<img src="${esc(url)}" alt="${esc(brandName)} logo" loading="lazy" />`
      : `<span class="material-icons dash-hero-logo-ph">add_photo_alternate</span>`}
    <span class="dash-hero-logo-edit" aria-hidden="true"><span class="material-icons">edit</span></span>`;
}

/* Reflect a saved/removed logo onto the hero badge without a full re-render. */
function applyBrandLogo(url) {
  const el = document.getElementById('dash-hero-logo');
  if (!el) return;
  el.classList.toggle('is-empty', !url);
  el.innerHTML = heroLogoInner(url, DATA.brand.name);
}

/* Logo editor — same panel as the banner, scoped to the round brand badge. */
function editBrandLogo() {
  openImageModal({
    eyebrow: 'Brand logo',
    title: 'Update brand logo',
    emptyLabel: 'No logo yet',
    dropHint: 'PNG or SVG with transparent edges — square images look best',
    urlPlaceholder: 'https://…/logo.png',
    saveLabel: 'Save logo',
    previewMod: 'dash-banner-preview--logo',
    getCurrent: getBrandLogo,
    onSave(url) {
      setBrandLogo(url);
      applyBrandLogo(url);
    },
  });
}

/* ------------------------------------------------------------------ */
/* Full report modal — opened from the UPF / GRAS card kebab ("View    */
/* full report") and the in-card report links. The detailed report     */
/* content is supplied later; until then we render a structured summary */
/* (snapshot stats + legend breakdown) and a clear "coming soon" panel  */
/* so the modal reads as intentional rather than empty.                 */
/* ------------------------------------------------------------------ */

const REPORTS = {
  upf: {
    eyebrow: 'Brand report',
    title: 'Brand UPF Report',
    accent: 'is-teal',
    summary: (d) => `${d.upf.nonCount} of ${d.upf.total} analyzed products are Non-UPF (${d.upf.pct}%).`,
    stats: (d) => [
      { label: 'Non-UPF score', value: `${d.upf.pct}%` },
      { label: 'Non-UPF products', value: `${d.upf.nonCount}` },
      { label: 'Analyzed products', value: `${d.upf.total}` },
    ],
    groups: (d) => [
      { title: 'Health status', parts: d.upf.split },
      { title: 'Processing levels', parts: d.upf.distribution },
    ],
  },
  gras: {
    eyebrow: 'Brand report',
    title: 'Brand GRAS Report',
    accent: 'is-teal',
    summary: (d) => `${d.gras.grasCount} of ${d.gras.total} analyzed products are GRAS (${d.gras.pct}%) across ${d.gras.uniqueIngredients} unique ingredients.`,
    stats: (d) => [
      { label: 'GRAS score', value: `${d.gras.pct}%` },
      { label: 'GRAS products', value: `${d.gras.grasCount}` },
      { label: 'Unique ingredients', value: `${d.gras.uniqueIngredients}` },
    ],
    groups: (d) => [
      { title: 'Health status', parts: d.gras.split },
      { title: 'GRAS levels', parts: d.gras.distribution },
    ],
  },
  insights: {
    eyebrow: 'Brand report',
    title: 'WISEcode Insights Report',
    accent: 'is-teal',
    summary: (d) => `Your WISEscore is ${d.wisescore.average} across ${d.claim.discovered} discovered products — every metric, distribution and flagged product across all 3 pillars.`,
    stats: (d) => [
      { label: 'WISEscore', value: `${d.wisescore.average}` },
      { label: 'Non-UPF score', value: `${d.upf.pct}%` },
      { label: 'GRAS score', value: `${d.gras.pct}%` },
    ],
    groups: (d) => [
      { title: 'Processing levels', parts: d.upf.distribution },
      { title: 'GRAS levels', parts: d.gras.distribution },
    ],
  },
};

/* The live WISEai chat, handed over by agent-overview once the dock is up, so a
   report opened on the surface mirrors into the conversation (and vice-versa) —
   the exact chat ↔ surface pairing the verification flows use. */
let dashChatApi = null;
export function setDashChat(api) { dashChatApi = api; }

/* Post a mirrored turn into the chat — the action as a "you" line + WISEai's
   narration — so opening a report on the surface reads like asking for it. Pass
   an empty userLabel to add only the reply (the intent-chip path already added
   the "you" line). */
function pushDashChat(userLabel, replyHtml) {
  if (!dashChatApi) return;
  dashChatApi.hideWelcome?.();
  if (userLabel) dashChatApi.addUser(userLabel);
  if (replyHtml) dashChatApi.addWISEai(replyHtml);
}

/* Compact narration for the chat when a report opens on the surface. */
function reportChatReply(cfg, d) {
  const stats = cfg.stats(d)
    .map((s) => `<strong>${esc(String(s.value))}</strong> ${esc(s.label)}`)
    .join(' &nbsp;·&nbsp; ');
  return `${esc(cfg.summary(d))}<br><br>${stats}<br><br>I\u2019ve opened the full <strong>${esc(cfg.title)}</strong> on the right — per-product breakdowns and exportable tables will land there as the report is finalized.`;
}

/* Chat reply HTML for a report, read off the live (brand-aware) dataset. Used
   by the intent chips so the docked reply matches the surface. */
export function dashReportChatReply(card) {
  const cfg = REPORTS[card];
  if (!cfg) return '';
  return reportChatReply(cfg, getActiveData());
}

function reportSurfaceHTML(cfg, d) {
  const stats = cfg.stats(d)
    .map((s) => `
      <div class="dash-report-stat">
        <span class="dash-report-stat-val">${esc(s.value).replace(/%$/, '<span class="dash-pct">%</span>')}</span>
        <span class="dash-report-stat-label">${esc(s.label)}</span>
      </div>`)
    .join('');

  const groups = cfg.groups(d)
    .map((g) => legendGroup(g.title, g.parts))
    .join('');

  return `
    <section class="dash-report-view" aria-label="${esc(cfg.title)}">
      <header class="dash-report-view-head">
        <button class="dash-btn dash-btn--ghost dash-report-back" type="button" data-dash-action="report-back">
          <span class="material-icons">arrow_back</span>Back to dashboard
        </button>
        <div class="dash-report-view-titles">
          <span class="dash-modal-eyebrow">${esc(cfg.eyebrow)}</span>
          <h2 class="dash-modal-title">${esc(cfg.title)}</h2>
        </div>
        <button class="dash-btn dash-btn--primary dash-report-view-export" type="button" data-dash-action="report-export">
          <span class="material-icons">download</span>Export
        </button>
      </header>
      <div class="dash-report-view-body">
        <p class="dash-report-summary ${cfg.accent}">${esc(cfg.summary(d))}</p>
        <div class="dash-report-stats">${stats}</div>
        <div class="dash-report-groups">${groups}</div>
        <div class="dash-report-pending">
          <span class="material-icons">hourglass_top</span>
          <div>
            <div class="dash-report-pending-title">The full report is on its way</div>
            <div class="dash-report-pending-sub">Per-product breakdowns, ingredient-level detail and exportable tables will appear here once the report is finalized.</div>
          </div>
        </div>
      </div>
    </section>`;
}

/* Open a report INLINE in the main panel (the interface on the right of the
   WISEai chat), replacing the dashboard — never a modal overlay. `mirror` posts
   the you + WISEai turn into the chat; pass { mirror: false } on the intent-chip
   path where the dock already added the "you" line + reply. */
export function openDashReport(card, { mirror = true } = {}) {
  const cfg = REPORTS[card];
  const host = _dashboardHost;
  if (!cfg || !host) return;
  const d = getActiveData();
  host.innerHTML = reportSurfaceHTML(cfg, d);
  host.scrollTop = 0;
  if (mirror) pushDashChat(`Open the ${cfg.title}`, reportChatReply(cfg, d));
}

function renderHero(d, isAlt = false) {
  const banner = isAlt ? ALT_BANNER : getBrandBanner();
  const logo   = isAlt ? ALT_LOGO   : getBrandLogo();
  const heroDesc = isAlt
    ? `Comparing food intelligence WISEcode has gathered on Great Value — ${d.claim.discovered} products analyzed for UPF status, ingredient quality, and health outcomes. Scores reflect the full private-label catalog.`
    : `Here's the food intelligence WISEcode has gathered on your portfolio — UPF status, ingredient and nutrient quality, and health-outcome metrics. Review what we found, then claim your products to manage them.`;
  const toggleLabel = isAlt ? 'Back to Date Better Snacks' : 'Compare: Great Value';
  return `
    <section class="dash-hero${banner ? ' has-image' : ''}${isAlt ? ' is-alt-brand' : ''}" id="dash-hero">
      <div class="dash-hero-bg" id="dash-hero-bg"${banner ? ` style="background-image:${cssUrl(banner)}"` : ''}></div>
      <div class="dash-hero-pattern" aria-hidden="true">
        ${BUG_WATERMARK_SVG.replace('dash-cta-bug', 'dash-hero-bug')}
      </div>
      <div class="dash-hero-scrim" aria-hidden="true"></div>
      <button class="dash-hero-logo${logo ? '' : ' is-empty'}" id="dash-hero-logo" type="button"
        data-dash-action="${isAlt ? '' : 'edit-logo'}"
        title="${isAlt ? d.brand.name + ' logo' : 'Update brand logo'}"
        aria-label="${isAlt ? d.brand.name + ' logo' : 'Update brand logo'}">
        ${heroLogoInner(logo, d.brand.name)}
      </button>
      <div class="dash-hero-left">
        <div class="dash-hero-row">
          <h1 class="dash-hero-title">Welcome, ${esc(d.brand.name)}</h1>
          <button class="dash-brand-toggle${isAlt ? ' is-on' : ''}"
            type="button" role="switch" aria-checked="${isAlt}"
            data-dash-action="switch-brand"
            title="${toggleLabel}"
            aria-label="${toggleLabel}">
            <span class="dash-brand-toggle-track" aria-hidden="true">
              <span class="dash-brand-toggle-thumb"></span>
            </span>
            <span class="dash-brand-toggle-text">Bad Scores/High Numbers</span>
          </button>
        </div>
        <p class="dash-hero-desc" id="dash-hero-desc">${heroDesc}</p>
        <button class="dash-hero-learn" type="button" data-dash-action="hero-learn"
          aria-haspopup="dialog" aria-expanded="false" aria-controls="dash-hero-learn-pop">
          <span class="material-icons">info</span>Learn more
        </button>
      </div>
    </section>`;
}

/* Whether the first-load discovery intro should run: only on the initial
   primary-brand render, and never when the user prefers reduced motion. */
function shouldRunDiscovery(isAlt) {
  return !_discoveryDone && !isAlt && !prefersReducedMotion();
}

/* The thin discovery progress line that sits directly beneath the hero banner
   while WISEcode "discovers" the portfolio. A hairline track fills left→right
   with a live percentage, an estimated time remaining, and a running token
   count — the same language as a real ingest job. Rendered only for the first
   load (see shouldRunDiscovery). */
function renderDiscovery() {
  return `
    <div class="dash-discovery" id="dash-discovery" role="status" aria-live="polite" aria-label="Discovering your products">
      <div class="dash-discovery-track"><span class="dash-discovery-fill" id="dash-discovery-fill"></span></div>
      <div class="dash-discovery-meta">
        <span class="dash-discovery-label">
          <span class="material-icons dash-discovery-spin" aria-hidden="true">autorenew</span>
          <span id="dash-discovery-status">${DISCOVERY_STAGES[0]}</span>
        </span>
        <span class="dash-discovery-stats">
          <span class="dash-discovery-pct" id="dash-discovery-pct">0%</span>
          <span class="dash-discovery-dot" aria-hidden="true">·</span>
          <span class="dash-discovery-eta" id="dash-discovery-eta">~${Math.ceil(DISCOVERY_DURATION_MS / 1000)}s left</span>
          <span class="dash-discovery-dot" aria-hidden="true">·</span>
          <span class="dash-discovery-tokens" id="dash-discovery-tokens">0 tokens</span>
        </span>
      </div>
    </div>`;
}

/* Drive the discovery line from 0→100% over DISCOVERY_DURATION_MS, updating the
   percentage, the estimated time remaining, and the token spend as it goes.
   Resolves once the bar completes (and briefly shows a "complete" state) so the
   caller can reveal the dashboard and kick off the count-ups. */
function runDiscovery(host, { onFirstFound } = {}) {
  const bar = host.querySelector('#dash-discovery');
  const fill = host.querySelector('#dash-discovery-fill');
  const pctEl = host.querySelector('#dash-discovery-pct');
  const etaEl = host.querySelector('#dash-discovery-eta');
  const tokEl = host.querySelector('#dash-discovery-tokens');
  const statusEl = host.querySelector('#dash-discovery-status');
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  let firstFound = false;
  return new Promise((resolve) => {
    if (!bar || !fill) { resolve(); return; }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / DISCOVERY_DURATION_MS);
      /* Ease the progress so it surges early then settles into the last few
         percent — the way a real job front-loads the easy finds. */
      const eased = easeOutCubic(t);
      const pct = Math.round(eased * 100);
      fill.style.width = pct + '%';
      if (pctEl) pctEl.textContent = pct + '%';
      if (etaEl) {
        const remain = Math.max(0, Math.ceil((DISCOVERY_DURATION_MS * (1 - t)) / 1000));
        etaEl.textContent = remain > 0 ? `~${remain}s left` : 'finishing…';
      }
      if (tokEl) tokEl.textContent = `${fmt(eased * DISCOVERY_TOKENS)} tokens`;
      if (statusEl) {
        const stage = Math.min(DISCOVERY_STAGES.length - 1, Math.floor(t * DISCOVERY_STAGES.length));
        const msg = DISCOVERY_STAGES[stage];
        if (statusEl.textContent !== msg) statusEl.textContent = msg;
      }
      /* The first products have surfaced — let the dashboard paint in behind the
         bar (loading state) so charts fill and numbers climb as more arrive. */
      if (!firstFound && pct >= 2) { firstFound = true; onFirstFound?.(); }
      if (t < 1) { requestAnimationFrame(tick); return; }
      /* Land on the exact totals, flip to the completed state, then resolve a
         beat later so the check reads before the surface reveals. */
      fill.style.width = '100%';
      if (pctEl) pctEl.textContent = '100%';
      if (etaEl) etaEl.textContent = 'done';
      if (tokEl) tokEl.textContent = `${fmt(DISCOVERY_TOKENS)} tokens`;
      bar.classList.add('is-complete');
      if (statusEl) statusEl.textContent = 'Discovery complete';
      const spin = bar.querySelector('.dash-discovery-spin');
      if (spin) spin.textContent = 'check_circle';
      setTimeout(resolve, 520);
    };
    requestAnimationFrame(tick);
  });
}

/* Compact summary band beneath the hero: three top-line scores
   (WISEscore / Non-UPF / GRAS) presented as big-number stat cards. */
function scoreCard({ num, denom, rating, ratingTone, note, icon, pct = false }) {
  return `
    <article class="dash-card dash-score-card">
      <div class="dash-score-top">
        <div class="dash-score-num"><span class="n">${esc(String(num))}${pct ? '<span class="dash-pct">%</span>' : ''}</span><span class="d">${esc(denom)}</span></div>
        ${icon ? `<span class="dash-score-icon"><span class="material-icons">${esc(icon)}</span></span>` : ''}
      </div>
      <span class="dash-badge dash-badge--${ratingTone}"><span class="material-icons" style="font-size:13px;">check_circle</span>${esc(rating)}</span>
      <p class="dash-score-note">${note}</p>
    </article>`;
}

function renderScoreBand(d) {
  const ws = d.wisescore.average;
  const wsRating = ratingLabel(ws);
  const wsTone = scoreTierTone(ws);
  const upfTone = scoreTierTone(d.upf.pct);
  const grasTone = scoreTierTone(d.gras.pct);
  return `
    <section class="dash-score-band">
      ${scoreCard({
        num: d.upf.pct, pct: true, denom: 'Non-UPF', rating: ratingLabel(d.upf.pct), ratingTone: upfTone, icon: 'eco',
        note: `<strong>${d.upf.nonCount} of ${d.upf.total}</strong> analyzed products are Non&#8209;UPF · ${d.upf.nonCount} qualify for the verification shield.`,
      })}
      ${scoreCard({
        num: d.gras.pct, pct: true, denom: 'GRAS', rating: ratingLabel(d.gras.pct), ratingTone: grasTone, icon: 'biotech',
        note: `<strong>${d.gras.grasCount} of ${d.gras.total}</strong> analyzed products are GRAS across ${d.gras.uniqueIngredients} unique ingredients.`,
      })}
      ${scoreCard({
        num: ws, denom: '/100', rating: wsRating, ratingTone: wsTone, icon: 'verified',
        note: `Average WISEscore&#8482; across all <strong>${d.claim.discovered} discovered products</strong>`,
      })}
    </section>`;
}

/* Top 5 best performing products — laid out identically to the claim row above
   it (big numeral + caption, divided into columns). Shown as the second row on
   the analytics-types page; content comes straight from the live `topProducts`
   dataset (the highest-scoring products). */
function renderTopPerformers(d) {
  const items = (d.topProducts || []).slice(0, 5);
  if (!items.length) return '';
  const rankLabels = ['1st place', '2nd place', '3rd place', '4th place', '5th place'];
  const cols = items
    .map((it, i) => {
      const score = Math.min(100, Math.max(0, Math.round(it.score)));
      return `
        <div class="dash-claim-col">
          <div class="dash-bignum-row">
            ${countUpMarkup(score, { className: 'dash-bignum' })}
            <span class="dash-bignum-cap"><strong>${esc(it.name)}</strong></span>
            <span class="dash-stamp-icon dash-stamp-num" role="img" aria-label="${rankLabels[i] || `rank ${i + 1}`} — ${esc(it.name)}"><span class="dash-stamp-num-inner"><span class="dash-stamp-hash">#</span>${i + 1}</span></span>
          </div>
          <div class="dash-btn-row">
            <button class="dash-btn dash-btn--ghost" type="button" data-dash-action="topproduct-report" aria-label="View report for ${esc(it.name)}"><span class="material-icons">description</span>View report</button>
          </div>
        </div>`;
    })
    .join('<div class="dash-claim-divider"></div>');
  return `
    <section class="dash-top5-section">
      <h2 class="dash-section-title dash-top5-title">Top Five Products</h2>
      <div class="dash-claim dash-top5-claim">
        ${cols}
      </div>
    </section>`;
}

/* Photo variant of the Top 5 row: each column's content sits on top of a
   full-bleed hero card showing the product's food photo, layered with the same
   scrim + white type treatment as the page hero. Falls back to the flat brand
   surface for any product without an image. */
function renderTopPerformersHero(d) {
  const items = (d.topProducts || []).slice(0, 5);
  if (!items.length) return '';
  const rankLabels = ['1st place', '2nd place', '3rd place', '4th place', '5th place'];
  const cols = items
    .map((it, i) => {
      const score = Math.min(100, Math.max(0, Math.round(it.score)));
      const hasImg = !!it.img;
      const bgStyle = hasImg ? ` style="background-image:${cssUrl(it.img)}"` : '';
      return `
        <div class="dash-claim-col dash-top5-hero-col${hasImg ? ' has-image' : ''}">
          <div class="dash-top5-hero-bg"${bgStyle}></div>
          <div class="dash-top5-hero-scrim" aria-hidden="true"></div>
          <div class="dash-top5-hero-content">
            <div class="dash-bignum-row">
              ${countUpMarkup(score, { className: 'dash-bignum' })}
              <span class="dash-bignum-cap"><strong>${esc(it.name)}</strong></span>
              <span class="dash-stamp-icon dash-stamp-num" role="img" aria-label="${rankLabels[i] || `rank ${i + 1}`} — ${esc(it.name)}"><span class="dash-stamp-num-inner"><span class="dash-stamp-hash">#</span>${i + 1}</span></span>
            </div>
            <div class="dash-btn-row">
              <button class="dash-btn dash-btn--ghost" type="button" data-dash-action="topproduct-report" aria-label="View report for ${esc(it.name)}"><span class="material-icons">description</span>View report</button>
            </div>
          </div>
        </div>`;
    })
    .join('');
  return `
    <section class="dash-top5-section dash-top5-hero-section">
      <h2 class="dash-section-title dash-top5-title">Top Five Products</h2>
      <div class="dash-claim dash-top5-claim dash-top5-hero-claim">
        ${cols}
      </div>
    </section>`;
}

function renderClaim(d) {
  const c = d.claim;
  const u = d.upf;
  return `
    <section class="dash-claim">
      <div class="dash-claim-col">
        <div class="dash-bignum-row">
          ${countUpMarkup(c.discovered, { className: 'dash-bignum' })}
          <span class="dash-bignum-cap"><strong>Products Discovered</strong><br>across retail &amp; distribution</span>
          ${stampIcon('Products Discovered')}
        </div>
        <div class="dash-btn-row">
          <button class="dash-btn dash-btn--ghost" type="button" data-dash-action="claim-upcs"><span class="material-icons">verified_user</span>Claim your products</button>
        </div>
      </div>
      <div class="dash-claim-divider"></div>
      <div class="dash-claim-col">
        <div class="dash-progress-pct">
          ${countUpMarkup(`${c.claimedPct}%`, { className: 'dash-bignum' })}
          <span class="dash-bignum-cap"><strong>Products Claimed</strong><br>${c.claimed} of ${c.discovered} products</span>
          ${stampIcon('Products Claimed')}
        </div>
        <div class="dash-btn-row">
          <button class="dash-btn dash-btn--ghost" type="button" data-dash-action="review-portfolio"><span class="material-icons">inventory_2</span>Review your food portfolio</button>
        </div>
        <button class="dash-text-link dash-text-link--indent" type="button" data-dash-action="add-food"><span class="material-icons">add</span>Add food</button>
      </div>
      <div class="dash-claim-divider"></div>
      <div class="dash-claim-col dash-claim-col--nudge">
        ${u.nonCount > 0 ? `
        <div class="dash-score-toast" role="status">
          <span class="dash-score-toast-icon"><span class="material-icons">verified</span></span>
          <div class="dash-score-toast-body">
            <div class="dash-score-toast-title">${u.nonCount} products are ready to verify</div>
            <p class="dash-score-toast-text">Earn the Non&#8209;UPF verification shield on these products so they stand out on retail listings — it only takes a moment to start.</p>
            <button class="dash-score-toast-link" type="button" data-dash-action="verify-upf">Start Non&#8209;UPF Verification<span class="material-icons dash-score-toast-link-arrow">arrow_outward</span></button>
          </div>
          <button class="dash-score-toast-close" type="button" data-dash-action="dismiss-score-toast" aria-label="Dismiss"><span class="material-icons">close</span></button>
        </div>` : ''}
        <div class="dash-bignum-row">
          ${countUpMarkup(u.nonCount, { className: 'dash-bignum' })}
          <span class="dash-bignum-cap"><strong>Products Qualify</strong><br>for Non&#8209;UPF verification shield</span>
          ${stampIcon('Products Qualify')}
        </div>
        <div class="dash-btn-row">
          <button class="dash-btn dash-btn--primary" type="button" data-dash-action="verify-upf"><span class="material-icons">verified</span>Start Non&#8209;UPF Verification</button>
        </div>
      </div>
      <div class="dash-claim-divider"></div>
      <div class="dash-claim-col dash-claim-col--nudge">
        ${d.gras.grasCount > 0 ? `
        <div class="dash-score-toast" role="status">
          <span class="dash-score-toast-icon"><span class="material-icons">verified</span></span>
          <div class="dash-score-toast-body">
            <div class="dash-score-toast-title">${d.gras.grasCount} products are ready to verify</div>
            <p class="dash-score-toast-text">Earn the GRAS verification shield on these products so their ingredient safety stands out on retail listings — it only takes a moment to start.</p>
            <button class="dash-score-toast-link" type="button" data-dash-action="verify-gras">Start GRAS Verification<span class="material-icons dash-score-toast-link-arrow">arrow_outward</span></button>
          </div>
          <button class="dash-score-toast-close" type="button" data-dash-action="dismiss-score-toast" aria-label="Dismiss"><span class="material-icons">close</span></button>
        </div>` : ''}
        <div class="dash-bignum-row">
          ${countUpMarkup(d.gras.grasCount, { className: 'dash-bignum' })}
          <span class="dash-bignum-cap"><strong>Products Qualify</strong><br>for GRAS verification shield</span>
          ${stampIcon('Products Qualify')}
        </div>
        <div class="dash-btn-row">
          <button class="dash-btn dash-btn--primary" type="button" data-dash-action="verify-gras"><span class="material-icons">verified</span>Start GRAS Verification</button>
        </div>
      </div>
    </section>`;
}

function renderUpf(d) {
  const u = d.upf;
  return `
    <section class="dash-card dash-donut-card">
      <div class="dash-card-topbar">
        <h3 class="dash-card-title"><span class="dash-term" data-tip="Ultra-Processed Food" tabindex="0" role="term">UPF</span> status across ${u.total} analyzed products</h3>
        ${cardMenu('upf', 'Brand UPF report')}
      </div>
      <div class="dash-donut-row">
        ${doubleDonut(u.split, u.distribution, `${u.pct}%`, 'is-teal', 'Non-UPF', `${u.nonCount} of ${u.total} products`, ['Health status', 'Processing level'])}
        <div class="dash-donut-legends">
          ${legendGroup('Health status', u.split)}
          ${legendGroup('Processing levels', u.distribution)}
        </div>
      </div>
      <button class="dash-report-link" type="button" data-dash-action="upf-report">
        <span class="dash-report-left"><span class="material-icons">description</span>Review the full ${esc(d.brand.name)} UPF Report</span>
        <span class="dash-report-right">View Report<span class="material-icons">arrow_outward</span></span>
      </button>
    </section>`;
}

function renderGras(d) {
  const g = d.gras;
  return `
    <section class="dash-card dash-donut-card">
      <div class="dash-card-topbar">
        <div class="dash-card-topbar-lead">
          <h3 class="dash-card-title"><span class="dash-term" data-tip="Generally Recognized As Safe" tabindex="0" role="term">GRAS</span> status across ${g.total} analyzed products</h3>
          ${healthToggle('gras')}
        </div>
        ${cardMenu('gras', 'Brand GRAS report')}
      </div>
      <div class="dash-donut-row">
        ${doubleDonut(g.split, g.distribution, `${g.pct}%`, 'is-teal', 'GRAS', `${g.grasCount} of ${g.total} products`, ['Health status', 'GRAS level'])}
        ${singleDonut(g.distribution, `${g.pct}%`, 'is-teal', 'GRAS', `${g.grasCount} of ${g.total} products`, 'GRAS level')}
        <div class="dash-donut-legends">
          ${legendGroup('Health status', g.split, 'health')}
          ${legendGroup('GRAS levels', g.distribution)}
        </div>
      </div>
      <button class="dash-report-link" type="button" data-dash-action="gras-report">
        <span class="dash-report-left"><span class="material-icons">description</span>Review the full ${esc(d.brand.name)} GRAS Report</span>
        <span class="dash-report-right">View Report<span class="material-icons">arrow_outward</span></span>
      </button>
    </section>`;
}

/* The five WISEscore status tiers — 20 points each (0–19 … 80–100). Single
   source of truth for the rating label, tier color, and the hover popover on
   the status word in the pillars heading. The scale runs worst→best:
   Poor (red) · Fair (orange) · Okay (amber) · Good (light green) · Excellent (green). */
const STATUS_TIERS = [
  { label: 'Excellent', min: 80, range: '80–100', tone: 'excellent', desc: 'Top-tier food quality — strong nutrition, clean ingredients, and healthy long-term outcomes.' },
  { label: 'Good', min: 60, range: '60–79', tone: 'good', desc: 'Solid, well-rounded products with only minor areas left to improve.' },
  { label: 'Okay', min: 40, range: '40–59', tone: 'okay', desc: 'Acceptable overall, but with clear weaknesses in one or more pillars.' },
  { label: 'Fair', min: 20, range: '20–39', tone: 'fair', desc: 'Notable concerns across processing level, ingredients, or nutrient density.' },
  { label: 'Poor', min: 0, range: '0–19', tone: 'poor', desc: 'Serious issues — heavily processed or carrying high-risk ingredients.' },
];

/* Tier → chart color, drawn from the same palette as the donuts and segment
   bars so a score's color is identical everywhere it appears (pillar bars,
   health bar, per-metric bars, status dots). */
const SCORE_TIER_COLORS = {
  excellent: C.green,
  good: C.greenLight,
  okay: C.amber,
  fair: C.orange,
  poor: C.red,
};

function scoreTierTone(score) {
  return (STATUS_TIERS.find((t) => score >= t.min) || STATUS_TIERS[STATUS_TIERS.length - 1]).tone;
}

/* Canonical score→color used across the dashboard. Tier-based so colors always
   line up with the status scale and rating labels. */
function scoreColor(score) {
  return SCORE_TIER_COLORS[scoreTierTone(score)];
}

/* WISEscore health bar with animated fill + score — sits under the pillars headline. */
function wisescoreHealthBar(score) {
  const color = scoreColor(score);
  const pct = Math.min(100, Math.max(0, Math.round(score)));
  return `
    <div class="dash-ws-health-bar" role="group" aria-label="WISEscore ${pct}">
      <div class="dash-ws-health-track" style="--bar-color:${color}">
        <div class="dash-ws-health-fill dash-metric-fill" style="width:${pct}%;background:${color}">
          ${countUpMarkup(score, { className: 'dash-ws-health-num' })}
        </div>
      </div>
    </div>`;
}

function ratingLabel(score) {
  return (STATUS_TIERS.find((t) => score >= t.min) || STATUS_TIERS[STATUS_TIERS.length - 1]).label;
}

/* Underlined status word that reveals a popover with all five WISEscore status
   definitions on hover/focus. The tier whose label matches `current` is marked. */
function statusTermLabel(current) {
  const rows = STATUS_TIERS.map((t) => `
        <span class="dash-status-tip-row${t.label === current ? ' is-current' : ''}">
          <span class="dash-status-tip-line">
            <span class="dash-status-tip-dot dash-status-tip-dot--${t.tone}"></span>
            <span class="dash-status-tip-label">${esc(t.label)}</span>
            <span class="dash-status-tip-range">${esc(t.range)}</span>
          </span>
          <span class="dash-status-tip-desc">${esc(t.desc)}</span>
        </span>`).join('');
  return `<span class="dash-status-term" tabindex="0" role="button" aria-label="WISEscore status definitions">${esc(current)}<span class="dash-status-tip" role="tooltip"><span class="dash-status-tip-head">WISEscore status scale</span>${rows}</span></span>`;
}

/* Same popover, keyed off a numeric score (resolves the score's rating tier). */
function statusTerm(score) {
  return statusTermLabel(ratingLabel(score));
}

function renderWisescore(d) {
  const w = d.wisescore;
  const rating = ratingLabel(w.average);
  const badgeMod = scoreTierTone(w.average);
  const pillars = w.pillars
    .map((p) => {
      const c = scoreColor(p.score);
      return `
      <div class="dash-pillar-row">
        <span class="dash-pillar-name"><span class="material-icons" style="color:${c}">${esc(p.icon)}</span>${esc(p.name)}</span>
        <div class="dash-pillar-track" style="--bar-color:${c}"><div class="dash-pillar-fill" style="width:${p.score}%;background:${c}"></div></div>
        <span class="dash-pillar-score">${p.score}</span>
      </div>`;
    })
    .join('');
  return `
    <section style="margin-top:18px;">
      <div class="dash-section-head">
        <h2 class="dash-section-title">Your food intelligence</h2>
      </div>
      <div class="dash-card dash-wisescore" style="margin-top:14px;">
        <div>
          <div class="dash-wisescore-num"><span class="n">${w.average}</span><span class="d">/100</span></div>
          <span class="dash-badge dash-badge--${badgeMod}"><span class="material-icons" style="font-size:13px;">check_circle</span>${rating}</span>
          <p class="dash-wisescore-note">Average score across all <strong>${d.claim.discovered} discovered products</strong> · 12 carry a verified NON-UPF shield.</p>
        </div>
        <div class="dash-claim-divider"></div>
        <div>
          <div class="dash-pillars-head"><span class="l">Three pillars</span><span class="l">Score</span></div>
          ${pillars}
        </div>
      </div>
    </section>`;
}

function renderPillarCards(d) {
  const renderCard = (p) => {
    const rating = ratingLabel(p.score);
    const metrics = p.metrics
      .map((m) => {
        const color = scoreColor(m.value);
        return `
          <div class="dash-metric-item">
            <span class="dash-metric-name">${esc(m.name)}</span>
            ${countUpMarkup(m.value, { className: 'dash-metric-val', style: `color:${color}` })}
            <div class="dash-metric-track" style="--bar-color:${color}"><div class="dash-metric-fill" style="width:${m.value}%;background:${color}"></div></div>
          </div>`;
      })
      .join('');
    return `
        <article class="dash-pillar-card">
          <div class="dash-pillar-card-head">
            <div class="dash-score-num">
              ${countUpMarkup(p.score, { className: 'n' })}<span class="d">/100</span>
              <span class="dash-score-cap"><strong>${esc(rating)}</strong><br>${esc(p.name)}</span>
            </div>
            ${stampIcon(p.name)}
          </div>
          <div class="dash-metric-list">${metrics}</div>
        </article>`;
  };

  const columns = d.pillars
    .map((p, i) => `${i > 0 ? '<div class="dash-claim-divider"></div>' : ''}${renderCard(p)}`)
    .join('');
  const ws = d.wisescore.average;
  return `
    <section class="dash-pillars-section">
      <div class="dash-pillars-heading">
        <div class="dash-section-head">
          <h2 class="dash-section-title">The 3 pillars of your ${statusTerm(ws)} WISEscore&#8482;</h2>
        </div>
        ${wisescoreHealthBar(ws)}
        <p class="dash-pillars-intro">Across all ${d.claim.discovered} discovered products, nutrient quality, ingredient quality, and health outcomes are weighed against one another &mdash; so a food can't earn a high score by acing one dimension while failing another.</p>
      </div>
      <div class="dash-three-up dash-pillars">${columns}</div>
      <div class="dash-pillars-cta">
        <div class="dash-cta-banner">
          ${BUG_WATERMARK_SVG.replace('dash-cta-bug', 'dash-cta-bug dash-cta-bug--right')}
          ${BUG_WATERMARK_SVG.replace('dash-cta-bug', 'dash-cta-bug dash-cta-bug--left')}
          <div class="dash-cta-banner-scrim" aria-hidden="true"></div>
          <div class="dash-pillars-cta-inner">
            <h2 class="dash-pillars-cta-headline">Every metric, distribution &amp; flagged product across all 3 pillars</h2>
            <button class="dash-btn dash-cta-banner-btn dash-pillars-cta-btn" type="button" data-dash-action="insights-report">
              <span class="material-icons">description</span>
              <span class="dash-pillars-cta-label">View and export the full WISEcode insights report</span>
              <span class="material-icons dash-pillars-cta-arrow">arrow_outward</span>
            </button>
          </div>
        </div>
      </div>
    </section>`;
}

/* A single labelled WISEscore health bar (pillar name + rating above, animated
   fill with the score inside). Reuses the same fill markup as the overall bar so
   the shared chart-animation + replay machinery picks it up automatically. */
function pillarBreakdownBar(name, score) {
  const color = scoreColor(score);
  const pct = Math.min(100, Math.max(0, Math.round(score)));
  return `
    <div class="dash-breakdown-bar">
      <div class="dash-breakdown-bar-head">
        <span class="dash-breakdown-bar-name">${esc(name)}</span>
        <span class="dash-breakdown-bar-rating">${esc(ratingLabel(score))}</span>
      </div>
      <div class="dash-ws-health-bar dash-ws-health-bar--inline" role="group" aria-label="${esc(name)} ${pct}">
        <div class="dash-ws-health-track" style="--bar-color:${color}">
          <div class="dash-ws-health-fill dash-metric-fill" style="width:${pct}%;background:${color}">
            ${countUpMarkup(score, { className: 'dash-ws-health-num' })}
          </div>
        </div>
      </div>
    </div>`;
}

/* Faint background track for the unfilled portion of a gauge. */
const GAUGE_TRACK = 'color-mix(in srgb, var(--text-subtle) 14%, transparent)';

/* One ring donut sized to match the UPF / GRAS cards' single donut. `variant`
   namespaces the overall vs. per-pillar versions so the toggle can swap them.
   `ringMarkup` is the pre-built set of <path> arcs to render. */
function bdDonut(ringMarkup, variant, num, label, sub, ariaLabel) {
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  /* The ring's outer edge is at radius 137 (r 124 + half the 26px stroke), so it
     only spans 13→287 of the 300-unit box. Crop the viewBox to that tight bound
     so the gauge fills its (smaller) container instead of carrying dead padding. */
  return `
    <div class="dash-donut dash-bd-donut dash-bd-donut--${variant}"${variant === 'pillars' ? ' aria-hidden="true"' : ''}>
      <svg class="dash-donut-svg" viewBox="13 13 274 274" role="img" aria-label="${esc(ariaLabel)}">
        <g transform="rotate(-90 ${cx} ${cy})">${ringMarkup}</g>
      </svg>
      <div class="dash-donut-center">
        ${countUpMarkup(num, { className: 'dash-donut-num' })}
        <span class="dash-donut-label">${esc(label)}</span>
        <span class="dash-donut-sub">${esc(sub)}</span>
      </div>
    </div>`;
}

/* One gauge arc as a sweepable .dash-donut-arc path. Track arcs (no `meta`) are
   inert — no hover popover; filled arcs carry the pillar name, score and color. */
function gaugeArc(cx, cy, ri, ro, a0, a1, cr, color, ringName, meta) {
  if (a1 - a0 <= 0.05) return '';
  const d = roundedSector(cx, cy, ri, ro, a0, a1, cr);
  const dataAttrs = meta
    ? ` data-label="${esc(meta.label)}" data-value="${meta.value}" data-pct="${meta.pct}" data-color="${esc(color)}"`
    : '';
  return `<path class="dash-donut-arc${meta ? '' : ' dash-donut-arc--track'}" d="" data-full-d="${esc(d)}" data-a0="${a0}" data-a1="${a1}" data-ri="${ri}" data-ro="${ro}" data-cr="${cr}" data-cx="${cx}" data-cy="${cy}" fill="${color}" data-ring="${esc(ringName)}"${dataAttrs}></path>`;
}

/* Single-value gauge: a continuous faint track spanning the full ring with the
   leading colored fill (= `pct`%) laid on top, so the track reads as one
   connected bar rather than a separate segment. */
function gaugeRing(pct, color, ringName, meta, cx, cy, r, sw, gapPx) {
  const circ = 2 * Math.PI * r;
  const ro = r + sw / 2;
  const ri = r - sw / 2;
  const gapDeg = (gapPx / circ) * 360;
  const cr = 7;
  const start = gapDeg / 2;
  const end = 360 - gapDeg / 2;
  const fillEnd = start + (end - start) * (Math.min(100, Math.max(0, pct)) / 100);
  return (
    gaugeArc(cx, cy, ri, ro, start, end, cr, GAUGE_TRACK, ringName, null) +
    gaugeArc(cx, cy, ri, ro, start, fillEnd, cr, color, ringName, meta)
  );
}

/* Per-pillar gauge ring: each pillar owns an equal 1/N section of the ring. The
   whole section is drawn as one continuous faint track, then the leading colored
   fill (= score%, in the pillar's status color) is laid on top — so each third
   reads like a radial progress bar whose track stays joined to its fill. */
function pillarGaugeRing(pillars, ringName, cx, cy, r, sw, gapPx) {
  const circ = 2 * Math.PI * r;
  const ro = r + sw / 2;
  const ri = r - sw / 2;
  const gapDeg = (gapPx / circ) * 360;
  const cr = 7;
  const sectionDeg = 360 / pillars.length;
  return pillars
    .map((p, i) => {
      const segStart = i * sectionDeg + gapDeg / 2;
      const segEnd = (i + 1) * sectionDeg - gapDeg / 2;
      const fillEnd = segStart + (segEnd - segStart) * (Math.min(100, Math.max(0, p.score)) / 100);
      const color = scoreColor(p.score);
      const meta = { label: p.name, value: p.score, pct: p.score };
      return (
        gaugeArc(cx, cy, ri, ro, segStart, segEnd, cr, GAUGE_TRACK, ringName, null) +
        gaugeArc(cx, cy, ri, ro, segStart, fillEnd, cr, color, ringName, meta)
      );
    })
    .join('');
}

/* The overall WISEscore donut (a single-color gauge: score arc + faint
   remainder) plus the segmented per-pillar donut, swapped by a pink toggle. */
function wisescoreDonut(d) {
  const ws = d.wisescore.average;
  const rating = ratingLabel(ws);
  const cx = 150;
  const cy = 150;
  const r = 124;
  const sw = 26;
  const overallRing = gaugeRing(ws, scoreColor(ws), 'WISEscore', { label: 'WISEscore', value: ws, pct: ws }, cx, cy, r, sw, 11);
  const pillarRing = pillarGaugeRing(d.wisescore.pillars, 'Pillar score', cx, cy, r, sw, 11);
  return `
    <div class="dash-breakdown-donut">
      <div class="dash-breakdown-donut-toggle">
        <button type="button" class="dash-brand-toggle dash-brand-toggle--bare" role="switch" aria-checked="false" data-dash-action="toggle-breakdown-view" title="Switch between the overall score and the per-pillar breakdown" aria-label="Switch between the overall score and the per-pillar breakdown">
          <span class="dash-brand-toggle-track" aria-hidden="true">
            <span class="dash-brand-toggle-thumb"></span>
          </span>
        </button>
      </div>
      <div class="dash-breakdown-donut-stage">
        ${bdDonut(overallRing, 'overall', ws, 'WISEscore', `${rating} overall`, `WISEscore ${ws}`)}
        ${bdDonut(pillarRing, 'pillars', ws, 'WISEscore', 'Across 3 pillars', `WISEscore ${ws} across 3 pillars`)}
      </div>
    </div>`;
}

/* Pillar breakdown: a full-width headline, then three columns — the
   description paragraph, the circular WISEscore gauge (overall / per-pillar
   toggle), and one health bar per pillar. */
function renderPillarBreakdown(d) {
  const ws = d.wisescore.average;
  const bars = d.wisescore.pillars
    .map((p) => pillarBreakdownBar(p.name, p.score))
    .join('');
  return `
    <section class="dash-pillars-breakdown">
      <div class="dash-card dash-breakdown-card">
        <div class="dash-breakdown-grid">
          <div class="dash-breakdown-intro">
            <div class="dash-section-head dash-breakdown-title">
              <h2 class="dash-section-title">The 3 pillars of your ${statusTerm(ws)} WISEscore&#8482;</h2>
            </div>
            <p class="dash-pillars-intro">Across all ${d.claim.discovered} discovered products, nutrient quality, ingredient quality, and health outcomes are weighed against one another &mdash; so a food can't earn a high score by acing one dimension while failing another.</p>
          </div>
          <div class="dash-breakdown-donut-col">
            ${wisescoreDonut(d)}
          </div>
          <div class="dash-breakdown-bars">${bars}</div>
        </div>
      </div>
    </section>`;
}

/* ------------------------------------------------------------------ */
/* Pillar metrics radar (spider) chart — all 15 per-metric scores from */
/* the three pillars plotted on one web. Each vertex dot is colored by  */
/* its own metric's status tier (scoreColor), matching the score→color  */
/* scale used everywhere else so the dots read as a status heat-map.    */
/* ------------------------------------------------------------------ */

/* Compact axis labels for the radar — the full metric names are too long to
   ring the web, so each maps to the short form used on the chart. */
const RADAR_SHORT = {
  'Fiber Density': 'Fiber',
  'Sugar Density': 'Sugar',
  'Protein Density': 'Protein',
  'Carbohydrate Quality': 'Carbs',
  'Fat Quality': 'Fat',
  'Ultra-Processed Food': 'UPF',
  'Banned / Unsafe Ingredients': 'Banned',
  'Clean Label': 'Clean',
  'Emulsifiers of Concern': 'Emulsif',
  'Seed Oils of Concern': 'Seeds',
  'Heart Health': 'Heart',
  'Diabetes Friendly': 'Diabetes',
  'Gut Health': 'Gut',
  'Muscle Health': 'Muscle',
  'Anti-Inflammatory': 'Anti-Inf',
};

/* Build the radar SVG. Dots render collapsed at the center (and the polygon
   degenerate) so the shared chart-animation machinery can sweep them outward
   on load / on tap, mirroring the donut gauges' entrance. Full vertex coords
   are stashed on each dot (data-fx / data-fy) for the animation to lerp to. */
function radarChart(d) {
  /* A generous square viewBox leaves room for the axis labels to ring the web
     without clipping; the chart itself only fills the inner radius. */
  const size = 420;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 145;
  const labelR = maxR + 24;
  const levels = [20, 40, 60, 80, 100];

  const axes = [];
  d.pillars.forEach((p) => {
    p.metrics.forEach((m) => {
      axes.push({
        label: RADAR_SHORT[m.name] || m.name,
        full: m.name,
        value: m.value,
        /* Each vertex dot is colored by its own metric's status tier (the same
           scoreColor scale as the rest of the dashboard) so the dots read as a
           status heat-map, not a fixed per-pillar hue. */
        color: scoreColor(m.value),
        group: p.name,
      });
    });
  });

  const n = axes.length || 1;
  const ang = (i) => ((-90 + (360 / n) * i) * Math.PI) / 180;
  const pt = (i, r) => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];

  /* Concentric web rings (one polygon per level). */
  const rings = levels
    .map((lv) => {
      const rr = (lv / 100) * maxR;
      const pts = axes.map((_, i) => pt(i, rr).map((v) => v.toFixed(1)).join(',')).join(' ');
      return `<polygon class="dash-radar-grid" points="${pts}"></polygon>`;
    })
    .join('');

  /* Spokes from the centre to each axis. */
  const spokes = axes
    .map((_, i) => {
      const [x, y] = pt(i, maxR);
      return `<line class="dash-radar-spoke" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"></line>`;
    })
    .join('');

  /* Numeric scale labels climbing the top (Protein) axis. */
  const ringLabels = levels
    .map((lv) => {
      const [x, y] = pt(0, (lv / 100) * maxR);
      return `<text class="dash-radar-ringval" x="${(x + 8).toFixed(1)}" y="${(y + 3).toFixed(1)}">${lv}</text>`;
    })
    .join('');

  /* Axis labels, anchored + baseline-nudged by quadrant so they sit cleanly
     outside the web instead of overlapping the vertices. */
  const axisLabels = axes
    .map((a, i) => {
      const [x, y] = pt(i, labelR);
      const cos = Math.cos(ang(i));
      const sin = Math.sin(ang(i));
      let anchor = 'middle';
      if (cos > 0.25) anchor = 'start';
      else if (cos < -0.25) anchor = 'end';
      let dy = 4;
      if (sin < -0.5) dy = -1;
      else if (sin > 0.5) dy = 11;
      return `<text class="dash-radar-axis-label" x="${x.toFixed(1)}" y="${(y + dy).toFixed(1)}" text-anchor="${anchor}">${esc(a.label)}</text>`;
    })
    .join('');

  /* Data dots — full target coords stashed for the entrance sweep; rendered
     collapsed at the centre so the web animates outward on load / tap. */
  const dots = axes
    .map((a, i) => {
      const [fx, fy] = pt(i, (a.value / 100) * maxR);
      return `<circle class="dash-radar-dot" cx="${cx}" cy="${cy}" r="5" fill="${a.color}" data-fx="${fx.toFixed(1)}" data-fy="${fy.toFixed(1)}" data-ring="${esc(a.group)}" data-label="${esc(a.full)}" data-value="${a.value}" data-pct="${a.value}" data-color="${a.color}"></circle>`;
    })
    .join('');

  const collapsed = axes.map(() => `${cx},${cy}`).join(' ');

  return `
    <div class="dash-radar">
      <svg class="dash-radar-svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="WISEscore pillar metrics radar" data-cx="${cx}" data-cy="${cy}">
        <g class="dash-radar-grid-g">${rings}${spokes}</g>
        ${ringLabels}
        <polygon class="dash-radar-poly" points="${collapsed}"></polygon>
        ${dots}
        ${axisLabels}
      </svg>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* GRAS status horizontal bar chart — the five GRAS levels (GRAS /     */
/* Historical / Unclear / Unknown Flavors / Unsafe) plotted as ranked  */
/* horizontal bars. Bars are scaled to the largest count so the chart  */
/* fills the track, and each row carries its own colored legend dot so */
/* the GRAS legend reads inline. Fills reuse .dash-metric-fill so the  */
/* shared chart entrance / replay machinery animates them for free.    */
/* ------------------------------------------------------------------ */
function grasBarChart(d) {
  const dist = d.gras.distribution;
  const max = dist.reduce((m, p) => Math.max(m, p.value), 0) || 1;
  const total = dist.reduce((s, p) => s + p.value, 0) || 1;
  const rows = dist
    .map((p) => {
      const w = Math.max(2, Math.round((p.value / max) * 100));
      const pct = Math.round((p.value / total) * 100);
      return `
        <div class="dash-gras-bar-item">
          <div class="dash-gras-bar-head">
            <span class="dash-gras-bar-name"><span class="dash-dot" style="background:${p.color}"></span>${esc(p.label)}</span>
            <span class="dash-gras-bar-share">${pct}%</span>
          </div>
          <div class="dash-ws-health-bar dash-ws-health-bar--inline dash-gras-bar" role="group" aria-label="${esc(p.label)} ${p.value}">
            <div class="dash-gras-bar-track dash-ws-health-track" style="--bar-color:${p.color}">
              <div class="dash-ws-health-fill dash-metric-fill dash-gras-bar-fill" style="width:${w}%;background:${p.color}"
                   data-ring="GRAS status" data-label="${esc(p.label)}" data-value="${p.value}" data-pct="${pct}" data-color="${p.color}">
                ${countUpMarkup(p.value, { className: 'dash-ws-health-num dash-gras-bar-val' })}
              </div>
            </div>
          </div>
        </div>`;
    })
    .join('');
  return `<div class="dash-gras-bars">${rows}</div>`;
}

/* Bottom two-column row holding the pillar-metrics radar in the left column —
   the same grid the UPF / GRAS donut cards sit in. The left card's legend
   reuses the shared donut-legend component; the right card pairs the radar
   with a GRAS-status horizontal bar chart for visual parity. */
function renderPillarRadar(d) {
  const legendParts = d.pillars.map((p) => ({
    label: p.name,
    value: p.score,
    /* Status color from the pillar's own score, matching the score→color scale
       used by the donuts and health bars (not a fixed per-pillar hue). */
    color: scoreColor(p.score),
  }));
  return `
    <section class="dash-two-up dash-radar-section">
      <section class="dash-card dash-donut-card dash-radar-card">
        <div class="dash-card-topbar">
          <h3 class="dash-card-title">WISEscore&#8482; metrics across all 3 pillars</h3>
          ${cardMenu('radar', 'Pillar metrics radar')}
        </div>
        <div class="dash-radar-body">
          ${radarChart(d)}
          <div class="dash-radar-legend">${legend(legendParts)}</div>
        </div>
      </section>
      <section class="dash-card dash-donut-card dash-gras-bar-card">
        <div class="dash-card-topbar">
          <h3 class="dash-card-title">GRAS status across ${d.gras.total} analyzed products</h3>
          ${cardMenu('grasbars', 'GRAS status breakdown')}
        </div>
        <div class="dash-gras-bar-body">
          ${grasBarChart(d)}
        </div>
      </section>
    </section>`;
}

/* ------------------------------------------------------------------ */
/* Top processing-driving ingredients — a ranked table whose rows use  */
/* the same chunky WISEscore health-bar track + fill as the pillar     */
/* breakdown. Each row: rank · ingredient · fat bar (share of prods) ·  */
/* the share %, and the ingredient's processing level (PL4 / PL3).     */
/* ------------------------------------------------------------------ */
function renderTopIngredients(d) {
  const items = d.topIngredients || [];
  if (!items.length) return '';
  /* PL4 (highest processing) reads in the orange "Ultra-Processed" hue, PL3 in
     amber — same tokens the UPF / GRAS distributions use, so the levels group
     by color at a glance. */
  const levelColor = (lvl) => (lvl === 'PL4' ? C.orange : C.amber);
  const rows = items
    .map((it, i) => {
      const color = levelColor(it.level);
      const pct = Math.min(100, Math.max(0, Math.round(it.pct)));
      return `
        <div class="dash-ing-row">
          <div class="dash-ing-bar-head">
            <span class="dash-ing-name"><span class="dash-ing-rank">${i + 1}</span>${esc(it.name)}</span>
            <span class="dash-badge dash-ing-level dash-ing-level--${it.level.toLowerCase()}">${esc(it.level)}</span>
          </div>
          <div class="dash-ws-health-bar dash-ws-health-bar--inline dash-ing-bar" role="group" aria-label="${esc(it.name)} — ${pct}% of products">
            <div class="dash-ws-health-track" style="--bar-color:${color}">
              <div class="dash-ws-health-fill dash-metric-fill" style="width:${pct}%;background:${color}">
                <span class="dash-count-up dash-ws-health-num" data-count-to="${pct}" data-count-suffix="%">0%</span>
              </div>
            </div>
          </div>
        </div>`;
    })
    .join('');
  return `
    <section class="dash-ingredients-section">
      <div class="dash-card dash-ingredients-card">
        <div class="dash-card-topbar">
          <div class="dash-card-topbar-lead">
            <span class="dash-ing-eyebrow">Top 10</span>
            <h3 class="dash-card-title">Highest-processing ingredients</h3>
          </div>
          ${cardMenu('topingredients', 'Highest-processing ingredients')}
        </div>
        <p class="dash-ing-note">Ranked PL4 &rarr; PL3 &middot; % = share of products containing this ingredient.</p>
        <div class="dash-ing-table">
          ${rows}
        </div>
      </div>
    </section>`;
}

/* ------------------------------------------------------------------ */
/* All products — anti-inflammatory score. Same fat-bar UI as the top  */
/* ingredients table (name above the bar, value inside the colored     */
/* fill), but each row is a product and the value is its 0–100 score —  */
/* so the fill color + rating pill follow the WISEscore status scale.   */
/* ------------------------------------------------------------------ */
function renderTopProducts(d) {
  const items = d.topProducts || [];
  if (!items.length) return '';
  const rows = items
    .map((it, i) => {
      const score = Math.min(100, Math.max(0, Math.round(it.score)));
      const color = scoreColor(score);
      const tone = scoreTierTone(score);
      return `
        <div class="dash-ing-row dash-ing-row--linked">
          <div class="dash-ing-bar-main">
            <div class="dash-ing-bar-head">
              <span class="dash-ing-name"><span class="dash-ing-rank">${i + 1}</span>${esc(it.name)}</span>
              <span class="dash-badge dash-ing-level dash-badge--${tone}">${esc(ratingLabel(score))}</span>
            </div>
            <div class="dash-ws-health-bar dash-ws-health-bar--inline dash-ing-bar" role="group" aria-label="${esc(it.name)} — anti-inflammatory score ${score}">
              <div class="dash-ws-health-track" style="--bar-color:${color}">
                <div class="dash-ws-health-fill dash-metric-fill" style="width:${score}%;background:${color}">
                  ${countUpMarkup(score, { className: 'dash-ws-health-num' })}
                </div>
              </div>
            </div>
          </div>
          <button class="dash-ing-report" type="button" data-dash-action="antiinflammatory-report" aria-label="View report for ${esc(it.name)}">
            <span class="dash-ing-report-label">View report</span>
            <span class="dash-ing-report-icon"><span class="material-icons">chevron_right</span></span>
          </button>
        </div>`;
    })
    .join('');
  return `
    <section class="dash-products-section">
      <div class="dash-card dash-ingredients-card">
        <div class="dash-card-topbar">
          <div class="dash-card-topbar-lead">
            <span class="dash-ing-eyebrow">All products</span>
            <h3 class="dash-card-title">Anti-inflammatory score</h3>
          </div>
          ${cardMenu('antiinflammatory', 'Anti-inflammatory score by product')}
        </div>
        <p class="dash-ing-note">${d.upf.total} products &middot; sorted highest to lowest.</p>
        <div class="dash-ing-table">
          ${rows}
        </div>
      </div>
    </section>`;
}

/* ------------------------------------------------------------------ */
/* Metric spotlight — one metric broken down with a header (name +       */
/* rating + score + blurb) sitting above the same segmented status bar   */
/* used by the Portfolio Analysis section below. Its Low/High SKUs and a  */
/* "View report" drill ride as chips floated to the top-right of the      */
/* header. Driven by d.metricSpotlight; sits below the anti-inflammatory  */
/* card.                                                                  */
/* ------------------------------------------------------------------ */
const SPOT_TIERS = [
  { label: 'Excellent' },
  { label: 'Good' },
  { label: 'OK' },
  { label: 'Fair' },
  { label: 'Poor' },
];
const SPOT_BADGE_TONE = { Excellent: 'excellent', Good: 'good', OK: 'okay', Fair: 'fair', Poor: 'poor' };

/* Match the segmented Portfolio Analysis bar's palette exactly (OK→okay). */
function spotTierColor(label) {
  const key = String(label || '').trim().toLowerCase();
  return SCORE_TIER_COLORS[key.startsWith('ok') ? 'okay' : key] || C.ink;
}

function renderMetricSpotlight(d) {
  const m = d.metricSpotlight;
  if (!m) return '';
  const dist = m.dist || [];
  const tone = SPOT_BADGE_TONE[m.rating] || 'good';

  const segs = SPOT_TIERS
    .map((t, i) => {
      const p = dist[i] || 0;
      const color = spotTierColor(t.label);
      return p > 0
        ? `<div class="dash-seg-part" style="flex-grow:${p};background:${color}" title="${esc(t.label)} ${p}%"><span class="dash-seg-part-label">${p}%</span></div>`
        : '';
    })
    .join('');

  const legend = SPOT_TIERS
    .map((t, i) => {
      const p = dist[i] || 0;
      const color = spotTierColor(t.label);
      return p > 0
        ? `<div class="dash-seg-leg-cell" style="flex-grow:${p}">
            <span class="dash-seg-leg-line" style="background:${color}"></span>
            <span class="dash-seg-leg-info">
              <span class="dash-seg-leg-dot" style="background:${color}"></span>
              <span class="dash-seg-leg-name">${esc(t.label)}</span>
            </span>
          </div>`
        : '';
    })
    .join('');

  return `
    <section class="dash-mrow-section">
      <div class="dash-card dash-mrow-card">
        <div class="dash-section-head dash-mrow-head">
          <span class="dash-badge dash-badge--${tone} dash-mrow-badge">${esc(m.rating)}</span>
          <h2 class="dash-section-title dash-mrow-title">${esc(m.name)}</h2>
          <div class="dash-wisescore-num dash-seg-num dash-mrow-score">${countUpMarkup(m.score, { className: 'n dash-seg-pct-num' })}<span class="d">/ 100</span></div>
          <p class="dash-wisescore-note dash-mrow-note">${esc(m.desc)}</p>
          <div class="dash-mrow-chips">
            <span class="dash-mrow-chip"><span class="dash-mrow-chip-tag dash-mrow-chip-tag--low">Low</span><span class="dash-mrow-chip-name">${esc(m.low.name)}</span><span class="dash-mrow-chip-score">${esc(String(m.low.score))}</span></span>
            <span class="dash-mrow-chip"><span class="dash-mrow-chip-tag dash-mrow-chip-tag--high">High</span><span class="dash-mrow-chip-name">${esc(m.top.name)}</span><span class="dash-mrow-chip-score">${esc(String(m.top.score))}</span></span>
            <button class="dash-mrow-report" type="button" data-dash-action="metricspotlight-report" aria-label="View report for ${esc(m.name)}"><span class="dash-mrow-report-label">View report</span><span class="material-icons dash-mrow-report-icon">chevron_right</span></button>
          </div>
        </div>
        <div class="dash-seg-row dash-mrow-row">
          <div class="dash-seg-bars dash-mrow-seg">
            <div class="dash-seg-track">${segs}</div>
            <div class="dash-seg-legend">${legend}</div>
          </div>
        </div>
      </div>
    </section>`;
}

/* ------------------------------------------------------------------ */
/* GRAS flag cards — Unsafe + Unknown ingredients, side by side. Same  */
/* fat-bar UI (name above the bar, share % inside the colored fill) as  */
/* the tables above; only the fill color + accent change per bucket.    */
/* ------------------------------------------------------------------ */
function flagBarRows(items, color) {
  return items
    .map((it, i) => {
      const pct = Math.min(100, Math.max(0, Math.round(it.pct)));
      return `
        <div class="dash-ing-row">
          <div class="dash-ing-bar-head">
            <span class="dash-ing-name"><span class="dash-ing-rank">${i + 1}</span>${esc(it.name)}</span>
          </div>
          <div class="dash-ws-health-bar dash-ws-health-bar--inline dash-ing-bar" role="group" aria-label="${esc(it.name)} — ${pct}% of products">
            <div class="dash-ws-health-track" style="--bar-color:${color}">
              <div class="dash-ws-health-fill dash-metric-fill" style="width:${pct}%;background:${color}">
                <span class="dash-count-up dash-ws-health-num" data-count-to="${pct}" data-count-suffix="%">0%</span>
              </div>
            </div>
          </div>
        </div>`;
    })
    .join('');
}

function renderIngredientFlags(d) {
  const unsafe = d.unsafeIngredients || [];
  const unknown = d.unknownIngredients || [];
  if (!unsafe.length && !unknown.length) return '';
  const unsafeEmpty = unsafe.length < 5
    ? `<p class="dash-ing-empty">No further Unsafe ingredients detected</p>`
    : '';
  return `
    <section class="dash-two-up dash-flags-section">
      <div class="dash-card dash-ingredients-card dash-flag-card">
        <div class="dash-card-topbar">
          <div class="dash-card-topbar-lead">
            <h3 class="dash-card-title">Unsafe ingredients</h3>
          </div>
          ${cardMenu('unsafeingredients', 'Unsafe ingredients')}
        </div>
        <p class="dash-ing-note">Ingredients classified as Unsafe &middot; top 5 by portfolio prevalence.</p>
        <div class="dash-ing-table">${flagBarRows(unsafe, C.red)}</div>
        ${unsafeEmpty}
      </div>
      <div class="dash-card dash-ingredients-card dash-flag-card">
        <div class="dash-card-topbar">
          <div class="dash-card-topbar-lead">
            <h3 class="dash-card-title">Unknown ingredients</h3>
          </div>
          ${cardMenu('unknowningredients', 'Unknown ingredients')}
        </div>
        <p class="dash-ing-note">GRAS status not established &middot; top 5 by portfolio prevalence.</p>
        <div class="dash-ing-table">${flagBarRows(unknown, C.orange)}</div>
      </div>
    </section>`;
}

/* ------------------------------------------------------------------ */
/* Segmented score-distribution bar (no card — sits on the plain page).*/
/* A big "rated Excellent" stat on the left, a single stacked bar whose */
/* segments are sized to each tier's share, and a legend where each item */
/* sits directly under its segment, joined by a short vertical connector.*/
/* ------------------------------------------------------------------ */
function renderScoreDistribution(d) {
  const dist = d.scoreDistribution;
  if (!dist || !Array.isArray(dist.tiers)) return '';
  /* Only tiers with products get a segment + a legend item (so a 0-count tier
     has nothing to point at). */
  const shown = dist.tiers.filter((t) => t.pct > 0);
  if (!shown.length) return '';
  const exc = dist.tiers.find((t) => t.label === 'Excellent') || dist.tiers[0];

  /* Color each tier from the canonical status palette (SCORE_TIER_COLORS) so the
     bar matches the status dots, pillar bars, and rating labels everywhere else
     — not the ad-hoc per-tier colors on the data. "OK"/"Okay" both map to okay. */
  const tierColor = (label) => {
    const key = String(label || '').trim().toLowerCase();
    const tone = key.startsWith('ok') ? 'okay' : key;
    return SCORE_TIER_COLORS[tone] || C.ink;
  };

  const segs = shown
    .map((t) => `
        <div class="dash-seg-part" style="flex-grow:${t.pct};background:${tierColor(t.label)}" title="${esc(t.label)} ${t.pct}%">
          <span class="dash-seg-part-label">${t.pct}%</span>
        </div>`)
    .join('');

  const legend = shown
    .map((t) => `
        <div class="dash-seg-leg-cell" style="flex-grow:${t.pct}">
          <span class="dash-seg-leg-line" style="background:${tierColor(t.label)}"></span>
          <span class="dash-seg-leg-info">
            <span class="dash-seg-leg-dot" style="background:${tierColor(t.label)}"></span>
            <span class="dash-seg-leg-name">${esc(t.label)}</span>
            ${countUpMarkup(t.count, { className: 'dash-seg-leg-count' })}
          </span>
        </div>`)
    .join('');

  const measures = dist.measures
    ? `<p class="dash-pillars-intro dash-seg-measures"><strong>What this measures:</strong> ${esc(dist.measures)}${dist.pillar ? ` <em>${esc(dist.pillar)}.</em>` : ''}</p>`
    : '';

  return `
    <section class="dash-seg-section">
      <div class="dash-section-head dash-seg-head">
        <h2 class="dash-section-title">Portfolio Analysis</h2>
      </div>
      <div class="dash-seg-row">
        <div class="dash-seg-score">
          <div class="dash-wisescore-num dash-seg-num">${countUpMarkup(exc.pct, { className: 'n dash-seg-pct-num' })}<span class="d">%</span></div>
          <p class="dash-wisescore-note dash-seg-note">${exc.count} of ${dist.total} products rated ${statusTermLabel(exc.label)}<span class="dash-seg-note-period">.</span></p>
        </div>
        <div class="dash-seg-bars">
          <div class="dash-seg-track">${segs}</div>
          <div class="dash-seg-legend">${legend}</div>
        </div>
      </div>
      ${measures}
    </section>`;
}

/* ------------------------------------------------------------------ */
/* "Where to focus" opportunity scatter — every WISEscore metric plotted */
/* by its current score (Y) against the share of products scoring below  */
/* Good (X). The shaded lower-right zone (high share below Good + low     */
/* score) flags the highest-leverage fixes. Dots are colored by the       */
/* quadrant they fall in (green Strengths, amber attention, red Priority  */
/* fix), drawn from the brand status palette, so the cloud reads as a     */
/* focus heat-map. Sits in the left column of a two-up row, paired        */
/* with a ranked "highest-leverage fixes" list. Point names surface on    */
/* hover (shared tooltip) rather than as always-on labels, matching the   */
/* radar. Reuses the shared hover-tooltip + replay machinery. */
/* ------------------------------------------------------------------ */

/* Deterministic "% of products scoring below Good" for a metric. Derived from
   the metric's own score (lower score → more products below Good) with a small,
   name-seeded jitter so the cloud scatters naturally instead of sitting on a
   single line. Stays stable across re-renders and brand switches. */
function focusBelowGood(name, value) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const jitter = (h % 15) - 7;
  const raw = (100 - value) * 0.82 + jitter;
  return Math.max(6, Math.min(76, Math.round(raw)));
}

/* Real "% of products scoring below Good" per metric, keyed by its short
   label. These are the portfolio-impact figures behind each metric, so points
   spread naturally across all four quadrants (Strengths / High-impact wins /
   Watch / Priority fix) instead of collapsing onto a synthetic inverse-of-score
   diagonal. Any metric not in the table falls back to the derived value. */
const FOCUS_IMPACT = {
  Protein: 37, Fiber: 37, Fat: 49, Carbs: 63, Sugar: 71,
  Clean: 13, Banned: 21, Emulsif: 24, UPF: 38, Seeds: 50,
  'Anti-Inf': 29, Muscle: 37, Heart: 41, Gut: 54, Diabetes: 67,
};

function renderFocusScatter(d) {
  const pillars = d.pillars || [];
  const points = [];
  pillars.forEach((p) => {
    (p.metrics || []).forEach((m) => {
      const short = RADAR_SHORT[m.name] || m.name;
      points.push({
        label: short,
        full: m.name,
        group: p.name,
        score: m.value,
        below: FOCUS_IMPACT[short] != null ? FOCUS_IMPACT[short] : focusBelowGood(m.name, m.value),
        color: null,
      });
    });
  });
  if (!points.length) return '';

  /* Plot geometry — a wide viewBox so the chart renders a bit shy of half as
     tall as its column width. Text still reads at a natural scale since the SVG
     is width:100%; height:auto. */
  const W = 520;
  const H = 255;
  const m = { l: 46, r: 18, t: 22, b: 42 };
  const plotW = W - m.l - m.r;
  const plotH = H - m.t - m.b;
  const X_MAX = 80;
  const Y_MIN = 30;
  const Y_MAX = 100;
  const X_THRESH = 40;
  const Y_THRESH = 65;
  const xScale = (v) => m.l + (v / X_MAX) * plotW;
  const yScale = (v) => m.t + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * plotH;

  /* Color each point by the quadrant it lands in rather than by its raw score:
     a metric can score well yet still sit deep in the lower-right priority zone
     (many products below Good), so a status-only color would read green inside
     the red zone. Mapping to the quadrant keeps the brand palette but lets the
     cloud read as a true focus heat-map — green Strengths, amber attention, red
     Priority fix. */
  const focusColor = (below, score) =>
    (below >= X_THRESH && score < Y_THRESH) ? C.red
      : (below < X_THRESH && score >= Y_THRESH) ? C.green
        : C.amber;
  points.forEach((p) => { p.color = focusColor(p.below, p.score); });

  const xTicks = [0, 20, 40, 60, 80];
  const yTicks = [30, 40, 50, 60, 70, 80, 90, 100];

  const gridV = xTicks
    .map((t) => `<line class="dash-scatter-grid" x1="${xScale(t).toFixed(1)}" y1="${m.t}" x2="${xScale(t).toFixed(1)}" y2="${(m.t + plotH).toFixed(1)}"></line>`)
    .join('');
  const gridH = yTicks
    .map((t) => `<line class="dash-scatter-grid" x1="${m.l}" y1="${yScale(t).toFixed(1)}" x2="${(m.l + plotW).toFixed(1)}" y2="${yScale(t).toFixed(1)}"></line>`)
    .join('');

  const xTickLabels = xTicks
    .map((t) => `<text class="dash-scatter-tick" x="${xScale(t).toFixed(1)}" y="${(m.t + plotH + 16).toFixed(1)}" text-anchor="middle">${t}%</text>`)
    .join('');
  const yTickLabels = yTicks
    .map((t) => `<text class="dash-scatter-tick" x="${(m.l - 8).toFixed(1)}" y="${(yScale(t) + 3.5).toFixed(1)}" text-anchor="end">${t}</text>`)
    .join('');

  /* Shaded "priority fix" zone — high share below Good (x > threshold) AND low
     score (y < threshold): the lower-right rectangle. */
  const zoneX = xScale(X_THRESH);
  const zoneY = yScale(Y_THRESH);
  const zoneRect = `<rect class="dash-scatter-zone" x="${zoneX.toFixed(1)}" y="${zoneY.toFixed(1)}" width="${(m.l + plotW - zoneX).toFixed(1)}" height="${(m.t + plotH - zoneY).toFixed(1)}"></rect>`;

  /* Dashed threshold dividers. */
  const dividers = `
    <line class="dash-scatter-divider" x1="${zoneX.toFixed(1)}" y1="${m.t}" x2="${zoneX.toFixed(1)}" y2="${(m.t + plotH).toFixed(1)}"></line>
    <line class="dash-scatter-divider" x1="${m.l}" y1="${zoneY.toFixed(1)}" x2="${(m.l + plotW).toFixed(1)}" y2="${zoneY.toFixed(1)}"></line>`;

  /* Quadrant labels — rendered as small rounded chips pinned to each corner so
     they stay legible against the plot without the chunky all-caps text. Only
     the pill's outer edge is pinned to the corner (left edge for 'start', right
     edge for 'end'); the label is then centered inside the pill both ways, so
     padding stays symmetric regardless of how the width estimate lands. */
  const zoneChip = (text, x, y, anchor, fix) => {
    const padX = 9, h = 18, charW = 5.0;
    const w = text.length * charW + padX * 2;
    const rx = anchor === 'start' ? x : x - w;
    const cx = rx + w / 2;
    return `<g class="dash-scatter-zone-chip${fix ? ' is-fix' : ''}">
      <rect class="dash-scatter-chip-bg" x="${rx.toFixed(1)}" y="${(y - h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h}" rx="${(h / 2).toFixed(1)}"></rect>
      <text class="dash-scatter-zone-label${fix ? ' dash-scatter-zone-label--fix' : ''}" x="${cx.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="central">${text}</text>
    </g>`;
  };
  const zoneLabels = `
    ${zoneChip('Strengths', m.l + 6, m.t + 12, 'start')}
    ${zoneChip('High-impact wins', m.l + plotW - 6, m.t + 12, 'end')}
    ${zoneChip('Watch', m.l + 6, m.t + plotH - 10, 'start')}
    ${zoneChip('Priority fix', m.l + plotW - 6, m.t + plotH - 10, 'end', true)}`;

  /* Axis titles. */
  const axisTitles = `
    <text class="dash-scatter-axis-title" x="${(m.l + plotW / 2).toFixed(1)}" y="${(H - 6).toFixed(1)}" text-anchor="middle">% of products scoring below Good</text>
    <text class="dash-scatter-axis-title" transform="translate(${(m.l - 34).toFixed(1)},${(m.t + plotH / 2).toFixed(1)}) rotate(-90)" text-anchor="middle">Metric score</text>`;

  const dots = points
    .map((p) => {
      const cx = xScale(p.below);
      const cy = yScale(p.score);
      return `
        <g class="dash-scatter-pt">
          <circle class="dash-scatter-dot" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="7" fill="${p.color}" style="--dot-color:${p.color}"
            data-ring="${esc(p.group)}" data-label="${esc(p.full)}" data-value="${p.score}" data-pct="${p.below}" data-color="${p.color}"></circle>
        </g>`;
    })
    .join('');

  /* Companion right column: the highest-leverage fixes, ranked by a simple
     leverage score (share below Good + distance under a perfect score) so the
     metrics deepest in the priority zone surface first. Each row reuses the fat
     inline health bar (filled to its share-below-Good, colored by status). */
  const ranked = [...points]
    .sort((a, b) => (b.below + (100 - b.score)) - (a.below + (100 - a.score)))
    .slice(0, 6);
  const fixRows = ranked
    .map((p, i) => `
        <div class="dash-ing-row">
          <div class="dash-ing-bar-head">
            <span class="dash-ing-name"><span class="dash-ing-rank">${i + 1}</span>${esc(p.label)}</span>
            <span class="dash-scatter-fix-score">Score ${p.score}</span>
          </div>
          <div class="dash-ws-health-bar dash-ws-health-bar--inline dash-ing-bar" role="group" aria-label="${esc(p.full)} — ${p.below}% of products below Good">
            <div class="dash-ws-health-track" style="--bar-color:${p.color}">
              <div class="dash-ws-health-fill dash-metric-fill" style="width:${p.below}%;background:${p.color}">
                <span class="dash-count-up dash-ws-health-num" data-count-to="${p.below}" data-count-suffix="%">0%</span>
              </div>
            </div>
          </div>
        </div>`)
    .join('');

  return `
    <section class="dash-two-up dash-scatter-row">
      <section class="dash-card dash-scatter-section">
        <div class="dash-card-topbar">
          <div class="dash-card-topbar-lead">
            <h3 class="dash-card-title">Where to focus</h3>
            <p class="dash-scatter-intro">Each metric by its score (vertical) vs. the share of products scoring below Good (horizontal). The shaded lower-right zone flags the highest-leverage fixes. Hover any point for details.</p>
          </div>
        </div>
        <div class="dash-scatter-plot">
          <svg class="dash-scatter-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Opportunity prioritization — metric score versus share of products scoring below Good">
            ${zoneRect}
            <g class="dash-scatter-grid-g">${gridV}${gridH}</g>
            ${dividers}
            ${zoneLabels}
            ${xTickLabels}
            ${yTickLabels}
            ${axisTitles}
            ${dots}
          </svg>
        </div>
      </section>
      <section class="dash-card dash-ingredients-card dash-scatter-side">
        <div class="dash-card-topbar">
          <div class="dash-card-topbar-lead">
            <span class="dash-ing-eyebrow">Ranked</span>
            <h3 class="dash-card-title">Highest-leverage fixes</h3>
          </div>
        </div>
        <p class="dash-ing-note">% = share of products scoring below Good on this metric.</p>
        <div class="dash-ing-table">${fixRows}</div>
      </section>
    </section>`;
}

/**
 * Render the dashboard into the given scroll host element.
 * @param {HTMLElement} host  typically #agent-main-scroll
 */
export function renderDashboardHome(host) {
  if (!host) return;
  /* Re-render replaces the hero markup, so drop any open "Learn more" popover
     (it's portaled to <body> and would otherwise be orphaned). */
  closeHeroLearnPopover();
  _dashboardHost = host;
  const d = getActiveData();
  const isAlt = _altBrandActive;
  const discovering = shouldRunDiscovery(isAlt);
  host.innerHTML = `
    ${renderHero(d, isAlt)}
    ${discovering ? renderDiscovery() : ''}
    <div class="dash${discovering ? ' is-discovering' : ''}">
      ${renderClaim(d)}
      ${document.body.dataset.hideWISEai ? renderTopPerformers(d) : ''}
      ${document.body.dataset.hideWISEai ? renderTopPerformersHero(d) : ''}
      <section class="dash-two-up" id="dash-charts">
        ${renderUpf(d)}
        ${renderGras(d)}
      </section>
      ${renderPillarCards(d)}
      ${renderPillarBreakdown(d)}
      ${renderPillarRadar(d)}
      ${renderTopIngredients(d)}
      ${renderTopProducts(d)}
      ${renderMetricSpotlight(d)}
      ${renderIngredientFlags(d)}
      ${renderScoreDistribution(d)}
      ${document.body.dataset.hideWISEai ? renderFocusScatter(d) : ''}
    </div>`;

  /* Wire interactions only once per host element. On re-renders triggered by
     the brand toggle, the innerHTML is replaced but the same host node is
     reused — skipping this block prevents duplicate listeners stacking up. */
  if (!host._dashEventsAttached) {
    host._dashEventsAttached = true;

    const closeMenus = (except) => {
      host.querySelectorAll('.dash-kebab-menu').forEach((m) => {
        if (m === except) return;
        m.hidden = true;
        const btn = host.querySelector(`.dash-kebab[data-dash-menu="${m.dataset.dashMenuFor}"]`);
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    };

    host.addEventListener('click', (e) => {
      /* Always read the live dataset so actions after a brand switch use the
         correct data without needing to re-attach any listeners. */
      const d = getActiveData();

      const tab = e.target.closest('[data-dash-tab]');
      if (tab) {
        host.querySelectorAll('[data-dash-tab]').forEach((t) => t.classList.toggle('is-active', t === tab));
        return;
      }

      /* Three-dot menu toggle. */
      const kebab = e.target.closest('[data-dash-menu]');
      if (kebab) {
        const menu = host.querySelector(`.dash-kebab-menu[data-dash-menu-for="${kebab.dataset.dashMenu}"]`);
        const willOpen = menu && menu.hidden;
        closeMenus(willOpen ? menu : null);
        if (menu) {
          menu.hidden = !willOpen;
          kebab.setAttribute('aria-expanded', String(willOpen));
        }
        return;
      }

      const action = e.target.closest('[data-dash-action]');
      if (!action) {
        closeMenus(null);
        return;
      }
      closeMenus(null);

      const a = action.dataset.dashAction;

      /* Brand logo badge → open the shared image editor scoped to the logo. */
      if (a === 'edit-logo') {
        if (!_altBrandActive) editBrandLogo();
        return;
      }

      /* Brand comparison toggle — swap the entire dashboard dataset. */
      if (a === 'switch-brand') {
        _altBrandActive = !_altBrandActive;
        renderDashboardHome(host);
        return;
      }

      /* Responsive hero: on narrow layouts the banner description collapses to a
         "Learn more" chip that reveals the same copy in a small popover. */
      if (a === 'hero-learn') {
        e.stopPropagation();
        toggleHeroLearnPopover(action);
        return;
      }

      /* Pink health-status toggle on a donut card — swaps the double donut for
         the single (levels-only) donut and hides the health-status legend. */
      const ht = a.match(/^toggle-(upf|gras)-health$/);
      if (ht) {
        const card = action.closest('.dash-donut-card');
        const showHealth = action.getAttribute('aria-checked') !== 'true';
        action.setAttribute('aria-checked', String(showHealth));
        action.classList.toggle('is-on', showHealth);
        if (card) card.classList.toggle('is-health-hidden', !showHealth);
        return;
      }

      /* Pink toggle on the pillar-breakdown donut — swaps the single-color
         overall gauge for the segmented per-pillar donut, replaying the sweep
         of whichever donut becomes visible. */
      if (a === 'toggle-breakdown-view') {
        const wrap = action.closest('.dash-breakdown-donut');
        const showPillars = action.getAttribute('aria-checked') !== 'true';
        action.setAttribute('aria-checked', String(showPillars));
        action.classList.toggle('is-on', showPillars);
        if (wrap) {
          wrap.classList.toggle('is-pillars-view', showPillars);
          const shown = wrap.querySelector(showPillars ? '.dash-bd-donut--pillars' : '.dash-bd-donut--overall');
          reanimateDonutCard(shown);
        }
        return;
      }

      /* Dismiss the celebratory WISEscore toast. Not persisted — it returns on
         reload, and only disappears for the current view when closed. */
      if (a === 'dismiss-score-toast') {
        action.closest('.dash-score-toast')?.remove();
        return;
      }

      /* The radar's "view full report" jumps to the per-pillar breakdown. */
      if (a === 'radar-report') {
        host.querySelector('.dash-pillars-breakdown')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      /* Report surface — from the card kebab and the in-card report links. The
         report opens INLINE in this panel (right of the WISEai chat) and mirrors
         into the chat; no modal overlay. The GRAS bar chart ("grasbars") shares
         the GRAS report. */
      const rep = a.match(/^(upf|gras|grasbars)-report$/);
      if (rep) {
        openDashReport(rep[1] === 'grasbars' ? 'gras' : rep[1]);
        return;
      }

      /* The pillars CTA opens the portfolio-wide insights report on the same
         inline surface. */
      if (a === 'insights-report') {
        openDashReport('insights');
        return;
      }

      /* Inline report surface controls: return to the dashboard, or export. */
      if (a === 'report-back') {
        renderDashboardHome(host);
        pushDashChat('Back to the dashboard', 'Back to your dashboard overview. Ask me to open any report and I\u2019ll bring it up here on the right.');
        return;
      }
      if (a === 'report-export') {
        window.location.href = 'portfolio.html';
        return;
      }

      /* Card menu items: share / export / insert into chat. The GRAS bar
         chart ("grasbars") is treated as the GRAS scorecard. */
      const m = a.match(/^(share|export|chat)-(upf|gras|radar|grasbars)$/);
      if (m) {
        const [, op, rawCard] = m;
        const card = rawCard === 'grasbars' ? 'gras' : rawCard;
        const label = { upf: 'Brand UPF report', gras: 'Brand GRAS report', radar: 'WISEscore pillar metrics' }[card];
        if (op === 'chat') {
          const ask = card === 'radar' ? 'walk me through the pillar metrics.' : `walk me through the ${card.toUpperCase()} scorecard.`;
          try { sessionStorage.setItem('wise-chat-insert', `Let's continue on the ${label} — ${ask}`); } catch (_) {}
          window.location.href = 'ai-chat.html';
        } else if (op === 'share') {
          const url = window.location.href;
          if (navigator.share) {
            navigator.share({ title: label, url }).catch(() => {});
          } else if (navigator.clipboard) {
            navigator.clipboard.writeText(url).catch(() => {});
          }
        } else if (op === 'export') {
          window.location.href = card === 'upf' ? 'portfolio.html' : 'portfolio.html';
        }
        return;
      }

      /* Smooth-scroll down to the WISEscore pillars section. */
      if (a === 'scroll-pillars') {
        const target = host.querySelector('.dash-pillars-section');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      const route = {
        'review-portfolio': 'product-portfolio.html',
        'add-food': 'product-portfolio.html?add=food',
        'dispute-upc': 'portfolio.html',
        'claim-upcs': 'portfolio.html',
        'verify-upf': 'verification.html',
        'verify-gras': 'gras-verification.html',
        'topproduct-report': 'portfolio.html',
        'ask-ai': 'ai-chat.html',
      }[a];
      if (route) window.location.href = route;
    });

    /* Close any open card menu when clicking outside the dashboard. */
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dash-kebab-wrap')) closeMenus(null);
    });
  }

  setupChartReplay(host);
  setupDonutPopover(host);

  /* First load: the dashboard paints in as soon as the first product is found
     (not at 100%). Until then `.dash` is hidden (is-discovering); on the first
     "found" tick we reveal it, wire the scroll-triggered chart/count-up
     animations so numbers climb + bars fill, and hold a live `is-loading` state
     while the bar keeps running — the charts read as updating as more items
     arrive. When discovery completes we drop the loading state and dismiss the
     bar. Any later render (brand toggle) or reduced-motion animates at once. */
  if (discovering) {
    const dash = host.querySelector('.dash');
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      if (dash) {
        dash.classList.remove('is-discovering');
        dash.classList.add('is-revealed', 'is-loading');
      }
      setupChartAnimations(host);
    };
    runDiscovery(host, { onFirstFound: reveal }).then(() => {
      _discoveryDone = true;
      reveal();
      if (dash) dash.classList.remove('is-loading');
      /* Let "Discovery complete" read for a beat, then FADE the bar out — but
         keep it in the layout (opacity only, never removed/collapsed) so its
         footprint stays reserved and the scorecards below never jump upward. */
      const bar = host.querySelector('#dash-discovery');
      if (bar) setTimeout(() => bar.classList.add('is-faded'), 900);
    });
  } else {
    setupChartAnimations(host);
  }
}

/* Easing helper for count-up and bar animations. */
function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function countUpEl(el, duration = 1800) {
  if (el.classList.contains('is-counted')) return;
  const to = parseInt(el.getAttribute('data-count-to'), 10);
  if (!Number.isFinite(to)) return;
  el.classList.add('is-counted');
  const suffix = el.getAttribute('data-count-suffix') || '';
  /* Slow every count-up down uniformly so the numbers tick up gradually — they
     read as products being discovered rather than snapping to their totals. */
  duration *= COUNTUP_DURATION_SCALE;
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    el.textContent = `${Math.round(to * easeOutCubic(t))}${suffix}`;
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = `${to}${suffix}`;
  };
  requestAnimationFrame(tick);
}

function runCountUps(els, { duration = 1800, stagger = 0, delay = 0 } = {}) {
  [...els].forEach((el, i) => {
    if (!el.hasAttribute('data-count-to')) return;
    setTimeout(() => countUpEl(el, duration), delay + i * stagger);
  });
}

/* Prepare metric bars for entrance animation. */
function prepChartElements(root) {
  root.querySelectorAll('.dash-metric-fill').forEach((fill) => {
    fill.dataset.targetWidth = fill.style.width;
    fill.style.width = '0%';
  });
}

function finalizeChartElements(root) {
  root.querySelectorAll('.dash-count-up').forEach((el) => {
    el.textContent = `${el.getAttribute('data-count-to')}${el.getAttribute('data-count-suffix') || ''}`;
    el.classList.add('is-counted');
  });
  root.querySelectorAll('.dash-donut-arc[data-full-d]').forEach((arc) => {
    arc.setAttribute('d', arc.getAttribute('data-full-d'));
  });
  root.querySelectorAll('.dash-metric-fill[data-target-width]').forEach((fill) => {
    fill.style.width = fill.dataset.targetWidth;
    markMetricFillReady(fill);
  });
  root.querySelectorAll('.dash-radar-svg').forEach((svg) => setRadarProgress(svg, 1));
  /* Segmented distribution bars reveal via a clip-path wipe (.is-seg-ready). */
  root.querySelectorAll('.dash-seg-track').forEach((track) => track.classList.add('is-seg-ready'));
  /* Scatter points pop in from scale(0.2)/opacity 0 — snap them to rest. */
  root.querySelectorAll('.dash-scatter-pt').forEach((pt) => {
    pt.style.transition = 'none';
    pt.style.opacity = '1';
    pt.style.transform = 'none';
  });
}

/* Snap every chart on the page to its finished state — used so exports (the
   header "Export to PDF" / the browser print + Save-as-PDF dialogs) always
   capture fully-revealed charts, regardless of how far the user has scrolled
   (the scroll-triggered entrance animations never fire for off-screen
   sections). Tracks the latest rendered host and binds the print listeners
   once. A `wise:finalize-charts` event is also dispatched so the page's
   stand-alone chart modules (matrix, polar radar, metric spotlight) can snap
   themselves to their finished state at the same moment. */
let printFinalizeHost = null;
let printFinalizeBound = false;

function finalizeAllChartsForPrint() {
  if (printFinalizeHost) {
    printFinalizeHost.classList.remove('dash-charts-pending');
    finalizeChartElements(printFinalizeHost);
  }
  window.dispatchEvent(new CustomEvent('wise:finalize-charts'));
}

function setupPrintFinalize(host) {
  printFinalizeHost = host;
  if (printFinalizeBound) return;
  printFinalizeBound = true;
  window.addEventListener('beforeprint', finalizeAllChartsForPrint);
  if (window.matchMedia) {
    const mq = window.matchMedia('print');
    const onChange = (e) => { if (e.matches) finalizeAllChartsForPrint(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }
}

const CHART_GAUGE_SWEEP_MS = 1400;
const CHART_BAR_STAGGER_MS = 90;

/* Tap targets that replay a chart's entrance animation when clicked. */
const CHART_REPLAY_SEL = [
  '.dash-donut',
  '.dash-radar',
  '.dash-scatter-plot',
  '.dash-gras-bars',
  '.dash-ws-health-bar',
  '.dash-seg-bars',
  '.dash-pillar-card-head .dash-score-num',
  '.dash-pillar-card-head .dash-stamp-icon',
  '.dash-pillar-card .dash-metric-list',
  '.dash-claim .dash-bignum-row',
  '.dash-claim .dash-progress-pct',
].join(', ');

function isDonutSweepComplete(card) {
  const arcs = card.querySelectorAll('.dash-donut-arc');
  if (!arcs.length) return false;
  return [...arcs].every((arc) => {
    const fullD = arc.getAttribute('data-full-d');
    return fullD && arc.getAttribute('d') === fullD;
  });
}

function areMetricBarsComplete(section) {
  const fills = section.querySelectorAll('.dash-metric-fill');
  if (!fills.length) return false;
  return [...fills].every((fill) => {
    const target = fill.dataset.targetWidth;
    return target && fill.style.width === target;
  });
}

function markMetricFillReady(fill) {
  fill.classList.add('is-chart-ready');
  fill.style.transition = 'none';
}

/* Clicking any chart surface replays that chart's entrance animation. Handled
   in the capture phase so the gesture is consumed before the dashboard's
   content click handler runs; pointerdown default is suppressed on the same
   surfaces to avoid stray text selection on a tap. */
function setupChartReplay(host) {
  if (host._dashChartReplayAttached) return;
  host._dashChartReplayAttached = true;
  host.addEventListener('pointerdown', (e) => {
    if (e.target.closest && e.target.closest(CHART_REPLAY_SEL)) e.preventDefault();
  }, true);
  host.addEventListener('click', (e) => {
    if (replayChartFromTarget(e.target)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
}

/* Sweep each arc segment around the ring instead of fading segments in. */
function animateDonutSweep(card, duration = CHART_GAUGE_SWEEP_MS) {
  const arcs = card.querySelectorAll('.dash-donut-arc');
  if (!arcs.length) return;
  if (isDonutSweepComplete(card)) return;
  const start = performance.now();
  const tick = (now) => {
    const t = easeOutCubic(Math.min(1, (now - start) / duration));
    const sweep = t * 360;
    arcs.forEach((arc) => {
      const fullD = arc.getAttribute('data-full-d');
      const a0 = parseFloat(arc.dataset.a0);
      const a1 = parseFloat(arc.dataset.a1);
      if (!fullD || !Number.isFinite(a0) || !Number.isFinite(a1)) return;
      if (sweep <= a0) {
        arc.setAttribute('d', '');
        return;
      }
      if (sweep >= a1) {
        arc.setAttribute('d', fullD);
        return;
      }
      const ri = parseFloat(arc.dataset.ri);
      const ro = parseFloat(arc.dataset.ro);
      const cr = parseFloat(arc.dataset.cr);
      const cx = parseFloat(arc.dataset.cx);
      const cy = parseFloat(arc.dataset.cy);
      arc.setAttribute('d', roundedSector(cx, cy, ri, ro, a0, sweep, cr));
    });
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function animateDonutCard(card) {
  if (card.classList.contains('is-chart-animating')) return;
  if (isDonutSweepComplete(card)) {
    card.classList.add('is-chart-animating');
    return;
  }
  card.classList.add('is-chart-animating');
  animateDonutSweep(card);
  runCountUps(card.querySelectorAll('.dash-count-up'));
}

/* Drive the radar web to a progress t (0 = collapsed at center, 1 = full):
   lerp each vertex dot from the center toward its stored target, and rebuild
   the data polygon from the dots' live positions. */
function setRadarProgress(svg, t) {
  const cx = parseFloat(svg.dataset.cx);
  const cy = parseFloat(svg.dataset.cy);
  const e = easeOutCubic(Math.max(0, Math.min(1, t)));
  const pts = [];
  svg.querySelectorAll('.dash-radar-dot').forEach((dot) => {
    const fx = parseFloat(dot.dataset.fx);
    const fy = parseFloat(dot.dataset.fy);
    const x = cx + (fx - cx) * e;
    const y = cy + (fy - cy) * e;
    dot.setAttribute('cx', x.toFixed(2));
    dot.setAttribute('cy', y.toFixed(2));
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  });
  const poly = svg.querySelector('.dash-radar-poly');
  if (poly) poly.setAttribute('points', pts.join(' '));
}

function isRadarComplete(svg) {
  const dot = svg.querySelector('.dash-radar-dot');
  if (!dot) return false;
  return (
    Math.abs(parseFloat(dot.getAttribute('cx')) - parseFloat(dot.dataset.fx)) < 0.5 &&
    Math.abs(parseFloat(dot.getAttribute('cy')) - parseFloat(dot.dataset.fy)) < 0.5
  );
}

/* Sweep the radar web outward from the center, matching the donut gauge feel. */
function animateRadar(section, duration = CHART_GAUGE_SWEEP_MS) {
  const svg = section.querySelector('.dash-radar-svg');
  if (!svg) return;
  if (section.classList.contains('is-chart-animating') && isRadarComplete(svg)) return;
  section.classList.add('is-chart-animating');
  if (isRadarComplete(svg)) { setRadarProgress(svg, 1); return; }
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    setRadarProgress(svg, t);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* Replay the radar entrance: collapse to center, then sweep back out. */
function reanimateRadar(section) {
  if (!section) return;
  if (prefersReducedMotion()) return;
  const svg = section.querySelector('.dash-radar-svg');
  if (!svg) return;
  setRadarProgress(svg, 0);
  section.classList.remove('is-chart-animating');
  animateRadar(section);
}

/* Pop the scatter points in, staggered, scaling up from their plotted spot —
   matching the playful entrance of the donut + radar gauges. Default CSS leaves
   the points visible, so reduced-motion (and any no-JS path) just shows them. */
function animateScatter(section) {
  if (!section || section.classList.contains('is-scatter-animated')) return;
  section.classList.add('is-scatter-animated');
  const pts = [...section.querySelectorAll('.dash-scatter-pt')];
  if (!pts.length) return;
  if (prefersReducedMotion()) {
    pts.forEach((g) => { g.style.opacity = '1'; g.style.transform = 'none'; });
    return;
  }
  pts.forEach((g) => {
    g.style.transition = 'none';
    g.style.opacity = '0';
    g.style.transform = 'scale(0.2)';
  });
  void section.offsetWidth;
  pts.forEach((g, i) => {
    const delay = i * 45;
    g.style.transition = `opacity .4s ease ${delay}ms, transform .5s cubic-bezier(.34,1.56,.64,1) ${delay}ms`;
    g.style.opacity = '1';
    g.style.transform = 'scale(1)';
  });
}

/* Replay the scatter entrance: reset the staggered pop, then re-run it. */
function reanimateScatter(section) {
  if (!section || prefersReducedMotion()) return;
  section.classList.remove('is-scatter-animated');
  animateScatter(section);
}

/* Grow the GRAS-status bars out from the left, staggered top-to-bottom to echo
   the metric-bar entrance. Scoped to .dash-gras-bar-fill so it can run
   independently of the radar sweep that shares the same section. */
function animateGrasBars(card) {
  if (!card) return;
  const fills = [...card.querySelectorAll('.dash-gras-bar-fill')];
  if (!fills.length) return;
  fills.forEach((fill, i) => {
    if (fill.classList.contains('is-chart-ready')) return;
    const delay = i * CHART_BAR_STAGGER_MS;
    fill.style.transitionDelay = `${delay}ms`;
    requestAnimationFrame(() => {
      fill.style.width = fill.dataset.targetWidth || fill.style.width;
      setTimeout(() => markMetricFillReady(fill), 1200 + delay);
    });
    const val = fill.closest('.dash-gras-bar-item')?.querySelector('.dash-gras-bar-val.dash-count-up');
    if (val && !val.classList.contains('is-counted')) setTimeout(() => countUpEl(val, 1200), delay);
  });
}

/* Replay the GRAS bars: reset each fill to zero width, then grow them back. */
function reanimateGrasBars(card) {
  if (!card || prefersReducedMotion()) return;
  card.querySelectorAll('.dash-gras-bar-fill').forEach((fill) => {
    fill.classList.remove('is-chart-ready');
    fill.style.transition = '';
    fill.style.width = '0%';
  });
  card.querySelectorAll('.dash-gras-bar-val.dash-count-up').forEach((el) => {
    el.classList.remove('is-counted');
    el.textContent = `0${el.getAttribute('data-count-suffix') || ''}`;
  });
  requestAnimationFrame(() => animateGrasBars(card));
}

function animateMetricBars(section) {
  if (section.classList.contains('is-chart-animating')) return;
  if (areMetricBarsComplete(section)) {
    section.classList.add('is-chart-animating');
    section.querySelectorAll('.dash-metric-fill').forEach(markMetricFillReady);
    return;
  }
  section.classList.add('is-chart-animating');
  runCountUps(section.querySelectorAll('.dash-pillar-card-head .dash-count-up'), {
    duration: 1800,
    stagger: 220,
  });
  section.querySelectorAll('.dash-metric-item').forEach((item, i) => {
    const delay = i * CHART_BAR_STAGGER_MS;
    const fill = item.querySelector('.dash-metric-fill');
    const val = item.querySelector('.dash-metric-val.dash-count-up');
    if (fill) {
      fill.style.transitionDelay = `${delay}ms`;
      requestAnimationFrame(() => {
        fill.style.width = fill.dataset.targetWidth || fill.style.width;
        setTimeout(() => markMetricFillReady(fill), 1200 + delay);
      });
    }
    if (val) setTimeout(() => countUpEl(val, 1200), delay);
  });
}

/* Animate the breakdown card: sweep the visible WISEscore donut + count up its
   center, then stagger-fill each per-pillar health bar with its score. */
function animatePillarBars(section) {
  if (section.classList.contains('is-chart-animating')) return;
  section.classList.add('is-chart-animating');

  /* The visible donut (overall by default); the hidden variant animates lazily
     the first time the toggle reveals it. */
  const wrap = section.querySelector('.dash-breakdown-donut');
  const donut = wrap && wrap.querySelector(
    wrap.classList.contains('is-pillars-view') ? '.dash-bd-donut--pillars' : '.dash-bd-donut--overall'
  );
  if (donut) {
    animateDonutSweep(donut);
    runCountUps(donut.querySelectorAll('.dash-count-up'));
  }

  if (areMetricBarsComplete(section)) {
    section.querySelectorAll('.dash-metric-fill').forEach(markMetricFillReady);
    return;
  }
  const bars = [...section.querySelectorAll('.dash-ws-health-bar')];
  bars.forEach((bar, i) => {
    const delay = i * CHART_BAR_STAGGER_MS;
    const fill = bar.querySelector('.dash-ws-health-fill');
    const num = bar.querySelector('.dash-ws-health-num.dash-count-up');
    if (fill) {
      fill.style.transitionDelay = `${delay}ms`;
      requestAnimationFrame(() => {
        fill.style.width = fill.dataset.targetWidth || fill.style.width;
        setTimeout(() => markMetricFillReady(fill), 1200 + delay);
      });
    }
    if (num) setTimeout(() => countUpEl(num, 1200), delay);
  });
}

/* Animate the top-ingredients table: stagger-fill each row's fat bar to its
   share-of-products width, then count up the matching % readouts in the right
   column. Mirrors the pillar-breakdown sweep but the value lives beside the
   bar (its own table column) rather than inside the fill. */
function animateIngredientBars(section) {
  if (section.classList.contains('is-chart-animating')) return;
  section.classList.add('is-chart-animating');

  if (areMetricBarsComplete(section)) {
    section.querySelectorAll('.dash-metric-fill').forEach(markMetricFillReady);
    section.querySelectorAll('.dash-count-up').forEach((el) => {
      el.textContent = `${el.getAttribute('data-count-to')}${el.getAttribute('data-count-suffix') || ''}`;
    });
    return;
  }

  const bars = [...section.querySelectorAll('.dash-ws-health-bar')];
  bars.forEach((bar, i) => {
    const delay = i * CHART_BAR_STAGGER_MS;
    const fill = bar.querySelector('.dash-ws-health-fill');
    if (fill) {
      fill.style.transitionDelay = `${delay}ms`;
      requestAnimationFrame(() => {
        fill.style.width = fill.dataset.targetWidth || fill.style.width;
        setTimeout(() => markMetricFillReady(fill), 1200 + delay);
      });
    }
  });
  runCountUps(section.querySelectorAll('.dash-count-up'), { duration: 1200, stagger: CHART_BAR_STAGGER_MS });
}

/* Reveal the segmented distribution bar left-to-right (clip-path), then count
   up the headline % and the per-tier product counts. */
function animateSegBar(section) {
  if (section.classList.contains('is-chart-animating')) return;
  section.classList.add('is-chart-animating');
  const track = section.querySelector('.dash-seg-track');
  if (track) track.classList.add('is-seg-ready');
  runCountUps(section.querySelectorAll('.dash-count-up'), { duration: 1400, stagger: 90 });
}

/* Replay a segmented distribution bar on demand: snap each track's clip-path
   wipe shut (transition suppressed so it doesn't animate backwards), rewind the
   headline % + per-tier count-ups, then re-run the left-to-right reveal. */
function reanimateSegBar(section) {
  if (!section) return;
  if (prefersReducedMotion()) return;
  const tracks = [...section.querySelectorAll('.dash-seg-track')];
  tracks.forEach((track) => {
    track.style.transition = 'none';
    track.classList.remove('is-seg-ready');
  });
  section.querySelectorAll('.dash-count-up').forEach((el) => {
    el.classList.remove('is-counted');
    el.textContent = `0${el.getAttribute('data-count-suffix') || ''}`;
  });
  /* Flush the collapsed/transition-off state before restoring the transition so
     the wipe replays cleanly from the left edge. */
  void section.offsetWidth;
  tracks.forEach((track) => { track.style.transition = ''; });
  section.classList.remove('is-chart-animating');
  animateSegBar(section);
}

/* Replay a single pillar card's entrance animation on demand. The metric-bar
   chart always replays; `includeScore` also rewinds and re-counts the big score
   gauge. Bars snap back to 0 with the transition suppressed (so they don't
   animate backwards), then sweep forward again on the next frame. */
function reanimatePillarCard(card, { includeScore = false } = {}) {
  if (!card) return;
  if (prefersReducedMotion()) return;

  const fills = [...card.querySelectorAll('.dash-metric-fill')];
  fills.forEach((fill) => {
    if (!fill.dataset.targetWidth) fill.dataset.targetWidth = fill.style.width;
    fill.classList.remove('is-chart-ready');
    fill.style.transition = 'none';
    fill.style.transitionDelay = '';
    fill.style.width = '0%';
  });

  card.querySelectorAll('.dash-metric-val.dash-count-up').forEach((el) => {
    el.classList.remove('is-counted');
    el.textContent = `0${el.getAttribute('data-count-suffix') || ''}`;
  });

  const scoreEl = card.querySelector('.dash-score-num .dash-count-up');
  if (includeScore && scoreEl) {
    scoreEl.classList.remove('is-counted');
    scoreEl.textContent = `0${scoreEl.getAttribute('data-count-suffix') || ''}`;
  }

  /* Flush the width:0 / transition:none state before restoring the transition,
     so the forward sweep starts cleanly from zero. */
  void card.offsetWidth;
  fills.forEach((fill) => { fill.style.transition = ''; });

  card.querySelectorAll('.dash-metric-item').forEach((item, i) => {
    const delay = i * CHART_BAR_STAGGER_MS;
    const fill = item.querySelector('.dash-metric-fill');
    const val = item.querySelector('.dash-metric-val.dash-count-up');
    if (fill) {
      fill.style.transitionDelay = `${delay}ms`;
      requestAnimationFrame(() => {
        fill.style.width = fill.dataset.targetWidth || fill.style.width;
        setTimeout(() => markMetricFillReady(fill), 1200 + delay);
      });
    }
    if (val) setTimeout(() => countUpEl(val, 1200), delay);
  });

  if (includeScore && scoreEl) countUpEl(scoreEl, 1800);
}

/* Replay a donut gauge (UPF / GRAS): rewind the ring arcs and the centred
   count-up, clear the completion guard, then re-run the sweep. */
function reanimateDonutCard(card) {
  if (!card) return;
  if (prefersReducedMotion()) return;
  card.querySelectorAll('.dash-donut-arc[data-full-d]').forEach((arc) => arc.setAttribute('d', ''));
  card.querySelectorAll('.dash-count-up').forEach((el) => {
    el.classList.remove('is-counted');
    el.textContent = `0${el.getAttribute('data-count-suffix') || ''}`;
  });
  card.classList.remove('is-chart-animating');
  animateDonutCard(card);
}

/* Replay the WISEscore health bar: snap the fill back to 0 (transition
   suppressed), rewind the score, then re-run the fill + count-up. */
function reanimateHealthBar(heading) {
  if (!heading) return;
  if (prefersReducedMotion()) return;
  const fill = heading.querySelector('.dash-ws-health-fill');
  const scoreEl = heading.querySelector('.dash-ws-health-num');
  if (fill) {
    if (!fill.dataset.targetWidth) fill.dataset.targetWidth = fill.style.width;
    fill.classList.remove('is-chart-ready');
    fill.style.transition = 'none';
    fill.style.width = '0%';
  }
  if (scoreEl) {
    scoreEl.classList.remove('is-counted');
    scoreEl.textContent = `0${scoreEl.getAttribute('data-count-suffix') || ''}`;
  }
  void heading.offsetWidth;
  if (fill) fill.style.transition = '';
  heading.classList.remove('is-ws-health-animated');
  animateHealthBar(heading);
}

/* Replay a standalone count-up stat (the claim big-number tiles). */
function reanimateCounter(scope) {
  if (!scope) return;
  if (prefersReducedMotion()) return;
  const els = scope.querySelectorAll('.dash-count-up');
  els.forEach((el) => {
    el.classList.remove('is-counted');
    el.textContent = `0${el.getAttribute('data-count-suffix') || ''}`;
  });
  runCountUps(els, { duration: 1600 });
}

/* Map a clicked element to the chart component it belongs to and replay it.
   Returns true when a chart was matched so the caller can swallow the gesture.
     • Pillar card — stamp icon replays score + bars; score gauge or the metric
       list replays just the bars.
     • Donut gauge — the ring + centre stat.
     • WISEscore health bar — the fill + score.
     • Claim tiles — the big-number count-up. */
function replayChartFromTarget(el) {
  if (!el || !el.closest) return false;

  const pillarCard = el.closest('.dash-pillar-card');
  if (pillarCard) {
    if (el.closest('.dash-stamp-icon')) {
      reanimatePillarCard(pillarCard, { includeScore: true });
      return true;
    }
    if (el.closest('.dash-score-num') || el.closest('.dash-metric-list')) {
      reanimatePillarCard(pillarCard, { includeScore: false });
      return true;
    }
    return false;
  }

  const donut = el.closest('.dash-donut');
  if (donut) {
    reanimateDonutCard(donut.closest('.dash-donut-card') || donut);
    return true;
  }

  const radar = el.closest('.dash-radar');
  if (radar) {
    reanimateRadar(radar.closest('.dash-radar-card') || radar);
    return true;
  }

  const scatter = el.closest('.dash-scatter-plot');
  if (scatter) {
    reanimateScatter(scatter.closest('.dash-scatter-section') || scatter);
    return true;
  }

  const grasBars = el.closest('.dash-gras-bars');
  if (grasBars) {
    reanimateGrasBars(grasBars.closest('.dash-gras-bar-card') || grasBars);
    return true;
  }

  const wsBar = el.closest('.dash-ws-health-bar');
  if (wsBar) {
    reanimateHealthBar(wsBar);
    return true;
  }

  /* Segmented distribution bars (the per-pillar distribution + the gut-health
     spotlight). Scope the hit to the bar area only so the row's title and
     "View report" action stay clickable. */
  const segBars = el.closest('.dash-seg-bars');
  if (segBars) {
    reanimateSegBar(segBars.closest('.dash-seg-section, .dash-mrow-section') || segBars);
    return true;
  }

  const counter = el.closest('.dash-claim .dash-bignum-row, .dash-claim .dash-progress-pct');
  if (counter) {
    reanimateCounter(counter);
    return true;
  }

  return false;
}

function animateHealthBar(heading) {
  if (heading.classList.contains('is-ws-health-animated')) return;
  heading.classList.add('is-ws-health-animated');
  const fill = heading.querySelector('.dash-ws-health-fill');
  const scoreEl = heading.querySelector('.dash-ws-health-num');
  if (fill && !fill.classList.contains('is-chart-ready')) {
    requestAnimationFrame(() => {
      fill.style.width = fill.dataset.targetWidth || fill.style.width;
      setTimeout(() => markMetricFillReady(fill), 1200);
    });
  }
  if (scoreEl && !scoreEl.classList.contains('is-counted')) {
    countUpEl(scoreEl, 1200);
  }
}

/* Animate charts when the user scrolls each section into view — no auto-scroll. */
function setupChartAnimations(host) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  host.classList.add('dash-charts-pending');
  prepChartElements(host);
  /* Ensure any export/print snapshots the fully-revealed charts. */
  setupPrintFinalize(host);

  if (reduced) {
    host.classList.remove('dash-charts-pending');
    finalizeChartElements(host);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (el.classList.contains('dash-claim')) {
        runCountUps(el.querySelectorAll('.dash-count-up'), { duration: 1600, stagger: 220 });
      } else if (el.classList.contains('dash-donut-card')) {
        animateDonutCard(el);
      } else if (el.classList.contains('dash-pillars-heading')) {
        animateHealthBar(el);
      } else if (el.classList.contains('dash-pillars')) {
        animateMetricBars(el);
      } else if (el.classList.contains('dash-pillars-breakdown')) {
        animatePillarBars(el);
      } else if (el.classList.contains('dash-ingredients-section')) {
        animateIngredientBars(el);
      } else if (el.classList.contains('dash-products-section')) {
        animateIngredientBars(el);
      } else if (el.classList.contains('dash-flags-section')) {
        animateIngredientBars(el);
      } else if (el.classList.contains('dash-seg-section')) {
        animateSegBar(el);
      } else if (el.classList.contains('dash-mrow-section')) {
        animateSegBar(el);
      } else if (el.classList.contains('dash-radar-section')) {
        animateRadar(el);
        animateGrasBars(el.querySelector('.dash-gras-bar-card'));
      } else if (el.classList.contains('dash-scatter-row')) {
        animateScatter(el.querySelector('.dash-scatter-section'));
        const side = el.querySelector('.dash-scatter-side');
        if (side) animateIngredientBars(side);
      }
      observer.unobserve(el);
    });
  }, { root: host, threshold: 0.25 });

  const claimSection = host.querySelector('.dash-claim');
  if (claimSection) observer.observe(claimSection);
  /* The Top 5 performers row is a second `.dash-claim` block — observe it too so
     its score count-ups fire (querySelector only grabs the first one above). */
  const topPerformers = host.querySelector('.dash-top5-claim');
  if (topPerformers) observer.observe(topPerformers);
  host.querySelectorAll('.dash-donut-card').forEach((card) => observer.observe(card));
  const pillarHeading = host.querySelector('.dash-pillars-heading');
  if (pillarHeading) observer.observe(pillarHeading);
  const pillarSection = host.querySelector('.dash-pillars');
  if (pillarSection) observer.observe(pillarSection);
  const breakdownSection = host.querySelector('.dash-pillars-breakdown');
  if (breakdownSection) observer.observe(breakdownSection);
  const ingredientsSection = host.querySelector('.dash-ingredients-section');
  if (ingredientsSection) observer.observe(ingredientsSection);
  const productsSection = host.querySelector('.dash-products-section');
  if (productsSection) observer.observe(productsSection);
  const flagsSection = host.querySelector('.dash-flags-section');
  if (flagsSection) observer.observe(flagsSection);
  const segSection = host.querySelector('.dash-seg-section');
  if (segSection) observer.observe(segSection);
  const spotlightSection = host.querySelector('.dash-mrow-section');
  if (spotlightSection) observer.observe(spotlightSection);
  const radarSection = host.querySelector('.dash-radar-section');
  if (radarSection) observer.observe(radarSection);
  const scatterRow = host.querySelector('.dash-scatter-row');
  if (scatterRow) observer.observe(scatterRow);
}

/* Floating popover on donut-segment hover. Styled to match the navigation
   rail tooltip (#menu-rail-tip): surface chip, hairline border, soft shadow,
   fade + slide in. Position is fixed so it escapes the card's overflow. */
/* ---- Responsive hero "Learn more" popover ----
   On narrow layouts the banner description is hidden (see .dash-hero-learn in
   wise.css) and replaced by a compact "Learn more" chip. Tapping it reveals the
   same copy in a small popover. The popover is portaled to <body> so the hero's
   `overflow: hidden` can't clip it, and it's positioned under (or above) the
   chip, repositioning on scroll/resize. */
let _heroLearnPop = null;

function closeHeroLearnPopover() {
  if (!_heroLearnPop) return;
  const { el, btn, onDoc, onKey, onReposition } = _heroLearnPop;
  btn.setAttribute('aria-expanded', 'false');
  document.removeEventListener('click', onDoc, true);
  document.removeEventListener('keydown', onKey);
  window.removeEventListener('resize', onReposition);
  window.removeEventListener('scroll', onReposition, true);
  el.classList.remove('is-open');
  setTimeout(() => el.remove(), 180);
  _heroLearnPop = null;
}

function toggleHeroLearnPopover(btn) {
  if (_heroLearnPop && _heroLearnPop.btn === btn) { closeHeroLearnPopover(); return; }
  closeHeroLearnPopover();

  const desc = btn.closest('.dash-hero-left')?.querySelector('.dash-hero-desc');
  const el = document.createElement('div');
  el.className = 'dash-hero-learn-pop';
  el.id = 'dash-hero-learn-pop';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Portfolio overview');
  el.innerHTML = `<p class="dash-hero-learn-pop-text">${desc ? desc.innerHTML : ''}</p>`;
  document.body.appendChild(el);
  btn.setAttribute('aria-expanded', 'true');

  const onReposition = () => {
    const r = btn.getBoundingClientRect();
    const pr = el.getBoundingClientRect();
    let left = r.left;
    left = Math.min(left, window.innerWidth - pr.width - 8);
    left = Math.max(8, left);
    let top = r.bottom + 8;
    if (top + pr.height > window.innerHeight - 8) {
      top = Math.max(8, r.top - pr.height - 8);
    }
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  };
  onReposition();
  requestAnimationFrame(() => el.classList.add('is-open'));

  const onDoc = (ev) => {
    if (el.contains(ev.target) || btn.contains(ev.target)) return;
    closeHeroLearnPopover();
  };
  const onKey = (ev) => { if (ev.key === 'Escape') closeHeroLearnPopover(); };
  /* Defer the outside-click listener so the click that opened the popover
     doesn't immediately close it. */
  setTimeout(() => document.addEventListener('click', onDoc, true), 0);
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', onReposition);
  window.addEventListener('scroll', onReposition, true);

  _heroLearnPop = { el, btn, onDoc, onKey, onReposition };
}

function setupDonutPopover(host) {
  let tip = document.getElementById('dash-donut-tip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'dash-donut-tip';
    tip.setAttribute('role', 'tooltip');
    document.body.appendChild(tip);
  }

  if (host._dashDonutPopoverAttached) return;
  host._dashDonutPopoverAttached = true;

  const place = (x, y) => {
    const pad = 14;
    const r = tip.getBoundingClientRect();
    let left = x + pad;
    let top = y - r.height - pad;
    if (left + r.width > window.innerWidth - 8) left = x - r.width - pad;
    if (top < 8) top = y + pad;
    tip.style.left = `${Math.max(8, left)}px`;
    tip.style.top = `${top}px`;
  };

  const show = (arc) => {
    const ring = arc.getAttribute('data-ring') || '';
    const label = arc.getAttribute('data-label') || '';
    const value = arc.getAttribute('data-value') || '';
    const pct = arc.getAttribute('data-pct') || '';
    const color = arc.getAttribute('data-color') || 'var(--primary)';
    tip.innerHTML = `
      <div class="dash-tip-eyebrow">${esc(ring)}</div>
      <div class="dash-tip-row">
        <span class="dash-tip-dot" style="background:${color}"></span>
        <span class="dash-tip-name">${esc(label)}</span>
      </div>
      <div class="dash-tip-stat"><strong>${esc(value)}</strong><span class="dash-tip-pct">${esc(pct)}<span class="dash-pct">%</span></span></div>`;
    tip.classList.add('is-visible');
  };

  const hide = () => tip.classList.remove('is-visible');

  const TIP_SEL = '.dash-donut-arc, .dash-radar-dot, .dash-gras-bar-fill, .dash-scatter-dot';
  host.addEventListener('pointerover', (e) => {
    const arc = e.target.closest(TIP_SEL);
    if (!arc) return;
    arc.classList.add('is-hover');
    show(arc);
    place(e.clientX, e.clientY);
  });
  host.addEventListener('pointermove', (e) => {
    if (!tip.classList.contains('is-visible')) return;
    if (!e.target.closest(TIP_SEL)) return;
    place(e.clientX, e.clientY);
  });
  host.addEventListener('pointerout', (e) => {
    const arc = e.target.closest(TIP_SEL);
    if (!arc) return;
    if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(TIP_SEL) === arc) return;
    arc.classList.remove('is-hover');
    hide();
  });
}
