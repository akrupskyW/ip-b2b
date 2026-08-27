/* =============================================================================
   count-up-all.js — universal scorecard count-up.

   Every scorecard numeral across every page animates from 0 up to its value the
   first time it scrolls into view, re-animates when its card is clicked (just
   like the charts and graphs re-animate on click), and re-animates whenever the
   underlying number changes. Numerals already driven by a dedicated animation
   system (data-count-to / data-count / data-score, the dashboard .dash-count-up
   engine, marketing .mkt-stat-num) are left completely untouched so nothing
   double-animates.

   Self-contained: no imports, safe to load once on any page. Opt a bespoke
   numeral in with [data-countup]; opt any element out with .no-countup or
   [data-no-countup].
   ========================================================================== */
(function () {
  'use strict';
  if (window.__wiseCountUpAll) return;
  window.__wiseCountUpAll = true;

  var reduceMotion = false;
  try {
    reduceMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}

  var DURATION = 1400; /* ms — matches the count-up feel used across the app */

  /* Numeral class  ->  clickable "card" ancestor that replays it on click. */
  var ENTRIES = [
    ['.ws-sc-metric', '.ws-scorecard'],
    ['.adm-stat-num', '.adm-stat'],
    ['.adm-metric-num', '.adm-metric'],
    ['.pf-stat-num', '.pf-stat'],
    ['.pf-state-num', '.pf-state'],
    ['.gs-stat-num', '.gs-stat'],
    ['.ib-stat-num', '.ib-stat'],
    ['.lib-stat-num', '.lib-stat'],
    ['.wmod-stat-num', '.wmod-stat'],
    ['.mi-stat-num', '.mi-stat'],
    ['.mi-code-num', '.mi-code-card'],
    ['.mi-int-stat-num', '.mi-int-stat'],
    ['.ak-stat-num', '.ak-stat'],
    ['.rf-stat-num', '.rf-stat'],
    ['.ac-stat-num', '.ac-stat'],
    ['.sc-stat-num', '.sc-stat'],
    ['.wa-stat-num', '.wa-stat'],
    ['.wa-ref-stat-num', '.wa-ref-stat'],
    ['.al-filter-count', '.al-filter'],
    ['.vf-stat-num', '.vf-stat'],
    ['.gv-stat-num', '.gv-stat'],
    ['.ar-stat-num', '.ar-score'],
    ['.dash-score-num .n', '.dash-score-card'],
    ['.nfp-ins .dash-bignum', '.dash-claim-col'],
    ['.nfp-ia-score', '.nfp-ia-sec'],
    ['.dash-report-stat-val', '.dash-report-stat'],
    ['[data-countup]', null],
  ];
  var NUM_SEL = ENTRIES.map(function (e) { return e[0]; }).join(',');

  /* Numerals owned by another animation system — never touch these. */
  function isManagedElsewhere(el) {
    if (el.hasAttribute('data-count-to') ||
        el.hasAttribute('data-count') ||
        el.hasAttribute('data-score')) return true;
    if (el.classList.contains('dash-count-up') ||
        el.classList.contains('mkt-stat-num')) return true;
    if (el.hasAttribute('data-no-countup') ||
        el.classList.contains('no-countup')) return true;
    return false;
  }

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  /* First descendant text node that actually contains a digit — this lets us
     animate "10" while leaving a sibling unit span ("claimed") in place, and
     handle inline units like "128.4k" or "35.7%" that live in the same node. */
  function findNumberNode(el) {
    var queue = [el];
    while (queue.length) {
      var node = queue.shift();
      for (var i = 0; i < node.childNodes.length; i++) {
        var c = node.childNodes[i];
        if (c.nodeType === 3) { if (/\d/.test(c.nodeValue)) return c; }
        else if (c.nodeType === 1) queue.push(c);
      }
    }
    return null;
  }

  var NUM_RE = /^([^\d-]*-?)(\d[\d,]*(?:\.\d+)?)(.*)$/;

  function parse(node) {
    var m = node.nodeValue.match(NUM_RE);
    if (!m) return null;
    var numStr = m[2];
    var value = parseFloat(numStr.replace(/,/g, ''));
    if (!isFinite(value)) return null;
    var dot = numStr.indexOf('.');
    return {
      prefix: m[1],
      suffix: m[3],
      value: value,
      decimals: dot === -1 ? 0 : (numStr.length - dot - 1),
      group: numStr.indexOf(',') !== -1,
    };
  }

  function format(n, meta) {
    return n.toLocaleString('en-US', {
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
      useGrouping: meta.group,
    });
  }

  function render(el, node, meta, n) {
    var str = meta.prefix + format(n, meta) + meta.suffix;
    el.__cuExpected = str; /* so our own writes don't look like external edits */
    node.nodeValue = str;
  }

  function animate(el) {
    var node = findNumberNode(el);
    if (!node) return;
    var meta = parse(node);
    if (!meta || meta.value === 0) return;

    if (el.__cuRaf) { cancelAnimationFrame(el.__cuRaf); el.__cuRaf = 0; }
    el.__cuMeta = meta;

    if (reduceMotion) { render(el, node, meta, meta.value); return; }

    var target = meta.value;
    var start = performance.now();
    render(el, node, meta, 0);
    var tick = function (now) {
      var t = Math.min(1, (now - start) / DURATION);
      render(el, node, meta, target * easeOutCubic(t));
      if (t < 1) el.__cuRaf = requestAnimationFrame(tick);
      else { el.__cuRaf = 0; render(el, node, meta, target); }
    };
    el.__cuRaf = requestAnimationFrame(tick);
  }

  function cardFor(el) {
    for (var i = 0; i < ENTRIES.length; i++) {
      if (ENTRIES[i][1] && el.matches(ENTRIES[i][0])) {
        var c = el.closest(ENTRIES[i][1]);
        if (c) return c;
      }
    }
    return el.parentElement;
  }

  var io = null;
  if (window.IntersectionObserver) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        io.unobserve(el); /* one-time entrance; replays come from click / edits */
        if (!el.__cuSeen) { el.__cuSeen = true; animate(el); }
      });
    }, { threshold: 0.25 });
  }

  function register(el) {
    if (el.__cuReg) return;
    el.__cuReg = true;
    if (isManagedElsewhere(el)) return;
    var node = findNumberNode(el);
    if (!node || !parse(node)) return;

    var card = cardFor(el);
    if (card) card.setAttribute('data-cu-card', '1');

    if (io) io.observe(el);
    else { el.__cuSeen = true; animate(el); }

    /* Re-animate whenever the page rewrites the number to a new value. */
    if (window.MutationObserver) {
      var mo = new MutationObserver(function () {
        if (!el.__cuSeen || el.__cuRaf) return;
        var n = findNumberNode(el);
        if (!n || n.nodeValue === el.__cuExpected) return; /* our own write */
        if (!parse(n)) return;
        animate(el);
      });
      mo.observe(el, { childList: true, characterData: true, subtree: true });
    }
  }

  function scan(root) {
    var els = (root || document).querySelectorAll(NUM_SEL);
    for (var i = 0; i < els.length; i++) register(els[i]);
  }

  /* Re-click a scorecard to re-count it (capture phase so it fires even when a
     page handler stops propagation; we never preventDefault, so filters etc.
     still work). */
  document.addEventListener('click', function (e) {
    var card = e.target.closest ? e.target.closest('[data-cu-card="1"]') : null;
    if (!card) return;
    var nums = card.matches(NUM_SEL) ? [card] : card.querySelectorAll(NUM_SEL);
    for (var i = 0; i < nums.length; i++) {
      var el = nums[i];
      if (!el.__cuReg || isManagedElsewhere(el)) continue;
      el.__cuSeen = true;
      animate(el);
    }
  }, true);

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    scan();
    if (window.MutationObserver && document.body) {
      new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var added = muts[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            var n = added[j];
            if (n.nodeType !== 1) continue;
            if (n.matches && n.matches(NUM_SEL)) register(n);
            if (n.querySelectorAll) scan(n);
          }
        }
      }).observe(document.body, { childList: true, subtree: true });
    }
  });
})();
