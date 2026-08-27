/* ------------------------------------------------------------------ */
/* Nav & History icons                                                 */
/* ------------------------------------------------------------------ */
/*
 * Appearance ▸ Layout ▸ Nav & History icons (Admin-badged). Sibling of
 * History in navigation: that mode merges History into the nav; this one
 * keeps them as two default modules and gives them a shared collapsed
 * chrome — logo bug, menu, expand chevron, new chat.
 *
 * Collapsed (icon rail): those four icons. Opening any of them restores
 * the navigation and History as they normally appear when expanded.
 *
 * Default OFF. The choice persists so it survives reloads and page changes.
 */

import { applyMinimalUi, applyIconRail } from './topbar.js';

const LS_KEY = 'wise-nav-modules';
const HTML_CLASS = 'nav-modules';

/** True when the user explicitly turned Nav & History icons on (default off). */
export function isNavModulesOn() {
  try { return localStorage.getItem(LS_KEY) === '1'; } catch { return false; }
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
    /* An explicit turn-on collapses to the four-icon chrome so the new
       mode is actually visible. Restore-on-load leaves the current
       expanded/collapsed choice alone. */
    if (persist) {
      try { applyMinimalUi(false); } catch (_) { /* already expanded */ }
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
      openBothModules();
    });
  }
  if (!newBtn) {
    newBtn = makeChromeBtn('menu-modules-new', 'chat_add_on', 'New conversation', 'New conversation');
    newBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openBothModules({ startNew: true });
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

function historyApi() {
  if (liveApi && liveApi.root && liveApi.root.isConnected) return liveApi;
  const existing = typeof window !== 'undefined' ? window.__wiseChatHistory : null;
  if (existing && existing.root) {
    liveApi = existing;
    return liveApi;
  }
  return liveApi;
}

function isHistoryShowing(api) {
  const el = api && api.root;
  if (!el) return false;
  if (el.classList.contains('wch-in-nav')) return true;
  if (el.classList.contains('wch-dock-conceal') || el.classList.contains('wch-docked-hidden')) return false;
  if (api.isDocked && api.isDocked()) return true;
  return !!(api.isOpen && api.isOpen());
}

function openHistoryModule() {
  const api = historyApi();
  if (!api) return;
  try {
    if (api.isDocked && !api.isDocked()) api.setDocked(true);
    if (typeof api.setRail === 'function') api.setRail(false);
    if (api.root) api.root.classList.remove('wch-docked-hidden', 'wch-dock-conceal');
    api.open && api.open();
  } catch (_) { /* History is optional on pages without a chat */ }
}

function concealHistoryModule() {
  const api = historyApi();
  if (!api || !isHistoryShowing(api)) return;
  try {
    if (api.isDocked && api.isDocked()) api.toggle();
  } catch (_) { /* best-effort */ }
}

/** Expand the labelled nav and reveal History as its default module. */
export function openBothModules(opts = {}) {
  if (!isNavModulesOn()) return;
  try { applyMinimalUi(false); } catch (_) { /* already expanded */ }
  try { applyIconRail(false); } catch (_) { /* already labelled */ }
  openHistoryModule();
  if (opts.startNew) {
    const api = historyApi();
    try { api && api.startNew && api.startNew(); } catch (_) { /* no-op */ }
    /* startNew leaves a docked History in place; re-open in case overlay mode
       closed it, and keep the expanded (not icon-rail) module. */
    openHistoryModule();
  }
}

function syncChevronLabel() {
  if (!isNavModulesOn()) return;
  const btn = document.getElementById('topbar-menu-toggle');
  const panel = panelEl();
  if (!btn || !panel || panel.classList.contains('minimal-ui') || panel.classList.contains('mp-pivot')) return;
  const railed = panel.classList.contains('mp-rail');
  const label = railed ? 'Open navigation and History' : 'Collapse to icons';
  btn.setAttribute('aria-label', label);
  btn.setAttribute('title', label);
  btn.setAttribute('data-tip', label);
}

function onMenuRail(ev) {
  if (!isNavModulesOn()) return;
  syncNavModulesChrome();
  const collapsed = ev?.detail?.on === true || (ev?.detail?.on !== false && navIsCollapsed());
  if (collapsed) concealHistoryModule();
  else openHistoryModule();
}

function boot() {
  restoreNavModules();
  document.addEventListener('wise:menu-rail', onMenuRail);
  document.addEventListener('wise:minimal-ui', syncNavModulesChrome);
  document.addEventListener('wise:menu-pivot', syncNavModulesChrome);
  document.addEventListener('wise:chat-history-ready', (ev) => {
    const api = ev?.detail?.api;
    if (api && api.root) liveApi = api;
    if (!isNavModulesOn()) return;
    syncNavModulesChrome();
    if (navIsCollapsed()) concealHistoryModule();
  });
  const existing = typeof window !== 'undefined' ? window.__wiseChatHistory : null;
  if (existing && existing.root) liveApi = existing;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}
