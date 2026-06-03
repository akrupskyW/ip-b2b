/**
 * Whootie™ Flows — the conversational-tree engine for pages/whootie-flows.html.
 *
 * Each rectangle scorecard on the Whootie welcome screen launches a full
 * conversational tree (a graph of nodes). As the user walks the tree, the
 * relevant modules pop up in the stage on the right and fill in step by step.
 * When a flow reaches an `end` node, a dedicated result module appears that
 * recaps what was done, shows the outcome, and offers options for what to do
 * next.
 *
 * A flow is:
 *   { launch, intro, start, nodes:{ id: node } }
 * A node is:
 *   {
 *     say:    'Whootie reply (HTML)',
 *     status: 'typing label',
 *     run:    (S) => {...}            // optional module side-effects
 *     choices:[{ label, icon, say, next, primary }]   // branch chips
 *     next:   'nodeId'               // auto-advance (no chip)
 *     end:    { ...resultConfig }    // terminal → show result module
 *   }
 * S is the stage API: { open, section, progress, step, get }.
 */

/* ── WISE-owl marks (verbatim from js/scout-chat.js) ──────────────────── */
const OWL_BUG = `<svg viewBox="0 0 193 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M10.9834 35.6522C10.9834 35.6522 3.30615 47.7494 3.30615 58.0481C3.30615 81.1921 20.324 99.6409 43.3405 99.9915C51.5363 100.052 60.4175 99.9915 67.533 92.6894C41.5052 92.6894 25.589 73.777 25.589 58.0481C25.589 58.0481 25.2144 45.6894 30.832 35.9526L10.9834 35.6522Z"/><path d="M83.8241 14.7368C90.9396 14.7368 94.8008 22.7337 96.3699 29.2111H96.5571C98.1262 22.7337 101.987 14.7368 109.103 14.7368H170.521C175.169 14.7368 175.169 12.8643 175.169 7.32269C175.169 2.80876 178.108 0 182.131 0H189.384V14.7368C189.384 27.7131 182.131 28.5339 174.794 28.5339L160.347 28.583H118.091C113.597 28.583 113.335 29.2111 111.537 33.7051C110.051 37.4206 96.5571 73.0277 96.5571 73.0277H96.3699C96.3699 73.0277 82.8761 37.4206 81.3899 33.7051C79.5923 29.2111 79.3301 28.583 74.8361 28.583H32.5803L18.133 28.5339C10.7965 28.5339 3.54341 27.7131 3.54341 14.7368V0H10.7965C14.5415 0 17.7585 3.37051 17.7585 7.32269C17.7585 12.8643 17.7585 14.7368 22.406 14.7368H83.8241Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M71.8001 35.9523C74.4284 35.9523 74.6161 37.2826 75.1793 38.6953L87.9434 71.5913C82.9358 80.6013 74.4289 85.7609 63.9558 85.7609C48.1132 85.7608 33.2662 72.7999 33.2663 54.6695C33.2664 48.2288 34.5088 40.1469 39.2583 35.9523H71.8001ZM63.486 44.5345C58.3905 44.5345 54.2598 48.6005 54.2598 54.0781C54.2598 59.5557 58.3905 63.6217 63.486 63.6217C68.5814 63.6216 72.7122 59.5556 72.7122 54.0781C72.7122 48.6005 68.5814 44.5346 63.486 44.5345Z"/><path d="M181.756 35.6522C181.756 35.6522 189.433 47.7494 189.433 58.0481C189.433 81.1921 172.416 99.6409 149.399 99.9915C141.203 100.052 132.322 99.9915 125.206 92.6894C151.234 92.6894 167.151 73.777 167.151 58.0481C167.151 58.0481 167.525 45.6894 161.908 35.9526L181.756 35.6522Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M120.94 35.9523C118.311 35.9523 118.124 37.2826 117.56 38.6953L104.796 71.5913C109.804 80.6013 118.311 85.7609 128.784 85.7609C144.626 85.7608 159.473 72.7999 159.473 54.6695C159.473 48.2288 158.231 40.1469 153.481 35.9523H120.94ZM129.254 44.5345C134.349 44.5345 138.48 48.6005 138.48 54.0781C138.48 59.5557 134.349 63.6217 129.254 63.6217C124.158 63.6216 120.027 59.5556 120.027 54.0781C120.027 48.6005 124.158 44.5346 129.254 44.5345Z"/></svg>`;
const OWL_MARK = `<svg viewBox="0 0 193 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.9834 35.6522C10.9834 35.6522 3.30615 47.7494 3.30615 58.0481C3.30615 81.1921 20.324 99.6409 43.3405 99.9915C51.5363 100.052 60.4175 99.9915 67.533 92.6894C41.5052 92.6894 25.589 73.777 25.589 58.0481C25.589 58.0481 25.2144 45.6894 30.832 35.9526L10.9834 35.6522Z" fill="white"/><path d="M83.8241 14.7368C90.9396 14.7368 94.8008 22.7337 96.3699 29.2111H96.5571C98.1262 22.7337 101.987 14.7368 109.103 14.7368H170.521C175.169 14.7368 175.169 12.8643 175.169 7.32269C175.169 2.80876 178.108 0 182.131 0H189.384V14.7368C189.384 27.7131 182.131 28.5339 174.794 28.5339L160.347 28.583H118.091C113.597 28.583 113.335 29.2111 111.537 33.7051C110.051 37.4206 96.5571 73.0277 96.5571 73.0277H96.3699C96.3699 73.0277 82.8761 37.4206 81.3899 33.7051C79.5923 29.2111 79.3301 28.583 74.8361 28.583H32.5803L18.133 28.5339C10.7965 28.5339 3.54341 27.7131 3.54341 14.7368V0H10.7965C14.5415 0 17.7585 3.37051 17.7585 7.32269C17.7585 12.8643 17.7585 14.7368 22.406 14.7368H83.8241Z" fill="white"/><path fill-rule="evenodd" clip-rule="evenodd" d="M71.8001 35.9523C74.4284 35.9523 74.6161 37.2826 75.1793 38.6953L87.9434 71.5913C82.9358 80.6013 74.4289 85.7609 63.9558 85.7609C48.1132 85.7608 33.2662 72.7999 33.2663 54.6695C33.2664 48.2288 34.5088 40.1469 39.2583 35.9523H71.8001ZM63.486 44.5345C58.3905 44.5345 54.2598 48.6005 54.2598 54.0781C54.2598 59.5557 58.3905 63.6217 63.486 63.6217C68.5814 63.6216 72.7122 59.5556 72.7122 54.0781C72.7122 48.6005 68.5814 44.5346 63.486 44.5345Z" fill="white"/><path d="M181.756 35.6522C181.756 35.6522 189.433 47.7494 189.433 58.0481C189.433 81.1921 172.416 99.6409 149.399 99.9915C141.203 100.052 132.322 99.9915 125.206 92.6894C151.234 92.6894 167.151 73.777 167.151 58.0481C167.151 58.0481 167.525 45.6894 161.908 35.9526L181.756 35.6522Z" fill="white"/><path fill-rule="evenodd" clip-rule="evenodd" d="M120.94 35.9523C118.311 35.9523 118.124 37.2826 117.56 38.6953L104.796 71.5913C109.804 80.6013 118.311 85.7609 128.784 85.7609C144.626 85.7608 159.473 72.7999 159.473 54.6695C159.473 48.2288 158.231 40.1469 153.481 35.9523H120.94ZM129.254 44.5345C134.349 44.5345 138.48 48.6005 138.48 54.0781C138.48 59.5557 134.349 63.6217 129.254 63.6217C124.158 63.6216 120.027 59.5556 120.027 54.0781C120.027 48.6005 124.158 44.5346 129.254 44.5345Z" fill="white"/></svg>`;

const stage = document.getElementById('flow-stage');
const card = document.getElementById('whootie-card');
const messages = document.getElementById('chat-messages');
const welcome = document.getElementById('welcome');

/* Place the owl marks. */
document.getElementById('brand-bug').innerHTML = OWL_BUG;
document.getElementById('topbar-bug').innerHTML = OWL_BUG;
document.getElementById('welcome-logo').innerHTML = OWL_MARK;

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function nowLabel() {
  try { return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); } catch (_) { return ''; }
}
const scrollDown = () => { messages.scrollTop = messages.scrollHeight; };

/* ── Chat primitives ──────────────────────────────────────────────────── */
function hideWelcome() { welcome.classList.add('sc-hidden'); }
function showWelcome() { welcome.classList.remove('sc-hidden'); }

function addUser(text) {
  messages.insertAdjacentHTML('beforeend',
    `<div class="sc-line sc-line-you"><span class="sc-avatar sc-avatar-you" role="img" aria-label="You">MC</span>` +
    `<div class="sc-line-body">${esc(text)}<div class="sc-line-meta"><span class="sc-line-time">${nowLabel()}</span></div></div></div>`);
  scrollDown();
}
function addScout(html, source = 'Grounded in WISE data') {
  const meta = `<div class="sc-line-meta">${source
    ? `<span class="sc-trust-chip"><span class="material-icons">verified_user</span>${esc(source)}</span>` : ''
    }<span class="sc-line-time">${nowLabel()}</span></div>`;
  messages.insertAdjacentHTML('beforeend',
    `<div class="sc-line sc-line-scout"><span class="sc-avatar sc-avatar-scout" role="img" aria-label="Whootie">${OWL_BUG}</span>` +
    `<div class="sc-line-body">${html}${meta}</div></div>`);
  scrollDown();
}
function showTyping(label) {
  const el = document.createElement('div');
  el.className = 'sc-line sc-line-scout sc-line-typing';
  el.innerHTML = `<span class="sc-avatar sc-avatar-scout" role="img" aria-label="Whootie">${OWL_BUG}</span>` +
    `<div class="sc-line-body"><span class="sc-typing-status"><span class="sc-typing" aria-hidden="true"><span></span><span></span><span></span></span>` +
    `<span class="sc-typing-label">${esc(label || 'Whootie™ is thinking')}…</span></span></div>`;
  messages.appendChild(el);
  scrollDown();
  return el;
}
function clearChips() { document.getElementById('flow-chips')?.remove(); }

function addReplyChips(choices) {
  clearChips();
  const row = document.createElement('div');
  row.className = 'sc-reply-chips';
  row.id = 'flow-chips';
  row.innerHTML = choices.map((c, i) =>
    `<button type="button" class="chip${c.primary ? ' chip-primary' : ''}" data-choice="${i}">` +
    `<span class="material-icons">${esc(c.icon || 'east')}</span>${esc(c.label)}</button>`).join('');
  messages.appendChild(row);
  scrollDown();
}

/* ── Stage / module API ───────────────────────────────────────────────── */
function clearStage() {
  Array.from(stage.children).forEach((el) => { if (el !== card) el.remove(); });
}

function openModule(id, { title, icon = 'dashboard', sub = '', wide = false } = {}) {
  let el = document.getElementById('mod-' + id);
  if (el) return el;
  el = document.createElement('section');
  el.className = 'flow-module' + (wide ? ' is-wide' : '');
  el.id = 'mod-' + id;
  el.innerHTML =
    `<div class="flow-mod-head">` +
      `<div class="flow-mod-icon"><span class="material-icons">${esc(icon)}</span></div>` +
      `<div class="flow-mod-titles"><div class="flow-mod-title">${esc(title)}</div>` +
        `<div class="flow-mod-sub" id="mod-${id}-sub">${esc(sub)}</div></div>` +
      `<button type="button" class="flow-mod-close" title="Close" data-close="${id}"><span class="material-icons">close</span></button>` +
    `</div>` +
    `<div class="flow-mod-scroll">` +
      `<div class="wf-progress-wrap" id="mod-${id}-prog" hidden>` +
        `<div class="wf-progress-head"><span id="mod-${id}-prog-label">Step 0</span>` +
        `<span class="wf-progress-pct" id="mod-${id}-prog-pct">0%</span></div>` +
        `<div class="wf-progress-track"><div class="wf-progress-fill" id="mod-${id}-prog-fill"></div></div>` +
      `</div>` +
      `<div class="wf-body" id="mod-${id}-body">` +
        `<div class="wf-empty" id="mod-${id}-empty"><span class="material-icons">${esc(icon)}</span>` +
        `<p class="wf-empty-title">Building…</p>` +
        `<p class="wf-empty-sub">Whootie™ fills this in as the conversation advances.</p></div>` +
      `</div>` +
    `</div>`;
  stage.appendChild(el);
  el.scrollIntoView({ behavior: 'smooth', inline: 'end', block: 'nearest' });
  return el;
}

function setSub(id, text) {
  const s = document.getElementById(`mod-${id}-sub`);
  if (s) s.textContent = text;
}

/* Append a section to a module body, clearing the empty state first. */
function section(id, num, title, html, { check = false } = {}) {
  const body = document.getElementById(`mod-${id}-body`);
  if (!body) return;
  document.getElementById(`mod-${id}-empty`)?.remove();
  const sec = document.createElement('div');
  sec.className = 'wf-section';
  const badge = num === '✓' || check
    ? `<span class="wf-section-num is-check"><span class="material-icons" style="font-size:11px">check</span></span>`
    : `<span class="wf-section-num">${num}</span>`;
  sec.innerHTML = `<div class="wf-section-head">${badge}<span class="wf-section-title">${title}</span></div>${html}`;
  body.appendChild(sec);
  const sc = body.closest('.flow-mod-scroll');
  if (sc) sc.scrollTop = sc.scrollHeight;
  /* Kick width transitions on any fills inserted at width:0. */
  requestAnimationFrame(() => {
    sec.querySelectorAll('[data-fill]').forEach((f) => { f.style.width = f.dataset.fill; });
  });
  return sec;
}

function progress(id, step, total, label) {
  const wrap = document.getElementById(`mod-${id}-prog`);
  if (!wrap) return;
  wrap.hidden = false;
  const pct = Math.round((step / total) * 100);
  const fill = document.getElementById(`mod-${id}-prog-fill`);
  const lab = document.getElementById(`mod-${id}-prog-label`);
  const pctEl = document.getElementById(`mod-${id}-prog-pct`);
  if (fill) requestAnimationFrame(() => { fill.style.width = pct + '%'; });
  if (lab) lab.textContent = label || `Step ${step} of ${total}`;
  if (pctEl) pctEl.textContent = pct + '%';
}

const S = { open: openModule, section, progress, setSub };

/* ── Small builders for module content ───────────────────────────────── */
function scoreBlock(label, num, unit, pct, grad) {
  return `<div class="wf-score-row"><span class="wf-score-label">${label}</span>` +
    `<span class="wf-score-num">${num}<small>${unit || ''}</small></span></div>` +
    `<div class="wf-score-track"><div class="wf-score-fill" data-fill="${pct}%" style="background:${grad}"></div></div>`;
}
function rowLine(color, text, tag, tagCls) {
  return `<div class="wf-row"><span class="wf-dot" style="background:${color}"></span>${text}` +
    (tag ? `<span class="wf-tag ${tagCls}">${tag}</span>` : '') + `</div>`;
}
function swapLine(from, to) {
  return `<div class="wf-swap"><span class="wf-swap-from">${from}</span>` +
    `<span class="material-icons wf-swap-arrow">east</span><span class="wf-swap-to">${to}</span></div>`;
}
function stepLine(label, state, icon) {
  return `<div class="wf-step ${state === 'done' ? 'is-done' : state === 'active' ? 'is-active' : ''}">` +
    `<span class="wf-step-dot"><span class="material-icons">${state === 'done' ? 'check' : icon || 'radio_button_unchecked'}</span></span>` +
    `<span class="wf-step-label">${label}</span></div>`;
}
function bars(rows) {
  const max = Math.max.apply(null, rows.map((r) => r.val));
  return `<div class="fm-bars">` + rows.map((r) => {
    const h = Math.round((r.val / max) * 76) + 8;
    return `<div class="fm-bar${r.peak ? ' is-peak' : ''}"><span class="fm-bar-val">${r.disp || r.val}</span>` +
      `<span class="fm-bar-fill" style="height:${h}px"></span><span class="fm-bar-label">${r.label}</span></div>`;
  }).join('') + `</div>`;
}

/* ── The result module ────────────────────────────────────────────────── */
function showResult(cfg) {
  document.getElementById('flow-result')?.remove();
  const el = document.createElement('section');
  el.className = 'flow-result';
  el.id = 'flow-result';
  const recap = (cfg.recap || []).map((r) => `<li><span class="material-icons">check_circle</span>${r}</li>`).join('');
  const options = (cfg.options || []).map((o, i) =>
    `<button type="button" class="fr-opt${o.primary ? ' fr-opt--primary' : ''}" data-opt="${i}">` +
    `<span class="material-icons">${esc(o.icon || 'bolt')}</span>${esc(o.label)}` +
    `<span class="fr-opt-arrow"><span class="material-icons">chevron_right</span></span></button>`).join('');
  el.innerHTML =
    `<div class="fr-head"><div class="fr-check"><span class="material-icons">${esc(cfg.icon || 'task_alt')}</span></div>` +
      `<div class="fr-title">${esc(cfg.title || 'Flow complete')}</div>` +
      `<div class="fr-sub">${cfg.sub || ''}</div></div>` +
    `<div class="fr-scroll">` +
      `<p class="fr-block-label">What was done</p><ul class="fr-recap">${recap}</ul>` +
      (cfg.outcome ? `<p class="fr-block-label">Result</p><div class="fr-outcome">` +
        `<div class="fr-outcome-metric">${cfg.outcome.metric}</div>` +
        `<div class="fr-outcome-label">${cfg.outcome.label}</div></div>` : '') +
      `<p class="fr-block-label">What would you like to do?</p>` +
      `<div class="fr-options">${options}</div>` +
    `</div>`;
  el.__options = cfg.options || [];
  stage.appendChild(el);
  el.scrollIntoView({ behavior: 'smooth', inline: 'end', block: 'nearest' });
}

/* ── Toast for terminal actions ───────────────────────────────────────── */
let toastTimer = null;
function showToast(text) {
  const t = document.getElementById('flow-toast');
  document.getElementById('flow-toast-text').textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ════════════════════════════════════════════════════════════════════════
   FLOW DEFINITIONS — one full conversational tree per rectangle card.
   ════════════════════════════════════════════════════════════════════════ */
const FLOWS = {

  /* ── 1. Portfolio WISE Score ───────────────────────────────────────── */
  portfolio: {
    launch: 'Review my portfolio health',
    intro: 'Let’s look at your <strong>Portfolio WISE Score</strong>. I’ve pinned a health board on the right — <strong>82/100</strong>, up 4 points this week, with 11 of 14 products verified. Where should we dig in?',
    introStatus: 'Pulling your portfolio health…',
    introRun: (s) => {
      s.open('portfolio', { title: 'Portfolio Health', icon: 'insights', sub: '14 products · 11 verified' });
      s.section('portfolio', 1, 'Overall WISE Score',
        scoreBlock('This week', '82', '/100', 82, 'linear-gradient(90deg,var(--primary),#22d3ee)') +
        `<span class="wf-badge"><span class="material-icons">trending_up</span>+4 pts vs last week</span>`);
      s.progress('portfolio', 1, 4);
    },
    start: 'n1',
    nodes: {
      n1: {
        choices: [
          { label: 'What’s dragging the score down?', icon: 'south', say: 'What’s dragging the score down?', next: 'detractors', primary: true },
          { label: 'Which products are verified?', icon: 'verified', say: 'Which products are verified?', next: 'verified' },
        ],
      },
      verified: {
        say: 'Here are the strong performers. <strong>11 products</strong> hold a live NON-UPF verification — these anchor the 82.',
        status: 'Listing verified SKUs…',
        run: (s) => {
          s.section('portfolio', 2, 'Verified · holding the score',
            rowLine('var(--sec-green,#16a34a)', 'Organic Rolled Oats', '94', 'wf-tag--green') +
            rowLine('var(--sec-green,#16a34a)', 'Sprouted Almonds', '91', 'wf-tag--green') +
            rowLine('var(--sec-green,#16a34a)', 'Quinoa Blend', '88', 'wf-tag--green') +
            `<p class="wf-note">+ 8 more verified SKUs scoring 80–95.</p>`);
          s.progress('portfolio', 2, 4);
        },
        choices: [{ label: 'Now show what’s dragging it down', icon: 'south', say: 'Now show what’s dragging it down', next: 'detractors', primary: true }],
      },
      detractors: {
        say: 'Three unverified products pull the average down. The <strong>Mixed Berry Granola (54)</strong> is the biggest drag — a single UPF marker is capping it.',
        status: 'Finding score detractors…',
        run: (s) => {
          s.section('portfolio', 2, 'Score detractors',
            rowLine('var(--sec-red,#D94C4C)', 'Mixed Berry Granola', '54', 'wf-tag--red') +
            rowLine('var(--ter-amber,#F5A524)', 'Trail Mix Clusters', '63', 'wf-tag--amber') +
            rowLine('var(--ter-amber,#F5A524)', 'Choc-Chip Protein Bar', '67', 'wf-tag--amber'));
          s.progress('portfolio', 2, 4);
        },
        choices: [
          { label: 'Plan a fix for the lowest one', icon: 'auto_fix_high', say: 'Plan a fix for the lowest one', next: 'plan', primary: true },
          { label: 'Show the category breakdown', icon: 'category', say: 'Show me the category breakdown', next: 'category' },
        ],
      },
      category: {
        say: 'By category, <strong>Snacks</strong> is your weakest band — that’s where the granola and clusters sit. Pantry and Breakfast are both clearing 85+.',
        status: 'Grouping by category…',
        run: (s) => {
          s.section('portfolio', 3, 'Average score by category',
            bars([
              { label: 'Pantry', val: 89, peak: true }, { label: 'Bkfst', val: 86 },
              { label: 'Bev', val: 81 }, { label: 'Snacks', val: 64 },
            ]));
          s.progress('portfolio', 3, 4);
        },
        choices: [{ label: 'Project the gain if I fix Snacks', icon: 'trending_up', say: 'Project the gain if I fix Snacks', next: 'plan', primary: true }],
      },
      plan: {
        say: 'If we reformulate the granola to clear its UPF marker, it jumps <strong>54 → 88</strong>. That single fix lifts the whole portfolio from <strong>82 → 86</strong>.',
        status: 'Projecting the lift…',
        run: (s) => {
          s.section('portfolio', 3, 'Recommended action',
            `<div class="wf-product-name">Reformulate: Mixed Berry Granola</div>` +
            `<div class="wf-product-meta">Sunrise Foods · SKU SF-8821</div>` +
            scoreBlock('Projected SKU score', '88', '/100', 88, 'linear-gradient(90deg,var(--sec-green,#16a34a),#22d3ee)'));
          s.progress('portfolio', 4, 4);
          s.setSub('portfolio', 'Projected · 82 → 86');
        },
        next: 'done',
      },
      done: {
        say: 'Here’s the summary of the review and the projected portfolio lift.',
        status: 'Wrapping up…',
        run: (s) => {
          s.section('portfolio', '✓', 'Projected portfolio score',
            scoreBlock('Before', '82', '/100', 82, 'linear-gradient(90deg,var(--primary),#60a5fa)') +
            `<div style="height:8px"></div>` +
            scoreBlock('After fixing the granola', '86', '/100', 86, 'linear-gradient(90deg,var(--sec-green,#16a34a),#22d3ee)') +
            `<span class="wf-badge"><span class="material-icons">eco</span>+4 portfolio pts</span>`);
        },
        end: {
          title: 'Portfolio reviewed',
          sub: 'Whootie™ scored your catalog and found the single highest-leverage fix.',
          icon: 'insights',
          recap: [
            'Scored all <strong>14 products</strong> (11 verified, 3 not)',
            'Identified <strong>3 detractors</strong> dragging the average',
            'Pinpointed the granola as the highest-leverage fix',
            'Projected a <strong>+4 pt</strong> portfolio lift from one reformulation',
          ],
          outcome: { metric: '82 → 86', label: 'Projected Portfolio WISE Score after the recommended fix.' },
          options: [
            { label: 'Start the reformulation plan', icon: 'science', primary: true, run: () => startFlow('reformulation') },
            { label: 'Export the health brief', icon: 'download', run: () => showToast('Portfolio health brief exported') },
            { label: 'Save this as a view', icon: 'bookmark', run: () => showToast('Saved “Portfolio Health” view') },
            { label: 'Back to the welcome screen', icon: 'home', run: () => resetToWelcome() },
          ],
        },
      },
    },
  },

  /* ── 2. Verifications Expiring ─────────────────────────────────────── */
  expiring: {
    launch: 'Which verifications are expiring?',
    intro: 'You have <strong>2 verifications expiring</strong> — the soonest lapses in <strong>6 days</strong>. I’ve opened a renewals board. Renewing keeps the NON-UPF claim live on-pack. How do you want to handle them?',
    introStatus: 'Checking expiry dates…',
    introRun: (s) => {
      s.open('renewals', { title: 'Renewals', icon: 'pending_actions', sub: '2 expiring soon' });
      s.section('renewals', 1, 'Expiring soon',
        rowLine('var(--sec-red,#D94C4C)', 'Sprouted Almonds', '6 days', 'wf-tag--red') +
        rowLine('var(--ter-amber,#F5A524)', 'Quinoa Blend', '19 days', 'wf-tag--amber'));
      s.progress('renewals', 1, 3);
    },
    start: 'n1',
    nodes: {
      n1: {
        choices: [
          { label: 'Renew both now', icon: 'autorenew', say: 'Renew both now', next: 'renew', primary: true },
          { label: 'Review the soonest first', icon: 'visibility', say: 'Review the soonest one first', next: 'review' },
        ],
      },
      review: {
        say: 'The <strong>Sprouted Almonds</strong> verification was issued 11 months ago and lapses in 6 days. Nothing about the recipe has changed, so renewal is a clean re-attest — no new analysis needed.',
        status: 'Opening the soonest record…',
        run: (s) => {
          s.section('renewals', 2, 'Sprouted Almonds · detail',
            `<div class="wf-product-name">Sprouted Almonds</div>` +
            `<div class="wf-product-meta">Nutrient Survival · SKU NS-204</div>` +
            rowLine('var(--sec-green,#16a34a)', 'Recipe unchanged since issue', 'Clean', 'wf-tag--green') +
            rowLine('var(--primary)', 'NFP+ on file', 'Ready', 'wf-tag--blue'));
        },
        choices: [
          { label: 'Renew both', icon: 'autorenew', say: 'Renew both', next: 'renew', primary: true },
        ],
      },
      renew: {
        say: 'Renewing through <strong>Confirm → Attest → Activate</strong>. I’ve spun up the verification stepper and locked the attestation for both SKUs — confirm the renewal and I’ll process payment.',
        status: 'Preparing renewals…',
        run: (s) => {
          s.open('verify', { title: 'Verification', icon: 'verified', sub: 'Confirm → Attest → Activate' });
          s.section('verify', 1, 'Renewal stepper',
            stepLine('Confirm products', 'done') +
            stepLine('Re-attest data', 'active', 'draw') +
            stepLine('Payment', 'pending', 'credit_card') +
            stepLine('Re-issue Shield', 'pending', 'verified'));
          s.progress('renewals', 2, 3);
        },
        choices: [{ label: 'Confirm & pay renewal', icon: 'gpp_good', say: 'Confirm and pay the renewal', next: 'done', primary: true }],
      },
      done: {
        say: '🎉 Both renewals are processed — payment of <strong>2 × $100 = $200</strong> on the card ending 4242. Shields re-issued and valid for another <strong>12 months</strong>.',
        status: 'Processing payment & re-issuing…',
        run: (s) => {
          document.getElementById('mod-verify-body').innerHTML = '';
          s.section('verify', '✓', 'Renewal complete',
            stepLine('Confirm products', 'done') +
            stepLine('Re-attest data', 'done') +
            stepLine('Payment · $200', 'done') +
            stepLine('Shields re-issued', 'done'));
          s.section('renewals', '✓', 'Renewed',
            rowLine('var(--sec-green,#16a34a)', 'Sprouted Almonds', '+12 mo', 'wf-tag--green') +
            rowLine('var(--sec-green,#16a34a)', 'Quinoa Blend', '+12 mo', 'wf-tag--green') +
            `<span class="wf-badge"><span class="material-icons">verified</span>NON-UPF status extended</span>`);
          s.progress('renewals', 3, 3);
          s.setSub('renewals', '2 renewed · valid 12 mo');
        },
        end: {
          title: 'Verifications renewed',
          sub: 'Both expiring Shields are live again with a fresh 12-month term.',
          icon: 'verified',
          recap: [
            'Re-attested <strong>2 SKUs</strong> with no recipe changes',
            'Processed renewal payment of <strong>$200</strong>',
            'Re-issued both Verified Shield badges',
            'Extended NON-UPF status for <strong>12 months</strong>',
          ],
          outcome: { metric: '0 expiring', label: 'No verifications lapse in the next 30 days.' },
          options: [
            { label: 'Download the certificates', icon: 'download', primary: true, run: () => showToast('Renewal certificates downloaded') },
            { label: 'Add renewal reminders to calendar', icon: 'event', run: () => showToast('Reminders added for next renewal') },
            { label: 'Notify the team', icon: 'group', run: () => showToast('Team notified of renewals') },
            { label: 'Back to the welcome screen', icon: 'home', run: () => resetToWelcome() },
          ],
        },
      },
    },
  },

  /* ── 3. Additive Flags Open ────────────────────────────────────────── */
  flags: {
    launch: 'Investigate my additive flags',
    intro: 'There are <strong>3 additive flags</strong> open across 2 products. I’ve opened a review board listing each one with its risk tier. Want to inspect them one at a time, or resolve all three with clean-label swaps?',
    introStatus: 'Loading flagged additives…',
    introRun: (s) => {
      s.open('flags', { title: 'Additive Review', icon: 'flag', sub: '3 flags · 2 products' });
      s.section('flags', 1, 'Open flags',
        rowLine('var(--sec-red,#D94C4C)', 'High-Fructose Corn Syrup', 'Granola', 'wf-tag--red') +
        rowLine('var(--ter-amber,#F5A524)', 'Soybean Oil', 'Granola', 'wf-tag--amber') +
        rowLine('var(--sec-red,#D94C4C)', 'Natural Flavor (opaque)', 'Trail Mix', 'wf-tag--red'));
      s.progress('flags', 1, 4);
    },
    start: 'n1',
    nodes: {
      n1: {
        choices: [
          { label: 'Inspect the first flag', icon: 'search', say: 'Inspect the first flag', next: 'inspect', primary: true },
          { label: 'Resolve all 3 with swaps', icon: 'auto_fix_high', say: 'Resolve all 3 with swaps', next: 'resolve' },
        ],
      },
      inspect: {
        say: '<strong>High-Fructose Corn Syrup</strong> trips a UPF marker — it’s a refined sweetener with no clean-label equivalent on the panel. It’s the single reason the granola can’t verify. You can swap it, or log a dispute with a rationale.',
        status: 'Opening the flag…',
        run: (s) => {
          s.section('flags', 2, 'Flag detail · HFCS',
            rowLine('var(--sec-red,#D94C4C)', 'UPF marker', 'Tier 4', 'wf-tag--red') +
            rowLine('var(--ter-amber,#F5A524)', 'Found in', '1 product', 'wf-tag--amber') +
            `<p class="wf-note">Blocks NON-UPF verification until resolved.</p>`);
          s.progress('flags', 2, 4);
        },
        choices: [
          { label: 'Suggest a clean-label swap', icon: 'eco', say: 'Suggest a clean-label swap', next: 'resolve', primary: true },
          { label: 'Log a dispute instead', icon: 'gavel', say: 'Log a dispute with rationale', next: 'dispute' },
        ],
      },
      dispute: {
        say: 'Logged a dispute on the HFCS flag with your rationale and attached it to the audit trail. A reviewer will weigh in — but the other two flags still need a decision.',
        status: 'Filing the dispute…',
        run: (s) => {
          s.section('flags', 3, 'Dispute filed',
            rowLine('var(--primary)', 'HFCS flag', 'Under review', 'wf-tag--blue'));
          s.progress('flags', 3, 4);
        },
        choices: [{ label: 'Resolve the remaining two with swaps', icon: 'auto_fix_high', say: 'Resolve the remaining flags with swaps', next: 'resolve', primary: true }],
      },
      resolve: {
        say: 'Here are clean-label swaps that clear every flag while keeping flavor and shelf-life intact. Applying all three takes both products to a verifiable recipe.',
        status: 'Matching clean-label alternatives…',
        run: (s) => {
          s.section('flags', 3, 'Suggested swaps',
            swapLine('High-Fructose Corn Syrup', 'Date Paste') +
            swapLine('Soybean Oil', 'Cold-Pressed Sunflower Oil') +
            swapLine('Natural Flavor (opaque)', 'Freeze-Dried Berry Powder'));
          s.progress('flags', 3, 4);
        },
        choices: [{ label: 'Apply all swaps', icon: 'done_all', say: 'Apply all the swaps', next: 'done', primary: true }],
      },
      done: {
        say: 'All <strong>3 flags resolved</strong>. With these swaps applied, both products clear their UPF markers and are eligible for verification.',
        status: 'Applying swaps…',
        run: (s) => {
          s.section('flags', '✓', 'Resolved',
            rowLine('var(--sec-green,#16a34a)', 'Granola', '2 cleared', 'wf-tag--green') +
            rowLine('var(--sec-green,#16a34a)', 'Trail Mix', '1 cleared', 'wf-tag--green') +
            `<span class="wf-badge"><span class="material-icons">eco</span>Both products now UPF-clear</span>`);
          s.progress('flags', 4, 4);
          s.setSub('flags', '0 open · 3 resolved');
        },
        end: {
          title: 'Additive flags cleared',
          sub: 'Every open flag has a resolution and both products are verification-eligible.',
          icon: 'flag',
          recap: [
            'Reviewed <strong>3 flags</strong> across 2 products',
            'Matched a clean-label swap for each additive',
            'Cleared the UPF markers on both products',
            'Logged every decision to the audit trail',
          ],
          outcome: { metric: '0 open flags', label: '2 products are now eligible for NON-UPF verification.' },
          options: [
            { label: 'Send swaps to R&D', icon: 'send', primary: true, run: () => showToast('Swap brief sent to R&D') },
            { label: 'Build the reformulation plan', icon: 'science', run: () => startFlow('reformulation') },
            { label: 'Export the review', icon: 'download', run: () => showToast('Additive review exported') },
            { label: 'Back to the welcome screen', icon: 'home', run: () => resetToWelcome() },
          ],
        },
      },
    },
  },

  /* ── 4. Reformulation Wins ─────────────────────────────────────────── */
  reformulation: {
    launch: 'Build a reformulation plan',
    intro: 'Let’s build a <strong>Reformulation Plan</strong> together. I’ve opened a plan board on the right — it’s empty for now and we’ll fill it one step at a time. First, which product are we reformulating?',
    introStatus: 'Opening a plan board…',
    introRun: (s) => { s.open('plan', { title: 'Reformulation Plan', icon: 'auto_fix_high', sub: 'Guided by Whootie™' }); s.progress('plan', 0, 4); },
    start: 'n1',
    nodes: {
      n1: {
        choices: [
          { label: 'Reformulate the Mixed Berry Granola', icon: 'science', say: 'Reformulate the Mixed Berry Granola', next: 'product', primary: true },
        ],
      },
      product: {
        say: 'Good pick — the <strong>Organic Mixed Berry Granola</strong> currently scores <strong>54/100</strong> and reads Ultra-Processed. Let me scan for what’s tripping the markers.',
        status: 'Loading the product…',
        run: (s) => {
          s.section('plan', 1, 'Target product',
            `<div class="wf-product-name">Organic Mixed Berry Granola</div>` +
            `<div class="wf-product-meta">Sunrise Foods · SKU SF-8821</div>` +
            scoreBlock('Current WISE Score', '54', '/100', 54, 'linear-gradient(90deg,#E879F9,#FF7C7E)') +
            `<div style="margin-top:8px"><span class="wf-tag wf-tag--red" style="margin-left:0">Ultra-Processed</span></div>`);
          s.progress('plan', 1, 4);
        },
        choices: [{ label: 'Scan for flagged additives', icon: 'biotech', say: 'Scan for flagged additives', next: 'additives', primary: true }],
      },
      additives: {
        say: 'Three additives are tripping markers — one hard UPF flag and two refined/opaque ingredients. These are exactly what we’ll target.',
        status: 'Scanning ingredients…',
        run: (s) => {
          s.section('plan', 2, 'Flagged additives',
            rowLine('var(--sec-red,#D94C4C)', 'High-Fructose Corn Syrup', 'Additive', 'wf-tag--red') +
            rowLine('var(--ter-amber,#F5A524)', 'Soybean Oil', 'Refined Oil', 'wf-tag--amber') +
            rowLine('var(--sec-red,#D94C4C)', 'Natural Flavor (proprietary)', 'Opaque', 'wf-tag--red'));
          s.progress('plan', 2, 4);
        },
        choices: [{ label: 'Suggest clean-label swaps', icon: 'eco', say: 'Suggest clean-label swaps', next: 'swaps', primary: true }],
      },
      swaps: {
        say: 'Here are whole-food swaps that hold the flavor profile while clearing every marker.',
        status: 'Matching swaps…',
        run: (s) => {
          s.section('plan', 3, 'Clean-label swaps',
            swapLine('High-Fructose Corn Syrup', 'Date Paste') +
            swapLine('Soybean Oil', 'Cold-Pressed Sunflower Oil') +
            swapLine('Natural Flavor (proprietary)', 'Freeze-Dried Berry Powder'));
          s.progress('plan', 3, 4);
        },
        choices: [{ label: 'Project the new score', icon: 'trending_up', say: 'Project the new WISE Score', next: 'done', primary: true }],
      },
      done: {
        say: 'With those swaps, the granola jumps <strong>54 → 88</strong> and clears the NON-UPF standard — a <strong>+34 point</strong> gain. The plan board is complete.',
        status: 'Projecting the new score…',
        run: (s) => {
          s.section('plan', 4, 'Projected WISE Score',
            scoreBlock('Before', '54', '/100', 54, 'linear-gradient(90deg,#E879F9,#FF7C7E)') +
            `<div style="height:8px"></div>` +
            scoreBlock('After reformulation', '88', '/100', 88, 'linear-gradient(90deg,var(--sec-green,#16a34a),#22d3ee)') +
            `<span class="wf-badge"><span class="material-icons">eco</span>Clears NON-UPF · +34 pts</span>`);
          s.progress('plan', 4, 4);
          s.setSub('plan', 'Plan ready · 4 of 4 steps');
        },
        end: {
          title: 'Reformulation plan ready',
          sub: 'Whootie™ assembled a swap-by-swap plan that takes the granola to verifiable.',
          icon: 'auto_fix_high',
          recap: [
            'Targeted <strong>Mixed Berry Granola</strong> (54/100)',
            'Flagged <strong>3 additives</strong> tripping UPF markers',
            'Matched a clean-label swap for each',
            'Projected a <strong>+34 pt</strong> jump to 88/100',
          ],
          outcome: { metric: '54 → 88', label: 'Projected WISE Score — clears the NON-UPF standard.' },
          options: [
            { label: 'Start verification on the new recipe', icon: 'verified', primary: true, run: () => startFlow('expiring') },
            { label: 'Export the plan as a brief', icon: 'download', run: () => showToast('Reformulation plan exported') },
            { label: 'Save this as a view', icon: 'bookmark', run: () => showToast('Saved “Granola Reformulation” view') },
            { label: 'Back to the welcome screen', icon: 'home', run: () => resetToWelcome() },
          ],
        },
      },
    },
  },

  /* ── 5. Launch Readiness ───────────────────────────────────────────── */
  launch: {
    launch: 'Prep launch readiness',
    intro: 'Your <strong>Spring line</strong> is <strong>78% launch-ready</strong> — 14 of 18 checks pass, with <strong>4 items</strong> left. I’ve opened a launch checklist. Want me to walk the open items, or resolve all four at once?',
    introStatus: 'Loading the launch checklist…',
    introRun: (s) => {
      s.open('launch', { title: 'Launch Checklist', icon: 'rocket_launch', sub: 'Spring line · 18 checks' });
      s.section('launch', 1, 'Readiness',
        scoreBlock('Launch-ready', '78', '%', 78, 'linear-gradient(90deg,var(--ter-amber,#F5A524),#fbbf24)'));
      s.section('launch', 2, 'Open items',
        rowLine('var(--ter-amber,#F5A524)', 'NFP+ images missing (1 SKU)', 'Assets', 'wf-tag--amber') +
        rowLine('var(--sec-red,#D94C4C)', 'Claims copy unreviewed', 'Compliance', 'wf-tag--red') +
        rowLine('var(--ter-amber,#F5A524)', 'Allergen statement draft', 'Label', 'wf-tag--amber') +
        rowLine('var(--ter-amber,#F5A524)', 'Retailer onboarding form', 'Retail', 'wf-tag--amber'));
      s.progress('launch', 14, 18, '14 of 18 passing');
    },
    start: 'n1',
    nodes: {
      n1: {
        choices: [
          { label: 'Walk the 4 open items', icon: 'checklist', say: 'Walk me through the open items', next: 'walk', primary: true },
          { label: 'Resolve all 4 now', icon: 'done_all', say: 'Resolve all 4 items now', next: 'resolve' },
        ],
      },
      walk: {
        say: 'The blocker is <strong>Claims copy unreviewed</strong> — “NON-UPF” on-pack needs compliance sign-off before launch. The other three are quick: missing images, an allergen draft, and the retailer form. I can clear all of them.',
        status: 'Reviewing each item…',
        run: (s) => {
          s.section('launch', 3, 'Item detail · Claims copy',
            rowLine('var(--sec-red,#D94C4C)', 'Needs compliance sign-off', 'Blocker', 'wf-tag--red') +
            `<p class="wf-note">SHIELD agent can validate the claim against the verification record.</p>`);
        },
        choices: [{ label: 'Resolve all 4 items', icon: 'done_all', say: 'Resolve all 4 items', next: 'resolve', primary: true }],
      },
      resolve: {
        say: 'Working through them: pulled the missing NFP+ image from the registry, ran the claims copy past SHIELD (approved), generated the allergen statement, and pre-filled the retailer form. All four are clearing now.',
        status: 'Resolving open items…',
        run: (s) => {
          s.section('launch', '✓', 'Items resolved',
            rowLine('var(--sec-green,#16a34a)', 'NFP+ images added', 'Done', 'wf-tag--green') +
            rowLine('var(--sec-green,#16a34a)', 'Claims copy approved', 'Done', 'wf-tag--green') +
            rowLine('var(--sec-green,#16a34a)', 'Allergen statement set', 'Done', 'wf-tag--green') +
            rowLine('var(--sec-green,#16a34a)', 'Retailer form filed', 'Done', 'wf-tag--green'));
          s.progress('launch', 18, 18, '18 of 18 passing');
        },
        next: 'done',
      },
      done: {
        say: '🚀 The Spring line is <strong>100% launch-ready</strong> — all 18 checks pass. I can generate the launch packet whenever you’re ready.',
        status: 'Confirming readiness…',
        run: (s) => {
          s.section('launch', '✓', 'Launch readiness',
            scoreBlock('Launch-ready', '100', '%', 100, 'linear-gradient(90deg,var(--sec-green,#16a34a),#22d3ee)') +
            `<span class="wf-badge"><span class="material-icons">rocket_launch</span>Cleared for launch</span>`);
          s.setSub('launch', '100% ready · 18 of 18');
        },
        end: {
          title: 'Launch-ready',
          sub: 'Every checklist item is cleared and the Spring line is good to go.',
          icon: 'rocket_launch',
          recap: [
            'Closed all <strong>4 open items</strong>',
            'Got compliance sign-off on the NON-UPF claim',
            'Added missing NFP+ images and allergen statement',
            'Pre-filled the retailer onboarding form',
          ],
          outcome: { metric: '100% ready', label: 'All 18 launch checks pass for the Spring line.' },
          options: [
            { label: 'Generate the launch packet', icon: 'description', primary: true, run: () => showToast('Launch packet generated') },
            { label: 'Schedule the launch date', icon: 'event', run: () => showToast('Launch scheduled') },
            { label: 'Notify retail partners', icon: 'storefront', run: () => showToast('Retail partners notified') },
            { label: 'Back to the welcome screen', icon: 'home', run: () => resetToWelcome() },
          ],
        },
      },
    },
  },

  /* ── 6. Data & Trends ──────────────────────────────────────────────── */
  data: {
    launch: 'Explore my data & charts',
    intro: 'Let’s explore your catalog data. I’ve opened an insights board — pick a question and I’ll chart it inline, then we can keep building on it.',
    introStatus: 'Spinning up insights…',
    introRun: (s) => { s.open('insights', { title: 'Insights', icon: 'query_stats', sub: '14 products · live data' }); s.section('insights', 1, 'Pick a view', `<p class="wf-note">Whootie™ renders each answer as a chart below.</p>`); },
    start: 'n1',
    nodes: {
      n1: {
        choices: [
          { label: 'Score trend over 6 months', icon: 'show_chart', say: 'Show the score trend over 6 months', next: 'trend', primary: true },
          { label: 'Additive flags by category', icon: 'bar_chart', say: 'Additive flags by category', next: 'flagcat' },
          { label: 'Verification mix', icon: 'donut_large', say: 'Show my verification mix', next: 'mix' },
        ],
      },
      trend: {
        say: 'Your portfolio WISE Score has climbed steadily — <strong>+9 points</strong> over six months, with the biggest jump after the Q1 verifications.',
        status: 'Charting the trend…',
        run: (s) => {
          s.section('insights', 2, 'Portfolio score · 6 months',
            bars([
              { label: 'Jan', val: 73 }, { label: 'Feb', val: 75 }, { label: 'Mar', val: 78 },
              { label: 'Apr', val: 79 }, { label: 'May', val: 81 }, { label: 'Jun', val: 82, peak: true },
            ]));
        },
        choices: [
          { label: 'Additive flags by category', icon: 'bar_chart', say: 'Now show additive flags by category', next: 'flagcat', primary: true },
          { label: 'Wrap up the exploration', icon: 'summarize', say: 'Wrap up the exploration', next: 'done' },
        ],
      },
      flagcat: {
        say: '<strong>Snacks</strong> carries the most open flags by far — that single category is where your additive risk concentrates.',
        status: 'Grouping flags…',
        run: (s) => {
          s.section('insights', 3, 'Open flags by category',
            bars([
              { label: 'Snacks', val: 7, peak: true }, { label: 'Bkfst', val: 2 },
              { label: 'Bev', val: 1 }, { label: 'Pantry', val: 0, disp: '0' },
            ]));
        },
        choices: [
          { label: 'Verification mix', icon: 'donut_large', say: 'Show the verification mix', next: 'mix', primary: true },
          { label: 'Wrap up the exploration', icon: 'summarize', say: 'Wrap up the exploration', next: 'done' },
        ],
      },
      mix: {
        say: 'Of 14 products: <strong>11 verified</strong>, 1 pre-qualified, and 2 not yet eligible. You’re at <strong>79% verified coverage</strong>.',
        status: 'Calculating the mix…',
        run: (s) => {
          s.section('insights', 4, 'Verification mix',
            rowLine('var(--sec-green,#16a34a)', 'Verified', '11', 'wf-tag--green') +
            rowLine('var(--primary)', 'Pre-qualified', '1', 'wf-tag--blue') +
            rowLine('var(--ter-amber,#F5A524)', 'Not eligible', '2', 'wf-tag--amber') +
            scoreBlock('Verified coverage', '79', '%', 79, 'linear-gradient(90deg,var(--sec-green,#16a34a),#22d3ee)'));
        },
        choices: [{ label: 'Wrap up the exploration', icon: 'summarize', say: 'Wrap up the exploration', next: 'done', primary: true }],
      },
      done: {
        say: 'Here’s the takeaway: scores are trending up, but <strong>Snacks</strong> concentrates your additive risk and holds back verified coverage. Clear those flags and coverage climbs fast.',
        status: 'Summarising…',
        run: (s) => {
          s.section('insights', '✓', 'Key insight',
            `<p class="wf-note"><strong>+9 pts</strong> in 6 months · <strong>Snacks</strong> = 7 of 10 open flags · <strong>79%</strong> verified coverage.</p>` +
            `<span class="wf-badge"><span class="material-icons">lightbulb</span>Fix Snacks → biggest coverage gain</span>`);
          s.setSub('insights', 'Exploration complete');
        },
        end: {
          title: 'Exploration complete',
          sub: 'Whootie™ charted your trends and surfaced the highest-leverage insight.',
          icon: 'query_stats',
          recap: [
            'Charted the <strong>6-month score trend</strong> (+9 pts)',
            'Mapped <strong>open flags by category</strong>',
            'Broke down your <strong>verification mix</strong>',
            'Surfaced Snacks as the top opportunity',
          ],
          outcome: { metric: '79% → 93%', label: 'Verified coverage if the Snacks-category flags are cleared.' },
          options: [
            { label: 'Investigate the Snacks flags', icon: 'flag', primary: true, run: () => startFlow('flags') },
            { label: 'Export the insight report', icon: 'download', run: () => showToast('Insight report exported') },
            { label: 'Schedule a weekly digest', icon: 'schedule', run: () => showToast('Weekly digest scheduled') },
            { label: 'Back to the welcome screen', icon: 'home', run: () => resetToWelcome() },
          ],
        },
      },
    },
  },
};

/* ════════════════════════════════════════════════════════════════════════
   ENGINE
   ════════════════════════════════════════════════════════════════════════ */
let activeFlow = null;
const TYPING_MS = 620;

function startFlow(flowId) {
  const flow = FLOWS[flowId];
  if (!flow) return;
  activeFlow = flowId;
  hideWelcome();
  clearChips();
  messages.innerHTML = '';
  clearStage();
  addUser(flow.launch);
  const typing = showTyping(flow.introStatus);
  setTimeout(() => {
    typing.remove();
    addScout(flow.intro, false);
    try { flow.introRun && flow.introRun(S); } catch (_) {}
    renderNode(flow.start);
  }, TYPING_MS);
}

function renderNode(nodeId) {
  const flow = FLOWS[activeFlow];
  if (!flow) return;
  const node = flow.nodes[nodeId];
  if (!node) return;

  const finish = () => {
    if (node.run) { try { node.run(S); } catch (_) {} }
    if (node.choices) {
      flow.__choices = node.choices;
      addReplyChips(node.choices);
    } else if (node.next) {
      setTimeout(() => renderNode(node.next), 520);
    } else if (node.end) {
      setTimeout(() => showResult(node.end), 480);
    }
  };

  if (node.say) {
    const typing = showTyping(node.status);
    setTimeout(() => { typing.remove(); addScout(node.say, node.source); finish(); }, TYPING_MS);
  } else {
    /* Pure branch node (no Whootie line) — just offer the choices. */
    finish();
  }
}

function onChoice(index) {
  const flow = FLOWS[activeFlow];
  const choice = flow && flow.__choices && flow.__choices[index];
  if (!choice) return;
  clearChips();
  addUser(choice.say || choice.label);
  renderNode(choice.next);
}

function resetToWelcome() {
  activeFlow = null;
  clearChips();
  messages.innerHTML = '';
  clearStage();
  showWelcome();
  card.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
}

/* ── Wiring ───────────────────────────────────────────────────────────── */
document.getElementById('ws-scorecards').addEventListener('click', (e) => {
  const btn = e.target.closest('.ws-scorecard[data-flow]');
  if (btn) startFlow(btn.dataset.flow);
});

messages.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip[data-choice]');
  if (chip) onChoice(Number(chip.dataset.choice));
});

stage.addEventListener('click', (e) => {
  const close = e.target.closest('.flow-mod-close[data-close]');
  if (close) { document.getElementById('mod-' + close.dataset.close)?.remove(); return; }
  const opt = e.target.closest('.fr-opt[data-opt]');
  if (opt) {
    const result = document.getElementById('flow-result');
    const o = result && result.__options && result.__options[Number(opt.dataset.opt)];
    if (o && typeof o.run === 'function') o.run();
  }
});

/* A light keyword router so typing also starts the matching flow. */
const KEYWORDS = [
  [/reformul|swap|recipe/i, 'reformulation'],
  [/renew|expir|verif/i, 'expiring'],
  [/flag|additive/i, 'flags'],
  [/launch|ready|checklist/i, 'launch'],
  [/data|chart|trend|insight/i, 'data'],
  [/portfolio|score|health/i, 'portfolio'],
];
function routeMessage(text) {
  const hit = KEYWORDS.find(([re]) => re.test(text));
  if (hit) { startFlow(hit[1]); return; }
  hideWelcome();
  addUser(text);
  const typing = showTyping('Whootie™ is thinking');
  setTimeout(() => {
    typing.remove();
    addScout('Pick one of the cards on the welcome screen, or try a keyword like <strong>“reformulation”</strong>, <strong>“renew”</strong>, <strong>“flags”</strong>, <strong>“launch”</strong>, or <strong>“trends”</strong> — each opens a full guided flow.', false);
  }, TYPING_MS);
}
const input = document.getElementById('chat-input');
function submitInput() {
  const v = input.value.trim();
  if (!v) return;
  input.value = '';
  routeMessage(v);
}
document.getElementById('chat-send').addEventListener('click', submitInput);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitInput(); });

document.getElementById('restart-btn').addEventListener('click', resetToWelcome);
document.getElementById('reset-chat').addEventListener('click', resetToWelcome);

/* Deep-link support: ?flow=reformulation auto-starts that card's tree. */
const params = new URLSearchParams(location.search);
const initial = params.get('flow');
if (initial && FLOWS[initial]) startFlow(initial);
