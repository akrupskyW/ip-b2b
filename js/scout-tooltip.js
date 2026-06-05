/**
 * Scout™ acronym tooltip — shows what each letter stands for on hover/focus,
 * matching the floating tooltip pattern used by the nav rail (#lir-tooltip).
 *
 *   S — Seeking
 *   C — Clarity
 *   O — through Open
 *   U — Unbiased
 *   T — Transparency
 */

export const SCOUT_NAME = 'Scout™';

export const SCOUT_ACRONYM = [
  ['S', 'Seeking'],
  ['C', 'Clarity'],
  ['O', 'through Open'],
  ['U', 'Unbiased'],
  ['T', 'Transparency'],
];

const SCOUT_RE = /Scout™/g;
/* Capturing group keeps the matched name in the split array (odd indices). */
const SCOUT_SPLIT = /(Scout™)/g;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TITLE', 'TEXTAREA', 'INPUT']);
const SKIP_SELECTOR =
  '.topbar-title, [data-scout-tip], #scout-tip, .scout-mark';

const STANDALONE_STYLES = `
.scout-mark {
  cursor: help;
  text-decoration: underline dotted;
  text-decoration-color: color-mix(in srgb, currentColor 42%, transparent);
  text-underline-offset: 2px;
}
.scout-mark--bound { text-decoration: none; }
#scout-tip {
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
#scout-tip.scout-tip-visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
.scout-tip-title {
  font-size: 11px;
  font-weight: 700;
  margin-bottom: 6px;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--border, rgba(255,255,255,0.08));
  letter-spacing: 0.02em;
}
.scout-tip-line {
  display: block;
  line-height: 1.45;
  font-weight: 500;
  color: var(--text-muted, #A8C9EA);
}
.scout-tip-letter {
  display: inline-block;
  width: 1.1em;
  font-weight: 700;
  color: var(--text, #f3f8ff);
}
`;

function acronymTipHtml() {
  const lines = SCOUT_ACRONYM.map(
    ([letter, word]) =>
      `<span class="scout-tip-line"><span class="scout-tip-letter">${letter}</span> ${word}</span>`,
  ).join('');
  return `<div class="scout-tip-title">${SCOUT_NAME}</div>${lines}`;
}

function ensureStyles() {
  if (document.getElementById('scout-tip-styles')) return;
  if (document.querySelector('link[href*="agent-page.css"]')) return;
  const style = document.createElement('style');
  style.id = 'scout-tip-styles';
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

function bindScoutTip(el) {
  if (!el || el.dataset.scoutTipBound) return;
  el.dataset.scoutTipBound = '1';
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
  el.classList.add('scout-mark', 'scout-mark--bound');
}

function bindScoutTipTargets(root = document.body) {
  root.querySelectorAll('[data-scout-tip]').forEach(bindScoutTip);
}

/** Wrap visible "Scout™" text nodes under `root` with `.scout-mark` spans. */
export function decorateScout(root = document.body) {
  if (!root || typeof document.createTreeWalker !== 'function') return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!SCOUT_RE.test(node.textContent)) {
        SCOUT_RE.lastIndex = 0;
        return NodeFilter.FILTER_REJECT;
      }
      SCOUT_RE.lastIndex = 0;
      if (shouldSkipTextNode(node)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    const parts = node.textContent.split(SCOUT_SPLIT);
    if (parts.length < 2) continue;

    const frag = document.createDocumentFragment();
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      if (part === SCOUT_NAME) {
        const span = document.createElement('span');
        span.className = 'scout-mark';
        span.setAttribute('tabindex', '0');
        span.setAttribute('role', 'term');
        span.textContent = SCOUT_NAME;
        frag.appendChild(span);
      } else {
        frag.appendChild(document.createTextNode(part));
      }
    }
    if (!frag.childNodes.length) continue;
    node.parentNode.replaceChild(frag, node);
  }

  bindScoutTipTargets(root);
}

let tipEl = null;
let currentMark = null;
let decorateTimer = null;

function getTip() {
  if (tipEl) return tipEl;
  tipEl = document.getElementById('scout-tip');
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.id = 'scout-tip';
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
  tip.classList.add('scout-tip-visible');
  tip.setAttribute('aria-hidden', 'false');
}

function hideTip() {
  currentMark = null;
  tipEl?.classList.remove('scout-tip-visible');
  tipEl?.setAttribute('aria-hidden', 'true');
}

function scheduleDecorate(root) {
  clearTimeout(decorateTimer);
  decorateTimer = setTimeout(() => decorateScout(root || document.body), 16);
}

/** One-time init: styles, DOM decoration, hover/focus tooltips, dynamic updates. */
export function initScoutTooltips(root = document.body) {
  ensureStyles();
  getTip();
  decorateScout(root);

  if (!window.__scoutTipReady) {
    window.__scoutTipReady = true;

    document.addEventListener('mouseover', (e) => {
      const mark = e.target.closest('.scout-mark');
      if (mark && mark !== currentMark) showTip(mark);
    });
    document.addEventListener('mouseout', (e) => {
      const mark = e.target.closest('.scout-mark');
      if (mark && !mark.contains(e.relatedTarget)) hideTip();
    });
    document.addEventListener('focusin', (e) => {
      const mark = e.target.closest('.scout-mark');
      if (mark) showTip(mark);
    });
    document.addEventListener('focusout', (e) => {
      if (e.target.closest('.scout-mark')) hideTip();
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
