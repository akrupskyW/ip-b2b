/**
 * WISE — shared standalone Turns module for pages with a hand-built chat
 * (product-comparison.html, product-portfolio.html).
 *
 * Mirrors the Turns Module the shared chat engine (js/wiseai-chat.js) mounts on
 * pages/wiseai.html: a right-docked "sticky drawer" (a real flex sibling of the
 * chat in #modules-row, dressed by the shared .wch-sidebar.wch-docked rules
 * from chat-history.js) that lists every TURN of the conversation — the user's
 * line plus the WISEcodeAI replies that follow it — each with Fork / Share / Jump
 * controls and a search box. It reads the SAME `.sc-line` transcript markup
 * those pages already emit, so nothing about the chat itself changes.
 *
 *   const turns = window.WiseChatTurns.mount({
 *     messagesEl: '#chat-messages',
 *     container:  '#modules-row',
 *     anchor:     '#chat-shell',        // docks right after the chat
 *     history:    historyCtrl,          // WiseChatHistory.mount(...) handle
 *   });
 *   // three-dot "Turns" switch → turns.toggle();  state → turns.isVisible()
 *
 * Requires js/chat-history.js to be loaded first (it injects the shared
 * .wch-sidebar / .wch-docked / sticky-drawer styles this module reuses).
 */
(function (global) {
  'use strict';

  var STYLE_ID = 'wise-chat-turns-styles';

  /* The .wt-* styles below are copies of the ones js/wiseai-chat.js injects on
     engine-mounted surfaces (these pages don't load the engine), plus the
     switch / Admin-badge menu styles the three-dot parity rows need. */
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css = [
      '.wt-intro{margin:2px 16px 8px;font-size:12px;line-height:1.45;opacity:.7;}',
      '.wt-list{flex:1;overflow-y:auto;padding:2px 8px 14px;}',
      '.wt-empty{padding:26px 18px;font-size:12.5px;line-height:1.55;opacity:.62;text-align:center;}',
      '.wt-turn{position:relative;border:1px solid var(--border,rgba(0,0,0,0.08));border-radius:12px;padding:11px 12px 12px;margin:8px 4px;background:rgba(20,40,80,0.02);}',
      'html.dark .wt-turn{background:rgba(255,255,255,0.02);border-color:rgba(255,255,255,0.10);}',
      '.wt-turn-head{display:flex;align-items:center;gap:8px;margin-bottom:5px;}',
      '.wt-turn-num{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 6px;border-radius:999px;font-size:11px;font-weight:700;flex:0 0 auto;',
        'background:color-mix(in srgb,var(--primary,#2F6DF6) 14%,transparent);color:var(--primary,#2F6DF6);}',
      '.wt-turn-q{flex:1;min-width:0;font-size:13px;font-weight:600;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
      '.wt-turn-a{font-size:12px;line-height:1.45;opacity:.72;margin:2px 0 9px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
      '.wt-chips{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;}',
      '.wt-chip{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:600;padding:3px 8px;border-radius:999px;background:var(--surface-3,rgba(20,40,80,0.06));color:var(--text-muted,inherit);}',
      'html.dark .wt-chip{background:rgba(255,255,255,0.06);}',
      '.wt-chip .material-symbols-outlined{font-size:13px;}',
      '.wt-actions{display:flex;align-items:center;gap:6px;}',
      '.wt-fork{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border:0;border-radius:8px;background:transparent;color:var(--primary,#2F6DF6);cursor:pointer;opacity:.9;transition:background .14s ease,color .14s ease,opacity .14s ease;}',
      '.wt-fork:hover{opacity:1;background:color-mix(in srgb,var(--primary,#2F6DF6) 14%,transparent);}',
      '.wt-fork .material-symbols-outlined{font-size:17px;}',
      '.wt-fork-id{font-size:11px;font-weight:700;letter-spacing:0.02em;color:var(--primary,#2F6DF6);font-variant-numeric:tabular-nums;margin:0 2px 0 -1px;}',
      '.wt-jump{display:inline-flex;align-items:center;gap:5px;margin-left:auto;border:0;background:transparent;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;color:var(--text-muted,inherit);opacity:.8;padding:6px 4px;}',
      '.wt-jump:hover{opacity:1;color:var(--primary,#2F6DF6);}',
      '.wt-jump .material-symbols-outlined{font-size:15px;}',
      '.wt-iconbtn{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border:0;border-radius:8px;background:transparent;color:var(--text-muted,inherit);cursor:pointer;opacity:.82;transition:background .14s ease,color .14s ease,opacity .14s ease;}',
      '.wt-iconbtn:hover{opacity:1;color:var(--primary,#2F6DF6);background:color-mix(in srgb,var(--primary,#2F6DF6) 12%,transparent);}',
      '.wt-iconbtn .material-symbols-outlined{font-size:17px;}',
      '.wt-search{position:relative;display:flex;align-items:center;margin:2px 16px 6px;flex-shrink:0;}',
      '.wt-search > .material-symbols-outlined{position:absolute;left:11px;font-size:18px;opacity:.5;pointer-events:none;}',
      '.wt-search-input{width:100%;height:36px;box-sizing:border-box;padding:0 32px 0 36px;border-radius:999px;font:inherit;font-size:13px;color:inherit;outline:none;',
        'background:rgba(20,40,80,0.04);border:1px solid rgba(0,0,0,0.10);transition:border-color .15s ease,box-shadow .15s ease;}',
      'html.dark .wt-search-input{background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.12);}',
      '.wt-search-input::placeholder{opacity:.6;}',
      '.wt-search-input:focus{border-color:var(--primary,#2F6DF6);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary,#2F6DF6) 18%,transparent);}',
      '.wt-search-clear{position:absolute;right:8px;width:22px;height:22px;border:0;border-radius:50%;background:transparent;color:inherit;cursor:pointer;display:none;align-items:center;justify-content:center;opacity:.6;}',
      '.wt-search-clear:hover{background:rgba(0,0,0,0.08);opacity:1;}',
      'html.dark .wt-search-clear:hover{background:rgba(255,255,255,0.12);}',
      '.wt-search-clear .material-symbols-outlined{font-size:16px;}',
      '.wt-search.has-q .wt-search-clear{display:flex;}',
      '.wt-toast{position:absolute;left:50%;bottom:14px;transform:translateX(-50%) translateY(8px);z-index:70;pointer-events:none;',
        'background:#1f2430;color:#fff;font-size:12px;font-weight:600;padding:7px 13px;border-radius:999px;box-shadow:0 8px 22px rgba(0,0,0,0.32);',
        'opacity:0;transition:opacity .18s ease,transform .18s ease;}',
      '.wt-toast.is-vis{opacity:1;transform:translateX(-50%) translateY(0);}',
      /* Momentary highlight when "Jump to turn" scrolls a turn into view. */
      '@keyframes wtFlash{0%{box-shadow:0 0 0 3px color-mix(in srgb,var(--primary,#2F6DF6) 42%,transparent);}100%{box-shadow:0 0 0 0 transparent;}}',
      '.sc-line.wt-flash .sc-line-body{border-radius:12px;animation:wtFlash 1.3s ease;}',
      /* "Forked from …" lineage banner pinned to the top of a forked transcript. */
      '.sc-fork-banner{display:flex;align-items:center;gap:9px;margin:2px 0 14px;padding:9px 13px;border-radius:12px;font-size:12.5px;line-height:1.4;color:var(--text,inherit);',
        'background:color-mix(in srgb,var(--primary,#2F6DF6) 10%,transparent);border:1px solid color-mix(in srgb,var(--primary,#2F6DF6) 26%,transparent);}',
      '.sc-fork-banner-ic{font-size:18px;color:var(--primary,#2F6DF6);flex:0 0 auto;}',
      '.sc-fork-banner-txt strong{font-weight:700;}',
      /* Three-dot switch rows + Admin badge (parity with the shared chat menu). */
      '.sc-mcp-item{justify-content:flex-start;}',
      '.sc-mcp-item > span:not(.material-symbols-outlined):not(.sc-switch){flex:0 1 auto;min-width:0;text-align:left;white-space:nowrap;}',
      '.sc-mcp-item .sc-switch{margin-left:auto;}',
      '.sc-mcp-item .topbar-menu-badge ~ .sc-switch{margin-left:0;}',
      '.sc-switch{position:relative;flex:0 0 auto;width:34px;height:19px;border-radius:999px;background:var(--surface-3,#cdd3da);border:1px solid var(--border-strong,rgba(0,0,0,0.16));transition:background .15s ease,border-color .15s ease;}',
      'html.dark .sc-switch{background:rgba(255,255,255,0.14);}',
      '.sc-switch::after{content:"";position:absolute;top:1px;left:1px;width:15px;height:15px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.28);transition:transform .18s ease;}',
      '.sc-mcp-item.is-on .sc-switch{background:var(--primary,#2F6DF6);border-color:var(--primary,#2F6DF6);}',
      '.sc-mcp-item.is-on .sc-switch::after{transform:translateX(15px);}',
      '.topbar-menu-item--admin{color:rgb(219,39,119);}',
      '.topbar-menu-item--admin .topbar-menu-icon{color:rgb(219,39,119) !important;}',
      '.topbar-menu-item--admin:hover{background:rgba(236,72,153,0.12);color:rgb(219,39,119);}',
      'html.dark .topbar-menu-item--admin:hover{background:rgba(236,72,153,0.16);}',
      '.topbar-menu-badge{margin-left:auto;flex-shrink:0;padding:1px 5px;border-radius:5px;background:rgb(219,39,119);color:#fff;font-size:8.5px;font-weight:700;letter-spacing:0.06em;line-height:1.4;}'
    ].join('\n');
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  function resolve(v) {
    if (!v) return null;
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

    var messages = resolve(opts.messagesEl);
    var container = resolve(opts.container);
    var anchor = resolve(opts.anchor);
    if (!messages || !container || !anchor) return null;
    var width = opts.width || 280;
    var historyOf = function () {
      return typeof opts.history === 'function' ? opts.history() : opts.history;
    };

    var query = '';
    var concealTimer = null, revealTimer = null, toastTimer = null;
    var WIDTH_ICONS = ['width_normal', 'width_wide', 'width_full', 'width_full'];
    var WIDTH_TITLES = ['Width (single) — tap to widen', 'Width (double) — tap to widen', 'Width (triple) — tap to widen', 'Width (fill) — tap to reset'];
    var widthTier = 0;

    /* ── The docked module shell (dressed by the shared #modules-row
       .wch-sidebar.wch-docked rules from chat-history.js). Starts tucked in
       behind the chat (hidden); the three-dot "Turns" switch reveals it. ── */
    var panel = document.createElement('aside');
    panel.className = 'wch-sidebar wch-right wch-docked wch-docked-hidden';
    panel.setAttribute('aria-label', 'Turns');
    panel.innerHTML =
      '<div class="wch-head">' +
        '<span class="wch-head-title"><span class="material-symbols-outlined">alt_route</span>Turns</span>' +
        '<div class="wch-controls">' +
          '<div class="panel-more-wrap wt-more-wrap">' +
            '<button type="button" class="panel-more-btn wt-more-btn" title="More options" aria-haspopup="menu" aria-expanded="false" aria-label="More options"><span class="material-symbols-outlined">more_vert</span></button>' +
            '<div class="topbar-popover hidden wt-more-pop" role="menu">' +
              '<button type="button" class="topbar-menu-item topbar-menu-item--danger" data-turns-act="close"><span class="material-symbols-outlined topbar-menu-icon">close</span><span>Close panel</span></button>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="panel-width-toggle-btn wt-width-btn" aria-pressed="false" title="Width (single) — tap to widen" aria-label="Turns module width"><span class="material-symbols-outlined">width_normal</span></button>' +
        '</div>' +
      '</div>' +
      '<p class="wt-intro">Fork any turn into a brand-new chat of your own — the whole conversation up to that point is copied verbatim (nothing is re-run). The original is never touched.</p>' +
      '<div class="wt-search">' +
        '<span class="material-symbols-outlined">search</span>' +
        '<input type="text" class="wt-search-input" placeholder="Search turns…" aria-label="Search turns" autocomplete="off">' +
        '<button type="button" class="wt-search-clear" title="Clear search" aria-label="Clear search"><span class="material-symbols-outlined">close</span></button>' +
      '</div>' +
      '<div class="wt-list" role="list"></div>';

    if (anchor.parentElement === container && anchor.nextSibling) container.insertBefore(panel, anchor.nextSibling);
    else container.appendChild(panel);
    applyWidth();

    var listEl = panel.querySelector('.wt-list');
    var searchWrap = panel.querySelector('.wt-search');
    var searchInput = panel.querySelector('.wt-search-input');
    var searchClear = panel.querySelector('.wt-search-clear');

    /* ── Transcript → turns (same .sc-line grouping the engine uses) ── */
    function lineText(el) {
      if (!el) return '';
      var body = el.querySelector('.sc-line-body') || el;
      var clone = body.cloneNode(true);
      clone.querySelectorAll('.sc-line-meta,.sc-fb-wrap,.sc-inline-chips,.sc-reply-chips,.material-symbols-outlined,.material-symbols-rounded,svg')
        .forEach(function (n) { n.remove(); });
      return (clone.textContent || '').replace(/\s+/g, ' ').trim();
    }
    function collectTurns() {
      var turns = [];
      var cur = null;
      Array.prototype.forEach.call(messages.children, function (node) {
        if (!node.classList || !node.classList.contains('sc-line')) return;
        if (node.classList.contains('sc-line-typing')) return;
        if (node.classList.contains('sc-line-event')) return;
        if (node.classList.contains('sc-line-you')) {
          cur = { you: node, replies: [] };
          turns.push(cur);
        } else {
          if (!cur) { cur = { you: null, replies: [] }; turns.push(cur); }
          cur.replies.push(node);
        }
      });
      return turns;
    }
    function turnArtifacts(replies) {
      var scope = document.createElement('div');
      (replies || []).forEach(function (r) {
        var b = r.querySelector('.sc-line-body');
        if (b) scope.appendChild(b.cloneNode(true));
      });
      var chips = [];
      var add = function (icon, label) {
        if (!chips.some(function (c) { return c.label === label; })) chips.push({ icon: icon, label: label });
      };
      if (scope.querySelector('table')) add('table_chart', 'Table');
      if (scope.querySelector('canvas, svg:not(.sc-avatar svg)')) add('insights', 'Charts');
      if (scope.querySelector('.sc-trust-chip, a[href]')) add('verified_user', 'References');
      if (scope.querySelector('img')) add('image', 'Image');
      return chips;
    }
    function forkIdOf(turn) {
      var rs = (turn && turn.replies) || [];
      for (var k = 0; k < rs.length; k++) {
        var el = rs[k] && rs[k].querySelector ? rs[k].querySelector('.sc-fb-id') : null;
        var t = el && el.textContent ? el.textContent.trim() : '';
        if (t) return t;
      }
      return '';
    }

    function turnRowHtml(turn, i) {
      var q = turn.you ? lineText(turn.you) : '';
      var a = turn.replies.length ? lineText(turn.replies[0]) : '';
      var chips = turnArtifacts(turn.replies).map(function (c) {
        return '<span class="wt-chip"><span class="material-symbols-outlined">' + esc(c.icon) + '</span>' + esc(c.label) + '</span>';
      }).join('');
      var fid = forkIdOf(turn);
      return '<div class="wt-turn" data-turn="' + i + '">' +
        '<div class="wt-turn-head">' +
          '<span class="wt-turn-num">' + (i + 1) + '</span>' +
          '<span class="wt-turn-q">' + (q ? esc(q) : '<em>WISEcodeAI\u2122 opened the conversation</em>') + '</span>' +
        '</div>' +
        (a ? '<div class="wt-turn-a">' + esc(a) + '</div>' : '') +
        (chips ? '<div class="wt-chips">' + chips + '</div>' : '') +
        '<div class="wt-actions">' +
          '<button type="button" class="wt-fork" data-fork="' + i + '" title="Fork from here" aria-label="Fork from here"><span class="material-symbols-outlined">alt_route</span></button>' +
          (fid ? '<span class="wt-fork-id" title="Fork ID">' + esc(fid) + '</span>' : '') +
          '<button type="button" class="wt-iconbtn wt-share" data-share="' + i + '" title="Share this turn" aria-label="Share this turn"><span class="material-symbols-outlined">ios_share</span></button>' +
          '<button type="button" class="wt-jump" data-jump="' + i + '" title="Jump to this turn"><span class="material-symbols-outlined">my_location</span>Jump</button>' +
        '</div>' +
      '</div>';
    }

    function render() {
      var turns = collectTurns();
      if (!turns.length) {
        listEl.innerHTML = '<div class="wt-empty">No turns yet.<br>Ask a question, then fork any turn from here to branch the conversation into a new chat of your own.</div>';
        return;
      }
      var q = (query || '').trim().toLowerCase();
      var rows = turns.map(function (t, i) { return { t: t, i: i }; });
      if (q) {
        rows = rows.filter(function (r) {
          var hay = (lineText(r.t.you) + ' ' + (r.t.replies || []).map(lineText).join(' ') + ' ' +
            turnArtifacts(r.t.replies).map(function (c) { return c.label; }).join(' ')).toLowerCase();
          return hay.indexOf(q) !== -1;
        });
      }
      if (!rows.length) {
        listEl.innerHTML = '<div class="wt-empty">No turns match \u201C' + esc((query || '').trim()) + '\u201D.</div>';
        return;
      }
      listEl.innerHTML = rows.map(function (r) { return turnRowHtml(r.t, r.i); }).join('');
    }

    /* ── Width changer (canonical four-tier cycle) ── */
    function applyWidth() {
      var tiers = [width, Math.round(width * 1.5), width * 2];
      try { global.WisePaneResize && global.WisePaneResize.release && global.WisePaneResize.release([panel]); } catch (_) {}
      if (widthTier >= 3) {
        panel.style.setProperty('flex', '1000 1 auto', 'important');
        panel.style.setProperty('width', 'auto', 'important');
        panel.style.setProperty('max-width', 'none', 'important');
      } else {
        var w = tiers[widthTier] || width;
        panel.style.setProperty('flex', '0 0 ' + w + 'px', 'important');
        panel.style.setProperty('width', w + 'px', 'important');
        panel.style.setProperty('max-width', 'none', 'important');
      }
      var btn = panel.querySelector('.wt-width-btn');
      if (btn) {
        btn.classList.toggle('is-on', widthTier >= 1);
        btn.setAttribute('aria-pressed', widthTier >= 1 ? 'true' : 'false');
        btn.title = WIDTH_TITLES[widthTier];
        var ic = btn.querySelector('.material-symbols-outlined');
        if (ic) ic.textContent = WIDTH_ICONS[widthTier];
      }
    }

    /* ── Reveal / conceal (slides out from / tucks in behind the chat) ── */
    function isVisible() {
      return !panel.classList.contains('wch-docked-hidden') && !panel.classList.contains('wch-dock-conceal');
    }
    function open() {
      clearTimeout(concealTimer);
      clearTimeout(revealTimer);
      render();
      panel.classList.remove('wch-docked-hidden', 'wch-dock-conceal', 'wch-dock-reveal');
      void panel.offsetWidth;
      panel.classList.add('wch-dock-reveal');
      revealTimer = setTimeout(function () { panel.classList.remove('wch-dock-reveal'); }, 480);
    }
    function close() {
      clearTimeout(concealTimer);
      panel.classList.remove('wch-dock-reveal');
      void panel.offsetWidth;
      panel.classList.add('wch-dock-conceal');
      concealTimer = setTimeout(function () {
        panel.classList.add('wch-docked-hidden');
        panel.classList.remove('wch-dock-conceal');
      }, 300);
    }
    function toggle() { if (isVisible()) close(); else open(); }

    /* ── Fork / jump / share ── */
    function toast(msg) {
      var t = panel.querySelector('.wt-toast');
      if (!t) { t = document.createElement('div'); t.className = 'wt-toast'; panel.appendChild(t); }
      t.textContent = msg;
      requestAnimationFrame(function () { t.classList.add('is-vis'); });
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { t.classList.remove('is-vis'); }, 1600);
    }
    function forkFromTurn(index) {
      var turns = collectTurns();
      if (index < 0 || index >= turns.length) return;
      var turn = turns[index];
      var lastNode = turn.replies.length ? turn.replies[turn.replies.length - 1] : turn.you;
      var allNodes = Array.prototype.slice.call(messages.children);
      var endIdx = allNodes.indexOf(lastNode);
      if (endIdx < 0) return;
      var containerEl = document.createElement('div');
      for (var k = 0; k <= endIdx; k++) {
        var n = allNodes[k];
        if (n.classList && (n.classList.contains('sc-line-typing') || n.classList.contains('sc-inline-chips') || n.classList.contains('sc-fork-banner'))) continue;
        containerEl.appendChild(n.cloneNode(true));
      }
      var hist = historyOf();
      var sourceTitle = (hist && hist.currentTitle) ? hist.currentTitle() : 'this conversation';
      var banner = '<div class="sc-fork-banner" role="note"><span class="sc-fork-banner-ic material-symbols-outlined">alt_route</span><span class="sc-fork-banner-txt">Forked from <strong>' + esc(sourceTitle) + '</strong></span></div>';
      var forkHtml = banner + containerEl.innerHTML;
      var count = containerEl.querySelectorAll('.sc-line').length;
      if (hist && hist.add && hist.restore) {
        /* File the fork as its own thread, then restore() it — restore() saves
           the current (source) thread first, so the original stays intact and
           the fork becomes the active chat. */
        var item = hist.add({ title: sourceTitle, html: forkHtml, count: count, fork: { from: sourceTitle } });
        hist.restore(item.id);
      } else {
        messages.innerHTML = forkHtml;
        messages.scrollTop = messages.scrollHeight;
      }
      render();
    }
    function jumpToTurn(index) {
      var turns = collectTurns();
      if (index < 0 || index >= turns.length) return;
      var target = turns[index].you || turns[index].replies[0] || null;
      if (!target) return;
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      target.classList.add('wt-flash');
      setTimeout(function () { target.classList.remove('wt-flash'); }, 1400);
    }
    function shareTurn(index) {
      var turns = collectTurns();
      if (index < 0 || index >= turns.length) return;
      var url = location.href.split('#')[0] + '#turn-' + (index + 1);
      var q = turns[index].you ? lineText(turns[index].you) : 'this turn';
      var payload = q + ' — ' + url;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(payload).then(function () { toast('Link copied'); }, function () { toast('Couldn\u2019t copy'); });
      } else { toast('Sharing isn\u2019t available here'); }
    }

    /* ── Events ── */
    panel.addEventListener('click', function (e) {
      var fork = e.target.closest('[data-fork]');
      if (fork) { forkFromTurn(Number(fork.getAttribute('data-fork'))); return; }
      var jump = e.target.closest('[data-jump]');
      if (jump) { jumpToTurn(Number(jump.getAttribute('data-jump'))); return; }
      var share = e.target.closest('[data-share]');
      if (share) { shareTurn(Number(share.getAttribute('data-share'))); return; }
    });

    if (searchInput) searchInput.addEventListener('input', function () {
      query = searchInput.value || '';
      if (searchWrap) searchWrap.classList.toggle('has-q', !!query.trim());
      render();
    });
    if (searchClear) searchClear.addEventListener('click', function () {
      if (searchInput) { searchInput.value = ''; searchInput.focus(); }
      query = '';
      if (searchWrap) searchWrap.classList.remove('has-q');
      render();
    });

    var widthBtn = panel.querySelector('.wt-width-btn');
    if (widthBtn) widthBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      widthTier = (widthTier + 1) % 4;
      applyWidth();
    });

    /* Three-dot menu (Close panel). The docked module clips its own overflow
       (rounded corners), so the popover is pinned fixed under the trigger. */
    var moreWrap = panel.querySelector('.wt-more-wrap');
    var moreBtn = panel.querySelector('.wt-more-btn');
    var morePop = panel.querySelector('.wt-more-pop');
    function closeMore() {
      morePop.classList.add('hidden');
      moreBtn.classList.remove('is-open');
      moreBtn.setAttribute('aria-expanded', 'false');
    }
    moreBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = morePop.classList.contains('hidden');
      morePop.classList.toggle('hidden', !willOpen);
      moreBtn.classList.toggle('is-open', willOpen);
      moreBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      if (willOpen) {
        if (morePop.parentElement !== document.body) document.body.appendChild(morePop);
        morePop.style.position = 'fixed';
        morePop.style.zIndex = '3000';
        var w = morePop.offsetWidth || 240;
        var r = moreBtn.getBoundingClientRect();
        morePop.style.top = (r.bottom + 6) + 'px';
        morePop.style.left = Math.max(6, Math.min(r.right - w, window.innerWidth - w - 6)) + 'px';
        morePop.style.right = 'auto';
      }
    });
    morePop.addEventListener('click', function (e) {
      var it = e.target.closest('[data-turns-act]');
      if (!it) return;
      closeMore();
      if (it.getAttribute('data-turns-act') === 'close') { close(); if (typeof opts.onVisibility === 'function') opts.onVisibility(false); }
    });
    document.addEventListener('click', function (e) {
      if (!morePop.classList.contains('hidden') && !moreWrap.contains(e.target) && !morePop.contains(e.target)) closeMore();
    });

    /* Keep the list live as the conversation grows (only while on screen). */
    var queued = false;
    var mo = new MutationObserver(function () {
      if (queued || !isVisible()) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; if (isVisible()) render(); });
    });
    mo.observe(messages, { childList: true, subtree: false });

    render();

    return { toggle: toggle, open: open, close: close, isVisible: isVisible, refresh: render, root: panel };
  }

  global.WiseChatTurns = { mount: mount };
})(typeof window !== 'undefined' ? window : this);
