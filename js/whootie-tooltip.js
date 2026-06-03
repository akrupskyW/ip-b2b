/**
 * Whootie™ acronym tooltip — shows what each letter stands for on hover/focus,
 * matching the floating tooltip pattern used by the nav rail (#lir-tooltip).
 *
 *   W — WISE
 *   H — Health &
 *   O — Outcome
 *   O — Optimization
 *   T — through Transparent
 *   I — Ingredients &
 *   E — Evidence
 */

export const WHOOTIE_NAME = 'Whootie™';

export const WHOOTIE_ACRONYM = [
  ['W', 'WISE'],
  ['H', 'Health &'],
  ['O', 'Outcome'],
  ['O', 'Optimization'],
  ['T', 'through Transparent'],
  ['I', 'Ingredients &'],
  ['E', 'Evidence'],
];

const WHOOTIE_RE = /Whootie™/g;
/* Capturing group keeps the matched name in the split array (odd indices). */
const WHOOTIE_SPLIT = /(Whootie™)/g;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TITLE', 'TEXTAREA', 'INPUT']);
const SKIP_SELECTOR =
  '.topbar-title, [data-whootie-tip], #whootie-tip, .whootie-mark';

const STANDALONE_STYLES = `
.whootie-mark {
  cursor: help;
  text-decoration: underline dotted;
  text-decoration-color: color-mix(in srgb, currentColor 42%, transparent);
  text-underline-offset: 2px;
}
.whootie-mark--bound { text-decoration: none; }
#whootie-tip {
  position: fixed;
  z-index: 10001;
  background: var(--surface, #0d1b24);
  color: var(--text, #f3f8ff);
  font-size: 11px;
  font-weight: 600;
  padding: 8px 12px;
  border-radius: 8px;
  pointer-events: none;
  border: 1px solid var(--border, rgba(255,255,255,0.08));
  box-shadow: var(--shadow-card, 0 8px 24px rgba(0, 0, 0, 0.18));
  font-family: inherit;
  opacity: 0;
  transform: translateX(-50%) translateY(-4px);
  transition: opacity 0.12s ease, transform 0.12s ease;
  max-width: 260px;
}
#whootie-tip.whootie-tip-visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
.whootie-tip-title {
  font-size: 11px;
  font-weight: 700;
  margin-bottom: 6px;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--border, rgba(255,255,255,0.08));
  letter-spacing: 0.02em;
}
.whootie-tip-line {
  display: block;
  line-height: 1.45;
  font-weight: 500;
  color: var(--text-muted, #A8C9EA);
}
.whootie-tip-letter {
  display: inline-block;
  width: 1.1em;
  font-weight: 700;
  color: var(--text, #f3f8ff);
}
`;

function acronymTipHtml() {
  const lines = WHOOTIE_ACRONYM.map(
    ([letter, word]) =>
      `<span class="whootie-tip-line"><span class="whootie-tip-letter">${letter}</span> ${word}</span>`,
  ).join('');
  return `<div class="whootie-tip-title">${WHOOTIE_NAME}</div>${lines}`;
}

function ensureStyles() {
  if (document.getElementById('whootie-tip-styles')) return;
  if (document.querySelector('link[href*="agent-page.css"]')) return;
  const style = document.createElement('style');
  style.id = 'whootie-tip-styles';
  style.textContent = STANDALONE_STYLES;
  document.head.appendChild(style);
}

function shouldSkipTextNode(node) {
  let p = node.parentElement;
  while (p) {
    if (p.matches?.(SKIP_SELECTOR)) return true;
    if (SKIP_TAGS.has(p.tagName)) return true;
    p = p.parentElement;
  }
  return false;
}

function bindWhootieTip(el) {
  if (!el || el.dataset.whootieTipBound) return;
  el.dataset.whootieTipBound = '1';
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
  el.classList.add('whootie-mark', 'whootie-mark--bound');
}

function bindWhootieTipTargets(root = document.body) {
  root.querySelectorAll('[data-whootie-tip]').forEach(bindWhootieTip);
}

/** Wrap visible "Whootie™" text nodes under `root` with `.whootie-mark` spans. */
export function decorateWhootie(root = document.body) {
  if (!root || typeof document.createTreeWalker !== 'function') return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!WHOOTIE_RE.test(node.textContent)) {
        WHOOTIE_RE.lastIndex = 0;
        return NodeFilter.FILTER_REJECT;
      }
      WHOOTIE_RE.lastIndex = 0;
      if (shouldSkipTextNode(node)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    const parts = node.textContent.split(WHOOTIE_SPLIT);
    if (parts.length < 2) continue;

    const frag = document.createDocumentFragment();
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      if (part === WHOOTIE_NAME) {
        const span = document.createElement('span');
        span.className = 'whootie-mark';
        span.setAttribute('tabindex', '0');
        span.setAttribute('role', 'term');
        span.textContent = WHOOTIE_NAME;
        frag.appendChild(span);
      } else {
        frag.appendChild(document.createTextNode(part));
      }
    }
    if (!frag.childNodes.length) continue;
    node.parentNode.replaceChild(frag, node);
  }

  bindWhootieTipTargets(root);
}

let tipEl = null;
let currentMark = null;
let decorateTimer = null;

function getTip() {
  if (tipEl) return tipEl;
  tipEl = document.getElementById('whootie-tip');
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.id = 'whootie-tip';
    tipEl.setAttribute('role', 'tooltip');
    tipEl.setAttribute('aria-hidden', 'true');
    tipEl.innerHTML = acronymTipHtml();
    document.body.appendChild(tipEl);
  }
  return tipEl;
}

function showTip(mark) {
  const tip = getTip();
  currentMark = mark;
  const r = mark.getBoundingClientRect();
  tip.style.top = `${Math.round(r.bottom + 8)}px`;
  tip.style.left = `${Math.round(r.left + r.width / 2)}px`;
  tip.offsetWidth;
  tip.classList.add('whootie-tip-visible');
  tip.setAttribute('aria-hidden', 'false');
}

function hideTip() {
  currentMark = null;
  tipEl?.classList.remove('whootie-tip-visible');
  tipEl?.setAttribute('aria-hidden', 'true');
}

function scheduleDecorate(root) {
  clearTimeout(decorateTimer);
  decorateTimer = setTimeout(() => decorateWhootie(root || document.body), 16);
}

/** One-time init: styles, DOM decoration, hover/focus tooltips, dynamic updates. */
export function initWhootieTooltips(root = document.body) {
  ensureStyles();
  getTip();
  decorateWhootie(root);

  if (!window.__whootieTipReady) {
    window.__whootieTipReady = true;

    document.addEventListener('mouseover', (e) => {
      const mark = e.target.closest('.whootie-mark');
      if (mark && mark !== currentMark) showTip(mark);
    });
    document.addEventListener('mouseout', (e) => {
      const mark = e.target.closest('.whootie-mark');
      if (mark && !mark.contains(e.relatedTarget)) hideTip();
    });
    document.addEventListener('focusin', (e) => {
      const mark = e.target.closest('.whootie-mark');
      if (mark) showTip(mark);
    });
    document.addEventListener('focusout', (e) => {
      if (e.target.closest('.whootie-mark')) hideTip();
    });
    window.addEventListener('scroll', hideTip, true);
    window.addEventListener('resize', hideTip);

    const observeRoot = root === document.body ? document.body : root;
    const observer = new MutationObserver(() => scheduleDecorate(observeRoot));
    observer.observe(observeRoot, { childList: true, subtree: true, characterData: true });
  } else {
    scheduleDecorate(root);
  }
}
