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
   box: no growing and no scroller of its own.

   It keeps a small version of the pane's frame. The whole block reaches the
   module edges (below), but an output's own WORDS — a report's lede, a section
   title, the label on a control row — must not start on the module's border,
   so they sit on this inset. It is deliberately a fraction of the pane's 24px:
   enough that nothing touches the edge, small enough that it never reads as a
   second reading column. The wide content cancels it exactly, which is the same
   mechanism the pane already documents for a gallery. */
.sc-out--inline.wa-pane-body {
  --wa-pane-pad-x: 16px;
  flex: none;
  min-height: 0;
  overflow: visible;
  padding: 0 var(--wa-pane-pad-x);
  margin: 1em 0 0.35em;
}
/* An output is not prose, so it does not sit on the prose column. A table
   wants its columns, a matrix wants its labels, a board wants its cells — and
   held to the reading column they were all being squeezed while a few hundred
   pixels of module sat empty either side. So an output drawn in the thread
   cancels the avatar gutter and the transcript inset and takes the chat
   MODULE's whole width.

   It can never take more. The width resolves from these two negative margins
   against the module's own box, so "edge to edge" and "never wider than the
   transcript" are one statement rather than a rule and a cap that could drift
   apart. The formula is in cqi against .sc-body for the same reason the output
   rails and the sent-ask wash are — a percentage would re-resolve against this
   element instead of the module — and the FLOOR is read from --sc-pad-floor
   rather than restated, so compact spacing cannot move one and not the other.

   The line that introduces the output is prose and stays on the column. */
.sc-line-body > .sc-out--inline.wa-pane-body {
  --sc-out-bleed: var(--sc-gutter, max(var(--sc-pad-floor, 3rem), calc((100cqi - var(--sc-transcript-max, 860px)) / 2)));
  box-sizing: border-box;
  max-width: none;
  margin-left: calc(-1 * (var(--sc-avatar-size, 30px) + 12px + var(--sc-out-bleed)));
  margin-right: calc(-1 * var(--sc-out-bleed));
}
/* …and the content that the width was for takes it back. A chart, a table, a
   compare board, an atlas panel and a gallery all reach the module edges; the
   prose and the control labels around them keep the inset above.

   Each of these is the OUTERMOST box of its own component, so cancelling it
   moves the whole thing and nothing inside has to be touched — a board's cells
   and a panel's cards follow their container. It is scoped to the inline
   reading because the pane keeps its full frame: same output, same markup, one
   variable's worth of difference between the two surfaces. */
.sc-out--inline > .wa-block > .wa-chart-card,
.sc-out--inline > .wa-block > table,
.sc-out--inline > .wa-block.cmp-host > .cmp-body,
.sc-out--inline > .wa-block > .atl-card,
.sc-out--inline .atl-panel > .atl-card,
.sc-out--inline .atl-panel > .atl-mapwrap,
.sc-out--inline .wa-atlas > .atl-cq,
.sc-out--inline .wa-atlas > .atl-flag {
  /* All three lines are needed, and a negative margin alone is the trap: these
     boxes are already sized to 100% of the padded content box and capped at it,
     so on its own the margin SHIFTED the card 16px left and left the same 16px
     open on the right. Restating the width as the content box plus the inset it
     is cancelling — and lifting the cap that would clamp it back — is what
     actually widens it to the module edges. */
  margin-inline: calc(-1 * var(--wa-pane-pad-x, 0px));
  width: calc(100% + 2 * var(--wa-pane-pad-x, 0px));
  max-width: none;
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
