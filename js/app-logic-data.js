/**
 * App Logic catalog — every behavioral rule in the WISE app, grouped by page.
 *
 * The Intent Chip Logic module answers one narrow question ("does each chip
 * carry a transcript and a page action?"). This catalog is the rest of it: the
 * general logic the app runs — auth, theme, nav, panes, tables, wizards,
 * scoring math, filters, persistence — written down per page so the rules are
 * readable without opening the source.
 *
 * Shape:
 *   { id, label, icon, href, area, src[], note?, rules: [{ title, how }] }
 *
 *   • `area`   — matches a MODULE_SECTIONS tone so the filter tiles line up
 *                with the Module Directory. `shared` is the extra area for
 *                logic that runs on every page rather than one screen.
 *   • `href`   — the live page (omitted for the shared subsystems, which have
 *                no page of their own).
 *   • `src`    — the file(s) the rule actually lives in, so a reader can go
 *                verify it.
 *   • `how`    — trusted HTML (allows <code> / <strong>), like CONVENTIONS in
 *                all-modules-flow.js. `title` is escaped at render time.
 *
 * Hand-maintained and hand-verified against the source. When you change how a
 * page behaves, change its rule here in the same pass — a stale rule is worse
 * than no rule.
 */

/* Area meta for the filter tiles. Order here is the order they render in. */
export const LOGIC_AREAS = [
  { tone: 'shared',    label: 'Every page',    icon: 'hub' },
  { tone: 'workspace', label: 'Workspace',     icon: 'workspaces' },
  { tone: 'portfolio', label: 'Portfolio',     icon: 'inventory_2' },
  { tone: 'ai',        label: 'WISEcodeAI',    icon: 'auto_awesome' },
  { tone: 'reform',    label: 'Reformulation', icon: 'auto_fix_high' },
  { tone: 'report',    label: 'Reports',       icon: 'insights' },
  { tone: 'verify',    label: 'Verification',  icon: 'verified' },
  { tone: 'admin',     label: 'Admin',         icon: 'shield' },
  { tone: 'account',   label: 'Account',       icon: 'account_circle' },
  { tone: 'auth',      label: 'Auth',          icon: 'lock' },
  { tone: 'marketing', label: 'Marketing',     icon: 'campaign' },
];

export const APP_LOGIC = [
  /* ══════════════════ Shared — runs on every page ══════════════════ */
  {
    id: 'shared-auth',
    label: 'Auth & session',
    icon: 'lock',
    area: 'shared',
    src: ['js/auth-guard.js', 'js/auth.js', 'js/appearance-menu.js'],
    note: 'A prototype session — there is no server. Everything below is a localStorage contract.',
    rules: [
      {
        title: 'Guard runs before first paint',
        how: '<code>js/auth-guard.js</code> loads in <code>&lt;head&gt;</code> on every non-auth page, reads <code>wise-auth</code> and requires <code>loggedIn: true</code>. A failure calls <code>location.replace()</code> to <code>login.html</code> (inside <code>pages/</code>) or <code>pages/login.html</code> (from the repo root). A thrown error never blocks rendering.',
      },
      {
        title: 'Login accepts any filled credentials',
        how: '<code>WiseAuth.login()</code> has no backend — any non-empty email and password succeeds. The session written to <code>wise-auth</code> is <code>{ loggedIn, name, email, title, org, initials, at }</code>. The demo address resolves to the name <strong>Demo User</strong>; signup stores its payload separately under <code>wc_registration</code>.',
      },
      {
        title: 'Auth pages bounce signed-in users',
        how: '<code>bounceIfAuthed()</code> sends an already-authenticated visitor from <code>login.html</code> / <code>create-account.html</code> to <code>auth.landingUrl()</code>. The query flag <code>?preview=1</code> suppresses the bounce so the All Modules rail can iframe an auth page without being redirected.',
      },
      {
        title: 'Sign-out is handled centrally',
        how: 'A capture-phase click on <code>[data-pop-action="signout"]</code> in <code>appearance-menu.js</code> calls <code>WiseAuth.logout()</code>, always removes <code>wise-auth</code> as a belt-and-braces step, then navigates to <code>WiseAuth.loginUrl()</code>. No page implements its own sign-out.',
      },
    ],
  },
  {
    id: 'shared-theme',
    label: 'Theme & appearance',
    icon: 'palette',
    area: 'shared',
    src: ['js/topbar.js', 'js/text-size-fouc.js', 'js/appearance-menu.js', 'js/text-size.js'],
    rules: [
      {
        title: 'Theme is global, never per page',
        how: 'Dark mode is the <code>dark</code> class on <code>&lt;html&gt;</code>, persisted to <strong>both</strong> <code>wise-theme</code> and <code>chat-theme</code> (kept in lock-step by <code>syncThemeKeys()</code>). Marketing pages read the same <code>wise-theme</code>. No page may add its own theme toggle or force a theme on load.',
      },
      {
        title: 'FOUC guard applies chrome pre-paint',
        how: '<code>js/text-size-fouc.js</code> runs in <code>&lt;head&gt;</code> and applies theme, text scale, Minimal UI, full-bleed mode, nav-hamburger, serif headlines, Guides, flush sticky modules and the chat width default <em>before</em> first paint, so the shell never flashes the wrong state. It is a deliberate twin of the runtime logic in <code>topbar.js</code> — change one, change the other.',
      },
      {
        title: 'One Appearance popover for the whole app',
        how: '<code>buildAppearanceBody()</code> in <code>appearance-menu.js</code> is the single source of that markup; shells pass only <code>showPivot</code>, <code>isPivoted</code>, <code>isDark</code> plus callbacks. Rows are addressed by stable hooks (<code>data-minimal</code>, <code>data-fullbleed</code>, <code>data-fz</code>, <code>data-serif</code>, <code>data-cbtype</code>), and Admin-badged rows hide when <code>wise-admin-ui</code> is <code>&#39;0&#39;</code>.',
      },
      {
        title: 'Appearance defaults that are ON',
        how: 'Unset means on for <strong>Minimal UI</strong> (<code>wise-minimal-ui-v2</code>), the <strong>icon nav rail</strong> (<code>wise-menu-rail</code>), <strong>Nav &amp; History icons</strong> (<code>wise-nav-modules-v2</code>), <strong>chat tint</strong> (<code>wise-chat-tint</code>), the <strong>activity strip</strong> (<code>wise-activity-strip</code>) and <strong>serif headlines</strong> (<code>wise-serif-headlines</code>). <strong>History in navigation</strong> stays off. <strong>Guides</strong> stays off. <strong>Flush sticky modules</strong> stays off. <strong>Header float</strong> is unconditional — <code>isHeaderFloatOn()</code> always returns true, so module header strips are gone app-wide and <code>.panel-controls</code> float over the content.',
      },
      {
        title: 'Text size is a scale, not a font size',
        how: '<code>setTextSize()</code> stores <code>sm|md|lg|xl</code> in <code>chat-font-size</code> and sets the CSS variables <code>--wise-text-scale</code>, <code>--wise-icon-scale</code> and <code>--chat-line-height</code> on <code>&lt;html&gt;</code> plus <code>dataset.textSize</code>. Type and icons size off the variable from their authored size rather than a single pixel floor.',
      },
      {
        title: 'Serif headlines can switch to DM Sans',
        how: 'Appearance ▸ Accessibility ▸ Serif headlines is on by default. Turning it off writes <code>wise-serif-headlines=0</code>, sets <code>sans-headlines</code> on <code>&lt;html&gt;</code>, remaps the title font tokens to DM Sans (weights 300–800, plus italic), and aliases hardcoded Noto Serif stacks to the same files so titles match. The FOUC twin in <code>text-size-fouc.js</code> applies it before first paint.',
      },
      {
        title: 'Full bleed defaults to chat-only',
        how: '<code>wise-fb-mode</code> is <code>&#39;chat&#39;</code> by default (also <code>&#39;all&#39;</code> or <code>&#39;off&#39;</code>), driving <code>full-bleed</code> and <code>fb-chat-only</code> on <code>&lt;html&gt;</code>. Legacy <code>wise-full-bleed</code> / <code>wise-fb-chat-only</code> are read only to migrate. Turning App Search on suspends the classes without changing the stored mode.',
      },
      {
        title: 'Flush sticky modules matches the primary drawer',
        how: 'Every non-chat drawer (Output, Product Details, progress, Report, dashboard, Contact, Turns) uses the same 15px top/bottom inset. Matching is always on — it does not wait for a toggle or for <code>.is-sticky</code>. Appearance ▸ Layout ▸ Flush sticky modules is on by default and writes <code>wise-sticky-flush</code>. Chat stays the full-height buckle. The FOUC twin in <code>text-size-fouc.js</code> applies the class before first paint.',
      },
      {
        title: 'Colorblind mode filters the shell only',
        how: '<code>wise-colorblind</code> toggles the <code>colorblind</code> class and <code>wise-colorblind-mode</code> picks <code>deuter</code> (default), <code>protan</code> or <code>tritan</code>. The injected daltonization SVG filters are scoped to <code>#chat-shell-wrap, #agent-shell-wrap</code> and deliberately never applied to <code>&lt;body&gt;</code>, which would break fixed popovers.',
      },
      {
        title: 'Roll · Crawl · Walk · Run gates the chat',
        how: 'Each page loads a default mode onto <code>&lt;html&gt;</code> as <code>cwr-roll</code> / <code>cwr-crawl</code> / <code>cwr-walk</code> / <code>cwr-run</code>: <strong>Run</strong> on every page that mounts a WISEcodeAI chat (so the helix has a visible box on first paint); <strong>Roll</strong> on pages with no chat — login, create-account, forgot-password, analytics-types (chat opted out), and the vision-deck slide mock. A click still applies for that visit; the next load reapplies the page default. <code>helix.html</code> is Run-only — Roll, Crawl, and Walk lock so the playground cannot hide itself. <code>wise-cwr-mode</code> is only a snapshot of the in-session choice. Roll is Crawl with a stripped SaaS nav that still keeps Marketing Assets, Team, and Reports under Studio. Crawl hides chat surfaces with <code>inert</code> + <code>aria-hidden</code>. Roll and Crawl also drop History from the primary nav (the History-in-nav section, the History icon, and the new-chat circle). Walk hides the composer rail, Run unlocks everything. Hovering a mode shows what it includes and excludes. Turning the widget off (<code>wise-cwr-ui</code>) suspends the gating entirely. Turning Internal admins off hides the floating widget but leaves the selected mode applied.',
      },
      {
        title: 'Guides are off until you turn them on',
        how: 'Appearance ▸ Experience ▸ Guides writes <code>wise-guides</code> and toggles <code>guides-on</code> on <code>&lt;html&gt;</code>. Unset means off, so the floating hint cards (ready-to-verify, pre-qualified, “This is new!”, Analyze Ingredients) stay hidden. <strong>All Modules</strong> is the exception — its catalog toasts stay on even when Guides is off. The FOUC twin in <code>text-size-fouc.js</code> paints a stored-on preference before first paint.',
      },
    ],
  },
  {
    id: 'shared-nav',
    label: 'Navigation shell',
    icon: 'menu',
    area: 'shared',
    src: ['js/agent-menu.js', 'js/topbar.js', 'js/mobile-nav.js', 'js/nav-history.js', 'js/nav-modules.js', 'js/app-search.js'],
    rules: [
      {
        title: 'wiseai.html is the canonical shell',
        how: 'Nav, spacing, padding and module structure are copied from <code>pages/wiseai.html</code> — never hand-rolled per page. In practice that means calling the shared injectors <code>mountTopbar()</code>, <code>mountAgentMenu()</code>, <code>mountMenuBrand()</code> and <code>mountMenuFooter()</code> instead of duplicating markup. When a page and wiseai.html disagree, wiseai.html wins.',
      },
      {
        title: 'One import boots the subsystems',
        how: 'Importing <code>agent-menu.js</code> side-loads <code>lir-tooltip</code>, <code>pane-width</code>, <code>pane-resize</code>, <code>default-fill</code>, <code>popover-layer</code>, <code>chip-tooltip</code> and <code>owl-walkthrough</code>; <code>topbar.js</code> adds <code>mobile-nav</code>. Each is guarded by an idempotent flag such as <code>window.__wisePaneWidthLoaded</code>, so a page never double-boots them.',
      },
      {
        title: 'Pages opt into the nav by data attribute',
        how: '<code>&lt;body data-nav-id="…"&gt;</code> routes through <code>bootstrapAppNavPage()</code> in <code>agent-overview.js</code>, which mounts the sectioned workspace nav with the right active item, the identity-aware topbar, and the page\u2019s own render function — zero per-page wiring. <code>data-agent-id</code> and <code>data-product-id</code> are the two legacy shells.',
      },
      {
        title: 'Missing pages render as locked nav items',
        how: '<code>agent-menu.js</code> keeps an <code>EXISTING_PAGES</code> set; a nav entry whose slug is not in it renders with <code>.menu-nav-locked</code> instead of a dead link. Adding the page is what unlocks the item.',
      },
      {
        title: 'Mobile collapses the nav into a drawer',
        how: 'Below <code>768px</code>, <code>mobile-nav.js</code> shows only the owl bug until <code>#menu-panel.wise-mnav-open</code> opens the full drawer over an <code>#mnav-scrim</code>, locking scroll with <code>html.wise-mnav-locked</code>. Leaving the breakpoint closes the drawer automatically.',
      },
      {
        title: 'Page-level nav overrides are forced, not stored',
        how: 'A page can open with the rail collapsed via <code>&lt;body data-default-nav-collapsed&gt;</code> (Reports does this by nav id). <code>collapseNavRail()</code> adds <code>mp-rail</code> <strong>without</strong> writing <code>wise-menu-rail</code>, so the user\u2019s own preference survives the visit and the toggle still expands it in-session.',
      },
      {
        title: 'History can merge into the nav, or share a four-icon rail',
        how: '<code>nav-history.js</code> relocates the live History module into an expandable nav section (Appearance ▸ History in navigation). <code>nav-modules.js</code> is the sibling and the load default: collapsed, the rail shows only the logo bug, menu, History on icon and a circular new-chat icon. The menu opens the labelled navigation; the History icon opens History in full with the navigation collapsed. While either is open, the hamburger and new-chat hide so they are not repeated inside the opened module, and the history-off icon closes back to the rail. The two modes are mutually exclusive.',
      },
      {
        title: 'App Search re-plumbs the shell',
        how: 'Search is locked off — the published load default is off and the Appearance row cannot turn it on. When it is on, <code>wise-app-search</code> adds <code>app-search-on</code>, mounts <code>#wise-app-search</code>, drops the full-bleed classes and floats the menu footer into the search row above <code>769px</code>. It indexes transcripts, outputs and reports out of the chat-history keys plus the live DOM, and hands off through the sessionStorage keys <code>wise-search-open-chat</code> / <code>wise-search-open-report</code>.',
      },
    ],
  },
  {
    id: 'shared-panes',
    label: 'Panes, width & docking',
    icon: 'view_column',
    area: 'shared',
    src: ['js/pane-width.js', 'js/pane-resize.js', 'js/default-fill.js', 'js/sticky-modules.js', 'js/wiseai-dock.js', 'pages/wise.css'],
    rules: [
      {
        title: 'Four width tiers, one control',
        how: 'Every module uses the same <code>window.WPaneWidth</code> ladder — <strong>single → double → fill → custom</strong> (tiers 0, 1, 3, 4) — expressed as <code>panel-wide</code>, <code>panel-fill</code>, <code>panel-custom</code> and cycled by <code>.panel-width-toggle-btn</code>. Triple is gone. Each module persists its own rest state; changing or resizing a neighbour does not write it. Custom keeps the current width until you drag; that dragged size is what it then maintains. Do not invent a parallel width system for a new module.',
      },
      {
        title: 'Chat width default is viewport-based',
        how: '<code>WPaneWidth.defaultChatTier()</code> returns tier <strong>1 (double)</strong> above <strong>1512 CSS px</strong> and tier <strong>0 (single)</strong> at or below it — the 14″ MacBook Pro class. The measurement is <code>window.screen.width</code>, the <strong>display</strong>, not <code>innerWidth</code>: resizing or un-maximising the browser window must never change the tier. <code>mountWISEcodeAIDock()</code> re-applies that default on every load rather than restoring the last toggle, and the FOUC twin adds <code>html.chat-default-double</code> pre-paint. Cycling back to single drops that class.',
      },
      {
        title: 'Modules right of the chat default to fill',
        how: '<code>default-fill.js</code> finds the chat in <code>#modules-row</code> and drives every visible module to its right to tier 3 by clicking its real width toggle — no parallel state. It latches with <code>data-fill-defaulted</code> per open cycle, skips <code>[data-no-fill-default]</code>, and stands down below 560px where the row stacks.',
      },
      {
        title: 'Drag-resize snaps back to a preset, unless custom',
        how: '<code>pane-resize.js</code> mounts handles in a body-level <code>.pr-overlay</code> so they escape overflow clipping. A pane at single/double/fill snaps to the nearest of those three on release. A pane at <strong>custom</strong> keeps the free pixel width, persisted per page in <code>wise-pane-widths-v1</code>. Minimum width is 300px.',
      },
      {
        title: 'Custom width turns the row into a carousel rail',
        how: 'When any first-class module in <code>#modules-row</code> (or a panel inside <code>#panels-row</code> / <code>#panels-row-right</code>) is at <strong>custom</strong>, <code>WPaneWidth.syncCarousel()</code> adds <code>modules-carousel</code> to the row. The row scrolls horizontally with the content (<code>overflow-x: auto</code>); every direct child is <code>flex-shrink: 0</code> so modules keep the width they were given instead of squeezing to fit the window. <strong>Narrowing the browser</strong> is what makes the rail obvious: the pinned widths no longer fit, so overflow goes sideways. Nested demos inside a module do not trip the rail. Navigation lives outside the row and is never on it. A scrollbar is always reserved (<code>scrollbar-gutter: stable</code>). Leave custom — or close the last custom pane — and the rail class drops.',
      },
      {
        title: 'Browser height shrinks the work surface, not the modules',
        how: 'The shell fills the window: <code>#modules-row</code> is <code>flex: 1</code> with <code>min-height: 0</code>, and each module is <code>height: 100%</code> / <code>max-height: 100%</code>. Shortening the browser shortens every module’s inner work surface — lists, charts and forms compress or scroll inside the card. Module <em>widths</em> stay exactly what they were; chips, type and controls keep their designed size. A shorter window never squeezes, wraps or restacks the row. Horizontal overflow is the carousel rail, not a squeeze. Below <strong>560px</strong> wide the row does stack, but that is a width breakpoint, not a height one.',
      },
      {
        title: 'Sticky is the only drawer mode',
        how: '<code>sticky-modules.js</code> tucks flanking modules behind the chat card with <code>.sticky-mod.is-sticky</code> and marks the chat <code>.sticky-chat</code>. There is no on/off switch to add — the parity config sets <code>stickyModules: true</code> and <code>stickyModulesMenu: false</code>. Progress panes may be dismissed, remembered under <code>wise-progress-removed:{path}:{moduleId}</code>.',
      },
      {
        title: 'Drawers stack as a utility belt under the chat',
        how: 'The chat is the buckle at <strong>z-index 3</strong>. Output (<code>#agent-main</code>, <code>#wa-unified</code> / Results / Visuals) sits at <strong>z-index 2</strong>, under the chat and over peer drawers. Peer drawers to its right (Nutrition Facts, Turns, Help) sit at <strong>z-index 1</strong>: the same height as Output, vertically centred, chat-facing corners squared, tucked with a negative left margin so they read as emerging from the card. History tucks left of the chat. Nested drawers — progress, Help contact, generated Report (<code>#help-contact</code>, <code>#wa-report</code>, <code>#pf-report-panel</code>, <code>.vf-progress-pane</code>) — sit at <strong>z-index 0</strong> and match that same height. Opening a module \u22ef must never lift a drawer over the chat.',
      },
      {
        title: 'Dock side is a pane count, not a side',
        how: 'The chat is always the centre anchor, so <code>&lt;body data-default-dock&gt;</code> is read as how many panes sit to its <em>right</em>: <code>left</code>→2, <code>center</code>→1, <code>right</code>→0. It is written into <code>wise-wiseai-dock</code> before mount so the restore picks it up.',
      },
    ],
  },
  {
    id: 'shared-tables',
    label: 'Tables',
    icon: 'table_rows',
    area: 'shared',
    src: ['js/sortable-tables.js', 'js/table-pagination.js', 'js/responsive-tables.js', 'js/product-row-click.js'],
    rules: [
      {
        title: 'One faux-table pattern everywhere',
        how: 'Every list is the same CSS-grid table — <code>*-thead</code> / <code>*-trow</code> / <code>*-th</code> / <code>*-td</code> driven by a single columns custom property. Real <code>&lt;table&gt;</code> markup is the exception, not the pattern.',
      },
      {
        title: 'Sorting attaches itself',
        how: '<code>sortable-tables.js</code> is a side-effecting module: importing it scans for tables and grids, adds <code>.srt-sortable</code>, <code>data-srt-dir</code> and <code>aria-sort</code>, and infers each column\u2019s type (date / number / text). A MutationObserver re-scans on DOM changes. Opt out with <code>[data-no-sort]</code>.',
      },
      {
        title: 'Load-more paging, ten at a time',
        how: '<code>table-pagination.js</code> appends a <code>.wtp-foot</code> reading &ldquo;Showing <em>n</em> of <em>total</em>&rdquo; with a Load more button that reveals 10 further rows; overflow rows are hidden with <code>.wtp-clip</code>. Opt out with <code>[data-wtp-skip]</code> or <code>[data-no-paginate]</code>.',
      },
      {
        title: 'A product row opens the product',
        how: 'Clicking anywhere on a product row opens <code>view-product.html</code> for that SKU. Icons, checkboxes, the ⋮ menu, reports, size links, claim/verify buttons, and any other control keep their own action — <code>product-row-click.js</code> stands down when the click lands on one of them. Opt out with <code>[data-no-row-click]</code>. Non-product lists (invoices, orgs, users, ingredients) never match.',
      },
      {
        title: 'Narrow tables become cards',
        how: '<code>responsive-tables.js</code> watches container width with a ResizeObserver and, below <strong>560px</strong>, adds <code>.rtbl-cards</code>; each visible cell becomes a <code>.rtbl-fld</code> carrying its header in <code>data-rlabel</code>. It is container width, not viewport width, so a table in the narrow column beside the chat cards up correctly.',
      },
    ],
  },
  {
    id: 'shared-popovers',
    label: 'Popovers & tooltips',
    icon: 'layers',
    area: 'shared',
    src: ['js/popover-layer.js', 'js/topbar.js', 'js/lir-tooltip.js', 'js/chip-tooltip.js', 'js/feedback.js'],
    rules: [
      {
        title: 'Two popover shells only',
        how: 'Every menu reduces to <code>.topbar-popover</code> (compact row / top-bar menus) or <code>.wise-popover</code> (settings, profile). A third bespoke shell is a bug.',
      },
      {
        title: 'Popovers portal out of overflow',
        how: '<code>popover-layer.js</code> watches for a popover being shown and moves it to <code>document.body</code> as <code>position: fixed</code> at z-index <code>2147483000</code>, tracking its anchor on scroll and resize. That is what lets a menu inside a scrolling module escape its clipping parent. Opt out with <code>data-popover-static</code>.',
      },
      {
        title: 'Anchor above or right, never below',
        how: '<code>positionPopoverInMenuPanel()</code> places the popover above its trigger (<code>anchorRect.top - height - 8</code>) and only flips below when there is no room — matching the Appearance popover sitting above its nav icon. Anything that changes the trigger\u2019s position (the jam strip toggling on, a full-bleed reflow) calls the stored <code>pop.__reposition</code> so the popover stays attached.',
      },
      {
        title: 'Tooltips resolve a label chain',
        how: '<code>initLirTooltip()</code> delegates on icon-only controls and reads the label from <code>data-tip</code>, then <code>.lir-label</code>, then <code>aria-label</code>, then <code>title</code> — suppressing the native tooltip while its own is visible. One card, theme-aware (surface in light, dark in dark). Placement is below by default, right for the menu toggle, and above for Appearance rows (<code>lir-tip-above</code>). Intent chips never get a tooltip: their label is already on the chip, so a hover card (or a native <code>title</code>) is banned. Parallel always-dark hover cards are a bug.',
      },
      {
        title: 'Status chips explain themselves',
        how: '<code>chip-tooltip.js</code> attaches to the data chips (<code>.pf-chip</code>, <code>.vf-chip</code>, <code>.gv-chip</code>, <code>.ib-gras</code>, <code>.ib-pl</code>) and shows a hover card with the status explanation plus a thumbs row that mirrors chat feedback. A 220ms hide delay lets the pointer travel into the card.',
      },
      {
        title: 'Press C to leave a comment',
        how: '<code>feedback.js</code> arms comment mode on the <kbd>C</kbd> key; the next click pins a threaded note anchored to that element plus a fractional offset, so it survives reflow. It posts to <code>/api/feedback</code> and falls back to localStorage (<code>wise-feedback-data</code>) when the endpoint is unavailable.',
      },
    ],
  },
  {
    id: 'shared-motion',
    label: 'Motion & numbers',
    icon: 'animation',
    area: 'shared',
    src: ['js/count-up-all.js', 'js/count-up.js'],
    rules: [
      {
        title: 'Every scorecard number counts up',
        how: 'Any numeric value in a scorecard — anything that visibly moves from 0 to a number — animates. <code>count-up-all.js</code> is the shared implementation; do not add a one-off counter.',
      },
      {
        title: 'Count-up fires on first sight',
        how: 'An IntersectionObserver at threshold <code>0.25</code> starts the animation the first time a number scrolls into view, running 0 → target over <strong>1400ms</strong> with an <code>easeOutCubic</code> curve. It also re-runs when the element\u2019s text changes, so a filtered count re-animates.',
      },
      {
        title: 'Charts replay on click',
        how: 'Where a chart is re-animatable, clicking it re-runs the whole animation including its count-up — <code>[data-cu-card]</code> is the hook for the number half. <code>pages/analytics-types.html</code> is the reference surface for this.',
      },
      {
        title: 'Reduced motion is honored',
        how: 'Count-up respects <code>prefers-reduced-motion</code> and snaps to the final value; the chat does the same for its typing reveal. Elements can also opt out with <code>[data-no-countup]</code>.',
      },
    ],
  },

  /* ══════════════════ Workspace ══════════════════ */
  {
    id: 'overview',
    label: 'Overview · Brand dashboard',
    icon: 'space_dashboard',
    href: 'overview.html',
    area: 'workspace',
    src: ['js/dashboard-home.js', 'pages/overview.html'],
    rules: [
      {
        title: 'First load runs a discovery skeleton',
        how: '<code>shouldRunDiscovery()</code> gates on <code>!_discoveryDone &amp;&amp; !_altBrandActive</code> and reduced-motion. <code>runDiscovery()</code> fills the progress bar over <code>DISCOVERY_DURATION_MS</code> (7200ms), counts tokens toward <code>DISCOVERY_TOKENS</code>, and reveals the real dashboard at <code>DISCOVERY_REVEAL_PCT</code> (30%) once <code>DISCOVERY_MIN_SKELETON_MS</code> (1900ms) has elapsed.',
      },
      {
        title: 'Scores map to five named tiers',
        how: '<code>STATUS_TIERS</code> splits 0–100 into 20-point bands — Poor, Fair, Okay, Good, Excellent — and <code>scoreTierTone()</code> / <code>scoreColor()</code> / <code>ratingLabel()</code> drive every bar, donut and pill off that one mapping. The underlying numbers in <code>DATA</code> are authored constants, not computed from the product list.',
      },
      {
        title: 'Chips fire the page\u2019s own buttons',
        how: 'Every actionable control carries a <code>data-dash-action</code> (<code>claim-upcs</code>, <code>review-portfolio</code>, <code>add-food</code>, <code>verify-upf</code>, <code>verify-gras</code>, <code>edit-logo</code>). The chat\u2019s <code>DASHBOARD_WISEAI_ACTIONS</code> map points at the same attribute values, so a chip clicks the real button rather than duplicating its behavior.',
      },
      {
        title: 'The transcript lands before the chip acts',
        how: 'Dashboard chips return <code>false</code> from <code>onIntent</code> so the narration posts first, then <code>onReply</code> clicks the matching <code>[data-dash-action]</code> element after a 1400ms beat. No chip may navigate away before leaving a transcript behind.',
      },
      {
        title: 'Reports open inline, never as a modal',
        how: '<code>openDashReport(key)</code> swaps the main scroll for the report and keeps a <strong>Back to reports</strong> restore; keys are <code>upf</code>, <code>gras</code> and <code>insights</code>. With <code>mirror: true</code> it also narrates into the chat through <code>pushDashChat()</code>.',
      },
      {
        title: 'Brand art is user-replaceable',
        how: '<code>wise-brand-banner</code> and <code>wise-brand-logo</code> hold the hero art, with the sentinels <code>__none__</code> meaning &ldquo;explicitly removed&rdquo; rather than &ldquo;unset&rdquo;. A one-time migration flag (<code>wise-brand-reset-datebetter-v1</code>) resets the demo brand once and never again.',
      },
      {
        title: 'Admin view switches swap the dataset',
        how: '<code>toggleBrandCompare()</code> flips <code>_altBrandActive</code> so <code>getActiveData()</code> returns <code>DATA_ALT</code> (a 547-product comparison brand), and <code>toggleStarsView()</code> swaps the body for the Guiding Stars view. Both live in the ⋯ menu behind an ADMIN badge, not on the banner.',
      },
    ],
  },

  /* ══════════════════ Portfolio ══════════════════ */
  {
    id: 'product-portfolio',
    label: 'Product Portfolio',
    icon: 'handyman',
    href: 'product-portfolio.html',
    area: 'portfolio',
    src: ['pages/product-portfolio.html'],
    rules: [
      {
        title: 'Three tabs, one status filter',
        how: '<code>PF_TABS</code> is <code>[&#39;claimed&#39;, &#39;discovered&#39;, &#39;needsinfo&#39;]</code>. <code>pfSwitchTab()</code> resets the status filter on every tab change; clicking a <em>status</em> scorecard forces the tab to <code>claimed</code> first, because status only exists for claimed products.',
      },
      {
        title: 'Row state is read from the chips',
        how: '<code>pfRowTags(row)</code> derives a row\u2019s state from the rendered chips (<code>.pf-chip--verify</code>, <code>--prequal</code>, <code>--attest</code>, <code>--verified</code>, <code>--pay</code>, <code>--inelig</code>) rather than a parallel state object — the DOM is the source of truth for filtering.',
      },
      {
        title: 'Filters OR inside a group, AND across',
        how: '<code>pfFilters</code> keeps <code>data</code> and <code>shield</code> as Sets: selections within one group are an OR, and the groups combine as an AND. Guiding Stars facets apply on all tabs; status facets apply only on Claimed. Hidden rows get <code>.pf-row-hidden</code> and the footer recomputes &ldquo;Showing X of Y&rdquo;.',
      },
      {
        title: 'Chat routes are ordered, not scored',
        how: '<code>pfMatchRoute()</code> walks <code>PF_ROUTE_ORDER</code> and takes the first <code>test</code> regex that hits — the order is meaningful (<code>ineligible</code> is checked before <code>shields</code> so the narrower phrase wins). A match opens the matching tab through <code>openPortfolioModule()</code>; a miss posts the portfolio summary plus offer chips.',
      },
      {
        title: 'Guiding Stars scores are deterministic',
        how: '<code>pfStarData(name, upc)</code> hashes the product name with <code>pfHashName</code> so the same product always shows the same stars, score, ease and near-miss values across reloads. A saved reformulation from <code>WISEReformulationStore</code> overlays the hashed score with the real one.',
      },
      {
        title: 'Row menus deep-link with state',
        how: '<code>pfViewHref</code>, <code>pfEditHref</code>, <code>pfAddPacksHref</code> and <code>pfReformulateHref</code> build query strings carrying <code>name</code>, <code>upc</code>, <code>img</code>, <code>mode=edit</code> and <code>packs=1</code>, so <code>view-product.html</code>, <code>add-product.html</code> and <code>reformulation.html</code> open already focused on the right product and the right task. Discovered rows also pass <code>from=discovered</code> so the product page can offer claim instead of the Non-UPF Shield. Clicking the row itself (not an icon, checkbox, menu, or other control) uses the same View deep-link.',
      },
      {
        title: 'Multiple sizes only show when real',
        how: '<code>pfPopulateSizes()</code> renders the <code>.pf-sizes</code> cluster only when a UPC maps to two or more packs in <code>PF_PRODUCT_SIZES</code>, ordering the size embedded in the product name first. The &ldquo;Multiple sizes&rdquo; scorecard counts exactly those rows.',
      },
    ],
  },
  {
    id: 'add-product',
    label: 'Add Product',
    icon: 'add_box',
    href: 'add-product.html',
    area: 'portfolio',
    src: ['js/add-product-flow.js'],
    rules: [
      {
        title: 'Eight steps live in the transcript',
        how: '<code>STEPS</code> is <code>photo, category, upc, nutrition, ingredients, allergens, photos, save</code>. <code>stepFilled(id)</code> decides completion per step — nutrition needs both <code>nf.calories</code> and <code>nf.servingSize</code>; UPC counts as done if entered <em>or</em> explicitly skipped. There is no side progress pane: leftover unused steps trail the reply as chips, and “still needed” copy lists what is left before save.',
      },
      {
        title: 'Save is gated on five required fields',
        how: '<code>REQUIRED</code> is <code>productName</code>, <code>category</code>, <code>ingredients</code>, <code>nf.servingSize</code>, <code>nf.calories</code>. <code>updateSaveState()</code> disables the save button while <code>requiredMissing()</code> or <code>nfErrorCount()</code> is non-zero. A successful <code>doSave()</code> appends to <code>wise-portfolio-additions</code>.',
      },
      {
        title: 'Panel edits narrate into the chat',
        how: 'Editing a field on the Nutrition Facts panel calls <code>commitField(..., { fromPanel: true })</code>, which fires <code>announcePanelEdit()</code> — a user line plus an assistant reply — so the transcript reads the same whether you typed the value or set it on the panel. In-place fixes pass <code>{ inPlace: true }</code> to keep focus.',
      },
      {
        title: 'UPC input is validated, not trusted',
        how: 'While <code>state.awaiting === &#39;upc&#39;</code>, non-digits are stripped and anything under 8 digits re-prompts with a <em>Scan</em> / <em>Skip</em> chip pair. Free text containing 7+ consecutive digits is also picked up as a UPC by <code>interpret()</code>.',
      },
      {
        title: 'Label parse is a fixed demo payload',
        how: 'Upload and URL parse both apply <code>SAMPLE_PARSE</code> rather than reading the file — including deliberately unreadable micronutrients that seed <code>state.errors</code>, so the &ldquo;fix these fields&rdquo; path is always demonstrable.',
      },
      {
        title: 'Ingredients Analyzer is its own sticky module',
        how: 'The ingredient list, Analyze button, and Parsed / Codes / Nutrients / Scout accordions render in <code>#ia-panel</code>, a nested sticky drawer to the right of Product Details. The drawer starts closed. Verify ingredients (banner, chip, or <code>from=verify</code>) and Analyze open it at double pane width; Product Details\u2019 ⋯ can toggle it. There is no Save to Portfolio footer on the product module \u2014 save lives on the add banner and in chat. The analyzer does not take the fill-width default.',
      },
      {
        title: 'Category docks under the barcode as a plain link',
        how: 'When <code>useHeaderIdentity()</code> is on, <code>productSizesGroupHTML()</code> puts the category dropdown under the barcode as <code>.nfp-fi-cat--dock</code> — a text link with a chevron, no pill fill or border. It is not a thumb-row extra.',
      },
      {
        title: 'One picture hides the tiny preview; the barcode leads the size row',
        how: 'The size row is any extra-count squares, then the barcode (<code>.nfp-fi-upc</code>), then Add size. Extra packs still get a square so you can switch. If <code>state.packs</code> is empty, the 1 ct square is omitted — the lead photo already shows that picture — so the row is barcode, then plus.',
      },
      {
        title: 'Hover a size to delete it',
        how: 'Each extra size square shows a trash icon on hover. Clicking the square still switches the barcode and Nutrition Facts to that size. Clicking the trash opens a confirm popover (Keep / Delete) to the right of the square. Confirming removes that size and echoes the deletion in chat.',
      },
    ],
  },
  {
    id: 'view-product',
    label: 'View Product',
    icon: 'inventory_2',
    href: 'view-product.html',
    area: 'portfolio',
    src: ['js/add-product-flow.js', 'pages/view-product.html'],
    rules: [
      {
        title: 'Same flow, different entry mode',
        how: 'View and Edit reuse the entire Add Product flow. <code>init()</code> reads <code>data-ap-mode</code> or the URL (<code>mode=edit</code>, <code>edit=1</code>, <code>view=1</code>) and calls <code>openFilledProduct()</code>, which skips the welcome, loads the sample as a base, then overrides name, UPC and image from the query string.',
      },
      {
        title: 'Deep links focus a sub-task',
        how: '<code>packs=1</code> or <code>focus=packs</code> retitles the topbar to &ldquo;Product sizes&rdquo;, runs <code>startAddPack()</code> and scrolls to the packs group; <code>compare=1</code> turns on the comparison matrix.',
      },
      {
        title: 'Saved reformulations overlay the label',
        how: '<code>applySavedReformulation()</code> looks the product up in <code>WISEReformulationStore</code> by UPC or name and writes the reformulated sodium, saturated fat and fiber into <code>state.nf</code>, so the panel shows the current recipe rather than the printed label.',
      },
      {
        title: 'The next-step banner follows the portfolio action',
        how: 'Portfolio row actions pass <code>from=</code> so View / Add Product opens on the matching banner: Discovered \u2192 Review &amp; claim, Claimed \u2192 finish a claimed product, Missing data \u2192 Complete details or Verify ingredients, Add a product \u2192 save a new product, ineligible \u2192 why the shield is blocked. Verify ingredients opens the Ingredient List sticky to the right of Product Details (and <code>from=verify</code> opens it on arrival). Claimed products that already qualify still see Get the Non-UPF Shield. Five small dots mark progress through Discovered \u2192 Claimed \u2192 Data complete \u2192 Ingredients verified \u2192 Non-UPF Verified; there is no labelled stepper. Claiming writes the UPC to <code>wise-portfolio-claimed</code> and drops the row from Discovered on the next visit.',
      },
      {
        title: 'Ingredients Analyzer is its own sticky module',
        how: 'Same as Add Product: the ingredient list and Analyze accordions live in <code>#ia-panel</code>, a nested sticky drawer to the right of Product Details. It starts closed; Verify ingredients opens it to the right of the product module.',
      },
      {
        title: 'Intent chips track the NFP analysis workflow',
        how: 'View/Edit Product chat chips are not a static Edit / Save / Back row. <code>nfpIntentChips()</code> reads the live ingredient-analysis state (list present, analyzed, fuzzy, unmatched, confirmed, which accordions are open) and offers the next possible panel actions: Analyze / Re-analyze, Review mappings, Confirm matched, Confirm a fuzzy row, Look up unmatched, Test code scores, Test Wise Code AI, Show nutrients. After each chip or panel action the reply trail updates. Typing a chip\u2019s label plays the same turn. Fallback chips on this surface use that set, not the blank Add Product wizard.',
      },
      {
        title: 'Identity strip follows Add Product',
        how: 'The same <code>productSizesGroupHTML()</code> rules apply because both pages set <code>WISE_HERO_BRAND</code>: category docks left of ⋯ at 28px, the barcode sits after the size squares and before plus, and a product with only one picture does not show a tiny 1 ct preview.',
      },
    ],
  },
  {
    id: 'add-catalog',
    label: 'Add Catalog',
    icon: 'upload_file',
    href: 'add-catalog.html',
    area: 'portfolio',
    src: ['js/add-catalog-flow.js'],
    rules: [
      {
        title: 'Nothing imports without confirmation',
        how: '<code>state.stage</code> walks <code>start → mapped → imported</code> and then verified. The footer button is disabled at <code>start</code>, reads &ldquo;Import 65 products&rdquo; once mapped, becomes &ldquo;Verify catalog&rdquo; after import, and ends disabled as &ldquo;Catalog imported&rdquo;.',
      },
      {
        title: 'Parse is simulated, mapping is not',
        how: '<code>onFile()</code> records the filename and applies the fixed <code>SAMPLE_RESULT</code> (65 rows, 62 imported, 3 needing a fix) with <code>SAMPLE_MAPPING</code> — the household serving column is deliberately flagged <code>unsure: true</code> so the column-mapping review step has something real to resolve.',
      },
      {
        title: 'The CSV template is generated from one list',
        how: '<code>COLUMNS</code> (38 fields, core nutrition marked <code>req: true</code>) drives the header row, the blank template and the four-row example file. Changing the accepted columns means editing that array, not three separate strings.',
      },
      {
        title: 'Analysis runs on a fixed cadence',
        how: 'After import, <code>runAnalyze()</code> advances <code>state.analyzePct</code> by 20 every 420ms; verification then flips <code>state.verified</code> and the chat confirms the products have landed in <strong>Claimed</strong>.',
      },
    ],
  },
  {
    id: 'product-comparison',
    label: 'Comparison',
    icon: 'compare',
    href: 'product-comparison.html',
    area: 'portfolio',
    src: ['pages/product-comparison.html'],
    rules: [
      {
        title: 'The first column locks the entity kind',
        how: '<code>cmpSeedId()</code> picks the primary column and <code>cmpLockedKind()</code> reads its kind — <code>product</code>, <code>portfolio</code> or <code>category</code>. Everything added afterwards must match, so a product board can never end up comparing against a whole portfolio.',
      },
      {
        title: 'Missing scores are hashed, not random',
        how: '<code>cmpScoreFor(ent, metricId)</code> returns the authored score when present, otherwise <code>base + ((cmpHash(ent.id + &#39;:&#39; + metricId) % 29) - 14)</code> clamped to 14–97 — deterministic per entity and metric, so the board is stable across reloads.',
      },
      {
        title: 'Letters come from one grade ladder',
        how: '<code>cmpGrade(v)</code> maps a numeric score to A+ … F and <code>cmpGradeClass</code> maps that to <code>g-a</code> / <code>g-b</code> / <code>g-c</code> / <code>g-d</code>, so grade color is never set per cell.',
      },
      {
        title: 'The board opens at double width',
        how: 'On first scope init, if <code>wise-panel-wide-v1</code> has no entry for <code>compare</code>, the page calls <code>setPanelWide(&#39;compare&#39;, 1)</code> — a comparison needs at least two columns of room to read.',
      },
    ],
  },
  {
    id: 'marketing-assets',
    label: 'Marketing Assets',
    icon: 'photo_library',
    href: 'marketing-assets.html',
    area: 'account',
    src: ['js/marketing-assets-flow.js'],
    rules: [
      {
        title: 'Filtering auto-expands the tree',
        how: 'Search and type filters are combined by <code>filtering()</code>; while either is active every folder that contains a match is force-opened. <code>subtreeMatches()</code> keeps a file only if the name matches <strong>and</strong> its type passes, but a folder whose own name matches a text search reveals all of its children.',
      },
      {
        title: 'Folders always sort above files',
        how: '<code>sortChildren()</code> splits folders from files first, then sorts each group by <code>state.sortKey</code> (<code>name</code>, <code>size</code> or <code>date</code>) in <code>state.sortDir</code>. Folder size and date are rolled up from their children by <code>rollup()</code>.',
      },
      {
        title: 'Only images preview',
        how: '<code>fileMeta().previewable</code> allows png, jpg, jpeg, gif, webp and svg; everything else downloads. Filenames matching <code>/DO NOT USE/i</code> render with <code>.ma-name--warn</code> so restricted lockups are visually flagged in the list.',
      },
      {
        title: 'Replies carry real download buttons',
        how: '<code>window.__wiseMarketingReply(intent)</code> builds the narration <em>and</em> embeds <code>.ma-do-chip</code> buttons for the exact files just discussed; a document-level delegate on <code>[data-ma-do]</code> runs the preview, open or download. <code>window.__wiseMarketingIntent(intent)</code> opens the matching folder on the surface.',
      },
    ],
  },
  {
    id: 'non-upf-dashboard',
    label: 'Non-UPF Dashboard',
    icon: 'dashboard',
    href: 'non-upf-dashboard.html',
    area: 'portfolio',
    src: ['js/non-upf-dashboard-flow.js'],
    rules: [
      {
        title: 'Stat cards are the table filter',
        how: 'Clicking a <code>[data-adm-vf]</code> card calls <code>setNonUpfStatus(key)</code> against the <code>STATUSES</code> keys (<code>pre_qualified</code>, <code>action</code>, <code>pending_att</code>, <code>att_complete</code>, <code>pending_pay</code>, <code>ineligible</code>, <code>verified</code>) and replays its count-up. Clicking the active card again clears the filter.',
      },
      {
        title: 'Search matches name and UPC only',
        how: '<code>productMatches()</code> combines the lowercase query against name + UPC with the status filter. The brand and list controls exist in the popover but are not applied — a known gap, not a subtlety.',
      },
      {
        title: 'Row actions navigate with context',
        how: '<code>runAction()</code> builds <code>viewHref(upc)</code> and <code>viewHref(upc, &#39;edit&#39;)</code> into <code>view-product.html</code>, <code>verifyHref()</code> into <code>verification.html</code>, and <code>duplicateEditHref()</code> into <code>add-product.html?mode=edit&amp;dup=1</code>. Each also pushes a narration into the chat via <code>pushChat()</code>.',
      },
      {
        title: 'Table layout is remembered',
        how: '<code>nonupf-table-view</code> stores <code>&#39;cards&#39;</code> or <code>&#39;rows&#39;</code>; <code>setViewMode()</code> toggles <code>.adm-table--cards</code>. Clicking any chart card calls <code>replayCharts()</code>, which resets the arcs and bars and re-runs the entrance animation with its count-ups.',
      },
    ],
  },

  /* ══════════════════ WISEcodeAI ══════════════════ */
  {
    id: 'wiseai',
    label: 'WISEcodeAI chat (every surface)',
    icon: 'forum',
    href: 'wiseai.html',
    area: 'ai',
    src: ['js/wiseai-chat.js', 'js/wiseai-dock.js', 'js/agent-overview.js', 'js/wise-library-store.js'],
    note: 'Every chat module in the app shares this code and must look and behave identically. wiseai.html is the reference.',
    rules: [
      {
        title: 'One engine, many hosts',
        how: '<code>mountWISEcodeAIChat(rootEl, opts)</code> builds the whole chat and returns <code>{ addUser, addWISEcodeAI, respond, sendIntent, setIntents, reset, … }</code>. Agent pages never re-implement it — <code>setupWISEcodeAIDock()</code> spreads the shared <code>WISEAI_DOCK_PARITY</code> defaults under each page\u2019s config, so a page can override a default but cannot drift into a bespoke variant.',
      },
      {
        title: 'Every answer takes the traced path',
        how: 'Chip clicks, typed matches, host <code>chat.respond()</code> calls and mirrored surface actions all funnel through <code>respondWithTrace()</code>, which runs <code>runReasoningTrace()</code> and then <code>addWISEcodeAI()</code>. Host <code>onReply</code> hooks fire in <code>onTraceDone</code> so preview cards land with the answer. The first Output pane of a conversation stays closed until that reply has finished typing (<code>onReplyDone</code>) — no empty helix placeholder while the transcript is still working.',
      },
      {
        title: 'Streaming is paragraph by paragraph',
        how: '<code>typeInTranscript()</code> splits the answer with <code>collectTranscriptParas()</code> and reveals each unit on a 300ms gap. The order is fixed: <strong>paragraphs → thumbs/meta row → intent chips</strong>. Word-by-word typing and the old pulsating three-dot loader are regressions, not alternatives.',
      },
      {
        title: 'The thinking trace has three parts',
        how: 'The <strong>helix</strong> (<code>makeTraceHelix()</code>) twists under the owl while thinking, then disappears when the summary lands; the <strong>milestones</strong> are the keys the trace walks through one at a time; the <strong>glob</strong> is the subdued narration under the active key. The ⋯ <em>Response streaming</em> control picks <code>full</code> (steps + globs), <code>steps</code> or <code>final</code>, and resets to <code>full</code> on every load.',
      },
      {
        title: 'Typing a chip\u2019s words plays that chip',
        how: '<code>matchIntentFromText()</code> first tries a full-phrase match against a chip\u2019s <code>ask</code> or <code>label</code>, then falls back to stop-word-filtered token overlap across <code>ask</code>, <code>label</code> and the intent id. A match routes through <code>sendIntent()</code> — identical to clicking the chip.',
      },
      {
        title: 'A transcript never dead-ends',
        how: '<code>applyTopicFollowups()</code> guarantees closing chips, in priority order: the chip\u2019s own <code>nextIntents</code> or the host\u2019s <code>followups</code> map, then leftover unused chips from the current set, then <code>resolveFollowupIntents()</code> scoring the surface catalog against the live thread. <code>parkInlineChips()</code> plus a MutationObserver keep them last even if the host appends lines. Mid-turn status cards (<code>trailChips: false</code>) are the only exception.',
      },
      {
        title: 'The composer is unlocked',
        how: 'There is no lock icon and no readonly input unless a host explicitly passes <code>placeholderLock: true</code>. Typing is live, Enter submits, and the first keystroke fires <code>onEngage()</code> to dismiss the welcome.',
      },
      {
        title: 'Helix background on at 20%',
        how: 'The welcome background animation defaults ON (<code>wise:chat-bg-anim</code>) to the published <strong>Scene</strong> pose (<code>BGANIM_PUBLISH_POSE</code>: 3D look, 50% opacity, reverse spin, pulse beads). Styles are <code>helix</code>, <code>helix-ten</code> and <code>orbit</code>. The chat ⋯ menu’s Thick slider is strand weight; Depth is 3-D pop (near loops forward, far loops fading). This is separate from the per-turn trace helix, which always runs.',
      },
      {
        title: 'File to Library puts the live thread on the Library shelf',
        how: 'The three-dot <em>File to Library</em> row expands the folder list inside the Conversation menu. Picking a folder (or Library, or New folder) first saves the thread into History, then copies a card onto that shelf. Re-filing the same thread updates that card and can move it. An empty welcome cannot be filed. Opening the card on the Library page restores the transcript in the docked chat.',
      },
      {
        title: 'History and Turns are docked drawers',
        how: 'The three-dot <em>History &amp; Projects</em> switch reveals the History module as a sticky drawer on the chat\u2019s <strong>left</strong>; <em>Turns</em> docks on the <strong>right</strong>. History starts visible only on <code>pages/wiseai.html</code> (<code>historyBreakoutHidden: false</code>), collapsed to the icon rail; every other surface tucks it on load. Turns always starts tucked. Neither is an in-chat overlay. History persists per surface under <code>wise-chat-history:{surface}</code>, capped at 60 threads.',
      },
      {
        title: 'Surface actions mirror into the thread',
        how: 'Each board gets a chat handle from <code>createChatBridge()</code> and exports it as <code>set*Chat</code> (<code>setDashChat</code>, <code>setGrasChat</code>, <code>setInvoicesChat</code>, …). <code>pushChat()</code> then adds the user line and calls <code>chatApi.respond()</code> — the streamed path, not a raw paste. Anything that happens in the module beside the chat must read as though the assistant did it.',
      },
      {
        title: 'onIntent\u2019s return value decides who narrates',
        how: 'Return <strong>true</strong> from <code>onIntent</code> and the dock stays silent because the host owns the narration (or the page is navigating away); return <strong>false</strong> and the dock posts the user line plus the <code>intentReplies</code> entry. Getting this backwards is what produces a double reply.',
      },
      {
        title: 'The token read-out is illustrative',
        how: 'With <code>activity: true</code>, the &ldquo;…&rdquo; under the input opens a hover read-out of this-turn and conversation tokens, cache share and cost. <code>accrueTurn()</code> synthesizes the figures and prices them at <code>tokIn/1e6*0.9 + tokOut/1e6*4.5</code> — a demonstration of the surface, not real billing. It is not the edge landmark rail — that is the activity strip.',
      },
      {
        title: 'The activity strip marks transcript landmarks',
        how: '<code>chat-activity-strip.js</code> paints a 3px rail on the chat\u2019s <strong>left</strong> edge by default (right is opt-in from the \u22ef menu or Appearance). Gold ticks are outputs, green are sources, amber are database switches. Multi-version outputs draw a stacked pair, never a count. A brand-blue tab with a tiny up-triangle always sits at the bottom of the rail; click it to jump to the top of the last answered prompt. Click a landmark tick to scroll that row into view and flash it. Hover widens the tab and shows the turn ID.',
      },
      {
        title: 'Every answer carries copy, thumbs, and a more menu',
        how: '<code>feedbackRowHtml()</code> sits under the last paragraph, before intent chips. Copy flashes Copied. Accurate / Not accurate each open a reason popover; submitting posts a follow-up turn in the thread. The \u22ef spills Re-run in new chat, Edit in new chat, Fork a turn, File to folder (the Library folder picker), and the turn ID, then a divider and the token read-out for that answer (in / out / cached / cost / duration / ops / tools), frozen to that message. The timestamp (clock \u2194 relative) sits immediately right of that three-dot. Hover uses the shared theme-aware tip card, never a native title bubble and never a second always-dark card.',
      },
      {
        title: 'Output chips preview the sticky pane',
        how: 'When a turn opens Results or Visuals, <code>surfaceBlock()</code> also drops a <code>.sc-surface-card</code> into the transcript: a 52px snapshot of that output beside its name. Tapping the card re-opens the sticky Output module on the right. The chip is posted mid-turn with <code>trailChips: false</code> so follow-up intent chips still land on the actual answer.',
      },
      {
        title: 'Every output is versioned, and every version is the same size',
        how: 'A compact <code>vN</code> badge rides every thumbnail — including the first pass. Redo the same output (same version key) and the chip stacks every version at that same 52px, oldest first, newest raised. Hover fans the stack; the version currently open on the right gets a stronger ring. The sticky Output rail uses the same 52px thumb and the same <code>vN</code> badge so the two never drift.',
      },
      {
        title: 'All versions appear as chips in the Output module',
        how: '<code>insertAllVersionSlides()</code> writes each version as its own pane slide. A redo that seeded v1/v2 then surfaced v3 still lands all three in the rail. Tapping a stacked thumb activates that slide rather than swapping content in place, so the transcript stack and the Output chips stay in lock-step.',
      },
    ],
  },
  {
    id: 'report-builder',
    label: 'Report builder',
    icon: 'description',
    href: 'wiseai.html#report',
    area: 'ai',
    src: ['pages/wiseai.html', 'js/generated-reports.js', 'pages/reformulation.html'],
    note: 'The nested drawer that assembles plus-selected outputs into a named, shareable report. Reformulation hosts the same drawer off section pluses.',
    rules: [
      {
        title: 'Plus-select in the Output titledrop builds the pick list',
        how: 'The Output title dropdown keeps a <code>titledropSelected</code> set of keys from <code>titledropKey(block, i)</code> (the block id, or <code>idx:i</code>). The plus column toggles a pick; the check survives closing the pop. The footer stays hidden until at least one pick, then reads <strong>Generate Report</strong> or <strong>Generate Report (n)</strong>.',
      },
      {
        title: 'Generate Report clones the painted outputs',
        how: '<code>generateReportFromTitledrop()</code> filters the unified pane by that set and calls <code>openReportPane(blocks)</code>. Each pick becomes a <code>.wa-rpt-item</code>. <code>nodesForReport()</code> prefers the live slide\u2019s SVG / bar fills so the report is not an empty card; unbooted slides fall back to the stored surface HTML.',
      },
      {
        title: 'The Report is a nested sticky drawer, never fill',
        how: '<code>#wa-report</code> sits at <strong>z-index 0</strong>, the same height as Output, tucked off that pane. It is marked <code>data-no-fill-default</code>; <code>openReportPane()</code> forces width tier 0 so it never inherits Output\u2019s fill. Reformulation\u2019s <code>#rf-report</code> is the same drawer.',
      },
      {
        title: 'Items are editable, swappable, and deletable',
        how: 'The report name and each chart title are contenteditable. The default name is the pick count (\u201cTwo Outputs\u201d) until <code>dataset.userNamed</code> is set. Each item has an annotation field and a \u22ef for Rename, Swap output (the conversation\u2019s other outputs via <code>reportCatalog()</code>), and Delete.',
      },
      {
        title: 'Save writes the capped generated-reports store',
        how: '<code>persistGeneratedReport()</code> calls <code>saveGeneratedReport()</code> into <code>wise-generated-reports</code> (at most 40, upsert by id). <strong>Save or Share Report</strong> persists, then opens Share mounted <em>inside</em> <code>#wa-report</code> \u2014 same form as chat Share, scoped to the report name and its charts. \u22ef Export as PDF adds <code>html.wa-print-report</code> and prints the pane.',
      },
      {
        title: 'Saved reports land on the Reports shelf',
        how: '<code>reports.html</code> hydrates from the same store. A builder report appears there as a poster; filed into the Library it becomes a Library card. App search can reopen one through <code>wise-search-open-report</code>.',
      },
      {
        title: 'Reformulation pluses sections, not Output rows',
        how: 'Each Reformulation section title carries <code>.rf-rpt-plus</code>. Picked sections light the same Generate Report foot and open <code>#rf-report</code> \u2014 same item rename / swap / delete, same store as WISEcodeAI.',
      },
    ],
  },
  {
    id: 'conversation-library',
    label: 'Library',
    icon: 'auto_stories',
    href: 'conversation-library.html',
    area: 'ai',
    src: ['pages/conversation-library.html', 'js/agent-overview.js', 'js/wise-library-store.js'],
    rules: [
      {
        title: 'Conversations filed from chat appear on the shelf',
        how: 'Items written by the chat\u2019s <em>File to Library</em> row hydrate as cards on the grid, already sitting in the folder that was picked (or unfiled on the shelf). They use the same folder drag, copy, and link menus as the rest of the shelf. Clicking a filed chat restores it in the docked WISEcodeAI chat.',
      },
      {
        title: 'Chips apply real filters',
        how: '<code>window.__wiseLibraryIntent(intent)</code> applies the filter on the grid and syncs the score cards and funnel; the chat can only offer intents the module can actually perform, so the chip list is kept in lock-step with the type and scope cards.',
      },
      {
        title: 'Narration is count-aware',
        how: '<code>window.__wiseLibraryReply(intent)</code> returns a reply that includes the live result count. The static <code>LIBRARY_WISEAI_REPLIES</code> entries are only a fallback for when the page hook has not mounted yet.',
      },
    ],
  },
  {
    id: 'ingredient-browser',
    label: 'Ingredient Browser',
    icon: 'science',
    href: 'ingredient-browser.html',
    area: 'ai',
    src: ['pages/ingredient-browser.html'],
    rules: [
      {
        title: 'Filters are independent dimensions',
        how: '<code>state</code> holds <code>q</code>, <code>gras</code>, <code>cat</code>, <code>sub</code>, <code>pl</code>, <code>proc</code>, <code>veg</code>, <code>usa</code>, <code>eua</code> and a <code>flags</code> Set. Each dimension narrows independently, and selected flags must <strong>all</strong> be present on a row. Matching reads the <code>data-*</code> attributes on <code>.ib-trow</code>.',
      },
      {
        title: 'Score cards and selects stay in sync',
        how: 'GRAS cards (<code>[data-gras]</code>) and processing-level cards (<code>[data-pl]</code>) each toggle one dimension and push the value into the matching <code>&lt;select&gt;</code>, so the popover and the cards can never disagree about what is filtered.',
      },
      {
        title: 'Chips drive the on-page controls',
        how: '<code>window.__ibIntent(intent)</code> focuses the search box for <code>search_ingredient</code>, and for every other intent opens the funnel popover pre-focused on the matching select. The chat explains the filter and the page performs it.',
      },
      {
        title: 'The footer count is the registry, not the demo',
        how: 'The table renders the <code>IB_DATA</code> demo rows while the footer reads &ldquo;of <code>TOTAL</code>&rdquo; (8,658) — the registry size the browser stands in for. Do not wire a count off <code>IB_DATA.length</code> and assume it is the whole registry.',
      },
    ],
  },

  /* ══════════════════ Reformulation ══════════════════ */
  {
    id: 'reformulation',
    label: 'Reformulation Studio',
    icon: 'auto_fix_high',
    href: 'reformulation.html',
    area: 'reform',
    src: ['pages/reformulation.html', 'js/reformulation-store.js'],
    rules: [
      {
        title: 'Everything scores per 100 kcal',
        how: '<code>compute()</code> normalizes every input with <code>P(v) = (v / calories) * 100</code> before applying debits and credits. The serving / 100 kcal / 100 g switch changes the <em>display</em> basis only — it never changes the score.',
      },
      {
        title: 'Debits and credits have fixed thresholds',
        how: 'Saturated fat ≥2 g/100 kcal is −2 and ≥1 is −1; sodium ≥240 mg is −2 and ≥120 is −1; added sugar ≥12 is −3, ≥6 is −2, ≥2 is −1; any trans fat is −1; one or more additives is −1. Fiber earns +1/+2/+3 at the <code>FIBER_TIERS</code> breakpoints, vitamins up to +3, whole grain +1 on the G algorithm.',
      },
      {
        title: 'Two conditions disqualify outright',
        how: 'Added sugar above <strong>40% of calories</strong> (<code>dq-sugar</code>) or <strong>two or more additives</strong> (<code>dq-additives</code>) forces the result to zero stars regardless of the net score. Recommendations always list the disqualifiers first.',
      },
      {
        title: 'Stars come from three thresholds',
        how: '<code>STAR_THRESHOLDS = [1, 4, 7]</code> — a net of 7+ is three stars, 4+ is two, 1+ is one. The algorithm variant (<code>G</code>, <code>M</code>, <code>F</code>, <code>V</code>) shifts individual debits before that comparison; <code>algoPick: &#39;auto&#39;</code> uses the product\u2019s own baseline algorithm.',
      },
      {
        title: 'Applying a move is undoable',
        how: '<code>applyEffect(id)</code> snapshots the keys it is about to change, so the row turns into <strong>Undo</strong>; <code>undoEffect(uid)</code> restores that snapshot and clears any later applies that conflict with it. Nothing mutates the baseline.',
      },
      {
        title: 'The store is the cross-page contract',
        how: '<code>WISEReformulationStore</code> persists to <code>wise-reformulations</code> and indexes each record under its UPC, its id and its name so the portfolio, product and label pages can all find it. <code>remove()</code> deletes every key for that record, which is what makes readers fall back to the printed label.',
      },
      {
        title: 'Sliders debounce into the chat',
        how: 'A slider change waits 700ms before calling <code>respond()</code> with a &ldquo;Rescoring&rdquo; milestone, so dragging produces one narrated turn instead of a stream of them.',
      },
      {
        title: 'The report builder is the same nested drawer as WISEcodeAI',
        how: 'Each section title carries a plus (<code>.rf-rpt-plus</code>). Picked sections light the Generate Report foot; that opens <code>#rf-report</code> as a tertiary sticky drawer \u2014 same four-tier rail, same item rename / swap / delete, same <code>wise-generated-reports</code> store as <code>#wa-report</code>.',
      },
    ],
  },

  /* ══════════════════ Reports & Analytics ══════════════════ */
  {
    id: 'reports',
    label: 'Reports',
    icon: 'description',
    href: 'reports.html',
    area: 'report',
    src: ['pages/reports.html', 'js/generated-reports.js', 'js/agent-overview.js'],
    rules: [
      {
        title: 'Generated reports are a capped store',
        how: '<code>wise-generated-reports</code> holds at most <strong>40</strong> records sorted by <code>createdAt</code> descending. <code>saveGeneratedReport()</code> upserts by id and preserves the original <code>createdAt</code> on update. If the key has never been written, four seed reports are created so the shelf is never empty. New records are written by the Report builder on WISEcodeAI and Reformulation \u2014 this shelf is the reading surface.',
      },
      {
        title: 'Three ways to open a report',
        how: 'The URL <code>?gen=&lt;id&gt;</code>, the sessionStorage handoff <code>wise-search-open-report</code>, and the <code>wise:open-generated-report</code> event all land in <code>openGeneratedReportView(id)</code>. It stashes the shelf markup in <code>_rpGenRestore</code> so <strong>Back</strong> restores it without a reload.',
      },
      {
        title: 'Report chips open on the surface',
        how: 'The dock\u2019s <code>open_upf_report</code>, <code>open_gras_report</code> and <code>open_insights_report</code> chips call <code>openDashReport()</code> against <code>#agent-main-scroll</code> with <code>backLabel: &#39;Back to reports&#39;</code>, and take their narration from <code>dashReportChatReply()</code> so it reflects the report\u2019s actual state.',
      },
      {
        title: 'Locked reports are honest placeholders',
        how: 'Cards marked <code>is-locked</code> (Portfolio and Product GRAS, Insights, Nutrient Quality, Health Outcomes) are Studio-gated. Their waitlist buttons are presently decorative — there is no handler behind <code>rp-waitlist</code>.',
      },
      {
        title: 'The page opens with the nav collapsed',
        how: '<code>bootstrapAppNavPage()</code> calls <code>collapseNavRail()</code> for <code>navId === &#39;reports&#39;</code> so the chat and the report modules get the full row width, without writing the user\u2019s rail preference.',
      },
    ],
  },
  {
    id: 'report-guiding-stars',
    label: 'Guiding Stars Report',
    icon: 'star',
    href: 'report-guiding-stars.html',
    area: 'report',
    src: ['pages/report-guiding-stars.html'],
    rules: [
      {
        title: 'Segments are nested, not exclusive',
        how: '<code>activeFilter</code> takes <code>all</code>, <code>zero</code>, <code>quick</code>, <code>near</code>, <code>stuck</code> or <code>earn</code>, where <code>zero</code> is the union of quick + near + stuck. Scorecards, the search box and the sortable columns all narrow the same <code>VIEW</code> copy of the data.',
      },
      {
        title: 'The opener is preloaded',
        how: '<code>openConversation()</code> posts the executive summary with <code>instant: true</code> so the report reads immediately on arrival; every later reply animates normally.',
      },
      {
        title: 'Chips move the report, not just the thread',
        how: 'Each of the five chips either calls <code>setFilter()</code> or scrolls to a section (<code>#sec-competitive</code>, <code>#sec-distribution</code>) before responding. Free text is regex-matched onto the same behaviors by <code>gsSend()</code>.',
      },
    ],
  },
  {
    id: 'analytics-types',
    label: 'Analytics Types',
    icon: 'insights',
    href: 'analytics-types.html',
    area: 'report',
    src: ['pages/analytics-types.html', 'js/dashboard-home.js'],
    rules: [
      {
        title: 'Every chart replays on click',
        how: '<code>setupChartReplay()</code> attaches one capture-phase click handler and routes the target through <code>replayChartFromTarget()</code> to the right re-animator — donut, radar, scatter, bar, pillar card or counter. This page is the reference for the app-wide &ldquo;click a chart, it re-animates&rdquo; rule.',
      },
      {
        title: 'Page-specific charts beat the shared handler',
        how: 'The polar area, treemap and metric-highlight rows register their own capture-phase listeners and call <code>stopImmediatePropagation()</code> so their bespoke replay wins over the shared dashboard handler on the same element.',
      },
      {
        title: 'First animation waits for visibility',
        how: 'Each chart section runs its entrance once, triggered by an IntersectionObserver rather than on load, so a chart below the fold still animates when the reader reaches it.',
      },
      {
        title: 'Printing snaps charts to final state',
        how: 'The <code>wise:finalize-charts</code> event and the <code>beforeprint</code> handler force polar wedges and metric rows to their finished geometry — without it, off-screen charts print collapsed at their zero state.',
      },
      {
        title: 'The chat dock is deliberately absent',
        how: '<code>&lt;body data-hide-wiseai&gt;</code> makes <code>setupWISEcodeAIDock()</code> return early. This is the sanctioned opt-out for a page that is purely a chart catalog.',
      },
    ],
  },

  /* ══════════════════ Verification ══════════════════ */
  {
    id: 'verification',
    label: 'Non-UPF Verification',
    icon: 'verified',
    href: 'verification.html',
    area: 'verify',
    src: ['js/verification-flow.js'],
    rules: [
      {
        title: 'Three steps, each gated by the last',
        how: '<code>STEPS</code> is <code>select → attest → payment</code>. Continue unlocks only when <code>selectedCount() &gt; 0</code>; the payment step requires <code>state.attested === true</code>; and <code>process-payment</code> runs only when <code>state.vsa === true</code>. Completed steps stay clickable via <code>data-goto</code>.',
      },
      {
        title: 'Deselecting the last SKU resets attestation',
        how: 'Removing the final selected food on the attest step sets <code>state.attested = false</code> and returns to <code>select</code> — you cannot carry an attestation across an empty selection.',
      },
      {
        title: 'Pricing is per SKU',
        how: '<code>PRICE_PER_ITEM = 99</code>, so <code>subtotal() = selectedCount() * 99</code> and <code>total() = max(0, subtotal() - state.discount)</code>. The billing-plan dropdown is display only; the total always uses the per-item price. The coupon field has no valid codes by design.',
      },
      {
        title: 'The progress pane appears with the first selection',
        how: '<code>#vf-progress-pane</code> stays hidden until something is selected, then renders the fields for the current step — and on payment, itemizes the billable SKUs.',
      },
      {
        title: 'Chips drive the wizard, not a copy of it',
        how: '<code>onIntent</code> calls the flow\u2019s own functions for <code>select_all</code>, <code>go_attest</code>, <code>do_attest</code>, <code>go_payment</code> and <code>pay_now</code>, returning <code>false</code> so <code>intentReplies</code> narrates the resulting state. <code>pay_now</code> refuses unless there is a selection and an attestation.',
      },
    ],
  },
  {
    id: 'gras-verification',
    label: 'GRAS Verification',
    icon: 'shield',
    href: 'gras-verification.html',
    area: 'verify',
    src: ['js/gras-verification-flow.js'],
    rules: [
      {
        title: 'Five screens, one state field',
        how: '<code>state.screen</code> moves between <code>report</code> (default), <code>wizard</code>, <code>confirm</code>, <code>submissions</code> and <code>result</code> through <code>goto()</code>. The progress pane exists only while the screen is <code>wizard</code>.',
      },
      {
        title: 'Only unclear ingredients can start a wizard',
        how: '<code>statusOf(id)</code> returns <code>verified</code>, <code>pending</code> or <code>unclear</code>, and <code>startVerify()</code> proceeds only for <code>unclear</code> — anything else routes to the submissions list instead.',
      },
      {
        title: 'Attestation is the only hard gate',
        how: '<code>canProceed()</code> returns true for every step except step 2, where all three checkboxes (<code>state.attest.a/b/c</code>) must be ticked. The documentation step tracks completeness through <code>requiredFilled()</code> for the progress pane but does not block Continue.',
      },
      {
        title: 'Required documentation varies by pathway',
        how: 'On top of an uploaded file, <code>requiredFilled()</code> wants <code>femaNumber</code> for FEMA, <code>panelChair</code> for a self-affirmed panel, <code>grnNumber</code> for a GRN, or <code>supplierName</code> for supplier documentation — whichever <code>DOC_TYPES</code> pathway was picked.',
      },
      {
        title: 'Coverage recomputes from verified ingredients',
        how: 'GRAS product coverage is <code>min(PORTFOLIO_TOTAL, BASE_GRAS_PRODUCTS + Σ verified ingredient product counts)</code> against a portfolio of 40, so verifying one ingredient visibly moves the portfolio number.',
      },
      {
        title: 'Every UI action mirrors into the chat',
        how: '<code>mirrorUIAction()</code> wraps <code>onAction</code> so each on-surface click posts its user label and reply through <code>pushChat()</code>. Chips deliberately call the flow functions <em>directly</em> instead of going through <code>onAction</code>, which would double-post.',
      },
    ],
  },

  /* ══════════════════ Admin ══════════════════ */
  {
    id: 'all-modules',
    label: 'All Modules',
    icon: 'apps',
    href: 'all-modules.html',
    area: 'admin',
    src: ['js/all-modules-flow.js', 'js/dev-ready-data.js', 'js/module-directory-data.js'],
    rules: [
      {
        title: 'Every section starts collapsed',
        how: '<code>setupAccordion()</code> wraps everything after each <code>.mi-module-head</code> in a <code>.mi-acc-body</code> and collapses it on <strong>every</strong> load — the page is a high-level index first. Expanded state is in-session only and is never restored. Clicks inside <code>.panel-controls</code> or <code>.dsc-ready</code> do not toggle the section.',
      },
      {
        title: 'WIP Ready is a two-level tree',
        how: '<code>buildDevReadyTree()</code> registers each module\u2019s children (directory areas, tables, motion items, icon groups, design groups, components). A module switch turns itself on only when every child is ready, and clicking an incomplete one opens a two-step verify modal rather than toggling silently. App Logic is a leaf — it has a module switch and no per-page children. Intent Chip Logic is an audit index and has no WIP Ready chrome. Module Directory and Table Gallery show WIP Ready only.',
      },
      {
        title: 'Only the diff from the seed is stored',
        how: 'WIP Ready and AI Ready each have their own baseline seed. The AI switch reads <strong>Not for AI</strong> when off (the default, pink) and <strong>AI Ready</strong> in green when on. When more than one part is ready but not all, Not for AI turns a lighter orange. localStorage holds just the overrides that differ from that seed. On the local livereload origin a toggle writes the matching seed file so the next commit / Ubuntu pull ships the same flags. Module Directory and Table Gallery have WIP Ready only. Chrome catalog cards (toasts, switches, dialogs, nav items, and the other <code>ai: false</code> entries) keep WIP Ready and are left out of the AI count. Only the Component Library AI switch shows a k/n count.',
      },
      {
        title: 'Re-evaluate crawls once a day',
        how: '<code>wirePageReeval()</code> compares <code>readReevalStore().day</code> to today\u2019s local date and runs the crawl on load, on tab focus and at midnight; the button forces it with <code>reason: &#39;manual&#39;</code>. It walks the project for HTML / JS / CSS / Python, probes every page, and any live page missing from <code>MODULE_SECTIONS</code> is added to an <em>Unaccounted</em> section. It is a no-op on <code>file://</code>.',
      },
      {
        title: 'The directory never ships a dead link',
        how: '<code>runLinkValidation()</code> probes every unique href with a HEAD request (falling back to a ranged GET where HEAD is refused) and flags failures right on the card. It re-runs when the tab regains focus, so a renamed page is caught without a reload.',
      },
      {
        title: 'Module ⋯ menus fire the real controls',
        how: '<code>runModuleAction()</code> resolves each menu action to a click on the module\u2019s own toolbar button or a <code>clearInput()</code> on its own search field. The menu never re-implements a behavior, so it cannot drift from the toolbar.',
      },
      {
        title: 'Quick-nav opens before it scrolls',
        how: 'A <code>.dsc-jump</code> tile calls <code>expandAccordionSection()</code> first and only then scrolls, so jumping to a collapsed section lands on content rather than a closed header. A matching <code>#hash</code> on load does the same.',
      },
    ],
  },
  {
    id: 'progress-log',
    label: 'Progress Log',
    icon: 'timeline',
    href: 'progress-log.html',
    area: 'admin',
    src: ['pages/progress-log.html', 'js/progress-log-eval.js'],
    rules: [
      {
        title: 'Today is always on the board',
        how: '<code>syncBoardLog()</code> loads today from <code>wise-progress-log-live-day-v1</code> or creates an empty live day, and inserts gap days so the calendar never skips a date.',
      },
      {
        title: 'Evaluation is due once per local day',
        how: '<code>shouldEvaluateAll()</code> is true on a new local day, when notes need a refresh, or when there has never been an evaluation. It is checked on boot, hourly, at midnight, on tab focus, and on bfcache restore.',
      },
      {
        title: 'Changes are diffed against a daily baseline',
        how: '<code>crawlPage()</code> fetches each page and runs the <code>FEATURE_SIGNALS</code> regex inventory plus named component markers to produce categorized sentences (features, components, logic, UX, UI), then diffs against the start-of-day snapshot held in <code>wise-progress-log-crawl-v2</code>. The v1 key is migrated on read.',
      },
    ],
  },
  {
    id: 'accessibility-review',
    label: 'Accessibility Review',
    icon: 'accessibility_new',
    href: 'accessibility-review.html',
    area: 'admin',
    src: ['pages/accessibility-review.html'],
    rules: [
      {
        title: 'Two audits run side by side',
        how: '<code>auditDoc(doc)</code> checks each page for lang, title, viewport, alt text, named controls and labelled fields and grades it with <code>letterFor(pct)</code>; separately the token audit parses <code>pages/wise.css</code> for the <code>:root</code> and <code>html.dark</code> blocks and contrast-checks the palette.',
      },
      {
        title: 'Re-evaluate reads the real stylesheet',
        how: '<code>reevaluate()</code> re-fetches <code>wise.css</code> with a cache-buster, injects the parsed values as a <code>#source-tokens</code> override and re-renders — so the swatches reflect what is actually committed, not what is cached. It also runs automatically on load.',
      },
      {
        title: 'Pages are re-audited while you watch',
        how: '<code>auditAllPages()</code> polls every <code>PAGE_POLL_MS</code> (20s) while the tab is visible, and re-runs on <code>visibilitychange</code> and <code>focus</code>, tracking a content signature per page so unchanged pages are cheap. It requires http(s) — <code>file://</code> shows a warning instead.',
      },
      {
        title: 'The verdict is published for the nav',
        how: '<code>publishA11yVerdict()</code> writes a per-theme pass / warn / fail into <code>wise-a11y-verdict</code>, which is what lets other surfaces badge the audit without re-running it.',
      },
    ],
  },
  {
    id: 'page-gallery',
    label: 'Page Gallery',
    icon: 'browse_gallery',
    href: 'page-gallery.html',
    area: 'admin',
    src: ['js/page-gallery.js'],
    rules: [
      {
        title: 'Cards show the live page',
        how: 'Each card lazy-loads the real screen in a scaled iframe when it scrolls into view (at most three at a time). A leftover screenshot sits underneath as a placeholder and fades out once the preview lands. Cards that leave the wall unload so the gallery does not boot every page at once. Re-evaluate remounts the visible previews.',
      },
      {
        title: 'Screenshots fall back down a chain',
        how: '<code>bindShot()</code> tries each candidate in <code>shotCandidates(href, isDark())</code> — themed gallery thumbnails first, then live page paths — and hides the image once every candidate has errored, leaving the live preview to carry the card.',
      },
      {
        title: 'Order and dimming persist',
        how: 'Drag order is stored as an href array in <code>wise-page-gallery-order</code>; the eye button writes to <code>wise-page-gallery-dimmed</code>. Neither affects the underlying catalog.',
      },
      {
        title: 'Close prefers going back',
        how: '<code>closeGallery()</code> uses <code>history.back()</code> when the referrer is the same-origin All Modules page, otherwise navigates to <code>all-modules.html#mi-directory</code> — so the directory reopens at the section you left. Escape does the same.',
      },
      {
        title: 'The gallery is not a module',
        how: '<code>page-gallery.html</code> is deliberately kept out of <code>MODULE_SECTIONS</code> and listed in <code>OMITTED_PAGES</code>, so Re-evaluate does not file it as unaccounted and the gallery never cards itself.',
      },
      {
        title: 'Re-evaluate keeps the list current',
        how: '<code>reevaluateGallery()</code> walks the <code>pages/</code> and repo-root directory listings, probes each HTML file, and adds anything missing — the same Re-evaluate pattern as All Modules, minus the line-count crawl. Opening the gallery (and coming back to the tab) also runs a quiet listing so a newly added page appears without a click. Found extras persist in <code>wise-page-gallery-extras</code>; the last scan stamp lives in <code>wise-pg-reeval</code>.',
      },
    ],
  },
  {
    id: 'admin-boards',
    label: 'Admin boards',
    icon: 'shield',
    href: 'organizations.html',
    area: 'admin',
    src: ['js/organizations-flow.js', 'js/quick-invite-flow.js', 'js/teams-flow.js', 'js/user-management-flow.js', 'js/audit-queue-flow.js', 'js/admin-utils-flow.js'],
    note: 'Organizations, Team, Quick Invite, User Management, Audit Queue and Admin Utilities share one board pattern.',
    rules: [
      {
        title: 'Status chips toggle off',
        how: 'Every board sets its filter with the same idiom — <code>setFilter(s === activeStatus ? null : s)</code> — so clicking the active chip clears the filter instead of re-applying it. Audit Queue is the one board that opens pre-filtered, to <code>open</code>.',
      },
      {
        title: 'Filters are a defaults object',
        how: 'Each board keeps a <code>filters</code> object seeded from <code>FILTER_DEFAULTS</code> (role / email / lockout / waitlist on User Management; action / brand / after / before on Audit Queue) and narrows one dimension at a time, combined with the free-text <code>query</code>.',
      },
      {
        title: 'Row actions mutate and repaint',
        how: 'Actions change the record in place and repaint rows only — <code>resolve(idx)</code> sets an audit to <code>accepted</code>, <code>runAction(&#39;resend&#39;)</code> re-stamps an invite to <code>sent</code> with a fresh timestamp, <code>cancel</code> moves a sent or pending invite to <code>cancelled</code>. None of it is persisted; a reload restores the seed.',
      },
      {
        title: 'Every action narrates into the chat',
        how: '<code>set*Chat(wiseai)</code> hands each board the live dock, and <code>pushChat()</code> posts a narration after the toast — so the transcript reflects what you did on the board, matching the chip-driven direction.',
      },
      {
        title: 'Organizations remembers its metric order',
        how: 'The top metric cards are drag-reorderable and the order persists in <code>wise-org-metric-order</code>. It is the only piece of admin board state that survives a reload.',
      },
    ],
  },

  /* ══════════════════ Account & Support ══════════════════ */
  {
    id: 'profile',
    label: 'My Profile',
    icon: 'account_circle',
    href: 'profile.html',
    area: 'account',
    src: ['js/profile-flow.js'],
    rules: [
      {
        title: 'The form and the chat are one surface',
        how: 'Form edits call <code>applyField()</code> / <code>setUpload()</code> / <code>setAvatar()</code> with <code>source: &#39;form&#39;</code> and mirror into the thread through <code>pushChat()</code>; typed instructions run the same functions from the other direction. Neither path is a special case of the other.',
      },
      {
        title: 'The chat can arm the next message',
        how: '<code>pendingKey</code> arms the next message as a field value and <code>pendingUpload</code> (<code>logo</code>, <code>banner</code>, <code>avatar</code>) arms it as a URL. Resolution order is: explicit verb parse, then armed upload, then armed field, then a save phrase, then a field-name match.',
      },
      {
        title: 'Dirty state is tracked per field',
        how: 'A <code>dirty</code> Set records which keys changed since the last save, so <code>doSave()</code> can narrate exactly what it wrote rather than claiming the whole profile was updated.',
      },
    ],
  },
  {
    id: 'preferences',
    label: 'Preferences',
    icon: 'tune',
    href: 'preferences.html',
    area: 'account',
    src: ['js/preferences-flow.js'],
    rules: [
      {
        title: 'Preferences merge over defaults',
        how: '<code>readPrefs()</code> merges the stored <code>wise-preferences</code> object over <code>DEFAULTS</code>, so adding a new preference does not break an existing user\u2019s saved object.',
      },
      {
        title: 'Theme writes both keys',
        how: '<code>setTheme(dark)</code> writes <code>wise-theme</code> <em>and</em> <code>chat-theme</code>, keeping this page consistent with the Appearance popover. Text size is clamped to 85–130 and applied as <code>--text-scale</code>.',
      },
      {
        title: 'Chips apply the setting immediately',
        how: '<code>onIntent</code> calls the real setters — <code>setTheme(!isDark())</code>, <code>setTextSize(textSize() + 10)</code>, <code>flipToggle(&#39;notif_email&#39;, false)</code>, <code>setSeg(&#39;dock&#39;, &#39;right&#39;)</code> — so asking for a preference change performs it rather than describing where to find it.',
      },
    ],
  },
  {
    id: 'invoices',
    label: 'Invoices',
    icon: 'receipt_long',
    href: 'invoices.html',
    area: 'account',
    src: ['js/invoices-flow.js'],
    rules: [
      {
        title: 'Row actions narrate unless they came from chat',
        how: '<code>runAction(action, id, source)</code> pushes a chat narration only when <code>source !== &#39;chat&#39;</code> — that one guard is what prevents a chip-driven action from posting its reply twice.',
      },
      {
        title: 'Typed status phrases filter the board',
        how: '<code>INVOICES_WISEAI.reply()</code> parses a status out of free text with <code>statusFromText()</code>, calls <code>setInvoiceFilter()</code>, and returns the narration — so &ldquo;show me what\u2019s overdue&rdquo; moves the board, not just the thread.',
      },
    ],
  },
  {
    id: 'api-keys',
    label: 'API Keys',
    icon: 'key',
    href: 'api-keys.html',
    area: 'account',
    src: ['js/api-keys-flow.js'],
    rules: [
      {
        title: 'A secret is shown exactly once',
        how: '<code>finalizeCreate()</code> reveals the full key from <code>randKey()</code> in the creation modal; every later render uses <code>maskFrom(full)</code>. There is no way back to the plaintext, which is the behavior a real key service must have.',
      },
      {
        title: 'Keys live in memory only',
        how: 'The seeded <code>KEYS</code> array is mutated by create and revoke but never persisted — a reload restores the seed. Nothing here writes to localStorage.',
      },
    ],
  },
  {
    id: 'help-docs',
    label: 'Help, Docs, Agents & Alerts',
    icon: 'help',
    href: 'support.html',
    area: 'account',
    src: ['js/help-flow.js', 'js/docs-flow.js', 'js/agents-flow.js', 'js/alerts-flow.js'],
    rules: [
      {
        title: 'One reader, two modes',
        how: 'Docs uses a single <code>currentId</code>: null renders the card grid, a value renders the reading pane. Back simply clears it. Help keeps the analogous <code>openFaqs</code> Set for its accordion.',
      },
      {
        title: 'Chips set the topic, not the answer',
        how: 'Help intents call <code>setTopic()</code> for getting-started, verification and billing; Docs intents call <code>openArticle(intent)</code> when the intent id is itself an article id. The chat narrates and the surface navigates.',
      },
      {
        title: 'Agents carry per-item runtime state',
        how: '<code>ensureState()</code> seeds each agent\u2019s <code>on</code> flag and autonomy level from <code>AUTONOMY = [&#39;Manual&#39;, &#39;Assisted&#39;, &#39;Autonomous&#39;]</code>; <code>setAll(on)</code> is the bulk path the enable-all / pause-all chips use.',
      },
      {
        title: 'Alerts mark read on open',
        how: '<code>openAlert(id)</code> flips <code>read</code>, <code>dismiss(id)</code> removes the item and <code>markAllRead()</code> sets them all. The stream is in-memory, so a reload restores the seeded alerts.',
      },
    ],
  },

  /* ══════════════════ Authentication ══════════════════ */
  {
    id: 'create-account',
    label: 'Create Account',
    icon: 'person_add',
    href: 'create-account.html',
    area: 'auth',
    src: ['js/auth-signup-chat.js'],
    rules: [
      {
        title: 'Signup is a conversation, not a form',
        how: 'The page has no <code>#signup-form</code> — it calls <code>WiseAuthChat.initSignup()</code> and runs a five-macro-step conversational flow in <code>#ac-chat</code>, with an optional setup pane alongside.',
      },
      {
        title: 'The chosen route filters the questions',
        how: 'Answering the route question sets <code>flow.route</code> from <code>ROUTES</code>, and <code>activeFieldKeys()</code> is route-aware — so a path that does not need a field never asks for it.',
      },
      {
        title: 'Finish decides where you land',
        how: '<code>finishFlow(opts)</code> builds the registration object and calls <code>auth.signup(reg)</code>; <code>dest: &#39;overview&#39;</code> goes to <code>auth.overviewUrl()</code> and the default goes to <code>auth.landingUrl()</code>. The &ldquo;dive in now&rdquo; shortcut is <code>finishFlow({ dest: &#39;overview&#39;, quick: true })</code>.',
      },
    ],
  },
  {
    id: 'login',
    label: 'Log in & Forgot Password',
    icon: 'login',
    href: 'login.html',
    area: 'auth',
    src: ['js/auth-forms.js'],
    rules: [
      {
        title: 'Validation is client-side and shallow',
        how: '<code>initLogin()</code> requires a syntactically valid email and a non-empty password, then calls <code>Auth.login({ email })</code> and <code>goLanding()</code>. The SSO buttons log in with a provider-derived identity; the demo button seeds the demo user and marks the walkthrough fresh.',
      },
      {
        title: 'Password reset has no backend',
        how: '<code>initForgot()</code> validates the email, hides the form and shows the <code>#forgot-success</code> banner with the address interpolated. Nothing is sent.',
      },
    ],
  },

  /* ══════════════════ Marketing site ══════════════════ */
  {
    id: 'marketing',
    label: 'Marketing site',
    icon: 'campaign',
    href: '../index.html',
    area: 'marketing',
    src: ['js/marketing-shell.js', 'js/marketing.js'],
    rules: [
      {
        title: 'The shell owns the boot order',
        how: 'Marketing pages set <code>window.__WISE_MKT_SHELL__ = true</code>, which stops <code>marketing.js</code> from auto-booting. <code>marketing-shell.js</code> injects the nav, footer and chat rail first and then calls <code>WiseMarketing.boot()</code>.',
      },
      {
        title: 'Navigation swaps the body, not the page',
        how: 'Internal links to a file in <code>ROUTES</code> are intercepted, fetched, and used to replace <code>#mkt-body-module</code> only — with <code>history.pushState</code> and <code>popstate</code> support. External origins fall through to a normal navigation.',
      },
      {
        title: 'The chat survives every route change',
        how: 'The chat is mounted once and persisted as HTML in <code>wise-mkt-chat-live</code>. A route change calls <code>announceRoute()</code> or <code>setIntents()</code>, so the thread continues with new chips rather than restarting.',
      },
      {
        title: 'The body talks to the chat by attribute',
        how: 'Any <code>[data-chat-intent]</code> (optionally with <code>[data-chat-say]</code>) or any control inside a <code>[data-chat-section="&lt;intent&gt;"]</code> calls <code>chat.sendIntent()</code>. Free text falls back to <code>matchFreeText()</code> against the <code>INTENT_REPLIES</code> catalog.',
      },
      {
        title: 'A signed-in visitor never sees the home page',
        how: 'An inline script on <code>index.html</code> checks <code>wise-auth.loggedIn</code> and, unless <code>?preview=1</code> is set, calls <code>location.replace(&#39;pages/wiseai.html&#39;)</code> before anything renders.',
      },
    ],
  },
];
