/* ------------------------------------------------------------------ */
/* Nav & History icons                                                 */
/* ------------------------------------------------------------------ */
/*
 * Appearance ▸ Layout ▸ Nav & History icons (Admin-badged). Sibling of
 * History in navigation: that mode merges History into the nav; this one
 * keeps them as two default modules and gives them a shared collapsed
 * chrome — logo bug, menu, expand chevron, new chat (blue circle).
 *
 * Collapsed (icon rail): those four icons. The hamburger toggles the labelled
 * navigation; the chevron toggles History. They are independent — opening one
 * leaves the other as it was, so the labelled nav and History can be open at
 * the same time, and clicking a control only closes its own module. While
 * History is open the chevron and new-chat hide (History carries its own
 * collapse and new conversation), but the hamburger stays so the nav can
 * still be opened or collapsed alongside it. New conversation starts a thread
 * without forcing either module open. The new-chat control is a circle,
 * matching History.
 *
 * Default ON (no stored value). v2 key — the v1 key was written to "0"
 * whenever the labelled nav opened (hamburger) or History-in-nav turned on,
 * which locked later visits into the old off default. An explicit off on
 * this key still stays off. Keep the FOUC guard in js/text-size-fouc.js
 * in sync with this key and default.
 */

import { applyMinimalUi, applyIconRail } from './topbar.js';

const LS_KEY = 'wise-nav-modules-v2';
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
       Minimal UI down so the four icons actually show. Icons only is the
       load default for this mode — paint the rail even on restore so a
       leftover expanded preference cannot hide it. */
    try { applyMinimalUi(false, persist); } catch (_) { /* already expanded */ }
    /* Always persist Icons only on with this mode: hamburger expand is
       in-session only (persist false), so a leftover "0" cannot hide the
       four-icon rail on the next load. */
    try { applyIconRail(true); } catch (_) { /* already railed */ }
    /* Roll / Crawl hide History entirely. WISEcodeAI is the one surface whose
       sticky History starts open otherwise — don't tuck it on Walk / Run.
       An icon-rail leftover still counts as "open" for that default, but it
       duplicates this chrome, so tuck it. */
    if (!historyAllowed() || !historyStartsOpen() || isHistoryRail()) concealHistoryModule();
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
    document.documentElement.classList.remove('nav-modules-hist-open');
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
  syncOpenChrome();
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

/** Appearance ▸ Roll · Crawl · Walk · Run is on, and the mode is Roll or
 *  Crawl — chat is gone, so History must not appear in the primary nav. */
function isCwrSaas() {
  const r = document.documentElement;
  return r.classList.contains('cwr-ui-on')
    && (r.classList.contains('cwr-roll') || r.classList.contains('cwr-crawl'));
}

function historyAllowed() {
  return !isCwrSaas();
}

let histObs = null;
function watchHistoryRoot() {
  const el = historyApi() && historyApi().root;
  if (!el || (histObs && histObs._el === el)) return;
  if (histObs) {
    try { histObs.disconnect(); } catch (_) {}
    histObs = null;
  }
  histObs = new MutationObserver(() => {
    if (!isNavModulesOn()) return;
    syncOpenChrome();
    syncChevronLabel();
  });
  histObs._el = el;
  histObs.observe(el, { attributes: true, attributeFilter: ['class'] });
}

function historyStartsOpen(api) {
  const el = (api || historyApi()) && (api || historyApi()).root;
  return !!(el && el.hasAttribute('data-wch-open-default'));
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
  if (!historyAllowed()) return;
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
  if (!api) return;
  try {
    /* Roll / Crawl: chat is gone, so History must actually close — not sit
       as a collapsed rail in the gutter. */
    if (!historyAllowed()) {
      if (api.close) api.close();
      else if (isHistoryShowing(api) && api.toggle) api.toggle();
      return;
    }
    if (api.isDocked && api.isDocked()) {
      if (api.isRail && api.isRail() && typeof api.setRail === 'function') {
        api.setRail(true, false);
        return;
      }
      if (isHistoryShowing(api)) api.toggle();
    } else if (api.close) api.close();
  } catch (_) { /* best-effort */ }
}

/** Hamburger: toggle the labelled nav. Independent of History — an open
 *  History stays open, so the two modules can sit side by side, and this
 *  control only ever opens or collapses the nav. */
function toggleNavModule() {
  if (!isNavModulesOn()) return;
  try { applyMinimalUi(false); } catch (_) { /* already expanded */ }
  const collapse = !navIsCollapsed();
  try { applyIconRail(collapse, false); } catch (_) { /* already in state */ }
  syncNavModulesChrome();
}

/** Chevron: toggle History. Independent of the nav — the labelled nav keeps
 *  whatever state it was in, so this control only ever opens or closes
 *  History. */
function toggleHistoryModule() {
  if (!isNavModulesOn() || !historyAllowed()) return;
  try { applyMinimalUi(false); } catch (_) { /* already expanded */ }
  if (isHistoryFull()) {
    pendingLayout = null;
    concealHistoryModule();
  } else {
    pendingLayout = 'hist-full';
    openHistoryModule({ rail: false });
  }
  syncNavModulesChrome();
}

function startNewConversation() {
  if (!historyAllowed()) return;
  const api = historyApi();
  try { api && api.startNew && api.startNew(); } catch (_) { /* no-op */ }
}

function isDesktop() {
  try { return !window.matchMedia('(max-width: 768px)').matches; } catch (_) { return true; }
}

/** Mark when History is fully open so CSS can drop the repeated chevron
 *  and new-chat on the nav rail (History has its own of both). */
function syncOpenChrome() {
  const on = isNavModulesOn() && isHistoryFull();
  document.documentElement.classList.toggle('nav-modules-hist-open', on);
}

function syncChevronLabel() {
  if (!isNavModulesOn()) return;
  const btn = document.getElementById('topbar-menu-toggle');
  const panel = panelEl();
  if (!btn || !panel || panel.classList.contains('mp-pivot')) return;
  const histOpen = isHistoryFull();
  const label = histOpen ? 'Close History' : 'Open History';
  btn.setAttribute('aria-label', label);
  btn.setAttribute('title', label);
  btn.setAttribute('data-tip', label);
  btn.setAttribute('aria-pressed', histOpen ? 'true' : 'false');
  const icon = btn.querySelector('.material-symbols-outlined');
  if (icon) icon.textContent = histOpen ? 'chevron_left' : 'chevron_right';
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
  /* The chevron only ever toggles History, whatever the nav is doing — the
     hamburger owns the nav. Roll / Crawl can take History out of the nav
     entirely, in which case there is nothing to toggle. */
  if (historyAllowed()) toggleHistoryModule();
}

/** Roll / Crawl hid an open History; restore it when Walk / Run comes back. */
let hidForCwr = false;

function syncCwrHistory() {
  if (!historyAllowed()) {
    if (isHistoryShowing(historyApi())) hidForCwr = true;
    pendingLayout = null;
    concealHistoryModule();
    document.documentElement.classList.remove('nav-modules-hist-open');
  } else if (hidForCwr) {
    hidForCwr = false;
    openHistoryModule({ rail: false });
  }
  if (isNavModulesOn()) syncNavModulesChrome();
}

function boot() {
  restoreNavModules();
  document.addEventListener('click', onChevronClick, true);
  document.addEventListener('wise:menu-rail', onMenuRail);
  document.addEventListener('wise:minimal-ui', syncNavModulesChrome);
  document.addEventListener('wise:menu-pivot', syncNavModulesChrome);
  document.addEventListener('wise:cwr-ui', syncCwrHistory);
  window.addEventListener('wise:cwr-mode', syncCwrHistory);
  window.addEventListener('storage', (e) => {
    if (e.key === 'wise-cwr-mode' || e.key === 'wise-cwr-ui') syncCwrHistory();
  });
  document.addEventListener('wise:chat-history-ready', (ev) => {
    const api = ev?.detail?.api;
    if (api && api.root) liveApi = api;
    watchHistoryRoot();
    if (!isNavModulesOn()) return;
    syncNavModulesChrome();
    if (!historyAllowed()) {
      if (historyStartsOpen(api || historyApi()) || isHistoryShowing(api || historyApi())) hidForCwr = true;
      concealHistoryModule();
      return;
    }
    if (pendingLayout === 'hist-full') openHistoryModule({ rail: false });
    else if (isHistoryRail(api || historyApi()) || !historyStartsOpen(api || historyApi())) concealHistoryModule();
  });
  const existing = typeof window !== 'undefined' ? window.__wiseChatHistory : null;
  if (existing && existing.root) liveApi = existing;
  watchHistoryRoot();
  syncCwrHistory();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}
