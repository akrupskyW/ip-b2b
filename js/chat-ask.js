/**
 * WISE — shared "What can I ask?" side panel.
 *
 * The in-chat overlay (same .wch-sidebar shell as History / Connect a data
 * source) that lists THIS surface's prompts as insertable cards. The header's
 * ⋯ "Break out as a side module" detaches it into a sticky drawer in
 * #modules-row. When an artifact / output pane is already open, the drawer
 * attaches to the FAR RIGHT of that pane (tucking behind it) rather than
 * wedging in between the chat and the output. Dressed by the shared
 * .wch-sidebar.wch-docked rules from chat-history.js.
 *
 * Works both as a classic <script src> (attaches window.WiseChatAsk) and as a
 * side-effect ES import (`import './chat-ask.js'` then read window.WiseChatAsk).
 *
 *   const ask = window.WiseChatAsk.mount({
 *     host:        '.ap-chat-body',     // overlay lives inside the chat body
 *     container:   '#modules-row',      // breakout target
 *     anchor:      '.ap-chat',          // fallback sibling when no output pane is open
 *     farRight:    true,                // dock after open output panes (default)
 *     getSuggestions: () => [{ title, icon, cards:[{ title, desc, ask, icon, intent }] }],
 *     onAsk: (text, intent) => { ... },
 *     onInsert: (text) => { ... },
 *   });
 *   // gold link / chip → ask.open();
 *
 * Requires js/chat-history.js to be loaded first (it injects the shared
 * .wch-sidebar / .wch-docked / sticky-drawer styles this module reuses).
 */
(function (global) {
  'use strict';

  var STYLE_ID = 'wise-chat-ask-styles';

  function injectStyles() {
    if (document.getElementById(STYLE_ID) || document.getElementById('wiseai-chat-extras')) return;
    var css = [
      '.wch-ask-empty{padding:18px 16px;color:var(--text-muted);font-size:13.5px;line-height:1.5;}',
      '.wch-ask-intro{margin:2px 16px 8px;font-size:13px;line-height:1.5;opacity:.82;}',
      '.wch-ask-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;}',
      '.wch-ask-panel .wch-head{position:sticky;top:0;z-index:3;background:var(--card,var(--surface,#0F1830));}',
      'html:not(.dark) .wch-ask-panel .wch-head{background:#fff;}',
      '#modules-row .wch-sidebar.wch-ask-panel.wch-docked .wch-head{background:var(--surface,#fff);}',
      '#modules-row.modules-sticky .wch-sidebar.wch-ask-panel.wch-docked:not(.wch-unsticky) .wch-head{background:var(--surface-2,var(--surface,#fff));}',
      '.wch-ask-panel .wch-ask-list,.wch-ask-panel .wch-list{flex:none;overflow:visible;padding:4px 10px 14px;}',
      '.wch-ask-group{margin:0;padding:10px 0 6px;}',
      '.wch-ask-group+.wch-ask-group{margin-top:8px;padding-top:28px;border-top:1px solid rgba(20,40,80,0.10);}',
      'html.dark .wch-ask-group+.wch-ask-group{border-top-color:rgba(255,255,255,0.10);}',
      '.wch-ask-group-title{display:flex;align-items:center;gap:8px;padding:4px 6px 8px;font-family:"WISE Digits","Noto Serif",Georgia,serif;font-size:1.12rem;font-weight:800;letter-spacing:-.01em;line-height:1.2;color:var(--text);}',
      '.wch-ask-group-title .material-symbols-outlined{font-size:20px;opacity:.9;}',
      '.wch-ask-cards{display:flex;flex-direction:column;gap:18px;}',
      '.wch-ask-card{position:relative;display:flex;align-items:flex-start;gap:11px;width:100%;padding:11px 12px;border:1px solid rgba(255,255,255,0.09);background:rgba(255,255,255,0.02);border-radius:12px;cursor:pointer;text-align:left;color:inherit;font-family:inherit;}',
      'html:not(.dark) .wch-ask-card{border-color:rgba(20,40,80,0.10);background:rgba(20,40,80,0.015);}',
      '.wch-ask-ico{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;margin-top:1px;background:none;color:var(--primary-ink,var(--primary,#2F6DF6));}',
      '.wch-ask-ico .material-symbols-outlined{font-size:22px;}',
      '.wch-ask-card-body{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px;padding-right:26px;}',
      '.wch-ask-card-title{font-size:14px;font-weight:600;line-height:1.35;}',
      '.wch-ask-card-desc{font-size:13px;line-height:1.45;opacity:.8;}',
      '.wch-ask-insert{position:absolute;top:9px;right:9px;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border:0;background:none;color:var(--text-muted);cursor:pointer;opacity:0;}',
      '.wch-ask-card:hover .wch-ask-insert,.wch-ask-card:focus-within .wch-ask-insert{opacity:.7;}',
      '.wch-ask-search{position:relative;display:flex;align-items:center;margin:0 12px 8px;}',
      '.wch-ask-search > .material-symbols-outlined{position:absolute;left:11px;font-size:18px;opacity:.5;pointer-events:none;}',
      '.wch-ask-search-input{width:100%;height:38px;box-sizing:border-box;padding:0 32px 0 36px;border-radius:999px;font:inherit;font-size:13.5px;color:inherit;outline:none;background:rgba(20,40,80,0.04);border:1px solid rgba(20,40,80,0.10);transition:border-color .15s ease,box-shadow .15s ease;}',
      'html.dark .wch-ask-search-input{background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.12);}',
      '.wch-ask-search-input::placeholder{color:var(--text-subtle);opacity:.8;}',
      '.wch-ask-search-input:focus,.wch-ask-search:focus-within .wch-ask-search-input{border-color:var(--primary,#2F6DF6);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary,#2F6DF6) 18%,transparent);}',
      '.wch-ask-search-clear{position:absolute;right:8px;width:22px;height:22px;border:0;border-radius:50%;background:transparent;color:inherit;cursor:pointer;display:none;align-items:center;justify-content:center;opacity:.6;}',
      '.wch-ask-search-clear:hover{background:rgba(20,40,80,0.08);opacity:1;}',
      'html.dark .wch-ask-search-clear:hover{background:rgba(255,255,255,0.12);}',
      '.wch-ask-search-clear .material-symbols-outlined{font-size:16px;}',
      '.wch-ask-search.has-q .wch-ask-search-clear{display:flex;}',
      '.wch-ask-panel .wch-head-title{font-family:"WISE Digits","Noto Serif",Georgia,serif;font-weight:800;font-size:1.2rem;letter-spacing:-.01em;line-height:1.16;}',
      '.wch-ask-panel .wch-head-title .material-symbols-outlined{display:none;}',
      '.wch-ask-toolbar{display:flex;flex-direction:column;gap:8px;margin:0 12px 8px;}',
      '.wch-ask-sort{display:flex;flex-wrap:wrap;align-items:center;gap:6px;}',
      '.wch-ask-filters{display:flex;flex-wrap:wrap;gap:6px;}',
      '.wch-ask-filter{border:1px solid var(--border-strong);background:color-mix(in srgb,var(--primary) 10%,#fff);color:var(--text-muted);border-radius:999px;padding:5px 13px;font-family:inherit;font-size:12.5px;font-weight:500;cursor:pointer;}',
      '.wch-ask-filter:hover{background:color-mix(in srgb,var(--primary) 16%,#fff);border-color:color-mix(in srgb,var(--primary) 40%,var(--border-strong));color:var(--text);}',
      'html.dark .wch-ask-filter{background:color-mix(in srgb,var(--primary-bright,#8B9FAF) 14%,transparent);border-color:var(--primary);}',
      '.wch-ask-filter.is-active{background:var(--primary,#2F6DF6);border-color:var(--primary,#2F6DF6);color:#fff;font-weight:600;}',
      '.wch-ask-filter.is-empty{opacity:.45;}',
      '.wch-ask-insert .material-symbols-outlined,.wch-ask-prompt-btn .material-symbols-outlined{font-variation-settings:"FILL" 1;}',
      '.wch-ask-cap{border:0;background:none;border-radius:0;padding:2px 6px 0;cursor:pointer;}',
      '.wch-ask-prompt{position:relative;display:flex;align-items:center;gap:8px;width:100%;padding:7px 9px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);border-radius:9px;cursor:pointer;text-align:left;color:inherit;font-family:inherit;}',
      '.wch-sidebar.wch-ask-panel.wch-docked .wch-ask-list{padding-bottom:18px;}'
    ].join('');
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  function resolve(v) {
    if (!v) return null;
    if (typeof v === 'function') {
      try { return resolve(v()); } catch (_) { return null; }
    }
    return typeof v === 'string' ? document.querySelector(v) : v;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function mount(opts) {
    opts = opts || {};
    injectStyles();

    var host = resolve(opts.host);
    if (!host) return null;
    var label = opts.label || 'What can I ask?';
    var catalog = opts.catalog && Array.isArray(opts.catalog.sections) && opts.catalog.sections.length
      ? opts.catalog : null;
    var breakoutWidth = opts.breakoutWidth || 360;
    var farRight = opts.farRight !== false;
    var askSticky = opts.stickyDefault !== false;
    var askDocked = false;
    var askQuery = '';
    var askSection = 'all';
    var askSort = 'catalog';
    var askCloseTimer = null;
    var askConcealTimer = null;
    var askRevealTimer = null;
    var askMorePop = null;
    var overlayBaseW = 300;
    var WIDTH_ICONS = ['width_normal', 'width_wide', 'width_wide', 'width_full', 'fit_width'];
    var WIDTH_TITLES = ['Width (single) — tap to widen', 'Width (double) — tap to widen', 'Width (triple) — tap to widen', 'Width (fill) — tap to widen', 'Width (custom) — drag to any size'];
    function defaultAskTier() {
      if (global.WPaneWidth && typeof global.WPaneWidth.defaultChatTier === 'function') {
        return global.WPaneWidth.defaultChatTier();
      }
      if (typeof global.wiseDefaultChatTier === 'function') return global.wiseDefaultChatTier();
      return (((global.screen && +global.screen.width) || global.innerWidth || 0) > 1512) ? 1 : 0;
    }
    var widthTier = defaultAskTier();

    host.classList.add('wch-host');

    var askScrim = document.createElement('div');
    askScrim.className = 'wch-scrim';
    var askPanel = document.createElement('aside');
    askPanel.className = 'wch-sidebar wch-right wch-ask-panel';
    askPanel.setAttribute('aria-label', label);
    /* Right-of-chat modules normally default to fill. This catalog follows
       the chat width rule instead (single on laptop-class, double when wider). */
    askPanel.setAttribute('data-no-fill-default', '');
    askPanel.innerHTML =
      '<div class="wch-ask-scroll">' +
        '<div class="wch-head">' +
          '<span class="wch-head-title"><span class="material-symbols-outlined">help</span>' + esc(label) + '</span>' +
          '<div class="wch-controls">' +
            '<div class="panel-more-wrap wch-ask-more-wrap">' +
              '<button type="button" class="panel-more-btn wch-ask-more-btn" title="More options" aria-haspopup="menu" aria-expanded="false" aria-label="More options"><span class="material-symbols-outlined">more_vert</span></button>' +
              '<div class="topbar-popover hidden wch-ask-more-pop" role="menu">' +
                '<button type="button" class="topbar-menu-item" data-ask-act="sort-catalog"><span class="material-symbols-outlined topbar-menu-icon">reorder</span><span>Catalog order</span></button>' +
                '<button type="button" class="topbar-menu-item" data-ask-act="sort-az"><span class="material-symbols-outlined topbar-menu-icon">sort_by_alpha</span><span>Sort A\u2013Z</span></button>' +
                '<div class="topbar-menu-divider"></div>' +
                '<button type="button" class="topbar-menu-item wch-ask-breakout" data-ask-act="breakout"><span class="material-symbols-outlined topbar-menu-icon">vertical_split</span><span class="wch-ask-breakout-label">Break out as a side module</span></button>' +
                '<div class="topbar-menu-divider"></div>' +
                '<button type="button" class="topbar-menu-item topbar-menu-item--danger" data-ask-act="close"><span class="material-symbols-outlined topbar-menu-icon">close</span><span>Close pane</span></button>' +
              '</div>' +
            '</div>' +
            '<button type="button" class="panel-width-toggle-btn wch-ask-width-btn" aria-pressed="false" title="Width (single) — tap to widen" aria-label="What can I ask? module width"><span class="material-symbols-outlined">width_normal</span></button>' +
          '</div>' +
        '</div>' +
        '<p class="wch-ask-intro">' + esc((catalog && catalog.intro) || 'Tap a prompt to ask it now, or use the insert icon to drop it into the message box and tweak it first.') + '</p>' +
        '<div class="wch-ask-search">' +
          '<span class="material-symbols-outlined">search</span>' +
          '<input type="text" class="wch-ask-search-input" placeholder="' + esc((catalog && catalog.searchPlaceholder) || 'Search prompts\u2026') + '" aria-label="Search prompts" autocomplete="off">' +
          '<button type="button" class="wch-ask-search-clear" aria-label="Clear search"><span class="material-symbols-outlined">close</span></button>' +
        '</div>' +
        '<div class="wch-ask-toolbar">' +
          '<div class="wch-ask-sort" role="group" aria-label="Sort prompts">' +
            '<button type="button" class="wch-ask-filter is-active" data-ask-sort="catalog" aria-pressed="true">Catalog</button>' +
            '<button type="button" class="wch-ask-filter" data-ask-sort="az" aria-pressed="false">A\u2013Z</button>' +
          '</div>' +
          '<div class="wch-ask-filters" role="group" aria-label="Filter by topic"></div>' +
        '</div>' +
        '<div class="wch-list wch-ask-list" role="list"></div>' +
      '</div>';
    host.appendChild(askScrim);
    host.appendChild(askPanel);
    var askList = askPanel.querySelector('.wch-ask-list');
    var askScroll = askPanel.querySelector('.wch-ask-scroll');

    function groupsOf() {
      if (typeof opts.getSuggestions === 'function') {
        try { return opts.getSuggestions() || []; } catch (_) { return []; }
      }
      return Array.isArray(opts.suggestions) ? opts.suggestions : [];
    }

    function cardHtml(c) {
      var q = c.ask && c.desc && c.ask !== c.title
        ? '<span class="wch-ask-card-q">\u201C' + esc(c.ask) + '\u201D</span>' : '';
      var desc = c.desc ? '<span class="wch-ask-card-desc">' + esc(c.desc) + '</span>' : '';
      return '<button type="button" class="wch-ask-card" data-ask="' + esc(c.ask) + '"' +
        (c.intent ? ' data-intent="' + esc(c.intent) + '"' : '') +
        ' title="Ask: ' + esc(c.ask) + '">' +
        '<span class="wch-ask-ico"><span class="material-symbols-outlined">' + esc(c.icon || 'chat_bubble') + '</span></span>' +
        '<span class="wch-ask-card-body"><span class="wch-ask-card-title">' + esc(c.title) + '</span>' + desc + q + '</span>' +
        '<span class="wch-ask-insert" role="button" tabindex="-1" data-ask-insert="1" title="Insert into the message box" aria-label="Insert into the message box"><span class="material-symbols-outlined">chat_add_on</span></span>' +
      '</button>';
    }

    function capHtml(item, sectionIcon) {
      var first = (item.prompts && item.prompts[0]) || '';
      var prompts = (item.prompts || []).map(function (p) {
        return '<button type="button" class="wch-ask-prompt" data-ask="' + esc(p) + '" title="Ask: ' + esc(p) + '">' +
          '<span class="wch-ask-prompt-text">' + esc(p) + '</span>' +
          '<span class="wch-ask-prompt-actions">' +
            '<span class="wch-ask-prompt-btn" role="button" tabindex="-1" data-ask-insert="1" title="Insert into the message box" aria-label="Insert into the message box"><span class="material-symbols-outlined">chat_add_on</span></span>' +
            '<span class="wch-ask-prompt-btn" role="button" tabindex="-1" aria-hidden="true" title="Ask this"><span class="material-symbols-outlined">play_arrow</span></span>' +
          '</span></button>';
      }).join('');
      var tools = (item.tools && item.tools.length)
        ? '<div class="wch-ask-cap-tools"><b>Behind the scenes</b> ' + item.tools.map(function (t) { return '<code>' + esc(t) + '</code>'; }).join(' \u00B7 ') + '</div>'
        : '';
      var desc = item.desc ? '<span class="wch-ask-cap-desc">' + esc(item.desc) + '</span>' : '';
      return '<div class="wch-ask-cap"' + (first ? ' data-ask="' + esc(first) + '" title="Ask: ' + esc(first) + '"' : '') + '>' +
        '<div class="wch-ask-cap-head">' +
          '<span class="wch-ask-cap-ico"><span class="material-symbols-outlined">' + esc(item.icon || sectionIcon || 'bolt') + '</span></span>' +
          '<span class="wch-ask-cap-titles"><span class="wch-ask-cap-title">' + esc(item.title || '') + '</span>' + desc + '</span>' +
        '</div>' +
        '<div class="wch-ask-prompts">' + prompts + '</div>' +
        tools +
      '</div>';
    }

    function byTitle(a, b) {
      return String((a && a.title) || '').localeCompare(String((b && b.title) || ''), undefined, { sensitivity: 'base' });
    }

    function hayOfItem(it) {
      return [it.title, it.desc, (it.prompts || []).join(' '), (it.tools || []).join(' ')]
        .filter(Boolean).join(' ').toLowerCase();
    }

    function matchItem(it, q) {
      if (!q) return true;
      return hayOfItem(it).indexOf(q) !== -1;
    }

    function sectionHeaderMatches(s, q) {
      if (!q) return false;
      return [s.title, s.desc, s.id].filter(Boolean).join(' ').toLowerCase().indexOf(q) !== -1;
    }

    function syncSearchChrome() {
      var wrap = askPanel.querySelector('.wch-ask-search');
      if (wrap) wrap.classList.toggle('has-q', !!(askQuery && String(askQuery).trim()));
    }

    function syncSortButtons() {
      askPanel.querySelectorAll('[data-ask-sort]').forEach(function (btn) {
        var on = (btn.getAttribute('data-ask-sort') || '') === askSort;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      if (askMorePop) {
        askMorePop.querySelectorAll('[data-ask-act^="sort-"]').forEach(function (btn) {
          var act = btn.getAttribute('data-ask-act');
          var on = (act === 'sort-az' && askSort === 'az') || (act === 'sort-catalog' && askSort === 'catalog');
          btn.classList.toggle('is-active', on);
          btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      }
    }

    function renderFilters() {
      var bar = askPanel.querySelector('.wch-ask-filters');
      if (!bar) return;
      if (!catalog) { bar.innerHTML = ''; return; }
      var q = (askQuery || '').trim().toLowerCase();
      var sections = catalog.sections || [];
      if (askSection !== 'all' && !sections.some(function (s) { return s.id === askSection; })) askSection = 'all';
      var chips = ['<button type="button" class="wch-ask-filter' + (askSection === 'all' ? ' is-active' : '') +
        '" data-section="all" aria-pressed="' + (askSection === 'all' ? 'true' : 'false') + '">All</button>'];
      sections.forEach(function (s) {
        var n = (s.items || []).filter(function (it) {
          return sectionHeaderMatches(s, q) || matchItem(it, q);
        }).length;
        var empty = q && !n;
        chips.push('<button type="button" class="wch-ask-filter' +
          (askSection === s.id ? ' is-active' : '') + (empty ? ' is-empty' : '') +
          '" data-section="' + esc(s.id) + '" aria-pressed="' + (askSection === s.id ? 'true' : 'false') + '"' +
          (empty ? ' title="No matches in this topic"' : '') + '>' + esc(s.title) + '</button>');
      });
      bar.innerHTML = chips.join('');
    }

    function renderCatalog() {
      var q = (askQuery || '').trim().toLowerCase();
      var sections = catalog.sections || [];
      var scoped = sections.filter(function (s) { return askSection === 'all' || s.id === askSection; });
      var groups = scoped
        .map(function (s) {
          var items = sectionHeaderMatches(s, q) ? (s.items || []).slice() : (s.items || []).filter(function (it) { return matchItem(it, q); });
          if (askSort === 'az') items = items.slice().sort(byTitle);
          return { s: s, items: items };
        })
        .filter(function (g) { return g.items.length; });
      if (askSort === 'az') {
        groups = groups.slice().sort(function (a, b) { return byTitle(a.s, b.s); });
      }
      var body;
      if (!groups.length) {
        body = q
          ? '<div class="wch-ask-empty">No prompts match \u201C' + esc((askQuery || '').trim()) + '\u201D. Try another word, or just type your question in your own words.</div>'
          : '<div class="wch-ask-empty">Nothing here yet.</div>';
      } else {
        body = groups.map(function (g) {
          return '<div class="wch-ask-group" data-section="' + esc(g.s.id) + '">' +
            '<div class="wch-ask-group-title"><span class="material-symbols-outlined">' + esc(g.s.icon || 'bolt') + '</span>' + esc(g.s.title) + '</div>' +
            (g.s.desc ? '<div class="wch-ask-group-desc">' + esc(g.s.desc) + '</div>' : '') +
            '<div class="wch-ask-cards">' + g.items.map(function (it) { return capHtml(it, g.s.icon); }).join('') + '</div>' +
          '</div>';
        }).join('');
      }
      askList.innerHTML = body;
    }

    function renderList() {
      if (!askList) return;
      syncSearchChrome();
      syncSortButtons();
      renderFilters();
      if (catalog) { renderCatalog(); return; }
      var groups = groupsOf();
      var q = (askQuery || '').trim().toLowerCase();
      if (q) {
        groups = groups
          .map(function (g) {
            return {
              title: g.title, icon: g.icon,
              cards: (g.cards || []).filter(function (c) {
                var hay = [c.title, c.desc, c.ask, c.intent].filter(Boolean).join(' ').toLowerCase();
                return hay.indexOf(q) !== -1;
              })
            };
          })
          .filter(function (g) { return g.cards.length; });
      }
      if (askSort === 'az') {
        groups = groups.slice().sort(byTitle).map(function (g) {
          return { title: g.title, icon: g.icon, cards: (g.cards || []).slice().sort(byTitle) };
        });
      }
      if (!groupsOf().length) {
        askList.innerHTML = '<div class="wch-ask-empty">No suggestions on this page yet — just type a question in your own words and I\u2019ll route it to the right agents.</div>';
        return;
      }
      if (!groups.length) {
        askList.innerHTML = '<div class="wch-ask-empty">No prompts match \u201C' + esc((askQuery || '').trim()) + '\u201D. Try another word, or just type your question in your own words.</div>';
        return;
      }
      askList.innerHTML = groups.map(function (g) {
        return '<div class="wch-ask-group">' +
          '<div class="wch-ask-group-title"><span class="material-symbols-outlined">' + esc(g.icon || 'bolt') + '</span>' + esc(g.title) + '</div>' +
          '<div class="wch-ask-cards">' + (g.cards || []).map(cardHtml).join('') + '</div>' +
        '</div>';
      }).join('');
    }

    function applyQuery(v) {
      askQuery = v || '';
      syncSearchChrome();
      renderList();
    }
    function clearQuery() {
      var inp = askPanel.querySelector('.wch-ask-search-input');
      if (inp) { inp.value = ''; inp.focus(); }
      applyQuery('');
    }
    function setSort(mode) {
      askSort = mode === 'az' ? 'az' : 'catalog';
      syncSortButtons();
      renderList();
      resetAskScroll();
    }
    function focusSearch() {
      var inp = askPanel.querySelector('.wch-ask-search-input');
      if (!inp) return;
      setTimeout(function () { try { inp.focus(); } catch (_) {} }, 40);
    }

    function updateBreakBtn() {
      var item = (askMorePop || askPanel).querySelector('.wch-ask-breakout')
        || askPanel.querySelector('.wch-ask-breakout');
      if (!item) return;
      item.setAttribute('aria-pressed', askDocked ? 'true' : 'false');
      var g = item.querySelector('.material-symbols-outlined');
      if (g) g.textContent = askDocked ? 'close_fullscreen' : 'vertical_split';
      var lbl = item.querySelector('.wch-ask-breakout-label');
      if (lbl) lbl.textContent = askDocked ? 'Merge back into the chat' : 'Break out as a side module';
    }

    function resetAskScroll() {
      if (askScroll) askScroll.scrollTop = 0;
    }

    function syncWidthBtn() {
      var btn = askPanel.querySelector('.wch-ask-width-btn');
      if (!btn) return;
      var W = global.WPaneWidth;
      if (W && W.syncButton) W.syncButton(btn, widthTier);
      else {
        btn.classList.toggle('is-on', widthTier >= 1);
        btn.setAttribute('aria-pressed', widthTier >= 1 ? 'true' : 'false');
        btn.title = WIDTH_TITLES[widthTier];
        var ic = btn.querySelector('.material-symbols-outlined');
        if (ic) ic.textContent = WIDTH_ICONS[widthTier];
      }
    }

    /* Canonical five-tier width (single → double → triple → fill → custom).
       Overlay lives inside the chat, so fill is 100% of the host; docked uses
       the same flex/pixel math as Turns. Load default follows the chat rule:
       single on laptop-class ≤1512 CSS px, double when wider. */
    function applyWidth() {
      var W = global.WPaneWidth;
      var baseW = askDocked ? breakoutWidth : overlayBaseW;
      var tiers = [baseW, Math.round(baseW * 1.5), baseW * 2];
      if (widthTier === 4) {
        if (W && W.applyClasses) W.applyClasses(askPanel, 4, 'panel');
        else {
          askPanel.classList.add('panel-custom');
          if (W && W.pinToCurrent) W.pinToCurrent(askPanel);
        }
        if (!askDocked) {
          var cw = Math.round(askPanel.getBoundingClientRect().width);
          if (cw > 0) {
            askPanel.style.setProperty('width', cw + 'px', 'important');
            askPanel.style.setProperty('max-width', 'none', 'important');
          }
        }
      } else {
        try { global.WisePaneResize && global.WisePaneResize.release && global.WisePaneResize.release([askPanel]); } catch (_) {}
        if (askDocked) {
          if (widthTier === 3) {
            askPanel.style.setProperty('flex', '1000 1 auto', 'important');
            askPanel.style.setProperty('width', 'auto', 'important');
            askPanel.style.setProperty('max-width', 'none', 'important');
          } else {
            var w = tiers[widthTier] || baseW;
            askPanel.style.setProperty('flex', '0 0 ' + w + 'px', 'important');
            askPanel.style.setProperty('width', w + 'px', 'important');
            askPanel.style.setProperty('max-width', 'none', 'important');
          }
        } else {
          askPanel.style.removeProperty('flex');
          if (widthTier === 3) {
            askPanel.style.setProperty('width', '100%', 'important');
            askPanel.style.setProperty('max-width', '100%', 'important');
          } else {
            var ow = tiers[widthTier] || baseW;
            askPanel.style.setProperty('width', ow + 'px', 'important');
            askPanel.style.setProperty('max-width', '86%', 'important');
          }
        }
        askPanel.classList.remove('panel-custom');
        if (W && W.applyClasses) W.applyClasses(askPanel, widthTier, 'panel');
      }
      syncWidthBtn();
    }

    function setSticky(on) {
      askSticky = !!on;
      askPanel.classList.toggle('wch-unsticky', !askSticky);
      if (askDocked && askSticky) {
        var row = resolve(opts.container) || (resolve(opts.anchor) && resolve(opts.anchor).closest('#modules-row'));
        if (row) row.classList.add('modules-sticky');
      }
      updateBreakBtn();
    }

    /* Last artifact / output pane in the modules row. Closed panes are
       `display:none` so they take no visual space, but keeping the ask
       module AFTER their DOM slots means a later-opened output still lands
       to the LEFT of the catalog (attached to the output's far right). */
    function lastOutputPane(container) {
      if (!container || !container.querySelectorAll) return null;
      var panes = container.querySelectorAll(':scope > .wa-pane');
      return panes.length ? panes[panes.length - 1] : null;
    }

    function placeDocked(container, anchor) {
      var after = null;
      if (farRight) {
        after = lastOutputPane(container);
        if (!after) {
          container.appendChild(askPanel);
          return;
        }
      } else if (anchor && anchor.parentElement === container) {
        after = anchor;
      }
      if (after && after.parentElement === container) {
        if (after.nextSibling) container.insertBefore(askPanel, after.nextSibling);
        else container.appendChild(askPanel);
      } else {
        container.appendChild(askPanel);
      }
    }

    function setDocked(on) {
      askDocked = !!on;
      clearTimeout(askCloseTimer);
      if (askDocked) {
        askPanel.classList.remove('wch-open', 'wch-closing', 'wch-docked-hidden');
        askScrim.classList.remove('wch-open', 'wch-closing');
        document.removeEventListener('keydown', onKey);
        var container = resolve(opts.container);
        var anchor = resolve(opts.anchor) || resolve(opts.chatEl);
        if (!container && anchor) container = anchor.parentElement;
        if (container) placeDocked(container, anchor);
        askPanel.classList.add('wch-docked');
        applyWidth();
        setSticky(askSticky);
        renderList();
        updateBreakBtn();
      } else {
        askPanel.classList.remove('wch-docked', 'wch-docked-hidden', 'wch-dock-conceal', 'wch-dock-reveal', 'wch-unsticky');
        askPanel.style.removeProperty('flex');
        askPanel.style.removeProperty('width');
        askPanel.style.removeProperty('max-width');
        host.classList.add('wch-host');
        if (!host.contains(askPanel)) host.appendChild(askPanel);
        applyWidth();
        updateBreakBtn();
        open();
      }
    }

    function revealDocked() {
      clearTimeout(askRevealTimer);
      askPanel.classList.remove('wch-docked-hidden', 'wch-dock-conceal', 'wch-dock-reveal');
      void askPanel.offsetWidth;
      askPanel.classList.add('wch-dock-reveal');
      askRevealTimer = setTimeout(function () { if (askPanel) askPanel.classList.remove('wch-dock-reveal'); }, 480);
    }
    function concealDocked() {
      clearTimeout(askConcealTimer);
      askPanel.classList.remove('wch-dock-reveal');
      void askPanel.offsetWidth;
      askPanel.classList.add('wch-dock-conceal');
      askConcealTimer = setTimeout(function () {
        if (!askPanel) return;
        askPanel.classList.add('wch-docked-hidden');
        askPanel.classList.remove('wch-dock-conceal');
      }, 300);
    }

    function onKey(e) {
      if (e.key !== 'Escape') return;
      if (askQuery && askQuery.trim()) { clearQuery(); return; }
      close();
    }

    function open() {
      if (askDocked) { clearTimeout(askConcealTimer); renderList(); revealDocked(); focusSearch(); return; }
      if (typeof opts.onBeforeOpen === 'function') {
        try { opts.onBeforeOpen(); } catch (_) {}
      }
      clearTimeout(askCloseTimer);
      askPanel.classList.remove('wch-closing');
      askScrim.classList.remove('wch-closing');
      renderList();
      askPanel.classList.add('wch-open');
      askScrim.classList.add('wch-open');
      document.addEventListener('keydown', onKey);
      focusSearch();
    }

    function close() {
      if (askDocked) { concealDocked(); return; }
      if (!askPanel.classList.contains('wch-open') && !askPanel.classList.contains('wch-closing')) return;
      askPanel.classList.remove('wch-open');
      askScrim.classList.remove('wch-open');
      askPanel.classList.add('wch-closing');
      askScrim.classList.add('wch-closing');
      document.removeEventListener('keydown', onKey);
      clearTimeout(askCloseTimer);
      askCloseTimer = setTimeout(function () {
        askPanel.classList.remove('wch-closing');
        askScrim.classList.remove('wch-closing');
      }, 300);
    }

    function dismissOverlay() { if (!askDocked) close(); }

    function insertIntoComposer(text) {
      dismissOverlay();
      if (typeof opts.onInsert === 'function') { opts.onInsert(text); return; }
      var input = resolve(opts.inputEl);
      if (!input) return;
      input.value = text;
      input.focus();
      try { input.setSelectionRange(text.length, text.length); } catch (_) {}
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function send(text, intent) {
      dismissOverlay();
      if (typeof opts.onAsk === 'function') opts.onAsk(text, intent);
    }

    askScrim.addEventListener('click', close);

    var askMoreWrap = askPanel.querySelector('.wch-ask-more-wrap');
    var askMoreBtn = askPanel.querySelector('.wch-ask-more-btn');
    askMorePop = askPanel.querySelector('.wch-ask-more-pop');
    function closeMore() {
      askMorePop.classList.add('hidden');
      askMoreBtn.classList.remove('is-open');
      askMoreBtn.setAttribute('aria-expanded', 'false');
    }
    askMoreBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = askMorePop.classList.contains('hidden');
      askMorePop.classList.toggle('hidden', !willOpen);
      askMoreBtn.classList.toggle('is-open', willOpen);
      askMoreBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      if (willOpen) {
        if (askMorePop.parentElement !== document.body) document.body.appendChild(askMorePop);
        askMorePop.style.position = 'fixed';
        askMorePop.style.zIndex = '3000';
        var w = askMorePop.offsetWidth || 220;
        var h = askMorePop.offsetHeight || 120;
        var r = askMoreBtn.getBoundingClientRect();
        var top = r.top - h - 6;
        if (top < 6) top = r.bottom + 6;
        askMorePop.style.top = Math.max(6, top) + 'px';
        askMorePop.style.left = Math.max(6, Math.min(r.right - w, window.innerWidth - w - 6)) + 'px';
        askMorePop.style.right = 'auto';
      }
    });
    askMorePop.addEventListener('click', function (e) {
      var it = e.target.closest('[data-ask-act]');
      if (!it) return;
      var act = it.getAttribute('data-ask-act');
      closeMore();
      if (act === 'breakout') setDocked(!askDocked);
      else if (act === 'close') close();
      else if (act === 'sort-az') setSort('az');
      else if (act === 'sort-catalog') setSort('catalog');
    });
    document.addEventListener('click', function (e) {
      if (!askMorePop.classList.contains('hidden') && !askMoreWrap.contains(e.target) && !askMorePop.contains(e.target)) closeMore();
    });

    var askWidthBtn = askPanel.querySelector('.wch-ask-width-btn');
    if (askWidthBtn) askWidthBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      widthTier = global.WPaneWidth ? global.WPaneWidth.next(widthTier) : (widthTier + 1) % 5;
      applyWidth();
    });

    var askSearchWrap = askPanel.querySelector('.wch-ask-search');
    var askSearchInput = askPanel.querySelector('.wch-ask-search-input');
    var askSearchClear = askPanel.querySelector('.wch-ask-search-clear');
    if (askSearchWrap) {
      askSearchWrap.addEventListener('mousedown', function (e) { e.stopPropagation(); });
      askSearchWrap.addEventListener('click', function (e) {
        if (e.target.closest('.wch-ask-search-clear')) return;
        if (askSearchInput && e.target !== askSearchInput) askSearchInput.focus();
      });
    }
    if (askSearchInput) {
      askSearchInput.addEventListener('keydown', function (e) { e.stopPropagation(); });
      askSearchInput.addEventListener('input', function () { applyQuery(askSearchInput.value); });
    }
    if (askSearchClear) askSearchClear.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      clearQuery();
    });

    askPanel.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    askPanel.addEventListener('click', function (e) {
      e.stopPropagation();
      if (e.target.closest('.wch-ask-width-btn, .panel-width-toggle-btn')) return;
      var sortBtn = e.target.closest('[data-ask-sort]');
      if (sortBtn) {
        setSort(sortBtn.getAttribute('data-ask-sort') || 'catalog');
        return;
      }
      var filter = e.target.closest('.wch-ask-filter[data-section]');
      if (filter) {
        askSection = filter.getAttribute('data-section') || 'all';
        renderList();
        resetAskScroll();
        return;
      }
      var card = e.target.closest('[data-ask]');
      if (!card) return;
      var text = card.getAttribute('data-ask') || '';
      if (!text) return;
      if (e.target.closest('[data-ask-insert]')) insertIntoComposer(text);
      else send(text, card.getAttribute('data-intent') || undefined);
    });

    renderList();
    applyWidth();

    return {
      open: open,
      close: close,
      setDocked: setDocked,
      isDocked: function () { return askDocked; },
      dismissOverlay: dismissOverlay,
      refresh: renderList,
      root: askPanel
    };
  }

  global.WiseChatAsk = { mount: mount };
})(typeof window !== 'undefined' ? window : this);
