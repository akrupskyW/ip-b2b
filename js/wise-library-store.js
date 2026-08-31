/**
 * WISEcodeAI Library store — the shelf on conversation-library.html.
 *
 * History already keeps every thread. File to Library copies the live
 * conversation onto the shared Library shelf so it shows up with reports,
 * dashboards, and the rest of the WISEcodeAI library — not only in the
 * History drawer.
 *
 *   WiseLibraryStore.fileCurrent({ chatHistory, messagesEl, historyKey, folderId })
 *   WiseLibraryStore.openFolderPicker(anchor, opts, onPick)
 *   WiseLibraryStore.list()
 *   WiseLibraryStore.get(id)
 *   WiseLibraryStore.listFolders()
 *
 * Works as a classic <script src> (attaches window.WiseLibraryStore) and as a
 * side-effect ES import from wiseai-chat.js.
 */
(function (global) {
  'use strict';
  if (global.WiseLibraryStore) return;

  var ITEMS_KEY = 'wise-lib-filed';
  var FOLDERS_KEY = 'wise-lib-folders';
  var MAX_ITEMS = 80;
  var CHANGE_EVENT = 'wise:library-change';
  /* Same palette History projects and the Library folder tiles cycle through. */
  var FOLDER_COLORS = ['#2F6DF6', '#12B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#EF4444', '#84CC16'];
  var pickerEl = null;
  var pickerCssReady = false;

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
      applyFolderChoice(rec.id, opts);
      return { ok: true, updated: true, item: rec };
    }

    rec.id = 'filed-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    items.unshift(rec);
    if (items.length > MAX_ITEMS) items = items.slice(0, MAX_ITEMS);
    writeItems(items);
    applyFolderChoice(rec.id, opts);
    return { ok: true, updated: false, item: rec };
  }

  function applyFolderChoice(cardId, opts) {
    if (!opts || !Object.prototype.hasOwnProperty.call(opts, 'folderId')) return;
    if (opts.folderId) addToFolder(cardId, opts.folderId);
    else removeFromAllFolders(cardId);
  }

  function canFile(opts) {
    var snap = snapshotMessages(opts && opts.messagesEl);
    return !!(snap.html && snap.count);
  }

  function findByHistory(historyKey, historyId) {
    var items = readItems();
    var i;
    if (historyKey && historyId) {
      for (i = 0; i < items.length; i++) {
        if (items[i].historyKey === historyKey && items[i].historyId === historyId) return items[i];
      }
    }
    if (historyKey) {
      for (i = 0; i < items.length; i++) {
        if (items[i].historyKey === historyKey) return items[i];
      }
    }
    return null;
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
    removeFromAllFolders(id);
  }

  /* ---- Library folders (same store the conversation-library page uses) ---- */

  function seedFolders() {
    return [
      { id: 'seed-upf', name: 'UPF Stuff', color: '#2F6DF6', ts: Date.now() - 3 * 86400000, parentId: null, items: ['item-1', 'item-2', 'item-5', 'item-9'] },
      { id: 'seed-labels', name: 'Label scans', color: '#EC4899', ts: Date.now() - 3 * 86400000 + 1000, parentId: 'seed-upf', items: ['item-3'] },
      { id: 'seed-demos', name: 'Demos', color: '#12B981', ts: Date.now() - 2 * 86400000, parentId: null, items: ['item-7', 'item-8'] },
      { id: 'seed-reports', name: 'Impressive Reports', color: '#F59E0B', ts: Date.now() - 86400000, parentId: null, items: ['item-0', 'item-10'] }
    ];
  }

  function readFolders() {
    try {
      var stored = global.localStorage.getItem(FOLDERS_KEY);
      if (stored === null) {
        var seeded = seedFolders();
        try { global.localStorage.setItem(FOLDERS_KEY, JSON.stringify(seeded)); } catch (_) {}
        return seeded;
      }
      var raw = JSON.parse(stored || '[]');
      var list = Array.isArray(raw) ? raw.filter(function (f) { return f && f.id && Array.isArray(f.items); }) : [];
      list.forEach(function (f) { if (!f.parentId) f.parentId = null; });
      return list;
    } catch (_) {
      return [];
    }
  }

  function writeFolders(folders) {
    try { global.localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders)); } catch (_) {}
    try {
      global.document.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { folders: folders } }));
    } catch (_) {}
  }

  function listFolders() { return readFolders(); }

  function findFolder(id) {
    var folders = readFolders();
    for (var i = 0; i < folders.length; i++) {
      if (folders[i].id === id) return folders[i];
    }
    return null;
  }

  function childrenOf(parentId) {
    var p = parentId || null;
    return readFolders().filter(function (f) { return (f.parentId || null) === p; });
  }

  function isSelfOrDescendant(ancestorId, id) {
    if (!ancestorId || !id) return false;
    if (ancestorId === id) return true;
    var cur = findFolder(id);
    var seen = {};
    while (cur && cur.parentId && !seen[cur.id]) {
      seen[cur.id] = true;
      if (cur.parentId === ancestorId) return true;
      cur = findFolder(cur.parentId);
    }
    return false;
  }

  function folderTree(excludeId) {
    var rows = [];
    var walk = function (parentId, depth) {
      childrenOf(parentId).forEach(function (f) {
        if (excludeId && isSelfOrDescendant(excludeId, f.id)) return;
        rows.push({ f: f, depth: depth });
        walk(f.id, depth + 1);
      });
    };
    walk(null, 0);
    return rows;
  }

  function foldersOf(cardId) {
    return readFolders().filter(function (f) { return f.items.indexOf(cardId) !== -1; });
  }

  function removeFromAllFolders(cardId) {
    if (!cardId) return;
    var folders = readFolders();
    var changed = false;
    folders.forEach(function (f) {
      var i = f.items.indexOf(cardId);
      if (i !== -1) { f.items.splice(i, 1); changed = true; }
    });
    if (changed) writeFolders(folders);
  }

  function addToFolder(cardId, folderId) {
    if (!cardId || !folderId) return false;
    var folders = readFolders();
    var dest = null;
    folders.forEach(function (f) {
      var i = f.items.indexOf(cardId);
      if (i !== -1) f.items.splice(i, 1);
      if (f.id === folderId) dest = f;
    });
    if (!dest) return false;
    dest.items.push(cardId);
    writeFolders(folders);
    return true;
  }

  function createFolder(opts) {
    opts = opts || {};
    var folders = readFolders();
    var f = {
      id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: String(opts.name || '').trim() || 'New folder',
      color: opts.color || FOLDER_COLORS[folders.length % FOLDER_COLORS.length],
      ts: Date.now(),
      parentId: opts.parentId || null,
      items: Array.isArray(opts.items) ? opts.items.slice() : []
    };
    folders.unshift(f);
    writeFolders(folders);
    return f;
  }

  /* Destination picker — same layout as History's "Move to project" and the
     Library page's "Move to folder": uppercase head, colored dots, a check
     on the current folder, optional Remove, then New folder…. */
  function ensurePickerCss() {
    if (pickerCssReady || !global.document) return;
    pickerCssReady = true;
    if (global.document.getElementById('wise-lib-pop-css')) return;
    var css = [
      '.lib-pop{position:fixed;z-index:200;min-width:210px;max-width:260px;padding:6px;border-radius:12px;',
        'background:var(--card,var(--surface,#0F1830));color:var(--text,#C5CFD7);border:1px solid rgba(255,255,255,0.12);box-shadow:0 14px 38px rgba(0,0,0,0.42);}',
      'html:not(.dark) .lib-pop{background:#fff;color:#1F2733;border-color:rgba(0,0,0,0.10);box-shadow:0 14px 38px rgba(20,30,60,0.18);}',
      '.lib-pop-head{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.5;padding:6px 10px 4px;}',
      '.lib-pop-list{max-height:220px;overflow-y:auto;}',
      '.lib-pop-item{display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;border:0;border-radius:8px;background:transparent;color:inherit;cursor:pointer;font:inherit;font-size:13px;text-align:left;}',
      '.lib-pop-item:hover{background:rgba(255,255,255,0.08);}',
      'html:not(.dark) .lib-pop-item:hover{background:rgba(20,40,80,0.06);}',
      '.lib-pop-item .material-symbols-outlined{font-size:17px;opacity:.8;}',
      '.lib-pop-item .lib-fp-dot{flex:0 0 auto;width:9px;height:9px;border-radius:50%;background:currentColor;}',
      '.lib-pop-item.is-current{color:var(--primary-ink,var(--primary,#2F6DF6));font-weight:600;}',
      '.lib-pop-item--danger{color:#E5484D;}',
      '.lib-pop-name{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.lib-pop-div{height:1px;margin:5px 6px;background:rgba(255,255,255,0.10);}',
      'html:not(.dark) .lib-pop-div{background:rgba(0,0,0,0.08);}',
      '.lib-pop-new{display:flex;align-items:center;gap:8px;padding:6px 10px;}',
      '.lib-pop-new .material-symbols-outlined{font-size:17px;opacity:.8;}',
      '.lib-pop-new-input{flex:1;min-width:0;height:30px;padding:0 8px;border-radius:8px;font:inherit;font-size:13px;font-weight:600;',
        'color:inherit;outline:none;background:rgba(255,255,255,0.06);border:1px solid var(--primary,#2F6DF6);}',
      'html:not(.dark) .lib-pop-new-input{background:rgba(20,40,80,0.05);}'
    ].join('');
    var el = global.document.createElement('style');
    el.id = 'wise-lib-pop-css';
    el.textContent = css;
    (global.document.head || global.document.documentElement).appendChild(el);
  }

  function closeFolderPicker() {
    if (pickerEl && pickerEl.__anchor && pickerEl.__anchor.classList) {
      pickerEl.__anchor.classList.remove('is-open');
    }
    if (pickerEl && pickerEl.parentNode) pickerEl.parentNode.removeChild(pickerEl);
    pickerEl = null;
    if (global.document) {
      global.document.removeEventListener('mousedown', onPickerOutside, true);
      global.document.removeEventListener('keydown', onPickerKey, true);
    }
    if (global.window) {
      global.window.removeEventListener('scroll', closeFolderPicker, true);
      global.window.removeEventListener('resize', closeFolderPicker, true);
    }
  }

  function onPickerOutside(e) {
    if (!pickerEl) return;
    if (pickerEl.contains(e.target)) return;
    if (pickerEl.__anchor && pickerEl.__anchor.contains && pickerEl.__anchor.contains(e.target)) return;
    closeFolderPicker();
  }

  function onPickerKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); closeFolderPicker(); }
  }

  function placeFolderPicker(anchor) {
    if (!pickerEl || !anchor || !anchor.getBoundingClientRect) return;
    var r = anchor.getBoundingClientRect();
    if (r.width < 1 && r.height < 1 && anchor.closest) {
      var fallback = anchor.closest('.panel-more-wrap, .lib-fp-row, .lib-card, [data-folder-id]');
      if (fallback) r = fallback.getBoundingClientRect();
    }
    var pw = pickerEl.offsetWidth, ph = pickerEl.offsetHeight;
    var left = Math.min(r.left, global.innerWidth - pw - 8);
    left = Math.max(8, left);
    var top = r.bottom + 6;
    if (top + ph > global.innerHeight - 8) top = Math.max(8, r.top - ph - 6);
    pickerEl.style.left = left + 'px';
    pickerEl.style.top = top + 'px';
  }

  function startInlineNewFolder(onPick) {
    if (!pickerEl) return;
    var btn = pickerEl.querySelector('[data-pick-new]');
    if (!btn) return;
    var wrap = global.document.createElement('div');
    wrap.className = 'lib-pop-new';
    wrap.innerHTML = '<span class="material-symbols-outlined">create_new_folder</span>' +
      '<input type="text" class="lib-pop-new-input" placeholder="Folder name" aria-label="New folder name" maxlength="60">';
    btn.parentNode.replaceChild(wrap, btn);
    var input = wrap.querySelector('input');
    var commit = function () {
      var name = (input.value || '').trim() || 'New folder';
      var f = createFolder({ name: name });
      closeFolderPicker();
      if (typeof onPick === 'function') onPick(f.id);
    };
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { e.stopPropagation(); closeFolderPicker(); }
    });
    try { input.focus(); } catch (_) {}
    placeFolderPicker(pickerEl.__anchor);
  }

  function openFolderPicker(anchor, opts, onPick) {
    opts = opts || {};
    if (!global.document) return null;
    ensurePickerCss();
    closeFolderPicker();
    var currentIds = opts.currentIds || [];
    var rows = folderTree(opts.excludeId);
    var title = opts.title || 'File to Library';
    var h = '<div class="lib-pop-head">' + esc(title) + '</div><div class="lib-pop-list">';
    if (opts.unfiled) {
      h += '<button type="button" class="lib-pop-item' + (opts.unfiledCurrent ? ' is-current' : '') + '" data-pick="" role="menuitem">' +
        '<span class="material-symbols-outlined">auto_stories</span>' +
        '<span class="lib-pop-name">' + esc(opts.unfiledLabel || 'Library') + '</span>' +
        (opts.unfiledCurrent ? '<span class="material-symbols-outlined">check</span>' : '') +
      '</button>';
    }
    if (!rows.length && !opts.unfiled) {
      h += '<div class="lib-pop-head" style="opacity:.5;font-weight:400;text-transform:none;letter-spacing:0">No folders yet.</div>';
    } else {
      rows.forEach(function (row) {
        var f = row.f;
        var cur = currentIds.indexOf(f.id) !== -1;
        h += '<button type="button" class="lib-pop-item' + (cur ? ' is-current' : '') + '" data-pick="' + esc(f.id) + '" role="menuitem" style="padding-left:' + (10 + row.depth * 14) + 'px">' +
          '<span class="lib-fp-dot" style="color:' + esc(f.color) + '"></span>' +
          '<span class="lib-pop-name">' + esc(f.name) + '</span>' +
          (cur ? '<span class="material-symbols-outlined">check</span>' : '') +
        '</button>';
      });
    }
    if (opts.removeLabel) {
      h += '<button type="button" class="lib-pop-item" data-pick-remove role="menuitem">' +
        '<span class="material-symbols-outlined">remove_circle_outline</span><span class="lib-pop-name">' + esc(opts.removeLabel) + '</span></button>';
    }
    h += '</div><div class="lib-pop-div"></div>' +
      '<button type="button" class="lib-pop-item" data-pick-new role="menuitem"><span class="material-symbols-outlined">create_new_folder</span><span class="lib-pop-name">New folder\u2026</span></button>';
    pickerEl = global.document.createElement('div');
    pickerEl.className = 'lib-pop';
    pickerEl.setAttribute('role', 'menu');
    pickerEl.__anchor = anchor || null;
    pickerEl.innerHTML = h;
    global.document.body.appendChild(pickerEl);
    if (anchor && anchor.classList) anchor.classList.add('is-open');
    placeFolderPicker(anchor);
    pickerEl.addEventListener('click', function (e) {
      if (e.target.closest('[data-pick-new]')) {
        e.preventDefault();
        if (typeof opts.onNew === 'function') {
          closeFolderPicker();
          opts.onNew();
        } else {
          startInlineNewFolder(onPick);
        }
        return;
      }
      if (e.target.closest('[data-pick-remove]')) {
        e.preventDefault();
        closeFolderPicker();
        if (typeof opts.onRemove === 'function') opts.onRemove();
        return;
      }
      var b = e.target.closest('[data-pick]');
      if (!b) return;
      e.preventDefault();
      var id = b.getAttribute('data-pick');
      closeFolderPicker();
      if (typeof onPick === 'function') onPick(id || null);
    });
    setTimeout(function () {
      global.document.addEventListener('mousedown', onPickerOutside, true);
      global.document.addEventListener('keydown', onPickerKey, true);
      global.window.addEventListener('scroll', closeFolderPicker, true);
      global.window.addEventListener('resize', closeFolderPicker, true);
    }, 0);
    return pickerEl;
  }

  global.WiseLibraryStore = {
    KEY: ITEMS_KEY,
    FOLDERS_KEY: FOLDERS_KEY,
    CHANGE_EVENT: CHANGE_EVENT,
    FOLDER_COLORS: FOLDER_COLORS,
    fileCurrent: fileCurrent,
    canFile: canFile,
    findByHistory: findByHistory,
    list: list,
    get: get,
    remove: remove,
    cardHtml: cardHtml,
    formatDate: formatDate,
    detectType: detectType,
    listFolders: listFolders,
    findFolder: findFolder,
    folderTree: folderTree,
    foldersOf: foldersOf,
    addToFolder: addToFolder,
    createFolder: createFolder,
    removeFromAllFolders: removeFromAllFolders,
    openFolderPicker: openFolderPicker,
    closeFolderPicker: closeFolderPicker
  };
})(typeof window !== 'undefined' ? window : this);
