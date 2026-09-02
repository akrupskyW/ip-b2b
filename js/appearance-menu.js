/* ------------------------------------------------------------------ */
/* Shared Appearance popover body                                      */
/* ------------------------------------------------------------------ */
/*
 * One source of truth for the markup inside the "Appearance" (crossword)
 * popover. Every shell — the agent overview pages (js/agent-overview.js), the
 * Portfolio workspace (js/portfolio-module.js), the WISEcodeAI chat (pages/ai-chat.html
 * inline), and the application sidebar (js/app.js) — renders the SAME menu by
 * calling buildAppearanceBody(). This keeps the toggles (Minimal UI, Header,
 * Full bleed, Jam strip, Search, Text size, Serif headlines, Theme …) identical everywhere; before this
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
 * attribute (data-pivot / data-minimal / data-navhistory / data-navmodules / data-stickyflush / data-fullbleed /
 * data-fbchatonly / data-jam / data-appsearch / data-navhamburger / data-colorblind / data-serif / data-guides / data-fz /
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
  isSerifHeadlinesOn,
  applySerifHeadlines,
  getColorblindMode,
  COLORBLIND_MODES,
  isChatTintOn,
  applyChatTint,
  getModuleGap,
  applyModuleGap,
  isStickyFlushOn,
  applyStickyFlush,
  isCwrUiOn,
  applyCwrUi,
  isGuidesOn,
  applyGuides,
  getBrandStyle,
  applyBrandStyle,
  isAdminControlsOn,
  applyAdminControls,
  syncThemeKeys,
} from './topbar.js';
import {
  isJamStripOn,
  applyJamStrip,
  JAM_SONGS,
  toggleJam,
  selectJam,
  isJamPlaying,
  currentJamSongId,
  currentJamSongLabel,
  onJamState,
  getJamVizMode,
  setJamVizMode,
  eqBarsMarkup,
  helixVizMarkup,
} from './jam-strip.js';
import { getStoredFontSize, setTextSize } from './text-size.js';
import {
  isActivityStripOn,
  applyActivityStrip,
} from './chat-activity-strip.js';
import {
  isAppSearchOn,
} from './app-search.js';
import {
  isNavHistoryOn,
  applyNavHistory,
} from './nav-history.js';
import {
  isNavModulesOn,
  applyNavModules,
} from './nav-modules.js';
import {
  isNavHamburgerOn,
  applyNavHamburger,
} from './nav-hamburger.js';
import {
  isCommentsOn,
  isCommentsUnlocked,
  applyComments,
} from './feedback-setting.js';
import { setMenuPivot } from './agent-menu.js';

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
 * @param {boolean} [disabled] Render the row muted and inert. Each row's click
 *                            handler still has to refuse the action itself —
 *                            only whole locked GROUPS are swallowed centrally.
 * @param {boolean} [showLock] Trail the row with a lock glyph. Opt-in, because
 *                            rows that lock conditionally (Full bleed while
 *                            Search is on, Menu icon while Search is off) say
 *                            so in their tooltip and read as temporary, while
 *                            a permanent gate should look like one.
 * @param {string}  [desc]    Optional 3–5 word hint under the label.
 */
function toggleRow(dataAttr, on, label, admin = false, tip = '', disabled = false, showLock = false, desc = '', icon = '') {
  const badge = admin ? '<span class="wise-popover-badge">Admin</span>' : '';
  const adminAttr = admin ? ' data-admin-item="1"' : '';
  const lock = disabled ? ' is-locked' : '';
  const disabledAttr = disabled ? ' aria-disabled="true"' : '';
  const lockIco = disabled && showLock
    ? '<span class="wise-popover-lock material-symbols-outlined" aria-hidden="true">lock</span>'
    : '';
  const rowIco = icon
    ? `<span class="material-symbols-outlined wise-row-icon" aria-hidden="true">${icon}</span>`
    : '';
  return `<div class="wise-popover-item wise-toggle-item${on ? ' is-on' : ''}${lock}" ${dataAttr}${adminAttr}${disabledAttr} role="switch" aria-checked="${on ? 'true' : 'false'}"${tipAttrs(tip || label)}>
      ${rowIco}${rowCopy(label, desc)}${badge}<span class="material-symbols-outlined wise-toggle-ico">${on ? 'toggle_on' : 'toggle_off'}</span>${lockIco}
    </div>`;
}

/** Title + a 3–5 word hint under the label. Same two-line pattern as the
    chat ⋯ menu. Unhinted labels stay a plain string. */
function rowCopy(label, desc) {
  if (!desc) return label;
  return `<span class="wise-popover-copy"><span class="wise-popover-title">${label}</span><span class="wise-popover-desc">${desc}</span></span>`;
}

function rowIcon(name) {
  return `<span class="material-symbols-outlined wise-row-icon" aria-hidden="true">${name}</span>`;
}

/** Toggle with a short on-row hint as the 4th argument, so call sites never
    have to thread empty `disabled` / `showLock` just to reach it. */
function plainToggle(dataAttr, on, label, desc, tip, disabled = false, showLock = false, icon = '') {
  return toggleRow(dataAttr, on, label, false, tip, disabled, showLock, desc, icon);
}

/** Admin-badged toggle: same argument order as plainToggle, plus the badge. */
function adminToggle(dataAttr, on, label, desc, tip, disabled = false, showLock = false, icon = '') {
  return toggleRow(dataAttr, on, label, true, tip, disabled, showLock, desc, icon);
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

function jamEscape(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** The Jam player, shown inline in Appearance ▸ Sound under the toggle.
    Play starts only from the play button. Track chips pick a song silently
    unless a tune is already looping. Bars are the default visualizer;
    Helix is the second. Never mounts in the primary nav. */
function jamPlayerSection() {
  if (!isJamStripOn()) return '';
  const playing = isJamPlaying();
  const curId = currentJamSongId();
  const curLabel = currentJamSongLabel();
  const viz = getJamVizMode();
  const songs = JAM_SONGS.map(
    (s) => `<button type="button" class="jam-pop-song${s.id === curId ? ' is-active' : ''}" data-jam-song="${s.id}" aria-pressed="${s.id === curId ? 'true' : 'false'}"${tipAttrs(s.tip)}>${jamEscape(s.label)}</button>`
  ).join('');
  const nowText = playing && curLabel ? jamEscape(curLabel) : (curLabel ? jamEscape(curLabel) : 'Pick a track, then play');
  const playTip = playing ? 'Pause' : 'Play';
  return `
    <div class="jam-pop${playing ? ' is-playing' : ''} jam-viz-${viz}" data-jam-viz-host data-jam-viz="${viz}" data-admin-item="1">
      <div class="jam-pop-head">
        <button type="button" class="jam-pop-play" data-jam-play aria-label="${playTip}"${tipAttrs(playTip)}>
          <span class="material-symbols-outlined">${playing ? 'pause' : 'play_arrow'}</span>
        </button>
        <div class="jam-pop-now">
          <div class="jam-pop-eq" aria-hidden="true">${eqBarsMarkup(18)}</div>
          ${helixVizMarkup()}
          <div class="jam-pop-title">${nowText}</div>
        </div>
      </div>
      <div class="jam-viz-seg" role="group" aria-label="Visualizer">
        <button type="button" class="jam-viz-btn${viz === 'bars' ? ' is-on' : ''}" data-jam-viz-mode="bars" aria-pressed="${viz === 'bars' ? 'true' : 'false'}">Bars</button>
        <button type="button" class="jam-viz-btn${viz === 'helix' ? ' is-on' : ''}" data-jam-viz-mode="helix" aria-pressed="${viz === 'helix' ? 'true' : 'false'}">Helix</button>
      </div>
      <div class="jam-pop-songs" role="group" aria-label="Pick a track">${songs}</div>
    </div>`;
}

function syncJamPop(root) {
  const pop = root.querySelector('.jam-pop');
  if (!pop) return false;
  const playing = isJamPlaying();
  const curId = currentJamSongId();
  const curLabel = currentJamSongLabel();
  const viz = getJamVizMode();

  pop.classList.toggle('is-playing', playing);
  pop.classList.toggle('jam-viz-helix', viz === 'helix');
  pop.classList.toggle('jam-viz-bars', viz === 'bars');
  pop.dataset.jamViz = viz;

  const playBtn = pop.querySelector('[data-jam-play]');
  if (playBtn) {
    const playTip = playing ? 'Pause' : 'Play';
    playBtn.setAttribute('aria-label', playTip);
    playBtn.setAttribute('data-tip', playTip);
    playBtn.setAttribute('title', playTip);
    const icon = playBtn.querySelector('.material-symbols-outlined');
    if (icon) icon.textContent = playing ? 'pause' : 'play_arrow';
  }

  const title = pop.querySelector('.jam-pop-title');
  if (title) title.textContent = curLabel || 'Pick a track, then play';

  pop.querySelectorAll('.jam-pop-song').forEach((chip) => {
    const active = chip.dataset.jamSong === curId;
    chip.classList.toggle('is-active', active);
    chip.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  pop.querySelectorAll('[data-jam-viz-mode]').forEach((btn) => {
    const on = btn.dataset.jamVizMode === viz;
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  return true;
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
  return adminOnly(adminToggle('data-pivot="1"', isPivoted, 'Pivot Navigation', 'Horizontal top bar', 'Move the navigation to a horizontal top bar — also turns on Minimal UI', false, false, 'view_quilt'));
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
      <span class="fz-row-label"${tipAttrs('Color vision type — green-weak, red-weak, or blue-green / blue-yellow weak. Each choice also covers the complete (blind) form of that type.')}>${rowIcon('visibility')}Vision type</span>
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
      <span class="mg-size-label"${tipAttrs('Gap between modules')}>${rowIcon('space_dashboard')}${rowCopy('Module spacing', 'Gap between modules')}<span class="wise-popover-badge">Admin</span></span>
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
      <span class="material-symbols-outlined">accessibility_new</span>${rowCopy('Accessibility review', 'Open the WCAG audit')}
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
      <span class="material-symbols-outlined">widgets</span>${rowCopy('All modules', 'Module and icon directory')}
      <span class="wise-popover-badge">Admin</span>
      <span class="wise-popover-ext material-symbols-outlined" aria-hidden="true">arrow_outward</span>
    </a>`;
}

/** Link out to the "Progress log" admin page — the internal, day-by-day record
    of what shipped across the platform (features, components, logic, UX, UI,
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
      <span class="material-symbols-outlined">timeline</span>${rowCopy('Progress log', 'What shipped each day')}
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
      <span class="material-symbols-outlined">browse_gallery</span>${rowCopy('Page gallery', 'Screenshots of every page')}
      <span class="wise-popover-badge">Admin</span>
      <span class="wise-popover-ext material-symbols-outlined" aria-hidden="true">arrow_outward</span>
    </a>`;
}

/** Link out to the "Analytics types" admin page — the catalog of every chart,
    graph, and scorecard used across the app. Sits beneath the Page gallery row
    and, like it, is an Admin-only destination. Path resolves the same way as
    the other Admin destinations. */
function analyticsTypesSection() {
  let href = 'pages/analytics-types.html';
  try {
    if (location.pathname.indexOf('/pages/') !== -1) href = 'analytics-types.html';
  } catch (e) { /* non-browser context — keep the default */ }
  return `
    <a class="wise-popover-item" href="${href}" data-pop-action="analytics-types" data-admin-item="1"${tipAttrs('Open the catalog of analytics charts and graphs')}>
      <span class="material-symbols-outlined">insights</span>${rowCopy('Analytics types', 'Charts, graphs, and scorecards')}
      <span class="wise-popover-badge">Admin</span>
      <span class="wise-popover-ext material-symbols-outlined" aria-hidden="true">arrow_outward</span>
    </a>`;
}

/** Link out to the Helix studio — a chat that is only the helix, with the
    full draggable control card open so you can tune the look and Apply it
    to every other chat. Path resolves the same way as the other Admin
    destinations. */
function helixStudioSection() {
  let href = 'pages/helix.html';
  try {
    if (location.pathname.indexOf('/pages/') !== -1) href = 'helix.html';
  } catch (e) { /* non-browser context — keep the default */ }
  return `
    <a class="wise-popover-item" href="${href}" data-pop-action="helix-studio" data-admin-item="1"${tipAttrs('Open the Helix playground — tune the look, then apply it to every chat')}>
      <span class="material-symbols-outlined">animation</span>${rowCopy('Helix', 'Tune the chat helix')}
      <span class="wise-popover-badge">Admin</span>
      <span class="wise-popover-ext material-symbols-outlined" aria-hidden="true">arrow_outward</span>
    </a>`;
}

/** "Surfaces" section — the segmented control that switches the app's surface
    treatment between the flat default, "Sharper edges" (inset stamp, hairline
    borders, tighter corners), and "Borderless" (every module except the chat
    drops its outer stroke). It deliberately leaves the owl bug + WISE
    wordmark untouched (see applyBrandStyle / BRAND_CSS in topbar.js). A
    neutral segmented control (same skin as Text size), each button carrying a
    `data-brandstyle` id that wireAppearancePopover() feeds to applyBrandStyle().
    Clicking "Default" clears back to the flat surfaces. Admin-only (badge +
    hidden when Admin controls is off). */
function brandingSection() {
  const active = getBrandStyle();
  const opts = [
    { id: '', label: 'Default', tip: 'Flat surfaces' },
    { id: 'inset', label: 'Sharper edges', tip: 'Tighter corners and inset surfaces with hairline borders' },
    { id: 'flush', label: 'Borderless', tip: 'No border on modules other than chat' },
  ];
  const btns = opts
    .map(
      (o) =>
        `<button type="button" class="fz-seg-btn${o.id === active ? ' is-active' : ''}" data-brandstyle="${o.id}" aria-pressed="${o.id === active ? 'true' : 'false'}"${tipAttrs(o.tip)}>${o.label}</button>`
    )
    .join('');
  return `
    <div class="fz-size brand-style-row" data-admin-item="1">
      <span class="fz-size-label"${tipAttrs('How module surfaces are drawn')}>${rowIcon('layers')}${rowCopy('Surface style', 'How surfaces are drawn')}<span class="wise-popover-badge">Admin</span></span>
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

/** "Walkthrough" row — Admin-badged. Opens the WISEowl walkthrough sticky
    module or hides it, reflecting whether it's live right now. Hidden when
    Admin controls is off. Renders on every shell (including ones where the
    walkthrough script isn't loaded yet); the click handler no-ops until
    WiseWalkthrough is ready. */
function tourSection() {
  return adminOnly(adminToggle('data-tour="1"', isTourOpen(), 'Walkthrough', 'Open the WISEowl tour', 'Open the WISEowl walkthrough', false, false, 'explore'));
}

/** "Comments" row — Admin-badged. Switches on-page commenting (press C, click
    a spot, leave a note) on or off for the whole site, not just this browser.
    Hidden when Admin controls is off. Locked shut unless you hold the
    feedback admin key, and the server refuses the write without it either
    way, so the lock is a real gate rather than decoration. */
function commentsSection() {
  const unlocked = isCommentsUnlocked();
  const tip = unlocked
    ? 'Let anyone press C and pin a comment to an exact spot on the page — on for every visitor, not just this browser'
    : 'Locked — only the site owner can switch on-page comments on or off';
  return adminOnly(adminToggle('data-comments="1"', isCommentsOn(), 'Comments', 'Pin notes on the page', tip, !unlocked, true, 'comment'));
}

/** Text-size segmented block (S / M / L / XL). Extracted so it can live inside
    the "Accessibility" group card alongside the color controls. */
function textSizeSection() {
  const fz = getStoredFontSize();
  const sizes = {
    sm: { short: 'S', tip: 'Small type and icons' },
    md: { short: 'M', tip: 'Medium type and icons' },
    lg: { short: 'L', tip: 'Large type and icons' },
    xl: { short: 'XL', tip: 'Extra-large type and icons' },
  };
  return `
    <div class="fz-size">
      <span class="fz-size-label"${tipAttrs('Text size')}>${rowIcon('format_size')}${rowCopy('Text size', 'Scale type and icons')}</span>
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
      ${rowCopy(`<span class="js-theme-label">${tip}</span>`, 'Toggle light and dark')}
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
        <span class="fz-size-label"${tipAttrs('How the module to the right of chat behaves')}>${rowIcon('view_sidebar')}Right module</span>
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

/** Master Internal-admins switch — a single pink card (no group header)
    that shows or hides every Admin-badged Appearance row. Always visible;
    never itself Admin-gated. */
function adminMasterSwitch() {
  const on = isAdminControlsOn();
  return `
    <div class="wise-admin-master${on ? ' is-on' : ''}" data-adminui="1" role="switch" aria-checked="${on ? 'true' : 'false'}"${tipAttrs('Show settings for internal admins')}>
      <span class="material-symbols-outlined" aria-hidden="true">admin_panel_settings</span>
      <span class="wise-admin-master-label">Internal admins</span>
      <span class="material-symbols-outlined wise-toggle-ico">${on ? 'toggle_on' : 'toggle_off'}</span>
    </div>`;
}

/** Wrap a set of rows in a titled "group" card. Groups are the unit the
    Appearance popover stacks inside a column: each group (and therefore every
    row inside it) stays within ONE column and is never split or stretched
    across columns. An empty body (e.g. a section whose only rows are
    conditionally hidden) renders nothing so we don't leave a stray empty card.
    `locked` keeps the whole card in place but makes every row inside it inert:
    a lock trails the heading, the rows read muted, and wireAppearancePopover()
    swallows clicks landing anywhere inside. */
function apGroup(title, body, { locked = false } = {}) {
  const inner = String(body || '').trim();
  if (!inner) return '';
  const lock = locked
    ? '<span class="wise-appearance-group-lock material-symbols-outlined" aria-hidden="true">lock</span>'
    : '';
  return `
    <section class="wise-appearance-group${locked ? ' is-locked' : ''}"${locked ? ' aria-disabled="true"' : ''}>
      <div class="wise-popover-header">${title}${lock}</div>
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
  const layout = apGroup('Layout', `
        ${pivotSection(showPivot, isPivoted)}
        ${adminOnly(adminToggle('data-minimal="1"', isMinimalUiOn(), 'Minimal UI', 'Logo, Appearance, and you', 'Show only the logo, Appearance, and your profile', false, false, 'crop_free'))}
        ${adminOnly(adminToggle('data-iconrail="1"', isIconRailOn(), 'Icons only', 'Collapse nav to icons', 'Collapse the navigation to icons', false, false, 'apps'))}
        ${adminOnly(adminToggle('data-navhistory="1"', isNavHistoryOn(), 'History in navigation', 'History inside the nav', 'Merge the History module into an expandable section of the primary navigation — search, projects, and All conversations stay fully usable', false, false, 'history'))}
        ${adminOnly(adminToggle('data-navmodules="1"', isNavModulesOn(), 'Nav &amp; History icons', 'Logo, menu, History, new chat', 'Menu opens the labelled navigation; the History icon opens History, and history off closes it. While either is open, the extra icons hide and History closes back to the four-icon rail. New chat is a circle and starts a conversation', false, false, 'view_sidebar'))}
        ${adminOnly(adminToggle('data-stickyflush="1"', isStickyFlushOn(), 'Flush sticky modules', 'Match the primary drawer', 'Make the secondary sticky module the same height as the primary one it tucks behind', false, false, 'height'))}
        ${adminOnly(helixStudioSection())}
      `);
  const experience = apGroup('Experience', `
        ${plainToggle('data-guides="1"', isGuidesOn(), 'Guides', 'Floating page hints (not on all pages)', 'Show floating guides that point to what you can do next', false, false, 'signpost')}
        ${tourSection()}
        ${adminOnly(adminToggle('data-cwrui="1"', isCwrUiOn(), 'Roll · Crawl · Walk · Run', 'Show the mode switch', 'Show the floating Roll · Crawl · Walk · Run switch', false, false, 'speed'))}
      `);
  /* Master Internal-admins switch. Always last in its stack: bottom of
     the leftmost column when Admin is on, or under Accessibility when
     Admin is off (one column). Never sits between member groups. */
  const adminSwitch = adminMasterSwitch();
  const fullBleed = apGroup('Full bleed', `
        ${adminOnly(adminToggle('data-fullbleed="1"', isFullBleedEverythingOn(), 'Full bleed', 'Stretch every module', isAppSearchOn() ? 'Unavailable while Search is on' : 'Stretch every module edge-to-edge', isAppSearchOn(), false, 'fullscreen'))}
        ${adminOnly(adminToggle('data-fbchatonly="1"', isChatOnlyFullBleedOn(), 'Chat-only full bleed', 'Stretch chat only', isAppSearchOn() ? 'Unavailable while Search is on' : 'Stretch only the chat module; keep the navigation and every other module contained', isAppSearchOn(), false, 'crop_16_9'))}
        ${adminOnly(fullBleedOptionsSection())}
      `);
  const chat = apGroup('Chat', `
        ${adminOnly(adminToggle('data-chattint="1"', isChatTintOn(), 'Blue chat surface', 'Tint chat brand blue', 'Tint the chat surface with brand blue', false, false, 'format_paint'))}
        ${adminOnly(adminToggle('data-activitystrip="1"', isActivityStripOn(), 'Activity strip', 'Live strip on chat', 'Show the live activity strip on the chat edge', false, false, 'timeline'))}
      `);
  const sound = apGroup('Sound', `
        ${adminOnly(adminToggle('data-jam="1"', isJamStripOn(), 'Jam strip', 'Player in Appearance', 'Show the music player in this Sound section — never in the primary navigation', false, false, 'music_note'))}
        ${adminOnly(jamPlayerSection())}
      `);
  const a11y = apGroup('Accessibility', `
        ${themeSection(isDark)}
        ${plainToggle('data-colorblind="1"', isColorblindOn(), 'Accessible colors', 'Color-vision-safe palette', 'Use a color-vision-safe palette', false, false, 'visibility')}
        ${colorblindTypeSection()}
        ${textSizeSection()}
        ${adminOnly(adminToggle('data-serif="1"', isSerifHeadlinesOn(), 'Serif headlines', 'Brand display type', 'Use the brand serif for titles. Turn off to switch titles to DM Sans', false, false, 'title'))}
        ${adminOnly(brandingSection())}
      `);
  const adminRows = apGroup('Admin', `
        ${commentsSection()}
        ${adminOnly(adminToggle('data-appsearch="1"', false, 'Search', 'Search beside the logo', 'Locked off — Search beside the logo stays off', true, true, 'search'))}
        ${adminOnly(adminToggle('data-navhamburger="1"', isAppSearchOn() && isNavHamburgerOn(), 'Menu icon', 'Dock icon when collapsed', isAppSearchOn() ? 'When the navigation is collapsed, show a dock icon to the left of the logo instead of the icon rail' : 'Unavailable while Search is off', !isAppSearchOn(), false, 'dock_to_right'))}
        ${adminOnly(accessibilityReviewSection())}
        ${adminOnly(allModulesSection())}
        ${adminOnly(progressLogSection())}
        ${adminOnly(pageGallerySection())}
        ${adminOnly(analyticsTypesSection())}
      `);
  const adminOn = isAdminControlsOn();
  const leftHasRows = !!(layout || experience);
  if (!adminOn) {
    return apCol(layout, experience, fullBleed, chat, sound, a11y, adminRows, adminSwitch);
  }
  return `
    ${leftHasRows ? apCol(layout, experience, adminSwitch) : ''}
    ${apCol(fullBleed, chat)}
    ${leftHasRows ? apCol(sound, a11y) : apCol(sound, a11y, adminSwitch)}
    ${apCol(adminRows)}
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
 * Live surfaces (no lock): My profile, Invoices, Marketing
 * Assets, and Support, each carrying a data-pop-action so the shell's click
 * handler can route them. Coming-soon
 * rows (Alerts / Agents, Preferences, API keys, Help, Docs) are Admin-badged:
 * they hide when Admin controls is off, and show a pink Admin badge (and a
 * lock) when it is on. Sign out always works.
 *
 * @param {Object} [opts]
 * @param {string} [opts.name]  Display name for the header (defaults to the
 *                              branded demo identity).
 */
export function buildUserMenuBody({ name = 'Arthur Krupsky' } = {}) {
  const safeName = String(name || 'Arthur Krupsky')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const locked = (icon, label) =>
    adminOnly(`<div class="wise-popover-item is-locked" data-admin-item="1" aria-disabled="true" title="Coming soon"><span class="material-symbols-outlined">${icon}</span>${label}<span class="wise-popover-badge">Admin</span><span class="wise-popover-lock material-symbols-outlined" aria-hidden="true">lock</span></div>`);
  const lockedAction = (icon, label) =>
    `<button type="button" class="wise-pop-action is-locked" data-admin-item="1" aria-disabled="true" title="Coming soon"><span class="material-symbols-outlined">${icon}</span><span>${label}</span><span class="wise-popover-badge">Admin</span><span class="wise-pop-action-lock material-symbols-outlined" aria-hidden="true">lock</span></button>`;
  return `
    <div class="wise-popover-header">${safeName}</div>
    ${adminOnly(`
    <div class="wise-popover-actions">
      ${lockedAction('notifications', 'Alerts')}
      <span class="wise-pop-vline" aria-hidden="true"></span>
      ${lockedAction('tune', 'Agents')}
    </div>
    <div class="wise-popover-divider"></div>
    `)}
    <div class="wise-popover-item" data-pop-action="profile"><span class="material-symbols-outlined">person</span>My profile</div>
    <div class="wise-popover-item" data-pop-action="invoices"><span class="material-symbols-outlined">receipt_long</span>Invoices</div>
    <div class="wise-popover-item" data-pop-action="marketing-assets"><span class="material-symbols-outlined">photo_library</span>Marketing Assets</div>
    <div class="wise-popover-item" data-pop-action="support"><span class="material-symbols-outlined">support_agent</span>Support</div>
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
function pagesHref(file) {
  try {
    if (location.pathname.indexOf('/pages/') !== -1) return file;
  } catch (_) { /* non-browser — keep the pages/ prefix */ }
  return 'pages/' + file;
}

/* Marketing Assets is a live avatar-menu destination on every shell. A capture
   listener matches Sign out so a page that only wired profile / invoices still
   reaches the library. */
function wireAccountNavAction(action, file, boundFlag) {
  if (typeof document === 'undefined' || document[boundFlag]) return;
  document[boundFlag] = true;
  document.addEventListener(
    'click',
    (e) => {
      const item = e.target?.closest?.(`[data-pop-action="${action}"]`);
      if (!item) return;
      e.stopPropagation();
      e.preventDefault();
      window.location.href = pagesHref(file);
    },
    true
  );
}

function wireMarketingAssetsNav() {
  wireAccountNavAction('marketing-assets', 'marketing-assets.html', '__wiseMaNavBound');
}

function wireSupportNav() {
  wireAccountNavAction('support', 'support.html', '__wiseSupportNavBound');
}

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

if (typeof document !== 'undefined') {
  wireSignOut();
  wireMarketingAssetsNav();
  wireSupportNav();
  /* Rebuild an open avatar menu when Admin controls flips, so locked rows
     appear or collapse in place the same way Appearance does. */
  if (!document.__wiseUserMenuAdminBound) {
    document.__wiseUserMenuAdminBound = true;
    document.addEventListener('wise:admin-ui', () => {
      document.querySelectorAll('.wise-popover.open').forEach((pop) => {
        if (pop.classList.contains('wise-popover--appearance')) return;
        if (!pop.querySelector('[data-pop-action="signout"]')) return;
        const name = (pop.querySelector('.wise-popover-header')?.textContent || '').trim();
        pop.innerHTML = buildUserMenuBody({ name: name || 'Arthur Krupsky' });
        try { pop.__reposition?.(); } catch (_) {}
      });
    });
  }
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
 * The universal on/off toggles (Minimal UI, Icons only, History in navigation,
 * Nav & History icons, Full bleed, Jam strip, Search, Menu icon, Colorblind, Serif headlines) and the Text-size buttons are
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
     (or hide) extra content — Admin-badged columns appearing and collapsing,
     the surface pickers under "Full bleed", the CVD-type buttons under
     "Accessible colors" — which changes the popover's width AND height.
     Without re-placing, a resized popover keeps its old top/left and spills
     off its anchor or out of the viewport, so we call the reposition
     closure the positioning helpers stashed on the node (topbar.js
     positionPopover*), guarded for shells that place it themselves. A
     follow-up frame catches max-content width after layout. */
  const place = () => { try { pop.__reposition?.(); } catch (_) {} };
  const render = () => {
    try { ctx.render?.(); } catch (_) {}
    place();
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(place);
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
  if (!pop.__jamStateBound) {
    pop.__jamStateBound = true;
    onJamState(() => {
      if (!pop.isConnected || !pop.classList.contains('open')) return;
      syncJamPop(pop);
    });
  }

  pop.addEventListener('click', (ev) => {
    const within = (sel) => {
      const el = ev.target.closest(sel);
      return el && pop.contains(el) ? el : null;
    };

    /* Locked group or locked row — stay visible but inert. Swallow before
       any row handler sees the click. Tooltips still fire. */
    if (within('.wise-appearance-group.is-locked')) { ev.stopPropagation(); return; }
    if (within('.wise-popover-item.is-locked')) { ev.stopPropagation(); return; }

    /* Nav pivot — shells whose rail can pivot to a top bar. Turning pivot
       ON also turns Minimal UI on (setMenuPivot enforces the pair). */
    if (within('[data-pivot]')) { ev.stopPropagation(); ctx.togglePivot?.(); render(); return; }

    /* Universal on/off toggles — handled here so no shell can miss one.
       Minimal UI ON also pivots the nav, so the two Appearance rows
       always come on together. Off stays independent. */
    if (within('[data-minimal]')) {
      ev.stopPropagation();
      const next = !isMinimalUiOn();
      applyMinimalUi(next);
      if (next) {
        try { setMenuPivot(true); } catch (_) { ctx.togglePivot?.(); }
      }
      render();
      return;
    }
    if (within('[data-iconrail]'))    { ev.stopPropagation(); applyIconRail(!isIconRailOn());     render(); return; }
    if (within('[data-navhistory]'))  {
      ev.stopPropagation();
      const next = !isNavHistoryOn();
      if (next) applyNavModules(false);
      applyNavHistory(next, true, { open: next });
      render();
      return;
    }
    if (within('[data-navmodules]')) {
      ev.stopPropagation();
      const next = !isNavModulesOn();
      if (next) applyNavHistory(false);
      applyNavModules(next);
      render();
      return;
    }
    if (within('[data-stickyflush]')) { ev.stopPropagation(); applyStickyFlush(!isStickyFlushOn()); render(); return; }
    if (within('[data-fullbleed]'))   { ev.stopPropagation(); if (isAppSearchOn()) return; applyFullBleedMode(isFullBleedEverythingOn() ? '' : 'all'); render(); return; }
    if (within('[data-fbchatonly]'))  { ev.stopPropagation(); if (isAppSearchOn()) return; applyFullBleedMode(isChatOnlyFullBleedOn() ? '' : 'chat'); render(); return; }
    if (within('[data-jam]'))         { ev.stopPropagation(); applyJamStrip(!isJamStripOn());      render(); return; }
    if (within('[data-jam-play]'))    { ev.stopPropagation(); toggleJam(); if (!syncJamPop(pop)) render(); return; }
    const jamSong = within('[data-jam-song]');
    if (jamSong) { ev.stopPropagation(); selectJam(jamSong.dataset.jamSong); if (!syncJamPop(pop)) render(); return; }
    const jamViz = within('[data-jam-viz-mode]');
    if (jamViz) { ev.stopPropagation(); setJamVizMode(jamViz.dataset.jamVizMode); if (!syncJamPop(pop)) render(); return; }
    if (within('[data-chattint]'))    { ev.stopPropagation(); applyChatTint(!isChatTintOn());      render(); return; }
    if (within('[data-activitystrip]')) { ev.stopPropagation(); applyActivityStrip(!isActivityStripOn()); render(); return; }
    if (within('[data-cwrui]'))       { ev.stopPropagation(); applyCwrUi(!isCwrUiOn());          render(); return; }
    if (within('[data-guides]'))      { ev.stopPropagation(); applyGuides(!isGuidesOn());        render(); return; }
    if (within('[data-tour]')) {
      ev.stopPropagation();
      const flip = () => {
        try { isTourOpen() ? window.WiseWalkthrough.close() : window.WiseWalkthrough.open(); } catch (_) {}
        render();
      };
      if (typeof window.WiseWalkthrough?.open === 'function') flip();
      else document.addEventListener('wise:walkthrough-ready', flip, { once: true });
      return;
    }
    if (within('[data-colorblind]'))  { ev.stopPropagation(); applyColorblind(!isColorblindOn());  render(); return; }
    if (within('[data-serif]'))       { ev.stopPropagation(); applySerifHeadlines(!isSerifHeadlinesOn()); render(); return; }
    if (within('[data-adminui]'))     { ev.stopPropagation(); applyAdminControls(!isAdminControlsOn()); render(); return; }
    if (within('[data-appsearch]'))   { ev.stopPropagation(); return; }
    if (within('[data-navhamburger]')) {
      ev.stopPropagation();
      if (!isAppSearchOn()) return;
      applyNavHamburger(!isNavHamburgerOn());
      render();
      return;
    }
    /* Comments is a site-wide gate held by the server, so the row can only
       settle once the server has answered — re-render then, not now. */
    if (within('[data-comments]')) {
      ev.stopPropagation();
      if (!isCommentsUnlocked()) return;
      applyComments(!isCommentsOn()).then(render, render);
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

    /* Surface style ("Default" / "Sharper edges" inset / "Borderless" flush).
       Selecting a style applies it app-wide; "Default" clears back to the flat mark. */
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

    /* The accessibility-review, all-modules, progress-log, page-gallery,
       analytics-types, and helix-studio rows are real links — let the
       click navigate. */
    if (within('[data-pop-action="a11y-review"]')) return;
    if (within('[data-pop-action="all-modules"]')) return;
    if (within('[data-pop-action="progress-log"]')) return;
    if (within('[data-pop-action="page-gallery"]')) return;
    if (within('[data-pop-action="analytics-types"]')) return;
    if (within('[data-pop-action="helix-studio"]')) return;

    /* Non-interactive chrome (labels, dividers, the text-size row wrapper):
       swallow the click so it neither toggles nor closes the popover. */
    if (within('.wise-appearance-group, .fz-row, .fz-size, .mg-size, .fb-opts, .fb-color-row, .fb-presets, .jam-pop, .wise-popover-header, .wise-popover-divider')) { ev.stopPropagation(); return; }

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
