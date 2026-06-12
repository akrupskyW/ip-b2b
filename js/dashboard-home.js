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

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* Persisted brand banner (data URL or remote URL). Stored locally so an
   uploaded image survives reloads; falls back to the CSS gradient when unset. */
const BANNER_KEY = 'wise-brand-banner';
function getBrandBanner() {
  try { return localStorage.getItem(BANNER_KEY) || ''; } catch (_) { return ''; }
}
function setBrandBanner(url) {
  try {
    if (url) localStorage.setItem(BANNER_KEY, url);
    else localStorage.removeItem(BANNER_KEY);
  } catch (_) { /* quota (large data URLs) — keep session-only */ }
}
/* CSS-safe url() value for inline background-image. */
function cssUrl(url) {
  return `url('${String(url).replace(/'/g, '%27')}')`;
}

/* Palette for chart segments (resolves against shared CSS tokens). */
const C = {
  green: 'var(--sec-green)',
  /* Soft, same-hue green used as the muted complement in the monochromatic
     health-status gauges (recedes into the card surface). */
  greenSoft: 'color-mix(in srgb, var(--sec-green) 55%, var(--surface))',
  /* A distinctly lighter shade of green for the second processing level. */
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
      { label: 'GRAS', value: 32, color: C.green },
      { label: 'Historical', value: 18, color: C.orange },
      { label: 'Unknown', value: 9, color: C.amber },
      { label: 'Unsafe', value: 2, color: C.red },
    ],
  },
  wisescore: {
    average: 79,
    pillars: [
      { name: 'Nutrient Quality', icon: 'eco', score: 75, color: C.green },
      { name: 'Ingredient Quality', icon: 'biotech', score: 89, color: C.teal },
      { name: 'Health Outcomes', icon: 'favorite', score: 72, color: C.green },
    ],
  },
  pillars: [
    {
      name: 'Nutrient Quality', tag: 'NQ', rating: 'Good', ratingTone: 'good',
      score: 75, ring: C.green,
      metrics: [
        { name: 'Fiber Density', value: 74 },
        { name: 'Sugar Density', value: 68 },
        { name: 'Protein Density', value: 83 },
        { name: 'Carbohydrate Quality', value: 71 },
        { name: 'Fat Quality', value: 79 },
      ],
    },
    {
      name: 'Ingredient Quality', tag: 'IG', rating: 'Excellent', ratingTone: 'excellent',
      score: 89, ring: C.teal,
      metrics: [
        { name: 'Ultra-Processed Food', value: 91 },
        { name: 'Banned / Unsafe Ingredients', value: 96 },
        { name: 'Clean Label', value: 93 },
        { name: 'Emulsifiers of Concern', value: 82 },
        { name: 'Seed Oils of Concern', value: 64 },
      ],
    },
    {
      name: 'Health Outcomes', tag: 'THRIVE', rating: 'Good', ratingTone: 'good',
      score: 72, ring: C.green,
      metrics: [
        { name: 'Heart Healthy', value: 76 },
        { name: 'Diabetes Friendly', value: 69 },
        { name: 'Gut Health', value: 71 },
        { name: 'Muscle Health', value: 80 },
        { name: 'Anti-Inflammatory', value: 66 },
      ],
    },
  ],
};

function metricColor(v) {
  if (v >= 80) return C.green;
  if (v >= 65) return C.greenSoft;
  if (v >= 50) return C.amber;
  return C.red;
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
      return `<path class="dash-donut-arc" d="${d}" fill="${p.color}" data-ring="${esc(ring)}" data-label="${esc(p.label)}" data-value="${p.value}" data-pct="${pct}" data-color="${esc(p.color)}"></path>`;
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
    <div class="dash-donut">
      <svg class="dash-donut-svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(label)} ${num}">
        <g transform="rotate(-90 ${cx} ${cy})">
          ${donutRing(outer, ringNames[0], cx, cy, rOuter, sw, 11)}
          ${donutRing(inner, ringNames[1], cx, cy, rInner, sw, 10)}
        </g>
      </svg>
      <div class="dash-donut-center">
        <span class="dash-donut-num ${numClass}">${num}</span>
        <span class="dash-donut-label">${esc(label)}</span>
        <span class="dash-donut-sub">${esc(sub)}</span>
      </div>
    </div>`;
}

/* Titled legend group used beside the donut (one per ring). */
function legendGroup(title, parts) {
  return `
    <div class="dash-donut-legend-group">
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
/* Brand banner editor — a centered modal panel opened from the hero's */
/* three-dot menu. Lets you upload a file (stored as a data URL) or     */
/* paste an image URL, preview it, then save or remove the banner.      */
/* ------------------------------------------------------------------ */

let bannerModalEls = null;

function ensureBannerModal() {
  if (bannerModalEls) return bannerModalEls;
  const scrim = document.createElement('div');
  scrim.className = 'dash-modal-scrim';
  const modal = document.createElement('div');
  modal.className = 'dash-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Update brand image');
  scrim.appendChild(modal);
  document.body.appendChild(scrim);
  scrim.addEventListener('click', (e) => { if (e.target === scrim) closeBannerModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeBannerModal(); });
  bannerModalEls = { scrim, modal };
  return bannerModalEls;
}

function closeBannerModal() {
  if (!bannerModalEls) return;
  bannerModalEls.scrim.classList.remove('is-open');
}

function openBannerModal(onSave) {
  const { scrim, modal } = ensureBannerModal();
  const current = getBrandBanner();
  let draft = current;

  modal.innerHTML = `
    <header class="dash-modal-head">
      <div class="dash-modal-titles">
        <span class="dash-modal-eyebrow">Brand banner</span>
        <h2 class="dash-modal-title">Update brand image</h2>
      </div>
      <button class="dash-modal-close" type="button" data-banner-close aria-label="Close"><span class="material-icons">close</span></button>
    </header>
    <div class="dash-modal-body">
      <div class="dash-banner-preview">
        <div class="dash-banner-preview-img" id="dash-banner-preview-img"></div>
        <span class="dash-banner-preview-empty" id="dash-banner-preview-empty"><span class="material-icons">image</span>No banner yet</span>
      </div>
      <label class="dash-banner-drop" id="dash-banner-drop">
        <input type="file" accept="image/*" id="dash-banner-file" hidden>
        <span class="material-icons">cloud_upload</span>
        <span class="dash-banner-drop-text"><strong>Upload an image</strong> or drag &amp; drop<br><span class="dash-banner-drop-hint">PNG, JPG or WEBP — wide images look best</span></span>
      </label>
      <div class="dash-banner-or"><span>or paste a URL</span></div>
      <input type="url" class="dash-banner-url" id="dash-banner-url" placeholder="https://…/banner.jpg" autocomplete="off">
    </div>
    <footer class="dash-modal-foot">
      <button class="dash-btn dash-btn--ghost" type="button" data-banner-remove><span class="material-icons">delete</span>Remove</button>
      <div class="dash-modal-foot-right">
        <button class="dash-btn dash-btn--ghost" type="button" data-banner-close>Cancel</button>
        <button class="dash-btn dash-btn--primary" type="button" data-banner-save><span class="material-icons">check</span>Save banner</button>
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
  if (current && !current.startsWith('data:')) urlInput.value = current;

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
    setBrandBanner(draft);
    if (typeof onSave === 'function') onSave(draft);
    closeBannerModal();
  });
  modal.querySelectorAll('[data-banner-close]').forEach((b) => b.addEventListener('click', closeBannerModal));

  requestAnimationFrame(() => scrim.classList.add('is-open'));
}

/* Public entry point for the brand-banner editor, invoked from the main
   panel's far-right "More" menu (agent-overview.js). Opens the modal and
   applies the chosen image straight to the hero banner. */
export function editBrandBanner() {
  openBannerModal((url) => {
    const bg = document.getElementById('dash-hero-bg');
    const hero = document.getElementById('dash-hero');
    if (bg) bg.style.backgroundImage = url ? cssUrl(url) : '';
    if (hero) hero.classList.toggle('has-image', !!url);
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
    summary: (d) => `${d.upf.nonCount} of ${d.upf.total} analyzed SKUs are Non-UPF (${d.upf.pct}%).`,
    stats: (d) => [
      { label: 'Non-UPF score', value: `${d.upf.pct}%` },
      { label: 'Non-UPF SKUs', value: `${d.upf.nonCount}` },
      { label: 'Analyzed SKUs', value: `${d.upf.total}` },
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
    summary: (d) => `${d.gras.grasCount} of ${d.gras.total} analyzed SKUs are GRAS (${d.gras.pct}%) across ${d.gras.uniqueIngredients} unique ingredients.`,
    stats: (d) => [
      { label: 'GRAS score', value: `${d.gras.pct}%` },
      { label: 'GRAS SKUs', value: `${d.gras.grasCount}` },
      { label: 'Unique ingredients', value: `${d.gras.uniqueIngredients}` },
    ],
    groups: (d) => [
      { title: 'Health status', parts: d.gras.split },
      { title: 'GRAS levels', parts: d.gras.distribution },
    ],
  },
};

let reportModalEls = null;

function ensureReportModal() {
  if (reportModalEls) return reportModalEls;
  const scrim = document.createElement('div');
  scrim.className = 'dash-modal-scrim';
  const modal = document.createElement('div');
  modal.className = 'dash-modal dash-modal--report';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  scrim.appendChild(modal);
  document.body.appendChild(scrim);
  scrim.addEventListener('click', (e) => { if (e.target === scrim) closeReportModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeReportModal(); });
  reportModalEls = { scrim, modal };
  return reportModalEls;
}

function closeReportModal() {
  if (!reportModalEls) return;
  reportModalEls.scrim.classList.remove('is-open');
}

function openReportModal(card, d) {
  const cfg = REPORTS[card];
  if (!cfg) return;
  const { scrim, modal } = ensureReportModal();
  modal.setAttribute('aria-label', cfg.title);

  const stats = cfg.stats(d)
    .map((s) => `
      <div class="dash-report-stat">
        <span class="dash-report-stat-val">${esc(s.value)}</span>
        <span class="dash-report-stat-label">${esc(s.label)}</span>
      </div>`)
    .join('');

  const groups = cfg.groups(d)
    .map((g) => legendGroup(g.title, g.parts))
    .join('');

  modal.innerHTML = `
    <header class="dash-modal-head">
      <div class="dash-modal-titles">
        <span class="dash-modal-eyebrow">${esc(cfg.eyebrow)}</span>
        <h2 class="dash-modal-title">${esc(cfg.title)}</h2>
      </div>
      <button class="dash-modal-close" type="button" data-report-close aria-label="Close"><span class="material-icons">close</span></button>
    </header>
    <div class="dash-modal-body">
      <p class="dash-report-summary ${cfg.accent}">${esc(cfg.summary(d))}</p>
      <div class="dash-report-stats">${stats}</div>
      <div class="dash-report-groups">${groups}</div>
      <div class="dash-report-pending">
        <span class="material-icons">hourglass_top</span>
        <div>
          <div class="dash-report-pending-title">The full report is on its way</div>
          <div class="dash-report-pending-sub">Per-SKU breakdowns, ingredient-level detail and exportable tables will appear here once the report is finalized.</div>
        </div>
      </div>
    </div>
    <footer class="dash-modal-foot">
      <div class="dash-modal-foot-right" style="margin-left:auto;">
        <button class="dash-btn dash-btn--ghost" type="button" data-report-close>Close</button>
        <button class="dash-btn dash-btn--primary" type="button" data-report-export><span class="material-icons">download</span>Export</button>
      </div>
    </footer>`;

  modal.querySelectorAll('[data-report-close]').forEach((b) => b.addEventListener('click', closeReportModal));
  const exportBtn = modal.querySelector('[data-report-export]');
  if (exportBtn) exportBtn.addEventListener('click', () => { window.location.href = 'portfolio.html'; });

  modal.scrollTop = 0;
  requestAnimationFrame(() => scrim.classList.add('is-open'));
}

function renderHero(d) {
  const banner = getBrandBanner();
  return `
    <section class="dash-hero${banner ? ' has-image' : ''}" id="dash-hero">
      <div class="dash-hero-bg" id="dash-hero-bg"${banner ? ` style="background-image:${cssUrl(banner)}"` : ''}></div>
      <div class="dash-hero-scrim" aria-hidden="true"></div>
      <div class="dash-hero-left">
        <div class="dash-hero-row">
          <h1 class="dash-hero-title">Welcome, ${esc(d.brand.name)}</h1>
        </div>
        <p class="dash-hero-desc">Here's the food intelligence WISEcode has gathered on your portfolio — UPF status, ingredient and nutrient quality, and health-outcome metrics. Review what we found, then claim your products to manage them.</p>
      </div>
    </section>`;
}

/* Compact summary band beneath the hero: three top-line scores
   (WISEscore / Non-UPF / GRAS) presented as big-number stat cards. */
function scoreCard({ num, denom, rating, ratingTone, note, icon }) {
  return `
    <article class="dash-card dash-score-card">
      <div class="dash-score-top">
        <div class="dash-score-num"><span class="n">${esc(String(num))}</span><span class="d">${esc(denom)}</span></div>
        ${icon ? `<span class="dash-score-icon"><span class="material-icons">${esc(icon)}</span></span>` : ''}
      </div>
      <span class="dash-badge dash-badge--${ratingTone}"><span class="material-icons" style="font-size:13px;">check_circle</span>${esc(rating)}</span>
      <p class="dash-score-note">${note}</p>
    </article>`;
}

function renderScoreBand(d) {
  const ws = d.wisescore.average;
  const wsRating = ratingLabel(ws);
  const wsTone = ws >= 85 ? 'excellent' : 'good';
  const upfTone = d.upf.pct >= 85 ? 'excellent' : 'good';
  const grasTone = d.gras.pct >= 85 ? 'excellent' : 'good';
  return `
    <section class="dash-score-band">
      ${scoreCard({
        num: `${d.upf.pct}%`, denom: 'Non-UPF', rating: ratingLabel(d.upf.pct), ratingTone: upfTone, icon: 'eco',
        note: `<strong>${d.upf.nonCount} of ${d.upf.total}</strong> analyzed SKUs are Non&#8209;UPF · ${d.upf.nonCount} qualify for the verification shield.`,
      })}
      ${scoreCard({
        num: `${d.gras.pct}%`, denom: 'GRAS', rating: ratingLabel(d.gras.pct), ratingTone: grasTone, icon: 'biotech',
        note: `<strong>${d.gras.grasCount} of ${d.gras.total}</strong> analyzed SKUs are GRAS across ${d.gras.uniqueIngredients} unique ingredients.`,
      })}
      ${scoreCard({
        num: ws, denom: '/100', rating: wsRating, ratingTone: wsTone, icon: 'verified',
        note: `Average WISEscore&#8482; across all <strong>${d.claim.discovered} discovered products</strong>`,
      })}
    </section>`;
}

function renderClaim(d) {
  const c = d.claim;
  const ws = d.wisescore.average;
  const wsRating = ratingLabel(ws);
  return `
    <section class="dash-claim">
      <div>
        <div class="dash-bignum-row">
          <span class="dash-bignum">${c.discovered}</span>
          <span class="dash-bignum-cap"><strong>Products Discovered</strong><br>across retail &amp; distribution</span>
        </div>
        <div class="dash-btn-row">
          <button class="dash-btn dash-btn--primary" type="button" data-dash-action="review-portfolio"><span class="material-icons">inventory_2</span>Review your food portfolio</button>
        </div>
      </div>
      <div class="dash-claim-divider"></div>
      <div>
        <div class="dash-progress-pct">
          <span class="dash-bignum">${c.claimedPct}%</span>
          <span class="dash-bignum-cap"><strong>Brand Claimed</strong><br>${c.claimed} of ${c.discovered} products</span>
        </div>
        <div class="dash-btn-row">
          <button class="dash-btn dash-btn--ghost" type="button" data-dash-action="claim-skus"><span class="material-icons">verified_user</span>Claim your SKUs</button>
        </div>
      </div>
      <div class="dash-claim-divider"></div>
      <div class="dash-claim-score">
        <div class="dash-score-num">
          <span class="n">${ws}</span><span class="d">/100</span>
          <span class="dash-score-cap"><strong>${wsRating} WISEscore&#8482;</strong><br>across ${d.claim.discovered} products</span>
        </div>
      </div>
    </section>`;
}

function renderUpf(d) {
  const u = d.upf;
  return `
    <section class="dash-card dash-donut-card">
      <div class="dash-card-topbar">
        <h3 class="dash-card-title">UPF status across ${u.total} analyzed SKUs</h3>
        ${cardMenu('upf', 'Brand UPF report')}
      </div>
      <div class="dash-donut-row">
        ${doubleDonut(u.split, u.distribution, `${u.pct}%`, 'is-teal', 'Non-UPF', `${u.nonCount} of ${u.total} products`, ['Health status', 'Processing level'])}
        <div class="dash-donut-legends">
          ${legendGroup('Health status', u.split)}
          ${legendGroup('Processing levels', u.distribution)}
        </div>
      </div>
      <div class="dash-callout dash-callout--green">
        <span class="dash-callout-icon"><span class="material-icons">verified</span></span>
        <div class="dash-callout-body">
          <div class="dash-callout-title">${u.nonCount} products qualify for the NON-UPF Verification Shield</div>
          <div class="dash-callout-sub">Get them verified to display the badge on retail listings.</div>
        </div>
        <button class="dash-callout-btn" type="button" data-dash-action="verify-upf">Start verification<span class="material-icons">arrow_outward</span></button>
      </div>
      <button class="dash-report-link" type="button" data-dash-action="upf-report">
        <span class="dash-report-left"><span class="material-icons">description</span>View &amp; export the full Brand UPF Report</span>
        <span class="material-icons">arrow_outward</span>
      </button>
    </section>`;
}

function renderGras(d) {
  const g = d.gras;
  return `
    <section class="dash-card dash-donut-card">
      <div class="dash-card-topbar">
        <h3 class="dash-card-title">GRAS status across ${g.total} analyzed SKUs</h3>
        ${cardMenu('gras', 'Brand GRAS report')}
      </div>
      <div class="dash-donut-row">
        ${doubleDonut(g.split, g.distribution, `${g.pct}%`, 'is-teal', 'GRAS', `${g.grasCount} of ${g.total} products`, ['Health status', 'GRAS level'])}
        <div class="dash-donut-legends">
          ${legendGroup('Health status', g.split)}
          ${legendGroup('GRAS levels', g.distribution)}
        </div>
      </div>
      <div class="dash-callout dash-callout--amber">
        <span class="dash-callout-icon"><span class="material-icons">warning</span></span>
        <div class="dash-callout-body">
          <div class="dash-callout-title">2 unsafe &amp; 9 unknown ingredients flagged</div>
          <div class="dash-callout-sub">Titanium Dioxide, Red 40 detected across 3 products.</div>
        </div>
        <button class="dash-callout-btn" type="button" data-dash-action="review-flagged">Review flagged<span class="material-icons">arrow_outward</span></button>
      </div>
      <button class="dash-report-link" type="button" data-dash-action="gras-report">
        <span class="dash-report-left"><span class="material-icons">description</span>View &amp; export the full Brand GRAS Report</span>
        <span class="material-icons">arrow_outward</span>
      </button>
    </section>`;
}

function ratingLabel(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Needs work';
}

function renderWisescore(d) {
  const w = d.wisescore;
  const rating = ratingLabel(w.average);
  const badgeMod = w.average >= 85 ? 'excellent' : 'good';
  const pillars = w.pillars
    .map(
      (p) => `
      <div class="dash-pillar-row">
        <span class="dash-pillar-name"><span class="material-icons" style="color:${p.color}">${esc(p.icon)}</span>${esc(p.name)}</span>
        <div class="dash-pillar-track"><div class="dash-pillar-fill" style="width:${p.score}%;background:${p.color}"></div></div>
        <span class="dash-pillar-score">${p.score}</span>
      </div>`
    )
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
  const cards = d.pillars
    .map((p) => {
      const rating = ratingLabel(p.score);
      const metrics = p.metrics
        .map((m) => {
          const color = metricColor(m.value);
          return `
          <div class="dash-metric-item">
            <span class="dash-dot dash-metric-dot" style="background:${color}"></span>
            <span class="dash-metric-name">${esc(m.name)}</span>
            <span class="dash-metric-val" style="color:${color}">${m.value}</span>
            <div class="dash-metric-track"><div class="dash-metric-fill" style="width:${m.value}%;background:${color}"></div></div>
          </div>`;
        })
        .join('');
      return `
        <article class="dash-pillar-card">
          <div class="dash-pillar-card-head">
            <div class="dash-score-num">
              <span class="n">${p.score}</span><span class="d">/100</span>
              <span class="dash-score-cap"><strong>${esc(rating)}</strong><br>${esc(p.name)}</span>
            </div>
          </div>
          <div class="dash-metric-list">${metrics}</div>
        </article>`;
    })
    .join('');
  return `<section class="dash-three-up">${cards}</section>`;
}

function renderFooter() {
  return `
    <section class="dash-card" style="padding:14px 20px;">
      <button class="dash-report-link" type="button" data-dash-action="insights-report" style="margin:0;padding:0;border:none;">
        <span class="dash-report-left"><span class="material-icons">description</span>View &amp; export the full WISEcode Insights report — every metric, distribution &amp; flagged SKU across all 3 pillars</span>
        <span class="material-icons">arrow_outward</span>
      </button>
    </section>`;
}

/**
 * Render the dashboard into the given scroll host element.
 * @param {HTMLElement} host  typically #agent-main-scroll
 */
export function renderDashboardHome(host) {
  if (!host) return;
  const d = DATA;
  host.innerHTML = `
    ${renderHero(d)}
    <div class="dash">
      ${renderClaim(d)}
      <section class="dash-two-up">
        ${renderUpf(d)}
        ${renderGras(d)}
      </section>
      ${renderPillarCards(d)}
      ${renderFooter()}
    </div>`;

  /* Lightweight interactions: tab toggle + action routing. Real flows can be
     wired later; for now actions route to the WISEowl chat / portfolio. */
  const closeMenus = (except) => {
    host.querySelectorAll('.dash-kebab-menu').forEach((m) => {
      if (m === except) return;
      m.hidden = true;
      const btn = host.querySelector(`.dash-kebab[data-dash-menu="${m.dataset.dashMenuFor}"]`);
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  };

  host.addEventListener('click', (e) => {
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
    /* Full report modal — from the card kebab and the in-card report links. */
    const rep = a.match(/^(upf|gras)-report$/);
    if (rep) {
      openReportModal(rep[1], d);
      return;
    }

    /* Card menu items: share / export / insert into chat. */
    const m = a.match(/^(share|export|chat)-(upf|gras)$/);
    if (m) {
      const [, op, card] = m;
      const label = card === 'upf' ? 'Brand UPF report' : 'Brand GRAS report';
      if (op === 'chat') {
        try { sessionStorage.setItem('wise-chat-insert', `Let's continue on the ${label} — walk me through the ${card.toUpperCase()} scorecard.`); } catch (_) {}
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

    const route = {
      'review-portfolio': 'portfolio.html',
      'claim-skus': 'portfolio.html',
      'ask-ai': 'ai-chat.html',
    }[a];
    if (route) window.location.href = route;
  });

  /* Close any open card menu when clicking outside the dashboard. */
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dash-kebab-wrap')) closeMenus(null);
  });

  setupDonutPopover(host);
}

/* Floating popover on donut-segment hover. Styled to match the navigation
   rail tooltip (#menu-rail-tip): surface chip, hairline border, soft shadow,
   fade + slide in. Position is fixed so it escapes the card's overflow. */
function setupDonutPopover(host) {
  let tip = document.getElementById('dash-donut-tip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'dash-donut-tip';
    tip.setAttribute('role', 'tooltip');
    document.body.appendChild(tip);
  }

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
      <div class="dash-tip-stat"><strong>${esc(value)}</strong><span class="dash-tip-pct">${esc(pct)}%</span></div>`;
    tip.classList.add('is-visible');
  };

  const hide = () => tip.classList.remove('is-visible');

  host.addEventListener('pointerover', (e) => {
    const arc = e.target.closest('.dash-donut-arc');
    if (!arc) return;
    arc.classList.add('is-hover');
    show(arc);
    place(e.clientX, e.clientY);
  });
  host.addEventListener('pointermove', (e) => {
    if (!tip.classList.contains('is-visible')) return;
    if (!e.target.closest('.dash-donut-arc')) return;
    place(e.clientX, e.clientY);
  });
  host.addEventListener('pointerout', (e) => {
    const arc = e.target.closest('.dash-donut-arc');
    if (!arc) return;
    if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.dash-donut-arc') === arc) return;
    arc.classList.remove('is-hover');
    hide();
  });
}
