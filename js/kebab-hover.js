/* ─────────────────────────────────────────────────────────────────────────
   kebab-hover.js — every three-dot menu opens its popover on hover.

   Rule: a ⋮ / ⋯ that owns a menu does not wait for a tap. On a pointer
   device the popover appears the moment the cursor enters the button, stays
   while you travel onto the menu, and closes when you leave both. Touch and
   keyboard keep the existing click / Enter toggle.

   How it opens: it clicks the trigger so each surface's own handler still
   runs (row menus inject Reformulate, the date picker places itself, the
   chat More menu groups its rows). If that click does not reveal a menu,
   a fallback unhides the sibling popover so a ⋮ is never a dead hover.

   Injected from agent-menu.js on every page that renders the WISE nav.
   Self-guarding + delegated, so dynamically rendered rows are covered.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  if (typeof document === 'undefined') return;
  if (window.__wiseKebabHover) return;
  window.__wiseKebabHover = true;

  var GRACE_MS = 180;

  var KNOWN_BTN =
    '.panel-more-btn, .pf-rowmenu-btn, .adm-rowmenu-btn, .inv-rowmenu-btn, ' +
    '.ma-rowmenu-btn, .nud-rowmenu-btn, .pf-datemenu-btn, .w-datemenu-btn, ' +
    '.pf-module-menu-btn, .dash-kebab, .sc-fb-more, .sc-connector-more';

  var WRAP_SEL =
    '.pf-rowmenu, .adm-rowmenu, .inv-rowmenu, .ma-rowmenu, ' +
    '.panel-more-wrap, .dash-kebab-wrap, .pf-datemenu, .w-datemenu, ' +
    '.pf-module-menu, .sc-fb-more-wrap, .nud-actions';

  var POP_SEL =
    '[role="menu"], .topbar-popover, .pf-rowmenu-pop, .adm-rowmenu-pop, ' +
    '.inv-rowmenu-pop, .ma-rowmenu-pop, .pf-datemenu-pop, .w-datemenu-pop, ' +
    '.pf-module-menu-pop, .dash-kebab-menu, .sc-fb-menu, .wt-more-pop, ' +
    '.wch-more-pop';

  var SKIP_ANCESTOR =
    '.dsc-demo, [data-wtp-skip], [data-popover-static], [role="menu"], ' +
    '.topbar-popover, .wise-popover, #lir-tooltip, .ct-card';

  var current = null;
  var closeTimer = null;
  var synthesizing = false;

  function isTouch(e) {
    return !!(e && e.pointerType === 'touch');
  }

  function glyphName(btn) {
    var icon = btn.querySelector && btn.querySelector('.material-symbols-outlined, [data-icon-svg]');
    if (!icon) return '';
    var named = (icon.getAttribute && icon.getAttribute('data-icon-svg')) || '';
    if (named) return named.replace(/\s+/g, ' ').trim();
    return (icon.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function isKebab(el) {
    if (!el || !el.matches) return false;
    if (el.closest && el.closest(SKIP_ANCESTOR)) return false;
    /* History's collapse chevron reuses .panel-more-btn for header chrome.
       It is not a menu — hovering it must not synthesize a click. */
    if (el.matches('.wch-rail-btn')) return false;
    var g = glyphName(el);
    if (g === 'chevron_left' || g === 'chevron_right') return false;
    if (el.matches(KNOWN_BTN)) return true;
    if (!el.matches('button, [role="button"]')) return false;
    var popup = el.getAttribute('aria-haspopup');
    if (popup !== 'true' && popup !== 'menu') return false;
    return g === 'more_vert' || g === 'more_horiz';
  }

  function kebabFrom(start) {
    if (!start || !start.closest) return null;
    var btn = start.closest('button, [role="button"]');
    if (!btn || !isKebab(btn)) return null;
    return btn;
  }

  function wrapOf(btn) {
    return (btn.closest && btn.closest(WRAP_SEL)) || btn.parentElement;
  }

  function isShown(el) {
    if (!el || !el.isConnected) return false;
    if (el.hasAttribute && el.hasAttribute('hidden')) return false;
    if (el.hidden) return false;
    if (el.classList && el.classList.contains('hidden')) return false;
    return el.getClientRects && el.getClientRects().length > 0 &&
      getComputedStyle(el).display !== 'none';
  }

  function popFor(btn) {
    if (!btn) return null;
    var id = btn.getAttribute('aria-controls');
    if (id) {
      var byId = document.getElementById(id);
      if (byId) return byId;
    }
    var wrap = wrapOf(btn);
    if (wrap) {
      var inner = wrap.querySelector(POP_SEL);
      if (inner && inner !== btn && !btn.contains(inner)) return inner;
    }
    var pops = document.querySelectorAll(POP_SEL);
    for (var i = 0; i < pops.length; i++) {
      var p = pops[i];
      if (p.__plHost && (p.__plHost === wrap || (p.__plHost.contains && p.__plHost.contains(btn)))) {
        return p;
      }
      if (p.__dateRoot && wrap && (p.__dateRoot === wrap || wrap.contains(p.__dateRoot))) {
        /* date-column stashes the live pop on the wrap */
      }
    }
    if (wrap && wrap.__datePop && wrap.__datePop.isConnected) return wrap.__datePop;
    return null;
  }

  function isOpen(btn) {
    if (!btn) return false;
    if (btn.getAttribute('aria-expanded') === 'true') return true;
    if (btn.classList && btn.classList.contains('is-open')) return true;
    var wrap = wrapOf(btn);
    if (wrap && wrap.classList && wrap.classList.contains('is-open')) return true;
    var pop = popFor(btn);
    return !!(pop && isShown(pop));
  }

  function fallbackOpen(btn) {
    var pop = popFor(btn);
    if (!pop) return;
    var wrap = wrapOf(btn);
    if (wrap && wrap.classList) wrap.classList.add('is-open');
    if (btn.classList) btn.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    pop.hidden = false;
    pop.removeAttribute('hidden');
    if (pop.classList) pop.classList.remove('hidden');
  }

  function fallbackClose(btn) {
    var pop = popFor(btn);
    var wrap = wrapOf(btn);
    if (wrap && wrap.classList) wrap.classList.remove('is-open');
    if (btn.classList) btn.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    if (pop) {
      if (pop.classList && (pop.classList.contains('topbar-popover') ||
          pop.classList.contains('wch-more-pop') ||
          pop.classList.contains('wt-more-pop') ||
          pop.classList.contains('sc-fb-pop'))) {
        pop.classList.add('hidden');
      } else {
        pop.hidden = true;
        pop.setAttribute('hidden', '');
      }
    }
  }

  function fireClick(btn) {
    synthesizing = true;
    try {
      btn.click();
    } finally {
      synthesizing = false;
    }
  }

  function openBtn(btn) {
    if (!btn || isOpen(btn)) {
      current = btn;
      return;
    }
    current = btn;
    fireClick(btn);
    if (!isOpen(btn)) fallbackOpen(btn);
  }

  function closeBtn(btn) {
    if (!btn) return;
    if (current === btn) current = null;
    if (!isOpen(btn)) return;
    fireClick(btn);
    if (isOpen(btn)) fallbackClose(btn);
  }

  function cancelClose() {
    clearTimeout(closeTimer);
    closeTimer = null;
  }

  function scheduleClose(btn) {
    cancelClose();
    closeTimer = setTimeout(function () {
      closeTimer = null;
      closeBtn(btn);
    }, GRACE_MS);
  }

  function overKebabUi(el, btn) {
    if (!el || !el.closest) return false;
    if (btn && (el === btn || (btn.contains && btn.contains(el)))) return true;
    var pop = popFor(btn);
    if (pop && (pop === el || (pop.contains && pop.contains(el)))) return true;
    /* Folder picker opened from a three-dot File action lives on <body>. */
    if (el.closest && el.closest('.lib-pop')) return true;
    return false;
  }

  document.addEventListener('pointerover', function (e) {
    if (isTouch(e)) return;
    var btn = kebabFrom(e.target);
    if (btn) {
      cancelClose();
      if (current && current !== btn) closeBtn(current);
      openBtn(btn);
      return;
    }
    if (current && overKebabUi(e.target, current)) cancelClose();
  });

  document.addEventListener('pointerout', function (e) {
    if (isTouch(e)) return;
    var btn = kebabFrom(e.target);
    var fromPop = current && popFor(current) &&
      e.target.closest && e.target.closest(POP_SEL);
    if (!btn && !fromPop) return;
    var owner = btn || current;
    if (!owner) return;
    if (overKebabUi(e.relatedTarget, owner)) return;
    scheduleClose(owner);
  });

  /* A mouse click that lands after hover already opened the menu must not
     toggle it shut under the cursor. Touch never hover-opened, so it toggles. */
  /* Window capture so this runs before per-page document capture handlers
     (date-column, row menus) and can swallow a mouse click that would
     otherwise toggle a hover-opened menu straight back shut. */
  window.addEventListener('click', function (e) {
    if (synthesizing) return;
    if (isTouch(e)) return;
    var btn = kebabFrom(e.target);
    if (!btn || btn !== current || !isOpen(btn)) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
  }, true);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && current) current = null;
  }, true);
})();
