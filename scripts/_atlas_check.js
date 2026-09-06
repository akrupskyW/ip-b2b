/* Render-check the Intervention Atlas without a browser.
 *
 * Pulls the page's big inline script out of pages/wiseai.html, runs it in a vm
 * against a permissive DOM stub, then calls every atlas view and asserts on the
 * HTML it returns. Catches the things that actually break these artifacts:
 * a throw inside a render function, a missing helper, an undefined interpolated
 * into the markup, or a panel that silently renders empty.
 *
 *   node scripts/_atlas_check.js
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'pages', 'wiseai.html'), 'utf8');
const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
/* The page's main script is an ES module. Strip its imports and provide the
   three symbols it pulls in, so the whole body can run as a plain script in a
   vm context and its top-level declarations stay reachable for the checks. */
const IMPORT_STUBS = `
  const mountWISEcodeAIChat = () => ({ addWISEcodeAI: () => null, addUser: () => null, setIntents: () => null });
  const OWL_BUG = '<span class="owl-bug"></span>';
  const owlProgressionCarouselHtml = () => '<div class="owl-carousel"></div>';
  const saveGeneratedReport = () => null;
`;
const body = IMPORT_STUBS + blocks.reduce((a, b) => (b.length > a.length ? b : a), '')
  .replace(/^\s*import\s[^;]*;\s*$/gm, '');

/* A DOM stub that answers anything. The atlas render functions are pure string
 * builders, but they live in a script that wires listeners at load time, so the
 * stub only has to keep that wiring from throwing. */
const noop = () => {};
function stubNode() {
  const node = new Proxy({
    style: new Proxy({}, { get: () => noop, set: () => true }),
    classList: { add: noop, remove: noop, contains: () => false, toggle: noop },
    dataset: {},
    children: [], childNodes: [], childElementCount: 0,
    textContent: '', innerHTML: '', innerText: '', value: '',
    attributes: [],
  }, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'parentElement' || k === 'parentNode' || k === 'firstElementChild'
        || k === 'nextElementSibling' || k === 'previousElementSibling'
        || k === 'closest' || k === 'querySelector') return () => null;
      if (k === 'querySelectorAll' || k === 'getElementsByClassName') return () => [];
      if (typeof k === 'symbol') return undefined;
      return noop;
    },
    set: () => true,
  });
  return node;
}
const doc = new Proxy({
  documentElement: stubNode(),
  body: stubNode(),
  head: stubNode(),
  readyState: 'complete',
  addEventListener: noop, removeEventListener: noop,
  createElement: () => stubNode(),
  createTextNode: () => stubNode(),
  createDocumentFragment: () => stubNode(),
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementsByClassName: () => [],
  cookie: '',
}, { get(t, k) { return k in t ? t[k] : noop; }, set: () => true });

const store = {};
const sandbox = {
  document: doc,
  console,
  location: { pathname: '/pages/wiseai.html', search: '', href: 'http://x/pages/wiseai.html', hash: '' },
  navigator: { userAgent: 'node', language: 'en-US', maxTouchPoints: 0, clipboard: {} },
  localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; }, clear: () => {} },
  sessionStorage: { getItem: () => null, setItem: noop, removeItem: noop },
  screen: { width: 1512, height: 982 },
  innerWidth: 1440, innerHeight: 900, devicePixelRatio: 2,
  matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop }),
  requestAnimationFrame: (fn) => setTimeout(fn, 0),
  cancelAnimationFrame: noop,
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: noop,
  addEventListener: noop, removeEventListener: noop,
  IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
  MutationObserver: class { observe() {} disconnect() {} },
  ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
  MouseEvent: class {}, CustomEvent: class {}, Event: class {},
  getComputedStyle: () => new Proxy({}, { get: () => '' }),
  fetch: () => Promise.resolve({ ok: false, json: () => Promise.resolve({}), text: () => Promise.resolve('') }),
  performance: { now: () => Date.now() },
  URL, URLSearchParams, TextEncoder, TextDecoder,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.self = sandbox;

const ctx = vm.createContext(sandbox);
try {
  vm.runInContext(body, ctx, { filename: 'wiseai-inline.js' });
} catch (e) {
  console.log('script body threw at load (stub limitation, continuing):', e.message);
}

let fails = 0;
const ok = (cond, label, extra) => {
  if (!cond) fails += 1;
  console.log((cond ? 'PASS  ' : 'FAIL  ') + label + (extra ? '  ' + extra : ''));
};

function render(expr, label) {
  try {
    const out = vm.runInContext(expr, ctx);
    if (typeof out !== 'string' || !out.length) { ok(false, label, 'returned ' + typeof out); return ''; }
    const bad = [];
    if (/undefined/.test(out)) bad.push('contains "undefined"');
    if (/\bNaN\b/.test(out)) bad.push('contains NaN');
    if (/\[object Object\]/.test(out)) bad.push('stringified an object');
    if (/\$\{/.test(out)) bad.push('unresolved template literal');
    ok(!bad.length, label, bad.length ? bad.join(', ') : out.length.toLocaleString('en-US') + ' chars');
    return out;
  } catch (e) {
    ok(false, label, 'THREW ' + e.message);
    return '';
  }
}

const count = (s, re) => (s.match(re) || []).length;

console.log('\n=== data ===');
ok(vm.runInContext('typeof atlasView', ctx) === 'function', 'atlasView is defined');
ok(vm.runInContext('ATLAS_IVS.length', ctx) === 12, 'twelve interventions');
ok(vm.runInContext('ATLAS_DIMS.length', ctx) === 10, 'ten dimensions');
ok(vm.runInContext('ATLAS_POPS.length', ctx) === 6, 'six populations');
ok(vm.runInContext('ATLAS_STAGES.length', ctx) === 8, 'eight causal stages');
ok(vm.runInContext('ATLAS_LOOPS.length', ctx) === 6, 'six feedback loops');
ok(vm.runInContext('Object.keys(ATLAS_WEIGHTS).length', ctx) === 3, 'three weighting systems');
ok(vm.runInContext('ATLAS_TOTAL', ctx) === 150479, 'reported baseline total is 150,479',
  String(vm.runInContext('ATLAS_TOTAL', ctx)));
ok(vm.runInContext('ATLAS_CAT_SUM', ctx) === 145916, 'the twelve rows sum to 145,916',
  String(vm.runInContext('ATLAS_CAT_SUM', ctx)));
/* The screenshot's own percentages are computed against the reported total, so
   this is the check that the two numbers have not been conflated. */
ok(Math.abs(vm.runInContext('(ATLAS_CATS[0].count / ATLAS_TOTAL) * 100', ctx) - 19.6) < 0.05,
  'nuts & seeds comes out at 19.6% as reported');
ok(vm.runInContext('ATLAS_PL_TOTAL', ctx) === 85740, 'private-label denominator is 85,740');
ok(vm.runInContext('ATLAS_CATS.every(c => c.alt === 0)', ctx), 'healthy-alternative flag is 0 in every category');
ok(vm.runInContext('ATLAS_IVS.every(iv => iv.hLo < iv.health && iv.health < iv.hHi)', ctx),
  'every health estimate sits inside its own interval');
ok(vm.runInContext('ATLAS_IVS.every(iv => ATLAS_DIMS.every(d => typeof iv.dims[d.id] === "number"))', ctx),
  'every intervention scores all ten dimensions');
ok(vm.runInContext('ATLAS_IVS.every(iv => ATLAS_POPS.every(p => typeof iv.pops[p.id] === "number"))', ctx),
  'every intervention has a value for all six populations');
ok(vm.runInContext('Object.values(ATLAS_WEIGHTS).every(w => Math.abs(Object.values(w.w).reduce((a,b)=>a+b,0) - 1) < 1e-9)', ctx),
  'each weighting system sums to 1.0');
ok(vm.runInContext('ATLAS_IVS.every(iv => iv.cats.every(c => ATLAS_CATS.some(x => x.id === c)))', ctx),
  'every intervention maps to real categories');
ok(vm.runInContext('ATLAS_IVS.every(iv => !!ATLAS_EVID[iv.evid] && !!ATLAS_RISK[iv.risk])', ctx),
  'every evidence tier and risk tier resolves');

console.log('\n=== panels A-F, default state ===');
const atlas = render('atlasView()', 'atlasView() renders');
ok(count(atlas, /class="atl-panel-title"/g) === 6, 'six panel titles', String(count(atlas, /class="atl-panel-title"/g)));
['Intervention opportunity map', 'Multivariable intervention matrix', 'Causal pathway',
  'Population differences', 'Financial and operational consequences', 'Recommendation frontier']
  .forEach((t) => ok(atlas.includes(t), 'panel present: ' + t));
ok(count(atlas, /circle class="atl-bubble/g) >= 12 || count(atlas, /class="atl-bubble/g) >= 12,
  'opportunity map draws a bubble per intervention', String(count(atlas, /atl-bubble/g)));
ok(count(atlas, /class="atl-mx-cell"/g) === 120, 'matrix is 12 x 10 cells', String(count(atlas, /class="atl-mx-cell"/g)));
ok(count(atlas, /class="atl-pop-row"/g) === 6, 'population panel has six rows');
ok(count(atlas, /<tr>/g) >= 12, 'consequence ledger has a row per intervention');
ok(count(atlas, /atl-stage/g) >= 16, 'causal chain renders its stages');
ok(atlas.includes('synthetic scenario estimate'), 'provenance banner marks the modeled data');
ok(atlas.includes('0 of 85,740'), 'banner states the empty private-label result');
ok(count(atlas, /atl-loop-mark--solid/g) >= 1 && count(atlas, /atl-loop-mark--dashed/g) >= 1
  && count(atlas, /atl-loop-mark--dotted/g) >= 1, 'all three loop line styles are used');
ok(count(atlas, /data-tip="/g) > 100, 'tooltips on scores', String(count(atlas, /data-tip="/g)) + ' tips');
ok(count(atlas, /data-atlas-set="atlasW:/g) === 3, 'three weighting buttons');
ok(count(atlas, /data-atlas-set="atlasCat:/g) === 7, 'seven category filters');
ok(count(atlas, /data-atlas-set="atlasEvid:/g) === 4, 'evidence filter + "any"');
ok(count(atlas, /data-atlas-set="atlasPop:/g) === 7, 'six populations + "all shoppers"');
ok(count(atlas, /data-atlas-set="atlasType:/g) === 7, 'six levers + "all levers"');
ok(atlas.includes('Five strongest actions') && atlas.includes('Five most uncertain')
  && atlas.includes('Three experiments worth running'), 'closing read has all three lists');
ok(count(atlas, /class="atl-close-list"/g) === 3, 'three closing lists');
ok(!/wa-chart-card/.test(atlas), 'atlas uses .atl-card, never .wa-chart-card (no type switcher)');

console.log('\n=== every weighting, filter and selection ===');
Object.keys(vm.runInContext('ATLAS_WEIGHTS', ctx)).forEach((w) => {
  const out = render(`atlasView({ w: ${JSON.stringify(w)} })`, 'weighting: ' + w);
  ok(out.includes('atl-dom') || out.includes('nothing in the filtered set is dominated'),
    '  frontier reports dominance under ' + w);
});
vm.runInContext('ATLAS_CAT_GROUPS.map(g => g.id)', ctx).forEach((c) => {
  render(`atlasView({ cat: ${JSON.stringify(c)} })`, 'category filter: ' + c);
});
vm.runInContext('ATLAS_TYPES', ctx).forEach((t) => {
  render(`atlasView({ type: ${JSON.stringify(t)} })`, 'lever filter: ' + t);
});
Object.keys(vm.runInContext('ATLAS_EVID', ctx)).forEach((e) => {
  render(`atlasView({ evid: ${JSON.stringify(e)} })`, 'evidence filter: ' + e);
});
vm.runInContext('ATLAS_POPS.map(p => p.id)', ctx).forEach((p) => {
  const out = render(`atlasView({ pop: ${JSON.stringify(p)} })`, 'population: ' + p);
  ok(/atl-pop-val/.test(out), '  population panel still renders for ' + p);
});
vm.runInContext('ATLAS_IVS.map(iv => iv.id)', ctx).forEach((id) => {
  render(`atlasView({ sel: ${JSON.stringify(id)} })`, 'selected: ' + id);
});

console.log('\n=== combinations that empty the board, and bad input ===');
const empty = render('atlasView({ cat: "prod", type: "Assortment" })', 'filters that match nothing');
ok(empty.includes('atl-empty'), '  falls back to an explicit empty state');
render('atlasView({ w: "nope", cat: "nope", type: "nope", evid: "nope", pop: "nope", sel: "nope" })',
  'every filter set to garbage still renders');
render('atlasView({ cat: "bev", pop: "lowincome", w: "profit" })', 'narrowed + re-weighted + population');
render('atlasView({ cat: "bev", sel: "delist" })', 'selection excluded by the active filter');

console.log('\n=== the other three outputs and the follow-ups ===');
const base = render('atlasBaselineView()', 'atlasBaselineView() renders');
ok(count(base, /<tr>/g) === 13, 'baseline table has a header plus a row per category', String(count(base, /<tr>/g)));
ok(base.includes('Healthy alternative is 0.0%'), 'baseline names the missing healthy-alternative flag');
ok(count(base, /dash-breakdown-bar"/g) === 12, 'baseline draws a bar per category',
  String(count(base, /dash-breakdown-bar"/g)));
ok(count(base, /data-target-width/g) === 12, 'every bar animates its fill');

const pl = render('atlasPlShareView()', 'atlasPlShareView() renders');
ok(count(pl, /0\.00%/g) >= 7, 'private-label table reports the zero for all seven categories');
ok(pl.includes('empty result, not a zero share'), 'private-label caveat is in an .atl-flag, not the hidden foot');
ok(!/wa-kraft-foot/.test(pl), 'no caveat parked in a class the pane hides');

const rep = render('atlasReportView()', 'atlasReportView() renders');
['1 \u00b7 Method', '2 \u00b7 Dimension definitions', '3 \u00b7 Results', '4 \u00b7 Threats to validity',
  '5 \u00b7 Conclusion', '6 \u00b7 Recommended experiments']
  .forEach((s) => ok(rep.includes(s), 'report section: ' + s.replace(/\u00b7/, '-')));
ok(count(rep, /<tr>/g) >= 22, 'report tables carry all interventions and all dimensions');

const cov = render('atlasPlCoverageView()', 'atlasPlCoverageView() renders');
ok(count(cov, /Not populated/g) === 5, 'coverage table checks five retailers');
const ret = render('atlasRetailerView()', 'atlasRetailerView() renders');
ok(ret.includes('Retailer framing is sourced; retailer numbers are not'),
  'retailer cut states what is and is not grounded');

console.log('\n=== references ===');
const refs = render('newsRefsView("atlas_refs")', 'newsRefsView("atlas_refs") renders');
ok(count(refs, /class="wa-ref /g) + count(refs, /class="wa-ref"/g) === 17, 'seventeen reference cards',
  String(count(refs, /class="wa-ref[ "]/g)));
ok(count(refs, /wa-ref-group/g) === 2, 'two labelled groups');
ok(refs.includes('Peer-reviewed evidence') && refs.includes('Industry sources'), 'group headings present');
ok(count(refs, /class="wa-ref-stat(?: is-active)?"/g) === 4, 'four filter scorecards',
  String(count(refs, /class="wa-ref-stat(?: is-active)?"/g)));
ok(count(refs, /class="wa-ref-abstract"/g) === 8, 'an abstract on each of the eight papers',
  String(count(refs, /class="wa-ref-abstract"/g)));
ok(count(refs, /class="wa-ref-view" href="https/g) === 8, 'eight papers link out',
  String(count(refs, /class="wa-ref-view" href="https/g)));
ok(count(refs, />File</g) === 17, 'a stored file on every source');
ok(count(refs, /wa-ref-badge--inline/g) === 6, 'sources with no highlight get an inline badge');
ok(count(refs, /wa-ref--industry/g) === 9, 'nine industry cards tagged');
ok(refs.includes('doi.org'), 'papers link to their DOI');
const mini = render('newsRefsMini("atlas_refs", "paper")', 'newsRefsMini(paper) renders');
ok(count(mini, /wa-refs-mini-item/g) === 8, 'transcript footnote list shows the eight papers');
ok(/wa-refs-mini-n">1</.test(mini) && /wa-refs-mini-n">8</.test(mini), 'footnotes numbered 1-8');
const cite = render('newsCite("atlas_refs", 8, 6)', 'newsCite renders a footnote marker');
ok(cite.includes('data-news-i="7"') && cite.includes('data-news-i="5"'), 'citation markers are 1-indexed');

console.log('\n=== transcript wiring ===');
ok(vm.runInContext('INTENTS[0].intent', ctx) === 'atlas', 'atlas is the first intent chip');
ok(vm.runInContext('INTENTS[0].label', ctx) === 'Food Intervention Atlas', 'three-word chip label',
  vm.runInContext('INTENTS[0].label', ctx));
ok(vm.runInContext('INTENTS[0].label.trim().split(/\\s+/).length', ctx) === 3, 'label is exactly three words');
ok(!vm.runInContext('"title" in INTENTS[0] || "tip" in INTENTS[0] || "dataTip" in INTENTS[0]', ctx),
  'chip carries no tooltip');
const ask = vm.runInContext('INTENTS[0].ask', ctx);
ok(ask.length > 4000, 'chip runs the full brief, not a summary', ask.length + ' chars');
['Panel A', 'Panel B', 'Panel C', 'Panel D', 'Panel E', 'Panel F', 'uncertainty intervals',
  'public-health, balanced-business and profit-protection', 'five strongest actions']
  .forEach((frag) => ok(ask.includes(frag), 'brief keeps: ' + frag));
ok(vm.runInContext('ATLAS_FOLLOWUPS.length', ctx) === 6, 'six follow-up chips');
ok(vm.runInContext('INTENTS[0].nextIntents === ATLAS_FOLLOWUPS', ctx), 'atlas trails its follow-ups');
ok(vm.runInContext('ATLAS_FOLLOWUPS.every(c => c.nextIntents && c.nextIntents.length === 5)', ctx),
  'every follow-up trails the other five, so no transcript dead-ends');
ok(vm.runInContext('ATLAS_FOLLOWUPS.every(c => typeof INTENT_REPLIES[c.intent] !== "undefined")', ctx),
  'every follow-up has a scripted reply');
ok(vm.runInContext('typeof INTENT_REPLIES.atlas === "string"', ctx), 'atlas has a reply');
ok(vm.runInContext('INTENT_REPLIES.atlas.includes("Built the atlas.")', ctx), 'reply opens on "Built the atlas."');
['synthetic scenario estimates', 'Observed category baselines are grounded',
  'Evidence strength is visually separated', 'private-label']
  .forEach((frag) => ok(vm.runInContext(`INTENT_REPLIES.atlas.includes(${JSON.stringify(frag)})`, ctx),
    'reply keeps integrity choice: ' + frag));
ok(vm.runInContext('topicOf("atlas") === "atlas" && topicOf("atlas_bev") === "atlas"', ctx),
  'atlas intents share one topic');
['COMPARE_SURFACE', 'REPORT_SURFACE', 'SPIDER_SURFACE'].forEach((m) => {
  ok(vm.runInContext(`!!${m}.atlas`, ctx), m + ' routes the atlas topic');
});
['compare', 'report', 'spider'].forEach((g) => {
  ok(vm.runInContext(`!!GENERIC_CHIP_COPY[${JSON.stringify(g)}].atlas`, ctx),
    'generic "' + g + '" chip has atlas copy');
});
ok(html.includes("intent: 'atlas', ask: ATLAS_ASK"), 'welcome scorecard runs the same brief');
ok(html.includes("if (intent === 'atlas') {"), 'surface() has an atlas branch');
ok(html.includes("surfaceAtlasPanels({ reset: true, fullTurn: true })"),
  'the atlas turn surfaces the full set of ten outputs');
const sap = html.slice(html.indexOf('function surfaceAtlasPanels'), html.indexOf('function atlasReadout'));
ok((sap.match(/surfaceBlock\(/g) || []).length === 4,
  'six charts (one call) + closing read + two baselines are queued');
ok(/surfaceNewsRefs\('atlas_refs'/.test(sap), 'and the references card is the tenth');
ok(/fullTurn \? 3 : 0/.test(sap), 'the rail lead counts ten on the first turn');
ok(!/inTranscript:\s*false/.test(sap), 'none of the ten stay off the transcript');
ok(vm.runInContext('INTENT_REPLIES.atlas.includes("ten outputs")', ctx),
  'the reply names the ten outputs');
['atlas_report', 'atlas_pl', 'atlas_bev', 'atlas_baseline', 'atlas_profit', 'atlas_retailer']
  .forEach((id) => ok(html.includes(`intent === '${id}'`), 'surface() branch for ' + id));

console.log('\n' + (fails ? fails + ' CHECK(S) FAILED' : 'ALL CHECKS PASSED'));
process.exit(fails ? 1 : 0);
