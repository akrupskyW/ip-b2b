/* ------------------------------------------------------------------ */
/* History in navigation                                               */
/* ------------------------------------------------------------------ */
/*
 * Appearance ▸ Layout ▸ History in navigation (Admin-badged). When on, the
 * live History module is relocated into the primary nav as an expandable
 * section — same chevron pattern as WISEcodeAI / WISEcode Admin — so search,
 * new conversation, projects, drag-drop, rename/delete/move, and live dots
 * all keep working. Pages without a mounted History fall back to a nested
 * folder tree (projects + All conversations) read from localStorage.
 *
 * Default OFF. The choice persists so it survives reloads and page changes.
 */

import { applyMinimalUi, applyIconRail } from './topbar.js';

const LS_KEY = 'wise-nav-history';
const HTML_CLASS = 'nav-history';
const GROUP_ID = 'nav-history';
const PENDING_CHAT_KEY = 'wise-search-open-chat';
const WISEAI_STORE = 'wise-chat-history:wiseai';
const STORE_PAGES = {
  'wise-chat-history:wiseai': 'wiseai.html',
  'wise-mkt-chat-history': 'wiseai.html',
  'wise-wiseai-chat-history': 'wiseai.html',
  'wise-chat-history:ai-dashboard': 'ai-dashboard.html',
  'wise-chat-history:studio-ai': 'studio-ai.html',
  'wise-chat-history:reformulation': 'reformulation.html',
  'wise-chat-history:add-product': 'add-product.html',
  'wise-chat-history:add-catalog': 'add-catalog.html',
  'wise-chat-history:product-portfolio': 'product-portfolio.html',
  'wise-chat-history:product-comparison': 'product-comparison.html',
  'wise-chat-history:view-product': 'view-product.html',
  'wise-chat-history:guiding-stars': 'report-guiding-stars.html',
  'wise-chat-history:progress-log': 'progress-log.html',
  'wise-chat-history:accessibility-review': 'accessibility-review.html',
};

const historyApis = new Map();

/** Parked live sidebar while the nav remounts, so innerHTML cannot destroy it. */
let parked = null;

/** True when the user explicitly turned History-in-nav on (default off). */
export function isNavHistoryOn() {
  try { return localStorage.getItem(LS_KEY) === '1'; } catch { return false; }
}

/**
 * Reflect the on/off choice onto the nav + History module.
 * @param {boolean} on
 * @param {boolean} [persist=true]  Restore on load must not write.
 * @param {{ open?: boolean }} [opts]  When turning on, open the new section.
 */
export function applyNavHistory(on, persist = true, opts = {}) {
  const val = !!on;
  if (persist) {
    try { localStorage.setItem(LS_KEY, val ? '1' : '0'); } catch (_) { /* session-only */ }
  }
  document.documentElement.classList.toggle(HTML_CLASS, val);
  if (val) {
    /* The nav list is hidden in Minimal UI and labels are hidden in Icons
       only, so an explicit turn-on expands the full labelled nav so the new
       History section is actually readable. Restore-on-load leaves those
       preferences alone. */
    if (persist) {
      try { applyMinimalUi(false); } catch (_) { /* nav already expanded */ }
      try { applyIconRail(false); } catch (_) { /* labels already visible */ }
    }
    mountGroup({ open: opts.open === true });
  } else unmountGroup();
  try { document.dispatchEvent(new CustomEvent('wise:nav-history', { detail: { on: val } })); } catch (_) {}
}

/** Restore the persisted on/off state without writing storage. */
export function restoreNavHistory() {
  applyNavHistory(isNavHistoryOn(), false);
}

/** Re-inject (or remove) the History group after the nav re-renders. */
export function refreshNavHistory() {
  if (isNavHistoryOn()) mountGroup();
  else unmountGroup();
}

/**
 * Move the live History sidebar out of the nav before the nav's innerHTML is
 * replaced, so the module (and its listeners) is not destroyed.
 */
export function parkNavHistory() {
  releaseSidebar({ restoreChrome: false });
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function pageHref(file) {
  const name = String(file || 'wiseai.html').replace(/^\//, '');
  if (/^https?:/i.test(name) || name.startsWith('../')) return name;
  const inPages = /\/pages(?:\/|$)/.test(location.pathname);
  return inPages ? name : `pages/${name}`;
}

function currentPageFile() {
  const parts = location.pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
}

function navEl() {
  return document.getElementById('agent-menu-nav') || document.querySelector('#menu-panel .menu-nav');
}

function storePage(key) {
  return STORE_PAGES[key] || 'wiseai.html';
}

function readStore(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '{}') || {};
    return {
      items: Array.isArray(raw.items) ? raw.items : [],
      projects: Array.isArray(raw.projects) ? raw.projects : [],
      ungroupedCollapsed: raw.ungroupedCollapsed === true,
    };
  } catch (_) {
    return { items: [], projects: [], ungroupedCollapsed: false };
  }
}

function preferredStoreKey() {
  const page = currentPageFile().replace(/\.html$/, '');
  const pageKey = 'wise-chat-history:' + page;
  try {
    if (page && localStorage.getItem(pageKey)) return pageKey;
  } catch (_) { /* storage blocked */ }
  return WISEAI_STORE;
}

function liveSidebar() {
  const nodes = document.querySelectorAll('.wch-sidebar:not(.wch-right)');
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].querySelector('.wch-list') && nodes[i].querySelector('.wch-search-input')) return nodes[i];
  }
  return null;
}

function apiForSidebar(sidebar) {
  if (!sidebar) return null;
  for (const api of historyApis.values()) {
    if (api && api.root === sidebar) return api;
  }
  /* Chat-history often mounts (and fires ready) before this module evaluates,
     so the ready listener never saw that event. The page stashes the live API
     on window.__wiseChatHistory after mount. */
  const existing = typeof window !== 'undefined' ? window.__wiseChatHistory : null;
  if (existing && existing.root === sidebar) return existing;
  if (existing && !existing.root) return existing;
  return null;
}

/** Drop the docked-module pixel pin (sticky 280px) so History can fill the
 *  260px nav. Inline !important beats the stylesheet; this must run even when
 *  the History API has not been registered yet. */
function fitSidebarToNav(sidebar) {
  if (!sidebar) return;
  sidebar.style.setProperty('flex', '0 1 auto', 'important');
  sidebar.style.setProperty('width', '100%', 'important');
  sidebar.style.setProperty('min-width', '0', 'important');
  sidebar.style.setProperty('max-width', '100%', 'important');
  sidebar.style.setProperty('height', 'auto', 'important');
  sidebar.style.setProperty('box-sizing', 'border-box', 'important');
  sidebar.setAttribute('data-pr-lock', '');
  try { window.WisePaneResize && window.WisePaneResize.release && window.WisePaneResize.release([sidebar]); } catch (_) { /* optional */ }
}

function adoptSidebar(sidebar, host) {
  if (!sidebar || !host) return;
  if (!parked || parked.el !== sidebar) {
    parked = {
      el: sidebar,
      home: { parent: sidebar.parentNode, next: sidebar.nextSibling },
      wasHidden: sidebar.classList.contains('wch-docked-hidden')
        || sidebar.classList.contains('wch-dock-conceal'),
    };
  }
  sidebar.classList.add('wch-in-nav');
  sidebar.classList.remove('wch-docked-hidden', 'wch-dock-conceal', 'wch-dock-reveal');
  host.appendChild(sidebar);
  fitSidebarToNav(sidebar);
  const api = apiForSidebar(sidebar);
  try { api && api.prepareNavEmbed && api.prepareNavEmbed(); } catch (_) { /* best-effort */ }
}

function releaseSidebar({ restoreChrome = true } = {}) {
  const sidebar = (parked && parked.el) || document.querySelector('.wch-sidebar.wch-in-nav');
  if (!sidebar) {
    if (restoreChrome) parked = null;
    return;
  }
  const home = parked && parked.home;
  const wasHidden = parked && parked.wasHidden;
  sidebar.classList.remove('wch-in-nav');
  const api = apiForSidebar(sidebar);
  if (restoreChrome) {
    try { api && api.releaseNavEmbed && api.releaseNavEmbed(); } catch (_) { /* best-effort */ }
    if (wasHidden) sidebar.classList.add('wch-docked-hidden');
    parked = null;
  }
  if (home && home.parent && home.parent.isConnected) {
    if (home.next && home.next.parentNode === home.parent) home.parent.insertBefore(sidebar, home.next);
    else home.parent.appendChild(sidebar);
  }
}

function itemRow(it) {
  const href = pageHref(it.page || 'wiseai.html');
  const live = it.live ? ' menu-nav-history-live' : '';
  return `
    <a class="menu-nav-subitem${live}" href="${esc(href)}" data-nav-history-id="${esc(it.id)}" data-nav-history-key="${esc(it.storageKey)}" data-nav-history-page="${esc(it.page || 'wiseai.html')}" data-depth="2">
      <span class="menu-nav-subicon"><span class="material-symbols-outlined">forum</span></span>
      <span class="menu-nav-label">${esc(it.title)}</span>
    </a>`;
}

function emptyRow(label) {
  return `<div class="menu-nav-subitem menu-nav-history-empty" aria-disabled="true">
      <span class="menu-nav-subicon"><span class="material-symbols-outlined">forum</span></span>
      <span class="menu-nav-label">${esc(label)}</span>
    </div>`;
}

function folderOpen(id, fallback) {
  const nav = navEl();
  const g = nav && nav.querySelector(`[data-group="${id}"]`);
  if (g) return g.dataset.open === 'true';
  return fallback !== false;
}

function folderHtml(id, label, icon, open, childrenHtml) {
  const collapsedAttrs = open ? '' : ' inert aria-hidden="true"';
  return `
    <div class="menu-nav-group menu-nav-subgroup" data-tier="history-folder" data-group="${esc(id)}" data-open="${open ? 'true' : 'false'}">
      <a class="menu-nav-subitem menu-nav-toggle" href="#" data-toggle-group="${esc(id)}" data-toggle-only="true" role="button" aria-expanded="${open ? 'true' : 'false'}" aria-controls="menu-nav-${esc(id)}">
        <span class="menu-nav-subicon"><span class="material-symbols-outlined">${icon}</span></span>
        <span class="menu-nav-label">${esc(label)}</span>
        <button type="button" class="menu-nav-chevron-btn" data-toggle-group="${esc(id)}" aria-label="Toggle ${esc(label)}">
          <span class="menu-nav-chevron"><span class="material-symbols-outlined">expand_more</span></span>
        </button>
      </a>
      <div class="menu-nav-children" id="menu-nav-${esc(id)}" role="region" aria-label="${esc(label)}"${collapsedAttrs}>
        <div class="menu-nav-children-inner menu-nav-tree-inner">
          ${childrenHtml}
        </div>
      </div>
    </div>`;
}

function fallbackTreeHtml() {
  const key = preferredStoreKey();
  const store = readStore(key);
  const page = storePage(key);
  const items = store.items.slice().sort((a, b) => (Number(b.ts) || 0) - (Number(a.ts) || 0));
  const projects = store.projects;
  const parts = [];

  projects.forEach((p) => {
    if (!p || !p.id) return;
    const id = 'nav-hist-p-' + p.id;
    const open = folderOpen(id, p.collapsed !== true);
    const kids = items.filter((it) => it && it.projectId === p.id);
    const children = kids.length
      ? kids.map((it) => itemRow({
          id: it.id,
          title: it.title || 'Conversation',
          live: it.live === true,
          storageKey: key,
          page,
        })).join('')
      : emptyRow('Empty project');
    parts.push(folderHtml(id, p.name || 'Untitled project', open ? 'folder_open' : 'folder', open, children));
  });

  const loose = items.filter((it) => it && !it.projectId);
  const looseId = 'nav-hist-loose';
  const looseOpen = folderOpen(looseId, store.ungroupedCollapsed !== true);
  const looseChildren = loose.length
    ? loose.map((it) => itemRow({
        id: it.id,
        title: it.title || 'Conversation',
        live: it.live === true,
        storageKey: key,
        page,
      })).join('')
    : emptyRow(items.length ? 'All chats are in projects' : 'No conversations yet');
  parts.push(folderHtml(looseId, 'All conversations', looseOpen ? 'folder_open' : 'folder', looseOpen, looseChildren));
  return parts.join('');
}

function groupShellHtml(open) {
  const collapsedAttrs = open ? '' : ' inert aria-hidden="true"';
  return `
    <a class="menu-nav-item menu-nav-toggle" href="#" data-nav-id="${GROUP_ID}" data-toggle-group="${GROUP_ID}" data-toggle-only="true" role="button" aria-expanded="${open ? 'true' : 'false'}" aria-controls="menu-nav-${GROUP_ID}">
      <span class="menu-nav-icon"><span class="material-symbols-outlined">history</span></span>
      <span class="menu-nav-label">History</span>
      <button type="button" class="menu-nav-chevron-btn" data-toggle-group="${GROUP_ID}" aria-label="Toggle History">
        <span class="menu-nav-chevron"><span class="material-symbols-outlined">expand_more</span></span>
      </button>
    </a>
    <div class="menu-nav-children" id="menu-nav-${GROUP_ID}" role="region" aria-label="History"${collapsedAttrs}>
      <div class="menu-nav-children-inner" data-nav-history-host></div>
    </div>`;
}

function syncOpen(group, open) {
  group.dataset.open = open ? 'true' : 'false';
  const toggleEl = group.querySelector(':scope > .menu-nav-toggle');
  if (toggleEl) toggleEl.setAttribute('aria-expanded', open ? 'true' : 'false');
  const childrenEl = group.querySelector(':scope > .menu-nav-children');
  if (childrenEl) {
    if (open) {
      childrenEl.removeAttribute('inert');
      childrenEl.removeAttribute('aria-hidden');
    } else {
      childrenEl.setAttribute('inert', '');
      childrenEl.setAttribute('aria-hidden', 'true');
    }
  }
}

function mountGroup({ open } = {}) {
  const nav = navEl();
  if (!nav) return;
  let group = nav.querySelector(`[data-group="${GROUP_ID}"]`);
  const wasOpen = group ? group.dataset.open === 'true' : false;
  const nextOpen = open === true ? true : wasOpen;
  if (!group) {
    group = document.createElement('div');
    group.className = 'menu-nav-group';
    group.dataset.tier = 'history';
    group.dataset.group = GROUP_ID;
    const overview = nav.querySelector('[data-nav-id="overview"]');
    const wiseai = nav.querySelector('[data-group="wiseai"]');
    if (overview) overview.after(group);
    else if (wiseai) wiseai.after(group);
    else nav.insertBefore(group, nav.firstChild);
  }

  const live = liveSidebar();
  if (live && group.contains(live)) {
    syncOpen(group, nextOpen);
    live.classList.remove('wch-docked-hidden', 'wch-dock-conceal', 'wch-dock-reveal');
    fitSidebarToNav(live);
    const api = apiForSidebar(live);
    try { api && api.prepareNavEmbed && api.prepareNavEmbed(); } catch (_) { /* already embedded */ }
    return;
  }

  group.innerHTML = groupShellHtml(nextOpen);
  syncOpen(group, nextOpen);
  const host = group.querySelector('[data-nav-history-host]');
  if (!host) return;
  if (live) adoptSidebar(live, host);
  else host.innerHTML = fallbackTreeHtml();
  try { document.dispatchEvent(new CustomEvent('wise:nav-tree-layout')); } catch (_) {}
}

function unmountGroup() {
  releaseSidebar({ restoreChrome: true });
  document.querySelector(`[data-group="${GROUP_ID}"]`)?.remove();
}

function navIsCollapsed() {
  const panel = document.getElementById('menu-panel');
  if (!panel) return false;
  return panel.classList.contains('mp-rail') || panel.classList.contains('minimal-ui');
}

/** Expand a collapsed primary nav (icon rail / Minimal UI) so History is readable. */
function revealPrimaryNav() {
  try { applyMinimalUi(false); } catch (_) { /* already expanded */ }
  try { applyIconRail(false); } catch (_) { /* labels already visible */ }
}

function expandGroup() {
  revealPrimaryNav();
  const nav = navEl();
  let group = nav?.querySelector(`[data-group="${GROUP_ID}"]`);
  if (!group) {
    mountGroup({ open: true });
    group = navEl()?.querySelector(`[data-group="${GROUP_ID}"]`);
  }
  if (!group) return;
  syncOpen(group, true);
  group.querySelector('.menu-nav-toggle')?.scrollIntoView({ block: 'nearest' });
}

function openConversation(row) {
  const id = row.getAttribute('data-nav-history-id');
  const key = row.getAttribute('data-nav-history-key') || '';
  const page = row.getAttribute('data-nav-history-page') || 'wiseai.html';
  if (!id) return;
  const api = historyApis.get(key);
  if (api && currentPageFile() === page) {
    try { api.restore(id); } catch (_) { /* restore best-effort */ }
    return;
  }
  try {
    sessionStorage.setItem(PENDING_CHAT_KEY, JSON.stringify({ storageKey: key, id }));
  } catch (_) { /* ignore */ }
  location.href = pageHref(page);
}

function onHistoryReady(ev) {
  const api = ev?.detail?.api;
  const key = ev?.detail?.storageKey;
  if (api && key) historyApis.set(key, api);
  if (isNavHistoryOn()) mountGroup();
}

function wireClicks() {
  if (typeof document === 'undefined' || document.documentElement.dataset.navHistoryWired === '1') return;
  document.documentElement.dataset.navHistoryWired = '1';

  document.addEventListener('click', (ev) => {
    const row = ev.target?.closest?.('[data-nav-history-id]');
    if (!row || row.closest?.('[data-group="' + GROUP_ID + '"]') == null) return;
    ev.preventDefault();
    ev.stopPropagation();
    openConversation(row);
  });

  /* Three-dot "History & Projects" — reveal the nav section instead of the
     sticky module while this mode is on. */
  document.addEventListener('click', (ev) => {
    if (!isNavHistoryOn()) return;
    const item = ev.target?.closest?.('[data-sc="history"]');
    if (!item) return;
    ev.preventDefault();
    ev.stopPropagation();
    expandGroup();
    item.closest('.topbar-popover')?.classList.add('hidden');
  }, true);

  /* History icon in a collapsed primary nav: expand the nav first (and keep
     the History group open) instead of unfolding the live module into the
     54px icon rail. */
  document.addEventListener('click', (ev) => {
    if (!isNavHistoryOn() || !navIsCollapsed()) return;
    const trigger = ev.target?.closest?.('[data-toggle-group="' + GROUP_ID + '"]');
    if (!trigger) return;
    ev.preventDefault();
    ev.stopPropagation();
    expandGroup();
  }, true);
}

function boot() {
  wireClicks();
  /* Ready may have already fired (classic chat-history.js runs during parse;
     this module is deferred). Register the live API so adopt can call
     prepareNavEmbed instead of leaving the sticky 280px pin in place. */
  const existing = typeof window !== 'undefined' ? window.__wiseChatHistory : null;
  if (existing && existing.root) historyApis.set('__live__', existing);
  restoreNavHistory();
}

if (typeof document !== 'undefined') {
  document.addEventListener('wise:chat-history-ready', onHistoryReady);
  document.addEventListener('wise:chat-history-change', () => {
    if (!isNavHistoryOn()) return;
    const live = liveSidebar();
    const group = document.querySelector(`[data-group="${GROUP_ID}"]`);
    /* Live module re-renders itself; only remount when we are on the fallback
       tree or the sidebar has moved out of the nav (e.g. after setDocked). */
    if (live && group && group.contains(live)) return;
    mountGroup();
  });
  window.addEventListener('storage', (e) => {
    if (!e.key || !isNavHistoryOn()) return;
    if (/chat-history|wise-nav-history/.test(e.key)) refreshNavHistory();
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}
