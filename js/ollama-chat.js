/**
 * Local reading — talks to Ollama on this Mac so WISEcodeAI answers read
 * more naturally. Falls back to the original written copy when the model
 * is not running. Never invents scores, counts, or product facts.
 *
 *   import { refineReply, isOllamaOn } from './ollama-chat.js';
 *   const html = await refineReply(cannedHtml);
 */

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
  '.wa-ce-ing',
  'table',
  'svg',
  'canvas',
  'img',
  '[data-open-module]',
  '[data-cat-ref]',
  '[data-news-open]',
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

function ollamaStatusText() {
  if (!isOllamaOn()) return 'Off — written answers as-is';
  if (probeCache.ok && probeCache.label) return probeCache.label;
  if (probeCache.at && !probeCache.ok) return 'Ollama is not running — written answers';
  return 'Uses the model on this Mac';
}

export function ollamaRowHtml() {
  return ''
    + '<button type="button" class="topbar-menu-item sc-mcp-item sc-ollama-item" data-sc="ollama-toggle" role="menuitemcheckbox" aria-checked="true">'
    + '<span class="material-symbols-outlined topbar-menu-icon">auto_stories</span>'
    + '<span class="topbar-menu-copy">'
    + '<span class="topbar-menu-title">Clearer reading</span>'
    + '<span class="topbar-menu-desc" data-ollama-status>Uses the model on this Mac</span>'
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

async function complete(model, system, prompt, predict) {
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
      options: { temperature: 0.35, num_predict: predict || 420 },
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
    'You rewrite WISEcodeAI replies so they are easier to read.',
    'Keep every number, product name, brand, score, date, percentage, and UPC exactly.',
    'Keep every HTML tag and every token like ⟦K0⟧ exactly where it is.',
    'Keep any line that contains → exactly as written.',
    'Do not add new facts, products, or numbers.',
    'Do not add a greeting or a closing question.',
    'Make sentences shorter and clearer. Prefer plain words. Keep the warm, direct voice.',
    'Return ONLY the rewritten HTML. No markdown fence.',
  ].join(' ');
  const out = await complete(status.model, system, masked, 520);
  if (!out) return html;
  const restored = restoreArrows(html, unmaskHtml(out, kept));
  if (!restored) return html;
  if (!factsIntact(html, restored)) return html;
  const origLen = plain.length;
  const nextLen = restored.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length;
  if (nextLen < origLen * 0.45) return html;
  return restored;
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
