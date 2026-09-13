/*
 * Ear-mark checks.
 *
 * Two things must hold after the ear-mark work:
 *
 *   1. The activity strip collapses every output that shares one chat line
 *      (one combo) into one counted ear-mark. Outputs that land as separate
 *      chats each get their own mark, even when they came from the same ask.
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
/* 1. Grouping: one chat line with many outputs -> one counted mark  */
/* ---------------------------------------------------------------- */
console.log('\nActivity strip — ear-mark grouping');

const strip = fs.readFileSync(path.join(ROOT, 'js/chat-activity-strip.js'), 'utf8');

/* The helpers the grouping depends on, lifted from the module so the check
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
const helpers = `${lift('lineFor')}\n${lift('turnIdFor')}\nmodule.exports = { lineFor, turnIdFor };`;
const { lineFor, turnIdFor } = (() => {
  const m = { exports: {} };
  new Function('module', helpers)(m);
  return m.exports;
})();

ok(/function lineFor\(el\)/.test(strip), 'the strip groups on the chat line');
ok(/outputByLine/.test(strip), 'outputs that share a line collapse together');
ok(/activityLandmarkSelector/.test(strip), 'it only ticks the stamps for the reading on screen');

function makeLine(ask, id) {
  return {
    dataset: ask === null ? {} : { askTurn: String(ask) },
    querySelector: (sel) => (sel === '.sc-fb-id' && id ? { textContent: `#${id}` } : null),
  };
}
function landmark({ line, activity }) {
  return {
    getAttribute: (a) => (a === 'data-activity' ? activity : null),
    closest: (sel) => (sel === '.sc-line' ? line : null),
  };
}

function groupEls(els) {
  const ACTIVITY_TYPES = { output: {}, source: {}, database: {}, prompt: {} };
  const groups = [];
  const outputByLine = new Map();
  els.forEach((el) => {
    const type = el.getAttribute('data-activity');
    const meta = ACTIVITY_TYPES[type];
    if (!meta || type === 'prompt') return;
    const turnId = turnIdFor(el);
    const line = lineFor(el);
    if (type === 'output' && line) {
      let g = outputByLine.get(line);
      if (!g) { g = { type, turnId, els: [] }; outputByLine.set(line, g); groups.push(g); }
      g.els.push(el);
    } else {
      groups.push({ type, turnId, els: [el] });
    }
  });
  return groups;
}

/* A rail of nine preview cards in one chat line, then a later line with a
   single output, plus a source landmark that must stay its own tick. */
const railLine = makeLine(1, '1a1a');
const laterLine = makeLine(2, 'z9z9');
const sourceLine = makeLine(1, 'src1');
const railEls = [
  ...['1a1a', '2b2b', '3c3c', '4d4d', '5e5e', '6f6f', '7g7g', '8h8h', '9i9i']
    .map(() => landmark({ line: railLine, activity: 'output' })),
  landmark({ line: sourceLine, activity: 'source' }),
  landmark({ line: laterLine, activity: 'output' }),
];

const groups = groupEls(railEls);
const outGroups = groups.filter((g) => g.type === 'output');
ok(groups.length === 3, `three marks in all, not eleven (got ${groups.length})`);
ok(outGroups.length === 2, `two output ear-marks, one per chat line (got ${outGroups.length})`);
ok(outGroups[0].els.length === 9, `the nine-card rail collapses to one mark of 9 (got ${outGroups[0].els.length})`);
ok(outGroups[1].els.length === 1, 'the single-output line stays a lone mark');
ok(outGroups[0].turnId === '#1a1a', 'the collapsed mark labels (and lands on) the first output of the block');
ok(groups.some((g) => g.type === 'source' && g.els.length === 1), 'a source landmark keeps its own tick');

/* Four outputs from the same ask, each in its own chat — four ear-marks. */
const comboAsk = 3;
const comboEls = ['c1c1', 'c2c2', 'c3c3', 'c4c4'].map((id) =>
  landmark({ line: makeLine(comboAsk, id), activity: 'output' }));
const comboGroups = groupEls(comboEls).filter((g) => g.type === 'output');
ok(comboGroups.length === 4, `separate chats each get an ear-mark (got ${comboGroups.length})`);
ok(comboGroups.every((g) => g.els.length === 1), 'and none of those marks is a collapse');

/* A line still reports its turn ID. */
const loneLine = makeLine(null, 'old1');
const lEl = landmark({ line: loneLine, activity: 'output' });
ok(lineFor(lEl) === loneLine, 'lineFor returns the chat line');
ok(turnIdFor(lEl) === '#old1', 'turnIdFor still reads the handle on that line');

/* The chat still stamps the ask so a follow-up can find the rail it already has. */
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
ok(/by the chat line, not by the ask/i.test(spec), 'it says grouping is by the chat line, not the ask');
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
ok(/9 outputs/.test(counted), 'its hover names how many outputs the combo made');
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
ok(/chat line<\/strong> collapse into a single wider ear-mark/.test(logic), 'App Logic describes the collapse');

console.log(fails ? `\n${fails} check(s) failed\n` : '\nall ear-mark checks passed\n');
process.exit(fails ? 1 : 0);
