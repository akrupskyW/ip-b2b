/**
 * Full-screen Page Gallery shows a live preview of every unique HTML page
 * so the wall stays current with the real screens — helix, chrome, and all.
 *
 * Opened from All Modules → Page gallery. Close / Back / Escape return
 * to all-modules.html.
 *
 * Each card lazy-loads the real page in a scaled iframe when it scrolls
 * into view. A leftover screenshot sits underneath as a placeholder until
 * that preview lands. Re-evaluate walks every HTML page, adds anything
 * the catalog does not already list, and remounts the visible previews
 * so they cannot sit on a stale load. Opening the gallery (and coming
 * back to the tab) also does a quiet directory listing.
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

/* Same omitted set as All Modules — this viewer and the pitch deck are
   not product modules and must never card themselves. */
const OMITTED_PAGES = {
  'app-vision-deck.html': 'Standalone pitch deck — kept out of the module index on purpose.',
  'page-gallery.html': 'Full-screen page gallery launched from the Module Directory — not a product module.',
};

const ORDER_KEY = 'wise-page-gallery-order';
const DIM_KEY = 'wise-page-gallery-dimmed';
const EXTRAS_KEY = 'wise-page-gallery-extras';
const REEVAL_STORE_KEY = 'wise-pg-reeval';
const REEVAL_FETCH_MS = 30000;
const REEVAL_BUDGET_MS = 90000;
const REEVAL_CONCURRENCY = 6;

function reevalBudgetLabel() {
  return Math.round(REEVAL_BUDGET_MS / 1000) + ' seconds';
}

function isAbortError(err, signal) {
  return !!(err && err.name === 'AbortError') || !!(signal && signal.aborted);
}

let scanBusy = false;
let scanModalEl = null;
let isDragging = false;
let shotBust = '';
let quietTimer = null;

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
  const withBust = (url) => {
    if (!shotBust) return url;
    return url + (url.includes('?') ? '&' : '?') + 'pg=' + shotBust;
  };
  const out = [];
  if (dark) out.push(shotUrl(stem, true));
  out.push(shotUrl(stem, false));
  if (dark) out.push(`../screenshots/${stem}__dark.png`);
  out.push(`../screenshots/${stem}.png`);
  if (file === 'login.html') {
    out.push(shotUrl('pages__login', dark));
    out.push('../screenshots/pages__login-after-signout__' + (dark ? 'dark' : 'light') + '.png');
  }
  return out.map(withBust);
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

function pageFileName(href) {
  return String(href || '').split('#')[0].split('?')[0].split('/').pop();
}

/* Same-origin preview. `preview=1` keeps auth screens from bouncing a
   logged-in visitor to the landing page. Cache-bust after Re-evaluate. */
function previewSrc(href) {
  if (!href || href === '#') return '';
  const file = pageFileName(href);
  if (file === 'page-gallery.html') return '';
  const [path, hash = ''] = String(href).split('#');
  const sep = path.indexOf('?') === -1 ? '?' : '&';
  const bust = shotBust ? '&pg=' + encodeURIComponent(shotBust) : '';
  return `${path}${sep}preview=1${bust}${hash ? '#' + hash : ''}`;
}

function cardHTML(m, dimmed) {
  const on = dimmed.has(m.href);
  const marketing = isMarketingHref(m.href);
  const badge = m.badge ? `<span class="pg-card-badge">${esc(m.badge)}</span>` : '';
  const live = previewSrc(m.href);
  const frame = live
    ? `<iframe class="pg-card-frame" data-src="${esc(live)}" title="" tabindex="-1" aria-hidden="true"></iframe>`
    : '';
  return `
    <a class="pg-card${on ? ' is-dimmed' : ''}${marketing ? ' is-marketing' : ''}" href="${esc(m.href)}" aria-label="Open ${esc(m.label)}" data-href="${esc(m.href)}" draggable="true">
      <span class="pg-card-viewport">
        <img class="pg-card-shot" alt="${esc(m.label)}" decoding="async" draggable="false" />
        ${frame}
        <button type="button" class="pg-card-eye" data-pg-eye draggable="false" aria-pressed="${on ? 'true' : 'false'}" aria-label="${on ? 'Show thumbnail at full opacity' : 'Dim thumbnail'}">
          <span class="material-symbols-outlined" aria-hidden="true">${on ? 'visibility_off' : 'visibility'}</span>
        </button>
      </span>
      <span class="pg-card-meta">
        <span class="pg-card-name">${esc(m.label)}${badge ? ' ' + badge : ''}</span>
        <span class="pg-card-href">${esc(m.href)}</span>
      </span>
    </a>`;
}

function bindShot(img, href) {
  const candidates = shotCandidates(href, isDark());
  let i = 0;
  const tryNext = () => {
    if (i >= candidates.length) {
      img.hidden = true;
      return;
    }
    img.src = candidates[i];
    i += 1;
  };
  img.addEventListener('error', tryNext);
  tryNext();
}

/* Live previews — one real page per card, scaled into the 16:10 viewport.
   Load at most a few at a time; drop the iframe when the card has been
   off-screen for a couple of seconds so this wall does not boot every
   screen in the catalog at once. */
const LIVE_LIMIT = 3;
let liveInflight = 0;
const liveQueue = [];
const liveUnloadTimers = new WeakMap();
let liveObserver = null;

function resetLiveObserver() {
  if (liveObserver) {
    liveObserver.disconnect();
    liveObserver = null;
  }
  if (observeFrameScales._ro) {
    observeFrameScales._ro.disconnect();
    observeFrameScales._ro = null;
  }
  liveQueue.length = 0;
  liveInflight = 0;
}

function ensureLiveObserver() {
  if (liveObserver) return liveObserver;
  const root = document.getElementById('pg-scroll');
  liveObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const frame = e.target;
      const pending = liveUnloadTimers.get(frame);
      if (pending) {
        clearTimeout(pending);
        liveUnloadTimers.delete(frame);
      }
      if (e.isIntersecting) enqueueLive(frame);
      else {
        const wait = setTimeout(() => {
          liveUnloadTimers.delete(frame);
          if (frame.isConnected) unloadLive(frame);
        }, 2800);
        liveUnloadTimers.set(frame, wait);
      }
    });
  }, { root: root || null, rootMargin: '360px 0px', threshold: 0.01 });
  return liveObserver;
}

function enqueueLive(frame) {
  if (!frame || frame.dataset.live === '1' || frame.dataset.queued === '1') return;
  if (!frame.getAttribute('data-src')) return;
  frame.dataset.queued = '1';
  liveQueue.push(frame);
  pumpLive();
}

function pumpLive() {
  while (liveInflight < LIVE_LIMIT && liveQueue.length) {
    const frame = liveQueue.shift();
    if (!frame || !frame.isConnected || frame.dataset.live === '1') continue;
    startLive(frame);
  }
}

function startLive(frame) {
  const src = frame.getAttribute('data-src');
  if (!src) return;
  liveInflight += 1;
  frame.dataset.live = '1';
  const done = () => {
    liveInflight = Math.max(0, liveInflight - 1);
    pumpLive();
  };
  const ok = () => {
    const card = frame.closest('.pg-card');
    if (card) card.classList.add('is-live');
    frame.removeEventListener('load', ok);
    frame.removeEventListener('error', fail);
    done();
  };
  const fail = () => {
    frame.removeEventListener('load', ok);
    frame.removeEventListener('error', fail);
    frame.dataset.live = '';
    delete frame.dataset.queued;
    done();
  };
  frame.addEventListener('load', ok, { once: true });
  frame.addEventListener('error', fail, { once: true });
  frame.src = src;
}

function unloadLive(frame) {
  if (!frame.getAttribute('src')) return;
  const card = frame.closest('.pg-card');
  if (card) card.classList.remove('is-live');
  frame.removeAttribute('src');
  frame.dataset.live = '';
  delete frame.dataset.queued;
}

function syncFrameScale(viewport) {
  if (!viewport) return;
  const w = viewport.clientWidth;
  if (w) viewport.style.setProperty('--pg-scale', String(w / 1440));
}

function observeFrameScales(scope) {
  const boxes = (scope || document).querySelectorAll('.pg-card-viewport');
  if (!boxes.length) return;
  if (typeof ResizeObserver === 'undefined') {
    boxes.forEach(syncFrameScale);
    return;
  }
  if (!observeFrameScales._ro) {
    observeFrameScales._ro = new ResizeObserver((entries) => {
      entries.forEach((e) => syncFrameScale(e.target));
    });
  }
  boxes.forEach((box) => {
    syncFrameScale(box);
    observeFrameScales._ro.observe(box);
  });
}

function observeLiveFrames(scope) {
  const obs = ensureLiveObserver();
  (scope || document).querySelectorAll('.pg-card-frame[data-src]').forEach((f) => {
    obs.observe(f);
  });
}

function bindCards(scope) {
  (scope || document).querySelectorAll('.pg-card').forEach((card) => {
    const img = card.querySelector('.pg-card-shot');
    if (img) bindShot(img, card.getAttribute('data-href'));
  });
  observeLiveFrames(scope);
  observeFrameScales(scope);
}

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
    isDragging = true;
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
    isDragging = false;
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

/* ------------------------------------------------------------------ */
/* Live page set — catalog + extras discovered by Re-evaluate / quiet  */
/* listing. First occurrence of a path wins, same as pageGalleryEntries. */
/* ------------------------------------------------------------------ */

function pagePathOnly(href) {
  return String(href || '').split('#')[0].split('?')[0];
}

function canonicalPageHref(href) {
  const path = pagePathOnly(href).replace(/^\.\//, '');
  const name = path.split('/').filter(Boolean).pop() || '';
  if (!/\.html$/i.test(name)) return '';
  if (path.startsWith('../') || path.startsWith('/')) {
    if (/\/pages\//.test(path)) return name;
    return '../' + name;
  }
  return name;
}

function labelFromPath(href) {
  const name = canonicalPageHref(href).replace(/^\.\.\//, '').replace(/\.html$/i, '');
  return name.split(/[-_]+/).filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || href;
}

function titleFromHtml(text, fallback) {
  const m = String(text || '').match(/<title[^>]*>([^<]+)<\/title>/i);
  if (!m) return fallback;
  return m[1].replace(/^WISE(?:codeAI)?\s*[·•\-–]\s*/i, '').trim() || fallback;
}

function isDirListing(html) {
  return /Directory listing/i.test(html) || /<title>\s*Index of/i.test(html);
}

function hrefsFromListing(html, kind) {
  const out = [];
  const re = /href=["']([^"'#?]+?\.html)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const name = m[1].split('/').pop();
    if (!name || name.startsWith('_') || name.startsWith('.')) continue;
    if (kind === 'pages') out.push(name);
    else if (name === 'index.html' || name.startsWith('marketing-')) out.push('../' + name);
  }
  return out;
}

function catalogHrefSet() {
  const set = new Set();
  pageGalleryEntries().forEach((m) => {
    const key = canonicalPageHref(m.href);
    if (key) set.add(key);
  });
  return set;
}

function localDayIso(d) {
  const x = d || new Date();
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
}

function readReevalStore() {
  try { return JSON.parse(localStorage.getItem(REEVAL_STORE_KEY) || '{}') || {}; }
  catch { return {}; }
}

function writeReevalStore(patch) {
  const next = Object.assign({}, readReevalStore(), patch);
  try { localStorage.setItem(REEVAL_STORE_KEY, JSON.stringify(next)); } catch (_) { /* quota / private */ }
}

function loadExtras() {
  try {
    const raw = localStorage.getItem(EXTRAS_KEY);
    const arr = raw ? JSON.parse(raw) : null;
    return Array.isArray(arr) ? arr.filter((p) => p && p.href) : [];
  } catch (e) { return []; }
}

function saveExtras(list) {
  const catalog = catalogHrefSet();
  const cleaned = [];
  const seen = new Set();
  (list || []).forEach((p) => {
    const key = canonicalPageHref(p && p.href);
    if (!key || catalog.has(key) || OMITTED_PAGES[key] || seen.has(key)) return;
    seen.add(key);
    cleaned.push({
      href: key,
      label: p.label || labelFromPath(key),
      icon: p.icon || 'web',
      area: p.area || 'unaccounted',
      areaTitle: p.areaTitle || 'Unaccounted',
      badge: p.badge || 'New',
    });
  });
  try { localStorage.setItem(EXTRAS_KEY, JSON.stringify(cleaned)); } catch (e) { /* quota / private */ }
  return cleaned;
}

function extraAsEntry(p) {
  const href = canonicalPageHref(p.href) || p.href;
  return {
    label: p.label || labelFromPath(href),
    icon: p.icon || 'web',
    href,
    badge: p.badge || 'New',
    area: p.area || 'unaccounted',
    areaTitle: p.areaTitle || 'Unaccounted',
  };
}

function galleryEntries() {
  const catalog = pageGalleryEntries();
  const seen = new Set(catalog.map((p) => canonicalPageHref(p.href)));
  const extras = [];
  loadExtras().forEach((p) => {
    const key = canonicalPageHref(p.href);
    if (!key || seen.has(key) || OMITTED_PAGES[key]) return;
    seen.add(key);
    extras.push(extraAsEntry(p));
  });
  return applyOrder(catalog.concat(extras));
}

function reevalMetaText() {
  const store = readReevalStore();
  if (!store.day) return 'Stays current on open · click Re-evaluate to re-probe every page';
  if (store.day === localDayIso()) return 'Stays current on open · scanned today';
  return 'Stays current on open · last scanned ' + store.day;
}

function paintReevalMeta(root) {
  const el = (root || document).querySelector('[data-pg-reeval-meta]');
  if (el) el.textContent = reevalMetaText();
}

function setReevalStatus(root, kind, title, bodyHtml) {
  const el = (root || document).querySelector('#pg-reeval-status');
  if (!el) return;
  const icons = { busy: 'hourglass_top', ok: 'verified', warn: 'warning', err: 'error' };
  el.hidden = false;
  el.className = 'pg-reeval-status is-' + kind;
  el.innerHTML = `<div class="pg-reeval-status-head"><span class="material-symbols-outlined">${icons[kind] || 'info'}</span><span>${esc(title)}</span></div>${bodyHtml || ''}`;
}

async function fetchText(url, signal) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REEVAL_FETCH_MS);
  const onAbort = () => ctrl.abort();
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timer);
      throw new DOMException('Aborted', 'AbortError');
    }
    signal.addEventListener('abort', onAbort, { once: true });
  }
  try {
    const sep = url.includes('?') ? '&' : '?';
    const res = await fetch(url + sep + 'pg=' + Date.now(), { cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.text();
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

async function mapPool(items, limit, fn, signal) {
  const list = Array.from(items || []);
  const out = new Array(list.length);
  let i = 0;
  const n = Math.max(0, Math.min(limit || 1, list.length));
  async function worker() {
    while (i < list.length) {
      if (signal && signal.aborted) return;
      const idx = i++;
      out[idx] = await fn(list[idx], idx);
    }
  }
  if (n) await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}

async function listHtmlHrefs(signal, scan) {
  const found = new Set();
  pageGalleryEntries().forEach((m) => {
    const key = canonicalPageHref(m.href);
    if (key) found.add(key);
  });
  Object.keys(OMITTED_PAGES).forEach((h) => found.add(canonicalPageHref(h)));
  loadExtras().forEach((p) => {
    const key = canonicalPageHref(p.href);
    if (key) found.add(key);
  });

  const tryList = async (url, kind) => {
    const label = kind === 'pages' ? 'pages/' : '(repo root)';
    scan?.log({ state: 'run', name: label, detail: 'Looking for extra HTML in the directory listing' });
    try {
      const html = await fetchText(url, signal);
      if (!isDirListing(html)) {
        scan?.log({ state: 'skip', name: label, detail: 'No directory listing — using the catalog and any pages already found' });
        return;
      }
      const before = found.size;
      hrefsFromListing(html, kind).forEach((h) => found.add(canonicalPageHref(h)));
      const added = found.size - before;
      scan?.log({
        state: 'ok',
        name: label,
        detail: added ? ('Found ' + added + ' additional HTML page' + (added === 1 ? '' : 's')) : 'No HTML beyond what was already queued',
      });
    } catch (_) {
      scan?.log({ state: 'skip', name: label, detail: 'Listing not available' });
    }
  };

  await Promise.all([
    tryList(new URL('./', location.href).href, 'pages'),
    tryList(new URL('../', location.href).href, 'root'),
  ]);
  return Array.from(found).filter(Boolean).sort();
}

async function probePage(href, signal) {
  try {
    const text = await fetchText(href, signal);
    return { href, ok: true, title: titleFromHtml(text, labelFromPath(href)), size: text.length };
  } catch (err) {
    if (isAbortError(err, signal)) return { href, ok: false, skipped: true };
    return { href, ok: false };
  }
}

function closeScanModal() {
  const el = scanModalEl;
  if (!el) return;
  scanModalEl = null;
  document.body.style.overflow = el._prevOverflow || '';
  if (el._onKey) document.removeEventListener('keydown', el._onKey);
  el.classList.remove('is-open');
  setTimeout(() => { if (el.parentNode) el.remove(); }, 220);
}

function openScanModal(opts) {
  const {
    eyebrow = 'Re-evaluate',
    title = 'Working',
    icon = 'autorenew',
    sub = 'Starting…',
  } = opts || {};
  closeScanModal();

  const scrim = document.createElement('div');
  scrim.className = 'pg-scan-scrim';
  scrim._prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  scrim.innerHTML = `
    <div class="pg-scan-card" role="dialog" aria-modal="true" aria-labelledby="pg-scan-title">
      <div class="pg-scan-head">
        <span class="material-symbols-outlined" aria-hidden="true">${esc(icon)}</span>
        <div class="pg-scan-titles">
          <div class="pg-scan-eyebrow">${esc(eyebrow)}</div>
          <h2 class="pg-scan-title" id="pg-scan-title">${esc(title)}</h2>
          <p class="pg-scan-sub" data-scan-sub>${esc(sub)}</p>
          <p class="pg-scan-now" data-scan-now></p>
        </div>
        <button type="button" class="pg-scan-close" data-scan-close aria-label="Close" hidden>
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="pg-scan-score">
        <span class="pg-scan-pct no-countup" data-scan-pct data-no-countup>0%</span>
        <span class="pg-scan-frac" data-scan-frac>Starting</span>
      </div>
      <div class="pg-scan-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-scan-bar>
        <span class="pg-scan-fill" data-scan-fill></span>
      </div>
      <ul class="pg-scan-log" data-scan-log role="log" aria-live="polite" aria-relevant="additions"></ul>
      <div class="pg-scan-foot">
        <span class="pg-scan-note" data-scan-note>Keep this tab open while it runs.</span>
        <button type="button" class="wise-btn wise-btn--primary" data-scan-done disabled>
          <span class="material-symbols-outlined">hourglass_top</span>
          <span data-scan-done-label>Working…</span>
        </button>
      </div>
    </div>`;
  document.body.appendChild(scrim);
  scanModalEl = scrim;
  requestAnimationFrame(() => scrim.classList.add('is-open'));

  let pctNow = 0;
  let logCount = 0;
  let finished = false;
  const list = scrim.querySelector('[data-scan-log]');
  const fill = scrim.querySelector('[data-scan-fill]');
  const bar = scrim.querySelector('[data-scan-bar]');
  const pctEl = scrim.querySelector('[data-scan-pct]');
  const fracEl = scrim.querySelector('[data-scan-frac]');
  const subEl = scrim.querySelector('[data-scan-sub]');
  const nowEl = scrim.querySelector('[data-scan-now]');
  const noteEl = scrim.querySelector('[data-scan-note]');
  const doneBtn = scrim.querySelector('[data-scan-done]');
  const doneLabel = scrim.querySelector('[data-scan-done-label]');
  const closeBtn = scrim.querySelector('[data-scan-close]');
  const rowIcon = { run: 'autorenew', ok: 'check_circle', err: 'error', skip: 'block', info: 'info', pending: 'schedule' };

  const close = () => {
    if (!finished) return;
    closeScanModal();
  };

  const onKey = (e) => {
    if (e.key !== 'Escape') return;
    if (!finished) { e.preventDefault(); e.stopPropagation(); return; }
    e.preventDefault();
    e.stopPropagation();
    close();
  };
  scrim._onKey = onKey;
  document.addEventListener('keydown', onKey);
  closeBtn.addEventListener('click', close);
  scrim.addEventListener('click', (e) => { if (e.target === scrim && finished) close(); });
  doneBtn.addEventListener('click', () => { if (!doneBtn.disabled) close(); });

  const api = {
    setProgress(pct, frac) {
      const next = Math.max(pctNow, Math.max(0, Math.min(100, Math.round(pct))));
      pctNow = next;
      if (fill) fill.style.width = next + '%';
      if (bar) bar.setAttribute('aria-valuenow', String(next));
      if (pctEl) pctEl.textContent = next + '%';
      if (frac && fracEl) fracEl.textContent = frac;
    },
    phase(titleText, detail) {
      if (!list) return;
      list.insertAdjacentHTML('beforeend',
        `<li class="pg-scan-phase">${esc(titleText)}${detail ? `<span>${esc(detail)}</span>` : ''}</li>`);
      list.lastElementChild.scrollIntoView({ block: 'nearest' });
      if (subEl) subEl.textContent = detail || titleText;
    },
    log(entry) {
      if (!list) return;
      const state = (entry && entry.state) || 'info';
      const name = (entry && entry.name) || '';
      const detail = (entry && entry.detail) || '';
      if (state !== 'run' && name) {
        const prev = Array.from(list.querySelectorAll('.pg-scan-row[data-state="run"]'))
          .find((r) => (r.querySelector('.pg-scan-row-name') || {}).textContent === name);
        if (prev) {
          prev.dataset.state = state;
          const ic = prev.querySelector('.material-symbols-outlined');
          if (ic) ic.textContent = rowIcon[state] || 'info';
          const detailEl = prev.querySelector('.pg-scan-row-detail');
          if (detailEl) detailEl.textContent = detail;
          else if (detail) {
            const span = document.createElement('span');
            span.className = 'pg-scan-row-detail';
            span.textContent = detail;
            (prev.querySelector('.pg-scan-row-main') || prev).appendChild(span);
          }
          prev.scrollIntoView({ block: 'nearest' });
          if (nowEl) nowEl.textContent = name;
          return;
        }
      }
      logCount += 1;
      list.insertAdjacentHTML('beforeend', `
        <li class="pg-scan-row" data-state="${esc(state)}">
          <span class="material-symbols-outlined">${rowIcon[state] || 'info'}</span>
          <span class="pg-scan-row-main">
            <span class="pg-scan-row-name">${esc(name)}</span>
            ${detail ? `<span class="pg-scan-row-detail">${esc(detail)}</span>` : ''}
          </span>
        </li>`);
      list.lastElementChild.scrollIntoView({ block: 'nearest' });
      if (nowEl && (state === 'run' || state === 'ok')) nowEl.textContent = name;
      if (noteEl && !finished) noteEl.textContent = logCount + (logCount === 1 ? ' event' : ' events');
    },
    finish(kind, finishTitle, note) {
      finished = true;
      api.setProgress(100, finishTitle || 'Done');
      if (subEl && finishTitle) subEl.textContent = finishTitle;
      if (noteEl && note) noteEl.textContent = note;
      if (doneBtn) {
        doneBtn.disabled = false;
        const ic = doneBtn.querySelector('.material-symbols-outlined');
        if (ic) ic.textContent = kind === 'err' ? 'error' : (kind === 'warn' ? 'warning' : 'check');
        if (doneLabel) doneLabel.textContent = 'Done';
      }
      if (closeBtn) closeBtn.hidden = false;
      if (nowEl) nowEl.textContent = '';
    },
    close,
  };
  return api;
}

function paintCount(root, n) {
  const el = (root || document).querySelector('.pg-count');
  if (!el) return;
  el.textContent = n + ' page' + (n === 1 ? '' : 's');
  el.setAttribute('aria-label', n + ' page' + (n === 1 ? '' : 's'));
}

function paintGrid(root) {
  const host = root || document.getElementById('pg-root');
  if (!host) return;
  const wrap = host.querySelector('.pg-scroll') || host;
  let grid = wrap.querySelector('.pg-grid');
  if (!grid) {
    wrap.insertAdjacentHTML('beforeend', '<div class="pg-grid"></div>');
    grid = wrap.querySelector('.pg-grid');
  }
  const pages = galleryEntries();
  const dimmed = loadDimmed();
  const scroll = wrap.scrollTop;
  resetLiveObserver();
  const next = document.createElement('div');
  next.className = 'pg-grid';
  next.innerHTML = pages.map((p) => cardHTML(p, dimmed)).join('');
  grid.replaceWith(next);
  bindCards(next);
  wireReorder(next);
  paintCount(host, pages.length);
  wrap.scrollTop = scroll;
}

function applyDiscovered(hrefs, titlesByHref) {
  const catalog = catalogHrefSet();
  const extras = loadExtras();
  const byKey = new Map(extras.map((p) => [canonicalPageHref(p.href), p]));
  (hrefs || []).forEach((href) => {
    const key = canonicalPageHref(href);
    if (!key || catalog.has(key) || OMITTED_PAGES[key]) return;
    const title = titlesByHref && titlesByHref.get(key);
    const prev = byKey.get(key) || {};
    byKey.set(key, {
      href: key,
      label: title || prev.label || labelFromPath(key),
      icon: prev.icon || 'web',
      area: 'unaccounted',
      areaTitle: 'Unaccounted',
      badge: prev.badge || 'New',
    });
  });
  return saveExtras(Array.from(byKey.values()));
}

function dropMissingExtras(reachableKeys) {
  const keep = loadExtras().filter((p) => reachableKeys.has(canonicalPageHref(p.href)));
  return saveExtras(keep);
}

async function quietRefresh() {
  if (scanBusy || isDragging) return;
  if (location.protocol === 'file:') return;
  try {
    const hrefs = await listHtmlHrefs(null, null);
    const catalog = catalogHrefSet();
    const known = new Set(catalog);
    loadExtras().forEach((p) => known.add(canonicalPageHref(p.href)));
    const novel = hrefs.filter((h) => {
      const key = canonicalPageHref(h);
      return key && !known.has(key) && !OMITTED_PAGES[key];
    });
    if (!novel.length) return;
    const titles = new Map();
    await mapPool(novel, REEVAL_CONCURRENCY, async (href) => {
      const r = await probePage(href, null);
      if (r.ok) titles.set(canonicalPageHref(r.href), r.title);
    });
    applyDiscovered(novel, titles);
    const root = document.getElementById('pg-root');
    paintGrid(root);
    paintReevalMeta(root);
  } catch (_) { /* listing unavailable — catalog + extras stay */ }
}

function scheduleQuietRefresh() {
  if (scanBusy || isDragging) return;
  clearTimeout(quietTimer);
  quietTimer = setTimeout(() => { quietRefresh(); }, 180);
}

async function reevaluateGallery(root, opts) {
  if (scanBusy) return;
  const reason = (opts && opts.reason) || 'manual';
  const btn = root.querySelector('[data-pg-reeval]');
  const label = root.querySelector('[data-pg-reeval-label]');
  const scan = openScanModal({
    eyebrow: 'Re-evaluate',
    title: 'Re-evaluating the gallery',
    icon: 'autorenew',
    sub: 'Walking every HTML page, then adding anything the catalog does not already list.',
  });
  scan.log({
    state: 'info',
    name: 'How this scan works',
    detail: 'Reads the pages/ and repo-root directory listings, then probes each HTML file with a cache-busted fetch. Skips this gallery and the pitch deck. Remounts the live card previews so they show the current screens, not leftover shots. Gives the scan ' + reevalBudgetLabel() + '.',
  });

  if (location.protocol === 'file:') {
    scan.phase('Cannot scan from a file URL', 'A local server is required so the browser can fetch the project.');
    scan.log({
      state: 'err',
      name: location.href,
      detail: 'Opened as a file. Start python3 -m http.server or python3 dev_server.py and reload this page over http.',
    });
    scan.finish('warn', 'Serve this page over http', 'Start a local server, then click Re-evaluate again.');
    setReevalStatus(root, 'warn', 'Serve this page over http',
      '<p>Live re-evaluate needs a local server so it can fetch the project. Start <code>python3 -m http.server</code> or <code>python3 dev_server.py</code> and reload.</p>');
    return;
  }

  scanBusy = true;
  if (btn) {
    btn.disabled = true;
    btn.classList.add('is-busy');
    btn.classList.remove('is-done');
    btn.setAttribute('aria-busy', 'true');
  }
  if (label) label.textContent = 'Re-evaluating…';
  setReevalStatus(root, 'busy', 'Re-evaluating the gallery',
    '<p>Walking every HTML page, then adding anything missing…</p>');

  const ac = new AbortController();
  const budget = setTimeout(() => ac.abort(), REEVAL_BUDGET_MS);
  try {
    scan.phase('Discover HTML pages', 'Catalog, previously found pages, and directory listings.');
    scan.setProgress(8, 'Listing pages');
    const pages = await listHtmlHrefs(ac.signal, scan);

    scan.phase('Probe every HTML page', 'Cache-busted GET of each page. Classifies catalog, omitted, new, and unreachable.');
    scan.setProgress(22, '0 of ' + pages.length + ' pages probed');
    let probed = 0;
    const raw = await mapPool(pages, REEVAL_CONCURRENCY, async (href) => {
      if (ac.signal.aborted) return { href, ok: false, skipped: true };
      const name = href;
      scan.log({ state: 'run', name, detail: 'Fetching HTML (cache-busted)' });
      const r = await probePage(href, ac.signal);
      probed += 1;
      scan.setProgress(22 + Math.round((probed / Math.max(pages.length, 1)) * 70), probed + ' of ' + pages.length + ' pages probed');
      if (r.skipped) {
        scan.log({ state: 'skip', name, detail: 'Not reached — scan stopped' });
      } else if (r.ok) {
        scan.log({
          state: 'ok',
          name,
          detail: (r.title || labelFromPath(href)) + ' · reachable',
        });
      } else {
        scan.log({ state: 'err', name, detail: 'Unreachable — the fetch failed or the server did not return the page' });
      }
      return r;
    }, ac.signal);
    const results = pages.map((href, i) => raw[i] || { href, ok: false, skipped: true });
    const skippedN = results.filter((r) => r.skipped).length;
    if (skippedN) {
      scan.log({
        state: 'skip',
        name: 'Time budget',
        detail: 'Stopped after ' + reevalBudgetLabel() + '. ' + skippedN + ' page' + (skippedN === 1 ? ' was' : 's were') + ' not reached this pass — not marked unreachable.',
      });
    }
    const reached = results.filter((r) => !r.skipped);
    if (!reached.length && ac.signal.aborted) {
      throw new DOMException('Timed out', 'AbortError');
    }

    scan.phase('Apply results', 'Update the gallery cards and today’s scan stamp.');
    scan.setProgress(94, 'Classifying pages');
    const catalog = catalogHrefSet();
    const live = results.filter((r) => r.ok);
    const unreachable = results.filter((r) => !r.ok && !r.skipped);
    const omitted = live.filter((r) => OMITTED_PAGES[canonicalPageHref(r.href)]);
    const unaccounted = live.filter((r) => {
      const key = canonicalPageHref(r.href);
      return !catalog.has(key) && !OMITTED_PAGES[key];
    });
    const catalogMissing = unreachable.filter((r) => catalog.has(canonicalPageHref(r.href)));
    const omittedMissing = unreachable.filter((r) => OMITTED_PAGES[canonicalPageHref(r.href)]);

    scan.log({
      state: 'info',
      name: 'Classification',
      detail: live.length + ' reachable · ' + unreachable.length + ' unreachable'
        + (skippedN ? (' · ' + skippedN + ' not reached') : '')
        + ' · ' + omitted.length + ' omitted on purpose · ' + unaccounted.length + ' new · ' + catalogMissing.length + ' catalog entries missing',
    });
    omitted.forEach((r) => {
      const key = canonicalPageHref(r.href);
      scan.log({ state: 'skip', name: key, detail: 'Intentionally omitted — ' + (OMITTED_PAGES[key] || 'kept out of the gallery') });
    });
    catalogMissing.forEach((r) => {
      scan.log({ state: 'err', name: r.href, detail: 'In the module directory but the page did not resolve' });
    });
    omittedMissing.forEach((r) => {
      scan.log({ state: 'err', name: r.href, detail: 'Omitted page is now unreachable' });
    });

    const titles = new Map();
    unaccounted.forEach((r) => {
      const key = canonicalPageHref(r.href);
      titles.set(key, r.title || labelFromPath(r.href));
      scan.log({
        state: 'ok',
        name: r.href,
        detail: 'Added to the gallery as “' + (r.title || labelFromPath(r.href)) + '”',
      });
    });
    applyDiscovered(unaccounted.map((r) => r.href), titles);

    const reachableKeys = new Set(live.map((r) => canonicalPageHref(r.href)));
    dropMissingExtras(reachableKeys);

    shotBust = String(Date.now());
    paintGrid(root);

    const day = localDayIso();
    writeReevalStore({
      day,
      at: new Date().toISOString(),
      reason,
      pages: pages.length,
    });
    paintReevalMeta(root);

    const shown = galleryEntries().length;
    const gaps = unaccounted.length + catalogMissing.length + omittedMissing.length;
    const kind = (catalogMissing.length || omittedMissing.length)
      ? 'err'
      : ((unaccounted.length || skippedN) ? 'warn' : 'ok');
    const title = skippedN && !gaps
      ? `Reached ${live.length} of ${pages.length} pages`
      : !gaps
        ? `All ${shown} gallery pages are current`
        : (unaccounted.length && !catalogMissing.length
          ? `Added ${unaccounted.length} missing page${unaccounted.length === 1 ? '' : 's'}`
          : `${gaps} page${gaps === 1 ? '' : 's'} need attention`);

    const bits = [];
    bits.push(`<p>Probed <strong>${reached.length}</strong> of <strong>${pages.length}</strong> HTML files · <strong>${live.length}</strong> reachable · gallery now holds <strong>${shown}</strong> pages. Visible cards remount a live preview of the current page.</p>`);
    if (skippedN) {
      bits.push(`<p>${skippedN} page${skippedN === 1 ? ' was' : 's were'} not reached before the time budget — ${skippedN === 1 ? 'it is' : 'they are'} not marked unreachable. Click Re-evaluate again to finish.</p>`);
    }
    if (unaccounted.length) {
      bits.push('<ul>' + unaccounted.map((r) =>
        `<li>Added <a href="${esc(r.href)}">${esc(r.title || labelFromPath(r.href))}</a> <code>${esc(r.href)}</code></li>`
      ).join('') + '</ul>');
    }
    if (catalogMissing.length) {
      bits.push('<p>Directory entries that did not resolve:</p><ul>' + catalogMissing.map((r) =>
        `<li><code>${esc(r.href)}</code></li>`
      ).join('') + '</ul>');
    }
    if (omitted.length) {
      bits.push('<p>Intentionally omitted: ' + omitted.map((r) =>
        `<code>${esc(canonicalPageHref(r.href))}</code>`
      ).join(', ') + '.</p>');
    }
    if (omittedMissing.length) {
      bits.push('<p>Omitted pages that are now unreachable: ' + omittedMissing.map((r) =>
        `<code>${esc(r.href)}</code>`
      ).join(', ') + '.</p>');
    }
    setReevalStatus(root, kind, title, bits.join(''));
    scan.finish(kind, title, 'Gallery now holds ' + shown + ' pages. The summary also stays on the page behind this panel.');
    if (btn && kind === 'ok') {
      btn.classList.add('is-done');
      setTimeout(() => btn.classList.remove('is-done'), 2200);
    }
  } catch (err) {
    const timedOut = err && (err.name === 'AbortError' || /timed out/i.test(err.message || ''));
    scan.log({
      state: 'err',
      name: timedOut ? 'Time budget' : 'Scan failed',
      detail: timedOut
        ? 'Stopped after ' + reevalBudgetLabel() + ' before any page could be reached. The gallery still shows the last complete pass.'
        : (err && err.message) || String(err),
    });
    scan.finish(
      timedOut ? 'warn' : 'err',
      timedOut ? 'Re-evaluate stopped so this page stays usable' : 'Re-evaluate failed',
      timedOut
        ? 'Click Re-evaluate again when the page is idle, or serve the repo with directory listings enabled.'
        : ((err && err.message) || String(err)),
    );
    setReevalStatus(root, timedOut ? 'warn' : 'err',
      timedOut ? 'Re-evaluate stopped so this page stays usable' : 'Re-evaluate failed',
      timedOut
        ? '<p>The scan was taking too long (usually a busy local server). The cards above are still the last complete pass. Click Re-evaluate again when the page is idle, or serve the repo with directory listings enabled.</p>'
        : `<p>${esc(err.message || String(err))}</p>`);
  } finally {
    clearTimeout(budget);
    scanBusy = false;
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('is-busy');
      btn.removeAttribute('aria-busy');
    }
    if (label) label.textContent = 'Re-evaluate';
  }
}

function wirePageReeval(root) {
  const btn = root.querySelector('[data-pg-reeval]');
  if (btn) btn.addEventListener('click', () => reevaluateGallery(root, { reason: 'manual' }));
  paintReevalMeta(root);
}

function render() {
  const root = document.getElementById('pg-root');
  if (!root) return;
  const pages = galleryEntries();
  root.innerHTML = `
    <header class="pg-bar">
      <button type="button" class="pg-close" data-pg-close aria-label="Back to All Modules">
        <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
      </button>
      <div class="pg-bar-text">
        <h1 class="pg-title">Page gallery</h1>
        <p class="pg-lede">Live previews of every unique screen — the helix, the chrome, whatever is on the page right now. Drag to rearrange. Click Re-evaluate to re-scan the project and refresh the previews.</p>
        <span class="pg-reeval-meta" data-pg-reeval-meta></span>
      </div>
      <div class="pg-bar-actions">
        <button type="button" class="wise-btn wise-btn--primary pg-reeval-btn" data-pg-reeval title="Scan every HTML page, add any screen that is missing, and remount the live previews so they match the project right now.">
          <span class="material-symbols-outlined" aria-hidden="true">autorenew</span>
          <span data-pg-reeval-label>Re-evaluate</span>
        </button>
        <span class="pg-count" aria-label="${pages.length} pages">${pages.length} pages</span>
      </div>
      <button type="button" class="pg-close" data-pg-close aria-label="Close gallery">
        <span class="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
    </header>
    <div class="pg-reeval-status" id="pg-reeval-status" hidden></div>
    <div class="pg-scroll" id="pg-scroll">
      <div class="pg-grid">${pages.map((p) => cardHTML(p, loadDimmed())).join('')}</div>
    </div>`;

  resetLiveObserver();
  root.querySelectorAll('[data-pg-close]').forEach((btn) => {
    btn.addEventListener('click', closeGallery);
  });
  bindCards(root.querySelector('.pg-grid'));
  wireReorder(root.querySelector('.pg-grid'));
  wirePageReeval(root);
}

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (scanModalEl) return;
  e.preventDefault();
  closeGallery();
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) scheduleQuietRefresh();
});
window.addEventListener('focus', () => scheduleQuietRefresh());

render();
scheduleQuietRefresh();
window.pgReevaluate = (opts) => {
  const root = document.getElementById('pg-root');
  if (root) reevaluateGallery(root, opts || { reason: 'manual' });
};
