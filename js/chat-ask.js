/**
 * WISE — shared "What can I ask?" side panel.
 *
 * The in-chat overlay (same .wch-sidebar shell as History / Connect a data
 * source) that lists THIS surface's prompts as insertable cards. The header's
 * ⋯ "Break out as a side module" detaches it into a sticky drawer to the
 * RIGHT of the chat — a real flex sibling in #modules-row, dressed by the
 * shared .wch-sidebar.wch-docked rules from chat-history.js.
 *
 * Works both as a classic <script src> (attaches window.WiseChatAsk) and as a
 * side-effect ES import (`import './chat-ask.js'` then read window.WiseChatAsk).
 *
 *   const ask = window.WiseChatAsk.mount({
 *     host:        '.ap-chat-body',     // overlay lives inside the chat body
 *     container:   '#modules-row',      // breakout target
 *     anchor:      '.ap-chat',          // docks right after this sibling
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
      '.wch-ask-list{flex:1;overflow-y:auto;padding:4px 10px 14px;}',
      '.wch-ask-group{margin:8px 0 4px;}',
      '.wch-ask-group+.wch-ask-group{margin-top:16px;}',
      '.wch-ask-group-title{display:flex;align-items:center;gap:8px;padding:2px 6px 8px;font-size:14px;font-weight:700;color:var(--text);}',
      '.wch-ask-group-title .material-symbols-outlined{font-size:18px;opacity:.9;}',
      '.wch-ask-cards{display:flex;flex-direction:column;gap:6px;}',
      '.wch-ask-card{position:relative;display:flex;align-items:flex-start;gap:11px;width:100%;padding:11px 12px;border:1px solid rgba(255,255,255,0.09);background:rgba(255,255,255,0.02);border-radius:12px;cursor:pointer;text-align:left;color:inherit;font-family:inherit;}',
      'html:not(.dark) .wch-ask-card{border-color:rgba(20,40,80,0.10);background:rgba(20,40,80,0.015);}',
      '.wch-ask-ico{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;margin-top:1px;background:none;color:var(--primary-ink,var(--primary,#2F6DF6));}',
      '.wch-ask-ico .material-symbols-outlined{font-size:22px;}',
      '.wch-ask-card-body{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px;padding-right:26px;}',
      '.wch-ask-card-title{font-size:14px;font-weight:600;line-height:1.35;}',
      '.wch-ask-card-desc{font-size:13px;line-height:1.45;opacity:.8;}',
      '.wch-ask-insert{position:absolute;top:9px;right:9px;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border:0;background:none;color:var(--text-muted);cursor:pointer;opacity:0;}',
      '.wch-ask-card:hover .wch-ask-insert,.wch-ask-card:focus-within .wch-ask-insert{opacity:.7;}',
      '.wch-ask-search{display:flex;align-items:center;gap:8px;margin:0 12px 8px;padding:0 14px;height:38px;border:1px solid rgba(20,40,80,0.10);border-radius:999px;background:rgba(20,40,80,0.04);}',
      'html.dark .wch-ask-search{border-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.05);}',
      '.wch-ask-search-input{flex:1 1 auto;min-width:0;border:0;outline:0;background:none;color:inherit;font-family:inherit;font-size:13.5px;}',
      '.wch-ask-search-clear{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border:0;border-radius:50%;background:transparent;color:var(--text-muted);cursor:pointer;}',
      '.wch-ask-panel .wch-head-title{font-family:"WISE Digits","Noto Serif",Georgia,serif;font-weight:800;font-size:1.2rem;letter-spacing:-.01em;line-height:1.16;}',
      '.wch-ask-panel .wch-head-title .material-symbols-outlined{display:none;}',
      '.wch-ask-filters{display:flex;flex-wrap:wrap;gap:6px;margin:0 12px 10px;}',
      '.wch-ask-filter{border:1px solid var(--border-strong);background:color-mix(in srgb,var(--primary) 10%,#fff);color:var(--text-muted);border-radius:999px;padding:5px 13px;font-family:inherit;font-size:12.5px;font-weight:500;cursor:pointer;}',
      '.wch-ask-filter:hover{background:color-mix(in srgb,var(--primary) 16%,#fff);border-color:color-mix(in srgb,var(--primary) 40%,var(--border-strong));color:var(--text);}',
      'html.dark .wch-ask-filter{background:color-mix(in srgb,var(--primary-bright,#8B9FAF) 14%,transparent);border-color:var(--primary);}',
      '.wch-ask-filter.is-active{background:var(--primary,#2F6DF6);border-color:var(--primary,#2F6DF6);color:#fff;font-weight:600;}',
      '.wch-ask-insert .material-symbols-outlined,.wch-ask-prompt-btn .material-symbols-outlined{font-variation-settings:"FILL" 1;}',
      '.wch-ask-cap{border:1px solid rgba(255,255,255,0.09);background:rgba(255,255,255,0.02);border-radius:12px;padding:12px 13px 11px;}',
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
    var askSticky = opts.stickyDefault !== false;
    var askDocked = false;
    var askQuery = '';
    var askSection = 'all';
    var askCloseTimer = null;
    var askConcealTimer = null;
    var askRevealTimer = null;
    var askMorePop = null;

    host.classList.add('wch-host');

    var askScrim = document.createElement('div');
    askScrim.className = 'wch-scrim';
    var askPanel = document.createElement('aside');
    askPanel.className = 'wch-sidebar wch-right wch-ask-panel';
    askPanel.setAttribute('aria-label', label);
    askPanel.innerHTML =
      '<div class="wch-head">' +
        '<span class="wch-head-title"><span class="material-symbols-outlined">help</span>' + esc(label) + '</span>' +
        '<div class="wch-controls">' +
          '<div class="panel-more-wrap wch-ask-more-wrap">' +
            '<button type="button" class="panel-more-btn wch-ask-more-btn" title="More options" aria-haspopup="menu" aria-expanded="false" aria-label="More options"><span class="material-symbols-outlined">more_vert</span></button>' +
            '<div class="topbar-popover hidden wch-ask-more-pop" role="menu">' +
              '<button type="button" class="topbar-menu-item wch-ask-breakout" data-ask-act="breakout"><span class="material-symbols-outlined topbar-menu-icon">vertical_split</span><span class="wch-ask-breakout-label">Break out as a side module</span></button>' +
              '<div class="topbar-menu-divider"></div>' +
              '<button type="button" class="topbar-menu-item topbar-menu-item--danger" data-ask-act="close"><span class="material-symbols-outlined topbar-menu-icon">close</span><span>Close pane</span></button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<p class="wch-ask-intro">' + esc((catalog && catalog.intro) || 'Tap a prompt to ask it now, or use the insert icon to drop it into the message box and tweak it first.') + '</p>' +
      '<div class="wch-ask-search">' +
        '<span class="material-symbols-outlined">search</span>' +
        '<input type="text" class="wch-ask-search-input" placeholder="' + esc((catalog && catalog.searchPlaceholder) || 'Search prompts\u2026') + '" aria-label="Search prompts" autocomplete="off">' +
        '<button type="button" class="wch-ask-search-clear" title="Clear search" aria-label="Clear search" hidden><span class="material-symbols-outlined">close</span></button>' +
      '</div>' +
      '<div class="wch-list wch-ask-list" role="list"></div>';
    host.appendChild(askScrim);
    host.appendChild(askPanel);
    var askList = askPanel.querySelector('.wch-ask-list');

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
      return '<div class="wch-ask-cap">' +
        '<div class="wch-ask-cap-head">' +
          '<span class="wch-ask-cap-ico"><span class="material-symbols-outlined">' + esc(item.icon || sectionIcon || 'bolt') + '</span></span>' +
          '<span class="wch-ask-cap-titles"><span class="wch-ask-cap-title">' + esc(item.title || '') + '</span>' + desc + '</span>' +
        '</div>' +
        '<div class="wch-ask-prompts">' + prompts + '</div>' +
        tools +
      '</div>';
    }

    function renderCatalog() {
      var q = (askQuery || '').trim().toLowerCase();
      var matchItem = function (it) {
        if (!q) return true;
        var hay = [it.title, it.desc, (it.prompts || []).join(' '), (it.tools || []).join(' ')]
          .filter(Boolean).join(' ').toLowerCase();
        return hay.indexOf(q) !== -1;
      };
      var sections = catalog.sections;
      if (askSection !== 'all' && !sections.some(function (s) { return s.id === askSection; })) askSection = 'all';
      var chips = ['<div class="wch-ask-filters">',
        '<button type="button" class="wch-ask-filter' + (askSection === 'all' ? ' is-active' : '') + '" data-section="all">All</button>']
        .concat(sections.map(function (s) {
          return '<button type="button" class="wch-ask-filter' + (askSection === s.id ? ' is-active' : '') + '" data-section="' + esc(s.id) + '">' + esc(s.title) + '</button>';
        }))
        .concat('</div>').join('');
      var scoped = sections.filter(function (s) { return askSection === 'all' || s.id === askSection; });
      var groups = scoped
        .map(function (s) { return { s: s, items: (s.items || []).filter(matchItem) }; })
        .filter(function (g) { return g.items.length; });
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
      askList.innerHTML = chips + body;
    }

    function renderList() {
      if (!askList) return;
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
      var clr = askPanel.querySelector('.wch-ask-search-clear');
      if (clr) clr.hidden = !askQuery;
      renderList();
    }
    function clearQuery() {
      var inp = askPanel.querySelector('.wch-ask-search-input');
      if (inp) { inp.value = ''; inp.focus(); }
      applyQuery('');
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

    function setSticky(on) {
      askSticky = !!on;
      askPanel.classList.toggle('wch-unsticky', !askSticky);
      if (askDocked && askSticky) {
        var row = resolve(opts.container) || (resolve(opts.anchor) && resolve(opts.anchor).closest('#modules-row'));
        if (row) row.classList.add('modules-sticky');
      }
      updateBreakBtn();
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
        if (container) {
          if (anchor && anchor.parentElement === container && anchor.nextSibling) container.insertBefore(askPanel, anchor.nextSibling);
          else container.appendChild(askPanel);
        }
        askPanel.classList.add('wch-docked');
        askPanel.style.flex = '0 0 ' + breakoutWidth + 'px';
        askPanel.style.width = breakoutWidth + 'px';
        setSticky(askSticky);
        renderList();
        updateBreakBtn();
      } else {
        askPanel.classList.remove('wch-docked', 'wch-docked-hidden', 'wch-dock-conceal', 'wch-dock-reveal', 'wch-unsticky');
        askPanel.style.flex = '';
        askPanel.style.width = '';
        host.classList.add('wch-host');
        if (!host.contains(askPanel)) host.appendChild(askPanel);
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
      if (askDocked) { clearTimeout(askConcealTimer); renderList(); revealDocked(); return; }
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
        var r = askMoreBtn.getBoundingClientRect();
        askMorePop.style.top = (r.bottom + 6) + 'px';
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
    });
    document.addEventListener('click', function (e) {
      if (!askMorePop.classList.contains('hidden') && !askMoreWrap.contains(e.target) && !askMorePop.contains(e.target)) closeMore();
    });

    var askSearchInput = askPanel.querySelector('.wch-ask-search-input');
    var askSearchClear = askPanel.querySelector('.wch-ask-search-clear');
    if (askSearchInput) askSearchInput.addEventListener('input', function () { applyQuery(askSearchInput.value); });
    if (askSearchClear) askSearchClear.addEventListener('click', clearQuery);

    askPanel.addEventListener('click', function (e) {
      var filter = e.target.closest('.wch-ask-filter');
      if (filter) {
        askSection = filter.getAttribute('data-section') || 'all';
        renderList();
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
