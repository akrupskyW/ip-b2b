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
 *   { wide: boolean, side: 'left' | 'right' }
 *     • wide → the doubled-width column (also bridged to ai-chat.html's
 *              #chat-shell so "Scout is wide" carries everywhere).
 *     • side → which side of the modules row the dock pins to.
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
      side: raw.side === 'left' ? 'left' : 'right',
    };
  } catch (_) {
    return { wide: false, side: 'right' };
  }
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

  const flipBtn = dock.querySelector('.scout-dock-flip');
  if (flipBtn) {
    flipBtn.setAttribute('data-side', state.side);
    flipBtn.title = state.side === 'left'
      ? 'Docked left — tap to move to the right'
      : 'Docked right — tap to move to the left';
  }
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

  /* Add a side-flip control next to the width toggle so the dock's side is
     adjustable (and therefore worth persisting) on every dock page. */
  const controls = dock.querySelector('.sc-topbar-controls');
  if (controls && !controls.querySelector('.scout-dock-flip')) {
    const flip = document.createElement('button');
    flip.type = 'button';
    flip.className = 'panel-width-toggle-btn scout-dock-flip';
    flip.setAttribute('aria-label', 'Move Scout to the other side');
    flip.innerHTML = '<span class="material-icons">side_navigation</span>';
    flip.addEventListener('click', () => {
      const side = readScoutDockState().side === 'left' ? 'right' : 'left';
      writeScoutDockState({ side });
      applyScoutDockState(dock);
    });
    controls.insertBefore(flip, controls.firstChild);
  }

  /* Restore the persisted place + size, then keep this dock in sync if the
     state changes in another tab/page. */
  applyScoutDockState(dock);
  window.addEventListener('storage', (e) => {
    if (e.key === SCOUT_DOCK_KEY) applyScoutDockState(dock);
  });

  return scout;
}
