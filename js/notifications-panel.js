/**
 * Notifications Panel — the ONE shared notifications/alerts module for WISE.
 *
 * A framework-free, mountable extraction of the alerts/notifications panel so
 * the exact same component renders from a single source of truth on every page
 * — Portfolio, the agent overviews, and the WISEowl chat — instead of each page
 * shipping its own one-off markup that drifts out of sync. (That drift is how
 * the chat page ended up with a notifications header shorter than its sibling
 * modules: it was hand-rolled separately from the other pages.)
 *
 *   import { mountNotificationsPanel } from './notifications-panel.js';
 *   const alerts = mountNotificationsPanel({
 *     host: document.getElementById('modules-row'),
 *     panelId: 'alerts-panel',
 *     openClass: 'alerts-open',
 *     items: [{ title, sub, icon, tone, ...passthrough }],
 *     renderOptions: { title: 'Notifications', subtitle: '3 new' },
 *     onItem({ item, row, panel, close, index }) { ... },
 *     onMarkAllRead({ panel, open, close }) { ... },
 *   });
 *   alerts.open();
 *
 * The DEFAULT class contract matches the `.alerts-*` / `.notif-row*` rules in
 * agent-page.css and portfolio.css (where `.alerts-panel-header` is pinned to
 * the shared `--panel-header-h` token). Every class is overridable through
 * `renderOptions`, so a page with its own stylesheet (the WISEowl chat shell)
 * can map the same component onto its own class names — header height included —
 * without forking the markup.
 */

/* Tones the row icon understands (see `.notif-ic-*` in the page CSS). Anything
   else falls back to the neutral blue accent so an unknown tone never renders
   an unstyled icon. */
const KNOWN_TONES = ['red', 'amber', 'cyan', 'blue', 'green'];

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toneClass(tone) {
  return KNOWN_TONES.includes(tone) ? tone : 'blue';
}

/* Resolve the full, defaulted render config. Every class/label has an
   agent-page-style default that a caller can override. */
function resolveOptions(items, ro = {}) {
  const footerLabel = ro.footerLabel !== undefined ? ro.footerLabel
    : (ro.markAllLabel !== undefined ? ro.markAllLabel : 'Mark all as read');
  return {
    title: ro.title !== undefined ? ro.title : 'Notifications',
    subtitle: ro.subtitle !== undefined ? ro.subtitle : `${items.length} new`,
    footerLabel,
    footerIcon: ro.footerIcon !== undefined ? ro.footerIcon : 'done_all',
    headerIcon: ro.headerIcon !== undefined ? ro.headerIcon : 'notifications',
    controlsHtml: ro.controlsHtml || '',
    innerClass: ro.innerClass || 'alerts-inner',
    headerClass: ro.headerClass || 'alerts-panel-header',
    iconClass: ro.iconClass || 'alerts-panel-icon',
    titlesWrapClass: ro.titlesWrapClass || 'alerts-panel-titles',
    titleClass: ro.titleClass || 'alerts-panel-title',
    subtitleClass: ro.subtitleClass || 'alerts-panel-sub',
    bodyClass: ro.bodyClass || 'alerts-panel-body',
    footerClass: ro.footerClass || 'alerts-panel-footer',
    footerBtnClass: ro.footerBtnClass || 'notif-view-all',
    itemClass: ro.itemClass || 'notif-row',
    itemIconClass: ro.itemIconClass || 'notif-row-icon',
    itemBodyClass: ro.itemBodyClass || 'notif-row-body',
    itemTitleClass: ro.itemTitleClass || 'notif-row-title',
    itemSubClass: ro.itemSubClass || 'notif-row-sub',
    tonePrefix: ro.tonePrefix || 'notif-ic-',
  };
}

/* One notification row. `data-notif` carries the item index so a delegated
   click can resolve back to the source item without per-row listeners. */
function rowHtml(item, i, o) {
  return `
    <button type="button" class="${o.itemClass}" data-notif="${i}">
      <span class="${o.itemIconClass} ${o.tonePrefix}${esc(toneClass(item.tone))}"><span class="material-symbols-outlined">${esc(item.icon || 'notifications')}</span></span>
      <div class="${o.itemBodyClass}">
        <div class="${o.itemTitleClass}">${esc(item.title)}</div>
        <div class="${o.itemSubClass}">${esc(item.sub)}</div>
      </div>
    </button>`;
}

/* Full panel inner markup, assembled from the resolved (defaulted) options. */
function innerHtml(items, o) {
  const rows = items.map((it, i) => rowHtml(it, i, o)).join('');
  const footer = o.footerLabel === ''
    ? ''
    : `
      <div class="${o.footerClass}">
        <button type="button" class="${o.footerBtnClass}" data-action="mark-all-read">
          ${o.footerIcon ? `<span class="material-symbols-outlined">${esc(o.footerIcon)}</span>` : ''}
          ${esc(o.footerLabel)}
        </button>
      </div>`;
  return `
    <div class="${o.innerClass}">
      <header class="${o.headerClass}">
        <div class="${o.iconClass}"><span class="material-symbols-outlined">${esc(o.headerIcon)}</span></div>
        <div class="${o.titlesWrapClass}">
          <div class="${o.titleClass}">${esc(o.title)}</div>
          ${o.subtitle === '' ? '' : `<div class="${o.subtitleClass}">${esc(o.subtitle)}</div>`}
        </div>
        ${o.controlsHtml}
      </header>
      <div class="${o.bodyClass}">${rows}</div>${footer}
    </div>`;
}

/**
 * Mount (or reuse) the shared notifications panel inside `host`.
 *
 * @param {object} cfg
 *   host         {HTMLElement} container the panel is appended to (e.g. #modules-row)
 *   panelId      {string}      id for the panel element (default 'alerts-panel')
 *   openClass    {string}      class toggled to reveal the panel (default 'alerts-open')
 *   items        {Array}       [{ title, sub, icon, tone, ...passthrough }]
 *   renderOptions{object}      title/subtitle/labels + class overrides (see resolveOptions)
 *   onItem       {fn}          ({ item, row, panel, close, open, index }) => void
 *   onMarkAllRead{fn}          ({ panel, open, close }) => void
 * @returns {{ open, close, isOpen, setItems, panel }} controller, or null
 */
export function mountNotificationsPanel(cfg = {}) {
  const host = cfg.host || document.getElementById('modules-row');
  if (!host) return null;

  const panelId = cfg.panelId || 'alerts-panel';
  const openClass = cfg.openClass || 'alerts-open';
  let items = Array.isArray(cfg.items) ? cfg.items.slice() : [];
  let o = resolveOptions(items, cfg.renderOptions);

  /* Reuse an existing panel of this id (so a page can pre-place an empty
     `<aside id="…">` shell in its markup) and re-mount idempotently. */
  let panel = host.querySelector(`#${panelId}`) || document.getElementById(panelId);
  if (!panel) {
    panel = document.createElement('aside');
    panel.id = panelId;
    host.appendChild(panel);
  } else if (panel.parentElement !== host) {
    host.appendChild(panel);
  }
  panel.setAttribute('aria-label', o.title);

  function render() { panel.innerHTML = innerHtml(items, o); }
  render();

  const isOpen = () => panel.classList.contains(openClass);

  function open() {
    panel.classList.add(openClass);
    /* The panel lives in the horizontally-scrolling modules row; bring it into
       view the same way the inline implementation did. */
    requestAnimationFrame(() => {
      try { panel.scrollIntoView({ behavior: 'smooth', inline: 'end', block: 'nearest' }); } catch (_) {}
    });
  }

  function close() { panel.classList.remove(openClass); }

  /* Swap the notification list at runtime (e.g. after new alerts arrive),
     keeping the subtitle count in sync unless the caller pinned its own. */
  function setItems(next, nextSubtitle) {
    items = Array.isArray(next) ? next.slice() : [];
    const pinnedSubtitle = cfg.renderOptions && cfg.renderOptions.subtitle !== undefined;
    o = resolveOptions(items, cfg.renderOptions);
    if (nextSubtitle !== undefined) o.subtitle = nextSubtitle;
    else if (pinnedSubtitle) o.subtitle = cfg.renderOptions.subtitle;
    render();
  }

  const api = { open, close, isOpen, setItems, panel };

  panel.addEventListener('click', (e) => {
    const markAll = e.target.closest('[data-action="mark-all-read"]');
    if (markAll) {
      e.preventDefault();
      if (typeof cfg.onMarkAllRead === 'function') cfg.onMarkAllRead(api);
      else close();
      return;
    }
    const rowEl = e.target.closest('.notif-row[data-notif], [data-notif]');
    if (rowEl && panel.contains(rowEl)) {
      e.preventDefault();
      const index = Number(rowEl.dataset.notif);
      const item = items[index];
      if (typeof cfg.onItem === 'function') {
        cfg.onItem({ item, row: rowEl, panel, close, open, index });
      } else {
        rowEl.classList.add('is-read');
        close();
      }
    }
  });

  return api;
}
