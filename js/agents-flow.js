import { esc } from './escape-html.js';
import { createToast } from './toast.js';
import { searchToolbarHTML } from './wise-toolbar.js';
const toast = createToast('wmod');
/**
 * Agents module.
 *
 * The account-level "Agents" surface rendered into #agent-main-scroll on
 * agents.html, built on the canonical `wmod-` module and modeled on the Product
 * Portfolio (serif headline + subtext + description, a search field with an
 * inline funnel filter, scorecard filters, then a table). Beyond the WISE agents
 * themselves it now also accounts for the resources those agents run on:
 * Databases, Rules, and Skills. The persistent WISEcodeAI dock drives it — intent
 * chips enable everything, pause everything, or open a specific agent — and each
 * on-page toggle narrates back into the conversation.
 */

import { AGENTS, TOP_LEVEL_AGENT_IDS } from './agent-menu.js';

const AUTONOMY = ['Manual', 'Assisted', 'Autonomous'];

/* Databases, Rules, and Skills the agents draw on (demo). */
const DATABASES = [
  { id: 'db-portfolio', name: 'Product Portfolio', desc: 'Your products, ingredients and classifications', meta: '2,418 records \u00b7 synced 4m ago' },
  { id: 'db-ingredients', name: 'Ingredient Registry', desc: 'Normalized ingredient names, aliases and functions', meta: '61,204 records \u00b7 synced 1h ago' },
  { id: 'db-gras', name: 'GRAS Documentation Store', desc: 'Generally Recognized As Safe evidence per additive', meta: '3,902 records \u00b7 synced yesterday' },
  { id: 'db-trends', name: 'Trend Signals', desc: 'Market and search demand signals by category', meta: '18,760 records \u00b7 synced 2h ago' },
];
const RULES = [
  { id: 'rule-nova', name: 'NOVA classification', desc: 'Classify finished products against the NOVA scale', meta: 'Applies to all products' },
  { id: 'rule-gras', name: 'GRAS attestation policy', desc: 'Require signed attestation before minting a GRAS shield', meta: 'Applies to verification' },
  { id: 'rule-seedoils', name: 'Auto-flag seed oils', desc: 'Flag industrial seed oils for reformulation review', meta: 'Applies to ingredients' },
  { id: 'rule-normalize', name: 'Ingredient normalization', desc: 'Map raw ingredient text to the canonical registry', meta: 'Applies on ingestion' },
];
const SKILLS = [
  { id: 'skill-verify', name: 'Verify pre-qualified foods', desc: 'Run Non-UPF verification end to end for eligible SKUs', meta: 'Used by 3 agents' },
  { id: 'skill-reformulate', name: 'Reformulation what-if', desc: 'Simulate ingredient swaps and score the impact', meta: 'Used by 2 agents' },
  { id: 'skill-report', name: 'Publish report', desc: 'Compile and publish a portfolio UPF report', meta: 'Used by 1 agent' },
  { id: 'skill-ingest', name: 'Ingest from URL', desc: 'Pull product data from a URL, file, or ERP export', meta: 'Used by 2 agents' },
];

const KIND_META = {
  agent: { label: 'Agent', icon: 'smart_toy' },
  database: { label: 'Database', icon: 'database' },
  rule: { label: 'Rule', icon: 'rule' },
  skill: { label: 'Skill', icon: 'auto_awesome' },
};

let hostEl = null;
let filter = 'all';
let query = '';
/* Per-item runtime state (demo): enabled + (agents only) autonomy level. */
const state = {};

/* Flatten the agent hierarchy into a display list, then the other resources. */
function agentItems() {
  const out = [];
  const walk = (id, depth) => {
    const a = AGENTS[id];
    if (!a) return;
    out.push({ kind: 'agent', id: a.id, name: a.label, desc: a.description || '', icon: a.icon || 'smart_toy', depth });
    (a.children || []).forEach((c) => walk(c, depth + 1));
  };
  TOP_LEVEL_AGENT_IDS.forEach((id) => walk(id, 0));
  return out;
}

function allItems() {
  return [
    ...agentItems(),
    ...DATABASES.map((d) => ({ kind: 'database', ...d, icon: KIND_META.database.icon })),
    ...RULES.map((r) => ({ kind: 'rule', ...r, icon: KIND_META.rule.icon })),
    ...SKILLS.map((s) => ({ kind: 'skill', ...s, icon: KIND_META.skill.icon })),
  ];
}

function ensureState() {
  allItems().forEach((it, i) => {
    if (!state[it.id]) state[it.id] = { enabled: true, autonomy: i % 3 === 0 ? 2 : 1 };
  });
}

function matches(it) {
  if (filter !== 'all' && it.kind !== filter) return false;
  if (query) {
    const hay = (it.name + ' ' + (it.desc || '') + ' ' + it.kind).toLowerCase();
    if (!hay.includes(query)) return false;
  }
  return true;
}

function kindCount(kind) {
  const items = allItems();
  if (kind === 'all') return items.length;
  return items.filter((i) => i.kind === kind).length;
}

/* Pick a scorecard column count that never leaves a lone orphan card. */
function statCols(n) {
  if (n <= 1) return 1;
  for (let c = Math.min(n, 6); c >= 2; c--) if (n % c === 0) return c;
  for (let c = Math.min(n, 6); c >= 2; c--) if (n % c !== 1) return c;
  return 2;
}

/* The per-row control column: agents get an autonomy segmented control; others
   get a short status line. */
function controlCell(it, s) {
  if (it.kind === 'agent') {
    return `<div class="wmod-seg" role="group" aria-label="Autonomy">
      ${AUTONOMY.map((lvl, li) => `<button type="button" class="wmod-seg-btn${li === s.autonomy ? ' is-active' : ''}"${s.enabled ? '' : ' disabled'} data-ag-autonomy="${it.id}" data-lvl="${li}">${esc(lvl)}</button>`).join('')}
    </div>`;
  }
  if (it.kind === 'database') {
    return `<span class="ag-status-meta">${s.enabled ? '<span class="wmod-pill wmod-pill--on">Connected</span>' : '<span class="wmod-pill wmod-pill--off">Disconnected</span>'}<span>${esc(it.meta || '')}</span></span>`;
  }
  return `<span class="ag-status-meta"><span class="ag-dot ag-dot--${s.enabled ? 'on' : 'off'}"></span>${esc(it.meta || '')}</span>`;
}

function paint() {
  if (!hostEl) return;
  ensureState();
  const items = allItems();
  const active = items.filter((it) => state[it.id].enabled).length;
  const shown = items.filter(matches);

  const CARDS = [
    { id: 'all', label: 'All', icon: 'apps' },
    { id: 'agent', label: 'Agents', icon: KIND_META.agent.icon },
    { id: 'database', label: 'Databases', icon: KIND_META.database.icon },
    { id: 'rule', label: 'Rules', icon: KIND_META.rule.icon },
    { id: 'skill', label: 'Skills', icon: KIND_META.skill.icon },
  ];

  hostEl.innerHTML = `
    <div class="wmod-wrap">
      <div class="wmod-masthead">
        <div class="wmod-masthead-main">
          <h1 class="wmod-title">Agents</h1>
          <p class="wmod-sub"><strong>${active}</strong> of ${items.length} items active across your workspace.</p>
          <p class="wmod-desc">Enable, pause and tune the specialized agents that power WISE \u2014 and the resources they run on: the databases they read, the rules they enforce, and the skills they can perform.</p>
        </div>
        <div class="wmod-head-actions">
          <button type="button" class="wise-btn wise-btn--ghost" data-ag-action="pause_all"><span class="material-symbols-outlined">pause_circle</span>Pause all</button>
          <button type="button" class="wise-btn wise-btn--primary" data-ag-action="enable_all"><span class="material-symbols-outlined">play_circle</span>Enable all</button>
        </div>
      </div>

      ${searchToolbarHTML({
        variant: 'wmod',
        placeholder: 'Search agents, databases, rules, and skills',
        ariaLabel: 'Search',
        value: query,
        inputAttrs: 'data-ag-search',
      })}

      <div class="wmod-stats-wrap">
        <div class="wmod-stats" style="--wmod-cols:${statCols(CARDS.length)}" role="group" aria-label="Filter by type">
          ${CARDS.map((c) => `<button type="button" class="wmod-stat${c.id === filter ? ' is-active' : ''}" data-ag-filter="${c.id}" aria-pressed="${c.id === filter}">
            <span class="wmod-stat-num">${kindCount(c.id)}</span>
            <span class="wmod-stat-label"><span class="material-symbols-outlined">${esc(c.icon)}</span>${esc(c.label)}</span>
          </button>`).join('')}
        </div>
      </div>

      <div class="wmod-table-card ag-table">
        <div class="wmod-table">
          <div class="wmod-thead">
            <div class="wmod-th"></div>
            <div class="wmod-th">Name</div>
            <div class="wmod-th ag-col-kind">Type</div>
            <div class="wmod-th ag-col-ctl">Status</div>
            <div class="wmod-th"></div>
          </div>
          ${shown.length ? shown.map((it) => {
            const s = state[it.id];
            const km = KIND_META[it.kind];
            return `
            <div class="wmod-trow ag-row${s.enabled ? '' : ' is-off'}" data-ag-id="${it.id}">
              <div class="wmod-td"><span class="wmod-row-ic"><span class="material-symbols-outlined">${esc(it.icon)}</span></span></div>
              <div class="wmod-td"><div class="wmod-td-primary">${esc(it.name)}</div>${it.desc ? `<div class="wmod-td-meta">${esc(it.desc)}</div>` : ''}</div>
              <div class="wmod-td ag-col-kind"><span class="wmod-pill wmod-pill--muted">${esc(km.label)}</span></div>
              <div class="wmod-td ag-col-ctl ag-ctl">${controlCell(it, s)}</div>
              <div class="wmod-td ag-ctl"><button type="button" class="wmod-switch${s.enabled ? ' is-on' : ''}" role="switch" aria-checked="${s.enabled}" data-ag-toggle="${it.id}" aria-label="Toggle ${esc(it.name)}"><span class="wmod-knob"></span></button></div>
            </div>`;
          }).join('') : `
            <div class="wmod-empty">
              <span class="material-symbols-outlined">smart_toy</span>
              <div>Nothing matches your filters.</div>
            </div>`}
        </div>
      </div>
    </div>`;
}

export function renderAgents(mainEl) {
  hostEl = mainEl;
  filter = 'all';
  query = '';
  paint();

  mainEl.addEventListener('click', (e) => {
    const f = e.target.closest('[data-ag-filter]');
    if (f) { const v = f.dataset.agFilter; filter = (filter === v && v !== 'all') ? 'all' : v; paint(); return; }
    const tog = e.target.closest('[data-ag-toggle]');
    if (tog) { e.stopPropagation(); toggleItem(tog.dataset.agToggle); return; }
    const aut = e.target.closest('[data-ag-autonomy]');
    if (aut && !aut.disabled) { e.stopPropagation(); setAutonomy(aut.dataset.agAutonomy, +aut.dataset.lvl); return; }
    const act = e.target.closest('[data-ag-action]');
    if (act) { runAgentsIntent(act.dataset.agAction); }
  });

  mainEl.addEventListener('input', (e) => {
    const s = e.target.closest('[data-ag-search]');
    if (!s) return;
    query = s.value.trim().toLowerCase();
    const pos = s.selectionStart;
    paint();
    const again = hostEl.querySelector('[data-ag-search]');
    if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (_) {} }
  });
}

function itemById(id) { return allItems().find((it) => it.id === id) || null; }

function toggleItem(id, forceOn) {
  const s = state[id];
  if (!s) return;
  s.enabled = typeof forceOn === 'boolean' ? forceOn : !s.enabled;
  paint();
  const it = itemById(id);
  toast(`${it ? it.name : 'Item'} ${s.enabled ? 'enabled' : 'paused'}`, s.enabled ? 'play_circle' : 'pause_circle');
}

function setAutonomy(id, lvl) {
  if (!state[id]) return;
  state[id].autonomy = lvl;
  paint();
  const it = itemById(id);
  toast(`${it ? it.name : 'Agent'}: ${AUTONOMY[lvl]}`, 'tune');
}

function setAll(on) {
  allItems().forEach((it) => { state[it.id].enabled = on; });
  paint();
  toast(on ? 'All items enabled' : 'All items paused', on ? 'play_circle' : 'pause_circle');
}

/* ---- WISEcodeAI bridge -------------------------------------------------- */

export function runAgentsIntent(action) {
  switch (action) {
    case 'enable_all': setAll(true); break;
    case 'pause_all': setAll(false); break;
    case 'databases': filter = 'database'; paint(); break;
    case 'rules': filter = 'rule'; paint(); break;
    case 'skills': filter = 'skill'; paint(); break;
    default: break;
  }
}

export const AGENTS_WISEAI = {
  sub: 'Manage your agents, databases, rules and skills \u2014 just ask.',
  chipsFlow: 'wrap',
  sourceLabel: '',
  scorecards: {
    label: 'Your workspace at a glance',
    cards: [
      { intent: 'enable_all', icon: 'play_circle', iconTone: 'brand', pill: { tone: 'up', icon: 'bolt', text: 'Do next' }, title: 'Enable everything', desc: 'Turn on every agent, database, rule and skill so the pipeline runs automatically.', action: 'Enable all', ask: 'Enable everything' },
      { intent: 'databases', icon: 'database', iconTone: 'brand', pill: { tone: 'up', icon: 'filter_alt', text: 'Data' }, title: 'Show my databases', desc: 'The stores your agents read \u2014 portfolio, ingredients, GRAS evidence and trends.', action: 'Show databases', ask: 'Show my databases' },
      { intent: 'rules', icon: 'rule', iconTone: 'brand', pill: { tone: 'up', icon: 'filter_alt', text: 'Rules' }, title: 'Show my rules', desc: 'The policies agents enforce \u2014 NOVA classification, GRAS attestation, and more.', action: 'Show rules', ask: 'Show my rules' },
      { intent: 'skills', icon: 'auto_awesome', iconTone: 'brand', pill: { tone: 'up', icon: 'filter_alt', text: 'Skills' }, title: 'Show my skills', desc: 'The actions agents can perform \u2014 verify, reformulate, publish, ingest.', action: 'Show skills', ask: 'Show my skills' },
    ],
  },
  intents: [
    { intent: 'enable_all', label: 'Enable everything', icon: 'play_circle' },
    { intent: 'pause_all', label: 'Pause everything', icon: 'pause_circle' },
    { intent: 'databases', label: 'Show my databases', icon: 'database' },
    { intent: 'rules', label: 'Show my rules', icon: 'rule' },
    { intent: 'skills', label: 'Show my skills', icon: 'auto_awesome' },
  ],
  intentReplies: {
    enable_all: 'Enabled <strong>everything</strong> \u2014 every agent, database, rule and skill is active.',
    pause_all: 'Paused <strong>everything</strong>. Nothing will run automatically until you re-enable it.',
    databases: 'Filtered to your <strong>databases</strong> \u2014 the Product Portfolio, Ingredient Registry, GRAS Documentation Store and Trend Signals your agents read from.',
    rules: 'Filtered to your <strong>rules</strong> \u2014 NOVA classification, GRAS attestation policy, seed-oil flagging and ingredient normalization.',
    skills: 'Filtered to your <strong>skills</strong> \u2014 verify pre-qualified foods, reformulation what-if, publish report and ingest from URL.',
  },
  onIntent: (intent) => {
    if (intent === 'enable_all') { runAgentsIntent('enable_all'); return false; }
    if (intent === 'pause_all') { runAgentsIntent('pause_all'); return false; }
    if (intent === 'databases') { runAgentsIntent('databases'); return false; }
    if (intent === 'rules') { runAgentsIntent('rules'); return false; }
    if (intent === 'skills') { runAgentsIntent('skills'); return false; }
    return false;
  },
};
