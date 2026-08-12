/**
 * All Modules — an admin "kitchen sink" that indexes every module in the app
 * and hosts the brand-new Icon Inventory module.
 *
 * Rendered into #agent-main-scroll on pages/all-modules.html via the shared
 * agent shell (js/agent-overview.js), keyed off `<body data-nav-id="all-modules">`.
 *
 * Two modules live here:
 *   1. Module Directory — every workspace, portfolio, studio, reformulation,
 *      report, verification, admin, account, auth and marketing surface in the
 *      app, as linked poster cards grouped by area. Driven off one curated map
 *      (MODULE_SECTIONS) so pages that host several modules (the WISEai studio's
 *      Chat / History / Data Sources / Turns, and Reformulation's Studio +
 *      Dashboard) each get their own card, with a final de-dup pass so nothing
 *      appears twice.
 *   2. Icon Inventory — every Material Icons / Symbols glyph used anywhere in the
 *      codebase, with its family, usage count, a representative label, and the
 *      exact placements (file + line). The data is scanned by
 *      scripts/scan_icons.py into js/icon-inventory-data.js.
 */

import { ICON_INVENTORY } from './icon-inventory-data.js';

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
/*   • Several pages host more than one module. The WISEai studio       */
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
    title: 'WISEai Studio',
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
    modules: [
      { label: 'Reports', icon: 'description', href: 'reports.html' },
      { label: 'Guiding Stars Report', icon: 'star', href: 'report-guiding-stars.html' },
      { label: 'Analytics Types', icon: 'insights', href: 'analytics-types.html' },
      { label: 'App Vision Deck', icon: 'slideshow', href: 'app-vision-deck.html' },
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
      { label: 'WISEai', icon: 'auto_awesome', href: '../marketing-wiseai.html' },
      { label: 'GRAS', icon: 'verified', href: '../marketing-gras.html' },
      { label: 'Non-UPF', icon: 'eco', href: '../marketing-nonupf.html' },
      { label: 'Alliance', icon: 'handshake', href: '../marketing-alliance.html' },
      { label: 'IP Vision', icon: 'flag', href: '../wise_ip3.html' },
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
/* Per-module control cluster (three-dot + width changer)             */
/*                                                                    */
/* Every module pane in the app carries the same header cluster — a    */
/* more-options (⋯) menu + a width toggle. The two modules on this     */
/* page render inside a shared scroll surface, so they get their own   */
/* clusters here, reusing the globally-styled .panel-controls /        */
/* .panel-more-btn / .panel-width-toggle-btn / .topbar-popover classes */
/* so they look + behave identically to the rest of the app.          */
/* ------------------------------------------------------------------ */

/* Canonical four-tier reading width shared with the main panel:
   single → double → triple → fill. Tier → class: 0 narrow · 1 wide ·
   2 triple · 3 fill (no class). */
const MODULE_WIDTH_ICONS = ['width_normal', 'width_wide', 'width_full', 'width_full'];
const MODULE_WIDTH_TITLES = [
  'Width (single) — tap to widen',
  'Width (double) — tap to widen',
  'Width (triple) — tap to widen',
  'Width (fill) — tap to reset',
];

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
      <button type="button" class="panel-width-toggle-btn" data-mi-width aria-pressed="false" title="${esc(MODULE_WIDTH_TITLES[3])}" aria-label="Module width"><span class="material-symbols-outlined">${MODULE_WIDTH_ICONS[3]}</span></button>
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
      </div>
      <div class="mi-card-grid">${modules.map(moduleCard).join('')}</div>
    </section>`;
}

function renderDirectory() {
  /* De-dupe by full href (hash included) so a module never appears twice, while
     letting two modules that live on the same page but at different anchors —
     e.g. Chat vs wiseai.html#history, or the Reformulation Studio vs
     Dashboard — each keep their own card. First occurrence wins. */
  const seen = new Set();
  const sections = MODULE_SECTIONS
    .map((s) => ({
      ...s,
      modules: s.modules.filter((m) => {
        if (seen.has(m.href)) return false;
        seen.add(m.href);
        return true;
      }),
    }))
    .filter((s) => s.modules.length);
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
    <section class="mi-module" id="mi-directory">
      <header class="mi-module-head">
        <div class="mi-module-head-text">
          <h2 class="mi-module-title">Module Directory</h2>
          <p class="mi-module-lede">Every module and screen in the app, grouped by area. Pages that host more
            than one module — the WISEai studio (Chat, History, Data Sources, Turns) and Reformulation
            (Studio + Dashboard) — are broken out so each module appears exactly once.</p>
        </div>
        ${moduleControlsHTML('mi-directory')}
      </header>

      <div class="mi-toolbar">
        <div class="mi-search-inline">
          <span class="material-symbols-outlined">search</span>
          <input type="search" class="mi-search" id="mi-dir-search" placeholder="Search modules by name or file…" aria-label="Search modules" autocomplete="off" />
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
        ${p.label ? `<span class="ii-place-label">${esc(p.label)}</span>` : '<span class="ii-place-label ii-place-empty">—</span>'}
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

function iconCard(ic) {
  const dcls = displayClassFor(ic.families);
  const label = ic.label ? esc(ic.label) : '';
  const search = `${ic.name} ${ic.label || ''} ${ic.placements.map((p) => p.file).join(' ')}`.toLowerCase();
  const famKey = variantKeys(ic.families);
  return `
    <div class="ii-card" data-icon-card data-name="${esc(ic.name)}" data-count="${esc(ic.count)}" data-fam="${esc(famKey)}" data-search="${esc(search)}">
      <button type="button" class="ii-card-main" data-ii-toggle aria-expanded="false">
        <span class="ii-glyph"><span class="${dcls}">${esc(ic.name)}</span></span>
        <span class="ii-meta">
          <span class="ii-name">${esc(ic.name)}</span>
          ${label ? `<span class="ii-label">${label}</span>` : '<span class="ii-label ii-label-none">no nearby label</span>'}
          <span class="ii-tagrow">${familyTags(ic.families)}<span class="ii-count" title="${esc(ic.count)} uses across the app"><span class="material-symbols-outlined">tag</span>${esc(ic.count)}</span></span>
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
  const data = ICON_INVENTORY || { icons: [], totalUniqueIcons: 0, totalUses: 0 };
  const icons = (data.icons || []).slice();
  const outlinedCount = icons.filter((i) => i.families.some((f) => f.includes('outlined'))).length;
  const roundedCount = icons.filter((i) => i.families.some((f) => f.includes('rounded'))).length;
  return `
    <section class="mi-module" id="mi-icons">
      <header class="mi-module-head">
        <div class="mi-module-head-text">
          <h2 class="mi-module-title">Icon Inventory</h2>
          <p class="mi-module-lede">Every Material Symbols glyph used anywhere in the app —
            its variant, how many times it appears, a representative label, and the exact placements (file and
            line). Generated by <code>scripts/scan_icons.py</code>.</p>
        </div>
        ${moduleControlsHTML('mi-icons')}
      </header>

      <div class="mi-toolbar">
        <div class="mi-search-inline">
          <span class="material-symbols-outlined">search</span>
          <input type="search" id="ii-search-input" class="mi-search" placeholder="Filter by icon name, label, or file…" aria-label="Search icons" autocomplete="off" />
        </div>
        <div class="ii-sort" role="group" aria-label="Sort">
          <button type="button" class="ii-filter is-active" data-ii-sort="name">A–Z</button>
          <button type="button" class="ii-filter" data-ii-sort="count">Most used</button>
        </div>
      </div>

      <div class="mi-stats" role="group" aria-label="Filter icons by variant">
        <button type="button" class="mi-stat is-active" data-ii-fam="all" aria-pressed="true">
          <span class="mi-stat-num">${data.totalUniqueIcons}</span>
          <span class="mi-stat-label"><span class="mi-stat-text">All icons</span><span class="material-symbols-outlined">emoji_symbols</span></span>
        </button>
        <button type="button" class="mi-stat" data-ii-fam="outlined" aria-pressed="false">
          <span class="mi-stat-num">${outlinedCount}</span>
          <span class="mi-stat-label"><span class="mi-stat-text">Outlined</span><span class="material-symbols-outlined">interests</span></span>
        </button>
        <button type="button" class="mi-stat" data-ii-fam="rounded" aria-pressed="false">
          <span class="mi-stat-num">${roundedCount}</span>
          <span class="mi-stat-label"><span class="mi-stat-text">Rounded</span><span class="material-symbols-outlined">blur_on</span></span>
        </button>
        <button type="button" class="mi-stat" disabled>
          <span class="mi-stat-num">${data.totalUses}</span>
          <span class="mi-stat-label"><span class="mi-stat-text">Total uses</span><span class="material-symbols-outlined">tag</span></span>
        </button>
      </div>

      <div class="ii-empty" id="ii-empty" hidden>No icons match your filter.</div>
      <div class="ii-grid" id="ii-grid">
        ${icons.map(iconCard).join('')}
      </div>
    </section>`;
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
      font-family: 'Noto Serif', Georgia, serif;
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
    .mi-rail-nav:hover { transform: translateY(-2px); box-shadow: var(--shadow-2); border-color: var(--primary); color: var(--primary); }
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
    .mi-pane-head { display: flex; align-items: center; gap: 8px; padding: 0 2px; }
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
    .mi-pane-open {
      position: absolute; top: 10px; right: 10px; z-index: 2;
      display: grid; place-items: center; width: 30px; height: 30px; border-radius: 999px;
      background: color-mix(in srgb, var(--surface) 88%, transparent); color: var(--text);
      box-shadow: var(--shadow-1); font-size: 16px !important;
      opacity: 0; transform: translateY(-4px); transition: opacity 0.15s ease, transform 0.15s ease;
    }
    .mi-pane-viewport:hover .mi-pane-open { opacity: 1; transform: translateY(0); }

    .mi-module { margin-top: 40px; }
    /* Per-module reading-width tiers driven by the width toggle (left-aligned). */
    .mi-module.mi-w-narrow { max-width: 820px; }
    .mi-module.mi-w-wide { max-width: 1180px; }
    .mi-module.mi-w-triple { max-width: 1480px; }
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
      font-family: 'Noto Serif', Georgia, serif;
      margin: 4px 0 0; font-size: 1.35rem; font-weight: 800; letter-spacing: -0.01em; color: var(--text);
    }
    .mi-module-lede { font-size: 0.875rem; color: var(--text-muted); margin: 6px 0 0; max-width: 76ch; }
    .mi-module-lede code {
      font-family: 'SF Mono', ui-monospace, Menlo, monospace; font-size: 0.8em;
      padding: 1px 6px; border-radius: 6px; background: var(--surface-2); color: var(--text);
    }

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
    .mi-dir-section[data-area="marketing"] .mi-card-ic { color: var(--primary); }
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
    .mi-card:hover .mi-card-go { transform: translate(2px, -2px); color: var(--primary); }

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
      position: absolute; inset: 0; z-index: 3;
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
      background: linear-gradient(var(--bg, var(--surface)) 82%, transparent);
    }
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
    html.dark .mi-search { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.10); }
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
      background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px;
      box-shadow: var(--shadow-1); font: inherit; text-align: center; cursor: pointer; color: inherit;
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease;
    }
    html.dark .mi-stat { background: rgba(255,255,255,0.04); }
    .mi-stat:hover { transform: translateY(-2px); box-shadow: var(--shadow-2); border-color: var(--border-strong); }
    .mi-stat:focus-visible { outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 22%, transparent); }
    .mi-stat.is-active {
      border-color: var(--primary);
      background: color-mix(in srgb, var(--primary) 10%, var(--surface-2));
      box-shadow: inset 0 0 0 1px var(--primary), var(--shadow-1);
    }
    html.dark .mi-stat.is-active { background: color-mix(in srgb, var(--primary) 26%, transparent); }
    .mi-stat:disabled { cursor: default; }
    .mi-stat:disabled:hover { transform: none; box-shadow: var(--shadow-1); border-color: var(--border); }
    .mi-stat-num {
      font-family: 'Noto Serif', Georgia, serif; font-size: 1.5rem; font-weight: 800;
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
    .ii-place-line { color: var(--primary); }
    .ii-place-label { font-size: 0.6875rem; color: var(--text); text-align: right; flex: 0 0 auto; max-width: 45%; }
    .ii-place-empty { color: var(--text-subtle); }
  </style>`;
}

/* ------------------------------------------------------------------ */
/* Render + wiring                                                     */
/* ------------------------------------------------------------------ */

let hostEl = null;

export function renderAllModules(mainEl) {
  hostEl = mainEl;
  mainEl.innerHTML = `
    ${moduleStyles()}
    <div class="mi-wrap">
      <header class="mi-hero">
        <div class="mi-hero-text">
          <h1 class="mi-hero-title">All Modules</h1>
          <p class="mi-hero-lede">An admin index of every module in the WISE app, plus the Icon Inventory —
            a live catalog of every icon, its label, and where it is placed. Use it as a design-system map and
            a jumping-off point to any screen.</p>
        </div>
        <div class="mi-view" role="group" aria-label="Directory view">
          <button type="button" class="mi-view-btn is-active" data-view="grid" aria-pressed="true"><span class="material-symbols-outlined">grid_view</span>Grid</button>
          <button type="button" class="mi-view-btn" data-view="rail" aria-pressed="false"><span class="material-symbols-outlined">view_column</span>Rail</button>
        </div>
      </header>
      ${renderDirectory()}
      ${renderIconInventory()}
    </div>`;

  wireView(mainEl);
  wireDirectory(mainEl);
  wireRailFrames(mainEl);
  wireIconInventory(mainEl);
  wireModuleControls(mainEl);
  wireLinkValidation(mainEl);
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
    case 'ii-all': clearInput('#ii-search-input'); click('[data-ii-fam="all"]'); break;
  }
}

function wireModuleControls(root) {
  root.querySelectorAll('[data-mi-controls]').forEach((cluster) => {
    const moduleId = cluster.getAttribute('data-mi-controls');
    const moduleEl = root.querySelector('#' + moduleId);

    /* ---- Width changer: cycle single → double → triple → fill ---- */
    const widthBtn = cluster.querySelector('[data-mi-width]');
    const key = 'mi-modwidth-' + moduleId;
    const readTier = () => {
      try {
        const n = parseInt(localStorage.getItem(key), 10);
        return Number.isFinite(n) ? Math.max(0, Math.min(3, n)) : 3;
      } catch { return 3; }
    };
    const applyTier = (t) => {
      if (moduleEl) {
        moduleEl.classList.toggle('mi-w-narrow', t === 0);
        moduleEl.classList.toggle('mi-w-wide', t === 1);
        moduleEl.classList.toggle('mi-w-triple', t === 2);
      }
      if (widthBtn) {
        widthBtn.classList.toggle('is-on', t <= 2);
        widthBtn.setAttribute('aria-pressed', t <= 2 ? 'true' : 'false');
        widthBtn.title = MODULE_WIDTH_TITLES[t];
        const ic = widthBtn.querySelector('.material-symbols-outlined');
        if (ic) ic.textContent = MODULE_WIDTH_ICONS[t];
      }
    };
    applyTier(readTier());
    widthBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const next = (readTier() + 1) % 4;
      try { localStorage.setItem(key, String(next)); } catch {}
      applyTier(next);
    });

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
  if (broken) {
    if (frame) frame.removeAttribute('src');
    if (viewport && !viewport.querySelector('.mi-pane-broken')) {
      viewport.insertAdjacentHTML('beforeend',
        '<span class="mi-pane-broken"><span class="material-symbols-outlined">link_off</span>Unavailable · 404</span>');
    }
    viewport?.addEventListener('click', preventBrokenNav);
  } else {
    pane.querySelector('.mi-pane-broken')?.remove();
    viewport?.removeEventListener('click', preventBrokenNav);
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
   top bar, or WISEai chat dock that every app screen shares. The previews are
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

  /* Marketing shell (marketing-*.html): the primary nav + persistent WISEai
     chat rail are injected by marketing-shell.js — drop them too so the preview
     shows only the unique module, and reclaim the space the fixed rail reserved. */
  .mkt-nav, [data-mkt-nav], #mkt-chat-rail, #mkt-chat-scrim, #mkt-chat-fab { display: none !important; }
  .mkt-appshell #mkt-body-module, .mkt-appshell .mkt-footer { margin-left: 0 !important; }

  html, body { overflow-x: hidden !important; }
`;

function embedRailFrame(frame) {
  try {
    const doc = frame.contentDocument;
    if (!doc || doc.getElementById('mi-embed-style')) return;
    const style = doc.createElement('style');
    style.id = 'mi-embed-style';
    style.textContent = RAIL_EMBED_CSS;
    (doc.head || doc.documentElement).appendChild(style);
  } catch (e) { /* cross-origin frame — leave the full page as-is */ }
}

function wireRailFrames(root) {
  root.querySelectorAll('.mi-pane-frame').forEach((f) => {
    f.addEventListener('load', () => embedRailFrame(f));
    // Handle the case where the frame finished loading before we attached.
    try {
      if (f.contentDocument && f.contentDocument.readyState === 'complete') embedRailFrame(f);
    } catch (e) { /* not ready / cross-origin */ }
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
  const panes = Array.from(root.querySelectorAll('[data-pane]'));
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

function wireIconInventory(root) {
  const grid = root.querySelector('#ii-grid');
  const emptyEl = root.querySelector('#ii-empty');
  const searchInput = root.querySelector('#ii-search-input');
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll('[data-icon-card]'));
  const state = { q: '', fam: 'all', sort: 'name' };

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
      const vis = matchQ && matchF;
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

/* WISEai dock config for this page — a light welcome that points at the two
   modules and can jump to either. */
export const ALL_MODULES_WISEAI = {
  sub: 'Your app’s module map and icon inventory.',
  chipsFlow: 'wrap',
  intents: [
    { intent: 'directory', label: 'Jump to the Module Directory', icon: 'apps' },
    { intent: 'icons', label: 'Jump to the Icon Inventory', icon: 'emoji_symbols' },
    { intent: 'counts', label: 'How many icons are there?', icon: 'tag' },
  ],
  intentReplies: {
    directory: 'The <strong>Module Directory</strong> lists every workspace, account, chat, report, product, auth and marketing screen in the app.',
    icons: 'The <strong>Icon Inventory</strong> catalogs every Material Symbols glyph used anywhere, with its variant, usage count, label, and exact placements.',
    counts: `There are <strong>${ICON_INVENTORY?.totalUniqueIcons || 0} unique icons</strong> across <strong>${ICON_INVENTORY?.totalUses || 0} placements</strong> in the app.`,
  },
  onIntent: (intent) => {
    const id = intent === 'icons' ? 'mi-icons' : intent === 'directory' ? 'mi-directory' : null;
    if (id) {
      const el = document.getElementById(id);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return true; }
    }
    return false;
  },
};
