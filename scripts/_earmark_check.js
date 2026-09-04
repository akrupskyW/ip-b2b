/*
 * Ear-mark checks.
 *
 * Two things must hold after the ear-mark work:
 *
 *   1. The activity strip collapses every output a SINGLE ask produced into one
 *      counted ear-mark. Grouping reads the ask stamped on each line
 *      (data-ask-turn), not the per-line turn IDs, so an ask that surfaces nine
 *      outputs draws one mark reading "9" instead of a ladder of nine tabs.
 *   2. The All Modules catalog specimen explains that behaviour and shows the
 *      three ear-mark shapes (lone tab, counted mark, stacked version pair).
 *
 * Runs without a browser or jsdom: the transcript is stood up as plain objects
 * implementing only what the strip's helpers touch (closest, querySelector,
 * dataset, getAttribute), so the shipped source runs unmodified. The catalog
 * specimen is read out of js/all-modules-flow.js.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let fails = 0;
const ok = (cond, msg) => {
  if (cond) console.log(`  ok   ${msg}`);
  else { console.log(`  FAIL ${msg}`); fails += 1; }
};

/* ---------------------------------------------------------------- */
/* 1. Grouping: one ask with many outputs -> one counted ear-mark    */
/* ---------------------------------------------------------------- */
console.log('\nActivity strip — ear-mark grouping');

const strip = fs.readFileSync(path.join(ROOT, 'js/chat-activity-strip.js'), 'utf8');

/* The two helpers the grouping depends on, lifted from the module so the check
   exercises the shipped source rather than a paraphrase of it. */
function lift(name) {
  const at = strip.indexOf(`function ${name}(el)`);
  if (at < 0) throw new Error(`could not find ${name} in chat-activity-strip.js`);
  const open = strip.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < strip.length; i += 1) {
    if (strip[i] === '{') depth += 1;
    else if (strip[i] === '}') { depth -= 1; if (!depth) return strip.slice(at, i + 1); }
  }
  throw new Error(`unbalanced braces reading ${name}`);
}
const helpers = `${lift('turnIdFor')}\n${lift('askTurnFor')}\nmodule.exports = { turnIdFor, askTurnFor };`;
const { turnIdFor, askTurnFor } = (() => {
  const m = { exports: {} };
  new Function('module', helpers)(m);
  return m.exports;
})();

ok(/data-ask-turn|dataset\.askTurn/.test(strip), 'the strip reads the ask stamped on a line');
ok(/askTurnFor\(el\) \|\| turnId/.test(strip), 'grouping prefers the ask, falling back to the turn ID');

/* A transcript: one ask that surfaced nine outputs (nine preview lines, nine
   different turn IDs), then a later ask with a single output, plus a source
   landmark that must stay its own tick. `ask: null` stands for markup written
   before the stamp existed. */
function landmark({ ask, id, activity }) {
  const line = {
    dataset: ask === null ? {} : { askTurn: String(ask) },
    querySelector: (sel) => (sel === '.sc-fb-id' && id ? { textContent: `#${id}` } : null),
  };
  return {
    getAttribute: (a) => (a === 'data-activity' ? activity : null),
    closest: (sel) => (sel === '.sc-line' ? line : null),
  };
}
const ids = ['1a1a', '2b2b', '3c3c', '4d4d', '5e5e', '6f6f', '7g7g', '8h8h', '9i9i'];
const els = [
  ...ids.map((id) => landmark({ ask: 1, id, activity: 'output' })),
  landmark({ ask: 1, id: 'src1', activity: 'source' }),
  landmark({ ask: 2, id: 'z9z9', activity: 'output' }),
];

/* The grouping loop from renderTicks, verbatim in behaviour. */
const ACTIVITY_TYPES = { output: {}, source: {}, database: {}, prompt: {} };
const groups = [];
const outputByAsk = new Map();
els.forEach((el) => {
  const type = el.getAttribute('data-activity');
  const meta = ACTIVITY_TYPES[type];
  if (!meta || type === 'prompt') return;
  const turnId = turnIdFor(el);
  const askKey = askTurnFor(el) || turnId;
  if (type === 'output' && askKey) {
    let g = outputByAsk.get(askKey);
    if (!g) { g = { type, turnId, els: [] }; outputByAsk.set(askKey, g); groups.push(g); }
    g.els.push(el);
  } else {
    groups.push({ type, turnId, els: [el] });
  }
});

const outGroups = groups.filter((g) => g.type === 'output');
ok(groups.length === 3, `three marks in all, not eleven (got ${groups.length})`);
ok(outGroups.length === 2, `two output ear-marks, one per ask (got ${outGroups.length})`);
ok(outGroups[0].els.length === 9, `the nine-output ask collapses to one mark of 9 (got ${outGroups[0].els.length})`);
ok(outGroups[1].els.length === 1, 'the single-output ask stays a lone mark');
ok(outGroups[0].turnId === '#1a1a', 'the collapsed mark labels (and lands on) the first output of the block');
ok(groups.some((g) => g.type === 'source' && g.els.length === 1), 'a source landmark keeps its own tick');

/* Older markup with no ask stamp must still group, one mark per output. */
const lEl = landmark({ ask: null, id: 'old1', activity: 'output' });
ok(askTurnFor(lEl) === '', 'a line with no ask stamp reports no ask');
ok((askTurnFor(lEl) || turnIdFor(lEl)) === '#old1', 'and falls back to its turn ID');

/* The chat has to stamp the ask in the first place. */
const chat = fs.readFileSync(path.join(ROOT, 'js/wiseai-chat.js'), 'utf8');
ok(/askTurnSeq \+= 1/.test(chat), 'the chat opens a new ask on every member turn');
ok((chat.match(/data-ask-turn="\$\{askTurnSeq\}"/g) || []).length >= 2,
  'both the member line and every WISEcodeAI line carry the ask stamp');

/* ---------------------------------------------------------------- */
/* 2. The All Modules specimen documents it                          */
/* ---------------------------------------------------------------- */
console.log('\nAll Modules — Activity strip specimen');

const flow = fs.readFileSync(path.join(ROOT, 'js/all-modules-flow.js'), 'utf8');
const at = flow.indexOf("name: 'Activity strip'");
ok(at > 0, 'the specimen is present in the catalog');
const spec = flow.slice(at, flow.indexOf("name: 'Token readout'"));

ok(/ear-mark/i.test(spec), 'the specimen names the ear-mark');
ok(/three <strong>shapes<\/strong>|three shapes/i.test(spec), 'it lays out the three shapes');
ok(/collapse/i.test(spec) && /count/i.test(spec), 'it explains the collapse and the count');
ok(/by the ask, not by turn ID/i.test(spec), 'it says grouping is by the ask, not the turn ID');
ok(/first<\/em> output|first output/i.test(spec), 'it says a collapsed mark lands on the first output');
ok(/never a count of three or four/i.test(spec), 'it keeps the stacked pair as a binary flag, not a count');
ok(/wa-activity-tick--count/.test(spec) && /wa-activity-tick-count/.test(spec),
  'the class line lists the counted-mark classes');
ok(/count: 9/.test(spec), 'the demo renders a collapsed nine-output mark');

/* The demo builder must produce that mark correctly. */
const tickSrc = flow.slice(flow.indexOf('function demoActTick'));
const tickFn = tickSrc.slice(0, tickSrc.indexOf('\nfunction demoJamEq'));
const demoActTick = new Function('esc', `${tickFn}; return demoActTick;`)(
  (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
);
const counted = demoActTick('output', { count: 9, id: '8m4w' });
ok(/wa-activity-tick--count/.test(counted), 'a counted mark carries the counted class');
ok(/<span class="wa-activity-tick-count" aria-hidden="true">9<\/span>/.test(counted), 'the count reads 9');
ok(/9 outputs/.test(counted), 'its hover names how many outputs the ask made');
const lone = demoActTick('output', { id: '3a1c' });
ok(!/wa-activity-tick--count/.test(lone) && !/tick-count/.test(lone), 'a lone mark stays a plain tab');
const stack = demoActTick('output', { stacked: true, id: '6d7a' });
ok((stack.match(/wa-activity-tick /g) || []).length === 2 && /tick-stack/.test(stack),
  'a version flag is still two tabs with no number');

/* The demo rail is styled and positioned from the shared stylesheet. */
const css = fs.readFileSync(path.join(ROOT, 'pages/wise.css'), 'utf8');
ok(/\.dsc-demo \.mi-actstrip \.wa-activity-tick--count \{/.test(css), 'the counted mark has demo geometry');
ok(/\.dsc-demo \.wa-activity-tick-count \{/.test(css), 'the count digit is styled');
['--output', '--count', '-stack', '--prompt'].forEach((k) => {
  ok(new RegExp(`\\.mi-actstrip--count > \\.wa-activity-tick${k.replace(/[-]/g, '\\-')} \\{ top:`).test(css),
    `the contrast rail pins its ${k} mark`);
});

/* Every mark in the new column lines up with a caption. */
const col = spec.slice(spec.indexOf('mi-actstrip--count'));
const colEnd = col.indexOf('</div>\n        </div>');
const marks = (col.slice(0, colEnd).match(/demoActTick\(/g) || []).length;
const caps = (col.slice(0, colEnd).match(/<span>/g) || []).length;
ok(marks === 4 && caps === 3, `three landmark marks plus the jump tab, three captions (got ${marks}/${caps})`);

/* The App Logic page must not still claim outputs are never counted. */
const logic = fs.readFileSync(path.join(ROOT, 'js/app-logic-data.js'), 'utf8');
ok(!/stacked pair, never a count\./.test(logic), 'App Logic no longer says outputs are never counted');
ok(/same ask<\/strong> collapse into a single wider ear-mark/.test(logic), 'App Logic describes the collapse');

console.log(fails ? `\n${fails} check(s) failed\n` : '\nall ear-mark checks passed\n');
process.exit(fails ? 1 : 0);
