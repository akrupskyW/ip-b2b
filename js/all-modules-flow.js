/**
 * All Modules — an admin "kitchen sink" that indexes every module in the app
 * and hosts the brand-new Icon Inventory module.
 *
 * Rendered into #agent-main-scroll on pages/all-modules.html via the shared
 * agent shell (js/agent-overview.js), keyed off `<body data-nav-id="all-modules">`.
 *
 * Four modules live here:
 *   1. Module Directory — every workspace, portfolio, studio, reformulation,
 *      report, verification, admin, account, auth and marketing surface in the
 *      app, as linked poster cards grouped by area. Driven off one curated map
 *      (MODULE_SECTIONS) so pages that host several modules (the WISEcodeAI studio's
 *      Chat / History / Data Sources / Turns / Report builder, and Reformulation's
 *      Studio + Dashboard) each get their own card, with a final de-dup pass so
 *      nothing appears twice.
 *   2. Icon Inventory — every Material Icons / Symbols glyph used in the live
 *      app (this page excluded), grouped by surface (chat, primary nav, …),
 *      with family, label, and placements. Scanned by
 *      scripts/scan_icons.py into js/icon-inventory-data.js.
 *   3. Design System — the app's typography (families, live type scale, usage)
 *      and every color/radius/shadow token from pages/wise.css, rendered as
 *      live swatches that resolve their computed value in the current theme
 *      (and re-resolve when the theme flips).
 *   3b. Analytics Types — every chart and graph from analytics-types.html,
 *      as live thumbnails that open full size. The list lives in
 *      js/analytics-types-catalog.js so a new chart on that page is one
 *      catalog entry away from appearing here (and on that page’s rail).
 *   4. Component Library — every reusable component rendered LIVE using the
 *      real global classes from pages/wise.css, with interaction states
 *      (Default / Hover / Open), Light and Dark theme versions, and the
 *      exact surfaces where it is used. Chat chrome (activity strip, transcript
 *      actions, sticky drawers / the utility belt) lives here as its own family.
 *      Charts & graphs is its own category — the same thumbnail catalog.
 *   5. Codebase — sits apart above the alphabetical catalog. Score cards for the
 *      size of the app itself: lines of code
 *      by file type with an up/down trend (one git snapshot per day), the
 *      HTML page count, and the real project size on disk (every shippable
 *      file — images, video, and the rest — not just the scripts this tab
 *      downloaded). scripts/scan_code_stats.py writes the git series into
 *      js/code-stats-data.js and the byte inventory into
 *      js/project-inventory-data.js. Re-evaluate live-crawls from that
 *      inventory when you click it so the "now" numbers never sit on a stale
 *      snapshot. It does not run on page load.
 *   6. Motion & Resize — every animation (count-up, chart replay, streaming,
 *      chip shimmer / fly-in, toast rise/leave, chat composer sheen, welcome
 *      helix, thinking helix, accordion) and every drag/resize interaction
 *      (module splitter, width tiers, carousel rail, reorder, drag-to-file),
 *      explained and rendered live.
 *   6b. Responsiveness — how every surface adapts on a phone, on a 14-inch
 *      laptop, and on anything larger: nav drawer, stacked modules, carded
 *      tables, chat width default, marketing collapse. Live stage + catalog.
 *   7. App Logic — the app's general behavioral rules written down and grouped
 *      by page: auth, theme, nav, panes, tables, wizard gating, scoring math,
 *      filter semantics and persistence. Sits directly above Intent Chip
 *      Logic, which audits the one narrow slice of logic the chips own.
 *      Catalog in js/app-logic-data.js — loaded the first time that
 *      accordion opens, not on first paint.
 *   8. Transcript Architecture — one frozen conversation that shows the
 *      whole stack at once: chats, activity, the landmark strip, turns,
 *      tokens, outputs, and versions, each labeled with an arrow.
 *
 * First paint is the hero, jump tiles, and section headers only. Each
 * accordion body (and the Icon Inventory / App Logic catalogs) is built
 * when that section opens.
 */

import { CODE_STATS } from './code-stats-data.js';
import { isNudgeDismissed } from './nudge-toast-dismiss.js';
import './date-column.js';
import { makeTraceHelix, measureTraceRungCentres, TRACE_STRAND_MARKUP } from './trace-helix.js';
import { MODULE_SECTIONS, AREA_ICONS } from './module-directory-data.js';
import { DEV_READY_SEED } from './dev-ready-data.js';
import { AI_READY_SEED } from './ai-ready-data.js';
import { AVATAR_PRESETS, avatarPresetSrc } from './avatar-presets.js';
import { JAM_SONGS, eqBarsMarkup, helixVizMarkup, selectJam, toggleJam } from './jam-strip.js';
import {
  ANALYTICS_GALLERY,
  ANALYTICS_HREF,
  analyticsById,
  analyticsFocusSel,
  analyticsOpenHref,
} from './analytics-types-catalog.js';

/* Icon Inventory (~400 KB) and App Logic (~90 KB) stay off the first-paint
   graph. They load the first time that accordion, search, or a chat chip
   needs them. Last-scan totals keep the jump tiles honest before then. */
let ICON_INVENTORY = null;
let APP_LOGIC = [];
let LOGIC_AREAS = [];
const ICON_UNIQUE_FALLBACK = 397;
const LOGIC_RULES_FALLBACK = 205;

async function ensureIconInventory() {
  if (ICON_INVENTORY) return ICON_INVENTORY;
  const m = await import('./icon-inventory-data.js');
  ICON_INVENTORY = m.ICON_INVENTORY;
  _globalIndex = null;
  return ICON_INVENTORY;
}

async function ensureAppLogic() {
  if (APP_LOGIC && APP_LOGIC.length) return APP_LOGIC;
  const m = await import('./app-logic-data.js');
  APP_LOGIC = m.APP_LOGIC;
  LOGIC_AREAS = m.LOGIC_AREAS;
  _globalIndex = null;
  return APP_LOGIC;
}

let _invLoad = null;
function ensureProjectInventory() {
  const have = projectInventory();
  if (have) return Promise.resolve(have);
  if (_invLoad) return _invLoad;
  _invLoad = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = new URL('./project-inventory-data.js', import.meta.url).href;
    s.onload = () => resolve(projectInventory());
    s.onerror = () => {
      _invLoad = null;
      reject(new Error('project inventory failed to load'));
    };
    document.head.appendChild(s);
  });
  return _invLoad;
}

const SECTION_BLURBS = {
  'mi-code': 'Size, files, and daily trend',
  'mi-directory': 'Every screen, grouped by area',
  'mi-tables': 'Every live data table, collected',
  'mi-analytics': 'Every chart, as thumbnails',
  'mi-logic': 'Rules the app actually runs',
  'mi-intents': 'Welcome chips and their wiring',
  'mi-trace': 'Thinking animation in three states',
  'mi-tarch': 'One conversation, every piece labeled',
  'mi-motion': 'Every animation and resize interaction',
  'mi-responsive': 'How layouts adapt across sizes',
  'mi-icons': 'Every Material glyph in use',
  'mi-design': 'Fonts, type scale, and tokens',
  'mi-components': 'Reusable components rendered with real classes',
};

/* Codebase sits apart as the size index. Everything else is A–Z by title. */
const ACC_CATALOG_IDS = [
  'mi-analytics',
  'mi-logic',
  'mi-components',
  'mi-design',
  'mi-icons',
  'mi-intents',
  'mi-directory',
  'mi-motion',
  'mi-responsive',
  'mi-trace',
  'mi-tables',
  'mi-tarch',
];
const ACC_SECTION_IDS = ['mi-code'].concat(ACC_CATALOG_IDS);

function miHeadOnly(id, title, lede, extras) {
  const blurb = SECTION_BLURBS[id] || '';
  const cls = 'mi-module is-collapsed' + (id === 'mi-code' ? ' mi-acc--index' : '');
  return `<section class="${cls}" id="${id}">
    <header class="mi-module-head">
      <div class="mi-module-head-text">
        <h2 class="mi-module-title">${title}</h2>
        ${blurb ? `<p class="mi-module-blurb">${blurb}</p>` : ''}
        <p class="mi-module-lede">${lede}</p>
      </div>
      ${extras || ''}
    </header>
  </section>`;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* Module Directory catalog lives in js/module-directory-data.js so the
   full-screen Page Gallery can render the same list without pulling this
   file along with it. */

function moduleCard(m) {
  const badge = m.badge ? `<span class="mi-card-badge">${esc(m.badge)}</span>` : '';
  const group = m.group ? `<span class="mi-card-group">${esc(m.group)}</span>` : '';
  const comps = componentsUsedByModule(m);
  const search = `${m.label} ${m.href} ${m.group || ''} ${m.badge || ''} ${comps.map((c) => c.name).join(' ')}`.toLowerCase();
  return `
    <div class="mi-card" data-mod-card data-search="${esc(search)}" data-href="${esc(m.href)}" data-area="${esc(m.area || '')}">
      <a class="mi-card-main" href="${esc(m.href)}">
        <span class="mi-card-ic"><span class="material-symbols-outlined">${esc(m.icon || 'widgets')}</span></span>
        <span class="mi-card-body">
          <span class="mi-card-name">${esc(m.label)}${badge}</span>
          <span class="mi-card-href">${esc(m.href)}</span>
          ${group}
        </span>
        <span class="mi-card-go material-symbols-outlined" aria-hidden="true">arrow_outward</span>
      </a>
      ${paneCompsHTML(comps, 'Components used', { ai: false })}
    </div>`;
}

/* One rail pane = the ACTUAL module, rendered live in an iframe and scaled down
   to a tall preview so you can see the real screen. The frame is non-interactive
   (pointer-events:none); the whole pane links out to open the real page. Carries
   the same data-search / data-area hooks so the search + area filters apply. */
/* Some pages self-redirect for a logged-in visitor (the auth screens bounce to
   the product landing, index.html bounces to the overview). In a live preview
   that makes every one of them render the SAME redirected page instead of the
   screen the pane is labelled with. Tag the iframe URL with `?preview=1` so
   those guards can recognise an embedded preview and stay put. Only the iframe
   carries the flag — the pane's data-href + "open" link stay clean so link
   validation and real navigation are unaffected. */
function previewSrc(href) {
  if (!href || href === '#') return href;
  const [path, hash = ''] = String(href).split('#');
  const sep = path.indexOf('?') === -1 ? '?' : '&';
  return `${path}${sep}preview=1${hash ? '#' + hash : ''}`;
}

function pageFileName(href) {
  return String(href || '').split('#')[0].split('?')[0].split('/').pop();
}

/* Never live-preview these: all-modules would iframe itself (and spawn
   another ~80 full app documents); the gallery is a viewer of this catalog. */
const SKIP_PREVIEW_FILES = { 'all-modules.html': 1, 'page-gallery.html': 1 };

function canLivePreview(href) {
  return !SKIP_PREVIEW_FILES[pageFileName(href)];
}

/* Preview frames start with data-src only. Chrome ignores loading="lazy" on
   iframes injected via innerHTML, so a real src here boots every screen in
   the catalog on first paint — including this page, recursively. */
function frameMarkup(src, title, extraAttrs) {
  if (!src) {
    return `<span class="mi-pane-skip">Live preview skipped — this screen would embed itself.</span>`;
  }
  const extra = extraAttrs ? ' ' + extraAttrs : '';
  return `<iframe class="mi-pane-frame" data-src="${esc(src)}" title="${esc(title)}" loading="lazy" tabindex="-1" aria-hidden="true"${extra}></iframe>`;
}

function paneCard(m) {
  const comps = componentsUsedByModule(m);
  const search = `${m.label} ${m.href} ${m.group || ''} ${m.badge || ''} ${comps.map((c) => c.name).join(' ')}`.toLowerCase();
  const src = canLivePreview(m.href) ? previewSrc(m.href) : '';
  return `
    <div class="mi-pane" data-pane data-href="${esc(m.href)}" data-search="${esc(search)}" data-area="${esc(m.area)}">
      <div class="mi-pane-head">
        <span class="mi-pane-ic material-symbols-outlined" aria-hidden="true">${esc(m.icon || 'widgets')}</span>
        <span class="mi-pane-name">${esc(m.label)}</span>
        <span class="mi-pane-area">${esc(m.areaTitle)}</span>
      </div>
      <a class="mi-pane-viewport" href="${esc(m.href)}" aria-label="Open ${esc(m.label)}">
        ${frameMarkup(src, m.label + ' preview')}
        <span class="mi-pane-open material-symbols-outlined">open_in_new</span>
      </a>
      ${paneCompsHTML(comps, 'Components used', { ai: false })}
    </div>`;
}

/* The rail: one horizontal track of every module rendered live as a tall pane,
   side by side, with prev/next arrows — the whole app on a single page. */
function renderRail(mods) {
  return `
    <div class="mi-rail" id="mi-rail" hidden>
      <button type="button" class="mi-rail-nav" data-rail-prev aria-label="Scroll left"><span class="material-symbols-outlined">chevron_left</span></button>
      <div class="mi-rail-track" id="mi-rail-track">
        ${mods.map(paneCard).join('')}
      </div>
      <button type="button" class="mi-rail-nav" data-rail-next aria-label="Scroll right"><span class="material-symbols-outlined">chevron_right</span></button>
      <div class="mi-rail-empty" id="mi-rail-empty" hidden>No modules match your search.</div>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Per-module control cluster (three-dot menu)                        */
/*                                                                    */
/* Every module pane on this page carries a more-options (⋯) menu of   */
/* its own on-page controls. Width is handled once by the main panel   */
/* width toggle at the very top, so modules don't repeat it. These     */
/* clusters reuse the globally-styled .panel-controls / .panel-more-btn */
/* / .topbar-popover classes so they match the rest of the app.       */
/* ------------------------------------------------------------------ */

/* The three-dot menu items per module — each maps to a real on-page control
   so the menu does exactly what the module's own toolbar does. */
function moduleMoreItems(moduleId) {
  if (moduleId === 'mi-icons') {
    return [
      { action: 'ii-name', icon: 'sort_by_alpha', label: 'Sort A–Z' },
      { action: 'ii-count', icon: 'trending_up', label: 'Sort by most used' },
      { action: 'ii-all', icon: 'restart_alt', label: 'Show all icons' },
    ];
  }
  if (moduleId === 'mi-design') {
    return [
      { action: 'ds-type', icon: 'text_fields', label: 'Jump to typography' },
      { action: 'ds-colors', icon: 'palette', label: 'Jump to color tokens' },
      { action: 'ds-reset-colors', icon: 'restart_alt', label: 'Reset color tokens' },
    ];
  }
  if (moduleId === 'mi-components') {
    return [
      { action: 'dsc-clear', icon: 'restart_alt', label: 'Clear filter' },
      { action: 'ds-jump', icon: 'design_services', label: 'Jump to Design System' },
    ];
  }
  if (moduleId === 'mi-code') {
    return [
      { action: 'code-7', icon: 'calendar_view_week', label: 'Trend · last 7 days' },
      { action: 'code-30', icon: 'calendar_month', label: 'Trend · last 30 days' },
      { action: 'code-all', icon: 'timeline', label: 'Trend · all time' },
    ];
  }
  if (moduleId === 'mi-logic') {
    return [
      { action: 'logic-all', icon: 'rule', label: 'Show every rule' },
      { action: 'logic-shared', icon: 'hub', label: 'Show app-wide rules' },
      { action: 'logic-intents', icon: 'bolt', label: 'Jump to Intent Chip Logic' },
      { action: 'logic-clear', icon: 'restart_alt', label: 'Clear search' },
    ];
  }
  if (moduleId === 'mi-intents') {
    return [
      { action: 'int-all', icon: 'apps', label: 'Show all chips' },
      { action: 'int-talk', icon: 'bolt', label: 'Show chips needing logic' },
      { action: 'int-act', icon: 'chat_bubble', label: 'Show chips needing transcript' },
      { action: 'int-clear', icon: 'restart_alt', label: 'Clear search' },
    ];
  }
  if (moduleId === 'mi-tables') {
    return [
      { action: 'tbl-start', icon: 'first_page', label: 'Back to start' },
      { action: 'tbl-clear', icon: 'restart_alt', label: 'Clear search' },
    ];
  }
  if (moduleId === 'mi-analytics') {
    return [
      { action: 'az-clear', icon: 'restart_alt', label: 'Clear search' },
    ];
  }
  if (moduleId === 'mi-trace') {
    return [
      { action: 'trace-replay', icon: 'replay', label: 'Replay trace' },
    ];
  }
  if (moduleId === 'mi-motion') {
    return [
      { action: 'motion-replay', icon: 'replay', label: 'Replay all motion' },
      { action: 'motion-anim', icon: 'animation', label: 'Show animations' },
      { action: 'motion-drag', icon: 'drag_indicator', label: 'Show drag & resize' },
    ];
  }
  if (moduleId === 'mi-responsive') {
    return [
      { action: 'resp-mobile', icon: 'smartphone', label: 'Show mobile' },
      { action: 'resp-laptop', icon: 'laptop_mac', label: 'Show laptop' },
      { action: 'resp-larger', icon: 'desktop_windows', label: 'Show larger' },
    ];
  }
  return [
    { action: 'dir-reeval', icon: 'autorenew', label: 'Re-evaluate project' },
    { action: 'dir-hard', icon: 'restart_alt', label: 'Hard reload page' },
    { action: 'dir-gallery', icon: 'browse_gallery', label: 'Open page gallery' },
    { action: 'dir-grid', icon: 'grid_view', label: 'Grid view' },
    { action: 'dir-rail', icon: 'view_column', label: 'Rail view' },
    { action: 'dir-clear', icon: 'restart_alt', label: 'Clear filters' },
  ];
}

function moduleControlsHTML(_moduleId) {
  /* Accordion headers never carry a ⋯. Do not restore this markup. */
  return '';
}

function directorySection(sec) {
  const { title, tone, modules } = sec;
  if (!modules.length) return '';
  return `
    <section class="mi-dir-section" data-area="${esc(tone)}">
      <div class="mi-dir-head">
        <h3 class="mi-dir-title">${esc(title)}</h3>
        <span class="mi-dir-count">${modules.length}</span>
        ${readyToggleHTML('dir:' + tone, title, { level: 'item', parent: 'mi-directory', ai: false })}
      </div>
      <div class="mi-card-grid">${modules.map(moduleCard).join('')}</div>
    </section>`;
}

function renderDirectory(opts) {
  if (opts && opts.headOnly) {
    return miHeadOnly('mi-directory', 'Module Directory',
      'Every module and screen in the app, grouped by area. Pages that host more than one module — the WISEcodeAI studio (Chat, History, Data Sources, Turns, Report builder) and Reformulation (Studio + Dashboard) — are broken out so each module appears exactly once.',
      moduleReadyToggleHTML('mi-directory', 'Module Directory', { ai: false }) + moduleControlsHTML('mi-directory'));
  }
  /* De-dupe by full href (hash included) so a module never appears twice, while
     letting two modules that live on the same page but at different anchors —
     e.g. Chat vs wiseai.html#history, or the Reformulation Studio vs
     Dashboard — each keep their own card. First occurrence wins. */
  const sections = dedupedDirSections();
  const total = sections.reduce((n, s) => n + s.modules.length, 0);

  const scorecards = [
    `<button type="button" class="mi-stat is-active" data-area="all" aria-pressed="true">
       <span class="mi-stat-num">${total}</span>
       <span class="mi-stat-label"><span class="mi-stat-text">All modules</span><span class="material-symbols-outlined">apps</span></span>
     </button>`,
    ...sections.map(
      (s) => `<button type="button" class="mi-stat" data-area="${esc(s.tone)}" aria-pressed="false">
        <span class="mi-stat-num">${s.modules.length}</span>
        <span class="mi-stat-label"><span class="mi-stat-text">${esc(s.title)}</span><span class="material-symbols-outlined">${esc(AREA_ICONS[s.tone] || 'folder')}</span></span>
      </button>`
    ),
  ].join('');

  /* Flat list (every module tagged with its area) that feeds the rail. */
  const flat = [];
  sections.forEach((s) => s.modules.forEach((m) => flat.push({ ...m, area: s.tone, areaTitle: s.title })));

  return `
    <section class="mi-module is-collapsed" id="mi-directory">
      <header class="mi-module-head">
        <div class="mi-module-head-text">
          <h2 class="mi-module-title">Module Directory</h2>
          <p class="mi-module-lede">Every module and screen in the app, grouped by area. Pages that host more
            than one module — the WISEcodeAI studio (Chat, History, Data Sources, Turns, Report builder)
            and Reformulation (Studio + Dashboard) — are broken out so each module appears exactly once.</p>
        </div>
        ${moduleReadyToggleHTML('mi-directory', 'Module Directory', { ai: false })}
        ${moduleControlsHTML('mi-directory')}
      </header>

      <div class="mi-toolbar">
        <div class="mi-search-inline">
          <span class="material-symbols-outlined">search</span>
          <input type="search" class="mi-search" id="mi-dir-search" placeholder="Search modules by name or file…" aria-label="Search modules" autocomplete="off" />
        </div>
        <div class="mi-view" role="group" aria-label="Directory view">
          <button type="button" class="mi-view-btn is-active" data-view="grid" aria-pressed="true"><span class="material-symbols-outlined">grid_view</span>Grid</button>
          <button type="button" class="mi-view-btn" data-view="rail" aria-pressed="false"><span class="material-symbols-outlined">view_column</span>Rail</button>
        </div>
        <div class="mi-export" role="group" aria-label="Export screenshots">
          <a class="mi-export-btn" data-page-gallery href="page-gallery.html" title="Open a full-screen live gallery of every unique page">
            <span class="material-symbols-outlined">browse_gallery</span>Page gallery
          </a>
          <button type="button" class="mi-export-btn" data-export="pages" title="Capture the full page (nav + top bar + content) for every unique screen and download them as a zipped folder">
            <span class="material-symbols-outlined">photo_library</span>Export page shots
          </button>
          <button type="button" class="mi-export-btn" data-export="modules" title="Capture just the module content panel (no app chrome) for every module and download them as a zipped folder">
            <span class="material-symbols-outlined">dashboard_customize</span>Export module shots
          </button>
        </div>
      </div>

      <div class="mi-stats" id="mi-dir-stats" role="group" aria-label="Filter modules by area">
        ${scorecards}
      </div>

      <div class="mi-dir-empty" id="mi-dir-empty" hidden>No modules match your search.</div>
      <div id="mi-dir-sections">
        ${sections.map(directorySection).join('')}
      </div>
      ${renderRail(flat)}
    </section>`;
}

/* ------------------------------------------------------------------ */
/* Table Gallery — every data table in the app, in one carousel rail   */
/*                                                                     */
/* The app ships ~two dozen table UIs, built two ways (real <table>s   */
/* and CSS-grid "faux tables" — see js/responsive-tables.js for the    */
/* full taxonomy). This module collects EVERY one of them and lines    */
/* them up as live previews in a single horizontal carousel. Each pane */
/* loads the real host page in an iframe (same live-preview mechanism  */
/* as the Module Directory rail) and then isolates just the target     */
/* table from its page chrome (see focusFrameTable). If a table can't  */
/* be isolated (e.g. it only renders after an interaction), the pane   */
/* gracefully falls back to the chrome-stripped page preview so it     */
/* never shows an empty card. `selector` is resolved inside the frame. */
const TABLE_CATALOG = [
  /* Portfolio */
  { label: 'Portfolio · Claimed', href: 'product-portfolio.html', hash: 'pf-view-claimed', selector: '.pf-table--claimed', icon: 'inventory_2', area: 'portfolio', areaTitle: 'Portfolio', desc: 'Claimed SKUs with compliance and ingredient health.' },
  { label: 'Portfolio · Discovered', href: 'product-portfolio.html', hash: 'pf-view-discovered', selector: '.pf-table--discovered', icon: 'travel_explore', area: 'portfolio', areaTitle: 'Portfolio', desc: 'Auto-discovered UPCs waiting to be claimed.' },
  { label: 'Portfolio · Needs info', href: 'product-portfolio.html', hash: 'pf-view-needsinfo', selector: '.pf-table--needsinfo', icon: 'help', area: 'portfolio', areaTitle: 'Portfolio', desc: 'Products missing data before they can be verified.' },
  { label: 'Product Comparison', href: 'product-comparison.html', page: 'Product Comparison', selector: '.cmp-grid', icon: 'compare', area: 'portfolio', areaTitle: 'Portfolio', desc: 'Side-by-side attribute matrix for two products.' },

  /* WISEcodeAI Studio */
  { label: 'AI Dashboard · Users', href: 'ai-dashboard.html', selector: '#aid-user-table', icon: 'group', area: 'ai', areaTitle: 'WISEcodeAI Studio', desc: 'Per-user AI activity and usage.' },
  { label: 'Ingredient Browser', href: 'ingredient-browser.html', selector: '#ib-table', icon: 'science', area: 'ai', areaTitle: 'WISEcodeAI Studio', desc: 'The full ingredient registry with GRAS status.' },
  { label: 'Chat · Ingredient table', href: 'wiseai.html', page: 'WISEcodeAI Chat', selector: '.wa-tbl', icon: 'forum', area: 'ai', areaTitle: 'WISEcodeAI Studio', desc: 'The sortable ingredient table rendered inside a chat answer.' },

  /* Reformulation */
  { label: 'Reformulation · Picks', href: 'reformulation.html', hash: 'rf-dash-pick', page: 'Reformulation Overview', selector: '.rf-table:not(.rf-table--moves)', icon: 'auto_fix_high', area: 'reform', areaTitle: 'Reformulation', desc: 'Products you can pick to reformulate.' },
  { label: 'Reformulation · Moves', href: 'reformulation.html', page: 'Reformulation Dashboard', selector: '#rf-moves-table', icon: 'route', area: 'reform', areaTitle: 'Reformulation', desc: 'Recommended ingredient moves with impact and effort.' },

  /* Reports & Analytics */
  { label: 'Guiding Stars', href: 'report-guiding-stars.html', selector: '#gs-table', icon: 'star', area: 'report', areaTitle: 'Reports', desc: 'Every product scored on the Guiding Stars scale.' },
  { label: 'Analytics · UPF', href: 'analytics-types.html', selector: '#upf-table-wrap', icon: 'insights', area: 'report', areaTitle: 'Reports', desc: 'Portfolio UPF classification matrix.' },
  { label: 'Analytics · GRAS status', href: 'analytics-types.html', selector: '#gras-table-wrap', icon: 'verified', area: 'report', areaTitle: 'Reports', desc: 'GRAS status broken down across the portfolio.' },
  { label: 'Analytics · Processing', href: 'analytics-types.html', selector: '#proc-table-wrap', icon: 'blender', area: 'report', areaTitle: 'Reports', desc: 'WISEcode processing-level distribution table.' },
  { label: 'Analytics · GRAS by product', href: 'analytics-types.html', selector: '#gras-prod-table-wrap', icon: 'table_rows', area: 'report', areaTitle: 'Reports', desc: 'GRAS documentation status per product.' },

  /* Verification */
  { label: 'Non-UPF · Select', href: 'verification.html', selector: '.vf-table', icon: 'verified', area: 'verify', areaTitle: 'Verification', desc: 'Qualifying SKUs to run through Non-UPF verification.' },
  { label: 'GRAS · Ingredients', href: 'gras-verification.html', selector: '.gv-table', icon: 'shield', area: 'verify', areaTitle: 'Verification', desc: 'Ingredient-level GRAS documentation table.' },

  /* Admin */
  { label: 'Team', href: 'teams.html', selector: '.adm-table', icon: 'group', area: 'org', areaTitle: 'Organization', desc: 'People on the signed-in brand — seats, invites, and roles.' },
  { label: 'Organizations', href: 'organizations.html', selector: '.adm-table', icon: 'apartment', area: 'admin', areaTitle: 'Admin', desc: 'Customer org directory with member counts.' },
  { label: 'User Management', href: 'user-management.html', selector: '.adm-table', icon: 'group', area: 'admin', areaTitle: 'Admin', desc: 'Users and roles across the workspace.' },
  { label: 'Audit Queue', href: 'audit-queue.html', selector: '.adm-table', icon: 'fact_check', area: 'admin', areaTitle: 'Admin', desc: 'Ingredient audit review queue.' },
  { label: 'Non-UPF Dashboard', href: 'non-upf-dashboard.html', selector: '.adm-table', icon: 'dashboard', area: 'admin', areaTitle: 'Admin', desc: 'Verification analytics board.' },
  { label: 'Quick Invite · History', href: 'quick-invite.html', selector: '.adm-table', icon: 'bolt', area: 'admin', areaTitle: 'Admin', desc: 'Recent one-step org invitations.' },
  { label: 'Accessibility · Contrast', href: 'accessibility-review.html', selector: '#contrast .table-wrap table', icon: 'contrast', area: 'admin', areaTitle: 'Admin', desc: 'Live text-contrast ratios graded to AAA.' },
  { label: 'Accessibility · Non-text', href: 'accessibility-review.html', selector: '#nontext .table-wrap table', icon: 'category', area: 'admin', areaTitle: 'Admin', desc: 'Non-text / UI contrast against the 3:1 rule.' },

  /* Account */
  { label: 'Invoices', href: 'invoices.html', selector: '.inv-table', icon: 'receipt_long', area: 'account', areaTitle: 'Account', desc: 'Billing board of every invoice and its status.' },
  { label: 'Marketing Assets tree', href: 'marketing-assets.html', selector: '#ma-root-table', icon: 'photo_library', area: 'account', areaTitle: 'Account', desc: 'Nested file tree of the co-branding toolkit.' },
  { label: 'API Keys', href: 'api-keys.html', selector: '.ak-table', icon: 'key', area: 'account', areaTitle: 'Account', desc: 'Created keys with scope, usage and revoke.' },
];

/* Page path only — used for iframe previews + link-validation probes. */
function tablePagePath(t) {
  return String(t.href || '').split('#')[0];
}

/* Real navigation target: prefer an explicit hash, then an #id selector, so
   opening a pane lands on the table (or the tab that hosts it), not just the
   top of the host page. */
function tableOpenHref(t) {
  const path = tablePagePath(t);
  const existing = String(t.href || '');
  if (existing.includes('#')) return existing;
  if (t.hash) return `${path}#${t.hash}`;
  const id = String(t.selector || '').match(/^#([A-Za-z][\w-]*)/);
  if (id) return `${path}#${id[1]}`;
  return path;
}

function tablePageLabel(t) {
  if (t.page) return t.page;
  const path = tablePagePath(t);
  for (const s of MODULE_SECTIONS) {
    const hit = s.modules.find((m) => String(m.href).split('#')[0] === path);
    if (hit) return hit.label;
  }
  return path.replace(/\.html$/i, '').replace(/[-_]+/g, ' ');
}

/* One rail pane per table — the real page in a scaled iframe, isolated to just
   the table via `data-focus` (resolved on load by focusFrameTable). Same
   data-search / data-area hooks as the module panes so the search filter works,
   and the same data-pane / data-href so link validation flags dead pages.
   Title, preview overlay, and "Used on" caption all navigate to the host page
   (with a hash when the table has one) so a click always jumps to the source. */
function tablePane(t) {
  const path = tablePagePath(t);
  const open = tableOpenHref(t);
  const page = tablePageLabel(t);
  const search = `${t.label} ${path} ${page} ${t.areaTitle} ${t.desc || ''}`.toLowerCase();
  return `
    <div class="mi-pane mi-tpane" data-pane data-tpane data-href="${esc(path)}" data-tbl="${esc(t.label)}" data-search="${esc(search)}" data-area="${esc(t.area)}">
      <div class="mi-tpane-bar">
        <a class="mi-pane-head" href="${esc(open)}" aria-label="Open ${esc(t.label)} on ${esc(page)}">
          <span class="mi-pane-ic material-symbols-outlined" aria-hidden="true">${esc(t.icon || 'table_chart')}</span>
          <span class="mi-pane-name">${esc(t.label)}</span>
          <span class="mi-pane-area">${esc(t.areaTitle)}</span>
        </a>
        ${readyToggleHTML(tableReadyId(t), t.label, { level: 'item', parent: 'mi-tables', ai: false })}
      </div>
      <div class="mi-pane-viewport">
        ${frameMarkup(previewSrc(path), t.label + ' table preview', `data-focus="${esc(t.selector)}"`)}
        <a class="mi-pane-hit" href="${esc(open)}" aria-label="Open ${esc(t.label)} on ${esc(page)}"></a>
        <span class="mi-pane-open material-symbols-outlined" aria-hidden="true">open_in_new</span>
      </div>
      ${t.desc ? `<p class="mi-tpane-desc">${esc(t.desc)}</p>` : ''}
      <a class="mi-tpane-src" href="${esc(open)}">
        <span class="material-symbols-outlined" aria-hidden="true">arrow_outward</span>
        Used on ${esc(page)}
      </a>
    </div>`;
}

function renderTableGallery(opts) {
  if (opts && opts.headOnly) {
    return miHeadOnly('mi-tables', 'Table Gallery',
      'Every data table in the app — portfolio grids, verification and analytics tables, admin boards, the ingredient registry and more — rendered live and lined up in one carousel. Each pane isolates the real table from its page; open the preview or the <strong>Used on</strong> link to jump to where it lives.',
      moduleReadyToggleHTML('mi-tables', 'Table Gallery', { ai: false }) + moduleControlsHTML('mi-tables'));
  }
  const total = TABLE_CATALOG.length;
  return `
    <section class="mi-module is-collapsed" id="mi-tables">
      <header class="mi-module-head">
        <div class="mi-module-head-text">
          <h2 class="mi-module-title">Table Gallery</h2>
          <p class="mi-module-lede">Every data table in the app — portfolio grids, verification and analytics tables,
            admin boards, the ingredient registry and more — rendered live and lined up in one carousel. Each pane
            isolates the real table from its page; open the preview or the <strong>Used on</strong> link to jump to
            where it lives.</p>
        </div>
        ${moduleReadyToggleHTML('mi-tables', 'Table Gallery', { ai: false })}
        ${moduleControlsHTML('mi-tables')}
      </header>

      <div class="mi-toolbar">
        <div class="mi-search-inline">
          <span class="material-symbols-outlined">search</span>
          <input type="search" class="mi-search" id="mi-tbl-search" placeholder="Search tables by name, page or area…" aria-label="Search tables" autocomplete="off" />
        </div>
        <div class="mi-tbl-count"><span id="mi-tbl-shown">${total}</span> of ${total} tables</div>
      </div>

      <div class="mi-rail mi-rail--tables" id="mi-tbl-rail">
        <button type="button" class="mi-rail-nav" data-trail-prev aria-label="Scroll left"><span class="material-symbols-outlined">chevron_left</span></button>
        <div class="mi-rail-track" id="mi-tbl-track">
          ${TABLE_CATALOG.map(tablePane).join('')}
        </div>
        <button type="button" class="mi-rail-nav" data-trail-next aria-label="Scroll right"><span class="material-symbols-outlined">chevron_right</span></button>
        <div class="mi-rail-empty" id="mi-tbl-empty" hidden>No tables match your search.</div>
      </div>
    </section>`;
}

/* ------------------------------------------------------------------ */
/* Analytics Types — every chart from analytics-types.html, as thumbs */
/* ------------------------------------------------------------------ */

function analyticsReadyId(t) { return 'az:' + t.id; }

function analyticsReadyChildren() {
  return ANALYTICS_GALLERY.map((t) => ({ id: analyticsReadyId(t), label: t.label, ai: false }));
}

function analyticsThumbPane(t, opts) {
  opts = opts || {};
  const path = ANALYTICS_HREF;
  const open = analyticsOpenHref(t);
  const focus = analyticsFocusSel(t);
  const search = `${t.label} ${path} ${t.desc || ''} ${t.id} chart graph`.toLowerCase();
  const ready = opts.hideReady
    ? ''
    : readyToggleHTML(analyticsReadyId(t), t.label, { level: 'item', parent: 'mi-analytics', ai: false });
  return `
    <div class="mi-pane mi-az-thumb" data-pane data-az-thumb data-az-id="${esc(t.id)}" data-href="${esc(path)}" data-search="${esc(search)}">
      <div class="mi-az-thumb-bar">
        <button type="button" class="mi-pane-head" data-az-open="${esc(t.id)}" aria-label="Open ${esc(t.label)} full size">
          <span class="mi-pane-ic material-symbols-outlined" aria-hidden="true">${esc(t.icon || 'bar_chart')}</span>
          <span class="mi-pane-name">${esc(t.label)}</span>
        </button>
        ${ready}
      </div>
      <div class="mi-pane-viewport">
        ${frameMarkup(previewSrc(path), t.label + ' chart preview', (focus ? `data-focus="${esc(focus)}" ` : '') + 'data-focus-mode="chart" data-az-lazy="1"')}
        <button type="button" class="mi-pane-hit" data-az-open="${esc(t.id)}" aria-label="Open ${esc(t.label)} full size"></button>
        <span class="mi-pane-open material-symbols-outlined" aria-hidden="true">open_in_full</span>
      </div>
      ${t.desc ? `<p class="mi-az-thumb-desc">${esc(t.desc)}</p>` : ''}
      <a class="mi-az-thumb-src" href="${esc(open)}">
        <span class="material-symbols-outlined" aria-hidden="true">arrow_outward</span>
        Open on Analytics Types
      </a>
    </div>`;
}

function analyticsThumbGridHTML(opts) {
  opts = opts || {};
  const id = opts.id || 'mi-az-grid';
  return `<div class="mi-az-grid" id="${esc(id)}">
      ${ANALYTICS_GALLERY.map((t) => analyticsThumbPane(t, opts)).join('')}
    </div>`;
}

function renderAnalyticsTypes(opts) {
  if (opts && opts.headOnly) {
    return miHeadOnly('mi-analytics', 'Analytics Types',
      'Every chart and graph from <strong>Analytics Types</strong>, with the same sample data, as thumbnails. Tap one to open it full size. Add a chart on that page and one entry in the shared catalog — it lands here automatically.',
      moduleReadyToggleHTML('mi-analytics', 'Analytics Types') + moduleControlsHTML('mi-analytics'));
  }
  const total = ANALYTICS_GALLERY.length;
  return `
    <section class="mi-module is-collapsed" id="mi-analytics">
      <header class="mi-module-head">
        <div class="mi-module-head-text">
          <h2 class="mi-module-title">Analytics Types</h2>
          <p class="mi-module-blurb">${SECTION_BLURBS['mi-analytics']}</p>
          <p class="mi-module-lede">Every chart and graph from <strong>Analytics Types</strong>, with the same
            sample data, as thumbnails — not a stacked report. Tap a thumbnail to open that chart full size
            (the same isolate used by the Table Gallery). Add a chart on that page and one entry in the
            shared catalog; the rail there and this gallery stay in lock-step.</p>
        </div>
        ${moduleReadyToggleHTML('mi-analytics', 'Analytics Types')}
        ${moduleControlsHTML('mi-analytics')}
      </header>

      <div class="mi-toolbar">
        <div class="mi-search-inline">
          <span class="material-symbols-outlined">search</span>
          <input type="search" class="mi-search" id="mi-az-search" placeholder="Search charts by name or type…" aria-label="Search charts" autocomplete="off" />
        </div>
        <div class="mi-tbl-count"><span id="mi-az-shown">${total}</span> of ${total} charts</div>
      </div>

      ${analyticsThumbGridHTML({ id: 'mi-az-grid' })}
      <div class="mi-dir-empty" id="mi-az-empty" hidden>No charts match your search.</div>
    </section>`;
}

/* ------------------------------------------------------------------ */
/* Codebase module — lines-of-code score cards with git-history trend  */
/* ------------------------------------------------------------------ */

function fmtNum(n) {
  return Number(n || 0).toLocaleString('en-US');
}

function fmtCodeValue(key, n) {
  if (key === 'bytes' || String(key).endsWith('Bytes')) return fmtScanBytes(n);
  return fmtNum(n);
}

/* The smaller per-type score cards under the hero LOC card. Each key matches
   both CODE_STATS.now and every series snapshot, so the same key drives the
   number AND its trend pill. */
const CODE_METRICS = [
  { key: 'pages', label: 'HTML pages', icon: 'web', sub: 'Screens shipped in the app' },
  { key: 'html', label: 'HTML lines', icon: 'html', sub: 'Page markup' },
  { key: 'js', label: 'JavaScript lines', icon: 'javascript', sub: 'Modules + flows' },
  { key: 'css', label: 'CSS lines', icon: 'css', sub: 'Shared styles' },
  { key: 'py', label: 'Python lines', icon: 'terminal', sub: 'Tooling scripts' },
];

/* Live daily scan overlay. The generated CODE_STATS file is the git trend
   plus the last Python pass; Re-evaluate crawls the working tree once a
   local day and wins whenever that crawl is newer. */
const CODE_SKIP_FILES = new Set(['icon-inventory-data.js', 'code-stats-data.js', 'gs-data.js', 'project-inventory-data.js']);
const CODE_SKIP_DIRS = new Set(['.git', 'node_modules', '__pycache__', '_WISEdesigns', 'screenshots', '_to_delete']);
const REEVAL_FETCH_MS = 30000;
const REEVAL_BUDGET_MS = 90000;
const REEVAL_CONCURRENCY = 6;
const CODE_EXTS = new Set(['html', 'js', 'css', 'py']);
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'ico', 'avif']);
const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov', 'm4v']);
const FONT_EXTS = new Set(['woff', 'woff2', 'ttf', 'otf', 'eot']);

function projectInventory() {
  try { return (typeof window !== 'undefined' && window.WISE_PROJECT_INVENTORY) || null; }
  catch { return null; }
}

function kindFromExt(ext) {
  const e = String(ext || '').toLowerCase();
  if (CODE_EXTS.has(e) || e === 'mjs') return 'code';
  if (IMAGE_EXTS.has(e)) return 'image';
  if (VIDEO_EXTS.has(e)) return 'video';
  if (FONT_EXTS.has(e)) return 'font';
  return 'other';
}

function inventoryNowPatch() {
  const inv = projectInventory();
  if (!inv) return {};
  const kinds = inv.kinds || {};
  return {
    bytes: inv.bytes || 0,
    allFiles: inv.files || 0,
    codeBytes: (kinds.code && kinds.code.bytes) || 0,
    imageBytes: (kinds.image && kinds.image.bytes) || 0,
    videoBytes: (kinds.video && kinds.video.bytes) || 0,
    otherBytes: ((kinds.other && kinds.other.bytes) || 0) + ((kinds.font && kinds.font.bytes) || 0),
  };
}
const REEVAL_STORE_KEY = 'wise-mi-reeval';

function reevalBudgetLabel() {
  return Math.round(REEVAL_BUDGET_MS / 1000) + ' seconds';
}

function isAbortError(err, signal) {
  return !!(err && err.name === 'AbortError') || !!(signal && signal.aborted);
}

const codeState = {
  now: Object.assign({}, inventoryNowPatch(), (CODE_STATS && CODE_STATS.now) || {}),
  scannedAt: (CODE_STATS && CODE_STATS.generatedAt) || '',
};

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

/* A genuine full crawl discovers essentially every code file the Python
   scanner did. When a server won't hand back directory listings (e.g. a
   live-reload wrapper that hides js/ or scripts/), only a handful of
   root-probed files are found — a gross under-count that must never win over
   the full baked totals. Reject any live scan that sees far fewer files. */
function codeScanLooksComplete(scan) {
  if (!scan || !scan.files) return false;
  const bakedFiles = Number(((CODE_STATS && CODE_STATS.now) || {}).files || 0);
  if (bakedFiles && scan.files < bakedFiles * 0.75) return false;
  const bakedAll = Number(((CODE_STATS && CODE_STATS.now) || {}).allFiles || 0)
    || Number((projectInventory() || {}).files || 0);
  if (bakedAll && scan.allFiles && scan.allFiles < bakedAll * 0.75) return false;
  return true;
}

function syncCodeStateFromStore() {
  const bakedAt = (CODE_STATS && CODE_STATS.generatedAt) || '';
  const baked = Object.assign({}, inventoryNowPatch(), (CODE_STATS && CODE_STATS.now) || {});
  const live = readReevalStore();
  const liveOk = !!(live.now && live.day && live.day >= bakedAt && codeScanLooksComplete(live.now));
  /* Same calendar day: a morning Re-evaluate must not hide a later baked
     snapshot that counted more of the tree. */
  const bakedNewer = liveOk && live.day === bakedAt && (baked.total || 0) > (live.now.total || 0);
  if (liveOk && !bakedNewer) {
    codeState.now = Object.assign({}, inventoryNowPatch(), live.now);
    codeState.scannedAt = live.day;
  } else {
    codeState.now = baked;
    codeState.scannedAt = bakedAt;
  }
}

/* All-time sparkline of total LOC — one point per daily git snapshot.
   Hover (or keyboard arrows) snaps to the nearest snapshot and names it. */
const SPARK_W = 100;
const SPARK_H = 32;
const SPARK_PAD = 2;

function codeSparkGeom(series) {
  const vals = series.map((e) => Number(e.total) || 0);
  if (vals.length < 2) return null;
  const min = Math.min(...vals);
  const span = Math.max(1, Math.max(...vals) - min);
  const last = vals.length - 1;
  return {
    min,
    span,
    pts: vals.map((v, i) => ({
      x: (i / last) * SPARK_W,
      y: SPARK_PAD + (1 - (v - min) / span) * (SPARK_H - SPARK_PAD * 2),
      entry: series[i],
      i,
    })),
  };
}

function codeSparkline(series) {
  const geom = codeSparkGeom(series);
  if (!geom) return '';
  const pts = geom.pts;
  const line = pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const area = `M${pts[0].x.toFixed(2)},${SPARK_H} ` +
    pts.map((p) => `L${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') +
    ` L${pts[pts.length - 1].x.toFixed(2)},${SPARK_H} Z`;
  const first = series[0];
  const last = series[series.length - 1];
  const label = `Lines of code from ${first.date} to ${last.date}. Move across the chart for each day's count.`;
  return `
    <div class="mi-code-spark-wrap" tabindex="0" role="img" aria-label="${esc(label)}">
      <svg class="mi-code-spark" viewBox="0 0 ${SPARK_W} ${SPARK_H}" preserveAspectRatio="none" aria-hidden="true">
        <path class="mi-code-spark-fill" d="${area}"></path>
        <polyline class="mi-code-spark-line" points="${line}"></polyline>
      </svg>
      <div class="mi-code-spark-cursor" hidden>
        <span class="mi-code-spark-rule"></span>
        <span class="mi-code-spark-dot"></span>
      </div>
      <div class="mi-code-spark-hit"></div>
      <div class="mi-code-spark-live" aria-live="polite"></div>
    </div>`;
}

function codeSparkTipHTML(entry, prev) {
  const delta = prev ? (Number(entry.total) || 0) - (Number(prev.total) || 0) : 0;
  const tone = !prev ? 'is-flat' : delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : 'is-flat';
  const sign = delta > 0 ? '+' : delta < 0 ? '\u2212' : '\u00b1';
  const deltaHtml = prev
    ? `<div class="mi-code-spark-tip-delta ${tone}">${sign}${fmtNum(Math.abs(delta))} vs previous</div>`
    : `<div class="mi-code-spark-tip-delta is-flat">First snapshot</div>`;
  const rows = [
    ['HTML', entry.html],
    ['JavaScript', entry.js],
    ['CSS', entry.css],
    ['Python', entry.py],
    ['Pages', entry.pages],
  ].filter(([, n]) => n != null);
  return `
    <div class="mi-code-spark-tip-date">${esc(entry.date)}</div>
    <div class="mi-code-spark-tip-num">${fmtNum(entry.total)} <span>lines</span></div>
    ${deltaHtml}
    <div class="mi-code-spark-tip-rows">
      ${rows.map(([label, n]) => `<div><span>${esc(label)}</span><strong>${fmtNum(n)}</strong></div>`).join('')}
    </div>`;
}

function wireCodeSparkHover(mod, series) {
  const wrap = mod.querySelector('.mi-code-spark-wrap');
  const geom = codeSparkGeom(series);
  if (!wrap || !geom) return;

  let tip = document.getElementById('mi-code-spark-tip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'mi-code-spark-tip';
    tip.setAttribute('role', 'tooltip');
    tip.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tip);
  }

  const cursor = wrap.querySelector('.mi-code-spark-cursor');
  const dot = wrap.querySelector('.mi-code-spark-dot');
  const live = wrap.querySelector('.mi-code-spark-live');
  let lastIdx = -1;

  const hide = () => {
    lastIdx = -1;
    wrap.classList.remove('is-scrubbing');
    if (cursor) cursor.hidden = true;
    tip.classList.remove('is-visible');
    tip.setAttribute('aria-hidden', 'true');
  };

  const placeTip = (clientX, clientY) => {
    const pad = 14;
    const r = tip.getBoundingClientRect();
    let left = clientX - r.width / 2;
    let top = clientY - r.height - pad;
    /* Sit above the cursor. If that clips the top of the viewport, move
       to the right of the point — never park the card directly below. */
    if (top < 8) {
      top = Math.max(8, clientY - r.height / 2);
      left = clientX + pad;
    }
    if (left + r.width > window.innerWidth - 8) left = window.innerWidth - r.width - 8;
    if (left < 8) left = 8;
    if (top + r.height > window.innerHeight - 8) top = window.innerHeight - r.height - 8;
    if (top < 8) top = 8;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  };

  const showAt = (idx, clientX, clientY) => {
    const pt = geom.pts[idx];
    if (!pt) return;
    if (idx !== lastIdx) {
      lastIdx = idx;
      const prev = idx > 0 ? series[idx - 1] : null;
      tip.innerHTML = codeSparkTipHTML(pt.entry, prev);
      if (live) live.textContent = `${pt.entry.date}: ${fmtNum(pt.entry.total)} lines`;
      if (cursor) {
        cursor.hidden = false;
        cursor.style.left = `${pt.x}%`;
        if (dot) dot.style.top = `${(pt.y / SPARK_H) * 100}%`;
      }
    }
    wrap.classList.add('is-scrubbing');
    tip.classList.add('is-visible');
    tip.setAttribute('aria-hidden', 'false');
    placeTip(clientX, clientY);
  };

  const idxFromClientX = (clientX) => {
    const rect = wrap.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(t * (geom.pts.length - 1));
  };

  wrap.addEventListener('pointerenter', (e) => {
    showAt(idxFromClientX(e.clientX), e.clientX, e.clientY);
  });
  wrap.addEventListener('pointermove', (e) => {
    showAt(idxFromClientX(e.clientX), e.clientX, e.clientY);
  });
  wrap.addEventListener('pointerleave', hide);
  wrap.addEventListener('pointercancel', hide);
  wrap.addEventListener('blur', hide);
  window.addEventListener('scroll', hide, true);
  wrap.addEventListener('keydown', (e) => {
    const max = geom.pts.length - 1;
    let next = lastIdx < 0 ? max : lastIdx;
    if (e.key === 'ArrowLeft' || e.key === 'Home') {
      e.preventDefault();
      next = e.key === 'Home' ? 0 : Math.max(0, next - 1);
    } else if (e.key === 'ArrowRight' || e.key === 'End') {
      e.preventDefault();
      next = e.key === 'End' ? max : Math.min(max, next + 1);
    } else if (e.key === 'Escape') {
      hide();
      return;
    } else {
      return;
    }
    const rect = wrap.getBoundingClientRect();
    const pt = geom.pts[next];
    const x = rect.left + (pt.x / SPARK_W) * rect.width;
    const y = rect.top + (pt.y / SPARK_H) * rect.height;
    showAt(next, x, y);
  });
}

function renderCodebase(opts) {
  if (opts && opts.headOnly) {
    return miHeadOnly('mi-code', 'Codebase',
      'How big the app itself is — the whole project on disk (code, images, and video), plus lines of hand-written HTML, JavaScript, CSS and Python with an up/down trend from one git snapshot per day. Re-evaluate recounts every file when you ask it to; the git trend is written by <code>scripts/scan_code_stats.py</code>.',
      moduleControlsHTML('mi-code'));
  }
  const now = codeState.now || { total: 0, files: 0, pages: 0 };
  const scannedAt = codeState.scannedAt || '—';
  const series = (CODE_STATS && CODE_STATS.series) || [];
  const first = series[0];
  const cards = CODE_METRICS.map((m) => `
    <article class="mi-code-card" data-code-metric="${esc(m.key)}">
      <div class="mi-code-top">
        <span class="mi-code-ic"><span class="material-symbols-outlined">${esc(m.icon)}</span></span>
        <span class="mi-code-pill" data-code-pill="${esc(m.key)}"></span>
      </div>
      <div class="mi-code-num" data-code-num="${esc(m.key)}">${fmtNum(now[m.key])}</div>
      <div class="mi-code-label">${esc(m.label)}</div>
      <div class="mi-code-sub">${esc(m.sub)}</div>
    </article>`).join('');
  return `
    <section class="mi-module is-collapsed" id="mi-code">
      <header class="mi-module-head">
        <div class="mi-module-head-text">
          <h2 class="mi-module-title">Codebase</h2>
          <p class="mi-module-lede">How big the app itself is — the whole project on disk (code, images, and
            video), plus lines of hand-written HTML, JavaScript, CSS and Python with an up/down trend from
            one git snapshot per day. Re-evaluate recounts every file when you ask it to; the git trend is
            written by <code>scripts/scan_code_stats.py</code>.</p>
        </div>
        ${moduleControlsHTML('mi-code')}
      </header>

      <div class="mi-toolbar">
        <div class="ii-sort" role="group" aria-label="Trend window">
          <button type="button" class="ii-filter is-active" data-code-win="7" aria-pressed="true">7 days</button>
          <button type="button" class="ii-filter" data-code-win="30" aria-pressed="false">30 days</button>
          <button type="button" class="ii-filter" data-code-win="all" aria-pressed="false">All time</button>
        </div>
        <span class="mi-code-updated" data-code-scanned><span class="material-symbols-outlined">history</span>Scanned ${esc(scannedAt)} · ${fmtNum(now.allFiles || now.files)} files · ${fmtScanBytes(now.bytes)}</span>
      </div>

      <div class="mi-code-grid">
        <article class="mi-code-card mi-code-hero" data-code-metric="total">
          <div class="mi-code-hero-main">
            <div class="mi-code-top">
              <span class="mi-code-ic"><span class="material-symbols-outlined">code</span></span>
              <span class="mi-code-pill" data-code-pill="total"></span>
            </div>
            <div class="mi-code-num" data-code-num="total">${fmtNum(now.total)}</div>
            <div class="mi-code-label">Lines of code</div>
            <div class="mi-code-sub" data-code-hero-sub>HTML · JavaScript · CSS · Python across ${fmtNum(now.files)} files</div>
          </div>
          <div class="mi-code-hero-chart">
            ${codeSparkline(series)}
            ${first ? `<div class="mi-code-spark-cap">
              <span>${esc(first.date)}</span>
              <span data-code-spark-now>${fmtNum(first.total)} → ${fmtNum(now.total)} lines</span>
              <span data-code-spark-end>${esc(scannedAt)}</span>
            </div>` : ''}
          </div>
        </article>
        <article class="mi-code-card mi-code-hero" data-code-metric="bytes">
          <div class="mi-code-hero-main">
            <div class="mi-code-top">
              <span class="mi-code-ic"><span class="material-symbols-outlined">hard_drive</span></span>
            </div>
            <div class="mi-code-num" data-code-num="bytes">${fmtScanBytes(now.bytes)}</div>
            <div class="mi-code-label">Project size</div>
            <div class="mi-code-sub" data-code-bytes-sub>Every shippable file — ${fmtNum(now.allFiles)} files. Git, screenshots, and scratch folders left out.</div>
          </div>
          <div class="mi-code-kinds" data-code-kinds>
            <div class="mi-code-kind"><span>Code</span><strong data-code-kind="code">${fmtScanBytes(now.codeBytes)}</strong></div>
            <div class="mi-code-kind"><span>Images</span><strong data-code-kind="image">${fmtScanBytes(now.imageBytes)}</strong></div>
            <div class="mi-code-kind"><span>Video</span><strong data-code-kind="video">${fmtScanBytes(now.videoBytes)}</strong></div>
            <div class="mi-code-kind"><span>Other</span><strong data-code-kind="other">${fmtScanBytes(now.otherBytes)}</strong></div>
          </div>
        </article>
        ${cards}
      </div>
    </section>`;
}

function wireCodebase(root) {
  const mod = root.querySelector('#mi-code');
  if (!mod) return;
  const series = (CODE_STATS && CODE_STATS.series) || [];
  let currentWin = '7';

  /* The newest snapshot at or before (scan day − window days); the earliest
     snapshot when the history is shorter than the window (or for "all"). */
  const baselineFor = (win) => {
    if (!series.length) return null;
    if (win === 'all') return series[0];
    const cut = new Date((codeState.scannedAt || new Date().toISOString().slice(0, 10)) + 'T00:00:00Z');
    cut.setUTCDate(cut.getUTCDate() - Number(win));
    const iso = cut.toISOString().slice(0, 10);
    let base = series[0];
    for (const e of series) {
      if (e.date <= iso) base = e;
      else break;
    }
    return base;
  };

  const applyWindow = (win) => {
    currentWin = win;
    const now = codeState.now || {};
    const base = baselineFor(win);
    mod.querySelectorAll('[data-code-pill]').forEach((pill) => {
      const key = pill.getAttribute('data-code-pill');
      if (!base || base[key] == null) { pill.hidden = true; return; }
      pill.hidden = false;
      const delta = (now[key] || 0) - (base[key] || 0);
      const tone = delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : 'is-flat';
      const icon = delta > 0 ? 'trending_up' : delta < 0 ? 'trending_down' : 'trending_flat';
      const sign = delta > 0 ? '+' : delta < 0 ? '\u2212' : '\u00b1';
      pill.className = 'mi-code-pill ' + tone;
      pill.title = win === 'all' ? `Since the first snapshot (${base.date})` : `Since ${base.date} (last ${win} days)`;
      pill.innerHTML = `<span class="material-symbols-outlined">${icon}</span>${sign}${fmtNum(Math.abs(delta))}<span class="mi-code-pill-win">· ${win === 'all' ? 'all time' : win + 'd'}</span>`;
    });
    mod.querySelectorAll('[data-code-win]').forEach((b) => {
      const on = b.getAttribute('data-code-win') === String(win);
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  };

  mod.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-code-win]');
    if (btn) applyWindow(btn.getAttribute('data-code-win'));
  });
  mod._applyCodeWindow = () => applyWindow(currentWin);
  applyWindow('7');
  wireCodeSparkHover(mod, series);
}

function applyLiveCodeScan(root, now, scannedAt) {
  codeState.now = Object.assign({}, now);
  codeState.scannedAt = scannedAt;
  const series = (CODE_STATS && CODE_STATS.series) || [];
  const first = series[0];
  const mod = root.querySelector('#mi-code');
  if (mod) {
    mod.querySelectorAll('[data-code-num]').forEach((el) => {
      const key = el.getAttribute('data-code-num');
      el.textContent = fmtCodeValue(key, now[key]);
    });
    const scanned = mod.querySelector('[data-code-scanned]');
    if (scanned) {
      scanned.innerHTML = `<span class="material-symbols-outlined">history</span>Scanned ${esc(scannedAt)} · ${fmtNum(now.allFiles || now.files)} files · ${fmtScanBytes(now.bytes)}`;
    }
    const bytesSub = mod.querySelector('[data-code-bytes-sub]');
    if (bytesSub) {
      bytesSub.textContent = `Every shippable file — ${fmtNum(now.allFiles)} files. Git, screenshots, and scratch folders left out.`;
    }
    const kindMap = { code: now.codeBytes, image: now.imageBytes, video: now.videoBytes, other: now.otherBytes };
    mod.querySelectorAll('[data-code-kind]').forEach((el) => {
      el.textContent = fmtScanBytes(kindMap[el.getAttribute('data-code-kind')]);
    });
    try {
      if (window.WiseMiLoad && typeof window.WiseMiLoad.setInventory === 'function' && now.bytes) {
        window.WiseMiLoad.setInventory({
          bytes: now.bytes,
          files: now.allFiles || now.files,
        });
      }
    } catch (_) { /* load meter is optional */ }
    const heroSub = mod.querySelector('[data-code-hero-sub]');
    if (heroSub) heroSub.textContent = `HTML · JavaScript · CSS · Python across ${fmtNum(now.files)} files`;
    const sparkNow = mod.querySelector('[data-code-spark-now]');
    if (sparkNow && first) sparkNow.textContent = `${fmtNum(first.total)} → ${fmtNum(now.total)} lines`;
    const sparkEnd = mod.querySelector('[data-code-spark-end]');
    if (sparkEnd) sparkEnd.textContent = scannedAt;
    if (typeof mod._applyCodeWindow === 'function') mod._applyCodeWindow();
  }
  const jump = root.querySelector('.dsc-jump-tile[data-jump="mi-code"]');
  if (jump) {
    const num = jump.querySelector('.dsc-jump-num');
    if (num) num.textContent = fmtNum(now.total);
    const sub = jump.querySelector('.dsc-jump-sub');
    if (sub) sub.textContent = `${fmtScanBytes(now.bytes)} · ${fmtNum(now.allFiles || now.files)} files`;
  }
}

/* ------------------------------------------------------------------ */
/* Icon Inventory module (the brand-new module)                        */
/* ------------------------------------------------------------------ */

/** Every icon in the app renders from the Material Symbols Outlined set, so the
    inventory previews each glyph with that single family class. */
function displayClassFor(families) {
  void families;
  return 'material-symbols-outlined';
}

function familyTags(families) {
  return families
    .map((f) => {
      const short = f.startsWith('Material Symbols')
        ? 'Symbols ' + f.replace('Material Symbols (', '').replace(')', '')
        : f;
      return `<span class="ii-tag is-symbols">${esc(short)}</span>`;
    })
    .join('');
}

function placementRows(placements) {
  return placements
    .map(
      (p) => `<li class="ii-place">
        <span class="ii-place-file">${esc(p.file)}<span class="ii-place-line">:${esc(p.line)}</span></span>
        <span class="ii-place-label">${p.label ? esc(p.label) : '<span class="ii-place-empty">—</span>'}${p.group ? `<span class="ii-place-group">${esc(p.group)}</span>` : ''}</span>
      </li>`
    )
    .join('');
}

function groupTags(groups, catalog) {
  if (!groups || !groups.length) return '';
  const byId = Object.fromEntries((catalog || []).map((g) => [g.id, g]));
  return groups.map((id) => {
    const g = byId[id];
    return `<span class="ii-tag is-group">${esc(g ? g.label : id)}</span>`;
  }).join('');
}

function iconCard(ic, catalog) {
  const dcls = displayClassFor(ic.families);
  const label = ic.label ? esc(ic.label) : '';
  const groups = ic.groups || [];
  const search = `${ic.name} ${ic.label || ''} ${groups.join(' ')} ${ic.placements.map((p) => `${p.file} ${p.label || ''}`).join(' ')}`.toLowerCase();
  return `
    <div class="ii-card" data-icon-card data-name="${esc(ic.name)}" data-count="${esc(ic.count)}" data-groups="${esc(groups.join(' '))}" data-search="${esc(search)}">
      <button type="button" class="ii-card-main" data-ii-toggle aria-expanded="false">
        <span class="ii-glyph">
          <span class="ii-glyph-font ${dcls}" data-icon-svg-skip>${esc(ic.name)}</span>
          <span class="ii-glyph-svg" aria-hidden="true"></span>
        </span>
        <span class="ii-meta">
          <span class="ii-name">${esc(ic.name)}</span>
          ${label ? `<span class="ii-label">${label}</span>` : '<span class="ii-label ii-label-none">no nearby label</span>'}
          <span class="ii-tagrow">${familyTags(ic.families)}${groupTags(groups, catalog)}</span>
        </span>
        <span class="ii-chev material-symbols-outlined" aria-hidden="true">expand_more</span>
      </button>
      <div class="ii-places" hidden>
        <div class="ii-places-title">Placements</div>
        <ul class="ii-place-list">${placementRows(ic.placements)}</ul>
      </div>
    </div>`;
}

function renderIconInventory(opts) {
  if (opts && opts.headOnly) {
    return miHeadOnly('mi-icons', 'Icon Inventory',
      'Every Material Symbols glyph used in the live app — a representative label, and the exact placements (file and line). Preview each glyph as outlined, filled, or light weight with rounded corners, and flip Font/SVG to compare the live webfont against Google\u2019s SVG export of the same glyph. The <strong>expectation</strong> — what the app actually paints — is the <strong>light (rounded) SVG at weight 400</strong>. Generated by <code>scripts/scan_icons.py</code>.',
      moduleReadyToggleHTML('mi-icons', 'Icon Inventory') + moduleControlsHTML('mi-icons'));
  }
  const data = ICON_INVENTORY || { icons: [], totalUniqueIcons: 0, totalUses: 0, groups: [] };
  const icons = (data.icons || []).slice();
  const groups = data.groups || [];
  const groupCards = groups.map((g) => `
        <button type="button" class="mi-stat" data-ii-group="${esc(g.id)}" aria-pressed="false">
          <span class="mi-stat-label"><span class="mi-stat-text">${esc(g.label)}</span><span class="material-symbols-outlined">${esc(g.icon)}</span></span>
        </button>`).join('');
  return `
    <section class="mi-module is-collapsed" id="mi-icons">
      <header class="mi-module-head">
        <div class="mi-module-head-text">
          <h2 class="mi-module-title">Icon Inventory</h2>
          <p class="mi-module-lede">Every Material Symbols glyph used in the live app — a representative
            label, and the exact placements (file and line). Preview each glyph as outlined,
            filled, or light weight with rounded corners, and flip Font/SVG to compare the
            live webfont against Google\u2019s SVG export of the same glyph. The
            <strong>expectation</strong> — what the app actually paints — is the
            <strong>light (rounded) SVG at weight 400</strong>, with a few per-glyph
            exceptions where that weight reads too thin or too heavy. This page and the Module Directory catalog data are excluded
            from the scan so the catalog is not polluted by its own chrome. Toggle a group to see
            just the chat module, primary nav, and so on.
            Generated by <code>scripts/scan_icons.py</code>.</p>
        </div>
        ${moduleReadyToggleHTML('mi-icons', 'Icon Inventory')}
        ${moduleControlsHTML('mi-icons')}
      </header>

      <div class="mi-toolbar">
        <div class="mi-search-inline">
          <span class="material-symbols-outlined">search</span>
          <input type="search" id="ii-search-input" class="mi-search" placeholder="Filter by icon name, label, group or file…" aria-label="Search icons" autocomplete="off" />
        </div>
        <div class="ii-sort" role="group" aria-label="Sort">
          <button type="button" class="ii-filter is-active" data-ii-sort="name">A–Z</button>
          <button type="button" class="ii-filter" data-ii-sort="count">Most used</button>
        </div>
        <div class="ii-sort" role="group" aria-label="Icon style preview">
          <button type="button" class="ii-filter is-active" data-ii-style="outlined" aria-pressed="true">Outlined</button>
          <button type="button" class="ii-filter" data-ii-style="filled" aria-pressed="false">Filled</button>
          <button type="button" class="ii-filter" data-ii-style="light" aria-pressed="false" title="App look: rounded terminals (the live sprite is this family at weight 400, with a few exceptions)">Light</button>
        </div>
        <div class="ii-sort" role="group" aria-label="Icon render mode" id="ii-render-switch">
          <button type="button" class="ii-filter is-active" data-ii-render="font" aria-pressed="true" title="The Material Symbols variable font, served from fonts.googleapis.com \u2014 exempt from the app-wide SVG shim so this column stays a true comparison">Font</button>
          <button type="button" class="ii-filter" data-ii-render="svg" aria-pressed="false" title="The same glyphs as inline SVG, from Google\u2019s own SVG export \u2014 no webfont, no network. Light + SVG is the app expectation.">SVG</button>
        </div>
      </div>

      <aside class="ii-expect" aria-label="Icon SVG expectation">
        <h3 class="ii-expect-title">Expectation: light SVG, weight 400</h3>
        <p class="ii-expect-body">The live app draws every icon as the <strong>light (rounded) SVG</strong> — not the outlined webfont. Default stroke is weight <strong>400</strong>. A handful of glyphs are exceptions when 400 looks too thin or too heavy next to its neighbors (the three-dot menu is one). Flip <strong>Light</strong> and <strong>SVG</strong> to preview that family; Outlined and Filled stay here so you can compare.</p>
      </aside>

      <p class="ii-render-note" id="ii-render-note" hidden></p>

      <div class="mi-stats" id="ii-group-stats" role="group" aria-label="Filter icons by group">
        <button type="button" class="mi-stat is-active" data-ii-group="all" aria-pressed="true">
          <span class="mi-stat-label"><span class="mi-stat-text">All icons</span><span class="material-symbols-outlined">emoji_symbols</span></span>
        </button>
        ${groupCards}
      </div>

      <div class="ii-empty" id="ii-empty" hidden>No icons match your filter.</div>
      <div class="ii-grid ii-style-outlined ii-render-font" id="ii-grid">
        ${icons.map((ic) => iconCard(ic, groups)).join('')}
      </div>
    </section>`;
}

/* ------------------------------------------------------------------ */
/* Design System module — typography + color/radius/shadow tokens      */
/* ------------------------------------------------------------------ */

/* The type families the app actually loads/declares (see each page's <head>
   and the WISE Digits @font-face at the top of pages/wise.css). */
const FONT_FAMILIES = [
  {
    name: 'DM Sans',
    css: "'DM Sans', system-ui, -apple-system, sans-serif",
    weights: 'Loaded 300 · 400 · 500 · 600 · 700 · 800 (+ italic 400)',
    use: 'The workhorse UI face. Body copy, controls, nav, chips, tables, forms — the app-wide default via the body font stack.',
    sample: 'Nutrition wisdom for every product decision.',
  },
  {
    name: 'Noto Serif',
    css: "'Noto Serif', Georgia, serif",
    weights: 'Loaded 400 · 500 · 600 · 700 · 800 · 900 (+ italics)',
    use: 'The display face. Hero and module titles (via --module-title-family), section headings, and scorecard numerals.',
    sample: 'Reformulate with confidence.',
  },
  {
    name: 'DM Mono',
    css: "'DM Mono', ui-monospace, monospace",
    weights: 'Loaded 300 · 400 · 500 (+ italics)',
    use: 'The monospace face for code, file paths, UPCs, barcodes, token names, and inline <code>.',
    sample: 'pages/wise.css · scripts/scan_icons.py',
  },
  {
    name: 'WISE Digits',
    css: "'WISE Digits', var(--font-mono)",
    weights: 'Synthetic @font-face · four weight buckets 100–900',
    use: 'Digit-only shim (unicode-range U+0030–39) backed by DM Mono. Prepended to every text stack so numerals render mono while letters use the normal face.',
    sample: '0123456789 · 62% · $1,480.00',
  },
  {
    name: 'Mono stack',
    css: 'var(--font-mono)',
    token: '--font-mono',
    weights: 'DM Mono 300 · 400 · 500 · ui-monospace fallback',
    use: 'The shared token for full monospace strings across the app. Defined once in pages/wise.css.',
    sample: 'pages/wise.css · scripts/scan_icons.py',
  },
];

/* The real sizes in use across the app, smallest to largest, each rendered
   live at its exact size/weight/face. px values assume the 16px root. */
const TYPE_SCALE = [
  { name: 'Micro badge', size: '0.5625rem', px: '9px', weight: '800', family: 'DM Sans', style: 'font-size:0.5625rem;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;', use: 'Pill badges (ADMIN, 404), pane area tags, chip tag rows.' },
  { name: 'Eyebrow / label', size: '0.6875rem', px: '11px', weight: '700–800', family: 'DM Sans', token: '--fs-label', style: 'font-size:0.6875rem;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;', use: 'Section eyebrows (.dash-eyebrow), group titles, table headers, form labels, 28px intent chips.' },
  { name: 'UI base', size: '0.75rem', px: '12px', weight: '500–700', family: 'DM Sans', token: '--fs-ui', style: 'font-size:0.75rem;font-weight:500;', use: 'The app-wide control size — the body default. Nav items, menu rows, popover items, buttons.' },
  { name: 'Body small', size: '0.875rem', px: '14px', weight: '400', family: 'DM Sans', style: 'font-size:0.875rem;font-weight:400;', use: 'Module ledes, search inputs, empty states, card copy.' },
  { name: 'Body large / lede', size: '0.95rem', px: '15.2px', weight: '400', family: 'DM Sans', style: 'font-size:0.95rem;font-weight:400;', use: 'Hero ledes and long-form copy (docs, help).' },
  { name: 'Module title', size: '1.2rem', px: '19.2px', weight: '800', family: 'Noto Serif', token: '--module-title-size', style: "font-family:var(--module-title-family);font-size:1.2rem;font-weight:800;letter-spacing:-0.01em;", use: 'The canonical headline of every docked module — identical on every page (via --module-title-*).' },
  { name: 'Section title', size: '1.35rem', px: '21.6px', weight: '800', family: 'Noto Serif', style: "font-family:var(--module-title-family);font-size:1.35rem;font-weight:800;letter-spacing:-0.01em;", use: 'On-page module headings, like the ones on this page (.mi-module-title).' },
  { name: 'Stat numeral', size: '1.5rem', px: '24px', weight: '800', family: 'Noto Serif + mono digits', style: "font-family:var(--module-title-family);font-size:1.5rem;font-weight:800;", use: 'Scorecard numbers (.mi-stat-num, .pf-stat), dashboard KPIs.', sample: '1,284' },
  { name: 'Hero title', size: '1.7rem', px: '27.2px', weight: '800', family: 'Noto Serif', style: "font-family:var(--module-title-family);font-size:1.7rem;font-weight:800;letter-spacing:-0.01em;", use: 'Page-level hero titles (All Modules, dashboards, reports).' },
];

/* Every color / radius / shadow token from :root + html.dark in wise.css.
   kind: fill | ink | border | shadow | radius — controls how the swatch chip
   demos the token. Swatches resolve their computed value live (see
   wireDesignSystem) so they always show the current theme's real color. */
const COLOR_GROUPS = [
  {
    id: 'surfaces',
    title: 'Surfaces',
    note: 'The four-step elevation ramp. Warm paper in light mode, deep navy in dark.',
    swatches: [
      { token: '--bg', use: 'App background behind everything' },
      { token: '--surface', use: 'Cards, panels, popovers' },
      { token: '--surface-2', use: 'Inset fills — inputs, hover rows, code chips' },
      { token: '--surface-3', use: 'Deepest inset — pressed / active fills' },
      { token: '--scorecard-fill', use: 'Action / filter scorecard tile (chat navy in dark)' },
    ],
  },
  {
    id: 'ink',
    title: 'Ink',
    note: 'Text colors. Muted and subtle are the same ink — tuned to clear WCAG AAA (7:1) on every surface they sit on, in both themes.',
    swatches: [
      { token: '--text', kind: 'ink', use: 'Primary text and headings' },
      { token: '--text-muted', kind: 'ink', use: 'Secondary copy, ledes, menu items, eyebrows, captions, placeholders' },
      { token: '--text-subtle', kind: 'ink', use: 'Alias of --text-muted (same color)' },
      { token: '--score-ink', kind: 'ink', use: 'Default scorecard numeral' },
      { token: '--score-ink-red', kind: 'ink', use: 'Action-required scorecard numeral and chip' },
      { token: '--score-ink-green', kind: 'ink', use: 'Verified scorecard numeral and chip' },
      { token: '--score-ink-amber', kind: 'ink', use: 'Warning scorecard numeral and chip' },
      { token: '--score-ink-blue', kind: 'ink', use: 'Pending / brand scorecard numeral and chip' },
    ],
  },
  {
    id: 'brand',
    title: 'Brand',
    note: 'WISE blue. --primary doubles as AAA text on light surfaces and as a button fill; --primary-bright is the dark-theme accent where #25507C would vanish on navy.',
    swatches: [
      { token: '--primary', use: 'Buttons, links, active states, focus rings' },
      { token: '--primary-bright', fallback: '#8B9FAF', use: 'Dark-theme accent (defined only on html.dark)' },
      { token: '--primary-10', use: '10% tint — soft fills' },
      { token: '--primary-20', use: '20% tint — hover fills' },
      { token: '--primary-soft', use: 'Softest wash — nav hover, icon discs' },
    ],
  },
  {
    id: 'semantic-green',
    title: 'Semantic · green',
    note: 'Positive / verified. Vibrant fill, AAA-safe ink for text, 12% tint for chip fills.',
    swatches: [
      { token: '--sec-green', use: 'Fills, charts, dots' },
      { token: '--sec-green-text', kind: 'ink', use: 'Text on green tints (badges, deltas)' },
      { token: '--sec-green-10', use: 'Chip / badge fill' },
    ],
  },
  {
    id: 'semantic-red',
    title: 'Semantic · red',
    note: 'Negative / failed / destructive.',
    swatches: [
      { token: '--sec-red', use: 'Fills, alerts, notification dots' },
      { token: '--sec-red-text', kind: 'ink', use: 'Text on red tints, danger menu items' },
      { token: '--sec-red-10', use: 'Chip / badge fill' },
    ],
  },
  {
    id: 'semantic-amber',
    title: 'Semantic · amber',
    note: 'Warning / pending / at-risk.',
    swatches: [
      { token: '--ter-amber', use: 'Fills, charts, dots' },
      { token: '--ter-amber-text', kind: 'ink', use: 'Text on amber tints' },
      { token: '--ter-amber-10', use: 'Chip / badge fill' },
    ],
  },
  {
    id: 'lines',
    title: 'Lines',
    note: 'Borders are tinted from the brand blue (color-mix over --primary / --primary-bright) rather than neutral gray, so every card edge reads on-brand.',
    swatches: [
      { token: '--border', kind: 'border', use: 'Default card / divider stroke' },
      { token: '--border-strong', kind: 'border', use: 'Inputs, emphasized edges' },
    ],
  },
  {
    id: 'elevation',
    title: 'Elevation',
    note: 'Three shadow steps. Light mode uses the same value for Hover lift and Floating popovers; dark mode separates them with a deeper popover shadow.',
    swatches: [
      {
        token: '--shadow-1',
        kind: 'shadow',
        lightValue: '0 1px 2px rgba(17,24,39,.04), 0 1px 3px rgba(17,24,39,.04)',
        darkValue: '0 1px 2px rgba(0,0,0,.4)',
        use: 'Resting cards',
      },
      {
        token: '--shadow-2',
        kind: 'shadow',
        lightValue: '0 1px 2px rgba(17,24,39,.04), 0 8px 24px rgba(17,24,39,.06)',
        darkValue: '0 4px 12px rgba(0,0,0,.35), 0 12px 32px rgba(0,0,0,.35)',
        use: 'Hover lift, dropdowns',
      },
      {
        token: '--shadow-card',
        kind: 'shadow',
        lightValue: '0 1px 2px rgba(17,24,39,.04), 0 8px 24px rgba(17,24,39,.06)',
        darkValue: '0 8px 32px rgba(0,0,0,.45), 0 2px 8px rgba(0,0,0,.35)',
        use: 'Floating popovers / modals',
      },
    ],
  },
  {
    id: 'radii',
    title: 'Radii',
    note: 'The corner ramp, plus the pill used by every chip, button and input.',
    swatches: [
      { token: '--r-sm', kind: 'radius', val: '10px', use: 'Small tiles, stat cards' },
      { token: '--r-md', kind: 'radius', val: '16px', use: 'Cards, popovers' },
      { token: '--r-lg', kind: 'radius', val: '24px', use: 'Large cards, module shells' },
      { token: '--r-xl', kind: 'radius', val: '32px', use: 'Hero shells' },
      { token: '--radius-pill', kind: 'radius', val: '9999px', use: 'Chips, buttons, inputs, nav rows' },
    ],
  },
];

const COLOR_NAME_KEY = 'wise-ds-color-names';

function colorGroupId(g) {
  return (g && (g.id || g.title)) || '';
}

function loadColorNames() {
  try {
    const raw = JSON.parse(localStorage.getItem(COLOR_NAME_KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch (e) { return {}; }
}

function colorGroupTitle(g) {
  const id = colorGroupId(g);
  const custom = loadColorNames()[id];
  return (custom && String(custom).trim()) || (g && g.title) || '';
}

function colorGroupById(id) {
  return COLOR_GROUPS.find((g) => colorGroupId(g) === id);
}

function saveColorGroupName(id, name) {
  const group = colorGroupById(id);
  if (!group) return '';
  const store = loadColorNames();
  const trimmed = String(name || '').replace(/\s+/g, ' ').trim();
  if (!trimmed || trimmed === group.title) delete store[id];
  else store[id] = trimmed;
  try { localStorage.setItem(COLOR_NAME_KEY, JSON.stringify(store)); } catch (e) {}
  _globalIndex = null;
  return colorGroupTitle(group);
}

function swatchIsColor(sw) {
  const kind = sw.kind || 'fill';
  return kind === 'fill' || kind === 'ink' || kind === 'border';
}

function swatchHTML(sw) {
  const kind = sw.kind || 'fill';
  const bg = sw.fallback ? `var(${sw.token}, ${sw.fallback})` : `var(${sw.token})`;
  const editable = swatchIsColor(sw);
  const fillChip = (attrs) =>
    `<span class="ds-swatch-well"><span class="ds-swatch-chip" ${attrs} style="background:${bg}"></span></span>`;
  let chips = '';
  if (kind === 'shadow') {
    chips = `<span class="ds-swatch-chip ds-swatch-chip--shadow" style="box-shadow:${bg}"></span>`;
  } else if (kind === 'radius') {
    chips = `<span class="ds-swatch-chip ds-swatch-chip--radius" style="border-radius:${bg}"></span>`;
  } else if (editable) {
    chips = `<span class="ds-swatch-pair">
      <span class="ds-swatch-col">
        ${fillChip('data-swatch-now')}
        <input type="text" class="ds-swatch-hex" data-swatch-hex-now readonly tabindex="-1" aria-label="Current ${esc(sw.token)}" />
        <span class="ds-swatch-cap">Now</span>
      </span>
      <span class="ds-swatch-col">
        <label class="ds-swatch-pick">
          <input type="color" data-token-color value="#000000" aria-label="New color for ${esc(sw.token)}" />
          ${fillChip('data-swatch-next')}
        </label>
        <input type="text" class="ds-swatch-hex" data-swatch-hex-next data-token-hex spellcheck="false" autocomplete="off" aria-label="New ${esc(sw.token)} value" />
        <span class="ds-swatch-cap">New</span>
      </span>
      <span class="ds-swatch-col ds-swatch-col--act">
        <button type="button" class="ds-swatch-reset" data-token-reset disabled title="Undo ${esc(sw.token)} to the theme default" aria-label="Undo ${esc(sw.token)}"><span class="material-symbols-outlined">undo</span></button>
        <span class="ds-swatch-cap ds-swatch-cap--undo">Undo</span>
      </span>
      <span class="ds-swatch-col ds-swatch-col--act">
        <button type="button" class="ds-swatch-apply" data-token-apply disabled title="Apply ${esc(sw.token)} across the app" aria-label="Apply ${esc(sw.token)} across the app"><span class="material-symbols-outlined">sync</span></button>
        <span class="ds-swatch-cap">Apply</span>
      </span>
      <span class="ds-swatch-alpha">
        <span class="ds-swatch-cap ds-swatch-cap--alpha">A</span>
        <input type="range" min="0" max="100" step="1" value="100" data-token-alpha
               title="Opacity of ${esc(sw.token)}" aria-label="Alpha for ${esc(sw.token)}" />
        <span class="ds-swatch-alpha-out" data-token-alpha-out aria-hidden="true">100%</span>
      </span>
    </span>`;
  } else {
    chips = fillChip('');
  }
  const val = kind === 'radius'
    ? `<span class="ds-swatch-val">${esc(sw.val || '')}</span>`
    : kind === 'shadow'
      ? `<span class="ds-swatch-val ds-swatch-val--themes">
          <span class="ds-swatch-theme-value"><span class="ds-swatch-theme-label">Light</span> ${esc(sw.lightValue || '')}</span>
          <span class="ds-swatch-theme-value"><span class="ds-swatch-theme-label">Dark</span> ${esc(sw.darkValue || '')}</span>
        </span>`
      : '';
  const fmt = editable
    ? `<span class="ds-swatch-fmt" role="group" aria-label="Color format for ${esc(sw.token)}">
        <button type="button" class="ds-swatch-fmt-btn" data-token-fmt="hex" aria-pressed="true">Hex</button>
        <button type="button" class="ds-swatch-fmt-btn" data-token-fmt="rgba" aria-pressed="false">RGBA</button>
      </span>`
    : '';
  const rollout = editable
    ? `<button type="button" class="ds-swatch-rollout" data-token-rollout hidden>
        <span class="ds-swatch-rollout-track"><span class="ds-swatch-rollout-fill" data-rollout-fill></span></span>
        <span class="ds-swatch-rollout-label" data-rollout-label></span>
      </button>`
    : '';
  return `
    <div class="ds-swatch${editable ? ' is-editable' : ''}" data-swatch data-kind="${esc(kind)}" data-fmt="hex"${sw.token ? ` data-token="${esc(sw.token)}"` : ''}>
      ${chips}
      <span class="ds-swatch-meta">
        <span class="ds-swatch-meta-top">
          <span class="ds-swatch-name">${esc(sw.token)}</span>
          ${fmt}
        </span>
        ${val}
        <span class="ds-swatch-use">${esc(sw.use)}</span>
        ${rollout}
      </span>
    </div>`;
}

function dsFontReadyId(f) { return 'ds:font:' + f.name; }
function dsTypeReadyId(t) { return 'ds:type:' + t.name; }

function renderDesignSystem(opts) {
  if (opts && opts.headOnly) {
    return miHeadOnly('mi-design', 'Design System',
      'The app\'s typographic system and every design token from <code>pages/wise.css</code>. Swatches render live off the real CSS variables, so they always show the current theme — flip light/dark and watch them re-resolve.',
      moduleReadyToggleHTML('mi-design', 'Design System') + moduleControlsHTML('mi-design'));
  }
  const familyCards = FONT_FAMILIES.map((f) => `
    <div class="ds-font-card" data-ds-font="${esc(f.name)}">
      <div class="ds-font-sample" style="font-family:${esc(f.css)}">${esc(f.sample)}</div>
      <div class="ds-font-head">
        <div class="ds-font-name">${esc(f.name)}</div>
        ${readyToggleHTML(dsFontReadyId(f), f.name, { level: 'item', parent: 'mi-design' })}
      </div>
      <code class="ds-font-stack">${f.token ? esc(f.token) + ' → ' : ''}${esc(f.css)}</code>
      <div class="ds-font-weights">${esc(f.weights)}</div>
      <p class="ds-font-use">${esc(f.use)}</p>
    </div>`).join('');

  const typeRows = TYPE_SCALE.map((t) => `
    <div class="ds-type-row" data-ds-type="${esc(t.name)}">
      <span class="ds-type-sample" style="${esc(t.style)}">${esc(t.sample || 'Wise nutrition 0123')}</span>
      <span class="ds-type-meta">
        <span class="ds-type-name">${esc(t.name)}${t.token ? ` <code>${esc(t.token)}</code>` : ''}</span>
        <span class="ds-type-spec">${esc(t.size)} ≈ ${esc(t.px)} · ${esc(t.weight)} · ${esc(t.family)}</span>
        <span class="ds-type-use">${esc(t.use)}</span>
      </span>
      ${readyToggleHTML(dsTypeReadyId(t), t.name, { level: 'item', parent: 'mi-design' })}
    </div>`).join('');

  const colorGroups = COLOR_GROUPS.map((g) => `
    <div class="ds-color-group" data-ds-group="${esc(colorGroupId(g))}">
      <div class="ds-group-head">
        <input type="text" class="ds-group-title" data-ds-group-name="${esc(colorGroupId(g))}" value="${esc(colorGroupTitle(g))}" spellcheck="false" autocomplete="off" aria-label="Name for ${esc(g.title)}" title="Click to rename — the name is saved on this device" />
        ${readyToggleHTML('ds:' + g.title, colorGroupTitle(g), { level: 'item', parent: 'mi-design' })}
      </div>
      <p class="ds-group-note">${esc(g.note)}</p>
      <div class="ds-swatch-grid">${g.swatches.map(swatchHTML).join('')}</div>
    </div>`).join('');

  return `
    <section class="mi-module is-collapsed" id="mi-design">
      <header class="mi-module-head">
        <div class="mi-module-head-text">
          <h2 class="mi-module-title">Design System</h2>
          <p class="mi-module-lede">The app's typographic system and every design token from
            <code>pages/wise.css</code>. Swatches render live off the real CSS variables, so they
            always show the current theme — flip light/dark and watch them re-resolve.</p>
        </div>
        ${moduleReadyToggleHTML('mi-design', 'Design System')}
        ${moduleControlsHTML('mi-design')}
      </header>

      <div class="ds-block" id="ds-typography">
        <div class="ds-block-head">
          <span class="mi-dir-title">Typography — families</span>
        </div>
        <div class="ds-font-grid">${familyCards}</div>

        <div class="ds-block-head" style="margin-top:28px">
          <span class="mi-dir-title">Typography — type scale</span>
        </div>
        <div class="ds-type-table">${typeRows}</div>
        <p class="ds-footnote">Every numeral app-wide renders in DM Mono via the synthetic
          <code>WISE Digits</code> family prepended to each stack; full monospace strings
          use <code>--font-mono</code>. Body base is
          <code>--fs-ui</code> (0.75rem), user-scalable via <code>--wise-text-scale</code>.</p>
      </div>

      <div class="ds-block" id="ds-colors">
        <div class="ds-block-head">
          <span class="mi-dir-title">Color, line, elevation &amp; radius tokens</span>
          <button type="button" class="ds-token-reset-all" data-ds-reset-colors hidden>
            <span class="material-symbols-outlined">restart_alt</span>Reset colors
          </button>
        </div>
        <p class="ds-footnote" style="margin-top:0;margin-bottom:14px">Each color token shows its current value, then a new color to change to. Hex sits under both samples — switch <strong>Hex</strong> / <strong>RGBA</strong> to convert. Drag <strong>A</strong> for transparency (the browser picker has no alpha). Shadow tokens show their exact light and dark values beside the preview. <strong>Apply</strong> writes the new color across every page that uses the token and opens a progress panel; undo restores the theme default. Click a group name (Semantic · red, and the rest) to rename it. Color values and names both save on this device and survive reload.</p>
        <div class="ds-color-grid">${colorGroups}</div>
      </div>
    </section>`;
}

/* ------------------------------------------------------------------ */
/* Component Library module — every reusable component, live           */
/* ------------------------------------------------------------------ */

/* Each entry renders LIVE with the real global classes from wise.css (loaded
   on this page), so the demos can never drift from the app. `used` is the
   curated list of surfaces the component actually appears on. An optional
   `note` documents the shared rule/convention behind the component (e.g. how
   it stays responsive); `wide` makes the card span the full grid row for
   components that need the room (tables, charts, modals).

   Do NOT catalog a component whose live instance already appears on
   all-modules.html itself (Directory search/stats, Grid⇄Rail, module ⋯
   menus, Dev Ready toggles, directory badges, empty filters, jump tiles,
   codebase cards). Point at those in situ instead of duplicating them here. */

/* Sort caret used inside table headers app-wide (mirrors ARROW_SVG in the
   admin flows) so the Data table demo shows the real sortable affordance. */
const ARROW_SVG_DEMO = '<span class="adm-sort-arrow"><svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 9.5V2.5M3 6.5L6 9.5l3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';

/* Categories power the click-to-filter scorecards at the top of the Component
   Library, so you can jump straight to a family instead of scrolling. Order
   here is the order the tiles render in. */
const COMPONENT_CATS = [
  { key: 'Chat & drawers', icon: 'view_sidebar' },
  { key: 'Charts & graphs', icon: 'bar_chart' },
  { key: 'Tables & data', icon: 'table_rows' },
  { key: 'Library & reports', icon: 'auto_stories' },
  { key: 'Filters', icon: 'filter_alt' },
  { key: 'Overlays', icon: 'layers' },
  { key: 'Inputs & forms', icon: 'edit_note' },
  { key: 'Chips & badges', icon: 'label' },
  { key: 'Actions', icon: 'smart_button' },
  { key: 'Navigation', icon: 'menu' },
  { key: 'Feedback', icon: 'notifications' },
];

/* Name → category. Kept as a lookup so the component objects stay lean; a
   component can still override by setting its own `cat`. */
const CAT_BY_NAME = {
  'Buttons': 'Actions',
  'Admin buttons': 'Actions',
  'Intent chips': 'Chips & badges',
  'Output chips': 'Chips & badges',
  'Large intent cards': 'Chips & badges',
  'Status chips': 'Chips & badges',
  'Chat composer': 'Inputs & forms',
  'Transcript lines': 'Chat & drawers',
  'Transcript actions': 'Chat & drawers',
  'Activity strip': 'Chat & drawers',
  'Token readout': 'Chat & drawers',
  'Chat ⋯ menu': 'Chat & drawers',
  'Module ⋯ menu': 'Overlays',
  'Sticky modules': 'Chat & drawers',
  'What can I ask?': 'Chat & drawers',
  'Turns module': 'Chat & drawers',
  'Database roster': 'Chat & drawers',
  'Attachments': 'Chat & drawers',
  'Image lightbox': 'Overlays',
  'Segmented control': 'Actions',
  'Switch': 'Actions',
  'Width toggle': 'Actions',
  'Empty states': 'Feedback',
  'Nutrition Facts': 'Chat & drawers',
  'Product identity strip': 'Chat & drawers',
  'Progress tracker': 'Chat & drawers',
  'Jam strip': 'Overlays',
  'App search': 'Navigation',
  'Roll · Crawl · Walk · Run': 'Navigation',
  'Owl walkthrough': 'Chat & drawers',
  'Form fields': 'Inputs & forms',
  'Data table': 'Tables & data',
  'Charts & graphs': 'Charts & graphs',
  'Dashboard card': 'Tables & data',
  'Pagination footer': 'Tables & data',
  'History': 'Library & reports',
  'Library cards': 'Library & reports',
  'Library folders': 'Library & reports',
  'Report builder': 'Library & reports',
  'Report posters': 'Library & reports',
  'Filter tiles': 'Filters',
  'Action scorecards': 'Tables & data',
  'Compact metrics': 'Tables & data',
  'KPI scorecards': 'Tables & data',
  'Claim scorecards': 'Tables & data',
  'Filter toolbar': 'Filters',
  'Menu popover': 'Overlays',
  'Row action menu': 'Overlays',
  'Modal dialog': 'Overlays',
  'Bottom sheet': 'Overlays',
  'Tooltip': 'Overlays',
  'Toast': 'Feedback',
  'Notification rows': 'Feedback',
  'Left-nav item': 'Navigation',
  'Avatars': 'Navigation',
};

function catOf(c) { return c.cat || CAT_BY_NAME[c.name] || 'Actions'; }

/* Live Output-chip demos — same 52px thumbs + vN badges as wiseai.html.
   Inners are full-size product photos scaled by the shared thumb transform. */
function outputDemoInner(src) {
  return `<div class="mi-out-thumb-fill"><img src="../assets/portfolio/${src}" alt="" width="360" height="360" loading="lazy"></div>`;
}
/* Product identity strip — two-state catalog demo (several sizes vs one picture). */
function idStripUpcDemo(digits) {
  const bars = Array.from({ length: 36 }, (_, i) => `<rect x="${2 + i * 3.4}" y="0" width="${i % 5 === 0 ? 2.2 : 1.1}" height="24"/>`).join('');
  return `<div class="nfp-fi-upc">
    <div class="nfp-upc-entry nfp-upc-entry--filled">
      <svg class="nfp-upc-barcode" viewBox="0 0 126 24" preserveAspectRatio="none" aria-hidden="true">${bars}</svg>
      <div class="nfp-upc-cells">${esc(digits)}</div>
    </div>
  </div>`;
}
function idStripThumbDemo(label, src, active) {
  return `<div class="nfp-fi-thumb${active ? ' active' : ''}">
    <img class="nfp-fi-thumb-img" src="../assets/portfolio/${src}" alt="">
    <span class="nfp-fi-thumb-label">${esc(label)}</span>
  </div>`;
}
function idStripDemoHTML({ single }) {
  const src = 'chocolate_chip_muffins.png';
  const thumbs = single
    ? ''
    : idStripThumbDemo('1 ct', src, true) + idStripThumbDemo('4 ct', src, false) + idStripThumbDemo('6 ct', src, false);
  return `<div class="nfp-fi-group nfp-fi-group--identity">
    <button type="button" class="nfp-fi-lead-photo" title="Replace product image" aria-label="Replace product image">
      <img src="../assets/portfolio/${src}" alt="">
      <span class="nfp-fi-lead-edit" aria-hidden="true"><span class="material-symbols-outlined">edit</span></span>
    </button>
    <div class="nfp-fi-copy">
      <div class="nfp-fi-header">
        <span class="nfp-fi-title">${single ? 'Product name' : 'Flax4Life Chocolate Chip Muffins'}</span>
        <div class="nfp-fi-cat nfp-fi-cat--dock">
          <span class="nfp-cat-select"><span class="material-symbols-outlined nfp-cat-select-ic">sell</span><span class="nfp-cat-native">${single ? 'Select a category…' : 'Bakery › Muffins'}</span><span class="material-symbols-outlined nfp-cat-select-caret">expand_more</span></span>
        </div>
        <div class="panel-controls">
          <div class="panel-more-wrap"><button type="button" class="panel-more-btn" title="Module options" aria-label="Module options"><span class="material-symbols-outlined">more_vert</span></button></div>
          <button type="button" class="panel-width-toggle-btn is-on is-width-fill" title="Width (fill)" aria-label="Product Details width"><span class="material-symbols-outlined">width_full</span></button>
        </div>
      </div>
      <p class="nfp-fi-desc">${single ? 'Add a short product description' : 'A bakery favorite with a moist crumb, simple ingredients, and flavor that holds from the first bite to the last.'}</p>
      <div class="nfp-fi-price">${single ? '$0.00' : '$4.99'} <span class="nfp-fi-price-size">1 ct</span></div>
      <div class="nfp-fi-thumbs">
        ${thumbs}
        ${idStripUpcDemo(single ? '— — — — — — — — — — — —' : '8 5 3 6 2 0 0 0 6 2 7 9')}
        <div class="nfp-fi-add" title="Add size or variation" role="button">
          <span class="nfp-fi-add-sq" aria-hidden="true"><span class="material-symbols-outlined">add</span></span>
          <span class="nfp-fi-add-label">Add size or variation</span>
        </div>
      </div>
    </div>
  </div>`;
}
function outputChipHTML({ title, versions, hover, activeVer }) {
  const vtag = (n) => `<span class="sc-surface-vtag">v${n}</span>`;
  const thumbs = versions.map((v, i) => {
    const latest = i === versions.length - 1;
    const active = activeVer != null && Number(activeVer) === Number(v.ver);
    const cls = ['sc-surface-thumb', latest ? 'is-latest' : 'is-old', active ? 'is-active' : ''].filter(Boolean).join(' ');
    const role = versions.length > 1 ? ' role="button" tabindex="0"' : '';
    return `<div class="${cls}"${role}><div class="sc-surface-thumb-inner">${v.inner}</div>${vtag(v.ver)}</div>`;
  }).join('');
  const thumbWrap = versions.length > 1 ? `<div class="sc-surface-stack">${thumbs}</div>` : thumbs;
  return `<div class="sc-surface-slot">
    <div class="sc-surface-card${hover ? ' is-hover' : ''}" role="button" tabindex="0">
      <div class="sc-surface-head">
        ${thumbWrap}
        <div class="sc-surface-body"><div class="sc-surface-title">${esc(title)}</div></div>
      </div>
    </div>
  </div>`;
}
function outputRailChipHTML({ title, inner, ver, active }) {
  return `<div class="wa-merge-chip${active ? ' is-active' : ''}" role="tab" tabindex="0" aria-selected="${active ? 'true' : 'false'}" title="${esc(title)} (v${ver})">
    <span class="wa-merge-chip-thumb"><span class="wa-merge-chip-thumb-inner">${inner}</span><span class="sc-surface-vtag">v${ver}</span></span>
    <span class="wa-merge-chip-label">${esc(title)}</span>
  </div>`;
}

const OUTPUT_CHIP_VERS = [
  { ver: 1, inner: outputDemoInner('frosted_toaster_pastries.png') },
  { ver: 2, inner: outputDemoInner('chocolate_chip_muffins.png') },
  { ver: 3, inner: outputDemoInner('blueberry_muffins.png') },
];
const OUTPUT_CHIP_TITLE = 'Worst-ranked cupcake · detail';

/* Compact WISE-owl bug for transcript / welcome demos — same mark the chat
   mounts (js/wiseai-chat.js OWL_BUG), inlined so this catalog never imports
   the chat engine. */
const DEMO_OWL_BUG = '<svg viewBox="0 0 193 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M10.9834 35.6522C10.9834 35.6522 3.30615 47.7494 3.30615 58.0481C3.30615 81.1921 20.324 99.6409 43.3405 99.9915C51.5363 100.052 60.4175 99.9915 67.533 92.6894C41.5052 92.6894 25.589 73.777 25.589 58.0481C25.589 58.0481 25.2144 45.6894 30.832 35.9526L10.9834 35.6522Z"/><path d="M83.8241 14.7368C90.9396 14.7368 94.8008 22.7337 96.3699 29.2111H96.5571C98.1262 22.7337 101.987 14.7368 109.103 14.7368H170.521C175.169 14.7368 175.169 12.8643 175.169 7.32269C175.169 2.80876 178.108 0 182.131 0H189.384V14.7368C189.384 27.7131 182.131 28.5339 174.794 28.5339L160.347 28.583H118.091C113.597 28.583 113.335 29.2111 111.537 33.7051C110.051 37.4206 96.5571 73.0277 96.5571 73.0277H96.3699C96.3699 73.0277 82.8761 37.4206 81.3899 33.7051C79.5923 29.2111 79.3301 28.583 74.8361 28.583H32.5803L18.133 28.5339C10.7965 28.5339 3.54341 27.7131 3.54341 14.7368V0H10.7965C14.5415 0 17.7585 3.37051 17.7585 7.32269C17.7585 12.8643 17.7585 14.7368 22.406 14.7368H83.8241Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M71.8001 35.9523C74.4284 35.9523 74.6161 37.2826 75.1793 38.6953L87.9434 71.5913C82.9358 80.6013 74.4289 85.7609 63.9558 85.7609C48.1132 85.7608 33.2662 72.7999 33.2663 54.6695C33.2664 48.2288 34.5088 40.1469 39.2583 35.9523H71.8001ZM63.486 44.5345C58.3905 44.5345 54.2598 48.6005 54.2598 54.0781C54.2598 59.5557 58.3905 63.6217 63.486 63.6217C68.5814 63.6216 72.7122 59.5556 72.7122 54.0781C72.7122 48.6005 68.5814 44.5346 63.486 44.5345Z"/><path d="M181.756 35.6522C181.756 35.6522 189.433 47.7494 189.433 58.0481C189.433 81.1921 172.416 99.6409 149.399 99.9915C141.203 100.052 132.322 99.9915 125.206 92.6894C151.234 92.6894 167.151 73.777 167.151 58.0481C167.151 58.0481 167.525 45.6894 161.908 35.9526L181.756 35.6522Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M120.94 35.9523C118.311 35.9523 118.124 37.2826 117.56 38.6953L104.796 71.5913C109.804 80.6013 118.311 85.7609 128.784 85.7609C144.626 85.7608 159.473 72.7999 159.473 54.6695C159.473 48.2288 158.231 40.1469 153.481 35.9523H120.94ZM129.254 44.5345C134.349 44.5345 138.48 48.6005 138.48 54.0781C138.48 59.5557 134.349 63.6217 129.254 63.6217C124.158 63.6216 120.027 59.5556 120.027 54.0781C120.027 48.6005 124.158 44.5346 129.254 44.5345Z"/></svg>';

function demoYouAvatar() {
  return '<span class="sc-avatar sc-avatar-you" role="img" aria-label="You" data-initials="AK">AK</span>';
}
function demoWiseAvatar() {
  return `<span class="sc-avatar sc-avatar-wiseai" role="img" aria-label="WISEcodeAI">${DEMO_OWL_BUG}</span>`;
}

/* Live avatar (account) popover from js/appearance-menu.js buildUserMenuBody,
   member-facing only — no Admin-locked Alerts / Agents / Preferences rows.
   data-pop-action is omitted so catalog clicks cannot navigate or sign out. */
function demoAvatarMenuPop() {
  return `
    <div class="wise-popover open" data-popover-static inert>
      <div class="wise-popover-header">Arthur Krupsky</div>
      <div class="wise-popover-item"><span class="material-symbols-outlined">person</span>My profile</div>
      <div class="wise-popover-item"><span class="material-symbols-outlined">receipt_long</span>Invoices</div>
      <div class="wise-popover-item"><span class="material-symbols-outlined">photo_library</span>Marketing Assets</div>
      <div class="wise-popover-divider"></div>
      <div class="wise-popover-item danger"><span class="material-symbols-outlined">logout</span>Sign out</div>
    </div>`;
}

function demoAvatarButtonStates() {
  return `
    <div class="dsc-states">
      <div class="dsc-state-col">
        <div class="dsc-sub-label">Default</div>
        <button type="button" class="topbar-profile" aria-label="Profile" tabindex="-1">MC</button>
      </div>
      <div class="dsc-state-col">
        <div class="dsc-sub-label">Hover</div>
        <button type="button" class="topbar-profile is-hover" aria-label="Profile" tabindex="-1">MC</button>
      </div>
      <div class="dsc-state-col">
        <div class="dsc-sub-label">Open</div>
        <button type="button" class="topbar-profile is-open" aria-label="Profile" aria-expanded="true" tabindex="-1">MC</button>
      </div>
      <div class="dsc-state-col">
        <div class="dsc-sub-label">Unread</div>
        <button type="button" class="topbar-profile has-dot" aria-label="Profile" tabindex="-1">MC</button>
      </div>
    </div>`;
}

/* Organization Profile → Avatar picture. Same markup as avatarUploadHtml()
   in js/profile-flow.js, including every built-in preset swatch. */
function demoAvatarPicker({ tab = 'file', activeId = 'aurora', showPresets = true } = {}) {
  const active = AVATAR_PRESETS.find((p) => p.id === activeId) || AVATAR_PRESETS[0];
  const src = avatarPresetSrc(active);
  const preview = `<img src="${esc(src)}" alt="Your avatar" />`;
  const body = tab === 'url'
    ? `<div class="pf-uprow">
         <input class="pf-url-input" type="url" placeholder="https://example.com/me.jpg" value="" readonly tabindex="-1" />
         <button type="button" class="pf-file-btn" tabindex="-1"><span class="material-symbols-outlined">download</span>Import</button>
       </div>`
    : `<div class="pf-uprow">
         <span class="pf-file-btn"><span class="material-symbols-outlined">upload_file</span>Choose File</span>
         <span class="pf-file-name">No file chosen</span>
       </div>`;
  const presets = AVATAR_PRESETS.map((p) => {
    const url = avatarPresetSrc(p);
    const on = p.id === active.id ? ' is-active' : '';
    const kind = p.src ? 'portrait' : 'pattern';
    return `<button type="button" class="pf-avatar-preset${on}" tabindex="-1" aria-label="${esc(p.label)} ${kind}" aria-pressed="${p.id === active.id ? 'true' : 'false'}"><img src="${esc(url)}" alt="" /></button>`;
  }).join('');
  return `
    <div class="pf-upload pf-avatar-upload" data-avatar-static inert>
      <div class="pf-upload-head">
        <div class="pf-upload-title">Avatar picture</div>
        <div class="pf-upload-sub">Your personal photo. Once set it appears in the primary navigation and on your messages in the chat. Until you add one, your initials are used.</div>
      </div>
      <div class="pf-avatar-row">
        <div class="pf-avatar-preview is-set">${preview}</div>
        <div class="pf-avatar-controls">
          <div class="pf-uptabs" role="tablist">
            <button type="button" class="pf-uptab${tab === 'file' ? ' is-active' : ''}" role="tab" tabindex="-1"><span class="material-symbols-outlined">description</span>Browse File</button>
            <button type="button" class="pf-uptab${tab === 'url' ? ' is-active' : ''}" role="tab" tabindex="-1"><span class="material-symbols-outlined">link</span>Import from URL</button>
          </div>
          ${body}
          <button type="button" class="pf-file-btn pf-avatar-remove" tabindex="-1"><span class="material-symbols-outlined">delete</span>Remove picture</button>
        </div>
      </div>
      ${showPresets ? `<div class="pf-avatar-presets">
        <span class="pf-avatar-presets-label">Or start from a pattern or photo</span>
        <div class="pf-avatar-presets-row" role="group" aria-label="Avatar starting images">${presets}</div>
      </div>` : ''}
      <div class="pf-hint">JPEG, PNG, WebP, HEIC and more. Square images look best.</div>
    </div>`;
}

function demoAvatarCatalog() {
  const photo = avatarPresetSrc(AVATAR_PRESETS.find((p) => p.id === 'portrait-m'));
  const photoImg = `<img class="wise-avatar-img" src="${esc(photo)}" alt="" />`;
  return `
    <div class="dsc-avatar-catalog">
      <div class="dsc-state-col">
        <div class="dsc-sub-label">Top-bar button</div>
        ${demoAvatarButtonStates()}
      </div>
      <div class="dsc-states">
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Initials · fallback</div>
          <div class="dsc-avatar-chip-row">
            <span class="adm-avatar">AF</span>
            <span class="adm-avatar">MC</span>
            <span class="adm-avatar">GP</span>
            <button type="button" class="topbar-profile" aria-label="Profile" tabindex="-1">JR</button>
            ${demoYouAvatar()}
          </div>
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Photo · set</div>
          <div class="dsc-avatar-chip-row">
            <span class="adm-avatar adm-avatar--photo">${photoImg}</span>
            <button type="button" class="topbar-profile has-avatar-img" aria-label="Profile" data-initials="MC" tabindex="-1">${photoImg}</button>
            <span class="sc-avatar sc-avatar-you has-avatar-img" role="img" aria-label="You" data-initials="AK">${photoImg}</span>
          </div>
        </div>
      </div>
      <div class="dsc-avatar-catalog-row">
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Avatar popover</div>
          ${demoAvatarMenuPop()}
        </div>
        <div class="dsc-state-col dsc-avatar-catalog-picker">
          <div class="dsc-sub-label">Organization Profile · Avatar picture</div>
          ${demoAvatarPicker({ tab: 'file', activeId: 'aurora' })}
        </div>
      </div>
      <div class="dsc-state-col dsc-avatar-catalog-picker">
        <div class="dsc-sub-label">Import from URL</div>
        ${demoAvatarPicker({ tab: 'url', activeId: 'portrait-f', showPresets: false })}
      </div>
    </div>`;
}

function demoDataTable() {
  return `
      <div class="adm-table-card adm-card" style="width:100%">
        <div class="adm-table" data-wtp-skip data-no-paginate data-w-date-root style="--adm-cols: 36px minmax(150px, 1.5fr) 108px 168px 52px 56px 78px 64px">
          <div class="adm-thead">
            <span class="adm-th" title="Actions"> </span>
            <span class="adm-th adm-th--sortable" data-adm-dir="asc">Identity ${ARROW_SVG_DEMO}</span>
            <span class="adm-th adm-th--sortable">Status ${ARROW_SVG_DEMO}</span>
            <span class="adm-th adm-th--sortable w-date-th">${(window.WiseDateCol && window.WiseDateCol.headerHtml({ kinds: 'org', lead: 'joined' })) || 'Date'}${ARROW_SVG_DEMO}</span>
            <span class="adm-th adm-th--num adm-th--sortable">Count ${ARROW_SVG_DEMO}</span>
            <span class="adm-th adm-th--num adm-th--sortable">Score ${ARROW_SVG_DEMO}</span>
            <span class="adm-th">Stars</span>
            <span class="adm-th adm-th--num adm-th--sortable">Amount ${ARROW_SVG_DEMO}</span>
          </div>
          <div class="adm-trow">
            <span class="adm-td adm-td--actions"><span class="adm-rowmenu"><button type="button" class="adm-rowmenu-btn" aria-label="Row actions"><span class="material-symbols-outlined">more_vert</span></button></span></span>
            <span class="adm-td"><span class="adm-idcell"><span class="adm-avatar">AB</span><span class="adm-idcell-body"><span class="adm-idcell-name"><a href="#" onclick="return false">Abbot's Butcher</a></span><span class="adm-idcell-sub">Independent Food/Beverage Brand</span></span></span></span>
            <span class="adm-td"><span class="adm-chip adm-chip--green"><span class="material-symbols-outlined">check</span>Active</span></span>
            <span class="adm-td"><span class="w-datecell">${(window.WiseDateCol && window.WiseDateCol.cellHtml(window.WiseDateCol.complete({ joined: 'Jun 26, 2026' }, 'org'), 'org', 'joined')) || 'Jun 26, 2026'}</span></span>
            <span class="adm-td adm-td--num is-hot">6</span>
            <span class="adm-td adm-td--num dsc-score">82</span>
            <span class="adm-td adm-td--metric"><span class="dsc-gs" aria-label="3 Guiding Stars"><span class="material-symbols-outlined dsc-gs-on">star</span><span class="material-symbols-outlined dsc-gs-on">star</span><span class="material-symbols-outlined dsc-gs-on">star</span></span></span>
            <span class="adm-td adm-td--num dsc-amt">$1,284</span>
          </div>
          <div class="adm-trow">
            <span class="adm-td adm-td--actions"><span class="adm-rowmenu"><button type="button" class="adm-rowmenu-btn" aria-label="Row actions"><span class="material-symbols-outlined">more_vert</span></button></span></span>
            <span class="adm-td"><span class="adm-idcell"><span class="adm-avatar adm-avatar--round">MC</span><span class="adm-idcell-body"><span class="adm-idcell-name">maya.chen</span><span class="adm-idcell-sub">maya@flax4life.com</span><span class="adm-idcell-sub">ID: 10482</span></span></span></span>
            <span class="adm-td"><span class="adm-chip adm-chip--amber"><span class="material-symbols-outlined">hourglass_top</span>Pending</span></span>
            <span class="adm-td"><span class="w-datecell">${(window.WiseDateCol && window.WiseDateCol.cellHtml(window.WiseDateCol.complete({ joined: 'Apr 18, 2026' }, 'org'), 'org', 'joined')) || 'Apr 18, 2026'}</span></span>
            <span class="adm-td adm-td--num is-hot">3</span>
            <span class="adm-td adm-td--num dsc-score">64</span>
            <span class="adm-td adm-td--metric"><span class="dsc-gs" aria-label="2 Guiding Stars"><span class="material-symbols-outlined dsc-gs-on">star</span><span class="material-symbols-outlined dsc-gs-on">star</span><span class="material-symbols-outlined dsc-gs-off">star</span></span></span>
            <span class="adm-td adm-td--num dsc-amt">$420</span>
          </div>
          <div class="adm-trow">
            <span class="adm-td adm-td--actions"><span class="adm-rowmenu"><button type="button" class="adm-rowmenu-btn" aria-label="Row actions"><span class="material-symbols-outlined">more_vert</span></button></span></span>
            <span class="adm-td"><span class="adm-idcell"><span class="adm-idcell-body"><span class="adm-idcell-name">Toasted Coconut Brownies</span><span class="adm-idcell-sub dsc-mono">UPC · 8 57287 00420 3</span></span></span></span>
            <span class="adm-td"><span class="adm-chip adm-chip--blue"><span class="material-symbols-outlined">gpp_good</span>Verified</span></span>
            <span class="adm-td"><span class="w-datecell">${(window.WiseDateCol && window.WiseDateCol.cellHtml(window.WiseDateCol.complete({ joined: 'May 2, 2026' }, 'org'), 'org', 'joined')) || 'May 2, 2026'}</span></span>
            <span class="adm-td adm-td--num is-hot">12</span>
            <span class="adm-td adm-td--num dsc-score">71</span>
            <span class="adm-td adm-td--metric"><span class="dsc-gs" aria-label="1 Guiding Star"><span class="material-symbols-outlined dsc-gs-on">star</span><span class="material-symbols-outlined dsc-gs-off">star</span><span class="material-symbols-outlined dsc-gs-off">star</span></span></span>
            <span class="adm-td adm-td--num dsc-amt">$86</span>
          </div>
          <div class="adm-trow">
            <span class="adm-td adm-td--actions"><span class="adm-rowmenu"><button type="button" class="adm-rowmenu-btn" aria-label="Row actions"><span class="material-symbols-outlined">more_vert</span></button></span></span>
            <span class="adm-td"><span class="adm-idcell"><span class="adm-avatar">BF</span><span class="adm-idcell-body"><span class="adm-idcell-name">Brave Foods</span><span class="adm-idcell-sub">Independent Food/Beverage Brand</span></span></span></span>
            <span class="adm-td"><span class="adm-chip adm-chip--outline">Invited</span></span>
            <span class="adm-td"><span class="w-datecell">${(window.WiseDateCol && window.WiseDateCol.cellHtml({ joined: '—', created: '—', active: '—', edited: '—' }, 'org', 'joined')) || '—'}</span></span>
            <span class="adm-td adm-td--num">0</span>
            <span class="adm-td adm-td--num" style="color:var(--text-subtle)">—</span>
            <span class="adm-td adm-td--metric"><span class="dsc-gs" aria-label="0 Guiding Stars"><span class="material-symbols-outlined dsc-gs-off">star</span><span class="material-symbols-outlined dsc-gs-off">star</span><span class="material-symbols-outlined dsc-gs-off">star</span></span></span>
            <span class="adm-td adm-td--num" style="color:var(--text-subtle)">—</span>
          </div>
        </div>
        <div class="wtp-foot">
          <span class="wtp-count">Showing <b>4</b> of <b>315</b> organizations</span>
          <button type="button" class="wtp-more">Load more<span class="material-symbols-outlined">expand_more</span></button>
        </div>
      </div>`;
}

/* Filter funnel popover — one specimen of every control type used in a
   list-filter pop across the app (select, date, exclusive chips, icon
   chips, stars, toggle, multi-select). */
function demoFilterToolbar() {
  return `
      <div class="dsc-states" style="width:100%">
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Closed</div>
          <div class="adm-search-inline has-filter" style="width:min(100%,280px)">
            <span class="material-symbols-outlined">search</span>
            <input type="search" class="adm-search" placeholder="Search\u2026" aria-label="Demo search closed" />
            <button type="button" class="adm-search-filter" aria-label="Filters"><span class="material-symbols-outlined">tune</span></button>
          </div>
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Hover \u00b7 active filters</div>
          <div class="adm-search-inline has-filter" style="width:min(100%,280px)">
            <span class="material-symbols-outlined">search</span>
            <input type="search" class="adm-search" placeholder="Search\u2026" aria-label="Demo search hover" />
            <button type="button" class="adm-search-filter is-hover has-dot" aria-label="Filters"><span class="material-symbols-outlined">tune</span></button>
          </div>
        </div>
        <div class="dsc-state-col" style="flex:1 1 100%">
          <div class="dsc-sub-label">Open \u00b7 every filter type</div>
          <div class="adm-toolbar" style="width:100%;max-width:420px;position:relative">
            <div class="adm-search-inline has-filter" style="flex:1 1 auto">
              <span class="material-symbols-outlined">search</span>
              <input type="search" class="adm-search" placeholder="Search organizations\u2026" aria-label="Demo search open" />
              <button type="button" class="adm-search-filter is-active has-dot" aria-label="Filters" aria-expanded="true"><span class="material-symbols-outlined">tune</span></button>
            </div>
            <div class="adm-filter-pop" data-popover-static>
              <div class="wmod-filter-pop-head">
                <span class="wmod-filter-pop-title">Filter</span>
                <button type="button" class="adm-filter-clear">Clear all</button>
              </div>
              <div class="adm-field">
                <span class="adm-field-label">Select \u00b7 User Management \u00b7 Audit \u00b7 Quick Invite</span>
                <select class="adm-select" aria-label="Plan"><option>All plans</option><option>Enterprise</option><option>Growth</option></select>
              </div>
              <div class="wmod-filter-group">
                <div class="wmod-filter-label">Date range \u00b7 Audit Queue</div>
                <div class="dsc-filter-dates">
                  <div class="adm-field">
                    <span class="adm-field-label">After</span>
                    <input type="date" class="adm-input" value="2026-03-01" aria-label="Flagged after" />
                  </div>
                  <div class="adm-field">
                    <span class="adm-field-label">Before</span>
                    <input type="date" class="adm-input" value="2026-08-01" aria-label="Flagged before" />
                  </div>
                </div>
              </div>
              <div class="wmod-filter-group">
                <div class="wmod-filter-label">Chips \u00b7 exclusive \u00b7 Portfolio \u00b7 API Keys</div>
                <div class="wmod-filter-chips" role="group" aria-label="Status">
                  <button type="button" class="wmod-fchip is-on">All</button>
                  <button type="button" class="wmod-fchip">Active</button>
                  <button type="button" class="wmod-fchip">Pending</button>
                  <button type="button" class="wmod-fchip">Invited</button>
                </div>
              </div>
              <div class="wmod-filter-group">
                <div class="wmod-filter-label">Chips \u00b7 icons \u00b7 Library</div>
                <div class="wmod-filter-chips" role="group" aria-label="Type">
                  <button type="button" class="wmod-fchip is-on"><span class="material-symbols-outlined">description</span>Reports</button>
                  <button type="button" class="wmod-fchip"><span class="material-symbols-outlined">bar_chart</span>Dashboards</button>
                  <button type="button" class="wmod-fchip"><span class="material-symbols-outlined">forum</span>Chats</button>
                </div>
              </div>
              <div class="wmod-filter-group">
                <div class="wmod-filter-label">Chips \u00b7 stars \u00b7 Guiding Stars</div>
                <div class="wmod-filter-chips" role="group" aria-label="Rating">
                  <button type="button" class="wmod-fchip is-on">All</button>
                  <button type="button" class="wmod-fchip">0 <span class="material-symbols-outlined">star</span></button>
                  <button type="button" class="wmod-fchip">1 <span class="material-symbols-outlined">star</span></button>
                  <button type="button" class="wmod-fchip">2 <span class="material-symbols-outlined">star</span></button>
                  <button type="button" class="wmod-fchip">3 <span class="material-symbols-outlined">star</span></button>
                </div>
              </div>
              <div class="wmod-filter-group">
                <div class="wmod-filter-label">Chip \u00b7 toggle \u00b7 Portfolio near-miss</div>
                <div class="wmod-filter-chips">
                  <button type="button" class="wmod-fchip is-on"><span class="material-symbols-outlined">bolt</span>Near-miss \u2605\u2605 \u2192 \u2605\u2605\u2605</button>
                </div>
              </div>
              <div class="wmod-filter-group">
                <div class="wmod-filter-label">Chips \u00b7 multi-select \u00b7 Ingredient Browser</div>
                <div class="wmod-filter-chips" role="group" aria-label="Flags">
                  <button type="button" class="wmod-fchip is-on">High intensity</button>
                  <button type="button" class="wmod-fchip">Natural</button>
                  <button type="button" class="wmod-fchip is-on">Sugar alcohol</button>
                  <button type="button" class="wmod-fchip">Added sugar</button>
                </div>
              </div>
              <div class="adm-filter-pop-foot">
                <button type="button" class="adm-filter-clear">Clear all</button>
                <button type="button" class="adm-btn adm-btn--primary adm-btn--sm">Apply</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
}

/* Live History module language from js/chat-history.js — color chat-dot,
   folder / folder_open toggle, tree elbows, hover actions (no inline meta). */
function demoWchItem({ title, color = '#12B981', active, live, fork, mcp, hover } = {}) {
  const forkBadge = fork
    ? '<span class="wch-fork-badge"><span class="material-symbols-outlined">alt_route</span></span>'
    : '';
  const mcpBadge = mcp
    ? '<span class="wch-mcp-badge"><span class="material-symbols-outlined">dns</span></span>'
    : '';
  const dot = live
    ? '<span class="wch-chat-dot wch-live-dot" aria-hidden="true"></span>'
    : `<span class="wch-chat-dot" style="color:${esc(color)}" aria-hidden="true"></span>`;
  return `
    <div class="wch-item${active ? ' wch-active' : ''}${live ? ' wch-item-live' : ''}${hover ? ' is-hover' : ''}" role="listitem" tabindex="-1" draggable="true">
      ${dot}
      <div class="wch-item-title">${forkBadge}${mcpBadge}${esc(title)}</div>
      <div class="wch-item-actions">
        <button type="button" class="wch-iact wch-drag-handle" tabindex="-1" aria-label="Drag conversation into a project"><span class="material-symbols-outlined">drag_indicator</span></button>
        <button type="button" class="wch-iact" tabindex="-1" aria-label="Rename conversation"><span class="material-symbols-outlined">edit</span></button>
        <button type="button" class="wch-iact" tabindex="-1" aria-label="Move to project"><span class="material-symbols-outlined">drive_file_move</span></button>
        <button type="button" class="wch-iact" tabindex="-1" aria-label="Delete conversation"><span class="material-symbols-outlined">delete_outline</span></button>
      </div>
    </div>`;
}

function demoWchProject({ name, color, count, collapsed, dropOn, loose, children } = {}) {
  const tone = loose ? '' : ` style="color:${esc(color || '#2F6DF6')}"`;
  const menu = loose
    ? ''
    : '<button type="button" class="wch-proj-menu" tabindex="-1" aria-label="Project options"><span class="material-symbols-outlined">more_horiz</span></button>';
  const body = children == null
    ? '<div class="wch-project-empty">Empty — drag a chat here, or use a chat’s move button.</div>'
    : children;
  return `
    <div class="wch-project${collapsed ? ' wch-collapsed' : ''}${dropOn ? ' wch-drop-on' : ''}${loose ? ' wch-loose wch-ungrouped' : ''}">
      <div class="wch-project-head" role="button" tabindex="-1" aria-expanded="${collapsed ? 'false' : 'true'}">
        <button type="button" class="wch-proj-toggle" tabindex="-1" aria-label="Expand or collapse"${tone}><span class="material-symbols-outlined">${collapsed ? 'folder' : 'folder_open'}</span></button>
        <span class="wch-proj-name">${esc(name)}</span>
        <span class="wch-proj-count">${count == null ? '' : count}</span>
        ${menu}
      </div>
      <div class="wch-project-body">${body}</div>
    </div>`;
}

function demoWchPane(inner) {
  return `
    <div class="dsc-wch">
      <div class="wch-projects">
        <div class="wch-projects-head">
          <span class="wch-projects-title">Folders</span>
          <button type="button" class="wch-proj-add" tabindex="-1" title="New folder" aria-label="New folder"><span class="material-symbols-outlined">create_new_folder</span></button>
        </div>
        ${inner}
      </div>
    </div>`;
}

function demoWchInfo({ title = 'Compare oat milk vs almond milk', when = 'Today · 2:11 PM', msgs = '8 messages', live, fork, mcp } = {}) {
  return `
    <div class="wch-info is-vis" aria-hidden="true">
      <div class="wch-info-title">${esc(title)}</div>
      ${live ? '<div class="wch-info-row is-live"><span class="material-symbols-outlined">bolt</span><span>Responding now…</span></div>' : ''}
      <div class="wch-info-row"><span class="material-symbols-outlined">schedule</span><span>${esc(when)}</span></div>
      <div class="wch-info-row"><span class="material-symbols-outlined">forum</span><span>${esc(msgs)}</span></div>
      ${fork ? `<div class="wch-info-row"><span class="material-symbols-outlined">alt_route</span><span>Forked from ${esc(fork)}</span></div>` : ''}
      ${mcp ? '<div class="wch-info-row"><span class="material-symbols-outlined">dns</span><span>Used the MCP server</span></div>' : ''}
    </div>`;
}

function demoHistoryCatalog() {
  const extreme = demoWchPane(
    demoWchProject({
      name: 'Q3 verification', color: '#2F6DF6', count: 11,
      children:
        demoWchItem({ title: 'Compare oat milk vs almond milk', color: '#2F6DF6', active: true, hover: true }) +
        demoWchItem({ title: 'UPF report for granola', color: '#F59E0B', fork: true }) +
        demoWchItem({ title: 'Non-UPF attestation for oat bars', color: '#12B981' }) +
        demoWchItem({ title: 'Sodium claim on soup', color: '#EC4899' }) +
        demoWchProject({
          name: 'Claims', color: '#8B5CF6', count: 4,
          children:
            demoWchItem({ title: 'Fiber claim — granola', color: '#8B5CF6' }) +
            demoWchItem({ title: 'Whole grain wording', color: '#06B6D4' }) +
            demoWchProject({
              name: 'Reformulation', color: '#EF4444', count: 2,
              children:
                demoWchItem({ title: 'Swap maltodextrin', color: '#EF4444' }) +
                demoWchItem({ title: 'Cut added sugar 12%', color: '#84CC16' }),
            }),
        }) +
        demoWchItem({ title: 'GRAS letter for new enzyme', color: '#06B6D4', mcp: true }),
    }) +
    demoWchProject({
      name: 'Reports', color: '#12B981', count: 4, dropOn: true,
      children:
        demoWchItem({ title: 'Guiding Stars vs category', color: '#12B981' }) +
        demoWchItem({ title: 'Portfolio UPF share', color: '#2F6DF6' }) +
        demoWchItem({ title: 'WISEcode processing board', color: '#F59E0B' }) +
        demoWchItem({ title: 'Ingredient audit queue', color: '#EC4899' }),
    }) +
    demoWchProject({ name: 'Parked', color: '#F59E0B', count: 0 }) +
    demoWchProject({
      name: 'All conversations', count: 3, loose: true,
      children:
        demoWchItem({ title: 'What can I ask about oat milk?', color: '#12B981', live: true }) +
        demoWchItem({ title: 'Draft a verification email', color: '#8B5CF6', mcp: true }) +
        demoWchItem({ title: 'Yesterday’s granola thread', color: '#06B6D4' }),
    }),
  );
  const empty = demoWchPane(
    demoWchProject({
      name: 'All conversations', count: 0, loose: true,
      children: '<div class="wch-project-empty">No saved conversations yet. Start chatting, then use “New conversation” to file this one here.</div>',
    }),
  );
  const noFolders = `
    <div class="dsc-wch-with-info">
      ${demoWchPane(
        demoWchProject({
          name: 'All conversations', count: 6, loose: true,
          children:
            demoWchItem({ title: 'Compare oat milk vs almond milk', color: '#12B981', active: true, hover: true }) +
            demoWchItem({ title: 'UPF report for granola', color: '#F59E0B', fork: true }) +
            demoWchItem({ title: 'What can I ask about oat milk?', color: '#2F6DF6', live: true }) +
            demoWchItem({ title: 'Draft a verification email', color: '#8B5CF6', mcp: true }) +
            demoWchItem({ title: 'Sodium claim on soup', color: '#EC4899' }) +
            demoWchItem({ title: 'Guiding Stars vs category', color: '#06B6D4' }),
        }),
      )}
      ${demoWchInfo()}
    </div>`;
  const nested = demoWchPane(
    demoWchProject({
      name: 'Portfolio', color: '#2F6DF6', count: 4,
      children:
        demoWchProject({
          name: 'Claimed', color: '#12B981', count: 2,
          children:
            demoWchProject({ name: 'Oat', color: '#06B6D4', count: 0, collapsed: true, children: '' }) +
            demoWchProject({ name: 'Granola', color: '#F59E0B', count: 0, collapsed: true, children: '' }),
        }) +
        demoWchProject({ name: 'Discovered', color: '#8B5CF6', count: 0, collapsed: true, children: '' }) +
        demoWchProject({
          name: 'Needs info', color: '#EC4899', count: 1,
          children:
            demoWchProject({ name: 'Soup', color: '#84CC16', count: 0, collapsed: true, children: '' }),
        }),
    }) +
    demoWchProject({
      name: 'Reports', color: '#EF4444', count: 2,
      children:
        demoWchProject({ name: 'Guiding Stars', color: '#F59E0B', count: 0, collapsed: true, children: '' }) +
        demoWchProject({ name: 'GRAS', color: '#84CC16', count: 0, collapsed: true, children: '' }),
    }) +
    demoWchProject({
      name: 'All conversations', count: 0, loose: true, collapsed: true,
      children: '',
    }),
  );
  return `
    <div class="dsc-wch-catalog">
      <div class="dsc-state-col dsc-wch-catalog-extreme">
        <div class="dsc-sub-label">Extreme</div>
        ${extreme}
      </div>
      <div class="dsc-wch-catalog-grid">
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Empty</div>
          ${empty}
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">No folders</div>
          ${noFolders}
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Nested folders</div>
          ${nested}
        </div>
      </div>
    </div>`;
}

/* Compact header trail — Marketing Assets ghost + brand chip + ⋯, the cluster
   that sits left of the module kebab on Portfolio / Marketing Assets / Invoices. */
function demoHeadTrail({ hover, open, disabled } = {}) {
  const hov = hover ? ' is-hover' : '';
  const dis = disabled ? ' disabled' : '';
  const exp = open ? 'true' : 'false';
  return `
    <div class="pf-head-trail pf-head-trail--compact">
      <button type="button" class="pf-head-btn pf-head-btn--ghost${hov}"${dis}>
        <span class="material-symbols-outlined">photo_library</span>Marketing Assets
      </button>
      <div class="pf-brand">
        <button type="button" class="pf-brand-chip${hov}" aria-haspopup="listbox" aria-expanded="${exp}"${dis}>
          <span class="pf-brand-avatar" style="background:#2E7D5B">F</span>
          <span class="pf-brand-name">Flax4Life</span>
          <span class="material-symbols-outlined pf-brand-caret" aria-hidden="true">expand_more</span>
        </button>
      </div>
      <button type="button" class="panel-more-btn"${dis} aria-label="Module options">
        <span class="material-symbols-outlined">more_vert</span>
      </button>
    </div>`;
}

/* Icon-only .lir-btn — one glyph, four states. Appearance (crossword) is the
   live leftover of this shape on the portfolio rail; do not invent a bell or
   kebab here. Those live on the avatar and the module ⋯, not this primitive. */
function demoLirBtn({ hover, open, disabled } = {}) {
  const cls = ['lir-btn', hover ? 'is-hover' : '', open ? 'is-open' : ''].filter(Boolean).join(' ');
  const dis = disabled ? ' disabled' : '';
  const exp = open ? ' aria-expanded="true"' : '';
  return `<button type="button" class="${cls}" aria-label="Appearance"${exp}${dis}><span class="material-symbols-outlined">crossword</span></button>`;
}
function demoFbBtn({ fb, tip, icon, on, more, hover }) {
  const cls = ['sc-fb-btn', more ? 'sc-fb-more' : '', on ? 'is-on' : '', hover ? 'is-hover' : ''].filter(Boolean).join(' ');
  const dataFb = fb ? ` data-fb="${esc(fb)}"` : '';
  const moreAttr = more ? ' data-fb-more' : '';
  return `<button type="button" class="${cls}"${dataFb}${moreAttr} data-tip="${esc(tip)}" aria-label="${esc(tip)}"><span class="material-symbols-outlined">${esc(icon)}</span></button>`;
}
function demoReasonsPop(kind, open) {
  const down = kind === 'down';
  const label = down ? 'What wasn\u2019t right?' : 'What was accurate?';
  const chips = down
    ? ['Inaccurate', 'Missing info', 'Wrong food', 'Outdated data']
    : ['Trustworthy sources', 'Clear & easy', 'Thorough', 'Right food'];
  const chipHtml = chips.map((c, i) =>
    `<button type="button" class="chip sc-fb-reason${i === 0 && open ? ' is-on' : ''}" data-reason="${esc(c)}">${esc(c)}</button>`
  ).join('');
  return `<div class="sc-fb-reasons sc-fb-reasons--${kind}${open ? ' is-demo-open' : ''}" role="menu" aria-label="${esc(label)}"${open ? '' : ' hidden'}>
    <span class="sc-fb-reasons-label">${esc(label)}</span>
    <div class="sc-fb-reason-chips">${chipHtml}</div>
    <div class="sc-fb-form">
      <textarea class="sc-fb-input" rows="2" placeholder="${down ? 'Tell us more (optional)' : 'What worked? (optional)'}" aria-label="Optional note"></textarea>
      <button type="button" class="chip sc-fb-send">Send</button>
    </div>
  </div>`;
}
function demoTranscriptTokenMore({ open } = {}) {
  return `<span class="sc-fb-more-wrap">
    ${demoFbBtn({ more: true, tip: 'More actions', icon: 'more_horiz', on: open })}
    <div class="sc-fb-menu${open ? ' is-demo-open' : ''}" role="menu"${open ? '' : ' hidden'}>
      <span class="sc-fb-menu-actions">
        ${demoFbBtn({ fb: 'replay', tip: 'Re-run in new chat', icon: 'auto_read_play' })}
        ${demoFbBtn({ fb: 'edit', tip: 'Edit in new chat', icon: 'bubble' })}
        ${demoFbBtn({ fb: 'turn', tip: 'Fork a turn', icon: 'alt_route' })}
        ${demoFbBtn({ fb: 'file', tip: 'File to folder', icon: 'drive_file_move' })}
        <span class="sc-fb-id" data-tip="Turn ID" tabindex="0">#6d7a</span>
      </span>
      <span class="sc-fb-menu-div" aria-hidden="true"></span>
      <span class="sc-fb-menu-tokens" role="status">1.3k in / 412 out · <em>1.0k cached (78%)</em> · <b>$0.0030</b> · 3s · 2 ops · 1 tools</span>
    </div>
  </span>`;
}
function demoFbRow({ hoverCopy, upOpen, downOpen, moreOpen, upOn, downOn } = {}) {
  return `<div class="sc-fb-wrap">
    <div class="sc-fb" role="group" aria-label="Answer actions">
      <span class="sc-fb-copy-wrap">
        ${demoFbBtn({ fb: 'copy', tip: 'Copy answer', icon: 'content_copy', hover: hoverCopy })}
        <span class="sc-fb-copied${hoverCopy ? ' is-vis' : ''}" role="status"${hoverCopy ? '' : ' aria-hidden="true"'}><span class="material-symbols-outlined">check</span>Copied</span>
      </span>
      <span class="sc-fb-up-wrap">
        ${demoFbBtn({ fb: 'up', tip: 'Accurate', icon: 'thumb_up', on: !!upOn })}
        ${demoReasonsPop('up', upOpen)}
      </span>
      <span class="sc-fb-down-wrap">
        ${demoFbBtn({ fb: 'down', tip: 'Not accurate', icon: 'thumb_down', on: !!downOn })}
        ${demoReasonsPop('down', downOpen)}
      </span>
      ${demoTranscriptTokenMore({ open: moreOpen })}
      <span class="sc-line-time sc-fb-time" role="button" tabindex="0">3 min ago</span>
    </div>
  </div>`;
}
function demoActTick(type, { stacked, hover, id } = {}) {
  const cap = id ? `<span class="wa-activity-tick-id">#${esc(id)}</span>` : '';
  const tick = `<button type="button" class="wa-activity-tick wa-activity-tick--${type}${hover ? ' is-hover' : ''}" title="${esc(type)}" aria-label="${esc(type)}">${cap}</button>`;
  if (!stacked) return tick;
  return `<span class="wa-activity-tick-stack${hover ? ' is-hover' : ''}">${tick}${tick}</span>`;
}
function demoJamEq(n) {
  return eqBarsMarkup(n);
}

function demoJamStrip(viz, playing, chips) {
  const chipHtml = (chips || JAM_SONGS.slice(0, 4)).map((s, i) => {
    const song = typeof s === 'string' ? { id: s, label: s } : s;
    const on = playing && i === 0;
    return `<button type="button" class="jam-song${on ? ' is-active' : ''}">${esc(song.label)}</button>`;
  }).join('');
  return `
    <div class="jam-strip mi-jam-demo${playing ? ' is-playing' : ''} jam-viz-${viz}" data-jam-viz="${viz}" role="group" aria-label="${playing ? 'Playing' : 'Idle'} ${viz} jam bar">
      <button type="button" class="jam-play" data-jam-catalog-play aria-label="${playing ? 'Pause the jam' : 'Play the jam'}" aria-pressed="${playing ? 'true' : 'false'}">
        <span class="material-symbols-outlined jam-play-icon">${playing ? 'pause' : 'play_arrow'}</span>
      </button>
      <div class="jam-eq" aria-hidden="true">${eqBarsMarkup(20)}</div>
      ${helixVizMarkup()}
      <div class="jam-songs" role="group">${chipHtml}</div>
    </div>`;
}

function demoJamCrate() {
  const rows = JAM_SONGS.map((s) => `
    <tr>
      <td><button type="button" class="jam-song${s.id === 'tetris' ? ' is-active' : ''}" data-jam-catalog-select="${esc(s.id)}">${esc(s.label)}</button></td>
      <td>${esc(s.artist || '—')}</td>
      <td>${esc(s.durationLabel)}</td>
      <td><code>${esc(s.fileName)}</code></td>
      <td>${esc(s.fileSizeLabel)}</td>
      <td>${esc(s.type)}</td>
      <td>${s.bpm}</td>
    </tr>`).join('');
  return `
    <div class="mi-jam-crate-wrap">
      <div class="dsc-sub-label">Crate — every track</div>
      <table class="mi-jam-crate" data-wtp-skip data-no-row-click>
        <thead>
          <tr>
            <th>Track</th>
            <th>Artist</th>
            <th>Length</th>
            <th>File</th>
            <th>Size</th>
            <th>Wave</th>
            <th>BPM</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function wireJamCatalog(root) {
  if (!root || root.__jamCatalogBound) return;
  root.__jamCatalogBound = true;
  root.addEventListener('click', (e) => {
    const play = e.target.closest('[data-jam-catalog-play]');
    if (play) {
      e.preventDefault();
      e.stopPropagation();
      toggleJam();
      return;
    }
    const pick = e.target.closest('[data-jam-catalog-select]');
    if (pick) {
      e.preventDefault();
      e.stopPropagation();
      selectJam(pick.dataset.jamCatalogSelect);
    }
  });
}

/* Flat chat ⋮ menu matching pages/wiseai.html + js/wiseai-chat.js. groupifyChatMenu
   (booted when this card opens) turns it into the live one-column Conversation /
   Activity stack, Admin kebab, and row hints. Helix joins as a second column
   only when Internal admins is on. This specimen pins data-admin-demo="off"
   so it stays the member-facing menu — Admin-badged rows are gated by
   Appearance on the live chat, not shown here. */
function demoChatMenuPop() {
  const row = (sc, icon, label, extra) =>
    `<button type="button" class="topbar-menu-item${extra || ''}" data-sc="${esc(sc)}">` +
    `<span class="material-symbols-outlined topbar-menu-icon">${esc(icon)}</span>` +
    `<span>${label}</span></button>`;
  const sw = ({ sc, icon, label, on, admin, pink, cls }) => {
    const klass = [
      'topbar-menu-item',
      admin ? 'topbar-menu-item--admin' : '',
      'sc-mcp-item',
      on ? 'is-on' : '',
      cls || '',
    ].filter(Boolean).join(' ');
    const badge = admin ? '<span class="topbar-menu-badge">Admin</span>' : '';
    const swCls = pink ? 'sc-switch sc-switch--pink' : 'sc-switch';
    return `<button type="button" class="${klass}" data-sc="${esc(sc)}" role="menuitemcheckbox" aria-checked="${on ? 'true' : 'false'}">` +
      `<span class="material-symbols-outlined topbar-menu-icon">${esc(icon)}</span>` +
      `<span>${label}</span>${badge}` +
      `<span class="${swCls}" aria-hidden="true"></span></button>`;
  };
  return `<div class="topbar-popover" data-popover-static data-chat-menu-demo data-admin-demo="off">
    ${sw({ sc: 'history', icon: 'history', label: 'History &amp; Projects', on: false })}
    ${row('new', 'add', 'Start new conversation')}
    ${row('export', 'download', 'Export conversation')}
    ${row('share', 'share', 'Share')}
    ${row('file-library', 'auto_stories', 'File to Library')}
    <div class="topbar-menu-divider"></div>
    ${sw({ sc: 'turns', icon: 'alt_route', label: 'Turns', on: false, admin: true })}
    ${sw({ sc: 'outputs', icon: 'dashboard_customize', label: 'Hide outputs &amp; sources', on: true, admin: true })}
    <button type="button" class="topbar-menu-item topbar-menu-item--admin" data-sc="connect">
      <span class="material-symbols-outlined topbar-menu-icon">hub</span>
      <span>Connect a data source</span>
      <span class="topbar-menu-badge">Admin</span>
    </button>
    <div class="topbar-menu-divider"></div>
    ${sw({ sc: 'toggle-cards', icon: 'dashboard', label: 'Overview cards', on: false, admin: true, pink: true })}
    ${sw({ sc: 'toggle-intent-chips', icon: 'label', label: 'Intent chips', on: true, admin: true, pink: true })}
    ${sw({ sc: 'compact', icon: 'density_small', label: 'Compact spacing', on: true, admin: true, pink: true, cls: 'sc-compact-item' })}
    ${sw({ sc: 'brandtext', icon: 'format_color_text', label: 'Brand AI text', on: false, admin: true, pink: true, cls: 'sc-brandtext-item' })}
    ${sw({ sc: 'sheen', icon: 'auto_awesome', label: 'Input glow', on: true, admin: true, pink: true, cls: 'sc-sheen-item' })}
    ${sw({ sc: 'bg-anim', icon: 'animation', label: 'Animation', on: true, admin: true, pink: true, cls: 'sc-bganim-item' })}
    ${sw({ sc: 'activity-strip', icon: 'timeline', label: 'Activity strip', on: true, admin: true, pink: true, cls: 'sc-actstrip-item' })}
    <div class="sc-stream-detail sc-actside-detail" data-admin-item="1">
      <span class="sc-stream-detail-label">Strip side</span>
      <div class="sc-stream-seg" role="radiogroup" aria-label="Activity strip side">
        <button type="button" class="sc-stream-seg-btn is-on" data-sc="activity-strip-side" data-actside="left" role="radio" aria-checked="true">Left</button>
        <button type="button" class="sc-stream-seg-btn" data-sc="activity-strip-side" data-actside="right" role="radio" aria-checked="false">Right</button>
      </div>
    </div>
    <div class="topbar-menu-divider"></div>
    ${sw({ sc: 'stream-toggle', icon: 'stream', label: 'Response streaming', on: true, cls: 'sc-stream-item' })}
    <div class="sc-stream-detail">
      <span class="sc-stream-detail-label">Streaming detail</span>
      <div class="sc-stream-seg" role="radiogroup" aria-label="Response streaming detail">
        <button type="button" class="sc-stream-seg-btn is-on" data-sc="stream-level" data-stream="full" role="radio" aria-checked="true">Full</button>
        <button type="button" class="sc-stream-seg-btn" data-sc="stream-level" data-stream="steps" role="radio" aria-checked="false">Steps</button>
        <button type="button" class="sc-stream-seg-btn" data-sc="stream-level" data-stream="final" role="radio" aria-checked="false">Final</button>
      </div>
    </div>
    <div class="topbar-menu-divider"></div>
    ${row('close', 'close', 'Close conversation', ' topbar-menu-item--danger')}
  </div>`;
}

/* Stacked chat composer — same markup mountWISEcodeAIChat / wireChatComposer
   expect. Leave `.fl-model-row` empty so wireChatComposer injects the live
   database selector (never embed a data-popover-static Databases stub here —
   that leaked into the default state). */
function demoComposerAttachChip({ name, src, icon }) {
  const thumb = src
    ? `<span class="fl-attach-thumb" style="background-image:url('${esc(src)}')"></span>`
    : `<span class="fl-attach-thumb fl-attach-thumb--icon"><span class="material-symbols-outlined">${esc(icon || 'image')}</span></span>`;
  return `<span class="fl-attach-chip" title="${esc(name)}"><button type="button" class="fl-attach-x" aria-label="Remove ${esc(name)}"><span class="material-symbols-outlined">close</span></button><span class="fl-attach-name">${esc(name)}</span>${thumb}</span>`;
}
function demoComposerHtml({ value = '', attachments = [] } = {}) {
  const hasAtt = attachments.length > 0;
  const attHtml = hasAtt ? attachments.map(demoComposerAttachChip).join('') : '';
  const text = value ? esc(value) : '';
  return `
      <div class="sc-input-row" data-wise-composer>
        <div class="fl-input-wrap fl-input-wrap--lead fl-input-wrap--stacked${hasAtt ? ' has-attachments' : ''}">
          <div class="fl-more-wrap">
            <button type="button" class="fl-icon-btn fl-more-btn" title="Attach" aria-haspopup="menu" aria-expanded="false" aria-label="Attach"><span class="material-symbols-outlined">add</span></button>
            <div class="fl-more-popover fl-more-popover--left" role="menu">
              <button type="button" class="fl-more-item"><span class="material-symbols-outlined">attach_file</span><span>Attach</span></button>
              <button type="button" class="fl-more-item"><span class="material-symbols-outlined">photo_camera</span><span>Camera</span></button>
              <button type="button" class="fl-more-item"><span class="material-symbols-outlined">mic</span><span>Voice</span></button>
              <div class="fl-more-divider" role="separator"></div>
              <button type="button" class="fl-more-item"><span class="material-symbols-outlined">burst_mode</span><span>Load 3 example images</span></button>
            </div>
          </div>
          <div class="fl-input-col">
            <div class="fl-model-row"></div>
            <div class="fl-input-line">
              <textarea class="fl-input" rows="1" autocomplete="off" placeholder="Ask WISEcodeAI about any food\u2026">${text}</textarea>
            </div>
            <div class="fl-attachments" aria-label="Pending attachments">${attHtml}</div>
          </div>
          <button type="button" class="sc-send" title="Send"><span class="material-symbols-outlined">send</span></button>
        </div>
      </div>`;
}
const DEMO_COMPOSER_LONG =
  "I'll walk you through building this product — photo, category, ingredients, the Nutrition Facts panel, allergens and the UPC. Start any way you like: upload a label, paste a URL, or type it in. Everything shows up live in Product Details on the right. It stays a draft until you hit Save to Portfolio.";
const DEMO_COMPOSER_ATTS = [
  { name: 'muffin-front.png', src: '../assets/portfolio/blueberry_muffins.png' },
  { name: 'nutrition-panel.jpg', src: '../assets/portfolio/chocolate_chip_muffins.png' },
  { name: 'ingredients.jpg', src: '../assets/portfolio/apple_cinnamon_muffins.png' },
];

/* Catalog App search — same groups as js/app-search.js (Transcripts /
   Outputs / Reports). Default query is "oat milk" so the open list shows
   several hits; typing filters this sample set. Hits stay in the card. */
const DEMO_APP_SEARCH_Q = 'oat milk';
const DEMO_APP_SEARCH_ROWS = [
  { kind: 'transcript', icon: 'forum', title: 'Compare oat milk vs almond milk', where: 'WISEcodeAI · today', text: 'Compare oat milk vs almond milk. Scanning oat-milk products, added sugars, oils and gums.' },
  { kind: 'transcript', icon: 'forum', title: 'Compare oat-milk brands for gut health', where: 'WISEcodeAI · yesterday', text: 'Compare the top oat-milk brands for gut health. Oatly Barista leads on gut-health score.' },
  { kind: 'transcript', icon: 'forum', title: 'Best chocolate chip cookie with the least chocolate', where: 'WISEcodeAI · last week', text: 'Best chocolate chip cookie with the least chocolate. Show me a pretty report.' },
  { kind: 'output', icon: 'bar_chart', title: 'Oat milk comparison', where: 'Visuals · v2', text: 'Side-by-side oat milk vs almond milk macros and gums.' },
  { kind: 'output', icon: 'image', title: 'Oat milk nutrition panel', where: 'Results · today', text: 'Label photo from the oat milk reformulation.' },
  { kind: 'output', icon: 'analytics', title: 'Worst-ranked cupcake · detail', where: 'Visuals · v1', text: 'Worst-ranked cupcake charts and trends.' },
  { kind: 'report', icon: 'star', title: 'Guiding Stars Action Plan', where: 'Reports · Portfolio reports', text: 'Oat milk SKUs two stars from the next band. Prioritized path to more stars.' },
  { kind: 'report', icon: 'verified_user', title: 'Portfolio GRAS', where: 'Reports · Portfolio reports', text: 'GRAS notes on oat milk gums and oils.', locked: true },
  { kind: 'report', icon: 'description', title: 'Portfolio UPF', where: 'Reports · Portfolio reports', text: 'Ultra-processed food classification across the portfolio.' },
];
const DEMO_APP_SEARCH_LABELS = { transcript: 'Transcripts', output: 'Outputs', report: 'Reports' };

function demoSearchToks(q) {
  return String(q || '').toLowerCase().split(/[^\p{L}\p{N}%+.-]+/u).map((t) => t.trim()).filter(Boolean);
}
function demoSearchMark(text, toks) {
  const raw = esc(text);
  if (!toks.length) return raw;
  const parts = toks.slice().sort((a, b) => b.length - a.length).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return raw.replace(new RegExp(`(${parts.join('|')})`, 'ig'), '<mark>$1</mark>');
}
function demoSearchHitHTML(row, toks) {
  const lock = row.locked ? '<span class="wise-app-search-lock material-symbols-outlined" aria-hidden="true">lock</span>' : '';
  const snip = row.text ? `<span class="wise-app-search-hit-snip">${demoSearchMark(row.text, toks)}</span>` : '';
  return `<button type="button" class="wise-app-search-hit" role="option">
    <span class="material-symbols-outlined wise-app-search-hit-ico" aria-hidden="true">${esc(row.icon || 'search')}</span>
    <span class="wise-app-search-hit-body">
      <span class="wise-app-search-hit-title">${demoSearchMark(row.title, toks)}${lock}</span>
      <span class="wise-app-search-hit-where">${esc(row.where)}</span>
      ${snip}
    </span>
  </button>`;
}
function demoSearchResultsHTML(q) {
  const toks = demoSearchToks(q);
  if (!toks.length) return '';
  const hay = (row) => `${row.title} ${row.where} ${row.text}`.toLowerCase();
  const hits = DEMO_APP_SEARCH_ROWS.filter((row) => toks.every((t) => hay(row).includes(t)));
  if (!hits.length) {
    return `<div class="wise-app-search-empty">No files, reports, or documents match <strong>${esc(String(q).trim())}</strong>.</div>`;
  }
  return ['transcript', 'output', 'report'].map((kind) => {
    const items = hits.filter((row) => row.kind === kind);
    if (!items.length) return '';
    return `<section class="wise-app-search-group">
      <h3 class="wise-app-search-group-title">${esc(DEMO_APP_SEARCH_LABELS[kind])}</h3>
      ${items.map((row) => demoSearchHitHTML(row, toks)).join('')}
    </section>`;
  }).join('');
}
function demoAppSearchHtml(q = DEMO_APP_SEARCH_Q) {
  const has = String(q || '').trim().length > 0;
  const results = demoSearchResultsHTML(q);
  return `
      <div class="wise-app-search mi-search-demo${has ? ' has-q is-open' : ''}" data-app-search-demo>
        <div class="wise-app-search-inner">
          <div class="wise-app-search-field">
            <span class="wise-app-search-ph" aria-hidden="true">
              <span class="material-symbols-outlined">search</span>
              <span class="wise-app-search-ph-label">Search reports, files, and documents</span>
            </span>
            <input type="search" class="wise-app-search-input" value="${esc(q)}"
              placeholder="Search reports, files, and documents"
              autocomplete="off" spellcheck="false"
              aria-label="Search reports, files, and documents" />
            <button type="button" class="wise-app-search-clear" ${has ? '' : 'hidden '}aria-label="Clear search">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
        <div class="wise-app-search-results" role="listbox" aria-label="Search results"${has && results ? '' : ' hidden'}>${results}</div>
      </div>`;
}
function wireAppSearchDemo(root) {
  if (!root || root.dataset.searchDemoBooted === '1') return;
  const input = root.querySelector('.wise-app-search-input');
  const clear = root.querySelector('.wise-app-search-clear');
  const panel = root.querySelector('.wise-app-search-results');
  if (!input || !panel) return;
  root.dataset.searchDemoBooted = '1';
  const render = () => {
    const q = input.value;
    const has = q.trim().length > 0;
    root.classList.toggle('has-q', has);
    if (clear) clear.hidden = !has;
    if (!has) {
      panel.innerHTML = '';
      panel.hidden = true;
      root.classList.remove('is-open');
      return;
    }
    panel.innerHTML = demoSearchResultsHTML(q);
    panel.hidden = false;
    root.classList.add('is-open');
  };
  input.addEventListener('input', render);
  input.addEventListener('focus', () => { if (input.value.trim()) render(); });
  clear?.addEventListener('click', (e) => {
    e.stopPropagation();
    input.value = '';
    render();
    input.focus();
  });
  panel.addEventListener('mousedown', (e) => {
    if (e.target.closest('.wise-app-search-hit')) e.preventDefault();
  });
}

/* Catalog twin of the floating Roll · Crawl · Walk · Run stadium
   (js/cwr-toggle.js). The live widget is a vertical column; this helper
   freezes Run-selected plus hover on every mode, with the include /
   exclude card that the live hover opens. Copy stays in lockstep with META. */
const CWR_DEMO_MODES = [
  {
    id: 'roll', icon: 'cached', label: 'Roll',
    desc: 'SaaS core only — no chat, no extra destinations',
    includes: 'Overview, Product Portfolio, Reports, Profile, Invoices, Marketing Assets, and WISEcode Admin (Organizations, User Management, Audit Queue, Quick Invite, Admin Utils). Remaining modules fill the row.',
    excludes: 'Chat, the composer, History (the History module, the History icon, History in the nav, and the new-chat circle), WISEcodeAI (Chat, Library, Ingredient Browser), Comparison, NON-UPF Dashboard, AI Dashboard, Reformulation, and the Studio & AI upgrade card.',
  },
  {
    id: 'crawl', icon: 'child_care', label: 'Crawl',
    desc: 'Full SaaS nav — still no chat',
    includes: 'Every primary-nav destination (the full SaaS set). Remaining modules fill the row.',
    excludes: 'Chat surfaces, the composer, and History (the History module, the History icon, History in the nav, and the new-chat circle).',
  },
  {
    id: 'walk', icon: 'directions_walk', label: 'Walk',
    desc: 'Chat on — chips and widths, no typing',
    includes: 'Chat, intent chips, four-tier widths (single, double, fill, custom), and the full primary nav including History.',
    excludes: 'The composer — the typing rail is hidden, so you cannot type or send.',
  },
  {
    id: 'run', icon: 'directions_run', label: 'Run',
    desc: 'Full experience — unlocked composer',
    includes: 'Everything in Walk, plus an unlocked composer docked at the bottom of the chat. You can type and send.',
    excludes: 'Nothing — this is the full experience.',
  },
];

function demoCwrPill(hoverId, selectedId = 'run') {
  return `<div class="mi-cwr" role="radiogroup" aria-label="Rollout mode">` +
    CWR_DEMO_MODES.map((m) => {
      const checked = m.id === selectedId;
      const hover = m.id === hoverId;
      return `<button type="button" class="cwr-btn${hover ? ' is-hover' : ''}" role="radio" aria-checked="${checked ? 'true' : 'false'}" tabindex="-1">` +
        `<span class="material-symbols-outlined" aria-hidden="true">${m.icon}</span>` +
        `<span class="cwr-btn-label">${esc(m.label)}</span>` +
        `</button>`;
    }).join('') +
    `</div>`;
}

function demoCwrTip(mode) {
  return `<div class="mi-cwr-tip" role="tooltip">` +
    `<div class="mi-cwr-tip-title">${esc(mode.label)}</div>` +
    `<p class="mi-cwr-tip-desc">${esc(mode.desc)}</p>` +
    `<div class="mi-cwr-tip-block"><div class="mi-cwr-tip-k">Includes</div><p>${esc(mode.includes)}</p></div>` +
    `<div class="mi-cwr-tip-block"><div class="mi-cwr-tip-k">Excludes</div><p>${esc(mode.excludes)}</p></div>` +
    `</div>`;
}

function demoCwrCatalog() {
  const rest = `<div class="dsc-state-col">
          <div class="dsc-sub-label">Run selected</div>
          ${demoCwrPill(null)}
        </div>`;
  const hovers = CWR_DEMO_MODES.map((m) => `<div class="dsc-state-col mi-cwr-hover-col">
          <div class="dsc-sub-label">Hover on ${esc(m.label)}</div>
          <div class="mi-cwr-hover-pair">
            ${demoCwrPill(m.id)}
            ${demoCwrTip(m)}
          </div>
        </div>`).join('');
  return `<div class="dsc-states dsc-states--cwr">${rest}${hovers}</div>`;
}

function demoReportMiniBars(heights) {
  return `<span class="dsc-rpt-mini-bars" aria-hidden="true">${heights.map((h) => `<i style="height:${h}%"></i>`).join('')}</span>`;
}

function demoReportBuilderHTML() {
  const plus = (on) =>
    `<button type="button" class="wa-titledrop-plus${on ? ' is-on' : ''}" aria-pressed="${on ? 'true' : 'false'}" aria-label="${on ? 'Remove from report' : 'Add to report'}" tabindex="-1">` +
      `<span class="material-symbols-outlined">${on ? 'check' : 'add'}</span>` +
    `</button>`;
  const row = ({ n, label, ver, on, active, bars }) =>
    `<div class="wa-titledrop-item${active ? ' is-active' : ''}" role="option" aria-selected="${active ? 'true' : 'false'}">` +
      `<span class="wa-titledrop-num">${n}</span>` +
      `<span class="wa-merge-chip-thumb">${demoReportMiniBars(bars)}</span>` +
      `<span class="wa-titledrop-text">` +
        `<span class="wa-titledrop-label">${esc(label)}</span>` +
        (ver ? `<span class="wa-titledrop-ver">${esc(ver)}</span>` : '') +
      `</span>` +
      plus(on) +
    `</div>`;
  const item = ({ title, bars, note }) =>
    `<article class="wa-rpt-item">` +
      `<header class="wa-rpt-item-head">` +
        `<h3 class="wa-rpt-item-title">${esc(title)}</h3>` +
        `<div class="panel-more-wrap wa-rpt-more">` +
          `<button type="button" class="panel-more-btn" aria-haspopup="menu" aria-expanded="false" aria-label="Chart options" tabindex="-1">` +
            `<span class="material-symbols-outlined">more_vert</span>` +
          `</button>` +
        `</div>` +
      `</header>` +
      `<div class="wa-rpt-item-body"><div class="dsc-rpt-chart">${demoReportMiniBars(bars)}</div></div>` +
      `<div class="wa-rpt-note"><input type="text" class="adm-input wa-rpt-note-input" placeholder="Add an annotation…" aria-label="Annotation" value="${esc(note || '')}" tabindex="-1"></div>` +
    `</article>`;
  return `
      <div class="dsc-states" style="width:100%">
        <div class="dsc-state-col" style="flex:1 1 100%">
          <div class="dsc-rpt-flow">
            <div>
              <div class="dsc-sub-label">Output titledrop \u00b7 plus to pick</div>
              <div class="wa-titledrop-pop dsc-rpt-titledrop" role="listbox" aria-label="Choose outputs for a report">
                <div class="wa-titledrop-list">
                  ${row({ n: 1, label: 'Kraft UPF breakdown by category', ver: 'v1', on: true, active: true, bars: [38, 64, 88, 52, 70] })}
                  ${row({ n: 2, label: 'Kraft vs Kraft Heinz', ver: 'v2', on: true, active: false, bars: [70, 44, 58, 32, 80] })}
                  ${row({ n: 3, label: 'Top Kraft categories', on: false, active: false, bars: [22, 48, 36, 74, 41] })}
                </div>
                <div class="wa-titledrop-foot">
                  <button type="button" class="adm-btn adm-btn--primary wa-titledrop-gen" tabindex="-1">Generate Report (2)</button>
                </div>
              </div>
            </div>
            <div>
              <div class="dsc-sub-label">Report drawer \u00b7 nested off Output</div>
              <section class="dsc-rpt-pane" aria-label="Report">
                <header class="dsc-rpt-pane-top">
                  <div class="dsc-rpt-pane-mast">
                    <p class="dash-eyebrow">Report</p>
                    <h2 class="dsc-rpt-pane-title">Two Outputs</h2>
                  </div>
                  <div class="dsc-rpt-pane-ctrls">
                    <button type="button" class="panel-more-btn" aria-haspopup="menu" aria-expanded="false" aria-label="More options" tabindex="-1"><span class="material-symbols-outlined">more_vert</span></button>
                    <button type="button" class="panel-width-toggle-btn" aria-pressed="false" aria-label="Report pane width" tabindex="-1"><span class="material-symbols-outlined">width_normal</span></button>
                  </div>
                </header>
                <div class="dsc-rpt-pane-body">
                  ${item({ title: 'Kraft UPF breakdown by category', bars: [38, 64, 88, 52, 70], note: 'Category share is the headline.' })}
                  ${item({ title: 'Kraft vs Kraft Heinz', bars: [70, 44, 58, 32, 80], note: '' })}
                </div>
                <div class="wa-rpt-foot">
                  <button type="button" class="adm-btn adm-btn--primary" tabindex="-1">Save or Share Report</button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>`;
}

const COMPONENTS = [
  /* `ai: false` — chrome / chrome-adjacent cards. They keep WIP Ready but
     have no Not for AI / AI Ready switch and do not count toward the
     Component Library AI k/n. */
  {
    name: 'Buttons',
    ai: false,
    wide: true,
    cls: '.dash-btn --primary / --ghost · .dash-text-link · .pf-head-btn --ghost · .pf-brand-chip · .lir-btn',
    used: 'Non-UPF Dashboard · Reports · Verification CTAs · Reformulation · Product Portfolio · Marketing Assets · Invoices · Comparison',
    note: 'Every interactive control in this library shows its states side by side. Default is rest; Hover is forced with <code>.is-hover</code> so it stays visible; Disabled uses the native attribute. Text links are the tertiary action — not a button. The <strong>header trail</strong> is the compact 28px pair that sits left of the module ⋯: Marketing Assets (ghost pill) and the brand chip. <strong>Icon-only</strong> is the same state set for a glyph with no label \u2014 Appearance on the portfolio rail, and dock toggles. One icon, four states. The hover card that names the glyph is <em>Tooltip</em>; alerts live on the avatar, and ⋯ is <em>Module \u22ef menu</em>.',
    noteIcon: 'smart_button',
    demo: `
      <div class="dsc-states" style="width:100%">
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Default</div>
          <div class="dash-btn-row">
            <button type="button" class="dash-btn dash-btn--primary"><span class="material-symbols-outlined">rocket_launch</span>Primary action</button>
            <button type="button" class="dash-btn dash-btn--ghost">Ghost action</button>
            <button type="button" class="dash-text-link">View full report<span class="material-symbols-outlined">north_east</span></button>
          </div>
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Hover</div>
          <div class="dash-btn-row">
            <button type="button" class="dash-btn dash-btn--primary is-hover"><span class="material-symbols-outlined">rocket_launch</span>Primary action</button>
            <button type="button" class="dash-btn dash-btn--ghost is-hover">Ghost action</button>
            <button type="button" class="dash-text-link is-hover">View full report<span class="material-symbols-outlined">north_east</span></button>
          </div>
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Disabled</div>
          <div class="dash-btn-row">
            <button type="button" class="dash-btn dash-btn--primary" disabled><span class="material-symbols-outlined">rocket_launch</span>Primary action</button>
            <button type="button" class="dash-btn dash-btn--ghost" disabled>Ghost action</button>
            <button type="button" class="dash-text-link" disabled>View full report<span class="material-symbols-outlined">north_east</span></button>
          </div>
        </div>
      </div>
      <div class="dsc-sub" style="width:100%;margin-top:8px">
        <div class="dsc-sub-label">Header trail · 28px, left of ⋯</div>
        <div class="dsc-states" style="width:100%">
          <div class="dsc-state-col">
            <div class="dsc-sub-label">Default</div>
            ${demoHeadTrail()}
          </div>
          <div class="dsc-state-col">
            <div class="dsc-sub-label">Hover</div>
            ${demoHeadTrail({ hover: true })}
          </div>
          <div class="dsc-state-col">
            <div class="dsc-sub-label">Open</div>
            ${demoHeadTrail({ open: true })}
          </div>
          <div class="dsc-state-col">
            <div class="dsc-sub-label">Disabled</div>
            ${demoHeadTrail({ disabled: true })}
          </div>
        </div>
      </div>
      <div class="dsc-sub" style="width:100%;margin-top:8px">
        <div class="dsc-sub-label">Icon-only · Appearance</div>
        <div class="dsc-states" style="width:100%">
          <div class="dsc-state-col">
            <div class="dsc-sub-label">Default</div>
            ${demoLirBtn()}
          </div>
          <div class="dsc-state-col">
            <div class="dsc-sub-label">Hover</div>
            ${demoLirBtn({ hover: true })}
          </div>
          <div class="dsc-state-col">
            <div class="dsc-sub-label">Open</div>
            ${demoLirBtn({ open: true })}
          </div>
          <div class="dsc-state-col">
            <div class="dsc-sub-label">Disabled</div>
            ${demoLirBtn({ disabled: true })}
          </div>
        </div>
      </div>`,
  },
  {
    name: 'Intent chips',
    wide: true,
    cls: '.chip · .ws-intent-chip · .sc-reply-chips .chip (+ .chip-primary, .chip-dive, .chip--match, .ms-chip.is-selected)',
    used: 'WISEcodeAI dock & Studio welcome, module shortcuts, Auth signup, Comparison, in-conversation reply chips',
    note: 'The compact 28px chip. Welcome shortcuts, module intents, and reply chips all share <code>.chip</code> at <code>height: 28px</code> with <code>--fs-label</code> type. States: Default, Hover, Open/selected (<code>.is-selected</code> / match). <strong>Primary rule:</strong> a solid blue <code>.chip-primary</code> always uses a <strong>filled</strong> icon (<code>FILL 1</code>), never outlined — ghost / tinted / welcome chips stay outlined. Not the same as <em>Output chips</em> — those are the in-transcript previews that open the sticky Output module. Its large-format sibling — <em>Large intent cards</em> — sits beside it.',
    noteIcon: 'straighten',
    demo: `
      <div class="dsc-states" style="width:100%">
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Default</div>
          <div class="sc-reply-chips" style="margin:0">
            <button type="button" class="chip"><span class="material-symbols-outlined">auto_awesome</span>Suggest a reformulation</button>
            <button type="button" class="chip ws-intent-chip"><span class="material-symbols-outlined">inventory_2</span>Open portfolio</button>
            <button type="button" class="chip chip-dive"><span class="material-symbols-outlined">arrow_forward</span>Dive in</button>
          </div>
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Hover</div>
          <div class="sc-reply-chips" style="margin:0">
            <button type="button" class="chip is-hover"><span class="material-symbols-outlined">auto_awesome</span>Suggest a reformulation</button>
            <button type="button" class="chip ws-intent-chip is-hover"><span class="material-symbols-outlined">inventory_2</span>Open portfolio</button>
            <button type="button" class="chip chip-dive is-hover"><span class="material-symbols-outlined">arrow_forward</span>Dive in</button>
          </div>
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Open / selected</div>
          <div class="sc-reply-chips" style="margin:0">
            <button type="button" class="chip chip--match"><span class="material-symbols-outlined">check_circle</span>Best match</button>
            <button type="button" class="chip ms-chip is-selected">High sugar</button>
            <button type="button" class="chip chip-primary"><span class="material-symbols-outlined">check</span>Confirm</button>
          </div>
        </div>
      </div>`,
  },
  {
    name: 'Output chips',
    wide: true,
    cls: '.sc-surface-card · .sc-surface-stack · .sc-surface-vtag · .wa-merge-chip',
    used: 'WISEcodeAI Studio Chat · WISEcodeAI dock · sticky Output rail',
    note: 'When a turn opens Results or Visuals, a chip lands in the transcript: a <strong>52px</strong> preview on the left, the output name on the right, gold stroke. Every chip is versioned — a compact <code>vN</code> badge rides the thumb, even on the first pass. Redo the same output and the chip stacks every version at that same 52px (oldest first, newest raised). <strong>Hover fans the stack</strong> (tight −28px overlap → −4px peek); the gold stroke brightens. The version currently open on the right wears a stronger ring. Tapping a thumb opens <em>that</em> version in the sticky Output module — and the rail on the right shows <strong>one chip per version</strong>, same size, same badge, so the stack and the pane never disagree. Live fan + Replay live in <em>Motion &amp; Resize → Output chip fan</em>.',
    noteIcon: 'layers',
    demo: `
      <div class="dsc-states" style="width:100%">
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Single · v1</div>
          ${outputChipHTML({ title: OUTPUT_CHIP_TITLE, versions: [OUTPUT_CHIP_VERS[0]] })}
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Single · hover</div>
          ${outputChipHTML({ title: OUTPUT_CHIP_TITLE, versions: [OUTPUT_CHIP_VERS[0]], hover: true })}
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Stack of 3 · default</div>
          ${outputChipHTML({ title: OUTPUT_CHIP_TITLE, versions: OUTPUT_CHIP_VERS })}
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Stack of 3 · hover (fan)</div>
          ${outputChipHTML({ title: OUTPUT_CHIP_TITLE, versions: OUTPUT_CHIP_VERS, hover: true })}
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Stack · v2 open in Output</div>
          ${outputChipHTML({ title: OUTPUT_CHIP_TITLE, versions: OUTPUT_CHIP_VERS, activeVer: 2 })}
        </div>
      </div>
      <div class="dsc-states" style="width:100%;margin-top:18px">
        <div class="dsc-state-col" style="flex:1 1 100%">
          <div class="dsc-sub-label">Sticky Output rail — every version is its own chip</div>
          <div class="wa-merge-chips mi-out-rail">
            ${outputRailChipHTML({ title: OUTPUT_CHIP_TITLE, inner: OUTPUT_CHIP_VERS[0].inner, ver: 1 })}
            ${outputRailChipHTML({ title: OUTPUT_CHIP_TITLE, inner: OUTPUT_CHIP_VERS[1].inner, ver: 2, active: true })}
            ${outputRailChipHTML({ title: OUTPUT_CHIP_TITLE, inner: OUTPUT_CHIP_VERS[2].inner, ver: 3 })}
          </div>
        </div>
      </div>`,
  },
  {
    name: 'Large intent cards',
    cat: 'Chips & badges',
    wide: true,
    cls: '.ws-scorecard · .ws-sc-action (+ --intro, --wiseai, locked)',
    used: 'WISEcodeAI welcome rail · Product Portfolio · Comparison — the large-format sibling of the 28px intent chips',
    note: 'The large-format intent chip, not a scorecard: the whole card is one tap and the footer (<code>.ws-sc-action</code>) is the visible affordance. Same family as the 28px <code>.chip</code> above — one carries an eyebrow/metric and a CTA, the other is the in-conversation pill. Click-to-filter <em>Filter tiles</em>, dashboard <em>KPI</em> / <em>Claim</em> / <em>Action</em> cards, and <em>Compact metrics</em> are each their own component.',
    noteIcon: 'bolt',
    demo: `
      <div class="ws-scorecards" style="overflow:visible;padding:0;width:100%">
        <button type="button" class="ws-scorecard" role="listitem">
          <div class="ws-sc-top">
            <span class="ws-sc-icon ws-sc-icon--brand"><span class="material-symbols-outlined">fact_check</span></span>
            <span class="ws-sc-pill ws-sc-pill--up"><span class="material-symbols-outlined">priority_high</span>Do next</span>
          </div>
          <div class="ws-sc-metric">10<span class="ws-sc-metric-unit"> claimed</span></div>
          <div class="ws-sc-title">Verify ingredients</div>
          <div class="ws-sc-desc">All 10 claimed products still need ingredients verified before their reports unlock.</div>
          <div class="ws-sc-action">Verify ingredients<span class="material-symbols-outlined">arrow_outward</span></div>
        </button>
        <button type="button" class="ws-scorecard ws-scorecard--intro ws-scorecard--wiseai" role="listitem">
          <div class="ws-sc-top">
            <span class="ws-sc-icon ws-sc-icon--wiseai"><span class="material-symbols-outlined">smart_toy</span></span>
            <span class="ws-sc-pill ws-sc-pill--wiseai"><span class="material-symbols-outlined">bolt</span>WISEcodeAI</span>
          </div>
          <div class="ws-sc-intro-title">Let WISEcodeAI do the heavy lifting</div>
          <div class="ws-sc-desc">Claim, verify, or complete products — WISEcodeAI tees it up, you decide.</div>
          <div class="ws-sc-action">Ask WISEcodeAI anything<span class="material-symbols-outlined">arrow_outward</span></div>
        </button>
        <button type="button" class="ws-scorecard ws-scorecard--locked" role="listitem" aria-disabled="true" data-locked="1">
          <div class="ws-sc-top">
            <span class="ws-sc-icon ws-sc-icon--intro"><span class="material-symbols-outlined">explore</span></span>
            <span class="ws-sc-lock material-symbols-outlined" title="Coming soon" aria-hidden="true">lock</span>
          </div>
          <div class="ws-sc-intro-title">Take a tour</div>
          <div class="ws-sc-desc">A quick guided walkthrough of WISEcodeAI — the panes, prompts and reports.</div>
          <div class="ws-sc-action ws-sc-action--locked">Coming soon</div>
        </button>
      </div>`,
  },
  {
    name: 'Chat composer',
    wide: true,
    cls: '.fl-input-wrap--stacked · .fl-more-btn · .fl-db-trigger · .fl-input · .sc-send · .fl-attachments',
    used: 'WISEcodeAI dock (every page) · Studio Chat · Reformulation / Add Product / Studio&AI panes',
    note: 'The stacked composer from the chat module — same markup <code>mountWISEcodeAIChat</code> builds. Text sits on its own full-width row at every module width; <code>+</code> / database / send hold the bottom line. <strong>Default</strong> is empty; <strong>Lots of text</strong> soft-wraps and grows the pill upward; <strong>Images attached</strong> opens a chip row between the text and the controls. The living brand sheen on the pill edge lives in <em>Motion &amp; Resize \u2192 Chat composer sheen</em>. The full database picker is <em>Database roster</em>; chip anatomy alone is <em>Attachments</em>.',
    noteIcon: 'chat',
    demo: `
      <div class="dsc-states dsc-states--composer" style="width:100%">
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Default</div>
          ${demoComposerHtml()}
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Lots of text</div>
          ${demoComposerHtml({ value: DEMO_COMPOSER_LONG })}
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Images attached</div>
          ${demoComposerHtml({
            value: 'Check these three label photos for the muffin reformulation.',
            attachments: DEMO_COMPOSER_ATTS,
          })}
        </div>
      </div>`,
  },
  {
    name: 'Transcript lines',
    wide: true,
    cat: 'Chat & drawers',
    cls: '.sc-line · .sc-line-you / .sc-line-wiseai / .sc-line-event · .sc-avatar · .sc-line-time',
    used: 'WISEcodeAI dock (every page) · Studio Chat — every turn in the thread',
    note: 'Three line types, never a speech bubble. <strong>You</strong> uses the member avatar (initials or photo). <strong>WISEcodeAI</strong> uses the owl on a black chip (white chip in dark). <strong>Event</strong> is a mid-thread action the member took — a database switch or a data source — stamped <code>data-activity</code> so the activity strip can tick it. The timestamp toggles clock \u2194 relative on click. Forked threads open with a lineage banner.',
    noteIcon: 'forum',
    demo: `
      <div class="dsc-states" style="width:100%">
        <div class="dsc-state-col" style="flex:1 1 280px">
          <div class="dsc-sub-label">You</div>
          <div class="sc-line sc-line-you">${demoYouAvatar()}<div class="sc-line-body">Compare oat milk vs almond milk on processing.<div class="sc-line-meta"><span class="sc-line-time" role="button" tabindex="0">5 min ago</span></div></div></div>
        </div>
        <div class="dsc-state-col" style="flex:1 1 280px">
          <div class="dsc-sub-label">WISEcodeAI</div>
          <div class="sc-line sc-line-wiseai">${demoWiseAvatar()}<div class="sc-line-body"><span class="sc-para">Oat milk scores higher on processing; almond milk wins on additives. Both sit in the same WISEscore band.</span><div class="sc-line-meta"><span class="sc-line-time" role="button" tabindex="0">4 min ago</span></div></div></div>
        </div>
        <div class="dsc-state-col" style="flex:1 1 280px">
          <div class="dsc-sub-label">Event · database switched</div>
          <div class="sc-line sc-line-you sc-line-event" data-activity="database" role="note">${demoYouAvatar()}<div class="sc-line-body"><span class="sc-event-label">Switched database from</span> <strong>Postgres (DEV)</strong> to <strong>Postgres (UAT)</strong><div class="sc-line-meta"><span class="sc-line-time" role="button" tabindex="0">3 min ago</span><span class="sc-fb-id" data-tip="Turn ID" tabindex="0">#6d7a</span></div></div></div>
        </div>
        <div class="dsc-state-col" style="flex:1 1 280px">
          <div class="dsc-sub-label">Forked-from banner</div>
          <div class="sc-fork-banner"><span class="material-symbols-outlined sc-fork-banner-ic">alt_route</span><span class="sc-fork-banner-txt">Forked from <strong>Compare oat milk vs almond milk</strong> at turn #6d7a</span></div>
        </div>
      </div>`,
  },
  {
    name: 'Transcript actions',
    wide: true,
    cat: 'Chat & drawers',
    cls: '.sc-fb · .sc-fb-btn · .sc-fb-reasons · .sc-fb-menu · .sc-fb-menu-tokens · .sc-tip · .sc-fb-id',
    used: 'Every WISEcodeAI answer — the row under the last paragraph, before intent chips',
    note: 'The quick trio: <strong>Copy</strong> (flashes Copied), <strong>Accurate</strong> and <strong>Not accurate</strong> (each opens a reason popover with chips + optional note; submitting posts a follow-up turn). The <strong>\u22ef</strong> spills Re-run in new chat, Edit in new chat, Fork a turn, File to folder, and the turn ID, then a divider and the token read-out for that answer (see <em>Token readout</em>). The timestamp (clock \u2194 relative) sits immediately right of that three-dot. Hover/focus uses the shared theme-aware tip card — never a native title bubble and never a second always-dark card. Icons are outlined at rest and fill when on.',
    noteIcon: 'thumbs_up_down',
    demo: `
      <div class="dsc-states" style="width:100%">
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Default</div>
          ${demoFbRow()}
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Copy \u00b7 confirmation</div>
          ${demoFbRow({ hoverCopy: true })}
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Accurate \u00b7 reasons open</div>
          ${demoFbRow({ upOn: true, upOpen: true })}
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Not accurate \u00b7 reasons open</div>
          ${demoFbRow({ downOn: true, downOpen: true })}
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">More \u00b7 actions + this-message tokens</div>
          ${demoFbRow({ moreOpen: true })}
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Hover tip</div>
          <span style="position:relative;display:inline-flex;flex-direction:column;align-items:center;gap:10px">
            ${demoFbBtn({ fb: 'copy', tip: 'Copy answer', icon: 'content_copy' })}
            <span class="dsc-tip is-vis" style="position:static;transform:none;opacity:1">Copy answer</span>
          </span>
        </div>
      </div>`,
  },
  {
    name: 'Activity strip',
    wide: true,
    cat: 'Chat & drawers',
    cls: '.wa-activity-strip · .wa-activity-rail · .wa-activity-tick (--output / --source / --database) · .wa-activity-tick-stack',
    used: 'Every chat module — pinned to the transcript edge, toggled from the chat \u22ef menu and Appearance',
    note: 'A 3px landmark rail on the chat\u2019s <strong>left</strong> edge by default (right is opt-in). Ticks sit at each event as a fraction of the transcript: gold <strong>output</strong>, green <strong>source</strong>, amber <strong>database</strong>. Multi-version outputs draw a stacked pair \u2014 two tabs mean \u201cmore than one\u201d, never a count. Click a tick to scroll that landmark into view and flash it. Hover widens the tab and shows the turn ID. Not the token readout under the composer or in the transcript \u22ef \u2014 that is <em>Token readout</em>.',
    noteIcon: 'timeline',
    demo: `
      <div class="dsc-states" style="width:100%">
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Left edge \u00b7 default ticks</div>
          <div class="mi-actstrip" data-side="left">
            <div class="wa-activity-rail"></div>
            ${demoActTick('output', { id: '3a1c' })}
            ${demoActTick('output', { stacked: true, id: '6d7a' })}
            ${demoActTick('source', { id: 'b12e' })}
            ${demoActTick('database', { id: '9f04' })}
            <div class="mi-actstrip-ghost">
              <span>Output created</span>
              <span>Output \u00b7 2 versions</span>
              <span>Data source added</span>
              <span>Database switched</span>
            </div>
          </div>
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Hover \u00b7 tab widens, ID shows</div>
          <div class="mi-actstrip" data-side="left">
            <div class="wa-activity-rail"></div>
            ${demoActTick('output', { hover: true, id: '3a1c' })}
            ${demoActTick('output', { stacked: true, hover: true, id: '6d7a' })}
            ${demoActTick('source', { id: 'b12e' })}
            ${demoActTick('database', { id: '9f04' })}
            <div class="mi-actstrip-ghost">
              <span>Output created</span>
              <span>Output \u00b7 2 versions</span>
              <span>Data source added</span>
              <span>Database switched</span>
            </div>
          </div>
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Right edge</div>
          <div class="mi-actstrip mi-actstrip--right" data-side="right" data-ticks="3">
            <div class="wa-activity-rail"></div>
            ${demoActTick('output', { id: '3a1c' })}
            ${demoActTick('source', { id: 'b12e' })}
            ${demoActTick('database', { id: '9f04' })}
            <div class="mi-actstrip-ghost">
              <span>Output created</span>
              <span>Data source added</span>
              <span>Database switched</span>
            </div>
          </div>
        </div>
      </div>`,
  },
  {
    name: 'Token readout',
    wide: true,
    cat: 'Chat & drawers',
    cls: '.sc-activity · .sc-activity-dots · .sc-activity-pop · .sc-fb-more · .sc-fb-menu-tokens',
    used: 'Under the composer on every chat when activity: true \u00b7 inside the transcript \u22ef on every WISEcodeAI answer',
    note: 'Two homes. Under the input, three quiet dots idle and pulse brand-blue while thinking \u2014 hover opens this-turn and conversation tokens, cache share, and a demo cost. Inside the transcript, the <strong>\u22ef</strong> on every WISEcodeAI answer opens the same this-message numbers (plus duration, ops, and tools) under the action icons. Not the edge landmark rail \u2014 that is <em>Activity strip</em>.',
    noteIcon: 'more_horiz',
    demo: `
      <div class="dsc-sub" style="width:100%">
        <div class="dsc-sub-label">Under the composer</div>
        <div class="dsc-states dsc-states--token">
          <div class="dsc-state-col">
            <div class="dsc-sub-label">Idle</div>
            <div class="sc-activity">
              <div class="sc-activity-wrap">
                <div class="sc-activity-dots" tabindex="0" role="button" aria-label="WISEcodeAI activity"><span></span><span></span><span></span></div>
              </div>
            </div>
          </div>
          <div class="dsc-state-col">
            <div class="dsc-sub-label">Thinking</div>
            <div class="sc-activity is-thinking">
              <div class="sc-activity-wrap">
                <div class="sc-activity-dots" tabindex="0" role="button" aria-label="WISEcodeAI activity"><span></span><span></span><span></span></div>
              </div>
            </div>
          </div>
          <div class="dsc-state-col dsc-state-col--token-open">
            <div class="dsc-sub-label">Hover \u00b7 read-out open</div>
            <div class="sc-activity is-open">
              <div class="sc-activity-wrap">
                <div class="sc-activity-dots" tabindex="0" role="button" aria-label="WISEcodeAI activity"><span></span><span></span><span></span></div>
                <div class="sc-activity-pop" role="tooltip">
                  <div class="sc-activity-row"><span class="sc-activity-key">This turn</span><span class="sc-activity-val">1.3k in / 412 out \u00b7 <em>1.0k cached (78%)</em> \u00b7 <b>$0.0030</b></span></div>
                  <div class="sc-activity-row"><span class="sc-activity-key">Conversation</span><span class="sc-activity-val">8.1k in / 2.4k out \u00b7 <em>6.4k cached (79%)</em> \u00b7 <b>$0.04</b> \u00b7 3 turns</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="dsc-sub" style="width:100%;margin-top:8px">
        <div class="dsc-sub-label">In the transcript \u22ef</div>
        <div class="dsc-states dsc-states--token-transcript">
          <div class="dsc-state-col">
            <div class="dsc-sub-label">Closed</div>
            ${demoFbBtn({ more: true, tip: 'More actions', icon: 'more_horiz' })}
          </div>
          <div class="dsc-state-col dsc-token-transcript-open">
            <div class="dsc-sub-label">Hover \u00b7 this-message tokens</div>
            ${demoTranscriptTokenMore({ open: true })}
          </div>
        </div>
      </div>`,
  },
  {
    name: 'Chat \u22ef menu',
    wide: true,
    cat: 'Chat & drawers',
    cls: '.panel-more-btn \u00b7 .topbar-popover.sc-menu-grouped \u00b7 .sc-menu-group \u00b7 .sc-mcp-item \u00b7 .sc-switch \u00b7 .sc-menu-admin-btn',
    used: 'The three-dot on every chat module \u2014 Conversation, streaming, Close. Admin-badged rows stay off this specimen',
    note: 'Same <code>.topbar-popover</code> shell, grouped the way the live chat does \u2014 one column hung from the kebab. This card is the <strong>member-facing</strong> menu: History, new, Export, Share, File to Library, Response streaming, and Close. Admin-badged rows (Turns, Hide outputs, Connect a data source, Overview cards, Intent chips, Compact spacing, Brand AI text, Input glow, Animation, Activity strip) are not part of this menu. They appear on the live chat when <em>Internal admins</em> is on in Appearance, or from the kebab in the menu\u2019s top-right, and Helix then sits in a second column beside the stack.',
    noteIcon: 'more_vert',
    demo: `
      <div class="dsc-states" style="width:100%">
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Closed</div>
          <button type="button" class="panel-more-btn" aria-label="More options" aria-expanded="false"><span class="material-symbols-outlined">more_vert</span></button>
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Hover</div>
          <button type="button" class="panel-more-btn is-hover" aria-label="More options"><span class="material-symbols-outlined">more_vert</span></button>
        </div>
        <div class="dsc-state-col" style="flex:1 1 100%">
          <div class="dsc-sub-label">Open \u00b7 everyone</div>
          <div class="panel-more-wrap dsc-chat-menu-demo" style="position:relative">
            <button type="button" class="panel-more-btn is-open" aria-label="More options" aria-expanded="true"><span class="material-symbols-outlined">more_vert</span></button>
            ${demoChatMenuPop()}
          </div>
        </div>
      </div>`,
  },
  {
    name: 'Module \u22ef menu',
    ai: false,
    cat: 'Overlays',
    cls: '.panel-more-wrap \u00b7 [data-sticky-act] \u00b7 .topbar-menu-item--danger',
    used: 'Every module to the right of the chat \u2014 Share, Copy link, Export; progress panes also get Remove panel',
    note: 'Injected when a right-of-chat module has no menu of its own. Chat, Turns, and What can I ask? keep their native menus. Progress trackers add a danger <strong>Remove panel</strong> row that leaves a restore tab on the row\u2019s right edge.',
    noteIcon: 'more_vert',
    demo: `
      <div class="dsc-states" style="width:100%">
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Default module</div>
          <div class="topbar-popover" data-popover-static style="position:static;max-width:240px">
            <button type="button" class="topbar-menu-item"><span class="material-symbols-outlined topbar-menu-icon">share</span><span>Share</span></button>
            <button type="button" class="topbar-menu-item"><span class="material-symbols-outlined topbar-menu-icon">link</span><span>Copy link</span></button>
            <div class="topbar-menu-divider"></div>
            <button type="button" class="topbar-menu-item"><span class="material-symbols-outlined topbar-menu-icon">download</span><span>Export</span></button>
          </div>
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Progress \u00b7 Remove panel</div>
          <div class="topbar-popover" data-popover-static style="position:static;max-width:240px">
            <button type="button" class="topbar-menu-item"><span class="material-symbols-outlined topbar-menu-icon">share</span><span>Share</span></button>
            <button type="button" class="topbar-menu-item"><span class="material-symbols-outlined topbar-menu-icon">link</span><span>Copy link</span></button>
            <div class="topbar-menu-divider"></div>
            <button type="button" class="topbar-menu-item"><span class="material-symbols-outlined topbar-menu-icon">download</span><span>Export</span></button>
            <div class="topbar-menu-divider"></div>
            <button type="button" class="topbar-menu-item topbar-menu-item--danger"><span class="material-symbols-outlined topbar-menu-icon">visibility_off</span><span>Remove panel</span></button>
          </div>
        </div>
      </div>`,
  },
  {
    name: 'Sticky modules',
    wide: true,
    cat: 'Chat & drawers',
    cls: '.sticky-chat \u00b7 .sticky-mod.is-sticky \u00b7 #modules-row (z-index 3 / 2 / 1 / 0)',
    used: 'Every #modules-row page with a chat \u2014 History left, Output / NFP / Turns right, progress and Report nested one layer deeper',
    note: 'Sticky is the only drawer mode \u2014 no on/off switch. Think of it as a <strong>WISE utility belt</strong>: the chat is the buckle (z-index 3). Output sits at z-index 2, under the chat and over peer drawers. Drawers to its right tuck behind it, shorter and centred, with the chat-facing corners squared so they read as emerging from the card, not floating beside it. History tucks left. Next-level drawers (progress tracker, Help contact, generated Report) sit one layer under their parent (z-index 0, ~30px shorter still). Opening a module \u22ef never lifts a drawer over the chat.',
    noteIcon: 'layers',
    demo: `
      <div class="dsc-states" style="width:100%">
        <div class="dsc-state-col" style="flex:1 1 100%">
          <div class="dsc-sub-label">Utility belt \u00b7 chat on top, drawers nested underneath</div>
          <div class="mi-belt" aria-label="Sticky module stack">
            <aside class="mi-belt-mod mi-belt-hist"><span class="mi-belt-name">History</span><span class="mi-belt-z">left of chat</span></aside>
            <section class="mi-belt-chat"><span class="mi-belt-name">Chat</span><span class="mi-belt-z">z 3 \u00b7 buckle</span></section>
            <aside class="mi-belt-mod mi-belt-out"><span class="mi-belt-name">Output</span><span class="mi-belt-z">z 2</span></aside>
            <aside class="mi-belt-mod mi-belt-nfp"><span class="mi-belt-name">Nutrition Facts</span><span class="mi-belt-z">z 1</span></aside>
            <aside class="mi-belt-mod mi-belt-prog"><span class="mi-belt-name">Progress</span><span class="mi-belt-z">z 0 \u00b7 nested</span></aside>
          </div>
        </div>
        <div class="dsc-state-col" style="flex:1 1 100%">
          <div class="dsc-sub-label">Next-level drawer \u00b7 Help with Contact tucked behind it</div>
          <div class="mi-belt mi-belt--nested" aria-label="Nested sticky drawers">
            <section class="mi-belt-chat"><span class="mi-belt-name">Chat</span><span class="mi-belt-z">z 3</span></section>
            <aside class="mi-belt-mod mi-belt-out"><span class="mi-belt-name">Help</span><span class="mi-belt-z">z 1 \u00b7 parent</span></aside>
            <aside class="mi-belt-mod mi-belt-prog"><span class="mi-belt-name">Contact</span><span class="mi-belt-z">z 0 \u00b7 shorter</span></aside>
          </div>
        </div>
        <div class="dsc-state-col" style="flex:1 1 100%">
          <div class="dsc-sub-label">Report builder \u00b7 nested off Output</div>
          <div class="mi-belt" aria-label="Report builder nested off Output">
            <section class="mi-belt-chat"><span class="mi-belt-name">Chat</span><span class="mi-belt-z">z 3</span></section>
            <aside class="mi-belt-mod mi-belt-out"><span class="mi-belt-name">Output</span><span class="mi-belt-z">z 2 \u00b7 parent</span></aside>
            <aside class="mi-belt-mod mi-belt-prog"><span class="mi-belt-name">Report</span><span class="mi-belt-z">z 0 \u00b7 nested</span></aside>
          </div>
        </div>
      </div>`,
  },
  {
    name: 'What can I ask?',
    cat: 'Chat & drawers',
    cls: '.wch-ask-panel \u00b7 .wch-ask-cap \u00b7 .wch-ask-prompt \u00b7 .wch-ask-insert \u00b7 .sc-ask-help',
    used: 'Every chat \u2014 gold link under the composer and matching intent chip open this overlay inside the chat',
    note: 'The overlay that opens inside the chat \u2014 same panel as WISEcodeAI. Headline is serif. Search, topic filters, and Catalog / A\u2013Z are live. Tap a prompt or use the insert icon; the gold shimmer lives in Motion &amp; Resize.',
    noteIcon: 'help',
    demoCustom() {
      return `
        <div class="dsc-ask-catalog">
          <div class="dsc-sub-label">Triggers \u2014 gold link and matching intent chip</div>
          <div class="dsc-ask-triggers">
            <button type="button" class="sc-ask-help" data-ask-open-all aria-label="What can I ask?"><span aria-hidden="true">${motionShimmer('What can I ask?')}</span></button>
            <button type="button" class="chip ws-intent-chip ws-intent-chip--askhelp" data-ask-open-all aria-label="What can I ask?">
              <span class="material-symbols-outlined">help</span>
              <span class="sc-ask-shimmer" aria-hidden="true">${motionShimmer('What can I ask?')}</span>
            </button>
          </div>
          ${demoAskLiveHtml()}
        </div>`;
    },
  },
  {
    name: 'Turns module',
    wide: true,
    cat: 'Chat & drawers',
    cls: '.wt-turn \u00b7 .wt-fork \u00b7 .wt-jump \u00b7 .wt-fork-id \u00b7 .wt-empty',
    used: 'WISEcodeAI Studio Chat \u2014 docks as a sticky drawer on the chat\u2019s right from the \u22ef Turns switch',
    note: 'Every turn in the live thread, with Fork from here (copies the conversation up to that point into a new chat), Jump (scrolls the transcript), and the same turn ID as the answer row. Empty until the first question lands. Starts tucked behind the chat, never as an in-chat overlay.',
    noteIcon: 'alt_route',
    demo: `
      <div class="dsc-states" style="width:100%">
        <div class="dsc-state-col" style="flex:1 1 280px">
          <div class="dsc-sub-label">A turn</div>
          <div class="wt-turn">
            <div class="wt-turn-head"><span class="wt-turn-num">1</span><span class="wt-turn-q">Compare oat milk vs almond milk on processing.</span></div>
            <div class="wt-turn-a">Oat milk scores higher on processing; almond milk wins on additives\u2026</div>
            <div class="wt-chips"><span class="wt-chip"><span class="material-symbols-outlined">bar_chart</span>Results</span></div>
            <div class="wt-actions">
              <button type="button" class="wt-fork" title="Fork from here" aria-label="Fork from here"><span class="material-symbols-outlined">alt_route</span></button>
              <span class="wt-fork-id" title="Fork ID">#6d7a</span>
              <button type="button" class="wt-jump" title="Jump to this turn"><span class="material-symbols-outlined">my_location</span>Jump</button>
            </div>
          </div>
        </div>
        <div class="dsc-state-col" style="flex:1 1 220px">
          <div class="dsc-sub-label">Empty</div>
          <div class="wt-empty">No turns yet.<br>Ask a question, then fork any turn from here to branch the conversation into a new chat of your own.</div>
        </div>
      </div>`,
  },
  {
    name: 'Database roster',
    wide: true,
    cat: 'Chat & drawers',
    cls: '.fl-db-popover \u00b7 .fl-db-item \u00b7 .fl-db-chip \u00b7 .fl-db-dock-btn',
    used: 'Chat composer on every surface \u2014 popover in the input, or docked as its own sticky module',
    note: 'Grouped, searchable, single-select. Filter chips hide read-only or read/write groups. The dock icon at the top breaks the same roster out as a sticky drawer to the right of the chat. A mid-thread switch drops an event line in the transcript and ticks the activity strip.',
    noteIcon: 'database',
    demo: `
      <div class="fl-db-popover" data-popover-static style="position:static;display:flex;flex-direction:column">
        <div class="fl-db-top">
          <div class="fl-db-pop-head">
            <span class="fl-db-pop-title">Databases</span>
            <button type="button" class="fl-db-dock-btn" title="Dock as a sticky module" aria-label="Dock the database selector as a sticky module"><span class="material-symbols-outlined">dock_to_right</span></button>
          </div>
          <label class="fl-db-search">
            <span class="material-symbols-outlined" aria-hidden="true">search</span>
            <input type="text" class="fl-db-search-input" placeholder="Search databases\u2026" aria-label="Search databases" autocomplete="off">
          </label>
          <div class="fl-db-filters" role="group" aria-label="Filter by access">
            <button type="button" class="fl-db-chip is-active" data-filter="all">All</button>
            <button type="button" class="fl-db-chip" data-filter="ro">Read-only</button>
            <button type="button" class="fl-db-chip" data-filter="rw">Read/write</button>
          </div>
        </div>
        <div class="fl-db-scroll">
          <div class="fl-db-group" data-access="ro">
            <div class="fl-db-grouphead"><span class="fl-db-grouptitle">Postgres databases</span><span class="fl-db-access fl-db-access--ro">read-only</span></div>
            <button type="button" class="fl-db-item is-active" role="menuitemradio" aria-checked="true"><span class="fl-db-meta"><span class="fl-db-name">Postgres (DEV)</span><span class="fl-db-desc">Named live environment</span></span><span class="fl-db-badge">LIVE</span><span class="fl-db-check material-symbols-outlined" aria-hidden="true">check</span></button>
            <button type="button" class="fl-db-item" role="menuitemradio" aria-checked="false"><span class="fl-db-meta"><span class="fl-db-name">Postgres (UAT)</span><span class="fl-db-desc">Named live environment</span></span><span class="fl-db-badge">LIVE</span><span class="fl-db-check material-symbols-outlined" aria-hidden="true">check</span></button>
          </div>
        </div>
      </div>`,
  },
  {
    name: 'Attachments',
    cat: 'Chat & drawers',
    cls: '.fl-attach-chip \u00b7 .sc-att-chip \u00b7 .sc-att-thumb',
    used: 'Chat composer pending row \u00b7 in-transcript previews on the member\u2019s line',
    note: 'Pending chips sit in the composer (thumb + name + remove). Once sent they ride the You line as the same thumb + name, without the remove. Tapping a photo thumb opens <em>Image lightbox</em>.',
    noteIcon: 'attach_file',
    demo: `
      <div class="dsc-states" style="width:100%">
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Pending in composer</div>
          <div class="fl-attachments">
            <span class="fl-attach-chip"><span class="fl-attach-thumb" style="background-image:url('../assets/portfolio/blueberry_muffins.png')"></span><span class="fl-attach-name">muffin-front.png</span><button type="button" class="fl-attach-x" aria-label="Remove"><span class="material-symbols-outlined">close</span></button></span>
            <span class="fl-attach-chip"><span class="fl-attach-thumb fl-attach-thumb--icon"><span class="material-symbols-outlined">description</span></span><span class="fl-attach-name">spec.pdf</span><button type="button" class="fl-attach-x" aria-label="Remove"><span class="material-symbols-outlined">close</span></button></span>
          </div>
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">In the transcript</div>
          <div class="sc-att-row">
            <span class="sc-att-chip" title="muffin-front.png"><span class="sc-att-thumb" style="background-image:url('../assets/portfolio/blueberry_muffins.png')"></span><span class="sc-att-name">muffin-front.png</span></span>
            <span class="sc-att-chip" title="spec.pdf"><span class="sc-att-thumb sc-att-thumb--icon"><span class="material-symbols-outlined">image</span></span><span class="sc-att-name">spec.pdf</span></span>
          </div>
        </div>
      </div>`,
  },
  {
    name: 'Image lightbox',
    ai: false,
    cat: 'Overlays',
    wide: true,
    cls: '.dash-modal--panel \u00b7 .dash-banner-preview \u00b7 .dash-banner-drop \u00b7 .dash-banner-url \u00b7 .wai-img-modal',
    used: 'View / Add Product photo editor \u00b7 Chat attachment preview (image only \u2014 no fields)',
    note: 'The full photo editor from View Product: preview, upload / drag-and-drop, a paste-a-URL field, then Cancel and Replace. Chat attachments reuse the same preview shell without the bottom fields. Closes on backdrop, the close button, or Escape.',
    noteIcon: 'photo',
    demo: `
      <div class="dash-modal dash-modal--panel" data-modal-static role="dialog" aria-label="Replace product photo">
        <header class="dash-modal-head">
          <div class="dash-modal-titles">
            <span class="dash-modal-eyebrow">Product photo</span>
            <h2 class="dash-modal-title">Replace product photo</h2>
          </div>
          <button class="dash-modal-close" type="button" aria-label="Close"><span class="material-symbols-outlined">close</span></button>
        </header>
        <div class="dash-modal-body">
          <div class="dash-banner-preview dash-banner-preview--photo">
            <div class="dash-banner-preview-img" style="display:block;background-image:url('../assets/portfolio/blueberry_muffins.png')"></div>
          </div>
          <label class="dash-banner-drop">
            <span class="material-symbols-outlined">cloud_upload</span>
            <span class="dash-banner-drop-text"><strong>Upload an image</strong> or drag &amp; drop<br><span class="dash-banner-drop-hint">PNG, JPG or WEBP</span></span>
          </label>
          <div class="dash-banner-or"><span>or paste a URL</span></div>
          <input type="url" class="dash-banner-url" placeholder="https://\u2026/product.jpg" autocomplete="off" readonly tabindex="-1">
        </div>
        <footer class="dash-modal-foot">
          <span></span>
          <div class="dash-modal-foot-right">
            <button class="dash-btn dash-btn--ghost" type="button">Cancel</button>
            <button class="dash-btn dash-btn--primary" type="button"><span class="material-symbols-outlined">check</span>Replace photo</button>
          </div>
        </footer>
      </div>`,
  },
  {
    name: 'Segmented control',
    ai: false,
    cat: 'Actions',
    cls: '.sc-stream-seg \u00b7 .sc-stream-seg-btn (+ .is-on)',
    used: 'Chat \u22ef \u2014 Activity strip side, streaming detail, helix style \u00b7 Appearance text size / spacing',
    note: 'One connected pill track. The on segment fills brand. Used anywhere a control picks exactly one of a few named sizes or modes. Not a switch (on/off is <em>Switch</em>) and not a filter chip.',
    noteIcon: 'view_week',
    demo: `
      <div class="dsc-states" style="width:100%">
        <div class="dsc-state-col" style="flex:1 1 200px">
          <div class="dsc-sub-label">Default \u00b7 Full selected</div>
          <div class="sc-stream-seg" role="radiogroup" aria-label="Streaming detail">
            <button type="button" class="sc-stream-seg-btn is-on" role="radio" aria-checked="true">Full</button>
            <button type="button" class="sc-stream-seg-btn" role="radio" aria-checked="false">Steps</button>
            <button type="button" class="sc-stream-seg-btn" role="radio" aria-checked="false">Final</button>
          </div>
        </div>
        <div class="dsc-state-col" style="flex:1 1 160px">
          <div class="dsc-sub-label">Hover on unselected</div>
          <div class="sc-stream-seg" role="radiogroup">
            <button type="button" class="sc-stream-seg-btn is-on" role="radio" aria-checked="true">Left</button>
            <button type="button" class="sc-stream-seg-btn is-hover" role="radio" aria-checked="false">Right</button>
          </div>
        </div>
        <div class="dsc-state-col" style="flex:1 1 200px">
          <div class="dsc-sub-label">Disabled (master switch off)</div>
          <div class="sc-stream-detail is-disabled" style="margin:0">
            <div class="sc-stream-seg" role="radiogroup">
              <button type="button" class="sc-stream-seg-btn is-on" role="radio" aria-checked="true" disabled>Full</button>
              <button type="button" class="sc-stream-seg-btn" role="radio" aria-checked="false" disabled>Steps</button>
              <button type="button" class="sc-stream-seg-btn" role="radio" aria-checked="false" disabled>Final</button>
            </div>
          </div>
        </div>
      </div>`,
  },
  {
    name: 'Switch',
    ai: false,
    cat: 'Actions',
    cls: '.sc-switch (+ .sc-switch--pink) \u00b7 .sc-mcp-item.is-on',
    used: 'Chat \u22ef toggles \u00b7 Appearance rows \u00b7 History filters \u2014 on/off, not a segmented pick',
    note: 'The track is the state. Off is muted; on fills brand. Admin rows that should read as caution use the pink fill. Never replace this with a row highlight.',
    noteIcon: 'toggle_on',
    demo: `
      <div class="dsc-states">
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Off</div>
          <button type="button" class="topbar-menu-item sc-mcp-item" role="menuitemcheckbox" aria-checked="false"><span>Activity strip</span><span class="sc-switch" aria-hidden="true"></span></button>
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">On</div>
          <button type="button" class="topbar-menu-item sc-mcp-item is-on" role="menuitemcheckbox" aria-checked="true"><span>Activity strip</span><span class="sc-switch" aria-hidden="true"></span></button>
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">On \u00b7 Admin pink</div>
          <button type="button" class="topbar-menu-item sc-mcp-item is-on" role="menuitemcheckbox" aria-checked="true"><span>Compact spacing</span><span class="topbar-menu-badge">Admin</span><span class="sc-switch sc-switch--pink" aria-hidden="true"></span></button>
        </div>
      </div>`,
  },
  {
    name: 'Width toggle',
    cat: 'Actions',
    cls: '.panel-width-toggle-btn (+ .is-on / .is-width-fill) \u00b7 width_normal / width_wide / width_full / fit_width',
    used: 'Every module header except Navigation and the minimized History rail',
    note: 'One control, four rest states: single \u2192 double \u2192 fill \u2192 custom, then back. Icons: <code>width_normal</code> (single), <code>width_wide</code> (double), <code>width_full</code> (fill), and <code>fit_width</code> (custom drag). Each module remembers its own rest state \u2014 changing or resizing one never writes another. The Motion &amp; Resize card for Width tiers is the same control running live. Chat load default is a property of the display, not the last toggle.',
    noteIcon: 'width_wide',
    demo: `
      <div class="dsc-states">
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Single</div>
          <button type="button" class="panel-width-toggle-btn" aria-pressed="false" title="Width (single)" aria-label="Module width, single"><span class="material-symbols-outlined">width_normal</span></button>
          <code class="dsc-icon-name">width_normal</code>
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Hover</div>
          <button type="button" class="panel-width-toggle-btn is-hover" aria-pressed="false" title="Width (single)" aria-label="Module width, hover"><span class="material-symbols-outlined">width_normal</span></button>
          <code class="dsc-icon-name">width_normal</code>
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Double / on</div>
          <button type="button" class="panel-width-toggle-btn is-on" aria-pressed="true" title="Width (double)" aria-label="Module width, double"><span class="material-symbols-outlined">width_wide</span></button>
          <code class="dsc-icon-name">width_wide</code>
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Fill</div>
          <button type="button" class="panel-width-toggle-btn is-on is-width-fill" aria-pressed="true" title="Width (fill)" aria-label="Module width, fill"><span class="material-symbols-outlined">width_full</span></button>
          <code class="dsc-icon-name">width_full</code>
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Custom</div>
          <button type="button" class="panel-width-toggle-btn is-on" aria-pressed="true" title="Width (custom)" aria-label="Module width, custom"><span class="material-symbols-outlined">fit_width</span></button>
          <code class="dsc-icon-name">fit_width</code>
        </div>
      </div>`,
  },
  {
    name: 'Empty states',
    cat: 'Feedback',
    cls: '.adm-empty \u00b7 .wt-empty \u00b7 .wise-app-search-empty \u00b7 .wch-ask-empty',
    used: 'Admin lists, Turns, App search, What can I ask? \u2014 when a filter or a new surface has nothing yet',
    note: 'Quiet centred copy, never an illustration tile. Lists say nothing matched the filter; Turns says ask a question first. Search names the query in the empty line.',
    noteIcon: 'inbox',
    demo: `
      <div class="dsc-states" style="width:100%">
        <div class="dsc-state-col" style="flex:1 1 200px">
          <div class="dsc-sub-label">List filter</div>
          <div class="adm-empty">No organizations match these filters.</div>
        </div>
        <div class="dsc-state-col" style="flex:1 1 200px">
          <div class="dsc-sub-label">Turns</div>
          <div class="wt-empty">No turns yet.<br>Ask a question, then fork any turn from here.</div>
        </div>
        <div class="dsc-state-col" style="flex:1 1 200px">
          <div class="dsc-sub-label">Search</div>
          <div class="wise-app-search-empty">No files, reports, or documents match <strong>oat milk</strong>.</div>
        </div>
      </div>`,
  },
  {
    name: 'Nutrition Facts',
    ai: false,
    wide: true,
    cat: 'Chat & drawers',
    cls: '#nfp-panel \u00b7 .nfp-nf-panel \u00b7 .nfp-barcode-svg \u00b7 .nfp-hero',
    used: 'Add Product \u00b7 View Product \u2014 sticky drawer to the right of chat',
    note: 'The FDA-style facts label plus the product hero and barcode. Sits as a sticky drawer at z-index 1, under the chat and over the progress tracker. Count-up animates the calories numeral. The label itself stays black-on-white in both themes so it still reads as a printed panel. On Add / View Product the label can grow with extra nutrient rows; that height drives the ingredients column beside it, which never shrinks below the remaining module-body fill (the height it has on a typical product).',
    noteIcon: 'nutrition',
    demo: `
      <div class="dsc-states" style="width:100%">
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Facts label</div>
          <div class="nfp-nf-panel mi-nfp-demo">
            <div class="nfp-nf-title">Nutrition Facts</div>
            <div class="nfp-nf-serving">
              <div class="nfp-nf-spc-row">8 servings per container</div>
              <div class="nfp-nf-ss-row"><span>Serving size</span><span>1 pastry (50g)</span></div>
            </div>
            <div class="nfp-nf-cal-band">
              <div class="nfp-nf-cal-left"><span class="nfp-nf-cal-sm">Amount per serving</span><span class="nfp-nf-cal-text">Calories</span></div>
              <span class="nfp-nf-cal-num">210</span>
            </div>
            <div class="nfp-nf-dv-hdr">% Daily Value*</div>
            <div class="nfp-nf-row"><span class="nfp-nf-main"><strong>Total Fat</strong>&nbsp;9g</span><span class="nfp-nf-dv">12%</span></div>
            <div class="nfp-nf-row nfp-nf-ind1"><span class="nfp-nf-main">Saturated Fat 3.5g</span><span class="nfp-nf-dv">18%</span></div>
            <div class="nfp-nf-row"><span class="nfp-nf-main"><strong>Sodium</strong>&nbsp;180mg</span><span class="nfp-nf-dv">8%</span></div>
            <div class="nfp-nf-row"><span class="nfp-nf-main"><strong>Total Carbohydrate</strong>&nbsp;30g</span><span class="nfp-nf-dv">11%</span></div>
          </div>
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Barcode slot</div>
          <div class="mi-nfp-upc">
            <svg class="nfp-barcode-svg" width="180" height="56" viewBox="0 0 180 56" aria-hidden="true">${Array.from({ length: 48 }, (_, i) => `<rect x="${4 + i * 3.6}" y="4" width="${i % 5 === 0 ? 2.4 : 1.2}" height="40" fill="#111"/>`).join('')}</svg>
            <div class="mi-nfp-upc-digits">8 57287 00420 3</div>
          </div>
        </div>
      </div>`,
  },
  {
    name: 'Product identity strip',
    ai: false,
    wide: true,
    cat: 'Chat & drawers',
    cls: '.nfp-fi-group--identity \u00b7 .nfp-fi-cat--dock \u00b7 .nfp-fi-upc \u00b7 .nfp-fi-thumbs',
    used: 'Add Product \u00b7 View Product \u2014 the top of the Product Details drawer',
    note: 'The category is a 28px pill in the title row, immediately left of ⋯ and width. The size row is extra-count squares, then the barcode, then Add size. A product with only one picture does not show a tiny 1 ct preview \u2014 the lead photo is enough \u2014 so that row is barcode, then plus. The pencil lives on the lead photo, not next to ⋯.',
    noteIcon: 'id_card',
    demo: `
      <div class="dsc-states" style="width:100%">
        <div class="dsc-state-col" style="flex:1 1 100%">
          <div class="dsc-sub-label">Several sizes</div>
          ${idStripDemoHTML({ single: false })}
        </div>
        <div class="dsc-state-col" style="flex:1 1 100%">
          <div class="dsc-sub-label">One picture</div>
          ${idStripDemoHTML({ single: true })}
        </div>
      </div>`,
  },
  {
    name: 'Progress tracker',
    ai: false,
    wide: true,
    cat: 'Chat & drawers',
    cls: '.vf-progress-pane \u00b7 .vfp-step (--done / --active / --err) \u00b7 .vfp-progress-fill',
    used: 'Add Product \u00b7 View Product \u00b7 Add Catalog \u00b7 Non-UPF and GRAS verification \u2014 the rightmost nested drawer',
    note: 'Always sticky, always one layer under the pane to its left (z-index 0, shorter). Steps: pending, active, done, error. The \u22ef menu can Remove panel; a restore tab stays on the row\u2019s right edge. Count-up on the percent.',
    noteIcon: 'checklist',
    demo: `
      <div class="vfp-inner mi-vfp-demo" style="max-width:280px;width:100%">
        <div class="vfp-header">
          <div class="vfp-pct-ring" style="--pct:50"><span>50%</span></div>
          <div class="vfp-header-text">
            <div class="vfp-title">Add product progress</div>
            <div class="vfp-subtitle">Flax4Life \u00b7 8 steps</div>
          </div>
        </div>
        <div class="vfp-progress">
          <div class="vfp-progress-head"><span>4 of 8 steps</span><span class="vfp-progress-pct">50%</span></div>
          <div class="vfp-progress-track"><div class="vfp-progress-fill" style="width:50%"></div></div>
        </div>
        <div class="vfp-steps">
          <div class="vfp-step vfp-step--done"><div class="vfp-step-track"><div class="vfp-step-num"><span class="material-symbols-outlined">check</span></div><div class="vfp-step-line"></div></div><div class="vfp-step-body"><div class="vfp-step-title">Photo</div></div></div>
          <div class="vfp-step vfp-step--done"><div class="vfp-step-track"><div class="vfp-step-num"><span class="material-symbols-outlined">check</span></div><div class="vfp-step-line"></div></div><div class="vfp-step-body"><div class="vfp-step-title">Category</div></div></div>
          <div class="vfp-step vfp-step--active"><div class="vfp-step-track"><div class="vfp-step-num">3</div><div class="vfp-step-line"></div></div><div class="vfp-step-body"><div class="vfp-step-title">UPC / barcode</div><div class="vfp-step-sub">12 digits</div></div></div>
          <div class="vfp-step vfp-step--err"><div class="vfp-step-track"><div class="vfp-step-num"><span class="material-symbols-outlined">error</span></div><div class="vfp-step-line"></div></div><div class="vfp-step-body"><div class="vfp-step-title">Nutrition</div><div class="vfp-step-sub">Calories and serving size required</div></div></div>
          <div class="vfp-step"><div class="vfp-step-track"><div class="vfp-step-num">5</div></div><div class="vfp-step-body"><div class="vfp-step-title">Ingredients</div><div class="vfp-step-sub">Pending</div></div></div>
        </div>
      </div>`,
  },
  {
    name: 'Jam strip',
    wide: true,
    stackThemes: true,
    cat: 'Overlays',
    cls: '.jam-pop \u00b7 .jam-eq \u00b7 .jam-helix \u00b7 .jam-pop-song (+ .is-playing, .is-active, .jam-viz-bars / .jam-viz-helix)',
    used: 'Appearance \u203a Sound on every app page \u2014 off by default; the player lives in that popover, never the primary navigation',
    note: 'Play starts only from the play button and then loops. Track chips pick a song without starting it. Two visualizers: proper equalizer bars (default) and a horizontal helix that twists and sparks with the music. The crate lists every synthesized track with length, file name, and size.',
    noteIcon: 'graphic_eq',
    demoCustom() {
      const stage = () => `
        <div class="dsc-states" style="width:100%">
          <div class="dsc-state-col" style="flex:1 1 100%">
            <div class="dsc-sub-label">Bars \u00b7 Idle (default)</div>
            ${demoJamStrip('bars', false, JAM_SONGS.slice(0, 5))}
          </div>
          <div class="dsc-state-col" style="flex:1 1 100%">
            <div class="dsc-sub-label">Bars \u00b7 Playing</div>
            ${demoJamStrip('bars', true, JAM_SONGS.slice(0, 5))}
          </div>
          <div class="dsc-state-col" style="flex:1 1 100%">
            <div class="dsc-sub-label">Helix \u00b7 Idle</div>
            ${demoJamStrip('helix', false, JAM_SONGS.slice(5, 10))}
          </div>
          <div class="dsc-state-col" style="flex:1 1 100%">
            <div class="dsc-sub-label">Helix \u00b7 Playing</div>
            ${demoJamStrip('helix', true, JAM_SONGS.slice(5, 10))}
          </div>
        </div>
        ${demoJamCrate()}`;
      return `
        <div class="dsc-themes dsc-themes--stack">
          ${themePaneHTML('light', stage())}
          ${themePaneHTML('dark', stage())}
        </div>`;
    },
  },
  {
    name: 'App search',
    wide: true,
    cat: 'Navigation',
    cls: '.wise-app-search \u00b7 .wise-app-search-hit \u00b7 .wise-app-search-empty',
    used: 'Nav footer search on every app page when Appearance \u203a Search is on',
    note: 'Indexes transcripts, outputs, and reports. Results group by type; locked hits wear a lock. Empty names the query. Default is the idle field, full width of its container. Type in it — the <em>oat milk</em> query opens a multi-group list. Hands off through session keys so a hit can reopen the matching chat or report.',
    noteIcon: 'search',
    demo: `
      <div class="dsc-states" style="width:100%">
        <div class="dsc-state-col" style="flex:1 1 100%;width:100%">
          <div class="dsc-sub-label">Default</div>
          ${demoAppSearchHtml('')}
        </div>
        <div class="dsc-state-col" style="flex:1 1 100%;width:100%">
          <div class="dsc-sub-label">Type a query</div>
          ${demoAppSearchHtml()}
        </div>
      </div>`,
  },
  {
    name: 'Roll \u00b7 Crawl \u00b7 Walk \u00b7 Run',
    ai: false,
    wide: true,
    stackThemes: true,
    cat: 'Navigation',
    cls: '#cwr-toggle \u00b7 .cwr-btn [aria-checked] \u00b7 html.cwr-roll / -crawl / -walk / -run',
    used: 'Floating segmented control on every app page \u2014 Run on WISEcodeAI, Add Product, View Product, and Helix; Roll everywhere else. Helix locks Roll, Crawl, and Walk.',
    note: 'A <strong>vertical</strong> stadium of four rollout modes: <strong>Roll</strong> (stripped nav), <strong>Crawl</strong> (no chat, modules fill), <strong>Walk</strong> (chat on, composer locked), <strong>Run</strong> (composer unlocked). Icon above label, 48px circular radios, stacked top to bottom \u2014 never a horizontal pill. Each page loads its own default; hovering any mode opens its include / exclude card. Helix stays on Run \u2014 the other three lock (dimmed, padlock, not-allowed). This catalog freezes the hover on all four so every card stays visible. The live widget lives in shadow DOM so page button styles cannot restyle it. The load default is the right edge of the screen, vertically centered, 12px in. Drag to move; double-click restores that seat.',
    noteIcon: 'directions_run',
    demo: demoCwrCatalog(),
  },
  {
    name: 'Owl walkthrough',
    ai: false,
    wide: true,
    cat: 'Chat & drawers',
    cls: '.owt-mod \u00b7 .owt-copy \u00b7 .owt-nav-link \u00b7 .owt-chips',
    used: 'First login and first visit to a chapter \u2014 docks as a sticky module; replay from Help or Preferences',
    note: 'Same docked-module shell as What can I ask?. Next opens the real page, not a mockup. Skip a group or the rest; progress is remembered. Headline is serif.',
    noteIcon: 'auto_awesome',
    demo: `
      <div class="mi-owt">
        <div class="wch-head">
          <div class="owt-mast">
            <span class="wch-head-title">WISEowl walkthrough</span>
            <p class="owt-kicker">Meet WISEowl \u00b7 1 of 3</p>
          </div>
        </div>
        <p class="owt-copy">WISEcode is where brands keep the truth about their products \u2014 and where you ask me anything about food. This walkthrough is the map.</p>
        <div class="owt-chips" role="navigation" aria-label="Walkthrough groups">
          <button type="button" class="chip is-selected">Meet WISEowl</button>
          <button type="button" class="chip">Talk to me</button>
          <button type="button" class="chip">Your portfolio</button>
        </div>
        <div class="owt-nav-move">
          <button type="button" class="owt-nav-link" disabled>Back</button>
          <button type="button" class="owt-nav-link owt-nav-link--next">Next</button>
        </div>
      </div>`,
  },
  {
    name: 'Toast',
    ai: false,
    cls: '.ag-toast \u00b7 #ag-toast-wrap (js/agent-overview.js \u00b7 agToast)',
    used: 'Global notifications via the agent shell (#ag-toast-wrap, js/agent-overview.js) — saves, invites, errors. Same seat on admin / module wraps (.wmod-toast-wrap, #adm-toast-wrap)',
    note: 'One seat only: the <strong>bottom centre</strong> of the viewport \u2014 22px up from the edge, horizontally centred (<code>#ag-toast-wrap</code>). It does not sit at the top, in a corner, or next to the control that fired it. Arrival is a 0.25s rise of 10px with a fade-in (<code>agToastIn</code>). It holds 2.6s, then fades and drops 8px and is removed. A second toast stacks above the first (column, 8px gap). The wrap does not take clicks. Admin / module wraps use the same seat, 28px up. Live arrival + leave are in <em>Motion &amp; Resize \u2192 Toast</em>.',
    noteIcon: 'vertical_align_bottom',
    demo: `
      <div class="dsc-states dsc-states--toast" style="width:100%">
        <div class="dsc-state-col dsc-toast-seat-col">
          <div class="dsc-sub-label">Seat \u2014 bottom centre</div>
          <div class="dsc-toast-stage" aria-hidden="true">
            <div class="ag-toast dsc-toast-seated"><span class="material-symbols-outlined">check_circle</span>Saved to your workspace</div>
          </div>
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Enter \u2014 rises 10px</div>
          <div class="ag-toast dsc-toast-enter"><span class="material-symbols-outlined">check_circle</span>Saved to your workspace</div>
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Rest</div>
          <div class="ag-toast"><span class="material-symbols-outlined">check_circle</span>Saved to your workspace</div>
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Leave \u2014 drops 8px</div>
          <div class="ag-toast dsc-toast-leave"><span class="material-symbols-outlined">check_circle</span>Saved to your workspace</div>
        </div>
      </div>`,
  },
  {
    name: 'Left-nav item',
    ai: false,
    cls: '.menu-nav-item · .menu-nav-icon (+ .is-active, .menu-nav-locked, .is-hover)',
    used: 'Primary navigation rail on every app page (js/agent-menu.js)',
    note: 'States: Default, Hover, Open/active (<code>.is-active</code>), Locked. One row shape for the whole rail.',
    noteIcon: 'menu',
    demo: `
      <div class="dsc-states" style="width:100%">
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Default · Hover · Open · Locked</div>
          <nav class="menu-nav" style="max-width:230px">
            <a class="menu-nav-item" href="#" onclick="return false"><span class="menu-nav-icon"><span class="material-symbols-outlined">space_dashboard</span></span><span class="menu-nav-label">Overview</span></a>
            <a class="menu-nav-item is-hover" href="#" onclick="return false"><span class="menu-nav-icon"><span class="material-symbols-outlined">insights</span></span><span class="menu-nav-label">Reports</span></a>
            <a class="menu-nav-item is-active" href="#" onclick="return false"><span class="menu-nav-icon"><span class="material-symbols-outlined">handyman</span></span><span class="menu-nav-label">Product Portfolio</span></a>
            <a class="menu-nav-item menu-nav-locked" href="#" onclick="return false"><span class="menu-nav-icon"><span class="material-symbols-outlined">description</span></span><span class="menu-nav-label">Studio</span><span class="menu-nav-lock"><span class="material-symbols-outlined">lock</span></span></a>
          </nav>
        </div>
      </div>`,
  },
  {
    name: 'Dashboard card',
    ai: false,
    cls: '.dash-card · .dash-eyebrow · .dash-card-title',
    used: 'Non-UPF Dashboard · Reports · Verification · AI Dashboard widgets',
    demo: `
      <div class="dash-card" style="max-width:320px">
        <div class="dash-eyebrow is-primary">Portfolio health</div>
        <h4 class="dash-card-title" style="margin:8px 0 6px">Non-UPF share</h4>
        <p style="margin:0;font-size:0.8125rem;color:var(--text-muted)">62% of the portfolio is verified Non-UPF, up 4 points this quarter.</p>
      </div>`,
  },
  /* ---- Data table — the ONE shared grid "table", fully loaded ----- */
  {
    name: 'Data table',
    cat: 'Tables & data',
    wide: true,
    cls: '.adm-table · .adm-thead / .adm-trow · .adm-th(--sortable/--num) · .adm-td(--actions/--num) · .adm-idcell · .adm-avatar · .adm-chip · .adm-rowmenu · .wtp-foot',
    used: 'Organizations · User Management · Audit Queue · Non-UPF Dashboard · Quick Invite · Invoices · Portfolio · Ingredient Browser · Guiding Stars · Reformulation — every admin & module list',
    note: 'One CSS-grid pattern (no <code>&lt;table&gt;</code>) driven by <code>--adm-cols</code>. Cell types, left to right: <strong>bare kebab</strong> (no circled chip), <strong>identity</strong> (avatar + name + sub), <strong>status chip</strong>, <strong>stacked dates</strong> (two lines, header ⋮ picks created / joined / last active / last edited), <strong>numeric</strong> (hot vs zero), <strong>score</strong> (serif numeral), <strong>Guiding Stars</strong>, <strong>currency</strong>. Sort + paging attach app-wide. Full width keeps every column in one row. At the width of a docked module — these Light / Dark panes already are — rows become stacked cards and the header hides, the same container-query collapse live admin lists use. The status chip and dates share <strong>one row</strong> (chip left, dates right) until the card is too tight. Count-like cells (numeric, score, stars, amount) stay on <strong>one strip</strong> that fits one, two, or three across and wraps. The demo is marked <code>data-wtp-skip</code> so the shared pager does not inject a second footer.',
    noteIcon: 'table_rows',
    demo: demoDataTable(),
    demoCustom() {
      return `
        <div class="dsc-table-catalog">
          <div class="dsc-sub-label">Full width</div>
          ${themedDemoHTML(`<div class="dsc-adm-stage dsc-adm-stage--wide">${demoDataTable()}</div>`, { stack: true })}
          <div class="dsc-sub-label">Responsive · stacked cards</div>
          ${themedDemoHTML(`<div class="dsc-adm-stage dsc-adm-stage--narrow">${demoDataTable()}</div>`)}
        </div>`;
    },
  },

  /* ---- Filter toolbar — search pill + funnel + popover ------------ */
  {
    name: 'Filter toolbar',
    wide: true,
    cls: '.adm-toolbar · .adm-search-inline.has-filter · .adm-search-filter · .adm-filter-pop · .adm-select · .adm-input · .wmod-fchip (= .pf-fchip / .lib-fchip)',
    used: 'Organizations · User Management · Audit Queue · Quick Invite · Non-UPF Dashboard · Portfolio · Conversation Library · API Keys · Marketing Assets · Ingredient Browser',
    note: 'Same search pill + funnel on every list. A dot on the funnel signals active filters. The open popover is not one generic dropdown \u2014 it carries every control type the app actually uses: <strong>select</strong> (User Management, Non-UPF, Audit, Quick Invite), <strong>date range</strong> (Audit Queue), <strong>exclusive chips</strong> (Portfolio, API Keys), <strong>icon chips</strong> (Library), <strong>star chips</strong> (Portfolio Guiding Stars), a <strong>toggle chip</strong> (near-miss), and <strong>multi-select chips</strong> (Ingredient Browser flags). Clear all + Apply close the admin pops; chip pops apply as you tap.',
    noteIcon: 'filter_alt',
    demo: demoFilterToolbar(),
  },

  /* ---- Score & metric cards — each shape is its own reusable part ---- */
  {
    name: 'Filter tiles',
    wide: true,
    cls: '.adm-stat (+ .is-active, .adm-stat--green/--amber/--red) (= .pf-stat)',
    used: 'Organizations · User Management · Audit Queue · Portfolio (.pf-stats) · Conversation Library — click-to-filter row above every list',
    note: 'Click-to-filter tiles that sit above tables and scope the list. <code>.is-active</code> is the selected/open state; Hover lifts the card. These are not KPI displays — tapping one filters. No eyebrows.',
    noteIcon: 'filter_alt',
    demo: `
      <div class="dsc-states" style="width:100%">
        <div class="dsc-state-col" style="flex:1 1 100%">
          <div class="dsc-sub-label">Default · Hover · Open (selected)</div>
          <div class="adm-stats" style="width:100%">
            <button type="button" class="adm-stat">
              <span class="adm-stat-num">128</span>
              <span class="adm-stat-label"><span class="material-symbols-outlined">apps</span>All</span>
            </button>
            <button type="button" class="adm-stat adm-stat--green is-hover">
              <span class="adm-stat-num">62</span>
              <span class="adm-stat-label"><span class="material-symbols-outlined">verified</span>Verified</span>
            </button>
            <button type="button" class="adm-stat adm-stat--amber is-active">
              <span class="adm-stat-num">41</span>
              <span class="adm-stat-label"><span class="material-symbols-outlined">pending</span>Pending</span>
            </button>
            <button type="button" class="adm-stat adm-stat--red">
              <span class="adm-stat-num">25</span>
              <span class="adm-stat-label"><span class="material-symbols-outlined">error</span>At risk</span>
            </button>
          </div>
        </div>
      </div>`,
  },
  {
    name: 'Action scorecards',
    ai: false,
    wide: true,
    cls: '.adm-vf-stat (+ .is-active, .adm-stat--*) · .adm-chip · .adm-btn',
    used: 'Non-UPF Dashboard — status chip + caption + optional ghost action pinned to the bottom',
    note: 'Dashboard action cards, not filter tiles. Each carries a big numeral, a status chip, a caption, and optionally a ghost button. <code>.is-active</code> marks the focused card. Reuses <em>Status chips</em> and <em>Admin buttons</em> — those stay separate catalog entries.',
    noteIcon: 'bolt',
    demo: `
      <div class="adm-vf-stats" style="width:100%">
        <div class="adm-vf-stat is-active" role="button" tabindex="0">
          <span class="adm-vf-stat-num">90</span>
          <span class="adm-vf-stat-chipwrap"><span class="adm-chip adm-chip--blue"><span class="material-symbols-outlined">inventory_2</span>Products</span></span>
          <span class="adm-vf-stat-sub">Items in Registry</span>
        </div>
        <div class="adm-vf-stat adm-stat--red is-hover" role="button" tabindex="0">
          <span class="adm-vf-stat-num">10</span>
          <span class="adm-vf-stat-chipwrap"><span class="adm-chip adm-chip--red"><span class="material-symbols-outlined">warning</span>Action Required</span></span>
          <span class="adm-vf-stat-sub">Missing mandatory data</span>
          <button type="button" class="adm-btn adm-btn--ghost adm-btn--sm">Edit</button>
        </div>
        <div class="adm-vf-stat adm-stat--blue" role="button" tabindex="0">
          <span class="adm-vf-stat-num">19</span>
          <span class="adm-vf-stat-chipwrap"><span class="adm-chip adm-chip--blue"><span class="material-symbols-outlined">fact_check</span>Pending Attestation</span></span>
          <span class="adm-vf-stat-sub">Selected products need review and attestation</span>
          <button type="button" class="adm-btn adm-btn--ghost adm-btn--sm">Attest</button>
        </div>
        <div class="adm-vf-stat adm-stat--green" role="button" tabindex="0">
          <span class="adm-vf-stat-num">8</span>
          <span class="adm-vf-stat-chipwrap"><span class="adm-chip adm-chip--green"><span class="material-symbols-outlined">verified</span>Verified</span></span>
          <span class="adm-vf-stat-sub">Fully verified (shield verification)</span>
        </div>
      </div>`,
  },
  {
    name: 'Compact metrics',
    ai: false,
    cls: '.adm-metric (+ .adm-metric--accent)',
    used: 'Admin utils · denser at-a-glance rows where a full filter tile is too heavy',
    note: 'Read-only metric strip — icon + label, numeral, caption. Not clickable and not a filter. Accent marks the primary figure in the row.',
    noteIcon: 'speed',
    demo: `
      <div class="adm-metrics" style="width:100%">
        <div class="adm-metric adm-metric--accent">
          <span class="adm-metric-top"><span class="material-symbols-outlined">verified</span>Verified</span>
          <span class="adm-metric-num">62</span>
          <span class="adm-metric-sub">Ready to publish</span>
        </div>
        <div class="adm-metric">
          <span class="adm-metric-top"><span class="material-symbols-outlined">pending</span>Pending</span>
          <span class="adm-metric-num">41</span>
          <span class="adm-metric-sub">Awaiting review</span>
        </div>
        <div class="adm-metric">
          <span class="adm-metric-top"><span class="material-symbols-outlined">error</span>At risk</span>
          <span class="adm-metric-num">25</span>
          <span class="adm-metric-sub">Needs a fix</span>
        </div>
      </div>`,
  },
  {
    name: 'KPI scorecards',
    ai: false,
    wide: true,
    cls: '.dash-score-card · .dash-score-num · .dash-badge · .dash-score-note',
    used: 'Analytics Types · Overview · Non-UPF Dashboard — the dashboard score band',
    note: 'Dashboard KPI cards: big numeral, status badge, short note. Display-only — no filter, no CTA button. No eyebrows. Count-up animates the numeral on load.',
    noteIcon: 'monitoring',
    demo: `
      <div class="dash-score-band">
        <article class="dash-card dash-score-card">
          <div class="dash-score-top">
            <div class="dash-score-num"><span class="n">62<span class="dash-pct">%</span></span><span class="d">Non-UPF</span></div>
          </div>
          <span class="dash-badge dash-badge--good"><span class="material-symbols-outlined" style="font-size:13px;">check</span>Good</span>
          <p class="dash-score-note"><strong>9 of 12</strong> analyzed products are Non&#8209;UPF.</p>
        </article>
        <article class="dash-card dash-score-card">
          <div class="dash-score-top">
            <div class="dash-score-num"><span class="n">79</span><span class="d">/100</span></div>
          </div>
          <span class="dash-badge dash-badge--good"><span class="material-symbols-outlined" style="font-size:13px;">check</span>Good</span>
          <p class="dash-score-note">Average WISEscore&#8482; across all <strong>discovered products</strong></p>
        </article>
      </div>`,
  },
  {
    name: 'Claim scorecards',
    wide: true,
    cls: '.dash-claim · .dash-claim-col · .dash-bignum · .dash-stamp-icon · .dash-btn-row',
    used: 'Overview · Analytics Types — big-numeral discovery row with a CTA underneath',
    note: 'Two-column claim band: big numeral + caption, then a button row. The faint inset disc at the far right of each score is the same stamped icon Overview uses. Reuses <em>Buttons</em> for the CTA — that stays a separate component. Distinct from KPI cards (no CTA) and filter tiles (no filter).',
    noteIcon: 'featured_play_list',
    demo: `
      <section class="dash-claim dsc-claim-demo">
        <div class="dash-claim-col">
          <div class="dash-bignum-row">
            <span class="dash-bignum">47</span>
            <span class="dash-bignum-cap"><strong>Products Discovered</strong><br>across retail &amp; distribution</span>
            <span class="dash-stamp-icon" aria-hidden="true"><span class="material-symbols-outlined">search</span></span>
          </div>
          <div class="dash-btn-row">
            <button class="dash-btn dash-btn--ghost" type="button"><span class="material-symbols-outlined">verified_user</span>Claim your products</button>
          </div>
        </div>
        <div class="dash-claim-divider"></div>
        <div class="dash-claim-col">
          <div class="dash-bignum-row">
            <span class="dash-bignum">9</span>
            <span class="dash-bignum-cap"><strong>Products Qualify</strong><br>for Non&#8209;UPF verification shield</span>
            <span class="dash-stamp-icon" aria-hidden="true"><span class="material-symbols-outlined">verified</span></span>
          </div>
          <div class="dash-btn-row">
            <button class="dash-btn dash-btn--primary" type="button"><span class="material-symbols-outlined">verified</span>Start Non&#8209;UPF Verification</button>
          </div>
        </div>
      </section>`,
  },

  /* ---- Charts & graphs — live thumbs from the shared catalog -------- */
  {
    name: 'Charts & graphs',
    wide: true,
    cat: 'Charts & graphs',
    cls: '.adm-chart-card · .adm-bars / .adm-bar-fill · .adm-legend · .adm-vrow · .dash-seg / .dash-seg-piece / .dash-seg-tags · .dash-dot (= .dash-donut / .dash-metric-*)',
    used: 'Non-UPF Dashboard · Overview · Analytics Types · Reports — every data-viz surface',
    note: '<strong>Analytics Types</strong> is the visual source of truth. Every chart on that page is a thumbnail here — same sample data, same isolate the Table Gallery uses. Tap a thumbnail to open it full size. Add a chart on that page and one entry in the shared catalog; this card, the Analytics Types accordion, and that page’s rail stay in lock-step. Do not invent a chart look — open that page and mirror it. The written rules live in <code>chart-and-report-design.md</code>. Bars/rings animate on load, replay on tap, and respect <code>prefers-reduced-motion</code>.',
    noteIcon: 'bar_chart',
    demoCustom: () => analyticsThumbGridHTML({ id: 'dsc-az-grid', hideReady: true }),
    download: {
      href: '../assets/chart-and-report-design.md',
      file: 'chart-and-report-design.md',
      label: 'Download chart & report design rules (.md)',
      openLabel: 'Open chart & report design rules (.md)',
      source: {
        href: 'analytics-types.html',
        icon: 'insights',
        label: 'Open Analytics Types — visual source of truth',
      },
    },
  },

  /* ---- Secondary popovers ---------------------------------------- */
  {
    name: 'Menu popover',
    ai: false,
    cls: '.wise-popover · .wise-popover-item (+ .wise-toggle-item, .is-on, .danger, .wise-popover-badge)',
    used: 'Avatar menu · Appearance menu (every page) — the settings/profile popover, distinct from .topbar-popover',
    note: 'The second popover shape: a rounded floating card of full-width rows with a leading icon. Toggle rows show state via the switch glyph, not a row highlight. Anchored & dismissed centrally by <code>js/popover-layer.js</code>.',
    noteIcon: 'menu_open',
    demo: `
      <div class="wise-popover open" data-popover-static style="position:static;max-width:260px">
        <div class="wise-popover-header">Appearance</div>
        <button type="button" class="wise-popover-item wise-toggle-item is-on"><span class="material-symbols-outlined wise-toggle-ico">toggle_on</span><span>Dark theme</span></button>
        <button type="button" class="wise-popover-item"><span class="material-symbols-outlined">text_fields</span><span>Text size</span></button>
        <div class="wise-popover-divider"></div>
        <a class="wise-popover-item" href="#" onclick="return false"><span class="material-symbols-outlined">accessibility_new</span><span>Accessibility review</span><span class="wise-popover-badge">Admin</span></a>
        <button type="button" class="wise-popover-item danger"><span class="material-symbols-outlined">logout</span><span>Sign out</span></button>
      </div>`,
  },
  {
    name: 'Row action menu',
    ai: false,
    cls: '.adm-rowmenu · .adm-rowmenu-btn · .adm-rowmenu-pop · .adm-rowmenu-item (+ --primary, --danger, .is-open)',
    used: 'Every table row kebab — Organizations, User Management, Audit Queue, Portfolio (.pf-rowmenu)',
    note: 'The per-row ⋯ menu that collapses row actions into a popover. States: Default (closed), Open (<code>.is-open</code>). Portalled floating variant (<code>.adm-menu</code>) is used when a row menu would clip inside the table card.',
    noteIcon: 'more_vert',
    demo: `
      <div class="dsc-states" style="width:100%">
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Default (closed)</div>
          <div class="adm-rowmenu" style="position:relative">
            <button type="button" class="adm-rowmenu-btn" aria-label="Row actions" aria-expanded="false"><span class="material-symbols-outlined">more_vert</span></button>
          </div>
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Hover</div>
          <div class="adm-rowmenu" style="position:relative">
            <button type="button" class="adm-rowmenu-btn is-hover" aria-label="Row actions"><span class="material-symbols-outlined">more_vert</span></button>
          </div>
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Open</div>
          <div class="adm-rowmenu is-open" style="position:relative">
            <button type="button" class="adm-rowmenu-btn" aria-label="Row actions" aria-expanded="true"><span class="material-symbols-outlined">more_vert</span></button>
            <div class="adm-rowmenu-pop" data-popover-static style="position:static;margin-top:8px">
              <button type="button" class="adm-rowmenu-item adm-rowmenu-item--primary"><span class="material-symbols-outlined">visibility</span>View details</button>
              <button type="button" class="adm-rowmenu-item"><span class="material-symbols-outlined">edit</span>Edit</button>
              <button type="button" class="adm-rowmenu-item adm-rowmenu-item--danger"><span class="material-symbols-outlined">delete</span>Remove</button>
            </div>
          </div>
        </div>
      </div>`,
  },

  /* ---- Status chips (domain + token pills, one catalog card) ----- */
  {
    name: 'Status chips',
    ai: false,
    aliases: ['Status chips (domain)', 'Status pills'],
    cls: '.adm-chip (+ --green/--red/--amber/--blue/--muted/--outline/--canon) · .ds-pill',
    used: 'Admin table cells · Organizations · User Management · Audit Queue · Portfolio table · Verification & GRAS statuses · Invoices',
    note: 'One status family. <strong>Domain</strong> (<code>.adm-chip</code>) is the live table and card chip — color from tokens (<code>--sec-*</code>, <code>--ter-*</code>) so light/dark and status semantics stay consistent. <strong>Token pills</strong> (<code>.ds-pill</code>) are the same Verified / Pending / Failed pattern built straight off the semantic fills.',
    noteIcon: 'label',
    demo: `
      <div class="dsc-states" style="width:100%">
        <div class="dsc-state-col" style="flex:1 1 100%">
          <div class="dsc-sub-label">Domain · .adm-chip</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            <span class="adm-chip adm-chip--green"><span class="material-symbols-outlined">verified</span>Verified</span>
            <span class="adm-chip adm-chip--amber"><span class="material-symbols-outlined">pending</span>Pending</span>
            <span class="adm-chip adm-chip--red"><span class="material-symbols-outlined">error</span>At risk</span>
            <span class="adm-chip adm-chip--blue"><span class="material-symbols-outlined">bolt</span>Active</span>
            <span class="adm-chip adm-chip--muted">Draft</span>
            <span class="adm-chip adm-chip--outline">Archived</span>
          </div>
        </div>
        <div class="dsc-state-col" style="flex:1 1 100%">
          <div class="dsc-sub-label">Token pills · .ds-pill</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            <span class="ds-pill" style="background:var(--sec-green-10);color:var(--sec-green-text)"><span class="material-symbols-outlined">verified</span>Verified</span>
            <span class="ds-pill" style="background:var(--ter-amber-10);color:var(--ter-amber-text)"><span class="material-symbols-outlined">pending</span>Pending</span>
            <span class="ds-pill" style="background:var(--sec-red-10);color:var(--sec-red-text)"><span class="material-symbols-outlined">error</span>Failed</span>
          </div>
        </div>
      </div>`,
  },

  /* ---- Form fields ----------------------------------------------- */
  {
    name: 'Form fields',
    cls: '.adm-field · .adm-field-label · .adm-input · .adm-select (auth surfaces mirror it with .auth-field / .auth-input)',
    used: 'Auth (sign in / sign up) · Filter popovers · Quick Invite · Admin Utils · Audit Queue filter card · admin modals',
    note: 'Inputs and selects are <strong>pill-shaped</strong> (<code>border-radius: var(--radius-pill)</code>) — never rounded-square. They share one 42px height, token surfaces, and the same focus ring across every form, matching the auth inputs. Fields stack in a fluid grid that collapses to one column on narrow containers.',
    noteIcon: 'edit_note',
    demo: `
      <div style="display:flex;flex-direction:column;gap:12px;width:100%;max-width:340px">
        <div class="adm-field"><span class="adm-field-label">Email address</span><input class="adm-input" type="email" placeholder="you@company.com" /></div>
        <div class="adm-field"><span class="adm-field-label">Password</span>
          <div style="position:relative;display:flex;align-items:center">
            <input class="adm-input" type="password" value="supersecret" style="width:100%;padding-right:44px" aria-label="Password" />
            <button type="button" aria-label="Show password" style="position:absolute;right:14px;display:inline-flex;align-items:center;justify-content:center;border:0;background:transparent;color:var(--text-muted);cursor:pointer;padding:0"><span class="material-symbols-outlined" style="font-size:20px">visibility</span></button>
          </div>
        </div>
        <div class="adm-field"><span class="adm-field-label">Role</span><select class="adm-select"><option>Admin</option><option>Editor</option><option>Viewer</option></select></div>
      </div>`,
  },

  /* ---- Admin buttons (parallel button system) -------------------- */
  {
    name: 'Admin buttons',
    ai: false,
    cls: '.adm-btn (+ --primary/--ghost/--danger/--good/--sm) · .adm-icon-btn',
    used: 'Admin module headers & rows · Invoices (.inv-btn mirror) — the pill button set beside the app .dash-btn',
    note: 'The admin/list surfaces use this pill button family; content surfaces use <code>.dash-btn</code>. Same tokens, two shapes — pick by surface. States shown: Default, Hover, Disabled.',
    noteIcon: 'smart_button',
    demo: `
      <div class="dsc-states" style="width:100%">
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Default</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
            <button type="button" class="adm-btn adm-btn--primary"><span class="material-symbols-outlined">add</span>New</button>
            <button type="button" class="adm-btn adm-btn--ghost">Cancel</button>
            <button type="button" class="adm-btn adm-btn--good"><span class="material-symbols-outlined">check</span>Approve</button>
            <button type="button" class="adm-btn adm-btn--danger"><span class="material-symbols-outlined">delete</span>Delete</button>
            <button type="button" class="adm-icon-btn" aria-label="More"><span class="material-symbols-outlined">more_horiz</span></button>
          </div>
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Hover</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
            <button type="button" class="adm-btn adm-btn--primary is-hover"><span class="material-symbols-outlined">add</span>New</button>
            <button type="button" class="adm-btn adm-btn--ghost is-hover">Cancel</button>
            <button type="button" class="adm-btn adm-btn--good is-hover"><span class="material-symbols-outlined">check</span>Approve</button>
            <button type="button" class="adm-btn adm-btn--danger is-hover"><span class="material-symbols-outlined">delete</span>Delete</button>
            <button type="button" class="adm-icon-btn is-hover" aria-label="More"><span class="material-symbols-outlined">more_horiz</span></button>
          </div>
        </div>
        <div class="dsc-state-col">
          <div class="dsc-sub-label">Disabled</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
            <button type="button" class="adm-btn adm-btn--primary" disabled><span class="material-symbols-outlined">add</span>New</button>
            <button type="button" class="adm-btn adm-btn--ghost" disabled>Cancel</button>
            <button type="button" class="adm-btn adm-btn--good" disabled><span class="material-symbols-outlined">check</span>Approve</button>
            <button type="button" class="adm-btn adm-btn--danger" disabled><span class="material-symbols-outlined">delete</span>Delete</button>
            <button type="button" class="adm-icon-btn" disabled aria-label="More"><span class="material-symbols-outlined">more_horiz</span></button>
          </div>
        </div>
      </div>`,
  },

  /* ---- Modal / dialog -------------------------------------------- */
  {
    name: 'Modal dialog',
    ai: false,
    wide: true,
    cls: '.adm-modal-scrim · .adm-modal · .adm-modal-head / -body · .adm-modal-eyebrow / -title / -sub',
    used: 'Admin CRUD flows — create / edit / duplicate / confirm across Organizations, User Management, Admin Utils',
    note: 'One centered dialog shell with a scrim, eyebrow + serif title + sub, a body of shared form fields, and a footer of <code>.adm-btn</code>s. Caps at 520px and shrinks to fit small screens.',
    noteIcon: 'web_asset',
    demo: `
      <div class="adm-modal" data-modal-static style="max-width:420px;width:100%">
        <button type="button" class="adm-modal-x" aria-label="Close"><span class="material-symbols-outlined">close</span></button>
        <div class="adm-modal-head">
          <div class="adm-modal-eyebrow">New organization</div>
          <h3 class="adm-modal-title">Add an organization</h3>
          <p class="adm-modal-sub">Create a workspace and invite its first admin.</p>
        </div>
        <div class="adm-modal-body">
          <div class="adm-field"><span class="adm-field-label">Name</span><input class="adm-input" placeholder="Acme Foods" /></div>
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px">
            <button type="button" class="adm-btn adm-btn--ghost">Cancel</button>
            <button type="button" class="adm-btn adm-btn--primary">Create</button>
          </div>
        </div>
      </div>`,
  },

  /* ---- Pagination footer ----------------------------------------- */
  {
    name: 'Pagination footer',
    cls: '.wtp-foot · .wtp-count · .wtp-more (js/table-pagination.js, injected app-wide)',
    used: 'Foot of every long list — admin tables, Invoices, Portfolio, Ingredient Browser',
    note: 'The shared count + "Load more" footer that <code>table-pagination.js</code> injects under any long table. Clips rows past a threshold and reveals them in batches — one behavior for every list.',
    noteIcon: 'expand_more',
    demo: `
      <div class="adm-card" style="width:100%">
        <div class="wtp-foot">
          <span class="wtp-count">Showing <b>25</b> of <b>128</b> organizations</span>
          <button type="button" class="wtp-more">Load more<span class="material-symbols-outlined">expand_more</span></button>
        </div>
      </div>`,
  },

  /* ---- Notifications ---------------------------------------------- */
  {
    name: 'Notification rows',
    ai: false,
    cls: '.notif-row · .notif-row-icon (.notif-ic-red/-amber/-green/-blue) · .notif-row-title / -sub · .notif-view-all',
    used: 'Alerts / notifications popout from the top-bar bell (every page, via the agent shell)',
    note: 'The alerts feed: a colored status icon + title + timestamp per row, capped by a "View all" pill. Icon tone comes from the same status tokens as chips and pills.',
    noteIcon: 'notifications',
    demo: `
      <div class="adm-card" style="width:100%;max-width:340px;padding:6px 0 8px">
        <button type="button" class="notif-row"><span class="notif-row-icon notif-ic-red"><span class="material-symbols-outlined">error</span></span><span class="notif-row-body"><span class="notif-row-title">3 products need verification</span><span class="notif-row-sub">Portfolio · 12m ago</span></span></button>
        <button type="button" class="notif-row"><span class="notif-row-icon notif-ic-green"><span class="material-symbols-outlined">verified</span></span><span class="notif-row-body"><span class="notif-row-title">Acme Foods passed GRAS review</span><span class="notif-row-sub">Verification · 1h ago</span></span></button>
        <button type="button" class="notif-row"><span class="notif-row-icon notif-ic-blue"><span class="material-symbols-outlined">person_add</span></span><span class="notif-row-body"><span class="notif-row-title">Jordan Rivera accepted your invite</span><span class="notif-row-sub">Team · 3h ago</span></span></button>
        <div style="padding:8px 8px 2px"><button type="button" class="notif-view-all"><span class="material-symbols-outlined">inbox</span>View all alerts</button></div>
      </div>`,
  },

  /* ---- Bottom sheet / drawer ------------------------------------- */
  {
    name: 'Bottom sheet',
    ai: false,
    status: 'not-now',
    wide: true,
    cls: '.ag-sheet-scrim · .ag-sheet · .ag-sheet-handle / -head / -icon / -titles / -body · .ag-detail-row · .agent-cta',
    used: 'Locked / upsell nav items and agent flows (agent shell, js/agent-overview.js)',
    note: 'The mobile-friendly drawer that rises from the bottom for a focused sub-task (details, upsell, confirm) instead of a full modal. Rounded top, grab handle, scrollable body, action row.',
    noteIcon: 'dock_to_bottom',
    demo: `
      <div class="ag-sheet is-open" data-sheet-static style="position:relative;left:auto;bottom:auto;transform:none;width:100%;max-width:420px;box-shadow:var(--shadow-2)">
        <div class="ag-sheet-handle"></div>
        <div class="ag-sheet-head">
          <span class="ag-sheet-icon"><span class="material-symbols-outlined">workspace_premium</span></span>
          <div class="ag-sheet-titles">
            <div class="ag-sheet-eyebrow">Upgrade</div>
            <div class="ag-sheet-title">Reports is a Pro module</div>
          </div>
          <button type="button" class="ag-sheet-close" aria-label="Close"><span class="material-symbols-outlined">close</span></button>
        </div>
        <div class="ag-sheet-body">
          <p class="ag-sheet-lead">Unlock scheduled exports, shareable links, and the full Guiding Stars report.</p>
          <div class="ag-sheet-actions">
            <button type="button" class="adm-btn adm-btn--primary"><span class="material-symbols-outlined">bolt</span>Upgrade to Pro</button>
            <button type="button" class="adm-btn adm-btn--ghost">Maybe later</button>
          </div>
        </div>
      </div>`,
  },

  /* ---- Tooltip ---------------------------------------------------- */
  {
    name: 'Tooltip',
    wide: true,
    cls: '#lir-tooltip / .lir-tip-visible (js/lir-tooltip.js) · .dash-status-tip · chip explainer .ct-card (js/chip-tooltip.js)',
    used: 'Every icon-only control (Appearance, width toggle, panel docks) · dashboard score terms · data chips app-wide',
    note: 'One tooltip for every icon-only control. It sits below the icon by default and shifts inward at the left or right edge of its container so the card never clips. Appearance and studio tools sit above; if there is no room they flip to the right. Data chips open a richer explainer on click. The button states themselves live on <em>Buttons</em>.',
    noteIcon: 'chat_bubble',
    demo: `
      <div class="dsc-tip-stage" aria-label="Tooltip landing at container edges">
        <div class="dsc-tip-pin dsc-tip-pin--left">
          <div class="dsc-sub-label">Left edge</div>
          <div class="dsc-tip-anchor dsc-tip-anchor--left">
            <button type="button" class="lir-btn" aria-label="Appearance" tabindex="-1"><span class="material-symbols-outlined">crossword</span></button>
            <span class="dsc-tip">Appearance</span>
          </div>
        </div>
        <div class="dsc-tip-pin dsc-tip-pin--center">
          <div class="dsc-sub-label">Center</div>
          <div class="dsc-tip-anchor dsc-tip-anchor--center">
            <button type="button" class="panel-width-toggle-btn is-on is-width-fill" aria-label="Module width, fill" tabindex="-1"><span class="material-symbols-outlined">width_full</span></button>
            <span class="dsc-tip">Width (fill)</span>
          </div>
        </div>
        <div class="dsc-tip-pin dsc-tip-pin--right">
          <div class="dsc-sub-label">Right edge</div>
          <div class="dsc-tip-anchor dsc-tip-anchor--right">
            <button type="button" class="panel-ctrl-btn" aria-label="Help" tabindex="-1"><span class="material-symbols-outlined">help</span></button>
            <span class="dsc-tip">Help</span>
          </div>
        </div>
      </div>`,
  },

  /* ---- Avatars ---------------------------------------------------- */
  {
    name: 'Avatars',
    wide: true,
    cls: '.adm-avatar (+ --photo) · .topbar-profile (+ .has-dot unread, .is-hover, .is-open) · .sc-avatar-you · .pf-avatar-upload · .pf-avatar-preset · .wise-popover',
    used: 'Top bar on every app page · nav-footer avatar menu · Organization Profile (Avatar picture) · table identity cells · chat “you” chip',
    note: 'One circle primitive everywhere — initials until a picture is set, then the same chip fills with the photo. The top-bar button cycles Default, Hover, Open, and Unread. The avatar popover is the live account menu (My profile, Invoices, Marketing Assets, Sign out). Organization Profile owns the abilities: live preview, Browse File / Import from URL, Remove, and every built-in pattern and portrait (Aurora, Prism, Orbit, Tide, Bloom, plus the two professional photos).',
    noteIcon: 'account_circle',
    demo: demoAvatarCatalog(),
  },

  /* ---- History / Library / Reports — missing from the first pass ---- */
  {
    name: 'History',
    wide: true,
    cls: '.wch-item · .wch-chat-dot · .wch-item-actions · .wch-project · .wch-proj-toggle · .wch-loose · .wch-info',
    used: 'WISEcodeAI History module on every chat · Conversation Library folder panel (same row language)',
    note: 'One list: colored <strong>folder</strong> projects with a tick tree, and conversation rows that are a color dot + title. Timestamp and message count live on the hover card, not the row. Hover reveals drag, rename, move, and delete. Nested folders use the same tree as the Conversation Library. Ungrouped threads sit in <strong>All conversations</strong> — drop a row on a project to file it, or back here to unfile.',
    noteIcon: 'history',
    demo: demoHistoryCatalog(),
  },
  {
    name: 'Library cards',
    wide: true,
    cls: '.lib-card · .lib-thumb · .lib-cname · .lib-thumb-badge',
    used: 'WISEcodeAI Library (conversation-library.html) — every saved report, dashboard, chat, and reference',
    note: 'The Library shelf card: a preview thumb (chart mock, chat bubbles, or report art), a type badge, a serif-adjacent title, and a date/count footer. Cards are draggable — drop on a folder to file, or on another card to found a new folder. Shared items show a “Shared by” line.',
    noteIcon: 'auto_stories',
    demo: `
      <div class="dsc-lib-grid">
        <a class="lib-card" href="#" onclick="return false">
          <div class="lib-thumb pad">
            <span class="lib-thumb-badge"><span class="material-symbols-outlined">bar_chart</span>Dashboard</span>
            <div class="lib-bars"><i class="g" style="height:38%"></i><i class="g" style="height:64%"></i><i class="b" style="height:88%"></i><i class="g" style="height:52%"></i><i class="b" style="height:30%"></i><i class="g" style="height:70%"></i></div>
          </div>
          <div class="lib-cbody">
            <div class="lib-cname">Foods one point from moderately processed</div>
            <div class="lib-cfoot"><span class="lib-date">Aug 10, 2026</span></div>
          </div>
        </a>
        <a class="lib-card" href="#" onclick="return false">
          <div class="lib-thumb pad">
            <div class="lib-chatprev">
              <div class="lib-bubble me lib-clip">Compare oat milk and almond milk on UPF.</div>
              <div class="lib-bubble ai lib-clip">Oat milk scores higher on processing; almond milk wins on additives…</div>
            </div>
          </div>
          <div class="lib-cbody">
            <div class="lib-cname">Compare oat milk vs almond milk</div>
            <div class="lib-cfoot">
              <span class="lib-counts"><span class="lib-count"><span class="material-symbols-outlined">chat_bubble</span>12</span></span>
              <span class="lib-date">Aug 10, 2026</span>
            </div>
          </div>
        </a>
        <a class="lib-card" href="#" onclick="return false">
          <div class="lib-thumb pad">
            <span class="lib-thumb-badge"><span class="material-symbols-outlined">description</span>Report</span>
            <div class="lib-bars"><i class="p" style="height:70%"></i><i class="g" style="height:44%"></i><i class="b" style="height:58%"></i><i class="p" style="height:32%"></i><i class="g" style="height:80%"></i></div>
          </div>
          <div class="lib-cbody">
            <div class="lib-cname">Portfolio UPF</div>
            <div class="lib-shared">Shared by ereyes@wisecode.ai</div>
            <div class="lib-cfoot"><span class="lib-date">Aug 6, 2026</span></div>
          </div>
        </a>
      </div>`,
  },
  {
    name: 'Library folders',
    wide: true,
    cls: '.lib-fstat · .lib-fstat-add · .lib-fstat-unfile · .lib-folder-swatch · .lib-fdot',
    used: 'WISEcodeAI Library — folder row under the type/scope scorecards',
    note: 'A folder is a scorecard dressed as a manila file: colored tab, count, and name. Click opens it. Hover ⋯ for Rename / New subfolder / Move into folder / Ungroup. Folders nest — drop a folder onto the centre of another to put it inside; left/right edges reorder siblings. <strong>New folder</strong> (or New subfolder, once you are inside) is the dashed tile on the left. Artifacts <strong>copy</strong> or <strong>link</strong> into any folder from the card ⋯ menu or from the drop chooser (Option copies, ⌘ links). <strong>Remove from folder</strong> only appears while a filed card is dragging. Dropping one library card on another founds a folder — see Motion &amp; Resize.',
    noteIcon: 'folder',
    demo: `
      <div class="dsc-lib-folders">
        <button type="button" class="lib-stat lib-fstat lib-fstat-add" title="New folder" aria-label="New folder">
          <span class="material-symbols-outlined">create_new_folder</span>
          <span class="lib-stat-label">New folder</span>
        </button>
        <button type="button" class="lib-stat lib-fstat is-active" data-folder-id="demo-q3" style="--lib-folder-color:#25507C" aria-pressed="true">
          <span class="lib-stat-num">3</span>
          <span class="lib-stat-label"><span class="lib-fdot"></span><span class="lib-fstat-name">Q3 verification</span></span>
        </button>
        <button type="button" class="lib-stat lib-fstat" data-folder-id="demo-rep" style="--lib-folder-color:#32A966">
          <span class="lib-stat-num">5</span>
          <span class="lib-stat-label"><span class="lib-fdot"></span><span class="lib-fstat-name">Reports</span></span>
        </button>
        <div class="lib-stat lib-fstat is-editing" style="--lib-folder-color:#D27326">
          <div class="lib-fstat-edit">
            <input type="text" class="lib-folder-edit-input" maxlength="60" placeholder="Folder name…" value="Reformulation">
            <div class="lib-folder-swatches">
              <button type="button" class="lib-folder-swatch is-sel" style="color:#25507C" aria-label="Navy"></button>
              <button type="button" class="lib-folder-swatch" style="color:#32A966" aria-label="Green"></button>
              <button type="button" class="lib-folder-swatch" style="color:#D27326" aria-label="Amber"></button>
              <button type="button" class="lib-folder-swatch" style="color:#DC3038" aria-label="Red"></button>
            </div>
          </div>
        </div>
        <div class="lib-stat lib-fstat lib-fstat-unfile dsc-lib-unfile-show" aria-label="Remove from folder">
          <span class="material-symbols-outlined">folder_off</span>
          <span class="lib-stat-label">Remove from folder</span>
        </div>
      </div>`,
  },
  {
    name: 'Report builder',
    wide: true,
    cat: 'Library & reports',
    cls: '#wa-report \u00b7 .wa-titledrop-plus \u00b7 .wa-rpt-item \u00b7 .wa-rpt-foot \u00b7 #rf-report',
    used: 'WISEcodeAI Chat (wiseai.html#report) \u00b7 Reformulation Studio \u00b7 Reports',
    note: 'How a conversation becomes a report. In Output, open the title dropdown and plus the charts you want \u2014 the plus survives closing the menu. <strong>Generate Report</strong> clones those painted outputs into a nested sticky drawer on Output\u2019s right (z-index 0, shorter, never fill). Click the report name or any chart title to rename; each chart has an annotation field and a \u22ef for Rename, Swap output (any other chart from this thread), and Delete. The default name is the pick count (\u201cTwo Outputs\u201d) until you name it. <strong>Save or Share Report</strong> writes the capped generated-reports store and opens Share inside the drawer; \u22ef Export as PDF prints the pane. Saved reports land on the Reports shelf as <em>Report posters</em>; filed into the Library they become <em>Library cards</em>. Reformulation uses the same drawer, plusing section titles instead of Output rows.',
    noteIcon: 'description',
    demo: demoReportBuilderHTML(),
  },
  {
    name: 'Report posters',
    ai: false,
    wide: true,
    cls: '.rp-card · .rp-poster · .rp-name · .rp-badge · .rp-view (+ .is-locked)',
    used: 'Reports (reports.html) — the studio shelf of standardized reports',
    note: 'Reports read as a shelf of posters: cinematic header (genre tone + icon, no plate behind the glyph), serif title, short desc, and a View Report affordance. Live cards glow in their genre color; locked ones sit greyed with a lock badge. A report assembled in the <em>Report builder</em> lands here first; filed into the Library it becomes a <em>Library card</em>.',
    noteIcon: 'description',
    demo: `
      <div class="dsc-rp-row">
        <a class="rp-card" href="#" onclick="return false">
          <div class="rp-poster tone-action">
            <span class="rp-poster-icon"><span class="material-symbols-outlined">star</span></span>
            <span class="rp-badge"><span class="material-symbols-outlined">bolt</span>Action Plan</span>
            <span class="rp-poster-open"><span class="material-symbols-outlined">north_east</span></span>
          </div>
          <div class="rp-body">
            <div class="rp-name">Guiding Stars Action Plan</div>
            <p class="rp-desc">Your prioritized path to more stars — quick wins, near-misses, and the competitive gap.</p>
            <div class="rp-foot"><span class="rp-view">View Report<span class="material-symbols-outlined">north_east</span></span></div>
          </div>
        </a>
        <a class="rp-card" href="#" onclick="return false">
          <div class="rp-poster tone-upf">
            <span class="rp-poster-icon"><span class="material-symbols-outlined">description</span></span>
            <span class="rp-badge">Portfolio</span>
            <span class="rp-poster-open"><span class="material-symbols-outlined">north_east</span></span>
          </div>
          <div class="rp-body">
            <div class="rp-name">Portfolio UPF</div>
            <p class="rp-desc">Ultra-processed food classification across every product in your portfolio.</p>
            <div class="rp-foot"><span class="rp-view">View Report<span class="material-symbols-outlined">north_east</span></span></div>
          </div>
        </a>
        <div class="rp-card is-locked">
          <div class="rp-poster tone-locked">
            <span class="rp-poster-icon"><span class="material-symbols-outlined">verified_user</span></span>
            <span class="rp-badge"><span class="material-symbols-outlined">lock</span>Portfolio</span>
          </div>
          <div class="rp-body">
            <div class="rp-name">Portfolio GRAS</div>
            <p class="rp-desc">Generally-recognized-as-safe assessment across your portfolio.</p>
            <div class="rp-foot"><span class="rp-waitlist"><span class="material-symbols-outlined">lock</span>Coming soon</span></div>
          </div>
        </div>
      </div>`,
  },
];

/* Catalog accordion is A–Z by title. New cards can append above; this
   sort is what the grid, search index, and Dev Ready children all read.
   Decorative glyphs (⋯ ·) are spaces so "Chat ⋯ menu" sorts with Chat*. */
function catalogNameKey(name) {
  return String(name || '').replace(/[\u22ef\u00b7\u2022\u2026]/g, ' ').replace(/\s+/g, ' ').trim();
}
COMPONENTS.sort((a, b) => catalogNameKey(a.name).localeCompare(catalogNameKey(b.name), 'en', {
  sensitivity: 'base',
  ignorePunctuation: true,
}));

/* ------------------------------------------------------------------ */
/* Composition graph — which library cards are built from which.       */
/*                                                                     */
/* Each component's demo is the source of truth: if it renders another */
/* component's signature class, that other card is a part. Toggles and */
/* jump links on "Made of" rows share the same Dev Ready id as the     */
/* part's own card, so flipping one flips every copy. Where the        */
/* control appears in the product is "Used in", not a second catalog   */
/* list.                                                               */
/* ------------------------------------------------------------------ */

function classesInHtml(html) {
  const set = new Set();
  const re = /class\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(String(html || '')))) {
    String(m[1]).split(/\s+/).forEach((tok) => { if (tok) set.add(tok); });
  }
  return set;
}

function classTokensFromCls(cls) {
  return (String(cls || '').match(/\.[a-z][a-z0-9_-]+/gi) || []).map((s) => s.slice(1));
}

function compSignature(c) {
  const toks = classTokensFromCls(c && c.cls);
  if (toks.length) return toks[0];
  for (const name of classesInHtml(c && c.demo)) {
    if (name !== 'material-symbols-outlined' && !/^(is-|has-)/.test(name)) return name;
  }
  return '';
}

function demoHasSignature(demo, sig) {
  if (!sig) return false;
  /* Require the base class token itself. A shared modifier like
     adm-stat--red on .adm-vf-stat must not count as "made of Filter tiles". */
  return classesInHtml(demo).has(sig);
}

let COMP_GRAPH = null;

function buildCompGraph() {
  const sigs = COMPONENTS.map((c) => ({ c, sig: compSignature(c) }));
  const parts = new Map();
  COMPONENTS.forEach((c) => {
    const found = sigs.filter((o) => o.c.name !== c.name && demoHasSignature(c.demo, o.sig)).map((o) => o.c);
    parts.set(c.name, found);
  });
  COMP_GRAPH = { parts };
}

function partsOf(name) {
  if (!COMP_GRAPH) buildCompGraph();
  return COMP_GRAPH.parts.get(name) || [];
}

/* Directory modules named in a component's "Used in" prose.
   Same resolver the Module Directory inverts — keep the two lists twins. */
function modulesForUsed(used) {
  const flat = dirModulesFlat();
  const seen = new Set();
  const out = [];
  const add = (m) => {
    if (!m || seen.has(m.href)) return;
    seen.add(m.href);
    out.push(m);
  };
  hrefsForUsed(used).forEach((h) => {
    const href = String(h);
    const file = href.split('#')[0];
    const hashed = href.indexOf('#') !== -1;
    if (hashed) {
      add(flat.find((m) => m.href === href));
      return;
    }
    const matches = flat.filter((m) => m.href === href || String(m.href).split('#')[0] === file);
    if (matches.length) matches.forEach(add);
    else add(flat.find((m) => String(m.href).split('#')[0] === file));
  });
  String(used || '').split(/[·•]/).forEach((raw) => {
    const p = raw.replace(/\([^)]*\)/g, '').replace(/—.*$/, '').trim().toLowerCase();
    if (p.length < 3) return;
    const exact = flat.find((m) => m.label.toLowerCase() === p);
    if (exact) add(exact);
  });
  const order = new Map(flat.map((m, i) => [m.href, i]));
  out.sort((a, b) => (order.get(a.href) ?? 999) - (order.get(b.href) ?? 999));
  return out;
}

/* First live CSS selectors from a catalog card — class / id tokens only,
   skipping modifier fragments (“--primary”) and overly generic singles. */
const USED_GENERIC_SEL = new Set(['.chip', '.btn', '.card', '.icon']);

function compLiveSels(comp) {
  if (comp && comp.liveSel) return [String(comp.liveSel)];
  const raw = String((comp && comp.cls) || '');
  const found = raw.match(/#[A-Za-z][\w-]+|\.[A-Za-z_][\w-]{2,}/g) || [];
  const seen = new Set();
  const out = [];
  found.forEach((s) => {
    if (seen.has(s)) return;
    seen.add(s);
    out.push(s);
  });
  const preferred = out.filter((s) => !USED_GENERIC_SEL.has(s));
  return (preferred.length ? preferred : out).slice(0, 6);
}

function hrefWithHighlight(href, params) {
  const raw = String(href || '');
  const hashIdx = raw.indexOf('#');
  const hash = hashIdx >= 0 ? raw.slice(hashIdx) : '';
  const base = hashIdx >= 0 ? raw.slice(0, hashIdx) : raw;
  const qIdx = base.indexOf('?');
  const path = qIdx >= 0 ? base.slice(0, qIdx) : base;
  const existing = qIdx >= 0 ? base.slice(qIdx + 1) : '';
  const usp = new URLSearchParams(existing);
  Object.keys(params || {}).forEach((k) => {
    const v = params[k];
    if (v == null || v === '') return;
    usp.set(k, v);
  });
  const qs = usp.toString();
  return path + (qs ? '?' + qs : '') + hash;
}

function usedSurfacesHTML(used, comp) {
  const mods = modulesForUsed(used);
  if (!mods.length) {
    return `<div class="dsc-used"><span class="dsc-used-label">Used in</span><span class="dsc-used-list">${esc(used)}</span></div>`;
  }
  const sels = compLiveSels(comp);
  const links = mods.map((m) => {
    const href = hrefWithHighlight(m.href, {
      'wise-hl': sels.join(','),
      'wise-comp': (comp && comp.name) || '',
    });
    return `<a class="dsc-used-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(m.label)}</a>`;
  }).join('');
  return `<div class="dsc-used"><span class="dsc-used-label">Used in</span><span class="dsc-used-list dsc-used-list--links">${links}</span></div>`;
}

/* ------------------------------------------------------------------ */
/* Invert COMPONENTS.used → modules in the directory rail.             */
/*                                                                     */
/* Each component already names the surfaces it appears on. The rail   */
/* turns that prose into a per-module list, with the same Dev Ready    */
/* toggle id as the Component Library card so the two stay in sync.    */
/* ------------------------------------------------------------------ */

const APP_DIR_TONES = new Set(['workspace', 'portfolio', 'ai', 'reform', 'report', 'verify', 'org', 'admin', 'account']);

function compDomId(name) {
  return 'dsc-comp-' + String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function dirModulesFlat() {
  const out = [];
  dedupedDirSections().forEach((s) => {
    s.modules.forEach((m) => out.push({ ...m, area: s.tone, areaTitle: s.title }));
  });
  return out;
}

function appDirHrefs() {
  return dirModulesFlat().filter((m) => APP_DIR_TONES.has(m.area)).map((m) => m.href);
}

/* Phrase → catalog hrefs, derived from the actual COMPONENTS.used strings
   (not a parallel inventory). Longer / more specific phrases first. */
const USED_HREF_RULES = [
  { re: /non-upf dashboard/, hrefs: ['non-upf-dashboard.html'] },
  { re: /product portfolio/, hrefs: ['product-portfolio.html'] },
  { re: /conversation library|wisecodeai library/, hrefs: ['conversation-library.html'] },
  { re: /guiding stars/, hrefs: ['report-guiding-stars.html'] },
  { re: /analytics types/, hrefs: ['analytics-types.html'] },
  { re: /ingredient browser/, hrefs: ['ingredient-browser.html'] },
  { re: /ai dashboard/, hrefs: ['ai-dashboard.html'] },
  { re: /studio\s*&\s*ai|studio&ai/, hrefs: ['studio-ai.html'] },
  { re: /add catalog/, hrefs: ['add-catalog.html'] },
  { re: /add product/, hrefs: ['add-product.html'] },
  { re: /quick invite/, hrefs: ['quick-invite.html'] },
  { re: /\bteams\.html\b|\bteam module\b/, hrefs: ['teams.html'] },
  { re: /user management/, hrefs: ['user-management.html'] },
  { re: /audit queue/, hrefs: ['audit-queue.html'] },
  { re: /admin utils/, hrefs: ['admin-utils.html'] },
  { re: /\borganizations\b/, hrefs: ['organizations.html'] },
  { re: /\binvoices\b/, hrefs: ['invoices.html'] },
  { re: /\bcomparison\b/, hrefs: ['product-comparison.html'] },
  { re: /\boverview\b/, hrefs: ['overview.html'] },
  { re: /report builder|wiseai\.html#report/, hrefs: ['wiseai.html#report'] },
  { re: /reports\.html|\breports\b/, hrefs: ['reports.html'] },
  { re: /\bverification\b/, hrefs: ['verification.html', 'gras-verification.html'] },
  { re: /\bgras\b/, hrefs: ['gras-verification.html', 'verification.html'] },
  { re: /\breformulation\b/, hrefs: ['reformulation.html', 'reformulation.html#dashboard'] },
  { re: /wiseai\.html#history|wisecodeai history/, hrefs: ['wiseai.html#history'] },
  { re: /wiseai\.html#turns|\bturns module\b/, hrefs: ['wiseai.html#turns'] },
  { re: /wiseai\.html#data-sources|data sources/, hrefs: ['wiseai.html#data-sources'] },
  { re: /help or preferences|\bpreferences\b/, hrefs: ['help.html', 'preferences.html'] },
  { re: /add product \u00b7 view product|view product/, hrefs: ['add-product.html', 'view-product.html'] },
  { re: /\bauth\b|sign in|sign up|signup/, hrefs: ['login.html', 'create-account.html', 'forgot-password.html'] },
  { re: /\balerts\b/, hrefs: ['alerts.html'] },
  { re: /marketing assets/, hrefs: ['marketing-assets.html'] },
  { re: /\bmy profile\b|\bprofile\b/, hrefs: ['profile.html'] },
  { re: /\bdocs\b/, hrefs: ['docs.html'] },
  { re: /\bagents\b/, hrefs: ['agents.html'] },
  { re: /api keys/, hrefs: ['api-keys.html'] },
  { re: /accessibility/, hrefs: ['accessibility-review.html'] },
  { re: /progress log/, hrefs: ['progress-log.html'] },
  { re: /\bhelix\b/, hrefs: ['helix.html'] },
  { re: /all modules|this page/, hrefs: ['all-modules.html'] },
  { re: /\bhelp\b/, hrefs: ['help.html'] },
  { re: /portfolio table|\.pf-stats|\.pf-rowmenu|portfolio \(\.pf/, hrefs: ['product-portfolio.html'] },
];

function hrefsForUsed(used) {
  const t = String(used || '').toLowerCase().replace(/[—–]/g, ' ');
  const hrefs = new Set();
  const add = (list) => { (list || []).forEach((h) => hrefs.add(h)); };

  /* Shared chrome on every agent-shell / #modules-row page. */
  if (/\bevery (app )?page\b|\bapp-wide\b|\bevery #modules-row page\b|\bagent shell\b|\bevery module header\b|\bevery module to the right\b/.test(t)) {
    add(appDirHrefs());
  }
  /* Chat lives on every agent page via the WISEcodeAI dock — not only wiseai.html. */
  if (/\bevery chat\b|\bevery wisecodeai\b|\bwisecodeai dock\b|\bstudio chat\b|\bwisecodeai welcome\b|\bin-conversation reply\b|\bevery surface\b|\bchat [⋯\u22ef]\b|\bchat composer\b/.test(t)) {
    add(appDirHrefs());
  }
  USED_HREF_RULES.forEach((rule) => {
    if (rule.re.test(t)) add(rule.hrefs);
  });
  /* "Portfolio" as a listed surface, but not "portfolio composition strips". */
  if (/\bportfolio\b/.test(t.replace(/portfolio composition/g, ''))) {
    add(['product-portfolio.html']);
  }
  return hrefs;
}

let COMPS_BY_MODULE_HREF = null;
let dscRevealAll = null;

function rebuildModuleCompIndex() {
  const map = new Map();
  dirModulesFlat().forEach((m) => { if (!map.has(m.href)) map.set(m.href, []); });
  COMPONENTS.forEach((c) => {
    modulesForUsed(c.used).forEach((m) => {
      const list = map.get(m.href) || [];
      if (!list.some((x) => x.name === c.name)) list.push(c);
      map.set(m.href, list);
    });
  });
  COMPS_BY_MODULE_HREF = map;
}

function componentsUsedByModule(m) {
  if (!COMPS_BY_MODULE_HREF) rebuildModuleCompIndex();
  const href = m && m.href;
  const exact = COMPS_BY_MODULE_HREF.get(href);
  /* Catalogued modules keep the inverted list, even when it is empty
     (marketing / auth often have no shared chrome). Unaccounted pages
     inherit Overview's agent-shell set so the Dev Ready rows still appear. */
  if (Array.isArray(exact) && (exact.length || (m && m.area) !== 'unaccounted')) return exact;
  const file = String(href || '').split('#')[0];
  if (!file) return exact || [];
  const merged = [];
  const seen = new Set();
  COMPS_BY_MODULE_HREF.forEach((list, h) => {
    if (String(h).split('#')[0] !== file) return;
    (list || []).forEach((c) => {
      if (seen.has(c.name)) return;
      seen.add(c.name);
      merged.push(c);
    });
  });
  if (merged.length) return merged;
  return COMPS_BY_MODULE_HREF.get('overview.html') || exact || [];
}

function paneCompsHTML(comps, title, opts) {
  opts = opts || {};
  const n = (comps || []).length;
  if (!n && opts.hideEmpty) return '';
  const head = title || 'Components used';
  const rows = n
    ? comps.map((c) => `
        <li class="mi-pane-comp">
          <a class="mi-pane-comp-link" href="#${esc(compDomId(c.name))}" data-jump-comp="${esc(c.name)}">${esc(c.name)}</a>
          ${opts.hideReady ? '' : readyToggleHTML(c.name, c.name, { level: 'item', parent: 'mi-components', ai: opts.ai !== false && c.ai !== false })}
        </li>`).join('')
    : '<li class="mi-pane-comp mi-pane-comp--empty">No catalogued components</li>';
  return `
    <div class="mi-pane-comps">
      <div class="mi-pane-comps-head">${esc(head)}${n ? ` · ${n}` : ''}</div>
      <ul class="mi-pane-comp-list">${rows}</ul>
    </div>`;
}

/* Persist Dev Ready / AI Ready flags per component name. Each kind has its
   own committed seed so state ships with the code, and localStorage holds
   only the *diff* against that seed. */
const READY_KIND = {
  dev: {
    id: 'dev',
    storageKey: 'wise-dsc-dev-ready',
    seed: DEV_READY_SEED,
    exportName: 'DEV_READY_SEED',
    file: 'js/dev-ready-data.js',
    label: 'WIP Ready',
    titleOn: 'WIP ready',
    markOne: (name) => `Mark ${name} WIP ready`,
    markAll: (name) => `Mark every part in ${name} as WIP Ready`,
    progressTitle: (stats) => stats.total
      ? (stats.ready + ' of ' + stats.total + ' parts WIP ready')
      : 'No parts to mark WIP Ready',
    verifyTitle: (name) => 'Mark all of ' + name + ' WIP Ready?',
    verifyContinue: 'Continuing marks every one WIP Ready.',
    verifyConfirm: (n, name) => 'This turns on WIP Ready for all <strong>' + n
      + '</strong> parts inside ' + name + ' and flips the accordion switch on.',
    confirmLabel: 'Mark all WIP Ready',
  },
  ai: {
    id: 'ai',
    storageKey: 'wise-dsc-ai-ready',
    seed: AI_READY_SEED,
    exportName: 'AI_READY_SEED',
    file: 'js/ai-ready-data.js',
    label: 'AI Ready',
    labelOff: 'Not for AI',
    titleOn: 'AI Ready',
    markOne: (name) => `Mark ${name} ready for AI`,
    markAll: (name) => `Mark every part in ${name} as AI Ready`,
    progressTitle: (stats) => stats.total
      ? (stats.ready + ' of ' + stats.total + ' parts ready for AI')
      : 'No parts to mark AI Ready',
    verifyTitle: (name) => 'Mark all of ' + name + ' AI Ready?',
    verifyContinue: 'Continuing marks every one AI Ready.',
    verifyConfirm: (n, name) => 'This turns on AI Ready for all <strong>' + n
      + '</strong> parts inside ' + name + ' and flips the accordion switch on.',
    confirmLabel: 'Mark all AI Ready',
  },
};

function readySpec(kind) {
  return READY_KIND[kind] || READY_KIND.dev;
}

/* Visible switch caption. AI flips between "Not for AI" (off, the default)
   and "AI Ready" (on). WIP Ready keeps one label in both states. */
function readySwitchText(kind, on) {
  const spec = readySpec(kind);
  if (kind === 'ai') return on ? spec.label : (spec.labelOff || 'Not for AI');
  return spec.label;
}

function readReadyOverrides(kind) {
  try {
    const raw = localStorage.getItem(readySpec(kind).storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

function loadReadyMap(kind) {
  const spec = readySpec(kind);
  const map = {};
  Object.keys(spec.seed).forEach((k) => { if (spec.seed[k] === true) map[k] = true; });
  const overrides = readReadyOverrides(kind);
  Object.keys(overrides).forEach((k) => {
    if (overrides[k] === true) map[k] = true;
    else delete map[k];
  });
  return map;
}

function saveReadyMap(kind, map) {
  const spec = readySpec(kind);
  const overrides = {};
  const keys = new Set([...Object.keys(spec.seed), ...Object.keys(map)]);
  keys.forEach((k) => {
    const on = map[k] === true;
    if (on !== (spec.seed[k] === true)) overrides[k] = on;
  });
  try {
    localStorage.setItem(spec.storageKey, JSON.stringify(overrides));
  } catch (e) { /* quota / private mode — ignore */ }
  persistReadySeed(kind, map);
}

function loadDscReadyMap() { return loadReadyMap('dev'); }
function saveDscReadyMap(map) { saveReadyMap('dev', map); }

function readyIdsFromMap(map) {
  return Object.keys(map).filter((k) => map[k] === true).sort();
}

function persistReadySeed(kind, map, attempt) {
  if (typeof location === 'undefined' || location.protocol === 'file:') return;
  const host = location.hostname;
  if (host !== '127.0.0.1' && host !== 'localhost') return;
  const spec = readySpec(kind);
  const ids = readyIdsFromMap(map || loadReadyMap(kind));
  const tryN = attempt || 0;
  fetch('/__wise/ready', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: spec.id, ids }),
  }).then((res) => {
    if (res.ok) return;
    if (tryN < 4) {
      setTimeout(() => persistReadySeed(kind, map, tryN + 1), 400 * (tryN + 1));
      return;
    }
    console.warn(spec.label + ' seed did not write (' + res.status + '). Restart python3 dev_server.py and flip the switch again.');
  }).catch(() => {
    if (tryN < 4) {
      setTimeout(() => persistReadySeed(kind, map, tryN + 1), 400 * (tryN + 1));
      return;
    }
    console.warn(spec.label + ' seed did not write. Restart python3 dev_server.py and flip the switch again.');
  });
}

function dumpReadySeed(kind) {
  const spec = readySpec(kind);
  const ids = readyIdsFromMap(loadReadyMap(kind));
  const body = ids.map((id) => `  ${JSON.stringify(id)}: true,`).join('\n');
  const text = `export const ${spec.exportName} = {\n${body}\n};\n`;
  try { navigator.clipboard?.writeText(text); } catch (e) { /* no clipboard permission */ }
  console.log(`${ids.length} ${spec.label} ids — paste over the export in ${spec.file}:\n\n${text}`);
  return text;
}

if (typeof window !== 'undefined') {
  window.WiseDevReady = {
    dumpSeed: () => dumpReadySeed('dev'),
    map: () => loadReadyMap('dev'),
    persist: (map) => persistReadySeed('dev', map),
  };
  window.WiseAiReady = {
    dumpSeed: () => dumpReadySeed('ai'),
    map: () => loadReadyMap('ai'),
    persist: (map) => persistReadySeed('ai', map),
  };
  persistReadySeed('dev');
  persistReadySeed('ai');
}

function isDscReady(name, map) {
  return map[name] === true;
}

/* ------------------------------------------------------------------ */
/* Dev Ready hierarchy                                                 */
/*                                                                     */
/* A higher-level accordion ("Dev Ready" on a module or a composite     */
/* component) turns on once every lower-level part it owns is ready,   */
/* and drops back off if any child is flipped off. Clicking the switch */
/* while parts are still off opens a two-step verify modal; confirming */
/* marks every descendant ready. The parent→child tree is built at     */
/* render time. Accordions with no parts are leaves and toggle freely. */
/* ------------------------------------------------------------------ */
let DEV_READY_CHILDREN = {}; /* moduleId -> [{ id, label }] */
let DEV_READY_PARENT = {};   /* childId  -> moduleId        */

function registerReadyChildren(moduleId, children) {
  DEV_READY_CHILDREN[moduleId] = children;
  children.forEach((c) => { DEV_READY_PARENT[c.id] = moduleId; });
}

/* AI children skip catalog cards marked `ai: false` (no switch, no k/n). */
function readyKids(moduleId, kind) {
  const kids = DEV_READY_CHILDREN[moduleId] || [];
  if (kind === 'ai') return kids.filter((c) => c.ai !== false);
  return kids;
}

/* How many of a module's children are ready right now for this kind. */
function readyChildStats(moduleId, map, kind) {
  const kids = readyKids(moduleId, kind);
  let ready = 0;
  kids.forEach((c) => { if (map[c.id] === true) ready++; });
  return { ready, total: kids.length };
}

function readyProgressTitle(stats, kind) {
  return readySpec(kind).progressTitle(stats);
}

function readyProgressPartial(stats) {
  return !!(stats && stats.ready > 1 && stats.ready < stats.total);
}

function readyProgressClass(stats) {
  const complete = stats.ready >= stats.total && stats.total > 0;
  return 'dsc-ready-progress' + (complete ? ' is-complete' : '');
}

function readyProgressInner(stats) {
  const gated = stats.ready < stats.total;
  return `<span class="material-symbols-outlined" aria-hidden="true">${gated ? 'radio_button_unchecked' : 'task_alt'}</span>`
    + `<span class="dsc-ready-count">${stats.ready}/${stats.total}</span>`
    + (gated ? '' : '<span class="dsc-ready-label">ready</span>');
}

function readyProgressHTML(moduleId, stats, kind) {
  const spec = readySpec(kind);
  return `<span class="${readyProgressClass(stats)}" data-ready-progress-for="${esc(moduleId)}" data-ready-kind="${spec.id}" title="${esc(readyProgressTitle(stats, kind))}">
        ${readyProgressInner(stats)}
      </span>`;
}

function paintReadyProgress(pill, stats, kind) {
  if (!pill) return;
  pill.classList.toggle('is-complete', stats.ready >= stats.total && stats.total > 0);
  pill.classList.remove('is-partial');
  pill.setAttribute('title', readyProgressTitle(stats, kind || pill.getAttribute('data-ready-kind') || 'dev'));
  pill.innerHTML = readyProgressInner(stats);
  const wrap = pill.closest('.dsc-ready--ai');
  if (wrap) wrap.classList.toggle('is-partial', readyProgressPartial(stats));
}

/* Stable child ids — MUST match the ids the child toggles render with. */
function motionReadyId(item) { return 'motion:' + item.title; }
function tableReadyId(t) { return 'tbl:' + (t.selector || t.label); }

function tableReadyChildren() {
  return TABLE_CATALOG.map((t) => ({ id: tableReadyId(t), label: t.label }));
}
function traceReadyChildren() {
  return [
    { id: 'trace:live', label: 'Live animation' },
    { id: 'trace:mid', label: 'Mid-animation · paused' },
    { id: 'trace:done', label: 'Finished' },
    { id: 'trace:detail', label: 'Streaming detail' },
  ];
}
const TARCH_LAYERS = [
  { id: 'chats', side: 'left', icon: 'history', title: 'History',
    body: 'The conversation list. Each row is a thread.',
    jump: 'History' },
  { id: 'fork', side: 'left', icon: 'alt_route', title: 'Fork banner',
    body: 'This chat branched from another thread.',
    jump: 'Transcript lines' },
  { id: 'lines', side: 'left', icon: 'forum', title: 'Transcript lines',
    body: 'You, WISEcodeAI, or an event — never a bubble.',
    jump: 'Transcript lines' },
  { id: 'strips', side: 'left', icon: 'timeline', title: 'Activity strip',
    body: 'Landmark rail. Gold = output, green = source, amber = database.',
    jump: 'Activity strip' },
  { id: 'activity', side: 'left', icon: 'swap_horiz', title: 'Event line',
    body: 'A mid-thread database switch or data source.',
    jump: 'Transcript lines' },
  { id: 'composer', side: 'left', icon: 'chat', title: 'Composer',
    body: 'The unlocked typing rail under the thread.',
    jump: 'Chat composer' },
  { id: 'menu', side: 'right', icon: 'more_vert', title: 'Chat menu',
    body: 'The ⋮ on the chat. Turns is an Admin row in here.',
    jump: 'Chat \u22ef menu' },
  { id: 'outputs', side: 'right', icon: 'dashboard_customize', title: 'Output chips',
    body: 'A Results / Visuals chip that opens the pane.',
    jump: 'Output chips' },
  { id: 'actions', side: 'right', icon: 'thumbs_up_down', title: 'Transcript actions',
    body: 'Copy, accurate / not, and the answer ⋮.',
    jump: 'Transcript actions' },
  { id: 'chips', side: 'right', icon: 'bolt', title: 'Intent chips',
    body: 'Reply chips that open the next transcript.',
    jump: 'Intent chips' },
  { id: 'versions', side: 'right', icon: 'layers', title: 'Versions',
    body: 'Redo stacks every version at 52px. Hover fans the stack.',
    jump: 'Output chips' },
  { id: 'tokens', side: 'right', icon: 'more_horiz', title: 'Token readout',
    body: 'Three dots under the composer — this-turn cost.',
    jump: 'Token readout' },
  { id: 'turns', side: 'right', icon: 'alt_route', title: 'Turns',
    body: 'Admin sticky drawer. Fork or jump any turn from here.',
    jump: 'Turns module' },
  { id: 'cwr', side: 'right', icon: 'directions_run', title: 'Roll · Crawl · Walk · Run',
    body: 'Admin rollout stadium. Not Turns — four page modes.',
    jump: 'Roll · Crawl · Walk · Run' },
];

/* De-duped directory sections — shared by the directory render and the tree so
   the area children always match the areas actually shown. */
function dedupedDirSections() {
  const seen = new Set();
  return MODULE_SECTIONS
    .map((s) => ({
      ...s,
      modules: s.modules.filter((m) => {
        if (seen.has(m.href)) return false;
        seen.add(m.href);
        return true;
      }),
    }))
    .filter((s) => s.modules.length);
}

/* Design System parts that each carry a Dev Ready child toggle — every type
   family, every type-scale step, and every color/token group. */
function designReadyGroups() {
  return [
    ...FONT_FAMILIES.map((f) => ({ id: dsFontReadyId(f), label: f.name })),
    ...TYPE_SCALE.map((t) => ({ id: dsTypeReadyId(t), label: t.name })),
    ...COLOR_GROUPS.map((g) => ({ id: 'ds:' + g.title, label: colorGroupTitle(g) })),
  ];
}

/* Build the parent→child map. Call once before rendering. Accordion
   sections that own parts show ready / still-to-go counts. Codebase is
   stats-only — it is not in this tree and has no Dev Ready chrome. */
function buildDevReadyTree() {
  DEV_READY_CHILDREN = {};
  DEV_READY_PARENT = {};
  registerReadyChildren('mi-directory', dedupedDirSections().map((s) => ({ id: 'dir:' + s.tone, label: s.title })));
  registerReadyChildren('mi-tables', tableReadyChildren());
  registerReadyChildren('mi-analytics', analyticsReadyChildren());
  /* Intent Chip Logic is an audit index, like Codebase — it is not in this
     tree and has no Dev Ready chrome. */
  registerReadyChildren('mi-trace', traceReadyChildren());
  registerReadyChildren('mi-motion', MOTION_ITEMS.map((i) => ({ id: motionReadyId(i), label: i.title })));
  /* Responsiveness is a leaf AI Ready switch (off by default). It is not
     in the WIP tree and has no per-surface count. */
  /* Icon Inventory is one library — Dev Ready is the module switch, not a
     per-group count. */
  registerReadyChildren('mi-design', designReadyGroups());
  registerReadyChildren('mi-components', COMPONENTS.filter((c) => c.status !== 'not-now').map((c) => ({ id: c.name, label: c.name, ai: c.ai !== false })));
}

/* One switch for one kind. `level` is 'module' (on when every child is
   ready) or 'item'. A module that owns children renders a live "k/n" pill. */
function readyToggleOneHTML(id, label, opts) {
  opts = opts || {};
  const kind = opts.kind === 'ai' ? 'ai' : 'dev';
  const spec = readySpec(kind);
  const level = opts.level || 'item';
  const parent = opts.parent || '';
  const map = loadReadyMap(kind);
  const kids = level === 'module' ? readyKids(id, kind) : [];
  const hasKids = kids.length > 0;
  const stats = hasKids ? readyChildStats(id, map, kind) : null;
  const complete = hasKids ? stats.ready >= stats.total : isDscReady(id, map);
  const ready = hasKids ? complete : isDscReady(id, map);
  const cls = 'dash-brand-toggle' + (ready ? ' is-on' : '');
  const title = hasKids && !complete ? spec.markAll(label) : (ready ? spec.titleOn : spec.markOne(label));
  const showProgress = hasKids && (kind !== 'ai' || id === 'mi-components');
  const progress = showProgress ? readyProgressHTML(id, stats, kind) : '';
  const switchText = readySwitchText(kind, ready);
  const partial = kind === 'ai' && hasKids && readyProgressPartial(stats);
  return `
    <div class="dsc-ready dsc-ready--${level} dsc-ready--${kind}${partial ? ' is-partial' : ''}">
      ${progress}
      <button type="button" class="${cls}" role="switch"
        aria-checked="${ready ? 'true' : 'false'}"
        aria-label="${esc(switchText)} for ${esc(label)}" title="${esc(title)}"
        data-dsc-ready data-ready-id="${esc(id)}" data-ready-level="${esc(level)}"
        data-ready-kind="${kind}"
        data-ready-label="${esc(label)}"${parent ? ` data-ready-parent="${esc(parent)}"` : ''}>
        <span class="dash-brand-toggle-track"><span class="dash-brand-toggle-thumb"></span></span>
        <span class="dash-brand-toggle-text">${esc(switchText)}</span>
      </button>
    </div>`;
}

/* WIP Ready + AI Ready, WIP on the left. Pass `ai: false` to omit AI Ready
   (Module Directory, Table Gallery, and chrome catalog cards). */
function readyToggleHTML(id, label, opts) {
  opts = opts || {};
  if (opts.kind) return readyToggleOneHTML(id, label, opts);
  const wip = readyToggleOneHTML(id, label, Object.assign({}, opts, { kind: 'dev' }));
  if (opts.ai === false) {
    return `<div class="dsc-ready-row" data-ready-wrap>${wip}</div>`;
  }
  return `<div class="dsc-ready-row" data-ready-wrap>${wip}${
    readyToggleOneHTML(id, label, Object.assign({}, opts, { kind: 'ai' }))
  }</div>`;
}

/* A higher-level module toggle — on when every child is ready. */
function moduleReadyToggleHTML(moduleId, label, opts) {
  return readyToggleHTML(moduleId, label, Object.assign({ level: 'module' }, opts || {}));
}

function themePaneHTML(mode, demo) {
  const label = mode === 'dark' ? 'Dark' : 'Light';
  return `
    <div class="dsc-theme dsc-theme-${mode}">
      <div class="dsc-sub-label">${label}</div>
      <div class="dsc-demo">${demo}</div>
    </div>`;
}

function themedDemoHTML(demo, { stack = false } = {}) {
  const stage = String(demo || '');
  const cls = stack ? 'dsc-themes dsc-themes--stack' : 'dsc-themes';
  return `
    <div class="${cls}">
      ${themePaneHTML('light', stage)}
      ${themePaneHTML('dark', stage)}
    </div>`;
}

function setCompCardCollapsed(card, collapsed) {
  if (!card) return;
  card.classList.toggle('is-collapsed', !!collapsed);
  card.querySelector(':scope > .dsc-card-head')?.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
}

function notNowStatusHTML() {
  return `
    <div class="dsc-ready dsc-ready--item dsc-ready--not-now">
      <span class="dash-brand-toggle" aria-disabled="true">
        <span class="dash-brand-toggle-track"><span class="dash-brand-toggle-thumb"></span></span>
        <span class="dash-brand-toggle-text">Not Now</span>
      </span>
    </div>`;
}

function componentCard(c, readyMap) {
  const cat = catOf(c);
  const parts = partsOf(c.name);
  const shelved = c.status === 'not-now';
  const search = `${c.name} ${(c.aliases || []).join(' ')} ${c.cls} ${c.used} ${c.note || ''} ${cat} ${parts.map((p) => p.name).join(' ')}${shelved ? ' not now locked' : ''}`.toLowerCase();
  const cardCls = `dsc-card dsc-card--acc is-collapsed${c.wide ? ' dsc-card--wide' : ''}${shelved ? ' is-locked' : ''}`;
  const bodyId = 'acc-body-' + compDomId(c.name);
  const note = c.note
    ? `<div class="dsc-note"><span class="material-symbols-outlined">${esc(c.noteIcon || 'aspect_ratio')}</span><span>${c.note}</span></div>`
    : '';
  const dl = c.download;
  const download = dl
    ? `<div class="dsc-download-row">
        ${dl.source ? `<a class="dash-btn dash-btn--ghost dsc-download" href="${esc(dl.source.href)}">
          <span class="material-symbols-outlined">${esc(dl.source.icon || 'open_in_new')}</span>${esc(dl.source.label)}
        </a>` : ''}
        ${dl.openLabel ? `<a class="dash-btn dash-btn--ghost dsc-download" href="${esc(dl.href)}">
          <span class="material-symbols-outlined">description</span>${esc(dl.openLabel)}
        </a>` : ''}
        <a class="dash-btn dash-btn--ghost dsc-download" href="${esc(dl.href)}"${dl.file ? ` download="${esc(dl.file)}"` : ''}>
          <span class="material-symbols-outlined">download</span>${esc(dl.label)}
        </a>
      </div>`
    : '';
  const headAttrs = shelved
    ? 'aria-disabled="true"'
    : `role="button" tabindex="0" aria-expanded="false" aria-controls="${esc(bodyId)}"`;
  return `
    <div class="${cardCls}" id="${esc(compDomId(c.name))}" data-ds-comp data-comp-name="${esc(c.name)}" data-cat="${esc(cat)}" data-search="${esc(search)}"${shelved ? ' data-comp-status="not-now"' : ''}>
      <div class="dsc-card-head" ${headAttrs}>
        <span class="mi-acc-chevron material-symbols-outlined" aria-hidden="true">expand_more</span>
        <div class="dsc-head">
          <span class="dsc-name">${esc(c.name)}</span>
          <code class="dsc-class">${esc(c.cls)}</code>
        </div>
        ${shelved ? notNowStatusHTML() : readyToggleHTML(c.name, c.name, { level: 'item', parent: 'mi-components', ai: c.ai !== false })}
      </div>
      <div class="dsc-card-body" id="${esc(bodyId)}">
        ${typeof c.demoCustom === 'function' ? c.demoCustom() : (c.demoCustom || (c.demo ? themedDemoHTML(c.demo, { stack: !!c.stackThemes }) : ''))}
        ${note}
        ${download}
        <div class="dsc-refs">
          ${paneCompsHTML(parts, 'Made of', { hideEmpty: true, hideReady: true })}
        </div>
        ${usedSurfacesHTML(c.used, c)}
      </div>
    </div>`;
}

/* The shared rules every component obeys — the "similarities" that make the
   library a system rather than a pile of parts. Rendered as a callout at the
   top of the Component Library so the conventions (above all, that everything
   is responsive) are impossible to miss. */
const CONVENTIONS = [
  {
    icon: 'devices',
    title: 'Responsive by default',
    body: 'Nothing is fixed-width. Layouts flow with fluid grids (<code>repeat(auto-fit, minmax())</code>), and surfaces that sit in a narrow column beside the chat dock use <strong>container queries</strong> (<code>container-type: inline-size</code>) so each module responds to its OWN width, not the viewport. Test every component at dock, split, and full width.',
  },
  {
    icon: 'palette',
    title: 'Token-driven color',
    body: 'No hard-coded colors. Fills and ink come from design tokens (<code>--primary</code>, <code>--surface</code>, <code>--sec-*</code>, <code>--ter-*</code>), so light/dark and status semantics stay consistent everywhere — see the Design System above. Each card below shows both themes, not only the page’s current one.',
  },
  {
    icon: 'contrast',
    title: 'Light and dark',
    body: 'Dark is a first-class version of every component, not a page-only toggle. The Dark pane uses the same tokens as <code>html.dark</code>; the Light pane pins the light tokens so it stays readable when the rest of the page is navy.',
  },
  {
    icon: 'table_rows',
    title: 'One table pattern',
    body: 'Every list is the same CSS-grid faux-table (<code>*-thead / *-trow / *-th / *-td</code>) driven by a single columns variable. Sorting and "load more" paging attach app-wide via <code>js/sortable-tables.js</code> and <code>js/table-pagination.js</code>. Clicking a product row opens that product; icons and other controls on the row keep their own actions (<code>js/product-row-click.js</code>).',
  },
  {
    icon: 'filter_alt',
    title: 'One filter pattern',
    body: 'Lists filter the same way: a search pill with an in-pill funnel that opens a filter popover, plus click-to-filter stat tiles. Active facets show a dot / <code>.is-active</code>.',
  },
  {
    icon: 'layers',
    title: 'Two popover shapes',
    body: 'All menus reduce to two shells — <code>.topbar-popover</code> (compact top-bar / row menus, including chat and module \u22ef) and <code>.wise-popover</code> (settings / profile). Both are opened and dismissed centrally by <code>js/popover-layer.js</code>. Transcript action tips are the shared theme-aware <code>#lir-tooltip</code> card, not a third menu shell.',
  },
  {
    icon: 'view_sidebar',
    title: 'Sticky drawers are a utility belt',
    body: 'Any module to the right of the chat tucks behind it like a drawer \u2014 always on, no toggle. The chat is the buckle (z-index 3). Output sits at z-index 2. Peer drawers (Nutrition Facts, Turns, Help) sit at z-index 1, shorter and centred, with the chat-facing corners squared. Nested drawers (progress, Help contact, Report builder) sit one layer under their parent (z-index 0, shorter still). History tucks left. Opening a \u22ef never lifts a drawer over the chat.',
  },
  {
    icon: 'accessibility_new',
    title: 'Consistent states',
    body: 'Interactive components show Default, Hover (<code>.is-hover</code> in demos), Open / <code>.is-active</code> / <code>.is-open</code>, and Disabled side by side — not just the rest state. Real UI also uses <code>:focus-visible</code> rings and honors <code>prefers-reduced-motion</code>. Icon-only controls carry an <code>aria-label</code>.',
  },
];

function renderConventions() {
  return `
    <div class="dsc-conventions" aria-label="Component conventions">
      <div class="dsc-conv-head">
        <span class="material-symbols-outlined">rule</span>
        <div>
          <div class="dsc-conv-title">Conventions &amp; rules</div>
          <div class="dsc-conv-sub">The shared rules every component below follows — the similarities that make this a system.</div>
        </div>
      </div>
      <div class="dsc-conv-grid">
        ${CONVENTIONS.map((c) => `
          <div class="dsc-conv-item">
            <span class="dsc-conv-ic"><span class="material-symbols-outlined">${esc(c.icon)}</span></span>
            <div class="dsc-conv-body">
              <div class="dsc-conv-item-title">${esc(c.title)}</div>
              <p class="dsc-conv-item-desc">${c.body}</p>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

function renderComponentLibrary(opts) {
  if (opts && opts.headOnly) {
    return miHeadOnly('mi-components', 'Component Library',
      'Reusable components, rendered live with the real global classes from <code>pages/wise.css</code>. Each component is its own accordion — open one by its title to see Default, Hover, and Open (or Disabled) side by side, in <strong>Light</strong> and <strong>Dark</strong>.',
      moduleReadyToggleHTML('mi-components', 'Component Library') + moduleControlsHTML('mi-components'));
  }
  return `
    <section class="mi-module is-collapsed" id="mi-components">
      <header class="mi-module-head">
        <div class="mi-module-head-text">
          <h2 class="mi-module-title">Component Library</h2>
          <p class="mi-module-lede">Reusable components, rendered live with the real global classes from
            <code>pages/wise.css</code>. Each component is its own accordion — open one by its title to
            see Default, Hover, and Open (or Disabled) side by side, in <strong>Light</strong> and
            <strong>Dark</strong>. Composite cards list the parts they are <em>made of</em> and who uses
            them (jump links only; Dev Ready lives on each part’s own card and on Module Directory rows).
            Search pills, filter tiles, Grid⇄Rail, module ⋯ menus, and the page chrome live in the modules
            above.</p>
        </div>
        ${moduleReadyToggleHTML('mi-components', 'Component Library')}
        ${moduleControlsHTML('mi-components')}
      </header>

      ${renderConventions()}

      <div class="mi-toolbar">
        <div class="mi-search-inline">
          <span class="material-symbols-outlined">search</span>
          <input type="search" id="dsc-search" class="mi-search" placeholder="Filter components by name, class, or usage…" aria-label="Search components" autocomplete="off" />
        </div>
      </div>

      <div class="mi-stats" id="dsc-stats" role="group" aria-label="Filter components by category">
        ${componentCategoryScorecards()}
      </div>

      <div class="mi-dir-empty" id="dsc-empty" hidden>No components match your filter.</div>
      <div class="dsc-grid" id="dsc-grid">
        ${COMPONENTS.map((c) => componentCard(c, loadDscReadyMap())).join('')}
      </div>
    </section>`;
}

/* Click-to-filter category tiles for the Component Library — same scorecard
   language as the Module Directory, so a category is one tap away. */
function componentCategoryScorecards() {
  const counts = {};
  COMPONENTS.forEach((c) => { const k = catOf(c); counts[k] = (counts[k] || 0) + 1; });
  const all = `
    <button type="button" class="mi-stat is-active" data-cat="all" aria-pressed="true">
      <span class="mi-stat-num">${COMPONENTS.length}</span>
      <span class="mi-stat-label"><span class="mi-stat-text">All</span><span class="material-symbols-outlined">widgets</span></span>
    </button>`;
  const tiles = COMPONENT_CATS
    .filter((cat) => counts[cat.key])
    .map((cat) => `
      <button type="button" class="mi-stat" data-cat="${esc(cat.key)}" aria-pressed="false">
        <span class="mi-stat-num">${counts[cat.key]}</span>
        <span class="mi-stat-label"><span class="mi-stat-text">${esc(cat.key)}</span><span class="material-symbols-outlined">${esc(cat.icon)}</span></span>
      </button>`);
  return [all, ...tiles].join('');
}

/* ------------------------------------------------------------------ */
/* Intent Chip Audit module                                            */
/*                                                                     */
/* Every WISEcodeAI surface across the app ships "intent chips" — the    */
/* one-tap suggestions on the welcome screen. This covers both the       */
/* shared dock (mounted on every logged-in page) AND the standalone      */
/* flagship WISEcodeAI pages (wiseai.html, ai-dashboard.html). For a     */
/* chip to be fully wired it needs BOTH halves:                          */
/*   • a transcript — its own scripted reply (an `intentReplies[intent]`*/
/*     entry, or a page-supplied reply hook), so a click narrates       */
/*     something specific instead of falling through to the generic     */
/*     keyword fallback; and                                            */
/*   • logic — an `onIntent`/`onReply` side-effect that drives the real  */
/*     page (filter a table, open a report/pane, run a job, navigate…).  */
/*     Pure Q&A / explainer chips are transcript-only by design — they   */
/*     answer a question rather than move the page — and are flagged     */
/*     l:false so the audit reports them honestly as "answer-only".      */
/*                                                                      */
/* This map is hand-verified against each surface's WISEcodeAI config    */
/* (the `*_WISEAI` exports in js/*-flow.js, the inline dock configs in   */
/* js/agent-overview.js, and the inline configs + surface(intent) on the */
/* flagship pages), cross-checked against each page's on-page intent     */
/* bridge — window.__ibIntent / __wiseLibraryIntent /                    */
/* __wiseMarketingIntent). Keep it in lock-step with those when chips    */
/* are added or rewired. Per chip: t = has its own transcript, l = has  */
/* its own page logic, does = the actual onIntent / onReply side-effect */
/* (or “answer-only” when there is none). Rendered as one sortable table. */
/* ------------------------------------------------------------------ */
const INTENT_AUDIT = [
  {
    label: 'Dashboard', icon: 'space_dashboard', href: 'overview.html', src: 'agent-overview.js',
    note: 'Every chip posts its own scripted transcript (DASHBOARD_WISEAI_REPLIES) first, then fires its matching on-page control — so the narration always lands in the thread before the chip navigates or opens the logo editor.',
    chips: [
      { i: 'claim_products',   label: 'Claim your products',          t: true, l: true, does: 'After the transcript lands, clicks the dashboard Claim control and opens the claim-products flow.' },
      { i: 'review_portfolio', label: 'Review your food portfolio',   t: true, l: true, does: 'After the transcript lands, clicks through to Product Portfolio.' },
      { i: 'add_food',         label: 'Add a food',                   t: true, l: true, does: 'After the transcript lands, opens Add Product.' },
      { i: 'verify_upf',       label: 'Verify your Non-UPF products', t: true, l: true, does: 'After the transcript lands, starts Non-UPF verification.' },
      { i: 'verify_gras',      label: 'Verify your GRAS products',    t: true, l: true, does: 'After the transcript lands, starts GRAS verification.' },
      { i: 'update_logo',      label: 'Update your brand logo',       t: true, l: true, does: 'After the transcript lands, opens the brand logo editor on the dashboard.' },
    ],
  },
  {
    label: 'Reports', icon: 'insights', href: 'reports.html', src: 'agent-overview.js',
    chips: [
      { i: 'open_upf_report',      label: 'Open the UPF report',      t: true,  l: true, does: 'Opens the UPF report inline on the Reports surface (right of chat). Back restores the report list.' },
      { i: 'open_gras_report',     label: 'Open the GRAS report',     t: true,  l: true, does: 'Opens the GRAS report inline on the Reports surface.' },
      { i: 'open_insights_report', label: 'Open the insights report', t: true,  l: true, does: 'Opens the insights report inline on the Reports surface.' },
      { i: 'explain_score',        label: 'Explain my UPF score',     t: true,  l: false, does: 'Answer-only — narrates how the UPF score is calculated. Does not move the page.' },
      { i: 'improve_score',        label: 'How do I improve it?',     t: true,  l: false, does: 'Answer-only — narrates the fastest ingredient swaps to flip products Non-UPF. No page action.' },
      { i: 'ingredient_quality',   label: 'Ingredient quality',       t: true,  l: false, does: 'Answer-only — narrates additives, clean-label share and seed-oil scoring. No page action.' },
      { i: 'compare_products',     label: 'Compare two products',     t: true,  l: false, does: 'Answer-only — explains how to line up two SKUs. Does not open Comparison.' },
      { i: 'unlock_studio',        label: 'Unlock the full Studio',   t: true,  l: false, does: 'Answer-only — describes the locked Studio reports (GRAS, Insights, Nutrient-Quality, Health-Outcomes).' },
    ],
  },
  {
    label: 'Library', icon: 'auto_stories', href: 'conversation-library.html', src: 'agent-overview.js',
    chips: [
      { i: 'lib_reports',    label: 'Show reports',     t: true, l: true, does: 'Applies the Reports filter on the Library grid and syncs the scorecards + funnel.' },
      { i: 'lib_dashboards', label: 'Show dashboards',  t: true, l: true, does: 'Applies the Dashboards filter on the Library grid.' },
      { i: 'lib_chats',      label: 'Show chats',       t: true, l: true, does: 'Applies the Chats filter on the Library grid.' },
      { i: 'lib_mcp',        label: 'Show MCP results', t: true, l: true, does: 'Applies the MCP-results filter on the Library grid.' },
      { i: 'lib_references', label: 'Show references',  t: true, l: true, does: 'Applies the References filter on the Library grid.' },
      { i: 'lib_shared',     label: 'Shared with me',   t: true, l: true, does: 'Applies the Shared-with-me filter on the Library grid.' },
    ],
  },
  {
    label: 'Ingredient Browser', icon: 'science', href: 'ingredient-browser.html', src: 'agent-overview.js',
    chips: [
      { i: 'search_ingredient', label: 'Search an ingredient',       t: true, l: true, does: 'Focuses the ingredient search and drives the registry via __ibIntent.' },
      { i: 'filter_gras',       label: 'Filter by GRAS status',      t: true, l: true, does: 'Filters the registry to GRAS status via the page intent bridge.' },
      { i: 'browse_category',   label: 'Browse by category',         t: true, l: true, does: 'Slices the registry by category.' },
      { i: 'filter_processing', label: 'Filter by processing level', t: true, l: true, does: 'Filters the registry by processing level (NOVA / UPF class).' },
      { i: 'check_allergens',   label: 'Check allergens',            t: true, l: true, does: 'Filters the registry to allergen flags.' },
      { i: 'filter_flags',      label: 'Additives & flags',          t: true, l: true, does: 'Filters the registry to additives & warning flags.' },
      { i: 'explain_gras',      label: 'What is GRAS?',              t: true, l: false, does: 'Answer-only — explains what GRAS means. Does not change the filter.' },
    ],
  },
  {
    label: 'Marketing Assets', icon: 'photo_library', href: 'marketing-assets.html', src: 'agent-overview.js',
    chips: [
      { i: 'onesheet',        label: 'Open the co-branded one-sheets',   t: true, l: true, does: 'Opens the co-branded one-sheets folder on the assets page.' },
      { i: 'shield',          label: 'Get the Non-UPF Verified™ shield', t: true, l: true, does: 'Opens the Non-UPF Verified™ shield download assets.' },
      { i: 'brand_standards', label: 'Download the brand standards guide', t: true, l: true, does: 'Opens the brand-standards guide download.' },
      { i: 'social',          label: 'Grab the social media toolkit',    t: true, l: true, does: 'Opens the social-media toolkit folder.' },
      { i: 'email_sms',       label: 'Get email & SMS assets',           t: true, l: true, does: 'Opens the email & SMS asset folder.' },
      { i: 'packaging',       label: 'Packaging resources',              t: true, l: true, does: 'Opens the packaging-resources folder.' },
      { i: 'expand_all',      label: 'Expand all folders',               t: true, l: true, does: 'Expands every folder on the Marketing Assets page.' },
    ],
  },
  {
    label: 'Non-UPF Verification', icon: 'verified', href: 'verification.html', src: 'verification-flow.js',
    chips: [
      { i: 'select_all',    label: 'Select all foods',          t: true, l: true, does: 'Selects every food on the Select step (jumps there if you are on a later step).' },
      { i: 'go_attest',     label: 'Continue to attestation',   t: true, l: true, does: 'Advances to the Attestation step if at least one food is selected.' },
      { i: 'do_attest',     label: 'Sign the attestation',      t: true, l: true, does: 'Jumps to Attestation if needed and marks the attestation signed.' },
      { i: 'go_payment',    label: 'Go to payment',             t: true, l: true, does: 'Advances to Payment once the attestation is signed and foods are selected.' },
      { i: 'pay_now',       label: 'Pay & mint my shields',     t: true, l: true, does: 'Jumps to Payment, checks the VSA, and runs process-payment to mint shields.' },
      { i: 'explain_flow',  label: 'How does verification work?', t: true, l: false, does: 'Answer-only — narrates Confirm → Attest → Activate. No step change.' },
      { i: 'pricing',       label: 'How is pricing calculated?', t: true, l: false, does: 'Answer-only — explains how verification pricing is calculated.' },
      { i: 'what_you_get',  label: 'What do I get after?',      t: true, l: false, does: 'Answer-only — describes shields and assets you get after payment.' },
      { i: 'other_types',   label: 'Other verification types',  t: true, l: false, does: 'Answer-only — lists the other verification types (GRAS, etc.).' },
    ],
  },
  {
    label: 'GRAS Verification', icon: 'shield', href: 'gras-verification.html', src: 'gras-verification-flow.js',
    chips: [
      { i: 'verify_top',       label: 'Verify my top ingredient',   t: true, l: true, does: 'Starts verification on the recommended top ingredient.' },
      { i: 'use_recommended',  label: 'Use the recommended pathway', t: true, l: true, does: 'Selects the recommended documentation pathway.' },
      { i: 'autofill_docs',    label: 'Attach & fill the documents', t: true, l: true, does: 'Attaches and auto-fills the required pathway documents.' },
      { i: 'next_step',        label: 'Continue to the next step',  t: true, l: true, does: 'Advances the GRAS wizard to the next incomplete step.' },
      { i: 'sign_attestation', label: 'Sign the attestation',       t: true, l: true, does: 'Signs the GRAS attestation on the current submission.' },
      { i: 'submit_gras',      label: 'Submit for review',          t: true, l: true, does: 'Submits the current ingredient for WISEcode review.' },
      { i: 'run_review',       label: 'Run the WISEcode review',    t: true, l: true, does: 'Runs the WISEcode review against the submitted packet.' },
      { i: 'view_submissions', label: 'Open the review queue',      t: true, l: true, does: 'Opens the GRAS review queue.' },
      { i: 'verify_another',   label: 'Verify another ingredient',  t: true, l: true, does: 'Resets the wizard to start a new ingredient.' },
      { i: 'explain_gras',     label: 'What is GRAS verification?', t: true, l: false, does: 'Answer-only — explains what GRAS verification covers.' },
      { i: 'doc_pathways',     label: 'Which pathway do I need?',   t: true, l: false, does: 'Answer-only — describes which documentation pathway you need.' },
      { i: 'what_clears',      label: 'What will this clear?',      t: true, l: false, does: 'Answer-only — lists what a cleared GRAS review unlocks.' },
    ],
  },
  {
    label: 'Organization Profile', icon: 'account_circle', href: 'profile.html', src: 'profile-flow.js',
    chips: [
      { i: 'rename_org',     label: 'Rename organization',      t: true, l: true, does: 'Focuses and drives the organization-name field via runIntent.' },
      { i: 'org_type',       label: 'Change organization type', t: true, l: true, does: 'Opens the organization-type control.' },
      { i: 'contact_person', label: 'Update contact person',    t: true, l: true, does: 'Focuses the contact-person field.' },
      { i: 'email',          label: 'Change contact email',     t: true, l: true, does: 'Focuses the contact-email field.' },
      { i: 'phone',          label: 'Update phone number',      t: true, l: true, does: 'Focuses the phone-number field.' },
      { i: 'address',        label: 'Edit mailing address',     t: true, l: true, does: 'Opens the mailing-address editor.' },
      { i: 'website',        label: 'Set website URL',          t: true, l: true, does: 'Focuses the website URL field.' },
      { i: 'ein',            label: 'Add EIN',                  t: true, l: true, does: 'Focuses the EIN field.' },
      { i: 'logo',           label: 'Upload brand logo',        t: true, l: true, does: 'Opens the brand-logo uploader.' },
      { i: 'banner',         label: 'Set brand banner',         t: true, l: true, does: 'Opens the brand-banner uploader.' },
      { i: 'avatar',         label: 'Set avatar picture',       t: true, l: true, does: 'Opens the avatar-picture picker.' },
      { i: 'save',           label: 'Save changes',             t: true, l: true, does: 'Saves the profile — the transcript itself performs and narrates the save.' },
    ],
  },
  {
    label: 'Preferences', icon: 'tune', href: 'preferences.html', src: 'preferences-flow.js',
    chips: [
      { i: 'toggle_theme',  label: 'Switch light / dark',        t: true, l: true, does: 'Flips light/dark, persists it, and repaints the page.' },
      { i: 'bigger_text',   label: 'Make text bigger',           t: true, l: true, does: 'Bumps interface text +10% and persists the size.' },
      { i: 'mute_email',    label: 'Mute email notifications',   t: true, l: true, does: 'Turns email notifications off (in-app alerts stay on).' },
      { i: 'dock_right',    label: 'Move chat to the right',     t: true, l: true, does: 'Sets the WISEcodeAI dock side to right, app-wide.' },
      { i: 'reduce_motion', label: 'Reduce motion',              t: true, l: true, does: 'Turns Reduce motion on so animations and transitions minimize.' },
    ],
  },
  {
    label: 'API Keys', icon: 'key', href: 'api-keys.html', src: 'api-keys-flow.js',
    chips: [
      { i: 'create_key',  label: 'Create a new API key',     t: true, l: true, does: 'Opens the create-key flow on the API Keys page.' },
      { i: 'reveal_keys', label: 'Reveal my keys',           t: true, l: true, does: 'Reveals the hidden key values in the table.' },
      { i: 'usage',       label: 'Show my usage',            t: true, l: true, does: 'Scrolls to / filters the usage readout.' },
      { i: 'rotate',      label: 'Which key should I rotate?', t: true, l: true, does: 'Highlights the key that should be rotated next.' },
      { i: 'docs',        label: 'Open the API reference',   t: true, l: true, does: 'Navigates to the API reference in Docs.' },
    ],
  },
  {
    label: 'Invoices', icon: 'receipt_long', href: 'invoices.html', src: 'invoices-flow.js',
    chips: [
      { i: 'outstanding',    label: 'What’s outstanding?',    t: true, l: true, does: 'Clears the invoice filter so outstanding items are in view.' },
      { i: 'show_paid',      label: 'Show paid invoices',     t: true, l: true, does: 'Filters the invoice table to paid.' },
      { i: 'show_failed',    label: 'Show failed payments',   t: true, l: true, does: 'Filters the invoice table to failed payments.' },
      { i: 'show_cancelled', label: 'Show cancelled',         t: true, l: true, does: 'Filters the invoice table to cancelled.' },
      { i: 'show_all',       label: 'Show all invoices',      t: true, l: true, does: 'Clears the invoice filter and shows every invoice.' },
      { i: 'download_all',   label: 'Download all',           t: true, l: true, does: 'Triggers a download-all toast / export of every invoice.' },
    ],
  },
  {
    label: 'Help', icon: 'help', href: 'help.html', src: 'help-flow.js',
    chips: [
      { i: 'getting_started',   label: 'How do I get started?', t: true, l: true, does: 'Opens the Getting started article on Help.' },
      { i: 'verification_help', label: 'Explain verification',  t: true, l: true, does: 'Opens the verification explainer article.' },
      { i: 'billing_help',      label: 'Billing & invoices',    t: true, l: true, does: 'Opens the billing & invoices article.' },
      { i: 'contact',           label: 'Contact support',       t: true, l: true, does: 'Opens the contact-support path.' },
    ],
  },
  {
    label: 'Docs', icon: 'menu_book', href: 'docs.html', src: 'docs-flow.js',
    chips: [
      { i: 'quickstart', label: 'Show me the quickstart',  t: true, l: true, does: 'Opens the quickstart doc.' },
      { i: 'api',        label: 'Open the API reference',  t: true, l: true, does: 'Opens the API reference doc.' },
      { i: 'sdk',        label: 'How do I use the SDK?',   t: true, l: true, does: 'Opens the SDK guide.' },
      { i: 'webhooks',   label: 'Set up webhooks',         t: true, l: true, does: 'Opens the webhooks setup doc.' },
      { i: 'changelog',  label: 'What’s new?',             t: true, l: true, does: 'Opens the changelog / what’s-new doc.' },
    ],
  },
  {
    label: 'Agents', icon: 'smart_toy', href: 'agents.html', src: 'agents-flow.js',
    chips: [
      { i: 'enable_all', label: 'Enable all agents',        t: true, l: true, does: 'Enables every agent on the Agents board.' },
      { i: 'pause_all',  label: 'Pause all agents',         t: true, l: true, does: 'Pauses every agent on the Agents board.' },
      { i: 'portfolio',  label: 'Open the Portfolio Agent', t: true, l: true, does: 'Opens the Portfolio Agent detail.' },
      { i: 'autonomy',   label: 'What does autonomy mean?', t: true, l: false, does: 'Answer-only — explains what agent autonomy means. No toggle change.' },
    ],
  },
  {
    label: 'Alerts', icon: 'notifications', href: 'alerts.html', src: 'alerts-flow.js',
    chips: [
      { i: 'show_unread',  label: 'Show only unread',      t: true, l: true, does: 'Filters the alert list to unread only.' },
      { i: 'mark_all',     label: 'Mark everything read',  t: true, l: true, does: 'Marks every alert read.' },
      { i: 'flags',        label: 'What needs my review?', t: true, l: true, does: 'Filters to alerts that need review.' },
      { i: 'verification', label: 'Verification alerts',   t: true, l: true, does: 'Filters to verification alerts.' },
    ],
  },
  {
    label: 'Organizations', icon: 'apartment', href: 'organizations.html', src: 'organizations-flow.js',
    chips: [
      { i: 'show_active',   label: 'Show active orgs',    t: true, l: true, does: 'Filters the org table to active.' },
      { i: 'show_invited',  label: 'Show invited orgs',   t: true, l: true, does: 'Filters the org table to invited.' },
      { i: 'show_inactive', label: 'Show inactive orgs',  t: true, l: true, does: 'Filters the org table to inactive.' },
      { i: 'show_all',      label: 'Show all',            t: true, l: true, does: 'Clears the org status filter.' },
      { i: 'add_org',       label: 'Add an organization', t: true, l: true, does: 'Runs the Add organization action.' },
      { i: 'quick_invite',  label: 'Quick invite',        t: true, l: true, does: 'Navigates to Quick Invite.' },
      { i: 'export',        label: 'Export CSV',          t: true, l: true, does: 'Exports the organizations table as CSV.' },
    ],
  },
  {
    label: 'Team', icon: 'group', href: 'teams.html', src: 'teams-flow.js',
    chips: [
      { i: 'show_active',  label: 'Show active teammates', t: true, l: true, does: 'Filters the team table to active seats.' },
      { i: 'show_invited', label: 'Show invited',          t: true, l: true, does: 'Filters the team table to open invites.' },
      { i: 'show_pending', label: 'Show pending',          t: true, l: true, does: 'Filters the team table to pending confirmation.' },
      { i: 'show_all',     label: 'Show everyone',         t: true, l: true, does: 'Clears the team status filter.' },
      { i: 'invite',       label: 'Invite a teammate',     t: true, l: true, does: 'Starts the invite-a-teammate flow.' },
      { i: 'export',       label: 'Export CSV',            t: true, l: true, does: 'Exports the team table as CSV.' },
    ],
  },
  {
    label: 'Quick Invite', icon: 'bolt', href: 'quick-invite.html', src: 'quick-invite-flow.js',
    chips: [
      { i: 'need_attention', label: 'What needs attention?', t: true, l: true, does: 'Filters invites to items that need attention.' },
      { i: 'show_pending',   label: 'Show pending invites',  t: true, l: true, does: 'Filters the invite table to pending.' },
      { i: 'show_accepted',  label: 'Show accepted',         t: true, l: true, does: 'Filters the invite table to accepted.' },
      { i: 'show_cancelled', label: 'Show cancelled',        t: true, l: true, does: 'Filters the invite table to cancelled.' },
      { i: 'show_all',       label: 'Show all invites',      t: true, l: true, does: 'Clears the invite filter.' },
      { i: 'export',         label: 'Export CSV',            t: true, l: true, does: 'Exports the invite table as CSV.' },
    ],
  },
  {
    label: 'User Management', icon: 'group', href: 'user-management.html', src: 'user-management-flow.js',
    chips: [
      { i: 'show_admins',   label: 'Show admins',      t: true, l: true, does: 'Filters the user table to admins.' },
      { i: 'show_pending',  label: 'Pending email',    t: true, l: true, does: 'Filters to users with pending email.' },
      { i: 'show_locked',   label: 'Locked out',       t: true, l: true, does: 'Filters to locked-out users.' },
      { i: 'show_waitlist', label: 'Waiting for beta', t: true, l: true, does: 'Filters to users waiting for beta.' },
      { i: 'show_all',      label: 'Show all users',   t: true, l: true, does: 'Clears the user filter.' },
      { i: 'new_user',      label: 'Add a user',       t: true, l: true, does: 'Opens the Add a user flow.' },
    ],
  },
  {
    label: 'Non-UPF Dashboard', icon: 'dashboard', href: 'non-upf-dashboard.html', src: 'non-upf-dashboard-flow.js',
    chips: [
      { i: 'portfolio_split', label: 'What’s my UPF split?',        t: true, l: false, does: 'Answer-only — narrates the current UPF / Non-UPF split. No filter change.' },
      { i: 'action_required', label: 'What needs attention?',       t: true, l: true, does: 'Filters the dashboard to products that need attention.' },
      { i: 'ready_to_attest', label: 'What’s ready to attest?',     t: true, l: true, does: 'Filters to products ready to attest.' },
      { i: 'verified',        label: 'Show verified products',      t: true, l: true, does: 'Filters to verified products.' },
      { i: 'ineligible',      label: 'Why are products ineligible?', t: true, l: true, does: 'Filters to ineligible products and narrates why.' },
      { i: 'export',          label: 'Export the dashboard',        t: true, l: true, does: 'Exports the dashboard as a download.' },
    ],
  },
  {
    label: 'Audit Queue', icon: 'rule', href: 'audit-queue.html', src: 'audit-queue-flow.js',
    chips: [
      { i: 'show_open',     label: 'Show open audits',      t: true, l: true, does: 'Filters the queue to open audits.' },
      { i: 'show_accepted', label: 'Show accepted',         t: true, l: true, does: 'Filters the queue to accepted audits.' },
      { i: 'new_canon',     label: 'New canon suggestions', t: true, l: true, does: 'Filters to new canon suggestions.' },
      { i: 'show_canceled', label: 'Show canceled',         t: true, l: true, does: 'Filters the queue to canceled audits.' },
      { i: 'show_all',      label: 'Show all audits',       t: true, l: true, does: 'Clears the audit filter.' },
      { i: 'refresh',       label: 'Refresh the queue',     t: true, l: true, does: 'Refreshes the audit queue.' },
    ],
  },
  {
    label: 'Admin Utilities', icon: 'build', href: 'admin-utils.html', src: 'admin-utils-flow.js',
    chips: [
      { i: 'seed',          label: 'Seed the platform',          t: true, l: true, does: 'Runs Seed the platform.' },
      { i: 'refresh_verif', label: 'Refresh verifications',      t: true, l: true, does: 'Runs Refresh verifications.' },
      { i: 'refresh_attr',  label: 'Refresh attribute insights', t: true, l: true, does: 'Runs Refresh attribute insights.' },
      { i: 'fix_account',   label: 'Fix an account status',      t: true, l: true, does: 'Opens the fix-account-status utility.' },
      { i: 'backplane',     label: 'Backplane diagnostics',      t: true, l: true, does: 'Opens backplane diagnostics.' },
      { i: 'db_info',       label: 'What DB am I on?',           t: true, l: false, does: 'Answer-only — narrates which database this session is on.' },
    ],
  },
  {
    label: 'All Modules', icon: 'apps', href: 'all-modules.html', src: 'all-modules-flow.js',
    note: 'This very page. The “Jump to…” chips scroll to (and expand) a module and suppress their reply on success; their transcript is a fallback for when the target isn’t found. “Latest updates” is the first chip — it posts a same-day / other-day rundown and does not jump. “How many icons are there?” is the one answer-only count chip. “Show animations & resize” opens the Motion & Resize catalog. “How responsive is the platform?” opens Responsiveness. “Show the transcript architecture” opens the frozen labeled conversation. “How does the report builder work?” opens the Report builder card and posts the how-it-works answer.',
    chips: [
      { i: 'whatsnew',   label: 'Latest updates', t: true, l: true, does: 'Posts a rundown of what landed yesterday and the day before. Does not jump.' },
      { i: 'codebase',   label: 'How big is the codebase?',      t: true, l: true, does: 'Expands and scrolls to the Codebase scorecards, then posts the sizing answer.' },
      { i: 'directory',  label: 'Jump to the Module Directory',  t: true, l: true, does: 'Expands and scrolls to the Module Directory (suppresses the reply on success).' },
      { i: 'tables',     label: 'Show every table',             t: true, l: true, does: 'Expands and scrolls to the Table Gallery.' },
      { i: 'intents',    label: 'Which intent chips work?',      t: true, l: true, does: 'Expands and scrolls to Intent Chip Logic, then posts the audit answer.' },
      { i: 'icons',      label: 'Jump to the Icon Inventory',    t: true, l: true, does: 'Expands and scrolls to the Icon Inventory.' },
      { i: 'design',     label: 'Jump to the Design System',     t: true, l: true, does: 'Expands and scrolls to the Design System.' },
      { i: 'components', label: 'Jump to the Component Library', t: true, l: true, does: 'Expands and scrolls to the Component Library.' },
      { i: 'reportbuilder', label: 'How does the report builder work?', t: true, l: true, does: 'Opens the Report builder card in the Component Library and posts the how-it-works answer.' },
      { i: 'motion',     label: 'Show animations & resize',      t: true, l: true, does: 'Expands and scrolls to Motion & Resize.' },
      { i: 'responsive', label: 'How responsive is the platform?', t: true, l: true, does: 'Expands and scrolls to Responsiveness, then posts the three-size answer.' },
      { i: 'tarch',      label: 'Show the transcript architecture', t: true, l: true, does: 'Expands and scrolls to Transcript Architecture, then posts the layer answer.' },
      { i: 'counts',     label: 'How many icons are there?',     t: true, l: false, does: 'Answer-only — narrates the unique-icon and placement counts. Does not scroll.' },
    ],
  },
  {
    label: 'WISEcodeAI (flagship)', icon: 'auto_awesome', href: 'wiseai.html', src: 'wiseai.html',
    note: 'The standalone WISEcodeAI conversation. Every chip posts its own scripted transcript (INTENT_REPLIES) and opens its result/visual panes via surface(intent) — including the deadpan “Cat food.” easter egg, which now opens a cat-food card, and “Is this list ultra-processed?”, which opens the WISEcode UPF framework pane.',
    chips: [
      { i: 'topbrands',    label: 'Top 3 brands · WISEscore ≥ 50', t: true, l: true, does: 'Posts the top-half WISEscore brand comparison and opens the overview + bar chart panes.' },
      { i: 'topbrands_counts', label: 'Show the exact counts',     t: true, l: true, does: 'Opens the exact-count table for the top three brands.' },
      { i: 'topbrands_upf',    label: 'Break down by WISEcode UPF label', t: true, l: true, does: 'Opens the UPF-label split chart for those three brands.' },
      { i: 'topbrands_top10',  label: 'Compare the top 10 brands',  t: true, l: true, does: 'Opens the top-10 brand comparison chart.' },
      { i: 'topbrands_retail', label: 'Show the retailer breakdown', t: true, l: true, does: 'Opens the retailer breakdown of foods with WISEscore ≥ 50.' },
      { i: 'brisket',      label: 'Gut-healthy brisket recipe',    t: true, l: true, does: 'Posts the brisket recipe transcript and opens its result / recipe pane via surface(intent).' },
      { i: 'redochart',    label: 'Redo the gut-health chart',     t: true, l: true, does: 'Re-runs the gut-health chart and opens the chart pane.' },
      { i: 'upf',          label: 'Is this list ultra-processed?', t: true, l: true, does: 'Opens the WISEcode UPF framework pane and narrates whether the list is ultra-processed.' },
      { i: 'worst',        label: 'Worst food in our database?',   t: true, l: true, does: 'Opens the worst-food result card from the registry.' },
      { i: 'spider',       label: 'Spider-chart the 10 worst foods', t: true, l: true, does: 'Opens a spider chart of the 10 worst foods.' },
      { i: 'cupcake',      label: 'Tell me about the worst cupcake', t: true, l: true, does: 'Opens the worst-cupcake product card.' },
      { i: 'cookie',       label: 'Best cookie, least chocolate',  t: true, l: true, does: 'Opens the best-cookie / least-chocolate comparison card.' },
      { i: 'compare',      label: 'Compare products side by side',  t: true, l: true, does: 'Opens the side-by-side product comparison pane.' },
      { i: 'report',       label: 'Show me a pretty report',       t: true, l: true, does: 'Opens the Report builder as a nested sticky drawer and fills it with the conversation\u2019s formatted outputs.' },
      { i: 'cat',          label: 'If I identified as a cat…',     t: true, l: true, does: 'Easter egg — opens the cat-food card and posts the deadpan reply.' },
      { i: 'catnutrients', label: 'What nutrients do cats require?', t: true, l: true, does: 'Opens the cat-nutrient explainer card.' },
    ],
  },
  {
    label: 'AI Platform Dashboard', icon: 'monitoring', href: 'ai-dashboard.html', src: 'ai-dashboard.html',
    note: 'Ask-about-your-platform chips. Each now carries its own scripted transcript (intentReplies keyed by intent id) narrating the metric it answers; the dashboard beside the chat is a static read-out, so these are answer-only (no page side-effect).',
    chips: [
      { i: 'spend_rise',    label: 'Why did spend rise this period?',    t: true, l: false, does: 'Answer-only — narrates why spend rose this period. Dashboard is a static readout.' },
      { i: 'top_model',     label: 'Which model drives the most tokens?', t: true, l: false, does: 'Answer-only — narrates which model drives the most tokens.' },
      { i: 'guardrails',    label: 'Show guardrail activity',            t: true, l: false, does: 'Answer-only — narrates guardrail activity.' },
      { i: 'top_users',     label: 'Top users by consumption',           t: true, l: false, does: 'Answer-only — narrates top users by consumption.' },
      { i: 'stale_sources', label: 'Any stale data sources?',           t: true, l: false, does: 'Answer-only — narrates whether any data sources are stale.' },
    ],
  },
];

/* One chip's status from its two halves. */
function intentChipStatus(c) {
  if (c.t && c.l) return 'wired';
  if (c.t && !c.l) return 'talk';
  if (!c.t && c.l) return 'act';
  return 'none';
}

const INTENT_STATUS_META = {
  wired: { label: 'Wired',             icon: 'check_circle',     gap: false },
  talk:  { label: 'Needs logic',       icon: 'chat_bubble',      gap: true },
  act:   { label: 'Needs transcript',  icon: 'bolt',             gap: true },
  none:  { label: 'Unwired',           icon: 'error',            gap: true },
};

function intentAuditStats() {
  const s = { surfaces: INTENT_AUDIT.length, chips: 0, wired: 0, talk: 0, act: 0, none: 0 };
  INTENT_AUDIT.forEach((surf) => surf.chips.forEach((c) => {
    s.chips++;
    s[intentChipStatus(c)]++;
  }));
  s.gaps = s.talk + s.act + s.none;
  return s;
}

function allIntentRows() {
  const rows = [];
  INTENT_AUDIT.forEach((surf) => {
    surf.chips.forEach((c) => {
      rows.push({
        ...c,
        surface: surf.label,
        href: surf.href,
        src: surf.src,
        icon: surf.icon,
        status: intentChipStatus(c),
      });
    });
  });
  return rows;
}

function intentChipRow(c) {
  const meta = INTENT_STATUS_META[c.status];
  const search = `${c.label} ${c.i} ${c.surface} ${c.does || ''} ${c.status}`.toLowerCase();
  return `
    <div class="mi-int-trow" data-int-row data-int-id="${esc(c.href + '::' + c.i)}" data-status="${esc(c.status)}" data-search="${esc(search)}">
      <span class="mi-int-td mi-int-td--chip">
        <span class="mi-int-chip-dot mi-int-dot--${esc(c.status)}" title="${esc(meta.label)}"><span class="material-symbols-outlined">${esc(meta.icon)}</span></span>
        <span class="mi-int-chip-label">${esc(c.label)}</span>
      </span>
      <span class="mi-int-td"><code class="mi-int-chip-id">${esc(c.i)}</code></span>
      <span class="mi-int-td mi-int-td--surf">
        <a class="mi-int-sname" href="${esc(c.href)}">${esc(c.surface)}</a>
      </span>
      <span class="mi-int-td mi-int-td--flag">${c.t ? 'Yes' : 'No'}</span>
      <span class="mi-int-td mi-int-td--flag">${c.l ? 'Yes' : 'No'}</span>
      <span class="mi-int-td mi-int-td--does">${esc(c.does || (c.l ? 'Runs the matching on-page control.' : 'Answer-only — posts a transcript, no page action.'))}</span>
    </div>`;
}

/* The "call it out" panel — every chip that is missing a half, grouped by
   which half it's missing, so the gaps are impossible to miss. */
function intentGapCallout(stats) {
  if (!stats.gaps) {
    return `
      <div class="mi-int-callout is-clear">
        <span class="mi-int-callout-ic"><span class="material-symbols-outlined">verified</span></span>
        <div><strong>All ${stats.chips} intent chips are fully wired.</strong> Every chip across all ${stats.surfaces} surfaces carries both its own transcript and its own page logic.</div>
      </div>`;
  }
  const collect = (pred) => {
    const rows = [];
    INTENT_AUDIT.forEach((surf) => surf.chips.forEach((c) => {
      if (pred(c)) rows.push(`<li><span class="mi-int-gap-surf">${esc(surf.label)}</span><span class="mi-int-gap-chip">${esc(c.label)}</span></li>`);
    }));
    return rows.join('');
  };
  const talk = collect((c) => intentChipStatus(c) === 'talk');
  const act = collect((c) => intentChipStatus(c) === 'act');
  const none = collect((c) => intentChipStatus(c) === 'none');
  return `
    <div class="mi-int-callout">
      <div class="mi-int-callout-head">
        <span class="mi-int-callout-ic"><span class="material-symbols-outlined">report</span></span>
        <div><strong>${stats.gaps} chip${stats.gaps === 1 ? '' : 's'} ${stats.gaps === 1 ? 'is' : 'are'} missing a half.</strong> Each is reachable, but doesn’t satisfy the “transcript <em>and</em> logic” rule yet — fix the missing half or retire the chip.</div>
      </div>
      <div class="mi-int-gap-cols">
        <div class="mi-int-gap-col">
          <div class="mi-int-gap-title"><span class="material-symbols-outlined">bolt</span>Needs logic <span class="mi-int-gap-n">${stats.talk}</span></div>
          <p class="mi-int-gap-sub">Answers in the thread, but does nothing on the page.</p>
          <ul class="mi-int-gap-list">${talk || '<li class="is-empty">None</li>'}</ul>
        </div>
        <div class="mi-int-gap-col">
          <div class="mi-int-gap-title"><span class="material-symbols-outlined">chat_bubble</span>Needs its own transcript <span class="mi-int-gap-n">${stats.act}</span></div>
          <p class="mi-int-gap-sub">Drives the page, but has no chip-level reply (relies on a mirrored control).</p>
          <ul class="mi-int-gap-list">${act || '<li class="is-empty">None</li>'}</ul>
        </div>
        ${none ? `<div class="mi-int-gap-col">
          <div class="mi-int-gap-title mi-int-gap-title--bad"><span class="material-symbols-outlined">error</span>Fully unwired <span class="mi-int-gap-n">${stats.none}</span></div>
          <p class="mi-int-gap-sub">Falls through to the generic keyword fallback.</p>
          <ul class="mi-int-gap-list">${none}</ul>
        </div>` : ''}
      </div>
    </div>`;
}

/* Compact surface index — label + chip count, linking to that surface.
   These chips are not Dev Ready controls. */
function intentSurfaceReadyStrip() {
  return `
    <div class="mi-ready-kids" aria-label="Chips by surface">
      <h3 class="mi-ready-kids-title">By surface</h3>
      <div class="mi-ready-kids-row">
        ${INTENT_AUDIT.map((s) => `
          <a class="mi-ready-kid mi-ready-kid--plain" href="${esc(s.href)}">
            <span class="mi-ready-kid-label">${esc(s.label)}</span>
            <span class="mi-ready-kid-n">${s.chips.length}</span>
          </a>`).join('')}
      </div>
    </div>`;
}

function renderIntentAudit(opts) {
  if (opts && opts.headOnly) {
    return miHeadOnly('mi-intents', 'Intent Chip Logic',
      'Every WISEcodeAI dock ships one-tap <strong>intent chips</strong> on its welcome screen. A chip is only fully wired when it carries both halves — its own <strong>transcript</strong> (a scripted reply) and its own <strong>logic</strong> (an <code>onIntent</code> page action). Filter tiles and search narrow the same list.',
      moduleControlsHTML('mi-intents'));
  }
  const stats = intentAuditStats();
  return `
    <section class="mi-module is-collapsed" id="mi-intents">
      <header class="mi-module-head">
        <div class="mi-module-head-text">
          <h2 class="mi-module-title">Intent Chip Logic</h2>
          <p class="mi-module-lede">Every WISEcodeAI dock ships one-tap <strong>intent chips</strong> on its welcome screen. A chip
            is only fully wired when it carries both halves — its own <strong>transcript</strong> (a scripted reply) and its own
            <strong>logic</strong> (an <code>onIntent</code> page action). This table lists all <strong>${stats.chips} chips</strong>
            across <strong>${stats.surfaces} surfaces</strong> with the exact side-effect each one runs. Click a column header to
            sort. Filter tiles and search narrow the same list.</p>
        </div>
        ${moduleControlsHTML('mi-intents')}
      </header>

      ${intentSurfaceReadyStrip()}

      <div class="mi-int-stats">
        <button type="button" class="mi-int-stat is-active" data-int-filter="all" aria-pressed="true">
          <span class="mi-int-stat-num">${stats.chips}</span>
          <span class="mi-int-stat-label"><span class="mi-int-stat-text">All chips</span><span class="material-symbols-outlined">apps</span></span>
        </button>
        <button type="button" class="mi-int-stat mi-int-stat--ok" data-int-filter="wired" aria-pressed="false">
          <span class="mi-int-stat-num">${stats.wired}</span>
          <span class="mi-int-stat-label"><span class="mi-int-stat-text">Fully wired</span><span class="material-symbols-outlined">check_circle</span></span>
        </button>
        <button type="button" class="mi-int-stat mi-int-stat--warn" data-int-filter="talk" aria-pressed="false">
          <span class="mi-int-stat-num">${stats.talk}</span>
          <span class="mi-int-stat-label"><span class="mi-int-stat-text">Needs logic</span><span class="material-symbols-outlined">bolt</span></span>
        </button>
        <button type="button" class="mi-int-stat mi-int-stat--warn" data-int-filter="act" aria-pressed="false">
          <span class="mi-int-stat-num">${stats.act}</span>
          <span class="mi-int-stat-label"><span class="mi-int-stat-text">Needs transcript</span><span class="material-symbols-outlined">chat_bubble</span></span>
        </button>
        <button type="button" class="mi-int-stat mi-int-stat--bad" data-int-filter="none" aria-pressed="false">
          <span class="mi-int-stat-num">${stats.none}</span>
          <span class="mi-int-stat-label"><span class="mi-int-stat-text">Unwired</span><span class="material-symbols-outlined">error</span></span>
        </button>
      </div>

      ${intentGapCallout(stats)}

      <div class="mi-toolbar">
        <div class="mi-search-inline">
          <span class="material-symbols-outlined">search</span>
          <input type="search" class="mi-search" id="mi-int-search" placeholder="Search chips by name, intent, surface or logic…" aria-label="Search intent chips" autocomplete="off" />
        </div>
        <div class="mi-tbl-count"><span id="mi-int-shown">${stats.chips}</span> of ${stats.chips} chips</div>
      </div>

      <div class="mi-int-table" id="mi-int-table" style="--mi-int-cols: minmax(180px, 1.3fr) 140px minmax(140px, 1fr) 88px 72px minmax(240px, 2.2fr)">
        <div class="mi-int-thead">
          <span class="mi-int-th">Chip</span>
          <span class="mi-int-th">Intent</span>
          <span class="mi-int-th">Surface</span>
          <span class="mi-int-th">Transcript</span>
          <span class="mi-int-th">Logic</span>
          <span class="mi-int-th">What it does</span>
        </div>
        ${allIntentRows().map(intentChipRow).join('')}
      </div>
      <div class="mi-int-empty" id="mi-int-empty" hidden>No chips match this filter.</div>
    </section>`;
}

function wireIntentAudit(root) {
  const mod = root.querySelector('#mi-intents');
  if (!mod) return;
  const stats = mod.querySelector('.mi-int-stats');
  const empty = mod.querySelector('#mi-int-empty');
  const search = mod.querySelector('#mi-int-search');
  const shownEl = mod.querySelector('#mi-int-shown');
  let filter = 'all';
  let q = '';

  const apply = (nextFilter) => {
    if (nextFilter) filter = nextFilter;
    q = (search?.value || '').trim().toLowerCase();
    let shown = 0;
    mod.querySelectorAll('[data-int-row]').forEach((row) => {
      const statusOk = filter === 'all' || row.getAttribute('data-status') === filter;
      const searchOk = !q || (row.getAttribute('data-search') || '').includes(q);
      const vis = statusOk && searchOk;
      row.hidden = !vis;
      if (vis) shown++;
    });
    if (shownEl) shownEl.textContent = String(shown);
    if (empty) empty.hidden = shown !== 0;
    mod.querySelectorAll('[data-int-filter]').forEach((b) => {
      const on = b.getAttribute('data-int-filter') === filter;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  };

  if (stats) {
    stats.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-int-filter]');
      if (!btn) return;
      apply(btn.getAttribute('data-int-filter'));
    });
  }
  search?.addEventListener('input', () => apply());
  apply('all');
}

/* ------------------------------------------------------------------ */
/* App Logic module                                                    */
/*                                                                     */
/* Intent Chip Logic audits one narrow slice — "does each chip carry a */
/* transcript and a page action?". This module is everything else: the */
/* general rules the app runs on, written down and grouped by page so  */
/* they can be read without opening the source.                        */
/*                                                                     */
/* The catalog lives in js/app-logic-data.js (hand-maintained, and     */
/* hand-verified against the files each rule cites). Rendering here is */
/* deliberately plain — a card per page, a numbered rule list inside — */
/* because the value is the text, not the chrome. Area filter tiles    */
/* reuse the Module Directory tones so "Portfolio" means the same set  */
/* of pages in both modules; `shared` is the extra area for logic that */
/* runs on every page rather than on one screen.                       */
/* ------------------------------------------------------------------ */

function logicRuleCount() {
  if (!APP_LOGIC.length) return LOGIC_RULES_FALLBACK;
  return APP_LOGIC.reduce((n, p) => n + p.rules.length, 0);
}

/* Rules per area, in LOGIC_AREAS order, skipping areas with nothing in them
   so the tile row never shows a zero. */
function logicAreaStats() {
  const counts = {};
  APP_LOGIC.forEach((p) => { counts[p.area] = (counts[p.area] || 0) + p.rules.length; });
  return LOGIC_AREAS.filter((a) => counts[a.tone]).map((a) => ({ ...a, n: counts[a.tone] }));
}

function logicAreaTiles() {
  const all = `
    <button type="button" class="mi-int-stat is-active" data-logic-filter="all" aria-pressed="true">
      <span class="mi-int-stat-num">${logicRuleCount()}</span>
      <span class="mi-int-stat-label"><span class="mi-int-stat-text">All rules</span><span class="material-symbols-outlined">rule</span></span>
    </button>`;
  const tiles = logicAreaStats().map((a) => `
    <button type="button" class="mi-int-stat" data-logic-filter="${esc(a.tone)}" aria-pressed="false">
      <span class="mi-int-stat-num">${a.n}</span>
      <span class="mi-int-stat-label"><span class="mi-int-stat-text">${esc(a.label)}</span><span class="material-symbols-outlined">${esc(a.icon)}</span></span>
    </button>`);
  return [all, ...tiles].join('');
}

/* Compact page index — label + rule count, jumping to that page’s card.
   These chips are not Dev Ready controls. */
function logicPageIndex() {
  return `
    <div class="mi-ready-kids" aria-label="Rules by page">
      <h3 class="mi-ready-kids-title">By page</h3>
      <div class="mi-ready-kids-row">
        ${APP_LOGIC.map((p) => `
          <a class="mi-ready-kid mi-ready-kid--plain" href="#logic-${esc(p.id)}">
            <span class="mi-ready-kid-label">${esc(p.label)}</span>
            <span class="mi-ready-kid-n">${p.rules.length}</span>
          </a>`).join('')}
      </div>
    </div>`;
}

/* One rule row. `how` is trusted HTML from the catalog (it carries <code> and
   <strong>); the title and the search index are escaped. */
function logicRuleRow(page, rule, i) {
  const search = `${page.label} ${page.area} ${rule.title} ${String(rule.how).replace(/<[^>]+>/g, ' ')}`.toLowerCase();
  return `
    <li class="mi-logic-rule" data-logic-rule data-logic-title="${esc(rule.title)}" data-search="${esc(search)}">
      <span class="mi-logic-n" aria-hidden="true">${i + 1}</span>
      <div class="mi-logic-rule-body">
        <div class="mi-logic-rule-title">${esc(rule.title)}</div>
        <p class="mi-logic-how">${rule.how}</p>
      </div>
    </li>`;
}

function logicPageCard(page) {
  const name = page.href
    ? `<a class="mi-logic-name" href="${esc(page.href)}">${esc(page.label)}<span class="material-symbols-outlined">open_in_new</span></a>`
    : `<span class="mi-logic-name">${esc(page.label)}</span>`;
  const src = (page.src || []).map((f) => `<code>${esc(f)}</code>`).join('');
  const note = page.note
    ? `<p class="mi-logic-note"><span class="material-symbols-outlined">info</span><span>${esc(page.note)}</span></p>`
    : '';
  return `
    <article class="mi-logic-page" data-logic-page data-area="${esc(page.area)}" id="logic-${esc(page.id)}">
      <header class="mi-logic-head">
        <span class="mi-logic-ic"><span class="material-symbols-outlined">${esc(page.icon)}</span></span>
        <div class="mi-logic-titles">
          ${name}
          <span class="mi-logic-src">${src}</span>
        </div>
        <span class="mi-logic-count" data-logic-count>${page.rules.length} rule${page.rules.length === 1 ? '' : 's'}</span>
      </header>
      ${note}
      <ol class="mi-logic-rules">
        ${page.rules.map((r, i) => logicRuleRow(page, r, i)).join('')}
      </ol>
    </article>`;
}

function renderAppLogic(opts) {
  if (opts && opts.headOnly) {
    return miHeadOnly('mi-logic', 'App Logic',
      'The rules the app actually runs on, written down and grouped by page — auth, theme, navigation, pane widths, the carousel rail, tables, wizard gating, scoring math, filter semantics and what persists where. Each rule names the functions, keys and classes it lives in. The <strong>Intent Chip Logic</strong> module below audits the one slice of logic the chips own.',
      moduleReadyToggleHTML('mi-logic', 'App Logic') + moduleControlsHTML('mi-logic'));
  }
  const rules = logicRuleCount();
  const shared = APP_LOGIC.filter((p) => p.area === 'shared').length;
  return `
    <section class="mi-module is-collapsed" id="mi-logic">
      <header class="mi-module-head">
        <div class="mi-module-head-text">
          <h2 class="mi-module-title">App Logic</h2>
          <p class="mi-module-lede">The rules the app actually runs on, written down and grouped by page — auth, theme,
            navigation, pane widths, the carousel rail, tables, wizard gating, scoring math, filter semantics and what persists where.
            <strong>${rules} rules</strong> across <strong>${APP_LOGIC.length} pages</strong>, of which <strong>${shared}</strong>
            are shared subsystems that run on every page. Each rule names the functions, keys and classes it lives in, and
            each card links to the source files so it can be verified. Filter by area or search any rule.
            The <strong>Intent Chip Logic</strong> module below audits the one
            slice of logic the chips own.</p>
        </div>
        ${moduleReadyToggleHTML('mi-logic', 'App Logic')}
        ${moduleControlsHTML('mi-logic')}
      </header>

      ${logicPageIndex()}

      <div class="mi-int-stats" id="mi-logic-stats" role="group" aria-label="Filter rules by area">
        ${logicAreaTiles()}
      </div>

      <div class="mi-toolbar">
        <div class="mi-search-inline">
          <span class="material-symbols-outlined">search</span>
          <input type="search" class="mi-search" id="mi-logic-search" placeholder="Search rules by page, behavior, function or storage key…" aria-label="Search app logic rules" autocomplete="off" />
        </div>
        <div class="mi-tbl-count"><span id="mi-logic-shown">${rules}</span> of ${rules} rules</div>
      </div>

      <div class="mi-logic-grid" id="mi-logic-grid">
        ${APP_LOGIC.map(logicPageCard).join('')}
      </div>
      <div class="mi-int-empty" id="mi-logic-empty" hidden>No rules match this filter.</div>
    </section>`;
}

function wireAppLogic(root) {
  const mod = root.querySelector('#mi-logic');
  if (!mod) return;
  const tiles = mod.querySelector('#mi-logic-stats');
  const search = mod.querySelector('#mi-logic-search');
  const empty = mod.querySelector('#mi-logic-empty');
  const shownEl = mod.querySelector('#mi-logic-shown');
  let area = 'all';

  /* Search hides individual rules; the area filter hides whole pages. A page
     with no visible rules left hides itself, and its count pill reports what
     survived so the header never contradicts the list under it. */
  const apply = (nextArea) => {
    if (nextArea) area = nextArea;
    const q = (search?.value || '').trim().toLowerCase();
    let shown = 0;
    mod.querySelectorAll('[data-logic-page]').forEach((page) => {
      const areaOk = area === 'all' || page.getAttribute('data-area') === area;
      let visibleRules = 0;
      page.querySelectorAll('[data-logic-rule]').forEach((rule) => {
        const hit = areaOk && (!q || (rule.getAttribute('data-search') || '').includes(q));
        rule.hidden = !hit;
        if (hit) visibleRules++;
      });
      page.hidden = visibleRules === 0;
      const count = page.querySelector('[data-logic-count]');
      if (count) count.textContent = `${visibleRules} rule${visibleRules === 1 ? '' : 's'}`;
      shown += visibleRules;
    });
    if (shownEl) shownEl.textContent = String(shown);
    if (empty) empty.hidden = shown !== 0;
    mod.querySelectorAll('[data-logic-filter]').forEach((b) => {
      const on = b.getAttribute('data-logic-filter') === area;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  };

  tiles?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-logic-filter]');
    if (!btn) return;
    apply(btn.getAttribute('data-logic-filter'));
  });
  search?.addEventListener('input', () => apply());
  /* The shell scrolls an inner pane, so a raw hash on these chips would not
     move the card into view. */
  mod.querySelector('.mi-ready-kids')?.addEventListener('click', (e) => {
    const a = e.target.closest('a.mi-ready-kid');
    if (!a || !mod.contains(a)) return;
    const id = (a.getAttribute('href') || '').replace(/^#/, '');
    const target = id && document.getElementById(id);
    if (!target || target.hidden) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  apply('all');
}

/* ------------------------------------------------------------------ */
/* Streaming Trace — the anatomy of a WISEcodeAI "thinking" trace.     */
/*                                                                     */
/* Every WISEcodeAI turn streams a live trace while it works. It has    */
/* three moving parts, named here:                                      */
/*   • the HELIX — the DNA rail from js/trace-helix.js (the same rope   */
/*     the live chat draws). It twists while thinking, then freezes     */
/*     with green base-pair dots aligned to each completed step.        */
/*   • MAIN SECTIONS — the milestone keys the trace walks through, one   */
/*     on screen at a time (Reading → Gathering → Cross-checking →       */
/*     Composing). Each lands into the summary with the m:ss it took.    */
/*   • the GLOB — the subdued narration that streams in line by line     */
/*     beneath the active section. On THIS page the glob is always a     */
/*     HAIKU (5·7·5), so the anatomy reads at a glance.                  */
/* Shown in three states side by side: the live animation, a mid-       */
/* animation still (paused), and the finished summary. How much of the  */
/* trace appears in chat is the ⋯ menu's Response streaming toggle:     */
/* Full (steps + glob), Steps (keys only), or Final (no trace).         */
/* Rendered live with the real .sc-trace* classes from pages/wise.css   */
/* (loaded on this page), so the demo looks exactly like the live chat. */
/* ------------------------------------------------------------------ */

/* Each entry is a MAIN SECTION: a pool of interchangeable 1–3 word `keys`
   (so the label varies on replay) and a pool of `haiku` globs, each a strict
   5·7·5 triplet. Per replay we materialize one key + one haiku per section,
   so no two runs read the same while the arc stays coherent. */
const TRACE_MILESTONES = [
  {
    keys: ['Reading', 'Parsing intent', 'Framing the ask'],
    haiku: [
      ['Your words, read them twice', 'once for sense, once for the want', 'beneath the asking'],
      ['The thread pulled back through', 'the chat; nothing left adrift', 'scope drawn gently tight'],
    ],
  },
  {
    keys: ['Gathering', 'Sourcing', 'Foraging'],
    haiku: [
      ['Row by patient row', 'the registry walked; stale things', 'quietly let go'],
      ['Barcodes that agree', 'kept close; the quarrelers flagged', 'freshness weighed with care'],
    ],
  },
  {
    keys: ['Cross-checking', 'Stress-testing', 'Second-guessing'],
    haiku: [
      ['The tidy answer', 'poked at, to see if it holds', 'edges invited in'],
      ['What I had assumed', 'held against what the data', 'plainly says is true'],
    ],
  },
  {
    keys: ['Composing', 'Distilling', 'Writing it plain'],
    haiku: [
      ['Facts folded to words', 'the number that matters, first', 'caveats tucked in'],
      ['Every posturing', 'sentence, cut; read back to you', 'short where short is fair'],
    ],
  },
];

/* Frozen stills always use the first key + first haiku so they stay readable
   next to the live replay (which picks randomly). Mid-stream freezes two
   finished sections plus a third still landing; finished is the quiet summary. */
const TRACE_STILL_TIMES = ['0:06', '0:13', '0:19', '0:24'];

function traceLiveBlockHtml(key, lines, done) {
  return `<div class="sc-trace-live${done ? ' is-done' : ''}">`
    + `<div class="sc-trace-now"><span class="sc-trace-now-key">${esc(key)}</span></div>`
    + `<div class="sc-trace-story">${(lines || []).map((line) =>
      `<span class="sc-trace-story-line is-in">${esc(line)}</span>`).join('')}</div></div>`;
}

function traceStillHeadHtml(title, timer, open) {
  return `<button type="button" class="sc-trace-head" aria-expanded="${open ? 'true' : 'false'}">`
    + `<span class="sc-trace-title">${esc(title)}</span>`
    + `<span class="sc-trace-timer" aria-hidden="true">${esc(timer)}</span>`
    + `<span class="sc-trace-caret material-symbols-outlined" aria-hidden="true">chevron_right</span>`
    + `</button>`;
}

function traceStillMidHtml() {
  const a = TRACE_MILESTONES[0], b = TRACE_MILESTONES[1], c = TRACE_MILESTONES[2];
  return TRACE_STRAND_MARKUP
    + traceLiveBlockHtml(a.keys[0], a.haiku[0], true)
    + traceLiveBlockHtml(b.keys[0], b.haiku[0], true)
    + traceLiveBlockHtml(c.keys[0], c.haiku[0].slice(0, 2), false);
}

function traceStillDoneHtml() {
  const last = TRACE_STILL_TIMES[TRACE_STILL_TIMES.length - 1];
  return TRACE_STRAND_MARKUP
    + `<ul class="sc-trace-steps">${TRACE_MILESTONES.map((m, i) =>
      `<li class="sc-trace-step is-revealed"><span class="sc-trace-step-key">${esc(m.keys[0])}</span>`
      + `<span class="sc-trace-step-time" aria-hidden="true">${esc(TRACE_STILL_TIMES[i] || last)}</span></li>`
    ).join('')}</ul>`;
}

function renderStreamingTrace(opts) {
  if (opts && opts.headOnly) {
    return miHeadOnly('mi-trace', 'Streaming Trace',
      'The “thinking” trace every WISEcodeAI turn streams while it works, shown here in three states: the <strong>live animation</strong>, a <strong>mid-animation still</strong> (paused), and the <strong>finished</strong> summary. Rendered with the same <code>.sc-trace</code> classes the chat uses.',
      moduleReadyToggleHTML('mi-trace', 'Streaming Trace') + moduleControlsHTML('mi-trace'));
  }
  const sections = TRACE_MILESTONES.length;
  const last = TRACE_STILL_TIMES[TRACE_STILL_TIMES.length - 1];
  return `
    <section class="mi-module is-collapsed" id="mi-trace">
      <header class="mi-module-head">
        <div class="mi-module-head-text">
          <h2 class="mi-module-title">Streaming Trace</h2>
          <p class="mi-module-lede">The “thinking” trace every WISEcodeAI turn streams while it works, shown here in
            three states: the <strong>live animation</strong>, a <strong>mid-animation still</strong> (paused), and
            the <strong>finished</strong> summary. The <strong>helix</strong> is the DNA rail that twists on the left —
            the same animation the live chat draws. The <strong>main sections</strong> are the ${sections} milestones
            — <em>Reading → Gathering → Cross-checking → Composing</em> — and beneath each, the <strong>glob</strong>
            of subdued narration streams in line by line. On this page the glob is <strong>always a haiku</strong>
            (5·7·5). How much of that appears in chat is a ⋯ menu choice: <strong>Response streaming</strong> on or
            off, then <strong>Streaming detail</strong> — Full, Steps, or Final. Rendered with the same
            <code>.sc-trace</code> classes the chat uses.</p>
        </div>
        ${moduleReadyToggleHTML('mi-trace', 'Streaming Trace')}
        ${moduleControlsHTML('mi-trace')}
      </header>

      <div class="mi-trace">
        <div class="mi-trace-stages">
          <article class="mi-trace-card">
            <div class="mi-trace-card-head">
              <h3 class="mi-trace-card-title">Live animation</h3>
              ${readyToggleHTML('trace:live', 'Live animation', { level: 'item', parent: 'mi-trace' })}
            </div>
            <p class="mi-trace-card-lede">Playing — helix twists, sections land, glob streams. Replay to watch it again. The
              Streaming detail control below changes how much of this run you see.</p>
            <div class="sc-trace" data-open="0" id="mi-trace-live">
              <button type="button" class="sc-trace-head" aria-expanded="false">
                <span class="sc-trace-title">Thinking</span>
                <span class="sc-trace-timer" aria-hidden="true">0:00</span>
                <span class="sc-trace-caret material-symbols-outlined" aria-hidden="true">chevron_right</span>
              </button>
              <div class="sc-trace-body">${TRACE_STRAND_MARKUP}</div>
            </div>
            <button type="button" class="mi-trace-run" data-trace-run>
              <span class="material-symbols-outlined">replay</span><span data-trace-run-label>Replay trace</span>
            </button>
          </article>

          <article class="mi-trace-card">
            <div class="mi-trace-card-head">
              <h3 class="mi-trace-card-title">Mid-animation · paused</h3>
              ${readyToggleHTML('trace:mid', 'Mid-animation · paused', { level: 'item', parent: 'mi-trace' })}
            </div>
            <p class="mi-trace-card-lede">Frozen mid-stream at Full detail: two sections done, the third still landing.
              Helix, title pulse, and key shimmer are paused so you can read the pose.</p>
            <div class="sc-trace is-paused" data-open="1" id="mi-trace-mid">
              ${traceStillHeadHtml('Thinking', TRACE_STILL_TIMES[2], true)}
              <div class="sc-trace-body">${traceStillMidHtml()}</div>
            </div>
          </article>

          <article class="mi-trace-card">
            <div class="mi-trace-card-head">
              <h3 class="mi-trace-card-title">Finished</h3>
              ${readyToggleHTML('trace:done', 'Finished', { level: 'item', parent: 'mi-trace' })}
            </div>
            <p class="mi-trace-card-lede">The quiet summary after the last glob: each milestone key plus the m:ss it
              took. Helix frozen, every base-pair dot green.</p>
            <div class="sc-trace is-complete" data-open="1" id="mi-trace-done">
              ${traceStillHeadHtml(`Worked for ${last}`, `${sections} steps`, true)}
              <div class="sc-trace-body">${traceStillDoneHtml()}</div>
            </div>
          </article>
        </div>

        <div class="mi-trace-notes">
          <div class="mi-trace-levels">
            <div class="mi-trace-card-head">
              <h3 class="mi-trace-card-title">Streaming detail</h3>
              ${readyToggleHTML('trace:detail', 'Streaming detail', { level: 'item', parent: 'mi-trace' })}
            </div>
            <p class="mi-trace-card-lede">Every chat’s ⋯ menu has a <strong>Response streaming</strong> switch. When it
              is on, <strong>Streaming detail</strong> picks how much thinking you see before the answer lands. Each
              load starts ON at <strong>Full</strong>. The stills above stay at Full so the animation anatomy is
              visible; this control drives the live card.</p>
            <div class="mi-trace-seg" role="radiogroup" aria-label="Streaming detail">
              <button type="button" class="mi-trace-seg-btn is-on" data-trace-level="full" role="radio" aria-checked="true" title="Full thinking">Full</button>
              <button type="button" class="mi-trace-seg-btn" data-trace-level="steps" role="radio" aria-checked="false" title="Steps only">Steps</button>
              <button type="button" class="mi-trace-seg-btn" data-trace-level="final" role="radio" aria-checked="false" title="Final only">Final</button>
            </div>
            <ul class="mi-trace-level-list">
              <li><strong>Full</strong> — every milestone step plus the glob story under each (the default, and what
                the paused and finished stills show).</li>
              <li><strong>Steps</strong> — milestone keys only, landing one after another. No glob text in between.</li>
              <li><strong>Final</strong> — no trace at all. A brief thinking beat, then the answer. No helix, no
                steps, no glob.</li>
            </ul>
          </div>
          <ul class="mi-trace-legend">
            <li class="mi-trace-leg">
              <span class="mi-trace-leg-swatch mi-trace-leg-swatch--helix" aria-hidden="true"></span>
              <span><strong>Helix</strong> — the DNA rail that twists while thinking, then freezes with green
                base-pair dots aligned to each completed step.</span>
            </li>
            <li class="mi-trace-leg">
              <span class="mi-trace-leg-swatch mi-trace-leg-swatch--key" aria-hidden="true"></span>
              <span><strong>Main section</strong> — the milestone the trace is on. One shows at a time, then lands into
                the summary with the m:ss it took.</span>
            </li>
            <li class="mi-trace-leg">
              <span class="mi-trace-leg-swatch mi-trace-leg-swatch--glob" aria-hidden="true"></span>
              <span><strong>Glob</strong> — the narration under each section. Always a <strong>haiku</strong>: three
                lines, 5·7·5. Hidden when Streaming detail is Steps or Final.</span>
            </li>
          </ul>
        </div>
      </div>
    </section>`;
}

function wireStreamingTrace(root) {
  const mod = root.querySelector('#mi-trace');
  if (!mod) return;
  const trace = mod.querySelector('#mi-trace-live');
  const midTrace = mod.querySelector('#mi-trace-mid');
  const doneTrace = mod.querySelector('#mi-trace-done');
  const head = trace.querySelector('.sc-trace-head');
  const titleEl = trace.querySelector('.sc-trace-title');
  const timerEl = trace.querySelector('.sc-trace-timer');
  const bodyEl = trace.querySelector('.sc-trace-body');
  const runBtn = mod.querySelector('[data-trace-run]');
  const runLabel = mod.querySelector('[data-trace-run-label]');

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const fmtClock = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };

  /* A run token — bumping it cancels any timers still queued from a prior run,
     so hammering Replay never leaves two traces streaming over each other. */
  let token = 0;
  let helix = null;
  let midHelix = null;
  let doneHelix = null;
  let started = false;
  let stillsPainted = false;
  /* Same three-way choice as the chat ⋯ menu (wise:chat-stream-level): full
     globs, steps only, or final message only. Local to this demo. */
  let streamLevel = 'full';

  const killHelix = () => {
    if (helix) { helix.destroy(); helix = null; }
  };

  const bindTraceToggle = (el, getHelix) => {
    const btn = el && el.querySelector('.sc-trace-head');
    if (!el || !btn) return;
    btn.addEventListener('click', () => {
      const open = el.getAttribute('data-open') === '1';
      el.setAttribute('data-open', open ? '0' : '1');
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      const h = getHelix();
      if (h) h.redraw();
    });
  };
  bindTraceToggle(trace, () => helix);
  bindTraceToggle(midTrace, () => midHelix);
  bindTraceToggle(doneTrace, () => doneHelix);

  const paintStills = () => {
    if (mod.classList.contains('is-collapsed')) return;
    const midBody = midTrace && midTrace.querySelector('.sc-trace-body');
    const doneBody = doneTrace && doneTrace.querySelector('.sc-trace-body');
    if (midBody) {
      if (midHelix) { midHelix.destroy(); midHelix = null; }
      /* Reduced-motion start = draw once and stay. A mid-twist phase so the
         paused rail doesn't sit at the symmetric 0° pose. */
      midHelix = makeTraceHelix(midBody, { prefersReducedMotion: true, phase: 1.15 });
      midHelix.startLive();
    }
    if (doneBody) {
      if (doneHelix) { doneHelix.destroy(); doneHelix = null; }
      doneHelix = makeTraceHelix(doneBody, { prefersReducedMotion: true });
      const freezeDone = () => {
        if (!doneHelix) return;
        doneHelix.freezeAligned(measureTraceRungCentres(doneBody));
        doneHelix.setGreen(TRACE_MILESTONES.length);
      };
      requestAnimationFrame(() => requestAnimationFrame(freezeDone));
      setTimeout(freezeDone, 80);
    }
    stillsPainted = true;
  };

  const stepsHtml = (landmarks, revealed) => TRACE_STRAND_MARKUP
    + `<ul class="sc-trace-steps">${landmarks.map((l) =>
      `<li class="sc-trace-step${revealed ? ' is-revealed' : ''}"><span class="sc-trace-step-key">${esc(l.key)}</span>`
      + `<span class="sc-trace-step-time" aria-hidden="true">${esc(l.time)}</span></li>`).join('')}</ul>`;

  const finish = (landmarks, elapsed, myToken) => {
    if (myToken !== token) return;
    const total = landmarks.length ? landmarks[landmarks.length - 1].time : fmtClock(elapsed);
    bodyEl.innerHTML = stepsHtml(landmarks, reduced);
    titleEl.textContent = `Worked for ${total}`;
    timerEl.textContent = `${landmarks.length} step${landmarks.length === 1 ? '' : 's'}`;
    trace.classList.add('is-complete');
    runBtn.disabled = false;
    if (runLabel) runLabel.textContent = 'Replay trace';
    if (!helix) helix = makeTraceHelix(bodyEl, { prefersReducedMotion: reduced });
    helix.freezeAligned(measureTraceRungCentres(bodyEl));
    if (reduced) {
      helix.setGreen(landmarks.length);
      return;
    }
    /* Sweep the strand green from the top, one dot at a time — same cadence as
       the live chat. */
    const stepEls = Array.from(bodyEl.querySelectorAll('.sc-trace-step'));
    stepEls.forEach((li, i) => {
      setTimeout(() => {
        if (myToken !== token) return;
        helix.setGreen(i + 1);
        li.classList.add('is-revealed');
      }, 160 + i * 420);
    });
  };

  const runFinal = (myToken) => {
    trace.classList.remove('is-complete');
    trace.setAttribute('data-open', '1');
    head.setAttribute('aria-expanded', 'true');
    titleEl.textContent = 'Thinking';
    timerEl.textContent = '';
    bodyEl.innerHTML = '<p class="mi-trace-final-note">Final only — the helix, steps, and glob never appear. A brief thinking beat stands in, then the answer streams in.</p>';
    runBtn.disabled = true;
    if (runLabel) runLabel.textContent = 'Thinking…';
    setTimeout(() => {
      if (myToken !== token) return;
      titleEl.textContent = 'Answer ready';
      timerEl.textContent = '';
      bodyEl.innerHTML = '<p class="mi-trace-final-note">The answer lands next. No summary row, no green dots — Streaming detail is Final.</p>';
      runBtn.disabled = false;
      if (runLabel) runLabel.textContent = 'Replay beat';
    }, reduced ? 200 : 700);
  };

  const run = () => {
    const myToken = ++token;
    started = true;
    killHelix();
    if (streamLevel === 'final') { runFinal(myToken); return; }

    const showGlobs = streamLevel === 'full';
    const steps = TRACE_MILESTONES.map((m) => ({ key: pick(m.keys), haiku: pick(m.haiku) }));
    trace.classList.remove('is-complete');
    trace.setAttribute('data-open', '1');
    head.setAttribute('aria-expanded', 'true');
    titleEl.textContent = 'Thinking';
    timerEl.textContent = '0:00';
    bodyEl.innerHTML = TRACE_STRAND_MARKUP;
    runBtn.disabled = true;
    if (runLabel) runLabel.textContent = 'Thinking…';

    helix = makeTraceHelix(bodyEl, { prefersReducedMotion: reduced });
    helix.startLive();

    const start = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const now = () => ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - start;
    const landmarks = [];

    /* Reduced motion: skip the streaming and show the finished summary at once
       with plausible stamps. */
    if (reduced) {
      let acc = 0;
      steps.forEach((m) => { acc += 900 + Math.round(Math.random() * 1400); landmarks.push({ key: m.key, time: fmtClock(acc) }); });
      finish(landmarks, acc, myToken);
      return;
    }

    const timer = setInterval(() => {
      if (myToken !== token) { clearInterval(timer); return; }
      timerEl.textContent = fmtClock(now());
    }, 200);

    let mi = 0;
    const runMilestone = () => {
      if (myToken !== token) { clearInterval(timer); return; }
      if (mi >= steps.length) { clearInterval(timer); finish(landmarks, now(), myToken); return; }
      const m = steps[mi];
      /* Append a NEW section block below the previous ones — the haiku globs
         build on each other into one growing narrative, never wiping the last.
         Steps-only drops the glob so the run is just keys landing in sequence. */
      const block = document.createElement('div');
      block.className = 'sc-trace-live';
      block.innerHTML = '<div class="sc-trace-now"><span class="sc-trace-now-key"></span></div>'
        + '<div class="sc-trace-story"></div>';
      block.querySelector('.sc-trace-now-key').textContent = m.key;
      bodyEl.appendChild(block);
      const storyEl = block.querySelector('.sc-trace-story');
      const lines = showGlobs ? m.haiku.slice() : [];
      let si = 0;
      const streamLine = () => {
        if (myToken !== token) { clearInterval(timer); return; }
        if (si >= lines.length) {
          block.classList.add('is-done');
          landmarks.push({ key: m.key, time: fmtClock(now()) });
          mi += 1;
          setTimeout(runMilestone, showGlobs ? rnd(240, 480) : rnd(360, 640));
          return;
        }
        const sp = document.createElement('span');
        sp.className = 'sc-trace-story-line';
        sp.textContent = lines[si];
        storyEl.appendChild(sp);
        requestAnimationFrame(() => sp.classList.add('is-in'));
        si += 1;
        setTimeout(streamLine, rnd(360, 720));
      };
      setTimeout(streamLine, showGlobs ? rnd(160, 340) : 80);
    };
    setTimeout(runMilestone, rnd(240, 520));
  };

  runBtn.addEventListener('click', run);

  mod.querySelectorAll('[data-trace-level]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lvl = btn.getAttribute('data-trace-level');
      if (lvl !== 'full' && lvl !== 'steps' && lvl !== 'final') return;
      if (lvl === streamLevel) return;
      streamLevel = lvl;
      mod.querySelectorAll('[data-trace-level]').forEach((el) => {
        const on = el === btn;
        el.classList.toggle('is-on', on);
        el.setAttribute('aria-checked', on ? 'true' : 'false');
      });
      if (started) run();
    });
  });

  /* Don't spin the helix while the accordion is closed (height 0). Paint the
     paused / finished stills and start the first live run the moment the
     section opens; Replay always runs immediately. */
  const startWhenOpen = () => {
    if (mod.classList.contains('is-collapsed')) return;
    if (!stillsPainted) paintStills();
    else {
      if (midHelix) midHelix.redraw();
      if (doneHelix) doneHelix.redraw();
    }
    if (!started) run();
  };
  startWhenOpen();
  new MutationObserver(startWhenOpen).observe(mod, { attributes: true, attributeFilter: ['class'] });
}

/* ------------------------------------------------------------------ */
/* Transcript Architecture — one frozen conversation, every layer     */
/* labeled. Chats → activity → strip → turns → tokens / outputs →    */
/* versions. Arrows are measured to the live targets when the         */
/* accordion opens, and again if the stage is resized.                */
/* ------------------------------------------------------------------ */

function tarchLabelHtml(layer) {
  const jump = layer.jump
    ? `<a class="mi-tarch-jump" href="#${esc(compDomId(layer.jump))}" data-tarch-jump="${esc(layer.jump)}">${esc(layer.jump)}</a>`
    : '';
  return `
    <div class="mi-tarch-label" data-tarch-label="${esc(layer.id)}" data-tarch-side="${esc(layer.side)}" role="button" tabindex="0">
      <span class="mi-tarch-label-ic" aria-hidden="true"><span class="material-symbols-outlined">${esc(layer.icon)}</span></span>
      <span class="mi-tarch-label-copy">
        <span class="mi-tarch-label-title">${esc(layer.title)}</span>
        <span class="mi-tarch-label-body">${esc(layer.body)}</span>
        ${jump}
      </span>
      <span class="mi-tarch-dot" aria-hidden="true"></span>
    </div>`;
}

function tarchPin(side) {
  return `<i class="mi-tarch-pin" data-tarch-side="${esc(side)}" aria-hidden="true"></i>`;
}

function tarchHit(id, side, inner) {
  return `<span class="mi-tarch-hit" data-tarch-target="${esc(id)}" id="mi-tarch-target-${esc(id)}">${inner}${tarchPin(side)}</span>`;
}

/* Pin the arrow on the chip itself (or the version stack), not the
   full-width slot that wraps it. */
function tarchChip(id, side, opts) {
  const pin = tarchPin(side);
  const hitAttr = ` data-tarch-target="${esc(id)}" id="mi-tarch-target-${esc(id)}"`;
  const html = outputChipHTML(opts);
  if ((opts.versions || []).length > 1) {
    return html
      .replace('<div class="sc-surface-stack">', `<div class="sc-surface-stack mi-tarch-hit"${hitAttr}>`)
      .replace('</div>\n        <div class="sc-surface-body">', pin + '</div>\n        <div class="sc-surface-body">');
  }
  return html
    .replace('<div class="sc-surface-card', `<div class="sc-surface-card mi-tarch-hit`)
    .replace(' role="button"', hitAttr + ' role="button"')
    .replace('</div>\n    </div>\n  </div>', '</div>\n    ' + pin + '</div>\n  </div>');
}

function tarchTick(type, opts) {
  return `<span class="mi-tarch-tick" data-tarch-tick="${esc(opts.tick)}">${demoActTick(type, opts)}</span>`;
}

function tarchTokensHtml() {
  return '<div class="mi-tarch-tokens">'
    + '<div class="sc-activity-dots" aria-hidden="true"><span></span><span></span><span></span></div>'
    + '<span class="mi-tarch-tokens-val">1.3k in / 412 out · <b>$0.003</b></span>'
    + '</div>';
}

function tarchReplyChips(items) {
  return `<div class="sc-reply-chips">${items.map((c) =>
    `<button type="button" class="chip" tabindex="-1"><span class="material-symbols-outlined">${esc(c.icon)}</span>${esc(c.label)}</button>`
  ).join('')}</div>`;
}

function tarchHistoryHtml() {
  return `
    <aside class="mi-tarch-history dsc-wch">
      <div class="wch-projects">
        <div class="wch-projects-head"><span class="wch-projects-title">Conversations</span></div>
        ${tarchHit('chats', 'left', demoWchItem({ title: 'Compare oat milk vs almond milk', color: '#2F6DF6', active: true }))}
        ${demoWchItem({ title: 'UPF report for granola', color: '#F59E0B', fork: true })}
        ${demoWchItem({ title: 'What can I ask about oat milk?', color: '#06B6D4', live: true })}
      </div>
    </aside>`;
}

function tarchTurnsHtml() {
  return `
    <aside class="mi-tarch-turns dsc-demo" data-tarch-target="turns" id="mi-tarch-target-turns">
      <div class="mi-tarch-turns-head">
        <span class="mi-tarch-turns-title">Turns</span>
        <span class="mi-tarch-turns-admin">Admin</span>
      </div>
      <div class="wt-turn">
        <div class="wt-turn-head"><span class="wt-turn-num">1</span><span class="wt-turn-q">Compare oat milk vs almond milk on processing.</span></div>
        <div class="wt-actions">
          <button type="button" class="wt-fork" tabindex="-1" aria-label="Fork from here"><span class="material-symbols-outlined">alt_route</span></button>
          <span class="wt-fork-id">#3a1c</span>
        </div>
      </div>
      <div class="wt-turn">
        <div class="wt-turn-head"><span class="wt-turn-num">2</span><span class="wt-turn-q">Redo that comparison with gums called out.</span></div>
        <div class="wt-actions">
          <button type="button" class="wt-fork" tabindex="-1" aria-label="Fork from here"><span class="material-symbols-outlined">alt_route</span></button>
          <span class="wt-fork-id">#6d7a</span>
        </div>
      </div>
      ${tarchPin('right')}
    </aside>`;
}

function tarchCwrHtml() {
  return `<div class="mi-tarch-cwr" data-tarch-target="cwr" id="mi-tarch-target-cwr">${demoCwrPill(null, 'run')}${tarchPin('right')}</div>`;
}

function tarchSpecimenHtml() {
  return `
    <div class="mi-tarch-specimen dsc-demo" aria-hidden="true">
      ${tarchHistoryHtml()}
      <div class="mi-tarch-chat">
        <div class="chat-topbar">
          <div class="sc-topbar-lead">
            <div class="sc-bug">${DEMO_OWL_BUG}</div>
            <div class="sc-topbar-titles"><span class="topbar-title">WISEcodeAI</span></div>
          </div>
          <div class="sc-topbar-controls">
            ${tarchHit('menu', 'right', `<button type="button" class="panel-more-btn" tabindex="-1" aria-label="More options"><span class="material-symbols-outlined">more_vert</span></button>`)}
          </div>
        </div>
        <div class="mi-tarch-thread">
          <div class="mi-tarch-strip">
            <div class="wa-activity-rail mi-tarch-hit" data-tarch-target="strips" id="mi-tarch-target-strips">${tarchPin('left')}</div>
            ${tarchTick('output', { id: '3a1c', tick: 'outputs' })}
            ${tarchTick('output', { stacked: true, id: '6d7a', tick: 'versions' })}
            ${tarchTick('database', { id: '9f04', tick: 'activity' })}
            ${tarchTick('source', { id: 'b12e', tick: 'source' })}
          </div>
          ${tarchHit('fork', 'left', `<div class="sc-fork-banner"><span class="material-symbols-outlined sc-fork-banner-ic">alt_route</span><span class="sc-fork-banner-txt">Forked from <strong>Compare oat-milk brands for gut health</strong></span></div>`)}
          ${tarchHit('lines', 'left', `<div class="sc-line sc-line-you">${demoYouAvatar()}<div class="sc-line-body">Compare oat milk vs almond milk on processing.<div class="sc-line-meta"><span class="sc-line-time">12 min ago</span></div></div></div>`)}
          <div class="sc-line sc-line-wiseai">${demoWiseAvatar()}<div class="sc-line-body">
            <span class="sc-para">Oat milk scores higher on processing; almond milk wins on additives. Both sit in the same WISEscore band — the split is <strong>gellan</strong> versus <strong>locust bean</strong>.</span>
            ${tarchChip('outputs', 'right', { title: 'Oat milk vs almond milk', versions: [OUTPUT_CHIP_VERS[0]] })}
            ${tarchHit('actions', 'right', demoFbRow())}
            ${tarchHit('chips', 'right', tarchReplyChips([
              { icon: 'science', label: 'Break down the gums' },
              { icon: 'replay', label: 'Redo with oils called out' },
            ]))}
          </div></div>
          ${tarchHit('activity', 'left', `<div class="sc-line sc-line-you sc-line-event" data-activity="database" role="note">${demoYouAvatar()}<div class="sc-line-body"><span class="sc-event-label">Switched database from</span> <strong>Postgres (DEV)</strong> to <strong>Postgres (UAT)</strong><div class="sc-line-meta"><span class="sc-line-time">8 min ago</span><span class="sc-fb-id">#9f04</span></div></div></div>`)}
          <div class="sc-line sc-line-you">${demoYouAvatar()}<div class="sc-line-body">Redo that comparison with gums called out.<div class="sc-line-meta"><span class="sc-line-time">6 min ago</span></div></div></div>
          <div class="sc-line sc-line-wiseai">${demoWiseAvatar()}<div class="sc-line-body">
            <span class="sc-para">Same pair. v1 was the first pass, v2 added oils, v3 is the gum stack — the one open on the right.</span>
            ${tarchChip('versions', 'right', { title: 'Oat milk vs almond milk', versions: OUTPUT_CHIP_VERS, hover: true, activeVer: 3 })}
            ${demoFbRow()}
            ${tarchReplyChips([
              { icon: 'restaurant', label: 'Which SKU should I reformulate?' },
              { icon: 'verified', label: 'Check GRAS on the gums' },
            ])}
          </div></div>
        </div>
        <div class="chat-input-rail">
          ${tarchHit('composer', 'left', demoComposerHtml({ value: 'Compare these three oat milks on gums.' }))}
          <div class="sc-belowinput">
            ${tarchHit('tokens', 'right', tarchTokensHtml())}
          </div>
        </div>
        ${tarchCwrHtml()}
      </div>
      ${tarchTurnsHtml()}
    </div>`;
}

function renderTranscriptArch(opts) {
  if (opts && opts.headOnly) {
    return miHeadOnly('mi-tarch', 'Transcript Architecture',
      'One frozen conversation. Every visible piece is labeled — History, the strip, transcript lines, output chips, the admin <strong>Turns</strong> drawer, Roll · Crawl · Walk · Run — with an arrow to the element and a link to its card in the Component Library.');
  }
  const left = TARCH_LAYERS.filter((l) => l.side === 'left');
  const right = TARCH_LAYERS.filter((l) => l.side === 'right');
  return `
    <section class="mi-module is-collapsed" id="mi-tarch">
      <header class="mi-module-head">
        <div class="mi-module-head-text">
          <h2 class="mi-module-title">Transcript Architecture</h2>
          <p class="mi-module-lede">One frozen conversation. Every visible piece is labeled, with an arrow to that
            element and a link that opens its card in the Component Library. <strong>Turns</strong> is the admin
            sticky drawer on the right — not a question and answer in the thread.</p>
        </div>
      </header>
      <div class="mi-tarch">
        <div class="mi-tarch-stage" id="mi-tarch-stage">
          <svg class="mi-tarch-arrows" aria-hidden="true"></svg>
          <div class="mi-tarch-col mi-tarch-col--left">${left.map(tarchLabelHtml).join('')}</div>
          ${tarchSpecimenHtml()}
          <div class="mi-tarch-col mi-tarch-col--right">${right.map(tarchLabelHtml).join('')}</div>
        </div>
      </div>
    </section>`;
}

function wireTranscriptArch(root) {
  const mod = root.querySelector('#mi-tarch');
  if (!mod) return;
  const stage = mod.querySelector('#mi-tarch-stage');
  if (!stage) return;
  const svg = stage.querySelector('.mi-tarch-arrows');
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Prefer the real control inside the hit — version thumbs, the chip,
     the three dots, the rail — never the full-width row that wraps it. */
  const TARCH_AIM = {
    chats: '.wch-item',
    fork: '.sc-fork-banner',
    lines: '.sc-avatar-you, .sc-line-you',
    strips: null,
    activity: '.sc-line-event, .sc-avatar-you',
    composer: '.fl-input-wrap, [data-wise-composer]',
    menu: '.panel-more-btn',
    outputs: '.sc-surface-thumb, .sc-surface-card',
    actions: '.sc-fb, .sc-fb-wrap',
    chips: '.sc-reply-chips, .chip',
    versions: '.sc-surface-thumb.is-active, .sc-surface-stack, .sc-surface-thumb',
    tokens: '.sc-activity-dots, .mi-tarch-tokens',
    turns: '.wt-turn, .mi-tarch-turns-head',
    cwr: '.mi-cwr, .cwr-btn',
  };

  const boxOk = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return (r.width > 2 && r.height > 2) ? el : null;
  };

  const pinOf = (id) => {
    const hit = stage.querySelector('[data-tarch-target="' + id + '"]');
    if (!hit) return null;
    if (id === 'strips') return boxOk(hit.closest('.wa-activity-rail')) || boxOk(hit);
    const sel = TARCH_AIM[id];
    if (sel) {
      for (const part of sel.split(',').map((s) => s.trim())) {
        if (hit.matches && hit.matches(part) && boxOk(hit)) return hit;
        const inner = boxOk(hit.querySelector(part));
        if (inner) return inner;
      }
    }
    return boxOk(hit.querySelector('.mi-tarch-pin')) || boxOk(hit) || hit;
  };

  const aimPoint = (id, el, sr, w, h) => {
    const layer = TARCH_LAYERS.find((l) => l.id === id);
    const side = layer ? layer.side : 'left';
    const pr = el.getBoundingClientRect();
    const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
    const inset = Math.min(12, Math.max(3, pr.width * 0.35));
    const x = side === 'left'
      ? pr.left - sr.left + inset
      : pr.right - sr.left - inset;
    const y = pr.top + pr.height / 2 - sr.top;
    return { x: clamp(x, 2, w - 2), y: clamp(y, 2, h - 2) };
  };

  const placeTicks = () => {
    const strip = stage.querySelector('.mi-tarch-strip');
    if (!strip) return;
    const sr = strip.getBoundingClientRect();
    if (!sr.height) return;
    stage.querySelectorAll('[data-tarch-tick]').forEach((tick) => {
      const id = tick.getAttribute('data-tarch-tick');
      const target = pinOf(id);
      if (!target) return;
      const tr = target.getBoundingClientRect();
      const top = tr.top + tr.height / 2 - sr.top;
      tick.style.top = Math.max(8, Math.min(sr.height - 8, top)) + 'px';
    });
  };

  const placeLabels = (wide) => {
    const cols = {
      left: stage.querySelector('.mi-tarch-col--left'),
      right: stage.querySelector('.mi-tarch-col--right'),
    };
    stage.querySelectorAll('[data-tarch-label]').forEach((el) => {
      el.style.position = '';
      el.style.top = '';
      el.style.left = '';
      el.style.right = '';
    });
    Object.values(cols).forEach((col) => {
      if (col) { col.style.position = ''; col.style.minHeight = ''; }
    });
    if (!wide) return;
    ['left', 'right'].forEach((side) => {
      const col = cols[side];
      if (!col) return;
      col.style.position = 'relative';
      const cr = col.getBoundingClientRect();
      const placed = Array.from(col.querySelectorAll('[data-tarch-label]')).map((label) => {
        const pin = pinOf(label.getAttribute('data-tarch-label'));
        const pr = pin ? pin.getBoundingClientRect() : cr;
        const h = label.offsetHeight || 56;
        let top = pr.top + pr.height / 2 - cr.top - h / 2;
        top = Math.max(0, top);
        return { label, top, h };
      }).sort((a, b) => a.top - b.top);
      for (let i = 1; i < placed.length; i++) {
        const minTop = placed[i - 1].top + placed[i - 1].h + 4;
        if (placed[i].top < minTop) placed[i].top = minTop;
      }
      placed.forEach((p) => {
        p.label.style.position = 'absolute';
        p.label.style.left = '0';
        p.label.style.right = '0';
        p.label.style.top = p.top + 'px';
      });
      if (placed.length) {
        const last = placed[placed.length - 1];
        col.style.minHeight = (last.top + last.h) + 'px';
      }
    });
  };

  const draw = () => {
    if (!svg) return;
    let sr = stage.getBoundingClientRect();
    if (sr.width < 8 || sr.height < 8) return;
    const wide = sr.width >= 900;
    placeLabels(wide);
    placeTicks();
    sr = stage.getBoundingClientRect();
    const w = sr.width;
    const h = sr.height;
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));
    const ns = 'http://www.w3.org/2000/svg';
    const frag = document.createDocumentFragment();
    const defs = document.createElementNS(ns, 'defs');
    const marker = document.createElementNS(ns, 'marker');
    marker.setAttribute('id', 'mi-tarch-head');
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('orient', 'auto');
    const tip = document.createElementNS(ns, 'path');
    tip.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    tip.setAttribute('fill', 'currentColor');
    marker.appendChild(tip);
    defs.appendChild(marker);
    frag.appendChild(defs);
    const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
    if (wide) {
      stage.querySelectorAll('[data-tarch-label]').forEach((label) => {
        const id = label.getAttribute('data-tarch-label');
        const pin = pinOf(id);
        const dot = label.querySelector('.mi-tarch-dot');
        if (!pin || !dot) return;
        const dr = dot.getBoundingClientRect();
        const x1 = clamp(dr.left + dr.width / 2 - sr.left, 2, w - 2);
        const y1 = clamp(dr.top + dr.height / 2 - sr.top, 2, h - 2);
        const tip = aimPoint(id, pin, sr, w, h);
        const x2 = tip.x;
        const y2 = tip.y;
        const mid = x1 + (x2 - x1) * 0.38;
        const path = document.createElementNS(ns, 'path');
        path.setAttribute('d', 'M ' + x1.toFixed(1) + ' ' + y1.toFixed(1)
          + ' C ' + mid.toFixed(1) + ' ' + y1.toFixed(1) + ', '
          + mid.toFixed(1) + ' ' + y2.toFixed(1) + ', '
          + x2.toFixed(1) + ' ' + y2.toFixed(1));
        path.setAttribute('class', 'mi-tarch-arrow');
        path.setAttribute('data-tarch-arrow', id);
        path.setAttribute('fill', 'none');
        path.setAttribute('marker-end', 'url(#mi-tarch-head)');
        frag.appendChild(path);
      });
    }
    svg.replaceChildren(frag);
  };

  const setHot = (id, on) => {
    stage.querySelectorAll('[data-tarch-label="' + id + '"], [data-tarch-target="' + id + '"], [data-tarch-arrow="' + id + '"]')
      .forEach((el) => el.classList.toggle('is-hot', !!on));
  };

  stage.addEventListener('pointerenter', (e) => {
    const label = e.target.closest('[data-tarch-label]');
    if (label && stage.contains(label)) setHot(label.getAttribute('data-tarch-label'), true);
  }, true);
  stage.addEventListener('pointerleave', (e) => {
    const label = e.target.closest('[data-tarch-label]');
    if (label && stage.contains(label)) setHot(label.getAttribute('data-tarch-label'), false);
  }, true);
  stage.addEventListener('focusin', (e) => {
    const label = e.target.closest('[data-tarch-label]');
    if (label) setHot(label.getAttribute('data-tarch-label'), true);
  });
  stage.addEventListener('focusout', (e) => {
    const label = e.target.closest('[data-tarch-label]');
    if (label) setHot(label.getAttribute('data-tarch-label'), false);
  });
  stage.addEventListener('click', (e) => {
    const jump = e.target.closest('[data-tarch-jump]');
    if (jump && stage.contains(jump)) {
      e.preventDefault();
      e.stopPropagation();
      jumpToComponent(document, jump.getAttribute('data-tarch-jump'));
      return;
    }
    const label = e.target.closest('[data-tarch-label]');
    if (!label || !stage.contains(label)) return;
    const target = stage.querySelector('[data-tarch-target="' + label.getAttribute('data-tarch-label') + '"]');
    if (target) flashEl(target);
  });
  stage.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target.closest('[data-tarch-jump]')) return;
    const label = e.target.closest('[data-tarch-label]');
    if (!label || !stage.contains(label)) return;
    e.preventDefault();
    const target = stage.querySelector('[data-tarch-target="' + label.getAttribute('data-tarch-label') + '"]');
    if (target) flashEl(target);
  });
  const startWhenOpen = () => {
    if (mod.classList.contains('is-collapsed')) return;
    requestAnimationFrame(() => requestAnimationFrame(draw));
  };
  startWhenOpen();
  new MutationObserver(startWhenOpen).observe(mod, { attributes: true, attributeFilter: ['class'] });
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(() => {
      if (mod.classList.contains('is-collapsed')) return;
      if (reduced) draw();
      else requestAnimationFrame(draw);
    });
    ro.observe(stage);
  }
  window.addEventListener('resize', () => {
    if (!mod.classList.contains('is-collapsed')) draw();
  });
}

/* ------------------------------------------------------------------ */
/* Motion & Resize — every animation and drag/resize interaction       */
/*                                                                     */
/* A live catalog of how things move in the app: count-ups, chart      */
/* replay, paragraph streaming, gold chip shimmer, chip fly-in,        */
/* output chip fan, chat composer sheen, the welcome helix, the        */
/* thinking helix, and accordion open — plus the drag/resize systems   */
/* (module splitter, width tiers, carousel rail, reorder,              */
/* drag-to-file). Each card explains the rule and runs real behaviour  */
/* (or a faithful mini of it) so you can try it here.                  */
/* ------------------------------------------------------------------ */

function motionShimmer(label) {
  return String(label).split('').map((ch, i) =>
    ch === ' '
      ? '<span class="sc-ask-sp"> </span>'
      : `<span class="sc-ask-ch" style="--ch-i:${i}">${esc(ch)}</span>`
  ).join('');
}

const MOTION_ITEMS = [
  {
    id: 'countup', group: 'anim', icon: 'counter_1', title: 'Count-up',
    src: 'js/count-up-all.js',
    used: 'Every scorecard numeral — Overview, Portfolio, Admin, this page',
    lede: 'Any number that moves from 0 to a value animates a count-up (~1400ms, ease-out cubic). Click a card to replay. Hero counts ramp quickly and settle. Driven by <code>js/count-up-all.js</code> — never an ad-hoc counter.',
    demo: `
      <div class="mi-motion-stats" role="group" aria-label="Count-up demo — click a card to replay">
        <button type="button" class="mi-stat">
          <span class="mi-stat-num">128</span>
          <span class="mi-stat-label"><span class="mi-stat-text">Claimed</span><span class="material-symbols-outlined">inventory_2</span></span>
        </button>
        <button type="button" class="mi-stat">
          <span class="mi-stat-num">54.2%</span>
          <span class="mi-stat-label"><span class="mi-stat-text">Non-UPF</span><span class="material-symbols-outlined">verified</span></span>
        </button>
        <button type="button" class="mi-stat">
          <span class="mi-stat-num">1,204</span>
          <span class="mi-stat-label"><span class="mi-stat-text">Foods</span><span class="material-symbols-outlined">nutrition</span></span>
        </button>
      </div>
      <p class="mi-motion-hint">Click a card to replay its count-up.</p>`,
  },
  {
    id: 'charts', group: 'anim', icon: 'bar_chart', title: 'Chart replay',
    src: 'pages/analytics-types.html · .adm-bar-fill',
    used: 'Analytics Types, Non-UPF Dashboard, Overview, Reports, Comparison',
    lede: 'Charts animate in on load. Tapping a chart re-runs its entrance — bars grow from zero, and any count-up on the card replays with them. Same easing as count-up: <code>cubic-bezier(0.22, 1, 0.36, 1)</code>.',
    demo: `
      <div class="adm-chart-card mi-motion-chart" data-motion-chart tabindex="0" role="button" aria-label="Replay chart animation">
        <h4 class="adm-chart-title">Processing spectrum</h4>
        <div class="adm-chart-body">
          <div class="adm-bars" style="height:140px">
            <div class="adm-bar"><div class="adm-bar-track"><div class="adm-bar-fill" data-h="72" style="height:72%;background:var(--chart-status-excellent)"><span class="adm-bar-val">54</span></div></div><span class="adm-bar-label">Minimally processed</span></div>
            <div class="adm-bar"><div class="adm-bar-track"><div class="adm-bar-fill" data-h="48" style="height:48%;background:var(--chart-status-okay)"><span class="adm-bar-val">31</span></div></div><span class="adm-bar-label">Processed</span></div>
            <div class="adm-bar"><div class="adm-bar-track"><div class="adm-bar-fill" data-h="34" style="height:34%;background:var(--chart-status-poor)"><span class="adm-bar-val">18</span></div></div><span class="adm-bar-label">Ultra-processed</span></div>
          </div>
        </div>
      </div>
      <p class="mi-motion-hint">Click the chart to replay the grow-in.</p>`,
  },
  {
    id: 'stream', group: 'anim', icon: 'text_ad', title: 'Paragraph streaming',
    src: 'js/wiseai-chat.js · typeInTranscript',
    used: 'WISEcodeAI replies — paragraphs, then the thumbs row, then intent chips',
    lede: 'Copy lands one paragraph at a time, then the thumbs-up/thumbs-down row, then the intent chips. Reduced motion shows the line whole. Replay to watch the cascade.',
    demo: `
      <div class="mi-motion-stream" data-motion-stream>
        <div class="mi-motion-stream-paras" data-stream-out></div>
        <button type="button" class="mi-trace-run" data-stream-run>
          <span class="material-symbols-outlined">replay</span><span>Replay stream</span>
        </button>
      </div>`,
  },
  {
    id: 'shimmer', group: 'anim', icon: 'auto_awesome', title: 'Gold chip shimmer',
    src: '.sc-ask-ch · .ws-intent-chip--askhelp',
    used: '“What can I ask?” chip and the gold link under the composer',
    lede: 'The chip icon is gold. The label splits into per-letter spans so a staggered gold shimmer rides across the glyphs — the same animation on the below-input “What can I ask?” link.',
    demo: `
      <div class="sc-reply-chips" style="margin:0">
        <button type="button" class="chip ws-intent-chip ws-intent-chip--askhelp" aria-label="What can I ask?">
          <span class="material-symbols-outlined">help</span>
          <span class="sc-ask-shimmer" aria-hidden="true">${motionShimmer('What can I ask?')}</span>
        </button>
        <button type="button" class="chip ws-intent-chip">
          <span class="material-symbols-outlined">inventory_2</span>Open portfolio
        </button>
      </div>
      <p class="mi-motion-hint">The gold chip shimmers continuously. The navy chip is the default intent face.</p>`,
  },
  {
    id: 'flyin', group: 'anim', icon: 'keyboard_double_arrow_left', title: 'Chip fly-in',
    src: 'js/wiseai-chat.js · primeRevealFromRight',
    used: 'WISEcodeAI welcome chips — they land after the heading types in',
    lede: 'Intent chips fly in from the right and land, left-to-right, after the welcome copy has typed. Replay to watch the stagger.',
    demo: `
      <div class="mi-motion-fly" data-motion-fly>
        <div class="ws-chips mi-motion-fly-row" role="list" aria-label="Quick actions">
          <button type="button" class="chip ws-intent-chip" data-fly-chip><span class="material-symbols-outlined">fact_check</span>Verify ingredients</button>
          <button type="button" class="chip ws-intent-chip" data-fly-chip><span class="material-symbols-outlined">compare</span>Compare two products</button>
          <button type="button" class="chip ws-intent-chip" data-fly-chip><span class="material-symbols-outlined">auto_awesome</span>Suggest a reformulation</button>
        </div>
        <button type="button" class="mi-trace-run" data-fly-run>
          <span class="material-symbols-outlined">replay</span><span>Replay fly-in</span>
        </button>
      </div>`,
  },
  {
    id: 'toast', group: 'anim', icon: 'vertical_align_bottom', title: 'Toast',
    src: 'js/agent-overview.js \u00b7 agToast \u00b7 #ag-toast-wrap',
    used: 'Every save, invite, copy, and error \u2014 agent shell and the matching admin / module wraps',
    lede: 'One seat: bottom centre of the viewport, 22px up (28px on admin / module wraps). It rises 10px and fades in (0.25s), holds 2.6s, then fades and drops 8px and is removed. A second toast stacks above the first. Not top, not a corner, not next to the control. Replay to watch the path.',
    demo: `
      <div class="mi-motion-toast" data-motion-toast>
        <div class="mi-motion-toast-stage" data-toast-stage></div>
        <button type="button" class="mi-trace-run" data-toast-run>
          <span class="material-symbols-outlined">replay</span><span>Replay toast</span>
        </button>
        <p class="mi-motion-hint">Rises into the bottom centre, holds, then drops and fades. Click again to stack another.</p>
      </div>`,
  },
  {
    id: 'outfan', group: 'anim', icon: 'layers', title: 'Output chip fan',
    src: '.sc-surface-card · .sc-surface-stack',
    used: 'WISEcodeAI transcript — versioned Results / Visuals chips',
    lede: 'When an output has been redone, its chip stacks every version at 52px (oldest first, newest raised). Hover fans the cascade — tight −28px overlap opens to −4px so earlier versions peek — and the gold stroke brightens. Replay runs the fan once; leave the chip to rest, or hover it live. Reduced motion snaps to the open pose.',
    demo: `
      <div class="mi-motion-outfan" data-motion-outfan>
        <div class="mi-motion-outfan-row">
          <div class="mi-motion-outfan-col">
            <div class="dsc-sub-label">Rest — hover to fan</div>
            ${outputChipHTML({ title: OUTPUT_CHIP_TITLE, versions: OUTPUT_CHIP_VERS })}
          </div>
          <div class="mi-motion-outfan-col">
            <div class="dsc-sub-label">Hover locked (fan)</div>
            ${outputChipHTML({ title: OUTPUT_CHIP_TITLE, versions: OUTPUT_CHIP_VERS, hover: true })}
          </div>
        </div>
        <button type="button" class="mi-trace-run" data-outfan-run>
          <span class="material-symbols-outlined">replay</span><span>Replay fan</span>
        </button>
        <p class="mi-motion-hint">Replay fans the left chip, holds, then returns to rest. Hover either chip anytime.</p>
      </div>`,
  },
  {
    id: 'helix', group: 'anim', icon: 'genetics', title: 'Welcome helix', wide: true,
    src: 'js/wiseai-chat.js · createHelixBgAnim',
    used: 'Every chat welcome — ON by default on the published Scene pose (3D look, 50% opacity, reverse spin)',
    lede: 'The ambient DNA/RNA field behind the chat welcome. Product thumbnails travel the strand; move onto a circle for its card — the field pauses while that popover is open and continues when you leave it. Notes (brand insight or look-closer fact) are sprinkled two-of-three along the strand, mixed with food sheets — never a status stamp, and never on their own: a popover opens only when the pointer enters a circle. Default opacity is <strong>20%</strong> and the axis tilt defaults to <strong>10°</strong>. <strong>Camera</strong> looks at the corkscrew from above or below (default <strong>0°</strong>). Shape knobs run <strong>1–800%</strong> from a <strong>100%</strong> default (the original strand): a master <strong>Scale</strong> that moves all three axes together, <strong>Scale X / Y / Z</strong>, <strong>Pitch</strong>, <strong>Nodes</strong>, <strong>Dots</strong>, <strong>Length</strong>, <strong>Rungs</strong> (Match pins them to the product circles), <strong>Bar</strong>, <strong>Thick</strong>, <strong>Depth</strong> and <strong>Speed</strong> — plus colour / Still-Pulse-Spark for the beads, and <strong>Fwd / Rev</strong> for which way the helix twists. Same controls as the chat ⋯ menu, where Scale and Nodes also drive the Orbit style. Honors pause and <code>prefers-reduced-motion</code>. The live field starts when this section opens.',
    demo: `
      <div class="mi-motion-helix sc-bganim-host" data-motion-helix>
        <div class="mi-motion-helix-stage" data-helix-body></div>
        <div class="mi-motion-helix-bar">
          <button type="button" class="mi-trace-run" data-helix-pp aria-pressed="false">
            <span class="material-symbols-outlined" data-helix-pp-ic>pause</span>
            <span data-helix-pp-label>Pause helix</span>
          </button>
          <label class="mi-motion-helix-opacity">
            <span class="mi-motion-helix-opacity-label">Opacity</span>
            <input type="range" class="sc-bganim-opacity" data-helix-opacity min="10" max="100" step="5" value="50" aria-label="Background animation opacity">
            <span class="sc-bganim-opacity-val" data-helix-opacity-val>50%</span>
          </label>
          <label class="mi-motion-helix-opacity">
            <span class="mi-motion-helix-opacity-label">Angle</span>
            <input type="range" class="sc-bganim-angle-range" data-helix-angle min="-90" max="90" step="1" value="-89" aria-label="Helix angle">
            <span class="sc-bganim-angle-val" data-helix-angle-val>-89°</span>
          </label>
          <label class="mi-motion-helix-opacity">
            <span class="mi-motion-helix-opacity-label">Camera</span>
            <input type="range" class="sc-bganim-camera-range" data-helix-camera min="-90" max="90" step="1" value="0" aria-label="Helix camera elevation">
            <span class="sc-bganim-camera-val" data-helix-camera-val>0°</span>
          </label>
          <label class="mi-motion-helix-opacity">
            <span class="mi-motion-helix-opacity-label">Side</span>
            <input type="range" class="sc-bganim-azimuth-range" data-helix-azimuth min="-180" max="180" step="1" value="0" aria-label="Helix camera side">
            <span class="sc-bganim-azimuth-val" data-helix-azimuth-val>0°</span>
          </label>
          <label class="mi-motion-helix-opacity">
            <span class="mi-motion-helix-opacity-label">Shift</span>
            <input type="range" class="sc-bganim-shift-range" data-helix-shift min="-100" max="100" step="1" value="0" aria-label="Helix left-right shift">
            <span class="sc-bganim-shift-val" data-helix-shift-val>0%</span>
          </label>
          <label class="mi-motion-helix-opacity">
            <span class="mi-motion-helix-opacity-label">Scale</span>
            <input type="range" class="sc-bganim-scale-range" data-helix-scale="all" min="0" max="35" step="1" value="15" aria-label="Helix scale — all axes">
            <span class="sc-bganim-scale-val" data-helix-scale-val="all">100%</span>
          </label>
          <label class="mi-motion-helix-opacity">
            <span class="mi-motion-helix-opacity-label">Scale X</span>
            <input type="range" class="sc-bganim-scale-range" data-helix-scale="x" min="0" max="35" step="1" value="15" aria-label="Helix scale X">
            <span class="sc-bganim-scale-val" data-helix-scale-val="x">100%</span>
          </label>
          <label class="mi-motion-helix-opacity">
            <span class="mi-motion-helix-opacity-label">Scale Y</span>
            <input type="range" class="sc-bganim-scale-range" data-helix-scale="y" min="0" max="35" step="1" value="15" aria-label="Helix scale Y">
            <span class="sc-bganim-scale-val" data-helix-scale-val="y">100%</span>
          </label>
          <label class="mi-motion-helix-opacity">
            <span class="mi-motion-helix-opacity-label">Scale Z</span>
            <input type="range" class="sc-bganim-scale-range" data-helix-scale="z" min="0" max="35" step="1" value="15" aria-label="Helix scale Z">
            <span class="sc-bganim-scale-val" data-helix-scale-val="z">100%</span>
          </label>
          <label class="mi-motion-helix-opacity">
            <span class="mi-motion-helix-opacity-label">Pitch</span>
            <input type="range" class="sc-bganim-knob-range" data-helix-knob="pitch" min="0" max="35" step="1" value="15" aria-label="Helix pitch">
            <span class="sc-bganim-knob-val" data-helix-knob-val="pitch">100%</span>
          </label>
          <label class="mi-motion-helix-opacity">
            <span class="mi-motion-helix-opacity-label">Nodes</span>
            <input type="range" class="sc-bganim-knob-range" data-helix-knob="nodes" min="0" max="35" step="1" value="15" aria-label="Helix node size">
            <span class="sc-bganim-knob-val" data-helix-knob-val="nodes">100%</span>
          </label>
          <label class="mi-motion-helix-opacity">
            <span class="mi-motion-helix-opacity-label">Dots</span>
            <input type="range" class="sc-bganim-knob-range" data-helix-knob="dots" min="0" max="35" step="1" value="15" aria-label="Helix little-node size">
            <span class="sc-bganim-knob-val" data-helix-knob-val="dots">100%</span>
          </label>
          <label class="mi-motion-helix-opacity">
            <span class="mi-motion-helix-opacity-label">Color</span>
            <input type="color" class="sc-bganim-dots-color-input" data-helix-dots-color value="#25507c" aria-label="Helix little-node color">
            <span class="sc-bganim-dots-actions">
              <button type="button" class="sc-bganim-dots-match" data-helix-dots-match>Match</button>
              <button type="button" class="sc-bganim-dots-reset" data-helix-dots-reset>Reset</button>
            </span>
          </label>
          <div class="mi-motion-helix-opacity mi-motion-helix-dots-motion">
            <span class="mi-motion-helix-opacity-label">Motion</span>
            <div class="sc-stream-seg" role="radiogroup" aria-label="Helix little-node motion">
              <button type="button" class="sc-stream-seg-btn is-on" data-helix-dots-motion="still" role="radio" aria-checked="true">Still</button>
              <button type="button" class="sc-stream-seg-btn" data-helix-dots-motion="pulse" role="radio" aria-checked="false">Pulse</button>
              <button type="button" class="sc-stream-seg-btn" data-helix-dots-motion="spark" role="radio" aria-checked="false">Spark</button>
            </div>
          </div>
          <label class="mi-motion-helix-opacity" data-helix-motion-knob="pulse" data-helix-motion-id="speed" hidden>
            <span class="mi-motion-helix-opacity-label">Pulse rate</span>
            <input type="range" class="sc-bganim-motion-knob-range" data-helix-motion="pulse" data-helix-motion-id="speed" min="0" max="35" step="1" value="15" aria-label="Pulse rate">
            <span class="sc-bganim-motion-knob-val" data-helix-motion-val="pulse-speed">100%</span>
          </label>
          <label class="mi-motion-helix-opacity" data-helix-motion-knob="pulse" data-helix-motion-id="length" hidden>
            <span class="mi-motion-helix-opacity-label">Pulse span</span>
            <input type="range" class="sc-bganim-motion-knob-range" data-helix-motion="pulse" data-helix-motion-id="length" min="0" max="35" step="1" value="15" aria-label="Pulse span">
            <span class="sc-bganim-motion-knob-val" data-helix-motion-val="pulse-length">100%</span>
          </label>
          <label class="mi-motion-helix-opacity" data-helix-motion-knob="pulse" data-helix-motion-id="size" hidden>
            <span class="mi-motion-helix-opacity-label">Pulse size</span>
            <input type="range" class="sc-bganim-motion-knob-range" data-helix-motion="pulse" data-helix-motion-id="size" min="0" max="35" step="1" value="15" aria-label="Pulse size">
            <span class="sc-bganim-motion-knob-val" data-helix-motion-val="pulse-size">100%</span>
          </label>
          <label class="mi-motion-helix-opacity" data-helix-motion-knob="spark" data-helix-motion-id="speed" hidden>
            <span class="mi-motion-helix-opacity-label">Spark rate</span>
            <input type="range" class="sc-bganim-motion-knob-range" data-helix-motion="spark" data-helix-motion-id="speed" min="0" max="35" step="1" value="15" aria-label="Spark rate">
            <span class="sc-bganim-motion-knob-val" data-helix-motion-val="spark-speed">100%</span>
          </label>
          <label class="mi-motion-helix-opacity" data-helix-motion-knob="spark" data-helix-motion-id="length" hidden>
            <span class="mi-motion-helix-opacity-label">Spark span</span>
            <input type="range" class="sc-bganim-motion-knob-range" data-helix-motion="spark" data-helix-motion-id="length" min="0" max="35" step="1" value="15" aria-label="Spark span">
            <span class="sc-bganim-motion-knob-val" data-helix-motion-val="spark-length">100%</span>
          </label>
          <label class="mi-motion-helix-opacity" data-helix-motion-knob="spark" data-helix-motion-id="size" hidden>
            <span class="mi-motion-helix-opacity-label">Spark size</span>
            <input type="range" class="sc-bganim-motion-knob-range" data-helix-motion="spark" data-helix-motion-id="size" min="0" max="35" step="1" value="15" aria-label="Spark size">
            <span class="sc-bganim-motion-knob-val" data-helix-motion-val="spark-size">100%</span>
          </label>
          <label class="mi-motion-helix-opacity">
            <span class="mi-motion-helix-opacity-label">Length</span>
            <input type="range" class="sc-bganim-knob-range" data-helix-knob="length" min="0" max="35" step="1" value="15" aria-label="Helix strand length">
            <span class="sc-bganim-knob-val" data-helix-knob-val="length">100%</span>
          </label>
          <label class="mi-motion-helix-opacity">
            <span class="mi-motion-helix-opacity-label">Rungs</span>
            <input type="range" class="sc-bganim-knob-range" data-helix-knob="rungs" min="0" max="35" step="1" value="15" aria-label="Helix rung count">
            <span class="sc-bganim-knob-val" data-helix-knob-val="rungs">100%</span>
            <button type="button" class="sc-bganim-rungs-match" data-helix-rungs-match>Match</button>
          </label>
          <label class="mi-motion-helix-opacity">
            <span class="mi-motion-helix-opacity-label">Bar</span>
            <input type="range" class="sc-bganim-knob-range" data-helix-knob="rungthick" min="0" max="35" step="1" value="15" aria-label="Helix rung thickness">
            <span class="sc-bganim-knob-val" data-helix-knob-val="rungthick">100%</span>
          </label>
          <label class="mi-motion-helix-opacity">
            <span class="mi-motion-helix-opacity-label">Thick</span>
            <input type="range" class="sc-bganim-knob-range" data-helix-knob="thickness" min="0" max="35" step="1" value="15" aria-label="Helix strand thickness">
            <span class="sc-bganim-knob-val" data-helix-knob-val="thickness">100%</span>
          </label>
          <label class="mi-motion-helix-opacity">
            <span class="mi-motion-helix-opacity-label">Depth</span>
            <input type="range" class="sc-bganim-knob-range" data-helix-knob="depth" min="0" max="35" step="1" value="15" aria-label="Helix 3-D depth">
            <span class="sc-bganim-knob-val" data-helix-knob-val="depth">100%</span>
          </label>
          <div class="mi-motion-helix-opacity mi-motion-helix-dots-motion">
            <span class="mi-motion-helix-opacity-label">Spin</span>
            <div class="sc-stream-seg" role="radiogroup" aria-label="Helix spin direction">
              <button type="button" class="sc-stream-seg-btn is-on" data-helix-spin="fwd" role="radio" aria-checked="true">Fwd</button>
              <button type="button" class="sc-stream-seg-btn" data-helix-spin="rev" role="radio" aria-checked="false">Rev</button>
            </div>
          </div>
          <label class="mi-motion-helix-opacity">
            <span class="mi-motion-helix-opacity-label">Speed</span>
            <input type="range" class="sc-bganim-knob-range" data-helix-knob="speed" min="0" max="35" step="1" value="15" aria-label="Helix spin speed">
            <span class="sc-bganim-knob-val" data-helix-knob-val="speed">100%</span>
          </label>
        </div>
      </div>`,
  },
  {
    id: 'tracehelix', group: 'anim', icon: 'psychology', title: 'Thinking helix',
    src: 'js/trace-helix.js · Streaming Trace',
    used: 'Every WISEcodeAI turn while it works',
    lede: 'The DNA rail on the left of the thinking trace — twists while working, then freezes with green base-pair dots on each completed step. The full anatomy (playing · mid-paused · finished, plus the Full / Steps / Final streaming-detail toggle) lives in the <strong>Streaming Trace</strong> section above.',
    demo: `
      <button type="button" class="mi-trace-run" data-jump-trace>
        <span class="material-symbols-outlined">play_arrow</span><span>Open Streaming Trace</span>
      </button>
      <p class="mi-motion-hint">Jumps to the live helix + haiku glob demo and replays it.</p>`,
  },
  {
    id: 'accordion', group: 'anim', icon: 'expand_more', title: 'Accordion &amp; panel open',
    src: '.mi-acc · panelBounceLeft / Right',
    used: 'This page’s sections · side panels (History, NFP, Compare, Settings)',
    lede: 'Accordions collapse to the title row; the chevron rotates. Side panels bounce in from the edge they opened from (<code>panelBounceLeft</code> / <code>panelBounceRight</code>, 0.56s). Reduced motion skips both.',
    demo: `
      <div class="mi-motion-acc" data-motion-acc>
        <button type="button" class="mi-motion-acc-head" aria-expanded="false">
          <span class="material-symbols-outlined mi-motion-acc-chevron">expand_more</span>
          <span class="mi-motion-acc-title">Example section</span>
        </button>
        <div class="mi-motion-acc-body" hidden>
          <p>This is the same collapse pattern as the sections on this page — title row only when closed, body when open. Side panels elsewhere use the bounce-in keyframes instead of a height collapse.</p>
        </div>
      </div>`,
  },
  {
    id: 'sticky', group: 'anim', icon: 'view_sidebar', title: 'Sticky drawer slide-in',
    src: 'js/sticky-modules.js · stickySlideRight',
    used: 'Every #modules-row page with a chat — drawers tuck behind the chat as they open',
    lede: 'A right-of-chat module does not fade in beside the thread. It slides out from under the chat card (overshoot ease, 0.42s) already tucked, shorter, and squared on the chat-facing edge. Replay to watch the drawer emerge. Nested drawers (progress, Help contact) use the same motion one layer under.',
    demo: `
      <div class="dsc-demo mi-motion-sticky" data-motion-sticky>
        <div class="mi-belt" aria-label="Sticky slide-in">
          <section class="mi-belt-chat"><span class="mi-belt-name">Chat</span><span class="mi-belt-z">z 3 \u00b7 buckle</span></section>
          <aside class="mi-belt-mod mi-belt-out mi-motion-sticky-slide" data-sticky-slide><span class="mi-belt-name">Output</span><span class="mi-belt-z">z 2 \u00b7 slide-in</span></aside>
        </div>
        <button type="button" class="mi-trace-run" data-sticky-run>
          <span class="material-symbols-outlined">replay</span><span>Replay slide-in</span>
        </button>
      </div>`,
  },
  {
    id: 'actstrip', group: 'anim', icon: 'timeline', title: 'Activity strip ticks',
    src: 'js/chat-activity-strip.js · .wa-activity-tick',
    used: 'Every chat module — landmark rail on the transcript edge',
    lede: 'Hover widens a tick from 9px to 14px and reveals the turn ID. Clicking it scrolls that landmark into view and runs a 1.4s gold outline flash. Replay to watch the flash land on the output row.',
    demo: `
      <div class="dsc-demo mi-motion-act" data-motion-act>
        <div class="mi-actstrip" data-ticks="3">
          <div class="wa-activity-rail"></div>
          ${demoActTick('output', { hover: true, id: '3a1c' })}
          ${demoActTick('source', { id: 'b12e' })}
          ${demoActTick('database', { id: '9f04' })}
          <div class="mi-actstrip-ghost">
            <span class="wa-activity-flash-target">Output created</span>
            <span>Data source added</span>
            <span>Database switched</span>
          </div>
        </div>
        <button type="button" class="mi-trace-run" data-actstrip-run>
          <span class="material-symbols-outlined">replay</span><span>Replay flash</span>
        </button>
      </div>`,
  },
  {
    id: 'jameq', group: 'anim', icon: 'graphic_eq', title: 'Jam visualizers',
    src: '.jam-eq · .jam-helix · Appearance ▸ Sound',
    used: 'Appearance ▸ Sound — bars by default, helix as the second mode',
    lede: 'Two live visualizers share the synth. <strong>Bars</strong> (default) are a proper equalizer standing on a baseline. <strong>Helix</strong> is a horizontal DNA strand that twists and sends a spark along the rungs while a tune plays. Music starts only from the play button.',
    demo: `
      <div class="mi-motion-jam">
        ${demoJamStrip('bars', false, JAM_SONGS.slice(0, 3))}
        ${demoJamStrip('bars', true, JAM_SONGS.slice(0, 3))}
        ${demoJamStrip('helix', false, JAM_SONGS.slice(3, 6))}
        ${demoJamStrip('helix', true, JAM_SONGS.slice(3, 6))}
      </div>
      <p class="mi-motion-hint">Top pair is bars (idle, then playing). Bottom pair is the horizontal helix.</p>`,
  },
  {
    id: 'composersheen', group: 'anim', icon: 'flare', title: 'Chat composer sheen',
    src: 'pages/wise.css · .fl-input-wrap::before · wise-sheen-rotate / wise-sheen-breathe',
    used: 'Every chat composer — WISEcodeAI dock, Studio Chat, Reformulation / Add Product / Studio&AI panes',
    lede: 'The composer pill keeps a light brand-wash stroke, not a heavy border. A specular highlight travels the edge on a 9s rotate while brightness breathes on a 4.5s pulse — the same living sheen in light and dark. The three-dot menu’s <strong>Input glow</strong> toggle sets <code>html.chat-sheen-off</code> to kill the ring app-wide; reduced motion freezes it at a steady opacity. Anatomy of the pill itself is in <em>Components → Chat composer</em>.',
    demo: `
      <div class="mi-motion-composer" data-motion-composer>
        ${demoComposerHtml()}
      </div>
      <p class="mi-motion-hint">The sheen travels the pill edge continuously. Turn off Input glow in any chat’s ⋯ menu to remove it app-wide.</p>`,
  },
  {
    id: 'splitter', group: 'drag', icon: 'width_normal', title: 'Module drag-resize', wide: true,
    src: 'js/pane-resize.js',
    used: 'Every #modules-row page — hover the seam between two modules',
    lede: 'Nothing shows at rest. Hover the edge between two panes and a grip fades in. Drag to preview any width; on release, modules with a width changer <strong>snap to the nearest of three presets</strong> (single / double / fill) unless the fourth setting — <strong>custom</strong> — is on, which keeps the dragged size. Custom also puts the row on the carousel rail (next card). Modules without a width changer keep a free-form width. Double-click a handle to reset. Navigation is never resized.',
    demo: `
      <div class="mi-motion-split" data-motion-split>
        <div class="mi-motion-pane" data-split-pane="a" style="flex: 1 1 46%">
          <span class="mi-motion-pane-label">Chat</span>
          <span class="mi-motion-pane-w" data-split-w>46%</span>
        </div>
        <div class="mi-motion-split-hit" data-split-hit title="Drag to resize · double-click to reset">
          <span class="mi-motion-split-grip" aria-hidden="true"></span>
        </div>
        <div class="mi-motion-pane" data-split-pane="b" style="flex: 1 1 54%">
          <span class="mi-motion-pane-label">History</span>
          <span class="mi-motion-pane-w" data-split-w>54%</span>
        </div>
      </div>
      <p class="mi-motion-hint">Hover the seam, drag to resize. Double-click the grip to reset. This mini does not snap — the live modules do.</p>`,
  },
  {
    id: 'width', group: 'drag', icon: 'width_wide', title: 'Width tiers',
    src: 'js/pane-width.js · .panel-width-toggle-btn',
    used: 'Every module ⋯ / width button except Navigation and the minimized History rail',
    lede: 'One control, four rest states: <strong>single → double → fill → custom</strong>, then back. Fill absorbs leftover row space. Custom keeps the current width so you can drag it to any size — that is what puts the row on the <strong>carousel rail</strong> (next card). Each module remembers its own rest state; changing or resizing a neighbour does not write it. Drag-resize on a preset is only a preview — release snaps to the closest of the three named sizes.',
    demo: `
      <div class="mi-motion-width" data-motion-width>
        <div class="mi-motion-width-row">
          <div class="mi-motion-pane mi-motion-width-pane" data-width-pane>
            <span class="mi-motion-pane-label">Module</span>
            <span class="mi-motion-pane-w" data-width-label>single</span>
          </div>
          <div class="mi-motion-pane mi-motion-width-rest">
            <span class="mi-motion-pane-label">Neighbour</span>
          </div>
        </div>
        <button type="button" class="panel-width-toggle-btn" data-width-btn aria-pressed="false" title="Width (single) — tap to widen" aria-label="Demo module width">
          <span class="material-symbols-outlined">width_normal</span>
        </button>
      </div>
      <p class="mi-motion-hint">Tap the width icon to cycle single → double → fill → custom.</p>`,
  },
  {
    id: 'carousel', group: 'drag', icon: 'view_carousel', title: 'Carousel rail', wide: true,
    src: 'js/pane-width.js · #modules-row.modules-carousel',
    used: 'Every #modules-row page once any module is at custom width',
    lede: 'Custom width pins each module at the size it already had (or the size you drag to) and puts the whole row on a <strong>carousel rail</strong> you scroll sideways. The rail is the same utility belt as <em>Sticky modules</em> — History left of chat, then Chat (z 3), Output (z 2), Nutrition Facts (z 1), Progress (z 0) — tuck and layers stay put. <strong>Narrow the browser</strong> — that is the important one — and the pinned modules overflow instead of squeezing: the row never restacks, and you scroll the rail. Shorten the window and the inner work surface of every module compresses — lists, charts and forms get shorter and scroll inside the card — but chips, type and controls keep their designed size, and the belt’s height steps (chat tallest, drawers shorter, nested shortest) stay in proportion.',
    demo: `
      <div class="mi-motion-car" data-motion-car>
        <div class="mi-motion-car-knobs">
          <label class="mi-motion-helix-opacity">
            <span class="mi-motion-helix-opacity-label">Browser width</span>
            <input type="range" class="sc-bganim-knob-range" data-car-w min="42" max="100" step="1" value="56" aria-label="Simulated browser width">
            <span class="sc-bganim-knob-val" data-car-w-val>56%</span>
          </label>
          <label class="mi-motion-helix-opacity">
            <span class="mi-motion-helix-opacity-label">Browser height</span>
            <input type="range" class="sc-bganim-knob-range" data-car-h min="42" max="100" step="1" value="100" aria-label="Simulated browser height">
            <span class="sc-bganim-knob-val" data-car-h-val>100%</span>
          </label>
        </div>
        <div class="mi-motion-car-stage">
          <div class="mi-motion-car-browser" data-car-browser>
            <div class="mi-motion-car-chrome">
              <span class="mi-motion-car-dots" aria-hidden="true"><i></i><i></i><i></i></span>
              <span class="mi-motion-car-url">app · modules row</span>
            </div>
            <div class="mi-motion-car-row" data-car-row aria-label="Sticky module stack on the carousel rail">
              <aside class="mi-motion-car-mod mi-car-hist" style="--car-w:200px">
                <header class="mi-motion-car-mod-head">History</header>
                <span class="mi-motion-car-z">left of chat</span>
                <div class="mi-motion-car-body">
                  <div class="mi-motion-car-rowline"></div>
                  <div class="mi-motion-car-rowline"></div>
                  <div class="mi-motion-car-rowline"></div>
                  <div class="mi-motion-car-rowline"></div>
                  <div class="mi-motion-car-chips"><span>Open</span></div>
                </div>
              </aside>
              <section class="mi-motion-car-mod mi-car-chat" style="--car-w:260px">
                <header class="mi-motion-car-mod-head">Chat</header>
                <span class="mi-motion-car-z">z 3 · buckle</span>
                <div class="mi-motion-car-body">
                  <div class="mi-motion-car-line"></div>
                  <div class="mi-motion-car-line mi-motion-car-line--short"></div>
                  <div class="mi-motion-car-bars" aria-hidden="true"><i style="height:72%"></i><i style="height:48%"></i><i style="height:34%"></i></div>
                  <div class="mi-motion-car-chips"><span>Ask</span><span>Compare</span></div>
                </div>
              </section>
              <aside class="mi-motion-car-mod mi-car-out" style="--car-w:240px">
                <header class="mi-motion-car-mod-head">Output</header>
                <span class="mi-motion-car-z">z 2</span>
                <div class="mi-motion-car-body">
                  <div class="mi-motion-car-score no-countup" data-no-countup>86</div>
                  <div class="mi-motion-car-bars" aria-hidden="true"><i style="height:80%"></i><i style="height:55%"></i><i style="height:28%"></i></div>
                  <div class="mi-motion-car-chips"><span>Verify</span><span>Report</span></div>
                </div>
              </aside>
              <aside class="mi-motion-car-mod mi-car-nfp" style="--car-w:220px">
                <header class="mi-motion-car-mod-head">Nutrition Facts</header>
                <span class="mi-motion-car-z">z 1</span>
                <div class="mi-motion-car-body">
                  <div class="mi-motion-car-line"></div>
                  <div class="mi-motion-car-line mi-motion-car-line--short"></div>
                  <div class="mi-motion-car-rowline"></div>
                </div>
              </aside>
              <aside class="mi-motion-car-mod mi-car-prog" style="--car-w:200px">
                <header class="mi-motion-car-mod-head">Progress</header>
                <span class="mi-motion-car-z">z 0 · nested</span>
                <div class="mi-motion-car-body">
                  <div class="mi-motion-car-rowline"></div>
                  <div class="mi-motion-car-rowline"></div>
                  <div class="mi-motion-car-rowline"></div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
      <p class="mi-motion-hint">Same belt as Sticky modules. Drag <strong>width</strong> first — layers stay tucked and the rail appears. Height shortens inner surfaces in proportion; chips stay the same size. Scroll the row sideways.</p>`,
  },
  {
    id: 'reorder', group: 'drag', icon: 'drag_indicator', title: 'Drag to reorder',
    src: 'js/organizations-flow.js · HTML5 drag-and-drop',
    used: 'Organizations metric cards · Conversation Library card order',
    lede: 'Cards with a grip are draggable. Drop on another card to swap order. The live Organizations board persists the order; this demo is in-session only.',
    demo: `
      <div class="mi-motion-reorder" data-motion-reorder>
        <div class="mi-motion-tile" draggable="true" data-reorder-id="portfolio"><span class="material-symbols-outlined mi-motion-grip">drag_indicator</span>Portfolio</div>
        <div class="mi-motion-tile" draggable="true" data-reorder-id="compare"><span class="material-symbols-outlined mi-motion-grip">drag_indicator</span>Comparison</div>
        <div class="mi-motion-tile" draggable="true" data-reorder-id="verify"><span class="material-symbols-outlined mi-motion-grip">drag_indicator</span>Verification</div>
        <div class="mi-motion-tile" draggable="true" data-reorder-id="reports"><span class="material-symbols-outlined mi-motion-grip">drag_indicator</span>Reports</div>
      </div>
      <p class="mi-motion-hint">Drag a card onto another to reorder.</p>`,
  },
  {
    id: 'file', group: 'drag', icon: 'create_new_folder', title: 'Drag to file',
    src: 'pages/conversation-library.html · js/chat-history.js',
    used: 'Conversation Library (drop a card on a folder / unfile tile) · History (drop a chat on a project or the ungrouped zone)',
    lede: 'Drag a conversation onto an existing folder (Library) or project (History) to file it. In the Library a drop chooser lets you Move, Copy, or Link the artifact — Option copies, ⌘ links. While a filed card is dragging, a dashed “Remove from folder” tile appears. Drop a folder onto another folder to nest it. History also accepts a drop on the ungrouped zone to unfile. Dropping one Library card on another founds a new folder — that is the next card.',
    demo: `
      <div class="mi-motion-file" data-motion-file>
        <div class="mi-motion-file-cards">
          <div class="mi-motion-tile" draggable="true" data-file-id="oat">Oat milk comparison</div>
          <div class="mi-motion-tile" draggable="true" data-file-id="upf">UPF report</div>
        </div>
        <div class="mi-motion-file-folders">
          <div class="mi-motion-folder" data-folder="Reports" data-folder-base="3" style="--fld:#2F6DF6">
            <span class="mi-motion-folder-num">3</span>
            <span class="mi-motion-folder-label"><span class="mi-motion-folder-dot"></span>Reports</span>
          </div>
          <div class="mi-motion-folder" data-folder="Chats" data-folder-base="2" style="--fld:#12B981">
            <span class="mi-motion-folder-num">2</span>
            <span class="mi-motion-folder-label"><span class="mi-motion-folder-dot"></span>Chats</span>
          </div>
          <div class="mi-motion-folder mi-motion-folder--unfile" data-folder="" hidden><span class="material-symbols-outlined">folder_off</span>Remove from folder</div>
        </div>
      </div>
      <p class="mi-motion-hint">Drop a card on a folder. Drag a filed card to “Remove from folder” to unfile it.</p>`,
  },
  {
    id: 'found', group: 'drag', icon: 'create_new_folder', title: 'Drag to found a folder', wide: true,
    src: 'pages/conversation-library.html · createFolder',
    used: 'WISEcodeAI Library — drop one card onto another to start a folder. History creates projects with the New project button, not card-on-card.',
    lede: 'The missing Library gesture: drop one item on another and a folder is founded holding both. The new tile opens an inline name field (and keeps the color swatch). Drop more cards onto that folder to file them. This is how folders get created in the Library — not only via the dashed New folder tile.',
    demo: `
      <div class="mi-motion-found" data-motion-found>
        <div class="mi-motion-found-cards">
          <div class="mi-motion-tile" draggable="true" data-found-id="oat">Oat milk comparison</div>
          <div class="mi-motion-tile" draggable="true" data-found-id="upf">UPF report</div>
          <div class="mi-motion-tile" draggable="true" data-found-id="gras">GRAS review</div>
        </div>
        <div class="mi-motion-found-folders" data-found-folders></div>
      </div>
      <p class="mi-motion-hint">Drop one card onto another to found a folder. Name it, then drop more cards onto the folder to file them.</p>`,
  },
];

function motionCard(item) {
  const search = `${item.title} ${item.src} ${item.used} ${item.group}`.toLowerCase();
  return `
    <article class="mi-motion-card${item.wide ? ' mi-motion-card--wide' : ''}" data-motion-card data-motion-id="${esc(item.id)}" data-motion-group="${esc(item.group)}" data-search="${esc(search)}">
      <header class="mi-motion-card-head">
        <span class="material-symbols-outlined" aria-hidden="true">${esc(item.icon)}</span>
        <div class="mi-motion-card-head-text">
          <h3 class="mi-motion-card-title">${item.title}</h3>
          <code class="mi-motion-card-src">${esc(item.src)}</code>
        </div>
        ${readyToggleHTML(motionReadyId(item), item.title, { level: 'item', parent: 'mi-motion' })}
      </header>
      <p class="mi-motion-card-lede">${item.lede}</p>
      <div class="mi-motion-stage">${item.demo}</div>
      <div class="mi-motion-used"><span class="mi-motion-used-label">Used in</span><span>${esc(item.used)}</span></div>
    </article>`;
}

function renderMotion(opts) {
  if (opts && opts.headOnly) {
    return miHeadOnly('mi-motion', 'Motion &amp; Resize',
      'Every animation and every drag/resize interaction in the app — explained and running live. Count-ups, chart replay, streaming, chip shimmer and fly-in, both helixes, accordion open, the module splitter, the five width tiers, drag-to-reorder and drag-to-file. All of it honors <code>prefers-reduced-motion</code>.',
      moduleReadyToggleHTML('mi-motion', 'Motion & Resize') + moduleControlsHTML('mi-motion'));
  }
  const animN = MOTION_ITEMS.filter((i) => i.group === 'anim').length;
  const dragN = MOTION_ITEMS.filter((i) => i.group === 'drag').length;
  return `
    <section class="mi-module is-collapsed" id="mi-motion">
      <header class="mi-module-head">
        <div class="mi-module-head-text">
          <h2 class="mi-module-title">Motion &amp; Resize</h2>
          <p class="mi-module-lede">Every animation and every drag/resize interaction in the app — explained and
            running live. Count-ups, chart replay, streaming, chip shimmer and fly-in, output chip fan, chat composer sheen, both helixes, accordion
            open, sticky drawer slide-in, activity-strip ticks, and the jam equalizer sit next to the module splitter, the five width tiers, the carousel rail, drag-to-reorder,
            drag-to-file, and drag-to-found-a-folder (Library card-on-card).
            All of it honors <code>prefers-reduced-motion</code>.</p>
        </div>
        ${moduleReadyToggleHTML('mi-motion', 'Motion & Resize')}
        ${moduleControlsHTML('mi-motion')}
      </header>

      <div class="dsc-conventions" aria-label="Motion conventions">
        <div class="dsc-conv-head">
          <span class="material-symbols-outlined">animation</span>
          <div>
            <div class="dsc-conv-title">How motion works</div>
            <div class="dsc-conv-sub">The shared rules every animation and drag interaction below follows.</div>
          </div>
        </div>
        <div class="dsc-conv-grid">
          <div class="dsc-conv-item">
            <span class="material-symbols-outlined" aria-hidden="true">motion_photos_off</span>
            <div class="dsc-conv-body">
              <div class="dsc-conv-item-title">Reduced motion</div>
              <p class="dsc-conv-item-desc">Every animation is gated on <code>prefers-reduced-motion</code> (and the in-app Reduce motion preference). Reduced = land at the end state, no loop, no stagger.</p>
            </div>
          </div>
          <div class="dsc-conv-item">
            <span class="material-symbols-outlined" aria-hidden="true">replay</span>
            <div class="dsc-conv-body">
              <div class="dsc-conv-item-title">Click to replay</div>
              <p class="dsc-conv-item-desc">Scorecards and charts re-run on click. Streaming, fly-in, and the thinking helix have an explicit Replay. Nothing is one-shot.</p>
            </div>
          </div>
          <div class="dsc-conv-item">
            <span class="material-symbols-outlined" aria-hidden="true">width_wide</span>
            <div class="dsc-conv-body">
              <div class="dsc-conv-item-title">Four-tier rest</div>
              <p class="dsc-conv-item-desc">A module with a width changer rests at single, double, or fill — drag is a preview, release snaps. <strong>Custom</strong> is the fourth rest state: no snap, free pixel width, and the row becomes a carousel rail. Each module keeps its own setting when you change or resize another.</p>
            </div>
          </div>
          <div class="dsc-conv-item">
            <span class="material-symbols-outlined" aria-hidden="true">stay_current_landscape</span>
            <div class="dsc-conv-body">
              <div class="dsc-conv-item-title">Width is the rail</div>
              <p class="dsc-conv-item-desc">Narrow the browser and pinned modules overflow sideways — that is the carousel. They keep the custom width they were given (<code>flex-shrink: 0</code>); the row never squeezes or restacks to fit.</p>
            </div>
          </div>
          <div class="dsc-conv-item">
            <span class="material-symbols-outlined" aria-hidden="true">height</span>
            <div class="dsc-conv-body">
              <div class="dsc-conv-item-title">Height shrinks the surface</div>
              <p class="dsc-conv-item-desc">Shorten the browser and each module’s inner work surface gets shorter. Module widths, chips and controls stay the same size. Overflow still goes sideways on the rail — never a squeeze.</p>
            </div>
          </div>
          <div class="dsc-conv-item">
            <span class="material-symbols-outlined" aria-hidden="true">drag_indicator</span>
            <div class="dsc-conv-body">
              <div class="dsc-conv-item-title">Hover, then drag</div>
              <p class="dsc-conv-item-desc">Resize handles are invisible at rest. Hover the seam between two modules and the grip fades in. Reorder and file use an explicit grip or a whole-card drag.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="mi-stats" id="mi-motion-stats" role="group" aria-label="Filter motion examples">
        <button type="button" class="mi-stat is-active" data-motion-filter="all" aria-pressed="true">
          <span class="mi-stat-num">${MOTION_ITEMS.length}</span>
          <span class="mi-stat-label"><span class="mi-stat-text">All</span><span class="material-symbols-outlined">animation</span></span>
        </button>
        <button type="button" class="mi-stat" data-motion-filter="anim" aria-pressed="false">
          <span class="mi-stat-num">${animN}</span>
          <span class="mi-stat-label"><span class="mi-stat-text">Animations</span><span class="material-symbols-outlined">auto_awesome</span></span>
        </button>
        <button type="button" class="mi-stat" data-motion-filter="drag" aria-pressed="false">
          <span class="mi-stat-num">${dragN}</span>
          <span class="mi-stat-label"><span class="mi-stat-text">Drag &amp; resize</span><span class="material-symbols-outlined">drag_indicator</span></span>
        </button>
      </div>

      <div class="mi-motion-grid" id="mi-motion-grid">
        ${MOTION_ITEMS.map(motionCard).join('')}
      </div>
    </section>`;
}

function runMotionHelix(mod, chat, ctx) {
  const reduced = ctx.reduced;
  const runStream = ctx.runStream;
  const runFly = ctx.runFly;
  const runToast = ctx.runToast;
  const runOutfan = ctx.runOutfan;
  const replayChart = ctx.replayChart;
  const {
    createHelixBgAnim, readBgAnimScaleAxes, readBgAnimKnobs, readBgAnimDotsColor,
    readBgAnimDotsMotion, readBgAnimSpinDir, readBgAnimLook, readBgAnimCamera,
    readBgAnimAzimuth, readBgAnimShift, readBgAnimMotionKnobs, readBgAnimRungsMatch,
    readBgAnimOpacityPct, readBgAnimAngle,
    bgAnimPctToStop, bgAnimStopToPct,
  } = chat;

  /* ---- Welcome helix ---- */
  const helixHost = mod.querySelector('[data-motion-helix]');
  const helixBody = mod.querySelector('[data-helix-body]');
  const helixRange = mod.querySelector('[data-helix-opacity]');
  const helixVal = mod.querySelector('[data-helix-opacity-val]');
  const helixAngleRange = mod.querySelector('[data-helix-angle]');
  const helixAngleVal = mod.querySelector('[data-helix-angle-val]');
  const helixCameraRange = mod.querySelector('[data-helix-camera]');
  const helixCameraVal = mod.querySelector('[data-helix-camera-val]');
  const helixAzimuthRange = mod.querySelector('[data-helix-azimuth]');
  const helixAzimuthVal = mod.querySelector('[data-helix-azimuth-val]');
  const helixShiftRange = mod.querySelector('[data-helix-shift]');
  const helixShiftVal = mod.querySelector('[data-helix-shift-val]');
  const BGANIM_OPACITY_KEY = 'wise:chat-bg-anim-opacity';
  const BGANIM_ANGLE_KEY = 'wise:chat-bg-anim-angle';
  const BGANIM_CAMERA_KEY = 'wise:chat-bg-anim-camera';
  const BGANIM_AZIMUTH_KEY = 'wise:chat-bg-anim-azimuth';
  const BGANIM_SHIFT_KEY = 'wise:chat-bg-anim-shift';
  const BGANIM_SCALE_AXIS_KEYS = {
    x: 'wise:chat-bg-anim-scale-x',
    y: 'wise:chat-bg-anim-scale-y',
    z: 'wise:chat-bg-anim-scale-z',
  };
  const BGANIM_KNOB_KEYS = {
    pitch: 'wise:chat-bg-anim-pitch',
    nodes: 'wise:chat-bg-anim-nodes',
    dots: 'wise:chat-bg-anim-dots',
    length: 'wise:chat-bg-anim-length',
    rungs: 'wise:chat-bg-anim-rungs',
    rungthick: 'wise:chat-bg-anim-rungthick',
    thickness: 'wise:chat-bg-anim-thickness',
    depth: 'wise:chat-bg-anim-depth',
    speed: 'wise:chat-bg-anim-speed',
  };
  const BGANIM_DOTS_COLOR_KEY = 'wise:chat-bg-anim-dots-color';
  const BGANIM_DOTS_MOTION_KEY = 'wise:chat-bg-anim-dots-motion';
  const BGANIM_DOTS_MOTIONS = ['still', 'pulse', 'spark'];
  const BGANIM_SPIN_KEY = 'wise:chat-bg-anim-spin';
  const BGANIM_SPIN_DIRS = ['fwd', 'rev'];
  /* The scale / shape sliders carry a STOP INDEX, not the percentage — see
     bgAnimPctToStop in js/wiseai-chat.js — so the shrink half of the 1–800%
     window gets as much track as the growth half. */
  const helixStopLast = bgAnimPctToStop(1e6);
  mod.querySelectorAll('.sc-bganim-scale-range, .sc-bganim-knob-range, .sc-bganim-motion-knob-range').forEach((r) => {
    r.min = '0';
    r.max = String(helixStopLast);
    r.step = '1';
  });
  const clampHelixPct = (n) => bgAnimStopToPct(bgAnimPctToStop(n));
  const readHelixPct = () => readBgAnimOpacityPct();
  const readHelixAngle = () => readBgAnimAngle();
  let helixPct = readHelixPct();
  let helixAngle = readHelixAngle();
  let helixCamera = readBgAnimCamera();
  let helixAzimuth = readBgAnimAzimuth();
  let helixShift = readBgAnimShift();
  const helixScale = readBgAnimScaleAxes();
  const helixKnobs = readBgAnimKnobs();
  const helixDots = { color: readBgAnimDotsColor(), motion: readBgAnimDotsMotion() };
  const helixMotionKnobs = readBgAnimMotionKnobs();
  const BGANIM_MOTION_KNOB_KEYS = {
    'pulse-speed': 'wise:chat-bg-anim-pulse-speed',
    'pulse-length': 'wise:chat-bg-anim-pulse-length',
    'pulse-size': 'wise:chat-bg-anim-pulse-size',
    'spark-speed': 'wise:chat-bg-anim-spark-speed',
    'spark-length': 'wise:chat-bg-anim-spark-length',
    'spark-size': 'wise:chat-bg-anim-spark-size',
  };
  const BGANIM_DOTS_COLOR_ORIGINAL = '#25507c';
  let helixSpinDir = readBgAnimSpinDir();
  let helixRungsMatch = readBgAnimRungsMatch();
  let helixPaused = false;
  let helix = null;
  const paintHelixOpacity = (pct, persist) => {
    helixPct = Math.max(10, Math.min(100, pct));
    if (helixRange) helixRange.value = String(helixPct);
    if (helixVal) helixVal.textContent = helixPct + '%';
    if (persist) {
      try { localStorage.setItem(BGANIM_OPACITY_KEY, String(helixPct)); } catch (_) { /* ignore */ }
      try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-opacity', { detail: { opacity: helixPct / 100 } })); } catch (_) { /* ignore */ }
    }
    if (reduced && helix) helix.start();
  };
  const paintHelixAngle = (deg, persist) => {
    helixAngle = Math.max(-90, Math.min(90, deg));
    if (helixAngleRange) helixAngleRange.value = String(helixAngle);
    if (helixAngleVal) helixAngleVal.textContent = helixAngle + '°';
    if (persist) {
      try { localStorage.setItem(BGANIM_ANGLE_KEY, String(helixAngle)); } catch (_) { /* ignore */ }
      try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-angle', { detail: { angle: helixAngle } })); } catch (_) { /* ignore */ }
    }
    if (helix) {
      if (reduced) helix.start();
      else helix.redraw();
    }
  };
  const paintHelixCamera = (deg, persist) => {
    helixCamera = Math.max(-90, Math.min(90, Math.round(deg)));
    if (helixCameraRange) helixCameraRange.value = String(helixCamera);
    if (helixCameraVal) helixCameraVal.textContent = helixCamera + '°';
    if (persist) {
      try { localStorage.setItem(BGANIM_CAMERA_KEY, String(helixCamera)); } catch (_) { /* ignore */ }
      try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-camera', { detail: { camera: helixCamera } })); } catch (_) { /* ignore */ }
    }
    if (helix) {
      if (reduced) helix.start();
      else helix.redraw();
    }
  };
  const paintHelixAzimuth = (deg, persist) => {
    let d = Math.round(deg);
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    helixAzimuth = Math.max(-180, Math.min(180, d));
    if (helixAzimuthRange) helixAzimuthRange.value = String(helixAzimuth);
    if (helixAzimuthVal) helixAzimuthVal.textContent = helixAzimuth + '°';
    if (persist) {
      try { localStorage.setItem(BGANIM_AZIMUTH_KEY, String(helixAzimuth)); } catch (_) { /* ignore */ }
      try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-azimuth', { detail: { azimuth: helixAzimuth } })); } catch (_) { /* ignore */ }
    }
    if (helix) {
      if (reduced) helix.start();
      else helix.redraw();
    }
  };
  const paintHelixShift = (pct, persist) => {
    helixShift = Math.max(-100, Math.min(100, Math.round(pct)));
    if (helixShiftRange) helixShiftRange.value = String(helixShift);
    if (helixShiftVal) helixShiftVal.textContent = helixShift + '%';
    if (persist) {
      try { localStorage.setItem(BGANIM_SHIFT_KEY, String(helixShift)); } catch (_) { /* ignore */ }
      try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-shift', { detail: { shift: helixShift } })); } catch (_) { /* ignore */ }
    }
    if (helix) {
      if (reduced) helix.start();
      else helix.redraw();
    }
  };
  /* The master row ("all") sets every axis at once and reads "—" whenever the
     three disagree — same behavior as the master Scale row in the chat ⋯ menu. */
  const paintHelixScaleMaster = () => {
    const common = (helixScale.x === helixScale.y && helixScale.y === helixScale.z) ? helixScale.x : null;
    const range = mod.querySelector('[data-helix-scale="all"]');
    const val = mod.querySelector('[data-helix-scale-val="all"]');
    if (range && document.activeElement !== range) {
      range.value = String(bgAnimPctToStop(common == null
        ? Math.round((helixScale.x + helixScale.y + helixScale.z) / 3)
        : common));
    }
    if (val) val.textContent = common == null ? '—' : common + '%';
  };
  const paintHelixScaleAxis = (axis, pct, persist) => {
    if (!(axis in helixScale)) return;
    helixScale[axis] = clampHelixPct(pct);
    const range = mod.querySelector('[data-helix-scale="' + axis + '"]');
    const val = mod.querySelector('[data-helix-scale-val="' + axis + '"]');
    if (range && document.activeElement !== range) range.value = String(bgAnimPctToStop(helixScale[axis]));
    if (val) val.textContent = helixScale[axis] + '%';
    paintHelixScaleMaster();
    if (persist) {
      try { localStorage.setItem(BGANIM_SCALE_AXIS_KEYS[axis], String(helixScale[axis])); } catch (_) { /* ignore */ }
      try {
        document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-scale', {
          detail: {
            axis,
            scaleX: helixScale.x / 100,
            scaleY: helixScale.y / 100,
            scaleZ: helixScale.z / 100,
            scale: helixScale[axis] / 100,
          },
        }));
      } catch (_) { /* ignore */ }
    }
    if (helix) {
      if (reduced) helix.start();
      else helix.redraw();
    }
  };
  const paintHelixKnob = (id, pct, persist) => {
    if (!(id in helixKnobs)) return;
    helixKnobs[id] = clampHelixPct(pct);
    const range = mod.querySelector('[data-helix-knob="' + id + '"]');
    const val = mod.querySelector('[data-helix-knob-val="' + id + '"]');
    if (range && document.activeElement !== range) range.value = String(bgAnimPctToStop(helixKnobs[id]));
    if (val) val.textContent = helixKnobs[id] + '%';
    if (id === 'rungs' && helixRungsMatch && persist) {
      helixRungsMatch = false;
      const mbtn = mod.querySelector('[data-helix-rungs-match]');
      if (mbtn) mbtn.classList.remove('is-on');
      if (persist) {
        try { localStorage.removeItem('wise:chat-bg-anim-rungs-match'); } catch (_) { /* ignore */ }
        try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-rungs-match', { detail: { match: false } })); } catch (_) { /* ignore */ }
      }
    }
    if (persist) {
      try { localStorage.setItem(BGANIM_KNOB_KEYS[id], String(helixKnobs[id])); } catch (_) { /* ignore */ }
      try {
        document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-knob', {
          detail: { knob: id, pct: helixKnobs[id], value: helixKnobs[id] / 100 },
        }));
      } catch (_) { /* ignore */ }
    }
    if (helix) {
      if (reduced) helix.start();
      else helix.redraw();
    }
  };
  const paintHelixRungsMatch = (persist) => {
    const btn = mod.querySelector('[data-helix-rungs-match]');
    if (btn) btn.classList.toggle('is-on', helixRungsMatch);
    const val = mod.querySelector('[data-helix-knob-val="rungs"]');
    if (val) val.textContent = helixRungsMatch ? 'nodes' : helixKnobs.rungs + '%';
    if (persist) {
      try {
        if (helixRungsMatch) localStorage.setItem('wise:chat-bg-anim-rungs-match', '1');
        else localStorage.removeItem('wise:chat-bg-anim-rungs-match');
      } catch (_) { /* ignore */ }
      try {
        document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-rungs-match', { detail: { match: helixRungsMatch } }));
      } catch (_) { /* ignore */ }
    }
    if (helix) {
      if (reduced) helix.start();
      else helix.redraw();
    }
  };
  const paintHelixDots = (persist) => {
    const input = mod.querySelector('[data-helix-dots-color]');
    const match = mod.querySelector('[data-helix-dots-match]');
    const reset = mod.querySelector('[data-helix-dots-reset]');
    const matching = !helixDots.color;
    if (input && document.activeElement !== input) {
      input.value = matching ? BGANIM_DOTS_COLOR_ORIGINAL : helixDots.color;
    }
    if (match) match.classList.toggle('is-on', matching);
    if (reset) reset.classList.toggle('is-on', !matching && helixDots.color === BGANIM_DOTS_COLOR_ORIGINAL);
    mod.querySelectorAll('[data-helix-dots-motion]').forEach((btn) => {
      const on = btn.getAttribute('data-helix-dots-motion') === helixDots.motion;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    mod.querySelectorAll('[data-helix-motion-knob]').forEach((el) => {
      el.hidden = el.getAttribute('data-helix-motion-knob') !== helixDots.motion;
    });
    if (persist) {
      try {
        if (helixDots.color) localStorage.setItem(BGANIM_DOTS_COLOR_KEY, helixDots.color);
        else localStorage.removeItem(BGANIM_DOTS_COLOR_KEY);
        localStorage.setItem(BGANIM_DOTS_MOTION_KEY, helixDots.motion);
      } catch (_) { /* ignore */ }
      try {
        document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-dots', {
          detail: { color: helixDots.color || '', motion: helixDots.motion },
        }));
      } catch (_) { /* ignore */ }
    }
    if (helix) {
      if (reduced) helix.start();
      else helix.redraw();
    }
  };
  const paintHelixMotionKnob = (motion, id, pct, persist) => {
    if (!helixMotionKnobs[motion] || !(id in helixMotionKnobs[motion])) return;
    helixMotionKnobs[motion][id] = clampHelixPct(pct);
    const range = mod.querySelector('[data-helix-motion="' + motion + '"][data-helix-motion-id="' + id + '"]');
    const val = mod.querySelector('[data-helix-motion-val="' + motion + '-' + id + '"]');
    if (range && document.activeElement !== range) range.value = String(bgAnimPctToStop(helixMotionKnobs[motion][id]));
    if (val) val.textContent = helixMotionKnobs[motion][id] + '%';
    if (persist) {
      const key = BGANIM_MOTION_KNOB_KEYS[motion + '-' + id];
      if (key) { try { localStorage.setItem(key, String(helixMotionKnobs[motion][id])); } catch (_) { /* ignore */ } }
      try {
        document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-motion-knob', {
          detail: { motion, knob: id, pct: helixMotionKnobs[motion][id], value: helixMotionKnobs[motion][id] / 100 },
        }));
      } catch (_) { /* ignore */ }
    }
    if (helix) {
      if (reduced) helix.start();
      else helix.redraw();
    }
  };
  const paintHelixSpin = (persist) => {
    mod.querySelectorAll('[data-helix-spin]').forEach((btn) => {
      const on = btn.getAttribute('data-helix-spin') === helixSpinDir;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    if (persist) {
      try { localStorage.setItem(BGANIM_SPIN_KEY, helixSpinDir); } catch (_) { /* ignore */ }
      try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-spin', { detail: { dir: helixSpinDir } })); } catch (_) { /* ignore */ }
    }
    if (helix) {
      if (reduced) helix.start();
      else helix.redraw();
    }
  };
  const paintHelixScaleAll = () => {
    paintHelixScaleAxis('x', helixScale.x, false);
    paintHelixScaleAxis('y', helixScale.y, false);
    paintHelixScaleAxis('z', helixScale.z, false);
    Object.keys(helixKnobs).forEach((id) => paintHelixKnob(id, helixKnobs[id], false));
  };
  paintHelixOpacity(helixPct, false);
  paintHelixAngle(helixAngle, false);
  paintHelixCamera(helixCamera, false);
  paintHelixAzimuth(helixAzimuth, false);
  paintHelixShift(helixShift, false);
  paintHelixScaleAll();
  paintHelixDots(false);
  paintHelixSpin(false);
  paintHelixRungsMatch(false);
  ['pulse', 'spark'].forEach((motion) => {
    Object.keys(helixMotionKnobs[motion] || {}).forEach((id) => {
      paintHelixMotionKnob(motion, id, helixMotionKnobs[motion][id], false);
    });
  });
  if (helixHost && helixBody) {
    helix = createHelixBgAnim({
      host: helixHost,
      getBody: () => helixBody,
      getOpacity: () => helixPct / 100,
      getAngle: () => helixAngle,
      getCamera: () => helixCamera,
      getAzimuth: () => helixAzimuth,
      getShift: () => helixShift,
      getScale: () => ({ x: helixScale.x / 100, y: helixScale.y / 100, z: helixScale.z / 100 }),
      getPitch: () => helixKnobs.pitch / 100,
      getNodes: () => helixKnobs.nodes / 100,
      getDots: () => helixKnobs.dots / 100,
      getDotsColor: () => helixDots.color,
      getDotsMotion: () => helixDots.motion,
      getMotionKnob: (motion, id) => ((helixMotionKnobs[motion] && helixMotionKnobs[motion][id]) || 100) / 100,
      getSpinDir: () => helixSpinDir,
      getLook: () => readBgAnimLook(),
      getSpinSpeed: () => helixKnobs.speed / 100,
      getLength: () => helixKnobs.length / 100,
      getRungs: () => helixKnobs.rungs / 100,
      getRungsMatch: () => helixRungsMatch,
      getRungThick: () => helixKnobs.rungthick / 100,
      getThickness: () => helixKnobs.thickness / 100,
      getDepth: () => helixKnobs.depth / 100,
      reducedMotion: reduced,
      isOn: () => !mod.classList.contains('is-collapsed'),
      isPaused: () => helixPaused,
    });
  }
  helixRange?.addEventListener('input', () => {
    paintHelixOpacity(parseInt(helixRange.value, 10) || 20, true);
  });
  helixAngleRange?.addEventListener('input', () => {
    paintHelixAngle(parseInt(helixAngleRange.value, 10) || 0, true);
  });
  helixCameraRange?.addEventListener('input', () => {
    paintHelixCamera(parseInt(helixCameraRange.value, 10) || 0, true);
  });
  helixAzimuthRange?.addEventListener('input', () => {
    paintHelixAzimuth(parseInt(helixAzimuthRange.value, 10) || 0, true);
  });
  helixShiftRange?.addEventListener('input', () => {
    paintHelixShift(parseInt(helixShiftRange.value, 10) || 0, true);
  });
  mod.querySelectorAll('[data-helix-scale]').forEach((range) => {
    range.addEventListener('input', () => {
      const axis = range.getAttribute('data-helix-scale');
      const pct = bgAnimStopToPct(range.value);
      if (axis === 'all') ['x', 'y', 'z'].forEach((a) => paintHelixScaleAxis(a, pct, true));
      else paintHelixScaleAxis(axis, pct, true);
    });
  });
  mod.querySelectorAll('[data-helix-knob]').forEach((range) => {
    range.addEventListener('input', () => {
      paintHelixKnob(range.getAttribute('data-helix-knob'), bgAnimStopToPct(range.value), true);
    });
  });
  mod.querySelector('[data-helix-rungs-match]')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (helixRungsMatch) return;
    helixRungsMatch = true;
    paintHelixRungsMatch(true);
  });
  const helixDotsColor = mod.querySelector('[data-helix-dots-color]');
  helixDotsColor?.addEventListener('input', () => {
    const hex = String(helixDotsColor.value || '').trim().toLowerCase();
    if (!/^#[0-9a-f]{6}$/.test(hex)) return;
    helixDots.color = hex;
    paintHelixDots(true);
  });
  mod.querySelector('[data-helix-dots-match]')?.addEventListener('click', () => {
    helixDots.color = '';
    paintHelixDots(true);
  });
  mod.querySelector('[data-helix-dots-reset]')?.addEventListener('click', () => {
    helixDots.color = BGANIM_DOTS_COLOR_ORIGINAL;
    paintHelixDots(true);
  });
  mod.querySelectorAll('[data-helix-dots-motion]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const motion = btn.getAttribute('data-helix-dots-motion');
      if (!BGANIM_DOTS_MOTIONS.includes(motion) || motion === helixDots.motion) return;
      helixDots.motion = motion;
      paintHelixDots(true);
    });
  });
  mod.querySelectorAll('[data-helix-motion]').forEach((range) => {
    range.addEventListener('input', () => {
      paintHelixMotionKnob(range.getAttribute('data-helix-motion'), range.getAttribute('data-helix-motion-id'), bgAnimStopToPct(range.value), true);
    });
  });
  mod.querySelectorAll('[data-helix-spin]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dir = btn.getAttribute('data-helix-spin');
      if (!BGANIM_SPIN_DIRS.includes(dir) || dir === helixSpinDir) return;
      helixSpinDir = dir;
      paintHelixSpin(true);
    });
  });
  document.addEventListener('wise:chat-bg-anim-opacity', (e) => {
    const v = e && e.detail && e.detail.opacity;
    if (typeof v !== 'number') return;
    paintHelixOpacity(Math.round(v * 100), false);
  });
  document.addEventListener('wise:chat-bg-anim-angle', (e) => {
    const v = e && e.detail && e.detail.angle;
    if (typeof v !== 'number') return;
    paintHelixAngle(v, false);
  });
  document.addEventListener('wise:chat-bg-anim-camera', (e) => {
    const v = e && e.detail && e.detail.camera;
    if (typeof v !== 'number') return;
    paintHelixCamera(v, false);
  });
  document.addEventListener('wise:chat-bg-anim-azimuth', (e) => {
    const v = e && e.detail && e.detail.azimuth;
    if (typeof v !== 'number') return;
    paintHelixAzimuth(v, false);
  });
  document.addEventListener('wise:chat-bg-anim-shift', (e) => {
    const v = e && e.detail && e.detail.shift;
    if (typeof v !== 'number') return;
    paintHelixShift(v, false);
  });
  document.addEventListener('wise:chat-bg-anim-scale', (e) => {
    const d = e && e.detail;
    if (!d) return;
    if (typeof d.scaleX === 'number') paintHelixScaleAxis('x', Math.round(d.scaleX * 100), false);
    if (typeof d.scaleY === 'number') paintHelixScaleAxis('y', Math.round(d.scaleY * 100), false);
    if (typeof d.scaleZ === 'number') paintHelixScaleAxis('z', Math.round(d.scaleZ * 100), false);
    else if (typeof d.scale === 'number') {
      paintHelixScaleAxis(d.axis === 'x' || d.axis === 'z' ? d.axis : 'y', Math.round(d.scale * 100), false);
    }
  });
  document.addEventListener('wise:chat-bg-anim-knob', (e) => {
    const d = e && e.detail;
    if (!d || !(d.knob in helixKnobs)) return;
    const pct = typeof d.pct === 'number' ? d.pct : (typeof d.value === 'number' ? Math.round(d.value * 100) : NaN);
    if (!Number.isFinite(pct)) return;
    paintHelixKnob(d.knob, pct, false);
  });
  document.addEventListener('wise:chat-bg-anim-rungs-match', (e) => {
    const on = !!(e && e.detail && e.detail.match);
    if (on === helixRungsMatch) return;
    helixRungsMatch = on;
    paintHelixRungsMatch(false);
  });
  document.addEventListener('wise:chat-bg-anim-dots', (e) => {
    const d = e && e.detail;
    if (!d) return;
    if (typeof d.color === 'string') helixDots.color = /^#[0-9a-fA-F]{6}$/.test(d.color) ? d.color.toLowerCase() : '';
    if (BGANIM_DOTS_MOTIONS.includes(d.motion)) helixDots.motion = d.motion;
    paintHelixDots(false);
  });
  document.addEventListener('wise:chat-bg-anim-motion-knob', (e) => {
    const d = e && e.detail;
    if (!d || !helixMotionKnobs[d.motion] || !(d.knob in helixMotionKnobs[d.motion])) return;
    const pct = typeof d.pct === 'number' ? d.pct : (typeof d.value === 'number' ? Math.round(d.value * 100) : NaN);
    if (!Number.isFinite(pct)) return;
    paintHelixMotionKnob(d.motion, d.knob, pct, false);
  });
  document.addEventListener('wise:chat-bg-anim-spin', (e) => {
    const d = e && e.detail && e.detail.dir;
    if (!BGANIM_SPIN_DIRS.includes(d) || d === helixSpinDir) return;
    helixSpinDir = d;
    paintHelixSpin(false);
  });
  const ppBtn = mod.querySelector('[data-helix-pp]');
  const syncHelixPp = () => {
    if (!ppBtn) return;
    ppBtn.setAttribute('aria-pressed', helixPaused ? 'true' : 'false');
    const ic = ppBtn.querySelector('[data-helix-pp-ic]');
    const lab = ppBtn.querySelector('[data-helix-pp-label]');
    if (ic) ic.textContent = helixPaused ? 'play_arrow' : 'pause';
    if (lab) lab.textContent = helixPaused ? 'Play helix' : 'Pause helix';
  };
  ppBtn?.addEventListener('click', () => {
    helixPaused = !helixPaused;
    if (helix) { if (helixPaused) helix.pause(); else helix.resume(); }
    syncHelixPp();
  });

  /* ---- Jump to Streaming Trace ---- */
  mod.querySelector('[data-jump-trace]')?.addEventListener('click', () => {
    expandAccordionSection(root, 'mi-trace');
    root.querySelector('#mi-trace [data-trace-run]')?.click();
    document.getElementById('mi-trace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ---- Mini accordion ---- */
  const accHead = mod.querySelector('[data-motion-acc] .mi-motion-acc-head');
  const accBody = mod.querySelector('[data-motion-acc] .mi-motion-acc-body');
  accHead?.addEventListener('click', () => {
    const open = accHead.getAttribute('aria-expanded') === 'true';
    accHead.setAttribute('aria-expanded', open ? 'false' : 'true');
    if (accBody) accBody.hidden = open;
  });

  const replaySticky = () => {
    mod.querySelectorAll('[data-sticky-slide]').forEach((el) => {
      el.classList.remove('mi-motion-sticky-slide');
      void el.offsetWidth;
      el.classList.add('mi-motion-sticky-slide');
    });
  };
  mod.querySelector('[data-sticky-run]')?.addEventListener('click', replaySticky);

  const replayActStrip = () => {
    const t = mod.querySelector('[data-motion-act] .wa-activity-flash-target');
    if (!t) return;
    t.classList.remove('wa-activity-flash');
    void t.offsetWidth;
    t.classList.add('wa-activity-flash');
  };
  mod.querySelector('[data-actstrip-run]')?.addEventListener('click', replayActStrip);

  /* ---- Splitter ---- */
  const split = mod.querySelector('[data-motion-split]');
  if (split) {
    const hit = split.querySelector('[data-split-hit]');
    const a = split.querySelector('[data-split-pane="a"]');
    const b = split.querySelector('[data-split-pane="b"]');
    const labels = split.querySelectorAll('[data-split-w]');
    const setPct = (pct) => {
      const left = Math.max(22, Math.min(78, pct));
      a.style.flex = `1 1 ${left}%`;
      b.style.flex = `1 1 ${100 - left}%`;
      if (labels[0]) labels[0].textContent = Math.round(left) + '%';
      if (labels[1]) labels[1].textContent = Math.round(100 - left) + '%';
    };
    let dragging = false;
    const onMove = (e) => {
      if (!dragging) return;
      const r = split.getBoundingClientRect();
      setPct(((e.clientX - r.left) / r.width) * 100);
    };
    const onUp = () => {
      dragging = false;
      split.classList.remove('is-dragging');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    hit?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      dragging = true;
      split.classList.add('is-dragging');
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
    hit?.addEventListener('dblclick', () => setPct(46));
  }

  /* ---- Width tiers ---- */
  const widthPane = mod.querySelector('[data-width-pane]');
  const widthBtn = mod.querySelector('[data-width-btn]');
  const widthLab = mod.querySelector('[data-width-label]');
  const TIER_NAMES = ['single', 'double', 'double', 'fill', 'custom'];
  let widthTier = 0;
  const applyWidth = () => {
    if (window.WPaneWidth) {
      window.WPaneWidth.applyClasses(widthPane, widthTier, 'panel');
      window.WPaneWidth.syncButton(widthBtn, widthTier);
    } else if (widthPane) {
      widthPane.classList.toggle('panel-wide', widthTier >= 1 && widthTier < 4);
      widthPane.classList.toggle('panel-triple', widthTier === 3);
      widthPane.classList.toggle('panel-fill', widthTier === 3);
      widthPane.classList.toggle('panel-custom', widthTier === 4);
    }
    if (widthLab) widthLab.textContent = TIER_NAMES[widthTier] || 'single';
  };
  widthBtn?.addEventListener('click', () => {
    if (window.WPaneWidth) widthTier = window.WPaneWidth.next(widthTier);
    else if (widthTier <= 0) widthTier = 1;
    else if (widthTier === 1 || widthTier === 2) widthTier = 3;
    else if (widthTier === 3) widthTier = 4;
    else widthTier = 0;
    applyWidth();
  });

  /* ---- Carousel rail (browser width is the rail; height shrinks inners) ---- */
  const CAR_W_DEFAULT = 56;
  const CAR_H_DEFAULT = 100;
  const carHost = mod.querySelector('[data-motion-car]');
  const carBrowser = carHost?.querySelector('[data-car-browser]');
  const carRow = carHost?.querySelector('[data-car-row]');
  const carWRange = carHost?.querySelector('[data-car-w]');
  const carWVal = carHost?.querySelector('[data-car-w-val]');
  const carHRange = carHost?.querySelector('[data-car-h]');
  const carHVal = carHost?.querySelector('[data-car-h-val]');
  const CAR_ROW_H = 176;
  const clampCarPct = (pct, fallback) => Math.max(42, Math.min(100, Number(pct) || fallback));
  const applyCarWidth = (pct) => {
    const n = clampCarPct(pct, CAR_W_DEFAULT);
    if (carBrowser) carBrowser.style.width = 'max(260px, ' + n + '%)';
    if (carWVal) carWVal.textContent = n + '%';
    if (carWRange && Number(carWRange.value) !== n) carWRange.value = String(n);
  };
  const applyCarHeight = (pct) => {
    const n = clampCarPct(pct, CAR_H_DEFAULT);
    if (carRow) carRow.style.height = Math.max(72, Math.round(CAR_ROW_H * n / 100)) + 'px';
    if (carHVal) carHVal.textContent = n + '%';
    if (carHRange && Number(carHRange.value) !== n) carHRange.value = String(n);
  };
  carWRange?.addEventListener('input', () => applyCarWidth(carWRange.value));
  carHRange?.addEventListener('input', () => applyCarHeight(carHRange.value));
  applyCarWidth(carWRange?.value || CAR_W_DEFAULT);
  applyCarHeight(carHRange?.value || CAR_H_DEFAULT);

  /* ---- Reorder ---- */
  const reorder = mod.querySelector('[data-motion-reorder]');
  if (reorder) {
    let dragEl = null;
    reorder.addEventListener('dragstart', (e) => {
      const tile = e.target.closest('[data-reorder-id]');
      if (!tile) return;
      dragEl = tile;
      tile.classList.add('is-dragging');
      if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', tile.dataset.reorderId); }
    });
    reorder.addEventListener('dragover', (e) => {
      if (!dragEl) return;
      const tile = e.target.closest('[data-reorder-id]');
      if (!tile || tile === dragEl) return;
      e.preventDefault();
      const mid = tile.getBoundingClientRect().left + tile.offsetWidth / 2;
      if (e.clientX < mid) reorder.insertBefore(dragEl, tile);
      else reorder.insertBefore(dragEl, tile.nextSibling);
    });
    reorder.addEventListener('dragend', () => {
      dragEl?.classList.remove('is-dragging');
      dragEl = null;
    });
  }

  /* ---- Drag to file ---- */
  const fileHost = mod.querySelector('[data-motion-file]');
  if (fileHost) {
    const unfile = fileHost.querySelector('.mi-motion-folder--unfile');
    let fileId = null;
    const filed = {};
    const folderTiles = fileHost.querySelectorAll('.mi-motion-folder[data-folder]:not(.mi-motion-folder--unfile)');
    const updateCounts = () => {
      folderTiles.forEach((tile) => {
        const base = Number(tile.dataset.folderBase || 0);
        const extra = Object.values(filed).filter((v) => v === tile.getAttribute('data-folder')).length;
        const numEl = tile.querySelector('.mi-motion-folder-num');
        if (numEl) numEl.textContent = String(base + extra);
      });
    };
    const paintChip = (card) => {
      const id = card.dataset.fileId;
      let chip = card.querySelector('.mi-motion-file-chip');
      if (filed[id]) {
        if (!chip) {
          chip = document.createElement('span');
          chip.className = 'mi-motion-file-chip';
          card.appendChild(chip);
        }
        chip.textContent = filed[id];
      } else if (chip) {
        chip.remove();
      }
    };
    fileHost.addEventListener('dragstart', (e) => {
      const card = e.target.closest('[data-file-id]');
      if (!card) return;
      fileId = card.dataset.fileId;
      card.classList.add('is-dragging');
      if (unfile) unfile.hidden = !filed[fileId];
      if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', fileId); }
    });
    fileHost.addEventListener('dragover', (e) => {
      if (!fileId) return;
      const folder = e.target.closest('[data-folder]');
      if (!folder) return;
      e.preventDefault();
      fileHost.querySelectorAll('.is-drop-target').forEach((el) => el.classList.remove('is-drop-target'));
      folder.classList.add('is-drop-target');
    });
    fileHost.addEventListener('drop', (e) => {
      const folder = e.target.closest('[data-folder]');
      if (!fileId || !folder) return;
      e.preventDefault();
      const name = folder.getAttribute('data-folder');
      if (name) filed[fileId] = name;
      else delete filed[fileId];
      const card = fileHost.querySelector(`[data-file-id="${fileId}"]`);
      if (card) paintChip(card);
      updateCounts();
    });
    fileHost.addEventListener('dragend', () => {
      fileId = null;
      if (unfile) unfile.hidden = true;
      fileHost.querySelectorAll('.is-dragging, .is-drop-target').forEach((el) => el.classList.remove('is-dragging', 'is-drop-target'));
    });
  }

  /* ---- Drag to found a folder (Library card-on-card) ---- */
  const foundHost = mod.querySelector('[data-motion-found]');
  if (foundHost) {
    const cardsWrap = foundHost.querySelector('.mi-motion-found-cards');
    const foldersWrap = foundHost.querySelector('[data-found-folders]');
    let foundId = null;
    let folderN = 0;
    const membership = {};
    const FOUND_COLORS = ['#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#2F6DF6', '#12B981'];
    const clearTargets = () => foundHost.querySelectorAll('.is-drop-target').forEach((el) => el.classList.remove('is-drop-target'));
    const hideIfFiled = (id) => {
      const card = cardsWrap.querySelector(`[data-found-id="${id}"]`);
      if (card) card.hidden = !!membership[id];
    };
    foundHost.addEventListener('dragstart', (e) => {
      const card = e.target.closest('[data-found-id]');
      if (!card || card.hidden) return;
      foundId = card.dataset.foundId;
      card.classList.add('is-dragging');
      if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', foundId); }
    });
    foundHost.addEventListener('dragover', (e) => {
      if (!foundId) return;
      const card = e.target.closest('[data-found-id]');
      const folder = e.target.closest('[data-found-folder]');
      if (card && card.dataset.foundId !== foundId && !card.hidden) {
        e.preventDefault();
        clearTargets();
        card.classList.add('is-drop-target');
      } else if (folder) {
        e.preventDefault();
        clearTargets();
        folder.classList.add('is-drop-target');
      }
    });
    foundHost.addEventListener('drop', (e) => {
      if (!foundId) return;
      const card = e.target.closest('[data-found-id]');
      const folder = e.target.closest('[data-found-folder]');
      e.preventDefault();
      if (card && card.dataset.foundId !== foundId && !card.hidden) {
        folderN += 1;
        const fid = `f${folderN}`;
        membership[foundId] = fid;
        membership[card.dataset.foundId] = fid;
        hideIfFiled(foundId);
        hideIfFiled(card.dataset.foundId);
        const tile = document.createElement('div');
        tile.className = 'mi-motion-folder mi-motion-found-folder';
        tile.setAttribute('data-found-folder', fid);
        tile.style.setProperty('--fld', FOUND_COLORS[(folderN - 1) % FOUND_COLORS.length]);
        tile.innerHTML = `<span class="mi-motion-folder-num">2</span><span class="mi-motion-folder-label"><span class="mi-motion-folder-dot"></span><input type="text" class="mi-motion-found-name" value="New folder" aria-label="Folder name" maxlength="40"></span>`;
        foldersWrap.appendChild(tile);
        const input = tile.querySelector('.mi-motion-found-name');
        input?.focus();
        input?.select();
      } else if (folder) {
        const fid = folder.getAttribute('data-found-folder');
        membership[foundId] = fid;
        hideIfFiled(foundId);
        const n = Object.values(membership).filter((v) => v === fid).length;
        const numEl = folder.querySelector('.mi-motion-folder-num');
        if (numEl) numEl.textContent = String(n);
      }
    });
    foundHost.addEventListener('dragend', () => {
      foundId = null;
      foundHost.querySelectorAll('.is-dragging').forEach((el) => el.classList.remove('is-dragging'));
      clearTargets();
    });
  }

  /* ---- Replay all (used by the ⋯ menu) ---- */
  const replayAll = () => {
    mod.querySelectorAll('[data-motion-chart]').forEach(replayChart);
    runStream();
    runFly();
    if (typeof runToast === 'function') runToast();
    if (typeof runOutfan === 'function') runOutfan();
    applyCarWidth(CAR_W_DEFAULT);
    applyCarHeight(CAR_H_DEFAULT);
    mod.querySelectorAll('.mi-motion-stats .mi-stat').forEach((card) => card.click());
  };
  mod.__motionReplayAll = replayAll;

  /* Don't spin the helix or fire entrance motion while the accordion is closed. */
  const startWhenOpen = () => {
    if (mod.classList.contains('is-collapsed')) {
      if (helix) helix.stop();
      return;
    }
    runStream();
    runFly();
    if (typeof runToast === 'function') runToast();
    if (typeof runOutfan === 'function') runOutfan();
    mod.querySelectorAll('[data-motion-chart]').forEach(replayChart);
    if (helix) helix.start();
  };
  startWhenOpen();
  new MutationObserver(startWhenOpen).observe(mod, { attributes: true, attributeFilter: ['class'] });
}

function wireMotion(root) {
  const mod = root.querySelector('#mi-motion');
  if (!mod) return;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Filter tiles ---- */
  const applyFilter = (filter) => {
    mod.querySelectorAll('[data-motion-card]').forEach((card) => {
      card.hidden = filter !== 'all' && card.getAttribute('data-motion-group') !== filter;
    });
    mod.querySelectorAll('[data-motion-filter]').forEach((b) => {
      const on = b.getAttribute('data-motion-filter') === filter;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  };
  mod.querySelector('#mi-motion-stats')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-motion-filter]');
    if (!btn) return;
    applyFilter(btn.getAttribute('data-motion-filter'));
  });

  /* ---- Chart replay ---- */
  const replayChart = (card) => {
    card.querySelectorAll('.adm-bar-fill').forEach((bar) => {
      const h = bar.getAttribute('data-h') || '50';
      bar.style.transition = 'none';
      bar.style.height = '0%';
      void bar.offsetHeight;
      bar.style.transition = reduced ? 'none' : 'height 0.9s cubic-bezier(0.22, 1, 0.36, 1)';
      bar.style.height = h + '%';
    });
  };
  mod.querySelectorAll('[data-motion-chart]').forEach((card) => {
    const run = () => replayChart(card);
    card.addEventListener('click', run);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); run(); }
    });
  });

  /* ---- Paragraph stream ---- */
  const STREAM_PARAS = [
    'The proposal turns today\u2019s voluntary GRAS notification into a mandatory one.',
    'Anyone introducing a substance under GRAS must notify FDA of the basis.',
    'Then the thumbs row lands, and the intent chips fly in after the copy.',
  ];
  const streamOut = mod.querySelector('[data-stream-out]');
  const streamRun = mod.querySelector('[data-stream-run]');
  let streamTimer = 0;
  const runStream = () => {
    if (!streamOut) return;
    clearTimeout(streamTimer);
    streamOut.innerHTML = STREAM_PARAS.map((p) => `<p class="mi-motion-stream-line">${esc(p)}</p>`).join('');
    const lines = Array.from(streamOut.querySelectorAll('.mi-motion-stream-line'));
    if (reduced) return;
    lines.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
    });
    let i = 0;
    const tick = () => {
      if (i >= lines.length) return;
      const el = lines[i];
      el.style.transition = 'opacity .32s ease, transform .32s cubic-bezier(0.22, 0.85, 0.25, 1)';
      el.style.opacity = '1';
      el.style.transform = 'none';
      i += 1;
      streamTimer = setTimeout(tick, 300);
    };
    streamTimer = setTimeout(tick, 40);
  };
  streamRun?.addEventListener('click', runStream);

  /* ---- Chip fly-in ---- */
  const flyChips = Array.from(mod.querySelectorAll('[data-fly-chip]'));
  const runFly = () => {
    flyChips.forEach((chip, i) => {
      chip.classList.remove('is-in');
      chip.style.transition = 'none';
      chip.style.opacity = '0';
      chip.style.transform = 'translateX(30px)';
      void chip.offsetWidth;
      if (reduced) {
        chip.style.opacity = '1';
        chip.style.transform = 'none';
        chip.classList.add('is-in');
        return;
      }
      chip.style.transition = 'opacity .28s ease, transform .38s cubic-bezier(0.22, 0.85, 0.25, 1)';
      setTimeout(() => {
        chip.style.opacity = '1';
        chip.style.transform = 'none';
        chip.classList.add('is-in');
      }, 80 + i * 90);
    });
  };
  mod.querySelector('[data-fly-run]')?.addEventListener('click', runFly);

  /* ---- Toast rise / hold / leave (bottom centre) ---- */
  const toastHost = mod.querySelector('[data-motion-toast]');
  const runToast = () => {
    const stage = toastHost && toastHost.querySelector('[data-toast-stage]');
    if (!stage) return;
    const t = document.createElement('div');
    t.className = 'ag-toast';
    t.innerHTML = '<span class="material-symbols-outlined">check_circle</span><span>Saved to your workspace</span>';
    if (reduced) {
      t.style.animation = 'none';
      t.style.opacity = '1';
      t.style.transform = 'none';
    }
    stage.appendChild(t);
    const hold = reduced ? 900 : 2600;
    setTimeout(() => {
      t.style.transition = 'opacity .3s ease, transform .3s ease';
      t.style.opacity = '0';
      t.style.transform = 'translateY(8px)';
      setTimeout(() => t.remove(), 320);
    }, hold);
  };
  toastHost?.querySelector('[data-toast-run]')?.addEventListener('click', runToast);

  /* ---- Output chip fan ---- */
  const outfanLive = mod.querySelector('[data-motion-outfan] .sc-surface-card:not(.is-hover)');
  let outfanTimer = 0;
  const runOutfan = () => {
    if (!outfanLive) return;
    clearTimeout(outfanTimer);
    outfanLive.classList.remove('is-hover');
    void outfanLive.offsetWidth;
    if (reduced) {
      outfanLive.classList.add('is-hover');
      return;
    }
    requestAnimationFrame(() => {
      outfanLive.classList.add('is-hover');
      outfanTimer = setTimeout(() => outfanLive.classList.remove('is-hover'), 1400);
    });
  };
  mod.querySelector('[data-outfan-run]')?.addEventListener('click', runOutfan);

  const replayAll = () => {
    mod.querySelectorAll('[data-motion-chart]').forEach(replayChart);
    runStream();
    runFly();
    runToast();
    runOutfan();
  };
  mod.__motionReplayAll = replayAll;

  /* Welcome helix needs the chat module. Do not parse that graph on load —
     boot it the first time this accordion actually opens. */
  const bootHelix = () => {
    if (!mod.isConnected) return;
    if (mod.classList.contains('is-collapsed')) return;
    if (mod.dataset.helixBooted === '1') return;
    mod.dataset.helixBooted = '1';
    import('./wiseai-chat.js').then((chat) => {
      runMotionHelix(mod, chat, { reduced, runStream, runFly, runToast, runOutfan, replayChart });
    }).catch((err) => {
      console.error('[all-modules] motion helix failed', err);
      delete mod.dataset.helixBooted;
    });
  };
  bootHelix();
  new MutationObserver(bootHelix).observe(mod, { attributes: true, attributeFilter: ['class'] });
}

/* ------------------------------------------------------------------ */
/* Responsiveness — phone, 14-inch laptop, and everything larger       */
/*                                                                     */
/* Three device classes the platform actually codes for:               */
/*   • Mobile  — viewport ≤768 (nav drawer) and ≤560 (stack / cards)   */
/*   • Laptop  — display ≤1512 CSS px (14" MacBook Pro). Chat single.  */
/*   • Larger  — display >1512. Same desktop shell. Chat opens double. */
/* A live stage restyles a schematic shell; the catalog names what     */
/* each surface does at each class.                                    */
/* ------------------------------------------------------------------ */

const RESP_CHAT_SINGLE_MAX = 1512;
const RESP_MOBILE_NAV = 768;
const RESP_STACK = 560;

function respScreenWidth() {
  if (typeof window.WISE_CHAT_SCREEN_WIDTH_PX === 'function') {
    return window.WISE_CHAT_SCREEN_WIDTH_PX();
  }
  try {
    const w = window.screen && +window.screen.width;
    if (w > 0) return w;
  } catch (_) { /* no screen */ }
  return window.innerWidth || 0;
}

function respViewportWidth() {
  return window.innerWidth || 0;
}

function respDisplayClass() {
  return respScreenWidth() > RESP_CHAT_SINGLE_MAX ? 'larger' : 'laptop';
}

function respLayoutClass() {
  const view = respViewportWidth();
  if (view <= RESP_STACK) return 'mobile';
  if (view <= RESP_MOBILE_NAV) return 'mobile';
  return respDisplayClass();
}

function respHereHTML() {
  const view = respViewportWidth();
  const screen = respScreenWidth();
  const chat = screen > RESP_CHAT_SINGLE_MAX ? 'double' : 'single';
  const display = screen > RESP_CHAT_SINGLE_MAX
    ? 'larger than a 14-inch laptop'
    : '14-inch laptop class';
  let layout = 'desktop';
  if (view <= RESP_STACK) layout = 'stacked phone';
  else if (view <= RESP_MOBILE_NAV) layout = 'phone nav';
  return `This window is <strong>${view}&nbsp;px</strong> wide (${layout}). The display is <strong>${screen}&nbsp;px</strong> — ${display} — so chat loads <strong>${chat}</strong>.`;
}

const RESPONSIVE_SURFACES = [
  {
    id: 'nav', icon: 'menu', title: 'Primary navigation',
    src: 'js/mobile-nav.js',
    used: 'Every signed-in page',
    changes: ['mobile'],
    lede: 'On a phone the labelled rail stands down. A floating owl and an expand icon sit top-left so the chat stays the centre of the screen. Tap expand and the full menu slides in over a dimming scrim; leave phone width and the drawer closes on its own.',
    mobile: 'Owl + expand, pinned top-left. The full menu is a left drawer over a scrim. Scroll locks while it is open.',
    laptop: 'Left rail or labelled nav — the same desktop shell as every other signed-in page. Pivot and Minimal UI still apply.',
    larger: 'Same desktop nav. Extra width goes to the modules, not the rail.',
  },
  {
    id: 'brand', icon: 'cruelty_free', title: 'Brand wordmark',
    src: 'pages/wise.css',
    used: 'Top bar and nav brand strip',
    changes: ['mobile'],
    lede: 'The full WISE wordmark holds on tablet and laptop. Only at true phone width does it collapse to the compact owl, so the brand never fights the chat for space.',
    mobile: 'At 560px and below, the wordmark and tagline hide. The owl bug is the brand.',
    laptop: 'Full wordmark on the nav and top bar.',
    larger: 'Full wordmark. Same size — it does not grow with the display.',
  },
  {
    id: 'chat', icon: 'chat', title: 'Chat width default',
    src: 'js/pane-width.js',
    used: 'Every chat module — WISEcodeAI, Add Product, Reformulation, Studio',
    changes: ['laptop', 'larger'],
    lede: 'Chat opens at a width that belongs to the <em>display</em>, not the browser window. A 14-inch MacBook Pro class stays single. Anything wider opens double. Resize or un-maximise the window and the default does not flip. You can still cycle single → double → fill → custom in the session; the next load puts it back.',
    mobile: 'The chat is the page — full width, no neighbour beside it once the row stacks. The load default is still single, because the display is a phone.',
    laptop: 'Opens single (the 380px pane). The module to its right fills the rest of the row.',
    larger: 'Opens double. Same four-tier control; the extra default width is the only load difference from a laptop.',
  },
  {
    id: 'row', icon: 'view_column', title: 'Modules row',
    src: 'pages/wise.css',
    used: 'Every workspace page with a modules row',
    changes: ['mobile'],
    lede: 'Above phone width the row is a horizontal belt: chat in the middle, History tucked left, Output and the rest tucked right. Narrow the browser and pinned widths overflow sideways as a carousel — they never squeeze. Only at 560px does the row stack into a single column.',
    mobile: 'At 560px the row becomes a vertical stack. Chat is full width; History, Output, and the rest sit above or below. Fill defaults stand down.',
    laptop: 'Side-by-side belt. Chat single, neighbour fill. Shortening the window shortens the work surface inside each card — widths stay put.',
    larger: 'Same belt. Chat opens double, so the neighbour has less leftover, but the row does not restack.',
  },
  {
    id: 'tables', icon: 'table_rows', title: 'Tables',
    src: 'js/responsive-tables.js',
    used: 'Portfolio, verification, analytics, admin, ingredient registry',
    changes: ['mobile'],
    lede: 'A table watches its own container, not the window. Below 560px each visible cell becomes a labelled field on a card, so a grid beside the chat cards up even when the page itself is still desktop-wide.',
    mobile: 'Rows become cards. Each field carries its column name. Sort and load-more still work.',
    laptop: 'Full grid. Columns stay columns.',
    larger: 'Full grid. Extra width is more of each column, not a new layout.',
  },
  {
    id: 'fill', icon: 'width_full', title: 'Right-of-chat fill',
    src: 'js/default-fill.js',
    used: 'Output, Results, Nutrition Facts, Turns — anything right of chat',
    changes: ['mobile'],
    lede: 'On a laptop or larger display, every module to the right of chat opens at fill so the row has no dead strip against the edge. That is a load default, not a saved choice. Below 560px the helper stands down — there is no leftover row to fill.',
    mobile: 'Stood down. Stacked modules are already full width.',
    laptop: 'On every load, the module to the right of chat opens fill. Cycle freely in-session; the next visit is fill again.',
    larger: 'Same fill default. Chat is wider, so fill has less leftover to absorb.',
  },
  {
    id: 'height', icon: 'height', title: 'Browser height',
    src: 'pages/wise.css',
    used: 'The shared shell on every workspace page',
    changes: ['laptop', 'larger'],
    lede: 'Shorten the window and each module’s inner surface gets shorter — lists, charts, and forms scroll inside the card. Widths, chips, and type stay the size they were designed. A shorter window never wraps or restacks the row. Stacking is a width rule, not a height one.',
    mobile: 'Once stacked, each card grows with its content. Height is just more page to scroll.',
    laptop: 'The shell fills the window. Shorten it and the work surface inside each module shrinks. Overflow still goes sideways on the rail.',
    larger: 'Same height rule. A taller display just gives each card more inner room.',
  },
  {
    id: 'marketing', icon: 'campaign', title: 'Marketing site',
    src: 'js/marketing.js',
    used: 'Public marketing pages, the docked chat, the scanner rail',
    changes: ['mobile'],
    lede: 'The marketing bar does not wait for a pixel number. It measures whether the links actually fit the row — docked chat, a crowded set of items, a narrow window — and flips to a hamburger the moment they would overflow. On a phone the chat is a full overlay, not a side rail.',
    mobile: 'Hamburger as soon as the links cannot fit. Chat slides in as a full overlay so the reply is seen. The scanner rail stands down.',
    laptop: 'Full link row when it fits. Chat can dock as a rail. Collapse still trips if the rail eats the bar.',
    larger: 'Same overflow rule. A wide display usually keeps the full bar, unless something else is crowding it.',
  },
  {
    id: 'dash', icon: 'dashboard', title: 'Scorecards & dashboards',
    src: 'pages/wise.css',
    used: 'Overview, Non-UPF Dashboard, Admin, Reformulation',
    changes: ['mobile'],
    lede: 'Dashboard tiles follow the card they sit in, not the window. Inside a narrow pane — or on a phone — a two- or three-across row drops to a single column so the numbers stay readable.',
    mobile: 'Tiles stack. Hero numbers stay large; supporting rows go one-across.',
    laptop: 'The designed grid — two, three, or four across, matching the page.',
    larger: 'Same grid. Extra width is more air, not a fourth layout.',
  },
  {
    id: 'auth', icon: 'login', title: 'Sign-in & forms',
    src: 'pages/wise.css',
    used: 'Sign in, create account, waitlist, settings forms',
    changes: ['mobile'],
    lede: 'Two-column form grids collapse to one column on a phone so fields stay full-width and tappable. Step labels hide when they would crowd the progress row. The primary action stays a filled brand-blue button.',
    mobile: 'One column. Step names hide if they do not fit. Inputs stay full width.',
    laptop: 'Two-column grids where the form was designed that way.',
    larger: 'Same form. Fields do not stretch into unreadably long lines.',
  },
  {
    id: 'drawers', icon: 'bottom_sheets', title: 'Drawers & overlays',
    src: 'js/sticky-modules.js',
    used: 'Output, Nutrition Facts, Turns, Help, Verify, Compare',
    changes: ['mobile'],
    lede: 'On a laptop the flanking modules tuck behind the chat as a utility belt. On a phone there is no belt — a focused task rises as a full-width sheet or stacked card instead of a crushed side drawer.',
    mobile: 'No side tuck. A task is a stacked card or a bottom sheet with a grab handle, a scrollable body, and an action row.',
    laptop: 'Sticky belt: History left of chat, Output under the chat, peers to the right, nested drawers shorter still.',
    larger: 'Same belt. The wider chat is still the buckle; drawers do not grow over it.',
  },
  {
    id: 'chips', icon: 'bolt', title: 'Intent chips & composer',
    src: 'pages/wise.css',
    used: 'Every chat module',
    changes: ['mobile'],
    lede: 'Chips keep their size. On a phone the reply-chip row loses its left indent so it uses the full card. The composer stays unlocked and full width — never a cramped desktop leftover.',
    mobile: 'Chips wrap. The row sits flush. The composer is the full card width.',
    laptop: 'Chips sit in the designed indent under the reply. Composer is the chat pane width.',
    larger: 'Same chip size in a wider chat. They do not scale up with the pane.',
  },
];

function respCol(label, text, cls) {
  return `
    <div class="mi-resp-col mi-resp-col--${cls}">
      <div class="mi-resp-col-label">${esc(label)}</div>
      <p class="mi-resp-col-body">${text}</p>
    </div>`;
}

function respSurfaceCard(item) {
  const search = `${item.title} ${item.src} ${item.used} ${item.lede} ${item.mobile} ${item.laptop} ${item.larger} ${(item.changes || []).join(' ')} mobile laptop larger responsive`.toLowerCase();
  return `
    <article class="mi-resp-card" data-resp-card data-resp-id="${esc(item.id)}" data-resp-changes="${esc((item.changes || []).join(' '))}" data-search="${esc(search)}">
      <header class="mi-resp-card-head">
        <span class="material-symbols-outlined" aria-hidden="true">${esc(item.icon)}</span>
        <div class="mi-resp-card-head-text">
          <h3 class="mi-resp-card-title">${esc(item.title)}</h3>
          <code class="mi-resp-card-src">${esc(item.src)}</code>
        </div>
      </header>
      <p class="mi-resp-card-lede">${item.lede}</p>
      <div class="mi-resp-cols" aria-label="How this surface behaves at each size">
        ${respCol('Mobile', item.mobile, 'mobile')}
        ${respCol('Laptop', item.laptop, 'laptop')}
        ${respCol('Larger', item.larger, 'larger')}
      </div>
      <div class="mi-resp-used"><span class="mi-resp-used-label">Used in</span><span>${esc(item.used)}</span></div>
    </article>`;
}

function respStageHTML() {
  return `
    <div class="mi-resp-stage" data-resp-stage>
      <p class="mi-resp-here" data-resp-here>${respHereHTML()}</p>
      <div class="mi-resp-presets" role="group" aria-label="Preview a device class">
        <button type="button" class="mi-resp-preset" data-resp-size="mobile" aria-pressed="false">
          <span class="material-symbols-outlined" aria-hidden="true">smartphone</span>
          <span class="mi-resp-preset-text">
            <span class="mi-resp-preset-title">Mobile</span>
            <span class="mi-resp-preset-sub">390 × 844 · phone</span>
          </span>
        </button>
        <button type="button" class="mi-resp-preset" data-resp-size="laptop" aria-pressed="false">
          <span class="material-symbols-outlined" aria-hidden="true">laptop_mac</span>
          <span class="mi-resp-preset-text">
            <span class="mi-resp-preset-title">Laptop</span>
            <span class="mi-resp-preset-sub">1512 · 14″ MacBook</span>
          </span>
        </button>
        <button type="button" class="mi-resp-preset" data-resp-size="larger" aria-pressed="false">
          <span class="material-symbols-outlined" aria-hidden="true">desktop_windows</span>
          <span class="mi-resp-preset-text">
            <span class="mi-resp-preset-title">Larger</span>
            <span class="mi-resp-preset-sub">1728+ · wide display</span>
          </span>
        </button>
      </div>
      <div class="mi-resp-frame-wrap">
        <div class="mi-resp-frame" data-resp-frame data-size="laptop">
          <div class="mi-resp-chrome">
            <span class="mi-resp-dots" aria-hidden="true"><i></i><i></i><i></i></span>
            <span class="mi-resp-url" data-resp-url>app · 14″ laptop · chat single</span>
          </div>
          <div class="mi-resp-shell">
            <aside class="mi-resp-nav" aria-hidden="true">
              <span class="mi-resp-owl" aria-hidden="true"></span>
              <span class="mi-resp-nav-ic"></span>
              <span class="mi-resp-nav-ic"></span>
              <span class="mi-resp-nav-ic"></span>
              <span class="mi-resp-nav-ic"></span>
            </aside>
            <div class="mi-resp-row">
              <section class="mi-resp-mod mi-resp-chat">
                <header class="mi-resp-mod-head">Chat</header>
                <span class="mi-resp-mod-meta" data-resp-chat-meta>single · buckle</span>
                <div class="mi-resp-mod-body">
                  <div class="mi-resp-line"></div>
                  <div class="mi-resp-line mi-resp-line--short"></div>
                  <div class="mi-resp-chips"><span>Ask</span><span>Compare</span></div>
                </div>
              </section>
              <aside class="mi-resp-mod mi-resp-out">
                <header class="mi-resp-mod-head">Output</header>
                <span class="mi-resp-mod-meta">fill</span>
                <div class="mi-resp-mod-body">
                  <div class="mi-resp-score no-countup" data-no-countup>86</div>
                  <div class="mi-resp-line"></div>
                  <div class="mi-resp-line mi-resp-line--short"></div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
      <p class="mi-resp-caption" data-resp-caption>Laptop — desktop shell, chat opens single, neighbour fills the row.</p>
    </div>`;
}

const RESP_CAPTIONS = {
  mobile: 'Mobile — owl nav, chat is the page, modules stack, tables become cards.',
  laptop: 'Laptop — desktop shell, chat opens single, neighbour fills the row.',
  larger: 'Larger — same desktop shell, chat opens double, neighbour still fills.',
};
const RESP_URLS = {
  mobile: 'app · phone · stacked',
  laptop: 'app · 14″ laptop · chat single',
  larger: 'app · wide display · chat double',
};
const RESP_CHAT_META = {
  mobile: 'full width',
  laptop: 'single · buckle',
  larger: 'double · buckle',
};

function renderResponsive(opts) {
  if (opts && opts.headOnly) {
    return miHeadOnly('mi-responsive', 'Responsiveness',
      'How every surface on the platform adapts — phone, 14-inch laptop, and everything larger. Nav, chat width, the modules row, tables, marketing, dashboards, and forms, each named at the three sizes the app actually codes for.',
      moduleReadyToggleHTML('mi-responsive', 'Responsiveness', { kind: 'ai' }) + moduleControlsHTML('mi-responsive'));
  }
  const mobileN = RESPONSIVE_SURFACES.filter((i) => (i.changes || []).includes('mobile')).length;
  const laptopN = RESPONSIVE_SURFACES.filter((i) => (i.changes || []).includes('laptop')).length;
  const largerN = RESPONSIVE_SURFACES.filter((i) => (i.changes || []).includes('larger')).length;
  return `
    <section class="mi-module is-collapsed" id="mi-responsive">
      <header class="mi-module-head">
        <div class="mi-module-head-text">
          <h2 class="mi-module-title">Responsiveness</h2>
          <p class="mi-module-lede">How every surface on the platform adapts — phone, 14-inch laptop, and everything
            larger. The live stage restyles a schematic shell. The catalog names what the nav, chat, modules row,
            tables, marketing site, dashboards, and forms actually do at each size. Laptop and larger share the
            desktop shell; the one load default that flips is chat width.</p>
        </div>
        ${moduleReadyToggleHTML('mi-responsive', 'Responsiveness', { kind: 'ai' })}
        ${moduleControlsHTML('mi-responsive')}
      </header>

      <div class="dsc-conventions" aria-label="Responsiveness conventions">
        <div class="dsc-conv-head">
          <span class="material-symbols-outlined">devices</span>
          <div>
            <div class="dsc-conv-title">Three sizes, two kinds of measurement</div>
            <div class="dsc-conv-sub">Phone layout follows the <strong>window</strong>. Chat width follows the <strong>display</strong>. Shrinking a laptop browser is not the same as being on a phone.</div>
          </div>
        </div>
        <div class="dsc-conv-grid">
          <div class="dsc-conv-item">
            <span class="material-symbols-outlined" aria-hidden="true">smartphone</span>
            <div class="dsc-conv-body">
              <div class="dsc-conv-item-title">Mobile is the window</div>
              <p class="dsc-conv-item-desc">At 768px the nav becomes an owl drawer. At 560px the modules row stacks and tables become cards. Those are viewport rules — they fire when the browser is that narrow, on any machine.</p>
            </div>
          </div>
          <div class="dsc-conv-item">
            <span class="material-symbols-outlined" aria-hidden="true">laptop_mac</span>
            <div class="dsc-conv-body">
              <div class="dsc-conv-item-title">Laptop is the display</div>
              <p class="dsc-conv-item-desc">A 14-inch MacBook Pro is 1512 CSS pixels. That class of screen keeps chat at single. Un-maximising the window must never flip the default — the measurement is the screen, not the browser.</p>
            </div>
          </div>
          <div class="dsc-conv-item">
            <span class="material-symbols-outlined" aria-hidden="true">desktop_windows</span>
            <div class="dsc-conv-body">
              <div class="dsc-conv-item-title">Larger opens chat double</div>
              <p class="dsc-conv-item-desc">Anything wider than 1512 CSS pixels is the same desktop shell, with chat opening double. You can still cycle every width in-session; the next load puts it back.</p>
            </div>
          </div>
          <div class="dsc-conv-item">
            <span class="material-symbols-outlined" aria-hidden="true">view_week</span>
            <div class="dsc-conv-body">
              <div class="dsc-conv-item-title">Narrowing is a carousel, not a squeeze</div>
              <p class="dsc-conv-item-desc">Above 560px, pinned modules keep their width and overflow sideways. The row never crushes to fit. Stacking is the phone rule only.</p>
            </div>
          </div>
        </div>
      </div>

      ${respStageHTML()}

      <div class="mi-stats" id="mi-resp-stats" role="group" aria-label="Filter surfaces by the size they change at">
        <button type="button" class="mi-stat is-active" data-resp-filter="all" aria-pressed="true">
          <span class="mi-stat-num">${RESPONSIVE_SURFACES.length}</span>
          <span class="mi-stat-label"><span class="mi-stat-text">All</span><span class="material-symbols-outlined">devices</span></span>
        </button>
        <button type="button" class="mi-stat" data-resp-filter="mobile" aria-pressed="false">
          <span class="mi-stat-num">${mobileN}</span>
          <span class="mi-stat-label"><span class="mi-stat-text">Change on mobile</span><span class="material-symbols-outlined">smartphone</span></span>
        </button>
        <button type="button" class="mi-stat" data-resp-filter="laptop" aria-pressed="false">
          <span class="mi-stat-num">${laptopN}</span>
          <span class="mi-stat-label"><span class="mi-stat-text">Change on laptop</span><span class="material-symbols-outlined">laptop_mac</span></span>
        </button>
        <button type="button" class="mi-stat" data-resp-filter="larger" aria-pressed="false">
          <span class="mi-stat-num">${largerN}</span>
          <span class="mi-stat-label"><span class="mi-stat-text">Change when larger</span><span class="material-symbols-outlined">desktop_windows</span></span>
        </button>
      </div>

      <div class="mi-resp-grid" id="mi-resp-grid">
        ${RESPONSIVE_SURFACES.map(respSurfaceCard).join('')}
      </div>
    </section>`;
}

function setRespSize(mod, size) {
  if (!mod || !RESP_CAPTIONS[size]) return;
  const frame = mod.querySelector('[data-resp-frame]');
  if (frame) frame.setAttribute('data-size', size);
  const url = mod.querySelector('[data-resp-url]');
  if (url) url.textContent = RESP_URLS[size];
  const cap = mod.querySelector('[data-resp-caption]');
  if (cap) cap.textContent = RESP_CAPTIONS[size];
  const meta = mod.querySelector('[data-resp-chat-meta]');
  if (meta) meta.textContent = RESP_CHAT_META[size];
  mod.querySelectorAll('[data-resp-size]').forEach((b) => {
    const on = b.getAttribute('data-resp-size') === size;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  mod.querySelectorAll('[data-resp-card]').forEach((card) => {
    card.classList.toggle('is-focus-size', (card.getAttribute('data-resp-changes') || '').split(/\s+/).includes(size));
  });
}

function wireResponsive(root) {
  const mod = root.querySelector('#mi-responsive');
  if (!mod) return;

  const applyFilter = (filter) => {
    mod.querySelectorAll('[data-resp-card]').forEach((card) => {
      const changes = (card.getAttribute('data-resp-changes') || '').split(/\s+/);
      card.hidden = filter !== 'all' && changes.indexOf(filter) === -1;
    });
    mod.querySelectorAll('[data-resp-filter]').forEach((b) => {
      const on = b.getAttribute('data-resp-filter') === filter;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  };
  mod.querySelector('#mi-resp-stats')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-resp-filter]');
    if (!btn) return;
    applyFilter(btn.getAttribute('data-resp-filter'));
  });

  const start = respLayoutClass();
  setRespSize(mod, start);
  const here = mod.querySelector('[data-resp-here]');
  if (here) here.innerHTML = respHereHTML();
  mod.querySelector('.mi-resp-presets')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-resp-size]');
    if (!btn) return;
    setRespSize(mod, btn.getAttribute('data-resp-size'));
  });
  const refreshHere = () => {
    if (here) here.innerHTML = respHereHTML();
  };
  window.addEventListener('resize', refreshHere);
  if (window.screen && typeof window.screen.addEventListener === 'function') {
    try { window.screen.addEventListener('change', refreshHere); } catch (_) { /* no Screen.change */ }
  }
}

/* Styles live in pages/wise.css (All Modules catalog section) so
   this module does not rebuild a 4,000-rule stylesheet as a string. */

/* ------------------------------------------------------------------ */
/* Render + wiring                                                     */
/* ------------------------------------------------------------------ */

let hostEl = null;

export function renderAllModules(mainEl) {
  hostEl = mainEl;
  buildDevReadyTree();
  syncCodeStateFromStore();
  const loadLabel = (typeof window !== 'undefined' && window.WiseMiLoad && window.WiseMiLoad.label)
    ? window.WiseMiLoad.label()
    : '0%';
  const loadBytes = (typeof window !== 'undefined' && window.WiseMiLoad && window.WiseMiLoad.bytes)
    ? window.WiseMiLoad.bytes()
    : '';
  const loadDone = loadLabel === '100%';
  mainEl.innerHTML = `
    <div class="mi-wrap">
      <header class="mi-hero">
        <div class="mi-hero-text">
          <div class="mi-hero-title-row">
            <h1 class="mi-hero-title">All Modules</h1>
            <div class="mi-hero-btns">
              <button type="button" class="adm-btn adm-btn--primary mi-reeval-btn" data-mi-reeval title="Count every shippable file in the project, then account for each HTML page. Does not run on its own — click when you want a fresh count.">
                <span class="material-symbols-outlined" aria-hidden="true">autorenew</span>
                <span data-mi-reeval-label>Re-evaluate</span>
              </button>
              <button type="button" class="adm-btn adm-btn--ghost mi-hard-btn" data-mi-hard-reload title="Bypass the cache and reload this page from disk. Live reload is off on All Modules, so file saves do not keep remounting it.">
                <span class="material-symbols-outlined" aria-hidden="true">restart_alt</span>
                <span data-mi-hard-label>Hard reload</span>
              </button>
            </div>
            <span class="mi-load-pct no-countup" id="mi-load-pct" data-no-countup aria-live="polite" title="How much of this page has arrived"${loadDone ? ' data-done="1"' : ''}>${esc(loadLabel)}</span>
            <span class="mi-load-bytes no-countup" id="mi-load-bytes" data-no-countup title="This page">${esc(loadBytes)}</span>
          </div>
          <p class="mi-hero-lede">Every module, component, icon, design token, animation, drag/resize interaction, and how the platform responds from a phone to a wide display — indexed, rendered live, and one tap away. The pair next to the title is how much of this page has arrived. Open a section to load it. Re-evaluate scans when you click it — it does not run on load.</p>
          <span class="mi-reeval-meta" data-mi-reeval-meta></span>
        </div>
      </header>
      <div class="mi-reeval-status" id="mi-reeval-status" hidden></div>
      <div class="mi-global-search" id="mi-global-search">
        <div class="mi-search-inline">
          <span class="material-symbols-outlined" aria-hidden="true">search</span>
          <input type="search" class="mi-search" id="mi-global-q" placeholder="Search everything on this page…" aria-label="Search modules, tables, logic, icons, components, and more" autocomplete="off" aria-controls="mi-global-hits" aria-autocomplete="list" />
        </div>
        <div class="mi-global-hits" id="mi-global-hits" hidden role="listbox" aria-label="Search results"></div>
      </div>
      ${renderSectionNav()}
      ${renderCodebase({ headOnly: true })}
      <div class="mi-acc-catalog">
        ${renderAnalyticsTypes({ headOnly: true })}
        ${renderAppLogic({ headOnly: true })}
        ${renderComponentLibrary({ headOnly: true })}
        ${renderDesignSystem({ headOnly: true })}
        ${renderIconInventory({ headOnly: true })}
        ${renderIntentAudit({ headOnly: true })}
        ${renderDirectory({ headOnly: true })}
        ${renderMotion({ headOnly: true })}
        ${renderResponsive({ headOnly: true })}
        ${renderStreamingTrace({ headOnly: true })}
        ${renderTableGallery({ headOnly: true })}
        ${renderTranscriptArch({ headOnly: true })}
      </div>
    </div>`;

  const safeWire = (name, fn) => {
    try { fn(); }
    catch (err) { console.error('[all-modules] ' + name + ' failed', err); }
  };
  /* First paint is hero + jump tiles + section headers only. Body wire-up
     runs when that accordion actually opens (fillSectionBody). */
  safeWire('accordion', () => setupAccordion(mainEl));
  safeWire('nudgeLayout', () => wireModuleNudgeLayout(mainEl));
  safeWire('sectionNav', () => wireSectionNav(mainEl));
  safeWire('tarchNudge', () => wireTarchNudge(mainEl));
  safeWire('azNudge', () => wireAzNudge(mainEl));
  safeWire('compsNudge', () => wireCompsNudge(mainEl));
  safeWire('rptNudge', () => wireRptNudge(mainEl));
  safeWire('azCompNudge', () => wireAzCompNudge(mainEl));
  safeWire('azLightbox', () => wireAnalyticsLightbox(mainEl));
  safeWire('globalSearch', () => wireGlobalSearch(mainEl));
  safeWire('devReady', () => wireDevReady(mainEl));
  safeWire('paneCompJumps', () => wirePaneCompJumps(mainEl));
  safeWire('moduleControls', () => wireModuleControls(mainEl));
  safeWire('pageReeval', () => wirePageReeval(mainEl));
  safeWire('hardReload', () => wireHardReload(mainEl));

  /* Deep link — `#mi-directory` (used by the Page Gallery close/back) opens
     that section after the accordion has collapsed everything on load. */
  const hashId = (location.hash || '').replace(/^#/, '');
  if (hashId && ACC_SECTION_IDS.includes(hashId)) {
    expandAccordionSection(mainEl, hashId).then(() => {
      requestAnimationFrame(() => {
        document.getElementById(hashId)?.scrollIntoView({ block: 'start' });
      });
    });
  } else if (hashId) {
    const comp = COMPONENTS.find((c) => {
      if (compDomId(c.name) === hashId) return true;
      return (c.aliases || []).some((a) => compDomId(a) === hashId);
    });
    if (comp) jumpToComponent(mainEl, comp.name);
  }

  try {
    if (window.WiseMiLoad) {
      if (window.WiseMiLoad.markReady) window.WiseMiLoad.markReady();
      else if (window.WiseMiLoad.scan) window.WiseMiLoad.scan();
    }
  } catch (e) { /* load meter is best-effort */ }
}

/* ------------------------------------------------------------------ */
/* Accordion — every module section collapses from its own header.    */
/*                                                                    */
/* Codebase is the size index and sits slightly apart. The remaining  */
/* sections are alphabetical by title inside .mi-acc-catalog. Each     */
/* already ships as <section class="mi-module"> with a leading         */
/* <header class="mi-module-head">. We reuse that header as the        */
/* toggle (adding a chevron + a11y) and wrap everything after it in a  */
/* collapsible .mi-acc-body. Every load starts fully collapsed.        */
/* Clicks on the header's ready toggles never expand or collapse.      */
/* ------------------------------------------------------------------ */
const SECTION_FILL = {
  'mi-code': { render: () => renderCodebase(), wire: wireCodebase },
  'mi-directory': {
    render: () => renderDirectory(),
    wire: (root) => {
      wireDirectory(root);
      wireDirectoryExport(root);
      wireView(root);
      wireRailFrames(root);
      wireLinkValidation(root);
    },
  },
  'mi-tables': { render: () => renderTableGallery(), wire: wireTableGallery },
  'mi-analytics': { render: () => renderAnalyticsTypes(), wire: wireAnalyticsTypes },
  'mi-logic': { catalog: 'logic', render: () => renderAppLogic(), wire: wireAppLogic },
  'mi-intents': { render: () => renderIntentAudit(), wire: wireIntentAudit },
  'mi-trace': { render: () => renderStreamingTrace(), wire: wireStreamingTrace },
  'mi-tarch': { render: () => renderTranscriptArch(), wire: wireTranscriptArch },
  'mi-motion': {
    render: () => renderMotion(),
    wire: (root) => { wireMotion(root); wireJamCatalog(root); },
  },
  'mi-responsive': { render: () => renderResponsive(), wire: wireResponsive },
  'mi-icons': { catalog: 'icons', render: () => renderIconInventory(), wire: wireIconInventory },
  'mi-design': { render: () => renderDesignSystem(), wire: wireDesignSystem },
  'mi-components': { render: () => renderComponentLibrary(), wire: wireComponentLibrary },
};

function extractSectionBody(html) {
  const i = String(html || '').indexOf('</header>');
  if (i < 0) return html;
  let rest = html.slice(i + 9);
  const j = rest.lastIndexOf('</section>');
  if (j >= 0) rest = rest.slice(0, j);
  return rest.trim();
}

const _fillInflight = new Map();

async function fillSectionBody(root, sec) {
  if (!sec || sec.dataset.miFilled === '1') return;
  const id = sec.id;
  if (_fillInflight.has(id)) return _fillInflight.get(id);
  const work = (async () => {
    const spec = SECTION_FILL[id];
    const body = sec.querySelector(':scope > .mi-acc-body');
    if (!spec || !body) {
      sec.dataset.miFilled = '1';
      return;
    }
    body.innerHTML = '<p class="mi-lazy-note">Loading…</p>';
    if (spec.catalog === 'icons') await ensureIconInventory();
    if (spec.catalog === 'logic') await ensureAppLogic();
    body.innerHTML = extractSectionBody(spec.render());
    spec.wire(root);
    sec.dataset.miFilled = '1';
    observePreviewFrames(sec);
    scheduleModuleNudgeRefresh();
  })();
  _fillInflight.set(id, work);
  try { await work; }
  catch (err) {
    console.error('[all-modules] fill ' + id + ' failed', err);
    const body = sec.querySelector(':scope > .mi-acc-body');
    if (body) body.innerHTML = '<p class="mi-lazy-note">Could not load this section.</p>';
  }
  finally { _fillInflight.delete(id); }
}

function refreshAllModuleNudges() {
  refreshTarchNudge();
  refreshAzNudge();
  refreshCompsNudge();
  refreshRptNudge();
  refreshAzCompNudge();
}

function scheduleModuleNudgeRefresh() {
  refreshAllModuleNudges();
  requestAnimationFrame(() => {
    refreshAllModuleNudges();
    requestAnimationFrame(refreshAllModuleNudges);
  });
  setTimeout(refreshAllModuleNudges, 80);
  setTimeout(refreshAllModuleNudges, 240);
}

let moduleNudgeLayoutRo = null;
function wireModuleNudgeLayout(root) {
  const wrap = (root && root.querySelector) ? (root.querySelector('.mi-wrap') || root) : null;
  if (!wrap || typeof ResizeObserver === 'undefined') return;
  if (moduleNudgeLayoutRo) {
    moduleNudgeLayoutRo.disconnect();
    moduleNudgeLayoutRo = null;
  }
  moduleNudgeLayoutRo = new ResizeObserver(() => refreshAllModuleNudges());
  moduleNudgeLayoutRo.observe(wrap);
  const scroller = wrap.closest('.agent-main-scroll') || document.getElementById('agent-main-scroll');
  if (scroller) moduleNudgeLayoutRo.observe(scroller);
}

function setSectionCollapsed(root, sec, collapsed) {
  sec.classList.toggle('is-collapsed', collapsed);
  sec.querySelector(':scope > .mi-module-head')?.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  scheduleModuleNudgeRefresh();
  if (!collapsed) {
    if (sec.id === 'mi-tarch') takeTarchNudge();
    if (sec.id === 'mi-analytics') takeAzNudge();
    fillSectionBody(root, sec).then(() => {
      observePreviewFrames(sec);
      scheduleModuleNudgeRefresh();
    });
  }
}

/* Open a section (used when the quick-nav or a WISEcodeAI chip jumps to it). */
async function expandAccordionSection(root, id) {
  const sec = (root || document).querySelector('#' + id);
  if (!sec) return;
  if (id === 'mi-tarch') takeTarchNudge();
  if (id === 'mi-analytics') takeAzNudge();
  await fillSectionBody(root || document, sec);
  if (!sec.classList.contains('is-collapsed')) return;
  sec.classList.remove('is-collapsed');
  sec.querySelector(':scope > .mi-module-head')?.setAttribute('aria-expanded', 'true');
  observePreviewFrames(sec);
  scheduleModuleNudgeRefresh();
}

function setupAccordion(root) {
  ACC_SECTION_IDS.forEach((id) => {
    const sec = root.querySelector('#' + id);
    if (!sec || sec.classList.contains('mi-acc')) return;
    const head = sec.querySelector(':scope > .mi-module-head');
    if (!head) return;

    /* Move every node after the header into a collapsible body wrapper. */
    const body = document.createElement('div');
    body.className = 'mi-acc-body';
    body.id = 'acc-body-' + id;
    let n = head.nextSibling;
    while (n) { const next = n.nextSibling; body.appendChild(n); n = next; }
    sec.appendChild(body);
    sec.classList.add('mi-acc');

    head.insertAdjacentHTML('afterbegin', '<span class="mi-acc-chevron material-symbols-outlined" aria-hidden="true">expand_more</span>');
    head.setAttribute('role', 'button');
    head.setAttribute('tabindex', '0');
    head.setAttribute('aria-controls', body.id);

    /* Closed on every load — expanded state is in-session only. */
    sec.classList.add('is-collapsed');
    head.setAttribute('aria-expanded', 'false');

    const toggle = (e) => {
      if (e.target.closest('.panel-controls, .dsc-ready, .dsc-ready-row')) return; // let the ⋯ menu and ready toggles work
      const opening = sec.classList.contains('is-collapsed');
      const apply = () => {
        setSectionCollapsed(root, sec, !opening);
        /* Last sections (Component Library) sit at the bottom of the pane.
           Opening them adds the body below the fold — keep the header in view. */
        if (opening) {
          requestAnimationFrame(() => {
            const scroller = sec.closest('.agent-main-scroll');
            const body = sec.querySelector(':scope > .mi-acc-body');
            if (!scroller || !body) return;
            const sr = scroller.getBoundingClientRect();
            const br = body.getBoundingClientRect();
            if (br.top > sr.bottom - 96) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }
      };
      if (opening) fillSectionBody(root, sec).then(apply);
      else apply();
    };
    head.addEventListener('click', toggle);
    head.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (e.target.closest('.panel-controls, .dsc-ready, .dsc-ready-row')) return;
      e.preventDefault();
      toggle(e);
    });
  });
}

/* ------------------------------------------------------------------ */
/* Section quick-nav — scorecards at the very top that jump to any    */
/* section (modules, icons, tokens, components) in one tap.           */
/* ------------------------------------------------------------------ */

function moduleTotal() {
  const seen = new Set();
  let n = 0;
  MODULE_SECTIONS.forEach((s) => s.modules.forEach((m) => {
    if (!seen.has(m.href)) { seen.add(m.href); n++; }
  }));
  return n;
}

function sectionNavTiles() {
  const tokenCount = COLOR_GROUPS.reduce((n, g) => n + g.swatches.length, 0) + TYPE_SCALE.length;
  const byId = {
    'mi-code': { id: 'mi-code', icon: 'code', num: fmtNum(codeState.now?.total), label: 'Lines of code', sub: `${fmtScanBytes(codeState.now?.bytes)} · ${fmtNum(codeState.now?.allFiles)} files` },
    'mi-analytics': { id: 'mi-analytics', icon: 'bar_chart', num: ANALYTICS_GALLERY.length, label: 'Analytics types', sub: 'Every chart, as thumbnails' },
    'mi-logic': { id: 'mi-logic', icon: 'rule', num: logicRuleCount(), label: 'App logic', sub: 'Every rule, by page' },
    'mi-components': { id: 'mi-components', icon: 'widgets', num: COMPONENTS.length, label: 'Components', sub: 'Reusable, live-rendered' },
    'mi-design': { id: 'mi-design', icon: 'palette', num: tokenCount, label: 'Design tokens', sub: 'Type scale + color tokens' },
    'mi-icons': { id: 'mi-icons', icon: 'emoji_symbols', num: (ICON_INVENTORY && ICON_INVENTORY.totalUniqueIcons) || ICON_UNIQUE_FALLBACK, label: 'Icons', sub: 'Material Symbols inventory' },
    'mi-intents': { id: 'mi-intents', icon: 'bolt', num: intentAuditStats().chips, label: 'Intent chip logic', sub: 'Transcript + logic audit' },
    'mi-directory': { id: 'mi-directory', icon: 'apps', num: moduleTotal(), label: 'Modules', sub: 'Every screen in the app' },
    'mi-motion': { id: 'mi-motion', icon: 'animation', num: MOTION_ITEMS.length, label: 'Motion & resize', sub: 'Animations + drag/resize' },
    'mi-responsive': { id: 'mi-responsive', icon: 'devices', num: RESPONSIVE_SURFACES.length, label: 'Responsiveness', sub: 'Mobile, laptop, larger' },
    'mi-trace': { id: 'mi-trace', icon: 'psychology', num: TRACE_MILESTONES.length, label: 'Trace sections', sub: 'Playing, paused, finished' },
    'mi-tables': { id: 'mi-tables', icon: 'table_chart', num: TABLE_CATALOG.length, label: 'Tables', sub: 'Every data table, live' },
    'mi-tarch': { id: 'mi-tarch', icon: 'account_tree', num: TARCH_LAYERS.length, label: 'Transcript architecture', sub: 'Every piece, linked' },
  };
  return ACC_SECTION_IDS.map((id) => byId[id]).filter(Boolean);
}

function renderSectionNav() {
  const tiles = sectionNavTiles();
  return `
    <nav class="dsc-jump" aria-label="Jump to a section">
      ${tiles.map((t) => `
        <button type="button" class="dsc-jump-tile" data-jump="${esc(t.id)}">
          <span class="dsc-jump-ic"><span class="material-symbols-outlined">${esc(t.icon)}</span></span>
          <span class="dsc-jump-body">
            <span class="dsc-jump-num">${esc(t.num)}</span>
            <span class="dsc-jump-label">${esc(t.label)}</span>
            <span class="dsc-jump-sub">${esc(t.sub)}</span>
          </span>
          <span class="material-symbols-outlined dsc-jump-go">arrow_downward</span>
        </button>`).join('')}
    </nav>`;
}

function wireSectionNav(root) {
  const nav = root.querySelector('.dsc-jump');
  if (!nav) return;
  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-jump]');
    if (!btn) return;
    const id = btn.dataset.jump;
    /* Jumping to a collapsed section opens it first, then scrolls. */
    expandAccordionSection(root, id).then(() => {
      const el = document.getElementById(id);
      if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    });
  });
}

/* Gold “This is new!” floaty on the Transcript Architecture accordion label.
   Same body-portaled nudge as Product Portfolio / Analyze Ingredients. */
const TARCH_NUDGE_ID = 'mi-tarch-new';
let tarchNudgeTaken = false;
let tarchNudgeWired = false;
let tarchNudgeRo = null;

function tarchNudgeDismissed() {
  return !!(isNudgeDismissed(TARCH_NUDGE_ID) ||
    (window.WiseNudgeToast && typeof window.WiseNudgeToast.isDismissed === 'function'
      && window.WiseNudgeToast.isDismissed(TARCH_NUDGE_ID)));
}

function takeTarchNudge() {
  tarchNudgeTaken = true;
  const toast = document.getElementById('mi-tarch-nudge');
  if (!toast) return;
  toast.hidden = true;
  toast.setAttribute('hidden', '');
  toast.style.visibility = '';
  toast.style.pointerEvents = '';
}

function tarchNudgeAnchor(root) {
  const sec = (root || hostEl || document).querySelector('#mi-tarch');
  if (!sec || sec.hidden) return null;
  return sec.querySelector(':scope > .mi-module-head .mi-module-title');
}

function ensureTarchNudgeToast() {
  let toast = document.getElementById('mi-tarch-nudge');
  if (toast) return toast;
  toast = document.createElement('div');
  toast.id = 'mi-tarch-nudge';
  toast.className = 'dash-score-toast dash-score-toast--gold is-portaled';
  toast.setAttribute('data-nudge-id', TARCH_NUDGE_ID);
  toast.setAttribute('role', 'status');
  toast.hidden = true;
  toast.innerHTML =
    '<span class="dash-score-toast-icon"><span class="material-symbols-outlined">new_releases</span></span>' +
    '<div class="dash-score-toast-body">' +
      '<div class="dash-score-toast-title">This is new!</div>' +
      '<p class="dash-score-toast-text">Transcript Architecture freezes one conversation and labels every visible piece — History, the strip, chips, composer, Turns, and Roll · Crawl · Walk · Run.</p>' +
      '<button type="button" class="dash-score-toast-link" data-tarch-nudge-go>Open Transcript Architecture<span class="material-symbols-outlined dash-score-toast-link-arrow">arrow_outward</span></button>' +
    '</div>' +
    '<button class="dash-score-toast-close" type="button" aria-label="Dismiss" aria-haspopup="menu" aria-expanded="false"><span class="material-symbols-outlined">close</span></button>';
  document.body.appendChild(toast);
  toast.addEventListener('click', (e) => {
    const go = e.target.closest('[data-tarch-nudge-go]');
    if (!go) return;
    e.preventDefault();
    e.stopPropagation();
    const root = hostEl || document;
    takeTarchNudge();
    expandAccordionSection(root, 'mi-tarch').then(() => {
      document.getElementById('mi-tarch')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  return toast;
}

function placeTarchNudgeToast(toast, anchor, prefer) {
  if (!toast || !anchor || toast.hidden) return;
  const br = anchor.getBoundingClientRect();
  if (br.width < 8 || br.height < 8) {
    toast.style.visibility = 'hidden';
    toast.style.pointerEvents = 'none';
    return;
  }
  const onScreen = br.bottom > 8 && br.top < window.innerHeight - 8
    && br.right > 8 && br.left < window.innerWidth - 8;
  if (!onScreen) {
    toast.style.visibility = 'hidden';
    toast.style.pointerEvents = 'none';
    return;
  }
  toast.style.visibility = '';
  toast.style.pointerEvents = '';
  const gap = 12;
  const th = toast.offsetHeight || 148;
  const tw = toast.offsetWidth || 320;
  const canAbove = br.top >= th + gap + 8;
  const canBelow = window.innerHeight - br.bottom >= th + gap + 8;
  const canRight = window.innerWidth - br.right >= tw + gap + 8;
  const canLeft = br.left >= tw + gap + 8;
  toast.classList.remove('is-below', 'is-right', 'is-left');
  let top;
  let left;
  const placeAbove = () => { top = br.top - th - gap; left = br.left; };
  const placeBelow = () => { toast.classList.add('is-below'); top = br.bottom + gap; left = br.left; };
  const placeRight = () => { toast.classList.add('is-right'); top = br.top + br.height / 2 - th / 2; left = br.right + gap; };
  const placeLeft = () => { toast.classList.add('is-left'); top = br.top + br.height / 2 - th / 2; left = br.left - tw - gap; };
  const slots = {
    above: [canAbove, placeAbove],
    right: [canRight, placeRight],
    left: [canLeft, placeLeft],
    below: [canBelow, placeBelow],
  };
  const order = prefer === 'above'
    ? ['above', 'right', 'below', 'left']
    : ['right', 'above', 'left', 'below'];
  const pick = order.find((key) => slots[key][0]) || order[0];
  slots[pick][1]();
  left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
  top = Math.max(8, Math.min(top, window.innerHeight - th - 8));
  toast.style.top = Math.round(top) + 'px';
  toast.style.left = Math.round(left) + 'px';
  const caretX = br.left + br.width / 2 - left - 7;
  const caretY = br.top + br.height / 2 - top - 7;
  toast.style.setProperty('--nudge-toast-caret', Math.round(Math.max(16, Math.min(tw - 24, caretX))) + 'px');
  toast.style.setProperty('--nudge-toast-caret-y', Math.round(Math.max(16, Math.min(th - 24, caretY))) + 'px');
}

function refreshTarchNudge() {
  const toast = ensureTarchNudgeToast();
  const root = hostEl || document;
  const label = tarchNudgeAnchor(root);
  const labelLive = !!(label && !label.hidden && label.getClientRects().length);
  const show = !tarchNudgeTaken && !tarchNudgeDismissed() && labelLive;
  if (!show) {
    toast.hidden = true;
    toast.setAttribute('hidden', '');
    toast.style.visibility = '';
    toast.style.pointerEvents = '';
    return;
  }
  toast.hidden = false;
  toast.removeAttribute('hidden');
  if (tarchNudgeRo) {
    tarchNudgeRo.disconnect();
    tarchNudgeRo = null;
  }
  if (typeof ResizeObserver !== 'undefined' && label) {
    tarchNudgeRo = new ResizeObserver(() => placeTarchNudgeToast(toast, label));
    tarchNudgeRo.observe(label);
  }
  placeTarchNudgeToast(toast, label);
  requestAnimationFrame(() => placeTarchNudgeToast(toast, label));
}

function wireTarchNudge(root) {
  if (tarchNudgeWired) {
    refreshTarchNudge();
    return;
  }
  tarchNudgeWired = true;
  ensureTarchNudgeToast();
  const place = () => {
    const toast = document.getElementById('mi-tarch-nudge');
    placeTarchNudgeToast(toast, tarchNudgeAnchor(root));
  };
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, { passive: true, capture: true });
  root.querySelector('.agent-main-scroll')?.addEventListener('scroll', place, { passive: true });
  document.getElementById('agent-main-scroll')?.addEventListener('scroll', place, { passive: true });
  refreshTarchNudge();
  setTimeout(refreshTarchNudge, 200);
  setTimeout(refreshTarchNudge, 700);
}

/* Gold “New component added” on the Component Library accordion — first-paint
   header, same as Transcript Architecture. Stays until they dismiss it. */
const COMPS_NUDGE_ID = 'mi-comps-new';
let compsNudgeTaken = false;
let compsNudgeWired = false;
let compsNudgeRo = null;

function compsNudgeDismissed() {
  return !!(isNudgeDismissed(COMPS_NUDGE_ID) ||
    (window.WiseNudgeToast && typeof window.WiseNudgeToast.isDismissed === 'function'
      && window.WiseNudgeToast.isDismissed(COMPS_NUDGE_ID)));
}

function takeCompsNudge() {
  compsNudgeTaken = true;
  const toast = document.getElementById('mi-comps-nudge');
  if (!toast) return;
  toast.hidden = true;
  toast.setAttribute('hidden', '');
  toast.style.visibility = '';
  toast.style.pointerEvents = '';
}

function compsNudgeAnchor(root) {
  const sec = (root || hostEl || document).querySelector('#mi-components');
  if (!sec || sec.hidden) return null;
  return sec.querySelector(':scope > .mi-module-head .mi-module-title');
}

function ensureCompsNudgeToast() {
  let toast = document.getElementById('mi-comps-nudge');
  if (toast) return toast;
  toast = document.createElement('div');
  toast.id = 'mi-comps-nudge';
  toast.className = 'dash-score-toast dash-score-toast--gold is-portaled';
  toast.setAttribute('data-nudge-id', COMPS_NUDGE_ID);
  toast.setAttribute('role', 'status');
  toast.hidden = true;
  toast.innerHTML =
    '<span class="dash-score-toast-icon"><span class="material-symbols-outlined">new_releases</span></span>' +
    '<div class="dash-score-toast-body">' +
      '<div class="dash-score-toast-title">New component added</div>' +
      '<p class="dash-score-toast-text">The Component Library now includes the Report builder — plus the charts you want, generate, then save or share.</p>' +
      '<button type="button" class="dash-score-toast-link" data-comps-nudge-go>Open Component Library<span class="material-symbols-outlined dash-score-toast-link-arrow">arrow_outward</span></button>' +
    '</div>' +
    '<button class="dash-score-toast-close" type="button" aria-label="Dismiss" aria-haspopup="menu" aria-expanded="false"><span class="material-symbols-outlined">close</span></button>';
  document.body.appendChild(toast);
  toast.addEventListener('click', (e) => {
    const go = e.target.closest('[data-comps-nudge-go]');
    if (!go) return;
    e.preventDefault();
    e.stopPropagation();
    jumpToComponent(hostEl || document, 'Report builder');
  });
  return toast;
}

function refreshCompsNudge() {
  const toast = ensureCompsNudgeToast();
  const root = hostEl || document;
  const label = compsNudgeAnchor(root);
  const dismissed = compsNudgeTaken || compsNudgeDismissed();
  const labelLive = !!(label && !label.hidden && label.getClientRects().length);
  const show = !dismissed && labelLive;
  if (!show) {
    toast.hidden = true;
    toast.setAttribute('hidden', '');
    toast.style.visibility = '';
    toast.style.pointerEvents = '';
    return;
  }
  toast.hidden = false;
  toast.removeAttribute('hidden');
  if (compsNudgeRo) {
    compsNudgeRo.disconnect();
    compsNudgeRo = null;
  }
  if (typeof ResizeObserver !== 'undefined' && label) {
    compsNudgeRo = new ResizeObserver(() => placeTarchNudgeToast(toast, label));
    compsNudgeRo.observe(label);
  }
  placeTarchNudgeToast(toast, label);
  requestAnimationFrame(() => placeTarchNudgeToast(toast, label));
}

function wireCompsNudge(root) {
  if (compsNudgeWired) {
    refreshCompsNudge();
    return;
  }
  compsNudgeWired = true;
  ensureCompsNudgeToast();
  const place = () => refreshCompsNudge();
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-nudge-dismiss]')) setTimeout(place, 0);
  });
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, { passive: true, capture: true });
  root.querySelector('.agent-main-scroll')?.addEventListener('scroll', place, { passive: true });
  document.getElementById('agent-main-scroll')?.addEventListener('scroll', place, { passive: true });
  refreshCompsNudge();
  setTimeout(refreshCompsNudge, 200);
  setTimeout(refreshCompsNudge, 700);
}

/* Gold “This is new!” floaty on the Report builder accordion label.
   Same body-portaled nudge as Transcript Architecture. The card only
   exists after Component Library opens, so the toast stays hidden until
   that label is on screen. */
const RPT_NUDGE_ID = 'mi-rpt-new';
let rptNudgeTaken = false;
let rptNudgeWired = false;
let rptNudgeRo = null;

function rptNudgeDismissed() {
  return !!(isNudgeDismissed(RPT_NUDGE_ID) ||
    (window.WiseNudgeToast && typeof window.WiseNudgeToast.isDismissed === 'function'
      && window.WiseNudgeToast.isDismissed(RPT_NUDGE_ID)));
}

function takeRptNudge() {
  rptNudgeTaken = true;
  const toast = document.getElementById('mi-rpt-nudge');
  if (!toast) return;
  toast.hidden = true;
  toast.setAttribute('hidden', '');
  toast.style.visibility = '';
  toast.style.pointerEvents = '';
}

function rptNudgeAnchor(root) {
  const card = (root || hostEl || document).querySelector('[data-comp-name="Report builder"]');
  if (!card || card.hidden) return null;
  /* Stay on the accordion label whether the card is open or shut —
     only × dismisses it. */
  return card.querySelector(':scope > .dsc-card-head .dsc-name');
}

function ensureRptNudgeToast() {
  let toast = document.getElementById('mi-rpt-nudge');
  if (toast) return toast;
  toast = document.createElement('div');
  toast.id = 'mi-rpt-nudge';
  toast.className = 'dash-score-toast dash-score-toast--gold is-portaled';
  toast.setAttribute('data-nudge-id', RPT_NUDGE_ID);
  toast.setAttribute('role', 'status');
  toast.hidden = true;
  toast.innerHTML =
    '<span class="dash-score-toast-icon"><span class="material-symbols-outlined">new_releases</span></span>' +
    '<div class="dash-score-toast-body">' +
      '<div class="dash-score-toast-title">This is new!</div>' +
      '<p class="dash-score-toast-text">The Report builder is how a conversation becomes a report — plus the charts you want, generate, then save or share.</p>' +
      '<button type="button" class="dash-score-toast-link" data-rpt-nudge-go>Open Report builder<span class="material-symbols-outlined dash-score-toast-link-arrow">arrow_outward</span></button>' +
    '</div>' +
    '<button class="dash-score-toast-close" type="button" aria-label="Dismiss" aria-haspopup="menu" aria-expanded="false"><span class="material-symbols-outlined">close</span></button>';
  document.body.appendChild(toast);
  toast.addEventListener('click', (e) => {
    const go = e.target.closest('[data-rpt-nudge-go]');
    if (!go) return;
    e.preventDefault();
    e.stopPropagation();
    const root = hostEl || document;
    jumpToComponent(root, 'Report builder');
    refreshRptNudge();
  });
  return toast;
}

function refreshRptNudge() {
  const toast = ensureRptNudgeToast();
  const root = hostEl || document;
  const label = rptNudgeAnchor(root);
  const dismissed = rptNudgeTaken || rptNudgeDismissed();
  const labelLive = !!(label && !label.hidden && label.getClientRects().length);
  const show = !dismissed && labelLive;
  if (!show) {
    toast.hidden = true;
    toast.setAttribute('hidden', '');
    toast.style.visibility = '';
    toast.style.pointerEvents = '';
    return;
  }
  toast.hidden = false;
  toast.removeAttribute('hidden');
  if (rptNudgeRo) {
    rptNudgeRo.disconnect();
    rptNudgeRo = null;
  }
  if (typeof ResizeObserver !== 'undefined' && label) {
    rptNudgeRo = new ResizeObserver(() => placeTarchNudgeToast(toast, label));
    rptNudgeRo.observe(label);
  }
  placeTarchNudgeToast(toast, label);
  requestAnimationFrame(() => placeTarchNudgeToast(toast, label));
}

function wireRptNudge(root) {
  if (rptNudgeWired) {
    refreshRptNudge();
    return;
  }
  rptNudgeWired = true;
  ensureRptNudgeToast();
  const place = () => refreshRptNudge();
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-nudge-dismiss]')) setTimeout(place, 0);
  });
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, { passive: true, capture: true });
  root.querySelector('.agent-main-scroll')?.addEventListener('scroll', place, { passive: true });
  document.getElementById('agent-main-scroll')?.addEventListener('scroll', place, { passive: true });
  refreshRptNudge();
  setTimeout(refreshRptNudge, 200);
  setTimeout(refreshRptNudge, 700);
}

/* Gold “This is new!” floaty on the Analytics Types accordion label. */
const AZ_NUDGE_ID = 'mi-az-new';
let azNudgeTaken = false;
let azNudgeWired = false;
let azNudgeRo = null;

function azNudgeDismissed() {
  return !!(isNudgeDismissed(AZ_NUDGE_ID) ||
    (window.WiseNudgeToast && typeof window.WiseNudgeToast.isDismissed === 'function'
      && window.WiseNudgeToast.isDismissed(AZ_NUDGE_ID)));
}

function takeAzNudge() {
  azNudgeTaken = true;
  const toast = document.getElementById('mi-az-nudge');
  if (!toast) return;
  toast.hidden = true;
  toast.setAttribute('hidden', '');
  toast.style.visibility = '';
  toast.style.pointerEvents = '';
}

function azNudgeAnchor(root) {
  const sec = (root || hostEl || document).querySelector('#mi-analytics');
  if (!sec || sec.hidden) return null;
  return sec.querySelector(':scope > .mi-module-head .mi-module-title');
}

function ensureAzNudgeToast() {
  let toast = document.getElementById('mi-az-nudge');
  if (toast) return toast;
  toast = document.createElement('div');
  toast.id = 'mi-az-nudge';
  toast.className = 'dash-score-toast dash-score-toast--gold is-portaled';
  toast.setAttribute('data-nudge-id', AZ_NUDGE_ID);
  toast.setAttribute('role', 'status');
  toast.hidden = true;
  toast.innerHTML =
    '<span class="dash-score-toast-icon"><span class="material-symbols-outlined">new_releases</span></span>' +
    '<div class="dash-score-toast-body">' +
      '<div class="dash-score-toast-title">This is new!</div>' +
      '<p class="dash-score-toast-text">Analytics Types is now a thumbnail gallery — every chart from the catalog, tap to open full size.</p>' +
      '<button type="button" class="dash-score-toast-link" data-az-nudge-go>Open Analytics Types<span class="material-symbols-outlined dash-score-toast-link-arrow">arrow_outward</span></button>' +
    '</div>' +
    '<button class="dash-score-toast-close" type="button" aria-label="Dismiss" aria-haspopup="menu" aria-expanded="false"><span class="material-symbols-outlined">close</span></button>';
  document.body.appendChild(toast);
  toast.addEventListener('click', (e) => {
    const go = e.target.closest('[data-az-nudge-go]');
    if (!go) return;
    e.preventDefault();
    e.stopPropagation();
    const root = hostEl || document;
    expandAccordionSection(root, 'mi-analytics').then(() => {
      document.getElementById('mi-analytics')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  return toast;
}

function refreshAzNudge() {
  const toast = ensureAzNudgeToast();
  const root = hostEl || document;
  const label = azNudgeAnchor(root);
  const dismissed = azNudgeTaken || azNudgeDismissed();
  const labelLive = !!(label && !label.hidden && label.getClientRects().length);
  const show = !dismissed && labelLive;
  if (!show) {
    toast.hidden = true;
    toast.setAttribute('hidden', '');
    toast.style.visibility = '';
    toast.style.pointerEvents = '';
    return;
  }
  toast.hidden = false;
  toast.removeAttribute('hidden');
  if (azNudgeRo) {
    azNudgeRo.disconnect();
    azNudgeRo = null;
  }
  if (typeof ResizeObserver !== 'undefined' && label) {
    azNudgeRo = new ResizeObserver(() => placeTarchNudgeToast(toast, label));
    azNudgeRo.observe(label);
  }
  placeTarchNudgeToast(toast, label);
  requestAnimationFrame(() => placeTarchNudgeToast(toast, label));
}

function wireAzNudge(root) {
  if (azNudgeWired) {
    refreshAzNudge();
    return;
  }
  azNudgeWired = true;
  ensureAzNudgeToast();
  const place = () => refreshAzNudge();
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-nudge-dismiss]')) setTimeout(place, 0);
  });
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, { passive: true, capture: true });
  root.querySelector('.agent-main-scroll')?.addEventListener('scroll', place, { passive: true });
  document.getElementById('agent-main-scroll')?.addEventListener('scroll', place, { passive: true });
  refreshAzNudge();
  setTimeout(refreshAzNudge, 200);
  setTimeout(refreshAzNudge, 700);
}

/* Gold “This is new!” on the Charts & graphs card inside Component Library. */
const AZ_COMP_NUDGE_ID = 'mi-az-comp-new';
let azCompNudgeTaken = false;
let azCompNudgeWired = false;
let azCompNudgeRo = null;

function azCompNudgeDismissed() {
  return !!(isNudgeDismissed(AZ_COMP_NUDGE_ID) ||
    (window.WiseNudgeToast && typeof window.WiseNudgeToast.isDismissed === 'function'
      && window.WiseNudgeToast.isDismissed(AZ_COMP_NUDGE_ID)));
}

function takeAzCompNudge() {
  azCompNudgeTaken = true;
  const toast = document.getElementById('mi-az-comp-nudge');
  if (!toast) return;
  toast.hidden = true;
  toast.setAttribute('hidden', '');
  toast.style.visibility = '';
  toast.style.pointerEvents = '';
}

function azCompNudgeAnchor(root) {
  const card = (root || hostEl || document).querySelector('[data-comp-name="Charts & graphs"]');
  if (!card || card.hidden) return null;
  return card.querySelector(':scope > .dsc-card-head .dsc-name');
}

function ensureAzCompNudgeToast() {
  let toast = document.getElementById('mi-az-comp-nudge');
  if (toast) return toast;
  toast = document.createElement('div');
  toast.id = 'mi-az-comp-nudge';
  toast.className = 'dash-score-toast dash-score-toast--gold is-portaled';
  toast.setAttribute('data-nudge-id', AZ_COMP_NUDGE_ID);
  toast.setAttribute('role', 'status');
  toast.hidden = true;
  toast.innerHTML =
    '<span class="dash-score-toast-icon"><span class="material-symbols-outlined">new_releases</span></span>' +
    '<div class="dash-score-toast-body">' +
      '<div class="dash-score-toast-title">This is new!</div>' +
      '<p class="dash-score-toast-text">Charts &amp; graphs is its own library section — every chart type as a thumbnail, tap to open full size.</p>' +
      '<button type="button" class="dash-score-toast-link" data-az-comp-nudge-go>Open Charts &amp; graphs<span class="material-symbols-outlined dash-score-toast-link-arrow">arrow_outward</span></button>' +
    '</div>' +
    '<button class="dash-score-toast-close" type="button" aria-label="Dismiss" aria-haspopup="menu" aria-expanded="false"><span class="material-symbols-outlined">close</span></button>';
  document.body.appendChild(toast);
  toast.addEventListener('click', (e) => {
    const go = e.target.closest('[data-az-comp-nudge-go]');
    if (!go) return;
    e.preventDefault();
    e.stopPropagation();
    jumpToComponent(hostEl || document, 'Charts & graphs');
    refreshAzCompNudge();
  });
  return toast;
}

function refreshAzCompNudge() {
  const toast = ensureAzCompNudgeToast();
  const root = hostEl || document;
  const label = azCompNudgeAnchor(root);
  const dismissed = azCompNudgeTaken || azCompNudgeDismissed();
  const labelLive = !!(label && !label.hidden && label.getClientRects().length);
  const show = !dismissed && labelLive;
  if (!show) {
    toast.hidden = true;
    toast.setAttribute('hidden', '');
    toast.style.visibility = '';
    toast.style.pointerEvents = '';
    return;
  }
  toast.hidden = false;
  toast.removeAttribute('hidden');
  if (azCompNudgeRo) {
    azCompNudgeRo.disconnect();
    azCompNudgeRo = null;
  }
  if (typeof ResizeObserver !== 'undefined' && label) {
    azCompNudgeRo = new ResizeObserver(() => placeTarchNudgeToast(toast, label));
    azCompNudgeRo.observe(label);
  }
  placeTarchNudgeToast(toast, label);
  requestAnimationFrame(() => placeTarchNudgeToast(toast, label));
}

function wireAzCompNudge(root) {
  if (azCompNudgeWired) {
    refreshAzCompNudge();
    return;
  }
  azCompNudgeWired = true;
  ensureAzCompNudgeToast();
  const place = () => refreshAzCompNudge();
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-nudge-dismiss]')) setTimeout(place, 0);
  });
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, { passive: true, capture: true });
  root.querySelector('.agent-main-scroll')?.addEventListener('scroll', place, { passive: true });
  document.getElementById('agent-main-scroll')?.addEventListener('scroll', place, { passive: true });
  refreshAzCompNudge();
  setTimeout(refreshAzCompNudge, 200);
  setTimeout(refreshAzCompNudge, 700);
}

/* ------------------------------------------------------------------ */
/* Page-wide search — indexes every catalog this page already renders */
/* ------------------------------------------------------------------ */

const GLOBAL_SEARCH_PER_GROUP = 6;
const GLOBAL_SEARCH_MAX = 36;
const GLOBAL_SEARCH_GROUPS = [
  'Scorecards', 'Modules', 'Tables', 'Analytics', 'App logic', 'Intent chips',
  'Trace', 'Transcript', 'Motion', 'Responsiveness', 'Icons', 'Type', 'Tokens', 'Components', 'Codebase',
];
const GLOBAL_SECTION_SEARCH = [
  '#mi-dir-search', '#mi-tbl-search', '#mi-az-search', '#mi-logic-search',
  '#mi-int-search', '#ii-search-input', '#dsc-search',
];

function stripSearchText(s) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function matchSearchTokens(hay, q) {
  const tokens = String(q || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;
  const h = String(hay || '').toLowerCase();
  return tokens.every((t) => h.indexOf(t) !== -1);
}

let _globalIndex = null;
function buildGlobalIndex() {
  if (_globalIndex) return _globalIndex;
  const items = [];
  const add = (item) => {
    items.push({
      ...item,
      q: String(item.q || '').toLowerCase(),
    });
  };

  sectionNavTiles().forEach((t) => add({
    kind: 'section', section: t.id, group: 'Scorecards', icon: t.icon,
    title: t.label, sub: t.sub, key: t.id,
    q: `${t.label} ${t.sub} ${t.id} scorecard`,
  }));

  dirModulesFlat().forEach((m) => add({
    kind: 'module', section: 'mi-directory', group: 'Modules', icon: m.icon || 'apps',
    title: m.label, sub: m.href, key: m.href, searchSel: '#mi-dir-search',
    q: `${m.label} ${m.href} ${m.group || ''} ${m.badge || ''} ${m.areaTitle || ''}`,
  }));

  TABLE_CATALOG.forEach((t) => add({
    kind: 'table', section: 'mi-tables', group: 'Tables', icon: t.icon || 'table_chart',
    title: t.label, sub: t.desc || t.areaTitle, key: t.label, searchSel: '#mi-tbl-search',
    q: `${t.label} ${t.href} ${t.areaTitle || ''} ${t.desc || ''} ${t.selector || ''}`,
  }));

  ANALYTICS_GALLERY.forEach((t) => add({
    kind: 'analytics', section: 'mi-analytics', group: 'Analytics', icon: t.icon || 'bar_chart',
    title: t.label, sub: t.desc || 'Analytics Types', key: t.id, searchSel: '#mi-az-search',
    q: `${t.label} ${t.id} ${t.desc || ''} chart graph analytics ${analyticsFocusSel(t)}`,
  }));

  APP_LOGIC.forEach((page) => {
    (page.rules || []).forEach((rule) => add({
      kind: 'logic', section: 'mi-logic', group: 'App logic', icon: page.icon || 'rule',
      title: rule.title, sub: page.label, key: rule.title, searchSel: '#mi-logic-search',
      q: `${page.label} ${page.area} ${rule.title} ${stripSearchText(rule.how)} ${(page.src || []).join(' ')}`,
    }));
  });

  allIntentRows().forEach((c) => add({
    kind: 'intent', section: 'mi-intents', group: 'Intent chips', icon: c.icon || 'bolt',
    title: c.label, sub: `${c.surface} · ${c.i}`, key: `${c.href}::${c.i}`, searchSel: '#mi-int-search',
    q: `${c.label} ${c.i} ${c.surface} ${c.does || ''} ${c.status}`,
  }));

  TRACE_MILESTONES.forEach((m, i) => add({
    kind: 'trace', section: 'mi-trace', group: 'Trace', icon: 'psychology',
    title: (m.keys || [])[0] || ('Section ' + (i + 1)),
    sub: (m.keys || []).slice(1).join(' · '), key: String(i),
    q: `${(m.keys || []).join(' ')} ${(m.haiku || []).flat().join(' ')} trace helix streaming`,
  }));

  TARCH_LAYERS.forEach((l) => add({
    kind: 'tarch', section: 'mi-tarch', group: 'Transcript', icon: l.icon,
    title: l.title, sub: l.body, key: l.id,
    q: `${l.title} ${l.id} ${l.body} ${l.jump || ''} transcript architecture history turns composer chips outputs versions tokens strip cwr`,
  }));

  MOTION_ITEMS.forEach((item) => add({
    kind: 'motion', section: 'mi-motion', group: 'Motion', icon: item.icon || 'animation',
    title: item.title, sub: item.used || item.src || '', key: item.id,
    q: `${item.title} ${item.id} ${item.group} ${item.src || ''} ${item.used || ''} ${stripSearchText(item.lede)}`,
  }));

  RESPONSIVE_SURFACES.forEach((item) => add({
    kind: 'resp', section: 'mi-responsive', group: 'Responsiveness', icon: item.icon || 'devices',
    title: item.title, sub: item.used || item.src || '', key: item.id,
    q: `${item.title} ${item.id} ${item.src || ''} ${item.used || ''} ${stripSearchText(item.lede)} ${stripSearchText(item.mobile)} ${stripSearchText(item.laptop)} ${stripSearchText(item.larger)} ${(item.changes || []).join(' ')} mobile laptop larger responsive breakpoint`,
  }));

  ((ICON_INVENTORY && ICON_INVENTORY.icons) || []).forEach((ic) => add({
    kind: 'icon', section: 'mi-icons', group: 'Icons', icon: ic.name,
    title: ic.name, sub: ic.label || (ic.groups || []).join(', '), key: ic.name, searchSel: '#ii-search-input',
    q: `${ic.name} ${ic.label || ''} ${(ic.groups || []).join(' ')} ${(ic.placements || []).map((p) => `${p.file} ${p.label || ''}`).join(' ')}`,
  }));

  FONT_FAMILIES.forEach((f) => add({
    kind: 'font', section: 'mi-design', group: 'Type', icon: 'font_download',
    title: f.name, sub: f.use, key: f.name,
    q: `${f.name} ${f.css} ${f.token || ''} ${f.use} ${f.sample || ''} font typography`,
  }));

  TYPE_SCALE.forEach((t) => add({
    kind: 'type', section: 'mi-design', group: 'Type', icon: 'format_size',
    title: t.name, sub: `${t.size} · ${t.family}`, key: t.name,
    q: `${t.name} ${t.size} ${t.px} ${t.weight} ${t.family} ${t.token || ''} ${t.use}`,
  }));

  COLOR_GROUPS.forEach((g) => {
    const name = colorGroupTitle(g);
    add({
      kind: 'token-group', section: 'mi-design', group: 'Tokens', icon: 'palette',
      title: name, sub: g.note, key: colorGroupId(g),
      q: `${g.title} ${name} ${g.note || ''} ${(g.swatches || []).map((s) => s.token).join(' ')} color group`,
    });
    (g.swatches || []).forEach((sw) => add({
      kind: 'token', section: 'mi-design', group: 'Tokens', icon: 'palette',
      title: sw.token, sub: sw.use || name, key: sw.token,
      q: `${sw.token} ${sw.use || ''} ${g.title} ${name} ${g.note || ''} color token`,
    }));
  });

  COMPONENTS.forEach((c) => add({
    kind: 'component', section: 'mi-components', group: 'Components', icon: c.noteIcon || 'widgets',
    title: c.name, sub: c.cls, key: c.name, searchSel: '#dsc-search',
    q: `${c.name} ${(c.aliases || []).join(' ')} ${c.cls} ${c.used} ${stripSearchText(c.note)} ${catOf(c)}`,
  }));

  CODE_METRICS.forEach((m) => add({
    kind: 'code', section: 'mi-code', group: 'Codebase', icon: m.icon,
    title: m.label, sub: m.sub, key: m.key,
    q: `${m.label} ${m.key} ${m.sub} lines of code`,
  }));
  add({
    kind: 'code', section: 'mi-code', group: 'Codebase', icon: 'code',
    title: 'Lines of code', sub: 'Total across HTML, JavaScript, CSS, Python', key: 'total',
    q: 'lines of code total codebase files python javascript html css',
  });

  _globalIndex = items;
  return items;
}

function flashEl(el) {
  if (!el) return;
  el.classList.remove('is-flash');
  void el.offsetWidth;
  el.classList.add('is-flash');
  requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
}

function setSectionQuery(root, sel, q) {
  if (!sel) return;
  const el = root.querySelector(sel);
  if (!el) return;
  el.value = q || '';
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function clearSectionQueries(root) {
  GLOBAL_SECTION_SEARCH.forEach((sel) => {
    const el = root.querySelector(sel);
    if (el && el.value) {
      el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  root.querySelectorAll('[data-motion-card]').forEach((el) => { el.hidden = false; });
  root.querySelectorAll('[data-resp-card]').forEach((el) => { el.hidden = false; });
}

function findByAttr(root, sel, attr, key) {
  return Array.from(root.querySelectorAll(sel)).find((n) => n.getAttribute(attr) === key);
}

async function jumpGlobalHit(root, hit, q) {
  if (!hit) return;
  await expandAccordionSection(root, hit.section);
  setSectionQuery(root, hit.searchSel, q);
  if (hit.kind === 'motion') {
    const needle = String(q || '').trim().toLowerCase();
    root.querySelectorAll('[data-motion-card]').forEach((el) => {
      el.hidden = !!(needle && (el.dataset.search || '').indexOf(needle) === -1);
    });
  }
  if (hit.kind === 'resp') {
    const needle = String(q || '').trim().toLowerCase();
    root.querySelectorAll('[data-resp-card]').forEach((el) => {
      el.hidden = !!(needle && (el.dataset.search || '').indexOf(needle) === -1);
    });
  }
  if (hit.kind === 'tarch') {
    const el = findByAttr(root, '[data-tarch-target]', 'data-tarch-target', hit.key);
    if (el) flashEl(el);
    else {
      const sec = root.querySelector('#' + hit.section);
      if (sec) requestAnimationFrame(() => sec.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
    return;
  }
  if (hit.kind === 'more' || hit.kind === 'section' || hit.kind === 'trace') {
    const sec = root.querySelector('#' + hit.section);
    if (sec) requestAnimationFrame(() => sec.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    return;
  }
  if (hit.kind === 'module') { await jumpToDirectoryModule(root, hit.key); return; }
  if (hit.kind === 'component') { await jumpToComponent(root, hit.key); return; }

  let el = null;
  if (hit.kind === 'table') el = findByAttr(root, '[data-tpane]', 'data-tbl', hit.key);
  else if (hit.kind === 'analytics') el = findByAttr(root, '[data-az-thumb]', 'data-az-id', hit.key);
  else if (hit.kind === 'logic') el = findByAttr(root, '[data-logic-rule]', 'data-logic-title', hit.key);
  else if (hit.kind === 'intent') el = findByAttr(root, '[data-int-row]', 'data-int-id', hit.key);
  else if (hit.kind === 'motion') el = findByAttr(root, '[data-motion-card]', 'data-motion-id', hit.key);
  else if (hit.kind === 'resp') el = findByAttr(root, '[data-resp-card]', 'data-resp-id', hit.key);
  else if (hit.kind === 'icon') el = findByAttr(root, '[data-icon-card]', 'data-name', hit.key);
  else if (hit.kind === 'font') el = findByAttr(root, '[data-ds-font]', 'data-ds-font', hit.key);
  else if (hit.kind === 'type') el = findByAttr(root, '[data-ds-type]', 'data-ds-type', hit.key);
  else if (hit.kind === 'token') el = findByAttr(root, '[data-swatch]', 'data-token', hit.key);
  else if (hit.kind === 'token-group') el = findByAttr(root, '[data-ds-group]', 'data-ds-group', hit.key);
  else if (hit.kind === 'code') el = findByAttr(root, '[data-code-metric]', 'data-code-metric', hit.key);

  if (el) flashEl(el);
  else {
    const sec = root.querySelector('#' + hit.section);
    if (sec) requestAnimationFrame(() => sec.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
}

function filterScorecards(root, hits) {
  const nav = root.querySelector('.dsc-jump');
  if (!nav) return;
  if (!hits) {
    nav.classList.remove('is-filtered');
    nav.querySelectorAll('[data-jump]').forEach((t) => { t.hidden = false; });
    refreshTarchNudge();
    refreshAzNudge();
    refreshCompsNudge();
    refreshRptNudge();
    refreshAzCompNudge();
    return;
  }
  const sections = new Set(hits.map((h) => h.section));
  nav.classList.add('is-filtered');
  nav.querySelectorAll('[data-jump]').forEach((t) => {
    t.hidden = !sections.has(t.dataset.jump);
  });
  refreshTarchNudge();
  refreshAzNudge();
  refreshCompsNudge();
  refreshRptNudge();
  refreshAzCompNudge();
}

function groupedGlobalHits(matches) {
  const byGroup = {};
  matches.forEach((item) => {
    (byGroup[item.group] || (byGroup[item.group] = [])).push(item);
  });
  const rows = [];
  let shown = 0;
  GLOBAL_SEARCH_GROUPS.forEach((group) => {
    const list = byGroup[group];
    if (!list || !list.length) return;
    if (shown >= GLOBAL_SEARCH_MAX) return;
    const room = Math.min(GLOBAL_SEARCH_PER_GROUP, GLOBAL_SEARCH_MAX - shown, list.length);
    const slice = list.slice(0, room);
    const hidden = list.length - slice.length;
    rows.push({ type: 'head', group, n: list.length });
    slice.forEach((item) => rows.push({ type: 'hit', item }));
    shown += slice.length;
    if (hidden > 0) {
      rows.push({
        type: 'hit',
        item: {
          kind: 'more',
          section: slice[0].section,
          searchSel: slice[0].searchSel,
          group,
          title: hidden + ' more in ' + group,
          sub: 'Open the section with this search applied',
          icon: 'arrow_downward',
        },
      });
    }
  });
  return rows;
}

function wireGlobalSearch(root) {
  const input = root.querySelector('#mi-global-q');
  const panel = root.querySelector('#mi-global-hits');
  if (!input || !panel) return;

  const state = { q: '', rows: [], active: -1 };

  const setActive = (i) => {
    const buttons = Array.from(panel.querySelectorAll('.mi-global-hit'));
    state.active = buttons.length ? Math.max(0, Math.min(i, buttons.length - 1)) : -1;
    buttons.forEach((b, n) => b.classList.toggle('is-active', n === state.active));
    const cur = buttons[state.active];
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  };

  const render = () => {
    const q = state.q;
    if (!q) {
      panel.hidden = true;
      panel.innerHTML = '';
      state.rows = [];
      state.active = -1;
      input.removeAttribute('aria-expanded');
      filterScorecards(root, null);
      return;
    }
    const matches = buildGlobalIndex().filter((item) => matchSearchTokens(item.q, q));
    filterScorecards(root, matches);
    if (!matches.length) {
      panel.hidden = false;
      panel.innerHTML = `<div class="mi-global-hits-empty">No matches for “${esc(q)}”.</div>`;
      state.rows = [];
      state.active = -1;
      input.setAttribute('aria-expanded', 'true');
      return;
    }
    const rows = groupedGlobalHits(matches);
    const hits = rows.filter((r) => r.type === 'hit').map((r) => r.item);
    state.rows = hits;
    let hitI = 0;
    const html = [
      `<div class="mi-global-hits-meta">${matches.length} match${matches.length === 1 ? '' : 'es'}</div>`,
      ...rows.map((r) => {
        if (r.type === 'head') {
          return `<div class="mi-global-hits-ghead">${esc(r.group)} · ${r.n}</div>`;
        }
        const item = r.item;
        const i = hitI++;
        const moreCls = item.kind === 'more' ? ' mi-global-hit-more' : '';
        return `<button type="button" class="mi-global-hit${moreCls}" role="option" data-hit="${i}">
          <span class="material-symbols-outlined" aria-hidden="true">${esc(item.icon || 'search')}</span>
          <span class="mi-global-hit-body">
            <span class="mi-global-hit-title">${esc(item.title)}</span>
            ${item.sub ? `<span class="mi-global-hit-sub">${esc(item.sub)}</span>` : ''}
          </span>
        </button>`;
      }),
    ].join('');
    panel.hidden = false;
    panel.innerHTML = html;
    input.setAttribute('aria-expanded', 'true');
    setActive(0);
  };

  input.addEventListener('input', () => {
    state.q = input.value.trim();
    if (!state.q) clearSectionQueries(root);
    if (state.q && (!ICON_INVENTORY || !APP_LOGIC.length)) {
      Promise.all([ensureIconInventory(), ensureAppLogic()]).then(() => {
        if (input.value.trim() === state.q) render();
      });
    }
    render();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (input.value) {
        e.preventDefault();
        input.value = '';
        state.q = '';
        clearSectionQueries(root);
        render();
      }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(state.active + 1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive(state.active - 1); return; }
    if (e.key === 'Enter') {
      const hit = state.rows[state.active] || state.rows[0];
      if (!hit) return;
      e.preventDefault();
      jumpGlobalHit(root, hit, state.q);
    }
  });
  panel.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-hit]');
    if (!btn) return;
    const hit = state.rows[Number(btn.getAttribute('data-hit'))];
    if (hit) jumpGlobalHit(root, hit, state.q);
  });
  panel.addEventListener('mousemove', (e) => {
    const btn = e.target.closest('[data-hit]');
    if (!btn) return;
    const i = Number(btn.getAttribute('data-hit'));
    if (i !== state.active) setActive(i);
  });
}

/* ------------------------------------------------------------------ */
/* Per-module control wiring (three-dot menu + width changer)         */
/* ------------------------------------------------------------------ */

/* A menu action fires the module's real toolbar control, so the ⋯ menu does
   exactly what the on-page buttons do — no parallel logic to drift. */
const ACTION_SECTION = {
  'ii-name': 'mi-icons', 'ii-count': 'mi-icons', 'ii-all': 'mi-icons',
  'ds-type': 'mi-design', 'ds-colors': 'mi-design', 'ds-reset-colors': 'mi-design', 'ds-jump': 'mi-design',
  'dsc-clear': 'mi-components',
  'code-7': 'mi-code', 'code-30': 'mi-code', 'code-all': 'mi-code',
  'logic-all': 'mi-logic', 'logic-shared': 'mi-logic', 'logic-clear': 'mi-logic', 'logic-intents': 'mi-intents',
  'int-all': 'mi-intents', 'int-talk': 'mi-intents', 'int-act': 'mi-intents', 'int-clear': 'mi-intents',
  'tbl-clear': 'mi-tables', 'tbl-start': 'mi-tables',
  'az-clear': 'mi-analytics',
  'trace-replay': 'mi-trace',
  'motion-replay': 'mi-motion', 'motion-anim': 'mi-motion', 'motion-drag': 'mi-motion',
  'resp-mobile': 'mi-responsive', 'resp-laptop': 'mi-responsive', 'resp-larger': 'mi-responsive',
  'dir-grid': 'mi-directory', 'dir-rail': 'mi-directory', 'dir-clear': 'mi-directory', 'dir-gallery': 'mi-directory',
};

async function runModuleAction(root, action) {
  const need = ACTION_SECTION[action];
  if (need) await expandAccordionSection(root, need);
  const click = (sel) => root.querySelector(sel)?.click();
  const clearInput = (sel) => {
    const el = root.querySelector(sel);
    if (el) { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); }
  };
  switch (action) {
    case 'dir-grid': click('[data-view="grid"]'); break;
    case 'dir-rail': click('[data-view="rail"]'); break;
    case 'dir-gallery': {
      const a = root.querySelector('[data-page-gallery]');
      if (a && a.getAttribute('href')) location.assign(a.getAttribute('href'));
      break;
    }
    case 'dir-clear': clearInput('#mi-dir-search'); click('#mi-dir-stats [data-area="all"]'); break;
    case 'dir-reeval': click('[data-mi-reeval]'); break;
    case 'dir-hard': click('[data-mi-hard-reload]'); break;
    case 'ii-name': click('[data-ii-sort="name"]'); break;
    case 'ii-count': click('[data-ii-sort="count"]'); break;
    case 'ii-all': clearInput('#ii-search-input'); click('[data-ii-style="outlined"]'); click('[data-ii-group="all"]'); break;
    case 'ds-type': expandAccordionSection(root, 'mi-design'); root.querySelector('#ds-typography')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
    case 'ds-colors': expandAccordionSection(root, 'mi-design'); root.querySelector('#ds-colors')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
    case 'ds-reset-colors': click('[data-ds-reset-colors]'); break;
    case 'ds-jump': expandAccordionSection(root, 'mi-design'); root.querySelector('#mi-design')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
    case 'dsc-clear': clearInput('#dsc-search'); break;
    case 'code-7': click('[data-code-win="7"]'); break;
    case 'code-30': click('[data-code-win="30"]'); break;
    case 'code-all': click('[data-code-win="all"]'); break;
    case 'logic-all': click('#mi-logic [data-logic-filter="all"]'); break;
    case 'logic-shared': click('#mi-logic [data-logic-filter="shared"]'); break;
    case 'logic-intents': expandAccordionSection(root, 'mi-intents'); root.querySelector('#mi-intents')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
    case 'logic-clear': clearInput('#mi-logic-search'); click('#mi-logic [data-logic-filter="all"]'); break;
    case 'int-all': click('#mi-intents [data-int-filter="all"]'); break;
    case 'int-talk': click('#mi-intents [data-int-filter="talk"]'); break;
    case 'int-act': click('#mi-intents [data-int-filter="act"]'); break;
    case 'int-clear': clearInput('#mi-int-search'); click('#mi-intents [data-int-filter="all"]'); break;
    case 'tbl-clear': clearInput('#mi-tbl-search'); break;
    case 'az-clear': clearInput('#mi-az-search'); break;
    case 'tbl-start': root.querySelector('#mi-tbl-track')?.scrollTo({ left: 0, behavior: 'smooth' }); break;
    case 'trace-replay': expandAccordionSection(root, 'mi-trace'); click('#mi-trace [data-trace-run]'); break;
    case 'motion-replay': {
      expandAccordionSection(root, 'mi-motion');
      const motion = root.querySelector('#mi-motion');
      if (motion && typeof motion.__motionReplayAll === 'function') motion.__motionReplayAll();
      break;
    }
    case 'motion-anim': expandAccordionSection(root, 'mi-motion'); click('#mi-motion [data-motion-filter="anim"]'); break;
    case 'motion-drag': expandAccordionSection(root, 'mi-motion'); click('#mi-motion [data-motion-filter="drag"]'); break;
    case 'resp-mobile':
    case 'resp-laptop':
    case 'resp-larger': {
      expandAccordionSection(root, 'mi-responsive').then(() => {
        const sec = root.querySelector('#mi-responsive');
        const size = action.replace('resp-', '');
        if (sec) setRespSize(sec, size);
      });
      break;
    }
  }
}

function wireModuleControls(root) {
  root.querySelectorAll('[data-mi-controls]').forEach((cluster) => {
    /* ---- Three-dot menu ---- */
    const moreBtn = cluster.querySelector('[data-mi-more]');
    const morePop = cluster.querySelector('[data-mi-more-pop]');
    if (moreBtn && morePop) {
      const closeThis = () => {
        morePop.classList.add('hidden');
        moreBtn.classList.remove('is-open');
        moreBtn.setAttribute('aria-expanded', 'false');
      };
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const opening = morePop.classList.contains('hidden');
        /* Close any other module's open menu first (one open at a time). */
        root.querySelectorAll('[data-mi-more-pop]').forEach((p) => { if (p !== morePop) p.classList.add('hidden'); });
        morePop.classList.toggle('hidden', !opening);
        moreBtn.classList.toggle('is-open', opening);
        moreBtn.setAttribute('aria-expanded', opening ? 'true' : 'false');
      });
      morePop.addEventListener('click', (e) => {
        const item = e.target.closest('[data-mi-action]');
        if (!item) return;
        closeThis();
        runModuleAction(root, item.getAttribute('data-mi-action'));
      });
    }
  });

  /* Click-outside / Escape closes any open module menu — wired once. */
  if (!wireModuleControls._docWired) {
    wireModuleControls._docWired = true;
    const closeAll = (e) => {
      document.querySelectorAll('[data-mi-controls]').forEach((cluster) => {
        if (e && cluster.contains(e.target)) return;
        cluster.querySelector('[data-mi-more-pop]')?.classList.add('hidden');
        const b = cluster.querySelector('[data-mi-more]');
        b?.classList.remove('is-open');
        b?.setAttribute('aria-expanded', 'false');
      });
    };
    document.addEventListener('click', closeAll);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });
  }
}

/* ------------------------------------------------------------------ */
/* Live link validation                                               */
/*                                                                    */
/* The directory should never ship a dead link. Every row comes from   */
/* the curated MODULE_SECTIONS map, and any of them can drift if a page */
/* is renamed or removed. So after render we probe every unique href and*/
/* flag anything that 404s (or otherwise fails) right on the card,     */
/* instead of letting the user click into a broken page. We re-run the */
/* probe whenever the tab regains focus so the page stays aware of URL */
/* changes without a full reload.                                      */
/* ------------------------------------------------------------------ */

/* Probe a URL and resolve to true only for a real, reachable page.
   HEAD first (cheap); fall back to a ranged GET for servers that don't
   allow HEAD. A thrown fetch (network error) counts as unreachable. */
async function probeUrl(href) {
  const tryFetch = async (method, extra) => {
    const res = await fetch(href, { method, cache: 'no-store', redirect: 'follow', ...extra });
    return res;
  };
  try {
    let res = await tryFetch('HEAD');
    if (res.status === 405 || res.status === 501) {
      res = await tryFetch('GET', { headers: { Range: 'bytes=0-0' } });
    }
    return res.ok;
  } catch (e) {
    return false;
  }
}

/* Paint a card as broken: non-navigable, dimmed, with a 404 badge so the
   admin can see exactly which module is dead. Idempotent. */
function markCardBroken(card) {
  if (card.classList.contains('mi-card--broken')) return;
  card.classList.add('mi-card--broken');
  card.setAttribute('aria-disabled', 'true');
  card.title = 'This page is unavailable (link is broken).';
  const name = card.querySelector('.mi-card-name');
  if (name && !name.querySelector('.mi-card-broken-badge')) {
    name.insertAdjacentHTML('beforeend', '<span class="mi-card-broken-badge">404</span>');
  }
  const main = card.matches('a.mi-card, a.mi-card-main') ? card : card.querySelector('.mi-card-main');
  if (main) main.addEventListener('click', preventBrokenNav);
}

/* Reset a card that probed healthy on a re-check (e.g. a renamed file was
   restored), so recovery doesn't require a reload. */
function clearCardBroken(card) {
  if (!card.classList.contains('mi-card--broken')) return;
  card.classList.remove('mi-card--broken');
  card.removeAttribute('aria-disabled');
  card.removeAttribute('title');
  card.querySelector('.mi-card-broken-badge')?.remove();
  const main = card.matches('a.mi-card, a.mi-card-main') ? card : card.querySelector('.mi-card-main');
  if (main) main.removeEventListener('click', preventBrokenNav);
}

function preventBrokenNav(e) { e.preventDefault(); }

/* Mirror the broken/healthy state onto the matching rail pane(s): kill the
   live preview iframe so it doesn't render the server's 404 page. */
function setPaneBroken(pane, broken) {
  pane.classList.toggle('mi-pane--broken', broken);
  const frame = pane.querySelector('.mi-pane-frame');
  const viewport = pane.querySelector('.mi-pane-viewport');
    const links = pane.querySelectorAll('a[href]:not([data-jump-comp])');
  if (broken) {
    if (frame) frame.removeAttribute('src');
    if (viewport && !viewport.querySelector('.mi-pane-broken')) {
      viewport.insertAdjacentHTML('beforeend',
        '<span class="mi-pane-broken"><span class="material-symbols-outlined">link_off</span>Unavailable · 404</span>');
    }
    links.forEach((a) => a.addEventListener('click', preventBrokenNav));
  } else {
    pane.querySelector('.mi-pane-broken')?.remove();
    links.forEach((a) => a.removeEventListener('click', preventBrokenNav));
    /* A pane that was marked broken had its iframe src stripped — restore it
       on recovery, or the pane stays blank forever even though the page is
       back. (previewSrc re-tags the URL so embedded-preview guards hold.) */
    if (frame && !frame.getAttribute('src')) {
      const next = canLivePreview(pane.getAttribute('data-href'))
        ? previewSrc(pane.getAttribute('data-href')) : '';
      if (next) {
        frame.setAttribute('data-src', next);
        hydrateFrame(frame);
      }
    }
  }
}

let linkValidationRoot = null;

async function runLinkValidation(root) {
  /* file:// blocks fetch of sibling files, which would flag everything as
     broken. Only validate when actually served over http(s). */
  if (location.protocol === 'file:') return;

  const cards = Array.from(root.querySelectorAll('[data-mod-card]'));
  const panes = Array.from(root.querySelectorAll('[data-pane][data-href]'));

  /* De-dupe by href so each URL is probed once, then fan the result back out
     to every card + pane that points at it. */
  const byHref = new Map();
  const register = (el, href) => {
    if (!href || href === '#') return;
    if (!byHref.has(href)) byHref.set(href, []);
    byHref.get(href).push(el);
  };
  cards.forEach((c) => register(c, c.getAttribute('data-href') || c.getAttribute('href') || c.querySelector('.mi-card-main')?.getAttribute('href')));
  panes.forEach((p) => register(p, p.getAttribute('data-href')));

  await Promise.all(Array.from(byHref.entries()).map(async ([href, els]) => {
    const ok = await probeUrl(href);
    els.forEach((el) => {
      if (el.matches('[data-pane]')) { setPaneBroken(el, !ok); return; }
      if (ok) clearCardBroken(el); else markCardBroken(el);
    });
  }));
}

function wireLinkValidation(root) {
  linkValidationRoot = root;
  const start = () => {
    if (linkValidationRoot && linkValidationRoot.isConnected) runLinkValidation(linkValidationRoot);
  };
  if (typeof requestIdleCallback === 'function') requestIdleCallback(start, { timeout: 2500 });
  else setTimeout(start, 600);

  /* Stay aware of URL / module changes without a reload: re-probe whenever the
     tab is brought back to the foreground. Guarded so it only ever wires once. */
  if (!wireLinkValidation._wired) {
    wireLinkValidation._wired = true;
    let pending = false;
    const revalidate = () => {
      if (pending || !linkValidationRoot || !linkValidationRoot.isConnected) return;
      pending = true;
      Promise.resolve(runLinkValidation(linkValidationRoot)).finally(() => { pending = false; });
    };
    document.addEventListener('visibilitychange', () => { if (!document.hidden) revalidate(); });
    window.addEventListener('focus', revalidate);
  }
}

/* ------------------------------------------------------------------ */
/* Re-evaluate — crawl the whole project when you click it. Discovers  */
/* every HTML / JS / CSS / Python file from directory listings,        */
/* recounts lines of code (generated blobs excluded), probes each HTML */
/* page, and injects anything missing into Unaccounted so the          */
/* directory is complete for this session. A live modal walks through  */
/* every directory, file, and page as it happens. Hard reload uses the */
/* same panel to list every cache-busted script and stylesheet.        */
/* ------------------------------------------------------------------ */

const OMITTED_PAGES = {
  'app-vision-deck.html': 'Standalone pitch deck — kept out of the module index on purpose.',
  'page-gallery.html': 'Full-screen page gallery launched from the Module Directory — not a product module.',
};

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

function catalogPageSet() {
  const set = new Set();
  MODULE_SECTIONS.forEach((s) => s.modules.forEach((m) => {
    const key = canonicalPageHref(m.href);
    if (key) set.add(key);
  }));
  return set;
}

function catalogHrefList() {
  const seen = new Set();
  const out = [];
  MODULE_SECTIONS.forEach((s) => s.modules.forEach((m) => {
    const key = canonicalPageHref(m.href);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(pagePathOnly(m.href));
  }));
  return out;
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
    const res = await fetch(url + sep + 'mi=' + Date.now(), { cache: 'no-store', signal: ctrl.signal });
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

function listingEntries(html) {
  const out = [];
  const re = /href=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    let raw = m[1].trim();
    if (!raw || raw.startsWith('?') || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('javascript:')) continue;
    try { raw = decodeURIComponent(raw); } catch (_) { /* keep raw */ }
    out.push(raw);
  }
  return out;
}

function repoRootUrl() {
  return new URL('../', location.href);
}

function urlUnderRepo(abs) {
  const root = repoRootUrl();
  if (abs.origin !== root.origin) return false;
  const rootPath = root.pathname.endsWith('/') ? root.pathname : root.pathname + '/';
  return abs.pathname === rootPath.slice(0, -1) || abs.pathname.startsWith(rootPath);
}

function projectRelFromUrl(abs) {
  const root = repoRootUrl();
  const rootPath = root.pathname.endsWith('/') ? root.pathname : root.pathname + '/';
  let path = abs.pathname;
  if (path.startsWith(rootPath)) path = path.slice(rootPath.length);
  else if (path.startsWith('/')) path = path.slice(1);
  try { return decodeURIComponent(path); } catch (_) { return path; }
}

function pageHrefFromRel(rel) {
  const norm = String(rel || '').replace(/^\/+/, '');
  if (norm.startsWith('pages/')) return norm.slice(6);
  return '../' + norm;
}

function countFileLines(text) {
  if (!text) return 0;
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) n++;
  }
  if (text.charCodeAt(text.length - 1) !== 10) n++;
  return n;
}

function pushProjectFile(files, seenFile, abs, name, ext, rel, extra) {
  if (seenFile.has(rel)) return;
  seenFile.add(rel);
  files.push(Object.assign({
    url: abs.href,
    name,
    ext,
    rel,
    kind: kindFromExt(ext),
  }, extra || {}));
}

function seedFromInventory(files, seenFile, scan) {
  const inv = projectInventory();
  const list = inv && Array.isArray(inv.list) ? inv.list : [];
  if (!list.length) {
    scan?.log({
      state: 'skip',
      name: 'Project inventory',
      detail: 'No baked file list — falling back to directory listings only',
    });
    return 0;
  }
  const root = repoRootUrl();
  for (const item of list) {
    const rel = String(item.path || '');
    const name = rel.split('/').pop() || '';
    if (!name) continue;
    const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
    let abs;
    try { abs = new URL(rel, root); } catch (_) { continue; }
    pushProjectFile(files, seenFile, abs, name, ext, rel, {
      kind: item.kind || kindFromExt(ext),
      bakedBytes: item.bytes || 0,
    });
  }
  scan?.log({
    state: 'ok',
    name: 'Project inventory',
    detail: list.length + ' files · ' + fmtScanBytes(inv.bytes) + ' — every shippable file, not just HTML, JavaScript, CSS and Python',
  });
  return list.length;
}

function scanProjectBytes(files) {
  const kinds = { code: 0, image: 0, video: 0, font: 0, other: 0 };
  let bytes = 0;
  let allFiles = 0;
  for (const f of files) {
    const n = Number(f.bakedBytes) || 0;
    const kind = f.kind || kindFromExt(f.ext);
    bytes += n;
    kinds[kind] = (kinds[kind] || 0) + n;
    allFiles += 1;
  }
  return {
    bytes,
    allFiles,
    codeBytes: kinds.code,
    imageBytes: kinds.image,
    videoBytes: kinds.video,
    otherBytes: (kinds.other || 0) + (kinds.font || 0),
  };
}

function extLabel(ext) {
  return ({ html: 'HTML', js: 'JavaScript', css: 'CSS', py: 'Python' })[ext] || String(ext || '').toUpperCase();
}

function fmtScanBytes(n) {
  const x = Number(n) || 0;
  if (x < 1024) return x + ' B';
  if (x < 1024 * 1024) return (x / 1024).toFixed(x < 10 * 1024 ? 1 : 0) + ' KB';
  return (x / (1024 * 1024)).toFixed(1) + ' MB';
}

function displayPath(href) {
  try {
    const abs = new URL(href, location.href);
    if (urlUnderRepo(abs)) {
      const rel = projectRelFromUrl(abs);
      return rel || abs.pathname.replace(/^\//, '') || abs.href;
    }
    return abs.host + abs.pathname + (abs.search.length > 48 ? abs.search.slice(0, 44) + '…' : abs.search);
  } catch (_) {
    return String(href || '');
  }
}

function dirDisplayPath(dirUrl) {
  try {
    const abs = new URL(dirUrl);
    const rel = projectRelFromUrl(abs);
    if (!rel) return '(repo root)';
    return rel.endsWith('/') ? rel : rel + '/';
  } catch (_) {
    return String(dirUrl || '');
  }
}

let scanModalEl = null;
let scanBusy = false;

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
    eyebrow = 'All Modules',
    title = 'Working',
    icon = 'autorenew',
    sub = 'Starting…',
    locked = false,
  } = opts || {};
  closeScanModal();

  const scrim = document.createElement('div');
  scrim.className = 'mi-scan-scrim';
  scrim._prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  scrim.innerHTML = `
    <div class="mi-scan-card" role="dialog" aria-modal="true" aria-labelledby="mi-scan-title">
      <div class="mi-scan-head">
        <span class="material-symbols-outlined" aria-hidden="true">${esc(icon)}</span>
        <div class="mi-scan-titles">
          <div class="mi-scan-eyebrow">${esc(eyebrow)}</div>
          <h2 class="mi-scan-title" id="mi-scan-title">${esc(title)}</h2>
          <p class="mi-scan-sub" data-scan-sub>${esc(sub)}</p>
          <p class="mi-scan-now" data-scan-now></p>
        </div>
        <button type="button" class="mi-scan-close" data-scan-close aria-label="Close" hidden>
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="mi-scan-score">
        <span class="mi-scan-pct no-countup" data-scan-pct data-no-countup>0%</span>
        <span class="mi-scan-frac" data-scan-frac>Starting</span>
      </div>
      <div class="mi-scan-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-scan-bar>
        <span class="mi-scan-fill" data-scan-fill></span>
      </div>
      <ul class="mi-scan-log" data-scan-log role="log" aria-live="polite" aria-relevant="additions"></ul>
      <div class="mi-scan-foot">
        <span class="mi-scan-note" data-scan-note>Keep this tab open while it runs.</span>
        <button type="button" class="adm-btn adm-btn--primary" data-scan-done disabled>
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

  const canClose = () => finished && !locked;

  const close = () => {
    if (!canClose()) return;
    closeScanModal();
  };

  const onKey = (e) => {
    if (e.key !== 'Escape') return;
    if (!canClose()) { e.preventDefault(); return; }
    e.preventDefault();
    close();
  };
  scrim._onKey = onKey;
  document.addEventListener('keydown', onKey);
  closeBtn.addEventListener('click', close);
  scrim.addEventListener('click', (e) => { if (e.target === scrim && canClose()) close(); });
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
    setSub(text) {
      if (subEl) subEl.textContent = text || '';
    },
    setNote(text) {
      if (noteEl) noteEl.textContent = text || '';
    },
    phase(title, detail) {
      if (!list) return;
      list.insertAdjacentHTML('beforeend',
        `<li class="mi-scan-phase">${esc(title)}${detail ? `<span>${esc(detail)}</span>` : ''}</li>`);
      list.lastElementChild.scrollIntoView({ block: 'nearest' });
      if (subEl) subEl.textContent = detail || title;
    },
    log(entry) {
      if (!list) return;
      const state = (entry && entry.state) || 'info';
      const name = (entry && entry.name) || '';
      const detail = (entry && entry.detail) || '';
      if (state !== 'run' && name) {
        const prev = Array.from(list.querySelectorAll('.mi-scan-row[data-state="run"]'))
          .find((r) => (r.querySelector('.mi-scan-row-name') || {}).textContent === name);
        if (prev) {
          prev.dataset.state = state;
          const ic = prev.querySelector('.material-symbols-outlined');
          if (ic) ic.textContent = rowIcon[state] || 'info';
          const detailEl = prev.querySelector('.mi-scan-row-detail');
          if (detailEl) detailEl.textContent = detail;
          else if (detail) {
            const span = document.createElement('span');
            span.className = 'mi-scan-row-detail';
            span.textContent = detail;
            (prev.querySelector('.mi-scan-row-main') || prev).appendChild(span);
          }
          prev.scrollIntoView({ block: 'nearest' });
          if (nowEl) nowEl.textContent = name;
          return;
        }
      }
      logCount += 1;
      list.insertAdjacentHTML('beforeend', `
        <li class="mi-scan-row" data-state="${esc(state)}">
          <span class="material-symbols-outlined">${rowIcon[state] || 'info'}</span>
          <span class="mi-scan-row-main">
            <span class="mi-scan-row-name">${esc(name)}</span>
            ${detail ? `<span class="mi-scan-row-detail">${esc(detail)}</span>` : ''}
          </span>
        </li>`);
      list.lastElementChild.scrollIntoView({ block: 'nearest' });
      if (nowEl && (state === 'run' || state === 'ok')) nowEl.textContent = name;
      if (noteEl && !finished) noteEl.textContent = logCount + (logCount === 1 ? ' event' : ' events');
    },
    finish(kind, title, note) {
      finished = true;
      api.setProgress(100, title || 'Done');
      if (subEl && title) subEl.textContent = title;
      if (noteEl && note) noteEl.textContent = note;
      if (doneBtn) {
        doneBtn.disabled = false;
        const ic = doneBtn.querySelector('.material-symbols-outlined');
        if (ic) ic.textContent = kind === 'err' ? 'error' : (kind === 'warn' ? 'warning' : 'check');
        if (doneLabel) doneLabel.textContent = locked ? 'Reloading…' : 'Done';
        if (locked) doneBtn.disabled = true;
      }
      if (closeBtn && !locked) closeBtn.hidden = false;
      if (nowEl && !locked) nowEl.textContent = '';
    },
    close,
  };
  return api;
}

async function discoverRootCodeFiles(files, seenFile, scan, signal) {
  /* `/` serves index.html, so the root never returns a directory listing.
     Probe catalog / omitted root pages plus the handful of root-level code
     files the Python scanner counts. */
  const root = repoRootUrl();
  const names = new Set(['index.html', 'dev_server.py', 'marketing.css', 'wiseai-chat.css', '_inject_countup.js']);
  catalogHrefList().forEach((h) => {
    const key = canonicalPageHref(h);
    if (key.startsWith('../')) names.add(key.slice(3));
  });
  scan?.log({
    state: 'info',
    name: '(repo root)',
    detail: 'Not a directory listing — probing ' + names.size + ' known root files (index, marketing CSS, catalog root pages, tooling).',
  });
  await mapPool(Array.from(names), REEVAL_CONCURRENCY, async (name) => {
    if (signal && signal.aborted) return;
    if (!name || name.includes('/')) return;
    const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
    if (!CODE_EXTS.has(ext) || CODE_SKIP_FILES.has(name) || name.startsWith('.')) {
      scan?.log({
        state: 'skip',
        name,
        detail: CODE_SKIP_FILES.has(name) ? 'Generated data blob — excluded from line counts' : 'Not a counted code file',
      });
      return;
    }
    const abs = new URL(name, root);
    scan?.log({ state: 'run', name, detail: 'Probing repo root' });
    try {
      const res = await fetch(abs.href + (abs.href.includes('?') ? '&' : '?') + 'mi=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) {
        scan?.log({ state: 'skip', name, detail: 'HTTP ' + res.status + ' — not at repo root' });
        return;
      }
      pushProjectFile(files, seenFile, abs, name, ext, name);
      scan?.log({ state: 'ok', name, detail: extLabel(ext) + ' · queued for a line count' });
    } catch (_) {
      scan?.log({ state: 'skip', name, detail: 'Not reachable at repo root' });
    }
  }, signal);
}

async function discoverProjectFiles(signal, scan) {
  const files = [];
  const seenDir = new Set();
  const seenFile = new Set();
  const root = repoRootUrl();
  /* Seed the dirs that actually list (repo root serves index.html). Also
     try the root in case a server is configured to list it. */
  const queue = [
    new URL('js/', root).href,
    new URL('pages/', root).href,
    new URL('scripts/', root).href,
    new URL('assets/', root).href,
    new URL('server/', root).href,
    root.href,
  ];
  seedFromInventory(files, seenFile, scan);
  scan?.log({
    state: 'info',
    name: 'Seed folders',
    detail: 'js/, pages/, scripts/, assets/, server/, and the repo root. Hidden folders, node_modules, screenshots, and scratch are skipped.',
  });

  let dirsListed = 0;
  while (queue.length) {
    if (signal && signal.aborted) {
      scan?.log({ state: 'err', name: 'Directory walk', detail: 'Stopped — time budget ran out' });
      break;
    }
    const dirUrl = queue.shift();
    let dirKey;
    try { dirKey = new URL(dirUrl).pathname; } catch (_) { continue; }
    if (seenDir.has(dirKey)) continue;
    seenDir.add(dirKey);
    const label = dirDisplayPath(dirUrl);
    scan?.log({ state: 'run', name: label, detail: 'Reading directory listing' });

    let html;
    try { html = await fetchText(dirUrl, signal); } catch (_) {
      scan?.log({ state: 'err', name: label, detail: 'Could not fetch this listing' });
      continue;
    }
    if (!isDirListing(html)) {
      scan?.log({
        state: 'skip',
        name: label,
        detail: label === '(repo root)'
          ? 'Server returned the homepage instead of a listing — root files are probed by name next'
          : 'Not a directory listing (the server returned a page)',
      });
      continue;
    }

    let kept = 0, queued = 0, skippedDir = 0, skippedFile = 0, ignored = 0;
    for (const raw of listingEntries(html)) {
      let abs;
      try { abs = new URL(raw, dirUrl); } catch (_) { continue; }
      if (!urlUnderRepo(abs)) continue;

      const isDir = raw.endsWith('/') || abs.pathname.endsWith('/');
      const name = abs.pathname.split('/').filter(Boolean).pop() || '';
      if (!name || name.startsWith('.')) { ignored += 1; continue; }
      if (CODE_SKIP_DIRS.has(name)) {
        skippedDir += 1;
        scan?.log({ state: 'skip', name: (label === '(repo root)' ? '' : label) + name + '/', detail: 'Excluded folder' });
        continue;
      }

      if (isDir) {
        const next = abs.href.endsWith('/') ? abs.href : abs.href + '/';
        let nextKey;
        try { nextKey = new URL(next).pathname; } catch (_) { continue; }
        if (!seenDir.has(nextKey)) {
          queue.push(next);
          queued += 1;
        }
        continue;
      }

      const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
      const rel = projectRelFromUrl(abs);
      const before = files.length;
      pushProjectFile(files, seenFile, abs, name, ext, rel, { kind: kindFromExt(ext) });
      if (files.length > before) {
        kept += 1;
        const kind = kindFromExt(ext);
        scan?.log({
          state: 'ok',
          name: rel,
          detail: CODE_SKIP_FILES.has(name)
            ? 'Generated blob — counted in project size, excluded from line counts'
            : (CODE_EXTS.has(ext) ? extLabel(ext) + ' · queued for a line count' : kind + ' · counted in project size'),
        });
      } else {
        ignored += 1;
      }
    }
    dirsListed += 1;
    scan?.log({
      state: 'ok',
      name: label,
      detail: 'Listed — ' + kept + ' code file' + (kept === 1 ? '' : 's')
        + ', ' + queued + ' folder' + (queued === 1 ? '' : 's') + ' queued'
        + (skippedDir ? ', ' + skippedDir + ' excluded folder' + (skippedDir === 1 ? '' : 's') : '')
        + (skippedFile ? ', ' + skippedFile + ' generated blob' + (skippedFile === 1 ? '' : 's') : '')
        + (ignored ? ', ' + ignored + ' other file' + (ignored === 1 ? '' : 's') + ' ignored' : ''),
    });
    scan?.setProgress(Math.min(18, 4 + dirsListed), dirsListed + ' folder' + (dirsListed === 1 ? '' : 's') + ' listed');
  }
  await discoverRootCodeFiles(files, seenFile, scan, signal);
  scan?.log({
    state: 'ok',
    name: 'Project walk',
    detail: files.length + ' file' + (files.length === 1 ? '' : 's') + ' in the working tree (code, images, video, and the rest)',
  });
  return files;
}

async function scanProjectLineCounts(files, signal, scan, htmlCache) {
  const lines = { html: 0, js: 0, css: 0, py: 0 };
  const counts = { html: 0, js: 0, css: 0, py: 0 };
  const totalFiles = files.length || 1;
  let done = 0;
  await mapPool(files, REEVAL_CONCURRENCY, async (f) => {
    if (signal && signal.aborted) return;
    const cacheKey = f.ext === 'html' ? canonicalPageHref(pageHrefFromRel(f.rel)) : '';
    const cached = (cacheKey && htmlCache) ? htmlCache.get(cacheKey) : null;
    scan?.log({
      state: 'run',
      name: f.rel,
      detail: cached != null
        ? 'Counting HTML lines from the page probe'
        : ('Counting ' + extLabel(f.ext) + ' lines (cache-busted fetch)'),
    });
    try {
      const text = cached != null ? cached : await fetchText(f.url, signal);
      const n = countFileLines(text);
      lines[f.ext] += n;
      counts[f.ext] += 1;
      scan?.log({
        state: 'ok',
        name: f.rel,
        detail: fmtNum(n) + ' line' + (n === 1 ? '' : 's') + ' · ' + extLabel(f.ext) + ' · ' + fmtScanBytes(text.length)
          + (cached != null ? ' · reused' : ''),
      });
    } catch (err) {
      if (isAbortError(err, signal)) {
        scan?.log({ state: 'skip', name: f.rel, detail: 'Not reached — scan stopped' });
        return;
      }
      scan?.log({ state: 'err', name: f.rel, detail: 'Unreachable — not counted' });
    }
    done += 1;
    scan?.setProgress(70 + Math.round((done / totalFiles) * 22), done + ' of ' + files.length + ' files counted');
  }, signal);
  return {
    total: lines.html + lines.js + lines.css + lines.py,
    html: lines.html,
    js: lines.js,
    css: lines.css,
    py: lines.py,
    pages: counts.html,
    files: counts.html + counts.js + counts.css + counts.py,
  };
}

async function discoverHtmlPages(extraHrefs, signal, scan) {
  const found = new Set();
  const catalogN = catalogHrefList().length;
  catalogHrefList().forEach((h) => found.add(canonicalPageHref(h)));
  Object.keys(OMITTED_PAGES).forEach((h) => found.add(canonicalPageHref(h)));
  (extraHrefs || []).forEach((h) => {
    const key = canonicalPageHref(h);
    if (key) found.add(key);
  });
  scan?.log({
    state: 'info',
    name: 'HTML set',
    detail: catalogN + ' catalog pages + ' + Object.keys(OMITTED_PAGES).length + ' intentionally omitted + ' + (extraHrefs || []).length + ' from the file walk',
  });

  const tryList = async (url, kind) => {
    const label = kind === 'pages' ? 'pages/' : '(repo root)';
    scan?.log({ state: 'run', name: label, detail: 'Looking for extra HTML in the directory listing' });
    try {
      const html = await fetchText(url, signal);
      if (!isDirListing(html)) {
        scan?.log({ state: 'skip', name: label, detail: 'No directory listing — using the catalog and the file walk' });
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
  const pages = Array.from(found).filter(Boolean).sort();
  scan?.log({
    state: 'ok',
    name: 'HTML pages to probe',
    detail: pages.length + ' unique page' + (pages.length === 1 ? '' : 's'),
  });
  return pages;
}

async function probePage(href, signal) {
  try {
    const text = await fetchText(href, signal);
    return { href, ok: true, title: titleFromHtml(text, labelFromPath(href)), size: text.length, text };
  } catch (err) {
    if (isAbortError(err, signal)) return { href, ok: false, skipped: true };
    return { href, ok: false };
  }
}

function ensureUnaccountedSection() {
  let sec = MODULE_SECTIONS.find((s) => s.tone === 'unaccounted');
  if (!sec) {
    sec = { title: 'Unaccounted', tone: 'unaccounted', modules: [] };
    MODULE_SECTIONS.push(sec);
  }
  return sec;
}

function refreshDirectoryCounts(root) {
  const total = moduleTotal();
  const allNum = root.querySelector('#mi-dir-stats [data-area="all"] .mi-stat-num');
  if (allNum) allNum.textContent = String(total);
  const jump = root.querySelector('.dsc-jump-tile[data-jump="mi-directory"] .dsc-jump-num');
  if (jump) jump.textContent = String(total);
  MODULE_SECTIONS.forEach((s) => {
    const n = s.modules.length;
    const count = root.querySelector(`.mi-dir-section[data-area="${s.tone}"] .mi-dir-count`);
    if (count) count.textContent = String(n);
    const stat = root.querySelector(`#mi-dir-stats [data-area="${s.tone}"] .mi-stat-num`);
    if (stat) stat.textContent = String(n);
  });
}

function injectUnaccounted(root, mod) {
  const secData = ensureUnaccountedSection();
  if (secData.modules.some((m) => canonicalPageHref(m.href) === canonicalPageHref(mod.href))) return;
  secData.modules.push(mod);
  COMPS_BY_MODULE_HREF = null;

  const sectionsRoot = root.querySelector('#mi-dir-sections');
  const stats = root.querySelector('#mi-dir-stats');
  const railTrack = root.querySelector('#mi-rail-track');
  if (!sectionsRoot) return;

  let secEl = sectionsRoot.querySelector('.mi-dir-section[data-area="unaccounted"]');
  if (!secEl) {
    sectionsRoot.insertAdjacentHTML('afterbegin', directorySection(secData));
    if (stats && !stats.querySelector('[data-area="unaccounted"]')) {
      const wrap = document.createElement('div');
      wrap.innerHTML = `<button type="button" class="mi-stat" data-area="unaccounted" aria-pressed="false">
        <span class="mi-stat-num">${secData.modules.length}</span>
        <span class="mi-stat-label"><span class="mi-stat-text">Unaccounted</span><span class="material-symbols-outlined">playlist_add</span></span>
      </button>`;
      const allBtn = stats.querySelector('[data-area="all"]');
      const btn = wrap.firstElementChild;
      if (allBtn && allBtn.nextSibling) stats.insertBefore(btn, allBtn.nextSibling);
      else if (allBtn) allBtn.insertAdjacentElement('afterend', btn);
      else stats.appendChild(btn);
    }
  } else {
    const grid = secEl.querySelector('.mi-card-grid');
    if (grid) grid.insertAdjacentHTML('beforeend', moduleCard(mod));
  }

  if (railTrack) {
    railTrack.insertAdjacentHTML('beforeend', paneCard({ ...mod, area: 'unaccounted', areaTitle: 'Unaccounted' }));
    observePreviewFrames(railTrack.lastElementChild);
  }

  refreshDirectoryCounts(root);
}

function setReevalStatus(root, kind, title, bodyHtml) {
  const el = root.querySelector('#mi-reeval-status');
  if (!el) return;
  const icons = { busy: 'hourglass_top', ok: 'verified', warn: 'warning', err: 'error' };
  el.hidden = false;
  el.className = 'mi-reeval-status is-' + kind;
  el.innerHTML = `<div class="mi-reeval-status-head"><span class="material-symbols-outlined">${icons[kind] || 'info'}</span><span>${esc(title)}</span></div>${bodyHtml || ''}`;
}

function reevalMetaText() {
  const store = readReevalStore();
  const off = 'Live reload off';
  if (!store.day) return off + ' · click to scan';
  if (store.day === localDayIso()) return off + ' · scanned today';
  return off + ' · last scanned ' + store.day;
}

function paintReevalMeta(root) {
  const el = root.querySelector('[data-mi-reeval-meta]');
  if (el) el.textContent = reevalMetaText();
}

async function reevaluateProject(root, opts) {
  if (scanBusy) return;
  const reason = (opts && opts.reason) || 'manual';
  const btn = root.querySelector('[data-mi-reeval]');
  const label = root.querySelector('[data-mi-reeval-label]');
  const scan = openScanModal({
    eyebrow: 'Re-evaluate',
    title: 'Re-evaluating the project',
    icon: 'autorenew',
    sub: 'Counting every shippable file, then probing each HTML page and recounting lines of code.',
  });
  scan.log({
    state: 'info',
    name: 'How this scan works',
    detail: 'Starts from the baked project inventory so images and video are counted even when the server will not list folders. Then reads six files at a time. Each HTML page is fetched once and reused for the line count. Generated blobs stay out of line counts but stay in the project size. Skips git, node_modules, screenshots, and scratch. Gives the scan ' + reevalBudgetLabel() + '. Does not run on load — only when you click.',
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
  setReevalStatus(root, 'busy', 'Re-evaluating the whole project',
    '<p>Probing every HTML page, then counting lines in the working tree…</p>');

  const ac = new AbortController();
  const budget = setTimeout(() => ac.abort(), REEVAL_BUDGET_MS);
  try {
    scan.phase('Discover project files', 'Inventory of every shippable file, then listings for anything new.');
    scan.setProgress(2, 'Walking directories');
    try { await ensureProjectInventory(); } catch (_) { /* seedFromInventory falls back to listings */ }
    const files = await discoverProjectFiles(ac.signal, scan);

    scan.phase('Discover HTML pages', 'Catalog, omitted pages, and anything the file walk found.');
    scan.setProgress(20, 'Collecting HTML pages');
    const htmlFromWalk = files.filter((f) => f.ext === 'html').map((f) => pageHrefFromRel(f.rel));
    scan.log({
      state: 'info',
      name: 'HTML from the file walk',
      detail: htmlFromWalk.length + ' HTML file' + (htmlFromWalk.length === 1 ? '' : 's') + ' already queued from directory listings',
    });
    const pages = await discoverHtmlPages(htmlFromWalk, ac.signal, scan);

    scan.phase('Probe every HTML page', 'Cache-busted GET of each page. Classifies catalog, omitted, unaccounted, and unreachable.');
    scan.setProgress(22, '0 of ' + pages.length + ' pages probed');
    let probed = 0;
    const raw = await mapPool(pages, REEVAL_CONCURRENCY, async (href) => {
      if (ac.signal.aborted) return { href, ok: false, skipped: true };
      const name = displayPath(href) || href;
      scan.log({ state: 'run', name, detail: 'Fetching HTML (cache-busted)' });
      const r = await probePage(href, ac.signal);
      probed += 1;
      scan.setProgress(22 + Math.round((probed / Math.max(pages.length, 1)) * 48), probed + ' of ' + pages.length + ' pages probed');
      if (r.skipped) {
        scan.log({ state: 'skip', name, detail: 'Not reached — scan stopped' });
      } else if (r.ok) {
        scan.log({
          state: 'ok',
          name,
          detail: (r.title || labelFromPath(href)) + ' · reachable · ' + fmtScanBytes(r.size),
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

    const htmlCache = new Map();
    results.forEach((r) => {
      if (r && r.ok && r.text) {
        htmlCache.set(canonicalPageHref(r.href), r.text);
        r.text = '';
      }
    });

    let codeNow = null;
    if (files.length && (!ac.signal.aborted || htmlCache.size)) {
      const codeFiles = files.filter((f) => CODE_EXTS.has(f.ext) && !CODE_SKIP_FILES.has(f.name));
      scan.phase('Count lines of code', 'Reuses probed HTML. Fetches JavaScript, CSS and Python fresh. Generated blobs stay out of line counts.');
      scan.setProgress(70, '0 of ' + codeFiles.length + ' code files counted');
      codeNow = await scanProjectLineCounts(codeFiles, ac.signal, scan, htmlCache);
      const byteNow = scanProjectBytes(files);
      if (codeNow) Object.assign(codeNow, byteNow);
      else codeNow = Object.assign({ total: 0, html: 0, js: 0, css: 0, py: 0, pages: 0, files: 0 }, byteNow);
      if (codeNow && codeNow.files) {
        scan.log({
          state: 'ok',
          name: 'Line totals',
          detail: fmtNum(codeNow.total) + ' lines across ' + fmtNum(codeNow.files) + ' code files — HTML ' + fmtNum(codeNow.html) + ', JavaScript ' + fmtNum(codeNow.js) + ', CSS ' + fmtNum(codeNow.css) + ', Python ' + fmtNum(codeNow.py),
        });
      }
      scan.log({
        state: 'ok',
        name: 'Project size',
        detail: fmtScanBytes(byteNow.bytes) + ' across ' + fmtNum(byteNow.allFiles) + ' files — code ' + fmtScanBytes(byteNow.codeBytes) + ', images ' + fmtScanBytes(byteNow.imageBytes) + ', video ' + fmtScanBytes(byteNow.videoBytes),
      });
    }

    const reached = results.filter((r) => !r.skipped);
    if (!reached.length && ac.signal.aborted) {
      throw new DOMException('Timed out', 'AbortError');
    }

    scan.phase('Apply results', 'Update Unaccounted, Codebase scorecards, and today’s scan stamp.');
    scan.setProgress(93, 'Classifying pages');
    const catalog = catalogPageSet();
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
        + ' · ' + omitted.length + ' omitted on purpose · ' + unaccounted.length + ' unaccounted · ' + catalogMissing.length + ' catalog entries missing',
    });
    omitted.forEach((r) => {
      const key = canonicalPageHref(r.href);
      scan.log({ state: 'skip', name: key, detail: 'Intentionally omitted — ' + (OMITTED_PAGES[key] || 'kept out of the directory') });
    });
    catalogMissing.forEach((r) => {
      scan.log({ state: 'err', name: displayPath(r.href) || r.href, detail: 'In the module directory but the page did not resolve' });
    });
    omittedMissing.forEach((r) => {
      scan.log({ state: 'err', name: displayPath(r.href) || r.href, detail: 'Omitted page is now unreachable' });
    });

    unaccounted.forEach((r) => {
      injectUnaccounted(root, {
        label: r.title || labelFromPath(r.href),
        icon: 'web',
        href: r.href,
        badge: 'New',
      });
      scan.log({
        state: 'ok',
        name: displayPath(r.href) || r.href,
        detail: 'Added to Unaccounted as “' + (r.title || labelFromPath(r.href)) + '”',
      });
    });

    if (unaccounted.length || catalogMissing.length) {
      expandAccordionSection(root, 'mi-directory');
      scan.log({ state: 'info', name: 'Module Directory', detail: 'Opened the directory accordion and re-checking card links' });
      runLinkValidation(root);
    } else {
      scan.log({ state: 'ok', name: 'Module Directory', detail: 'Every reachable HTML page is already in the catalog or omitted on purpose' });
    }

    const day = localDayIso();
    const codeComplete = codeScanLooksComplete(codeNow);
    if (codeComplete) {
      applyLiveCodeScan(root, codeNow, day);
      scan.log({
        state: 'ok',
        name: 'Codebase scorecards',
        detail: 'Live counts replaced the last snapshot — ' + fmtNum(codeNow.total) + ' lines · ' + fmtScanBytes(codeNow.bytes) + ' across ' + fmtNum(codeNow.allFiles || codeNow.files) + ' files, scanned ' + day,
      });
    } else if (codeNow && codeNow.files) {
      const bakedNow = (CODE_STATS && CODE_STATS.now) || {};
      scan.log({
        state: 'skip',
        name: 'Codebase scorecards',
        detail: 'Only ' + fmtNum(codeNow.files) + ' files were reachable — short of the full project — so the last complete scan stays (' + fmtNum(bakedNow.total) + ' lines across ' + fmtNum(bakedNow.files) + ' files). Serve the repo with directory listings enabled.',
      });
    } else {
      scan.log({
        state: 'skip',
        name: 'Codebase scorecards',
        detail: 'Directory listing was not available, so Codebase kept the last generated scan.',
      });
    }

    writeReevalStore({
      day,
      at: new Date().toISOString(),
      reason,
      files: files.length,
      pages: pages.length,
      now: codeComplete ? codeNow : readReevalStore().now,
    });
    paintReevalMeta(root);
    scan.log({
      state: 'ok',
      name: 'Scan stamp',
      detail: 'Saved for ' + day + ' · reason: ' + reason + ' · ' + files.length + ' files walked · ' + pages.length + ' HTML pages probed',
    });

    const accounted = live.length - omitted.length;
    const gaps = unaccounted.length + catalogMissing.length + omittedMissing.length;
    const kind = (catalogMissing.length || omittedMissing.length)
      ? 'err'
      : ((unaccounted.length || skippedN) ? 'warn' : 'ok');
    const title = skippedN && !gaps
      ? `Reached ${live.length} of ${pages.length} pages`
      : !gaps
        ? `All ${accounted} HTML pages are accounted for`
        : (unaccounted.length && !catalogMissing.length
          ? `Accounted for ${unaccounted.length} missing page${unaccounted.length === 1 ? '' : 's'}`
          : `${gaps} page${gaps === 1 ? '' : 's'} need attention`);

    const bits = [];
    if (codeComplete) {
      bits.push(`<p>Project size <strong>${fmtScanBytes(codeNow.bytes)}</strong> across <strong>${fmtNum(codeNow.allFiles)}</strong> files (code ${fmtScanBytes(codeNow.codeBytes)}, images ${fmtScanBytes(codeNow.imageBytes)}, video ${fmtScanBytes(codeNow.videoBytes)}). <strong>${fmtNum(codeNow.files)}</strong> code files · <strong>${fmtNum(codeNow.total)}</strong> lines (HTML ${fmtNum(codeNow.html)}, JS ${fmtNum(codeNow.js)}, CSS ${fmtNum(codeNow.css)}, Python ${fmtNum(codeNow.py)}).</p>`);
    } else if (codeNow && codeNow.files) {
      const bakedNow = (CODE_STATS && CODE_STATS.now) || {};
      bits.push(`<p>Only <strong>${fmtNum(codeNow.files)}</strong> code files were reachable via directory listing — well short of the full project — so Codebase kept the last complete scan (<strong>${fmtNum(bakedNow.total)}</strong> lines across <strong>${fmtNum(bakedNow.files)}</strong> files). Serve the repo root with directory listings enabled (e.g. <code>python3 -m http.server</code>, not a live-reload wrapper) to recount lines live.</p>`);
    } else {
      bits.push('<p>Directory listing was not available, so Codebase kept the last generated scan. Serve the repo root (not a live-reload wrapper) to recount lines live.</p>');
    }
    bits.push(`<p>Probed <strong>${reached.length}</strong> of <strong>${pages.length}</strong> HTML files · <strong>${live.length}</strong> reachable · directory now holds <strong>${moduleTotal()}</strong> modules.</p>`);
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
    scan.finish(kind, title, 'Directory now holds ' + moduleTotal() + ' modules. The summary also stays on the page behind this panel.');
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
        ? 'Stopped after ' + reevalBudgetLabel() + ' before any page could be reached. The directory and Codebase cards still show the last complete pass.'
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
        ? '<p>The scan was taking too long (usually a busy local server). The directory and codebase cards above are still the last complete pass. Click Re-evaluate again when the page is idle, or serve the repo with directory listings enabled.</p>'
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

function collectHardReloadPlan() {
  const seen = new Set();
  const urls = [];
  const skipped = [];
  const consider = (raw, source) => {
    if (!raw) return;
    let href;
    try { href = new URL(raw, location.href).href.split('#')[0]; }
    catch { return; }
    if (!href || seen.has(href)) return;
    seen.add(href);
    if (/^(data:|blob:)/i.test(href)) {
      skipped.push({ href, source, reason: 'Embedded data or blob URL — nothing to refetch' });
      return;
    }
    if (/^(chrome-extension:|safari-extension:)/i.test(href)) {
      skipped.push({ href, source, reason: 'Browser extension asset' });
      return;
    }
    if (/livereload|\/sockjs\//i.test(href)) {
      skipped.push({ href, source, reason: 'Live-reload socket — All Modules blocks this on purpose' });
      return;
    }
    if (/[?&]preview=1(?:&|$)/.test(href)) {
      skipped.push({ href, source, reason: 'Rail preview iframe — not part of this page’s own load' });
      return;
    }
    if (href.indexOf(location.origin) !== 0) {
      skipped.push({ href, source, reason: 'Different origin — left cached' });
      return;
    }
    urls.push({ href, source });
  };
  consider(location.href, 'This page');
  document.querySelectorAll('script[src]').forEach((el) => consider(el.src, 'Script'));
  document.querySelectorAll('link[rel="stylesheet"][href]').forEach((el) => consider(el.href, 'Stylesheet'));
  document.querySelectorAll('link[rel="modulepreload"][href]').forEach((el) => consider(el.href, 'Module preload'));
  try {
    performance.getEntriesByType('resource').forEach((e) => {
      const kind = String(e.initiatorType || '');
      if (kind !== 'script' && kind !== 'link' && kind !== 'css') return;
      consider(e.name, 'Already loaded (' + kind + ')');
    });
  } catch (_) { /* performance timeline unavailable */ }
  return { urls, skipped };
}

async function hardReloadAllModules(root) {
  if (scanBusy) return;
  const btn = root.querySelector('[data-mi-hard-reload]');
  const label = root.querySelector('[data-mi-hard-label]');
  scanBusy = true;
  if (btn) {
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
  }
  if (label) label.textContent = 'Reloading…';

  const scan = openScanModal({
    eyebrow: 'Hard reload',
    title: 'Bypassing the cache',
    icon: 'restart_alt',
    sub: 'Refetching this page and every script and stylesheet it loaded, then navigating to a fresh copy.',
    locked: true,
  });
  scan.log({
    state: 'info',
    name: 'How hard reload works',
    detail: 'Live reload is off on All Modules, so file saves do not remount it. This collects same-origin scripts, stylesheets, and module preloads, fetches each with cache:reload, then replaces the URL with a cache-bust query so the next paint is from disk.',
  });
  scan.setProgress(4, 'Collecting loaded files');

  const url = new URL(location.href);
  url.searchParams.set('hard', String(Date.now()));
  const nextHref = url.pathname + url.search + url.hash;

  try {
    const plan = collectHardReloadPlan();
    scan.phase('Collect loaded files', 'This page, plus every script, stylesheet, and module preload still in memory.');
    scan.log({
      state: 'ok',
      name: 'Inventory',
      detail: plan.urls.length + ' file' + (plan.urls.length === 1 ? '' : 's') + ' to refetch'
        + (plan.skipped.length ? ' · ' + plan.skipped.length + ' skipped' : ''),
    });
    plan.skipped.forEach((s) => {
      scan.log({ state: 'skip', name: displayPath(s.href) || s.href, detail: s.source + ' — ' + s.reason });
    });

    scan.phase('Refetch with cache bypass', 'cache:reload on each URL so the HTTP cache is replaced before navigation.');
    const total = Math.max(plan.urls.length, 1);
    let done = 0;
    await mapPool(plan.urls, REEVAL_CONCURRENCY, async (item) => {
      const name = displayPath(item.href) || item.href;
      scan.log({ state: 'run', name, detail: item.source + ' · fetch(cache: reload)' });
      try {
        const res = await fetch(item.href, { cache: 'reload', credentials: 'same-origin' });
        const buf = await res.arrayBuffer();
        const ctype = (res.headers.get('content-type') || '').split(';')[0].trim();
        scan.log({
          state: res.ok ? 'ok' : 'err',
          name,
          detail: item.source + ' · HTTP ' + res.status + (ctype ? ' · ' + ctype : '') + ' · ' + fmtScanBytes(buf.byteLength),
        });
      } catch (err) {
        scan.log({
          state: 'err',
          name,
          detail: item.source + ' · ' + ((err && err.message) || 'fetch failed') + ' — navigation will still cache-bust the URL',
        });
      }
      done += 1;
      scan.setProgress(8 + Math.round((done / total) * 82), done + ' of ' + plan.urls.length + ' files refetched');
    });
  } catch (_) {
    scan.log({
      state: 'err',
      name: 'Prefetch',
      detail: 'A refetch failed. Navigation still continues with a cache-bust query as the fallback.',
    });
  }

  scan.phase('Navigate', 'Replace this tab with a cache-busted URL so the browser loads a fresh copy.');
  scan.log({
    state: 'run',
    name: displayPath(nextHref) || nextHref,
    detail: 'location.replace — query includes hard=' + url.searchParams.get('hard') + ' so nothing is served from the HTTP cache',
  });
  scan.finish('ok', 'Reloading this page now', 'A fresh copy of All Modules is about to load.');
  setTimeout(() => { location.replace(nextHref); }, 1400);
}

function wireHardReload(root) {
  const btn = root.querySelector('[data-mi-hard-reload]');
  if (btn) btn.addEventListener('click', () => hardReloadAllModules(root));
  try {
    const url = new URL(location.href);
    if (url.searchParams.has('hard')) {
      url.searchParams.delete('hard');
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  } catch (_) { /* ignore */ }
}

function wirePageReeval(root) {
  const btn = root.querySelector('[data-mi-reeval]');
  if (btn) btn.addEventListener('click', () => reevaluateProject(root, { reason: 'manual' }));
  paintReevalMeta(root);
}

/* Rail previews should show ONLY the module itself — not the repeated left nav,
   top bar, or WISEcodeAI chat dock that every app screen shares. The previews are
   same-origin iframes, so on load we inject a small "embed" stylesheet that
   hides that shared chrome and lets the main module fill the pane. Wrapped in
   try/catch so a cross-origin frame just falls back to the full page. */
const RAIL_EMBED_CSS = `
  /* App shell (agent pages): drop the left nav, top bar, and shared chat dock.
     The id is doubled (#menu-panel#menu-panel) on purpose: the app hides/shows
     the rail with a stateful #menu-panel.mp-open { display: flex !important }
     rule (id + class). A bare #menu-panel !important loses that specificity
     tie, so the primary nav keeps rendering inside the preview. Doubling the id
     gives us two-id specificity that out-ranks any single-id + class rule, and
     unlike an ancestor prefix it works across every shell wrapper the app uses
     (#agent-shell-wrap, #chat-shell-wrap, …). */
  #menu-panel#menu-panel,
  #topbar-row#topbar-row,
  #wiseai-dock-panel#wiseai-dock-panel,
  #alerts-panel#alerts-panel { display: none !important; }
  #ag-toast-wrap { display: none !important; }
  #agent-shell-wrap { display: block !important; }
  /* Scoped to the agent shell on purpose: chat-shell pages (ai-chat-page, e.g.
     Product Portfolio / Comparison) lay out #modules-row as a flex row of
     docked panels — forcing display:block there collapses the whole page to a
     blank pane. Those pages keep their native layout; only the menu grid
     column is reclaimed below. */
  #agent-shell-wrap #modules-row { display: block !important; margin: 0 !important; padding: 0 !important; }
  #agent-main { width: 100% !important; max-width: none !important; margin: 0 !important; border-radius: 0 !important; }
  /* Reclaim the hidden menu's grid column. The areas must be redefined along
     with the columns: the wrap's template is "menu modules", and #modules-row
     is pinned to the named "modules" area — with only the column changed it
     would land in an implicit second column and get squeezed. */
  #chat-shell-wrap {
    grid-template-columns: 1fr !important;
    grid-template-areas: "modules" !important;
  }
  /* Chat pages that dock a module board (Product Portfolio, Comparison, …)
     flag it with report-mode. In a preview only the BOARD is the module —
     hide the chat column and side panels so the board fills the pane. Pages
     where the chat itself is the module (wiseai.html) never enter
     report-mode, so their chat keeps rendering. */
  #modules-row.report-mode > #chat-shell,
  #modules-row.report-mode > #panels-row,
  #modules-row.report-mode > #panels-row-right { display: none !important; }

  /* Marketing shell (marketing-*.html): the primary nav + persistent WISEcodeAI
     chat rail are injected by marketing-shell.js — drop them too so the preview
     shows only the unique module, and reclaim the space the fixed rail reserved. */
  .mkt-nav, [data-mkt-nav], #mkt-chat-rail, #mkt-chat-scrim, #mkt-chat-fab { display: none !important; }
  .mkt-appshell #mkt-body-module, .mkt-appshell .mkt-footer { margin-left: 0 !important; }

  html, body { overflow-x: hidden !important; }
`;

function embedRailFrame(frame) {
  try {
    const doc = frame.contentDocument;
    if (!doc) return;
    if (!doc.getElementById('mi-embed-style')) {
      const style = doc.createElement('style');
      style.id = 'mi-embed-style';
      style.textContent = RAIL_EMBED_CSS;
      (doc.head || doc.documentElement).appendChild(style);
    }
    /* Table Gallery panes carry a `data-focus` selector — once the chrome is
       stripped, isolate just that table from the rest of the page. */
    if (frame.dataset.focus) tryFocusFrameTable(frame, frame.dataset.focus, 0);
  } catch (e) { /* cross-origin frame — leave the full page as-is */ }
}

/* Reveal an element (and force a display if it, or an ancestor, was hidden —
   e.g. a table living in an inactive tab panel). */
function railReveal(node) {
  try {
    const cs = node.ownerDocument.defaultView.getComputedStyle(node);
    if (cs.display === 'none') {
      node.style.setProperty('display', node.tagName === 'TABLE' ? 'table' : 'block', 'important');
    }
    if (cs.visibility === 'hidden') node.style.setProperty('visibility', 'visible', 'important');
  } catch (e) { /* getComputedStyle can throw on detached nodes */ }
}

/* Inside a (same-origin) preview frame, hide everything except the target table
   and its ancestors, then relax any clipping/height on that path so the table
   shows in full. Returns true only once the table actually exists in the DOM. */
const CHART_FOCUS_CSS = `
  .dash-card-topbar,
  .dash-card-topbar-lead,
  .dash-card-title,
  .dash-section-head,
  .dash-section-title,
  .dash-pillars-heading,
  .dash-breakdown-title,
  .dash-top5-title,
  .att-title,
  .att-head,
  .att-orient,
  .att-orient-bar,
  .az-nav,
  .ah-topbar,
  .att-hero,
  #att-hero,
  #rpt-gras-hero,
  #rpt-insights-hero,
  .dash-score-toast,
  .att-intro,
  .panel-more-btn,
  .panel-more-wrap { display: none !important; }
`;

function focusFrameTable(doc, selector, opts) {
  const el = doc.querySelector(selector);
  if (!el) return false;

  railReveal(el);
  let node = el;
  while (node && node.parentElement && node !== doc.body) {
    const parent = node.parentElement;
    railReveal(parent);
    /* Let the table grow to its natural size on the isolation path. */
    parent.style.setProperty('max-height', 'none', 'important');
    parent.style.setProperty('overflow', 'visible', 'important');
    Array.prototype.forEach.call(parent.children, (sib) => {
      if (sib === node) return;
      const tag = sib.tagName;
      if (tag === 'STYLE' || tag === 'SCRIPT' || tag === 'LINK') return;
      sib.style.setProperty('display', 'none', 'important');
    });
    node = parent;
  }

  const chart = opts && opts.mode === 'chart';
  const iso = doc.createElement('style');
  iso.id = 'mi-embed-focus';
  iso.textContent = `
    html, body { overflow: hidden !important; }
    body { margin: 0 !important; padding: ${chart ? '8px' : '22px'} !important; }
    ${chart ? CHART_FOCUS_CSS : ''}
  `;
  (doc.head || doc.documentElement).appendChild(iso);
  return true;
}

/* Poll for the target table: many are rendered by page scripts after load, so
   we retry briefly. Once found we mark the pane focused; if it never appears we
   mark it unfocused and leave the chrome-stripped page preview as a fallback so
   the pane is never blank. */
function tryFocusFrameTable(frame, selector, attempt) {
  let doc;
  try { doc = frame.contentDocument; } catch (e) { return; }
  if (!doc) return;
  if (doc.getElementById('mi-embed-focus')) return;

  const pane = frame.closest('.mi-pane');
  if (focusFrameTable(doc, selector, { mode: frame.dataset.focusMode || '' })) {
    if (pane) pane.classList.add('is-focused');
    return;
  }
  if (attempt < 34) {
    setTimeout(() => tryFocusFrameTable(frame, selector, attempt + 1), 130);
  } else if (pane) {
    pane.classList.add('is-unfocused');
  }
}

function attachRailFrame(f) {
  if (!f || f.dataset.miWired === '1') return;
  f.dataset.miWired = '1';
  f.addEventListener('load', () => embedRailFrame(f));
  try {
    if (f.contentDocument && f.contentDocument.readyState === 'complete') embedRailFrame(f);
  } catch (e) { /* not ready / cross-origin */ }

  /* Safety net for the Table Gallery loading shimmer: if isolation can't run
     (cross-origin / file://) or the table never appears, clear the shimmer so
     the pane doesn't animate forever. */
  if (f.dataset.focus) {
    const pane = f.closest('.mi-pane');
    setTimeout(() => {
      if (pane && !pane.classList.contains('is-focused')) pane.classList.add('is-unfocused');
    }, 6000);
  }
}

function frameIsEligible(frame) {
  if (!frame || !frame.isConnected) return false;
  const pane = frame.closest('.mi-pane');
  if (pane && pane.hidden) return false;
  const rail = frame.closest('.mi-rail');
  if (rail && rail.hidden) return false;
  const mod = frame.closest('.mi-module');
  if (mod && mod.classList.contains('is-collapsed')) return false;
  const card = frame.closest('.dsc-card');
  if (card && card.classList.contains('is-collapsed')) return false;
  if (frame.closest('#mi-az-lightbox')) return true;
  return true;
}

function hydrateFrame(frame) {
  if (!frame || frame.getAttribute('src')) return;
  const src = frame.getAttribute('data-src');
  if (!src) return;
  if (!frameIsEligible(frame)) return;
  frame.src = src;
  attachRailFrame(frame);
}

let frameObserver = null;
let azFrameObserver = null;

function ensureFrameObserver() {
  if (frameObserver) return frameObserver;
  frameObserver = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      hydrateFrame(en.target);
      frameObserver.unobserve(en.target);
    });
  }, { root: null, rootMargin: '280px 0px', threshold: 0.01 });
  return frameObserver;
}

/* Chart thumbs only boot when they actually enter the module scroller —
   opening the accordion must not fetch every analytics-types.html at once. */
function ensureAzFrameObserver() {
  if (azFrameObserver) return azFrameObserver;
  const root = document.getElementById('agent-main-scroll') || null;
  azFrameObserver = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      hydrateFrame(en.target);
      azFrameObserver.unobserve(en.target);
    });
  }, { root, rootMargin: '80px 0px', threshold: 0.12 });
  return azFrameObserver;
}

function observePreviewFrames(scope) {
  const root = scope || document;
  if (!root || !root.querySelectorAll) return;
  const railObs = ensureFrameObserver();
  root.querySelectorAll('.mi-pane-frame[data-src]').forEach((f) => {
    const obs = f.dataset.azLazy ? ensureAzFrameObserver() : railObs;
    if (f.getAttribute('src')) {
      obs.unobserve(f);
      return;
    }
    if (frameIsEligible(f)) obs.observe(f);
    else obs.unobserve(f);
  });
}

function wireRailFrames(root) {
  /* Frames start with data-src only. Hydrate when a section is actually
     visible — otherwise first paint boots every screen in the catalog. */
  observePreviewFrames(root);
}

/* The Grid ⇄ Rail toggle. Grid shows the grouped link sections; Rail swaps in
   the horizontal track of live module previews. Remembered across visits. */
function wireView(root) {
  const dir = root.querySelector('#mi-directory');
  const sections = root.querySelector('#mi-dir-sections');
  const rail = root.querySelector('#mi-rail');
  const btns = Array.from(root.querySelectorAll('[data-view]'));
  if (!dir || !btns.length) return;

  const setView = (view) => {
    const railOn = view === 'rail';
    dir.classList.toggle('is-rail', railOn);
    if (sections) sections.hidden = railOn;
    if (rail) rail.hidden = !railOn;
    btns.forEach((b) => {
      const on = b.dataset.view === view;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    try { localStorage.setItem('mi-view', view); } catch (e) {}
    observePreviewFrames(dir);
  };

  btns.forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));

  let initial = 'grid';
  try {
    const v = localStorage.getItem('mi-view');
    if (v === 'rail' || v === 'grid') initial = v;
  } catch (e) {}
  setView(initial);
}

function wireDirectory(root) {
  const searchInput = root.querySelector('#mi-dir-search');
  const stats = root.querySelector('#mi-dir-stats');
  const emptyEl = root.querySelector('#mi-dir-empty');
  const sectionsRoot = root.querySelector('#mi-dir-sections');
  if (!sectionsRoot) return;

  const railEmpty = root.querySelector('#mi-rail-empty');
  const state = { q: '', area: 'all' };

  const matches = (c) => {
    const matchQ = !state.q || (c.dataset.search || '').indexOf(state.q) !== -1;
    const sec = c.closest('.mi-dir-section');
    const area = sec ? sec.dataset.area : c.dataset.area;
    const matchA = state.area === 'all' || area === state.area;
    return matchQ && matchA;
  };

  const apply = () => {
    /* Re-query so cards/panes injected by Re-evaluate are included. */
    const cards = Array.from(sectionsRoot.querySelectorAll('[data-mod-card]'));
    const sections = Array.from(sectionsRoot.querySelectorAll('.mi-dir-section'));
    const panes = Array.from((root.querySelector('#mi-rail') || root).querySelectorAll('[data-pane]'));
    let shown = 0;
    cards.forEach((c) => {
      const vis = matches(c);
      c.hidden = !vis;
      if (vis) shown++;
    });
    sections.forEach((sec) => {
      const any = Array.from(sec.querySelectorAll('[data-mod-card]')).some((c) => !c.hidden);
      sec.hidden = !any;
    });
    panes.forEach((p) => { p.hidden = !matches(p); });
    if (emptyEl) emptyEl.hidden = shown !== 0;
    if (railEmpty) railEmpty.hidden = shown !== 0;
  };

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      state.q = searchInput.value.trim().toLowerCase();
      apply();
    });
  }

  if (stats) {
    stats.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-area]');
      if (!btn) return;
      state.area = btn.dataset.area;
      stats.querySelectorAll('[data-area]').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      apply();
    });
  }

  // Rail prev/next — scroll roughly one viewport of panes at a time.
  const track = root.querySelector('#mi-rail-track');
  const step = () => Math.max(280, (track ? track.clientWidth : 600) * 0.8);
  root.querySelector('[data-rail-prev]')?.addEventListener('click', () => track?.scrollBy({ left: -step(), behavior: 'smooth' }));
  root.querySelector('[data-rail-next]')?.addEventListener('click', () => track?.scrollBy({ left: step(), behavior: 'smooth' }));

  apply();
}

/* ------------------------------------------------------------------ */
/* Table Gallery wiring — search filter + carousel prev/next          */
/* ------------------------------------------------------------------ */
function wireTableGallery(root) {
  const track = root.querySelector('#mi-tbl-track');
  if (!track) return;

  const panes = Array.from(track.querySelectorAll('[data-tpane]'));
  const searchInput = root.querySelector('#mi-tbl-search');
  const emptyEl = root.querySelector('#mi-tbl-empty');
  const shownEl = root.querySelector('#mi-tbl-shown');

  const apply = () => {
    const q = (searchInput?.value || '').trim().toLowerCase();
    let shown = 0;
    panes.forEach((p) => {
      const vis = !q || p.dataset.search.indexOf(q) !== -1;
      p.hidden = !vis;
      if (vis) shown++;
    });
    if (emptyEl) emptyEl.hidden = shown !== 0;
    if (shownEl) shownEl.textContent = String(shown);
  };

  if (searchInput) searchInput.addEventListener('input', apply);

  const step = () => Math.max(320, track.clientWidth * 0.85);
  root.querySelector('[data-trail-prev]')?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  root.querySelector('[data-trail-next]')?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));

  apply();
}

/* ------------------------------------------------------------------ */
/* Analytics Types wiring — search + thumbnail → full-size lightbox   */
/* ------------------------------------------------------------------ */

function wireAnalyticsTypes(root) {
  const grid = root.querySelector('#mi-az-grid');
  if (!grid) return;

  const thumbs = Array.from(grid.querySelectorAll('[data-az-thumb]'));
  const searchInput = root.querySelector('#mi-az-search');
  const emptyEl = root.querySelector('#mi-az-empty');
  const shownEl = root.querySelector('#mi-az-shown');

  const apply = () => {
    const q = (searchInput?.value || '').trim().toLowerCase();
    let shown = 0;
    thumbs.forEach((p) => {
      const vis = !q || (p.dataset.search || '').indexOf(q) !== -1;
      p.hidden = !vis;
      if (vis) shown++;
    });
    if (emptyEl) emptyEl.hidden = shown !== 0;
    if (shownEl) shownEl.textContent = String(shown);
  };

  if (searchInput) searchInput.addEventListener('input', apply);
  apply();
  wireAnalyticsLightbox(root);
}

function closeAnalyticsLightbox() {
  const scrim = document.getElementById('mi-az-lightbox');
  if (!scrim) return;
  scrim.classList.remove('is-open');
  setTimeout(() => scrim.remove(), 220);
}

function openAnalyticsLightbox(chart) {
  if (!chart) return;
  closeAnalyticsLightbox();
  const focus = analyticsFocusSel(chart);
  const open = analyticsOpenHref(chart);
  const src = previewSrc(ANALYTICS_HREF);
  const scrim = document.createElement('div');
  scrim.id = 'mi-az-lightbox';
  scrim.className = 'dash-modal-scrim dash-modal-scrim--panel dash-modal-scrim--chart';
  scrim.innerHTML = `
    <div class="dash-modal dash-modal--panel dash-modal--chart" role="dialog" aria-modal="true" aria-labelledby="mi-az-lb-title">
      <header class="dash-modal-head">
        <div class="dash-modal-titles">
          <span class="dash-modal-eyebrow">Analytics Types</span>
          <h2 class="dash-modal-title" id="mi-az-lb-title">${esc(chart.label)}</h2>
        </div>
        <button class="dash-modal-close" type="button" data-az-lb-close aria-label="Close"><span class="material-symbols-outlined">close</span></button>
      </header>
      <div class="dash-modal-body mi-az-lb-body">
        <div class="mi-az-lb-stage">
          ${frameMarkup(src, chart.label + ' full size', (focus ? `data-focus="${esc(focus)}" ` : '') + 'data-focus-mode="chart"')}
        </div>
      </div>
      <footer class="dash-modal-foot">
        ${chart.desc ? `<span class="ds-prop-frac">${esc(chart.desc)}</span>` : '<span></span>'}
        <div class="dash-modal-foot-right">
          <a class="dash-btn dash-btn--ghost" href="${esc(open)}">
            <span class="material-symbols-outlined">arrow_outward</span>Open on Analytics Types
          </a>
        </div>
      </footer>
    </div>`;
  document.body.appendChild(scrim);
  requestAnimationFrame(() => scrim.classList.add('is-open'));

  const close = () => {
    document.removeEventListener('keydown', onKey);
    closeAnalyticsLightbox();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };
  scrim.querySelector('[data-az-lb-close]')?.addEventListener('click', close);
  scrim.addEventListener('click', (e) => { if (e.target === scrim) close(); });
  document.addEventListener('keydown', onKey);

  const frame = scrim.querySelector('.mi-pane-frame');
  if (frame) {
    frame.removeAttribute('data-src');
    frame.src = src;
    attachRailFrame(frame);
  }
}

function wireAnalyticsLightbox(root) {
  if (!root || root._azLbWired) return;
  root._azLbWired = true;
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-az-open]');
    if (!btn || !root.contains(btn)) return;
    e.preventDefault();
    const chart = analyticsById(btn.getAttribute('data-az-open'));
    if (chart) openAnalyticsLightbox(chart);
  });
}

/* ------------------------------------------------------------------ */
/* Screenshot export                                                   */
/*                                                                     */
/* Two client-side exports that mirror the screenshots/ folder the      */
/* Playwright script (screenshots/_shoot.py) produces — but generated   */
/* live in the browser and downloaded as a zipped folder of PNGs:       */
/*   • "Export page shots"   — the WHOLE page (menu rail + top bar +     */
/*     module content) for every UNIQUE screen → pages/<file>.png       */
/*   • "Export module shots" — just the module's content panel, with     */
/*     the app chrome cropped away, for every directory entry →          */
/*     modules/<area>-<label>.png                                        */
/*                                                                      */
/* Each target loads in a hidden, same-origin iframe (so it shares the   */
/* logged-in session + localStorage — no auth bounce), tagged ?preview=1 */
/* (previewSrc) so self-redirecting screens stay put, GROWN until no pane */
/* overflows (the WISE shell scrolls its inner panels, not the document — */
/* same trick as _shoot.py), then rasterised with modern-screenshot.      */
/* modern-screenshot renders through an SVG <foreignObject>, so it draws   */
/* the app's modern CSS (color-mix / color()) + inlines the Material       */
/* Symbols web font faithfully — html2canvas can't parse those. JSZip      */
/* bundles the PNGs. Both libraries are lazy-loaded from a CDN on first    */
/* use, so the page carries no extra weight until you actually export.     */
/* ------------------------------------------------------------------ */

const CAPTURE_W = 1440;          // capture viewport width (matches _shoot.py)
const CAPTURE_MAX_H = 16000;     // clamp very tall pages so the canvas stays sane
const CAPTURE_MAX_PX_H = 30000;  // hard ceiling on the rasterised pixel height

const CAPTURE_CDN = {
  rasterizer: 'https://cdn.jsdelivr.net/npm/modern-screenshot@4.4.39/dist/index.js',
  jszip: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
};

const capWait = (ms) => new Promise((r) => setTimeout(r, ms));

/* Reject a promise if it doesn't settle in `ms` — so one wedged page (a load
   that never fires, a rasterizer that stalls) turns into a skipped capture
   instead of freezing the whole batch. */
function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const sel = `script[data-mi-lib="${src}"]`;
    const existing = document.querySelector(sel);
    if (existing) {
      if (existing.dataset.loaded === '1') { resolve(); return; }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('load failed')));
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.dataset.miLib = src;
    s.addEventListener('load', () => { s.dataset.loaded = '1'; resolve(); });
    s.addEventListener('error', () => reject(new Error('load failed')));
    document.head.appendChild(s);
  });
}

async function ensureCaptureLibs() {
  if (!window.modernScreenshot) await loadScriptOnce(CAPTURE_CDN.rasterizer);
  if (!window.JSZip) await loadScriptOnce(CAPTURE_CDN.jszip);
  if (!window.modernScreenshot || !window.JSZip) throw new Error('capture libs unavailable');
}

/* Safe, lowercase, hyphenated filename fragment. */
function capSlug(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'module';
}

/* Fixups injected INTO the captured iframe's document before rasterising —
   the same treatment _shoot.py applies: force light theme, kill transitions +
   scroll-behavior, and force any reveal-on-scroll content visible so nothing
   is captured mid-animation or hidden. */
function applyCaptureFixups(win, doc) {
  try { win.localStorage.setItem('wise-theme', 'light'); win.localStorage.setItem('chat-theme', 'light'); } catch (_) {}
  doc.documentElement.classList.remove('dark');
  const s = doc.createElement('style');
  s.textContent = '*,*::before,*::after{transition:none!important;animation:none!important;scroll-behavior:auto!important}';
  doc.documentElement.appendChild(s);
  doc.querySelectorAll('[class*="reveal"],[data-reveal]').forEach((el) => {
    el.style.setProperty('opacity', '1', 'important');
    el.style.setProperty('transform', 'none', 'important');
  });
}

/* Scroll every scroll pane end-to-end to trigger lazy / IntersectionObserver
   content, then return to the top — same idea as the Playwright TRIGGER step. */
async function triggerLazyContent(win, doc) {
  const panes = Array.from(doc.querySelectorAll('*')).filter((el) => {
    const cs = win.getComputedStyle(el);
    return /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 4;
  });
  const scroller = doc.scrollingElement || doc.documentElement;
  if (scroller) panes.push(scroller);
  for (const p of panes) {
    if (!p) continue;
    const h = p.scrollHeight;
    const stepPx = Math.max(200, p.clientHeight * 0.8);
    for (let y = 0; y <= h; y += stepPx) { p.scrollTop = y; await capWait(30); }
    p.scrollTop = 0;
  }
}

/* The largest vertical overflow across any scroll pane (and the document) —
   how much taller the iframe must get so nothing needs to scroll. */
function maxScrollDelta(win, doc) {
  let max = 0;
  doc.querySelectorAll('*').forEach((el) => {
    const cs = win.getComputedStyle(el);
    if (/(auto|scroll)/.test(cs.overflowY)) {
      const d = el.scrollHeight - el.clientHeight;
      if (d > max) max = d;
    }
  });
  const de = doc.scrollingElement || doc.documentElement;
  const dd = de.scrollHeight - de.clientHeight;
  if (dd > max) max = dd;
  return Math.round(max);
}

/* Grow the iframe until no pane overflows, so every flex/grid layout expands
   in place and the whole screen is visible at once (chat composer stays docked,
   the full transcript shows …) — a direct port of _shoot.py's growth loop. */
async function growViewport(frame, win, doc) {
  let h = 1000;
  let lastDelta = null;
  for (let i = 0; i < 9; i++) {
    const delta = maxScrollDelta(win, doc);
    if (delta <= 4) break;
    if (lastDelta !== null && delta >= lastDelta - 4) {
      // A fixed-height pane isn't shrinking — force it open once, then stop.
      doc.querySelectorAll('*').forEach((el) => {
        const cs = win.getComputedStyle(el);
        if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 4) {
          el.style.setProperty('max-height', 'none', 'important');
          el.style.setProperty('height', 'auto', 'important');
          el.style.setProperty('overflow-y', 'visible', 'important');
        }
      });
      await capWait(300);
      break;
    }
    lastDelta = delta;
    h = Math.min(CAPTURE_MAX_H, h + delta + 60);
    frame.style.height = `${h}px`;
    await capWait(350);
  }
  await capWait(250);
}

/* The module's content panel on a given page — the central pane, with the
   left menu rail + top bar cropped away. If the directory entry carried a
   #hash that resolves to a real element, that element wins (so a broken-out
   sub-module captures itself). Falls back to the whole document. */
function pickModuleTarget(doc, hash) {
  if (hash) {
    const byId = doc.getElementById(hash);
    if (byId) return byId;
  }
  return doc.querySelector('#agent-main')
    || doc.querySelector('main')
    || doc.querySelector('[role="main"]')
    || doc.querySelector('.mi-wrap')
    || doc.documentElement;
}

/* Load one URL in a hidden iframe and rasterise `pickTarget(doc)` (or the whole
   document when pickTarget is null) straight to a PNG Blob. The blob is encoded
   while the iframe is still attached — canvas.toBlob() never fires its callback
   once the source iframe has been torn down — then the frame is removed in the
   finally. Resolves to a Blob, throws on failure. */
async function captureTarget(url, pickTarget) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('tabindex', '-1');
  frame.style.cssText = `position:fixed; left:0; top:0; width:${CAPTURE_W}px; height:1000px; border:0; visibility:hidden; opacity:0; z-index:-1; pointer-events:none;`;
  document.body.appendChild(frame);
  try {
    await new Promise((resolve, reject) => {
      let settled = false;
      const finish = () => { if (!settled) { settled = true; resolve(); } };
      frame.addEventListener('load', finish);
      frame.addEventListener('error', () => { if (!settled) { settled = true; reject(new Error('iframe error')); } });
      frame.src = url;
      setTimeout(finish, 25000); // never hang the whole run on one page
    });
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    if (!doc || !win) throw new Error('no document');

    await capWait(900);             // let scripts boot
    try { await win.document.fonts?.ready; } catch (_) {}
    applyCaptureFixups(win, doc);
    await triggerLazyContent(win, doc);
    await capWait(300);

    // Grow the viewport until no inner pane overflows — nothing clips.
    await growViewport(frame, win, doc);

    const target = (typeof pickTarget === 'function' ? pickTarget(doc) : null) || doc.documentElement;
    const rect = target.getBoundingClientRect();
    const h = Math.max(1, Math.ceil(target.scrollHeight || rect.height));

    // Adaptive scale: aim for retina (2×) but never blow past the pixel ceiling.
    let scale = 2;
    if (h * scale > CAPTURE_MAX_PX_H) scale = Math.max(1, CAPTURE_MAX_PX_H / h);

    const canvas = await window.modernScreenshot.domToCanvas(target, {
      backgroundColor: '#ffffff',
      scale,
    });
    if (!canvas || !canvas.width) throw new Error('rasterizer returned nothing');
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
    if (!blob) throw new Error('could not encode PNG');
    return blob;
  } finally {
    frame.remove();
  }
}

/* Unique page FILES (strip #hash + ?query) → one full-page shot each. */
function pageCaptureTargets() {
  const seen = new Set();
  const out = [];
  MODULE_SECTIONS.forEach((s) => s.modules.forEach((m) => {
    const path = String(m.href).split('#')[0].split('?')[0];
    if (!path || path === '#') return;
    if (seen.has(path)) return;
    seen.add(path);
    const base = path.replace(/\.html?$/i, '').split('/').pop();
    out.push({ name: `${capSlug(base)}.png`, href: path });
  }));
  return out;
}

/* Every directory entry → one module-panel shot each (keeps the broken-out
   sub-modules that share a page as their own labelled capture). */
function moduleCaptureTargets() {
  return MODULE_SECTIONS.flatMap((s) => s.modules.map((m) => ({
    name: `${capSlug(s.tone)}-${capSlug(m.label)}.png`,
    href: m.href,
    hash: String(m.href).split('#')[1] || '',
  })));
}

/* The progress dialog shown while an export runs. Returns a small controller. */
function openCaptureOverlay(kind, items) {
  const label = kind === 'pages' ? 'Full-page screenshots' : 'Module screenshots';
  const folder = kind === 'pages' ? 'pages/' : 'modules/';
  const headIcon = kind === 'pages' ? 'photo_library' : 'dashboard_customize';
  const scrim = document.createElement('div');
  scrim.className = 'mi-cap-scrim';
  scrim.innerHTML = `
    <div class="mi-cap-card" role="dialog" aria-modal="true" aria-label="${esc(label)} export">
      <div class="mi-cap-head">
        <span class="mi-cap-ic"><span class="material-symbols-outlined">${headIcon}</span></span>
        <div class="mi-cap-titles">
          <div class="mi-cap-title">${esc(label)}</div>
          <div class="mi-cap-sub" data-cap-sub>Preparing ${items.length} captures → <strong>${esc(folder)}</strong></div>
        </div>
        <button type="button" class="mi-cap-close" data-cap-close aria-label="Close"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div class="mi-cap-bar"><span class="mi-cap-fill" data-cap-fill></span></div>
      <ul class="mi-cap-list" data-cap-list>
        ${items.map((it, i) => `
          <li class="mi-cap-row" data-cap-row="${i}" data-state="pending">
            <span class="material-symbols-outlined">schedule</span>
            <span class="mi-cap-row-name">${esc(it.name)}</span>
          </li>`).join('')}
      </ul>
      <div class="mi-cap-foot">
        <span class="mi-cap-note" data-cap-note>Keep this tab focused while it captures.</span>
        <button type="button" class="mi-cap-done-btn" data-cap-done disabled>Working…</button>
      </div>
    </div>`;
  document.body.appendChild(scrim);
  requestAnimationFrame(() => scrim.classList.add('is-open'));

  const close = () => { scrim.classList.remove('is-open'); setTimeout(() => scrim.remove(), 220); };
  scrim.querySelector('[data-cap-close]').addEventListener('click', close);
  const doneBtn = scrim.querySelector('[data-cap-done]');
  doneBtn.addEventListener('click', () => { if (!doneBtn.disabled) close(); });

  const rowIcon = { run: 'autorenew', ok: 'check_circle', err: 'error', pending: 'schedule' };
  return {
    setRow(i, state) {
      const row = scrim.querySelector(`[data-cap-row="${i}"]`);
      if (!row) return;
      row.dataset.state = state;
      const ic = row.querySelector('.material-symbols-outlined');
      if (ic) ic.textContent = rowIcon[state] || 'schedule';
      row.scrollIntoView({ block: 'nearest' });
    },
    setProgress(done, total) {
      const fill = scrim.querySelector('[data-cap-fill]');
      if (fill) fill.style.width = `${Math.round((done / total) * 100)}%`;
      const sub = scrim.querySelector('[data-cap-sub]');
      if (sub) sub.innerHTML = `Captured <strong>${done}</strong> of <strong>${total}</strong> → <strong>${esc(folder)}</strong>`;
    },
    finish(ok, err) {
      const note = scrim.querySelector('[data-cap-note]');
      if (note) note.textContent = err ? `${ok} captured · ${err} failed — the zip has the rest.` : `All ${ok} captured. Downloading…`;
      doneBtn.disabled = false;
      doneBtn.textContent = 'Done';
    },
    fail(msg) {
      const note = scrim.querySelector('[data-cap-note]');
      if (note) note.textContent = msg;
      doneBtn.disabled = false;
      doneBtn.textContent = 'Close';
    },
  };
}

let captureInFlight = false;

async function runCaptureExport(kind, buttons) {
  if (captureInFlight) return;
  captureInFlight = true;
  buttons.forEach((b) => { b.disabled = true; });

  const items = kind === 'pages' ? pageCaptureTargets() : moduleCaptureTargets();
  const folder = kind === 'pages' ? 'pages' : 'modules';
  const ui = openCaptureOverlay(kind, items);

  const release = () => { captureInFlight = false; buttons.forEach((b) => { b.disabled = false; }); };

  try {
    await ensureCaptureLibs();
  } catch (_) {
    ui.fail('Could not load the capture engine (needs a network connection).');
    release();
    return;
  }

  const zip = new window.JSZip();
  const dir = zip.folder(folder);
  let ok = 0;
  let err = 0;
  const failures = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    ui.setRow(i, 'run');
    try {
      const blob = await withTimeout(
        captureTarget(previewSrc(it.href), kind === 'modules' ? (doc) => pickModuleTarget(doc, it.hash) : null),
        60000,
        it.name,
      );
      dir.file(it.name, blob);
      ok++;
      ui.setRow(i, 'ok');
    } catch (e) {
      err++;
      const reason = e && e.message ? e.message : 'failed';
      failures.push(`${it.name}\t${it.href}\t${reason}`);
      ui.setRow(i, 'err');
    }
    ui.setProgress(i + 1, items.length);
  }

  // A manifest so the folder documents itself (what / when / any failures).
  const manifest = [
    `WISE ${kind === 'pages' ? 'full-page' : 'module'} screenshots`,
    `Generated ${new Date().toISOString()}`,
    `Captured ${ok} of ${items.length}${err ? ` · ${err} failed` : ''}`,
    '',
    ...(failures.length ? ['Failed captures (name\thref\treason):', ...failures] : []),
  ].join('\n');
  dir.file('_manifest.txt', manifest);

  ui.finish(ok, err);

  try {
    const out = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(out);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wise-${folder}-screenshots.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  } catch (_) {
    ui.fail('Captured, but zipping the folder failed.');
  }

  release();
}

function wireDirectoryExport(root) {
  const group = root.querySelector('.mi-export');
  if (!group) return;
  const buttons = Array.from(group.querySelectorAll('[data-export]'));
  group.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-export]');
    if (!btn) return;
    runCaptureExport(btn.dataset.export, buttons);
  });
}

function wireIconInventory(root) {
  const grid = root.querySelector('#ii-grid');
  const emptyEl = root.querySelector('#ii-empty');
  const searchInput = root.querySelector('#ii-search-input');
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll('[data-icon-card]'));
  const state = { q: '', style: 'outlined', group: 'all', sort: 'name', render: 'font' };

  /* ---- SVG twins -------------------------------------------------------
     js/icon-svg-data.js is ~600 KB of path data, so it is imported only on
     the first flip to SVG and cached here. Until it lands the wells show a
     placeholder rather than an empty hole. */
  const renderSwitch = root.querySelector('#ii-render-switch');
  const renderNote = root.querySelector('#ii-render-note');
  let svgData = null;
  let svgLoading = null;

  const glyphFor = (name) => {
    const ic = svgData && svgData.icons && svgData.icons[name];
    if (!ic) return '';
    const body = ic[state.style] || ic.outlined;
    if (!body) return '';
    const vb = ic.viewBox || svgData.defaultViewBox || '0 -960 960 960';
    return `<svg viewBox="${esc(vb)}" role="img" aria-hidden="true" focusable="false">${body}</svg>`;
  };

  /* Paint the SVG wells for the current style. Cheap enough to redo whole
     (397 cards, no layout thrash) and it keeps style + render in lockstep. */
  const paintSvg = () => {
    if (!svgData) return;
    cards.forEach((c) => {
      const well = c.querySelector('.ii-glyph-svg');
      if (well) well.innerHTML = glyphFor(c.dataset.name);
    });
  };

  /* One-time: tag the glyphs whose twin came from the classic Material Icons
     set because the Symbols SVG export renamed them. CSS shows the tag in SVG
     mode only. */
  const tagLegacy = () => {
    const names = new Set((svgData && svgData.legacy) || []);
    if (!names.size) return;
    cards.forEach((c) => {
      if (!names.has(c.dataset.name)) return;
      const row = c.querySelector('.ii-tagrow');
      if (!row || row.querySelector('.is-legacy')) return;
      row.insertAdjacentHTML(
        'beforeend',
        '<span class="ii-tag is-legacy" title="Legacy Material Icons name — still a valid ligature in the Symbols font, but renamed in the Symbols SVG export, so this vector comes from the classic Material Icons set">MI legacy</span>'
      );
    });
  };

  const noteFor = () => {
    if (state.render !== 'svg' || !svgData) return '';
    const legacy = (svgData.legacy || []).length;
    const miss = (svgData.missing || []).length;
    let txt = `These inventory twins come from <code>@material-symbols/svg-400</code> (Outlined / Filled) and <code>svg-300</code> (the Light sample). The <strong>live sprite is light / rounded at 400</strong>, with a few per-glyph exceptions. ${svgData.count} inline SVGs`;
    if (legacy) txt += ` \u2014 ${legacy} tagged <strong>MI legacy</strong> fall back to <code>@material-icons/svg</code>`;
    if (miss) txt += ` \u2014 ${miss} with no vector twin`;
    return txt + '. No webfont, no network. Regenerate inventory twins with <code>python3 scripts/gen_icon_svgs.py</code>; the app sprite with <code>python3 scripts/gen_icon_sprite.py</code>.';
  };

  const applyNote = () => {
    if (!renderNote) return;
    const txt = noteFor();
    renderNote.innerHTML = txt;
    renderNote.hidden = !txt;
  };

  const loadSvgData = () => {
    if (svgData) return Promise.resolve(svgData);
    if (svgLoading) return svgLoading;
    if (renderSwitch) renderSwitch.classList.add('is-loading');
    svgLoading = import('./icon-svg-data.js')
      .then((m) => {
        svgData = m.ICON_SVGS;
        tagLegacy();
        return svgData;
      })
      .catch((err) => {
        console.error('[icon-inventory] SVG twins failed to load', err);
        if (renderNote) {
          renderNote.innerHTML = 'Could not load <code>js/icon-svg-data.js</code>. Run <code>python3 scripts/gen_icon_svgs.py</code> to generate it.';
          renderNote.hidden = false;
        }
        return null;
      })
      .then((d) => {
        if (renderSwitch) renderSwitch.classList.remove('is-loading');
        svgLoading = null;
        return d;
      });
    return svgLoading;
  };

  const applyRender = () => {
    grid.classList.remove('ii-render-font', 'ii-render-svg');
    grid.classList.add('ii-render-' + state.render);
    if (state.render !== 'svg') { applyNote(); return; }
    loadSvgData().then(() => { paintSvg(); applyNote(); });
  };

  const applyStyle = () => {
    grid.classList.remove('ii-style-outlined', 'ii-style-filled', 'ii-style-light');
    grid.classList.add('ii-style-' + state.style);
    /* filled and light are different geometry, not a variation axis, so the
       vectors have to be repainted when the style changes. */
    if (state.render === 'svg') paintSvg();
  };

  const applySort = () => {
    const sorted = cards.slice().sort((a, b) => {
      if (state.sort === 'count') {
        return (+b.dataset.count) - (+a.dataset.count) || a.dataset.name.localeCompare(b.dataset.name);
      }
      return a.dataset.name.localeCompare(b.dataset.name);
    });
    sorted.forEach((c) => grid.appendChild(c));
  };

  const applyFilter = () => {
    let shown = 0;
    cards.forEach((c) => {
      const matchQ = !state.q || c.dataset.search.indexOf(state.q) !== -1;
      const matchG = state.group === 'all' || (c.dataset.groups || '').split(' ').includes(state.group);
      const vis = matchQ && matchG;
      c.hidden = !vis;
      if (vis) shown++;
    });
    if (emptyEl) emptyEl.hidden = shown !== 0;
  };

  // Expand / collapse placements.
  grid.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-ii-toggle]');
    if (!toggle) return;
    const card = toggle.closest('.ii-card');
    const places = card.querySelector('.ii-places');
    const open = card.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (places) places.hidden = !open;
  });

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      state.q = searchInput.value.trim().toLowerCase();
      applyFilter();
    });
  }

  root.querySelectorAll('[data-ii-style]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.style = btn.dataset.iiStyle;
      root.querySelectorAll('[data-ii-style]').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      applyStyle();
    });
  });

  root.querySelectorAll('[data-ii-group]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      state.group = btn.dataset.iiGroup;
      root.querySelectorAll('[data-ii-group]').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      applyFilter();
    });
  });

  root.querySelectorAll('[data-ii-sort]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.sort = btn.dataset.iiSort;
      root.querySelectorAll('[data-ii-sort]').forEach((b) => b.classList.toggle('is-active', b === btn));
      applySort();
    });
  });

  root.querySelectorAll('[data-ii-render]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (state.render === btn.dataset.iiRender) return;
      state.render = btn.dataset.iiRender;
      root.querySelectorAll('[data-ii-render]').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      applyRender();
    });
  });

  applyStyle();
  applySort();
  applyFilter();
  applyRender();
}

/* ------------------------------------------------------------------ */
/* Design System wiring — resolve swatch values live, per theme        */
/* ------------------------------------------------------------------ */

/* "rgb(37, 80, 124)" / "color(srgb 0.14 0.31 0.49)" → "#25507C"; keeps alpha readable. */
function cssColorParts(raw) {
  const s = String(raw || '').trim();
  let m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(/[,/]/).map((p) => parseFloat(p.trim())).filter((n) => !Number.isNaN(n));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length >= 4 ? parts[3] : 1 };
  }
  m = s.match(/color\(\s*srgb\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*([0-9.]+))?\s*\)/i);
  if (m) {
    const to255 = (n) => (n <= 1 ? n * 255 : n);
    return { r: to255(+m[1]), g: to255(+m[2]), b: to255(+m[3]), a: m[4] != null ? +m[4] : 1 };
  }
  m = s.match(/^#([0-9A-Fa-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.replace(/./g, (c) => c + c);
    if (h.length !== 6 && h.length !== 8) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1,
    };
  }
  return null;
}

/* Recombine a picked RGB with an alpha the native popover cannot offer. */
function colorWithAlpha(raw, a) {
  const parts = cssColorParts(raw);
  if (!parts) return '';
  const to = (n) => Math.round(n);
  if (a >= 0.999) return `rgb(${to(parts.r)}, ${to(parts.g)}, ${to(parts.b)})`;
  return `rgba(${to(parts.r)}, ${to(parts.g)}, ${to(parts.b)}, ${Math.round(a * 1000) / 1000})`;
}

function swatchAlpha(sw) {
  const slider = sw.querySelector('[data-token-alpha]');
  if (!slider) return 1;
  const pct = Number(slider.value);
  return Number.isFinite(pct) ? Math.max(0, Math.min(1, pct / 100)) : 1;
}

function cssColorLabel(raw) {
  return formatSwatchColor(raw, 'hex');
}

function formatSwatchColor(raw, fmt) {
  const parts = cssColorParts(raw);
  if (!parts) return String(raw || '').trim();
  const r = Math.round(parts.r);
  const g = Math.round(parts.g);
  const b = Math.round(parts.b);
  const a = Math.round((parts.a == null ? 1 : parts.a) * 1000) / 1000;
  if (fmt === 'rgba') return `rgba(${r}, ${g}, ${b}, ${a})`;
  const hex = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0').toUpperCase();
  let h = `#${hex(r)}${hex(g)}${hex(b)}`;
  if (a < 0.999) h += hex(Math.round(a * 255));
  return h;
}

function swatchFmt(sw) {
  return sw && sw.dataset.fmt === 'rgba' ? 'rgba' : 'hex';
}

function cssToPickerHex(raw) {
  const parts = cssColorParts(raw);
  if (!parts) return '#000000';
  const hex = (n) => Math.round(n).toString(16).padStart(2, '0').toUpperCase();
  return `#${hex(parts.r)}${hex(parts.g)}${hex(parts.b)}`;
}

function chipComputedColor(sw) {
  const chip = sw.querySelector('[data-swatch-next]') || sw.querySelector('.ds-swatch-chip');
  if (!chip) return '';
  return getComputedStyle(chip).backgroundColor;
}

function paintDefaultChip(sw, token) {
  const now = sw.querySelector('[data-swatch-now]');
  if (!now) return;
  const T = window.WiseTokenTheme;
  const def = T && T.default ? T.default(token) : '';
  if (def) now.style.background = def;
}

function paintNextChip(sw, token) {
  const next = sw.querySelector('[data-swatch-next]');
  if (!next || !token) return;
  next.style.background = sw.dataset.draft || `var(${token})`;
}

function uniqueTokenPages() {
  const seen = new Set();
  const out = [];
  MODULE_SECTIONS.forEach((s) => s.modules.forEach((m) => {
    const path = String(m.href || '').split('#')[0].split('?')[0];
    if (!path || path === '#' || seen.has(path)) return;
    seen.add(path);
    out.push({ label: m.label, href: path, area: s.title });
  }));
  return out;
}

function markSwatchRollout(sw, done, total, saved) {
  const btn = sw.querySelector('[data-token-rollout]');
  if (!btn) return;
  const pages = total || uniqueTokenPages().length;
  const n = Math.max(0, Math.min(pages, done == null ? pages : done));
  btn.hidden = false;
  const fill = btn.querySelector('[data-rollout-fill]');
  const label = btn.querySelector('[data-rollout-label]');
  const pct = pages ? Math.round((n / pages) * 100) : 0;
  if (fill) fill.style.width = `${pct}%`;
  if (label) {
    label.textContent = saved
      ? `Saved for this theme · ${pages} pages`
      : `Applied to ${n} of ${pages} pages`;
  }
  sw.dataset.rolloutTotal = String(pages);
  sw.dataset.rolloutDone = String(n);
}

function setSwatchDraft(sw, value) {
  const token = sw && sw.dataset.token;
  if (!token) return;
  const formatted = formatSwatchColor(value, swatchFmt(sw));
  if (!formatted) return;
  sw.dataset.draft = formatted;
  paintNextChip(sw, token);
  const apply = sw.querySelector('[data-token-apply]');
  if (apply) apply.disabled = false;
  const rollout = sw.querySelector('[data-token-rollout]');
  if (rollout) rollout.hidden = true;
  syncOneSwatch(sw);
}

function syncOneSwatch(sw) {
  const T = window.WiseTokenTheme;
  const token = sw.dataset.token;
  if (token) {
    paintDefaultChip(sw, token);
    paintNextChip(sw, token);
  }
  const draft = sw.dataset.draft;
  const live = draft || chipComputedColor(sw);
  if (!live) return;
  const custom = !!(T && token && T.isCustom(token));
  sw.classList.toggle('is-custom', custom);
  const reset = sw.querySelector('[data-token-reset]');
  if (reset) reset.disabled = !(custom || draft);
  const apply = sw.querySelector('[data-token-apply]');
  if (apply) apply.disabled = !draft;
  const fmt = swatchFmt(sw);
  sw.querySelectorAll('[data-token-fmt]').forEach((btn) => {
    btn.setAttribute('aria-pressed', btn.dataset.tokenFmt === fmt ? 'true' : 'false');
  });
  const color = sw.querySelector('[data-token-color]');
  const picker = cssToPickerHex(live);
  if (color && color.value.toUpperCase() !== picker) color.value = picker;
  const parts = cssColorParts(live);
  const alpha = parts && parts.a != null ? parts.a : 1;
  const pct = Math.round(alpha * 100);
  const slider = sw.querySelector('[data-token-alpha]');
  if (slider && document.activeElement !== slider && Number(slider.value) !== pct) {
    slider.value = String(pct);
  }
  const alphaOut = sw.querySelector('[data-token-alpha-out]');
  if (alphaOut) alphaOut.textContent = `${pct}%`;
  sw.style.setProperty('--ds-alpha-ink', picker);
  const nowHex = sw.querySelector('[data-swatch-hex-now]');
  const defRaw = (T && token && T.default) ? T.default(token) : '';
  if (nowHex && document.activeElement !== nowHex) {
    nowHex.value = formatSwatchColor(defRaw || live, fmt);
  }
  const nextHex = sw.querySelector('[data-swatch-hex-next]');
  if (nextHex && document.activeElement !== nextHex) {
    nextHex.value = formatSwatchColor(live, fmt);
  }
  const out = sw.querySelector('[data-swatch-val]:not(input)');
  if (sw.dataset.kind === 'shadow') return;
  if (out) out.textContent = formatSwatchColor(live, fmt);
  if (custom && !draft && sw.querySelector('[data-token-rollout]')?.hidden) {
    markSwatchRollout(sw, uniqueTokenPages().length, uniqueTokenPages().length, true);
  }
}

function syncSwatchEditors(root) {
  const T = window.WiseTokenTheme;
  const resetAll = root.querySelector('[data-ds-reset-colors]');
  if (resetAll) resetAll.hidden = !(T && T.count && T.count());
  root.querySelectorAll('[data-swatch]').forEach(syncOneSwatch);
}

function resolveSwatchValues(root) {
  syncSwatchEditors(root);
}

function openTokenApplyModal(sw, opts) {
  const pages = uniqueTokenPages();
  const token = sw.dataset.token || '';
  const fmt = swatchFmt(sw);
  const T = window.WiseTokenTheme;
  const fromRaw = (T && T.default) ? T.default(token) : '';
  const toRaw = sw.dataset.draft || (T && T.get && T.get(token)) || chipComputedColor(sw);
  const fromHex = formatSwatchColor(fromRaw || toRaw, fmt);
  const toHex = formatSwatchColor(toRaw, fmt);
  const instant = !!(opts && opts.instant);
  const scrim = document.createElement('div');
  scrim.className = 'dash-modal-scrim dash-modal-scrim--panel';
  scrim.innerHTML = `
    <div class="dash-modal dash-modal--panel ds-prop-modal" role="dialog" aria-modal="true" aria-labelledby="ds-prop-title">
      <header class="dash-modal-head">
        <div class="dash-modal-titles">
          <span class="dash-modal-eyebrow">${esc(token)}</span>
          <h2 class="dash-modal-title" id="ds-prop-title">Apply across the app</h2>
        </div>
        <button class="dash-modal-close" type="button" data-prop-close aria-label="Close"><span class="material-symbols-outlined">close</span></button>
      </header>
      <div class="dash-modal-body">
        <div class="ds-prop-compare">
          <span class="ds-prop-chip">
            <span class="ds-prop-chip-well"><span class="ds-prop-chip-fill" style="background:${esc(fromHex)}"></span></span>
            <span class="ds-prop-chip-hex">${esc(fromHex)}</span>
          </span>
          <span class="material-symbols-outlined ds-prop-arrow" aria-hidden="true">arrow_forward</span>
          <span class="ds-prop-chip">
            <span class="ds-prop-chip-well"><span class="ds-prop-chip-fill" style="background:${esc(toHex)}"></span></span>
            <span class="ds-prop-chip-hex">${esc(toHex)}</span>
          </span>
        </div>
        <div class="ds-prop-score">
          <span class="ds-prop-pct" data-prop-pct>0%</span>
          <span class="ds-prop-frac" data-prop-frac>0 of ${pages.length} pages</span>
        </div>
        <div class="ds-prop-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-prop-bar>
          <span class="ds-prop-fill" data-prop-fill></span>
        </div>
        <ul class="ds-prop-list" data-prop-list>
          ${pages.map((p, i) => `
            <li class="ds-prop-row" data-prop-row="${i}" data-state="pending">
              <span class="material-symbols-outlined">schedule</span>
              <span class="ds-prop-row-name">${esc(p.label)}</span>
              <span class="ds-prop-row-href">${esc(p.href)}</span>
            </li>`).join('')}
        </ul>
      </div>
      <footer class="dash-modal-foot">
        <span class="ds-prop-frac" data-prop-note>Writing ${esc(token)} into every page that loads the design tokens.</span>
        <div class="dash-modal-foot-right">
          <button type="button" class="dash-btn dash-btn--primary" data-prop-done disabled>Working…</button>
        </div>
      </footer>
    </div>`;
  document.body.appendChild(scrim);
  requestAnimationFrame(() => scrim.classList.add('is-open'));

  const doneBtn = scrim.querySelector('[data-prop-done]');
  const close = () => {
    scrim.classList.remove('is-open');
    setTimeout(() => scrim.remove(), 220);
  };
  scrim.querySelector('[data-prop-close]').addEventListener('click', close);
  scrim.addEventListener('click', (e) => { if (e.target === scrim && !doneBtn.disabled) close(); });
  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (!doneBtn.disabled) { document.removeEventListener('keydown', onKey); close(); }
    }
  };
  document.addEventListener('keydown', onKey);
  doneBtn.addEventListener('click', () => { if (!doneBtn.disabled) { document.removeEventListener('keydown', onKey); close(); } });

  const rowIcon = { run: 'sync', ok: 'check_circle', pending: 'schedule' };
  const setRow = (i, state) => {
    const row = scrim.querySelector(`[data-prop-row="${i}"]`);
    if (!row) return;
    row.dataset.state = state;
    const ic = row.querySelector('.material-symbols-outlined');
    if (ic) ic.textContent = rowIcon[state] || 'schedule';
    if (state === 'run') row.scrollIntoView({ block: 'nearest' });
  };
  const setProgress = (done) => {
    const pct = pages.length ? Math.round((done / pages.length) * 100) : 0;
    const fill = scrim.querySelector('[data-prop-fill]');
    const bar = scrim.querySelector('[data-prop-bar]');
    const pctEl = scrim.querySelector('[data-prop-pct]');
    const frac = scrim.querySelector('[data-prop-frac]');
    if (fill) fill.style.width = `${pct}%`;
    if (bar) bar.setAttribute('aria-valuenow', String(pct));
    if (pctEl) pctEl.textContent = `${pct}%`;
    if (frac) frac.textContent = `${done} of ${pages.length} pages`;
    markSwatchRollout(sw, done, pages.length, false);
  };

  const finish = () => {
    pages.forEach((_, i) => setRow(i, 'ok'));
    setProgress(pages.length);
    const note = scrim.querySelector('[data-prop-note]');
    if (note) note.textContent = `${esc(token)} is live on ${pages.length} pages in this theme.`;
    doneBtn.disabled = false;
    doneBtn.textContent = 'Done';
  };

  if (instant) {
    finish();
    return;
  }

  let i = 0;
  const tick = () => {
    if (i > 0) setRow(i - 1, 'ok');
    if (i >= pages.length) {
      finish();
      return;
    }
    setRow(i, 'run');
    setProgress(i);
    i += 1;
    setTimeout(tick, 28);
  };
  setTimeout(tick, 80);
}

function applyTokenAcrossApp(sw) {
  const T = window.WiseTokenTheme;
  const token = sw && sw.dataset.token;
  if (!T || !token) return;
  const value = sw.dataset.draft || formatSwatchColor(chipComputedColor(sw), swatchFmt(sw));
  if (!value) return;
  T.set(token, value);
  delete sw.dataset.draft;
  markSwatchRollout(sw, 0, uniqueTokenPages().length, false);
  syncOneSwatch(sw);
  openTokenApplyModal(sw, { instant: false });
}

function wireDesignSystem(root) {
  const T = window.WiseTokenTheme;
  syncSwatchEditors(root);

  if (!root._dsTokensWired) {
    root._dsTokensWired = true;
    root.addEventListener('input', (e) => {
      const color = e.target.closest('[data-token-color]');
      if (color) {
        const sw = color.closest('[data-swatch]');
        if (sw && sw.dataset.token) setSwatchDraft(sw, colorWithAlpha(color.value, swatchAlpha(sw)));
        return;
      }
      const slider = e.target.closest('[data-token-alpha]');
      if (slider) {
        const sw = slider.closest('[data-swatch]');
        if (sw && sw.dataset.token) {
          const base = sw.querySelector('[data-token-color]');
          setSwatchDraft(sw, colorWithAlpha(base ? base.value : chipComputedColor(sw), swatchAlpha(sw)));
        }
        return;
      }
      const hex = e.target.closest('[data-token-hex]');
      if (hex && hex.value.trim().length >= 4) {
        const sw = hex.closest('[data-swatch]');
        if (sw && sw.dataset.token && cssColorParts(hex.value)) setSwatchDraft(sw, hex.value);
      }
    });
    root.addEventListener('change', (e) => {
      const nameEl = e.target.closest('[data-ds-group-name]');
      if (nameEl) {
        const saved = saveColorGroupName(nameEl.getAttribute('data-ds-group-name'), nameEl.value);
        if (nameEl.value !== saved) nameEl.value = saved;
        return;
      }
      const hex = e.target.closest('[data-token-hex]');
      if (!hex) return;
      const sw = hex.closest('[data-swatch]');
      if (!sw || !sw.dataset.token) return;
      if (!cssColorParts(hex.value)) syncOneSwatch(sw);
      else setSwatchDraft(sw, hex.value);
    });
    root.addEventListener('keydown', (e) => {
      const nameEl = e.target.closest('[data-ds-group-name]');
      if (!nameEl) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        nameEl.blur();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        const g = colorGroupById(nameEl.getAttribute('data-ds-group-name'));
        nameEl.value = g ? colorGroupTitle(g) : nameEl.value;
        nameEl.blur();
      }
    });
    root.addEventListener('click', (e) => {
      const fmtBtn = e.target.closest('[data-token-fmt]');
      if (fmtBtn) {
        e.stopPropagation();
        const sw = fmtBtn.closest('[data-swatch]');
        if (!sw) return;
        const fmt = fmtBtn.dataset.tokenFmt === 'rgba' ? 'rgba' : 'hex';
        if (swatchFmt(sw) === fmt) return;
        sw.dataset.fmt = fmt;
        const raw = sw.dataset.draft || chipComputedColor(sw);
        if (raw) setSwatchDraft(sw, raw);
        else syncOneSwatch(sw);
        return;
      }
      const apply = e.target.closest('[data-token-apply]');
      if (apply) {
        e.stopPropagation();
        const sw = apply.closest('[data-swatch]');
        if (sw && sw.dataset.token && sw.dataset.draft) applyTokenAcrossApp(sw);
        return;
      }
      const rollout = e.target.closest('[data-token-rollout]');
      if (rollout) {
        e.stopPropagation();
        const sw = rollout.closest('[data-swatch]');
        if (sw && sw.dataset.token) openTokenApplyModal(sw, { instant: true });
        return;
      }
      const one = e.target.closest('[data-token-reset]');
      if (one && T) {
        e.stopPropagation();
        const sw = one.closest('[data-swatch]');
        if (sw && sw.dataset.token) {
          delete sw.dataset.draft;
          const rb = sw.querySelector('[data-token-rollout]');
          if (rb) rb.hidden = true;
          T.reset(sw.dataset.token);
        }
        return;
      }
      const all = e.target.closest('[data-ds-reset-colors]');
      if (all && T) {
        e.stopPropagation();
        root.querySelectorAll('[data-swatch]').forEach((sw) => {
          delete sw.dataset.draft;
          const rb = sw.querySelector('[data-token-rollout]');
          if (rb) rb.hidden = true;
        });
        T.resetTheme();
      }
    });
  }

  if (T && T.onChange && !wireDesignSystem._tokenSub) {
    wireDesignSystem._tokenSub = true;
    T.onChange(() => {
      const host = wireDesignSystem._host;
      if (host && host.isConnected) syncSwatchEditors(host);
    });
  }

  /* Theme flips toggle html.dark — drop in-progress drafts and refresh chips. */
  wireDesignSystem._host = root;
  if (!wireDesignSystem._observer) {
    wireDesignSystem._dark = document.documentElement.classList.contains('dark');
    wireDesignSystem._observer = new MutationObserver(() => {
      const dark = document.documentElement.classList.contains('dark');
      if (dark === wireDesignSystem._dark) return;
      wireDesignSystem._dark = dark;
      const host = wireDesignSystem._host;
      if (host && host.isConnected) {
        host.querySelectorAll('[data-swatch][data-draft]').forEach((s) => delete s.dataset.draft);
        syncSwatchEditors(host);
      }
    });
    wireDesignSystem._observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }
}

/* ------------------------------------------------------------------ */
/* Component Library wiring — search filter + interactive demo bits    */
/* ------------------------------------------------------------------ */

/* html.dark .foo rules in wise.css (and this page's injected sheet) only
   match when the DOCUMENT is dark. Mirror them onto .dsc-theme-dark so a
   dark component pane is accurate on a light page, and exclude .dsc-theme-light
   so a light pane stays light when the document is navy. */
const patchedThemeSheets = new WeakSet();

function darkSelectorTwin(selector) {
  return String(selector || '').replace(/html\.dark/g, '.dsc-theme-dark');
}

function excludeLightIsland(selector) {
  return String(selector || '').split(',').map((part) => {
    const s = part.trim();
    if (!s || s.indexOf('html.dark') === -1 || s.indexOf('.dsc-theme-light') !== -1) return s;
    return s + ':not(.dsc-theme-light *)';
  }).join(', ');
}

function patchThemeRuleList(rules, sheet) {
  if (!rules || !sheet || typeof sheet.insertRule !== 'function') return;
  const extras = [];
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    /* Chrome exposes an empty cssRules list on style rules (CSS nesting).
       Recurse when there are children, but still process this rule's selector. */
    if (rule.cssRules && rule.cssRules.length) {
      patchThemeRuleList(rule.cssRules, rule);
    }
    const sel = rule.selectorText;
    if (!sel || sel.indexOf('html.dark') === -1 || sel.indexOf('.dsc-theme-dark') !== -1) continue;
    const twin = darkSelectorTwin(sel);
    if (twin && twin !== sel) {
      const text = rule.cssText;
      extras.push(text.indexOf(sel) !== -1 ? text.replace(sel, twin) : `${twin} { ${rule.style.cssText} }`);
    }
    try {
      const excluded = excludeLightIsland(sel);
      if (excluded !== sel) rule.selectorText = excluded;
    } catch (e) { /* selectorText is read-only on some grouping rules */ }
  }
  extras.forEach((css) => {
    try { sheet.insertRule(css, sheet.cssRules.length); } catch (e) { /* skip invalid clones */ }
  });
}

function patchLibraryThemeSheets() {
  Array.from(document.styleSheets).forEach((sheet) => {
    if (patchedThemeSheets.has(sheet)) return;
    let rules;
    try { rules = sheet.cssRules; } catch (e) { return; }
    patchedThemeSheets.add(sheet);
    patchThemeRuleList(rules, sheet);
  });
}

function demoAskLiveHtml() {
  return `
    <div class="dsc-ask-live" data-ask-demo>
      <div class="dsc-ask-host wch-host" data-ask-host></div>
    </div>`;
}

function ensureWchStyles() {
  if (document.getElementById('wch-styles')) return;
  if (!window.WiseChatHistory) return;
  const probe = document.createElement('div');
  window.WiseChatHistory.mount(probe, { storageKey: null });
}

function mountAskDemo(stage) {
  const host = stage.querySelector('[data-ask-host]');
  if (!host || !window.WiseChatAsk) return;
  const keepOpen = () => { queueMicrotask(() => { if (stage._askApi) stage._askApi.open(); }); };
  const api = window.WiseChatAsk.mount({
    host,
    container: host,
    catalog: window.WISE_ASK_CATALOG,
    stickyDefault: false,
    farRight: false,
    onInsert: keepOpen,
    onAsk: keepOpen,
  });
  if (!api) return;
  stage._askApi = api;
  const panel = api.root;
  if (panel) {
    panel.setAttribute('data-cwr-keep', '');
    panel.removeAttribute('inert');
    panel.removeAttribute('aria-hidden');
    panel.querySelectorAll('.wch-ask-width-btn, .panel-width-toggle-btn').forEach((btn) => {
      btn.hidden = true;
      btn.setAttribute('aria-hidden', 'true');
    });
  }
  api.open();
}

function wireAskOpenAll(card) {
  if (!card) return;
  card.querySelectorAll('[data-ask-open-all]').forEach((btn) => {
    if (btn.dataset.askOpenBound === '1') return;
    btn.dataset.askOpenBound = '1';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      card.querySelectorAll('[data-ask-demo]').forEach((stage) => {
        if (stage._askApi) stage._askApi.open();
      });
    });
  });
}

function wireComponentLibrary(root) {
  patchLibraryThemeSheets();
  const grid = root.querySelector('#dsc-grid');
  const emptyEl = root.querySelector('#dsc-empty');
  const searchInput = root.querySelector('#dsc-search');
  const stats = root.querySelector('#dsc-stats');
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll('[data-ds-comp]'));
  const state = { q: '', cat: 'all' };

  const apply = () => {
    let shown = 0;
    cards.forEach((c) => {
      const matchQ = !state.q || c.dataset.search.indexOf(state.q) !== -1;
      const matchC = state.cat === 'all' || c.dataset.cat === state.cat;
      const vis = matchQ && matchC;
      c.hidden = !vis;
      if (vis) shown++;
    });
    if (emptyEl) emptyEl.hidden = shown !== 0;
    refreshRptNudge();
    refreshAzCompNudge();
  };

  dscRevealAll = () => {
    state.q = '';
    state.cat = 'all';
    if (searchInput) searchInput.value = '';
    if (stats) {
      stats.querySelectorAll('[data-cat]').forEach((b) => {
        const on = b.dataset.cat === 'all';
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    apply();
    refreshRptNudge();
    refreshAzCompNudge();
  };

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      state.q = searchInput.value.trim().toLowerCase();
      apply();
    });
  }

  if (stats) {
    stats.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cat]');
      if (!btn) return;
      state.cat = btn.dataset.cat;
      stats.querySelectorAll('[data-cat]').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      apply();
      /* Keep the grid in view so a category tap lands you on the results. */
      grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* Live-wire the stacked composer demo once that component accordion opens —
     the chat module is not imported on load. */
  const compMod = root.querySelector('#mi-components');
  const bootComposersIn = (scope) => {
    if (!compMod || !compMod.isConnected) return;
    if (compMod.classList.contains('is-collapsed')) return;
    const host = scope || compMod;
    const rails = host.querySelectorAll('.dsc-demo [data-wise-composer]');
    if (!rails.length) return;
    const pending = Array.from(rails).filter((rail) => rail.dataset.composerBooted !== '1');
    if (!pending.length) return;
    pending.forEach((rail) => { rail.dataset.composerBooted = '1'; });
    /* Composer v2 is always-on app-wide; pin it here too so a race before
       topbar restore can't leave the catalog on the retired stacked layout. */
    document.documentElement.classList.add('composer-v2');
    import('./wiseai-chat.js').then((chat) => {
      pending.forEach((rail) => {
        chat.wireChatComposer(rail);
        /* Pre-filled "Lots of text" / "Images attached" demos need a grow
           sync — setting .value in markup does not fire 'input'. */
        const ta = rail.querySelector('textarea.fl-input');
        if (ta && ta.value) ta.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }).catch((err) => {
      console.error('[all-modules] composer demo failed', err);
      pending.forEach((rail) => { delete rail.dataset.composerBooted; });
    });
  };
  grid._bootComposersIn = bootComposersIn;

  /* Group the Chat ⋮ menu demo with the live chat helper so columns, Admin
     kebab, and row hints stay in lock-step with wiseai.html. */
  const bootChatMenuIn = (scope) => {
    if (!compMod || !compMod.isConnected) return;
    if (compMod.classList.contains('is-collapsed')) return;
    const host = scope || compMod;
    const pops = host.querySelectorAll('.dsc-demo .topbar-popover[data-chat-menu-demo]');
    if (!pops.length) return;
    const pending = Array.from(pops).filter((pop) => pop.dataset.chatMenuBooted !== '1');
    if (!pending.length) return;
    pending.forEach((pop) => { pop.dataset.chatMenuBooted = '1'; });
    import('./wiseai-chat.js').then((chat) => {
      chat.injectChatExtras();
      pending.forEach((pop) => {
        pop.classList.remove('hidden');
        chat.groupifyChatMenu(pop);
      });
    }).catch((err) => {
      console.error('[all-modules] chat menu demo failed', err);
      pending.forEach((pop) => { delete pop.dataset.chatMenuBooted; });
    });
  };
  grid._bootChatMenuIn = bootChatMenuIn;

  const bootAppSearchIn = (scope) => {
    if (!compMod || !compMod.isConnected) return;
    if (compMod.classList.contains('is-collapsed')) return;
    const host = scope || compMod;
    host.querySelectorAll('[data-app-search-demo]').forEach((el) => wireAppSearchDemo(el));
  };
  grid._bootAppSearchIn = bootAppSearchIn;

  const bootAskDemoIn = (scope) => {
    if (!compMod || !compMod.isConnected) return;
    if (compMod.classList.contains('is-collapsed')) return;
    const host = scope || compMod;
    const stages = host.querySelectorAll('[data-ask-demo]');
    if (!stages.length) return;
    const pending = Array.from(stages).filter((el) => el.dataset.askBooted !== '1');
    const card = host.closest ? (host.closest('[data-ds-comp]') || host.querySelector('[data-comp-name="What can I ask?"]')) : null;
    if (card) wireAskOpenAll(card);
    if (!pending.length) return;
    pending.forEach((el) => { el.dataset.askBooted = '1'; });
    /* Load only the ask panel + catalog — not the full chat module. Importing
       wiseai-chat.js here froze the page for several seconds on first open.
       Wait a frame so the accordion can paint before the catalog hydrates. */
    const hydrateAsk = () => {
      Promise.all([
        import('./chat-history.js'),
        import('./chat-ask.js'),
        import('./ask-catalog.js'),
      ]).then(() => {
        ensureWchStyles();
        pending.forEach((stage) => mountAskDemo(stage));
        if (card) wireAskOpenAll(card);
      }).catch((err) => {
        console.error('[all-modules] What can I ask? demo failed', err);
        pending.forEach((el) => { delete el.dataset.askBooted; });
      });
    };
    requestAnimationFrame(() => { requestAnimationFrame(hydrateAsk); });
  };
  grid._bootAskDemoIn = bootAskDemoIn;

  /* Each component is its own accordion. The title row toggles; Dev Ready
     and links inside the header keep their own actions. */
  const toggleCompCard = (card) => {
    if (!card || card.classList.contains('is-locked')) return;
    const opening = card.classList.contains('is-collapsed');
    setCompCardCollapsed(card, !opening);
    if (opening) {
      bootComposersIn(card);
      bootChatMenuIn(card);
      bootAppSearchIn(card);
      bootAskDemoIn(card);
      if (card.dataset.compName === 'Charts & graphs') {
        takeAzCompNudge();
        observePreviewFrames(card);
      }
      requestAnimationFrame(() => {
        const scroller = card.closest('.agent-main-scroll');
        const body = card.querySelector(':scope > .dsc-card-body');
        if (!scroller || !body) return;
        const sr = scroller.getBoundingClientRect();
        const br = body.getBoundingClientRect();
        if (br.top > sr.bottom - 96) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    if (card.dataset.compName === 'Report builder') refreshRptNudge();
    if (card.dataset.compName === 'Charts & graphs') refreshAzCompNudge();
  };
  grid.addEventListener('click', (e) => {
    if (e.target.closest('.dsc-ready, .dsc-ready-row, a, button, input, textarea, select')) return;
    const head = e.target.closest('.dsc-card-head');
    if (!head || !grid.contains(head)) return;
    toggleCompCard(head.closest('[data-ds-comp]'));
  });
  grid.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target.closest('.dsc-ready, .dsc-ready-row, a, button, input')) return;
    const head = e.target.closest('.dsc-card-head');
    if (!head || !grid.contains(head)) return;
    e.preventDefault();
    toggleCompCard(head.closest('[data-ds-comp]'));
  });

  /* Demo switches (brand toggle, admin popover switch) flip on click so their
     on/off states can be inspected live. Purely local — no persistence. */
  root.querySelectorAll('[data-demo-switch]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-checked') === 'true';
      btn.setAttribute('aria-checked', on ? 'false' : 'true');
    });
  });

  refreshRptNudge();
}

/* ------------------------------------------------------------------ */
/* Dev Ready wiring — hierarchical, persisted in localStorage.         */
/*                                                                     */
/* Every toggle (module OR item) shares this one handler. A lower-level */
/* item toggles freely; flipping one recomputes its parent so the "k/n" */
/* pill and the accordion switch stay honest. When every child is ready */
/* the parent turns on; if any child is later switched off, the parent  */
/* turns off with it. Clicking an incomplete accordion switch opens a   */
/* two-step verify modal; confirming marks every child ready.           */
/* ------------------------------------------------------------------ */
function readyKindOf(el) {
  return el && el.dataset && el.dataset.readyKind === 'ai' ? 'ai' : 'dev';
}

function paintItemReady(btn, on) {
  btn.classList.toggle('is-on', !!on);
  btn.setAttribute('aria-checked', on ? 'true' : 'false');
  const kind = readyKindOf(btn);
  const spec = readySpec(kind);
  const text = btn.querySelector('.dash-brand-toggle-text');
  const switchText = readySwitchText(kind, on);
  if (text) text.textContent = switchText;
  const label = btn.dataset.readyLabel || '';
  btn.setAttribute('aria-label', switchText + (label ? ' for ' + label : ''));
  btn.title = on ? spec.titleOn : spec.markOne(label);
}

function syncItemReadyButtons(root, id, on, kind) {
  const want = kind === 'ai' ? 'ai' : 'dev';
  root.querySelectorAll('[data-dsc-ready]').forEach((b) => {
    if (b.dataset.readyId === id && (b.dataset.readyLevel || 'item') === 'item' && readyKindOf(b) === want) {
      paintItemReady(b, on);
    }
  });
}

let readyVerifyEl = null;
function closeReadyVerifyModal() {
  const scrim = readyVerifyEl;
  if (!scrim) return;
  readyVerifyEl = null;
  scrim.classList.remove('is-open');
  setTimeout(() => scrim.remove(), 220);
  document.removeEventListener('keydown', readyVerifyKeyHandler);
}
function readyVerifyKeyHandler(e) {
  if (e.key === 'Escape') closeReadyVerifyModal();
}

function wireDevReady(root) {
  const moduleBtn = (moduleId, kind) =>
    Array.from(root.querySelectorAll('[data-dsc-ready][data-ready-level="module"]'))
      .find((b) => b.dataset.readyId === moduleId && readyKindOf(b) === kind);

  /* Recompute a parent module's progress pill + switch from its children.
     Directory rows, rail panes, and library cards all share these ids —
     paint every copy, not just the first accordion header. */
  function refreshParent(moduleId, kind) {
    kind = kind === 'ai' ? 'ai' : 'dev';
    const spec = readySpec(kind);
    const kids = readyKids(moduleId, kind);
    if (!kids.length) return;
    const map = loadReadyMap(kind);
    const { ready, total } = readyChildStats(moduleId, map, kind);
    const complete = ready === total;
    const firstBtn = moduleBtn(moduleId, kind);
    const label = (firstBtn && firstBtn.dataset.readyLabel) || moduleId;

    if (complete) {
      if (map[moduleId] !== true) { map[moduleId] = true; saveReadyMap(kind, map); }
    } else if (map[moduleId]) {
      delete map[moduleId];
      saveReadyMap(kind, map);
    }

    root.querySelectorAll('[data-ready-progress-for]').forEach((pill) => {
      if (pill.getAttribute('data-ready-progress-for') === moduleId && readyKindOf(pill) === kind) {
        paintReadyProgress(pill, { ready, total }, kind);
      }
    });
    root.querySelectorAll('[data-dsc-ready][data-ready-level="module"]').forEach((btn) => {
      if (btn.dataset.readyId !== moduleId || readyKindOf(btn) !== kind) return;
      btn.classList.remove('is-gated');
      btn.removeAttribute('aria-disabled');
      const switchText = readySwitchText(kind, complete);
      const textEl = btn.querySelector('.dash-brand-toggle-text');
      if (textEl) textEl.textContent = switchText;
      btn.setAttribute('aria-label', switchText + (label ? ' for ' + label : ''));
      if (complete) {
        btn.classList.add('is-on');
        btn.setAttribute('aria-checked', 'true');
        btn.title = spec.titleOn;
      } else {
        btn.classList.remove('is-on');
        btn.setAttribute('aria-checked', 'false');
        btn.title = spec.markAll(label);
      }
      const wrap = btn.closest('.dsc-ready--ai');
      if (wrap) wrap.classList.toggle('is-partial', kind === 'ai' && readyProgressPartial({ ready, total }));
    });
  }

  function markModuleChildrenReady(moduleId, kind) {
    kind = kind === 'ai' ? 'ai' : 'dev';
    const kids = readyKids(moduleId, kind);
    const map = loadReadyMap(kind);
    kids.forEach((c) => { map[c.id] = true; });
    map[moduleId] = true;
    saveReadyMap(kind, map);
    kids.forEach((c) => syncItemReadyButtons(root, c.id, true, kind));
    refreshParent(moduleId, kind);
  }

  function openReadyVerifyModal(moduleId, label, kind) {
    kind = kind === 'ai' ? 'ai' : 'dev';
    const spec = readySpec(kind);
    const kids = readyKids(moduleId, kind);
    if (!kids.length) return;
    const stats = readyChildStats(moduleId, loadReadyMap(kind), kind);
    if (stats.ready >= stats.total) return;
    const pending = stats.total - stats.ready;
    closeReadyVerifyModal();

    const scrim = document.createElement('div');
    scrim.className = 'adm-modal-scrim dsc-ready-scrim';
    scrim.setAttribute('data-ready-verify', moduleId);

    function paint(step) {
      const first = step === 1;
      const title = first
        ? spec.verifyTitle(label)
        : 'Confirm you want every part ready';
      const sub = first
        ? (esc(label) + ' has <strong>' + stats.total + '</strong> parts. <strong>'
          + pending + '</strong> ' + (pending === 1 ? 'is' : 'are') + ' still off'
          + (stats.ready ? ', <strong>' + stats.ready + '</strong> already on' : '')
          + '. ' + spec.verifyContinue)
        : spec.verifyConfirm(stats.total, esc(label));
      scrim.innerHTML = `
        <div class="adm-modal" role="dialog" aria-modal="true" aria-labelledby="dsc-ready-verify-title">
          <button type="button" class="adm-modal-x" data-ready-verify-act="close" aria-label="Close">
            <span class="material-symbols-outlined">close</span>
          </button>
          <div class="adm-modal-head">
            <div class="adm-modal-eyebrow">${first ? 'Verify · 1 of 2' : 'Verify again · 2 of 2'}</div>
            <h2 class="adm-modal-title" id="dsc-ready-verify-title">${esc(title)}</h2>
            <p class="adm-modal-sub">${sub}</p>
          </div>
          <div class="adm-modal-body">
            <div class="dsc-ready-verify-steps" aria-hidden="true">
              <span class="dsc-ready-verify-dot${first ? ' is-on' : ' is-done'}"></span>
              <span class="dsc-ready-verify-dot${first ? '' : ' is-on'}"></span>
            </div>
            <div class="dsc-ready-verify-actions">
              <button type="button" class="adm-btn adm-btn--ghost" data-ready-verify-act="close">Cancel</button>
              <button type="button" class="adm-btn adm-btn--primary" data-ready-verify-act="${first ? 'next' : 'confirm'}">
                <span class="material-symbols-outlined">${first ? 'arrow_forward' : 'task_alt'}</span>
                ${first ? 'Continue' : spec.confirmLabel}
              </button>
            </div>
          </div>
        </div>`;
      scrim.querySelector('.adm-btn--primary')?.focus();
    }

    document.body.appendChild(scrim);
    readyVerifyEl = scrim;
    paint(1);
    requestAnimationFrame(() => scrim.classList.add('is-open'));
    scrim.addEventListener('click', (e) => {
      if (e.target === scrim) { closeReadyVerifyModal(); return; }
      const act = e.target.closest('[data-ready-verify-act]');
      if (!act) return;
      const actKind = act.getAttribute('data-ready-verify-act');
      if (actKind === 'close') closeReadyVerifyModal();
      else if (actKind === 'next') paint(2);
      else if (actKind === 'confirm') {
        closeReadyVerifyModal();
        markModuleChildrenReady(moduleId, kind);
      }
    });
    document.addEventListener('keydown', readyVerifyKeyHandler);
  }

  root._markModuleChildrenReady = markModuleChildrenReady;
  root._openReadyVerifyModal = openReadyVerifyModal;
  root._refreshReadyParent = refreshParent;

  /* One delegated handler so rail copies, library cards, and panes injected
     by Re-evaluate all flip the same stored flag — and every matching switch
     stays in sync for its own kind. */
  if (!root._dscReadyWired) {
    root._dscReadyWired = true;
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-dsc-ready]');
      if (!btn || !root.contains(btn)) return;
      e.stopPropagation();
      const id = btn.dataset.readyId;
      if (!id) return;
      const kind = readyKindOf(btn);
      const level = btn.dataset.readyLevel || 'item';

      /* Accordion switch with parts: already complete is a no-op; otherwise
         the two-step verify modal marks every child ready. */
      if (level === 'module' && readyKids(id, kind).length) {
        if (btn.getAttribute('aria-checked') === 'true') return;
        root._openReadyVerifyModal(id, btn.dataset.readyLabel || id, kind);
        return;
      }

      const next = btn.getAttribute('aria-checked') !== 'true';
      const map = loadReadyMap(kind);
      if (next) map[id] = true; else delete map[id];
      saveReadyMap(kind, map);

      if (level === 'item') syncItemReadyButtons(root, id, next, kind);
      else paintItemReady(btn, next);

      /* A flipped child re-scores its parent. */
      const parent = btn.dataset.readyParent;
      if (parent && typeof root._refreshReadyParent === 'function') {
        root._refreshReadyParent(parent, kind);
      }
    });
  }

  /* Initial pass so every parent reflects its stored children (and can never
     start "on" while a part is still unfinished). */
  Object.keys(DEV_READY_CHILDREN).forEach((id) => {
    refreshParent(id, 'dev');
    refreshParent(id, 'ai');
  });
}

async function jumpToComponent(root, name) {
  await expandAccordionSection(root, 'mi-components');
  if (typeof dscRevealAll === 'function') dscRevealAll();
  const card = Array.from(root.querySelectorAll('[data-ds-comp]'))
    .find((el) => el.dataset.compName === name);
  if (!card) return;
  if (card.classList.contains('is-locked')) {
    card.classList.remove('is-flash');
    void card.offsetWidth;
    card.classList.add('is-flash');
    requestAnimationFrame(() => {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return;
  }
  setCompCardCollapsed(card, false);
  if (name === 'Report builder') refreshRptNudge();
  if (name === 'Charts & graphs') {
    takeAzCompNudge();
    observePreviewFrames(card);
    refreshAzCompNudge();
  }
  const grid = root.querySelector('#dsc-grid');
  if (grid && typeof grid._bootComposersIn === 'function') grid._bootComposersIn(card);
  if (grid && typeof grid._bootChatMenuIn === 'function') grid._bootChatMenuIn(card);
  if (grid && typeof grid._bootAppSearchIn === 'function') grid._bootAppSearchIn(card);
  if (grid && typeof grid._bootAskDemoIn === 'function') grid._bootAskDemoIn(card);
  card.classList.remove('is-flash');
  void card.offsetWidth;
  card.classList.add('is-flash');
  requestAnimationFrame(() => {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

async function jumpToDirectoryModule(root, href) {
  await expandAccordionSection(root, 'mi-directory');
  const card = Array.from(root.querySelectorAll('[data-mod-card]'))
    .find((el) => (el.getAttribute('data-href') || el.getAttribute('href')) === href);
  const pane = Array.from(root.querySelectorAll('[data-pane]'))
    .find((el) => el.getAttribute('data-href') === href);
  const target = card || pane;
  if (!target) return;
  target.classList.remove('is-flash');
  void target.offsetWidth;
  target.classList.add('is-flash');
  requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function wirePaneCompJumps(root) {
  if (root._paneCompJumpsWired) return;
  root._paneCompJumpsWired = true;
  root.addEventListener('click', (e) => {
    const mod = e.target.closest('[data-jump-mod]');
    if (mod && root.contains(mod)) {
      e.preventDefault();
      jumpToDirectoryModule(root, mod.getAttribute('data-jump-mod'));
      return;
    }
    const a = e.target.closest('[data-jump-comp]');
    if (!a || !root.contains(a)) return;
    e.preventDefault();
    jumpToComponent(root, a.getAttribute('data-jump-comp'));
  });
}

/* WISEcodeAI dock config for this page — a light welcome that points at the four
   modules and can jump to any of them. */
export const ALL_MODULES_WISEAI = {
  sub: 'Your app’s codebase stats, module map, icon inventory, design system, component library, transcript architecture, motion catalog, and how the platform responds from phone to a wide display.',
  chipsFlow: 'wrap',
  intents: [
    { intent: 'whatsnew', label: 'Latest updates', icon: 'new_releases' },
    { intent: 'codebase', label: 'How big is the codebase?', icon: 'code' },
    { intent: 'directory', label: 'Jump to the Module Directory', icon: 'apps' },
    { intent: 'tables', label: 'Show every table', icon: 'table_chart' },
    { intent: 'logic', label: 'What logic runs on each page?', icon: 'rule' },
    { intent: 'intents', label: 'Which intent chips work?', icon: 'bolt' },
    { intent: 'icons', label: 'Jump to the Icon Inventory', icon: 'emoji_symbols' },
    { intent: 'design', label: 'Jump to the Design System', icon: 'palette' },
    { intent: 'components', label: 'Jump to the Component Library', icon: 'widgets' },
    { intent: 'reportbuilder', label: 'How does the report builder work?', icon: 'description' },
    { intent: 'tarch', label: 'Show the transcript architecture', icon: 'account_tree' },
    { intent: 'motion', label: 'Show animations & resize', icon: 'animation' },
    { intent: 'responsive', label: 'How responsive is the platform?', icon: 'devices' },
    { intent: 'counts', label: 'How many icons are there?', icon: 'tag' },
  ],
  intentReplies: {
    whatsnew: 'From the <strong>past day</strong>: <strong>Analytics Types</strong> is a new accordion on this page — every chart from the Analytics Types catalog as thumbnails, tap one to open it full size. The same gallery is a new <strong>Charts &amp; graphs</strong> section in the Component Library, with a gold “This is new!” on both. From <strong>the other day</strong>: <strong>Transcript Architecture</strong> (one frozen conversation, every piece labeled) and the <strong>Report builder</strong> (plus the charts you want, generate, then save or share). Open any of those from the chips below, or the Progress Log for the day-by-day write-up.',
    codebase: () => {
      const now = codeState.now || {};
      return `The project on disk is <strong>${fmtScanBytes(now.bytes)}</strong> across <strong>${fmtNum(now.allFiles)} files</strong> — code ${fmtScanBytes(now.codeBytes)}, images ${fmtScanBytes(now.imageBytes)}, video ${fmtScanBytes(now.videoBytes)}. Hand-written code is <strong>${fmtNum(now.total)} lines</strong> in <strong>${fmtNum(now.files)} files</strong> — ${fmtNum(now.html)} HTML, ${fmtNum(now.js)} JavaScript, ${fmtNum(now.css)} CSS and ${fmtNum(now.py)} Python — shipping <strong>${fmtNum(now.pages)} HTML pages</strong>. The Codebase score cards above the directory show both the size and the line-count trend.`;
    },
    directory: 'The <strong>Module Directory</strong> lists every workspace, account, chat, report, product, auth and marketing screen in the app.',
    tables: `The <strong>Table Gallery</strong> collects all <strong>${TABLE_CATALOG.length} data tables</strong> in the app — portfolio grids, verification and analytics tables, admin boards, the ingredient registry and more — rendered live in one carousel, each isolated from its page.`,
    logic: () => {
      if (!APP_LOGIC.length) {
        ensureAppLogic();
        return `The <strong>App Logic</strong> module writes down the behavioral rules the app runs on — auth, theme, navigation, pane widths, tables, wizard gating, scoring math, filter semantics and what persists where — grouped by page.`;
      }
      const shared = APP_LOGIC.filter((p) => p.area === 'shared').reduce((n, p) => n + p.rules.length, 0);
      return `The <strong>App Logic</strong> module writes down all <strong>${logicRuleCount()} behavioral rules</strong> in the app across <strong>${APP_LOGIC.length} pages</strong> — auth, theme, navigation, pane widths, tables, wizard gating, scoring math, filter semantics and what persists where. <strong>${shared}</strong> of them are shared subsystems that run on every page; the rest are page-specific. Every rule names the functions, storage keys and classes it lives in.`;
    },
    intents: () => {
      const s = intentAuditStats();
      return s.gaps
        ? `I audited all <strong>${s.chips} intent chips</strong> across <strong>${s.surfaces} surfaces</strong>: <strong>${s.wired} are fully wired</strong> (transcript + logic), while <strong>${s.gaps} are missing a half</strong> — ${s.talk} need logic, ${s.act} need their own transcript${s.none ? `, ${s.none} are fully unwired` : ''}. The <strong>Intent Chip Logic</strong> module calls each one out.`
        : `All <strong>${s.chips} intent chips</strong> across <strong>${s.surfaces} surfaces</strong> are fully wired — every one carries both its own transcript and its own logic. See the <strong>Intent Chip Logic</strong> module.`;
    },
    icons: 'The <strong>Icon Inventory</strong> catalogs every Material Symbols glyph used in the live app (this page excluded), grouped by surface — chat module, primary nav, top bar and so on — with label and exact placements. The expectation is the <strong>light (rounded) SVG at weight 400</strong>, with a few per-glyph exceptions; preview outlined, filled, or light, and flip <strong>Font/SVG</strong> to compare the live webfont against Google\u2019s SVG export \u2014 the vectors are generated locally by <code>scripts/gen_icon_svgs.py</code>, so SVG mode needs no network at all.',
    design: 'The <strong>Design System</strong> documents the app’s fonts (families, sizes, usage) and every color, line, elevation and radius token — with live swatches that follow the current theme.',
    components: 'The <strong>Component Library</strong> renders every reusable component in its default state with its real classes, its variations, and the surfaces where it’s used.',
    reportbuilder: 'The <strong>Report builder</strong> is how a conversation becomes a report. In Output, open the title dropdown, plus the charts you want, and tap <strong>Generate Report</strong>. That opens a nested drawer to the right of Output. You can rename the report and each chart, add a note, swap a chart for another output from the same thread, or delete one. <strong>Save or Share</strong> writes it to the Reports shelf — the same store Reformulation uses. Export as PDF prints the drawer. The card below is the live specimen.',
    tarch: 'The <strong>Transcript Architecture</strong> freezes one thread and labels every visible piece — History, transcript lines, the landmark strip, output chips, intent chips, the composer, the token readout, the admin <strong>Turns</strong> sticky drawer, and Roll · Crawl · Walk · Run. Each card links to that component in the library.',
    motion: `The <strong>Motion &amp; Resize</strong> module catalogs all <strong>${MOTION_ITEMS.length} motion systems</strong> — count-up, chart replay, streaming, chip shimmer and fly-in, output chip fan, chat composer sheen, both helixes, accordion open, sticky drawer slide-in, activity-strip ticks, the jam equalizer, plus the module splitter, five width tiers, drag-to-reorder and drag-to-file — each running live.`,
    responsive: () => {
      const screen = respScreenWidth();
      const chat = screen > RESP_CHAT_SINGLE_MAX ? 'double' : 'single';
      const display = screen > RESP_CHAT_SINGLE_MAX ? 'larger than a 14-inch laptop' : 'a 14-inch laptop class display';
      return `The platform codes for three sizes. On a <strong>phone</strong> the nav becomes an owl drawer, the modules stack, and tables become cards. On a <strong>14-inch laptop</strong> you get the desktop shell and chat opens single. On anything <strong>larger</strong> the shell stays the same and chat opens double. This display is ${screen}&nbsp;px — ${display} — so chat loads <strong>${chat}</strong>. The <strong>Responsiveness</strong> catalog names what each surface does at each size.`;
    },
    counts: () => {
      const n = ICON_INVENTORY && ICON_INVENTORY.totalUniqueIcons;
      if (!n) {
        ensureIconInventory();
        return `The <strong>Icon Inventory</strong> catalogs every Material Symbols glyph used in the live app, grouped by surface, with label and exact placements.`;
      }
      return `There are <strong>${n} unique icons</strong> across <strong>${ICON_INVENTORY.totalUses} placements</strong> in the app.`;
    },
  },
  onIntent: (intent) => {
    /* "How big is the codebase?" is a question, not just a jump — open + scroll
       the score cards into view AND let the sizing answer post in the thread. */
    if (intent === 'whatsnew') return false;
    if (intent === 'codebase') {
      expandAccordionSection(document, 'mi-code').then(() => {
        document.getElementById('mi-code')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return false;
    }
    /* "What logic runs on each page?" is a question — open + scroll to the
       catalog AND let the summary post in the thread. */
    if (intent === 'logic') {
      expandAccordionSection(document, 'mi-logic').then(() => {
        document.getElementById('mi-logic')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return false;
    }
    /* "Which intent chips work?" is a question — open + scroll to the audit
       module AND let the state-aware answer post in the thread. */
    if (intent === 'intents') {
      expandAccordionSection(document, 'mi-intents').then(() => {
        document.getElementById('mi-intents')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return false;
    }
    if (intent === 'tarch') {
      expandAccordionSection(document, 'mi-tarch').then(() => {
        document.getElementById('mi-tarch')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return false;
    }
    if (intent === 'responsive') {
      expandAccordionSection(document, 'mi-responsive').then(() => {
        document.getElementById('mi-responsive')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return false;
    }
    if (intent === 'reportbuilder') {
      jumpToComponent(document, 'Report builder');
      return false;
    }
    const id = intent === 'icons' ? 'mi-icons'
      : intent === 'directory' ? 'mi-directory'
      : intent === 'tables' ? 'mi-tables'
      : intent === 'analytics' ? 'mi-analytics'
      : intent === 'design' ? 'mi-design'
      : intent === 'components' ? 'mi-components'
      : intent === 'motion' ? 'mi-motion'
      : null;
    if (id) {
      expandAccordionSection(document, id).then(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return true;
    }
    return false;
  },
};
