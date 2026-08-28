/**
 * WISEcodeAI Library store — the shelf on conversation-library.html.
 *
 * History already keeps every thread. File to Library copies the live
 * conversation onto the shared Library shelf so it shows up with reports,
 * dashboards, and the rest of the WISEcodeAI library — not only in the
 * History drawer.
 *
 *   WiseLibraryStore.fileCurrent({ chatHistory, messagesEl, historyKey })
 *   WiseLibraryStore.list()
 *   WiseLibraryStore.get(id)
 *
 * Works as a classic <script src> (attaches window.WiseLibraryStore) and as a
 * side-effect ES import from wiseai-chat.js.
 */
(function (global) {
  'use strict';
  if (global.WiseLibraryStore) return;

  var ITEMS_KEY = 'wise-lib-filed';
  var MAX_ITEMS = 80;
  var CHANGE_EVENT = 'wise:library-change';

  function readItems() {
    try {
      var raw = JSON.parse(global.localStorage.getItem(ITEMS_KEY) || '[]');
      return Array.isArray(raw) ? raw.filter(function (it) { return it && it.id; }) : [];
    } catch (_) {
      return [];
    }
  }

  function writeItems(items) {
    try { global.localStorage.setItem(ITEMS_KEY, JSON.stringify(items)); } catch (_) {}
    try {
      global.document.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { items: items } }));
    } catch (_) {}
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function clip(s, n) {
    var t = String(s || '').replace(/\s+/g, ' ').trim();
    n = n || 140;
    if (t.length <= n) return t;
    return t.slice(0, n - 1).trim() + '\u2026';
  }

  function cleanNode(el) {
    if (!el) return '';
    var clone = el.cloneNode(true);
    clone.querySelectorAll(
      '.sc-line-meta,.msg-source-chips,.sc-reply-chips,.sc-inline-chips,.sc-surface-card,.sc-fb-row,.material-symbols-outlined'
    ).forEach(function (n) { n.remove(); });
    return (clone.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function previewFromHtml(html) {
    var you = '';
    var ai = '';
    try {
      var tmp = global.document.createElement('div');
      tmp.innerHTML = html || '';
      var youEl = tmp.querySelector('.sc-line-you:not(.sc-line-event) .sc-line-body, .msg.user');
      var aiEl = tmp.querySelector('.sc-line-wiseai:not(.sc-line-typing) .sc-line-body, .msg.assistant, .msg.bot');
      you = clip(cleanNode(youEl));
      ai = clip(cleanNode(aiEl));
    } catch (_) {}
    return { you: you, ai: ai };
  }

  function previewFromMessages(messagesEl) {
    if (!messagesEl) return { you: '', ai: '' };
    var youEl = messagesEl.querySelector('.sc-line-you:not(.sc-line-event) .sc-line-body, .msg.user');
    var aiEl = messagesEl.querySelector('.sc-line-wiseai:not(.sc-line-typing) .sc-line-body, .msg.assistant, .msg.bot');
    return { you: clip(cleanNode(youEl)), ai: clip(cleanNode(aiEl)) };
  }

  function formatDate(ts) {
    try {
      return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (_) {
      return '';
    }
  }

  function paneOpen(id) {
    var el = global.document && global.document.getElementById(id);
    return !!(el && el.classList.contains('is-open'));
  }

  function detectType() {
    if (paneOpen('wa-report')) return 'report';
    if (paneOpen('wa-results') || paneOpen('wa-visuals') || paneOpen('wa-unified')) return 'dashboard';
    return 'chat';
  }

  function detectTitle() {
    var pairs = [
      ['wa-report', 'wa-report-title'],
      ['wa-unified', 'wa-unified-title'],
      ['wa-results', 'wa-results-title'],
      ['wa-visuals', 'wa-visuals-title']
    ];
    for (var i = 0; i < pairs.length; i++) {
      if (!paneOpen(pairs[i][0])) continue;
      var el = global.document.getElementById(pairs[i][1]);
      var t = el && (el.textContent || '').trim();
      if (t) return t;
    }
    return '';
  }

  function snapshotMessages(messagesEl) {
    if (!messagesEl) return { html: '', count: 0 };
    var clone = messagesEl.cloneNode(true);
    clone.querySelectorAll('.sc-line-typing,.sc-line-trace,.sc-inline-chips').forEach(function (n) { n.remove(); });
    var lines = clone.querySelectorAll('.sc-line, .msg');
    var count = 0;
    lines.forEach(function (el) {
      if (!el.classList.contains('sc-line-typing')) count += 1;
    });
    return { html: clone.innerHTML.trim(), count: count };
  }

  function fileCurrent(opts) {
    opts = opts || {};
    var hist = opts.chatHistory;
    var priorTitle = '';
    if (hist && typeof hist.currentTitle === 'function') {
      try { priorTitle = hist.currentTitle() || ''; } catch (_) { priorTitle = ''; }
    }
    /* Save after reading the title — saveCurrent re-derives from the whole
       you-line (avatar initials included) and would pollute the library card. */
    var saved = null;
    if (hist && typeof hist.saveCurrent === 'function') {
      try { saved = hist.saveCurrent(); } catch (_) { saved = null; }
    }

    var snap = { html: '', count: 0 };
    if (saved && saved.html) {
      snap.html = saved.html;
      snap.count = saved.count || 0;
    } else {
      snap = snapshotMessages(opts.messagesEl);
    }
    if (!snap.html || !snap.count) return { empty: true };

    var preview = saved && saved.html
      ? previewFromHtml(saved.html)
      : previewFromMessages(opts.messagesEl);

    var paneTitle = detectTitle();
    var title = clip(paneTitle || preview.you || priorTitle || (saved && saved.title) || 'Conversation', 90);
    var historyKey = opts.historyKey || '';
    if (!historyKey && hist && typeof hist.storageKey === 'function') {
      try { historyKey = hist.storageKey() || ''; } catch (_) {}
    }
    var historyId = saved && saved.id ? saved.id : '';
    var type = detectType();
    var rec = {
      id: '',
      type: type,
      title: title,
      ts: Date.now(),
      msgCount: snap.count,
      previewYou: preview.you,
      previewAi: preview.ai,
      html: snap.html,
      historyKey: historyKey,
      historyId: historyId,
      mcp: !!(saved && saved.mcp),
      source: (global.location && global.location.pathname) || ''
    };

    var items = readItems();
    var existing = null;
    if (historyKey && historyId) {
      for (var i = 0; i < items.length; i++) {
        if (items[i].historyKey === historyKey && items[i].historyId === historyId) {
          existing = items[i];
          break;
        }
      }
    }
    if (existing) {
      rec.id = existing.id;
      items = items.filter(function (it) { return it.id !== existing.id; });
      items.unshift(rec);
      writeItems(items);
      return { ok: true, updated: true, item: rec };
    }

    rec.id = 'filed-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    items.unshift(rec);
    if (items.length > MAX_ITEMS) items = items.slice(0, MAX_ITEMS);
    writeItems(items);
    return { ok: true, updated: false, item: rec };
  }

  function barsHtml() {
    return '<div class="lib-bars"><i class="g" style="height:38%"></i><i class="g" style="height:64%"></i><i class="b" style="height:88%"></i><i class="g" style="height:52%"></i><i class="b" style="height:30%"></i><i class="g" style="height:70%"></i></div>';
  }

  function thumbHtml(item) {
    var type = item.type || 'chat';
    if (type === 'dashboard') {
      return '<span class="lib-thumb-badge"><span class="material-symbols-outlined">bar_chart</span>Dashboard</span>' + barsHtml();
    }
    if (type === 'report') {
      return '<span class="lib-thumb-badge"><span class="material-symbols-outlined">description</span>Report</span>' + barsHtml();
    }
    if (type === 'mcp') {
      return '<span class="lib-thumb-badge"><span class="material-symbols-outlined">extension</span>MCP</span>' + barsHtml();
    }
    if (type === 'ref') {
      return '<span class="lib-thumb-badge"><span class="material-symbols-outlined">bookmark</span>Reference</span>' + barsHtml();
    }
    var you = esc(item.previewYou || item.title || 'Conversation');
    var ai = esc(item.previewAi || 'Filed from WISEcodeAI.');
    return '<div class="lib-chatprev">' +
      '<div class="lib-bubble me lib-clip">' + you + '</div>' +
      '<div class="lib-bubble ai lib-clip">' + ai + '</div>' +
    '</div>';
  }

  function cardHtml(item) {
    var date = formatDate(item.ts);
    var count = item.msgCount || 0;
    var counts = count
      ? '<span class="lib-counts"><span class="lib-count"><span class="material-symbols-outlined">chat_bubble</span>' + count + '</span></span>'
      : '';
    return '<a class="lib-card" href="#" data-filed="1" data-lib-id="' + esc(item.id) + '">' +
      '<div class="lib-thumb pad">' + thumbHtml(item) + '</div>' +
      '<div class="lib-cbody">' +
        '<div class="lib-cname">' + esc(item.title || 'Conversation') + '</div>' +
        '<div class="lib-cfoot">' + counts + '<span class="lib-date">' + esc(date) + '</span></div>' +
      '</div>' +
    '</a>';
  }

  function list() { return readItems(); }

  function get(id) {
    var items = readItems();
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return items[i];
    }
    return null;
  }

  function remove(id) {
    var items = readItems().filter(function (it) { return it.id !== id; });
    writeItems(items);
  }

  global.WiseLibraryStore = {
    KEY: ITEMS_KEY,
    CHANGE_EVENT: CHANGE_EVENT,
    fileCurrent: fileCurrent,
    list: list,
    get: get,
    remove: remove,
    cardHtml: cardHtml,
    formatDate: formatDate,
    detectType: detectType
  };
})(typeof window !== 'undefined' ? window : this);
