/**
 * Responsive primary navigation — the viewport tier the nav layout reads.
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
 * nothing: js/topbar.js and js/agent-menu.js both depend on it, and a shared
 * leaf keeps that out of an import cycle.
 */

/** Widest viewport still treated as "phone or tablet" for the navigation.
    Keep in sync with the responsive nav block in pages/wise.css and with the
    Minimal UI FOUC guard in js/text-size-fouc.js. */
export const NAV_NARROW_MAX_PX = 1024;

const NARROW_QUERY = `(max-width: ${NAV_NARROW_MAX_PX}px)`;

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
