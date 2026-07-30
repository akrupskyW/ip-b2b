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

import { isMinimalUiOn, isHeaderFloatOn, isFullBleedOn, isColorblindOn } from './topbar.js';
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
    <div class="wise-popover-divider"></div>
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
