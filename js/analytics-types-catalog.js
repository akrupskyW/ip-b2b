/**
 * Analytics Types catalog — the single list of every chart / section on
 * pages/analytics-types.html.
 *
 * Both surfaces read this file:
 *   • the right-edge jump rail on Analytics Types
 *   • the thumbnail gallery on All Modules (accordion + Component Library)
 *
 * Adding a chart
 * --------------
 * 1. Render the chart on analytics-types.html (same sample data as the rest
 *    of that page).
 * 2. Append one object here with a selector that finds it after the
 *    dashboard body lands.
 * 3. It appears on the rail and as a new thumbnail on All Modules. There is
 *    no second list to keep in sync.
 *
 * `sel` is resolved against `.dash` on Analytics Types (and against the
 * whole document when `doc` is true). `focus` is the iframe-isolate
 * selector All Modules uses — omit it when `sel` already works with
 * document.querySelector (no `:scope`).
 *
 * `keywords` is optional and exists for the palette's filter: the words a
 * member would type that the label and blurb do not already contain. A table
 * specimen called "Invoices" is a *table* and lives under *account* — neither
 * word appears anywhere else in its entry, so neither would ever find it.
 * Only add terms the entry is genuinely missing; the label and `desc` are
 * already searched.
 */

export const ANALYTICS_HREF = 'analytics-types.html';

export const ANALYTICS_TYPES = [
  {
    id: 'page-header',
    sel: '.ah-topbar',
    label: 'Page Header',
    icon: 'web_asset',
    doc: true,
    gallery: false,
    desc: 'The report title bar — not a chart.',
  },
  {
    id: 'hero',
    sel: '#att-hero',
    label: 'Hero Section',
    icon: 'image',
    gallery: false,
    desc: 'Product hero — page chrome, not a chart.',
  },
  {
    id: 'gras-report',
    sel: '#rpt-gras-hero',
    label: 'GRAS Report',
    icon: 'verified',
    gallery: false,
    desc: 'GRAS report cover — masthead, not a chart.',
  },
  {
    id: 'insights-report',
    sel: '#rpt-insights-hero',
    label: 'Portfolio Insights Report',
    icon: 'analytics',
    gallery: false,
    desc: 'Portfolio insights cover — masthead, not a chart.',
  },
  {
    id: 'pscale',
    sel: ':scope > .pscale',
    focus: '.pscale',
    label: 'Processing Spectrum',
    icon: 'gradient',
    desc: 'WISEcode processing spectrum across the portfolio.',
  },
  {
    id: 'claims',
    sel: ':scope > .dash-claim:not(.att-overview-claim)',
    focus: '.dash-claim:not(.att-overview-claim)',
    label: 'Discovery & Claims',
    icon: 'verified',
    desc: 'Discovery and claim scorecards.',
  },
  {
    id: 'overview',
    sel: '.att-overview-claim',
    label: 'Portfolio Overview',
    icon: 'dashboard',
    desc: 'Portfolio snapshot — counts, rates, and claim status.',
  },
  {
    id: 'top5',
    sel: '.dash-top5-section',
    label: 'Top Five Products',
    icon: 'emoji_events',
    desc: 'Highest-scoring products in the portfolio.',
  },
  {
    id: 'upf-gras',
    sel: '#dash-charts',
    focus: '#dash-charts .dash-donut-card',
    label: 'UPF & GRAS Status',
    icon: 'donut_large',
    desc: 'Paired donuts for UPF classification and GRAS status.',
  },
  {
    id: 'pillars',
    sel: '.dash-pillars-section',
    focus: '.dash-pillars-section .dash-wisescore',
    label: 'WISEscore Pillars',
    icon: 'account_balance',
    desc: 'WISEscore broken out by pillar.',
  },
  {
    id: 'breakdown',
    sel: '.dash-pillars-breakdown',
    focus: '.dash-pillars-breakdown .dash-breakdown-card, .dash-pillars-breakdown .dash-card',
    label: 'Pillar Breakdown',
    icon: 'view_week',
    desc: 'Per-pillar bars with the metric mix inside each.',
  },
  {
    id: 'polar',
    sel: '.dash-radar-section',
    focus: '.dash-radar-card',
    label: 'Pillar Metrics',
    icon: 'radar',
    desc: 'Polar area chart of every pillar metric.',
  },
  {
    id: 'hotspots',
    sel: '.dash-ingredients-section',
    focus: '.dash-ingredients-section .dash-ingredients-card',
    label: 'Processing Hotspots',
    icon: 'local_fire_department',
    desc: 'Ingredients driving processing score.',
  },
  {
    id: 'antiinf',
    sel: '.dash-products-section',
    focus: '.dash-products-section .dash-ingredients-card',
    label: 'Anti-Inflammatory',
    icon: 'health_and_safety',
    desc: 'Anti-inflammatory profile across products.',
  },
  {
    id: 'mhc',
    sel: '.dash-mrow-section',
    label: 'Metrics Highlight',
    icon: 'view_agenda',
    desc: 'Clean-label and additive metrics, one row each.',
  },
  {
    id: 'flags',
    sel: '.dash-flags-section',
    label: 'Ingredient Flags',
    icon: 'flag',
    desc: 'Unsafe and unknown ingredient flags.',
  },
  {
    id: 'distribution',
    sel: '.dash-seg-section',
    label: 'Score Distribution',
    icon: 'stacked_bar_chart',
    desc: 'Segmented bar of score bands across the portfolio.',
  },
  {
    id: 'scatter',
    sel: '.dash-scatter-row',
    focus: '.dash-scatter-section',
    label: 'Where to Focus',
    icon: 'scatter_plot',
    desc: 'Focus scatter — impact versus effort.',
  },
  {
    id: 'matrix',
    sel: '#att-tree-card',
    label: 'Performance Matrix',
    icon: 'grid_view',
    desc: 'Treemap of product performance.',
  },
  {
    id: 'upf-table',
    sel: '#upf-class-card',
    label: 'Product-Level UPF Classification',
    icon: 'table_chart',
    desc: 'UPF classification matrix per product.',
  },
  {
    id: 'gras-ing',
    sel: '#gras-class-card',
    label: 'Historical & GRAS Ingredients',
    icon: 'science',
    desc: 'GRAS status broken down across ingredients.',
  },
  {
    id: 'proc-table',
    sel: '#proc-class-card',
    label: 'Ingredient Processing Details',
    icon: 'blender',
    desc: 'WISEcode processing-level distribution.',
  },
  {
    id: 'gras-prod',
    sel: '#gras-prod-card',
    label: 'Product-Level GRAS Classification',
    icon: 'fact_check',
    desc: 'GRAS documentation status per product.',
  },
  {
    id: 'inf-funnel',
    sel: '#inf-funnel-card',
    label: 'Ingredient Funnel',
    icon: 'filter_alt',
    desc: 'Ingredient funnel from catalog to verified.',
  },
  {
    id: 'claim-funnel',
    sel: '#inf-funnel-card-claim',
    label: 'Product Claim Funnel',
    icon: 'filter_alt',
    desc: 'Claim funnel with portfolio numbers.',
  },
  {
    id: 'gras-funnel',
    sel: '#cf-funnel-card',
    label: 'GRAS Conversion Funnel',
    icon: 'conversion_path',
    desc: 'GRAS conversion funnel — click to replay.',
  },
  {
    id: 'trend-line',
    sel: '#atx-line-card',
    label: 'WISEscore Over Time',
    icon: 'trending_up',
    desc: 'Line trend of the portfolio WISEscore by pillar, month over month.',
  },
  {
    id: 'quarter-columns',
    sel: '#atx-col-card',
    label: 'Products Analyzed by Quarter',
    icon: 'bar_chart',
    desc: 'Stacked columns of quarterly volume, split by UPF class.',
  },
  {
    id: 'composition-area',
    sel: '#atx-area-card',
    label: 'Portfolio Composition',
    icon: 'area_chart',
    desc: 'Stacked area of each UPF class share over time.',
  },
  {
    id: 'score-histogram',
    sel: '#atx-hist-card',
    label: 'WISEscore Distribution',
    icon: 'equalizer',
    desc: 'Histogram of WISEscores binned in tens.',
  },
  {
    id: 'kpi-gauges',
    sel: '#atx-gauge-card',
    label: 'Headline KPIs',
    icon: 'speed',
    desc: 'Speedometer gauges for key metrics against target.',
  },
  {
    id: 'volume-combo',
    sel: '#atx-combo-card',
    label: 'Volume vs. Score',
    icon: 'query_stats',
    desc: 'Dual-axis combo — volume bars against the average score line.',
  },
  {
    id: 'score-waterfall',
    sel: '#atx-waterfall-card',
    label: 'How the Score Is Built',
    icon: 'waterfall_chart',
    desc: 'Waterfall of each factor adding to or cutting the average score.',
  },
  {
    id: 'score-bubble',
    sel: '#atx-bubble-card',
    label: 'Score vs. Processing',
    icon: 'bubble_chart',
    desc: 'Bubble chart of score against processing, sized by volume.',
  },
  {
    id: 'state-choropleth',
    sel: '#atx-geo-card',
    label: 'WISEscore by State',
    icon: 'map',
    desc: 'U.S. tile-grid choropleth of the average WISEscore by state.',
  },
  {
    id: 'category-box',
    sel: '#atx-box-card',
    label: 'Score Spread by Category',
    icon: 'candlestick_chart',
    desc: 'Box-and-whisker of the WISEscore spread within each category.',
  },
  {
    id: 'grouped-columns',
    sel: '#atx-group-card',
    label: 'Grouped Columns',
    icon: 'grouped_bar_chart',
    desc: 'Side-by-side columns — same quarterly mix, unstacked.',
  },
  {
    id: 'share-columns',
    sel: '#atx-pctcol-card',
    label: '100% Stacked Columns',
    icon: 'stacked_bar_chart',
    desc: 'Quarterly mix as a share of each column.',
  },
  {
    id: 'range-columns',
    sel: '#atx-range-card',
    label: 'Floating Columns',
    icon: 'align_vertical_center',
    desc: 'Score range per category — a column that does not sit on zero.',
  },
  {
    id: 'rank-bars',
    sel: '#atx-hbar-card',
    label: 'Ranking Bars',
    icon: 'align_horizontal_left',
    desc: 'Horizontal ranking of category scores.',
  },
  {
    id: 'grouped-bars',
    sel: '#atx-ghbar-card',
    label: 'Grouped Bars',
    icon: 'view_stream',
    desc: 'This year versus last, side by side.',
  },
  {
    id: 'lollipop',
    sel: '#atx-lollipop-card',
    label: 'Before & After',
    icon: 'linear_scale',
    desc: 'Dumbbell of last year’s score against this year’s.',
  },
  {
    id: 'bullet-bars',
    sel: '#atx-bullet-card',
    label: 'Bullet Charts',
    icon: 'straight',
    desc: 'Actual versus target, with a qualitative range behind.',
  },
  {
    id: 'diverging-bars',
    sel: '#atx-div-card',
    label: 'Diverging Bars',
    icon: 'compare_arrows',
    desc: 'Quarterly change, plus and minus from the center.',
  },
  {
    id: 'pie-share',
    sel: '#atx-pie-card',
    label: 'Pie Share',
    icon: 'pie_chart',
    desc: 'Classic pie of the UPF mix — the donut’s filled twin.',
  },
  {
    id: 'half-donut',
    sel: '#atx-half-card',
    label: 'Half Donut',
    icon: 'donut_small',
    desc: 'Semicircle composition of claim status.',
  },
  {
    id: 'ring-nest',
    sel: '#atx-rings-card',
    label: 'Concentric Rings',
    icon: 'tonality',
    desc: 'Nested rings for the three scoring pillars.',
  },
  {
    id: 'donut-strip',
    sel: '#atx-dstrip-card',
    label: 'Donut Strip',
    icon: 'donut_large',
    desc: 'Four small progress donuts for the headline rates.',
  },
  {
    id: 'spark-table',
    sel: '#atx-spark-card',
    label: 'Leaderboard Table',
    icon: 'table_rows',
    desc: 'Ranked products with in-cell bars and a six-month sparkline.',
  },
  {
    id: 'heat-table',
    sel: '#atx-heat-card',
    label: 'Heat Table',
    icon: 'grid_on',
    desc: 'Product-by-metric table, each cell coloured by status.',
  },

  /* Table specimens — one per data table in the app (js/analytics-types-tables.js).
     They sit on this page so the size palette can be pointed at every table,
     not only the charts. Each names and links the page the real one lives on. */
  {
    id: 'tbl-pf-claimed',
    sel: '#attb-pf-claimed',
    label: 'Portfolio · Claimed',
    icon: 'inventory_2',
    desc: 'Claimed SKUs with data completeness and shield status.',
    keywords: 'table products upf',
  },
  {
    id: 'tbl-pf-discovered',
    sel: '#attb-pf-discovered',
    label: 'Portfolio · Discovered',
    icon: 'travel_explore',
    desc: 'Auto-discovered UPCs waiting to be claimed.',
    keywords: 'table products upf',
  },
  {
    id: 'tbl-pf-needsinfo',
    sel: '#attb-pf-needsinfo',
    label: 'Portfolio · Needs info',
    icon: 'help',
    desc: 'Products missing data before they can be verified.',
    keywords: 'table products upf',
  },
  {
    id: 'tbl-comparison',
    sel: '#attb-cmp',
    label: 'Product Comparison',
    icon: 'compare',
    desc: 'Side-by-side attribute matrix for two products.',
    keywords: 'table compare',
  },
  {
    id: 'tbl-ai-users',
    sel: '#attb-aid-users',
    label: 'AI Dashboard · Users',
    icon: 'group',
    desc: 'Per-member AI activity, budget and spend.',
    keywords: 'table studio seats usage',
  },
  {
    id: 'tbl-ingredients',
    sel: '#attb-ib',
    label: 'Ingredient Browser',
    icon: 'science',
    desc: 'The ingredient registry with GRAS status and allergens.',
    keywords: 'table ingredients',
  },
  {
    id: 'tbl-chat',
    sel: '#attb-wa-tbl',
    label: 'Chat · Ingredient table',
    icon: 'forum',
    desc: 'The sortable table rendered inside a chat answer.',
    keywords: 'ingredients wiseai',
  },
  {
    id: 'tbl-rf-picks',
    sel: '#attb-rf-picks',
    label: 'Reformulation · Picks',
    icon: 'auto_fix_high',
    desc: 'Products you can pick to reformulate, with blockers.',
    keywords: 'table',
  },
  {
    id: 'tbl-rf-moves',
    sel: '#attb-rf-moves',
    label: 'Reformulation · Moves',
    icon: 'route',
    desc: 'Recommended ingredient moves with impact and effort.',
    keywords: 'table',
  },
  {
    id: 'tbl-guiding-stars',
    sel: '#attb-gs',
    label: 'Guiding Stars',
    icon: 'star',
    desc: 'The action plan, segmented from quick wins to deeper work.',
    keywords: 'table report',
  },
  {
    id: 'tbl-verify-select',
    sel: '#attb-vf-select',
    label: 'Non-UPF · Select',
    icon: 'verified',
    desc: 'Qualifying SKUs to run through Non-UPF verification.',
    keywords: 'table verification',
  },
  {
    id: 'tbl-gras-ing',
    sel: '#attb-gv',
    label: 'GRAS · Ingredients',
    icon: 'shield',
    desc: 'Ingredient-level GRAS documentation and portfolio impact.',
    keywords: 'table verification',
  },
  {
    id: 'tbl-team',
    sel: '#attb-team',
    label: 'Team',
    icon: 'group',
    desc: 'People on the signed-in brand — seats, invites and roles.',
    keywords: 'table admin members',
  },
  {
    id: 'tbl-orgs',
    sel: '#attb-orgs',
    label: 'Organizations',
    icon: 'apartment',
    desc: 'Customer org directory with member and product counts.',
    keywords: 'table admin',
  },
  {
    id: 'tbl-users',
    sel: '#attb-users',
    label: 'User Management',
    icon: 'manage_accounts',
    desc: 'Users and roles across the workspace.',
    keywords: 'table admin members',
  },
  {
    id: 'tbl-audit',
    sel: '#attb-audit',
    label: 'Audit Queue',
    icon: 'fact_check',
    desc: 'Ingredient audit review queue, with the brand’s notes.',
    keywords: 'table admin',
  },
  {
    id: 'tbl-nud',
    sel: '#attb-nud',
    label: 'Non-UPF Dashboard',
    icon: 'dashboard',
    desc: 'Verification verdict and workflow state per SKU.',
    keywords: 'table admin verification',
  },
  {
    id: 'tbl-quick-invite',
    sel: '#attb-qi',
    label: 'Quick Invite · History',
    icon: 'bolt',
    desc: 'Recent one-step organization invitations.',
    keywords: 'table admin members',
  },
  {
    id: 'tbl-invoices',
    sel: '#attb-inv',
    label: 'Invoices',
    icon: 'receipt_long',
    desc: 'Billing board of every invoice and its status.',
    keywords: 'table account billing',
  },
  {
    id: 'tbl-marketing-assets',
    sel: '#attb-ma',
    label: 'Marketing Assets tree',
    icon: 'photo_library',
    desc: 'Nested file tree of the co-branding toolkit.',
    keywords: 'table account downloads',
  },
  {
    id: 'tbl-api-keys',
    sel: '#attb-ak',
    label: 'API Keys',
    icon: 'key',
    desc: 'Created keys with scope, usage and revoke.',
    keywords: 'table account developer',
  },
];

export const ANALYTICS_NAV = ANALYTICS_TYPES.filter((t) => t.nav !== false);

export const ANALYTICS_GALLERY = ANALYTICS_TYPES.filter((t) => t.gallery !== false);

export function analyticsFocusSel(item) {
  if (!item) return '';
  if (item.focus) return item.focus;
  return String(item.sel || '').replace(/^:scope\s*>\s*/, '');
}

export function analyticsOpenHref(item) {
  if (!item) return ANALYTICS_HREF;
  if (item.hash) return ANALYTICS_HREF + '#' + item.hash;
  const id = String(item.sel || '').match(/^#([A-Za-z][\w-]*)/);
  return id ? ANALYTICS_HREF + '#' + id[1] : ANALYTICS_HREF;
}

export function analyticsById(id) {
  return ANALYTICS_TYPES.find((t) => t.id === id) || null;
}
