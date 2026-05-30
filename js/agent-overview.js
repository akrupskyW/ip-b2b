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
import { mountTopbar } from './topbar.js';

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
  mountTopbar({ variant: 'agent', logoHref: 'portfolio-agent.html' });
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

  if (location.hash) {
    requestAnimationFrame(() => {
      const target = document.getElementById(location.hash.slice(1));
      if (target && target.scrollIntoView) target.scrollIntoView({ block: 'start' });
    });
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

function renderAlertsBody() {
  const items = NOTIFICATIONS.map((n, i) => `
    <button type="button" class="notif-row" data-notif="${i}">
      <span class="notif-row-icon notif-ic-${escHtmlSafe(n.tone)}"><span class="material-icons">${escHtmlSafe(n.icon)}</span></span>
      <div class="notif-row-body">
        <div class="notif-row-title">${escHtmlSafe(n.title)}</div>
        <div class="notif-row-sub">${escHtmlSafe(n.sub)}</div>
      </div>
    </button>`).join('');
  return `${items}`;
}

function renderAlertsPanel() {
  return `
    <div class="alerts-inner">
      <header class="alerts-panel-header">
        <div class="alerts-panel-icon"><span class="material-icons">notifications</span></div>
        <div class="alerts-panel-titles">
          <div class="alerts-panel-title">Alerts</div>
          <div class="alerts-panel-sub">${NOTIFICATIONS.length} new across your agents</div>
        </div>
      </header>
      <div class="alerts-panel-body">
        ${renderAlertsBody()}
      </div>
      <div class="alerts-panel-footer">
        <button type="button" class="notif-view-all" data-action="mark-all-read">
          <span class="material-icons">done_all</span>
          Mark all as read
        </button>
      </div>
    </div>`;
}

function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

/* Theme + text-size accessibility controls now live in the MC / avatar
   popover (see setupAvatarPopover) instead of the three-dot More menu, so
   setDarkMode just needs to flip the class, persist it, and let the avatar
   popover re-render itself if it happens to be open. */
function setDarkMode(on) {
  const html = document.documentElement;
  html.classList.toggle('dark', on);
  try { localStorage.setItem('wise-theme', on ? 'dark' : 'light'); } catch {}
  refreshAvatarPopover();
}

/* Mirrors the chat-page scale so a user's accessibility choice is
   consistent across pages (same localStorage key as ai-chat.html). */
const FZ_SCALE = { sm: 0.82, md: 1, lg: 1.18, xl: 1.36 };
const FZ_LINE  = { sm: 1.45, md: 1.6, lg: 1.65, xl: 1.7 };

function getStoredFontSize() {
  let fz = 'md';
  try { fz = localStorage.getItem('chat-font-size') || 'md'; } catch (_) {}
  if (!(fz in FZ_SCALE)) fz = 'md';
  return fz;
}

/* Scale the agent main content (hero + cards) so changing text size has a
   visible effect on every overview page, while leaving the global top bar,
   the sticky menu rail, AND the module header at their authored size. The
   zoom is applied to the scrollable content only (#agent-main-scroll) — never
   to #agent-main itself — so the .agent-main-header strip always renders at
   the same size as the .menu-panel-header in the navigation rail. */
function setAgentFontSize(size) {
  if (!FZ_SCALE[size]) return;
  const content = document.getElementById('agent-main-scroll');
  if (content) {
    content.style.zoom = String(FZ_SCALE[size]);
    content.style.setProperty('--chat-line-height', String(FZ_LINE[size]));
  }
  document.querySelectorAll('.fz-btn[data-fz]').forEach((b) => {
    const s = b.dataset.fz;
    if (s in FZ_SCALE) b.classList.toggle('fz-active', s === size);
  });
  try { localStorage.setItem('chat-font-size', size); } catch (_) {}
}

function applyStoredFontSize() {
  setAgentFontSize(getStoredFontSize());
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

function ensureSidePanel(id, render) {
  let el = document.getElementById(id);
  if (el) return el;
  const row = document.getElementById('modules-row');
  if (!row) return null;
  el = document.createElement('aside');
  el.id = id;
  el.innerHTML = render();
  row.appendChild(el);
  return el;
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
  const alertsPanel = ensureSidePanel('alerts-panel', renderAlertsPanel);

  /* More is a small popover anchored to the three-dot button — same
     pattern as the avatar / user menu. */
  const morePop = ensureMorePopover(moreBtn);
  if (morePop) morePop.innerHTML = renderMorePopover();

  /* The Alerts icon always reveals the alerts panel and scrolls to it — it
     never closes it on click (close via "mark all read" or opening an alert).
     This makes a single click transport you there whether it was on or off. */
  function toggleAlerts() {
    if (!alertsPanel) return;
    alertsPanel.classList.add('alerts-open');
    if (notifBtn) {
      notifBtn.setAttribute('aria-expanded', 'true');
      notifBtn.classList.add('lir-active');
      notifBtn.classList.add('is-read');
    }
    requestAnimationFrame(() => {
      alertsPanel.scrollIntoView({ behavior: 'smooth', inline: 'end', block: 'nearest' });
    });
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

  if (alertsPanel) {
    alertsPanel.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]');
      if (action && action.dataset.action === 'mark-all-read') {
        notifBtn?.classList.add('is-read');
        closeSidePanel(alertsPanel, 'alerts-open', notifBtn);
        return;
      }
      const row = e.target.closest('.notif-row[data-notif]');
      if (row) {
        const n = NOTIFICATIONS[Number(row.dataset.notif)];
        row.classList.add('is-read');
        closeSidePanel(alertsPanel, 'alerts-open', notifBtn);
        const body = openAgSheet({ eyebrow: 'Alert', title: n.title, icon: n.icon });
        body.innerHTML = `
          <p class="ag-sheet-lead">${escHtmlSafe(n.sub)}</p>
          <p class="ag-sheet-lead">Open the WISEowl chat to act on this alert with the relevant agent.</p>
          <div class="ag-sheet-actions">
            <button class="agent-cta agent-cta--primary" data-sheet-nav="ai-chat.html"><span class="material-icons">chat</span>Open in WISEowl chat</button>
            <button class="agent-cta agent-cta--ghost" data-sheet-close="1">Dismiss</button>
          </div>`;
      }
    });
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
   MC / avatar popover.
     Mirrors ai-chat.html — surfaces the user-menu plus the text-size and
     light/dark accessibility controls. Text-size and theme rows leave the
     popover open while the user iterates; every other row closes it.
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

function refreshAvatarPopover() {
  if (!activeAvatarPopover) return;
  renderAvatarBody(activeAvatarPopover);
}

function renderAvatarBody(pop) {
  const fz     = getStoredFontSize();
  const isDark = isDarkMode();
  pop.innerHTML = `
    <div class="wise-popover-header">Maya Chen</div>
    <div class="wise-popover-item" data-pop-action="profile"><span class="material-icons">person</span>My profile</div>
    <div class="wise-popover-item" data-pop-action="prefs"><span class="material-icons">tune</span>Preferences</div>
    <div class="wise-popover-item" data-pop-action="apikeys"><span class="material-icons">key</span>API keys</div>
    <div class="wise-popover-item" data-pop-action="help"><span class="material-icons">help</span>Help &amp; docs</div>
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
    <div class="wise-popover-item" data-pop-action="theme">
      <span class="material-icons js-theme-icon">${isDark ? 'light_mode' : 'dark_mode'}</span>
      <span class="js-theme-label">${isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}</span>
    </div>
    <div class="wise-popover-divider"></div>
    <div class="wise-popover-item danger" data-pop-action="signout"><span class="material-icons">logout</span>Sign out</div>
  `;
}

function openAvatarPopover(anchor) {
  if (activeAvatarAnchor === anchor) { closeAvatarPopover(); return; }
  closeAvatarPopover();
  const pop = document.createElement('div');
  pop.className = 'wise-popover';
  document.body.appendChild(pop);
  renderAvatarBody(pop);
  const rect = anchor.getBoundingClientRect();
  const pw   = pop.offsetWidth || 240;
  const left = Math.max(8, Math.min(rect.right - pw, window.innerWidth - pw - 8));
  pop.style.left = left + 'px';
  pop.style.top  = (rect.bottom + 8) + 'px';
  requestAnimationFrame(() => pop.classList.add('open'));
  activeAvatarPopover = pop;
  activeAvatarAnchor  = anchor;
  anchor.classList.add('is-open');

  pop.addEventListener('click', (ev) => {
    const fzBtn = ev.target.closest('.fz-btn[data-fz]');
    if (fzBtn && pop.contains(fzBtn)) {
      ev.stopPropagation();
      setAgentFontSize(fzBtn.dataset.fz);
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
    closeAvatarPopover();
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
    if (activeAvatarPopover && !activeAvatarPopover.contains(e.target)) closeAvatarPopover();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAvatarPopover();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bootstrapAgentPage();
  setupAvatarPopover();
  applyStoredFontSize();
  initLirTooltip();
});
