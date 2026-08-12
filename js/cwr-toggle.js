/* Crawl / Walk / Run rollout toggle — a floating segmented control pinned to
   the right edge, vertically centered, present on every pages/*.html.

   The chosen mode is stored in localStorage ('wise-cwr-mode') and applied as
   a class on <html> (cwr-crawl / cwr-walk / cwr-run) so every page picks the
   same mode up. What each mode gates:

     crawl — no chat at all. Every WISEcodeAI chat surface (docked panel, the
             collapsed FAB, chat-shell pages) is hidden; only the SaaS
             modules remain.
     walk  — chat is visible with the intent chips, but the free-form
             composer rail (Type your message, attach "+", database
             selector, send) is hidden. Right-of-chat modules stay.
     run   — everything: modules, chips, and the full composer.

   The floating widget itself is OFF by default and is revealed by the
   "Crawl · Walk · Run" switch in the Appearance popover (see
   js/appearance-menu.js + js/topbar.js), which persists 'wise-cwr-ui' and
   toggles the `cwr-ui-on` class on <html>. While the widget is hidden the
   mode gating is suspended too (every selector below requires .cwr-ui-on),
   so a page can never get stuck chat-less with no visible control — the
   stored mode is kept and comes back when the switch is turned on again.

   Include with: <script src="../js/cwr-toggle.js"></script> in <head>.
   The <html> classes are applied synchronously (no flash); the widget
   itself mounts on DOMContentLoaded. */
(function () {
  'use strict';

  var KEY = 'wise-cwr-mode';
  var UI_KEY = 'wise-cwr-ui';
  var MODES = ['crawl', 'walk', 'run'];
  var META = {
    crawl: { icon: 'child_care', label: 'Crawl', desc: 'Modules only — no WISEcodeAI chat' },
    walk: { icon: 'directions_walk', label: 'Walk', desc: 'Chat with intent chips — no free-form composer' },
    run: { icon: 'directions_run', label: 'Run', desc: 'Full experience — chips + free-form composer' }
  };

  function readMode() {
    try {
      var v = localStorage.getItem(KEY);
      return MODES.indexOf(v) !== -1 ? v : 'run';
    } catch (e) { return 'run'; }
  }

  function applyMode(mode) {
    var root = document.documentElement;
    MODES.forEach(function (m) { root.classList.toggle('cwr-' + m, m === mode); });
    try { localStorage.setItem(KEY, mode); } catch (e) { /* private mode */ }
    try { window.dispatchEvent(new CustomEvent('wise:cwr-mode', { detail: { mode: mode } })); } catch (e) {}
  }

  function isUiOn() {
    try { return localStorage.getItem(UI_KEY) === '1'; } catch (e) { return false; }
  }

  function applyUi() {
    document.documentElement.classList.toggle('cwr-ui-on', isUiOn());
  }

  /* ---- mode CSS + widget chrome (injected so it works on every page,
          including ones that don't load wise.css) ---- */
  var css = [
    /* crawl: hide every chat surface. .wch-chat-anchor is the root class
       mountWISEcodeAIChat() puts on all shared chat mounts (dock panel, #wa-chat,
       #rf-chat, studio-ai…); .wiseai-dock covers the docked rail even before
       mount; .wiseai-dock-fab is the collapsed launcher; #chat-shell is the
       hand-rolled chat card on portfolio/comparison; .chat-input-rail catches
       standalone composers (add/view-product wizards). */
    'html.cwr-ui-on.cwr-crawl .wch-chat-anchor,',
    'html.cwr-ui-on.cwr-crawl .wiseai-dock,',
    'html.cwr-ui-on.cwr-crawl .wiseai-dock-fab,',
    'html.cwr-ui-on.cwr-crawl #chat-shell,',
    'html.cwr-ui-on.cwr-crawl .chat-input-rail { display: none !important; }',
    /* walk: chat stays, free-form composer goes. Intent chips are forced
       visible even if the user previously hid them via the chips pref. */
    'html.cwr-ui-on.cwr-walk .chat-input-rail { display: none !important; }',
    'html.cwr-ui-on.cwr-walk .sc-intent-chips-hidden .sc-welcome .ws-chips-wrap,',
    'html.cwr-ui-on.cwr-walk .sc-intent-chips-hidden .sc-welcome > .ws-chips { display: flex !important; }',
    /* ---- floating widget (hidden until the Appearance switch turns it on) ---- */
    '#cwr-toggle { display: none; }',
    'html.cwr-ui-on #cwr-toggle {',
    '  position: fixed; right: 10px; top: 50%; transform: translateY(-50%);',
    '  z-index: 10500; display: flex; flex-direction: column; gap: 4px;',
    '  padding: 5px; border-radius: 999px;',
    '  background: var(--surface, #fff);',
    '  border: 1px solid var(--border-strong, rgba(37, 80, 124, 0.28));',
    '  box-shadow: 0 6px 20px rgba(17, 24, 39, 0.14);',
    '  font-family: inherit;',
    '}',
    'html.dark #cwr-toggle { box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45); }',
    '#cwr-toggle .cwr-btn {',
    '  display: flex; flex-direction: column; align-items: center; justify-content: center;',
    '  gap: 1px; width: 46px; height: 46px; border-radius: 999px;',
    '  border: none; background: transparent; cursor: pointer;',
    '  color: var(--text-muted, #444B55);',
    '  transition: background 0.15s ease, color 0.15s ease;',
    '}',
    '#cwr-toggle .cwr-btn:hover { background: var(--primary-soft, rgba(37, 80, 124, 0.08)); color: var(--primary, #25507C); }',
    '#cwr-toggle .cwr-btn[aria-checked="true"] { background: var(--primary, #25507C); color: #fff; }',
    '#cwr-toggle .cwr-btn .material-symbols-outlined { font-size: 18px; line-height: 1; }',
    '#cwr-toggle .cwr-btn .cwr-btn-label {',
    '  font-size: 0.5rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; line-height: 1.1;',
    '}'
  ].join('\n');

  var style = document.createElement('style');
  style.id = 'cwr-toggle-style';
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  /* Apply the saved mode + widget visibility synchronously (no flash). */
  applyMode(readMode());
  applyUi();

  function mountWidget() {
    if (document.getElementById('cwr-toggle')) return;
    var wrap = document.createElement('div');
    wrap.id = 'cwr-toggle';
    wrap.setAttribute('role', 'radiogroup');
    wrap.setAttribute('aria-label', 'Rollout mode');
    wrap.innerHTML = MODES.map(function (m) {
      var meta = META[m];
      return '<button type="button" class="cwr-btn" role="radio" data-mode="' + m + '"' +
        ' title="' + meta.label + ' — ' + meta.desc + '">' +
        '<span class="material-symbols-outlined" aria-hidden="true">' + meta.icon + '</span>' +
        '<span class="cwr-btn-label">' + meta.label + '</span>' +
        '</button>';
    }).join('');

    function sync() {
      var mode = readMode();
      wrap.querySelectorAll('.cwr-btn').forEach(function (btn) {
        btn.setAttribute('aria-checked', btn.dataset.mode === mode ? 'true' : 'false');
      });
    }

    wrap.addEventListener('click', function (e) {
      var btn = e.target.closest('.cwr-btn');
      if (!btn) return;
      applyMode(btn.dataset.mode);
      sync();
    });

    sync();
    document.body.appendChild(wrap);

    /* Follow mode / visibility changes made in another tab. */
    window.addEventListener('storage', function (e) {
      if (e.key === KEY) { applyMode(readMode()); sync(); }
      else if (e.key === UI_KEY) { applyUi(); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountWidget);
  } else {
    mountWidget();
  }
})();
