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
        '--wch-tree:color-mix(in srgb,var(--text-subtle,#8B9FAF) 52%,transparent);--wch-tree-bg:var(--card,var(--surface,#0F1830));',
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
      'html:not(.dark) .wch-sidebar{background:#fff;color:#1F2733;border-color:rgba(0,0,0,0.08);box-shadow:10px 0 34px rgba(20,30,60,0.12);--wch-tree-bg:#fff;}',
      'html.dark .wch-sidebar{--wch-tree:rgba(255,255,255,0.20);}',
      'html:not(.dark) .wch-sidebar.wch-right{box-shadow:-10px 0 34px rgba(20,30,60,0.12);}',
      '.wch-head{display:flex;align-items:center;gap:8px;padding:14px 12px 12px 16px;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,0.08);}',
      'html:not(.dark) .wch-head{border-bottom-color:rgba(0,0,0,0.07);}',
      '.wch-head-title{display:flex;align-items:center;gap:8px;font-weight:600;font-size:14px;flex:1;}',
      '.wch-head-title .material-symbols-outlined{font-size:19px;color:var(--primary-ink,var(--primary,#2F6DF6));}',
      '.wch-close,.wch-dock{width:30px;height:30px;border-radius:50%;border:0;background:transparent;color:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:.75;}',
      '.wch-close:hover,.wch-dock:hover{background:rgba(255,255,255,0.08);opacity:1;}',
      'html:not(.dark) .wch-close:hover,html:not(.dark) .wch-dock:hover{background:rgba(0,0,0,0.05);}',
      '.wch-close .material-symbols-outlined,.wch-dock .material-symbols-outlined{font-size:19px;}',
      '.wch-new{flex:0 0 auto;width:36px;height:36px;padding:0;border:0;border-radius:50%;background:var(--primary,#2F6DF6);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;}',
      '.wch-new:hover{filter:brightness(1.06);}',
      '.wch-new .material-symbols-outlined{font-size:20px;}',
      '.wch-list{flex:1;overflow-y:auto;padding:2px 8px 12px;}',
      /* ── Chat color dot ─────────────────────────────────────────────────────
         Every conversation has a colored circle. A rounded progress ring
         (same language as the transcript’s in-progress owl) wraps it. Live
         rows spin that ring and pulse the fill in brand blue. */
      '.wch-item{position:relative;display:flex;align-items:center;padding:4px 14px 4px 12px;border-radius:10px;cursor:pointer;margin:0;}',
      '.wch-item.wch-active .wch-item-title{font-weight:700;}',
      '.wch-item-title{flex:1;min-width:0;font-size:12px;font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.wch-fork-badge{display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;margin-right:5px;width:17px;height:17px;border-radius:50%;background:color-mix(in srgb,var(--primary,#2F6DF6) 16%,transparent);color:var(--primary-ink,var(--primary,#2F6DF6));}',
      '.wch-fork-badge .material-symbols-outlined{font-size:12px;}',
      '.wch-item-meta{font-size:11px;opacity:.62;margin-top:2px;}',
      /* Colored chat circle + rounded progress ring (matches the transcript’s
         in-progress owl: .sc-line-typing .sc-avatar-wiseai::after). */
      '.wch-chat-dot{display:inline-block;flex:0 0 auto;width:7px;height:7px;border-radius:50%;margin-right:10px;vertical-align:middle;background:currentColor;position:relative;z-index:2;}',
      '.wch-chat-dot::after{content:"";position:absolute;inset:-3px;border-radius:50%;box-sizing:border-box;pointer-events:none;border:2px solid color-mix(in srgb,var(--text-subtle,#8B9FAF) 28%,transparent);}',
      '.wch-chat-dot.wch-live-dot{color:var(--primary,#2F6DF6);box-shadow:0 0 0 0 color-mix(in srgb,var(--primary,#2F6DF6) 28%,transparent);animation:wchLive 2.6s ease-in-out infinite;}',
      '.wch-chat-dot.wch-live-dot::after{border:2px solid color-mix(in srgb,#8CB8FF 26%,transparent);border-top-color:#8CB8FF;animation:wchSpin .8s linear infinite;}',
      '@keyframes wchSpin{to{transform:rotate(360deg);}}',
      '@keyframes wchLive{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--primary,#2F6DF6) 28%,transparent);opacity:.75}50%{box-shadow:0 0 0 5px color-mix(in srgb,var(--primary,#2F6DF6) 0%,transparent);opacity:1}100%{box-shadow:0 0 0 0 color-mix(in srgb,var(--primary,#2F6DF6) 0%,transparent);opacity:.75}}',
      '@media (prefers-reduced-motion:reduce){.wch-live-dot{animation:none;opacity:1;}.wch-chat-dot.wch-live-dot::after{animation:none;}}',
      /* ── Row hover info card ────────────────────────────────────────────────
         The timestamp + message count (and fork / MCP lineage) no longer clutter
         the row — they surface in this floating card on hover. It anchors ABOVE
         the row (falling back to the RIGHT when there is no room above), never
         directly below, per the popover conventions, and is legible in both
         light and dark mode. */
      '.wch-info{position:fixed;z-index:90;min-width:196px;max-width:264px;padding:12px 14px;border-radius:14px;pointer-events:none;',
        'opacity:0;transform:translateY(5px) scale(.97);transform-origin:top left;transition:opacity .14s ease,transform .14s ease;',
        'background:var(--card,var(--surface,#0F1830));color:var(--text,#C5CFD7);border:1px solid rgba(255,255,255,0.12);box-shadow:0 18px 44px rgba(0,0,0,0.46);}',
      'html:not(.dark) .wch-info{background:#fff;color:#1F2733;border-color:rgba(0,0,0,0.09);box-shadow:0 18px 44px rgba(20,30,60,0.18);}',
      '.wch-info.is-vis{opacity:1;transform:none;}',
      '.wch-info-title{font-family:"WISE Digits","Noto Serif",Georgia,serif;font-weight:700;font-size:13.5px;line-height:1.26;letter-spacing:-.01em;margin-bottom:9px;}',
      '.wch-info-row{display:flex;align-items:center;gap:9px;font-size:12px;line-height:1.5;opacity:.82;}',
      '.wch-info-row + .wch-info-row{margin-top:4px;}',
      '.wch-info-row .material-symbols-outlined{font-size:16px;opacity:.66;flex:0 0 auto;}',
      '.wch-info-row.is-live{opacity:1;color:#12B981;font-weight:600;}',
      '.wch-info-row.is-live .material-symbols-outlined{opacity:1;color:#12B981;}',
      '.wch-del{position:absolute;top:50%;right:6px;transform:translateY(-50%);width:24px;height:24px;border:0;border-radius:50%;background:transparent;color:inherit;cursor:pointer;display:none;align-items:center;justify-content:center;opacity:.6;}',
      '.wch-item:hover .wch-del{display:flex;}',
      '.wch-del:hover{background:rgba(255,255,255,0.12);opacity:1;}',
      'html:not(.dark) .wch-del:hover{background:rgba(0,0,0,0.08);}',
      '.wch-del .material-symbols-outlined{font-size:16px;}',
      '.wch-empty{padding:22px 16px;font-size:12px;line-height:1.5;opacity:.6;text-align:center;}',
      '.wch-group{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.5;padding:12px 12px 4px;}',
      '.wch-search{position:relative;display:flex;align-items:center;margin:10px 12px 2px;flex-shrink:0;}',
      '.wch-search > .material-symbols-outlined{position:absolute;left:11px;font-size:18px;opacity:.5;pointer-events:none;}',
      '.wch-search-input{width:100%;height:36px;box-sizing:border-box;padding:0 32px 0 36px;border-radius:999px;font:inherit;font-size:13px;color:inherit;outline:none;',
        'background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);transition:border-color .15s ease,box-shadow .15s ease;}',
      'html:not(.dark) .wch-search-input{background:rgba(20,40,80,0.04);border-color:rgba(0,0,0,0.10);}',
      '.wch-search-input::placeholder{opacity:.6;}',
      '.wch-search-input:focus{border-color:var(--primary,#2F6DF6);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary,#2F6DF6) 18%,transparent);}',
      '.wch-search-clear{position:absolute;right:8px;width:22px;height:22px;border:0;border-radius:50%;background:transparent;color:inherit;cursor:pointer;display:none;align-items:center;justify-content:center;opacity:.6;}',
      '.wch-search-clear:hover{background:rgba(255,255,255,0.12);opacity:1;}',
      'html:not(.dark) .wch-search-clear:hover{background:rgba(0,0,0,0.08);}',
      '.wch-search-clear .material-symbols-outlined{font-size:16px;}',
      '.wch-search.has-q .wch-search-clear{display:flex;}',
      /* Trailing filter icon inside the search input (opens the filter popover).
         When present, reserve room on the right and slide the clear button in so
         the two never overlap. */
      '.wch-search-filter{position:absolute;right:6px;width:26px;height:26px;border:0;border-radius:50%;background:transparent;color:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:.6;transition:background .15s ease,color .15s ease,opacity .15s ease;}',
      '.wch-search-filter:hover,.wch-search-filter[aria-expanded="true"]{background:rgba(255,255,255,0.12);opacity:1;}',
      'html:not(.dark) .wch-search-filter:hover,html:not(.dark) .wch-search-filter[aria-expanded="true"]{background:rgba(0,0,0,0.08);}',
      '.wch-search-filter .material-symbols-outlined{font-size:18px;}',
      '.wch-search-filter.is-on{color:var(--primary-ink,var(--primary,#2F6DF6));opacity:1;background:color-mix(in srgb,var(--primary,#2F6DF6) 16%,transparent);}',
      '.wch-search:has(.wch-search-filter) .wch-search-input{padding-right:62px;}',
      '.wch-search:has(.wch-search-filter) .wch-search-clear{right:34px;}',
      /* Search row can host a trailing filter toggle (e.g. MCP-usage). */
      '.wch-search-row{display:flex;align-items:center;gap:8px;margin:10px 12px 2px;flex-shrink:0;}',
      '.wch-search-row .wch-search{margin:0;flex:1 1 auto;min-width:0;}',
      '.wch-mcp{flex:0 0 auto;height:36px;display:inline-flex;align-items:center;gap:6px;padding:0 12px;border-radius:999px;cursor:pointer;font:inherit;font-size:12px;font-weight:700;color:inherit;',
        'background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);transition:background .15s ease,border-color .15s ease,color .15s ease;}',
      'html:not(.dark) .wch-mcp{background:rgba(20,40,80,0.04);border-color:rgba(0,0,0,0.10);}',
      '.wch-mcp .material-symbols-outlined{font-size:17px;}',
      '.wch-mcp:hover{border-color:var(--primary,#2F6DF6);}',
      '.wch-mcp.is-on{background:color-mix(in srgb,var(--primary,#2F6DF6) 16%,transparent);border-color:color-mix(in srgb,var(--primary,#2F6DF6) 48%,transparent);color:var(--primary-ink,var(--primary,#2F6DF6));}',
      '.wch-mcp-label{letter-spacing:.02em;}',
      /* Small "used MCP" chip on a conversation row. */
      '.wch-mcp-badge{display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;margin-right:5px;width:17px;height:17px;border-radius:50%;',
        'background:color-mix(in srgb,var(--primary,#2F6DF6) 14%,transparent);color:var(--primary-ink,var(--primary,#2F6DF6));}',
      '.wch-mcp-badge .material-symbols-outlined{font-size:12px;}',
      /* MCP-usage filter as a switch row inside the three-dot menu (docked). */
      '.wch-mcp-item{justify-content:flex-start;}',
      '.wch-mcp-item > span:not(.material-symbols-outlined):not(.wch-switch){flex:1 1 auto;white-space:nowrap;}',
      '.wch-switch{position:relative;flex:0 0 auto;width:34px;height:19px;border-radius:999px;background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.22);transition:background .15s ease,border-color .15s ease;}',
      'html:not(.dark) .wch-switch{background:rgba(20,40,80,0.16);border-color:rgba(0,0,0,0.16);}',
      '.wch-switch::after{content:"";position:absolute;top:1px;left:1px;width:15px;height:15px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.28);transition:transform .18s ease;}',
      '.wch-mcp-item.is-on .wch-switch{background:var(--primary,#2F6DF6);border-color:var(--primary,#2F6DF6);}',
      '.wch-mcp-item.is-on .wch-switch::after{transform:translateX(15px);}',
      /* Filter popover row (opened from the search filter icon) — a toggle with a
         trailing switch, reusing the switch styling above. */
      '.wch-filter-item .wch-switch{margin-left:auto;}',
      '.wch-filter-item.is-on .wch-switch{background:var(--primary,#2F6DF6);border-color:var(--primary,#2F6DF6);}',
      '.wch-filter-item.is-on .wch-switch::after{transform:translateX(15px);}',
      /* Pane-style header controls cluster for the broken-out module. */
      '.wch-controls{display:inline-flex;align-items:center;gap:2px;flex-shrink:0;margin-left:auto;}',
      /* ── Broken-out "own module" mode: the pane detaches from the messages
         overlay and docks as a standalone card to the LEFT of the chat (a real
         flex sibling in the modules row), no scrim, always in-flow. ── */
      '.wch-sidebar.wch-docked{position:relative;top:auto;bottom:auto;left:auto;right:auto;height:100%;max-width:none;flex:0 0 300px;display:flex;overflow:hidden;',
        'border:1px solid rgba(255,255,255,0.10);border-radius:16px;box-shadow:var(--shadow-card,0 12px 32px rgba(0,0,0,0.30));',
        'animation:wchDockIn .38s cubic-bezier(.34,1.4,.64,1) both;}',
      /* Smoothly animate the width when minimizing to / maximizing from the icon
         rail (and on width-tier / sticky changes). overflow:hidden lets the inner
         labels + icons glide in/out cleanly instead of the width snapping. Gated
         on `wch-anim` (added a frame after mount) so the initial layout applies
         instantly. The splitter drag disables this transition for its duration
         (pane-resize.js), so dragging stays instant. */
      '.wch-sidebar.wch-docked.wch-anim{transition:flex-basis .3s cubic-bezier(.4,0,.2,1),width .3s cubic-bezier(.4,0,.2,1);}',
      'html:not(.dark) .wch-sidebar.wch-docked{border-color:var(--border,rgba(0,0,0,0.08));box-shadow:var(--shadow-card,0 12px 32px rgba(20,30,60,0.12));}',
      '.wch-sidebar.wch-docked.wch-docked-hidden{display:none;}',
      '@keyframes wchDockIn{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:none}}',
      '@media (prefers-reduced-motion:reduce){.wch-sidebar.wch-docked.wch-anim{transition:none;}}',
      /* ── Icon-rail (minimized) mode ──────────────────────────────────────────
         Collapses the docked module to a slim column of icons + project folder
         glyphs, like the primary nav collapsing away its labels. The width itself
         is pinned inline (applyDockWidth); these rules strip the labels and centre
         what remains. Head padding/justify use !important to beat host pages that
         re-dress the docked head via an #id-scoped selector. Inner icon padding
         stays tight; the docked module itself still uses the sticky drawer height. */
      '.wch-sidebar.wch-rail .wch-head{padding:4px 0 0 !important;justify-content:center !important;align-items:center !important;border-bottom:0 !important;}',
      '.wch-sidebar.wch-rail .wch-head-title{display:none;}',
      '.wch-sidebar.wch-rail .wch-width-btn{display:none;}',
      /* History module width changer is permanently removed — never render it. */
      '.wch-sidebar .wch-width-btn{display:none !important;}',
      '.wch-sidebar.wch-rail .wch-controls{margin:0;}',
      '.wch-sidebar.wch-rail .wch-rail-btn{width:24px;height:24px;}',
      '.wch-sidebar.wch-rail .wch-rail-btn .material-symbols-outlined{font-size:16px !important;}',
      '.wch-sidebar.wch-rail .wch-search{display:none;}',
      '.wch-sidebar.wch-rail .wch-search-row{margin:2px auto 0;justify-content:center;}',
      '.wch-sidebar.wch-rail .wch-new{width:32px;height:32px;}',
      '.wch-sidebar.wch-rail .wch-new .material-symbols-outlined{font-size:18px;}',
      '.wch-sidebar.wch-rail .wch-list{padding:0 4px 4px;flex:1 1 auto;min-height:0;scrollbar-width:none;}',
      '.wch-sidebar.wch-rail .wch-list::-webkit-scrollbar{width:0;display:none;}',
      '.wch-sidebar.wch-rail .wch-projects{margin:0;}',
      '.wch-sidebar.wch-rail .wch-projects-head{display:none;}',
      '.wch-sidebar.wch-rail .wch-group,.wch-sidebar.wch-rail .wch-empty,.wch-sidebar.wch-rail .wch-project-empty{display:none;}',
      '.wch-sidebar.wch-rail .wch-proj-name,.wch-sidebar.wch-rail .wch-proj-count,.wch-sidebar.wch-rail .wch-proj-menu{display:none;}',
      '.wch-sidebar.wch-rail .wch-project-head{justify-content:center;padding:2px 0;gap:0;}',
      '.wch-sidebar.wch-rail .wch-proj-toggle{display:flex;width:22px;height:22px;}',
      '.wch-sidebar.wch-rail .wch-proj-toggle .material-symbols-outlined{font-size:20px;}',
      '.wch-sidebar.wch-rail .wch-project-body{padding-left:0;}',
      /* Hide the tree spine / empty-row ticks only. Nested chats still need
         ::before — that’s the rail’s forum glyph. Elbows are already gated
         behind :not(.wch-rail), so they never apply here. */
      '.wch-sidebar.wch-rail .wch-project-body::before,.wch-sidebar.wch-rail .wch-project-body > .wch-project-empty::before,.wch-sidebar.wch-rail .wch-project-body > .wch-proj-edit::before{display:none;}',
      '.wch-sidebar.wch-rail .wch-item{padding:0;margin:1px auto;width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;}',
      '.wch-sidebar.wch-rail .wch-item-title,.wch-sidebar.wch-rail .wch-item-meta,.wch-sidebar.wch-rail .wch-chat-dot,.wch-sidebar.wch-rail .wch-item-actions,.wch-sidebar.wch-rail .wch-del{display:none;}',
      '.wch-sidebar.wch-rail .wch-item::before,.wch-sidebar.wch-rail .wch-project-body > .wch-item::before{content:"forum";font-family:"Material Symbols Outlined";font-size:19px;opacity:.6;line-height:1;display:block;width:19px;height:19px;font-variation-settings:"FILL" 0,"wght" 400,"GRAD" 0,"opsz" 20;}',
      '.wch-sidebar.wch-rail .wch-item.wch-active::before{opacity:1;color:var(--primary-ink,var(--primary,#2F6DF6));}',
      /* Minimized rail: never reveal the maximized-panel hover controls (per-chat
         move/delete actions, the project three-dot menu). A rail click maximizes
         the panel instead, where those controls live. !important beats the base
         `:hover`/`:focus-within` reveal rules, which share this specificity. */
      '.wch-sidebar.wch-rail .wch-item-actions,.wch-sidebar.wch-rail .wch-del,.wch-sidebar.wch-rail .wch-proj-menu{display:none !important;}',
      /* ── Projects (chat grouping) ── */
      /* Hover actions float over the (now longer) title as a rounded cluster
         whose fill matches the panel surface, so the icons read as tidy circles
         sitting on the background rather than clashing with the text beneath. */
      '.wch-item-actions{position:absolute;top:50%;right:5px;transform:translateY(-50%);display:none;align-items:center;gap:3px;padding:3px;border-radius:999px;',
        'background:var(--card,var(--surface,#0F1830));box-shadow:0 2px 10px rgba(0,0,0,0.34);}',
      'html:not(.dark) .wch-item-actions{background:#fff;box-shadow:0 2px 10px rgba(20,30,60,0.16);}',
      '.wch-item:hover .wch-item-actions,.wch-item:focus-within .wch-item-actions{display:flex;}',
      '.wch-iact{width:26px;height:26px;border:0;border-radius:50%;background:transparent;color:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:.7;transition:background .15s ease,opacity .15s ease;}',
      '.wch-iact:hover{background:rgba(255,255,255,0.14);opacity:1;}',
      'html:not(.dark) .wch-iact:hover{background:rgba(20,40,80,0.10);opacity:1;}',
      '.wch-iact .material-symbols-outlined{font-size:16px;}',
      /* Dedicated drag handle: signals the row can be grabbed and dropped into a
         project. The whole row is already draggable, so this is the visible
         affordance — grabbing anywhere works, but this icon makes it discoverable.
         Hovering it highlights the entire row so it reads as "grab this". */
      '.wch-drag-handle{cursor:grab;}',
      '.wch-drag-handle:active{cursor:grabbing;}',
      '.wch-item:has(.wch-drag-handle:hover){background:color-mix(in srgb,var(--primary,#2F6DF6) 12%,transparent);outline:1px solid color-mix(in srgb,var(--primary,#2F6DF6) 40%,transparent);}',
      /* Projects section header + add button. */
      '.wch-projects{margin:2px 0 4px;}',
      '.wch-projects-head{display:flex;align-items:center;gap:6px;padding:12px 8px 4px 12px;}',
      '.wch-projects-title{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.5;flex:1;}',
      '.wch-proj-add{width:24px;height:24px;border:0;border-radius:50%;background:transparent;color:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:.7;}',
      '.wch-proj-add:hover{background:rgba(255,255,255,0.10);opacity:1;color:var(--primary-ink,var(--primary,#2F6DF6));}',
      'html:not(.dark) .wch-proj-add:hover{background:rgba(0,0,0,0.06);}',
      '.wch-proj-add .material-symbols-outlined{font-size:18px;}',
      /* A single project block — copied from Library's folder panel
         (.lib-fp-folder): colored folder / folder_open icon + name + count +
         hover ⋯. Nested chats indent under a straight tick tree. */
      '.wch-project{position:relative;margin:1px 0;overflow:visible;}',
      '.wch-project.wch-drop-on{background:color-mix(in srgb,var(--primary,#2F6DF6) 14%,transparent);outline:1px dashed color-mix(in srgb,var(--primary,#2F6DF6) 55%,transparent);}',
      '.wch-project-head{position:relative;z-index:2;display:flex;align-items:center;gap:6px;padding:8px 34px 8px 6px;border-radius:0;cursor:pointer;}',
      '.wch-project-head:hover,.wch-project-head:focus,.wch-project-head:focus-visible{background:transparent;outline:none;}',
      'html:not(.dark) .wch-project-head:hover{background:transparent;}',
      '.wch-proj-toggle{position:relative;z-index:3;width:22px;height:22px;flex:0 0 auto;border:0;border-radius:50%;background:var(--wch-tree-bg);color:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;}',
      '.wch-proj-toggle .material-symbols-outlined{font-size:18px;line-height:1;font-variation-settings:"FILL" 1,"wght" 400,"GRAD" 0,"opsz" 20;}',
      '.wch-proj-dot{flex:0 0 auto;width:9px;height:9px;border-radius:50%;background:currentColor;}',
      '.wch-proj-name{flex:1;min-width:0;font-size:13px;font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.wch-proj-count{flex:0 0 auto;font-size:11px;font-weight:600;opacity:.55;padding:0 4px;}',
      '.wch-proj-menu{position:absolute;top:50%;right:6px;transform:translateY(-50%);width:24px;height:24px;border:0;border-radius:50%;background:transparent;color:inherit;cursor:pointer;display:none;align-items:center;justify-content:center;opacity:.6;}',
      '.wch-project-head:hover .wch-proj-menu,.wch-project-head:focus-within .wch-proj-menu,.wch-proj-menu.is-open{display:flex;}',
      '.wch-proj-menu:hover{background:rgba(0,0,0,0.08);opacity:1;}',
      'html.dark .wch-proj-menu:hover{background:rgba(255,255,255,0.12);}',
      '.wch-proj-menu.is-open{opacity:1;box-shadow:0 0 0 2px var(--primary,#2F6DF6);}',
      '.wch-proj-menu .material-symbols-outlined{font-size:16px;}',
      /* Tree lines — a spine from the folder, plus a rounded L-elbow on every
         child. The elbow is a quarter-circle whose horizontal is measured to
         the live-dot (see layoutProjectTrees) so the line runs into that
         circle, which paints on top. Folder icons sit above the lines
         (z-index + circular --wch-tree-bg mask). */
      '.wch-project-body{position:relative;z-index:0;padding-left:22px;--wch-tree-end:16px;--wch-tree-radius:10px;}',
      '.wch-project.wch-collapsed .wch-project-body{display:none;}',
      '.wch-sidebar:not(.wch-rail) .wch-project:not(.wch-collapsed) > .wch-project-body:not(:empty)::before{content:"";position:absolute;z-index:0;left:16px;top:-11px;width:1px;height:calc(11px + var(--wch-tree-end) - var(--wch-tree-radius) + 1px);background:var(--wch-tree);pointer-events:none;}',
      '.wch-project-body > .wch-item,.wch-project-body > .wch-project-empty,.wch-project-body > .wch-proj-edit{position:relative;}',
      '.wch-sidebar:not(.wch-rail) .wch-project-body > .wch-item::before,.wch-sidebar:not(.wch-rail) .wch-project-body > .wch-project-empty::before,.wch-sidebar:not(.wch-rail) .wch-project-body > .wch-proj-edit::before{content:"";position:absolute;z-index:0;left:-6px;width:var(--wch-elbow-w,22px);height:calc(var(--wch-tree-radius) + 6px);top:calc(var(--wch-elbow-h,16px) - var(--wch-tree-radius) - 6px);border:0;border-left:1px solid var(--wch-tree);border-bottom:1px solid var(--wch-tree);border-bottom-left-radius:var(--wch-tree-radius);box-sizing:border-box;background:transparent;pointer-events:none;}',
      '.wch-project-empty{font-size:11px;opacity:.5;padding:4px 12px 8px 20px;}',
      /* Inline name editor (create + rename). */
      '.wch-proj-edit{display:flex;align-items:center;flex-wrap:wrap;gap:6px;padding:6px 8px 6px 8px;}',
      '.wch-proj-edit-input{flex:1;min-width:0;height:30px;box-sizing:border-box;padding:0 10px;border-radius:8px;font:inherit;font-size:13px;color:inherit;outline:none;background:rgba(255,255,255,0.06);border:1px solid var(--primary,#2F6DF6);}',
      'html:not(.dark) .wch-proj-edit-input{background:rgba(20,40,80,0.05);}',
      /* Dot-color palette shown while editing — picking a swatch is part of the
         rename/create flow and only sticks when the edit is saved. */
      '.wch-proj-swatches{flex-basis:100%;display:flex;align-items:center;gap:8px;padding:4px 2px 2px 17px;}',
      '.wch-proj-swatch{flex:0 0 auto;width:14px;height:14px;padding:0;border:0;border-radius:50%;background:currentColor;cursor:pointer;transition:transform .12s ease;}',
      '.wch-proj-swatch:hover{transform:scale(1.25);}',
      '.wch-proj-swatch.is-sel{outline:2px solid currentColor;outline-offset:2px;}',
      '.wch-item.wch-dragging{opacity:.45;}',
      '.wch-ungrouped{border-radius:10px;min-height:20px;}',
      '.wch-ungrouped.wch-drop-on{background:color-mix(in srgb,var(--primary,#2F6DF6) 12%,transparent);outline:1px dashed color-mix(in srgb,var(--primary,#2F6DF6) 50%,transparent);}',
      /* Floating action popover (per-chat "move to project"). */
      '.wch-pop{position:fixed;z-index:80;min-width:210px;max-width:260px;padding:6px;border-radius:12px;',
        'background:var(--card,var(--surface,#0F1830));color:var(--text,#C5CFD7);border:1px solid rgba(255,255,255,0.12);box-shadow:0 14px 38px rgba(0,0,0,0.42);}',
      'html:not(.dark) .wch-pop{background:#fff;color:#1F2733;border-color:rgba(0,0,0,0.10);box-shadow:0 14px 38px rgba(20,30,60,0.18);}',
      '.wch-pop-head{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.5;padding:6px 10px 4px;}',
      '.wch-pop-list{max-height:220px;overflow-y:auto;}',
      '.wch-pop-item{display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;border:0;border-radius:8px;background:transparent;color:inherit;cursor:pointer;font:inherit;font-size:13px;text-align:left;}',
      '.wch-pop-item:hover{background:rgba(255,255,255,0.08);}',
      'html:not(.dark) .wch-pop-item:hover{background:rgba(20,40,80,0.06);}',
      '.wch-pop-item .material-symbols-outlined{font-size:17px;opacity:.8;}',
      '.wch-pop-item .wch-proj-dot{width:9px;height:9px;}',
      '.wch-pop-item.is-current{color:var(--primary-ink,var(--primary,#2F6DF6));font-weight:600;}',
      '.wch-pop-item--danger{color:#E5484D;}',
      '.wch-pop-name{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.wch-pop-div{height:1px;margin:5px 6px;background:rgba(255,255,255,0.10);}',
      'html:not(.dark) .wch-pop-div{background:rgba(0,0,0,0.08);}',
      /* Styled hover/focus tooltip for module controls — a small dark card
         floated just above the control, matching the chat's thumbs-up/down
         (.sc-tip) tooltips. Replaces the native title bubble. */
      '.wch-tip{position:fixed;z-index:5000;pointer-events:none;max-width:240px;background:#1f2430;color:#fff;',
        'font-size:11.5px;font-weight:600;line-height:1.25;letter-spacing:0.01em;padding:5px 9px;border-radius:7px;',
        'white-space:nowrap;box-shadow:0 8px 22px rgba(0,0,0,0.30);border:1px solid rgba(255,255,255,0.08);opacity:0;',
        'transform:translate(-50%,calc(-100% - 4px)) scale(0.96);transform-origin:bottom center;',
        'transition:opacity .12s ease,transform .12s ease;}',
      '.wch-tip.is-vis{opacity:1;transform:translate(-50%,-100%) scale(1);}',
      '.wch-tip::after{content:"";position:absolute;top:100%;left:50%;transform:translateX(-50%);',
        'border:5px solid transparent;border-top-color:#1f2430;}',
      /* Icon-rail tooltip variant — styled to match a collapsed navigation
         module: a light surface card that floats to the RIGHT of the icon,
         vertically centred (not below it), with no arrow. Higher class-count
         than the base rules so it always wins. */
      '.wch-tip.wch-tip--nav{background:var(--surface,#fff);color:var(--text,#1F2733);border:1px solid var(--border,rgba(0,0,0,0.10));',
        'box-shadow:var(--shadow-card,0 8px 22px rgba(20,30,60,0.14));font-size:11px;font-weight:600;letter-spacing:0.01em;padding:5px 10px;border-radius:8px;',
        'transform:translate(-4px,-50%) scale(0.96);transform-origin:left center;}',
      '.wch-tip.wch-tip--nav.is-vis{transform:translate(0,-50%) scale(1);}',
      '.wch-tip.wch-tip--nav::after{display:none;}',
      /* ── Shared docked-module dressing + "sticky drawer" treatment ──────────
         Generic versions of the flagship pages/wiseai.html rules so ANY page
         whose chat lives in #modules-row gets the same broken-out History /
         Turns look: first-class pane dressing (surface, border, radius, serif
         masthead), the chat riding ABOVE the docked drawers, and — with the
         `modules-sticky` class on the row — the tucked-behind-the-chat sticky
         treatment. Scoped to #modules-row so other surfaces are untouched;
         pages that carry their own copies (wiseai.html) simply agree with
         these. The chat root is tagged `.wch-chat-anchor` by its host. */
      '#modules-row .wch-sidebar.wch-docked{background:var(--surface,#fff);color:var(--text,inherit);border:1px solid var(--border,rgba(0,0,0,0.08));',
        '--wch-tree-bg:var(--surface,#fff);',
        'box-shadow:var(--shadow-card,0 12px 32px rgba(20,30,60,0.12));border-radius:16px;overflow:hidden;flex-shrink:0;position:relative;z-index:1;',
        'align-self:center;height:calc(100% - 30px);}',
      '#modules-row .wch-sidebar.wch-docked .wch-head{padding:18px 14px 16px 24px;border-bottom:1px solid var(--border,rgba(0,0,0,0.08));align-items:flex-start;}',
      '#modules-row .wch-sidebar.wch-docked.wch-rail .wch-head{border-bottom:0;}',
      '#modules-row .wch-sidebar.wch-docked .wch-head-title{font-family:"WISE Digits","Noto Serif",Georgia,serif;font-weight:800;font-size:1.2rem;letter-spacing:-.01em;line-height:1.16;align-items:center;}',
      '#modules-row .wch-sidebar.wch-docked .wch-head-title .material-symbols-outlined{display:none;}',
      '#modules-row .wch-sidebar.wch-docked .wch-controls{margin-top:1px;}',
      /* The chat rides above the docked drawers so they read as tucking behind
         it. The persistent WISEcodeAI dock manages its own (higher) z-index. */
      '#modules-row > .wch-chat-anchor:not(.wiseai-dock){position:relative;z-index:3;}',
      '#modules-row.modules-sticky{position:relative;}',
      '#modules-row.modules-sticky > .wch-chat-anchor:not(.wiseai-dock){z-index:2;}',
      /* `.wch-unsticky` (set from a docked module\'s ⋯ "Sticky module" switch —
         Turns, the "What can I ask?" module, or sticky-modules.js) opts that
         one module OUT of the tuck: it keeps the free-standing card look, so
         every :not(.wch-unsticky) below is what actually performs the tuck.
         Mirrors the same guards in pages/wiseai.html\'s own copy. */
      '#modules-row.modules-sticky .wch-sidebar.wch-docked:not(.wch-unsticky){z-index:1;background:var(--surface-2,var(--surface,#fff));--wch-tree-bg:var(--surface-2,var(--surface,#fff));box-shadow:none;align-self:center;height:calc(100% - 30px);}',
      /* History (left of chat): flush + tucked under the chat\'s LEFT edge. */
      '#modules-row.modules-sticky .wch-sidebar.wch-docked:not(.wch-right):not(.wch-unsticky){margin-right:calc(-14px - var(--modules-gap, 8px));padding-right:14px;',
        'border-top-right-radius:0;border-bottom-right-radius:0;border-right:0;animation:wchStickySlideL .42s cubic-bezier(.34,1.45,.64,1) both;}',
      /* Turns (right of chat): flush + tucked under the chat\'s RIGHT edge. */
      '#modules-row.modules-sticky .wch-sidebar.wch-docked.wch-right:not(.wch-unsticky){margin-left:calc(-14px - var(--modules-gap, 8px));padding-left:14px;',
        'border-top-left-radius:0;border-bottom-left-radius:0;border-left:0;animation:wchStickySlideR .42s cubic-bezier(.34,1.45,.64,1) both;}',
      '#modules-row:has(.wa-pane.is-open) .wch-sidebar.wch-docked.wch-right,',
      '#modules-row.modules-sticky:has(.wa-pane.is-open) .wch-sidebar.wch-docked.wch-right:not(.wch-unsticky){border-left:1px solid var(--border-strong,var(--border,rgba(0,0,0,0.14)));}',
      'html.dark #modules-row:has(.wa-pane.is-open) .wch-sidebar.wch-docked.wch-right{border-left-color:rgba(255,255,255,0.16);}',
      '@keyframes wchStickySlideL{from{transform:translateX(26px);opacity:.35}to{transform:none;opacity:1}}',
      '@keyframes wchStickySlideR{from{transform:translateX(-26px);opacity:.35}to{transform:none;opacity:1}}',
      /* Docked-module popovers portal to <body>, so the module never needs
         lifting above the chat while its menu is open (this overrides the
         generic pane-resize "menu open" z-bump). */
      '#modules-row .wch-sidebar.wch-docked:has(.panel-more-btn.is-open),',
      '#modules-row .wch-sidebar.wch-docked:has(.topbar-popover:not(.hidden)){z-index:1 !important;}',
      /* Reveal / conceal: slide out from behind the chat / tuck back in. */
      '#modules-row .wch-sidebar.wch-docked.wch-dock-reveal{animation:wchDockRevealL .44s cubic-bezier(.34,1.4,.64,1) both !important;}',
      '#modules-row .wch-sidebar.wch-docked.wch-right.wch-dock-reveal{animation:wchDockRevealR .44s cubic-bezier(.34,1.4,.64,1) both !important;}',
      '#modules-row .wch-sidebar.wch-docked.wch-dock-conceal{animation:wchDockConcealL .3s cubic-bezier(.4,0,.75,.25) both !important;}',
      '#modules-row .wch-sidebar.wch-docked.wch-right.wch-dock-conceal{animation:wchDockConcealR .3s cubic-bezier(.4,0,.75,.25) both !important;}',
      '@keyframes wchDockRevealL{from{opacity:0;transform:translateX(46px) scale(.97)}to{opacity:1;transform:none}}',
      '@keyframes wchDockRevealR{from{opacity:0;transform:translateX(-46px) scale(.97)}to{opacity:1;transform:none}}',
      '@keyframes wchDockConcealL{from{opacity:1;transform:none}to{opacity:0;transform:translateX(46px) scale(.97)}}',
      '@keyframes wchDockConcealR{from{opacity:1;transform:none}to{opacity:0;transform:translateX(-46px) scale(.97)}}',
      '@media (prefers-reduced-motion:reduce){#modules-row .wch-sidebar.wch-docked{animation:none !important;}}'
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

  /* ── Styled control tooltip (shared, once) ──────────────────────────────────
     Gives every control inside a History / Turns module (both `.wch-sidebar`)
     the same dark hover/focus tooltip the chat's thumbs-up/down buttons use,
     instead of the browser's native `title` bubble. The element's `title` is
     stashed + removed while hovered (so the OS tip is suppressed) and restored
     on leave; `data-tip` is honoured too when present. */
  var TIP_SEL = '.wch-sidebar button, .wch-sidebar [role="button"], .wch-sidebar .wch-fork-badge, .wch-sidebar .wch-mcp-badge, .wch-sidebar [data-tip]';
  function initTooltip() {
    if (global.__wchTipInit) return;
    global.__wchTipInit = true;
    injectStyles();
    var tip = document.createElement('div');
    tip.className = 'wch-tip';
    tip.setAttribute('aria-hidden', 'true');
    (document.body || document.documentElement).appendChild(tip);
    var forEl = null;
    function tipText(el) {
      if (el.hasAttribute('data-tip')) return el.getAttribute('data-tip');
      if (el.hasAttribute('title')) {
        var t = el.getAttribute('title');
        el.setAttribute('data-wch-title', t);   /* stash + suppress native */
        el.removeAttribute('title');
        return t;
      }
      if (el.hasAttribute('data-wch-title')) return el.getAttribute('data-wch-title');
      return '';
    }
    function place(el, nav) {
      var r = el.getBoundingClientRect();
      if (nav) {
        /* Rail (nav) tips float to the RIGHT of the icon, vertically centred —
           matching a collapsed navigation module rather than sitting below. */
        tip.style.left = Math.round(r.right + 10) + 'px';
        tip.style.top = Math.round(r.top + r.height / 2) + 'px';
      } else {
        /* The dark module control tips sit above the control, horizontally centred. */
        tip.style.left = Math.round(r.left + r.width / 2) + 'px';
        tip.style.top = Math.round(r.top - 8) + 'px';
      }
    }
    function show(el) {
      var label = tipText(el);
      if (!label) return;
      forEl = el;
      /* Inside a minimized (icon-rail) module, wear the primary-nav tooltip look. */
      var nav = !!(el.closest && el.closest('.wch-rail'));
      tip.classList.toggle('wch-tip--nav', nav);
      tip.textContent = label;
      place(el, nav);
      void tip.offsetWidth;                     /* reflow so the enter plays */
      tip.classList.add('is-vis');
    }
    function hide() {
      if (forEl && forEl.hasAttribute('data-wch-title')) {
        forEl.setAttribute('title', forEl.getAttribute('data-wch-title'));
        forEl.removeAttribute('data-wch-title');
      }
      forEl = null;
      tip.classList.remove('is-vis');
    }
    function candidate(node) {
      return node && node.closest ? node.closest(TIP_SEL) : null;
    }
    document.addEventListener('mouseover', function (e) {
      var el = candidate(e.target);
      if (!el || el === forEl) return;
      if (!el.hasAttribute('title') && !el.hasAttribute('data-tip') && !el.hasAttribute('data-wch-title')) return;
      if (forEl) hide();
      show(el);
    });
    document.addEventListener('mouseout', function (e) {
      if (!forEl) return;
      if ((e.target === forEl || forEl.contains(e.target)) && (!e.relatedTarget || !forEl.contains(e.relatedTarget))) hide();
    });
    document.addEventListener('focusin', function (e) {
      var el = candidate(e.target);
      if (!el) return;
      if (!el.hasAttribute('title') && !el.hasAttribute('data-tip') && !el.hasAttribute('data-wch-title')) return;
      show(el);
    });
    document.addEventListener('focusout', hide);
    document.addEventListener('click', hide, true);
    document.addEventListener('dragstart', hide, true);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
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
    clone.querySelectorAll('.sc-line-meta,.msg-source-chips,.sc-reply-chips,.material-symbols-outlined,.material-symbols-rounded,.material-symbols-outlined')
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
    initTooltip();

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
    /* Optional narrower base width used while the host has the module in "sticky"
       mode (tucked behind the chat). Lets History + Turns share one equal width;
       drag-resize still overrides it as usual. */
    var stickyWidth = opts.stickyWidth || null;
    var stickyActive = false;
    /* When true the broken-out module wears pane-style header chrome (a serif
       masthead + three-dot menu + width changer) instead of the overlay's
       break-out / close buttons, so it reads like the result panes. */
    var dockedControls = opts.dockedControls === true;
    /* Optional MCP-usage filter toggle beside the search. */
    var mcpFilter = opts.mcpFilter === true;

    /* Palette new projects cycle through so each reads distinctly. Declared up
       here so normalizeProject() can use it while hydrating stored projects. */
    var PROJ_COLORS = ['#2F6DF6', '#12B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#EF4444', '#84CC16'];

    var stored = readStoreRaw();
    var items = Array.isArray(stored.items) ? stored.items : [];
    /* Projects are user-defined buckets that chats can be filed into. Each is
       { id, name, color, ts, collapsed }; a chat belongs to a project via its
       own `projectId` (null/absent = ungrouped). */
    var projects = Array.isArray(stored.projects) ? stored.projects.map(normalizeProject) : [];
    var seeded = !!stored.seeded;
    /* Seed versioning: when the host bumps `opts.seedVersion`, any origin still
       holding an older seed re-seeds to the latest on next load. This prevents
       stale History panels lingering in a browser's localStorage after the
       hardcoded seed changes. 0/undefined disables versioned re-seeding. */
    var seedVersion = (typeof opts.seedVersion === 'number') ? opts.seedVersion : 0;
    var storedSeedVersion = (typeof stored.seedV === 'number') ? stored.seedV : 0;
    var seedOutdated = seedVersion > 0 && storedSeedVersion !== seedVersion;
    /* Default to broken-out on first load when the host opts in (no stored
       preference yet), so History opens as its own module rather than an
       in-chat overlay. With pane-style docked chrome there is no control to
       merge back into the overlay, so a dockedControls host is ALWAYS docked —
       this also heals stale `docked:false` prefs written before the surface
       opted into the breakout. */
    var docked = breakout && ((dockedControls && opts.breakoutDefault === true)
      ? true
      : (stored.docked != null ? !!stored.docked : opts.breakoutDefault === true));
    var activeId = null;
    var query = '';
    var mcpOnly = false;
    var widthTier = 0;
    /* Icon-rail (minimized) mode for the docked module — collapses the module to
       a slim column of icons + project dots, like the primary nav's icon rail.
       Toggled from the module's three-dot menu; persisted per surface. */
    var railMode = !!stored.rail;
    /* Transient project-editing UI state (never persisted). */
    var editingProjectId = null;   /* project row shown as an inline name input */
    var editingItemId = null;      /* conversation row shown as an inline name input */
    var creatingProject = false;   /* the "new project" inline input is shown */
    var editingColor = null;       /* pending dot color picked while editing (applied on save) */
    var CHAT_COLOR = '#12B981';    /* default chat-dot color (matches the live pulse) */
    var pendingMoveItemId = null;  /* chat awaiting a project pick from the popover */
    /* When a new conversation is started from a project's menu, remember that
       project so the thread is auto-filed into it the moment it's first saved
       (a fresh thread has no transcript to persist yet). */
    var pendingProjectId = null;

    /* Preload a few sample conversations so the History pane reads as an
       established workspace (not an empty shell). Seeds are written on first
       mount (until the user's real threads take over), or whenever
       opts.seedVersion is bumped past the stored one — a version bump replaces
       the stored threads with the latest seed. */
    if (storageKey && Array.isArray(opts.seed) && opts.seed.length &&
        ((!seeded && !items.length) || seedOutdated)) {
      items = opts.seed.map(function (s, i) {
        return {
          id: s.id || ('seed-' + i + '-' + Math.random().toString(36).slice(2, 7)),
          title: s.title || 'Conversation',
          html: s.html || '',
          count: s.count || 0,
          ts: s.ts || (Date.now() - (i + 1) * 3600000),
          mcp: s.mcp === true,
          /* A live (currently-streaming) conversation, with the lines its answer
             is streaming through shown one at a time on the row. */
          live: s.live === true,
          color: s.color || CHAT_COLOR,
          customTitle: s.customTitle === true,
          streamLines: Array.isArray(s.streamLines) ? s.streamLines : null,
          usedIntents: Array.isArray(s.usedIntents) ? s.usedIntents.slice() : null,
          nextIntents: Array.isArray(s.nextIntents) ? s.nextIntents.slice() : null
        };
      });
      seeded = true;
      writeStore();
    }

    /* ── DOM ── */
    var scrim = document.createElement('div');
    scrim.className = 'wch-scrim';

    /* Header controls. In dockedControls mode the module now carries only the
       minimize / maximize (icon-rail) toggle — the three-dot menu has been
       removed (New conversation lives on the pill below the search, and the
       MCP-usage filter moved into the search input's filter popover). Otherwise
       the classic overlay break-out + close buttons. */
    var headControlsHtml = dockedControls
      ? '<div class="wch-controls">' +
          '<button type="button" class="panel-more-btn wch-rail-btn" aria-pressed="false" title="Minimize panel" aria-label="Minimize panel"><span class="material-symbols-outlined">chevron_left</span></button>' +
        '</div>'
      : (breakout ? '<button type="button" class="wch-dock" title="Break out as a side panel" aria-label="Break out history as a side panel"><span class="material-symbols-outlined">vertical_split</span></button>' : '') +
        '<button type="button" class="wch-close" title="Close history" aria-label="Close history"><span class="material-symbols-outlined">close</span></button>';

    /* MCP-usage filter now lives as a filter icon INSIDE the search input; a
       small popover anchored to it hosts the filter toggle(s). */
    var filterBtnHtml = mcpFilter
      ? '<button type="button" class="wch-search-filter" aria-haspopup="menu" aria-expanded="false" title="Filter conversations" aria-label="Filter conversations"><span class="material-symbols-outlined">filter_list</span></button>'
      : '';

    var sidebar = document.createElement('aside');
    sidebar.className = 'wch-sidebar' + (side === 'right' ? ' wch-right' : '');
    sidebar.setAttribute('aria-label', titleText);
    sidebar.innerHTML =
      '<div class="wch-head">' +
        '<span class="wch-head-title"><span class="material-symbols-outlined">history</span>' + esc(titleText) + '</span>' +
        headControlsHtml +
      '</div>' +
      '<div class="wch-search-row">' +
        '<div class="wch-search">' +
          '<span class="material-symbols-outlined">search</span>' +
          '<input type="text" class="wch-search-input" placeholder="Search conversations…" aria-label="Search conversations" autocomplete="off">' +
          '<button type="button" class="wch-search-clear" title="Clear search" aria-label="Clear search"><span class="material-symbols-outlined">close</span></button>' +
          filterBtnHtml +
        '</div>' +
        '<button type="button" class="wch-new" title="New conversation" aria-label="New conversation"><span class="material-symbols-outlined">chat_add_on</span></button>' +
      '</div>' +
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
      if (text.length > 90) text = text.slice(0, 89).trim() + '…';
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
        return { id: it.id, title: it.title, html: it.html, count: it.count, ts: it.ts, fork: it.fork || null, mcp: it.mcp === true, projectId: it.projectId || null, live: it.live === true, color: it.color || CHAT_COLOR, customTitle: it.customTitle === true, streamLines: Array.isArray(it.streamLines) ? it.streamLines : null, usedIntents: Array.isArray(it.usedIntents) ? it.usedIntents : null, nextIntents: Array.isArray(it.nextIntents) ? it.nextIntents : null };
      });
      var cleanProjects = projects.map(function (p) {
        return { id: p.id, name: p.name, color: p.color, ts: p.ts, collapsed: p.collapsed === true };
      });
      try { localStorage.setItem(storageKey, JSON.stringify({ v: 1, seedV: seedVersion, items: clean, projects: cleanProjects, seeded: seeded, docked: docked, rail: railMode })); } catch (_) {}
    }

    /* ── Projects (chat grouping) — full CRUD ── */
    function normalizeProject(p) {
      p = p || {};
      return {
        id: p.id || genId('p'),
        name: (p.name || 'Untitled project').toString(),
        color: p.color || PROJ_COLORS[0],
        ts: p.ts || Date.now(),
        collapsed: p.collapsed === true
      };
    }
    function genId(prefix) {
      return (prefix || 'id') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }
    function findProject(id) {
      for (var i = 0; i < projects.length; i++) { if (projects[i].id === id) return projects[i]; }
      return null;
    }
    function projectItems(id) {
      return items.filter(function (it) { return it.projectId === id; });
    }
    /* CREATE — a fresh project. `color` auto-cycles through the palette so new
       projects read distinctly. Returns the created project. */
    function createProject(name, color) {
      var proj = normalizeProject({
        name: (name || '').trim() || 'New project',
        color: color || PROJ_COLORS[projects.length % PROJ_COLORS.length]
      });
      projects.unshift(proj);
      writeStore();
      return proj;
    }
    /* UPDATE — rename (and optionally recolor). No-op if the project is gone. */
    function renameProject(id, name, color) {
      var proj = findProject(id);
      if (!proj) return;
      var next = (name || '').trim();
      if (next) proj.name = next;
      if (color) proj.color = color;
      writeStore();
    }
    /* DELETE — remove the project; its chats fall back to ungrouped (never
       destroyed, so grouping is a safe, reversible organisation layer). */
    function deleteProject(id) {
      projects = projects.filter(function (p) { return p.id !== id; });
      items.forEach(function (it) { if (it.projectId === id) it.projectId = null; });
      if (editingProjectId === id) editingProjectId = null;
      writeStore();
      render();
    }
    function toggleProjectCollapse(id) {
      var proj = findProject(id);
      if (!proj) return;
      proj.collapsed = !proj.collapsed;
      writeStore();
      render();
    }
    /* Assign a chat to a project (projId=null removes it from any project). */
    function moveToProject(itemId, projId) {
      var it = null;
      for (var i = 0; i < items.length; i++) { if (items[i].id === itemId) { it = items[i]; break; } }
      if (!it) return;
      it.projectId = projId || null;
      /* Un-collapse the destination so the moved chat is visible right away. */
      if (projId) { var p = findProject(projId); if (p) p.collapsed = false; }
      writeStore();
      render();
    }

    /* ── Public actions ── */
    /* Save the current transcript into history. No-op on an empty thread or when
       nothing has changed since the last save. Updates the active thread in place
       (so editing a restored conversation doesn't spawn a duplicate). */
    function applyMeta(item) {
      if (!item || typeof opts.getMeta !== 'function') return item;
      var extra = null;
      try { extra = opts.getMeta(); } catch (_) { extra = null; }
      if (!extra || typeof extra !== 'object') return item;
      if (Array.isArray(extra.usedIntents)) item.usedIntents = extra.usedIntents.slice();
      if (Array.isArray(extra.nextIntents)) item.nextIntents = extra.nextIntents.slice();
      return item;
    }

    function saveCurrent() {
      var html = getHTML();
      var count = countMessages();
      if (!html || count === 0) return null;

      if (activeId) {
        var existing = null;
        for (var i = 0; i < items.length; i++) { if (items[i].id === activeId) { existing = items[i]; break; } }
        if (existing) {
          if (existing.html === html) {
            applyMeta(existing);
            writeStore();
            return existing;
          }
          existing.html = html;
          existing._search = null; /* transcript changed → rebuild search text */
          existing.count = count;
          existing.ts = Date.now();
          if (!existing.customTitle) existing.title = deriveTitle();
          applyMeta(existing);
          items = items.filter(function (x) { return x.id !== activeId; });
          items.unshift(existing);
          writeStore();
          return existing;
        }
      }

      if (items[0] && items[0].html === html) { activeId = items[0].id; applyMeta(items[0]); writeStore(); return items[0]; }

      var item = {
        id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: deriveTitle(),
        html: html,
        count: count,
        ts: Date.now(),
        projectId: pendingProjectId || null,
        color: CHAT_COLOR
      };
      applyMeta(item);
      pendingProjectId = null;
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
        fork: data.fork || null,
        mcp: data.mcp === true,
        projectId: data.projectId || null,
        color: data.color || CHAT_COLOR,
        usedIntents: Array.isArray(data.usedIntents) ? data.usedIntents.slice() : null,
        nextIntents: Array.isArray(data.nextIntents) ? data.nextIntents.slice() : null
      };
      applyMeta(item);
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

    /* Start a fresh conversation that will be filed into `projId` as soon as it
       has content (see saveCurrent). Un-collapses the project so the new thread
       lands somewhere visible. */
    function startNewInProject(projId) {
      var p = findProject(projId);
      if (p) p.collapsed = false;
      startNew();
      pendingProjectId = projId || null;
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
      if (editingItemId === id) editingItemId = null;
      writeStore();
      render();
    }

    /* UPDATE — rename (and optionally recolor) a conversation. A custom title
       sticks across later auto-saves so streaming/new turns don't overwrite it. */
    function renameItem(id, name, color) {
      var it = findItem(id);
      if (!it) return;
      var next = (name || '').trim();
      if (next) {
        it.title = next;
        it.customTitle = true;
        it._search = null;
      }
      if (color) it.color = color;
      writeStore();
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
    /* One conversation row — draggable (drop it onto a project), with hover
       actions for "move to project" and delete. */
    function itemHtml(it, omitDay) {
      var forkBadge = it.fork
        ? '<span class="wch-fork-badge" title="Forked from ' + esc(it.fork.from || 'a conversation') + '"><span class="material-symbols-outlined">alt_route</span></span>'
        : '';
      var mcpBadge = it.mcp
        ? '<span class="wch-mcp-badge" title="Used the MCP server"><span class="material-symbols-outlined">dns</span></span>'
        : '';
      var color = it.color || CHAT_COLOR;
      var chatDot = '<span class="wch-chat-dot' + (it.live ? ' wch-live-dot' : '') + '"' + (it.live ? '' : ' style="color:' + esc(color) + '"') + ' aria-hidden="true"></span>';
      return '<div class="wch-item' + (it.id === activeId ? ' wch-active' : '') + (it.live ? ' wch-item-live' : '') + '" role="listitem" tabindex="0" draggable="true" data-wch-id="' + esc(it.id) + '"' + (railMode ? ' data-tip="' + esc(it.title) + '"' : '') + '>' +
        chatDot +
        '<div class="wch-item-title">' + forkBadge + mcpBadge + esc(it.title) + '</div>' +
        '<div class="wch-item-actions">' +
          '<button type="button" class="wch-iact wch-drag-handle" title="Drag into a project" aria-label="Drag conversation into a project" data-wch-drag="' + esc(it.id) + '"><span class="material-symbols-outlined">drag_indicator</span></button>' +
          '<button type="button" class="wch-iact" title="Rename" aria-label="Rename conversation" data-wch-rename="' + esc(it.id) + '"><span class="material-symbols-outlined">edit</span></button>' +
          '<button type="button" class="wch-iact" title="Move to project" aria-label="Move to project" data-wch-move="' + esc(it.id) + '"><span class="material-symbols-outlined">drive_file_move</span></button>' +
          '<button type="button" class="wch-iact" title="Delete" aria-label="Delete conversation" data-wch-del="' + esc(it.id) + '"><span class="material-symbols-outlined">delete_outline</span></button>' +
        '</div>' +
      '</div>';
    }

    /* Inline name + color editor for a conversation — same row language as
       renaming a project (dot + input + swatches). */
    function itemEditRowHtml(it) {
      var cur = editingColor || it.color || CHAT_COLOR;
      var swatches = '';
      PROJ_COLORS.forEach(function (c) {
        swatches += '<button type="button" class="wch-proj-swatch' + (c === cur ? ' is-sel' : '') + '" data-proj-swatch="' + esc(c) + '" style="color:' + esc(c) + '" title="Chat color" aria-label="Set chat color"></button>';
      });
      return '<div class="wch-proj-edit" data-item-edit="' + esc(it.id) + '">' +
        '<span class="wch-proj-dot" style="color:' + esc(cur) + '"></span>' +
        '<input type="text" class="wch-proj-edit-input" maxlength="60" placeholder="Conversation name…" value="' + esc(it.title || '') + '">' +
        '<div class="wch-proj-swatches">' + swatches + '</div>' +
      '</div>';
    }

    /* Inline name editor used for both creating and renaming a project. Renaming
       also covers the dot color: a palette row lets the user recolor as part of
       the same edit, committed together with the name. */
    function projEditRowHtml(name, id) {
      var cur = editingColor || (findProject(id) || {}).color || PROJ_COLORS[projects.length % PROJ_COLORS.length];
      var swatches = '';
      PROJ_COLORS.forEach(function (c) {
        swatches += '<button type="button" class="wch-proj-swatch' + (c === cur ? ' is-sel' : '') + '" data-proj-swatch="' + esc(c) + '" style="color:' + esc(c) + '" title="Project color" aria-label="Set project color"></button>';
      });
      return '<div class="wch-proj-edit" data-proj-edit="' + esc(id || 'new') + '">' +
        '<span class="wch-proj-dot" style="color:' + esc(cur) + '"></span>' +
        '<input type="text" class="wch-proj-edit-input" maxlength="60" placeholder="Project name…" value="' + esc(name || '') + '">' +
        '<div class="wch-proj-swatches">' + swatches + '</div>' +
      '</div>';
    }

    /* Size each project’s spine and elbows. The horizontal is measured to the
       live-dot’s center (falling back to the title) so it runs into that
       circle; the last child’s L-elbow uses the same Y for its rounded corner. */
    function layoutProjectTrees() {
      if (railMode) return;
      listEl.querySelectorAll('.wch-project-body').forEach(function (body) {
        var kids = body.children;
        var i;
        for (i = 0; i < kids.length; i++) {
          var el = kids[i];
          var target = el.querySelector('.wch-chat-dot') || el.querySelector('.wch-proj-dot') || el.querySelector('.wch-item-title');
          if (!target) continue;
          var elRect = el.getBoundingClientRect();
          var tRect = target.getBoundingClientRect();
          if (!elRect.height || !tRect.height) continue;
          var y = tRect.top + tRect.height / 2 - elRect.top;
          /* Run the stroke to the far side of the live-dot so it reads as going
             into the circle; the opaque dot paints over the last pixels. */
          var w = tRect.left + tRect.width - 1 - (elRect.left - 6);
          if (y > 4) el.style.setProperty('--wch-elbow-h', Math.round(y) + 'px');
          if (w > 10) el.style.setProperty('--wch-elbow-w', Math.round(w) + 'px');
        }
        var last = body.lastElementChild;
        if (!last) return;
        var elbow = parseFloat(getComputedStyle(last).getPropertyValue('--wch-elbow-h'));
        if (!elbow) elbow = Math.max(1, Math.round(last.offsetHeight / 2));
        body.style.setProperty('--wch-tree-end', (last.offsetTop + elbow) + 'px');
      });
    }

    function render() {
      var q = query.trim().toLowerCase();
      var filtering = !!(q || mcpOnly);
      function matches(it) {
        if (mcpOnly && it.mcp !== true) return false;
        if (q && itemText(it).indexOf(q) === -1) return false;
        return true;
      }

      var html = '';

      /* ── Projects section (always present so projects can be created even on an
         empty history) ── */
      html += '<div class="wch-projects">' +
        '<div class="wch-projects-head">' +
          '<span class="wch-projects-title">Projects</span>' +
          '<button type="button" class="wch-proj-add" title="New project" aria-label="New project"><span class="material-symbols-outlined">create_new_folder</span></button>' +
        '</div>';
      if (creatingProject) html += projEditRowHtml('', 'new');
      projects.forEach(function (p) {
        var kids = items.filter(function (it) { return it.projectId === p.id; });
        var visKids = kids.filter(matches);
        /* While filtering, hide projects with no matching chats (unless it's the
           one being renamed). Filtered view is always expanded for discovery. */
        if (filtering && !visKids.length && editingProjectId !== p.id) return;
        var collapsed = p.collapsed && !filtering;
        html += '<div class="wch-project' + (collapsed ? ' wch-collapsed' : '') + '" data-proj-id="' + esc(p.id) + '">';
        if (editingProjectId === p.id) {
          html += projEditRowHtml(p.name, p.id);
        } else {
          html += '<div class="wch-project-head" data-proj-head="' + esc(p.id) + '" role="button" tabindex="0" aria-expanded="' + (collapsed ? 'false' : 'true') + '"' + (railMode ? ' data-tip="' + esc(p.name) + '"' : '') + '>' +
            '<button type="button" class="wch-proj-toggle" data-proj-toggle="' + esc(p.id) + '" tabindex="-1" aria-label="Expand or collapse project" style="color:' + esc(p.color) + '"><span class="material-symbols-outlined">' + (collapsed ? 'folder' : 'folder_open') + '</span></button>' +
            '<span class="wch-proj-name">' + esc(p.name) + '</span>' +
            '<span class="wch-proj-count">' + kids.length + '</span>' +
            '<button type="button" class="wch-proj-menu" data-proj-menu="' + esc(p.id) + '" title="Project options" aria-label="Project options"><span class="material-symbols-outlined">more_horiz</span></button>' +
          '</div>';
        }
        html += '<div class="wch-project-body" data-proj-body="' + esc(p.id) + '">';
        var show = filtering ? visKids : kids;
        if (!show.length) {
          html += '<div class="wch-project-empty">' + (filtering ? 'No matches here.' : 'Empty — drag a chat here, or use a chat’s move button.') + '</div>';
        } else {
          show.forEach(function (it) { html += (editingItemId === it.id && !railMode) ? itemEditRowHtml(it) : itemHtml(it); });
        }
        html += '</div></div>';
      });
      html += '</div>';

      /* ── Ungrouped conversations (day-grouped, as before) ── */
      var ungrouped = items.filter(function (it) { return !it.projectId && matches(it); });
      var ungroupedHtml = '';
      var lastGroup = null;
      ungrouped.forEach(function (it) {
        var g = dayLabel(it.ts);
        if (g !== lastGroup) { ungroupedHtml += '<div class="wch-group">' + esc(g) + '</div>'; lastGroup = g; }
        ungroupedHtml += (editingItemId === it.id && !railMode) ? itemEditRowHtml(it) : itemHtml(it, true);
      });

      if (!items.length) {
        ungroupedHtml = '<div class="wch-empty">No saved conversations yet.<br>Start chatting, then use “New conversation” to file this one here.</div>';
      } else if (filtering && !items.some(matches)) {
        var why = mcpOnly && !q
          ? 'No conversations used the MCP server.'
          : mcpOnly
            ? 'No MCP-server conversations match “' + esc(query.trim()) + '”.'
            : 'No conversations match “' + esc(query.trim()) + '”.';
        ungroupedHtml = '<div class="wch-empty">' + why + '</div>';
      }

      /* When projects exist, wrap the ungrouped list in a drop zone so a chat can
         be dragged back out of a project (dropping here clears its projectId). */
      if (projects.length && !filtering) {
        var zoneBody = items.length && !ungrouped.length
          ? '<div class="wch-group">Ungrouped</div><div class="wch-project-empty">All chats are in projects. Drop one here to ungroup it.</div>'
          : ungroupedHtml;
        html += '<div class="wch-ungrouped" data-ungrouped-zone>' + zoneBody + '</div>';
      } else {
        html += ungroupedHtml;
      }

      listEl.innerHTML = html;
      layoutProjectTrees();
      requestAnimationFrame(layoutProjectTrees);

      /* Focus any open inline name editor (create / rename). */
      var editInput = listEl.querySelector('.wch-proj-edit-input');
      if (editInput) {
        wireEditInput(editInput);
        wireEditSwatches(editInput.closest('.wch-proj-edit'));
        try { editInput.focus(); editInput.select(); } catch (_) {}
      }
    }

    function findItem(id) {
      for (var i = 0; i < items.length; i++) { if (items[i].id === id) return items[i]; }
      return null;
    }

    /* ── Row hover info card (timestamp · message count · lineage) ──────────── */
    var infoEl = null;
    var infoTimer = null;
    var infoForId = null;
    function ensureInfoEl() {
      if (infoEl) return;
      infoEl = document.createElement('div');
      infoEl.className = 'wch-info';
      infoEl.setAttribute('aria-hidden', 'true');
      (document.body || document.documentElement).appendChild(infoEl);
    }
    function infoHtml(it) {
      var when = dayLabel(it.ts) + ' · ' + timeLabel(it.ts);
      var msgs = (it.count === 1) ? '1 message' : (it.count || 0) + ' messages';
      var h = '<div class="wch-info-title">' + esc(it.title) + '</div>';
      if (it.live) {
        h += '<div class="wch-info-row is-live"><span class="material-symbols-outlined">bolt</span><span>Responding now…</span></div>';
      }
      h += '<div class="wch-info-row"><span class="material-symbols-outlined">schedule</span><span>' + esc(when) + '</span></div>';
      h += '<div class="wch-info-row"><span class="material-symbols-outlined">forum</span><span>' + esc(msgs) + '</span></div>';
      if (it.fork) {
        h += '<div class="wch-info-row"><span class="material-symbols-outlined">alt_route</span><span>Forked from ' + esc(it.fork.from || 'a conversation') + '</span></div>';
      }
      if (it.mcp) {
        h += '<div class="wch-info-row"><span class="material-symbols-outlined">dns</span><span>Used the MCP server</span></div>';
      }
      return h;
    }
    function placeInfo(row) {
      var r = row.getBoundingClientRect();
      var pw = infoEl.offsetWidth, ph = infoEl.offsetHeight, m = 8;
      var left, top;
      if (r.top - ph - 8 >= m) {
        /* Preferred: floated just above the row, left-aligned. */
        left = r.left;
        top = r.top - ph - 8;
        infoEl.style.transformOrigin = 'top left';
      } else {
        /* No room above → sit to the RIGHT of the row, vertically centred
           (never directly below, per the popover conventions). */
        left = r.right + 10;
        top = r.top + r.height / 2 - ph / 2;
        infoEl.style.transformOrigin = 'left center';
      }
      left = Math.max(m, Math.min(left, window.innerWidth - pw - m));
      top = Math.max(m, Math.min(top, window.innerHeight - ph - m));
      infoEl.style.left = Math.round(left) + 'px';
      infoEl.style.top = Math.round(top) + 'px';
    }
    function showInfo(row) {
      if (railMode || dragItemId) return;
      var id = row.getAttribute('data-wch-id');
      if (!id) return;
      var it = findItem(id);
      if (!it) return;
      ensureInfoEl();
      infoForId = id;
      infoEl.innerHTML = infoHtml(it);
      infoEl.classList.remove('is-vis');
      placeInfo(row);
      void infoEl.offsetWidth;                 /* reflow so the enter transition plays */
      infoEl.classList.add('is-vis');
    }
    function hideInfo() {
      clearTimeout(infoTimer);
      infoForId = null;
      if (infoEl) infoEl.classList.remove('is-vis');
    }
    listEl.addEventListener('mouseover', function (e) {
      var row = e.target.closest('.wch-item[data-wch-id]');
      if (!row || railMode || dragItemId) return;
      if (row.getAttribute('data-wch-id') === infoForId) return;
      clearTimeout(infoTimer);
      infoTimer = setTimeout(function () { showInfo(row); }, 240);
    });
    /* The instant the grip is pressed, drop the hover card so it does not
       sit over drop targets while the user starts dragging. */
    listEl.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button !== 0) return;
      if (e.target.closest && e.target.closest('.wch-drag-handle')) hideInfo();
    });
    listEl.addEventListener('mouseout', function (e) {
      var row = e.target.closest('.wch-item[data-wch-id]');
      if (!row) return;
      if (e.relatedTarget && row.contains(e.relatedTarget)) return;
      hideInfo();
    });
    listEl.addEventListener('scroll', hideInfo, true);
    window.addEventListener('scroll', hideInfo, true);
    window.addEventListener('resize', hideInfo);

    /* ── Inline project name editor (create + rename) ── */
    function commitEdit(input, save) {
      if (!input || input._done) return;
      input._done = true;
      var row = input.closest('.wch-proj-edit');
      var itemTarget = row ? row.getAttribute('data-item-edit') : null;
      if (itemTarget) {
        editingItemId = null;
        if (save) renameItem(itemTarget, input.value, editingColor);
        editingColor = null;
        render();
        return;
      }
      var target = row ? row.getAttribute('data-proj-edit') : 'new';
      var val = input.value;
      if (target === 'new') {
        creatingProject = false;
        if (save && val.trim()) createProject(val, editingColor);
      } else {
        editingProjectId = null;
        if (save) renameProject(target, val, editingColor);
      }
      editingColor = null;
      render();
    }
    function wireEditInput(input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); commitEdit(input, true); }
        else if (e.key === 'Escape') { e.preventDefault(); commitEdit(input, false); }
      });
      input.addEventListener('blur', function () { commitEdit(input, true); });
    }
    /* Color swatches inside the inline editor: picking one previews the dot and
       is committed together with the name. mousedown is suppressed so the pick
       doesn't blur the input (blur would save-and-close the editor). */
    function wireEditSwatches(row) {
      if (!row) return;
      var sws = row.querySelectorAll('.wch-proj-swatch');
      for (var i = 0; i < sws.length; i++) {
        sws[i].addEventListener('mousedown', function (e) { e.preventDefault(); });
        sws[i].addEventListener('click', function (e) {
          e.preventDefault(); e.stopPropagation();
          var c = this.getAttribute('data-proj-swatch');
          editingColor = c;
          var dot = row.querySelector('.wch-proj-dot');
          if (dot) dot.style.color = c;
          var all = row.querySelectorAll('.wch-proj-swatch');
          for (var j = 0; j < all.length; j++) all[j].classList.toggle('is-sel', all[j] === this);
          var inp = row.querySelector('.wch-proj-edit-input');
          if (inp) try { inp.focus(); } catch (_) {}
        });
      }
    }
    function startCreateProject() {
      closePopover();
      editingProjectId = null;
      editingItemId = null;
      creatingProject = true;
      editingColor = null;
      /* Projects live at the top of the list — make sure they're in view. */
      listEl.scrollTop = 0;
      render();
    }
    function startRenameProject(id) {
      closePopover();
      creatingProject = false;
      editingItemId = null;
      editingProjectId = id;
      editingColor = (findProject(id) || {}).color || null;
      render();
    }
    function startRenameItem(id) {
      closePopover();
      hideInfo();
      creatingProject = false;
      editingProjectId = null;
      editingItemId = id;
      editingColor = (findItem(id) || {}).color || CHAT_COLOR;
      render();
    }

    /* ── Floating popover (chat "move to project" + project options) ── */
    var popEl = null;
    function closePopover() {
      pendingMoveItemId = null;
      if (popEl) {
        /* Reset a filter trigger's expanded state when its popover closes. */
        if (popEl.__isFilter && popEl.__anchor && popEl.__anchor.setAttribute) {
          popEl.__anchor.setAttribute('aria-expanded', 'false');
        }
        if (popEl.parentNode) popEl.parentNode.removeChild(popEl);
      }
      popEl = null;
      document.removeEventListener('mousedown', onPopOutside, true);
      document.removeEventListener('keydown', onPopKey, true);
      window.removeEventListener('scroll', closePopover, true);
      window.removeEventListener('resize', closePopover, true);
    }
    /* Ignore clicks on the popover itself AND on its trigger — so tapping the
       trigger again toggles (closes) it via the trigger's own handler rather than
       this outside-close racing the reopen. */
    function onPopOutside(e) {
      if (!popEl) return;
      if (popEl.contains(e.target)) return;
      if (popEl.__anchor && popEl.__anchor.contains && popEl.__anchor.contains(e.target)) return;
      closePopover();
    }
    function onPopKey(e) { if (e.key === 'Escape') { e.stopPropagation(); closePopover(); } }
    function placePopover(anchor) {
      var r = anchor.getBoundingClientRect();
      var pw = popEl.offsetWidth, ph = popEl.offsetHeight;
      var left = Math.min(r.left, window.innerWidth - pw - 8);
      left = Math.max(8, left);
      var top = r.bottom + 6;
      if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 6);
      popEl.style.left = left + 'px';
      popEl.style.top = top + 'px';
    }
    function openPopover(html, anchor) {
      closePopover();
      hideInfo();
      popEl = document.createElement('div');
      popEl.className = 'wch-pop';
      popEl.__anchor = anchor || null;
      /* Match the host's theme (dark class lives on <html>). */
      popEl.innerHTML = html;
      document.body.appendChild(popEl);
      placePopover(anchor);
      setTimeout(function () {
        document.addEventListener('mousedown', onPopOutside, true);
        document.addEventListener('keydown', onPopKey, true);
        window.addEventListener('scroll', closePopover, true);
        window.addEventListener('resize', closePopover, true);
      }, 0);
    }
    function openMovePopover(itemId, anchor) {
      var it = null;
      for (var i = 0; i < items.length; i++) { if (items[i].id === itemId) { it = items[i]; break; } }
      if (!it) return;
      var h = '<div class="wch-pop-head">Move to project</div><div class="wch-pop-list">';
      if (!projects.length) {
        h += '<div class="wch-pop-head" style="opacity:.5;font-weight:400;text-transform:none;letter-spacing:0">No projects yet.</div>';
      }
      projects.forEach(function (p) {
        var cur = it.projectId === p.id;
        h += '<button type="button" class="wch-pop-item' + (cur ? ' is-current' : '') + '" data-move="' + esc(p.id) + '">' +
          '<span class="wch-proj-dot" style="color:' + esc(p.color) + '"></span>' +
          '<span class="wch-pop-name">' + esc(p.name) + '</span>' +
          (cur ? '<span class="material-symbols-outlined">check</span>' : '') +
        '</button>';
      });
      if (it.projectId) {
        h += '<button type="button" class="wch-pop-item" data-move="">' +
          '<span class="material-symbols-outlined">remove_circle_outline</span><span class="wch-pop-name">Remove from project</span></button>';
      }
      h += '</div><div class="wch-pop-div"></div>' +
        '<button type="button" class="wch-pop-item" data-move-new><span class="material-symbols-outlined">create_new_folder</span><span class="wch-pop-name">New project…</span></button>';
      openPopover(h, anchor);
      /* Set AFTER openPopover — it calls closePopover() first, which would
         otherwise clear the chat we're about to file. */
      pendingMoveItemId = itemId;
    }
    function openProjectPopover(projId, anchor) {
      var p = findProject(projId);
      if (!p) return;
      var h = '<div class="wch-pop-head">' + esc(p.name) + '</div>' +
        '<button type="button" class="wch-pop-item" data-pmenu="new" data-pid="' + esc(projId) + '"><span class="material-symbols-outlined">chat_add_on</span><span class="wch-pop-name">New conversation</span></button>' +
        '<div class="wch-pop-div"></div>' +
        '<button type="button" class="wch-pop-item" data-pmenu="rename" data-pid="' + esc(projId) + '"><span class="material-symbols-outlined">edit</span><span class="wch-pop-name">Rename</span></button>' +
        '<button type="button" class="wch-pop-item" data-pmenu="collapse" data-pid="' + esc(projId) + '"><span class="material-symbols-outlined">' + (p.collapsed ? 'unfold_more' : 'unfold_less') + '</span><span class="wch-pop-name">' + (p.collapsed ? 'Expand' : 'Collapse') + '</span></button>' +
        '<div class="wch-pop-div"></div>' +
        '<button type="button" class="wch-pop-item wch-pop-item--danger" data-pmenu="delete" data-pid="' + esc(projId) + '"><span class="material-symbols-outlined">delete_outline</span><span class="wch-pop-name">Delete project</span></button>';
      openPopover(h, anchor);
    }
    /* ── Filter popover (opened from the search input's filter icon) ──
       Hosts the conversation filters. Today that's the single MCP-usage toggle
       ("used the MCP server"); more can slot in as additional switch rows. */
    function openFilterPopover(anchor) {
      var h = '<div class="wch-pop-head">Filter conversations</div>' +
        '<button type="button" class="wch-pop-item wch-filter-item' + (mcpOnly ? ' is-on' : '') + '" data-filter="mcp" role="menuitemcheckbox" aria-checked="' + (mcpOnly ? 'true' : 'false') + '">' +
          '<span class="material-symbols-outlined">dns</span>' +
          '<span class="wch-pop-name">Used the MCP server</span>' +
          '<span class="wch-switch" aria-hidden="true"></span>' +
        '</button>';
      openPopover(h, anchor);
      popEl.__isFilter = true;
    }
    function toggleFilterPopover(anchor) {
      if (popEl && popEl.__isFilter) { closePopover(); return; }
      openFilterPopover(anchor);
    }

    /* Icon-rail: a conversation is just an icon, so its hover actions (open /
       move / delete) move into a click popover anchored to that icon. Reuses the
       shared move-to-project routing (via pendingMoveItemId). */
    function openItemPopover(itemId, anchor) {
      var it = null;
      for (var i = 0; i < items.length; i++) { if (items[i].id === itemId) { it = items[i]; break; } }
      if (!it) return;
      var h = '<div class="wch-pop-head">' + esc(it.title) + '</div>' +
        '<button type="button" class="wch-pop-item" data-open-chat="' + esc(itemId) + '"><span class="material-symbols-outlined">forum</span><span class="wch-pop-name">Open conversation</span></button>' +
        '<button type="button" class="wch-pop-item" data-rename-chat="' + esc(itemId) + '"><span class="material-symbols-outlined">edit</span><span class="wch-pop-name">Rename</span></button>' +
        '<div class="wch-pop-div"></div>' +
        '<div class="wch-pop-head">Move to project</div><div class="wch-pop-list">';
      if (!projects.length) {
        h += '<div class="wch-pop-head" style="opacity:.5;font-weight:400;text-transform:none;letter-spacing:0">No projects yet.</div>';
      }
      projects.forEach(function (p) {
        var cur = it.projectId === p.id;
        h += '<button type="button" class="wch-pop-item' + (cur ? ' is-current' : '') + '" data-move="' + esc(p.id) + '">' +
          '<span class="wch-proj-dot" style="color:' + esc(p.color) + '"></span>' +
          '<span class="wch-pop-name">' + esc(p.name) + '</span>' +
          (cur ? '<span class="material-symbols-outlined">check</span>' : '') +
        '</button>';
      });
      if (it.projectId) {
        h += '<button type="button" class="wch-pop-item" data-move="">' +
          '<span class="material-symbols-outlined">remove_circle_outline</span><span class="wch-pop-name">Remove from project</span></button>';
      }
      h += '</div>' +
        '<button type="button" class="wch-pop-item" data-move-new><span class="material-symbols-outlined">create_new_folder</span><span class="wch-pop-name">New project…</span></button>' +
        '<div class="wch-pop-div"></div>' +
        '<button type="button" class="wch-pop-item wch-pop-item--danger" data-del-chat="' + esc(itemId) + '"><span class="material-symbols-outlined">delete_outline</span><span class="wch-pop-name">Delete conversation</span></button>';
      openPopover(h, anchor);
      /* Set AFTER openPopover (it calls closePopover first). */
      pendingMoveItemId = itemId;
    }
    /* Popover click routing (single listener; popEl is recreated per open). */
    document.addEventListener('click', function (e) {
      if (!popEl || !popEl.contains(e.target)) return;
      /* Filter toggles flip in place and keep the popover open so their switch
         state stays visible (matching the old in-menu MCP toggle behaviour). */
      var ft = e.target.closest('[data-filter]');
      if (ft) {
        e.preventDefault(); e.stopPropagation();
        if (ft.getAttribute('data-filter') === 'mcp') setMcpOnly(!mcpOnly);
        return;
      }
      var oc = e.target.closest('[data-open-chat]');
      if (oc) { e.preventDefault(); var ocId = oc.getAttribute('data-open-chat'); closePopover(); restore(ocId); return; }
      var rc = e.target.closest('[data-rename-chat]');
      if (rc) { e.preventDefault(); var rcId = rc.getAttribute('data-rename-chat'); closePopover(); startRenameItem(rcId); return; }
      var dc = e.target.closest('[data-del-chat]');
      if (dc) { e.preventDefault(); var dcId = dc.getAttribute('data-del-chat'); closePopover(); remove(dcId); return; }
      var mv = e.target.closest('[data-move]');
      if (mv && popEl.contains(mv)) {
        e.preventDefault();
        var id = pendingMoveItemId;
        var pid = mv.getAttribute('data-move');
        closePopover();
        if (id) moveToProject(id, pid || null);
        return;
      }
      if (e.target.closest('[data-move-new]')) {
        e.preventDefault();
        var mid = pendingMoveItemId;
        closePopover();
        var proj = createProject('');
        if (mid) moveToProject(mid, proj.id);
        startRenameProject(proj.id);
        return;
      }
      var pm = e.target.closest('[data-pmenu]');
      if (pm) {
        e.preventDefault();
        var act = pm.getAttribute('data-pmenu');
        var pid2 = pm.getAttribute('data-pid');
        closePopover();
        if (act === 'new') startNewInProject(pid2);
        else if (act === 'rename') startRenameProject(pid2);
        else if (act === 'collapse') toggleProjectCollapse(pid2);
        else if (act === 'delete') deleteProject(pid2);
      }
    });

    /* ── Drag & drop: file a chat into a project (or back to ungrouped) ── */
    var dragItemId = null;
    function clearDropHints() {
      listEl.querySelectorAll('.wch-drop-on').forEach(function (n) { n.classList.remove('wch-drop-on'); });
    }
    listEl.addEventListener('dragstart', function (e) {
      /* No chat drag-to-file while the module is minimized to its icon rail —
         a rail click maximizes the panel instead. */
      if (railMode) { e.preventDefault(); return; }
      var item = e.target.closest('.wch-item');
      if (!item) return;
      hideInfo();
      dragItemId = item.getAttribute('data-wch-id');
      item.classList.add('wch-dragging');
      try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragItemId); } catch (_) {}
    });
    listEl.addEventListener('dragend', function () {
      dragItemId = null;
      clearDropHints();
      listEl.querySelectorAll('.wch-dragging').forEach(function (n) { n.classList.remove('wch-dragging'); });
    });
    listEl.addEventListener('dragover', function (e) {
      if (!dragItemId) return;
      var proj = e.target.closest('.wch-project');
      var zone = e.target.closest('[data-ungrouped-zone]');
      if (!proj && !zone) return;
      e.preventDefault();
      try { e.dataTransfer.dropEffect = 'move'; } catch (_) {}
      clearDropHints();
      (proj || zone).classList.add('wch-drop-on');
    });
    listEl.addEventListener('dragleave', function (e) {
      var t = e.target.closest('.wch-project, [data-ungrouped-zone]');
      if (t && !t.contains(e.relatedTarget)) t.classList.remove('wch-drop-on');
    });
    listEl.addEventListener('drop', function (e) {
      if (!dragItemId) return;
      var proj = e.target.closest('.wch-project');
      var zone = e.target.closest('[data-ungrouped-zone]');
      if (!proj && !zone) return;
      e.preventDefault();
      var id = dragItemId;
      dragItemId = null;
      clearDropHints();
      moveToProject(id, proj ? proj.getAttribute('data-proj-id') : null);
    });

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
    var concealTimer = null;
    var revealTimer = null;
    function isOpen() { return sidebar.classList.contains('wch-open'); }
    /* ── Docked reveal / conceal ──
       A docked module sits a layer below the chat, so revealing it slides it out
       from behind the chat card and concealing it tucks it back in behind before
       it's hidden. (Overlay mode keeps its own scrim slide.) */
    function revealDocked() {
      clearTimeout(concealTimer);
      clearTimeout(revealTimer);
      sidebar.classList.remove('wch-dock-conceal', 'wch-dock-reveal');
      /* Collapse the module's width to 0 while it's still hidden (no flash), then
         expand it back to its docked width using the shared `wch-anim` flex-basis /
         width transition. As it widens, the flex row reflows and the chat contracts
         smoothly in step — instead of the chat snapping narrow the instant the
         module reappears. The keyframe (opacity / tuck) rides on top. */
      sidebar.classList.add('wch-anim');
      sidebar.style.setProperty('flex', '0 0 0px', 'important');
      sidebar.style.setProperty('width', '0px', 'important');
      sidebar.classList.remove('wch-docked-hidden');
      void sidebar.offsetWidth;               /* register the collapsed start frame */
      sidebar.classList.add('wch-dock-reveal');
      applyDockWidth();                        /* animate 0 → docked width */
      revealTimer = setTimeout(function () { sidebar.classList.remove('wch-dock-reveal'); }, 480);
    }
    function concealDocked() {
      clearTimeout(concealTimer);
      sidebar.classList.remove('wch-dock-reveal');
      sidebar.classList.add('wch-anim');
      void sidebar.offsetWidth;
      sidebar.classList.add('wch-dock-conceal');
      /* Shrink the width to 0 in sync with the fade/tuck so the chat grows to fill
         the freed space over the same 0.3s, rather than staying put and then
         snapping wide the moment the module is display:none'd. */
      sidebar.style.setProperty('flex', '0 0 0px', 'important');
      sidebar.style.setProperty('width', '0px', 'important');
      concealTimer = setTimeout(function () {
        sidebar.classList.add('wch-docked-hidden');
        sidebar.classList.remove('wch-dock-conceal');
        applyDockWidth();                      /* restore docked width while hidden */
      }, 300);
    }
    function isDockedHidden() {
      return sidebar.classList.contains('wch-docked-hidden') || sidebar.classList.contains('wch-dock-conceal');
    }
    function open() {
      /* Broken-out mode is a persistent module, not an overlay — "open" re-renders
         it (so it reflects the latest threads) and slides it out from behind the
         chat. No scrim, no overlay slide. */
      if (docked) { render(); revealDocked(); return; }
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
        if (isDockedHidden()) open();
        else concealDocked();
        return;
      }
      if (isOpen()) close(); else open();
    }
    /* The header × button: tuck the module back behind the chat when broken out,
       else close the overlay. */
    function onCloseBtn() {
      if (docked) { concealDocked(); return; }
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
      var icon = dockBtn.querySelector('.material-symbols-outlined');
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
        sidebar.classList.add('wch-docked');
        if (dockedControls) applyDockWidth();
        else { sidebar.style.flex = '0 0 ' + breakoutWidth + 'px'; sidebar.style.width = breakoutWidth + 'px'; }
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

    /* ── Width changer (docked module) — the canonical four-step cycle
       (single → double → triple → fill), identical to every other module. ── */
    var WCH_W_ICONS = ['width_normal', 'width_wide', 'width_full', 'width_full'];
    var WCH_W_TITLES = ['Width (single) — tap to widen', 'Width (double) — tap to widen', 'Width (triple) — tap to widen', 'Width (fill) — tap to reset'];
    /* Slim column width used while the module is minimized to its icon rail. */
    var RAIL_W = 66;
    function applyDockWidth() {
      /* Icon-rail mode pins a fixed slim width, ignoring the width tiers. */
      if (railMode) {
        try { global.WisePaneResize && global.WisePaneResize.release && global.WisePaneResize.release([sidebar]); } catch (_) {}
        sidebar.style.setProperty('flex', '0 0 ' + RAIL_W + 'px', 'important');
        sidebar.style.setProperty('width', RAIL_W + 'px', 'important');
        sidebar.style.setProperty('min-width', '0', 'important');
        sidebar.style.setProperty('max-width', 'none', 'important');
        return;
      }
      /* In sticky mode the base narrows to stickyWidth (shared with Turns so the
         two read as an equal pair); tiers scale from whichever base is active. */
      var baseW = (stickyActive && stickyWidth) ? stickyWidth : breakoutWidth;
      var tiers = [baseW, Math.round(baseW * 1.5), baseW * 2];
      /* Release any drag-pinned width so the preset wins (mirrors how the panes'
         width buttons stand down the resize splitter). */
      try { global.WisePaneResize && global.WisePaneResize.release && global.WisePaneResize.release([sidebar]); } catch (_) {}
      if (widthTier >= 3) {
        /* Fill — grow to take the rest of the row instead of a fixed column. */
        sidebar.style.setProperty('flex', '1000 1 auto', 'important');
        sidebar.style.setProperty('width', 'auto', 'important');
        sidebar.style.setProperty('min-width', (stickyActive && stickyWidth) ? (stickyWidth + 'px') : '0', 'important');
        sidebar.style.setProperty('max-width', 'none', 'important');
      } else {
        var w = tiers[widthTier] || baseW;
        sidebar.style.setProperty('flex', '0 0 ' + w + 'px', 'important');
        sidebar.style.setProperty('width', w + 'px', 'important');
        /* While sticky, hold stickyWidth (240) as a hard minimum floor so the
           module never renders — or drag-resizes — narrower than that; the width
           beyond the floor stays flexible (tiers + the resize splitter). */
        sidebar.style.setProperty('min-width', (stickyActive && stickyWidth) ? (stickyWidth + 'px') : '0', 'important');
        sidebar.style.setProperty('max-width', 'none', 'important');
      }
      var btn = sidebar.querySelector('.wch-width-btn');
      if (btn) {
        btn.classList.toggle('is-on', widthTier >= 1);
        btn.setAttribute('aria-pressed', widthTier >= 1 ? 'true' : 'false');
        btn.title = WCH_W_TITLES[widthTier];
        var ic = btn.querySelector('.material-symbols-outlined');
        if (ic) ic.textContent = WCH_W_ICONS[widthTier];
      }
    }
    function cycleWidth() { widthTier = (widthTier + 1) % 4; applyDockWidth(); }
    /* ── Icon-rail (minimize) toggle ── */
    function updateRailItem() {
      /* The minimize/maximize toggle now lives as its own icon in the head. */
      var btn = sidebar.querySelector('.wch-rail-btn');
      if (!btn) return;
      var ic = btn.querySelector('.material-symbols-outlined');
      /* Match the primary navigation module's collapse toggle: chevron_left to
         minimize (collapse toward the edge), chevron_right to maximize. */
      if (ic) ic.textContent = railMode ? 'chevron_right' : 'chevron_left';
      var label = railMode ? 'Maximize panel' : 'Minimize panel';
      btn.title = label;
      btn.setAttribute('aria-label', label);
      btn.setAttribute('aria-pressed', railMode ? 'true' : 'false');
      /* The shared tooltip stashes title→data-wch-title while hovered; keep it in
         sync so a toggle mid-hover doesn't show the stale caption. */
      if (btn.hasAttribute('data-wch-title')) btn.setAttribute('data-wch-title', label);
    }
    function setRail(on) {
      railMode = !!on;
      sidebar.classList.toggle('wch-rail', railMode);
      /* Lock the module's drag-resize while minimized — the icon rail is a fixed
         slim column, so pane-resize.js should not offer a splitter on its seam. */
      if (railMode) sidebar.setAttribute('data-pr-lock', '');
      else sidebar.removeAttribute('data-pr-lock');
      if (docked && dockedControls) applyDockWidth();
      /* The "+" new-conversation button is icon-only in the rail — give it a
         tooltip label there (and drop it when expanded, where the pill reads its
         own caption). */
      var newBtn = sidebar.querySelector('.wch-new');
      if (newBtn) {
        if (railMode) newBtn.setAttribute('data-tip', 'New conversation');
        else newBtn.removeAttribute('data-tip');
      }
      updateRailItem();
      render();               /* re-render so item/project rail labels attach */
      writeStore();
    }
    /* Host toggles this when it tucks the docked module in behind the chat. */
    function setSticky(on) {
      stickyActive = !!on;
      if (!docked) return;
      if (dockedControls) { applyDockWidth(); return; }
      var w = (stickyActive && stickyWidth) ? stickyWidth : breakoutWidth;
      try { global.WisePaneResize && global.WisePaneResize.release && global.WisePaneResize.release([sidebar]); } catch (_) {}
      sidebar.style.setProperty('flex', '0 0 ' + w + 'px', 'important');
      sidebar.style.setProperty('width', w + 'px', 'important');
      /* Sticky keeps stickyWidth (240) as a hard minimum floor; the rest stays
         flexible via drag-resize. */
      sidebar.style.setProperty('min-width', (stickyActive && stickyWidth) ? (stickyWidth + 'px') : '0', 'important');
    }

    /* ── MCP-usage filter toggle ── */
    function setMcpOnly(on) {
      mcpOnly = !!on;
      /* Legacy standalone pill (classic overlay mode), if present. */
      var btn = sidebar.querySelector('.wch-mcp');
      if (btn) {
        btn.classList.toggle('is-on', mcpOnly);
        btn.setAttribute('aria-pressed', mcpOnly ? 'true' : 'false');
      }
      /* The search input's filter icon lights up while any filter is active. */
      var fbtn = sidebar.querySelector('.wch-search-filter');
      if (fbtn) {
        fbtn.classList.toggle('is-on', mcpOnly);
        fbtn.setAttribute('aria-pressed', mcpOnly ? 'true' : 'false');
      }
      /* The filter popover row (portaled to <body>), while it's open. */
      var fitem = popEl ? popEl.querySelector('.wch-filter-item[data-filter="mcp"]') : null;
      if (fitem) {
        fitem.classList.toggle('is-on', mcpOnly);
        fitem.setAttribute('aria-checked', mcpOnly ? 'true' : 'false');
      }
      render();
    }

    /* ── Events ── */
    var dockBtn = breakout ? sidebar.querySelector('.wch-dock') : null;
    var closeBtn = sidebar.querySelector('.wch-close');
    var widthBtn = sidebar.querySelector('.wch-width-btn');
    var railBtn = sidebar.querySelector('.wch-rail-btn');
    var mcpBtn = sidebar.querySelector('.wch-mcp');
    var filterBtn = sidebar.querySelector('.wch-search-filter');
    scrim.addEventListener('click', close);
    if (closeBtn) closeBtn.addEventListener('click', onCloseBtn);
    if (dockBtn) dockBtn.addEventListener('click', function () { setDocked(!docked); });
    if (railBtn) railBtn.addEventListener('click', function (e) { e.stopPropagation(); setRail(!railMode); });
    if (widthBtn) widthBtn.addEventListener('click', function (e) { e.stopPropagation(); cycleWidth(); });
    if (mcpBtn) mcpBtn.addEventListener('click', function (e) { e.stopPropagation(); setMcpOnly(!mcpOnly); });
    if (filterBtn) filterBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !(popEl && popEl.__isFilter);
      toggleFilterPopover(filterBtn);
      filterBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    sidebar.querySelector('.wch-new').addEventListener('click', startNew);
    if (searchInput) searchInput.addEventListener('input', function () { applyQuery(searchInput.value); });
    if (searchClear) searchClear.addEventListener('click', clearQuery);
    listEl.addEventListener('click', function (e) {
      /* Icon-rail: everything is collapsed to an icon, so clicking a project
         folder or a conversation icon opens a popover with the actions (rename/delete,
         open/move/delete) rather than the inline hover controls. */
      if (railMode) {
        /* Minimized: a click anywhere on the rail simply MAXIMIZES the panel —
           the user then works with the full controls inside the expanded module.
           (No inline popovers while minimized.) */
        if (e.target.closest('.wch-proj-edit')) return;
        e.stopPropagation();
        setRail(false);
        return;
      }
      /* New project */
      if (e.target.closest('.wch-proj-add')) { e.stopPropagation(); startCreateProject(); return; }
      /* Project options menu */
      var pMenu = e.target.closest('[data-proj-menu]');
      if (pMenu) { e.stopPropagation(); openProjectPopover(pMenu.getAttribute('data-proj-menu'), pMenu); return; }
      /* Expand / collapse a project (toggle button or clicking the header) */
      var pToggle = e.target.closest('[data-proj-toggle]');
      if (pToggle) { e.stopPropagation(); toggleProjectCollapse(pToggle.getAttribute('data-proj-toggle')); return; }
      var pHead = e.target.closest('[data-proj-head]');
      if (pHead) { toggleProjectCollapse(pHead.getAttribute('data-proj-head')); return; }
      /* Ignore clicks inside the inline name editor. */
      if (e.target.closest('.wch-proj-edit')) return;
      /* The drag handle is a drag affordance only — a plain click on it should
         not open/restore the conversation. */
      if (e.target.closest('[data-wch-drag]')) { e.stopPropagation(); return; }
      /* Rename + recolor a chat (same inline editor as folders) */
      var rn = e.target.closest('[data-wch-rename]');
      if (rn) { e.stopPropagation(); startRenameItem(rn.getAttribute('data-wch-rename')); return; }
      /* Move a chat to a project */
      var mv = e.target.closest('[data-wch-move]');
      if (mv) { e.stopPropagation(); openMovePopover(mv.getAttribute('data-wch-move'), mv); return; }
      /* Delete a chat */
      var del = e.target.closest('[data-wch-del]');
      if (del) { e.stopPropagation(); remove(del.getAttribute('data-wch-del')); return; }
      /* Restore a chat */
      var item = e.target.closest('[data-wch-id]');
      if (item) restore(item.getAttribute('data-wch-id'));
    });
    listEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (e.target.closest('.wch-proj-edit-input')) return;
      var pHead = e.target.closest('[data-proj-head]');
      if (pHead) { e.preventDefault(); toggleProjectCollapse(pHead.getAttribute('data-proj-head')); return; }
      var item = e.target.closest('[data-wch-id]');
      if (item) { e.preventDefault(); restore(item.getAttribute('data-wch-id')); }
    });

    render();

    /* Restore a previously broken-out module on load (the overlay is the default). */
    if (breakout && docked) { docked = false; setDocked(true); }
    else updateDockButton();

    /* Hosts that keep History as an on-demand drawer start it docked but tucked
       in behind the chat (hidden); the three-dot "History" toggle reveals it. */
    if (docked && opts.breakoutStartHidden === true) sidebar.classList.add('wch-docked-hidden');

    /* Restore the icon-rail (minimized) state, but only where it applies — the
       docked module that carries pane-style chrome. */
    if (docked && dockedControls && railMode) setRail(true);
    else if (!(docked && dockedControls)) railMode = false;

    /* Arm the width transition only AFTER the initial layout has settled (dock,
       sticky base width, and any restored minimized state are all applied above).
       Gating on `wch-anim` keeps page load instant, so the module never visibly
       animates itself open→closed on every reload — only user-driven minimize /
       maximize toggles animate. */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { sidebar.classList.add('wch-anim'); });
    });

    return {
      toggle: toggle, open: open, close: close, isOpen: isOpen,
      saveCurrent: saveCurrent, startNew: startNew, restore: restore,
      remove: remove, markNew: markNew, refresh: render, root: sidebar,
      add: add, currentTitle: currentTitle,
      setDocked: setDocked, isDocked: function () { return docked; },
      setSticky: setSticky,
      /* Projects (chat grouping) CRUD, exposed for host integrations. */
      createProject: function (name, color) { var p = createProject(name, color); render(); return p; },
      renameProject: function (id, name, color) { renameProject(id, name, color); render(); },
      renameItem: function (id, name, color) { renameItem(id, name, color); render(); },
      deleteProject: deleteProject,
      moveToProject: moveToProject,
      listProjects: function () { return projects.map(function (p) { return { id: p.id, name: p.name, color: p.color, count: projectItems(p.id).length }; }); }
    };
  }

  global.WiseChatHistory = { mount: mount };
})(typeof window !== 'undefined' ? window : this);
