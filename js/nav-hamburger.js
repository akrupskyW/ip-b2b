/* ------------------------------------------------------------------ */
/* Collapsed nav → menu icon (Appearance ▸ Admin)                      */
/* ------------------------------------------------------------------ */
/*
 * Appearance ▸ Admin ▸ Menu icon (Admin-badged). Depends on Search being
 * on: while Search is off the row is locked, matching Full bleed's lock
 * while Search is on. The preference still persists, so turning Search
 * back on restores the chrome without flipping the toggle.
 *
 * When this is on, Search is on, and the primary nav is collapsed
 * (`.mp-rail`, not Minimal UI, not pivoted): hide the icon rail and put a
 * `dock_to_right` icon to the left of the unchanged wordmark. Clicking
 * it expands the nav the same way the open/close dock icons already do.
 *
 * Default OFF.
 */

const LS_KEY = 'wise-nav-hamburger';
const HTML_CLASS = 'nav-hamburger';

/** True when the user explicitly turned Menu icon on (default off). */
export function isNavHamburgerOn() {
  try { return localStorage.getItem(LS_KEY) === '1'; } catch { return false; }
}

/** True when the collapsed hamburger chrome should actually paint. */
export function isNavHamburgerActive() {
  return isNavHamburgerOn() && document.documentElement.classList.contains('app-search-on');
}

/**
 * Reflect the on/off choice onto <html>.
 * @param {boolean} on
 * @param {boolean} [persist=true]  Restore on load must not write.
 */
export function applyNavHamburger(on, persist = true) {
  const val = !!on;
  if (persist) {
    try { localStorage.setItem(LS_KEY, val ? '1' : '0'); } catch (_) { /* session-only */ }
  }
  document.documentElement.classList.toggle(HTML_CLASS, val);
  try { document.dispatchEvent(new CustomEvent('wise:nav-hamburger', { detail: { on: val } })); } catch (_) {}
}

/** Restore the persisted on/off state without writing storage. */
export function restoreNavHamburger() {
  applyNavHamburger(isNavHamburgerOn(), false);
}

function boot() {
  restoreNavHamburger();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}
