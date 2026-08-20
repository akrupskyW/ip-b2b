/**
 * Full-screen Page Gallery — static screenshots of every unique HTML page
 * in the Module Directory catalog. Opened from All Modules → Page gallery.
 * Close / Back / Escape return to all-modules.html.
 *
 * Thumbs come from screenshots/_shoot.py output (screenshots/pages__*.png),
 * the same full-page captures taken after load + animation settle. Live
 * iframes are never used here.
 */
import { pageGalleryEntries } from './module-directory-data.js';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function isDark() {
  return document.documentElement.classList.contains('dark');
}

/* _shoot.py names: pages/overview.html → pages__overview.png
   (dark: pages__overview__dark.png). Root marketing files drop the pages__
   prefix: ../marketing-app.html → marketing-app.png. */
function shotStem(href) {
  const path = String(href || '').split('#')[0].split('?')[0];
  if (path.startsWith('../')) return path.slice(3).replace(/\.html$/i, '');
  return 'pages__' + path.replace(/\.html$/i, '');
}

function shotUrl(stem, dark, folder = 'gallery-thumbs') {
  return `../screenshots/${folder}/${stem}${dark ? '__dark' : ''}.png`;
}

/* Ordered fallbacks so a missing dark capture still shows the light shot.
   Prefer cropped gallery thumbs; fall back to the full _shoot.py PNG. */
function shotCandidates(href, dark) {
  const stem = shotStem(href);
  const file = String(href || '').split('/').pop();
  const out = [];
  if (dark) out.push(shotUrl(stem, true));
  out.push(shotUrl(stem, false));
  if (dark) out.push(`../screenshots/${stem}__dark.png`);
  out.push(`../screenshots/${stem}.png`);
  if (file === 'login.html') {
    out.push(shotUrl('pages__login', dark));
    out.push('../screenshots/pages__login-after-signout__' + (dark ? 'dark' : 'light') + '.png');
  }
  return out;
}

function closeGallery() {
  try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    if (ref && ref.origin === location.origin && /all-modules\.html$/i.test(ref.pathname) && history.length > 1) {
      history.back();
      return;
    }
  } catch (e) { /* fall through */ }
  location.assign('all-modules.html#mi-directory');
}

function isMarketingHref(href) {
  const file = String(href || '').split(/[/\\]/).pop() || '';
  return /^marketing-.*\.html$/i.test(file);
}

function cardHTML(m, dimmed) {
  const on = dimmed.has(m.href);
  const marketing = isMarketingHref(m.href);
  return `
    <a class="pg-card${on ? ' is-dimmed' : ''}${marketing ? ' is-marketing' : ''}" href="${esc(m.href)}" aria-label="Open ${esc(m.label)}" data-href="${esc(m.href)}" draggable="true">
      <span class="pg-card-viewport">
        <img class="pg-card-shot" alt="${esc(m.label)}" decoding="async" draggable="false" />
        <button type="button" class="pg-card-eye" data-pg-eye draggable="false" aria-pressed="${on ? 'true' : 'false'}" aria-label="${on ? 'Show thumbnail at full opacity' : 'Dim thumbnail'}">
          <span class="material-symbols-outlined" aria-hidden="true">${on ? 'visibility_off' : 'visibility'}</span>
        </button>
      </span>
      <span class="pg-card-meta">
        <span class="pg-card-name">${esc(m.label)}</span>
        <span class="pg-card-href">${esc(m.href)}</span>
      </span>
    </a>`;
}

function bindShot(img, href) {
  const candidates = shotCandidates(href, isDark());
  let i = 0;
  const tryNext = () => {
    if (i >= candidates.length) {
      img.replaceWith(Object.assign(document.createElement('span'), {
        className: 'pg-card-skip',
        textContent: 'No screenshot yet',
      }));
      return;
    }
    img.src = candidates[i];
    i += 1;
  };
  img.addEventListener('error', tryNext);
  tryNext();
}

/* Drag-to-reorder — same HTML5 DnD pattern as Organizations metrics
   (js/organizations-flow.js) and the All Modules motion demo. Order is
   stored as an array of hrefs so a reload restores the layout. Pages
   that appear later in the catalog (and aren't in the saved list yet)
   append at the end. */
const ORDER_KEY = 'wise-page-gallery-order';
const DIM_KEY = 'wise-page-gallery-dimmed';

function loadOrder() {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    const arr = raw ? JSON.parse(raw) : null;
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch (e) { return []; }
}

function saveOrder(grid) {
  if (!grid) return;
  const hrefs = Array.from(grid.querySelectorAll('.pg-card'))
    .map((c) => c.getAttribute('data-href'))
    .filter(Boolean);
  try { localStorage.setItem(ORDER_KEY, JSON.stringify(hrefs)); } catch (e) { /* quota / private */ }
}

function applyOrder(pages) {
  const order = loadOrder();
  if (!order.length) return pages;
  const byHref = new Map(pages.map((p) => [p.href, p]));
  const out = [];
  const seen = new Set();
  order.forEach((href) => {
    const p = byHref.get(href);
    if (p && !seen.has(href)) { out.push(p); seen.add(href); }
  });
  pages.forEach((p) => { if (!seen.has(p.href)) out.push(p); });
  return out;
}

function loadDimmed() {
  try {
    const raw = localStorage.getItem(DIM_KEY);
    const arr = raw ? JSON.parse(raw) : null;
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch (e) { return new Set(); }
}

function saveDimmed(grid) {
  if (!grid) return;
  const hrefs = Array.from(grid.querySelectorAll('.pg-card.is-dimmed'))
    .map((c) => c.getAttribute('data-href'))
    .filter(Boolean);
  try { localStorage.setItem(DIM_KEY, JSON.stringify(hrefs)); } catch (e) { /* quota / private */ }
}

function setDimmed(card, on) {
  if (!card) return;
  card.classList.toggle('is-dimmed', on);
  const btn = card.querySelector('[data-pg-eye]');
  if (btn) {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Show thumbnail at full opacity' : 'Dim thumbnail');
    const ic = btn.querySelector('.material-symbols-outlined');
    if (ic) ic.textContent = on ? 'visibility_off' : 'visibility';
  }
}

function wireReorder(grid) {
  if (!grid) return;
  let dragEl = null;
  let moved = false;

  grid.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.pg-card');
    if (!card || !grid.contains(card)) return;
    /* Don't start a card-drag from the eye toggle. */
    card.setAttribute('draggable', e.target.closest('[data-pg-eye]') ? 'false' : 'true');
  });

  grid.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.pg-card');
    if (!card || !grid.contains(card)) return;
    dragEl = card;
    moved = false;
    card.classList.add('is-dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', card.getAttribute('data-href') || '');
    }
  });

  grid.addEventListener('dragover', (e) => {
    if (!dragEl) return;
    const card = e.target.closest('.pg-card');
    if (!card || card === dragEl || !grid.contains(card)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const rect = card.getBoundingClientRect();
    const before = (e.clientX - rect.left) < rect.width / 2;
    const dest = before ? card : card.nextSibling;
    if (dest === dragEl || dragEl.nextSibling === dest) return;
    grid.insertBefore(dragEl, dest);
    moved = true;
  });

  grid.addEventListener('drop', (e) => {
    if (!dragEl) return;
    e.preventDefault();
    saveOrder(grid);
  });

  grid.addEventListener('dragend', () => {
    if (dragEl) dragEl.classList.remove('is-dragging');
    if (moved) saveOrder(grid);
    dragEl = null;
    /* Keep `moved` true long enough to swallow the ghost click HTML5 DnD
       fires on the <a>, then clear it so the next real click still opens. */
    if (moved) setTimeout(() => { moved = false; }, 400);
  });

  /* A completed drag still fires click on the <a> — swallow that one so
     rearranging doesn't navigate away. A plain click still opens the page. */
  grid.addEventListener('click', (e) => {
    const eye = e.target.closest('[data-pg-eye]');
    if (eye) {
      e.preventDefault();
      e.stopPropagation();
      const card = eye.closest('.pg-card');
      if (!card) return;
      setDimmed(card, !card.classList.contains('is-dimmed'));
      saveDimmed(grid);
      return;
    }
    if (!moved) return;
    const card = e.target.closest('.pg-card');
    if (!card) return;
    e.preventDefault();
    moved = false;
  });
}

function render() {
  const root = document.getElementById('pg-root');
  if (!root) return;
  const pages = applyOrder(pageGalleryEntries());
  const dimmed = loadDimmed();
  root.innerHTML = `
    <header class="pg-bar">
      <button type="button" class="pg-close" data-pg-close aria-label="Back to All Modules">
        <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
      </button>
      <div class="pg-bar-text">
        <h1 class="pg-title">Page gallery</h1>
        <p class="pg-lede">Static screenshots of every unique screen. Drag to rearrange — the layout is saved. Click a page to open it.</p>
      </div>
      <span class="pg-count" aria-label="${pages.length} pages">${pages.length} pages</span>
      <button type="button" class="pg-close" data-pg-close aria-label="Close gallery">
        <span class="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
    </header>
    <div class="pg-scroll" id="pg-scroll">
      <div class="pg-grid">${pages.map((p) => cardHTML(p, dimmed)).join('')}</div>
    </div>`;

  root.querySelectorAll('[data-pg-close]').forEach((btn) => {
    btn.addEventListener('click', closeGallery);
  });
  root.querySelectorAll('.pg-card').forEach((card) => {
    const img = card.querySelector('.pg-card-shot');
    if (img) bindShot(img, card.getAttribute('data-href'));
  });
  wireReorder(root.querySelector('.pg-grid'));
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    closeGallery();
  }
});

render();
