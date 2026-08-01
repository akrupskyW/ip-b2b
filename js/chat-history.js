/**
 * WISE — shared in-module chat history sidebar.
 *
 * ONE reusable, dependency-free controller that gives every WISE chat module the
 * exact same behaviour the product asks for:
 *   • a History pane that lives INSIDE the chat module (an overlay sidebar over
 *     the messages area, not a separate sibling panel),
 *   • toggled from the chat module's three-dot menu,
 *   • "Start a new conversation" that first SAVES the current thread into history,
 *   • click any saved thread to restore it (the in-progress one is saved too, so
 *     you can always switch back).
 *
 * Threads persist in localStorage (namespaced per surface via `storageKey`) so
 * they survive reloads and navigations.
 *
 * Works both as a classic <script src> (attaches window.WiseChatHistory) and as a
 * side-effect ES import (`import './chat-history.js'` then read window.WiseChatHistory).
 *
 *   const hist = window.WiseChatHistory.mount(chatCardEl, {
 *     storageKey: 'wise-chat-history:ai-chat',
 *     messagesEl: '#chat-messages',
 *     onNew: () => restartConversation(),
 *   });
 *   // three-dot "History"        → hist.toggle()
 *   // three-dot "New conversation"→ hist.startNew()
 */
(function (global) {
  'use strict';

  var STYLE_ID = 'wch-styles';
  var MAX_ITEMS = 60;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css = [
      '.wch-host{position:relative;}',
      '.wch-scrim{position:absolute;inset:0;z-index:59;background:rgba(4,8,18,0.42);display:none;}',
      '.wch-scrim.wch-open{display:block;animation:wchFade .28s ease both;}',
      '@keyframes wchFade{from{opacity:0}to{opacity:1}}',
      '.wch-sidebar{position:absolute;top:0;bottom:0;left:0;width:300px;max-width:86%;z-index:60;display:none;flex-direction:column;',
        'background:var(--card,var(--surface,#0F1830));color:var(--text,#C5CFD7);',
        'border-right:1px solid rgba(255,255,255,0.10);box-shadow:10px 0 34px rgba(0,0,0,0.34);}',
      '.wch-sidebar.wch-right{left:auto;right:0;border-right:0;border-left:1px solid rgba(255,255,255,0.10);box-shadow:-10px 0 34px rgba(0,0,0,0.34);}',
      '.wch-sidebar.wch-open{display:flex;animation:wchIn .32s cubic-bezier(.34,1.4,.64,1) both;}',
      '.wch-sidebar.wch-right.wch-open{animation:wchInR .32s cubic-bezier(.34,1.4,.64,1) both;}',
      '@keyframes wchIn{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:none}}',
      '@keyframes wchInR{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}',
      'html:not(.dark) .wch-sidebar{background:#fff;color:#1F2733;border-color:rgba(0,0,0,0.08);box-shadow:10px 0 34px rgba(20,30,60,0.12);}',
      'html:not(.dark) .wch-sidebar.wch-right{box-shadow:-10px 0 34px rgba(20,30,60,0.12);}',
      '.wch-head{display:flex;align-items:center;gap:8px;padding:14px 12px 12px 16px;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,0.08);}',
      'html:not(.dark) .wch-head{border-bottom-color:rgba(0,0,0,0.07);}',
      '.wch-head-title{display:flex;align-items:center;gap:8px;font-weight:600;font-size:14px;flex:1;}',
      '.wch-head-title .material-icons{font-size:19px;color:var(--primary,#2F6DF6);}',
      '.wch-close{width:30px;height:30px;border-radius:50%;border:0;background:transparent;color:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:.75;}',
      '.wch-close:hover{background:rgba(255,255,255,0.08);opacity:1;}',
      'html:not(.dark) .wch-close:hover{background:rgba(0,0,0,0.05);}',
      '.wch-close .material-icons{font-size:19px;}',
      '.wch-new{margin:12px;padding:10px 14px;border:0;border-radius:999px;background:var(--primary,#2F6DF6);color:#fff;font-weight:600;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;flex-shrink:0;}',
      '.wch-new:hover{filter:brightness(1.06);}',
      '.wch-new .material-icons{font-size:18px;}',
      '.wch-list{flex:1;overflow-y:auto;padding:2px 8px 12px;}',
      '.wch-item{position:relative;padding:9px 34px 9px 12px;border-radius:10px;cursor:pointer;margin:2px 0;}',
      '.wch-item:hover{background:rgba(255,255,255,0.06);}',
      'html:not(.dark) .wch-item:hover{background:rgba(20,40,80,0.05);}',
      '.wch-item.wch-active{background:color-mix(in srgb,var(--primary,#2F6DF6) 16%,transparent);outline:1px solid color-mix(in srgb,var(--primary,#2F6DF6) 40%,transparent);}',
      '.wch-item-title{font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.wch-item-meta{font-size:11px;opacity:.62;margin-top:2px;}',
      '.wch-del{position:absolute;top:50%;right:6px;transform:translateY(-50%);width:24px;height:24px;border:0;border-radius:50%;background:transparent;color:inherit;cursor:pointer;display:none;align-items:center;justify-content:center;opacity:.6;}',
      '.wch-item:hover .wch-del{display:flex;}',
      '.wch-del:hover{background:rgba(255,255,255,0.12);opacity:1;}',
      'html:not(.dark) .wch-del:hover{background:rgba(0,0,0,0.08);}',
      '.wch-del .material-icons{font-size:16px;}',
      '.wch-empty{padding:22px 16px;font-size:12px;line-height:1.5;opacity:.6;text-align:center;}',
      '.wch-group{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.5;padding:12px 12px 4px;}'
    ].join('\n');
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  function resolve(elOrSel, scope) {
    if (!elOrSel) return null;
    if (typeof elOrSel === 'string') return (scope || document).querySelector(elOrSel);
    return elOrSel;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* Plain text of an element with the noisy bits (timestamps, chips) removed. */
  function cleanText(el) {
    if (!el) return '';
    var clone = el.cloneNode(true);
    clone.querySelectorAll('.sc-line-meta,.msg-source-chips,.sc-reply-chips,.material-icons,.material-symbols-rounded,.material-symbols-outlined')
      .forEach(function (n) { n.remove(); });
    return (clone.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function dayLabel(ts) {
    var d = new Date(ts);
    var now = new Date();
    var startOf = function (x) { return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); };
    var diff = Math.round((startOf(now) - startOf(d)) / 86400000);
    if (diff <= 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return d.toLocaleDateString([], { weekday: 'long' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function timeLabel(ts) {
    try { return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
    catch (_) { return ''; }
  }

  function mount(root, opts) {
    if (!root) return null;
    opts = opts || {};
    injectStyles();

    var side = opts.side === 'right' ? 'right' : 'left';
    var titleText = opts.title || 'History';
    var storageKey = opts.storageKey || null;
    var messageSelector = opts.messageSelector || '.sc-line, .msg';
    var userSelector = opts.userSelector || '.sc-line-you, .msg.user';
    var stripSelectors = opts.stripSelectors || [];

    var messagesEl = function () { return resolve(opts.messagesEl, root) || root; };
    var welcomeEl = function () { return resolve(opts.welcomeEl, root); };

    /* The pane hosts inside the messages' parent so it overlays the transcript
       region only (leaving the module topbar / input rail visible), which reads
       as a sidebar *inside* the chat module. */
    var host = resolve(opts.paneHost, root) || (messagesEl() && messagesEl().parentElement) || root;
    host.classList.add('wch-host');

    var items = readStore();
    var activeId = null;

    /* ── DOM ── */
    var scrim = document.createElement('div');
    scrim.className = 'wch-scrim';

    var sidebar = document.createElement('aside');
    sidebar.className = 'wch-sidebar' + (side === 'right' ? ' wch-right' : '');
    sidebar.setAttribute('aria-label', titleText);
    sidebar.innerHTML =
      '<div class="wch-head">' +
        '<span class="wch-head-title"><span class="material-icons">history</span>' + esc(titleText) + '</span>' +
        '<button type="button" class="wch-close" title="Close history" aria-label="Close history"><span class="material-icons">close</span></button>' +
      '</div>' +
      '<button type="button" class="wch-new"><span class="material-icons">add</span>New conversation</button>' +
      '<div class="wch-list" role="list"></div>';

    host.appendChild(scrim);
    host.appendChild(sidebar);

    var listEl = sidebar.querySelector('.wch-list');

    /* ── Transcript read / write ── */
    function getHTML() {
      if (opts.getHTML) return String(opts.getHTML() || '').trim();
      var m = messagesEl();
      if (!m) return '';
      if (!stripSelectors.length) return m.innerHTML.trim();
      var clone = m.cloneNode(true);
      stripSelectors.forEach(function (sel) {
        clone.querySelectorAll(sel).forEach(function (n) { n.remove(); });
      });
      return clone.innerHTML.trim();
    }

    function setHTML(html) {
      if (opts.setHTML) { opts.setHTML(html); return; }
      var m = messagesEl();
      if (!m) return;
      m.innerHTML = html || '';
      var w = welcomeEl();
      if (w) { w.classList.add('sc-hidden'); w.style.display = 'none'; }
      m.scrollTop = m.scrollHeight;
    }

    function countMessages() {
      var m = messagesEl();
      if (!m) return 0;
      var all = m.querySelectorAll(messageSelector);
      var n = 0;
      all.forEach(function (el) { if (!el.classList.contains('sc-line-typing')) n++; });
      return n;
    }

    function deriveTitle() {
      var m = messagesEl();
      if (!m) return 'Conversation';
      var u = m.querySelector(userSelector);
      var text = cleanText(u);
      if (!text) {
        var any = m.querySelector('.sc-line-body, .msg-bubble');
        text = cleanText(any);
      }
      if (!text) return 'Conversation';
      if (text.length > 48) text = text.slice(0, 47).trim() + '…';
      return text;
    }

    /* ── Store ── */
    function readStore() {
      if (!storageKey) return [];
      try {
        var raw = JSON.parse(localStorage.getItem(storageKey) || '{}');
        return Array.isArray(raw.items) ? raw.items : [];
      } catch (_) { return []; }
    }
    function writeStore() {
      if (!storageKey) return;
      try { localStorage.setItem(storageKey, JSON.stringify({ v: 1, items: items })); } catch (_) {}
    }

    function metaFor(item) {
      var msgs = item.count === 1 ? '1 message' : item.count + ' messages';
      return dayLabel(item.ts) + ' · ' + timeLabel(item.ts) + ' · ' + msgs;
    }

    /* ── Public actions ── */
    /* Save the current transcript into history. No-op on an empty thread or when
       nothing has changed since the last save. Updates the active thread in place
       (so editing a restored conversation doesn't spawn a duplicate). */
    function saveCurrent() {
      var html = getHTML();
      var count = countMessages();
      if (!html || count === 0) return null;

      if (activeId) {
        var existing = null;
        for (var i = 0; i < items.length; i++) { if (items[i].id === activeId) { existing = items[i]; break; } }
        if (existing) {
          if (existing.html === html) return existing; /* unchanged */
          existing.html = html;
          existing.count = count;
          existing.ts = Date.now();
          existing.title = deriveTitle();
          items = items.filter(function (x) { return x.id !== activeId; });
          items.unshift(existing);
          writeStore();
          return existing;
        }
      }

      if (items[0] && items[0].html === html) { activeId = items[0].id; return items[0]; }

      var item = {
        id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: deriveTitle(),
        html: html,
        count: count,
        ts: Date.now()
      };
      items.unshift(item);
      if (items.length > MAX_ITEMS) items = items.slice(0, MAX_ITEMS);
      writeStore();
      return item;
    }

    /* Called whenever the transcript is cleared to a fresh slate so the next save
       starts a brand-new thread rather than overwriting the previously active one. */
    function markNew() { activeId = null; }

    function startNew() {
      saveCurrent();
      activeId = null;
      if (typeof opts.onNew === 'function') opts.onNew();
      render();
      close();
    }

    function restore(id) {
      var item = null;
      for (var i = 0; i < items.length; i++) { if (items[i].id === id) { item = items[i]; break; } }
      if (!item) return;
      saveCurrent();            /* preserve the in-progress thread first */
      setHTML(item.html);
      activeId = item.id;
      render();
      close();
      if (typeof opts.onRestore === 'function') opts.onRestore(item);
    }

    function remove(id) {
      items = items.filter(function (x) { return x.id !== id; });
      if (activeId === id) activeId = null;
      writeStore();
      render();
    }

    /* ── Render ── */
    function render() {
      if (!items.length) {
        listEl.innerHTML = '<div class="wch-empty">No saved conversations yet.<br>Start chatting, then use “New conversation” to file this one here.</div>';
        return;
      }
      var lastGroup = null;
      var html = '';
      items.forEach(function (it) {
        var g = dayLabel(it.ts);
        if (g !== lastGroup) { html += '<div class="wch-group">' + esc(g) + '</div>'; lastGroup = g; }
        html += '<div class="wch-item' + (it.id === activeId ? ' wch-active' : '') + '" role="listitem" tabindex="0" data-wch-id="' + esc(it.id) + '">' +
          '<div class="wch-item-title">' + esc(it.title) + '</div>' +
          '<div class="wch-item-meta">' + esc(metaFor(it)) + '</div>' +
          '<button type="button" class="wch-del" title="Delete" aria-label="Delete conversation" data-wch-del="' + esc(it.id) + '"><span class="material-icons">delete_outline</span></button>' +
        '</div>';
      });
      listEl.innerHTML = html;
    }

    /* ── Open / close ── */
    function isOpen() { return sidebar.classList.contains('wch-open'); }
    function open() {
      render();
      sidebar.classList.add('wch-open');
      scrim.classList.add('wch-open');
      document.addEventListener('keydown', onKey);
    }
    function close() {
      sidebar.classList.remove('wch-open');
      scrim.classList.remove('wch-open');
      document.removeEventListener('keydown', onKey);
    }
    function toggle() { if (isOpen()) close(); else open(); }
    function onKey(e) { if (e.key === 'Escape') close(); }

    /* ── Events ── */
    scrim.addEventListener('click', close);
    sidebar.querySelector('.wch-close').addEventListener('click', close);
    sidebar.querySelector('.wch-new').addEventListener('click', startNew);
    listEl.addEventListener('click', function (e) {
      var del = e.target.closest('[data-wch-del]');
      if (del) { e.stopPropagation(); remove(del.getAttribute('data-wch-del')); return; }
      var item = e.target.closest('[data-wch-id]');
      if (item) restore(item.getAttribute('data-wch-id'));
    });
    listEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var item = e.target.closest('[data-wch-id]');
      if (item) { e.preventDefault(); restore(item.getAttribute('data-wch-id')); }
    });

    render();

    return {
      toggle: toggle, open: open, close: close, isOpen: isOpen,
      saveCurrent: saveCurrent, startNew: startNew, restore: restore,
      remove: remove, markNew: markNew, refresh: render, root: sidebar
    };
  }

  global.WiseChatHistory = { mount: mount };
})(typeof window !== 'undefined' ? window : this);
