/* ------------------------------------------------------------------ */
/* Shared Appearance popover body                                      */
/* ------------------------------------------------------------------ */
/*
 * One source of truth for the markup inside the "Appearance" (crossword)
 * popover. Every shell — the agent overview pages (js/agent-overview.js), the
 * Portfolio workspace (js/portfolio-module.js), the WISEcodeAI chat (pages/ai-chat.html
 * inline), and the application sidebar (js/app.js) — renders the SAME menu by
 * calling buildAppearanceBody(). This keeps the toggles (Minimal UI, Header,
 * Full bleed, Jam strip, Search, Text size, Theme …) identical everywhere; before this
 * the menu was copy-pasted per shell and drifted out of sync (which is how a
 * new toggle could land in one menu but not another).
 *
 * The row set is FIXED here — it is not configurable per shell. That is
 * deliberate: shells used to pass their own show/hide options (a module-layout
 * list, a "Dock Chat" segmented control, a "WISEcodeAI chat" toggle) and the menu
 * drifted page to page (overview/portfolio grew rows wiseai.html never had).
 * Now the ONLY things a shell varies are the live state a row reflects — whether
 * the nav is pivoted (showPivot/isPivoted) and whether dark mode is on (isDark).
 * Everything else renders the same on every page.
 *
 * Click handling stays in each shell: every row keys off a stable data-*
 * attribute (data-pivot / data-minimal / data-navhistory / data-fullbleed /
 * data-fbchatonly / data-jam / data-appsearch / data-navhamburger / data-colorblind / data-fz /
 * data-pop-action), so the existing per-shell listeners keep working unchanged.
 */

import {
  isMinimalUiOn,
  applyMinimalUi,
  isIconRailOn,
  applyIconRail,
  isFullBleedOn,
  isFullBleedEverythingOn,
  isChatOnlyFullBleedOn,
  applyFullBleedMode,
  getNavBg,
  getChatBg,
  getContainedChatBg,
  getRightModuleBg,
  getAsideBg,
  getHistoryBg,
  applyFbColor,
  RMOD_MODES,
  getRightModuleMode,
  applyRightModuleMode,
  FB_PRESETS,
  getFullBleedTheme,
  isFullBleedDefaultTheme,
  applyFullBleedTheme,
  clearFullBleedThemeMark,
  isColorblindOn,
  applyColorblind,
  getColorblindMode,
  COLORBLIND_MODES,
  isChatTintOn,
  applyChatTint,
  getModuleGap,
  applyModuleGap,
  isCwrUiOn,
  applyCwrUi,
  isSharpEdgesOn,
  applySharpEdges,
  getBrandStyle,
  applyBrandStyle,
  isAdminControlsOn,
  applyAdminControls,
  syncThemeKeys,
} from './topbar.js';
import {
  isJamStripOn,
  applyJamStrip,
} from './jam-strip.js';
import { getStoredFontSize, setTextSize } from './text-size.js';
import {
  isActivityStripOn,
  applyActivityStrip,
} from './chat-activity-strip.js';
import {
  isAppSearchOn,
  applyAppSearch,
} from './app-search.js';
import {
  isNavHistoryOn,
  applyNavHistory,
} from './nav-history.js';
import {
  isNavHamburgerOn,
  applyNavHamburger,
} from './nav-hamburger.js';

/**
 * A binary on/off setting row. Instead of highlighting the whole row when
 * active, it shows a Material Symbols switch glyph to the LEFT of the label —
 * `toggle_on` (blue) when on, `toggle_off` (gray) when off. The data-* hook and
 * label match the old rows so every shell's existing click handlers keep working.
 *
 * @param {string} dataAttr  Full data-* attribute string (e.g. `data-minimal="1"`).
 * @param {boolean} on        Whether the setting is currently on.
 * @param {string} label      Visible row label.
 * @param {boolean} [admin]   Trail the row with a pink "Admin" badge (same badge
 *                            the Accessibility review / All modules rows carry),
 *                            marking the toggle as an admin-only capability.
 * @param {string} [tip]     Hover/focus tooltip. Defaults to the visible label.
 */
function toggleRow(dataAttr, on, label, admin = false, tip = '', disabled = false) {
  const badge = admin ? '<span class="wise-popover-badge">Admin</span>' : '';
  const adminAttr = admin ? ' data-admin-item="1"' : '';
  const lock = disabled ? ' is-locked' : '';
  const disabledAttr = disabled ? ' aria-disabled="true"' : '';
  return `<div class="wise-popover-item wise-toggle-item${on ? ' is-on' : ''}${lock}" ${dataAttr}${adminAttr}${disabledAttr} role="switch" aria-checked="${on ? 'true' : 'false'}"${tipAttrs(tip || label)}>
      <span class="material-symbols-outlined wise-toggle-ico">${on ? 'toggle_on' : 'toggle_off'}</span>${label}${badge}
    </div>`;
}

/** Escape a string for use inside a double-quoted HTML attribute. */
function escAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/** `data-tip` + `title` so the shared #lir-tooltip card can label a control,
    and a native title remains as a fallback before the JS tooltip is ready. */
function tipAttrs(text) {
  const t = escAttr(text);
  return t ? ` data-tip="${t}" title="${t}"` : '';
}

/** True when a chunk of Appearance markup is an Admin-badged row (or nested
    chrome that belongs to one — full-bleed pickers, module gap).
    The pink Admin badge is the source of truth: unbadged rows must never be
    omitted when Admin controls is off. */
function isAdminMarkup(html) {
  const s = String(html || '');
  return /wise-popover-badge|data-admin-item=/.test(s);
}

/** Omit Admin-badged markup when the master Admin-controls toggle is off.
    Unbadged HTML is returned as-is, even if a caller wraps it by mistake. */
function adminOnly(html) {
  if (isAdminControlsOn()) return html;
  return isAdminMarkup(html) ? '' : (html || '');
}

/** "Pivot Navigation" row — only for shells whose nav rail can pivot to the top. */
function pivotSection(showPivot, isPivoted) {
  if (!showPivot) return '';
  return adminOnly(toggleRow('data-pivot="1"', isPivoted, 'Pivot Navigation', true, 'Move the navigation to a horizontal top bar'));
}

/** "Colorblind type" segmented control — only revealed once the colorblind
    palette is switched on, so the picker never clutters the menu when unused.
    Three buttons, one per cone system (deutan / protan / tritan); each palette
    also covers the matching anomaly. Each button carries a `data-cbtype` id
    that topbar.js's capture-phase handler turns into the matching cb-<type>
    palette on <html>. */
function colorblindTypeSection() {
  if (!isColorblindOn()) return '';
  const active = getColorblindMode();
  const btns = COLORBLIND_MODES.map(
    (m) =>
      `<button type="button" class="fz-btn${m.id === active ? ' fz-active' : ''}" data-cbtype="${m.id}" aria-label="${m.label}" aria-pressed="${m.id === active ? 'true' : 'false'}"${tipAttrs(m.label)}>${m.short}</button>`
  ).join('');
  return `
    <div class="fz-row cb-type-row">
      <span class="fz-row-label"${tipAttrs('Color vision type — green-weak, red-weak, or blue-green / blue-yellow weak. Each choice also covers the complete (blind) form of that type.')}>Vision type</span>
      <div class="fz-btns" role="group" aria-label="Color vision type">${btns}</div>
    </div>`;
}

/** "Module spacing" segmented control — an admin-only, pink-outlined toggle that
    steps the horizontal gap BETWEEN modules in #modules-row through Small (12px)
    / Medium (24px) / Large (36px) / XL (48px). Each button carries a `data-mg` id
    that wireAppearancePopover() turns into the matching mod-gap-<size> class on
    <html>. Clicking the active step again clears back to the default row gap. */
function moduleGapSection() {
  const active = getModuleGap();
  const opts = [
    { id: 'sm', label: 'S', tip: 'Small gap (12px)' },
    { id: 'md', label: 'M', tip: 'Medium gap (24px)' },
    { id: 'lg', label: 'L', tip: 'Large gap (36px)' },
    { id: 'xl', label: 'XL', tip: 'Extra-large gap (48px)' },
  ];
  const btns = opts
    .map(
      (o) =>
        `<button type="button" class="mg-seg-btn${o.id === active ? ' is-active' : ''}" data-mg="${o.id}" aria-pressed="${o.id === active ? 'true' : 'false'}"${tipAttrs(o.tip)}>${o.label}</button>`
    )
    .join('');
  return `
    <div class="mg-size" data-admin-item="1">
      <span class="mg-size-label"${tipAttrs('Gap between modules')}>Module spacing<span class="wise-popover-badge">Admin</span></span>
      <div class="mg-seg" role="group" aria-label="Module spacing">${btns}</div>
    </div>`;
}

/** Read the last accessibility-audit verdict for the theme we're rendering in
    (the review page publishes 'pass' / 'warn' / 'fail' per theme to localStorage).
    Returns '' when nothing has been recorded yet OR when the review found no
    problems — in both cases the badge stays green ("pass"), since the shipping
    palette clears AAA in both themes. */
function a11yVerdictClass() {
  try {
    const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const store = JSON.parse(localStorage.getItem('wise-a11y-verdict')) || {};
    const v = store[theme];
    if (v === 'warn') return ' is-warn';
    if (v === 'fail') return ' is-fail';
    return ' is-pass';
  } catch (e) {
    return ' is-pass';
  }
}

/** Link out to the standalone WCAG audit. The review lives in pages/, so the
    href is resolved against wherever the calling shell is mounted (app pages
    sit in pages/, the root shell one level up) — same rule as auth-guard.js.
    The trailing "Admin" badge is tinted by the live audit verdict (green pass /
    amber warn / red fail) so it signals how well the app scores, not just that
    it's an admin surface. */
function accessibilityReviewSection() {
  let href = 'pages/accessibility-review.html';
  try {
    if (location.pathname.indexOf('/pages/') !== -1) href = 'accessibility-review.html';
  } catch (e) { /* non-browser context — keep the default */ }
  return `
    <a class="wise-popover-item" href="${href}" data-pop-action="a11y-review" data-admin-item="1"${tipAttrs('Open the WCAG accessibility audit')}>
      <span class="material-symbols-outlined">accessibility_new</span>Accessibility review
      <span class="wise-popover-badge${a11yVerdictClass()}">Admin</span>
      <span class="wise-popover-ext material-symbols-outlined" aria-hidden="true">arrow_outward</span>
    </a>`;
}

/** Link out to the "All Modules" admin index (the app-wide module directory +
    the Icon Inventory). Sits directly beneath the Accessibility review row and,
    like it, is an Admin-only destination. Path resolves the same way — the page
    lives in pages/, so app shells (already in pages/) link to it directly while
    a root shell reaches it through pages/. */
function allModulesSection() {
  let href = 'pages/all-modules.html';
  try {
    if (location.pathname.indexOf('/pages/') !== -1) href = 'all-modules.html';
  } catch (e) { /* non-browser context — keep the default */ }
  return `
    <a class="wise-popover-item" href="${href}" data-pop-action="all-modules" data-admin-item="1"${tipAttrs('Open the module directory and icon inventory')}>
      <span class="material-symbols-outlined">widgets</span>All modules
      <span class="wise-popover-badge">Admin</span>
      <span class="wise-popover-ext material-symbols-outlined" aria-hidden="true">arrow_outward</span>
    </a>`;
}

/** Link out to the "Progress log" admin page — the internal, day-by-day record
    of what shipped across the platform (components, features, logic, UX/UI,
    changes, improvements, updates, deletions), grouped by page. Sits beneath the
    All modules row and, like it, is an Admin-only destination. Path resolves the
    same way — the page lives in pages/, so app shells (already in pages/) link to
    it directly while a root shell reaches it through pages/. */
function progressLogSection() {
  let href = 'pages/progress-log.html';
  try {
    if (location.pathname.indexOf('/pages/') !== -1) href = 'progress-log.html';
  } catch (e) { /* non-browser context — keep the default */ }
  return `
    <a class="wise-popover-item" href="${href}" data-pop-action="progress-log" data-admin-item="1"${tipAttrs('Open the day-by-day progress log')}>
      <span class="material-symbols-outlined">timeline</span>Progress log
      <span class="wise-popover-badge">Admin</span>
      <span class="wise-popover-ext material-symbols-outlined" aria-hidden="true">arrow_outward</span>
    </a>`;
}

/** Link out to the "Page gallery" admin page — a full-screen screenshot gallery
    of every unique HTML page in the Module Directory catalog. Sits beneath the
    Progress log row and, like it, is an Admin-only destination. Path resolves
    the same way as the other Admin destinations. */
function pageGallerySection() {
  let href = 'pages/page-gallery.html';
  try {
    if (location.pathname.indexOf('/pages/') !== -1) href = 'page-gallery.html';
  } catch (e) { /* non-browser context — keep the default */ }
  return `
    <a class="wise-popover-item" href="${href}" data-pop-action="page-gallery" data-admin-item="1"${tipAttrs('Open a full-screen gallery of every unique page')}>
      <span class="material-symbols-outlined">browse_gallery</span>Page gallery
      <span class="wise-popover-badge">Admin</span>
      <span class="wise-popover-ext material-symbols-outlined" aria-hidden="true">arrow_outward</span>
    </a>`;
}

/** "Surfaces" section — the segmented control that switches the app's surface
    treatment between the flat default, "Style 1" (inset stamp with hairline
    borders), and "Style 2" (flat surfaces with every module except the chat
    borderless). It deliberately leaves the owl bug + WISE
    wordmark untouched (see applyBrandStyle / BRAND_CSS in topbar.js). A
    neutral segmented control (same skin as Text size), each button carrying a
    `data-brandstyle` id that wireAppearancePopover() feeds to applyBrandStyle().
    Clicking "Default" clears back to the flat surfaces. Admin-only (badge +
    hidden when Admin controls is off). */
function brandingSection() {
  const active = getBrandStyle();
  const opts = [
    { id: '', label: 'Default', tip: 'Flat surfaces' },
    { id: 'inset', label: 'Style 1', tip: 'Inset surfaces with hairline borders' },
    { id: 'flush', label: 'Style 2', tip: 'No border on modules other than chat' },
  ];
  const btns = opts
    .map(
      (o) =>
        `<button type="button" class="fz-seg-btn${o.id === active ? ' is-active' : ''}" data-brandstyle="${o.id}" aria-pressed="${o.id === active ? 'true' : 'false'}"${tipAttrs(o.tip)}>${o.label}</button>`
    )
    .join('');
  return `
    <div class="fz-size brand-style-row" data-admin-item="1">
      <span class="fz-size-label"${tipAttrs('How module surfaces are drawn')}>Surface style<span class="wise-popover-badge">Admin</span></span>
      <div class="fz-seg" role="group" aria-label="Surface style">${btns}</div>
    </div>`;
}

/** Whether the WISEowl walkthrough sticky module is currently open. The
    walkthrough (js/owl-walkthrough.js) publishes window.WiseWalkthrough with an
    isOpen() probe; guard for shells that load before it (or don't ship it). */
function isTourOpen() {
  try {
    return !!(typeof window !== 'undefined' && window.WiseWalkthrough && window.WiseWalkthrough.isOpen && window.WiseWalkthrough.isOpen());
  } catch (e) {
    return false;
  }
}

/** "Walkthrough" row — a plain (non-admin) toggle that opens the WISEowl
    walkthrough sticky module or hides it, reflecting whether it's live right
    now. Renders nothing on shells where the walkthrough isn't loaded so the
    toggle is never a dead control. */
function tourSection() {
  if (typeof window === 'undefined' || !window.WiseWalkthrough) return '';
  return toggleRow('data-tour="1"', isTourOpen(), 'Walkthrough', false, 'Open the WISEowl walkthrough or hide the sticky module');
}

/** Text-size segmented block (S / M / L / XL). Extracted so it can live inside
    the "Accessibility" group card alongside the color controls. */
function textSizeSection() {
  const fz = getStoredFontSize();
  const sizes = {
    sm: { short: 'S', tip: 'Small text' },
    md: { short: 'M', tip: 'Medium text' },
    lg: { short: 'L', tip: 'Large text' },
    xl: { short: 'XL', tip: 'Extra-large text' },
  };
  return `
    <div class="fz-size">
      <span class="fz-size-label"${tipAttrs('Text size')}>Text size</span>
      <div class="fz-seg" role="group" aria-label="Text size">
        ${Object.keys(sizes)
          .map((s) => `<button type="button" class="fz-seg-btn${fz === s ? ' is-active' : ''}" data-fz="${s}" aria-pressed="${fz === s ? 'true' : 'false'}"${tipAttrs(sizes[s].tip)}>${sizes[s].short}</button>`)
          .join('')}
      </div>
    </div>`;
}

/** Light / dark theme row. Extracted so it can sit inside the "Experience"
    group card. Keys off data-pop-action="theme" (handled by the shell). */
function themeSection(isDark) {
  const tip = isDark ? 'Switch to Light mode' : 'Switch to Dark mode';
  return `
    <div class="wise-popover-item" data-pop-action="theme"${tipAttrs(tip)}>
      <span class="material-symbols-outlined js-theme-icon">${isDark ? 'light_mode' : 'dark_mode'}</span>
      <span class="js-theme-label">${tip}</span>
    </div>`;
}

/** Full-bleed sub-controls — revealed under Full bleed or Chat-only full bleed
    once either mode is on. Full bleed exposes colour pickers for nav, chat,
    right module, aside, and History, plus the right-module behaviour control
    and presets. Chat-only only exposes the chat colour, Reset, and presets
    (nav / History / right-module stay contained and unpainted); the preset
    still paints every container inside the chat. Colour pickers
    key off `data-fbcolor`, the behaviour segmented control off `data-rmodmode`,
    and the presets off `data-fbpreset`; all handled in wireAppearancePopover().
    Renders nothing while both modes are off. */
function fbColorRow(kind, label, value, fallback) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(value || '') ? value : fallback;
  return `
    <label class="fb-color-row">
      <span class="fb-color-label">${label}</span>
      <input type="color" class="fb-color-input" data-fbcolor="${kind}" value="${hex}" aria-label="${label}">
    </label>`;
}
function fullBleedOptionsSection() {
  if (!isFullBleedOn()) return '';
  const mode = getRightModuleMode();
  const theme = getFullBleedTheme();
  const isDefault = isFullBleedDefaultTheme();
  const chatOnly = isChatOnlyFullBleedOn();

  const rmodTips = {
    '': 'Tuck the right module as a drawer',
    flat: 'Flatten the right module into a full-height column',
    hidden: 'Hide the right module',
  };
  const modeBtns = RMOD_MODES.map(
    (m) =>
      `<button type="button" class="fz-seg-btn${m.id === mode ? ' is-active' : ''}" data-rmodmode="${m.id}" aria-pressed="${m.id === mode ? 'true' : 'false'}"${tipAttrs(rmodTips[m.id] || m.label)}>${m.label}</button>`
  ).join('');

  const presetBtns = FB_PRESETS.map((p) => {
    const sw = `--sw-nav:${p.nav};--sw-chat:${p.chat};--sw-rmod:${p.rmod}`;
    return `<button type="button" class="fb-preset-btn${p.id === theme ? ' is-active' : ''}" data-fbpreset="${p.id}" aria-pressed="${p.id === theme ? 'true' : 'false'}"${tipAttrs('Apply the ' + p.label + ' color theme')}>
        <span class="fb-preset-sw" style="${sw}" aria-hidden="true"></span>${p.label}
      </button>`;
  }).join('');
  const resetBtn = `<button type="button" class="fb-preset-btn${isDefault ? ' is-active' : ''}" data-fbpreset="" aria-pressed="${isDefault ? 'true' : 'false'}"${tipAttrs('Reset full-bleed colors to the contrasting default set')}>Default</button>`;
  const colorReset = `<button type="button" class="fb-color-reset" data-fbreset="1"${tipAttrs('Restore every surface to the original default colors')}>Reset colors</button>`;

  const navFallback = document.documentElement.classList.contains('dark') ? '#F4F2EA' : '#1C3E60';
  const chatFallback = getContainedChatBg();
  const rmodFallback = document.documentElement.classList.contains('dark') ? '#1A2339' : '#ffffff';

  const extraSurfaces = chatOnly ? '' : `
      ${fbColorRow('nav', 'Navigation background', getNavBg(), navFallback)}
      ${fbColorRow('rmod', 'Right module background', getRightModuleBg(), rmodFallback)}
      ${fbColorRow('aside', 'Aside background', getAsideBg() || getRightModuleBg(), rmodFallback)}
      ${fbColorRow('hist', 'History background', getHistoryBg() || getRightModuleBg(), rmodFallback)}`;
  const rmodBlock = chatOnly ? '' : `
      <div class="fz-size fb-rmod-mode">
        <span class="fz-size-label"${tipAttrs('How the module to the right of chat behaves')}>Right module</span>
        <div class="fz-seg" role="group" aria-label="Right module behaviour">${modeBtns}</div>
      </div>`;

  return `
    <div class="fb-opts${chatOnly ? ' is-chat-only' : ''}" role="group" aria-label="Full bleed options" data-admin-item="1">
      ${fbColorRow('chat', 'Chat window background', getChatBg(), chatFallback)}
      ${extraSurfaces}
      ${colorReset}
      ${rmodBlock}
      <div class="fb-presets">
        <span class="fb-preset-label"${tipAttrs(chatOnly ? 'Apply a named color theme to the chat' : 'Apply a named color theme to all full-bleed surfaces')}>Preset themes</span>
        <div class="fb-preset-btns" role="group" aria-label="Preset themes">${presetBtns}${resetBtn}</div>
      </div>
    </div>`;
}

/** Wrap a set of rows in a titled "group" card. Groups are the unit the
    Appearance popover stacks inside one of its two columns: each group (and
    therefore every row inside it) stays within ONE column and is never split
    or stretched across columns. An empty body (e.g. a section whose only rows
    are conditionally hidden) renders nothing so we don't leave a stray empty card. */
function apGroup(title, body) {
  const inner = String(body || '').trim();
  if (!inner) return '';
  return `
    <section class="wise-appearance-group">
      <div class="wise-popover-header">${title}</div>
      ${inner}
    </section>`;
}

/** One vertical stack of group cards. Empty (every group hidden) renders nothing
    so a single remaining column can grow to full width. */
function apCol(...groups) {
  const inner = groups.join('').trim();
  if (!inner) return '';
  return `<div class="wise-appearance-col">${inner}</div>`;
}

/**
 * Build the full innerHTML for an Appearance popover.
 *
 * ONE canonical popover for the whole app. The row set is fixed here — the same
 * toggles, in the same order, on every shell — so the menu CANNOT drift between
 * pages again (previously each shell passed its own show/hide options, which is
 * how overview/portfolio grew an extra "Dock Chat" control and a module-layout
 * list that wiseai.html never had). The only things a shell varies are the live
 * state a row reflects: whether the nav is pivoted and whether dark mode is on.
 *
 * Deliberately NOT configurable: module-layout list, the WISEcodeAI "Dock Chat"
 * segmented control, and the "WISEcodeAI chat" on/off toggle. They were removed so
 * every page renders the identical menu that wiseai.html does. Extra options are
 * ignored, so existing call sites that still pass them keep working unchanged.
 *
 * @param {Object}  [opts]
 * @param {boolean} [opts.showPivot]  Show the "Pivot Navigation" row (shells whose rail can pivot).
 * @param {boolean} [opts.isPivoted]  Whether the nav is currently pivoted.
 * @param {boolean} [opts.isDark]     Whether dark mode is active (shells compute this differently).
 * @returns {string} popover innerHTML
 */
export function buildAppearanceBody({
  showPivot = false,
  isPivoted = false,
  isDark = false,
} = {}) {
  return `
    ${apCol(
      apGroup('Layout', `
        ${pivotSection(showPivot, isPivoted)}
        ${toggleRow('data-minimal="1"', isMinimalUiOn(), 'Minimal UI', false, 'Show only the logo, Appearance, and your profile')}
        ${toggleRow('data-iconrail="1"', isIconRailOn(), 'Icons only', false, 'Collapse the navigation to icons')}
        ${adminOnly(toggleRow('data-navhistory="1"', isNavHistoryOn(), 'History in navigation', true, 'Merge the History module into an expandable section of the primary navigation — search, projects, and All conversations stay fully usable'))}
        ${adminOnly(toggleRow('data-sharpedges="1"', isSharpEdgesOn(), 'Sharper edges', true, 'Use tighter, less-rounded corners'))}
      `),
      apGroup('Full bleed', `
        ${adminOnly(toggleRow('data-fullbleed="1"', isFullBleedEverythingOn(), 'Full bleed', true, isAppSearchOn() ? 'Unavailable while Search is on' : 'Stretch every module edge-to-edge', isAppSearchOn()))}
        ${adminOnly(toggleRow('data-fbchatonly="1"', isChatOnlyFullBleedOn(), 'Chat-only full bleed', true, isAppSearchOn() ? 'Unavailable while Search is on' : 'Stretch only the chat module; keep the navigation and every other module contained', isAppSearchOn()))}
        ${adminOnly(fullBleedOptionsSection())}
      `),
      apGroup('Chat', `
        ${adminOnly(toggleRow('data-chattint="1"', isChatTintOn(), 'Blue chat surface', true, 'Tint the chat surface with brand blue'))}
        ${adminOnly(toggleRow('data-activitystrip="1"', isActivityStripOn(), 'Activity strip', true, 'Show the live activity strip on the chat edge'))}
      `),
    )}
    ${apCol(
      apGroup('Sound', `
        ${adminOnly(toggleRow('data-jam="1"', isJamStripOn(), 'Jam strip', true, 'Show the music player in the navigation'))}
      `),
      apGroup('Accessibility', `
        ${themeSection(isDark)}
        ${toggleRow('data-colorblind="1"', isColorblindOn(), 'Accessible colors', false, 'Use a color-vision-safe palette')}
        ${colorblindTypeSection()}
        ${textSizeSection()}
        ${adminOnly(brandingSection())}
      `),
      apGroup('Experience', `
        ${tourSection()}
        ${adminOnly(toggleRow('data-cwrui="1"', isCwrUiOn(), 'Crawl · Walk · Run', true, 'Show the Crawl · Walk · Run switch — Crawl fills SaaS, Walk opens chat, Run unlocks the composer'))}
      `),
      apGroup('Admin', `
        ${toggleRow('data-adminui="1"', isAdminControlsOn(), 'Admin controls', false, 'Show or hide settings that carry an Admin badge')}
        ${adminOnly(toggleRow('data-appsearch="1"', isAppSearchOn(), 'Search', true, 'Show a search field aligned with the nav logo for transcripts, outputs, and reports'))}
        ${adminOnly(toggleRow('data-navhamburger="1"', isNavHamburgerOn(), 'Menu icon', true, isAppSearchOn() ? 'When the navigation is collapsed, show a menu icon to the left of the logo instead of the icon rail' : 'Unavailable while Search is off', !isAppSearchOn()))}
        ${adminOnly(accessibilityReviewSection())}
        ${adminOnly(allModulesSection())}
        ${adminOnly(progressLogSection())}
        ${adminOnly(pageGallerySection())}
      `),
    )}
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
    `<div class="wise-popover-item is-locked" aria-disabled="true" title="Coming soon"><span class="material-symbols-outlined">${icon}</span>${label}<span class="wise-popover-lock material-symbols-outlined" aria-hidden="true">lock</span></div>`;
  return `
    <div class="wise-popover-header">${safeName}</div>
    <div class="wise-popover-actions">
      <button type="button" class="wise-pop-action is-locked" aria-disabled="true" title="Coming soon"><span class="material-symbols-outlined">notifications</span><span>Alerts</span><span class="wise-pop-action-lock material-symbols-outlined" aria-hidden="true">lock</span></button>
      <span class="wise-pop-vline" aria-hidden="true"></span>
      <button type="button" class="wise-pop-action is-locked" aria-disabled="true" title="Coming soon"><span class="material-symbols-outlined">tune</span><span>Agents</span><span class="wise-pop-action-lock material-symbols-outlined" aria-hidden="true">lock</span></button>
    </div>
    <div class="wise-popover-divider"></div>
    <div class="wise-popover-item" data-pop-action="profile"><span class="material-symbols-outlined">person</span>My profile</div>
    <div class="wise-popover-item" data-pop-action="invoices"><span class="material-symbols-outlined">receipt_long</span>Invoices &amp; Downloads</div>
    ${locked('tune', 'Preferences')}
    ${locked('key', 'API keys')}
    ${locked('help', 'Help')}
    ${locked('menu_book', 'Docs')}
    <div class="wise-popover-divider"></div>
    <div class="wise-popover-item danger" data-pop-action="signout"><span class="material-symbols-outlined">logout</span>Sign out</div>
  `;
}

/* Clear the `wise-auth` session and go to the sign-in screen. Login pages
   bounce already-authed visitors back into the app (`bounceIfAuthed`), so a
   Sign-out click that only navigates to login.html looks like it does nothing.
   Works with or without `js/auth.js` loaded — many shells only ship the guard. */
export function performSignOut() {
  try { window.WiseAuth?.logout?.(); } catch (_) {}
  try { localStorage.removeItem('wise-auth'); } catch (_) {}
  let url = 'login.html';
  try {
    if (window.WiseAuth && typeof window.WiseAuth.loginUrl === 'function') {
      url = window.WiseAuth.loginUrl();
    } else if (location.pathname.indexOf('/pages/') === -1) {
      url = 'pages/login.html';
    }
  } catch (_) {}
  window.location.href = url;
}

/* Avatar-menu Sign out is a `data-pop-action` row whose click is handled
   (or swallowed) by each shell's popover bubble listener. Same pattern as
   topbar.js's colorblind-type picker: intercept in CAPTURE so every page
   signs out identically, even when a shell only does `location.href = login`. */
function wireSignOut() {
  if (typeof document === 'undefined' || document.__wiseSignOutBound) return;
  document.__wiseSignOutBound = true;
  if (typeof window !== 'undefined') window.performSignOut = performSignOut;
  document.addEventListener(
    'click',
    (e) => {
      const item = e.target?.closest?.('[data-pop-action="signout"]');
      if (!item) return;
      e.stopPropagation();
      e.preventDefault();
      performSignOut();
    },
    true
  );
}

if (typeof document !== 'undefined') wireSignOut();

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
 * The universal on/off toggles (Minimal UI, Icons only, History in navigation,
 * Full bleed, Jam strip, Search, Menu icon, Colorblind) and the Text-size buttons are
 * handled here directly via the
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
 *
 * Note: any extra callbacks a shell still passes (e.g. setLayout / setDock /
 * toggleWiseaiChat from before the menu was unified) are simply ignored — those
 * rows no longer exist in the one canonical popover.
 */
export function wireAppearancePopover(pop, ctx = {}) {
  if (!pop || pop.dataset.appearanceWired === '1') return;
  pop.dataset.appearanceWired = '1';
  pop.classList.add('wise-popover--appearance');
  /* Re-render the body, then re-place the popover. Toggling a row can reveal
     (or hide) extra content — the surface pickers under "Full bleed", the
     CVD-type buttons under "Accessible colors" — which changes the popover's
     height. Without re-placing, a taller popover keeps its old top/left and
     spills off its anchor or out of the viewport, so we call the reposition
     closure the positioning helpers stashed on the node (topbar.js
     positionPopover*), guarded for shells that place it themselves. */
  const render = () => {
    try { ctx.render?.(); } catch (_) {}
    try { pop.__reposition?.(); } catch (_) {}
  };

  /* The chat ⋯ Admin popover writes the same wise-admin-ui key. If Appearance
     is open at the same time, rebuild so its Admin-badged rows appear/disappear
     in lockstep rather than waiting for the next open. */
  if (!pop.__adminUiBound) {
    pop.__adminUiBound = true;
    document.addEventListener('wise:admin-ui', () => {
      if (!pop.isConnected || !pop.classList.contains('open')) return;
      render();
    });
    document.addEventListener('wise:app-search', () => {
      if (!pop.isConnected || !pop.classList.contains('open')) return;
      render();
    });
  }

  pop.addEventListener('click', (ev) => {
    const within = (sel) => {
      const el = ev.target.closest(sel);
      return el && pop.contains(el) ? el : null;
    };

    /* Nav pivot — shells whose rail can pivot to a top bar. */
    if (within('[data-pivot]')) { ev.stopPropagation(); ctx.togglePivot?.(); render(); return; }

    /* Universal on/off toggles — handled here so no shell can miss one. */
    if (within('[data-minimal]'))     { ev.stopPropagation(); applyMinimalUi(!isMinimalUiOn());   render(); return; }
    if (within('[data-iconrail]'))    { ev.stopPropagation(); applyIconRail(!isIconRailOn());     render(); return; }
    if (within('[data-navhistory]'))  {
      ev.stopPropagation();
      const next = !isNavHistoryOn();
      applyNavHistory(next, true, { open: next });
      render();
      return;
    }
    if (within('[data-fullbleed]'))   { ev.stopPropagation(); if (isAppSearchOn()) return; applyFullBleedMode(isFullBleedEverythingOn() ? '' : 'all'); render(); return; }
    if (within('[data-fbchatonly]'))  { ev.stopPropagation(); if (isAppSearchOn()) return; applyFullBleedMode(isChatOnlyFullBleedOn() ? '' : 'chat'); render(); return; }
    if (within('[data-jam]'))         { ev.stopPropagation(); applyJamStrip(!isJamStripOn());      render(); return; }
    if (within('[data-chattint]'))    { ev.stopPropagation(); applyChatTint(!isChatTintOn());      render(); return; }
    if (within('[data-activitystrip]')) { ev.stopPropagation(); applyActivityStrip(!isActivityStripOn()); render(); return; }
    if (within('[data-cwrui]'))       { ev.stopPropagation(); applyCwrUi(!isCwrUiOn());          render(); return; }
    if (within('[data-tour]'))        { ev.stopPropagation(); try { isTourOpen() ? window.WiseWalkthrough.close() : window.WiseWalkthrough.open(); } catch (_) {} render(); return; }
    if (within('[data-colorblind]'))  { ev.stopPropagation(); applyColorblind(!isColorblindOn());  render(); return; }
    if (within('[data-sharpedges]'))  { ev.stopPropagation(); applySharpEdges(!isSharpEdgesOn());  render(); return; }
    if (within('[data-adminui]'))     { ev.stopPropagation(); applyAdminControls(!isAdminControlsOn()); render(); return; }
    if (within('[data-appsearch]'))   { ev.stopPropagation(); applyAppSearch(!isAppSearchOn());         render(); return; }
    if (within('[data-navhamburger]')) {
      ev.stopPropagation();
      if (!isAppSearchOn()) return;
      applyNavHamburger(!isNavHamburgerOn());
      render();
      return;
    }

    /* Text size (connected segmented toggle). */
    const fz = within('[data-fz]');
    if (fz) { ev.stopPropagation(); setTextSize(fz.dataset.fz); render(); return; }

    /* Module spacing (admin, pink-outlined segmented toggle). Re-clicking the
       active step clears back to the default row gap. */
    const mg = within('[data-mg]');
    if (mg) { ev.stopPropagation(); applyModuleGap(getModuleGap() === mg.dataset.mg ? '' : mg.dataset.mg); render(); return; }

    /* Full bleed ▸ right-module behaviour (Drawer / Flat / Hidden). */
    const rmm = within('[data-rmodmode]');
    if (rmm) { ev.stopPropagation(); applyRightModuleMode(rmm.dataset.rmodmode); render(); return; }

    /* Full bleed ▸ preset theme (sets nav/chat/right-module colours at once;
       the empty "Default" chip clears them). Re-render so the colour swatches
       and the active-chip state both refresh. */
    const fbp = within('[data-fbpreset]');
    if (fbp) { ev.stopPropagation(); applyFullBleedTheme(fbp.dataset.fbpreset); render(); return; }
    if (within('[data-fbreset]')) { ev.stopPropagation(); applyFullBleedTheme(''); render(); return; }

    /* Full bleed ▸ colour swatch. Native <input type="color"> inside a CSS
       multi-column popover often swallows the click in Chromium, so we open
       the picker ourselves via showPicker() and still stop the click from
       closing the popover. */
    const colorHit = within('[data-fbcolor], .fb-color-row');
    if (colorHit) {
      ev.stopPropagation();
      const input = colorHit.matches?.('[data-fbcolor]')
        ? colorHit
        : colorHit.querySelector?.('[data-fbcolor]');
      if (input && typeof input.showPicker === 'function') {
        ev.preventDefault();
        try { input.showPicker(); } catch (_) {}
      }
      return;
    }

    /* Branding style ("Default" / "Style 1" inset / "Style 2" flush). Selecting
       a style applies it app-wide; "Default" clears back to the flat mark. */
    const bs = within('[data-brandstyle]');
    if (bs) { ev.stopPropagation(); applyBrandStyle(bs.dataset.brandstyle); render(); return; }

    /* CVD-type buttons are handled by topbar.js's global capture-phase handler
       (it runs before this bubble handler and stops propagation), so we never
       reach here for them — but guard anyway so a stray click can't close us. */
    if (within('[data-cbtype]')) { ev.stopPropagation(); return; }

    /* Light / dark theme. The shell flips the class; we always write both
       storage keys afterwards so the next page boots the same theme. */
    if (within('[data-pop-action="theme"]')) {
      ev.stopPropagation();
      ctx.toggleTheme?.();
      syncThemeKeys();
      render();
      return;
    }

    /* The accessibility-review, all-modules, progress-log and page-gallery
       rows are real links — let the click navigate. */
    if (within('[data-pop-action="a11y-review"]')) return;
    if (within('[data-pop-action="all-modules"]')) return;
    if (within('[data-pop-action="progress-log"]')) return;
    if (within('[data-pop-action="page-gallery"]')) return;

    /* Non-interactive chrome (labels, dividers, the text-size row wrapper):
       swallow the click so it neither toggles nor closes the popover. */
    if (within('.wise-appearance-group, .fz-row, .fz-size, .mg-size, .fb-opts, .fb-color-row, .fb-presets, .wise-popover-header, .wise-popover-divider')) { ev.stopPropagation(); return; }

    /* Anything else = a click on blank popover space → close. */
    ctx.onClose?.();
  });

  /* Full bleed ▸ live surface colour pickers. Colour inputs report through
     'input' (and 'change' when the OS picker commits) rather than 'click'.
     We deliberately DON'T re-render on every input — that would recreate the
     picker node mid-drag — and instead push the colour live and update the
     preset highlight in place (a hand-tweaked colour drops the active preset
     back to "Default"). */
  const applyLiveFbColor = (ci) => {
    if (!ci || !pop.contains(ci)) return;
    const kind = ci.dataset.fbcolor;
    const val = ci.value;
    applyFbColor(kind, val);
    clearFullBleedThemeMark();
    pop.querySelectorAll('[data-fbpreset]').forEach((b) => {
      b.classList.remove('is-active');
      b.setAttribute('aria-pressed', 'false');
    });
  };
  pop.addEventListener('input', (ev) => {
    applyLiveFbColor(ev.target.closest?.('[data-fbcolor]'));
  });
  pop.addEventListener('change', (ev) => {
    applyLiveFbColor(ev.target.closest?.('[data-fbcolor]'));
  });
}
