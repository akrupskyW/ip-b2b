/* =============================================================================
   output-mode.js — where a turn's outputs are drawn.

   Two answers to one question, and the member picks. **In the thread** puts
   every output under the answer that produced it, full size: a gallery, a
   deck, a chart or a film reads as part of what was just said, and nothing
   docks beside the chat. **As cards** posts an output chip there instead and
   keeps the output itself for the Output pane, which opens when the member
   taps the chip.

   In the thread is the default. Cards is the compact reading, for a turn that
   produced more than a screenful.

   A host writes BOTH representations at surface time and this module only
   decides which one is on screen — so switching is instant and retroactive,
   and a thread scrolled back three turns re-reads with it. Nothing is
   re-generated and nothing is thrown away.

   This does not change what opens. A pane still opens only when the member
   asks for it (see the outputs-open-on-request rule); cards mode simply makes
   the chip the thing they are looking at.

     getOutputMode() -> 'inline' | 'cards'
     setOutputMode(mode)
     onOutputModeChange(fn) -> unsubscribe
   ========================================================================== */

const KEY = 'wise:output-mode';
const STYLE_ID = 'wise-output-mode-styles';
const EVENT = 'wise:output-mode';

export const OUTPUT_MODES = Object.freeze(['inline', 'cards']);
export const OUTPUT_MODE_DEFAULT = 'inline';

export const OUTPUT_MODE_LABELS = Object.freeze({
  inline: 'Outputs in the thread',
  cards: 'Outputs as cards',
});

function clean(mode) {
  return OUTPUT_MODES.indexOf(mode) >= 0 ? mode : OUTPUT_MODE_DEFAULT;
}

/** The stored preference, or the default when nothing has been chosen. */
export function getOutputMode() {
  try { return clean(localStorage.getItem(KEY)); } catch (_) { return OUTPUT_MODE_DEFAULT; }
}

function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  document.head.appendChild(style);
  style.textContent = `
/* One of the two is always off. Both are written, so neither has to be rebuilt
   when the member changes their mind. */
html[data-output-mode="cards"] .sc-out--inline { display: none; }
html[data-output-mode="inline"] .sc-out--card { display: none; }
/* A later output that introduced itself in its own chat. In the card
   reading that chat is empty — the chip already lives on the first
   line's rail — so the whole line stands down. */
html[data-output-mode="cards"] .sc-line-out-inline { display: none; }
/* The inline copy borrows the pane's own block styling — it is the same
   output, only parked in the thread — so every chart, table and board reads
   there without a second set of rules. What it does not borrow is the pane's
   box: no growing, no scroller of its own, and no inline padding, so the
   output still sits on the transcript's column. */
.sc-out--inline.wa-pane-body {
  --wa-pane-pad-x: 0px;
  flex: none;
  min-height: 0;
  overflow: visible;
  padding: 0;
  margin: 1em 0 0.35em;
}
.sc-out--inline:empty { display: none; }
.sc-out--inline > .wa-block + .wa-block { margin-top: 18px; }
`;
}

/** Paint the current mode onto <html> so the CSS above can act on it. */
export function applyOutputMode(mode) {
  if (typeof document === 'undefined') return OUTPUT_MODE_DEFAULT;
  injectStyles();
  const m = clean(mode || getOutputMode());
  document.documentElement.setAttribute('data-output-mode', m);
  return m;
}

/**
 * Choose where outputs are drawn. Persisted, painted, and announced — every
 * control showing the preference re-reads from the event rather than from
 * whichever one was clicked.
 */
export function setOutputMode(mode) {
  const m = clean(mode);
  try { localStorage.setItem(KEY, m); } catch (_) { /* private mode: session only */ }
  applyOutputMode(m);
  try {
    document.dispatchEvent(new CustomEvent(EVENT, { detail: { mode: m } }));
  } catch (_) { /* no CustomEvent: the attribute is still painted */ }
  return m;
}

/** Run `fn(mode)` whenever the preference changes, here or in another tab. */
export function onOutputModeChange(fn) {
  if (typeof fn !== 'function' || typeof document === 'undefined') return () => {};
  const here = (e) => fn((e.detail && e.detail.mode) || getOutputMode());
  const elsewhere = (e) => { if (e.key === KEY) fn(applyOutputMode()); };
  document.addEventListener(EVENT, here);
  window.addEventListener('storage', elsewhere);
  return () => {
    document.removeEventListener(EVENT, here);
    window.removeEventListener('storage', elsewhere);
  };
}

if (typeof window !== 'undefined') {
  window.WiseOutputMode = {
    get: getOutputMode,
    set: setOutputMode,
    apply: applyOutputMode,
    onChange: onOutputModeChange,
    MODES: OUTPUT_MODES,
    LABELS: OUTPUT_MODE_LABELS,
    DEFAULT: OUTPUT_MODE_DEFAULT,
  };
  applyOutputMode();
}
