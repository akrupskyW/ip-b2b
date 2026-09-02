import { applyMinimalUi } from './topbar.js';
import { initLirTooltip } from './lir-tooltip.js';
import { parkNavHistory, refreshNavHistory } from './nav-history.js';
import { isNavHamburgerActive } from './nav-hamburger.js';
import { isNavModulesOn, applyNavModules, syncNavModulesChrome } from './nav-modules.js';
/* Side-effect: overlay the streaming helix on assembling boards. No Appearance
   toggle — the overlay boots on every page that renders the WISE nav. */
import './load-anim.js';

/* Give every page that renders the WISE nav the shared floating tooltip. This
   covers the per-module header controls uniformly — the three-dot "More
   options" menu, the width changer, move-side — on the WISEcodeAI chat,
   result panes and all agent modules, without each page wiring it up. The
   X / close control is excluded (the glyph is enough). It is
   idempotent (guards on window.__lirTooltipReady) and uses document-level
   delegation, so it also covers modules rendered after load. */
(function bootLirTooltip() {
  try {
    if (typeof document === 'undefined') return;
    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', initLirTooltip);
    else initLirTooltip();
  } catch (_) {}
})();

/* Load the module/pane drag-resize behaviour on every page that renders the WISE
   nav (i.e. every page with a #modules-row). Injected here — rather than via a
   per-page <script> tag — so it loads uniformly and survives HTML edits. The
   loaded file self-guards and is a no-op on pages without a #modules-row. */
/* Load the canonical pane-width spec (js/pane-width.js) FIRST — it defines the
   universal five-tier model (single · double · triple · fill · custom) shared
   by every module's width control and injects the `.panel-fill` "take the rest
   of the row" CSS plus the custom carousel rail. Loaded before pane-resize so
   the resize splitter sees the fill classes and the fill CSS is present the
   moment any pane opens. */
(function loadPaneWidth() {
  try {
    if (typeof document === 'undefined' || window.__wisePaneWidthLoaded) return;
    window.__wisePaneWidthLoaded = true;
    var s = document.createElement('script');
    s.src = new URL('./pane-width.js', import.meta.url).href;
    s.defer = true;
    (document.head || document.documentElement).appendChild(s);
  } catch (_) {}
})();

(function loadPaneResize() {
  try {
    if (typeof document === 'undefined' || window.__wisePaneResizeLoaded) return;
    window.__wisePaneResizeLoaded = true;
    var s = document.createElement('script');
    s.src = new URL('./pane-resize.js', import.meta.url).href;
    s.defer = true;
    (document.head || document.documentElement).appendChild(s);
  } catch (_) {}
})();

/* Load the "right-of-chat modules fill by default" behaviour (js/default-fill.js)
   on every page that renders the WISE nav. It drives each right-of-chat module's
   own width control to the fourth tier — "Fill the Screen" — so any module that
   opens to the right of the Chat module starts filled. Loaded after pane-width so
   the fill tier + its CSS exist; self-guards and is a no-op where there is no
   chat with modules to its right. */
(function loadDefaultFill() {
  try {
    if (typeof document === 'undefined' || window.__wiseDefaultFillLoaded) return;
    window.__wiseDefaultFillLoaded = true;
    var s = document.createElement('script');
    s.src = new URL('./default-fill.js', import.meta.url).href;
    s.defer = true;
    (document.head || document.documentElement).appendChild(s);
  } catch (_) {}
})();

/* Load the popover layer on every page that renders the WISE nav — it lifts any
   open module/menu popover to a fixed layer so it escapes the carded modules'
   overflow clipping and always sits on top of everything (see popover-layer.js).
   Injected here so it loads uniformly across the app and survives HTML edits;
   the loaded file self-guards and is a no-op on pages with no popovers. */
(function loadPopoverLayer() {
  try {
    if (typeof document === 'undefined' || window.__wisePopoverLayerLoaded) return;
    window.__wisePopoverLayerLoaded = true;
    var s = document.createElement('script');
    s.src = new URL('./popover-layer.js', import.meta.url).href;
    s.defer = true;
    (document.head || document.documentElement).appendChild(s);
  } catch (_) {}
})();

/* Load hover-to-open for every three-dot menu (js/kebab-hover.js). A ⋮ that
   owns a popover opens that popover on hover — never waits for a tap.
   Injected here so it covers every page with the WISE nav; the file
   self-guards and uses document-level delegation. */
(function loadKebabHover() {
  try {
    if (typeof document === 'undefined' || window.__wiseKebabHoverLoaded) return;
    window.__wiseKebabHoverLoaded = true;
    var s = document.createElement('script');
    s.src = new URL('./kebab-hover.js', import.meta.url).href;
    s.defer = true;
    (document.head || document.documentElement).appendChild(s);
  } catch (_) {}
})();

/* Load the data-chip explainer tooltip (js/chip-tooltip.js) on every page that
   renders the WISE nav. It gives every Shield / GRAS status chip an instant
   hover tooltip explaining what the chip means, with the same thumbs up/down +
   intent-chip + free-form feedback affordance used on WISEcodeAI answers, right
   below the explanation in the same card. Injected here so it loads uniformly
   across the app and survives HTML edits; the loaded file self-guards and uses
   document-level delegation, so chips rendered after load are covered too. */
(function loadChipTooltip() {
  try {
    if (typeof document === 'undefined' || window.__wiseChipTooltipLoaded) return;
    window.__wiseChipTooltipLoaded = true;
    var s = document.createElement('script');
    s.src = new URL('./chip-tooltip.js', import.meta.url).href;
    s.defer = true;
    (document.head || document.documentElement).appendChild(s);
  } catch (_) {}
})();

/* Load the WISEowl first-login / first-screen walkthrough on every page that
   renders the WISE nav. Self-guards; a no-op until the shell is in the DOM.
   Replay from Help or Preferences via window.WiseWalkthrough.open(). */
(function loadOwlWalkthrough() {
  try {
    if (typeof document === 'undefined' || window.__wiseOwlWalkthroughLoaded) return;
    window.__wiseOwlWalkthroughLoaded = true;
    var s = document.createElement('script');
    s.src = new URL('./owl-walkthrough.js', import.meta.url).href;
    s.defer = true;
    (document.head || document.documentElement).appendChild(s);
  } catch (_) {}
})();

/* All Modules “Used in” → live page + pink glow (js/comp-highlight.js).
   Self-guards; a no-op unless the tab was opened with ?wise-hl=. */
(function loadCompHighlight() {
  try {
    if (typeof document === 'undefined' || window.__wiseCompHighlightLoaded) return;
    window.__wiseCompHighlightLoaded = true;
    var s = document.createElement('script');
    s.src = new URL('./comp-highlight.js', import.meta.url).href;
    s.defer = true;
    (document.head || document.documentElement).appendChild(s);
  } catch (_) {}
})();

/**
 * Single source of truth for the agent hierarchy and product navigation.
 *
 * Product nav (WISEcode AI / Studio / Portfolio) wraps the agent tree. All agents
 * live under WISEcode AI; Studio and Portfolio link to the enterprise workspace.
 *
 * Each agent record:
 *   id          — used for hash slugs and for matching the active page
 *   slug        — relative file inside `pages/` (top-level agents only)
 *   label       — display name in the menu
 *   icon        — Material Icons glyph
 *   parent      — id of the parent (or null for top-level)
 *   description — one-liner shown on the overview page
 *   children    — child agent ids in display order
 */
export const AGENTS = {
  'portfolio-agent': {
    id: 'portfolio-agent',
    slug: 'portfolio-agent.html',
    label: 'Portfolio Agent',
    icon: 'business_center',
    parent: null,
    description:
      "Manages the brand's truth. Orchestrates data, identity, eligibility, verification, and recipes.",
    children: [
      'data-ingestion-agent',
      'brand-profile-agent',
      'food-discovery-agent',
      'verification-lifecycle-agent',
      'recipe-builder-agent',
    ],
  },
  'data-ingestion-agent': {
    id: 'data-ingestion-agent',
    label: 'Data Ingestion Agent',
    icon: 'cloud_upload',
    parent: 'portfolio-agent',
    description:
      'Multi-source product data acquisition from files, URLs, ERP exports, and images.',
    children: ['ingredient-parsing-agent'],
  },
  'ingredient-parsing-agent': {
    id: 'ingredient-parsing-agent',
    label: 'Ingredient Parsing Agent',
    icon: 'science',
    parent: 'data-ingestion-agent',
    description:
      'Specialized ingredient extraction, normalization, and reconciliation.',
    children: [],
  },
  'brand-profile-agent': {
    id: 'brand-profile-agent',
    label: 'Brand Profile Agent',
    icon: 'badge',
    parent: 'portfolio-agent',
    description:
      'B2B and B2C identity management. Discovery Tags. Ecosystem presence.',
    children: [],
  },
  'food-discovery-agent': {
    id: 'food-discovery-agent',
    label: 'Food Discovery Agent',
    icon: 'travel_explore',
    parent: 'portfolio-agent',
    description:
      'Free search across the public food registry. Filter and exploration.',
    children: [],
  },
  'verification-lifecycle-agent': {
    id: 'verification-lifecycle-agent',
    label: 'Verification Lifecycle Agent',
    icon: 'verified',
    parent: 'portfolio-agent',
    description:
      'Pre-qualification, attestation, payment, asset unlock, annual renewal.',
    children: [],
  },
  'recipe-builder-agent': {
    id: 'recipe-builder-agent',
    label: 'Recipe Builder Agent',
    icon: 'restaurant_menu',
    parent: 'portfolio-agent',
    description:
      'Composed dishes, multi-ingredient formulations, live NFP+ calculation.',
    children: [],
  },

  'code-studio-agent': {
    id: 'code-studio-agent',
    slug: 'code-studio-agent.html',
    label: 'Code Studio Agent',
    icon: 'terminal',
    parent: null,
    description:
      'Orchestrates the logic layer for proprietary code authoring and publishing.',
    children: ['code-builder-agent'],
  },
  'code-builder-agent': {
    id: 'code-builder-agent',
    label: 'Code Builder Agent',
    icon: 'integration_instructions',
    parent: 'code-studio-agent',
    description:
      'Natural-language-to-deterministic-logic synthesis. Sandbox testing.',
    children: [],
  },

  'analytics-agent': {
    id: 'analytics-agent',
    slug: 'analytics-agent.html',
    label: 'Analytics Agent',
    icon: 'analytics',
    parent: null,
    description:
      'Conversational analytics across portfolio and the public registry.',
    children: ['analytical-search-agent'],
  },
  'analytical-search-agent': {
    id: 'analytical-search-agent',
    label: 'Analytical Search Agent',
    icon: 'manage_search',
    parent: 'analytics-agent',
    description:
      'Advanced multi-faceted search with inference and ranking.',
    children: [],
  },

  'audit-reformulation-agent': {
    id: 'audit-reformulation-agent',
    slug: 'audit-reformulation-agent.html',
    label: 'Audit & Reformulation Agent',
    icon: 'fact_check',
    parent: null,
    description:
      "What's Next optimization, impact simulation, formulation alternatives.",
    children: [],
  },

  'marketing-agent': {
    id: 'marketing-agent',
    slug: 'marketing-agent.html',
    label: 'Marketing Agent',
    icon: 'campaign',
    parent: null,
    description:
      'Brand-ready deliverable generation for retail, social, and presentation.',
    children: [],
  },

  'trends-agent': {
    id: 'trends-agent',
    slug: 'trends-agent.html',
    label: 'Trends Agent',
    icon: 'trending_up',
    parent: null,
    description:
      'Hot Topic Intelligence. Category signals. Contextual market shifts.',
    children: [],
  },

  'brand-engagement-agent': {
    id: 'brand-engagement-agent',
    slug: 'brand-engagement-agent.html',
    label: 'Brand Engagement Agent',
    icon: 'handshake',
    parent: null,
    description:
      'Calls for Innovation, partner matching, intros, deal flow. Paid V2+.',
    children: [],
  },
};

/** Top-level agents, in display order (nested under WISEcode AI in the menu). */
export const TOP_LEVEL_AGENT_IDS = [
  'portfolio-agent',
  'code-studio-agent',
  'analytics-agent',
  'audit-reformulation-agent',
  'marketing-agent',
  'trends-agent',
  'brand-engagement-agent',
];

/**
 * WISEcode Portfolio sub-navigation — the "Truth Layer" structure.
 *
 * These are not agents; they are the navigable surfaces (Missions / views)
 * inside the Portfolio module. Each maps to a section in `pages/portfolio.html`
 * via a `#<id>` hash anchor.
 *
 *   id     — hash slug + active-state key
 *   label  — display name in the menu and module header
 *   icon   — Material Icons glyph
 *   sub    — short module-header subtitle
 *   tagline— one-liner shown on the section's hero
 */
export const PORTFOLIO_SECTIONS = {
  ledger: {
    id: 'ledger',
    label: 'My Foods Portfolio',
    icon: 'inventory_2',
    sub: 'Your portfolio · Full list',
    tagline:
      'The high-fidelity list view of every food you own. Filter, sort, and bulk-manage your entire portfolio.',
  },
  discovered: {
    id: 'discovered',
    label: 'Discovered Foods',
    icon: 'travel_explore',
    sub: 'Public registry · Discovery',
    tagline:
      'Foods discovered across the public WISEcode registry — explore, compare, and pull matches into your portfolio.',
  },
  reports: {
    id: 'reports',
    label: 'Portfolio Reports',
    icon: 'summarize',
    sub: 'Reports & exports',
    tagline:
      'Standardized portfolio reports across UPF, GRAS, and WISEcode insights — at the brand and UPC level.',
    children: [
      'report-brand-upf',
      'report-brand-gras',
      'report-upc-upf',
      'report-upc-gras',
      'report-brand-insights',
    ],
  },
  'report-brand-upf': {
    id: 'report-brand-upf',
    label: 'Brand UPF Report',
    icon: 'description',
    parent: 'reports',
    sub: 'Report · Brand level',
    tagline: 'Ultra-processed food exposure across your brand.',
  },
  'report-brand-gras': {
    id: 'report-brand-gras',
    label: 'Brand GRAS Report',
    icon: 'description',
    parent: 'reports',
    sub: 'Report · Brand level',
    tagline: 'Generally Recognized As Safe (GRAS) status across your brand.',
  },
  'report-upc-upf': {
    id: 'report-upc-upf',
    label: 'UPC UPF Report',
    icon: 'description',
    parent: 'reports',
    sub: 'Report · UPC level',
    tagline: 'Ultra-processed food exposure at the individual UPC level.',
  },
  'report-upc-gras': {
    id: 'report-upc-gras',
    label: 'UPC GRAS Report',
    icon: 'description',
    parent: 'reports',
    sub: 'Report · UPC level',
    tagline: 'Generally Recognized As Safe (GRAS) status at the UPC level.',
  },
  'report-brand-insights': {
    id: 'report-brand-insights',
    label: 'Brand WISEcode Insights Report',
    icon: 'insights',
    parent: 'reports',
    sub: 'Report · Brand level',
    tagline: 'WISEcode intelligence and signals across your brand.',
  },
  vault: {
    id: 'vault',
    label: 'Assets',
    icon: 'folder_special',
    sub: 'Trust assets',
    tagline:
      'Your living library of Verified Shields, retail sheets, and social assets — organized by standard.',
  },
};

/** Every navigable Portfolio surface, in display order — drives module +
 *  rail building in portfolio-module.js. Report children are full modules
 *  that nest under "Portfolio Reports" in the menu. */
export const PORTFOLIO_SECTION_IDS = [
  'ledger',
  'discovered',
  'reports',
  'report-brand-upf',
  'report-brand-gras',
  'report-upc-upf',
  'report-upc-gras',
  'report-brand-insights',
  'vault',
];

/** Top-level Portfolio sections shown directly in the menu (reports expands
 *  to reveal its children). */
export const PORTFOLIO_TOP_SECTION_IDS = [
  'ledger',
  'discovered',
  'reports',
  'vault',
];

/** Platform products shown above the agent tree. */
export const NAV_PRODUCTS = {
  dashboard: {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    slug: 'overview.html',
  },
  'wisecode-ai': {
    id: 'wisecode-ai',
    label: 'WISEcode AI',
    icon: 'hub',
    slug: 'ai-chat.html',
  },
  'wisecode-studio': {
    id: 'wisecode-studio',
    label: 'WISEcode Studio',
    icon: 'design_services',
    locked: true,
  },
  'wisecode-portfolio': {
    id: 'wisecode-portfolio',
    label: 'WISEcode Portfolio',
    icon: 'inventory_2',
    slug: 'portfolio.html',
    sections: PORTFOLIO_TOP_SECTION_IDS,
  },
};

export function getPortfolioSection(id) {
  return PORTFOLIO_SECTIONS[id] || null;
}

/** Look up a node in the sectioned workspace nav (WISE_APP_NAV) by id —
 *  matches top-level items, expandable groups, their children, and the upgrade
 *  card. Used by shells to derive a page's title/icon from its `data-nav-id`. */
export function getAppNavNode(id) {
  if (!id) return null;
  for (const node of WISE_APP_NAV) {
    if ((node.type === 'item' || node.type === 'group' || node.type === 'upgrade') && node.id === id) {
      return node;
    }
    if (node.type === 'group') {
      const child = (node.children || []).find((c) => c.id === id);
      if (child) return { ...child, parent: node.id };
    }
  }
  /* Account/organization/support surfaces live only in the user-name popover,
     but pages still resolve their header title + icon from here. */
  const acct = WISE_ACCOUNT_NAV.find((n) => n.id === id);
  if (acct) return acct;
  return null;
}

export const TOP_LEVEL_PRODUCT_IDS = [
  'dashboard',
  'wisecode-portfolio',
  'wisecode-studio',
  'wisecode-ai',
];

/**
 * WISE workspace navigation model — the sectioned dashboard nav.
 *
 * This is the information architecture (Overview / Portfolio / Studio /
 * Organization / Admin). It is rendered by `mountAgentMenu` only when the
 * caller opts in with `{ appNav: true }`, so the legacy product/agent nav on
 * every other page keeps working untouched until those pages migrate.
 *
 * Node shapes:
 *   { type: 'section', label }            — a muted uppercase group heading
 *   { type: 'item',    id, label, icon, slug }
 *   { type: 'group',   id, label, icon, defaultOpen?, children:[{id,label,icon,slug}] }
 *   { type: 'upgrade', id, title, sub, icon, slug }  — the highlighted CTA card
 *
 * Every glyph is a Material Symbol (the modern set is force-loaded via
 * ensureSymbolsFont) so nothing renders as a tofu box.
 */
export const WISE_APP_NAV = [
  { type: 'item', id: 'overview', label: 'Overview', icon: 'space_dashboard', slug: 'overview.html' },

  { type: 'section', label: 'Portfolio' },
  { type: 'item', id: 'product-portfolio', label: 'Product Portfolio', icon: 'handyman', slug: 'product-portfolio.html' },
  { type: 'item', id: 'comparison', label: 'Comparison', icon: 'compare', slug: 'product-comparison.html' },
  { type: 'item', id: 'non-upf-dashboard', label: 'NON-UPF Dashboard', icon: 'dashboard', slug: 'non-upf-dashboard.html' },
  { type: 'item', id: 'ai-dashboard', label: 'AI Dashboard', icon: 'hub', slug: 'ai-dashboard.html' },

  { type: 'section', label: 'Studio' },
  {
    type: 'group',
    id: 'wiseai',
    label: 'WISEcodeAI',
    icon: 'auto_awesome',
    defaultOpen: true,
    children: [
      { id: 'wiseai-chat', label: 'Chat', icon: 'forum', slug: 'wiseai.html' },
      { id: 'library', label: 'Library', icon: 'auto_stories', slug: 'conversation-library.html' },
      { id: 'ingredients', label: 'Ingredient Browser', icon: 'science', slug: 'ingredient-browser.html' },
    ],
  },
  { type: 'item', id: 'reports', label: 'Reports', icon: 'description', slug: 'reports.html' },
  { type: 'item', id: 'reformulation', label: 'Reformulation', icon: 'auto_fix_high', slug: 'reformulation.html', locked: true },

  { type: 'section', label: 'Organization' },
  { type: 'item', id: 'profile', label: 'Profile', icon: 'account_circle', slug: 'profile.html' },
  { type: 'item', id: 'team', label: 'Team', icon: 'group', slug: 'teams.html' },
  { type: 'item', id: 'invoices', label: 'Invoices & Downloads', icon: 'receipt_long', slug: 'invoices.html' },

  { type: 'section', label: 'Admin' },
  { type: 'item', id: 'marketing-assets', label: 'Marketing Assets', icon: 'photo_library', slug: 'marketing-assets.html' },
  {
    type: 'group',
    id: 'wisecode-admin',
    label: 'WISEcode Admin',
    icon: 'shield',
    defaultOpen: false,
    children: [
      { id: 'organizations', label: 'Organizations', icon: 'apartment', slug: 'organizations.html' },
      { id: 'quick-invite', label: 'Quick Invite', icon: 'bolt', slug: 'quick-invite.html' },
      { id: 'user-management', label: 'User Management', icon: 'group', slug: 'user-management.html' },
      { id: 'audit-queue', label: 'Audit Queue', icon: 'shield', slug: 'audit-queue.html' },
      { id: 'admin-utils', label: 'Admin Utils', icon: 'build', slug: 'admin-utils.html' },
    ],
  },
  { type: 'upgrade', id: 'studio-ai', title: 'Studio & AI', sub: 'Unlock full access', icon: 'auto_awesome', slug: 'studio-ai.html' },
];

/**
 * Account / organization / support surfaces.
 *
 * These live exclusively in the user-name popover (see renderAvatarBody in
 * agent-overview.js) — they are intentionally NOT rendered in the left nav so
 * they aren't duplicated. Their node data is kept here so shells can still
 * derive a page's title + icon from its `data-nav-id` via getAppNavNode.
 */
export const WISE_ACCOUNT_NAV = [
  { type: 'item', id: 'profile', label: 'My profile', icon: 'account_circle', slug: 'profile.html' },
  { type: 'item', id: 'invoices', label: 'Invoices', icon: 'receipt_long', slug: 'invoices.html' },
  { type: 'item', id: 'agents', label: 'Agents', icon: 'smart_toy', slug: 'agents.html' },
  { type: 'item', id: 'alerts', label: 'Alerts', icon: 'notifications', slug: 'alerts.html' },
  { type: 'item', id: 'preferences', label: 'Preferences', icon: 'tune', slug: 'preferences.html' },
  { type: 'item', id: 'api-keys', label: 'API keys', icon: 'key', slug: 'api-keys.html' },
  { type: 'item', id: 'support', label: 'Support', icon: 'support_agent', slug: 'support.html' },
  { type: 'item', id: 'help', label: 'Help', icon: 'help', slug: 'support.html' },
  { type: 'item', id: 'docs', label: 'Docs', icon: 'menu_book', slug: 'docs.html' },
];

/** href for an agent — top-level agents resolve to a real page; child agents
 *  scroll the parent overview to their card via a hash anchor. */
export function hrefForProduct(id, opts = {}) {
  const fromAgentPage = opts.fromAgentPage !== false;
  const product = NAV_PRODUCTS[id];
  if (!product) return '#';
  if (product.slug) {
    const prefix = fromAgentPage ? '' : 'pages/';
    return `${prefix}${product.slug}`;
  }
  const base = fromAgentPage ? '../index.html' : 'index.html';
  return product.hash ? `${base}#/${product.hash}` : base;
}

export function hrefForAgent(id, opts = {}) {
  const fromAgentPage = opts.fromAgentPage === true;
  const node = AGENTS[id];
  if (!node) return '#';
  const prefix = fromAgentPage ? '' : 'pages/';
  if (node.parent === null) {
    return `${prefix}${node.slug}`;
  }
  const top = topLevelAncestor(id);
  const anchor = `#${id}`;
  if (!top) return anchor;
  return `${prefix}${AGENTS[top].slug}${anchor}`;
}

function topLevelAncestor(id) {
  let cur = AGENTS[id];
  while (cur && cur.parent) cur = AGENTS[cur.parent];
  return cur ? cur.id : null;
}

function escAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Product nav labels show TM after the second word (e.g. WISEcode AI™). */
function formatProductNavLabel(label) {
  const parts = String(label).trim().split(/\s+/);
  if (parts.length < 2) return escAttr(label);
  return `${escAttr(parts[0])} ${escAttr(parts[1])}<sup class="tagline-tm">TM</sup>`;
}

/** Workspace (app) nav: WISEcodeAI is a trademarked product name, so it
 *  carries the same small TM the product-nav labels use. Other rows stay
 *  plain. */
function formatAppNavLabel(label) {
  const s = String(label);
  if (s === 'WISEcodeAI' || s === 'WISEcode AI') {
    return `${escAttr(s)}<sup class="tagline-tm">TM</sup>`;
  }
  return escAttr(s);
}

/* The whole app renders icons from the Material Symbols Outlined set, so every
   glyph uses the same CSS class. Kept as a helper (rather than inlining the
   string) so the icon family lives in one place if it ever changes again. */
export function iconClassFor(name) {
  void name;
  return 'material-symbols-outlined';
}

/* Make sure the Material Symbols Outlined webfont is loaded, even on any page
   that somehow didn't link it, so nothing renders as a blank tofu box.
   Idempotent. */
export function ensureSymbolsFont() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('link[data-wise-symbols]')) return;
  if (document.querySelector('link[href*="Material+Symbols+Outlined"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200';
  link.setAttribute('data-wise-symbols', '');
  document.head.appendChild(link);
}

/**
 * Mount the product + agent navigation into a `<nav>` element.
 *
 * @param {HTMLElement} navEl       container element (the existing `nav.menu-nav`)
 * @param {string}      activeId    id of the agent whose page is currently rendered
 * @param {object}      [options]
 * @param {boolean}     [options.fromAgentPage=true]  true when the page lives in /pages/
 * @param {string}      [options.activeProductId]     active product id (defaults to wisecode-ai)
 */
export function mountAgentMenu(navEl, activeId, options = {}) {
  if (!navEl) return;
  ensureSymbolsFont();
  const fromAgentPage = options.fromAgentPage !== false;
  const prefix = fromAgentPage ? '' : 'pages/';

  /* New sectioned workspace nav — opt-in per page. Keeps the legacy product
     nav (below) intact for pages that haven't migrated yet. */
  if (options.appNav) {
    navEl.classList.add('menu-nav-app');
    navEl.setAttribute('aria-label', 'WISE platform navigation');
    try { parkNavHistory(); } catch (_) { /* sidebar not in nav yet */ }
    navEl.innerHTML = renderAppNav(prefix, options.activeNavId || null);
    finalizeMenu(navEl);
    return;
  }

  const activeProduct =
    options.activeProductId || 'wisecode-ai';
  const activeSection = options.activeSectionId || null;
  const activeTop = activeId ? topLevelAncestor(activeId) : null;

  const renderSubitem = (id, depth = 1) => {
    const node = AGENTS[id];
    if (!node) return '';
    const top = topLevelAncestor(id);
    const href = `${prefix}${AGENTS[top].slug}#${id}`;
    const isActive = id === activeId ? ' is-active' : '';
    const indent = (depth - 1) * 14;
    const indentStyle = indent > 0 ? ` style="padding-left:${10 + indent}px;"` : '';
    return `
      <a class="menu-nav-subitem${isActive}" href="${escAttr(href)}" data-agent-id="${escAttr(id)}" data-depth="${depth}"${indentStyle}>
        <span class="menu-nav-subicon"><span class="material-symbols-outlined">${escAttr(node.icon)}</span></span>
        <span class="menu-nav-label">${escAttr(node.label)}</span>
      </a>`;
  };

  const renderTopLevel = (id) => {
    const node = AGENTS[id];
    if (!node) return '';
    const href = `${prefix}${node.slug}`;
    const isOpen = id === activeTop;
    const isActive = id === activeId ? ' is-active' : '';

    if (!node.children || node.children.length === 0) {
      return `
        <a class="menu-nav-item${isActive}" href="${escAttr(href)}" data-agent-id="${escAttr(id)}">
          <span class="menu-nav-icon"><span class="material-symbols-outlined">${escAttr(node.icon)}</span></span>
          <span class="menu-nav-label">${escAttr(node.label)}</span>
        </a>`;
    }

    const childIds = collectDescendantIds(id);
    const childrenHtml = childIds.map(({ id: cid, depth }) => renderSubitem(cid, depth)).join('');

    /* `inert` + `aria-hidden` make the collapsed children non-interactive
       (no hover, no click, no tab focus, no screen-reader read-out) without
       affecting the grid-template-rows expand/collapse animation. */
    const collapsedAttrs = isOpen ? '' : ' inert aria-hidden="true"';

    return `
      <div class="menu-nav-group" data-tier="agent" data-group="${escAttr(id)}" data-open="${isOpen ? 'true' : 'false'}">
        <a class="menu-nav-item menu-nav-toggle${isActive}" href="${escAttr(href)}" data-agent-id="${escAttr(id)}" data-toggle-group="${escAttr(id)}" aria-expanded="${isOpen ? 'true' : 'false'}" aria-controls="menu-nav-${escAttr(id)}">
          <span class="menu-nav-icon"><span class="material-symbols-outlined">${escAttr(node.icon)}</span></span>
          <span class="menu-nav-label">${escAttr(node.label)}</span>
          <button type="button" class="menu-nav-chevron-btn" data-toggle-group="${escAttr(id)}" aria-label="Toggle ${escAttr(node.label)} children">
            <span class="menu-nav-chevron"><span class="material-symbols-outlined">expand_more</span></span>
          </button>
        </a>
        <div class="menu-nav-children" id="menu-nav-${escAttr(id)}" role="region" aria-label="${escAttr(node.label)} agents"${collapsedAttrs}>
          <div class="menu-nav-children-inner menu-nav-tree-inner">
            ${childrenHtml}
          </div>
        </div>
      </div>`;
  };

  const renderSection = (product, sectionId, depth = 1) => {
    const sec = PORTFOLIO_SECTIONS[sectionId];
    if (!sec) return '';
    const href = `${prefix}${product.slug}#${sectionId}`;
    const isActive = sectionId === activeSection ? ' is-active' : '';
    const indent = (depth - 1) * 14;
    const indentStyle = indent > 0 ? ` style="padding-left:${10 + indent}px;"` : '';
    const hasChildren = Array.isArray(sec.children) && sec.children.length > 0;

    if (!hasChildren) {
      return `
        <a class="menu-nav-subitem${isActive}" href="${escAttr(href)}" data-section-id="${escAttr(sectionId)}" data-depth="${depth}"${indentStyle}>
          <span class="menu-nav-subicon"><span class="${iconClassFor(sec.icon)}">${escAttr(sec.icon)}</span></span>
          <span class="menu-nav-label">${escAttr(sec.label)}</span>
        </a>`;
    }

    /* Sections with children (e.g. Portfolio Reports) render as their own
       expandable sub-group — the row links to / toggles the section module,
       while the chevron reveals the child report views beneath it. */
    const isOpen = sectionId === activeSection || sec.children.includes(activeSection);
    const childrenHtml = sec.children.map((cid) => renderSection(product, cid, depth + 1)).join('');
    const collapsedAttrs = isOpen ? '' : ' inert aria-hidden="true"';
    return `
      <div class="menu-nav-group menu-nav-subgroup" data-tier="section" data-group="${escAttr(sectionId)}" data-open="${isOpen ? 'true' : 'false'}">
        <a class="menu-nav-subitem menu-nav-toggle${isActive}" href="${escAttr(href)}" data-section-id="${escAttr(sectionId)}" data-depth="${depth}" data-toggle-group="${escAttr(sectionId)}" aria-expanded="${isOpen ? 'true' : 'false'}" aria-controls="menu-nav-${escAttr(sectionId)}"${indentStyle}>
          <span class="menu-nav-subicon"><span class="${iconClassFor(sec.icon)}">${escAttr(sec.icon)}</span></span>
          <span class="menu-nav-label">${escAttr(sec.label)}</span>
          <button type="button" class="menu-nav-chevron-btn" data-toggle-group="${escAttr(sectionId)}" aria-label="Toggle ${escAttr(sec.label)} reports">
            <span class="menu-nav-chevron"><span class="material-symbols-outlined">expand_more</span></span>
          </button>
        </a>
        <div class="menu-nav-children" id="menu-nav-${escAttr(sectionId)}" role="region" aria-label="${escAttr(sec.label)}"${collapsedAttrs}>
          <div class="menu-nav-children-inner menu-nav-tree-inner">
            ${childrenHtml}
          </div>
        </div>
      </div>`;
  };

  const renderProduct = (productId) => {
    const product = NAV_PRODUCTS[productId];
    if (!product) return '';
    const href = hrefForProduct(productId, { fromAgentPage });
    const isActive = productId === activeProduct ? ' is-active' : '';

    /* Products with section children (WISEcode Portfolio) render as an
       expandable group whose children are module views, mirroring the
       WISEcode AI agent tree but linking to `#section` anchors. */
    if (productId !== 'wisecode-ai' && product.sections && product.sections.length) {
      const isOpen = activeProduct === productId;
      const sectionsHtml = product.sections.map((sid) => renderSection(product, sid)).join('');
      const collapsedAttrs = isOpen ? '' : ' inert aria-hidden="true"';
      return `
        <div class="menu-nav-group menu-nav-product-group" data-tier="product" data-group="${escAttr(productId)}" data-open="${isOpen ? 'true' : 'false'}">
          <a class="menu-nav-item menu-nav-toggle menu-nav-product${isActive}" href="${escAttr(href)}" data-product-id="${escAttr(productId)}" data-toggle-group="${escAttr(productId)}" aria-expanded="${isOpen ? 'true' : 'false'}" aria-controls="menu-nav-${escAttr(productId)}">
            <span class="menu-nav-icon"><span class="material-symbols-outlined">${escAttr(product.icon)}</span></span>
            <span class="menu-nav-label">${formatProductNavLabel(product.label)}</span>
            <button type="button" class="menu-nav-chevron-btn" data-toggle-group="${escAttr(productId)}" aria-label="Toggle ${escAttr(product.label)} sections">
              <span class="menu-nav-chevron"><span class="material-symbols-outlined">expand_more</span></span>
            </button>
          </a>
          <div class="menu-nav-children" id="menu-nav-${escAttr(productId)}" role="region" aria-label="${escAttr(product.label)} sections"${collapsedAttrs}>
            <div class="menu-nav-children-inner menu-nav-tree-inner">
              ${sectionsHtml}
            </div>
          </div>
        </div>`;
    }

    /* Locked products stay visible in the nav but don't link anywhere — they
       render as a non-interactive row with a trailing lock icon. */
    if (product.locked) {
      return `
        <div class="menu-nav-item menu-nav-product menu-nav-locked" data-product-id="${escAttr(productId)}" aria-disabled="true">
          <span class="menu-nav-icon"><span class="material-symbols-outlined">${escAttr(product.icon)}</span></span>
          <span class="menu-nav-label">${formatProductNavLabel(product.label)}</span>
          <span class="menu-nav-lock" aria-hidden="true"><span class="material-symbols-outlined">lock</span></span>
        </div>`;
    }

    /* WISEcode AI renders as a plain product link — its agent tree is no
       longer expandable from the menu, so it stays closed (no children). */
    return `
      <a class="menu-nav-item menu-nav-product${isActive}" href="${escAttr(href)}" data-product-id="${escAttr(productId)}">
        <span class="menu-nav-icon"><span class="material-symbols-outlined">${escAttr(product.icon)}</span></span>
        <span class="menu-nav-label">${formatProductNavLabel(product.label)}</span>
      </a>`;
  };

  navEl.setAttribute('aria-label', 'WISE platform navigation');
  try { parkNavHistory(); } catch (_) { /* sidebar not in nav yet */ }
  navEl.innerHTML = TOP_LEVEL_PRODUCT_IDS.map(renderProduct).join('');

  finalizeMenu(navEl);
}

/* Size History-style tree spines / rounded elbows on primary-nav groups
   (WISEcodeAI, WISEcode Admin, nested folders, History fallback). Mirrors
   layoutProjectTrees in js/chat-history.js: the horizontal runs into the
   child icon, and the last child's L-elbow is where the spine ends. */
export function layoutNavTrees(navRoot) {
  const nav = navRoot
    || document.getElementById('agent-menu-nav')
    || document.querySelector('#menu-panel .menu-nav');
  if (!nav) return;
  const panel = document.getElementById('menu-panel');
  if (panel && (panel.classList.contains('mp-rail')
      || panel.classList.contains('mp-pivot')
      || panel.classList.contains('minimal-ui'))) return;

  nav.querySelectorAll('.menu-nav-tree-inner').forEach((inner) => {
    const group = inner.closest('.menu-nav-group');
    if (!group || group.dataset.open !== 'true') return;
    const toggle = group.querySelector(':scope > .menu-nav-toggle');
    const icon = toggle && (toggle.querySelector('.menu-nav-icon') || toggle.querySelector('.menu-nav-subicon'));
    if (!icon) return;
    const innerRect = inner.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();
    if (!innerRect.height || !iconRect.height) return;

    const spineX = iconRect.left + iconRect.width / 2;
    const lift = Math.max(2, Math.round(innerRect.top - iconRect.bottom));
    inner.style.setProperty('--nav-spine-left', Math.round(spineX - innerRect.left) + 'px');
    inner.style.setProperty('--nav-spine-lift', lift + 'px');

    const kids = inner.children;
    for (let i = 0; i < kids.length; i++) {
      const el = kids[i];
      const row = el.classList.contains('menu-nav-group')
        ? (el.querySelector(':scope > .menu-nav-toggle') || el)
        : el;
      const target = row.querySelector('.menu-nav-subicon')
        || row.querySelector('.menu-nav-icon')
        || row.querySelector('.material-symbols-outlined');
      if (!target) continue;
      const rowRect = row.getBoundingClientRect();
      const tRect = target.getBoundingClientRect();
      if (!rowRect.height || !tRect.height) continue;
      const y = tRect.top + tRect.height / 2 - rowRect.top;
      /* Outlined glyphs have no fill to mask a stroke, so stop a couple of
         pixels into the icon instead of running through it. */
      const w = tRect.left + 3 - spineX;
      const left = spineX - rowRect.left;
      if (y > 4) row.style.setProperty('--nav-elbow-h', Math.round(y) + 'px');
      if (w > 8) row.style.setProperty('--nav-elbow-w', Math.round(w) + 'px');
      row.style.setProperty('--nav-elbow-left', Math.round(left) + 'px');
    }

    const last = inner.lastElementChild;
    if (!last) return;
    const lastRow = last.classList.contains('menu-nav-group')
      ? (last.querySelector(':scope > .menu-nav-toggle') || last)
      : last;
    let elbow = parseFloat(getComputedStyle(lastRow).getPropertyValue('--nav-elbow-h'));
    if (!elbow) elbow = Math.max(1, Math.round(lastRow.offsetHeight / 2));
    inner.style.setProperty('--nav-tree-end', (last.offsetTop + elbow) + 'px');
  });
}

function scheduleNavTrees(navEl) {
  layoutNavTrees(navEl);
  requestAnimationFrame(() => layoutNavTrees(navEl));
  setTimeout(() => layoutNavTrees(navEl), 240);
}

/* Wire the rail-collapse + pivot behaviours and the expand/collapse toggle
   delegation. Shared by both the legacy product nav and the sectioned app
   nav so a group opens/closes identically in either. */
function finalizeMenu(navEl) {
  setupMenuRail(navEl);
  setupMenuPivot(navEl);
  try { refreshNavHistory(); } catch (_) { /* nav-history is optional on first paint */ }
  try { syncNavModulesChrome(); } catch (_) { /* nav-modules is optional on first paint */ }
  scheduleNavTrees(navEl);

  navEl.addEventListener('click', (e) => {
    const chevron = e.target.closest('[class~="menu-nav-chevron-btn"]');
    /* Rows flagged `data-toggle-only` (e.g. the WISEcode Admin header) expand
       their group when the row itself — not just the chevron — is clicked. */
    const rowToggle = !chevron && e.target.closest('.menu-nav-toggle[data-toggle-only]');
    const trigger = chevron || rowToggle;
    if (!trigger) return;
    e.preventDefault();
    e.stopPropagation();
    const groupId = trigger.dataset.toggleGroup;
    const group = navEl.querySelector(`.menu-nav-group[data-group="${groupId}"]`);
    if (!group) return;
    const willOpen = group.dataset.open !== 'true';
    group.dataset.open = willOpen ? 'true' : 'false';
    const toggleEl = group.querySelector('.menu-nav-toggle');
    if (toggleEl) toggleEl.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    const childrenEl = group.querySelector('.menu-nav-children');
    if (childrenEl) {
      if (willOpen) {
        childrenEl.removeAttribute('inert');
        childrenEl.removeAttribute('aria-hidden');
      } else {
        childrenEl.setAttribute('inert', '');
        childrenEl.setAttribute('aria-hidden', 'true');
      }
    }
    if (willOpen) {
      scheduleNavTrees(navEl);
      if (groupId === 'nav-history') {
        try { document.dispatchEvent(new CustomEvent('wise:nav-history-open')); } catch (_) {}
      }
    }
  });
}

/* ====================================================================
   Sectioned workspace nav renderers (driven by WISE_APP_NAV).
==================================================================== */

/* Pages that actually exist under `pages/`. Any workspace-nav row whose slug
   is NOT in this set is rendered LOCKED — a muted, non-interactive row with a
   trailing lock glyph — so it stays inactive until the page ships. When you add
   a real page under `pages/`, add its file name here to unlock its nav row. */
const EXISTING_PAGES = new Set([
  'overview.html',
  'product-portfolio.html',
  'product-comparison.html',
  'marketing-assets.html',
  'reports.html',
  'reformulation.html',
  'wiseai.html',
  'conversation-library.html',
  'ingredient-browser.html',
  'ai-chat.html',
  'ai-chat-2.html',
  'verification.html',
  'gras-verification.html',
  'analytics-types.html',
  'accessibility-review.html',
  'app-vision-deck.html',
  'login.html',
  'forgot-password.html',
  'profile.html',
  'invoices.html',
  'preferences.html',
  'api-keys.html',
  'support.html',
  'docs.html',
  'agents.html',
  'alerts.html',
  'studio-ai.html',
  'organizations.html',
  'quick-invite.html',
  'user-management.html',
  'teams.html',
  'non-upf-dashboard.html',
  'ai-dashboard.html',
  'audit-queue.html',
  'admin-utils.html',
  'all-modules.html',
  'helix.html',
]);

/** True when a nav slug maps to a page that exists under `pages/`. Slugless
    nodes (pure toggle groups) are treated as present so they stay usable. */
function pageExists(slug) {
  if (!slug) return true;
  const file = String(slug).split(/[#?]/)[0].replace(/^.*\//, '');
  return EXISTING_PAGES.has(file);
}

/** Locked workspace-nav row — visible but inert, with a trailing lock glyph.
    Used for any nav item/subitem whose target page hasn't been built yet. */
function renderAppLocked(node, rowClass) {
  const iconWrapCls = rowClass === 'menu-nav-subitem' ? 'menu-nav-subicon' : 'menu-nav-icon';
  return `
    <div class="${rowClass} menu-nav-locked" data-nav-id="${escAttr(node.id)}" aria-disabled="true" title="Coming soon">
      <span class="${iconWrapCls}"><span class="${iconClassFor(node.icon)}">${escAttr(node.icon)}</span></span>
      <span class="menu-nav-label">${formatAppNavLabel(node.label)}</span>
      <span class="menu-nav-lock" aria-hidden="true"><span class="material-symbols-outlined">lock</span></span>
    </div>`;
}

function renderAppNav(prefix, activeId) {
  return WISE_APP_NAV.map((node) => {
    switch (node.type) {
      case 'section':
        return `<div class="menu-nav-section" data-nav-section="${escAttr(String(node.label || '').toLowerCase())}">${escAttr(node.label)}</div>`;
      case 'group':
        return renderAppGroup(prefix, node, activeId);
      case 'upgrade':
        return renderAppUpgrade(prefix, node);
      case 'item':
      default:
        return renderAppItem(prefix, node, activeId);
    }
  }).join('');
}

function renderAppItem(prefix, node, activeId) {
  if (node.locked || !pageExists(node.slug)) return renderAppLocked(node, 'menu-nav-item');
  const href = node.slug ? `${prefix}${node.slug}` : '#';
  const isActive = node.id === activeId ? ' is-active' : '';
  return `
    <a class="menu-nav-item${isActive}" href="${escAttr(href)}" data-nav-id="${escAttr(node.id)}">
      <span class="menu-nav-icon"><span class="${iconClassFor(node.icon)}">${escAttr(node.icon)}</span></span>
      <span class="menu-nav-label">${formatAppNavLabel(node.label)}</span>
    </a>`;
}

function renderAppSubitem(prefix, node, activeId) {
  if (node.locked || !pageExists(node.slug)) return renderAppLocked(node, 'menu-nav-subitem');
  const href = node.slug ? `${prefix}${node.slug}` : '#';
  const isActive = node.id === activeId ? ' is-active' : '';
  return `
    <a class="menu-nav-subitem${isActive}" href="${escAttr(href)}" data-nav-id="${escAttr(node.id)}" data-depth="1">
      <span class="menu-nav-subicon"><span class="${iconClassFor(node.icon)}">${escAttr(node.icon)}</span></span>
      <span class="menu-nav-label">${formatAppNavLabel(node.label)}</span>
    </a>`;
}

function renderAppGroup(prefix, node, activeId) {
  const children = node.children || [];
  const childActive = children.some((c) => c.id === activeId);
  const isOpen = node.defaultOpen === true || childActive;
  const isActive = node.id === activeId ? ' is-active' : '';
  const childrenHtml = children.map((c) => renderAppSubitem(prefix, c, activeId)).join('');
  const collapsedAttrs = isOpen ? '' : ' inert aria-hidden="true"';
  return `
    <div class="menu-nav-group" data-tier="admin" data-group="${escAttr(node.id)}" data-open="${isOpen ? 'true' : 'false'}">
      <a class="menu-nav-item menu-nav-toggle${isActive}" href="#" data-nav-id="${escAttr(node.id)}" data-toggle-group="${escAttr(node.id)}" data-toggle-only="true" role="button" aria-expanded="${isOpen ? 'true' : 'false'}" aria-controls="menu-nav-${escAttr(node.id)}">
        <span class="menu-nav-icon"><span class="${iconClassFor(node.icon)}">${escAttr(node.icon)}</span></span>
        <span class="menu-nav-label">${formatAppNavLabel(node.label)}</span>
        <button type="button" class="menu-nav-chevron-btn" data-toggle-group="${escAttr(node.id)}" aria-label="Toggle ${escAttr(node.label)}">
          <span class="menu-nav-chevron"><span class="material-symbols-outlined">expand_more</span></span>
        </button>
      </a>
      <div class="menu-nav-children" id="menu-nav-${escAttr(node.id)}" role="region" aria-label="${escAttr(node.label)}"${collapsedAttrs}>
        <div class="menu-nav-children-inner menu-nav-tree-inner">
          ${childrenHtml}
        </div>
      </div>
    </div>`;
}

/* Twinkling sparkle mark for the upgrade card — three inline star paths so
   each one can animate on its own delay (a font glyph can't twinkle). Colored
   via `currentColor` so the card controls the hue. */
const UPGRADE_STARS_SVG = `
      <svg class="menu-nav-upgrade-stars" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path class="menu-nav-upgrade-star menu-nav-upgrade-star--1" d="M10 5.5 Q10 12 16.5 12 Q10 12 10 18.5 Q10 12 3.5 12 Q10 12 10 5.5 Z"/>
        <path class="menu-nav-upgrade-star menu-nav-upgrade-star--2" d="M17.5 6 Q17.5 9 20.5 9 Q17.5 9 17.5 12 Q17.5 9 14.5 9 Q17.5 9 17.5 6 Z"/>
        <path class="menu-nav-upgrade-star menu-nav-upgrade-star--3" d="M16.5 15.5 Q16.5 18 19 18 Q16.5 18 16.5 20.5 Q16.5 18 14 18 Q16.5 18 16.5 15.5 Z"/>
      </svg>`;

function renderAppUpgrade(prefix, node) {
  const locked = node.locked || !pageExists(node.slug);
  const inner = `
      <span class="menu-nav-upgrade-icon">${UPGRADE_STARS_SVG}</span>
      <span class="menu-nav-upgrade-text">
        <span class="menu-nav-upgrade-title">${escAttr(node.title)}</span>
        <span class="menu-nav-upgrade-sub">${escAttr(node.sub)}</span>
      </span>`;
  if (locked) {
    return `
    <div class="menu-nav-upgrade menu-nav-locked" data-nav-id="${escAttr(node.id)}" aria-disabled="true" title="Coming soon">
      ${inner}
      <span class="menu-nav-lock" aria-hidden="true"><span class="material-symbols-outlined">lock</span></span>
    </div>`;
  }
  const href = node.slug ? `${prefix}${node.slug}` : '#';
  return `
    <a class="menu-nav-upgrade" href="${escAttr(href)}" data-nav-id="${escAttr(node.id)}">
      ${inner}
    </a>`;
}

/* ====================================================================
   Menu-rail collapse.

   Injects a collapse toggle into the menu brand strip (to the right of the
   logo). Toggling adds `.mp-rail` to `#menu-panel`, which shrinks the panel
   panel to an icon-only rail (labels, titles, chevrons hidden). Hovering
   a collapsed icon surfaces its label in a floating tooltip pinned to the
   right of the row — mirroring the top-bar icon tooltips. The collapsed
   preference persists in localStorage so it carries across pages.
==================================================================== */
const MENU_RAIL_STORE_KEY = 'wise-menu-rail';

function setupMenuRail(navEl) {
  const panel = navEl.closest('#menu-panel');
  if (!panel) return;
  const brand = panel.querySelector('.menu-brand-bar');
  if (!brand) return;

  brand.querySelector('.menu-rail-toggle')?.remove();

  const btn = document.getElementById('topbar-menu-toggle');
  if (!btn) return;

  const applyHamburgerSkin = () => {
    if (isNavModulesOn()) return;
    if (!isNavHamburgerActive()) return;
    if (panel.classList.contains('minimal-ui') || panel.classList.contains('mp-pivot')) return;
    if (!panel.classList.contains('mp-rail')) return;
    const icon = btn.querySelector('.material-symbols-outlined');
    const label = 'Open navigation';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    if (icon) icon.textContent = 'dock_to_right';
  };

  const apply = (railed) => {
    panel.classList.toggle('mp-rail', railed);
    if (isNavModulesOn()) {
      /* History icon opens History from the collapsed rail and closes
         whichever module is open; hamburger/new-chat hide while a module is open. */
      applyHamburgerSkin();
      if (!railed) scheduleNavTrees(navEl);
      try { syncNavModulesChrome(); } catch (_) { /* optional on first paint */ }
      return;
    }
    btn.setAttribute('aria-pressed', railed ? 'true' : 'false');
    const label = railed ? 'Expand menu' : 'Collapse menu to icons';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    btn.setAttribute('data-tip', label);
    const icon = btn.querySelector('.material-symbols-outlined');
    /* dock_to_right = open / expand; dock_to_left = close / collapse. */
    if (icon) icon.textContent = railed ? 'dock_to_right' : 'dock_to_left';
    applyHamburgerSkin();
    if (!railed) scheduleNavTrees(navEl);
  };

  /* The menu button sits to the right of the logo and reflects the nav state:
       • Minimal UI ON (vertical column OR pivoted top bar) → dock_to_right
         ("Show navigation") that reveals the full nav, i.e. turns Minimal UI
         off. This is the single, consistent way out of Minimal UI on every page.
       • Pivot bar, Minimal UI OFF → dock_to_left ("Hide navigation") that
         collapses the bar back to minimal (turns Minimal UI on).
       • Vertical column, Minimal UI OFF → the usual rail open/close dock icons. */
  const refreshToggleSkin = () => {
    const icon = btn.querySelector('.material-symbols-outlined');
    if (panel.classList.contains('minimal-ui')) {
      const label = 'Show navigation';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
      btn.setAttribute('aria-expanded', 'false');
      if (icon) icon.textContent = 'dock_to_right';
    } else if (panel.classList.contains('mp-pivot')) {
      const label = 'Hide navigation';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
      btn.setAttribute('aria-expanded', 'true');
      if (icon) icon.textContent = 'dock_to_left';
    } else {
      btn.removeAttribute('aria-expanded');
      apply(panel.classList.contains('mp-rail'));
    }
  };

  /* The leftmost navigation module opens collapsed to its icon rail by default.
     Nav & History icons owns that rail on every load — an in-session expand
     (hamburger) must not round-trip as Icons only off. When that mode is off,
     an explicit Icons only choice under the shared key is honored; no stored
     value = collapsed. */
  let railed = true;
  if (!isNavModulesOn()) {
    try {
      const v = localStorage.getItem(MENU_RAIL_STORE_KEY);
      if (v !== null) railed = v === '1';
    } catch (_) {}
  }
  /* Reports (and any page that opts into a collapsed rail on every visit)
     must not honor a stored "expanded" preference here — doing so expands
     the rail and then collapseNavRail() snaps it shut after first paint,
     which replays module entrance animations and reads as a blink. */
  if (document.body && (
    document.body.dataset.navId === 'reports' ||
    document.body.hasAttribute('data-default-nav-collapsed')
  )) {
    railed = true;
  }
  apply(railed);
  refreshToggleSkin();

  if (!btn.dataset.railBound) {
    btn.dataset.railBound = '1';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      /* Minimal UI on (vertical or pivot) → the button turns it OFF (reveals
         the full nav). This is the arrow beside the logo the user clicks to
         leave Minimal UI on every page. */
      if (panel.classList.contains('minimal-ui')) {
        applyMinimalUi(false);
        return;
      }
      /* In the pivot bar (not minimal) the button collapses back to Minimal UI. */
      if (panel.classList.contains('mp-pivot')) {
        applyMinimalUi(true);
        return;
      }
      const next = !panel.classList.contains('mp-rail');
      apply(next);
      /* Nav & History icons owns the rail as a load default; expanding here
         is in-session only so the next page still opens as four icons. */
      if (!isNavModulesOn()) {
        try { localStorage.setItem(MENU_RAIL_STORE_KEY, next ? '1' : '0'); } catch (_) {}
      }
      try { document.dispatchEvent(new CustomEvent('wise:menu-rail', { detail: { on: next } })); } catch (_) {}
    });
  }

  /* Keep the button's skin in sync when Minimal UI or pivot is toggled
     elsewhere (the Appearance popover dispatches both events). */
  if (!btn.dataset.minimalBound) {
    btn.dataset.minimalBound = '1';
    document.addEventListener('wise:minimal-ui', refreshToggleSkin);
    document.addEventListener('wise:menu-pivot', refreshToggleSkin);
    /* The Appearance popover's "Icons only" toggle flips `.mp-rail` directly;
       re-skin the dock icon so it reflects the new collapsed/expanded state. */
    document.addEventListener('wise:menu-rail', refreshToggleSkin);
    document.addEventListener('wise:nav-hamburger', refreshToggleSkin);
    document.addEventListener('wise:app-search', refreshToggleSkin);
    document.addEventListener('wise:nav-modules', refreshToggleSkin);
  }

  brand.appendChild(btn);
  try { syncNavModulesChrome(); } catch (_) { /* optional on first paint */ }
  setupMenuRailTooltip();
}

/** Single delegated floating tooltip for collapsed menu-rail rows. */
function setupMenuRailTooltip() {
  if (window.__menuRailTipReady) return;
  window.__menuRailTipReady = true;

  let tip = document.getElementById('menu-rail-tip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'menu-rail-tip';
    tip.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tip);
  }

  const ROW_SELECTOR = '.menu-nav-item, .menu-nav-subitem, .menu-nav-upgrade';
  let current = null;

  /* Read a row's label as plain text. The `.tagline-tm` <sup> carries the
     literal characters "TM"; swap it for a proper ™ so the tooltip reads
     "WISEcode AI™" instead of "WISEcode AITM". */
  const labelText = (labelEl) => {
    if (!labelEl) return '';
    const clone = labelEl.cloneNode(true);
    const hadTm = clone.querySelector('.tagline-tm');
    clone.querySelectorAll('.tagline-tm').forEach((n) => n.remove());
    let text = clone.textContent.trim();
    if (hadTm) text += '\u2122';
    return text;
  };

  const show = (row) => {
    const floated = row.closest('.menu-footer--search-float');
    const panel = row.closest('#menu-panel.mp-rail, #menu-panel.mp-pivot');
    if (!floated && !panel) return;
    /* Most rows carry their text in `.menu-nav-label`; the upgrade card labels
       it as `.menu-nav-upgrade-title` instead, so fall back to that. */
    const labelEl = row.querySelector('.menu-nav-label') || row.querySelector('.menu-nav-upgrade-title');
    const label = labelText(labelEl);
    if (!label) return;
    current = row;
    tip.textContent = label;
    const r = row.getBoundingClientRect();
    if (floated || panel.classList.contains('mp-pivot')) {
      /* Horizontal bar / search-row cluster — float the label below the icon. */
      tip.classList.add('menu-rail-tip-below');
      tip.style.top = `${Math.round(r.bottom + 8)}px`;
      tip.style.left = `${Math.round(r.left + r.width / 2)}px`;
    } else {
      tip.classList.remove('menu-rail-tip-below');
      tip.style.top = `${Math.round(r.top + r.height / 2)}px`;
      tip.style.left = `${Math.round(r.right + 10)}px`;
    }
    tip.offsetWidth; /* reflow so the enter transition plays */
    tip.classList.add('menu-rail-tip-visible');
  };
  const hide = () => {
    current = null;
    tip.classList.remove('menu-rail-tip-visible');
  };

  document.addEventListener('mouseover', (e) => {
    const row = e.target.closest(ROW_SELECTOR);
    if (row && row !== current) show(row);
  });
  document.addEventListener('mouseout', (e) => {
    const row = e.target.closest(ROW_SELECTOR);
    if (row && !row.contains(e.relatedTarget)) hide();
  });
  document.addEventListener('focusin', (e) => {
    const row = e.target.closest(ROW_SELECTOR);
    if (row) show(row);
  });
  document.addEventListener('focusout', hide);
  window.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
}

/* ====================================================================
   Pivot navigation.

   The Appearance popover's "Pivot Navigation" toggle flips the vertical
   nav module (#menu-panel) into a horizontal top bar — icon-only, every
   row laid out side by side, mirroring the old top-bar rail. Adding
   `.mp-pivot` to the panel + `.menu-pivoted` to the shell wrap restacks
   the grid (nav row on top, modules below) and lays the nav out as a row.
   The preference persists in localStorage so it carries across pages.
==================================================================== */
const MENU_PIVOT_STORE_KEY = 'wise-menu-pivot';

function shellWrapEl() {
  return (
    document.getElementById('agent-shell-wrap') ||
    document.getElementById('chat-shell-wrap')
  );
}

/** Re-apply the inert/aria-hidden state on group children based on each
 *  group's open state — used when leaving pivot so collapsed groups go
 *  back to being non-interactive. */
function syncGroupChildrenInert(panel) {
  panel.querySelectorAll('.menu-nav-group').forEach((group) => {
    const childrenEl = group.querySelector('.menu-nav-children');
    if (!childrenEl) return;
    if (group.dataset.open === 'true') {
      childrenEl.removeAttribute('inert');
      childrenEl.removeAttribute('aria-hidden');
    } else {
      childrenEl.setAttribute('inert', '');
      childrenEl.setAttribute('aria-hidden', 'true');
    }
  });
}

/** True when the nav module is currently pivoted into the horizontal bar. */
export function isMenuPivoted() {
  const panel = document.getElementById('menu-panel');
  return !!panel && panel.classList.contains('mp-pivot');
}

/** Toggle the nav module between the vertical panel and the horizontal bar.
 *  Turning pivot ON always brings Minimal UI with it (logo, Appearance, and
 *  you in the top bar). Nav & History icons stands Minimal UI down, so it
 *  has to drop too or the four-icon chrome would hide that strip. Off stays
 *  independent — the chevron can still expand the bar without leaving pivot. */
export function setMenuPivot(on) {
  const panel = document.getElementById('menu-panel');
  if (!panel) return;
  panel.classList.toggle('mp-pivot', on);
  shellWrapEl()?.classList.toggle('menu-pivoted', on);

  /* The pivot bar mirrors the vertical nav: only OPEN groups expose their
     children. Collapsed groups stay non-interactive so the row shows the
     same top-level products as the left-hand nav (no flattened sub-sections
     or duplicate report icons). */
  syncGroupChildrenInert(panel);

  if (on) {
    try { applyMinimalUi(true); } catch (_) { /* panel already painted */ }
    try { applyNavModules(false); } catch (_) { /* chrome already down */ }
  }

  try { localStorage.setItem(MENU_PIVOT_STORE_KEY, on ? '1' : '0'); } catch (_) {}
  try {
    document.dispatchEvent(new CustomEvent('wise:menu-pivot', { detail: { on: !!on } }));
  } catch (_) {}
}

export function toggleMenuPivot() {
  setMenuPivot(!isMenuPivoted());
}

/** Apply the persisted pivot preference on mount. */
function setupMenuPivot(navEl) {
  const panel = navEl.closest('#menu-panel');
  if (!panel) return;
  let pivoted = false;
  try { pivoted = localStorage.getItem(MENU_PIVOT_STORE_KEY) === '1'; } catch (_) {}
  if (pivoted) setMenuPivot(true);
}

/** Returns descendants in DFS order with their depth (1-based) under the root. */
function collectDescendantIds(rootId) {
  const out = [];
  const walk = (id, depth) => {
    const node = AGENTS[id];
    if (!node) return;
    for (const childId of node.children || []) {
      out.push({ id: childId, depth });
      walk(childId, depth + 1);
    }
  };
  walk(rootId, 1);
  return out;
}

export function getAgent(id) {
  return AGENTS[id] || null;
}

export function getDirectChildren(id) {
  const node = AGENTS[id];
  if (!node) return [];
  return (node.children || []).map((cid) => AGENTS[cid]).filter(Boolean);
}

/** Returns the full descendant list (depth 1+) of a top-level agent, in display
 *  order, with depth metadata for indentation in the overview list. */
export function getDescendants(id) {
  return collectDescendantIds(id);
}

if (typeof document !== 'undefined') {
  document.addEventListener('wise:nav-tree-layout', () => scheduleNavTrees());
  document.addEventListener('wise:nav-history', () => scheduleNavTrees());
  window.addEventListener('resize', () => layoutNavTrees());
  try {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => layoutNavTrees()).catch(() => {});
    }
  } catch (_) { /* fonts API optional */ }
}
