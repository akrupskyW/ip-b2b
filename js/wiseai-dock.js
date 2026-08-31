/**
 * WISEcodeAI Dock — the persistent, uniform home for the shared WISEcodeAI chat.
 *
 * Every page that shows WISEcodeAI as a right-rail module mounts it through here
 * instead of calling mountWISEcodeAIChat() directly. That gives the dock ONE
 * source of truth for its place, persisted in localStorage, so WISEcodeAI is
 * always in the exact same spot as the page you just left. Chat width on each
 * load follows the screen default (single ≤1512 CSS px, double when wider);
 * in-session widen/fill is not restored across navigations.
 *
 * Persisted state (key `wise-wiseai-dock`):
 *   { wide: number, right: 0 | 1 | 2 }
 *     • wide → the doubled-width column (also bridged to ai-chat.html's
 *              #chat-shell so "WISEcodeAI is wide" carries everywhere).
 *     • right → how many module panes sit to the RIGHT of the chat, the
 *              Appearance control's three modes. WISEcodeAI is always the centre
 *              anchor (nothing ever sits to its LEFT), so instead of a
 *              left/center/right position the control chooses the pane count:
 *              0 = chat only (everything else tucked to its left),
 *              1 = one pane kept to its right,
 *              2 = a second pane to its right.
 *              The dock stays sticky-clamped to both edges so it never scrolls
 *              off-screen, and the count is applied by re-ordering the modules
 *              row so exactly that many siblings land after the chat.
 *
 *   import { mountWISEcodeAIDock } from './wiseai-dock.js';
 *   mountWISEcodeAIDock(document.getElementById('wiseai-dock-panel'), { ... });
 */

import { mountWISEcodeAIChat, OWL_BUG } from './wiseai-chat.js';

export const WISEAI_DOCK_KEY = 'wise-wiseai-dock';

/* Width is a five-tier cycle stored under `wide`: 0 single, 1 double, 2 triple,
   3 fill, 4 custom. Legacy booleans map true → 1, false → 0. */
function widthMeta() {
  const W = window.WPaneWidth;
  if (W) return W;
  return {
    ICONS: ['width_normal', 'width_wide', 'width_wide', 'width_full', 'fit_width'],
    TITLES: ['Width (single) — tap to widen', 'Width (double) — tap to widen', 'Width (triple) — tap to widen', 'Width (fill) — tap to widen', 'Width (custom) — drag to any size'],
    CUSTOM: 4,
    clamp: (v) => {
      if (v === true) return 1;
      if (typeof v === 'number') return Math.max(0, Math.min(4, v | 0));
      return 0;
    },
  };
}
function widthTierOf(v) {
  return widthMeta().clamp(v);
}

/* Read the persisted dock state, normalised so callers never see garbage. */
export function readWISEcodeAIDockState() {
  try {
    const raw = JSON.parse(localStorage.getItem(WISEAI_DOCK_KEY) || '{}') || {};
    return {
      wide: widthTierOf(raw.wide),
      right: normalizeRight(raw),
      collapsed: raw.collapsed === true,
    };
  } catch (_) {
    return {
      wide: (typeof window.wiseDefaultChatTier === 'function' ? window.wiseDefaultChatTier() : ((((window.screen && +window.screen.width) || window.innerWidth || 0) > 1512) ? 1 : 0)),
      right: 1,
      collapsed: false,
    };
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
export function wiseaiDockMode(state = readWISEcodeAIDockState()) {
  return ['center', 'right1', 'right2'][state.right] || 'center';
}

/* Persist a partial patch over the current state and return the result. */
export function writeWISEcodeAIDockState(patch) {
  const next = { ...readWISEcodeAIDockState(), ...patch };
  try { localStorage.setItem(WISEAI_DOCK_KEY, JSON.stringify(next)); } catch (_) {}
  return next;
}

/* The chat's own flanking drawers (the docked History / Turns modules the
   shared chat breaks out as .wch-sidebar flex siblings) belong TO the chat —
   they are not reorderable panes and don't count toward the solo test. */
function isChatDrawer(el) {
  return el.classList && el.classList.contains('wch-sidebar');
}

/* Is the WISEcodeAI dock the only visible module left in its row? The menu rail
   (nav chrome) doesn't count, and neither does any display:none module such as
   a closed Alerts panel — only real, on-screen sibling modules do. */
function isWISEcodeAISolo(dock) {
  const row = dock.closest('#modules-row');
  if (!row) return false;
  return !Array.from(row.children).some(
    (el) => el !== dock && el.id !== 'menu-panel' && !isChatDrawer(el) && el.offsetWidth > 0,
  );
}

/* The real, on-screen sibling modules of the dock, left→right in DOM order.
   The menu rail (nav chrome), the chat's own docked History / Turns drawers,
   and any hidden module are not panes. */
function paneSiblings(dock, row) {
  return Array.from(row.children).filter(
    (el) => el !== dock && el.id !== 'menu-panel' && !isChatDrawer(el) && el.offsetWidth > 0,
  );
}

/* Set an element's inline flex `order` only when it actually differs, so we
   never write an identical style attribute — that matters because the row's
   MutationObserver watches sibling style changes, and a no-op write would make
   it re-run applyWISEcodeAIDockState every frame in a busy loop. */
function setOrder(el, value) {
  if (el.style.order !== value) el.style.order = value;
}

/* Re-order the modules row so exactly `right` sibling panes land AFTER the
   chat (to its right) and the rest before it (to its left). The chat itself is
   pinned to order 1, left panes to 0, right panes to 2 — WISEcodeAI therefore stays
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
  /* The chat's flanking History / Turns drawers share the chat's order so they
     always hug it: History (DOM-before the dock) lands on its left edge, Turns
     (DOM-after) on its right — regardless of how the panes are distributed. */
  Array.from(row.children).forEach((el) => { if (isChatDrawer(el)) setOrder(el, '1'); });
}

/* Drop every inline `order` we set (dock + siblings) so the modules row reflows
   in natural DOM order — used when the dock collapses out of the row. */
function clearPaneOrder(dock) {
  const row = dock.closest('#modules-row');
  if (!row) return;
  setOrder(dock, '');
  paneSiblings(dock, row).forEach((el) => setOrder(el, ''));
  Array.from(row.children).forEach((el) => { if (isChatDrawer(el)) setOrder(el, ''); });
}

/* Reflect the current (or supplied) state onto a dock element: its width
   class, the row ordering that puts N panes to its right, and the topbar
   control buttons. */
export function applyWISEcodeAIDockState(dock, state = readWISEcodeAIDockState()) {
  if (!dock) return;

  /* Collapsed = the whole WISEcodeAI module folds away to a floating circle (the
     WISE-owl bug). The dock is pulled out of the modules row entirely so the
     remaining modules re-flow and resize across their single/double/triple
     widths; the circle reopens it. Everything below (width/panes/solo) only
     matters in the expanded state, so bail early once the circle is shown.
     Clear any pane ordering we imposed so the remaining modules reflow. */
  dock.classList.toggle('wiseai-dock-collapsed', state.collapsed);
  syncWISEcodeAIFab(dock, state.collapsed);
  if (state.collapsed) { clearPaneOrder(dock); return; }

  /* The dock is always shown now; the three modes only change how many module
     panes sit to its RIGHT. It stays sticky-clamped to both edges (the
     `wiseai-dock-center` CSS) so it never scrolls off-screen regardless. */
  const W = widthMeta();
  const tier = widthTierOf(state.wide);
  dock.classList.add('wiseai-dock-open');
  if (W.applyClasses) W.applyClasses(dock, tier, 'panel');
  else {
    dock.classList.toggle('panel-wide', tier >= 1 && tier < 4);
    dock.classList.toggle('panel-triple', tier >= 2 && tier < 4);
    dock.classList.toggle('panel-fill', tier === 3);
    dock.classList.toggle('panel-custom', tier === 4);
  }
  if (tier < 1) document.documentElement.classList.remove('chat-default-double');

  /* When WISEcodeAI is the ONLY module left in the row there are no panes to place,
     so it just centre-docks (capped at double width) until another module
     returns. Otherwise re-order the row so exactly `right` siblings land after
     the chat. WISEcodeAI always uses the both-edges sticky clamp now — there is no
     separate left/right edge-lock, since the chat is the fixed centre anchor. */
  const solo = isWISEcodeAISolo(dock);
  dock.classList.toggle('wiseai-dock-solo', solo);
  dock.classList.remove('wiseai-dock-left');
  dock.classList.add('wiseai-dock-center');
  placeRightPanes(dock, solo ? 0 : state.right);

  const widthBtn = dock.querySelector('.panel-width-toggle-btn');
  if (widthBtn) {
    if (W.syncButton) W.syncButton(widthBtn, tier);
    else {
      widthBtn.classList.toggle('is-on', tier >= 1);
      widthBtn.setAttribute('aria-pressed', tier >= 1 ? 'true' : 'false');
      widthBtn.title = W.TITLES[tier];
      const icon = widthBtn.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = W.ICONS[tier];
    }
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
export function setWISEcodeAIDockPosition(mode) {
  const right = mode in WISEAI_RIGHT_BY_MODE ? WISEAI_RIGHT_BY_MODE[mode] : 1;
  const state = writeWISEcodeAIDockState({ right });
  document.querySelectorAll('.wiseai-dock').forEach((dock) => applyWISEcodeAIDockState(dock, state));
  return state;
}

/**
 * Collapse the WISEcodeAI module to a floating circle, or restore it. Persisted via
 * `wise-wiseai-dock` so the choice carries across navigations and tabs, and
 * applied to every dock on the page so they stay in lock-step.
 * @param {boolean} collapsed
 */
export function setWISEcodeAICollapsed(collapsed) {
  const state = writeWISEcodeAIDockState({ collapsed: collapsed === true });
  document.querySelectorAll('.wiseai-dock').forEach((dock) => applyWISEcodeAIDockState(dock, state));
  return state;
}

/* Is the WISEcodeAI chat currently closed (folded away)? "Close conversation" folds
   the module to the floating circle; from the app's point of view that's the
   chat being off. The Appearance → "WISEcodeAI chat" toggle reads this to render
   its on/off state. */
export function isWISEcodeAIClosed(state = readWISEcodeAIDockState()) {
  return state.collapsed === true;
}

/* Turn the WISEcodeAI chat back ON with a clean slate. Reopens every dock on the
   page AND wipes its transcript back to the welcome screen, so flipping the
   Appearance toggle "restarts" the conversation fresh rather than restoring the
   old, closed thread. */
export function restartWISEcodeAIChat() {
  const state = writeWISEcodeAIDockState({ collapsed: false });
  document.querySelectorAll('.wiseai-dock').forEach((dock) => {
    const chat = dock.__wiseaiChat;
    if (chat && typeof chat.reset === 'function') chat.reset();
    applyWISEcodeAIDockState(dock, state);
  });
  return state;
}

/* The floating circle shown when WISEcodeAI is collapsed — a fixed FAB carrying the
   WISE-owl bug. One per dock, created lazily and reused. Clicking it reopens
   the module. We keep it in the DOM (just hidden) when expanded so the
   show/hide is a class toggle, not a rebuild. */
function ensureWISEcodeAIFab(dock) {
  if (dock.__wiseaiFab) return dock.__wiseaiFab;
  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'wiseai-dock-fab';
  fab.setAttribute('aria-label', 'Open WISEcodeAI™');
  fab.title = 'Open WISEcodeAI™';
  fab.innerHTML = `<span class="wiseai-dock-fab-bug">${OWL_BUG}</span>`;
  fab.addEventListener('click', (e) => {
    e.stopPropagation();
    setWISEcodeAICollapsed(false);
  });
  document.body.appendChild(fab);
  dock.__wiseaiFab = fab;
  return fab;
}

function syncWISEcodeAIFab(dock, collapsed) {
  const fab = collapsed ? ensureWISEcodeAIFab(dock) : dock.__wiseaiFab;
  if (fab) fab.classList.toggle('is-shown', !!collapsed);
}

/**
 * Mount the shared WISEcodeAI chat into a dock element and wire up persistence.
 * @param {HTMLElement} dock  an element already marked `.wiseai-dock`
 * @param {object} [opts]     forwarded to mountWISEcodeAIChat()
 * @returns the mountWISEcodeAIChat instance (or null)
 */
export function mountWISEcodeAIDock(dock, opts = {}) {
  if (!dock) return null;
  dock.classList.add('wiseai-dock', 'wiseai-dock-open');

  const wiseai = mountWISEcodeAIChat(dock, {
    ...opts,
    /* No activity strip on the dock: it's a floating mini-chat, and mounting
       the (single, body-level) rail here would steal it from a page's main
       chat module on pages that have both. */
    activityStrip: false,
    /* The width toggle lives inside the chat; persist + re-broadcast it so
       the doubled-width state survives the next navigation. */
    onToggleWidth: (wide) => {
      writeWISEcodeAIDockState({ wide });
      applyWISEcodeAIDockState(dock);
      if (typeof opts.onToggleWidth === 'function') opts.onToggleWidth(wide);
    },
    /* "Close conversation" folds the whole module into the floating circle
       instead of navigating away. The remaining modules then re-flow to fill
       the row. A caller can still override with its own onClose. */
    onClose: typeof opts.onClose === 'function' ? opts.onClose : () => setWISEcodeAICollapsed(true),
  });

  /* Keep the live chat handle on the dock so restartWISEcodeAIChat() (the Appearance
     → "WISEcodeAI chat" toggle) can wipe the transcript back to a fresh welcome. */
  dock.__wiseaiChat = wiseai;

  /* WISEcodeAI is the fixed anchor that modules flip around — it never flips sides
     itself, so no side-flip control is added to its dock. */

  /* Chat width is a screen default, not a restored session choice: laptop-class
     (≤1512 CSS px) opens single; wider screens open double. The user can still
     cycle double/triple/fill in-session; the next load reapplies this default
     so the chat is the same size every time it loads on a given screen. (The
     right-pane count is still restored below.) */
  const defaultWide = (window.WPaneWidth && typeof window.WPaneWidth.defaultChatTier === 'function')
    ? window.WPaneWidth.defaultChatTier()
    : (typeof window.wiseDefaultChatTier === 'function' ? window.wiseDefaultChatTier() : ((((window.screen && +window.screen.width) || window.innerWidth || 0) > 1512) ? 1 : 0));
  writeWISEcodeAIDockState({ wide: defaultWide });

  /* Restore the persisted place, then keep this dock in sync if the state
     changes in another tab/page. */
  applyWISEcodeAIDockState(dock);
  observeRowForSolo(dock);
  window.addEventListener('storage', (e) => {
    if (e.key === WISEAI_DOCK_KEY) applyWISEcodeAIDockState(dock);
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
      /* Mutations originating inside the dock are ours, whatever their type.
         The childList branch used to return true unconditionally, which
         contradicted the comment above and made any DOM write inside the dock
         re-enter applyWISEcodeAIDockState. Harmless while nothing wrote inside
         the dock on its own — but syncButton() rewrites the width button's icon
         on every call, so once the SVG icon shim started swapping that glyph the
         two observers drove each other every frame. */
      if (m.target === dock || dock.contains(m.target)) return false;
      if (m.type === 'childList') return true;
      /* Attribute change on a real sibling module, not the dock or its guts. */
      return m.target.parentElement === row;
    });
    if (!relevant || queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; applyWISEcodeAIDockState(dock); });
  });
  obs.observe(row, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden'],
  });
  row.__wiseaiSoloObserver = obs;
}
