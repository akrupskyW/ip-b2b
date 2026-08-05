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
      '.wch-sidebar.wch-closing{display:flex;animation:wchOut .26s ease both;}',
      '.wch-sidebar.wch-right.wch-closing{animation:wchOutR .26s ease both;}',
      '@keyframes wchOut{from{opacity:1;transform:none}to{opacity:0;transform:translateX(-16px)}}',
      '@keyframes wchOutR{from{opacity:1;transform:none}to{opacity:0;transform:translateX(16px)}}',
      '.wch-scrim.wch-closing{display:block;animation:wchFadeOut .26s ease both;}',
      '@keyframes wchFadeOut{from{opacity:1}to{opacity:0}}',
      'html:not(.dark) .wch-sidebar{background:#fff;color:#1F2733;border-color:rgba(0,0,0,0.08);box-shadow:10px 0 34px rgba(20,30,60,0.12);}',
      'html:not(.dark) .wch-sidebar.wch-right{box-shadow:-10px 0 34px rgba(20,30,60,0.12);}',
      '.wch-head{display:flex;align-items:center;gap:8px;padding:14px 12px 12px 16px;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,0.08);}',
      'html:not(.dark) .wch-head{border-bottom-color:rgba(0,0,0,0.07);}',
      '.wch-head-title{display:flex;align-items:center;gap:8px;font-weight:600;font-size:14px;flex:1;}',
      '.wch-head-title .material-icons{font-size:19px;color:var(--primary,#2F6DF6);}',
      '.wch-close,.wch-dock{width:30px;height:30px;border-radius:50%;border:0;background:transparent;color:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:.75;}',
      '.wch-close:hover,.wch-dock:hover{background:rgba(255,255,255,0.08);opacity:1;}',
      'html:not(.dark) .wch-close:hover,html:not(.dark) .wch-dock:hover{background:rgba(0,0,0,0.05);}',
      '.wch-close .material-icons,.wch-dock .material-icons{font-size:19px;}',
      '.wch-new{margin:12px;padding:10px 14px;border:0;border-radius:999px;background:var(--primary,#2F6DF6);color:#fff;font-weight:600;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;flex-shrink:0;}',
      '.wch-new:hover{filter:brightness(1.06);}',
      '.wch-new .material-icons{font-size:18px;}',
      '.wch-list{flex:1;overflow-y:auto;padding:2px 8px 12px;}',
      '.wch-item{position:relative;padding:9px 34px 9px 12px;border-radius:10px;cursor:pointer;margin:2px 0;}',
      '.wch-item:hover{background:rgba(255,255,255,0.06);}',
      'html:not(.dark) .wch-item:hover{background:rgba(20,40,80,0.05);}',
      '.wch-item.wch-active{background:color-mix(in srgb,var(--primary,#2F6DF6) 16%,transparent);outline:1px solid color-mix(in srgb,var(--primary,#2F6DF6) 40%,transparent);}',
      '.wch-item-title{font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.wch-fork-badge{display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;margin-right:5px;width:17px;height:17px;border-radius:5px;background:color-mix(in srgb,var(--primary,#2F6DF6) 16%,transparent);color:var(--primary,#2F6DF6);}',
      '.wch-fork-badge .material-icons{font-size:12px;}',
      '.wch-item-meta{font-size:11px;opacity:.62;margin-top:2px;}',
      '.wch-del{position:absolute;top:50%;right:6px;transform:translateY(-50%);width:24px;height:24px;border:0;border-radius:50%;background:transparent;color:inherit;cursor:pointer;display:none;align-items:center;justify-content:center;opacity:.6;}',
      '.wch-item:hover .wch-del{display:flex;}',
      '.wch-del:hover{background:rgba(255,255,255,0.12);opacity:1;}',
      'html:not(.dark) .wch-del:hover{background:rgba(0,0,0,0.08);}',
      '.wch-del .material-icons{font-size:16px;}',
      '.wch-empty{padding:22px 16px;font-size:12px;line-height:1.5;opacity:.6;text-align:center;}',
      '.wch-group{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.5;padding:12px 12px 4px;}',
      '.wch-search{position:relative;display:flex;align-items:center;margin:10px 12px 2px;flex-shrink:0;}',
      '.wch-search > .material-icons{position:absolute;left:11px;font-size:18px;opacity:.5;pointer-events:none;}',
      '.wch-search-input{width:100%;height:36px;box-sizing:border-box;padding:0 32px 0 36px;border-radius:999px;font:inherit;font-size:13px;color:inherit;outline:none;',
        'background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);transition:border-color .15s ease,box-shadow .15s ease;}',
      'html:not(.dark) .wch-search-input{background:rgba(20,40,80,0.04);border-color:rgba(0,0,0,0.10);}',
      '.wch-search-input::placeholder{opacity:.6;}',
      '.wch-search-input:focus{border-color:var(--primary,#2F6DF6);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary,#2F6DF6) 18%,transparent);}',
      '.wch-search-clear{position:absolute;right:8px;width:22px;height:22px;border:0;border-radius:50%;background:transparent;color:inherit;cursor:pointer;display:none;align-items:center;justify-content:center;opacity:.6;}',
      '.wch-search-clear:hover{background:rgba(255,255,255,0.12);opacity:1;}',
      'html:not(.dark) .wch-search-clear:hover{background:rgba(0,0,0,0.08);}',
      '.wch-search-clear .material-icons{font-size:16px;}',
      '.wch-search.has-q .wch-search-clear{display:flex;}',
      /* ── Broken-out "own module" mode: the pane detaches from the messages
         overlay and docks as a standalone card to the LEFT of the chat (a real
         flex sibling in the modules row), no scrim, always in-flow. ── */
      '.wch-sidebar.wch-docked{position:relative;top:auto;bottom:auto;left:auto;right:auto;height:100%;max-width:none;flex:0 0 300px;display:flex;',
        'border:1px solid rgba(255,255,255,0.10);border-radius:16px;box-shadow:var(--shadow-card,0 12px 32px rgba(0,0,0,0.30));',
        'animation:wchDockIn .38s cubic-bezier(.34,1.4,.64,1) both;}',
      'html:not(.dark) .wch-sidebar.wch-docked{border-color:var(--border,rgba(0,0,0,0.08));box-shadow:var(--shadow-card,0 12px 32px rgba(20,30,60,0.12));}',
      '.wch-sidebar.wch-docked.wch-docked-hidden{display:none;}',
      '@keyframes wchDockIn{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:none}}'
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

    /* When enabled, the pane gains a "break out" control that pops History out of
       the in-chat overlay into a standalone module docked to the left of the
       chat. The choice persists per surface (via storageKey) so it survives
       reloads. */
    var breakout = opts.breakout === true;
    var breakoutWidth = opts.breakoutWidth || 300;

    var stored = readStoreRaw();
    var items = Array.isArray(stored.items) ? stored.items : [];
    var seeded = !!stored.seeded;
    var docked = breakout && !!stored.docked;
    var activeId = null;
    var query = '';

    /* Preload a few sample conversations on first mount so the History pane
       reads as an established workspace (not an empty shell). Seeds are written
       once — after that the user's real threads take over, and clearing them
       won't reseed. */
    if (storageKey && !seeded && !items.length && Array.isArray(opts.seed) && opts.seed.length) {
      items = opts.seed.map(function (s, i) {
        return {
          id: s.id || ('seed-' + i + '-' + Math.random().toString(36).slice(2, 7)),
          title: s.title || 'Conversation',
          html: s.html || '',
          count: s.count || 0,
          ts: s.ts || (Date.now() - (i + 1) * 3600000)
        };
      });
      seeded = true;
      writeStore();
    }

    /* ── DOM ── */
    var scrim = document.createElement('div');
    scrim.className = 'wch-scrim';

    var sidebar = document.createElement('aside');
    sidebar.className = 'wch-sidebar' + (side === 'right' ? ' wch-right' : '');
    sidebar.setAttribute('aria-label', titleText);
    sidebar.innerHTML =
      '<div class="wch-head">' +
        '<span class="wch-head-title"><span class="material-icons">history</span>' + esc(titleText) + '</span>' +
        (breakout ? '<button type="button" class="wch-dock" title="Break out as a side panel" aria-label="Break out history as a side panel"><span class="material-icons">vertical_split</span></button>' : '') +
        '<button type="button" class="wch-close" title="Close history" aria-label="Close history"><span class="material-icons">close</span></button>' +
      '</div>' +
      '<div class="wch-search">' +
        '<span class="material-icons">search</span>' +
        '<input type="text" class="wch-search-input" placeholder="Search conversations…" aria-label="Search conversations" autocomplete="off">' +
        '<button type="button" class="wch-search-clear" title="Clear search" aria-label="Clear search"><span class="material-icons">close</span></button>' +
      '</div>' +
      '<button type="button" class="wch-new"><span class="material-icons">add</span>New conversation</button>' +
      '<div class="wch-list" role="list"></div>';

    host.appendChild(scrim);
    host.appendChild(sidebar);

    var listEl = sidebar.querySelector('.wch-list');
    var searchWrap = sidebar.querySelector('.wch-search');
    var searchInput = sidebar.querySelector('.wch-search-input');
    var searchClear = sidebar.querySelector('.wch-search-clear');

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
    function readStoreRaw() {
      if (!storageKey) return {};
      try { return JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; }
      catch (_) { return {}; }
    }
    function writeStore() {
      if (!storageKey) return;
      /* Strip the transient search cache so it never bloats the store. */
      var clean = items.map(function (it) {
        return { id: it.id, title: it.title, html: it.html, count: it.count, ts: it.ts, fork: it.fork || null };
      });
      try { localStorage.setItem(storageKey, JSON.stringify({ v: 1, items: clean, seeded: seeded, docked: docked })); } catch (_) {}
    }

    function metaFor(item) {
      var msgs = item.count === 1 ? '1 message' : item.count + ' messages';
      return (item.fork ? 'Forked · ' : '') + dayLabel(item.ts) + ' · ' + timeLabel(item.ts) + ' · ' + msgs;
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
          existing._search = null; /* transcript changed → rebuild search text */
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

    /* Programmatically file a ready-made conversation into history (used by the
       Turns "Fork from here" flow). Unlike saveCurrent(), the transcript HTML is
       supplied directly rather than read from the live thread, so the caller can
       persist a *slice* of a conversation — or a fork of one — as its own item.
       A `fork:{from}` descriptor tags the item so the sidebar shows a fork badge
       and "Forked from …" lineage. Returns the created item. */
    function add(data) {
      data = data || {};
      var item = {
        id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: data.title || 'Conversation',
        html: data.html || '',
        count: data.count || 0,
        ts: Date.now(),
        fork: data.fork || null
      };
      items.unshift(item);
      if (items.length > MAX_ITEMS) items = items.slice(0, MAX_ITEMS);
      writeStore();
      render();
      return item;
    }

    /* Title of the conversation currently on screen — the active saved thread's
       title if one is loaded, else derived from the live transcript. Lets a fork
       label its lineage ("Forked from <this>") accurately. */
    function currentTitle() {
      if (activeId) {
        for (var i = 0; i < items.length; i++) { if (items[i].id === activeId) return items[i].title; }
      }
      return deriveTitle();
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

    /* Lower-cased, whitespace-collapsed "title + transcript text" used for
       search matching. Cached per item (transient, stripped before persisting). */
    function itemText(it) {
      if (it._search != null) return it._search;
      var body = '';
      try {
        var tmp = document.createElement('div');
        tmp.innerHTML = it.html || '';
        body = tmp.textContent || '';
      } catch (_) {}
      it._search = ((it.title || '') + ' ' + body).toLowerCase().replace(/\s+/g, ' ').trim();
      return it._search;
    }

    /* ── Render ── */
    function render() {
      if (!items.length) {
        listEl.innerHTML = '<div class="wch-empty">No saved conversations yet.<br>Start chatting, then use “New conversation” to file this one here.</div>';
        return;
      }
      var q = query.trim().toLowerCase();
      var visible = q ? items.filter(function (it) { return itemText(it).indexOf(q) !== -1; }) : items;
      if (!visible.length) {
        listEl.innerHTML = '<div class="wch-empty">No conversations match “' + esc(query.trim()) + '”.</div>';
        return;
      }
      var lastGroup = null;
      var html = '';
      visible.forEach(function (it) {
        var g = dayLabel(it.ts);
        if (g !== lastGroup) { html += '<div class="wch-group">' + esc(g) + '</div>'; lastGroup = g; }
        var forkBadge = it.fork
          ? '<span class="wch-fork-badge" title="Forked from ' + esc(it.fork.from || 'a conversation') + '"><span class="material-icons">alt_route</span></span>'
          : '';
        html += '<div class="wch-item' + (it.id === activeId ? ' wch-active' : '') + '" role="listitem" tabindex="0" data-wch-id="' + esc(it.id) + '">' +
          '<div class="wch-item-title">' + forkBadge + esc(it.title) + '</div>' +
          '<div class="wch-item-meta">' + esc(metaFor(it)) + '</div>' +
          '<button type="button" class="wch-del" title="Delete" aria-label="Delete conversation" data-wch-del="' + esc(it.id) + '"><span class="material-icons">delete_outline</span></button>' +
        '</div>';
      });
      listEl.innerHTML = html;
    }

    /* ── Search ── */
    function applyQuery(v) {
      query = v || '';
      if (searchWrap) searchWrap.classList.toggle('has-q', !!query.trim());
      render();
    }
    function clearQuery() {
      if (searchInput) searchInput.value = '';
      applyQuery('');
      if (searchInput) searchInput.focus();
    }

    /* ── Open / close ── */
    var closeTimer = null;
    function isOpen() { return sidebar.classList.contains('wch-open'); }
    function open() {
      /* Broken-out mode is a persistent module, not an overlay — "open" just
         un-hides it in place (no scrim, no slide-in overlay). */
      if (docked) { sidebar.classList.remove('wch-docked-hidden'); render(); return; }
      render();
      /* Cancel any in-flight exit animation so re-opening is instant + clean. */
      clearTimeout(closeTimer);
      sidebar.classList.remove('wch-closing');
      scrim.classList.remove('wch-closing');
      sidebar.classList.add('wch-open');
      scrim.classList.add('wch-open');
      document.addEventListener('keydown', onKey);
      /* Focus the search once the open animation has settled. */
      setTimeout(function () { try { searchInput && searchInput.focus(); } catch (_) {} }, 60);
    }
    /* Play an exit animation, then hide. Keeping display through a `wch-closing`
       class lets the sidebar + scrim slide/fade out instead of vanishing.
       No-op while broken out so restoring/starting a thread keeps the module up. */
    function close() {
      if (docked) return;
      if (!isOpen() && !sidebar.classList.contains('wch-closing')) return;
      sidebar.classList.remove('wch-open');
      scrim.classList.remove('wch-open');
      sidebar.classList.add('wch-closing');
      scrim.classList.add('wch-closing');
      document.removeEventListener('keydown', onKey);
      clearTimeout(closeTimer);
      closeTimer = setTimeout(function () {
        sidebar.classList.remove('wch-closing');
        scrim.classList.remove('wch-closing');
      }, 300);
    }
    /* The three-dot "History" entry. In overlay mode it slides the pane in/out;
       in broken-out mode it shows/hides the standalone module. */
    function toggle() {
      if (docked) {
        if (sidebar.classList.contains('wch-docked-hidden')) open();
        else sidebar.classList.add('wch-docked-hidden');
        return;
      }
      if (isOpen()) close(); else open();
    }
    /* The header × button: hide the module when broken out, else close the overlay. */
    function onCloseBtn() {
      if (docked) { sidebar.classList.add('wch-docked-hidden'); return; }
      close();
    }
    /* Escape clears an active search first, then closes the pane. */
    function onKey(e) {
      if (e.key !== 'Escape') return;
      if (query.trim()) { clearQuery(); return; }
      close();
    }

    /* ── Break out / merge back ── */
    function breakoutContainer() { return resolve(opts.breakoutContainer, document) || (root && root.parentElement); }
    function breakoutAnchor() { return resolve(opts.breakoutAnchor, document) || root; }
    function updateDockButton() {
      if (!dockBtn) return;
      var icon = dockBtn.querySelector('.material-icons');
      if (docked) {
        if (icon) icon.textContent = 'close_fullscreen';
        dockBtn.title = 'Merge history back into the chat';
        dockBtn.setAttribute('aria-label', 'Merge history back into the chat');
      } else {
        if (icon) icon.textContent = 'vertical_split';
        dockBtn.title = 'Break out as a side panel';
        dockBtn.setAttribute('aria-label', 'Break out history as a side panel');
      }
    }
    /* Move History between the in-chat overlay and a standalone module docked to
       the left of the chat. */
    function setDocked(on) {
      if (!breakout) return;
      docked = !!on;
      clearTimeout(closeTimer);
      if (docked) {
        sidebar.classList.remove('wch-open', 'wch-closing', 'wch-docked-hidden');
        scrim.classList.remove('wch-open', 'wch-closing');
        document.removeEventListener('keydown', onKey);
        var container = breakoutContainer();
        var anchor = breakoutAnchor();
        if (container) {
          if (anchor && anchor.parentElement === container) container.insertBefore(sidebar, anchor);
          else container.appendChild(sidebar);
        }
        sidebar.style.flex = '0 0 ' + breakoutWidth + 'px';
        sidebar.style.width = breakoutWidth + 'px';
        sidebar.classList.add('wch-docked');
        updateDockButton();
        writeStore();
        render();
      } else {
        sidebar.classList.remove('wch-docked', 'wch-docked-hidden');
        sidebar.style.flex = '';
        sidebar.style.width = '';
        if (!host.contains(sidebar)) host.appendChild(sidebar);
        updateDockButton();
        writeStore();
        open(); /* keep History visible as an overlay right after merging back */
      }
    }

    /* ── Events ── */
    var dockBtn = breakout ? sidebar.querySelector('.wch-dock') : null;
    scrim.addEventListener('click', close);
    sidebar.querySelector('.wch-close').addEventListener('click', onCloseBtn);
    if (dockBtn) dockBtn.addEventListener('click', function () { setDocked(!docked); });
    sidebar.querySelector('.wch-new').addEventListener('click', startNew);
    if (searchInput) searchInput.addEventListener('input', function () { applyQuery(searchInput.value); });
    if (searchClear) searchClear.addEventListener('click', clearQuery);
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

    /* Restore a previously broken-out module on load (the overlay is the default). */
    if (breakout && docked) { docked = false; setDocked(true); }
    else updateDockButton();

    return {
      toggle: toggle, open: open, close: close, isOpen: isOpen,
      saveCurrent: saveCurrent, startNew: startNew, restore: restore,
      remove: remove, markNew: markNew, refresh: render, root: sidebar,
      add: add, currentTitle: currentTitle,
      setDocked: setDocked, isDocked: function () { return docked; }
    };
  }

  global.WiseChatHistory = { mount: mount };
})(typeof window !== 'undefined' ? window : this);
