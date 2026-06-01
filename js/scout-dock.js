/**
 * Scout Dock — the persistent, uniform home for the shared Scout chat.
 *
 * Every page that shows Scout as a right-rail module mounts it through here
 * instead of calling mountScoutChat() directly. That gives the dock ONE
 * source of truth for its place + size, persisted in localStorage, so Scout
 * is always in the exact same spot and at the exact same width as the page
 * you just left — uniform across the whole app.
 *
 * Persisted state (key `wise-scout-dock`):
 *   { wide: boolean, side: 'left' | 'center' | 'right' }
 *     • wide → the doubled-width column (also bridged to ai-chat.html's
 *              #chat-shell so "Scout is wide" carries everywhere).
 *     • side → where the Doc chat sits, the Appearance control's three modes:
 *              'left'/'right' pin the dock to that edge of the modules row;
 *              'center' un-pins it (the chat returns to its natural, centered
 *              position — which on the side-dock pages means the rail isn't
 *              shown, and on ai-chat is simply the centre column it already is).
 *
 *   import { mountScoutDock } from './scout-dock.js';
 *   mountScoutDock(document.getElementById('scout-dock-panel'), { ... });
 */

import { mountScoutChat } from './scout-chat.js';

export const SCOUT_DOCK_KEY = 'wise-scout-dock';

/* Read the persisted dock state, normalised so callers never see garbage. */
export function readScoutDockState() {
  try {
    const raw = JSON.parse(localStorage.getItem(SCOUT_DOCK_KEY) || '{}') || {};
    return {
      wide: !!raw.wide,
      side: normalizeSide(raw),
    };
  } catch (_) {
    return { wide: false, side: 'right' };
  }
}

/* Normalise stored side into 'left' | 'center' | 'right'. `visible:false` is the
   legacy spelling of the old "off" mode, which is now simply 'center'. The
   default is 'right' so the Doc chat keeps showing on the right rail unless the
   user moves it. */
function normalizeSide(raw) {
  if (raw.visible === false || raw.side === 'center') return 'center';
  return raw.side === 'left' ? 'left' : 'right';
}

/* The Appearance control and the stored state share the same vocabulary now. */
export function scoutDockMode(state = readScoutDockState()) {
  return state.side;
}

/* Persist a partial patch over the current state and return the result. */
export function writeScoutDockState(patch) {
  const next = { ...readScoutDockState(), ...patch };
  try { localStorage.setItem(SCOUT_DOCK_KEY, JSON.stringify(next)); } catch (_) {}
  return next;
}

/* Reflect the current (or supplied) state onto a dock element: its width
   class, its side class/flex-order, and the topbar control buttons. */
export function applyScoutDockState(dock, state = readScoutDockState()) {
  if (!dock) return;

  dock.classList.toggle('scout-dock-open', state.side !== 'center');
  dock.classList.toggle('panel-wide', state.wide);
  dock.classList.toggle('scout-dock-left', state.side === 'left');

  const widthBtn = dock.querySelector('.panel-width-toggle-btn');
  if (widthBtn) {
    widthBtn.classList.toggle('is-on', state.wide);
    widthBtn.setAttribute('aria-pressed', state.wide ? 'true' : 'false');
    widthBtn.title = state.wide
      ? 'Double width — tap for normal width'
      : 'Normal width — tap to double';
  }
}

/**
 * Set the Doc chat's position from one of the three Appearance modes and apply
 * it everywhere on the page at once. Persisted via `wise-scout-dock`, so the
 * choice carries across navigations and syncs to other tabs. Picking the
 * position the chat is already in is a harmless no-op.
 * @param {'left'|'center'|'right'} mode
 */
export function setScoutDockPosition(mode) {
  const side = mode === 'left' || mode === 'center' ? mode : 'right';
  const state = writeScoutDockState({ side });
  document.querySelectorAll('.scout-dock').forEach((dock) => applyScoutDockState(dock, state));
  return state;
}

/**
 * Mount the shared Scout chat into a dock element and wire up persistence.
 * @param {HTMLElement} dock  an element already marked `.scout-dock`
 * @param {object} [opts]     forwarded to mountScoutChat()
 * @returns the mountScoutChat instance (or null)
 */
export function mountScoutDock(dock, opts = {}) {
  if (!dock) return null;
  dock.classList.add('scout-dock', 'scout-dock-open');

  const scout = mountScoutChat(dock, {
    ...opts,
    /* The width toggle lives inside the chat; persist + re-broadcast it so
       the doubled-width state survives the next navigation. */
    onToggleWidth: (wide) => {
      writeScoutDockState({ wide });
      applyScoutDockState(dock);
      if (typeof opts.onToggleWidth === 'function') opts.onToggleWidth(wide);
    },
  });

  /* Scout is the fixed anchor that modules flip around — it never flips sides
     itself, so no side-flip control is added to its dock. */

  /* Restore the persisted place + size, then keep this dock in sync if the
     state changes in another tab/page. */
  applyScoutDockState(dock);
  window.addEventListener('storage', (e) => {
    if (e.key === SCOUT_DOCK_KEY) applyScoutDockState(dock);
  });

  return scout;
}
