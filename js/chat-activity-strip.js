/* ------------------------------------------------------------------ */
/* Chat activity strip                                                 */
/* ------------------------------------------------------------------ */
/*
 * A thin (3px) vertical rail pinned to one edge of the chat module (#wa-chat) —
 * the LEFT edge by default, or the right edge if chosen — spanning exactly the
 * transcript (messages) area so tick positions read as fractions of the
 * conversation. The rail is mounted at the DOCUMENT-BODY level and positioned
 * with position:fixed, tracking the chat's edge every reflow: #wa-chat carries
 * its own z-index (a stacking context), so a strip mounted INSIDE it would be
 * trapped beneath the body-level pane-resize drag overlay regardless of its own
 * z-index. Living at the body level lets its ticks out-layer the drag handles.
 * Along its path it drops a colored tick everywhere the conversation produced a
 * landmark:
 *
 *   • output   — an output (result / visual / report) was created
 *   • source   — a data source was connected (added)
 *   • database — the active database was switched mid-conversation
 *   • prompt   — brand-blue jump tab, always pinned to the same slot just
 *                above the composer. Clicking it scrolls the transcript to the
 *                top of the last answered prompt (the member line that already
 *                has a completed WISEcodeAI reply). A tiny up-triangle sits
 *                centered in the tab so it reads as "back to that ask".
 *
 * The strip is a compressed "minimap" of the whole transcript: each tick sits
 * at the event's vertical position as a fraction of the total scroll height, so
 * the rail reads top→bottom as the conversation's timeline regardless of where
 * you're currently scrolled.
 *
 * It stays out of the transcript's logic entirely — the chat stamps a stable
 * `data-activity="<type>"` attribute onto each landmark element as it lands, and
 * this module just scans `.chat-messages-area` for those and (re)places ticks
 * whenever the transcript grows, reflows, or the module resizes. ON by default;
 * toggled from the chat's three-dot menu ("Activity strip"), which also picks
 * the edge, and from the shared Appearance popover. The strip's CSS is injected
 * from here (ensureActivityStripStyles) so it renders on EVERY page that mounts
 * a chat — no per-page stylesheet block is needed.
 *
 * Ticks are clickable: a click scrolls the transcript to the landmark and
 * flashes it. When an output has more than one version the tick is drawn as a
 * pair stacked a few pixels apart — two tabs mean "more than one", never three
 * or four. The pane-resize drag handle shares this edge, but because the rail
 * lives at the body level (above the drag overlay — see .wa-activity-strip
 * z-index in wiseai.html) with the rail itself pointer-events:none, only the
 * ticks intercept while the empty vertical space still falls through to the drag
 * handle. pane-resize.js keeps a click-forwarding fallback for any residual
 * edge cases.
 */

const LS_KEY = 'wise-activity-strip';
const HTML_CLASS = 'activity-strip-on';

/* Which edge of the chat module the rail pins to. Persisted separately from the
   on/off state so switching sides never turns the strip off (and vice-versa).
   Defaults to the LEFT edge; the right edge is the opt-in alternative. */
const LS_SIDE_KEY = 'wise-activity-strip-side';
const SIDE_CLASS = { left: 'activity-strip-left', right: 'activity-strip-right' };
const DEFAULT_SIDE = 'left';

/* The landmark types the strip understands, keyed by the value the transcript
   stamps into data-activity. `label` is the hover tooltip; the color lives in
   CSS (var(--act-<type>)) so themes/colorblind palettes can retune it. */
export const ACTIVITY_TYPES = {
  output: { label: 'Output created' },
  source: { label: 'Data source added' },
  database: { label: 'Database switched' },
  prompt: { label: 'Last answered prompt' },
};

/* The single live strip on the page (the chat page mounts exactly one). Kept at
   module scope so the Appearance toggle — which imports applyActivityStrip from
   this same singleton module — can build/tear it down without a handle. */
let _mounted = null;

/* ON by default — only an explicit stored '0' (the user turned it off) keeps
   the strip hidden. */
export function isActivityStripOn() {
  try {
    return localStorage.getItem(LS_KEY) !== '0';
  } catch (_) {
    return true;
  }
}

/** Which edge the rail sits on: 'left' (default) or 'right'. */
export function getActivityStripSide() {
  try {
    return localStorage.getItem(LS_SIDE_KEY) === 'right' ? 'right' : DEFAULT_SIDE;
  } catch (_) {
    return DEFAULT_SIDE;
  }
}

/* Reflect the stored side onto <html> so the CSS pins the rail (and its ticks)
   to the correct edge. Always sets exactly one side class. */
function applySideClass(side) {
  const root = document.documentElement;
  root.classList.toggle(SIDE_CLASS.right, side === 'right');
  root.classList.toggle(SIDE_CLASS.left, side !== 'right');
}

/** Choose which edge the rail pins to. Persists the choice and flags <html>;
    the strip itself is pure CSS off that flag, so no rebuild is needed. */
export function setActivityStripSide(side) {
  const val = side === 'right' ? 'right' : 'left';
  try {
    localStorage.setItem(LS_SIDE_KEY, val);
  } catch (_) { /* storage blocked — session-only */ }
  applySideClass(val);
  /* Tell every open chat menu so their Left/Right segments track the one
     shared setting (same event the on/off toggle broadcasts). */
  try {
    document.dispatchEvent(new CustomEvent('wise:activity-strip', { detail: { on: isActivityStripOn(), side: val } }));
  } catch (_) { /* CustomEvent unavailable — menus resync on next open */ }
}

/** Turn the strip on/off. Persists the choice, flags <html>, and (if the chat
    page has mounted a strip) builds or removes it live. Safe to call anywhere —
    on pages without a chat it just records the preference. */
export function applyActivityStrip(on) {
  const val = !!on;
  try {
    localStorage.setItem(LS_KEY, val ? '1' : '0');
  } catch (_) { /* storage blocked — session-only */ }
  document.documentElement.classList.toggle(HTML_CLASS, val);
  if (_mounted) {
    if (val) buildStrip(_mounted);
    else teardownStrip(_mounted);
  }
  /* Tell every open menu (the chats' three-dot switches, the Appearance
     popover) so their switches track the one shared setting. */
  try {
    document.dispatchEvent(new CustomEvent('wise:activity-strip', { detail: { on: val } }));
  } catch (_) { /* CustomEvent unavailable — menus resync on next open */ }
}

/** Re-apply the saved preferences to <html> on load (before any mount): both the
    on/off flag and the side (left/right) the rail pins to. */
export function restoreActivityStrip() {
  document.documentElement.classList.toggle(HTML_CLASS, isActivityStripOn());
  applySideClass(getActivityStripSide());
}

/**
 * Wire the strip into a chat module. Finds the chat root + its scrolling
 * transcript, then — if the strip is currently on — builds it. Returns the
 * internal state (or null if the chat isn't present). Re-mounting (e.g. a page
 * that mounts explicitly after the shared chat module already self-mounted)
 * tears the previous strip down first, so there is only ever one rail.
 *
 * @param {Object} [opts]
 * @param {string}      [opts.chatSelector]      Root chat module (position:relative host).
 * @param {string}      [opts.messagesSelector]  Scrolling transcript inside the root.
 * @param {HTMLElement} [opts.chatEl]            Chat root as a live element (wins over chatSelector).
 * @param {HTMLElement} [opts.messagesEl]        Transcript as a live element (wins over messagesSelector).
 */
export function mountActivityStrip({
  chatSelector = '#wa-chat',
  messagesSelector = '.chat-messages-area',
  chatEl = null,
  messagesEl = null,
} = {}) {
  const chat = chatEl || document.querySelector(chatSelector);
  if (!chat) return null;
  const messages = messagesEl || chat.querySelector(messagesSelector);
  if (!messages) return null;

  ensureActivityStripStyles();
  if (_mounted) teardownStrip(_mounted);
  const state = { chat, messages, strip: null, mo: null, ro: null, raf: 0, onResize: null, onScroll: null, onAnim: null };
  _mounted = state;
  if (isActivityStripOn()) buildStrip(state);
  return state;
}

/* The strip's full stylesheet, injected once per page so the rail renders on
   EVERY page that mounts a chat (it used to live only in pages/wiseai.html).
   The z-index (70) is deliberate: the rail is body-level position:fixed, so it
   competes directly with the pane-resize drag overlay (.pr-overlay, z-index 60
   in js/pane-resize.js) and its ticks out-layer the drag handles. */
function ensureActivityStripStyles() {
  if (typeof document === 'undefined' || document.getElementById('wa-activity-strip-css')) return;
  const css = `
    .wa-activity-strip {
      position: fixed;
      top: 0;
      left: 0;
      width: 3px;
      height: 100%;
      z-index: 70;
      pointer-events: none;
      /* The strip is sized to the WHOLE chat module (in refresh) and clipped to the
         module's rounded silhouette via clip-path. The module's own overflow:hidden
         can't reach a body-level position:fixed element, so we replicate that clip
         here — letting the rail + ticks run to the very top/bottom edge while their
         ends are trimmed at the rounded corners instead of poking into the
         transparent notch just outside them. */
    }
    /* The visible edge rail: a thin, solid track pinned to the module's chosen side
       that runs the FULL module height (corner to corner) so the ticks read as
       riding a continuous edge line. Its square ends are trimmed by the parent
       strip's clip-path where the module rounds. */
    .wa-activity-rail {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 3px;
      background: color-mix(in srgb, var(--border-strong, var(--border)) 90%, transparent);
    }
    html.activity-strip-right .wa-activity-rail {
      left: auto;
      right: 0;
    }
    /* Ticks are small rectangles that jut out past the 3px rail, so each landmark
       reads as a tab poking out of the strip. On the LEFT edge (default) they sit
       flush-left and jut RIGHT; the right-edge variant below mirrors them. */
    .wa-activity-tick {
      position: absolute;
      left: 0;
      right: auto;
      width: 9px;
      height: 13px;
      transform: translateY(-50%);
      border-radius: 0 4px 4px 0;
      pointer-events: auto;
      cursor: pointer;
      /* A flat fill with just a whisper of top-down shading — enough to read as a
         solid tab with a hint of dimension, without the glossy "bubble" look the
         stronger highlight/shadow gradient gave it. */
      background-image: linear-gradient(155deg,
        color-mix(in srgb, #fff 12%, transparent),
        color-mix(in srgb, #fff 0%, transparent) 55%,
        color-mix(in srgb, #000 6%, transparent));
      box-shadow: 1px 0.5px 1px rgba(0, 0, 0, 0.12);
      transition: width 0.12s ease;
    }
    /* Invisible enlarged hit zone — a 3px sliver is too fine a click target,
       and clicks that land here also get forwarded through the pane-resize
       handle (see pane-resize.js), so the zones must agree. */
    .wa-activity-tick::after {
      content: "";
      position: absolute;
      top: -4px;
      bottom: -4px;
      left: 0;
      right: -8px;
    }
    html.activity-strip-right .wa-activity-tick {
      left: auto;
      right: 0;
      border-radius: 4px 0 0 4px;
      box-shadow: -1px 0.5px 1px rgba(0, 0, 0, 0.12);
    }
    html.activity-strip-right .wa-activity-tick::after {
      left: -8px;
      right: 0;
    }
    .wa-activity-tick:hover { width: 14px; }
    /* Multi-version landmark: two identical tabs stacked so close they read as
       one unit. The second peeks ~4px below the first — a binary "more than
       one" flag, never a count of three or four. */
    .wa-activity-tick-stack {
      position: absolute;
      left: 0;
      right: auto;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      pointer-events: auto;
      cursor: pointer;
    }
    html.activity-strip-right .wa-activity-tick-stack {
      left: auto;
      right: 0;
    }
    .wa-activity-tick-stack .wa-activity-tick,
    html.activity-strip-right .wa-activity-tick-stack .wa-activity-tick {
      position: relative;
      left: auto;
      right: auto;
      transform: none;
      flex: 0 0 auto;
    }
    .wa-activity-tick-stack .wa-activity-tick:first-child { z-index: 1; }
    .wa-activity-tick-stack .wa-activity-tick + .wa-activity-tick { margin-top: -9px; }
    .wa-activity-tick-stack:hover .wa-activity-tick { width: 14px; }
    .wa-activity-tick-stack:hover .wa-activity-tick-id { opacity: 0.9; }
    /* Turn-ID caption riding beside each tick in tiny type — always reads INTO
       the module, never off the rim. Hidden by default so the rail stays clean;
       it fades in only while its tick is hovered (see the :hover rule below). */
    .wa-activity-tick-id {
      position: absolute;
      top: 50%;
      left: 100%;
      transform: translateY(-50%);
      margin-left: 4px;
      font-size: 8px;
      line-height: 1;
      font-weight: 700;
      letter-spacing: 0.02em;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      color: var(--text-muted);
      opacity: 0;
      transition: opacity 0.12s ease;
      pointer-events: none;
      user-select: none;
    }
    .wa-activity-tick:hover .wa-activity-tick-id { opacity: 0.9; }
    html.activity-strip-right .wa-activity-tick-id {
      left: auto;
      right: 100%;
      margin-left: 0;
      margin-right: 4px;
    }
    /* Distinct hues per landmark type (retunable per theme/palette). */
    .wa-activity-tick--output   { background-color: var(--act-output, var(--warm-400, #946005)); }
    .wa-activity-tick--source   { background-color: var(--act-source, #12b76a); }
    .wa-activity-tick--database { background-color: var(--act-database, #f79009); }
    /* Jump-to-last-prompt tab: brand-blue fill, always the same slot on the
       rail (just above the composer). A hair larger than a landmark tick so the
       centered up-triangle stays readable; hover still widens like the others. */
    .wa-activity-tick--prompt {
      background-color: var(--act-prompt, var(--primary, #25507C));
      width: 13px;
      height: 17px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
    }
    .wa-activity-tick--prompt:hover { width: 18px; }
    .wa-activity-tick-tri {
      display: block;
      width: 0;
      height: 0;
      border-left: 2.5px solid transparent;
      border-right: 2.5px solid transparent;
      border-bottom: 3.5px solid #fff;
      pointer-events: none;
      flex: 0 0 auto;
    }
    /* Landing flash on the landmark row a tick scrolls you to. */
    .wa-activity-flash {
      outline: 2px solid transparent;
      outline-offset: 3px;
      border-radius: 8px;
      animation: waActivityFlash 1.4s ease;
    }
    @keyframes waActivityFlash {
      0%, 35% { outline-color: var(--ter-amber, #FFC434); }
      100%    { outline-color: transparent; }
    }
    .wa-activity-flash--prompt { animation-name: waActivityFlashPrompt; }
    @keyframes waActivityFlashPrompt {
      0%, 35% { outline-color: var(--primary, #25507C); }
      100%    { outline-color: transparent; }
    }
    @media (prefers-reduced-motion: reduce) {
      .wa-activity-tick,
      .wa-activity-tick-id { transition: none; }
      .wa-activity-flash { animation: none; }
    }
  `;
  const style = document.createElement('style');
  style.id = 'wa-activity-strip-css';
  style.textContent = css;
  document.head.appendChild(style);
}

/* Build the rail + start watching the transcript. Idempotent: if the strip is
   already up it just recomputes. */
function buildStrip(state) {
  if (state.strip) {
    refresh(state);
    return;
  }
  const strip = document.createElement('div');
  strip.className = 'wa-activity-strip';
  strip.setAttribute('aria-hidden', 'true');
  /* Mount at the body level (NOT inside state.chat): #wa-chat is its own stacking
     context, so a strip nested inside it can't out-layer the body-level
     pane-resize overlay. refresh() positions the rail against the chat's edge. */
  document.body.appendChild(strip);
  state.strip = strip;

  const schedule = () => {
    if (state.raf) return;
    state.raf = requestAnimationFrame(() => {
      state.raf = 0;
      refresh(state);
    });
  };

  /* Transcript grows (new turns), the typewriter mutates text, or a landmark's
     data-activity lands → recompute, coalesced to one pass per frame. */
  state.mo = new MutationObserver(schedule);
  state.mo.observe(state.messages, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['data-activity', 'data-activity-multi'],
  });
  /* Reflow (module resized/docked, width toggle) shifts every position. */
  if (typeof ResizeObserver === 'function') {
    state.ro = new ResizeObserver(schedule);
    state.ro.observe(state.messages);
  }
  state.onResize = schedule;
  window.addEventListener('resize', state.onResize);
  /* The rail is position:fixed at the body level, so it no longer rides along
     with the chat automatically — any scroll or layout animation (the chat's
     entry slide, a pane opening, the sticky-module tuck) shifts the chat's edge
     under it. Re-track on scroll (capture, to catch inner scrollers) and when
     transitions/animations finish. All coalesced to one pass per frame. */
  state.onScroll = schedule;
  window.addEventListener('scroll', state.onScroll, true);
  /* Re-track on outside layout transitions only. We must NOT react to the
     strip's OWN transitions: a tick's `:hover` width grow fires `transitionend`
     here, and re-tracking rebuilds the strip (`refresh` → `replaceChildren`),
     which destroys the hovered tick and recreates it. The fresh tick is still
     under the pointer, so it grows again → fires `transitionend` again → an
     endless grow/rebuild loop (the tick "bounces" on hover). Ignore any event
     originating inside the rail. */
  state.onAnim = (ev) => {
    if (ev && ev.target && state.strip && state.strip.contains(ev.target)) return;
    schedule();
  };
  document.addEventListener('transitionend', state.onAnim, true);
  document.addEventListener('animationend', state.onAnim, true);

  refresh(state);
}

/* Tear the rail down + stop all watchers. */
function teardownStrip(state) {
  if (state.mo) { state.mo.disconnect(); state.mo = null; }
  if (state.ro) { state.ro.disconnect(); state.ro = null; }
  if (state.onResize) { window.removeEventListener('resize', state.onResize); state.onResize = null; }
  if (state.onScroll) { window.removeEventListener('scroll', state.onScroll, true); state.onScroll = null; }
  if (state.onAnim) {
    document.removeEventListener('transitionend', state.onAnim, true);
    document.removeEventListener('animationend', state.onAnim, true);
    state.onAnim = null;
  }
  if (state.raf) { cancelAnimationFrame(state.raf); state.raf = 0; }
  if (state.strip) { state.strip.remove(); state.strip = null; }
}

/* Recompute every tick's position from the current transcript. Ticks are cheap
   and few, so we rebuild the set wholesale rather than diffing. */
function refresh(state) {
  const { strip, messages } = state;
  if (!strip || !messages) return;

  /* Nothing to mark yet (fresh conversation / welcome screen) — keep the rail
     fully hidden rather than drawing an empty line down the module. It appears
     the moment the first landmark lands, or as soon as a prompt has been
     answered (the jump tab needs a home). The MutationObserver re-runs this. */
  const els = messages.querySelectorAll('[data-activity]');
  const promptEl = lastAnsweredPrompt(messages);
  if (!els.length && !promptEl) {
    strip.style.display = 'none';
    strip.replaceChildren();
    return;
  }
  strip.style.display = '';

  const total = messages.scrollHeight || 1;
  const cRect = messages.getBoundingClientRect();
  /* The rail spans the FULL height of the chat MODULE (#wa-chat), corner to corner
     — it reads as a continuous track stuck to the module's side, not a fragment
     pinned to the transcript, and its ends are trimmed right at the module's
     rounded corners by the strip's clip-path (below). The tick fractions are still
     computed against the transcript's scroll content, but they're mapped into the
     module's inner band (see EARMARK_INSET below) so they never ride over the
     header or composer. */
  const chatRect = state.chat.getBoundingClientRect();
  /* Size the strip to the WHOLE module box and clip it to the module's rounded
     silhouette. The rail + ticks live at the module's chosen edge (pure CSS off
     the side class), so a full-box strip still pins them exactly to that edge —
     but now the module's corners can trim the rail's ends. The clip-path mirrors
     the module's per-corner border-radius so the rail runs corner-to-corner yet
     never pokes into the transparent notch just outside a rounded corner. */
  const cs = getComputedStyle(state.chat);
  const tl = parseFloat(cs.borderTopLeftRadius) || 0;
  const tr = parseFloat(cs.borderTopRightRadius) || 0;
  const br = parseFloat(cs.borderBottomRightRadius) || 0;
  const bl = parseFloat(cs.borderBottomLeftRadius) || 0;
  strip.style.top = `${chatRect.top}px`;
  strip.style.left = `${chatRect.left}px`;
  strip.style.width = `${chatRect.width}px`;
  strip.style.height = `${chatRect.height}px`;
  strip.style.clipPath = `inset(0 round ${tl}px ${tr}px ${br}px ${bl}px)`;
  const frag = document.createDocumentFragment();

  /* The visible edge rail runs the full module height inside the clipped strip;
     the ticks are layered over it. */
  const rail = document.createElement('div');
  rail.className = 'wa-activity-rail';
  frag.appendChild(rail);

  /* The rail is full-module-height, but the ear-mark ticks live only in its inner
     80% band (10% padding top + bottom). That padding keeps the ticks off the
     module's rounded corners and clear of the header/composer, WITHOUT clipping
     the rail itself — so the track still reads as edge-to-edge while the marks
     stay within the conversation's usable vertical span. */
  const EARMARK_INSET = 10;
  /* Leave a slot at the bottom of the inner band so landmark ticks never
     sit on top of the brand-blue jump tab (which is pinned just above the
     composer). */
  const JUMP_RESERVE = 6;
  const EARMARK_SPAN = 100 - EARMARK_INSET * 2 - JUMP_RESERVE;

  els.forEach((el) => {
    const type = el.getAttribute('data-activity');
    const meta = ACTIVITY_TYPES[type];
    /* `prompt` is the jump tab, not a mapped landmark. */
    if (!meta || type === 'prompt') return;
    const r = el.getBoundingClientRect();
    /* Absolute center of the landmark within the scroll content (independent of
       the current scrollTop), as a 0–1 fraction of the full transcript. */
    const center = (r.top - cRect.top) + messages.scrollTop + r.height / 2;
    let frac = center / total;
    if (!isFinite(frac)) frac = 0;
    frac = Math.max(0, Math.min(1, frac));

    const top = `${(EARMARK_INSET + frac * EARMARK_SPAN).toFixed(3)}%`;
    const turnId = turnIdFor(el);
    const onClick = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      scrollToLandmark(messages, el);
    };
    /* More than one version on this output → two stacked tabs, never a count.
       Flag comes from the chip (`data-activity-multi`) or the stacked thumbs. */
    const multi = el.hasAttribute('data-activity-multi') || !!el.querySelector('.sc-surface-stack');
    const host = multi ? document.createElement('span') : makeTickEl(type);
    if (multi) {
      host.className = 'wa-activity-tick-stack';
      host.appendChild(makeTickEl(type));
      host.appendChild(makeTickEl(type));
      host.setAttribute('aria-label', `${meta.label}, more than one version`);
    }
    host.style.top = top;
    host.title = multi ? `${meta.label} · more than one version` : meta.label;
    host.addEventListener('click', onClick);
    /* Stamp the landmark's turn ID beside the tick in tiny type (to the right on
       the left rail, mirrored to the left on the right rail — pure CSS off the
       side class). Every landmark that carries an ID gets a label — WISEcodeAI
       answers and database-switch event lines alike (both stamp a `.sc-fb-id`);
       the rare line with no ID returns '' and gets no label. */
    if (turnId) {
      const tag = document.createElement('span');
      tag.className = 'wa-activity-tick-id';
      tag.textContent = turnId;
      host.appendChild(tag);
    }
    frag.appendChild(host);
  });

  if (promptEl) {
    const jump = makePromptTick();
    /* Same place every time: just above the composer, at the bottom of the
       transcript pane. Landmark ticks keep mapping through the inner band;
       this one is chrome, not a minimap mark. */
    const msgRect = messages.getBoundingClientRect();
    const jumpY = msgRect.bottom - chatRect.top - 16;
    jump.style.top = `${Math.max(24, jumpY)}px`;
    jump.title = ACTIVITY_TYPES.prompt.label;
    jump.setAttribute('aria-label', 'Jump to last answered prompt');
    jump.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      scrollToPromptTop(messages, promptEl);
    });
    const tag = document.createElement('span');
    tag.className = 'wa-activity-tick-id';
    tag.textContent = 'Last prompt';
    jump.appendChild(tag);
    frag.appendChild(jump);
  }

  strip.replaceChildren(frag);
}

function makeTickEl(type) {
  const tick = document.createElement('span');
  tick.className = `wa-activity-tick wa-activity-tick--${type}`;
  return tick;
}

/* Brand-blue jump tab — same ear-mark silhouette as a landmark tick, with a
   tiny up-triangle centered in the fill. */
function makePromptTick() {
  const tick = makeTickEl('prompt');
  const tri = document.createElement('span');
  tri.className = 'wa-activity-tick-tri';
  tri.setAttribute('aria-hidden', 'true');
  tick.appendChild(tri);
  return tick;
}

/* The member ask that already has a completed WISEcodeAI reply. Walk the
   transcript in order; the last you-line followed by a finished answer wins.
   Event / trace / typing lines are skipped so a mid-thread switch or an
   in-flight reply never counts as "answered". */
function lastAnsweredPrompt(messages) {
  if (!messages) return null;
  const lines = messages.querySelectorAll('.sc-line');
  let lastYou = null;
  let found = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cls = line.classList;
    if (cls.contains('sc-line-event') || cls.contains('sc-line-trace')) continue;
    if (cls.contains('sc-line-you')) {
      lastYou = line;
      continue;
    }
    if (lastYou && cls.contains('sc-line-wiseai') && !cls.contains('sc-line-typing')) {
      found = lastYou;
    }
  }
  return found;
}

/* The turn ID a landmark belongs to, as shown in the transcript (e.g. "#6d7a").
   A landmark (an output surface card, a source add) lives inside its answer's
   `.sc-line`; that line's meta row carries the turn handle in `.sc-fb-id`. We
   read it verbatim (leading '#' and all) so the tick's label matches the ID the
   user sees on the answer (and now on database-switch event lines, which stamp
   their own `.sc-fb-id`). Lines without an ID return '' and get no label. */
function turnIdFor(el) {
  const line = el.closest && el.closest('.sc-line');
  if (!line) return '';
  const idEl = line.querySelector('.sc-fb-id');
  if (!idEl) return '';
  return (idEl.textContent || '').trim();
}

/* Bring a landmark into view (centered in the transcript's scrollport) and
   flash it so the eye lands on the right row. */
function scrollToLandmark(messages, el) {
  if (!el || !messages.contains(el)) return;
  const cRect = messages.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const top = (r.top - cRect.top) + messages.scrollTop
    - Math.max(0, (messages.clientHeight - r.height) / 2);
  const reduce = typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;
  messages.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });

  /* Restart the flash even if the same landmark is clicked twice in a row. */
  flashLandmark(el);
}

/* Pin the last answered prompt to the TOP of the transcript viewport (not
   centered — the ask is the thing you want to re-read from the start). */
function scrollToPromptTop(messages, el) {
  if (!el || !messages.contains(el)) return;
  const cRect = messages.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const pad = 8;
  const top = (r.top - cRect.top) + messages.scrollTop - pad;
  const reduce = typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;
  messages.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
  flashLandmark(el, 'prompt');
}

function flashLandmark(el, kind) {
  el.classList.remove('wa-activity-flash', 'wa-activity-flash--prompt');
  void el.offsetWidth;
  el.classList.add('wa-activity-flash');
  if (kind === 'prompt') el.classList.add('wa-activity-flash--prompt');
  clearTimeout(el.__waFlashT);
  el.__waFlashT = setTimeout(() => {
    el.classList.remove('wa-activity-flash', 'wa-activity-flash--prompt');
  }, 1600);
}
