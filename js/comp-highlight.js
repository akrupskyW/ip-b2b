/* ─────────────────────────────────────────────────────────────────────────
   comp-highlight.js — All Modules “Used in” opens the live page in a new
   tab and briefly paints that component with a pink glow.

   Query: ?wise-hl=.dash-btn,.pf-head-btn&wise-comp=Buttons
   A hash (if any) is kept so History / Turns / Reformulation Dashboard
   still land on their module.

   Injected from agent-menu.js (app pages), marketing-shell.js (marketing),
   and auth.js (sign-in). Self-guarding. A no-op when the query is absent.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  if (typeof document === 'undefined') return;
  if (window.__wiseCompHighlight) return;
  window.__wiseCompHighlight = true;

  var PARAM_SEL = 'wise-hl';
  var PARAM_NAME = 'wise-comp';
  var GLOW_MS = 3800;
  var RETRY_MS = 2800;

  var q;
  try { q = new URLSearchParams(location.search); }
  catch (e) { return; }
  var selRaw = q.get(PARAM_SEL);
  if (!selRaw) return;

  function injectCss() {
    if (document.getElementById('wise-comp-glow-css')) return;
    var style = document.createElement('style');
    style.id = 'wise-comp-glow-css';
    style.textContent = [
      '@keyframes wise-comp-glow-fade {',
      '  0%, 42% { box-shadow: 0 0 0 4px color-mix(in srgb, #EC4899 58%, transparent), 0 0 32px 8px color-mix(in srgb, #EC4899 42%, transparent); outline-color: #EC4899; }',
      '  100% { box-shadow: 0 0 0 0 transparent, 0 0 0 0 transparent; outline-color: transparent; }',
      '}',
      '@keyframes wise-comp-glow-fade-dark {',
      '  0%, 42% { box-shadow: 0 0 0 4px color-mix(in srgb, #F472B6 62%, transparent), 0 0 36px 10px color-mix(in srgb, #F472B6 48%, transparent); outline-color: #F472B6; }',
      '  100% { box-shadow: 0 0 0 0 transparent, 0 0 0 0 transparent; outline-color: transparent; }',
      '}',
      '.wise-comp-glow {',
      '  outline-style: solid !important;',
      '  outline-width: 2px !important;',
      '  outline-offset: 3px !important;',
      '  outline-color: #EC4899;',
      '  animation: wise-comp-glow-fade 3.8s ease-out forwards;',
      '}',
      'html.dark .wise-comp-glow {',
      '  outline-color: #F472B6;',
      '  animation-name: wise-comp-glow-fade-dark;',
      '}',
      '@media (prefers-reduced-motion: reduce) {',
      '  .wise-comp-glow, html.dark .wise-comp-glow {',
      '    animation: none;',
      '    box-shadow: 0 0 0 4px color-mix(in srgb, #EC4899 50%, transparent), 0 0 22px 4px color-mix(in srgb, #EC4899 32%, transparent);',
      '    outline-color: #EC4899;',
      '  }',
      '  html.dark .wise-comp-glow {',
      '    box-shadow: 0 0 0 4px color-mix(in srgb, #F472B6 55%, transparent), 0 0 26px 6px color-mix(in srgb, #F472B6 38%, transparent);',
      '    outline-color: #F472B6;',
      '  }',
      '}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(style);
  }

  function isVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var r = el.getBoundingClientRect();
    if (r.width < 2 && r.height < 2) return false;
    var st;
    try { st = window.getComputedStyle(el); }
    catch (e) { return true; }
    if (!st) return true;
    if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) return false;
    return true;
  }

  function skip(el) {
    return !!(el.closest && el.closest(
      '.dsc-demo, .dsc-card, .mi-motion-stage, [data-mi-boot], iframe, [hidden]'
    ));
  }

  function parseSels(raw) {
    return String(raw || '').split(',').map(function (s) { return s.trim(); }).filter(function (s) {
      return /^[#.][A-Za-z_][\w-]*$/.test(s);
    });
  }

  function mainRoot() {
    return document.getElementById('agent-main')
      || document.getElementById('modules-row')
      || document.getElementById('mkt-body-module')
      || null;
  }

  function pickIn(root, sels) {
    if (!root) return null;
    var i, k, nodes, el;
    for (i = 0; i < sels.length; i++) {
      try { nodes = root.querySelectorAll(sels[i]); }
      catch (e) { nodes = []; }
      for (k = 0; k < nodes.length; k++) {
        el = nodes[k];
        if (skip(el)) continue;
        if (!isVisible(el)) continue;
        return el;
      }
    }
    return null;
  }

  /* Prefer the live module over chrome. Nav / Appearance remount on boot,
     so an early .lir-btn hit would glow and then vanish. During retries
     only #agent-main counts; the whole document is the last resort. */
  function pick(sels, allowChrome) {
    var hashId = (location.hash || '').replace(/^#/, '');
    var scope = hashId ? document.getElementById(hashId) : null;
    var hit = pickIn(scope, sels) || pickIn(mainRoot(), sels);
    if (hit) return hit;
    if (allowChrome) return pickIn(document, sels);
    return null;
  }

  function cleanUrl() {
    try {
      var url = new URL(location.href);
      url.searchParams.delete(PARAM_SEL);
      url.searchParams.delete(PARAM_NAME);
      var qs = url.searchParams.toString();
      history.replaceState(null, '', url.pathname + (qs ? '?' + qs : '') + url.hash);
    } catch (e) { /* leave the query */ }
  }

  function glow(el) {
    injectCss();
    el.classList.remove('wise-comp-glow');
    void el.offsetWidth;
    el.classList.add('wise-comp-glow');
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    } catch (e) {
      try { el.scrollIntoView(); } catch (e2) { /* ignore */ }
    }
    setTimeout(function () { el.classList.remove('wise-comp-glow'); }, GLOW_MS);
  }

  function run() {
    var sels = parseSels(selRaw);
    if (!sels.length) { cleanUrl(); return; }
    var started = Date.now();
    var glowing = null;

    function apply(el) {
      if (!el) return;
      glowing = el;
      glow(el);
    }

    function tick() {
      var elapsed = Date.now() - started;
      var allowChrome = elapsed >= RETRY_MS;
      var el = pick(sels, allowChrome);
      if (el) {
        apply(el);
        cleanUrl();
        watchRemount();
        return;
      }
      if (!allowChrome) {
        setTimeout(tick, 160);
        return;
      }
      cleanUrl();
    }

    /* Header / nav often remount after first paint. If the glowing node
       is pulled out of the document, paint the replacement. */
    function watchRemount() {
      var until = Date.now() + 2200;
      var obs = new MutationObserver(function () {
        if (Date.now() > until) { obs.disconnect(); return; }
        if (glowing && document.contains(glowing)) return;
        var next = pick(sels, true);
        if (next) apply(next);
      });
      try {
        obs.observe(document.documentElement, { childList: true, subtree: true });
      } catch (e) { /* ignore */ }
      setTimeout(function () { try { obs.disconnect(); } catch (e2) {} }, 2300);
    }

    tick();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(run, 80); });
  } else {
    setTimeout(run, 80);
  }
})();
