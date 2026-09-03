/**
 * Local model on this Mac — rewrites canned answers in a warmer voice, and
 * answers off-script questions as they were asked, then ties them to food,
 * nutrition, health, or diet. When a brand, product, or fact is needed it
 * looks that up on the web and grounds the reply in those sources (source
 * chip, superscript cites, References list). Falls back to the written copy
 * when the model is off or would invent facts.
 *
 *   import { enrichReply, refineReply, isOllamaOn } from './ollama-chat.js';
 *   const pack = await enrichReply({ question, intent, html: canned, pageHint });
 */

import { gatherEvidence } from './web-food-lookup.js';

const DIRECT = 'http://127.0.0.1:11434';
const PROXY = '/__wise/ollama';
const ON_KEY = 'wise:chat-ollama-on';
const MODEL_KEY = 'wise:chat-ollama-model';
const EVENT = 'wise:chat-ollama-on';
const DEFAULT_MODEL = 'llama3.2:latest';
const KEEP_SEL = [
  '.sc-surface-card',
  '.sc-connect-flow',
  '.sc-inline-chips',
  '.wa-chiplist',
  '.wa-plsplit',
  '.wa-brandtoken',
  '.wa-cite',
  '.wa-refs-mini',
  '.wa-refs-mini-item',
  '.wa-web-foods',
  '.wa-web-food',
  '.wa-ce-ing',
  'table',
  'svg',
  'canvas',
  'img',
  '[data-open-module]',
  '[data-cat-ref]',
  '[data-news-open]',
  '[data-web-ref]',
].join(',');

let probeCache = { ok: false, model: '', label: '', at: 0 };

function pageIsLocal() {
  try {
    const h = String(location.hostname || '');
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1';
  } catch (_) {
    return false;
  }
}

export function isOllamaOn() {
  try {
    if (localStorage.getItem(ON_KEY) === '0') return false;
  } catch (_) { /* storage blocked */ }
  return true;
}

export function setOllamaOn(on) {
  const next = !!on;
  try { localStorage.setItem(ON_KEY, next ? '1' : '0'); } catch (_) { /* storage blocked */ }
  try { document.dispatchEvent(new CustomEvent(EVENT, { detail: { on: next } })); } catch (_) { /* no bus */ }
  return next;
}

export function humanModelName(name) {
  const raw = String(name || '').replace(/:latest$/i, '');
  if (!raw) return 'Ollama';
  return raw
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

function preferredModel() {
  try {
    const saved = localStorage.getItem(MODEL_KEY);
    if (saved) return saved;
  } catch (_) { /* storage blocked */ }
  return DEFAULT_MODEL;
}

function fetchWithTimeout(url, opts, ms) {
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => { try { ctrl && ctrl.abort(); } catch (_) {} }, ms);
  return fetch(url, Object.assign({}, opts, ctrl ? { signal: ctrl.signal } : {}))
    .finally(() => clearTimeout(timer));
}

async function tryUrls(path, opts, ms) {
  const urls = [];
  if (pageIsLocal()) {
    urls.push(PROXY + path);
    urls.push(DIRECT + path);
  }
  let lastErr = null;
  for (let i = 0; i < urls.length; i += 1) {
    try {
      const res = await fetchWithTimeout(urls[i], opts, ms);
      if (res && res.ok) return res;
    } catch (err) {
      lastErr = err;
    }
  }
  if (lastErr) throw lastErr;
  return null;
}

function pickModel(models) {
  const names = (models || []).map((m) => m && (m.name || m.model)).filter(Boolean);
  const want = preferredModel();
  if (names.indexOf(want) !== -1) return want;
  const llama = names.find((n) => /^llama3\.2\b/i.test(n));
  if (llama) return llama;
  return names[0] || '';
}

export async function probeOllama(force) {
  if (!force && probeCache.at && (Date.now() - probeCache.at) < 8000) return probeCache;
  const empty = { ok: false, model: '', label: '', at: Date.now() };
  if (!pageIsLocal()) {
    probeCache = empty;
    return probeCache;
  }
  try {
    const res = await tryUrls('/api/tags', { method: 'GET' }, 1800);
    if (!res) { probeCache = empty; return probeCache; }
    const data = await res.json();
    const model = pickModel(data && data.models);
    probeCache = {
      ok: !!model,
      model: model || '',
      label: model ? (humanModelName(model) + ' on this Mac') : '',
      at: Date.now(),
    };
    return probeCache;
  } catch (_) {
    probeCache = empty;
    return probeCache;
  }
}

/* One name and one glyph for this switch wherever it is offered — the chat ⋯
   row and the Appearance ▸ Admin row are the same setting, so they must not
   drift into two names for one thing. */
export const OLLAMA_LABEL = 'Clearer reading';
export const OLLAMA_ICON = 'auto_stories';
export const OLLAMA_TIP = 'Rewrite answers with the model on this Mac. Off, every chat shows the written copy as-is';

/** What the switch is doing right now: which model is answering, that Ollama
    is not running, or that the rewrite is off. Needs probeOllama() to have run
    for the first two — before that it describes what the switch is for. */
export function ollamaStatusText() {
  if (!isOllamaOn()) return 'Off — written answers as-is';
  if (probeCache.ok && probeCache.label) return probeCache.label;
  if (probeCache.at && !probeCache.ok) return 'Ollama is not running — written answers';
  return 'Uses the model on this Mac for food-aware answers';
}

export function ollamaRowHtml() {
  return ''
    + '<button type="button" class="topbar-menu-item sc-mcp-item sc-ollama-item" data-sc="ollama-toggle" role="menuitemcheckbox" aria-checked="true">'
    + '<span class="material-symbols-outlined topbar-menu-icon">' + OLLAMA_ICON + '</span>'
    + '<span class="topbar-menu-copy">'
    + '<span class="topbar-menu-title">' + OLLAMA_LABEL + '</span>'
    + '<span class="topbar-menu-desc" data-ollama-status>Food-aware answers on this Mac</span>'
    + '</span>'
    + '<span class="sc-switch" aria-hidden="true"></span>'
    + '</button>';
}

export function ensureOllamaMenuRow(pop) {
  if (!pop || pop.querySelector('[data-sc="ollama-toggle"]')) return pop && pop.querySelector('[data-sc="ollama-toggle"]');
  const stream = pop.querySelector('[data-sc="stream-toggle"]');
  if (!stream) return null;
  const next = stream.nextElementSibling;
  const anchor = (next && next.classList && next.classList.contains('sc-stream-detail')) ? next : stream;
  anchor.insertAdjacentHTML('afterend', ollamaRowHtml());
  return pop.querySelector('[data-sc="ollama-toggle"]');
}

export function syncOllamaMenu(root) {
  const scope = root && root.querySelectorAll ? root : document;
  const on = isOllamaOn();
  const text = ollamaStatusText();
  scope.querySelectorAll('[data-sc="ollama-toggle"]').forEach((el) => {
    el.classList.toggle('is-on', on);
    el.setAttribute('aria-checked', on ? 'true' : 'false');
    const status = el.querySelector('[data-ollama-status]');
    if (status) status.textContent = text;
  });
}

export function toggleOllamaOn() {
  return setOllamaOn(!isOllamaOn());
}

function numbersOf(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').match(/\d+(?:\.\d+)?/g) || [];
}

function factsIntact(original, next) {
  const have = numbersOf(next).slice();
  return numbersOf(original).every((n) => {
    const i = have.indexOf(n);
    if (i === -1) return false;
    have.splice(i, 1);
    return true;
  });
}

function restoreArrows(original, next) {
  if (String(original).indexOf('\u2192') === -1) return next;
  if (String(next).indexOf('\u2192') !== -1) return next;
  const lines = String(original).split(/<br\s*\/?>/i).filter((line) => line.indexOf('\u2192') !== -1);
  if (!lines.length) return next;
  return String(next).replace(/\s+$/, '') + '<br><br>' + lines.join('<br>');
}

function maskHtml(html) {
  const kept = [];
  if (typeof DOMParser === 'undefined') return { masked: html, kept };
  const doc = new DOMParser().parseFromString('<div id="wise-ollama-root">' + html + '</div>', 'text/html');
  const root = doc.getElementById('wise-ollama-root');
  if (!root) return { masked: html, kept };
  const seen = new Set();
  Array.from(root.querySelectorAll(KEEP_SEL)).forEach((el) => {
    if (!el || seen.has(el)) return;
    let p = el.parentElement;
    while (p && p !== root) {
      if (seen.has(p)) return;
      p = p.parentElement;
    }
    seen.add(el);
    const token = '\u27E6K' + kept.length + '\u27E7';
    kept.push(el.outerHTML);
    el.replaceWith(doc.createTextNode(token));
  });
  return { masked: root.innerHTML, kept };
}

function unmaskHtml(masked, kept) {
  let out = String(masked || '');
  kept.forEach((html, i) => {
    out = out.split('\u27E6K' + i + '\u27E7').join(html);
  });
  if (/\u27E6K\d+\u27E7/.test(out)) return '';
  return out;
}

function stripFence(text) {
  return String(text || '').replace(/^\s*```(?:html)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

/* Llama sometimes decorates rewrites with <font color="blue"> or inline styles.
   Strip that chrome so WISEcodeAI answers stay in the normal transcript ink. */
function stripModelChrome(html) {
  let out = String(html || '');
  if (!out) return out;
  if (typeof DOMParser === 'undefined') {
    return out
      .replace(/<\/?font\b[^>]*>/gi, '')
      .replace(/\sstyle=(["'])[^"']*\1/gi, '')
      .replace(/\scolor=(["'])[^"']*\1/gi, '');
  }
  const doc = new DOMParser().parseFromString('<div id="wise-ollama-root">' + out + '</div>', 'text/html');
  const root = doc.getElementById('wise-ollama-root');
  if (!root) return out;
  root.querySelectorAll('font').forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    el.remove();
  });
  root.querySelectorAll('[style]').forEach((el) => { el.removeAttribute('style'); });
  root.querySelectorAll('[color]').forEach((el) => { el.removeAttribute('color'); });
  return root.innerHTML;
}

function hasForeignColor(html) {
  return /<\/?font\b/i.test(html) || /\scolor=(["'])[^"']*\1/i.test(html) || /\bstyle=(["'])[^"']*color\s*:/i.test(html);
}

function htmlToPlain(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function numbersAllowed(source, output) {
  const pool = numbersOf(source).slice();
  return numbersOf(output).every((n) => {
    const i = pool.indexOf(n);
    if (i === -1) return false;
    pool.splice(i, 1);
    return true;
  });
}

function looksInventedFacts(text) {
  const plain = String(text || '');
  if (/\b\d+(?:\.\d+)?\s*\/\s*100\b/i.test(plain)) return true;
  if (/\b\d{5,}\b/.test(plain)) return true;
  return false;
}

const GENERIC_FALLBACK_RE = /ask about any food, ingredient, label, or diet question|full conversational flow lives in the reference app|On it\.\s*The full conversational/i;

function isScriptedIntent(intent) {
  const id = String(intent || '');
  return !!(id && !id.startsWith('web:'));
}

function isGenericFallback(html) {
  return GENERIC_FALLBACK_RE.test(String(html || ''));
}

function escAttr(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escText(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function citesHtml(refs) {
  if (!refs || !refs.length) return '';
  const inner = refs.map((r, i) => {
    const n = i + 1;
    return '<a class="wa-cite-n" role="button" tabindex="0" data-web-ref="'
      + escAttr(r.url) + '" aria-label="Open reference ' + n + ': ' + escAttr(r.title) + '">'
      + n + '</a>';
  }).join('<span class="wa-cite-sep">,</span>');
  return '<sup class="wa-cite">' + inner + '</sup>';
}

function refsMiniHtml(refs) {
  if (!refs || !refs.length) return '';
  const items = refs.map((r, i) =>
    '<div class="wa-refs-mini-item" role="button" tabindex="0" data-web-ref="' + escAttr(r.url)
    + '" aria-label="Open source: ' + escAttr(r.title) + '">'
    + '<span class="wa-refs-mini-n">' + (i + 1) + '</span>'
    + '<span class="wa-refs-mini-t"><b>' + escText(r.title) + '</b> '
    + '<span class="wa-refs-mini-src">' + escText(r.source) + '</span></span>'
    + '</div>').join('');
  return '<div class="wa-refs-mini">'
    + '<div class="wa-refs-mini-head">References <span style="opacity:.6">(' + refs.length + ')</span></div>'
    + '<div class="wa-refs-mini-list">' + items + '</div>'
    + '</div>';
}

function foodsHtml(products) {
  const list = (products || []).filter((p) => p && (p.image || p.name)).slice(0, 3);
  if (!list.length) return '';
  const cards = list.map((p) => {
    const thumb = p.image
      ? '<span class="wa-web-food-thumb"><img src="' + escAttr(p.image) + '" alt="" loading="lazy"></span>'
      : '';
    const brand = p.brand ? '<div class="wa-web-food-brand">' + escText(p.brand) + '</div>' : '';
    const open = p.url
      ? ' role="button" tabindex="0" data-web-ref="' + escAttr(p.url)
        + '" aria-label="Open source: ' + escAttr(p.name) + '"'
      : '';
    return '<div class="wa-web-food"' + open + '>' + thumb
      + '<div class="wa-web-food-copy">' + brand
      + '<div class="wa-web-food-name">' + escText(p.name) + '</div>'
      + (p.quantity ? '<div class="wa-web-food-qty">' + escText(p.quantity) + '</div>' : '')
      + '</div></div>';
  }).join('');
  return '<div class="wa-web-foods">' + cards + '</div>';
}

function attachCites(prose, refs) {
  if (!refs || !refs.length) return prose;
  if (/wa-cite|wa-refs-mini/.test(String(prose || ''))) return prose;
  const marks = citesHtml(refs);
  const trimmed = String(prose || '').replace(/\s+$/, '');
  if (/<\/p>\s*$/i.test(trimmed)) return trimmed.replace(/<\/p>\s*$/i, marks + '</p>');
  return trimmed + marks;
}

function inferChips(question, evidence) {
  const chips = [];
  const seen = new Set();
  const push = (intent, label, icon, ask) => {
    if (!intent || !label || seen.has(intent) || chips.length >= 4) return;
    seen.add(intent);
    chips.push({ intent, label, icon, ask });
  };
  const product = evidence && evidence.products && evidence.products[0];
  const q = String(question || '').trim();
  if (product) {
    const who = product.brand || product.name;
    push('web:ings', 'What’s in this?', 'receipt_long', 'What’s in ' + product.name + '?');
    push('web:nut', 'Nutrition facts', 'nutrition', 'Nutrition facts for ' + product.name);
    if (product.brand) push('web:brand', 'More from ' + product.brand, 'storefront', 'Show more ' + product.brand + ' products');
    push('web:similar', 'Similar foods', 'compare_arrows', 'What foods are similar to ' + who + '?');
  } else if (q) {
    push('web:food', 'Food angle', 'restaurant', 'How does this connect to food or nutrition: ' + q + '?');
    push('web:diet', 'Diet take', 'spa', 'What’s the diet or health take on: ' + q + '?');
    push('web:find', 'Find a product', 'search', 'Find a real food product related to: ' + q);
  }
  return chips;
}

const TALK_VOICE = [
  'You are WISEcodeAI in the WISE food-intelligence demo.',
  'Answer the member’s question directly first, in their terms — do not dodge it, joke past it, or replace it with a generic snack lecture.',
  'After you have answered what they asked, add a short, natural tie to food, nutrition, health, diet, ingredients, or labels when it helps. Keep that second beat brief.',
  'Sound like a knowledgeable colleague: warm, direct, contractions ok.',
  'If SOURCES are provided, use only those facts for names, brands, ingredients, and numbers. Do not invent products, WISEscores, UPCs, or counts.',
  'Do not say the answer came from a WISE database or registry when SOURCES are Wikipedia or Open Food Facts.',
  'Never write labels like FOOD 1, FOOD 2, or FACT: in the reply — those are for you, not the member.',
  'If they want a specific product that is not in the sources, say you could not find a matching package and ask them to name a brand or tap a chip.',
  'Return ONLY short HTML: one or two <p> tags. No markdown fence, font tags, colors, or link tags. Do not add a References list — that is added for you.',
].join(' ');

async function complete(model, system, prompt, predict, temperature) {
  const res = await tryUrls('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      options: { temperature: temperature != null ? temperature : 0.4, num_predict: predict || 420 },
    }),
  }, 12000);
  if (!res) return '';
  const data = await res.json();
  const text = data && data.message && data.message.content;
  return stripFence(text);
}

async function polishAnswer(html) {
  const { masked, kept } = maskHtml(html);
  const plain = masked.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (plain.length < 40) return html;
  const status = await probeOllama();
  if (!status.ok) return html;
  const system = [
    'You rewrite WISEcodeAI replies so they sound like a real food-intelligence colleague.',
    'Keep every number, product name, brand, score, date, percentage, and UPC exactly.',
    'Keep every HTML tag and every token like ⟦K0⟧ exactly where it is.',
    'Keep any line that contains → exactly as written.',
    'Do not add new facts, products, or numbers.',
    'Stay in food, nutrition, health, diet, ingredients, or labels — never drift into generic IT help.',
    'Use contractions where natural. Vary sentence length. No stiff brochure tone.',
    'Do not add font tags, color attributes, inline styles, or link tags.',
    'Return ONLY the rewritten HTML. No markdown fence.',
  ].join(' ');
  const out = await complete(status.model, system, masked, 520);
  if (!out) return html;
  const restored = stripModelChrome(restoreArrows(html, unmaskHtml(out, kept)));
  if (!restored || hasForeignColor(restored)) return html;
  if (!factsIntact(html, restored)) return html;
  const origLen = plain.length;
  const nextLen = restored.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length;
  if (nextLen < origLen * 0.45) return html;
  return restored;
}

function normalizeSimpleHtml(raw) {
  let out = stripModelChrome(stripFence(raw));
  if (!out) return '';
  out = out.replace(/\s*\((?:FOOD|FACT)\s*\d+\)/gi, '');
  if (!/<[a-z]/i.test(out)) out = '<p>' + out + '</p>';
  if (hasForeignColor(out)) return '';
  return out;
}

function simpleAnswerOk(question, fallbackHtml, html, evidenceText) {
  if (!html) return false;
  const plain = htmlToPlain(html);
  if (!plain || plain.length < 12 || plain.length > 780) return false;
  if (looksInventedFacts(plain)) return false;
  const source = question + ' ' + htmlToPlain(fallbackHtml) + ' ' + String(evidenceText || '');
  if (!numbersAllowed(source, plain)) return false;
  return true;
}

function fallbackFromEvidence(question, evidence) {
  const q = String(question || '').trim();
  const product = evidence && evidence.products && evidence.products[0];
  const wiki = evidence && evidence.wiki;
  if (wiki && wiki.extract) {
    const extract = wiki.extract.split(/(?<=[.!?])\s+/)[0] || wiki.extract;
    return '<p>' + escText(extract)
      + (product ? ' On the food side, a matching package is <strong>' + escText(product.name) + '</strong>'
        + (product.brand ? ' from ' + escText(product.brand) : '') + '.' : '')
      + '</p>';
  }
  if (product) {
    return '<p>On <strong>' + escText(q) + '</strong> — a real package that matches is <strong>'
      + escText(product.name) + '</strong>'
      + (product.brand ? ' from ' + escText(product.brand) : '')
      + (product.ingredients ? '. Ingredients start with ' + escText(product.ingredients.split(',')[0]) + '.' : '.')
      + '</p>';
  }
  return '';
}

async function talkAnswer({ question, fallbackHtml, pageHint, evidence }) {
  const status = await probeOllama();
  const evText = evidence && evidence.text ? evidence.text : '';
  let prose = '';
  if (status.ok) {
    const prompt = [
      pageHint ? 'Page: ' + pageHint : '',
      'Member asked: ' + question,
      evText ? 'SOURCES (numbered; use only these facts):\n' + evText : 'No web sources landed. Answer the question itself; do not invent a product.',
      fallbackHtml ? 'Written fallback (do not contradict): ' + htmlToPlain(fallbackHtml) : '',
    ].filter(Boolean).join('\n');
    const out = await complete(status.model, TALK_VOICE, prompt, 360, 0.42);
    const html = normalizeSimpleHtml(out);
    if (simpleAnswerOk(question, fallbackHtml, html, evText)) prose = html;
  }
  if (!prose) prose = fallbackFromEvidence(question, evidence);
  if (!prose) return '';
  const refs = (evidence && evidence.refs) || [];
  if (/wa-refs-mini/.test(prose)) return prose;
  const withCites = attachCites(prose, refs);
  return withCites + foodsHtml(evidence && evidence.products) + refsMiniHtml(refs);
}

function asPack(html, chips, source) {
  return { html: html || '', chips: chips || [], source: source || '' };
}

export async function enrichReply({ question, intent, html, pageHint }) {
  if (!isOllamaOn() || !pageIsLocal()) return asPack(html);
  try {
    if (isScriptedIntent(intent) && !isGenericFallback(html)) {
      return asPack(await polishAnswer(html));
    }
    const evidence = await gatherEvidence(question);
    const talked = await talkAnswer({ question, fallbackHtml: html, pageHint, evidence });
    if (talked) {
      return asPack(talked, inferChips(question, evidence), evidence.source);
    }
    return asPack(await polishAnswer(html), inferChips(question, evidence), evidence.source);
  } catch (_) {
    return asPack(html);
  }
}

export async function refineReply(html) {
  if (!isOllamaOn()) return html;
  if (!pageIsLocal()) return html;
  try {
    return await polishAnswer(html);
  } catch (_) {
    return html;
  }
}

export function withTimeout(promise, ms, fallback) {
  return new Promise((resolve) => {
    let done = false;
    const t = setTimeout(() => {
      if (done) return;
      done = true;
      resolve(fallback);
    }, ms);
    Promise.resolve(promise).then((v) => {
      if (done) return;
      done = true;
      clearTimeout(t);
      resolve(v);
    }, () => {
      if (done) return;
      done = true;
      clearTimeout(t);
      resolve(fallback);
    });
  });
}

/* Serialise paints so a burst of replies (a restored thread, a plan walk-
   through) cannot land out of order while several rewrites are in flight. */
let paintQueue = Promise.resolve();

export function polishThen(html, paint) {
  const go = (out) => {
    try { paint(out || html); } catch (_) {
      try { paint(html); } catch (__) { /* host paint */ }
    }
  };
  if (!isOllamaOn() || !pageIsLocal()) {
    go(html);
    return paintQueue;
  }
  paintQueue = paintQueue.then(() => withTimeout(refineReply(html), 8500, html).then(go, () => go(html)));
  return paintQueue;
}

const api = {
  enrichReply,
  refineReply,
  polishThen,
  withTimeout,
  isOllamaOn,
  setOllamaOn,
  toggleOllamaOn,
  probeOllama,
  ollamaStatusText,
  ensureOllamaMenuRow,
  syncOllamaMenu,
};
if (typeof window !== 'undefined') window.WiseOllama = api;
