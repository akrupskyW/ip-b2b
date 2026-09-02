/* ------------------------------------------------------------------ */
/* Collapsed nav → menu icon (Appearance ▸ Admin)                      */
/* ------------------------------------------------------------------ */
/*
 * Appearance ▸ Admin ▸ Menu icon (Admin-badged). Stays in lockstep with
 * Search: off while Search is off, and the row stays locked until Search
 * is on. A leftover on-state is forced off so the switch cannot read as
 * on under an unavailable tooltip.
 *
 * When this is on, Search is on, and the primary nav is collapsed
 * (`.mp-rail`, not Minimal UI, not pivoted): hide the icon rail and put a
 * `dock_to_right` icon to the left of the unchanged wordmark. Clicking
 * it expands the nav the same way the open/close dock icons already do.
 *
 * Default OFF.
 */

import { isAppSearchOn } from './app-search.js';

const LS_KEY = 'wise-nav-hamburger';
const HTML_CLASS = 'nav-hamburger';

function storedHamburgerOn() {
  try { return localStorage.getItem(LS_KEY) === '1'; } catch { return false; }
}

/** True when Menu icon is on. Search off always reads as off. */
export function isNavHamburgerOn() {
  return isAppSearchOn() && storedHamburgerOn();
}

/** True when the collapsed hamburger chrome should actually paint. */
export function isNavHamburgerActive() {
  return isNavHamburgerOn();
}

/**
 * Reflect the on/off choice onto <html>.
 * Search off forces the switch off so the two stay in sync.
 * @param {boolean} on
 * @param {boolean} [persist=true]  Restore on load must not write.
 */
export function applyNavHamburger(on, persist = true) {
  const val = isAppSearchOn() && !!on;
  if (persist) {
    try { localStorage.setItem(LS_KEY, val ? '1' : '0'); } catch (_) { /* session-only */ }
  }
  document.documentElement.classList.toggle(HTML_CLASS, val);
  try { document.dispatchEvent(new CustomEvent('wise:nav-hamburger', { detail: { on: val } })); } catch (_) {}
}

/** Restore the on/off state. Search off writes off so a leftover cannot stick. */
export function restoreNavHamburger() {
  if (!isAppSearchOn()) {
    applyNavHamburger(false, true);
    return;
  }
  applyNavHamburger(storedHamburgerOn(), false);
}

function boot() {
  restoreNavHamburger();
  document.addEventListener('wise:app-search', () => {
    if (!isAppSearchOn()) applyNavHamburger(false, true);
    else restoreNavHamburger();
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}
