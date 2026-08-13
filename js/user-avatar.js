/**
 * Shared user-avatar store.
 *
 * Persists a user-set profile picture (a data URL for device uploads, or a
 * remote image URL) so it shows EVERYWHERE the signed-in member is represented:
 *   • the primary navigation avatar (top bar chip + nav-footer profile chip)
 *   • the "you" bubbles in every WISEcodeAI chat transcript
 *
 * The Organization Profile page writes it; the top bar and chat read it. When
 * cleared, every surface falls back to the member's initials exactly as before.
 *
 * Kept dependency-free so it can be imported from topbar.js, wiseai-chat.js,
 * profile-flow.js and agent-overview.js without any import cycles.
 */

const KEY = 'wise-user-avatar';

/* App default initials, used when a chat "you" bubble or nav chip has no
   captured fallback of its own (e.g. it was first rendered while an avatar was
   already set). Callers can refine this from the resolved identity. */
let defaultInitials = 'AK';

export function setDefaultInitials(initials) {
  if (initials) defaultInitials = String(initials);
}

/** The current avatar source (data URL or remote URL), or null when unset. */
export function getUserAvatar() {
  try { return localStorage.getItem(KEY) || null; } catch { return null; }
}

/**
 * Store (or, with a falsy value, clear) the avatar and notify every surface so
 * already-rendered nav chips and chat bubbles update in place.
 */
export function setUserAvatar(src) {
  try {
    if (src) localStorage.setItem(KEY, src);
    else localStorage.removeItem(KEY);
  } catch { /* storage may be full / unavailable — keep the UI responsive */ }
  broadcast();
}

export function clearUserAvatar() { setUserAvatar(null); }

function escAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** `<img>` markup that fills a circular avatar chip, or '' when no avatar set. */
export function userAvatarImg(alt = 'You') {
  const src = getUserAvatar();
  if (!src) return '';
  return `<img class="wise-avatar-img" src="${escAttr(src)}" alt="${escAttr(alt)}" />`;
}

function broadcast() {
  refreshAvatarsInDom();
  try {
    document.dispatchEvent(new CustomEvent('wise:user-avatar', { detail: { src: getUserAvatar() } }));
  } catch { /* no DOM (SSR / tests) — nothing to notify */ }
}

/**
 * Swap every already-rendered avatar chip (nav + chat) to match the current
 * state. Each chip carries its initials fallback in `data-initials`, so a
 * cleared avatar restores the exact text it had before.
 */
export function refreshAvatarsInDom() {
  const src = getUserAvatar();
  const chips = document.querySelectorAll('.topbar-profile, .menu-footer-avatar, .sc-avatar-you');
  chips.forEach((el) => {
    const init = el.getAttribute('data-initials') || defaultInitials;
    if (src) {
      el.innerHTML = `<img class="wise-avatar-img" src="${escAttr(src)}" alt="" />`;
      el.classList.add('has-avatar-img');
    } else {
      el.textContent = init;
      el.classList.remove('has-avatar-img');
    }
  });
}
