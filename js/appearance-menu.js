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
  isHeaderFloatOn,
  isFullBleedOn,
  isColorblindOn,
  getColorblindMode,
  COLORBLIND_MODES,
} from './topbar.js';
import { isJamStripOn } from './jam-strip.js';
import { getStoredFontSize } from './text-size.js';

/** Module-layout rows (column / grid / split / stack / tabbed). Shells without
    multiple modules (e.g. a single agent page) pass no list and get nothing. */
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

/** "Dock Chat" segmented control (left / center / right) for the WISEai dock. */
function wiseaiDockSection(mode) {
  const btn = (m, icon, label) =>
    `<button type="button" class="fz-btn${mode === m ? ' fz-active' : ''}" data-wiseai-dock="${m}" title="${label}" aria-label="${label}"><span class="material-symbols-outlined">${icon}</span></button>`;
  return `
    <div class="fz-row">
      <span class="fz-row-label">Dock Chat</span>
      <div class="fz-btns wiseai-seg" role="group" aria-label="Dock Chat position">
        ${btn('left', 'align_justify_flex_start', 'Dock chat left')}
        ${btn('center', 'align_justify_center', 'Center chat')}
        ${btn('right', 'align_justify_flex_end', 'Dock chat right')}
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
 * @param {string}  [opts.wiseaiDockMode]  Active WISEai dock side ('left'|'center'|'right'|'off').
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
  `;
}
