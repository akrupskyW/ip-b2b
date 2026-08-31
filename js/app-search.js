/* ------------------------------------------------------------------ */
/* App search                                                          */
/* ------------------------------------------------------------------ */
/*
 * Admin-gated search field that sits in the shell's top band, horizontally
 * aligned with the primary-nav logo. Appearance ▸ Admin ▸ Search is locked
 * off — the published load default is OFF and the row cannot turn it on.
 * A leftover wise-app-search=1 from an earlier session is ignored.
 *
 * The index is strictly transcripts (AI chat history + the live thread),
 * outputs (live panes, titles extracted from transcripts, generated-report
 * charts), and reports (Studio catalog + generated reports). The full
 * typed query is AND-matched across every token.
 */

import { listGeneratedReports, getGeneratedReport } from './generated-reports.js';
import { restoreFullBleed, syncSearchFloatedFooter } from './topbar.js';

const LS_KEY = 'wise-app-search';
const HTML_CLASS = 'app-search-on';
const PENDING_CHAT_KEY = 'wise-search-open-chat';
const PENDING_REPORT_KEY = 'wise-search-open-report';

const historyApis = new Map();

const HISTORY_SURFACES = [
  { key: 'wise-chat-history:wiseai', page: 'wiseai.html', label: 'WISEcodeAI', where: 'WISEcodeAI · Chat' },
  { key: 'wise-chat-history:ai-dashboard', page: 'ai-dashboard.html', label: 'AI Dashboard', where: 'AI Dashboard · Chat' },
  { key: 'wise-chat-history:studio-ai', page: 'studio-ai.html', label: 'Studio & AI', where: 'Studio & AI · Chat' },
  { key: 'wise-chat-history:reformulation', page: 'reformulation.html', label: 'Reformulation', where: 'Reformulation · Chat' },
  { key: 'wise-chat-history:add-product', page: 'add-product.html', label: 'Add Product', where: 'Add Product · Chat' },
  { key: 'wise-chat-history:add-catalog', page: 'add-catalog.html', label: 'Add Catalog', where: 'Add Catalog · Chat' },
  { key: 'wise-chat-history:product-portfolio', page: 'product-portfolio.html', label: 'Product Portfolio', where: 'Product Portfolio · Chat' },
  { key: 'wise-chat-history:product-comparison', page: 'product-comparison.html', label: 'Comparison', where: 'Comparison · Chat' },
  { key: 'wise-chat-history:view-product', page: 'view-product.html', label: 'View Product', where: 'View Product · Chat' },
  { key: 'wise-chat-history:guiding-stars', page: 'report-guiding-stars.html', label: 'Guiding Stars', where: 'Guiding Stars · Chat' },
  { key: 'wise-chat-history:progress-log', page: 'progress-log.html', label: 'Progress log', where: 'Progress log · Chat' },
  { key: 'wise-chat-history:accessibility-review', page: 'accessibility-review.html', label: 'Accessibility', where: 'Accessibility · Chat' },
  { key: 'wise-chat-history:helix', page: 'helix.html', label: 'Helix', where: 'Helix · Chat' },
  { key: 'wise-mkt-chat-history', page: 'wiseai.html', label: 'WISEcodeAI', where: 'WISEcodeAI · Chat' },
];

/* Seed titles/asks so search is useful before a browser has opened WISEcodeAI
   and written the History store. Skipped once that store has real items. */
const TRANSCRIPT_FALLBACK = [
  { title: 'Compare oat-milk brands for gut health', text: 'Compare the top oat-milk brands for gut health. Scanning oat-milk products, added sugars, oils and gums. Oatly Barista leads on gut-health score.' },
  { title: 'If I identified as a cat…', text: 'If I told you that I identified as a cat, what type of food would you feed me? What nutrients do cats require? Taurine, protein, moisture, wet foods.' },
  { title: 'Build me a gut-healthy brisket recipe', text: 'If I was to make a brisket, what ingredients would give the best gut-health score?' },
  { title: 'What’s the worst food in our database?', text: 'What’s the worst food in our database? Tell me more about the worst-ranked cupcake.' },
  { title: 'Best chocolate chip cookie with the least chocolate', text: 'Best chocolate chip cookie with the least chocolate. Show me a pretty report — all the charts & trends.' },
  { title: 'Is this ingredient list ultra-processed?', text: 'Is this ingredient list ultra-processed? Spider-chart the 10 worst foods by gut & immune health.' },
];

const REPORT_CATALOG = [
  { id: 'rpt-gs', title: 'Guiding Stars Action Plan', desc: 'Your prioritized path to more stars — quick wins, near-misses, and the competitive gap.', href: 'report-guiding-stars.html', where: 'Reports · Portfolio reports', icon: 'star' },
  { id: 'rpt-pupf', title: 'Portfolio UPF', desc: 'Ultra-processed food classification across every product in your portfolio.', href: 'product-portfolio.html?report=upf', where: 'Reports · Portfolio reports', icon: 'description' },
  { id: 'rpt-pgras', title: 'Portfolio GRAS', desc: 'Generally-recognized-as-safe assessment across your portfolio.', href: 'reports.html', where: 'Reports · Portfolio reports', icon: 'verified_user', locked: true },
  { id: 'rpt-pins', title: 'Portfolio Insights', desc: 'Nutrient and ingredient insights across your portfolio.', href: 'reports.html', where: 'Reports · Portfolio reports', icon: 'insights', locked: true },
  { id: 'rpt-prupf', title: 'Product UPF', desc: 'Ultra-processed food classification for a single product.', href: 'product-portfolio.html?report=upf', where: 'Reports · Product reports', icon: 'description' },
  { id: 'rpt-prdetails', title: 'Product Details Report', desc: 'Nutrition, ingredients, and classification for a single product.', href: 'product-portfolio.html?report=details', where: 'Reports · Product reports', icon: 'receipt_long' },
  { id: 'rpt-prgras', title: 'Product GRAS', desc: 'Generally-recognized-as-safe assessment for a product.', href: 'reports.html', where: 'Reports · Product reports', icon: 'verified_user', locked: true },
  { id: 'rpt-prins', title: 'Product Insights', desc: 'Nutrient and ingredient insights for a single product.', href: 'reports.html', where: 'Reports · Product reports', icon: 'insights', locked: true },
  { id: 'rpt-iq', title: 'Ingredient Quality', desc: 'Composite ingredient-quality score, with per-metric views of artificial additives, clean label, seed oils, and more.', href: 'analytics-types.html', where: 'Reports · Metric deep-dives', icon: 'science' },
  { id: 'rpt-nq', title: 'Nutrient Quality', desc: 'Composite nutrient-quality score, with per-metric views of protein, fiber, fat, carbohydrate, and sugar quality.', href: 'reports.html', where: 'Reports · Metric deep-dives', icon: 'nutrition', locked: true },
  { id: 'rpt-ho', title: 'Health Outcomes', desc: 'Composite health-outcomes score, with per-metric views of heart, gut, muscle, and metabolic health.', href: 'reports.html', where: 'Reports · Metric deep-dives', icon: 'favorite', locked: true },
];

const OUTPUT_TITLE_SELS = '.wa-sec-title, .wa-report-title, .wa-dhero-name, .wa-out-title, .wa-chart-head';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pageHref(file) {
  const name = String(file || '').replace(/^\//, '');
  if (!name) return name;
  const inPages = /\/pages(?:\/|$)/.test(location.pathname);
  if (/^https?:/i.test(name) || name.startsWith('../')) return name;
  return inPages ? name : (`pages/${name}`);
}

function currentPageFile() {
  const parts = location.pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
}

/** Always false — Search is locked to the published off default. */
export function isAppSearchOn() {
  return false;
}

/**
 * Search is locked off. `on` is ignored so a leftover toggle or stored
 * preference cannot mount the row. Clears the old wise-app-search key so
 * FOUC / full-bleed never treat Search as on.
 * @param {boolean} [_on]
 * @param {boolean} [_persist]
 */
export function applyAppSearch(_on, _persist = true) {
  const val = false;
  try { localStorage.removeItem(LS_KEY); } catch (_) { /* session-only */ }
  document.documentElement.classList.toggle(HTML_CLASS, val);
  if (val) {
    document.documentElement.classList.remove('full-bleed', 'fb-chat-only');
    mountSearchRow();
    try { syncSearchFloatedFooter(); } catch (_) { /* footer not mounted yet */ }
  } else {
    try { syncSearchFloatedFooter(); } catch (_) { /* footer not mounted yet */ }
    unmountSearchRow();
    try { restoreFullBleed(); } catch (_) { /* topbar not ready */ }
  }
  try { document.dispatchEvent(new CustomEvent('wise:app-search', { detail: { on: val } })); } catch (_) {}
}

/** Re-apply the locked-off default and drop any leftover stored on-state. */
export function restoreAppSearch() {
  applyAppSearch(false, false);
}

/* ------------------------------------------------------------------ */
/* Index                                                               */
/* ------------------------------------------------------------------ */

function htmlToText(html) {
  if (!html) return '';
  try {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    tmp.querySelectorAll('script, style, .sc-inline-chips, .sc-line-typing, .sc-line-trace').forEach((n) => n.remove());
    return (tmp.textContent || '').replace(/\s+/g, ' ').trim();
  } catch (_) {
    return String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

function extractOutputTitles(html) {
  const titles = [];
  if (!html) return titles;
  try {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    tmp.querySelectorAll(OUTPUT_TITLE_SELS).forEach((el) => {
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (t && t.length < 160) titles.push(t);
    });
    tmp.querySelectorAll('[data-slide-title]').forEach((el) => {
      const t = (el.getAttribute('data-slide-title') || '').trim();
      if (t) titles.push(t);
    });
  } catch (_) { /* ignore parse errors */ }
  return [...new Set(titles)];
}

function readHistoryItems(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '{}') || {};
    return Array.isArray(raw.items) ? raw.items : [];
  } catch (_) {
    return [];
  }
}

function listHistoryStores() {
  const known = new Map(HISTORY_SURFACES.map((s) => [s.key, s]));
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !/chat-history/i.test(k)) continue;
      out.push(known.get(k) || { key: k, page: 'wiseai.html', label: 'Chat', where: 'AI chat · History' });
    }
  } catch (_) { /* storage blocked */ }
  HISTORY_SURFACES.forEach((s) => {
    if (!out.some((x) => x.key === s.key)) out.push(s);
  });
  return out;
}

function collectTranscripts() {
  const rows = [];
  const seen = new Set();
  listHistoryStores().forEach((surf) => {
    const items = readHistoryItems(surf.key);
    items.forEach((it) => {
      if (!it || !it.id) return;
      const id = `${surf.key}:${it.id}`;
      if (seen.has(id)) return;
      seen.add(id);
      const body = htmlToText(it.html);
      rows.push({
        kind: 'transcript',
        id,
        chatId: it.id,
        storageKey: surf.key,
        page: surf.page,
        title: it.title || 'Conversation',
        text: `${it.title || ''} ${body}`,
        snippetSrc: body,
        where: surf.where,
        icon: 'forum',
        ts: Number(it.ts) || 0,
        outputs: extractOutputTitles(it.html),
      });
    });
  });

  const wiseaiStore = readHistoryItems('wise-chat-history:wiseai');
  if (!wiseaiStore.length) {
    TRANSCRIPT_FALLBACK.forEach((fb, i) => {
      const id = `fallback:wiseai:${i}`;
      rows.push({
        kind: 'transcript',
        id,
        chatId: '',
        storageKey: 'wise-chat-history:wiseai',
        page: 'wiseai.html',
        title: fb.title,
        text: `${fb.title} ${fb.text}`,
        snippetSrc: fb.text,
        where: 'WISEcodeAI · Chat',
        icon: 'forum',
        ts: 0,
        outputs: [],
        fallback: true,
      });
    });
  }

  const live = document.querySelector('#wa-chat .chat-messages-area, .wa-chat .chat-messages-area, .chat-messages-area');
  if (live) {
    const body = (live.textContent || '').replace(/\s+/g, ' ').trim();
    if (body) {
      rows.push({
        kind: 'transcript',
        id: 'live:current',
        chatId: '',
        storageKey: '',
        page: currentPageFile() || 'wiseai.html',
        title: 'This conversation',
        text: body,
        snippetSrc: body,
        where: 'WISEcodeAI · Live transcript',
        icon: 'forum',
        ts: Date.now(),
        outputs: extractOutputTitles(live.innerHTML),
        live: true,
      });
    }
  }
  return rows;
}

function collectOutputs(transcripts) {
  const rows = [];
  const seen = new Set();
  const add = (row) => {
    const key = `${row.title}::${row.where}`;
    if (!row.title || seen.has(key)) return;
    seen.add(key);
    rows.push(row);
  };

  document.querySelectorAll('#wa-results .wa-block, #wa-visuals .wa-block, #wa-unified .wa-block, #wa-report .wa-block').forEach((block, i) => {
    const title = (block.dataset.slideTitle
      || block.querySelector(OUTPUT_TITLE_SELS)?.textContent
      || '').replace(/\s+/g, ' ').trim()
      || `Output ${i + 1}`;
    const pane = block.closest('.wa-pane');
    const paneLabel = pane?.getAttribute('aria-label') || 'Outputs';
    add({
      kind: 'output',
      id: `live-out:${title}`,
      title,
      text: `${title} ${(block.textContent || '').replace(/\s+/g, ' ')}`,
      snippetSrc: (block.textContent || '').replace(/\s+/g, ' ').trim(),
      where: `WISEcodeAI · ${paneLabel}`,
      page: currentPageFile() || 'wiseai.html',
      icon: 'dashboard_customize',
      live: true,
      blockTitle: title,
    });
  });

  transcripts.forEach((tr) => {
    (tr.outputs || []).forEach((title) => {
      add({
        kind: 'output',
        id: `tr-out:${tr.id}:${title}`,
        title,
        text: `${title} ${tr.title} ${tr.snippetSrc || ''}`,
        snippetSrc: `From “${tr.title}”`,
        where: `${tr.where} · Output`,
        page: tr.page,
        icon: 'dashboard_customize',
        storageKey: tr.storageKey,
        chatId: tr.chatId,
      });
    });
  });

  listGeneratedReports().forEach((rec) => {
    (rec.items || []).forEach((title) => {
      add({
        kind: 'output',
        id: `gen-out:${rec.id}:${title}`,
        title,
        text: `${title} ${rec.title} ${rec.conversation || ''}`,
        snippetSrc: rec.conversation ? `Chart in “${rec.title}” · from “${rec.conversation}”` : `Chart in “${rec.title}”`,
        where: 'Reports · Generated from Output',
        page: 'reports.html',
        icon: 'bar_chart',
        reportId: rec.id,
      });
    });
  });

  return rows;
}

function collectReports() {
  const rows = REPORT_CATALOG.map((r) => ({
    kind: 'report',
    id: r.id,
    title: r.title,
    text: `${r.title} ${r.desc} ${r.where}`,
    snippetSrc: r.desc,
    where: r.where,
    page: r.href,
    icon: r.icon || 'description',
    locked: r.locked === true,
  }));

  listGeneratedReports().forEach((rec) => {
    const items = (rec.items || []).join(' · ');
    rows.push({
      kind: 'report',
      id: `gen:${rec.id}`,
      title: rec.title,
      text: `${rec.title} ${items} ${rec.conversation || ''} generated report`,
      snippetSrc: items || rec.conversation || 'Generated from Output',
      where: 'Reports · Your generated reports',
      page: 'reports.html',
      icon: rec.icon || 'analytics',
      reportId: rec.id,
      ts: rec.createdAt,
    });
  });
  return rows;
}

function tokensOf(q) {
  return String(q || '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}%+.-]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function scoreHay(hay, title, toks) {
  if (!toks.length) return 0;
  const h = String(hay || '').toLowerCase();
  const t = String(title || '').toLowerCase();
  let score = 0;
  for (const tok of toks) {
    if (!h.includes(tok)) return 0;
    score += t.includes(tok) ? 10 : 3;
    if (t.startsWith(tok)) score += 6;
  }
  const phrase = toks.join(' ');
  if (phrase && t.includes(phrase)) score += 24;
  else if (phrase && h.includes(phrase)) score += 14;
  return score;
}

function snippetAround(src, toks, max = 140) {
  const text = String(src || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const lower = text.toLowerCase();
  let idx = -1;
  for (const tok of toks) {
    idx = lower.indexOf(tok);
    if (idx >= 0) break;
  }
  if (idx < 0) return text.slice(0, max) + (text.length > max ? '…' : '');
  const start = Math.max(0, idx - 36);
  const end = Math.min(text.length, start + max);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

function highlight(text, toks) {
  const raw = esc(text);
  if (!toks.length) return raw;
  const parts = toks.slice().sort((a, b) => b.length - a.length).map(esc);
  const re = new RegExp(`(${parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig');
  return raw.replace(re, '<mark>$1</mark>');
}

function searchIndex(query) {
  const toks = tokensOf(query);
  if (!toks.length) return { toks, groups: [] };
  const transcripts = collectTranscripts();
  const corpus = [
    ...transcripts,
    ...collectOutputs(transcripts),
    ...collectReports(),
  ];
  const hits = corpus
    .map((row) => {
      const score = scoreHay(row.text, row.title, toks);
      if (!score) return { row, score: 0 };
      return { row, score: score + (row.ts ? 1 : 0) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const order = ['transcript', 'output', 'report'];
  const labels = { transcript: 'Transcripts', output: 'Outputs', report: 'Reports' };
  const groups = order.map((kind) => {
    const items = hits.filter((h) => h.row.kind === kind).slice(0, 8);
    return { kind, label: labels[kind], items };
  }).filter((g) => g.items.length);
  return { toks, groups };
}

/* ------------------------------------------------------------------ */
/* Open a hit                                                          */
/* ------------------------------------------------------------------ */

function openChat(row) {
  if (row.live) {
    const live = document.querySelector('.chat-messages-area');
    live?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return;
  }
  if (row.storageKey && row.chatId) {
    const api = historyApis.get(row.storageKey);
    if (api && currentPageFile() === row.page) {
      try {
        api.restore(row.chatId);
        api.root?.classList.remove('wch-docked-hidden');
        api.open?.();
      } catch (_) { /* restore best-effort */ }
      return;
    }
    try {
      sessionStorage.setItem(PENDING_CHAT_KEY, JSON.stringify({
        storageKey: row.storageKey,
        id: row.chatId,
      }));
    } catch (_) { /* ignore */ }
  }
  location.href = pageHref(row.page || 'wiseai.html');
}

function flashBlock(block) {
  if (!block) return;
  const pane = block.closest('.wa-pane');
  if (pane) pane.classList.add('is-open');
  block.classList.add('wise-search-flash');
  block.scrollIntoView({ block: 'center', behavior: 'smooth' });
  setTimeout(() => block.classList.remove('wise-search-flash'), 1600);
}

function openOutput(row) {
  if (row.live || currentPageFile() === (row.page || '')) {
    const blocks = document.querySelectorAll('.wa-block');
    let found = null;
    blocks.forEach((b) => {
      if (found) return;
      const t = (b.dataset.slideTitle
        || b.querySelector(OUTPUT_TITLE_SELS)?.textContent
        || '').replace(/\s+/g, ' ').trim();
      if (t && (t === row.blockTitle || t === row.title)) found = b;
    });
    if (found) { flashBlock(found); return; }
  }
  if (row.reportId) {
    try { sessionStorage.setItem(PENDING_REPORT_KEY, row.reportId); } catch (_) {}
    location.href = pageHref('reports.html');
    return;
  }
  if (row.storageKey && row.chatId) {
    openChat(row);
    return;
  }
  location.href = pageHref(row.page || 'wiseai.html');
}

function openReport(row) {
  if (row.reportId) {
    if (currentPageFile() === 'reports.html') {
      try {
        document.dispatchEvent(new CustomEvent('wise:open-generated-report', { detail: { id: row.reportId } }));
      } catch (_) {}
      return;
    }
    try { sessionStorage.setItem(PENDING_REPORT_KEY, row.reportId); } catch (_) {}
    location.href = pageHref('reports.html');
    return;
  }
  location.href = pageHref(row.page || 'reports.html');
}

function openHit(row) {
  if (!row) return;
  if (row.kind === 'transcript') openChat(row);
  else if (row.kind === 'output') openOutput(row);
  else openReport(row);
}

function onHistoryReady(ev) {
  const api = ev.detail && ev.detail.api;
  const key = ev.detail && ev.detail.storageKey;
  if (api && key) historyApis.set(key, api);
  if (!api || !key) return;
  try {
    const raw = sessionStorage.getItem(PENDING_CHAT_KEY);
    if (!raw) return;
    const pending = JSON.parse(raw);
    if (!pending || pending.storageKey !== key || !pending.id) return;
    sessionStorage.removeItem(PENDING_CHAT_KEY);
    api.restore(pending.id);
    api.root?.classList.remove('wch-docked-hidden');
    api.open?.();
  } catch (_) { /* ignore */ }
}

/* ------------------------------------------------------------------ */
/* Row UI                                                              */
/* ------------------------------------------------------------------ */

function findShell() {
  return document.getElementById('chat-shell-wrap')
    || document.getElementById('agent-shell-wrap')
    || document.querySelector('.menu-brand-integrated');
}

function unmountSearchRow() {
  const search = document.getElementById('wise-app-search');
  const footer = search?.querySelector('.menu-footer');
  const inner = document.querySelector('#menu-panel .menu-inner');
  if (footer && inner && footer.parentElement !== inner) {
    footer.classList.remove('menu-footer--search-float');
    inner.appendChild(footer);
  }
  search?.remove();
  document.documentElement.classList.remove(HTML_CLASS);
}

function mountSearchRow() {
  if (document.getElementById('wise-app-search')) return;
  const el = document.createElement('div');
  el.id = 'wise-app-search';
  el.className = 'wise-app-search';
  el.innerHTML = `
    <div class="wise-app-search-inner">
      <div class="wise-app-search-field">
        <span class="wise-app-search-ph" aria-hidden="true">
          <span class="material-symbols-outlined">search</span>
          <span class="wise-app-search-ph-label">Search reports, files, and documents</span>
        </span>
        <input type="search" class="wise-app-search-input" id="wise-app-search-input"
          placeholder="Search reports, files, and documents"
          autocomplete="off" spellcheck="false" aria-label="Search reports, files, and documents"
          aria-controls="wise-app-search-results" aria-autocomplete="list" />
        <button type="button" class="wise-app-search-clear" hidden aria-label="Clear search">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    </div>
    <div class="wise-app-search-results" id="wise-app-search-results" hidden role="listbox" aria-label="Search results"></div>
  `;
  const shell = findShell();
  if (shell) shell.insertBefore(el, shell.firstChild);
  else document.body.insertBefore(el, document.body.firstChild);
  wireSearchRow(el);
}

function wireSearchRow(root) {
  const input = root.querySelector('.wise-app-search-input');
  const clear = root.querySelector('.wise-app-search-clear');
  const panel = root.querySelector('.wise-app-search-results');
  if (!input || !panel) return;
  let active = -1;
  let flat = [];

  const setOpen = (on) => {
    panel.hidden = !on;
    root.classList.toggle('is-open', !!on);
  };

  const render = () => {
    const q = input.value;
    const has = q.trim().length > 0;
    if (clear) clear.hidden = !has;
    root.classList.toggle('has-q', has);
    if (!has) { panel.innerHTML = ''; setOpen(false); active = -1; flat = []; return; }
    const { toks, groups } = searchIndex(q);
    flat = [];
    if (!groups.length) {
      panel.innerHTML = `<div class="wise-app-search-empty">No files, reports, or documents match <strong>${esc(q.trim())}</strong>.</div>`;
      setOpen(true);
      active = -1;
      return;
    }
    panel.innerHTML = groups.map((g) => {
      const items = g.items.map((hit) => {
        const i = flat.length;
        flat.push(hit.row);
        const snip = snippetAround(hit.row.snippetSrc || hit.row.text, toks);
        const lock = hit.row.locked ? '<span class="wise-app-search-lock material-symbols-outlined" aria-hidden="true">lock</span>' : '';
        return `<button type="button" class="wise-app-search-hit" role="option" data-i="${i}" id="wise-app-search-hit-${i}">
          <span class="material-symbols-outlined wise-app-search-hit-ico" aria-hidden="true">${esc(hit.row.icon || 'search')}</span>
          <span class="wise-app-search-hit-body">
            <span class="wise-app-search-hit-title">${highlight(hit.row.title, toks)}${lock}</span>
            <span class="wise-app-search-hit-where">${esc(hit.row.where)}</span>
            ${snip ? `<span class="wise-app-search-hit-snip">${highlight(snip, toks)}</span>` : ''}
          </span>
        </button>`;
      }).join('');
      return `<section class="wise-app-search-group">
        <h3 class="wise-app-search-group-title">${esc(g.label)}</h3>
        ${items}
      </section>`;
    }).join('');
    setOpen(true);
    active = -1;
  };

  const paintActive = () => {
    panel.querySelectorAll('.wise-app-search-hit').forEach((btn) => {
      const on = Number(btn.dataset.i) === active;
      btn.classList.toggle('is-active', on);
      if (on) btn.scrollIntoView({ block: 'nearest' });
    });
    input.setAttribute('aria-activedescendant', active >= 0 ? `wise-app-search-hit-${active}` : '');
  };

  input.addEventListener('input', render);
  input.addEventListener('focus', () => { if (input.value.trim()) render(); });
  clear?.addEventListener('click', () => {
    input.value = '';
    render();
    input.focus();
  });
  panel.addEventListener('mousedown', (e) => {
    const hit = e.target.closest('.wise-app-search-hit');
    if (!hit) return;
    e.preventDefault();
    const row = flat[Number(hit.dataset.i)];
    openHit(row);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (input.value) { input.value = ''; render(); }
      else { setOpen(false); input.blur(); }
      e.stopPropagation();
      return;
    }
    if (e.key === 'ArrowDown' && flat.length) {
      e.preventDefault();
      active = (active + 1) % flat.length;
      paintActive();
      return;
    }
    if (e.key === 'ArrowUp' && flat.length) {
      e.preventDefault();
      active = active <= 0 ? flat.length - 1 : active - 1;
      paintActive();
      return;
    }
    if (e.key === 'Enter' && flat.length) {
      e.preventDefault();
      openHit(flat[active >= 0 ? active : 0]);
    }
  });
  document.addEventListener('pointerdown', (e) => {
    if (!root.contains(e.target) || e.target.closest('.menu-footer')) setOpen(false);
  });
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

function boot() {
  restoreAppSearch();
}

if (typeof document !== 'undefined') {
  document.addEventListener('wise:chat-history-ready', onHistoryReady);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}
