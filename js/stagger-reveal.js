/* ------------------------------------------------------------------ */
/* Reveal in reading order                                             */
/* ------------------------------------------------------------------ */
/*
 * Nothing lands as a finished slab. Any block of content — an answer in the
 * transcript, an output opening in a pane — arrives one beat at a time, top to
 * bottom: the heading, then a paragraph, then EACH ROW of a table, then each
 * item of a list, then the note under the chart. A section never appears whole
 * and neither does a table.
 *
 * The unit picker is structural rather than a list of class names, so it works
 * on whatever markup a surface produces without being taught about it: walk
 * down through the containers (a section, a table body, a list) and stop at the
 * first thing that reads as one line — a row, a list item, a paragraph, a
 * heading, a chart, or any box whose own children are all inline. Two things are
 * deliberately left alone: a card that animates itself is one beat, and a table
 * header rides in with the table frame instead of counting as a row.
 *
 * Long content is grouped rather than crawling. The beat count is capped and the
 * gap is sized from a total time budget, so a forty-row table finishes in about
 * the same time as a six-row one — it just reveals a few rows per beat.
 *
 * Units are primed with opacity and a small lift, NOT display:none, so a pane
 * that measures a block's height (carousels, sticky modules) still measures the
 * finished layout and nothing reflows as the rows come in.
 *
 * Honors prefers-reduced-motion: everything shows at once.
 */

/* Boxes worth walking into. Anything else is a leaf — one beat. THEAD is absent
   on purpose (see below), as is any inline tag. */
const CONTAINERS = new Set([
  'DIV', 'SECTION', 'ARTICLE', 'MAIN', 'ASIDE', 'HEADER', 'FOOTER', 'FIGURE',
  'TABLE', 'TBODY', 'TFOOT', 'UL', 'OL', 'DL', 'DETAILS', 'FIELDSET', 'FORM', 'NAV',
]);

/* A box whose children are ALL one of these is a single line of content — a
   reference row, a legend, a stat cell — so it reveals as one beat instead of
   fragmenting into its own spans. */
const INLINE = new Set([
  'SPAN', 'A', 'B', 'STRONG', 'EM', 'I', 'U', 'S', 'SMALL', 'CODE', 'KBD',
  'ABBR', 'TIME', 'BR', 'IMG', 'SVG', 'CANVAS', 'VIDEO', 'IFRAME', 'PICTURE',
  'LABEL', 'INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'SUP', 'SUB', 'MARK', 'WBR',
]);

/* Cards that run their own reveal, and anything explicitly opted out. */
const SELF_ANIMATING = '.sc-surface-card, .sc-connect-flow, [data-cf-step], [data-no-stagger]';

/* Chrome that is never a beat: the turn's own trailer rows, and a table head,
   which belongs to the table frame rather than being a row of data. */
const SKIP = 'thead, caption, colgroup, .sc-line-meta, .sc-fb-wrap, .sc-feedback,'
  + ' .sc-inline-chips, .sc-reply-chips, .gs-chips, .gs-chips-inline';

const DEFAULTS = {
  maxDepth: 6,
  maxBeats: 26,
  budget: 1500,
  minGap: 45,
  maxGap: 150,
  startDelay: 30,
};

function isEl(n) { return !!n && n.nodeType === 1; }
function hits(el, sel) {
  try { return !!(el && el.matches && el.matches(sel)); } catch (_) { return false; }
}

/* Worth revealing at all: it says something, or it draws something. */
function hasSubstance(el) {
  if ((el.textContent || '').trim()) return true;
  return !!(el.querySelector && el.querySelector('img, svg, canvas, video, iframe'));
}

/* One line of content — stop here rather than walking further in. */
export function isRevealLeaf(el) {
  if (!isEl(el)) return false;
  if (hits(el, SELF_ANIMATING)) return true;
  if (!CONTAINERS.has(el.tagName)) return true;
  const kids = Array.from(el.children || []);
  if (!kids.length) return true;
  return kids.every((k) => INLINE.has(k.tagName));
}

/* Every unit inside `root`, in reading order. */
export function collectRevealUnits(root, opts = {}) {
  if (!isEl(root)) return [];
  const o = { ...DEFAULTS, ...opts };
  const skip = o.skip || SKIP;
  /* Asked to open up something that runs its own reveal (or has opted out), the
     answer is "there is nothing here to pace" — never fragment that card into
     its parts. Callers treat an empty result as "reveal it as one beat". */
  if (hits(root, SELF_ANIMATING) || hits(root, skip)) return [];
  const out = [];
  const walk = (el, depth) => {
    Array.from(el.children || []).forEach((kid) => {
      if (hits(kid, skip)) return;
      if (depth >= o.maxDepth || isRevealLeaf(kid)) {
        if (hasSubstance(kid)) out.push(kid);
        return;
      }
      const before = out.length;
      walk(kid, depth + 1);
      /* A container that yielded no units of its own is still a beat. */
      if (out.length === before && hasSubstance(kid)) out.push(kid);
    });
  };
  walk(root, 0);
  return out;
}

/* Cap the number of beats so long content reveals a few rows at a time instead
   of crawling row by row for twenty seconds. */
export function groupRevealBeats(units, maxBeats) {
  const cap = Math.max(1, maxBeats || DEFAULTS.maxBeats);
  if (units.length <= cap) return units.map((u) => [u]);
  const size = Math.ceil(units.length / cap);
  const beats = [];
  for (let i = 0; i < units.length; i += size) beats.push(units.slice(i, i + size));
  return beats;
}

function prefersReduced() {
  try {
    return !!(typeof matchMedia === 'function'
      && matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (_) { return false; }
}

export function primeRevealUnit(el) {
  if (!isEl(el)) return;
  el.style.opacity = '0';
  el.style.transform = 'translateY(6px)';
  el.style.willChange = 'opacity, transform';
}

export function showRevealUnit(el) {
  if (!isEl(el)) return;
  void el.offsetWidth;
  el.style.transition = 'opacity .34s ease, transform .34s cubic-bezier(0.22, 0.85, 0.25, 1)';
  el.style.opacity = '1';
  el.style.transform = 'none';
  setTimeout(() => { el.style.willChange = ''; }, 420);
}

/*
 * Reveal everything inside `root` one beat at a time.
 *
 *   onReveal(els)  fires as each beat lands — used to start a chart's own
 *                  animation at the moment its row appears, not before it.
 *   onDone()       fires once the last beat has landed.
 *
 * Returns the number of beats (0 when there was nothing to pace).
 */
export function staggerReveal(root, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const units = collectRevealUnits(root, o);
  const finish = () => { if (o.onDone) o.onDone(); };
  if (!units.length) { finish(); return 0; }
  if (prefersReduced()) {
    if (o.onReveal) o.onReveal(units);
    finish();
    return 0;
  }
  const beats = groupRevealBeats(units, o.maxBeats);
  units.forEach(primeRevealUnit);
  const gap = Math.max(o.minGap, Math.min(o.maxGap, Math.round(o.budget / beats.length)));
  let i = 0;
  const step = () => {
    if (i >= beats.length) { finish(); return; }
    const group = beats[i];
    i += 1;
    group.forEach(showRevealUnit);
    if (o.onReveal) o.onReveal(group);
    setTimeout(step, gap);
  };
  setTimeout(step, o.startDelay);
  return beats.length;
}
