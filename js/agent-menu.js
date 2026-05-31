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
  'command-deck': {
    id: 'command-deck',
    label: 'Command Deck',
    icon: 'cadence',
    sub: 'The Nexus · Pulse',
    tagline:
      'Your high-altitude entry point. Brand-health gauges and the AI Portfolio Agent’s intelligence briefing.',
  },
  analytics: {
    id: 'analytics',
    label: 'Dashboard',
    icon: 'insert_chart',
    sub: 'Visual intelligence · Charts & graphs',
    tagline:
      'The visual intelligence layer — charts and graphs that track verification, trust coverage, portfolio composition, and competitive position over time.',
  },
  ledger: {
    id: 'ledger',
    label: 'The Ledger',
    icon: 'receipt',
    sub: 'Zoom In · Full portfolio',
    tagline:
      'The high-fidelity list view. Filter, sort, and bulk-manage every product in your portfolio.',
  },
  intake: {
    id: 'intake',
    label: 'Intake & Growth',
    icon: 'cloud_upload',
    sub: 'Pathway 1 · Managing the Truth',
    tagline:
      'AI-first ingestion, the Brand Verified gold standard, market governance, Smart Sets, and Discovery Tags.',
  },
  verified: {
    id: 'verified',
    label: 'Verified Pipeline',
    icon: 'verified',
    sub: 'Pathway 2 · Managing the Trust',
    tagline:
      'Pre-qualification, the 1-2-3 Get Verified flow, and the lifecycle watchdog for renewals.',
  },
  identity: {
    id: 'identity',
    label: 'Identity Portal',
    icon: 'badge',
    sub: 'Pathway 3 · Managing the Presence',
    tagline:
      'B2B/B2C synthesis, identity assets, certifications, and ecosystem connectivity.',
  },
  recipes: {
    id: 'recipes',
    label: 'Recipe Lab',
    icon: 'restaurant_menu',
    sub: 'Composed formulations',
    tagline:
      'Build composed recipes in real-time with live NFP+™ calculation.',
  },
  vault: {
    id: 'vault',
    label: 'Asset Vault',
    icon: 'folder_special',
    sub: 'Premium wing · Trust assets',
    tagline:
      'Your living library of Verified Shields, retail sheets, and social assets — organized by standard.',
  },
};

export const PORTFOLIO_SECTION_IDS = [
  'analytics',
  'command-deck',
  'ledger',
  'intake',
  'verified',
  'identity',
  'recipes',
  'vault',
];

/** Platform products shown above the agent tree. */
export const NAV_PRODUCTS = {
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
    hash: 'processing',
  },
  'wisecode-portfolio': {
    id: 'wisecode-portfolio',
    label: 'WISEcode Portfolio',
    icon: 'inventory_2',
    slug: 'portfolio.html',
    sections: PORTFOLIO_SECTION_IDS,
  },
};

export function getPortfolioSection(id) {
  return PORTFOLIO_SECTIONS[id] || null;
}

export const TOP_LEVEL_PRODUCT_IDS = [
  'wisecode-ai',
  'wisecode-studio',
  'wisecode-portfolio',
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

/* The legacy "Material Icons" font lacks some newer glyphs that only ship in
   "Material Symbols Outlined" (e.g. `cadence`). Render those with the symbols
   class so they resolve instead of showing a tofu box. */
const SYMBOLS_ONLY_ICONS = new Set(['cadence']);
export function iconClassFor(name) {
  return SYMBOLS_ONLY_ICONS.has(name) ? 'material-symbols-outlined' : 'material-icons';
}

/* Make sure the Material Symbols Outlined webfont is loaded. Agent pages only
   link the legacy Material Icons font, so any symbols-only glyph used in the
   shared menu would otherwise render as a blank box. Idempotent. */
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
        <span class="menu-nav-subicon"><span class="material-icons">${escAttr(node.icon)}</span></span>
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
          <span class="menu-nav-icon"><span class="material-icons">${escAttr(node.icon)}</span></span>
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
          <span class="menu-nav-icon"><span class="material-icons">${escAttr(node.icon)}</span></span>
          <span class="menu-nav-label">${escAttr(node.label)}</span>
          <button type="button" class="menu-nav-chevron-btn" data-toggle-group="${escAttr(id)}" aria-label="Toggle ${escAttr(node.label)} children">
            <span class="menu-nav-chevron"><span class="material-icons">expand_more</span></span>
          </button>
        </a>
        <div class="menu-nav-children" id="menu-nav-${escAttr(id)}" role="region" aria-label="${escAttr(node.label)} agents"${collapsedAttrs}>
          <div class="menu-nav-children-inner">
            ${childrenHtml}
          </div>
        </div>
      </div>`;
  };

  const renderSection = (product, sectionId) => {
    const sec = PORTFOLIO_SECTIONS[sectionId];
    if (!sec) return '';
    const href = `${prefix}${product.slug}#${sectionId}`;
    const isActive = sectionId === activeSection ? ' is-active' : '';
    return `
      <a class="menu-nav-subitem${isActive}" href="${escAttr(href)}" data-section-id="${escAttr(sectionId)}" data-depth="1">
        <span class="menu-nav-subicon"><span class="${iconClassFor(sec.icon)}">${escAttr(sec.icon)}</span></span>
        <span class="menu-nav-label">${escAttr(sec.label)}</span>
      </a>`;
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
            <span class="menu-nav-icon"><span class="material-icons">${escAttr(product.icon)}</span></span>
            <span class="menu-nav-label">${formatProductNavLabel(product.label)}</span>
            <button type="button" class="menu-nav-chevron-btn" data-toggle-group="${escAttr(productId)}" aria-label="Toggle ${escAttr(product.label)} sections">
              <span class="menu-nav-chevron"><span class="material-icons">expand_more</span></span>
            </button>
          </a>
          <div class="menu-nav-children" id="menu-nav-${escAttr(productId)}" role="region" aria-label="${escAttr(product.label)} sections"${collapsedAttrs}>
            <div class="menu-nav-children-inner">
              ${sectionsHtml}
            </div>
          </div>
        </div>`;
    }

    /* WISEcode AI renders as a plain product link — its agent tree is no
       longer expandable from the menu, so it stays closed (no children). */
    return `
      <a class="menu-nav-item menu-nav-product${isActive}" href="${escAttr(href)}" data-product-id="${escAttr(productId)}">
        <span class="menu-nav-icon"><span class="material-icons">${escAttr(product.icon)}</span></span>
        <span class="menu-nav-label">${formatProductNavLabel(product.label)}</span>
      </a>`;
  };

  navEl.setAttribute('aria-label', 'WISE platform navigation');
  navEl.innerHTML = TOP_LEVEL_PRODUCT_IDS.map(renderProduct).join('');

  setupMenuRail(navEl);

  navEl.addEventListener('click', (e) => {
    const chevron = e.target.closest('[class~="menu-nav-chevron-btn"]');
    if (chevron) {
      e.preventDefault();
      e.stopPropagation();
      const groupId = chevron.dataset.toggleGroup;
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
    }
  });
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

  const apply = (railed) => {
    panel.classList.toggle('mp-rail', railed);
    btn.setAttribute('aria-pressed', railed ? 'true' : 'false');
    const label = railed ? 'Expand menu' : 'Collapse menu to icons';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    const icon = btn.querySelector('.material-icons');
    if (icon) icon.textContent = railed ? 'chevron_right' : 'chevron_left';
  };

  let railed = false;
  try { railed = localStorage.getItem(MENU_RAIL_STORE_KEY) === '1'; } catch (_) {}
  apply(railed);

  if (!btn.dataset.railBound) {
    btn.dataset.railBound = '1';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const next = !panel.classList.contains('mp-rail');
      apply(next);
      try { localStorage.setItem(MENU_RAIL_STORE_KEY, next ? '1' : '0'); } catch (_) {}
    });
  }

  brand.appendChild(btn);
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

  const ROW_SELECTOR = '.menu-nav-item, .menu-nav-subitem';
  let current = null;

  const show = (row) => {
    const panel = row.closest('#menu-panel.mp-rail');
    if (!panel) return;
    const labelEl = row.querySelector('.menu-nav-label');
    const label = labelEl ? labelEl.textContent.trim() : '';
    if (!label) return;
    current = row;
    tip.textContent = label;
    const r = row.getBoundingClientRect();
    tip.style.top = `${Math.round(r.top + r.height / 2)}px`;
    tip.style.left = `${Math.round(r.right + 10)}px`;
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
