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
 *              'left'/'right' LOCK the dock to that edge of the modules row
 *              (single-inset sticky, so it's frozen flush to that edge);
 *              'center' is the DEFAULT "floating in the middle" mode — the chat
 *              keeps its normal width and sits at its natural mid-row spot, but
 *              stays sticky-clamped to BOTH edges so that, as the row scrolls,
 *              it gets stuck to the left or the right edge and never slides
 *              off-screen. All three modes keep Scout always visible.
 *
 *   import { mountScoutDock } from './scout-dock.js';
 *   mountScoutDock(document.getElementById('scout-dock-panel'), { ... });
 */

import { mountScoutChat, OWL_BUG } from './scout-chat.js';

export const SCOUT_DOCK_KEY = 'wise-scout-dock';

/* Width is a three-tier cycle stored under `wide`: 0 single, 1 double, 2 triple.
   Legacy booleans map true → 1, false → 0. */
const SCOUT_WIDTH_ICONS = ['width_normal', 'width_wide', 'width_full'];
const SCOUT_WIDTH_TITLES = ['Width (single) — tap to widen', 'Width (double) — tap to widen', 'Width (triple) — tap to reset'];
function widthTierOf(v) {
  if (v === true) return 1;
  if (typeof v === 'number') return Math.max(0, Math.min(2, v | 0));
  return 0;
}

/* Read the persisted dock state, normalised so callers never see garbage. */
export function readScoutDockState() {
  try {
    const raw = JSON.parse(localStorage.getItem(SCOUT_DOCK_KEY) || '{}') || {};
    return {
      wide: widthTierOf(raw.wide),
      side: normalizeSide(raw),
      collapsed: raw.collapsed === true,
    };
  } catch (_) {
    return { wide: 0, side: 'right', collapsed: false };
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

/* Is the Scout dock the only visible module left in its row? The menu rail
   (nav chrome) doesn't count, and neither does any display:none module such as
   a closed Alerts panel — only real, on-screen sibling modules do. */
function isScoutSolo(dock) {
  const row = dock.closest('#modules-row');
  if (!row) return false;
  return !Array.from(row.children).some(
    (el) => el !== dock && el.id !== 'menu-panel' && el.offsetWidth > 0,
  );
}

/* Reflect the current (or supplied) state onto a dock element: its width
   class, its side class/flex-order, and the topbar control buttons. */
export function applyScoutDockState(dock, state = readScoutDockState()) {
  if (!dock) return;

  /* Collapsed = the whole Scout module folds away to a floating circle (the
     WISE-owl bug). The dock is pulled out of the modules row entirely so the
     remaining modules re-flow and resize across their single/double/triple
     widths; the circle reopens it. Everything below (width/side/solo) only
     matters in the expanded state, so bail early once the circle is shown. */
  dock.classList.toggle('scout-dock-collapsed', state.collapsed);
  syncScoutFab(dock, state.collapsed);
  if (state.collapsed) return;

  /* The dock is always shown now; the three modes only change where it sits.
     'left'/'right' lock it flush to an edge; 'center' floats it mid-row but
     keeps it sticky-clamped to both edges so it never scrolls off-screen —
     see the `scout-dock-center` CSS. */
  const tier = widthTierOf(state.wide);
  dock.classList.add('scout-dock-open');
  dock.classList.toggle('panel-wide', tier >= 1);
  dock.classList.toggle('panel-triple', tier >= 2);

  /* Width is locked to the single↔double range in CSS. The extra layout rule:
     when Scout is the ONLY module left in the row it can't be docked flush to
     an edge against empty space — it stays capped at (at most) double width and
     is centre-docked, overriding the stored left/right side until another
     module returns. */
  const solo = isScoutSolo(dock);
  const side = solo ? 'center' : state.side;
  dock.classList.toggle('scout-dock-solo', solo);
  dock.classList.toggle('scout-dock-left', side === 'left');
  dock.classList.toggle('scout-dock-center', side === 'center');

  const widthBtn = dock.querySelector('.panel-width-toggle-btn');
  if (widthBtn) {
    widthBtn.classList.toggle('is-on', tier >= 1);
    widthBtn.setAttribute('aria-pressed', tier >= 1 ? 'true' : 'false');
    widthBtn.title = SCOUT_WIDTH_TITLES[tier];
    const icon = widthBtn.querySelector('.material-symbols-outlined');
    if (icon) icon.textContent = SCOUT_WIDTH_ICONS[tier];
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
 * Collapse the Scout module to a floating circle, or restore it. Persisted via
 * `wise-scout-dock` so the choice carries across navigations and tabs, and
 * applied to every dock on the page so they stay in lock-step.
 * @param {boolean} collapsed
 */
export function setScoutCollapsed(collapsed) {
  const state = writeScoutDockState({ collapsed: collapsed === true });
  document.querySelectorAll('.scout-dock').forEach((dock) => applyScoutDockState(dock, state));
  return state;
}

/* The floating circle shown when Scout is collapsed — a fixed FAB carrying the
   WISE-owl bug. One per dock, created lazily and reused. Clicking it reopens
   the module. We keep it in the DOM (just hidden) when expanded so the
   show/hide is a class toggle, not a rebuild. */
function ensureScoutFab(dock) {
  if (dock.__scoutFab) return dock.__scoutFab;
  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'scout-dock-fab';
  fab.setAttribute('aria-label', 'Open Scout™');
  fab.title = 'Open Scout™';
  fab.innerHTML = `<span class="scout-dock-fab-bug">${OWL_BUG}</span>`;
  fab.addEventListener('click', (e) => {
    e.stopPropagation();
    setScoutCollapsed(false);
  });
  document.body.appendChild(fab);
  dock.__scoutFab = fab;
  return fab;
}

function syncScoutFab(dock, collapsed) {
  const fab = collapsed ? ensureScoutFab(dock) : dock.__scoutFab;
  if (fab) fab.classList.toggle('is-shown', !!collapsed);
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
    /* "Close conversation" folds the whole module into the floating circle
       instead of navigating away. The remaining modules then re-flow to fill
       the row. A caller can still override with its own onClose. */
    onClose: typeof opts.onClose === 'function' ? opts.onClose : () => setScoutCollapsed(true),
  });

  /* Scout is the fixed anchor that modules flip around — it never flips sides
     itself, so no side-flip control is added to its dock. */

  /* Restore the persisted place + size, then keep this dock in sync if the
     state changes in another tab/page. */
  applyScoutDockState(dock);
  observeRowForSolo(dock);
  window.addEventListener('storage', (e) => {
    if (e.key === SCOUT_DOCK_KEY) applyScoutDockState(dock);
  });

  return scout;
}

/* Re-evaluate the solo rule whenever the set of visible modules in the row
   changes — a module mounting/unmounting (childList) or a sibling toggling its
   own visibility class, e.g. the Alerts panel going display:none↔flex
   (attributes). Mutations originating inside the dock itself (chat activity,
   our own class writes) are ignored so this never loops. */
function observeRowForSolo(dock) {
  const row = dock.closest('#modules-row');
  if (!row || row.__scoutSoloObserver) return;
  let queued = false;
  const obs = new MutationObserver((records) => {
    const relevant = records.some((m) => {
      if (m.type === 'childList') return true;
      /* Attribute change on a real sibling module, not the dock or its guts. */
      return m.target !== dock && !dock.contains(m.target) && m.target.parentElement === row;
    });
    if (!relevant || queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; applyScoutDockState(dock); });
  });
  obs.observe(row, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden'],
  });
  row.__scoutSoloObserver = obs;
}
