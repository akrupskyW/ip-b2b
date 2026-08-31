/* ------------------------------------------------------------------ */
/* Mobile primary navigation                                           */
/* ------------------------------------------------------------------ */
/*
 * Phone-friendly behaviour for the shared primary navigation (#menu-panel) at
 * ≤768px, WITHOUT touching the desktop layout:
 *
 *   • Collapsed, the nav is a small floating container pinned to the TOP-LEFT
 *     that carries only the owl bug + an "expand" icon. It floats above the
 *     content so the chat module stays primary and centred.
 *   • Tapping "expand" slides the FULL navigation in from the left as its own
 *     drawer pane (`.wise-mnav-open` on #menu-panel), over a dimming scrim.
 *
 * The History module is left in its collapsed state — this module does not
 * surface or expand it. All layout lives in pages/wise.css (the
 * `@media (max-width: 768px)` block); this file only toggles state + keeps the
 * expand icon in sync. Loaded as a side-effect import from js/topbar.js.
 */

const MOBILE_QUERY = '(max-width: 768px)';

function isMobile() {
  try { return window.matchMedia(MOBILE_QUERY).matches; } catch (_) { return false; }
}

function panel() { return document.getElementById('menu-panel'); }
function toggleBtn() { return document.getElementById('topbar-menu-toggle'); }
function navOpen() {
  const p = panel();
  return !!p && p.classList.contains('wise-mnav-open');
}

/* ── Dimming scrim behind the open drawer ────────────────────────────────── */
function ensureScrim() {
  let scrim = document.getElementById('mnav-scrim');
  if (!scrim) {
    scrim = document.createElement('div');
    scrim.id = 'mnav-scrim';
    scrim.setAttribute('aria-hidden', 'true');
    scrim.addEventListener('click', closeNav);
    document.body.appendChild(scrim);
  }
  return scrim;
}

/* ── Open / close the nav drawer ─────────────────────────────────────────── */
function syncChrome() {
  const open = isMobile() && navOpen();
  document.documentElement.classList.toggle('wise-mnav-locked', open);
  document.body.style.overflow = open ? 'hidden' : '';
  ensureScrim().classList.toggle('is-open', open);
}
function openNav() {
  const p = panel();
  if (!p) return;
  p.classList.add('wise-mnav-open');
  syncNavIcon();
  syncChrome();
}
function closeNav() {
  const p = panel();
  if (!p) return;
  p.classList.remove('wise-mnav-open');
  syncNavIcon();
  syncChrome();
}
function toggleNav() {
  if (navOpen()) closeNav();
  else openNav();
}

/** Reflect the expand toggle's glyph: dock_to_right open, dock_to_left close. */
function syncNavIcon() {
  const btn = toggleBtn();
  if (!btn) return;
  const icon = btn.querySelector('.material-symbols-outlined');
  if (!icon) return;
  if (isMobile()) {
    const open = navOpen();
    icon.textContent = open ? 'dock_to_left' : 'dock_to_right';
    const label = open ? 'Close menu' : 'Open menu';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  } else {
    /* Nav & History icons owns this control on desktop — don't stomp its
       history / history_off glyphs with nav-collapse dock icons. */
    if (document.documentElement.classList.contains('nav-modules')) return;
    const p = panel();
    if (p && !p.classList.contains('minimal-ui') && !p.classList.contains('mp-pivot')) {
      const hamburger = document.documentElement.classList.contains('nav-hamburger')
        && document.documentElement.classList.contains('app-search-on')
        && p.classList.contains('mp-rail');
      icon.textContent = p.classList.contains('mp-rail') ? 'dock_to_right' : 'dock_to_left';
      if (hamburger) {
        btn.setAttribute('aria-label', 'Open navigation');
        btn.setAttribute('title', 'Open navigation');
      }
    }
  }
}

/* ── Events ──────────────────────────────────────────────────────────────── */
function onCaptureClick(e) {
  if (!isMobile()) return;

  /* Expand / collapse the nav drawer. Capture phase so it pre-empts the
     desktop rail-collapse handler bound on the button itself. */
  const toggle = e.target.closest?.('#topbar-menu-toggle');
  if (toggle) {
    e.preventDefault();
    e.stopPropagation();
    toggleNav();
    return;
  }

  /* Following a nav link dismisses the drawer. */
  if (navOpen() && e.target.closest?.('#menu-panel .menu-panel-body a[href]')) {
    closeNav();
  }
}

function onKeydown(e) {
  if (e.key === 'Escape' && isMobile() && navOpen()) closeNav();
}

function onViewportChange() {
  if (!isMobile()) closeNav();
  syncNavIcon();
  syncChrome();
}

let started = false;
function start() {
  if (started) return;
  started = true;

  ensureScrim();
  document.addEventListener('click', onCaptureClick, true);
  document.addEventListener('keydown', onKeydown);

  try {
    window.matchMedia(MOBILE_QUERY).addEventListener('change', onViewportChange);
  } catch (_) {
    window.addEventListener('resize', onViewportChange);
  }

  syncNavIcon();
  syncChrome();
  document.addEventListener('wise:nav-hamburger', syncNavIcon);
  document.addEventListener('wise:app-search', syncNavIcon);
  document.addEventListener('wise:menu-rail', syncNavIcon);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}
