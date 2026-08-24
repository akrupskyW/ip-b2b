/**
 * Progress Log evaluator — inventories every HTML page (and a small set of
 * shared scripts) and turns a start-of-day snapshot into categorized
 * descriptions: features, UX/UI, modules, logic, deletions.
 *
 * Used by pages/progress-log.html. Deterministic: same baseline + same files
 * always produce the same sentences, in the same order.
 */

import { pageGalleryEntries } from './module-directory-data.js';

export const CRAWL_KEY = 'wise-progress-log-crawl-v2';
export const CRAWL_KEY_LEGACY = 'wise-progress-log-crawl-v1';

/* Pages the catalog does not list but that still ship as HTML. */
const EXTRA_HTML = ['page-gallery.html', 'app-vision-deck.html'];

export const SHARED_SCRIPTS = [
  '../js/wiseai-chat.js',
  '../js/all-modules-flow.js',
  '../js/appearance-menu.js',
  '../js/topbar.js',
  '../js/owl-walkthrough.js',
  '../js/chat-ask.js',
  '../js/chat-history.js',
  '../js/agent-menu.js',
  '../js/app-search.js',
  '../js/progress-log-eval.js',
  'wise.css',
];

/* Product-language signals. Presence/absence becomes a full sentence. */
export const FEATURE_SIGNALS = [
  { id: 'chat', cat: 'features', re: /mountWISEcodeAIChat|wiseai-chat\.js|id=["']pl-chat["']|id=["']chat-shell["']/,
    on: 'Hosts the shared WISEcodeAI chat module — the same mount as wiseai.html.',
    off: 'The shared WISEcodeAI chat module is no longer on this page.' },
  { id: 'ask', cat: 'features', re: /What can I ask|chat-ask\.js|ask-catalog|mountAsk/,
    on: '“What can I ask?” can open inside the chat and break out. The panel headline uses the brand serif face.',
    off: 'The “What can I ask?” catalog is no longer wired on this page.' },
  { id: 'chips', cat: 'features', re: /intent-chip|setIntents\s*\(|nextIntents|ws-intent-chip|INTENT_REPLIES/,
    on: 'Intent chips are present. Each chip is meant to open a real transcript, and answers should trail related follow-up chips — never a dead-end reply.',
    off: 'Intent chips were removed from this surface.' },
  { id: 'helix', cat: 'ux', re: /trace-helix|helix-canvas|bgAnim|helix\.js/,
    on: 'Helix background animation is wired. Chat-module parity keeps it on by default at 20% opacity.',
    off: 'Helix background animation is no longer referenced.' },
  { id: 'history', cat: 'features', re: /chat-history|History & Projects|historyBreakout|historyKey/,
    on: 'History & Projects is wired — the three-dot menu can open the sticky history module.',
    off: 'History & Projects is no longer wired on this page.' },
  { id: 'sticky', cat: 'features', re: /sticky-modules|modules-sticky|stickyModules/,
    on: 'Sticky modules are enabled — modules to the right of chat tuck as drawers. There is no sticky on/off toggle.',
    off: 'Sticky modules were removed from this page.' },
  { id: 'threedot', cat: 'components', re: /panel-more-btn|more_vert/,
    on: 'The three-dot module menu is present (Share, Copy link, Export, and the page’s own items).',
    off: 'The three-dot module menu was removed.' },
  { id: 'countup', cat: 'ux', re: /data-countup|count-up-all|count-up\.js/,
    on: 'Scorecard numbers use the shared count-up animation.',
    off: 'Count-up animation is no longer referenced.' },
  { id: 'dark', cat: 'ux', re: /html\.dark|wise-theme|chat-theme|classList\.toggle\(\s*['"]dark['"]/,
    on: 'Dark-mode theme wiring is present (wise-theme / chat-theme, dark class on html) so the page keeps light/dark parity.',
    off: 'Dark-mode theme wiring was removed.' },
  { id: 'serif', cat: 'ux', re: /Noto Serif|--module-title-family|WISE Digits['"],\s*['"]Noto Serif/,
    on: 'Headlines use the brand serif face (Noto Serif / WISE Digits), matching wiseai.html.',
    off: 'The brand serif headline face is no longer referenced.' },
  { id: 'cwr', cat: 'features', re: /cwr-toggle|Crawl · Walk · Run|cwr-mode/,
    on: 'Crawl · Walk · Run is on the page (Run by default).',
    off: 'Crawl · Walk · Run was removed.' },
  { id: 'width', cat: 'ux', re: /WPaneWidth|panel-width-toggle|width_normal/,
    on: 'The four-step module width toggle is present (single / double / triple / fill).',
    off: 'The module width toggle was removed.' },
  { id: 'appearance', cat: 'features', re: /buildAppearanceBody|appearance-menu/,
    on: 'Appearance & Admin is mounted from the shared appearance menu.',
    off: 'The Appearance menu was removed.' },
  { id: 'nav', cat: 'components', re: /mountAgentMenu|agent-menu\.js/,
    on: 'Shared primary navigation (agent-menu) is mounted from the wiseai.html shell.',
    off: 'Shared primary navigation was removed.' },
  { id: 'walkthrough', cat: 'features', re: /owl-walkthrough|WiseWalkthrough/,
    on: 'The WISEowl walkthrough can open on this page.',
    off: 'The WISEowl walkthrough was removed.' },
  { id: 'search', cat: 'features', re: /app-search|data-app-search/,
    on: 'App-wide search is wired on this page.',
    off: 'App-wide search is no longer wired.' },
  { id: 'scorecards', cat: 'components', re: /data-countup|pl-stat|rf-stat|mi-stat(?!-text)/,
    on: 'Scorecards are on the page — no eyebrow; numbers count up.',
    off: 'Scorecards were removed.' },
  { id: 'popover', cat: 'ux', re: /wise-popover|lir-tooltip|data-tip=/,
    on: 'Popovers and icon tooltips are present. They should anchor above or to the right of the trigger, never directly below.',
    off: 'Popover / tooltip chrome was removed.' },
  { id: 'nfp', cat: 'features', re: /nutrition-facts|Nutrition Facts|nfp-/,
    on: 'A Nutrition Facts panel is on this page (must stay legible in both themes).',
    off: 'The Nutrition Facts panel was removed.' },
  { id: 'auth', cat: 'logic', re: /auth-guard\.js|auth\.js/,
    on: 'Auth guard is on — unsigned visitors are sent to sign-in.',
    off: 'Auth guard was removed.' },
  { id: 'streaming', cat: 'ux', re: /streamParagraph|trailChips|paragraph-by-paragraph|streamReply/,
    on: 'Streaming is paragraph-by-paragraph (then thumbs, then trailing intent chips) — not word-by-word typing.',
    off: 'Paragraph streaming helpers were removed.' },
  { id: 'lockedComposer', cat: 'ux', re: /composer-lock|lock_outline|readonly.*Ask about/,
    on: 'Composer is locked (readonly / lock icon).',
    off: 'Composer is unlocked — typing is live, matching chat-module parity.' },
  { id: 'jam', cat: 'features', re: /jam-strip|isJamStripOn/,
    on: 'Jam strip (transport + equalizer) is wired.',
    off: 'Jam strip was removed.' },
];

const MODULE_TITLE_SEL = [
  'h1', 'h2',
  '[class$="-head-title"]',
  '[class$="-module-title"]',
  '[class$="-hero-title"]',
  '[class*="head-title"]',
  '.mi-module-title',
  '.mi-hero-title',
  '.wch-head-title',
  '.sc-heading',
].join(',');

const ICON_ONLY = /^(more_vert|width_normal|width_wide|width_full|autorenew|close|check|add|edit|search|tune|chevron_left|chevron_right|expand_more|unfold_more|unfold_less|restart_alt|edit_note|today|widgets|bolt|note_add|trending_up|delete|forum|history|hub|alt_route)$/i;

export function hashStr(s) {
  let h = 5381;
  const str = String(s || '');
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function fmtBytes(n) {
  const v = Math.abs(Number(n) || 0);
  if (v < 1024) return v + ' B';
  if (v < 1024 * 1024) return (v / 1024).toFixed(v < 10240 ? 1 : 0) + ' KB';
  return (v / (1024 * 1024)).toFixed(1) + ' MB';
}

export function oxford(items) {
  const list = (items || []).filter(Boolean);
  if (!list.length) return '';
  if (list.length === 1) return list[0];
  if (list.length === 2) return list[0] + ' and ' + list[1];
  return list.slice(0, -1).join(', ') + ', and ' + list[list.length - 1];
}

export function displayPath(path) {
  return String(path || '').replace(/^\.\.\//, '').replace(/^js\//, '');
}

export function isHtmlPath(path) {
  return /\.html(?:$|\?)/i.test(String(path || ''));
}

function cleanText(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function uniqSorted(arr, cap) {
  const out = [...new Set((arr || []).map(cleanText).filter(Boolean))];
  out.sort((a, b) => a.localeCompare(b));
  return cap ? out.slice(0, cap) : out;
}

function quoteList(items, max = 8) {
  const list = (items || []).filter(Boolean);
  if (list.length <= max) return oxford(list.map((s) => '“' + s + '”'));
  return list.slice(0, max).map((s) => '“' + s + '”').join(', ') + ', and ' + (list.length - max) + ' more';
}

function labelMap() {
  const map = {
    'page-gallery.html': 'Page Gallery',
    'app-vision-deck.html': 'App Vision Deck',
    'wise.css': 'Platform-wide',
    '../js/wiseai-chat.js': 'Shared chat',
    '../js/all-modules-flow.js': 'All Modules',
    '../js/appearance-menu.js': 'Appearance & Admin',
    '../js/topbar.js': 'Appearance & Admin',
    '../js/owl-walkthrough.js': 'WISEowl walkthrough',
    '../js/chat-ask.js': 'What can I ask?',
    '../js/chat-history.js': 'History & Projects',
    '../js/agent-menu.js': 'Primary navigation',
    '../js/app-search.js': 'App search',
    '../js/progress-log-eval.js': 'Progress Log evaluator',
  };
  pageGalleryEntries().forEach((m) => {
    const href = String(m.href || '').split('#')[0];
    if (href && m.label) {
      const area = m.areaTitle === 'Marketing site' ? 'Marketing · ' : '';
      if (!map[href]) map[href] = area + m.label;
    }
  });
  return map;
}

export function catalogHtmlPaths() {
  const set = new Set(EXTRA_HTML);
  pageGalleryEntries().forEach((m) => {
    const href = String(m.href || '').split('#')[0].split('?')[0];
    if (href) set.add(href);
  });
  return [...set].sort();
}

/* Friendly product area for a path (e.g. "Portfolio", "Admin", "Marketing
   site") pulled from the same hand-maintained catalog the nav uses. Lets the
   generated synopsis say what kind of surface a page is, in plain words. */
function areaTitleMap() {
  const map = {};
  pageGalleryEntries().forEach((m) => {
    const href = String(m.href || '').split('#')[0];
    if (href && m.areaTitle) map[href] = m.areaTitle;
  });
  return map;
}

export function areaTitleForPath(path) {
  const map = areaTitleMap();
  const p = String(path || '');
  const base = p.split('/').pop();
  return map[p] || map[base] || map['../' + base] || '';
}

export function defaultFileLabel(path, title) {
  const labels = labelMap();
  if (labels[path]) return labels[path];
  const base = String(path || '').split('/').pop();
  if (labels[base]) return labels[base];
  if (labels['../' + base]) return labels['../' + base];
  const cleaned = cleanText(String(title || '').replace(/^WISE(?:codeAI)?\s*[·•\-–]\s*/i, ''));
  if (cleaned && cleaned !== path && cleaned !== base) return cleaned;
  return displayPath(path);
}

export async function discoverHtmlPaths(fetchText) {
  const found = new Set(catalogHtmlPaths());
  const tryList = async (url, prefix) => {
    if (typeof fetchText !== 'function') return;
    try {
      const html = await fetchText(url);
      if (!html || !/Directory listing|Index of/i.test(html)) return;
      const re = /href=["']([^"'#?]+?\.html)["']/gi;
      let m;
      while ((m = re.exec(html))) {
        const name = m[1].split('/').pop();
        if (!name || name.startsWith('_') || name.startsWith('.')) continue;
        found.add(prefix + name);
      }
    } catch (_) { /* listing not available */ }
  };
  await Promise.all([
    tryList('./', ''),
    tryList('../', '../'),
  ]);
  return [...found].sort();
}

function parseHtml(text) {
  try {
    if (typeof DOMParser !== 'undefined') return new DOMParser().parseFromString(text, 'text/html');
  } catch (_) {}
  return null;
}

function pushHeading(list, text) {
  const t = cleanText(text);
  if (!t || t.length < 2 || t.length > 140) return;
  if (ICON_ONLY.test(t)) return;
  list.push(t);
}

function extractFunctions(text) {
  const out = [];
  const re = /(?:^|[\n;])\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]{2,})\s*\(/g;
  let m;
  while ((m = re.exec(text))) out.push(m[1]);
  return uniqSorted(out, 60);
}

function extractSectionHeads(text) {
  const out = [];
  const re = /(?:\/\*\s*[─═]+\s*|<!--\s*[─═]+\s*\d*\s*[·•\-]?\s*)([A-Za-z][^—*\/<\n]{6,80})/g;
  let m;
  while ((m = re.exec(text))) out.push(cleanText(m[1]).replace(/\s*═+\s*$/, ''));
  return uniqSorted(out, 24);
}

function extractCopy(text, doc) {
  const out = [];
  if (doc) {
    doc.querySelectorAll('[aria-label], [placeholder], button, .pl-head-title, [class$="-head-title"], [class$="-hero-title"]').forEach((el) => {
      const t = cleanText(el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.textContent);
      if (t && t.length >= 8 && t.length <= 90 && !ICON_ONLY.test(t)) out.push(t);
    });
  }
  const re = /['"]([A-Z][^'"\n]{22,88})['"]/g;
  let m;
  let n = 0;
  while ((m = re.exec(text)) && n < 40) {
    const t = cleanText(m[1]);
    if (/^(https?:|function |import |const |var |let )/.test(t)) continue;
    if (/[{}<>]/.test(t)) continue;
    out.push(t);
    n++;
  }
  return uniqSorted(out, 30);
}

function extractClasses(doc, text) {
  const out = [];
  if (doc) {
    doc.querySelectorAll('[class]').forEach((el) => {
      String(el.className || '').split(/\s+/).forEach((c) => {
        if (/^(pl|rf|mi|sc|wa|nfp|lib|adm|ws|pf|gs|ar|aid|att|upf|sa)-[a-z0-9-]{2,}$/.test(c)) out.push(c);
      });
    });
  } else {
    const re = /\.(pl|rf|mi|sc|wa|nfp|lib|adm|ws|pf|gs|ar|aid|att|upf|sa)-([a-z0-9-]{2,})/g;
    let m;
    while ((m = re.exec(text))) out.push(m[1] + '-' + m[2]);
  }
  return uniqSorted(out, 50);
}

function extractScripts(doc, text) {
  const out = [];
  if (doc) {
    doc.querySelectorAll('script[src]').forEach((el) => {
      const src = String(el.getAttribute('src') || '').split('?')[0];
      if (!src || /livereload|snipver/i.test(src)) return;
      out.push(src.replace(/^\.\.\//, '').replace(/^\.\//, ''));
    });
  } else {
    const re = /<script[^>]+src=["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(text))) {
      const src = m[1].split('?')[0];
      if (/livereload|snipver/i.test(src)) continue;
      out.push(src.replace(/^\.\.\//, '').replace(/^\.\//, ''));
    }
  }
  return uniqSorted(out, 40);
}

function extractChips(doc, text) {
  const out = [];
  if (doc) {
    doc.querySelectorAll('.intent-chip, .ws-intent-chip, .sc-chip, button[data-intent]').forEach((el) => {
      const t = cleanText(el.textContent);
      if (t && t.length < 48 && !ICON_ONLY.test(t) && !/^[a-z]{2,}[A-Z]/.test(t)) out.push(t);
    });
  }
  const re = /intent:\s*['"]([^'"]{3,40})['"][\s\S]{0,80}label:\s*['"]([^'"]{3,48})['"]/g;
  let m;
  while ((m = re.exec(text))) {
    const t = cleanText(m[2]);
    if (t && !ICON_ONLY.test(t)) out.push(t);
  }
  return uniqSorted(out, 24);
}

function extractButtons(doc) {
  const out = [];
  if (!doc) return out;
  doc.querySelectorAll('button, [role="button"]').forEach((el) => {
    const t = cleanText(el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent);
    if (!t || t.length < 3 || t.length > 48 || ICON_ONLY.test(t)) return;
    if (/^[a-z]{2,}[A-Z]/.test(t)) return;
    out.push(t);
  });
  return uniqSorted(out, 30);
}

function extractModules(doc, text) {
  const out = [];
  if (doc) {
    doc.querySelectorAll(MODULE_TITLE_SEL).forEach((el) => {
      pushHeading(out, el.textContent);
    });
  }
  const commentRe = /[═]{3,}\s*\d+\s*[·•\-]\s*([^\n═<]{3,80})/g;
  let m;
  while ((m = commentRe.exec(text))) pushHeading(out, m[1]);
  return uniqSorted(out, 40);
}

function extractHeadings(doc, text) {
  const out = [];
  if (doc) {
    doc.querySelectorAll('h1, h2, h3').forEach((el) => pushHeading(out, el.textContent));
  } else {
    const re = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
    let m;
    while ((m = re.exec(text))) pushHeading(out, m[1].replace(/<[^>]+>/g, ''));
  }
  return uniqSorted(out, 50);
}

function detectSignals(text) {
  return FEATURE_SIGNALS.filter((s) => s.re.test(text)).map((s) => s.id);
}

export function emptyCats() {
  return {
    components: [],
    features: [],
    logic: [],
    ux: [],
    changes: [],
    improvements: [],
    updates: [],
    deletions: [],
  };
}

export function inventoryDoc(path, text) {
  const src = String(text || '');
  const html = isHtmlPath(path) || /<html[\s>]/i.test(src);
  const js = /\.js(?:$|\?)/i.test(path);
  const css = /\.css(?:$|\?)/i.test(path);
  const doc = html ? parseHtml(src) : null;
  const title = (doc && doc.querySelector('title') && cleanText(doc.querySelector('title').textContent)) || path;
  return {
    path,
    title,
    size: src.length,
    hash: hashStr(src),
    headings: html ? extractHeadings(doc, src) : extractSectionHeads(src),
    modules: html ? extractModules(doc, src) : extractSectionHeads(src),
    scripts: html ? extractScripts(doc, src) : [],
    chips: extractChips(doc, src),
    buttons: html ? extractButtons(doc) : [],
    signals: detectSignals(src),
    functions: (js || (html && src.length < 400000)) ? extractFunctions(src) : [],
    classes: html || css ? extractClasses(doc, src) : [],
    copy: extractCopy(src, doc),
    hasChat: /chat-shell-wrap|wiseai-chat|mountWISEcodeAIChat/.test(src),
    kind: html ? 'html' : (js ? 'js' : (css ? 'css' : 'file')),
  };
}

export function isRichInventory(fp) {
  return !!(fp && Array.isArray(fp.headings) && Array.isArray(fp.signals));
}

function addedRemoved(curArr, prevArr) {
  const prev = new Set(prevArr || []);
  const cur = new Set(curArr || []);
  return {
    added: [...cur].filter((x) => !prev.has(x)).sort((a, b) => a.localeCompare(b)),
    removed: [...prev].filter((x) => !cur.has(x)).sort((a, b) => a.localeCompare(b)),
  };
}

function push(out, cat, text) {
  if (!text || !out[cat]) return;
  if (!out[cat].includes(text)) out[cat].push(text);
}

function hasAny(out) {
  return Object.keys(out).some((k) => Array.isArray(out[k]) && out[k].length);
}

/* Word for the kind of surface, used inside sentences. */
function kindWord(fp) {
  if (fp.kind === 'html') return 'page';
  if (fp.kind === 'js') return 'shared script';
  if (fp.kind === 'css') return 'stylesheet';
  return 'file';
}

/* One plain sentence saying what the surface is and where it lives. */
function surfaceIntro(fp) {
  const label = defaultFileLabel(fp.path, fp.title);
  const area = areaTitleForPath(fp.path);
  const where = displayPath(fp.path);
  if (area && fp.kind === 'html') return label + ' is the ' + area + ' page (' + where + ').';
  return label + ' is the ' + kindWord(fp) + ' at ' + where + '.';
}

/* The detected feature signals turned into their own ready-made prose
   sentences (the `on` copy), in a stable order. This is the "what it does". */
function capabilityProse(signalIds) {
  const byId = Object.fromEntries(FEATURE_SIGNALS.map((s) => [s.id, s]));
  return FEATURE_SIGNALS
    .map((s) => s.id)
    .filter((id) => (signalIds || []).includes(id) && byId[id])
    .map((id) => byId[id].on);
}

/* A plain sentence naming how the surface is organised — at most three
   section names, in prose, never a bracketed dump of everything. */
function structureProse(fp) {
  const mods = (fp.modules || []).filter(Boolean);
  if (!mods.length) return '';
  if (mods.length <= 3) {
    return 'It is organised into the ' + oxford(mods.map((m) => '“' + m + '”')) + (mods.length === 1 ? ' section.' : ' sections.');
  }
  return 'It is organised into ' + mods.length + ' titled sections, including ' + oxford(mods.slice(0, 3).map((m) => '“' + m + '”')) + '.';
}

function describeCurrentSurface(fp, before) {
  const out = emptyCats();
  push(out, 'features', surfaceIntro(fp));
  const caps = capabilityProse(fp.signals);
  if (caps.length) push(out, 'features', caps.join(' '));
  const structure = structureProse(fp);
  if (structure) push(out, 'components', structure);
  if (fp.chips && fp.chips.length) {
    push(out, 'features', 'It offers ready-made prompts such as ' + quoteList(fp.chips, 4) + ', each opening a real transcript.');
  }
  if (before && typeof before.size === 'number' && fp.size !== before.size) {
    const d = fp.size - before.size;
    push(out, 'changes', 'Since the start of the day the ' + (fp.kind === 'html' ? 'page' : 'file') + ' ' + (d > 0 ? 'grew' : 'shrank') + ' by ' + fmtBytes(Math.abs(d)) + '; the description above is what is on disk right now, not just the byte count.');
  } else {
    push(out, 'updates', 'This is the full read of the surface as it stands now — later re-evaluations today describe only what moves from the start-of-day baseline.');
  }
  return out;
}

function describeNewFile(fp) {
  const out = describeCurrentSurface(fp, null);
  out.features.unshift('This surface is new to the log — here is its first full read.');
  return out;
}

export function describeInventoryDiff(fp, before) {
  if (!fp) return emptyCats();
  if (!before) return describeNewFile(fp);
  if (!isRichInventory(before)) return describeCurrentSurface(fp, before);

  const out = emptyCats();
  const label = defaultFileLabel(fp.path, fp.title);
  const noun = fp.kind === 'html' ? 'page' : (fp.kind === 'js' ? 'script' : 'file');

  push(out, 'features', label + ' changed since the start of the day. Here is what moved.');

  if (fp.title && before.title && fp.title !== before.title) {
    push(out, 'updates', 'The ' + noun + ' was retitled from “' + cleanText(before.title) + '” to “' + cleanText(fp.title) + '.”');
  }

  const mods = addedRemoved(fp.modules, before.modules);
  if (mods.added.length) {
    push(out, 'components', 'It gained ' + (mods.added.length === 1 ? 'a new section, ' : mods.added.length + ' new sections — ')
      + oxford(mods.added.slice(0, 4).map((m) => '“' + m + '”')) + (mods.added.length > 4 ? ', among others' : '') + '.');
  }
  if (mods.removed.length) {
    push(out, 'deletions', 'It dropped ' + oxford(mods.removed.slice(0, 4).map((m) => '“' + m + '”')) + (mods.removed.length > 4 ? ', among others' : '') + (mods.removed.length === 1 ? '.' : '.'));
  }

  const scripts = addedRemoved(fp.scripts, before.scripts);
  if (scripts.added.length) {
    push(out, 'features', 'It now loads ' + oxford(scripts.added.map((s) => s.split('/').pop())) + ', so it inherits those shared behaviours.');
  }
  if (scripts.removed.length) {
    push(out, 'deletions', 'It no longer loads ' + oxford(scripts.removed.map((s) => s.split('/').pop())) + '.');
  }

  const sig = addedRemoved(fp.signals, before.signals);
  const byId = Object.fromEntries(FEATURE_SIGNALS.map((s) => [s.id, s]));
  sig.added.forEach((id) => { if (byId[id]) push(out, byId[id].cat, byId[id].on); });
  sig.removed.forEach((id) => { if (byId[id]) push(out, 'deletions', byId[id].off); });

  if (fp.hasChat !== before.hasChat && !sig.added.includes('chat') && !sig.removed.includes('chat')) {
    if (fp.hasChat) push(out, 'features', 'The shared WISEcodeAI chat module is now mounted here.');
    else push(out, 'deletions', 'The shared WISEcodeAI chat module was removed.');
  }

  const chips = addedRemoved(fp.chips, before.chips);
  if (chips.added.length) {
    push(out, 'features', 'New prompts were added, such as ' + quoteList(chips.added, 4) + ', each opening a real transcript.');
  }
  if (chips.removed.length) {
    push(out, 'deletions', 'Some prompts were removed, including ' + quoteList(chips.removed, 4) + '.');
  }

  const heads = addedRemoved(fp.headings, before.headings);
  if (heads.added.length) {
    push(out, 'ux', 'New headings appeared, including ' + quoteList(heads.added, 4) + '. Section titles use the brand serif face.');
  }

  const fns = addedRemoved(fp.functions, before.functions);
  if (fns.added.length) {
    push(out, 'logic', 'Its behaviour grew with ' + (fns.added.length === 1 ? 'a new handler, ' : fns.added.length + ' new handlers, including ')
      + oxford(fns.added.slice(0, 3)) + '.');
  }
  if (fns.removed.length) {
    push(out, 'deletions', (fns.removed.length === 1 ? 'A handler was removed (' : fns.removed.length + ' handlers were removed, including ')
      + oxford(fns.removed.slice(0, 3)) + (fns.removed.length === 1 ? ').' : '.'));
  }

  const copy = addedRemoved(fp.copy, before.copy);
  if (copy.added.length) {
    push(out, 'ux', 'Fresh interface copy landed, such as “' + copy.added[0] + '.”');
  }

  const dSize = (fp.size || 0) - (before.size || 0);
  if (dSize) {
    const dir = dSize > 0 ? 'grew' : 'shrank';
    if (hasAny(out)) {
      push(out, 'changes', 'Altogether the ' + noun + ' ' + dir + ' by ' + fmtBytes(Math.abs(dSize)) + ' with those edits — the byte count is the footprint, not the story.');
    } else {
      push(out, 'changes', 'The ' + noun + ' ' + dir + ' by ' + fmtBytes(Math.abs(dSize)) + ', but its sections, scripts, prompts, and features are unchanged — this was copy, styling, or internal logic.');
    }
  }

  if (!hasAny(out) && fp.hash !== before.hash) {
    push(out, 'updates', 'The ' + noun + ' changed on disk, but its sections, scripts, prompts, controls, and features are all unchanged — an internal edit to spacing, comments, or logic.');
  }

  return out;
}

export function catsHaveItems(cats) {
  return !!(cats && hasAny(cats));
}

/* One stacked paragraph per finding — never a comma-run of bullets. */
export function catsToSynopsis(cats) {
  const paras = [];
  if (!cats) return paras;
  ['features', 'components', 'ux', 'logic', 'changes', 'improvements', 'updates', 'deletions'].forEach((id) => {
    const arr = cats[id];
    if (!Array.isArray(arr)) return;
    arr.forEach((t) => {
      const s = String(t || '').trim();
      if (s && !paras.includes(s)) paras.push(s);
    });
  });
  return paras;
}

export function crawlOverview(htmlCount, scriptCount, diff, labels) {
  const changed = (diff.changed || []).length;
  const added = (diff.added || []).length;
  const unchangedHtml = (diff.unchanged || []).filter((fp) => isHtmlPath(fp.path)).length;
  const unreachable = (diff.unreachable || []).length;
  const lines = [
    'Evaluated every HTML file (' + htmlCount + ') plus ' + scriptCount + ' shared scripts. The same complete set is crawled on every Re-evaluate so the board cannot skip a page.',
  ];
  if (added) lines.push(added + (added === 1 ? ' new file' : ' new files') + ' appeared today.');
  if (changed) {
    lines.push(changed + (changed === 1 ? ' file changed today.' : ' files changed today.')
      + ' Each card below is a full description of features, UX, UI, and modules — not a byte-count.');
  }
  if (!added && !changed) {
    lines.push('No files changed versus the start-of-day baseline. ' + unchangedHtml + ' HTML files were still opened and inventoried.');
  } else if (unchangedHtml) {
    lines.push(unchangedHtml + ' HTML ' + (unchangedHtml === 1 ? 'file is' : 'files are') + ' unchanged from the start of today. They were still opened and inventoried on this pass.');
  }
  if (unreachable) {
    lines.push('Unreachable: ' + oxford((diff.unreachable || []).map(displayPath)) + '.');
  }
  return lines.join('\n\n');
}
