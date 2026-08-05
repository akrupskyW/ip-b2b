/**
 * WISEai Chat Module — the ONE shared chat surface for WISE.
 *
 * A framework-free, mountable extraction of the chat module in
 * pages/ai-chat.html so the exact same component (WISE-owl welcome screen,
 * intent chips, plain message lines, floating-label input rail) can be
 * dropped into any page instead of bespoke one-off chats.
 *
 *   import { mountWISEaiChat } from './wiseai-chat.js';
 *   mountWISEaiChat(document.getElementById('host'), { ... });
 *
 * Requires the design tokens from agent-page.css and the styles in
 * wiseai-chat.css to be loaded on the host page.
 */

/* Side-effect import: registers window.WiseChatHistory (the shared in-module
   history sidebar) so every mounted WISEai surface gets the same history +
   "start new conversation" behaviour. */
import './chat-history.js';

/* WISE-owl "bug" used in the topbar (inherits currentColor). Exported so the
   WISEai dock can reuse the exact same mark for its collapsed floating circle. */
export const OWL_BUG = `<svg viewBox="0 0 193 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M10.9834 35.6522C10.9834 35.6522 3.30615 47.7494 3.30615 58.0481C3.30615 81.1921 20.324 99.6409 43.3405 99.9915C51.5363 100.052 60.4175 99.9915 67.533 92.6894C41.5052 92.6894 25.589 73.777 25.589 58.0481C25.589 58.0481 25.2144 45.6894 30.832 35.9526L10.9834 35.6522Z"/><path d="M83.8241 14.7368C90.9396 14.7368 94.8008 22.7337 96.3699 29.2111H96.5571C98.1262 22.7337 101.987 14.7368 109.103 14.7368H170.521C175.169 14.7368 175.169 12.8643 175.169 7.32269C175.169 2.80876 178.108 0 182.131 0H189.384V14.7368C189.384 27.7131 182.131 28.5339 174.794 28.5339L160.347 28.583H118.091C113.597 28.583 113.335 29.2111 111.537 33.7051C110.051 37.4206 96.5571 73.0277 96.5571 73.0277H96.3699C96.3699 73.0277 82.8761 37.4206 81.3899 33.7051C79.5923 29.2111 79.3301 28.583 74.8361 28.583H32.5803L18.133 28.5339C10.7965 28.5339 3.54341 27.7131 3.54341 14.7368V0H10.7965C14.5415 0 17.7585 3.37051 17.7585 7.32269C17.7585 12.8643 17.7585 14.7368 22.406 14.7368H83.8241Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M71.8001 35.9523C74.4284 35.9523 74.6161 37.2826 75.1793 38.6953L87.9434 71.5913C82.9358 80.6013 74.4289 85.7609 63.9558 85.7609C48.1132 85.7608 33.2662 72.7999 33.2663 54.6695C33.2664 48.2288 34.5088 40.1469 39.2583 35.9523H71.8001ZM63.486 44.5345C58.3905 44.5345 54.2598 48.6005 54.2598 54.0781C54.2598 59.5557 58.3905 63.6217 63.486 63.6217C68.5814 63.6216 72.7122 59.5556 72.7122 54.0781C72.7122 48.6005 68.5814 44.5346 63.486 44.5345Z"/><path d="M181.756 35.6522C181.756 35.6522 189.433 47.7494 189.433 58.0481C189.433 81.1921 172.416 99.6409 149.399 99.9915C141.203 100.052 132.322 99.9915 125.206 92.6894C151.234 92.6894 167.151 73.777 167.151 58.0481C167.151 58.0481 167.525 45.6894 161.908 35.9526L181.756 35.6522Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M120.94 35.9523C118.311 35.9523 118.124 37.2826 117.56 38.6953L104.796 71.5913C109.804 80.6013 118.311 85.7609 128.784 85.7609C144.626 85.7608 159.473 72.7999 159.473 54.6695C159.473 48.2288 158.231 40.1469 153.481 35.9523H120.94ZM129.254 44.5345C134.349 44.5345 138.48 48.6005 138.48 54.0781C138.48 59.5557 134.349 63.6217 129.254 63.6217C124.158 63.6216 120.027 59.5556 120.027 54.0781C120.027 48.6005 124.158 44.5346 129.254 44.5345Z"/></svg>`;

/* WISE-owl mark used inside the welcome circle (white on primary). Exported so
   the marketing galaxy can reuse the exact same pulsating owl for its core. */
export const OWL_MARK = `<svg viewBox="0 0 193 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.9834 35.6522C10.9834 35.6522 3.30615 47.7494 3.30615 58.0481C3.30615 81.1921 20.324 99.6409 43.3405 99.9915C51.5363 100.052 60.4175 99.9915 67.533 92.6894C41.5052 92.6894 25.589 73.777 25.589 58.0481C25.589 58.0481 25.2144 45.6894 30.832 35.9526L10.9834 35.6522Z" fill="white"/><path d="M83.8241 14.7368C90.9396 14.7368 94.8008 22.7337 96.3699 29.2111H96.5571C98.1262 22.7337 101.987 14.7368 109.103 14.7368H170.521C175.169 14.7368 175.169 12.8643 175.169 7.32269C175.169 2.80876 178.108 0 182.131 0H189.384V14.7368C189.384 27.7131 182.131 28.5339 174.794 28.5339L160.347 28.583H118.091C113.597 28.583 113.335 29.2111 111.537 33.7051C110.051 37.4206 96.5571 73.0277 96.5571 73.0277H96.3699C96.3699 73.0277 82.8761 37.4206 81.3899 33.7051C79.5923 29.2111 79.3301 28.583 74.8361 28.583H32.5803L18.133 28.5339C10.7965 28.5339 3.54341 27.7131 3.54341 14.7368V0H10.7965C14.5415 0 17.7585 3.37051 17.7585 7.32269C17.7585 12.8643 17.7585 14.7368 22.406 14.7368H83.8241Z" fill="white"/><path fill-rule="evenodd" clip-rule="evenodd" d="M71.8001 35.9523C74.4284 35.9523 74.6161 37.2826 75.1793 38.6953L87.9434 71.5913C82.9358 80.6013 74.4289 85.7609 63.9558 85.7609C48.1132 85.7608 33.2662 72.7999 33.2663 54.6695C33.2664 48.2288 34.5088 40.1469 39.2583 35.9523H71.8001ZM63.486 44.5345C58.3905 44.5345 54.2598 48.6005 54.2598 54.0781C54.2598 59.5557 58.3905 63.6217 63.486 63.6217C68.5814 63.6216 72.7122 59.5556 72.7122 54.0781C72.7122 48.6005 68.5814 44.5346 63.486 44.5345Z" fill="white"/><path d="M181.756 35.6522C181.756 35.6522 189.433 47.7494 189.433 58.0481C189.433 81.1921 172.416 99.6409 149.399 99.9915C141.203 100.052 132.322 99.9915 125.206 92.6894C151.234 92.6894 167.151 73.777 167.151 58.0481C167.151 58.0481 167.525 45.6894 161.908 35.9526L181.756 35.6522Z" fill="white"/><path fill-rule="evenodd" clip-rule="evenodd" d="M120.94 35.9523C118.311 35.9523 118.124 37.2826 117.56 38.6953L104.796 71.5913C109.804 80.6013 118.311 85.7609 128.784 85.7609C144.626 85.7608 159.473 72.7999 159.473 54.6695C159.473 48.2288 158.231 40.1469 153.481 35.9523H120.94ZM129.254 44.5345C134.349 44.5345 138.48 48.6005 138.48 54.0781C138.48 59.5557 134.349 63.6217 129.254 63.6217C124.158 63.6216 120.027 59.5556 120.027 54.0781C120.027 48.6005 124.158 44.5346 129.254 44.5345Z" fill="white"/></svg>`;

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
   the roster in pages/ai-chat.html so the shared WISEai surface exposes the
   same agents everywhere it's mounted. Callers can override via opts.agents.
   `group` buckets a row under "Core" or "Specialist"; `required` agents
   (WISEai) can't be switched off. */
const DEFAULT_AGENTS = [
  {
    id: 'wise', name: 'WISEai™', version: 'v3.2', group: 'core',
    icon: 'verified', color: 'var(--primary)', bg: '',
    tagline: 'Verification Orchestrator',
    desc: 'The core WISEai™ agent that orchestrates your entire verification workflow — from customer profiling through UPC analysis, attestation, and badge issuance. Cannot be disabled.',
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
    id: 'wiseai', name: 'WISE Foods', version: 'v1.8', group: 'core',
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

/* Generic, source-agnostic connection walkthrough shown in the transcript when
   a data-source connector chip is clicked. Steps animate pending → active →
   done so the chat visibly walks the user through linking the source. `{brand}`
   is swapped for the connector's display name. Kept deliberately generic — the
   real per-source OAuth/scoping steps can be filled in later. */
const CONNECTOR_CONNECT_STEPS = [
  { icon: 'lock_open',   title: 'Authorize access',    desc: 'Open {brand}\u2019s secure sign-in and grant WISEai read-only access.' },
  { icon: 'tune',        title: 'Choose data scope',   desc: 'Share product catalog, pricing, availability & nutrition fields.' },
  { icon: 'hub',         title: 'Match to WISE Foods', desc: 'Cross-reference {brand} UPCs against the verified WISE Foods registry.' },
  { icon: 'inventory_2', title: 'Sync catalog',        desc: 'Import verified products so WISEai can score them in real time.' },
];
const CONNECTOR_REFRESH_STEPS = [
  { icon: 'verified_user', title: 'Verify connection',   desc: 'Confirm {brand}\u2019s authorization is still valid.' },
  { icon: 'sync',          title: 'Sync latest catalog', desc: 'Pull the newest {brand} products, pricing & availability.' },
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

/* Standing reminder under the input that WISEai is an assistant, not the
   source of record — the single most important piece of AI trust microcopy. */
const DEFAULT_DISCLAIMER = '';

/* Thumbs-down reason chips — the quick "what was wrong?" taxonomy shown when a
   user marks an answer inaccurate. Hosts can override via opts.feedbackReasons. */
const DEFAULT_FEEDBACK_REASONS = [
  { reason: 'inaccurate', label: 'Inaccurate' },
  { reason: 'incomplete', label: 'Missing info' },
  { reason: 'wrong-food', label: 'Wrong food' },
  { reason: 'outdated', label: 'Outdated data' },
  { reason: 'unclear', label: 'Hard to follow' },
  { reason: 'other', label: 'Something else' },
];

/* WISE.ai model roster shown in the in-input model selector (the "tune" button
   on the right edge of the input). Exactly one model is active at a time. */
export const WISEAI_MODELS = [
  { id: 'swift', name: 'WISE.ai Swift', desc: 'Fast answers for everyday work' },
  { id: 'core',  name: 'WISE.ai Core',  desc: 'Balanced depth & speed', default: true },
  { id: 'deep',  name: 'WISE.ai Deep',  desc: 'Advanced reasoning for reformulation' },
];

/* Build the right-side model selector (button + single-select toggle popover).
   Kept as a shared helper so every chat surface renders an identical control. */
function buildModelSelectorHtml(id) {
  const items = WISEAI_MODELS.map((m) => {
    const on = m.default === true;
    return `<button type="button" class="fl-model-item${on ? ' is-active' : ''}" role="menuitemradio" aria-checked="${on ? 'true' : 'false'}" data-model="${m.id}">`
      + `<span class="fl-model-meta"><span class="fl-model-name">${esc(m.name)}</span><span class="fl-model-desc">${esc(m.desc)}</span></span>`
      + `<span class="fl-model-switch" aria-hidden="true"></span></button>`;
  }).join('');
  return `<div class="fl-model-wrap">
            <button type="button" class="fl-icon-btn fl-model-btn" id="${id}-fl-model" title="WISE.ai model" aria-haspopup="menu" aria-expanded="false"><span class="material-icons">tune</span></button>
            <div class="fl-model-popover" id="${id}-fl-model-pop" role="menu">
              <div class="fl-model-head">WISE.ai model</div>
              ${items}
            </div>
          </div>`;
}

/* One-time style injection for the bits the shared chat adds on top of the
   base stylesheet: the locked scorecard state, the three-dot MCP toggle switch,
   and the "Connect a data source" side panel rows (which reuse the .wch-sidebar
   shell already injected by chat-history.js). Injected from JS so it works on
   every host page regardless of which stylesheet variant it loads. */
function injectChatExtras() {
  if (typeof document === 'undefined' || document.getElementById('wiseai-chat-extras')) return;
  const css = `
    .ws-scorecard--locked { cursor: default; opacity: .7; }
    .ws-scorecard--locked:hover { background: var(--surface-2); border-color: var(--border-strong); box-shadow: none; transform: none; }
    .ws-sc-lock { font-size: 18px !important; color: var(--text-subtle); }
    .ws-sc-action--locked { color: var(--text-subtle); align-self: flex-end; }

    .sc-mcp-item { justify-content: flex-start; }
    .sc-mcp-item > span:not(.material-icons):not(.sc-switch) { flex: 1 1 auto; }
    .sc-switch { position: relative; flex: 0 0 auto; width: 34px; height: 19px; border-radius: 999px;
      background: var(--surface-3, #cdd3da); border: 1px solid var(--border-strong); transition: background .15s ease, border-color .15s ease; }
    html.dark .sc-switch { background: rgba(255,255,255,0.14); }
    .sc-switch::after { content: ''; position: absolute; top: 1px; left: 1px; width: 15px; height: 15px; border-radius: 50%;
      background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.28); transition: transform .18s ease; }
    .sc-mcp-item.is-on .sc-switch { background: var(--primary); border-color: var(--primary); }
    .sc-mcp-item.is-on .sc-switch::after { transform: translateX(15px); }

    .wch-conn-intro { margin: 2px 16px 8px; font-size: 12px; line-height: 1.45; opacity: .7; }
    .wch-conn-list { flex: 1; overflow-y: auto; padding: 2px 8px 12px; }
    .wch-conn-row { display: flex; align-items: center; gap: 11px; width: 100%; margin: 2px 0; padding: 9px 10px;
      border: 0; background: none; border-radius: 10px; cursor: pointer; text-align: left; color: inherit; font-family: inherit; }
    .wch-conn-row:hover { background: rgba(255,255,255,0.06); }
    html:not(.dark) .wch-conn-row:hover { background: rgba(20,40,80,0.05); }
    .wch-conn-body { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .wch-conn-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .wch-conn-status { font-size: 11px; opacity: .6; }
    .wch-conn-cta { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; font-size: 11.5px; font-weight: 700; color: var(--primary, #2F6DF6); }
    .wch-conn-cta .material-icons { font-size: 15px; }
    .wch-conn-row.is-connected .wch-conn-cta { color: var(--sec-green-text, #2E7D32); }

    /* Feedback actions (copy / thumbs) sit INLINE, directly to the right of the
       timestamp inside .sc-line-meta — small, filled glyphs. */
    .sc-fb-wrap { margin: 0; align-self: center; }
    .sc-fb { display: inline-flex; align-items: center; gap: 1px; }
    .sc-fb-btn { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px;
      border: 0; border-radius: 5px; background: transparent; color: var(--text-subtle); cursor: pointer; padding: 0;
      transition: background .14s ease, color .14s ease; }
    .sc-fb-btn:hover { background: var(--surface-3); color: var(--text); }
    html.dark .sc-fb-btn:hover { background: rgba(255,255,255,0.07); }
    .sc-fb-btn .material-symbols-outlined { font-size: 14px; font-variation-settings: 'FILL' 1; }
    .sc-fb-btn.is-on { color: var(--primary); }
    .sc-fb-btn.is-on[data-fb="down"] { color: var(--sec-red-text); }
    .sc-fb-btn.is-on .material-symbols-outlined { font-variation-settings: 'FILL' 1; }
    .sc-fb-btn.is-done { color: var(--sec-green-text); }
    .sc-fb-reasons { margin-top: 9px; display: flex; flex-direction: column; gap: 7px; }
    .sc-fb-reasons[hidden] { display: none; }
    .sc-fb-reasons-label { font-size: 11.5px; font-weight: 600; color: var(--text-muted); }
    .sc-fb-reason-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .sc-fb-reason { font-size: 11.5px !important; padding: 5px 11px !important; font-weight: 500; }
    .sc-fb-reason.is-on { border-color: var(--primary); color: var(--primary);
      background: color-mix(in srgb, var(--primary) 12%, transparent); }
    .sc-fb-note { margin-top: 8px; display: flex; align-items: center; gap: 5px; font-size: 11.5px; font-style: italic; color: var(--text-subtle); }
    .sc-fb-note[hidden] { display: none; }
    .sc-fb-note .material-symbols-outlined { font-size: 15px; }

    /* "Forked from …" lineage banner pinned to the top of a forked transcript.
       It persists in the saved thread so the lineage sticks no matter how far
       the fork is taken. */
    .sc-fork-banner { display: flex; align-items: center; gap: 9px; margin: 2px 0 14px; padding: 9px 13px; border-radius: 12px;
      font-size: 12.5px; line-height: 1.4; color: var(--text);
      background: color-mix(in srgb, var(--primary, #2F6DF6) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--primary, #2F6DF6) 26%, transparent); }
    .sc-fork-banner-ic { font-size: 18px; color: var(--primary, #2F6DF6); flex: 0 0 auto; }
    .sc-fork-banner-txt strong { font-weight: 700; }

    /* Momentary highlight when "Jump to turn" scrolls a turn into view. */
    @keyframes wtFlash { 0% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary, #2F6DF6) 42%, transparent); } 100% { box-shadow: 0 0 0 0 transparent; } }
    .sc-line.wt-flash .sc-line-body { border-radius: 12px; animation: wtFlash 1.3s ease; }

    /* Turns Module — a right-docked side panel (reuses the .wch-sidebar shell)
       that lists every turn in the conversation, each with a "Fork from here"
       button. */
    .wt-intro { margin: 2px 16px 8px; font-size: 12px; line-height: 1.45; opacity: .7; }
    .wt-list { flex: 1; overflow-y: auto; padding: 2px 8px 14px; }
    .wt-empty { padding: 26px 18px; font-size: 12.5px; line-height: 1.55; opacity: .62; text-align: center; }
    .wt-turn { position: relative; border: 1px solid var(--border, rgba(255,255,255,0.10)); border-radius: 12px;
      padding: 11px 12px 12px; margin: 8px 4px; background: rgba(255,255,255,0.02); }
    html:not(.dark) .wt-turn { background: rgba(20,40,80,0.02); border-color: rgba(0,0,0,0.08); }
    .wt-turn-head { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
    .wt-turn-num { display: inline-flex; align-items: center; justify-content: center; min-width: 22px; height: 22px; padding: 0 6px;
      border-radius: 999px; font-size: 11px; font-weight: 700; flex: 0 0 auto;
      background: color-mix(in srgb, var(--primary, #2F6DF6) 14%, transparent); color: var(--primary, #2F6DF6); }
    .wt-turn-q { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; line-height: 1.35;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .wt-turn-a { font-size: 12px; line-height: 1.45; opacity: .72; margin: 2px 0 9px;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .wt-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
    .wt-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 600; padding: 3px 8px; border-radius: 999px;
      background: var(--surface-3, rgba(255,255,255,0.06)); color: var(--text-muted, inherit); }
    html:not(.dark) .wt-chip { background: rgba(20,40,80,0.06); }
    .wt-chip .material-icons { font-size: 13px; }
    .wt-actions { display: flex; align-items: center; gap: 6px; }
    .wt-fork { display: inline-flex; align-items: center; gap: 6px; border: 0; cursor: pointer; font-family: inherit; font-size: 12px; font-weight: 700;
      padding: 7px 13px; border-radius: 999px; background: var(--primary, #2F6DF6); color: #fff; }
    .wt-fork:hover { filter: brightness(1.06); }
    .wt-fork .material-icons { font-size: 16px; }
    .wt-jump { display: inline-flex; align-items: center; gap: 5px; margin-left: auto; border: 0; background: transparent; cursor: pointer;
      font-family: inherit; font-size: 12px; font-weight: 600; color: var(--text-muted, inherit); opacity: .8; padding: 6px 4px; }
    .wt-jump:hover { opacity: 1; color: var(--primary, #2F6DF6); }
    .wt-jump .material-icons { font-size: 15px; }
  `;
  const style = document.createElement('style');
  style.id = 'wiseai-chat-extras';
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);
}

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
  return 'On it. The full conversational flow lives in the reference app; this surface mirrors the real WISEai™ layout and controls.';
}

/* Pick 1–2 short, human status lines describing what WISEai is actually doing
   for this turn (e.g. "Building your dashboard", "Gathering the details").
   These are shown ONE AT A TIME in the thinking indicator, in place of the old
   bouncing dots, so the wait reflects the answer being built. */
function statusStepsFor(text, intent) {
  const byIntent = {
    customer_profile: ['Setting up the customer profile', 'Preparing the verification steps'],
    resume_prompt: ['Finding your work in progress', 'Gathering the details'],
    faq_intro: ['Gathering the details'],
    registry_home: ['Opening the WISE Foods registry', 'Pulling product data'],
    add_food_intro: ['Getting the label parser ready'],
    edit_food_select: ['Loading your products'],
  };
  if (intent && byIntent[intent]) return byIntent[intent];
  const q = String(text || '').toLowerCase();
  if (/(dashboard|chart|graph|trend|score|analy|metric|\bdata\b|insight|report|breakdown)/.test(q)) return ['Building your dashboard', 'Crunching the numbers'];
  if (/(compar|versus|\bvs\b|benchmark|side by side)/.test(q)) return ['Assembling the comparison', 'Lining up the numbers'];
  if (/(reformulat|recipe|ingredient swap|optimi|substitut)/.test(q)) return ['Modeling the reformulation'];
  if (/(verif|shield|attest|non-upf|clean label|badge)/.test(q)) return ['Preparing the verification flow'];
  if (/(food|registry|upc|product|search|look ?up|find)/.test(q)) return ['Searching the WISE Foods registry', 'Matching UPCs'];
  if (/(portfolio|catalog|inventory)/.test(q)) return ['Opening your portfolio', 'Gathering the details'];
  if (/(connect|sync|integration|kroger|walmart|instacart|usda)/.test(q)) return ['Checking the connection', 'Gathering the details'];
  return ['Gathering the details'];
}

/* Build the in-chat "Agent Settings" overlay from an agent roster. Mirrors the
   #settings-screen markup in pages/ai-chat.html, scoped to the WISEai card so
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
          <p class="ss-info-desc">WISEai™ orchestrates all active agents automatically. Enable agents based on the tasks you perform most — more agents = richer context, more capabilities. WISEai™ is always required.</p>
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
 *   { variant: 'metric'|'intro'|'wiseai', icon, iconTone, pill:{tone,icon,text},
 *     metric, metricUnit, title, desc, action, intent, ask }
 * Cards drive a chat turn on click (handled in mountWISEaiChat) via {intent, ask}.
 */
function buildScorecardsHtml(sc, id) {
  if (!sc || !Array.isArray(sc.cards) || !sc.cards.length) return '';
  const label = sc.label || 'Your portfolio at a glance';
  const cardHtml = (c, i) => {
    const isIntro = c.variant === 'intro' || c.variant === 'wiseai';
    const locked = c.locked === true;
    const variantClass = (c.variant === 'wiseai'
      ? ' ws-scorecard--intro ws-scorecard--wiseai'
      : c.variant === 'intro' ? ' ws-scorecard--intro' : '') + (locked ? ' ws-scorecard--locked' : '');
    const iconTone = c.iconTone ? `ws-sc-icon--${esc(c.iconTone)}` : 'ws-sc-icon--brand';
    /* A locked card swaps its pill for a lock badge so the "coming soon" state
       reads instantly. */
    const topRight = locked
      ? `<span class="ws-sc-lock material-icons" title="Coming soon" aria-hidden="true">lock</span>`
      : (c.pill
        ? `<span class="ws-sc-pill ws-sc-pill--${esc(c.pill.tone || 'up')}">${c.pill.icon ? `<span class="material-icons">${esc(c.pill.icon)}</span>` : ''}${esc(c.pill.text || '')}</span>`
        : '');
    const lead = isIntro
      ? `<div class="ws-sc-intro-title">${esc(c.title || '')}</div>`
      : `${c.metric != null ? `<div class="ws-sc-metric">${esc(c.metric)}${c.metricUnit ? `<span class="ws-sc-metric-unit">${esc(c.metricUnit)}</span>` : ''}</div>` : ''}<div class="ws-sc-title">${esc(c.title || '')}</div>`;
    const action = locked
      ? `<div class="ws-sc-action ws-sc-action--locked">Coming soon</div>`
      : (c.action
        ? `<div class="ws-sc-action">${esc(c.action)}<span class="material-icons">arrow_outward</span></div>`
        : '');
    return `
      <button type="button" class="ws-scorecard${variantClass}" role="listitem" data-card="${i}"${locked ? ' aria-disabled="true" data-locked="1"' : ''}>
        <div class="ws-sc-top">
          <span class="ws-sc-icon ${iconTone}"><span class="material-icons">${esc(c.icon || 'insights')}</span></span>
          ${topRight}
        </div>
        ${lead}
        <div class="ws-sc-desc">${esc(c.desc || '')}</div>
        ${action}
      </button>`;
  };
  return `
    <div class="ws-scorecards-section">
      <div class="ws-scorecards-wrap">
        <div class="ws-scorecards" id="${id}-scorecards" role="list" aria-label="${esc(label)}">${sc.cards.map(cardHtml).join('')}</div>
        <button type="button" class="ws-sc-scroll ws-sc-scroll--prev" data-sc-scroll="-1" aria-label="Scroll to previous cards" hidden><span class="material-icons">chevron_left</span></button>
        <button type="button" class="ws-sc-scroll ws-sc-scroll--next" data-sc-scroll="1" aria-label="Scroll to see more cards"><span class="material-icons">chevron_right</span></button>
      </div>
    </div>`;
}

let _seq = 0;

/**
 * Mount the shared WISEai chat into `rootEl`.
 * @param {HTMLElement} rootEl
 * @param {object} [opts]
 *   title        {string}  topbar title (default 'WISEai')
 *   agentCount   {number}  "N agents running" pill (default: # of on agents)
 *   agents       {Array}   agent roster for the in-chat settings panel
 *                          [{id,name,version,group,icon,color,bg,tagline,desc,tags,required,on}]
 *   heading      {string}  welcome heading (default 'What can WISEai help with?')
 *   sub          {string}  welcome subheading
 *   intents      {Array}   welcome intent chips [{intent,label,icon}]
 *   intentReplies{object}  intent-id → reply (string|fn) so a clicked chip
 *                          always continues with an on-feature answer
 *   placeholder  {string}  input placeholder
 *   flLabel      {string}  floating label text
 *   disclaimer   {string}  standing AI-limitations note under the input ('' hides)
 *   sourceLabel  {string}  grounding caption appended to each WISEai reply ('' hides)
 *   statusLabel  {string}  what WISEai is "doing" while the typing dots show
 *   onIntent     {fn}      (intent,label) => boolean — return true to suppress default reply
 *   onAddMember  {fn}      () => void — "Add team member to chat" popover item
 *   onHistory    {fn}      () => void — "History & Projects" popover item
 *   onToggleWidth{fn}      (isWide) => void — fired when the width toggle flips
 *   reply        {fn}      (text,intent) => html string for WISEai's response
 * @returns {{ addUser, addWISEai, reset, root }}
 */
export function mountWISEaiChat(rootEl, opts = {}) {
  if (!rootEl) return null;
  injectChatExtras();
  const id = `sc${++_seq}`;
  const title = opts.title || 'WISEai™';
  /* Agent roster powering the in-chat settings panel + the "N agents running"
     pill. Clone so a caller's array isn't mutated as toggles flip. */
  const agents = (Array.isArray(opts.agents) ? opts.agents : DEFAULT_AGENTS).map((a) => ({ ...a }));
  const onCount = () => agents.filter((a) => a.on).length;
  const agentCount = opts.agentCount != null ? opts.agentCount : onCount();
  /* When true, the topbar drops its brand lead (owl bug, title, "N agents
     running" pill) entirely, leaving only the right-hand controls — the
     three-dot menu and the width toggle. Used by the marketing shell so the
     docked chat rail carries just those two controls. */
  const hideBranding = opts.hideBranding === true;
  const heading = opts.heading || 'What can WISEai™ help with?';
  const sub = opts.sub !== undefined ? opts.sub : 'Your AI Verification assistant — NON-UPF & beyond';
  /* Mutable so a host can swap the intent chips at runtime (setIntents) without
     tearing down the chat — e.g. a persistent marketing dock that re-skins its
     quick-actions to match whichever page you're on. */
  let intents = (opts.intents || DEFAULT_INTENTS).slice();
  const placeholder = opts.placeholder || 'Type a message';
  /* The "You" avatar mirrors the top-bar profile chip (Arthur Krupsky → "AK").
     When the topbar avatar becomes an image, pass opts.userAvatar with an <img>. */
  const userInitials = opts.userInitials || 'AK';
  const userAvatar = opts.userAvatar || esc(userInitials);
  /* Optional per-intent reply map for this surface; an intent-id hit here means
     a clicked chip always continues with an on-feature answer. Mutable so
     setIntents() can extend it alongside a new chip set. */
  let intentReplies = opts.intentReplies && typeof opts.intentReplies === 'object' ? opts.intentReplies : null;
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
  const sourceLabel = opts.sourceLabel !== undefined ? opts.sourceLabel : '';
  const statusLabel = opts.statusLabel || `${title} is thinking`;

  /* Optional "at a glance" score-card rail for this surface (opt-in). */
  const scorecards = opts.scorecards && Array.isArray(opts.scorecards.cards) && opts.scorecards.cards.length
    ? opts.scorecards
    : null;
  const scorecardsHtml = scorecards ? buildScorecardsHtml(scorecards, id) : '';

  /* Optional brand-connector rail (opt-in) — a horizontally scrolling row of
     data-source connectors docked right beneath the input, e.g. retailer &
     food-data APIs (Kroger, Instacart, USDA FoodData Central…). Each entry:
       { id, name, color, mono, icon, connected }
     `mono` renders a brand-colored monogram badge; `icon` (a Material icon
     name) is used instead when present. Clicking one fires opts.onConnector(id)
     and, unless the host handles it, posts a "connect" turn into the chat. */
  const connectors = Array.isArray(opts.connectors) ? opts.connectors.filter(Boolean) : [];
  const connectorsLabel = opts.connectorsLabel !== undefined ? opts.connectorsLabel : 'Connect a data source';
  /* The docked below-input connector rail is opt-out: when a host moves the
     sources into the three-dot "Connect a data source" side panel instead, it
     passes `connectorsRail: false` to drop the rail while keeping the data. */
  const showConnectorsRail = opts.connectorsRail !== false;
  /* Whether the three-dot menu offers a "Connect a data source" side panel
     (default on whenever connectors exist). */
  const showConnectorsPanel = opts.connectorsPanel !== false && connectors.length > 0;

  /* Whether the three-dot menu offers a "View turns" toggle that opens the
     Turns Module — a side panel listing every turn in the conversation, each
     with a "Fork from here" button that copies the thread up to that point into
     a brand-new chat of your own (the original is never touched). Opt-in via
     `opts.turns: true` since it's most useful on surfaces with rich, forkable
     transcripts. Requires the in-module history sidebar to file the fork. */
  const showTurns = opts.turns === true;
  /* When true the Turns overlay gains a "break out" control that detaches it
     from the in-chat overlay into a standalone module docked to the RIGHT of
     the chat (a real flex sibling in the modules row, dressed like the result
     panes) — mirroring the History breakout, but on the opposite side. */
  const turnsBreakout = opts.turnsBreakout === true;
  const turnsBreakoutWidth = opts.turnsBreakoutWidth || 360;

  /* Answer-quality feedback — a thumbs up / thumbs down (+ copy) row trailing
     each WISEai answer. Thumbs down reveals a "what was wrong?" chip set so the
     user can qualify the miss. Opt-out via `feedback: false`; reasons are
     configurable via `feedbackReasons`. `opts.onFeedback(verdict, reason)` fires
     on each interaction. */
  const feedbackEnabled = opts.feedback !== false;
  const feedbackReasons = Array.isArray(opts.feedbackReasons) && opts.feedbackReasons.length
    ? opts.feedbackReasons
    : DEFAULT_FEEDBACK_REASONS;
  /* The trailing "more connectors" three-dot button is opt-out: when every
     source is already shown in the rail (opts.connectorsMore === false) it's
     redundant, so callers can drop it. */
  const showConnectorMore = opts.connectorsMore !== false;
  const connectorLogo = (c) => {
    const color = esc(c.color || 'var(--primary)');
    /* Fallback mark shown if the brand logo image is missing / fails to load. */
    const fallback = c.icon
      ? `<span class="material-icons">${esc(c.icon)}</span>`
      : esc(c.mono || (c.name || '?').slice(0, 1));
    /* Prefer the real brand logo (an image URL) when provided. */
    if (c.logo) {
      return `<span class="sc-connector-logo sc-connector-logo--img" style="--cxc:${color}"><img class="sc-connector-logo-img" src="${esc(c.logo)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="sc-connector-logo-fb">${fallback}</span></span>`;
    }
    return c.icon
      ? `<span class="sc-connector-logo" style="--cxc:${color}"><span class="material-icons">${esc(c.icon)}</span></span>`
      : `<span class="sc-connector-logo sc-connector-logo--mono" style="--cxc:${color}">${esc(c.mono || (c.name || '?').slice(0, 1))}</span>`;
  };
  const connectorsHtml = (connectors.length && showConnectorsRail)
    ? `<div class="sc-connectors" id="${id}-connectors" aria-label="${esc(connectorsLabel || 'Connectors')}">
        ${connectorsLabel ? `<span class="sc-connectors-label"><span class="material-icons">hub</span>${esc(connectorsLabel)}</span>` : ''}
        <div class="sc-connectors-rail" id="${id}-connectors-rail" role="list">
          ${connectors.map((c) =>
            `<button type="button" class="sc-connector${c.connected ? ' is-connected' : ''}" role="listitem" data-connector="${esc(c.id || c.name)}" title="${c.connected ? 'Connected · ' : 'Connect '}${esc(c.name)}">
              ${connectorLogo(c)}
              <span class="sc-connector-name">${esc(c.name)}</span>
              <span class="sc-connector-tick material-icons" aria-hidden="true">${c.connected ? 'check_circle' : 'add'}</span>
            </button>`
          ).join('')}
        </div>
        ${showConnectorMore ? `<button type="button" class="sc-connector-more" id="${id}-connectors-more" title="More connectors" aria-label="More connectors"><span class="material-icons">more_vert</span></button>` : ''}
      </div>`
    : '';

  /* 'carousel' (default) = horizontal scroll row with scroll buttons + edge
     fades; 'wrap' = plain wrapped flex grid, no controls, no overflow. */
  const chipsFlow = opts.chipsFlow === 'wrap' ? 'wrap' : 'carousel';

  const buildChipsHtml = () => intents.map((c, i) =>
    `<button type="button" class="chip ws-intent-chip" data-intent="${i}"><span class="material-icons">${esc(c.icon || 'bolt')}</span>${esc(c.label)}</button>`
  ).join('');
  let chipsHtml = buildChipsHtml();

  const chipsContainerHtml = chipsFlow === 'wrap'
    ? `<div class="ws-chips" id="${id}-chips" role="list" aria-label="Quick actions">${chipsHtml}</div>`
    : `<div class="ws-chips-wrap">
        <div class="ws-chips" id="${id}-chips" role="list" aria-label="Quick actions">${chipsHtml}</div>
        <button type="button" class="ws-sc-scroll ws-sc-scroll--prev" data-chip-scroll="-1" aria-label="Scroll to previous actions" hidden><span class="material-icons">chevron_left</span></button>
        <button type="button" class="ws-sc-scroll ws-sc-scroll--next" data-chip-scroll="1" aria-label="Scroll to see more actions"><span class="material-icons">chevron_right</span></button>
      </div>`;

  /* Persistent intent-chip rail — an opt-in (`persistChips: true`) horizontal
     rail that stays docked above the input for the whole conversation, so every
     possible conversational route is always one tap away (not just on the
     welcome screen). Rendered here, revealed once the welcome is dismissed. */
  const persistChips = opts.persistChips === true;
  /* Remembered preference for the LARGE welcome cards (the "at a glance"
     scorecards block). Toggled from the three-dot menu; persisted per surface so
     a host's choice sticks across reloads. Nothing else on the welcome (owl,
     headline, intent chips) is affected. */
  const CHIPS_PREF_KEY = opts.chipsPrefKey || `${opts.historyKey || 'wise-wiseai-chat'}-cards-hidden`;
  /* The large "at a glance" cards are collapsed by DEFAULT on every surface —
     the welcome leads with the owl, headline and small intent chips, and the
     big cards are opt-in via the three-dot "Show overview cards" toggle. A host
     can force them open on first load by passing `cardsHiddenDefault: false`;
     a stored preference (from the toggle) always wins so the user's own choice
     sticks across reloads. */
  let cardsHidden = opts.cardsHiddenDefault !== false;
  try {
    const stored = localStorage.getItem(CHIPS_PREF_KEY);
    if (stored === '1') cardsHidden = true;
    else if (stored === '0') cardsHidden = false;
  } catch (_) {}
  const persistChipsHtml = persistChips
    ? `<div class="ws-chips-bar ws-chips-wrap" id="${id}-pchips-wrap" aria-label="Quick actions">
        <div class="ws-chips" id="${id}-pchips" role="list">${chipsHtml}</div>
        <button type="button" class="ws-sc-scroll ws-sc-scroll--prev" data-pchip-scroll="-1" aria-label="Scroll to previous actions" hidden><span class="material-icons">chevron_left</span></button>
        <button type="button" class="ws-sc-scroll ws-sc-scroll--next" data-pchip-scroll="1" aria-label="Scroll to see more actions"><span class="material-icons">chevron_right</span></button>
      </div>`
    : '';

  /* Optional "Go to" destinations for the three-dot menu — a host can surface
     the surrounding site's primary navigation INSIDE the chat, so every main
     destination is reachable without leaving the conversation. Each item:
       { key, label, icon }  → clicking fires opts.onMenuLink(key). */
  const menuLinks = Array.isArray(opts.menuLinks) ? opts.menuLinks.filter(Boolean) : [];
  const menuLinksLabel = opts.menuLinksLabel || 'Go to';
  const menuLinksHtml = menuLinks.length
    ? `<div class="topbar-menu-label">${esc(menuLinksLabel)}</div>` +
      menuLinks.map((m) =>
        `<button type="button" class="topbar-menu-item" data-menulink="${esc(m.key)}"><span class="material-icons topbar-menu-icon">${esc(m.icon || 'chevron_right')}</span><span>${esc(m.label || m.key)}</span></button>`
      ).join('') +
      `<div class="topbar-menu-divider"></div>`
    : '';

  rootEl.classList.add('sc-card');
  rootEl.innerHTML = `
    <div class="chat-topbar">
      ${hideBranding ? '' : `<div class="sc-topbar-lead">
        <div class="sc-bug">${OWL_BUG}</div>
        <div class="sc-topbar-titles">
          <span class="topbar-title">${esc(title)}</span>
          <button type="button" class="topbar-agents-btn" data-sc="agents" title="Choose agents">
            <span class="material-icons">smart_toy</span>
            <span class="agents-count-pill" id="${id}-count">${esc(agentCount)}</span>
            <span>agents running</span>
          </button>
        </div>
      </div>`}
      <div class="sc-topbar-controls">
        <div class="panel-more-wrap">
        <button type="button" class="panel-more-btn" id="${id}-more" aria-haspopup="menu" aria-expanded="false" aria-controls="${id}-more-pop" title="More options"><span class="material-icons">more_vert</span></button>
        <div class="topbar-popover hidden" id="${id}-more-pop" role="menu">
          ${menuLinksHtml}
          <button type="button" class="topbar-menu-item" data-sc="new"><span class="material-icons topbar-menu-icon">add_circle_outline</span><span>Start new conversation</span></button>
          <button type="button" class="topbar-menu-item" data-sc="export"><span class="material-icons topbar-menu-icon">download</span><span>Export conversation</span></button>
          <button type="button" class="topbar-menu-item" data-sc="share"><span class="material-icons topbar-menu-icon">share</span><span>Share</span></button>
          ${showTurns ? `<div class="topbar-menu-divider"></div>
          <button type="button" class="topbar-menu-item" data-sc="turns"><span class="material-icons topbar-menu-icon">alt_route</span><span>View turns</span></button>` : ''}
          ${showConnectorsPanel ? `<div class="topbar-menu-divider"></div>
          <button type="button" class="topbar-menu-item" data-sc="connect"><span class="material-icons topbar-menu-icon">hub</span><span>Connect a data source</span></button>` : ''}
          ${opts.mcpToggle === true ? `<button type="button" class="topbar-menu-item sc-mcp-item" data-sc="mcp-toggle" role="menuitemcheckbox" aria-checked="false"><span class="material-icons topbar-menu-icon">dns</span><span>MCP server</span><span class="sc-switch" aria-hidden="true"></span></button>` : ''}
          ${scorecardsHtml ? `<div class="topbar-menu-divider"></div>
          <button type="button" class="topbar-menu-item" data-sc="toggle-cards"><span class="material-icons topbar-menu-icon" id="${id}-cards-icon">visibility</span><span id="${id}-cards-label">Show overview cards</span></button>` : ''}
          <div class="topbar-menu-divider"></div>
          <button type="button" class="topbar-menu-item topbar-menu-item--danger" data-sc="close"><span class="material-icons topbar-menu-icon">close</span><span>Close conversation</span></button>
        </div>
        </div>
        <button type="button" class="panel-width-toggle-btn" id="${id}-width" aria-pressed="false" title="Width (single) — tap to widen" aria-label="WISEai™ module width"><span class="material-symbols-outlined">width_normal</span></button>
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
        ${sub ? `<p class="ws-sub">${esc(sub)}</p>` : ''}
        ${scorecardsHtml}
        ${chipsContainerHtml}
      </div>
      <div class="sc-settings sc-hidden" id="${id}-settings">${buildAgentsPanelHtml(agents, id)}</div>
    </div>

    ${persistChipsHtml}

    <div class="chat-input-rail">
      <div class="sc-input-row">
        <div class="fl-input-wrap fl-input-wrap--lead">
          <div class="fl-more-wrap">
            <button type="button" class="fl-icon-btn fl-more-btn" id="${id}-fl-more" title="Attach" aria-haspopup="menu" aria-expanded="false"><span class="material-icons">add</span></button>
            <div class="fl-more-popover fl-more-popover--left" id="${id}-fl-pop" role="menu">
              <button type="button" class="fl-more-item" data-sc="attach"><span class="material-icons">attach_file</span><span>Attach</span></button>
              <button type="button" class="fl-more-item" data-sc="camera"><span class="material-icons">photo_camera</span><span>Camera</span></button>
              <button type="button" class="fl-more-item" data-sc="voice"><span class="material-icons">mic</span><span>Voice</span></button>
            </div>
          </div>
          <input type="text" class="fl-input" id="${id}-input" placeholder="${esc(placeholder)}" autocomplete="off" />
          ${buildModelSelectorHtml(id)}
        </div>
        <button type="button" class="sc-send" id="${id}-send" title="Send"><span class="material-icons">send</span></button>
      </div>
      ${connectorsHtml}
      ${disclaimer ? `<p class="sc-disclaimer"><span class="material-icons">shield</span>${esc(disclaimer)}</p>` : ''}
    </div>`;

  const messages = rootEl.querySelector(`#${id}-messages`);
  const welcome = rootEl.querySelector(`#${id}-welcome`);
  const input = rootEl.querySelector(`#${id}-input`);
  const settings = rootEl.querySelector(`#${id}-settings`);
  const countPill = rootEl.querySelector(`#${id}-count`);
  const activeLabel = rootEl.querySelector(`#${id}-ss-active`);

  const scrollDown = () => { if (messages) messages.scrollTop = messages.scrollHeight; };

  /* Inline intent chips — an opt-in (`inlineChips: true`) block of suggested
     actions that lives IN the transcript, trailing the latest WISEai turn, just
     like a normal chat's suggested replies (NOT a docked bottom carousel). We
     keep a single element and re-park it at the end of the thread after every
     reply, and detach it while the user is typing / WISEai is thinking. */
  const inlineChips = opts.inlineChips === true;
  let ichipsEl = null;
  function parkInlineChips() {
    if (!inlineChips || !messages) return;
    if (!ichipsEl) {
      ichipsEl = document.createElement('div');
      ichipsEl.className = 'sc-inline-chips ws-chips';
      ichipsEl.setAttribute('role', 'list');
      ichipsEl.setAttribute('aria-label', 'Suggested actions');
      ichipsEl.innerHTML = chipsHtml;
    }
    messages.appendChild(ichipsEl); /* move to the very end of the thread */
    scrollDown();
  }
  function detachInlineChips() {
    if (ichipsEl && ichipsEl.parentNode) ichipsEl.parentNode.removeChild(ichipsEl);
  }

  /* Reflect the live agent roster into the topbar pill + panel header. */
  function updateAgentCount() {
    const n = onCount();
    if (countPill) countPill.textContent = String(n);
    if (activeLabel) activeLabel.textContent = String(n);
  }
  updateAgentCount();

  /* Reflect the overview-cards preference: a root class hides the large "at a
     glance" scorecards block on the welcome screen. Nothing else on the welcome
     is touched. The three-dot menu item's icon + label flip to match. */
  function syncCards() {
    rootEl.classList.toggle('sc-cards-hidden', cardsHidden);
    const ci = rootEl.querySelector(`#${id}-cards-icon`);
    const cl = rootEl.querySelector(`#${id}-cards-label`);
    if (ci) ci.textContent = cardsHidden ? 'visibility' : 'visibility_off';
    if (cl) cl.textContent = cardsHidden ? 'Show overview cards' : 'Hide overview cards';
  }

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
    detachInlineChips(); /* chips reappear after WISEai's next reply */
    messages.insertAdjacentHTML('beforeend',
      `<div class="sc-line sc-line-you"><span class="sc-avatar sc-avatar-you" role="img" aria-label="You">${userAvatar}</span><div class="sc-line-body">${esc(text)}<div class="sc-line-meta"><span class="sc-line-time">${esc(nowLabel())}</span></div></div></div>`);
    scrollDown();
    refreshDockedTurns();
  }
  /* Accuracy-feedback row appended beneath a WISEai answer: copy + thumbs up /
     thumbs down. Thumbs down reveals the reason chips (see feedbackReasons).
     Rendered with Material Symbols so the idle state reads as outlined glyphs
     and the active state fills in. */
  function feedbackRowHtml() {
    const chips = feedbackReasons.map((r) =>
      `<button type="button" class="chip sc-fb-reason" data-reason="${esc(r.reason)}">${esc(r.label)}</button>`
    ).join('');
    return `<div class="sc-fb-wrap">
        <div class="sc-fb" role="group" aria-label="Was this answer accurate?">
          <button type="button" class="sc-fb-btn" data-fb="copy" title="Copy answer" aria-label="Copy answer"><span class="material-symbols-outlined">content_copy</span></button>
          <button type="button" class="sc-fb-btn" data-fb="up" title="Accurate" aria-label="Mark accurate" aria-pressed="false"><span class="material-symbols-outlined">thumb_up</span></button>
          <button type="button" class="sc-fb-btn" data-fb="down" title="Not accurate" aria-label="Mark not accurate" aria-pressed="false"><span class="material-symbols-outlined">thumb_down</span></button>
          <button type="button" class="sc-fb-btn" data-fb="turn" title="Fork a turn from here" aria-label="Fork a turn from here"><span class="material-symbols-outlined">alt_route</span></button>
        </div>
        <div class="sc-fb-reasons" hidden>
          <span class="sc-fb-reasons-label">What wasn\u2019t right?</span>
          <div class="sc-fb-reason-chips">${chips}</div>
        </div>
        <div class="sc-fb-note" hidden></div>
      </div>`;
  }

  /* @param {string} html  WISEai's reply markup.
     @param {object} [meta] { source, feedback } — `source` overrides the
     grounding caption for a single line (pass '' to drop it); `feedback:false`
     suppresses the accuracy-feedback row (e.g. on a non-answer status card). */
  function addWISEai(html, meta = {}) {
    if (!messages) return null;
    const src = meta.source !== undefined ? meta.source : sourceLabel;
    const fb = (feedbackEnabled && meta.feedback !== false) ? feedbackRowHtml() : '';
    const footer = `<div class="sc-line-meta">${
      src ? `<span class="sc-trust-chip" title="WISEai™ cites where its answer comes from"><span class="material-icons">verified_user</span>${esc(src)}</span>` : ''
    }<span class="sc-line-time">${esc(nowLabel())}</span>${fb}</div>`;
    messages.insertAdjacentHTML('beforeend',
      `<div class="sc-line sc-line-wiseai"><span class="sc-avatar sc-avatar-wiseai" role="img" aria-label="${esc(title)}">${OWL_BUG}</span><div class="sc-line-body">${html}${footer}</div></div>`);
    const line = messages.lastElementChild; /* capture before chips re-park */
    parkInlineChips(); /* trail the latest reply with suggested actions */
    scrollDown();
    refreshDockedTurns();
    return line;
  }
  function showTyping(labelOverride) {
    if (!messages) return null;
    detachInlineChips();
    const label = labelOverride || statusLabel;
    const el = document.createElement('div');
    el.className = 'sc-line sc-line-wiseai sc-line-typing';
    el.innerHTML = `<span class="sc-avatar sc-avatar-wiseai" role="img" aria-label="${esc(title)}">${OWL_BUG}</span><div class="sc-line-body"><span class="sc-typing-status"><span class="sc-typing-spin" aria-hidden="true"></span><span class="sc-typing-label">${esc(label)}…</span></span></div>`;
    messages.appendChild(el);
    scrollDown();
    return el;
  }
  /* Advance the thinking indicator's status message through `steps` — one at a
     time, in the same line — then invoke `done()` once the last has shown. */
  function cycleStatus(el, steps, done) {
    const STEP = 620;
    const lbl = el && el.querySelector('.sc-typing-label');
    let i = 1;
    const next = () => {
      if (Array.isArray(steps) && i < steps.length) {
        if (lbl) lbl.textContent = `${steps[i]}…`;
        i += 1;
        setTimeout(next, STEP);
      } else if (typeof done === 'function') {
        done();
      }
    };
    setTimeout(next, STEP);
  }
  function wiseaiRespond(text, intent) {
    const steps = statusStepsFor(text, intent);
    const typing = showTyping(steps[0]);
    cycleStatus(typing, steps, () => { typing?.remove(); addWISEai(reply(text, intent)); });
  }
  /* Post a user line followed by a FIXED WISEai reply (bypasses the reply
     resolver) — used by controls like the brand connectors where the answer is
     the action's own confirmation, not a routed intent response. */
  function respondFixed(userText, replyHtml, meta) {
    hideWelcome();
    if (userText) addUser(userText);
    const typing = showTyping();
    setTimeout(() => { typing?.remove(); addWISEai(replyHtml, meta || { source: '' }); }, 600);
  }

  /* ── Data-source connection walkthrough ──────────────────────────────────
     Clicking a connector chip runs an animated, generic step-through right in
     the transcript (connect for new sources, a lighter re-sync for already
     connected ones), then flips the chip to its connected state. */
  function connectorChip(cid) {
    try {
      const sel = window.CSS && CSS.escape ? CSS.escape(cid) : cid;
      return rootEl.querySelector(`.sc-connector[data-connector="${sel}"]`);
    } catch (_) { return null; }
  }
  function markConnectorConnected(cid, name) {
    const c = connectors.find((x) => (x.id || x.name) === cid);
    if (c) c.connected = true;
    /* Keep the side-panel list (if built) in sync with the new state. */
    renderConnectorsList();
    const chip = connectorChip(cid);
    if (!chip) return;
    chip.classList.add('is-connected');
    chip.title = `Connected \u00b7 ${name}`;
    const tick = chip.querySelector('.sc-connector-tick');
    if (tick) tick.textContent = 'check_circle';
  }
  function connectFlowCardHtml(name, steps, headline) {
    const rows = steps.map((s, i) => `
      <li class="sc-cf-step" data-cf-step="${i}">
        <span class="sc-cf-ic"><span class="material-icons">${esc(s.icon)}</span></span>
        <span class="sc-cf-text">
          <span class="sc-cf-title">${esc(s.title)}</span>
          <span class="sc-cf-desc">${esc(s.desc.replace(/\{brand\}/g, name))}</span>
        </span>
        <span class="sc-cf-state"><span class="material-icons">radio_button_unchecked</span></span>
      </li>`).join('');
    return `<div class="sc-connect-flow" role="group" aria-label="${esc(headline)}">
        <div class="sc-cf-head"><span class="sc-cf-spin material-icons">sync</span><span class="sc-cf-head-text">${esc(headline)}</span></div>
        <ol class="sc-cf-steps">${rows}</ol>
      </div>`;
  }
  function animateConnectFlow(card, cid, name, steps, doneHead, doneReply) {
    if (!card) return;
    const rows = Array.from(card.querySelectorAll('.sc-cf-step'));
    let i = 0;
    const step = () => {
      if (i > 0) {
        const prev = rows[i - 1];
        prev.classList.remove('is-active'); prev.classList.add('is-done');
        const st = prev.querySelector('.sc-cf-state');
        if (st) st.innerHTML = '<span class="material-icons">check_circle</span>';
      }
      if (i < rows.length) {
        const cur = rows[i];
        cur.classList.add('is-active');
        const st = cur.querySelector('.sc-cf-state');
        if (st) st.innerHTML = '<span class="material-icons sc-cf-spin">sync</span>';
        i += 1;
        scrollDown();
        setTimeout(step, 950);
      } else {
        card.classList.add('is-complete');
        const head = card.querySelector('.sc-cf-head');
        if (head) head.innerHTML = `<span class="sc-cf-check material-icons">check_circle</span><span class="sc-cf-head-text">${esc(doneHead)}</span>`;
        markConnectorConnected(cid, name);
        if (doneReply) setTimeout(() => addWISEai(doneReply, { source: '' }), 560);
      }
    };
    step();
  }
  function runConnectorFlow(cid, c) {
    const name = c.name || cid;
    const connected = !!c.connected;
    const steps = connected ? CONNECTOR_REFRESH_STEPS : CONNECTOR_CONNECT_STEPS;
    const headline = connected ? `Refreshing ${name}\u2026` : `Connecting ${name}\u2026`;
    const doneHead = connected ? `${name} is up to date` : `${name} connected`;
    const doneReply = connected
      ? `<strong>${esc(name)}</strong> is up to date — its catalog is synced and ready. Ask me to search products, compare WISEscores, or cross-reference UPCs against the WISE Foods registry.`
      : `<strong>${esc(name)}</strong> is connected. I can now pull live product, pricing, availability, and nutrition data from ${esc(name)} — search its catalog, cross-reference UPCs against the WISE Foods registry, and score any item in real time. What would you like to look up first?`;
    hideWelcome();
    addUser(connected ? `Refresh ${name}` : `Connect ${name}`);
    const typing = showTyping();
    setTimeout(() => {
      typing?.remove();
      const line = addWISEai(connectFlowCardHtml(name, steps, headline), { source: '', feedback: false });
      const card = line ? line.querySelector('.sc-connect-flow') : null;
      animateConnectFlow(card, cid, name, steps, doneHead, doneReply);
    }, 600);
  }

  /* ── "Connect a data source" side panel ──────────────────────────────────
     An overlay sidebar inside the chat body — same shell + open/close animation
     as the History pane (reuses .wch-sidebar / .wch-scrim, docked on the right
     so it reads as a distinct panel) — listing every data source with its
     connect / connected state. Clicking a source runs the existing connect
     walkthrough in the transcript. Built lazily on first open. */
  let connPanel = null, connScrim = null, connList = null, connCloseTimer = null;
  function connectorRowHtml(c) {
    const cid = esc(c.id || c.name);
    const connected = !!c.connected;
    const cta = connected
      ? '<span class="wch-conn-cta"><span class="material-icons">check_circle</span>Connected</span>'
      : '<span class="wch-conn-cta"><span class="material-icons">add</span>Connect</span>';
    return `<button type="button" class="wch-conn-row${connected ? ' is-connected' : ''}" data-connector="${cid}" title="${connected ? 'Connected \u00b7 ' : 'Connect '}${esc(c.name)}">
        ${connectorLogo(c)}
        <span class="wch-conn-body"><span class="wch-conn-name">${esc(c.name)}</span><span class="wch-conn-status">${connected ? 'Connected \u00b7 catalog synced' : 'Not connected'}</span></span>
        ${cta}
      </button>`;
  }
  function renderConnectorsList() {
    if (!connList) return;
    connList.innerHTML = connectors.map(connectorRowHtml).join('');
  }
  function ensureConnectorsPanel() {
    if (connPanel || !connectors.length) return;
    const paneHost = rootEl.querySelector('.sc-body') || rootEl;
    paneHost.classList.add('wch-host');
    connScrim = document.createElement('div');
    connScrim.className = 'wch-scrim';
    connPanel = document.createElement('aside');
    connPanel.className = 'wch-sidebar wch-right';
    connPanel.setAttribute('aria-label', connectorsLabel || 'Connect a data source');
    connPanel.innerHTML =
      '<div class="wch-head">' +
        `<span class="wch-head-title"><span class="material-icons">hub</span>${esc(connectorsLabel || 'Connect a data source')}</span>` +
        '<button type="button" class="wch-close" title="Close" aria-label="Close"><span class="material-icons">close</span></button>' +
      '</div>' +
      '<p class="wch-conn-intro">Link a retailer or food-data source so WISEai\u2122 can pull verified product, pricing &amp; nutrition data.</p>' +
      '<div class="wch-list wch-conn-list" role="list"></div>';
    paneHost.appendChild(connScrim);
    paneHost.appendChild(connPanel);
    connList = connPanel.querySelector('.wch-conn-list');
    renderConnectorsList();
    connScrim.addEventListener('click', closeConnectors);
    connPanel.querySelector('.wch-close').addEventListener('click', closeConnectors);
    connPanel.addEventListener('click', (e) => {
      const row = e.target.closest('.wch-conn-row[data-connector]');
      if (!row) return;
      const cid = row.getAttribute('data-connector');
      const c = connectors.find((x) => (x.id || x.name) === cid) || {};
      closeConnectors();
      const handled = typeof opts.onConnector === 'function' ? opts.onConnector(cid, c) : false;
      if (!handled) runConnectorFlow(cid, c);
    });
  }
  function onConnKey(e) { if (e.key === 'Escape') closeConnectors(); }
  function openConnectors() {
    ensureConnectorsPanel();
    if (!connPanel) return;
    /* Never let both overlays sit open at once. */
    chatHistory?.close?.();
    dismissTurnsOverlay();
    clearTimeout(connCloseTimer);
    connPanel.classList.remove('wch-closing');
    connScrim.classList.remove('wch-closing');
    renderConnectorsList();
    connPanel.classList.add('wch-open');
    connScrim.classList.add('wch-open');
    document.addEventListener('keydown', onConnKey);
  }
  function closeConnectors() {
    if (!connPanel) return;
    if (!connPanel.classList.contains('wch-open') && !connPanel.classList.contains('wch-closing')) return;
    connPanel.classList.remove('wch-open');
    connScrim.classList.remove('wch-open');
    connPanel.classList.add('wch-closing');
    connScrim.classList.add('wch-closing');
    document.removeEventListener('keydown', onConnKey);
    clearTimeout(connCloseTimer);
    connCloseTimer = setTimeout(() => {
      connPanel.classList.remove('wch-closing');
      connScrim.classList.remove('wch-closing');
    }, 300);
  }

  /* ── Turns Module — a "Fork from here" side panel ────────────────────────
     A right-docked overlay (same shell + open/close animation as History) that
     lists every TURN in the current conversation. A turn is one exchange: the
     user's line plus the WISEai reply(s) that follow it. Each turn carries a
     "Fork from here" button — click it and the whole conversation UP TO that
     turn (answers, tables, charts, reports, references — verbatim, nothing
     re-run) is copied into a brand-new chat of your own, filed in History with
     a fork badge and a "Forked from …" banner. The original is never touched. */
  let turnsPanel = null, turnsScrim = null, turnsList = null, turnsCloseTimer = null;
  let turnsDocked = false, turnsDockBtn = null;

  /* Plain, de-noised text of a transcript line's body (drops timestamps, the
     feedback row, inline chips, icon glyphs and inline SVGs). */
  function lineText(el) {
    if (!el) return '';
    const body = el.querySelector('.sc-line-body') || el;
    const clone = body.cloneNode(true);
    clone.querySelectorAll('.sc-line-meta, .sc-fb-wrap, .sc-inline-chips, .material-icons, .material-symbols-outlined, .material-symbols-rounded, svg')
      .forEach((n) => n.remove());
    return (clone.textContent || '').replace(/\s+/g, ' ').trim();
  }

  /* Walk the live transcript and group its lines into turns. Transient nodes
     (typing indicator, inline suggested-action chips) and the fork banner are
     skipped so they never count as a turn or a message. */
  function collectTurns() {
    const turns = [];
    let cur = null;
    if (!messages) return turns;
    Array.from(messages.children).forEach((node) => {
      if (!node.classList || !node.classList.contains('sc-line')) return;
      if (node.classList.contains('sc-line-typing')) return;
      if (node.classList.contains('sc-line-you')) {
        cur = { you: node, replies: [] };
        turns.push(cur);
      } else {
        if (!cur) { cur = { you: null, replies: [] }; turns.push(cur); }
        cur.replies.push(node);
      }
    });
    return turns;
  }

  /* The artifacts a turn produced — the "food tables, distribution charts,
     reports, references" the copy calls out — surfaced as little chips so a
     turn is recognizable at a glance before you fork it. */
  function turnArtifacts(replies) {
    const scope = document.createElement('div');
    (replies || []).forEach((r) => {
      const b = r.querySelector('.sc-line-body');
      if (b) scope.appendChild(b.cloneNode(true));
    });
    const chips = [];
    const add = (icon, label) => { if (!chips.some((c) => c.label === label)) chips.push({ icon, label }); };
    /* Surface preview cards carry the "which pane" hint in their meta line
       (e.g. "Visuals · tap to open" / "Results & Details · tap to open"). */
    scope.querySelectorAll('.sc-surface-card').forEach((card) => {
      const meta = (card.querySelector('.sc-surface-meta') || {}).textContent || '';
      if (/visual/i.test(meta)) add('insights', 'Charts');
      else if (/report/i.test(meta)) add('summarize', 'Report');
      else add('view_sidebar', 'Results');
    });
    if (scope.querySelector('table, .wa-tbl')) add('table_chart', 'Table');
    if (scope.querySelector('canvas, svg')) add('insights', 'Charts');
    if (scope.querySelector('.sc-trust-chip, a[href]')) add('verified_user', 'References');
    if (scope.querySelector('img')) add('image', 'Image');
    return chips;
  }

  function turnRowHtml(turn, i) {
    const q = turn.you ? lineText(turn.you) : '';
    const a = turn.replies.length ? lineText(turn.replies[0]) : '';
    const chips = turnArtifacts(turn.replies)
      .map((c) => `<span class="wt-chip"><span class="material-icons">${esc(c.icon)}</span>${esc(c.label)}</span>`)
      .join('');
    return `<div class="wt-turn" data-turn="${i}">
        <div class="wt-turn-head">
          <span class="wt-turn-num">${i + 1}</span>
          <span class="wt-turn-q">${q ? esc(q) : `<em>${esc(title)} opened the conversation</em>`}</span>
        </div>
        ${a ? `<div class="wt-turn-a">${esc(a)}</div>` : ''}
        ${chips ? `<div class="wt-chips">${chips}</div>` : ''}
        <div class="wt-actions">
          <button type="button" class="wt-fork" data-fork="${i}"><span class="material-icons">alt_route</span>Fork from here</button>
          <button type="button" class="wt-jump" data-jump="${i}" title="Jump to this turn"><span class="material-icons">my_location</span>Jump</button>
        </div>
      </div>`;
  }

  /* Re-render the turn list only when a broken-out module is actually on screen,
     so the standalone module stays live as the conversation grows (cheap no-op
     otherwise). */
  function refreshDockedTurns() {
    if (turnsDocked && turnsPanel && !turnsPanel.classList.contains('wch-docked-hidden')) renderTurns();
  }
  function renderTurns() {
    if (!turnsList) return;
    const turns = collectTurns();
    if (!turns.length) {
      turnsList.innerHTML = '<div class="wt-empty">No turns yet.<br>Ask a question, then fork any turn from here to branch the conversation into a new chat of your own.</div>';
      return;
    }
    turnsList.innerHTML = turns.map(turnRowHtml).join('');
  }

  /* Fork the conversation at a turn: copy every line up to and including it
     (verbatim — nothing recomputed) into a new History thread with a "Forked
     from …" banner + fork badge, then load that fork as the active chat. The
     source thread is saved first, so the original stays exactly as it was. */
  function forkFromTurn(index) {
    const turns = collectTurns();
    if (index < 0 || index >= turns.length || !messages) return;
    const turn = turns[index];
    const lastNode = turn.replies.length ? turn.replies[turn.replies.length - 1] : turn.you;
    const allNodes = Array.from(messages.children);
    const endIdx = allNodes.indexOf(lastNode);
    if (endIdx < 0) return;

    const container = document.createElement('div');
    for (let k = 0; k <= endIdx; k++) {
      const n = allNodes[k];
      if (n.classList && (n.classList.contains('sc-line-typing') || n.classList.contains('sc-inline-chips') || n.classList.contains('sc-fork-banner'))) continue;
      container.appendChild(n.cloneNode(true));
    }

    const sourceTitle = (chatHistory && chatHistory.currentTitle) ? chatHistory.currentTitle() : 'this conversation';
    const banner = `<div class="sc-fork-banner" role="note"><span class="sc-fork-banner-ic material-icons">alt_route</span><span class="sc-fork-banner-txt">Forked from <strong>${esc(sourceTitle)}</strong></span></div>`;
    const forkHtml = banner + container.innerHTML;
    const count = container.querySelectorAll('.sc-line').length;

    dismissTurnsOverlay();
    if (chatHistory && chatHistory.add && chatHistory.restore) {
      /* File the fork as its own thread, then restore() it — restore() saves
         the current (source) thread first, so the original is preserved intact
         and the fork becomes the active chat. */
      const item = chatHistory.add({ title: sourceTitle, html: forkHtml, count, fork: { from: sourceTitle } });
      chatHistory.restore(item.id);
    } else if (messages) {
      messages.innerHTML = forkHtml;
      hideWelcome();
      scrollDown();
    }
    /* Keep a broken-out Turns module in sync with the freshly-loaded fork. */
    if (turnsDocked && !turnsPanel.classList.contains('wch-docked-hidden')) renderTurns();
  }

  /* Fork straight from a transcript line's own Turn control (the feedback row's
     branch icon) — resolve which turn owns the line, then reuse forkFromTurn. */
  function forkFromLine(line) {
    if (!line) return;
    const turns = collectTurns();
    for (let i = 0; i < turns.length; i++) {
      const t = turns[i];
      if (t.you === line || t.replies.indexOf(line) !== -1) { forkFromTurn(i); return; }
    }
  }

  /* Jump to a turn: close the panel and scroll its user line into view with a
     brief highlight so you can see exactly where you are. */
  function jumpToTurn(index) {
    const turns = collectTurns();
    if (index < 0 || index >= turns.length) return;
    const target = turns[index].you || (turns[index].replies[0] || null);
    if (!target) return;
    dismissTurnsOverlay();
    setTimeout(() => {
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      target.classList.add('wt-flash');
      setTimeout(() => target.classList.remove('wt-flash'), 1400);
    }, 260);
  }

  function onTurnsKey(e) { if (e.key === 'Escape') closeTurns(); }
  function ensureTurnsPanel() {
    if (turnsPanel) return;
    const paneHost = rootEl.querySelector('.sc-body') || rootEl;
    paneHost.classList.add('wch-host');
    turnsScrim = document.createElement('div');
    turnsScrim.className = 'wch-scrim';
    turnsPanel = document.createElement('aside');
    turnsPanel.className = 'wch-sidebar wch-right';
    turnsPanel.setAttribute('aria-label', 'Turns');
    turnsPanel.innerHTML =
      '<div class="wch-head">' +
        '<span class="wch-head-title"><span class="material-icons">alt_route</span>Turns</span>' +
        (turnsBreakout ? '<button type="button" class="wch-dock" title="Break out as a side module" aria-label="Break turns out as a side module"><span class="material-icons">vertical_split</span></button>' : '') +
        '<button type="button" class="wch-close" title="Close" aria-label="Close"><span class="material-icons">close</span></button>' +
      '</div>' +
      '<p class="wt-intro">Fork any turn into a brand-new chat of your own — the whole conversation up to that point is copied verbatim (nothing is re-run). The original is never touched.</p>' +
      '<div class="wt-list" role="list"></div>';
    paneHost.appendChild(turnsScrim);
    paneHost.appendChild(turnsPanel);
    turnsList = turnsPanel.querySelector('.wt-list');
    turnsScrim.addEventListener('click', closeTurns);
    turnsPanel.querySelector('.wch-close').addEventListener('click', closeTurns);
    turnsDockBtn = turnsBreakout ? turnsPanel.querySelector('.wch-dock') : null;
    if (turnsDockBtn) turnsDockBtn.addEventListener('click', () => setTurnsDocked(!turnsDocked));
    updateTurnsDockBtn();
    turnsPanel.addEventListener('click', (e) => {
      const fork = e.target.closest('[data-fork]');
      if (fork) { forkFromTurn(Number(fork.getAttribute('data-fork'))); return; }
      const jump = e.target.closest('[data-jump]');
      if (jump) { jumpToTurn(Number(jump.getAttribute('data-jump'))); return; }
    });
  }

  /* Reflect the break-out button's state: an outward "split" glyph while docked
     in the overlay, an inward "collapse" glyph once broken out (tap to merge
     back into the chat). */
  function updateTurnsDockBtn() {
    if (!turnsDockBtn) return;
    const icon = turnsDockBtn.querySelector('.material-icons');
    if (turnsDocked) {
      if (icon) icon.textContent = 'close_fullscreen';
      turnsDockBtn.title = 'Merge turns back into the chat';
      turnsDockBtn.setAttribute('aria-label', 'Merge turns back into the chat');
    } else {
      if (icon) icon.textContent = 'vertical_split';
      turnsDockBtn.title = 'Break out as a side module';
      turnsDockBtn.setAttribute('aria-label', 'Break turns out as a side module');
    }
  }

  const resolveEl = (v) => (!v ? null : (typeof v === 'string' ? document.querySelector(v) : v));

  /* Move the Turns panel between the in-chat overlay and a standalone module
     docked to the RIGHT of the chat (a real flex sibling in the modules row,
     inserted right after the chat's mount element). Mirrors the History
     breakout, mirrored to the opposite side. */
  function setTurnsDocked(on) {
    if (!turnsBreakout) return;
    ensureTurnsPanel();
    turnsDocked = !!on;
    clearTimeout(turnsCloseTimer);
    if (turnsDocked) {
      turnsPanel.classList.remove('wch-open', 'wch-closing', 'wch-docked-hidden');
      turnsScrim.classList.remove('wch-open', 'wch-closing');
      document.removeEventListener('keydown', onTurnsKey);
      const container = resolveEl(opts.turnsBreakoutContainer) || rootEl.parentElement;
      const anchor = resolveEl(opts.turnsBreakoutAnchor) || rootEl;
      if (container) {
        if (anchor && anchor.parentElement === container && anchor.nextSibling) container.insertBefore(turnsPanel, anchor.nextSibling);
        else if (anchor && anchor.parentElement === container) container.appendChild(turnsPanel);
        else container.appendChild(turnsPanel);
      }
      turnsPanel.style.flex = '0 0 ' + turnsBreakoutWidth + 'px';
      turnsPanel.style.width = turnsBreakoutWidth + 'px';
      turnsPanel.classList.add('wch-docked');
      updateTurnsDockBtn();
      renderTurns();
    } else {
      turnsPanel.classList.remove('wch-docked', 'wch-docked-hidden');
      turnsPanel.style.flex = '';
      turnsPanel.style.width = '';
      const paneHost = rootEl.querySelector('.sc-body') || rootEl;
      if (!paneHost.contains(turnsPanel)) paneHost.appendChild(turnsPanel);
      updateTurnsDockBtn();
      openTurns(); /* keep Turns visible as an overlay right after merging back */
    }
  }

  /* Close ONLY the in-chat overlay form (used by cross-panel coordination and
     the fork/jump flows). A broken-out module is a first-class sibling of the
     chat, so it's left in place. */
  function dismissTurnsOverlay() { if (turnsPanel && !turnsDocked) closeTurns(); }
  function openTurns() {
    ensureTurnsPanel();
    if (!turnsPanel) return;
    /* Broken-out module: just make sure it's shown (and refreshed) in the row. */
    if (turnsDocked) { turnsPanel.classList.remove('wch-docked-hidden'); renderTurns(); return; }
    /* Never let two overlays sit open at once. */
    chatHistory?.close?.();
    closeConnectors();
    clearTimeout(turnsCloseTimer);
    turnsPanel.classList.remove('wch-closing');
    turnsScrim.classList.remove('wch-closing');
    renderTurns();
    turnsPanel.classList.add('wch-open');
    turnsScrim.classList.add('wch-open');
    document.addEventListener('keydown', onTurnsKey);
  }
  function closeTurns() {
    if (!turnsPanel) return;
    /* Broken-out module: "close" hides the module (bring it back via the menu
       or the merge-back control) rather than running the overlay animation. */
    if (turnsDocked) { turnsPanel.classList.add('wch-docked-hidden'); return; }
    if (!turnsPanel.classList.contains('wch-open') && !turnsPanel.classList.contains('wch-closing')) return;
    turnsPanel.classList.remove('wch-open');
    turnsScrim.classList.remove('wch-open');
    turnsPanel.classList.add('wch-closing');
    turnsScrim.classList.add('wch-closing');
    document.removeEventListener('keydown', onTurnsKey);
    clearTimeout(turnsCloseTimer);
    turnsCloseTimer = setTimeout(() => {
      turnsPanel.classList.remove('wch-closing');
      turnsScrim.classList.remove('wch-closing');
    }, 300);
  }
  function toggleTurns() {
    if (turnsDocked) {
      if (turnsPanel && turnsPanel.classList.contains('wch-docked-hidden')) openTurns();
      else closeTurns();
      return;
    }
    if (turnsPanel && turnsPanel.classList.contains('wch-open')) closeTurns();
    else openTurns();
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
    wiseaiRespond(`Reviewing ${f.name}`);
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

  /* Assigned by the persistent-chip carousel wiring below; recalculates the
     rail's scroll arrows once it becomes visible (it starts display:none, so its
     scroll metrics are zero until the welcome is dismissed). */
  let refreshPersistChips = () => {};
  /* In-module history sidebar — assigned once the DOM + reset() exist below. The
     three-dot "History" toggles it; "Start new conversation" saves the current
     thread here first. */
  let chatHistory = null;
  function hideWelcome() {
    welcome?.classList.add('sc-hidden');
    if (persistChips) { rootEl.classList.add('sc-conversing'); requestAnimationFrame(refreshPersistChips); }
  }
  function reset() {
    if (messages) messages.innerHTML = '';
    closeAgents();
    welcome?.classList.remove('sc-hidden');
    if (welcome) welcome.style.display = '';
    rootEl.classList.remove('sc-conversing');
    chatHistory?.markNew();
    /* Keep a broken-out Turns module honest about the now-empty thread. */
    if (turnsDocked && turnsPanel) renderTurns();
  }
  function submit() {
    if (!input) return;
    const v = input.value.trim();
    if (!v) return;
    input.value = '';
    hideWelcome();
    addUser(v);
    wiseaiRespond(v);
  }
  /* Programmatically post a user message + WISEai reply (used by host modules
     to route a contextual question into the shared chat). */
  function ask(text) {
    const v = String(text || '').trim();
    if (!v) return;
    closeAgents();
    hideWelcome();
    addUser(v);
    wiseaiRespond(v);
  }

  /* Drive an intent turn programmatically — exactly as if the matching chip had
     been clicked. Lets a host (e.g. the marketing shell) mirror a body-content
     CTA into the chat so the two stay in sync: run onIntent for side-effects
     (open the scanner, navigate…), then post the user line + intent-routed reply
     unless the host handled it. `label` overrides the surfaced user message;
     it falls back to the current chip set's label, then the intent id. */
  function sendIntent(intent, label) {
    if (!intent) return;
    if (intent === 'choose_agents') { openAgents(); return; }
    const found = intents.find((c) => c && c.intent === intent);
    const text = (label != null ? label : (found ? found.label : '')) || String(intent);
    const handled = opts.onIntent ? opts.onIntent(intent, text) : false;
    closeAgents();
    hideWelcome();
    if (text) addUser(text);
    if (!handled && text) wiseaiRespond(text, intent);
  }

  /* Build an authentic transcript HTML string from a compact list of turns —
     [{ role:'you'|'wiseai', text?, html?, source? }] — using the exact same
     line markup addUser/addWISEai emit, so seeded history threads restore into
     the chat looking indistinguishable from real ones. */
  function seedClock(ts) {
    try { return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
    catch (_) { return ''; }
  }
  function buildSeedTranscript(turns, baseTs) {
    return (turns || []).map((t, i) => {
      const clock = seedClock(baseTs + i * 60000);
      if (t.role === 'you') {
        return `<div class="sc-line sc-line-you"><span class="sc-avatar sc-avatar-you" role="img" aria-label="You">${userAvatar}</span><div class="sc-line-body">${esc(t.text || '')}<div class="sc-line-meta"><span class="sc-line-time">${esc(clock)}</span></div></div></div>`;
      }
      const body = t.html != null ? t.html : esc(t.text || '');
      const src = t.source !== undefined ? t.source : sourceLabel;
      const fb = (feedbackEnabled && t.feedback !== false) ? feedbackRowHtml() : '';
      const footer = `<div class="sc-line-meta">${
        src ? `<span class="sc-trust-chip" title="WISEai™ cites where its answer comes from"><span class="material-icons">verified_user</span>${esc(src)}</span>` : ''
      }<span class="sc-line-time">${esc(clock)}</span>${fb}</div>`;
      return `<div class="sc-line sc-line-wiseai"><span class="sc-avatar sc-avatar-wiseai" role="img" aria-label="${esc(title)}">${OWL_BUG}</span><div class="sc-line-body">${body}${footer}</div></div>`;
    }).join('');
  }
  /* Convert opts.historySeed — [{ title, turns, daysAgo?, msAgo? }] — into the
     store items the history sidebar seeds itself with on first mount. */
  const historySeed = Array.isArray(opts.historySeed) ? opts.historySeed.filter(Boolean) : null;
  let historySeedItems = null;
  if (historySeed && historySeed.length) {
    const now = Date.now();
    historySeedItems = historySeed.map((conv, idx) => {
      const turns = Array.isArray(conv.turns) ? conv.turns : [];
      const offset = conv.msAgo != null
        ? conv.msAgo
        : conv.daysAgo != null ? conv.daysAgo * 86400000 : (idx + 1) * 3600000;
      const ts = now - offset;
      return {
        id: conv.id,
        title: conv.title || 'Conversation',
        html: buildSeedTranscript(turns, ts),
        count: turns.length,
        ts,
      };
    });
  }

  /* Mount the shared in-module history sidebar into the chat body. Threads are
     namespaced by surface (opts.historyKey) so different WISEai surfaces keep
     their own history; the default shares one dock-wide history. */
  if (window.WiseChatHistory && messages) {
    chatHistory = window.WiseChatHistory.mount(rootEl, {
      storageKey: opts.historyKey || 'wise-wiseai-chat-history',
      messagesEl: messages,
      paneHost: rootEl.querySelector('.sc-body'),
      welcomeEl: welcome,
      seed: historySeedItems,
      /* Opt-in: adds a "break out" control that pops History out of the in-chat
         overlay into a standalone module docked to the left of the chat. The
         module is inserted as a flex sibling before the chat's mount element. */
      breakout: opts.historyBreakout === true,
      breakoutWidth: opts.historyBreakoutWidth || 300,
      onNew: () => reset(),
      stripSelectors: ['.sc-inline-chips', '.sc-line-typing'],
      setHTML: (html) => {
        messages.innerHTML = html || '';
        welcome?.classList.add('sc-hidden');
        if (welcome) welcome.style.display = '';
        closeAgents();
        if (persistChips) { rootEl.classList.add('sc-conversing'); requestAnimationFrame(refreshPersistChips); }
        scrollDown();
      },
    });
  }

  /* Score cards — a clicked card starts a chat turn on its own intent, the same
     way an intent chip does (and lets the host's onIntent drive navigation). */
  welcome?.addEventListener('click', (e) => {
    const card = e.target.closest('.ws-scorecard[data-card]');
    if (!card || !scorecards) return;
    const def = scorecards.cards[Number(card.dataset.card)];
    if (!def) return;
    /* Locked cards are non-interactive "coming soon" placeholders. */
    if (def.locked || card.hasAttribute('data-locked')) return;
    /* Control cards open a panel instead of starting a chat turn. */
    if (def.intent === 'connect_source') { openConnectors(); return; }
    const label = def.ask || def.title || '';
    const handled = opts.onIntent ? opts.onIntent(def.intent, label) : false;
    hideWelcome();
    if (label) addUser(label);
    if (!handled && label) wiseaiRespond(label, def.intent);
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
    if (!handled) wiseaiRespond(def.label, def.intent);
  });

  /* Inline intent chips — same routing as the welcome chips, but the block
     lives inside the transcript (trailing the latest reply). Delegated on the
     messages area since the element is re-parked as the thread grows. */
  messages?.addEventListener('click', (e) => {
    const chip = e.target.closest('.sc-inline-chips .ws-intent-chip[data-intent]');
    if (!chip) return;
    const def = intents[Number(chip.dataset.intent)];
    if (!def) return;
    if (def.intent === 'choose_agents') { openAgents(); return; }
    const handled = opts.onIntent ? opts.onIntent(def.intent, def.label) : false;
    hideWelcome();
    addUser(def.label);
    if (!handled) wiseaiRespond(def.label, def.intent);
  });

  /* Answer-feedback interactions (copy / thumbs up / thumbs down + reasons).
     Delegated on the messages area so it covers live replies AND restored
     history transcripts alike. */
  function fbNote(wrap, text, icon) {
    const note = wrap.querySelector('.sc-fb-note');
    if (!note) return;
    if (!text) { note.hidden = true; note.innerHTML = ''; return; }
    note.innerHTML = `<span class="material-symbols-outlined">${esc(icon || 'check_circle')}</span>${esc(text)}`;
    note.hidden = false;
  }
  function copyAnswer(line, btn) {
    const body = line.querySelector('.sc-line-body');
    if (!body) return;
    const clone = body.cloneNode(true);
    clone.querySelectorAll('.sc-line-meta, .sc-fb-wrap, .sc-inline-chips').forEach((n) => n.remove());
    const text = (clone.textContent || '').replace(/\s+\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
    const done = () => {
      const ic = btn.querySelector('.material-symbols-outlined');
      btn.classList.add('is-done');
      if (ic) ic.textContent = 'check';
      setTimeout(() => { btn.classList.remove('is-done'); if (ic) ic.textContent = 'content_copy'; }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
    else done();
  }
  messages?.addEventListener('click', (e) => {
    const fbBtn = e.target.closest('.sc-fb-btn');
    if (fbBtn) {
      const wrap = fbBtn.closest('.sc-fb-wrap');
      const line = fbBtn.closest('.sc-line');
      if (!wrap || !line) return;
      const verdict = fbBtn.getAttribute('data-fb');
      if (verdict === 'copy') { copyAnswer(line, fbBtn); return; }
      if (verdict === 'turn') { forkFromLine(line); return; }
      const up = wrap.querySelector('[data-fb="up"]');
      const down = wrap.querySelector('[data-fb="down"]');
      const reasons = wrap.querySelector('.sc-fb-reasons');
      if (verdict === 'up') {
        const on = !up.classList.contains('is-on');
        up.classList.toggle('is-on', on);
        up.setAttribute('aria-pressed', on ? 'true' : 'false');
        down.classList.remove('is-on'); down.setAttribute('aria-pressed', 'false');
        if (reasons) reasons.hidden = true;
        fbNote(wrap, on ? 'Thanks — glad this was accurate.' : '', 'thumb_up');
        if (on && typeof opts.onFeedback === 'function') opts.onFeedback('up');
      } else if (verdict === 'down') {
        const on = !down.classList.contains('is-on');
        down.classList.toggle('is-on', on);
        down.setAttribute('aria-pressed', on ? 'true' : 'false');
        up.classList.remove('is-on'); up.setAttribute('aria-pressed', 'false');
        if (reasons) reasons.hidden = !on;
        fbNote(wrap, '', '');
        if (on && typeof opts.onFeedback === 'function') opts.onFeedback('down');
      }
      return;
    }
    const reason = e.target.closest('.sc-fb-reason');
    if (reason) {
      const wrap = reason.closest('.sc-fb-wrap');
      if (!wrap) return;
      reason.classList.toggle('is-on');
      const anyOn = wrap.querySelector('.sc-fb-reason.is-on');
      fbNote(wrap, anyOn ? 'Thanks — your feedback helps WISEai\u2122 improve.' : '', 'favorite');
      if (typeof opts.onFeedback === 'function') opts.onFeedback('down', reason.getAttribute('data-reason'));
    }
  });

  /* Persistent intent chips — same routing as the welcome chips, but always
     available beneath the thread so any conversational route stays one tap
     away for the whole conversation. */
  const pchipsWrap = rootEl.querySelector(`#${id}-pchips-wrap`);
  pchipsWrap?.addEventListener('click', (e) => {
    if (e.target.closest('.ws-sc-scroll')) return;
    const chip = e.target.closest('.ws-intent-chip[data-intent]');
    if (!chip) return;
    const def = intents[Number(chip.dataset.intent)];
    if (!def) return;
    if (def.intent === 'choose_agents') { openAgents(); return; }
    const handled = opts.onIntent ? opts.onIntent(def.intent, def.label) : false;
    hideWelcome();
    addUser(def.label);
    if (!handled) wiseaiRespond(def.label, def.intent);
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

  /* Persistent intent-chip rail — same horizontal scroll controls + edge fades
     as the welcome carousel. `refreshPersistChips` is exposed so hideWelcome can
     recompute the arrows the moment the rail is revealed. */
  if (persistChips && pchipsWrap) {
    const rail = pchipsWrap.querySelector('.ws-chips');
    const prev = pchipsWrap.querySelector('.ws-sc-scroll--prev');
    const next = pchipsWrap.querySelector('.ws-sc-scroll--next');
    const updateArrows = () => {
      const max = rail.scrollWidth - rail.clientWidth - 1;
      const hasPrev = rail.scrollLeft > 1;
      const hasNext = rail.scrollLeft < max && rail.scrollWidth > rail.clientWidth + 1;
      if (prev) prev.hidden = !hasPrev;
      if (next) next.hidden = !hasNext;
      pchipsWrap.classList.toggle('has-prev', hasPrev);
      pchipsWrap.classList.toggle('has-next', hasNext);
    };
    pchipsWrap.querySelectorAll('.ws-sc-scroll').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dir = Number(btn.dataset.pchipScroll) || 1;
        rail.scrollBy({ left: dir * Math.max(rail.clientWidth * 0.8, 200), behavior: 'smooth' });
      });
    });
    rail.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    refreshPersistChips = updateArrows;
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

  /* "Go to" destinations (opts.menuLinks) — hand the clicked key back to the
     host so it can route however it likes (e.g. a client-side router), then
     close the popover. */
  morePop?.addEventListener('click', (e) => {
    const link = e.target.closest('[data-menulink]');
    if (!link) return;
    closeMore();
    if (typeof opts.onMenuLink === 'function') opts.onMenuLink(link.getAttribute('data-menulink'));
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

  /* Input attach ("+") popover — floated to the far left of the input. */
  const flMoreBtn = rootEl.querySelector(`#${id}-fl-more`);
  const flPop = rootEl.querySelector(`#${id}-fl-pop`);
  const flModelBtn = rootEl.querySelector(`#${id}-fl-model`);
  const flModelPop = rootEl.querySelector(`#${id}-fl-model-pop`);
  flMoreBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    flModelPop?.classList.remove('open');
    const open = flPop.classList.toggle('open');
    flMoreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  /* Model selector ("tune") popover — floated to the far right, where the old
     three-dot lived. Single-select: choosing a model deactivates the others. */
  flModelBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    flPop?.classList.remove('open');
    const open = flModelPop.classList.toggle('open');
    flModelBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  flModelPop?.addEventListener('click', (e) => {
    const it = e.target.closest('.fl-model-item');
    if (!it) return;
    flModelPop.querySelectorAll('.fl-model-item').forEach((el) => {
      el.classList.remove('is-active');
      el.setAttribute('aria-checked', 'false');
    });
    it.classList.add('is-active');
    it.setAttribute('aria-checked', 'true');
    flModelPop.classList.remove('open');
    flModelBtn?.setAttribute('aria-expanded', 'false');
    if (typeof opts.onModelChange === 'function') opts.onModelChange(it.dataset.model);
  });

  /* Brand connectors — clicking a source hands its id to the host (which can
     open a real OAuth/connect flow), then, unless handled, posts a connect turn
     into the chat so the action always has a visible result in the thread. */
  const connectorsEl = rootEl.querySelector(`#${id}-connectors`);
  connectorsEl?.addEventListener('click', (e) => {
    const btn = e.target.closest('.sc-connector[data-connector]');
    if (btn) {
      const cid = btn.getAttribute('data-connector');
      const c = connectors.find((x) => (x.id || x.name) === cid) || {};
      const handled = typeof opts.onConnector === 'function' ? opts.onConnector(cid, c) : false;
      if (handled) return;
      /* Walk the user through connecting (or re-syncing) the source. */
      runConnectorFlow(cid, c);
      return;
    }
    if (e.target.closest('.sc-connector-more')) {
      if (typeof opts.onConnectorMore === 'function') { opts.onConnectorMore(); return; }
      respondFixed('Show me all available connectors', 'WISEai™ can connect to retailer and food-data platforms — Kroger, Instacart, Walmart, USDA FoodData Central, Open Food Facts, NielsenIQ and more. Pick one from the rail beneath the input to start a secure connection, or tell me which source you’d like to link.');
    }
  });

  /* Connector rail — horizontal scroll with a fading right edge that hints at
     more sources when the row overflows. */
  const connectorsRail = rootEl.querySelector(`#${id}-connectors-rail`);
  if (connectorsEl && connectorsRail) {
    const updateFade = () => {
      const max = connectorsRail.scrollWidth - connectorsRail.clientWidth - 1;
      connectorsEl.classList.toggle('has-more', connectorsRail.scrollLeft < max && connectorsRail.scrollWidth > connectorsRail.clientWidth + 1);
      connectorsEl.classList.toggle('has-prev', connectorsRail.scrollLeft > 1);
    };
    connectorsRail.addEventListener('scroll', updateFade, { passive: true });
    window.addEventListener('resize', updateFade);
    requestAnimationFrame(updateFade);
  }

  /* Menu + chip actions */
  rootEl.addEventListener('click', (e) => {
    const item = e.target.closest('[data-sc]');
    if (!item) return;
    const action = item.dataset.sc;
    if (action === 'add-member') {
      closeMore();
      if (typeof opts.onAddMember === 'function') opts.onAddMember();
      else addWISEai('Team collaboration is coming to this workspace — you’ll be able to invite teammates straight into this WISEai™ conversation.');
    }
    else if (action === 'history') {
      closeMore();
      closeConnectors(); /* keep only one overlay open at a time */
      dismissTurnsOverlay();
      if (chatHistory) chatHistory.toggle();
      else if (typeof opts.onHistory === 'function') opts.onHistory();
      else addWISEai('History &amp; Projects lets you jump back into past WISEai™ conversations. It’s coming to this workspace soon.');
    }
    else if (action === 'connect') {
      closeMore();
      openConnectors();
    }
    else if (action === 'turns') {
      closeMore();
      toggleTurns();
    }
    else if (action === 'mcp-toggle') {
      /* Visual-only toggle for now — flips the switch + a11y state, no wiring. */
      const on = !item.classList.contains('is-on');
      item.classList.toggle('is-on', on);
      item.setAttribute('aria-checked', on ? 'true' : 'false');
    }
    else if (action === 'toggle-cards') {
      closeMore();
      cardsHidden = !cardsHidden;
      try { localStorage.setItem(CHIPS_PREF_KEY, cardsHidden ? '1' : '0'); } catch (_) {}
      syncCards();
    }
    else if (action === 'new') {
      closeMore();
      /* Save the current thread into history, then start a clean conversation. */
      if (chatHistory) chatHistory.startNew();
      else reset();
    }
    else if (action === 'agents') {
      closeMore();
      openAgents();
      if (opts.onIntent) opts.onIntent('choose_agents', 'Choose Agents');
    } else if (action === 'agents-close') {
      closeAgents();
    } else if (action === 'export') {
      closeMore();
      const blob = new Blob(['WISEai™ export placeholder\n'], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'wiseai-chat.txt';
      a.click();
    } else if (action === 'share') {
      closeMore();
      const url = window.location.href;
      if (navigator.share) navigator.share({ title: esc(title), url }).catch(() => {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
    } else if (action === 'close') {
      closeMore();
      /* "Close conversation" wipes the thread and restarts the chat from scratch —
         back to the fresh welcome screen, not a navigation away. */
      reset();
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
      flMoreBtn?.setAttribute('aria-expanded', 'false');
    }
    if (flModelPop?.classList.contains('open') && !flModelPop.contains(e.target) && !flModelBtn?.contains(e.target)) {
      flModelPop.classList.remove('open');
      flModelBtn?.setAttribute('aria-expanded', 'false');
    }
  });

  /* Swap the intent chips (and optionally extend the intent→reply map) live,
     without remounting — used by a persistent host to re-skin its quick actions
     for the current context. Re-renders every chip surface in place (the welcome
     grid, the persistent rail, and the inline suggested-actions block). */
  function setIntents(newIntents, newReplies) {
    if (Array.isArray(newIntents)) intents = newIntents.slice();
    if (newReplies && typeof newReplies === 'object') {
      intentReplies = Object.assign({}, intentReplies || {}, newReplies);
    }
    chipsHtml = buildChipsHtml();
    const wc = rootEl.querySelector(`#${id}-chips`);
    if (wc) wc.innerHTML = chipsHtml;
    const pc = rootEl.querySelector(`#${id}-pchips`);
    if (pc) pc.innerHTML = chipsHtml;
    if (ichipsEl) ichipsEl.innerHTML = chipsHtml;
  }

  /* Announce a context switch WITHOUT resetting the conversation: swap in the
     new context's chips, then — only when a conversation is already underway —
     drop a short WISEai acknowledgement so the user sees the assistant noticed
     the page changed. The freshly-swapped inline chips re-park beneath it, so
     the new page's quick actions are offered right away. On the welcome screen
     (no conversation yet) the chips speak for themselves and no line is added. */
  function announceRoute(message, newIntents, newReplies) {
    setIntents(newIntents, newReplies);
    const conversing = welcome ? welcome.classList.contains('sc-hidden') : true;
    if (conversing && message) addWISEai(message, { source: '' });
  }

  /* Apply the remembered overview-cards preference now the DOM exists. */
  syncCards();

  return { addUser, addWISEai, ask, sendIntent, reset, openAgents, closeAgents, openConnectors, closeConnectors, openTurns, closeTurns, toggleTurns, setTurnsDocked, isTurnsDocked: () => turnsDocked, hideWelcome, setIntents, announceRoute, root: rootEl };
}
