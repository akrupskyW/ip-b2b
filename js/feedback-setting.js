/* ------------------------------------------------------------------ */
/* On-page comments (Appearance ▸ Admin ▸ Comments)                    */
/* ------------------------------------------------------------------ */
/*
 * The Appearance row that switches on-page commenting on or off — press C,
 * click a spot, leave a note pinned to it (js/feedback.js).
 *
 * Unlike every other row in that popover this is NOT a per-browser
 * preference. It is a site-wide gate held by the comment server, because a
 * localStorage flag could never stop a reviewer from commenting, only change
 * what the owner sees. The value is mirrored into localStorage purely so the
 * popover, which builds its markup synchronously, can render the right state
 * without waiting on a round trip; js/feedback.js refreshes that mirror from
 * the server on every page load.
 *
 * The row is locked for everyone except the owner. Holding the feedback admin
 * key (set once by visiting ?feedback=admin&key=…) is what opens it, so the
 * lock is a real gate rather than decoration — the server rejects the write
 * without that key regardless of what the UI allows.
 *
 * Default OFF.
 */

const LS_ON = 'wise-comments-on';
const LS_KEY = 'wise-feedback-key';

/** Last known site-wide state, mirrored from the server by js/feedback.js. */
export function isCommentsOn() {
  try { return localStorage.getItem(LS_ON) === '1'; } catch { return false; }
}

/** True for the site owner — the only person who may flip the row. */
export function isCommentsUnlocked() {
  try { return !!localStorage.getItem(LS_KEY); } catch { return false; }
}

/**
 * Ask the server to switch commenting on or off site-wide, then let the
 * widget raise or tear itself down without a reload.
 * @param {boolean} on
 * @returns {Promise<boolean>} the state the server settled on
 */
export function applyComments(on) {
  const api = typeof window !== 'undefined' && window.WiseFeedback;
  if (!api || typeof api.setEnabled !== 'function') {
    return Promise.resolve(isCommentsOn());
  }
  return api.setEnabled(!!on).catch(() => isCommentsOn());
}
