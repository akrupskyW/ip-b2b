/**
 * Progress Log evaluator — inventories every HTML page and the scripts those
 * pages load, then turns a snapshot into a plain-language account of what was
 * built: features, components, logic, UX, and UI.
 *
 * Byte counts, file sizes, hashes, raw filenames, and raw identifiers never
 * appear in a description. A reader who has never opened the codebase has to
 * understand every sentence, so machine facts are always translated: a newly
 * loaded script is described by what it does, a new handler by what it is for.
 *
 * How much landed that day drives how much is said. A large pass gets several
 * sentences per category; a tidy-up gets one honest line. Cards never collapse
 * a busy day into a single generic sentence.
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
  '../js/load-anim.js',
  '../js/feedback.js',
  '../js/feedback-setting.js',
  '../js/nav-history.js',
  '../js/nav-modules.js',
  '../js/nav-hamburger.js',
  '../js/trace-helix.js',
  '../js/welcome-orbit.js',
  '../js/topbar.js',
  '../js/owl-walkthrough.js',
  '../js/chat-ask.js',
  '../js/chat-history.js',
  '../js/agent-menu.js',
  '../js/app-search.js',
  '../js/app-logic-data.js',
  '../js/pane-width.js',
  '../js/text-size-fouc.js',
  '../js/progress-log-eval.js',
  '../js/icon-svg-shim.js',
  '../js/date-column.js',
  '../js/sticky-report.js',
  '../js/nudge-toast-dismiss.js',
  'wise.css',
  '../wiseai-chat.css',
];

/* Product-language signals. Presence/absence becomes a full sentence, written
   for a reader who has never opened the code — no filenames, no class names,
   no identifiers. */
export const FEATURE_SIGNALS = [
  { id: 'chat', cat: 'features', re: /mountWISEcodeAIChat|wiseai-chat\.js|id=["']pl-chat["']|id=["']chat-shell["']/,
    on: 'You can talk to WISEcodeAI right here — the same assistant that runs on the WISEcodeAI studio.',
    off: 'You can no longer talk to WISEcodeAI here.' },
  { id: 'ask', cat: 'features', re: /What can I ask|chat-ask\.js|ask-catalog|mountAsk/,
    on: 'If you are not sure what to say, “What can I ask?” opens inside the chat with a catalog of questions, and can break out into its own panel.',
    off: 'The “What can I ask?” catalog is gone from here.' },
  { id: 'chips', cat: 'features', re: /intent-chip|setIntents\s*\(|nextIntents|ws-intent-chip|INTENT_REPLIES/,
    on: 'Ready-made questions sit under the chat as tappable chips, and every answer ends on more of them, so the conversation never dead-ends.',
    off: 'The tappable question chips are gone from here.' },
  { id: 'helix', cat: 'ux', re: /trace-helix|helix-canvas|bgAnim|helix\.js/,
    on: 'A faint helix drifts behind the chat while you work — on by default, quiet enough to read over.',
    off: 'The drifting helix backdrop is gone.' },
  { id: 'history', cat: 'features', re: /chat-history|History & Projects|historyBreakout|historyKey/,
    on: 'Past conversations are kept: open History & Projects from the chat’s three-dot menu to pick one back up.',
    off: 'Past conversations are no longer reachable from here.' },
  { id: 'sticky', cat: 'features', re: /sticky-modules|modules-sticky|stickyModules/,
    on: 'Everything to the right of the chat tucks away as a drawer you can pull open, so the screen never gets crowded.',
    off: 'The panels to the right no longer tuck away as drawers.' },
  { id: 'threedot', cat: 'components', re: /panel-more-btn|more_vert/,
    on: 'Each panel carries a three-dot menu — share it, copy a link to it, export it, plus whatever that panel can do.',
    off: 'The three-dot menu on each panel is gone.' },
  { id: 'countup', cat: 'ux', re: /data-countup|count-up-all|count-up\.js/,
    on: 'The numbers count up from zero when the page opens instead of just appearing.',
    off: 'The numbers no longer count up.' },
  { id: 'dark', cat: 'ux', re: /html\.dark|wise-theme|chat-theme|classList\.toggle\(\s*['"]dark['"]/,
    on: 'It follows the light or dark theme you picked, everywhere in the app at once.',
    off: 'It no longer follows your light or dark theme.' },
  { id: 'serif', cat: 'ux', re: /Noto Serif|--module-title-family|WISE Digits['"],\s*['"]Noto Serif/,
    on: 'Titles are set in the brand serif, the same as the rest of the app.',
    off: 'Titles are no longer set in the brand serif.' },
  { id: 'cwr', cat: 'features', re: /cwr-toggle|Roll · Crawl · Walk · Run|Crawl · Walk · Run|cwr-mode/,
    on: 'You can switch the whole app between Roll, Crawl, Walk, and Run; it opens on Run.',
    off: 'The Roll · Crawl · Walk · Run switch is gone.' },
  { id: 'width', cat: 'ux', re: /WPaneWidth|panel-width-toggle|width_normal/,
    on: 'You can widen any panel through five steps — single, double, triple, fill the screen, then a custom size you drag.',
    off: 'You can no longer widen the panels here.' },
  { id: 'appearance', cat: 'features', re: /buildAppearanceBody|appearance-menu/,
    on: 'Appearance & Admin opens from the navigation, so theme, text size, serif headlines, and admin switches are one click away.',
    off: 'Appearance & Admin no longer opens from here.' },
  { id: 'helixload', cat: 'ux', re: /isHelixLoadOn|load-anim\.js/,
    on: 'While a board is still assembling you see the streaming helix instead of stripes.',
    off: 'Assembling boards no longer play the streaming helix.' },
  { id: 'nav', cat: 'components', re: /mountAgentMenu|agent-menu\.js/,
    on: 'It carries the app’s shared primary navigation, so you can get anywhere from here.',
    off: 'The shared primary navigation is gone from this surface.' },
  { id: 'walkthrough', cat: 'features', re: /owl-walkthrough|WiseWalkthrough/,
    on: 'The WISEowl can walk you through what is on screen.',
    off: 'The WISEowl walkthrough no longer opens here.' },
  { id: 'search', cat: 'features', re: /app-search|data-app-search/,
    on: 'You can search the whole app from the top band — conversations, live output, and reports.',
    off: 'App-wide search is gone from here.' },
  { id: 'scorecards', cat: 'components', re: /data-countup|pl-stat|rf-stat|mi-stat(?!-text)/,
    on: 'The headline numbers sit in scorecards at the top, with no eyebrow above them.',
    off: 'The scorecards at the top are gone.' },
  { id: 'popover', cat: 'ux', re: /wise-popover|lir-tooltip|data-tip=/,
    on: 'Hovering an icon explains it in a small popover that opens above or beside it, never underneath.',
    off: 'The hover explanations are gone.' },
  { id: 'nfp', cat: 'features', re: /nutrition-facts|Nutrition Facts|nfp-/,
    on: 'A real Nutrition Facts panel is on the page, readable in both light and dark mode.',
    off: 'The Nutrition Facts panel is gone.' },
  { id: 'auth', cat: 'logic', re: /auth-guard\.js|auth\.js/,
    on: 'You have to be signed in — anyone who is not gets sent to sign-in first.',
    off: 'Signing in is no longer required to see this.' },
  { id: 'streaming', cat: 'ux', re: /streamParagraph|trailChips|paragraph-by-paragraph|streamReply/,
    on: 'Answers arrive a paragraph at a time, then the thumbs row, then the next questions — never word-by-word typing.',
    off: 'Answers no longer arrive a paragraph at a time.' },
  { id: 'lockedComposer', cat: 'ux', re: /composer-lock|lock_outline|readonly.*Ask about/,
    on: 'The message box is locked, so you can only tap the suggested questions.',
    off: 'The message box is unlocked — you can type anything into it.' },
  { id: 'jam', cat: 'features', re: /jam-strip|isJamStripOn/,
    on: 'The jam strip is available — play, skip, and a live equalizer in the navigation.',
    off: 'The jam strip is gone.' },
  { id: 'comments', cat: 'features', re: /js\/feedback\.js|WiseFeedback|data-comments/,
    on: 'You can leave an on-page comment: press C, click a spot, and pin a note there. Anyone can reply, so it is a thread, not a one-way box.',
    off: 'On-page comments are gone from here.' },
  { id: 'commentsGate', cat: 'features', re: /feedback-setting|isCommentsOn|isCommentsUnlocked/,
    on: 'Appearance carries a Comments switch. Only the owner can flip it, and it turns commenting on or off for everyone — not just this browser.',
    off: 'The Appearance Comments switch is gone.' },
  { id: 'navHistory', cat: 'features', re: /nav-history|data-navhistory|History in navigation/,
    on: 'History can live inside the primary navigation as an expandable section — search, projects, and All conversations stay usable there.',
    off: 'History no longer merges into the primary navigation.' },
  { id: 'navModules', cat: 'features', re: /nav-modules|data-navmodules|Nav & History icons/,
    on: 'Navigation and History open as four icons — the logo, a menu, a chevron, and a new-chat circle. The menu opens the labelled navigation; the chevron opens History. While either is open, those extra icons hide and the chevron closes back to the rail.',
    off: 'The four-icon Navigation and History rail is gone.' },
  { id: 'navHamburger', cat: 'ux', re: /nav-hamburger|data-navhamburger/,
    on: 'When Search is on and the nav is collapsed, a menu icon sits left of the wordmark instead of the icon rail.',
    off: 'The collapsed-nav menu icon is gone.' },
  { id: 'appLogic', cat: 'features', re: /app-logic-data|id=["']mi-logic["']|>App Logic</,
    on: 'App Logic writes down the behavioral rules the app actually runs — auth, theme, navigation, widths, and what persists — grouped by page.',
    off: 'The App Logic catalog is gone.' },
  { id: 'chatWidthDefault', cat: 'ux', re: /defaultChatTier|WISE_CHAT_SINGLE_MAX_PX|chat-default-double/,
    on: 'The chat opens at a width that matches the screen: single on a 14-inch-class display, double when there is more room. You can still cycle wider in the session; the next load puts it back.',
    off: 'The chat no longer picks a default width from the screen size.' },
];

/* Named pieces from the component catalog. Presence becomes a batched
   Components sentence (“It uses these components: …”), never a class name. */
const COMPONENT_MARKERS = [
  { name: 'Buttons', re: /\bdash-btn\b/ },
  { name: 'Output chips', re: /sc-surface-card|wa-merge-chip/ },
  { name: 'Large intent cards', re: /\bws-scorecard\b/ },
  { name: 'Chat composer', re: /fl-input-wrap|\.sc-send\b/ },
  { name: 'Transcript actions', re: /\bsc-fb-btn\b/ },
  { name: 'Activity strip', re: /wa-activity-strip/ },
  { name: 'Token readout', re: /sc-activity-dots/ },
  { name: 'What can I ask?', re: /wch-ask-panel/ },
  { name: 'Switch', re: /\bsc-switch\b/ },
  { name: 'Width toggle', re: /panel-width-toggle/ },
  { name: 'Nutrition Facts', re: /\bnfp-panel\b|nutrition-facts/ },
  { name: 'Row action menu', re: /pf-rowmenu/ },
  { name: 'Date columns', re: /w-date-val|pf-date-val|w-datemenu/ },
  { name: 'Form fields', re: /\badm-field\b/ },
  { name: 'Modal dialog', re: /dash-modal/ },
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

/* ── Plain-language helpers ──────────────────────────────────────────────
   File sizes, byte deltas, hashes, and raw identifiers are never part of a
   description. Everything below turns machine facts into the words a reader
   would use: what a script actually does, what a handler is for. */

const DECOR_ONLY = /^[\s*\/=─═\-–—·+|]+$/;

/* Reader-facing wording for shared behaviour whose own header comment is
   written for developers ("FOUC guard", "the ONE canonical pane-width
   model"). Anything not listed here falls back to its header sentence, which
   is usually already plain enough. Add an entry the moment a card reads like
   code instead of English. */
export const SCRIPT_PURPOSES = {
  'text-size-fouc.js': 'the text size you picked is applied before the page paints, so nothing jumps',
  'text-size.js': 'the app-wide text-size setting',
  'wiseai-chat.js': 'the one shared WISEcodeAI chat — welcome screen, question chips, streaming answers — that every page mounts',
  'agent-menu.js': 'the app’s shared primary navigation',
  'auth-guard.js': 'anyone who is not signed in is sent to the sign-in screen before the page paints',
  'count-up-all.js': 'every scorecard number animates from zero up to its value',
  'default-fill.js': 'every module to the right of the chat opens filling the screen',
  'pane-width.js': 'the one width model behind every module’s width control — single, double, triple, fill the screen, and a custom size you drag',
  'sticky-modules.js': 'modules to the right of the chat tuck in as drawers, and each one carries a three-dot menu',
  'load-anim.js': 'while a board is assembling you see the streaming helix instead of stripes',
  'marketing-shell.js': 'the shared marketing shell — the same navigation and footer on every marketing page',
  'jam-strip.js': 'the jam strip in the navigation — play, skip, and a live equalizer',
  'feedback.js': 'on-page comments — press C, click a spot, leave a threaded note pinned to it',
  'feedback-setting.js': 'the Appearance Comments switch, a site-wide on/off held by the server and locked to the owner',
  'nav-history.js': 'History inside the primary navigation as an expandable section',
  'nav-modules.js': 'Navigation and History open as the logo, menu, History chevron, and a circular new-chat control; the menu opens the labelled navigation, the chevron opens History, and while either is open the extra icons hide so the chevron can close back to the rail',
  'nav-hamburger.js': 'a menu icon to the left of the wordmark when Search is on and the nav is collapsed',
  'trace-helix.js': 'the DNA helix every WISEcodeAI turn draws while it thinks',
  'welcome-orbit.js': 'the welcome owl as a living node network instead of pulse rings',
  'app-logic-data.js': 'the written catalog of behavioral rules the app actually runs, grouped by page',
  'chat-history.js': 'History & Projects — past conversations, folders, and the drawer beside chat',
  'app-search.js': 'app-wide search in the top band across conversations, live output, and reports',
  'reformulation-store.js': 'the shared recipe Reformulation writes and the product pages read',
  'date-column.js': 'every date column stacks two dates (updated over last edited, or whichever pair you pick) and a three-dot menu in the header lists every date type',
  'nudge-toast-dismiss.js': 'the close button on a floating nudge asks whether to hide it for now or for this viewing — a hard refresh brings every nudge back',
  'sticky-report.js': 'the Product Details and UPF reports that open as a module beside Product Portfolio',
  'icon-svg-shim.js': 'every Material Symbols icon draws as an inline SVG from one sprite, with the webfont kept only as fallback for a name the sprite does not carry',
  'icon-svg-data.js': 'the per-glyph SVG paths the icon inventory uses to preview Font versus SVG side by side',
  'help-flow.js': 'the Help center — search, topic cards, FAQs, and a contact form that emails support with optional attachments',
  'user-avatar.js': 'the photo you set on your profile shows in the navigation and in every chat as you',
};

/* The first real sentence of a script's own header comment — the file's
   stated purpose, in its author's words. Decorative rule lines and the
   "filename.js — " prefix are stripped, so feedback.js reports "On-page
   comments — press C, click a spot, leave a note." */
export function scriptPurpose(text) {
  const src = String(text || '').slice(0, 6000);
  const re = /\/\*+([\s\S]*?)\*\//g;
  let m;
  let tries = 0;
  while ((m = re.exec(src)) && tries < 5) {
    tries++;
    /* Take the comment's opening paragraph only: a blank or rule line after
       real text ends the summary, so a header's second thought never runs
       into the first. */
    const lines = [];
    for (const raw of m[1].split('\n')) {
      const l = raw.replace(/^\s*\*+/, '').replace(/[=─═_]{3,}/g, '').trim();
      const blank = !l || DECOR_ONLY.test(l);
      if (blank) { if (lines.length) break; continue; }
      lines.push(l);
    }
    if (!lines.length) continue;
    let body = lines.join(' ').replace(/\s+/g, ' ').trim();
    body = body.replace(/^[\w.-]+\.(?:js|css|html)\s*[—–:-]\s*/i, '').trim();
    if (!body) continue;
    const stop = body.search(/[.!?](?:\s|$)/);
    let sentence = stop > 16 ? body.slice(0, stop) : body;
    if (sentence.length > 280) {
      const cut = sentence.slice(0, 280);
      const space = cut.lastIndexOf(' ');
      sentence = (space > 80 ? cut.slice(0, space) : cut).trim() + '…';
    }
    sentence = sentence.replace(/[\s,;:—–-]+$/, '').trim();
    if (sentence.length >= 8) return sentence;
  }
  return '';
}

/* "count-up-all.js" → "count up all"; "mountAgentMenu" → "mount agent menu". */
export function humanizeName(name) {
  return String(name || '')
    .split('/').pop()
    .replace(/\.(?:js|css|html)$/i, '')
    .replace(/^_+/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
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

/* Turn a script/src or href from markup into the fetch path the crawler uses
   (`../js/foo.js` from pages/). Remote URLs are dropped. */
export function localFetchPath(src) {
  let s = String(src || '').split('#')[0].split('?')[0].trim();
  if (!s || /^(?:https?:)?\/\//i.test(s) || s.startsWith('data:') || s.startsWith('blob:')) return '';
  s = s.replace(/^\.\//, '');
  if (s.startsWith('../')) return s;
  if (s.startsWith('js/')) return '../' + s;
  if (s.startsWith('/js/')) return '..' + s;
  if (/^[\w.-]+\.js$/i.test(s)) return '../js/' + s;
  if (/^[\w.-]+\.css$/i.test(s)) return s;
  return '';
}

/* Shared scripts plus every local script a crawled page actually loads. */
export function collectLocalScriptPaths(fps, extra) {
  const seen = new Set();
  const out = [];
  const add = (raw) => {
    const f = localFetchPath(raw) || (String(raw || '').startsWith('../') ? String(raw) : '');
    if (!f || seen.has(f)) return;
    seen.add(f);
    out.push(f);
  };
  (extra || []).forEach(add);
  (fps || []).forEach((fp) => {
    (fp && fp.scripts || []).forEach(add);
  });
  return out;
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

/* Same, but trailing off in words rather than a count. */
function quoteSome(items, max = 5) {
  const list = (items || []).filter(Boolean);
  if (list.length <= max) return oxford(list.map((s) => '“' + s + '”'));
  return oxford(list.slice(0, max).map((s) => '“' + s + '”')) + ', among others';
}

/* Handler names turned into readable capabilities. One-word names ("build",
   "render") say nothing to a reader, so they are left out. */
function capabilityNames(list) {
  return uniqSorted((list || []).map(humanizeName).filter((n) => n && n.includes(' ')));
}

function labelMap() {
  const map = {
    'page-gallery.html': 'Page Gallery',
    'app-vision-deck.html': 'App Vision Deck',
    'wise.css': 'Platform-wide',
    '../js/wiseai-chat.js': 'Shared chat',
    '../js/all-modules-flow.js': 'All Modules',
    '../js/appearance-menu.js': 'Appearance & Admin',
    '../js/load-anim.js': 'Loading helix',
    '../js/topbar.js': 'Appearance & Admin',
    '../js/owl-walkthrough.js': 'WISEowl walkthrough',
    '../js/chat-ask.js': 'What can I ask?',
    '../js/chat-history.js': 'History & Projects',
    '../js/agent-menu.js': 'Primary navigation',
    '../js/app-search.js': 'App search',
    '../js/progress-log-eval.js': 'Progress Log evaluator',
    '../js/icon-svg-shim.js': 'Icons',
    '../js/date-column.js': 'Date columns',
    '../js/sticky-report.js': 'Sticky reports',
    '../js/nudge-toast-dismiss.js': 'Nudge toasts',
    '../js/feedback.js': 'On-page comments',
    '../js/feedback-setting.js': 'Appearance & Admin',
    '../js/nav-history.js': 'History in navigation',
    '../js/nav-modules.js': 'Nav & History icons',
    '../js/nav-hamburger.js': 'Menu icon',
    '../js/trace-helix.js': 'Streaming helix',
    '../js/welcome-orbit.js': 'Welcome orbit',
    '../js/app-logic-data.js': 'App Logic',
    '../js/pane-width.js': 'Panel width',
    '../js/text-size-fouc.js': 'Platform-wide',
    '../wiseai-chat.css': 'Shared chat',
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
  const patterns = [
    /(?:^|[\n;])\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]{2,})\s*\(/g,
    /(?:^|[\n;])\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]{2,})\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g,
    /(?:^|[\n;])\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]{2,})\s*=\s*(?:async\s+)?function\b/g,
  ];
  patterns.forEach((re) => {
    let m;
    while ((m = re.exec(text))) out.push(m[1]);
  });
  return uniqSorted(out, 220);
}

function extractSectionHeads(text) {
  const out = [];
  const re = /(?:\/\*\s*[─═]+\s*|<!--\s*[─═]+\s*\d*\s*[·•\-]?\s*)([A-Za-z][^—*\/<\n]{6,80})/g;
  let m;
  while ((m = re.exec(text))) out.push(cleanText(m[1]).replace(/[─═=·+|_-]{2,}\s*$/, '').trim());
  const re2 = /\/\*\s*(?:[─═\-={]{3,}\s*)([A-Z][A-Za-z0-9 /&'’:,().-]{6,70}?)\s*(?:[─═\-={]{3,})?\s*\*\//g;
  while ((m = re2.exec(text))) out.push(cleanText(m[1]));
  return uniqSorted(out, 80);
}

function extractCopy(text, doc) {
  const out = [];
  if (doc) {
    doc.querySelectorAll('[aria-label], [placeholder], [title], button, label, .pl-head-title, [class$="-head-title"], [class$="-hero-title"], [class$="-module-title"]').forEach((el) => {
      const t = cleanText(el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('title') || el.textContent);
      if (t && t.length >= 6 && t.length <= 110 && !ICON_ONLY.test(t)) out.push(t);
    });
  }
  const quoted = /['"]([A-Z][^'"\n]{11,110})['"]/g;
  let m;
  let n = 0;
  while ((m = quoted.exec(text)) && n < 120) {
    const t = cleanText(m[1]);
    if (/^(https?:|function |import |const |var |let )/.test(t)) continue;
    if (/[{}<>\\]/.test(t)) continue;
    out.push(t);
    n++;
  }
  const labeled = /(?:label|title|aria-label|placeholder|heading|menu|desc|lede|ask|prompt)\s*[:=]\s*['"]([^'"]{3,90})['"]/gi;
  while ((m = labeled.exec(text)) && n < 200) {
    const t = cleanText(m[1]);
    if (t && t.length >= 3 && !ICON_ONLY.test(t)) { out.push(t); n++; }
  }
  return uniqSorted(out, 160);
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
  return uniqSorted(out, 160);
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
  return uniqSorted(out, 48);
}

function extractControlLabels(text) {
  const out = [];
  const re = /(?:aria-label|title|placeholder|label|menu)\s*[:=]\s*['"]([^'"]{3,70})['"]/gi;
  let m;
  while ((m = re.exec(text))) {
    const t = cleanText(m[1]);
    if (t && t.length >= 3 && t.length <= 70 && !ICON_ONLY.test(t)) out.push(t);
  }
  return uniqSorted(out, 80);
}

function extractButtons(doc, text) {
  const out = extractControlLabels(text);
  if (!doc) return out;
  doc.querySelectorAll('button, [role="button"]').forEach((el) => {
    const t = cleanText(el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent);
    if (!t || t.length < 3 || t.length > 48 || ICON_ONLY.test(t)) return;
    if (/^[a-z]{2,}[A-Z]/.test(t)) return;
    out.push(t);
  });
  return uniqSorted(out, 80);
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
  return uniqSorted(out, 80);
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
  return uniqSorted(out, 80);
}

function detectSignals(text) {
  return FEATURE_SIGNALS.filter((s) => s.re.test(text)).map((s) => s.id);
}

function extractComponentNames(text) {
  return COMPONENT_MARKERS.filter((m) => m.re.test(String(text || ''))).map((m) => m.name);
}

export function emptyCats() {
  return {
    features: [],
    components: [],
    logic: [],
    ux: [],
    ui: [],
    changes: [],
    improvements: [],
    updates: [],
    deletions: [],
  };
}

export function inventoryDoc(path, text) {
  const src = String(text || '');
  const js = /\.js(?:$|\?)/i.test(path);
  const css = /\.css(?:$|\?)/i.test(path);
  /* Extension wins: a script that injects markup still is not a page. */
  const html = !js && !css && (isHtmlPath(path) || /<html[\s>]/i.test(src));
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
    buttons: extractButtons(doc, src),
    signals: detectSignals(src),
    compNames: extractComponentNames(src),
    functions: (js || (html && src.length < 400000)) ? extractFunctions(src) : [],
    classes: html || css ? extractClasses(doc, src) : [],
    copy: extractCopy(src, doc),
    purpose: (js || css) ? scriptPurpose(src) : '',
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

/* One plain sentence saying what the surface is, in reader's terms — never a
   file path, and for shared behaviour the script's own stated purpose. */
function surfaceIntro(fp, isNew) {
  const label = defaultFileLabel(fp.path, fp.title);
  const named = label !== displayPath(fp.path);
  const area = areaTitleForPath(fp.path);
  if (fp.kind === 'html') {
    const where = area ? ' in ' + area : ' in the app';
    return label + (isNew ? ' is a new page' : ' is a page') + where + (isNew ? ', built today.' : '.');
  }
  if (fp.kind === 'css') {
    return (named ? label : 'This') + ' is the shared styling every page inherits.';
  }
  const lead = isNew
    ? (named ? label + ' is new shared behaviour any page can use' : 'New shared behaviour any page can use')
    : (named ? label + ' is shared behaviour any page can use' : 'Shared behaviour any page can use');
  const purpose = SCRIPT_PURPOSES[String(fp.path).split('/').pop()] || fp.purpose || '';
  return purpose ? lead + ': ' + purpose.replace(/\.$/, '') + '.' : lead + '.';
}

/* The detected feature signals turned into their own ready-made prose
   sentences (the `on` copy), each in the category the signal declared —
   Features, Components, UX, or Logic — never dumped into one bucket. */
function applySignalSentences(out, signalIds, which) {
  const want = which === 'off' ? 'off' : 'on';
  const have = new Set(signalIds || []);
  FEATURE_SIGNALS.forEach((s) => {
    if (!have.has(s.id)) return;
    const text = s[want];
    if (text) push(out, s.cat, text);
  });
}

/* A plain sentence naming how the surface is organised — at most three
   section names, in prose, never a bracketed dump of everything. */
function structureProse(fp) {
  const mods = (fp.modules || []).filter(Boolean);
  if (!mods.length) return '';
  if (mods.length <= 8) {
    return 'It is organised into the ' + oxford(mods.map((m) => '“' + m + '”')) + (mods.length === 1 ? ' section.' : ' sections.');
  }
  return '';
}

/* A shared script described by what it does, never by its filename. `ctx`
   carries the purposes read out of the scripts themselves; without it we fall
   back to the humanised name so a sentence still reads as English. */
function behaviourPhrase(src, ctx) {
  const purposes = (ctx && ctx.scriptPurposes) || {};
  const base = String(src || '').split('/').pop();
  const purpose = SCRIPT_PURPOSES[base] || purposes[src] || purposes[base] || purposes['../' + src] || '';
  if (purpose) return purpose.replace(/\.$/, '');
  return 'the shared “' + humanizeName(base) + '” behaviour';
}

function describeCurrentSurface(fp, isNew) {
  const out = emptyCats();
  push(out, 'features', surfaceIntro(fp, isNew));
  applySignalSentences(out, fp.signals, 'on');
  if (fp.chips && fp.chips.length) {
    pushQuoted(out, 'features', 'You can ask it ', fp.chips, 8,
      fp.chips.length === 1 ? ', and it opens a real transcript.' : ', and each one opens a real transcript.');
  }
  if (fp.compNames && fp.compNames.length) {
    pushQuoted(out, 'components', 'It uses these components: ', fp.compNames, 8, '.');
  }
  const structure = structureProse(fp);
  if (structure) push(out, 'components', structure);
  else if (fp.modules && fp.modules.length) {
    pushQuoted(out, 'components', 'It is organised into these sections: ', fp.modules, 8, '.');
  }
  const heads = (fp.headings || []).filter((h) => !(fp.modules || []).includes(h));
  if (heads.length) {
    pushQuoted(out, 'ui', 'On the screen you see ', heads, 8, '.');
  }
  if (fp.buttons && fp.buttons.length) {
    pushQuoted(out, 'ui', 'You act on it through ', fp.buttons, 8, '.');
  }
  pushNameBatches(out, 'logic', 'It knows how to ', capabilityNames(fp.functions), 8);
  return out;
}

function pushQuoted(out, cat, lead, items, batch, tail) {
  const list = (items || []).filter(Boolean);
  if (!list.length) return;
  const end = tail || '.';
  const size = Math.max(1, batch || 8);
  for (let i = 0; i < list.length; i += size) {
    const slice = list.slice(i, i + size);
    const prefix = i === 0 ? lead : 'Also: ';
    push(out, cat, prefix + oxford(slice.map((s) => '“' + s + '”')) + end);
  }
}

function pushNameBatches(out, cat, lead, names, batch) {
  const list = names || [];
  if (!list.length) return;
  for (let i = 0; i < list.length; i += batch) {
    const slice = list.slice(i, i + batch);
    const prefix = i === 0 ? lead : 'It also ';
    push(out, cat, prefix + oxford(slice.map((n) => n)) + '.');
  }
}

export function describeInventoryDiff(fp, before, ctx) {
  if (!fp) return emptyCats();
  if (!before) return describeCurrentSurface(fp, true);
  if (!isRichInventory(before)) return describeCurrentSurface(fp, false);

  const out = emptyCats();
  const noun = fp.kind === 'html' ? 'page' : (fp.kind === 'js' ? 'script' : 'file');

  if (fp.title && before.title && fp.title !== before.title) {
    push(out, 'updates', 'The ' + noun + ' was retitled from “' + cleanText(before.title) + '” to “' + cleanText(fp.title) + '.”');
  }

  if (fp.purpose && before.purpose && fp.purpose !== before.purpose) {
    push(out, 'updates', 'Its stated job is now: ' + fp.purpose.replace(/\.$/, '') + '.');
  }

  const scripts = addedRemoved(fp.scripts, before.scripts);
  scripts.added.forEach((src) => {
    push(out, 'features', 'New on this page: ' + behaviourPhrase(src, ctx) + '.');
  });
  scripts.removed.forEach((src) => {
    push(out, 'deletions', 'No longer on this page: ' + behaviourPhrase(src, ctx) + '.');
  });

  const sig = addedRemoved(fp.signals, before.signals);
  applySignalSentences(out, sig.added, 'on');
  const byId = Object.fromEntries(FEATURE_SIGNALS.map((s) => [s.id, s]));
  sig.removed.forEach((id) => { if (byId[id]) push(out, 'deletions', byId[id].off); });

  if (Array.isArray(before.compNames)) {
    const comps = addedRemoved(fp.compNames, before.compNames);
    if (comps.added.length === 1) {
      push(out, 'components', 'A new component on this surface: “' + comps.added[0] + '.”');
    } else if (comps.added.length) {
      pushQuoted(out, 'components', 'New components on this surface: ', comps.added, 8, '.');
    }
    if (comps.removed.length) {
      pushQuoted(out, 'deletions', 'These components are gone: ', comps.removed, 8, '.');
    }
  }

  if (fp.hasChat !== before.hasChat && !sig.added.includes('chat') && !sig.removed.includes('chat')) {
    if (fp.hasChat) push(out, 'features', 'The shared WISEcodeAI chat module is now mounted here.');
    else push(out, 'deletions', 'The shared WISEcodeAI chat module was removed.');
  }

  const chips = addedRemoved(fp.chips, before.chips);
  if (chips.added.length) {
    pushQuoted(out, 'features', 'You can now ask ', chips.added, 8,
      chips.added.length === 1 ? ', and it opens a real transcript.' : ', and each one opens a real transcript.');
  }
  if (chips.removed.length) {
    pushQuoted(out, 'deletions', 'These prompts are gone: ', chips.removed, 8, '.');
  }

  const mods = addedRemoved(fp.modules, before.modules);
  if (mods.added.length === 1) {
    push(out, 'components', 'A new section reads “' + mods.added[0] + '.”');
  } else if (mods.added.length) {
    pushQuoted(out, 'components', 'New sections were added: ', mods.added, 8, '.');
  }
  if (mods.removed.length === 1) {
    push(out, 'deletions', 'The section “' + mods.removed[0] + '” was dropped.');
  } else if (mods.removed.length) {
    pushQuoted(out, 'deletions', 'Sections were dropped: ', mods.removed, 8, '.');
  }

  const modSet = new Set(mods.added);
  const heads = addedRemoved(fp.headings, before.headings);
  const newHeads = heads.added.filter((h) => !modSet.has(h));
  if (newHeads.length === 1) {
    push(out, 'ui', 'A new heading reads “' + newHeads[0] + '.”');
  } else if (newHeads.length) {
    pushQuoted(out, 'ui', 'New headings read ', newHeads, 8, '.');
  }
  const goneHeads = heads.removed.filter((h) => !(mods.removed || []).includes(h));
  if (goneHeads.length) {
    pushQuoted(out, 'deletions', 'Headings no longer on the surface: ', goneHeads, 8, '.');
  }

  const btns = addedRemoved(fp.buttons, before.buttons);
  if (btns.added.length) {
    pushQuoted(out, 'ui', 'You can now act on it through ', btns.added, 8, '.');
  }
  if (btns.removed.length) {
    pushQuoted(out, 'deletions', 'These controls were taken away: ', btns.removed, 8, '.');
  }

  const copy = addedRemoved(fp.copy, before.copy);
  if (copy.added.length) {
    pushQuoted(out, 'ux', 'The wording it shows you changed, and now includes ', copy.added, 8, '.');
  }
  if (copy.removed.length) {
    pushQuoted(out, 'ux', 'Wording that left: ', copy.removed, 8, '.');
  }

  const fns = addedRemoved(fp.functions, before.functions);
  const newFns = capabilityNames(fns.added);
  const goneFns = capabilityNames(fns.removed);
  if (newFns.length) {
    pushNameBatches(out, 'logic', 'It can now ', newFns, 8);
  }
  if (goneFns.length) {
    pushNameBatches(out, 'deletions', 'It no longer needs to ', goneFns, 8);
  }

  if (!hasAny(out)) {
    const purpose = SCRIPT_PURPOSES[String(fp.path).split('/').pop()] || fp.purpose || '';
    if (purpose) {
      push(out, 'updates', 'Kept going on ' + purpose.replace(/\.$/, '')
        + '. The pass was inside layout, wording, motion, or behaviour that was already on the surface — not a newly named section, control, or prompt.');
    } else {
      push(out, 'updates', 'Worked on this surface throughout the day. The pass was inside layout, wording, motion, or behaviour that was already there — not a newly named section, control, or prompt.');
    }
  }

  return out;
}

export function catsHaveItems(cats) {
  return !!(cats && hasAny(cats));
}

/* The breakdown a reader asked for: Features, Components, Logic, UX, UI —
   one labelled paragraph per sentence, in that order, then anything removed.
   Stacking sentences (instead of joining them into one run-on) is how a busy
   day stays readable. The label is a plain text prefix ("Features — …");
   pages/progress-log.html lifts it out and renders it as the paragraph's
   heading, and hides a repeated label when the next paragraph is the same
   category. */
export const SYNOPSIS_LABELS = {
  features: 'Features',
  components: 'Components',
  logic: 'Logic',
  ux: 'UX',
  ui: 'UI',
  changes: 'Changes',
  improvements: 'Improvements',
  updates: 'Notes',
  deletions: 'Removed',
};
export const SYNOPSIS_ORDER = ['features', 'components', 'logic', 'ux', 'ui', 'changes', 'improvements', 'updates', 'deletions'];
export const SYNOPSIS_SEP = ' — ';

export function catsToSynopsis(cats) {
  const paras = [];
  if (!cats) return paras;
  SYNOPSIS_ORDER.forEach((id) => {
    const arr = cats[id];
    if (!Array.isArray(arr) || !arr.length) return;
    const seen = [];
    arr.forEach((t) => {
      const s = String(t || '').trim();
      if (s && !seen.includes(s)) seen.push(s);
    });
    seen.forEach((s) => paras.push(SYNOPSIS_LABELS[id] + SYNOPSIS_SEP + s));
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
      + ' Each card below says what was actually built, in plain language: features, components, logic, UX, and UI.');
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
