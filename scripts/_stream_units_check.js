/*
 * Reveal units — transcript and panes.
 *
 * Nothing lands as a finished slab. One picker (js/stagger-reveal.js) decides
 * what counts as a single line of content, and both surfaces use it: the
 * transcript streams an answer beat by beat, and a pane reveals an output's
 * heading, sections, and table ROWS one at a time.
 *
 * Both are exercised here against fixtures built from plain objects that
 * implement only what the code touches, so no browser or jsdom is needed.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const chatSrc = fs.readFileSync(path.join(ROOT, 'js/wiseai-chat.js'), 'utf8');
const revealSrc = fs.readFileSync(path.join(ROOT, 'js/stagger-reveal.js'), 'utf8');
let fails = 0;
const ok = (cond, msg) => {
  if (cond) console.log(`  ok   ${msg}`);
  else { console.log(`  FAIL ${msg}`); fails += 1; }
};

/* ---- a fixture DOM --------------------------------------------------- */
const el = (tag, opts = {}) => {
  const node = {
    nodeType: 1,
    tagName: tag,
    dataset: {},
    style: {},
    className: (opts.cls || []).join(' '),
    attrs: opts.attrs || {},
    children: [],
    childNodes: [],
    parentNode: null,
    classList: { contains: (c) => (opts.cls || []).includes(c) },
    /* Enough of a selector engine for the module's own selector lists: tag
       names, .class, and [attr]. */
    matches(sel) {
      return String(sel).split(',').map((s) => s.trim()).filter(Boolean).some((one) => {
        if (one.startsWith('.')) return (opts.cls || []).includes(one.slice(1));
        if (one.startsWith('[')) return Object.prototype.hasOwnProperty.call(node.attrs, one.slice(1, -1));
        return one.toUpperCase() === node.tagName;
      });
    },
    querySelector: (sel) => (/svg|img|canvas|video|iframe/i.test(sel)
      ? node.children.find((c) => ['SVG', 'IMG', 'CANVAS', 'VIDEO', 'IFRAME'].includes(c.tagName)) || null
      : null),
    remove() { this.parentNode = null; },
    appendChild(n) { this.children.push(n); this.childNodes.push(n); n.parentNode = this; return n; },
    insertBefore(n) { this.children.push(n); n.parentNode = this; return n; },
  };
  Object.defineProperty(node, 'textContent', {
    get() {
      if (opts.text != null) return opts.text;
      return node.childNodes.map((c) => (c.nodeType === 3 ? c.nodeValue : c.textContent || '')).join('');
    },
  });
  Object.defineProperty(node, 'offsetWidth', { get: () => 1 });
  (opts.kids || []).forEach((k) => node.appendChild(k));
  return node;
};
const text = (v) => ({ nodeType: 3, nodeValue: v, parentNode: null, remove() {} });
const li = (t) => el('LI', { text: t });
const tr = (t) => el('TR', { text: t });
const p = (t) => el('P', { text: t });
const h = (t) => el('H3', { text: t });
const span = (t) => el('SPAN', { text: t });
const trailer = () => el('DIV', { cls: ['sc-line-meta'], text: '' });
const root = (kids) => el('DIV', { kids });

global.document = { createElement: (t) => el(t.toUpperCase()) };
global.matchMedia = () => ({ matches: false });

/* ---- lift both modules ---------------------------------------------- */
const reveal = (() => {
  const body = revealSrc.replace(/\bexport (function|const) /g, '$1 ');
  return new Function(`${body}; return { collectRevealUnits, groupRevealBeats, isRevealLeaf, staggerReveal };`)();
})();

const collectTranscriptParas = (() => {
  const from = chatSrc.indexOf('const TRANSCRIPT_TRAILER = [');
  const to = chatSrc.indexOf('export function primeTranscriptPara');
  if (from < 0 || to < 0) throw new Error('could not locate the transcript collector');
  const body = chatSrc.slice(from, to).replace(/\bexport function /g, 'function ');
  return new Function('collectRevealUnits', `${body}; return collectTranscriptParas;`)(reveal.collectRevealUnits);
})();

/* ---- 1. the picker -------------------------------------------------- */
console.log('\nReveal units — what counts as one line');

const refRow = el('DIV', { cls: ['wa-refs-mini-item'], kids: [span('1'), span('A paper (2021)')] });
const refs = el('DIV', { cls: ['wa-refs-mini'], kids: [refRow, el('DIV', { cls: ['wa-refs-mini-item'], kids: [span('2'), span('Another (2019)')] })] });
ok(reveal.isRevealLeaf(refRow), 'a box whose children are all inline is one line, not fragments');
ok(!reveal.isRevealLeaf(refs), 'a box of those rows is walked into');
ok(reveal.collectRevealUnits(refs).length === 2, 'so a references block reveals row by row');

const table = el('TABLE', {
  kids: [
    el('THEAD', { kids: [tr('Category | Foods')] }),
    el('TBODY', { kids: [tr('Soda 1'), tr('Chips 2'), tr('Cereal 3')] }),
  ],
});
const tUnits = reveal.collectRevealUnits(table);
ok(tUnits.length === 3 && tUnits.every((u) => u.tagName === 'TR'), `a table reveals its rows (got ${tUnits.length})`);
ok(!tUnits.some((u) => u.textContent.includes('Category |')), 'the header rides in with the frame, it is not a row');

const card = el('DIV', { cls: ['sc-surface-card'], kids: [h('Output'), p('preview')] });
ok(reveal.isRevealLeaf(card), 'a card that animates itself stays one beat');
const optOut = el('DIV', { attrs: { 'data-no-stagger': '' }, kids: [p('a'), p('b')] });
ok(reveal.isRevealLeaf(optOut), 'anything opted out stays one beat');

const section = el('SECTION', { kids: [h('Heading'), p('First.'), p('Second.')] });
ok(reveal.collectRevealUnits(section).length === 3, 'a section reveals heading then paragraph then paragraph');

const empty = el('DIV', { kids: [] });
ok(reveal.collectRevealUnits(root([empty])).length === 0, 'an empty box is not a beat');

/* ---- 2. capping ----------------------------------------------------- */
console.log('\nReveal units — long content is grouped, not crawled');

const many = Array.from({ length: 120 }, (_, i) => tr(`row ${i}`));
const beats = reveal.groupRevealBeats(many, 26);
ok(beats.length <= 26, `120 rows collapse to at most 26 beats (got ${beats.length})`);
ok(beats.flat().length === 120, 'and no row is dropped');
ok(beats.flat().map((r) => r.textContent).join() === many.map((r) => r.textContent).join(),
  'order is preserved through the grouping');
const six = reveal.groupRevealBeats(many.slice(0, 6), 26);
ok(six.length === 6 && six.every((g) => g.length === 1), 'short content still gets one beat per row');

/* ---- 3. the transcript uses the same picker ------------------------- */
console.log('\nReveal units — a streamed answer');

const list = el('UL', { kids: [li('one'), li('two'), li('three'), li('four')] });
const u1 = collectTranscriptParas(root([p('Lead paragraph.'), list, p('Closing paragraph.'), trailer()]));
ok(u1.length === 6, `two paragraphs plus four bullets is six beats (got ${u1.length})`);
ok(!u1.includes(list), 'the list is never primed whole');
ok(u1.filter((n) => n.tagName === 'LI').length === 4, 'every bullet is its own beat');
ok(u1.map((n) => n.textContent).join('|') === 'Lead paragraph.|one|two|three|four|Closing paragraph.',
  'in reading order, top to bottom');
ok(!u1.some((n) => n.classList.contains('sc-line-meta')), 'the meta trailer is never a beat');

const u2 = collectTranscriptParas(root([p('Sources:'), refs]));
ok(u2.length === 3, `a references block in an answer streams row by row (got ${u2.length})`);

const u3 = collectTranscriptParas(root([p('Baseline:'), table]));
ok(u3.length === 4 && u3.slice(1).every((n) => n.tagName === 'TR'),
  `a table in an answer streams row by row (got ${u3.length})`);

const u4 = collectTranscriptParas(root([p('intro'), card]));
ok(u4.length === 2 && u4[1] === card, 'a self-animating card still lands as one beat');

const u5 = collectTranscriptParas(root([text('just a sentence')]));
ok(u5.length === 1, 'a single-sentence answer is one beat');

const nested = el('UL', { kids: [el('LI', { kids: [text('owner'), el('UL', { kids: [li('deep')] })] })] });
ok(collectTranscriptParas(root([nested])).length === 1, 'a nested list rides with its parent item');

/* Rows are marked so they can land on a tighter beat than a paragraph. */
const marks = u3.slice(1).map((n) => n.dataset.scStreamUnit);
ok(marks.every((m) => m === 'row'), 'rows are marked as rows');
ok(u2[1].dataset.scStreamUnit === 'line', 'other lines are marked as lines');

/* ---- 3b. the member's own turn -------------------------------------- */
console.log('\nReveal units — the member\'s prompt');

const addUserSrc = chatSrc.slice(chatSrc.indexOf('function addUser(text, atts)'),
  chatSrc.indexOf('/* Actions row appended beneath a WISEcodeAI answer.'));
ok(/staggerReveal\(body, \{/.test(addUserSrc), 'the member line animates in rather than landing whole');
ok(/maxBeats: 140/.test(addUserSrc), 'a long brief is not grouped — every line gets its own beat');
ok(/minGap: 26/.test(addUserSrc) && /budget: 2200/.test(addUserSrc),
  'on a quick cadence, so a seventy-line brief still settles in about two seconds');
ok(/onReveal: \(\) => scrollDown\(true\)/.test(addUserSrc), 'and it stays scrolled to as it fills in');

/* A pasted brief: paragraphs, lead-ins, and dozens of bullets. Every one is a
   beat — the structure promptBodyHtml builds is walked to the line. */
const promptDoc = el('DIV', { cls: ['sc-line-body'], kids: [
  el('DIV', { cls: ['sc-prompt'], kids: [
    el('P', { cls: ['sc-prompt-p'], text: 'Create an intricate visualization.' }),
    el('P', { cls: ['sc-prompt-p', 'sc-prompt-lead'], text: 'Across these categories:' }),
    el('UL', { cls: ['sc-prompt-list'], kids: [li('soda'), li('energy'), li('chips'), li('cereal')] }),
    el('P', { cls: ['sc-prompt-p'], text: 'Panel A — Intervention opportunity map.' }),
    el('UL', { cls: ['sc-prompt-list'], kids: [li('X axis'), li('Y axis'), li('Bubble size')] }),
  ] }),
  trailer(),
] });
const promptUnits = reveal.collectRevealUnits(promptDoc);
ok(promptUnits.length === 10, `three paragraphs plus seven bullets is ten beats (got ${promptUnits.length})`);
ok(promptUnits.filter((u) => u.tagName === 'LI').length === 7, 'every bullet of the brief is its own beat');
ok(promptUnits[0].textContent.startsWith('Create an intricate'), 'starting at the first line');
ok(!promptUnits.some((u) => u.classList.contains('sc-line-meta')), 'the timestamp is not a beat');

/* A one-line typed message has nothing to pace and lands at once. */
const typed = el('DIV', { cls: ['sc-line-body'], kids: [trailer()] });
ok(reveal.collectRevealUnits(typed).length === 0, 'a short typed message is not animated line by line');

/* ---- 4. pacing and wiring ------------------------------------------ */
console.log('\nReveal units — pacing and wiring');

const pacing = chatSrc.slice(chatSrc.indexOf('export function typeInTranscript'));
ok(/dataset\.scStreamUnit === 'row'/.test(pacing), 'the streamer gives a row a tighter beat');
ok(/units\.forEach\(primeTranscriptPara\)/.test(pacing), 'every unit is primed before the reveal starts');

/* The pane reveal primes with opacity, never display:none, so a pane that
   measures a block still measures the finished layout. */
ok(/el\.style\.opacity = '0'/.test(revealSrc) && !/\.hidden = true/.test(revealSrc),
  'units are primed with opacity, so nothing reflows as rows come in');
ok(/prefersReduced\(\)/.test(revealSrc), 'reduced motion shows everything at once');

const page = fs.readFileSync(path.join(ROOT, 'pages/wiseai.html'), 'utf8');
ok(/import \{ staggerReveal \} from '\.\.\/js\/stagger-reveal\.js';/.test(page),
  'the page hosts the shared reveal rather than forking one');
ok(/staggerReveal\(b, \{/.test(page), 'every output block opening in a pane is revealed beat by beat');
ok(/onReveal: \(els\) => els\.forEach\(\(el\) => waBootDashCharts\(el\)\)/.test(page),
  "a chart's own animation starts when its row appears, not before");

/* Behaviour end to end: a whole output block reveals in order. */
const block = el('DIV', {
  cls: ['wa-block'],
  kids: [
    el('DIV', { cls: ['wa-block-head'], kids: [span('Baseline')] }),
    h('150,479 foods'),
    el('TABLE', { kids: [el('THEAD', { kids: [tr('hdr')] }), el('TBODY', { kids: [tr('r1'), tr('r2'), tr('r3')] })] }),
    p('Note under the table.'),
  ],
});
const seen = [];
const nBeats = reveal.staggerReveal(block, { startDelay: 0, onReveal: (g) => g.forEach((x) => seen.push(x.textContent)) });
ok(nBeats === 6, `the block reveals in 6 beats — head, title, three rows, note (got ${nBeats})`);
ok(block.children[1].style.opacity === '0', 'and its content starts primed, not visible');

console.log(fails ? `\n${fails} check(s) failed\n` : '\nall reveal unit checks passed\n');
process.exit(fails ? 1 : 0);
