/**
 * WISEcodeAI Chat Module — the ONE shared chat surface for WISE.
 *
 * A framework-free, mountable extraction of the chat module in
 * pages/ai-chat.html so the exact same component (WISE-owl welcome screen,
 * intent chips, plain message lines, floating-label input rail) can be
 * dropped into any page instead of bespoke one-off chats.
 *
 *   import { mountWISEcodeAIChat } from './wiseai-chat.js';
 *   mountWISEcodeAIChat(document.getElementById('host'), { ... });
 *
 * Requires the design tokens from agent-page.css and the styles in
 * wiseai-chat.css to be loaded on the host page.
 */

/* Side-effect import: registers window.WiseChatHistory (the shared in-module
   history sidebar) so every mounted WISEcodeAI surface gets the same history +
   "start new conversation" behaviour. */
import './chat-history.js';

/* Shared user-avatar store — the "you" bubbles render the member's uploaded
   profile picture (set on the Organization Profile page) when present, and fall
   back to their initials otherwise. */
import { userAvatarImg } from './user-avatar.js';

/* Activity strip — the thin landmark rail pinned to the chat's edge. Mounted
   from here so EVERY page that uses this shared chat gets it (styles are
   injected by the strip module itself); toggled from the three-dot menu. */
import {
  isActivityStripOn,
  applyActivityStrip,
  restoreActivityStrip,
  mountActivityStrip,
} from './chat-activity-strip.js';

/* WISE-owl "bug" used in the topbar (inherits currentColor). Exported so the
   WISEcodeAI dock can reuse the exact same mark for its collapsed floating circle. */
export const OWL_BUG = `<svg viewBox="0 0 193 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M10.9834 35.6522C10.9834 35.6522 3.30615 47.7494 3.30615 58.0481C3.30615 81.1921 20.324 99.6409 43.3405 99.9915C51.5363 100.052 60.4175 99.9915 67.533 92.6894C41.5052 92.6894 25.589 73.777 25.589 58.0481C25.589 58.0481 25.2144 45.6894 30.832 35.9526L10.9834 35.6522Z"/><path d="M83.8241 14.7368C90.9396 14.7368 94.8008 22.7337 96.3699 29.2111H96.5571C98.1262 22.7337 101.987 14.7368 109.103 14.7368H170.521C175.169 14.7368 175.169 12.8643 175.169 7.32269C175.169 2.80876 178.108 0 182.131 0H189.384V14.7368C189.384 27.7131 182.131 28.5339 174.794 28.5339L160.347 28.583H118.091C113.597 28.583 113.335 29.2111 111.537 33.7051C110.051 37.4206 96.5571 73.0277 96.5571 73.0277H96.3699C96.3699 73.0277 82.8761 37.4206 81.3899 33.7051C79.5923 29.2111 79.3301 28.583 74.8361 28.583H32.5803L18.133 28.5339C10.7965 28.5339 3.54341 27.7131 3.54341 14.7368V0H10.7965C14.5415 0 17.7585 3.37051 17.7585 7.32269C17.7585 12.8643 17.7585 14.7368 22.406 14.7368H83.8241Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M71.8001 35.9523C74.4284 35.9523 74.6161 37.2826 75.1793 38.6953L87.9434 71.5913C82.9358 80.6013 74.4289 85.7609 63.9558 85.7609C48.1132 85.7608 33.2662 72.7999 33.2663 54.6695C33.2664 48.2288 34.5088 40.1469 39.2583 35.9523H71.8001ZM63.486 44.5345C58.3905 44.5345 54.2598 48.6005 54.2598 54.0781C54.2598 59.5557 58.3905 63.6217 63.486 63.6217C68.5814 63.6216 72.7122 59.5556 72.7122 54.0781C72.7122 48.6005 68.5814 44.5346 63.486 44.5345Z"/><path d="M181.756 35.6522C181.756 35.6522 189.433 47.7494 189.433 58.0481C189.433 81.1921 172.416 99.6409 149.399 99.9915C141.203 100.052 132.322 99.9915 125.206 92.6894C151.234 92.6894 167.151 73.777 167.151 58.0481C167.151 58.0481 167.525 45.6894 161.908 35.9526L181.756 35.6522Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M120.94 35.9523C118.311 35.9523 118.124 37.2826 117.56 38.6953L104.796 71.5913C109.804 80.6013 118.311 85.7609 128.784 85.7609C144.626 85.7608 159.473 72.7999 159.473 54.6695C159.473 48.2288 158.231 40.1469 153.481 35.9523H120.94ZM129.254 44.5345C134.349 44.5345 138.48 48.6005 138.48 54.0781C138.48 59.5557 134.349 63.6217 129.254 63.6217C124.158 63.6216 120.027 59.5556 120.027 54.0781C120.027 48.6005 124.158 44.5346 129.254 44.5345Z"/></svg>`;

/* WISE-owl mark used inside the welcome circle (white on primary). Exported so
   the marketing galaxy can reuse the exact same pulsating owl for its core. */
export const OWL_MARK = `<svg viewBox="0 0 193 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.9834 35.6522C10.9834 35.6522 3.30615 47.7494 3.30615 58.0481C3.30615 81.1921 20.324 99.6409 43.3405 99.9915C51.5363 100.052 60.4175 99.9915 67.533 92.6894C41.5052 92.6894 25.589 73.777 25.589 58.0481C25.589 58.0481 25.2144 45.6894 30.832 35.9526L10.9834 35.6522Z" fill="white"/><path d="M83.8241 14.7368C90.9396 14.7368 94.8008 22.7337 96.3699 29.2111H96.5571C98.1262 22.7337 101.987 14.7368 109.103 14.7368H170.521C175.169 14.7368 175.169 12.8643 175.169 7.32269C175.169 2.80876 178.108 0 182.131 0H189.384V14.7368C189.384 27.7131 182.131 28.5339 174.794 28.5339L160.347 28.583H118.091C113.597 28.583 113.335 29.2111 111.537 33.7051C110.051 37.4206 96.5571 73.0277 96.5571 73.0277H96.3699C96.3699 73.0277 82.8761 37.4206 81.3899 33.7051C79.5923 29.2111 79.3301 28.583 74.8361 28.583H32.5803L18.133 28.5339C10.7965 28.5339 3.54341 27.7131 3.54341 14.7368V0H10.7965C14.5415 0 17.7585 3.37051 17.7585 7.32269C17.7585 12.8643 17.7585 14.7368 22.406 14.7368H83.8241Z" fill="white"/><path fill-rule="evenodd" clip-rule="evenodd" d="M71.8001 35.9523C74.4284 35.9523 74.6161 37.2826 75.1793 38.6953L87.9434 71.5913C82.9358 80.6013 74.4289 85.7609 63.9558 85.7609C48.1132 85.7608 33.2662 72.7999 33.2663 54.6695C33.2664 48.2288 34.5088 40.1469 39.2583 35.9523H71.8001ZM63.486 44.5345C58.3905 44.5345 54.2598 48.6005 54.2598 54.0781C54.2598 59.5557 58.3905 63.6217 63.486 63.6217C68.5814 63.6216 72.7122 59.5556 72.7122 54.0781C72.7122 48.6005 68.5814 44.5346 63.486 44.5345Z" fill="white"/><path d="M181.756 35.6522C181.756 35.6522 189.433 47.7494 189.433 58.0481C189.433 81.1921 172.416 99.6409 149.399 99.9915C141.203 100.052 132.322 99.9915 125.206 92.6894C151.234 92.6894 167.151 73.777 167.151 58.0481C167.151 58.0481 167.525 45.6894 161.908 35.9526L181.756 35.6522Z" fill="white"/><path fill-rule="evenodd" clip-rule="evenodd" d="M120.94 35.9523C118.311 35.9523 118.124 37.2826 117.56 38.6953L104.796 71.5913C109.804 80.6013 118.311 85.7609 128.784 85.7609C144.626 85.7608 159.473 72.7999 159.473 54.6695C159.473 48.2288 158.231 40.1469 153.481 35.9523H120.94ZM129.254 44.5345C134.349 44.5345 138.48 48.6005 138.48 54.0781C138.48 59.5557 134.349 63.6217 129.254 63.6217C124.158 63.6216 120.027 59.5556 120.027 54.0781C120.027 48.6005 124.158 44.5346 129.254 44.5345Z" fill="white"/></svg>`;

const DEFAULT_INTENTS = [
  { intent: 'customer_profile', label: 'Start New Verification', icon: 'add' },
  { intent: 'resume_prompt', label: 'Continue Existing', icon: 'play_circle' },
  { intent: 'faq_intro', label: 'Ask a Question', icon: 'help_outline' },
  { intent: 'choose_agents', label: 'Choose Agents', icon: 'smart_toy' },
  { intent: 'registry_home', label: 'WISE Foods', icon: 'restaurant_menu' },
  { intent: 'add_food_intro', label: 'Add a New Food', icon: 'add' },
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
   the roster in pages/ai-chat.html so the shared WISEcodeAI surface exposes the
   same agents everywhere it's mounted. Callers can override via opts.agents.
   `group` buckets a row under "Core" or "Specialist"; `required` agents
   (WISEcodeAI) can't be switched off. */
const DEFAULT_AGENTS = [
  {
    id: 'wise', name: 'WISEcodeAI™', version: 'v3.2', group: 'core',
    icon: 'verified', color: 'var(--primary-ink, var(--primary))', bg: '',
    tagline: 'Verification Orchestrator',
    desc: 'The core WISEcodeAI™ agent that orchestrates your entire verification workflow — from customer profiling through UPC analysis, attestation, and badge issuance. Cannot be disabled.',
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
    icon: 'shield', color: 'var(--primary-ink, var(--primary))', bg: '',
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
  { icon: 'lock_open',   title: 'Authorize access',    desc: 'Open {brand}\u2019s secure sign-in and grant WISEcodeAI read-only access.' },
  { icon: 'tune',        title: 'Choose data scope',   desc: 'Share product catalog, pricing, availability & nutrition fields.' },
  { icon: 'hub',         title: 'Match to WISE Foods', desc: 'Cross-reference {brand} UPCs against the verified WISE Foods registry.' },
  { icon: 'inventory_2', title: 'Sync catalog',        desc: 'Import verified products so WISEcodeAI can score them in real time.' },
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

/* Split a label into per-letter spans so CSS can run a staggered, text-clipped
   gold shimmer across it (used by the "What can I ask?" link). Spaces stay as
   plain text; each glyph carries its index for the animation-delay stagger. */
function shimmerLetters(label) {
  return String(label).split('').map((ch, i) =>
    ch === ' ' ? ' ' : `<span class="sc-ask-ch" style="--ch-i:${i}">${esc(ch)}</span>`
  ).join('');
}

/* Animate a "live" food-count read-out: ease up from zero to the seeded total,
   then keep ticking upward forever by small random amounts (mostly single
   digits, with the odd larger jump) so the corpus feels like it is still
   growing. Honors prefers-reduced-motion by snapping straight to the total. */
function startFoodCounter(el) {
  const final = parseInt(el.getAttribute('data-final'), 10) || 0;
  if (!final) return;
  const fmt = (n) => n.toLocaleString('en-US');
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { el.textContent = fmt(final); return; }

  const dur = 1900;
  const t0 = performance.now();
  let current = 0;

  const drift = () => {
    const roll = Math.random();
    /* Mostly single-digit ticks, occasionally a bigger burst. */
    const inc = roll < 0.72 ? 1 + Math.floor(Math.random() * 9)
              : roll < 0.94 ? 10 + Math.floor(Math.random() * 40)
              :               60 + Math.floor(Math.random() * 180);
    current += inc;
    el.textContent = fmt(current);
    setTimeout(drift, 350 + Math.random() * 1200);
  };

  const rampUp = (now) => {
    const p = Math.min((now - t0) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    current = Math.floor(eased * final);
    el.textContent = fmt(current);
    if (p < 1) {
      requestAnimationFrame(rampUp);
    } else {
      current = final;
      el.textContent = fmt(current);
      setTimeout(drift, 700);
    }
  };
  requestAnimationFrame(rampUp);
}

/* Short, human-scannable turn ID (e.g. "6d7a") — alternating digit/letter so
   every answer carries a stable-looking handle the way the design mock shows
   (#6d7a). Purely cosmetic in this demo surface. */
function makeTurnId() {
  const d = () => String(Math.floor(Math.random() * 10));
  const l = () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  return d() + l() + d() + l();
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

/* Standing reminder under the input that WISEcodeAI is an assistant, not the
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

/* Thumbs-up "what was accurate?" intents — the positive mirror of the reason
   chips shown when a user marks an answer accurate. Hosts can override via
   opts.accurateReasons. */
const DEFAULT_ACCURATE_REASONS = [
  { reason: 'trustworthy', label: 'Trustworthy sources' },
  { reason: 'clear', label: 'Clear & easy' },
  { reason: 'thorough', label: 'Thorough' },
  { reason: 'right-food', label: 'Right food' },
  { reason: 'actionable', label: 'Actionable' },
  { reason: 'other-good', label: 'Something else' },
];

/* Database / environment roster shown in the in-input selector (the button on
   the right edge of the input). Databases are grouped by category; each group
   carries an access mode (read-only / read/write). Exactly one database is
   active at a time. `badge` is the short tag rendered on the left of each row. */
export const WISEAI_DBS = [
  {
    label: 'Postgres databases', access: 'read-only', badge: 'LIVE',
    items: [
      { id: 'pg-alpha-live', name: 'Postgres (ALPHA)', desc: "This deployment's live database" },
      { id: 'pg-dev', name: 'Postgres (DEV)', desc: 'Named live environment', default: true },
      { id: 'pg-uat', name: 'Postgres (UAT)', desc: 'Named live environment' },
      { id: 'pg-prd', name: 'Postgres (PRD)', desc: 'Named live environment' },
      { id: 'pg-alpha', name: 'Postgres (ALPHA)', desc: 'Named live environment' },
    ],
  },
  {
    label: 'Org databases', access: 'read/write', badge: 'ORG',
    items: [
      { id: 'org-default', name: 'Org default', desc: "Follows the org's default snapshot re-points" },
      { id: 'org-jul29', name: 'ALPHA snapshot \u2014 2026-Jul-29', desc: 'as of 2026-Jul-29 \u00b7 #4391 \u00b7 current default' },
      { id: 'org-aug04', name: 'ALPHA snapshot \u2014 2026-Aug-04', desc: 'as of 2026-Aug-04 \u00b7 #1485' },
    ],
  },
  {
    label: 'Personal sandboxes', access: 'read/write', badge: 'ORG',
    items: [], empty: 'None available',
  },
  {
    label: 'Global', access: 'read-only', badge: 'GLB',
    items: [
      { id: 'glb-current', name: 'Current global', desc: 'Follows a global promote' },
      { id: 'glb-aug04', name: 'ALPHA snapshot \u2014 2026-Aug-04', desc: 'as of 2026-Aug-04 \u00b7 #4f6f' },
      { id: 'glb-jul31', name: 'ALPHA snapshot \u2014 2026-Jul-31', desc: 'as of 2026-Jul-31 \u00b7 #0306' },
      { id: 'glb-jul28-494f', name: 'ALPHA snapshot \u2014 2026-Jul-28', desc: 'as of 2026-Jul-28 \u00b7 #494f' },
      { id: 'glb-jul28-bcc9', name: 'ALPHA snapshot \u2014 2026-Jul-28', desc: 'as of 2026-Jul-28 \u00b7 #bcc9' },
      { id: 'glb-jul28-1717', name: 'ALPHA snapshot \u2014 2026-Jul-28', desc: 'as of 2026-Jul-28 \u00b7 #1717' },
      { id: 'glb-jul28-1e8c', name: 'ALPHA snapshot \u2014 2026-Jul-28', desc: 'as of 2026-Jul-28 \u00b7 #1e8c' },
      { id: 'glb-jul28-27eb', name: 'ALPHA snapshot \u2014 2026-Jul-28', desc: 'as of 2026-Jul-28 \u00b7 #27eb' },
    ],
  },
];

/* Access mode → short filter key, so the top-of-popover filter chips can hide
   whole groups by whether they're read-only or read/write. */
function dbAccessKey(access) { return access === 'read/write' ? 'rw' : 'ro'; }

/* Flat lookup helpers for the active database — used to render the in-input
   label and to name both ends of a mid-conversation switch in the transcript. */
function allDbItems() { return WISEAI_DBS.flatMap((g) => g.items.map((it) => ({ ...it, group: g }))); }
function defaultDbItem() { const all = allDbItems(); return all.find((it) => it.default) || all[0] || null; }
function dbItemById(dbId) { return allDbItems().find((it) => it.id === dbId) || null; }

/* Grouped, single-select database rows. Row layout is name/desc → access badge
   → a prominent selected-tick, both floated to the FAR RIGHT (the tick is the
   right-most element). Shared so the popover and docked module render identically. */
function buildDbGroupsHtml() {
  return WISEAI_DBS.map((g) => {
    const ak = dbAccessKey(g.access);
    const rows = g.items.length
      ? g.items.map((it) => {
          const on = it.default === true;
          const search = esc(`${it.name} ${it.desc || ''} ${g.label}`.toLowerCase());
          return `<button type="button" class="fl-db-item${on ? ' is-active' : ''}" role="menuitemradio" aria-checked="${on ? 'true' : 'false'}" data-db="${esc(it.id)}" data-search="${search}">`
            + `<span class="fl-db-meta"><span class="fl-db-name">${esc(it.name)}</span>${it.desc ? `<span class="fl-db-desc">${esc(it.desc)}</span>` : ''}</span>`
            + `<span class="fl-db-badge">${esc(g.badge)}</span>`
            + `<span class="fl-db-check material-symbols-outlined" aria-hidden="true">check</span></button>`;
        }).join('')
      : `<div class="fl-db-groupempty">${esc(g.empty || 'None available')}</div>`;
    return `<div class="fl-db-group" data-access="${ak}">
              <div class="fl-db-grouphead">
                <span class="fl-db-grouptitle">${esc(g.label)}</span>
                <span class="fl-db-access fl-db-access--${ak}">${esc(g.access)}</span>
              </div>
              ${rows}
            </div>`;
  }).join('');
}

/* Sticky search + access-filter chips shown at the top of the roster (both in the
   popover and in the docked module). */
function dbControlsHtml() {
  return `<label class="fl-db-search">
                  <span class="material-symbols-outlined" aria-hidden="true">search</span>
                  <input type="text" class="fl-db-search-input" placeholder="Search databases\u2026" aria-label="Search databases" autocomplete="off">
                </label>
                <div class="fl-db-filters" role="group" aria-label="Filter by access">
                  <button type="button" class="fl-db-chip is-active" data-filter="all">All</button>
                  <button type="button" class="fl-db-chip" data-filter="ro">Read-only</button>
                  <button type="button" class="fl-db-chip" data-filter="rw">Read/write</button>
                </div>`;
}

/* The searchable, filterable, grouped roster body — reused verbatim inside the
   popover and inside the docked "sticky module" so both stay in lockstep. */
function dbRosterHtml() {
  return `<div class="fl-db-scroll">
                ${buildDbGroupsHtml()}
                <div class="fl-db-noresults" hidden>No databases match your search.</div>
              </div>`;
}

/* Build the database selector — a quiet dropdown-style label (active database
   name + caret) that sits just right of the "+" and directly above the input,
   opening a searchable, filterable, grouped single-select popover. Kept as a
   shared helper so every chat surface renders an identical control. A dock icon
   at the top of the popover breaks it out into a sticky side module. */
function buildModelSelectorHtml(id) {
  const def = defaultDbItem();
  const label = def ? def.name : 'Select database';
  return `<div class="fl-model-wrap fl-model-wrap--lead">
            <button type="button" class="fl-db-trigger fl-model-btn" id="${id}-fl-model" title="Active database — click to switch" aria-haspopup="menu" aria-expanded="false">
              <span class="fl-db-trigger-label" id="${id}-fl-db-label">${esc(label)}</span>
              <span class="material-symbols-outlined fl-db-trigger-caret" aria-hidden="true">expand_more</span>
            </button>
            <div class="fl-model-popover fl-db-popover fl-db-popover--lead" id="${id}-fl-model-pop" role="menu">
              <div class="fl-db-top">
                <div class="fl-db-pop-head">
                  <span class="fl-db-pop-title">Databases</span>
                  <button type="button" class="fl-db-dock-btn" title="Dock as a sticky module" aria-label="Dock the database selector as a sticky module"><span class="material-symbols-outlined">dock_to_right</span></button>
                </div>
                ${dbControlsHtml()}
              </div>
              ${dbRosterHtml()}
            </div>
          </div>`;
}

/* ── Standalone composer (shared by the bespoke page chats) ─────────────────
   The canonical WISEcodeAI chat above renders its input rail (the stacked composer:
   "+" attach on the left, the database selector + attachments row on top, the
   text input beneath) inside mountWISEcodeAIChat. A handful of pages run their OWN
   chat (reformulation, the add/view-product wizard, guiding-stars, the product
   comparison / portfolio rails) and hand-roll their input. These helpers let
   those pages render + wire the EXACT same composer so the input section looks
   and behaves identically everywhere.

   Markup builder — same structure/classes as the canonical rail, minus the
   dock-to-module control (which depends on the surrounding modules row). Query
   by class rather than id so a page can mount several without id collisions. */
export function composerDbSelectorHtml() {
  const def = defaultDbItem();
  const label = def ? def.name : 'Select database';
  return `<div class="fl-model-wrap fl-model-wrap--lead">
            <button type="button" class="fl-db-trigger fl-model-btn" title="Active database — click to switch" aria-haspopup="menu" aria-expanded="false">
              <span class="fl-db-trigger-label">${esc(label)}</span>
              <span class="material-symbols-outlined fl-db-trigger-caret" aria-hidden="true">expand_more</span>
            </button>
            <div class="fl-model-popover fl-db-popover fl-db-popover--lead" role="menu">
              <div class="fl-db-top">
                <div class="fl-db-pop-head">
                  <span class="fl-db-pop-title">Databases</span>
                </div>
                ${dbControlsHtml()}
              </div>
              ${dbRosterHtml()}
            </div>
          </div>`;
}

/* ── Auto-growing text field ─────────────────────────────────────────────────
   The composer's text field is a 1-row <textarea>. In the classic design it
   behaves exactly like the old single-line <input> (wrap="off" — long text
   scrolls horizontally, height never changes). With the admin "New chat input"
   design (html.composer-v2) it soft-wraps and grows upward as you type — the
   "+" attach, database selector and send button hold the bottom line while the
   text stacks above them (the rail is bottom-anchored, so the pill grows up).
   Wired by both the canonical mount and wireChatComposer; idempotent. */
export function wireComposerGrow(input) {
  if (!input || input.tagName !== 'TEXTAREA' || input.dataset.growWired === '1') return;
  input.dataset.growWired = '1';
  const sync = () => {
    if (document.documentElement.classList.contains('composer-v2')) {
      input.wrap = 'soft';
      input.style.height = 'auto';
      input.style.height = input.scrollHeight + 'px';
    } else {
      input.wrap = 'off';
      input.style.height = '';
    }
  };
  input.addEventListener('input', sync);
  /* Programmatic fills (e.g. a re-run dropping a prompt into the composer)
     don't fire 'input' — catch up as soon as the user lands in the field. */
  input.addEventListener('focus', sync);
  /* Sends clear the field programmatically (no 'input' event fires), which
     would leave the pill stuck at its grown height — re-sync right after the
     click / Enter handlers have run. */
  const later = () => setTimeout(sync, 0);
  input.closest('.fl-input-wrap')?.querySelector('.sc-send')?.addEventListener('click', later);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') later(); });
  /* Flipping the Appearance toggle re-flows every mounted composer live. */
  document.addEventListener('wise:composer-v2', sync);
  /* Re-measure whenever the field's WIDTH changes (module width toggle, panel
     resize, crossing the narrow-composer container breakpoint): line wrapping
     and the state's paddings change with width, so a height measured at the
     old width goes stale and leaves the placeholder sitting off-center. Only
     react to width — sync() itself changes the height, and re-syncing on that
     would loop the observer. */
  if (typeof ResizeObserver !== 'undefined') {
    let lastW = input.offsetWidth;
    const ro = new ResizeObserver(() => {
      const w = input.offsetWidth;
      if (w !== lastW) { lastW = w; sync(); }
    });
    ro.observe(input);
  }
  sync();
}

/* Wire a hand-rolled input rail so its database selector + "+" attach popover
   behave exactly like the canonical composer. Idempotent per rail.

   Expects the standard stacked markup inside `railEl`:
     .fl-input-wrap.fl-input-wrap--stacked
       .fl-more-wrap  (optional — "+" attach popover)
       .fl-input-col
         .fl-model-row   ← the DB selector is injected here (before any
                           .fl-attachments) if it isn't already present
         .fl-input-line > textarea.fl-input

   opts.onDbChange(dbId, dbItem) — notified whenever the active database changes.
   Returns { getDbId } so callers can read the current selection. */
export function wireChatComposer(railEl, opts = {}) {
  if (!railEl || railEl.dataset.composerWired === '1') return null;
  railEl.dataset.composerWired = '1';

  /* Inject the DB selector into the model row if the page left it empty. */
  const modelRow = railEl.querySelector('.fl-model-row');
  if (modelRow && !modelRow.querySelector('.fl-db-trigger')) {
    modelRow.insertAdjacentHTML('afterbegin', composerDbSelectorHtml());
  }

  /* Auto-grow behaviour for the text field (composer-v2 only; see helper). */
  wireComposerGrow(railEl.querySelector('textarea.fl-input'));

  const trigger = railEl.querySelector('.fl-db-trigger');
  const pop = railEl.querySelector('.fl-db-popover');
  const labelEl = railEl.querySelector('.fl-db-trigger-label');
  const search = pop?.querySelector('.fl-db-search-input');
  let accessFilter = 'all';
  let currentDbId = defaultDbItem() ? defaultDbItem().id : null;

  /* Locate this page's transcript so a database switch can be recorded there as
     a real user action — same behaviour as the canonical mount. The page owns
     the transcript (its own #chat-messages / .chat-messages-area), so resolve it
     from opts, then from the nearest chat-panel ancestor, then document-wide. */
  function resolveMessagesEl() {
    if (opts.messagesEl) {
      return typeof opts.messagesEl === 'string'
        ? document.querySelector(opts.messagesEl)
        : opts.messagesEl;
    }
    let node = railEl.parentElement;
    while (node) {
      const found = node.querySelector('.chat-messages-area');
      if (found) return found;
      node = node.parentElement;
    }
    return document.querySelector('.chat-messages-area');
  }

  /* Has the conversation actually started? The first database pick (before
     anyone has spoken) shouldn't leave a marker — only mid-thread switches do. */
  function conversationStarted(messages) {
    return !!(messages && messages.querySelector('.sc-line-you, .sc-line-wiseai'));
  }

  /* Drop a marker into the transcript so a mid-conversation database switch is
     visible as an explicit user action and the thread keeps flowing after it.
     Rendered as a line FROM the member — their avatar + the standard message
     type — since switching is something they did. Mirrors addDbChangeNote()
     in the canonical mount. */
  function addDbChangeNote(messages, prev, next) {
    if (!messages || !next) return;
    const initials = opts.userInitials || 'AK';
    const custom = typeof opts.userAvatar === 'function' ? opts.userAvatar() : opts.userAvatar;
    const userAvatar = custom || userAvatarImg('You') || esc(initials);
    const body = prev
      ? `<span class="sc-event-label">Switched database from</span> <strong>${esc(prev.name)}</strong> to <strong>${esc(next.name)}</strong>`
      : `<span class="sc-event-label">Set database to</span> <strong>${esc(next.name)}</strong>`;
    messages.insertAdjacentHTML('beforeend',
      `<div class="sc-line sc-line-you sc-line-event" data-activity="database" role="note" aria-label="${esc(prev ? `Switched database to ${next.name}` : `Set database to ${next.name}`)}">`
      + `<span class="sc-avatar sc-avatar-you" role="img" aria-label="You" data-initials="${esc(initials)}">${userAvatar}</span>`
      + `<div class="sc-line-body">${body}<div class="sc-line-meta"><span class="sc-line-time">${esc(nowLabel())}</span></div></div>`
      + `</div>`);
    messages.scrollTop = messages.scrollHeight;
  }

  function applyFilter() {
    if (!pop) return;
    const q = (search?.value || '').trim().toLowerCase();
    let anyVisible = false;
    pop.querySelectorAll('.fl-db-group').forEach((grp) => {
      const accessOk = accessFilter === 'all' || accessFilter === grp.dataset.access;
      const items = grp.querySelectorAll('.fl-db-item');
      let groupHasVisible = false;
      items.forEach((it) => {
        const match = accessOk && (!q || (it.dataset.search || '').includes(q));
        it.hidden = !match;
        if (match) groupHasVisible = true;
      });
      const emptyEl = grp.querySelector('.fl-db-groupempty');
      let showGroup;
      if (!items.length) { showGroup = accessOk && !q; if (emptyEl) emptyEl.hidden = !showGroup; }
      else { showGroup = groupHasVisible; }
      grp.hidden = !showGroup;
      if (showGroup) anyVisible = true;
    });
    const noResults = pop.querySelector('.fl-db-noresults');
    if (noResults) noResults.hidden = anyVisible;
  }

  function selectDb(dbId) {
    if (!pop) return;
    pop.querySelectorAll('.fl-db-item').forEach((el) => {
      const on = el.dataset.db === dbId;
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    const next = dbItemById(dbId);
    if (labelEl && next) labelEl.textContent = next.name;
    const changed = dbId !== currentDbId;
    const prev = dbItemById(currentDbId);
    currentDbId = dbId;
    if (changed) {
      const messages = resolveMessagesEl();
      if (conversationStarted(messages)) addDbChangeNote(messages, prev, next);
    }
    if (changed && typeof opts.onDbChange === 'function') opts.onDbChange(dbId, next);
  }

  function closeDbPop() {
    pop?.classList.remove('open');
    trigger?.setAttribute('aria-expanded', 'false');
  }

  /* "+" attach popover — only wire if the page hasn't bound its own handler
     (its button carries an inline onclick), so we never double-toggle. */
  const moreBtn = railEl.querySelector('.fl-more-btn');
  const morePop = railEl.querySelector('.fl-more-popover');
  const pageWiresAttach = opts.skipAttach === true || !!(moreBtn && moreBtn.getAttribute('onclick'));
  if (moreBtn && morePop && !pageWiresAttach) {
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeDbPop();
      const open = morePop.classList.toggle('open');
      moreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  } else if (moreBtn) {
    /* The page owns the attach toggle — just make sure opening it closes the
       database popover so the two are never open at once. */
    moreBtn.addEventListener('click', () => closeDbPop());
  }

  if (trigger && pop) {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      morePop?.classList.remove('open');
      const open = pop.classList.toggle('open');
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) { applyFilter(); requestAnimationFrame(() => search?.focus()); }
    });
    search?.addEventListener('click', (e) => e.stopPropagation());
    search?.addEventListener('input', applyFilter);
    pop.addEventListener('click', (e) => {
      const chip = e.target.closest('.fl-db-chip');
      if (chip) {
        e.stopPropagation();
        accessFilter = chip.dataset.filter || 'all';
        pop.querySelectorAll('.fl-db-chip').forEach((c) => c.classList.toggle('is-active', (c.dataset.filter || 'all') === accessFilter));
        applyFilter();
        return;
      }
      const it = e.target.closest('.fl-db-item');
      if (!it) return;
      closeDbPop();
      selectDb(it.dataset.db);
    });
    /* Dismiss the popover on any outside click. */
    document.addEventListener('click', (e) => {
      if (pop.classList.contains('open') && !e.target.closest('.fl-model-wrap')) closeDbPop();
    });
  }

  return { getDbId: () => currentDbId };
}

/* Live-activity indicator markup: a small trio of dots + a hover read-out card.
   The read-out's numbers are filled in live by updateActivity() in buildChat. */
function buildActivityHtml(id, title) {
  const label = `${title} activity`;
  return `<div class="sc-activity" id="${id}-activity" aria-hidden="true">
            <div class="sc-activity-wrap">
              <div class="sc-activity-dots" tabindex="0" role="button" aria-label="${esc(label)}">
                <span></span><span></span><span></span>
              </div>
              <div class="sc-activity-pop" role="tooltip">
                <div class="sc-activity-row">
                  <span class="sc-activity-key">This turn</span>
                  <span class="sc-activity-val" id="${id}-activity-turn">Idle — nothing running</span>
                </div>
                <div class="sc-activity-row">
                  <span class="sc-activity-key">Conversation</span>
                  <span class="sc-activity-val" id="${id}-activity-conv">No turns yet</span>
                </div>
              </div>
            </div>
          </div>`;
}

/* Full-size image preview lightbox — opened when an attachment thumbnail is
   clicked. Self-contained scrim appended to <body>; closes on backdrop click,
   the close button, or Escape. Styles live in injectChatExtras(). */
function openWiseImageModal(src, name) {
  if (typeof document === 'undefined' || !src) return;
  const scrim = document.createElement('div');
  scrim.className = 'wai-img-scrim';
  scrim.setAttribute('role', 'dialog');
  scrim.setAttribute('aria-modal', 'true');
  scrim.setAttribute('aria-label', name ? `Preview of ${name}` : 'Image preview');
  scrim.innerHTML =
    `<div class="wai-img-modal">
       <div class="wai-img-head">
         <span class="wai-img-name">${esc(name || 'Image')}</span>
         <button type="button" class="wai-img-close" aria-label="Close preview"><span class="material-symbols-outlined">close</span></button>
       </div>
       <div class="wai-img-body"><img src="${String(src).replace(/"/g, '%22')}" alt="${esc(name || 'Image preview')}"></div>
     </div>`;
  let onKey;
  const close = () => {
    scrim.classList.remove('is-open');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => scrim.remove(), 180);
  };
  onKey = (e) => { if (e.key === 'Escape') close(); };
  scrim.addEventListener('click', (e) => {
    if (e.target === scrim || e.target.closest('.wai-img-close')) close();
  });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(scrim);
  requestAnimationFrame(() => scrim.classList.add('is-open'));
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
    .ws-scorecard--locked:hover { background: color-mix(in srgb, var(--primary) 10%, #fff); border-color: var(--border-strong); box-shadow: none; transform: none; }
    html.dark .ws-scorecard--locked:hover { background: color-mix(in srgb, var(--primary-bright, #8B9FAF) 14%, transparent); }
    .ws-sc-lock { font-size: 18px !important; color: var(--text-subtle); }
    .ws-sc-action--locked { color: var(--text-subtle); align-self: flex-end; }

    .sc-mcp-item { justify-content: flex-start; }
    /* Label sits left after the icon; the switch is pinned to the row's right
       edge with an auto margin. This is deterministic regardless of which child
       flex-grows, so the label can't get dragged right when the row is
       re-measured on hover / active state or once the popover is re-floated to
       a fixed layer. */
    .sc-mcp-item > span:not(.material-symbols-outlined):not(.sc-switch) { flex: 0 1 auto; min-width: 0; text-align: left; white-space: nowrap; }
    .sc-mcp-item .sc-switch { margin-left: auto; }
    /* When an Admin badge is present it claims the right-edge auto margin, so the
       switch sits snug beside it (on the row's own gap) rather than fighting it
       for the free space. */
    .sc-mcp-item .topbar-menu-badge ~ .sc-switch { margin-left: 0; }
    .sc-switch { position: relative; flex: 0 0 auto; width: 34px; height: 19px; border-radius: 999px;
      background: var(--surface-3, #cdd3da); border: 1px solid var(--border-strong); transition: background .15s ease, border-color .15s ease; }
    html.dark .sc-switch { background: rgba(255,255,255,0.14); }
    .sc-switch::after { content: ''; position: absolute; top: 1px; left: 1px; width: 15px; height: 15px; border-radius: 50%;
      background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.28); transition: transform .18s ease; }
    .sc-mcp-item.is-on .sc-switch { background: var(--primary); border-color: var(--primary); }
    .sc-mcp-item.is-on .sc-switch::after { transform: translateX(15px); }
    /* Pink variant — the admin "Compact spacing" toggle flips pink (matching the
       row's pink text + Admin badge) instead of the default brand-blue. */
    .sc-mcp-item.is-on .sc-switch--pink { background: rgb(219, 39, 119); border-color: rgb(219, 39, 119); }

    /* "Response streaming" — one regular (brand-blue) on/off switch row, with a
       detail picker beneath it choosing how much of the thinking streams
       (Full · Steps · Final). The picker uses the app's canonical segmented
       control (matching Appearance's Text size / Module spacing): a small
       section label above one connected, pill-shaped track with a brand-fill
       active segment. The whole block dims and stops accepting clicks while the
       master switch is off. */
    .sc-stream-detail { display: flex; flex-direction: column; gap: 7px;
      margin: 4px 12px 8px 42px; transition: opacity .15s ease; }
    .sc-stream-detail-label { font-size: 10px; letter-spacing: 0.1em; font-weight: 700;
      text-transform: uppercase; color: var(--text-muted); }
    .sc-stream-seg { display: flex; width: 100%; border: 1px solid var(--border-strong);
      border-radius: 9999px; overflow: hidden; }
    .sc-stream-seg-btn { flex: 1 1 0; min-width: 0; height: 28px; border: 0;
      border-left: 1px solid var(--border-strong); background: transparent;
      font: inherit; font-size: 11.5px; font-weight: 700; line-height: 1;
      color: var(--text-muted); cursor: pointer; white-space: nowrap;
      transition: background .14s ease, color .14s ease; }
    .sc-stream-seg-btn:first-child { border-left: 0; }
    .sc-stream-seg-btn:hover { background: var(--surface-3); color: var(--text); }
    .sc-stream-seg-btn.is-on { background: var(--primary); color: #fff; }
    .sc-stream-detail.is-disabled { opacity: .45; pointer-events: none; }

    .wch-conn-intro { margin: 2px 16px 8px; font-size: 12px; line-height: 1.45; opacity: .7; }
    .wch-conn-list { flex: 1; overflow-y: auto; padding: 2px 8px 12px; }
    .wch-conn-row { display: flex; align-items: center; gap: 11px; width: 100%; margin: 2px 0; padding: 9px 10px;
      border: 0; background: none; border-radius: 10px; cursor: pointer; text-align: left; color: inherit; font-family: inherit; }
    .wch-conn-row:hover { background: rgba(255,255,255,0.06); }
    html:not(.dark) .wch-conn-row:hover { background: rgba(20,40,80,0.05); }
    .wch-conn-body { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .wch-conn-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .wch-conn-status { font-size: 11px; opacity: .6; }
    .wch-conn-cta { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; font-size: 11.5px; font-weight: 700; color: var(--primary-ink, var(--primary, #2F6DF6)); }
    .wch-conn-cta .material-symbols-outlined { font-size: 15px; }
    .wch-conn-row.is-connected .wch-conn-cta { color: var(--sec-green-text, #2E7D32); }

    /* Feedback actions (copy / thumbs) sit INLINE, directly to the right of the
       timestamp inside .sc-line-meta — small, filled glyphs. */
    .sc-fb-wrap { margin: 0; align-self: center; flex: 1 1 auto; min-width: 0; }
    .sc-fb { display: flex; align-items: center; gap: 1px; width: 100%; }
    /* Three-dot ("more") control — floated to the far right of the thumbs. It
       holds the timestamp + the re-run / edit / fork controls + the turn ID,
       spilling them into a small floating menu on click so the row itself stays
       down to copy / thumbs up / thumbs down. */
    .sc-fb-more-wrap { position: relative; display: inline-flex; margin-left: auto; padding-left: 6px; }
    .sc-fb-menu { position: absolute; top: calc(100% + 8px); right: -4px; z-index: 60;
      display: inline-flex; align-items: center; gap: 2px; width: max-content;
      padding: 4px 7px; background: var(--surface); border: 1px solid var(--border-strong);
      border-radius: 10px; box-shadow: var(--shadow-3, var(--sc-shadow-pop)); }
    .sc-fb-menu::before { content: ''; position: absolute; bottom: 100%; right: 11px;
      border: 6px solid transparent; border-bottom-color: var(--border-strong); }
    .sc-fb-menu::after { content: ''; position: absolute; bottom: 100%; right: 12px; transform: translateY(1px);
      border: 5px solid transparent; border-bottom-color: var(--surface); }
    html.dark .sc-fb-menu { background: #1A2339; border-color: rgba(37,80,124,0.22); }
    html.dark .sc-fb-menu::after { border-bottom-color: #1A2339; }
    .sc-fb-menu[hidden] { display: none; }
    .sc-fb-menu-time { margin-right: 4px; padding-right: 6px; white-space: nowrap;
      border-right: 1px solid var(--border); }
    .sc-fb-menu-actions { display: inline-flex; align-items: center; gap: 1px; }
    .sc-fb-more.is-on, .sc-fb-more[aria-expanded="true"] { background: var(--surface-3); color: var(--text); }
    html.dark .sc-fb-more[aria-expanded="true"] { background: rgba(255,255,255,0.07); }
    .sc-fb-id { margin-left: 3px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.02em;
      color: var(--text-subtle); font-variant-numeric: tabular-nums; }
    .sc-fb-btn { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px;
      border: 0; border-radius: 5px; background: transparent; color: var(--text-subtle); cursor: pointer; padding: 0;
      transition: background .14s ease, color .14s ease; }
    .sc-fb-btn:hover { background: var(--surface-3); color: var(--text); }
    html.dark .sc-fb-btn:hover { background: rgba(255,255,255,0.07); }
    .sc-fb-btn .material-symbols-outlined { font-size: 14px; font-variation-settings: 'FILL' 1; }
    .sc-fb-btn.is-on { color: var(--primary-ink, var(--primary)); }
    .sc-fb-btn.is-on[data-fb="down"] { color: var(--sec-red-text); }
    .sc-fb-btn.is-on .material-symbols-outlined { font-variation-settings: 'FILL' 1; }
    .sc-fb-btn.is-done { color: var(--sec-green-text); }
    /* Reason picker — a pop-over anchored to the thumbs-down button, floated
       above the transcript rather than pushing the thread open inline. */
    .sc-fb-down-wrap, .sc-fb-up-wrap, .sc-fb-copy-wrap { position: relative; display: inline-flex; }
    /* "Copied" confirmation pill — floats just above the copy button, snaps in
       and fades away after copyAnswer() flips the .is-vis flag. */
    .sc-fb-copied { position: absolute; bottom: calc(100% + 7px); left: 50%; transform: translateX(-50%) translateY(3px) scale(.96);
      z-index: 70; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; pointer-events: none;
      padding: 4px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: .01em;
      background: var(--sec-green-bg, #E6F4EA); color: var(--sec-green-text, #1E7A34);
      border: 1px solid color-mix(in srgb, var(--sec-green-text, #1E7A34) 26%, transparent);
      box-shadow: 0 6px 18px rgba(0,0,0,0.16); opacity: 0; transition: opacity .13s ease, transform .13s ease; }
    html.dark .sc-fb-copied { background: rgba(46,125,50,0.18); }
    .sc-fb-copied .material-symbols-outlined { font-size: 13px; font-variation-settings: 'FILL' 1; }
    .sc-fb-copied.is-vis { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
    /* Anchored to the button's left edge (rather than centered) so the wider
       chip + free-form panel opens rightward and can't clip off the left of the
       transcript — the thumbs sit close to the meta row's left edge. */
    .sc-fb-reasons { position: absolute; top: calc(100% + 8px); left: -6px;
      z-index: 60; width: max-content; max-width: 260px; display: flex; flex-direction: column; gap: 8px;
      padding: 11px 12px; background: var(--surface); border: 1px solid var(--border-strong);
      border-radius: 12px; box-shadow: var(--shadow-3, var(--sc-shadow-pop)); }
    .sc-fb-reasons::before { content: ''; position: absolute; bottom: 100%; left: 15px;
      border: 6px solid transparent; border-bottom-color: var(--border-strong); }
    .sc-fb-reasons::after { content: ''; position: absolute; bottom: 100%; left: 16px; transform: translateY(1px);
      border: 5px solid transparent; border-bottom-color: var(--surface); }
    html.dark .sc-fb-reasons { background: linear-gradient(155deg, #1A2339 0%, #1A2339 60%, #1A2339 100%); border-color: rgba(37,80,124,0.22); }
    html.dark .sc-fb-reasons::after { border-bottom-color: #1A2339; }
    .sc-fb-reasons[hidden] { display: none; }
    .sc-fb-reasons-label { font-size: 11.5px; font-weight: 600; color: var(--text-muted); }
    .sc-fb-reason-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .sc-fb-reason { font-size: 11.5px !important; padding: 5px 11px !important; font-weight: 500; }
    .sc-fb-reason.is-on { border-color: var(--primary); color: var(--primary-ink, var(--primary));
      background: color-mix(in srgb, var(--primary) 12%, transparent); }
    /* Free-form note beneath the chips — lets a user qualify the verdict in
       their own words. Present in both the up and down pop-overs. */
    .sc-fb-reasons { max-width: 280px; }
    .sc-fb-form { display: flex; flex-direction: column; gap: 7px; min-width: 214px; }
    .sc-fb-input { width: 100%; box-sizing: border-box; resize: vertical; min-height: 34px; max-height: 120px;
      padding: 7px 9px; border-radius: 9px; font: inherit; font-size: 12px; line-height: 1.4; color: var(--text);
      background: var(--surface-2, rgba(255,255,255,0.04)); border: 1px solid var(--border-strong);
      outline: none; transition: border-color .14s ease, box-shadow .14s ease; }
    html.dark .sc-fb-input { background: rgba(255,255,255,0.05); }
    .sc-fb-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent); }
    .sc-fb-input::placeholder { color: var(--text-subtle); }
    .sc-fb-send { align-self: flex-end; font-size: 11.5px !important; padding: 5px 14px !important; font-weight: 700;
      border-color: var(--primary); color: #fff; background: var(--primary); }
    .sc-fb-send:hover { filter: brightness(1.05); }
    .sc-fb-send:disabled { opacity: .5; cursor: default; filter: none; }
    .sc-fb-note { margin-top: 8px; display: flex; align-items: center; gap: 5px; font-size: 11.5px; font-style: italic; color: var(--text-subtle); }
    .sc-fb-note[hidden] { display: none; }
    .sc-fb-note .material-symbols-outlined { font-size: 15px; }
    .sc-fb-id { cursor: pointer; }
    .sc-fb-id:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; border-radius: 4px; }

    /* Stylized hover/focus tooltip for the answer-action icons — a small dark
       card floated just above the control, captioned from its data-tip. */
    .sc-tip { position: fixed; z-index: 2000; pointer-events: none; max-width: 220px;
      background: #1f2430; color: #fff; font-size: 11.5px; font-weight: 600; line-height: 1.25;
      letter-spacing: 0.01em; padding: 5px 9px; border-radius: 7px; white-space: nowrap;
      box-shadow: 0 8px 22px rgba(0,0,0,0.30); border: 1px solid rgba(255,255,255,0.08);
      opacity: 0; transform: translate(-50%, calc(-100% - 4px)) scale(0.96); transform-origin: bottom center;
      transition: opacity .12s ease, transform .12s ease; }
    .sc-tip.is-vis { opacity: 1; transform: translate(-50%, -100%) scale(1); }
    .sc-tip::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
      border: 5px solid transparent; border-top-color: #1f2430; }

    /* "Forked from …" lineage banner pinned to the top of a forked transcript.
       It persists in the saved thread so the lineage sticks no matter how far
       the fork is taken. */
    .sc-fork-banner { display: flex; align-items: center; gap: 9px; margin: 2px 0 14px; padding: 9px 13px; border-radius: 12px;
      font-size: 12.5px; line-height: 1.4; color: var(--text);
      background: color-mix(in srgb, var(--primary, #2F6DF6) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--primary, #2F6DF6) 26%, transparent); }
    .sc-fork-banner-ic { font-size: 18px; color: var(--primary-ink, var(--primary, #2F6DF6)); flex: 0 0 auto; }
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
      background: color-mix(in srgb, var(--primary, #2F6DF6) 14%, transparent); color: var(--primary-ink, var(--primary, #2F6DF6)); }
    .wt-turn-q { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; line-height: 1.35;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .wt-turn-a { font-size: 12px; line-height: 1.45; opacity: .72; margin: 2px 0 9px;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .wt-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
    .wt-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 600; padding: 3px 8px; border-radius: 999px;
      background: var(--surface-3, rgba(255,255,255,0.06)); color: var(--text-muted, inherit); }
    html:not(.dark) .wt-chip { background: rgba(20,40,80,0.06); }
    .wt-chip .material-symbols-outlined { font-size: 13px; }
    .wt-actions { display: flex; align-items: center; gap: 6px; }
    .wt-fork { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 0; border-radius: 8px;
      background: transparent; color: var(--primary-ink, var(--primary, #2F6DF6)); cursor: pointer; opacity: .9; transition: background .14s ease, color .14s ease, opacity .14s ease; }
    .wt-fork:hover { opacity: 1; background: color-mix(in srgb, var(--primary, #2F6DF6) 14%, transparent); }
    .wt-fork .material-symbols-outlined { font-size: 17px; }
    /* The forked turn's handle (#id), sat right beside its fork icon. */
    .wt-fork-id { font-size: 11px; font-weight: 700; letter-spacing: 0.02em; color: var(--primary-ink, var(--primary, #2F6DF6));
      font-variant-numeric: tabular-nums; margin: 0 2px 0 -1px; }
    .wt-jump { display: inline-flex; align-items: center; gap: 5px; margin-left: auto; border: 0; background: transparent; cursor: pointer;
      font-family: inherit; font-size: 12px; font-weight: 600; color: var(--text-muted, inherit); opacity: .8; padding: 6px 4px; }
    .wt-jump:hover { opacity: 1; color: var(--primary-ink, var(--primary, #2F6DF6)); }
    .wt-jump .material-symbols-outlined { font-size: 15px; }

    /* Search box pinned above the turn list (mirrors the History search). */
    .wt-search { position: relative; display: flex; align-items: center; margin: 2px 16px 6px; flex-shrink: 0; }
    .wt-search > .material-symbols-outlined { position: absolute; left: 11px; font-size: 18px; opacity: .5; pointer-events: none; }
    .wt-search-input { width: 100%; height: 36px; box-sizing: border-box; padding: 0 32px 0 36px; border-radius: 999px; font: inherit; font-size: 13px; color: inherit; outline: none;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); transition: border-color .15s ease, box-shadow .15s ease; }
    html:not(.dark) .wt-search-input { background: rgba(20,40,80,0.04); border-color: rgba(0,0,0,0.10); }
    .wt-search-input::placeholder { opacity: .6; }
    .wt-search-input:focus { border-color: var(--primary, #2F6DF6); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary, #2F6DF6) 18%, transparent); }
    .wt-search-clear { position: absolute; right: 8px; width: 22px; height: 22px; border: 0; border-radius: 50%; background: transparent; color: inherit; cursor: pointer; display: none; align-items: center; justify-content: center; opacity: .6; }
    .wt-search-clear:hover { background: rgba(255,255,255,0.12); opacity: 1; }
    html:not(.dark) .wt-search-clear:hover { background: rgba(0,0,0,0.08); }
    .wt-search-clear .material-symbols-outlined { font-size: 16px; }
    .wt-search.has-q .wt-search-clear { display: flex; }

    /* Per-turn Share + Note controls, tucked beside Fork/Jump. */
    .wt-iconbtn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 0; border-radius: 8px;
      background: transparent; color: var(--text-muted, inherit); cursor: pointer; opacity: .82; transition: background .14s ease, color .14s ease, opacity .14s ease; }
    .wt-iconbtn:hover { opacity: 1; color: var(--primary-ink, var(--primary, #2F6DF6)); background: color-mix(in srgb, var(--primary, #2F6DF6) 12%, transparent); }
    .wt-iconbtn .material-symbols-outlined { font-size: 17px; }
    .wt-iconbtn.is-on { color: var(--primary-ink, var(--primary, #2F6DF6)); background: color-mix(in srgb, var(--primary, #2F6DF6) 14%, transparent); opacity: 1; }
    .wt-note { margin: 9px 0 0; }
    .wt-note[hidden] { display: none; }
    .wt-note-input { width: 100%; box-sizing: border-box; min-height: 54px; resize: vertical; font: inherit; font-size: 12px; line-height: 1.45; color: inherit;
      padding: 8px 10px; border-radius: 10px; outline: none; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.14); }
    html:not(.dark) .wt-note-input { background: rgba(20,40,80,0.03); border-color: rgba(0,0,0,0.12); }
    .wt-note-input:focus { border-color: var(--primary, #2F6DF6); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary, #2F6DF6) 16%, transparent); }
    /* Saved-note preview shown on turns that already carry an annotation. */
    .wt-note-saved { display: flex; align-items: flex-start; gap: 6px; margin: 9px 0 0; padding: 8px 10px; border-radius: 10px; font-size: 12px; line-height: 1.4;
      background: color-mix(in srgb, var(--ter-amber-10, rgba(255,196,52,0.14)) 100%, transparent); border: 1px solid color-mix(in srgb, #E0A100 30%, transparent); color: var(--text); }
    .wt-note-saved[hidden] { display: none; }
    .wt-note-saved .material-symbols-outlined { font-size: 15px; color: #C98A00; flex: 0 0 auto; margin-top: 1px; }
    .wt-note-saved-txt { flex: 1 1 auto; min-width: 0; white-space: pre-wrap; word-break: break-word; }
    /* Tiny transient "copied / shared" toast anchored to the turns module. */
    .wt-toast { position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%) translateY(8px); z-index: 70; pointer-events: none;
      background: #1f2430; color: #fff; font-size: 12px; font-weight: 600; padding: 7px 13px; border-radius: 999px; box-shadow: 0 8px 22px rgba(0,0,0,0.32);
      opacity: 0; transition: opacity .18s ease, transform .18s ease; }
    .wt-toast.is-vis { opacity: 1; transform: translateX(-50%) translateY(0); }

    /* Live-activity indicator — a small trio of dots docked under the input.
       Idle: three faint, still dots. Working (.is-thinking, driven by the
       presence of a typing line): the dots bounce in sequence. Hovering the
       cluster reveals a compact telemetry read-out popover. */
    .sc-activity { display: flex; justify-content: center; margin: 7px 0 1px; }
    .sc-activity-wrap { position: relative; display: inline-flex; }
    .sc-activity-dots { display: inline-flex; align-items: center; gap: 4px; padding: 5px 8px;
      border: 0; background: transparent; border-radius: 999px; cursor: default; line-height: 0;
      transition: background .15s ease; }
    .sc-activity-wrap:hover .sc-activity-dots { background: var(--surface-3, rgba(20,40,80,0.05)); }
    html.dark .sc-activity-wrap:hover .sc-activity-dots { background: rgba(255,255,255,0.06); }
    .sc-activity-dots > span { width: 5px; height: 5px; border-radius: 50%; flex: 0 0 auto;
      background: color-mix(in srgb, var(--text-subtle) 55%, transparent);
      transition: background .18s ease, transform .18s ease; }
    .sc-activity.is-thinking .sc-activity-dots > span { background: var(--primary, #2F6DF6);
      animation: scActBounce 1.15s ease-in-out infinite; }
    .sc-activity.is-thinking .sc-activity-dots > span:nth-child(2) { animation-delay: .16s; }
    .sc-activity.is-thinking .sc-activity-dots > span:nth-child(3) { animation-delay: .32s; }
    @keyframes scActBounce { 0%, 70%, 100% { transform: translateY(0); opacity: .45; }
      35% { transform: translateY(-4px); opacity: 1; } }
    @media (prefers-reduced-motion: reduce) {
      .sc-activity.is-thinking .sc-activity-dots > span { animation: none; opacity: 1; } }

    /* Hover read-out — dark card floated above the dots, matching the tooltip
       styling of the app's other telemetry surfaces. */
    .sc-activity-pop { position: absolute; left: 50%; bottom: calc(100% + 8px); transform: translate(-50%, 4px);
      min-width: 300px; max-width: 380px; padding: 10px 13px; border-radius: 11px; z-index: 40;
      background: #1f2733; color: #e7ecf3; border: 1px solid rgba(255,255,255,0.10);
      box-shadow: 0 10px 30px rgba(0,0,0,0.30); text-align: left;
      opacity: 0; pointer-events: none; visibility: hidden;
      transition: opacity .16s ease, transform .16s ease, visibility 0s linear .16s; }
    .sc-activity-wrap:hover .sc-activity-pop, .sc-activity-wrap:focus-within .sc-activity-pop {
      opacity: 1; transform: translate(-50%, 0); visibility: visible; transition-delay: 0s; }
    .sc-activity-pop::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
      border: 6px solid transparent; border-top-color: #1f2733; }
    .sc-activity-row { display: flex; gap: 8px; font-size: 11px; line-height: 1.5; font-variant-numeric: tabular-nums; }
    .sc-activity-row + .sc-activity-row { margin-top: 5px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.08); }
    .sc-activity-key { flex: 0 0 auto; font-weight: 700; color: #cfd7e2; letter-spacing: .01em; }
    .sc-activity-val { flex: 1 1 auto; color: #aab6c6; }
    .sc-activity-val b { color: #6bd68a; font-weight: 700; }
    .sc-activity-val em { color: #7fb0ff; font-style: normal; }
    .sc-activity-val .sc-activity-muted { color: #7c8798; }

    /* Below-input meta row — hosts the optional "What can I ask?" link on the
       left while keeping the activity dots centered (3-col grid). */
    .sc-belowinput { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; }
    .sc-belowinput .sc-activity { grid-column: 2; }
    .sc-belowinput--ask .sc-ask-help { grid-column: 1; justify-self: start; }
    /* "What can I ask?" — a quiet gold text link (no icon) that opens the
       right-docked help panel. Its text is left-aligned with the composer's
       placeholder text above. Because that inset shifts with the composer
       layout (wide vs. narrow grid vs. v1) and the module's width, the exact
       left margin is measured and set at runtime by alignAskHelp(); the 39px
       here is only a pre-measurement default to avoid a first-paint jump. */
    .sc-ask-help { display: inline-flex; align-items: center; margin: 7px 0 1px 39px;
      padding: 3px 6px; border: 0; background: transparent; border-radius: 8px; cursor: pointer;
      font: inherit; font-size: 12.5px; font-weight: 400; line-height: 1.2; letter-spacing: .01em;
      color: color-mix(in srgb, var(--ter-amber, #FFC434) 78%, #000); transition: background .15s ease, color .15s ease; }
    .sc-ask-help:hover { background: var(--surface-3, rgba(20,40,80,0.06)); }
    /* Dark mode keeps the full-brightness gold — the darkened mix goes muddy
       against the navy surface. */
    html.dark .sc-ask-help { color: var(--ter-amber, #FFC434); }
    html.dark .sc-ask-help:hover { background: rgba(255,255,255,0.07); }
    /* Gold shimmer, clipped through the glyphs: each letter carries a wide
       gradient (flat gold with a narrow bright band in the middle) painted only
       inside the text via background-clip. Once per ~7.5s cycle the band sweeps
       slowly across each letter while it bubbles up ~1.5px; per-letter
       animation-delay staggers the phase so the shine travels left-to-right
       across the whole label. At both keyframe extremes only flat gold is in
       view, so the infinite-loop seam is invisible. */
    .sc-ask-help .sc-ask-ch { display: inline-block;
      /* Darker gold FILL (deep amber) with the shimmer band riding a touch
         brighter than the base — so the glyph interior stays the darker tone
         while a lighter gold sweeps through. */
      background: linear-gradient(105deg,
        color-mix(in srgb, var(--ter-amber, #FFC434) 68%, #000) 0%,
        color-mix(in srgb, var(--ter-amber, #FFC434) 68%, #000) 42%,
        var(--ter-amber, #FFC434) 48%, #ffe08a 50%, var(--ter-amber, #FFC434) 52%,
        color-mix(in srgb, var(--ter-amber, #FFC434) 68%, #000) 58%,
        color-mix(in srgb, var(--ter-amber, #FFC434) 68%, #000) 100%);
      background-size: 250% 100%; background-position: 100% 0;
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent; color: transparent;
      /* Lighter-gold hairline OUTLINE hugging each glyph edge — the darker
         fill above still reads through since the stroke only traces the edges. */
      -webkit-text-stroke: 0.4px color-mix(in srgb, var(--ter-amber, #FFC434) 45%, #fff);
      animation: sc-ask-shimmer 7.5s ease-in-out infinite;
      animation-delay: calc(var(--ch-i, 0) * 90ms); }
    @keyframes sc-ask-shimmer {
      0%, 8%    { background-position: 100% 0; transform: translateY(0); }
      20%       { transform: translateY(-1.5px); }
      34%, 100% { background-position: 0% 0; transform: translateY(0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .sc-ask-help .sc-ask-ch { animation: none; }
    }

    /* "What can I ask?" INTENT CHIP — the gold-bordered twin of the link above.
       It rides at the end of every welcome chip set whenever the link is shown;
       clicking it starts a page-specific "here's what you can ask" chat turn.
       Doubled .chip selector so these outrank the base .ws-intent-chip rules in
       wiseai-chat.css / wise.css. */
    .chip.ws-intent-chip--askhelp {
      border-color: color-mix(in srgb, var(--ter-amber, #FFC434) 75%, var(--border-strong));
      color: color-mix(in srgb, var(--ter-amber, #FFC434) 62%, #000);
      background: color-mix(in srgb, var(--ter-amber, #FFC434) 9%, #fff);
    }
    .chip.ws-intent-chip--askhelp .material-symbols-outlined { color: inherit; }
    .chip.ws-intent-chip--askhelp:hover {
      background: color-mix(in srgb, var(--ter-amber, #FFC434) 18%, #fff);
      border-color: var(--ter-amber, #FFC434);
      color: color-mix(in srgb, var(--ter-amber, #FFC434) 50%, #000);
    }
    /* Dark mode: gold-tinted glass over the navy chrome, full-brightness gold
       text (the darkened mix goes muddy on navy — same call as the link). */
    html.dark .chip.ws-intent-chip--askhelp {
      background: color-mix(in srgb, var(--ter-amber, #FFC434) 12%, transparent);
      border-color: color-mix(in srgb, var(--ter-amber, #FFC434) 70%, transparent);
      color: var(--ter-amber, #FFC434);
    }
    html.dark .chip.ws-intent-chip--askhelp:hover {
      background: color-mix(in srgb, var(--ter-amber, #FFC434) 20%, transparent);
      border-color: var(--ter-amber, #FFC434);
    }
    /* The bulleted ask-list inside the chip's "what can I ask" reply. */
    .sc-line-body .sc-askhelp-list { margin: 8px 0; padding-left: 18px; }
    .sc-line-body .sc-askhelp-list li { margin: 4px 0; }

    /* "What can I ask?" side panel (same .wch-sidebar shell as Connect a data
       source). Presents the surface's OWN suggestions — the welcome scorecards
       and intent chips — as insertable prompt cards, grouped into sections.
       Each card can be dropped straight into the composer (icon) or sent as its
       own turn ("off you go"). A search field filters the prompts, and the
       header's breakout icon detaches the panel OUT of the chat into a large
       fixed board (portaled to <body>) so long prompt sets read as a gallery. */
    .wch-ask-empty { padding: 18px 16px; color: var(--text-muted); font-size: 13.5px; line-height: 1.5; }
    .wch-ask-intro { margin: 2px 16px 8px; font-size: 13px; line-height: 1.5; opacity: .82; }
    .wch-ask-list { flex: 1; overflow-y: auto; padding: 4px 10px 14px; }
    .wch-ask-group { margin: 8px 0 4px; }
    .wch-ask-group + .wch-ask-group { margin-top: 16px; }
    .wch-ask-group-title { display: flex; align-items: center; gap: 8px; padding: 2px 6px 8px;
      font-size: 14px; font-weight: 700; letter-spacing: 0; text-transform: none; color: var(--text); opacity: 1; }
    .wch-ask-group-title .material-symbols-outlined { font-size: 18px; opacity: .9; }
    .wch-ask-cards { display: flex; flex-direction: column; gap: 6px; }

    .wch-ask-card { position: relative; display: flex; align-items: flex-start; gap: 11px; width: 100%;
      padding: 11px 12px; border: 1px solid rgba(255,255,255,0.09); background: rgba(255,255,255,0.02);
      border-radius: 12px; cursor: pointer; text-align: left; color: inherit; font-family: inherit;
      transition: background .14s ease, border-color .14s ease, transform .12s ease, box-shadow .14s ease; }
    .wch-ask-card:hover { background: rgba(255,255,255,0.055); border-color: rgba(255,255,255,0.16);
      transform: translateY(-1px); box-shadow: 0 6px 18px rgba(0,0,0,0.22); }
    html:not(.dark) .wch-ask-card { border-color: rgba(20,40,80,0.10); background: rgba(20,40,80,0.015); }
    html:not(.dark) .wch-ask-card:hover { background: rgba(20,40,80,0.045); border-color: rgba(20,40,80,0.18);
      box-shadow: 0 8px 20px rgba(20,30,60,0.10); }
    .wch-ask-ico { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;
      margin-top: 1px; background: none; color: var(--primary-ink, var(--primary, #2F6DF6)); }
    .wch-ask-ico .material-symbols-outlined { font-size: 22px; }
    .wch-ask-card--gold .wch-ask-ico { background: none; color: var(--ter-amber-text, #B5851B); }
    html.dark .wch-ask-card--gold .wch-ask-ico { color: var(--ter-amber, #FFC434); }
    .wch-ask-card-body { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px;
      padding-right: 26px; }
    .wch-ask-card-title { font-size: 14px; font-weight: 600; line-height: 1.35; }
    .wch-ask-card-desc { font-size: 13px; line-height: 1.45; opacity: .8; }
    .wch-ask-card-q { display: block; margin-top: 3px; font-size: 13px; line-height: 1.45; opacity: .92;
      font-style: italic; color: var(--primary-ink, var(--primary, #2F6DF6)); }

    /* Insert-into-composer control — the "some sort of an icon" that drops the
       prompt into the input without sending, so it can be tweaked first. The
       whole card SENDS the prompt straight away ("off you go"). */
    .wch-ask-insert { position: absolute; top: 9px; right: 9px; display: inline-flex; align-items: center;
      justify-content: center; width: 22px; height: 22px; border: 0; border-radius: 0; cursor: pointer;
      background: none; color: var(--text-muted); opacity: 0;
      transition: color .14s ease, opacity .14s ease, transform .12s ease; }
    .wch-ask-card:hover .wch-ask-insert, .wch-ask-card:focus-within .wch-ask-insert { opacity: .7; }
    .wch-ask-insert:hover { background: none; color: var(--primary-ink, var(--primary, #2F6DF6)); opacity: 1; transform: scale(1.08); }
    .wch-ask-insert .material-symbols-outlined { font-size: 19px; }
    @media (hover: none) { .wch-ask-insert { opacity: .7; } }

    /* Header controls row — a breakout (expand) toggle sits left of the close
       button, matching the shared .wch-head layout. */
    .wch-head-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px;
      border: 0; border-radius: 8px; background: none; cursor: pointer; color: var(--text-muted);
      transition: background .14s ease, color .14s ease; }
    .wch-head-btn:hover { background: rgba(255,255,255,0.08); color: var(--text); }
    html:not(.dark) .wch-head-btn:hover { background: rgba(20,40,80,0.06); }
    .wch-head-btn .material-symbols-outlined { font-size: 19px; }

    /* Search row — pinned above the prompt list so long libraries can be
       filtered by keyword (mirrors the Turns module's search field). */
    .wch-ask-search { display: flex; align-items: center; gap: 8px; margin: 0 12px 8px; padding: 0 14px;
      height: 38px; border: 1px solid rgba(20,40,80,0.10); border-radius: 999px; background: rgba(20,40,80,0.04);
      transition: border-color .15s ease, box-shadow .15s ease, background .15s ease; }
    html.dark .wch-ask-search { border-color: rgba(255,255,255,0.12); background: rgba(255,255,255,0.05); }
    .wch-ask-search:focus-within { border-color: var(--primary, #2F6DF6);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary, #2F6DF6) 18%, transparent); }
    .wch-ask-search > .material-symbols-outlined { font-size: 18px; opacity: .55; }
    .wch-ask-search-input { flex: 1 1 auto; min-width: 0; border: 0; outline: 0; background: none; color: inherit;
      font-family: inherit; font-size: 13.5px; }
    .wch-ask-search-input::placeholder { color: var(--text-subtle); opacity: .8; }
    .wch-ask-search-clear { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px;
      border: 0; border-radius: 50%; background: transparent; color: var(--text-muted); cursor: pointer; opacity: .7; }
    .wch-ask-search-clear:hover { background: rgba(20,40,80,0.08); color: var(--text); opacity: 1; }
    html.dark .wch-ask-search-clear:hover { background: rgba(255,255,255,0.12); }
    .wch-ask-search-clear .material-symbols-outlined { font-size: 16px; }

    /* Broken-out "What can I ask?" module — the shared .wch-sidebar.wch-docked
       rules (injected by chat-history.js) dress it like every other docked
       module (Turns, History); the list just breathes a little more. */
    .wch-sidebar.wch-ask-panel.wch-docked .wch-ask-list { padding-bottom: 18px; }

    /* ── Rich catalog mode ("askCatalog") ────────────────────────────────────
       When the surface supplies a structured catalog, the panel renders it as a
       set of SECTIONS, each with a header + blurb and a stack of CAPABILITY
       cards. Every capability lists one or more example prompts (each clickable
       to send, or insertable via its icon) plus a subdued "Behind the scenes"
       tool footer. A row of filter chips above the list scopes to one section. */
    .wch-ask-filters { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 12px 10px; }
    .wch-ask-filter { border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.03);
      color: var(--text-muted); border-radius: 999px; padding: 5px 13px; font-family: inherit;
      font-size: 12.5px; font-weight: 600; cursor: pointer; white-space: nowrap;
      transition: background .14s ease, border-color .14s ease, color .14s ease; }
    .wch-ask-filter:hover { background: rgba(255,255,255,0.07); color: var(--text); }
    html:not(.dark) .wch-ask-filter { border-color: rgba(20,40,80,0.12); background: rgba(20,40,80,0.02); }
    html:not(.dark) .wch-ask-filter:hover { background: rgba(20,40,80,0.05); }
    .wch-ask-filter.is-active { background: var(--primary, #2F6DF6); border-color: var(--primary, #2F6DF6); color: #fff; }
    .wch-ask-filter.is-active:hover { background: var(--primary, #2F6DF6); color: #fff; }

    .wch-ask-group-desc { padding: 0 6px 10px; font-size: 13px; line-height: 1.5; opacity: .8; }

    .wch-ask-cap { border: 1px solid rgba(255,255,255,0.09); background: rgba(255,255,255,0.02);
      border-radius: 12px; padding: 12px 13px 11px; }
    html:not(.dark) .wch-ask-cap { border-color: rgba(20,40,80,0.10); background: rgba(20,40,80,0.015); }
    .wch-ask-cap-head { display: flex; align-items: flex-start; gap: 11px; }
    .wch-ask-cap-ico { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;
      margin-top: 1px; background: none; color: var(--primary-ink, var(--primary, #2F6DF6)); }
    .wch-ask-cap-ico .material-symbols-outlined { font-size: 22px; }
    .wch-ask-cap-titles { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .wch-ask-cap-title { font-size: 15px; font-weight: 650; line-height: 1.35; }
    .wch-ask-cap-desc { font-size: 13px; line-height: 1.48; opacity: .8; }

    .wch-ask-prompts { display: flex; flex-direction: column; gap: 5px; margin: 9px 0 0; }
    .wch-ask-prompt { position: relative; display: flex; align-items: center; gap: 8px; width: 100%;
      padding: 7px 9px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02);
      border-radius: 9px; cursor: pointer; text-align: left; color: inherit; font-family: inherit;
      transition: background .14s ease, border-color .14s ease; }
    .wch-ask-prompt:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.16); }
    html:not(.dark) .wch-ask-prompt { border-color: rgba(20,40,80,0.09); background: rgba(20,40,80,0.015); }
    html:not(.dark) .wch-ask-prompt:hover { background: rgba(20,40,80,0.05); border-color: rgba(20,40,80,0.18); }
    .wch-ask-prompt-text { flex: 1 1 auto; min-width: 0; font-size: 13.5px; line-height: 1.45;
      color: var(--primary-ink, var(--primary, #2F6DF6)); }
    html.dark .wch-ask-prompt-text { color: #cfe0ff; }
    .wch-ask-prompt-actions { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 6px; }
    .wch-ask-prompt-btn { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px;
      border: 0; border-radius: 0; background: none; color: var(--text-muted); cursor: pointer;
      opacity: .6; transition: color .14s ease, opacity .14s ease, transform .12s ease; }
    .wch-ask-prompt:hover .wch-ask-prompt-btn { opacity: .85; }
    .wch-ask-prompt-btn:hover { background: none; color: var(--primary-ink, var(--primary, #2F6DF6)); opacity: 1; transform: scale(1.1); }
    .wch-ask-prompt-btn .material-symbols-outlined { font-size: 19px; }
    @media (hover: none) { .wch-ask-prompt-btn { opacity: .85; } }

    .wch-ask-cap-tools { margin: 10px 0 0; padding-top: 9px; border-top: 1px dashed rgba(255,255,255,0.09);
      font-size: 12px; line-height: 1.5; opacity: .72; }
    html:not(.dark) .wch-ask-cap-tools { border-top-color: rgba(20,40,80,0.12); }
    .wch-ask-cap-tools b { font-weight: 700; text-transform: none; letter-spacing: 0; opacity: .95; }
    .wch-ask-cap-tools code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; opacity: .95; }

    /* Clickable attachment thumbnails + the full-size image lightbox they open. */
    .fl-attach-thumb { cursor: zoom-in; }
    .wai-img-scrim { position: fixed; inset: 0; z-index: 4000; display: flex; align-items: center; justify-content: center;
      padding: 32px; background: rgba(10,15,25,0.72); backdrop-filter: blur(3px);
      opacity: 0; transition: opacity .18s ease; }
    .wai-img-scrim.is-open { opacity: 1; }
    .wai-img-modal { position: relative; max-width: min(880px, 92vw); max-height: 88vh; display: flex; flex-direction: column;
      background: var(--surface, #fff); border: 1px solid var(--border-strong, rgba(0,0,0,.12)); border-radius: 16px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.4); overflow: hidden; transform: scale(.96); transition: transform .18s ease; }
    .wai-img-scrim.is-open .wai-img-modal { transform: scale(1); }
    .wai-img-head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--border, rgba(0,0,0,.08)); }
    .wai-img-name { flex: 1 1 auto; min-width: 0; font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .wai-img-close { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; flex-shrink: 0;
      border: 0; border-radius: 8px; background: transparent; color: var(--text-subtle); cursor: pointer; transition: background .12s, color .12s; }
    .wai-img-close:hover { background: var(--surface-2); color: var(--text); }
    .wai-img-close .material-symbols-outlined { font-size: 20px; }
    .wai-img-body { display: flex; align-items: center; justify-content: center; padding: 16px; overflow: auto; background: var(--surface-2, #f2f4f7); }
    .wai-img-body img { max-width: 100%; max-height: calc(88vh - 62px); object-fit: contain; border-radius: 8px; display: block; }

    /* "Background animation" (Admin) — the welcome-only ambient canvas of a
       rotating food-item DNA/RNA helix. It sits above the card surface but below
       the welcome content (z-index 10) and the transcript, never taking pointer
       input; it only fades in while live, and the welcome panel drops its opaque
       fill so the strip reads behind the copy. */
    .sc-bganim-canvas { position: absolute; inset: 0; width: 100%; height: 100%;
      z-index: 1; pointer-events: none; opacity: 0; transition: opacity .55s ease; }
    .sc-card.sc-bganim-live .sc-bganim-canvas { opacity: 1; }
    .sc-card.sc-bganim-live .sc-welcome { background: transparent !important; }

    /* Opacity control that sits just under the "Background animation" toggle. Mirrors
       the streaming-detail sub-row; uses the admin pink accent to match the toggle. */
    .sc-bganim-detail { display: flex; align-items: center; gap: 10px;
      margin: 2px 12px 8px 42px; transition: opacity .15s ease; }
    .sc-bganim-detail-label { font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
      text-transform: uppercase; color: var(--text-muted); white-space: nowrap; }
    .sc-bganim-opacity { flex: 1 1 auto; min-width: 54px; height: 4px; cursor: pointer;
      accent-color: rgb(219, 39, 119); }
    .sc-bganim-opacity-val { font-size: 11px; font-weight: 700; color: var(--text-muted);
      width: 34px; text-align: right; font-variant-numeric: tabular-nums; }
    .sc-bganim-detail.is-disabled { opacity: .45; pointer-events: none; }

    /* While the DNA field is live, the centre owl/pulse logo steps aside — the strand
       carries the owl instead. */
    .sc-card.sc-bganim-live .ws-logo-wrap { display: none; }

    /* Hover card for a product on the DNA field — our surface + tokens, round thumb,
       a caret aimed at the bug, and a brand-blue deep-link into the product's NFP. */
    .wch-food-card { position: absolute; z-index: 13; width: 340px; max-width: calc(100% - 16px);
      padding: 18px; display: flex; flex-direction: column; gap: 16px; pointer-events: auto;
      background: var(--surface, #fff); border: 1px solid var(--border, rgba(15,30,55,.10));
      border-radius: 20px;
      box-shadow: 0 4px 10px rgba(10,20,40,.07), 0 26px 56px rgba(10,20,40,.26);
      font-size: 13px; color: var(--text); transform-origin: left center;
      animation: wchFoodCardIn .24s cubic-bezier(.2,.9,.25,1.15) both; }
    /* Truly hidden by default — an author display value would otherwise beat [hidden]. */
    .wch-food-card[hidden] { display: none !important; }
    .wch-food-card.is-left { transform-origin: right center; }
    /* When the card opens leftward, mirror it so the thumbnail is the right edge that
       covers the bug, and the copy + link fan out to the left. */
    .wch-food-card.is-left .wch-food-card-top { flex-direction: row-reverse; }
    .wch-food-card.is-left .wch-food-card-meta { text-align: right; }
    .wch-food-card.is-left .wch-food-card-link { align-self: flex-start; }
    @keyframes wchFoodCardIn {
      0% { opacity: 0; transform: translateX(-6px) scale(.9); }
      60% { opacity: 1; }
      100% { opacity: 1; transform: none; } }
    .wch-food-card.is-left { animation-name: wchFoodCardInL; }
    @keyframes wchFoodCardInL {
      0% { opacity: 0; transform: translateX(6px) scale(.9); }
      60% { opacity: 1; }
      100% { opacity: 1; transform: none; } }
    .wch-food-card-top { display: flex; align-items: center; gap: 15px; }
    .wch-food-card-thumb { width: 68px; height: 68px; flex: 0 0 auto; border-radius: 50%; overflow: hidden;
      border: 2px solid var(--primary); background: var(--surface-2, #f2f4f7);
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 12%, transparent); }
    .wch-food-card-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .wch-food-card-meta { display: flex; flex-direction: column; min-width: 0; gap: 5px; }
    .wch-food-card-brand { font-size: 11px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase;
      color: var(--primary); }
    .wch-food-card-name { font-size: 17px; font-weight: 700; line-height: 1.25; color: var(--text); }
    /* Plain text link, floated to the right, with an up-right arrow. */
    .wch-food-card-link { align-self: flex-end; display: inline-flex; align-items: center; gap: 4px;
      padding: 0; background: none; border: 0; box-shadow: none; text-decoration: none;
      font-weight: 700; font-size: 14px; color: var(--primary); transition: gap .12s ease; }
    .wch-food-card-link:hover { text-decoration: underline; text-underline-offset: 2px; gap: 7px; }
    .wch-food-card-link .material-symbols-outlined { font-size: 18px; }
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
  return 'On it. The full conversational flow lives in the reference app; this surface mirrors the real WISEcodeAI™ layout and controls.';
}

/* Pick 1–2 short, human status lines describing what WISEcodeAI is actually doing
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

/* The behind-the-scenes reasoning trace for a turn. Where statusStepsFor picks a
   one-liner, this returns the fuller "thinking out loud" narration the transcript
   streams while the answer is being built: an ordered set of MILESTONES, each a
   1–3 word landmark (`key`) plus a big GLOB of smaller, subdued `story` lines.
   Only ONE milestone is on screen at a time — its glob streams in line by line as
   a flowing paragraph, then the whole thing is wiped and replaced by the next
   milestone's (see runReasoningTrace). When the last one lands, the globs are
   gone and only the milestone summary remains: each key + the m:ss elapsed when it
   landed. The story copy is deliberately verbose, WISE-voiced narration — the
   point is to SEE the machine think, so make it read. Routed exactly like
   statusStepsFor so a clicked chip / typed ask narrates on-topic. */
function reasoningTraceFor(text, intent) {
  /* Named milestone sets. Each `story` is a paragraph's worth of lines so the
     live view always has a substantial glob of text to read while it works. */
  const S = {
    generic: [
      { key: 'Reading', story: [
        'Reading your ask twice \u2014 once for the words, once for the want underneath them.',
        'Tracing the thread back through the conversation so nothing lands out of place.',
        'Naming the three things everything hangs on: the brand, the product, the claim.',
        'Setting what looks certain apart from what still deserves a second look.',
        'Sketching the questions I\u2019ll have to answer before I can answer yours.',
        'Deciding where to start so the first step doesn\u2019t undo the last.',
      ] },
      { key: 'Gathering', story: [
        'Walking the WISE Foods registry row by patient row for anything that matches.',
        'Reaching past it into the connected catalogs \u2014 retailer feeds, USDA, whatever\u2019s synced and fresh.',
        'Reconciling the barcodes that agree, and quietly flagging the few that don\u2019t.',
        'Weighing each source by how recently it was touched, because stale data lies without meaning to.',
        'Keeping only the records that earn their place in the answer, letting the rest fall away.',
      ] },
      { key: 'Composing', story: [
        'Folding the pile of facts into something you can actually read.',
        'Leading with the number that matters and tucking the caveats where they belong.',
        'Cutting every sentence that was only there to sound thorough.',
        'Reading it back once in your voice, to be sure it\u2019s useful and not just correct.',
      ] },
    ],
    analytics: [
      { key: 'Reading data', story: [
        'Opening the tables behind this view and letting the columns introduce themselves.',
        'Pulling the rows from the WISE Foods registry that actually back the question.',
        'Cross-referencing the connected sources for anything newer than what I already hold.',
        'Marking the gaps \u2014 the products with no score yet, the fields left politely blank.',
        'Squinting at the outliers to tell the real finding from the fat-fingered typo.',
      ] },
      { key: 'Crunching', story: [
        'Running WISEscore across every matched item, one ingredient list at a time.',
        'Rolling the numbers into the cuts you asked for, and a couple you didn\u2019t, just in case.',
        'Holding each average up to the light to see which ones are hiding a story.',
        'Checking the math twice, because a confident wrong number is worse than no number.',
      ] },
      { key: 'Building view', story: [
        'Laying it out the way an eye reads it: headline metric first, breakdowns beneath.',
        'Choosing the chart that tells the truth fastest and cutting the ones that only decorate.',
        'Labeling everything twice so nothing needs a caption to be understood.',
      ] },
    ],
    compare: [
      { key: 'Gathering', story: [
        'Pulling each item you want to line up and standing them shoulder to shoulder.',
        'Aligning them on the same fields so it\u2019s apples to apples, never apples to marketing.',
        'Filling the blanks from the registry where one side knows what the other forgot.',
        'Making sure I\u2019m comparing the versions that are actually on shelf today.',
      ] },
      { key: 'Scoring', story: [
        'Re-running WISEscore on each so the comparison is today\u2019s, not last quarter\u2019s.',
        'Separating the differences that matter to a shopper from the ones that only matter to a lab.',
        'Noting where two products look identical until you read the eighth ingredient.',
      ] },
      { key: 'Framing it', story: [
        'Setting the side-by-side so the real gaps step forward and the noise steps back.',
        'Deciding what earns bold and what\u2019s content to live in the footnotes.',
      ] },
    ],
    reformulation: [
      { key: 'Reading recipe', story: [
        'Taking the formula apart ingredient by ingredient, the way you\u2019d unpick a seam.',
        'Noting where each one earns its place \u2014 texture, shelf life, cost, or plain old habit.',
        'Marking the two or three that keep this from clearing the Non-UPF bar.',
        'Listening for the ingredient that\u2019s only there because it always has been.',
      ] },
      { key: 'Modeling swaps', story: [
        'Trying substitutions one at a time and watching what moves when they land.',
        'Keeping an eye on cost and the WISEscore together, since fixing one often bruises the other.',
        'Letting the swaps that help stay, and letting go of the clever ones that don\u2019t.',
        'Re-checking the mouthfeel math so \u201ccleaner\u201d never quietly means \u201cworse.\u201d',
      ] },
      { key: 'Composing', story: [
        'Writing up only the changes worth making, in the order I\u2019d make them.',
        'Saying plainly what each swap buys you and what it asks in return.',
      ] },
    ],
    verify: [
      { key: 'Checking rules', story: [
        'Reading the current criteria for this claim, word for careful word.',
        'Reminding myself what the badge promises so I don\u2019t promise more than it does.',
        'Marking the lines that are pass/fail and the ones that ask for judgment.',
      ] },
      { key: 'Screening', story: [
        'Running each eligible UPC through the ingredient screen, line by line.',
        'Flagging the additives that draw a second glance and the ones that draw a stop.',
        'Sorting the clean from the maybe from the not-today.',
        'Double-checking the borderline cases against the source, not the summary.',
      ] },
      { key: 'Composing', story: [
        'Laying out Confirm \u2192 Attest \u2192 Activate as three small steps, not one large one.',
        'Writing the next move so it\u2019s obvious, not merely available.',
      ] },
    ],
    search: [
      { key: 'Searching', story: [
        'Querying the WISE Foods registry for anything that answers to this name.',
        'Widening the net to the connected retailer catalogs when the first pass comes up thin.',
        'Reading past the brand copy to the label underneath it.',
        'Setting aside the near-misses that share a name but nothing else.',
      ] },
      { key: 'Matching UPCs', story: [
        'Reconciling barcodes across sources and trusting the ones that agree.',
        'Pulling the nutrition metadata and checking it\u2019s the version that\u2019s actually on shelf.',
        'Untangling the private-label twins that hide behind the same numbers.',
      ] },
      { key: 'Composing', story: [
        'Bringing the best matches together and putting the closest one on top.',
        'Noting for each why it made the cut, so you don\u2019t have to guess.',
      ] },
    ],
    portfolio: [
      { key: 'Opening', story: [
        'Loading your portfolio and asking it when it last spoke to its sources.',
        'Waiting for the sync state to settle before I trust a single number.',
      ] },
      { key: 'Reading', story: [
        'Reading each product\u2019s score, status, and who can currently see it.',
        'Noticing the ones that slipped \u2014 expired, unscored, or quietly hidden.',
        'Grouping them so the ones that need you cluster near the top.',
      ] },
      { key: 'Composing', story: [
        'Summarizing what stands out and what would thank you for attention first.',
      ] },
    ],
    connect: [
      { key: 'Reaching out', story: [
        'Opening the connection and offering the credentials politely.',
        'Waiting to be recognized before I ask the catalog for anything.',
      ] },
      { key: 'Syncing', story: [
        'Pulling the catalog down and reconciling it against what we already hold.',
        'Letting the fresh records overwrite the stale ones without losing the history.',
        'Counting what changed so I can tell you plainly, not vaguely.',
      ] },
      { key: 'Composing', story: [
        'Confirming what\u2019s newly available and what you can ask of it now.',
      ] },
    ],
    ingest: [
      { key: 'Prepping parser', story: [
        'Warming up the label parser and reminding it what a serving size can disguise.',
        'Deciding which fields to lift first: ingredients, NFP, claims, then the fine print.',
        'Clearing a place to put whatever you hand me next.',
      ] },
      { key: 'Composing', story: [
        'Writing the intake prompt so you can hand me a label, a spec sheet, or a link.',
      ] },
    ],
  };

  const byIntent = {
    customer_profile: 'verify',
    resume_prompt: 'generic',
    faq_intro: 'generic',
    registry_home: 'search',
    add_food_intro: 'ingest',
    edit_food_select: 'portfolio',
  };
  if (intent && byIntent[intent]) return S[byIntent[intent]];

  const q = String(text || '').toLowerCase();
  if (/(dashboard|chart|graph|trend|score|analy|metric|\bdata\b|insight|report|breakdown)/.test(q)) return S.analytics;
  if (/(compar|versus|\bvs\b|benchmark|side by side)/.test(q)) return S.compare;
  if (/(reformulat|recipe|ingredient swap|optimi|substitut)/.test(q)) return S.reformulation;
  if (/(verif|shield|attest|non-upf|clean label|badge)/.test(q)) return S.verify;
  if (/(food|registry|upc|product|search|look ?up|find)/.test(q)) return S.search;
  if (/(portfolio|catalog|inventory)/.test(q)) return S.portfolio;
  if (/(connect|sync|integration|kroger|walmart|instacart|usda)/.test(q)) return S.connect;
  return S.generic;
}

/* The trailing "assembling" milestone, built from the answer HTML the turn is
   about to post. It runs AFTER the thinking milestones so the globs keep talking
   while the visible pieces are laid out — the charts, tables, reports, sources,
   and suggested next steps — and so none of them render until the trace is done.
   Returns null when the answer is plain prose with nothing to assemble. */
function assemblyMilestoneFor(html) {
  const h = String(html || '').toLowerCase();
  const lines = [];
  if (/canvas|<svg|chart|graph|insights|spark/.test(h)) lines.push('Rendering the chart so the shape of the data reads at a glance.');
  if (/<table|wa-tbl/.test(h)) lines.push('Laying the table out row by row, headers pinned to the top.');
  if (/surface-card|report|summarize/.test(h)) lines.push('Stitching the report together section by section.');
  if (/href=|<a\b/.test(h)) lines.push('Attaching the sources so every number stays traceable to where it came from.');
  if (!lines.length) return null;
  lines.push('Bringing the suggested next steps in last, once everything else has settled.');
  return { key: 'Assembling', story: lines };
}

/* Build the in-chat "Agent Settings" overlay from an agent roster. Mirrors the
   #settings-screen markup in pages/ai-chat.html, scoped to the WISEcodeAI card so
   the same panel is available wherever the shared chat is mounted. */
function buildAgentsPanelHtml(agents, id) {
  const row = (a) => `
    <div class="ss-agent-row${a.on ? ' ssr-on' : ''}${a.required ? ' ssr-required' : ''}" id="${id}-ssr-${esc(a.id)}">
      <div class="ss-agent-icon" style="${a.bg ? `background:${esc(a.bg)};` : ''}">
        <span class="material-symbols-outlined" style="color:${esc(a.color || 'var(--primary-ink, var(--primary))')}">${esc(a.icon || 'smart_toy')}</span>
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
      <button type="button" class="ss-back-btn" data-sc="agents-close" title="Back to chat" aria-label="Back to chat"><span class="material-symbols-outlined">arrow_back</span></button>
      <div class="ss-header-icon"><span class="material-symbols-outlined">tune</span></div>
      <div class="ss-header-titles">
        <h2 class="ss-header-title">Agent Settings</h2>
        <p class="ss-header-subtitle"><span id="${id}-ss-active">0</span> of ${agents.length} active · Manage AI agents</p>
      </div>
    </div>
    <div class="ss-body">
      <div class="ss-info-card">
        <div class="ss-info-icon"><span class="material-symbols-outlined">info</span></div>
        <div>
          <p class="ss-info-title">How agents work together</p>
          <p class="ss-info-desc">WISEcodeAI™ orchestrates all active agents automatically. Enable agents based on the tasks you perform most — more agents = richer context, more capabilities. WISEcodeAI™ is always required.</p>
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
 * Cards drive a chat turn on click (handled in mountWISEcodeAIChat) via {intent, ask}.
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
      ? `<span class="ws-sc-lock material-symbols-outlined" title="Coming soon" aria-hidden="true">lock</span>`
      : (c.pill
        ? `<span class="ws-sc-pill ws-sc-pill--${esc(c.pill.tone || 'up')}">${c.pill.icon ? `<span class="material-symbols-outlined">${esc(c.pill.icon)}</span>` : ''}${esc(c.pill.text || '')}</span>`
        : '');
    const lead = isIntro
      ? `<div class="ws-sc-intro-title">${esc(c.title || '')}</div>`
      : `${c.metric != null ? `<div class="ws-sc-metric">${esc(c.metric)}${c.metricUnit ? `<span class="ws-sc-metric-unit">${esc(c.metricUnit)}</span>` : ''}</div>` : ''}<div class="ws-sc-title">${esc(c.title || '')}</div>`;
    const action = locked
      ? `<div class="ws-sc-action ws-sc-action--locked">Coming soon</div>`
      : (c.action
        ? `<div class="ws-sc-action">${esc(c.action)}<span class="material-symbols-outlined">arrow_outward</span></div>`
        : '');
    return `
      <button type="button" class="ws-scorecard${variantClass}" role="listitem" data-card="${i}"${locked ? ' aria-disabled="true" data-locked="1"' : ''}>
        <div class="ws-sc-top">
          <span class="ws-sc-icon ${iconTone}"><span class="material-symbols-outlined">${esc(c.icon || 'insights')}</span></span>
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
        <button type="button" class="ws-sc-scroll ws-sc-scroll--prev" data-sc-scroll="-1" aria-label="Scroll to previous cards" hidden><span class="material-symbols-outlined">chevron_left</span></button>
        <button type="button" class="ws-sc-scroll ws-sc-scroll--next" data-sc-scroll="1" aria-label="Scroll to see more cards"><span class="material-symbols-outlined">chevron_right</span></button>
      </div>
    </div>`;
}

let _seq = 0;

/**
 * Mount the shared WISEcodeAI chat into `rootEl`.
 * @param {HTMLElement} rootEl
 * @param {object} [opts]
 *   title        {string}  topbar title (default 'WISEcodeAI')
 *   agentCount   {number}  "N agents running" pill (default: # of on agents)
 *   agents       {Array}   agent roster for the in-chat settings panel
 *                          [{id,name,version,group,icon,color,bg,tagline,desc,tags,required,on}]
 *   heading      {string}  welcome heading (default 'What can WISEcodeAI help with?')
 *   sub          {string}  welcome subheading
 *   intents      {Array}   welcome intent chips [{intent,label,icon,ask?}] — `ask`
 *                          (optional) is the full question posted as the user's
 *                          line; the chip face still shows the shorter label
 *   intentReplies{object}  intent-id → reply (string|fn) so a clicked chip
 *                          always continues with an on-feature answer
 *   placeholder  {string}  input placeholder
 *   flLabel      {string}  floating label text
 *   disclaimer   {string}  standing AI-limitations note under the input ('' hides)
 *   sourceLabel  {string}  grounding caption appended to each WISEcodeAI reply ('' hides)
 *   statusLabel  {string}  what WISEcodeAI is "doing" while the typing dots show
 *   onIntent     {fn}      (intent,label) => boolean — return true to suppress default reply
 *   onAddMember  {fn}      () => void — "Add team member to chat" popover item
 *   onHistory    {fn}      () => void — "History & Projects" popover item
 *   onToggleWidth{fn}      (isWide) => void — fired when the width toggle flips
 *   reply        {fn}      (text,intent) => html string for WISEcodeAI's response
 * @returns {{ addUser, addWISEcodeAI, reset, root }}
 */
export function mountWISEcodeAIChat(rootEl, opts = {}) {
  if (!rootEl) return null;
  injectChatExtras();
  /* Tag the chat root so the shared docked/sticky-module CSS (injected by
     chat-history.js) can layer the chat ABOVE its flanking History / Turns
     drawers when they tuck in behind it. */
  rootEl.classList.add('wch-chat-anchor');
  const id = `sc${++_seq}`;
  const title = opts.title || 'WISEcodeAI™';
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
  const heading = opts.heading || 'What can WISEcodeAI™ help with?';
  const sub = opts.sub !== undefined ? opts.sub : 'Your AI Verification assistant — NON-UPF & beyond';
  /* Every trademark mark in the welcome heading is dropped a size so it reads as
     a superscript ™ rather than a full-height glyph. */
  const headingHtml = esc(heading).replace(/\u2122/g, '<span class="ws-tm">\u2122</span>');
  /* Opt-in "live" food-count: the first number in the sub line animates — it
     counts up to the seeded total, then keeps ticking upward by small random
     amounts so the corpus feels like it is growing in real time. */
  const subCounter = opts.subCounter === true;
  const subHtml = subCounter
    ? esc(sub).replace(/[\d,]*\d/, (m) => `<span class="ws-count" data-final="${m.replace(/,/g, '')}">${m}</span>`)
    : esc(sub);
  /* Mutable so a host can swap the intent chips at runtime (setIntents) without
     tearing down the chat — e.g. a persistent marketing dock that re-skins its
     quick-actions to match whichever page you're on. */
  let intents = (opts.intents || DEFAULT_INTENTS).slice();
  /* Intent chips are one-shot: a clicked chip advances the conversation, and
     you can't scroll a turn back to re-run it, so a chip that has already
     driven a turn is "spent" — rendered dimmed/opaque and non-interactive.
     Tracked by intent id for THIS surface; a fresh contextual chip set
     (setIntents) or a full reset() clears it. Control chips that open a panel
     rather than advancing the thread (choose_agents, connect_source) are never
     marked spent. */
  const usedIntents = new Set();
  const placeholder = opts.placeholder || 'Type your message';
  /* The "You" avatar mirrors the top-bar profile chip (Arthur Krupsky → "AK").
     When the topbar avatar becomes an image, pass opts.userAvatar with an <img>. */
  const userInitials = opts.userInitials || 'AK';
  /* Resolve the "you" avatar at render time (not once at mount) so it tracks a
     picture set / cleared later on the Organization Profile page: an explicit
     opts.userAvatar (string or getter) wins, else the shared avatar store, else
     the member's initials. */
  const resolveUserAvatar = () => {
    const custom = typeof opts.userAvatar === 'function' ? opts.userAvatar() : opts.userAvatar;
    return custom || userAvatarImg('You') || esc(userInitials);
  };
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
    /* The gold "What can I ask?" chip gets a built-in page-aware answer unless
       the host supplied its own via intentReplies.ask_help above. */
    if (intent === 'ask_help') return askHelpReplyHtml();
    return baseReply(text, intent);
  };

  /* The transcript the gold "What can I ask?" chip produces — page-specific by
     construction: it names the page (derived from the document title) and
     enumerates the surface's OWN quick-action chips, each with its full example
     question where one exists. Because every surface mounts the chat with its
     own chip set (and swaps them via setIntents), the same chip yields a
     different, accurate answer on every page. */
  function askHelpReplyHtml() {
    /* Page identity from the document title — handles both house patterns:
       "WISE · Product Portfolio" and "WISEcodeAI — Reformulation Studio · …". */
    let page = '';
    try {
      const t = String(document.title || '');
      let m = t.match(/^WISE\s*·\s*(.+)$/i);
      if (m) page = m[1];
      else {
        m = t.match(/^WISEcodeAI(?:\u2122)?\s*[—–-]\s*(.+)$/i);
        page = (m ? m[1] : t).split('·')[0];
      }
      page = page.trim();
    } catch (_) { /* non-browser host */ }
    /* Control chips open panels rather than answering questions, so they don't
       belong in a "what can I ask" listing. */
    const CONTROL = new Set([ASK_HELP_INTENT, 'choose_agents', 'connect_source']);
    const rows = intents.filter((c) => c && c.label && !CONTROL.has(c.intent));
    const items = rows.map((c) => {
      const q = c.ask && c.ask !== c.label ? ` — <em>\u201C${esc(c.ask)}\u201D</em>` : '';
      return `<li><strong>${esc(c.label)}</strong>${q}</li>`;
    }).join('');
    const intro = page
      ? `Here\u2019s what you can ask me on <strong>${esc(page)}</strong> — everything below is grounded in what this page can actually do:`
      : 'Here\u2019s what you can ask me on this page:';
    const list = items ? `<ul class="sc-askhelp-list">${items}</ul>` : '';
    const outro = items
      ? 'You can also just type a question in your own words — I\u2019ll route it to the right agents.'
      : 'Just type a question in your own words — I\u2019ll route it to the right agents.';
    return `${intro}${list}${outro}`;
  }
  /* Microcopy (use `!== undefined` so a caller can pass '' to hide). The
     data-handling reassurances now live in the input placeholder, so the
     welcome no longer renders a separate trust-badge row. */
  const disclaimer = opts.disclaimer !== undefined ? opts.disclaimer : DEFAULT_DISCLAIMER;
  const sourceLabel = opts.sourceLabel !== undefined ? opts.sourceLabel : '';
  const statusLabel = opts.statusLabel || `${title} is thinking`;

  /* Opt-in live-activity indicator: a small trio of dots docked under the input
     that quietly pulses whenever WISEcodeAI is working (a typing line is on screen)
     and, on hover, reveals a compact telemetry read-out (tokens, cache, cost,
     turns) for the current turn and the whole conversation. */
  const activityOn = opts.activity === true;

  /* "What can I ask?" affordance — a small gold text link docked below and to
     the LEFT of the input (sharing the row with the activity dots) that opens
     a right-docked side panel (same shell as "Connect a data source"). ON by
     default for every chat mount so it appears in the same place everywhere;
     pass askHelp:false to suppress it on a specific surface. */
  const askHelpOn = opts.askHelp !== false;
  const askHelpLabel = opts.askHelpLabel || 'What can I ask?';

  /* Whenever the "What can I ask?" link is shown, a gold-bordered intent chip
     with the same label ALWAYS rides along in the welcome chip set. Unlike the
     link (which opens the side panel), clicking the chip starts a real chat
     turn: a page-specific transcript of everything you can ask on THIS surface,
     built from the surface's own quick-action chips (see askHelpReplyHtml).
     Appended to every chip set — including runtime swaps via setIntents — and
     never marked "spent", so it's a standing affordance like the link itself. */
  const ASK_HELP_INTENT = 'ask_help';
  const withAskHelpChip = (list) => {
    if (!askHelpOn) return list;
    if (list.some((c) => c && c.intent === ASK_HELP_INTENT)) return list;
    return list.concat({ intent: ASK_HELP_INTENT, label: askHelpLabel, icon: 'help', ask: askHelpLabel });
  };
  intents = withAskHelpChip(intents);

  /* ── "Open module" narration ──────────────────────────────────────────────
     Any WISEcodeAI reply that narrates opening a companion module ("Opened the
     full ranking in Results & Details →", "Spider chart → Visuals", …) has
     that narration stripped from the transcript — the artifacts it points at
     are already previewed above as clickable surface cards, so repeating them
     as trailing chips is redundant. Each directive still leaves an invisible
     marker carrying the module name, so hosts that auto-open a module the
     moment the answer lands (`openModuleByDefault` + `onOpenModule`) keep
     working. `openModules` is the list of module display-names to recognise;
     pass `openChips:false` on a surface (or `openChips:false` in a message's
     meta) to opt out of the transform entirely. */
  const openChipsOn = opts.openChips !== false;
  const openModuleByDefault = opts.openModuleByDefault === true;
  const openModuleNames = (Array.isArray(opts.openModules) && opts.openModules.length
    ? opts.openModules
    : ['Results & Details', 'Visuals', 'References', 'Product Comparison', 'Reformulation'])
    .slice()
    /* Longest first so "Visuals pane" wins over "Visuals" when both are given. */
    .sort((a, b) => b.length - a.length);

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
  /* Shared narrower width for both docked modules while "sticky" (tucked behind
     the chat) — History + Turns adopt the same base so they read as an equal
     pair; drag-resize still overrides it per side. */
  const STICKY_MODULE_W = opts.stickyModulesWidth || 280;
  /* History's sticky drawer defaults to a 240px minimum, then flexes to fill. */
  const HISTORY_STICKY_W = opts.historyStickyWidth || 240;
  /* WISEcodeAI opts: open Turns docked from the start (its own module, never an
     in-chat popover), dress its header like the result panes (three-dot menu +
     width changer), pin a search box above the list, and give each turn Share +
     Note (annotate) controls. */
  const turnsBreakoutDefault = opts.turnsBreakoutDefault === true;
  const turnsDockedControls = opts.turnsDockedControls === true;
  /* Adds a pink "Sticky module" admin toggle to the docked Turns module's
     three-dot menu. ON by default (the module stays tucked behind the chat);
     flipping it off adds `.wch-unsticky` so the host's CSS floats it back out as
     a free-standing card. Only meaningful alongside turnsDockedControls. */
  const turnsStickyToggle = opts.turnsStickyToggle === true;
  const turnsStickyDefault = opts.turnsStickyToggleDefault !== false;
  const turnsSearchOn = opts.turnsSearch === true;
  const turnsShareOn = opts.turnsShare === true;
  const turnsNotesOn = opts.turnsNotes === true;
  /* Per-turn annotations, keyed by a stable hash of the turn's question so they
     survive re-renders and conversation growth. */
  const turnNotes = Object.create(null);
  let turnsQuery = '';
  /* Whether the docked Turns module is tucked "sticky" behind the chat (default)
     vs. floated out as a free-standing card. Toggled from its ⋯ menu when
     `turnsStickyToggle` is on; the host CSS reacts to the `.wch-unsticky` class. */
  let turnsSticky = turnsStickyDefault;
  /* Whether the docked History / Turns modules are tucked in "sticky" behind the
     chat (toggled from the three-dot menu; host applies the actual layout). */
  let stickyOn = opts.stickyModulesDefault === true;
  /* Whether the chat's floating "Outputs & Sources" manifest is hidden via the
     three-dot menu switch (on = hidden). Off by default; the host applies the
     actual show/hide through onToggleOutputs. */
  let outputsHidden = opts.outputsToggleDefault === true;

  /* Answer-quality feedback — a thumbs up / thumbs down (+ copy) row trailing
     each WISEcodeAI answer. Thumbs down reveals a "what was wrong?" chip set so the
     user can qualify the miss. Opt-out via `feedback: false`; reasons are
     configurable via `feedbackReasons`. `opts.onFeedback(verdict, reason)` fires
     on each interaction. */
  const feedbackEnabled = opts.feedback !== false;
  const feedbackReasons = Array.isArray(opts.feedbackReasons) && opts.feedbackReasons.length
    ? opts.feedbackReasons
    : DEFAULT_FEEDBACK_REASONS;
  const accurateReasons = Array.isArray(opts.accurateReasons) && opts.accurateReasons.length
    ? opts.accurateReasons
    : DEFAULT_ACCURATE_REASONS;
  /* The trailing "more connectors" three-dot button is opt-out: when every
     source is already shown in the rail (opts.connectorsMore === false) it's
     redundant, so callers can drop it. */
  const showConnectorMore = opts.connectorsMore !== false;
  const connectorLogo = (c) => {
    const color = esc(c.color || 'var(--primary)');
    /* Fallback mark shown if the brand logo image is missing / fails to load. */
    const fallback = c.icon
      ? `<span class="material-symbols-outlined">${esc(c.icon)}</span>`
      : esc(c.mono || (c.name || '?').slice(0, 1));
    /* Prefer the real brand logo (an image URL) when provided. */
    if (c.logo) {
      return `<span class="sc-connector-logo sc-connector-logo--img" style="--cxc:${color}"><img class="sc-connector-logo-img" src="${esc(c.logo)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="sc-connector-logo-fb">${fallback}</span></span>`;
    }
    return c.icon
      ? `<span class="sc-connector-logo" style="--cxc:${color}"><span class="material-symbols-outlined">${esc(c.icon)}</span></span>`
      : `<span class="sc-connector-logo sc-connector-logo--mono" style="--cxc:${color}">${esc(c.mono || (c.name || '?').slice(0, 1))}</span>`;
  };
  const connectorsHtml = (connectors.length && showConnectorsRail)
    ? `<div class="sc-connectors" id="${id}-connectors" aria-label="${esc(connectorsLabel || 'Connectors')}">
        ${connectorsLabel ? `<span class="sc-connectors-label"><span class="material-symbols-outlined">hub</span>${esc(connectorsLabel)}</span>` : ''}
        <div class="sc-connectors-rail" id="${id}-connectors-rail" role="list">
          ${connectors.map((c) =>
            `<button type="button" class="sc-connector${c.connected ? ' is-connected' : ''}" role="listitem" data-connector="${esc(c.id || c.name)}" title="${c.connected ? 'Connected · ' : 'Connect '}${esc(c.name)}">
              ${connectorLogo(c)}
              <span class="sc-connector-name">${esc(c.name)}</span>
              <span class="sc-connector-tick material-symbols-outlined" aria-hidden="true">${c.connected ? 'check' : 'add'}</span>
            </button>`
          ).join('')}
        </div>
        ${showConnectorMore ? `<button type="button" class="sc-connector-more" id="${id}-connectors-more" title="More connectors" aria-label="More connectors"><span class="material-symbols-outlined">more_vert</span></button>` : ''}
      </div>`
    : '';

  /* Intent chips ALWAYS render as a plain wrapped flex grid — the single-line
     scrolling "carousel" variant (horizontal scroll row with chevron buttons +
     edge fades) has been retired everywhere, so `opts.chipsFlow` is ignored on
     purpose and no caller can bring the carousel back. */

  const buildChipsHtml = () => intents.map((c, i) => {
    const spent = !!(c && c.intent && usedIntents.has(c.intent));
    /* The "What can I ask?" chip wears the gold border that pairs it with the
       below-input gold link of the same name. */
    const gold = c && c.intent === ASK_HELP_INTENT ? ' ws-intent-chip--askhelp' : '';
    return `<button type="button" class="chip ws-intent-chip${gold}${spent ? ' is-used' : ''}" data-intent="${i}"${spent ? ' aria-disabled="true" tabindex="-1"' : ''}><span class="material-symbols-outlined">${esc(c.icon || 'bolt')}</span>${esc(c.label)}</button>`;
  }).join('');
  let chipsHtml = buildChipsHtml();

  const chipsContainerHtml = `<div class="ws-chips" id="${id}-chips" role="list" aria-label="Quick actions">${chipsHtml}</div>`;

  /* Persistent intent-chip rail — an opt-in (`persistChips: true`) horizontal
     rail that stays docked above the input for the whole conversation, so every
     possible conversational route is always one tap away (not just on the
     welcome screen). Rendered here, revealed once the welcome is dismissed. */
  /* The persistent intent-chip rail docked above the input was itself a single-
     line scrolling carousel, so it is retired too — intent chips only ever live
     on the welcome as wrapped chips. Forced off regardless of caller opts. */
  const persistChips = false;
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
  /* Remembered preference for the welcome INTENT CHIPS (the small suggested-
     action chips right below the overview cards). Toggled from the three-dot
     menu and persisted per surface. Chips are SHOWN by default; a host can hide
     them on first load with `chipsHiddenDefault: true`, and a stored preference
     always wins so the user's own choice sticks across reloads. */
  const CHIPS_HIDE_PREF_KEY = opts.chipsHidePrefKey || `${opts.historyKey || 'wise-wiseai-chat'}-chips-hidden`;
  let chipsHidden = opts.chipsHiddenDefault === true;
  try {
    const stored = localStorage.getItem(CHIPS_HIDE_PREF_KEY);
    if (stored === '1') chipsHidden = true;
    else if (stored === '0') chipsHidden = false;
  } catch (_) {}
  /* "Compact spacing" (three-dot ▸ Admin, pink) trims the chat container's chrome
     padding APP-WIDE so the transcript, the avatars and the input rail all get
     more room. It flips a single global `chat-compact` class on <html>, so every
     mounted chat module responds at once; the preference is shared (one key) and
     persisted, and applied here on mount so a reload keeps the chosen density. */
  const COMPACT_PREF_KEY = 'wise:chat-compact';
  /* ON by default — the tighter spacing is the standard density. A stored '0'
     (the user explicitly turned it OFF) always wins so their choice sticks. */
  let compactDefaultOn = true;
  try {
    if (localStorage.getItem(COMPACT_PREF_KEY) === '0') compactDefaultOn = false;
  } catch (_) {}
  document.documentElement.classList.toggle('chat-compact', compactDefaultOn);
  /* "Brand AI text" (three-dot ▸ Admin, pink) recolours the transcript APP-WIDE:
     every WISEcodeAI line's copy takes the brand blue, while the member's own
     lines keep the default (near-black) ink. Like Compact spacing it flips one
     global class on <html> (chat-brandtext) so every mounted chat module — and
     every transcript across the app — responds at once; the shared preference is
     persisted and re-applied on mount so a reload keeps the chosen scheme. */
  const BRANDTEXT_PREF_KEY = 'wise:chat-brandtext';
  /* OFF by default — the standard scheme keeps both speakers in the same ink.
     A stored '1' (the user turned it ON) always wins so their choice sticks. */
  let brandtextDefaultOn = false;
  try {
    if (localStorage.getItem(BRANDTEXT_PREF_KEY) === '1') brandtextDefaultOn = true;
  } catch (_) {}
  document.documentElement.classList.toggle('chat-brandtext', brandtextDefaultOn);
  /* "Background animation" (three-dot ▸ Admin, pink) — an admin-only ambient
     backdrop for the WELCOME state only: a DNA/RNA double helix that chain-links a
     run of our real product photos as round thumbnails, with brand-blue backbones +
     base-pair rungs. It rides a tilted axis that drops left→right, its loops crawl
     end-to-end slowly, and the strand expands and contracts as products swap
     front/back in 3-D. It plays solely on the welcome screen; the moment the member
     acts (submits a
     prompt, taps an intent chip or scorecard) the transcript advances via
     hideWelcome(), which stops it.
     OFF by default; a stored '1' restores it. The choice is shared APP-WIDE (one
     key, broadcast on wise:chat-bg-anim) so every mounted chat's switch follows. */
  const BGANIM_PREF_KEY = 'wise:chat-bg-anim';
  let bgAnimOn = false;
  try { if (localStorage.getItem(BGANIM_PREF_KEY) === '1') bgAnimOn = true; } catch (_) {}
  /* Opacity of the background animation (0.1–1). Shared APP-WIDE (one key, broadcast
     on wise:chat-bg-anim-opacity), adjustable from the slider below the toggle. */
  const BGANIM_OPACITY_KEY = 'wise:chat-bg-anim-opacity';
  /* Default opacity keys on how many panes the chat occupies: a single- or
     double-pane (single/double width) chat gets a subtle 30% field, while any
     wider layout (triple/fill) opens it up to a bolder 65%. This default holds
     until the member drags the opacity slider, at which point their explicit
     choice (`bgAnimOpacityUserSet`) takes over app-wide. */
  let bgAnimOpacity = 0.3;
  let bgAnimOpacityUserSet = false;
  try { const s = parseInt(localStorage.getItem(BGANIM_OPACITY_KEY), 10); if (!isNaN(s)) { bgAnimOpacity = Math.max(0.1, Math.min(1, s / 100)); bgAnimOpacityUserSet = true; } } catch (_) {}
  /* Pane-count default: single/double-pane → 0.30, anything wider → 0.65. */
  function paneDefaultBgAnimOpacity() {
    const wide = rootEl.classList.contains('panel-triple') || rootEl.classList.contains('panel-fill');
    return wide ? 0.65 : 0.30;
  }
  /* The opacity actually applied: the member's explicit slider choice when set,
     otherwise the pane-count default (recomputed live so a width change re-tunes
     a running field on its next frame). */
  function effectiveBgAnimOpacity() {
    return bgAnimOpacityUserSet ? bgAnimOpacity : paneDefaultBgAnimOpacity();
  }
  /* "Response streaming" (three-dot menu) — how much of WISEcodeAI's thinking is
     shown before an answer lands. A three-way choice, shared APP-WIDE (one key,
     broadcast on the wise:chat-stream-level event) so every mounted chat module
     stays in lockstep. It ALWAYS starts each load at 'full' (see below); an
     in-session change is honoured everywhere but does not persist past a reload:
       • 'full'  — the full reasoning trace: every milestone step PLUS the
                   subdued "glob" story text that streams in beneath each
                   (the default, unchanged behaviour).
       • 'steps' — the milestone STEPS only, appearing one after another, with
                   NONE of the glob story text in between them.
       • 'final' — no trace at all: just a brief thinking beat, then the answer.
     The host can seed the initial mode with `streamLevelDefault`, but each load
     otherwise resets to 'full' — a stored preference no longer forces a narrower
     level (so it always defaults to the fullest detail). */
  const STREAM_PREF_KEY = 'wise:chat-stream-level';
  const STREAM_LEVELS = ['full', 'steps', 'final'];
  /* Every load starts at 'full' — the fullest reasoning trace — regardless of
     any previously stored choice. The host can still seed a different starting
     mode with `streamLevelDefault`, but a stale saved preference never forces a
     narrower level; the user's in-session picks below persist across sibling
     chats (and are written for that session) but do NOT survive a reload. */
  let streamLevel = STREAM_LEVELS.includes(opts.streamLevelDefault) ? opts.streamLevelDefault : 'full';
  /* Master "Response streaming" on/off switch (regular brand-blue, not Admin).
     ON (the default) streams the thinking at the chosen level above; OFF skips
     the trace entirely — the answer just lands after the briefest beat. Shared
     APP-WIDE like the level (own key, broadcast on wise:chat-stream-on) and
     persisted; only an explicit stored '0' keeps it off. */
  const STREAM_ON_PREF_KEY = 'wise:chat-stream-on';
  let streamOn = true;
  try {
    if (localStorage.getItem(STREAM_ON_PREF_KEY) === '0') streamOn = false;
  } catch (_) {}
  const persistChipsHtml = persistChips
    ? `<div class="ws-chips-bar ws-chips-wrap" id="${id}-pchips-wrap" aria-label="Quick actions">
        <div class="ws-chips" id="${id}-pchips" role="list">${chipsHtml}</div>
        <button type="button" class="ws-sc-scroll ws-sc-scroll--prev" data-pchip-scroll="-1" aria-label="Scroll to previous actions" hidden><span class="material-symbols-outlined">chevron_left</span></button>
        <button type="button" class="ws-sc-scroll ws-sc-scroll--next" data-pchip-scroll="1" aria-label="Scroll to see more actions"><span class="material-symbols-outlined">chevron_right</span></button>
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
        `<button type="button" class="topbar-menu-item" data-menulink="${esc(m.key)}"><span class="material-symbols-outlined topbar-menu-icon">${esc(m.icon || 'chevron_right')}</span><span>${esc(m.label || m.key)}</span></button>`
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
            <span class="material-symbols-outlined">smart_toy</span>
            <span class="agents-count-pill" id="${id}-count">${esc(agentCount)}</span>
            <span>agents running</span>
          </button>
        </div>
      </div>`}
      <div class="sc-topbar-controls">
        <div class="panel-more-wrap">
        <button type="button" class="panel-more-btn" id="${id}-more" aria-haspopup="menu" aria-expanded="false" aria-controls="${id}-more-pop" title="More options"><span class="material-symbols-outlined">more_vert</span></button>
        <div class="topbar-popover hidden" id="${id}-more-pop" role="menu">
          ${menuLinksHtml}
          <button type="button" class="topbar-menu-item" data-sc="new"><span class="material-symbols-outlined topbar-menu-icon">add</span><span>Start new conversation</span></button>
          <button type="button" class="topbar-menu-item" data-sc="export"><span class="material-symbols-outlined topbar-menu-icon">download</span><span>Export conversation</span></button>
          <button type="button" class="topbar-menu-item" data-sc="share"><span class="material-symbols-outlined topbar-menu-icon">share</span><span>Share</span></button>
          ${showTurns ? `<div class="topbar-menu-divider"></div>
          <button type="button" class="topbar-menu-item topbar-menu-item--admin sc-mcp-item" data-sc="turns" role="menuitemcheckbox" aria-checked="false"><span class="material-symbols-outlined topbar-menu-icon">alt_route</span><span>Turns</span><span class="topbar-menu-badge">Admin</span><span class="sc-switch" aria-hidden="true"></span></button>` : ''}
          ${(opts.stickyModules === true && opts.stickyModulesMenu !== false) ? `<button type="button" class="topbar-menu-item sc-mcp-item" data-sc="sticky" role="menuitemcheckbox" aria-checked="false"><span class="material-symbols-outlined topbar-menu-icon">dock_to_right</span><span>Sticky modules</span><span class="sc-switch" aria-hidden="true"></span></button>` : ''}
          ${opts.outputsToggle === true ? `<button type="button" class="topbar-menu-item topbar-menu-item--admin sc-mcp-item" data-sc="outputs" role="menuitemcheckbox" aria-checked="false"><span class="material-symbols-outlined topbar-menu-icon">dashboard_customize</span><span>Hide outputs &amp; sources</span><span class="topbar-menu-badge">Admin</span><span class="sc-switch" aria-hidden="true"></span></button>` : ''}
          ${showConnectorsPanel ? `<div class="topbar-menu-divider"></div>
          <button type="button" class="topbar-menu-item" data-sc="connect"><span class="material-symbols-outlined topbar-menu-icon">hub</span><span>Connect a data source</span></button>` : ''}
          ${opts.mcpToggle === true ? `<button type="button" class="topbar-menu-item sc-mcp-item" data-sc="mcp-toggle" role="menuitemcheckbox" aria-checked="false"><span class="material-symbols-outlined topbar-menu-icon">dns</span><span>MCP server</span><span class="sc-switch" aria-hidden="true"></span></button>` : ''}
          <div class="topbar-menu-divider"></div>
          ${scorecardsHtml ? `<button type="button" class="topbar-menu-item topbar-menu-item--admin" data-sc="toggle-cards"><span class="material-symbols-outlined topbar-menu-icon" id="${id}-cards-icon">visibility</span><span id="${id}-cards-label">Show overview cards</span><span class="topbar-menu-badge">Admin</span></button>` : ''}
          ${intents.length ? `<button type="button" class="topbar-menu-item topbar-menu-item--admin" data-sc="toggle-intent-chips"><span class="material-symbols-outlined topbar-menu-icon" id="${id}-chips-icon">visibility_off</span><span id="${id}-chips-label">Hide intent chips</span><span class="topbar-menu-badge">Admin</span></button>` : ''}
          <button type="button" class="topbar-menu-item topbar-menu-item--admin sc-mcp-item sc-compact-item" data-sc="compact" role="menuitemcheckbox" aria-checked="false"><span class="material-symbols-outlined topbar-menu-icon">density_small</span><span>Compact spacing</span><span class="topbar-menu-badge">Admin</span><span class="sc-switch sc-switch--pink" aria-hidden="true"></span></button>
          <button type="button" class="topbar-menu-item topbar-menu-item--admin sc-mcp-item sc-brandtext-item" data-sc="brandtext" role="menuitemcheckbox" aria-checked="false"><span class="material-symbols-outlined topbar-menu-icon">format_color_text</span><span>Brand AI text</span><span class="topbar-menu-badge">Admin</span><span class="sc-switch sc-switch--pink" aria-hidden="true"></span></button>
          <button type="button" class="topbar-menu-item topbar-menu-item--admin sc-mcp-item sc-bganim-item" data-sc="bg-anim" role="menuitemcheckbox" aria-checked="false"><span class="material-symbols-outlined topbar-menu-icon">animation</span><span>Background animation</span><span class="topbar-menu-badge">Admin</span><span class="sc-switch sc-switch--pink" aria-hidden="true"></span></button>
          <div class="sc-bganim-detail">
            <span class="sc-bganim-detail-label">Opacity</span>
            <input type="range" class="sc-bganim-opacity" min="10" max="100" step="5" value="90" aria-label="Background animation opacity">
            <span class="sc-bganim-opacity-val">90%</span>
          </div>
          ${opts.activityStrip !== false ? `<button type="button" class="topbar-menu-item sc-mcp-item sc-actstrip-item" data-sc="activity-strip" role="menuitemcheckbox" aria-checked="false"><span class="material-symbols-outlined topbar-menu-icon">timeline</span><span>Activity strip</span><span class="sc-switch" aria-hidden="true"></span></button>` : ''}
          <div class="topbar-menu-divider"></div>
          <button type="button" class="topbar-menu-item sc-mcp-item sc-stream-item" data-sc="stream-toggle" role="menuitemcheckbox" aria-checked="true"><span class="material-symbols-outlined topbar-menu-icon">stream</span><span>Response streaming</span><span class="sc-switch" aria-hidden="true"></span></button>
          <div class="sc-stream-detail">
            <span class="sc-stream-detail-label">Streaming detail</span>
            <div class="sc-stream-seg" role="radiogroup" aria-label="Response streaming detail">
              <button type="button" class="sc-stream-seg-btn is-on" data-sc="stream-level" data-stream="full" role="radio" aria-checked="true" title="Full thinking" aria-label="Full thinking">Full</button>
              <button type="button" class="sc-stream-seg-btn" data-sc="stream-level" data-stream="steps" role="radio" aria-checked="false" title="Steps only" aria-label="Steps only">Steps</button>
              <button type="button" class="sc-stream-seg-btn" data-sc="stream-level" data-stream="final" role="radio" aria-checked="false" title="Final only" aria-label="Final only">Final</button>
            </div>
          </div>
          <div class="topbar-menu-divider"></div>
          <button type="button" class="topbar-menu-item topbar-menu-item--danger" data-sc="close"><span class="material-symbols-outlined topbar-menu-icon">close</span><span>Close conversation</span></button>
        </div>
        </div>
        <button type="button" class="panel-width-toggle-btn" id="${id}-width" aria-pressed="false" title="Width (single) — tap to widen" aria-label="WISEcodeAI™ module width"><span class="material-symbols-outlined">width_normal</span></button>
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
        <h1 class="ws-heading">${headingHtml}</h1>
        ${sub ? `<p class="ws-sub">${subHtml}</p>` : ''}
        ${scorecardsHtml}
        ${chipsContainerHtml}
      </div>
      <div class="sc-settings sc-hidden" id="${id}-settings">${buildAgentsPanelHtml(agents, id)}</div>
    </div>

    ${persistChipsHtml}

    <div class="chat-input-rail">
      <div class="sc-input-row">
        <div class="fl-input-wrap fl-input-wrap--lead fl-input-wrap--stacked">
          <div class="fl-more-wrap">
            <button type="button" class="fl-icon-btn fl-more-btn" id="${id}-fl-more" title="Attach" aria-haspopup="menu" aria-expanded="false"><span class="material-symbols-outlined">add</span></button>
            <div class="fl-more-popover fl-more-popover--left" id="${id}-fl-pop" role="menu">
              <button type="button" class="fl-more-item" data-sc="attach"><span class="material-symbols-outlined">attach_file</span><span>Attach</span></button>
              <button type="button" class="fl-more-item" data-sc="camera"><span class="material-symbols-outlined">photo_camera</span><span>Camera</span></button>
              <button type="button" class="fl-more-item" data-sc="voice"><span class="material-symbols-outlined">mic</span><span>Voice</span></button>
              <div class="fl-more-divider" role="separator"></div>
              <button type="button" class="fl-more-item" data-sc="attach-example"><span class="material-symbols-outlined">burst_mode</span><span>Load 3 example images</span></button>
            </div>
          </div>
          <div class="fl-input-col">
            <div class="fl-model-row">
              ${buildModelSelectorHtml(id)}
            </div>
            <div class="fl-input-line">
              <textarea class="fl-input" id="${id}-input" placeholder="${esc(placeholder)}" rows="1" autocomplete="off"></textarea>
            </div>
            <div class="fl-attachments" id="${id}-fl-attach" aria-label="Pending attachments"></div>
          </div>
          <button type="button" class="sc-send" id="${id}-send" title="Send"><span class="material-symbols-outlined">send</span></button>
        </div>
      </div>
      ${(askHelpOn || activityOn) ? `<div class="sc-belowinput${askHelpOn ? ' sc-belowinput--ask' : ''}">
        ${askHelpOn ? `<button type="button" class="sc-ask-help" id="${id}-ask-help" data-sc="ask-help" aria-label="${esc(askHelpLabel)}"><span aria-hidden="true">${shimmerLetters(askHelpLabel)}</span></button>` : ''}
        ${activityOn ? buildActivityHtml(id, title) : ''}
      </div>` : ''}
      ${connectorsHtml}
      ${disclaimer ? `<p class="sc-disclaimer"><span class="material-symbols-outlined">shield</span>${esc(disclaimer)}</p>` : ''}
    </div>`;

  const messages = rootEl.querySelector(`#${id}-messages`);
  const welcome = rootEl.querySelector(`#${id}-welcome`);
  const input = rootEl.querySelector(`#${id}-input`);
  const settings = rootEl.querySelector(`#${id}-settings`);
  const countPill = rootEl.querySelector(`#${id}-count`);
  const activeLabel = rootEl.querySelector(`#${id}-ss-active`);

  /* Follow the conversation without losing the reader's place. Advances the
     scroll toward the bottom, but never pushes the reader's latest message
     above the top of the viewport — a long answer stops there, so the reader
     keeps reading from where they typed instead of being thrown to the very
     end. Never scrolls back up, and once the reader has scrolled away from
     the live edge we leave them alone (pass `force` — a fresh user action —
     to re-engage). scrollToEnd() keeps the old jump-to-bottom for
     whole-thread loads (history restore, forks). */
  const scrollDown = (force) => {
    if (!messages) return;
    const bottom = Math.max(0, messages.scrollHeight - messages.clientHeight);
    const yours = messages.querySelectorAll('.sc-line-you');
    const anchor = yours.length ? yours[yours.length - 1] : null;
    let target = bottom;
    if (anchor) {
      const cap = anchor.getBoundingClientRect().top - messages.getBoundingClientRect().top + messages.scrollTop - 10;
      target = Math.min(bottom, Math.max(0, cap));
    }
    const last = messages.__followPos;
    if (!force && typeof last === 'number' && messages.scrollTop < last - 48) return;
    if (force || target > messages.scrollTop) messages.scrollTop = target;
    messages.__followPos = messages.scrollTop;
  };
  const scrollToEnd = () => {
    if (!messages) return;
    messages.scrollTop = messages.scrollHeight;
    messages.__followPos = messages.scrollTop;
  };

  /* Reflect the message scroll position onto the card. The floated header
     controls (⋯ + width) only paint their opaque backing circle once content
     has actually scrolled up underneath them — at the very top there's nothing
     beneath the icons, so they stay chrome-free. See .sc-card.sc-scrolled. */
  if (messages) {
    const syncScrolled = () => rootEl.classList.toggle('sc-scrolled', messages.scrollTop > 4);
    messages.addEventListener('scroll', syncScrolled, { passive: true });
    syncScrolled();
  }

  /* Kick off the live food-count animation (opt-in via `subCounter:true`). */
  if (subCounter && welcome) {
    const countEl = welcome.querySelector('.ws-count');
    if (countEl) startFoodCounter(countEl);
  }

  /* ── Live-activity indicator (opt-in via `activity: true`) ──────────────────
     A small trio of dots under the input that pulses whenever WISEcodeAI is working
     (a typing line is on screen) and, on hover, reveals a compact telemetry
     read-out. The numbers are illustrative — we accrue believable token / cache
     / cost figures per turn so the read-out feels live across a conversation. */
  const activityEl = rootEl.querySelector(`#${id}-activity`);
  const activityTurnEl = rootEl.querySelector(`#${id}-activity-turn`);
  const activityConvEl = rootEl.querySelector(`#${id}-activity-conv`);
  const telemetry = { turns: 0, ops: 0, tools: 0, tokIn: 0, tokOut: 0, cached: 0, cost: 0, turnStart: 0, last: null };
  const fmtTok = (n) => {
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
    return String(Math.round(n));
  };
  const fmtDur = (ms) => {
    const s = Math.max(1, Math.round(ms / 1000));
    return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
  };
  function renderActivity() {
    if (!activityEl) return;
    if (telemetry.last) {
      const t = telemetry.last;
      const pct = t.tokIn ? Math.round((t.cached / t.tokIn) * 100) : 0;
      if (activityTurnEl) activityTurnEl.innerHTML =
        `${fmtTok(t.tokIn)} in / ${fmtTok(t.tokOut)} out · <em>${fmtTok(t.cached)} cached (${pct}%)</em> · `
        + `<b>$${t.cost.toFixed(4)}</b> · ${fmtDur(t.dur)} · ${t.ops} ops · ${t.tools} tools`;
    } else if (activityTurnEl) {
      activityTurnEl.innerHTML = 'Idle — <span class="sc-activity-muted">nothing running</span>';
    }
    if (activityConvEl) {
      if (telemetry.turns === 0) {
        activityConvEl.innerHTML = 'No turns yet';
      } else {
        const pct = telemetry.tokIn ? Math.round((telemetry.cached / telemetry.tokIn) * 100) : 0;
        activityConvEl.innerHTML =
          `${fmtTok(telemetry.tokIn)} in / ${fmtTok(telemetry.tokOut)} out · <em>${fmtTok(telemetry.cached)} cached (${pct}%)</em> · `
          + `<b>$${telemetry.cost.toFixed(2)}</b> · ${telemetry.turns} turn${telemetry.turns === 1 ? '' : 's'}`;
      }
    }
  }
  /* Fold a finished turn's usage into the running conversation totals. Values are
     synthesized (with a little jitter) so the read-out reads like a real meter. */
  function accrueTurn() {
    const rnd = (a, b) => a + Math.random() * (b - a);
    const tokIn = Math.round(rnd(6000, 22000));
    const tokOut = Math.round(rnd(400, 2600));
    const cached = Math.round(tokIn * rnd(0.7, 0.9));
    const cost = +(tokIn / 1e6 * 0.9 + tokOut / 1e6 * 4.5).toFixed(4);
    const ops = Math.round(rnd(1, 4));
    const tools = Math.round(rnd(0, 3));
    const dur = telemetry.turnStart ? (Date.now() - telemetry.turnStart) : Math.round(rnd(2000, 9000));
    telemetry.turns += 1;
    telemetry.tokIn += tokIn; telemetry.tokOut += tokOut; telemetry.cached += cached;
    telemetry.cost += cost; telemetry.ops += ops; telemetry.tools += tools;
    telemetry.last = { tokIn, tokOut, cached, cost, ops, tools, dur };
    renderActivity();
  }
  /* Watch the transcript for the presence of a typing line and mirror it onto
     the indicator's working state — decoupled from every showTyping call site. */
  function setActivityWorking(on) {
    if (!activityEl) return;
    activityEl.classList.toggle('is-thinking', !!on);
    if (on && !telemetry.turnStart) telemetry.turnStart = Date.now();
  }
  if (activityEl && messages) {
    const activityObserver = new MutationObserver(() => {
      const typing = !!messages.querySelector('.sc-line-typing');
      setActivityWorking(typing);
      if (!typing && telemetry.turnStart) { accrueTurn(); telemetry.turnStart = 0; }
    });
    activityObserver.observe(messages, { childList: true, subtree: true });
    renderActivity();
  }

  /* Inline intent chips — an opt-in (`inlineChips: true`) block of suggested
     actions that lives IN the transcript, trailing the latest WISEcodeAI turn, just
     like a normal chat's suggested replies (NOT a docked bottom carousel). We
     keep a single element and re-park it at the end of the thread after every
     reply, and detach it while the user is typing / WISEcodeAI is thinking. */
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

  /* Reflect the intent-chips preference: a root class hides the welcome intent
     chips (the small suggested-action chips right below the overview cards).
     The three-dot menu item's icon + label flip to match. */
  function syncChips() {
    rootEl.classList.toggle('sc-intent-chips-hidden', chipsHidden);
    const ci = rootEl.querySelector(`#${id}-chips-icon`);
    const cl = rootEl.querySelector(`#${id}-chips-label`);
    if (ci) ci.textContent = chipsHidden ? 'visibility' : 'visibility_off';
    if (cl) cl.textContent = chipsHidden ? 'Show intent chips' : 'Hide intent chips';
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

  function addUser(text, atts) {
    if (!messages) return;
    detachInlineChips(); /* chips reappear after WISEcodeAI's next reply */
    let attHtml = '';
    if (Array.isArray(atts) && atts.length) {
      const items = atts.map((a) => {
        const thumb = a.src
          ? `<span class="sc-att-thumb" style="background-image:url('${String(a.src).replace(/'/g, '%27')}')"></span>`
          : `<span class="sc-att-thumb sc-att-thumb--icon"><span class="material-symbols-outlined">image</span></span>`;
        return `<span class="sc-att-chip" title="${esc(a.name)}">${thumb}<span class="sc-att-name">${esc(a.name)}</span></span>`;
      }).join('');
      attHtml = `<div class="sc-att-row">${items}</div>`;
    }
    const bodyText = text ? esc(text) : '';
    messages.insertAdjacentHTML('beforeend',
      `<div class="sc-line sc-line-you"><span class="sc-avatar sc-avatar-you" role="img" aria-label="You" data-initials="${esc(userInitials)}">${resolveUserAvatar()}</span><div class="sc-line-body">${attHtml}${bodyText}<div class="sc-line-meta"><span class="sc-line-time">${esc(nowLabel())}</span></div></div></div>`);
    scrollDown(true); /* fresh user action — always bring their message into view */
    refreshDockedTurns();
  }
  /* Actions row appended beneath a WISEcodeAI answer. Left cluster: copy + thumbs
     up / thumbs down (thumbs down reveals the reason chips, see feedbackReasons).
     Right cluster (pinned far-right): re-run this prompt in a new chat
     (auto_read_play), edit-then-run in a new chat (bubble), fork the whole turn
     (alt_route), and the turn's ID (e.g. #6d7a). Rendered with Material Symbols
     so the idle state reads as outlined glyphs and the active state fills in. */
  /* A reason pop-over (chip set + optional free-form note) anchored to a
     thumbs button. `kind` is 'up' | 'down' so the up / down flows can host
     their own intents and share one set of interaction handlers. */
  function reasonsPopoverHtml(kind, reasons, label, placeholder) {
    const chips = reasons.map((r) =>
      `<button type="button" class="chip sc-fb-reason" data-reason="${esc(r.reason)}">${esc(r.label)}</button>`
    ).join('');
    return `<div class="sc-fb-reasons sc-fb-reasons--${kind}" role="menu" aria-label="${esc(label)}" hidden>
              <span class="sc-fb-reasons-label">${esc(label)}</span>
              <div class="sc-fb-reason-chips">${chips}</div>
              <div class="sc-fb-form">
                <textarea class="sc-fb-input" rows="2" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}"></textarea>
                <button type="button" class="chip sc-fb-send" data-fb-send="${kind}">Send</button>
              </div>
            </div>`;
  }
  function feedbackRowHtml(timeLabel) {
    const tid = makeTurnId();
    const upPop = reasonsPopoverHtml('up', accurateReasons, 'What was accurate?', 'What worked? (optional)');
    const downPop = reasonsPopoverHtml('down', feedbackReasons, 'What wasn\u2019t right?', 'Tell us more (optional)');
    const time = timeLabel != null ? timeLabel : nowLabel();
    /* The timestamp and the turn controls (re-run / edit / fork + turn ID) no
       longer sit strewn across the meta row — they're tucked behind a single
       horizontal three-dot button floated to the far right of the thumbs, and
       spill out into a small floating menu on click. The left of the row stays
       the quick-hit trio: copy, thumbs up, thumbs down. */
    return `<div class="sc-fb-wrap">
        <div class="sc-fb" role="group" aria-label="Answer actions">
          <span class="sc-fb-copy-wrap">
            <button type="button" class="sc-fb-btn" data-fb="copy" data-tip="Copy answer" aria-label="Copy answer"><span class="material-symbols-outlined">content_copy</span></button>
            <span class="sc-fb-copied" role="status" aria-hidden="true"><span class="material-symbols-outlined">check</span>Copied</span>
          </span>
          <span class="sc-fb-up-wrap">
            <button type="button" class="sc-fb-btn" data-fb="up" data-tip="Accurate" aria-label="Mark accurate" aria-haspopup="true" aria-pressed="false" aria-expanded="false"><span class="material-symbols-outlined">thumb_up</span></button>
            ${upPop}
          </span>
          <span class="sc-fb-down-wrap">
            <button type="button" class="sc-fb-btn" data-fb="down" data-tip="Not accurate" aria-label="Mark not accurate" aria-haspopup="true" aria-expanded="false"><span class="material-symbols-outlined">thumb_down</span></button>
            ${downPop}
          </span>
          <span class="sc-fb-more-wrap">
            <button type="button" class="sc-fb-btn sc-fb-more" data-fb-more data-tip="More" aria-label="More actions" aria-haspopup="true" aria-expanded="false"><span class="material-symbols-outlined">more_horiz</span></button>
            <div class="sc-fb-menu" role="menu" hidden>
              <span class="sc-line-time sc-fb-menu-time">${esc(time)}</span>
              <span class="sc-fb-menu-actions">
                <button type="button" class="sc-fb-btn" data-fb="replay" data-tip="Re-run in new chat" aria-label="Re-run this prompt in a new conversation"><span class="material-symbols-outlined">auto_read_play</span></button>
                <button type="button" class="sc-fb-btn" data-fb="edit" data-tip="Edit in new chat" aria-label="Edit this prompt in a new conversation"><span class="material-symbols-outlined">bubble</span></button>
                <button type="button" class="sc-fb-btn" data-fb="turn" data-tip="Fork a turn" aria-label="Fork a turn from here"><span class="material-symbols-outlined">alt_route</span></button>
                <span class="sc-fb-id" data-tip="Turn ID" tabindex="0">#${esc(tid)}</span>
              </span>
            </div>
          </span>
        </div>
        <div class="sc-fb-note" hidden></div>
      </div>`;
  }

  /* ── Word-by-word reveal (DISABLED) ──────────────────────────────────────
     Text animation is turned off: every WISEcodeAI answer appears whole. The
     typeInLine signature is kept so the downstream reveal chain (timestamp,
     action icons, chips) keeps firing in the same order. */
  const prefersReducedMotion = (() => {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (_) { return false; }
  })();
  function canTypeIn(el) {
    if (!el) return false;
    /* Only self-animating / interactive cards pop in whole — their own logic
       drives the reveal and must not be torn apart. Everything else types in;
       embedded charts / tables are left intact by the walker below. */
    return !el.querySelector('.sc-connect-flow, [data-cf-step], .sc-surface-card');
  }
  function typeInLine(bodyEl, done, wordDelay) {
    /* Text animation disabled — replies land whole. The callback still fires
       so the timestamp / chip reveal chain runs unchanged. */
    scrollDown();
    if (done) done();
  }

  /* Prime an element to animate in from the left, then reveal a set of them one
     after another (left→right) so the timestamp, action icons and intent chips
     each slide in in sequence once the answer has finished typing. */
  function primeRevealFromLeft(el) {
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateX(-6px)';
    el.style.transition = 'opacity .2s ease, transform .2s ease';
  }
  function revealStaggered(els, startDelay, gap, done) {
    const list = (els || []).filter(Boolean);
    if (!list.length) { if (done) setTimeout(done, startDelay || 0); return; }
    let idx = 0;
    const showNext = () => {
      const el = list[idx];
      el.style.opacity = '1';
      el.style.transform = 'none';
      idx += 1;
      scrollDown();
      if (idx < list.length) setTimeout(showNext, gap);
      else if (done) setTimeout(done, gap);
    };
    setTimeout(showNext, startDelay);
  }

  /* Prime an element to FLY IN from the right; `revealStaggered` then clears the
     transform so it sails right→left and lands in place. Used by the welcome
     intent chips so they arrive only after the heading + sub have typed in. */
  function primeRevealFromRight(el) {
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateX(30px)';
    el.style.transition = 'opacity .28s ease, transform .38s cubic-bezier(0.22, 0.85, 0.25, 1)';
  }
  /* Welcome-screen reveal. The owl + rings are already breathing; here we type
     the heading, then the sub, WORD-BY-WORD (exactly like every WISEcodeAI answer),
     and only once all that text has landed do we fly the intent chips in from
     the right so they arrive AFTER the copy — never sitting there before it.
     Honors reduced-motion (everything just shows). Safe to re-run whenever the
     welcome is shown again (see reset()). */
  function revealWelcome() {
    if (!welcome || welcome.classList.contains('sc-hidden')) return;
    /* Arm the admin background field whenever the welcome is (re)shown — mount or
       a fresh conversation. start() no-ops unless the toggle is on. */
    bgAnim.start();
    const heading = welcome.querySelector('.ws-heading');
    const subEl = welcome.querySelector('.ws-sub');
    /* The larger "at a glance" scorecards and the small intent chips share ONE
       fly-in: after the text types, they all sail in from the right in a single
       top-to-bottom cascade (cards first, then chips) so every card and chip
       animates identically — never one style for the big ones and another for
       the small. */
    const scWrap = welcome.querySelector(`#${id}-scorecards`) || welcome.querySelector('.ws-scorecards');
    const cards = scWrap ? Array.from(scWrap.querySelectorAll('.ws-scorecard')) : [];
    const chipsWrap = welcome.querySelector(`#${id}-chips`) || welcome.querySelector('.ws-chips');
    const chips = chipsWrap ? Array.from(chipsWrap.querySelectorAll('.chip')) : [];
    const all = cards.concat(chips);
    if (prefersReducedMotion) {
      all.forEach((c) => { c.style.opacity = ''; c.style.transform = ''; c.style.transition = ''; });
      return;
    }
    /* Hold every card + chip back (invisible, nudged right) until the text finishes. */
    all.forEach(primeRevealFromRight);
    const typeText = (el, next, wordDelay) => { if (el) typeInLine(el, next, wordDelay); else next(); };
    typeText(heading, () => typeText(subEl, () => {
      revealStaggered(all, 90, 60, null);
    }, 38)); // sub line types a bit faster than the heading
  }
  /* Collect a line's meta pieces in reveal order: the timestamp first, then the
     action icons (grounding chip, feedback buttons, turn id) left→right. */
  function metaTimeEl(metaEl) {
    if (!metaEl) return null;
    /* The timestamp now lives INSIDE the three-dot menu on answers that carry a
       feedback row, so it must not be part of the meta row's reveal stagger (it
       would animate an element that's hidden behind the menu). Only a standalone
       timestamp — a "you"/status line with no menu — animates in here. */
    const t = metaEl.querySelector('.sc-line-time');
    return (t && !t.closest('.sc-fb-menu')) ? t : null;
  }
  function metaIconEls(metaEl) {
    const icons = [];
    if (!metaEl) return icons;
    const srcEl = metaEl.querySelector('.sc-trust-chip');
    if (srcEl) icons.push(srcEl);
    /* Skip anything tucked inside the collapsed three-dot menu — those reveal
       with the menu, not with the row. */
    metaEl.querySelectorAll('.sc-fb-btn, .sc-fb-id').forEach((el) => {
      if (!el.closest('.sc-fb-menu')) icons.push(el);
    });
    return icons;
  }
  /* Hide the timestamp + icons up-front so they can animate in later. */
  function primeMeta(metaEl) {
    const timeEl = metaTimeEl(metaEl);
    if (timeEl) primeRevealFromLeft(timeEl);
    metaIconEls(metaEl).forEach(primeRevealFromLeft);
  }
  /* Bring in the timestamp, then the icons (left→right), then — if this line
     should trail the suggested actions — the intent chips (left→right). */
  function revealMetaThenChips(metaEl, trailChips, whenDone) {
    const finish = () => { scrollDown(); if (typeof whenDone === 'function') whenDone(); };
    const timeEl = metaTimeEl(metaEl);
    const icons = metaIconEls(metaEl);
    revealStaggered(timeEl ? [timeEl] : [], 120, 0, () => {
      revealStaggered(icons, 130, 55, () => {
        if (trailChips) {
          parkInlineChips();
          /* Intent chips fly in from the RIGHT here too — the exact same
             animation the welcome uses — so chips read identically whether
             they're on the welcome or trailing a turn in the transcript. */
          const chips = ichipsEl ? Array.from(ichipsEl.children) : [];
          chips.forEach(primeRevealFromRight);
          revealStaggered(chips, 110, 55, finish);
        } else {
          finish();
        }
      });
    });
  }

  /* Host-built suggested-action chip rows (e.g. the compare board's follow
     chips) trail an answer, so they must animate in with the same right→left
     motion the module's own inline chips use — and only AFTER that answer has
     finished typing. The host holds each row back until its reply's `onDone`
     fires (see addWISEcodeAI), then calls revealChips; primeChips hides the row up
     front so it never flashes in the meantime. Both honor reduced-motion. */
  function primeChips(rowEl) {
    if (!rowEl || prefersReducedMotion) return;
    Array.from(rowEl.querySelectorAll('.chip')).forEach(primeRevealFromRight);
  }
  function revealChips(rowEl) {
    if (!rowEl) return;
    const chips = Array.from(rowEl.querySelectorAll('.chip'));
    if (prefersReducedMotion) { scrollDown(); return; }
    revealStaggered(chips, 60, 55, scrollDown);
  }

  /* ── Open-module narration transform ──────────────────────────────────────
     Strips "open the module" narration out of a reply. We work on the reply's
     HTML string (pre-insert) and only ever touch a line (a run between <br>s)
     that BOTH points at a known module display-name AND contains the "→"
     arrow, so ordinary prose is never rewritten. Each stripped directive
     leaves a hidden marker remembering which module to open in
     `data-open-module`, which the auto-open hook reads. */
  const OPEN_ARROW = '\u2192';
  const openModuleRe = openModuleNames.length
    ? new RegExp(openModuleNames.map((n) => n
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/&/g, '&(?:amp;)?')
        .replace(/\s+/g, '\\s+')).join('|'), 'i')
    : null;

  function moduleNameFrom(text) {
    if (!openModuleRe) return '';
    const m = String(text).match(openModuleRe);
    if (!m) return '';
    /* Canonicalise back to the configured display-name (decoded &, single spaces). */
    const hit = m[0].replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim().toLowerCase();
    return openModuleNames.find((n) => n.toLowerCase() === hit) || m[0].replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  }

  function openMarkerHtml(moduleName) {
    return `<span class="sc-open-marker" data-open-module="${esc(moduleName)}" hidden></span>`;
  }

  /* Reduce one text line to its hidden markers. A line that starts with
     "Opened" is one directive for the whole sentence; otherwise it's split on
     the "·" separator so patterns like "chart → Visuals · table → Results &
     Details" yield one marker per directive. Non-directive fragments keep
     their text. Returns null when the line holds no directive. */
  function lineToOpenMarkers(line) {
    if (line.indexOf(OPEN_ARROW) === -1) return null;
    if (!moduleNameFrom(line)) return null;
    const isDirective = (frag) => !!moduleNameFrom(frag) && frag.indexOf(OPEN_ARROW) !== -1;
    const plain = line.replace(/<[^>]*>/g, '');
    if (/^\s*Opened\b/i.test(plain)) {
      return { html: openMarkerHtml(moduleNameFrom(line)), markersOnly: true };
    }
    const frags = line.split('\u00b7').map((p) => p.trim());
    if (!frags.some(isDirective)) return null;
    const kept = [];
    const markers = [];
    frags.forEach((frag) => {
      if (isDirective(frag)) markers.push(openMarkerHtml(moduleNameFrom(frag)));
      else if (frag) kept.push(frag);
    });
    return { html: kept.join(' \u00b7 ') + markers.join(''), markersOnly: kept.length === 0 };
  }

  function transformOpenChips(html, meta) {
    if (!openChipsOn || (meta && meta.openChips === false)) return html;
    if (typeof html !== 'string' || html.indexOf(OPEN_ARROW) === -1) return html;
    /* Never rewrite an inline preview / surface card — it is already the opener. */
    if (/class="sc-surface-card/.test(html)) return html;
    const parts = html.split(/(<br\s*\/?>)/i);
    let changed = false;
    for (let i = 0; i < parts.length; i += 1) {
      if (/^<br/i.test(parts[i])) continue;
      const out = lineToOpenMarkers(parts[i]);
      if (out == null) continue;
      parts[i] = out.html;
      changed = true;
      /* A line that was ONLY directives leaves no visible text — swallow the
         <br>s that led into it so the reply doesn't end on a blank gap. */
      if (out.markersOnly) {
        for (let j = i - 1; j >= 0 && (parts[j] === '' || /^<br/i.test(parts[j])); j -= 1) parts[j] = '';
      }
    }
    return changed ? parts.join('') : html;
  }

  /* Open the module a chip points at. Hosts wire `onOpenModule(name, chip)` to
     bring their own pane forward; when they don't (or return falsy) we fall back
     to replaying the most recent inline surface card in this transcript. */
  function openModuleFor(name, chipEl) {
    let handled = false;
    if (typeof opts.onOpenModule === 'function') {
      try { handled = opts.onOpenModule(name, chipEl) === true; } catch (_) { handled = false; }
    }
    if (handled) return;
    const cards = messages ? messages.querySelectorAll('.sc-surface-card[data-surface]') : null;
    if (cards && cards.length) { cards[cards.length - 1].click(); return; }
    document.dispatchEvent(new CustomEvent('wiseai:open-module', { detail: { module: name, root: rootEl, chip: chipEl } }));
  }

  /* @param {string} html  WISEcodeAI's reply markup.
     @param {object} [meta] { source, feedback, typewriter } — `source` overrides
     the grounding caption for a single line (pass '' to drop it); `feedback:false`
     suppresses the accuracy-feedback row (e.g. on a non-answer status card);
     `typewriter:false` forces the line to appear whole (no word-by-word reveal). */
  function addWISEcodeAI(html, meta = {}) {
    if (!messages) return null;
    html = transformOpenChips(html, meta);
    /* Every WISEcodeAI turn names where it's grounded. When the caller doesn't
       specify a source (or leaves it blank), fall back to a connected data
       source so the trust chip is ALWAYS present — the transcript never shows an
       answer without a source. Pass source:false to explicitly opt out. */
    let src = meta.source !== undefined ? meta.source : sourceLabel;
    if (src !== false && !src) src = pickSourceName();
    if (src === false) src = '';
    const timeLabel = nowLabel();
    const fb = (feedbackEnabled && meta.feedback !== false) ? feedbackRowHtml(timeLabel) : '';
    const footer = `<div class="sc-line-meta">${
      src ? `<span class="sc-trust-chip" title="WISEcodeAI™ cites where its answer comes from"><span class="material-symbols-outlined">verified_user</span>${esc(src)}</span>` : ''
    }${fb ? '' : `<span class="sc-line-time">${esc(timeLabel)}</span>`}${fb}</div>`;
    messages.insertAdjacentHTML('beforeend',
      `<div class="sc-line sc-line-wiseai"><span class="sc-avatar sc-avatar-wiseai" role="img" aria-label="${esc(title)}">${OWL_BUG}</span><div class="sc-line-body">${html}${footer}</div></div>`);
    const line = messages.lastElementChild; /* capture before chips re-park */
    const body = line && line.querySelector('.sc-line-body');
    refreshDockedTurns();
    /* Bring a turn in, in order: (1) the text (typed word-by-word for a plain
       answer; whole for a rich/interactive card), then (2) the timestamp,
       (3) the action icons (left→right), and finally (4) the intent chips
       (left→right) — but ONLY if this line should trail them. Surface/preview
       cards pass { trailChips:false } so the chips stay attached to the actual
       answer, not to a card posted mid-thinking. Reduced-motion shows it whole. */
    const metaEl = body && body.querySelector('.sc-line-meta');
    const trailChips = meta.trailChips !== false;
    /* Fires once the whole line (text + meta + trailing chips) has settled, so a
       host can trail its OWN chips behind this specific answer (see revealChips).
       If this answer carries an "open module" marker and the surface asked for
       modules to open by default, fire the first marker's module now. */
    const autoOpenModule = () => {
      if (!openModuleByDefault || (meta && meta.openChips === false)) return;
      const marker = body && body.querySelector('[data-open-module]');
      if (marker) openModuleFor(marker.getAttribute('data-open-module'), marker);
    };
    const done = () => { autoOpenModule(); if (typeof meta.onDone === 'function') meta.onDone(); };
    if (prefersReducedMotion) {
      if (trailChips) parkInlineChips();
      scrollDown();
      done();
      return line;
    }
    primeMeta(metaEl);
    scrollDown();
    if (meta.typewriter !== false && canTypeIn(body)) {
      typeInLine(body, () => revealMetaThenChips(metaEl, trailChips, done));
    } else {
      /* Card / non-typed line: it's already visible; just animate the meta
         (and chips) in so nothing reads as pre-loaded. */
      revealMetaThenChips(metaEl, trailChips, done);
    }
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
  /* Format a millisecond span as a live m:ss stopwatch (0:04, 1:12). */
  function fmtTraceClock(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  /* The reasoning trace's left rail, drawn as a DNA double-helix instead of a
     flat line. Two sine backbones cross down a narrow tile, with colored "food"
     base-pair dots riding the rungs. The tile is one full, seamless vertical
     period so it tiles (background-repeat:repeat-y in CSS) down a trace of any
     height; the CSS scrolls it (scDnaFlow) so the dots travel down the strand
     while thinking, and freezes it once the trace completes. Returns a ready
     `url("data:image/svg+xml,...")` for a .sc-trace-dna element's background. */
  function scDnaRailUrl(dotColor) {
    const W = 16;          /* tile width */
    const PERIOD = 44;     /* one helix turn */
    const PERIODS = 2;     /* two turns per tile — must match scDnaFlow's 88px */
    const H = PERIOD * PERIODS;
    const cx = W / 2, amp = 4.6;
    const xa = (y) => cx + amp * Math.sin((2 * Math.PI * y) / PERIOD);
    const xb = (y) => cx - amp * Math.sin((2 * Math.PI * y) / PERIOD);
    let pa = '', pb = '';
    for (let y = 0; y <= H; y += 2) {
      pa += `${y === 0 ? 'M' : 'L'}${xa(y).toFixed(2)},${y}`;
      pb += `${y === 0 ? 'M' : 'L'}${xb(y).toFixed(2)},${y}`;
    }
    /* All base-pair dots share one hue so the strand reads as a progress track:
       blue while still working, green once a section is done. The two coexisting
       layers (blue base + green "done" fill) are built from this same geometry so
       they overlay pixel-for-pixel — only the dot color differs. */
    const dot = dotColor || '#4C6EF5';
    const rungY = [11, 33, 55, 77]; /* the strands' widest points, evenly spaced */
    let rungs = '', dots = '';
    rungY.forEach((y) => {
      const x1 = xb(y), x2 = xa(y);
      rungs += `<line x1="${x1.toFixed(2)}" y1="${y}" x2="${x2.toFixed(2)}" y2="${y}"/>`;
      dots += `<circle cx="${x2.toFixed(2)}" cy="${y}" r="2.1" fill="${dot}"/>`;
      dots += `<circle cx="${x1.toFixed(2)}" cy="${y}" r="2.1" fill="${dot}"/>`;
    });
    const backbone = 'rgba(74,120,184,0.85)';
    const rung = 'rgba(120,150,200,0.35)';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
      + `<g fill="none" stroke="${backbone}" stroke-width="1.4" stroke-linecap="round">`
      + `<path d="${pa}"/><path d="${pb}"/></g>`
      + `<g stroke="${rung}" stroke-width="1" stroke-linecap="round">${rungs}</g>`
      + dots
      + `</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  /* Stream the behind-the-scenes reasoning trace for a turn, then hand off to
     `done()` (which posts the real answer). Instead of the answer landing the
     instant you ask, the transcript first "thinks out loud":

       • A live m:ss stopwatch ticks in the header the whole time.
       • Each milestone is a 1–3 word key with a big GLOB of subdued story text
         that streams in line by line beneath it. The globs BUILD ON EACH OTHER —
         a new milestone is appended below the last, growing one continuous
         narrative you can read top-to-bottom, never stopping to wipe & reset.
       • Delays are deliberately variable so no two turns feel identical.

     When the last milestone lands, the globs are gone and the live block is
     replaced by the quiet SUMMARY: each milestone's key + the m:ss elapsed when
     it landed, the header reading "Worked for m:ss". Collapsible via the header. */
  function runReasoningTrace(milestones, done, tail, sourceLine) {
    if (!messages) { if (done) done(); return; }
    detachInlineChips();
    /* Streaming switched OFF — no trace, no thinking beat: the answer lands
       right away (one frame's delay keeps the transcript's ordering intact). */
    if (!streamOn) {
      setTimeout(() => { if (done) done(); }, prefersReducedMotion ? 0 : 120);
      return;
    }
    /* "Final message only" — skip the reasoning trace entirely. A brief thinking
       beat (the standard typing line) stands in for the work, then the answer
       lands. No milestone steps, no glob story text. */
    if (streamLevel === 'final') {
      const typing = showTyping();
      const wait = prefersReducedMotion ? 240 : 460 + Math.random() * 520;
      setTimeout(() => { if (typing) typing.remove(); if (done) done(); }, wait);
      return;
    }
    /* "Steps only" — show the milestone STEPS as they land, but suppress the
       subdued glob story text that normally streams in beneath each one. */
    const showGlobs = streamLevel !== 'steps';
    const steps = (Array.isArray(milestones) && milestones.length)
      ? milestones.slice() : [{ key: 'Thinking', story: ['Gathering the details.'] }];
    /* A trailing "assembling" milestone (built from what the answer will contain)
       so the globs keep narrating the pieces being laid out — and nothing loads
       until they're done. */
    if (tail && tail.key) steps.push(tail);

    /* The strand's two hues: blue while a section is still being worked, green
       once it's done. The rail lives in the BODY (below the header), as a blue
       base layer with a green "done" layer clipped over it that grows downward
       as steps land — so the helix turns green section-by-section and each
       step's check only appears once its own section has gone green. */
    const DNA_BLUE = '#4C6EF5';
    const DNA_GREEN = '#12b76a';
    const strandMarkup = '<div class="sc-trace-strand" aria-hidden="true">'
      + '<span class="sc-trace-dna sc-trace-dna--base"></span>'
      + '<span class="sc-trace-dna sc-trace-dna--fill"></span></div>';

    const el = document.createElement('div');
    el.className = 'sc-line sc-line-wiseai sc-line-typing sc-line-trace';
    el.innerHTML = `<span class="sc-avatar sc-avatar-wiseai" role="img" aria-label="${esc(title)}">${OWL_BUG}</span>`
      + `<div class="sc-line-body"><div class="sc-trace" data-open="1">`
      + `<button type="button" class="sc-trace-head" aria-expanded="true">`
      + `<span class="sc-trace-title">Thinking</span>`
      + `<span class="sc-trace-timer" aria-hidden="true">0:00</span>`
      + `<span class="sc-trace-caret material-symbols-outlined" aria-hidden="true">chevron_right</span>`
      + `</button><div class="sc-trace-body">${strandMarkup}</div></div></div>`;
    messages.appendChild(el);
    scrollDown();

    const start = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const now = () => ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - start;
    const trace = el.querySelector('.sc-trace');
    const head = el.querySelector('.sc-trace-head');
    const titleEl = el.querySelector('.sc-trace-title');
    const timerEl = el.querySelector('.sc-trace-timer');
    const bodyEl = el.querySelector('.sc-trace-body');

    /* Paint the current strand's two layers (blue base + green done-fill) and
       hand back the fill layer so callers can grow its --dna-fill as sections
       complete. Re-run after any rebuild of the body (the summary swap). */
    const paintStrand = () => {
      const base = bodyEl.querySelector('.sc-trace-dna--base');
      const fill = bodyEl.querySelector('.sc-trace-dna--fill');
      if (base) base.style.backgroundImage = scDnaRailUrl(DNA_BLUE);
      if (fill) fill.style.backgroundImage = scDnaRailUrl(DNA_GREEN);
      return fill;
    };
    paintStrand();

    /* The header collapses the whole trace (live glob or final summary) and back. */
    head.addEventListener('click', () => {
      const open = trace.getAttribute('data-open') === '1';
      trace.setAttribute('data-open', open ? '0' : '1');
      head.setAttribute('aria-expanded', open ? 'false' : 'true');
      scrollDown();
    });

    const rnd = (a, b) => a + Math.random() * (b - a);
    /* The landmarks we've passed — key + the clock reading when each landed.
       Only surfaced at the very end, as the summary. */
    const landmarks = [];
    /* The summary: the strand rail + the milestone list. No check marks — the
       strand's green base-pair dots are the "done" signal, so a section reads as
       complete once its dots have gone green. Pass revealed=true to mark them all
       done at once (reduced motion / no sweep). */
    const stepsHtml = (revealed) => strandMarkup + `<ul class="sc-trace-steps">${landmarks.map((l) =>
      `<li class="sc-trace-step${revealed ? ' is-revealed' : ''}">`
      + `<span class="sc-trace-step-key">${esc(l.key)}</span>`
      + `<span class="sc-trace-step-time" aria-hidden="true">${esc(l.time)}</span></li>`).join('')}</ul>`;

    /* Reduced motion: skip the live streaming, show the finished summary at once
       with plausible stamps, then answer after a short beat. */
    if (prefersReducedMotion) {
      let acc = 0;
      steps.forEach((m) => { acc += 900 + Math.round(Math.random() * 1400); landmarks.push({ key: m.key, time: fmtTraceClock(acc) }); });
      const srcHtml = sourceLine
        ? `<div class="sc-trace-story"><span class="sc-trace-story-line sc-trace-story-source is-in">${sourceLine}</span></div>` : '';
      bodyEl.innerHTML = srcHtml + stepsHtml(true);
      titleEl.textContent = `Worked for ${landmarks.length ? landmarks[landmarks.length - 1].time : fmtTraceClock(acc)}`;
      timerEl.textContent = `${landmarks.length} step${landmarks.length === 1 ? '' : 's'}`;
      trace.classList.add('is-complete');
      el.classList.remove('sc-line-typing');
      /* No sweep in reduced motion — the whole strand is already green. */
      const rmFill = paintStrand();
      if (rmFill) rmFill.style.setProperty('--dna-fill', '100%');
      scrollDown();
      setTimeout(() => { if (done) done(); }, 480);
      return;
    }

    const timer = setInterval(() => { timerEl.textContent = fmtTraceClock(now()); }, 200);
    let mi = 0;

    const finish = () => {
      clearInterval(timer);
      bodyEl.innerHTML = stepsHtml(false);
      titleEl.textContent = `Worked for ${landmarks.length ? landmarks[landmarks.length - 1].time : fmtTraceClock(now())}`;
      timerEl.textContent = `${landmarks.length} step${landmarks.length === 1 ? '' : 's'}`;
      trace.classList.add('is-complete');
      el.classList.remove('sc-line-typing');
      const fill = paintStrand();
      scrollDown();
      if (done) done();
      /* Sweep the strand green from the top, one section at a time, and pop each
         step's check the moment its section has turned green. What lies below the
         green front stays blue until the sweep reaches it. */
      const stepEls = Array.from(bodyEl.querySelectorAll('.sc-trace-step'));
      const n = stepEls.length || 1;
      stepEls.forEach((li, i) => {
        setTimeout(() => {
          if (fill) fill.style.setProperty('--dna-fill', `${Math.round(((i + 1) / n) * 100)}%`);
          li.classList.add('is-revealed');
          scrollDown();
        }, 160 + i * 420);
      });
    };

    const runMilestone = () => {
      if (mi >= steps.length) { finish(); return; }
      const m = steps[mi];
      /* Append a NEW milestone block BELOW the previous ones — the globs build
         on each other into one continuous, growing narrative rather than each
         status wiping the last. No inline spinner: the owl avatar to the left
         already carries the "working" ring, so a status is just its key + glob.
         Completed blocks get `is-done` so the live one can be told apart. */
      const block = document.createElement('div');
      block.className = 'sc-trace-live';
      block.innerHTML = `<div class="sc-trace-now"><span class="sc-trace-now-key">${esc(m.key)}</span></div>`
        + `<div class="sc-trace-story"></div>`;
      bodyEl.appendChild(block);
      scrollDown();
      const storyEl = block.querySelector('.sc-trace-story');
      /* Steps-only mode drops the glob story text (and the trailing grounding
         line) so the trace reads as a clean list of steps landing one by one. */
      const lines = showGlobs ? (m.story || []).slice() : [];
      /* The very last glob line of the whole trace names the data source the
         answer is grounded in (rendered as HTML so the source reads in bold). */
      if (showGlobs && mi === steps.length - 1 && sourceLine) lines.push({ html: sourceLine });
      let si = 0;
      const streamLine = () => {
        if (si >= lines.length) {
          block.classList.add('is-done');
          landmarks.push({ key: m.key, time: fmtTraceClock(now()) });
          mi += 1;
          /* Keep the flow continuous — a short beat, not a full stop, so the
             next glob starts building right where the last one left off. In
             steps-only mode there's no glob to read, so hold each step a touch
             longer instead, keeping the sequence legible. */
          setTimeout(runMilestone, showGlobs ? rnd(140, 320) : rnd(360, 640));
          return;
        }
        const line = lines[si];
        const sp = document.createElement('span');
        sp.className = 'sc-trace-story-line';
        if (line && typeof line === 'object' && line.html) {
          sp.innerHTML = line.html;
          sp.classList.add('sc-trace-story-source');
        } else {
          sp.textContent = line;
        }
        storyEl.appendChild(sp);
        requestAnimationFrame(() => sp.classList.add('is-in'));
        scrollDown();
        si += 1;
        setTimeout(streamLine, rnd(300, 720));
      };
      setTimeout(streamLine, rnd(120, 300));
    };

    setTimeout(runMilestone, rnd(220, 520));
  }

  /* Pick ONE connected data source to ground this turn in. It's drawn from the
     SAME pool of sources shown in the input — but not deterministically: asking
     about the same thing can resolve to a different source (you might have asked
     a different kind of question), so we lean toward the connected sources yet
     keep it variable. Returns the escaped source name, or '' when no sources are
     configured. */
  function pickSourceName() {
    if (!connectors.length) return '';
    const connected = connectors.filter((c) => c && c.connected);
    const pool = connected.length ? connected : connectors;
    const c = pool[Math.floor(Math.random() * pool.length)];
    return esc(c && c.name ? c.name : 'the WISE Foods registry');
  }

  /* The trace's closing glob line naming which data source the answer is grounded
     in (rendered as HTML so the source reads in bold). '' when no source. */
  function sourceLineFor(name) {
    if (!name) return '';
    const templates = [
      `Grounding this answer in <strong>${name}</strong> \u2014 the source that best fit what you actually asked.`,
      `Sourced from <strong>${name}</strong> for this one; a different question might have pulled from somewhere else.`,
      `Pulling the numbers behind this from <strong>${name}</strong>.`,
      `This answer is drawn from <strong>${name}</strong>.`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /* Whether a reply's markup carries a rendered OUTPUT — a chart, table, or
     report card — the kind of artifact that warrants a "source of this output"
     caption pinned to its end. */
  function replyHasOutput(html) {
    const h = String(html || '').toLowerCase();
    return /<canvas|<svg|chart|graph|insights|spark|<table|wa-tbl|surface-card|report|summarize/.test(h);
  }

  /* The caption pinned to the very END of an output (chart / table / report)
     naming the data source it was built from. Same variable source pick as the
     answer's grounding, surfaced visibly beneath the artifact. '' when no source. */
  function outputSourceHtml(name) {
    if (!name) return '';
    return `<div class="sc-out-source" role="note">`
      + `<span class="sc-out-source-ic material-symbols-outlined" aria-hidden="true">database</span>`
      + `<span class="sc-out-source-txt">Source: <strong>${name}</strong></span></div>`;
  }

  function wiseaiRespond(text, intent) {
    /* Resolve the answer up front so the trace can narrate assembling the exact
       pieces it will contain — and so nothing (chart/table/report cards, source
       chips, suggested actions, or host-surfaced output panes) renders until the
       whole trace has finished. */
    const baseHtml = reply(text, intent);
    /* One data source for this turn — the answer, and any output it produced,
       are grounded in it. Drawn from the connected input sources, picked variably
       (it needn't match any particular input from one turn to the next). */
    const sourceName = pickSourceName();
    /* The answer's trust chip in the meta row already names this turn's source,
       so we no longer repeat it as a "Source:" caption at the end of the output —
       that duplicated the same label one line above it. */
    const html = baseHtml;
    const done = () => {
      /* Host side-effects that render output (e.g. opening the result/visual
         panes) are deferred to here so they land WITH the answer, never during
         the thinking globs. */
      if (typeof opts.onReply === 'function') { try { opts.onReply(intent, text); } catch (_) { /* host hook */ } }
      /* Ground the visible answer in the SAME source the trace just named, so the
         trust chip and the reasoning trace agree on where it came from. */
      addWISEcodeAI(html, { source: sourceName });
    };
    runReasoningTrace(reasoningTraceFor(text, intent), done, assemblyMilestoneFor(baseHtml), sourceLineFor(sourceName));
  }
  /* Post a user line followed by a FIXED WISEcodeAI reply (bypasses the reply
     resolver) — used by controls like the brand connectors where the answer is
     the action's own confirmation, not a routed intent response. */
  function respondFixed(userText, replyHtml, meta) {
    hideWelcome();
    if (userText) addUser(userText);
    const typing = showTyping();
    setTimeout(() => { typing?.remove(); addWISEcodeAI(replyHtml, meta || { source: '' }); }, 600);
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
    if (tick) tick.textContent = 'check';
  }
  function connectFlowCardHtml(name, steps, headline) {
    const rows = steps.map((s, i) => `
      <li class="sc-cf-step" data-cf-step="${i}">
        <span class="sc-cf-ic"><span class="material-symbols-outlined">${esc(s.icon)}</span></span>
        <span class="sc-cf-text">
          <span class="sc-cf-title">${esc(s.title)}</span>
          <span class="sc-cf-desc">${esc(s.desc.replace(/\{brand\}/g, name))}</span>
        </span>
        <span class="sc-cf-state"><span class="material-symbols-outlined">radio_button_unchecked</span></span>
      </li>`).join('');
    return `<div class="sc-connect-flow" role="group" aria-label="${esc(headline)}">
        <div class="sc-cf-head"><span class="sc-cf-spin material-symbols-outlined">sync</span><span class="sc-cf-head-text">${esc(headline)}</span></div>
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
        if (st) st.innerHTML = '<span class="material-symbols-outlined">check</span>';
      }
      if (i < rows.length) {
        const cur = rows[i];
        cur.classList.add('is-active');
        const st = cur.querySelector('.sc-cf-state');
        if (st) st.innerHTML = '<span class="material-symbols-outlined sc-cf-spin">sync</span>';
        i += 1;
        scrollDown();
        setTimeout(step, 950);
      } else {
        card.classList.add('is-complete');
        const head = card.querySelector('.sc-cf-head');
        if (head) head.innerHTML = `<span class="sc-cf-check material-symbols-outlined">check</span><span class="sc-cf-head-text">${esc(doneHead)}</span>`;
        markConnectorConnected(cid, name);
        if (doneReply) setTimeout(() => addWISEcodeAI(doneReply, { source: '' }), 560);
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
      /* The "Connecting…" card is a mid-turn status card — the real answer
         (doneReply) lands after it, so let the chips trail that, not the card. */
      const line = addWISEcodeAI(connectFlowCardHtml(name, steps, headline), { source: '', feedback: false, trailChips: false });
      const card = line ? line.querySelector('.sc-connect-flow') : null;
      /* A brand-new connection is an "added data source" landmark for the
         activity strip; a re-sync of an already-connected source is not. */
      if (card && !connected) card.dataset.activity = 'source';
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
      ? '<span class="wch-conn-cta"><span class="material-symbols-outlined">check</span>Connected</span>'
      : '<span class="wch-conn-cta"><span class="material-symbols-outlined">add</span>Connect</span>';
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
        `<span class="wch-head-title"><span class="material-symbols-outlined">hub</span>${esc(connectorsLabel || 'Connect a data source')}</span>` +
        '<button type="button" class="wch-close" title="Close" aria-label="Close"><span class="material-symbols-outlined">close</span></button>' +
      '</div>' +
      '<p class="wch-conn-intro">Link a retailer or food-data source so WISEcodeAI\u2122 can pull verified product, pricing &amp; nutrition data.</p>' +
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
    dismissAskOverlay();
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

  /* ── "What can I ask?" side panel ─────────────────────────────────────────
     A right-docked overlay inside the chat body — same shell + open/close
     animation as "Connect a data source". It presents THIS surface's own
     suggestions (the welcome scorecards + intent chips) as insertable prompt
     cards, grouped into sections. A card sends its prompt straight away ("off
     you go"); its insert icon drops the prompt into the composer instead so it
     can be tweaked first. A search field filters the prompts, and the header's
     breakout icon breaks the panel OUT of the chat into its own standalone
     module docked beside the chat — a real flex sibling in the modules row,
     exactly like the Turns module's breakout. Built lazily on first open. */
  let askPanel = null, askScrim = null, askList = null, askCloseTimer = null, askDocked = false, askQuery = '', askSection = 'all', askMorePop = null;
  const askBreakoutWidth = opts.askBreakoutWidth || 360;
  const askHost = () => rootEl.querySelector('.sc-body') || rootEl;

  /* Optional rich catalog — a structured, page-authored library of everything
     the surface can do, grouped into sections, each capability carrying several
     example prompts and a "behind the scenes" tool list. When supplied it fully
     replaces the auto-derived (scorecards + chips) suggestions below. Shape:
       { intro, searchPlaceholder,
         sections: [ { id, title, icon, desc,
           items: [ { title, icon, desc, prompts:[...], tools:[...] } ] } ] } */
  const askCatalog = opts.askCatalog && Array.isArray(opts.askCatalog.sections) && opts.askCatalog.sections.length
    ? opts.askCatalog : null;

  /* Compose the surface's suggestions from the two sources that already drive
     the welcome screen: the rich "at a glance" scorecards and the intent chips.
     De-duped by intent id so a chip that mirrors a scorecard isn't listed
     twice. Control cards (open a panel, not a chat turn) and locked "coming
     soon" cards are dropped. Returns an ordered list of { title, groups:[{...}] }. */
  function askSuggestions() {
    const CONTROL = new Set([ASK_HELP_INTENT, 'choose_agents', 'connect_source']);
    const seen = new Set();
    const groups = [];

    const scCards = (scorecards && Array.isArray(scorecards.cards) ? scorecards.cards : [])
      .filter((c) => c && !c.locked && c.intent !== 'connect_source' && (c.ask || c.title))
      .map((c) => {
        if (c.intent) seen.add(c.intent);
        return { icon: c.icon || 'auto_awesome', title: c.title || c.ask, desc: c.desc || '',
          ask: c.ask || c.title, intent: c.intent };
      });
    if (scCards.length) {
      groups.push({ title: (scorecards && scorecards.label) || 'Start a conversation',
        icon: 'bolt', cards: scCards });
    }

    const chipCards = intents
      .filter((c) => c && c.label && !CONTROL.has(c.intent) && !(c.intent && seen.has(c.intent)))
      .map((c) => ({ icon: c.icon || 'chat_bubble', title: c.label,
        desc: '', ask: c.ask || c.label, intent: c.intent }));
    if (chipCards.length) {
      groups.push({ title: scCards.length ? 'More prompts' : 'What you can ask',
        icon: 'lightbulb', cards: chipCards });
    }
    return groups;
  }
  function askCardHtml(c) {
    const gold = c.intent === ASK_HELP_INTENT ? ' wch-ask-card--gold' : '';
    const q = c.ask && c.desc && c.ask !== c.title
      ? `<span class="wch-ask-card-q">\u201C${esc(c.ask)}\u201D</span>` : '';
    const desc = c.desc ? `<span class="wch-ask-card-desc">${esc(c.desc)}</span>` : '';
    return `<button type="button" class="wch-ask-card${gold}" data-ask="${esc(c.ask)}"${c.intent ? ` data-intent="${esc(c.intent)}"` : ''} title="Ask: ${esc(c.ask)}">
        <span class="wch-ask-ico"><span class="material-symbols-outlined">${esc(c.icon)}</span></span>
        <span class="wch-ask-card-body"><span class="wch-ask-card-title">${esc(c.title)}</span>${desc}${q}</span>
        <span class="wch-ask-insert" role="button" tabindex="-1" data-ask-insert="1" title="Insert into the message box" aria-label="Insert into the message box"><span class="material-symbols-outlined">chat_add_on</span></span>
      </button>`;
  }
  /* Render one catalog capability: header (icon + title + blurb), its example
     prompts (each a click-to-send button with an insert affordance), and a
     subdued "behind the scenes" tool footer. */
  function askCapHtml(item, sectionIcon) {
    const prompts = (item.prompts || []).map((p) =>
      `<button type="button" class="wch-ask-prompt" data-ask="${esc(p)}" title="Ask: ${esc(p)}">
        <span class="wch-ask-prompt-text">${esc(p)}</span>
        <span class="wch-ask-prompt-actions">
          <span class="wch-ask-prompt-btn" role="button" tabindex="-1" data-ask-insert="1" title="Insert into the message box" aria-label="Insert into the message box"><span class="material-symbols-outlined">chat_add_on</span></span>
          <span class="wch-ask-prompt-btn" role="button" tabindex="-1" aria-hidden="true" title="Ask this"><span class="material-symbols-outlined">play_arrow</span></span>
        </span>
      </button>`).join('');
    const tools = (item.tools && item.tools.length)
      ? `<div class="wch-ask-cap-tools"><b>Behind the scenes</b> ${item.tools.map((t) => `<code>${esc(t)}</code>`).join(' \u00B7 ')}</div>`
      : '';
    const desc = item.desc ? `<span class="wch-ask-cap-desc">${esc(item.desc)}</span>` : '';
    return `<div class="wch-ask-cap">
      <div class="wch-ask-cap-head">
        <span class="wch-ask-cap-ico"><span class="material-symbols-outlined">${esc(item.icon || sectionIcon || 'bolt')}</span></span>
        <span class="wch-ask-cap-titles"><span class="wch-ask-cap-title">${esc(item.title || '')}</span>${desc}</span>
      </div>
      <div class="wch-ask-prompts">${prompts}</div>
      ${tools}
    </div>`;
  }
  /* Catalog mode: filter chips (All + one per section) above section groups,
     each with a header + blurb and its capability cards. A search query narrows
     capabilities across whichever section scope is active. */
  function renderAskCatalog() {
    const q = (askQuery || '').trim().toLowerCase();
    const matchItem = (it) => {
      if (!q) return true;
      const hay = [it.title, it.desc, (it.prompts || []).join(' '), (it.tools || []).join(' ')]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.indexOf(q) !== -1;
    };
    const sections = askCatalog.sections;
    if (askSection !== 'all' && !sections.some((s) => s.id === askSection)) askSection = 'all';
    const chips = ['<div class="wch-ask-filters">',
      `<button type="button" class="wch-ask-filter${askSection === 'all' ? ' is-active' : ''}" data-section="all">All</button>`]
      .concat(sections.map((s) =>
        `<button type="button" class="wch-ask-filter${askSection === s.id ? ' is-active' : ''}" data-section="${esc(s.id)}">${esc(s.title)}</button>`))
      .concat('</div>').join('');
    const scoped = sections.filter((s) => askSection === 'all' || s.id === askSection);
    const groups = scoped
      .map((s) => ({ s, items: (s.items || []).filter(matchItem) }))
      .filter((g) => g.items.length);
    let body;
    if (!groups.length) {
      body = q
        ? '<div class="wch-ask-empty">No prompts match \u201C' + esc((askQuery || '').trim()) + '\u201D. Try another word, or just type your question in your own words.</div>'
        : '<div class="wch-ask-empty">Nothing here yet.</div>';
    } else {
      body = groups.map(({ s, items }) =>
        `<div class="wch-ask-group" data-section="${esc(s.id)}">
          <div class="wch-ask-group-title"><span class="material-symbols-outlined">${esc(s.icon || 'bolt')}</span>${esc(s.title)}</div>
          ${s.desc ? `<div class="wch-ask-group-desc">${esc(s.desc)}</div>` : ''}
          <div class="wch-ask-cards">${items.map((it) => askCapHtml(it, s.icon)).join('')}</div>
        </div>`).join('');
    }
    askList.innerHTML = chips + body;
  }
  function renderAskList() {
    if (!askList) return;
    if (askCatalog) { renderAskCatalog(); return; }
    let groups = askSuggestions();
    const q = (askQuery || '').trim().toLowerCase();
    if (q) {
      groups = groups
        .map((g) => ({
          ...g,
          cards: (g.cards || []).filter((c) => {
            const hay = [c.title, c.desc, c.ask, c.intent].filter(Boolean).join(' ').toLowerCase();
            return hay.indexOf(q) !== -1;
          }),
        }))
        .filter((g) => g.cards.length);
    }
    if (!askSuggestions().length) {
      askList.innerHTML = '<div class="wch-ask-empty">No suggestions on this page yet — just type a question in your own words and I\u2019ll route it to the right agents.</div>';
      return;
    }
    if (!groups.length) {
      askList.innerHTML = '<div class="wch-ask-empty">No prompts match \u201C' + esc((askQuery || '').trim()) + '\u201D. Try another word, or just type your question in your own words.</div>';
      return;
    }
    askList.innerHTML = groups.map((g) =>
      `<div class="wch-ask-group">
        <div class="wch-ask-group-title"><span class="material-symbols-outlined">${esc(g.icon || 'bolt')}</span>${esc(g.title)}</div>
        <div class="wch-ask-cards">${g.cards.map(askCardHtml).join('')}</div>
      </div>`).join('');
  }
  function applyAskQuery(v) {
    askQuery = v || '';
    if (askPanel) {
      const clr = askPanel.querySelector('.wch-ask-search-clear');
      if (clr) clr.hidden = !askQuery;
    }
    renderAskList();
  }
  function clearAskQuery() {
    const inp = askPanel && askPanel.querySelector('.wch-ask-search-input');
    if (inp) { inp.value = ''; inp.focus(); }
    applyAskQuery('');
  }
  /* Reflect the panel's current state on the three-dot menu's "break out" item:
     a "split" glyph + "Break out…" label while it's the in-chat overlay, a
     "collapse" glyph + "Merge back…" label once broken out as a standalone
     module. Same glyph pair as the Turns module's dock button. */
  function updateAskBreakBtn() {
    if (!askPanel) return;
    /* The menu item may have been portaled to <body> with its popover, so look
       there too rather than only inside the panel. */
    const item = (askMorePop || askPanel).querySelector('.wch-ask-breakout')
      || askPanel.querySelector('.wch-ask-breakout');
    if (!item) return;
    item.setAttribute('aria-pressed', askDocked ? 'true' : 'false');
    const g = item.querySelector('.material-symbols-outlined');
    if (g) g.textContent = askDocked ? 'close_fullscreen' : 'vertical_split';
    const lbl = item.querySelector('.wch-ask-breakout-label');
    if (lbl) lbl.textContent = askDocked ? 'Merge back into the chat' : 'Break out as a side module';
  }
  /* Move the panel between the in-chat overlay and a standalone module docked
     to the RIGHT of the chat — a real flex sibling in the modules row, inserted
     right after the chat's mount element and dressed by the shared
     `.wch-sidebar.wch-docked` rules. Mirrors setTurnsDocked exactly. */
  function setAskDocked(on) {
    ensureAskPanel();
    askDocked = !!on;
    clearTimeout(askCloseTimer);
    if (askDocked) {
      askPanel.classList.remove('wch-open', 'wch-closing', 'wch-docked-hidden');
      askScrim.classList.remove('wch-open', 'wch-closing');
      document.removeEventListener('keydown', onAskKey);
      const container = resolveEl(opts.askBreakoutContainer) || rootEl.parentElement;
      const anchor = resolveEl(opts.askBreakoutAnchor) || rootEl;
      if (container) {
        if (anchor && anchor.parentElement === container && anchor.nextSibling) container.insertBefore(askPanel, anchor.nextSibling);
        else container.appendChild(askPanel);
      }
      askPanel.classList.add('wch-docked');
      askPanel.style.flex = '0 0 ' + askBreakoutWidth + 'px';
      askPanel.style.width = askBreakoutWidth + 'px';
      updateAskBreakBtn();
      renderAskList();
    } else {
      askPanel.classList.remove('wch-docked', 'wch-docked-hidden', 'wch-dock-conceal', 'wch-dock-reveal');
      askPanel.style.flex = '';
      askPanel.style.width = '';
      const paneHost = askHost();
      paneHost.classList.add('wch-host');
      if (!paneHost.contains(askPanel)) paneHost.appendChild(askPanel);
      updateAskBreakBtn();
      openAskHelp(); /* keep it visible as an overlay right after merging back */
    }
  }
  /* Docked reveal / conceal — the module slides out from behind the chat card
     when shown and tucks back in behind before hiding, exactly like Turns. */
  let askConcealTimer = null, askRevealTimer = null;
  function revealAskDocked() {
    if (!askPanel) return;
    clearTimeout(askRevealTimer);
    askPanel.classList.remove('wch-docked-hidden', 'wch-dock-conceal', 'wch-dock-reveal');
    void askPanel.offsetWidth;                 /* restart the animation */
    askPanel.classList.add('wch-dock-reveal');
    askRevealTimer = setTimeout(() => { if (askPanel) askPanel.classList.remove('wch-dock-reveal'); }, 480);
  }
  function concealAskDocked() {
    if (!askPanel) return;
    clearTimeout(askConcealTimer);
    askPanel.classList.remove('wch-dock-reveal');
    void askPanel.offsetWidth;
    askPanel.classList.add('wch-dock-conceal');
    askConcealTimer = setTimeout(() => {
      if (!askPanel) return;
      askPanel.classList.add('wch-docked-hidden');
      askPanel.classList.remove('wch-dock-conceal');
    }, 300);
  }
  function ensureAskPanel() {
    if (askPanel) return;
    const paneHost = rootEl.querySelector('.sc-body') || rootEl;
    paneHost.classList.add('wch-host');
    askScrim = document.createElement('div');
    askScrim.className = 'wch-scrim';
    askPanel = document.createElement('aside');
    askPanel.className = 'wch-sidebar wch-right wch-ask-panel';
    askPanel.setAttribute('aria-label', askHelpLabel || 'What can I ask?');
    askPanel.innerHTML =
      '<div class="wch-head">' +
        `<span class="wch-head-title"><span class="material-symbols-outlined">help</span>${esc(askHelpLabel || 'What can I ask?')}</span>` +
        '<div class="wch-controls">' +
          '<div class="panel-more-wrap wch-ask-more-wrap">' +
            '<button type="button" class="panel-more-btn wch-ask-more-btn" title="More options" aria-haspopup="menu" aria-expanded="false" aria-label="More options"><span class="material-symbols-outlined">more_vert</span></button>' +
            '<div class="topbar-popover hidden wch-ask-more-pop" role="menu">' +
              '<button type="button" class="topbar-menu-item wch-ask-breakout" data-ask-act="breakout"><span class="material-symbols-outlined topbar-menu-icon">vertical_split</span><span class="wch-ask-breakout-label">Break out as a side module</span></button>' +
              '<div class="topbar-menu-divider"></div>' +
              '<button type="button" class="topbar-menu-item topbar-menu-item--danger" data-ask-act="close"><span class="material-symbols-outlined topbar-menu-icon">close</span><span>Close pane</span></button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      `<p class="wch-ask-intro">${esc((askCatalog && askCatalog.intro) || 'Tap a prompt to ask it now, or use the insert icon to drop it into the message box and tweak it first.')}</p>` +
      '<div class="wch-ask-search">' +
        '<span class="material-symbols-outlined">search</span>' +
        `<input type="text" class="wch-ask-search-input" placeholder="${esc((askCatalog && askCatalog.searchPlaceholder) || 'Search prompts\u2026')}" aria-label="Search prompts" autocomplete="off">` +
        '<button type="button" class="wch-ask-search-clear" title="Clear search" aria-label="Clear search" hidden><span class="material-symbols-outlined">close</span></button>' +
      '</div>' +
      '<div class="wch-list wch-ask-list" role="list"></div>';
    paneHost.appendChild(askScrim);
    paneHost.appendChild(askPanel);
    askList = askPanel.querySelector('.wch-ask-list');
    renderAskList();
    askScrim.addEventListener('click', closeAskHelp);

    /* Header three-dot menu — holds "Break out / Merge" and "Close pane" so the
       header carries a single control (no overlapping X). The docked module
       clips its own overflow (rounded corners), so the popover is portaled to
       <body> and pinned fixed under the trigger, exactly like the Turns menu. */
    const askMoreWrap = askPanel.querySelector('.wch-ask-more-wrap');
    const askMoreBtn = askPanel.querySelector('.wch-ask-more-btn');
    askMorePop = askPanel.querySelector('.wch-ask-more-pop');
    const closeAskMore = () => {
      askMorePop.classList.add('hidden');
      askMoreBtn.classList.remove('is-open');
      askMoreBtn.setAttribute('aria-expanded', 'false');
    };
    askMoreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = askMorePop.classList.contains('hidden');
      askMorePop.classList.toggle('hidden', !willOpen);
      askMoreBtn.classList.toggle('is-open', willOpen);
      askMoreBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      if (willOpen) {
        if (askMorePop.parentElement !== document.body) document.body.appendChild(askMorePop);
        askMorePop.style.position = 'fixed';
        askMorePop.style.zIndex = '3000';
        const w = askMorePop.offsetWidth || 220;
        const r = askMoreBtn.getBoundingClientRect();
        askMorePop.style.top = (r.bottom + 6) + 'px';
        askMorePop.style.left = Math.max(6, Math.min(r.right - w, window.innerWidth - w - 6)) + 'px';
        askMorePop.style.right = 'auto';
      }
    });
    askMorePop.addEventListener('click', (e) => {
      const it = e.target.closest('[data-ask-act]');
      if (!it) return;
      const act = it.getAttribute('data-ask-act');
      closeAskMore();
      if (act === 'breakout') setAskDocked(!askDocked);
      else if (act === 'close') closeAskHelp();
    });
    document.addEventListener('click', (e) => {
      if (!askMorePop.classList.contains('hidden') && !askMoreWrap.contains(e.target) && !askMorePop.contains(e.target)) closeAskMore();
    });
    const askSearchInput = askPanel.querySelector('.wch-ask-search-input');
    const askSearchClear = askPanel.querySelector('.wch-ask-search-clear');
    if (askSearchInput) askSearchInput.addEventListener('input', () => applyAskQuery(askSearchInput.value));
    if (askSearchClear) askSearchClear.addEventListener('click', clearAskQuery);
    askPanel.addEventListener('click', (e) => {
      /* Catalog filter chip — scope the list to one section (or All). */
      const filter = e.target.closest('.wch-ask-filter');
      if (filter) {
        askSection = filter.getAttribute('data-section') || 'all';
        renderAskList();
        return;
      }
      const card = e.target.closest('[data-ask]');
      if (!card) return;
      const text = card.getAttribute('data-ask') || '';
      if (!text) return;
      /* Insert icon → drop the prompt into the composer (editable, not sent).
         Anywhere else on the card → send it straight away. */
      if (e.target.closest('[data-ask-insert]')) {
        insertAskIntoComposer(text);
      } else {
        sendAsk(text, card.getAttribute('data-intent') || undefined);
      }
    });
  }
  /* Drop a prompt into the composer, focused and grown, without sending. A
     broken-out module stays put — only the overlay form dismisses. */
  function insertAskIntoComposer(text) {
    dismissAskOverlay();
    if (!input) return;
    input.value = text;
    input.focus();
    try { input.setSelectionRange(text.length, text.length); } catch (_) {}
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  /* Post a prompt as its own turn — same routing a chip/scorecard click uses so
     the host's onIntent still drives navigation. A broken-out module stays put. */
  function sendAsk(text, intent) {
    dismissAskOverlay();
    const handled = opts.onIntent ? opts.onIntent(intent, text) : false;
    if (intent) markIntentUsed(intent);
    hideWelcome();
    addUser(text);
    if (!handled) wiseaiRespond(text, intent);
  }
  function onAskKey(e) {
    if (e.key !== 'Escape') return;
    if (askQuery && askQuery.trim()) { clearAskQuery(); return; }
    closeAskHelp();
  }
  function openAskHelp() {
    ensureAskPanel();
    if (!askPanel) return;
    /* Broken-out module: show it and slide it out from behind the chat. */
    if (askDocked) { clearTimeout(askConcealTimer); renderAskList(); revealAskDocked(); return; }
    /* Never let more than one overlay sit open at once. */
    chatHistory?.close?.();
    dismissTurnsOverlay();
    closeConnectors();
    clearTimeout(askCloseTimer);
    askPanel.classList.remove('wch-closing');
    askScrim.classList.remove('wch-closing');
    renderAskList();
    askPanel.classList.add('wch-open');
    askScrim.classList.add('wch-open');
    document.addEventListener('keydown', onAskKey);
  }
  function closeAskHelp() {
    if (!askPanel) return;
    /* Broken-out module: "close" tucks the module back in behind the chat (via
       the conceal animation) rather than running the overlay animation. */
    if (askDocked) { concealAskDocked(); return; }
    if (!askPanel.classList.contains('wch-open') && !askPanel.classList.contains('wch-closing')) return;
    askPanel.classList.remove('wch-open');
    askScrim.classList.remove('wch-open');
    askPanel.classList.add('wch-closing');
    askScrim.classList.add('wch-closing');
    document.removeEventListener('keydown', onAskKey);
    clearTimeout(askCloseTimer);
    askCloseTimer = setTimeout(() => {
      askPanel.classList.remove('wch-closing');
      askScrim.classList.remove('wch-closing');
    }, 300);
  }
  /* Close ONLY the in-chat overlay form (cross-panel coordination). A broken-
     out module is a first-class sibling of the chat, so it's left in place —
     the same contract as dismissTurnsOverlay. */
  function dismissAskOverlay() { if (askPanel && !askDocked) closeAskHelp(); }

  /* ── Turns Module — a "Fork from here" side panel ────────────────────────
     A right-docked overlay (same shell + open/close animation as History) that
     lists every TURN in the current conversation. A turn is one exchange: the
     user's line plus the WISEcodeAI reply(s) that follow it. Each turn carries a
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
    clone.querySelectorAll('.sc-line-meta, .sc-fb-wrap, .sc-inline-chips, .material-symbols-outlined, .material-symbols-outlined, .material-symbols-rounded, svg')
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
      if (node.classList.contains('sc-line-trace')) return; /* reasoning trace isn't a turn */
      if (node.classList.contains('sc-line-event')) return; /* system markers aren't turns */
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

  /* Stable-ish key for a turn's annotation: its ordinal plus a slice of the
     question, so notes stay attached as the list re-renders. */
  function turnKey(turn, i) {
    const q = turn && turn.you ? lineText(turn.you) : '';
    return i + '::' + q.slice(0, 60);
  }

  /* The turn's handle (e.g. "#6d7a") — the same id shown on the answer's
     feedback row (`.sc-fb-id`). Surfaced beside the fork icon so a forked turn
     is traceable back to the exact answer it branched from. */
  function forkIdOf(turn) {
    const rs = (turn && turn.replies) || [];
    for (let k = 0; k < rs.length; k++) {
      const el = rs[k] && rs[k].querySelector ? rs[k].querySelector('.sc-fb-id') : null;
      const t = el && el.textContent ? el.textContent.trim() : '';
      if (t) return t;
    }
    return '';
  }

  function turnRowHtml(turn, i) {
    const q = turn.you ? lineText(turn.you) : '';
    const a = turn.replies.length ? lineText(turn.replies[0]) : '';
    const chips = turnArtifacts(turn.replies)
      .map((c) => `<span class="wt-chip"><span class="material-symbols-outlined">${esc(c.icon)}</span>${esc(c.label)}</span>`)
      .join('');
    const key = turnKey(turn, i);
    const fid = forkIdOf(turn);
    const note = turnsNotesOn ? (turnNotes[key] || '') : '';
    const shareBtn = turnsShareOn
      ? `<button type="button" class="wt-iconbtn wt-share" data-share="${i}" title="Share this turn" aria-label="Share this turn"><span class="material-symbols-outlined">ios_share</span></button>`
      : '';
    const noteBtn = turnsNotesOn
      ? `<button type="button" class="wt-iconbtn wt-note-btn${note ? ' is-on' : ''}" data-note="${i}" title="${note ? 'Edit note' : 'Add a note'}" aria-label="${note ? 'Edit note on this turn' : 'Add a note to this turn'}" aria-pressed="false"><span class="material-symbols-outlined">edit_note</span></button>`
      : '';
    const noteBlock = turnsNotesOn
      ? `<div class="wt-note-saved" data-note-saved="${i}"${note ? '' : ' hidden'}><span class="material-symbols-outlined">sticky_note_2</span><span class="wt-note-saved-txt">${esc(note)}</span></div>
        <div class="wt-note" data-note-area="${i}" hidden><textarea class="wt-note-input" data-note-input="${i}" placeholder="Leave a note on this turn…" rows="2">${esc(note)}</textarea></div>`
      : '';
    return `<div class="wt-turn" data-turn="${i}" data-key="${esc(key)}">
        <div class="wt-turn-head">
          <span class="wt-turn-num">${i + 1}</span>
          <span class="wt-turn-q">${q ? esc(q) : `<em>${esc(title)} opened the conversation</em>`}</span>
        </div>
        ${a ? `<div class="wt-turn-a">${esc(a)}</div>` : ''}
        ${chips ? `<div class="wt-chips">${chips}</div>` : ''}
        <div class="wt-actions">
          <button type="button" class="wt-fork" data-fork="${i}" title="Fork from here" aria-label="Fork from here"><span class="material-symbols-outlined">alt_route</span></button>
          ${fid ? `<span class="wt-fork-id" title="Fork ID">${esc(fid)}</span>` : ''}
          ${shareBtn}
          ${noteBtn}
          <button type="button" class="wt-jump" data-jump="${i}" title="Jump to this turn"><span class="material-symbols-outlined">my_location</span>Jump</button>
        </div>
        ${noteBlock}
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
    const q = (turnsQuery || '').trim().toLowerCase();
    /* Keep original indices so fork/jump/share/note stay aligned to the live
       transcript even when the list is filtered. */
    let rows = turns.map((t, i) => ({ t, i }));
    if (q) {
      rows = rows.filter(({ t, i }) => {
        const hay = (lineText(t.you) + ' ' +
          (t.replies || []).map(lineText).join(' ') + ' ' +
          turnArtifacts(t.replies).map((c) => c.label).join(' ') + ' ' +
          (turnsNotesOn ? (turnNotes[turnKey(t, i)] || '') : '')).toLowerCase();
        return hay.indexOf(q) !== -1;
      });
    }
    if (!rows.length) {
      turnsList.innerHTML = '<div class="wt-empty">No turns match “' + esc((turnsQuery || '').trim()) + '”.</div>';
      return;
    }
    turnsList.innerHTML = rows.map(({ t, i }) => turnRowHtml(t, i)).join('');
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
      if (n.classList && (n.classList.contains('sc-line-typing') || n.classList.contains('sc-line-trace') || n.classList.contains('sc-inline-chips') || n.classList.contains('sc-fork-banner'))) continue;
      container.appendChild(n.cloneNode(true));
    }

    const sourceTitle = (chatHistory && chatHistory.currentTitle) ? chatHistory.currentTitle() : 'this conversation';
    const banner = `<div class="sc-fork-banner" role="note"><span class="sc-fork-banner-ic material-symbols-outlined">alt_route</span><span class="sc-fork-banner-txt">Forked from <strong>${esc(sourceTitle)}</strong></span></div>`;
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
      scrollToEnd();
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

  /* The user prompt that opened the turn a given transcript line belongs to.
     Unlike forking (which copies the whole conversation verbatim), the re-run /
     edit controls only carry this single prompt forward into a fresh chat. */
  function promptForLine(line) {
    if (!line) return '';
    const turns = collectTurns();
    for (const t of turns) {
      if (t.you === line || t.replies.indexOf(line) !== -1) return t.you ? lineText(t.you) : '';
    }
    return '';
  }

  /* Start a brand-new conversation seeded with just this turn's user prompt.
     autoRun=true runs it immediately (auto-replay); autoRun=false drops it into
     the composer so it can be edited before sending. The current thread is saved
     to History first, exactly like "Start new conversation". */
  function rerunFromLine(line, autoRun) {
    const text = promptForLine(line);
    if (!text) return;
    if (chatHistory && chatHistory.startNew) chatHistory.startNew();
    else reset();
    if (autoRun) {
      ask(text);
    } else if (input) {
      input.value = text;
      input.focus();
      try { input.setSelectionRange(text.length, text.length); } catch (_) {}
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

  function onTurnsKey(e) {
    if (e.key !== 'Escape') return;
    if (turnsQuery && turnsQuery.trim()) { clearTurnsQuery(); return; }
    closeTurns();
  }

  /* A small transient toast anchored inside the turns module (Share feedback). */
  let turnsToastTimer = null;
  function turnsToast(msg) {
    if (!turnsPanel) return;
    let t = turnsPanel.querySelector('.wt-toast');
    if (!t) { t = document.createElement('div'); t.className = 'wt-toast'; turnsPanel.appendChild(t); }
    t.textContent = msg;
    requestAnimationFrame(() => t.classList.add('is-vis'));
    clearTimeout(turnsToastTimer);
    turnsToastTimer = setTimeout(() => t.classList.remove('is-vis'), 1600);
  }

  /* Share a single turn — copies a deep-ish link (page URL + turn ordinal) to
     the clipboard, or hands off to the native share sheet when available. */
  function shareTurn(index) {
    const turns = collectTurns();
    if (index < 0 || index >= turns.length) return;
    const q = turns[index].you ? lineText(turns[index].you) : (title + ' — turn ' + (index + 1));
    let url = location.href.split('#')[0] + '#turn-' + (index + 1);
    const shareData = { title: 'WISEcodeAI™ turn', text: q, url };
    if (navigator.share) { navigator.share(shareData).catch(() => {}); turnsToast('Shared'); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => turnsToast('Link copied')).catch(() => turnsToast('Link copied'));
    } else { turnsToast('Link copied'); }
  }

  /* Toggle the inline note editor for a turn (annotate). */
  function toggleTurnNote(index) {
    if (!turnsList) return;
    const row = turnsList.querySelector('.wt-turn[data-turn="' + index + '"]');
    if (!row) return;
    const area = row.querySelector('[data-note-area]');
    const saved = row.querySelector('[data-note-saved]');
    if (!area) return;
    const opening = area.hasAttribute('hidden');
    if (opening) {
      area.removeAttribute('hidden');
      if (saved) saved.setAttribute('hidden', '');
      const ta = area.querySelector('.wt-note-input');
      if (ta) { ta.focus(); try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (_) {} }
    } else {
      area.setAttribute('hidden', '');
      commitTurnNote(index);
    }
  }

  /* Persist a turn's note (in-memory, keyed stably) and refresh its preview. */
  function commitTurnNote(index) {
    if (!turnsList) return;
    const row = turnsList.querySelector('.wt-turn[data-turn="' + index + '"]');
    if (!row) return;
    const ta = row.querySelector('.wt-note-input');
    const key = row.getAttribute('data-key');
    if (!ta || key == null) return;
    const val = ta.value.trim();
    if (val) turnNotes[key] = val; else delete turnNotes[key];
    const saved = row.querySelector('[data-note-saved]');
    const savedTxt = row.querySelector('.wt-note-saved-txt');
    const btn = row.querySelector('.wt-note-btn');
    if (savedTxt) savedTxt.textContent = val;
    if (saved) { if (val && row.querySelector('[data-note-area]').hasAttribute('hidden')) saved.removeAttribute('hidden'); else saved.setAttribute('hidden', ''); }
    if (btn) { btn.classList.toggle('is-on', !!val); btn.title = val ? 'Edit note' : 'Add a note'; }
  }

  function applyTurnsQuery(v) {
    turnsQuery = v || '';
    const wrap = turnsPanel && turnsPanel.querySelector('.wt-search');
    if (wrap) wrap.classList.toggle('has-q', !!turnsQuery.trim());
    renderTurns();
  }
  function clearTurnsQuery() {
    const inp = turnsPanel && turnsPanel.querySelector('.wt-search-input');
    if (inp) inp.value = '';
    applyTurnsQuery('');
    if (inp) inp.focus();
  }

  /* Width changer for the broken-out Turns module. Cycles the canonical four
     tiers shared by every module: single → double → triple → fill → single. */
  const TURNS_W_ICONS = ['width_normal', 'width_wide', 'width_full', 'width_full'];
  const TURNS_W_TITLES = [
    'Width (single) — tap to widen',
    'Width (double) — tap to widen',
    'Width (triple) — tap to widen',
    'Width (fill) — tap to reset',
  ];
  let turnsWidthTier = 0;
  function applyTurnsWidth() {
    if (!turnsPanel) return;
    /* Sticky mode narrows the base to STICKY_MODULE_W (matching History) so the
       two flanking modules are equal; tiers scale from whichever base is live. */
    const baseW = stickyOn ? STICKY_MODULE_W : turnsBreakoutWidth;
    const tiers = [baseW, Math.round(baseW * 1.5), baseW * 2];
    try { window.WisePaneResize && window.WisePaneResize.release && window.WisePaneResize.release([turnsPanel]); } catch (_) {}
    if (turnsWidthTier >= 3) {
      /* Fill — grow to take the rest of the row instead of a fixed column. */
      turnsPanel.style.setProperty('flex', '1000 1 auto', 'important');
      turnsPanel.style.setProperty('width', 'auto', 'important');
      turnsPanel.style.setProperty('max-width', 'none', 'important');
    } else {
      const w = tiers[turnsWidthTier] || baseW;
      turnsPanel.style.setProperty('flex', '0 0 ' + w + 'px', 'important');
      turnsPanel.style.setProperty('width', w + 'px', 'important');
      turnsPanel.style.setProperty('max-width', 'none', 'important');
    }
    const btn = turnsPanel.querySelector('.wt-width-btn');
    if (btn) {
      btn.classList.toggle('is-on', turnsWidthTier >= 1);
      btn.setAttribute('aria-pressed', turnsWidthTier >= 1 ? 'true' : 'false');
      btn.title = TURNS_W_TITLES[turnsWidthTier];
      const ic = btn.querySelector('.material-symbols-outlined');
      if (ic) ic.textContent = TURNS_W_ICONS[turnsWidthTier];
    }
  }
  function cycleTurnsWidth() { turnsWidthTier = (turnsWidthTier + 1) % 4; applyTurnsWidth(); }

  function ensureTurnsPanel() {
    if (turnsPanel) return;
    const paneHost = rootEl.querySelector('.sc-body') || rootEl;
    paneHost.classList.add('wch-host');
    turnsScrim = document.createElement('div');
    turnsScrim.className = 'wch-scrim';
    turnsPanel = document.createElement('aside');
    turnsPanel.className = 'wch-sidebar wch-right';
    turnsPanel.setAttribute('aria-label', 'Turns');

    const headControls = turnsDockedControls
      ? '<div class="wch-controls">' +
          '<div class="panel-more-wrap wt-more-wrap">' +
            '<button type="button" class="panel-more-btn wt-more-btn" title="More options" aria-haspopup="menu" aria-expanded="false" aria-label="More options"><span class="material-symbols-outlined">more_vert</span></button>' +
            '<div class="topbar-popover hidden wt-more-pop" role="menu">' +
              (turnsStickyToggle
                ? '<button type="button" class="topbar-menu-item topbar-menu-item--admin topbar-menu-item--toggle' + (turnsStickyDefault ? ' is-on' : '') + '" data-turns-act="sticky" role="menuitemcheckbox" aria-checked="' + (turnsStickyDefault ? 'true' : 'false') + '"><span class="material-symbols-outlined topbar-menu-icon">dock_to_right</span><span>Sticky module</span><span class="topbar-menu-badge">Admin</span><span class="topbar-menu-switch"><span class="topbar-menu-switch-thumb"></span></span></button>' +
                  '<div class="topbar-menu-divider"></div>'
                : '') +
              '<button type="button" class="topbar-menu-item topbar-menu-item--danger" data-turns-act="close"><span class="material-symbols-outlined topbar-menu-icon">close</span><span>Close panel</span></button>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="panel-width-toggle-btn wt-width-btn" aria-pressed="false" title="Width (single) — tap to widen" aria-label="Turns module width"><span class="material-symbols-outlined">width_normal</span></button>' +
        '</div>'
      : (turnsBreakout ? '<button type="button" class="wch-dock" title="Break out as a side module" aria-label="Break turns out as a side module"><span class="material-symbols-outlined">vertical_split</span></button>' : '') +
        '<button type="button" class="wch-close" title="Close" aria-label="Close"><span class="material-symbols-outlined">close</span></button>';

    const searchHtml = turnsSearchOn
      ? '<div class="wt-search">' +
          '<span class="material-symbols-outlined">search</span>' +
          '<input type="text" class="wt-search-input" placeholder="Search turns…" aria-label="Search turns" autocomplete="off">' +
          '<button type="button" class="wt-search-clear" title="Clear search" aria-label="Clear search"><span class="material-symbols-outlined">close</span></button>' +
        '</div>'
      : '';

    turnsPanel.innerHTML =
      '<div class="wch-head">' +
        '<span class="wch-head-title"><span class="material-symbols-outlined">alt_route</span>Turns</span>' +
        headControls +
      '</div>' +
      '<p class="wt-intro">Fork any turn into a brand-new chat of your own — the whole conversation up to that point is copied verbatim (nothing is re-run). The original is never touched.</p>' +
      searchHtml +
      '<div class="wt-list" role="list"></div>';
    paneHost.appendChild(turnsScrim);
    paneHost.appendChild(turnsPanel);
    turnsList = turnsPanel.querySelector('.wt-list');
    turnsScrim.addEventListener('click', closeTurns);
    const tClose = turnsPanel.querySelector('.wch-close');
    if (tClose) tClose.addEventListener('click', closeTurns);
    turnsDockBtn = (turnsBreakout && !turnsDockedControls) ? turnsPanel.querySelector('.wch-dock') : null;
    if (turnsDockBtn) turnsDockBtn.addEventListener('click', () => setTurnsDocked(!turnsDocked));
    updateTurnsDockBtn();

    /* Search wiring. */
    const tSearchInput = turnsPanel.querySelector('.wt-search-input');
    const tSearchClear = turnsPanel.querySelector('.wt-search-clear');
    if (tSearchInput) tSearchInput.addEventListener('input', () => applyTurnsQuery(tSearchInput.value));
    if (tSearchClear) tSearchClear.addEventListener('click', clearTurnsQuery);

    /* Width changer. */
    const tWidthBtn = turnsPanel.querySelector('.wt-width-btn');
    if (tWidthBtn) tWidthBtn.addEventListener('click', (e) => { e.stopPropagation(); cycleTurnsWidth(); });

    /* Three-dot menu. */
    const tMoreWrap = turnsPanel.querySelector('.wt-more-wrap');
    const tMoreBtn = turnsPanel.querySelector('.wt-more-btn');
    const tMorePop = turnsPanel.querySelector('.wt-more-pop');
    if (tMoreBtn && tMorePop) {
      const closeTMore = () => { tMorePop.classList.add('hidden'); tMoreBtn.classList.remove('is-open'); tMoreBtn.setAttribute('aria-expanded', 'false'); };
      tMoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = tMorePop.classList.contains('hidden');
        tMorePop.classList.toggle('hidden', !willOpen);
        tMoreBtn.classList.toggle('is-open', willOpen);
        tMoreBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        /* When docked, the module clips its own overflow (rounded corners), so
           pin the popover to the viewport under the button to let it escape. */
        if (willOpen && turnsDocked) positionDockedPop(tMorePop, tMoreBtn);
      });
      tMorePop.addEventListener('click', (e) => {
        const it = e.target.closest('[data-turns-act]');
        if (!it) return;
        const act = it.getAttribute('data-turns-act');
        /* "Sticky module" is a settings switch — flip it and keep the menu open
           so its state reads back (mirrors the result panes' sticky toggle). */
        if (act === 'sticky') {
          e.stopPropagation();
          setTurnsSticky(!turnsSticky);
          return;
        }
        closeTMore();
        if (act === 'close') closeTurns();
      });
      document.addEventListener('click', (e) => { if (!tMorePop.classList.contains('hidden') && !tMoreWrap.contains(e.target) && !tMorePop.contains(e.target)) closeTMore(); });
    }
    /* Apply the sticky module default (ON tucks it behind the chat). */
    if (turnsStickyToggle) setTurnsSticky(turnsSticky);

    /* Row actions: fork / jump / share / note. */
    turnsPanel.addEventListener('click', (e) => {
      const fork = e.target.closest('[data-fork]');
      if (fork) { forkFromTurn(Number(fork.getAttribute('data-fork'))); return; }
      const jump = e.target.closest('[data-jump]');
      if (jump) { jumpToTurn(Number(jump.getAttribute('data-jump'))); return; }
      const share = e.target.closest('[data-share]');
      if (share) { shareTurn(Number(share.getAttribute('data-share'))); return; }
      const note = e.target.closest('[data-note]');
      if (note) { toggleTurnNote(Number(note.getAttribute('data-note'))); return; }
    });
    turnsPanel.addEventListener('input', (e) => {
      const ta = e.target.closest('[data-note-input]');
      if (ta) commitTurnNote(Number(ta.getAttribute('data-note-input')));
    });
  }

  /* Sticky toggle for the docked Turns module: ON tucks it behind the chat,
     OFF floats it out as a free-standing card (host reacts to `.wch-unsticky`).
     Keeps the ⋯ menu item's switch state in sync. */
  function setTurnsSticky(on) {
    turnsSticky = !!on;
    if (turnsPanel) turnsPanel.classList.toggle('wch-unsticky', !turnsSticky);
    const item = turnsPanel && turnsPanel.querySelector('[data-turns-act="sticky"]');
    if (item) {
      item.classList.toggle('is-on', turnsSticky);
      item.setAttribute('aria-checked', turnsSticky ? 'true' : 'false');
    }
  }

  /* Reflect the break-out button's state: an outward "split" glyph while docked
     in the overlay, an inward "collapse" glyph once broken out (tap to merge
     back into the chat). */
  function updateTurnsDockBtn() {
    if (!turnsDockBtn) return;
    const icon = turnsDockBtn.querySelector('.material-symbols-outlined');
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

  /* Portal a docked-module popover to <body> and pin it (fixed) under its
     trigger, so the module's overflow:hidden (which clips its rounded corners)
     can't cut the popover off where it faces the chat. Right edges align. */
  function positionDockedPop(pop, btn) {
    if (!pop || !btn) return;
    if (pop.parentElement !== document.body) document.body.appendChild(pop);
    pop.style.transition = 'none';
    pop.style.position = 'fixed';
    pop.style.left = '-9999px';
    pop.style.top = '-9999px';
    pop.style.right = 'auto';
    pop.style.zIndex = '3000';
    const w = pop.offsetWidth || 240;
    const r = btn.getBoundingClientRect();
    const left = Math.max(6, Math.min(r.right - w, window.innerWidth - w - 6));
    pop.style.top = (r.bottom + 6) + 'px';
    pop.style.left = left + 'px';
    requestAnimationFrame(() => { pop.style.transition = ''; });
  }

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
      turnsPanel.classList.add('wch-docked');
      if (turnsDockedControls) applyTurnsWidth();
      else { turnsPanel.style.flex = '0 0 ' + turnsBreakoutWidth + 'px'; turnsPanel.style.width = turnsBreakoutWidth + 'px'; }
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

  /* ── Docked reveal / conceal ──────────────────────────────────────────────
     A docked module lives a layer below the chat, so revealing it slides it out
     from behind the chat card and concealing it tucks it back in behind before
     it's removed from view. (Overlay mode keeps its own scrim animation.) */
  let turnsConcealTimer = null;
  let turnsRevealTimer = null;
  function revealTurnsDocked() {
    if (!turnsPanel) return;
    clearTimeout(turnsRevealTimer);
    turnsPanel.classList.remove('wch-docked-hidden', 'wch-dock-conceal', 'wch-dock-reveal');
    void turnsPanel.offsetWidth;               /* restart the animation */
    turnsPanel.classList.add('wch-dock-reveal');
    turnsRevealTimer = setTimeout(() => { if (turnsPanel) turnsPanel.classList.remove('wch-dock-reveal'); }, 480);
  }
  function concealTurnsDocked() {
    if (!turnsPanel) return;
    clearTimeout(turnsConcealTimer);
    turnsPanel.classList.remove('wch-dock-reveal');
    void turnsPanel.offsetWidth;
    turnsPanel.classList.add('wch-dock-conceal');
    turnsConcealTimer = setTimeout(() => {
      if (!turnsPanel) return;
      turnsPanel.classList.add('wch-docked-hidden');
      turnsPanel.classList.remove('wch-dock-conceal');
    }, 300);
  }

  function openTurns() {
    ensureTurnsPanel();
    if (!turnsPanel) return;
    /* Broken-out module: show it and slide it out from behind the chat. */
    if (turnsDocked) { clearTimeout(turnsConcealTimer); renderTurns(); revealTurnsDocked(); syncTurnsMenu(); return; }
    /* Never let two overlays sit open at once. */
    chatHistory?.close?.();
    closeConnectors();
    dismissAskOverlay();
    clearTimeout(turnsCloseTimer);
    turnsPanel.classList.remove('wch-closing');
    turnsScrim.classList.remove('wch-closing');
    renderTurns();
    turnsPanel.classList.add('wch-open');
    turnsScrim.classList.add('wch-open');
    document.addEventListener('keydown', onTurnsKey);
    syncTurnsMenu();
  }
  function closeTurns() {
    if (!turnsPanel) return;
    /* Broken-out module: "close" tucks the module back in behind the chat (via
       the conceal animation) rather than running the overlay animation. */
    if (turnsDocked) { concealTurnsDocked(); syncTurnsMenu(); return; }
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
    syncTurnsMenu();
  }
  function toggleTurns() {
    if (turnsDocked) {
      if (turnsPanel && (turnsPanel.classList.contains('wch-docked-hidden') || turnsPanel.classList.contains('wch-dock-conceal'))) openTurns();
      else closeTurns();
      syncTurnsMenu();
      return;
    }
    if (turnsPanel && turnsPanel.classList.contains('wch-open')) closeTurns();
    else openTurns();
    syncTurnsMenu();
  }

  /* Whether the Turns module is currently visible (docked-and-shown, or the
     overlay is open). Drives the on/off switch in the chat's three-dot menu. */
  function isTurnsVisible() {
    if (!turnsPanel) return false;
    if (turnsPanel.classList.contains('wch-dock-conceal')) return false;
    if (turnsDocked) return !turnsPanel.classList.contains('wch-docked-hidden');
    return turnsPanel.classList.contains('wch-open');
  }
  function syncTurnsMenu() {
    const item = rootEl.querySelector('[data-sc="turns"]');
    if (!item) return;
    const on = isTurnsVisible();
    item.classList.toggle('is-on', on);
    item.setAttribute('aria-checked', on ? 'true' : 'false');
  }
  /* Whether the History & Projects module is currently revealed (docked reveal or
     overlay open). Mirrors isTurnsVisible for the sibling module. */
  function isHistoryVisible() {
    if (!chatHistory || !chatHistory.root) return false;
    const el = chatHistory.root;
    if (el.classList.contains('wch-dock-conceal')) return false;
    if (chatHistory.isDocked && chatHistory.isDocked()) return !el.classList.contains('wch-docked-hidden');
    return chatHistory.isOpen ? chatHistory.isOpen() : el.classList.contains('wch-open');
  }
  /* Sync the History & Projects on/off switch (only present when the injected
     menu entry opts into the sc-mcp-item switch styling). */
  function syncHistoryMenu() {
    const item = rootEl.querySelector('[data-sc="history"].sc-mcp-item');
    if (!item) return;
    const on = isHistoryVisible();
    item.classList.toggle('is-on', on);
    item.setAttribute('aria-checked', on ? 'true' : 'false');
  }
  /* Sync the "Compact spacing" switch to the shared <html>.chat-compact state.
     Called on mount and whenever any module flips it (via the wise:chat-compact
     event), so every open chat's switch reflects the one shared setting. */
  function syncCompactMenu() {
    const item = rootEl.querySelector('[data-sc="compact"]');
    if (!item) return;
    const on = document.documentElement.classList.contains('chat-compact');
    item.classList.toggle('is-on', on);
    item.setAttribute('aria-checked', on ? 'true' : 'false');
  }
  document.addEventListener('wise:chat-compact', syncCompactMenu);
  /* Sync the "Brand AI text" switch to the shared <html>.chat-brandtext state.
     Called on mount and whenever any module flips it (via the wise:chat-brandtext
     event), so every open chat's switch reflects the one shared setting. */
  function syncBrandtextMenu() {
    const item = rootEl.querySelector('[data-sc="brandtext"]');
    if (!item) return;
    const on = document.documentElement.classList.contains('chat-brandtext');
    item.classList.toggle('is-on', on);
    item.setAttribute('aria-checked', on ? 'true' : 'false');
  }
  document.addEventListener('wise:chat-brandtext', syncBrandtextMenu);
  /* ── "Background animation" (Admin) engine ─────────────────────────────────
     A welcome-only ambient canvas: a DNA/RNA double helix whose two backbones +
     base-pair "rungs" are drawn in brand blue, chain-linking a run of OUR REAL
     PRODUCT PHOTOS drawn as round thumbnails (the app's circular product "bug"),
     with the WISEcodeAI owl logo itself sprinkled into the chain in a few places.
     It runs along a tilted, slowly-swaying axis that descends left→right (high on
     the left, low on the right); its loops TRAVEL end-to-end at a slow crawl — a
     moving twist, not an in-place spin. The strand EXPANDS AND CONTRACTS, its radius
     swelling wide then drawing back in on a slow breathing cycle. Depth trades the
     strands front/back in 3-D: near products swell and brighten, far ones shrink and
     fade. The canvas is created lazily the first time the animation is turned on,
     lives behind the welcome content (which goes transparent while live), and is
     torn down to a cleared, faded layer the instant the transcript advances. */
  const bgAnim = (() => {
    /* Our real products, strung along the helix (cycled across columns) and drawn as
       circular thumbnails — the same round product "bug" the app uses in its portfolio
       / comparison tables. `img` is relative to assets/; name/brand/upc feed the hover
       card + its "Open Nutrition Facts" deep-link. */
    const PRODUCTS = [
      { img: 'portfolio/coconut_brownies.png', name: 'Toasted Coconut Brownies-12 ct', brand: 'Flax4Life', upc: '8 57287 00420 3' },
      { img: 'portfolio/chocolate_chip_muffins.png', name: 'Chocolate Chip Muffins-4 ct', brand: 'Flax4Life', upc: '0 65776 63152 0' },
      { img: 'portfolio/blueberry_muffins.png', name: 'Blueberry Muffins-4 ct', brand: 'Flax4Life', upc: '0 65776 63153 7' },
      { img: 'portfolio/apple_cinnamon_muffins.png', name: 'Apple Cinnamon Muffins-4 ct', brand: 'Flax4Life' },
      { img: 'portfolio/oatmeal_raisin_cookies.png', name: 'Oatmeal Raisin Cookies-5 ct', brand: 'Flax4Life', upc: '8 57287 00456 2' },
      { img: 'portfolio/dark_cherry_brownies.png', name: 'Mini Dark Cherry Brownie Flax Muffins', brand: 'Flax4Life' },
      { img: 'portfolio/chocolate_brownies.png', name: 'Chocolate Brownies-12 ct', brand: 'Flax4Life' },
      { img: 'portfolio/carrot_raisin_muffins.png', name: 'Carrot Raisin Muffins-4 ct', brand: 'Flax4Life' },
      { img: 'portfolio/granola.jpg', name: 'Chunky Chocolate Granola', brand: 'Flax4Life', upc: '8 57287 00427 2' },
      { img: 'portfolio/vegan_blueberry_mini.png', name: 'Vegan Blueberry Mini Muffins', brand: 'Flax4Life' },
      { img: 'top5-ginger-turmeric-bar.png', name: 'Ginger Turmeric Bar', brand: 'Date Better' },
      { img: 'top5-almond-coconut-crisp.png', name: 'Almond Coconut Crisp', brand: 'Date Better' },
      { img: 'top5-pistachio-rose-bar.png', name: 'Pistachio Rose Bar', brand: 'Date Better' },
      { img: 'top5-matcha-cashew-bites.png', name: 'Matcha Cashew Bites', brand: 'Date Better' },
      { img: 'top5-walnut-brownie-bar.png', name: 'Walnut Brownie Bar', brand: 'Date Better' },
      { img: 'date-better-cashew-lime-crisp.png', name: 'Cashew Lime Crisp', brand: 'Date Better' },
      { img: 'verification/ns-powdered-vitamin-eggs.png', name: 'Powdered Vitamin Eggs', brand: 'Nutrient Survival', upc: '818491020984' },
      { img: 'verification/ns-homestyle-scramble.png', name: 'Homestyle Scramble — Protein Meal', brand: 'Nutrient Survival' },
      { img: 'verification/ns-triple-cheese-mac.png', name: 'Triple Cheese Mac — Protein Meal', brand: 'Nutrient Survival' },
      { img: 'verification/ns-protein-cereal-chocolate.png', name: 'Protein Cereal — Chocolate', brand: 'Nutrient Survival' },
      { img: 'verification/ns-freeze-dried-mixed-vegetables.png', name: 'Freeze-Dried Mixed Vegetables', brand: 'Nutrient Survival' },
      { img: 'verification/ns-powdered-vitamin-milk.png', name: 'Powdered Vitamin Milk', brand: 'Nutrient Survival' }
    ];
    let canvas = null, ctx = null, buf = null, bctx = null, raf = 0, ro = null, images = null, owlImg = null;
    let rgb = [37, 80, 124], w = 0, h = 0, dpr = 1, t0 = 0, running = false;
    /* Hover interaction state: the product circles' hit boxes from the last frame, the
       currently hovered product, the branded info card, and the freeze bookkeeping. */
    let hitNodes = [], hoverImg = null, hoverX = -1, hoverY = -1;
    let frozen = false, frozenT = 0, card = null, overCard = false, hideTimer = 0;

    /* Resolve assets/ relative to THIS module so the photos load no matter how deep
       the host page sits; falls back to the project's ../assets convention. */
    function assetBase() {
      try { return new URL('../assets/', import.meta.url).href; } catch (_) {}
      return '../assets/';
    }

    function loadImages() {
      if (images) return;
      images = {};
      const base = assetBase();
      PRODUCTS.forEach((p) => {
        const im = new Image();
        im.decoding = 'async';
        im.src = base + p.img;
        images[p.img] = im;
      });
      /* The WISEcodeAI owl mark itself — the same logo that sits at the chat's centre —
         rides the strand as a recurring node. Sized explicitly so the SVG data URL has
         an intrinsic width for drawImage. */
      owlImg = new Image();
      owlImg.decoding = 'async';
      owlImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(OWL_MARK.replace('<svg ', '<svg width="193" height="100" '));
    }

    /* Draw the owl as a brand-blue disc with the white owl mark centred, ringed to match
       the DNA strand stroke — the centre logo, now travelling the helix. */
    function drawOwl(cx, cy, d, discAlpha, strokeAlpha) {
      const [r, g, b] = rgb;
      const rad = d / 2;
      ctx.globalAlpha = Math.min(1, discAlpha);
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
      ctx.fill();
      if (owlImg && owlImg.complete && owlImg.naturalWidth) {
        const ow = d * 0.72;                        // 0.6 base, enlarged 20% within the circle
        const oh = ow * (owlImg.naturalHeight / owlImg.naturalWidth || 100 / 193);
        ctx.drawImage(owlImg, cx - ow / 2, cy - oh / 2, ow, oh);
      }
      ctx.globalAlpha = Math.min(1, strokeAlpha);
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    /* Draw a product photo as a circular thumbnail (cover-fit + clip), ringed in the
       brand blue. An OPAQUE backing disc is laid down first so the DNA strand lines can
       never show through the photo — regardless of the field's opacity setting. */
    function drawBug(im, cx, cy, d, alpha) {
      const [r, g, b] = rgb;
      const rad = d / 2;
      ctx.save();
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.closePath();
      ctx.fillStyle = '#ffffff'; ctx.fill();      // solid backing → nothing behind bleeds through
      ctx.clip();
      const iw = im.naturalWidth || 1, ih = im.naturalHeight || 1;
      const s = Math.max(d / iw, d / ih) * 1.2;   // cover-fit, image enlarged 20% within the circle
      ctx.drawImage(im, cx - iw * s / 2, cy - ih * s / 2, iw * s, ih * s);
      ctx.restore();
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    /* Read the live brand blue off the theme (bright variant in dark mode) so the
       strands always track the palette; falls back to the canonical --primary. */
    function readColor() {
      let col = '#25507C';
      try {
        const cs = getComputedStyle(document.documentElement);
        const dark = document.documentElement.classList.contains('dark');
        col = ((dark ? cs.getPropertyValue('--primary-bright') : cs.getPropertyValue('--primary')) || '').trim() || col;
      } catch (_) {}
      if (col[0] === '#') {
        let x = col.slice(1);
        if (x.length === 3) x = x.split('').map((c) => c + c).join('');
        const n = parseInt(x, 16);
        if (!isNaN(n)) return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      }
      const m = col.match(/(\d+)[^\d]+(\d+)[^\d]+(\d+)/);
      return m ? [+m[1], +m[2], +m[3]] : [37, 80, 124];
    }

    function ensure() {
      if (canvas) return;
      const body = rootEl.querySelector('.sc-body');
      if (!body) return;
      loadImages();
      canvas = document.createElement('canvas');
      canvas.className = 'sc-bganim-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      body.insertBefore(canvas, body.firstChild);
      ctx = canvas.getContext('2d');
      buf = document.createElement('canvas');            // offscreen: draw opaque, blit at opacity
      bctx = buf.getContext('2d');
      buildCard(body);
      resize();
      try { ro = new ResizeObserver(resize); ro.observe(body); } catch (_) {}
      /* Hover interaction — listen on the body so we get coordinates even though the
         canvas sits behind the (transparent) welcome. Hovering a product freezes the
         helix and opens its card; leaving both the product and the card resumes it. */
      body.addEventListener('mousemove', onMove);
      body.addEventListener('mouseleave', () => { if (!overCard) scheduleHide(); });
    }

    /* The branded hover card (our surface + tokens) with a thumbnail, name/brand and a
       deep-link into the product's Nutrition Facts (NFP) view. */
    function buildCard(body) {
      card = document.createElement('div');
      card.className = 'wch-food-card';
      card.hidden = true;
      card.innerHTML =
        '<div class="wch-food-card-top">' +
          '<span class="wch-food-card-thumb"><img alt="" /></span>' +
          '<span class="wch-food-card-meta"><span class="wch-food-card-brand"></span>' +
          '<span class="wch-food-card-name"></span></span>' +
        '</div>' +
        '<a class="wch-food-card-link" href="#"><span>View Details</span>' +
          '<span class="material-symbols-outlined">arrow_outward</span></a>';
      body.appendChild(card);
      card.addEventListener('mouseenter', () => { overCard = true; if (hideTimer) { clearTimeout(hideTimer); hideTimer = 0; } });
      card.addEventListener('mouseleave', () => { overCard = false; scheduleHide(); });
    }

    /* Point-in-circle hit test against the last frame's product bugs, front-most first.
       Only the circle itself is interactive — a tiny pad forgives the moving target, but
       hovering the surrounding strand does NOT trigger the popover. */
    function hitTest(mx, my) {
      const pad = 2;
      for (let i = hitNodes.length - 1; i >= 0; i--) {
        const n = hitNodes[i];
        const dx = mx - n.x, dy = my - n.y;
        const rr = n.r + pad;
        if (dx * dx + dy * dy <= rr * rr) return n;
      }
      return null;
    }

    function onMove(e) {
      if (!rootEl.classList.contains('sc-bganim-live')) return;
      const body = canvas && canvas.parentElement;
      if (!body) return;
      const rect = body.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const hit = hitTest(mx, my);
      if (hit) {
        body.style.cursor = 'pointer';                 // affordance: the bugs are interactive
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = 0; }
        showCard(hit);
      } else {
        body.style.cursor = '';
        if (!overCard) scheduleHide();
      }
    }

    function scheduleHide() {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => { hideTimer = 0; if (!overCard) hideCard(); }, 140);
    }

    /* Freeze the helix on the hovered product and fill + place the card beside it. */
    function showCard(node) {
      const p = node.prod;
      if (!p) return;
      /* Same bug already open — nothing to redo. */
      if (frozen && hoverImg === p.img && Math.abs(hoverX - node.x) < 1 && Math.abs(hoverY - node.y) < 1) return;
      freeze();
      hoverImg = p.img; hoverX = node.x; hoverY = node.y;
      if (card) {
        const img = card.querySelector('img');
        if (img) img.src = assetBase() + p.img;
        const nm = card.querySelector('.wch-food-card-name');
        if (nm) nm.textContent = p.name || '';
        const br = card.querySelector('.wch-food-card-brand');
        if (br) br.textContent = p.brand || '';
        const link = card.querySelector('.wch-food-card-link');
        if (link) link.setAttribute('href', nfpHref(p));
        card.hidden = false;
        placeCard(node);                         // unhidden first so we can measure + pick a side
        card.style.animation = 'none';           // restart the pop-in every time it appears
        void card.offsetWidth;
        card.style.animation = '';
      }
      redraw();
    }

    /* Lay the card OVER the hovered bug — its round thumbnail sits exactly on top of the
       circle so the product never reads twice — and let the rest of the card fan out to
       whichever side has room (right by default, left when close to the right edge). The
       layout mirrors so the thumbnail is always the edge that covers the bug. */
    function placeCard(node) {
      if (!card) return;
      const body = canvas.parentElement;
      const cw = card.offsetWidth || 340, ch = card.offsetHeight || 148;
      const bw = body.clientWidth || w, bh = body.clientHeight || h;
      const PAD = 18, THUMB = 68;                     // must track the card CSS
      const anchor = PAD + THUMB / 2;                 // thumb centre offset from its edge
      const toLeft = (node.x - anchor + cw + 8) > bw; // card would overflow the right edge
      card.classList.toggle('is-left', toLeft);
      let x = toLeft ? (node.x - (cw - anchor)) : (node.x - anchor);
      let y = node.y - anchor;                        // thumb sits over the bug vertically
      x = Math.max(8, Math.min(x, bw - cw - 8));
      y = Math.max(8, Math.min(y, bh - ch - 8));
      card.style.left = x + 'px';
      card.style.top = y + 'px';
    }

    function hideCard() {
      hoverImg = null; hoverX = hoverY = -1;
      if (card) card.hidden = true;
      const body = canvas && canvas.parentElement;
      if (body) body.style.cursor = '';
      resume();
    }

    /* Deep-link into the product's Nutrition Facts (NFP) view — mirrors the portfolio /
       dashboard "View" href (view-product.html?name=…&upc=…&img=…). */
    function nfpHref(p) {
      const params = new URLSearchParams();
      if (p.name) params.set('name', p.name);
      if (p.upc) params.set('upc', p.upc);
      params.set('img', assetBase() + p.img);
      const qs = params.toString();
      return 'view-product.html' + (qs ? '?' + qs : '');
    }

    function freeze() {
      if (frozen) return;
      frozen = true;
      if (running && raf) { cancelAnimationFrame(raf); raf = 0; }
      running = false;
    }

    function resume() {
      if (!frozen) return;
      frozen = false;
      if (!bgAnimOn || prefersReducedMotion) return;
      if (!rootEl.classList.contains('sc-bganim-live')) return;
      /* Continue the timeline from where it froze so nothing jumps. */
      t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - frozenT * 1000;
      running = true;
      raf = requestAnimationFrame(frame);
    }

    /* Repaint the current (frozen) frame — used when the hover highlight changes. */
    function redraw() { draw(frozenT); }

    function resize() {
      if (!canvas || !ctx) return;
      const body = canvas.parentElement;
      if (!body) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = body.clientWidth; h = body.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (buf && bctx) {
        buf.width = canvas.width; buf.height = canvas.height;
        bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      /* Keep a shown card glued to its bug after a resize/reflow. */
      if (card && !card.hidden && hoverX >= 0) placeCard({ x: hoverX, y: hoverY, r: 17 });
    }

    /* Smootherstep for the soft fade at the strand's two ends. */
    function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

    /* Paint one frame at time `t` (seconds). The strand runs along a tilted, slowly-
       swaying axis that DESCENDS left→right (high on the left, low on the right); its
       loops TRAVEL end-to-end at a slow crawl (a moving twist, not an in-place spin).
       The helix EXPANDS AND CONTRACTS as a very slow wave that travels left→right — at
       any instant one stretch is fattening while another is pinching in. The product
       photos are drawn as identical, fixed-size circles (no per-item resizing); their
       ring matches the strand stroke, and everything is scaled by the shared opacity. */
    function draw(t) {
      if (!ctx || !bctx || w < 2 || h < 2) return;
      frozenT = t;                                               // remember the last painted time (for freeze/redraw)
      const O = Math.max(0, Math.min(1, effectiveBgAnimOpacity())); // shared opacity control (pane-count default until user-set)
      /* Draw the whole field to an OFFSCREEN buffer at full strength — the opaque product
         discs hide the strand lines *inside* the buffer — then blit the buffer onto the
         visible canvas at O. So the opacity slider fades EVERYTHING together, yet no line
         ever shows through a circle. `ctx` is aliased to the buffer for the render below. */
      const mainCtx = ctx;
      ctx = bctx;
      ctx.clearRect(0, 0, w, h);
      const [r, g, b] = rgb;
      const cx = w / 2, cy = h * 0.36;                           // ride higher in the chat body
      const intro = 1 - Math.pow(1 - Math.min(1, t / 3.2), 3);   // gentle grow-in over ~3.2s
      /* Angled axis that slowly sways; base tilt is POSITIVE so the strand rides high
         on the left and drops toward the right. */
      const theta = 0.17 + 0.06 * Math.sin(t * 0.045);
      const ax = Math.cos(theta), ay = Math.sin(theta);          // along-axis unit vector
      const px = -Math.sin(theta), py = Math.cos(theta);         // perpendicular unit vector
      const L = Math.hypot(w, h) * 1.2;                          // cover the tilted diagonal
      /* Depth "breathes" on an ultra-slow, irregular cycle (~2–3 min): the helix opens
         and closes its 3-D volume every once in a while, very very slowly. */
      const depth = 1 + 0.16 * Math.sin(t * 0.02) + 0.07 * Math.sin(t * 0.009 + 1.3);
      const ampBase = Math.min(h * 0.26, 120) * depth;
      const prodSize = 34;                                       // base circle size (before depth + breath)
      /* Expand ↔ contract as a slow wave travelling left→right along the strand. */
      const breathK = (Math.PI * 2 * 1.4) / L;                   // ~1.4 squeezes across the strand
      const breathSpeed = 0.11;                                  // how fast the wave crawls (very slow)
      /* --- Sample the double helix at HIGH resolution so the backbones read as smooth,
         rounded flows (a real DNA helix is two out-of-phase sine curves, not a zig-zag).
         `lambda` is the pitch (px per full turn); `phase` crawls the twist along the axis
         very slowly; each sample carries z = depth so we can shade + sort front/back. --- */
      const lambda = Math.max(150, Math.min(240, L / 5.5));      // pitch — long, gentle loops
      const kw = (Math.PI * 2) / lambda;                         // angular frequency along axis
      const twistDrift = 1 + 0.05 * Math.sin(t * 0.03);          // pitch drifts a touch, slowly
      const phase = t * 0.08;                                    // loops crawl along the axis (very slow)
      const STEP = 7;                                            // px between samples → rounded curve
      const N = Math.max(24, Math.round(L / STEP));
      const A = [], B = [];
      for (let i = 0; i <= N; i++) {
        const u = (i / N - 0.5) * L;
        const phi = u * kw * twistDrift - phase;
        const s = Math.sin(phi), c = Math.cos(phi);
        const endFade = smooth((L * 0.5 - Math.abs(u)) / (L * 0.13));
        const amp = ampBase * intro * (1 + 0.4 * Math.sin(u * breathK - t * breathSpeed));
        const bx = cx + ax * u, by = cy + ay * u;                // point on the axis
        A.push({ x: bx + px * amp * s, y: by + py * amp * s, z: c, alpha: endFade });
        B.push({ x: bx - px * amp * s, y: by - py * amp * s, z: -c, alpha: endFade });
      }
      /* --- Backbones as depth-sorted round-capped segments: the nearer half of each turn
         (z→+1) is drawn thicker + brighter and OVER the farther half (z→−1), so the two
         strands weave in front of / behind one another — a rounded, 3-D tube. --- */
      const segs = [];
      for (let i = 0; i < N; i++) {
        const pa = A[i], qa = A[i + 1], pb = B[i], qb = B[i + 1];
        if (Math.min(pa.alpha, qa.alpha) > 0.01) segs.push({ x1: pa.x, y1: pa.y, x2: qa.x, y2: qa.y, z: (pa.z + qa.z) * 0.5, a: Math.min(pa.alpha, qa.alpha) });
        if (Math.min(pb.alpha, qb.alpha) > 0.01) segs.push({ x1: pb.x, y1: pb.y, x2: qb.x, y2: qb.y, z: (pb.z + qb.z) * 0.5, a: Math.min(pb.alpha, qb.alpha) });
      }
      segs.sort((m, n) => m.z - n.z);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const seg of segs) {
        const d = (seg.z + 1) * 0.5;                             // 0 (far) → 1 (near)
        const la = seg.a * (0.26 + 0.6 * d);
        if (la <= 0.01) continue;
        ctx.lineWidth = 1.1 + 1.9 * d;                           // near strand is fatter
        ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + la + ')';
        ctx.beginPath(); ctx.moveTo(seg.x1, seg.y1); ctx.lineTo(seg.x2, seg.y2); ctx.stroke();
      }
      /* Rungs — base-pair links, a couple per turn, shaded by their own depth. */
      const rungEvery = Math.max(4, Math.round(lambda / (STEP * 2)));
      for (let i = 0; i <= N; i += rungEvery) {
        const p = A[i], q = B[i];
        const a = Math.min(p.alpha, q.alpha);
        if (a <= 0.01) continue;
        const d = (((p.z + q.z) * 0.5) + 1) * 0.5;
        const la = a * (0.16 + 0.28 * d);
        ctx.lineWidth = 1.1 + 0.6 * d;
        ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + la + ')';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      }
      /* A slow, deep "breath" pulses every circle's size together — echoing the original
         centre owl's pulse. Combined with depth (near = bigger), the circles swell as they
         come to the FRONT of the helix and shrink as they swing to the back. */
      const breathe = 1 + 0.09 * Math.sin(t * 0.42);             // deep + slow, ~15s
      const nodeEvery = Math.max(3, Math.round(48 / STEP));
      const nodes = [];
      let ni = 0;
      for (let i = 0; i <= N; i += nodeEvery) {
        const owlA = (ni % 7 === 3), owlB = (ni % 7 === 0);
        const a = A[i], b = B[i];
        nodes.push({ x: a.x, y: a.y, z: a.z, alpha: a.alpha, owl: owlA, prod: owlA ? null : PRODUCTS[ni % PRODUCTS.length] });
        nodes.push({ x: b.x, y: b.y, z: b.z, alpha: b.alpha, owl: owlB, prod: owlB ? null : PRODUCTS[(ni + 11) % PRODUCTS.length] });
        ni++;
      }
      nodes.sort((p, q) => p.z - q.z);
      hitNodes = [];
      for (const n of nodes) {
        if (n.alpha <= 0.02) continue;
        const d = (n.z + 1) * 0.5;                               // 0 (far) → 1 (near)
        const size = prodSize * (0.74 + 0.54 * d) * breathe;     // near circles are larger
        const rad = size / 2;
        if (n.owl) { drawOwl(n.x, n.y, size, n.alpha, n.alpha); continue; }
        if (!n.prod) continue;
        const im = images && images[n.prod.img];
        if (!im || !im.complete || !im.naturalWidth) continue;
        const isHover = hoverImg && n.prod.img === hoverImg && Math.abs(n.x - hoverX) < 1 && Math.abs(n.y - hoverY) < 1;
        drawBug(im, n.x, n.y, size, n.alpha);
        if (isHover) {
          ctx.globalAlpha = 1;
          ctx.beginPath(); ctx.arc(n.x, n.y, rad + 1.5, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        hitNodes.push({ x: n.x, y: n.y, r: rad, prod: n.prod });
      }
      /* Blit the finished (opaque) buffer onto the visible canvas at the field opacity. */
      ctx = mainCtx;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, buf.width, buf.height);
      ctx.globalAlpha = O;
      ctx.drawImage(buf, 0, 0);
      ctx.restore();
    }

    function frame(now) {
      if (!running) return;
      if (!t0) t0 = now;
      draw((now - t0) / 1000);
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (!bgAnimOn || typeof document === 'undefined') return;
      ensure();
      if (!canvas || !ctx) return;
      rgb = readColor();
      rootEl.classList.add('sc-bganim-live');
      /* Reduced-motion: honour the calm by painting a single still frame of the strip. */
      if (prefersReducedMotion) {
        running = false; frozen = false; if (raf) { cancelAnimationFrame(raf); raf = 0; }
        t0 = 0; draw(3);
        /* Photos/owl may still be loading — repaint once they arrive so the still frame fills in. */
        const pending = images ? PRODUCTS.map((p) => images[p.img]).concat(owlImg ? [owlImg] : []) : [];
        pending.forEach((im) => { if (im && !im.complete) im.addEventListener('load', () => { if (!running) draw(3); }, { once: true }); });
        return;
      }
      if (running) return;
      running = true; t0 = 0;
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      running = false; frozen = false;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = 0; }
      overCard = false; hoverImg = null; hoverX = hoverY = -1;
      if (card) card.hidden = true;
      const cbody = canvas && canvas.parentElement;
      if (cbody) cbody.style.cursor = '';
      rootEl.classList.remove('sc-bganim-live');
      if (ctx) ctx.clearRect(0, 0, w, h);
    }

    return { start, stop };
  })();
  /* Sync the "Background animation" switch to this surface's on/off state, and
     (re)start or stop the field to match — but only draw while the welcome is up,
     so turning it on mid-conversation just arms it for the next welcome. Shared
     app-wide: the wise:chat-bg-anim broadcast keeps every mounted chat in step. */
  function syncBgAnimMenu() {
    const item = rootEl.querySelector('[data-sc="bg-anim"]');
    if (item) {
      item.classList.toggle('is-on', bgAnimOn);
      item.setAttribute('aria-checked', bgAnimOn ? 'true' : 'false');
    }
    /* The opacity slider (below the toggle) dims + locks while the animation is off. */
    const detail = rootEl.querySelector('.sc-bganim-detail');
    if (detail) detail.classList.toggle('is-disabled', !bgAnimOn);
    const pct = Math.round(effectiveBgAnimOpacity() * 100);
    const range = rootEl.querySelector('.sc-bganim-opacity');
    if (range && document.activeElement !== range) range.value = String(pct);
    const val = rootEl.querySelector('.sc-bganim-opacity-val');
    if (val) val.textContent = pct + '%';
  }
  document.addEventListener('wise:chat-bg-anim', (e) => {
    bgAnimOn = !!(e && e.detail && e.detail.on);
    syncBgAnimMenu();
    if (bgAnimOn && welcome && !welcome.classList.contains('sc-hidden')) bgAnim.start();
    else bgAnim.stop();
  });
  /* Opacity slider — drag to fade the whole field. Persist + broadcast so every
     mounted chat's slider (and its live canvas) follows the one shared setting.
     draw() multiplies every alpha by bgAnimOpacity, so a running field updates on
     the next frame; a paused reduced-motion still frame is repainted via start(). */
  const bgOpacityRange = rootEl.querySelector('.sc-bganim-opacity');
  if (bgOpacityRange) {
    bgOpacityRange.addEventListener('input', () => {
      const pct = Math.max(10, Math.min(100, parseInt(bgOpacityRange.value, 10) || 100));
      bgAnimOpacity = pct / 100;
      bgAnimOpacityUserSet = true;                 // an explicit drag overrides the pane-count default
      try { localStorage.setItem(BGANIM_OPACITY_KEY, String(pct)); } catch (_) {}
      try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-opacity', { detail: { opacity: bgAnimOpacity } })); } catch (_) {}
      const val = rootEl.querySelector('.sc-bganim-opacity-val');
      if (val) val.textContent = pct + '%';
      if (prefersReducedMotion && bgAnimOn) bgAnim.start();
    });
  }
  document.addEventListener('wise:chat-bg-anim-opacity', (e) => {
    const v = e && e.detail && e.detail.opacity;
    if (typeof v !== 'number') return;
    bgAnimOpacity = Math.max(0.1, Math.min(1, v));
    bgAnimOpacityUserSet = true;                    // mirror the sibling chat's explicit choice
    syncBgAnimMenu();
    if (prefersReducedMotion && bgAnimOn) bgAnim.start();
  });
  /* Sync the "Response streaming" controls — the master switch plus the
     three-level segment — to the shared streamOn/streamLevel. Called on mount
     and whenever any module changes either (via wise:chat-stream-on /
     wise:chat-stream-level), so every open chat's menu reflects the one shared
     setting. The segment dims while the master switch is off. */
  function syncStreamMenu() {
    const tog = rootEl.querySelector('[data-sc="stream-toggle"]');
    if (tog) {
      tog.classList.toggle('is-on', streamOn);
      tog.setAttribute('aria-checked', streamOn ? 'true' : 'false');
    }
    const seg = rootEl.querySelector('.sc-stream-detail');
    if (seg) seg.classList.toggle('is-disabled', !streamOn);
    rootEl.querySelectorAll('.sc-stream-seg-btn').forEach((el) => {
      const on = el.dataset.stream === streamLevel;
      el.classList.toggle('is-on', on);
      el.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  }
  document.addEventListener('wise:chat-stream-level', (e) => {
    const lvl = e && e.detail && e.detail.level;
    if (STREAM_LEVELS.includes(lvl)) streamLevel = lvl;
    syncStreamMenu();
  });
  document.addEventListener('wise:chat-stream-on', (e) => {
    streamOn = !(e && e.detail && e.detail.on === false);
    syncStreamMenu();
  });
  /* Sync the "Activity strip" switch to the shared on/off state. Called on
     mount and whenever anything flips it (this menu, another chat's menu, or
     the Appearance popover — all via the wise:activity-strip event). */
  function syncActivityStripMenu() {
    const item = rootEl.querySelector('[data-sc="activity-strip"]');
    if (!item) return;
    const on = isActivityStripOn();
    item.classList.toggle('is-on', on);
    item.setAttribute('aria-checked', on ? 'true' : 'false');
  }
  document.addEventListener('wise:activity-strip', syncActivityStripMenu);
  /* Re-flow both flanking modules to the sticky (equal, narrower) or normal base
     width. Drag-resize still overrides per side afterwards. */
  function applyStickyLayout() {
    if (turnsPanel && turnsDocked) applyTurnsWidth();
    try { chatHistory && chatHistory.setSticky && chatHistory.setSticky(stickyOn); } catch (_) {}
    /* Default layout hook: when the host supplies no onStickyModules, flip the
       shared `modules-sticky` class on the chat's modules row so the injected
       sticky-drawer CSS (chat-history.js) applies without page-specific CSS. */
    if (typeof opts.onStickyModules !== 'function') {
      const row = rootEl.closest('#modules-row');
      if (row) row.classList.toggle('modules-sticky', stickyOn);
    }
  }

  /* ── Pending attachments ─────────────────────────────────────────────────
     Files picked via "+" don't post straight to the thread anymore — they first
     appear as small removable previews (a thumbnail + label) in a wrapping row
     INSIDE the message area, directly beneath the text field. Each new chip
     wraps as needed and the composer grows upward (the rail is bottom-anchored)
     rather than pushing anything off-screen. They only travel into the thread
     when the message is sent, and the user can keep typing the whole time with
     the placeholder still visible. */
  const attachEl = rootEl.querySelector(`#${id}-fl-attach`);
  let attachments = [];
  let attachSeq = 0;
  const IMAGE_ICON =
    '<span class="material-symbols-outlined">image</span>';
  /* Reflect the pending count onto the wrap so the CSS can space the chip row
     that sits beneath the text field (see .fl-input-wrap.has-attachments). */
  function syncAttachState() {
    const wrap = attachEl?.closest('.fl-input-wrap');
    const has = attachments.length > 0;
    wrap?.classList.toggle('has-attachments', has);
  }
  function renderAttachChip(att) {
    const thumb = att.src
      ? `<span class="fl-attach-thumb" style="background-image:url('${String(att.src).replace(/'/g, "%27")}')"></span>`
      : `<span class="fl-attach-thumb fl-attach-thumb--icon">${IMAGE_ICON}</span>`;
    const chip = document.createElement('span');
    chip.className = 'fl-attach-chip';
    chip.dataset.attachId = att.id;
    chip.title = att.name;
    chip.innerHTML = `<button type="button" class="fl-attach-x" aria-label="Remove ${esc(att.name)}"><span class="material-symbols-outlined">close</span></button>` +
      `<span class="fl-attach-name">${esc(att.name)}</span>${thumb}`;
    attachEl?.appendChild(chip);
  }
  function addAttachment(att) {
    const rec = { id: `att-${++attachSeq}`, name: att.name || 'attachment', src: att.src || '' };
    attachments.push(rec);
    renderAttachChip(rec);
    syncAttachState();
    /* Keep the caret in the input so typing continues to flow after attaching. */
    input?.focus();
    return rec;
  }
  function removeAttachment(attId) {
    const rec = attachments.find((a) => a.id === attId);
    if (rec && rec.revoke) { try { URL.revokeObjectURL(rec.src); } catch (_) {} }
    attachments = attachments.filter((a) => a.id !== attId);
    attachEl?.querySelector(`[data-attach-id="${attId}"]`)?.remove();
    syncAttachState();
  }
  function clearAttachments() {
    attachments.forEach((a) => { if (a.revoke) { try { URL.revokeObjectURL(a.src); } catch (_) {} } });
    attachments = [];
    if (attachEl) attachEl.innerHTML = '';
    syncAttachState();
  }
  /* Remove-button clicks (and thumbnail clicks → full-size preview) on the
     pending chips. */
  attachEl?.addEventListener('click', (e) => {
    const x = e.target.closest('.fl-attach-x');
    if (x) {
      const chip = x.closest('.fl-attach-chip');
      if (chip) removeAttachment(chip.dataset.attachId);
      input?.focus();
      return;
    }
    const thumb = e.target.closest('.fl-attach-thumb');
    if (thumb) {
      const chip = thumb.closest('.fl-attach-chip');
      const rec = attachments.find((a) => a.id === chip?.dataset.attachId);
      if (rec && rec.src) openWiseImageModal(rec.src, rec.name);
    }
  });

  /* Three built-in sample thumbnails for the "Load 3 example images" demo —
     self-contained SVG data URIs so the example works with no backend. */
  function sampleThumb(bg, fg, glyph) {
    /* Center the glyph with dominant-baseline='central' (more reliably honored
       than 'middle' when the SVG is rasterized as a background image) and keep
       the font a touch smaller than the box so the round 22px thumbnail can't
       clip it at the top. */
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'>` +
      `<rect width='96' height='96' fill='${bg}'/>` +
      `<text x='48' y='50' font-size='40' text-anchor='middle' dominant-baseline='central' fill='${fg}' font-family='sans-serif'>${glyph}</text>` +
      `</svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
  const EXAMPLE_IMAGES = [
    { name: 'front-label.png', src: sampleThumb('transparent', '#ffffff', '\uD83C\uDFF7') },
    { name: 'nutrition-panel.jpg', src: sampleThumb('transparent', '#ffffff', '\uD83D\uDCCA') },
    { name: 'ingredients.jpg', src: sampleThumb('transparent', '#ffffff', '\uD83E\uDDFE') },
  ];
  function loadExampleAttachments() {
    /* Attaching examples must NOT hide the welcome — the previews are still
       pending in the input rail and nothing has been sent yet. Hiding it here
       blanked the whole surface (headline + intent chips) before submit. The
       welcome is dismissed on submit(), matching the regular attach flow. */
    EXAMPLE_IMAGES.forEach((img) => addAttachment({ name: img.name, src: img.src }));
  }

  /* Hidden file input reused by Attach + Camera; chosen files become pending
     preview chips in the input (see addAttachment) rather than posting straight
     into the thread. Images show a real thumbnail; other files get an icon. */
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.multiple = true;
  fileInput.style.display = 'none';
  rootEl.appendChild(fileInput);
  fileInput.addEventListener('change', () => {
    const files = fileInput.files ? Array.from(fileInput.files) : [];
    files.forEach((f) => {
      const isImg = /^image\//.test(f.type);
      const src = isImg ? URL.createObjectURL(f) : '';
      const rec = addAttachment({ name: f.name, src });
      if (isImg && rec) rec.revoke = true;
    });
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
    /* The transcript has advanced to its next state — retire the welcome-only
       background animation (if it was armed) so it never bleeds into a live thread. */
    bgAnim.stop();
    welcome?.classList.add('sc-hidden');
    /* A clicked intent chip starts a fresh turn, so drop any half-typed copy
       left in the composer — the placeholder returns so the input reads clean
       while the transcript animates in. (submit() already clears before this,
       so this only bites the chip/scorecard/sendIntent paths.) */
    if (input && input.value) input.value = '';
    if (persistChips) { rootEl.classList.add('sc-conversing'); requestAnimationFrame(refreshPersistChips); }
  }
  function reset() {
    if (messages) messages.innerHTML = '';
    clearAttachments();
    closeAgents();
    /* A brand-new conversation gets a clean chip set — nothing is spent yet. */
    if (usedIntents.size) { usedIntents.clear(); renderChips(); }
    welcome?.classList.remove('sc-hidden');
    if (welcome) welcome.style.display = '';
    rootEl.classList.remove('sc-conversing');
    /* Re-play the welcome reveal (text types in, then chips fly in from the
       right) so returning to a fresh welcome feels alive, not pre-populated. */
    revealWelcome();
    /* Clear the live-activity meter so a fresh conversation starts from zero. */
    if (activityEl) {
      Object.assign(telemetry, { turns: 0, ops: 0, tools: 0, tokIn: 0, tokOut: 0, cached: 0, cost: 0, turnStart: 0, last: null });
      setActivityWorking(false);
      renderActivity();
    }
    chatHistory?.markNew();
    /* Keep a broken-out Turns module honest about the now-empty thread. */
    if (turnsDocked && turnsPanel) renderTurns();
  }
  function submit() {
    if (!input) return;
    const v = input.value.trim();
    const atts = attachments.slice();
    if (!v && !atts.length) return;
    input.value = '';
    clearAttachments();
    hideWelcome();
    addUser(v, atts);
    const noun = atts.length === 1 ? 'attachment' : 'attachments';
    wiseaiRespond(v || `Reviewing ${atts.length} ${noun}`);
  }
  /* Programmatically post a user message + WISEcodeAI reply (used by host modules
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
    const text = (label != null ? label : (found ? (found.ask || found.label) : '')) || String(intent);
    const handled = opts.onIntent ? opts.onIntent(intent, text) : false;
    markIntentUsed(intent);
    closeAgents();
    hideWelcome();
    if (text) addUser(text);
    if (!handled && text) wiseaiRespond(text, intent);
  }

  /* Build an authentic transcript HTML string from a compact list of turns —
     [{ role:'you'|'wiseai', text?, html?, source? }] — using the exact same
     line markup addUser/addWISEcodeAI emit, so seeded history threads restore into
     the chat looking indistinguishable from real ones. */
  function seedClock(ts) {
    try { return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
    catch (_) { return ''; }
  }
  function buildSeedTranscript(turns, baseTs) {
    return (turns || []).map((t, i) => {
      const clock = seedClock(baseTs + i * 60000);
      if (t.role === 'you') {
        return `<div class="sc-line sc-line-you"><span class="sc-avatar sc-avatar-you" role="img" aria-label="You" data-initials="${esc(userInitials)}">${resolveUserAvatar()}</span><div class="sc-line-body">${esc(t.text || '')}<div class="sc-line-meta"><span class="sc-line-time">${esc(clock)}</span></div></div></div>`;
      }
      const body = t.html != null ? t.html : esc(t.text || '');
      /* Seeded history turns are grounded too — fall back to a connected source
         so restored threads always carry a source, just like live answers. */
      let src = t.source !== undefined ? t.source : sourceLabel;
      if (src !== false && !src) src = pickSourceName();
      if (src === false) src = '';
      const fb = (feedbackEnabled && t.feedback !== false) ? feedbackRowHtml(clock) : '';
      const footer = `<div class="sc-line-meta">${
        src ? `<span class="sc-trust-chip" title="WISEcodeAI™ cites where its answer comes from"><span class="material-symbols-outlined">verified_user</span>${esc(src)}</span>` : ''
      }${fb ? '' : `<span class="sc-line-time">${esc(clock)}</span>`}${fb}</div>`;
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
        mcp: conv.mcp === true,
      };
    });
  }

  /* Mount the shared in-module history sidebar into the chat body. Threads are
     namespaced by surface (opts.historyKey) so different WISEcodeAI surfaces keep
     their own history; the default shares one dock-wide history. */
  if (window.WiseChatHistory && messages) {
    chatHistory = window.WiseChatHistory.mount(rootEl, {
      storageKey: opts.historyKey || 'wise-wiseai-chat-history',
      messagesEl: messages,
      paneHost: rootEl.querySelector('.sc-body'),
      welcomeEl: welcome,
      seed: historySeedItems,
      /* Bump opts.historySeedVersion whenever the seed content changes so every
         browser refreshes its stored History to the latest on next load. */
      seedVersion: (typeof opts.historySeedVersion === 'number') ? opts.historySeedVersion : 0,
      /* Opt-in: adds a "break out" control that pops History out of the in-chat
         overlay into a standalone module docked to the left of the chat. The
         module is inserted as a flex sibling before the chat's mount element. */
      breakout: opts.historyBreakout === true,
      breakoutWidth: opts.historyBreakoutWidth || 300,
      /* Narrower width used while sticky (20px thinner than Turns). */
      stickyWidth: HISTORY_STICKY_W,
      /* WISEcodeAI opts: start docked as a first-class module, dress the docked
         header like a result pane (three-dot menu + width changer), and add an
         MCP-usage filter toggle beside the search. */
      breakoutDefault: opts.historyBreakoutDefault === true,
      dockedControls: opts.historyDockedControls === true,
      /* Start the docked module tucked in behind the chat (hidden) — the
         three-dot "History" toggle reveals it, exactly like Turns. */
      breakoutStartHidden: opts.historyBreakoutHidden === true,
      mcpFilter: opts.historyMcpFilter === true,
      onNew: () => reset(),
      /* Keep a broken-out Turns module in sync when a saved thread is restored. */
      onRestore: () => refreshDockedTurns(),
      stripSelectors: ['.sc-inline-chips', '.sc-line-typing', '.sc-line-trace'],
      setHTML: (html) => {
        messages.innerHTML = html || '';
        welcome?.classList.add('sc-hidden');
        if (welcome) welcome.style.display = '';
        closeAgents();
        if (persistChips) { rootEl.classList.add('sc-conversing'); requestAnimationFrame(refreshPersistChips); }
        scrollToEnd();
        refreshDockedTurns();
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
    /* A spent chip is inert — it already drove its turn and can't be re-run. */
    if (chip.classList.contains('is-used')) return;
    const def = intents[Number(chip.dataset.intent)];
    if (!def) return;
    /* A chip can carry an `ask` — the full question posted as the user's line —
       while its face keeps the shorter label (same contract as scorecards). */
    const text = def.ask || def.label;
    const handled = opts.onIntent ? opts.onIntent(def.intent, text) : false;
    /* "Choose Agents" opens the in-chat settings panel rather than starting a
       chat turn — it's a control, not a question. */
    if (def.intent === 'choose_agents') { openAgents(); return; }
    markIntentUsed(def.intent);
    hideWelcome();
    addUser(text);
    /* Route the reply by the chip's intent id (not just its label) so the
       conversation always continues on the feature the chip represents. */
    if (!handled) wiseaiRespond(text, def.intent);
  });

  /* Inline intent chips — same routing as the welcome chips, but the block
     lives inside the transcript (trailing the latest reply). Delegated on the
     messages area since the element is re-parked as the thread grows. */
  messages?.addEventListener('click', (e) => {
    const chip = e.target.closest('.sc-inline-chips .ws-intent-chip[data-intent]');
    if (!chip) return;
    /* A spent chip is inert — it already drove its turn and can't be re-run. */
    if (chip.classList.contains('is-used')) return;
    const def = intents[Number(chip.dataset.intent)];
    if (!def) return;
    if (def.intent === 'choose_agents') { openAgents(); return; }
    const text = def.ask || def.label;
    const handled = opts.onIntent ? opts.onIntent(def.intent, text) : false;
    markIntentUsed(def.intent);
    hideWelcome();
    addUser(text);
    if (!handled) wiseaiRespond(text, def.intent);
  });

  /* Legacy "open module" chips — new replies no longer render these (the
     surface cards above the answer are the openers), but transcripts restored
     from history may still carry them, so keep them clickable. */
  messages?.addEventListener('click', (e) => {
    const chip = e.target.closest('.sc-open-chip[data-open-module]');
    if (!chip) return;
    e.preventDefault();
    openModuleFor(chip.getAttribute('data-open-module'), chip);
  });

  /* Answer-feedback interactions (copy / thumbs up / thumbs down + reasons).
     Delegated on the messages area so it covers live replies AND restored
     history transcripts alike. */
  function fbNote(wrap, text, icon) {
    const note = wrap.querySelector('.sc-fb-note');
    if (!note) return;
    if (!text) { note.hidden = true; note.innerHTML = ''; return; }
    note.innerHTML = `<span class="material-symbols-outlined">${esc(icon || 'check')}</span>${esc(text)}`;
    note.hidden = false;
  }
  function copyAnswer(line, btn) {
    const body = line.querySelector('.sc-line-body');
    if (!body) return;
    const clone = body.cloneNode(true);
    clone.querySelectorAll('.sc-line-meta, .sc-fb-wrap, .sc-inline-chips').forEach((n) => n.remove());
    /* Drop icon glyphs so their ligature text ("arrow_forward") never leaks
       into the copied answer — e.g. an "open module" chip's icons. */
    clone.querySelectorAll('.sc-open-chip-ic, .sc-open-chip-go').forEach((n) => n.remove());
    const text = (clone.textContent || '').replace(/\s+\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
    const done = () => {
      const ic = btn.querySelector('.material-symbols-outlined');
      btn.classList.add('is-done');
      if (ic) ic.textContent = 'check';
      /* Pop a transient "Copied" pill anchored to the copy button, then let it
         fade back out on its own. */
      const pill = btn.closest('.sc-fb-copy-wrap')?.querySelector('.sc-fb-copied');
      if (pill) {
        clearTimeout(pill._hideTimer);
        pill.classList.add('is-vis');
        pill._hideTimer = setTimeout(() => pill.classList.remove('is-vis'), 1300);
      }
      setTimeout(() => { btn.classList.remove('is-done'); if (ic) ic.textContent = 'content_copy'; }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
    else done();
  }
  /* Copy an arbitrary snippet (e.g. the turn's #id) and confirm the action by
     briefly swapping the anchor's tooltip for a "Copied!" acknowledgement. */
  function copyText(text, anchor) {
    if (!text) return;
    const done = () => flashScTip(anchor, 'Copied!');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
    else done();
  }
  messages?.addEventListener('click', (e) => {
    const moreBtn = e.target.closest('.sc-fb-more');
    if (moreBtn) {
      const wrap = moreBtn.closest('.sc-fb-more-wrap');
      const menu = wrap && wrap.querySelector('.sc-fb-menu');
      const willOpen = !!menu && menu.hidden;
      /* Only one three-dot menu open at a time across the transcript. */
      closeMoreMenus();
      if (menu) {
        menu.hidden = !willOpen;
        moreBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      }
      return;
    }
    const idEl = e.target.closest('.sc-fb-id');
    if (idEl) {
      copyText((idEl.textContent || '').trim(), idEl);
      return;
    }
    const fbBtn = e.target.closest('.sc-fb-btn');
    if (fbBtn) {
      const wrap = fbBtn.closest('.sc-fb-wrap');
      const line = fbBtn.closest('.sc-line');
      if (!wrap || !line) return;
      const verdict = fbBtn.getAttribute('data-fb');
      if (verdict === 'copy') { copyAnswer(line, fbBtn); return; }
      if (verdict === 'turn') { forkFromLine(line); return; }
      if (verdict === 'replay') { rerunFromLine(line, true); return; }
      if (verdict === 'edit') { rerunFromLine(line, false); return; }
      const up = wrap.querySelector('[data-fb="up"]');
      const down = wrap.querySelector('[data-fb="down"]');
      const upReasons = wrap.querySelector('.sc-fb-reasons--up');
      const downReasons = wrap.querySelector('.sc-fb-reasons--down');
      if (verdict === 'up') {
        const on = !up.classList.contains('is-on');
        up.classList.toggle('is-on', on);
        up.setAttribute('aria-pressed', on ? 'true' : 'false');
        up.setAttribute('aria-expanded', on ? 'true' : 'false');
        down.classList.remove('is-on'); down.setAttribute('aria-expanded', 'false');
        if (downReasons) downReasons.hidden = true;
        if (upReasons) upReasons.hidden = !on;
        fbNote(wrap, '', '');
        if (on && typeof opts.onFeedback === 'function') opts.onFeedback('up');
      } else if (verdict === 'down') {
        const on = !down.classList.contains('is-on');
        down.classList.toggle('is-on', on);
        down.setAttribute('aria-expanded', on ? 'true' : 'false');
        up.classList.remove('is-on'); up.setAttribute('aria-pressed', 'false'); up.setAttribute('aria-expanded', 'false');
        if (upReasons) upReasons.hidden = true;
        if (downReasons) downReasons.hidden = !on;
        fbNote(wrap, '', '');
        if (on && typeof opts.onFeedback === 'function') opts.onFeedback('down');
      }
      return;
    }
    const sendBtn = e.target.closest('.sc-fb-send');
    if (sendBtn) {
      const wrap = sendBtn.closest('.sc-fb-wrap');
      const pop = sendBtn.closest('.sc-fb-reasons');
      if (!wrap || !pop) return;
      const kind = sendBtn.getAttribute('data-fb-send');
      const input = pop.querySelector('.sc-fb-input');
      const text = input ? input.value.trim() : '';
      if (input) input.value = '';
      pop.hidden = true;
      const btn = wrap.querySelector(`[data-fb="${kind}"]`);
      if (btn) btn.setAttribute('aria-expanded', 'false');
      fbNote(wrap, 'Thanks — your feedback helps WISEcodeAI\u2122 improve.', kind === 'up' ? 'thumb_up' : 'favorite');
      if (typeof opts.onFeedback === 'function') opts.onFeedback(kind, { note: text });
      return;
    }
    const reason = e.target.closest('.sc-fb-reason');
    if (reason) {
      const wrap = reason.closest('.sc-fb-wrap');
      const pop = reason.closest('.sc-fb-reasons');
      if (!wrap || !pop) return;
      const kind = pop.classList.contains('sc-fb-reasons--up') ? 'up' : 'down';
      reason.classList.toggle('is-on');
      const anyOn = pop.querySelector('.sc-fb-reason.is-on');
      const msg = kind === 'up'
        ? 'Thanks — glad this hit the mark.'
        : 'Thanks — your feedback helps WISEcodeAI\u2122 improve.';
      fbNote(wrap, anyOn ? msg : '', kind === 'up' ? 'thumb_up' : 'favorite');
      if (typeof opts.onFeedback === 'function') opts.onFeedback(kind, reason.getAttribute('data-reason'));
    }
  });

  /* Dismiss any open reason pop-over on an outside click or Escape, so it
     behaves like a proper floating menu instead of a pinned inline panel. */
  function closeReasonPopovers() {
    messages?.querySelectorAll('.sc-fb-reasons:not([hidden])').forEach((pop) => {
      pop.hidden = true;
      const btn = pop.closest('.sc-fb-down-wrap, .sc-fb-up-wrap')?.querySelector('.sc-fb-btn');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  }
  /* Collapse any open three-dot (timestamp + turn controls) menu. */
  function closeMoreMenus() {
    messages?.querySelectorAll('.sc-fb-menu:not([hidden])').forEach((menu) => {
      menu.hidden = true;
      const btn = menu.closest('.sc-fb-more-wrap')?.querySelector('.sc-fb-more');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  }
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.sc-fb-down-wrap, .sc-fb-up-wrap')) closeReasonPopovers();
    /* Leave the menu open while interacting inside it (copy turn ID, etc.); a
       click that lands on the trigger is handled by its own toggle above. */
    if (!e.target.closest('.sc-fb-more-wrap')) closeMoreMenus();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeReasonPopovers(); closeMoreMenus(); }
  });

  /* Stylized hover/focus tooltip for the per-answer action icons. Reads its
     short caption from `data-tip`, floats a dark card just above the control,
     and is delegated on the messages area so it covers every rendered turn. */
  const TIP_SELECTOR = '.sc-fb-btn[data-tip], .sc-fb-id[data-tip]';
  let scTipEl = document.getElementById('sc-tip');
  if (!scTipEl) {
    scTipEl = document.createElement('div');
    scTipEl.id = 'sc-tip';
    scTipEl.className = 'sc-tip';
    scTipEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(scTipEl);
  }
  let scTipFor = null;
  function showScTip(target) {
    const label = target.getAttribute('data-tip');
    if (!label) return;
    scTipFor = target;
    scTipEl.textContent = label;
    const r = target.getBoundingClientRect();
    scTipEl.style.left = `${Math.round(r.left + r.width / 2)}px`;
    scTipEl.style.top = `${Math.round(r.top - 8)}px`;
    scTipEl.offsetWidth; /* reflow so the enter transition plays */
    scTipEl.classList.add('is-vis');
  }
  function hideScTip() { scTipFor = null; scTipEl.classList.remove('is-vis'); }
  /* Momentary confirmation toast reusing the tooltip card — used after a copy
     so the acknowledgement lands right where the hover tip would sit. Deferred
     a frame so it survives the click-driven hideScTip on the same gesture. */
  let scTipFlashTimer = null;
  function flashScTip(target, label) {
    if (!target) return;
    requestAnimationFrame(() => {
      scTipFor = null; /* not a hover tip — don't let mouseout dismiss it early */
      scTipEl.textContent = label;
      const r = target.getBoundingClientRect();
      scTipEl.style.left = `${Math.round(r.left + r.width / 2)}px`;
      scTipEl.style.top = `${Math.round(r.top - 8)}px`;
      scTipEl.offsetWidth; /* reflow so the enter transition plays */
      scTipEl.classList.add('is-vis');
      clearTimeout(scTipFlashTimer);
      scTipFlashTimer = setTimeout(hideScTip, 1200);
    });
  }
  messages?.addEventListener('mouseover', (e) => {
    const t = e.target.closest(TIP_SELECTOR);
    if (t && t !== scTipFor) showScTip(t);
  });
  messages?.addEventListener('mouseout', (e) => {
    const t = e.target.closest(TIP_SELECTOR);
    if (t && !t.contains(e.relatedTarget)) hideScTip();
  });
  messages?.addEventListener('focusin', (e) => {
    const t = e.target.closest(TIP_SELECTOR);
    if (t) showScTip(t);
  });
  messages?.addEventListener('focusout', hideScTip);
  messages?.addEventListener('click', hideScTip);
  window.addEventListener('scroll', hideScTip, true);
  window.addEventListener('resize', hideScTip);

  /* Persistent intent chips — same routing as the welcome chips, but always
     available beneath the thread so any conversational route stays one tap
     away for the whole conversation. */
  const pchipsWrap = rootEl.querySelector(`#${id}-pchips-wrap`);
  pchipsWrap?.addEventListener('click', (e) => {
    if (e.target.closest('.ws-sc-scroll')) return;
    const chip = e.target.closest('.ws-intent-chip[data-intent]');
    if (!chip) return;
    /* A spent chip is inert — it already drove its turn and can't be re-run. */
    if (chip.classList.contains('is-used')) return;
    const def = intents[Number(chip.dataset.intent)];
    if (!def) return;
    if (def.intent === 'choose_agents') { openAgents(); return; }
    const text = def.ask || def.label;
    const handled = opts.onIntent ? opts.onIntent(def.intent, text) : false;
    markIntentUsed(def.intent);
    hideWelcome();
    addUser(text);
    if (!handled) wiseaiRespond(text, def.intent);
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

  /* Intent chips always render as a wrapped flex grid now — the single-line
     scrolling carousel variant has been retired, so there is no chip scroll
     logic to wire up here. */

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

  /* Send. Enter submits; Shift+Enter makes a newline (the field is a textarea
     so the composer-v2 design can grow it — see wireComposerGrow). */
  rootEl.querySelector(`#${id}-send`)?.addEventListener('click', submit);
  input?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } });
  wireComposerGrow(input);

  /* Keep the caret in the TEXT field whenever the user clicks the input pill.
     The pending attachment chips render before the input, each with a focusable
     remove (×) button; a click that lands in that area (or on the pill padding)
     would otherwise leave focus on a chip button, so a subsequent Space/Enter —
     or the browser treating keys against a non-text control — could remove an
     image "as if it were a letter". Redirecting focus to the input (unless an
     interactive control was the actual target) guarantees typing, Backspace and
     Delete only ever edit the text, never the attachments. */
  const inputWrap = input?.closest('.fl-input-wrap');
  inputWrap?.addEventListener('mousedown', (e) => {
    if (e.target === input) return;
    if (e.target.closest('button, a, input, textarea, select, [contenteditable], .fl-more-popover, .fl-model-popover')) return;
    e.preventDefault(); /* don't blur/steal selection — just land the caret in the text field */
    input?.focus();
  });

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
    if (open) syncHistoryMenu();
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
  const SC_WIDTH_ICONS = ['width_normal', 'width_wide', 'width_full', 'width_full'];
  const SC_WIDTH_TITLES = [
    'Width (single) — tap to widen',
    'Width (double) — tap to widen',
    'Width (triple) — tap to widen',
    'Width (fill) — tap to reset',
  ];
  const scTierOf = (v) => (v === true ? 1 : typeof v === 'number' ? Math.max(0, Math.min(3, v | 0)) : 0);
  const syncWidthUI = (tier) => {
    tier = scTierOf(tier);
    rootEl.classList.toggle('panel-wide', tier >= 1);
    rootEl.classList.toggle('panel-triple', tier >= 2);
    rootEl.classList.toggle('panel-fill', tier >= 3);
    const btn = rootEl.querySelector('.panel-width-toggle-btn');
    if (btn) {
      btn.classList.toggle('is-on', tier >= 1);
      btn.setAttribute('aria-pressed', tier >= 1 ? 'true' : 'false');
      btn.title = SC_WIDTH_TITLES[tier];
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = SC_WIDTH_ICONS[tier];
    }
    /* When the field's opacity is still on its pane-count default, a width change
       re-tunes it (single/double → 30%, wider → 65%): refresh the slider readout
       and repaint any reduced-motion still frame (the live rAF loop self-updates). */
    if (!bgAnimOpacityUserSet) {
      syncBgAnimMenu();
      if (prefersReducedMotion && bgAnimOn && rootEl.classList.contains('sc-bganim-live')) bgAnim.start();
    }
  };
  rootEl.addEventListener('click', (e) => {
    const widthToggle = e.target.closest('.panel-width-toggle-btn');
    if (!widthToggle || !rootEl.contains(widthToggle)) return;
    e.stopPropagation();
    const cur = rootEl.classList.contains('panel-fill') ? 3 : rootEl.classList.contains('panel-triple') ? 2 : rootEl.classList.contains('panel-wide') ? 1 : 0;
    const next = (cur + 1) % 4;
    syncWidthUI(next);
    if (typeof opts.onToggleWidth === 'function') opts.onToggleWidth(next);
  });

  /* "What can I ask?" link (below-input, left) — opens the empty help panel. */
  const askHelpBtn = rootEl.querySelector(`#${id}-ask-help`);
  askHelpBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    openAskHelp();
  });

  /* Keep "What can I ask?" text perfectly left-aligned with the composer's
     placeholder, whatever the composer layout or module width. The placeholder
     inset is composed of runtime-variable pieces ("+" button width, wrap
     padding, and — in the narrow @container grid — the textarea's own left
     padding), so instead of hard-coding it we measure the textarea's real text
     edge and set the link's left margin to match (minus the link's own left
     padding). Re-run on any composer size change. */
  const askHelpRow = askHelpBtn?.closest('.sc-belowinput');
  if (askHelpBtn && input && askHelpRow) {
    const alignAskHelp = () => {
      const inRect = input.getBoundingClientRect();
      const rowRect = askHelpRow.getBoundingClientRect();
      if (!inRect.width || !rowRect.width) return; /* hidden/unlaid-out */
      const inPadL = parseFloat(getComputedStyle(input).paddingLeft) || 0;
      const btnPadL = parseFloat(getComputedStyle(askHelpBtn).paddingLeft) || 0;
      const margin = (inRect.left + inPadL) - rowRect.left - btnPadL;
      askHelpBtn.style.marginLeft = `${Math.max(0, Math.round(margin))}px`;
    };
    alignAskHelp();
    /* Fonts can reflow the composer after first paint. */
    if (document.fonts?.ready) document.fonts.ready.then(alignAskHelp).catch(() => {});
    const inputWrap2 = input.closest('.fl-input-wrap');
    if (typeof ResizeObserver === 'function' && inputWrap2) {
      const ro = new ResizeObserver(() => alignAskHelp());
      ro.observe(inputWrap2);
    }
    window.addEventListener('resize', alignAskHelp);
  }

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

  /* Database selector popover — floated to the far right, where the old
     three-dot lived. A search + access filter sit at the top; databases are
     grouped by category and single-select (choosing one deactivates the rest).
     The same roster can also break out into a docked "sticky module" (below). */
  const flDbSearch = flModelPop?.querySelector('.fl-db-search-input');
  let flDbAccessFilter = 'all';
  let dbModule = null;      // the docked "sticky module", once broken out

  /* Every roster surface currently mounted (the popover + the docked module),
     so filters and single-select stay perfectly in sync between the two. */
  function dbRoots() { return [flModelPop, dbModule].filter(Boolean); }

  /* Show/hide rows & whole groups against the current query + access filter,
     applied to every mounted roster at once. */
  function applyDbFilter() {
    const q = (flDbSearch?.value || '').trim().toLowerCase();
    dbRoots().forEach((root) => {
      let anyVisible = false;
      root.querySelectorAll('.fl-db-group').forEach((grp) => {
        const accessOk = flDbAccessFilter === 'all' || flDbAccessFilter === grp.dataset.access;
        const items = grp.querySelectorAll('.fl-db-item');
        let groupHasVisible = false;
        items.forEach((it) => {
          const match = accessOk && (!q || (it.dataset.search || '').includes(q));
          it.hidden = !match;
          if (match) groupHasVisible = true;
        });
        const emptyEl = grp.querySelector('.fl-db-groupempty');
        let showGroup;
        if (!items.length) {
          showGroup = accessOk && !q; // empty categories only surface with no query
          if (emptyEl) emptyEl.hidden = !showGroup;
        } else {
          showGroup = groupHasVisible;
        }
        grp.hidden = !showGroup;
        if (showGroup) anyVisible = true;
      });
      const noResults = root.querySelector('.fl-db-noresults');
      if (noResults) noResults.hidden = anyVisible;
    });
  }

  /* Reflect the chosen database across every roster (checkmark + aria-checked). */
  function markActiveDb(dbId) {
    dbRoots().forEach((root) => root.querySelectorAll('.fl-db-item').forEach((el) => {
      const on = el.dataset.db === dbId;
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-checked', on ? 'true' : 'false');
    }));
  }

  /* The currently active database + the in-input trigger label that names it. */
  let currentDbId = defaultDbItem() ? defaultDbItem().id : null;
  const flDbLabelEl = rootEl.querySelector(`#${id}-fl-db-label`);

  /* Has the conversation actually started? The very first database pick (before
     anyone has spoken) shouldn't leave a marker — only mid-thread switches do. */
  function conversationStarted() {
    return !!(messages && messages.querySelector('.sc-line-you, .sc-line-wiseai'));
  }

  /* Drop a marker into the transcript so a mid-conversation database switch is
     visible and the thread keeps flowing after it. Rendered as a line FROM the
     member — their avatar + the standard message type — since switching is
     something they did. */
  function addDbChangeNote(prev, next) {
    if (!messages || !next) return;
    const body = prev
      ? `<span class="sc-event-label">Switched database from</span> <strong>${esc(prev.name)}</strong> to <strong>${esc(next.name)}</strong>`
      : `<span class="sc-event-label">Set database to</span> <strong>${esc(next.name)}</strong>`;
    messages.insertAdjacentHTML('beforeend',
      `<div class="sc-line sc-line-you sc-line-event" data-activity="database" role="note" aria-label="${esc(prev ? `Switched database to ${next.name}` : `Set database to ${next.name}`)}">`
      + `<span class="sc-avatar sc-avatar-you" role="img" aria-label="You" data-initials="${esc(userInitials)}">${resolveUserAvatar()}</span>`
      + `<div class="sc-line-body">${body}<div class="sc-line-meta"><span class="sc-line-time">${esc(nowLabel())}</span></div></div>`
      + `</div>`);
    scrollDown(true); /* fresh user action — always bring the marker into view */
    refreshDockedTurns();
  }

  /* Single entry point for choosing a database: keeps every roster in sync,
     refreshes the in-input label, notes the change in a live thread, and hands
     the new id to the host. */
  function selectDb(dbId) {
    markActiveDb(dbId);
    const next = dbItemById(dbId);
    if (flDbLabelEl && next) flDbLabelEl.textContent = next.name;
    const changed = dbId !== currentDbId;
    const prev = dbItemById(currentDbId);
    currentDbId = dbId;
    if (changed && conversationStarted()) addDbChangeNote(prev, next);
    const cb = opts.onDbChange || opts.onModelChange;
    if (changed && typeof cb === 'function') cb(dbId);
  }

  /* Mirror the active access-filter chip across every roster. */
  function syncDbFilterChips() {
    dbRoots().forEach((root) => root.querySelectorAll('.fl-db-chip').forEach((c) => {
      c.classList.toggle('is-active', (c.dataset.filter || 'all') === flDbAccessFilter);
    }));
  }

  /* Delegated wiring for one roster surface (popover OR docked module). Search
     input mirrors into the shared query; chips set the shared access filter;
     picking a row single-selects everywhere. `isPopover` closes the popover on
     pick (the docked module stays put). */
  function wireDbRoster(root, isPopover) {
    if (!root) return;
    const search = root.querySelector('.fl-db-search-input');
    search?.addEventListener('click', (e) => e.stopPropagation());
    search?.addEventListener('input', () => {
      /* Keep both search boxes showing the same query. */
      dbRoots().forEach((r) => { const s = r.querySelector('.fl-db-search-input'); if (s && s !== search) s.value = search.value; });
      applyDbFilter();
    });
    root.addEventListener('click', (e) => {
      const chip = e.target.closest('.fl-db-chip');
      if (chip) {
        e.stopPropagation();
        flDbAccessFilter = chip.dataset.filter || 'all';
        syncDbFilterChips();
        applyDbFilter();
        return;
      }
      const it = e.target.closest('.fl-db-item');
      if (!it) return;
      if (isPopover) {
        flModelPop.classList.remove('open');
        flModelBtn?.setAttribute('aria-expanded', 'false');
      }
      selectDb(it.dataset.db);
    });
  }

  flModelBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    flPop?.classList.remove('open');
    const open = flModelPop.classList.toggle('open');
    flModelBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { applyDbFilter(); requestAnimationFrame(() => flDbSearch?.focus()); }
  });

  wireDbRoster(flModelPop, true);

  /* ── Break the roster out into a docked "sticky module" ───────────────────
     Mirrors the Turns module: a real flex sibling of the chat inside
     #modules-row, dressed by the shared `.wch-sidebar.wch-docked` rules (serif
     masthead, pane surface, and — under `.modules-sticky` — the tucked-behind
     drawer treatment). Clicking the popover's dock icon breaks it out; the
     module's own close control merges it back into the popover. */
  const DB_MODULE_W = opts.stickyModulesWidth || 280;

  function updateDbDockBtn() {
    const btn = flModelPop?.querySelector('.fl-db-dock-btn');
    if (!btn) return;
    const on = !!dbModule;
    btn.classList.toggle('is-on', on);
    const ic = btn.querySelector('.material-symbols-outlined');
    if (ic) ic.textContent = on ? 'dock_to_left' : 'dock_to_right';
    btn.title = on ? 'Undock — back to popover' : 'Dock as a sticky module';
    btn.setAttribute('aria-label', on ? 'Undock the database selector back to a popover' : 'Dock the database selector as a sticky module');
  }

  function ensureDbModule() {
    if (dbModule) return dbModule;
    const container = rootEl.parentElement;
    if (!container) return null;
    dbModule = document.createElement('aside');
    dbModule.className = 'wch-sidebar wch-docked wch-right fl-db-module';
    dbModule.setAttribute('aria-label', 'Databases');
    dbModule.style.flex = '0 0 ' + DB_MODULE_W + 'px';
    dbModule.style.width = DB_MODULE_W + 'px';
    dbModule.innerHTML =
      '<div class="wch-head">' +
        '<span class="wch-head-title"><span class="material-symbols-outlined">database</span>Databases</span>' +
        '<div class="wch-controls">' +
          '<button type="button" class="panel-width-toggle-btn fl-db-undock" title="Undock — back to popover" aria-label="Merge databases back into the popover"><span class="material-symbols-outlined">close</span></button>' +
        '</div>' +
      '</div>' +
      '<div class="fl-db-module-body">' +
        '<div class="fl-db-top">' + dbControlsHtml() + '</div>' +
        dbRosterHtml() +
      '</div>';
    /* Slot in as the chat's right-hand neighbour (after #wa-chat). */
    if (rootEl.nextSibling) container.insertBefore(dbModule, rootEl.nextSibling);
    else container.appendChild(dbModule);
    dbModule.querySelector('.fl-db-undock')?.addEventListener('click', () => undockDbModule());
    wireDbRoster(dbModule.querySelector('.fl-db-module-body'), false);
    /* Carry the current query / filter / selection into the fresh roster. */
    const activeId = flModelPop?.querySelector('.fl-db-item.is-active')?.dataset.db;
    const s = dbModule.querySelector('.fl-db-search-input');
    if (s && flDbSearch) s.value = flDbSearch.value;
    syncDbFilterChips();
    if (activeId) markActiveDb(activeId);
    applyDbFilter();
    /* Slide it out from behind the chat, like the other docked modules. */
    void dbModule.offsetWidth;
    dbModule.classList.add('wch-dock-reveal');
    setTimeout(() => dbModule && dbModule.classList.remove('wch-dock-reveal'), 480);
    return dbModule;
  }

  function dockDbModule() {
    ensureDbModule();
    flModelPop?.classList.remove('open');
    flModelBtn?.setAttribute('aria-expanded', 'false');
    updateDbDockBtn();
  }
  function undockDbModule() {
    if (dbModule) { dbModule.remove(); dbModule = null; }
    updateDbDockBtn();
  }

  flModelPop?.querySelector('.fl-db-dock-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dbModule) undockDbModule();
    else dockDbModule();
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
      respondFixed('Show me all available connectors', 'WISEcodeAI™ can connect to retailer and food-data platforms — Kroger, Instacart, Walmart, USDA FoodData Central, Open Food Facts, NielsenIQ and more. Pick one from the rail beneath the input to start a secure connection, or tell me which source you’d like to link.');
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
      else addWISEcodeAI('Team collaboration is coming to this workspace — you’ll be able to invite teammates straight into this WISEcodeAI™ conversation.');
    }
    else if (action === 'history') {
      /* When the entry is styled as an on/off switch (sc-mcp-item) keep the menu
         open so the switch state reads back immediately — matching Turns. */
      const asToggle = item.classList.contains('sc-mcp-item');
      if (!asToggle) closeMore();
      closeConnectors(); /* keep only one overlay open at a time */
      dismissAskOverlay();
      dismissTurnsOverlay();
      if (chatHistory) chatHistory.toggle();
      else if (typeof opts.onHistory === 'function') opts.onHistory();
      else addWISEcodeAI('History &amp; Projects lets you jump back into past WISEcodeAI™ conversations. It’s coming to this workspace soon.');
      if (asToggle) syncHistoryMenu();
    }
    else if (action === 'connect') {
      closeMore();
      openConnectors();
    }
    else if (action === 'turns') {
      /* On/off switch: flip the Turns module's visibility and keep the menu open
         so the switch state reads back immediately. */
      toggleTurns();
      syncTurnsMenu();
    }
    else if (action === 'mcp-toggle') {
      /* Visual-only toggle for now — flips the switch + a11y state, no wiring. */
      const on = !item.classList.contains('is-on');
      item.classList.toggle('is-on', on);
      item.setAttribute('aria-checked', on ? 'true' : 'false');
    }
    else if (action === 'sticky') {
      /* Tuck the docked History / Turns modules in behind the chat. Keep the menu
         open so the switch state reads back; the host applies the layout change. */
      stickyOn = !item.classList.contains('is-on');
      item.classList.toggle('is-on', stickyOn);
      item.setAttribute('aria-checked', stickyOn ? 'true' : 'false');
      applyStickyLayout();
      try { opts.onStickyModules && opts.onStickyModules(stickyOn); } catch (_) {}
    }
    else if (action === 'outputs') {
      /* On/off switch (on = hidden): show/hide the floating Outputs & Sources
         manifest. Keep the menu open so the switch state reads back; the host
         applies the actual visibility via onToggleOutputs. */
      outputsHidden = !item.classList.contains('is-on');
      item.classList.toggle('is-on', outputsHidden);
      item.setAttribute('aria-checked', outputsHidden ? 'true' : 'false');
      try { opts.onToggleOutputs && opts.onToggleOutputs(outputsHidden); } catch (_) {}
    }
    else if (action === 'compact') {
      /* App-wide compact spacing: flip the shared <html>.chat-compact class so
         every mounted chat module trims its chrome padding at once. Keep the menu
         open so the switch state reads back; persist the choice + broadcast it to
         any sibling chat modules so their switches follow. */
      const on = !document.documentElement.classList.contains('chat-compact');
      document.documentElement.classList.toggle('chat-compact', on);
      try { localStorage.setItem(COMPACT_PREF_KEY, on ? '1' : '0'); } catch (_) {}
      try { document.dispatchEvent(new CustomEvent('wise:chat-compact', { detail: { on } })); } catch (_) {}
      syncCompactMenu();
    }
    else if (action === 'brandtext') {
      /* App-wide brand AI text: flip the shared <html>.chat-brandtext class so
         every mounted chat module recolours its WISEcodeAI lines to the brand
         blue at once (member lines stay in the default black ink). Keep the menu
         open so the switch state reads back; persist + broadcast so any sibling
         chat modules' switches follow. */
      const on = !document.documentElement.classList.contains('chat-brandtext');
      document.documentElement.classList.toggle('chat-brandtext', on);
      try { localStorage.setItem(BRANDTEXT_PREF_KEY, on ? '1' : '0'); } catch (_) {}
      try { document.dispatchEvent(new CustomEvent('wise:chat-brandtext', { detail: { on } })); } catch (_) {}
      syncBrandtextMenu();
    }
    else if (action === 'bg-anim') {
      /* Admin-only ambient backdrop for the welcome state. Flip the shared pref,
         persist + broadcast it; the wise:chat-bg-anim listener does the actual
         switch sync + start/stop (here and on every sibling chat). Keep the menu
         open so the pink switch reads back its new state. */
      bgAnimOn = !bgAnimOn;
      try { localStorage.setItem(BGANIM_PREF_KEY, bgAnimOn ? '1' : '0'); } catch (_) {}
      try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim', { detail: { on: bgAnimOn } })); } catch (_) {}
    }
    else if (action === 'stream-toggle') {
      /* Master streaming switch: ON streams the thinking at the chosen level,
         OFF skips the trace so answers just land. Keep the menu open so the
         switch state reads back; persist + broadcast so sibling chats follow. */
      streamOn = !item.classList.contains('is-on');
      try { localStorage.setItem(STREAM_ON_PREF_KEY, streamOn ? '1' : '0'); } catch (_) {}
      try { document.dispatchEvent(new CustomEvent('wise:chat-stream-on', { detail: { on: streamOn } })); } catch (_) {}
      syncStreamMenu();
    }
    else if (action === 'stream-level') {
      /* Pick how much of WISEcodeAI's thinking streams before an answer lands
         (full globs · steps only · final message only). Keep the menu open so
         the segment selection reads back immediately; persist the choice + tell
         any sibling chat modules so their menus follow the one shared setting. */
      const lvl = item.dataset.stream;
      if (STREAM_LEVELS.includes(lvl) && lvl !== streamLevel) {
        streamLevel = lvl;
        try { localStorage.setItem(STREAM_PREF_KEY, lvl); } catch (_) {}
        try { document.dispatchEvent(new CustomEvent('wise:chat-stream-level', { detail: { level: lvl } })); } catch (_) {}
      }
      syncStreamMenu();
    }
    else if (action === 'activity-strip') {
      /* On/off switch for the landmark rail on the chat's edge. Keep the menu
         open so the switch state reads back; applyActivityStrip persists the
         choice and broadcasts wise:activity-strip so every menu follows. */
      applyActivityStrip(!isActivityStripOn());
      syncActivityStripMenu();
    }
    else if (action === 'toggle-cards') {
      closeMore();
      cardsHidden = !cardsHidden;
      try { localStorage.setItem(CHIPS_PREF_KEY, cardsHidden ? '1' : '0'); } catch (_) {}
      syncCards();
    }
    else if (action === 'toggle-intent-chips') {
      closeMore();
      chipsHidden = !chipsHidden;
      try { localStorage.setItem(CHIPS_HIDE_PREF_KEY, chipsHidden ? '1' : '0'); } catch (_) {}
      syncChips();
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
      const blob = new Blob(['WISEcodeAI™ export placeholder\n'], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'wiseai-chat.txt';
      a.click();
    } else if (action === 'share') {
      closeMore();
      /* Let the host own the Share UX (e.g. WISEcodeAI's in-app share panel). Falls
         back to the native share sheet / clipboard when no hook is provided. */
      if (typeof opts.onShare === 'function') {
        opts.onShare();
      } else {
        const url = window.location.href;
        if (navigator.share) navigator.share({ title: esc(title), url }).catch(() => {});
        else if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
      }
    } else if (action === 'close') {
      closeMore();
      /* "Close conversation" wipes the thread and restarts the chat from scratch —
         back to the fresh welcome screen, not a navigation away. */
      reset();
    } else if (action === 'attach') {
      flPop?.classList.remove('open');
      pickFile();
    } else if (action === 'attach-example') {
      flPop?.classList.remove('open');
      flMoreBtn?.setAttribute('aria-expanded', 'false');
      loadExampleAttachments();
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
  /* Rebuild every live chip surface (welcome grid, persistent rail, inline
     transcript block) from the current intents + spent state. Shared by
     setIntents() and markIntentUsed() so a chip's spent look shows up wherever
     it's rendered. */
  function renderChips() {
    chipsHtml = buildChipsHtml();
    const wc = rootEl.querySelector(`#${id}-chips`);
    if (wc) wc.innerHTML = chipsHtml;
    const pc = rootEl.querySelector(`#${id}-pchips`);
    if (pc) pc.innerHTML = chipsHtml;
    if (ichipsEl) ichipsEl.innerHTML = chipsHtml;
  }
  /* Flag a chip's intent as spent and re-render so it dims out and stops
     taking clicks. No-op for control intents (never passed here) or ids
     already marked. */
  function markIntentUsed(intentId) {
    /* "What can I ask?" is a standing affordance (it must always accompany the
       gold link), so it never dims out as spent. */
    if (!intentId || intentId === ASK_HELP_INTENT || usedIntents.has(intentId)) return;
    usedIntents.add(intentId);
    renderChips();
  }
  function setIntents(newIntents, newReplies) {
    /* Re-append the "What can I ask?" chip so it survives contextual swaps. */
    if (Array.isArray(newIntents)) intents = withAskHelpChip(newIntents.slice());
    if (newReplies && typeof newReplies === 'object') {
      intentReplies = Object.assign({}, intentReplies || {}, newReplies);
    }
    /* A fresh contextual chip set is a clean slate — spent state doesn't carry
       across a swap (e.g. a marketing dock re-skinning per page). */
    usedIntents.clear();
    renderChips();
  }

  /* Announce a context switch WITHOUT resetting the conversation: swap in the
     new context's chips, then — only when a conversation is already underway —
     drop a short WISEcodeAI acknowledgement so the user sees the assistant noticed
     the page changed. The freshly-swapped inline chips re-park beneath it, so
     the new page's quick actions are offered right away. On the welcome screen
     (no conversation yet) the chips speak for themselves and no line is added. */
  function announceRoute(message, newIntents, newReplies) {
    setIntents(newIntents, newReplies);
    const conversing = welcome ? welcome.classList.contains('sc-hidden') : true;
    if (conversing && message) addWISEcodeAI(message, { source: '' });
  }

  /* Apply the remembered overview-cards + intent-chips preferences now the DOM exists. */
  syncCards();
  syncChips();

  /* Play the welcome in: heading + sub type in word-by-word, then the intent
     chips fly in from the right and land — so the chips always trail the copy. */
  revealWelcome();

  /* WISEcodeAI: pre-dock the Turns module so it lives as its own broken-out module
     from the start (never an in-chat popover) — a real flex sibling docked to
     the right of the chat, shown and ready like the History module. */
  if (turnsBreakout) {
    ensureTurnsPanel();
    setTurnsDocked(true);
    /* Off by default: the module is built + docked but starts tucked behind the
       chat (hidden). The chat's three-dot "Turns" switch reveals it. */
    if (!turnsBreakoutDefault) turnsPanel.classList.add('wch-docked-hidden');
    renderTurns();
  }
  syncTurnsMenu();
  syncCompactMenu();
  syncBrandtextMenu();
  syncBgAnimMenu();
  syncStreamMenu();
  syncActivityStripMenu();

  /* Activity strip — restore the saved on/off + side preferences onto <html>,
     then pin the rail to THIS chat's transcript. Mounted from the shared module
     so every page that uses this chat gets the strip without page wiring (the
     strip module injects its own styles and tears down any previous mount).
     Hosts pass `activityStrip: false` to opt out — the WISEcodeAI dock does, so
     its floating mini-chat never steals the single rail from a page's main
     chat module. */
  restoreActivityStrip();
  if (messages && opts.activityStrip !== false) {
    mountActivityStrip({ chatEl: rootEl, messagesEl: messages });
  }

  /* Sticky-modules toggle: reflect the initial state onto the switch and let the
     host apply the layout so a persisted preference survives reloads. */
  if (opts.stickyModules === true) {
    const stickyItem = rootEl.querySelector('[data-sc="sticky"]');
    if (stickyItem) {
      stickyItem.classList.toggle('is-on', stickyOn);
      stickyItem.setAttribute('aria-checked', stickyOn ? 'true' : 'false');
    }
    applyStickyLayout();
    try { opts.onStickyModules && opts.onStickyModules(stickyOn); } catch (_) {}
  }

  /* Outputs & sources toggle: reflect the initial (off = shown) state onto the
     switch and let the host apply the matching visibility. */
  if (opts.outputsToggle === true) {
    const outItem = rootEl.querySelector('[data-sc="outputs"]');
    if (outItem) {
      outItem.classList.toggle('is-on', outputsHidden);
      outItem.setAttribute('aria-checked', outputsHidden ? 'true' : 'false');
    }
    try { opts.onToggleOutputs && opts.onToggleOutputs(outputsHidden); } catch (_) {}
  }

  return { addUser, addWISEcodeAI, showTyping, primeChips, revealChips, messages, ask, sendIntent, reset, openAgents, closeAgents, openConnectors, closeConnectors, openAskHelp, closeAskHelp, setAskDocked, isAskDocked: () => askDocked, openTurns, closeTurns, toggleTurns, setTurnsDocked, isTurnsDocked: () => turnsDocked, hideWelcome, setIntents, announceRoute, setWidth: syncWidthUI, root: rootEl };
}
