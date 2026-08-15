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
 * toggled from the chat's three-dot menu ("Activity strip") and from the shared
 * Appearance popover, which also picks the edge. The strip's CSS is injected
 * from here (ensureActivityStripStyles) so it renders on EVERY page that mounts
 * a chat — no per-page stylesheet block is needed.
 *
 * Ticks are clickable: a click scrolls the transcript to the landmark and
 * flashes it. The pane-resize drag handle shares this edge, but because the rail
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
      /* A solid, readable rail so the strip reads as a continuous edge track the
         ticks ride on — a barely-there line made the ticks look like they were
         floating loose beside the module. Softly rounded on its outer end to sit
         flush against the module's own edge. */
      background: color-mix(in srgb, var(--border-strong, var(--border)) 90%, transparent);
      border-radius: 0 2px 2px 0;
    }
    html.activity-strip-right .wa-activity-strip {
      border-radius: 2px 0 0 2px;
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
    .wa-activity-tick--output   { background-color: var(--act-output, var(--ter-amber, #FFC434)); }
    .wa-activity-tick--source   { background-color: var(--act-source, #12b76a); }
    .wa-activity-tick--database { background-color: var(--act-database, #f79009); }
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
    attributeFilter: ['data-activity'],
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
     the moment the first landmark lands (the MutationObserver re-runs this). */
  const els = messages.querySelectorAll('[data-activity]');
  if (!els.length) {
    strip.style.display = 'none';
    strip.replaceChildren();
    return;
  }
  strip.style.display = '';

  const total = messages.scrollHeight || 1;
  const cRect = messages.getBoundingClientRect();
  /* The rail spans the FULL height of the chat MODULE (#wa-chat), edge to edge —
     it reads as a continuous track stuck to the module's side, not a fragment
     pinned to the transcript. The tick fractions are still computed against the
     transcript's scroll content, but they're mapped into the module's inner band
     (see EARMARK_INSET below) so they never ride over the header or composer. */
  const chatRect = state.chat.getBoundingClientRect();
  const RAIL_W = 3;
  /* Flush to the module's own edge (no inset) so the rail reads as STUCK to the
     left/right side rather than floating a few px inside it. */
  const EDGE_INSET = 0;
  const top = chatRect.top;
  const bottom = chatRect.bottom;
  strip.style.top = `${top}px`;
  strip.style.height = `${Math.max(0, bottom - top)}px`;
  /* Horizontal placement per edge — the rail always hugs the MODULE's own edge
     (just inside it), never a point derived from the transcript's content. The
     transcript can be centered with wide side gutters (the welcome layout, wide
     single-module pages), and pinning to its content box used to strand the
     rail mid-page. */
  if (getActivityStripSide() === 'right') {
    strip.style.left = `${chatRect.right - RAIL_W - EDGE_INSET}px`;
  } else {
    strip.style.left = `${chatRect.left + EDGE_INSET}px`;
  }
  const frag = document.createDocumentFragment();

  /* The rail is full-module-height, but the ear-mark ticks live only in its inner
     80% band (10% padding top + bottom). That padding keeps the ticks off the
     module's rounded corners and clear of the header/composer, WITHOUT clipping
     the rail itself — so the track still reads as edge-to-edge while the marks
     stay within the conversation's usable vertical span. */
  const EARMARK_INSET = 10;
  const EARMARK_SPAN = 100 - EARMARK_INSET * 2;

  els.forEach((el) => {
    const type = el.getAttribute('data-activity');
    const meta = ACTIVITY_TYPES[type];
    if (!meta) return;
    const r = el.getBoundingClientRect();
    /* Absolute center of the landmark within the scroll content (independent of
       the current scrollTop), as a 0–1 fraction of the full transcript. */
    const center = (r.top - cRect.top) + messages.scrollTop + r.height / 2;
    let frac = center / total;
    if (!isFinite(frac)) frac = 0;
    frac = Math.max(0, Math.min(1, frac));

    const tick = document.createElement('span');
    tick.className = `wa-activity-tick wa-activity-tick--${type}`;
    tick.style.top = `${(EARMARK_INSET + frac * EARMARK_SPAN).toFixed(3)}%`;
    tick.title = meta.label;
    tick.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      scrollToLandmark(messages, el);
    });
    /* Stamp the landmark's turn ID beside the tick in tiny type (to the right on
       the left rail, mirrored to the left on the right rail — pure CSS off the
       side class). Only turns that carry an ID (WISEcodeAI answers) get a label;
       standalone event lines like a database switch have none, so we skip them. */
    const turnId = turnIdFor(el);
    if (turnId) {
      const tag = document.createElement('span');
      tag.className = 'wa-activity-tick-id';
      tag.textContent = turnId;
      tick.appendChild(tag);
    }
    frag.appendChild(tick);
  });

  strip.replaceChildren(frag);
}

/* The turn ID a landmark belongs to, as shown in the transcript (e.g. "#6d7a").
   A landmark (an output surface card, a source add) lives inside its answer's
   `.sc-line`; that line's meta row carries the turn handle in `.sc-fb-id`. We
   read it verbatim (leading '#' and all) so the tick's label matches the ID the
   user sees on the answer. Lines without an ID (e.g. a database-switch event)
   return '' and get no label. */
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
  el.classList.remove('wa-activity-flash');
  void el.offsetWidth;
  el.classList.add('wa-activity-flash');
  clearTimeout(el.__waFlashT);
  el.__waFlashT = setTimeout(() => el.classList.remove('wa-activity-flash'), 1600);
}
