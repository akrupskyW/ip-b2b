/* ------------------------------------------------------------------ */
/* Shared Appearance popover body                                      */
/* ------------------------------------------------------------------ */
/*
 * One source of truth for the markup inside the "Appearance" (crossword)
 * popover. Every shell — the agent overview pages (js/agent-overview.js), the
 * Portfolio workspace (js/portfolio-module.js), the WISEai chat (pages/ai-chat.html
 * inline), and the application sidebar (js/app.js) — renders the SAME menu by
 * calling buildAppearanceBody(). This keeps the toggles (Minimal UI, Header,
 * Full bleed, Jam strip, Text size, Theme …) identical everywhere; before this
 * the menu was copy-pasted per shell and drifted out of sync (which is how a
 * new toggle could land in one menu but not another).
 *
 * Shell-agnostic state is read straight from the shared modules below. The bits
 * that genuinely differ per shell (the module-layout list, whether the nav can
 * pivot, the active theme, the WISEai dock side) are passed in as options, so a
 * shell simply omits the capabilities it doesn't have.
 *
 * Click handling stays in each shell: every row keys off a stable data-*
 * attribute (data-layout / data-pivot / data-minimal / data-headerfloat /
 * data-fullbleed / data-jam / data-wiseai-dock / data-fz / data-pop-action),
 * so the existing per-shell listeners keep working unchanged.
 */

import {
  isMinimalUiOn,
  applyMinimalUi,
  isHeaderFloatOn,
  applyHeaderFloat,
  isFullBleedOn,
  applyFullBleed,
  isColorblindOn,
  applyColorblind,
  getColorblindMode,
  COLORBLIND_MODES,
} from './topbar.js';
import {
  isJamStripOn,
  applyJamStrip,
  JAM_SONGS,
  toggleJam,
  isJamPlaying,
  currentJamSongId,
  currentJamSongLabel,
} from './jam-strip.js';
import { getStoredFontSize, setTextSize } from './text-size.js';

/** Module-layout rows (only Column remains). Shells without a layout list
    (e.g. a single agent page) pass no list and get nothing. */
function layoutsSection(layouts, currentLayout) {
  if (!Array.isArray(layouts) || !layouts.length) return '';
  const items = layouts
    .map(
      (l) => `<div class="wise-popover-item${l.mode === currentLayout ? ' is-active' : ''}" data-layout="${l.mode}">
        <span class="${l.sym ? 'material-symbols-outlined' : 'material-icons'}">${l.icon}</span>${l.label}
      </div>`
    )
    .join('');
  return `${items}<div class="wise-popover-divider"></div>`;
}

/**
 * A binary on/off setting row. Instead of highlighting the whole row when
 * active, it shows a Material Symbols switch glyph to the LEFT of the label —
 * `toggle_on` (blue) when on, `toggle_off` (gray) when off. The data-* hook and
 * label match the old rows so every shell's existing click handlers keep working.
 *
 * @param {string} dataAttr  Full data-* attribute string (e.g. `data-minimal="1"`).
 * @param {boolean} on        Whether the setting is currently on.
 * @param {string} label      Visible row label.
 */
function toggleRow(dataAttr, on, label) {
  return `<div class="wise-popover-item wise-toggle-item${on ? ' is-on' : ''}" ${dataAttr} role="switch" aria-checked="${on ? 'true' : 'false'}">
      <span class="material-symbols-outlined wise-toggle-ico">${on ? 'toggle_on' : 'toggle_off'}</span>${label}
    </div>`;
}

/** The Jam player, shown inline in the popover right under the "Jam strip"
    toggle once it's switched on. It carries its own transport (play/pause), a
    live equalizer, a "now playing" label, and the full track picker — so the
    whole experience lives in the Appearance popover rather than the nav module.
    Controls key off data-jam-play / data-jam-song, handled in
    wireAppearancePopover(). */
function jamEscape(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function jamPlayerSection() {
  if (!isJamStripOn()) return '';
  const playing = isJamPlaying();
  const curId = currentJamSongId();
  const curLabel = currentJamSongLabel();
  const bars = Array.from({ length: 16 }, () => '<span></span>').join('');
  const songs = JAM_SONGS.map(
    (s) => `<button type="button" class="jam-pop-song${s.id === curId ? ' is-active' : ''}" data-jam-song="${s.id}" aria-pressed="${s.id === curId ? 'true' : 'false'}">${jamEscape(s.label)}</button>`
  ).join('');
  const nowText = playing && curLabel ? jamEscape(curLabel) : 'Pick a track to play';
  return `
    <div class="jam-pop${playing ? ' is-playing' : ''}">
      <div class="jam-pop-head">
        <button type="button" class="jam-pop-play" data-jam-play aria-label="${playing ? 'Pause' : 'Play'}">
          <span class="material-icons">${playing ? 'pause' : 'play_arrow'}</span>
        </button>
        <div class="jam-pop-now">
          <div class="jam-pop-eq" aria-hidden="true">${bars}</div>
          <div class="jam-pop-title">${nowText}</div>
        </div>
      </div>
      <div class="jam-pop-songs" role="group" aria-label="Pick a track">${songs}</div>
    </div>`;
}

/** Update the in-popover jam player IN PLACE (play icon, now-playing title,
    active chip) instead of re-rendering the whole popover. A full re-render
    rebuilds every node, which resets the song list's scroll position and makes
    the popover visibly jump when you tap through chips — this keeps it steady. */
function syncJamPop(root) {
  const pop = root.querySelector('.jam-pop');
  if (!pop) return false;
  const playing = isJamPlaying();
  const curId = currentJamSongId();
  const curLabel = currentJamSongLabel();

  pop.classList.toggle('is-playing', playing);

  const playBtn = pop.querySelector('[data-jam-play]');
  if (playBtn) {
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    const icon = playBtn.querySelector('.material-icons');
    if (icon) icon.textContent = playing ? 'pause' : 'play_arrow';
  }

  const title = pop.querySelector('.jam-pop-title');
  if (title) title.textContent = playing && curLabel ? curLabel : 'Pick a track to play';

  pop.querySelectorAll('.jam-pop-song').forEach((chip) => {
    const active = playing && chip.dataset.jamSong === curId;
    chip.classList.toggle('is-active', active);
    chip.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  return true;
}

/** "Pivot Navigation" row — only for shells whose nav rail can pivot to the top. */
function pivotSection(showPivot, isPivoted) {
  if (!showPivot) return '';
  return toggleRow('data-pivot="1"', isPivoted, 'Pivot Navigation');
}

/** "Colorblind type" segmented control — only revealed once the colorblind
    palette is switched on, so the picker never clutters the menu when unused.
    Each button carries a `data-cbtype` id that topbar.js's capture-phase handler
    turns into the matching cb-<type> palette on <html>. */
function colorblindTypeSection() {
  if (!isColorblindOn()) return '';
  const active = getColorblindMode();
  const btns = COLORBLIND_MODES.map(
    (m) =>
      `<button type="button" class="fz-btn${m.id === active ? ' fz-active' : ''}" data-cbtype="${m.id}" title="${m.label}" aria-label="${m.label}" aria-pressed="${m.id === active ? 'true' : 'false'}">${m.short}</button>`
  ).join('');
  return `
    <div class="fz-row cb-type-row">
      <span class="fz-row-label">CVD type</span>
      <div class="fz-btns" role="group" aria-label="Color-vision deficiency type">${btns}</div>
    </div>
    <div class="wise-popover-divider"></div>`;
}

/** Link out to the standalone WCAG audit. The review lives in pages/, so the
    href is resolved against wherever the calling shell is mounted (app pages
    sit in pages/, the root shell one level up) — same rule as auth-guard.js. */
function accessibilityReviewSection() {
  let href = 'pages/accessibility-review.html';
  try {
    if (location.pathname.indexOf('/pages/') !== -1) href = 'accessibility-review.html';
  } catch (e) { /* non-browser context — keep the default */ }
  return `
    <a class="wise-popover-item" href="${href}" data-pop-action="a11y-review">
      <span class="material-icons">accessibility_new</span>Accessibility review
      <span class="wise-popover-badge">Admin</span>
      <span class="wise-popover-ext material-icons" aria-hidden="true">arrow_outward</span>
    </a>`;
}

/** "Dock Chat" segmented control for the WISEai dock. WISEai is always the
    centre anchor — there is never anything to its LEFT — so the three modes
    choose how many module panes sit to its RIGHT: none (chat only), one, or a
    second. Values map to the pane count in js/wiseai-dock.js. */
function wiseaiDockSection(mode) {
  const btn = (m, icon, label) =>
    `<button type="button" class="fz-btn${mode === m ? ' fz-active' : ''}" data-wiseai-dock="${m}" title="${label}" aria-label="${label}"><span class="material-symbols-outlined">${icon}</span></button>`;
  return `
    <div class="fz-row">
      <span class="fz-row-label">Dock Chat</span>
      <div class="fz-btns wiseai-seg" role="group" aria-label="Panes beside chat">
        ${btn('center', 'crop_portrait', 'Chat only')}
        ${btn('right1', 'view_sidebar', 'One pane to the right')}
        ${btn('right2', 'view_week', 'Two panes to the right')}
      </div>
    </div>
    <div class="wise-popover-divider"></div>`;
}

/**
 * Build the full innerHTML for an Appearance popover.
 *
 * @param {Object}  opts
 * @param {Array}   [opts.layouts]        Module-layout list ({mode,icon,label,sym}); omit to hide.
 * @param {string}  [opts.currentLayout]  Active layout mode id.
 * @param {boolean} [opts.showPivot]      Show the "Pivot Navigation" row.
 * @param {boolean} [opts.isPivoted]      Whether the nav is currently pivoted.
 * @param {boolean} [opts.isDark]         Whether dark mode is active (shells compute this differently).
 * @param {boolean} [opts.showWISEaiDock]  Show the WISEai "Dock Chat" control (default true).
 * @param {string}  [opts.wiseaiDockMode]  Active WISEai dock mode ('center'|'right1'|'right2') — panes to the right of the chat.
 * @param {boolean} [opts.showWISEaiChat]  Show the "WISEai chat" on/off toggle (default false).
 *                                          Only shells that mount the shared dock pass this.
 * @param {boolean} [opts.wiseaiChatOn]    Whether the WISEai chat is currently open (not closed).
 * @returns {string} popover innerHTML
 */
export function buildAppearanceBody({
  layouts = null,
  currentLayout = null,
  showPivot = false,
  isPivoted = false,
  isDark = false,
  showWISEaiDock = true,
  wiseaiDockMode = 'off',
  showWISEaiChat = false,
  wiseaiChatOn = true,
} = {}) {
  const fz = getStoredFontSize();
  const sizes = { sm: 'S', md: 'M', lg: 'L', xl: 'XL' };
  return `
    <div class="wise-popover-header">Appearance</div>
    ${layoutsSection(layouts, currentLayout)}
    ${pivotSection(showPivot, isPivoted)}
    ${toggleRow('data-minimal="1"', isMinimalUiOn(), 'Minimal UI')}
    ${toggleRow('data-headerfloat="1"', isHeaderFloatOn(), 'Header')}
    ${toggleRow('data-fullbleed="1"', isFullBleedOn(), 'Full bleed')}
    ${toggleRow('data-jam="1"', isJamStripOn(), 'Jam strip')}
    ${jamPlayerSection()}
    ${toggleRow('data-colorblind="1"', isColorblindOn(), 'Colorblind mode')}
    ${showWISEaiChat ? toggleRow('data-wiseai-chat="1"', wiseaiChatOn, 'WISEai™ chat') : ''}
    <div class="wise-popover-divider"></div>
    ${colorblindTypeSection()}
    ${showWISEaiDock ? wiseaiDockSection(wiseaiDockMode) : ''}
    <div class="fz-row">
      <span class="fz-row-label">Text size</span>
      <div class="fz-btns">
        ${Object.keys(sizes)
          .map((s) => `<button type="button" class="fz-btn${fz === s ? ' fz-active' : ''}" data-fz="${s}">${sizes[s]}</button>`)
          .join('')}
      </div>
    </div>
    <div class="wise-popover-divider"></div>
    <div class="wise-popover-item" data-pop-action="theme">
      <span class="material-icons js-theme-icon">${isDark ? 'light_mode' : 'dark_mode'}</span>
      <span class="js-theme-label">${isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}</span>
    </div>
    <div class="wise-popover-divider"></div>
    ${accessibilityReviewSection()}
  `;
}

/* ------------------------------------------------------------------ */
/* Shared user / avatar menu                                           */
/* ------------------------------------------------------------------ */
/*
 * One source of truth for the account (avatar) menu shown from BOTH the
 * top-bar avatar and the nav-module footer profile row, on every shell. Before
 * this each shell hardcoded its own copy, which is how the header drifted to
 * three different names ("Maya Chen" on the dock pages, "Arthur Krupsky" on the
 * chat/report pages, the live auth user on the agent shell) and how the lock
 * glyphs fell out of sync.
 *
 * Live surfaces (no lock): My profile and Invoices & Downloads, each carrying a
 * data-pop-action so the shell's click handler can route them. Everything else
 * (Alerts / Agents quick actions, Preferences, API keys, Help, Docs) renders
 * inert with a trailing lock. Sign out always works.
 *
 * @param {Object} [opts]
 * @param {string} [opts.name]  Display name for the header (defaults to the
 *                              branded demo identity).
 */
export function buildUserMenuBody({ name = 'Arthur Krupsky' } = {}) {
  const safeName = String(name || 'Arthur Krupsky')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const locked = (icon, label) =>
    `<div class="wise-popover-item is-locked" aria-disabled="true" title="Coming soon"><span class="material-icons">${icon}</span>${label}<span class="wise-popover-lock material-icons" aria-hidden="true">lock</span></div>`;
  return `
    <div class="wise-popover-header">${safeName}</div>
    <div class="wise-popover-actions">
      <button type="button" class="wise-pop-action is-locked" aria-disabled="true" title="Coming soon"><span class="material-icons">notifications</span><span>Alerts</span><span class="wise-pop-action-lock material-icons" aria-hidden="true">lock</span></button>
      <span class="wise-pop-vline" aria-hidden="true"></span>
      <button type="button" class="wise-pop-action is-locked" aria-disabled="true" title="Coming soon"><span class="material-icons">tune</span><span>Agents</span><span class="wise-pop-action-lock material-icons" aria-hidden="true">lock</span></button>
    </div>
    <div class="wise-popover-divider"></div>
    <div class="wise-popover-item" data-pop-action="profile"><span class="material-icons">person</span>My profile</div>
    <div class="wise-popover-item" data-pop-action="invoices"><span class="material-icons">receipt_long</span>Invoices &amp; Downloads</div>
    ${locked('tune', 'Preferences')}
    ${locked('key', 'API keys')}
    ${locked('help', 'Help')}
    ${locked('menu_book', 'Docs')}
    <div class="wise-popover-divider"></div>
    <div class="wise-popover-item danger" data-pop-action="signout"><span class="material-icons">logout</span>Sign out</div>
  `;
}

/* ------------------------------------------------------------------ */
/* Shared Appearance popover click handling                            */
/* ------------------------------------------------------------------ */
/*
 * Single source of truth for what every Appearance row DOES when clicked.
 * Previously each shell (agent-overview.js, app.js, and the inline scripts in
 * the chat / portfolio / reformulation / studio pages) re-implemented this
 * same if-chain, which is how a toggle could quietly go unwired on one page
 * (e.g. the Jam strip or Colorblind row doing nothing there). Now every shell
 * calls wireAppearancePopover() and gets identical behaviour.
 *
 * The universal on/off toggles (Minimal UI, Header, Full bleed, Jam strip,
 * Colorblind) and the Text-size buttons are handled here directly via the
 * shared modules, so a page CANNOT forget to wire them. The genuinely
 * shell-specific bits are passed as callbacks:
 *
 * @param {HTMLElement} pop  The .wise-popover element.
 * @param {Object} ctx
 * @param {Function} ctx.render        Re-render the popover body (the shell owns
 *                                     its buildAppearanceBody options). Required.
 * @param {Function} [ctx.onClose]     Close the popover (called on outside/blank click).
 * @param {Function} [ctx.togglePivot] Toggle nav pivot (shells whose nav can pivot).
 * @param {Function} [ctx.toggleTheme] Toggle light/dark. Required for the theme row.
 * @param {Function} [ctx.setLayout]   Set a module layout (mode id) — dock/portfolio shells.
 * @param {Function} [ctx.setDock]     Set the WISEai dock mode (id) — dock shells.
 * @param {Function} [ctx.toggleWiseaiChat] Toggle the WISEai chat on/off — dock shells.
 */
export function wireAppearancePopover(pop, ctx = {}) {
  if (!pop || pop.dataset.appearanceWired === '1') return;
  pop.dataset.appearanceWired = '1';
  const render = () => { try { ctx.render?.(); } catch (_) {} };

  pop.addEventListener('click', (ev) => {
    const within = (sel) => {
      const el = ev.target.closest(sel);
      return el && pop.contains(el) ? el : null;
    };

    /* Module layout (Column …) — dock / portfolio shells only. */
    const layout = within('[data-layout]');
    if (layout) { ev.stopPropagation(); ctx.setLayout?.(layout.dataset.layout); render(); return; }

    /* Nav pivot — shells whose rail can pivot to a top bar. */
    if (within('[data-pivot]')) { ev.stopPropagation(); ctx.togglePivot?.(); render(); return; }

    /* Universal on/off toggles — handled here so no shell can miss one. */
    if (within('[data-minimal]'))     { ev.stopPropagation(); applyMinimalUi(!isMinimalUiOn());   render(); return; }
    if (within('[data-headerfloat]')) { ev.stopPropagation(); applyHeaderFloat(!isHeaderFloatOn()); render(); return; }
    if (within('[data-fullbleed]'))   { ev.stopPropagation(); applyFullBleed(!isFullBleedOn());   render(); return; }
    if (within('[data-jam]'))         { ev.stopPropagation(); applyJamStrip(!isJamStripOn());      render(); return; }
    if (within('[data-colorblind]'))  { ev.stopPropagation(); applyColorblind(!isColorblindOn());  render(); return; }

    /* In-popover Jam player transport + track picker. Update the player in
       place (not a full re-render) so the song list keeps its scroll position
       and the popover doesn't jump as you tap between chips. */
    if (within('[data-jam-play]')) { ev.stopPropagation(); toggleJam(); if (!syncJamPop(pop)) render(); return; }
    const jamSong = within('[data-jam-song]');
    if (jamSong) { ev.stopPropagation(); toggleJam(jamSong.dataset.jamSong); if (!syncJamPop(pop)) render(); return; }

    /* WISEai dock segmented control + chat on/off — dock shells only. */
    const dock = within('.fz-btn[data-wiseai-dock]');
    if (dock) { ev.stopPropagation(); ctx.setDock?.(dock.dataset.wiseaiDock); render(); return; }
    if (within('[data-wiseai-chat]')) { ev.stopPropagation(); ctx.toggleWiseaiChat?.(); render(); return; }

    /* Text size. */
    const fz = within('.fz-btn[data-fz]');
    if (fz) { ev.stopPropagation(); setTextSize(fz.dataset.fz); render(); return; }

    /* CVD-type buttons are handled by topbar.js's global capture-phase handler
       (it runs before this bubble handler and stops propagation), so we never
       reach here for them — but guard anyway so a stray click can't close us. */
    if (within('.fz-btn[data-cbtype]')) { ev.stopPropagation(); return; }

    /* Light / dark theme. */
    if (within('[data-pop-action="theme"]')) { ev.stopPropagation(); ctx.toggleTheme?.(); render(); return; }

    /* The accessibility-review row is a real link — let it navigate. */
    if (within('[data-pop-action="a11y-review"]')) return;

    /* Non-interactive chrome (labels, dividers, the text-size row wrapper):
       swallow the click so it neither toggles nor closes the popover. */
    if (within('.fz-row, .jam-pop, .wise-popover-header, .wise-popover-divider')) { ev.stopPropagation(); return; }

    /* Anything else = a click on blank popover space → close. */
    ctx.onClose?.();
  });
}
