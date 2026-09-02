/**
 * Renders the agent overview shell — top bar logo/profile, the menu nav, and
 * the centre panel with the agent's description and child agent cards.
 *
 * The host page only needs to:
 *   - load `pages/agent-page.css`
 *   - set `<body data-agent-id="...">` to a top-level agent id
 *   - mount `<div id="agent-shell-wrap">…</div>` with the slots referenced below
 */

import {
  getAgent,
  getDirectChildren,
  getAppNavNode,
  mountAgentMenu,
  toggleMenuPivot,
  isMenuPivoted,
  setMenuPivot,
} from './agent-menu.js';
import { initLirTooltip } from './lir-tooltip.js';
import { mountTopbar, isMenuFooterAnchor, positionPopoverInMenuPanel, positionPopoverForTopbar, applyMinimalUi, isMinimalUiOn, restoreMinimalUi, applyHeaderFloat, isHeaderFloatOn, restoreFullBleed, applyColorblind, isColorblindOn, pageAppearanceDefault } from './topbar.js';
import { isJamStripOn, applyJamStrip } from './jam-strip.js';
import { buildAppearanceBody, wireAppearancePopover, buildUserMenuBody, performSignOut } from './appearance-menu.js';
import { mountNotificationsPanel } from './notifications-panel.js';
import { setTextSize, applyStoredTextSize } from './text-size.js';

/* Page flows load on demand from the host's `data-nav-id` (or the dashboard
   product id). A static import of every *-flow.js here used to parse invoices,
   verification, All Modules, … on every agent page — All Modules in particular
   could not paint until that whole graph arrived.

   The WISEcodeAI dock is the same: a static import of wiseai-dock.js pulled
   the entire chat stack (history, ask catalog, helix, orbit) before any
   page flow could render. Load it when the dock actually mounts. */
let dashApi = null;
let navFlowMod = null;
let dockApi = null;

async function ensureDockApi() {
  if (dockApi) return dockApi;
  dockApi = await import('./wiseai-dock.js');
  return dockApi;
}

const APP_NAV_FLOWS = {
  verification: {
    title: 'WISE · Non-UPF Verification',
    load: () => import('./verification-flow.js'),
    render: (m) => m.renderVerificationFlow,
    wiseai: (m) => m.VERIFICATION_WISEAI,
  },
  'gras-verification': {
    title: 'WISE · GRAS Verification',
    load: () => import('./gras-verification-flow.js'),
    render: (m) => m.renderGrasVerificationFlow,
    wiseai: (m) => m.GRAS_WISEAI,
    setChat: (m) => m.setGrasChat,
  },
  'marketing-assets': {
    title: 'WISE · Marketing Assets',
    load: () => import('./marketing-assets-flow.js'),
    render: (m) => m.renderMarketingAssets,
  },
  profile: {
    title: 'WISE · My Profile',
    load: () => import('./profile-flow.js'),
    render: (m) => m.renderProfile,
    wiseai: (m) => m.PROFILE_WISEAI,
    setChat: (m) => m.setProfileChat,
  },
  preferences: {
    title: 'WISE · Preferences',
    load: () => import('./preferences-flow.js'),
    render: (m) => m.renderPreferences,
    wiseai: (m) => m.PREFERENCES_WISEAI,
  },
  'api-keys': {
    title: 'WISE · API Keys',
    load: () => import('./api-keys-flow.js'),
    render: (m) => m.renderApiKeys,
    wiseai: (m) => m.API_KEYS_WISEAI,
  },
  invoices: {
    title: 'WISE · Invoices',
    load: () => import('./invoices-flow.js'),
    render: (m) => m.renderInvoices,
    wiseai: (m) => m.INVOICES_WISEAI,
    setChat: (m) => m.setInvoicesChat,
  },
  help: {
    title: 'WISE · Help',
    load: () => import('./help-flow.js'),
    render: (m) => m.renderHelp,
    wiseai: (m) => m.HELP_WISEAI,
  },
  docs: {
    title: 'WISE · Docs',
    load: () => import('./docs-flow.js'),
    render: (m) => m.renderDocs,
    wiseai: (m) => m.DOCS_WISEAI,
  },
  agents: {
    title: 'WISE · Agents',
    load: () => import('./agents-flow.js'),
    render: (m) => m.renderAgents,
    wiseai: (m) => m.AGENTS_WISEAI,
  },
  alerts: {
    title: 'WISE · Alerts',
    load: () => import('./alerts-flow.js'),
    render: (m) => m.renderAlerts,
    wiseai: (m) => m.ALERTS_WISEAI,
  },
  organizations: {
    title: 'WISE · Organizations',
    load: () => import('./organizations-flow.js'),
    render: (m) => m.renderOrganizations,
    wiseai: (m) => m.ORGANIZATIONS_WISEAI,
    setChat: (m) => m.setOrganizationsChat,
  },
  'quick-invite': {
    title: 'WISE · Quick Invite',
    load: () => import('./quick-invite-flow.js'),
    render: (m) => m.renderQuickInvite,
    wiseai: (m) => m.QUICK_INVITE_WISEAI,
    setChat: (m) => m.setQuickInviteChat,
  },
  team: {
    title: 'WISE · Team',
    load: () => import('./teams-flow.js'),
    render: (m) => m.renderTeam,
    wiseai: (m) => m.TEAM_WISEAI,
    setChat: (m) => m.setTeamChat,
  },
  teams: {
    title: 'WISE · Team',
    load: () => import('./teams-flow.js'),
    render: (m) => m.renderTeam,
    wiseai: (m) => m.TEAM_WISEAI,
    setChat: (m) => m.setTeamChat,
  },
  'user-management': {
    title: 'WISE · User Management',
    load: () => import('./user-management-flow.js'),
    render: (m) => m.renderUserManagement,
    wiseai: (m) => m.USER_MANAGEMENT_WISEAI,
    setChat: (m) => m.setUserManagementChat,
  },
  'non-upf-dashboard': {
    title: 'WISE · Non-UPF Dashboard',
    load: () => import('./non-upf-dashboard-flow.js'),
    render: (m) => m.renderNonUpfDashboard,
    wiseai: (m) => m.NON_UPF_WISEAI,
    setChat: (m) => m.setNonUpfChat,
  },
  'audit-queue': {
    title: 'WISE · Audit Queue',
    load: () => import('./audit-queue-flow.js'),
    render: (m) => m.renderAuditQueue,
    wiseai: (m) => m.AUDIT_QUEUE_WISEAI,
    setChat: (m) => m.setAuditQueueChat,
  },
  'admin-utils': {
    title: 'WISE · Admin Utilities',
    load: () => import('./admin-utils-flow.js'),
    render: (m) => m.renderAdminUtils,
    wiseai: (m) => m.ADMIN_UTILS_WISEAI,
    setChat: (m) => m.setAdminUtilsChat,
  },
  'all-modules': {
    title: 'WISE · All Modules',
    load: () => import('./all-modules-flow.js'),
    render: (m) => m.renderAllModules,
    wiseai: (m) => m.ALL_MODULES_WISEAI,
  },
};

async function ensureDashApi() {
  if (dashApi) return dashApi;
  dashApi = await import('./dashboard-home.js');
  return dashApi;
}

/* App-wide, self-initialising table helpers: consistent sortable headers
   (up/down chevron) + a matching "load more" pagination footer on every data
   table, plus row-click → View Product on product lists. Side-effecting
   IIFE modules — importing runs them. */
import './sortable-tables.js';
import './table-pagination.js';
import './responsive-tables.js';
import './product-row-click.js';
import './date-column.js';

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ====================================================================
   Shared toast + bottom sheet for every agent overview page.
   Mirrors the Portfolio engine so clicks produce visible progress +
   results (the same bottom-sheet / progress-flow language app-wide).
==================================================================== */

function agToast(msg, icon = 'check') {
  let wrap = document.getElementById('ag-toast-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.id = 'ag-toast-wrap'; document.body.appendChild(wrap); }
  const t = document.createElement('div');
  t.className = 'ag-toast';
  t.innerHTML = `<span class="material-symbols-outlined">${escHtml(icon)}</span><span>${escHtml(msg)}</span>`;
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity .3s ease, transform .3s ease';
    t.style.opacity = '0';
    t.style.transform = 'translateY(8px)';
    setTimeout(() => t.remove(), 320);
  }, 2600);
}

let agSheetEls = null;
let agPendingDownload = null;

function ensureAgSheet() {
  if (agSheetEls) return agSheetEls;
  const scrim = document.createElement('div');
  scrim.id = 'ag-sheet-scrim';
  scrim.className = 'ag-sheet-scrim';
  const sheet = document.createElement('div');
  sheet.id = 'ag-sheet';
  sheet.className = 'ag-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  document.body.appendChild(scrim);
  document.body.appendChild(sheet);
  scrim.addEventListener('click', closeAgSheet);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAgSheet(); });
  sheet.addEventListener('click', (e) => {
    const dl = e.target.closest('[data-sheet-download]');
    if (dl) { e.preventDefault(); agPendingDownload?.(); return; }
    const nav = e.target.closest('[data-sheet-nav]');
    if (nav) { e.preventDefault(); window.location.href = nav.dataset.sheetNav; return; }
    const flow = e.target.closest('[data-ag-flow]');
    if (flow) { e.preventDefault(); openAgFlow(flow.dataset.agFlow, flow); return; }
    if (e.target.closest('[data-sheet-close]')) { e.preventDefault(); closeAgSheet(); }
  });
  agSheetEls = { scrim, sheet };
  return agSheetEls;
}

function openAgSheet({ eyebrow = 'WISEcode AI', title = '', icon = 'bolt' } = {}) {
  const { scrim, sheet } = ensureAgSheet();
  sheet.innerHTML = `
    <div class="ag-sheet-handle" aria-hidden="true"></div>
    <header class="ag-sheet-head">
      <span class="ag-sheet-icon"><span class="material-symbols-outlined">${escHtml(icon)}</span></span>
      <div class="ag-sheet-titles">
        <div class="ag-sheet-eyebrow">${escHtml(eyebrow)}</div>
        <div class="ag-sheet-title">${escHtml(title)}</div>
      </div>
      <button class="ag-sheet-close" data-sheet-close="1" aria-label="Close"><span class="material-symbols-outlined">close</span></button>
    </header>
    <div class="ag-sheet-body" id="ag-sheet-body"></div>`;
  requestAnimationFrame(() => { scrim.classList.add('is-open'); sheet.classList.add('is-open'); });
  return sheet.querySelector('#ag-sheet-body');
}

function closeAgSheet() {
  if (!agSheetEls) return;
  agSheetEls.scrim.classList.remove('is-open');
  agSheetEls.sheet.classList.remove('is-open');
}

function runAgProgress(host, cfg = {}) {
  const { steps = [], doneTitle = 'Done', doneText = '', doneIcon = 'check', cta = null } = cfg;
  host.innerHTML = `
    <div class="ag-flow">
      <div class="ag-flow-bar"><span class="ag-flow-fill" id="ag-flow-fill"></span></div>
      <div class="ag-flow-pct" id="ag-flow-pct">0%</div>
      <ul class="ag-flow-steps">
        ${steps.map((s) => `<li class="ag-flow-step"><span class="ag-flow-dot"><span class="material-symbols-outlined">radio_button_unchecked</span></span><span>${escHtml(s)}</span></li>`).join('')}
      </ul>
    </div>`;
  const fill = host.querySelector('#ag-flow-fill');
  const pct = host.querySelector('#ag-flow-pct');
  const stepEls = Array.from(host.querySelectorAll('.ag-flow-step'));
  const n = steps.length || 1;
  return new Promise((resolve) => {
    let i = 0;
    const tick = () => {
      if (i > 0) {
        const prev = stepEls[i - 1];
        prev?.classList.remove('is-active');
        prev?.classList.add('is-done');
        const ic = prev?.querySelector('.material-symbols-outlined');
        if (ic) ic.textContent = 'check';
      }
      if (i < n) {
        const cur = stepEls[i];
        cur?.classList.add('is-active');
        const ic = cur?.querySelector('.material-symbols-outlined');
        if (ic) ic.textContent = 'autorenew';
        const target = Math.round(((i + 1) / n) * 100);
        if (fill) fill.style.width = target + '%';
        if (pct) pct.textContent = target + '%';
        i++;
        setTimeout(tick, 560);
      } else {
        host.innerHTML = `
          <div class="ag-flow-done">
            <div class="ag-flow-done-icon"><span class="material-symbols-outlined">${escHtml(doneIcon)}</span></div>
            <div class="ag-flow-done-title">${escHtml(doneTitle)}</div>
            ${doneText ? `<p class="ag-flow-done-text">${doneText}</p>` : ''}
            <div class="ag-sheet-actions">
              ${cta ? `<button class="agent-cta agent-cta--primary" data-sheet-nav="${escHtml(cta.href)}"><span class="material-symbols-outlined">${escHtml(cta.icon || 'chat')}</span>${escHtml(cta.label)}</button>` : ''}
              <button class="agent-cta agent-cta--ghost" data-sheet-close="1">Close</button>
            </div>
          </div>`;
        resolve();
      }
    };
    setTimeout(tick, 220);
  });
}

const AG_FLOWS = {
  'invite-member': { icon: 'person_add', title: 'Invite team member',
    steps: ['Validating the email…', 'Provisioning a seat…', 'Sending the invite…'],
    doneTitle: 'Invite sent', doneText: 'They’ll get an email to join this workspace with the role you chose.' },
};

function openAgFlow(key, btn) {
  const f = AG_FLOWS[key];
  if (!f) { agToast('Working on it…', 'autorenew'); return; }
  const body = openAgSheet({ title: f.title, icon: f.icon });
  runAgProgress(body, f);
  void btn;
}

/* ---- Content sheets ---- */

function openAgentDetailSheet(agentId) {
  const a = getAgent(agentId);
  if (!a) return;
  const kids = getDirectChildren(a.id);
  const kidsHtml = kids.length
    ? `<div class="ag-detail-label">Sub-agents</div>${kids.map((k) => `
        <div class="ag-detail-row">
          <span class="ag-detail-ic"><span class="material-symbols-outlined">${escHtml(k.icon)}</span></span>
          <div><div class="ag-detail-name">${escHtml(k.label)}</div><div class="ag-detail-sub">${escHtml(k.description)}</div></div>
        </div>`).join('')}`
    : '<p class="ag-sheet-lead">This agent operates on its own — capabilities are delivered directly.</p>';
  const body = openAgSheet({ eyebrow: 'Agent', title: a.label, icon: a.icon });
  body.innerHTML = `
    <p class="ag-sheet-lead">${escHtml(a.description)}</p>
    ${kidsHtml}
    <div class="ag-sheet-actions">
      <button class="agent-cta agent-cta--primary" data-sheet-nav="wiseai.html"><span class="material-symbols-outlined">chat</span>Open in WISEowl chat</button>
      <button class="agent-cta agent-cta--ghost" data-sheet-close="1">Close</button>
    </div>`;
}

function openAddMemberSheet() {
  const body = openAgSheet({ title: 'Add team member', icon: 'person_add' });
  body.innerHTML = `
    <p class="ag-sheet-lead">Invite a teammate to this WISEcode workspace.</p>
    <label class="ag-field"><span class="ag-field-label">Email</span><input class="ag-input" id="ag-mem-email" type="email" placeholder="name@company.com" autocomplete="off" /></label>
    <label class="ag-field"><span class="ag-field-label">Role</span>
      <select class="ag-input" id="ag-mem-role"><option>Viewer</option><option>Editor</option><option>Admin</option></select>
    </label>
    <div class="ag-sheet-actions">
      <button class="agent-cta agent-cta--primary" id="ag-mem-send"><span class="material-symbols-outlined">send</span>Send invite</button>
      <button class="agent-cta agent-cta--ghost" data-sheet-close="1">Cancel</button>
    </div>`;
  const email = body.querySelector('#ag-mem-email');
  email.focus();
  body.querySelector('#ag-mem-send').addEventListener('click', () => {
    if (!email.value.trim() || !email.value.includes('@')) { email.focus(); return; }
    openAgFlow('invite-member');
  });
}

function exportOverview(agentLabel) {
  const blob = new Blob([`WISEcode · ${agentLabel} overview\nGenerated ${new Date().toLocaleString()}\n\nExported from the WISEcode AI agent overview.\n`], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${String(agentLabel).replace(/[^\w]+/g, '-').toLowerCase()}-overview.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  agToast('Overview exported.', 'download');
}

function shareOverview() {
  const url = window.location.href;
  if (navigator.share) navigator.share({ title: document.title, url }).catch(() => {});
  else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => agToast('Link copied to clipboard.', 'link')).catch(() => agToast('Could not copy link.', 'error'));
  else agToast('Sharing is not supported here.', 'info');
}

function renderChildCard(agent) {
  if (!agent) return '';
  const grandkids = getDirectChildren(agent.id);
  const grandkidsHtml = grandkids.length
    ? `<div class="agent-card-children">
        ${grandkids
          .map(
            (gk) => `<div class="agent-child" id="${escHtml(gk.id)}" role="button" tabindex="0" aria-label="View ${escHtml(gk.label)}">
              <span class="agent-child-icon"><span class="material-symbols-outlined">${escHtml(gk.icon)}</span></span>
              <div class="agent-child-body">
                <span class="agent-child-name">${escHtml(gk.label)}</span>
                <span class="agent-child-desc">${escHtml(gk.description)}</span>
              </div>
            </div>`
          )
          .join('')}
      </div>`
    : '';
  return `
    <article class="agent-card is-interactive" id="${escHtml(agent.id)}" role="button" tabindex="0" aria-label="View ${escHtml(agent.label)}">
      <div class="agent-card-head">
        <span class="agent-card-icon"><span class="material-symbols-outlined">${escHtml(agent.icon)}</span></span>
        <div>
          <h3 class="agent-card-title">${escHtml(agent.label)}</h3>
        </div>
      </div>
      <p class="agent-card-desc">${escHtml(agent.description)}</p>
      ${grandkidsHtml}
    </article>`;
}

function renderHero(agent) {
  const childCount = (agent.children || []).length;
  return `
    <section class="agent-hero">
      <h1 class="agent-hero-title">${escHtml(agent.label)}</h1>
      <p class="agent-hero-desc">${escHtml(agent.description)}</p>
      <div class="agent-hero-meta">
        <span class="agent-hero-pill"><span class="material-symbols-outlined">${escHtml(agent.icon)}</span>${escHtml(agent.label)}</span>
        <span class="agent-hero-pill"><span class="material-symbols-outlined">hub</span>${childCount} agent${childCount === 1 ? '' : 's'}</span>
        <span class="agent-hero-pill"><span class="material-symbols-outlined">workspaces</span>WISEcode AI orchestrator</span>
      </div>
      <div class="agent-cta-row">
        <a class="agent-cta agent-cta--primary" href="wiseai.html">
          <span class="material-symbols-outlined">chat</span>
          Open WISEowl chat
        </a>
      </div>
    </section>`;
}

function renderMain(agent) {
  const subs = getDirectChildren(agent.id);
  const cards = subs.length
    ? `<div class="agent-card-grid">${subs.map(renderChildCard).join('')}</div>`
    : `<div class="agent-empty">This agent currently operates on its own. Capabilities are delivered directly by the ${escHtml(agent.label)}.</div>`;
  return `
    ${renderHero(agent)}
    <h2 class="agent-section-label">Agents</h2>
    ${cards}`;
}

/* A blank shell page (menu + top bar + WISEcodeAI dock, empty main) used for
   product destinations that don't yet have bespoke content — e.g. the
   top-level Dashboard. Driven by `<body data-product-id="…">` (no agent id). */

/* Force the navigation panel into its collapsed icon rail on load. Mirrors the
   Reports shell: the collapsed look is forced without writing the shared rail
   preference (no localStorage), so other pages keep whatever the user set and
   the menu toggle still expands it here within the session. */
function collapseNavRail() {
  const panel = document.getElementById('menu-panel');
  if (!panel || panel.classList.contains('mp-rail')) return;
  panel.classList.add('mp-rail');
  const btn = document.getElementById('topbar-menu-toggle');
  if (btn) {
    btn.setAttribute('aria-pressed', 'true');
    btn.setAttribute('aria-label', 'Expand menu');
    btn.setAttribute('title', 'Expand menu');
    const icon = btn.querySelector('.material-symbols-outlined');
    if (icon) icon.textContent = 'dock_to_right';
  }
}

/** Apply `<body data-default-…>` appearance overrides declared by the host page. */
function applyBodyAppearanceDefaults() {
  const pivot = pageAppearanceDefault('defaultPivot');
  if (pivot !== null) setMenuPivot(pivot);
  /* Chat-only full bleed is the app-wide default (js/topbar.js). Page-level
     `data-default-full-bleed` used to call applyFullBleed() which persisted
     globally and turned the chat stretch off after visiting Overview. */
  restoreFullBleed();
  const header = pageAppearanceDefault('defaultHeader');
  if (header !== null) applyHeaderFloat(header);
  /* Pages can open with the nav collapsed to its icon rail by default via
     `<body data-default-nav-collapsed>` — forced on every load so the nav
     always starts collapsed here. */
  if (pageAppearanceDefault('defaultNavCollapsed')) collapseNavRail();
}

function bootstrapBlankPage(productId) {
  const isDashboard = productId === 'dashboard';

  /* The top-level Dashboard is the "Overview" entry in the sectioned workspace
     nav, so it gets the same identity-aware topbar as the other app-nav pages
     (e.g. product-portfolio) rather than the bare logo-only topbar. */
  if (isDashboard) {
    APP_IDENTITY = resolveIdentity();
    mountTopbar({
      variant: 'agent',
      logoHref: 'overview.html',
      profileName: APP_IDENTITY.name,
      profileEmail: APP_IDENTITY.email,
      avatarText: APP_IDENTITY.initials,
    });
  } else {
    mountTopbar({ variant: 'agent', logoHref: 'overview.html' });
  }

  const headerEl = document.getElementById('agent-main-header');
  if (headerEl) {
    headerEl.innerHTML = isDashboard
      ? `<span class="agent-main-icon"><span class="material-symbols-outlined">dashboard</span></span>
         <div class="agent-main-titles">
           <div class="agent-main-title">Dashboard</div>
           <div class="agent-main-sub">Brand Intelligence</div>
         </div>`
      : '';
  }
  const mainEl = document.getElementById('agent-main-scroll');
  if (mainEl) mainEl.innerHTML = '';

  const navEl = document.getElementById('agent-menu-nav');
  if (navEl) {
    /* Dashboard = the "Overview" item in the sectioned workspace nav, so it
       uses the same nav (Overview / Portfolio / Studio / Organization / Admin)
       as product-portfolio and the other app-nav pages. Other blank product
       shells keep the legacy product nav. */
    mountAgentMenu(navEl, null, isDashboard
      ? { fromAgentPage: true, appNav: true, activeNavId: 'overview' }
      : { fromAgentPage: true, activeProductId: productId || null });
  }

  applyBodyAppearanceDefaults();

  setupTrailingRail();
  /* Give the dashboard's main panel the same header cluster (⋯ menu + width
     toggle) every other pane has, so the functions survive header-float. */
  if (isDashboard) setupMainPanelControls();

  const finish = () => {
    setupWISEcodeAIDock().catch((err) => console.error('[agent-overview] chat dock failed', err));
  };
  if (isDashboard && mainEl) {
    ensureDashApi().then((m) => {
      m.renderDashboardHome(mainEl);
      const morePop = document.getElementById('topbar-more-popover');
      if (morePop) morePop.innerHTML = renderMorePopover();
      finish();
    }).catch((err) => {
      console.error('[agent-overview] failed to load dashboard home', err);
      finish();
    });
  } else {
    finish();
  }
}

/* ====================================================================
   Sectioned workspace-nav page shell.
     Any page can opt into the new dashboard nav (Overview / Portfolio /
     Studio / Organization / Admin) by setting `<body data-nav-id="…">` to a
     WISE_APP_NAV id (e.g. "product-portfolio"). It gets the full working
     shell — the new nav with the right active item, the rich profile card,
     and every appearance/profile/theme control — with zero per-page wiring.
==================================================================== */

/** Signed-in identity for the profile card / avatar menu. Reads the shared
 *  WiseAuth session when present, else falls back to the design default. */
function resolveIdentity() {
  let user = null;
  try { user = window.WiseAuth?.getUser?.() || null; } catch (_) { user = null; }
  /* The prototype's demo login seeds a generic "Demo User"; treat that (and an
     empty name) as the branded demo identity so the footer + avatar menu read
     "Arthur Krupsky" everywhere, matching the rest of the app. A genuinely
     different signed-in user keeps their own name + email. */
  const rawName = user && user.name;
  const isGenericDemo = !rawName || rawName === 'Demo User';
  const name = isGenericDemo ? 'Arthur Krupsky' : rawName;
  const email = (!isGenericDemo && user && user.email) ? user.email : 'akrupsky@wisecode.ai';
  const initials = (user && user.initials)
    || name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    || 'AK';
  return { name, email, initials, title: (user && user.title) || 'Product Intelligence Lead' };
}

let APP_IDENTITY = null;

function bootstrapAppNavPage(navId) {
  APP_IDENTITY = resolveIdentity();
  const node = getAppNavNode(navId);

  mountTopbar({
    variant: 'agent',
    logoHref: 'overview.html',
    profileName: APP_IDENTITY.name,
    profileEmail: APP_IDENTITY.email,
    avatarText: APP_IDENTITY.initials,
  });

  document.title = node ? `WISE · ${node.label}` : 'WISE';

  const headerEl = document.getElementById('agent-main-header');
  if (headerEl && node) {
    headerEl.innerHTML = `
      <span class="agent-main-icon"><span class="material-symbols-outlined">${escHtml(node.icon || 'space_dashboard')}</span></span>
      <div class="agent-main-titles">
        <div class="agent-main-title">${escHtml(node.label)}</div>
        <div class="agent-main-sub">WISEcode</div>
      </div>`;
  }

  /* Blank content slot — each page fills #agent-main-scroll with its own
     module content. The shell (nav + appearance + profile) is fully wired
     first so All Modules can keep showing its boot headline while its flow
     module is still arriving. */
  const mainEl = document.getElementById('agent-main-scroll');

  const navEl = document.getElementById('agent-menu-nav');
  if (navEl) {
    mountAgentMenu(navEl, null, {
      fromAgentPage: true,
      appNav: true,
      activeNavId: navId,
    });
  }

  /* The Reports page opens with the nav collapsed to its icon rail by default so
     the chat + reports modules get the full width. */
  if (navId === 'reports') collapseNavRail();

  applyBodyAppearanceDefaults();
  setupTrailingRail();
  setupMainPanelControls();
  fillAppNavMain(navId, mainEl, node);
}

async function fillAppNavMain(navId, mainEl, node) {
  const spec = APP_NAV_FLOWS[navId];
  if (navId === 'reports') {
    try { await ensureDashApi(); } catch (err) {
      console.error('[agent-overview] failed to load dashboard home', err);
    }
  }
  if (spec) {
    try { navFlowMod = await spec.load(); }
    catch (err) {
      console.error('[agent-overview] failed to load flow for', navId, err);
      navFlowMod = null;
    }
    if (spec.title) document.title = spec.title;
    if (mainEl && spec.render && navFlowMod) {
      try { spec.render(navFlowMod)(mainEl); }
      catch (err) { console.error('[agent-overview] failed to render', navId, err); }
    }
  } else if (mainEl && !mainEl.innerHTML.trim()) {
    mainEl.innerHTML = `
      <div class="agent-empty" data-module-placeholder>
        ${escHtml(node ? node.label : 'Module')} — content coming soon.
      </div>`;
  }
  try { await setupWISEcodeAIDock(); }
  catch (err) { console.error('[agent-overview] chat dock failed', err); }
}

export function bootstrapAgentPage() {
  /* New sectioned workspace nav — opt-in per page via `data-nav-id`. */
  const navId = document.body.dataset.navId;
  if (navId) { bootstrapAppNavPage(navId); return; }

  const agentId = document.body.dataset.agentId;
  const agent = getAgent(agentId);
  if (!agent) {
    /* No agent id → treat as a blank shell page (keeps the menu + top bar so
       navigation still works) instead of erroring out. */
    if (document.body.dataset.productId) {
      bootstrapBlankPage(document.body.dataset.productId);
      return;
    }
    console.error(`[agent-overview] unknown agent id: ${agentId}`);
    return;
  }

  document.title = `WISE · ${agent.label}`;

  /* Build the shared top bar (menu toggle, WISE logo, Alerts/More, profile).
     The agent variant has no center rail — just the trailing actions. */
  mountTopbar({ variant: 'agent', logoHref: 'overview.html' });
  /* Logo lives in the nav panel brand strip (mountTopbar → mountMenuBrand). */

  const headerEl = document.getElementById('agent-main-header');
  if (headerEl) {
    headerEl.innerHTML = `
      <span class="agent-main-icon"><span class="material-symbols-outlined">${escHtml(agent.icon)}</span></span>
      <div class="agent-main-titles">
        <div class="agent-main-title">${escHtml(agent.label)}</div>
        <div class="agent-main-sub">Overview</div>
      </div>`;
  }

  const mainEl = document.getElementById('agent-main-scroll');
  if (mainEl) {
    mainEl.innerHTML = renderMain(agent);
    /* Agent + sub-agent cards open a detail bottom sheet. A child click wins
       over its containing card. */
    const openFromTarget = (target) => {
      const child = target.closest('.agent-child[id]');
      if (child) { openAgentDetailSheet(child.id); return; }
      const card = target.closest('.agent-card[id]');
      if (card) openAgentDetailSheet(card.id);
    };
    mainEl.addEventListener('click', (e) => openFromTarget(e.target));
    mainEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (!e.target.closest('.agent-child[id], .agent-card[id]')) return;
      e.preventDefault();
      openFromTarget(e.target);
    });
  }

  const navEl = document.getElementById('agent-menu-nav');
  if (navEl) mountAgentMenu(navEl, agent.id, { fromAgentPage: true });

  setupTrailingRail();
  /* Same header cluster (⋯ menu + width toggle) as every other pane. */
  setupMainPanelControls();
  setupWISEcodeAIDock().catch((err) => console.error('[agent-overview] chat dock failed', err));

  if (location.hash) {
    requestAnimationFrame(() => {
      const target = document.getElementById(location.hash.slice(1));
      if (target && target.scrollIntoView) target.scrollIntoView({ block: 'start' });
    });
  }
}

/* ====================================================================
   Persistent WISEcodeAI dock.
     The shared WISEcodeAI chat lives in the modules row on every agent page,
     in the exact same place + size as the portfolio and chat pages — its
     width and side are restored from localStorage via mountWISEcodeAIDock, so
     WISEcodeAI stays uniform as you move between pages.
==================================================================== */

/* Intent chips surfaced in the WISEcodeAI dock on the Dashboard page. There is one
   chip for EVERY action the Dashboard (overview.html) exposes, so anything you
   can do on the page is also one tap away from WISEcodeAI. Each chip maps 1:1 to an
   on-page control via DASHBOARD_WISEAI_ACTIONS below — clicking a chip triggers
   that exact control, so the chip does precisely what the button does (navigate,
   open a report, compare brands, or edit the logo). Laid out as a plain wrapped
   grid (no carousel) so every chip is always visible. */
const DASHBOARD_WISEAI_INTENTS = [
  { intent: 'claim_products',       label: 'Claim your products',         icon: 'verified_user' },
  { intent: 'review_portfolio',     label: 'Review your food portfolio',  icon: 'inventory_2' },
  { intent: 'add_food',             label: 'Add a food',                  icon: 'add' },
  { intent: 'verify_upf',           label: 'Verify your Non-UPF products', icon: 'verified' },
  { intent: 'verify_gras',          label: 'Verify your GRAS products',   icon: 'shield' },
  /* The "Open the … report" chips live on the Reports page dock (see
     REPORTS_WISEAI_INTENTS) — the report intents themselves stay wired here
     because the welcome cards and on-page controls still open them inline. */
  { intent: 'update_logo',          label: 'Update your brand logo',      icon: 'image' },
];

/* Chip intent → the `data-dash-action` of the matching control rendered by
   dashboard-home.js. The chip fires that exact on-page button so it does
   precisely what the button does — but only AFTER its narration has posted in
   the thread (see onReply below), so no chip ever navigates away before leaving
   a transcript behind. Keep this in lock-step with the actions in
   dashboard-home.js: every actionable control on overview.html must appear here
   so no page action is left without a chip. */
const DASHBOARD_WISEAI_ACTIONS = {
  claim_products:       'claim-upcs',
  review_portfolio:     'review-portfolio',
  add_food:             'add-food',
  verify_upf:           'verify-upf',
  verify_gras:          'verify-gras',
  update_logo:          'edit-logo',
};

/* Narration for every dashboard chip — the "proper transcript" each chip leaves
   in the thread before it acts. Report chips get their narration from
   dashReportChatReply (state-aware); the rest describe the on-page control the
   chip is about to fire (navigate to the portfolio, start a verification flow,
   or open the logo editor) so the chat reads the same whether you tapped the
   chip or the matching button on the brand overview to the right. */
const DASHBOARD_WISEAI_REPLIES = {
  claim_products:   'Let\u2019s claim your products. I\u2019m opening your <strong>Product Portfolio</strong>, where you can take ownership of every discovered UPC \u2014 claiming is what unlocks Non-UPF / GRAS verification and your brand reports. Taking you there now\u2026',
  review_portfolio: 'Opening your <strong>Product Portfolio</strong> \u2014 every SKU\u2019s claim status, compliance and ingredient health in one view, so you can see exactly where each product stands. Taking you there now\u2026',
  add_food:         'Let\u2019s add a food. I\u2019m opening your <strong>Product Portfolio</strong> with the add-a-product flow ready, so you can bring a new SKU in to classify and verify. Taking you there now\u2026',
  verify_upf:       'Starting <strong>Non-UPF verification</strong>. I\u2019m opening the verification flow so you can run the checks across your qualifying SKUs and earn the Non-UPF Verified\u2122 shield. Taking you there now\u2026',
  verify_gras:      'Starting <strong>GRAS verification</strong>. I\u2019m opening the GRAS documentation flow so you can verify your qualifying ingredients and SKUs. Taking you there now\u2026',
  update_logo:      'Let\u2019s update your <strong>brand logo</strong>. I\u2019m opening the logo editor on your dashboard \u2014 drop in a PNG or SVG (square, transparent edges look best) and save. It\u2019s coming up now\u2026',
};

/* Report chips are handled separately from the on-page controls: they open the
   report INLINE on the dashboard surface (right of the chat) and let the dock
   supply the narration, so nothing opens a modal. Chip intent → report key. */
const DASHBOARD_WISEAI_REPORTS = {
  open_upf_report:      'upf',
  open_gras_report:     'gras',
  open_insights_report: 'insights',
};

/* Intent chips for the Reports page WISEcodeAI dock — every chip is something you
   can actually DO with the reports next to it. The "Open …" report chips open
   the brand report INLINE on the module surface to the right (same surface the
   Dashboard uses); the rest continue the conversation with an on-topic answer. */
const REPORTS_WISEAI_INTENTS = [
  { intent: 'open_upf_report',      label: 'Open the UPF report',      icon: 'description' },
  { intent: 'open_gras_report',     label: 'Open the GRAS report',     icon: 'description' },
  { intent: 'open_insights_report', label: 'Open the insights report', icon: 'insights' },
  { intent: 'explain_score',     label: 'Explain my UPF score',     icon: 'help_outline' },
  { intent: 'improve_score',     label: 'How do I improve it?',     icon: 'trending_up' },
  { intent: 'ingredient_quality',label: 'Ingredient quality',       icon: 'science' },
  { intent: 'compare_products',  label: 'Compare two products',     icon: 'compare_arrows' },
  { intent: 'unlock_studio',     label: 'Unlock the full Studio',   icon: 'lock_open' },
];

/* Intent chips for the WISEcodeAI Library page dock. Every chip maps 1:1 to a real
   filter you can apply in the Library module beside it — the same set of item
   types and the "shared with me" scope surfaced by the score cards and the
   funnel popover. onIntent drives the on-page filter (via window.__wiseLibraryIntent)
   and the matching reply below narrates it in the thread. Keep this list in
   lock-step with the type/scope score cards + funnel chips in
   conversation-library.html so the chat can never offer an intent the module
   can't perform. */
const LIBRARY_WISEAI_INTENTS = [
  { intent: 'lib_reports',    label: 'Show reports',      icon: 'description' },
  { intent: 'lib_dashboards', label: 'Show dashboards',   icon: 'bar_chart' },
  { intent: 'lib_chats',      label: 'Show chats',        icon: 'forum' },
  { intent: 'lib_mcp',        label: 'Show MCP results',  icon: 'extension' },
  { intent: 'lib_references', label: 'Show references',   icon: 'bookmark' },
  { intent: 'lib_shared',     label: 'Shared with me',    icon: 'group' },
];

/* Static fallback narration for the Library chips — the module supplies a
   count-aware version via window.__wiseLibraryReply, but if that hook isn't up
   yet these keep the thread coherent. */
const LIBRARY_WISEAI_REPLIES = {
  lib_reports:    'Filtered your library to <strong>Reports</strong>.',
  lib_dashboards: 'Filtered your library to <strong>Dashboards</strong>.',
  lib_chats:      'Filtered your library to <strong>Chats</strong>.',
  lib_mcp:        'Filtered your library to <strong>MCP results</strong>.',
  lib_references: 'Filtered your library to <strong>References</strong>.',
  lib_shared:     'Showing everything <strong>shared with you</strong>.',
};

/* Intent chips for the Ingredient Browser page WISEcodeAI dock. Every chip maps 1:1
   to a real way you can slice the registry in the module beside it — the search,
   the GRAS-status score cards, and each dropdown/flag group inside the funnel
   popover. onIntent drives the on-page control (via window.__ibIntent — it
   focuses the search or opens the funnel pre-focused on the matching filter) and
   the matching reply below narrates it in the thread. Keep this list in
   lock-step with the filters + score cards in ingredient-browser.html so the
   chat can never offer an intent the module can't perform. */
const INGREDIENTS_WISEAI_INTENTS = [
  { intent: 'search_ingredient', label: 'Search an ingredient',      icon: 'search' },
  { intent: 'filter_gras',       label: 'Filter by GRAS status',     icon: 'verified' },
  { intent: 'browse_category',   label: 'Browse by category',        icon: 'category' },
  { intent: 'filter_processing', label: 'Filter by processing level', icon: 'blender' },
  { intent: 'check_allergens',   label: 'Check allergens',           icon: 'allergies' },
  { intent: 'filter_flags',      label: 'Additives & flags',         icon: 'label' },
  { intent: 'explain_gras',      label: 'What is GRAS?',             icon: 'help_outline' },
];

const INGREDIENTS_WISEAI_REPLIES = {
  search_ingredient: 'Type any ingredient name in the search box and I\u2019ll filter the registry live \u2014 a flavor compound, a whole food, or an additive all work.',
  filter_gras: 'You can filter by GRAS status: <strong>GRAS</strong>, <strong>In review</strong>, <strong>Historical</strong>, <strong>Unclear</strong> or <strong>Unsafe</strong>. Tap a status card above the table, or tell me which one to show.',
  browse_category: 'Browse by <strong>category</strong> and <strong>subcategory</strong> \u2014 Additives, Dairy, Fruit, Grain, Protein, Vegetable and more, each with its own subcategories. Which category should I open?',
  filter_processing: 'Filter by <strong>processing level (PL)</strong> 1\u20134 \u2014 from whole/minimally processed (1) to ultra-processed (4). Which level do you want to see?',
  check_allergens: 'I can filter by <strong>US</strong> or <strong>EU allergen</strong> \u2014 Milk, Eggs, Fish, Shellfish/Crustaceans, Tree Nuts, Peanuts, Wheat/Gluten, Soy and Sesame. Which allergen matters?',
  filter_flags: 'Filter by ingredient <strong>flags</strong> \u2014 Sweetener, Emulsifier, Artificial Color, Artificial Preservative, Added Sugar, Whole Grain, Caffeine, Vegan, Gluten Free and more. Which flags should I apply?',
  explain_gras: 'GRAS means \u201cGenerally Recognized As Safe.\u201d In this registry every ingredient carries a GRAS status: <strong>GRAS</strong> (evidence + expert consensus), <strong>In review</strong> (being assessed), <strong>Historical</strong> (long use but not formally affirmed), <strong>Unclear</strong> (not enough evidence), or <strong>Unsafe</strong>. Want me to filter by one?',
};

/* Intent chips for the Marketing Assets page WISEcodeAI dock. Every chip maps 1:1
   to something you can actually do in the module beside it — open a specific
   toolkit, pull the Non-UPF shield, grab the brand standards, or expand the
   whole library. Rendered as a stacked/wrapped grid (chipsFlow: 'wrap'), not a
   carousel, so all actions are visible at once. onIntent drives the on-page
   action; the matching reply below narrates it in the thread. */
const MARKETING_WISEAI_INTENTS = [
  { intent: 'onesheet',        label: 'Open the co-branded one-sheets', icon: 'description' },
  { intent: 'shield',          label: 'Get the Non-UPF Verified™ shield', icon: 'verified_user' },
  { intent: 'brand_standards', label: 'Download the brand standards guide', icon: 'menu_book' },
  { intent: 'social',          label: 'Grab the social media toolkit', icon: 'share' },
  { intent: 'email_sms',       label: 'Get email & SMS assets', icon: 'mail' },
  { intent: 'packaging',       label: 'Packaging resources', icon: 'inventory_2' },
  { intent: 'expand_all',      label: 'Expand all folders', icon: 'unfold_more' },
];

const MARKETING_WISEAI_REPLIES = {
  onesheet: 'Opened the <strong>One-Sheet Toolkit</strong> — you\u2019ll find the co-branded Non-UPF one-sheet in Templates A, B and C (editable PSDs plus print-ready PNGs), and the instructions PDF for setup. Want me to point you to a specific template?',
  shield: 'Opened the <strong>WISEcode Non-UPF Verified\u2122 Shield</strong> folder. The <strong>Digital</strong> set has web PNGs and the <strong>Print</strong> set has vector AI/EPS/SVG files — black and white lockups live under \u201cUse with permission only.\u201d Need a particular format?',
  brand_standards: 'Fetching the <strong>Trademark Use Guide and Brand Standards</strong> from Packaging Resources — it covers clear space, color, and approved shield usage. The shield examples PDF is in the same folder if you need reference art.',
  social: 'Opened the <strong>Social Media Toolkit</strong> — post packs plus the instructions PDF. Tell me the platform or campaign and I\u2019ll help you pick the right post.',
  email_sms: 'Opened the <strong>WISEcode Email-SMS Toolkit</strong> — ready-made <strong>banners</strong> and <strong>headers</strong> in multiple sizes, with the setup instructions PDF. Want the 1080\u00d71080 or the 1920\u00d71080 banner?',
  packaging: 'Opened <strong>Packaging Resources</strong> — the shield examples and the trademark/brand-standards guide for getting the mark onto your packaging correctly.',
  expand_all: 'Expanded the whole library so you can see every toolkit, folder and file at once. Use the Sort control to reorder by name, size, or date.',
};

const REPORTS_WISEAI_REPLIES = {
  explain_score: 'Your Portfolio UPF score comes from how each product is classified against the NOVA scale — 92% of your line-up lands as Non‑UPF. Want me to break the score down by product, or explain what pushes a product into the ultra‑processed tier?',
  improve_score: 'The fastest wins are usually swapping a single flagged ingredient (emulsifiers, artificial colours, or certain seed oils). Open the UPF report and I can point to the exact products and ingredients that, if reformulated, would flip them to Non‑UPF.',
  ingredient_quality: 'The Ingredient Quality deep‑dive scores artificial additives, clean‑label share, seed oils, and more — one metric at a time. Want the portfolio‑wide view, or should we focus on a single product?',
  compare_products: 'Tell me two products from your portfolio and I’ll line them up side‑by‑side across UPF classification, ingredient quality, and flagged additives.',
  unlock_studio: 'The full Studio unlocks the GRAS, Insights, Nutrient‑Quality and Health‑Outcomes reports across your whole portfolio and per product. Want me to add you to the beta waitlist?',
};

/* True only when the page was reached by a real navigation (clicking a link /
   typing the URL), not a reload or back/forward. Used so pages that force the
   WISEcodeAI chat open on arrival don't fight an explicit "Close conversation" the
   user made moments earlier — a reload (e.g. livereload on file save) then keeps
   the chat closed. Falls back to `true` if the timing API is unavailable, so the
   default stays "show the chat". */
function arrivedByNavigation() {
  try {
    const nav = performance.getEntriesByType?.('navigation')?.[0];
    if (nav && typeof nav.type === 'string') return nav.type === 'navigate';
    /* Legacy fallback: performance.navigation.type === 0 is TYPE_NAVIGATE. */
    const legacy = performance.navigation && performance.navigation.type;
    return legacy === undefined || legacy === 0;
  } catch (_) {
    return true;
  }
}

/* ── WISEcodeAI dock feature parity ───────────────────────────────────────────────
   Every logged-in page mounts the SAME WISEcodeAI chat module (the dock), so it must
   carry the same components + three-dot actions as the flagship pages/wiseai.html
   — just fed page-specific content. These base opts turn on the features the
   shared module implements + styles entirely on its own (via injectChatExtras),
   so they light up on every page regardless of the host page's stylesheet:

     • activity        → the live "…" indicator under the input whose hover
                          read-out shows this-turn / conversation tokens, cache %
                          and cost (the "little three dots that show the tokens
                          and cost").
     • turns (+ search  → the Turns module (three-dot "Turns" Admin switch): every
       /share/notes)      turn listed with Fork / Jump / Share / Note. Docked as
                          its own sticky drawer to the RIGHT of the chat (the
                          sticky-drawer CSS is now shared via chat-history.js),
                          exactly like pages/wiseai.html.
     • history breakout → the three-dot "History & Projects" toggle reveals the
                          History module as a docked sticky drawer on the chat's
                          LEFT (never the in-chat overlay). Unlike wiseai.html,
                          the dock starts it tucked behind the chat (hidden).
     • sticky modules   → permanently ON (the menu switch is dropped): both
                          flanking drawers tuck in behind the chat card.

   Page cfg is spread AFTER these, so any page can still override a default. The
   "Overview cards" and "Intent chips" Admin switches appear
   automatically whenever a page passes scorecards / intents, and "History &
   Projects" is injected into the menu post-mount (injectWISEcodeAIHistoryMenuItem). */
const WISEAI_DOCK_PARITY = {
  activity: true,
  turns: true,
  turnsSearch: true,
  turnsShare: true,
  turnsNotes: true,
  turnsBreakout: true,
  turnsDockedControls: true,
  turnsBreakoutDefault: false,
  historyBreakout: true,
  historyBreakoutDefault: true,
  historyDockedControls: true,
  historyBreakoutHidden: true,
  stickyModules: true,
  stickyModulesDefault: true,
  stickyModulesMenu: false,
};

/* Add the "History & Projects" entry to the chat's three-dot menu (the shared
   module wires data-sc="history" to its in-module History sidebar, but leaves
   the menu row for the host to inject — mirroring pages/wiseai.html). Styled as
   an on/off switch so it reads back its open state, and sat at the top of the
   menu above a divider. Runs once per dock. */
function injectWISEcodeAIHistoryMenuItem(dock) {
  const morePop = dock.querySelector('.topbar-popover');
  if (!morePop || morePop.querySelector('[data-sc="history"]')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'topbar-menu-item sc-mcp-item';
  btn.setAttribute('data-sc', 'history');
  btn.setAttribute('role', 'menuitemcheckbox');
  btn.setAttribute('aria-checked', 'false');
  btn.innerHTML = '<span class="material-symbols-outlined topbar-menu-icon">history</span><span>History &amp; Projects</span><span class="sc-switch" aria-hidden="true"></span>';
  const div = document.createElement('div');
  div.className = 'topbar-menu-divider';
  morePop.insertBefore(div, morePop.firstChild);
  morePop.insertBefore(btn, div);
}

async function setupWISEcodeAIDock() {
  /* Pages can opt out of the persistent WISEcodeAI dock with
     `<body data-hide-wiseai>` (e.g. analytics-types.html). */
  if (document.body.dataset.hideWISEcodeAI) return;
  const row = document.getElementById('modules-row');
  if (!row || document.getElementById('wiseai-dock-panel')) return;

  let dockMod;
  try { dockMod = await ensureDockApi(); }
  catch (err) {
    console.error('[agent-overview] failed to load WISEcodeAI dock', err);
    return;
  }

  const dock = document.createElement('aside');
  dock.id = 'wiseai-dock-panel';
  dock.className = 'wiseai-dock wiseai-dock-open';
  dock.setAttribute('aria-label', 'WISEcodeAI™ chat');
  row.appendChild(dock);

  const isDashboard = document.body.dataset.productId === 'dashboard';
  const isReports = document.body.dataset.navId === 'reports';
  const isLibrary = document.body.dataset.navId === 'library';
  const isIngredients = document.body.dataset.navId === 'ingredients';
  const isVerification = document.body.dataset.navId === 'verification';
  const isGras = document.body.dataset.navId === 'gras-verification';
  const isMarketing = document.body.dataset.navId === 'marketing-assets';

  /* Account-level modules (and All Modules / verification / GRAS) ship a
     complete WISEcodeAI config on the flow we just loaded. */
  const navId = document.body.dataset.navId;
  const flowSpec = APP_NAV_FLOWS[navId];
  const flowWiseai = (flowSpec && flowSpec.wiseai && navFlowMod)
    ? flowSpec.wiseai(navFlowMod)
    : null;

  /* The Verification and Reports pages are a chat + surface pairing, so WISEcodeAI
     should be showing when you first NAVIGATE here — we clear any "collapsed"
     state carried over from another page. But if you explicitly close the chat
     ON this page, that must stick: a reload (incl. livereload during editing) or
     a back/forward must NOT re-open it, otherwise "Close conversation" looks like
     it just restarts the chat. So only force-open on a genuine navigation. */
  if ((isVerification || isGras || isReports || isLibrary || isIngredients || isMarketing || flowWiseai) && arrivedByNavigation()) {
    dockMod.writeWISEcodeAIDockState({ collapsed: false });
  }

  /* Pages can pin the WISEcodeAI dock to a fixed default via `<body data-default-dock>`
     so the chat always opens the same way regardless of the persisted preference
     — e.g. the chat + surface pages (verification, profile, invoices …) pin
     `left`, which means "keep the surface module(s) to the RIGHT of the chat".
     Because WISEcodeAI is always the centre anchor, the value is read as a pane
     count: the legacy left/center/right map onto 2/1/0 panes-to-the-right (and
     the new center/right1/right2 ids are accepted too). Written before mount so
     applyWISEcodeAIDockState() picks it up on restore. */
  const dockDefault = document.body.dataset.defaultDock;
  const DEFAULT_DOCK_RIGHT = { left: 2, center: 1, right: 0, center0: 0, right1: 1, right2: 2 };
  if (dockDefault in DEFAULT_DOCK_RIGHT) {
    dockMod.writeWISEcodeAIDockState({ right: DEFAULT_DOCK_RIGHT[dockDefault] });
  }

  let cfg;
  if (flowWiseai) {
    /* Account modules (and All Modules / verification / GRAS) ship a complete
       WISEcodeAI config (sub + intents + replies + onIntent), so use it as-is. */
    cfg = { ...flowWiseai };
  } else if (isMarketing) {
    cfg = {
      sub: 'Find and pull any co-branding asset — one tap.',
      chipsFlow: 'wrap',
      /* Large welcome cards alongside the small chips — reuse the same intents. */
      scorecards: {
        label: 'Your co-branding assets at a glance',
        cards: [
          { intent: 'shield', icon: 'verified_user', iconTone: 'brand', pill: { tone: 'up', icon: 'auto_awesome', text: 'Do next' }, title: 'Get the Non-UPF Verified\u2122 shield', desc: 'Digital and print shield lockups, ready to drop on your assets.', action: 'Get the shield', ask: 'Get the Non-UPF Verified\u2122 shield' },
          { intent: 'onesheet', icon: 'description', iconTone: 'brand', pill: { tone: 'up', icon: 'folder', text: 'Toolkit' }, title: 'Co-branded one-sheets', desc: 'Editable PSDs and print-ready PNGs, plus setup instructions.', action: 'Open the one-sheets', ask: 'Open the co-branded one-sheets' },
          { intent: 'social', icon: 'share', iconTone: 'brand', pill: { tone: 'up', icon: 'folder', text: 'Toolkit' }, title: 'Social media toolkit', desc: 'Post packs and instructions for every platform.', action: 'Grab the social toolkit', ask: 'Grab the social media toolkit' },
          { intent: 'brand_standards', icon: 'menu_book', iconTone: 'brand', pill: { tone: 'up', icon: 'menu_book', text: 'Guide' }, title: 'Brand standards guide', desc: 'Clear space, color and approved shield usage — the trademark use guide.', action: 'Download the guide', ask: 'Download the brand standards guide' },
          { intent: 'email_sms', icon: 'mail', iconTone: 'brand', pill: { tone: 'up', icon: 'folder', text: 'Toolkit' }, title: 'Email & SMS assets', desc: 'Ready-made banners and headers in multiple sizes, with setup instructions.', action: 'Get email & SMS assets', ask: 'Get email & SMS assets' },
          { intent: 'packaging', icon: 'inventory_2', iconTone: 'brand', pill: { tone: 'up', icon: 'folder', text: 'Resources' }, title: 'Packaging resources', desc: 'Shield examples and the trademark guide for getting the mark on-pack.', action: 'Open packaging resources', ask: 'Packaging resources' },
        ],
      },
      intents: MARKETING_WISEAI_INTENTS,
      /* Each reply is built by the marketing module so it can carry contextual
         download/open chips (the exact files just discussed) inside the thread —
         falls back to the static narration if the module hook isn't up yet. */
      intentReplies: Object.fromEntries(MARKETING_WISEAI_INTENTS.map(({ intent }) => [intent, () => {
        const rich = typeof window.__wiseMarketingReply === 'function' ? window.__wiseMarketingReply(intent) : '';
        return rich || MARKETING_WISEAI_REPLIES[intent];
      }])),
      /* Each chip performs the real on-page action (opens the toolkit, grabs
         the shield, expands the library) and still narrates it in the thread. */
      onIntent: (intent) => {
        if (typeof window.__wiseMarketingIntent === 'function') window.__wiseMarketingIntent(intent);
        return false;
      },
    };
  } else if (isReports) {
    cfg = {
      sub: 'Ask anything about your reports.',
      chipsFlow: 'wrap',
      /* Large welcome cards alongside the small chips — reuse the same intents. */
      scorecards: {
        label: 'Your reports at a glance',
        cards: [
          { intent: 'open_upf_report', icon: 'description', iconTone: 'brand', pill: { tone: 'up', icon: 'priority_high', text: 'Do next' }, title: 'Open the UPF report', desc: 'Jump straight to your live portfolio UPF report.', action: 'Open the UPF report', ask: 'Open the UPF report' },
          { intent: 'improve_score', icon: 'trending_up', iconTone: 'brand', pill: { tone: 'up', icon: 'trending_up', text: 'Improve' }, title: 'How do I improve my score?', desc: 'The fastest wins — swap a single flagged ingredient to flip products to Non-UPF.', action: 'How do I improve it?', ask: 'How do I improve it?' },
          { intent: 'explain_score', icon: 'help_outline', iconTone: 'brand', pill: { tone: 'up', icon: 'menu_book', text: 'Learn' }, title: 'Explain my UPF score', desc: 'How each product is classified against the NOVA scale — 92% lands Non-UPF.', action: 'Explain my score', ask: 'Explain my UPF score' },
          { intent: 'ingredient_quality', icon: 'science', iconTone: 'brand', pill: { tone: 'up', icon: 'insights', text: 'Deep dive' }, title: 'Ingredient quality', desc: 'Additives, clean-label share and seed oils — scored one metric at a time.', action: 'Ingredient quality', ask: 'Ingredient quality' },
          { intent: 'compare_products', icon: 'compare_arrows', iconTone: 'brand', pill: { tone: 'up', icon: 'compare_arrows', text: 'Compare' }, title: 'Compare two products', desc: 'Line up any two SKUs across UPF class, ingredient quality and flags.', action: 'Compare products', ask: 'Compare two products' },
          { variant: 'wiseai', intent: 'unlock_studio', icon: 'lock_open', pill: { tone: 'wiseai', icon: 'bolt', text: 'WISEcodeAI' }, title: 'Unlock the full Studio', desc: 'GRAS, Insights, Nutrient-Quality and Health-Outcomes reports across your portfolio.', action: 'Unlock the full Studio', ask: 'Unlock the full Studio' },
        ],
      },
      intents: REPORTS_WISEAI_INTENTS,
      /* Report chips get the same state-aware narration the Dashboard dock
         uses, while the report itself opens on the surface to the right. */
      intentReplies: {
        ...REPORTS_WISEAI_REPLIES,
        open_upf_report:      () => dashApi ? dashApi.dashReportChatReply('upf') : '',
        open_gras_report:     () => dashApi ? dashApi.dashReportChatReply('gras') : '',
        open_insights_report: () => dashApi ? dashApi.dashReportChatReply('insights') : '',
      },
      /* Report chips open the report INLINE on the Reports module surface
         (right of the chat) — openDashReport stashes the library markup and
         its "Back to reports" restores it. Return false so the dock adds the
         "you" line + the narration above. */
      onIntent: (intent) => {
        const reportCard = DASHBOARD_WISEAI_REPORTS[intent];
        if (reportCard && dashApi) {
          dashApi.openDashReport(reportCard, {
            mirror: false,
            host: document.getElementById('agent-main-scroll'),
            backLabel: 'Back to reports',
          });
          return false;
        }
        return false;
      },
    };
  } else if (isLibrary) {
    cfg = {
      sub: 'Search and open anything from your WISEcodeAI library.',
      chipsFlow: 'wrap',
      intents: LIBRARY_WISEAI_INTENTS,
      /* Count-aware narration built by the Library module (falls back to the
         static reply if the module hook isn't up yet). */
      intentReplies: Object.fromEntries(LIBRARY_WISEAI_INTENTS.map(({ intent }) => [intent, () => {
        const rich = typeof window.__wiseLibraryReply === 'function' ? window.__wiseLibraryReply(intent) : '';
        return rich || LIBRARY_WISEAI_REPLIES[intent];
      }])),
      /* Each chip applies the real filter on the Library grid (and syncs the
         score cards + funnel), then returns false so the dock still posts the
         "you" line + the narration above. */
      onIntent: (intent) => {
        if (typeof window.__wiseLibraryIntent === 'function') window.__wiseLibraryIntent(intent);
        return false;
      },
    };
  } else if (isIngredients) {
    /* Ingredient Browser — one intent chip for EVERY way you can slice the
       registry (search, GRAS status, category, processing level, allergens,
       flags) plus a plain-language "what is GRAS?". Each chip narrates the
       answer AND drives the browser to its right via the page's __ibIntent
       bridge, so anything you can do on the page is one tap away from WISEcodeAI. */
    cfg = {
      sub: 'Search, filter and understand any ingredient in the WISEcode registry.',
      chipsFlow: 'wrap',
      intents: INGREDIENTS_WISEAI_INTENTS,
      intentReplies: INGREDIENTS_WISEAI_REPLIES,
      onIntent: (intent) => {
        if (typeof window.__ibIntent === 'function') window.__ibIntent(intent);
        return false;
      },
    };
  } else if (isDashboard) {
    cfg = {
      sub: '',
      chipsFlow: 'wrap',
      /* Start with the large "at a glance" cards collapsed — the Dashboard
         welcome leads with just the headline + small intent chips, and the
         cards are one tap away from the three-dot menu. */
      cardsHiddenDefault: true,
      /* Large welcome cards alongside the small chips — reuse the same intents. */
      scorecards: {
        label: 'Your portfolio at a glance',
        cards: [
          { intent: 'claim_products', icon: 'verified_user', iconTone: 'brand', pill: { tone: 'up', icon: 'priority_high', text: 'Do next' }, title: 'Claim your products', desc: 'Take ownership of your UPCs to unlock verification and reports.', action: 'Claim your products', ask: 'Claim your products' },
          { intent: 'verify_upf', icon: 'verified', iconTone: 'brand', pill: { tone: 'up', icon: 'verified', text: 'Verify' }, title: 'Verify your Non-UPF products', desc: 'Run Non-UPF verification across your qualifying SKUs.', action: 'Verify Non-UPF', ask: 'Verify your Non-UPF products' },
          { intent: 'open_upf_report', icon: 'description', iconTone: 'brand', pill: { tone: 'up', icon: 'insights', text: 'Report' }, title: 'Open the UPF report', desc: 'See your portfolio\u2019s UPF classification — opens right here.', action: 'Open the UPF report', ask: 'Open the UPF report' },
          { intent: 'review_portfolio', icon: 'inventory_2', iconTone: 'brand', pill: { tone: 'up', icon: 'inventory_2', text: 'Review' }, title: 'Review your food portfolio', desc: 'Scan every SKU\u2019s status, compliance and ingredient health in one view.', action: 'Review portfolio', ask: 'Review your food portfolio' },
          { intent: 'verify_gras', icon: 'shield', iconTone: 'brand', pill: { tone: 'up', icon: 'shield', text: 'Verify' }, title: 'Verify your GRAS products', desc: 'Run GRAS verification across your qualifying ingredients and SKUs.', action: 'Verify GRAS', ask: 'Verify your GRAS products' },
          { intent: 'open_gras_report', icon: 'description', iconTone: 'brand', pill: { tone: 'up', icon: 'insights', text: 'Report' }, title: 'Open the GRAS report', desc: 'See your portfolio\u2019s GRAS documentation status — opens right here.', action: 'Open the GRAS report', ask: 'Open the GRAS report' },
          { intent: 'add_food', icon: 'add', iconTone: 'brand', pill: { tone: 'up', icon: 'add', text: 'Add' }, title: 'Add a food', desc: 'Bring a new product into your portfolio to classify and verify.', action: 'Add a food', ask: 'Add a food' },
        ],
      },
      intents: DASHBOARD_WISEAI_INTENTS,
      /* Every chip (and every welcome scorecard) carries its own narration so it
         always leaves a transcript in the thread. Report chips get a state-aware
         narration while the report opens on the surface to the right; the rest
         describe the on-page control they're about to fire. */
      intentReplies: {
        ...DASHBOARD_WISEAI_REPLIES,
        open_upf_report:      () => dashApi ? dashApi.dashReportChatReply('upf') : '',
        open_gras_report:     () => dashApi ? dashApi.dashReportChatReply('gras') : '',
        open_insights_report: () => dashApi ? dashApi.dashReportChatReply('insights') : '',
      },
      /* onIntent runs the moment the chip is tapped; onReply runs once the
         narration has landed in the thread. Report chips open INLINE on the
         dashboard surface (right of the chat) right away — the report is a
         companion to the answer, so it should be there as the reply arrives.
         Every OTHER chip returns false here so the dock posts the "you" line +
         the narration, then defers its real on-page control (navigate to the
         portfolio, start a verification flow, or open the logo editor) to
         onReply — so the transcript is always written before the chip acts. */
      onIntent: (intent) => {
        const reportCard = DASHBOARD_WISEAI_REPORTS[intent];
        if (reportCard && dashApi) { dashApi.openDashReport(reportCard, { mirror: false }); return false; }
        return false;
      },
      /* Fires exactly when a chip's narration is added to the thread. For the
         navigating / logo chips we then click the matching on-page control (the
         same `[data-dash-action]` button the brand overview renders), so the
         chip does precisely what the button does — just after the user has seen
         the transcript. Typed messages have no intent, so nothing fires for them;
         report chips aren't in the actions map, so they stay on this page. */
      onReply: (intent) => {
        const action = DASHBOARD_WISEAI_ACTIONS[intent];
        if (!action) return;
        const el = document.querySelector(`#agent-main-scroll [data-dash-action="${action}"]`);
        if (el) setTimeout(() => el.click(), 1400);
      },
    };
  } else {
    cfg = {
      sub: '',
      onIntent: (intent) => {
        const go = {
          customer_profile: 'wiseai.html',
          resume_prompt: 'wiseai.html',
          registry_home: 'wiseai.html',
        }[intent];
        if (go) { window.location.href = go; return true; }
        return false;
      },
    };
  }

  /* Mount with the shared feature-parity base opts under the page's own cfg, so
     every dock carries the same components + three-dot actions as wiseai.html
     (tokens/cost activity read-out, Turns module, Admin toggles) while keeping
     its page-specific content (sub, intents, scorecards, onIntent …). */
  let wiseai = null;
  try {
    wiseai = dockMod.mountWISEcodeAIDock(dock, { ...WISEAI_DOCK_PARITY, ...cfg });
    injectWISEcodeAIHistoryMenuItem(dock);
    if (flowSpec && flowSpec.setChat && navFlowMod) flowSpec.setChat(navFlowMod)(wiseai);
    if (isDashboard && dashApi) dashApi.setDashChat(wiseai);
  } catch (err) {
    console.error('[agent-overview] failed to mount WISEcodeAI dock', err);
  }
}

/* ====================================================================
   Trailing rail.
     • Alerts (bell)         → opens an Alerts MODULE in #modules-row,
                               same shell as the agent panels.
     • More (three-dot)      → opens a small POPOVER anchored to the
                               button, just like the avatar / user menu.
==================================================================== */

const NOTIFICATIONS = [
  {
    title: 'Verification ready: Sample Co.',
    sub: '2m ago · Portfolio Agent',
    icon: 'verified',
    tone: 'green',
  },
  {
    title: '3 ingredient flags need review',
    sub: '14m ago · Ingredient Parsing Agent',
    icon: 'science',
    tone: 'amber',
  },
  {
    title: 'New trend signal: low-FODMAP snacking',
    sub: '1h ago · Trends Agent',
    icon: 'trending_up',
    tone: 'cyan',
  },
  {
    title: 'Reformulation simulation complete',
    sub: '3h ago · Audit & Reformulation Agent',
    icon: 'fact_check',
    tone: 'blue',
  },
];

function escHtmlSafe(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

let alertsController = null;

function mountAlertsPanel(notifBtn) {
  const row = document.getElementById('modules-row');
  alertsController = mountNotificationsPanel({
    host: row,
    panelId: 'alerts-panel',
    openClass: 'alerts-open',
    items: NOTIFICATIONS,
    renderOptions: {
      subtitle: `${NOTIFICATIONS.length} new across your agents`,
    },
    onMarkAllRead(api) {
      notifBtn?.classList.add('is-read');
      closeSidePanel(api.panel, 'alerts-open', notifBtn);
    },
    onItem({ item, row: itemRow, panel }) {
      itemRow.classList.add('is-read');
      closeSidePanel(panel, 'alerts-open', notifBtn);
      const body = openAgSheet({ eyebrow: 'Alert', title: item.title, icon: item.icon });
      body.innerHTML = `
        <p class="ag-sheet-lead">${escHtmlSafe(item.sub)}</p>
        <p class="ag-sheet-lead">Open the WISEowl chat to act on this alert with the relevant agent.</p>
        <div class="ag-sheet-actions">
          <button class="agent-cta agent-cta--primary" data-sheet-nav="wiseai.html"><span class="material-symbols-outlined">chat</span>Open in WISEowl chat</button>
          <button class="agent-cta agent-cta--ghost" data-sheet-close="1">Dismiss</button>
        </div>`;
    },
  });
  return alertsController;
}

/* Reveal the Alerts side module (mounted + wired in setupTrailingRail). Now
   triggered from the avatar menu instead of a standalone top-bar bell. */
function openAlertsPanel() {
  if (!alertsController) mountAlertsPanel();
  alertsController?.open();
}

function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

/* Theme + text-size accessibility controls live in the Appearance popover. */
function setDarkMode(on) {
  const html = document.documentElement;
  html.classList.toggle('dark', on);
  try { localStorage.setItem('wise-theme', on ? 'dark' : 'light'); } catch {}
  refreshAppearancePopover();
}

function renderMorePopover() {
  const isDashboard = document.body.dataset.productId === 'dashboard';
  const bannerItem = isDashboard
    ? `
    <button type="button" class="topbar-menu-item" data-action="update-banner">
      <span class="material-symbols-outlined topbar-menu-icon">image</span>
      <span>Update brand banner</span>
    </button>
    <div class="topbar-menu-divider"></div>`
    : '';
  /* Admin-only controls — the two hero view switches (moved off the banner) plus
     the invite action. Highlighted pink and flagged with a teensy ADMIN badge. */
  const adminItems = isDashboard
    ? `
    <button type="button" class="topbar-menu-item topbar-menu-item--admin topbar-menu-item--toggle" role="switch" aria-checked="${dashApi ? dashApi.isBrandCompareActive() : false}" data-action="toggle-brand">
      <span class="material-symbols-outlined topbar-menu-icon">insights</span>
      <span>Bad Scores / High Numbers</span>
      <span class="topbar-menu-badge">ADMIN</span>
      <span class="topbar-menu-switch" aria-hidden="true"><span class="topbar-menu-switch-thumb"></span></span>
    </button>
    <button type="button" class="topbar-menu-item topbar-menu-item--admin topbar-menu-item--toggle" role="switch" aria-checked="${dashApi ? dashApi.isStarsViewActive() : false}" data-action="toggle-stars">
      <span class="material-symbols-outlined topbar-menu-icon">star</span>
      <span>Guiding Stars</span>
      <span class="topbar-menu-badge">ADMIN</span>
      <span class="topbar-menu-switch" aria-hidden="true"><span class="topbar-menu-switch-thumb"></span></span>
    </button>
    <div class="topbar-menu-divider"></div>`
    : '';
  return `
    ${bannerItem}
    <button type="button" class="topbar-menu-item" data-action="invite-member">
      <span class="material-symbols-outlined topbar-menu-icon">person_add</span>
      <span>Invite team member</span>
    </button>
    ${adminItems}
    <button type="button" class="topbar-menu-item" data-action="export">
      <span class="material-symbols-outlined topbar-menu-icon">download</span>
      <span>Export overview</span>
    </button>
    <button type="button" class="topbar-menu-item" data-action="share">
      <span class="material-symbols-outlined topbar-menu-icon">share</span>
      <span>Share</span>
    </button>`;
}

function closeSidePanel(panelEl, openClass, btnEl) {
  if (!panelEl) return;
  panelEl.classList.remove(openClass);
  if (btnEl) {
    btnEl.setAttribute('aria-expanded', 'false');
    btnEl.classList.remove('lir-active');
  }
}

function ensureMorePopover(moreBtn) {
  let pop = document.getElementById('topbar-more-popover');
  if (pop) return pop;
  const wrap = moreBtn?.closest('.topbar-menu-wrap');
  if (!wrap) return null;
  pop = document.createElement('div');
  pop.id = 'topbar-more-popover';
  pop.className = 'topbar-popover hidden';
  pop.setAttribute('role', 'menu');
  pop.setAttribute('aria-labelledby', moreBtn.id || 'topbar-more-btn');
  wrap.appendChild(pop);
  return pop;
}

/* The page-level header actions, shared by the (legacy) top-bar More popover
   and the main-panel header menu so every entry point behaves identically. */
function runMoreAction(action) {
  switch (action) {
    case 'update-banner':
      if (dashApi) dashApi.editBrandBanner();
      break;
    case 'invite-member':
      window.location.href = 'quick-invite.html';
      break;
    case 'toggle-brand':
      if (dashApi) dashApi.toggleBrandCompare();
      syncDashToggleItems();
      break;
    case 'toggle-stars':
      if (dashApi) dashApi.toggleStarsView();
      syncDashToggleItems();
      break;
    case 'export':
      exportOverview(getAgent(document.body.dataset.agentId)?.label || 'WISEcode');
      break;
    case 'share':
      shareOverview();
      break;
  }
}

/* Reflect the live brand-compare / Guiding-Stars state onto every rendered
   toggle menu item (the popover persists across dashboard re-renders, so the
   switch state must be pushed in after a toggle). */
function syncDashToggleItems() {
  if (!dashApi) return;
  const brand = String(dashApi.isBrandCompareActive());
  const stars = String(dashApi.isStarsViewActive());
  document.querySelectorAll('[data-action="toggle-brand"]').forEach((el) => el.setAttribute('aria-checked', brand));
  document.querySelectorAll('[data-action="toggle-stars"]').forEach((el) => el.setAttribute('aria-checked', stars));
}

/* ====================================================================
   Main-panel header controls.
     Every pane/module on the app carries the same header cluster — a
     more-options (⋯) menu + a width/resize toggle. The central agent /
     dashboard panel was the only one missing it, so its header (and the
     pinned controls kept in headerless "header-float" mode) had no
     functions. This mirrors the WISEcodeAI dock / portfolio module clusters
     so the main panel reads + behaves like every other pane.
==================================================================== */

/* The canonical four-tier width control shared by every module in the app:
   single → double → fill → custom. `#agent-main` shares
   the row with the fixed WISEcodeAI dock, so it DEFAULTS to fill (tier 3) — the
   full-width surface every admin/overview page opens with — and the control
   steps it through double / single reading widths, then custom,
   before wrapping back to fill. On All Modules (no chat neighbour) the
   rest state is persisted per module. Tier → class: 0 narrow · 1 wide ·
   3 fill · 4 custom (pinned current width). Triple is gone. */
const MAIN_WIDTH_ICONS = ['width_normal', 'width_wide', 'width_wide', 'width_full', 'fit_width'];
const MAIN_WIDTH_TITLES = [
  'Width (single) — tap to widen',
  'Width (double) — tap to widen',
  'Width (double) — tap to widen',
  'Width (fill) — tap to widen',
  'Width (custom) — drag to any size',
];

/* FILL is the load default for the main module when nothing has been saved
   for this page. Each module persists its own rest state (see WPaneWidth);
   a leftover shared key ('wise-main-width' / 'wise-all-modules-width') must
   never come back — that is what pinned every page to one stray width. */
const MAIN_WIDTH_DEFAULT = 3;   // fill — see WPaneWidth tiers in js/pane-width.js
let mainWidthTier = MAIN_WIDTH_DEFAULT;

function readMainWidth() {
  const main = document.getElementById('agent-main');
  const W = window.WPaneWidth;
  if (W && W.readSavedTier && main) {
    const saved = W.readSavedTier(main);
    if (saved != null) return W.clamp(saved);
  }
  return W
    ? W.clamp(mainWidthTier)
    : Math.max(0, Math.min(4, mainWidthTier === 2 ? 1 : mainWidthTier));
}

/* Reflect the width tier onto the module container itself (drives the WHOLE
   module's width in CSS — header, border + body, not just the inner content)
   and the toggle button's icon/state. */
function applyMainWidth(tier) {
  /* tier 0 = single (820 reading) · 1 = double (1180) ·
     3 = fill (no cap, whole row) · 4 = custom. Apply to #agent-main — the outer
     flex slot/card — so the entire module resizes; the inner content fills
     whatever width the module ends up at. */
  mainWidthTier = window.WPaneWidth ? window.WPaneWidth.clamp(tier) : Math.max(0, Math.min(4, tier === 2 ? 1 : (tier | 0)));
  tier = mainWidthTier;
  const main = document.getElementById('agent-main');
  if (main) {
    main.classList.toggle('main-w-narrow', tier === 0);
    main.classList.toggle('main-w-wide', tier === 1);
    main.classList.toggle('main-w-triple', false);
    const W = window.WPaneWidth;
    if (W) W.applyClasses(main, tier, 'panel');
    else {
      main.classList.toggle('panel-wide', tier >= 1 && tier < 4);
      main.classList.toggle('panel-triple', tier >= 2 && tier < 4);
      main.classList.toggle('panel-fill', tier === 3);
      main.classList.toggle('panel-custom', tier === 4);
    }
  }
  const btn = document.getElementById('agent-main-width-btn');
  if (btn) {
    const W = window.WPaneWidth;
    if (W && W.syncButton) W.syncButton(btn, tier);
    else {
      btn.classList.toggle('is-on', tier >= 1);
      btn.setAttribute('aria-pressed', tier >= 1 ? 'true' : 'false');
      btn.title = MAIN_WIDTH_TITLES[tier] || MAIN_WIDTH_TITLES[3];
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = MAIN_WIDTH_ICONS[tier];
    }
  }
}

function nextMainWidth(tier) {
  if (window.WPaneWidth) return window.WPaneWidth.next(tier);
  if (tier <= 0) return 1;
  if (tier === 1 || tier === 2) return 3;
  if (tier === 3) return 4;
  return 0;
}

function cycleMainWidth() {
  const next = nextMainWidth(readMainWidth());
  applyMainWidth(next);
  const main = document.getElementById('agent-main');
  if (window.WPaneWidth && window.WPaneWidth.saveTier && main) {
    window.WPaneWidth.saveTier(main, next);
  }
}

/* Markup for the main-panel control cluster — same classes (so the same
   shared styles apply) as the WISEcodeAI dock's `.sc-topbar-controls`. */
function mainPanelControlsHTML() {
  return `
    <div class="panel-controls">
      <div class="panel-more-wrap">
        <button type="button" class="panel-more-btn" id="agent-main-more-btn" aria-haspopup="menu" aria-expanded="false" aria-controls="agent-main-more-pop" title="More options" aria-label="Panel options"><span class="material-symbols-outlined">more_vert</span></button>
        <div class="topbar-popover hidden" id="agent-main-more-pop" role="menu">${renderMorePopover()}</div>
      </div>
      <button type="button" class="panel-width-toggle-btn is-on is-width-fill" id="agent-main-width-btn" aria-pressed="true" title="${escHtml(MAIN_WIDTH_TITLES[3])}" aria-label="Panel width"><span class="material-symbols-outlined">${MAIN_WIDTH_ICONS[3]}</span></button>
    </div>`;
}

/* Append the control cluster to the main-panel header and wire it up. Safe to
   call once after the header markup is in place. */
function setupMainPanelControls() {
  const headerEl = document.getElementById('agent-main-header');
  if (!headerEl || headerEl.querySelector('.panel-controls')) return;
  headerEl.insertAdjacentHTML('beforeend', mainPanelControlsHTML());

  const tier = readMainWidth();
  applyMainWidth(tier);
  /* pane-width.js is injected async from agent-menu — re-apply once it lands. */
  if (!window.WPaneWidth) {
    const retry = () => {
      if (window.WPaneWidth) applyMainWidth(readMainWidth());
      else requestAnimationFrame(retry);
    };
    requestAnimationFrame(retry);
  }

  const widthBtn = headerEl.querySelector('#agent-main-width-btn');
  if (widthBtn) widthBtn.addEventListener('click', (e) => { e.stopPropagation(); cycleMainWidth(); });

  const moreWrap = headerEl.querySelector('.panel-more-wrap');
  const moreBtn = headerEl.querySelector('#agent-main-more-btn');
  const morePop = headerEl.querySelector('#agent-main-more-pop');
  if (moreBtn && morePop) {
    const closePop = () => {
      morePop.classList.add('hidden');
      moreBtn.classList.remove('is-open');
      moreBtn.setAttribute('aria-expanded', 'false');
    };
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const opening = morePop.classList.contains('hidden');
      morePop.classList.toggle('hidden', !opening);
      moreBtn.classList.toggle('is-open', opening);
      moreBtn.setAttribute('aria-expanded', opening ? 'true' : 'false');
    });
    morePop.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]');
      if (!action) return;
      const act = action.dataset.action;
      /* Keep the menu open on the pink toggles so both views can be switched in
         one pass; every other action dismisses it. */
      if (act !== 'toggle-brand' && act !== 'toggle-stars') closePop();
      runMoreAction(act);
    });
    document.addEventListener('click', (e) => {
      if (morePop.classList.contains('hidden')) return;
      if (moreWrap && moreWrap.contains(e.target)) return;
      closePop();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePop(); });
  }
}

function setupTrailingRail() {
  const notifBtn = document.getElementById('topbar-notif-btn');
  const moreBtn = document.getElementById('topbar-more-btn');

  /* Alerts is a side module; mount it once so it participates in the
     same layout pipeline as the menu and the agent main panel. */
  const alerts = mountAlertsPanel(notifBtn);
  const alertsPanel = alerts?.panel;

  /* More is a small popover anchored to the three-dot button — same
     pattern as the avatar / user menu. */
  const morePop = ensureMorePopover(moreBtn);
  if (morePop) morePop.innerHTML = renderMorePopover();

  /* The Alerts icon always reveals the alerts panel and scrolls to it — it
     never closes it on click (close via "mark all read" or opening an alert).
     This makes a single click transport you there whether it was on or off. */
  function toggleAlerts() {
    if (!alerts) return;
    alerts.open();
    if (notifBtn) {
      notifBtn.setAttribute('aria-expanded', 'true');
      notifBtn.classList.add('lir-active');
      notifBtn.classList.add('is-read');
    }
  }

  function closeMorePopover() {
    if (!morePop) return;
    morePop.classList.add('hidden');
    if (moreBtn) {
      moreBtn.setAttribute('aria-expanded', 'false');
      moreBtn.classList.remove('lir-active');
    }
  }

  function toggleMorePopover() {
    if (!morePop) return;
    const opening = morePop.classList.contains('hidden');
    morePop.classList.toggle('hidden', !opening);
    if (moreBtn) {
      moreBtn.setAttribute('aria-expanded', opening ? 'true' : 'false');
      moreBtn.classList.toggle('lir-active', opening);
    }
  }

  if (notifBtn) {
    notifBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleAlerts(); });
  }
  if (moreBtn) {
    moreBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMorePopover(); });
  }

  if (morePop) {
    morePop.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]');
      if (!action) return;
      const act = action.dataset.action;
      if (act !== 'toggle-brand' && act !== 'toggle-stars') closeMorePopover();
      runMoreAction(act);
    });
  }

  /* Click-outside closes the More popover (avatar-style). The Alerts
     module is independent and stays open until its bell is toggled. */
  document.addEventListener('click', (e) => {
    if (!morePop || morePop.classList.contains('hidden')) return;
    const wrap = moreBtn?.closest('.topbar-menu-wrap');
    if (wrap && wrap.contains(e.target)) return;
    closeMorePopover();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    closeSidePanel(alertsPanel, 'alerts-open', notifBtn);
    closeMorePopover();
  });
}

/* ====================================================================
   MC / avatar popover — user menu (profile, alerts, sign out).
==================================================================== */

let activeAvatarPopover = null;
let activeAvatarAnchor  = null;

function closeAvatarPopover() {
  if (!activeAvatarPopover) return;
  activeAvatarAnchor?.classList.remove('is-open');
  activeAvatarPopover.classList.remove('open');
  const p = activeAvatarPopover;
  setTimeout(() => p.remove(), 210);
  activeAvatarPopover = null;
  activeAvatarAnchor  = null;
}

function renderAvatarBody(pop) {
  pop.innerHTML = buildUserMenuBody({ name: APP_IDENTITY?.name });
}

function openAvatarPopover(anchor) {
  if (activeAvatarAnchor === anchor) { closeAvatarPopover(); return; }
  closeAvatarPopover();
  closeAppearancePopover();
  const pop = document.createElement('div');
  pop.className = 'wise-popover';
  document.body.appendChild(pop);
  renderAvatarBody(pop);
  if (isMenuFooterAnchor(anchor)) positionPopoverInMenuPanel(pop, anchor);
  else positionPopoverForTopbar(pop, anchor);
  requestAnimationFrame(() => pop.classList.add('open'));
  activeAvatarPopover = pop;
  activeAvatarAnchor  = anchor;
  anchor.classList.add('is-open');

  pop.addEventListener('click', (ev) => {
    const notifItem = ev.target.closest('[data-pop-action="notifications"]');
    if (notifItem && pop.contains(notifItem)) {
      ev.stopPropagation();
      document.querySelector('.topbar-profile')?.classList.add('is-read');
      closeAvatarPopover();
      openAlertsPanel();
      return;
    }
    const signoutItem = ev.target.closest('[data-pop-action="signout"]');
    if (signoutItem && pop.contains(signoutItem)) {
      ev.stopPropagation();
      closeAvatarPopover();
      performSignOut();
      return;
    }
    /* Each remaining menu row now opens its own module page. The Alerts quick
       action still opens the in-place side panel (handled above); the "Agents"
       quick action and the list items navigate to their landing pages. */
    const navItem = ev.target.closest('[data-pop-action]');
    if (navItem && pop.contains(navItem)) {
      const dest = {
        agents: 'agents.html',
        profile: 'profile.html',
        invoices: 'invoices.html',
        'marketing-assets': 'marketing-assets.html',
        support: 'support.html',
        prefs: 'preferences.html',
        apikeys: 'api-keys.html',
        help: 'support.html',
        docs: 'docs.html',
      }[navItem.dataset.popAction];
      if (dest) {
        ev.stopPropagation();
        closeAvatarPopover();
        window.location.href = dest;
        return;
      }
    }
    if (ev.target.closest('.wise-popover-header, .wise-popover-divider, .wise-popover-actions, .wise-pop-vline')) {
      ev.stopPropagation();
      return;
    }
    closeAvatarPopover();
  });
}

/* ====================================================================
   Appearance popover — text size + light/dark mode (crossword icon).
==================================================================== */

let activeAppearancePopover = null;
let activeAppearanceAnchor  = null;

function closeAppearancePopover() {
  if (!activeAppearancePopover) return;
  activeAppearanceAnchor?.classList.remove('is-open');
  activeAppearanceAnchor?.setAttribute('aria-expanded', 'false');
  activeAppearancePopover.classList.remove('open');
  const p = activeAppearancePopover;
  setTimeout(() => p.remove(), 210);
  activeAppearancePopover = null;
  activeAppearanceAnchor  = null;
}

function refreshAppearancePopover() {
  if (!activeAppearancePopover) return;
  renderAppearanceBody(activeAppearancePopover);
}

function renderAppearanceBody(pop) {
  /* Only offer the "WISEcodeAI chat" on/off toggle where the shared dock actually
     lives on the page (pages can opt out via `<body data-hide-wiseai>`). */
  const hasWISEcodeAIDock = !!document.getElementById('wiseai-dock-panel');
  pop.innerHTML = buildAppearanceBody({
    showPivot: true,
    isPivoted: isMenuPivoted(),
    isDark: isDarkMode(),
    wiseaiDockMode: dockApi ? dockApi.wiseaiDockMode() : 'center',
    showWISEcodeAIChat: hasWISEcodeAIDock,
    wiseaiChatOn: dockApi ? !dockApi.isWISEcodeAIClosed() : true,
  });
}

function openAppearancePopover(anchor) {
  if (activeAppearanceAnchor === anchor) { closeAppearancePopover(); return; }
  closeAppearancePopover();
  closeAvatarPopover();
  const pop = document.createElement('div');
  pop.className = 'wise-popover';
  document.body.appendChild(pop);
  renderAppearanceBody(pop);
  if (isMenuFooterAnchor(anchor)) positionPopoverInMenuPanel(pop, anchor);
  else positionPopoverForTopbar(pop, anchor);
  requestAnimationFrame(() => pop.classList.add('open'));
  activeAppearancePopover = pop;
  activeAppearanceAnchor  = anchor;
  anchor.classList.add('is-open');
  anchor.setAttribute('aria-expanded', 'true');

  wireAppearancePopover(pop, {
    render: () => renderAppearanceBody(pop),
    onClose: closeAppearancePopover,
    togglePivot: () => toggleMenuPivot(),
    toggleTheme: () => setDarkMode(!isDarkMode()),
    setDock: (m) => { ensureDockApi().then((d) => d.setWISEcodeAIDockPosition(m)); },
    /* Off → fresh-restart the chat back into its welcome state; on → close it
       (folds to the floating owl, same as "Close conversation"). */
    toggleWiseaiChat: () => {
      ensureDockApi().then((d) => {
        if (d.isWISEcodeAIClosed()) d.restartWISEcodeAIChat();
        else d.setWISEcodeAICollapsed(true);
      });
    },
  });
}

function setupAvatarPopover() {
  const avatarBtn = document.querySelector('.topbar-profile');
  if (!avatarBtn) return;
  avatarBtn.setAttribute('role', 'button');
  if (!avatarBtn.hasAttribute('tabindex')) avatarBtn.setAttribute('tabindex', '0');
  if (!avatarBtn.hasAttribute('aria-label')) avatarBtn.setAttribute('aria-label', 'User menu');
  avatarBtn.setAttribute('aria-haspopup', 'menu');
  avatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openAvatarPopover(avatarBtn);
  });
  avatarBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      avatarBtn.click();
    }
  });
  document.addEventListener('click', (e) => {
    if (activeAvatarPopover && !activeAvatarPopover.contains(e.target) && !activeAvatarAnchor?.contains(e.target)) {
      closeAvatarPopover();
    }
    if (activeAppearancePopover && !activeAppearancePopover.contains(e.target) && !activeAppearanceAnchor?.contains(e.target)) {
      closeAppearancePopover();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAvatarPopover();
      closeAppearancePopover();
    }
  });
  document.addEventListener('wise:menu-footer-profile', (e) => {
    openAvatarPopover(e.detail.anchor);
  });
  document.addEventListener('wise:menu-footer-layout', (e) => {
    openAppearancePopover(e.detail.anchor);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bootstrapAgentPage();
  setupAvatarPopover();
  applyStoredTextSize();
  initLirTooltip();
});
