/* Render check for the structured member prompt.

   Pulls promptBodyHtml out of js/wiseai-chat.js and the atlas prompt out of
   pages/wiseai.html, then asserts the long prompt renders as paragraphs, bullet
   lists and emphasis — and that an ordinary typed message is still plain,
   escaped text. No browser involved. */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const chatSrc = fs.readFileSync(path.join(ROOT, 'js/wiseai-chat.js'), 'utf8');
const pageSrc = fs.readFileSync(path.join(ROOT, 'pages/wiseai.html'), 'utf8');

/* Lift the formatter out of the shared module, with the one helper it uses. */
const grab = (name) => {
  const start = chatSrc.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`${name} not found in js/wiseai-chat.js`);
  let depth = 0; let i = chatSrc.indexOf('{', start);
  for (let j = i; j < chatSrc.length; j++) {
    if (chatSrc[j] === '{') depth++;
    else if (chatSrc[j] === '}') { depth--; if (!depth) return chatSrc.slice(start, j + 1); }
  }
  throw new Error(`could not bound ${name}`);
};

const ctx = vm.createContext({ console });
vm.runInContext(`
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  ${grab('promptBodyHtml')}
`, ctx);

/* Pull the atlas prompt array out of the page and evaluate just that. */
const askStart = pageSrc.indexOf('const ATLAS_ASK = [');
const askEnd = pageSrc.indexOf("].join('\\n');", askStart);
if (askStart < 0 || askEnd < 0) { console.error('ATLAS_ASK array not found'); process.exit(1); }
const askExpr = pageSrc.slice(askStart + 'const ATLAS_ASK = '.length, askEnd + "].join('\\n')".length);
const ask = vm.runInContext(`(${askExpr})`, ctx);

let pass = 0;
const fails = [];
const ok = (label, cond) => { if (cond) pass++; else fails.push(label); };
const count = (s, re) => (s.match(re) || []).length;

const html = vm.runInContext('promptBodyHtml', ctx)(ask);

/* ── The long prompt becomes a document ─────────────────────────────────── */
ok('prompt is wrapped as a structured prompt', html.startsWith('<div class="sc-prompt">'));
ok('prompt is not one run-on block', count(html, /<p class="sc-prompt-p/g) >= 12);
ok('prompt renders bullet lists', count(html, /<ul class="sc-prompt-list">/g) >= 7);
ok('prompt renders many bullets', count(html, /<li>/g) >= 55);
ok('prompt renders italics', count(html, /<em>/g) >= 12);
ok('prompt renders bold panel lead-ins', count(html, /<strong>/g) >= 6);
ok('the title is italicised', /<em>Food Portfolio Intervention Atlas: Health Impact vs\. Commercial and Operational Reality<\/em>/.test(html));
ok('colon-led lines introduce their list', count(html, /sc-prompt-lead/g) >= 3);
ok('no stray asterisks survive', !/\*/.test(html));

/* ── Every panel is called out as its own bolded block ─────────────────── */
for (const L of ['A', 'B', 'C', 'D', 'E', 'F']) {
  ok(`Panel ${L} has a bold lead-in`, new RegExp(`<strong>Panel ${L} \u2014 [^<]+<\\/strong>`).test(html));
}

/* ── Content survived the restructure ──────────────────────────────────── */
const musts = [
  'Coca-Cola, Pepsi and private-label soda',
  'Reduce added sugar by 20%',
  'Selectively delist the lowest-performing products',
  'implementation feasibility, 0\u2013100',
  'Protection against unhealthy substitution',
  'Adults with diabetes',
  'Customer-retention risk',
  'Use uncertainty intervals rather than unsupported point estimates.',
  'credible enough for a boardroom',
];
musts.forEach((m) => ok(`kept: "${m.slice(0, 44)}"`, html.includes(m.replace(/&/g, '&amp;'))));
ok('the four quadrants are named', /act now/.test(html) && /pilot and measure/.test(html)
  && /commercially easy but medically weak/.test(html) && /high potential but operationally difficult/.test(html));
ok('the causal chain is intact', count(html, /\u2192/g) >= 6);
ok('line styles are still distinguished', /<em>solid<\/em>/.test(html) && /<em>dashed<\/em>/.test(html) && /<em>dotted<\/em>/.test(html));

/* ── Ordinary messages are untouched ───────────────────────────────────── */
const plain = vm.runInContext('promptBodyHtml', ctx);
ok('a typed one-liner stays plain text', plain('How many foods does Sprouts have?') === 'How many foods does Sprouts have?');
ok('a typed one-liner is still escaped', plain('5 < 6 & "quoted"') === '5 &lt; 6 &amp; &quot;quoted&quot;');
ok('a typed asterisk is not turned into emphasis', plain('what does *this* mean?') === 'what does *this* mean?');
ok('empty input stays empty', plain('') === '');
ok('a two-line note becomes two paragraphs', count(plain('first line\nsecond line'), /<p class="sc-prompt-p/g) === 2);
ok('a bare multi-line list becomes a list', /<ul class="sc-prompt-list"><li>a<\/li><li>b<\/li><\/ul>/.test(plain('- a\n- b')));
ok('script tags in a pasted prompt are escaped', plain('<script>x()</script>\nsecond').includes('&lt;script&gt;'));
ok('no raw markup escapes from a pasted prompt', !/<script/i.test(plain('<script>x()</script>\nsecond')));

/* ── The prompt is still usable as plain text elsewhere ────────────────── */
ok('the ask is still a single string', typeof ask === 'string');
ok('the ask collapses to a matchable line', ask.replace(/\s+/g, ' ').trim().toLowerCase().includes('food portfolio intervention atlas'));
ok('the ask carries no markup characters that would leak into a chip label', !/[<>]/.test(ask));

console.log(`\n${pass} assertions passed`);
if (fails.length) {
  console.log(`${fails.length} FAILED:`);
  fails.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log('structured member prompt verified');
