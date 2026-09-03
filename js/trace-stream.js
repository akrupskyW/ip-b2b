/**
 * Streaming trace — the "Thinking" block a WISEcodeAI turn draws before its
 * answer lands. This is the ONE implementation: the shared chat
 * (`js/wiseai-chat.js`) and the hand-rolled Add / View Product flow
 * (`js/add-product-flow.js`) both run it, so no surface can drift back to a
 * bare spinner-and-label beat.
 *
 *   import { runTraceStream } from './trace-stream.js';
 *   runTraceStream({ messages, avatarHtml, milestones, done, ... });
 *
 * Classic (non-module) hosts read the same entry point off
 * `window.WiseTraceStream.run`, which this module registers on load.
 *
 * Requires the trace styles in pages/wise.css (.sc-trace*).
 */

import { esc } from './escape-html.js';
import {
  makeTraceHelix,
  TRACE_STRAND_MARKUP,
  stretchTraceHelixToNextAvatar,
  dismissTraceHelix,
} from './trace-helix.js';

/* Format a millisecond span as a live m:ss stopwatch (0:04, 1:12). */
export function fmtTraceClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/* Stream the behind-the-scenes streaming trace for a turn, then hand off to
   `done()` (which posts the real answer). Instead of the answer landing the
   instant you ask, the transcript first "thinks out loud":

     • A live m:ss stopwatch ticks in the header the whole time.
     • Each milestone is a 1–3 word key with a big GLOB of subdued story text
       that streams in line by line beneath it. The globs BUILD ON EACH OTHER —
       a new milestone is appended below the last, growing one continuous
       narrative you can read top-to-bottom, never stopping to wipe & reset.
     • Delays are deliberately variable so no two turns feel identical.

   When the last milestone lands, the helix is gone and the live block is
   replaced by the quiet SUMMARY: each milestone's key + the m:ss elapsed when
   it landed, the header reading "Worked for m:ss". Collapsible via the header.

   cfg:
     messages     {HTMLElement} the transcript the trace line is appended to
     avatarHtml   {string}      the host's owl avatar span
     milestones   {Array}       [{ key, story: [string | {html}] }]
     done         {Function}    posts the answer once the trace completes
     tail         {object}      optional closing "assembling" milestone
     sourceLine   {string}      optional closing grounding line (HTML)
     streamOn     {boolean}     the shared "Response streaming" preference
     streamLevel  {string}      'full' | 'steps' | 'final'
     prefersReducedMotion {boolean}
     scrollDown   {Function}    the host's transcript scroller
     showTyping   {Function}    the host's brief typing line, for 'final'
     onStart      {Function}    host hook fired before the trace is appended
                                (e.g. detaching inline chips)

   Returns a handle with `cancel()` — a host that tears its transcript down
   mid-thought (Start new conversation) stops the trace instead of leaving its
   stopwatch ticking against a detached line. */
export function runTraceStream(cfg) {
  const conf = cfg || {};
  const messages = conf.messages;
  const doneFn = typeof conf.done === 'function' ? conf.done : null;
  const scrollDown = typeof conf.scrollDown === 'function' ? conf.scrollDown : () => {};
  const prefersReducedMotion = !!conf.prefersReducedMotion;
  const streamOn = conf.streamOn !== false;
  const streamLevel = conf.streamLevel || 'full';
  const tail = conf.tail;
  const sourceLine = conf.sourceLine;

  /* Every timer this trace owns, so cancel() can stop the whole thing. */
  const timers = new Set();
  let stopped = false;
  let helix = null;
  const later = (fn, ms) => {
    const t = setTimeout(() => { timers.delete(t); if (!stopped) fn(); }, ms);
    timers.add(t);
    return t;
  };
  const handle = {
    cancel() {
      stopped = true;
      timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
      timers.clear();
      try { if (helix) helix.destroy(); } catch (_) { /* already gone */ }
    },
  };
  const done = doneFn ? () => { if (!stopped) doneFn(); } : null;

  if (!messages) { if (done) done(); return handle; }
  if (typeof conf.onStart === 'function') conf.onStart();
  /* Streaming switched OFF — no trace, no thinking beat: the answer lands
     right away (one frame's delay keeps the transcript's ordering intact). */
  if (!streamOn) {
    later(() => { if (done) done(); }, prefersReducedMotion ? 0 : 120);
    return handle;
  }
  /* "Final message only" — skip the reasoning trace entirely. A brief thinking
     beat (the standard typing line) stands in for the work, then the answer
     lands. No milestone steps, no glob story text. */
  if (streamLevel === 'final') {
    const typing = typeof conf.showTyping === 'function' ? conf.showTyping() : null;
    const wait = prefersReducedMotion ? 240 : 460 + Math.random() * 520;
    later(() => { if (typing) typing.remove(); if (done) done(); }, wait);
    return handle;
  }
  /* "Steps only" — show the milestone STEPS as they land, but suppress the
     subdued glob story text that normally streams in beneath each one. */
  const showGlobs = streamLevel !== 'steps';
  const steps = (Array.isArray(conf.milestones) && conf.milestones.length)
    ? conf.milestones.slice() : [{ key: 'Thinking', story: ['Gathering the details.'] }];
  /* A trailing "assembling" milestone (built from what the answer will contain)
     so the globs keep narrating the pieces being laid out — and nothing loads
     until they're done. */
  if (tail && tail.key) steps.push(tail);

  /* The strand rail lives in the owl-avatar column. A single .sc-trace-dna
     host carries the live SVG helix: it spins (twists) while thinking, then
     is removed when the summary lands. */
  const el = document.createElement('div');
  el.className = 'sc-line sc-line-wiseai sc-line-typing sc-line-trace';
  el.innerHTML = (conf.avatarHtml || '')
    + `<div class="sc-line-body"><div class="sc-trace" data-open="1">`
    + `<button type="button" class="sc-trace-head" aria-expanded="true">`
    + `<span class="sc-trace-title">Thinking</span>`
    + `<span class="sc-trace-timer" aria-hidden="true">0:00</span>`
    + `<span class="sc-trace-caret material-symbols-outlined" aria-hidden="true">chevron_right</span>`
    + `</button><div class="sc-trace-body">${TRACE_STRAND_MARKUP}</div></div></div>`;
  messages.appendChild(el);
  scrollDown();

  const start = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const now = () => ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - start;
  const trace = el.querySelector('.sc-trace');
  const head = el.querySelector('.sc-trace-head');
  const titleEl = el.querySelector('.sc-trace-title');
  const timerEl = el.querySelector('.sc-trace-timer');
  const bodyEl = el.querySelector('.sc-trace-body');

  /* The helix controller for this trace — starts spinning right away and is
     re-pointed at the summary strand after the body is rebuilt. */
  helix = makeTraceHelix(bodyEl, { prefersReducedMotion });
  helix.startLive();
  stretchTraceHelixToNextAvatar(el);
  helix.refresh();

  /* The header collapses the whole trace (live glob or final summary) and back. */
  head.addEventListener('click', () => {
    const open = trace.getAttribute('data-open') === '1';
    trace.setAttribute('data-open', open ? '0' : '1');
    head.setAttribute('aria-expanded', open ? 'false' : 'true');
    scrollDown();
  });

  const rnd = (a, b) => a + Math.random() * (b - a);
  /* The landmarks we've passed — key + the clock reading when each landed.
     Only surfaced at the very end, as the summary. */
  const landmarks = [];
  /* The summary: milestone list. The helix stays just long enough to reach
     the answer owl below, then fades — keys sit on the transcript's left edge. */
  const stepsHtml = () => `<ul class="sc-trace-steps">${landmarks.map((l) =>
    `<li class="sc-trace-step is-revealed">`
    + `<span class="sc-trace-step-key">${esc(l.key)}</span>`
    + `<span class="sc-trace-step-time" aria-hidden="true">${esc(l.time)}</span></li>`).join('')}</ul>`;

  const landSummary = (extraHtml) => {
    helix.stop();
    bodyEl.innerHTML = TRACE_STRAND_MARKUP + (extraHtml || '') + stepsHtml();
    titleEl.textContent = `Worked for ${landmarks.length ? landmarks[landmarks.length - 1].time : fmtTraceClock(now())}`;
    timerEl.textContent = `${landmarks.length} step${landmarks.length === 1 ? '' : 's'}`;
    trace.classList.add('is-complete');
    el.classList.remove('sc-line-typing');
    scrollDown();
    if (done) done();
    requestAnimationFrame(() => {
      stretchTraceHelixToNextAvatar(el);
      helix.refresh();
      scrollDown();
    });
    dismissTraceHelix(helix, bodyEl, {
      holdMs: prefersReducedMotion ? 0 : 720,
      fadeMs: prefersReducedMotion ? 0 : 400,
    });
  };

  /* Reduced motion: skip the live streaming, show the finished summary at once
     with plausible stamps, then answer after a short beat. */
  if (prefersReducedMotion) {
    let acc = 0;
    steps.forEach((m) => { acc += 900 + Math.round(Math.random() * 1400); landmarks.push({ key: m.key, time: fmtTraceClock(acc) }); });
    const srcHtml = sourceLine
      ? `<div class="sc-trace-story"><span class="sc-trace-story-line sc-trace-story-source is-in">${sourceLine}</span></div>` : '';
    landSummary(srcHtml);
    return handle;
  }

  const timer = setInterval(() => { timerEl.textContent = fmtTraceClock(now()); }, 200);
  timers.add(timer);
  let mi = 0;

  const finish = () => {
    clearInterval(timer);
    timers.delete(timer);
    landSummary('');
  };

  const runMilestone = () => {
    if (mi >= steps.length) { finish(); return; }
    const m = steps[mi];
    /* Append a NEW milestone block BELOW the previous ones — the globs build
       on each other into one continuous, growing narrative rather than each
       status wiping the last. No inline spinner: the owl avatar to the left
       already carries the "working" ring, so a status is just its key + glob.
       Completed blocks get `is-done` so the live one can be told apart. */
    const block = document.createElement('div');
    block.className = 'sc-trace-live';
    block.innerHTML = `<div class="sc-trace-now"><span class="sc-trace-now-key">${esc(m.key)}</span></div>`
      + `<div class="sc-trace-story"></div>`;
    bodyEl.appendChild(block);
    stretchTraceHelixToNextAvatar(el);
    helix.refresh();
    scrollDown();
    const storyEl = block.querySelector('.sc-trace-story');
    /* Steps-only mode drops the glob story text (and the trailing grounding
       line) so the trace reads as a clean list of steps landing one by one. */
    const lines = showGlobs ? (m.story || []).slice() : [];
    /* The very last glob line of the whole trace names the data source the
       answer is grounded in (rendered as HTML so the source reads in bold). */
    if (showGlobs && mi === steps.length - 1 && sourceLine) lines.push({ html: sourceLine });
    let si = 0;
    const streamLine = () => {
      if (si >= lines.length) {
        block.classList.add('is-done');
        landmarks.push({ key: m.key, time: fmtTraceClock(now()) });
        mi += 1;
        /* Keep the flow continuous — a short beat, not a full stop, so the
           next glob starts building right where the last one left off. In
           steps-only mode there's no glob to read, so hold each step a touch
           longer instead, keeping the sequence legible. */
        later(runMilestone, showGlobs ? rnd(140, 320) : rnd(360, 640));
        return;
      }
      const line = lines[si];
      const sp = document.createElement('span');
      sp.className = 'sc-trace-story-line';
      if (line && typeof line === 'object' && line.html) {
        sp.innerHTML = line.html;
        sp.classList.add('sc-trace-story-source');
      } else {
        sp.textContent = line;
      }
      storyEl.appendChild(sp);
      requestAnimationFrame(() => sp.classList.add('is-in'));
      scrollDown();
      si += 1;
      later(streamLine, rnd(300, 720));
    };
    later(streamLine, rnd(120, 300));
  };

  later(runMilestone, rnd(220, 520));
  return handle;
}

if (typeof window !== 'undefined') {
  window.WiseTraceStream = { run: runTraceStream, fmtClock: fmtTraceClock };
}
