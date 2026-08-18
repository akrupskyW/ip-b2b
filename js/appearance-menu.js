/* ------------------------------------------------------------------ */
/* Shared Appearance popover body                                      */
/* ------------------------------------------------------------------ */
/*
 * One source of truth for the markup inside the "Appearance" (crossword)
 * popover. Every shell — the agent overview pages (js/agent-overview.js), the
 * Portfolio workspace (js/portfolio-module.js), the WISEcodeAI chat (pages/ai-chat.html
 * inline), and the application sidebar (js/app.js) — renders the SAME menu by
 * calling buildAppearanceBody(). This keeps the toggles (Minimal UI, Header,
 * Full bleed, Jam strip, Text size, Theme …) identical everywhere; before this
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
 * attribute (data-pivot / data-minimal / data-fullbleed /
 * data-jam / data-colorblind / data-fz / data-pop-action), so the existing
 * per-shell listeners keep working unchanged.
 */

import {
  isMinimalUiOn,
  applyMinimalUi,
  isIconRailOn,
  applyIconRail,
  isFullBleedOn,
  applyFullBleed,
  getNavBg,
  applyNavBg,
  getChatBg,
  applyChatBg,
  getRightModuleBg,
  applyRightModuleBg,
  RMOD_MODES,
  getRightModuleMode,
  applyRightModuleMode,
  FB_PRESETS,
  getFullBleedTheme,
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
import {
  isActivityStripOn,
  applyActivityStrip,
} from './chat-activity-strip.js';

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
 */
function toggleRow(dataAttr, on, label, admin = false) {
  const badge = admin ? '<span class="wise-popover-badge">Admin</span>' : '';
  return `<div class="wise-popover-item wise-toggle-item${on ? ' is-on' : ''}" ${dataAttr} role="switch" aria-checked="${on ? 'true' : 'false'}">
      <span class="material-symbols-outlined wise-toggle-ico">${on ? 'toggle_on' : 'toggle_off'}</span>${label}${badge}
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
          <span class="material-symbols-outlined">${playing ? 'pause' : 'play_arrow'}</span>
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
    const icon = playBtn.querySelector('.material-symbols-outlined');
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
  return toggleRow('data-pivot="1"', isPivoted, 'Pivot Navigation', true);
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
    { id: 'sm', label: 'S' },
    { id: 'md', label: 'M' },
    { id: 'lg', label: 'L' },
    { id: 'xl', label: 'XL' },
  ];
  const btns = opts
    .map(
      (o) =>
        `<button type="button" class="mg-seg-btn${o.id === active ? ' is-active' : ''}" data-mg="${o.id}" aria-pressed="${o.id === active ? 'true' : 'false'}">${o.label}</button>`
    )
    .join('');
  return `
    <div class="mg-size">
      <span class="mg-size-label">Module spacing<span class="wise-popover-badge">Admin</span></span>
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
    <a class="wise-popover-item" href="${href}" data-pop-action="a11y-review">
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
    <a class="wise-popover-item" href="${href}" data-pop-action="all-modules">
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
    <a class="wise-popover-item" href="${href}" data-pop-action="progress-log">
      <span class="material-symbols-outlined">timeline</span>Progress log
      <span class="wise-popover-badge">Admin</span>
      <span class="wise-popover-ext material-symbols-outlined" aria-hidden="true">arrow_outward</span>
    </a>`;
}

/** "Surfaces" section — the segmented control that switches the app's surface
    treatment between the flat default and "Style 1", a refined skin that gives
    the module panels, chat panes, cards and popovers a crisper on-brand hairline
    border and a deeper, softer elevation. It deliberately leaves the owl bug +
    WISE wordmark untouched (see applyBrandStyle / BRAND_CSS in topbar.js). A
    neutral segmented control (same skin as Text size), each button carrying a
    `data-brandstyle` id that wireAppearancePopover() feeds to applyBrandStyle().
    Clicking "Default" clears back to the flat surfaces. The surrounding
    "Surfaces" group heading + card is supplied by apGroup(). */
function brandingSection() {
  const active = getBrandStyle();
  const opts = [
    { id: '', label: 'Default' },
    { id: 'inset', label: 'Style 1' },
  ];
  const btns = opts
    .map(
      (o) =>
        `<button type="button" class="fz-seg-btn${o.id === active ? ' is-active' : ''}" data-brandstyle="${o.id}" aria-pressed="${o.id === active ? 'true' : 'false'}">${o.label}</button>`
    )
    .join('');
  return `
    <div class="fz-size brand-style-row">
      <span class="fz-size-label">Surface style</span>
      <div class="fz-seg" role="group" aria-label="Surface style">${btns}</div>
    </div>`;
}

/** Text-size segmented block (S / M / L / XL). Extracted so it can live inside
    the "Accessibility" group card alongside the color controls. */
function textSizeSection() {
  const fz = getStoredFontSize();
  const sizes = { sm: 'S', md: 'M', lg: 'L', xl: 'XL' };
  return `
    <div class="fz-size">
      <span class="fz-size-label">Text size</span>
      <div class="fz-seg" role="group" aria-label="Text size">
        ${Object.keys(sizes)
          .map((s) => `<button type="button" class="fz-seg-btn${fz === s ? ' is-active' : ''}" data-fz="${s}" aria-pressed="${fz === s ? 'true' : 'false'}">${sizes[s]}</button>`)
          .join('')}
      </div>
    </div>`;
}

/** Light / dark theme row. Extracted so it can sit inside the "Experience"
    group card. Keys off data-pop-action="theme" (handled by the shell). */
function themeSection(isDark) {
  return `
    <div class="wise-popover-item" data-pop-action="theme">
      <span class="material-symbols-outlined js-theme-icon">${isDark ? 'light_mode' : 'dark_mode'}</span>
      <span class="js-theme-label">${isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}</span>
    </div>`;
}

/** Full-bleed sub-controls — revealed directly under the "Full bleed" toggle
    once it's switched on (like the Jam player under "Jam strip"). They let an
    admin recolour the three surfaces full bleed exposes edge-to-edge — the
    primary navigation background, the chat window, and any module docked to the
    RIGHT of the chat — switch how those right modules behave, and drop in one of
    three preset themes. Colour pickers key off `data-fbcolor`, the behaviour
    segmented control off `data-rmodmode`, and the presets off `data-fbpreset`;
    all handled in wireAppearancePopover(). Renders nothing while full bleed is
    off so the menu stays clean. */
function fbColorRow(kind, label, value, fallback) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(value || '') ? value : fallback;
  return `
    <div class="fb-color-row">
      <span class="fb-color-label">${label}</span>
      <input type="color" class="fb-color-input" data-fbcolor="${kind}" value="${hex}" aria-label="${label} colour">
    </div>`;
}
function fullBleedOptionsSection() {
  if (!isFullBleedOn()) return '';
  const mode = getRightModuleMode();
  const theme = getFullBleedTheme();

  const modeBtns = RMOD_MODES.map(
    (m) =>
      `<button type="button" class="fz-seg-btn${m.id === mode ? ' is-active' : ''}" data-rmodmode="${m.id}" aria-pressed="${m.id === mode ? 'true' : 'false'}">${m.label}</button>`
  ).join('');

  const presetBtns = FB_PRESETS.map((p) => {
    const sw = `--sw-nav:${p.nav};--sw-chat:${p.chat};--sw-rmod:${p.rmod}`;
    return `<button type="button" class="fb-preset-btn${p.id === theme ? ' is-active' : ''}" data-fbpreset="${p.id}" aria-pressed="${p.id === theme ? 'true' : 'false'}">
        <span class="fb-preset-sw" style="${sw}" aria-hidden="true"></span>${p.label}
      </button>`;
  }).join('');
  const resetBtn = `<button type="button" class="fb-preset-btn${theme ? '' : ' is-active'}" data-fbpreset="" aria-pressed="${theme ? 'false' : 'true'}">Default</button>`;

  return `
    <div class="fb-opts" role="group" aria-label="Full bleed options">
      ${fbColorRow('nav', 'Navigation background', getNavBg(), '#ffffff')}
      ${fbColorRow('chat', 'Chat window background', getChatBg(), '#ffffff')}
      ${fbColorRow('rmod', 'Right module background', getRightModuleBg(), '#f4f2ea')}
      <div class="fz-size fb-rmod-mode">
        <span class="fz-size-label">Right module<span class="wise-popover-badge">Admin</span></span>
        <div class="fz-seg" role="group" aria-label="Right module behaviour">${modeBtns}</div>
      </div>
      <div class="fb-presets">
        <span class="fb-preset-label">Preset themes</span>
        <div class="fb-preset-btns" role="group" aria-label="Preset themes">${presetBtns}${resetBtn}</div>
      </div>
    </div>`;
}

/** Wrap a set of rows in a titled "group" card. Groups are the unit the
    Appearance popover flows into its responsive column layout: each group (and
    therefore every row inside it) stays within ONE column and is never split or
    stretched across columns. An empty body (e.g. a section whose only rows are
    conditionally hidden) renders nothing so we don't leave a stray empty card. */
function apGroup(title, body) {
  const inner = String(body || '').trim();
  if (!inner) return '';
  return `
    <section class="wise-appearance-group">
      <div class="wise-popover-header">${title}</div>
      ${inner}
    </section>`;
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
    ${apGroup('Layout', `
      ${pivotSection(showPivot, isPivoted)}
      ${toggleRow('data-minimal="1"', isMinimalUiOn(), 'Minimal UI')}
      ${toggleRow('data-iconrail="1"', isIconRailOn(), 'Icons only')}
      ${toggleRow('data-sharpedges="1"', isSharpEdgesOn(), 'Sharper edges')}
    `)}
    ${apGroup('Full bleed', `
      ${toggleRow('data-fullbleed="1"', isFullBleedOn(), 'Full bleed')}
      ${fullBleedOptionsSection()}
    `)}
    ${apGroup('Chat', `
      ${toggleRow('data-chattint="1"', isChatTintOn(), 'Blue chat surface', true)}
      ${toggleRow('data-activitystrip="1"', isActivityStripOn(), 'Activity strip', true)}
    `)}
    ${apGroup('Sound', `
      ${toggleRow('data-jam="1"', isJamStripOn(), 'Jam strip', true)}
      ${jamPlayerSection()}
    `)}
    ${apGroup('Accessibility', `
      ${toggleRow('data-colorblind="1"', isColorblindOn(), 'Accessible colors')}
      ${colorblindTypeSection()}
      ${textSizeSection()}
      ${themeSection(isDark)}
      ${brandingSection()}
    `)}
    ${apGroup('Experience', `
      ${toggleRow('data-cwrui="1"', isCwrUiOn(), 'Crawl · Walk · Run', true)}
    `)}
    ${apGroup('Admin', `
      ${accessibilityReviewSection()}
      ${allModulesSection()}
      ${progressLogSection()}
    `)}
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
     (or hide) extra content — the Jam player under "Jam strip", the surface
     pickers under "Full bleed", the CVD-type buttons under "Accessible colors"
     — which changes the popover's height. Without re-placing, a taller popover
     keeps its old top/left and spills off its anchor or out of the viewport, so
     we call the reposition closure the positioning helpers stashed on the node
     (topbar.js positionPopover*), guarded for shells that place it themselves. */
  const render = () => {
    try { ctx.render?.(); } catch (_) {}
    try { pop.__reposition?.(); } catch (_) {}
  };

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
    if (within('[data-fullbleed]'))   { ev.stopPropagation(); applyFullBleed(!isFullBleedOn());   render(); return; }
    if (within('[data-jam]'))         { ev.stopPropagation(); applyJamStrip(!isJamStripOn());      render(); return; }
    if (within('[data-chattint]'))    { ev.stopPropagation(); applyChatTint(!isChatTintOn());      render(); return; }
    if (within('[data-activitystrip]')) { ev.stopPropagation(); applyActivityStrip(!isActivityStripOn()); render(); return; }
    if (within('[data-cwrui]'))       { ev.stopPropagation(); applyCwrUi(!isCwrUiOn());          render(); return; }
    if (within('[data-colorblind]'))  { ev.stopPropagation(); applyColorblind(!isColorblindOn());  render(); return; }
    if (within('[data-sharpedges]'))  { ev.stopPropagation(); applySharpEdges(!isSharpEdgesOn());  render(); return; }

    /* In-popover Jam player transport + track picker. Update the player in
       place (not a full re-render) so the song list keeps its scroll position
       and the popover doesn't jump as you tap between chips. */
    if (within('[data-jam-play]')) { ev.stopPropagation(); toggleJam(); if (!syncJamPop(pop)) render(); return; }
    const jamSong = within('[data-jam-song]');
    if (jamSong) { ev.stopPropagation(); toggleJam(jamSong.dataset.jamSong); if (!syncJamPop(pop)) render(); return; }

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

    /* Full bleed ▸ colour swatch. The <input type="color"> opens a native
       picker and reports via the 'input' listener below; swallow the click so
       it neither toggles a row nor closes the popover. */
    if (within('[data-fbcolor]')) { ev.stopPropagation(); return; }

    /* Branding style ("Default" / "Style 1" inset). Selecting a style applies it
       app-wide; "Default" clears the inset treatment back to the flat mark. */
    const bs = within('[data-brandstyle]');
    if (bs) { ev.stopPropagation(); applyBrandStyle(bs.dataset.brandstyle); render(); return; }

    /* CVD-type buttons are handled by topbar.js's global capture-phase handler
       (it runs before this bubble handler and stops propagation), so we never
       reach here for them — but guard anyway so a stray click can't close us. */
    if (within('.fz-btn[data-cbtype]')) { ev.stopPropagation(); return; }

    /* Light / dark theme. */
    if (within('[data-pop-action="theme"]')) { ev.stopPropagation(); ctx.toggleTheme?.(); render(); return; }

    /* The accessibility-review, all-modules and progress-log rows are real
       links — let the click navigate. */
    if (within('[data-pop-action="a11y-review"]')) return;
    if (within('[data-pop-action="all-modules"]')) return;
    if (within('[data-pop-action="progress-log"]')) return;

    /* Non-interactive chrome (labels, dividers, the text-size row wrapper):
       swallow the click so it neither toggles nor closes the popover. */
    if (within('.wise-appearance-group, .fz-row, .fz-size, .mg-size, .jam-pop, .fb-opts, .fb-color-row, .fb-presets, .wise-popover-header, .wise-popover-divider')) { ev.stopPropagation(); return; }

    /* Anything else = a click on blank popover space → close. */
    ctx.onClose?.();
  });

  /* Full bleed ▸ live surface colour pickers. Colour inputs report through
     'input' (fired continuously as the swatch changes), not 'click', so they
     get their own delegated listener. We deliberately DON'T re-render on every
     input — that would recreate the picker node mid-drag — and instead push the
     colour live and update the preset highlight in place (a hand-tweaked colour
     drops the active preset back to "Default"). */
  pop.addEventListener('input', (ev) => {
    const ci = ev.target.closest?.('[data-fbcolor]');
    if (!ci || !pop.contains(ci)) return;
    const kind = ci.dataset.fbcolor;
    const val = ci.value;
    if (kind === 'nav') applyNavBg(val);
    else if (kind === 'chat') applyChatBg(val);
    else if (kind === 'rmod') applyRightModuleBg(val);
    clearFullBleedThemeMark();
    pop.querySelectorAll('[data-fbpreset]').forEach((b) => {
      const isDefault = b.dataset.fbpreset === '';
      b.classList.toggle('is-active', isDefault);
      b.setAttribute('aria-pressed', isDefault ? 'true' : 'false');
    });
  });
}
