/**
 * WISEai™ acronym tooltip — shows what each letter stands for on hover/focus,
 * matching the floating tooltip pattern used by the nav rail (#lir-tooltip).
 *
 *   S — Seeking
 *   C — Clarity
 *   O — through Open
 *   U — Unbiased
 *   T — Transparency
 */

export const WISEAI_NAME = 'WISEai™';

export const WISEAI_ACRONYM = [
  ['S', 'Seeking'],
  ['C', 'Clarity'],
  ['O', 'through Open'],
  ['U', 'Unbiased'],
  ['T', 'Transparency'],
];

const WISEAI_RE = /WISEai™/g;
/* Capturing group keeps the matched name in the split array (odd indices). */
const WISEAI_SPLIT = /(WISEai™)/g;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TITLE', 'TEXTAREA', 'INPUT']);
const SKIP_SELECTOR =
  '.topbar-title, [data-wiseai-tip], #wiseai-tip, .wiseai-mark';

const STANDALONE_STYLES = `
.wiseai-mark {
  cursor: help;
  text-decoration: underline dotted;
  text-decoration-color: color-mix(in srgb, currentColor 42%, transparent);
  text-underline-offset: 2px;
}
.wiseai-mark--bound { text-decoration: none; }
#wiseai-tip {
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
#wiseai-tip.wiseai-tip-visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
.wiseai-tip-title {
  font-size: 11px;
  font-weight: 700;
  margin-bottom: 6px;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--border, rgba(255,255,255,0.08));
  letter-spacing: 0.02em;
}
.wiseai-tip-line {
  display: block;
  line-height: 1.45;
  font-weight: 500;
  color: var(--text-muted, #C5CFD7);
}
.wiseai-tip-letter {
  display: inline-block;
  width: 1.1em;
  font-weight: 700;
  color: var(--text, #f3f8ff);
}
`;

function acronymTipHtml() {
  const lines = WISEAI_ACRONYM.map(
    ([letter, word]) =>
      `<span class="wiseai-tip-line"><span class="wiseai-tip-letter">${letter}</span> ${word}</span>`,
  ).join('');
  return `<div class="wiseai-tip-title">${WISEAI_NAME}</div>${lines}`;
}

function ensureStyles() {
  if (document.getElementById('wiseai-tip-styles')) return;
  if (document.querySelector('link[href*="wise.css"], link[href*="agent-page.css"]')) return;
  const style = document.createElement('style');
  style.id = 'wiseai-tip-styles';
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

function bindWISEaiTip(el) {
  if (!el || el.dataset.wiseaiTipBound) return;
  el.dataset.wiseaiTipBound = '1';
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
  el.classList.add('wiseai-mark', 'wiseai-mark--bound');
}

function bindWISEaiTipTargets(root = document.body) {
  root.querySelectorAll('[data-wiseai-tip]').forEach(bindWISEaiTip);
}

/** Wrap visible "WISEai™" text nodes under `root` with `.wiseai-mark` spans. */
export function decorateWISEai(root = document.body) {
  if (!root || typeof document.createTreeWalker !== 'function') return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!WISEAI_RE.test(node.textContent)) {
        WISEAI_RE.lastIndex = 0;
        return NodeFilter.FILTER_REJECT;
      }
      WISEAI_RE.lastIndex = 0;
      if (shouldSkipTextNode(node)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    const parts = node.textContent.split(WISEAI_SPLIT);
    if (parts.length < 2) continue;

    const frag = document.createDocumentFragment();
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      if (part === WISEAI_NAME) {
        const span = document.createElement('span');
        span.className = 'wiseai-mark';
        span.setAttribute('tabindex', '0');
        span.setAttribute('role', 'term');
        span.textContent = WISEAI_NAME;
        frag.appendChild(span);
      } else {
        frag.appendChild(document.createTextNode(part));
      }
    }
    if (!frag.childNodes.length) continue;
    node.parentNode.replaceChild(frag, node);
  }

  bindWISEaiTipTargets(root);
}

let tipEl = null;
let currentMark = null;
let decorateTimer = null;

function getTip() {
  if (tipEl) return tipEl;
  tipEl = document.getElementById('wiseai-tip');
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.id = 'wiseai-tip';
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
  tip.classList.add('wiseai-tip-visible');
  tip.setAttribute('aria-hidden', 'false');
}

function hideTip() {
  currentMark = null;
  tipEl?.classList.remove('wiseai-tip-visible');
  tipEl?.setAttribute('aria-hidden', 'true');
}

function scheduleDecorate(root) {
  clearTimeout(decorateTimer);
  decorateTimer = setTimeout(() => decorateWISEai(root || document.body), 16);
}

/** One-time init: styles, DOM decoration, hover/focus tooltips, dynamic updates. */
export function initWISEaiTooltips(root = document.body) {
  ensureStyles();
  getTip();
  decorateWISEai(root);

  if (!window.__wiseaiTipReady) {
    window.__wiseaiTipReady = true;

    document.addEventListener('mouseover', (e) => {
      const mark = e.target.closest('.wiseai-mark');
      if (mark && mark !== currentMark) showTip(mark);
    });
    document.addEventListener('mouseout', (e) => {
      const mark = e.target.closest('.wiseai-mark');
      if (mark && !mark.contains(e.relatedTarget)) hideTip();
    });
    document.addEventListener('focusin', (e) => {
      const mark = e.target.closest('.wiseai-mark');
      if (mark) showTip(mark);
    });
    document.addEventListener('focusout', (e) => {
      if (e.target.closest('.wiseai-mark')) hideTip();
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
