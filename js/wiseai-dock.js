/**
 * WISEai Dock — the persistent, uniform home for the shared WISEai chat.
 *
 * Every page that shows WISEai as a right-rail module mounts it through here
 * instead of calling mountWISEaiChat() directly. That gives the dock ONE
 * source of truth for its place + size, persisted in localStorage, so WISEai
 * is always in the exact same spot and at the exact same width as the page
 * you just left — uniform across the whole app.
 *
 * Persisted state (key `wise-wiseai-dock`):
 *   { wide: number, right: 0 | 1 | 2 }
 *     • wide → the doubled-width column (also bridged to ai-chat.html's
 *              #chat-shell so "WISEai is wide" carries everywhere).
 *     • right → how many module panes sit to the RIGHT of the chat, the
 *              Appearance control's three modes. WISEai is always the centre
 *              anchor (nothing ever sits to its LEFT), so instead of a
 *              left/center/right position the control chooses the pane count:
 *              0 = chat only (everything else tucked to its left),
 *              1 = one pane kept to its right,
 *              2 = a second pane to its right.
 *              The dock stays sticky-clamped to both edges so it never scrolls
 *              off-screen, and the count is applied by re-ordering the modules
 *              row so exactly that many siblings land after the chat.
 *
 *   import { mountWISEaiDock } from './wiseai-dock.js';
 *   mountWISEaiDock(document.getElementById('wiseai-dock-panel'), { ... });
 */

import { mountWISEaiChat, OWL_BUG } from './wiseai-chat.js';

export const WISEAI_DOCK_KEY = 'wise-wiseai-dock';

/* Width is a four-tier cycle stored under `wide`: 0 single, 1 double, 2 triple,
   3 fill (take the rest of the row). Legacy booleans map true → 1, false → 0. */
const WISEAI_WIDTH_ICONS = ['width_normal', 'width_wide', 'width_full', 'width_full'];
const WISEAI_WIDTH_TITLES = ['Width (single) — tap to widen', 'Width (double) — tap to widen', 'Width (triple) — tap to widen', 'Width (fill) — tap to reset'];
function widthTierOf(v) {
  if (v === true) return 1;
  if (typeof v === 'number') return Math.max(0, Math.min(3, v | 0));
  return 0;
}

/* Read the persisted dock state, normalised so callers never see garbage. */
export function readWISEaiDockState() {
  try {
    const raw = JSON.parse(localStorage.getItem(WISEAI_DOCK_KEY) || '{}') || {};
    return {
      wide: widthTierOf(raw.wide),
      right: normalizeRight(raw),
      collapsed: raw.collapsed === true,
    };
  } catch (_) {
    return { wide: 0, right: 1, collapsed: false };
  }
}

/* Normalise the stored value into a pane count 0 | 1 | 2. New state persists a
   numeric `right`; legacy state used a `side` of 'left'/'center'/'right' (with
   `visible:false` as the old "off" spelling), which we fold into the count:
   'right' → 0 panes right, 'center'/off → 1, 'left' → 2. The default is 1 so
   the chat always keeps one pane to its right unless the user changes it. */
function normalizeRight(raw) {
  if (typeof raw.right === 'number') return Math.max(0, Math.min(2, raw.right | 0));
  if (raw.side === 'left') return 2;
  if (raw.side === 'right') return 0;
  if (raw.visible === false || raw.side === 'center') return 1;
  return 1;
}

/* The Appearance control speaks in mode ids ('center'|'right1'|'right2'); map
   the stored pane count onto them so the right segment lights up. */
export function wiseaiDockMode(state = readWISEaiDockState()) {
  return ['center', 'right1', 'right2'][state.right] || 'center';
}

/* Persist a partial patch over the current state and return the result. */
export function writeWISEaiDockState(patch) {
  const next = { ...readWISEaiDockState(), ...patch };
  try { localStorage.setItem(WISEAI_DOCK_KEY, JSON.stringify(next)); } catch (_) {}
  return next;
}

/* Is the WISEai dock the only visible module left in its row? The menu rail
   (nav chrome) doesn't count, and neither does any display:none module such as
   a closed Alerts panel — only real, on-screen sibling modules do. */
function isWISEaiSolo(dock) {
  const row = dock.closest('#modules-row');
  if (!row) return false;
  return !Array.from(row.children).some(
    (el) => el !== dock && el.id !== 'menu-panel' && el.offsetWidth > 0,
  );
}

/* The real, on-screen sibling modules of the dock, left→right in DOM order.
   The menu rail (nav chrome) and any hidden module are not panes. */
function paneSiblings(dock, row) {
  return Array.from(row.children).filter(
    (el) => el !== dock && el.id !== 'menu-panel' && el.offsetWidth > 0,
  );
}

/* Set an element's inline flex `order` only when it actually differs, so we
   never write an identical style attribute — that matters because the row's
   MutationObserver watches sibling style changes, and a no-op write would make
   it re-run applyWISEaiDockState every frame in a busy loop. */
function setOrder(el, value) {
  if (el.style.order !== value) el.style.order = value;
}

/* Re-order the modules row so exactly `right` sibling panes land AFTER the
   chat (to its right) and the rest before it (to its left). The chat itself is
   pinned to order 1, left panes to 0, right panes to 2 — WISEai therefore stays
   the fixed centre anchor with the chosen number of panes on its right. If the
   row holds fewer siblings than requested, all of them simply sit to the right. */
function placeRightPanes(dock, right) {
  const row = dock.closest('#modules-row');
  if (!row) return;
  const sibs = paneSiblings(dock, row);
  const n = Math.max(0, Math.min(right, sibs.length));
  const firstRight = sibs.length - n;
  sibs.forEach((el, i) => setOrder(el, i >= firstRight ? '2' : '0'));
  setOrder(dock, '1');
}

/* Drop every inline `order` we set (dock + siblings) so the modules row reflows
   in natural DOM order — used when the dock collapses out of the row. */
function clearPaneOrder(dock) {
  const row = dock.closest('#modules-row');
  if (!row) return;
  setOrder(dock, '');
  paneSiblings(dock, row).forEach((el) => setOrder(el, ''));
}

/* Reflect the current (or supplied) state onto a dock element: its width
   class, the row ordering that puts N panes to its right, and the topbar
   control buttons. */
export function applyWISEaiDockState(dock, state = readWISEaiDockState()) {
  if (!dock) return;

  /* Collapsed = the whole WISEai module folds away to a floating circle (the
     WISE-owl bug). The dock is pulled out of the modules row entirely so the
     remaining modules re-flow and resize across their single/double/triple
     widths; the circle reopens it. Everything below (width/panes/solo) only
     matters in the expanded state, so bail early once the circle is shown.
     Clear any pane ordering we imposed so the remaining modules reflow. */
  dock.classList.toggle('wiseai-dock-collapsed', state.collapsed);
  syncWISEaiFab(dock, state.collapsed);
  if (state.collapsed) { clearPaneOrder(dock); return; }

  /* The dock is always shown now; the three modes only change how many module
     panes sit to its RIGHT. It stays sticky-clamped to both edges (the
     `wiseai-dock-center` CSS) so it never scrolls off-screen regardless. */
  const tier = widthTierOf(state.wide);
  dock.classList.add('wiseai-dock-open');
  dock.classList.toggle('panel-wide', tier >= 1);
  dock.classList.toggle('panel-triple', tier >= 2);
  dock.classList.toggle('panel-fill', tier >= 3);

  /* When WISEai is the ONLY module left in the row there are no panes to place,
     so it just centre-docks (capped at double width) until another module
     returns. Otherwise re-order the row so exactly `right` siblings land after
     the chat. WISEai always uses the both-edges sticky clamp now — there is no
     separate left/right edge-lock, since the chat is the fixed centre anchor. */
  const solo = isWISEaiSolo(dock);
  dock.classList.toggle('wiseai-dock-solo', solo);
  dock.classList.remove('wiseai-dock-left');
  dock.classList.add('wiseai-dock-center');
  placeRightPanes(dock, solo ? 0 : state.right);

  const widthBtn = dock.querySelector('.panel-width-toggle-btn');
  if (widthBtn) {
    widthBtn.classList.toggle('is-on', tier >= 1);
    widthBtn.setAttribute('aria-pressed', tier >= 1 ? 'true' : 'false');
    widthBtn.title = WISEAI_WIDTH_TITLES[tier];
    const icon = widthBtn.querySelector('.material-symbols-outlined');
    if (icon) icon.textContent = WISEAI_WIDTH_ICONS[tier];
  }
}

/* Appearance mode id → number of panes kept to the right of the chat. Legacy
   left/center/right ids are still accepted so older callers keep working. */
const WISEAI_RIGHT_BY_MODE = { center: 0, right1: 1, right2: 2, right: 0, left: 2 };

/**
 * Set how many module panes sit to the RIGHT of the chat from one of the three
 * Appearance modes ('center'|'right1'|'right2') and apply it everywhere on the
 * page at once. Persisted via `wise-wiseai-dock`, so the choice carries across
 * navigations and syncs to other tabs. Picking the mode the chat is already in
 * is a harmless no-op.
 * @param {'center'|'right1'|'right2'} mode
 */
export function setWISEaiDockPosition(mode) {
  const right = mode in WISEAI_RIGHT_BY_MODE ? WISEAI_RIGHT_BY_MODE[mode] : 1;
  const state = writeWISEaiDockState({ right });
  document.querySelectorAll('.wiseai-dock').forEach((dock) => applyWISEaiDockState(dock, state));
  return state;
}

/**
 * Collapse the WISEai module to a floating circle, or restore it. Persisted via
 * `wise-wiseai-dock` so the choice carries across navigations and tabs, and
 * applied to every dock on the page so they stay in lock-step.
 * @param {boolean} collapsed
 */
export function setWISEaiCollapsed(collapsed) {
  const state = writeWISEaiDockState({ collapsed: collapsed === true });
  document.querySelectorAll('.wiseai-dock').forEach((dock) => applyWISEaiDockState(dock, state));
  return state;
}

/* Is the WISEai chat currently closed (folded away)? "Close conversation" folds
   the module to the floating circle; from the app's point of view that's the
   chat being off. The Appearance → "WISEai chat" toggle reads this to render
   its on/off state. */
export function isWISEaiClosed(state = readWISEaiDockState()) {
  return state.collapsed === true;
}

/* Turn the WISEai chat back ON with a clean slate. Reopens every dock on the
   page AND wipes its transcript back to the welcome screen, so flipping the
   Appearance toggle "restarts" the conversation fresh rather than restoring the
   old, closed thread. */
export function restartWISEaiChat() {
  const state = writeWISEaiDockState({ collapsed: false });
  document.querySelectorAll('.wiseai-dock').forEach((dock) => {
    const chat = dock.__wiseaiChat;
    if (chat && typeof chat.reset === 'function') chat.reset();
    applyWISEaiDockState(dock, state);
  });
  return state;
}

/* The floating circle shown when WISEai is collapsed — a fixed FAB carrying the
   WISE-owl bug. One per dock, created lazily and reused. Clicking it reopens
   the module. We keep it in the DOM (just hidden) when expanded so the
   show/hide is a class toggle, not a rebuild. */
function ensureWISEaiFab(dock) {
  if (dock.__wiseaiFab) return dock.__wiseaiFab;
  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'wiseai-dock-fab';
  fab.setAttribute('aria-label', 'Open WISEai™');
  fab.title = 'Open WISEai™';
  fab.innerHTML = `<span class="wiseai-dock-fab-bug">${OWL_BUG}</span>`;
  fab.addEventListener('click', (e) => {
    e.stopPropagation();
    setWISEaiCollapsed(false);
  });
  document.body.appendChild(fab);
  dock.__wiseaiFab = fab;
  return fab;
}

function syncWISEaiFab(dock, collapsed) {
  const fab = collapsed ? ensureWISEaiFab(dock) : dock.__wiseaiFab;
  if (fab) fab.classList.toggle('is-shown', !!collapsed);
}

/**
 * Mount the shared WISEai chat into a dock element and wire up persistence.
 * @param {HTMLElement} dock  an element already marked `.wiseai-dock`
 * @param {object} [opts]     forwarded to mountWISEaiChat()
 * @returns the mountWISEaiChat instance (or null)
 */
export function mountWISEaiDock(dock, opts = {}) {
  if (!dock) return null;
  dock.classList.add('wiseai-dock', 'wiseai-dock-open');

  const wiseai = mountWISEaiChat(dock, {
    ...opts,
    /* The width toggle lives inside the chat; persist + re-broadcast it so
       the doubled-width state survives the next navigation. */
    onToggleWidth: (wide) => {
      writeWISEaiDockState({ wide });
      applyWISEaiDockState(dock);
      if (typeof opts.onToggleWidth === 'function') opts.onToggleWidth(wide);
    },
    /* "Close conversation" folds the whole module into the floating circle
       instead of navigating away. The remaining modules then re-flow to fill
       the row. A caller can still override with its own onClose. */
    onClose: typeof opts.onClose === 'function' ? opts.onClose : () => setWISEaiCollapsed(true),
  });

  /* Keep the live chat handle on the dock so restartWISEaiChat() (the Appearance
     → "WISEai chat" toggle) can wipe the transcript back to a fresh welcome. */
  dock.__wiseaiChat = wiseai;

  /* WISEai is the fixed anchor that modules flip around — it never flips sides
     itself, so no side-flip control is added to its dock. */

  /* WISEai always loads at its single-pane width on every page. The widened
     (double/triple) tier is a within-session choice and is intentionally NOT
     restored across page loads, so the chat module is the exact same size every
     time it loads. (The right-pane count is still restored below.) */
  writeWISEaiDockState({ wide: 0 });

  /* Restore the persisted place, then keep this dock in sync if the state
     changes in another tab/page. */
  applyWISEaiDockState(dock);
  observeRowForSolo(dock);
  window.addEventListener('storage', (e) => {
    if (e.key === WISEAI_DOCK_KEY) applyWISEaiDockState(dock);
  });

  return wiseai;
}

/* Re-evaluate the solo rule whenever the set of visible modules in the row
   changes — a module mounting/unmounting (childList) or a sibling toggling its
   own visibility class, e.g. the Alerts panel going display:none↔flex
   (attributes). Mutations originating inside the dock itself (chat activity,
   our own class writes) are ignored so this never loops. */
function observeRowForSolo(dock) {
  const row = dock.closest('#modules-row');
  if (!row || row.__wiseaiSoloObserver) return;
  let queued = false;
  const obs = new MutationObserver((records) => {
    const relevant = records.some((m) => {
      if (m.type === 'childList') return true;
      /* Attribute change on a real sibling module, not the dock or its guts. */
      return m.target !== dock && !dock.contains(m.target) && m.target.parentElement === row;
    });
    if (!relevant || queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; applyWISEaiDockState(dock); });
  });
  obs.observe(row, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden'],
  });
  row.__wiseaiSoloObserver = obs;
}
