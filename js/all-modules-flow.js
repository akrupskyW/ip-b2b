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
 *   2. Icon Inventory — every Material Icons / Symbols glyph used anywhere in the
 *      codebase, with its family, usage count, a representative label, and the
 *      exact placements (file + line). The data is scanned by
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
 */

import { ICON_INVENTORY } from './icon-inventory-data.js';
import { CODE_STATS } from './code-stats-data.js';

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
      { label: 'WISEcodeAI', icon: 'auto_awesome', href: '../marketing-wiseai.html' },
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
            than one module — the WISEcodeAI studio (Chat, History, Data Sources, Turns) and Reformulation
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
    <section class="mi-module" id="mi-code">
      <header class="mi-module-head">
        <div class="mi-module-head-text">
          <h2 class="mi-module-title">Codebase</h2>
          <p class="mi-module-lede">How big the app itself is — lines of hand-written HTML, JavaScript, CSS and
            Python (generated data blobs excluded) with an up/down trend from one git snapshot per day, plus the
            HTML page count. Generated by <code>scripts/scan_code_stats.py</code>.</p>
        </div>
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
  { name: 'Eyebrow / label', size: '0.6875rem', px: '11px', weight: '700–800', family: 'DM Sans', token: '--fs-label', style: 'font-size:0.6875rem;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;', use: 'Section eyebrows (.dash-eyebrow), group titles, table headers, form labels.' },
  { name: 'UI base', size: '0.75rem', px: '12px', weight: '500–700', family: 'DM Sans', token: '--fs-ui', style: 'font-size:0.75rem;font-weight:500;', use: 'The app-wide control size — the body default. Nav items, menu rows, chips, popover items, buttons.' },
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
      </div>
      <p class="ds-group-note">${esc(g.note)}</p>
      <div class="ds-swatch-grid">${g.swatches.map(swatchHTML).join('')}</div>
    </div>`).join('');

  return `
    <section class="mi-module" id="mi-design">
      <header class="mi-module-head">
        <div class="mi-module-head-text">
          <h2 class="mi-module-title">Design System</h2>
          <p class="mi-module-lede">The app's typographic system and every design token from
            <code>pages/wise.css</code>. Swatches render live off the real CSS variables, so they
            always show the current theme — flip light/dark and watch them re-resolve.</p>
        </div>
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
   components that need the room (tables, charts, modals). */

/* Sort caret used inside table headers app-wide (mirrors ARROW_SVG in the
   admin flows) so the Data table demo shows the real sortable affordance. */
const ARROW_SVG_DEMO = '<span class="adm-sort-arrow"><svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 9.5V2.5M3 6.5L6 9.5l3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';

/* Categories power the click-to-filter scorecards at the top of the Component
   Library, so you can jump straight to a family instead of scrolling. Order
   here is the order the tiles render in. */
const COMPONENT_CATS = [
  { key: 'Tables & data', icon: 'table_rows' },
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
  'Module control cluster': 'Actions',
  'Top-bar icon button': 'Actions',
  'Intent chips': 'Chips & badges',
  'Status pills': 'Chips & badges',
  'Status chips (domain)': 'Chips & badges',
  'Badges': 'Chips & badges',
  'Chat composer': 'Inputs & forms',
  'Search pill': 'Inputs & forms',
  'Form fields': 'Inputs & forms',
  'Brand toggle': 'Inputs & forms',
  'Data table': 'Tables & data',
  'Charts & graphs': 'Tables & data',
  'Distribution bar': 'Tables & data',
  'Dashboard card': 'Tables & data',
  'Empty state': 'Tables & data',
  'Pagination footer': 'Tables & data',
  'Scorecard stat tile': 'Filters',
  'Stat filter board': 'Filters',
  'Filter toolbar': 'Filters',
  'View toggle': 'Filters',
  'Tabs & segmented': 'Navigation',
  'Popover menu': 'Overlays',
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
      </div>
      <button type="button" class="dash-text-link">View full report<span class="material-symbols-outlined" style="font-size:14px">arrow_forward</span></button>`,
  },
  {
    name: 'Intent chips',
    wide: true,
    cls: 'Large: .chip · .ws-intent-chip — Small: .sc-reply-chips .chip (+ .chip-primary, .chip-dive, .chip--match, .ms-chip.is-selected)',
    used: 'Large: WISEcodeAI dock & Studio welcome, module shortcuts · Small: in-conversation reply chips (Auth signup, Comparison, chat turns)',
    note: 'Two sizes of one chip. <strong>Large</strong> welcome/shortcut chips use the base <code>.chip</code> size; <strong>small</strong> reply chips shrink inside <code>.sc-reply-chips</code> (tighter padding + <code>--fs-label</code>) for in-line answers. Both share the composer\u2019s blue tint so chips and input read as one family.',
    noteIcon: 'straighten',
    demo: `
      <div style="display:flex;flex-direction:column;gap:14px;width:100%">
        <div class="dsc-sub">
          <span class="dsc-sub-label">Large · welcome &amp; module shortcuts</span>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            <button type="button" class="chip"><span class="material-symbols-outlined">auto_awesome</span>Suggest a reformulation</button>
            <button type="button" class="chip ws-intent-chip"><span class="material-symbols-outlined">inventory_2</span>Open portfolio</button>
            <button type="button" class="chip chip-primary"><span class="material-symbols-outlined">check</span>Done</button>
          </div>
        </div>
        <div class="dsc-sub">
          <span class="dsc-sub-label">Small · in-conversation reply chips</span>
          <div class="sc-reply-chips" style="margin:0">
            <button type="button" class="chip chip--match"><span class="material-symbols-outlined">check_circle</span>Best match</button>
            <button type="button" class="chip">Compare two products</button>
            <button type="button" class="chip ms-chip is-selected">High sugar</button>
            <button type="button" class="chip chip-dive"><span class="material-symbols-outlined">arrow_forward</span>Dive in</button>
            <button type="button" class="chip chip-primary"><span class="material-symbols-outlined">check</span>Confirm</button>
          </div>
        </div>
      </div>`,
  },
  {
    name: 'Chat composer',
    cls: '.fl-input-wrap · .fl-input · .fl-icon-btn · .sc-send',
    used: 'WISEcodeAI dock (every page) · Studio Chat · Reformulation / Add Product / Studio&AI panes',
    demo: `
      <div class="fl-input-wrap" style="max-width:440px">
        <button type="button" class="fl-icon-btn" aria-label="Attach"><span class="material-symbols-outlined">add</span></button>
        <textarea class="fl-input" rows="1" wrap="off" placeholder="Ask WISEcodeAI…"></textarea>
        <button type="button" class="fl-icon-btn" aria-label="Dictate"><span class="material-symbols-outlined">mic</span></button>
        <button type="button" class="sc-send" aria-label="Send"><span class="material-symbols-outlined">arrow_upward</span></button>
      </div>`,
  },
  {
    name: 'Search pill',
    cls: '.mi-search-inline (= .pf-search-inline)',
    used: 'Product Portfolio · Module Directory & Icon Inventory (this page) · User Management · Docs',
    demo: `
      <div class="mi-search-inline" style="max-width:360px">
        <span class="material-symbols-outlined">search</span>
        <input type="search" class="mi-search" placeholder="Search products…" aria-label="Demo search" />
      </div>`,
  },
  {
    name: 'Scorecard stat tile',
    cls: '.mi-stat (= .pf-stat) · .is-active',
    used: 'Product Portfolio filters · Module Directory & Icon Inventory (this page) · Audit Queue',
    demo: `
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button type="button" class="mi-stat" style="flex:0 1 150px">
          <span class="mi-stat-num">128</span>
          <span class="mi-stat-label"><span class="mi-stat-text">All products</span><span class="material-symbols-outlined">apps</span></span>
        </button>
        <button type="button" class="mi-stat is-active" style="flex:0 1 150px">
          <span class="mi-stat-num">62</span>
          <span class="mi-stat-label"><span class="mi-stat-text">Verified</span><span class="material-symbols-outlined">verified</span></span>
        </button>
      </div>`,
  },
  {
    name: 'Popover menu',
    cls: '.topbar-popover · .topbar-menu-item (+ --danger, --admin, badge, switch)',
    used: 'Top bar (avatar + ⋯ menus, every page) · every module\u2019s three-dot menu · Appearance menu',
    demo: `
      <div class="topbar-popover" data-popover-static style="max-width:260px">
        <button type="button" class="topbar-menu-item"><span class="material-symbols-outlined topbar-menu-icon">tune</span><span>Preferences</span></button>
        <button type="button" class="topbar-menu-item"><span class="material-symbols-outlined topbar-menu-icon">help</span><span>Help &amp; docs</span></button>
        <div class="topbar-menu-divider"></div>
        <button type="button" class="topbar-menu-item topbar-menu-item--admin topbar-menu-item--toggle" role="switch" aria-checked="true" data-demo-switch>
          <span class="material-symbols-outlined topbar-menu-icon">science</span><span>Beta view</span>
          <span class="topbar-menu-badge">ADMIN</span>
          <span class="topbar-menu-switch"><span class="topbar-menu-switch-thumb"></span></span>
        </button>
        <button type="button" class="topbar-menu-item topbar-menu-item--danger"><span class="material-symbols-outlined topbar-menu-icon">logout</span><span>Sign out</span></button>
      </div>`,
  },
  {
    name: 'Module control cluster',
    cls: '.panel-more-btn · .panel-width-toggle-btn',
    used: 'Every module header app-wide (dashboards, portfolio, studio panes, this page)',
    demo: `
      <div style="display:inline-flex;align-items:center;gap:2px">
        <button type="button" class="panel-more-btn" aria-label="More options"><span class="material-symbols-outlined">more_vert</span></button>
        <button type="button" class="panel-width-toggle-btn" aria-label="Module width"><span class="material-symbols-outlined">width_full</span></button>
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
    name: 'Brand toggle',
    cls: '.dash-brand-toggle (+ track / thumb, .is-on)',
    used: 'Dashboard hero (Guiding Stars swap) · admin view toggles — click to flip',
    demo: `
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <button type="button" class="dash-brand-toggle" role="switch" aria-checked="false" data-demo-switch>
          <span class="dash-brand-toggle-track"><span class="dash-brand-toggle-thumb"></span></span>
          <span class="dash-brand-toggle-text">Guiding Stars</span>
        </button>
        <button type="button" class="dash-brand-toggle" role="switch" aria-checked="true" data-demo-switch>
          <span class="dash-brand-toggle-track"><span class="dash-brand-toggle-thumb"></span></span>
          <span class="dash-brand-toggle-text">Guiding Stars</span>
        </button>
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
          <span class="dash-seg-piece" style="width:56%;background:var(--sec-green)"></span>
          <span class="dash-seg-piece" style="width:28%;background:var(--ter-amber)"></span>
          <span class="dash-seg-piece" style="width:16%;background:var(--sec-red)"></span>
        </div>
        <div class="dash-seg-tags">
          <span class="dash-seg-tag"><span class="dash-dot" style="background:var(--sec-green)"></span>Non-UPF</span>
          <span class="dash-seg-tag"><span class="dash-dot" style="background:var(--ter-amber)"></span>At risk</span>
          <span class="dash-seg-tag"><span class="dash-dot" style="background:var(--sec-red)"></span>UPF</span>
        </div>
      </div>`,
  },
  {
    name: 'View toggle',
    cls: '.mi-view · .mi-view-btn (pill segment)',
    used: 'This page (Grid ⇄ Rail) · Icon Inventory sort (.ii-sort/.ii-filter) · Portfolio view switches',
    demo: `
      <div class="mi-view">
        <button type="button" class="mi-view-btn is-active"><span class="material-symbols-outlined">grid_view</span>Grid</button>
        <button type="button" class="mi-view-btn"><span class="material-symbols-outlined">view_column</span>Rail</button>
      </div>`,
  },
  {
    name: 'Badges',
    cls: '.topbar-menu-badge · .mi-card-badge',
    used: 'Admin rows in popovers · module cards (this page) · nav flags',
    demo: `
      <div style="display:flex;align-items:center;gap:10px">
        <span class="topbar-menu-badge" style="margin-left:0">ADMIN</span>
        <span class="mi-card-badge">Admin</span>
      </div>`,
  },

  /* ---- Data table — the ONE shared grid "table", fully loaded ----- */
  {
    name: 'Data table',
    cat: 'Tables & data',
    wide: true,
    cls: '.adm-table · .adm-thead / .adm-trow · .adm-th(--sortable/--num/--check) · .adm-td · .adm-idcell · .adm-chip · .adm-actions · .adm-rowmenu · .wtp-foot (= .pf-table · .inv-table · .rf-table)',
    used: 'Organizations · User Management · Audit Queue · Non-UPF Dashboard · Invoices · Portfolio — every admin & module list',
    note: 'The fully-loaded table: leading <strong>checkbox</strong> column, a <strong>sortable</strong> header with the active sort lit, an <strong>identity cell</strong> (avatar + name + sub), tabular numeric with a "hot" highlight, token <strong>status chips</strong>, an <strong>actions</strong> rail plus a per-row <strong>⋯ menu</strong>, and the shared "load more" <strong>pagination footer</strong>. All from one CSS-grid pattern (no <code>&lt;table&gt;</code>) driven by a single <code>--adm-cols</code> variable; sort (<code>sortable-tables.js</code>) + paging (<code>table-pagination.js</code>) attach app-wide.',
    noteIcon: 'table_rows',
    demo: `
      <div class="adm-table-card adm-card" style="width:100%">
        <div class="adm-table" style="--adm-cols: 22px 2.2fr 0.9fr 0.7fr 1fr 1fr 92px">
          <div class="adm-thead">
            <span class="adm-th adm-th--check"><input type="checkbox" class="adm-check" aria-label="Select all" /></span>
            <span class="adm-th adm-th--sortable" data-adm-dir="asc">Organization ${ARROW_SVG_DEMO}</span>
            <span class="adm-th">Plan</span>
            <span class="adm-th adm-th--num adm-th--sortable" data-adm-dir="desc">Products ${ARROW_SVG_DEMO}</span>
            <span class="adm-th">Owner</span>
            <span class="adm-th">Status</span>
            <span class="adm-th adm-th--end">Actions</span>
          </div>
          <div class="adm-trow">
            <span class="adm-td adm-td--check"><input type="checkbox" class="adm-check" checked aria-label="Select row" /></span>
            <span class="adm-td"><span class="adm-idcell"><span class="adm-avatar">AF</span><span class="adm-idcell-body"><span class="adm-idcell-name"><a href="#" onclick="return false">Acme Foods</a></span><span class="adm-idcell-sub">acme.example.com · EIN 47-1029384</span></span></span></span>
            <span class="adm-td"><span class="adm-chip adm-chip--blue">Enterprise</span></span>
            <span class="adm-td adm-td--num is-hot">128</span>
            <span class="adm-td"><span class="adm-idcell"><span class="adm-avatar adm-avatar--round" style="width:26px;height:26px;font-size:0.62rem">MC</span><span class="adm-idcell-body"><span class="adm-idcell-name" style="font-size:0.8rem">Maria Chen</span></span></span></span>
            <span class="adm-td"><span class="adm-chip adm-chip--green"><span class="material-symbols-outlined">verified</span>Verified</span></span>
            <span class="adm-td adm-td--end"><span class="adm-actions"><button type="button" class="adm-icon-btn" aria-label="Edit"><span class="material-symbols-outlined">edit</span></button><span class="adm-rowmenu"><button type="button" class="adm-rowmenu-btn" aria-label="Row actions"><span class="material-symbols-outlined">more_vert</span></button></span></span></span>
          </div>
          <div class="adm-trow">
            <span class="adm-td adm-td--check"><input type="checkbox" class="adm-check" aria-label="Select row" /></span>
            <span class="adm-td"><span class="adm-idcell"><span class="adm-avatar">NB</span><span class="adm-idcell-body"><span class="adm-idcell-name"><a href="#" onclick="return false">Nourish Brands</a></span><span class="adm-idcell-sub">nourish.example.com · EIN 82-5567013</span></span></span></span>
            <span class="adm-td"><span class="adm-chip adm-chip--muted">Growth</span></span>
            <span class="adm-td adm-td--num">46</span>
            <span class="adm-td"><span class="adm-idcell"><span class="adm-avatar adm-avatar--round" style="width:26px;height:26px;font-size:0.62rem">JR</span><span class="adm-idcell-body"><span class="adm-idcell-name" style="font-size:0.8rem">Jordan Rivera</span></span></span></span>
            <span class="adm-td"><span class="adm-chip adm-chip--amber"><span class="material-symbols-outlined">pending</span>In review</span></span>
            <span class="adm-td adm-td--end"><span class="adm-actions"><button type="button" class="adm-icon-btn" aria-label="Edit"><span class="material-symbols-outlined">edit</span></button><span class="adm-rowmenu"><button type="button" class="adm-rowmenu-btn" aria-label="Row actions"><span class="material-symbols-outlined">more_vert</span></button></span></span></span>
          </div>
          <div class="adm-trow">
            <span class="adm-td adm-td--check"><input type="checkbox" class="adm-check" aria-label="Select row" /></span>
            <span class="adm-td"><span class="adm-idcell"><span class="adm-avatar">GP</span><span class="adm-idcell-body"><span class="adm-idcell-name"><a href="#" onclick="return false">Garden Provisions</a></span><span class="adm-idcell-sub">garden.example.com · EIN 61-8890271</span></span></span></span>
            <span class="adm-td"><span class="adm-chip adm-chip--muted">Starter</span></span>
            <span class="adm-td adm-td--num">12</span>
            <span class="adm-td"><span class="adm-idcell"><span class="adm-avatar adm-avatar--round" style="width:26px;height:26px;font-size:0.62rem">AP</span><span class="adm-idcell-body"><span class="adm-idcell-name" style="font-size:0.8rem">Avery Park</span></span></span></span>
            <span class="adm-td"><span class="adm-chip adm-chip--red"><span class="material-symbols-outlined">error</span>Action needed</span></span>
            <span class="adm-td adm-td--end"><span class="adm-actions"><button type="button" class="adm-icon-btn" aria-label="Edit"><span class="material-symbols-outlined">edit</span></button><span class="adm-rowmenu"><button type="button" class="adm-rowmenu-btn" aria-label="Row actions"><span class="material-symbols-outlined">more_vert</span></button></span></span></span>
          </div>
          <div class="adm-trow">
            <span class="adm-td adm-td--check"><input type="checkbox" class="adm-check" aria-label="Select row" /></span>
            <span class="adm-td"><span class="adm-idcell"><span class="adm-avatar">SK</span><span class="adm-idcell-body"><span class="adm-idcell-name"><a href="#" onclick="return false">Sunny Kitchen Co.</a></span><span class="adm-idcell-sub">sunnykitchen.example.com · EIN 29-4471908</span></span></span></span>
            <span class="adm-td"><span class="adm-chip adm-chip--muted">Draft</span></span>
            <span class="adm-td adm-td--num">3</span>
            <span class="adm-td"><span class="adm-idcell-sub" style="padding-left:2px">Unassigned</span></span>
            <span class="adm-td"><span class="adm-chip adm-chip--outline"><span class="material-symbols-outlined">schedule</span>Draft</span></span>
            <span class="adm-td adm-td--end"><span class="adm-actions"><button type="button" class="adm-icon-btn" aria-label="Edit"><span class="material-symbols-outlined">edit</span></button><span class="adm-rowmenu"><button type="button" class="adm-rowmenu-btn" aria-label="Row actions"><span class="material-symbols-outlined">more_vert</span></button></span></span></span>
          </div>
        </div>
        <div class="wtp-foot">
          <span class="wtp-count">Showing <b>4</b> of <b>128</b> organizations</span>
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

  /* ---- Segmented stat board — click-to-filter scorecards ---------- */
  {
    name: 'Stat filter board',
    wide: true,
    cls: '.adm-stats · .adm-stat (+ .is-active, --green/--red/--amber/--blue) · .adm-metrics · .adm-metric',
    used: 'Organizations · User Management · Audit Queue · Verification (.adm-vf-stats) · Portfolio (.pf-stats)',
    note: 'The stat tiles double as filters — click one to scope the table, <code>.is-active</code> marks the current facet. The grid is <code>repeat(auto-fit, minmax(140px, 1fr))</code>, so tiles wrap from 4-up to 1-up with the container.',
    noteIcon: 'space_dashboard',
    demo: `
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
    demo: `
      <div style="display:flex;flex-wrap:wrap;gap:14px;width:100%">
        <div class="adm-chart-card" style="flex:1 1 240px">
          <h4 class="adm-chart-title">Processing spectrum</h4>
          <div class="adm-chart-body">
            <div class="adm-bars" style="height:150px">
              <div class="adm-bar"><div class="adm-bar-track"><div class="adm-bar-fill" style="height:72%;background:var(--sec-green)"><span class="adm-bar-val">54</span></div></div><span class="adm-bar-label">Minimally processed</span></div>
              <div class="adm-bar"><div class="adm-bar-track"><div class="adm-bar-fill" style="height:48%;background:var(--ter-amber)"><span class="adm-bar-val">31</span></div></div><span class="adm-bar-label">Processed</span></div>
              <div class="adm-bar"><div class="adm-bar-track"><div class="adm-bar-fill" style="height:34%;background:var(--sec-red)"><span class="adm-bar-val">18</span></div></div><span class="adm-bar-label">Ultra-processed</span></div>
            </div>
          </div>
        </div>
        <div class="adm-chart-card" style="flex:1 1 220px">
          <h4 class="adm-chart-title">Verification status</h4>
          <div class="adm-chart-body">
            <div class="adm-vstatus">
              <div class="adm-vrow"><span class="adm-vrow-ic material-symbols-outlined" style="color:var(--sec-green)">verified</span><div class="adm-vrow-main"><div class="adm-vrow-label">Verified</div><div class="adm-vrow-bar"><span style="width:62%;background:var(--sec-green)"></span></div></div><span class="adm-vrow-val">62</span></div>
              <div class="adm-vrow"><span class="adm-vrow-ic material-symbols-outlined" style="color:var(--ter-amber-text)">pending</span><div class="adm-vrow-main"><div class="adm-vrow-label">Pending</div><div class="adm-vrow-bar"><span style="width:32%;background:var(--ter-amber)"></span></div></div><span class="adm-vrow-val">41</span></div>
              <div class="adm-vrow"><span class="adm-vrow-ic material-symbols-outlined" style="color:var(--sec-red)">error</span><div class="adm-vrow-main"><div class="adm-vrow-label">At risk</div><div class="adm-vrow-bar"><span style="width:18%;background:var(--sec-red)"></span></div></div><span class="adm-vrow-val">25</span></div>
            </div>
            <div class="adm-legend">
              <div class="adm-legend-row"><span class="adm-legend-dot" style="background:var(--sec-green)"></span><span class="adm-legend-label">Non-UPF</span><span class="adm-legend-val">48%</span></div>
              <div class="adm-legend-row"><span class="adm-legend-dot" style="background:var(--ter-amber)"></span><span class="adm-legend-label">At risk</span><span class="adm-legend-val">32%</span></div>
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
    cls: '.adm-field · .adm-field-label · .adm-input · .adm-select (auth surfaces use .auth-field / .auth-input)',
    used: 'Filter popovers · Quick Invite · Admin Utils · Audit Queue filter card · admin modals',
    note: 'Inputs and selects share one 42px pill/rounded shape, token surfaces, and the same focus ring across every form. Fields stack in a fluid grid that collapses to one column on narrow containers.',
    noteIcon: 'edit_note',
    demo: `
      <div style="display:flex;flex-direction:column;gap:12px;width:100%;max-width:320px">
        <div class="adm-field"><span class="adm-field-label">Full name</span><input class="adm-input" placeholder="Jordan Rivera" /></div>
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

  /* ---- Empty state ----------------------------------------------- */
  {
    name: 'Empty state',
    cls: '.adm-empty (· .ib-empty · .mi-dir-empty · .pf-empty)',
    used: 'Every filtered list when nothing matches — admin tables, Ingredient Browser, Module Directory, Portfolio',
    note: 'The consistent "nothing here" fallback shown inside a table/list card when a filter or search returns no rows.',
    noteIcon: 'inbox',
    demo: `
      <div class="adm-card" style="width:100%">
        <div class="adm-empty">
          <div style="font-size:32px;line-height:1;margin-bottom:6px"><span class="material-symbols-outlined" style="font-size:32px;color:var(--text-subtle)">search_off</span></div>
          No organizations match your filters.
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
    cls: '.adm-avatar (+ --round, --photo, --lg) · .topbar-profile',
    used: 'Table identity cells · owner columns · brand pickers · top-bar profile',
    note: 'One avatar primitive: token-tinted initials by default, with round, photo, and large variants. Falls back to initials when there is no image.',
    noteIcon: 'account_circle',
    demo: `
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <span class="adm-avatar">AF</span>
        <span class="adm-avatar adm-avatar--round">MC</span>
        <span class="adm-avatar adm-avatar--lg">GP</span>
        <span class="adm-avatar adm-avatar--round adm-avatar--lg adm-avatar--photo"><img src="https://i.pravatar.cc/80?img=12" alt="" /></span>
        <button type="button" class="topbar-profile" aria-label="Profile" style="position:static;transform:none">JR</button>
      </div>`,
  },

  /* ---- Tabs / segmented control ---------------------------------- */
  {
    name: 'Tabs & segmented',
    cls: '.mi-view / .mi-view-btn · .cmp-scopebar / .cmp-scope-btn · .segmented (scope & view switchers)',
    used: 'This page (Grid ⇄ Rail) · Comparison scope bar · Portfolio & WISEai view switches',
    note: 'A pill-segmented control for switching scope or view without leaving the surface; the active segment lifts onto the surface color. One shape, whether it toggles two options or several.',
    noteIcon: 'tab',
    demo: `
      <div style="display:flex;flex-direction:column;gap:12px">
        <div class="mi-view">
          <button type="button" class="mi-view-btn is-active"><span class="material-symbols-outlined">grid_view</span>Grid</button>
          <button type="button" class="mi-view-btn"><span class="material-symbols-outlined">view_column</span>Rail</button>
        </div>
        <div class="mi-view">
          <button type="button" class="mi-view-btn is-active">All</button>
          <button type="button" class="mi-view-btn">Verified</button>
          <button type="button" class="mi-view-btn">At risk</button>
          <button type="button" class="mi-view-btn">Drafts</button>
        </div>
      </div>`,
  },
];

function componentCard(c) {
  const cat = catOf(c);
  const search = `${c.name} ${c.cls} ${c.used} ${c.note || ''} ${cat}`.toLowerCase();
  const cardCls = `dsc-card${c.wide ? ' dsc-card--wide' : ''}`;
  const note = c.note
    ? `<div class="dsc-note"><span class="material-symbols-outlined">${esc(c.noteIcon || 'aspect_ratio')}</span><span>${c.note}</span></div>`
    : '';
  return `
    <div class="${cardCls}" data-ds-comp data-cat="${esc(cat)}" data-search="${esc(search)}">
      <div class="dsc-head">
        <span class="dsc-name">${esc(c.name)}</span>
        <code class="dsc-class">${esc(c.cls)}</code>
      </div>
      <div class="dsc-demo">${c.demo}</div>
      ${note}
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
    <section class="mi-module" id="mi-components">
      <header class="mi-module-head">
        <div class="mi-module-head-text">
          <h2 class="mi-module-title">Component Library</h2>
          <p class="mi-module-lede">Every reusable component in its default state, rendered live with the
            real global classes from <code>pages/wise.css</code> — so what you see here is exactly what
            ships, in the current theme. Variations sit beside their default, and each card lists the
            surfaces where the component is used and the shared rule behind it.</p>
        </div>
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
        ${COMPONENTS.map(componentCard).join('')}
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
      font-family: 'WISE Digits', 'Noto Serif', Georgia, serif;
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
    .ii-place-label { font-size: 0.6875rem; color: var(--text); text-align: right; flex: 0 0 auto; max-width: 45%; }
    .ii-place-empty { color: var(--text-subtle); }

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
    .dsc-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 14px 16px 10px; flex-wrap: wrap; }
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
    .dsc-demo .topbar-profile { position: static; transform: none; }
    .dsc-demo .topbar-profile:hover { transform: scale(1.04); }
    .dsc-demo .topbar-profile.has-dot::after { top: -1px; right: -1px; }
    .dsc-demo .dash-text-link { margin-top: 0; }
    .dsc-demo .fl-input-wrap { width: 100%; }
    .dsc-demo .mi-search-inline { width: 100%; }
    /* New in-situ components: render the popovers/menus/modal inline + inert. */
    .dsc-demo .adm-filter-pop { position: static; margin-top: 10px; width: 100%; box-shadow: none; }
    .dsc-demo .adm-rowmenu-pop { position: static; box-shadow: none; }
    .dsc-demo .wise-popover { position: static; box-shadow: none; }
    .dsc-demo .adm-modal { transform: none; box-shadow: var(--shadow-2); }
    .dsc-demo .adm-donut-arc,
    .dsc-demo .adm-bar-fill,
    .dsc-demo .adm-vrow-bar span { transition: none; }

    /* Labeled sub-groups inside a demo (e.g. large vs small intent chips). */
    .dsc-sub { display: flex; flex-direction: column; gap: 8px; width: 100%; }
    .dsc-sub-label {
      font-size: 0.5625rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--text-subtle);
    }

    /* The small reply-chip size + its variants live in pages/auth.css
       (the .sc-reply-chips spec), which this page doesn't load. Mirror the
       exact spec here so the "small" chips render true to the app. */
    .dsc-demo .sc-reply-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .dsc-demo .sc-reply-chips .chip {
      font-weight: 500; padding: 5px 11px; font-size: var(--fs-label);
      line-height: 1.25; text-align: left; max-width: 100%;
    }
    .dsc-demo .sc-reply-chips .chip .material-symbols-outlined { font-size: 13px !important; }
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

    /* Static tooltip bubble in the Tooltip demo — mirrors the dark #lir-tooltip. */
    .dsc-tip {
      display: inline-flex; align-items: center; padding: 4px 9px; border-radius: 7px;
      background: var(--text); color: var(--bg); font-size: 0.6875rem; font-weight: 600;
      box-shadow: var(--shadow-2); white-space: nowrap;
    }

    /* ---- Section quick-nav (scorecards at the very top) ---- */
    .dsc-jump {
      display: grid; gap: 12px; margin: 4px 0 26px;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    }
    .dsc-jump-tile {
      display: flex; align-items: center; gap: 13px; text-align: left;
      padding: 15px 16px; border: 1px solid var(--border); border-radius: 16px;
      background: var(--surface); box-shadow: var(--shadow-1); cursor: pointer; font: inherit;
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    }
    html.dark .dsc-jump-tile { background: rgba(255,255,255,0.03); }
    .dsc-jump-tile:hover { transform: translateY(-2px); box-shadow: var(--shadow-2); border-color: color-mix(in srgb, var(--primary) 45%, var(--border)); }
    .dsc-jump-tile:focus-visible { outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 22%, transparent); }
    .dsc-jump-ic {
      flex: 0 0 auto; width: 42px; height: 42px; border-radius: 12px;
      display: grid; place-items: center; color: var(--primary);
      background: color-mix(in srgb, var(--primary) 12%, transparent);
    }
    html.dark .dsc-jump-ic { color: var(--primary-bright, #93C5FD); }
    .dsc-jump-ic .material-symbols-outlined { font-size: 22px !important; }
    .dsc-jump-body { min-width: 0; display: flex; flex-direction: column; line-height: 1.15; }
    .dsc-jump-num { font-family: 'WISE Digits', 'Noto Serif', Georgia, serif; font-size: 1.4rem; font-weight: 800; color: var(--text); }
    .dsc-jump-label { font-size: 0.82rem; font-weight: 700; color: var(--text); margin-top: 1px; }
    .dsc-jump-sub { font-size: 0.68rem; color: var(--text-subtle); margin-top: 2px; }
    .dsc-jump-go { margin-left: auto; flex: 0 0 auto; font-size: 18px !important; color: var(--text-subtle); transition: transform 0.15s ease, color 0.15s ease; }
    .dsc-jump-tile:hover .dsc-jump-go { transform: translateY(2px); color: var(--primary); }
    html.dark .dsc-jump-tile:hover .dsc-jump-go { color: var(--primary-bright, #93C5FD); }

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
          <p class="mi-hero-lede">An admin index of every module in the WISE app, plus the Codebase score
            cards (lines of code, trend, and page count), the Icon Inventory, the Design System (fonts, type
            scale, and every color token), and the Component Library — every reusable component rendered live
            in its default state, with where it's used. Use it as a design-system map and a jumping-off point
            to any screen.</p>
        </div>
        <div class="mi-view" role="group" aria-label="Directory view">
          <button type="button" class="mi-view-btn is-active" data-view="grid" aria-pressed="true"><span class="material-symbols-outlined">grid_view</span>Grid</button>
          <button type="button" class="mi-view-btn" data-view="rail" aria-pressed="false"><span class="material-symbols-outlined">view_column</span>Rail</button>
        </div>
      </header>
      ${renderSectionNav()}
      ${renderCodebase()}
      ${renderDirectory()}
      ${renderIconInventory()}
      ${renderDesignSystem()}
      ${renderComponentLibrary()}
    </div>`;

  wireView(mainEl);
  wireSectionNav(mainEl);
  wireCodebase(mainEl);
  wireDirectory(mainEl);
  wireRailFrames(mainEl);
  wireIconInventory(mainEl);
  wireDesignSystem(mainEl);
  wireComponentLibrary(mainEl);
  wireModuleControls(mainEl);
  wireLinkValidation(mainEl);
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
    const el = document.getElementById(btn.dataset.jump);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    case 'ii-all': clearInput('#ii-search-input'); click('[data-ii-fam="all"]'); break;
    case 'ds-type': root.querySelector('#ds-typography')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
    case 'ds-colors': root.querySelector('#ds-colors')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
    case 'ds-jump': root.querySelector('#mi-design')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
    case 'dsc-clear': clearInput('#dsc-search'); break;
    case 'code-7': click('[data-code-win="7"]'); break;
    case 'code-30': click('[data-code-win="30"]'); break;
    case 'code-all': click('[data-code-win="all"]'); break;
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

  /* Demo switches (brand toggle, admin popover switch) flip on click so their
     on/off states can be inspected live. Purely local — no persistence. */
  root.querySelectorAll('[data-demo-switch]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-checked') === 'true';
      btn.setAttribute('aria-checked', on ? 'false' : 'true');
    });
  });
}

/* WISEcodeAI dock config for this page — a light welcome that points at the four
   modules and can jump to any of them. */
export const ALL_MODULES_WISEAI = {
  sub: 'Your app’s codebase stats, module map, icon inventory, design system and component library.',
  chipsFlow: 'wrap',
  intents: [
    { intent: 'codebase', label: 'How big is the codebase?', icon: 'code' },
    { intent: 'directory', label: 'Jump to the Module Directory', icon: 'apps' },
    { intent: 'icons', label: 'Jump to the Icon Inventory', icon: 'emoji_symbols' },
    { intent: 'design', label: 'Jump to the Design System', icon: 'palette' },
    { intent: 'components', label: 'Jump to the Component Library', icon: 'widgets' },
    { intent: 'counts', label: 'How many icons are there?', icon: 'tag' },
  ],
  intentReplies: {
    codebase: `The app is <strong>${fmtNum(CODE_STATS?.now?.total)} lines of code</strong> across <strong>${fmtNum(CODE_STATS?.now?.files)} files</strong> — ${fmtNum(CODE_STATS?.now?.html)} HTML, ${fmtNum(CODE_STATS?.now?.js)} JavaScript, ${fmtNum(CODE_STATS?.now?.css)} CSS and ${fmtNum(CODE_STATS?.now?.py)} Python — shipping <strong>${fmtNum(CODE_STATS?.now?.pages)} HTML pages</strong>. The Codebase score cards above the directory show the up/down trend.`,
    directory: 'The <strong>Module Directory</strong> lists every workspace, account, chat, report, product, auth and marketing screen in the app.',
    icons: 'The <strong>Icon Inventory</strong> catalogs every Material Symbols glyph used anywhere, with its variant, usage count, label, and exact placements.',
    design: 'The <strong>Design System</strong> documents the app’s fonts (families, sizes, usage) and every color, line, elevation and radius token — with live swatches that follow the current theme.',
    components: 'The <strong>Component Library</strong> renders every reusable component in its default state with its real classes, its variations, and the surfaces where it’s used.',
    counts: `There are <strong>${ICON_INVENTORY?.totalUniqueIcons || 0} unique icons</strong> across <strong>${ICON_INVENTORY?.totalUses || 0} placements</strong> in the app.`,
  },
  onIntent: (intent) => {
    /* "How big is the codebase?" is a question, not just a jump — scroll the
       score cards into view AND let the sizing answer post in the thread. */
    if (intent === 'codebase') {
      document.getElementById('mi-code')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return false;
    }
    const id = intent === 'icons' ? 'mi-icons'
      : intent === 'directory' ? 'mi-directory'
      : intent === 'design' ? 'mi-design'
      : intent === 'components' ? 'mi-components'
      : null;
    if (id) {
      const el = document.getElementById(id);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return true; }
    }
    return false;
  },
};
