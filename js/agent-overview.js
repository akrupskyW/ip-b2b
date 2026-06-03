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
  mountAgentMenu,
} from './agent-menu.js';
import { initLirTooltip } from './lir-tooltip.js';
import { initWhootieTooltips } from './whootie-tooltip.js';
import { mountTopbar, isMenuFooterAnchor, positionPopoverInMenuPanel, positionPopoverForTopbar, applyMinimalUi, isMinimalUiOn, restoreMinimalUi } from './topbar.js';
import { isJamStripOn, applyJamStrip } from './jam-strip.js';
import { mountScoutDock, setScoutDockPosition, scoutDockMode } from './scout-dock.js';
import { mountNotificationsPanel } from './notifications-panel.js';
import { getStoredFontSize, setTextSize, applyStoredTextSize } from './text-size.js';

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

export function bootstrapAgentPage() {
  const agentId = document.body.dataset.agentId;
  const agent = getAgent(agentId);
  if (!agent) {
    console.error(`[agent-overview] unknown agent id: ${agentId}`);
    return;
  }

  document.title = `WISE · ${agent.label}`;

  /* Build the shared top bar (menu toggle, WISE logo, Alerts/More, profile).
     The agent variant has no center rail — just the trailing actions. */
  mountTopbar({ variant: 'agent', logoHref: 'ai-chat.html' });
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
  setupScoutDock();

  if (location.hash) {
    requestAnimationFrame(() => {
      const target = document.getElementById(location.hash.slice(1));
      if (target && target.scrollIntoView) target.scrollIntoView({ block: 'start' });
    });
  }
}

/* ====================================================================
   Persistent Scout dock.
     The shared Scout chat lives in the modules row on every agent page,
     in the exact same place + size as the portfolio and chat pages — its
     width and side are restored from localStorage via mountScoutDock, so
     Scout stays uniform as you move between pages.
==================================================================== */

function setupScoutDock() {
  const row = document.getElementById('modules-row');
  if (!row || document.getElementById('scout-dock-panel')) return;
  const dock = document.createElement('aside');
  dock.id = 'scout-dock-panel';
  dock.className = 'scout-dock scout-dock-open';
  dock.setAttribute('aria-label', 'Whootie™ chat');
  row.appendChild(dock);
  mountScoutDock(dock, {
    sub: 'Your AI assistant across every WISE agent',
    /* Intent chips that map to a destination navigate there; everything
       else continues the conversation inside the dock. */
    onIntent: (intent) => {
      const go = {
        customer_profile: 'ai-chat.html',
        resume_prompt: 'ai-chat.html',
        registry_home: 'ai-chat.html',
      }[intent];
      if (go) { window.location.href = go; return true; }
      return false;
    },
  });
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
  return `
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
      const a = action.dataset.action;
      closeMorePopover();
      switch (a) {
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
  pop.innerHTML = `
    <div class="wise-popover-header">Maya Chen</div>
    <div class="wise-popover-actions">
      <button type="button" class="wise-pop-action${notifUnread ? ' has-dot' : ''}" data-pop-action="notifications" title="Notifications">
        <span class="material-icons">notifications</span>
        <span>Alerts</span>
      </button>
    </div>
    <div class="wise-popover-divider"></div>
    <div class="wise-popover-item" data-pop-action="profile"><span class="material-icons">person</span>My profile</div>
    <div class="wise-popover-item" data-pop-action="prefs"><span class="material-icons">tune</span>Preferences</div>
    <div class="wise-popover-item" data-pop-action="apikeys"><span class="material-icons">key</span>API keys</div>
    <div class="wise-popover-item" data-pop-action="help"><span class="material-icons">help</span>Help &amp; docs</div>
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

/* Dock Chat left / center / right segmented control — mirrors the portfolio
   popover so the Doc chat's sticky side stays uniform across every agent page. */
function renderScoutDockRow() {
  const mode = scoutDockMode();
  const btn = (m, icon, label) =>
    `<button type="button" class="fz-btn${mode === m ? ' fz-active' : ''}" data-scout-dock="${m}" title="${label}" aria-label="${label}"><span class="material-symbols-outlined">${icon}</span></button>`;
  return `
    <div class="fz-row">
      <span class="fz-row-label">Dock Chat</span>
      <div class="fz-btns scout-seg" role="group" aria-label="Dock Chat position">
        ${btn('left', 'align_justify_flex_start', 'Dock chat left')}
        ${btn('center', 'align_justify_center', 'Center chat')}
        ${btn('right', 'align_justify_flex_end', 'Dock chat right')}
      </div>
    </div>`;
}

function renderAppearanceBody(pop) {
  const fz     = getStoredFontSize();
  const isDark = isDarkMode();
  pop.innerHTML = `
    <div class="wise-popover-header">Appearance</div>
    ${renderScoutDockRow()}
    <div class="wise-popover-divider"></div>
    <div class="fz-row">
      <span class="fz-row-label">Text size</span>
      <div class="fz-btns">
        <button type="button" class="fz-btn${fz==='sm'?' fz-active':''}" data-fz="sm">S</button>
        <button type="button" class="fz-btn${fz==='md'?' fz-active':''}" data-fz="md">M</button>
        <button type="button" class="fz-btn${fz==='lg'?' fz-active':''}" data-fz="lg">L</button>
        <button type="button" class="fz-btn${fz==='xl'?' fz-active':''}" data-fz="xl">XL</button>
      </div>
    </div>
    <div class="wise-popover-divider"></div>
    <div class="wise-popover-item${isMinimalUiOn() ? ' is-active' : ''}" data-minimal="1">
      <span class="material-symbols-outlined">compress</span>Minimal UI
    </div>
    <div class="wise-popover-item${isJamStripOn() ? ' is-active' : ''}" data-jam="1">
      <span class="material-icons">music_note</span>Jam strip
    </div>
    <div class="wise-popover-divider"></div>
    <div class="wise-popover-item" data-pop-action="theme">
      <span class="material-icons js-theme-icon">${isDark ? 'light_mode' : 'dark_mode'}</span>
      <span class="js-theme-label">${isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}</span>
    </div>
  `;
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
    const scoutBtn = ev.target.closest('.fz-btn[data-scout-dock]');
    if (scoutBtn && pop.contains(scoutBtn)) {
      ev.stopPropagation();
      setScoutDockPosition(scoutBtn.dataset.scoutDock);
      renderAppearanceBody(pop);
      return;
    }
    const fzBtn = ev.target.closest('.fz-btn[data-fz]');
    if (fzBtn && pop.contains(fzBtn)) {
      ev.stopPropagation();
      setTextSize(fzBtn.dataset.fz);
      return;
    }
    const minimalItem = ev.target.closest('[data-minimal]');
    if (minimalItem && pop.contains(minimalItem)) {
      ev.stopPropagation();
      applyMinimalUi(!isMinimalUiOn());
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
  initWhootieTooltips();
});
