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
import { initWISEaiTooltips } from './wiseai-tooltip.js';
import { mountTopbar, isMenuFooterAnchor, positionPopoverInMenuPanel, positionPopoverForTopbar, applyMinimalUi, isMinimalUiOn, restoreMinimalUi, applyHeaderFloat, isHeaderFloatOn, applyFullBleed, isFullBleedOn, applyColorblind, isColorblindOn, pageAppearanceDefault } from './topbar.js';
import { isJamStripOn, applyJamStrip } from './jam-strip.js';
import { mountWISEaiDock, setWISEaiDockPosition, wiseaiDockMode, writeWISEaiDockState, isWISEaiClosed, restartWISEaiChat, setWISEaiCollapsed } from './wiseai-dock.js';
import { buildAppearanceBody } from './appearance-menu.js';
import { mountNotificationsPanel } from './notifications-panel.js';
import { setTextSize, applyStoredTextSize } from './text-size.js';
import { renderDashboardHome, editBrandBanner, setDashChat, openDashReport, dashReportChatReply } from './dashboard-home.js';
import { renderVerificationFlow, VERIFICATION_WISEAI } from './verification-flow.js';
import { renderGrasVerificationFlow, GRAS_WISEAI, setGrasChat } from './gras-verification-flow.js';
import { renderMarketingAssets } from './marketing-assets-flow.js';
import { renderProfile, PROFILE_WISEAI, setProfileChat } from './profile-flow.js';
import { renderPreferences, PREFERENCES_WISEAI } from './preferences-flow.js';
import { renderApiKeys, API_KEYS_WISEAI } from './api-keys-flow.js';
import { renderInvoices, INVOICES_WISEAI, setInvoicesChat } from './invoices-flow.js';
import { renderHelp, HELP_WISEAI } from './help-flow.js';
import { renderDocs, DOCS_WISEAI } from './docs-flow.js';
import { renderAgents, AGENTS_WISEAI } from './agents-flow.js';
import { renderAlerts, ALERTS_WISEAI } from './alerts-flow.js';

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

function agToast(msg, icon = 'check_circle') {
  let wrap = document.getElementById('ag-toast-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.id = 'ag-toast-wrap'; document.body.appendChild(wrap); }
  const t = document.createElement('div');
  t.className = 'ag-toast';
  t.innerHTML = `<span class="material-icons">${escHtml(icon)}</span><span>${escHtml(msg)}</span>`;
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
      <span class="ag-sheet-icon"><span class="material-icons">${escHtml(icon)}</span></span>
      <div class="ag-sheet-titles">
        <div class="ag-sheet-eyebrow">${escHtml(eyebrow)}</div>
        <div class="ag-sheet-title">${escHtml(title)}</div>
      </div>
      <button class="ag-sheet-close" data-sheet-close="1" aria-label="Close"><span class="material-icons">close</span></button>
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
  const { steps = [], doneTitle = 'Done', doneText = '', doneIcon = 'check_circle', cta = null } = cfg;
  host.innerHTML = `
    <div class="ag-flow">
      <div class="ag-flow-bar"><span class="ag-flow-fill" id="ag-flow-fill"></span></div>
      <div class="ag-flow-pct" id="ag-flow-pct">0%</div>
      <ul class="ag-flow-steps">
        ${steps.map((s) => `<li class="ag-flow-step"><span class="ag-flow-dot"><span class="material-icons">radio_button_unchecked</span></span><span>${escHtml(s)}</span></li>`).join('')}
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
        const ic = prev?.querySelector('.material-icons');
        if (ic) ic.textContent = 'check_circle';
      }
      if (i < n) {
        const cur = stepEls[i];
        cur?.classList.add('is-active');
        const ic = cur?.querySelector('.material-icons');
        if (ic) ic.textContent = 'autorenew';
        const target = Math.round(((i + 1) / n) * 100);
        if (fill) fill.style.width = target + '%';
        if (pct) pct.textContent = target + '%';
        i++;
        setTimeout(tick, 560);
      } else {
        host.innerHTML = `
          <div class="ag-flow-done">
            <div class="ag-flow-done-icon"><span class="material-icons">${escHtml(doneIcon)}</span></div>
            <div class="ag-flow-done-title">${escHtml(doneTitle)}</div>
            ${doneText ? `<p class="ag-flow-done-text">${doneText}</p>` : ''}
            <div class="ag-sheet-actions">
              ${cta ? `<button class="agent-cta agent-cta--primary" data-sheet-nav="${escHtml(cta.href)}"><span class="material-icons">${escHtml(cta.icon || 'chat')}</span>${escHtml(cta.label)}</button>` : ''}
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
          <span class="ag-detail-ic"><span class="material-icons">${escHtml(k.icon)}</span></span>
          <div><div class="ag-detail-name">${escHtml(k.label)}</div><div class="ag-detail-sub">${escHtml(k.description)}</div></div>
        </div>`).join('')}`
    : '<p class="ag-sheet-lead">This agent operates on its own — capabilities are delivered directly.</p>';
  const body = openAgSheet({ eyebrow: 'Agent', title: a.label, icon: a.icon });
  body.innerHTML = `
    <p class="ag-sheet-lead">${escHtml(a.description)}</p>
    ${kidsHtml}
    <div class="ag-sheet-actions">
      <button class="agent-cta agent-cta--primary" data-sheet-nav="ai-chat.html"><span class="material-icons">chat</span>Open in WISEowl chat</button>
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
      <button class="agent-cta agent-cta--primary" id="ag-mem-send"><span class="material-icons">send</span>Send invite</button>
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
              <span class="agent-child-icon"><span class="material-icons">${escHtml(gk.icon)}</span></span>
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
        <span class="agent-card-icon"><span class="material-icons">${escHtml(agent.icon)}</span></span>
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
        <span class="agent-hero-pill"><span class="material-icons">${escHtml(agent.icon)}</span>${escHtml(agent.label)}</span>
        <span class="agent-hero-pill"><span class="material-icons">hub</span>${childCount} agent${childCount === 1 ? '' : 's'}</span>
        <span class="agent-hero-pill"><span class="material-icons">workspaces</span>WISEcode AI orchestrator</span>
      </div>
      <div class="agent-cta-row">
        <a class="agent-cta agent-cta--primary" href="ai-chat.html">
          <span class="material-icons">chat</span>
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

/* A blank shell page (menu + top bar + WISEai dock, empty main) used for
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
    const icon = btn.querySelector('.material-icons');
    if (icon) icon.textContent = 'chevron_right';
  }
}

/** Apply `<body data-default-…>` appearance overrides declared by the host page. */
function applyBodyAppearanceDefaults() {
  const pivot = pageAppearanceDefault('defaultPivot');
  if (pivot !== null) setMenuPivot(pivot);
  const fullBleed = pageAppearanceDefault('defaultFullBleed');
  if (fullBleed !== null) applyFullBleed(fullBleed);
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
      ? `<span class="agent-main-icon"><span class="material-icons">dashboard</span></span>
         <div class="agent-main-titles">
           <div class="agent-main-title">Dashboard</div>
           <div class="agent-main-sub">Brand Intelligence</div>
         </div>`
      : '';
  }
  const mainEl = document.getElementById('agent-main-scroll');
  if (mainEl) {
    mainEl.innerHTML = '';
    /* The top-level Dashboard renders the Brand Intelligence overview; other
       blank product shells stay empty. */
    if (isDashboard) renderDashboardHome(mainEl);
  }

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
  setupWISEaiDock();
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
  const name = (user && user.name) || 'Arthur Krupsky';
  const email = (user && user.email) || 'akrupsky@wisecode.ai';
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
     module content. The shell (nav + appearance + profile) is fully wired. */
  const mainEl = document.getElementById('agent-main-scroll');
  if (navId === 'verification') {
    /* Non-UPF Verification flow (the first of several verification types).
       Renders the Select → Attest → Payment wizard beside the WISEai dock. */
    document.title = 'WISE · Non-UPF Verification';
    if (mainEl) renderVerificationFlow(mainEl);
  } else if (navId === 'gras-verification') {
    /* GRAS Verification flow (the ingredient-level verification type).
       Renders the 5-step documentation wizard beside the WISEai dock. */
    document.title = 'WISE · GRAS Verification';
    if (mainEl) renderGrasVerificationFlow(mainEl);
  } else if (navId === 'marketing-assets') {
    /* Marketing Assets — a nested-table browser of the co-branding toolkit
       (one-sheets, packaging, social, email/SMS, and the Non-UPF shield). */
    document.title = 'WISE · Marketing Assets';
    if (mainEl) renderMarketingAssets(mainEl);
  } else if (navId === 'profile') {
    /* My Profile — editable identity card + Activity/Security tabs. */
    document.title = 'WISE · My Profile';
    if (mainEl) renderProfile(mainEl);
  } else if (navId === 'preferences') {
    /* Preferences — appearance, notifications, workspace, accessibility. */
    document.title = 'WISE · Preferences';
    if (mainEl) renderPreferences(mainEl);
  } else if (navId === 'api-keys') {
    /* API keys — create / reveal / revoke keys, usage, and docs. */
    document.title = 'WISE · API Keys';
    if (mainEl) renderApiKeys(mainEl);
  } else if (navId === 'invoices') {
    /* Invoices & Downloads — filterable billing board + downloads. */
    document.title = 'WISE · Invoices & Downloads';
    if (mainEl) renderInvoices(mainEl);
  } else if (navId === 'help') {
    /* Help — search, browse-by-topic, FAQs, and contact support. */
    document.title = 'WISE · Help';
    if (mainEl) renderHelp(mainEl);
  } else if (navId === 'docs') {
    /* Docs — a sidebar + reading-pane documentation browser. */
    document.title = 'WISE · Docs';
    if (mainEl) renderDocs(mainEl);
  } else if (navId === 'agents') {
    /* Agents — account-level manager for every WISE agent. */
    document.title = 'WISE · Agents';
    if (mainEl) renderAgents(mainEl);
  } else if (navId === 'alerts') {
    /* Alerts — a full-page, filterable inbox of agent notifications. */
    document.title = 'WISE · Alerts';
    if (mainEl) renderAlerts(mainEl);
  } else if (mainEl && !mainEl.innerHTML.trim()) {
    mainEl.innerHTML = `
      <div class="agent-empty" data-module-placeholder>
        ${escHtml(node ? node.label : 'Module')} — content coming soon.
      </div>`;
  }

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
  setupWISEaiDock();
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
      <span class="agent-main-icon"><span class="material-icons">${escHtml(agent.icon)}</span></span>
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
  setupWISEaiDock();

  if (location.hash) {
    requestAnimationFrame(() => {
      const target = document.getElementById(location.hash.slice(1));
      if (target && target.scrollIntoView) target.scrollIntoView({ block: 'start' });
    });
  }
}

/* ====================================================================
   Persistent WISEai dock.
     The shared WISEai chat lives in the modules row on every agent page,
     in the exact same place + size as the portfolio and chat pages — its
     width and side are restored from localStorage via mountWISEaiDock, so
     WISEai stays uniform as you move between pages.
==================================================================== */

/* Intent chips surfaced in the WISEai dock on the Dashboard page. There is one
   chip for EVERY action the Dashboard (overview.html) exposes, so anything you
   can do on the page is also one tap away from WISEai. Each chip maps 1:1 to an
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
  { intent: 'open_upf_report',      label: 'Open the UPF report',         icon: 'description' },
  { intent: 'open_gras_report',     label: 'Open the GRAS report',        icon: 'description' },
  { intent: 'open_insights_report', label: 'Open the insights report',    icon: 'insights' },
  { intent: 'update_logo',          label: 'Update your brand logo',      icon: 'image' },
];

/* Chip intent → the `data-dash-action` of the matching control rendered by
   dashboard-home.js. onIntent (below) clicks that element so the chip performs
   the real page action. Keep this in lock-step with the actions in
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

/* Report chips are handled separately from the on-page controls: they open the
   report INLINE on the dashboard surface (right of the chat) and let the dock
   supply the narration, so nothing opens a modal. Chip intent → report key. */
const DASHBOARD_WISEAI_REPORTS = {
  open_upf_report:      'upf',
  open_gras_report:     'gras',
  open_insights_report: 'insights',
};

/* Intent chips for the Reports page WISEai dock — every chip is something you
   can actually DO with the reports next to it. "Open …" chips jump straight to
   the live report; the rest continue the conversation with an on-topic answer. */
const REPORTS_WISEAI_INTENTS = [
  { intent: 'open_upf_report',   label: 'Open the UPF report',      icon: 'description' },
  { intent: 'explain_score',     label: 'Explain my UPF score',     icon: 'help_outline' },
  { intent: 'improve_score',     label: 'How do I improve it?',     icon: 'trending_up' },
  { intent: 'ingredient_quality',label: 'Ingredient quality',       icon: 'science' },
  { intent: 'compare_products',  label: 'Compare two products',     icon: 'compare_arrows' },
  { intent: 'unlock_studio',     label: 'Unlock the full Studio',   icon: 'lock_open' },
];

/* Intent chips for the Marketing Assets page WISEai dock. Every chip maps 1:1
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
   WISEai chat open on arrival don't fight an explicit "Close conversation" the
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

function setupWISEaiDock() {
  /* Pages can opt out of the persistent WISEai dock with
     `<body data-hide-wiseai>` (e.g. analytics-types.html). */
  if (document.body.dataset.hideWISEai) return;
  const row = document.getElementById('modules-row');
  if (!row || document.getElementById('wiseai-dock-panel')) return;
  const dock = document.createElement('aside');
  dock.id = 'wiseai-dock-panel';
  dock.className = 'wiseai-dock wiseai-dock-open';
  dock.setAttribute('aria-label', 'WISEai™ chat');
  row.appendChild(dock);

  const isDashboard = document.body.dataset.productId === 'dashboard';
  const isReports = document.body.dataset.navId === 'reports';
  const isVerification = document.body.dataset.navId === 'verification';
  const isGras = document.body.dataset.navId === 'gras-verification';
  const isMarketing = document.body.dataset.navId === 'marketing-assets';

  /* Account-level modules (opened from the profile menu) — each pairs its own
     surface with the WISEai dock and its own intent chips. Keyed by navId so a
     single map wires the render, the dock config, and the force-open behavior. */
  const ACCOUNT_WISEAI = {
    profile: PROFILE_WISEAI,
    preferences: PREFERENCES_WISEAI,
    'api-keys': API_KEYS_WISEAI,
    invoices: INVOICES_WISEAI,
    help: HELP_WISEAI,
    docs: DOCS_WISEAI,
    agents: AGENTS_WISEAI,
    alerts: ALERTS_WISEAI,
  };
  const accountWiseai = ACCOUNT_WISEAI[document.body.dataset.navId];

  /* The Verification and Reports pages are a chat + surface pairing, so WISEai
     should be showing when you first NAVIGATE here — we clear any "collapsed"
     state carried over from another page. But if you explicitly close the chat
     ON this page, that must stick: a reload (incl. livereload during editing) or
     a back/forward must NOT re-open it, otherwise "Close conversation" looks like
     it just restarts the chat. So only force-open on a genuine navigation. */
  if ((isVerification || isGras || isReports || isMarketing || accountWiseai) && arrivedByNavigation()) {
    writeWISEaiDockState({ collapsed: false });
  }

  /* Pages can pin the WISEai dock to a fixed side via `<body data-default-dock>`
     (left | center | right) so the chat always sits there regardless of the
     persisted preference — e.g. the Dashboard keeps the chat docked right of the
     nav. Written before mount so applyWISEaiDockState() picks it up on restore. */
  const dockDefault = document.body.dataset.defaultDock;
  if (dockDefault === 'left' || dockDefault === 'center' || dockDefault === 'right') {
    writeWISEaiDockState({ side: dockDefault });
  }

  let cfg;
  if (accountWiseai) {
    /* Account modules ship a complete WISEai config (sub + intents + replies +
       onIntent that drives the module's own surface), so use it as-is. */
    cfg = { ...accountWiseai };
  } else if (isVerification) {
    cfg = { ...VERIFICATION_WISEAI };
  } else if (isGras) {
    cfg = { ...GRAS_WISEAI };
  } else if (isMarketing) {
    cfg = {
      sub: 'Find and pull any co-branding asset — one tap.',
      chipsFlow: 'wrap',
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
      intents: REPORTS_WISEAI_INTENTS,
      intentReplies: REPORTS_WISEAI_REPLIES,
      onIntent: (intent) => {
        const go = { open_upf_report: 'report-ultra-processed-foods.html' }[intent];
        if (go) { window.location.href = go; return true; }
        return false;
      },
    };
  } else if (isDashboard) {
    cfg = {
      sub: '',
      chipsFlow: 'wrap',
      intents: DASHBOARD_WISEAI_INTENTS,
      /* Report chips get a state-aware narration in the thread while the report
         opens on the surface to the right (see onIntent) — no modal. */
      intentReplies: {
        open_upf_report:      () => dashReportChatReply('upf'),
        open_gras_report:     () => dashReportChatReply('gras'),
        open_insights_report: () => dashReportChatReply('insights'),
      },
      /* Report chips open the report INLINE on the dashboard surface (right of
         the chat) and return false so the dock adds the "you" line + the reply
         above — matching the verification flows' chat ↔ surface pairing. Every
         other chip fires the matching on-page control (a `[data-dash-action]`
         button in #agent-main-scroll) — navigate, toggle brand, or edit logo —
         and returns true to suppress the generic reply. Nothing opens a modal. */
      onIntent: (intent) => {
        const reportCard = DASHBOARD_WISEAI_REPORTS[intent];
        if (reportCard) { openDashReport(reportCard, { mirror: false }); return false; }
        const action = DASHBOARD_WISEAI_ACTIONS[intent];
        if (!action) return false;
        const el = document.querySelector(`#agent-main-scroll [data-dash-action="${action}"]`);
        if (el) { el.click(); return true; }
        return false;
      },
    };
  } else {
    cfg = {
      sub: '',
      onIntent: (intent) => {
        const go = {
          customer_profile: 'ai-chat.html',
          resume_prompt: 'ai-chat.html',
          registry_home: 'ai-chat.html',
        }[intent];
        if (go) { window.location.href = go; return true; }
        return false;
      },
    };
  }

  const wiseai = mountWISEaiDock(dock, cfg);

  /* Hand the live chat to the GRAS flow so UI interactions mirror into the
     conversation (and vice-versa) for one shared, mirrored surface. */
  if (isGras) setGrasChat(wiseai);

  /* Same for the Dashboard: opening a report on the surface (or via a chip)
     mirrors into the conversation instead of popping a modal. */
  if (isDashboard) setDashChat(wiseai);

  /* Organization Profile: hand it the live chat so on-form edits (field
     changes, logo/banner uploads, Save) narrate back into the conversation,
     matching the chip-driven flow in the other direction. */
  if (document.body.dataset.navId === 'profile') setProfileChat(wiseai);

  /* Invoices & Downloads: hand it the live chat so row actions (Pay, Retry,
     Download, Cancel …) narrate back into the conversation. */
  if (document.body.dataset.navId === 'invoices') setInvoicesChat(wiseai);
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
          <button class="agent-cta agent-cta--primary" data-sheet-nav="ai-chat.html"><span class="material-icons">chat</span>Open in WISEowl chat</button>
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
      <span class="material-icons topbar-menu-icon">image</span>
      <span>Update brand banner</span>
    </button>
    <div class="topbar-menu-divider"></div>`
    : '';
  return `
    ${bannerItem}
    <button type="button" class="topbar-menu-item" data-action="back-workspace">
      <span class="material-icons topbar-menu-icon">arrow_back</span>
      <span>Back to workspace</span>
    </button>
    <button type="button" class="topbar-menu-item" data-action="open-chat">
      <span class="material-icons topbar-menu-icon">chat</span>
      <span>Open WISEowl chat</span>
    </button>
    <div class="topbar-menu-divider"></div>
    <button type="button" class="topbar-menu-item" data-action="add-member">
      <span class="material-icons topbar-menu-icon">person_add</span>
      <span>Add team member</span>
    </button>
    <div class="topbar-menu-divider"></div>
    <button type="button" class="topbar-menu-item" data-action="export">
      <span class="material-icons topbar-menu-icon">download</span>
      <span>Export overview</span>
    </button>
    <button type="button" class="topbar-menu-item" data-action="share">
      <span class="material-icons topbar-menu-icon">share</span>
      <span>Share</span>
    </button>
    <div class="topbar-menu-divider"></div>
    <button type="button" class="topbar-menu-item topbar-menu-item--danger" data-action="close">
      <span class="material-icons topbar-menu-icon">close</span>
      <span>Close</span>
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
      editBrandBanner();
      break;
    case 'back-workspace':
      window.location.href = '../index.html';
      break;
    case 'open-chat':
      window.location.href = 'ai-chat.html';
      break;
    case 'add-member':
      openAddMemberSheet();
      break;
    case 'export':
      exportOverview(getAgent(document.body.dataset.agentId)?.label || 'WISEcode');
      break;
    case 'share':
      shareOverview();
      break;
    case 'close':
      if (window.history.length > 1) window.history.back();
      else window.location.href = '../index.html';
      break;
  }
}

/* ====================================================================
   Main-panel header controls.
     Every pane/module on the app carries the same header cluster — a
     more-options (⋯) menu + a width/resize toggle. The central agent /
     dashboard panel was the only one missing it, so its header (and the
     pinned controls kept in headerless "header-float" mode) had no
     functions. This mirrors the WISEai dock / portfolio module clusters
     so the main panel reads + behaves like every other pane.
==================================================================== */

const MAIN_WIDTH_KEY = 'wise-main-width';
/* Mirror the portfolio tab-pane width control (#modules-tabbed): the panel
   shares the row with the fixed WISEai dock, so it defaults to FILLING the
   available space and the toggle NARROWS it to centred reading widths. This
   keeps the toggle visibly functional at any panel width (unlike a high cap
   that a WISEai-constrained panel can never reach). */
const MAIN_WIDTH_ICONS = ['width_full', 'width_wide', 'width_normal'];
const MAIN_WIDTH_TITLES = [
  'Width (full) — tap to narrow',
  'Width (wide) — tap to narrow',
  'Width (reading) — tap to reset',
];

function readMainWidth() {
  try {
    const n = parseInt(localStorage.getItem(MAIN_WIDTH_KEY), 10);
    return Number.isFinite(n) ? Math.max(0, Math.min(2, n)) : 0;
  } catch {
    return 0;
  }
}

/* Reflect the width tier onto the module container itself (drives the WHOLE
   module's width in CSS — header, border + body, not just the inner content)
   and the toggle button's icon/state. */
function applyMainWidth(tier) {
  /* tier 0 = full (fills the row, no cap) · 1 = wide (1180) · 2 = reading (820).
     Apply to #agent-main — the outer flex slot/card — so the entire module
     resizes. The inner content fills whatever width the module ends up at. */
  const main = document.getElementById('agent-main');
  if (main) {
    main.classList.toggle('main-w-wide', tier === 1);
    main.classList.toggle('main-w-narrow', tier === 2);
  }
  const btn = document.getElementById('agent-main-width-btn');
  if (btn) {
    btn.classList.toggle('is-on', tier >= 1);
    btn.setAttribute('aria-pressed', tier >= 1 ? 'true' : 'false');
    btn.title = MAIN_WIDTH_TITLES[tier];
    const icon = btn.querySelector('.material-symbols-outlined');
    if (icon) icon.textContent = MAIN_WIDTH_ICONS[tier];
  }
}

function cycleMainWidth() {
  const next = (readMainWidth() + 1) % 3;
  try { localStorage.setItem(MAIN_WIDTH_KEY, String(next)); } catch {}
  applyMainWidth(next);
}

/* Markup for the main-panel control cluster — same classes (so the same
   shared styles apply) as the WISEai dock's `.sc-topbar-controls`. */
function mainPanelControlsHTML() {
  return `
    <div class="panel-controls">
      <div class="panel-more-wrap">
        <button type="button" class="panel-more-btn" id="agent-main-more-btn" aria-haspopup="menu" aria-expanded="false" aria-controls="agent-main-more-pop" title="More options" aria-label="Panel options"><span class="material-icons">more_horiz</span></button>
        <div class="topbar-popover hidden" id="agent-main-more-pop" role="menu">${renderMorePopover()}</div>
      </div>
      <button type="button" class="panel-width-toggle-btn" id="agent-main-width-btn" aria-pressed="false" title="${escHtml(MAIN_WIDTH_TITLES[0])}" aria-label="Panel width"><span class="material-symbols-outlined">${MAIN_WIDTH_ICONS[0]}</span></button>
    </div>`;
}

/* Append the control cluster to the main-panel header and wire it up. Safe to
   call once after the header markup is in place. */
function setupMainPanelControls() {
  const headerEl = document.getElementById('agent-main-header');
  if (!headerEl || headerEl.querySelector('.panel-controls')) return;
  headerEl.insertAdjacentHTML('beforeend', mainPanelControlsHTML());

  applyMainWidth(readMainWidth());

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
      closePop();
      runMoreAction(action.dataset.action);
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
      closeMorePopover();
      runMoreAction(action.dataset.action);
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
  const notifUnread = !document.querySelector('.topbar-profile')?.classList.contains('is-read');
  const who = APP_IDENTITY?.name || 'Maya Chen';
  pop.innerHTML = `
    <div class="wise-popover-header">${escHtml(who)}</div>
    <div class="wise-popover-actions">
      <button type="button" class="wise-pop-action${notifUnread ? ' has-dot' : ''}" data-pop-action="notifications" title="Notifications">
        <span class="material-icons">notifications</span>
        <span>Alerts</span>
      </button>
      <span class="wise-pop-vline" aria-hidden="true"></span>
      <button type="button" class="wise-pop-action" data-pop-action="agents" title="Agent Settings">
        <span class="material-icons">tune</span>
        <span>Agents</span>
      </button>
    </div>
    <div class="wise-popover-divider"></div>
    <div class="wise-popover-item" data-pop-action="profile"><span class="material-icons">person</span>My profile</div>
    <div class="wise-popover-item is-locked" aria-disabled="true" title="Coming soon"><span class="material-icons">receipt_long</span>Invoices &amp; Downloads<span class="wise-popover-lock material-icons" aria-hidden="true">lock</span></div>
    <div class="wise-popover-item" data-pop-action="prefs"><span class="material-icons">tune</span>Preferences</div>
    <div class="wise-popover-item" data-pop-action="apikeys"><span class="material-icons">key</span>API keys</div>
    <div class="wise-popover-item" data-pop-action="help"><span class="material-icons">help</span>Help</div>
    <div class="wise-popover-item" data-pop-action="docs"><span class="material-icons">menu_book</span>Docs</div>
    <div class="wise-popover-divider"></div>
    <div class="wise-popover-item danger" data-pop-action="signout"><span class="material-icons">logout</span>Sign out</div>
  `;
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
      try { localStorage.removeItem('wise-auth'); } catch (e) {}
      window.location.href = 'login.html';
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
        prefs: 'preferences.html',
        apikeys: 'api-keys.html',
        help: 'help.html',
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
  /* Only offer the "WISEai chat" on/off toggle where the shared dock actually
     lives on the page (pages can opt out via `<body data-hide-wiseai>`). */
  const hasWISEaiDock = !!document.getElementById('wiseai-dock-panel');
  pop.innerHTML = buildAppearanceBody({
    showPivot: true,
    isPivoted: isMenuPivoted(),
    isDark: isDarkMode(),
    wiseaiDockMode: wiseaiDockMode(),
    showWISEaiChat: hasWISEaiDock,
    wiseaiChatOn: !isWISEaiClosed(),
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

  pop.addEventListener('click', (ev) => {
    const wiseaiBtn = ev.target.closest('.fz-btn[data-wiseai-dock]');
    if (wiseaiBtn && pop.contains(wiseaiBtn)) {
      ev.stopPropagation();
      setWISEaiDockPosition(wiseaiBtn.dataset.wiseaiDock);
      renderAppearanceBody(pop);
      return;
    }
    const fzBtn = ev.target.closest('.fz-btn[data-fz]');
    if (fzBtn && pop.contains(fzBtn)) {
      ev.stopPropagation();
      setTextSize(fzBtn.dataset.fz);
      return;
    }
    const pivotItem = ev.target.closest('[data-pivot]');
    if (pivotItem && pop.contains(pivotItem)) {
      ev.stopPropagation();
      toggleMenuPivot();
      renderAppearanceBody(pop);
      return;
    }
    const minimalItem = ev.target.closest('[data-minimal]');
    if (minimalItem && pop.contains(minimalItem)) {
      ev.stopPropagation();
      applyMinimalUi(!isMinimalUiOn());
      renderAppearanceBody(pop);
      return;
    }
    const headerFloatItem = ev.target.closest('[data-headerfloat]');
    if (headerFloatItem && pop.contains(headerFloatItem)) {
      ev.stopPropagation();
      applyHeaderFloat(!isHeaderFloatOn());
      renderAppearanceBody(pop);
      return;
    }
    const fullBleedItem = ev.target.closest('[data-fullbleed]');
    if (fullBleedItem && pop.contains(fullBleedItem)) {
      ev.stopPropagation();
      applyFullBleed(!isFullBleedOn());
      renderAppearanceBody(pop);
      return;
    }
    const jamItem = ev.target.closest('[data-jam]');
    if (jamItem && pop.contains(jamItem)) {
      ev.stopPropagation();
      applyJamStrip(!isJamStripOn());
      renderAppearanceBody(pop);
      return;
    }
    const colorblindItem = ev.target.closest('[data-colorblind]');
    if (colorblindItem && pop.contains(colorblindItem)) {
      ev.stopPropagation();
      applyColorblind(!isColorblindOn());
      renderAppearanceBody(pop);
      return;
    }
    const wiseaiChatItem = ev.target.closest('[data-wiseai-chat]');
    if (wiseaiChatItem && pop.contains(wiseaiChatItem)) {
      ev.stopPropagation();
      /* Off → fresh-restart the chat back into its welcome state; on → close it
         (folds to the floating owl, same as "Close conversation"). */
      if (isWISEaiClosed()) restartWISEaiChat();
      else setWISEaiCollapsed(true);
      renderAppearanceBody(pop);
      return;
    }
    const themeItem = ev.target.closest('[data-pop-action="theme"]');
    if (themeItem && pop.contains(themeItem)) {
      ev.stopPropagation();
      setDarkMode(!isDarkMode());
      return;
    }
    if (ev.target.closest('.fz-row, .wise-popover-header, .wise-popover-divider')) {
      ev.stopPropagation();
      return;
    }
    closeAppearancePopover();
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
  initWISEaiTooltips();
});
