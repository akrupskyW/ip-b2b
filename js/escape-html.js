/**
 * Shared HTML escaping and initials.
 *
 * Every flow (and any classic script that reads window.WiseEsc) should
 * import from here instead of pasting another replace-chain. Initials
 * for name chips live here too — same two-letter rule everywhere.
 */

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** First letters of the first two words, uppercased — "?" when empty. */
export function initials(name) {
  return String(name || '').replace(/[^A-Za-z0-9 ]/g, '').trim().split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

if (typeof window !== 'undefined') {
  window.WiseEsc = esc;
  window.WiseInitials = initials;
}
