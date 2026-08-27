/**
 * Shared user-avatar store.
 *
 * Persists a user-set profile picture (a data URL for device uploads, or a
 * remote image URL) so it shows EVERYWHERE the signed-in member is represented:
 *   • the primary navigation avatar (top bar chip + nav-footer profile chip)
 *   • the "you" bubbles in every WISEcodeAI chat transcript
 *
 * The Organization Profile page writes it; every other surface reads it. When
 * cleared, every surface falls back to the member's initials exactly as before.
 *
 * Kept dependency-free so it can be imported from topbar.js, wiseai-chat.js,
 * and profile-flow.js without any import cycles. Also exposed as
 * window.WiseUserAvatar so classic (non-module) chats can render the same
 * picture. A load-time sweep plus a DOM observer keep chips in sync even when
 * a page inserts initials and never asks the store itself.
 */

const KEY = 'wise-user-avatar';
const CHIP_SEL = '.topbar-profile, .menu-footer-avatar, .sc-avatar-you';
/* Design-system samples on all-modules.html must keep their staged initials. */
const SKIP_SEL = '.dsc-demo, [data-avatar-static]';

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

/**
 * Inner HTML + pictured flag for a "you" chip: the photo when set, otherwise
 * `fallback` initials. Classic scripts use the same shape via window.WiseUserAvatar.
 */
export function userAvatarMarkup(alt = 'You', fallback) {
  const img = userAvatarImg(alt);
  const init = fallback == null || fallback === '' ? defaultInitials : String(fallback);
  return { inner: img || init, pictured: !!img, initials: init };
}

/** Full `<span class="sc-avatar sc-avatar-you">` markup for inline / classic chats. */
export function userAvatarSpan(alt = 'You', fallback) {
  const m = userAvatarMarkup(alt, fallback);
  return `<span class="sc-avatar sc-avatar-you${m.pictured ? ' has-avatar-img' : ''}" role="img" aria-label="${escAttr(alt)}" data-initials="${escAttr(m.initials)}">${m.inner}</span>`;
}

function broadcast() {
  refreshAvatarsInDom();
  try {
    document.dispatchEvent(new CustomEvent('wise:user-avatar', { detail: { src: getUserAvatar() } }));
  } catch { /* no DOM (SSR / tests) — nothing to notify */ }
}

function isLiveChip(el) {
  return el && el.nodeType === 1 && !el.closest(SKIP_SEL);
}

function readInitials(el) {
  const stored = el.getAttribute('data-initials');
  if (stored) return stored;
  if (!el.querySelector('img')) {
    const text = (el.textContent || '').trim();
    if (text) {
      el.setAttribute('data-initials', text);
      return text;
    }
  }
  return defaultInitials;
}

function chipIsCurrent(el, src) {
  if (src) {
    const img = el.querySelector('img.wise-avatar-img, img');
    return !!(img && img.getAttribute('src') === src && el.classList.contains('has-avatar-img'));
  }
  return !el.classList.contains('has-avatar-img') && !el.querySelector('img.wise-avatar-img');
}

/**
 * Swap every already-rendered avatar chip (nav + chat) to match the current
 * state. Each chip carries its initials fallback in `data-initials`, so a
 * cleared avatar restores the exact text it had before.
 */
export function refreshAvatarsInDom() {
  if (typeof document === 'undefined' || !document.querySelectorAll) return;
  const src = getUserAvatar();
  document.querySelectorAll(CHIP_SEL).forEach((el) => {
    if (!isLiveChip(el)) return;
    if (chipIsCurrent(el, src)) return;
    const init = readInitials(el);
    if (src) {
      el.innerHTML = `<img class="wise-avatar-img" src="${escAttr(src)}" alt="" />`;
      el.classList.add('has-avatar-img');
    } else {
      el.textContent = init;
      el.classList.remove('has-avatar-img');
    }
  });
}

function nodeHasChip(node) {
  if (!node || node.nodeType !== 1) return false;
  return node.matches?.(CHIP_SEL) || !!node.querySelector?.(CHIP_SEL);
}

function watchDom() {
  if (typeof MutationObserver === 'undefined' || !document.documentElement) return;
  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const n of m.addedNodes) {
        if (nodeHasChip(n)) {
          refreshAvatarsInDom();
          return;
        }
      }
    }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
}

function boot() {
  refreshAvatarsInDom();
  watchDom();
}

try {
  if (typeof window !== 'undefined') {
    window.WiseUserAvatar = {
      KEY,
      get: getUserAvatar,
      set: setUserAvatar,
      clear: clearUserAvatar,
      img: userAvatarImg,
      markup: userAvatarMarkup,
      span: userAvatarSpan,
      refresh: refreshAvatarsInDom,
    };
    window.addEventListener('storage', (e) => {
      if (e.key === KEY || e.key === null) refreshAvatarsInDom();
    });
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  }
} catch { /* no window / document (SSR / tests) */ }
