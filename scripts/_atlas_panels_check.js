/* Render check for the Intervention Atlas panel outputs.

   Pulls the page's main inline module out of pages/wiseai.html, runs it in a
   sandbox with a minimal DOM, then renders each panel on its own and asserts
   that it carries only its own chart — and that the shared controls appear
   exactly once, on the opportunity map. No browser involved. */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'pages/wiseai.html'), 'utf8');

/* The biggest inline block is the page's own module. */
let body = '';
for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
  if (/\bsrc=/.test(m[1])) continue;
  if (m[2].length > body.length) body = m[2];
}
body = body.replace(/^\s*import\s[^;]*;/gm, '');
/* Top-level `const` lives in the script's lexical scope, not on the global, so
   hand the ones this check reads out to the sandbox explicitly. */
body += '\nvar __ATLAS_PANELS = (typeof ATLAS_PANELS !== "undefined") ? ATLAS_PANELS : null;';

const noop = () => {};
const el = () => new Proxy(function () {}, {
  get(_t, k) {
    if (k === 'dataset' || k === 'style' || k === 'classList') return el();
    if (k === 'children' || k === 'childNodes') return [];
    if (k === 'textContent' || k === 'innerHTML' || k === 'value') return '';
    if (k === 'length') return 0;
    if (k === Symbol.iterator) return [][Symbol.iterator].bind([]);
    return el();
  },
  set() { return true; },
  apply() { return el(); },
  has() { return true; },
});
const doc = {
  documentElement: el(), head: el(), body: el(),
  createElement: () => el(), createTextNode: () => el(),
  getElementById: () => null, querySelector: () => null,
  querySelectorAll: () => [], addEventListener: noop, removeEventListener: noop,
  readyState: 'complete', baseURI: 'http://localhost/pages/wiseai.html',
};
const store = new Map();
const sandbox = {
  console, document: doc, setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame: noop, cancelAnimationFrame: noop, queueMicrotask,
  Math, Date, JSON, Intl, URL, Promise, Error, Object, Array, String, Number, Boolean, RegExp, Map, Set, WeakMap,
  MutationObserver: class { observe() {} disconnect() {} },
  IntersectionObserver: class { observe() {} disconnect() {} unobserve() {} },
  ResizeObserver: class { observe() {} disconnect() {} unobserve() {} },
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), clear: () => store.clear(),
  },
  matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop }),
  location: { href: 'http://localhost/pages/wiseai.html', pathname: '/pages/wiseai.html', search: '' },
  navigator: { userAgent: 'node', language: 'en-US' },
  screen: { width: 1728, height: 1117 },
  innerWidth: 1440, innerHeight: 900, devicePixelRatio: 2,
  addEventListener: noop, removeEventListener: noop, getComputedStyle: () => el(),
  /* Imports the page makes from shared modules. */
  mountWISEcodeAIChat: noop,
  OWL_BUG: '<svg></svg>',
  owlProgressionCarouselHtml: () => '<figure class="sc-owl-prog"></figure>',
  saveGeneratedReport: noop,
  observeOwlProgression: noop,
  mountOwlProgressionCarousels: noop,
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;

const ctx = vm.createContext(sandbox);
try {
  vm.runInContext(body, ctx, { filename: 'wiseai.inline.js' });
} catch (e) {
  console.error('inline module threw at load:', e && e.stack);
  process.exit(1);
}

let pass = 0;
const fails = [];
const ok = (label, cond) => { if (cond) pass++; else fails.push(label); };
const count = (s, re) => (s.match(re) || []).length;

const run = (expr) => vm.runInContext(expr, ctx);

/* ── The six panels each render on their own ─────────────────────────────── */
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const panels = {};
for (const L of LETTERS) {
  const out = run(`atlasView({ only: '${L}' })`);
  panels[L] = out;
  ok(`panel ${L} renders non-trivial markup`, typeof out === 'string' && out.length > 400);
  ok(`panel ${L} is tagged as a single-panel output`, out.includes('wa-atlas--panel') && out.includes(`data-atlas-only="${L}"`));
  ok(`panel ${L} carries exactly one panel section`, count(out, /class="atl-panel"/g) === 1);
  ok(`panel ${L} is labelled Panel ${L}`, out.includes(`Panel ${L}`));
  for (const other of LETTERS.filter((x) => x !== L)) {
    ok(`panel ${L} does not draw Panel ${other}`, !out.includes(`>Panel ${other}<`));
  }
}

/* ── Controls live once, on the opportunity map ──────────────────────────── */
ok('panel A carries the weighting toggle', panels.A.includes('data-atlas-set="atlasW'));
ok('panel A carries the category filter', panels.A.includes('data-atlas-set="atlasCat'));
ok('panel A carries the lever filter', panels.A.includes('data-atlas-set="atlasType'));
ok('panel A carries the evidence filter', panels.A.includes('data-atlas-set="atlasEvid'));
ok('panel A carries the population filter', panels.A.includes('data-atlas-set="atlasPop'));
ok('panel A carries the synthetic-data banner', panels.A.includes('atl-flag'));
for (const L of ['B', 'C', 'D', 'E', 'F']) {
  ok(`panel ${L} does not repeat the control row`, !panels[L].includes('atl-controls'));
  ok(`panel ${L} states the active slice instead`, panels[L].includes('atl-readout'));
  ok(`panel ${L} names the active weighting`, /Weighting<\/i>/.test(panels[L]));
}

/* ── Panel content is the right chart ────────────────────────────────────── */
ok('A is the bubble map', panels.A.includes('atl-bubble') && panels.A.includes('atl-quad'));
ok('A shows a health interval whisker', panels.A.includes('atl-whisk') || /whisker/i.test(panels.A));
ok('B is the score matrix', /atl-mx/.test(panels.B));
ok('B scores every intervention on all ten dimensions', count(panels.B, /atl-mx-cell/g) >= 12 * 10);
ok('C is the causal pathway', /atl-chain|atl-flow/.test(panels.C));
ok('C carries the feedback loops', count(panels.C, /atl-loop"/g) >= 6);
ok('C distinguishes tested from hypothesised links', /dashed/.test(panels.C) && /dotted/.test(panels.C));
ok('D compares populations', /atl-pop/.test(panels.D));
ok('E lists financial & operational consequences', /atl-fin/.test(panels.E));
ok('F is the frontier', /atl-dom|frontier/i.test(panels.F));

/* ── The closing read is its own output ─────────────────────────────────── */
const close = run(`atlasView({ only: 'Z' })`);
ok('closing read renders', close.length > 400 && /atl-close/.test(close));
ok('closing read draws no panel chart', count(close, /class="atl-panel"/g) === 0);
ok('closing read states the active slice', close.includes('atl-readout'));

/* ── The whole board still renders in one go ─────────────────────────────── */
const board = run('atlasView()');
ok('full board renders all six panels', count(board, /class="atl-panel"/g) === 6);
ok('full board carries the controls once', count(board, /atl-controls/g) === 1);
ok('full board keeps the closing read', /atl-close/.test(board));
ok('full board is not tagged single-panel', !board.includes('wa-atlas--panel'));

/* ── Filters and weighting reach every panel independently ───────────────── */
for (const L of LETTERS) {
  const bev = run(`atlasView({ only: '${L}', cat: 'bev' })`);
  ok(`panel ${L} accepts a category filter`, bev.includes('data-atlas-cat="bev"'));
  const profit = run(`atlasView({ only: '${L}', w: 'profit' })`);
  ok(`panel ${L} accepts a re-weighting`, profit.includes('data-atlas-w="profit"'));
}
const narrow = run(`atlasView({ only: 'B', cat: 'bev' })`);
ok('a narrowed panel draws fewer rows than the full set', count(narrow, /atl-mx-row/g) < count(panels.B, /atl-mx-row/g));

/* ── Every panel has a title and meta for its output card ────────────────── */
const metas = run('__ATLAS_PANELS.map((p) => ({ only: p.only, icon: p.icon, title: p.title, meta: p.meta() }))');
ok('six panel output descriptors exist', metas.length === 6);
metas.forEach((m) => {
  ok(`panel ${m.only} has an icon`, !!m.icon);
  ok(`panel ${m.only} has a title`, !!m.title && m.title.length > 8);
  ok(`panel ${m.only} has a meta line`, !!m.meta && m.meta.length > 20);
});
ok('panel titles are all distinct', new Set(metas.map((m) => m.title)).size === 6);

/* ── Empty filter result degrades cleanly, per panel ─────────────────────── */
const none = run(`atlasView({ only: 'D', cat: 'bev', type: 'delist' })`);
ok('an impossible filter still renders a readable panel', typeof none === 'string' && none.length > 200);

console.log(`\n${pass} assertions passed`);
if (fails.length) {
  console.log(`${fails.length} FAILED:`);
  fails.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log('atlas panel outputs verified');
