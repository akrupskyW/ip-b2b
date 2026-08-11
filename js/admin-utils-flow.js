/**
 * Admin Utilities — WISEcode Admin module.
 *
 * Rendered into #agent-main-scroll on admin-utils.html, paired with the
 * WISEai dock. A database-info strip over a stacked list of platform
 * maintenance + seeding tools, each with a short description and a single
 * action. Uses the shared token-driven `adm-*` component set from wise.css.
 */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* The WISE bug watermark — drifts off the bottom-right of every poster and the
   Host scorecard, matching the reports.html shelf. */
const BUG_SVG = '<svg viewBox="0 0 193 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M10.9834 35.6522C10.9834 35.6522 3.30615 47.7494 3.30615 58.0481C3.30615 81.1921 20.324 99.6409 43.3405 99.9915C51.5363 100.052 60.4175 99.9915 67.533 92.6894C41.5052 92.6894 25.589 73.777 25.589 58.0481C25.589 58.0481 25.2144 45.6894 30.832 35.9526L10.9834 35.6522Z"/><path d="M83.8241 14.7368C90.9396 14.7368 94.8008 22.7337 96.3699 29.2111H96.5571C98.1262 22.7337 101.987 14.7368 109.103 14.7368H170.521C175.169 14.7368 175.169 12.8643 175.169 7.32269C175.169 2.80876 178.108 0 182.131 0H189.384V14.7368C189.384 27.7131 182.131 28.5339 174.794 28.5339L160.347 28.583H118.091C113.597 28.583 113.335 29.2111 111.537 33.7051C110.051 37.4206 96.5571 73.0277 96.5571 73.0277H96.3699C96.3699 73.0277 82.8761 37.4206 81.3899 33.7051C79.5923 29.2111 79.3301 28.583 74.8361 28.583H32.5803L18.133 28.5339C10.7965 28.5339 3.54341 27.7131 3.54341 14.7368V0H10.7965C14.5415 0 17.7585 3.37051 17.7585 7.32269C17.7585 12.8643 17.7585 14.7368 22.406 14.7368H83.8241Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M71.8001 35.9523C74.4284 35.9523 74.6161 37.2826 75.1793 38.6953L87.9434 71.5913C82.9358 80.6013 74.4289 85.7609 63.9558 85.7609C48.1132 85.7608 33.2662 72.7999 33.2663 54.6695C33.2664 48.2288 34.5088 40.1469 39.2583 35.9523H71.8001ZM63.486 44.5345C58.3905 44.5345 54.2598 48.6005 54.2598 54.0781C54.2598 59.5557 58.3905 63.6217 63.486 63.6217C68.5814 63.6216 72.7122 59.5556 72.7122 54.0781C72.7122 48.6005 68.5814 44.5346 63.486 44.5345Z"/><path d="M181.756 35.6522C181.756 35.6522 189.433 47.7494 189.433 58.0481C189.433 81.1921 172.416 99.6409 149.399 99.9915C141.203 100.052 132.322 99.9915 125.206 92.6894C151.234 92.6894 167.151 73.777 167.151 58.0481C167.151 58.0481 167.525 45.6894 161.908 35.9526L181.756 35.6522Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M120.94 35.9523C118.311 35.9523 118.124 37.2826 117.56 38.6953L104.796 71.5913C109.804 80.6013 118.311 85.7609 128.784 85.7609C144.626 85.7608 159.473 72.7999 159.473 54.6695C159.473 48.2288 158.231 40.1469 153.481 35.9523H120.94ZM129.254 44.5345C134.349 44.5345 138.48 48.6005 138.48 54.0781C138.48 59.5557 134.349 63.6217 129.254 63.6217C124.158 63.6216 120.027 59.5556 120.027 54.0781C120.027 48.6005 124.158 44.5346 129.254 44.5345Z"/></svg>';

const DB_INFO = [
  { key: 'Host',     val: 'devdb.wisecode.ai',    wide: true },
  { key: 'Port',     val: '5432' },
  { key: 'Database', val: 'wisecode_retail_new' },
  { key: 'Schema',   val: 'wisecode/pgres_app' },
];

const UTILS = [
  { id: 'seed',        icon: 'grass',              title: 'Platform Seeding',                desc: 'Seed all reference data across all platform tables. Always runs. Includes ingredients, the global vocabulary, default roles & permissions, and initial seeding. This may be destructive and safe to run at any time.', btn: 'Seed Platform Up', icon2: 'grass' },
  { id: 'fix-account', icon: 'manage_accounts',    title: 'Fix Organization Account Status', desc: 'Fix organizations to Active if they were switched to the wrong status. This corrects historical records where a payment webhook did not update the organization state.', btn: 'Fix Account Status', icon2: 'sync' },
  { id: 'refresh-verif', icon: 'verified',         title: 'Refresh All Organization Verifications', desc: 'Recompute verification statuses for all organizations from a single unified job. Ensures WISEshield tiers and rewards are up to date for every organization.', btn: 'Refresh Verification', icon2: 'autorenew' },
  { id: 'refresh-attr', icon: 'insights',          title: 'Refresh Attribute Insights',      desc: 'Recompute the full attribute cross-analysis (F-M-graded) and cache a new snapshot at the Attribute Dashboard node. The dashboard will refresh immediately when the operation ends. This may take several minutes.', btn: 'Refresh Attribute Insights', icon2: 'refresh' },
  { id: 'load-ai',     icon: 'forum',              title: 'Add Load AI Conversations',       desc: 'Insert a batch of realistic sample conversations with several representative recurring conversation records — full transcript, tool calls, and attachments — to see how the chat surfaces in testing.', btn: 'Run Conversation', icon2: 'play_arrow' },
  { id: 'recat',       icon: 'category',           title: 'Recategorized CPG Foods',         tag: 'Beta', desc: 'Find CPG-classified foods that have no product category and assign one with an entirely new AI food-classifier. Products that are already categorized are skipped. Low-confidence results are logged so you can apply the confidence label, or set it manually when the AI is unsure.', btn: 'Open Tool', icon2: 'open_in_new' },
  { id: 'backplane',   icon: 'lan',                title: 'Backplane Diagnostics',           desc: 'Check the backplane program and real-time notification pipe. Redis connectivity and fetch the current stream and channels for the dashboard cards, and use the real-time channels to broadcast. Use this to see whether a connection instead of running a reconnection.', btn: 'Open Backplane Diagnostics', icon2: 'monitor_heart' },
  { id: 'brand-verif', icon: 'domain_verification', title: 'Brand Verification',             desc: 'Verify the ownership of brand-to-org mappings. Discovers manufacturer and parent company email domains for food brands.', btn: 'Open Brand Verification', icon2: 'open_in_new' },
  { id: 'marketing',   icon: 'photo_library',      title: 'Marketing Assets',                desc: 'Manage the library of marketing resources available to verified customers.', btn: 'Open Marketing Assets', icon2: 'open_in_new', href: 'marketing-assets.html' },
  { id: 'america-upf', icon: 'public',             title: "America's UPF Dashboard",         desc: 'A public-facing dashboard exploring the ultra-processed food landscape across the country.', btn: "Open America's UPF Dashboard", icon2: 'open_in_new' },
  { id: 'attr-dash',   icon: 'dashboard',          title: 'Attribute Dashboard',             desc: 'Explore the attribute census across the food catalog, backed by the latest attribute insights snapshot.', btn: 'Open Attribute Dashboard', icon2: 'open_in_new' },
  { id: 'upf-chat',    icon: 'chat',               title: 'UPF Chat',                        desc: 'Ask questions about ultra-processed food classification through a conversational interface.', btn: 'Open UPF Chat', icon2: 'open_in_new', href: 'ai-chat.html' },
];

const UTIL_BY_ID = Object.fromEntries(UTILS.map((u) => [u.id, u]));

/* The utilities read as a poster shelf, grouped like reports.html: maintenance
   jobs that run in place, then tools & dashboards you open. */
const SECTIONS = [
  {
    eyebrow: 'Maintenance jobs',
    sub: 'Run a platform job in place — some are destructive.',
    tone: 'tone-maint', badge: 'Job',
    ids: ['seed', 'fix-account', 'refresh-verif', 'refresh-attr', 'load-ai', 'recat', 'backplane'],
  },
  {
    eyebrow: 'Tools & dashboards',
    sub: 'Open a platform tool or dashboard.',
    tone: 'tone-tool', badge: 'Tool',
    ids: ['brand-verif', 'marketing', 'america-upf', 'attr-dash', 'upf-chat'],
  },
];

/* Jobs that run in place (toast + chat narration) rather than navigating. */
const RUNNING = new Set(['seed', 'fix-account', 'refresh-verif', 'refresh-attr', 'load-ai', 'recat', 'backplane']);

let hostEl = null;

let chatApi = null;
export function setAdminUtilsChat(api) { chatApi = api; }
function pushChat(html) { if (chatApi && html) { chatApi.hideWelcome?.(); chatApi.addWISEai(html); } }

function toast(msg, icon = 'check') {
  let wrap = document.getElementById('adm-toast-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.id = 'adm-toast-wrap'; document.body.appendChild(wrap); }
  const t = document.createElement('div');
  t.className = 'adm-toast';
  t.innerHTML = `<span class="material-symbols-outlined">${esc(icon)}</span><span>${esc(msg)}</span>`;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('is-in'));
  setTimeout(() => { t.classList.remove('is-in'); setTimeout(() => t.remove(), 260); }, 2600);
}

/* ==================================================================== */
function scoreHtml(d) {
  if (d.wide) {
    return `
      <div class="au-score au-score--wide">
        <div class="au-score-top">
          <span class="au-score-key">${esc(d.key)}</span>
          <span class="au-score-pill"><span class="material-symbols-outlined">help</span>Unknown env</span>
        </div>
        <span class="au-score-val">${esc(d.val)}</span>
      </div>`;
  }
  return `
    <div class="au-score">
      <span class="au-score-key">${esc(d.key)}</span>
      <span class="au-score-val">${esc(d.val)}</span>
    </div>`;
}

function utilHtml(u, section) {
  const isRun = RUNNING.has(u.id);
  const cta = isRun
    ? `<span class="au-cta">Run<span class="material-symbols-outlined au-cta--run">play_arrow</span></span>`
    : `<span class="au-cta">Open<span class="material-symbols-outlined">north_east</span></span>`;
  return `
    <div class="au-card" role="button" tabindex="0" data-adm-util="${esc(u.id)}"${u.href ? ` data-adm-href="${esc(u.href)}"` : ''} aria-label="${esc(u.title)}">
      <div class="au-poster ${esc(section.tone)}">
        ${BUG_SVG.replace('<svg ', '<svg class="au-poster-bug" ')}
        <span class="au-poster-icon"><span class="material-symbols-outlined">${esc(u.icon)}</span></span>
        <span class="au-badge">${esc(section.badge)}</span>
        <span class="au-poster-open"><span class="material-symbols-outlined">${isRun ? 'play_arrow' : 'north_east'}</span></span>
      </div>
      <div class="au-body">
        <div class="au-name">${esc(u.title)}${u.tag ? `<span class="au-tag">${esc(u.tag)}</span>` : ''}</div>
        <p class="au-desc">${esc(u.desc)}</p>
        <div class="au-foot">${cta}</div>
      </div>
    </div>`;
}

function sectionHtml(section) {
  const cards = section.ids.map((id) => UTIL_BY_ID[id]).filter(Boolean).map((u) => utilHtml(u, section)).join('');
  return `
    <section class="au-section">
      <div class="au-sec-eyebrow">${esc(section.eyebrow)}</div>
      <div class="au-sec-sub">${esc(section.sub)}</div>
      <div class="au-grid">${cards}</div>
    </section>`;
}

function paint() {
  if (!hostEl) return;
  hostEl.innerHTML = `
    <div class="au-wrap">
      <h1 class="au-title-main">Admin Utilities</h1>
      <p class="au-lede">Platform maintenance and seeding tools, plus your live database connection.</p>

      <div class="au-db">${DB_INFO.map(scoreHtml).join('')}</div>

      ${SECTIONS.map(sectionHtml).join('')}
    </div>`;
}

function run(id, href) {
  const u = UTIL_BY_ID[id];
  if (href) { window.location.href = href; return; }
  if (RUNNING.has(id)) {
    toast(`${u ? u.title : 'Utility'} started`, 'autorenew');
    pushChat(`Running <strong>${esc(u ? u.title : id)}</strong>. I\u2019ll post the result here when it finishes — this can take a moment for larger jobs.`);
  } else {
    toast(`Opening ${u ? u.title : id}`, 'open_in_new');
    pushChat(`Opening <strong>${esc(u ? u.title : id)}</strong>.`);
  }
}

export function renderAdminUtils(mainEl) {
  hostEl = mainEl;
  paint();
  mainEl.addEventListener('click', (e) => {
    const card = e.target.closest('[data-adm-util]');
    if (card) { run(card.dataset.admUtil, card.dataset.admHref || ''); }
  });
  mainEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('[data-adm-util]');
    if (!card) return;
    e.preventDefault();
    run(card.dataset.admUtil, card.dataset.admHref || '');
  });
}

/* ==================================================================== */
export const ADMIN_UTILS_WISEAI = {
  sub: 'Run any maintenance job or open a tool on the right — just ask.',
  chipsFlow: 'wrap',
  /* Large "at a glance" cards shown alongside the small chips on the welcome
     screen — each reuses an existing intent so a click drives the same flow. */
  scorecards: {
    label: 'Maintenance at a glance',
    cards: [
      { intent: 'refresh_verif', icon: 'autorenew', iconTone: 'brand', pill: { tone: 'up', icon: 'priority_high', text: 'Do next' }, title: 'Refresh verifications', desc: 'Recompute all org verifications — WISEshield tiers and rewards.', action: 'Refresh verifications', ask: 'Refresh verifications' },
      { intent: 'seed', icon: 'grass', iconTone: 'brand', pill: { tone: 'up', icon: 'warning', text: 'Job' }, title: 'Seed the platform', desc: 'Reseed reference data — destructive, run from the job card.', action: 'Seed the platform', ask: 'Seed the platform' },
      { intent: 'db_info', icon: 'storage', iconTone: 'brand', pill: { tone: 'up', icon: 'info', text: 'Info' }, title: 'What DB am I on?', desc: 'Host, database and schema for the current environment.', action: 'What DB am I on?', ask: 'What DB am I on?' },
      { intent: 'refresh_attr', icon: 'insights', iconTone: 'brand', pill: { tone: 'up', icon: 'autorenew', text: 'Job' }, title: 'Refresh attribute insights', desc: 'Recompute the attribute insights snapshot for the dashboard.', action: 'Refresh attribute insights', ask: 'Refresh attribute insights' },
      { intent: 'fix_account', icon: 'manage_accounts', iconTone: 'brand', pill: { tone: 'up', icon: 'build', text: 'Job' }, title: 'Fix an account status', desc: 'Flip an org back to Active when a payment webhook missed the change.', action: 'Fix an account status', ask: 'Fix an account status' },
    ],
  },
  intents: [
    { intent: 'seed',          label: 'Seed the platform',        icon: 'grass' },
    { intent: 'refresh_verif', label: 'Refresh verifications',    icon: 'autorenew' },
    { intent: 'refresh_attr',  label: 'Refresh attribute insights', icon: 'insights' },
    { intent: 'fix_account',   label: 'Fix an account status',    icon: 'manage_accounts' },
    { intent: 'backplane',     label: 'Backplane diagnostics',    icon: 'lan' },
    { intent: 'db_info',       label: 'What DB am I on?',         icon: 'storage' },
  ],
  intentReplies: {
    seed:          () => 'Heads up — <strong>Platform Seeding</strong> reseeds all reference data and can be destructive. Open its card under <em>Maintenance jobs</em> on the right and hit Run when you\u2019re ready.',
    refresh_verif: () => 'Recomputing <strong>all organization verifications</strong> from the unified job — WISEshield tiers and rewards will be brought up to date. That\u2019s the <em>Refresh All Organization Verifications</em> card on the right.',
    refresh_attr:  () => 'Recomputing the <strong>attribute insights</strong> snapshot. The Attribute Dashboard refreshes as soon as it finishes; this can take a few minutes. Its card sits under <em>Maintenance jobs</em>.',
    fix_account:   () => 'The <strong>Fix Organization Account Status</strong> job flips orgs back to Active when a payment webhook missed the state change. You\u2019ll find it in the <em>Maintenance jobs</em> shelf.',
    backplane:     () => 'Opening <strong>Backplane Diagnostics</strong> — check Redis connectivity and the real-time notification pipe.',
    db_info:       () => 'Check the <strong>Host</strong> scorecard up top on the right: you\u2019re on <strong>devdb.wisecode.ai:5432</strong>, database <strong>wisecode_retail_new</strong> (schema wisecode/pgres_app). The environment is still flagged Unknown.',
  },
  onIntent: (intent) => {
    switch (intent) {
      case 'seed':          toast('Platform Seeding started', 'autorenew'); break;
      case 'refresh_verif': toast('Refresh Verification started', 'autorenew'); break;
      case 'refresh_attr':  toast('Refresh Attribute Insights started', 'autorenew'); break;
      case 'fix_account':   toast('Fix Account Status started', 'sync'); break;
      case 'backplane':     toast('Opening Backplane Diagnostics', 'open_in_new'); break;
      default: break;
    }
    return false;
  },
};
