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
