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
 *      Chat / History / Data Sources / Turns, and Reformulation's Studio +
 *      Dashboard) each get their own card, with a final de-dup pass so nothing
 *      appears twice.
 *   2. Icon Inventory — every Material Icons / Symbols glyph used in the live
 *      app (this page excluded), grouped by surface (chat, primary nav, …),
 *      with family, usage count, label, and placements. Scanned by
 *      scripts/scan_icons.py into js/icon-inventory-data.js.
 *   3. Design System — the app's typography (families, live type scale, usage)
 *      and every color/radius/shadow token from pages/wise.css, rendered as
 *      live swatches that resolve their computed value in the current theme
 *      (and re-resolve when the theme flips).
 *   4. Component Library — every reusable component rendered LIVE in its
 *      default state using the real global classes from pages/wise.css, with
 *      its variants and the exact surfaces where it is used.
 *   5. Codebase — score cards for the size of the app itself: lines of code
 *      by file type with an up/down trend (one git snapshot per day) and the
 *      HTML page count. The data is scanned by scripts/scan_code_stats.py
 *      into js/code-stats-data.js.
 *   6. Motion & Resize — every animation (count-up, chart replay, streaming,
 *      chip shimmer / fly-in, welcome helix, thinking helix, accordion) and
 *      every drag/resize interaction (module splitter, width tiers, reorder,
 *      drag-to-file), explained and rendered live.
 */

import { ICON_INVENTORY } from './icon-inventory-data.js';
import { CODE_STATS } from './code-stats-data.js';
import { makeTraceHelix, measureTraceRungCentres, TRACE_STRAND_MARKUP } from './trace-helix.js';
import { composerDbSelectorHtml, wireChatComposer, createHelixBgAnim } from './wiseai-chat.js';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ------------------------------------------------------------------ */
/* Module Directory data                                               */
/*                                                                     */
/* One explicit, curated map of EVERY module and screen in the app,    */
/* grouped by product area. This is intentionally hand-maintained      */
/* (rather than flattened off the left-rail nav model) for two         */
/* reasons the nav model can't express:                                */
/*   • Several pages host more than one module. The WISEcodeAI studio       */
/*     (wiseai.html) hosts Chat, History, Data Sources and Turns as     */
/*     distinct docked modules; the Reformulation page hosts both the   */
/*     Reformulation Studio and the Reformulation Dashboard. Each gets  */
/*     its own directory entry here (a `#hash` keeps them distinct and  */
/*     still resolves to the real page).                                */
/*   • The nav model listed some surfaces (e.g. My profile) in more     */
/*     than one place, which surfaced as duplicate cards. Here every    */
/*     module appears exactly once. A final href de-dup pass in         */
/*     renderDirectory guards against any accidental repeat.            */
/* Marketing pages sit at the repo root, one level up from pages/.      */
const MODULE_SECTIONS = [
  {
    title: 'Workspace',
    tone: 'workspace',
    modules: [
      { label: 'Overview', icon: 'space_dashboard', href: 'overview.html' },
    ],
  },
  {
    title: 'Portfolio',
    tone: 'portfolio',
    modules: [
      { label: 'Product Portfolio', icon: 'handyman', href: 'product-portfolio.html' },
      { label: 'Comparison', icon: 'compare', href: 'product-comparison.html' },
      { label: 'NON-UPF Dashboard', icon: 'dashboard', href: 'non-upf-dashboard.html' },
      { label: 'Marketing Assets', icon: 'photo_library', href: 'marketing-assets.html' },
      { label: 'Add Product', icon: 'add_box', href: 'add-product.html' },
      { label: 'View Product', icon: 'inventory_2', href: 'view-product.html' },
    ],
  },
  {
    title: 'WISEcodeAI Studio',
    tone: 'ai',
    modules: [
      { label: 'Chat', icon: 'forum', href: 'wiseai.html' },
      { label: 'History', icon: 'history', href: 'wiseai.html#history' },
      { label: 'Data Sources', icon: 'hub', href: 'wiseai.html#data-sources' },
      { label: 'Turns', icon: 'alt_route', href: 'wiseai.html#turns' },
      { label: 'Library', icon: 'auto_stories', href: 'conversation-library.html' },
      { label: 'Ingredient Browser', icon: 'science', href: 'ingredient-browser.html' },
      { label: 'AI Dashboard', icon: 'space_dashboard', href: 'ai-dashboard.html' },
      { label: 'Studio & AI', icon: 'auto_awesome', href: 'studio-ai.html' },
    ],
  },
  {
    title: 'Reformulation',
    tone: 'reform',
    modules: [
      { label: 'Reformulation Studio', icon: 'auto_fix_high', href: 'reformulation.html' },
      { label: 'Reformulation Dashboard', icon: 'monitoring', href: 'reformulation.html#dashboard' },
    ],
  },
  {
    title: 'Reports & Analytics',
    tone: 'report',
    /* app-vision-deck.html is a standalone pitch deck and is intentionally
       omitted from this index (directory, rail preview, and screenshot export). */
    modules: [
      { label: 'Reports', icon: 'description', href: 'reports.html' },
      { label: 'Guiding Stars Report', icon: 'star', href: 'report-guiding-stars.html' },
      { label: 'Analytics Types', icon: 'insights', href: 'analytics-types.html' },
    ],
  },
  {
    title: 'Verification',
    tone: 'verify',
    modules: [
      { label: 'Non-UPF Verification', icon: 'verified', href: 'verification.html' },
      { label: 'GRAS Verification', icon: 'shield', href: 'gras-verification.html' },
    ],
  },
  {
    title: 'Admin',
    tone: 'admin',
    modules: [
      { label: 'My profile', icon: 'account_circle', href: 'profile.html' },
      { label: 'Invoices & Downloads', icon: 'receipt_long', href: 'invoices.html' },
      { label: 'Organizations', icon: 'apartment', href: 'organizations.html' },
      { label: 'Quick Invite', icon: 'bolt', href: 'quick-invite.html' },
      { label: 'User Management', icon: 'group', href: 'user-management.html' },
      { label: 'Audit Queue', icon: 'shield', href: 'audit-queue.html' },
      { label: 'Admin Utils', icon: 'build', href: 'admin-utils.html' },
      { label: 'Accessibility Review', icon: 'accessibility_new', href: 'accessibility-review.html', badge: 'Admin' },
    ],
  },
  {
    title: 'Account & Support',
    tone: 'account',
    modules: [
      { label: 'Agents', icon: 'smart_toy', href: 'agents.html' },
      { label: 'Alerts', icon: 'notifications', href: 'alerts.html' },
      { label: 'Preferences', icon: 'tune', href: 'preferences.html' },
      { label: 'API keys', icon: 'key', href: 'api-keys.html' },
      { label: 'Help', icon: 'help', href: 'help.html' },
      { label: 'Docs', icon: 'menu_book', href: 'docs.html' },
    ],
  },
  {
    title: 'Authentication',
    tone: 'auth',
    modules: [
      { label: 'Log in', icon: 'login', href: 'login.html' },
      { label: 'Create Account', icon: 'person_add', href: 'create-account.html' },
      { label: 'Forgot Password', icon: 'lock_reset', href: 'forgot-password.html' },
    ],
  },
  {
    title: 'Marketing site',
    tone: 'marketing',
    modules: [
      { label: 'Home', icon: 'home', href: '../index.html' },
      { label: 'Products', icon: 'category', href: '../marketing-products.html' },
      { label: 'Solutions', icon: 'lightbulb', href: '../marketing-solutions.html' },
      { label: 'Pricing', icon: 'sell', href: '../marketing-pricing.html' },
      { label: 'App', icon: 'phone_iphone', href: '../marketing-app.html' },
      { label: 'Coach', icon: 'sports', href: '../marketing-coach.html' },
      { label: 'Enterprise', icon: 'apartment', href: '../marketing-enterprise.html' },
      { label: 'WISEcodeAI', icon: 'auto_awesome', href: '../marketing-wiseai.html' },
      { label: 'GRAS', icon: 'verified', href: '../marketing-gras.html' },
      { label: 'Non-UPF', icon: 'eco', href: '../marketing-nonupf.html' },
      { label: 'Alliance', icon: 'handshake', href: '../marketing-alliance.html' },
    ],
  },
];

function moduleCard(m) {
  const badge = m.badge ? `<span class="mi-card-badge">${esc(m.badge)}</span>` : '';
  const group = m.group ? `<span class="mi-card-group">${esc(m.group)}</span>` : '';
  const search = `${m.label} ${m.href} ${m.group || ''} ${m.badge || ''}`.toLowerCase();
  return `
    <a class="mi-card" data-mod-card data-search="${esc(search)}" href="${esc(m.href)}">
      <span class="mi-card-ic"><span class="material-symbols-outlined">${esc(m.icon || 'widgets')}</span></span>
      <span class="mi-card-body">
        <span class="mi-card-name">${esc(m.label)}${badge}</span>
        <span class="mi-card-href">${esc(m.href)}</span>
        ${group}
      </span>
      <span class="mi-card-go material-symbols-outlined" aria-hidden="true">arrow_outward</span>
    </a>`;
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

function paneCard(m) {
  const search = `${m.label} ${m.href} ${m.group || ''} ${m.badge || ''}`.toLowerCase();
  return `
    <div class="mi-pane" data-pane data-href="${esc(m.href)}" data-search="${esc(search)}" data-area="${esc(m.area)}">
      <div class="mi-pane-head">
        <span class="mi-pane-ic material-symbols-outlined" aria-hidden="true">${esc(m.icon || 'widgets')}</span>
        <span class="mi-pane-name">${esc(m.label)}</span>
        <span class="mi-pane-area">${esc(m.areaTitle)}</span>
      </div>
      <a class="mi-pane-viewport" href="${esc(m.href)}" aria-label="Open ${esc(m.label)}">
        <iframe class="mi-pane-frame" src="${esc(previewSrc(m.href))}" title="${esc(m.label)} preview" loading="lazy" tabindex="-1" aria-hidden="true"></iframe>
        <span class="mi-pane-open material-symbols-outlined">open_in_new</span>
      </a>
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
  return [
    { action: 'dir-grid', icon: 'grid_view', label: 'Grid view' },
    { action: 'dir-rail', icon: 'view_column', label: 'Rail view' },
    { action: 'dir-clear', icon: 'restart_alt', label: 'Clear filters' },
  ];
}

function moduleControlsHTML(moduleId) {
  const items = moduleMoreItems(moduleId).map((it) =>
    `<button type="button" class="topbar-menu-item" data-mi-action="${esc(it.action)}">
      <span class="material-symbols-outlined topbar-menu-icon">${esc(it.icon)}</span>
      <span>${esc(it.label)}</span>
    </button>`).join('');
  return `
    <div class="panel-controls" data-mi-controls="${esc(moduleId)}">
      <div class="panel-more-wrap">
        <button type="button" class="panel-more-btn" data-mi-more aria-haspopup="menu" aria-expanded="false" title="More options" aria-label="Module options"><span class="material-symbols-outlined">more_vert</span></button>
        <div class="topbar-popover hidden" data-mi-more-pop role="menu">${items}</div>
      </div>
    </div>`;
}

/* Material icon per directory area, used on the segment scorecards. */
const AREA_ICONS = {
  workspace: 'workspaces',
  portfolio: 'inventory_2',
  ai: 'auto_awesome',
  reform: 'auto_fix_high',
  report: 'insights',
  verify: 'verified',
  admin: 'shield',
  account: 'account_circle',
  auth: 'lock',
  marketing: 'campaign',
};

function directorySection(sec) {
  const { title, tone, modules } = sec;
  if (!modules.length) return '';
  return `
    <section class="mi-dir-section" data-area="${esc(tone)}">
      <div class="mi-dir-head">
        <h3 class="mi-dir-title">${esc(title)}</h3>
        <span class="mi-dir-count">${modules.length}</span>
        ${readyToggleHTML('dir:' + tone, title, { level: 'item', parent: 'mi-directory' })}
      </div>
      <div class="mi-card-grid">${modules.map(moduleCard).join('')}</div>
    </section>`;
}

function renderDirectory() {
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
            than one module — the WISEcodeAI studio (Chat, History, Data Sources, Turns) and Reformulation
            (Studio + Dashboard) — are broken out so each module appears exactly once.</p>
        </div>
        ${moduleReadyToggleHTML('mi-directory', 'Module Directory')}
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
  { label: 'Marketing Assets tree', href: 'marketing-assets.html', selector: '#ma-root-table', icon: 'photo_library', area: 'portfolio', areaTitle: 'Portfolio', desc: 'Nested file tree of the co-branding toolkit.' },

  /* WISEcodeAI Studio */
  { label: 'AI Dashboard · Users', href: 'ai-dashboard.html', selector: '#aid-user-table', icon: 'group', area: 'ai', areaTitle: 'WISEcodeAI Studio', desc: 'Per-user AI activity and usage.' },
  { label: 'Ingredient Browser', href: 'ingredient-browser.html', selector: '#ib-table', icon: 'science', area: 'ai', areaTitle: 'WISEcodeAI Studio', desc: 'The full ingredient registry with GRAS status.' },
  { label: 'Chat · Ingredient table', href: 'wiseai.html', page: 'WISEcodeAI Chat', selector: '.wa-tbl', icon: 'forum', area: 'ai', areaTitle: 'WISEcodeAI Studio', desc: 'The sortable ingredient table rendered inside a chat answer.' },

  /* Reformulation */
  { label: 'Reformulation · Picks', href: 'reformulation.html', hash: 'rf-dash-pick', page: 'Reformulation Dashboard', selector: '.rf-table:not(.rf-table--moves)', icon: 'auto_fix_high', area: 'reform', areaTitle: 'Reformulation', desc: 'Products you can pick to reformulate.' },
  { label: 'Reformulation · Moves', href: 'reformulation.html', page: 'Reformulation Dashboard', selector: '#rf-moves-table', icon: 'route', area: 'reform', areaTitle: 'Reformulation', desc: 'Recommended ingredient moves with impact and effort.' },

  /* Reports & Analytics */
  { label: 'Guiding Stars', href: 'report-guiding-stars.html', selector: '#gs-table', icon: 'star', area: 'report', areaTitle: 'Reports', desc: 'Every product scored on the Guiding Stars scale.' },
  { label: 'Analytics · UPF', href: 'analytics-types.html', selector: '#upf-table-wrap', icon: 'insights', area: 'report', areaTitle: 'Reports', desc: 'Portfolio UPF classification matrix.' },
  { label: 'Analytics · GRAS status', href: 'analytics-types.html', selector: '#gras-table-wrap', icon: 'verified', area: 'report', areaTitle: 'Reports', desc: 'GRAS status broken down across the portfolio.' },
  { label: 'Analytics · Processing', href: 'analytics-types.html', selector: '#proc-table-wrap', icon: 'blender', area: 'report', areaTitle: 'Reports', desc: 'Processing-level (NOVA) distribution table.' },
  { label: 'Analytics · GRAS by product', href: 'analytics-types.html', selector: '#gras-prod-table-wrap', icon: 'table_rows', area: 'report', areaTitle: 'Reports', desc: 'GRAS documentation status per product.' },

  /* Verification */
  { label: 'Non-UPF · Select', href: 'verification.html', selector: '.vf-table', icon: 'verified', area: 'verify', areaTitle: 'Verification', desc: 'Qualifying SKUs to run through Non-UPF verification.' },
  { label: 'GRAS · Ingredients', href: 'gras-verification.html', selector: '.gv-table', icon: 'shield', area: 'verify', areaTitle: 'Verification', desc: 'Ingredient-level GRAS documentation table.' },

  /* Admin */
  { label: 'Organizations', href: 'organizations.html', selector: '.adm-table', icon: 'apartment', area: 'admin', areaTitle: 'Admin', desc: 'Customer org directory with member counts.' },
  { label: 'User Management', href: 'user-management.html', selector: '.adm-table', icon: 'group', area: 'admin', areaTitle: 'Admin', desc: 'Users and roles across the workspace.' },
  { label: 'Audit Queue', href: 'audit-queue.html', selector: '.adm-table', icon: 'fact_check', area: 'admin', areaTitle: 'Admin', desc: 'Ingredient audit review queue.' },
  { label: 'Non-UPF Dashboard', href: 'non-upf-dashboard.html', selector: '.adm-table', icon: 'dashboard', area: 'admin', areaTitle: 'Admin', desc: 'Verification analytics board.' },
  { label: 'Quick Invite · History', href: 'quick-invite.html', selector: '.adm-table', icon: 'bolt', area: 'admin', areaTitle: 'Admin', desc: 'Recent one-step org invitations.' },
  { label: 'Accessibility · Contrast', href: 'accessibility-review.html', selector: '#contrast .table-wrap table', icon: 'contrast', area: 'admin', areaTitle: 'Admin', desc: 'Live text-contrast ratios graded to AAA.' },
  { label: 'Accessibility · Non-text', href: 'accessibility-review.html', selector: '#nontext .table-wrap table', icon: 'category', area: 'admin', areaTitle: 'Admin', desc: 'Non-text / UI contrast against the 3:1 rule.' },

  /* Account */
  { label: 'Invoices', href: 'invoices.html', selector: '.inv-table', icon: 'receipt_long', area: 'account', areaTitle: 'Account', desc: 'Billing board of every invoice and its status.' },
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
    <div class="mi-pane mi-tpane" data-pane data-tpane data-href="${esc(path)}" data-search="${esc(search)}" data-area="${esc(t.area)}">
      <a class="mi-pane-head" href="${esc(open)}" aria-label="Open ${esc(t.label)} on ${esc(page)}">
        <span class="mi-pane-ic material-symbols-outlined" aria-hidden="true">${esc(t.icon || 'table_chart')}</span>
        <span class="mi-pane-name">${esc(t.label)}</span>
        <span class="mi-pane-area">${esc(t.areaTitle)}</span>
      </a>
      <div class="mi-pane-viewport">
        <iframe class="mi-pane-frame" src="${esc(previewSrc(path))}" data-focus="${esc(t.selector)}" title="${esc(t.label)} table preview" loading="lazy" tabindex="-1" aria-hidden="true"></iframe>
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

function renderTableGallery() {
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
        ${moduleReadyToggleHTML('mi-tables', 'Table Gallery')}
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
/* Codebase module — lines-of-code score cards with git-history trend  */
/* ------------------------------------------------------------------ */

function fmtNum(n) {
  return Number(n || 0).toLocaleString('en-US');
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

/* All-time sparkline of total LOC — one point per daily git snapshot. */
function codeSparkline(series) {
  const vals = series.map((e) => e.total);
  if (vals.length < 2) return '';
  const W = 100;
  const H = 32;
  const PAD = 2;
  const min = Math.min(...vals);
  const span = Math.max(1, Math.max(...vals) - min);
  const pts = vals.map((v, i) => [
    (i / (vals.length - 1)) * W,
    PAD + (1 - (v - min) / span) * (H - PAD * 2),
  ]);
  const line = pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const area = `M${pts[0][0].toFixed(2)},${H} ` +
    pts.map(([x, y]) => `L${x.toFixed(2)},${y.toFixed(2)}`).join(' ') +
    ` L${pts[pts.length - 1][0].toFixed(2)},${H} Z`;
  return `
    <svg class="mi-code-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <path class="mi-code-spark-fill" d="${area}"></path>
      <polyline class="mi-code-spark-line" points="${line}"></polyline>
    </svg>`;
}

function renderCodebase() {
  const now = (CODE_STATS && CODE_STATS.now) || { total: 0, files: 0, pages: 0 };
  const series = (CODE_STATS && CODE_STATS.series) || [];
  const first = series[0];
  const cards = CODE_METRICS.map((m) => `
    <article class="mi-code-card">
      <div class="mi-code-top">
        <span class="mi-code-ic"><span class="material-symbols-outlined">${esc(m.icon)}</span></span>
        <span class="mi-code-pill" data-code-pill="${esc(m.key)}"></span>
      </div>
      <div class="mi-code-num">${fmtNum(now[m.key])}</div>
      <div class="mi-code-label">${esc(m.label)}</div>
      <div class="mi-code-sub">${esc(m.sub)}</div>
    </article>`).join('');
  return `
    <section class="mi-module is-collapsed" id="mi-code">
      <header class="mi-module-head">
        <div class="mi-module-head-text">
          <h2 class="mi-module-title">Codebase</h2>
          <p class="mi-module-lede">How big the app itself is — lines of hand-written HTML, JavaScript, CSS and
            Python (generated data blobs excluded) with an up/down trend from one git snapshot per day, plus the
            HTML page count. Generated by <code>scripts/scan_code_stats.py</code>.</p>
        </div>
        ${moduleReadyToggleHTML('mi-code', 'Codebase')}
        ${moduleControlsHTML('mi-code')}
      </header>

      <div class="mi-toolbar">
        <div class="ii-sort" role="group" aria-label="Trend window">
          <button type="button" class="ii-filter is-active" data-code-win="7" aria-pressed="true">7 days</button>
          <button type="button" class="ii-filter" data-code-win="30" aria-pressed="false">30 days</button>
          <button type="button" class="ii-filter" data-code-win="all" aria-pressed="false">All time</button>
        </div>
        <span class="mi-code-updated"><span class="material-symbols-outlined">history</span>Scanned ${esc(CODE_STATS?.generatedAt || '—')} · ${fmtNum(now.files)} files</span>
      </div>

      <div class="mi-code-grid">
        <article class="mi-code-card mi-code-hero">
          <div class="mi-code-hero-main">
            <div class="mi-code-top">
              <span class="mi-code-ic"><span class="material-symbols-outlined">code</span></span>
              <span class="mi-code-pill" data-code-pill="total"></span>
            </div>
            <div class="mi-code-num">${fmtNum(now.total)}</div>
            <div class="mi-code-label">Lines of code</div>
            <div class="mi-code-sub">HTML · JavaScript · CSS · Python across ${fmtNum(now.files)} files</div>
          </div>
          <div class="mi-code-hero-chart">
            ${codeSparkline(series)}
            ${first ? `<div class="mi-code-spark-cap">
              <span>${esc(first.date)}</span>
              <span>${fmtNum(first.total)} → ${fmtNum(now.total)} lines</span>
              <span>${esc(CODE_STATS?.generatedAt || '')}</span>
            </div>` : ''}
          </div>
        </article>
        ${cards}
      </div>
    </section>`;
}

function wireCodebase(root) {
  const mod = root.querySelector('#mi-code');
  if (!mod) return;
  const now = (CODE_STATS && CODE_STATS.now) || {};
  const series = (CODE_STATS && CODE_STATS.series) || [];

  /* The newest snapshot at or before (today − window days); the earliest
     snapshot when the history is shorter than the window (or for "all"). */
  const baselineFor = (win) => {
    if (!series.length) return null;
    if (win === 'all') return series[0];
    const cut = new Date((CODE_STATS.generatedAt || new Date().toISOString().slice(0, 10)) + 'T00:00:00Z');
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
    const base = baselineFor(win);
    mod.querySelectorAll('[data-code-pill]').forEach((pill) => {
      const key = pill.getAttribute('data-code-pill');
      if (!base) { pill.hidden = true; return; }
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
  applyWindow('7');
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

/** The app renders only Material Symbols, so a glyph's variant is the real
    distinction — outlined vs rounded (an icon can appear as both). */
function variantKeys(families) {
  return Array.from(new Set(families.map((f) =>
    f.includes('rounded') ? 'rounded' : f.includes('sharp') ? 'sharp' : 'outlined'
  ))).join(' ');
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
  const famKey = variantKeys(ic.families);
  return `
    <div class="ii-card" data-icon-card data-name="${esc(ic.name)}" data-count="${esc(ic.count)}" data-fam="${esc(famKey)}" data-groups="${esc(groups.join(' '))}" data-search="${esc(search)}">
      <button type="button" class="ii-card-main" data-ii-toggle aria-expanded="false">
        <span class="ii-glyph"><span class="${dcls}">${esc(ic.name)}</span></span>
        <span class="ii-meta">
          <span class="ii-name">${esc(ic.name)}</span>
          ${label ? `<span class="ii-label">${label}</span>` : '<span class="ii-label ii-label-none">no nearby label</span>'}
          <span class="ii-tagrow">${familyTags(ic.families)}${groupTags(groups, catalog)}<span class="ii-count" title="${esc(ic.count)} uses across the app"><span class="material-symbols-outlined">tag</span>${esc(ic.count)}</span></span>
        </span>
        <span class="ii-chev material-symbols-outlined" aria-hidden="true">expand_more</span>
      </button>
      <div class="ii-places" hidden>
        <div class="ii-places-title">Placements (${ic.placements.length}${ic.count > ic.placements.length ? ' of ' + ic.count : ''})</div>
        <ul class="ii-place-list">${placementRows(ic.placements)}</ul>
      </div>
    </div>`;
}

function renderIconInventory() {
  const data = ICON_INVENTORY || { icons: [], totalUniqueIcons: 0, totalUses: 0, groups: [] };
  const icons = (data.icons || []).slice();
  const groups = data.groups || [];
  const outlinedCount = icons.filter((i) => i.families.some((f) => f.includes('outlined'))).length;
  const roundedCount = icons.filter((i) => i.families.some((f) => f.includes('rounded'))).length;
  const groupCards = groups.map((g) => `
        <button type="button" class="mi-stat" data-ii-group="${esc(g.id)}" aria-pressed="false">
          <span class="mi-stat-num">${g.count}</span>
          <span class="mi-stat-label"><span class="mi-stat-text">${esc(g.label)}</span><span class="material-symbols-outlined">${esc(g.icon)}</span></span>
        </button>`).join('');
  return `
    <section class="mi-module is-collapsed" id="mi-icons">
      <header class="mi-module-head">
        <div class="mi-module-head-text">
          <h2 class="mi-module-title">Icon Inventory</h2>
          <p class="mi-module-lede">Every Material Symbols glyph used in the live app — its variant, how
            many times it appears, a representative label, and the exact placements (file and line).
            This page is excluded from the scan so the catalog is not polluted by its own chrome.
            Toggle a group to see just the chat module, primary nav, and so on. Generated by
            <code>scripts/scan_icons.py</code>.</p>
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
        <div class="ii-sort" role="group" aria-label="Variant">
          <button type="button" class="ii-filter is-active" data-ii-fam="all" aria-pressed="true">All variants</button>
          <button type="button" class="ii-filter" data-ii-fam="outlined" aria-pressed="false">Outlined · ${outlinedCount}</button>
          <button type="button" class="ii-filter" data-ii-fam="rounded" aria-pressed="false">Rounded · ${roundedCount}</button>
        </div>
      </div>

      <div class="mi-stats" id="ii-group-stats" role="group" aria-label="Filter icons by group">
        <button type="button" class="mi-stat is-active" data-ii-group="all" aria-pressed="true">
          <span class="mi-stat-num">${data.totalUniqueIcons}</span>
          <span class="mi-stat-label"><span class="mi-stat-text">All icons</span><span class="material-symbols-outlined">emoji_symbols</span></span>
        </button>
        ${groupCards}
        <button type="button" class="mi-stat" disabled>
          <span class="mi-stat-num">${data.totalUses}</span>
          <span class="mi-stat-label"><span class="mi-stat-text">Total uses</span><span class="material-symbols-outlined">tag</span></span>
        </button>
      </div>

      <div class="ii-empty" id="ii-empty" hidden>No icons match your filter.</div>
      <div class="ii-grid" id="ii-grid">
        ${icons.map((ic) => iconCard(ic, groups)).join('')}
      </div>
    </section>`;
}

/* ------------------------------------------------------------------ */
/* Design System module — typography + color/radius/shadow tokens      */
/* ------------------------------------------------------------------ */

/* The four faces the app actually loads/declares (see each page's <head> and
   the WISE Digits @font-face at the top of pages/wise.css). */
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
    name: 'WISE Digits',
    css: "'WISE Digits', 'SF Mono', ui-monospace, Menlo, monospace",
    weights: 'Synthetic @font-face · four weight buckets 100–900',
    use: 'A digit-only family (unicode-range U+0030–39) that resolves to the local mono stack. Prepended to every font stack so every numeral in the app renders mono while letters fall through.',
    sample: '0123456789 · 62% · $1,480.00',
  },
  {
    name: 'SF Mono stack',
    css: "'SF Mono', ui-monospace, Menlo, monospace",
    weights: 'System faces · 400–700 as available',
    use: 'Code and file paths — icon ligature names, module hrefs, placement rows, token names, inline <code>.',
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
    title: 'Surfaces',
    note: 'The four-step elevation ramp. Warm paper in light mode, deep navy in dark.',
    swatches: [
      { token: '--bg', use: 'App background behind everything' },
      { token: '--surface', use: 'Cards, panels, popovers' },
      { token: '--surface-2', use: 'Inset fills — inputs, hover rows, code chips' },
      { token: '--surface-3', use: 'Deepest inset — pressed / active fills' },
    ],
  },
  {
    title: 'Ink',
    note: 'Text colors. Muted and subtle are tuned to clear WCAG AAA (7:1) on every surface they sit on, in both themes.',
    swatches: [
      { token: '--text', kind: 'ink', use: 'Primary text and headings' },
      { token: '--text-muted', kind: 'ink', use: 'Secondary copy, ledes, menu items' },
      { token: '--text-subtle', kind: 'ink', use: 'Quietest ink — eyebrows, captions, placeholders' },
    ],
  },
  {
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
    title: 'Semantic · green',
    note: 'Positive / verified. Vibrant fill, AAA-safe ink for text, 12% tint for chip fills.',
    swatches: [
      { token: '--sec-green', use: 'Fills, charts, dots' },
      { token: '--sec-green-text', kind: 'ink', use: 'Text on green tints (badges, deltas)' },
      { token: '--sec-green-10', use: 'Chip / badge fill' },
    ],
  },
  {
    title: 'Semantic · red',
    note: 'Negative / failed / destructive.',
    swatches: [
      { token: '--sec-red', use: 'Fills, alerts, notification dots' },
      { token: '--sec-red-text', kind: 'ink', use: 'Text on red tints, danger menu items' },
      { token: '--sec-red-10', use: 'Chip / badge fill' },
    ],
  },
  {
    title: 'Semantic · amber',
    note: 'Warning / pending / at-risk.',
    swatches: [
      { token: '--ter-amber', use: 'Fills, charts, dots' },
      { token: '--ter-amber-text', kind: 'ink', use: 'Text on amber tints' },
      { token: '--ter-amber-10', use: 'Chip / badge fill' },
    ],
  },
  {
    title: 'Lines',
    note: 'Borders are tinted from the brand blue (color-mix over --primary / --primary-bright) rather than neutral gray, so every card edge reads on-brand.',
    swatches: [
      { token: '--border', kind: 'border', use: 'Default card / divider stroke' },
      { token: '--border-strong', kind: 'border', use: 'Inputs, emphasized edges' },
    ],
  },
  {
    title: 'Elevation',
    note: 'Three shadow steps. Dark theme swaps in deeper, softer shadows.',
    swatches: [
      { token: '--shadow-1', kind: 'shadow', use: 'Resting cards' },
      { token: '--shadow-2', kind: 'shadow', use: 'Hover lift, dropdowns' },
      { token: '--shadow-card', kind: 'shadow', use: 'Floating popovers / modals' },
    ],
  },
  {
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

function swatchHTML(sw) {
  const kind = sw.kind || 'fill';
  const bg = sw.fallback ? `var(${sw.token}, ${sw.fallback})` : `var(${sw.token})`;
  let chip = '';
  if (kind === 'ink') {
    chip = `<span class="ds-swatch-chip ds-swatch-chip--ink" style="color:${bg}">Ag</span>`;
  } else if (kind === 'border') {
    chip = `<span class="ds-swatch-chip ds-swatch-chip--border" style="border-color:${bg}"></span>`;
  } else if (kind === 'shadow') {
    chip = `<span class="ds-swatch-chip ds-swatch-chip--shadow" style="box-shadow:${bg}"></span>`;
  } else if (kind === 'radius') {
    chip = `<span class="ds-swatch-chip ds-swatch-chip--radius" style="border-radius:${bg}"></span>`;
  } else {
    chip = `<span class="ds-swatch-chip" style="background:${bg}"></span>`;
  }
  const val = kind === 'radius'
    ? `<span class="ds-swatch-val">${esc(sw.val || '')}</span>`
    : kind === 'shadow'
      ? '<span class="ds-swatch-val">theme-dependent</span>'
      : '<span class="ds-swatch-val" data-swatch-val>…</span>';
  return `
    <div class="ds-swatch" data-swatch data-kind="${esc(kind)}">
      ${chip}
      <span class="ds-swatch-meta">
        <span class="ds-swatch-name">${esc(sw.token)}</span>
        ${val}
        <span class="ds-swatch-use">${esc(sw.use)}</span>
      </span>
    </div>`;
}

function renderDesignSystem() {
  const familyCards = FONT_FAMILIES.map((f) => `
    <div class="ds-font-card">
      <div class="ds-font-sample" style="font-family:${esc(f.css)}">${esc(f.sample)}</div>
      <div class="ds-font-name">${esc(f.name)}</div>
      <code class="ds-font-stack">${esc(f.css)}</code>
      <div class="ds-font-weights">${esc(f.weights)}</div>
      <p class="ds-font-use">${esc(f.use)}</p>
    </div>`).join('');

  const typeRows = TYPE_SCALE.map((t) => `
    <div class="ds-type-row">
      <span class="ds-type-sample" style="${esc(t.style)}">${esc(t.sample || 'Wise nutrition 0123')}</span>
      <span class="ds-type-meta">
        <span class="ds-type-name">${esc(t.name)}${t.token ? ` <code>${esc(t.token)}</code>` : ''}</span>
        <span class="ds-type-spec">${esc(t.size)} ≈ ${esc(t.px)} · ${esc(t.weight)} · ${esc(t.family)}</span>
        <span class="ds-type-use">${esc(t.use)}</span>
      </span>
    </div>`).join('');

  const colorGroups = COLOR_GROUPS.map((g) => `
    <div class="ds-color-group">
      <div class="ds-group-head">
        <h4 class="ds-group-title">${esc(g.title)}</h4>
        ${readyToggleHTML('ds:' + g.title, g.title, { level: 'item', parent: 'mi-design' })}
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
          ${readyToggleHTML('ds:typography', 'Typography', { level: 'item', parent: 'mi-design' })}
        </div>
        <div class="ds-font-grid">${familyCards}</div>

        <div class="ds-block-head" style="margin-top:28px">
          <span class="mi-dir-title">Typography — type scale</span>
        </div>
        <div class="ds-type-table">${typeRows}</div>
        <p class="ds-footnote">Every numeral app-wide renders in mono via the synthetic
          <code>WISE Digits</code> family prepended to each stack. Body base is
          <code>--fs-ui</code> (0.75rem), user-scalable via <code>--wise-text-scale</code>.</p>
      </div>

      <div class="ds-block" id="ds-colors">
        <div class="ds-block-head">
          <span class="mi-dir-title">Color, line, elevation &amp; radius tokens</span>
        </div>
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
  'Top-bar icon button': 'Actions',
  'Intent chips': 'Chips & badges',
  'Large intent cards': 'Chips & badges',
  'Status pills': 'Chips & badges',
  'Status chips (domain)': 'Chips & badges',
  'Chat composer': 'Inputs & forms',
  'Form fields': 'Inputs & forms',
  'Data table': 'Tables & data',
  'Charts & graphs': 'Tables & data',
  'Distribution bar': 'Tables & data',
  'Dashboard card': 'Tables & data',
  'Pagination footer': 'Tables & data',
  'History conversation': 'Library & reports',
  'History project': 'Library & reports',
  'Library cards': 'Library & reports',
  'Library folders': 'Library & reports',
  'Report posters': 'Library & reports',
  'Scorecards': 'Filters',
  'Filter toolbar': 'Filters',
  'Menu popover': 'Overlays',
  'Row action menu': 'Overlays',
  'Modal dialog': 'Overlays',
  'Bottom sheet': 'Overlays',
  'Tooltip': 'Overlays',
  'Toast': 'Feedback',
  'Notification rows': 'Feedback',
  'Left-nav item': 'Navigation',
  'Avatar button': 'Navigation',
  'Avatars': 'Navigation',
};

function catOf(c) { return c.cat || CAT_BY_NAME[c.name] || 'Actions'; }

const COMPONENTS = [
  {
    name: 'Buttons',
    cls: '.dash-btn --primary / --ghost · .dash-text-link',
    used: 'Non-UPF Dashboard · Reports · Verification CTAs · Reformulation',
    demo: `
      <div class="dash-btn-row">
        <button type="button" class="dash-btn dash-btn--primary"><span class="material-symbols-outlined">rocket_launch</span>Primary action</button>
        <button type="button" class="dash-btn dash-btn--ghost">Ghost action</button>
        <button type="button" class="dash-text-link">View full report<span class="material-symbols-outlined">north_east</span></button>
      </div>`,
  },
  {
    name: 'Intent chips',
    wide: true,
    cls: '.chip · .ws-intent-chip · .sc-reply-chips .chip (+ .chip-primary, .chip-dive, .chip--match, .ms-chip.is-selected)',
    used: 'WISEcodeAI dock & Studio welcome, module shortcuts, Auth signup, Comparison, in-conversation reply chips',
    note: 'The compact 28px chip. Welcome shortcuts, module intents, and reply chips all share <code>.chip</code> at <code>height: 28px</code> with <code>--fs-label</code> type, so they read as one family with the composer. Its large-format sibling — the tap-through <em>Large intent cards</em> (<code>.ws-scorecard</code>) — sits right beside it here.',
    noteIcon: 'straighten',
    demo: `
      <div class="sc-reply-chips" style="margin:0">
        <button type="button" class="chip"><span class="material-symbols-outlined">auto_awesome</span>Suggest a reformulation</button>
        <button type="button" class="chip ws-intent-chip"><span class="material-symbols-outlined">inventory_2</span>Open portfolio</button>
        <button type="button" class="chip chip--match"><span class="material-symbols-outlined">check_circle</span>Best match</button>
        <button type="button" class="chip">Compare two products</button>
        <button type="button" class="chip ms-chip is-selected">High sugar</button>
        <button type="button" class="chip chip-dive"><span class="material-symbols-outlined">arrow_forward</span>Dive in</button>
        <button type="button" class="chip chip-primary"><span class="material-symbols-outlined">check</span>Confirm</button>
      </div>`,
  },
  {
    name: 'Large intent cards',
    cat: 'Chips & badges',
    wide: true,
    cls: '.ws-scorecard · .ws-sc-action (+ --intro, --wiseai, locked)',
    used: 'WISEcodeAI welcome rail · Product Portfolio · Comparison — the large-format sibling of the 28px intent chips',
    note: 'The large-format intent chip, not a scorecard: the whole card is one tap and the footer (<code>.ws-sc-action</code>) is the visible affordance. Same family as the 28px <code>.chip</code> above — one carries an eyebrow/metric and a CTA, the other is the in-conversation pill. (The click-to-filter <em>Scorecards</em> that sit above tables are a separate component.)',
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
    cls: '.fl-input-wrap--stacked · .fl-more-btn · .fl-db-trigger · .fl-input · .sc-send',
    used: 'WISEcodeAI dock (every page) · Studio Chat · Reformulation / Add Product / Studio&AI panes',
    note: 'The stacked composer from the chat module — not a one-line pill. <code>+</code> attach on the left (Voice lives in that menu), database selector left of send, lock beside the placeholder, send uses the <code>send</code> glyph. Same markup <code>mountWISEcodeAIChat</code> builds in <code>js/wiseai-chat.js</code>.',
    noteIcon: 'chat',
    demo: `
      <div class="sc-input-row" data-wise-composer>
        <div class="fl-input-wrap fl-input-wrap--lead fl-input-wrap--stacked">
          <div class="fl-more-wrap">
            <button type="button" class="fl-icon-btn fl-more-btn" title="Attach" aria-haspopup="menu" aria-expanded="false" aria-label="Attach"><span class="material-symbols-outlined">add</span></button>
            <div class="fl-more-popover fl-more-popover--left" role="menu" data-popover-static>
              <button type="button" class="fl-more-item"><span class="material-symbols-outlined">attach_file</span><span>Attach</span></button>
              <button type="button" class="fl-more-item"><span class="material-symbols-outlined">photo_camera</span><span>Camera</span></button>
              <button type="button" class="fl-more-item"><span class="material-symbols-outlined">mic</span><span>Voice</span></button>
              <div class="fl-more-divider" role="separator"></div>
              <button type="button" class="fl-more-item"><span class="material-symbols-outlined">burst_mode</span><span>Load 3 example images</span></button>
            </div>
          </div>
          <div class="fl-input-col">
            <div class="fl-model-row">
              ${composerDbSelectorHtml().replace('role="menu"', 'role="menu" data-popover-static')}
            </div>
            <div class="fl-input-line fl-input-line--locked">
              <textarea class="fl-input fl-input--locked" rows="1" autocomplete="off" readonly aria-disabled="true" tabindex="-1" placeholder="Ask WISEcodeAI about any food\u2026"></textarea>
              <span class="fl-input-lock" tabindex="0" role="img" aria-label="Not accessible at this moment \u2014 WISEcodeAI is coming soon"><span class="material-symbols-outlined">lock</span><span class="fl-input-lock-tip"><span class="fl-input-lock-tip-main">Not accessible at this moment</span><span class="fl-input-lock-tip-sub">WISEcodeAI is coming soon</span></span></span>
            </div>
            <div class="fl-attachments" aria-label="Pending attachments"></div>
          </div>
          <button type="button" class="sc-send sc-send--locked" title="Send" disabled aria-disabled="true"><span class="material-symbols-outlined">send</span></button>
        </div>
      </div>`,
  },
  {
    name: 'Toast',
    cls: '.ag-toast',
    used: 'Global notifications via the agent shell (#ag-toast-wrap, js/agent-overview.js) — saves, invites, errors',
    demo: `<div class="ag-toast" style="max-width:320px"><span class="material-symbols-outlined">check_circle</span>Saved to your workspace</div>`,
  },
  {
    name: 'Left-nav item',
    cls: '.menu-nav-item · .menu-nav-icon (+ .is-active, .menu-nav-locked)',
    used: 'Primary navigation rail on every app page (js/agent-menu.js)',
    demo: `
      <nav class="menu-nav" style="max-width:230px">
        <a class="menu-nav-item" href="#" onclick="return false"><span class="menu-nav-icon"><span class="material-symbols-outlined">space_dashboard</span></span><span class="menu-nav-label">Overview</span></a>
        <a class="menu-nav-item is-active" href="#" onclick="return false"><span class="menu-nav-icon"><span class="material-symbols-outlined">handyman</span></span><span class="menu-nav-label">Product Portfolio</span></a>
        <a class="menu-nav-item menu-nav-locked" href="#" onclick="return false"><span class="menu-nav-icon"><span class="material-symbols-outlined">description</span></span><span class="menu-nav-label">Reports</span><span class="menu-nav-lock"><span class="material-symbols-outlined">lock</span></span></a>
      </nav>`,
  },
  {
    name: 'Top-bar icon button',
    cls: '.lir-btn',
    used: 'Top-bar trailing rail on every page — alerts, appearance, minimal UI, dock toggles',
    demo: `
      <div style="display:inline-flex;gap:2px">
        <button type="button" class="lir-btn" aria-label="Alerts"><span class="material-symbols-outlined">notifications</span></button>
        <button type="button" class="lir-btn" aria-label="Appearance"><span class="material-symbols-outlined">palette</span></button>
        <button type="button" class="lir-btn" aria-label="More"><span class="material-symbols-outlined">more_vert</span></button>
      </div>`,
  },
  {
    name: 'Avatar button',
    cls: '.topbar-profile (+ .has-dot unread state)',
    used: 'Top bar on every app page — opens the profile popover',
    demo: `<button type="button" class="topbar-profile has-dot" aria-label="Profile">MC</button>`,
  },
  {
    name: 'Dashboard card',
    cls: '.dash-card · .dash-eyebrow · .dash-card-title',
    used: 'Non-UPF Dashboard · Reports · Verification · AI Dashboard widgets',
    demo: `
      <div class="dash-card" style="max-width:320px">
        <div class="dash-eyebrow is-primary">Portfolio health</div>
        <h4 class="dash-card-title" style="margin:8px 0 6px">Non-UPF share</h4>
        <p style="margin:0;font-size:0.8125rem;color:var(--text-muted)">62% of the portfolio is verified Non-UPF, up 4 points this quarter.</p>
      </div>`,
  },
  {
    name: 'Status pills',
    cls: 'token-built · var(--sec-*-10) fill + var(--sec-*-text) ink',
    used: 'Portfolio table · Verification & GRAS statuses · Audit Queue · Invoices',
    demo: `
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        <span class="ds-pill" style="background:var(--sec-green-10);color:var(--sec-green-text)"><span class="material-symbols-outlined">verified</span>Verified</span>
        <span class="ds-pill" style="background:var(--ter-amber-10);color:var(--ter-amber-text)"><span class="material-symbols-outlined">pending</span>Pending</span>
        <span class="ds-pill" style="background:var(--sec-red-10);color:var(--sec-red-text)"><span class="material-symbols-outlined">error</span>Failed</span>
      </div>`,
  },
  {
    name: 'Distribution bar',
    cls: '.dash-seg · .dash-seg-piece · .dash-seg-tags · .dash-dot',
    used: 'Non-UPF Dashboard · Reports — portfolio composition strips',
    demo: `
      <div style="max-width:320px;width:100%">
        <div class="dash-seg">
          <span class="dash-seg-piece" style="width:56%;background:var(--chart-status-excellent)"></span>
          <span class="dash-seg-piece" style="width:28%;background:var(--chart-status-okay)"></span>
          <span class="dash-seg-piece" style="width:16%;background:var(--chart-status-poor)"></span>
        </div>
        <div class="dash-seg-tags">
          <span class="dash-seg-tag"><span class="dash-dot" style="background:var(--chart-status-excellent)"></span>Non-UPF</span>
          <span class="dash-seg-tag"><span class="dash-dot" style="background:var(--chart-status-okay)"></span>At risk</span>
          <span class="dash-seg-tag"><span class="dash-dot" style="background:var(--chart-status-poor)"></span>UPF</span>
        </div>
      </div>`,
  },

  /* ---- Data table — the ONE shared grid "table", fully loaded ----- */
  {
    name: 'Data table',
    cat: 'Tables & data',
    wide: true,
    cls: '.adm-table · .adm-thead / .adm-trow · .adm-th(--sortable/--num) · .adm-td(--actions/--num) · .adm-idcell · .adm-avatar · .adm-chip · .adm-rowmenu · .wtp-foot',
    used: 'Organizations · User Management · Audit Queue · Non-UPF Dashboard · Quick Invite · Invoices · Portfolio · Ingredient Browser · Guiding Stars · Reformulation — every admin & module list',
    note: 'One CSS-grid pattern (no <code>&lt;table&gt;</code>) driven by <code>--adm-cols</code>. Cell types, left to right: <strong>bare kebab</strong> (no circled chip), <strong>identity</strong> (avatar + name + sub), <strong>status chip</strong>, <strong>date</strong> (value, empty dash, or date + via), <strong>numeric</strong> (hot vs zero), <strong>score</strong> (serif numeral), <strong>Guiding Stars</strong>, <strong>currency</strong>. Sort + paging attach app-wide. The demo is marked <code>data-wtp-skip</code> so the shared pager does not inject a second footer.',
    noteIcon: 'table_rows',
    demo: `
      <div class="adm-table-card adm-card" style="width:100%">
        <div class="adm-table" data-wtp-skip data-no-paginate style="--adm-cols: 36px minmax(150px, 1.5fr) 108px 96px 52px 56px 78px 64px">
          <div class="adm-thead">
            <span class="adm-th" title="Actions"> </span>
            <span class="adm-th adm-th--sortable" data-adm-dir="asc">Identity ${ARROW_SVG_DEMO}</span>
            <span class="adm-th adm-th--sortable">Status ${ARROW_SVG_DEMO}</span>
            <span class="adm-th adm-th--sortable">Date ${ARROW_SVG_DEMO}</span>
            <span class="adm-th adm-th--num adm-th--sortable">Count ${ARROW_SVG_DEMO}</span>
            <span class="adm-th adm-th--num adm-th--sortable">Score ${ARROW_SVG_DEMO}</span>
            <span class="adm-th">Stars</span>
            <span class="adm-th adm-th--num adm-th--sortable">Amount ${ARROW_SVG_DEMO}</span>
          </div>
          <div class="adm-trow">
            <span class="adm-td adm-td--actions"><span class="adm-rowmenu"><button type="button" class="adm-rowmenu-btn" aria-label="Row actions" title="Actions"><span class="material-symbols-outlined">more_vert</span></button></span></span>
            <span class="adm-td"><span class="adm-idcell"><span class="adm-avatar">AB</span><span class="adm-idcell-body"><span class="adm-idcell-name"><a href="#" onclick="return false">Abbot's Butcher</a></span><span class="adm-idcell-sub">Independent Food/Beverage Brand</span></span></span></span>
            <span class="adm-td"><span class="adm-chip adm-chip--green"><span class="material-symbols-outlined">check</span>Active</span></span>
            <span class="adm-td"><span class="adm-idcell-body"><span style="font-weight:600">Jun 26, 2026</span><span class="adm-idcell-sub">Invitation</span></span></span>
            <span class="adm-td adm-td--num is-hot">6</span>
            <span class="adm-td adm-td--num dsc-score">82</span>
            <span class="adm-td"><span class="dsc-gs" aria-label="3 Guiding Stars"><span class="material-symbols-outlined dsc-gs-on">star</span><span class="material-symbols-outlined dsc-gs-on">star</span><span class="material-symbols-outlined dsc-gs-on">star</span></span></span>
            <span class="adm-td adm-td--num dsc-amt">$1,284</span>
          </div>
          <div class="adm-trow">
            <span class="adm-td adm-td--actions"><span class="adm-rowmenu"><button type="button" class="adm-rowmenu-btn" aria-label="Row actions" title="Actions"><span class="material-symbols-outlined">more_vert</span></button></span></span>
            <span class="adm-td"><span class="adm-idcell"><span class="adm-avatar adm-avatar--round">MC</span><span class="adm-idcell-body"><span class="adm-idcell-name">maya.chen</span><span class="adm-idcell-sub">maya@flax4life.com</span><span class="adm-idcell-sub">ID: 10482</span></span></span></span>
            <span class="adm-td"><span class="adm-chip adm-chip--amber"><span class="material-symbols-outlined">hourglass_top</span>Pending</span></span>
            <span class="adm-td" style="font-size:0.8rem">Apr 18, 2026</span>
            <span class="adm-td adm-td--num is-hot">3</span>
            <span class="adm-td adm-td--num dsc-score">64</span>
            <span class="adm-td"><span class="dsc-gs" aria-label="2 Guiding Stars"><span class="material-symbols-outlined dsc-gs-on">star</span><span class="material-symbols-outlined dsc-gs-on">star</span><span class="material-symbols-outlined dsc-gs-off">star</span></span></span>
            <span class="adm-td adm-td--num dsc-amt">$420</span>
          </div>
          <div class="adm-trow">
            <span class="adm-td adm-td--actions"><span class="adm-rowmenu"><button type="button" class="adm-rowmenu-btn" aria-label="Row actions" title="Actions"><span class="material-symbols-outlined">more_vert</span></button></span></span>
            <span class="adm-td"><span class="adm-idcell"><span class="adm-idcell-body"><span class="adm-idcell-name">Toasted Coconut Brownies</span><span class="adm-idcell-sub dsc-mono">UPC · 8 57287 00420 3</span></span></span></span>
            <span class="adm-td"><span class="adm-chip adm-chip--blue"><span class="material-symbols-outlined">gpp_good</span>Verified</span></span>
            <span class="adm-td" style="font-size:0.8rem">May 2, 2026</span>
            <span class="adm-td adm-td--num is-hot">12</span>
            <span class="adm-td adm-td--num dsc-score">71</span>
            <span class="adm-td"><span class="dsc-gs" aria-label="1 Guiding Star"><span class="material-symbols-outlined dsc-gs-on">star</span><span class="material-symbols-outlined dsc-gs-off">star</span><span class="material-symbols-outlined dsc-gs-off">star</span></span></span>
            <span class="adm-td adm-td--num dsc-amt">$86</span>
          </div>
          <div class="adm-trow">
            <span class="adm-td adm-td--actions"><span class="adm-rowmenu"><button type="button" class="adm-rowmenu-btn" aria-label="Row actions" title="Actions"><span class="material-symbols-outlined">more_vert</span></button></span></span>
            <span class="adm-td"><span class="adm-idcell"><span class="adm-avatar">BF</span><span class="adm-idcell-body"><span class="adm-idcell-name">Brave Foods</span><span class="adm-idcell-sub">Independent Food/Beverage Brand</span></span></span></span>
            <span class="adm-td"><span class="adm-chip adm-chip--outline">Invited</span></span>
            <span class="adm-td" style="font-size:0.8rem"><span style="color:var(--text-subtle)">—</span></span>
            <span class="adm-td adm-td--num">0</span>
            <span class="adm-td adm-td--num" style="color:var(--text-subtle)">—</span>
            <span class="adm-td"><span class="dsc-gs" aria-label="0 Guiding Stars"><span class="material-symbols-outlined dsc-gs-off">star</span><span class="material-symbols-outlined dsc-gs-off">star</span><span class="material-symbols-outlined dsc-gs-off">star</span></span></span>
            <span class="adm-td adm-td--num" style="color:var(--text-subtle)">—</span>
          </div>
        </div>
        <div class="wtp-foot">
          <span class="wtp-count">Showing <b>4</b> of <b>315</b> organizations</span>
          <button type="button" class="wtp-more">Load more<span class="material-symbols-outlined">expand_more</span></button>
        </div>
      </div>`,
  },

  /* ---- Filter toolbar — search pill + funnel + popover ------------ */
  {
    name: 'Filter toolbar',
    cls: '.adm-toolbar · .adm-search-inline.has-filter · .adm-search-filter · .adm-filter-pop (= .pf-toolbar / .pf-filter-pop)',
    used: 'Organizations · User Management · Audit Queue · Portfolio · Invoices · Conversation Library — the shared list-filter pattern',
    note: 'Same shape on every list: one search pill with a funnel button inside it that opens a filter popover. A dot on the funnel (<code>.has-dot</code>) signals active filters. The popover stacks <code>.adm-field</code> + <code>.adm-select</code> rows with a Clear link.',
    noteIcon: 'filter_alt',
    demo: `
      <div class="adm-toolbar" style="width:100%;position:relative">
        <div class="adm-search-inline has-filter" style="flex:1 1 auto">
          <span class="material-symbols-outlined">search</span>
          <input type="search" class="adm-search" placeholder="Search organizations…" aria-label="Demo search" />
          <button type="button" class="adm-search-filter is-active has-dot" aria-label="Filters"><span class="material-symbols-outlined">tune</span></button>
        </div>
        <div class="adm-filter-pop" data-popover-static>
          <div class="adm-field">
            <span class="adm-field-label">Plan</span>
            <select class="adm-select"><option>All plans</option><option>Enterprise</option><option>Growth</option></select>
          </div>
          <div class="adm-field">
            <span class="adm-field-label">Status</span>
            <select class="adm-select"><option>Any status</option><option>Verified</option><option>Pending</option></select>
          </div>
          <div class="adm-filter-pop-foot">
            <button type="button" class="adm-filter-clear">Clear all</button>
            <button type="button" class="adm-btn adm-btn--primary adm-btn--sm">Apply</button>
          </div>
        </div>
      </div>`,
  },

  /* ---- Scorecards — every variant in one card -------------------- */
  {
    name: 'Scorecards',
    wide: true,
    cls: '.adm-stat · .adm-vf-stat (+ .adm-btn) · .adm-metric · .dash-score-card · .dash-claim-col (+ .dash-btn-row)',
    used: 'Organizations · User Management · Audit Queue · Portfolio (.pf-stats) · Non-UPF Dashboard (.adm-vf-stat) · Analytics Types / Overview (.dash-score-card, .dash-claim-col) — every scorecard surface',
    note: 'Every scorecard variant lives here. Filter tiles sit above tables and scope the list (<code>.is-active</code>). Action scorecards (Non-UPF Dashboard) add a status chip, a caption, and a ghost button pinned to the bottom. Compact metrics are the at-a-glance row. KPI cards are the dashboard score band. Claim columns are the big-numeral dashboard row with a button underneath. The large-format welcome cards (<code>.ws-scorecard</code>) are cataloged separately as <em>Large intent cards</em>. No eyebrows on any of these.',
    noteIcon: 'space_dashboard',
    demo: `
      <div class="dsc-sub">
        <div class="dsc-sub-label">Filter tiles</div>
        <div class="adm-stats" style="width:100%">
          <button type="button" class="adm-stat is-active">
            <span class="adm-stat-num">128</span>
            <span class="adm-stat-label"><span class="material-symbols-outlined">apps</span>All</span>
          </button>
          <button type="button" class="adm-stat adm-stat--green">
            <span class="adm-stat-num">62</span>
            <span class="adm-stat-label"><span class="material-symbols-outlined">verified</span>Verified</span>
          </button>
          <button type="button" class="adm-stat adm-stat--amber">
            <span class="adm-stat-num">41</span>
            <span class="adm-stat-label"><span class="material-symbols-outlined">pending</span>Pending</span>
          </button>
          <button type="button" class="adm-stat adm-stat--red">
            <span class="adm-stat-num">25</span>
            <span class="adm-stat-label"><span class="material-symbols-outlined">error</span>At risk</span>
          </button>
        </div>
      </div>
      <div class="dsc-sub">
        <div class="dsc-sub-label">Action scorecards</div>
        <div class="adm-vf-stats" style="width:100%">
          <div class="adm-vf-stat is-active" role="button" tabindex="0">
            <span class="adm-vf-stat-num">90</span>
            <span class="adm-vf-stat-chipwrap"><span class="adm-chip adm-chip--blue"><span class="material-symbols-outlined">inventory_2</span>Products</span></span>
            <span class="adm-vf-stat-sub">Items in Registry</span>
          </div>
          <div class="adm-vf-stat adm-stat--red" role="button" tabindex="0">
            <span class="adm-vf-stat-num" style="color:var(--sec-red)">10</span>
            <span class="adm-vf-stat-chipwrap"><span class="adm-chip adm-chip--red"><span class="material-symbols-outlined">warning</span>Action Required</span></span>
            <span class="adm-vf-stat-sub">Missing mandatory data</span>
            <button type="button" class="adm-btn adm-btn--ghost adm-btn--sm">Edit</button>
          </div>
          <div class="adm-vf-stat" role="button" tabindex="0">
            <span class="adm-vf-stat-num" style="color:var(--primary-ink, var(--primary))">19</span>
            <span class="adm-vf-stat-chipwrap"><span class="adm-chip adm-chip--blue"><span class="material-symbols-outlined">fact_check</span>Pending Attestation</span></span>
            <span class="adm-vf-stat-sub">Selected products need review and attestation</span>
            <button type="button" class="adm-btn adm-btn--ghost adm-btn--sm">Attest</button>
          </div>
          <div class="adm-vf-stat adm-stat--green" role="button" tabindex="0">
            <span class="adm-vf-stat-num" style="color:var(--sec-green)">8</span>
            <span class="adm-vf-stat-chipwrap"><span class="adm-chip adm-chip--green"><span class="material-symbols-outlined">verified</span>Verified</span></span>
            <span class="adm-vf-stat-sub">Fully verified (shield verification)</span>
          </div>
        </div>
      </div>
      <div class="dsc-sub">
        <div class="dsc-sub-label">Compact metrics</div>
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
        </div>
      </div>
      <div class="dsc-sub">
        <div class="dsc-sub-label">KPI scorecards</div>
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
        </div>
      </div>
      <div class="dsc-sub">
        <div class="dsc-sub-label">Claim scorecards</div>
        <section class="dash-claim dsc-claim-demo">
          <div class="dash-claim-col">
            <div class="dash-bignum-row">
              <span class="dash-bignum">47</span>
              <span class="dash-bignum-cap"><strong>Products Discovered</strong><br>across retail &amp; distribution</span>
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
            </div>
            <div class="dash-btn-row">
              <button class="dash-btn dash-btn--primary" type="button"><span class="material-symbols-outlined">verified</span>Start Non&#8209;UPF Verification</button>
            </div>
          </div>
        </section>
      </div>`,
  },

  /* ---- Charts & graphs — donut / bars / progress ----------------- */
  {
    name: 'Charts & graphs',
    wide: true,
    cls: '.adm-chart-card · .adm-bars / .adm-bar-fill · .adm-legend · .adm-vrow (= .dash-donut / .dash-metric-*)',
    used: 'Non-UPF Dashboard · Overview · Analytics Types · Reports — every data-viz surface',
    note: 'Each chart card is its OWN size container (<code>container-type: inline-size</code>), so bars and labels shrink to stay legible three-up, two-up, or docked beside the chat — never a viewport media query. Bars/rings animate in on load and respect <code>prefers-reduced-motion</code>.',
    noteIcon: 'bar_chart',
    download: {
      href: '../assets/chart-and-report-design.md',
      file: 'chart-and-report-design.md',
      label: 'Download chart & report design rules (.md)',
    },
    demo: `
      <div style="display:flex;flex-wrap:wrap;gap:14px;width:100%">
        <div class="adm-chart-card" style="flex:1 1 240px">
          <h4 class="adm-chart-title">Processing spectrum</h4>
          <div class="adm-chart-body">
            <div class="adm-bars" style="height:150px">
              <div class="adm-bar"><div class="adm-bar-track"><div class="adm-bar-fill" style="height:72%;background:var(--chart-status-excellent)"><span class="adm-bar-val">54</span></div></div><span class="adm-bar-label">Minimally processed</span></div>
              <div class="adm-bar"><div class="adm-bar-track"><div class="adm-bar-fill" style="height:48%;background:var(--chart-status-okay)"><span class="adm-bar-val">31</span></div></div><span class="adm-bar-label">Processed</span></div>
              <div class="adm-bar"><div class="adm-bar-track"><div class="adm-bar-fill" style="height:34%;background:var(--chart-status-poor)"><span class="adm-bar-val">18</span></div></div><span class="adm-bar-label">Ultra-processed</span></div>
            </div>
          </div>
        </div>
        <div class="adm-chart-card" style="flex:1 1 220px">
          <h4 class="adm-chart-title">Verification status</h4>
          <div class="adm-chart-body">
            <div class="adm-vstatus">
              <div class="adm-vrow"><span class="adm-vrow-ic material-symbols-outlined" style="color:var(--chart-status-excellent)">verified</span><div class="adm-vrow-main"><div class="adm-vrow-label">Verified</div><div class="adm-vrow-bar"><span style="width:62%;background:var(--chart-status-excellent)"></span></div></div><span class="adm-vrow-val">62</span></div>
              <div class="adm-vrow"><span class="adm-vrow-ic material-symbols-outlined" style="color:var(--chart-status-okay)">pending</span><div class="adm-vrow-main"><div class="adm-vrow-label">Pending</div><div class="adm-vrow-bar"><span style="width:32%;background:var(--chart-status-okay)"></span></div></div><span class="adm-vrow-val">41</span></div>
              <div class="adm-vrow"><span class="adm-vrow-ic material-symbols-outlined" style="color:var(--chart-status-poor)">error</span><div class="adm-vrow-main"><div class="adm-vrow-label">At risk</div><div class="adm-vrow-bar"><span style="width:18%;background:var(--chart-status-poor)"></span></div></div><span class="adm-vrow-val">25</span></div>
            </div>
            <div class="adm-legend">
              <div class="adm-legend-row"><span class="adm-legend-dot" style="background:var(--chart-status-excellent)"></span><span class="adm-legend-label">Non-UPF</span><span class="adm-legend-val">48%</span></div>
              <div class="adm-legend-row"><span class="adm-legend-dot" style="background:var(--chart-status-okay)"></span><span class="adm-legend-label">At risk</span><span class="adm-legend-val">32%</span></div>
            </div>
          </div>
        </div>
      </div>`,
  },

  /* ---- Secondary popovers ---------------------------------------- */
  {
    name: 'Menu popover',
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
    cls: '.adm-rowmenu · .adm-rowmenu-btn · .adm-rowmenu-pop · .adm-rowmenu-item (+ --primary, --danger)',
    used: 'Every table row kebab — Organizations, User Management, Audit Queue, Portfolio (.pf-rowmenu)',
    note: 'The per-row ⋯ menu that collapses row actions into a popover. Portalled floating variant (<code>.adm-menu</code>) is used when a row menu would clip inside the table card.',
    noteIcon: 'more_vert',
    demo: `
      <div class="adm-rowmenu is-open" style="position:relative">
        <button type="button" class="adm-rowmenu-btn" aria-label="Row actions"><span class="material-symbols-outlined">more_vert</span></button>
        <div class="adm-rowmenu-pop" data-popover-static style="position:static;margin-top:8px">
          <button type="button" class="adm-rowmenu-item adm-rowmenu-item--primary"><span class="material-symbols-outlined">visibility</span>View details</button>
          <button type="button" class="adm-rowmenu-item"><span class="material-symbols-outlined">edit</span>Edit</button>
          <button type="button" class="adm-rowmenu-item adm-rowmenu-item--danger"><span class="material-symbols-outlined">delete</span>Remove</button>
        </div>
      </div>`,
  },

  /* ---- Chips (domain status) ------------------------------------- */
  {
    name: 'Status chips (domain)',
    cls: '.adm-chip (+ --green/--red/--amber/--blue/--muted/--outline/--canon)',
    used: 'Admin table cells · Organizations · User Management · Audit Queue — richer than the generic .ds-pill',
    note: 'Color comes only from tokens (<code>--sec-*</code>, <code>--ter-*</code>) so light/dark and status semantics stay consistent across every table.',
    noteIcon: 'label',
    demo: `
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        <span class="adm-chip adm-chip--green"><span class="material-symbols-outlined">verified</span>Verified</span>
        <span class="adm-chip adm-chip--amber"><span class="material-symbols-outlined">pending</span>Pending</span>
        <span class="adm-chip adm-chip--red"><span class="material-symbols-outlined">error</span>At risk</span>
        <span class="adm-chip adm-chip--blue"><span class="material-symbols-outlined">bolt</span>Active</span>
        <span class="adm-chip adm-chip--muted">Draft</span>
        <span class="adm-chip adm-chip--outline">Archived</span>
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
    cls: '.adm-btn (+ --primary/--ghost/--danger/--good/--sm) · .adm-icon-btn',
    used: 'Admin module headers & rows · Invoices (.inv-btn mirror) — the pill button set beside the app .dash-btn',
    note: 'The admin/list surfaces use this pill button family; content surfaces use <code>.dash-btn</code>. Same tokens, two shapes — pick by surface.',
    noteIcon: 'smart_button',
    demo: `
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
        <button type="button" class="adm-btn adm-btn--primary"><span class="material-symbols-outlined">add</span>New</button>
        <button type="button" class="adm-btn adm-btn--ghost">Cancel</button>
        <button type="button" class="adm-btn adm-btn--good"><span class="material-symbols-outlined">check</span>Approve</button>
        <button type="button" class="adm-btn adm-btn--danger"><span class="material-symbols-outlined">delete</span>Delete</button>
        <button type="button" class="adm-icon-btn" aria-label="More"><span class="material-symbols-outlined">more_horiz</span></button>
      </div>`,
  },

  /* ---- Modal / dialog -------------------------------------------- */
  {
    name: 'Modal dialog',
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
    cls: '#lir-tooltip / .lir-tip-visible (js/lir-tooltip.js) · .dash-status-tip · chip explainer .ct-card (js/chip-tooltip.js)',
    used: 'Every icon button (.lir-btn, panel controls) · dashboard score terms · data chips app-wide',
    note: 'One dark tooltip for every icon-only control (labels the glyph on hover/focus), plus a richer explainer card that data chips open on click. Positioned centrally so tooltips never clip.',
    noteIcon: 'chat_bubble',
    demo: `
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <span style="position:relative;display:inline-flex;flex-direction:column;align-items:center;gap:8px">
          <button type="button" class="lir-btn" aria-label="Alerts"><span class="material-symbols-outlined">notifications</span></button>
          <span class="dsc-tip">Alerts</span>
        </span>
        <span style="position:relative;display:inline-flex;flex-direction:column;align-items:center;gap:8px">
          <button type="button" class="lir-btn" aria-label="Appearance"><span class="material-symbols-outlined">palette</span></button>
          <span class="dsc-tip">Appearance</span>
        </span>
      </div>`,
  },

  /* ---- Avatars ---------------------------------------------------- */
  {
    name: 'Avatars',
    cls: '.adm-avatar (+ --photo) · .topbar-profile',
    used: 'Table identity cells · owner columns · brand pickers · top-bar profile · chat “you” chip',
    note: 'One avatar primitive, one circle size (34px) — token-tinted initials by default, photo optional. <strong>Every avatar is a circle</strong> — no square, no rounded-square, no second size, anywhere in the app. Falls back to initials when there is no image.',
    noteIcon: 'account_circle',
    demo: `
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <span class="adm-avatar">AF</span>
        <span class="adm-avatar">MC</span>
        <span class="adm-avatar">GP</span>
        <span class="adm-avatar adm-avatar--photo"><img src="https://i.pravatar.cc/80?img=12" alt="" /></span>
        <button type="button" class="topbar-profile" aria-label="Profile" style="position:static;transform:none">JR</button>
      </div>`,
  },

  /* ---- History / Library / Reports — missing from the first pass ---- */
  {
    name: 'History conversation',
    wide: true,
    cls: '.wch-item · .wch-item-title · .wch-item-meta · .wch-item-actions · .wch-drag-handle',
    used: 'WISEcodeAI History module (wiseai.html#history) — every conversation row',
    note: 'A History row is the whole conversation: title, timestamp, and hover actions (drag handle, move to project, delete). The row itself is draggable — drop it on a <em>History project</em> to file it. The drag handle is the discoverable grip; grabbing anywhere on the row also works.',
    noteIcon: 'history',
    demo: `
      <div class="dsc-wch">
        <div class="wch-item wch-active" role="listitem" tabindex="0" draggable="true">
          <div class="wch-item-title">Compare oat milk vs almond milk</div>
          <div class="wch-item-meta">Today · 8 messages</div>
          <div class="wch-item-actions">
            <button type="button" class="wch-iact wch-drag-handle" title="Drag into a project" aria-label="Drag conversation into a project"><span class="material-symbols-outlined">drag_indicator</span></button>
            <button type="button" class="wch-iact" title="Move to project" aria-label="Move to project"><span class="material-symbols-outlined">drive_file_move</span></button>
            <button type="button" class="wch-iact" title="Delete" aria-label="Delete conversation"><span class="material-symbols-outlined">delete_outline</span></button>
          </div>
        </div>
        <div class="wch-item" role="listitem" tabindex="0" draggable="true">
          <div class="wch-item-title"><span class="wch-fork-badge" title="Forked"><span class="material-symbols-outlined">alt_route</span></span>UPF report for granola</div>
          <div class="wch-item-meta">Yesterday · 3 messages</div>
          <div class="wch-item-actions">
            <button type="button" class="wch-iact wch-drag-handle" title="Drag into a project" aria-label="Drag conversation into a project"><span class="material-symbols-outlined">drag_indicator</span></button>
            <button type="button" class="wch-iact" title="Move to project" aria-label="Move to project"><span class="material-symbols-outlined">drive_file_move</span></button>
            <button type="button" class="wch-iact" title="Delete" aria-label="Delete conversation"><span class="material-symbols-outlined">delete_outline</span></button>
          </div>
        </div>
      </div>`,
  },
  {
    name: 'History project',
    wide: true,
    cls: '.wch-project · .wch-proj-dot · .wch-proj-add · .wch-proj-edit · .wch-drop-on',
    used: 'WISEcodeAI History — Projects section. Create with the folder button, or file a chat by dropping it on a project (or back on Ungrouped).',
    note: 'History groups chats into <strong>projects</strong> (the History equivalent of Library folders). New project opens an inline name + color editor. Drop a conversation on a project to file it; drop on the ungrouped zone to unfile. Card-on-card folder founding lives in the Library — see <em>Drag to found a folder</em> in Motion &amp; Resize.',
    noteIcon: 'create_new_folder',
    demo: `
      <div class="dsc-wch">
        <div class="wch-projects-head">
          <span class="wch-projects-title">Projects</span>
          <button type="button" class="wch-proj-add" title="New project" aria-label="New project"><span class="material-symbols-outlined">create_new_folder</span></button>
        </div>
        <div class="wch-project">
          <div class="wch-project-head">
            <button type="button" class="wch-proj-toggle" aria-label="Collapse"><span class="material-symbols-outlined">expand_more</span></button>
            <span class="wch-proj-dot" style="color:#25507C"></span>
            <span class="wch-proj-name">Q3 verification</span>
            <span class="wch-proj-count">2</span>
          </div>
          <div class="wch-project-body">
            <div class="wch-item" role="listitem">
              <div class="wch-item-title">Non-UPF attestation for oat bars</div>
              <div class="wch-item-meta">Mon · 5 messages</div>
            </div>
          </div>
        </div>
        <div class="wch-project wch-drop-on">
          <div class="wch-project-head">
            <button type="button" class="wch-proj-toggle" aria-label="Collapse"><span class="material-symbols-outlined">expand_more</span></button>
            <span class="wch-proj-dot" style="color:#32A966"></span>
            <span class="wch-proj-name">Reports</span>
            <span class="wch-proj-count">4</span>
          </div>
          <div class="wch-project-empty">Drop a chat here to file it</div>
        </div>
        <div class="wch-proj-edit">
          <span class="wch-proj-dot" style="color:#D27326"></span>
          <input type="text" class="wch-proj-edit-input" maxlength="60" placeholder="Project name…" value="New project">
          <div class="wch-proj-swatches">
            <button type="button" class="wch-proj-swatch is-sel" style="color:#25507C" aria-label="Navy"></button>
            <button type="button" class="wch-proj-swatch" style="color:#32A966" aria-label="Green"></button>
            <button type="button" class="wch-proj-swatch" style="color:#D27326" aria-label="Amber"></button>
            <button type="button" class="wch-proj-swatch" style="color:#DC3038" aria-label="Red"></button>
          </div>
        </div>
      </div>`,
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
    name: 'Report posters',
    wide: true,
    cls: '.rp-card · .rp-poster · .rp-name · .rp-badge · .rp-view (+ .is-locked)',
    used: 'Reports (reports.html) — the studio shelf of standardized reports',
    note: 'Reports read as a shelf of posters: cinematic header (genre tone + icon, no plate behind the glyph), serif title, short desc, and a View Report affordance. Live cards glow in their genre color; locked ones sit greyed with a lock badge. Saved into the Library they become <em>Library cards</em>.',
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

/* Persist Dev Ready flags per component name. Missing keys default to off. */
const DSC_READY_KEY = 'wise-dsc-dev-ready';

function loadDscReadyMap() {
  try {
    const raw = localStorage.getItem(DSC_READY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

function saveDscReadyMap(map) {
  try {
    localStorage.setItem(DSC_READY_KEY, JSON.stringify(map));
  } catch (e) { /* quota / private mode — ignore */ }
}

function isDscReady(name, map) {
  return map[name] === true;
}

/* ------------------------------------------------------------------ */
/* Dev Ready hierarchy                                                 */
/*                                                                     */
/* A higher-level module ("Dev Ready" at the top level) can only be    */
/* marked ready once every lower-level part it owns is ready too. The  */
/* parent→child tree is built at render time from the very same data   */
/* arrays the modules render from, so a parent and its children can    */
/* never drift out of sync. Modules with no lower-level parts are      */
/* leaves and toggle freely.                                           */
/* ------------------------------------------------------------------ */
let DEV_READY_CHILDREN = {}; /* moduleId -> [{ id, label }] */
let DEV_READY_PARENT = {};   /* childId  -> moduleId        */

function registerReadyChildren(moduleId, children) {
  DEV_READY_CHILDREN[moduleId] = children;
  children.forEach((c) => { DEV_READY_PARENT[c.id] = moduleId; });
}

/* How many of a module's children are Dev Ready right now. */
function readyChildStats(moduleId, map) {
  const kids = DEV_READY_CHILDREN[moduleId] || [];
  let ready = 0;
  kids.forEach((c) => { if (map[c.id] === true) ready++; });
  return { ready, total: kids.length };
}

/* Stable child ids — MUST match the ids the child toggles render with. */
function motionReadyId(item) { return 'motion:' + item.title; }

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

/* Design System groups that each carry a Dev Ready child toggle. */
function designReadyGroups() {
  return [
    { id: 'ds:typography', label: 'Typography' },
    ...COLOR_GROUPS.map((g) => ({ id: 'ds:' + g.title, label: g.title })),
  ];
}

/* Build the parent→child map. Call once before rendering. */
function buildDevReadyTree() {
  DEV_READY_CHILDREN = {};
  DEV_READY_PARENT = {};
  registerReadyChildren('mi-components', COMPONENTS.map((c) => ({ id: c.name, label: c.name })));
  registerReadyChildren('mi-motion', MOTION_ITEMS.map((i) => ({ id: motionReadyId(i), label: i.title })));
  registerReadyChildren('mi-directory', dedupedDirSections().map((s) => ({ id: 'dir:' + s.tone, label: s.title })));
  registerReadyChildren('mi-design', designReadyGroups());
}

/* One Dev Ready switch. `level` is 'module' (a higher-level component — gated by
   its children) or 'item' (a lower-level part). A module that owns children
   renders a live "k/n ready" progress pill and can only be switched on once
   every child is ready. */
function readyToggleHTML(id, label, opts) {
  opts = opts || {};
  const level = opts.level || 'item';
  const parent = opts.parent || '';
  const map = loadDscReadyMap();
  const kids = level === 'module' ? (DEV_READY_CHILDREN[id] || []) : [];
  const hasKids = kids.length > 0;
  const stats = hasKids ? readyChildStats(id, map) : null;
  const gated = hasKids && stats.ready < stats.total;
  const ready = isDscReady(id, map) && !gated;
  const cls = 'dash-brand-toggle' + (ready ? ' is-on' : '') + (gated ? ' is-gated' : '');
  const title = gated
    ? `All ${stats.total} parts must be Dev Ready first — ${stats.ready}/${stats.total} done`
    : `Mark ${label} ready for dev`;
  const progress = hasKids
    ? `<span class="dsc-ready-progress${gated ? '' : ' is-complete'}" data-ready-progress-for="${esc(id)}" title="${stats.ready} of ${stats.total} parts Dev Ready">
        <span class="material-symbols-outlined" aria-hidden="true">${gated ? 'radio_button_unchecked' : 'task_alt'}</span>
        <span class="dsc-ready-count">${stats.ready}/${stats.total}</span>
      </span>`
    : '';
  return `
    <div class="dsc-ready dsc-ready--${level}" data-ready-wrap>
      ${progress}
      <button type="button" class="${cls}" role="switch"
        aria-checked="${ready ? 'true' : 'false'}"${gated ? ' aria-disabled="true"' : ''}
        aria-label="Dev Ready for ${esc(label)}" title="${esc(title)}"
        data-dsc-ready data-ready-id="${esc(id)}" data-ready-level="${esc(level)}"${parent ? ` data-ready-parent="${esc(parent)}"` : ''}>
        <span class="dash-brand-toggle-track"><span class="dash-brand-toggle-thumb"></span></span>
        <span class="dash-brand-toggle-text">Dev Ready</span>
      </button>
    </div>`;
}

/* A higher-level module toggle — gated by its children when it owns any. */
function moduleReadyToggleHTML(moduleId, label) {
  return readyToggleHTML(moduleId, label, { level: 'module' });
}

function componentCard(c, readyMap) {
  const cat = catOf(c);
  const search = `${c.name} ${c.cls} ${c.used} ${c.note || ''} ${cat}`.toLowerCase();
  const cardCls = `dsc-card${c.wide ? ' dsc-card--wide' : ''}`;
  const note = c.note
    ? `<div class="dsc-note"><span class="material-symbols-outlined">${esc(c.noteIcon || 'aspect_ratio')}</span><span>${c.note}</span></div>`
    : '';
  const download = c.download
    ? `<div class="dsc-download-row">
        <a class="dash-btn dash-btn--ghost dsc-download" href="${esc(c.download.href)}" download="${esc(c.download.file)}">
          <span class="material-symbols-outlined">download</span>${esc(c.download.label)}
        </a>
      </div>`
    : '';
  return `
    <div class="${cardCls}" data-ds-comp data-comp-name="${esc(c.name)}" data-cat="${esc(cat)}" data-search="${esc(search)}">
      ${readyToggleHTML(c.name, c.name, { level: 'item', parent: 'mi-components' })}
      <div class="dsc-head">
        <span class="dsc-name">${esc(c.name)}</span>
        <code class="dsc-class">${esc(c.cls)}</code>
      </div>
      <div class="dsc-demo">${c.demo}</div>
      ${note}
      ${download}
      <div class="dsc-used"><span class="dsc-used-label">Used in</span><span class="dsc-used-list">${esc(c.used)}</span></div>
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
    body: 'No hard-coded colors. Fills and ink come from design tokens (<code>--primary</code>, <code>--surface</code>, <code>--sec-*</code>, <code>--ter-*</code>), so light/dark and status semantics stay consistent everywhere — see the Design System above.',
  },
  {
    icon: 'table_rows',
    title: 'One table pattern',
    body: 'Every list is the same CSS-grid faux-table (<code>*-thead / *-trow / *-th / *-td</code>) driven by a single columns variable. Sorting and "load more" paging attach app-wide via <code>js/sortable-tables.js</code> and <code>js/table-pagination.js</code>.',
  },
  {
    icon: 'filter_alt',
    title: 'One filter pattern',
    body: 'Lists filter the same way: a search pill with an in-pill funnel that opens a filter popover, plus click-to-filter stat tiles. Active facets show a dot / <code>.is-active</code>.',
  },
  {
    icon: 'layers',
    title: 'Two popover shapes',
    body: 'All menus reduce to two shells — <code>.topbar-popover</code> (compact top-bar / row menus) and <code>.wise-popover</code> (settings / profile). Both are opened and dismissed centrally by <code>js/popover-layer.js</code>.',
  },
  {
    icon: 'accessibility_new',
    title: 'Consistent states',
    body: 'Interactive components share hover, <code>:focus-visible</code> rings, <code>.is-active</code> selection, disabled/locked, and honor <code>prefers-reduced-motion</code>. Icon-only controls carry an <code>aria-label</code>.',
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

function renderComponentLibrary() {
  return `
    <section class="mi-module is-collapsed" id="mi-components">
      <header class="mi-module-head">
        <div class="mi-module-head-text">
          <h2 class="mi-module-title">Component Library</h2>
          <p class="mi-module-lede">Reusable components that are <em>not</em> already on this page,
            rendered live with the real global classes from <code>pages/wise.css</code>. Search pills,
            filter tiles, Grid⇄Rail, module ⋯ menus, badges, and Dev Ready toggles live in the
            modules above — they are omitted here so the library does not duplicate them.
            Each card lists the surfaces where the component is used and the shared rule behind it.</p>
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
    label: 'Invoices & Downloads', icon: 'receipt_long', href: 'invoices.html', src: 'invoices-flow.js',
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
    note: 'This very page. The “Jump to…” chips scroll to (and expand) a module and suppress their reply on success; their transcript is a fallback for when the target isn’t found. “How many icons are there?” is the one answer-only chip — it narrates the count without moving the page. “Show animations & resize” opens the Motion & Resize catalog.',
    chips: [
      { i: 'codebase',   label: 'How big is the codebase?',      t: true, l: true, does: 'Expands and scrolls to the Codebase scorecards, then posts the sizing answer.' },
      { i: 'directory',  label: 'Jump to the Module Directory',  t: true, l: true, does: 'Expands and scrolls to the Module Directory (suppresses the reply on success).' },
      { i: 'tables',     label: 'Show every table',             t: true, l: true, does: 'Expands and scrolls to the Table Gallery.' },
      { i: 'intents',    label: 'Which intent chips work?',      t: true, l: true, does: 'Expands and scrolls to Intent Chip Logic, then posts the audit answer.' },
      { i: 'icons',      label: 'Jump to the Icon Inventory',    t: true, l: true, does: 'Expands and scrolls to the Icon Inventory.' },
      { i: 'design',     label: 'Jump to the Design System',     t: true, l: true, does: 'Expands and scrolls to the Design System.' },
      { i: 'components', label: 'Jump to the Component Library', t: true, l: true, does: 'Expands and scrolls to the Component Library.' },
      { i: 'motion',     label: 'Show animations & resize',      t: true, l: true, does: 'Expands and scrolls to Motion & Resize.' },
      { i: 'counts',     label: 'How many icons are there?',     t: true, l: false, does: 'Answer-only — narrates the unique-icon and placement counts. Does not scroll.' },
    ],
  },
  {
    label: 'WISEcodeAI (flagship)', icon: 'auto_awesome', href: 'wiseai.html', src: 'wiseai.html',
    note: 'The standalone WISEcodeAI conversation. Every chip posts its own scripted transcript (INTENT_REPLIES) and opens its result/visual panes via surface(intent) — including the deadpan “Cat food.” easter egg, which now opens a cat-food card, and “Is this list ultra-processed?”, which opens the WISEcode UPF framework pane.',
    chips: [
      { i: 'brisket',      label: 'Gut-healthy brisket recipe',    t: true, l: true, does: 'Posts the brisket recipe transcript and opens its result / recipe pane via surface(intent).' },
      { i: 'redochart',    label: 'Redo the gut-health chart',     t: true, l: true, does: 'Re-runs the gut-health chart and opens the chart pane.' },
      { i: 'upf',          label: 'Is this list ultra-processed?', t: true, l: true, does: 'Opens the WISEcode UPF framework pane and narrates whether the list is ultra-processed.' },
      { i: 'worst',        label: 'Worst food in our database?',   t: true, l: true, does: 'Opens the worst-food result card from the registry.' },
      { i: 'spider',       label: 'Spider-chart the 10 worst foods', t: true, l: true, does: 'Opens a spider chart of the 10 worst foods.' },
      { i: 'cupcake',      label: 'Tell me about the worst cupcake', t: true, l: true, does: 'Opens the worst-cupcake product card.' },
      { i: 'cookie',       label: 'Best cookie, least chocolate',  t: true, l: true, does: 'Opens the best-cookie / least-chocolate comparison card.' },
      { i: 'compare',      label: 'Compare products side by side',  t: true, l: true, does: 'Opens the side-by-side product comparison pane.' },
      { i: 'report',       label: 'Show me a pretty report',       t: true, l: true, does: 'Opens a formatted report pane in the studio.' },
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
    <div class="mi-int-trow" data-int-row data-status="${esc(c.status)}" data-search="${esc(search)}">
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

function renderIntentAudit() {
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
        ${moduleReadyToggleHTML('mi-intents', 'Intent Chip Logic')}
        ${moduleControlsHTML('mi-intents')}
      </header>

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

function renderStreamingTrace() {
  const sections = TRACE_MILESTONES.length;
  return `
    <section class="mi-module is-collapsed" id="mi-trace">
      <header class="mi-module-head">
        <div class="mi-module-head-text">
          <h2 class="mi-module-title">Streaming Trace</h2>
          <p class="mi-module-lede">The "thinking" trace every WISEcodeAI turn streams while it works, shown here with its
            three moving parts named. The <strong>helix</strong> is the DNA rail that twists on the left — the same
            animation the live chat draws. The <strong>main sections</strong> are the ${sections} milestones the trace
            walks through — <em>Reading → Gathering → Cross-checking → Composing</em> — and beneath each, the
            <strong>glob</strong> of subdued narration streams in line by line. On this page the glob is
            <strong>always a haiku</strong> (5·7·5). Rendered live with the same <code>.sc-trace</code> classes the chat uses.</p>
        </div>
        ${moduleReadyToggleHTML('mi-trace', 'Streaming Trace')}
        ${moduleControlsHTML('mi-trace')}
      </header>

      <div class="mi-trace">
        <div class="mi-trace-card">
          <div class="sc-trace" data-open="0" id="mi-trace-live">
            <button type="button" class="sc-trace-head" aria-expanded="false">
              <span class="sc-trace-title">Thinking</span>
              <span class="sc-trace-timer" aria-hidden="true">0:00</span>
              <span class="sc-trace-caret material-symbols-outlined" aria-hidden="true">chevron_right</span>
            </button>
            <div class="sc-trace-body">${TRACE_STRAND_MARKUP}</div>
          </div>
        </div>

        <div class="mi-trace-side">
          <button type="button" class="mi-trace-run" data-trace-run>
            <span class="material-symbols-outlined">replay</span><span data-trace-run-label>Replay trace</span>
          </button>
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
                lines, 5·7·5.</span>
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
  let started = false;

  const killHelix = () => {
    if (helix) { helix.destroy(); helix = null; }
  };

  /* The header collapses the whole trace (live glob or final summary) and back,
     exactly like the real one. */
  head.addEventListener('click', () => {
    const open = trace.getAttribute('data-open') === '1';
    trace.setAttribute('data-open', open ? '0' : '1');
    head.setAttribute('aria-expanded', open ? 'false' : 'true');
    if (helix) helix.redraw();
  });

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

  const run = () => {
    const myToken = ++token;
    started = true;
    killHelix();
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
         build on each other into one growing narrative, never wiping the last. */
      const block = document.createElement('div');
      block.className = 'sc-trace-live';
      block.innerHTML = '<div class="sc-trace-now"><span class="sc-trace-now-key"></span></div>'
        + '<div class="sc-trace-story"></div>';
      block.querySelector('.sc-trace-now-key').textContent = m.key;
      bodyEl.appendChild(block);
      const storyEl = block.querySelector('.sc-trace-story');
      const lines = m.haiku.slice();
      let si = 0;
      const streamLine = () => {
        if (myToken !== token) { clearInterval(timer); return; }
        if (si >= lines.length) {
          block.classList.add('is-done');
          landmarks.push({ key: m.key, time: fmtClock(now()) });
          mi += 1;
          setTimeout(runMilestone, rnd(240, 480));
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
      setTimeout(streamLine, rnd(160, 340));
    };
    setTimeout(runMilestone, rnd(240, 520));
  };

  runBtn.addEventListener('click', run);

  /* Don't spin the helix while the accordion is closed (height 0). Start the
     first run the moment the section opens; Replay always runs immediately. */
  const startWhenOpen = () => {
    if (started || mod.classList.contains('is-collapsed')) return;
    run();
  };
  startWhenOpen();
  new MutationObserver(startWhenOpen).observe(mod, { attributes: true, attributeFilter: ['class'] });
}

/* ------------------------------------------------------------------ */
/* Motion & Resize — every animation and drag/resize interaction       */
/*                                                                     */
/* A live catalog of how things move in the app: count-ups, chart      */
/* replay, word-by-word streaming, gold chip shimmer, chip fly-in,     */
/* the welcome helix, the thinking helix, and accordion open — plus    */
/* the four drag/resize systems (module splitter, width tiers,         */
/* reorder, drag-to-file). Each card explains the rule and runs the    */
/* real behaviour (or a faithful mini of it) so you can try it here.   */
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
    id: 'stream', group: 'anim', icon: 'text_ad', title: 'Word-by-word streaming',
    src: 'js/wiseai-chat.js · typeInLine',
    used: 'WISEcodeAI welcome heading, Streaming Trace glob, in-conversation replies',
    lede: 'Copy lands one word at a time — the welcome heading, the thinking-trace glob, and (when enabled) assistant replies. Reduced motion shows the line whole. Replay to watch it type.',
    demo: `
      <div class="mi-motion-stream" data-motion-stream>
        <p class="mi-motion-stream-line" data-stream-out></p>
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
    id: 'helix', group: 'anim', icon: 'genetics', title: 'Welcome helix', wide: true,
    src: 'js/wiseai-chat.js · createHelixBgAnim',
    used: 'Every chat welcome — ON by default at 20% opacity',
    lede: 'The ambient DNA/RNA field behind the chat welcome. Product thumbnails travel the strand; hover a circle for its card. Default opacity is <strong>20%</strong> — drag the slider to change it (same control as the chat ⋯ menu). Honors pause and <code>prefers-reduced-motion</code>. The live field starts when this section opens.',
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
            <input type="range" class="sc-bganim-opacity" data-helix-opacity min="10" max="100" step="5" value="20" aria-label="Background animation opacity">
            <span class="sc-bganim-opacity-val" data-helix-opacity-val>20%</span>
          </label>
        </div>
      </div>`,
  },
  {
    id: 'tracehelix', group: 'anim', icon: 'psychology', title: 'Thinking helix',
    src: 'js/trace-helix.js · Streaming Trace',
    used: 'Every WISEcodeAI turn while it works',
    lede: 'The DNA rail on the left of the thinking trace — twists while working, then freezes with green base-pair dots on each completed step. The full anatomy (helix + milestones + haiku glob) lives in the <strong>Streaming Trace</strong> section above.',
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
    id: 'splitter', group: 'drag', icon: 'width_normal', title: 'Module drag-resize', wide: true,
    src: 'js/pane-resize.js',
    used: 'Every #modules-row page — hover the seam between two modules',
    lede: 'Nothing shows at rest. Hover the edge between two panes and a grip fades in. Drag to preview any width; on release, modules with a width changer <strong>snap to the nearest of four tiers</strong> (single / double / triple / fill). Modules without a width changer keep a free-form width. Double-click a handle to reset. Navigation is never resized.',
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
    lede: 'One control, four rest states: <strong>single → double → triple → fill</strong>, then back. Fill absorbs leftover row space. Drag-resize is only a preview — release snaps to the closest tier by driving this same button.',
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
      <p class="mi-motion-hint">Tap the width icon to cycle single → double → triple → fill.</p>`,
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
    <article class="mi-motion-card${item.wide ? ' mi-motion-card--wide' : ''}" data-motion-card data-motion-group="${esc(item.group)}" data-search="${esc(search)}">
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

function renderMotion() {
  const animN = MOTION_ITEMS.filter((i) => i.group === 'anim').length;
  const dragN = MOTION_ITEMS.filter((i) => i.group === 'drag').length;
  return `
    <section class="mi-module is-collapsed" id="mi-motion">
      <header class="mi-module-head">
        <div class="mi-module-head-text">
          <h2 class="mi-module-title">Motion &amp; Resize</h2>
          <p class="mi-module-lede">Every animation and every drag/resize interaction in the app — explained and
            running live. Count-ups, chart replay, streaming, chip shimmer and fly-in, both helixes, and accordion
            open sit next to the module splitter, the four width tiers, drag-to-reorder, drag-to-file, and
            drag-to-found-a-folder (Library card-on-card).
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
              <div class="dsc-conv-item-title">Four-tier snap</div>
              <p class="dsc-conv-item-desc">A module with a width changer may only <em>rest</em> at single, double, triple, or fill. Drag is a live preview; release snaps to the closest tier by driving the module’s own width button.</p>
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

  /* ---- Word-by-word stream ---- */
  const STREAM_COPY = 'Every WISEcodeAI turn streams its answer one word at a time, then the timestamp and chips land after the line.';
  const streamOut = mod.querySelector('[data-stream-out]');
  const streamRun = mod.querySelector('[data-stream-run]');
  let streamTimer = 0;
  const runStream = () => {
    if (!streamOut) return;
    clearTimeout(streamTimer);
    const words = STREAM_COPY.split(/\s+/);
    if (reduced) { streamOut.textContent = STREAM_COPY; return; }
    streamOut.textContent = '';
    let i = 0;
    const tick = () => {
      if (i >= words.length) return;
      streamOut.textContent += (i ? ' ' : '') + words[i];
      i += 1;
      streamTimer = setTimeout(tick, 48);
    };
    tick();
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

  /* ---- Welcome helix ---- */
  const helixHost = mod.querySelector('[data-motion-helix]');
  const helixBody = mod.querySelector('[data-helix-body]');
  const helixRange = mod.querySelector('[data-helix-opacity]');
  const helixVal = mod.querySelector('[data-helix-opacity-val]');
  const BGANIM_OPACITY_KEY = 'wise:chat-bg-anim-opacity';
  const readHelixPct = () => {
    try {
      const s = parseInt(localStorage.getItem(BGANIM_OPACITY_KEY), 10);
      if (!isNaN(s)) return Math.max(10, Math.min(100, s));
    } catch (_) { /* ignore */ }
    return 20;
  };
  let helixPct = readHelixPct();
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
  paintHelixOpacity(helixPct, false);
  let helixPaused = false;
  let helix = null;
  if (helixHost && helixBody) {
    helix = createHelixBgAnim({
      host: helixHost,
      getBody: () => helixBody,
      getOpacity: () => helixPct / 100,
      reducedMotion: reduced,
      isOn: () => !mod.classList.contains('is-collapsed'),
      isPaused: () => helixPaused,
    });
  }
  helixRange?.addEventListener('input', () => {
    paintHelixOpacity(parseInt(helixRange.value, 10) || 20, true);
  });
  document.addEventListener('wise:chat-bg-anim-opacity', (e) => {
    const v = e && e.detail && e.detail.opacity;
    if (typeof v !== 'number') return;
    paintHelixOpacity(Math.round(v * 100), false);
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
  const TIER_NAMES = ['single', 'double', 'triple', 'fill'];
  let widthTier = 0;
  const applyWidth = () => {
    if (window.WPaneWidth) {
      window.WPaneWidth.applyClasses(widthPane, widthTier, 'panel');
      window.WPaneWidth.syncButton(widthBtn, widthTier);
    } else if (widthPane) {
      widthPane.classList.toggle('panel-wide', widthTier >= 1);
      widthPane.classList.toggle('panel-triple', widthTier >= 2);
      widthPane.classList.toggle('panel-fill', widthTier >= 3);
    }
    if (widthLab) widthLab.textContent = TIER_NAMES[widthTier];
  };
  widthBtn?.addEventListener('click', () => {
    widthTier = (widthTier + 1) % 4;
    applyWidth();
  });

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
    mod.querySelectorAll('[data-motion-chart]').forEach(replayChart);
    if (helix) helix.start();
  };
  startWhenOpen();
  new MutationObserver(startWhenOpen).observe(mod, { attributes: true, attributeFilter: ['class'] });
}

/* ------------------------------------------------------------------ */
/* Styles — scoped, self-contained so the module drops onto any shell  */
/* ------------------------------------------------------------------ */

function moduleStyles() {
  return `<style id="mi-styles">
    .mi-wrap { padding: var(--module-head-pad-t, 26px) var(--module-head-pad-x, 40px) 64px; }

    .mi-hero {
      margin-bottom: 8px; display: flex; align-items: flex-start; justify-content: space-between;
      gap: 20px; flex-wrap: wrap;
    }
    .mi-hero-text { min-width: 0; flex: 1 1 360px; }
    .mi-hero-title {
      font-family: 'WISE Digits', 'Noto Serif', Georgia, serif;
      margin: 0; font-size: 1.7rem; font-weight: 800; letter-spacing: -0.01em; color: var(--text);
    }
    .mi-hero-lede { font-size: 0.95rem; color: var(--text-muted); margin: 8px 0 0; max-width: 74ch; }

    /* ---- View toggle (Grid ⇄ Carousel) ---- */
    .mi-view {
      display: inline-flex; gap: 4px; flex: 0 0 auto;
      padding: 4px; border-radius: 999px;
      background: var(--surface-2); border: 1px solid var(--border);
    }
    html.dark .mi-view { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.10); }
    .mi-view-btn {
      display: inline-flex; align-items: center; gap: 6px;
      border: 0; background: transparent; cursor: pointer;
      padding: 8px 15px; border-radius: 999px;
      font: inherit; font-size: 0.8125rem; font-weight: 700; color: var(--text-muted);
      transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
    }
    .mi-view-btn .material-symbols-outlined { font-size: 18px !important; line-height: 1 !important; }
    .mi-view-btn:hover { color: var(--text); }
    .mi-view-btn.is-active { background: var(--surface); color: var(--primary); box-shadow: var(--shadow-1); }
    html.dark .mi-view-btn.is-active { color: var(--primary-bright, #93C5FD); }
    .mi-view-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 22%, transparent); }

    /* ---- Screenshot export buttons ---- */
    .mi-export { display: inline-flex; gap: 8px; flex: 0 0 auto; }
    .mi-export-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 15px; height: 40px; box-sizing: border-box;
      border: 1px solid var(--border-strong); border-radius: 999px;
      background: var(--surface-2); cursor: pointer;
      font: inherit; font-size: 0.8125rem; font-weight: 700; color: var(--text);
      transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    }
    html.dark .mi-export-btn { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.10); }
    .mi-export-btn .material-symbols-outlined { font-size: 18px !important; line-height: 1 !important; color: var(--primary); }
    .mi-export-btn:hover { border-color: var(--primary); color: var(--primary); box-shadow: var(--shadow-1); }
    .mi-export-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 22%, transparent); }
    .mi-export-btn[disabled] { opacity: 0.55; cursor: default; box-shadow: none; }
    .mi-export-btn[disabled] .material-symbols-outlined { animation: mi-export-spin 0.9s linear infinite; }
    @keyframes mi-export-spin { to { transform: rotate(360deg); } }

    /* ---- Capture progress overlay ---- */
    .mi-cap-scrim {
      position: fixed; inset: 0; z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      background: color-mix(in srgb, #0b1220 55%, transparent);
      opacity: 0; pointer-events: none; transition: opacity 0.2s ease;
    }
    .mi-cap-scrim.is-open { opacity: 1; pointer-events: auto; }
    .mi-cap-card {
      width: min(460px, calc(100vw - 40px)); max-height: min(70vh, 620px);
      display: flex; flex-direction: column;
      background: var(--surface); color: var(--text);
      border: 1px solid var(--border); border-radius: 18px;
      box-shadow: var(--shadow-2); overflow: hidden;
      transform: translateY(10px) scale(0.98); transition: transform 0.2s ease;
    }
    .mi-cap-scrim.is-open .mi-cap-card { transform: none; }
    .mi-cap-head { display: flex; align-items: center; gap: 12px; padding: 18px 20px 12px; }
    .mi-cap-ic {
      display: inline-flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; border-radius: 10px; flex: 0 0 auto;
      background: color-mix(in srgb, var(--primary) 14%, transparent); color: var(--primary);
    }
    .mi-cap-ic .material-symbols-outlined { font-size: 20px !important; }
    .mi-cap-titles { flex: 1 1 auto; min-width: 0; }
    .mi-cap-title { font-size: 0.95rem; font-weight: 800; }
    .mi-cap-sub { font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; }
    .mi-cap-close {
      border: 0; background: transparent; cursor: pointer; color: var(--text-muted);
      border-radius: 8px; padding: 6px; line-height: 0;
    }
    .mi-cap-close:hover { background: var(--surface-2); color: var(--text); }
    .mi-cap-bar { height: 6px; margin: 0 20px; border-radius: 999px; background: var(--surface-2); overflow: hidden; }
    .mi-cap-fill { height: 100%; width: 0%; border-radius: 999px; background: var(--primary); transition: width 0.25s ease; }
    .mi-cap-list { margin: 14px 20px 4px; padding: 0; list-style: none; overflow-y: auto; }
    .mi-cap-row {
      display: flex; align-items: center; gap: 8px; padding: 6px 0;
      font-size: 0.82rem; border-bottom: 1px solid var(--border);
    }
    .mi-cap-row:last-child { border-bottom: 0; }
    .mi-cap-row .material-symbols-outlined { font-size: 17px !important; flex: 0 0 auto; }
    .mi-cap-row-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mi-cap-row[data-state="pending"] { color: var(--text-subtle); }
    .mi-cap-row[data-state="run"] { color: var(--text); }
    .mi-cap-row[data-state="run"] .material-symbols-outlined { color: var(--primary); animation: mi-export-spin 0.9s linear infinite; }
    .mi-cap-row[data-state="ok"] .material-symbols-outlined { color: #16A34A; }
    html.dark .mi-cap-row[data-state="ok"] .material-symbols-outlined { color: #4ADE80; }
    .mi-cap-row[data-state="err"] { color: var(--text-muted); }
    .mi-cap-row[data-state="err"] .material-symbols-outlined { color: #DC2626; }
    .mi-cap-foot { padding: 12px 20px 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .mi-cap-note { font-size: 0.78rem; color: var(--text-muted); }
    .mi-cap-done-btn {
      border: 0; border-radius: 999px; padding: 9px 18px; cursor: pointer;
      font: inherit; font-size: 0.82rem; font-weight: 700;
      background: var(--primary); color: #fff;
    }
    .mi-cap-done-btn[disabled] { opacity: 0.5; cursor: default; }

    /* ---- Rail view: live previews of every actual module, side by side ---- */
    .mi-rail {
      position: relative; margin-top: 22px; display: flex; align-items: stretch; gap: 8px;
      --frame-w: 1280px; --frame-h: 1900px; --pane-scale: 0.34;
      --pane-w: calc(var(--frame-w) * var(--pane-scale));
      --pane-h: calc(var(--frame-h) * var(--pane-scale));
    }
    .mi-rail[hidden], .mi-rail-empty[hidden], .mi-pane[hidden] { display: none; }
    .mi-rail-track {
      display: flex; gap: 18px; flex: 1; min-width: 0;
      overflow-x: auto; scroll-snap-type: x proximity; scroll-behavior: smooth;
      padding: 6px 4px 18px; scrollbar-width: thin;
    }
    .mi-rail-track::-webkit-scrollbar { height: 8px; }
    .mi-rail-track::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 999px; }
    .mi-rail-nav {
      flex: 0 0 auto; align-self: center; width: 42px; height: 42px; border-radius: 999px;
      border: 1px solid var(--border-strong); background: var(--surface); color: var(--text);
      cursor: pointer; display: grid; place-items: center; box-shadow: var(--shadow-1);
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    .mi-rail-nav:hover { transform: translateY(-2px); box-shadow: var(--shadow-2); border-color: var(--primary); color: var(--primary-ink, var(--primary)); }
    .mi-rail-nav:focus-visible { outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 22%, transparent); }
    .mi-rail-nav .material-symbols-outlined { font-size: 22px !important; }
    .mi-rail-empty {
      position: absolute; inset: 0; display: grid; place-items: center;
      color: var(--text-muted); font-size: 0.9rem;
    }

    .mi-pane {
      scroll-snap-align: start; flex: 0 0 auto; width: var(--pane-w);
      display: flex; flex-direction: column; gap: 10px;
    }
    .mi-pane-head { display: flex; align-items: center; gap: 8px; padding: 0 2px; text-decoration: none; color: inherit; }
    a.mi-pane-head:hover .mi-pane-name { color: var(--primary-ink, var(--primary)); }
    .mi-pane-ic { font-size: 20px !important; color: var(--primary); flex: 0 0 auto; }
    html.dark .mi-pane-ic { color: var(--primary-bright, #93C5FD); }
    .mi-pane-name {
      font-weight: 800; font-size: 0.9rem; color: var(--text);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .mi-pane-area {
      margin-left: auto; flex: 0 0 auto;
      font-size: 0.5625rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
      color: var(--text-subtle);
    }
    .mi-pane-viewport {
      position: relative; display: block; width: var(--pane-w); height: var(--pane-h);
      overflow: hidden; border-radius: 16px; border: 1px solid var(--border);
      background: var(--surface); box-shadow: var(--shadow-1); text-decoration: none;
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    }
    .mi-pane-viewport:hover {
      transform: translateY(-4px); box-shadow: var(--shadow-2);
      border-color: color-mix(in srgb, var(--primary) 45%, var(--border));
    }
    .mi-pane-frame {
      position: absolute; top: 0; left: 0; border: 0; background: var(--surface);
      width: var(--frame-w); height: var(--frame-h);
      transform: scale(var(--pane-scale)); transform-origin: top left;
      pointer-events: none;
    }
    .mi-pane-hit { position: absolute; inset: 0; z-index: 2; text-decoration: none; }
    .mi-pane-open {
      position: absolute; top: 10px; right: 10px; z-index: 3;
      display: grid; place-items: center; width: 30px; height: 30px; border-radius: 999px;
      background: color-mix(in srgb, var(--surface) 88%, transparent); color: var(--text);
      box-shadow: var(--shadow-1); font-size: 16px !important;
      opacity: 0; transform: translateY(-4px); transition: opacity 0.15s ease, transform 0.15s ease;
      pointer-events: none;
    }
    .mi-pane-viewport:hover .mi-pane-open { opacity: 1; transform: translateY(0); }

    /* ---- Table Gallery rail: landscape panes tuned for wide-and-short tables ---- */
    .mi-rail--tables {
      margin-top: 6px;
      --frame-w: 1180px; --frame-h: 760px; --pane-scale: 0.46;
    }
    .mi-tpane { width: var(--pane-w); }
    .mi-tpane .mi-pane-viewport { background: var(--surface-2, var(--surface)); }
    /* The isolated table sits at the top-left of the framed page; nudge the
       scaled frame in a hair so the table's own padding shows as a card inset. */
    .mi-tpane .mi-pane-frame { background: var(--surface); }
    .mi-tpane-desc {
      margin: 2px 2px 0; font-size: 0.75rem; line-height: 1.35; color: var(--text-muted);
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .mi-tpane-src {
      display: inline-flex; align-items: center; gap: 4px; margin: 0 2px;
      font-size: 0.75rem; font-weight: 700; line-height: 1.3;
      color: var(--primary-ink, var(--primary)); text-decoration: none;
    }
    .mi-tpane-src:hover { text-decoration: underline; }
    html.dark .mi-tpane-src { color: var(--primary-bright, #93C5FD); }
    .mi-tpane-src .material-symbols-outlined { font-size: 15px !important; }
    /* While a pane is still resolving its table, show a soft shimmer so an
       empty-looking frame reads as "loading", not "broken". */
    .mi-tpane .mi-pane-viewport::after {
      content: ""; position: absolute; inset: 0; z-index: 1; pointer-events: none;
      background: linear-gradient(100deg, transparent 30%, color-mix(in srgb, var(--primary) 8%, transparent) 50%, transparent 70%);
      background-size: 200% 100%; animation: mi-tbl-shimmer 1.2s ease-in-out infinite;
      opacity: 1; transition: opacity 0.3s ease;
    }
    .mi-tpane.is-focused .mi-pane-viewport::after,
    .mi-tpane.is-unfocused .mi-pane-viewport::after { opacity: 0; }
    @keyframes mi-tbl-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
    @media (prefers-reduced-motion: reduce) {
      .mi-tpane .mi-pane-viewport::after { animation: none; }
    }
    .mi-tbl-count {
      margin-left: auto; align-self: center; flex: 0 0 auto;
      font-size: 0.75rem; font-weight: 700; color: var(--text-muted);
    }
    .mi-tbl-count span { color: var(--text); }

    .mi-module { margin-top: 40px; }
    .mi-module-head {
      margin-bottom: 20px;
      display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
    }
    .mi-module-head-text { min-width: 0; }
    .mi-module-head .panel-controls {
      flex: 0 0 auto; margin-top: 2px; display: inline-flex; align-items: center; gap: 2px;
    }
    .mi-module-eyebrow {
      font-size: 0.6875rem; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase;
      color: var(--primary);
    }
    html.dark .mi-module-eyebrow { color: var(--primary-bright, #93C5FD); }
    .mi-module-title {
      font-family: 'WISE Digits', 'Noto Serif', Georgia, serif;
      margin: 4px 0 0; font-size: 1.35rem; font-weight: 800; letter-spacing: -0.01em; color: var(--text);
    }
    .mi-module-lede { font-size: 0.875rem; color: var(--text-muted); margin: 6px 0 0; max-width: 76ch; }
    .mi-module-lede code {
      font-family: 'SF Mono', ui-monospace, Menlo, monospace; font-size: 0.8em;
      padding: 1px 6px; border-radius: 6px; background: var(--surface-2); color: var(--text);
    }

    /* ---- Accordion: every module section collapses from its own header ---- */
    /* Turn the module header into a toggle bar. The whole header is clickable
       except its trailing ⋯ controls cluster. */
    .mi-module.mi-acc { margin-top: 22px; border-top: 1px solid var(--border); padding-top: 22px; }
    .mi-module.mi-acc > .mi-module-head { cursor: pointer; user-select: none; margin-bottom: 20px; }
    .mi-module.mi-acc > .mi-module-head > .mi-module-head-text { margin-right: auto; }
    .mi-acc-chevron {
      flex: 0 0 auto; align-self: flex-start; margin-top: 2px; margin-right: 2px;
      font-size: 24px !important; color: var(--text-muted);
      transition: transform 0.2s ease, color 0.15s ease;
    }
    .mi-module.mi-acc > .mi-module-head:hover .mi-acc-chevron { color: var(--primary); }
    .mi-module.is-collapsed > .mi-module-head { margin-bottom: 0; align-items: center; }
    .mi-module.is-collapsed .mi-acc-chevron { transform: rotate(-90deg); align-self: center; margin-top: 0; }
    /* Closed = title row only. Hide the lede and everything under the header
       (including before JS wraps it in .mi-acc-body) so sections never flash open. */
    .mi-module.is-collapsed .mi-module-lede { display: none; }
    .mi-module.is-collapsed > :not(.mi-module-head) { display: none; }
    .mi-module.mi-acc > .mi-module-head:focus-visible {
      outline: none; border-radius: 12px;
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 22%, transparent);
    }
    @media (prefers-reduced-motion: reduce) { .mi-acc-chevron { transition: none; } }

    /* ---- Module Directory ---- */
    .mi-dir-section { margin-top: 26px; }
    .mi-dir-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .mi-dir-title {
      font-size: 0.75rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;
      color: var(--text-subtle); margin: 0;
    }
    .mi-dir-count {
      display: inline-grid; place-items: center; min-width: 22px; height: 22px; padding: 0 7px;
      border-radius: 999px; font-size: 0.6875rem; font-weight: 800;
      background: var(--surface-2); color: var(--text-muted);
    }
    .mi-card-grid {
      display: grid; gap: 12px;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    }
    .mi-card {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; border-radius: 14px;
      border: 1px solid var(--border); background: var(--surface);
      box-shadow: var(--shadow-1); text-decoration: none; color: inherit;
      transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
    }
    .mi-card:hover {
      transform: translateY(-3px); box-shadow: var(--shadow-2);
      border-color: color-mix(in srgb, var(--primary) 45%, var(--border));
    }
    .mi-card-ic {
      display: grid; place-items: center; flex: 0 0 28px; width: 28px; color: var(--text);
    }
    .mi-dir-section[data-area="ai"] .mi-card-ic,
    .mi-dir-section[data-area="marketing"] .mi-card-ic { color: var(--primary-ink, var(--primary)); }
    .mi-card-ic .material-symbols-outlined { font-size: 24px; }
    .mi-card-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
    .mi-card-name {
      display: flex; align-items: center; gap: 7px;
      font-size: 0.9rem; font-weight: 700; color: var(--text);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .mi-card-badge {
      font-size: 0.5625rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
      padding: 2px 6px; border-radius: 999px; background: var(--ter-amber-10, rgba(245,158,11,.16));
      color: var(--ter-amber-text, #b45309);
    }
    .mi-card-href {
      font-family: 'SF Mono', ui-monospace, Menlo, monospace; font-size: 0.6875rem;
      color: var(--text-subtle); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .mi-card-group { font-size: 0.625rem; color: var(--text-subtle); }
    .mi-card-go { font-size: 16px !important; color: var(--text-subtle); flex: 0 0 auto; transition: transform 0.16s ease; }
    .mi-card:hover .mi-card-go { transform: translate(2px, -2px); color: var(--primary-ink, var(--primary)); }

    /* ---- Broken-link state (flagged live by runLinkValidation) ---- */
    .mi-card--broken {
      cursor: not-allowed; opacity: 0.62;
      border-color: color-mix(in srgb, var(--ter-red, #dc2626) 45%, var(--border));
      background: color-mix(in srgb, var(--ter-red, #dc2626) 6%, var(--surface));
    }
    .mi-card--broken:hover {
      transform: none; box-shadow: var(--shadow-1);
      border-color: color-mix(in srgb, var(--ter-red, #dc2626) 55%, var(--border));
    }
    .mi-card--broken .mi-card-go { color: var(--ter-red, #dc2626); }
    .mi-card--broken:hover .mi-card-go { transform: none; }
    .mi-card-broken-badge {
      flex: 0 0 auto;
      font-size: 0.5625rem; font-weight: 800; letter-spacing: 0.08em;
      padding: 2px 6px; border-radius: 999px;
      background: color-mix(in srgb, var(--ter-red, #dc2626) 16%, transparent);
      color: var(--ter-red-text, #b91c1c);
    }
    html.dark .mi-card-broken-badge { color: #fca5a5; }

    .mi-pane--broken .mi-pane-viewport {
      border-color: color-mix(in srgb, var(--ter-red, #dc2626) 50%, var(--border));
      cursor: not-allowed;
    }
    .mi-pane--broken .mi-pane-viewport:hover { transform: none; box-shadow: var(--shadow-1); }
    .mi-pane-broken {
      position: absolute; inset: 0; z-index: 4;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
      background: color-mix(in srgb, var(--surface) 92%, transparent);
      color: var(--ter-red-text, #b91c1c);
      font-size: 0.8125rem; font-weight: 700; letter-spacing: 0.02em; text-align: center;
    }
    html.dark .mi-pane-broken { color: #fca5a5; }
    .mi-pane-broken .material-symbols-outlined { font-size: 30px !important; }

    /* ---- Toolbar + search (mirrors product-portfolio's .pf-search-inline) ---- */
    .mi-toolbar {
      display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
      position: sticky; top: 0; z-index: 3;
      padding: 12px 0 6px;
      /* Solid module fill — not --bg. --bg is the page navy (#05141C) and the
         old fade-to-transparent gradient read as a leftover strip behind the
         search. Match .agent-main-inner so the sticky bar is the module. */
      background: var(--surface);
    }
    html.dark .mi-toolbar { background: #1A2339; }
    html.full-bleed.fb-rmod-tint .mi-toolbar { background: var(--fb-rmod-bg); }
    .mi-search-inline {
      position: relative; display: inline-flex; align-items: center;
      flex: 1 1 auto; min-width: 220px;
    }
    .mi-search-inline > .material-symbols-outlined {
      position: absolute; left: 15px; top: 50%; transform: translateY(-50%);
      font-size: 18px !important; color: var(--text-subtle); pointer-events: none;
    }
    .mi-search {
      width: 100%; height: 40px; box-sizing: border-box; padding: 0 16px 0 42px;
      font: inherit; font-size: 0.875rem; font-weight: 400; color: var(--text);
      background: var(--surface-2); border: 1px solid var(--border-strong);
      border-radius: 999px; outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
    }
    html.dark .mi-search { background: #1A2339; border-color: rgba(255,255,255,0.10); }
    html.full-bleed.fb-rmod-tint .mi-search { background: var(--fb-rmod-bg); }
    .mi-search::placeholder { color: color-mix(in srgb, var(--text-subtle) 60%, transparent); font-style: italic; }
    .mi-search:focus {
      border-color: color-mix(in srgb, var(--primary) 55%, var(--border-strong));
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent);
    }

    /* ---- Scorecards (mirrors product-portfolio's .pf-stat filter tiles) ---- */
    .mi-stats-bar { padding: 0 2px 10px; }
    .mi-stats-label {
      font-size: 0.625rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
      color: var(--text-subtle);
    }
    .mi-stats { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 8px; }
    .mi-stat {
      flex: 1 1 130px; min-width: 118px;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
      padding: 14px 16px;
      background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
      box-shadow: var(--shadow-1); font: inherit; text-align: center; cursor: pointer; color: inherit;
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease;
    }
    /* Scorecard fill mirrors the chat module (.sc-card) across every theme. */
    html.dark .mi-stat { background: #1A2339; }
    html.chat-tint:not(.dark) .mi-stat { background: color-mix(in srgb, var(--primary) 5%, #fff); }
    html.dark.chat-tint .mi-stat { background: color-mix(in srgb, var(--primary-bright, #8B9FAF) 8%, #1A2339); }
    .mi-stat:hover { transform: translateY(-2px); box-shadow: var(--shadow-2); border-color: var(--border-strong); }
    .mi-stat:focus-visible { outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 22%, transparent); }
    .mi-stat.is-active {
      border-color: var(--primary);
      background: color-mix(in srgb, var(--primary) 10%, var(--surface));
      box-shadow: inset 0 0 0 1px var(--primary), var(--shadow-1);
    }
    html.dark .mi-stat.is-active { background: color-mix(in srgb, var(--primary) 26%, transparent); }
    .mi-stat:disabled { cursor: default; }
    .mi-stat:disabled:hover { transform: none; box-shadow: var(--shadow-1); border-color: var(--border); }
    .mi-stat-num {
      font-family: 'WISE Digits', 'Noto Serif', Georgia, serif; font-size: 1.5rem; font-weight: 800;
      line-height: 1.05; color: var(--text);
    }
    /* Label text sits above its icon (icon below the label) on every scorecard. */
    .mi-stat-label {
      display: inline-flex; flex-direction: column; align-items: center; gap: 5px;
      font-size: 0.75rem; font-weight: 600; color: var(--text-muted);
    }
    .mi-stat-label .mi-stat-text { line-height: 1.15; }
    .mi-stat-label .material-symbols-outlined { font-size: 16px !important; line-height: 1 !important; color: var(--text-subtle); }
    .mi-stat.is-active .mi-stat-label,
    .mi-stat.is-active .mi-stat-label .material-symbols-outlined { color: var(--primary); }
    html.dark .mi-stat.is-active .mi-stat-label,
    html.dark .mi-stat.is-active .mi-stat-label .material-symbols-outlined { color: var(--primary-bright, #93C5FD); }

    .mi-dir-empty { padding: 32px; text-align: center; color: var(--text-muted); font-size: 0.9rem; }

    /* ---- Icon Inventory ---- */
    .ii-sort { display: inline-flex; gap: 6px; background: var(--surface-2); padding: 4px; border-radius: 11px; }
    .ii-filter {
      border: 0; background: transparent; cursor: pointer;
      padding: 6px 12px; border-radius: 8px;
      font: inherit; font-size: 0.8125rem; font-weight: 600; color: var(--text-muted);
      transition: background 0.14s ease, color 0.14s ease;
    }
    .ii-filter:hover { color: var(--text); }
    .ii-filter.is-active { background: var(--surface); color: var(--text); box-shadow: var(--shadow-1); }

    .ii-empty { padding: 40px; text-align: center; color: var(--text-muted); font-size: 0.9rem; }

    .ii-grid {
      display: grid; gap: 12px;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      align-items: start;
    }
    .ii-card {
      border: 1px solid var(--border); border-radius: 14px; background: var(--surface);
      box-shadow: var(--shadow-1); overflow: hidden;
      transition: border-color 0.16s ease, box-shadow 0.16s ease;
    }
    .ii-card:hover { border-color: color-mix(in srgb, var(--primary) 40%, var(--border)); box-shadow: var(--shadow-2); }
    .ii-card.is-open { border-color: color-mix(in srgb, var(--primary) 55%, var(--border)); }
    .ii-card-main {
      display: flex; align-items: center; gap: 13px; width: 100%;
      padding: 14px; border: 0; background: transparent; cursor: pointer; text-align: left; font: inherit;
    }
    .ii-glyph {
      display: grid; place-items: center; flex: 0 0 40px; width: 40px; height: 40px;
      color: var(--text);
    }
    .ii-glyph .material-symbols-outlined, .ii-glyph .material-symbols-outlined { font-size: 26px !important; }
    .ii-meta { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
    .ii-name {
      font-family: 'SF Mono', ui-monospace, Menlo, monospace; font-size: 0.8125rem; font-weight: 600;
      color: var(--text); word-break: break-all; line-height: 1.25;
    }
    .ii-label { font-size: 0.75rem; color: var(--text-muted); }
    .ii-label-none { font-style: italic; color: var(--text-subtle); }
    .ii-tagrow { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; margin-top: 3px; }
    .ii-tag {
      font-size: 0.5625rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;
      padding: 2px 6px; border-radius: 999px;
    }
    .ii-tag.is-icons { background: color-mix(in srgb, var(--primary) 16%, transparent); color: var(--primary); }
    html.dark .ii-tag.is-icons { color: var(--primary-bright, #93C5FD); }
    .ii-tag.is-symbols { background: var(--surface-2); color: var(--text-muted); }
    .ii-tag.is-group { background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary-ink, var(--primary)); }
    html.dark .ii-tag.is-group { color: var(--primary-bright, #93C5FD); }
    .ii-count {
      display: inline-flex; align-items: center; gap: 2px; margin-left: auto;
      font-size: 0.6875rem; font-weight: 700; color: var(--text-subtle);
    }
    .ii-count .material-symbols-outlined { font-size: 12px !important; }
    .ii-chev { font-size: 20px !important; color: var(--text-subtle); flex: 0 0 auto; transition: transform 0.2s ease; }
    .ii-card.is-open .ii-chev { transform: rotate(180deg); }

    .ii-places { padding: 0 14px 14px; border-top: 1px solid var(--border); }
    .ii-places-title {
      font-size: 0.625rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--text-subtle); margin: 12px 0 8px;
    }
    .ii-place-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
    .ii-place {
      display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
      padding: 6px 9px; border-radius: 8px; background: var(--surface-2);
    }
    .ii-place-file {
      font-family: 'SF Mono', ui-monospace, Menlo, monospace; font-size: 0.6875rem; color: var(--text-muted);
      word-break: break-all;
    }
    .ii-place-line { color: var(--primary-ink, var(--primary)); }
    .ii-place-label { font-size: 0.6875rem; color: var(--text); text-align: right; flex: 0 0 auto; max-width: 48%; display: inline-flex; flex-direction: column; align-items: flex-end; gap: 2px; }
    .ii-place-empty { color: var(--text-subtle); }
    .ii-place-group { font-size: 0.5625rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-subtle); }

    /* ---- Design System ---- */
    .ds-block { margin-top: 26px; }
    .ds-block-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
    .ds-footnote { font-size: 0.75rem; color: var(--text-subtle); margin: 14px 2px 0; max-width: 80ch; }
    .ds-footnote code, .ds-font-stack, .dsc-class, .ds-type-name code {
      font-family: 'SF Mono', ui-monospace, Menlo, monospace; font-size: 0.85em;
      padding: 1px 6px; border-radius: 6px; background: var(--surface-2); color: var(--text);
    }

    .ds-font-grid {
      display: grid; gap: 12px;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      align-items: stretch;
    }
    .ds-font-card {
      display: flex; flex-direction: column; gap: 6px;
      padding: 18px; border-radius: 14px;
      border: 1px solid var(--border); background: var(--surface); box-shadow: var(--shadow-1);
    }
    .ds-font-sample {
      font-size: 1.25rem; font-weight: 600; color: var(--text); line-height: 1.3;
      min-height: 2.6em; margin-bottom: 4px;
    }
    .ds-font-name { font-size: 0.9rem; font-weight: 800; color: var(--text); }
    .ds-font-stack { align-self: flex-start; word-break: break-all; }
    .ds-font-weights { font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-subtle); }
    .ds-font-use { font-size: 0.78rem; color: var(--text-muted); margin: 2px 0 0; }

    .ds-type-table {
      display: flex; flex-direction: column;
      border: 1px solid var(--border); border-radius: 14px; background: var(--surface);
      box-shadow: var(--shadow-1); overflow: hidden;
    }
    .ds-type-row {
      display: flex; align-items: center; gap: 24px; padding: 14px 18px;
      border-bottom: 1px solid var(--border);
    }
    .ds-type-row:last-child { border-bottom: 0; }
    .ds-type-sample { flex: 1 1 55%; min-width: 0; color: var(--text); line-height: 1.25; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ds-type-meta { flex: 1 1 45%; min-width: 220px; display: flex; flex-direction: column; gap: 2px; }
    .ds-type-name { font-size: 0.8125rem; font-weight: 700; color: var(--text); }
    .ds-type-spec { font-family: 'SF Mono', ui-monospace, Menlo, monospace; font-size: 0.6875rem; color: var(--primary); }
    html.dark .ds-type-spec { color: var(--primary-bright, #93C5FD); }
    .ds-type-use { font-size: 0.75rem; color: var(--text-muted); }
    @media (max-width: 720px) {
      .ds-type-row { flex-direction: column; align-items: flex-start; gap: 6px; }
      .ds-type-sample { white-space: normal; }
    }

    .ds-color-grid {
      display: grid; gap: 14px;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      align-items: start;
    }
    .ds-color-group {
      padding: 18px; border-radius: 14px;
      border: 1px solid var(--border); background: var(--surface); box-shadow: var(--shadow-1);
    }
    .ds-group-title {
      margin: 0; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;
      color: var(--text-subtle);
    }
    .ds-group-note { font-size: 0.75rem; color: var(--text-muted); margin: 8px 0 14px; }
    .ds-swatch-grid { display: flex; flex-direction: column; gap: 10px; }
    .ds-swatch { display: flex; align-items: center; gap: 12px; }
    .ds-swatch-chip {
      flex: 0 0 44px; width: 44px; height: 36px; border-radius: 9px;
      border: 1px solid var(--border); box-sizing: border-box;
    }
    .ds-swatch-chip--ink {
      display: grid; place-items: center; background: var(--surface);
      font-size: 1rem; font-weight: 800;
    }
    .ds-swatch-chip--border { background: var(--surface); border-width: 3px; border-style: solid; }
    .ds-swatch-chip--shadow { background: var(--surface); border-color: transparent; }
    .ds-swatch-chip--radius { background: var(--surface-2); border: 1.5px solid var(--border-strong); }
    .ds-swatch-meta { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .ds-swatch-name { font-family: 'SF Mono', ui-monospace, Menlo, monospace; font-size: 0.75rem; font-weight: 600; color: var(--text); }
    .ds-swatch-val { font-family: 'SF Mono', ui-monospace, Menlo, monospace; font-size: 0.65rem; color: var(--primary); }
    html.dark .ds-swatch-val { color: var(--primary-bright, #93C5FD); }
    .ds-swatch-use { font-size: 0.7rem; color: var(--text-muted); }

    /* ---- Component Library ---- */
    .dsc-grid {
      display: grid; gap: 14px;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      align-items: start;
    }
    .dsc-card {
      display: flex; flex-direction: column;
      border: 1px solid var(--border); border-radius: 14px; background: var(--surface);
      box-shadow: var(--shadow-1); overflow: hidden;
      transition: border-color 0.16s ease, box-shadow 0.16s ease;
    }
    .dsc-card:hover { border-color: color-mix(in srgb, var(--primary) 40%, var(--border)); box-shadow: var(--shadow-2); }
    /* Thin top bar — Dev Ready toggle, right-aligned above each component.
       OFF keeps the shared pink brand-toggle look; ON uses --sec-green. */
    .dsc-ready {
      display: flex; align-items: center; justify-content: flex-end;
      padding: 10px 12px 0; flex-shrink: 0;
    }
    .dsc-ready .dash-brand-toggle { font-size: 11px; }
    .dsc-ready .dash-brand-toggle.is-on,
    .dsc-ready .dash-brand-toggle[aria-checked="true"] {
      background: var(--sec-green, #32A966);
      border-color: color-mix(in srgb, var(--sec-green, #32A966) 78%, #000);
      color: #fff;
      box-shadow: 0 2px 10px color-mix(in srgb, var(--sec-green, #32A966) 40%, transparent);
    }
    .dsc-ready .dash-brand-toggle.is-on:hover,
    .dsc-ready .dash-brand-toggle[aria-checked="true"]:hover {
      background: color-mix(in srgb, var(--sec-green, #32A966) 88%, #000);
      border-color: color-mix(in srgb, var(--sec-green, #32A966) 70%, #000);
      box-shadow: 0 2px 14px color-mix(in srgb, var(--sec-green, #32A966) 50%, transparent);
    }
    .dsc-ready .dash-brand-toggle.is-on .dash-brand-toggle-track,
    .dsc-ready .dash-brand-toggle[aria-checked="true"] .dash-brand-toggle-track {
      background: rgba(255, 255, 255, 0.3);
    }
    .dsc-ready .dash-brand-toggle.is-on .dash-brand-toggle-thumb,
    .dsc-ready .dash-brand-toggle[aria-checked="true"] .dash-brand-toggle-thumb {
      background: #fff;
    }
    .dsc-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 10px 16px 10px; flex-wrap: wrap; }
    .dsc-name { font-size: 0.9rem; font-weight: 800; color: var(--text); }
    .dsc-class { font-size: 0.625rem; color: var(--text-muted); word-break: break-word; }
    .dsc-demo {
      display: flex; flex-direction: column; align-items: flex-start; gap: 10px;
      padding: 18px 16px; margin: 0 12px;
      border-radius: 12px; border: 1px dashed var(--border-strong);
      background:
        radial-gradient(color-mix(in srgb, var(--text-subtle) 14%, transparent) 1px, transparent 1px) 0 0 / 14px 14px,
        var(--surface-2);
    }
    html.dark .dsc-demo { background:
        radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px) 0 0 / 14px 14px,
        rgba(255,255,255,0.03); }
    .dsc-used {
      display: flex; align-items: baseline; gap: 8px; padding: 12px 16px 14px;
    }
    .dsc-used-label {
      flex: 0 0 auto; font-size: 0.5625rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--text-subtle); padding-top: 1px;
    }
    .dsc-used-list { font-size: 0.72rem; color: var(--text-muted); line-height: 1.5; }
    .dsc-card[hidden] { display: none; }

    /* Full-width cards for components that need the room (tables, charts,
       modals, stat boards). They span the whole grid row and reinforce that
       the component reflows across the available width. */
    .dsc-card--wide { grid-column: 1 / -1; }

    /* The shared "rule" behind a component (esp. how it stays responsive). */
    .dsc-note {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 10px 16px 0; font-size: 0.72rem; line-height: 1.5; color: var(--text-muted);
    }
    .dsc-note > .material-symbols-outlined { font-size: 15px !important; color: var(--primary); flex: 0 0 auto; margin-top: 1px; }
    html.dark .dsc-note > .material-symbols-outlined { color: var(--primary-bright, #93C5FD); }
    .dsc-note code { font-size: 0.68rem; }

    /* Demo neutralizers — components that are absolutely positioned or animated
       in situ render inline + inert inside the demo stage. */
    .dsc-demo .topbar-popover { position: static; animation: none; display: block; }
    .dsc-demo .ag-toast { animation: none; }
    /* relative (not static) so the unread-dot ::after anchors to the chip —
       static would let it escape to the module's top-right corner and float
       there as a stray red dot. */
    .dsc-demo .topbar-profile { position: relative; top: auto; right: auto; transform: none; }
    .dsc-demo .topbar-profile:hover { transform: scale(1.04); }
    .dsc-demo .topbar-profile.has-dot::after { top: -1px; right: -1px; }
    .dsc-demo .adm-avatar,
    .dsc-demo .adm-avatar--photo,
    .dsc-demo .topbar-profile { border-radius: 50%; }
    .dsc-demo .dash-btn-row { align-self: stretch; align-items: center; }
    .dsc-demo .dash-text-link { margin-top: 0; }
    .dsc-demo .fl-input-wrap { width: 100%; }
    .dsc-demo .sc-input-row { width: 100%; align-self: stretch; }
    /* Composer popovers open upward out of the dashed stage — don't clip them. */
    .dsc-card:has([data-wise-composer]) { overflow: visible; }
    .dsc-demo .ws-scorecards { flex-wrap: wrap; overflow: visible; padding: 0; gap: 10px; }
    .dsc-demo .ws-scorecard { flex: 1 1 220px; min-width: 200px; max-width: 280px; }
    .dsc-demo .mi-search-inline { width: 100%; }
    /* New in-situ components: render the popovers/menus/modal inline + inert. */
    .dsc-demo .adm-filter-pop { position: static; margin-top: 10px; width: 100%; box-shadow: none; }
    .dsc-demo .adm-rowmenu-pop { position: static; box-shadow: none; }
    .dsc-demo .wise-popover { position: static; box-shadow: none; }
    .dsc-demo .adm-modal { transform: none; box-shadow: var(--shadow-2); }
    .dsc-demo .adm-donut-arc,
    .dsc-demo .adm-bar-fill,
    .dsc-demo .adm-vrow-bar span { transition: none; }

    /* Download affordance (e.g. the Charts & graphs design-rules .md). */
    .dsc-download-row { padding: 0 16px 4px; }
    a.dsc-download { text-decoration: none; }
    a.dsc-download .material-symbols-outlined { font-size: 18px !important; }

    /* Labeled sub-groups inside a demo (e.g. large vs small intent chips). */
    .dsc-sub { display: flex; flex-direction: column; gap: 8px; width: 100%; }
    .dsc-sub-label {
      font-size: 0.5625rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--text-subtle);
    }
    /* Scorecard variants: the live 8-col / 4-col grids would squash a 4-up
       demo, so the library stage uses auto-fit. Claim demo is two columns. */
    .dsc-demo .adm-vf-stats { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
    .dsc-demo .dash-score-band { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); width: 100%; }
    .dsc-demo .dsc-claim-demo {
      grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
      width: 100%;
      padding: 22px 24px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-md, 16px);
      box-shadow: var(--shadow-card);
    }
    html.dark .dsc-demo .dsc-claim-demo { background: var(--surface); }
    .dsc-card[data-comp-name="Scorecards"] .dsc-demo { gap: 22px; align-items: stretch; }

    /* Reply-chip variants (match / dive / selected). Size is locked at 28px
       on the shared .chip rule in wise.css — do not re-inflate padding here. */
    .dsc-demo .sc-reply-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .dsc-demo .sc-reply-chips .chip { text-align: left; max-width: 100%; }
    .dsc-demo .sc-reply-chips .chip .material-symbols-outlined { align-self: center; flex-shrink: 0; }
    .dsc-demo .sc-reply-chips .chip--match {
      border-color: color-mix(in srgb, var(--primary) 45%, var(--border));
      background: color-mix(in srgb, var(--primary) 10%, transparent);
    }
    .dsc-demo .sc-reply-chips .chip--match .material-symbols-outlined { color: var(--primary-ink, var(--primary)) !important; }
    .dsc-demo .chip.chip-dive {
      background: transparent; border-color: var(--primary); color: var(--primary); font-weight: 600;
    }
    .dsc-demo .chip.chip-dive .material-symbols-outlined { color: var(--primary) !important; }
    html.dark .dsc-demo .chip.chip-dive { border-color: var(--primary-bright, #8B9FAF); color: var(--primary-bright, #8B9FAF); }
    html.dark .dsc-demo .chip.chip-dive .material-symbols-outlined { color: var(--primary-bright, #8B9FAF) !important; }
    .dsc-demo .sc-reply-chips .chip.ms-chip.is-selected {
      background: var(--primary); border-color: var(--primary); color: #fff; font-weight: 600;
    }
    .dsc-demo .sc-reply-chips .chip.ms-chip.is-selected .material-symbols-outlined { color: #fff !important; }

    /* Bottom sheet demo: render inline (not fixed / off-screen) + inert. */
    .dsc-demo .ag-sheet { animation: none; }

    /* The shared pagination footer's real styles are injected at runtime by
       js/table-pagination.js (not loaded here). Mirror them so the Data table
       and Pagination demos show the true footer. */
    .dsc-demo .wtp-foot {
      display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
      padding: 11px 14px 10px; border-top: 1px solid var(--border);
      font-size: 0.76rem; color: var(--text-subtle); font-variant-numeric: tabular-nums;
    }
    .dsc-demo .wtp-count { font-size: 0.76rem; color: var(--text-subtle); line-height: 1.4; }
    .dsc-demo .wtp-count b { font-weight: 700; color: var(--text-muted); }
    .dsc-demo .wtp-more {
      display: inline-flex; align-items: center; gap: 4px; cursor: pointer;
      background: transparent; border: 0; padding: 2px 4px; margin: -2px -4px; border-radius: 6px;
      color: var(--primary); font-family: inherit; font-size: 0.76rem; font-weight: 700;
    }
    html.dark .dsc-demo .wtp-more { color: var(--primary-bright, #93C5FD); }
    .dsc-demo .wtp-more:hover { text-decoration: underline; }
    .dsc-demo .wtp-more .material-symbols-outlined { font-size: 16px !important; }
    .dsc-demo .adm-table-card { overflow-x: auto; }
    .dsc-demo .adm-table { min-width: 760px; }
    .dsc-demo .dsc-score {
      font-family: var(--module-title-family), 'Noto Serif', Georgia, serif;
      font-weight: 800; letter-spacing: -0.02em;
    }
    .dsc-demo .dsc-amt { font-variant-numeric: tabular-nums; font-weight: 700; }
    .dsc-demo .dsc-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.68rem; letter-spacing: 0.01em; }
    .dsc-demo .dsc-gs { display: inline-flex; align-items: center; gap: 0; color: var(--ter-amber, #C9A227); }
    .dsc-demo .dsc-gs .material-symbols-outlined { font-size: 16px !important; line-height: 1; }
    .dsc-demo .dsc-gs-on { font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 20; }
    .dsc-demo .dsc-gs-off { color: var(--border-strong); font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20; }

    /* Static tooltip bubble in the Tooltip demo — mirrors the dark #lir-tooltip. */
    .dsc-tip {
      display: inline-flex; align-items: center; padding: 4px 9px; border-radius: 7px;
      background: var(--text); color: var(--bg); font-size: 0.6875rem; font-weight: 600;
      box-shadow: var(--shadow-2); white-space: nowrap;
    }

    /* ---- Section quick-nav (scorecards at the very top) ---- */
    .dsc-jump {
      display: grid; gap: clamp(8px, 1.2vw, 12px); margin: 4px 0 26px;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 190px), 1fr));
    }
    .dsc-jump-tile {
      display: flex; align-items: center; gap: 12px; text-align: left; min-width: 0;
      padding: 15px 16px; border: 1px solid var(--border); border-radius: 16px;
      background: var(--surface); box-shadow: var(--shadow-1); cursor: pointer; font: inherit;
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    }
    html.dark .dsc-jump-tile { background: rgba(255,255,255,0.03); }
    .dsc-jump-tile:hover { transform: translateY(-2px); box-shadow: var(--shadow-2); border-color: color-mix(in srgb, var(--primary) 45%, var(--border)); }
    .dsc-jump-tile:focus-visible { outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 22%, transparent); }
    .dsc-jump-ic {
      flex: 0 0 auto; display: grid; place-items: center; color: var(--primary);
    }
    html.dark .dsc-jump-ic { color: var(--primary-bright, #93C5FD); }
    .dsc-jump-ic .material-symbols-outlined { font-size: 26px !important; }
    .dsc-jump-body { min-width: 0; display: flex; flex-direction: column; line-height: 1.15; }
    .dsc-jump-num { font-family: 'WISE Digits', 'Noto Serif', Georgia, serif; font-size: 1.4rem; font-weight: 800; color: var(--text); }
    .dsc-jump-label { font-size: 0.82rem; font-weight: 700; color: var(--text); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dsc-jump-sub { font-size: 0.68rem; color: var(--text-subtle); margin-top: 2px; }
    .dsc-jump-go { margin-left: auto; flex: 0 0 auto; font-size: 18px !important; color: var(--text-subtle); transition: transform 0.15s ease, color 0.15s ease; }
    .dsc-jump-tile:hover .dsc-jump-go { transform: translateY(2px); color: var(--primary); }
    html.dark .dsc-jump-tile:hover .dsc-jump-go { color: var(--primary-bright, #93C5FD); }
    @media (max-width: 600px) {
      .dsc-jump { grid-template-columns: repeat(auto-fill, minmax(min(100%, 150px), 1fr)); }
      .dsc-jump-tile { padding: 12px 13px; gap: 10px; }
      .dsc-jump-ic .material-symbols-outlined { font-size: 22px !important; }
      .dsc-jump-num { font-size: 1.2rem; }
    }

    .ds-pill {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 4px 11px; border-radius: 999px;
      font-size: 0.6875rem; font-weight: 700;
    }
    .ds-pill .material-symbols-outlined { font-size: 13px !important; }

    /* ---- Conventions & rules callout ---- */
    .dsc-conventions {
      margin: 4px 0 20px; padding: 18px 20px 20px;
      border: 1px solid var(--border); border-radius: 16px;
      background:
        linear-gradient(180deg, color-mix(in srgb, var(--primary) 5%, transparent), transparent 60%),
        var(--surface);
      box-shadow: var(--shadow-1);
    }
    html.dark .dsc-conventions { background:
        linear-gradient(180deg, rgba(96,165,250,0.08), transparent 60%),
        var(--surface); }
    .dsc-conv-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
    .dsc-conv-head > .material-symbols-outlined {
      font-size: 22px !important; color: var(--primary);
      background: color-mix(in srgb, var(--primary) 12%, transparent);
      border-radius: 10px; padding: 7px; flex: 0 0 auto;
    }
    html.dark .dsc-conv-head > .material-symbols-outlined { color: var(--primary-bright, #93C5FD); }
    .dsc-conv-title { font-size: 0.98rem; font-weight: 800; color: var(--text); }
    .dsc-conv-sub { font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; max-width: 78ch; }
    .dsc-conv-grid {
      display: grid; gap: 12px 18px;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    }
    .dsc-conv-item { display: flex; align-items: flex-start; gap: 11px; }
    .dsc-conv-ic {
      flex: 0 0 auto; width: 30px; height: 30px; border-radius: 9px;
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--surface-2); border: 1px solid var(--border); color: var(--primary);
    }
    html.dark .dsc-conv-ic { background: rgba(255,255,255,0.05); color: var(--primary-bright, #93C5FD); }
    .dsc-conv-ic .material-symbols-outlined { font-size: 17px !important; }
    .dsc-conv-body { min-width: 0; }
    .dsc-conv-item-title { font-size: 0.82rem; font-weight: 700; color: var(--text); margin-bottom: 2px; }
    .dsc-conv-item-desc { margin: 0; font-size: 0.75rem; line-height: 1.55; color: var(--text-muted); }
    .dsc-conv-item-desc code { font-size: 0.7rem; }

    /* ---- Codebase score cards ---- */
    .mi-code-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(172px, 1fr)); }
    .mi-code-card {
      border: 1px solid var(--border); border-radius: 16px; background: var(--surface);
      box-shadow: var(--shadow-1); padding: 15px 16px;
      display: flex; flex-direction: column; gap: 3px;
    }
    html.dark .mi-code-card { background: rgba(255,255,255,0.03); }
    .mi-code-hero { grid-column: 1 / -1; flex-direction: row; flex-wrap: wrap; gap: 22px; align-items: stretch; }
    .mi-code-hero-main { flex: 1 1 220px; min-width: 200px; display: flex; flex-direction: column; gap: 3px; }
    .mi-code-hero-chart { flex: 2 1 320px; min-width: 240px; display: flex; flex-direction: column; justify-content: flex-end; gap: 6px; }
    .mi-code-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
    .mi-code-ic {
      flex: 0 0 auto; width: 34px; height: 34px; border-radius: 10px;
      display: grid; place-items: center; color: var(--primary);
      background: color-mix(in srgb, var(--primary) 12%, transparent);
    }
    html.dark .mi-code-ic { color: var(--primary-bright, #93C5FD); }
    .mi-code-ic .material-symbols-outlined { font-size: 20px !important; }
    .mi-code-num {
      font-family: 'WISE Digits', var(--module-title-family, 'Noto Serif'), Georgia, serif;
      font-size: 1.65rem; font-weight: 800; color: var(--text); line-height: 1.05;
    }
    .mi-code-hero .mi-code-num { font-size: 2.3rem; }
    .mi-code-label { font-size: 0.84rem; font-weight: 700; color: var(--text); }
    .mi-code-sub { font-size: 0.7rem; color: var(--text-subtle); }
    .mi-code-pill {
      display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px;
      border-radius: 999px; font-size: 0.7rem; font-weight: 700; white-space: nowrap;
    }
    .mi-code-pill .material-symbols-outlined { font-size: 14px !important; }
    .mi-code-pill.is-up { color: #15803D; background: rgba(34,197,94,0.14); }
    .mi-code-pill.is-down { color: #B91C1C; background: rgba(239,68,68,0.12); }
    .mi-code-pill.is-flat { color: var(--text-subtle); background: color-mix(in srgb, var(--text-subtle) 14%, transparent); }
    html.dark .mi-code-pill.is-up { color: #4ADE80; }
    html.dark .mi-code-pill.is-down { color: #F87171; }
    .mi-code-pill-win { font-weight: 600; opacity: 0.75; }
    .mi-code-spark { width: 100%; height: 84px; display: block; }
    .mi-code-spark-line {
      fill: none; stroke: var(--primary); stroke-width: 1.6;
      vector-effect: non-scaling-stroke; stroke-linejoin: round; stroke-linecap: round;
    }
    html.dark .mi-code-spark-line { stroke: var(--primary-bright, #93C5FD); }
    .mi-code-spark-fill { fill: color-mix(in srgb, var(--primary) 14%, transparent); stroke: none; }
    .mi-code-spark-cap { display: flex; justify-content: space-between; gap: 10px; font-size: 0.68rem; color: var(--text-subtle); }
    .mi-code-updated { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; font-size: 0.72rem; color: var(--text-subtle); }
    .mi-code-updated .material-symbols-outlined { font-size: 15px !important; }

    /* ---- Intent Chip Audit ---- */
    .mi-int-stats {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
      gap: 10px; margin: 4px 0 18px;
    }
    .mi-int-stat {
      display: flex; flex-direction: column; gap: 4px; text-align: left; cursor: pointer;
      padding: 12px 14px; border-radius: 14px; font: inherit;
      background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-1);
      transition: border-color 0.14s ease, background 0.14s ease, transform 0.14s ease;
    }
    .mi-int-stat:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--primary) 40%, var(--border)); }
    .mi-int-stat.is-active { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 8%, var(--surface)); }
    .mi-int-stat-num { font-size: 1.5rem; font-weight: 800; line-height: 1; color: var(--text); font-variant-numeric: tabular-nums; }
    .mi-int-stat-label { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 0.75rem; font-weight: 600; color: var(--text-muted); }
    .mi-int-stat-label .material-symbols-outlined { font-size: 18px !important; color: var(--text-subtle); }
    .mi-int-stat--ok .mi-int-stat-num { color: #15803D; } html.dark .mi-int-stat--ok .mi-int-stat-num { color: #4ADE80; }
    .mi-int-stat--ok.is-active { border-color: #22C55E; background: rgba(34,197,94,0.10); }
    .mi-int-stat--warn .mi-int-stat-num { color: #B45309; } html.dark .mi-int-stat--warn .mi-int-stat-num { color: #FBBF24; }
    .mi-int-stat--warn.is-active { border-color: #F59E0B; background: rgba(245,158,11,0.12); }
    .mi-int-stat--bad .mi-int-stat-num { color: #B91C1C; } html.dark .mi-int-stat--bad .mi-int-stat-num { color: #F87171; }
    .mi-int-stat--bad.is-active { border-color: #EF4444; background: rgba(239,68,68,0.10); }

    /* Call-out panel */
    .mi-int-callout {
      border: 1px solid var(--border); border-radius: 16px; background: var(--surface);
      padding: 16px 18px; margin-bottom: 20px; box-shadow: var(--shadow-1);
      border-left: 4px solid #F59E0B;
    }
    .mi-int-callout.is-clear { border-left-color: #22C55E; display: flex; align-items: center; gap: 12px; }
    .mi-int-callout-head { display: flex; align-items: flex-start; gap: 12px; font-size: 0.9rem; color: var(--text); line-height: 1.5; }
    .mi-int-callout-head strong { color: var(--text); }
    .mi-int-callout-ic { flex: 0 0 auto; display: grid; place-items: center; width: 32px; height: 32px; border-radius: 999px; background: rgba(245,158,11,0.14); color: #B45309; }
    html.dark .mi-int-callout-ic { color: #FBBF24; }
    .mi-int-callout.is-clear .mi-int-callout-ic { background: rgba(34,197,94,0.14); color: #15803D; }
    html.dark .mi-int-callout.is-clear .mi-int-callout-ic { color: #4ADE80; }
    .mi-int-callout.is-clear .mi-int-callout-ic { width: 34px; height: 34px; }
    .mi-int-gap-cols {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px; margin-top: 14px;
    }
    .mi-int-gap-col { background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 12px 13px; }
    .mi-int-gap-title { display: flex; align-items: center; gap: 7px; font-size: 0.8rem; font-weight: 800; color: var(--text); }
    .mi-int-gap-title .material-symbols-outlined { font-size: 17px !important; color: #B45309; }
    html.dark .mi-int-gap-title .material-symbols-outlined { color: #FBBF24; }
    .mi-int-gap-title--bad .material-symbols-outlined { color: #B91C1C; } html.dark .mi-int-gap-title--bad .material-symbols-outlined { color: #F87171; }
    .mi-int-gap-n {
      margin-left: auto; font-size: 0.7rem; font-weight: 800; padding: 1px 8px; border-radius: 999px;
      background: var(--surface); border: 1px solid var(--border); color: var(--text-muted); font-variant-numeric: tabular-nums;
    }
    .mi-int-gap-sub { font-size: 0.72rem; color: var(--text-subtle); margin: 5px 0 9px; line-height: 1.4; }
    .mi-int-gap-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
    .mi-int-gap-list li { display: flex; align-items: baseline; gap: 8px; font-size: 0.78rem; }
    .mi-int-gap-list li.is-empty { color: var(--text-subtle); font-style: italic; }
    .mi-int-gap-surf { flex: 0 0 auto; font-size: 0.6875rem; font-weight: 700; color: var(--text-subtle); text-transform: uppercase; letter-spacing: 0.04em; }
    .mi-int-gap-chip { color: var(--text); font-weight: 600; }

    /* Per-surface list */
    .mi-int-surfaces { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px; }
    .mi-int-surface { border: 1px solid var(--border); border-radius: 16px; background: var(--surface); box-shadow: var(--shadow-1); overflow: hidden; }
    .mi-int-surface[data-has-gap="1"] { border-color: color-mix(in srgb, #F59E0B 40%, var(--border)); }
    .mi-int-shead { display: flex; align-items: center; gap: 11px; padding: 13px 15px; border-bottom: 1px solid var(--border); }
    .mi-int-sic { flex: 0 0 auto; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); }
    html.dark .mi-int-sic { color: var(--primary-bright, #93C5FD); }
    .mi-int-stitles { min-width: 0; flex: 1; }
    .mi-int-sname { display: inline-flex; align-items: center; gap: 5px; font-size: 0.92rem; font-weight: 700; color: var(--text); text-decoration: none; }
    .mi-int-sname:hover { color: var(--primary); } html.dark .mi-int-sname:hover { color: var(--primary-bright, #93C5FD); }
    .mi-int-sname .material-symbols-outlined { font-size: 14px !important; color: var(--text-subtle); }
    .mi-int-ssrc { display: block; margin-top: 1px; }
    .mi-int-ssrc code { font-size: 0.68rem; color: var(--text-subtle); }
    .mi-int-scount {
      flex: 0 0 auto; font-size: 0.7rem; font-weight: 800; padding: 3px 9px; border-radius: 999px;
      background: var(--surface-2); border: 1px solid var(--border); color: var(--text-muted); font-variant-numeric: tabular-nums;
    }
    .mi-int-scount.all-wired { color: #15803D; background: rgba(34,197,94,0.12); border-color: transparent; }
    html.dark .mi-int-scount.all-wired { color: #4ADE80; }
    .mi-int-scount.has-gap { color: #B45309; background: rgba(245,158,11,0.14); border-color: transparent; }
    html.dark .mi-int-scount.has-gap { color: #FBBF24; }
    .mi-int-snote { display: flex; align-items: flex-start; gap: 7px; margin: 0; padding: 10px 15px 0; font-size: 0.74rem; color: var(--text-subtle); line-height: 1.45; }
    .mi-int-snote .material-symbols-outlined { font-size: 15px !important; margin-top: 1px; }
    .mi-int-chiplist { list-style: none; margin: 0; padding: 8px; display: flex; flex-direction: column; gap: 4px; }
    .mi-int-chip { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 10px; border-radius: 10px; }
    .mi-int-chip:hover { background: var(--surface-2); }
    .mi-int-chip-name { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .mi-int-chip-dot { flex: 0 0 auto; display: grid; place-items: center; width: 20px; height: 20px; border-radius: 999px; }
    .mi-int-chip-dot .material-symbols-outlined { font-size: 16px !important; }
    .mi-int-dot--wired { color: #16A34A; } html.dark .mi-int-dot--wired { color: #4ADE80; }
    .mi-int-dot--talk, .mi-int-dot--act { color: #D97706; } html.dark .mi-int-dot--talk, html.dark .mi-int-dot--act { color: #FBBF24; }
    .mi-int-dot--none { color: #DC2626; } html.dark .mi-int-dot--none { color: #F87171; }
    .mi-int-chip-label { font-size: 0.82rem; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mi-int-chip-id { flex: 0 0 auto; font-size: 0.66rem; color: var(--text-subtle); background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; padding: 1px 5px; }
    .mi-int-badges { flex: 0 0 auto; display: flex; gap: 5px; }
    .mi-int-badge {
      display: inline-flex; align-items: center; gap: 3px; font-size: 0.64rem; font-weight: 700;
      padding: 2px 7px; border-radius: 999px; border: 1px solid var(--border); white-space: nowrap;
    }
    .mi-int-badge .material-symbols-outlined { font-size: 13px !important; }
    .mi-int-badge.is-ok { color: #15803D; background: rgba(34,197,94,0.12); border-color: transparent; }
    html.dark .mi-int-badge.is-ok { color: #4ADE80; }
    .mi-int-badge.is-no { color: #B91C1C; background: rgba(239,68,68,0.10); border-color: transparent; }
    html.dark .mi-int-badge.is-no { color: #F87171; }
    .mi-int-empty { padding: 26px; text-align: center; color: var(--text-subtle); font-size: 0.85rem; }

    .mi-int-table {
      display: flex; flex-direction: column; width: 100%;
      border: 1px solid var(--border); border-radius: 16px; background: var(--surface);
      box-shadow: var(--shadow-1); overflow: hidden;
    }
    .mi-int-thead, .mi-int-trow {
      display: grid; grid-template-columns: var(--mi-int-cols);
      gap: 12px; align-items: start;
    }
    .mi-int-thead {
      padding: 11px 16px; border-bottom: 1px solid var(--border);
      background: var(--surface-2);
    }
    .mi-int-th {
      font-size: 0.6875rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
      color: var(--text-subtle);
    }
    .mi-int-trow {
      padding: 12px 16px; border-bottom: 1px solid var(--border);
    }
    .mi-int-trow:last-child { border-bottom: 0; }
    .mi-int-trow:hover { background: color-mix(in srgb, var(--primary) 5%, transparent); }
    .mi-int-trow[hidden] { display: none; }
    .mi-int-td { font-size: 0.8rem; color: var(--text); min-width: 0; }
    .mi-int-td--chip { display: flex; align-items: flex-start; gap: 8px; }
    .mi-int-td--chip .mi-int-chip-label { white-space: normal; overflow: visible; text-overflow: unset; font-weight: 700; }
    .mi-int-td--surf .mi-int-sname { font-size: 0.78rem; font-weight: 600; }
    .mi-int-td--flag { font-weight: 700; font-variant-numeric: tabular-nums; }
    .mi-int-trow .mi-int-td--flag:nth-child(4) { color: #15803D; }
    .mi-int-trow .mi-int-td--flag:nth-child(5) { color: #15803D; }
    .mi-int-trow[data-status="talk"] .mi-int-td--flag:nth-child(5),
    .mi-int-trow[data-status="act"] .mi-int-td--flag:nth-child(4),
    .mi-int-trow[data-status="none"] .mi-int-td--flag { color: #B91C1C; }
    html.dark .mi-int-trow .mi-int-td--flag:nth-child(4),
    html.dark .mi-int-trow .mi-int-td--flag:nth-child(5) { color: #4ADE80; }
    html.dark .mi-int-trow[data-status="talk"] .mi-int-td--flag:nth-child(5),
    html.dark .mi-int-trow[data-status="act"] .mi-int-td--flag:nth-child(4),
    html.dark .mi-int-trow[data-status="none"] .mi-int-td--flag { color: #F87171; }
    .mi-int-td--does { font-size: 0.76rem; line-height: 1.45; color: var(--text-muted); }
    @media (max-width: 820px) {
      .mi-int-table { overflow-x: auto; }
      .mi-int-thead, .mi-int-trow { min-width: 760px; }
    }

    /* ---- Streaming Trace anatomy ---- */
    .mi-trace { display: grid; grid-template-columns: minmax(0, 1fr) 264px; gap: 20px; align-items: start; }
    @media (max-width: 720px) { .mi-trace { grid-template-columns: 1fr; } }
    .mi-trace-card {
      min-width: 0; padding: 18px 20px;
      border: 1px solid var(--border); border-radius: 14px; background: var(--surface-2);
    }
    html.dark .mi-trace-card { background: rgba(255,255,255,0.03); }
    /* Dev Ready sits in the module header next to the ⋯ cluster. Don't let a
       click on it collapse/expand the accordion. */
    .mi-module-head .dsc-ready {
      padding: 0; flex: 0 0 auto; align-self: flex-start; margin-top: 4px;
    }
    .mi-module.is-collapsed > .mi-module-head .dsc-ready { align-self: center; margin-top: 0; }

    /* ---- Dev Ready hierarchy — progress pill, gated state, child toggles ---- */
    /* Module toggles carry a "k/n ready" pill; keep the pill + switch on one row. */
    .dsc-ready { gap: 10px; }
    .dsc-ready-progress {
      display: inline-flex; align-items: center; gap: 5px; flex: 0 0 auto;
      font-size: 0.6875rem; font-weight: 800; letter-spacing: 0.02em;
      color: var(--text-muted); white-space: nowrap; line-height: 1;
    }
    .dsc-ready-progress .material-symbols-outlined { font-size: 16px !important; line-height: 1 !important; }
    .dsc-ready-progress.is-complete { color: var(--sec-green, #32A966); }
    @keyframes dsc-nudge {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-3px); }
      75% { transform: translateX(3px); }
    }
    .dsc-ready-progress.nudge { animation: dsc-nudge 0.28s ease; }
    @media (prefers-reduced-motion: reduce) { .dsc-ready-progress.nudge { animation: none; } }
    /* Gated module switch — visibly not-yet-available (its parts aren't all done). */
    .dsc-ready .dash-brand-toggle.is-gated { opacity: 0.5; cursor: not-allowed; }
    .dsc-ready .dash-brand-toggle.is-gated:hover { box-shadow: none; transform: none; }

    /* Lower-level (item) toggles that sit inline in a card / section head. */
    .mi-motion-card-head .dsc-ready--item,
    .mi-dir-head .dsc-ready--item,
    .ds-group-head .dsc-ready--item,
    .ds-block-head .dsc-ready--item {
      padding: 0; margin-left: auto; flex: 0 0 auto; align-self: flex-start;
    }
    .mi-dir-head .dsc-ready--item,
    .ds-group-head .dsc-ready--item,
    .ds-block-head .dsc-ready--item { align-self: center; }
    /* The directory count badge no longer needs to push to the far right — the
       toggle owns the right edge now. */
    .mi-dir-head .mi-dir-count { margin-right: 0; }
    .ds-group-head { display: flex; align-items: center; gap: 10px; }

    .mi-trace-side { display: flex; flex-direction: column; gap: 14px; }
    .mi-trace-run {
      display: inline-flex; align-items: center; justify-content: center; gap: 7px;
      padding: 9px 15px; height: 40px; box-sizing: border-box; align-self: flex-start;
      border: 1px solid var(--border-strong); border-radius: 999px; background: var(--surface);
      font: inherit; font-size: 0.8125rem; font-weight: 700; color: var(--text); cursor: pointer;
      transition: border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
    }
    html.dark .mi-trace-run { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.12); }
    .mi-trace-run .material-symbols-outlined { font-size: 18px !important; line-height: 1 !important; color: var(--primary); }
    .mi-trace-run:hover:not([disabled]) { border-color: var(--primary); color: var(--primary); box-shadow: var(--shadow-1); }
    .mi-trace-run:focus-visible { outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 22%, transparent); }
    .mi-trace-run[disabled] { opacity: 0.6; cursor: default; }

    .mi-trace-legend { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
    .mi-trace-leg { display: flex; gap: 9px; font-size: 0.78rem; line-height: 1.45; color: var(--text-muted); }
    .mi-trace-leg strong { color: var(--text); font-weight: 700; }
    .mi-trace-leg-swatch { flex: 0 0 auto; width: 12px; height: 12px; border-radius: 3px; margin-top: 3px; }
    .mi-trace-leg-swatch--key { background: var(--ter-amber, #FFC434); }
    .mi-trace-leg-swatch--glob { background: color-mix(in srgb, var(--primary, #25507C) 46%, #ffffff); }
    html.dark .mi-trace-leg-swatch--glob { background: #93B2DC; }
    .mi-trace-leg-swatch--helix {
      background: linear-gradient(135deg, var(--primary, #25507C) 0%, var(--ter-amber, #FFC434) 55%, #12b76a 100%);
    }
    html.dark .mi-trace-leg-swatch--helix {
      background: linear-gradient(135deg, #AEC8ED 0%, #FFC434 55%, #3DD68C 100%);
    }

    /* ---- Motion & Resize ---- */
    #mi-motion .dsc-conv-head > .material-symbols-outlined {
      background: none; border-radius: 0; padding: 0;
    }
    #mi-motion .dsc-conv-title {
      font-family: 'WISE Digits', 'Noto Serif', Georgia, serif;
    }
    #mi-motion .dsc-conv-item > .material-symbols-outlined {
      flex: 0 0 auto; margin-top: 2px; color: var(--primary);
      font-size: 20px !important;
    }
    html.dark #mi-motion .dsc-conv-item > .material-symbols-outlined { color: var(--primary-bright, #93C5FD); }

    .mi-motion-grid {
      display: grid; gap: 14px;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      align-items: start;
    }
    .mi-motion-card {
      display: flex; flex-direction: column;
      border: 1px solid var(--border); border-radius: 14px; background: var(--surface);
      box-shadow: var(--shadow-1); overflow: hidden;
    }
    html.dark .mi-motion-card { background: rgba(255,255,255,0.03); }
    .mi-motion-card--wide { grid-column: 1 / -1; }
    .mi-motion-card[hidden] { display: none; }
    .mi-motion-card-head {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 16px 16px 0;
    }
    .mi-motion-card-head > .material-symbols-outlined {
      flex: 0 0 auto; margin-top: 2px; color: var(--primary); font-size: 22px !important;
    }
    html.dark .mi-motion-card-head > .material-symbols-outlined { color: var(--primary-bright, #93C5FD); }
    .mi-motion-card-head-text { min-width: 0; }
    .mi-motion-card-title {
      font-family: 'WISE Digits', 'Noto Serif', Georgia, serif;
      margin: 0; font-size: 1.05rem; font-weight: 800; letter-spacing: -0.01em; color: var(--text);
    }
    .mi-motion-card-src {
      display: block; margin-top: 3px; font-size: 0.625rem; color: var(--text-muted); word-break: break-word;
    }
    .mi-motion-card-lede {
      margin: 8px 16px 0; font-size: 0.78rem; line-height: 1.5; color: var(--text-muted);
    }
    .mi-motion-card-lede code { font-size: 0.72rem; }
    .mi-motion-stage {
      margin: 12px 12px 0; padding: 16px;
      border-radius: 12px; border: 1px dashed var(--border-strong);
      background: var(--surface-2);
      display: flex; flex-direction: column; align-items: flex-start; gap: 10px;
    }
    html.dark .mi-motion-stage { background: rgba(255,255,255,0.03); }
    .mi-motion-used {
      display: flex; align-items: baseline; gap: 8px; padding: 12px 16px 14px;
      font-size: 0.72rem; color: var(--text-muted); line-height: 1.5;
    }
    .mi-motion-used-label {
      flex: 0 0 auto; font-size: 0.5625rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--text-subtle);
    }
    .mi-motion-hint { margin: 0; font-size: 0.72rem; color: var(--text-subtle); }
    .mi-motion-stats { display: flex; flex-wrap: wrap; gap: 8px; width: 100%; }
    .mi-motion-stats .mi-stat { flex: 1 1 90px; min-width: 90px; }

    .mi-motion-chart { width: 100%; cursor: pointer; }
    .mi-motion-chart:focus-visible { outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 22%, transparent); }

    .mi-motion-stream { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; width: 100%; }
    .mi-motion-stream-line {
      margin: 0; min-height: 3.2em; font-size: 0.88rem; line-height: 1.45; color: var(--text);
    }

    .mi-motion-fly { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; width: 100%; }
    /* Same row as the chat welcome (.ws-chips): wrap, 10px gap, chips hug
       their label. Do not use .sc-reply-chips here — that row is the
       in-conversation indent and stretches pills in this stage. */
    .mi-motion-fly .ws-chips,
    .mi-motion-fly-row {
      display: flex; flex-wrap: wrap; justify-content: flex-start;
      gap: 10px; width: 100%; max-width: 100%; margin: 0;
    }
    .mi-motion-fly .chip {
      display: inline-flex; align-items: center; gap: 6px;
      box-sizing: border-box; width: max-content; max-width: 100%; flex: 0 0 auto;
      height: 28px; padding: 0 11px;
    }

    .mi-motion-helix { position: relative; width: 100%; border-radius: 12px; overflow: hidden; }
    .mi-motion-helix-stage {
      position: relative; width: 100%; height: 220px;
      background: color-mix(in srgb, var(--primary) 8%, var(--surface));
    }
    html.dark .mi-motion-helix-stage { background: color-mix(in srgb, var(--primary) 16%, var(--surface)); }
    .mi-motion-helix-bar {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      padding: 10px 2px 0;
    }
    .mi-motion-helix-opacity {
      display: flex; align-items: center; gap: 10px; flex: 1 1 180px; min-width: 180px;
    }
    .mi-motion-helix-opacity-label {
      font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
      color: var(--text-muted); white-space: nowrap;
    }
    .mi-motion-helix-opacity .sc-bganim-opacity {
      flex: 1 1 auto; min-width: 72px; height: 4px; cursor: pointer;
      accent-color: var(--primary);
    }
    .mi-motion-helix-opacity .sc-bganim-opacity-val {
      font-size: 11px; font-weight: 700; color: var(--text-muted);
      width: 34px; text-align: right; font-variant-numeric: tabular-nums;
    }

    .mi-motion-acc {
      width: 100%; border: 1px solid var(--border); border-radius: 12px; background: var(--surface);
    }
    .mi-motion-acc-head {
      display: flex; align-items: center; gap: 8px; width: 100%;
      padding: 12px 14px; border: 0; background: transparent; cursor: pointer;
      font: inherit; color: inherit; text-align: left;
    }
    .mi-motion-acc-head:focus-visible { outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 22%, transparent); }
    .mi-motion-acc-chevron {
      font-size: 22px !important; color: var(--text-muted);
      transition: transform 0.2s ease;
    }
    .mi-motion-acc-head[aria-expanded="false"] .mi-motion-acc-chevron { transform: rotate(-90deg); }
    .mi-motion-acc-title {
      font-family: 'WISE Digits', 'Noto Serif', Georgia, serif;
      font-size: 0.98rem; font-weight: 800;
    }
    .mi-motion-acc-body { padding: 0 14px 14px; font-size: 0.8rem; line-height: 1.5; color: var(--text-muted); }
    .mi-motion-acc-body p { margin: 0; }
    @media (prefers-reduced-motion: reduce) { .mi-motion-acc-chevron { transition: none; } }

    .mi-motion-split {
      position: relative; display: flex; width: 100%; height: 120px;
      border: 1px solid var(--border); border-radius: 12px; overflow: hidden;
      background: var(--surface);
    }
    .mi-motion-pane {
      min-width: 0; display: flex; flex-direction: column; align-items: flex-start; justify-content: center;
      gap: 4px; padding: 14px 16px;
      background: color-mix(in srgb, var(--primary) 7%, var(--surface));
    }
    .mi-motion-pane + .mi-motion-pane,
    .mi-motion-split-hit + .mi-motion-pane {
      background: color-mix(in srgb, var(--ter-amber, #FFC434) 10%, var(--surface));
    }
    .mi-motion-pane-label { font-size: 0.72rem; font-weight: 700; color: var(--text); }
    .mi-motion-pane-w {
      font-family: ui-monospace, 'SF Mono', Menlo, monospace;
      font-size: 0.78rem; font-weight: 700; color: var(--primary);
    }
    html.dark .mi-motion-pane-w { color: var(--primary-bright, #93C5FD); }
    .mi-motion-split-hit {
      flex: 0 0 16px; position: relative; z-index: 1; cursor: col-resize;
      display: flex; align-items: center; justify-content: center;
    }
    .mi-motion-split-grip {
      width: 6px; height: 40px; border-radius: 6px;
      background: rgba(16,24,32,.78); border: 1px solid rgba(255,255,255,.6);
      box-shadow: 0 2px 10px rgba(0,0,0,.45);
      opacity: 0; transform: scaleY(.5);
      transition: opacity 0.16s ease, transform 0.16s ease;
    }
    .mi-motion-split:hover .mi-motion-split-grip,
    .mi-motion-split.is-dragging .mi-motion-split-grip { opacity: 1; transform: scaleY(1); }
    html.dark .mi-motion-split-grip { background: rgba(230,236,244,.88); border-color: rgba(16,24,32,.35); }

    .mi-motion-width { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; width: 100%; }
    .mi-motion-width-row {
      display: flex; width: 100%; height: 88px;
      border: 1px solid var(--border); border-radius: 12px; overflow: hidden;
    }
    .mi-motion-width-pane { flex: 1 1 34%; transition: flex-basis 0.22s ease; }
    .mi-motion-width-pane.panel-wide { flex-basis: 48%; }
    .mi-motion-width-pane.panel-triple { flex-basis: 62%; }
    .mi-motion-width-pane.panel-fill { flex-grow: 1000; flex-basis: auto; }
    .mi-motion-width-rest { flex: 1 1 40%; }
    @media (prefers-reduced-motion: reduce) { .mi-motion-width-pane { transition: none; } }

    .mi-motion-reorder, .mi-motion-file-cards { display: flex; flex-wrap: wrap; gap: 8px; width: 100%; }
    .mi-motion-file { display: flex; flex-direction: column; gap: 12px; width: 100%; }
    .mi-motion-tile {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 10px 12px; border-radius: 12px;
      border: 1px solid var(--border); background: var(--surface);
      font-size: 0.8rem; font-weight: 700; color: var(--text);
      cursor: grab; user-select: none;
    }
    .mi-motion-tile.is-dragging { opacity: 0.4; }
    .mi-motion-grip { font-size: 18px !important; color: var(--text-muted); }

    /* Folder tiles mirror the Conversation Library folders row: a score card
       dressed as a manila folder — a protruding colored tab, the count on top,
       and a colored dot + name below. Folder color comes from --fld. */
    .mi-motion-file-folders, .mi-motion-found-folders {
      display: flex; flex-wrap: wrap; gap: 10px; width: 100%; padding-top: 8px;
    }
    .mi-motion-folder {
      position: relative; box-sizing: border-box;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
      min-width: 132px; padding: 12px 14px;
      border: 1px solid var(--border); border-radius: 6px;
      background: color-mix(in srgb, var(--fld, var(--primary)) 6%, var(--surface));
      box-shadow: var(--shadow-1);
      font-size: 0.8rem; font-weight: 700; color: var(--text);
      text-align: center; cursor: default; user-select: none;
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    }
    html.dark .mi-motion-folder { background: color-mix(in srgb, var(--fld, var(--primary)) 13%, #1A2339); }
    .mi-motion-folder::before {
      content: ""; position: absolute; top: -7px; left: 16px;
      width: 44px; height: 9px; background: var(--fld, var(--primary));
      border-radius: 6px 6px 0 0; clip-path: polygon(0 0, 74% 0, 100% 100%, 0 100%);
    }
    .mi-motion-folder-num { font-family: 'WISE Digits', 'Noto Serif', serif; font-size: 22px; font-weight: 800; line-height: 1.05; color: var(--text); }
    .mi-motion-folder-label { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: var(--text-muted); }
    .mi-motion-folder-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--fld, var(--primary)); flex: 0 0 auto; }
    .mi-motion-folder.is-drop-target {
      border-color: var(--fld, var(--primary));
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--fld, var(--primary)) 26%, transparent);
    }

    /* Drag-only "Remove from folder" tile — dashed, muted, no tab or count. */
    .mi-motion-folder--unfile {
      flex-direction: row; gap: 6px; min-width: 0; padding: 10px 12px;
      background: transparent; box-shadow: none; border-style: dashed;
      color: var(--primary); border-color: color-mix(in srgb, var(--primary) 45%, transparent);
    }
    html.dark .mi-motion-folder--unfile { color: var(--primary-bright, #93C5FD); background: transparent; }
    .mi-motion-folder--unfile::before { display: none; }
    .mi-motion-folder--unfile .material-symbols-outlined { font-size: 20px !important; color: currentColor; }
    .mi-motion-folder--unfile.is-drop-target { background: color-mix(in srgb, var(--primary) 12%, transparent); }

    .mi-motion-file-chip {
      margin-left: 4px; padding: 1px 7px; border-radius: 999px;
      font-size: 0.62rem; font-weight: 800; letter-spacing: 0.04em;
      background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary);
    }
    html.dark .mi-motion-file-chip { color: var(--primary-bright, #93C5FD); }
    .mi-motion-found { display: flex; flex-direction: column; gap: 12px; width: 100%; }
    .mi-motion-found-cards { display: flex; flex-wrap: wrap; gap: 8px; width: 100%; }
    .mi-motion-tile.is-drop-target {
      border-color: var(--primary); border-style: dashed;
      background: color-mix(in srgb, var(--primary) 8%, var(--surface));
    }
    .mi-motion-found-name {
      min-width: 84px; max-width: 150px; height: 24px; padding: 0 6px;
      border: 1px solid var(--fld, var(--primary)); border-radius: 6px;
      background: var(--surface); color: var(--text); font: inherit; font-size: 0.76rem; font-weight: 700; text-align: center;
    }
    html.dark .mi-motion-found-name { background: rgba(255,255,255,0.06); }

    /* ---- History / Library / Reports demos (page-scoped classes, restaged) ---- */
    .dsc-wch {
      width: 100%; max-width: 420px;
      padding: 8px 10px 12px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-md, 16px);
      box-shadow: var(--shadow-card);
    }
    .dsc-demo .wch-item { position: relative; padding: 9px 14px; border-radius: 10px; cursor: pointer; margin: 2px 0; }
    .dsc-demo .wch-item:hover { background: color-mix(in srgb, var(--primary) 8%, transparent); }
    .dsc-demo .wch-item.wch-active { background: color-mix(in srgb, var(--primary) 16%, transparent); outline: 1px solid color-mix(in srgb, var(--primary) 40%, transparent); }
    .dsc-demo .wch-item-title { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dsc-demo .wch-item-meta { font-size: 11px; opacity: .62; margin-top: 2px; }
    .dsc-demo .wch-fork-badge {
      display: inline-flex; align-items: center; justify-content: center; vertical-align: middle;
      margin-right: 5px; width: 17px; height: 17px; border-radius: 50%;
      background: color-mix(in srgb, var(--primary) 16%, transparent); color: var(--primary-ink, var(--primary));
    }
    .dsc-demo .wch-fork-badge .material-symbols-outlined { font-size: 12px; }
    .dsc-demo .wch-item-actions {
      position: absolute; top: 50%; right: 5px; transform: translateY(-50%);
      display: none; align-items: center; gap: 3px; padding: 3px; border-radius: 999px;
      background: var(--surface); box-shadow: var(--shadow-card);
    }
    .dsc-demo .wch-item:hover .wch-item-actions, .dsc-demo .wch-item:focus-within .wch-item-actions { display: flex; }
    .dsc-demo .wch-iact {
      width: 26px; height: 26px; border: 0; border-radius: 50%; background: transparent;
      color: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: .7;
    }
    .dsc-demo .wch-iact:hover { background: color-mix(in srgb, var(--primary) 10%, transparent); opacity: 1; }
    .dsc-demo .wch-iact .material-symbols-outlined { font-size: 16px; }
    .dsc-demo .wch-drag-handle { cursor: grab; }
    .dsc-demo .wch-projects-head { display: flex; align-items: center; gap: 6px; padding: 8px 4px 4px; }
    .dsc-demo .wch-projects-title { font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; opacity: .5; flex: 1; }
    .dsc-demo .wch-proj-add {
      width: 24px; height: 24px; border: 0; border-radius: 50%; background: transparent;
      color: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: .7;
    }
    .dsc-demo .wch-proj-add:hover { background: color-mix(in srgb, var(--primary) 10%, transparent); opacity: 1; color: var(--primary); }
    .dsc-demo .wch-proj-add .material-symbols-outlined { font-size: 18px; }
    .dsc-demo .wch-project { border-radius: 10px; margin: 1px 0; }
    .dsc-demo .wch-project.wch-drop-on { background: color-mix(in srgb, var(--primary) 14%, transparent); outline: 1px dashed color-mix(in srgb, var(--primary) 55%, transparent); }
    .dsc-demo .wch-project-head { display: flex; align-items: center; gap: 6px; padding: 8px 6px; border-radius: 10px; }
    .dsc-demo .wch-proj-toggle { width: 22px; height: 22px; border: 0; border-radius: 6px; background: transparent; color: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: .7; }
    .dsc-demo .wch-proj-toggle .material-symbols-outlined { font-size: 18px; }
    .dsc-demo .wch-proj-dot { flex: 0 0 auto; width: 9px; height: 9px; border-radius: 50%; background: currentColor; }
    .dsc-demo .wch-proj-name { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dsc-demo .wch-proj-count { font-size: 11px; font-weight: 600; opacity: .55; padding: 0 4px; font-variant-numeric: tabular-nums; }
    .dsc-demo .wch-project-body { padding-left: 8px; }
    .dsc-demo .wch-project-empty { font-size: 11px; opacity: .5; padding: 4px 12px 8px 20px; }
    .dsc-demo .wch-proj-edit { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; padding: 8px 6px; }
    .dsc-demo .wch-proj-edit-input {
      flex: 1; min-width: 0; height: 30px; box-sizing: border-box; padding: 0 10px; border-radius: 8px;
      font: inherit; font-size: 13px; color: inherit; outline: none;
      background: color-mix(in srgb, var(--primary) 6%, var(--surface)); border: 1px solid var(--primary);
    }
    .dsc-demo .wch-proj-swatches { flex-basis: 100%; display: flex; align-items: center; gap: 8px; padding: 2px 2px 2px 17px; }
    .dsc-demo .wch-proj-swatch { flex: 0 0 auto; width: 14px; height: 14px; padding: 0; border: 0; border-radius: 50%; background: currentColor; cursor: pointer; }
    .dsc-demo .wch-proj-swatch.is-sel { outline: 2px solid currentColor; outline-offset: 2px; }

    .dsc-lib-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); width: 100%; }
    .dsc-demo .lib-card {
      display: flex; flex-direction: column; border-radius: 14px; overflow: hidden; text-decoration: none; color: inherit;
      border: 1px solid var(--border); background: var(--surface); box-shadow: var(--shadow-1);
    }
    .dsc-demo a.lib-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-card); border-color: color-mix(in srgb, var(--primary) 32%, var(--border)); }
    .dsc-demo .lib-thumb { position: relative; height: 110px; overflow: hidden; border-bottom: 1px solid var(--border); background: var(--surface-2); }
    .dsc-demo .lib-thumb.pad { padding: 12px 14px; }
    .dsc-demo .lib-bars { display: flex; align-items: flex-end; gap: 7px; height: 100%; }
    .dsc-demo .lib-bars i { flex: 1; border-radius: 3px 3px 0 0; display: block; }
    .dsc-demo .lib-bars i.g { background: color-mix(in srgb, var(--sec-green) 75%, transparent); }
    .dsc-demo .lib-bars i.b { background: color-mix(in srgb, var(--ter-amber) 82%, transparent); }
    .dsc-demo .lib-bars i.p { background: color-mix(in srgb, var(--primary) 60%, transparent); }
    .dsc-demo .lib-chatprev { display: flex; flex-direction: column; gap: 7px; height: 100%; overflow: hidden; }
    .dsc-demo .lib-bubble {
      max-width: 88%; padding: 6px 9px; border-radius: 10px;
      font-size: 0.6875rem; line-height: 1.35; color: var(--text-muted);
      background: var(--surface); border: 1px solid var(--border);
    }
    .dsc-demo .lib-bubble.me { align-self: flex-end; background: color-mix(in srgb, var(--primary) 14%, var(--surface)); color: var(--text); border-color: transparent; }
    .dsc-demo .lib-bubble.ai { align-self: flex-start; }
    .dsc-demo .lib-clip { display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .dsc-demo .lib-thumb-badge {
      position: absolute; top: 9px; left: 10px; display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px; border-radius: 999px; font-size: 0.625rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase;
      background: color-mix(in srgb, var(--surface) 82%, transparent); color: var(--text-muted); border: 1px solid var(--border);
    }
    .dsc-demo .lib-thumb-badge .material-symbols-outlined { font-size: 12px !important; }
    .dsc-demo .lib-cbody { display: flex; flex-direction: column; gap: 8px; padding: 12px 14px 13px; flex: 1; }
    .dsc-demo .lib-cname { font-size: 0.875rem; font-weight: 700; line-height: 1.3; color: var(--text); }
    .dsc-demo .lib-shared { display: block; font-size: 0.75rem; line-height: 1.35; color: var(--text-subtle); overflow-wrap: anywhere; }
    .dsc-demo .lib-cfoot { margin-top: auto; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
    .dsc-demo .lib-date { font-size: 0.75rem; color: var(--text-subtle); }
    .dsc-demo .lib-counts { display: inline-flex; gap: 8px; }
    .dsc-demo .lib-count { display: inline-flex; align-items: center; gap: 3px; font-size: 0.75rem; color: var(--text-muted); font-variant-numeric: tabular-nums; }
    .dsc-demo .lib-count .material-symbols-outlined { font-size: 14px !important; }

    .dsc-lib-folders { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; width: 100%; padding-top: 10px; }
    .dsc-demo .lib-stat {
      min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
      padding: 12px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
      box-shadow: var(--shadow-1); font-family: inherit; text-align: center; cursor: pointer;
    }
    .dsc-demo .lib-stat.is-active { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 10%, var(--surface)); box-shadow: inset 0 0 0 1px var(--primary), var(--shadow-1); }
    .dsc-demo .lib-stat-num { font-family: 'WISE Digits', 'Noto Serif', serif; font-size: 22px; font-weight: 800; line-height: 1.05; color: var(--text); }
    .dsc-demo .lib-stat-label { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 600; color: var(--text-muted); }
    .dsc-demo .lib-fstat[data-folder-id] { position: relative; background: color-mix(in srgb, var(--lib-folder-color, var(--primary)) 6%, var(--surface)); }
    .dsc-demo .lib-fstat[data-folder-id]::before {
      content: ""; position: absolute; top: -7px; left: 14px; width: 36px; height: 8px; border-radius: 4px 4px 0 0;
      background: var(--lib-folder-color, var(--primary));
    }
    .dsc-demo .lib-fdot { width: 9px; height: 9px; border-radius: 50%; background: var(--lib-folder-color, var(--primary)); flex: 0 0 auto; }
    .dsc-demo .lib-fstat-add, .dsc-demo .lib-fstat-unfile {
      border-style: dashed; color: var(--text-muted); background: transparent; box-shadow: none;
    }
    .dsc-demo .lib-fstat-add .material-symbols-outlined, .dsc-demo .lib-fstat-unfile .material-symbols-outlined { font-size: 22px; color: var(--primary); }
    .dsc-demo .lib-fstat.is-editing { padding: 10px 8px; }
    .dsc-demo .lib-fstat-edit { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%; }
    .dsc-demo .lib-folder-edit-input {
      width: 100%; height: 28px; padding: 0 8px; border-radius: 8px; font: inherit; font-size: 12px; font-weight: 700;
      color: var(--text); background: var(--surface); border: 1px solid var(--lib-folder-color, var(--primary));
    }
    .dsc-demo .lib-folder-swatches { display: flex; align-items: center; justify-content: center; gap: 8px; }
    .dsc-demo .lib-folder-swatch { width: 14px; height: 14px; padding: 0; border: 0; border-radius: 50%; background: currentColor; cursor: pointer; }
    .dsc-demo .lib-folder-swatch.is-sel { outline: 2px solid currentColor; outline-offset: 2px; }

    .dsc-rp-row { display: flex; flex-wrap: wrap; gap: 16px; width: 100%; }
    .dsc-demo .rp-card {
      position: relative; display: flex; flex-direction: column; flex: 1 1 220px; max-width: 280px; min-height: 248px;
      border-radius: 18px; overflow: hidden; border: 1px solid var(--border); background: var(--surface);
      box-shadow: var(--shadow-1); text-decoration: none; color: inherit;
    }
    .dsc-demo a.rp-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-card); }
    .dsc-demo .rp-poster {
      --acc: #3f4d61; position: relative; height: 110px; overflow: hidden;
      background:
        radial-gradient(135% 130% at 82% -25%, color-mix(in srgb, var(--acc) 62%, transparent), transparent 60%),
        linear-gradient(150deg, color-mix(in srgb, var(--acc) 34%, #0b1a29), #091522 80%);
    }
    .dsc-demo .rp-poster.tone-upf { --acc: #25507C; }
    .dsc-demo .rp-poster.tone-action { --acc: #b8862b; }
    .dsc-demo .rp-poster.tone-locked { --acc: #3a465a; }
    .dsc-demo .rp-poster-icon { position: absolute; top: 14px; left: 16px; background: none; border: 0; color: #fff; }
    .dsc-demo .rp-poster-icon .material-symbols-outlined { font-size: 30px !important; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.45)); }
    .dsc-demo .rp-badge {
      position: absolute; top: 17px; right: 16px; display: inline-flex; align-items: center; gap: 5px;
      padding: 4px 10px; border-radius: 999px; font-size: 0.625rem; font-weight: 800; letter-spacing: 0.11em; text-transform: uppercase;
      color: #fff; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.22);
    }
    .dsc-demo .rp-badge .material-symbols-outlined { font-size: 12px !important; }
    .dsc-demo .rp-poster-open {
      position: absolute; right: 14px; bottom: 12px; width: 30px; height: 30px; border-radius: 999px;
      display: grid; place-items: center; background: #fff; color: #0b1a29; opacity: 0;
    }
    .dsc-demo a.rp-card:hover .rp-poster-open { opacity: 1; }
    .dsc-demo .rp-poster-open .material-symbols-outlined { font-size: 18px !important; }
    .dsc-demo .rp-body { display: flex; flex-direction: column; gap: 8px; padding: 16px 18px 16px; flex: 1; }
    .dsc-demo .rp-name { font-family: 'WISE Digits', 'Noto Serif', Georgia, serif; font-size: 1.05rem; font-weight: 700; letter-spacing: -0.01em; color: var(--text); line-height: 1.2; }
    .dsc-demo .rp-desc { margin: 0; font-size: 0.8125rem; line-height: 1.5; color: var(--text-muted); }
    .dsc-demo .rp-foot { margin-top: auto; padding-top: 10px; display: flex; justify-content: flex-end; }
    .dsc-demo .rp-view { display: inline-flex; align-items: center; gap: 6px; font-size: 0.8125rem; font-weight: 700; color: var(--primary); }
    html.dark .dsc-demo .rp-view { color: var(--primary-bright, var(--primary)); }
    .dsc-demo .rp-view .material-symbols-outlined { font-size: 17px !important; }
    .dsc-demo .rp-waitlist { display: inline-flex; align-items: center; gap: 6px; font-size: 0.8125rem; font-weight: 700; color: var(--text-muted); }
    .dsc-demo .rp-waitlist .material-symbols-outlined { font-size: 15px !important; }
    .dsc-demo .rp-card.is-locked { background: color-mix(in srgb, var(--surface-2) 55%, var(--surface)); }
    .dsc-demo .rp-card.is-locked .rp-name { color: var(--text-muted); }
  </style>`;
}

/* ------------------------------------------------------------------ */
/* Render + wiring                                                     */
/* ------------------------------------------------------------------ */

let hostEl = null;

export function renderAllModules(mainEl) {
  hostEl = mainEl;
  buildDevReadyTree();
  mainEl.innerHTML = `
    ${moduleStyles()}
    <div class="mi-wrap">
      <header class="mi-hero">
        <div class="mi-hero-text">
          <h1 class="mi-hero-title">All Modules</h1>
          <p class="mi-hero-lede">Every module, component, icon, design token, animation and drag/resize interaction in the WISE app — indexed, rendered live, and one tap away.</p>
        </div>
      </header>
      ${renderSectionNav()}
      ${renderCodebase()}
      ${renderDirectory()}
      ${renderTableGallery()}
      ${renderIntentAudit()}
      ${renderStreamingTrace()}
      ${renderMotion()}
      ${renderIconInventory()}
      ${renderDesignSystem()}
      ${renderComponentLibrary()}
    </div>`;

  setupAccordion(mainEl);
  wireView(mainEl);
  wireSectionNav(mainEl);
  wireCodebase(mainEl);
  wireDirectory(mainEl);
  wireDirectoryExport(mainEl);
  wireTableGallery(mainEl);
  wireRailFrames(mainEl);
  wireIntentAudit(mainEl);
  wireStreamingTrace(mainEl);
  wireMotion(mainEl);
  wireIconInventory(mainEl);
  wireDesignSystem(mainEl);
  wireComponentLibrary(mainEl);
  wireDevReady(mainEl);
  wireModuleControls(mainEl);
  wireLinkValidation(mainEl);
}

/* ------------------------------------------------------------------ */
/* Accordion — every module section collapses from its own header.    */
/*                                                                    */
/* Each section already ships as <section class="mi-module"> with a   */
/* leading <header class="mi-module-head">. We reuse that header as    */
/* the toggle (adding a chevron + a11y) and wrap everything after it   */
/* in a collapsible .mi-acc-body, so no per-section render function    */
/* changes. Clicks on the header's trailing ⋯ controls never toggle.  */
/* Every load starts fully collapsed — a high-level index. Expanded    */
/* state is in-session only and is not restored on the next visit.     */
/* Clicks on the header's trailing ⋯ controls (and the Dev Ready       */
/* toggle, when present) never expand or collapse the section.         */
/* ------------------------------------------------------------------ */
const ACC_SECTION_IDS = ['mi-code', 'mi-directory', 'mi-tables', 'mi-intents', 'mi-trace', 'mi-motion', 'mi-icons', 'mi-design', 'mi-components'];

function setSectionCollapsed(root, sec, collapsed) {
  sec.classList.toggle('is-collapsed', collapsed);
  sec.querySelector(':scope > .mi-module-head')?.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
}

/* Open a section (used when the quick-nav or a WISEcodeAI chip jumps to it). */
function expandAccordionSection(root, id) {
  const sec = (root || document).querySelector('#' + id);
  if (!sec || !sec.classList.contains('is-collapsed')) return;
  sec.classList.remove('is-collapsed');
  sec.querySelector(':scope > .mi-module-head')?.setAttribute('aria-expanded', 'true');
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
      if (e.target.closest('.panel-controls, .dsc-ready')) return; // let the ⋯ menu and Dev Ready toggle work
      setSectionCollapsed(root, sec, !sec.classList.contains('is-collapsed'));
    };
    head.addEventListener('click', toggle);
    head.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (e.target.closest('.panel-controls, .dsc-ready')) return;
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

function renderSectionNav() {
  const tokenCount = COLOR_GROUPS.reduce((n, g) => n + g.swatches.length, 0) + TYPE_SCALE.length;
  const tiles = [
    { id: 'mi-code', icon: 'code', num: fmtNum(CODE_STATS?.now?.total), label: 'Lines of code', sub: `${fmtNum(CODE_STATS?.now?.pages)} HTML pages` },
    { id: 'mi-directory', icon: 'apps', num: moduleTotal(), label: 'Modules', sub: 'Every screen in the app' },
    { id: 'mi-tables', icon: 'table_chart', num: TABLE_CATALOG.length, label: 'Tables', sub: 'Every data table, live' },
    { id: 'mi-intents', icon: 'bolt', num: intentAuditStats().chips, label: 'Intent chip logic', sub: 'Transcript + logic audit' },
    { id: 'mi-trace', icon: 'psychology', num: TRACE_MILESTONES.length, label: 'Trace sections', sub: 'Live helix + haiku glob' },
    { id: 'mi-motion', icon: 'animation', num: MOTION_ITEMS.length, label: 'Motion & resize', sub: 'Animations + drag/resize' },
    { id: 'mi-icons', icon: 'emoji_symbols', num: (ICON_INVENTORY && ICON_INVENTORY.totalUniqueIcons) || 0, label: 'Icons', sub: 'Material Symbols inventory' },
    { id: 'mi-design', icon: 'palette', num: tokenCount, label: 'Design tokens', sub: 'Type scale + color tokens' },
    { id: 'mi-components', icon: 'widgets', num: COMPONENTS.length, label: 'Components', sub: 'Reusable, live-rendered' },
  ];
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
    expandAccordionSection(root, id);
    const el = document.getElementById(id);
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  });
}

/* ------------------------------------------------------------------ */
/* Per-module control wiring (three-dot menu + width changer)         */
/* ------------------------------------------------------------------ */

/* A menu action fires the module's real toolbar control, so the ⋯ menu does
   exactly what the on-page buttons do — no parallel logic to drift. */
function runModuleAction(root, action) {
  const click = (sel) => root.querySelector(sel)?.click();
  const clearInput = (sel) => {
    const el = root.querySelector(sel);
    if (el) { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); }
  };
  switch (action) {
    case 'dir-grid': click('[data-view="grid"]'); break;
    case 'dir-rail': click('[data-view="rail"]'); break;
    case 'dir-clear': clearInput('#mi-dir-search'); click('#mi-dir-stats [data-area="all"]'); break;
    case 'ii-name': click('[data-ii-sort="name"]'); break;
    case 'ii-count': click('[data-ii-sort="count"]'); break;
    case 'ii-all': clearInput('#ii-search-input'); click('[data-ii-fam="all"]'); click('[data-ii-group="all"]'); break;
    case 'ds-type': expandAccordionSection(root, 'mi-design'); root.querySelector('#ds-typography')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
    case 'ds-colors': expandAccordionSection(root, 'mi-design'); root.querySelector('#ds-colors')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
    case 'ds-jump': expandAccordionSection(root, 'mi-design'); root.querySelector('#mi-design')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
    case 'dsc-clear': clearInput('#dsc-search'); break;
    case 'code-7': click('[data-code-win="7"]'); break;
    case 'code-30': click('[data-code-win="30"]'); break;
    case 'code-all': click('[data-code-win="all"]'); break;
    case 'int-all': click('#mi-intents [data-int-filter="all"]'); break;
    case 'int-talk': click('#mi-intents [data-int-filter="talk"]'); break;
    case 'int-act': click('#mi-intents [data-int-filter="act"]'); break;
    case 'int-clear': clearInput('#mi-int-search'); click('#mi-intents [data-int-filter="all"]'); break;
    case 'tbl-clear': clearInput('#mi-tbl-search'); break;
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
  card.addEventListener('click', preventBrokenNav);
}

/* Reset a card that probed healthy on a re-check (e.g. a renamed file was
   restored), so recovery doesn't require a reload. */
function clearCardBroken(card) {
  if (!card.classList.contains('mi-card--broken')) return;
  card.classList.remove('mi-card--broken');
  card.removeAttribute('aria-disabled');
  card.removeAttribute('title');
  card.querySelector('.mi-card-broken-badge')?.remove();
  card.removeEventListener('click', preventBrokenNav);
}

function preventBrokenNav(e) { e.preventDefault(); }

/* Mirror the broken/healthy state onto the matching rail pane(s): kill the
   live preview iframe so it doesn't render the server's 404 page. */
function setPaneBroken(pane, broken) {
  pane.classList.toggle('mi-pane--broken', broken);
  const frame = pane.querySelector('.mi-pane-frame');
  const viewport = pane.querySelector('.mi-pane-viewport');
  const links = pane.querySelectorAll('a[href]');
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
      frame.src = previewSrc(pane.getAttribute('data-href'));
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
  cards.forEach((c) => register(c, c.getAttribute('href')));
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
  runLinkValidation(root);

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
function focusFrameTable(doc, selector) {
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

  const iso = doc.createElement('style');
  iso.id = 'mi-embed-focus';
  iso.textContent = `
    html, body { overflow: hidden !important; }
    body { margin: 0 !important; padding: 22px !important; }
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
  if (focusFrameTable(doc, selector)) {
    if (pane) pane.classList.add('is-focused');
    return;
  }
  if (attempt < 34) {
    setTimeout(() => tryFocusFrameTable(frame, selector, attempt + 1), 130);
  } else if (pane) {
    pane.classList.add('is-unfocused');
  }
}

function wireRailFrames(root) {
  root.querySelectorAll('.mi-pane-frame').forEach((f) => {
    f.addEventListener('load', () => embedRailFrame(f));
    // Handle the case where the frame finished loading before we attached.
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
  });
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

  const cards = Array.from(sectionsRoot.querySelectorAll('[data-mod-card]'));
  const sections = Array.from(sectionsRoot.querySelectorAll('.mi-dir-section'));
  /* Scope to the directory's own rail so the Table Gallery panes (which also
     carry [data-pane] for link validation) aren't hidden by this filter. */
  const panes = Array.from((root.querySelector('#mi-rail') || root).querySelectorAll('[data-pane]'));
  const railEmpty = root.querySelector('#mi-rail-empty');
  const state = { q: '', area: 'all' };

  const matches = (c) => {
    const matchQ = !state.q || c.dataset.search.indexOf(state.q) !== -1;
    const sec = c.closest('.mi-dir-section');
    const area = sec ? sec.dataset.area : c.dataset.area;
    const matchA = state.area === 'all' || area === state.area;
    return matchQ && matchA;
  };

  const apply = () => {
    let shown = 0;
    cards.forEach((c) => {
      const vis = matches(c);
      c.hidden = !vis;
      if (vis) shown++;
    });
    // Collapse sections that have no visible cards under the current filter.
    sections.forEach((sec) => {
      const any = Array.from(sec.querySelectorAll('[data-mod-card]')).some((c) => !c.hidden);
      sec.hidden = !any;
    });
    // The rail mirrors the same filter so both views stay in lock-step.
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
  const state = { q: '', fam: 'all', group: 'all', sort: 'name' };

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
      const matchF = state.fam === 'all' || c.dataset.fam.split(' ').includes(state.fam);
      const matchG = state.group === 'all' || (c.dataset.groups || '').split(' ').includes(state.group);
      const vis = matchQ && matchF && matchG;
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

  root.querySelectorAll('[data-ii-fam]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.fam = btn.dataset.iiFam;
      root.querySelectorAll('[data-ii-fam]').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      applyFilter();
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

  applySort();
  applyFilter();
}

/* ------------------------------------------------------------------ */
/* Design System wiring — resolve swatch values live, per theme        */
/* ------------------------------------------------------------------ */

/* "rgb(37, 80, 124)" → "#25507C"; keeps rgba() strings readable as-is. */
function cssColorLabel(raw) {
  const m = String(raw).match(/rgba?\(([^)]+)\)/);
  if (!m) return raw;
  const parts = m[1].split(',').map((p) => parseFloat(p.trim()));
  const [r, g, b, a] = parts;
  if (parts.length >= 4 && a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${Math.round(a * 100) / 100})`;
  }
  const hex = (n) => Math.round(n).toString(16).padStart(2, '0').toUpperCase();
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function resolveSwatchValues(root) {
  root.querySelectorAll('[data-swatch]').forEach((sw) => {
    const out = sw.querySelector('[data-swatch-val]');
    const chip = sw.querySelector('.ds-swatch-chip');
    if (!out || !chip) return;
    const cs = getComputedStyle(chip);
    const kind = sw.dataset.kind || 'fill';
    const raw = kind === 'ink' ? cs.color : kind === 'border' ? cs.borderTopColor : cs.backgroundColor;
    out.textContent = cssColorLabel(raw);
  });
}

function wireDesignSystem(root) {
  resolveSwatchValues(root);
  /* Theme flips toggle html.dark without re-rendering this page — watch the
     root element's class so the printed values always match the live theme. */
  if (!wireDesignSystem._observer) {
    wireDesignSystem._observer = new MutationObserver(() => {
      const host = hostEl;
      if (host && host.isConnected) resolveSwatchValues(host);
    });
    wireDesignSystem._observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }
}

/* ------------------------------------------------------------------ */
/* Component Library wiring — search filter + interactive demo bits    */
/* ------------------------------------------------------------------ */

function wireComponentLibrary(root) {
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

  /* Live-wire the stacked composer demo so the attach menu and database
     selector behave like the canonical chat module. */
  root.querySelectorAll('.dsc-demo [data-wise-composer]').forEach((rail) => {
    wireChatComposer(rail);
  });

  /* Demo switches (brand toggle, admin popover switch) flip on click so their
     on/off states can be inspected live. Purely local — no persistence. */
  root.querySelectorAll('[data-demo-switch]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-checked') === 'true';
      btn.setAttribute('aria-checked', on ? 'false' : 'true');
    });
  });

}

/* ------------------------------------------------------------------ */
/* Dev Ready wiring — hierarchical, persisted in localStorage.         */
/*                                                                     */
/* Every toggle (module OR item) shares this one handler. A lower-level */
/* item toggles freely; flipping one recomputes its parent module so   */
/* the "k/n ready" pill and the parent's gate stay honest. A module    */
/* that owns children can only be switched on once all of them are     */
/* ready — and if a child is later switched off, the parent is forced  */
/* back off, because a higher-level component is only ready for dev     */
/* when all of its parts are.                                          */
/* ------------------------------------------------------------------ */
function wireDevReady(root) {
  const moduleBtn = (moduleId) =>
    Array.from(root.querySelectorAll('[data-dsc-ready][data-ready-level="module"]'))
      .find((b) => b.dataset.readyId === moduleId);
  const progressPill = (moduleId) =>
    Array.from(root.querySelectorAll('[data-ready-progress-for]'))
      .find((p) => p.getAttribute('data-ready-progress-for') === moduleId);

  /* Recompute a parent module's progress pill + gate from its children. */
  function refreshParent(moduleId) {
    const kids = DEV_READY_CHILDREN[moduleId] || [];
    if (!kids.length) return;
    const map = loadDscReadyMap();
    const { ready, total } = readyChildStats(moduleId, map);
    const complete = ready === total;

    const pill = progressPill(moduleId);
    if (pill) {
      pill.classList.toggle('is-complete', complete);
      const count = pill.querySelector('.dsc-ready-count');
      if (count) count.textContent = ready + '/' + total;
      const ic = pill.querySelector('.material-symbols-outlined');
      if (ic) ic.textContent = complete ? 'task_alt' : 'radio_button_unchecked';
      pill.setAttribute('title', ready + ' of ' + total + ' parts Dev Ready');
    }

    const btn = moduleBtn(moduleId);
    if (!btn) return;
    btn.classList.toggle('is-gated', !complete);
    if (!complete) {
      /* A parent can never rest "on" while a part is unfinished. */
      if (map[moduleId]) { delete map[moduleId]; saveDscReadyMap(map); }
      btn.classList.remove('is-on');
      btn.setAttribute('aria-checked', 'false');
      btn.setAttribute('aria-disabled', 'true');
      btn.title = 'All ' + total + ' parts must be Dev Ready first — ' + ready + '/' + total + ' done';
    } else {
      btn.removeAttribute('aria-disabled');
      const on = map[moduleId] === true;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-checked', on ? 'true' : 'false');
      btn.title = on ? 'Ready for dev' : 'Mark this module ready for dev';
    }
  }

  root.querySelectorAll('[data-dsc-ready]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.readyId;
      if (!id) return;
      const level = btn.dataset.readyLevel || 'item';

      /* A gated module can't be turned on — nudge the progress pill instead. */
      if (level === 'module' && btn.classList.contains('is-gated')) {
        const pill = progressPill(id);
        if (pill) { pill.classList.remove('nudge'); void pill.offsetWidth; pill.classList.add('nudge'); }
        return;
      }

      const next = btn.getAttribute('aria-checked') !== 'true';
      btn.setAttribute('aria-checked', next ? 'true' : 'false');
      btn.classList.toggle('is-on', next);
      const map = loadDscReadyMap();
      if (next) map[id] = true; else delete map[id];
      saveDscReadyMap(map);

      /* A flipped child re-scores its parent. */
      const parent = btn.dataset.readyParent;
      if (parent) refreshParent(parent);
    });
  });

  /* Initial pass so every parent reflects its stored children (and can never
     start "on" while a part is still unfinished). */
  Object.keys(DEV_READY_CHILDREN).forEach(refreshParent);
}

/* WISEcodeAI dock config for this page — a light welcome that points at the four
   modules and can jump to any of them. */
export const ALL_MODULES_WISEAI = {
  sub: 'Your app’s codebase stats, module map, icon inventory, design system, component library, and motion catalog.',
  chipsFlow: 'wrap',
  intents: [
    { intent: 'codebase', label: 'How big is the codebase?', icon: 'code' },
    { intent: 'directory', label: 'Jump to the Module Directory', icon: 'apps' },
    { intent: 'tables', label: 'Show every table', icon: 'table_chart' },
    { intent: 'intents', label: 'Which intent chips work?', icon: 'bolt' },
    { intent: 'icons', label: 'Jump to the Icon Inventory', icon: 'emoji_symbols' },
    { intent: 'design', label: 'Jump to the Design System', icon: 'palette' },
    { intent: 'components', label: 'Jump to the Component Library', icon: 'widgets' },
    { intent: 'motion', label: 'Show animations & resize', icon: 'animation' },
    { intent: 'counts', label: 'How many icons are there?', icon: 'tag' },
  ],
  intentReplies: {
    codebase: `The app is <strong>${fmtNum(CODE_STATS?.now?.total)} lines of code</strong> across <strong>${fmtNum(CODE_STATS?.now?.files)} files</strong> — ${fmtNum(CODE_STATS?.now?.html)} HTML, ${fmtNum(CODE_STATS?.now?.js)} JavaScript, ${fmtNum(CODE_STATS?.now?.css)} CSS and ${fmtNum(CODE_STATS?.now?.py)} Python — shipping <strong>${fmtNum(CODE_STATS?.now?.pages)} HTML pages</strong>. The Codebase score cards above the directory show the up/down trend.`,
    directory: 'The <strong>Module Directory</strong> lists every workspace, account, chat, report, product, auth and marketing screen in the app.',
    tables: `The <strong>Table Gallery</strong> collects all <strong>${TABLE_CATALOG.length} data tables</strong> in the app — portfolio grids, verification and analytics tables, admin boards, the ingredient registry and more — rendered live in one carousel, each isolated from its page.`,
    intents: () => {
      const s = intentAuditStats();
      return s.gaps
        ? `I audited all <strong>${s.chips} intent chips</strong> across <strong>${s.surfaces} surfaces</strong>: <strong>${s.wired} are fully wired</strong> (transcript + logic), while <strong>${s.gaps} are missing a half</strong> — ${s.talk} need logic, ${s.act} need their own transcript${s.none ? `, ${s.none} are fully unwired` : ''}. The <strong>Intent Chip Logic</strong> module calls each one out.`
        : `All <strong>${s.chips} intent chips</strong> across <strong>${s.surfaces} surfaces</strong> are fully wired — every one carries both its own transcript and its own logic. See the <strong>Intent Chip Logic</strong> module.`;
    },
    icons: 'The <strong>Icon Inventory</strong> catalogs every Material Symbols glyph used in the live app (this page excluded), grouped by surface — chat module, primary nav, top bar and so on — with variant, usage count, label, and exact placements.',
    design: 'The <strong>Design System</strong> documents the app’s fonts (families, sizes, usage) and every color, line, elevation and radius token — with live swatches that follow the current theme.',
    components: 'The <strong>Component Library</strong> renders every reusable component in its default state with its real classes, its variations, and the surfaces where it’s used.',
    motion: `The <strong>Motion &amp; Resize</strong> module catalogs all <strong>${MOTION_ITEMS.length} motion systems</strong> — count-up, chart replay, streaming, chip shimmer and fly-in, both helixes, accordion open, plus the module splitter, four width tiers, drag-to-reorder and drag-to-file — each running live.`,
    counts: `There are <strong>${ICON_INVENTORY?.totalUniqueIcons || 0} unique icons</strong> across <strong>${ICON_INVENTORY?.totalUses || 0} placements</strong> in the app.`,
  },
  onIntent: (intent) => {
    /* "How big is the codebase?" is a question, not just a jump — open + scroll
       the score cards into view AND let the sizing answer post in the thread. */
    if (intent === 'codebase') {
      expandAccordionSection(document, 'mi-code');
      document.getElementById('mi-code')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return false;
    }
    /* "Which intent chips work?" is a question — open + scroll to the audit
       module AND let the state-aware answer post in the thread. */
    if (intent === 'intents') {
      expandAccordionSection(document, 'mi-intents');
      document.getElementById('mi-intents')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return false;
    }
    const id = intent === 'icons' ? 'mi-icons'
      : intent === 'directory' ? 'mi-directory'
      : intent === 'tables' ? 'mi-tables'
      : intent === 'design' ? 'mi-design'
      : intent === 'components' ? 'mi-components'
      : intent === 'motion' ? 'mi-motion'
      : null;
    if (id) {
      expandAccordionSection(document, id);
      const el = document.getElementById(id);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return true; }
    }
    return false;
  },
};
