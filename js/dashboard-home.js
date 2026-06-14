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
        { name: 'Heart Health', value: 76 },
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
    <div class="dash-donut">
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
function heroLogoInner(url) {
  return `
    ${url
      ? `<img src="${esc(url)}" alt="${esc(DATA.brand.name)} logo" loading="lazy" />`
      : `<span class="material-icons dash-hero-logo-ph">add_photo_alternate</span>`}
    <span class="dash-hero-logo-edit" aria-hidden="true"><span class="material-icons">edit</span></span>`;
}

/* Reflect a saved/removed logo onto the hero badge without a full re-render. */
function applyBrandLogo(url) {
  const el = document.getElementById('dash-hero-logo');
  if (!el) return;
  el.classList.toggle('is-empty', !url);
  el.innerHTML = heroLogoInner(url);
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
        <span class="dash-report-stat-val">${esc(s.value).replace(/%$/, '<span class="dash-pct">%</span>')}</span>
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
          <div class="dash-report-pending-sub">Per-product breakdowns, ingredient-level detail and exportable tables will appear here once the report is finalized.</div>
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
  const logo = getBrandLogo();
  return `
    <section class="dash-hero${banner ? ' has-image' : ''}" id="dash-hero">
      <div class="dash-hero-bg" id="dash-hero-bg"${banner ? ` style="background-image:${cssUrl(banner)}"` : ''}></div>
      <div class="dash-hero-pattern" aria-hidden="true">
        ${BUG_WATERMARK_SVG.replace('dash-cta-bug', 'dash-hero-bug dash-hero-bug--right')}
        ${BUG_WATERMARK_SVG.replace('dash-cta-bug', 'dash-hero-bug dash-hero-bug--left')}
      </div>
      <div class="dash-hero-scrim" aria-hidden="true"></div>
      <button class="dash-hero-logo${logo ? '' : ' is-empty'}" id="dash-hero-logo" type="button" data-dash-action="edit-logo" title="Update brand logo" aria-label="Update brand logo">
        ${heroLogoInner(logo)}
      </button>
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
  const wsTone = scoreTierTone(ws) === 'excellent' ? 'excellent' : 'good';
  const upfTone = d.upf.pct >= 85 ? 'excellent' : 'good';
  const grasTone = d.gras.pct >= 85 ? 'excellent' : 'good';
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

function renderClaim(d) {
  const c = d.claim;
  const u = d.upf;
  return `
    <section class="dash-claim">
      <div class="dash-claim-col">
        <div class="dash-bignum-row">
          ${countUpMarkup(c.discovered, { className: 'dash-bignum' })}
          <span class="dash-bignum-cap"><strong>Products Discovered</strong><br>across retail &amp; distribution</span>
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
            <button class="dash-score-toast-link" type="button" data-dash-action="verify-upf">Start verification<span class="material-icons dash-score-toast-link-arrow">arrow_outward</span></button>
          </div>
          <button class="dash-score-toast-close" type="button" data-dash-action="dismiss-score-toast" aria-label="Dismiss"><span class="material-icons">close</span></button>
        </div>` : ''}
        <div class="dash-bignum-row">
          ${countUpMarkup(u.nonCount, { className: 'dash-bignum' })}
          <span class="dash-bignum-cap"><strong>Products Qualify</strong><br>for Non&#8209;UPF verification shield</span>
        </div>
        <div class="dash-btn-row">
          <button class="dash-btn dash-btn--primary" type="button" data-dash-action="verify-upf"><span class="material-icons">verified</span>Start verification</button>
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
        <h3 class="dash-card-title"><span class="dash-term" data-tip="Generally Recognized As Safe" tabindex="0" role="term">GRAS</span> status across ${g.total} analyzed products</h3>
        ${cardMenu('gras', 'Brand GRAS report')}
      </div>
      <div class="dash-donut-row">
        ${doubleDonut(g.split, g.distribution, `${g.pct}%`, 'is-teal', 'GRAS', `${g.grasCount} of ${g.total} products`, ['Health status', 'GRAS level'])}
        <div class="dash-donut-legends">
          ${legendGroup('Health status', g.split)}
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
   source of truth for the rating label and the hover popover on the status
   word in the pillars heading. */
const STATUS_TIERS = [
  { label: 'Excellent', min: 80, range: '80–100', tone: 'excellent', desc: 'Top-tier food quality — strong nutrition, clean ingredients, and healthy long-term outcomes.' },
  { label: 'Good', min: 60, range: '60–79', tone: 'good', desc: 'Solid, well-rounded products with only minor areas left to improve.' },
  { label: 'Fair', min: 40, range: '40–59', tone: 'fair', desc: 'Acceptable overall, but with clear weaknesses in one or more pillars.' },
  { label: 'Poor', min: 20, range: '20–39', tone: 'poor', desc: 'Notable concerns across processing level, ingredients, or nutrient density.' },
  { label: 'Critical', min: 0, range: '0–19', tone: 'critical', desc: 'Serious issues — heavily processed or carrying high-risk ingredients.' },
];

const SCORE_TIER_COLORS = {
  excellent: { fill: '#38a865', core: '#e8ffe2' },
  good: { fill: '#6aab58', core: '#d4f0c8' },
  fair: { fill: '#c4a032', core: '#fff0a0' },
  poor: { fill: '#c46832', core: '#ffc090' },
  critical: { fill: '#9e2830', core: '#ffb4b4' },
};

function scoreTierTone(score) {
  return (STATUS_TIERS.find((t) => score >= t.min) || STATUS_TIERS[STATUS_TIERS.length - 1]).tone;
}

/* WISEscore health bar with animated fill + score — sits under the pillars headline. */
function wisescoreHealthBar(score) {
  const color = metricColor(score);
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
   definitions on hover/focus. The tier matching the current score is marked. */
function statusTerm(score) {
  const current = ratingLabel(score);
  const rows = STATUS_TIERS.map((t) => `
        <div class="dash-status-tip-row${t.label === current ? ' is-current' : ''}">
          <div class="dash-status-tip-line">
            <span class="dash-status-tip-dot dash-status-tip-dot--${t.tone}"></span>
            <span class="dash-status-tip-label">${esc(t.label)}</span>
            <span class="dash-status-tip-range">${esc(t.range)}</span>
          </div>
          <p class="dash-status-tip-desc">${esc(t.desc)}</p>
        </div>`).join('');
  return `<span class="dash-status-term" tabindex="0" role="button" aria-label="WISEscore status definitions">${esc(current)}<span class="dash-status-tip" role="tooltip"><span class="dash-status-tip-head">WISEscore status scale</span>${rows}</span></span>`;
}

function renderWisescore(d) {
  const w = d.wisescore;
  const rating = ratingLabel(w.average);
  const badgeMod = scoreTierTone(w.average) === 'excellent' ? 'excellent' : 'good';
  const pillars = w.pillars
    .map(
      (p) => `
      <div class="dash-pillar-row">
        <span class="dash-pillar-name"><span class="material-icons" style="color:${p.color}">${esc(p.icon)}</span>${esc(p.name)}</span>
        <div class="dash-pillar-track" style="--bar-color:${p.color}"><div class="dash-pillar-fill" style="width:${p.score}%;background:${p.color}"></div></div>
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
  const renderCard = (p) => {
    const rating = ratingLabel(p.score);
    const metrics = p.metrics
      .map((m) => {
        const color = metricColor(m.value);
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
      <section class="dash-two-up" id="dash-charts">
        ${renderUpf(d)}
        ${renderGras(d)}
      </section>
      ${renderPillarCards(d)}
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

    /* Brand logo badge → open the shared image editor scoped to the logo. */
    if (a === 'edit-logo') {
      editBrandLogo();
      return;
    }

    /* Dismiss the celebratory WISEscore toast. Not persisted — it returns on
       reload, and only disappears for the current view when closed. */
    if (a === 'dismiss-score-toast') {
      action.closest('.dash-score-toast')?.remove();
      return;
    }

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

    /* Smooth-scroll down to the WISEscore pillars section. */
    if (a === 'scroll-pillars') {
      const target = host.querySelector('.dash-pillars-section');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const route = {
      'review-portfolio': 'portfolio.html',
      'add-food': 'portfolio.html',
      'dispute-upc': 'portfolio.html',
      'claim-upcs': 'portfolio.html',
      'verify-upf': 'portfolio.html',
      'ask-ai': 'ai-chat.html',
    }[a];
    if (route) window.location.href = route;
  });

  /* Close any open card menu when clicking outside the dashboard. */
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dash-kebab-wrap')) closeMenus(null);
  });

  setupChartPressGuard(host);
  setupDonutPopover(host);
  setupChartAnimations(host);
}

/* Easing helper for count-up and bar animations. */
function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function countUpEl(el, duration = 1800) {
  if (el.classList.contains('is-counted')) return;
  const to = parseInt(el.getAttribute('data-count-to'), 10);
  if (!Number.isFinite(to)) return;
  el.classList.add('is-counted');
  const suffix = el.getAttribute('data-count-suffix') || '';
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
}

const CHART_GAUGE_SWEEP_MS = 1400;
const CHART_BAR_STAGGER_MS = 90;

/* Selectors for chart surfaces that are display-only (hover popover on donuts
   is the sole interaction). Presses must not re-fire entrance animations. */
const CHART_PRESS_SEL = '.dash-donut-svg, .dash-ws-health-bar, .dash-metric-track, .dash-metric-fill';

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

/* Swallow pointerdown/click on chart surfaces (capture phase) so a press cannot
   re-trigger entrance animations or the dashboard's content click handler. */
function setupChartPressGuard(host) {
  const swallowPress = (e) => {
    if (!e.target.closest(CHART_PRESS_SEL)) return;
    e.preventDefault();
    e.stopPropagation();
  };
  host.addEventListener('pointerdown', swallowPress, true);
  host.addEventListener('click', swallowPress, true);
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
      }
      observer.unobserve(el);
    });
  }, { root: host, threshold: 0.25 });

  const claimSection = host.querySelector('.dash-claim');
  if (claimSection) observer.observe(claimSection);
  host.querySelectorAll('.dash-donut-card').forEach((card) => observer.observe(card));
  const pillarHeading = host.querySelector('.dash-pillars-heading');
  if (pillarHeading) observer.observe(pillarHeading);
  const pillarSection = host.querySelector('.dash-pillars');
  if (pillarSection) observer.observe(pillarSection);
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
      <div class="dash-tip-stat"><strong>${esc(value)}</strong><span class="dash-tip-pct">${esc(pct)}<span class="dash-pct">%</span></span></div>`;
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
