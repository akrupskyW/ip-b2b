/**
 * Agents module.
 *
 * The account-level "Agents" surface (the profile-menu quick action) rendered
 * into #agent-main-scroll on agents.html. It lists every WISE agent as a card
 * with an enable/pause switch and an autonomy setting, drawing from the shared
 * AGENTS hierarchy so it always matches the nav. The persistent WISEai dock
 * drives it — intent chips enable everything, pause everything, or open a
 * specific agent — and each on-page toggle narrates back into the conversation.
 */

import { AGENTS, TOP_LEVEL_AGENT_IDS } from './agent-menu.js';

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* Flatten the agent hierarchy into a display list: each top-level agent followed
   by its descendants, so the cards read in the same order as the nav tree. */
function agentList() {
  const out = [];
  const walk = (id, depth) => {
    const a = AGENTS[id];
    if (!a) return;
    out.push({ ...a, depth });
    (a.children || []).forEach((c) => walk(c, depth + 1));
  };
  TOP_LEVEL_AGENT_IDS.forEach((id) => walk(id, 0));
  return out;
}

const AUTONOMY = ['Manual', 'Assisted', 'Autonomous'];

let hostEl = null;
/* Per-agent runtime state (demo only): enabled + autonomy level. */
const state = {};

function ensureState() {
  agentList().forEach((a, i) => {
    if (!state[a.id]) state[a.id] = { enabled: true, autonomy: i % 3 === 0 ? 2 : 1 };
  });
}

function toast(msg, icon = 'check') {
  let wrap = document.getElementById('ag-toast-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.id = 'ag-toast-wrap'; document.body.appendChild(wrap); }
  const t = document.createElement('div');
  t.className = 'ag-toast';
  t.innerHTML = `<span class="material-symbols-outlined">${esc(icon)}</span><span>${esc(msg)}</span>`;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('is-in'));
  setTimeout(() => { t.classList.remove('is-in'); setTimeout(() => t.remove(), 260); }, 2600);
}

function paint() {
  if (!hostEl) return;
  ensureState();
  const list = agentList();
  const active = list.filter((a) => state[a.id].enabled).length;
  hostEl.innerHTML = `
    <div class="ag-wrap">
      <div class="ag-breadcrumb"><span>Account</span><span class="material-symbols-outlined">chevron_right</span><span class="ag-breadcrumb-here">Agents</span></div>
      <div class="ag-head-row">
        <div>
          <h1 class="ag-title">Agents</h1>
          <p class="ag-lede">Enable, pause, and set the autonomy of the specialized agents that power your workspace.</p>
        </div>
        <div class="ag-head-actions">
          <button type="button" class="ag-btn ag-btn--ghost" data-ag-action="pause_all"><span class="material-symbols-outlined">pause_circle</span>Pause all</button>
          <button type="button" class="ag-btn ag-btn--primary" data-ag-action="enable_all"><span class="material-symbols-outlined">play_circle</span>Enable all</button>
        </div>
      </div>

      <div class="ag-summary"><span class="ag-summary-num">${active}</span> of ${list.length} agents active</div>

      <div class="ag-grid">
        ${list.map((a) => {
          const s = state[a.id];
          return `
          <div class="ag-card${s.enabled ? '' : ' is-off'}${a.depth ? ' is-child' : ''}" data-ag-id="${a.id}">
            <div class="ag-card-top">
              <span class="ag-card-ic"><span class="material-symbols-outlined">${esc(a.icon || 'smart_toy')}</span></span>
              <div class="ag-card-titles">
                <div class="ag-card-name">${esc(a.label)}</div>
                <div class="ag-card-status">${s.enabled ? '<span class="ag-dot ag-dot--on"></span>Active' : '<span class="ag-dot ag-dot--off"></span>Paused'}</div>
              </div>
              <button type="button" class="ag-switch${s.enabled ? ' is-on' : ''}" role="switch" aria-checked="${s.enabled}" data-ag-toggle="${a.id}" aria-label="Toggle ${esc(a.label)}"><span class="ag-knob"></span></button>
            </div>
            <p class="ag-card-desc">${esc(a.description || '')}</p>
            <div class="ag-card-foot">
              <span class="ag-foot-label">Autonomy</span>
              <div class="ag-seg" role="group">
                ${AUTONOMY.map((lvl, li) => `<button type="button" class="ag-seg-btn${li === s.autonomy ? ' is-active' : ''}"${s.enabled ? '' : ' disabled'} data-ag-autonomy="${a.id}" data-lvl="${li}">${esc(lvl)}</button>`).join('')}
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

export function renderAgents(mainEl) {
  hostEl = mainEl;
  paint();

  mainEl.addEventListener('click', (e) => {
    const tog = e.target.closest('[data-ag-toggle]');
    if (tog) { toggleAgent(tog.dataset.agToggle); return; }
    const aut = e.target.closest('[data-ag-autonomy]');
    if (aut && !aut.disabled) { setAutonomy(aut.dataset.agAutonomy, +aut.dataset.lvl); return; }
    const act = e.target.closest('[data-ag-action]');
    if (act) { runAgentsIntent(act.dataset.agAction); }
  });
}

function toggleAgent(id, forceOn) {
  const s = state[id];
  if (!s) return;
  s.enabled = typeof forceOn === 'boolean' ? forceOn : !s.enabled;
  paint();
  toast(`${AGENTS[id]?.label || 'Agent'} ${s.enabled ? 'enabled' : 'paused'}`, s.enabled ? 'play_circle' : 'pause_circle');
}

function setAutonomy(id, lvl) {
  if (!state[id]) return;
  state[id].autonomy = lvl;
  paint();
  toast(`${AGENTS[id]?.label || 'Agent'}: ${AUTONOMY[lvl]}`, 'tune');
}

function setAll(on) {
  agentList().forEach((a) => { state[a.id].enabled = on; });
  paint();
  toast(on ? 'All agents enabled' : 'All agents paused', on ? 'play_circle' : 'pause_circle');
}

/* ---- WISEai bridge -------------------------------------------------- */

export function runAgentsIntent(action) {
  switch (action) {
    case 'enable_all': setAll(true); break;
    case 'pause_all': setAll(false); break;
    default: break;
  }
}

export const AGENTS_WISEAI = {
  sub: 'Manage your agents — enable, pause, or tune autonomy.',
  chipsFlow: 'wrap',
  sourceLabel: '',
  /* Large "at a glance" cards shown alongside the small chips on the welcome
     screen — each reuses an existing intent so a click drives the same flow. */
  scorecards: {
    label: 'Your agents at a glance',
    cards: [
      { intent: 'enable_all', icon: 'play_circle', iconTone: 'brand', pill: { tone: 'up', icon: 'bolt', text: 'Do next' }, title: 'Enable all agents', desc: 'Turn the whole pipeline on so every agent runs automatically.', action: 'Enable all agents', ask: 'Enable all agents' },
      { intent: 'portfolio', icon: 'business_center', iconTone: 'brand', pill: { tone: 'up', icon: 'open_in_new', text: 'Open' }, title: 'Open the Portfolio Agent', desc: 'The top of your agent tree — data, identity, eligibility, verification and recipes.', action: 'Open Portfolio Agent', ask: 'Open the Portfolio Agent' },
      { intent: 'pause_all', icon: 'pause_circle', iconTone: 'brand', pill: { tone: 'up', icon: 'pause_circle', text: 'Pause' }, title: 'Pause all agents', desc: 'Stop the pipeline — nothing runs automatically until you re-enable it.', action: 'Pause all agents', ask: 'Pause all agents' },
      { variant: 'wiseai', intent: 'autonomy', icon: 'smart_toy', pill: { tone: 'wiseai', icon: 'bolt', text: 'WISEai' }, title: 'What does autonomy mean?', desc: 'Manual, Assisted, or Autonomous — I\u2019ll explain how each mode behaves.', action: 'Explain autonomy', ask: 'What does autonomy mean?' },
    ],
  },
  intents: [
    { intent: 'enable_all', label: 'Enable all agents', icon: 'play_circle' },
    { intent: 'pause_all', label: 'Pause all agents', icon: 'pause_circle' },
    { intent: 'portfolio', label: 'Open the Portfolio Agent', icon: 'business_center' },
    { intent: 'autonomy', label: 'What does autonomy mean?', icon: 'help_outline' },
  ],
  intentReplies: {
    enable_all: 'Enabled <strong>every agent</strong> — the whole pipeline is running.',
    pause_all: 'Paused <strong>every agent</strong>. Nothing will run automatically until you re-enable them.',
    portfolio: 'The <strong>Portfolio Agent</strong> orchestrates data, identity, eligibility, verification and recipes — it\u2019s the top of your agent tree, with the Data Ingestion, Brand Profile, Food Discovery, Verification and Recipe agents beneath it.',
    autonomy: '<strong>Manual</strong> waits for you to approve each step. <strong>Assisted</strong> prepares work and asks before acting. <strong>Autonomous</strong> runs end to end and reports back.',
  },
  onIntent: (intent) => {
    if (intent === 'enable_all') { runAgentsIntent('enable_all'); return false; }
    if (intent === 'pause_all') { runAgentsIntent('pause_all'); return false; }
    if (intent === 'portfolio') { window.location.href = 'portfolio-agent.html'; return true; }
    return false;
  },
};
