/**
 * Responsive shell — the viewport tiers the app's layout and defaults read.
 *
 * Two tiers, matching the two breakpoints in pages/wise.css: `phone`
 * (`isPhoneViewport`) and `phone or tablet` (`isNavNarrow`). They live here
 * rather than in each caller so one measurement answers for the nav, the
 * chat's load defaults, and anything added later.
 *
 * The primary navigation is ONE module at every screen size: a vertical rail
 * in the left column of the shell, collapsed to its icons, which expands in
 * place when the member taps a control inside it. A phone and a tablet host
 * the same module a desktop hosts; the rail simply narrows, through the
 * `--nav-rail-*` tokens in pages/wise.css. Nothing here opens, closes or
 * collapses the nav — the nav's own controls own that at every width, so
 * tapping expands on a phone exactly as it does on a desktop.
 *
 * What this module owns is the one thing the viewport is allowed to decide:
 * **the navigation never pivots to a horizontal top bar on a narrow screen.**
 * Pivot Navigation stays a stored preference either way, so at tablet width
 * and below the preference is held back rather than forgotten, and it applies
 * again the moment the window grows past the breakpoint.
 *
 * Callers read `navCanPivot()` before applying pivot and listen for
 * `wise:nav-tier` to re-resolve when the tier flips. Deliberately imports
 * nothing: js/topbar.js, js/agent-menu.js and js/wiseai-chat.js all depend on
 * it, and a shared leaf keeps that out of an import cycle.
 */

/** Widest viewport still treated as "phone or tablet" for the navigation.
    Keep in sync with the responsive nav block in pages/wise.css and with the
    Minimal UI FOUC guard in js/text-size-fouc.js. */
export const NAV_NARROW_MAX_PX = 1024;

/** Widest viewport treated as a phone — "mobile view". Keep in sync with the
    `max-width: 768px` blocks in pages/wise.css, which narrow the nav rail,
    run the chat out to the screen edge, pop History over the page, and
    shrink type by `--wise-phone-type-scale`. */
export const PHONE_MAX_PX = 768;

const NARROW_QUERY = `(max-width: ${NAV_NARROW_MAX_PX}px)`;
const PHONE_QUERY = `(max-width: ${PHONE_MAX_PX}px)`;

/** True when the viewport is a phone or a tablet — narrow enough that the
    navigation must stay a left-side vertical rail. */
export function isNavNarrow() {
  try { return window.matchMedia(NARROW_QUERY).matches; } catch (_) { return false; }
}

/** True when the member's Pivot Navigation preference may actually be applied.
    A narrow viewport keeps the nav vertical whatever the preference says. */
export function navCanPivot() {
  return !isNavNarrow();
}

/** True in mobile view. Read at load by surfaces whose *default* differs on a
    phone — the chat's Helix and its overview cards. A stored preference still
    wins over the tier, so this only decides where a fresh load starts. */
export function isPhoneViewport() {
  try { return window.matchMedia(PHONE_QUERY).matches; } catch (_) { return false; }
}

/* ── Announce tier flips ───────────────────────────────────────────────────
   Moving a window between a desktop display and a narrow one is the only
   thing that can legitimately change which layouts the nav is allowed to
   take, so it is announced once per flip rather than polled. */
let started = false;
let wasNarrow = null;

function announce() {
  const narrow = isNavNarrow();
  if (narrow === wasNarrow) return;
  wasNarrow = narrow;
  try {
    document.dispatchEvent(new CustomEvent('wise:nav-tier', { detail: { narrow } }));
  } catch (_) { /* pre-DOM, nothing listening yet */ }
}

function start() {
  if (started) return;
  started = true;
  wasNarrow = isNavNarrow();
  try {
    window.matchMedia(NARROW_QUERY).addEventListener('change', announce);
  } catch (_) {
    window.addEventListener('resize', announce);
  }
}

if (typeof window !== 'undefined') start();
