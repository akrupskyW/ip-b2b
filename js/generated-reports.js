/**
 * Reports generated from the WISEcodeAI Output panel ("Generate Report").
 * Shared by wiseai.html (writes) and reports.html (the first shelf).
 */
const KEY = 'wise-generated-reports';
const MAX = 40;

const SEED = [
  {
    id: 'seed-kraft-upf',
    title: 'Kraft UPF verification',
    items: [
      '% Share by WISEcode UPF Verification',
      'Kraft UPF breakdown by category',
      'Kraft vs Kraft Heinz',
    ],
    conversation: 'How ultra-processed is Kraft?',
    icon: 'analytics',
    createdAt: Date.parse('2026-08-21T16:20:00-07:00'),
  },
  {
    id: 'seed-sweeteners',
    title: 'Artificial sweeteners · energy drinks',
    items: [
      'GRAS status · artificial sweeteners',
      'Artificial sweetener use by UPF tier · energy drinks',
      'Artificial vs natural sweeteners · by PL level',
      'Sweetener use vs UPF tier · heatmap',
    ],
    conversation: 'Which energy drinks use artificial sweeteners?',
    icon: 'science',
    createdAt: Date.parse('2026-08-18T11:05:00-07:00'),
  },
  {
    id: 'seed-protein',
    title: 'Protein bars · Non-UPF share',
    items: [
      'Top brands in protein bars',
      'Non-UPF share · protein bars',
      'Protein bars vs granola bars',
    ],
    conversation: 'Compare protein bars to granola bars',
    icon: 'nutrition',
    createdAt: Date.parse('2026-08-12T14:40:00-07:00'),
  },
  {
    id: 'seed-wisescore',
    title: 'Top brands by WISEscore',
    items: [
      'Top three brands by foods in the top half of WISEscore',
      'Foods with WISEscore 50 or higher, by brand',
      'WISEcode UPF label · top three brands',
    ],
    conversation: 'Which brands land in the top half of WISEscore?',
    icon: 'stacked_bar_chart',
    createdAt: Date.parse('2026-08-08T09:15:00-07:00'),
  },
];

const BUG_SVG = `<svg class="rp-poster-bug" viewBox="0 0 193 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M10.9834 35.6522C10.9834 35.6522 3.30615 47.7494 3.30615 58.0481C3.30615 81.1921 20.324 99.6409 43.3405 99.9915C51.5363 100.052 60.4175 99.9915 67.533 92.6894C41.5052 92.6894 25.589 73.777 25.589 58.0481C25.589 58.0481 25.2144 45.6894 30.832 35.9526L10.9834 35.6522Z"/><path d="M83.8241 14.7368C90.9396 14.7368 94.8008 22.7337 96.3699 29.2111H96.5571C98.1262 22.7337 101.987 14.7368 109.103 14.7368H170.521C175.169 14.7368 175.169 12.8643 175.169 7.32269C175.169 2.80876 178.108 0 182.131 0H189.384V14.7368C189.384 27.7131 182.131 28.5339 174.794 28.5339L160.347 28.583H118.091C113.597 28.583 113.335 29.2111 111.537 33.7051C110.051 37.4206 96.5571 73.0277 96.5571 73.0277H96.3699C96.3699 73.0277 82.8761 37.4206 81.3899 33.7051C79.5923 29.2111 79.3301 28.583 74.8361 28.583H32.5803L18.133 28.5339C10.7965 28.5339 3.54341 27.7131 3.54341 14.7368V0H10.7965C14.5415 0 17.7585 3.37051 17.7585 7.32269C17.7585 12.8643 17.7585 14.7368 22.406 14.7368H83.8241Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M71.8001 35.9523C74.4284 35.9523 74.6161 37.2826 75.1793 38.6953L87.9434 71.5913C82.9358 80.6013 74.4289 85.7609 63.9558 85.7609C48.1132 85.7608 33.2662 72.7999 33.2663 54.6695C33.2664 48.2288 34.5088 40.1469 39.2583 35.9523H71.8001ZM63.486 44.5345C58.3905 44.5345 54.2598 48.6005 54.2598 54.0781C54.2598 59.5557 58.3905 63.6217 63.486 63.6217C68.5814 63.6216 72.7122 59.5556 72.7122 54.0781C72.7122 48.6005 68.5814 44.5346 63.486 44.5345Z"/><path d="M181.756 35.6522C181.756 35.6522 189.433 47.7494 189.433 58.0481C189.433 81.1921 172.416 99.6409 149.399 99.9915C141.203 100.052 132.322 99.9915 125.206 92.6894C151.234 92.6894 167.151 73.777 167.151 58.0481C167.151 58.0481 167.525 45.6894 161.908 35.9526L181.756 35.6522Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M120.94 35.9523C118.311 35.9523 118.124 37.2826 117.56 38.6953L104.796 71.5913C109.804 80.6013 118.311 85.7609 128.784 85.7609C144.626 85.7608 159.473 72.7999 159.473 54.6695C159.473 48.2288 158.231 40.1469 153.481 35.9523H120.94ZM129.254 44.5345C134.349 44.5345 138.48 48.6005 138.48 54.0781C138.48 59.5557 134.349 63.6217 129.254 63.6217C124.158 63.6216 120.027 59.5556 120.027 54.0781C120.027 48.6005 124.158 44.5346 129.254 44.5345Z"/></svg>`;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function readRaw() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))); } catch (_) {}
}

function normalize(rec) {
  if (!rec || !rec.id) return null;
  return {
    id: String(rec.id),
    title: String(rec.title || 'Untitled report').trim() || 'Untitled report',
    items: Array.isArray(rec.items) ? rec.items.map((t) => String(t || '').trim()).filter(Boolean) : [],
    conversation: String(rec.conversation || '').trim(),
    icon: String(rec.icon || 'analytics'),
    source: String(rec.source || 'output'),
    href: String(rec.href || ''),
    createdAt: Number(rec.createdAt) || Date.now(),
    updatedAt: Number(rec.updatedAt) || Number(rec.createdAt) || Date.now(),
  };
}

function ensureSeed() {
  let list = readRaw();
  if (list === null) {
    list = SEED.map((s) => normalize({ ...s, source: 'output' })).filter(Boolean);
    write(list);
  }
  return list.map(normalize).filter(Boolean);
}

export function listGeneratedReports() {
  return ensureSeed().slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function getGeneratedReport(id) {
  if (!id) return null;
  return listGeneratedReports().find((r) => r.id === id) || null;
}

export function saveGeneratedReport(partial) {
  const list = ensureSeed();
  const now = Date.now();
  const incoming = normalize({
    id: partial && partial.id ? partial.id : ('rpt-' + now),
    title: (partial && partial.title) || 'Untitled report',
    items: (partial && partial.items) || [],
    conversation: (partial && partial.conversation) || '',
    icon: (partial && partial.icon) || 'analytics',
    source: (partial && partial.source) || 'output',
    href: (partial && partial.href) || '',
    createdAt: (partial && partial.createdAt) || now,
    updatedAt: now,
  });
  const idx = list.findIndex((r) => r.id === incoming.id);
  if (idx >= 0) {
    incoming.createdAt = list[idx].createdAt;
    list[idx] = incoming;
  } else {
    list.unshift(incoming);
  }
  write(list);
  return incoming;
}

export function updateGeneratedReport(id, patch) {
  const list = ensureSeed();
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const next = normalize({ ...list[idx], ...patch, id, updatedAt: Date.now() });
  list[idx] = next;
  write(list);
  return next;
}

export function formatReportDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function itemCountLabel(n, source) {
  if (source === 'reformulation') return n === 1 ? '1 section' : `${n} sections`;
  return n === 1 ? '1 chart' : `${n} charts`;
}

function cardHTML(rec) {
  const n = rec.items.length;
  const preview = rec.items.slice(0, 2).join(' · ') || rec.conversation || (rec.source === 'reformulation' ? 'Generated from Reformulation.' : 'Generated from Output.');
  const desc = n ? `${itemCountLabel(n, rec.source)} · ${preview}` : preview;
  return `<a class="rp-card" href="#" data-rp-gen="${esc(rec.id)}">
    <div class="rp-poster tone-gen">
      ${BUG_SVG}
      <span class="rp-poster-icon"><span class="material-symbols-outlined">${esc(rec.icon || 'analytics')}</span></span>
      <span class="rp-badge">Generated</span>
      <span class="rp-poster-open"><span class="material-symbols-outlined">north_east</span></span>
    </div>
    <div class="rp-body">
      <div class="rp-name">${esc(rec.title)}</div>
      <p class="rp-desc">${esc(desc)}</p>
      <div class="rp-foot rp-foot-split">
        <span class="rp-date">${esc(formatReportDate(rec.createdAt))}</span>
        <span class="rp-view">View Report<span class="material-symbols-outlined">north_east</span></span>
      </div>
    </div>
  </a>`;
}

function emptyHTML() {
  return `<div class="rp-card rp-gen-empty" aria-live="polite">
    <div class="rp-poster tone-gen">
      ${BUG_SVG}
      <span class="rp-poster-icon"><span class="material-symbols-outlined">analytics</span></span>
      <span class="rp-badge">Generated</span>
    </div>
    <div class="rp-body">
      <div class="rp-name">No generated reports yet</div>
      <p class="rp-desc">Pick charts in the Output panel and tap Generate Report. They’ll land here.</p>
      <div class="rp-foot"><a class="rp-view" href="wiseai.html">Open WISEcodeAI<span class="material-symbols-outlined">north_east</span></a></div>
    </div>
  </div>`;
}

function viewHTML(rec) {
  const n = rec.items.length;
  const fromReform = rec.source === 'reformulation';
  const items = rec.items.length
    ? `<ol class="rp-gen-outputs">${rec.items.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>`
    : `<p class="rp-desc">This report doesn’t list individual ${fromReform ? 'sections' : 'charts'} yet.</p>`;
  const from = rec.conversation
    ? (fromReform
      ? `Generated from Reformulation · “${esc(rec.conversation)}”.`
      : `Generated from Output in “${esc(rec.conversation)}”.`)
    : (fromReform
      ? 'Generated from the Reformulation dashboard.'
      : 'Generated from the Output panel in WISEcodeAI.');
  const openHref = rec.href || 'wiseai.html';
  const openLabel = fromReform ? 'Open in Reformulation' : 'Open in WISEcodeAI';
  const openIcon = fromReform ? 'auto_fix_high' : 'auto_awesome';
  const eyebrow = fromReform ? 'Generated from Reformulation' : 'Generated from Output';
  return `<section class="dash-report-view" aria-label="${esc(rec.title)}">
    <header class="dash-report-view-head">
      <button class="wise-btn wise-btn--ghost dash-report-back" type="button" data-rp-gen-back>
        <span class="material-symbols-outlined">arrow_back</span>Back to reports
      </button>
      <div class="dash-report-view-titles">
        <span class="wise-modal-eyebrow">${eyebrow}</span>
        <h2 class="wise-modal-title">${esc(rec.title)}</h2>
      </div>
      <a class="wise-btn wise-btn--primary" href="${esc(openHref)}">
        <span class="material-symbols-outlined">${openIcon}</span>${openLabel}
      </a>
    </header>
    <div class="dash-report-view-body">
      <p class="dash-report-summary">${esc(itemCountLabel(n, rec.source))} · ${esc(formatReportDate(rec.createdAt))}</p>
      <p class="rp-gen-lede">${from}</p>
      ${items}
    </div>
  </section>`;
}

function renderGrid(gridEl) {
  const list = listGeneratedReports();
  gridEl.innerHTML = list.length ? list.map(cardHTML).join('') : emptyHTML();
}

/** Open a generated report in the Reports scroll host (used by app search). */
export function openGeneratedReportView(id, hostEl) {
  const host = hostEl || document.getElementById('agent-main-scroll');
  const rec = getGeneratedReport(id);
  if (!host || !rec) return false;
  if (host._rpGenRestore == null) host._rpGenRestore = host.innerHTML;
  host.innerHTML = viewHTML(rec);
  host.scrollTop = 0;
  return true;
}

export function mountGeneratedReportsShelf(opts) {
  const host = (opts && opts.scrollHost) || document.getElementById('agent-main-scroll');
  const gridEl = (opts && opts.grid) || document.getElementById('rp-generated-grid');
  if (gridEl) renderGrid(gridEl);
  if (!host) return;

  const tryPending = () => {
    try {
      const pending = sessionStorage.getItem('wise-search-open-report');
      if (pending) {
        sessionStorage.removeItem('wise-search-open-report');
        openGeneratedReportView(pending, host);
        return;
      }
    } catch (_) { /* sessionStorage blocked */ }
    try {
      const q = new URLSearchParams(location.search).get('gen');
      if (q) openGeneratedReportView(q, host);
    } catch (_) { /* ignore */ }
  };

  if (host._rpGenBound) {
    tryPending();
    return;
  }
  host._rpGenBound = true;
  host.addEventListener('click', (e) => {
    const back = e.target.closest('[data-rp-gen-back]');
    if (back && host.contains(back)) {
      e.preventDefault();
      if (host._rpGenRestore == null) return;
      host.innerHTML = host._rpGenRestore;
      host._rpGenRestore = null;
      host.scrollTop = 0;
      const grid = document.getElementById('rp-generated-grid');
      if (grid) renderGrid(grid);
      return;
    }
    const card = e.target.closest('[data-rp-gen]');
    if (!card || !host.contains(card)) return;
    e.preventDefault();
    const rec = getGeneratedReport(card.getAttribute('data-rp-gen'));
    if (!rec) return;
    openGeneratedReportView(rec.id, host);
  });

  if (!host._rpGenSearchBound) {
    host._rpGenSearchBound = true;
    document.addEventListener('wise:open-generated-report', (ev) => {
      const id = ev.detail && ev.detail.id;
      if (id) openGeneratedReportView(id, host);
    });
  }
  tryPending();
}
