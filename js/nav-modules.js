/* ------------------------------------------------------------------ */
/* Nav & History icons                                                 */
/* ------------------------------------------------------------------ */
/*
 * Appearance ▸ Layout ▸ Nav & History icons (Admin-badged). Sibling of
 * History in navigation: that mode merges History into the nav; this one
 * keeps them as two default modules and gives them a shared collapsed
 * chrome — logo bug, menu, expand chevron, new chat (blue circle).
 *
 * Collapsed (icon rail): those four icons. The hamburger opens the labelled
 * navigation in full, with History docked to its right in collapsed (icon)
 * mode. The chevron opens History in full, with the navigation staying in
 * collapsed mode. New conversation starts a thread without forcing either
 * module open. The new-chat control is a circle, matching History.
 *
 * Default ON (no stored value). The choice persists so it survives reloads
 * and page changes; an explicit off stays off. Keep the FOUC guard in
 * js/text-size-fouc.js in sync with this key and default.
 */

import { applyMinimalUi, applyIconRail } from './topbar.js';

const LS_KEY = 'wise-nav-modules';
const HTML_CLASS = 'nav-modules';

/** True when Nav & History icons is on. Defaults to ON (no stored value)
    so the Appearance toggle and first-run nav match. */
export function isNavModulesOn() {
  try {
    const v = localStorage.getItem(LS_KEY);
    return v === null ? true : v === '1';
  } catch { return true; }
}

/**
 * Reflect the on/off choice onto the nav chrome + History module.
 * @param {boolean} on
 * @param {boolean} [persist=true]  Restore on load must not write.
 */
export function applyNavModules(on, persist = true) {
  const val = !!on;
  if (persist) {
    try { localStorage.setItem(LS_KEY, val ? '1' : '0'); } catch (_) { /* session-only */ }
  }
  document.documentElement.classList.toggle(HTML_CLASS, val);
  if (val) {
    /* This chrome replaces Minimal UI's logo+chevron strip. Always stand
       Minimal UI down (including restore) so the four icons actually show. */
    try { applyMinimalUi(false); } catch (_) { /* already expanded */ }
    if (persist) {
      try { applyIconRail(true); } catch (_) { /* already railed */ }
    }
    concealHistoryModule();
  }
  syncNavModulesChrome();
  try { document.dispatchEvent(new CustomEvent('wise:nav-modules', { detail: { on: val } })); } catch (_) {}
}

/** Restore the persisted on/off state without writing storage. */
export function restoreNavModules() {
  applyNavModules(isNavModulesOn(), false);
}

/** Place (or remove) the menu + new-chat icons around the collapse chevron. */
export function syncNavModulesChrome() {
  const brand = document.querySelector('#menu-panel .menu-brand-bar');
  if (!brand) return;
  const toggle = document.getElementById('topbar-menu-toggle');
  const on = isNavModulesOn();

  let menuBtn = brand.querySelector('.menu-modules-menu');
  let newBtn = brand.querySelector('.menu-modules-new');

  if (!on) {
    menuBtn?.remove();
    newBtn?.remove();
    return;
  }

  if (!menuBtn) {
    menuBtn = makeChromeBtn('menu-modules-menu', 'menu', 'Open navigation', 'Open navigation');
    menuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleNavModule();
    });
  }
  if (!newBtn) {
    newBtn = makeChromeBtn('menu-modules-new', 'chat_add_on', 'New conversation', 'New conversation');
    newBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      startNewConversation();
    });
  }

  /* Order: logo bug, menu, chevron, new chat. */
  const logo = brand.querySelector('.menu-brand-logo');
  if (logo) brand.insertBefore(menuBtn, logo.nextSibling);
  else brand.insertBefore(menuBtn, brand.firstChild);
  if (toggle) {
    if (menuBtn.nextSibling !== toggle) brand.insertBefore(toggle, menuBtn.nextSibling);
    if (toggle.nextSibling !== newBtn) brand.insertBefore(newBtn, toggle.nextSibling);
  } else {
    brand.appendChild(newBtn);
  }
  syncMenuLabel();
  syncChevronLabel();
}

function makeChromeBtn(extraClass, glyph, label, tip) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'menu-modules-btn ' + extraClass;
  btn.setAttribute('data-tip', tip);
  btn.setAttribute('title', tip);
  btn.setAttribute('aria-label', label);
  btn.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">${glyph}</span>`;
  return btn;
}

function panelEl() {
  return document.getElementById('menu-panel');
}

function navIsCollapsed() {
  const panel = panelEl();
  return !!(panel && panel.classList.contains('mp-rail') && !panel.classList.contains('mp-pivot')
    && !panel.classList.contains('minimal-ui'));
}

/** Parked live History API (the mount event can fire before this module boots). */
let liveApi = null;
/** Layout the last hamburger/chevron click asked for, so a late History mount
 *  still opens in the right mode (full vs collapsed rail). */
let pendingLayout = null;

function historyApi() {
  if (liveApi && liveApi.root && liveApi.root.isConnected) return liveApi;
  const existing = typeof window !== 'undefined' ? window.__wiseChatHistory : null;
  if (existing && existing.root) {
    liveApi = existing;
    return liveApi;
  }
  return liveApi;
}

let histObs = null;
function watchHistoryRoot() {
  const el = historyApi() && historyApi().root;
  if (!el || (histObs && histObs._el === el)) return;
  if (histObs) {
    try { histObs.disconnect(); } catch (_) {}
    histObs = null;
  }
  histObs = new MutationObserver(() => { if (isNavModulesOn()) syncChevronLabel(); });
  histObs._el = el;
  histObs.observe(el, { attributes: true, attributeFilter: ['class'] });
}

function isHistoryShowing(api) {
  const el = api && api.root;
  if (!el) return false;
  if (el.classList.contains('wch-in-nav')) return true;
  if (el.classList.contains('wch-dock-conceal') || el.classList.contains('wch-docked-hidden')) return false;
  if (api.isDocked && api.isDocked()) return true;
  return !!(api.isOpen && api.isOpen());
}

function isHistoryRail(api) {
  const a = api || historyApi();
  if (!isHistoryShowing(a)) return false;
  if (a && a.root && a.root.classList.contains('wch-rail')) return true;
  return !!(a && a.isRail && a.isRail());
}

function isHistoryFull(api) {
  const a = api || historyApi();
  return isHistoryShowing(a) && !isHistoryRail(a);
}

function openHistoryModule(opts = {}) {
  const api = historyApi();
  if (!api) return;
  try {
    if (typeof api.setRail === 'function') api.setRail(!!opts.rail);
    if (api.isDocked && !api.isDocked()) api.setDocked(true);
    if (api.root) api.root.classList.remove('wch-docked-hidden', 'wch-dock-conceal');
    api.open && api.open();
  } catch (_) { /* History is optional on pages without a chat */ }
}

function concealHistoryModule() {
  const api = historyApi();
  if (!api || !isHistoryShowing(api)) return;
  try {
    if (api.isDocked && api.isDocked()) api.toggle();
    else if (api.close) api.close();
  } catch (_) { /* best-effort */ }
}

/** Hamburger: labelled nav in full, History docked to its right as the icon rail. */
function toggleNavModule() {
  if (!isNavModulesOn()) return;
  try { applyMinimalUi(false); } catch (_) { /* already expanded */ }
  if (!navIsCollapsed()) {
    pendingLayout = null;
    try { applyIconRail(true); } catch (_) { /* already railed */ }
    concealHistoryModule();
  } else {
    pendingLayout = 'nav-full';
    try { applyIconRail(false); } catch (_) { /* already labelled */ }
    openHistoryModule({ rail: true });
  }
  syncNavModulesChrome();
}

/** Chevron: History in full, primary nav stays (or returns) collapsed. */
function toggleHistoryModule() {
  if (!isNavModulesOn()) return;
  try { applyMinimalUi(false); } catch (_) { /* already expanded */ }
  if (isHistoryFull() && navIsCollapsed()) {
    pendingLayout = null;
    concealHistoryModule();
  } else {
    pendingLayout = 'hist-full';
    try { applyIconRail(true); } catch (_) { /* already railed */ }
    openHistoryModule({ rail: false });
  }
  syncNavModulesChrome();
}

function startNewConversation() {
  const api = historyApi();
  try { api && api.startNew && api.startNew(); } catch (_) { /* no-op */ }
}

function isDesktop() {
  try { return !window.matchMedia('(max-width: 768px)').matches; } catch (_) { return true; }
}

function syncChevronLabel() {
  if (!isNavModulesOn()) return;
  const btn = document.getElementById('topbar-menu-toggle');
  const panel = panelEl();
  if (!btn || !panel || panel.classList.contains('mp-pivot')) return;
  const open = isHistoryFull();
  const label = open ? 'Close History' : 'Open History';
  btn.setAttribute('aria-label', label);
  btn.setAttribute('title', label);
  btn.setAttribute('data-tip', label);
  btn.setAttribute('aria-pressed', open ? 'true' : 'false');
  const icon = btn.querySelector('.material-symbols-outlined');
  if (icon) icon.textContent = 'chevron_right';
}

function syncMenuLabel() {
  const btn = document.querySelector('.menu-modules-menu');
  if (!btn) return;
  const label = navIsCollapsed() ? 'Open navigation' : 'Close navigation';
  btn.setAttribute('aria-label', label);
  btn.setAttribute('title', label);
  btn.setAttribute('data-tip', label);
}

function onMenuRail() {
  if (!isNavModulesOn()) return;
  syncNavModulesChrome();
  syncMenuLabel();
  syncChevronLabel();
}

function onChevronClick(e) {
  if (!isNavModulesOn() || !isDesktop()) return;
  const toggle = e.target?.closest?.('#topbar-menu-toggle');
  if (!toggle) return;
  const panel = panelEl();
  if (!panel || panel.classList.contains('mp-pivot')) return;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  toggleHistoryModule();
}

function boot() {
  restoreNavModules();
  document.addEventListener('click', onChevronClick, true);
  document.addEventListener('wise:menu-rail', onMenuRail);
  document.addEventListener('wise:minimal-ui', syncNavModulesChrome);
  document.addEventListener('wise:menu-pivot', syncNavModulesChrome);
  document.addEventListener('wise:chat-history-ready', (ev) => {
    const api = ev?.detail?.api;
    if (api && api.root) liveApi = api;
    watchHistoryRoot();
    if (!isNavModulesOn()) return;
    syncNavModulesChrome();
    if (pendingLayout === 'nav-full') openHistoryModule({ rail: true });
    else if (pendingLayout === 'hist-full') openHistoryModule({ rail: false });
    else if (navIsCollapsed()) concealHistoryModule();
  });
  const existing = typeof window !== 'undefined' ? window.__wiseChatHistory : null;
  if (existing && existing.root) liveApi = existing;
  watchHistoryRoot();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}
