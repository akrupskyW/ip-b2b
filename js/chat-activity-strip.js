/* ------------------------------------------------------------------ */
/* Chat activity strip                                                 */
/* ------------------------------------------------------------------ */
/*
 * A thin (3px) vertical rail pinned to the far-right edge INSIDE the chat
 * module (#wa-chat), spanning exactly the transcript (messages) area so tick
 * positions read as fractions of the conversation. Along its path it drops a
 * colored tick everywhere the conversation produced a landmark:
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
 * whenever the transcript grows, reflows, or the module resizes. Toggled from
 * the shared Appearance popover ("Activity strip").
 *
 * Ticks are clickable: a click scrolls the transcript to the landmark and
 * flashes it. The pane-resize drag handle shares this edge, but the strip is
 * layered ABOVE the drag overlay (see .wa-activity-strip z-index in wiseai.html)
 * with the rail itself pointer-events:none, so only the ticks intercept while the
 * empty vertical space still falls through to the drag handle. pane-resize.js
 * keeps a click-forwarding fallback for edge cases where a transient stacking
 * context (e.g. the chat's entry-animation transform) drops the strip beneath it.
 */

const LS_KEY = 'wise-activity-strip';
const HTML_CLASS = 'activity-strip-on';

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

export function isActivityStripOn() {
  try {
    return localStorage.getItem(LS_KEY) === '1';
  } catch (_) {
    return false;
  }
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
}

/** Re-apply the saved preference to <html> on load (before any mount). */
export function restoreActivityStrip() {
  document.documentElement.classList.toggle(HTML_CLASS, isActivityStripOn());
}

/**
 * Wire the strip into a chat module. Finds the chat root + its scrolling
 * transcript, then — if the strip is currently on — builds it. Returns the
 * internal state (or null if the chat isn't present).
 *
 * @param {Object} [opts]
 * @param {string} [opts.chatSelector]      Root chat module (position:relative host).
 * @param {string} [opts.messagesSelector]  Scrolling transcript inside the root.
 */
export function mountActivityStrip({
  chatSelector = '#wa-chat',
  messagesSelector = '.chat-messages-area',
} = {}) {
  const chat = document.querySelector(chatSelector);
  if (!chat) return null;
  const messages = chat.querySelector(messagesSelector);
  if (!messages) return null;

  const state = { chat, messages, strip: null, mo: null, ro: null, raf: 0, onResize: null };
  _mounted = state;
  if (isActivityStripOn()) buildStrip(state);
  return state;
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
  state.chat.appendChild(strip);
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

  refresh(state);
}

/* Tear the rail down + stop all watchers. */
function teardownStrip(state) {
  if (state.mo) { state.mo.disconnect(); state.mo = null; }
  if (state.ro) { state.ro.disconnect(); state.ro = null; }
  if (state.onResize) { window.removeEventListener('resize', state.onResize); state.onResize = null; }
  if (state.raf) { cancelAnimationFrame(state.raf); state.raf = 0; }
  if (state.strip) { state.strip.remove(); state.strip = null; }
}

/* Recompute every tick's position from the current transcript. Ticks are cheap
   and few, so we rebuild the set wholesale rather than diffing. */
function refresh(state) {
  const { strip, messages } = state;
  if (!strip || !messages) return;

  const total = messages.scrollHeight || 1;
  const cRect = messages.getBoundingClientRect();
  /* Pin the rail to the TRANSCRIPT area only (not the whole module): the tick
     fractions are computed against the transcript's scroll content, so the
     rail must span exactly that region — otherwise ticks land over the header
     or composer and stop correlating with the conversation. */
  const chatRect = state.chat.getBoundingClientRect();
  strip.style.top = `${Math.max(0, cRect.top - chatRect.top)}px`;
  strip.style.height = `${cRect.height}px`;
  const els = messages.querySelectorAll('[data-activity]');
  const frag = document.createDocumentFragment();

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
    tick.style.top = `${(frac * 100).toFixed(3)}%`;
    tick.title = meta.label;
    tick.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      scrollToLandmark(messages, el);
    });
    frag.appendChild(tick);
  });

  strip.replaceChildren(frag);
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
