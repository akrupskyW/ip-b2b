/* =============================================================
   WISE — SVG icon shim

   Replaces every Material Symbols webfont glyph in the app with an inline SVG
   from assets/icons/wise-icons.svg (Material Symbols Rounded 300 — the "Light"
   preview in the Icon Inventory). One sprite, fetched once and cached by the
   browser for all 51 pages.

   Why a shim and not a codemod: icon names reach the DOM in ~4,900 places —
   3,200 literals in markup, 250 template slots fed from data files, and about
   twenty `icon.textContent = 'chevron_right'` swaps at runtime. Rewriting all
   of those would be a large diff that still could not cover the dynamic cases.
   Swapping at paint time covers every path, and keeps a single source of truth.

   The webfont <link> stays in every page as the fallback: a glyph the sprite
   does not carry simply renders from the font as before. Those are listed on
   window.WISE_ICONS.misses and warned once in the console, so a name added to
   the app without regenerating the sprite is visible rather than silent.

   Load order (both `defer`, in <head>, after the font links):
     <script defer src="../js/icon-svg-shim.js"></script>

   Regenerate the sprite after adding icons:
     python3 scripts/gen_icon_sprite.py
============================================================= */
(function () {
  'use strict';

  /* Resolve the sprite relative to this script so /pages/*.html and the
     root-level marketing pages both find it. */
  var self = document.currentScript;
  var SPRITE_URL = self && self.src
    ? new URL('../assets/icons/wise-icons.svg', self.src).href
    : 'assets/icons/wise-icons.svg';

  var ICON_SEL = '[class*="material-symbols"], [class~="material-icons"]';
  var SKIP_ATTR = 'data-icon-svg-skip';
  var LIG_CLASS = 'wise-icon-lig';
  var NAME_RE = /^[a-z][a-z0-9_]{1,40}$/;
  var FILL_RE = /["']FILL["']\s*1/;

  var ICON_CSS =
      /* 1em square, coloured by the surrounding text — existing `font-size`
         and `color` rules on .material-symbols-outlined keep driving size.
         display:block (not inline-block) drops the descender gap under SVGs;
         margin:auto keeps the square centered when a parent forces the host
         to `display:block` and stretches it (the icon rail). */
      '.wise-icon{width:1em;height:1em;display:block;margin:0 auto;' +
      'fill:currentColor;stroke:none;flex:0 0 auto;overflow:visible}' +
      /* Host flex-centers that square. vertical-align:middle is for icons
         sitting next to a label; flex circle parents ignore it. Weight
         (more_vert @ 600 vs the rest @ 400) does not move the viewBox —
         the old vertical-align:-0.175em on .wise-icon did, and sat every
         glyph low in its well. */
      '[data-icon-svg]{display:inline-flex;align-items:center;justify-content:center;' +
      'line-height:0;vertical-align:middle;font-variation-settings:normal}' +
      /* The ligature text kept for textContent compatibility: readable to JS,
         invisible to the page and to the accessibility tree. */
      '.wise-icon-lig{display:none}' +
      /* Appearance ▸ Text size (S/M/L/XL) scales icons from their authored
         size — a 13px chip glyph stays a chip glyph, a 24px scorecard mark
         stays a scorecard mark. Zoom (not a 24px floor) keeps each role's
         size and still grows or shrinks with type. Regions that already
         zoom their body (--wise-icon-scale: 1 there) must not compound. */
      'html{--wise-icon-scale:var(--wise-text-scale,1)}' +
      '[class*="material-symbols"],[class~="material-icons"]{' +
      'zoom:var(--wise-icon-scale,var(--wise-text-scale,1))}';


  var have = null;            // Set of symbol ids present in the sprite
  var misses = Object.create(null);
  var missCount = 0;
  var painted = 0;
  var observer = null;
  var queued = false;
  var generatedAt = '';  /* build stamp of the loaded sprite */
  var shadows = null;    /* shadow roots already styled + observed */
  var symbolsById = null;/* id -> <symbol>, for cloning into shadow roots */
  var churn = null;      /* element -> repaints in the current window */
  var churnSince = 0;
  var churnWarned = false;

  /* ---- painting ------------------------------------------------------ */

  /* A painted icon holds two children: the original ligature text, kept in a
     display:none <i>, and the <svg> that actually draws.

     Keeping that text is what makes the shim safe to drop into this codebase.
     el.textContent still returns the glyph name, so the ~20 places that do
     `if (ic.textContent !== WANTED) ic.textContent = WANTED` still
     short-circuit instead of tearing the icon out. Two of those run from
     MutationObservers, where an unconditional rewrite ping-pongs with this
     shim every frame. One hidden element per icon buys back compatibility with
     every read of textContent in the app. */
  function ligOf(el) {
    var first = el.firstElementChild;
    return first && first.className === LIG_CLASS ? first : null;
  }

  /* The glyph name to draw, or '' if this element is already correct. */
  function nameOf(el) {
    var t = (el.textContent || '').trim();
    if (!NAME_RE.test(t)) return '';
    var lig = ligOf(el);
    /* Our own hidden ligature, unchanged, with the svg still after it. */
    if (lig && lig.textContent === el.getAttribute('data-icon-svg') &&
        el.lastElementChild !== lig) return '';
    return t;
  }

  function wantsFill(el) {
    var v = getComputedStyle(el).fontVariationSettings;
    return !!v && FILL_RE.test(v);
  }

  function symbolFor(name, fill) {
    if (fill && have.has('wi-' + name + '-f')) return 'wi-' + name + '-f';
    return have.has('wi-' + name) ? 'wi-' + name : '';
  }

  var SVG_NS = 'http://www.w3.org/2000/svg';

  /* A <use href="#id"> can only reach an id in its OWN tree: shadow DOM has a
     separate id scope, so a <use> inside a shadow root silently resolves to
     nothing. The few icons that live in one (js/cwr-toggle.js mounts its
     rollout-mode widget in an open shadow root on 39 pages) therefore get the
     geometry cloned in rather than referenced. */
  function drawInline(el, name, id) {
    var sym = symbolsById[id];
    if (!sym) return false;
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'wise-icon');
    svg.setAttribute('viewBox', sym.getAttribute('viewBox') || '0 -960 960 960');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    for (var i = 0; i < sym.childNodes.length; i++) {
      svg.appendChild(sym.childNodes[i].cloneNode(true));
    }
    var lig = document.createElement('i');
    lig.className = LIG_CLASS;
    lig.textContent = name;
    el.textContent = '';
    el.appendChild(lig);
    el.appendChild(svg);
    el.setAttribute('data-icon-svg-inline', '');
    return true;
  }

  function draw(el, name, id) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'wise-icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#' + id);
    svg.appendChild(use);

    var lig = document.createElement('i');
    lig.className = LIG_CLASS;
    lig.textContent = name;

    el.textContent = '';
    el.appendChild(lig);
    el.appendChild(svg);
  }

  function paintOne(el) {
    if (el.closest('[' + SKIP_ATTR + ']')) return;

    var name = nameOf(el);
    if (name) {
      var id = symbolFor(name, wantsFill(el));
      if (!id) {
        /* No twin — leave the ligature text so the webfont still draws it. */
        if (!misses[name]) { misses[name] = 0; missCount++; }
        misses[name]++;
        el.setAttribute('data-icon-svg-missing', name);
        return;
      }
      countChurn(el, name);
      el.setAttribute('data-icon-svg', name);
      el.removeAttribute('data-icon-svg-missing');
      /* Only icons that actually have a FILL 1 twin need re-checking later;
         marking them here keeps the repaint pass off getComputedStyle for the
         other ~2,000 icons on the heaviest pages. */
      if (have.has('wi-' + name + '-f')) el.setAttribute('data-icon-fillable', '');
      else el.removeAttribute('data-icon-fillable');
      if (el.getRootNode() === document) draw(el, name, id);
      else if (!drawInline(el, name, id)) return;
      painted++;
      return;
    }

    /* Already painted, text unchanged. The only thing that can still change is
       the FILL state, which rides on a class (.is-on, .is-active) that this
       element or an ancestor toggles. */
    if (!el.hasAttribute('data-icon-fillable')) return;
    var current = el.getAttribute('data-icon-svg');
    if (!current) return;
    var svg = el.lastElementChild;
    if (!svg) { el.textContent = current; return; }   /* svg was torn out */
    var want = symbolFor(current, wantsFill(el));
    if (!want) return;
    if (el.hasAttribute('data-icon-svg-inline')) {
      if (el.getAttribute('data-icon-drawn') !== want) {
        drawInline(el, current, want);
        el.setAttribute('data-icon-drawn', want);
      }
      return;
    }
    var use = svg.firstElementChild;
    if (!use) { el.textContent = current; return; }
    if (use.getAttribute('href') !== '#' + want) use.setAttribute('href', '#' + want);
  }

  /* A repaint means something overwrote a glyph we had already drawn. That is
     normal for `icon.textContent = 'chevron_right'` state swaps, but if the
     same element is rewritten dozens of times a second something is looping —
     an observer of ours waking an observer of theirs. Say so once, loudly,
     rather than quietly burning frames. (See the fix in wiseai-dock.js
     observeRowForSolo and pane-width.js syncButton for what that looks like.) */
  function countChurn(el, name) {
    if (el.getAttribute('data-icon-svg') !== name) return;   /* a real change */
    var now = performance.now();
    if (!churn || now - churnSince > 2000) { churn = new WeakMap(); churnSince = now; }
    var n = (churn.get(el) || 0) + 1;
    churn.set(el, n);
    if (n === 30 && !churnWarned) {
      churnWarned = true;
      console.warn('[wise-icons] "' + name + '" is being rewritten in a loop — ' +
        'something is re-setting textContent on an already-painted icon every ' +
        'frame. Element:', el);
    }
  }

  /* querySelectorAll does not cross shadow boundaries and neither does a
     MutationObserver, so every shadow root has to be found, styled and observed
     on its own. Cheap: the walk only inspects elements that actually host one. */
  function adoptShadow(sr) {
    if (shadows.has(sr)) return;
    shadows.add(sr);
    var tag = document.createElement('style');
    tag.textContent = ICON_CSS;          /* page styles do not reach in here */
    sr.appendChild(tag);
    if (observer) observe(sr);
  }

  function paint(root) {
    if (!have) return;
    var scope = root && (root.nodeType === 1 || root.nodeType === 11) ? root : document;
    if (scope.matches && scope.matches(ICON_SEL)) paintOne(scope);
    var list = scope.querySelectorAll(ICON_SEL);
    var i;
    for (i = 0; i < list.length; i++) paintOne(list[i]);
    /* Then recurse through any shadow roots this scope contains. */
    var all = scope.querySelectorAll('*');
    for (i = 0; i < all.length; i++) {
      var sr = all[i].shadowRoot;
      if (!sr) continue;
      adoptShadow(sr);
      paint(sr);
    }
  }

  /* ---- change tracking ----------------------------------------------- */

  /* Our own paint writes show up as mutations too. Telling them apart from the
     app's matters: the observer must stay connected while we paint, because
     disconnecting (and discarding records) would swallow an app mutation that
     landed in the same task — which is exactly how
     `icon.textContent = 'width_normal'` used to survive as literal text. */
  function isOurs(r) {
    if (r.type !== 'childList') return false;
    var i, n;
    for (i = 0; i < r.addedNodes.length; i++) {
      n = r.addedNodes[i];
      if (n.nodeType !== 1) return false;
      if (n.namespaceURI === SVG_NS && n.getAttribute('class') === 'wise-icon') continue;
      if (n.className === LIG_CLASS) continue;
      return false;
    }
    for (i = 0; i < r.removedNodes.length; i++) {
      n = r.removedNodes[i];
      if (n.nodeType === 3) continue;                        /* raw ligature text */
      if (n.nodeType === 1 && n.namespaceURI === SVG_NS) continue;  /* an old icon */
      if (n.nodeType === 1 && n.className === LIG_CLASS) continue;  /* an old ligature */
      return false;
    }
    return true;
  }

  /* innerHTML re-renders (42 sites in wiseai-chat.js alone), textContent icon
     swaps, and class toggles that flip FILL all land here. Coalesced into one
     full pass per frame — simpler than tracking each subtree, and paintOne is a
     cheap no-op for icons that are already correct. */
  function schedule(records) {
    if (records) {
      var relevant = false;
      for (var i = 0; i < records.length; i++) {
        if (!isOurs(records[i])) { relevant = true; break; }
      }
      if (!relevant) return;
    }
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; paint(document); });
  }

  function observe(target) {
    observer.observe(target, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ['class'],
    });
  }

  function connect() {
    observe(document.documentElement);
    if (shadows) shadows.forEach(observe);
  }

  /* ---- setup --------------------------------------------------------- */

  function injectStyle() {
    var tag = document.createElement('style');
    tag.id = 'wise-icon-shim-style';
    tag.textContent = ICON_CSS;
    (document.head || document.documentElement).appendChild(tag);
  }

  function mount(text) {
    var host = document.createElement('div');
    host.id = 'wise-icon-sprite';
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    host.innerHTML = text;
    (document.body || document.documentElement).appendChild(host);

    have = new Set();
    symbolsById = Object.create(null);
    shadows = new Set();
    var symbols = host.querySelectorAll('symbol[id]');
    for (var i = 0; i < symbols.length; i++) {
      have.add(symbols[i].id);
      symbolsById[symbols[i].id] = symbols[i];
    }

    /* Stamped by scripts/gen_icon_sprite.py. Read it off window.WISE_ICONS to
       confirm which build a page is actually running. */
    var root = host.querySelector('svg[data-generated]');
    generatedAt = root ? root.getAttribute('data-generated') : '';

    observer = new MutationObserver(schedule);
    connect();
    paint(document);

    if (missCount) {
      console.warn(
        '[wise-icons] ' + missCount + ' glyph name(s) have no SVG twin and are ' +
        'still drawn by the webfont: ' + Object.keys(misses).sort().join(', ') +
        ' — run `python3 scripts/gen_icon_sprite.py` to add them.'
      );
    }
  }

  window.WISE_ICONS = {
    spriteUrl: SPRITE_URL,
    get generatedAt() { return generatedAt; },
    get symbols() { return have ? have.size : 0; },
    get painted() { return painted; },
    misses: misses,
    repaint: function () { paint(document); },
  };

  injectStyle();

  /* 'no-cache' means "always revalidate", not "never cache": the browser still
     serves the cached bytes on a 304, it just asks first. That one conditional
     request is the difference between regenerating the sprite and seeing it, and
     regenerating the sprite and being told by your own browser that nothing
     changed — 'force-cache' returns a stale entry without asking, so a rebuilt
     sprite never reaches an already-visited page. */
  fetch(SPRITE_URL, { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
      return r.text();
    })
    .then(function (text) {
      if (document.body) mount(text);
      else document.addEventListener('DOMContentLoaded', function () { mount(text); });
    })
    .catch(function (err) {
      /* Sprite unreachable (missing file, or a file:// page where fetch is
         blocked). The webfont <link> is still in every page, so icons render
         as they always did. */
      console.warn('[wise-icons] sprite not loaded, falling back to the webfont:', err.message);
    });
})();
