/**
 * Scout Chat Module — the ONE shared chat surface for WISE.
 *
 * A framework-free, mountable extraction of the chat module in
 * pages/ai-chat.html so the exact same component (WISE-owl welcome screen,
 * intent chips, plain message lines, floating-label input rail) can be
 * dropped into any page instead of bespoke one-off chats.
 *
 *   import { mountScoutChat } from './scout-chat.js';
 *   mountScoutChat(document.getElementById('host'), { ... });
 *
 * Requires the design tokens from agent-page.css and the styles in
 * scout-chat.css to be loaded on the host page.
 */

import { decorateScout } from './scout-tooltip.js';

/* WISE-owl "bug" used in the topbar (inherits currentColor). */
const OWL_BUG = `<svg viewBox="0 0 193 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M10.9834 35.6522C10.9834 35.6522 3.30615 47.7494 3.30615 58.0481C3.30615 81.1921 20.324 99.6409 43.3405 99.9915C51.5363 100.052 60.4175 99.9915 67.533 92.6894C41.5052 92.6894 25.589 73.777 25.589 58.0481C25.589 58.0481 25.2144 45.6894 30.832 35.9526L10.9834 35.6522Z"/><path d="M83.8241 14.7368C90.9396 14.7368 94.8008 22.7337 96.3699 29.2111H96.5571C98.1262 22.7337 101.987 14.7368 109.103 14.7368H170.521C175.169 14.7368 175.169 12.8643 175.169 7.32269C175.169 2.80876 178.108 0 182.131 0H189.384V14.7368C189.384 27.7131 182.131 28.5339 174.794 28.5339L160.347 28.583H118.091C113.597 28.583 113.335 29.2111 111.537 33.7051C110.051 37.4206 96.5571 73.0277 96.5571 73.0277H96.3699C96.3699 73.0277 82.8761 37.4206 81.3899 33.7051C79.5923 29.2111 79.3301 28.583 74.8361 28.583H32.5803L18.133 28.5339C10.7965 28.5339 3.54341 27.7131 3.54341 14.7368V0H10.7965C14.5415 0 17.7585 3.37051 17.7585 7.32269C17.7585 12.8643 17.7585 14.7368 22.406 14.7368H83.8241Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M71.8001 35.9523C74.4284 35.9523 74.6161 37.2826 75.1793 38.6953L87.9434 71.5913C82.9358 80.6013 74.4289 85.7609 63.9558 85.7609C48.1132 85.7608 33.2662 72.7999 33.2663 54.6695C33.2664 48.2288 34.5088 40.1469 39.2583 35.9523H71.8001ZM63.486 44.5345C58.3905 44.5345 54.2598 48.6005 54.2598 54.0781C54.2598 59.5557 58.3905 63.6217 63.486 63.6217C68.5814 63.6216 72.7122 59.5556 72.7122 54.0781C72.7122 48.6005 68.5814 44.5346 63.486 44.5345Z"/><path d="M181.756 35.6522C181.756 35.6522 189.433 47.7494 189.433 58.0481C189.433 81.1921 172.416 99.6409 149.399 99.9915C141.203 100.052 132.322 99.9915 125.206 92.6894C151.234 92.6894 167.151 73.777 167.151 58.0481C167.151 58.0481 167.525 45.6894 161.908 35.9526L181.756 35.6522Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M120.94 35.9523C118.311 35.9523 118.124 37.2826 117.56 38.6953L104.796 71.5913C109.804 80.6013 118.311 85.7609 128.784 85.7609C144.626 85.7608 159.473 72.7999 159.473 54.6695C159.473 48.2288 158.231 40.1469 153.481 35.9523H120.94ZM129.254 44.5345C134.349 44.5345 138.48 48.6005 138.48 54.0781C138.48 59.5557 134.349 63.6217 129.254 63.6217C124.158 63.6216 120.027 59.5556 120.027 54.0781C120.027 48.6005 124.158 44.5346 129.254 44.5345Z"/></svg>`;

/* WISE-owl mark used inside the welcome circle (white on primary). */
const OWL_MARK = `<svg viewBox="0 0 193 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.9834 35.6522C10.9834 35.6522 3.30615 47.7494 3.30615 58.0481C3.30615 81.1921 20.324 99.6409 43.3405 99.9915C51.5363 100.052 60.4175 99.9915 67.533 92.6894C41.5052 92.6894 25.589 73.777 25.589 58.0481C25.589 58.0481 25.2144 45.6894 30.832 35.9526L10.9834 35.6522Z" fill="white"/><path d="M83.8241 14.7368C90.9396 14.7368 94.8008 22.7337 96.3699 29.2111H96.5571C98.1262 22.7337 101.987 14.7368 109.103 14.7368H170.521C175.169 14.7368 175.169 12.8643 175.169 7.32269C175.169 2.80876 178.108 0 182.131 0H189.384V14.7368C189.384 27.7131 182.131 28.5339 174.794 28.5339L160.347 28.583H118.091C113.597 28.583 113.335 29.2111 111.537 33.7051C110.051 37.4206 96.5571 73.0277 96.5571 73.0277H96.3699C96.3699 73.0277 82.8761 37.4206 81.3899 33.7051C79.5923 29.2111 79.3301 28.583 74.8361 28.583H32.5803L18.133 28.5339C10.7965 28.5339 3.54341 27.7131 3.54341 14.7368V0H10.7965C14.5415 0 17.7585 3.37051 17.7585 7.32269C17.7585 12.8643 17.7585 14.7368 22.406 14.7368H83.8241Z" fill="white"/><path fill-rule="evenodd" clip-rule="evenodd" d="M71.8001 35.9523C74.4284 35.9523 74.6161 37.2826 75.1793 38.6953L87.9434 71.5913C82.9358 80.6013 74.4289 85.7609 63.9558 85.7609C48.1132 85.7608 33.2662 72.7999 33.2663 54.6695C33.2664 48.2288 34.5088 40.1469 39.2583 35.9523H71.8001ZM63.486 44.5345C58.3905 44.5345 54.2598 48.6005 54.2598 54.0781C54.2598 59.5557 58.3905 63.6217 63.486 63.6217C68.5814 63.6216 72.7122 59.5556 72.7122 54.0781C72.7122 48.6005 68.5814 44.5346 63.486 44.5345Z" fill="white"/><path d="M181.756 35.6522C181.756 35.6522 189.433 47.7494 189.433 58.0481C189.433 81.1921 172.416 99.6409 149.399 99.9915C141.203 100.052 132.322 99.9915 125.206 92.6894C151.234 92.6894 167.151 73.777 167.151 58.0481C167.151 58.0481 167.525 45.6894 161.908 35.9526L181.756 35.6522Z" fill="white"/><path fill-rule="evenodd" clip-rule="evenodd" d="M120.94 35.9523C118.311 35.9523 118.124 37.2826 117.56 38.6953L104.796 71.5913C109.804 80.6013 118.311 85.7609 128.784 85.7609C144.626 85.7608 159.473 72.7999 159.473 54.6695C159.473 48.2288 158.231 40.1469 153.481 35.9523H120.94ZM129.254 44.5345C134.349 44.5345 138.48 48.6005 138.48 54.0781C138.48 59.5557 134.349 63.6217 129.254 63.6217C124.158 63.6216 120.027 59.5556 120.027 54.0781C120.027 48.6005 124.158 44.5346 129.254 44.5345Z" fill="white"/></svg>`;

const DEFAULT_INTENTS = [
  { intent: 'customer_profile', label: 'Start New Verification', icon: 'add_circle' },
  { intent: 'resume_prompt', label: 'Continue Existing', icon: 'play_circle' },
  { intent: 'faq_intro', label: 'Ask a Question', icon: 'help_outline' },
  { intent: 'choose_agents', label: 'Choose Agents', icon: 'smart_toy' },
  { intent: 'registry_home', label: 'WISE Foods', icon: 'restaurant_menu' },
  { intent: 'add_food_intro', label: 'Add a New Food', icon: 'add_circle_outline' },
  { intent: 'edit_food_select', label: 'Edit an Existing Food', icon: 'edit_note' },
];

/* Intent-keyed openers so a clicked chip ALWAYS continues the conversation with
   an accurate, on-feature reply — instead of falling through to keyword regex on
   the label (which left "Continue Existing" / "Ask a Question" with a generic
   fallback). Keyed by the chip's `intent` id; callers can supply their own map
   via opts.intentReplies for a different surface (e.g. the Portfolio). */
const DEFAULT_INTENT_REPLIES = {
  customer_profile: 'Let’s start a new verification. I’ll set up the customer profile, then walk you through <strong>Confirm → Attest → Activate</strong> on your eligible UPCs. Who are we verifying first?',
  resume_prompt: 'Picking up where you left off — you have verifications in progress. Want me to reopen your most recent draft, or list them all so you can choose which to continue?',
  faq_intro: 'Ask me anything about verification, UPF scoring, the WISE Foods registry, or the Verified Shield Badge. What would you like to know?',
  registry_home: 'Opening the WISE Foods registry. I can search UPCs, pull nutritional metadata, and cross-reference products. Which food should I look up?',
  add_food_intro: 'Let’s add a new food. Paste a label, spec sheet, or product URL and I’ll parse it into NFP+ toward the <strong>Brand Verified</strong> standard.',
  edit_food_select: 'Which product would you like to edit? I’ll open it so you can update NFP+, ingredients, images, and visibility.',
};

/* Default agent roster shown in the in-chat "Agent Settings" panel — mirrors
   the roster in pages/ai-chat.html so the shared Scout surface exposes the
   same agents everywhere it's mounted. Callers can override via opts.agents.
   `group` buckets a row under "Core" or "Specialist"; `required` agents
   (Scout) can't be switched off. */
const DEFAULT_AGENTS = [
  {
    id: 'wise', name: 'Scout™', version: 'v3.2', group: 'core',
    icon: 'verified', color: 'var(--primary)', bg: '',
    tagline: 'Verification Orchestrator',
    desc: 'The core Scout™ agent that orchestrates your entire verification workflow — from customer profiling through UPC analysis, attestation, and badge issuance. Cannot be disabled.',
    tags: ['Verification', 'Routing', 'Payments', 'Onboarding'],
    required: true, on: true,
  },
  {
    id: 'nova', name: 'TIER', version: 'v2.1', group: 'core',
    icon: 'auto_awesome', color: '#6D947C', bg: '#1B2D22',
    tagline: 'UPF Classification Engine',
    desc: 'Scores every ingredient and product against UPF, WFPB, and clean-label frameworks. Identifies ultra-processed markers, additives, and clean-label alternatives in real time.',
    tags: ['UPF Scoring', 'Ingredients', 'Processing Tier', 'Clean Label'],
    on: false,
  },
  {
    id: 'scout', name: 'WISE Foods', version: 'v1.8', group: 'core',
    icon: 'search', color: '#FFC434', bg: '#4D1007',
    tagline: 'WISE Foods Agent',
    desc: 'Queries the WISE Foods registry to match UPCs, look up nutritional metadata, cross-reference product databases, and handle bulk import validation.',
    tags: ['UPC Lookup', 'Registry', 'Bulk Import', 'Matching'],
    on: false,
  },
  {
    id: 'shield', name: 'SHIELD', version: 'v1.5', group: 'specialist',
    icon: 'shield', color: 'var(--primary)', bg: '',
    tagline: 'Badge & Compliance Agent',
    desc: 'Manages WISE Verified Shield Badge issuance, validates compliance criteria against certification standards, handles audit workflows, and tracks re-certification timelines.',
    tags: ['Badge Issuance', 'Compliance', 'Audits', 'Certification'],
    on: false,
  },
  {
    id: 'lens', name: 'LENS', version: 'v2.0', group: 'specialist',
    icon: 'analytics', color: '#687896', bg: '#1A2339',
    tagline: 'Analytics & Insights Agent',
    desc: 'Deep-dives into verification trends, brand-level UPC analytics, ingredient risk scoring, and generates scheduled insight reports for brands and retail partners.',
    tags: ['Trend Reports', 'UPC Analytics', 'Risk Scoring', 'Dashboards'],
    on: false,
  },
  {
    id: 'vault', name: 'VAULT', version: 'v1.2', group: 'specialist',
    icon: 'lock', color: '#D7BE91', bg: '#1B2D22',
    tagline: 'Documents & Attestation Agent',
    desc: 'Handles product attestation documents, manages secure e-signing workflows, maintains immutable audit trails, and archives verification certificates.',
    tags: ['Attestation', 'E-Signing', 'Audit Trail', 'Archives'],
    on: false,
  },
  {
    id: 'pulse', name: 'PULSE', version: 'v1.4', group: 'specialist',
    icon: 'biotech', color: '#8B9FAF', bg: '#1A2339',
    tagline: 'Deep UPF Analysis Panel',
    desc: 'Activates a dedicated analysis panel with real-time ingredient scoring, processing-tier visualization, additive risk flags, and clean-label alternatives — all in sync with your conversation.',
    tags: ['Ingredient Scoring', 'Processing Tier', 'Additive Flags', 'Live Panel'],
    on: false,
  },
];

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* Short, locale-aware clock label (e.g. "9:42 AM") for message timestamps —
   a small accountability cue so every line is attributable to a moment. */
function nowLabel() {
  try {
    return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch (_) {
    return '';
  }
}

/* Standing reminder under the input that Scout is an assistant, not the
   source of record — the single most important piece of AI trust microcopy. */
const DEFAULT_DISCLAIMER = '';

function defaultReply(text, intent) {
  /* An intent-id match always wins so a clicked chip continues its own flow. */
  if (intent && DEFAULT_INTENT_REPLIES[intent]) return DEFAULT_INTENT_REPLIES[intent];
  const q = String(text).toLowerCase();
  if (/(verif|shield|non-upf|clean label|attest)/.test(q))
    return 'I can run the verification flow — <strong>Confirm → Attest → Activate</strong>. Want me to start with your eligible UPCs?';
  if (/(food|registry|upc|product|search)/.test(q))
    return 'Searching the WISE Foods registry now. I’ll match UPCs and pull nutritional metadata for you.';
  if (/(add|new food|ingest|upload|parse)/.test(q))
    return 'Let’s add it. Paste a label, spec sheet, or URL and I’ll parse it toward the Brand Verified standard.';
  if (/(edit|update|change)/.test(q))
    return 'Pick the product and I’ll open it for editing — NFP+, ingredients, images, and visibility.';
  if (/(agent|choose)/.test(q))
    return 'You can enable specialist agents — TIER, SHIELD, LENS, VAULT, PULSE — and I’ll orchestrate them automatically.';
  return 'On it. The full conversational flow lives in the reference app; this surface mirrors the real Scout™ layout and controls.';
}

/* Build the in-chat "Agent Settings" overlay from an agent roster. Mirrors the
   #settings-screen markup in pages/ai-chat.html, scoped to the Scout card so
   the same panel is available wherever the shared chat is mounted. */
function buildAgentsPanelHtml(agents, id) {
  const row = (a) => `
    <div class="ss-agent-row${a.on ? ' ssr-on' : ''}${a.required ? ' ssr-required' : ''}" id="${id}-ssr-${esc(a.id)}">
      <div class="ss-agent-icon" style="${a.bg ? `background:${esc(a.bg)};` : ''}">
        <span class="material-icons" style="color:${esc(a.color || 'var(--primary)')}">${esc(a.icon || 'smart_toy')}</span>
      </div>
      <div class="ss-agent-body">
        <div class="ss-agent-name${a.on ? '' : ' ssa-off'}" id="${id}-ssn-${esc(a.id)}">
          ${esc(a.name)}${a.version ? `<span class="ss-version-badge">${esc(a.version)}</span>` : ''}
        </div>
        <p class="ss-agent-tagline">${esc(a.tagline || '')}</p>
        <p class="ss-agent-desc">${esc(a.desc || '')}</p>
        <div class="ss-tag-row">${(a.tags || []).map((t) => `<span class="ss-capability-tag">${esc(t)}</span>`).join('')}</div>
      </div>
      <label class="agent-toggle-wrap" title="${a.required ? esc(a.name) + ' is required' : 'Toggle ' + esc(a.name)}">
        <input type="checkbox" data-sc-agent="${esc(a.id)}"${a.on ? ' checked' : ''}${a.required ? ' disabled' : ''}>
        <span class="agent-toggle-track"${a.required ? ' style="cursor:not-allowed;opacity:0.7;"' : ''}></span>
      </label>
    </div>`;

  const core = agents.filter((a) => a.group !== 'specialist');
  const specialist = agents.filter((a) => a.group === 'specialist');

  return `
    <div class="ss-header">
      <button type="button" class="ss-back-btn" data-sc="agents-close" title="Back to chat" aria-label="Back to chat"><span class="material-icons">arrow_back</span></button>
      <div class="ss-header-icon"><span class="material-icons">tune</span></div>
      <div class="ss-header-titles">
        <h2 class="ss-header-title">Agent Settings</h2>
        <p class="ss-header-subtitle"><span id="${id}-ss-active">0</span> of ${agents.length} active · Manage AI agents</p>
      </div>
    </div>
    <div class="ss-body">
      <div class="ss-info-card">
        <div class="ss-info-icon"><span class="material-icons">info</span></div>
        <div>
          <p class="ss-info-title">How agents work together</p>
          <p class="ss-info-desc">Scout™ orchestrates all active agents automatically. Enable agents based on the tasks you perform most — more agents = richer context, more capabilities. Scout™ is always required.</p>
        </div>
      </div>
      <p class="ss-section-title">Core Agents</p>
      ${core.map(row).join('')}
      ${specialist.length ? `<div class="ss-divider"></div><p class="ss-section-title">Specialist Agents</p>${specialist.map(row).join('')}` : ''}
    </div>`;
}

/* Build the welcome "at a glance" score-card rail from a scorecards config.
 * Opt-in: callers pass { label, cards: [...] } and the same rail used on
 * ai-chat.html renders inside the shared dock. Each card descriptor:
 *   { variant: 'metric'|'intro'|'scout', icon, iconTone, pill:{tone,icon,text},
 *     metric, metricUnit, title, desc, action, intent, ask }
 * Cards drive a chat turn on click (handled in mountScoutChat) via {intent, ask}.
 */
function buildScorecardsHtml(sc, id) {
  if (!sc || !Array.isArray(sc.cards) || !sc.cards.length) return '';
  const label = sc.label || 'Your portfolio at a glance';
  const cardHtml = (c, i) => {
    const isIntro = c.variant === 'intro' || c.variant === 'scout';
    const variantClass = c.variant === 'scout'
      ? ' ws-scorecard--intro ws-scorecard--scout'
      : c.variant === 'intro' ? ' ws-scorecard--intro' : '';
    const iconTone = c.iconTone ? `ws-sc-icon--${esc(c.iconTone)}` : 'ws-sc-icon--brand';
    const pill = c.pill
      ? `<span class="ws-sc-pill ws-sc-pill--${esc(c.pill.tone || 'up')}">${c.pill.icon ? `<span class="material-icons">${esc(c.pill.icon)}</span>` : ''}${esc(c.pill.text || '')}</span>`
      : '';
    const lead = isIntro
      ? `<div class="ws-sc-intro-title">${esc(c.title || '')}</div>`
      : `${c.metric != null ? `<div class="ws-sc-metric">${esc(c.metric)}${c.metricUnit ? `<span class="ws-sc-metric-unit">${esc(c.metricUnit)}</span>` : ''}</div>` : ''}<div class="ws-sc-title">${esc(c.title || '')}</div>`;
    const action = c.action
      ? `<div class="ws-sc-action">${esc(c.action)}<span class="material-icons">arrow_outward</span></div>`
      : '';
    return `
      <button type="button" class="ws-scorecard${variantClass}" role="listitem" data-card="${i}">
        <div class="ws-sc-top">
          <span class="ws-sc-icon ${iconTone}"><span class="material-icons">${esc(c.icon || 'insights')}</span></span>
          ${pill}
        </div>
        ${lead}
        <div class="ws-sc-desc">${esc(c.desc || '')}</div>
        ${action}
      </button>`;
  };
  return `
    <div class="ws-scorecards-section">
      <div class="ws-scorecards-bar"><span class="ws-scorecards-label">${esc(label)}</span></div>
      <div class="ws-scorecards-wrap">
        <div class="ws-scorecards" id="${id}-scorecards" role="list" aria-label="${esc(label)}">${sc.cards.map(cardHtml).join('')}</div>
        <button type="button" class="ws-sc-scroll ws-sc-scroll--prev" data-sc-scroll="-1" aria-label="Scroll to previous cards" hidden><span class="material-icons">chevron_left</span></button>
        <button type="button" class="ws-sc-scroll ws-sc-scroll--next" data-sc-scroll="1" aria-label="Scroll to see more cards"><span class="material-icons">chevron_right</span></button>
      </div>
    </div>`;
}

let _seq = 0;

/**
 * Mount the shared Scout chat into `rootEl`.
 * @param {HTMLElement} rootEl
 * @param {object} [opts]
 *   title        {string}  topbar title (default 'Scout')
 *   agentCount   {number}  "N agents running" pill (default: # of on agents)
 *   agents       {Array}   agent roster for the in-chat settings panel
 *                          [{id,name,version,group,icon,color,bg,tagline,desc,tags,required,on}]
 *   heading      {string}  welcome heading (default 'What can Scout help with?')
 *   sub          {string}  welcome subheading
 *   intents      {Array}   welcome intent chips [{intent,label,icon}]
 *   intentReplies{object}  intent-id → reply (string|fn) so a clicked chip
 *                          always continues with an on-feature answer
 *   placeholder  {string}  input placeholder
 *   flLabel      {string}  floating label text
 *   disclaimer   {string}  standing AI-limitations note under the input ('' hides)
 *   sourceLabel  {string}  grounding caption appended to each Scout reply ('' hides)
 *   statusLabel  {string}  what Scout is "doing" while the typing dots show
 *   onIntent     {fn}      (intent,label) => boolean — return true to suppress default reply
 *   onAddMember  {fn}      () => void — "Add team member to chat" popover item
 *   onHistory    {fn}      () => void — "History & Projects" popover item
 *   onToggleWidth{fn}      (isWide) => void — fired when the width toggle flips
 *   reply        {fn}      (text,intent) => html string for Scout's response
 * @returns {{ addUser, addScout, reset, root }}
 */
export function mountScoutChat(rootEl, opts = {}) {
  if (!rootEl) return null;
  const id = `sc${++_seq}`;
  const title = opts.title || 'Scout™';
  /* Agent roster powering the in-chat settings panel + the "N agents running"
     pill. Clone so a caller's array isn't mutated as toggles flip. */
  const agents = (Array.isArray(opts.agents) ? opts.agents : DEFAULT_AGENTS).map((a) => ({ ...a }));
  const onCount = () => agents.filter((a) => a.on).length;
  const agentCount = opts.agentCount != null ? opts.agentCount : onCount();
  const heading = opts.heading || 'What can Scout™ help with?';
  const sub = opts.sub || 'Your AI Verification assistant — NON-UPF & beyond';
  const intents = opts.intents || DEFAULT_INTENTS;
  const placeholder = opts.placeholder || 'Type a message';
  /* The "You" avatar mirrors the top-bar profile chip (Maya Chen → "MC"). When
     the topbar avatar becomes an image, pass opts.userAvatar with an <img>. */
  const userInitials = opts.userInitials || 'MC';
  const userAvatar = opts.userAvatar || esc(userInitials);
  /* Optional per-intent reply map for this surface; an intent-id hit here means
     a clicked chip always continues with an on-feature answer. */
  const intentReplies = opts.intentReplies && typeof opts.intentReplies === 'object' ? opts.intentReplies : null;
  const baseReply = typeof opts.reply === 'function' ? opts.reply : defaultReply;
  const reply = (text, intent) => {
    if (intent && intentReplies && intentReplies[intent] != null) {
      const r = intentReplies[intent];
      return typeof r === 'function' ? r(text, intent) : r;
    }
    return baseReply(text, intent);
  };
  /* Microcopy (use `!== undefined` so a caller can pass '' to hide). The
     data-handling reassurances now live in the input placeholder, so the
     welcome no longer renders a separate trust-badge row. */
  const disclaimer = opts.disclaimer !== undefined ? opts.disclaimer : DEFAULT_DISCLAIMER;
  const sourceLabel = opts.sourceLabel !== undefined ? opts.sourceLabel : 'Grounded in WISE data';
  const statusLabel = opts.statusLabel || `${title} is thinking`;

  /* Optional "at a glance" score-card rail for this surface (opt-in). */
  const scorecards = opts.scorecards && Array.isArray(opts.scorecards.cards) && opts.scorecards.cards.length
    ? opts.scorecards
    : null;
  const scorecardsHtml = scorecards ? buildScorecardsHtml(scorecards, id) : '';

  /* 'carousel' (default) = horizontal scroll row with scroll buttons + edge
     fades; 'wrap' = plain wrapped flex grid, no controls, no overflow. */
  const chipsFlow = opts.chipsFlow === 'wrap' ? 'wrap' : 'carousel';

  const chipsHtml = intents.map((c, i) =>
    `<button type="button" class="chip ws-intent-chip" data-intent="${i}"><span class="material-icons">${esc(c.icon || 'bolt')}</span>${esc(c.label)}</button>`
  ).join('');

  const chipsContainerHtml = chipsFlow === 'wrap'
    ? `<div class="ws-chips" id="${id}-chips" role="list" aria-label="Quick actions">${chipsHtml}</div>`
    : `<div class="ws-chips-wrap">
        <div class="ws-chips" id="${id}-chips" role="list" aria-label="Quick actions">${chipsHtml}</div>
        <button type="button" class="ws-sc-scroll ws-sc-scroll--prev" data-chip-scroll="-1" aria-label="Scroll to previous actions" hidden><span class="material-icons">chevron_left</span></button>
        <button type="button" class="ws-sc-scroll ws-sc-scroll--next" data-chip-scroll="1" aria-label="Scroll to see more actions"><span class="material-icons">chevron_right</span></button>
      </div>`;

  rootEl.classList.add('sc-card');
  rootEl.innerHTML = `
    <div class="chat-topbar">
      <div class="sc-topbar-lead">
        <div class="sc-bug">${OWL_BUG}</div>
        <div class="sc-topbar-titles">
          <span class="topbar-title" data-scout-tip tabindex="0">${esc(title)}</span>
          <button type="button" class="topbar-agents-btn" data-sc="agents" title="Choose agents">
            <span class="material-icons">smart_toy</span>
            <span class="agents-count-pill" id="${id}-count">${esc(agentCount)}</span>
            <span>agents running</span>
          </button>
        </div>
      </div>
      <div class="sc-topbar-controls">
        <div class="panel-more-wrap">
        <button type="button" class="panel-more-btn" id="${id}-more" aria-haspopup="menu" aria-expanded="false" aria-controls="${id}-more-pop" title="More options"><span class="material-icons">more_vert</span></button>
        <div class="topbar-popover hidden" id="${id}-more-pop" role="menu">
          <button type="button" class="topbar-menu-item" data-sc="add-member"><span class="material-icons topbar-menu-icon">person_add</span><span>Add team member to chat</span></button>
          <div class="topbar-menu-divider"></div>
          <button type="button" class="topbar-menu-item" data-sc="history"><span class="material-icons topbar-menu-icon">history</span><span>History &amp; Projects</span></button>
          <div class="topbar-menu-divider"></div>
          <button type="button" class="topbar-menu-item" data-sc="new"><span class="material-icons topbar-menu-icon">add_circle_outline</span><span>Start new conversation</span></button>
          <button type="button" class="topbar-menu-item" data-sc="export"><span class="material-icons topbar-menu-icon">download</span><span>Export conversation</span></button>
          <button type="button" class="topbar-menu-item" data-sc="share"><span class="material-icons topbar-menu-icon">share</span><span>Share</span></button>
          <div class="topbar-menu-divider"></div>
          <button type="button" class="topbar-menu-item topbar-menu-item--danger" data-sc="close"><span class="material-icons topbar-menu-icon">close</span><span>Close conversation</span></button>
        </div>
        </div>
        <button type="button" class="panel-width-toggle-btn" id="${id}-width" aria-pressed="false" title="Width (single) — tap to widen" aria-label="Scout™ module width"><span class="material-symbols-outlined">width_normal</span></button>
      </div>
    </div>

    <div class="sc-body">
      <div class="chat-messages-area" id="${id}-messages" aria-live="polite" aria-atomic="false"></div>
      <div class="sc-welcome${scorecardsHtml ? ' sc-welcome--cards' : ''}" id="${id}-welcome">
        <div class="ws-logo-wrap">
          <span class="ws-pulse-ring" aria-hidden="true"></span>
          <span class="ws-pulse-ring" aria-hidden="true"></span>
          <span class="ws-pulse-ring" aria-hidden="true"></span>
          <div class="ws-logo">${OWL_MARK}</div>
        </div>
        <h1 class="ws-heading">${esc(heading)}</h1>
        <p class="ws-sub">${esc(sub)}</p>
        ${scorecardsHtml}
        ${chipsContainerHtml}
      </div>
      <div class="sc-settings sc-hidden" id="${id}-settings">${buildAgentsPanelHtml(agents, id)}</div>
    </div>

    <div class="chat-input-rail">
      <div class="sc-input-row">
        <div class="fl-input-wrap">
          <input type="text" class="fl-input" id="${id}-input" placeholder="${esc(placeholder)}" autocomplete="off" />
          <div class="fl-more-wrap">
            <button type="button" class="fl-icon-btn fl-more-btn" id="${id}-fl-more" title="More options"><span class="material-icons">more_horiz</span></button>
            <div class="fl-more-popover" id="${id}-fl-pop" role="menu">
              <button type="button" class="fl-more-item" data-sc="attach"><span class="material-icons">attach_file</span><span>Attach</span></button>
              <button type="button" class="fl-more-item" data-sc="camera"><span class="material-icons">photo_camera</span><span>Camera</span></button>
              <button type="button" class="fl-more-item" data-sc="voice"><span class="material-icons">mic</span><span>Voice</span></button>
            </div>
          </div>
        </div>
        <button type="button" class="sc-send" id="${id}-send" title="Send"><span class="material-icons">send</span></button>
      </div>
      ${disclaimer ? `<p class="sc-disclaimer"><span class="material-icons">shield</span>${esc(disclaimer)}</p>` : ''}
    </div>`;

  const messages = rootEl.querySelector(`#${id}-messages`);
  const welcome = rootEl.querySelector(`#${id}-welcome`);
  const input = rootEl.querySelector(`#${id}-input`);
  const settings = rootEl.querySelector(`#${id}-settings`);
  const countPill = rootEl.querySelector(`#${id}-count`);
  const activeLabel = rootEl.querySelector(`#${id}-ss-active`);

  const scrollDown = () => { if (messages) messages.scrollTop = messages.scrollHeight; };

  /* Reflect the live agent roster into the topbar pill + panel header. */
  function updateAgentCount() {
    const n = onCount();
    if (countPill) countPill.textContent = String(n);
    if (activeLabel) activeLabel.textContent = String(n);
  }
  updateAgentCount();

  /* The in-chat "Agent Settings" panel slides over the messages, just like the
     welcome screen. Opening it hides the welcome so they never stack. */
  function openAgents() {
    settings?.classList.remove('sc-hidden');
    if (typeof opts.onAgentsOpen === 'function') opts.onAgentsOpen();
  }
  function closeAgents() { settings?.classList.add('sc-hidden'); }
  function toggleAgent(agentId, on) {
    const a = agents.find((x) => x.id === agentId);
    if (!a || a.required) return;
    a.on = on;
    rootEl.querySelector(`#${id}-ssr-${agentId}`)?.classList.toggle('ssr-on', on);
    rootEl.querySelector(`#${id}-ssn-${agentId}`)?.classList.toggle('ssa-off', !on);
    updateAgentCount();
    if (typeof opts.onAgentToggle === 'function') opts.onAgentToggle(agentId, on, onCount());
  }

  function addUser(text) {
    if (!messages) return;
    messages.insertAdjacentHTML('beforeend',
      `<div class="sc-line sc-line-you"><span class="sc-avatar sc-avatar-you" role="img" aria-label="You">${userAvatar}</span><div class="sc-line-body">${esc(text)}<div class="sc-line-meta"><span class="sc-line-time">${esc(nowLabel())}</span></div></div></div>`);
    scrollDown();
  }
  /* @param {string} html  Scout's reply markup.
     @param {object} [meta] { source } — overrides the default grounding caption
     for a single line (pass '' to drop it, e.g. a plain acknowledgement). */
  function addScout(html, meta = {}) {
    if (!messages) return;
    const src = meta.source !== undefined ? meta.source : sourceLabel;
    const footer = `<div class="sc-line-meta">${
      src ? `<span class="sc-trust-chip" title="Scout™ cites where its answer comes from"><span class="material-icons">verified_user</span>${esc(src)}</span>` : ''
    }<span class="sc-line-time">${esc(nowLabel())}</span></div>`;
    messages.insertAdjacentHTML('beforeend',
      `<div class="sc-line sc-line-scout"><span class="sc-avatar sc-avatar-scout" role="img" aria-label="${esc(title)}">${OWL_BUG}</span><div class="sc-line-body">${html}${footer}</div></div>`);
    scrollDown();
  }
  function showTyping() {
    if (!messages) return null;
    const el = document.createElement('div');
    el.className = 'sc-line sc-line-scout sc-line-typing';
    el.innerHTML = `<span class="sc-avatar sc-avatar-scout" role="img" aria-label="${esc(title)}">${OWL_BUG}</span><div class="sc-line-body"><span class="sc-typing-status"><span class="sc-typing" aria-hidden="true"><span></span><span></span><span></span></span><span class="sc-typing-label">${esc(statusLabel)}…</span></span></div>`;
    messages.appendChild(el);
    scrollDown();
    return el;
  }
  function scoutRespond(text, intent) {
    const typing = showTyping();
    setTimeout(() => { typing?.remove(); addScout(reply(text, intent)); }, 600);
  }
  /* Hidden file input reused by Attach + Camera; a chosen file posts as a
     message so the action has a visible result in the thread. */
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.style.display = 'none';
  rootEl.appendChild(fileInput);
  fileInput.addEventListener('change', () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    hideWelcome();
    addUser(`📎 ${f.name}`);
    scoutRespond(`Reviewing ${f.name}`);
    fileInput.value = '';
  });
  function pickFile({ camera = false } = {}) {
    fileInput.accept = camera ? 'image/*' : '';
    if (camera) fileInput.setAttribute('capture', 'environment');
    else fileInput.removeAttribute('capture');
    fileInput.click();
  }

  /* Voice dictation via the Web Speech API where available, with a graceful
     placeholder fallback so the button is never a no-op. */
  let recognizing = false;
  let recognition = null;
  function toggleVoice() {
    const flBtn = rootEl.querySelector(`#${id}-fl-more`);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      const prev = input?.getAttribute('placeholder');
      input?.setAttribute('placeholder', 'Voice input isn’t supported in this browser');
      setTimeout(() => input?.setAttribute('placeholder', prev || ''), 1900);
      return;
    }
    if (recognizing) { recognition?.stop(); return; }
    recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognizing = true;
    flBtn?.classList.add('sc-recording');
    const prev = input?.getAttribute('placeholder');
    input?.setAttribute('placeholder', 'Listening…');
    const restore = () => { recognizing = false; flBtn?.classList.remove('sc-recording'); input?.setAttribute('placeholder', prev || ''); };
    recognition.onresult = (ev) => {
      const text = Array.from(ev.results).map((r) => r[0].transcript).join('');
      if (input) input.value = text;
    };
    recognition.onend = () => { restore(); input?.focus(); };
    recognition.onerror = restore;
    recognition.start();
  }

  function hideWelcome() { welcome?.classList.add('sc-hidden'); }
  function reset() {
    if (messages) messages.innerHTML = '';
    closeAgents();
    welcome?.classList.remove('sc-hidden');
  }
  function submit() {
    if (!input) return;
    const v = input.value.trim();
    if (!v) return;
    input.value = '';
    hideWelcome();
    addUser(v);
    scoutRespond(v);
  }
  /* Programmatically post a user message + Scout reply (used by host modules
     to route a contextual question into the shared chat). */
  function ask(text) {
    const v = String(text || '').trim();
    if (!v) return;
    closeAgents();
    hideWelcome();
    addUser(v);
    scoutRespond(v);
  }

  /* Score cards — a clicked card starts a chat turn on its own intent, the same
     way an intent chip does (and lets the host's onIntent drive navigation). */
  welcome?.addEventListener('click', (e) => {
    const card = e.target.closest('.ws-scorecard[data-card]');
    if (!card || !scorecards) return;
    const def = scorecards.cards[Number(card.dataset.card)];
    if (!def) return;
    const label = def.ask || def.title || '';
    const handled = opts.onIntent ? opts.onIntent(def.intent, label) : false;
    hideWelcome();
    if (label) addUser(label);
    if (!handled && label) scoutRespond(label, def.intent);
  });

  /* Intent chips */
  welcome?.addEventListener('click', (e) => {
    const chip = e.target.closest('.ws-intent-chip[data-intent]');
    if (!chip) return;
    const def = intents[Number(chip.dataset.intent)];
    if (!def) return;
    const handled = opts.onIntent ? opts.onIntent(def.intent, def.label) : false;
    /* "Choose Agents" opens the in-chat settings panel rather than starting a
       chat turn — it's a control, not a question. */
    if (def.intent === 'choose_agents') { openAgents(); return; }
    hideWelcome();
    addUser(def.label);
    /* Route the reply by the chip's intent id (not just its label) so the
       conversation always continues on the feature the chip represents. */
    if (!handled) scoutRespond(def.label, def.intent);
  });

  /* Score-card rail — horizontal scroll with floating controls + edge fades. */
  if (scorecards) {
    const rail = rootEl.querySelector(`#${id}-scorecards`);
    const wrap = rail?.closest('.ws-scorecards-wrap');
    if (rail && wrap) {
      const prev = wrap.querySelector('.ws-sc-scroll--prev');
      const next = wrap.querySelector('.ws-sc-scroll--next');
      const updateArrows = () => {
        const max = rail.scrollWidth - rail.clientWidth - 1;
        const hasPrev = rail.scrollLeft > 1;
        const hasNext = rail.scrollLeft < max && rail.scrollWidth > rail.clientWidth + 1;
        if (prev) prev.hidden = !hasPrev;
        if (next) next.hidden = !hasNext;
        wrap.classList.toggle('has-prev', hasPrev);
        wrap.classList.toggle('has-next', hasNext);
      };
      wrap.querySelectorAll('.ws-sc-scroll').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const dir = Number(btn.dataset.scScroll) || 1;
          rail.scrollBy({ left: dir * Math.max(rail.clientWidth * 0.8, 240), behavior: 'smooth' });
        });
      });
      rail.addEventListener('scroll', updateArrows, { passive: true });
      window.addEventListener('resize', updateArrows);
      requestAnimationFrame(updateArrows);
    }
  }

  /* Intent-chip carousel — single horizontal row with the same scroll controls
     + edge fades as the score-card rail. Only wired when chipsFlow is 'carousel'
     (the default); 'wrap' mode uses plain flex-wrap and needs no scroll logic. */
  if (chipsFlow === 'carousel') {
    const rail = rootEl.querySelector(`#${id}-chips`);
    const wrap = rail?.closest('.ws-chips-wrap');
    if (rail && wrap) {
      const prev = wrap.querySelector('.ws-sc-scroll--prev');
      const next = wrap.querySelector('.ws-sc-scroll--next');
      const updateArrows = () => {
        const max = rail.scrollWidth - rail.clientWidth - 1;
        const hasPrev = rail.scrollLeft > 1;
        const hasNext = rail.scrollLeft < max && rail.scrollWidth > rail.clientWidth + 1;
        if (prev) prev.hidden = !hasPrev;
        if (next) next.hidden = !hasNext;
        wrap.classList.toggle('has-prev', hasPrev);
        wrap.classList.toggle('has-next', hasNext);
      };
      wrap.querySelectorAll('.ws-sc-scroll').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const dir = Number(btn.dataset.chipScroll) || 1;
          rail.scrollBy({ left: dir * Math.max(rail.clientWidth * 0.8, 200), behavior: 'smooth' });
        });
      });
      rail.addEventListener('scroll', updateArrows, { passive: true });
      window.addEventListener('resize', updateArrows);
      requestAnimationFrame(updateArrows);
    }
  }

  /* Send */
  rootEl.querySelector(`#${id}-send`)?.addEventListener('click', submit);
  input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

  /* Agent toggles inside the settings panel */
  settings?.addEventListener('change', (e) => {
    const cb = e.target.closest('input[data-sc-agent]');
    if (!cb) return;
    toggleAgent(cb.dataset.scAgent, cb.checked);
  });

  /* Topbar more popover (.hidden toggle + .is-open on the trigger — matches
     the shared .topbar-popover / .panel-more-btn behavior in the app). */
  const moreBtn = rootEl.querySelector(`#${id}-more`);
  const morePop = rootEl.querySelector(`#${id}-more-pop`);
  function closeMore() {
    morePop?.classList.add('hidden');
    moreBtn?.classList.remove('is-open');
    moreBtn?.setAttribute('aria-expanded', 'false');
  }
  moreBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = morePop.classList.contains('hidden');
    morePop.classList.toggle('hidden', !open);
    moreBtn.classList.toggle('is-open', open);
    moreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  /* Module width toggle (mirrors the .panel-width-toggle-btn on the other
     modules). Width is a three-tier cycle: 0 = single, 1 = double, 2 = triple.
     The icon reflects the tier; the label/title carry the state. */
  const SC_WIDTH_ICONS = ['width_normal', 'width_wide', 'width_full'];
  const SC_WIDTH_TITLES = ['Width (single) — tap to widen', 'Width (double) — tap to widen', 'Width (triple) — tap to reset'];
  const scTierOf = (v) => (v === true ? 1 : typeof v === 'number' ? Math.max(0, Math.min(2, v | 0)) : 0);
  const syncWidthUI = (tier) => {
    tier = scTierOf(tier);
    rootEl.classList.toggle('panel-wide', tier >= 1);
    rootEl.classList.toggle('panel-triple', tier >= 2);
    const btn = rootEl.querySelector('.panel-width-toggle-btn');
    if (btn) {
      btn.classList.toggle('is-on', tier >= 1);
      btn.setAttribute('aria-pressed', tier >= 1 ? 'true' : 'false');
      btn.title = SC_WIDTH_TITLES[tier];
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = SC_WIDTH_ICONS[tier];
    }
  };
  rootEl.addEventListener('click', (e) => {
    const widthToggle = e.target.closest('.panel-width-toggle-btn');
    if (!widthToggle || !rootEl.contains(widthToggle)) return;
    e.stopPropagation();
    const cur = rootEl.classList.contains('panel-triple') ? 2 : rootEl.classList.contains('panel-wide') ? 1 : 0;
    const next = (cur + 1) % 3;
    syncWidthUI(next);
    if (typeof opts.onToggleWidth === 'function') opts.onToggleWidth(next);
  });

  /* Input more popover */
  const flMoreBtn = rootEl.querySelector(`#${id}-fl-more`);
  const flPop = rootEl.querySelector(`#${id}-fl-pop`);
  flMoreBtn?.addEventListener('click', (e) => { e.stopPropagation(); flPop.classList.toggle('open'); });

  /* Menu + chip actions */
  rootEl.addEventListener('click', (e) => {
    const item = e.target.closest('[data-sc]');
    if (!item) return;
    const action = item.dataset.sc;
    if (action === 'add-member') {
      closeMore();
      if (typeof opts.onAddMember === 'function') opts.onAddMember();
      else addScout('Team collaboration is coming to this workspace — you’ll be able to invite teammates straight into this Scout™ conversation.');
    }
    else if (action === 'history') {
      closeMore();
      if (typeof opts.onHistory === 'function') opts.onHistory();
      else addScout('History &amp; Projects lets you jump back into past Scout™ conversations. It’s coming to this workspace soon.');
    }
    else if (action === 'new') { reset(); closeMore(); }
    else if (action === 'agents') {
      closeMore();
      openAgents();
      if (opts.onIntent) opts.onIntent('choose_agents', 'Choose Agents');
    } else if (action === 'agents-close') {
      closeAgents();
    } else if (action === 'export') {
      closeMore();
      const blob = new Blob(['Scout™ export placeholder\n'], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'scout-chat.txt';
      a.click();
    } else if (action === 'share') {
      closeMore();
      const url = window.location.href;
      if (navigator.share) navigator.share({ title: esc(title), url }).catch(() => {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
    } else if (action === 'close') {
      closeMore();
      if (typeof opts.onClose === 'function') opts.onClose();
      else window.history.back();
    } else if (action === 'attach') {
      flPop?.classList.remove('open');
      pickFile();
    } else if (action === 'camera') {
      flPop?.classList.remove('open');
      pickFile({ camera: true });
    } else if (action === 'voice') {
      flPop?.classList.remove('open');
      toggleVoice();
    }
  });

  /* Close popovers on outside click */
  document.addEventListener('click', (e) => {
    if (morePop && !morePop.classList.contains('hidden') && !morePop.contains(e.target) && e.target !== moreBtn && !moreBtn?.contains(e.target)) {
      closeMore();
    }
    if (flPop?.classList.contains('open') && !flPop.contains(e.target) && !flMoreBtn?.contains(e.target)) {
      flPop.classList.remove('open');
    }
  });

  decorateScout(rootEl);

  return { addUser, addScout, ask, reset, openAgents, closeAgents, root: rootEl };
}
