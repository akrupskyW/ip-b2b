/*
 * Output pacing.
 *
 * One ask can surface ten outputs. They must land one at a time, in call order,
 * so the turn reads as the assistant building one output after another instead
 * of ten preview cards appearing in the same frame. The queue in wiseai.html is
 * lifted out and run against a stub so the ordering and the spacing are checked
 * without a browser.
 *
 * The queue is also one link in a longer chain — prompt, thinking, answer,
 * outputs, chips, each waiting for the one before it (see the turn-stage-order
 * rule). The gates that hold that chain together are checked here too.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(ROOT, 'pages/wiseai.html'), 'utf8');
const chat = fs.readFileSync(path.join(ROOT, 'js/wiseai-chat.js'), 'utf8');
let fails = 0;
const ok = (cond, msg) => {
  if (cond) console.log(`  ok   ${msg}`);
  else { console.log(`  FAIL ${msg}`); fails += 1; }
};

console.log('\nOutput pacing — wiring');

ok(/const SURFACE_STEP_MS = \d+;/.test(page), 'a step interval is defined');
ok(/function surfaceBlock\(which, opts\) \{/.test(page), 'surfaceBlock is the queueing entry point');
ok(/function postSurfaceBlock\(which, \{/.test(page), 'the real work moved to postSurfaceBlock');
ok(/prefers-reduced-motion: reduce/.test(page.slice(page.indexOf('function surfaceBlock(which, opts)'), page.indexOf('function postSurfaceBlock'))),
  'reduced motion posts straight through instead of pacing');

/* Nothing may bypass the queue: postSurfaceBlock is called only by the pump and
   the reduced-motion path, never by a feature. */
const postCalls = (page.match(/postSurfaceBlock\(/g) || []).length;
ok(postCalls === 3, `postSurfaceBlock is referenced 3 times — its definition, the pump, reduced motion (got ${postCalls})`);
ok(!/\n\s*postSurfaceBlock\('(visuals|results|unified)'/.test(page), 'no feature posts an output directly');

/* Every atlas output goes through the paced path. */
const panels = page.slice(page.indexOf('function surfaceAtlasPanels'), page.indexOf('function atlasReadout'));
ok(/surfaceBlock\('visuals'/.test(panels) && /surfaceBlock\('results'/.test(panels),
  'the atlas panels surface through the queue');
ok(/railLead:/.test(panels) && /\$\{n\} outputs/.test(panels),
  'the first atlas rail is introduced by a count line');
ok(/fullTurn/.test(panels) && /ATLAS_PANELS\.length \+ 1/.test(panels),
  'the first atlas turn counts six charts, the closing read, and three Results outputs');
ok(!/inTranscript:\s*false/.test(panels),
  'every atlas output is a transcript chip — none stay pane-only');
ok(/surfaceNewsRefs\('atlas_refs'/.test(panels),
  'the tenth output is the references card');

console.log('\nTurn stages — one waits for the one before it');

/* The gates themselves. */
ok(/function makeStageGate\(ceilingMs\)/.test(chat), 'one gate builder serves every stage');
ok(/const promptStage = makeStageGate\(/.test(chat)
  && /const answerStage = makeStageGate\(/.test(chat)
  && /const outputStage = makeStageGate\(/.test(chat),
  'prompt, answer and output each have their own gate');
ok(/timer = setTimeout\(release, ceilingMs\)/.test(chat),
  'each gate carries a ceiling, so a stage that never reports finished cannot strand the turn');
ok(/if \(!held\) \{ fn\(\); return; \}/.test(chat),
  'and runs straight through when nothing is in flight — a short message waits for nothing');

/* Stage 1 → 2: the member's prompt finishes before WISEcodeAI starts thinking. */
const addUserSrc = chat.slice(chat.indexOf('function addUser(text, atts)'),
  chat.indexOf('/* Actions row appended beneath a WISEcodeAI answer.'));
ok(/promptStage\.hold\(\)/.test(addUserSrc), 'posting a member line holds the prompt stage');
ok(/promptStage\.release\(\)/.test(addUserSrc), 'and the reveal finishing lets it go');
ok(/promptStage\.after\(\(\) => \{\s*runReasoningTrace\(/.test(chat),
  'the reasoning trace waits for the prompt — no thinking on top of a brief still fading in');

/* Stage 3 → 4: the outputs an answer produced wait for that answer. */
ok(/answerStage\.hold\(\);/.test(chat), 'the answer stage is held before the host queues its outputs');
ok(/const answerLanded = \(\) => \{ if \(trailChips\) answerStage\.release\(\); \}/.test(chat),
  'and released the moment the answer line has landed');
ok(/function afterAnswerSettles\(fn\)/.test(page) && /afterAnswerSettles\(step\);/.test(page),
  'the output queue starts pumping through that gate, not on its own');

/* Stage 4 → 5: the chips that close the turn wait for the last output. */
ok(/outputStage\.after\(\(\) => \{\s*parkInlineChips\(\);/.test(chat),
  'the closing intent chips wait for the outputs, so a rail cannot shove them down');
ok(/const hold = chatStage\('holdOutputs'\);/.test(page), 'the host claims the output stage as the turn starts surfacing');
ok(/if \(!next\) \{ surfacePumping = false; releaseOutputStage\(\); return; \}/.test(page),
  'and gives it back when the queue runs dry');
ok(/if \(!surfacePumping\) releaseOutputStage\(\);/.test(page),
  'a turn that surfaced nothing gives it back immediately rather than leaving the chips waiting');

console.log('\nOutputs wait to be opened');

/* An output arriving is not a request to look at it: the turn writes its blocks
   into a pane that stays shut, and only the member's tap opens it. */
ok(/function openOutputPane\(dest\)/.test(page), 'one door opens an output pane');
ok(!/openModuleByDefault: true/.test(page),
  'no answer opens a module on its own the moment it lands');

/* Nothing on the surfacing path may reach the opener. */
const surfacePath = [
  ['postSurfaceBlock', page.indexOf('function postSurfaceBlock(which, {')],
  ['insertAllVersionSlides', page.indexOf('function insertAllVersionSlides(')],
].filter(([, i]) => i > -1);
surfacePath.forEach(([name, start]) => {
  const body = page.slice(start, page.indexOf('\n    }', start));
  ok(!/openOutputPane\(|ensurePaneOpen\(/.test(body),
    `${name} writes the output without opening the pane`);
});

/* Every opener is a member action: the output card, a version thumbnail, a
   footnote, expand. `openPane` only opens when a caller asks for it. */
ok(/function openPane\(which, \{ html, title, meta, open = false \} = \{\}\)/.test(page),
  'openPane leaves the pane shut unless the caller passes open');
const openers = (page.match(/openOutputPane\(/g) || []).length;
ok(openers >= 6, `the member-driven openers all route through it (got ${openers})`);

console.log('\nOutput pacing — behaviour');

/* Lift the queue and run it with a stub post + fake clock. */
const from = page.indexOf('const SURFACE_STEP_MS');
const to = page.indexOf('/* Open (or refresh) a pane block AND mirror it as an inline preview card. */', from);
const src = page.slice(from, to);

const timers = [];
const posted = [];
const sandbox = {
  matchMedia: () => ({ matches: false }),
  setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
  postSurfaceBlock: (which, o) => posted.push(`${which}:${o.title}`),
};
const make = new Function('matchMedia', 'setTimeout', 'postSurfaceBlock',
  `${src}; return surfaceBlock;`);
const surfaceBlock = make(sandbox.matchMedia, sandbox.setTimeout, sandbox.postSurfaceBlock);

/* Ten outputs queued in one tick, the way the atlas surfaces them. */
const titles = ['A', 'B', 'C', 'D', 'E', 'F', 'Close', 'Baseline', 'PL share', 'References'];
titles.forEach((t, i) => surfaceBlock(i < 6 ? 'visuals' : 'results', { title: t }));

ok(posted.length === 1, `only the first output posts in the opening tick (got ${posted.length})`);
ok(posted[0] === 'visuals:A', 'and it is the first one queued');

/* Drain the fake clock one step at a time. */
const step = Number((src.match(/const SURFACE_STEP_MS = (\d+)/) || [])[1]);
ok(step >= 200 && step <= 900, `the step is a visible beat, not a stall (${step}ms)`);
let guard = 0;
const spacings = [];
while (timers.length && guard < 100) {
  guard += 1;
  const t = timers.shift();
  spacings.push(t.ms);
  t.fn();
}
ok(spacings.length && spacings.every((ms) => ms === step), `every output waits one ${step}ms beat (${spacings.length} steps)`);
ok(posted.length === 10, `all ten outputs post (got ${posted.length})`);
ok(posted.join(' | ') === titles.map((t, i) => `${i < 6 ? 'visuals' : 'results'}:${t}`).join(' | '),
  'and they post in the order they were asked for');

/* A later, separate ask must not be starved by a drained queue. */
posted.length = 0;
surfaceBlock('results', { title: 'Later ask' });
ok(posted.length === 1 && posted[0] === 'results:Later ask', 'a fresh ask starts posting immediately again');
while (timers.length && guard < 200) { guard += 1; timers.shift().fn(); }

/* Reduced motion skips the pacing entirely. */
const rm = new Function('matchMedia', 'setTimeout', 'postSurfaceBlock', `${src}; return surfaceBlock;`)(
  () => ({ matches: true }), () => {}, sandbox.postSurfaceBlock,
);
posted.length = 0;
['x', 'y', 'z'].forEach((t) => rm('visuals', { title: t }));
ok(posted.length === 3, 'reduced motion posts every output at once (got ' + posted.length + ')');

console.log(fails ? `\n${fails} check(s) failed\n` : '\nall output pacing checks passed\n');
process.exit(fails ? 1 : 0);
