/*
 * Output pacing.
 *
 * One ask can surface ten outputs. They must land one at a time, in call order,
 * so the turn reads as the assistant building one output after another instead
 * of ten preview cards appearing in the same frame. The queue in wiseai.html is
 * lifted out and run against a stub so the ordering and the spacing are checked
 * without a browser.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(ROOT, 'pages/wiseai.html'), 'utf8');
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
