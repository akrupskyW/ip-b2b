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
 * Requires the design tokens and chat styles in pages/wise.css
 * to be loaded on the host page.
 */

/* Side-effect import: registers window.WiseChatHistory (the shared in-module
   history sidebar) so every mounted WISEcodeAI surface gets the same history +
   "start new conversation" behaviour. */
import './chat-history.js';
/* Side-effect import: registers window.WiseLibraryStore so File to Library
   can copy the live thread onto the WISEcodeAI Library shelf. */
import './wise-library-store.js';
import './chat-ask.js';
/* Side-effect import: registers window.WISE_ASK_CATALOG (the shared "What can I
   ask?" catalog) so every WISEcodeAI chat surface shows the SAME rich panel that
   wiseai.html does, unless a mount overrides it with its own askCatalog. */
import './ask-catalog.js';
/* Side-effect import: Wise Owl Progression strip — mounts itself whenever a
   reply drops a .sc-owl-prog figure into any chat transcript. */
import './owl-progression-carousel.js';

/* Side-effect import: the Orbit style's owl constellation. Chat welcomes only
   paint it when the shared style is Orbit; Helix / Ten keep the Scene strand. */
import './welcome-orbit.js';

/* Shared user-avatar store — the "you" bubbles render the member's uploaded
   profile picture (set on the Organization Profile page) when present, and fall
   back to their initials otherwise. */
import { userAvatarImg } from './user-avatar.js';
import { esc } from './escape-html.js';
import { openModal, closeModal, modalHTML } from './wise-modal.js';
import { OWL_BUG, OWL_MARK } from './owl-mark.js';
import {
  refineReply, withTimeout, toggleOllamaOn, probeOllama,
  enrichReply,
  ensureOllamaMenuRow, syncOllamaMenu, ollamaRowHtml,
} from './ollama-chat.js';

/* Activity strip — the thin landmark rail pinned to the chat's edge. Mounted
   from here so EVERY page that uses this shared chat gets it (styles are
   injected by the strip module itself); toggled from the three-dot menu. */
import {
  isActivityStripOn,
  applyActivityStrip,
  getActivityStripSide,
  setActivityStripSide,
  restoreActivityStrip,
  mountActivityStrip,
} from './chat-activity-strip.js';
/* One picker decides what counts as a single line of content, so the transcript
   and the panes break a section into the same beats. */
import { collectRevealUnits, staggerReveal } from './stagger-reveal.js';
/* The streaming trace itself lives in one place so the hand-rolled page flows
   (js/add-product-flow.js) stream the identical "Thinking" block rather than
   standing in a bare spinner-and-label beat. */
import { runTraceStream } from './trace-stream.js';
export { OWL_BUG, OWL_MARK };

/* Chat module elevation is locked to Little min — the same drop as the
   other module cards. The Admin three-dot picker (Little min / Above high / 3D)
   was removed; leftover wise:chat-elev prefs are rewritten to min. */
const CHAT_ELEV_KEY = 'wise:chat-elev';
function applyChatElevMin() {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.classList.remove('chat-elev-high', 'chat-elev-3d');
  html.classList.add('chat-elev-min');
  try { localStorage.setItem(CHAT_ELEV_KEY, 'min'); } catch (_) {}
}
try { applyChatElevMin(); } catch (_) {}

const DEFAULT_INTENTS = [
  { intent: 'customer_profile', label: 'Start New Verification', icon: 'add', nextIntents: ['resume_prompt', 'add_food_intro', 'faq_intro'] },
  { intent: 'resume_prompt', label: 'Continue Existing', icon: 'play_circle', nextIntents: ['customer_profile', 'faq_intro', 'edit_food_select'] },
  { intent: 'faq_intro', label: 'Ask a Question', icon: 'help_outline', nextIntents: ['registry_home', 'add_food_intro', 'customer_profile'] },
  { intent: 'choose_agents', label: 'Choose Agents', icon: 'smart_toy' },
  { intent: 'registry_home', label: 'WISE Foods', icon: 'restaurant_menu', nextIntents: ['add_food_intro', 'edit_food_select', 'faq_intro'] },
  { intent: 'add_food_intro', label: 'Add a New Food', icon: 'add', nextIntents: ['registry_home', 'edit_food_select', 'faq_intro'] },
  { intent: 'edit_food_select', label: 'Edit an Existing Food', icon: 'edit_note', nextIntents: ['registry_home', 'add_food_intro'] },
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

/* "You" chip: photo from the shared store (or an explicit override), else initials. */
function youAvatarChipHtml(initials, customAvatar) {
  const custom = typeof customAvatar === 'function' ? customAvatar() : customAvatar;
  const img = custom || userAvatarImg('You');
  const init = initials || 'AK';
  return `<span class="sc-avatar sc-avatar-you${img ? ' has-avatar-img' : ''}" role="img" aria-label="You" data-initials="${esc(init)}">${img || esc(init)}</span>`;
}

/* Split a label into per-letter spans so CSS can run a staggered, text-clipped
   gold shimmer across it (used by the "What can I ask?" link). Spaces become
   real elements (.sc-ask-sp, white-space:pre) — NOT bare text nodes — because
   flex containers drop whitespace-only text nodes between children, which
   scrunched the label into "WhatcanIask?" wherever the glyphs land directly
   inside a flex button. Each glyph carries its index for the delay stagger. */
function shimmerLetters(label) {
  return String(label).split('').map((ch, i) =>
    ch === ' '
      ? '<span class="sc-ask-sp"> </span>'
      : `<span class="sc-ask-ch" style="--ch-i:${i}">${esc(ch)}</span>`
  ).join('');
}

/* Animate a "live" food-count read-out: ease up from zero to the seeded total,
   then surge briskly past the million mark, then keep ticking upward forever by
   small random amounts (mostly single digits, with the odd larger jump) so the
   corpus feels like it is still growing. Honors prefers-reduced-motion by
   snapping straight to the total. */
function startFoodCounter(el) {
  const final = parseInt(el.getAttribute('data-final'), 10) || 0;
  if (!final) return;
  const fmt = (n) => n.toLocaleString('en-US');
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { el.textContent = fmt(final); return; }

  const dur = 1900;
  const t0 = performance.now();
  let current = 0;
  /* If the seeded total sits just under a million, don't crawl the last stretch
     — surge past 1,000,000 in a few seconds, then settle into the slow drift. */
  const surgeTo = final < 1000000 ? 1000000 : 0;

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

  const surge = () => {
    current += 250 + Math.floor(Math.random() * 700);
    el.textContent = fmt(current);
    if (current < surgeTo) {
      setTimeout(surge, 60 + Math.random() * 140);
    } else {
      setTimeout(drift, 500 + Math.random() * 500);
    }
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
      setTimeout(current < surgeTo ? surge : drift, 700);
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

/* Illustrative per-turn token meter — same figures the composer activity
   read-out uses. Seeded so a given answer keeps the same numbers after
   restore instead of re-rolling on every load. */
function fmtTok(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(Math.round(n));
}
function fmtDur(ms) {
  const s = Math.max(1, Math.round(ms / 1000));
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}
function seedFrom(ms, tid) {
  let h = Number(ms) || 0;
  const s = String(tid || '');
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) + s.charCodeAt(i)) >>> 0;
  return h || 1;
}
function synthesizeTurnTokens(seed) {
  let x = Math.abs(Number(seed) || 1) || 1;
  const rnd = (a, b) => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return a + (x / 0x100000000) * (b - a);
  };
  const tokIn = Math.round(rnd(6000, 22000));
  const tokOut = Math.round(rnd(400, 2600));
  const cached = Math.round(tokIn * rnd(0.7, 0.9));
  const cost = +(tokIn / 1e6 * 0.9 + tokOut / 1e6 * 4.5).toFixed(4);
  const ops = Math.round(rnd(1, 4));
  const tools = Math.round(rnd(0, 3));
  const dur = Math.round(rnd(2000, 9000));
  return { tokIn, tokOut, cached, cost, ops, tools, dur };
}
function tokensFromEl(el) {
  if (!el || !el.getAttribute) return null;
  const tokIn = Number(el.getAttribute('data-tok-in'));
  if (!Number.isFinite(tokIn) || tokIn <= 0) return null;
  return {
    tokIn,
    tokOut: Number(el.getAttribute('data-tok-out')) || 0,
    cached: Number(el.getAttribute('data-tok-cached')) || 0,
    cost: Number(el.getAttribute('data-tok-cost')) || 0,
    ops: Number(el.getAttribute('data-tok-ops')) || 0,
    tools: Number(el.getAttribute('data-tok-tools')) || 0,
    dur: Number(el.getAttribute('data-tok-dur')) || 0,
  };
}
function formatTurnTokensHtml(t) {
  if (!t) return '';
  const pct = t.tokIn ? Math.round((t.cached / t.tokIn) * 100) : 0;
  return `${fmtTok(t.tokIn)} in / ${fmtTok(t.tokOut)} out · <em>${fmtTok(t.cached)} cached (${pct}%)</em> · `
    + `<b>$${Number(t.cost).toFixed(4)}</b> · ${fmtDur(t.dur)} · ${t.ops} ops · ${t.tools} tools`;
}
function tokenAttrs(t) {
  if (!t) return '';
  return ` data-tok-in="${t.tokIn}" data-tok-out="${t.tokOut}" data-tok-cached="${t.cached}"`
    + ` data-tok-cost="${t.cost}" data-tok-ops="${t.ops}" data-tok-tools="${t.tools}" data-tok-dur="${t.dur}"`;
}
function tokenRowHtml(t) {
  if (!t) return '';
  return `<span class="sc-fb-menu-div" aria-hidden="true"></span>`
    + `<span class="sc-fb-menu-tokens" role="status"${tokenAttrs(t)}>${formatTurnTokensHtml(t)}</span>`;
}

/* Short, locale-aware clock label (e.g. "9:42 AM") for message timestamps —
   a small accountability cue so every line is attributable to a moment. */
function clockLabel(ms) {
  try {
    return new Date(ms == null ? Date.now() : ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch (_) {
    return '';
  }
}
function nowLabel() {
  return clockLabel();
}

/* "3 min ago" / "2 hr ago" / "3 d ago" — click a transcript stamp to swap the
   wall-clock for how long ago the turn landed. Short units only; never spell
   out minutes/hours/days. */
function relativeLabel(ms) {
  const t = Number(ms);
  if (!Number.isFinite(t)) return '';
  const deltaMs = t - Date.now();
  const absSec = Math.abs(deltaMs) / 1000;
  let value;
  let unit;
  if (absSec < 45) return 'Just now';
  if (absSec < 90) { value = deltaMs < 0 ? -1 : 1; unit = 'min'; }
  else if (absSec < 3600) { value = Math.round(deltaMs / 60000); unit = 'min'; }
  else if (absSec < 5400) { value = deltaMs < 0 ? -1 : 1; unit = 'hr'; }
  else if (absSec < 86400) { value = Math.round(deltaMs / 3600000); unit = 'hr'; }
  else if (absSec < 86400 * 1.5) { value = deltaMs < 0 ? -1 : 1; unit = 'd'; }
  else if (absSec < 86400 * 7) { value = Math.round(deltaMs / 86400000); unit = 'd'; }
  else if (absSec < 86400 * 30.5) { value = Math.round(deltaMs / (86400000 * 7)); unit = 'wk'; }
  else if (absSec < 86400 * 365) { value = Math.round(deltaMs / (86400000 * 30.44)); unit = 'mo'; }
  else { value = Math.round(deltaMs / (86400000 * 365.25)); unit = 'yr'; }
  const n = Math.abs(value);
  return value <= 0 ? `${n} ${unit} ago` : `in ${n} ${unit}`;
}

/* Parse a clock-only stamp ("9:42 AM") as today — used when restored HTML
   predates data-ts. If that time is still in the future, treat it as yesterday. */
function parseClockToMs(label) {
  const text = String(label || '').trim();
  if (!text) return Date.now();
  const parsed = Date.parse(`${new Date().toDateString()} ${text}`);
  if (!Number.isFinite(parsed)) return Date.now();
  if (parsed > Date.now() + 120000) return parsed - 86400000;
  return parsed;
}

function stampMs(el) {
  const raw = el.getAttribute('data-ts');
  const n = raw != null && raw !== '' ? Number(raw) : NaN;
  if (Number.isFinite(n)) return n;
  const clock = el.getAttribute('data-clock') || (el.textContent || '').trim();
  const ms = parseClockToMs(clock);
  el.setAttribute('data-ts', String(ms));
  if (!el.getAttribute('data-clock')) el.setAttribute('data-clock', clockLabel(ms));
  return ms;
}

function toggleLineTime(el) {
  if (!el) return;
  const ms = stampMs(el);
  const showingRel = el.getAttribute('data-mode') === 'rel';
  if (showingRel) {
    const clock = el.getAttribute('data-clock') || clockLabel(ms);
    el.textContent = clock;
    el.setAttribute('data-mode', 'clock');
    el.setAttribute('title', 'Show time ago');
    el.setAttribute('aria-label', `Sent at ${clock}. Activate to show how long ago.`);
  } else {
    if (!el.getAttribute('data-clock')) {
      el.setAttribute('data-clock', (el.textContent || '').trim() || clockLabel(ms));
    }
    const rel = relativeLabel(ms);
    el.textContent = rel;
    el.setAttribute('data-mode', 'rel');
    el.setAttribute('title', 'Show time');
    el.setAttribute('aria-label', `Sent ${rel}. Activate to show the time.`);
  }
}

/* Default a stamp to relative ("3 min ago"). Clock is one click away. */
function paintStampRel(el) {
  if (!el) return;
  const ms = stampMs(el);
  if (!el.getAttribute('data-clock')) el.setAttribute('data-clock', clockLabel(ms));
  const rel = relativeLabel(ms);
  el.textContent = rel;
  el.setAttribute('data-mode', 'rel');
  el.setAttribute('title', 'Show time');
  el.setAttribute('aria-label', `Sent ${rel}. Activate to show the time.`);
}

/* Markup for a clickable transcript stamp. Extra class (e.g. sc-fb-time)
   is appended as-is — callers pass a known token, never user input.
   Default is time-ago; click swaps to the wall clock. */
function timeStampHtml(ms, extraClass) {
  const t = ms == null ? Date.now() : Number(ms);
  const when = Number.isFinite(t) ? t : Date.now();
  const clock = clockLabel(when);
  const rel = relativeLabel(when);
  const cls = extraClass ? `sc-line-time ${extraClass}` : 'sc-line-time';
  return `<span class="${cls}" role="button" tabindex="0" data-ts="${when}" data-clock="${esc(clock)}" data-mode="rel" title="Show time" aria-label="Sent ${esc(rel)}. Activate to show the time.">${esc(rel)}</span>`;
}

/* One document-level listener so EVERY chat surface that loads this module
   (shared mount + hand-rolled transcripts that still emit .sc-line-time)
   toggles clock ↔ relative on click / Enter / Space. */
export function wireTranscriptTimes() {
  if (typeof document === 'undefined' || document.documentElement.dataset.scTimeWired === '1') return;
  document.documentElement.dataset.scTimeWired = '1';
  document.addEventListener('click', (e) => {
    const el = e.target && e.target.closest && e.target.closest('.sc-line-time');
    if (!el) return;
    e.preventDefault();
    toggleLineTime(el);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const el = e.target && e.target.closest && e.target.closest('.sc-line-time');
    if (!el) return;
    e.preventDefault();
    toggleLineTime(el);
  });
}
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      wireTranscriptTimes();
      document.querySelectorAll('.sc-line-time').forEach(paintStampRel);
    }, { once: true });
  } else {
    wireTranscriptTimes();
    document.querySelectorAll('.sc-line-time').forEach(paintStampRel);
  }
}

/* Momentary confirmation toast for answer-action copy (turn ID, etc.).
   Hover labels on those icons are the shared theme-aware #lir-tooltip —
   this card is flash-only so the two never stack. */
let scTipEl = null;
let scTipFor = null;
let scTipFlashTimer = null;

function placeScTip(el, label) {
  if (!scTipEl) return;
  scTipEl.textContent = label;
  const r = el.getBoundingClientRect();
  scTipEl.style.left = `${Math.round(r.left + r.width / 2)}px`;
  scTipEl.style.top = `${Math.round(r.top - 8)}px`;
  scTipEl.offsetWidth; /* reflow so the enter transition plays */
  scTipEl.classList.add('is-vis');
}

function hideScTip() {
  if (scTipFor && scTipFor.hasAttribute('data-sc-title')) {
    scTipFor.setAttribute('title', scTipFor.getAttribute('data-sc-title'));
    scTipFor.removeAttribute('data-sc-title');
  }
  scTipFor = null;
  if (scTipEl) scTipEl.classList.remove('is-vis');
}

/* Momentary confirmation toast reusing the tooltip card — used after a copy
   so the acknowledgement lands right where the hover tip would sit. Deferred
   a frame so it survives the click-driven hideScTip on the same gesture. */
function flashScTip(target, label) {
  if (!target) return;
  requestAnimationFrame(() => {
    scTipFor = null; /* not a hover tip — don't let mouseout dismiss it early */
    placeScTip(target, label);
    clearTimeout(scTipFlashTimer);
    scTipFlashTimer = setTimeout(hideScTip, 1200);
  });
}

/* File the live thread onto the WISEcodeAI Library shelf. Expands the folder
   list inside the Conversation menu (not a second popover). Picking a folder
   copies the saved item onto that shelf. */
function fileConversationToLibrary(opts) {
  opts = opts || {};
  const store = typeof window !== 'undefined' ? window.WiseLibraryStore : null;
  if (!store || typeof store.fileCurrent !== 'function') {
    return { ok: false };
  }
  const fileOpts = {
    chatHistory: opts.chatHistory || (typeof window !== 'undefined' ? window.__wiseChatHistory : null),
    messagesEl: opts.messagesEl,
    historyKey: opts.historyKey,
  };
  if (typeof store.canFile === 'function' && !store.canFile(fileOpts)) {
    flashScTip(opts.trigger, 'Nothing to file yet');
    return { empty: true };
  }
  const commit = (folderId) => {
    const result = store.fileCurrent({ ...fileOpts, folderId: folderId || null });
    const folder = folderId && typeof store.findFolder === 'function' ? store.findFolder(folderId) : null;
    const tip = result && result.empty
      ? 'Nothing to file yet'
      : folder
        ? (result && result.updated ? `Updated in ${folder.name}` : `Filed to ${folder.name}`)
        : (result && result.updated ? 'Updated in Library' : 'Filed to Library');
    if (typeof opts.onFiled === 'function') opts.onFiled(result);
    flashScTip(opts.tipTarget || opts.trigger, tip);
    return result || { ok: false };
  };
  if (typeof store.openFolderPicker === 'function') {
    let historyKey = fileOpts.historyKey || '';
    if (!historyKey && fileOpts.chatHistory && typeof fileOpts.chatHistory.storageKey === 'function') {
      try { historyKey = fileOpts.chatHistory.storageKey() || ''; } catch (_) { historyKey = ''; }
    }
    const existing = typeof store.findByHistory === 'function' ? store.findByHistory(historyKey) : null;
    const hosted = existing && typeof store.foldersOf === 'function' ? store.foldersOf(existing.id) : [];
    const menu = opts.menu;
    const host = (menu && menu.querySelector && menu.querySelector('[data-sc="file-library"]')) || null;
    store.openFolderPicker(opts.trigger, {
      title: 'File to Library',
      currentIds: hosted.map((f) => f.id),
      unfiled: true,
      unfiledLabel: 'Library',
      unfiledCurrent: !!(existing && !hosted.length),
      host: host || undefined,
      preferAbove: opts.preferAbove === true,
      markOpen: opts.markOpen,
    }, commit);
    return { picking: true };
  }
  return commit(null);
}

function injectFileToLibraryMenuItem(pop) {
  if (!pop) return null;
  /* Already in the shared mount template — that surface's [data-sc] handler
     files the thread. Returning null keeps hand-rolled menus from double-firing. */
  if (pop.querySelector('[data-sc="file-library"]')) return null;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'topbar-menu-item';
  btn.setAttribute('data-sc', 'file-library');
  btn.setAttribute('role', 'menuitem');
  btn.innerHTML = '<span class="material-symbols-outlined topbar-menu-icon">auto_stories</span><span>File to Library</span>';
  const after = pop.querySelector('[data-sc="share"], [data-ap="share"]')
    || pop.querySelector('[data-sc="export"], [data-ap="export"]')
    || pop.querySelector('[data-sc="new"], [data-ap="restart"]');
  if (after && after.parentNode) {
    if (after.nextSibling) after.parentNode.insertBefore(btn, after.nextSibling);
    else after.parentNode.appendChild(btn);
  } else {
    pop.insertBefore(btn, pop.firstChild);
  }
  return btn;
}

export function wireAnswerTips() {
  if (typeof document === 'undefined' || document.documentElement.dataset.scTipWired === '1') return;
  document.documentElement.dataset.scTipWired = '1';
  scTipEl = document.getElementById('sc-tip');
  if (!scTipEl) {
    scTipEl = document.createElement('div');
    scTipEl.id = 'sc-tip';
    scTipEl.className = 'sc-tip';
    scTipEl.setAttribute('aria-hidden', 'true');
    (document.body || document.documentElement).appendChild(scTipEl);
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

/* When a user submits thumbs feedback we don't just flash a lone "thanks" —
   WISEcodeAI answers it in-thread with a reply keyed to WHY they flagged (or
   praised) the answer, so the exchange reads like a real chat turn. Keyed by
   verdict → reason value, with a `_default` fallback per verdict. */
const FEEDBACK_REPLIES = {
  down: {
    inaccurate: 'Thanks for flagging that — accuracy is the whole point here. Which figure or claim looked off? I\u2019ll re-check it against the source record and correct the answer.',
    incomplete: 'Got it — sounds like I left something out. What were you expecting to see? I\u2019ll pull the missing piece and round out the answer.',
    'wrong-food': 'Understood — it looks like I matched the wrong item. If you share the exact product (or its code), I\u2019ll re-run against the right record.',
    outdated: 'Thanks — stale figures are a real problem. I\u2019ll re-pull from the latest snapshot; if you know roughly when the data should be from, that helps me verify.',
    unclear: 'Fair — I can tighten that up. Want the short version or a step-by-step breakdown? I\u2019ll rewrite it to be easier to follow.',
    other: 'Thanks for the note. Tell me a bit more about what missed and I\u2019ll take another pass at it.',
    _default: 'Thanks for letting me know this missed the mark. Share a little more about what was off and I\u2019ll take another pass.',
  },
  up: {
    trustworthy: 'Glad the sourcing held up — every figure here traces back to a cited record, so you can always click through to verify.',
    clear: 'Great — clarity is something I really try to get right. Happy to go deeper on any part if that helps.',
    thorough: 'Good to hear it covered what you needed. Want me to package this up or take it a step further?',
    'right-food': 'Perfect — glad I matched the right item. I\u2019ll keep anchoring to that record for any follow-ups.',
    actionable: 'Love that it was useful. Want me to turn this into next steps or an export?',
    'other-good': 'Thanks — glad this hit the mark. Anything you\u2019d like me to build on?',
    _default: 'Thanks — glad this hit the mark. Anything you\u2019d like me to build on?',
  },
};

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
    items: [
      { id: 'sb-mine', name: 'My foods (demo)', desc: '80 foods \u00b7 imports, clones, creations' },
    ],
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
  /* Re-measure whenever the field's WIDTH changes (module width toggle,
     panel resize): line wrapping and paddings change with width, so a height
     measured at the old width goes stale and leaves the placeholder sitting
     off-center. Only react to width — sync() itself changes the height, and
     re-syncing on that would loop the observer. */
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

/* Line the "What can I ask?" link up under the composer's placeholder text.
   That inset is not a constant — it moves with the "+" button, the field's own
   left padding and the composer variant — so measure the textarea's real text
   edge and match it, minus the link's own left padding. Re-runs after fonts
   land and on any composer resize.

   Exported and called from BOTH the canonical mount and wireChatComposer, so a
   surface that wires only the composer still gets the right inset and no page
   ever needs its own alignment rule. Idempotent per link. */
export function alignAskHelp(scopeEl) {
  const scope = scopeEl || document;
  const btn = scope.querySelector('.sc-ask-help');
  const input = scope.querySelector('textarea.fl-input');
  const row = btn && btn.closest('.sc-belowinput');
  if (!btn || !input || !row) return;
  const apply = () => {
    const inRect = input.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    if (!inRect.width || !rowRect.width) return; /* hidden / not laid out yet */
    const inPadL = parseFloat(getComputedStyle(input).paddingLeft) || 0;
    const btnPadL = parseFloat(getComputedStyle(btn).paddingLeft) || 0;
    btn.style.marginLeft = `${Math.max(0, Math.round((inRect.left + inPadL) - rowRect.left - btnPadL))}px`;
  };
  apply();
  if (btn.dataset.askAligned === '1') return;
  btn.dataset.askAligned = '1';
  /* Fonts can reflow the composer after first paint. */
  if (document.fonts?.ready) document.fonts.ready.then(apply).catch(() => {});
  const wrap = input.closest('.fl-input-wrap') || input;
  if (typeof ResizeObserver === 'function') new ResizeObserver(apply).observe(wrap);
  window.addEventListener('resize', apply);
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

  /* Line the "What can I ask?" link up under this composer (shared measurement
     — see alignAskHelp). Walk out to the nearest ancestor that owns the link so
     a page with two chats aligns each against its own composer. */
  let askScope = railEl.parentElement;
  while (askScope && !askScope.querySelector('.sc-ask-help')) askScope = askScope.parentElement;
  if (askScope) alignAskHelp(askScope);

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
    const tid = makeTurnId();
    const body = prev
      ? `<span class="sc-event-label">Switched database from</span> <strong>${esc(prev.name)}</strong> to <strong>${esc(next.name)}</strong>`
      : `<span class="sc-event-label">Set database to</span> <strong>${esc(next.name)}</strong>`;
    messages.insertAdjacentHTML('beforeend',
      `<div class="sc-line sc-line-you sc-line-event" data-activity="database" role="note" aria-label="${esc(prev ? `Switched database to ${next.name}` : `Set database to ${next.name}`)}">`
      + youAvatarChipHtml(initials, opts.userAvatar)
      + `<div class="sc-line-body">${body}<div class="sc-line-meta">${timeStampHtml()}<span class="sc-fb-id" data-tip="Turn ID" tabindex="0">#${esc(tid)}</span></div></div>`
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
export function injectChatExtras() {
  wireTranscriptTimes();
  wireAnswerTips();
  if (typeof document === 'undefined' || document.getElementById('wiseai-chat-extras')) return;
  const css = `
    .sc-welcome:not(.ws-in) > .ws-heading,
    .sc-welcome:not(.ws-in) > .ws-sub,
    .sc-welcome:not(.ws-in) .ws-chips .chip,
    .sc-welcome:not(.ws-in) .ws-scorecard { opacity: 0; }
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
    .sc-stream-detail-label { display: flex; align-items: center; gap: 6px;
      font-size: 10px; letter-spacing: 0.1em; font-weight: 700;
      text-transform: uppercase; color: var(--text-muted); }
    .sc-bganim-row-icon { font-size: 17px !important; flex-shrink: 0; color: var(--text-subtle);
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20; }
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
    .sc-ollama-item .topbar-menu-copy { white-space: normal; }
    .sc-ollama-item .topbar-menu-desc { white-space: normal; }

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

    /* Paragraph-by-paragraph transcript reveal — each prose run is wrapped in
       .sc-para so it can fade in as a block. Consecutive paras get the same
       gap a <br><br> used to create. */
    .sc-line-body > .sc-para { display: block; }
    .sc-line-body > .sc-para + .sc-para { margin-top: 1em; }
    .sc-inline-h {
      font-family: inherit; font-size: 1.05em; font-weight: 700; line-height: 1.35;
      margin: 0.9em 0 0.35em; color: inherit;
    }
    .sc-line-body > .sc-inline-h:first-child { margin-top: 0; }
    .sc-inline-tbl {
      display: flex; flex-direction: column; width: 100%;
      margin: 0.55em 0 0.15em; padding: 0; border: 0; border-radius: 0;
      background: none; box-shadow: none; font-size: 0.94em; line-height: 1.5;
      container-type: inline-size;
    }
    .sc-inline-tbl-row {
      display: grid; grid-template-columns: minmax(6.5em, 0.85fr) 1fr 1.4fr;
      gap: 10px 18px; margin: 0; padding: 14px 0; border: 0;
      border-top: 1px solid var(--border); border-radius: 0;
      background: none; box-shadow: none;
    }
    .sc-inline-tbl-row:last-child { border-bottom: 1px solid var(--border); }
    .sc-inline-tbl-row--head { font-weight: 600; }
    .sc-inline-tbl-food { font-weight: 700; }
    .sc-inline-tbl-cell { font-weight: 400; min-width: 0; }
    .sc-inline-tbl-lab { display: none; }
    html.dark .sc-inline-tbl-row { border-top-color: color-mix(in srgb, var(--text) 14%, transparent); }
    html.dark .sc-inline-tbl-row:last-child { border-bottom-color: color-mix(in srgb, var(--text) 14%, transparent); }
    @container (max-width: 520px) {
      .sc-inline-tbl-row { grid-template-columns: 1fr; gap: 8px; padding: 16px 0; }
      .sc-inline-tbl-row--head { display: none; }
      .sc-inline-tbl-lab {
        display: block; font-size: 0.68em; font-weight: 700;
        letter-spacing: 0.06em; text-transform: uppercase;
        color: var(--text-subtle); margin: 0 0 2px;
      }
    }

    /* Feedback actions sit INLINE — copy + thumbs, then the three-dot, then
       the timestamp to the right of more. Quiet outlined glyphs at rest. */
    .sc-fb-wrap { margin: 0; align-self: center; flex: 1 1 auto; min-width: 0; }
    .sc-fb { display: flex; align-items: center; gap: 1px; width: 100%; }
    /* Timestamp sits on the row, immediately to the RIGHT of the three-dot. */
    .sc-fb-time { margin-left: 6px; white-space: nowrap; flex-shrink: 0; }
    /* Three-dot ("more") control — sits directly to the RIGHT of thumbs-down
       (not floated to the far edge of the row). It holds the re-run / edit /
       fork / file controls + the turn ID on the first row, then a divider and
       this-message token read-out. */
    .sc-fb-more-wrap { position: relative; display: inline-flex; padding-left: 2px; }
    .sc-fb-menu { position: absolute; bottom: calc(100% + 8px); right: -4px; z-index: 80;
      display: flex; flex-direction: column; align-items: stretch; gap: 0;
      width: max-content; min-width: 220px; max-width: min(340px, calc(100vw - 24px));
      padding: 6px 8px 7px; background: var(--surface); border: 1px solid var(--border-strong);
      border-radius: 10px; box-shadow: var(--shadow-3, var(--sc-shadow-pop)); }
    .sc-fb-menu::before { content: ''; position: absolute; top: 100%; right: 11px;
      border: 6px solid transparent; border-top-color: var(--border-strong); }
    .sc-fb-menu::after { content: ''; position: absolute; top: 100%; right: 12px; transform: translateY(-1px);
      border: 5px solid transparent; border-top-color: var(--surface); }
    html.dark .sc-fb-menu { background: #1A2339; border-color: rgba(37,80,124,0.22); }
    html.dark .sc-fb-menu::after { border-top-color: #1A2339; }
    .sc-fb-menu[hidden] { display: none; }
    .sc-line-time { cursor: pointer; user-select: none;
      color: color-mix(in srgb, var(--text-subtle) 62%, transparent); text-decoration: none;
      transition: color .14s ease; }
    .sc-line-time:hover { color: var(--text); text-decoration: none; }
    html.dark .sc-line-time { color: color-mix(in srgb, var(--text-subtle) 70%, transparent); }
    html.dark .sc-line-time:hover { color: var(--text); }
    .sc-line-time:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
    .sc-fb-menu-actions { display: flex; align-items: center; gap: 1px; width: 100%; }
    /* Optional output version — same row as the icons, left side, only when
       the host stamped one (e.g. a surfaced Visuals/Results card). */
    .sc-fb-menu-ver {
      margin-right: 6px; padding-right: 7px; white-space: nowrap; flex-shrink: 0;
      border-right: 1px solid var(--border, rgba(20,40,80,0.12));
      font-size: 11px; font-weight: 600; letter-spacing: .02em;
      color: var(--text-subtle); font-variant-numeric: tabular-nums;
    }
    html.dark .sc-fb-menu-ver { border-right-color: rgba(255,255,255,0.10); }
    .sc-fb-menu-div { display: block; height: 1px; margin: 6px 0 5px;
      background: var(--border, rgba(20,40,80,0.12)); }
    html.dark .sc-fb-menu-div { background: rgba(255,255,255,0.10); }
    .sc-fb-menu-tokens { display: block; font-size: 10.5px; line-height: 1.45;
      font-variant-numeric: tabular-nums; color: var(--text-subtle); }
    .sc-fb-menu-tokens em { color: var(--primary-ink, var(--primary)); font-style: normal; }
    html.dark .sc-fb-menu-tokens em { color: #7fb0ff; }
    .sc-fb-menu-tokens b { color: var(--sec-green-text, #1E7A34); font-weight: 700; }
    /* The three-dot "more" control reads as a proper round chip — its hover /
       open background is a full circle, never a rounded square. */
    .sc-fb-more { border-radius: 50%; }
    .sc-fb-more.is-on, .sc-fb-more[aria-expanded="true"] { background: var(--surface-3); color: var(--text); }
    html.dark .sc-fb-more[aria-expanded="true"] { background: rgba(255,255,255,0.07); }
    .sc-fb-id { margin-left: 3px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.02em;
      color: var(--text-subtle); font-variant-numeric: tabular-nums; }
    .sc-fb-btn { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px;
      border: 0; border-radius: 50%; background: transparent;
      color: color-mix(in srgb, var(--text-subtle) 62%, transparent); cursor: pointer; padding: 0;
      transition: background .14s ease, color .14s ease; }
    html.dark .sc-fb-btn { color: color-mix(in srgb, var(--text-subtle) 70%, transparent); }
    .sc-fb-btn:hover { background: var(--surface-3); color: var(--text); }
    html.dark .sc-fb-btn:hover { background: rgba(255,255,255,0.07); }
    .sc-fb-btn .material-symbols-outlined { font-size: 12px; font-variation-settings: 'FILL' 0; }
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
      z-index: 80; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; pointer-events: none;
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
      z-index: 80; width: max-content; max-width: 260px; display: flex; flex-direction: column; gap: 8px;
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

    /* Flash toast for answer-action copy ("Copied!"). Hover labels live on
       #lir-tooltip. Theme tokens so the card is surface-colored in light
       mode and dark in dark mode — never a second always-dark hover tip.
       z-index sits above js/popover-layer.js (2147483000). */
    .sc-tip { position: fixed; z-index: 2147483646; pointer-events: none; max-width: 220px;
      background: var(--surface, #fff); color: var(--text, #1F2733); font-size: 11px; font-weight: 600; line-height: 1.25;
      letter-spacing: 0.01em; padding: 5px 10px; border-radius: 8px; white-space: nowrap;
      box-shadow: var(--shadow-card, 0 8px 22px rgba(20,30,60,0.14)); border: 1px solid var(--border, rgba(0,0,0,0.10));
      opacity: 0; transform: translate(-50%, calc(-100% - 4px)) scale(0.96); transform-origin: bottom center;
      transition: opacity .12s ease, transform .12s ease; }
    .sc-tip.is-vis { opacity: 1; transform: translate(-50%, -100%) scale(1); }
    .sc-tip::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
      border: 5px solid transparent; border-top-color: var(--surface, #fff); }

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
    .wt-fork { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 0; border-radius: 50%;
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
    .wt-iconbtn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 0; border-radius: 50%;
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
    .sc-activity-wrap:hover .sc-activity-pop, .sc-activity-wrap:focus-within .sc-activity-pop,
    .sc-activity.is-open .sc-activity-pop {
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
    .sc-ask-help .sc-ask-ch,
    .chip.ws-intent-chip--askhelp .sc-ask-ch { display: inline-block;
      /* Gilded Grain FILL with the shimmer band riding a touch brighter than the
         base — the glyph interior stays the deep brown-gold of the output
         strokes and the ear marks, and a full Gilded Grain shoulder flanks the
         bright band so the sweep shades through that same tone on its way in
         and out. Mixing toward amber rather than black keeps it warm instead of
         olive, and reads darker on paper than the old blackened gold did. */
      --ask-gold-base: color-mix(in srgb, var(--warm-400, #946005) 78%, var(--ter-amber, #FFC434));
      --ask-gold-deep: var(--warm-400, #946005);
      background: linear-gradient(105deg,
        var(--ask-gold-base) 0%,
        var(--ask-gold-base) 38%,
        var(--ask-gold-deep) 44%,
        var(--ter-amber, #FFC434) 48%, #ffe08a 50%, var(--ter-amber, #FFC434) 52%,
        var(--ask-gold-deep) 56%,
        var(--ask-gold-base) 62%,
        var(--ask-gold-base) 100%);
      background-size: 250% 100%; background-position: 100% 0;
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent; color: transparent;
      /* Lighter-gold hairline OUTLINE hugging each glyph edge — the darker
         fill above still reads through since the stroke only traces the edges. */
      -webkit-text-stroke: 0.4px color-mix(in srgb, var(--ter-amber, #FFC434) 45%, #fff);
      animation: sc-ask-shimmer 7.5s ease-in-out infinite;
      animation-delay: calc(var(--ch-i, 0) * 90ms); }
    /* On navy the same deep mix goes muddy, so both stops lean back toward the
       bright gold — still carrying Gilded Grain, just lifted enough to read. */
    html.dark .sc-ask-help .sc-ask-ch,
    html.dark .chip.ws-intent-chip--askhelp .sc-ask-ch {
      --ask-gold-base: color-mix(in srgb, var(--warm-400, #946005) 42%, var(--ter-amber, #FFC434));
      --ask-gold-deep: color-mix(in srgb, var(--warm-400, #946005) 78%, var(--ter-amber, #FFC434));
    }
    /* Word gaps in the shimmer label are real elements (see shimmerLetters);
       white-space:pre keeps the lone space from collapsing away. */
    .sc-ask-sp { white-space: pre; }
    @keyframes sc-ask-shimmer {
      0%, 8%    { background-position: 100% 0; transform: translateY(0); }
      20%       { transform: translateY(-1.5px); }
      34%, 100% { background-position: 0% 0; transform: translateY(0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .sc-ask-help .sc-ask-ch,
      .chip.ws-intent-chip--askhelp .sc-ask-ch { animation: none; }
    }

    /* "What can I ask?" INTENT CHIP — the gold-bordered twin of the link above.
       It rides at the end of every welcome chip set whenever the link is shown;
       clicking it starts a page-specific "here's what you can ask" chat turn.
       Doubled .chip selector so these outrank the base .ws-intent-chip rules in
       pages/wise.css. */
    .chip.ws-intent-chip--askhelp {
      border-color: color-mix(in srgb, var(--ter-amber, #FFC434) 75%, var(--border-strong));
      color: color-mix(in srgb, var(--ter-amber, #FFC434) 62%, #000);
      background: color-mix(in srgb, var(--ter-amber, #FFC434) 9%, #fff);
    }
    /* Gold icon too — matched to the gold label. The dark-mode base rule
       (html.dark .ws-intent-chip > .material-symbols-outlined) outranks a plain
       descendant override, so this pair uses the child combinator + a dark twin
       to keep the glyph inheriting the chip's gold in both themes. */
    .chip.ws-intent-chip--askhelp > .material-symbols-outlined,
    html.dark .chip.ws-intent-chip--askhelp > .material-symbols-outlined { color: inherit; }
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
    /* One scroller for the whole catalog — header, intro, search, chips, and
       prompts. The header sticks so the width control and ⋯ stay reachable. */
    .wch-ask-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; }
    .wch-ask-panel .wch-head { position: sticky; top: 0; z-index: 3;
      background: var(--card, var(--surface, #0F1830)); }
    html:not(.dark) .wch-ask-panel .wch-head { background: #fff; }
    #modules-row .wch-sidebar.wch-ask-panel.wch-docked .wch-head { background: var(--surface, #fff); }
    #modules-row.modules-sticky .wch-sidebar.wch-ask-panel.wch-docked:not(.wch-unsticky) .wch-head {
      background: var(--surface-2, var(--surface, #fff)); }
    .wch-ask-panel .wch-ask-list, .wch-ask-panel .wch-list { flex: none; overflow: visible; padding: 4px 10px 14px; }
    .wch-ask-group { margin: 0; padding: 10px 0 6px; }
    .wch-ask-group + .wch-ask-group { margin-top: 8px; padding-top: 28px;
      border-top: 1px solid rgba(20,40,80,0.10); }
    html.dark .wch-ask-group + .wch-ask-group { border-top-color: rgba(255,255,255,0.10); }
    .wch-ask-group-title { display: flex; align-items: center; gap: 8px; padding: 4px 6px 8px;
      font-family: "WISE Digits", "Noto Serif", serif; font-size: 1.12rem; font-weight: 800;
      letter-spacing: -.01em; line-height: 1.2; text-transform: none; color: var(--text); opacity: 1; }
    .wch-ask-group-title .material-symbols-outlined { font-size: 20px; opacity: .9; }
    .wch-ask-cards { display: flex; flex-direction: column; gap: 18px; }

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
    .wch-ask-insert .material-symbols-outlined { font-size: 19px; font-variation-settings: 'FILL' 1; }
    @media (hover: none) { .wch-ask-insert { opacity: .7; } }

    /* Header controls row — a breakout (expand) toggle sits left of the close
       button, matching the shared .wch-head layout. */
    .wch-head-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px;
      border: 0; border-radius: 50%; background: none; cursor: pointer; color: var(--text-muted);
      transition: background .14s ease, color .14s ease; }
    .wch-head-btn:hover { background: rgba(255,255,255,0.08); color: var(--text); }
    html:not(.dark) .wch-head-btn:hover { background: rgba(20,40,80,0.06); }
    .wch-head-btn .material-symbols-outlined { font-size: 19px; }

    /* Search row — pinned above the prompt list so long libraries can be
       filtered by keyword (mirrors the Turns / History search field: icon
       overlay with pointer-events:none, clear only when there is a query). */
    .wch-ask-search { position: relative; display: flex; align-items: center; margin: 0 12px 8px; }
    .wch-ask-search > .material-symbols-outlined { position: absolute; left: 11px; font-size: 18px; opacity: .5; pointer-events: none; }
    .wch-ask-search-input { width: 100%; height: 38px; box-sizing: border-box; padding: 0 32px 0 36px;
      border-radius: 999px; font: inherit; font-size: 13.5px; color: inherit; outline: none;
      background: rgba(20,40,80,0.04); border: 1px solid rgba(20,40,80,0.10);
      transition: border-color .15s ease, box-shadow .15s ease; }
    html.dark .wch-ask-search-input { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.12); }
    .wch-ask-search-input::placeholder { color: var(--text-subtle); opacity: .8; }
    .wch-ask-search-input:focus, .wch-ask-search:focus-within .wch-ask-search-input {
      border-color: var(--primary, #2F6DF6);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary, #2F6DF6) 18%, transparent); }
    .wch-ask-search-clear { position: absolute; right: 8px; width: 22px; height: 22px;
      border: 0; border-radius: 50%; background: transparent; color: inherit; cursor: pointer;
      display: none; align-items: center; justify-content: center; opacity: .6; }
    .wch-ask-search-clear:hover { background: rgba(20,40,80,0.08); color: var(--text); opacity: 1; }
    html.dark .wch-ask-search-clear:hover { background: rgba(255,255,255,0.12); }
    .wch-ask-search-clear .material-symbols-outlined { font-size: 16px; }
    .wch-ask-search.has-q .wch-ask-search-clear { display: flex; }

    /* "What can I ask?" header — serif title (like the docked module headers),
       and no leading icon in front of it. */
    .wch-ask-panel .wch-head-title { font-family: "WISE Digits", "Noto Serif", serif;
      font-weight: 800; font-size: 1.2rem; letter-spacing: -.01em; line-height: 1.16; }
    .wch-ask-panel .wch-head-title .material-symbols-outlined { display: none; }

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
    /* Filter chips read exactly like the transcript's intent chips (.chip /
       .ws-intent-chip): the composer's blue-tinted surface, --border-strong,
       muted text, regular weight — never a bold white pill. They live in the
       same scroller as the prompts so the whole catalog (intro, search, chips,
       cards) moves as one. */
    .wch-ask-toolbar { display: flex; flex-direction: column; gap: 8px; margin: 0 12px 8px; }
    .wch-ask-sort { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
    .wch-ask-filters { display: flex; flex-wrap: wrap; gap: 6px; }
    .wch-ask-filter { border: 1px solid var(--border-strong); background: color-mix(in srgb, var(--primary) 10%, #fff);
      color: var(--text-muted); border-radius: 999px; padding: 5px 13px; font-family: inherit;
      font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
      transition: background .14s ease, border-color .14s ease, color .14s ease; }
    .wch-ask-filter:hover { background: color-mix(in srgb, var(--primary) 16%, #fff);
      border-color: color-mix(in srgb, var(--primary) 40%, var(--border-strong)); color: var(--text); }
    html.dark .wch-ask-filter { background: color-mix(in srgb, var(--primary-bright, #8B9FAF) 14%, transparent); border-color: var(--primary); }
    html.dark .wch-ask-filter:hover { background: color-mix(in srgb, var(--primary-bright, #8B9FAF) 20%, transparent); color: var(--text); }
    .wch-ask-filter.is-active { background: var(--primary, #2F6DF6); border-color: var(--primary, #2F6DF6); color: #fff; font-weight: 600; }
    .wch-ask-filter.is-active:hover { background: color-mix(in srgb, var(--primary) 90%, #000);
      border-color: color-mix(in srgb, var(--primary) 90%, #000); color: #fff; }
    html.dark .wch-ask-filter.is-active { background: var(--primary); border-color: var(--primary); color: #fff; }
    .wch-ask-filter.is-empty { opacity: .45; }

    .wch-ask-group-desc { padding: 0 6px 12px; font-size: 13px; line-height: 1.5; opacity: .8; }

    .wch-ask-cap { border: 0; background: none; border-radius: 0; padding: 2px 6px 0; cursor: pointer; }
    html:not(.dark) .wch-ask-cap { border: 0; background: none; }
    .wch-ask-cap:hover { background: none; border: 0; }
    html:not(.dark) .wch-ask-cap:hover { background: none; border: 0; }
    .wch-ask-cap-head { display: flex; align-items: flex-start; gap: 11px; }
    .wch-ask-cap-ico { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;
      margin-top: 1px; background: none; color: var(--primary-ink, var(--primary, #2F6DF6)); }
    .wch-ask-cap-ico .material-symbols-outlined { font-size: 22px; }
    .wch-ask-cap-titles { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .wch-ask-cap-title { font-size: 15px; font-weight: 650; line-height: 1.35; }
    .wch-ask-cap-desc { font-size: 13px; line-height: 1.48; opacity: .8; }

    .wch-ask-prompts { display: flex; flex-direction: column; gap: 5px; margin: 10px 0 0; }
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
    .wch-ask-prompt-btn .material-symbols-outlined { font-size: 19px; font-variation-settings: 'FILL' 1; }
    @media (hover: none) { .wch-ask-prompt-btn { opacity: .85; } }

    .wch-ask-cap-tools { margin: 10px 0 0; padding-top: 9px; border-top: 1px dashed rgba(255,255,255,0.09);
      font-size: 12px; line-height: 1.5; opacity: .72; }
    html:not(.dark) .wch-ask-cap-tools { border-top-color: rgba(20,40,80,0.12); }
    .wch-ask-cap-tools b { font-weight: 700; text-transform: none; letter-spacing: 0; opacity: .95; }
    .wch-ask-cap-tools code { font-size: 11.5px; opacity: .95; }

    /* Clickable attachment thumbnails + the full-size image lightbox they open. */
    .fl-attach-thumb { cursor: zoom-in; }
    .wai-img-scrim { position: fixed; inset: 0; z-index: 4000; display: flex; align-items: stretch; justify-content: stretch;
      padding: 0; background: rgba(10,15,25,0.72); backdrop-filter: blur(3px);
      opacity: 0; transition: opacity .18s ease; }
    .wai-img-scrim.is-open { opacity: 1; }
    .wai-img-modal { position: relative; width: 100%; height: 100%; max-width: none; max-height: none; display: flex; flex-direction: column;
      background: var(--surface, #fff); border: 0; border-radius: 0;
      box-shadow: none; overflow: hidden; transform: translateY(8px); transition: transform .18s ease; }
    .wai-img-scrim.is-open .wai-img-modal { transform: none; }
    .wai-img-head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--border, rgba(0,0,0,.08)); }
    .wai-img-name { flex: 1 1 auto; min-width: 0; font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .wai-img-close { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; flex-shrink: 0;
      border: 0; border-radius: 50%; background: transparent; color: var(--text-subtle); cursor: pointer; transition: background .12s, color .12s; }
    .wai-img-close:hover { background: var(--surface-2); color: var(--text); }
    .wai-img-close .material-symbols-outlined { font-size: 20px; }
    .wai-img-body { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 16px; overflow: auto; background: var(--surface-2, #f2f4f7); }
    .wai-img-body img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; display: block; }

    /* "Background animation" (Admin) — the welcome-only ambient canvas of a
       rotating food-item DNA/RNA helix. On the chat card it is a full-container
       background (mounted on the card, behind welcome + composer). It never
       takes pointer input; it only fades in while live, and the welcome panel
       and composer rail drop their opaque fill so the strand reads behind
       the copy. --fill adds the vertical fade over the headline / chips /
       composer, leaving a visible sliver at the bottom edge. */
    .sc-bganim-canvas { position: absolute; inset: 0; width: 100%; height: 100%;
      z-index: 1; pointer-events: none; opacity: 0;
      transform: scale(1); transform-origin: 50% 36%;
      transition: opacity .55s ease; }
    .sc-bganim-live { position: relative; }
    .sc-bganim-canvas--fill { z-index: 0;
      --sc-fill-0: 1; --sc-fill-1: 1; --sc-fill-2: 0.22;
      --sc-fill-3: 0.08; --sc-fill-4: 0.06; --sc-fill-5: 0.28;
      -webkit-mask-image: linear-gradient(to bottom,
        rgb(0 0 0 / var(--sc-fill-0)) 0%, rgb(0 0 0 / var(--sc-fill-1)) 32%,
        rgb(0 0 0 / var(--sc-fill-2)) 48%, rgb(0 0 0 / var(--sc-fill-3)) 64%,
        rgb(0 0 0 / var(--sc-fill-4)) 82%, rgb(0 0 0 / var(--sc-fill-5)) 100%);
      mask-image: linear-gradient(to bottom,
        rgb(0 0 0 / var(--sc-fill-0)) 0%, rgb(0 0 0 / var(--sc-fill-1)) 32%,
        rgb(0 0 0 / var(--sc-fill-2)) 48%, rgb(0 0 0 / var(--sc-fill-3)) 64%,
        rgb(0 0 0 / var(--sc-fill-4)) 82%, rgb(0 0 0 / var(--sc-fill-5)) 100%); }
    .sc-bganim-live > .sc-body,
    .sc-bganim-live > .ap-chat-body { position: relative; z-index: 2; }
    .sc-bganim-live > .chat-input-rail { position: relative; z-index: 2; }
    /* Composer wash — the helix fade behind the typed text is a gradient
       whose strength is the Wash slider (0 = helix fully visible, 50 = the
       published Scene look, 100 = a heavier veil). The field itself becomes
       a vertical gradient so the strand can still read through the top. */
    .sc-bganim-live.sc-bganim-live .fl-input-wrap {
      background: linear-gradient(to top,
        color-mix(in srgb, var(--primary) calc(var(--sc-bganim-wash, 50) * 0.20%), #fff) 0%,
        color-mix(in srgb, var(--primary) calc(var(--sc-bganim-wash, 50) * 0.12%), #fff) 55%,
        color-mix(in srgb, var(--primary) calc(var(--sc-bganim-wash, 50) * 0.04%), transparent) 100%);
    }
    html.dark .sc-bganim-live.sc-bganim-live .fl-input-wrap {
      background: linear-gradient(to top,
        color-mix(in srgb, var(--primary-bright, #8B9FAF) calc(var(--sc-bganim-wash, 50) * 0.28%), transparent) 0%,
        color-mix(in srgb, var(--primary-bright, #8B9FAF) calc(var(--sc-bganim-wash, 50) * 0.16%), transparent) 55%,
        color-mix(in srgb, var(--primary-bright, #8B9FAF) calc(var(--sc-bganim-wash, 50) * 0.04%), transparent) 100%);
    }
    html.full-bleed.fb-chat-tint .sc-bganim-live .fl-input-wrap,
    html.full-bleed.dark.fb-chat-tint .sc-bganim-live .fl-input-wrap {
      background: linear-gradient(to top,
        color-mix(in srgb, var(--fb-chat-fg, #16233B) calc(var(--sc-bganim-wash, 50) * 0.20%), var(--fb-chat-bg)) 0%,
        color-mix(in srgb, var(--fb-chat-fg, #16233B) calc(var(--sc-bganim-wash, 50) * 0.10%), var(--fb-chat-bg)) 55%,
        color-mix(in srgb, var(--fb-chat-fg, #16233B) calc(var(--sc-bganim-wash, 50) * 0.03%), transparent) 100%) !important;
    }
    .sc-bganim-live .sc-bganim-canvas { opacity: 1; }
    /* Chip or first keystroke leaves by blooming out — fade + expand, never
       a collapse. Origin sits on the strand centre (getCenterY ≈ 0.36). */
    .sc-bganim-live.sc-bganim-leaving .sc-bganim-canvas {
      opacity: 0; transform: scale(1.55);
      transition: opacity 1.55s ease, transform 1.45s cubic-bezier(0.16, 1, 0.3, 1); }
    @media (prefers-reduced-motion: reduce) {
      .sc-bganim-live.sc-bganim-leaving .sc-bganim-canvas {
        transition: none; transform: none; }
    }
    .sc-bganim-live.sc-bganim-panning { cursor: grabbing; user-select: none; }
    /* The class is repeated to out-rank page-level skin rules such as
       html.chat-tint:not(.dark) #welcome-screen (product portfolio/comparison,
       an opaque 5%-blue wash with !important) — both rules carry !important,
       so only specificity decides, and without the boost the tint wash covers
       the canvas and the strand never shows in the light blue-chat theme.
       Full-bleed preset themes also paint .sc-welcome; include those
       selectors so Cyberpunk / Sunset Green / Blue Sky cannot hide the helix
       in light or dark. */
    .sc-bganim-live.sc-bganim-live.sc-bganim-live .sc-welcome,
    .sc-bganim-live.sc-bganim-live.sc-bganim-live #welcome-screen,
    .sc-bganim-live.sc-bganim-live.sc-bganim-live .chat-messages-area,
    .sc-bganim-live.sc-bganim-live.sc-bganim-live .chat-input-rail,
    html.full-bleed.fb-chat-tint .sc-bganim-live .sc-welcome,
    html.full-bleed.fb-chat-tint .sc-bganim-live #welcome-screen,
    html.full-bleed.fb-chat-tint .sc-bganim-live .chat-messages-area,
    html.full-bleed.fb-chat-tint .sc-bganim-live .chat-input-rail,
    html.full-bleed.fb-chat-tint .sc-orbit-live .sc-welcome,
    html.full-bleed.fb-chat-tint .sc-orbit-live #welcome-screen,
    html.full-bleed.fb-chat-tint.chat-tint .sc-bganim-live #welcome-screen,
    html.full-bleed.fb-chat-tint.chat-tint .sc-orbit-live #welcome-screen { background: transparent !important; }

    /* Opacity / wash / angle / camera / scale / shape controls that sit just under the
       Helix "Animation" toggle. Mirror the streaming-detail sub-row; admin
       pink accent matches the toggle. The rows share .sc-bganim-detail so they
       disable together. Angle, Camera, Pitch, Length, Thick, Rungs, Bar and Depth
       are helix-only (hidden while Orbit is selected); Scale, Nodes and Wash drive both
       fields. Dots (size, colour, motion of the small beads between product
       circles) are helix-only too. Pulse and Spark each keep their own Rate / Size
       knobs. Rungs / Bar are the cross-lines between the two strands. Wash is the
       gradient behind composer text. */
    .sc-bganim-detail { display: flex; align-items: center; gap: 10px;
      margin: 2px 12px 8px 42px; transition: opacity .15s ease; }
    .sc-bganim-detail-label { font-size: 8px; font-weight: 700; letter-spacing: 0.04em;
      text-transform: uppercase; color: var(--text-muted); white-space: nowrap;
      min-width: 38px; }
    .sc-bganim-opacity, .sc-bganim-wash-range, .sc-bganim-angle-range, .sc-bganim-camera-range, .sc-bganim-azimuth-range, .sc-bganim-shift-range, .sc-bganim-scale-range,
    .sc-bganim-knob-range, .sc-bganim-motion-knob-range, .sc-bganim-mat-range { flex: 1 1 auto; min-width: 54px; height: 4px; cursor: pointer;
      accent-color: rgb(219, 39, 119); }
    /* The master Scale row leads the three axes — a touch stronger so it reads
       as the one that moves them all. */
    .sc-bganim-scale-all .sc-bganim-detail-label,
    .sc-bganim-scale-all .sc-bganim-scale-val { color: var(--text); }
    .sc-bganim-opacity-val, .sc-bganim-wash-val, .sc-bganim-angle-val, .sc-bganim-camera-val, .sc-bganim-azimuth-val, .sc-bganim-shift-val, .sc-bganim-scale-val,
    .sc-bganim-knob-val, .sc-bganim-motion-knob-val, .sc-bganim-mat-val { font-size: 11px; font-weight: 700; color: var(--text-muted);
      width: 44px; text-align: right; font-variant-numeric: tabular-nums; }
    .sc-bganim-detail.is-disabled { opacity: .45; pointer-events: none; }
    .sc-bganim-detail[hidden] { display: none !important; }

    /* Playback control that sits just below the opacity row — a subtle (reduced
       opacity) pill that freezes / resumes the running field. Dims + locks along
       with the opacity slider while the animation toggle is off. */
    .sc-bganim-playback { display: flex; align-items: center; gap: 10px;
      margin: -4px 12px 8px 42px; opacity: .78; transition: opacity .15s ease; }
    .sc-bganim-playback:hover { opacity: 1; }
    .sc-bganim-playback-label { font-size: 8px; font-weight: 700; letter-spacing: 0.04em;
      text-transform: uppercase; color: var(--text-muted); white-space: nowrap; }
    .sc-bganim-pp { margin-left: auto; display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 11px; border: 1px solid var(--border, rgba(15,30,55,.12)); border-radius: 999px;
      background: transparent; color: var(--text-muted); font: inherit; font-size: 11px;
      font-weight: 700; cursor: pointer; transition: background .14s ease, color .14s ease, border-color .14s ease; }
    .sc-bganim-pp:hover { color: rgb(219, 39, 119);
      border-color: color-mix(in srgb, rgb(219, 39, 119) 45%, transparent);
      background: color-mix(in srgb, rgb(219, 39, 119) 10%, transparent); }
    .sc-bganim-pp .material-symbols-outlined { font-size: 16px; }
    /* Icon + label swap with the paused state (default markup shows "Pause"). */
    .sc-bganim-pp .sc-bganim-pp-play, .sc-bganim-pp.is-paused .sc-bganim-pp-pause { display: none; }
    .sc-bganim-pp.is-paused .sc-bganim-pp-play { display: inline-flex; align-items: center; gap: 6px; }
    .sc-bganim-pp-pause { display: inline-flex; align-items: center; gap: 6px; }
    .sc-bganim-playback.is-disabled { opacity: .45; pointer-events: none; }

    /* While the DNA field is live, the centre owl/pulse logo steps aside — the strand
       carries the owl instead. */
    .sc-bganim-live .ws-logo-wrap { display: none; }

    /* Owl constellation is Orbit-only. Helix is the load default — hide the
       welcome owl (and its JS web) unless Orbit is the shared style. Auth
       pages keep the owl; they have no helix field. data-chat-bg-style is
       set on <html> before first paint (text-size-fouc.js). */
    html:not([data-chat-bg-style="orbit"]) .sc-welcome .ws-logo-wrap,
    html:not([data-chat-bg-style="orbit"]) #welcome-screen .ws-logo-wrap { display: none !important; }
    .auth-page .sc-welcome .ws-logo-wrap,
    .auth-page #welcome-screen .ws-logo-wrap { display: flex !important; }

    /* Opaque welcome washes (light .sc-welcome, page-level chat-tint
       #welcome-screen, full-bleed tint) hide the helix canvas. Keep the
       sheet clear whenever Helix / Ten is the style. */
    html.chat-tint:not(.dark):not([data-chat-bg-style="orbit"]) .sc-welcome,
    html.chat-tint:not(.dark):not([data-chat-bg-style="orbit"]) #welcome-screen,
    html.full-bleed.fb-chat-tint:not([data-chat-bg-style="orbit"]) .sc-welcome,
    html.full-bleed.fb-chat-tint:not([data-chat-bg-style="orbit"]) #welcome-screen,
    html.full-bleed.fb-chat-tint.chat-tint:not([data-chat-bg-style="orbit"]) #welcome-screen {
      background: transparent !important;
    }

    /* "Style" segment (Helix / Ten / Orbit) — the row under the Opacity / Angle /
       Scale / shape sliders that picks WHICH ambient field runs. Mirrors the streaming
       "detail" segment; dims + locks with the toggle like the slider rows. */
    .sc-bganim-style { display: flex; align-items: center; gap: 10px;
      margin: -2px 12px 8px 42px; transition: opacity .15s ease; }
    .sc-bganim-style-label { font-size: 8px; font-weight: 700; letter-spacing: 0.04em;
      text-transform: uppercase; color: var(--text-muted); white-space: nowrap; }
    .sc-bganim-style .sc-stream-seg { margin-left: auto; }
    .sc-bganim-style .sc-stream-seg-btn { font-size: 10.5px; }
    .sc-bganim-style.is-disabled { opacity: .45; pointer-events: none; }

    /* Little beads between the product circles — colour swatch + motion segment.
       Helix-only; they hide with Pitch / Thick while Orbit is selected. */
    .sc-bganim-dots-color { gap: 8px; }
    .sc-bganim-dots-color-input {
      flex: 0 0 auto; width: 30px; height: 18px; padding: 0;
      border: 1px solid var(--border-strong, rgba(15,30,55,.18)); border-radius: 6px;
      background: transparent; cursor: pointer; overflow: hidden;
    }
    .sc-bganim-dots-color-input::-webkit-color-swatch-wrapper { padding: 0; }
    .sc-bganim-dots-color-input::-webkit-color-swatch { border: 0; border-radius: 4px; }
    .sc-bganim-dots-color-input::-moz-color-swatch { border: 0; border-radius: 4px; }
    .sc-bganim-dots-actions { margin-left: auto; display: flex; align-items: center; gap: 10px; }
    .sc-bganim-dots-match, .sc-bganim-dots-reset, .sc-bganim-rungs-match {
      padding: 0; border: 0; background: none;
      color: rgb(219, 39, 119); font: inherit; font-size: 11px; font-weight: 700;
      cursor: pointer; white-space: nowrap;
    }
    .sc-bganim-dots-match:hover, .sc-bganim-dots-reset:hover,
    .sc-bganim-rungs-match:hover { text-decoration: underline; }
    .sc-bganim-dots-match.is-on, .sc-bganim-dots-reset.is-on,
    .sc-bganim-rungs-match.is-on { opacity: .42; pointer-events: none; text-decoration: none; }
    html.dark .sc-bganim-dots-match, html.dark .sc-bganim-dots-reset,
    html.dark .sc-bganim-rungs-match { color: #f9a8d4; }
    .sc-bganim-knob-rungs.is-matched .sc-bganim-knob-val { width: auto; min-width: 38px; }
    .sc-bganim-rungs-match { flex: 0 0 auto; margin-left: 2px; }
    .sc-bganim-subhead {
      padding: 4px 12px 0; font-size: 8px; letter-spacing: 0.06em; font-weight: 700;
      text-transform: uppercase; color: var(--text-subtle);
    }
    .sc-bganim-subhead[hidden] { display: none !important; }
    .sc-bganim-motion-knob[hidden] { display: none !important; }
    .sc-bganim-dots-motion, .sc-bganim-spin, .sc-bganim-look, .sc-bganim-snapshots { display: flex; align-items: center; gap: 10px;
      margin: 2px 12px 8px 42px; transition: opacity .15s ease; }
    .sc-bganim-dots-motion[hidden], .sc-bganim-spin[hidden], .sc-bganim-look[hidden], .sc-bganim-snapshots[hidden] { display: none !important; }
    .sc-bganim-snap-list { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; flex: 1 1 auto; min-width: 0; }
    .sc-bganim-snap-chip { display: inline-flex; align-items: center; gap: 0; }
    .sc-bganim-snap-chip .sc-stream-seg-btn { margin: 0; }
    .sc-bganim-snap-save {
      padding: 0; border: 0; background: none; margin-left: auto;
      color: rgb(219, 39, 119); font: inherit; font-size: 11px; font-weight: 700;
      cursor: pointer; white-space: nowrap;
    }
    .sc-bganim-snap-save:hover { text-decoration: underline; }
    html.dark .sc-bganim-snap-save { color: #f9a8d4; }
    .sc-bganim-snap-del {
      display: inline-flex; align-items: center; justify-content: center;
      width: 16px; height: 16px; padding: 0; margin-left: 1px; border: 0; border-radius: 50%;
      background: transparent; color: var(--text-subtle); cursor: pointer;
    }
    .sc-bganim-snap-del .material-symbols-outlined { font-size: 13px !important; line-height: 1 !important; }
    .sc-bganim-snap-del:hover { color: var(--text); }
    .sc-bganim-dots-motion .sc-bganim-style-label,
    .sc-bganim-spin .sc-bganim-style-label,
    .sc-bganim-look .sc-bganim-style-label { min-width: 38px; }
    .sc-bganim-dots-motion .sc-stream-seg,
    .sc-bganim-spin .sc-stream-seg,
    .sc-bganim-look .sc-stream-seg { margin-left: auto; }
    .sc-bganim-dots-motion .sc-stream-seg-btn,
    .sc-bganim-spin .sc-stream-seg-btn,
    .sc-bganim-look .sc-stream-seg-btn { font-size: 10.5px; }
    .sc-bganim-dots-motion.is-disabled, .sc-bganim-spin.is-disabled, .sc-bganim-look.is-disabled { opacity: .45; pointer-events: none; }

    /* ── Grouped chat three-dot menu ─────────────────────────────────────────
       Member-facing cards (Conversation, Helix play/pause, Activity, Close)
       stack in ONE column so the menu hangs from the kebab instead of
       spanning two tracks. Internal-admins on reveals the full Helix studio
       in a second column beside that stack; applyChatMenuAdminGate() then
       re-pins the popover so its right edge stays on the trigger. Width is
       max-content so hiding Admin-badged groups (and their empty columns)
       shrinks the panel instead of leaving blank tracks. Flex (not CSS
       column-width) keeps hit-testing honest. groupifyChatMenu() reorganizes
       the flat rows into these cards and tags the popover with
       .sc-menu-grouped. Scrolls if it would run off screen. */
    .topbar-popover.sc-menu-grouped {
      width: max-content; min-width: 0; max-width: min(920px, calc(100vw - 16px));
      padding: 8px;
      align-items: start; gap: 8px;
      max-height: min(82vh, calc(100vh - 16px));
      overflow-x: hidden; overflow-y: auto;
      pointer-events: auto;
    }
    /* Flex only while shown — .sc-menu-grouped { display:flex } would tie
       .topbar-popover.hidden { display:none } (same specificity, later sheet
       wins) and the menu could never close after the first open. */
    .topbar-popover.sc-menu-grouped:not(.hidden) {
      display: flex; flex-direction: row; flex-wrap: nowrap;
    }
    .topbar-popover.sc-menu-grouped.hidden { display: none; }
    .sc-menu-col { flex: 0 0 250px; width: 250px; min-width: 0; max-width: 300px; min-height: 0; display: flex; flex-direction: column; gap: 8px; }
    .sc-menu-col--helix {
      flex: 0 1 320px; width: 320px; min-width: 240px; min-height: 0; max-width: 420px;
      overflow: visible;
    }
    .sc-menu-group {
      display: block; margin: 0; padding: 2px 0 6px; overflow: visible; min-width: 0;
      border: 1px solid var(--border); border-radius: 12px; background: var(--surface-2);
    }
    html.dark .sc-menu-group { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.09); }
    .sc-menu-group-head {
      padding: 8px 12px 4px; font-size: 11px; letter-spacing: 0.08em; font-weight: 700;
      text-transform: uppercase; color: var(--text-subtle);
    }
    /* Rows sit flush within their card; the card border replaces the old dividers. */
    .sc-menu-grouped .topbar-menu-item { margin: 0 4px; width: calc(100% - 8px); border-radius: 9px; padding: 6px 7px; gap: 6px; align-items: center; }
    .sc-menu-grouped .topbar-menu-icon { font-size: 17px !important; }
    .sc-menu-grouped .topbar-menu-divider { display: none; }
    /* In the ~206px column the label must flex + wrap so the Admin badge and the
       switch never overlap it (they stay pinned right, vertically centered). */
    .sc-menu-grouped .topbar-menu-item > span:not(.topbar-menu-icon):not(.topbar-menu-badge):not(.sc-switch) {
      flex: 1 1 auto; min-width: 0; line-height: 1.2;
      white-space: normal; overflow-wrap: anywhere;
    }
    /* Two-line Admin rows: title on top, a 3–5 word hint underneath. The
       wrap claims the leftover width so the badge + switch stay pinned right. */
    .topbar-menu-copy { display: flex; flex-direction: column; align-items: flex-start; justify-content: center;
      gap: 1px; min-width: 0; }
    .topbar-menu-title { display: block; line-height: 1.2; }
    .topbar-menu-desc { display: block; font-size: 10px; font-weight: 500; line-height: 1.25;
      letter-spacing: 0; text-transform: none; color: var(--text-muted); }
    .topbar-menu-item--admin .topbar-menu-desc { color: var(--text-muted); }
    html.dark .topbar-menu-desc,
    html.dark .topbar-menu-item--admin .topbar-menu-desc { color: var(--text-muted); }
    .sc-menu-grouped .topbar-menu-item:has(.topbar-menu-desc) { padding-top: 7px; padding-bottom: 7px; }
    .sc-menu-grouped .topbar-menu-badge { margin-left: 3px; margin-right: 2px; padding: 1px 3px; font-size: 7px; letter-spacing: 0.02em; }
    /* Trim the toggle switch to reclaim row width for the label. */
    .sc-menu-grouped .sc-switch { width: 28px; height: 16px; }
    .sc-menu-grouped .sc-switch::after { width: 12px; height: 12px; }
    .sc-menu-grouped .sc-mcp-item.is-on .sc-switch::after { transform: translateX(12px); }
    /* Helix grows into leftover popover width. Sliders sit two-up on one
       line (label | track | value). Segment rows (Style / Motion / Playback)
       still span. Hints stay on the control titles so they don't stack rows. */
    .sc-menu-grouped .sc-bganim-detail { margin: 1px 8px 3px 10px; min-width: 0; }
    .sc-menu-grouped .sc-bganim-style { margin: 0 10px 6px 12px; min-width: 0; }
    .sc-menu-grouped .sc-bganim-dots-motion,
    .sc-menu-grouped .sc-bganim-spin,
    .sc-menu-grouped .sc-bganim-look,
    .sc-menu-grouped .sc-bganim-snapshots { margin: 0 8px 4px 10px; min-width: 0; }
    .sc-menu-grouped .sc-bganim-playback { margin: 0 10px 4px 12px; min-width: 0; }
    .sc-menu-grouped .sc-bganim-subhead { padding: 3px 10px 0; }
    .sc-menu-grouped .sc-stream-detail { margin: 4px 12px 6px 14px; }
    .sc-menu-grouped .sc-bganim-detail-label,
    .sc-menu-grouped .sc-bganim-style-label,
    .sc-menu-grouped .sc-bganim-playback-label { min-width: 38px; font-size: 10px; letter-spacing: 0.04em; }
    .sc-menu-group--helix > .sc-menu-group-head,
    .sc-menu-group--background > .sc-menu-group-head { font-size: 9px; letter-spacing: 0.06em; padding: 4px 8px 2px; }
    .sc-menu-grouped .sc-bganim-opacity-val, .sc-menu-grouped .sc-bganim-wash-val, .sc-menu-grouped .sc-bganim-angle-val,
    .sc-menu-grouped .sc-bganim-camera-val, .sc-menu-grouped .sc-bganim-azimuth-val, .sc-menu-grouped .sc-bganim-shift-val, .sc-menu-grouped .sc-bganim-scale-val,
    .sc-menu-grouped .sc-bganim-knob-val, .sc-menu-grouped .sc-bganim-motion-knob-val, .sc-menu-grouped .sc-bganim-mat-val {
      font-size: 10px; width: 40px;
    }
    .sc-menu-grouped .sc-bganim-opacity,
    .sc-menu-grouped .sc-bganim-wash-range,
    .sc-menu-grouped .sc-bganim-angle-range,
    .sc-menu-grouped .sc-bganim-camera-range,
    .sc-menu-grouped .sc-bganim-azimuth-range,
    .sc-menu-grouped .sc-bganim-shift-range,
    .sc-menu-grouped .sc-bganim-scale-range,
    .sc-menu-grouped .sc-bganim-knob-range,
    .sc-menu-grouped .sc-bganim-motion-knob-range,
    .sc-menu-grouped .sc-bganim-mat-range {
      min-width: 64px; max-width: none; flex: 1 1 80px; height: 4px;
      -webkit-appearance: none; appearance: none;
      background: color-mix(in srgb, rgb(219, 39, 119) 38%, var(--border));
      border-radius: 999px;
    }
    .sc-menu-grouped input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none; appearance: none;
      width: 10px; height: 10px; border-radius: 50%;
      background: rgb(219, 39, 119); border: 0; cursor: pointer;
    }
    .sc-menu-grouped input[type="range"]::-moz-range-thumb {
      width: 10px; height: 10px; border-radius: 50%;
      background: rgb(219, 39, 119); border: 0; cursor: pointer;
    }
    .sc-menu-grouped .sc-bganim-style .sc-stream-seg,
    .sc-menu-grouped .sc-bganim-dots-motion .sc-stream-seg,
    .sc-menu-grouped .sc-bganim-spin .sc-stream-seg,
    .sc-menu-grouped .sc-bganim-look .sc-stream-seg {
      width: auto; flex: 1 1 auto; min-width: 0; margin-left: auto;
    }
    .sc-menu-group--helix, .sc-menu-group--background {
      display: flex; flex-direction: column; gap: 8px; align-items: stretch;
      min-width: 0; overflow: visible; max-height: none;
    }
    .sc-menu-group--helix { padding: 2px 4px 8px; }
    .sc-menu-group--helix > *, .sc-menu-group--background > * { min-width: 0; }
    .sc-menu-group--helix > .topbar-menu-item { margin: 0 4px 2px; width: calc(100% - 8px); padding: 3px 6px; }
    .sc-menu-grouped .sc-menu-group--helix > .topbar-menu-item:has(.topbar-menu-desc) { padding-top: 3px; padding-bottom: 3px; }
    .sc-menu-group--helix .topbar-menu-desc { display: none; }
    /* Each helix section (Load / Look / Finish / View / …) is its own card
       with breathing room around it — not a flat stack of sliders. */
    .sc-bganim-cluster {
      display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 5px 10px; align-items: center;
      margin: 0 2px; padding: 8px 10px 10px;
      border: 1px solid var(--border, rgba(15,30,55,.10)); border-radius: 10px;
      background: color-mix(in srgb, var(--surface, #fff) 88%, transparent);
      min-width: 0;
    }
    .sc-bganim-cluster--span { grid-template-columns: minmax(0, 1fr); }
    .sc-bganim-cluster:not(:has(.sc-bganim-subhead)) { grid-template-columns: minmax(0, 1fr); }
    html.dark .sc-bganim-cluster {
      background: rgba(255,255,255,0.035);
      border-color: rgba(255,255,255,0.10);
    }
    .sc-bganim-cluster[hidden] { display: none !important; }
    .sc-bganim-cluster > * { min-width: 0; }
    .sc-bganim-cluster > .sc-bganim-subhead {
      grid-column: 1 / -1; padding: 0 0 5px; margin: 0 0 2px;
      font-size: 8px; letter-spacing: 0.08em;
      border-bottom: 1px solid var(--border, rgba(15,30,55,.10));
    }
    html.dark .sc-bganim-cluster > .sc-bganim-subhead { border-bottom-color: rgba(255,255,255,0.10); }
    .sc-bganim-cluster > .sc-bganim-style,
    .sc-bganim-cluster > .sc-bganim-look,
    .sc-bganim-cluster > .sc-bganim-dots-color,
    .sc-bganim-cluster > .sc-bganim-dots-motion,
    .sc-bganim-cluster > .sc-bganim-playback,
    .sc-bganim-cluster > .sc-bganim-spin,
    .sc-bganim-cluster > .sc-bganim-snapshots {
      grid-column: 1 / -1;
    }
    .sc-bganim-cluster > .sc-bganim-detail,
    .sc-bganim-cluster > .sc-bganim-style,
    .sc-bganim-cluster > .sc-bganim-look,
    .sc-bganim-cluster > .sc-bganim-dots-motion,
    .sc-bganim-cluster > .sc-bganim-spin,
    .sc-bganim-cluster > .sc-bganim-playback,
    .sc-bganim-cluster > .sc-bganim-snapshots {
      margin: 0; padding: 1px 0; flex-wrap: nowrap; gap: 4px 6px; align-items: center;
    }
    .sc-bganim-cluster > .sc-bganim-look .sc-stream-seg,
    .sc-bganim-cluster > .sc-bganim-snapshots .sc-bganim-snap-list {
      margin-left: 0; flex: 1 1 auto;
    }
    .sc-bganim-copy {
      display: flex; flex-direction: column; align-items: flex-start; justify-content: center;
      gap: 1px; min-width: 0; max-width: none; flex: 1 1 100%;
    }
    .sc-menu-group--helix .sc-bganim-copy { flex: 0 0 auto; }
    .sc-menu-group--helix .sc-bganim-hint { display: none; }
    .sc-bganim-hint {
      display: block; font-size: 7.5px; font-weight: 500; line-height: 1.2;
      letter-spacing: 0; text-transform: none; color: var(--text-muted);
    }
    html.dark .sc-bganim-hint { color: var(--text-muted); }
    .sc-bganim-cluster > .sc-bganim-detail[hidden],
    .sc-bganim-cluster > .sc-bganim-spin[hidden],
    .sc-bganim-cluster > .sc-bganim-look[hidden],
    .sc-bganim-cluster > .sc-bganim-dots-motion[hidden],
    .sc-bganim-cluster > .sc-bganim-subhead[hidden],
    .sc-bganim-cluster > .sc-bganim-motion-knob[hidden] { display: none !important; }
    .sc-menu-group--helix .sc-bganim-rungs-match,
    .sc-menu-group--helix .sc-bganim-dots-match,
    .sc-menu-group--helix .sc-bganim-dots-reset { font-size: 9px; }
    .sc-menu-group--helix .sc-bganim-dots-actions { gap: 6px; }
    .sc-menu-group--helix .sc-stream-seg-btn { font-size: 9.5px; padding: 0 5px; height: 22px; }
    .sc-menu-group--helix .sc-bganim-pp { padding: 2px 8px; font-size: 10px; }
    .sc-menu-group--helix .sc-bganim-pp .material-symbols-outlined { font-size: 14px; }
    .sc-menu-group--helix .sc-bganim-dots-color-input { width: 24px; height: 16px; }
    .sc-menu-group--helix .sc-bganim-detail-label,
    .sc-menu-group--helix .sc-bganim-style-label,
    .sc-menu-group--helix .sc-bganim-playback-label { min-width: 32px; font-size: 9px; }
    .sc-menu-group--helix .sc-bganim-opacity-val,
    .sc-menu-group--helix .sc-bganim-wash-val,
    .sc-menu-group--helix .sc-bganim-angle-val,
    .sc-menu-group--helix .sc-bganim-camera-val,
    .sc-menu-group--helix .sc-bganim-azimuth-val,
    .sc-menu-group--helix .sc-bganim-shift-val,
    .sc-menu-group--helix .sc-bganim-scale-val,
    .sc-menu-group--helix .sc-bganim-knob-val,
    .sc-menu-group--helix .sc-bganim-motion-knob-val,
    .sc-menu-group--helix .sc-bganim-mat-val { font-size: 9px; width: 34px; }
    .sc-menu-group--helix .sc-bganim-opacity,
    .sc-menu-group--helix .sc-bganim-wash-range,
    .sc-menu-group--helix .sc-bganim-angle-range,
    .sc-menu-group--helix .sc-bganim-camera-range,
    .sc-menu-group--helix .sc-bganim-azimuth-range,
    .sc-menu-group--helix .sc-bganim-shift-range,
    .sc-menu-group--helix .sc-bganim-scale-range,
    .sc-menu-group--helix .sc-bganim-knob-range,
    .sc-menu-group--helix .sc-bganim-motion-knob-range,
    .sc-menu-group--helix .sc-bganim-mat-range { min-width: 36px; height: 3px; }
    .sc-menu-group--helix .sc-bganim-row-icon { display: none; }
    .sc-menu-group--helix .sc-bganim-snap-save { font-size: 9px; }
    .sc-menu-group--helix .sc-bganim-snap-del { width: 14px; height: 14px; }
    .sc-menu-group--helix > .sc-menu-group-head {
      display: flex; align-items: center; gap: 4px;
      padding: 4px 4px 2px 8px;
    }
    .sc-helix-head-label { flex: 1 1 auto; min-width: 0; }
    .sc-helix-head-actions { flex: 0 0 auto; display: inline-flex; align-items: center; }
    .sc-helix-drag { display: none; }
    .sc-helix-pop-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 22px; height: 22px; padding: 0; border: 0; border-radius: 50%;
      background: transparent; color: var(--text-subtle); cursor: pointer;
      opacity: 0.78; transition: background .15s ease, color .15s ease, opacity .15s ease;
    }
    .sc-helix-pop-btn .material-symbols-outlined { font-size: 15px !important; line-height: 1 !important; }
    .sc-helix-pop-btn:hover { opacity: 1; color: var(--text); background: var(--surface-3); }
    html.dark .sc-helix-pop-btn:hover { background: rgba(255,255,255,0.07); }
    .sc-helix-dock { display: none; }
    .sc-helix-float .sc-helix-popout { display: none; }
    .sc-helix-float .sc-helix-dock { display: inline-flex; }
    body[data-helix-studio] .sc-helix-float .sc-helix-dock,
    .sc-helix-float[data-helix-studio] .sc-helix-dock,
    body[data-helix-studio] .sc-helix-float .sc-helix-head-actions,
    .sc-helix-float[data-helix-studio] .sc-helix-head-actions { display: none; }
    .sc-helix-float {
      position: fixed; z-index: 2147483600;
      width: min(460px, calc(100vw - 24px));
      min-width: min(460px, calc(100vw - 24px));
      max-height: min(86vh, calc(100vh - 16px));
      overflow-x: hidden; overflow-y: auto;
      padding: 8px; box-sizing: border-box;
      background: var(--surface-2);
      border: 1px solid var(--border-strong);
      border-radius: 14px; box-shadow: var(--shadow-card);
      pointer-events: auto;
    }
    html.dark .sc-helix-float {
      background: linear-gradient(155deg, #1A2339 0%, #1A2339 60%, #1A2339 100%);
      border-color: rgba(37, 80, 124, 0.22);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
    }
    .sc-helix-float .sc-menu-col--helix {
      flex: none; width: 100%; min-width: 0; max-width: none; overflow: visible;
    }
    .sc-helix-float .sc-menu-group--helix > .sc-menu-group-head {
      cursor: grab; user-select: none; touch-action: none;
      position: sticky; top: -8px; z-index: 2;
      flex-wrap: wrap;
      margin: -8px -8px 6px; padding: 8px 10px 10px;
      background: var(--surface-2);
      border-bottom: 1px solid var(--border);
      font-size: 11px; letter-spacing: 0.08em;
    }
    html.dark .sc-helix-float .sc-menu-group--helix > .sc-menu-group-head { background: #1A2339; }
    .sc-helix-float .sc-helix-grabber-pill {
      flex: 1 1 100%; display: flex; align-items: center; justify-content: center;
      height: 12px; margin: 0 0 4px; pointer-events: none;
    }
    .sc-helix-float .sc-helix-grabber-pill::before {
      content: ''; width: 44px; height: 5px; border-radius: 999px;
      background: var(--text-muted); opacity: 0.55;
    }
    .sc-helix-float .sc-helix-drag {
      display: inline-flex; align-items: center; justify-content: center;
      flex: 0 0 auto; width: 24px; height: 24px; color: var(--text-muted);
      pointer-events: none;
    }
    .sc-helix-float .sc-helix-drag .material-symbols-outlined {
      font-size: 22px !important; line-height: 1 !important;
    }
    .sc-helix-float.is-dragging .sc-menu-group--helix > .sc-menu-group-head { cursor: grabbing; }
    .sc-helix-float.is-dragging { user-select: none; }
    .sc-helix-float .sc-menu-group--helix .sc-bganim-detail-label,
    .sc-helix-float .sc-menu-group--helix .sc-bganim-style-label,
    .sc-helix-float .sc-menu-group--helix .sc-bganim-playback-label {
      min-width: 52px; font-size: 10px;
    }
    .sc-helix-float .sc-menu-group--helix .sc-bganim-opacity-val,
    .sc-helix-float .sc-menu-group--helix .sc-bganim-wash-val,
    .sc-helix-float .sc-menu-group--helix .sc-bganim-angle-val,
    .sc-helix-float .sc-menu-group--helix .sc-bganim-camera-val,
    .sc-helix-float .sc-menu-group--helix .sc-bganim-azimuth-val,
    .sc-helix-float .sc-menu-group--helix .sc-bganim-shift-val,
    .sc-helix-float .sc-menu-group--helix .sc-bganim-scale-val,
    .sc-helix-float .sc-menu-group--helix .sc-bganim-knob-val,
    .sc-helix-float .sc-menu-group--helix .sc-bganim-motion-knob-val,
    .sc-helix-float .sc-menu-group--helix .sc-bganim-mat-val { width: 42px; font-size: 10px; }
    .sc-helix-studio-bar {
      position: sticky; bottom: 0; z-index: 2;
      display: flex; align-items: center; justify-content: flex-end; gap: 8px;
      margin: 8px -8px 0; padding: 10px 10px 4px;
      background: var(--surface-2);
      border-top: 1px solid var(--border);
    }
    html.dark .sc-helix-studio-bar { background: #1A2339; }
    .sc-helix-float .sc-helix-studio-bar { margin: 10px -8px 0; padding: 10px 8px 2px; }
    .sc-helix-undo, .sc-helix-save {
      display: inline-flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; padding: 0; border-radius: 50%;
      border: 1.5px solid color-mix(in srgb, var(--primary) 34%, #B8BFC8);
      background: var(--surface, #fff); color: var(--text);
      cursor: pointer;
      transition: background .15s ease, color .15s ease, border-color .15s ease, opacity .15s ease;
    }
    html.dark .sc-helix-undo, html.dark .sc-helix-save {
      background: #E8EEF6; border-color: transparent; color: #0E1824;
    }
    .sc-helix-undo:hover:not(:disabled),
    .sc-helix-save:hover:not(:disabled) { background: var(--surface-3); }
    html.dark .sc-helix-undo:hover:not(:disabled),
    html.dark .sc-helix-save:hover:not(:disabled) { background: #F3F6FA; }
    .sc-helix-undo .material-symbols-outlined,
    .sc-helix-save .material-symbols-outlined { font-size: 20px !important; line-height: 1 !important; }
    .sc-helix-apply {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      height: 36px; padding: 0 14px; border-radius: 999px;
      font: inherit; font-size: 12px; font-weight: 700; cursor: pointer;
      transition: background .15s ease, color .15s ease, opacity .15s ease;
    }
    .sc-helix-apply .material-symbols-outlined { font-size: 18px !important; line-height: 1 !important; }
    .sc-helix-apply.btn-primary {
      border: 0; background: var(--primary); color: #fff;
    }
    .sc-helix-apply.btn-primary .material-symbols-outlined {
      font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }
    .sc-helix-undo:disabled, .sc-helix-save:disabled {
      color: var(--text-muted); cursor: default; pointer-events: none;
    }
    html.dark .sc-helix-undo:disabled, html.dark .sc-helix-save:disabled { color: #5A6B80; }
    .sc-helix-apply:disabled { cursor: default; pointer-events: none; }

    /* Nested Admin popover — a kebab in the grouped menu's top-right opens a
       small card with the master "Admin controls" switch. That kebab is
       admin chrome: it hides with Internal admins, so the member-facing
       menu never shows it. Off also hides every Admin-badged row (and chrome
       that belongs to one) so the menu shows only member items plus Helix
       play/pause. Trigger is a full circle, never a tile. */
    .topbar-popover.sc-menu-grouped { position: relative; }
    .sc-menu-admin-wrap { position: absolute; top: 4px; right: 4px; z-index: 3; }
    .topbar-popover.sc-menu-admin-off .sc-menu-admin-wrap { display: none !important; }
    .topbar-popover.sc-menu-admin-off.sc-menu-grouped > .sc-menu-col--trail > .sc-menu-group:first-child > .sc-menu-group-head {
      padding-right: 12px;
    }
    .sc-menu-admin-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; padding: 0; border: 0; border-radius: 50%;
      background: transparent; color: var(--text-subtle); cursor: pointer;
      opacity: 0.78; transition: background .15s ease, color .15s ease, opacity .15s ease;
    }
    .sc-menu-admin-btn .material-symbols-outlined { font-size: 18px !important; line-height: 1 !important; }
    .sc-menu-admin-btn:hover { opacity: 1; color: var(--text); background: var(--surface-3); }
    .sc-menu-admin-btn.is-open,
    .sc-menu-admin-btn.is-admin-on { opacity: 1; color: rgb(219, 39, 119); }
    .sc-menu-admin-btn.is-open { background: rgba(236, 72, 153, 0.14); }
    html.dark .sc-menu-admin-btn:hover { background: rgba(255,255,255,0.07); }
    html.dark .sc-menu-admin-btn.is-open { background: rgba(236, 72, 153, 0.18); }
    .sc-menu-grouped > .sc-menu-col--trail > .sc-menu-group:first-child > .sc-menu-group-head {
      padding-right: 36px;
    }
    .sc-admin-pop {
      position: fixed; min-width: 228px; padding: 6px; z-index: 2147483646;
      background: var(--surface-2); border: 1px solid var(--border-strong);
      border-radius: 14px; box-shadow: var(--shadow-card);
    }
    .sc-admin-pop.hidden { display: none; }
    html.dark .sc-admin-pop {
      background: linear-gradient(155deg, #1A2339 0%, #1A2339 60%, #1A2339 100%);
      border-color: rgba(37, 80, 124, 0.22);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
    }
    .sc-admin-pop::before, .sc-admin-pop::after { content: ''; position: absolute; pointer-events: none; }
    .sc-admin-pop:not(.is-side)::before {
      top: 100%; right: 10px; border: 6px solid transparent; border-top-color: var(--border-strong);
    }
    .sc-admin-pop:not(.is-side)::after {
      top: 100%; right: 11px; transform: translateY(-1px);
      border: 5px solid transparent; border-top-color: var(--surface-2);
    }
    html.dark .sc-admin-pop:not(.is-side)::after { border-top-color: #1A2339; }
    .sc-admin-pop.is-side-left::before {
      top: 50%; right: -6px; transform: translateY(-50%);
      border: 6px solid transparent; border-left-color: var(--border-strong);
    }
    .sc-admin-pop.is-side-left::after {
      top: 50%; right: -4px; transform: translateY(-50%);
      border: 5px solid transparent; border-left-color: var(--surface-2);
    }
    html.dark .sc-admin-pop.is-side-left::after { border-left-color: #1A2339; }
    .sc-admin-pop.is-side-right::before {
      top: 50%; left: -6px; transform: translateY(-50%);
      border: 6px solid transparent; border-right-color: var(--border-strong);
    }
    .sc-admin-pop.is-side-right::after {
      top: 50%; left: -4px; transform: translateY(-50%);
      border: 5px solid transparent; border-right-color: var(--surface-2);
    }
    html.dark .sc-admin-pop.is-side-right::after { border-right-color: #1A2339; }
    .sc-admin-pop .topbar-menu-item { margin: 0; width: 100%; border-radius: 9px; padding: 6px 7px; gap: 6px; }
    .sc-admin-pop .topbar-menu-icon { font-size: 17px !important; }
    .topbar-popover.sc-menu-admin-off .topbar-menu-item--admin,
    .topbar-popover.sc-menu-admin-off .topbar-menu-item:has(.topbar-menu-badge),
    .topbar-popover.sc-menu-admin-off [data-admin-item],
    .topbar-popover.sc-menu-admin-off .sc-bganim-detail,
    .topbar-popover.sc-menu-admin-off .sc-bganim-style,
    .topbar-popover.sc-menu-admin-off .sc-bganim-dots-motion,
    .topbar-popover.sc-menu-admin-off .sc-bganim-spin,
    .topbar-popover.sc-menu-admin-off .sc-bganim-look,
    .topbar-popover.sc-menu-admin-off .sc-bganim-snapshots,
    .topbar-popover.sc-menu-admin-off .sc-bganim-subhead,
    .topbar-popover.sc-menu-admin-off .sc-bganim-cluster:not(:has(.sc-bganim-playback)),
    .topbar-popover.sc-menu-admin-off .sc-bganim-cluster > :not(.sc-bganim-playback),
    .topbar-popover.sc-menu-admin-off .sc-actside-detail,
    .topbar-popover.sc-menu-admin-off .topbar-menu-badge { display: none !important; }
    /* Member-facing Helix card is play/pause only — sit it in the same
       column as Conversation, drop the studio chrome, and let the row
       read like the other member items. */
    .topbar-popover.sc-menu-admin-off .sc-menu-group--helix { padding: 2px 0 6px; }
    .topbar-popover.sc-menu-admin-off .sc-menu-group--helix > .sc-menu-group-head {
      font-size: 11px; letter-spacing: 0.08em; padding: 8px 12px 4px;
    }
    .topbar-popover.sc-menu-admin-off .sc-helix-head-actions,
    .topbar-popover.sc-menu-admin-off .sc-helix-drag,
    .topbar-popover.sc-menu-admin-off .sc-helix-grabber-pill { display: none !important; }
    .topbar-popover.sc-menu-admin-off .sc-menu-group--helix .sc-bganim-cluster:has(.sc-bganim-playback) {
      display: block; margin: 0; padding: 0; border: 0; background: transparent;
    }
    .topbar-popover.sc-menu-admin-off .sc-menu-group--helix .sc-bganim-playback {
      margin: 0 4px 6px; width: calc(100% - 8px); padding: 6px 7px;
    }
    .topbar-popover.sc-menu-admin-off .sc-menu-group--helix .sc-bganim-playback-label {
      min-width: 0; font-size: 12px; letter-spacing: 0; text-transform: none; font-weight: 600;
    }
    .topbar-popover.sc-menu-admin-off .sc-menu-group--helix .sc-bganim-pp {
      padding: 4px 11px; font-size: 11px;
    }
    .topbar-popover.sc-menu-admin-off .sc-menu-group--helix .sc-bganim-playback .sc-bganim-row-icon {
      display: inline-flex;
    }
    .topbar-popover.sc-menu-grouped .sc-menu-group.is-empty,
    .topbar-popover.sc-menu-grouped .sc-menu-col.is-empty { display: none !important; }
    .topbar-popover.sc-menu-grouped.sc-menu-one-col,
    .topbar-popover.sc-menu-grouped.sc-menu-two-col { width: max-content; }

    /* Helix product card — most bugs open a food sheet (name/brand + View Details
       into the NFP). A minority open a brand-insight or look-closer fact instead.
       Never a status stamp (e.g. “NON-UPF” next to a photo). Same round thumb
       covers the circle in both modes. */
    .wch-helix-card { position: absolute; z-index: 13; width: 340px; max-width: calc(100% - 16px);
      padding: 18px; display: flex; flex-direction: column; gap: 16px; pointer-events: auto;
      background: var(--surface, #fff); border: 1px solid var(--border, rgba(15,30,55,.10));
      border-radius: 20px;
      box-shadow: 0 4px 10px rgba(10,20,40,.07), 0 26px 56px rgba(10,20,40,.26);
      font-size: 13px; color: var(--text); transform-origin: left center;
      animation: wchHelixCardIn .24s cubic-bezier(.2,.9,.25,1.15) both; }
    .wch-helix-card.is-fact { width: 340px; padding: 18px; gap: 10px; }
    .wch-helix-card[hidden] { display: none !important; }
    html.dark .wch-helix-card {
      background: var(--surface, #1A2339); border-color: rgba(255,255,255,.10);
      box-shadow: 0 12px 40px rgba(0,0,0,.5); }
    .wch-helix-card.is-left { transform-origin: right center; }
    .wch-helix-card.is-left .wch-helix-card-top { flex-direction: row-reverse; }
    .wch-helix-card.is-left .wch-helix-card-copy { text-align: right; }
    .wch-helix-card.is-left .wch-helix-fact-body { text-align: right; }
    .wch-helix-card.is-left .wch-helix-card-link { align-self: flex-start; }
    .wch-helix-card.is-fact .wch-helix-card-top { align-items: flex-start; }
    @keyframes wchHelixCardIn {
      0% { opacity: 0; transform: translateX(-6px) scale(.9); }
      60% { opacity: 1; }
      100% { opacity: 1; transform: none; } }
    .wch-helix-card.is-left { animation-name: wchHelixCardInL; }
    @keyframes wchHelixCardInL {
      0% { opacity: 0; transform: translateX(6px) scale(.9); }
      60% { opacity: 1; }
      100% { opacity: 1; transform: none; } }
    .wch-helix-card-top { display: flex; align-items: center; gap: 14px; }
    .wch-helix-card-thumb { width: 68px; height: 68px; flex: 0 0 auto; border-radius: 50%; overflow: hidden;
      border: 2px solid var(--primary); background: var(--surface-2, #f2f4f7);
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 12%, transparent); }
    .wch-helix-card-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .wch-helix-card-copy { display: flex; flex-direction: column; min-width: 0; gap: 5px; }
    .wch-helix-card.is-food .wch-helix-fact-copy,
    .wch-helix-card.is-food .wch-helix-fact-body,
    .wch-helix-card.is-fact .wch-helix-food { display: none; }
    .wch-helix-card.is-fact .wch-helix-card-link { display: none; }
    .wch-helix-food { display: flex; flex-direction: column; min-width: 0; gap: 5px; }
    .wch-helix-card-brand { font-size: 11px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase;
      color: var(--primary); }
    .wch-helix-card-name { font-size: 17px; font-weight: 700; line-height: 1.25; color: var(--text); }
    .wch-helix-card-link { align-self: flex-end; display: inline-flex; align-items: center; gap: 4px;
      padding: 0; background: none; border: 0; box-shadow: none; text-decoration: none;
      font-weight: 700; font-size: 14px; color: var(--primary); transition: gap .12s ease; }
    .wch-helix-card-link:hover { text-decoration: underline; text-underline-offset: 2px; gap: 7px; }
    .wch-helix-card-link .material-symbols-outlined { font-size: 18px; }
    .wch-helix-fact-copy { display: flex; flex-direction: column; min-width: 0; gap: 5px; }
    .wch-helix-fact-kicker { font-size: 11px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase;
      color: var(--primary); }
    .wch-helix-card[data-kind="look"] .wch-helix-fact-kicker { color: var(--ter-amber-text, #75360A); }
    .wch-helix-fact-title { font-family: "WISE Digits", "Noto Serif", serif; font-size: 16px;
      font-weight: 800; line-height: 1.22; letter-spacing: -0.01em; color: var(--text); }
    .wch-helix-fact-body { display: block; font-size: 12.5px; line-height: 1.45; color: var(--text-muted, #5b6578); }
    html.dark .wch-helix-fact-body { color: var(--text-muted, #b7c0d0); }
  `;
  const style = document.createElement('style');
  style.id = 'wiseai-chat-extras';
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);
}

/* Shared Scale X / Y / Z preference for the welcome helix. The original
   single `wise:chat-bg-anim-scale` key was coil width (mostly Y); that value
   migrates onto Y when the per-axis keys are unset so the look does not jump.
   X and Z default to 100%.

   Each axis runs 1–800%, so the field can be pinched to a hairline or
   blown far past its default size — 100% is the original strand, not the
   floor. Bead Rate at 1% is a slow crawl; 800% is a fast loop. */
const BGANIM_SCALE_LEGACY_KEY = 'wise:chat-bg-anim-scale';
const BGANIM_SCALE_AXIS_KEYS = {
  x: 'wise:chat-bg-anim-scale-x',
  y: 'wise:chat-bg-anim-scale-y',
  z: 'wise:chat-bg-anim-scale-z',
};
const BGANIM_SCALE_AXES = ['x', 'y', 'z'];
const BGANIM_SCALE_PCT_DEFAULT = 100;
/* Published Helix pose — Scene. This is the wiseai.html source of truth:
   every other page that runs a chat helix must load this look (or the one
   shared localStorage override the member set on wiseai). Fresh loads open
   on 3D tubes, the smaller strand, reverse spin, pulse beads. Close-up
   stays a Load chip; this is only the no-pref default. Never invent a
   per-page opacity / angle / pose. */
export const BGANIM_PUBLISH_POSE = Object.freeze({
  look: '3d',
  mats: Object.freeze({ rough: 36, metal: 17, coat: 26, sheen: 46, fuzz: 22 }),
  opacity: 50,
  wash: 50,
  angle: -89,
  camera: 9,
  azimuth: -59,
  shift: -2,
  scale: Object.freeze({ x: 71, y: 34, z: 34 }),
  knobs: Object.freeze({
    pitch: 134, nodes: 160, dots: 87, length: 56, rungs: 295,
    rungthick: 49, thickness: 54, depth: 106, speed: 400,
  }),
  dotsMotion: 'pulse',
  motionKnobs: Object.freeze({
    pulse: Object.freeze({ speed: 7, length: 100, size: 1 }),
    spark: Object.freeze({ speed: 100, length: 100, size: 100 }),
  }),
  spin: 'rev',
  rungsMatch: false,
  style: 'helix',
  on: true,
  paused: false,
});
/* Helix studio (pages/helix.html) — slider writes stay in a draft map so
   messing around does not publish to every other chat until Apply. Named
   snapshots still hit real storage; they are saved looks, not the live pose. */
const BGANIM_STUDIO_SKIP = {
  'wise:chat-bg-anim-snaps-v1': 1,
  'wise:chat-bg-anim-instances-v1': 1,
};
let helixStudioDraft = null;
let helixStudioPublished = null;
let helixStudioUndo = null;

function isBgAnimStudioKey(key) {
  return typeof key === 'string' && key.indexOf('wise:chat-bg-anim') === 0 && !BGANIM_STUDIO_SKIP[key];
}

function bgAnimGet(key) {
  if (helixStudioDraft && isBgAnimStudioKey(key) && helixStudioDraft.has(key)) {
    return helixStudioDraft.get(key);
  }
  try { return localStorage.getItem(key); } catch (_) { return null; }
}

function bgAnimSet(key, val) {
  if (helixStudioDraft && isBgAnimStudioKey(key)) {
    helixStudioDraft.set(key, val == null ? null : String(val));
    syncHelixStudioChrome();
    return;
  }
  try { localStorage.setItem(key, val); } catch (_) {}
}

function bgAnimRemove(key) {
  if (helixStudioDraft && isBgAnimStudioKey(key)) {
    helixStudioDraft.set(key, null);
    syncHelixStudioChrome();
    return;
  }
  try { localStorage.removeItem(key); } catch (_) {}
}

/* Slider STOPS — 1% steps through 100%, then 2 / 5 / 10 out at the extremes.
   A plain linear 1–800 input would squeeze the shrink half of the window into
   a few pixels of a menu-width track; these stops spread the whole range
   evenly instead, and every stop is a round number. The input carries the
   stop INDEX; the stored preference is always the percentage, so older saved
   values keep working. */
const BGANIM_PCT_STOPS = (() => {
  const stops = [];
  for (let p = 1; p <= 100; p += 1) stops.push(p);
  for (let p = 102; p <= 200; p += 2) stops.push(p);
  for (let p = 205; p <= 400; p += 5) stops.push(p);
  for (let p = 410; p <= 800; p += 10) stops.push(p);
  return stops;
})();
const BGANIM_PCT_MIN = BGANIM_PCT_STOPS[0];
const BGANIM_PCT_MAX = BGANIM_PCT_STOPS[BGANIM_PCT_STOPS.length - 1];
const BGANIM_STOP_LAST = BGANIM_PCT_STOPS.length - 1;

function clampBgAnimScalePct(n) {
  return Math.max(BGANIM_PCT_MIN, Math.min(BGANIM_PCT_MAX, n));
}

/* Percentage → nearest stop index (for placing a thumb, including legacy or
   off-stop stored values) and back. */
export function bgAnimPctToStop(pct) {
  const target = clampBgAnimScalePct(Number(pct) || BGANIM_SCALE_PCT_DEFAULT);
  let best = 0;
  for (let i = 1; i < BGANIM_PCT_STOPS.length; i++) {
    if (Math.abs(BGANIM_PCT_STOPS[i] - target) < Math.abs(BGANIM_PCT_STOPS[best] - target)) best = i;
  }
  return best;
}

export function bgAnimStopToPct(i) {
  const n = Math.max(0, Math.min(BGANIM_STOP_LAST, parseInt(i, 10) || 0));
  return BGANIM_PCT_STOPS[n];
}

const BGANIM_STOP_DEFAULT = bgAnimPctToStop(BGANIM_SCALE_PCT_DEFAULT);
/* Shared range attributes for every scale / shape slider. */
const BGANIM_RANGE_ATTRS = `min="0" max="${BGANIM_STOP_LAST}" step="1" value="${BGANIM_STOP_DEFAULT}"`;

export function readBgAnimScaleAxis(axis) {
  try {
    const keyed = parseInt(bgAnimGet(BGANIM_SCALE_AXIS_KEYS[axis]), 10);
    if (!isNaN(keyed)) return clampBgAnimScalePct(keyed);
    if (axis === 'y') {
      const legacy = parseInt(bgAnimGet(BGANIM_SCALE_LEGACY_KEY), 10);
      if (!isNaN(legacy)) return clampBgAnimScalePct(legacy);
    }
  } catch (_) {}
  const pub = BGANIM_PUBLISH_POSE.scale[axis];
  return Number.isFinite(pub) ? clampBgAnimScalePct(pub) : BGANIM_SCALE_PCT_DEFAULT;
}

export function readBgAnimScaleAxes() {
  return {
    x: readBgAnimScaleAxis('x'),
    y: readBgAnimScaleAxis('y'),
    z: readBgAnimScaleAxis('z'),
  };
}

function persistBgAnimScaleAxis(axis, pct) {
  try { bgAnimSet(BGANIM_SCALE_AXIS_KEYS[axis], String(pct)); } catch (_) {}
}

/* The three axes plus a MASTER row above them. Dragging the master scales
   whatever is already set — it multiplies X / Y / Z by the same factor so
   their proportions stay put (a Scene pose with a short Z does not flatten
   into a cube). The per-axis rows still stretch one direction on their own.
   When the axes disagree the master reads "—" at their average until it is
   dragged; while dragging it shows the live target %. */
function bgAnimScaleAllRowHtml() {
  return `<div class="sc-bganim-detail sc-bganim-scale sc-bganim-scale-all">
            <span class="sc-bganim-detail-label">Scale</span>
            <input type="range" class="sc-bganim-scale-range" data-axis="all" ${BGANIM_RANGE_ATTRS} aria-label="Background animation scale — all axes" title="Scale every axis together, keeping their proportions">
            <span class="sc-bganim-scale-val">100%</span>
          </div>`;
}

const BGANIM_SCALE_AXIS_TIPS = {
  x: 'Stretch the field left and right',
  y: 'Stretch the field up and down',
  z: 'Coil volume — how wide the corkscrew opens toward you',
};

function bgAnimScaleRowsHtml() {
  const rows = BGANIM_SCALE_AXES.map((axis) => {
    const A = axis.toUpperCase();
    return `<div class="sc-bganim-detail sc-bganim-scale sc-bganim-scale-${axis}">
            <span class="sc-bganim-detail-label">Scale ${A}</span>
            <input type="range" class="sc-bganim-scale-range" data-axis="${axis}" ${BGANIM_RANGE_ATTRS} aria-label="Background animation scale ${A}" title="${BGANIM_SCALE_AXIS_TIPS[axis]}">
            <span class="sc-bganim-scale-val">100%</span>
          </div>`;
  });
  return [bgAnimScaleAllRowHtml()].concat(rows).join('\n          ');
}

/* Beyond the axes, shape knobs open up the strand itself — values it used to
   hardcode. Same 1–800% window as the scale rows. `nodes` is the only one
   the owl orbit shares (it has circles but no strand), so pitch / dots /
   length / thick / rungs / rungthick / depth are tagged helix-only and hide
   while Orbit is selected. */
const BGANIM_KNOBS = [
  {
    id: 'pitch', label: 'Pitch', key: 'wise:chat-bg-anim-pitch', helixOnly: true,
    tip: 'Coil pitch — low twists the strand tight, high opens the loops out',
  },
  {
    id: 'nodes', label: 'Nodes', key: 'wise:chat-bg-anim-nodes', helixOnly: false,
    tip: 'Size of the product photos and owl bugs on the field',
  },
  {
    id: 'dots', label: 'Dots', key: 'wise:chat-bg-anim-dots', helixOnly: true,
    tip: 'Size of the small beads between the product circles',
  },
  {
    id: 'length', label: 'Length', key: 'wise:chat-bg-anim-length', helixOnly: true,
    tip: 'How far the strand runs across the pane',
  },
  {
    id: 'rungs', label: 'Rungs', key: 'wise:chat-bg-anim-rungs', helixOnly: true,
    tip: 'How many cross-lines between the two strands. Match pins them to the product circles',
  },
  {
    id: 'rungthick', label: 'Bar', key: 'wise:chat-bg-anim-rungthick', helixOnly: true,
    tip: 'How thick those cross-lines paint — independent of the backbone Thick slider',
  },
  {
    id: 'thickness', label: 'Thick', key: 'wise:chat-bg-anim-thickness', helixOnly: true,
    tip: 'Strand thickness — how fat the DNA lines paint',
  },
  {
    id: 'depth', label: 'Depth', key: 'wise:chat-bg-anim-depth', helixOnly: true,
    tip: '3-D pop — low flattens the helix, high pushes near loops forward and fades the back',
  },
  {
    id: 'speed', label: 'Speed', key: 'wise:chat-bg-anim-speed', helixOnly: true,
    tip: 'How fast the helix twists — 100% is the original crawl',
  },
];
const BGANIM_KNOB_IDS = BGANIM_KNOBS.map((k) => k.id);
const BGANIM_KNOB_KEYS = BGANIM_KNOBS.reduce((m, k) => { m[k.id] = k.key; return m; }, {});

export function readBgAnimKnob(id) {
  try {
    const n = parseInt(bgAnimGet(BGANIM_KNOB_KEYS[id]), 10);
    if (!isNaN(n)) return clampBgAnimScalePct(n);
  } catch (_) {}
  const pub = BGANIM_PUBLISH_POSE.knobs[id];
  return Number.isFinite(pub) ? clampBgAnimScalePct(pub) : BGANIM_SCALE_PCT_DEFAULT;
}

export function readBgAnimKnobs() {
  const out = {};
  BGANIM_KNOB_IDS.forEach((id) => { out[id] = readBgAnimKnob(id); });
  return out;
}

function persistBgAnimKnob(id, pct) {
  try { bgAnimSet(BGANIM_KNOB_KEYS[id], String(pct)); } catch (_) {}
}

function broadcastBgAnimKnob(id, pct) {
  try {
    document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-knob', {
      detail: { knob: id, pct, value: pct / 100 },
    }));
  } catch (_) {}
}

function applyKnobEventToKnobs(knobs, detail) {
  if (!knobs || !detail) return false;
  const id = detail.knob;
  if (!BGANIM_KNOB_IDS.includes(id)) return false;
  const pct = typeof detail.pct === 'number'
    ? detail.pct
    : (typeof detail.value === 'number' ? Math.round(detail.value * 100) : NaN);
  if (!Number.isFinite(pct)) return false;
  knobs[id] = clampBgAnimScalePct(pct);
  return true;
}

function bgAnimKnobRowHtml(k) {
  const match = k.id === 'rungs'
    ? `<button type="button" class="sc-bganim-rungs-match" aria-label="Match rungs to nodes" title="One cross-line at each product circle">Match</button>`
    : '';
  return `<div class="sc-bganim-detail sc-bganim-knob sc-bganim-knob-${k.id}"${k.helixOnly ? ' data-helix-only="1"' : ''}>
            <span class="sc-bganim-detail-label">${k.label}</span>
            <input type="range" class="sc-bganim-knob-range" data-knob="${k.id}" ${BGANIM_RANGE_ATTRS} aria-label="Background animation ${k.label.toLowerCase()}" title="${k.tip}">
            <span class="sc-bganim-knob-val">100%</span>
            ${match}
          </div>`;
}

function bgAnimKnobById(id) {
  const k = BGANIM_KNOBS.find((x) => x.id === id);
  return k ? bgAnimKnobRowHtml(k) : '';
}

function bgAnimSubheadHtml(label, helixOnly) {
  return `<div class="sc-bganim-subhead"${helixOnly ? ' data-helix-only="1"' : ''}>${label}</div>`;
}

function bgAnimKnobRowsHtml() {
  return [
    bgAnimSubheadHtml('Beads', true),
    bgAnimKnobById('dots'),
    bgAnimDotsChromeHtml(),
    bgAnimSubheadHtml('Strand', true),
    bgAnimKnobById('pitch'),
    bgAnimKnobById('length'),
    bgAnimKnobById('rungs'),
    bgAnimKnobById('rungthick'),
    bgAnimKnobById('thickness'),
    bgAnimKnobById('depth'),
    bgAnimSpinChromeHtml(),
    bgAnimKnobById('speed'),
  ].join('\n          ');
}

function ensureBgAnimScaleRows(pop) {
  if (!pop) return;
  if (!pop.querySelector('.sc-bganim-scale-x')) {
    const html = bgAnimScaleRowsHtml();
    const old = pop.querySelectorAll('.sc-bganim-scale');
    if (old.length) {
      old[0].insertAdjacentHTML('beforebegin', html);
      old.forEach((el) => el.remove());
    } else {
      const camera = pop.querySelector('.sc-bganim-camera');
      const angle = pop.querySelector('.sc-bganim-angle');
      const style = pop.querySelector('.sc-bganim-style');
      const playback = pop.querySelector('.sc-bganim-playback');
      if (camera) camera.insertAdjacentHTML('afterend', html);
      else if (angle) angle.insertAdjacentHTML('afterend', html);
      else if (style) style.insertAdjacentHTML('beforebegin', html);
      else if (playback) playback.insertAdjacentHTML('beforebegin', html);
    }
  } else if (!pop.querySelector('.sc-bganim-scale-all')) {
    pop.querySelector('.sc-bganim-scale-x').insertAdjacentHTML('beforebegin', bgAnimScaleAllRowHtml());
  }
  /* Sliders copied before the range widened still carry the old percentage
     bounds (min=100/max=250), which would leave that surface unable to shrink
     the field. Re-stamp every scale / shape input onto the stop scale. */
  pop.querySelectorAll('.sc-bganim-scale-range, .sc-bganim-knob-range, .sc-bganim-motion-knob-range').forEach((r) => {
    r.min = '0';
    r.max = String(BGANIM_STOP_LAST);
    r.step = '1';
  });
  pop.querySelectorAll('.sc-bganim-opacity').forEach((r) => { r.step = '1'; });
}

function ensureBgAnimKnobRows(pop) {
  if (!pop) return;
  const existing = new Set();
  pop.querySelectorAll('.sc-bganim-knob-range').forEach((r) => {
    if (r.dataset.knob) existing.add(r.dataset.knob);
  });
  const insertMissing = (k) => {
    const html = bgAnimKnobRowHtml(k);
    const idx = BGANIM_KNOBS.indexOf(k);
    for (let j = idx - 1; j >= 0; j--) {
      const prev = pop.querySelector('.sc-bganim-knob-' + BGANIM_KNOBS[j].id);
      if (prev) { prev.insertAdjacentHTML('afterend', html); return; }
    }
    const scales = pop.querySelectorAll('.sc-bganim-scale');
    if (scales.length) {
      scales[scales.length - 1].insertAdjacentHTML('afterend', html);
      return;
    }
    const style = pop.querySelector('.sc-bganim-style');
    const playback = pop.querySelector('.sc-bganim-playback');
    if (style) style.insertAdjacentHTML('beforebegin', html);
    else if (playback) playback.insertAdjacentHTML('beforebegin', html);
  };
  if (!existing.size) {
    BGANIM_KNOBS.forEach(insertMissing);
    return;
  }
  BGANIM_KNOBS.forEach((k) => { if (!existing.has(k.id)) insertMissing(k); });
}

/* Colour + motion of the little beads between product circles. Empty colour
   means "match the strand" (theme / full-bleed accent). Reset restores the
   original brand blue. Motion is still / pulse / spark; Pulse and Spark each
   keep their own Rate / Size (Spark also has Span) so the two styles never
   share a slider. Shared app-wide, same broadcast pattern as the shape knobs. */
const BGANIM_DOTS_COLOR_KEY = 'wise:chat-bg-anim-dots-color';
const BGANIM_DOTS_COLOR_ORIGINAL = '#25507c';
const BGANIM_DOTS_MOTION_KEY = 'wise:chat-bg-anim-dots-motion';
const BGANIM_DOTS_MOTIONS = ['still', 'pulse', 'spark'];
const BGANIM_DOTS_HEX_RE = /^#[0-9a-fA-F]{6}$/;

const BGANIM_MOTION_KNOBS = [
  { motion: 'pulse', id: 'speed', label: 'Rate', key: 'wise:chat-bg-anim-pulse-speed',
    tip: 'How fast the beads breathe' },
  { motion: 'pulse', id: 'length', label: 'Span', key: 'wise:chat-bg-anim-pulse-length',
    tip: 'How wide each breath is along the strand' },
  { motion: 'pulse', id: 'size', label: 'Size', key: 'wise:chat-bg-anim-pulse-size',
    tip: 'How much each bead swells on the breath' },
  { motion: 'spark', id: 'speed', label: 'Rate', key: 'wise:chat-bg-anim-spark-speed',
    tip: 'How fast the glint travels the strand' },
  { motion: 'spark', id: 'length', label: 'Span', key: 'wise:chat-bg-anim-spark-length',
    tip: 'How wide each glint is along the strand' },
  { motion: 'spark', id: 'size', label: 'Size', key: 'wise:chat-bg-anim-spark-size',
    tip: 'How large the glint swells' },
];

function motionKnobKey(motion, id) {
  const def = BGANIM_MOTION_KNOBS.find((k) => k.motion === motion && k.id === id);
  return def ? def.key : '';
}

function emptyMotionKnobs() {
  const p = BGANIM_PUBLISH_POSE.motionKnobs;
  return {
    pulse: Object.assign({}, p.pulse),
    spark: Object.assign({}, p.spark),
  };
}

export function readBgAnimMotionKnobs() {
  const out = emptyMotionKnobs();
  BGANIM_MOTION_KNOBS.forEach((k) => {
    try {
      const n = parseInt(localStorage.getItem(k.key), 10);
      if (!isNaN(n)) out[k.motion][k.id] = clampBgAnimScalePct(n);
    } catch (_) {}
  });
  return out;
}

function persistBgAnimMotionKnob(motion, id, pct) {
  const key = motionKnobKey(motion, id);
  if (!key) return;
  try { localStorage.setItem(key, String(pct)); } catch (_) {}
}

function broadcastBgAnimMotionKnob(motion, id, pct) {
  try {
    document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-motion-knob', {
      detail: { motion, knob: id, pct, value: pct / 100 },
    }));
  } catch (_) {}
}

function applyMotionKnobEvent(knobs, detail) {
  if (!knobs || !detail) return false;
  const motion = detail.motion;
  const id = detail.knob;
  if (!knobs[motion] || !(id in knobs[motion])) return false;
  const pct = typeof detail.pct === 'number'
    ? detail.pct
    : (typeof detail.value === 'number' ? Math.round(detail.value * 100) : NaN);
  if (!Number.isFinite(pct)) return false;
  knobs[motion][id] = clampBgAnimScalePct(pct);
  return true;
}

function bgAnimMotionKnobRowHtml(k) {
  return `<div class="sc-bganim-detail sc-bganim-motion-knob sc-bganim-motion-${k.motion}-${k.id}" data-helix-only="1" data-motion-for="${k.motion}" data-motion-knob="${k.id}">
            <span class="sc-bganim-detail-label">${k.label}</span>
            <input type="range" class="sc-bganim-motion-knob-range" data-motion="${k.motion}" data-motion-knob="${k.id}" ${BGANIM_RANGE_ATTRS} aria-label="${k.motion} ${k.label.toLowerCase()}" title="${k.tip}">
            <span class="sc-bganim-motion-knob-val">100%</span>
          </div>`;
}

function bgAnimMotionKnobsHtml() {
  return BGANIM_MOTION_KNOBS.map(bgAnimMotionKnobRowHtml).join('\n          ');
}

function normalizeBgAnimDotsHex(raw) {
  const s = String(raw || '').trim();
  return BGANIM_DOTS_HEX_RE.test(s) ? s.toLowerCase() : '';
}

export function readBgAnimDotsColor() {
  try { return normalizeBgAnimDotsHex(bgAnimGet(BGANIM_DOTS_COLOR_KEY)); }
  catch (_) { return ''; }
}

export function readBgAnimDotsMotion() {
  try {
    const s = bgAnimGet(BGANIM_DOTS_MOTION_KEY);
    if (BGANIM_DOTS_MOTIONS.includes(s)) return s;
  } catch (_) {}
  return BGANIM_PUBLISH_POSE.dotsMotion;
}

function persistBgAnimDotsColor(hex) {
  try {
    if (hex) bgAnimSet(BGANIM_DOTS_COLOR_KEY, hex);
    else bgAnimRemove(BGANIM_DOTS_COLOR_KEY);
  } catch (_) {}
}

function persistBgAnimDotsMotion(motion) {
  try { bgAnimSet(BGANIM_DOTS_MOTION_KEY, motion); } catch (_) {}
}

function broadcastBgAnimDots(state) {
  try {
    document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-dots', {
      detail: { color: state.color || '', motion: state.motion || 'still' },
    }));
  } catch (_) {}
}

function applyDotsEventToState(state, detail) {
  if (!state || !detail) return false;
  let changed = false;
  if (typeof detail.color === 'string') {
    const hex = normalizeBgAnimDotsHex(detail.color);
    if (hex !== state.color) { state.color = hex; changed = true; }
  }
  if (typeof detail.motion === 'string' && BGANIM_DOTS_MOTIONS.includes(detail.motion)
      && detail.motion !== state.motion) {
    state.motion = detail.motion;
    changed = true;
  }
  return changed;
}

/* Live strand accent as #rrggbb so the colour swatch can preview "Match"
   without a custom pick. Mirrors createHelixBgAnim's readColor(). */
function strandAccentHex() {
  let col = '#25507c';
  try {
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    if (root.classList.contains('fb-chat-tint')) {
      col = (cs.getPropertyValue('--fb-chat-accent') || '').trim()
        || (cs.getPropertyValue('--fb-chat-fg') || '').trim()
        || col;
    } else {
      const dark = root.classList.contains('dark');
      col = ((dark ? cs.getPropertyValue('--primary-bright') : cs.getPropertyValue('--primary')) || '').trim() || col;
    }
  } catch (_) {}
  const s = String(col || '').trim();
  if (s[0] === '#') {
    let x = s.slice(1);
    if (x.length === 3) x = x.split('').map((c) => c + c).join('');
    if (x.length === 6 && /^[0-9a-fA-F]+$/.test(x)) return '#' + x.toLowerCase();
  }
  const m = s.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) {
    const hex = [m[1], m[2], m[3]].map((n) => ('0' + Math.max(0, Math.min(255, +n)).toString(16)).slice(-2)).join('');
    return '#' + hex;
  }
  return '#25507c';
}

function parseDotsRgb(hex) {
  const s = normalizeBgAnimDotsHex(hex);
  if (!s) return null;
  const n = parseInt(s.slice(1), 16);
  if (isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function bgAnimDotsChromeHtml() {
  return `<div class="sc-bganim-detail sc-bganim-dots-color" data-helix-only="1">
            <span class="sc-bganim-detail-label">Color</span>
            <input type="color" class="sc-bganim-dots-color-input" value="${BGANIM_DOTS_COLOR_ORIGINAL}" aria-label="Little node color" title="Colour of the small beads between product circles">
            <span class="sc-bganim-dots-actions">
              <button type="button" class="sc-bganim-dots-match" aria-label="Match strand color" title="Use the same colour as the DNA strand">Match</button>
              <button type="button" class="sc-bganim-dots-reset" aria-label="Reset to original color" title="Restore the original bead colour">Reset</button>
            </span>
          </div>
          <div class="sc-bganim-dots-motion" data-helix-only="1">
            <span class="sc-bganim-style-label">Motion</span>
            <div class="sc-stream-seg" role="radiogroup" aria-label="Little node motion">
              <button type="button" class="sc-stream-seg-btn is-on" data-sc="bg-anim-dots-motion" data-dots-motion="still" role="radio" aria-checked="true" title="Still beads" aria-label="Still beads">Still</button>
              <button type="button" class="sc-stream-seg-btn" data-sc="bg-anim-dots-motion" data-dots-motion="pulse" role="radio" aria-checked="false" title="Beads breathe along the strand" aria-label="Beads breathe along the strand">Pulse</button>
              <button type="button" class="sc-stream-seg-btn" data-sc="bg-anim-dots-motion" data-dots-motion="spark" role="radio" aria-checked="false" title="A glint travels the strand" aria-label="A glint travels the strand">Spark</button>
            </div>
          </div>
          ${bgAnimMotionKnobsHtml()}`;
}

function ensureBgAnimDotsChrome(pop) {
  if (!pop) return;
  if (!pop.querySelector('.sc-bganim-dots-color')) {
    const html = bgAnimDotsChromeHtml();
    const dots = pop.querySelector('.sc-bganim-knob-dots');
    if (dots) { dots.insertAdjacentHTML('afterend', html); }
    else {
      const nodes = pop.querySelector('.sc-bganim-knob-nodes');
      const style = pop.querySelector('.sc-bganim-style');
      const playback = pop.querySelector('.sc-bganim-playback');
      if (nodes) nodes.insertAdjacentHTML('afterend', html);
      else if (style) style.insertAdjacentHTML('beforebegin', html);
      else if (playback) playback.insertAdjacentHTML('beforebegin', html);
    }
  }
  const color = pop.querySelector('.sc-bganim-dots-color');
  if (color && !color.querySelector('.sc-bganim-dots-reset')) {
    let actions = color.querySelector('.sc-bganim-dots-actions');
    if (!actions) {
      actions = document.createElement('span');
      actions.className = 'sc-bganim-dots-actions';
      const match = color.querySelector('.sc-bganim-dots-match');
      if (match) {
        match.replaceWith(actions);
        actions.appendChild(match);
      } else {
        color.appendChild(actions);
      }
    }
    actions.insertAdjacentHTML('beforeend',
      '<button type="button" class="sc-bganim-dots-reset" aria-label="Reset to original color" title="Restore the original bead colour">Reset</button>');
  }
  if (!pop.querySelector('.sc-bganim-motion-knob')) {
    const motion = pop.querySelector('.sc-bganim-dots-motion');
    if (motion) motion.insertAdjacentHTML('afterend', bgAnimMotionKnobsHtml());
  }
  BGANIM_MOTION_KNOBS.forEach((k) => {
    const sel = `.sc-bganim-motion-${k.motion}-${k.id}`;
    if (pop.querySelector(sel)) return;
    const html = bgAnimMotionKnobRowHtml(k);
    const idx = BGANIM_MOTION_KNOBS.indexOf(k);
    for (let j = idx - 1; j >= 0; j--) {
      const prev = pop.querySelector(`.sc-bganim-motion-${BGANIM_MOTION_KNOBS[j].motion}-${BGANIM_MOTION_KNOBS[j].id}`);
      if (prev) { prev.insertAdjacentHTML('afterend', html); return; }
    }
    const motion = pop.querySelector('.sc-bganim-dots-motion');
    if (motion) motion.insertAdjacentHTML('afterend', html);
  });
}

function helixStyleActive(root) {
  root = liveBgAnimRoot(root);
  const angle = root && root.querySelector('.sc-bganim-angle');
  return !angle || !angle.hidden;
}

function syncBgAnimMotionKnobRows(root, motion, knobs, isHelix) {
  root = liveBgAnimRoot(root);
  if (!root) return;
  if (isHelix == null) isHelix = helixStyleActive(root);
  root.querySelectorAll('.sc-bganim-motion-knob').forEach((el) => {
    const forMotion = el.getAttribute('data-motion-for');
    el.hidden = !isHelix || forMotion !== motion;
  });
  if (!knobs) return;
  root.querySelectorAll('.sc-bganim-motion-knob-range').forEach((range) => {
    const m = range.dataset.motion;
    const id = range.dataset.motionKnob;
    if (!knobs[m] || knobs[m][id] == null) return;
    const pct = knobs[m][id];
    if (document.activeElement !== range) range.value = String(bgAnimPctToStop(pct));
    const val = range.parentElement && range.parentElement.querySelector('.sc-bganim-motion-knob-val');
    if (val) val.textContent = pct + '%';
  });
}

function wireBgAnimMotionKnobs(root, knobs, onChange) {
  if (!root || !knobs) return;
  root.querySelectorAll('.sc-bganim-motion-knob-range').forEach((range) => {
    if (range.__bgAnimWired) return;
    range.__bgAnimWired = true;
    range.min = '0';
    range.max = String(BGANIM_STOP_LAST);
    range.step = '1';
    range.addEventListener('input', () => {
      const motion = range.dataset.motion;
      const id = range.dataset.motionKnob;
      if (!knobs[motion] || !(id in knobs[motion])) return;
      const pct = bgAnimStopToPct(range.value);
      knobs[motion][id] = pct;
      persistBgAnimMotionKnob(motion, id, pct);
      broadcastBgAnimMotionKnob(motion, id, pct);
      syncBgAnimMotionKnobRows(root, motion, knobs, helixStyleActive(root));
      if (typeof onChange === 'function') onChange();
    });
  });
}

function syncBgAnimDotsChrome(root, state, motionKnobs, isHelix) {
  root = liveBgAnimRoot(root);
  if (!root || !state) return;
  const input = root.querySelector('.sc-bganim-dots-color-input');
  const match = root.querySelector('.sc-bganim-dots-match');
  const reset = root.querySelector('.sc-bganim-dots-reset');
  const matching = !state.color;
  const shown = matching ? strandAccentHex() : state.color;
  if (input && document.activeElement !== input) input.value = shown;
  if (match) match.classList.toggle('is-on', matching);
  if (reset) reset.classList.toggle('is-on', !matching && state.color === BGANIM_DOTS_COLOR_ORIGINAL);
  root.querySelectorAll('[data-sc="bg-anim-dots-motion"]').forEach((btn) => {
    const on = btn.dataset.dotsMotion === state.motion;
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  syncBgAnimMotionKnobRows(root, state.motion, motionKnobs, isHelix);
}

function wireBgAnimDotsChrome(root, state, onChange, motionKnobs) {
  if (!root || !state) return;
  const resync = () => syncBgAnimDotsChrome(root, state, motionKnobs, helixStyleActive(root));
  const input = root.querySelector('.sc-bganim-dots-color-input');
  if (input && !input.__bgAnimWired) {
    input.__bgAnimWired = true;
    const commit = () => {
      const hex = normalizeBgAnimDotsHex(input.value);
      if (!hex || hex === state.color) return;
      state.color = hex;
      persistBgAnimDotsColor(hex);
      broadcastBgAnimDots(state);
      resync();
      if (typeof onChange === 'function') onChange();
    };
    input.addEventListener('input', commit);
    input.addEventListener('change', commit);
    input.addEventListener('click', (e) => e.stopPropagation());
  }
  const match = root.querySelector('.sc-bganim-dots-match');
  if (match && !match.__bgAnimWired) {
    match.__bgAnimWired = true;
    match.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!state.color) return;
      state.color = '';
      persistBgAnimDotsColor('');
      broadcastBgAnimDots(state);
      resync();
      if (typeof onChange === 'function') onChange();
    });
  }
  const reset = root.querySelector('.sc-bganim-dots-reset');
  if (reset && !reset.__bgAnimWired) {
    reset.__bgAnimWired = true;
    reset.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (state.color === BGANIM_DOTS_COLOR_ORIGINAL) return;
      state.color = BGANIM_DOTS_COLOR_ORIGINAL;
      persistBgAnimDotsColor(BGANIM_DOTS_COLOR_ORIGINAL);
      broadcastBgAnimDots(state);
      resync();
      if (typeof onChange === 'function') onChange();
    });
  }
  root.querySelectorAll('[data-sc="bg-anim-dots-motion"]').forEach((btn) => {
    if (btn.__bgAnimWired) return;
    btn.__bgAnimWired = true;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const motion = btn.dataset.dotsMotion;
      if (!BGANIM_DOTS_MOTIONS.includes(motion) || motion === state.motion) return;
      state.motion = motion;
      persistBgAnimDotsMotion(motion);
      broadcastBgAnimDots(state);
      resync();
      if (typeof onChange === 'function') onChange();
    });
  });
}

/* Helix twist direction — Forward is the original left→right crawl; Reverse
   unwinds the other way. Speed is a shape knob (1–800%). Shared app-wide. */
const BGANIM_SPIN_KEY = 'wise:chat-bg-anim-spin';
const BGANIM_SPIN_DIRS = ['fwd', 'rev'];

export function readBgAnimSpinDir() {
  try {
    const s = bgAnimGet(BGANIM_SPIN_KEY);
    if (BGANIM_SPIN_DIRS.includes(s)) return s;
  } catch (_) {}
  return BGANIM_PUBLISH_POSE.spin;
}

function persistBgAnimSpinDir(dir) {
  try { bgAnimSet(BGANIM_SPIN_KEY, dir); } catch (_) {}
}

function broadcastBgAnimSpin(dir) {
  try {
    document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-spin', { detail: { dir } }));
  } catch (_) {}
}

function bgAnimSpinChromeHtml() {
  const cur = BGANIM_PUBLISH_POSE.spin;
  return `<div class="sc-bganim-spin" data-helix-only="1">
            <span class="sc-bganim-style-label">Spin</span>
            <div class="sc-stream-seg" role="radiogroup" aria-label="Helix spin direction">
              <button type="button" class="sc-stream-seg-btn${cur === 'fwd' ? ' is-on' : ''}" data-sc="bg-anim-spin" data-spin="fwd" role="radio" aria-checked="${cur === 'fwd' ? 'true' : 'false'}" title="Twist forward" aria-label="Twist forward">Fwd</button>
              <button type="button" class="sc-stream-seg-btn${cur === 'rev' ? ' is-on' : ''}" data-sc="bg-anim-spin" data-spin="rev" role="radio" aria-checked="${cur === 'rev' ? 'true' : 'false'}" title="Twist reverse" aria-label="Twist reverse">Rev</button>
            </div>
          </div>`;
}

function ensureBgAnimSpinChrome(pop) {
  if (!pop) return;
  if (pop.querySelector('.sc-bganim-spin')) return;
  const html = bgAnimSpinChromeHtml();
  const speed = pop.querySelector('.sc-bganim-knob-speed');
  if (speed) { speed.insertAdjacentHTML('beforebegin', html); return; }
  const depth = pop.querySelector('.sc-bganim-knob-depth');
  if (depth) { depth.insertAdjacentHTML('afterend', html); return; }
  const style = pop.querySelector('.sc-bganim-style');
  const playback = pop.querySelector('.sc-bganim-playback');
  if (style) style.insertAdjacentHTML('beforebegin', html);
  else if (playback) playback.insertAdjacentHTML('beforebegin', html);
}

function syncBgAnimSpinChrome(root, dir) {
  root = liveBgAnimRoot(root);
  if (!root) return;
  root.querySelectorAll('[data-sc="bg-anim-spin"]').forEach((btn) => {
    const on = btn.dataset.spin === dir;
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
  });
}

function wireBgAnimSpinChrome(root, getDir, setDir, onChange) {
  if (!root) return;
  root.querySelectorAll('[data-sc="bg-anim-spin"]').forEach((btn) => {
    if (btn.__bgAnimWired) return;
    btn.__bgAnimWired = true;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dir = btn.dataset.spin;
      if (!BGANIM_SPIN_DIRS.includes(dir) || dir === getDir()) return;
      setDir(dir);
      persistBgAnimSpinDir(dir);
      broadcastBgAnimSpin(dir);
      syncBgAnimSpinChrome(root, dir);
      if (typeof onChange === 'function') onChange();
    });
  });
}

/* Classic lines vs lit 3-D tubes. Shared app-wide. Default Classic so the
   original strand stays until someone opts into a lit look. */
const BGANIM_LOOK_KEY = 'wise:chat-bg-anim-look';
const BGANIM_LOOKS = ['classic', '3d'];
const BGANIM_LOOK_DEFAULT = BGANIM_PUBLISH_POSE.look;

function normalizeBgAnimLook(look) {
  if (look === 'tripo') return '3d';
  return BGANIM_LOOKS.includes(look) ? look : BGANIM_LOOK_DEFAULT;
}

export function readBgAnimLook() {
  try {
    const s = bgAnimGet(BGANIM_LOOK_KEY);
    if (s === 'tripo') {
      try { bgAnimSet(BGANIM_LOOK_KEY, '3d'); } catch (_) {}
      return '3d';
    }
    if (BGANIM_LOOKS.includes(s)) return s;
  } catch (_) {}
  return BGANIM_LOOK_DEFAULT;
}

function persistBgAnimLook(look) {
  try { bgAnimSet(BGANIM_LOOK_KEY, normalizeBgAnimLook(look)); } catch (_) {}
}

function broadcastBgAnimLook(look) {
  try {
    document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-look', { detail: { look } }));
  } catch (_) {}
}

function bgAnimLookChromeHtml(active) {
  const cur = normalizeBgAnimLook(active);
  return `${bgAnimSubheadHtml('Look', true)}
          <div class="sc-bganim-look" data-helix-only="1">
            <div class="sc-stream-seg" role="radiogroup" aria-label="Helix look">
              <button type="button" class="sc-stream-seg-btn${cur === 'classic' ? ' is-on' : ''}" data-sc="bg-anim-look" data-look="classic" role="radio" aria-checked="${cur === 'classic' ? 'true' : 'false'}" title="Original line drawing" aria-label="Classic look">Classic</button>
              <button type="button" class="sc-stream-seg-btn${cur === '3d' ? ' is-on' : ''}" data-sc="bg-anim-look" data-look="3d" role="radio" aria-checked="${cur === '3d' ? 'true' : 'false'}" title="Lit tubes" aria-label="3D look">3D</button>
            </div>
          </div>`;
}

function ensureBgAnimLookChrome(pop) {
  if (!pop) return;
  if (!pop.querySelector('.sc-bganim-look')) {
    const html = bgAnimLookChromeHtml(readBgAnimLook());
    const snaps = pop.querySelector('.sc-bganim-snapshots');
    const finish = pop.querySelector('.sc-bganim-mat');
    const anim = pop.querySelector('[data-sc="bg-anim"]');
    if (snaps) snaps.insertAdjacentHTML('afterend', html);
    else if (finish) finish.insertAdjacentHTML('beforebegin', html);
    else if (anim) anim.insertAdjacentHTML('afterend', html);
    else {
      const style = pop.querySelector('.sc-bganim-style');
      const playback = pop.querySelector('.sc-bganim-playback');
      if (style) style.insertAdjacentHTML('beforebegin', html);
      else if (playback) playback.insertAdjacentHTML('beforebegin', html);
    }
  } else {
    const look = pop.querySelector('.sc-bganim-look');
    const prev = look && look.previousElementSibling;
    const hasLookHead = prev && prev.classList && prev.classList.contains('sc-bganim-subhead')
      && /look/i.test(prev.textContent || '');
    if (look && !hasLookHead) {
      look.insertAdjacentHTML('beforebegin', bgAnimSubheadHtml('Look', true));
    }
  }
  /* Drop leftover inline labels once the section subhead owns the name. */
  pop.querySelectorAll('.sc-bganim-look > .sc-bganim-style-label').forEach((el) => el.remove());
  queryChatMenuAll(pop, '[data-look="tripo"]').forEach((el) => el.remove());
}

function syncBgAnimLookChrome(root, look) {
  root = liveBgAnimRoot(root);
  if (!root) return;
  const cur = normalizeBgAnimLook(look);
  root.querySelectorAll('[data-sc="bg-anim-look"]').forEach((btn) => {
    const on = btn.dataset.look === cur;
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
  });
}

function wireBgAnimLookChrome(root, getLook, setLook, onChange) {
  if (!root) return;
  root.querySelectorAll('[data-sc="bg-anim-look"]').forEach((btn) => {
    if (btn.__bgAnimWired) return;
    btn.__bgAnimWired = true;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const look = normalizeBgAnimLook(btn.dataset.look);
      if (!BGANIM_LOOKS.includes(look) || look === getLook()) return;
      setLook(look);
      persistBgAnimLook(look);
      broadcastBgAnimLook(look);
      syncBgAnimLookChrome(root, look);
      if (typeof onChange === 'function') onChange();
    });
  });
}

/* Tripo / 3D surface finish — the 3deeeee PBR knobs, mapped onto the cheap
   canvas tubes. Hidden while Look is Classic. Shared app-wide. */
const BGANIM_MAT_KNOBS = [
  { id: 'rough', label: 'Rough', key: 'wise:chat-bg-anim-mat-rough', def: BGANIM_PUBLISH_POSE.mats.rough,
    tip: 'How matte the tubes are — 0 is a mirror, 100 is felt' },
  { id: 'metal', label: 'Metal', key: 'wise:chat-bg-anim-mat-metal', def: BGANIM_PUBLISH_POSE.mats.metal,
    tip: 'Blends the strand toward a metallic sheen' },
  { id: 'coat', label: 'Coat', key: 'wise:chat-bg-anim-mat-coat', def: BGANIM_PUBLISH_POSE.mats.coat,
    tip: 'A thin glossy lacquer over the tube — the Tripo clearcoat' },
  { id: 'sheen', label: 'Sheen', key: 'wise:chat-bg-anim-mat-sheen', def: BGANIM_PUBLISH_POSE.mats.sheen,
    tip: 'Soft edge glow, like down catching the studio key light' },
  { id: 'fuzz', label: 'Fuzz', key: 'wise:chat-bg-anim-mat-fuzz', def: BGANIM_PUBLISH_POSE.mats.fuzz,
    tip: 'Downy bump on the tube skin — the Tripo owl’s feather relief' },
];
const BGANIM_MAT_IDS = BGANIM_MAT_KNOBS.map((k) => k.id);

export function readBgAnimMat(id) {
  const def = BGANIM_MAT_KNOBS.find((k) => k.id === id);
  const fallback = def ? def.def : 0;
  try {
    const n = parseInt(localStorage.getItem(def && def.key), 10);
    if (!isNaN(n)) return Math.max(0, Math.min(100, n));
  } catch (_) {}
  return fallback;
}

export function readBgAnimMats() {
  const out = {};
  BGANIM_MAT_IDS.forEach((id) => { out[id] = readBgAnimMat(id); });
  return out;
}

function persistBgAnimMat(id, pct) {
  const def = BGANIM_MAT_KNOBS.find((k) => k.id === id);
  if (!def) return;
  try { localStorage.setItem(def.key, String(pct)); } catch (_) {}
}

function broadcastBgAnimMat(id, pct) {
  try {
    document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-mat', {
      detail: { knob: id, pct },
    }));
  } catch (_) {}
}

function bgAnimMatRowHtml(k) {
  return `<div class="sc-bganim-detail sc-bganim-mat sc-bganim-mat-${k.id}" data-helix-only="1" data-mat-only="1">
            <span class="sc-bganim-detail-label">${k.label}</span>
            <input type="range" class="sc-bganim-mat-range" data-mat="${k.id}" min="0" max="100" step="1" value="${k.def}" aria-label="${k.label}" title="${k.tip}">
            <span class="sc-bganim-mat-val">${k.def}</span>
          </div>`;
}

function bgAnimMatRowsHtml() {
  return [bgAnimSubheadHtml('Finish', true)]
    .concat(BGANIM_MAT_KNOBS.map(bgAnimMatRowHtml))
    .join('\n          ');
}

function ensureBgAnimMatRows(root) {
  if (!root || root.querySelector('.sc-bganim-mat')) return;
  const look = root.querySelector('.sc-bganim-look');
  if (look) look.insertAdjacentHTML('afterend', bgAnimMatRowsHtml());
}

function syncBgAnimMatRows(root, mats, look) {
  root = liveBgAnimRoot(root);
  if (!root) return;
  const show = normalizeBgAnimLook(look) === '3d';
  root.querySelectorAll('.sc-bganim-mat').forEach((el) => { el.hidden = !show; });
  root.querySelectorAll('.sc-bganim-cluster:has(.sc-bganim-mat)').forEach((c) => { c.hidden = !show; });
  root.querySelectorAll('.sc-bganim-subhead').forEach((el) => {
    const label = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (label.includes('finish')) el.hidden = !show;
  });
  if (!mats) return;
  root.querySelectorAll('.sc-bganim-mat-range').forEach((range) => {
    const id = range.dataset.mat;
    if (!id || mats[id] == null) return;
    if (document.activeElement !== range) range.value = String(mats[id]);
    const val = range.parentElement && range.parentElement.querySelector('.sc-bganim-mat-val');
    if (val) val.textContent = String(mats[id]);
  });
}

function wireBgAnimMatRows(root, mats, onChange) {
  if (!root || !mats) return;
  root.querySelectorAll('.sc-bganim-mat-range').forEach((range) => {
    if (range.__bgAnimWired) return;
    range.__bgAnimWired = true;
    range.addEventListener('input', () => {
      const id = range.dataset.mat;
      if (!id || !(id in mats)) return;
      const pct = Math.max(0, Math.min(100, parseInt(range.value, 10) || 0));
      mats[id] = pct;
      persistBgAnimMat(id, pct);
      broadcastBgAnimMat(id, pct);
      const val = range.parentElement && range.parentElement.querySelector('.sc-bganim-mat-val');
      if (val) val.textContent = String(pct);
      if (typeof onChange === 'function') onChange();
    });
  });
}

function applyMatEvent(mats, detail) {
  if (!mats || !detail) return false;
  const id = detail.knob;
  if (!BGANIM_MAT_IDS.includes(id) || typeof detail.pct !== 'number') return false;
  mats[id] = Math.max(0, Math.min(100, detail.pct));
  return true;
}

/* Named Helix snapshots — a full look you can load, save, and reload. Two
   factory poses (Close-up / Scene) ship in code; extra ones the member saves
   live in localStorage. Clicking a chip writes every slider + segment, so a
   later reload always restores that exact pose. */
const BGANIM_SNAPS_KEY = 'wise:chat-bg-anim-snaps-v1';
const BGANIM_SNAPS_MAX_USER = 8;
const BGANIM_SNAP_ON_KEY = 'wise:chat-bg-anim';
const BGANIM_SNAP_OPACITY_KEY = 'wise:chat-bg-anim-opacity';
const BGANIM_SNAP_WASH_KEY = 'wise:chat-bg-anim-wash';
const BGANIM_SNAP_ANGLE_KEY = 'wise:chat-bg-anim-angle';
const BGANIM_SNAP_PAUSED_KEY = 'wise:chat-bg-anim-paused';
const BGANIM_SNAP_STYLE_KEY = 'wise:chat-bg-anim-style';
const BGANIM_SNAP_STYLES = ['helix', 'helix-ten', 'orbit'];

export function readBgAnimStyle() {
  try {
    const s = bgAnimGet(BGANIM_SNAP_STYLE_KEY);
    if (s === 'stamp') {
      try { bgAnimSet(BGANIM_SNAP_STYLE_KEY, 'helix'); } catch (_) {}
      return 'helix';
    }
    if (BGANIM_SNAP_STYLES.includes(s)) return s;
  } catch (_) {}
  return BGANIM_PUBLISH_POSE.style;
}

export function applyBgAnimStyleAttr(style) {
  const s = BGANIM_SNAP_STYLES.includes(style) ? style : readBgAnimStyle();
  try { document.documentElement.setAttribute('data-chat-bg-style', s); } catch (_) {}
}

if (typeof document !== 'undefined') {
  applyBgAnimStyleAttr(readBgAnimStyle());
  document.addEventListener('wise:chat-bg-anim-style', (e) => {
    const s = e && e.detail && e.detail.style;
    if (s) applyBgAnimStyleAttr(s);
  });
}

export function readBgAnimOpacityPct() {
  try {
    const n = parseInt(bgAnimGet(BGANIM_SNAP_OPACITY_KEY), 10);
    if (!isNaN(n)) return Math.max(10, Math.min(100, n));
  } catch (_) {}
  return BGANIM_PUBLISH_POSE.opacity;
}

export function clampBgAnimWash(n) {
  const v = Number(n);
  return Number.isFinite(v)
    ? Math.max(0, Math.min(100, Math.round(v)))
    : BGANIM_PUBLISH_POSE.wash;
}

export function readBgAnimWash() {
  try {
    const n = parseInt(bgAnimGet(BGANIM_SNAP_WASH_KEY), 10);
    if (!isNaN(n)) return clampBgAnimWash(n);
  } catch (_) {}
  return BGANIM_PUBLISH_POSE.wash;
}

function persistBgAnimWash(pct) {
  try { bgAnimSet(BGANIM_SNAP_WASH_KEY, String(pct)); } catch (_) {}
}

function broadcastBgAnimWash(pct) {
  try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-wash', { detail: { wash: pct } })); } catch (_) {}
}

/* 0 = helix fully visible behind the composer; 50 = the published Scene
   fade (current mask); 100 = a heavier veil. Always a gradient — never a
   hard cut — so lowering Wash makes the fade gentler rather than flipping
   a solid block off. */
function bgAnimWashMaskStops(pct) {
  const cur = [1, 1, 0.22, 0.08, 0.06, 0.28];
  const none = [1, 1, 1, 1, 1, 1];
  const heavy = [1, 0.62, 0.08, 0.02, 0.015, 0.10];
  const t = clampBgAnimWash(pct) / 100;
  const mix = (a, b, u) => a.map((v, i) => +(v + (b[i] - v) * u).toFixed(3));
  if (t <= 0.5) return mix(none, cur, t / 0.5);
  return mix(cur, heavy, (t - 0.5) / 0.5);
}

export function applyBgAnimWash(pct) {
  const n = clampBgAnimWash(pct);
  const stops = bgAnimWashMaskStops(n);
  if (typeof document === 'undefined') return n;
  const root = document.documentElement;
  root.style.setProperty('--sc-bganim-wash', String(n));
  const paint = (el) => {
    if (!el || !el.style) return;
    el.style.setProperty('--sc-bganim-wash', String(n));
    el.style.setProperty('--sc-fill-0', String(stops[0]));
    el.style.setProperty('--sc-fill-1', String(stops[1]));
    el.style.setProperty('--sc-fill-2', String(stops[2]));
    el.style.setProperty('--sc-fill-3', String(stops[3]));
    el.style.setProperty('--sc-fill-4', String(stops[4]));
    el.style.setProperty('--sc-fill-5', String(stops[5]));
  };
  paint(root);
  document.querySelectorAll('.sc-bganim-live, .sc-orbit-live, .sc-bganim-canvas--fill').forEach(paint);
  return n;
}

function bgAnimWashRowHtml() {
  const v = BGANIM_PUBLISH_POSE.wash;
  return `<div class="sc-bganim-detail sc-bganim-wash">
            <span class="sc-bganim-detail-label">Wash</span>
            <input type="range" class="sc-bganim-wash-range" min="0" max="100" step="1" value="${v}" aria-label="Composer wash" title="How much the helix fades behind the composer text">
            <span class="sc-bganim-wash-val">${v}%</span>
          </div>`;
}

function ensureBgAnimWashRow(pop) {
  if (!pop) return;
  if (!pop.querySelector('.sc-bganim-wash')) {
    const html = bgAnimWashRowHtml();
    const opacity = pop.querySelector('.sc-bganim-detail:has(.sc-bganim-opacity)');
    if (opacity) opacity.insertAdjacentHTML('afterend', html);
    else {
      const angle = pop.querySelector('.sc-bganim-angle');
      if (angle) angle.insertAdjacentHTML('beforebegin', html);
    }
  }
  pop.querySelectorAll('.sc-bganim-wash-range').forEach((r) => {
    r.min = '0';
    r.max = '100';
  });
}

export function readBgAnimAngle() {
  try {
    const n = parseInt(bgAnimGet(BGANIM_SNAP_ANGLE_KEY), 10);
    if (!isNaN(n)) return Math.max(-90, Math.min(90, n));
  } catch (_) {}
  return BGANIM_PUBLISH_POSE.angle;
}

function bgAnimFactorySnap(id, name, patch) {
  return Object.assign({
    id, name, builtIn: true,
    look: BGANIM_PUBLISH_POSE.look,
    mats: Object.assign({}, BGANIM_PUBLISH_POSE.mats),
    opacity: BGANIM_PUBLISH_POSE.opacity,
    wash: BGANIM_PUBLISH_POSE.wash,
    angle: BGANIM_PUBLISH_POSE.angle,
    camera: BGANIM_PUBLISH_POSE.camera,
    azimuth: BGANIM_PUBLISH_POSE.azimuth,
    shift: BGANIM_PUBLISH_POSE.shift,
    scale: Object.assign({}, BGANIM_PUBLISH_POSE.scale),
    knobs: Object.assign({}, BGANIM_PUBLISH_POSE.knobs),
    dotsColor: BGANIM_DOTS_COLOR_ORIGINAL,
    dotsMotion: BGANIM_PUBLISH_POSE.dotsMotion,
    motionKnobs: {
      pulse: Object.assign({}, BGANIM_PUBLISH_POSE.motionKnobs.pulse),
      spark: Object.assign({}, BGANIM_PUBLISH_POSE.motionKnobs.spark),
    },
    spin: BGANIM_PUBLISH_POSE.spin,
    rungsMatch: BGANIM_PUBLISH_POSE.rungsMatch,
    style: BGANIM_PUBLISH_POSE.style,
    on: BGANIM_PUBLISH_POSE.on,
    paused: BGANIM_PUBLISH_POSE.paused,
  }, patch, { id, name, builtIn: true });
}

const BGANIM_FACTORY_SNAPS = [
  /* First screenshot: the strand fills the pane — huge scale, fat tubes, giant beads. */
  bgAnimFactorySnap('closeup', 'Close-up', {
    mats: { rough: 36, metal: 0, coat: 28, sheen: 42, fuzz: 22 },
    opacity: 50, angle: -90, camera: 14, azimuth: -59, shift: -2,
    scale: { x: 570, y: 570, z: 570 },
    knobs: {
      pitch: 245, nodes: 210, dots: 800, length: 53, rungs: 380,
      rungthick: 122, thickness: 800, depth: 158, speed: 400,
    },
    motionKnobs: {
      pulse: { speed: 1, length: 100, size: 1 },
      spark: { speed: 100, length: 100, size: 100 },
    },
  }),
  /* Published default — smaller helix sitting in the scene. */
  bgAnimFactorySnap('scene', 'Scene', {}),
];

function cloneBgAnimSnap(s) {
  if (!s) return null;
  return {
    id: s.id, name: s.name, builtIn: !!s.builtIn,
    look: normalizeBgAnimLook(s.look),
    mats: Object.assign({}, s.mats),
    opacity: s.opacity, wash: s.wash, angle: s.angle, camera: s.camera,
    azimuth: s.azimuth, shift: s.shift,
    scale: Object.assign({}, s.scale),
    knobs: Object.assign({}, s.knobs),
    dotsColor: normalizeBgAnimDotsHex(s.dotsColor),
    dotsMotion: BGANIM_DOTS_MOTIONS.includes(s.dotsMotion) ? s.dotsMotion : 'still',
    motionKnobs: {
      pulse: Object.assign({}, (s.motionKnobs && s.motionKnobs.pulse) || {}),
      spark: Object.assign({}, (s.motionKnobs && s.motionKnobs.spark) || {}),
    },
    spin: BGANIM_SPIN_DIRS.includes(s.spin) ? s.spin : 'fwd',
    rungsMatch: !!s.rungsMatch,
    style: BGANIM_SNAP_STYLES.includes(s.style) ? s.style : 'helix',
    on: s.on !== false,
    paused: !!s.paused,
  };
}

function clampBgAnimSnap(raw) {
  const s = cloneBgAnimSnap(raw);
  if (!s) return null;
  s.opacity = Math.max(10, Math.min(100, Math.round(Number(s.opacity) || BGANIM_PUBLISH_POSE.opacity)));
  s.wash = clampBgAnimWash(s.wash);
  s.angle = Math.max(-90, Math.min(90, Math.round(Number.isFinite(Number(s.angle)) ? Number(s.angle) : BGANIM_PUBLISH_POSE.angle)));
  s.camera = clampBgAnimCamera(s.camera);
  s.azimuth = clampBgAnimAzimuth(s.azimuth);
  s.shift = clampBgAnimShift(s.shift);
  BGANIM_SCALE_AXES.forEach((a) => { s.scale[a] = clampBgAnimScalePct(s.scale[a]); });
  BGANIM_KNOB_IDS.forEach((id) => { s.knobs[id] = clampBgAnimScalePct(s.knobs[id]); });
  BGANIM_MAT_IDS.forEach((id) => {
    const n = Math.round(Number(s.mats[id]));
    s.mats[id] = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : readBgAnimMat(id);
  });
  ['pulse', 'spark'].forEach((m) => {
    ['speed', 'length', 'size'].forEach((id) => {
      s.motionKnobs[m][id] = clampBgAnimScalePct(s.motionKnobs[m][id]);
    });
  });
  return s;
}

function captureBgAnimSnapshot() {
  const opacity = readBgAnimOpacityPct();
  const wash = readBgAnimWash();
  const angle = readBgAnimAngle();
  let on = true;
  try { if (bgAnimGet(BGANIM_SNAP_ON_KEY) === '0') on = false; } catch (_) {}
  let paused = false;
  try { if (bgAnimGet(BGANIM_SNAP_PAUSED_KEY) === '1') paused = true; } catch (_) {}
  let style = 'helix';
  try {
    const st = bgAnimGet(BGANIM_SNAP_STYLE_KEY);
    if (BGANIM_SNAP_STYLES.includes(st)) style = st;
  } catch (_) {}
  return clampBgAnimSnap({
    look: readBgAnimLook(),
    mats: readBgAnimMats(),
    opacity, wash, angle,
    camera: readBgAnimCamera(),
    azimuth: readBgAnimAzimuth(),
    shift: readBgAnimShift(),
    scale: readBgAnimScaleAxes(),
    knobs: readBgAnimKnobs(),
    dotsColor: readBgAnimDotsColor(),
    dotsMotion: readBgAnimDotsMotion(),
    motionKnobs: readBgAnimMotionKnobs(),
    spin: readBgAnimSpinDir(),
    rungsMatch: readBgAnimRungsMatch(),
    style, on, paused,
  });
}

function equalBgAnimSnap(a, b) {
  if (!a || !b) return false;
  if (a.look !== b.look || a.style !== b.style || a.spin !== b.spin) return false;
  if (a.dotsMotion !== b.dotsMotion || !!a.rungsMatch !== !!b.rungsMatch) return false;
  if ((a.dotsColor || '') !== (b.dotsColor || '')) return false;
  if (a.opacity !== b.opacity || a.wash !== b.wash || a.angle !== b.angle) return false;
  if (a.camera !== b.camera || a.azimuth !== b.azimuth || a.shift !== b.shift) return false;
  if (a.scale.x !== b.scale.x || a.scale.y !== b.scale.y || a.scale.z !== b.scale.z) return false;
  for (let i = 0; i < BGANIM_MAT_IDS.length; i++) {
    const id = BGANIM_MAT_IDS[i];
    if (a.mats[id] !== b.mats[id]) return false;
  }
  for (let i = 0; i < BGANIM_KNOB_IDS.length; i++) {
    const id = BGANIM_KNOB_IDS[i];
    if (a.knobs[id] !== b.knobs[id]) return false;
  }
  for (let i = 0; i < BGANIM_MOTION_KNOBS.length; i++) {
    const k = BGANIM_MOTION_KNOBS[i];
    if (a.motionKnobs[k.motion][k.id] !== b.motionKnobs[k.motion][k.id]) return false;
  }
  return true;
}

function readUserBgAnimSnaps() {
  try {
    const raw = JSON.parse(bgAnimGet(BGANIM_SNAPS_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.map(clampBgAnimSnap).filter(Boolean).slice(0, BGANIM_SNAPS_MAX_USER);
  } catch (_) { return []; }
}

function persistUserBgAnimSnaps(list) {
  try { bgAnimSet(BGANIM_SNAPS_KEY, JSON.stringify(list)); } catch (_) {}
}

function listedBgAnimSnaps() {
  return BGANIM_FACTORY_SNAPS.map(cloneBgAnimSnap).concat(readUserBgAnimSnaps());
}

function findBgAnimSnap(id) {
  return listedBgAnimSnaps().find((s) => s && s.id === id) || null;
}

function activeBgAnimSnapId() {
  const cur = captureBgAnimSnapshot();
  const list = listedBgAnimSnaps();
  for (let i = 0; i < list.length; i++) {
    if (equalBgAnimSnap(cur, list[i])) return list[i].id;
  }
  return '';
}

function persistBgAnimSnapshotState(s) {
  persistBgAnimLook(s.look);
  BGANIM_MAT_IDS.forEach((id) => persistBgAnimMat(id, s.mats[id]));
  try { bgAnimSet(BGANIM_SNAP_OPACITY_KEY, String(s.opacity)); } catch (_) {}
  persistBgAnimWash(s.wash);
  try { bgAnimSet(BGANIM_SNAP_ANGLE_KEY, String(s.angle)); } catch (_) {}
  persistBgAnimCamera(s.camera);
  persistBgAnimAzimuth(s.azimuth);
  persistBgAnimShift(s.shift);
  BGANIM_SCALE_AXES.forEach((a) => persistBgAnimScaleAxis(a, s.scale[a]));
  BGANIM_KNOB_IDS.forEach((id) => persistBgAnimKnob(id, s.knobs[id]));
  persistBgAnimDotsColor(s.dotsColor);
  persistBgAnimDotsMotion(s.dotsMotion);
  BGANIM_MOTION_KNOBS.forEach((k) => persistBgAnimMotionKnob(k.motion, k.id, s.motionKnobs[k.motion][k.id]));
  persistBgAnimSpinDir(s.spin);
  persistBgAnimRungsMatch(s.rungsMatch);
  try { bgAnimSet(BGANIM_SNAP_STYLE_KEY, s.style); } catch (_) {}
  try { bgAnimSet(BGANIM_SNAP_ON_KEY, s.on ? '1' : '0'); } catch (_) {}
  try { bgAnimSet(BGANIM_SNAP_PAUSED_KEY, s.paused ? '1' : '0'); } catch (_) {}
}

function broadcastBgAnimSnapshotState(s) {
  try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-snapshot', { detail: s })); } catch (_) {}
  try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim', { detail: { on: s.on } })); } catch (_) {}
  try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-opacity', { detail: { opacity: s.opacity / 100 } })); } catch (_) {}
  broadcastBgAnimWash(s.wash);
  try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-angle', { detail: { angle: s.angle } })); } catch (_) {}
  broadcastBgAnimCamera(s.camera);
  broadcastBgAnimAzimuth(s.azimuth);
  broadcastBgAnimShift(s.shift);
  broadcastBgAnimScale(s.scale);
  BGANIM_KNOB_IDS.forEach((id) => broadcastBgAnimKnob(id, s.knobs[id]));
  broadcastBgAnimRungsMatch(s.rungsMatch);
  broadcastBgAnimDots({ color: s.dotsColor || '', motion: s.dotsMotion });
  BGANIM_MOTION_KNOBS.forEach((k) => broadcastBgAnimMotionKnob(k.motion, k.id, s.motionKnobs[k.motion][k.id]));
  broadcastBgAnimSpin(s.spin);
  broadcastBgAnimLook(s.look);
  BGANIM_MAT_IDS.forEach((id) => broadcastBgAnimMat(id, s.mats[id]));
  try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-paused', { detail: { paused: s.paused } })); } catch (_) {}
  try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-style', { detail: { style: s.style } })); } catch (_) {}
}

function applyBgAnimSnapshot(raw) {
  const s = clampBgAnimSnap(raw);
  if (!s) return;
  persistBgAnimSnapshotState(s);
  broadcastBgAnimSnapshotState(s);
}

function helixStudioEqualsPublished(cur) {
  if (!helixStudioPublished || !cur) return false;
  if (!equalBgAnimSnap(cur, helixStudioPublished)) return false;
  if (!!cur.on !== !!helixStudioPublished.on) return false;
  if (!!cur.paused !== !!helixStudioPublished.paused) return false;
  return true;
}

export function isHelixStudioOn() {
  return !!helixStudioDraft;
}

export function isHelixStudioDirty() {
  if (!helixStudioDraft || !helixStudioPublished) return false;
  return !helixStudioEqualsPublished(captureBgAnimSnapshot());
}

export function canHelixStudioUndo() {
  if (!helixStudioDraft) return false;
  return isHelixStudioDirty() || !!helixStudioUndo;
}

export function beginHelixStudio() {
  if (helixStudioDraft) return;
  helixStudioPublished = captureBgAnimSnapshot();
  helixStudioUndo = null;
  helixStudioDraft = new Map();
}

function flushHelixStudioDraftToStorage() {
  if (!helixStudioDraft) return;
  helixStudioDraft.forEach((val, key) => {
    try {
      if (val == null) localStorage.removeItem(key);
      else localStorage.setItem(key, val);
    } catch (_) {}
  });
}

const HELIX_INSTANCES_KEY = 'wise:chat-bg-anim-instances-v1';
const HELIX_INSTANCES_MAX = 16;

function helixInstanceStamp(ms) {
  try {
    return new Date(ms).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch (_) {
    return '';
  }
}

function clampHelixInstance(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const snap = clampBgAnimSnap(raw.snap);
  if (!snap) return null;
  const at = Number(raw.at) || Date.now();
  const name = String(raw.name || (raw.published ? 'Published' : 'Saved')).trim() || 'Saved';
  return {
    id: String(raw.id || ('i' + at.toString(36))),
    name,
    at,
    published: !!raw.published,
    snap,
  };
}

export function listHelixInstances() {
  try {
    const raw = JSON.parse(bgAnimGet(HELIX_INSTANCES_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.map(clampHelixInstance).filter(Boolean).slice(0, HELIX_INSTANCES_MAX);
  } catch (_) { return []; }
}

function persistHelixInstances(list) {
  try { bgAnimSet(HELIX_INSTANCES_KEY, JSON.stringify(list.slice(0, HELIX_INSTANCES_MAX))); } catch (_) {}
  try { document.dispatchEvent(new CustomEvent('wise:helix-instances')); } catch (_) {}
}

function recordHelixInstance(opts) {
  const snap = clampBgAnimSnap(opts && opts.snap ? opts.snap : captureBgAnimSnapshot());
  if (!snap) return null;
  const list = listHelixInstances();
  if (list[0] && equalBgAnimSnap(snap, list[0].snap) && !!list[0].published === !!opts.published) {
    return list[0];
  }
  const at = Date.now();
  const item = {
    id: 'i' + at.toString(36),
    name: String((opts && opts.name) || (opts && opts.published ? 'Published' : 'Saved')),
    at,
    published: !!(opts && opts.published),
    snap,
  };
  list.unshift(item);
  persistHelixInstances(list);
  return item;
}

export function saveHelixInstance(name) {
  return recordHelixInstance({
    name: name || 'Saved',
    published: false,
    snap: captureBgAnimSnapshot(),
  });
}

export function deleteHelixInstance(id) {
  if (!id) return false;
  const next = listHelixInstances().filter((x) => x.id !== id);
  persistHelixInstances(next);
  return true;
}

/* Load a saved look into the studio card. Does not publish — Apply still
   has to confirm twice before every other chat picks it up. */
export function revertHelixInstance(id) {
  const item = listHelixInstances().find((x) => x.id === id);
  if (!item) return false;
  applyBgAnimSnapshot(item.snap);
  syncHelixStudioChrome();
  return true;
}

export function formatHelixInstanceLabel(item) {
  if (!item) return '';
  const when = helixInstanceStamp(item.at);
  return item.name + (when ? (' · ' + when) : '');
}

function helixVerifyEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function closeHelixApplyVerify() {
  closeModal('hx-apply-verify');
}

function openHelixApplyVerify(cfg) {
  if (typeof document === 'undefined') return;
  closeHelixApplyVerify();
  const title = cfg && cfg.title ? cfg.title : 'Publish this Helix everywhere?';
  const first = cfg && cfg.first ? cfg.first : '';
  const second = cfg && cfg.second ? cfg.second : first;
  const confirmLabel = cfg && cfg.confirmLabel ? cfg.confirmLabel : 'Apply everywhere';
  const onConfirm = cfg && typeof cfg.onConfirm === 'function' ? cfg.onConfirm : null;

  const { scrim } = openModal({
    id: 'hx-apply-verify',
    extraScrimClass: 'dsc-ready-scrim',
    html: '',
  });

  function paint(step) {
    const isFirst = step === 1;
    scrim.innerHTML = modalHTML({
      eyebrow: isFirst ? 'Verify · 1 of 2' : 'Verify again · 2 of 2',
      title: helixVerifyEsc(title),
      titleId: 'hx-apply-verify-title',
      sub: helixVerifyEsc(isFirst ? first : second),
      closeAttrs: 'data-hx-verify="close" data-wise-modal-close',
      body: '<div class="dsc-ready-verify-steps" aria-hidden="true">'
        + '<span class="dsc-ready-verify-dot' + (isFirst ? ' is-on' : ' is-done') + '"></span>'
        + '<span class="dsc-ready-verify-dot' + (isFirst ? '' : ' is-on') + '"></span>'
        + '</div>'
        + '<div class="dsc-ready-verify-actions">'
        + '<button type="button" class="wise-btn wise-btn--ghost" data-hx-verify="close">Cancel</button>'
        + '<button type="button" class="wise-btn wise-btn--primary" data-hx-verify="' + (isFirst ? 'next' : 'confirm') + '">'
        + '<span class="material-symbols-outlined">' + (isFirst ? 'arrow_forward' : 'done') + '</span>'
        + (isFirst ? 'Continue' : helixVerifyEsc(confirmLabel))
        + '</button></div>',
    });
    const primary = scrim.querySelector('.wise-btn--primary');
    if (primary) {
      primary.style.fontVariationSettings = "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24";
      primary.focus();
    }
  }

  paint(1);
  scrim.addEventListener('click', (e) => {
    const act = e.target.closest('[data-hx-verify]');
    if (!act) return;
    const kind = act.getAttribute('data-hx-verify');
    if (kind === 'close') closeHelixApplyVerify();
    else if (kind === 'next') paint(2);
    else if (kind === 'confirm') {
      closeHelixApplyVerify();
      if (onConfirm) onConfirm();
    }
  });
}

function commitHelixStudioApply() {
  if (!helixStudioDraft || !isHelixStudioDirty()) return false;
  const next = captureBgAnimSnapshot();
  helixStudioUndo = cloneBgAnimSnap(helixStudioPublished);
  flushHelixStudioDraftToStorage();
  helixStudioPublished = cloneBgAnimSnap(next);
  helixStudioDraft.clear();
  broadcastBgAnimSnapshotState(next);
  recordHelixInstance({ name: 'Published', published: true, snap: next });
  syncHelixStudioChrome();
  return true;
}

/* Apply always asks twice before writing the look to every other chat.
   Pass { confirmed: true } only after the two-step verify (or tests). */
export function applyHelixStudio(opts) {
  if (!helixStudioDraft || !isHelixStudioDirty()) return false;
  if (opts && opts.confirmed) return commitHelixStudioApply();
  openHelixApplyVerify({
    title: 'Publish this Helix everywhere?',
    first: 'This look will become the Helix on every WISEcodeAI chat — this page and every other file that runs one.',
    second: 'Last check. Apply writes this Helix to every chat file. Undo can take the last published look back.',
    confirmLabel: 'Apply everywhere',
    onConfirm: () => commitHelixStudioApply(),
  });
  return 'pending';
}

export function undoHelixStudio() {
  if (!helixStudioDraft) return false;
  if (isHelixStudioDirty()) {
    helixStudioDraft.clear();
    persistBgAnimSnapshotState(helixStudioPublished);
    helixStudioDraft.clear();
    broadcastBgAnimSnapshotState(helixStudioPublished);
    syncHelixStudioChrome();
    return true;
  }
  if (!helixStudioUndo) return false;
  const restore = cloneBgAnimSnap(helixStudioUndo);
  helixStudioUndo = null;
  helixStudioDraft = null;
  persistBgAnimSnapshotState(restore);
  helixStudioDraft = new Map();
  helixStudioPublished = cloneBgAnimSnap(restore);
  broadcastBgAnimSnapshotState(restore);
  syncHelixStudioChrome();
  return true;
}

function syncHelixStudioChrome() {
  if (typeof document === 'undefined') return;
  const dirty = isHelixStudioDirty();
  const canUndo = canHelixStudioUndo();
  document.querySelectorAll('.sc-helix-studio-bar').forEach((bar) => {
    const apply = bar.querySelector('.sc-helix-apply');
    const undo = bar.querySelector('.sc-helix-undo');
    if (apply) {
      apply.disabled = !dirty;
      apply.setAttribute('aria-disabled', dirty ? 'false' : 'true');
    }
    if (undo) {
      undo.disabled = !canUndo;
      undo.setAttribute('aria-disabled', canUndo ? 'false' : 'true');
    }
    bar.classList.toggle('is-dirty', dirty);
  });
}

function mountHelixStudioBar(root) {
  if (!helixStudioDraft || !root) return;
  const host = root.querySelector ? (root.querySelector('.sc-menu-group--helix') || root) : root;
  if (!host || !host.appendChild) return;
  let bar = host.querySelector('.sc-helix-studio-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'sc-helix-studio-bar';
    bar.innerHTML =
      '<button type="button" class="sc-helix-undo" disabled aria-disabled="true" aria-label="Undo" data-tip="Restore the last published Helix">' +
        '<span class="material-symbols-outlined" aria-hidden="true">undo</span>' +
      '</button>' +
      '<button type="button" class="sc-helix-save" aria-label="Save instance" data-tip="Save this Helix as an instance you can revert to">' +
        '<span class="material-symbols-outlined" aria-hidden="true">bookmark</span>' +
      '</button>' +
      '<button type="button" class="sc-helix-apply wise-btn wise-btn--primary" disabled aria-disabled="true">' +
        '<span class="material-symbols-outlined" aria-hidden="true">done</span>Apply' +
      '</button>';
    host.appendChild(bar);
    const applyBtn = bar.querySelector('.sc-helix-apply');
    const undoBtn = bar.querySelector('.sc-helix-undo');
    const saveBtn = bar.querySelector('.sc-helix-save');
    if (applyBtn) applyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      applyHelixStudio();
    });
    if (undoBtn) undoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      undoHelixStudio();
    });
    if (saveBtn) saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      saveHelixInstance('Saved');
    });
  }
  syncHelixStudioChrome();
}

function openHelixStudioFloat(pop, chatEl) {
  if (!pop) return null;
  groupifyChatMenu(pop);
  pop.setAttribute('data-admin-demo', 'on');
  applyChatMenuAdminGate(pop);
  const group = queryChatMenu(pop, '.sc-menu-group--helix');
  if (!group) return null;
  popOutHelixColumn(group, pop);
  const shell = helixFloatForPop(pop);
  if (!shell) return null;
  shell.setAttribute('data-admin-demo', 'on');
  shell.setAttribute('data-helix-studio', '1');
  applyChatMenuAdminGate(shell);
  mountHelixStudioBar(shell);
  const r = chatEl && chatEl.getBoundingClientRect ? chatEl.getBoundingClientRect() : { right: 420, top: 72 };
  const w = shell.offsetWidth || 460;
  const left = Math.max(16, Math.min((r.right || 420) - 36, window.innerWidth - w - 20));
  clampHelixFloat(shell, left, Math.max(16, (r.top || 72) + 48));
  return shell;
}

function saveCurrentBgAnimSnap() {
  const cur = captureBgAnimSnapshot();
  const listed = listedBgAnimSnaps();
  if (listed.some((s) => equalBgAnimSnap(cur, s))) return listed;
  const users = readUserBgAnimSnaps();
  if (users.length >= BGANIM_SNAPS_MAX_USER) users.shift();
  const n = users.length + 1;
  const saved = clampBgAnimSnap(Object.assign({}, cur, {
    id: 'u' + Date.now().toString(36),
    name: 'Saved ' + n,
    builtIn: false,
  }));
  users.push(saved);
  persistUserBgAnimSnaps(users);
  return listedBgAnimSnaps();
}

function deleteUserBgAnimSnap(id) {
  if (!id || BGANIM_FACTORY_SNAPS.some((s) => s.id === id)) return;
  persistUserBgAnimSnaps(readUserBgAnimSnaps().filter((s) => s.id !== id));
}

function bgAnimSnapshotsChromeHtml() {
  return `${bgAnimSubheadHtml('Load')}
          <div class="sc-bganim-snapshots">
            <div class="sc-bganim-snap-list" role="list" aria-label="Helix snapshots"></div>
            <button type="button" class="sc-bganim-snap-save" data-sc="bg-anim-snap-save" title="Save the current Helix look so you can reload it later">Save</button>
          </div>`;
}

function ensureBgAnimSnapshotsChrome(pop) {
  if (!pop) return;
  const host = queryChatMenu(pop, '.sc-menu-group--helix') || pop;
  if (host.querySelector('.sc-bganim-snapshots')) {
    host.querySelectorAll('.sc-bganim-subhead').forEach((el) => {
      if ((el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase() === 'snapshots') {
        el.textContent = 'Load';
      }
    });
    host.querySelectorAll('.sc-bganim-snapshots > .sc-bganim-style-label').forEach((el) => el.remove());
    return;
  }
  const html = bgAnimSnapshotsChromeHtml();
  const anim = host.querySelector('[data-sc="bg-anim"]');
  if (anim) { anim.insertAdjacentHTML('afterend', html); return; }
  const look = host.querySelector('.sc-bganim-look');
  if (look) { look.insertAdjacentHTML('beforebegin', html); return; }
  const style = host.querySelector('.sc-bganim-style');
  if (style) { style.insertAdjacentHTML('beforebegin', html); }
}

function renderBgAnimSnapList(root) {
  root = liveBgAnimRoot(root);
  if (!root) return;
  const list = root.querySelector('.sc-bganim-snap-list');
  if (!list) return;
  const active = activeBgAnimSnapId();
  const snaps = listedBgAnimSnaps();
  list.innerHTML = snaps.map((s) => {
    const on = s.id === active;
    const del = s.builtIn ? ''
      : `<button type="button" class="sc-bganim-snap-del" data-snap="${s.id}" aria-label="Delete ${s.name}" title="Delete this snapshot"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>`;
    return `<span class="sc-bganim-snap-chip">`
      + `<button type="button" class="sc-stream-seg-btn${on ? ' is-on' : ''}" data-sc="bg-anim-snap" data-snap="${s.id}" role="listitem" aria-pressed="${on ? 'true' : 'false'}" title="Load ${s.name}">${s.name}</button>`
      + del
      + `</span>`;
  }).join('');
}

function syncBgAnimSnapshots(root) {
  renderBgAnimSnapList(root);
}

function syncAllBgAnimSnapshots() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.sc-bganim-snapshots').forEach((el) => {
    const host = el.closest('.sc-helix-float, .topbar-popover, .sc-menu-grouped') || el;
    renderBgAnimSnapList(host);
  });
}

function wireBgAnimSnapshotsChrome(root) {
  if (!root) return;
  if (typeof document !== 'undefined' && !document.__wiseBgAnimSnapWired) {
    document.__wiseBgAnimSnapWired = true;
    document.addEventListener('wise:chat-bg-anim-snapshot', syncAllBgAnimSnapshots);
  }
  const el = root.querySelector('.sc-bganim-snapshots');
  if (!el || el.__bgAnimWired) return;
  el.__bgAnimWired = true;
  el.addEventListener('click', (e) => {
    const del = e.target.closest('.sc-bganim-snap-del');
    if (del) {
      e.preventDefault();
      e.stopPropagation();
      deleteUserBgAnimSnap(del.getAttribute('data-snap'));
      syncAllBgAnimSnapshots();
      return;
    }
    const save = e.target.closest('[data-sc="bg-anim-snap-save"]');
    if (save) {
      e.preventDefault();
      e.stopPropagation();
      saveCurrentBgAnimSnap();
      syncAllBgAnimSnapshots();
      return;
    }
    const btn = e.target.closest('[data-sc="bg-anim-snap"]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const snap = findBgAnimSnap(btn.getAttribute('data-snap'));
    if (snap) applyBgAnimSnapshot(snap);
  });
  renderBgAnimSnapList(root);
}

/* One shared sync + wire pair for the scale and knob rows, used by BOTH the
   mounted module and wireStandardChatMenu() so every surface runs identical
   slider behavior instead of two hand-kept copies. */
function bgAnimScaleCommonPct(axes) {
  return (axes.x === axes.y && axes.y === axes.z) ? axes.x : null;
}

function bgAnimScaleAveragePct(axes) {
  return clampBgAnimScalePct(Math.round((axes.x + axes.y + axes.z) / 3));
}

function syncBgAnimScaleRows(root, axes) {
  root = liveBgAnimRoot(root);
  if (!root) return;
  root.querySelectorAll('.sc-bganim-scale-range').forEach((range) => {
    const val = range.parentElement && range.parentElement.querySelector('.sc-bganim-scale-val');
    const axis = range.dataset.axis;
    if (axis === 'all') {
      const common = bgAnimScaleCommonPct(axes);
      const shown = common == null ? bgAnimScaleAveragePct(axes) : common;
      if (document.activeElement !== range) range.value = String(bgAnimPctToStop(shown));
      if (val) {
        /* While dragging, show the live target so the thumb's stop is readable
           even when the axes still disagree (and would otherwise read "—"). */
        if (document.activeElement === range) val.textContent = bgAnimStopToPct(range.value) + '%';
        else val.textContent = common == null ? '—' : common + '%';
      }
      return;
    }
    if (!axis || !(axis in axes)) return;
    if (document.activeElement !== range) range.value = String(bgAnimPctToStop(axes[axis]));
    if (val) val.textContent = axes[axis] + '%';
  });
}

function clearBgAnimScaleDragBase(range) {
  if (range) delete range.__scaleDragBase;
}

function wireBgAnimScaleRows(root, axes, onChange) {
  if (!root) return;
  root.querySelectorAll('.sc-bganim-scale-range').forEach((range) => {
    if (range.__bgAnimWired) return;
    range.__bgAnimWired = true;
    const endDrag = () => clearBgAnimScaleDragBase(range);
    range.addEventListener('pointerup', endDrag);
    range.addEventListener('pointercancel', endDrag);
    range.addEventListener('blur', endDrag);
    range.addEventListener('change', endDrag);
    range.addEventListener('input', () => {
      const axis = range.dataset.axis;
      const pct = bgAnimStopToPct(range.value);
      if (axis === 'all') {
        /* Multiply the pose that was already set — never flatten X/Y/Z to the
           same absolute %. Capture the baseline once per drag so each input
           step is relative to the start, not compounded from the last tick. */
        if (!range.__scaleDragBase) {
          range.__scaleDragBase = {
            x: axes.x,
            y: axes.y,
            z: axes.z,
            master: Math.max(1, bgAnimScaleAveragePct(axes)),
          };
        }
        const base = range.__scaleDragBase;
        const factor = pct / base.master;
        BGANIM_SCALE_AXES.forEach((a) => {
          axes[a] = clampBgAnimScalePct(Math.round(base[a] * factor));
        });
      } else if (axis && axis in axes) {
        clearBgAnimScaleDragBase(range);
        axes[axis] = pct;
      } else return;
      BGANIM_SCALE_AXES.forEach((a) => persistBgAnimScaleAxis(a, axes[a]));
      broadcastBgAnimScale(axes, axis === 'all' ? '' : axis);
      syncBgAnimScaleRows(root, axes);
      if (typeof onChange === 'function') onChange();
    });
  });
}

function syncBgAnimKnobRows(root, knobs) {
  root = liveBgAnimRoot(root);
  if (!root) return;
  root.querySelectorAll('.sc-bganim-knob-range').forEach((range) => {
    const id = range.dataset.knob;
    if (!id || !(id in knobs)) return;
    if (document.activeElement !== range) range.value = String(bgAnimPctToStop(knobs[id]));
    const val = range.parentElement && range.parentElement.querySelector('.sc-bganim-knob-val');
    if (val) val.textContent = knobs[id] + '%';
  });
}

function wireBgAnimKnobRows(root, knobs, onChange) {
  if (!root) return;
  root.querySelectorAll('.sc-bganim-knob-range').forEach((range) => {
    if (range.__bgAnimWired) return;
    range.__bgAnimWired = true;
    range.addEventListener('input', () => {
      const id = range.dataset.knob;
      if (!id || !(id in knobs)) return;
      const pct = bgAnimStopToPct(range.value);
      knobs[id] = pct;
      persistBgAnimKnob(id, pct);
      broadcastBgAnimKnob(id, pct);
      syncBgAnimKnobRows(root, knobs);
      if (typeof onChange === 'function') onChange();
    });
  });
}

/* Pin rungs 1:1 with product circles. Empty (off) keeps the Rungs slider;
   Match writes the shared flag so every chat's strand snaps to the node stride.
   Dragging Rungs turns Match off, same as picking a colour turns colour-Match off. */
const BGANIM_RUNGS_MATCH_KEY = 'wise:chat-bg-anim-rungs-match';

export function readBgAnimRungsMatch() {
  try {
    const s = bgAnimGet(BGANIM_RUNGS_MATCH_KEY);
    if (s === '1') return true;
    if (s === '0') return false;
  } catch (_) {}
  return !!BGANIM_PUBLISH_POSE.rungsMatch;
}

function persistBgAnimRungsMatch(on) {
  try {
    if (on) bgAnimSet(BGANIM_RUNGS_MATCH_KEY, '1');
    else bgAnimRemove(BGANIM_RUNGS_MATCH_KEY);
  } catch (_) {}
}

function broadcastBgAnimRungsMatch(on) {
  try {
    document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-rungs-match', { detail: { match: !!on } }));
  } catch (_) {}
}

function ensureBgAnimRungsMatch(pop) {
  if (!pop) return;
  const row = pop.querySelector('.sc-bganim-knob-rungs');
  if (!row || row.querySelector('.sc-bganim-rungs-match')) return;
  row.insertAdjacentHTML('beforeend',
    '<button type="button" class="sc-bganim-rungs-match" aria-label="Match rungs to nodes" title="One cross-line at each product circle">Match</button>');
}

function syncBgAnimRungsMatch(root, matching, knobs) {
  root = liveBgAnimRoot(root);
  if (!root) return;
  const row = root.querySelector('.sc-bganim-knob-rungs');
  if (!row) return;
  row.classList.toggle('is-matched', !!matching);
  const btn = row.querySelector('.sc-bganim-rungs-match');
  if (btn) btn.classList.toggle('is-on', !!matching);
  const val = row.querySelector('.sc-bganim-knob-val');
  if (val && matching) val.textContent = 'nodes';
  else if (val && knobs && knobs.rungs != null) val.textContent = knobs.rungs + '%';
}

function wireBgAnimRungsMatch(root, getMatch, setMatch, knobs, onChange) {
  if (!root) return;
  ensureBgAnimRungsMatch(root);
  const btn = root.querySelector('.sc-bganim-rungs-match');
  if (btn && !btn.__bgAnimWired) {
    btn.__bgAnimWired = true;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (getMatch()) return;
      setMatch(true);
      persistBgAnimRungsMatch(true);
      broadcastBgAnimRungsMatch(true);
      syncBgAnimRungsMatch(root, true, knobs);
      if (typeof onChange === 'function') onChange();
    });
  }
  const range = root.querySelector('.sc-bganim-knob-rungs .sc-bganim-knob-range');
  if (range && !range.__bgAnimRungsMatchWired) {
    range.__bgAnimRungsMatchWired = true;
    range.addEventListener('input', () => {
      if (!getMatch()) return;
      setMatch(false);
      persistBgAnimRungsMatch(false);
      broadcastBgAnimRungsMatch(false);
      syncBgAnimRungsMatch(root, false, knobs);
    });
  }
}

/* Camera — elevation (above / below) plus azimuth (around the coil) so the
   view can sit on any 3-D side, not just a tilt from the top. Shared app-wide. */
const BGANIM_CAMERA_KEY = 'wise:chat-bg-anim-camera';
const BGANIM_CAMERA_DEFAULT = BGANIM_PUBLISH_POSE.camera;
const BGANIM_CAMERA_MIN = -90;
const BGANIM_CAMERA_MAX = 90;
const BGANIM_AZIMUTH_KEY = 'wise:chat-bg-anim-azimuth';
const BGANIM_AZIMUTH_DEFAULT = BGANIM_PUBLISH_POSE.azimuth;
const BGANIM_AZIMUTH_MIN = -180;
const BGANIM_AZIMUTH_MAX = 180;
const BGANIM_SHIFT_KEY = 'wise:chat-bg-anim-shift';
const BGANIM_SHIFT_DEFAULT = BGANIM_PUBLISH_POSE.shift;
const BGANIM_SHIFT_MIN = -100;
const BGANIM_SHIFT_MAX = 100;

function clampBgAnimCamera(n) {
  const v = Number(n);
  return Number.isFinite(v)
    ? Math.max(BGANIM_CAMERA_MIN, Math.min(BGANIM_CAMERA_MAX, Math.round(v)))
    : BGANIM_CAMERA_DEFAULT;
}

function clampBgAnimAzimuth(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return BGANIM_AZIMUTH_DEFAULT;
  let d = Math.round(v);
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return Math.max(BGANIM_AZIMUTH_MIN, Math.min(BGANIM_AZIMUTH_MAX, d));
}

function clampBgAnimShift(n) {
  const v = Number(n);
  return Number.isFinite(v)
    ? Math.max(BGANIM_SHIFT_MIN, Math.min(BGANIM_SHIFT_MAX, Math.round(v)))
    : BGANIM_SHIFT_DEFAULT;
}

export function readBgAnimCamera() {
  try {
    const s = parseInt(bgAnimGet(BGANIM_CAMERA_KEY), 10);
    if (!isNaN(s)) return clampBgAnimCamera(s);
  } catch (_) {}
  return BGANIM_CAMERA_DEFAULT;
}

export function readBgAnimAzimuth() {
  try {
    const s = parseInt(bgAnimGet(BGANIM_AZIMUTH_KEY), 10);
    if (!isNaN(s)) return clampBgAnimAzimuth(s);
  } catch (_) {}
  return BGANIM_AZIMUTH_DEFAULT;
}

export function readBgAnimShift() {
  try {
    const s = parseInt(bgAnimGet(BGANIM_SHIFT_KEY), 10);
    if (!isNaN(s)) return clampBgAnimShift(s);
  } catch (_) {}
  return BGANIM_SHIFT_DEFAULT;
}

function persistBgAnimCamera(deg) {
  try { bgAnimSet(BGANIM_CAMERA_KEY, String(deg)); } catch (_) {}
}

function persistBgAnimAzimuth(deg) {
  try { bgAnimSet(BGANIM_AZIMUTH_KEY, String(deg)); } catch (_) {}
}

function persistBgAnimShift(pct) {
  try { bgAnimSet(BGANIM_SHIFT_KEY, String(pct)); } catch (_) {}
}

function broadcastBgAnimCamera(deg) {
  try {
    document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-camera', { detail: { camera: deg } }));
  } catch (_) {}
}

function broadcastBgAnimAzimuth(deg) {
  try {
    document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-azimuth', { detail: { azimuth: deg } }));
  } catch (_) {}
}

function broadcastBgAnimShift(pct) {
  try {
    document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-shift', { detail: { shift: pct } }));
  } catch (_) {}
}

function bgAnimCameraRowHtml() {
  return `<div class="sc-bganim-detail sc-bganim-camera" data-helix-only="1">
            <span class="sc-bganim-detail-label">Camera</span>
            <input type="range" class="sc-bganim-camera-range" min="${BGANIM_CAMERA_MIN}" max="${BGANIM_CAMERA_MAX}" step="1" value="${BGANIM_CAMERA_DEFAULT}" aria-label="Helix camera elevation" title="Look at the strand from above or below">
            <span class="sc-bganim-camera-val">${BGANIM_CAMERA_DEFAULT}°</span>
          </div>`;
}

function bgAnimAzimuthRowHtml() {
  return `<div class="sc-bganim-detail sc-bganim-azimuth" data-helix-only="1">
            <span class="sc-bganim-detail-label">Side</span>
            <input type="range" class="sc-bganim-azimuth-range" min="${BGANIM_AZIMUTH_MIN}" max="${BGANIM_AZIMUTH_MAX}" step="1" value="${BGANIM_AZIMUTH_DEFAULT}" aria-label="Helix camera side" title="Look at the strand from the left, right, front or back">
            <span class="sc-bganim-azimuth-val">${BGANIM_AZIMUTH_DEFAULT}°</span>
          </div>`;
}

function bgAnimShiftRowHtml() {
  return `<div class="sc-bganim-detail sc-bganim-shift" data-helix-only="1">
            <span class="sc-bganim-detail-label">Shift</span>
            <input type="range" class="sc-bganim-shift-range" min="${BGANIM_SHIFT_MIN}" max="${BGANIM_SHIFT_MAX}" step="1" value="${BGANIM_SHIFT_DEFAULT}" aria-label="Helix left-right shift" title="Slide the strand left or right">
            <span class="sc-bganim-shift-val">${BGANIM_SHIFT_DEFAULT}%</span>
          </div>`;
}

function ensureBgAnimSubheads(pop) {
  if (!pop || pop.querySelector('.sc-bganim-subhead')) return;
  const opacity = pop.querySelector('.sc-bganim-opacity');
  if (opacity && opacity.closest('.sc-bganim-detail')) {
    opacity.closest('.sc-bganim-detail').insertAdjacentHTML('beforebegin', bgAnimSubheadHtml('View'));
  }
  const scale = pop.querySelector('.sc-bganim-scale-all') || pop.querySelector('.sc-bganim-scale');
  if (scale) scale.insertAdjacentHTML('beforebegin', bgAnimSubheadHtml('Size'));
  const dots = pop.querySelector('.sc-bganim-knob-dots');
  if (dots) dots.insertAdjacentHTML('beforebegin', bgAnimSubheadHtml('Beads', true));
  const pitch = pop.querySelector('.sc-bganim-knob-pitch');
  if (pitch) pitch.insertAdjacentHTML('beforebegin', bgAnimSubheadHtml('Strand', true));
  const style = pop.querySelector('.sc-bganim-style');
  if (style) style.insertAdjacentHTML('beforebegin', bgAnimSubheadHtml('Field'));
}

function ensureBgAnimCameraRow(pop) {
  if (!pop) return;
  ensureBgAnimWashRow(pop);
  if (!pop.querySelector('.sc-bganim-camera')) {
    const html = bgAnimCameraRowHtml();
    const angle = pop.querySelector('.sc-bganim-angle');
    if (angle) angle.insertAdjacentHTML('afterend', html);
    else {
      const opacity = pop.querySelector('.sc-bganim-detail:not(.sc-bganim-scale):not(.sc-bganim-knob)');
      if (opacity) opacity.insertAdjacentHTML('afterend', html);
      else {
        const style = pop.querySelector('.sc-bganim-style');
        const playback = pop.querySelector('.sc-bganim-playback');
        if (style) style.insertAdjacentHTML('beforebegin', html);
        else if (playback) playback.insertAdjacentHTML('beforebegin', html);
      }
    }
  }
  pop.querySelectorAll('.sc-bganim-camera-range').forEach((r) => {
    r.min = String(BGANIM_CAMERA_MIN);
    r.max = String(BGANIM_CAMERA_MAX);
  });
  if (!pop.querySelector('.sc-bganim-azimuth')) {
    const html = bgAnimAzimuthRowHtml();
    const camera = pop.querySelector('.sc-bganim-camera');
    if (camera) camera.insertAdjacentHTML('afterend', html);
  }
  if (!pop.querySelector('.sc-bganim-shift')) {
    const html = bgAnimShiftRowHtml();
    const azimuth = pop.querySelector('.sc-bganim-azimuth');
    if (azimuth) azimuth.insertAdjacentHTML('afterend', html);
    else {
      const camera = pop.querySelector('.sc-bganim-camera');
      if (camera) camera.insertAdjacentHTML('afterend', html);
    }
  }
  pop.querySelectorAll('.sc-bganim-shift-range').forEach((r) => {
    r.min = String(BGANIM_SHIFT_MIN);
    r.max = String(BGANIM_SHIFT_MAX);
  });
}

/* Angle, Camera, Pitch, Dots, Length, Rungs, Bar, Thick and Depth describe the
   STRAND, so they hide while Orbit is the chosen style. Scale (all four rows)
   and Nodes apply to both fields. */
function syncBgAnimHelixOnlyRows(root, isHelix) {
  root = liveBgAnimRoot(root);
  if (!root) return;
  const angle = root.querySelector('.sc-bganim-angle');
  if (angle) angle.hidden = !isHelix;
  const camera = root.querySelector('.sc-bganim-camera');
  if (camera) camera.hidden = !isHelix;
  const azimuth = root.querySelector('.sc-bganim-azimuth');
  if (azimuth) azimuth.hidden = !isHelix;
  const shift = root.querySelector('.sc-bganim-shift');
  if (shift) shift.hidden = !isHelix;
  root.querySelectorAll('.sc-bganim-knob').forEach((el) => {
    el.hidden = !isHelix && el.dataset.helixOnly === '1';
  });
  root.querySelectorAll('.sc-bganim-dots-color, .sc-bganim-dots-motion, .sc-bganim-spin, .sc-bganim-look').forEach((el) => {
    el.hidden = !isHelix;
  });
  if (!isHelix) {
    root.querySelectorAll('.sc-bganim-mat').forEach((el) => { el.hidden = true; });
    root.querySelectorAll('.sc-bganim-cluster').forEach((c) => {
      const head = c.querySelector(':scope > .sc-bganim-subhead');
      const label = (head && head.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (label === 'finish') c.hidden = true;
    });
  }
  /* Pulse / Spark knobs stay hidden on Orbit. Showing the matching motion's
     rows is owned by syncBgAnimMotionKnobRows — this only force-hides. */
  if (!isHelix) {
    root.querySelectorAll('.sc-bganim-motion-knob').forEach((el) => { el.hidden = true; });
  }
  root.querySelectorAll('.sc-bganim-subhead').forEach((el) => {
    if (el.dataset.helixOnly === '1') el.hidden = !isHelix;
  });
  root.querySelectorAll('.sc-bganim-cluster').forEach((el) => {
    if (el.dataset.helixOnly === '1') el.hidden = !isHelix;
  });
  root.querySelectorAll('.sc-bganim-scale').forEach((el) => { el.hidden = false; });
}

function broadcastBgAnimScale(axes, axis) {
  try {
    document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-scale', {
      detail: {
        axis: axis || '',
        scaleX: axes.x / 100,
        scaleY: axes.y / 100,
        scaleZ: axes.z / 100,
        scale: (axes[axis] || axes.y) / 100,
      },
    }));
  } catch (_) {}
}

function applyScaleEventToAxes(axes, detail) {
  if (!detail || !axes) return false;
  let changed = false;
  if (typeof detail.scaleX === 'number') {
    axes.x = clampBgAnimScalePct(Math.round(detail.scaleX * 100));
    changed = true;
  }
  if (typeof detail.scaleY === 'number') {
    axes.y = clampBgAnimScalePct(Math.round(detail.scaleY * 100));
    changed = true;
  }
  if (typeof detail.scaleZ === 'number') {
    axes.z = clampBgAnimScalePct(Math.round(detail.scaleZ * 100));
    changed = true;
  }
  if (!changed && typeof detail.scale === 'number') {
    const axis = (detail.axis === 'x' || detail.axis === 'z') ? detail.axis : 'y';
    axes[axis] = clampBgAnimScalePct(Math.round(detail.scale * 100));
    changed = true;
  }
  return changed;
}

/* ------------------------------------------------------------------ */
/* Welcome "Background animation" — DNA/RNA product helix (shared)     */
/* ------------------------------------------------------------------ */
/* Extracted to module scope + parameterized so EVERY chat surface — the
   shared mountWISEcodeAIChat() module AND the hand-rolled inline chats
   (product comparison / portfolio, guiding-stars report, …) — runs the
   exact same ambient field. cfg:
     host          {el}   gets `sc-bganim-live` while the field is live
     getBody       {fn}   () => element the canvas mounts into (chat body)
     getOpacity    {fn}   () => 0.1–1 field opacity (the shared slider)
     getAngle      {fn}   () => helix axis tilt in degrees (−90…90; default 10).
                          Positive tilts the strand down toward the right.
     getCamera     {fn}   () => view elevation in degrees (−90…90; default 0).
                          90 looks straight down from above, −90 from below.
     getAzimuth    {fn}   () => view yaw in degrees (−180…180; default 0).
                          Spins the look-from around the coil so every side
                          (left, right, front, back) is reachable.
                          Pitches the corkscrew toward the viewer — looking more
                          from above (positive) or below (negative) — without
                          changing the axis Angle.
     getShift      {fn}   () => screen-space left/right pan (−100…100; default 0).
                          Independent of Angle / Camera / Side: +100 slides the
                          strand toward the right edge of the pane. Dragging
                          the welcome field left or right writes the same value.
     getScale      {fn}   () => { x, y, z } multipliers (0.01–8; default 1)
                          stretching — or pinching — the helix from its centre
                          on each axis. 1 is the original strand, not a floor.
                          A legacy number is applied uniformly to all three.
     getPitch      {fn}   () => coil-pitch multiplier (0.01–8; default 1). Low
                          twists the strand tight; high opens the loops out.
     getNodes      {fn}   () => circle-size multiplier (0.01–8; default 1) for
                          the product photos and owl bugs on the strand.
     getDots       {fn}   () => size multiplier (0.01–8; default 1) for the
                          small beads that sit on the strand between those
                          product circles.
     getDotsColor  {fn}   () => '#rrggbb' or '' (empty = match the strand).
     getDotsMotion {fn}   () => 'still' | 'pulse' | 'spark'
     getMotionKnob {fn}   (motion, id) => 0.01–8 multiplier for that
                          motion's own knobs (pulse: speed, size;
                          pulse / spark: speed, length, size). 1 is the original.
     getSpinDir    {fn}   () => 1 (forward) or -1 (reverse)
     getSpinSpeed  {fn}   () => twist-speed multiplier (0.01–8; default 1)
     getLength     {fn}   () => strand-length multiplier (0.01–8; default 1) —
                          how far the helix runs across the pane.
     getRungs      {fn}   () => rung-count multiplier (0.01–8; default 1).
                          How many cross-lines between the two strands;
                          1 is the original couple per turn. Ignored while
                          getRungsMatch is true.
     getRungsMatch {fn}   () => true pins one rung to each product-circle
                          pair (the node stride).
     getRungThick  {fn}   () => rung stroke-weight multiplier (0.01–8;
                          default 1). Independent of backbone thickness.
     getThickness  {fn}   () => backbone stroke-weight multiplier
                          (0.01–8; default 1). Low is a hairline; high paints
                          fat tubes. Does not move the rungs.
     getDepth      {fn}   () => 3-D pop multiplier (0.01–8; default 1). Low
                          flattens shade + perspective; high pushes near
                          loops forward and fades the back. Independent of
                          Scale Z, which is coil volume.
     reducedMotion {bool} paint a single still frame instead of animating
     isOn          {fn}   () => whether the shared preference is ON
     isPaused      {fn}   () => whether the (shared) playback is paused —
                          when true the field freezes on its current frame
                          rather than advancing (the canvas stays visible).
                          Hovering a product circle also freezes locally
                          until the pointer leaves that popover; that hold
                          does not flip the shared Play/Pause preference.
     getDensity    {fn}   () => 'full' (default roster) or 'ten' (same node
                          density; ~10 foods swell a bit larger; every other
                          circle is the WISE owl logo bug)
     fillHost      {bool} chat welcome only — grow a steep strand so its
                          faded tips reach the host's top and bottom (the
                          Length knob can still run it longer). Pairs with
                          the --fill canvas mask that fades behind copy.
   Returns { start, stop, pause, resume, redraw }.
     stop() blooms the field out (fade + expand). Pass { immediate: true }
     to tear down without the leave (history restore, style swap). */
/* Keep the strand's visual centre in the chat body (the published 0.36)
   after the canvas remounts on the full card. Without this, 0.36 of the
   taller card (header + body + composer) would pull the helix down. */
function helixFillCenterY(host) {
  if (!host || !host.getBoundingClientRect) return 0.36;
  const body = host.querySelector('.sc-body, .ap-chat-body');
  if (!body || body === host) return 0.36;
  try {
    const cr = host.getBoundingClientRect();
    const br = body.getBoundingClientRect();
    if (cr.height < 8) return 0.36;
    return (br.top - cr.top + br.height * 0.36) / cr.height;
  } catch (_) { return 0.36; }
}

export function createHelixBgAnim(cfg) {
  const host = cfg.host;
  const getBody = cfg.getBody;
  const getOpacity = cfg.getOpacity;
  const HELIX_ANGLE_DEFAULT = BGANIM_PUBLISH_POSE.angle;
  const getAngle = () => {
    const raw = typeof cfg.getAngle === 'function' ? cfg.getAngle() : HELIX_ANGLE_DEFAULT;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(-90, Math.min(90, n)) : HELIX_ANGLE_DEFAULT;
  };
  const HELIX_CAMERA_DEFAULT = 0;
  const getCamera = () => {
    const raw = typeof cfg.getCamera === 'function' ? cfg.getCamera() : HELIX_CAMERA_DEFAULT;
    return clampBgAnimCamera(raw);
  };
  const getAzimuth = () => {
    const raw = typeof cfg.getAzimuth === 'function' ? cfg.getAzimuth() : BGANIM_AZIMUTH_DEFAULT;
    return clampBgAnimAzimuth(raw);
  };
  /* Screen-space pan. 0 is centred; ±100 is ~48% of the pane width. A live
     drag holds `dragShift` so a lagged host read cannot snap the strand back. */
  const SHIFT_SPAN = 0.48;
  let dragShift = null;
  let pan = null;
  const getShift = () => {
    if (dragShift != null) return dragShift;
    const raw = typeof cfg.getShift === 'function' ? cfg.getShift() : readBgAnimShift();
    return clampBgAnimShift(raw);
  };
  const HELIX_SCALE_DEFAULT = 1;
  const clampScaleMul = (n) => (Number.isFinite(n) ? Math.max(BGANIM_PCT_MIN / 100, Math.min(BGANIM_PCT_MAX / 100, n)) : HELIX_SCALE_DEFAULT);
  const getScaleAxes = () => {
    const raw = typeof cfg.getScale === 'function' ? cfg.getScale() : HELIX_SCALE_DEFAULT;
    if (raw && typeof raw === 'object') {
      return {
        x: clampScaleMul(Number(raw.x)),
        y: clampScaleMul(Number(raw.y)),
        z: clampScaleMul(Number(raw.z)),
      };
    }
    const n = clampScaleMul(Number(raw));
    return { x: n, y: n, z: n };
  };
  /* Shape knobs — pitch, node size, strand length, stroke weight and 3-D pop.
     Same 0.01–8 window as the axes so a host can push the field well past its
     default look in either direction. */
  const knobMul = (fn) => clampScaleMul(Number(typeof fn === 'function' ? fn() : HELIX_SCALE_DEFAULT));
  const getPitchMul = () => knobMul(cfg.getPitch);
  const getNodesMul = () => knobMul(cfg.getNodes);
  const getDotsMul = () => knobMul(cfg.getDots);
  const getLengthMul = () => knobMul(cfg.getLength);
  const getRungsMul = () => knobMul(cfg.getRungs);
  const getRungsMatch = () => (typeof cfg.getRungsMatch === 'function' ? !!cfg.getRungsMatch() : false);
  const getRungThickMul = () => knobMul(cfg.getRungThick);
  const getThicknessMul = () => knobMul(cfg.getThickness);
  const getDepthMul = () => knobMul(cfg.getDepth);
  const getDotsColorHex = () => {
    const raw = typeof cfg.getDotsColor === 'function' ? cfg.getDotsColor() : '';
    return normalizeBgAnimDotsHex(raw);
  };
  const getDotsMotion = () => {
    const raw = typeof cfg.getDotsMotion === 'function' ? cfg.getDotsMotion() : cfg.dotsMotion;
    return (raw === 'pulse' || raw === 'spark') ? raw : 'still';
  };
  const getMotionKnobMul = (motion, id) => {
    const fn = cfg.getMotionKnob;
    if (typeof fn !== 'function') return HELIX_SCALE_DEFAULT;
    return clampScaleMul(Number(fn(motion, id)));
  };
  const getSpinSpeedMul = () => knobMul(cfg.getSpinSpeed);
  const getSpinDir = () => {
    const raw = typeof cfg.getSpinDir === 'function' ? cfg.getSpinDir() : cfg.spinDir;
    if (raw === -1 || raw === 'rev' || raw === 'reverse') return -1;
    return 1;
  };
  const getLook = () => {
    const raw = typeof cfg.getLook === 'function' ? cfg.getLook() : cfg.look;
    return normalizeBgAnimLook(raw);
  };
  const getMat = (id) => {
    const fn = cfg.getMat;
    if (typeof fn !== 'function') return readBgAnimMat(id);
    const n = Number(fn(id));
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : readBgAnimMat(id);
  };
  const reducedMotion = !!cfg.reducedMotion;
  const isOn = typeof cfg.isOn === 'function' ? cfg.isOn : () => true;
  const isPaused = typeof cfg.isPaused === 'function' ? cfg.isPaused : () => false;
  /* Strand-only stills (empty product-photo tile) skip food circles, owl
     bugs, and hover cards — just the streaming DNA/RNA rope, frozen. */
  const hideProducts = !!(typeof cfg.hideProducts === 'function' ? cfg.hideProducts() : cfg.hideProducts);
  const fillHost = !!cfg.fillHost;
  const getCenterY = () => {
    const raw = typeof cfg.getCenterY === 'function' ? cfg.getCenterY() : 0.36;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0.15, Math.min(0.85, n)) : 0.36;
  };
  const getDensity = () => {
    const raw = typeof cfg.getDensity === 'function' ? cfg.getDensity() : cfg.density;
    return (raw === 'ten' || raw === 'few') ? 'ten' : 'full';
  };
  /* The foods strung along the helix, drawn as circular thumbnails — the same round
     product "bug" the app uses in its portfolio / comparison tables. Every product
     appears AT MOST ONCE on the strand (no repeats), so the pool is deliberately
     deep: our real demo-brand products plus a wide roster of recognizable market
     products (photos in assets/helix/, sourced from the Open Food Facts database).
     `img` is relative to assets/; name/brand/upc feed the food card’s
     “View Details” deep-link. Brand-insight and look-closer notes are spread
     along the strand (mixed with food sheets) — never a status stamp. */
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
    { img: 'verification/ns-powdered-vitamin-milk.png', name: 'Powdered Vitamin Milk', brand: 'Nutrient Survival' },
    { img: 'verification/ns-powdered-vitamin-butter.png', name: 'Powdered Vitamin Butter', brand: 'Nutrient Survival' },
    { img: 'verification/ns-powdered-vitamin-potato.png', name: 'Powdered Vitamin Potato', brand: 'Nutrient Survival' },
    { img: 'portfolio/frosted_toaster_pastries.png', name: 'Frosted Toaster Pastries', brand: 'Great Value', upc: '0 78742 12908 4' },
    { img: 'portfolio/nsa_carrot_raisin_mini.png', name: 'Carrot Raisin No Sugar Added Mini Flax Muffins', brand: 'Flax4Life', upc: '8 57287 00474 6' },
    { img: 'portfolio/vegan_carrot_raisin_mini.png', name: 'Vegan Carrot Raisin Mini Muffins', brand: 'Flax4Life', upc: '8 57287 00482 1' },
    { img: 'portfolio/vegan_chocolate_brownies.png', name: 'Vegan Chocolate Brownies', brand: 'Flax4Life', upc: '8 57287 00483 8' },
    { img: 'portfolio/pf_cereal.png', name: 'Organic Honey Oat Toasted Cereal', brand: 'Simple Truth', upc: '0 11110 88461 6' },
    { img: 'portfolio/pf_protein_bar.png', name: 'Organic Peanut Butter Protein Bar', brand: 'Simple Truth', upc: '0 11110 88474 6' },
    { img: 'portfolio/pf_trail_mix.png', name: 'Organic Nut & Berry Trail Mix', brand: 'Simple Truth', upc: '0 11110 88440 1' },
    { img: 'portfolio/pf_crackers.png', name: 'Organic Sea Salt Multi-Seed Crackers', brand: 'Simple Truth', upc: '0 11110 88452 4' },
    { img: 'portfolio/pf_date_bites.png', name: 'Organic Chocolate Brownie Bites', brand: 'Simple Truth', upc: '0 11110 88701 0' },
    { img: 'portfolio/pf_tortilla_chips.png', name: 'Grain-Free Sea Salt Tortilla Chips', brand: 'Siete', upc: '0 74992 90011 3' },
    { img: 'portfolio/pf_popcorn.png', name: 'Grain-Free Butter Popcorn', brand: 'Siete', upc: '0 74992 90112 6' },
    /* @helix-roster-start — generated by scripts/fetch_helix_foods.py */
    { img: 'helix/ferrero-nutella.jpg', name: 'Nutella', brand: 'Ferrero', upc: '3017620425035' },
    { img: 'helix/kinder-kinder-bueno.jpg', name: 'Kinder Bueno', brand: 'Kinder', upc: '8000500037560' },
    { img: 'helix/terra-delyssa-extra-virgin-olive-oil.jpg', name: 'Extra Virgin Olive Oil', brand: 'Terra Delyssa', upc: '6191509900664' },
    { img: 'helix/ritz-bakery-the-original-cracker.jpg', name: 'The Original Cracker', brand: 'Ritz Bakery', upc: '5000137487908' },
    { img: 'helix/oatly-barista-edition-oat-drink.jpg', name: 'Barista edition oat drink', brand: 'Oatly!', upc: '7394376620157' },
    { img: 'helix/yeo-valley-yoghurt.jpg', name: 'Yoghurt', brand: 'Yeo Valley', upc: '5036589255550' },
    { img: 'helix/weetabix-super-smooth-porridge.jpg', name: 'Super smooth porridge', brand: 'Weetabix', upc: '5010029219494' },
    { img: 'helix/peter-s-yard-peter-s-yard-original-sourdough-crackers.jpg', name: 'Peter\'s Yard Original Sourdough Crackers', brand: 'Peter\'s Yard', upc: '5060198820052' },
    { img: 'helix/doritos-doritos-nachos-cheese-flavoured-100g.jpg', name: 'Doritos Nachos Cheese Flavoured 100g', brand: 'Doritos', upc: '5900259094704' },
    { img: 'helix/ambrosia-ambrosia-rice-pudding.jpg', name: 'Ambrosia Rice pudding', brand: 'Ambrosia', upc: '5000354800931' },
    { img: 'helix/vita-coco-coconut-water.jpg', name: 'Coconut Water', brand: 'Vita Coco', upc: '8 98999 00050 3' },
    { img: 'helix/great-value-purified-drinking-water.jpg', name: 'Purified Drinking Water', brand: 'Great Value', upc: '0 78742 04037 0' },
    { img: 'helix/lu-napolitain-l-original.jpg', name: 'Napolitain l\'Original', brand: 'Lu', upc: '3017760290692' },
    { img: 'helix/terry-s-chocolate-orange-milk.jpg', name: 'Chocolate Orange Milk', brand: 'Terry\'s', upc: '3664346304863' },
    { img: 'helix/nairn-s-fruit-seed-oatcakes.jpg', name: 'Fruit & Seed Oatcakes', brand: 'Nairn\'s', upc: '6 12322 00020 2' },
    { img: 'helix/carozzi-pasta-mix.jpg', name: 'pasta mix', brand: 'Carozzi', upc: '7802575034038' },
    { img: 'helix/cirio-rosii-cirio-diced-tomatoes.jpg', name: 'Rosii Cirio Diced Tomatoes', brand: 'Cirio', upc: '8000320010118' },
    { img: 'helix/natural-set-yogurt-onken.jpg', name: 'Onken', brand: 'natural set yogurt', upc: '7610900299072' },
    { img: 'helix/toblerone-toblerone-dark-chocolate-bar.jpg', name: 'Toblerone Dark Chocolate Bar', brand: 'Toblerone', upc: '7614500010617' },
    { img: 'helix/nature-valley-nature-valley-crunchy-oats-n-honey-granola-bar.jpg', name: 'Nature Valley Crunchy Oats \'N Honey Granola Bar', brand: 'Nature Valley', upc: '0 16000 26469 4' },
    { img: 'helix/terra-delyssa-organic-extra-virgin-olive-oil.jpg', name: 'Organic Extra Virgin Olive Oil', brand: 'Terra Delyssa', upc: '6191509903023' },
    { img: 'helix/dave-s-killer-bread-21-whole-grains-and-seeds.jpg', name: '21 whole Grains and Seeds', brand: 'Dave\'s Killer Bread', upc: '0 13764 02705 3' },
    { img: 'helix/soreen-malt-loaf-lunchbox-sized.jpg', name: 'Malt Loaf (Lunchbox Sized)', brand: 'Soreen', upc: '5018735224924' },
    { img: 'helix/robinsons-robinsons-orange-squash.jpg', name: 'Robinsons Orange Squash', brand: 'Robinsons', upc: '5000147030125' },
    { img: 'helix/kirkland-signature-water-bottled.jpg', name: 'Water, Bottled', brand: 'Kirkland Signature', upc: '0 96619 75680 3' },
    { img: 'helix/frank-cooper-s-fine-cut-oxford-marmalade.jpg', name: 'Fine cut Oxford marmalade', brand: 'Frank Cooper\'s', upc: '5035660138782' },
    { img: 'helix/crespo-pitted-ripe-olives.jpg', name: 'Pitted Ripe Olives', brand: 'Crespo', upc: '3076820002064' },
    { img: 'helix/kellogg-s-coco-pops.jpg', name: 'Coco Pops', brand: 'Kellogg\'s', upc: '5059319024479' },
    { img: 'helix/lu-cioccolato-al-latte.jpg', name: 'Cioccolato al latte', brand: 'LU', upc: '3017760363396' },
    { img: 'helix/tesco-finest-wholemeal-loaf.jpg', name: 'Finest Wholemeal Loaf', brand: 'Tesco', upc: '5057545918791' },
    { img: 'helix/lee-kum-kee-premium-soy-sauce.jpg', name: 'Premium Soy Sauce', brand: 'Lee Kum Kee', upc: '0 78895 12639 6' },
    { img: 'helix/nairn-s-stem-ginger-oat-biscuits.jpg', name: 'Stem ginger oat biscuits', brand: 'Nairn\'s', upc: '0 61232 20104 7' },
    { img: 'helix/reese-s-creamy-peanut-butter.jpg', name: 'Creamy Peanut Butter', brand: 'reese\'s', upc: '0 34000 40012 6' },
    { img: 'helix/cadbury-bournville-cocoa.jpg', name: 'Bournville Cocoa', brand: 'Cadbury', upc: '5034660021445' },
    { img: 'helix/acti-leaf-almond-unsweetened-uht-milk.jpg', name: 'Almond Unsweetened UHT Milk', brand: 'Acti Leaf', upc: '4061459332896' },
    { img: 'helix/chobani-nonfat-greek-yogurt.jpg', name: 'Nonfat Greek Yogurt', brand: 'Chobani', upc: '8 94700 01013 7' },
    { img: 'helix/warburtons-warburtons-old-english-medium-sliced-white-bread-.jpg', name: 'Warburtons Old English Medium Sliced White Bread 400G', brand: 'Warburtons', upc: '5010044006529' },
    { img: 'helix/waitrose-duchy-organic-houmous.jpg', name: 'Houmous', brand: 'Waitrose Duchy Organic', upc: '5000169090336' },
    { img: 'helix/toblerone-milk-chocolate-large-bar.jpg', name: 'Milk Chocolate Large Bar', brand: 'Toblerone', upc: '7622210496645' },
    { img: 'helix/nature-s-own-100-whole-wheat-bread.jpg', name: '100% Whole Wheat Bread', brand: 'Nature\'s Own', upc: '0 72250 03712 9' },
    { img: 'helix/jif-peanut-butter-creamy.jpg', name: 'Peanut Butter (Creamy)', brand: 'Jif', upc: '0 51500 24094 6' },
    { img: 'helix/cadbury-dairymilk-buttons.jpg', name: 'Dairymilk buttons', brand: 'Cadbury', upc: '7622210286956' },
    { img: 'helix/jif-jif-peanut-butter.jpg', name: 'Jif peanut butter', brand: 'Jif', upc: '0 51500 25516 2' },
    { img: 'helix/member-s-mark-purified-water.jpg', name: 'Purified Water', brand: 'Member\'s Mark', upc: '0 78742 05145 1' },
    { img: 'helix/oreo-oreo-original.jpg', name: 'Oreo Original', brand: 'Oreo', upc: '7622210021502' },
    { img: 'helix/chocolove-ginger-crystallized-in-dark-chocolate.jpg', name: 'Ginger Crystallized In Dark Chocolate', brand: 'Chocolove', upc: '7 16270 00166 0' },
    { img: 'helix/coca-cola-coca-cola-zero.jpg', name: 'Coca Cola Zero', brand: 'Coca-Cola', upc: '0 49000 04256 6' },
    { img: 'helix/lipton-yeellow-label-tea.jpg', name: 'Yeellow Label Tea', brand: 'Lipton', upc: '6221048700705' },
    { img: 'helix/warburtons-6-soft-white-rolls-sliced.jpg', name: '6 Soft White Rolls Sliced', brand: 'Warburtons', upc: '5010044002316' },
    { img: 'helix/hellmann-s-mayonnaise.jpg', name: 'Mayonnaise', brand: 'Hellmann\'s', upc: '0 48001 21348 7' },
    { img: 'helix/maruchan-ramen-noodle-soup-chicken-flavor.jpg', name: 'Ramen noodle soup chicken flavor', brand: 'Maruchan', upc: '0 41789 00211 3' },
    { img: 'helix/kirkland-signature-creamy-almond-butter.jpg', name: 'Creamy Almond Butter', brand: 'Kirkland Signature', upc: '0 96619 67681 1' },
    { img: 'helix/nature-valley-nature-valley-crunchy-oats-n-honey.jpg', name: 'Nature Valley Crunchy Oats \'N Honey', brand: 'Nature Valley', upc: '0 16000 26460 1' },
    { img: 'helix/danone-hipro.jpg', name: 'Hipro', brand: 'Danone', upc: '0 34361 58813 6' },
    { img: 'helix/bragg-organic-apple-cider-vinegar-imp.jpg', name: 'Organic Apple Cider Vinegar imp', brand: 'Bragg', upc: '0 74305 00132 1' },
    { img: 'helix/post-grape-nuts.jpg', name: 'Grape-Nuts', brand: 'Post', upc: '8 84912 00471 0' },
    { img: 'helix/bragg-organic-apple-cider-vinegar.jpg', name: 'Organic Apple Cider Vinegar', brand: 'Bragg', upc: '0 74305 00116 1' },
    { img: 'helix/hershey-s-natural-unsweetened-cocoa.jpg', name: 'Natural Unsweetened Cocoa', brand: 'Hershey\'s', upc: '0 34000 05200 4' },
    { img: 'helix/heinz-original-sandwich-spread.jpg', name: 'Original Sandwich Spread', brand: 'Heinz', upc: '5000157076021' },
    { img: 'helix/kirkland-fancy-whole-cashews-with-sea-salt.jpg', name: 'Fancy Whole Cashews with Sea Salt', brand: 'Kirkland', upc: '0 96619 14245 3' },
    { img: 'helix/honey-maid-graham-crackers.jpg', name: 'Graham Crackers', brand: 'Honey Maid', upc: '0 44000 00463 7' },
    { img: 'helix/morinaga-mori-nu-shelf-stable-silken-tofu-firm.jpg', name: 'Mori-Nu Shelf Stable Silken Tofu Firm', brand: 'Morinaga', upc: '0 85696 60804 4' },
    { img: 'helix/kirkland-organic-creamy-peanut-butter.jpg', name: 'Organic Creamy Peanut Butter', brand: 'Kirkland', upc: '0 96619 55550 5' },
    { img: 'helix/heinz-tomato-ketchup-local.jpg', name: 'Tomato Ketchup Local', brand: 'Heinz', upc: '0 13000 00605 7' },
    { img: 'helix/great-value-vitamin-d-milk.jpg', name: 'Vitamin D Milk', brand: 'Great Value', upc: '0 78742 35186 5' },
    { img: 'helix/tilda-wholegrain-pilau-microwave-basmati-rice-classics.jpg', name: 'Wholegrain Pilau Microwave Basmati Rice Classics', brand: 'Tilda', upc: '5011157900025' },
    { img: 'helix/general-mills-cheerios.jpg', name: 'Cheerios', brand: 'General Mills', upc: '0 16000 17003 2' },
    { img: 'helix/dairylea-dairylea-processed-cheese-portions-regular.jpg', name: 'Dairylea processed cheese-portions regular', brand: 'Dairylea', upc: '7622210317643' },
    { img: 'helix/branston-original-pickle.jpg', name: 'Original pickle', brand: 'Branston', upc: '5060336505049' },
    { img: 'helix/tesco-finest-white-loaf.jpg', name: 'Finest White Loaf', brand: 'Tesco', upc: '5057545918814' },
    { img: 'helix/morrisons-morrisons-spreadable.jpg', name: 'Morrisons Spreadable', brand: 'Morrisons', upc: '5010525201320' },
    { img: 'helix/cheerios-cheerios-heart-shape-imp.jpg', name: 'Cheerios Heart shape imp', brand: 'Cheerios', upc: '0 16000 27526 3' },
    { img: 'helix/danone-light-and-free.jpg', name: 'Light and Free', brand: 'Danone', upc: '0 34360 00598 6' },
    { img: 'helix/quaker-oats-old-fashioned-oats.jpg', name: 'Old Fashioned Oats', brand: 'Quaker Oats', upc: '0 30000 01040 2' },
    { img: 'helix/deer-park-100-natural-spring-water.jpg', name: '100% Natural Spring  Water', brand: 'Deer Park', upc: '0 82657 50063 8' },
    { img: 'helix/kidfresh-super-duper-chicken-nuggets.jpg', name: 'Super Duper Chicken Nuggets', brand: 'Kidfresh', upc: '8 10882 01002 4' },
    { img: 'helix/sara-lee-healthy-multi-grain-bread.jpg', name: 'Healthy Multi-Grain Bread', brand: 'Sara Lee', upc: '0 72945 71588 2' },
    { img: 'helix/morrisons-all-bran-flakes.jpg', name: 'All Bran Flakes', brand: 'Morrisons', upc: '5010251720072' },
    { img: 'helix/grupo-cuervo-s-a-cholula-hot-sauce-original-imp.jpg', name: 'Cholula Hot Sauce (Original) imp', brand: 'Grupo Cuervo S A', upc: '0 49733 12345 7' },
    { img: 'helix/justin-s-classic-peanut-butter-jars.jpg', name: 'Classic Peanut Butter Jars', brand: 'Justin\'s', upc: '8 55188 00300 4' },
    { img: 'helix/green-black-s-black-s-organic-cooking-dark-chocolate-bar.jpg', name: 'Black\'s Organic Cooking Dark Chocolate Bar', brand: 'Green & Black\'s', upc: '5011835102390' },
    { img: 'helix/haugen-gruppen-as-french-sennep-yellow-397g.jpg', name: 'French Sennep Yellow 397g', brand: 'HAUGEN-GRUPPEN AS', upc: '0 41500 76367 5' },
    { img: 'helix/mondelez-original.jpg', name: 'Original', brand: 'Mondelez', upc: '0 44000 05098 6' },
    { img: 'helix/quaker-old-fashioned-oats-imp.jpg', name: 'Old Fashioned Oats imp', brand: 'Quaker', upc: '0 30000 01020 4' },
    { img: 'helix/food-for-life-ezekiel-4-9-sprouted-grain-bread.jpg', name: 'Ezekiel 4:9 sprouted grain bread', brand: 'Food For Life', upc: '0 73472 00120 2' },
    { img: 'helix/light-free-light-free-mousse.jpg', name: 'Light & Free mousse', brand: 'Light & Free', upc: '0 34360 00614 3' },
    { img: 'helix/haugen-gruppen-as-sweet-baby-rays-bbq-sauce-510g.jpg', name: 'Sweet Baby Rays bbq Sauce 510g', brand: 'HAUGEN-GRUPPEN AS', upc: '0 13409 91810 4' },
    { img: 'helix/general-mills-honey-nut-cheerios-imp.jpg', name: 'Honey Nut Cheerios imp', brand: 'General Mills', upc: '0 16000 12479 0' },
    { img: 'helix/thomas-thomas-original-english-muffins.jpg', name: 'Thomas original english muffins', brand: 'Thomas', upc: '0 48121 10208 1' },
    { img: 'helix/fairlife-chocolate-protien-shake.jpg', name: 'Chocolate protien shake', brand: 'Fairlife', upc: '8 11620 02211 8' },
    { img: 'helix/maretti-bruschette-chips-spinach-cheese.jpg', name: 'Bruschette Chips Spinach & cheese', brand: 'Maretti', upc: '3800205875000' },
    { img: 'helix/nestle-ritz-cheese-flavour.jpg', name: 'Ritz Cheese Flavour', brand: 'Nestle', upc: '5000137488905' },
    { img: 'helix/soreen-strawberry-lunchbox-loaves.jpg', name: 'Strawberry lunchbox loaves', brand: 'Soreen', upc: '5088722225647' },
    { img: 'helix/sheldon-s-lancashire-oven-bottom-muffins.jpg', name: 'Lancashire oven bottom muffins', brand: 'Sheldon\'s', upc: '5023528000036' },
    { img: 'helix/chobani-natural-light-greek-yogurt.jpg', name: 'Natural Light Greek Yogurt', brand: 'Chobani', upc: '9310653102626' },
    { img: 'helix/welch-s-mixed-fruit-fruit-snacks.jpg', name: 'Mixed Fruit Fruit Snacks', brand: 'Welch\'s', upc: '0 34856 00818 7' },
    { img: 'helix/batchelors-batchelors-marrowfat-bigga-peas.jpg', name: 'Batchelors Marrowfat Bigga Peas', brand: 'Batchelors', upc: '5000232901286' },
    { img: 'helix/lee-kum-kee-panda-brand-oyster-sauce.jpg', name: 'Panda Brand Oyster Sauce', brand: 'Lee Kum Kee', upc: '0 78895 30001 7' },
    { img: 'helix/dasani-dasani-purified-water.jpg', name: 'Dasani Purified Water', brand: 'Dasani', upc: '0 49000 02762 4' },
    { img: 'helix/florida-crystals-organic-raw-cane-sugar.jpg', name: 'Organic Raw Cane Sugar', brand: 'Florida Crystals', upc: '0 75779 31114 5' },
    { img: 'helix/orgain-vanilla-bean-organic-protein-50-superfoods.jpg', name: 'Vanilla Bean Organic Protein + 50 Superfoods', brand: 'Orgain', upc: '8 51770 00756 6' },
    { img: 'helix/oluf-lorentzen-as-shortbread-pure-butter-150g-walkers.jpg', name: 'Shortbread Pure Butter 150g Walkers', brand: 'Oluf lorentzen as', upc: '0 39047 00115 2' },
    { img: 'helix/oatly-oatmilk.jpg', name: 'Oatmilk', brand: 'Oatly', upc: '1 90646 64101 6' },
    { img: 'helix/nature-s-bakery-fig-bar-blueberry.jpg', name: 'Fig Bar Blueberry', brand: 'Nature\'s Bakery', upc: '0 47495 11290 0' },
    { img: 'helix/daisy-sour-cream.jpg', name: 'Sour Cream', brand: 'Daisy', upc: '0 73420 00011 0' },
    { img: 'helix/belvita-nabisco-belvita-cookies-cinnamon-brown-sugar-1x1-76-.jpg', name: 'Nabisco belvita cookies cinnamon brown sugar 1x1.76 oz', brand: 'Belvita', upc: '0 44000 03193 0' },
    { img: 'helix/poland-spring-poland-spring.jpg', name: 'poland spring', brand: 'Poland Spring', upc: '0 75720 00081 4' },
    { img: 'helix/oatly-oatmilk-full-fat.jpg', name: 'Oatmilk Full Fat', brand: 'Oatly', upc: '1 90646 63008 9' },
    { img: 'helix/quaker-oats-quick-1-minute-oats-imp.jpg', name: 'Quick 1-minute Oats imp', brand: 'Quaker Oats', upc: '0 30000 01200 0' },
    { img: 'helix/pepperidge-farm-goldfish.jpg', name: 'Goldfish', brand: 'Pepperidge Farm', upc: '0 14100 08547 8' },
    { img: 'helix/napolina-spaghetti-no-6.jpg', name: 'Spaghetti no. 6', brand: 'Napolina', upc: '5000232024602' },
    { img: 'helix/kerrygold-salted-butter.jpg', name: 'Salted Butter', brand: 'Kerrygold', upc: '7 67707 00106 7' },
    { img: 'helix/quaker-lightly-salted-rice-cakes.jpg', name: 'Lightly salted rice cakes', brand: 'Quaker', upc: '0 30000 16901 8' },
    { img: 'helix/nature-s-path-organic-kirkland-ancient-grains-probiotic-gran.jpg', name: 'Ancient Grains Probiotic Granola', brand: 'Nature\'s Path Organic - Kirkland', upc: '0 96619 19426 1' },
    { img: 'helix/skippy-skippy-smooth-peanut-butter.jpg', name: 'Skippy Smooth Peanut Butter', brand: 'Skippy', upc: '0 37600 10668 9' },
    { img: 'helix/poland-spring-poland-spring-water.jpg', name: 'Poland Spring Water', brand: 'Poland Spring', upc: '0 75720 48127 9' },
    { img: 'helix/nutrail-keto-nut-granola.jpg', name: 'Keto Nut Granola', brand: 'NuTrail', upc: '8 19562 02279 1' },
    { img: 'helix/wai-wai-instant-noodles-casserole-beef-flavour.jpg', name: 'Instant Noodles Casserole Beef Flavour', brand: 'Wai Wai', upc: '8850100002488' },
    { img: 'helix/lidl-special-flakes-original.jpg', name: 'Special flakes original', brand: 'Lidl', upc: '4056489479413' },
    { img: 'helix/nabisco-ritz.jpg', name: 'Ritz', brand: 'Nabisco', upc: '0 44000 03111 4' },
    /* @helix-roster-end */
  ];
  /* One shuffle per page load: the strand consumes the pool front-to-back, so
     shuffling varies which foods appear (and where) between sessions while staying
     stable within one — every re-render must land on an identical roster. */
  for (let i = PRODUCTS.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = PRODUCTS[i]; PRODUCTS[i] = PRODUCTS[j]; PRODUCTS[j] = tmp;
  }
  /* Strand index after the shuffle — used to sprinkle notes evenly along the
     helix (two notes, then a food sheet, repeating) so they are not clustered. */
  const STRAND_AT = new Map();
  PRODUCTS.forEach((p, i) => { STRAND_AT.set(p, i); });

  /* Insight cards that ride the helix instead of a product-identity sheet.
     Brand notes stay on that brand’s products; look-closer reads stay on
     the food they describe. No generic status labels. */
  const F_BRAND = {
    flax4life: [
      { kind: 'brand', kicker: 'Brand insight', title: 'Flax is the start, not the verdict',
        body: 'Flax4Life is a flax-forward bakery — muffins, brownies, granola. The seed is the idea; binders and sweeteners still decide Non-UPF.' },
      { kind: 'brand', kicker: 'Brand insight', title: 'Twins already in the catalog',
        body: 'Vegan and no-sugar-added muffins sit beside the original SKUs. That is a reformulation path, not a new brand to invent.' },
      { kind: 'brand', kicker: 'Brand insight', title: '47 lookalikes on the shelf',
        body: 'Public retail data shows 47 products that look like Flax4Life\'s. Claiming the real ones is how the portfolio score stays honest.' },
      { kind: 'brand', kicker: 'Brand insight', title: 'Bakery is where risk concentrates',
        body: 'Flax itself is a whole food. On this line, Non-UPF risk lives in gums, syrups, and flavor systems — not in the flax.' },
      { kind: 'brand', kicker: 'Brand insight', title: 'One seed, two formats',
        body: 'Toasted Coconut Brownies and Chunky Chocolate Granola share a seed-first idea and tell two different processing stories.' },
    ],
    'date better': [
      { kind: 'brand', kicker: 'Brand insight', title: 'Sweetened with the fruit',
        body: 'Date Better builds bars from dates, nuts, and seeds. A whole-food sweetener is one of the clearer Non-UPF tells.' },
      { kind: 'brand', kicker: 'Brand insight', title: 'Short lists are easier to prove',
        body: 'Bars and bites in this line stay close to kitchen ingredients — the kind of list verification can actually finish.' },
    ],
    'nutrient survival': [
      { kind: 'brand', kicker: 'Brand insight', title: 'Dried is not the same as UPF',
        body: 'Nutrient Survival is freeze-dried and powdered by design. The UPF question is what was added, not that water was removed.' },
      { kind: 'brand', kicker: 'Brand insight', title: 'Safety still has to travel',
        body: 'A powdered vitamin egg or milk can still read clean if every additive has a documented GRAS basis.' },
    ],
    'simple truth': [
      { kind: 'brand', kicker: 'Brand insight', title: 'Organic is not Non-UPF',
        body: 'Simple Truth is a private-label organic line. An organic toaster pastry can still be ultra-processed.' },
      { kind: 'brand', kicker: 'Brand insight', title: 'The mixes are the easier wins',
        body: 'Trail mixes and seed crackers in this line are the SKUs most likely to clear a Non-UPF screen.' },
    ],
    siete: [
      { kind: 'brand', kicker: 'Brand insight', title: 'Grain-free ≠ Non-UPF',
        body: 'Siete swaps the grain, not always the processing. Cassava still becomes a chip — a dietary claim is not a processing claim.' },
    ],
    'great value': [
      { kind: 'look', kicker: 'Look closer', title: 'Store brand, same markers',
        body: 'A private-label toaster pastry is usually a formulated product — frosting, filling, and a long marker list under a house name.' },
    ],
    chobani: [
      { kind: 'look', kicker: 'Look closer', title: 'Yogurt until it is not',
        body: 'Greek yogurt starts as milk plus cultures. Isolates, thickeners, and flavor bases are what push a cup across the UPF line.' },
    ],
    oatly: [
      { kind: 'look', kicker: 'Look closer', title: 'Oats, then the formula',
        body: 'Oat drinks can be oats and water — or oils, gums, and fortification systems. The list, not the grain, makes the call.' },
    ],
    quaker: [
      { kind: 'look', kicker: 'Look closer', title: 'Plain oats are the baseline',
        body: 'Old-fashioned oats are minimally processed. Flavor packets, isolates, and syrups are what turn oatmeal into a formula.' },
    ],
    'quaker oats': [
      { kind: 'look', kicker: 'Look closer', title: 'Plain oats are the baseline',
        body: 'Old-fashioned oats are minimally processed. Flavor packets, isolates, and syrups are what turn oatmeal into a formula.' },
    ],
    bragg: [
      { kind: 'look', kicker: 'Look closer', title: 'A short, old list',
        body: 'Apple cider vinegar is a fermented pantry staple. Short lists like this are the Non-UPF end of the helix.' },
    ],
    nabisco: [
      { kind: 'brand', kicker: 'Brand insight', title: 'A cracker is a formula more often than not',
        body: 'Nabisco’s familiar boxes — Ritz, cookies, grahams — usually start as flour and fat, then pick up emulsifiers and flavor systems. The list, not the logo, is the call.' },
    ],
    'kellogg s': [
      { kind: 'brand', kicker: 'Brand insight', title: 'Breakfast shapes are engineered',
        body: 'Kellogg’s cereals are extruded, coated, and fortified as a system. That is why so many SKUs in this aisle land as ultra-processed even when the grain on the box sounds simple.' },
    ],
    heinz: [
      { kind: 'brand', kicker: 'Brand insight', title: 'Two condiments, two lists',
        body: 'Heinz ketchup and a sandwich spread can share a brand and not share a processing story. One can stay close to tomato and vinegar; the other is usually a formula.' },
    ],
    kirkland: [
      { kind: 'brand', kicker: 'Brand insight', title: 'Warehouse brand, same questions',
        body: 'Kirkland’s line runs from water and nuts to peanut butter and granola. A house brand is not a processing claim — each SKU still has to clear the list.' },
    ],
    'kirkland signature': [
      { kind: 'brand', kicker: 'Brand insight', title: 'Warehouse brand, same questions',
        body: 'Kirkland’s line runs from water and nuts to peanut butter and granola. A house brand is not a processing claim — each SKU still has to clear the list.' },
    ],
    tesco: [
      { kind: 'brand', kicker: 'Brand insight', title: 'Own-label bread is still a list',
        body: 'Tesco Finest loaves can be a short bakery list or a long improver list. The store name does not decide Non-UPF — the ingredients do.' },
    ],
    'general mills': [
      { kind: 'brand', kicker: 'Brand insight', title: 'The shape is the tell',
        body: 'Cheerios and Honey Nut Cheerios share a grain and not a process. Extrusion, coating, and fortification are what turn oats into a cereal formula.' },
    ],
    cadbury: [
      { kind: 'brand', kicker: 'Brand insight', title: 'Cocoa and confectionery are not the same',
        body: 'Cadbury cocoa can be a short pantry list. Dairy Milk buttons are a formulated confection. Same brand, two processing stories.' },
    ],
  };
  const F_LOOK = [
    { test: /olive oil/i, kind: 'look', kicker: 'Look closer', title: 'Pressed, not formulated',
      body: 'Extra-virgin olive oil is a single ingredient. That is the textbook Non-UPF pantry staple on this strand.' },
    { test: /oat(s|meal|cakes|drink|milk)|porridge|weetabix/i, kind: 'look', kicker: 'Look closer', title: 'Oats stay simple until flavored',
      body: 'Plain oats sit at the Non-UPF end. Flavor systems and isolates are what push a breakfast cup the other way.' },
    { test: /yogurt|yoghurt|hipro|light and free|light & free/i, kind: 'look', kicker: 'Look closer', title: 'Cultures, then extras',
      body: 'Yogurt is milk plus cultures — until thickeners, isolates, and flavor bases show up on the list.' },
    { test: /coconut water/i, kind: 'look', kicker: 'Look closer', title: 'One ingredient, if it stays that way',
      body: 'Coconut water can be just the liquid of the fruit. Added sugars, flavors, and preservatives are what turn a simple drink into a formula.' },
    { test: /water/i, kind: 'look', kicker: 'Look closer', title: 'As close as a product gets',
      body: 'Bottled water is as Non-UPF as packaged food gets. It rides the helix so the contrast with formulated snacks is visible.' },
    { test: /peanut butter|almond butter/i, kind: 'look', kicker: 'Look closer', title: 'Nuts — or a spread formula',
      body: 'Nut butter is Non-UPF when it is nuts and salt. Sugar, oils, and emulsifiers change the call.' },
    { test: /oreo|nutella|kinder|toblerone|chocolate orange|dairymilk|cioccolato|chocolove|napolitain/i, kind: 'look', kicker: 'Look closer', title: 'Confectionery is usually formulated',
      body: 'Emulsifiers, isolates, and cosmetic extras are the UPF markers in a chocolate aisle — even on a familiar name.' },
    { test: /cocoa/i, kind: 'look', kicker: 'Look closer', title: 'Cocoa is a pantry staple until sweetened',
      body: 'Unsweetened cocoa is typically one ingredient. Once sugar, lecithin, and flavors join it, you are looking at confectionery, not a pantry powder.' },
    { test: /chocolate/i, kind: 'look', kicker: 'Look closer', title: 'A bar is a list, not a flavor',
      body: 'Dark cooking chocolate can be short. A filled or flavored bar is usually emulsifiers, isolates, and extras — the UPF pattern in this aisle.' },
    { test: /ramen|instant noodle/i, kind: 'look', kicker: 'Look closer', title: 'A classic UPF pattern',
      body: 'Instant noodles usually pair a fried cake with a flavor powder. That is the pattern Non-UPF is built to catch.' },
    { test: /ketchup|mayonnaise|sandwich spread|pickle|spreadable/i, kind: 'look', kicker: 'Look closer', title: 'Condiments live on the edge',
      body: 'A short vinegar-and-tomato list and a formulated spread can share a shelf and not share a Non-UPF verdict.' },
    { test: /soy sauce|oyster sauce|bbq sauce|hot sauce|mustard|sennep/i, kind: 'look', kicker: 'Look closer', title: 'A sauce is only as short as its list',
      body: 'Fermented soy or a chili mash can stay close to the kitchen. Thickeners, colors, and flavor systems are what push a bottle across the line.' },
    { test: /bread|loaf|rolls|muffin(?!s-)|english muffin/i, kind: 'look', kicker: 'Look closer', title: 'Bread is a list, not a shape',
      body: 'Flour, water, salt, and time can be Non-UPF. Dough conditioners and a long improver list are a different product.' },
    { test: /coca cola|soda|squash/i, kind: 'look', kicker: 'Look closer', title: 'Zero sugar is not Non-UPF',
      body: 'A formulated beverage can be calorie-free and still ultra-processed. Those are two different questions.' },
    { test: /cheerios|cereal|coco pops|grape-nuts|granola bar|special flakes|all bran/i, kind: 'look', kicker: 'Look closer', title: 'Breakfast is often a formula',
      body: 'Extruded shapes, coatings, and fortification systems are why so many cereals land as ultra-processed.' },
    { test: /granola/i, kind: 'look', kicker: 'Look closer', title: 'Clusters are a process',
      body: 'Plain toasted grains can stay simple. Binding syrups, isolates, and flavor coats are what turn granola into a formulated cluster.' },
    { test: /tofu/i, kind: 'look', kicker: 'Look closer', title: 'A short soy list',
      body: 'Silken tofu is typically soybeans, water, and a coagulant — a useful Non-UPF contrast to flavored soy snacks.' },
    { test: /ritz|cracker|goldfish|graham|rice cake/i, kind: 'look', kicker: 'Look closer', title: 'A snack is usually a formula',
      body: 'Crackers and rice cakes often start as grain and fat, then pick up emulsifiers, flavors, and a long marker list. The box is not the verdict — the list is.' },
    { test: /doritos|chips|popcorn|bruschette/i, kind: 'look', kicker: 'Look closer', title: 'The seasoning is the tell',
      body: 'A chip or popcorn can be grain, oil, and salt — or a flavor dust of isolates, enhancers, and colors. The coating is usually where UPF hides.' },
    { test: /pasta|spaghetti/i, kind: 'look', kicker: 'Look closer', title: 'Dry pasta is a short list',
      body: 'Wheat and water (or egg) is a Non-UPF pantry staple. Filled, flavored, or instant pasta is a different product.' },
    { test: /tea/i, kind: 'look', kicker: 'Look closer', title: 'Leaves, until they are not',
      body: 'Tea can be just dried leaves. Flavor systems, sweeteners, and “instant” formats are what turn a brew into a formula.' },
    { test: /sugar|cane sugar/i, kind: 'look', kicker: 'Look closer', title: 'A single-ingredient sweetener',
      body: 'Raw cane sugar is one ingredient. It still has to be read as a sweetener in a recipe — but it is not an ultra-processed additive system.' },
    { test: /sour cream/i, kind: 'look', kicker: 'Look closer', title: 'Cream, cultures, then extras',
      body: 'Sour cream can be cream plus cultures. Stabilizers, gums, and fillers are what push a tub away from the dairy staple.' },
    { test: /butter/i, kind: 'look', kicker: 'Look closer', title: 'Butter is short until it is a spread',
      body: 'Salted butter is cream and salt. “Spreadable” blends add oils and emulsifiers — a different processing story under a dairy word.' },
    { test: /\bmilk\b|uht/i, kind: 'look', kicker: 'Look closer', title: 'Milk until the list grows',
      body: 'Dairy milk is a short list. Plant milks and “protein” shakes can be the grain — or oils, gums, and isolates. Read past the word milk.' },
    { test: /protein|shake|orgain/i, kind: 'look', kicker: 'Look closer', title: 'A shake is a formula by design',
      body: 'Protein powders and ready-to-drink shakes are isolates, flavors, and emulsifiers stacked on purpose. “Organic” or “superfoods” does not change the process.' },
    { test: /fruit snack|fig bar/i, kind: 'look', kicker: 'Look closer', title: 'Fruit on the box is not the list',
      body: 'A fruit snack can be fruit concentrate, sugars, and gelling systems. A fig bar can stay closer to fruit and grain — the ingredients decide.' },
    { test: /olive/i, kind: 'look', kicker: 'Look closer', title: 'Olives are a pantry staple',
      body: 'Pitted ripe olives are typically olives, water, and salt. That is the Non-UPF end of the snack aisle next to formulated chips.' },
    { test: /marmalade|jam/i, kind: 'look', kicker: 'Look closer', title: 'Fruit plus sugar — or a set gel',
      body: 'A traditional marmalade is fruit, sugar, and pectin. Colors, flavors, and gelling systems are what turn a jar into a formulated spread.' },
    { test: /cheese/i, kind: 'look', kicker: 'Look closer', title: 'Cheese until it is processed',
      body: 'A block of cheese is milk, cultures, salt, and time. Processed portions are emulsifying salts and a formula designed to melt on cue.' },
    { test: /nugget/i, kind: 'look', kicker: 'Look closer', title: 'A nugget is a rebuild',
      body: 'Chicken nuggets are typically a formed meat mash with coatings, binders, and flavor systems — a textbook ultra-processed pattern, even in a “better for you” box.' },
    { test: /rice pudding|mousse|pudding/i, kind: 'look', kicker: 'Look closer', title: 'A dessert cup is usually set',
      body: 'Rice pudding and mousse cups are typically starches, gums, and flavor bases designed to sit on a shelf. That is a different product from milk and rice at home.' },
    { test: /microwave|pilau|basmati rice/i, kind: 'look', kicker: 'Look closer', title: 'Heat-and-eat is a process',
      body: 'Microwave rice can be rice and water — or oils, flavors, and preservatives packed for the pouch. The convenience step is where the list grows.' },
    { test: /tomato/i, kind: 'look', kicker: 'Look closer', title: 'Tomatoes, packed',
      body: 'Diced tomatoes are usually tomatoes and juice (or a little salt). That is a useful Non-UPF contrast to a formulated sauce on the same shelf.' },
    { test: /houmous|hummus/i, kind: 'look', kicker: 'Look closer', title: 'Chickpeas until the extras',
      body: 'Hummus can be chickpeas, tahini, lemon, and oil. Stabilizers and preservatives are what turn a dip into a longer industrial list.' },
    { test: /cashew|trail mix|nut & berry/i, kind: 'look', kicker: 'Look closer', title: 'Nuts are simple until coated',
      body: 'Plain salted nuts and a nut-and-berry mix are among the clearer Non-UPF snacks. Yogurt coatings, flavors, and syrups change the call.' },
    { test: /peas/i, kind: 'look', kicker: 'Look closer', title: 'A legume in a can',
      body: 'Marrowfat peas are typically peas, water, and salt — a short list next to reconstituted meat and snack formulas on this strand.' },
    { test: /cookie|biscuit|shortbread|belvita/i, kind: 'look', kicker: 'Look closer', title: 'A biscuit is often engineered',
      body: 'Shortbread can be butter, flour, and sugar. Breakfast cookies and flavored biscuits usually add emulsifiers, syrups, and a long marker list.' },
    { test: /vinegar/i, kind: 'look', kicker: 'Look closer', title: 'A short, old list',
      body: 'Apple cider vinegar is a fermented pantry staple. Short lists like this are the Non-UPF end of the helix.' },
  ];

  function hashStr(s) {
    let h = 2166136261;
    const t = String(s || '');
    for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function normBrand(b) {
    return String(b || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function pickFrom(list, h) {
    return list && list.length ? list[h % list.length] : null;
  }
  function lookFactFor(p) {
    const blob = ((p && p.name) || '') + ' ' + ((p && p.brand) || '');
    for (let i = 0; i < F_LOOK.length; i++) {
      if (F_LOOK[i].test.test(blob)) return F_LOOK[i];
    }
    return null;
  }
  /* A fact card must be a real note — kicker + title + body. A lone status
     word next to the photo is not a card we show. */
  function richFact(fact) {
    if (!fact) return null;
    const title = String(fact.title || '').trim();
    const body = String(fact.body || '').trim();
    if (!title || !body) return null;
    if (/^(non-?upf|upf|gras)$/i.test(title)) return null;
    return fact;
  }
  const DEMO_BRAND = {
    flax4life: 1, 'date better': 1, 'nutrient survival': 1, 'simple truth': 1, siete: 1
  };
  function factForProduct(p) {
    if (!p) return null;
    const brand = normBrand(p.brand);
    const h = hashStr(p.img || p.name || '');
    /* Portfolio brands keep their own insight. Everyone else prefers a
       look-closer that matches THIS food, then a brand note, then a short
       fallback so note-slots along the strand are never empty. */
    if (DEMO_BRAND[brand] && F_BRAND[brand]) return richFact(pickFrom(F_BRAND[brand], h));
    const look = richFact(lookFactFor(p));
    if (look) return look;
    if (F_BRAND[brand]) return richFact(pickFrom(F_BRAND[brand], h));
    return richFact({
      kind: 'look', kicker: 'Look closer', title: 'The list is the verdict',
      body: 'Every SKU on this strand is read the same way — ingredient by ingredient, not by the claim on the front of the pack.'
    });
  }
  /* Two of every three positions along the strand open a brand-insight or
     look-closer note; the third stays a food sheet. That throws notes
     throughout the helix instead of clustering them on a few brands. */
  function isFactProduct(p) {
    if (!p || !factForProduct(p)) return false;
    const i = STRAND_AT.get(p);
    if (i == null) return true;
    return (i % 3) !== 2;
  }

  /* Cluster n product slots in a compact mid-strand run (~1.45 slots per
     food) so the photos read as a group. Sized by product count, not helix
     length — otherwise a long strand spreads them across the visible frame.
     The run is centred to stay off the faded tips. */
  function pickClustered(n, total) {
    const out = [];
    if (n <= 0 || total <= 0) return out;
    if (n >= total) {
      for (let i = 0; i < total; i++) out.push(i);
      return out;
    }
    if (n === 1) return [Math.floor(total / 2)];
    const span = Math.min(total, Math.max(n, Math.round(n * 1.45)));
    const start = Math.max(0, Math.round((total - span) / 2));
    for (let k = 0; k < n; k++) out.push(start + Math.round(k * (span - 1) / (n - 1)));
    return out;
  }

  let canvas = null, ctx = null, buf = null, bctx = null, raf = 0, ro = null, images = null, owlImg = null;
  let rgb = [37, 80, 124], w = 0, h = 0, dpr = 1, t0 = 0, running = false, paused = false;
  let lastFrame = 0;
  /* Track density flips so switching Helix → Ten mid-run still swells the
     ten product bugs from "dot" size into the leftover node space. */
  let densityNow = null, fewSince = 0;
  /* Hover-card state: last-frame hit boxes, the product the card is riding,
     and pointer position so a hovered card can close when its circle travels
     out from under the cursor. A card opens only when the pointer moves onto
     a circle — never because a circle drifted under a still cursor. */
  let hitNodes = [], hoverImg = null, hoverX = -1, hoverY = -1;
  let lastT = 0, card = null, overCard = false, ptrX = -1, ptrY = -1;
  /* Accumulated twist clock — advances by dt × speed × direction so changing
     Speed or Spin never jumps the phase, and Reverse unwinds from here. */
  let spinT = 0, lastSpinT = null;
  let hoverPinned = false;
  /* Leave bloom: fade + expand on first engage. Never shrink the strand. */
  let leaving = false, leaveTimer = 0;
  const LEAVE_MS = 1650;

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
     strands always track the palette; falls back to the canonical --primary.
     When a full-bleed preset (or hand-picked chat colour) is on, use that
     surface's accent so the helix stays visible on Cyberpunk / Sunset Green /
     Blue Sky in both light and dark page themes. */
  function readColor() {
    let col = '#25507C';
    try {
      const root = document.documentElement;
      const cs = getComputedStyle(root);
      if (root.classList.contains('fb-chat-tint')) {
        col = (cs.getPropertyValue('--fb-chat-accent') || '').trim()
          || (cs.getPropertyValue('--fb-chat-fg') || '').trim()
          || col;
      } else {
        const dark = root.classList.contains('dark');
        col = ((dark ? cs.getPropertyValue('--primary-bright') : cs.getPropertyValue('--primary')) || '').trim() || col;
      }
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
    const body = getBody();
    if (!body) return;
    if (!hideProducts) loadImages();
    canvas = document.createElement('canvas');
    canvas.className = 'sc-bganim-canvas' + (fillHost ? ' sc-bganim-canvas--fill' : '');
    canvas.setAttribute('aria-hidden', 'true');
    body.insertBefore(canvas, body.firstChild);
    if (fillHost) applyBgAnimWash(readBgAnimWash());
    ctx = canvas.getContext('2d');
    buf = document.createElement('canvas');            // offscreen: draw opaque, blit at opacity
    bctx = buf.getContext('2d');
    if (!hideProducts) buildCard(body);
    resize();
    try { ro = new ResizeObserver(resize); ro.observe(body); } catch (_) {}
    /* Hover only — listen on the body so we get coordinates even though the
       canvas sits behind the (transparent) welcome. Hovering a product circle
       pins its card (food sheet, brand insight, or look-closer fact). */
    if (!hideProducts) {
      body.addEventListener('mousemove', onMove);
      body.addEventListener('mouseleave', () => { if (hoverPinned && !overCard) hideCard(); });
      body.addEventListener('pointerdown', onPointerDown);
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);
    }
  }

  /* Product or insight card: round thumb over the bug. Food mode is name/brand +
     View Details; fact mode is a brand-insight or look-closer note (title + body). */
  function buildCard(body) {
    card = document.createElement('div');
    card.className = 'wch-helix-card is-food';
    card.hidden = true;
    card.innerHTML =
      '<div class="wch-helix-card-top">' +
        '<span class="wch-helix-card-thumb"><img alt="" /></span>' +
        '<span class="wch-helix-card-copy">' +
          '<span class="wch-helix-food"><span class="wch-helix-card-brand"></span>' +
          '<span class="wch-helix-card-name"></span></span>' +
          '<span class="wch-helix-fact-copy"><span class="wch-helix-fact-kicker"></span>' +
          '<span class="wch-helix-fact-title"></span></span>' +
        '</span>' +
      '</div>' +
      '<span class="wch-helix-fact-body"></span>' +
      '<a class="wch-helix-card-link" href="#"><span>View Details</span>' +
        '<span class="material-symbols-outlined">arrow_outward</span></a>';
    body.appendChild(card);
    card.addEventListener('mouseenter', () => {
      overCard = true; hoverPinned = true;
    });
    card.addEventListener('mouseleave', () => {
      overCard = false;
      hideCard();
    });
  }

  /* Point-in-circle hit test against the last frame's product bugs, front-most first.
     Only the circle itself is interactive — a tiny pad forgives the moving target, but
     hovering the surrounding strand does NOT trigger the popover. Circles that sit
     in the --fill fade (headline / chips / composer) are dead: they are behind
     the wash gradient, not a hover target. */
  function hitTest(mx, my) {
    const pad = 2;
    for (let i = hitNodes.length - 1; i >= 0; i--) {
      const n = hitNodes[i];
      if (insideNode(n, mx, my, pad) && nodeIsInteractive(n)) return n;
    }
    return null;
  }
  function insideNode(n, x, y, pad) {
    const dx = x - n.x, dy = y - n.y;
    const rr = n.r + (pad || 0);
    return dx * dx + dy * dy <= rr * rr;
  }
  /* Same stops as .sc-bganim-canvas--fill. Below ~0.45 the strand is the
     veil over the headline, chips, and composer — not a hover surface. */
  const FILL_MASK_POS = [0, 0.32, 0.48, 0.64, 0.82, 1];
  function fillMaskAlphaAtY(y) {
    if (!fillHost) return 1;
    const body = canvas && canvas.parentElement;
    const bh = (body && body.clientHeight) || h || 1;
    const t = Math.max(0, Math.min(1, y / bh));
    const stops = bgAnimWashMaskStops(readBgAnimWash());
    for (let i = 1; i < FILL_MASK_POS.length; i++) {
      if (t <= FILL_MASK_POS[i]) {
        const u = (t - FILL_MASK_POS[i - 1]) / (FILL_MASK_POS[i] - FILL_MASK_POS[i - 1] || 1);
        return stops[i - 1] + (stops[i] - stops[i - 1]) * u;
      }
    }
    return stops[stops.length - 1];
  }
  function nodeIsInteractive(n) {
    return fillMaskAlphaAtY(n.y) >= 0.45;
  }
  /* Heading, chips, composer, menus — moving across those is not a helix hover. */
  function eventOverChrome(e) {
    const t = e && e.target;
    if (!t || !t.closest) return false;
    if (t.closest('.wch-helix-card')) return false;
    return !!t.closest(
      'button, a, input, textarea, select, .chip, ' +
      '.ws-heading, .ws-sub, .ws-chips, .ws-chips-scroll, .ws-chips-wrap, .ws-scorecards-section, ' +
      '.sc-input-row, .chat-input-rail, .fl-input-wrap, .sc-belowinput, .topbar-popover, ' +
      '.sc-helix-float, .wise-popover, .fl-more-popover, [role="menu"], .sc-ask-help'
    );
  }
  /* Pan may start on the welcome title — the strand often sits behind it —
     but never on chips, composer, menus, or other controls. */
  function eventBlocksPan(e) {
    const t = e && e.target;
    if (!t || !t.closest) return false;
    if (t.closest('.wch-helix-card')) return true;
    return !!t.closest(
      'button, a, input, textarea, select, .chip, ' +
      '.ws-heading, .ws-sub, .ws-chips, .ws-chips-scroll, .ws-chips-wrap, .ws-scorecards-section, ' +
      '.sc-input-row, .chat-input-rail, .fl-input-wrap, .sc-belowinput, .topbar-popover, ' +
      '.sc-helix-float, .wise-popover, .fl-more-popover, [role="menu"], .sc-ask-help'
    );
  }

  /* The strand itself is not a drag surface. Shift is a slider in Helix
     settings; the only thing you drag is the popped-out settings card. */
  function helixPanAllowed() {
    return false;
  }

  function commitShift(pct, persist) {
    const next = clampBgAnimShift(pct);
    dragShift = next;
    if (persist) {
      persistBgAnimShift(next);
      broadcastBgAnimShift(next);
    }
    redraw();
  }

  function endPan(e) {
    if (!pan) return;
    if (e && pan.id != null && e.pointerId !== pan.id) return;
    const body = canvas && canvas.parentElement;
    if (body && pan.id != null) {
      try { body.releasePointerCapture(pan.id); } catch (_) {}
    }
    pan = null;
    host.classList.remove('sc-bganim-panning');
    requestAnimationFrame(() => { dragShift = null; });
  }

  /* The strand is not a drag surface. Product circles still open their cards.
     Chrome (chips, composer, menus, the Helix settings card) never starts a pan. */
  function onPointerDown(e) {
    if (!host.classList.contains('sc-bganim-live')) return;
    if (!helixPanAllowed()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (eventBlocksPan(e)) return;
    if (e.target && e.target.closest && e.target.closest('.wch-helix-card')) return;
    const body = canvas && canvas.parentElement;
    if (!body) return;
    const rect = body.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    if (hitTest(mx, my)) return;
    pan = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startShift: getShift(),
      armed: false,
    };
    if (e.pointerType === 'mouse' && e.cancelable) e.preventDefault();
  }

  function onPointerMove(e) {
    if (!pan || e.pointerId !== pan.id) return;
    if (!helixPanAllowed()) { endPan(e); return; }
    const dx = e.clientX - pan.startX;
    const dy = e.clientY - pan.startY;
    if (!pan.armed) {
      if (Math.hypot(dx, dy) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) { pan = null; return; }
      pan.armed = true;
      host.classList.add('sc-bganim-panning');
      if (hoverPinned && !overCard) hideCard();
      const body = canvas && canvas.parentElement;
      if (body) {
        try { body.setPointerCapture(e.pointerId); } catch (_) {}
      }
    }
    if (e.cancelable) e.preventDefault();
    const body = canvas && canvas.parentElement;
    const span = Math.max(1, (body ? body.clientWidth : w) * SHIFT_SPAN);
    commitShift(pan.startShift + (dx / span) * 100, true);
  }

  function onPointerUp(e) {
    endPan(e);
  }

  function onMove(e) {
    if (!host.classList.contains('sc-bganim-live')) return;
    if (pan && pan.armed) return;
    const body = canvas && canvas.parentElement;
    if (!body) return;
    const rect = body.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    if (e.target && e.target.closest && e.target.closest('.wch-helix-card')) {
      ptrX = mx; ptrY = my;
      return;
    }
    if (eventOverChrome(e)) {
      ptrX = mx; ptrY = my;
      body.style.cursor = '';
      if (hoverPinned && !overCard) hideCard();
      return;
    }
    const prevX = ptrX, prevY = ptrY;
    ptrX = mx; ptrY = my;
    const hit = hitTest(mx, my);
    if (hit) {
      const same = !!(card && !card.hidden && hoverImg === hit.prod.img);
      if (same) {
        hoverPinned = true;
        body.style.cursor = 'pointer';
        return;
      }
      /* First sample only records the pointer — a card must wait until the
         pointer actually moves onto a circle (was outside, now inside). */
      if (prevX >= 0 && !insideNode(hit, prevX, prevY, 2)) {
        body.style.cursor = 'pointer';
        hoverPinned = true;
        showCard(hit);
      } else {
        body.style.cursor = 'pointer';
      }
    } else {
      body.style.cursor = helixPanAllowed() ? 'grab' : '';
      if (hoverPinned && !overCard) hideCard();
    }
  }

  /* Freeze the strand while a product popover is open. Local only — does not
     write the shared Play/Pause preference. */
  function pauseForHover() {
    if (reducedMotion || !running || paused) return;
    pause();
  }

  /* Continue after the pointer leaves the popover, unless the member already
     paused playback from the menu. */
  function resumeAfterHover() {
    if (reducedMotion || isPaused()) return;
    resumeLoop();
  }

  function cardIsOpen() {
    return !!(card && !card.hidden);
  }

  /* Fill + place the card on a product. Most bugs get the food sheet + NFP
     link; fact bugs get a brand-insight or look-closer note. `skipRedraw` is
     set when we are already inside draw() so we do not recurse a second paint. */
  function showCard(node, skipRedraw) {
    const p = node.prod;
    if (!p) return;
    pauseForHover();
    if (hoverImg === p.img) return;
    hoverImg = p.img; hoverX = node.x; hoverY = node.y;
    if (card) {
      const fact = isFactProduct(p) ? factForProduct(p) : null;
      const asFact = !!(fact && fact.title && fact.body);
      card.classList.toggle('is-fact', asFact);
      card.classList.toggle('is-food', !asFact);
      const img = card.querySelector('img');
      if (img) {
        img.src = assetBase() + p.img;
        img.alt = p.name || '';
      }
      if (asFact) {
        card.setAttribute('data-kind', fact.kind || 'look');
        const kicker = card.querySelector('.wch-helix-fact-kicker');
        if (kicker) kicker.textContent = fact.kicker || 'Look closer';
        const title = card.querySelector('.wch-helix-fact-title');
        if (title) title.textContent = fact.title || '';
        const bodyEl = card.querySelector('.wch-helix-fact-body');
        if (bodyEl) bodyEl.textContent = fact.body || '';
        const br = card.querySelector('.wch-helix-card-brand');
        if (br) br.textContent = '';
        const nm = card.querySelector('.wch-helix-card-name');
        if (nm) nm.textContent = '';
      } else {
        card.removeAttribute('data-kind');
        const br = card.querySelector('.wch-helix-card-brand');
        if (br) br.textContent = p.brand || '';
        const nm = card.querySelector('.wch-helix-card-name');
        if (nm) nm.textContent = p.name || '';
        const link = card.querySelector('.wch-helix-card-link');
        if (link) link.setAttribute('href', nfpHref(p));
        const kicker = card.querySelector('.wch-helix-fact-kicker');
        if (kicker) kicker.textContent = '';
        const title = card.querySelector('.wch-helix-fact-title');
        if (title) title.textContent = '';
        const bodyEl = card.querySelector('.wch-helix-fact-body');
        if (bodyEl) bodyEl.textContent = '';
      }
      card.hidden = false;
      placeCard(node);
      card.style.animation = 'none';
      void card.offsetWidth;
      card.style.animation = '';
    }
    if (!skipRedraw) redraw();
  }

  /* Lay the card OVER the product bug — its round thumbnail sits on the circle —
     and fan the copy to the right (or left when the right edge is tight). */
  function placeCard(node) {
    if (!card) return;
    const body = canvas.parentElement;
    const asFact = card.classList.contains('is-fact');
    const cw = card.offsetWidth || 340;
    const ch = card.offsetHeight || 148;
    const bw = body.clientWidth || w, bh = body.clientHeight || h;
    const PAD = 18, THUMB = 68;
    const anchor = PAD + THUMB / 2;
    const toLeft = (node.x - anchor + cw + 8) > bw;
    card.classList.toggle('is-left', toLeft);
    let x = toLeft ? (node.x - (cw - anchor)) : (node.x - anchor);
    let y = node.y - anchor;
    x = Math.max(8, Math.min(x, bw - cw - 8));
    y = Math.max(8, Math.min(y, bh - ch - 8));
    card.style.left = x + 'px';
    card.style.top = y + 'px';
  }

  function hideCard() {
    /* Resume first so the next animation frame is queued in this same turn —
       not after a hide delay. */
    resumeAfterHover();
    hoverImg = null; hoverX = hoverY = -1;
    hoverPinned = false;
    if (card) card.hidden = true;
    const body = canvas && canvas.parentElement;
    if (body) body.style.cursor = '';
    if (!running) redraw();
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

  /* Repaint the last-painted frame — used when the hover highlight changes while
     the loop isn't running (the reduced-motion still frame), and when Helix ↔ Ten
     flips density on a live field. */
  function redraw() {
    if (!canvas || !ctx || leaving) return;
    draw(lastT || 3);
  }

  function hostHasBox() {
    const body = canvas && canvas.parentElement;
    return !!(body && body.clientWidth >= 8 && body.clientHeight >= 8);
  }

  function resize() {
    if (!canvas || !ctx || leaving) return;
    const body = canvas.parentElement;
    if (!body) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = body.clientWidth; h = body.clientHeight;
    const nextCw = Math.max(1, Math.round(w * dpr));
    const nextCh = Math.max(1, Math.round(h * dpr));
    const sizeChanged = canvas.width !== nextCw || canvas.height !== nextCh;
    /* Assigning canvas.width clears the bitmap. Skip when the box did not
       change, and when it did, paint the last frame immediately so a nav /
       History resize cannot leave a blank canvas for a frame (page blink). */
    if (sizeChanged) {
      canvas.width = nextCw;
      canvas.height = nextCh;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (buf && bctx) {
        buf.width = canvas.width; buf.height = canvas.height;
        bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }
    /* Keep a shown card glued to its bug after a resize/reflow. */
    if (card && !card.hidden && hoverX >= 0) placeCard({ x: hoverX, y: hoverY, r: 17 });
    /* Roll / Crawl hide the chat (display:none → 0×0). start() may have
       armed the field there; when the host gets a real box, paint. */
    if (host.classList.contains('sc-bganim-live') && isOn() && hostHasBox()) {
      if (sizeChanged || reducedMotion || isPaused()) draw(lastT || 3);
      if (reducedMotion || isPaused()) return;
      if (running && !paused) {
        if (!raf) raf = requestAnimationFrame(frame);
        return;
      }
      running = true; paused = false; t0 = 0;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    }
  }

  /* Smootherstep for the soft fade at the strand's two ends. */
  function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  /* Cheap lit-tube finish for Look → 3D. One gradient across the stroke so
     the strand reads round without WebGL. Classic keeps the original lines.
     Finish knobs (Rough / Metal / Coat / Sheen / Fuzz) map onto these tubes
     at full strength — the old Tripo dampening was left on after Tripo merged
     into 3D, which made every slider look dead. */
  const TUBE_LX = -0.52, TUBE_LY = -0.62;
  function mix255(c, lift) {
    if (lift < 0) return Math.max(0, Math.min(255, Math.round(c * (1 + lift))));
    return Math.max(0, Math.min(255, Math.round(c + (255 - c) * lift)));
  }
  function drawLitSeg(x1, y1, x2, y2, width, alpha, depth, mats) {
    if (alpha <= 0.01 || width < 0.7) return;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 0.2) return;
    const nx = -dy / len, ny = dx / len;
    const rad = width * 0.5;
    const side = (nx * TUBE_LX + ny * TUBE_LY) >= 0 ? 1 : -1;
    const [cr, cg, cb] = rgb;
    const m = mats || {
      rough: BGANIM_PUBLISH_POSE.mats.rough / 100,
      metal: BGANIM_PUBLISH_POSE.mats.metal / 100,
      coat: BGANIM_PUBLISH_POSE.mats.coat / 100,
      sheen: BGANIM_PUBLISH_POSE.mats.sheen / 100,
      fuzz: BGANIM_PUBLISH_POSE.mats.fuzz / 100,
    };
    const rough = m.rough;
    const metal = m.metal;
    const coat = m.coat;
    const sheen = m.sheen;
    const fuzz = m.fuzz;
    if (fuzz > 0.04) {
      const nFuzz = 1 + Math.round(fuzz * 3);
      for (let i = 0; i < nFuzz; i++) {
        const o = (i - (nFuzz - 1) / 2) * (0.85 + fuzz * 2.0);
        ctx.globalAlpha = Math.min(1, alpha * (0.08 + 0.22 * fuzz));
        ctx.strokeStyle = 'rgb(' + mix255(cr, -0.08) + ',' + mix255(cg, -0.06) + ',' + mix255(cb, -0.04) + ')';
        ctx.lineWidth = width * (1.14 + fuzz * 0.85);
        ctx.beginPath();
        ctx.moveTo(x1 + nx * o, y1 + ny * o);
        ctx.lineTo(x2 + nx * o, y2 + ny * o);
        ctx.stroke();
      }
    }
    const g = ctx.createLinearGradient(
      x1 - nx * rad * side, y1 - ny * rad * side,
      x1 + nx * rad * side, y1 + ny * rad * side
    );
    const hi = 0.36 + 0.42 * depth + metal * 0.48 - rough * 0.36;
    const hiStop = Math.max(0.12, Math.min(0.58, 0.36 - metal * 0.2 + rough * 0.28));
    const shadeAmt = -0.48 + rough * 0.22 - metal * 0.14;
    g.addColorStop(0, 'rgb(' + mix255(cr, hi) + ',' + mix255(cg, hi * 0.9) + ',' + mix255(cb, hi * (0.65 + metal * 0.3)) + ')');
    g.addColorStop(hiStop, 'rgb(' + cr + ',' + cg + ',' + cb + ')');
    g.addColorStop(1, 'rgb(' + mix255(cr, shadeAmt) + ',' + mix255(cg, shadeAmt + 0.02) + ',' + mix255(cb, shadeAmt + 0.08) + ')');
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.strokeStyle = g;
    ctx.lineWidth = width * (1 + metal * 0.06);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    if (coat > 0.03) {
      ctx.globalAlpha = Math.min(1, alpha * (0.2 + 0.62 * coat) * (0.4 + 0.6 * depth));
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.18 + 0.55 * coat) + ')';
      ctx.lineWidth = Math.max(0.55, width * (0.16 + 0.28 * coat));
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    if (sheen > 0.03) {
      const rim = rad * (0.58 + 0.28 * sheen);
      ctx.globalAlpha = Math.min(1, alpha * (0.14 + 0.5 * sheen) * (0.3 + 0.7 * depth));
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.24 + 0.58 * sheen) + ')';
      ctx.lineWidth = Math.max(0.45, width * (0.1 + 0.16 * sheen));
      ctx.beginPath();
      ctx.moveTo(x1 - nx * rim * side, y1 - ny * rim * side);
      ctx.lineTo(x2 - nx * rim * side, y2 - ny * rim * side);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function drawLitDot(cx, cy, rad, alpha, cr, cg, cb, depth, mats) {
    if (alpha <= 0.02 || rad < 0.4) return;
    const m = mats || {
      rough: BGANIM_PUBLISH_POSE.mats.rough / 100,
      metal: BGANIM_PUBLISH_POSE.mats.metal / 100,
      coat: BGANIM_PUBLISH_POSE.mats.coat / 100,
      sheen: BGANIM_PUBLISH_POSE.mats.sheen / 100,
      fuzz: BGANIM_PUBLISH_POSE.mats.fuzz / 100,
    };
    const metal = m.metal;
    const rough = m.rough;
    const coat = m.coat;
    const sheen = m.sheen;
    const fuzz = m.fuzz;
    const hx = cx + TUBE_LX * rad * 0.42;
    const hy = cy + TUBE_LY * rad * 0.42;
    if (fuzz > 0.04) {
      ctx.globalAlpha = Math.min(1, alpha * (0.1 + 0.28 * fuzz));
      ctx.beginPath(); ctx.arc(cx, cy, rad * (1.16 + fuzz * 0.45), 0, Math.PI * 2);
      ctx.fillStyle = 'rgb(' + mix255(cr, -0.06) + ',' + mix255(cg, -0.04) + ',' + mix255(cb, -0.02) + ')';
      ctx.fill();
    }
    const grd = ctx.createRadialGradient(hx, hy, rad * 0.08, cx, cy, rad);
    const hi = 0.52 + metal * 0.38 - rough * 0.18;
    grd.addColorStop(0, 'rgb(' + mix255(cr, hi) + ',' + mix255(cg, hi * 0.87) + ',' + mix255(cb, hi * (0.55 + metal * 0.25)) + ')');
    grd.addColorStop(0.45, 'rgb(' + cr + ',' + cg + ',' + cb + ')');
    grd.addColorStop(1, 'rgb(' + mix255(cr, -0.42 - metal * 0.08) + ',' + mix255(cg, -0.40) + ',' + mix255(cb, -0.34) + ')');
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fillStyle = grd; ctx.fill();
    if (coat > 0.04 && rad > 1.5) {
      ctx.globalAlpha = Math.min(1, alpha * (0.12 + 0.4 * coat) * (0.4 + 0.6 * depth));
      ctx.beginPath(); ctx.arc(cx, cy, rad * 0.92, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.2 + 0.45 * coat) + ')';
      ctx.lineWidth = Math.max(0.5, rad * (0.08 + 0.12 * coat));
      ctx.stroke();
    }
    if (rad > 2 && depth > 0.25) {
      ctx.globalAlpha = Math.min(1, alpha * (0.2 + 0.45 * depth) * (0.55 + 0.9 * sheen));
      ctx.beginPath(); ctx.arc(hx, hy, Math.max(0.4, rad * (0.14 + 0.12 * sheen)), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.7 + 0.25 * sheen) + ')'; ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* Paint one frame at time `t` (seconds). The strand runs along a tilted, slowly-
     swaying axis that DESCENDS left→right (high on the left, low on the right); its
     loops TRAVEL end-to-end at a slow crawl (a moving twist, not an in-place spin).
     The helix EXPANDS AND CONTRACTS as a very slow wave that travels left→right — at
     any instant one stretch is fattening while another is pinching in. In the full
     roster, product photos are identical circles; in the "Ten" density the same
     strand still carries every node — about ten foods swell a bit larger, and
     every other circle is the WISE owl logo bug. Their ring matches the strand
     stroke, and everything is scaled by the shared opacity. */
  function draw(t) {
    if (!ctx || !bctx || w < 2 || h < 2) return;
    lastT = t;                                                 // remember the last painted time (for redraw)
    if (lastSpinT == null) lastSpinT = t;
    else {
      const dt = t - lastSpinT;
      lastSpinT = t;
      if (dt !== 0) spinT += dt * getSpinSpeedMul() * getSpinDir();
    }
    const st = spinT;
    rgb = readColor();                                         // track preset / theme flips live
    const few = getDensity() === 'ten';
    if (few && densityNow !== 'ten') fewSince = t;
    densityNow = few ? 'ten' : 'full';
    const grow = few
      ? (1 - Math.pow(1 - Math.min(1, Math.max(0, t - fewSince) / 2.05), 3))
      : 1;
    const O = Math.max(0, Math.min(1, getOpacity())); // shared opacity control (pane-count default until user-set)
    /* Draw the whole field to an OFFSCREEN buffer at full strength — the opaque product
       discs hide the strand lines *inside* the buffer — then blit the buffer onto the
       visible canvas at O. So the opacity slider fades EVERYTHING together, yet no line
       ever shows through a circle. `ctx` is aliased to the buffer for the render below. */
    const mainCtx = ctx;
    ctx = bctx;
    ctx.clearRect(0, 0, w, h);
    const [r, g, b] = rgb;
    const cx = w / 2 + (getShift() / 100) * w * SHIFT_SPAN, cy = h * getCenterY();
    const intro = 1 - Math.pow(1 - Math.min(1, t / 3.2), 3);   // gentle grow-in over ~3.2s
    /* Angled axis that slowly sways around the member's chosen tilt (degrees from
       the shared Angle slider; default 10° so the strand rides high on the left
       and drops toward the right). */
    const theta = (getAngle() * Math.PI / 180) + 0.06 * Math.sin(st * 0.045);
    const ax = Math.cos(theta), ay = Math.sin(theta);          // along-axis unit vector
    const px = -Math.sin(theta), py = Math.cos(theta);         // perpendicular unit vector
    /* Coil volume "breathes" on an ultra-slow, irregular cycle (~2–3 min): the
       helix opens and closes how wide the corkscrew is. Scale Z amplifies that
       volume. Thick and Depth are separate — stroke weight and 3-D pop. */
    const sc = getScaleAxes();
    /* Strand length — the default covers the tilted diagonal; the Length knob
       runs it further past the edges or pulls it into a short, central span.
       On a chat card (fillHost) a steep Scene pose also grows so the faded
       tips reach the host's top and bottom — the helix is the container
       background, not a mid-pane ribbon. */
    const Lknob = Math.hypot(w, h) * 1.2 * getLengthMul();
    let L = Lknob;
    if (fillHost && Math.abs(ay) > 0.45) {
      const yAlong = Math.max(0.08, Math.abs(ay) * sc.y);
      L = Math.max(Lknob, 2 * Math.max(cy, h - cy) / yAlong * 1.16);
    }
    const thick = getThicknessMul();
    const depth3d = getDepthMul();
    const volume = 1 + (0.16 * Math.sin(st * 0.02) + 0.07 * Math.sin(st * 0.009 + 1.3)) * sc.z;
    /* Coil radius stays at the original narrow-strand size. Scale X / Y stretch
       the projected helix from its centre; Scale Z is how wide the corkscrew
       opens; Depth (not Scale Z) is the near/far pop so front nodes spread and
       back nodes pinch. */
    const ampBase = Math.min(h * 0.26, 120) * volume;
    const shade = (z) => {
      const d = (z + 1) * 0.5;
      return Math.max(0, Math.min(1, 0.5 + (d - 0.5) * depth3d));
    };
    const mapPt = (x, y, z, alpha) => {
      const pop = 1 + z * 0.18 * (depth3d - 1);
      return {
        x: cx + (x - cx) * sc.x * pop,
        y: cy + (y - cy) * sc.y * pop,
        z,
        alpha,
      };
    };
    /* Base circle size (before depth + breath). The circles ride the field, so
       they follow the UNIFORM part of the scale — the smaller of X / Y — and a
       scaled-down helix reads as a smaller field rather than a clump of
       full-size discs. Stretching one axis alone leaves them be. The Nodes knob
       then multiplies on top. */
    const nodeMul = getNodesMul() * Math.min(sc.x, sc.y);
    const dotSize = 34 * nodeMul;
    /* Ten-density foods start at the usual dot size and swell past the owl-bug
       field so the product photos read as the focus of the cluster. */
    const prodSize = few ? (dotSize + 30 * grow * nodeMul) : dotSize;
    /* Expand ↔ contract as a slow wave travelling left→right along the strand. */
    const breathK = (Math.PI * 2 * 1.4) / L;                   // ~1.4 squeezes across the strand
    const breathSpeed = 0.11;                                  // how fast the wave crawls (very slow)
    /* --- Sample the double helix at HIGH resolution so the backbones read as smooth,
       rounded flows (a real DNA helix is two out-of-phase sine curves, not a zig-zag).
       `lambda` is the pitch (px per full turn); `phase` crawls the twist along the axis
       very slowly; each sample carries z = depth so we can shade + sort front/back. --- */
    const lambda = Math.max(150, Math.min(240, L / 5.5)) * getPitchMul();
    const kw = (Math.PI * 2) / lambda;                         // angular frequency along axis
    const twistDrift = 1 + 0.05 * Math.sin(st * 0.03);          // pitch drifts a touch, slowly
    const phase = st * 0.08;                                    // loops crawl along the axis (speed × direction)
    /* Sample fine enough that a TIGHT pitch still reads as a rounded curve
       instead of a zig-zag; the default pitch keeps the original 7px stride.
       N is capped so a 400% strand cannot run the frame cost away. */
    const STEP = Math.max(2.5, Math.min(7, lambda / 20));      // px between samples → rounded curve
    const N = Math.max(24, Math.min(480, Math.round(L / STEP)));
    /* Camera: azimuth spins the look-from around the coil (left / front /
       right / back); elevation pitches it above or below. Together they cover
       every 3-D side. The axis Angle is unchanged — only the radial + depth
       offset rotates, so the strand stays on the same diagonal. */
    const elev = getCamera() * Math.PI / 180;
    const az = getAzimuth() * Math.PI / 180;
    const elC = Math.cos(elev), elS = Math.sin(elev);
    const azC = Math.cos(az), azS = Math.sin(az);
    const rotCam = (rx, ry, rz) => {
      const x1 = rx * azC + rz * azS;
      const z1 = -rx * azS + rz * azC;
      return {
        x: x1,
        y: ry * elC - z1 * elS,
        z: ry * elS + z1 * elC,
      };
    };
    const A = [], B = [];
    for (let i = 0; i <= N; i++) {
      const u = (i / N - 0.5) * L;
      const phi = u * kw * twistDrift - phase;
      const s = Math.sin(phi), c = Math.cos(phi);
      const endFade = smooth((L * 0.5 - Math.abs(u)) / (L * 0.13));
      const amp = ampBase * intro * (1 + 0.4 * Math.sin(u * breathK - st * breathSpeed));
      const bx = cx + ax * u, by = cy + ay * u;                // point on the axis
      const ra = rotCam(px * amp * s, py * amp * s, amp * c);
      const rb = rotCam(-px * amp * s, -py * amp * s, -amp * c);
      const zDiv = amp > 1e-6 ? amp : 1;
      A.push(mapPt(bx + ra.x, by + ra.y, ra.z / zDiv, endFade));
      B.push(mapPt(bx + rb.x, by + rb.y, rb.z / zDiv, endFade));
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
    const look = getLook();
    const lit = look === '3d';
    const mats = {
      rough: getMat('rough') / 100,
      metal: getMat('metal') / 100,
      coat: getMat('coat') / 100,
      sheen: getMat('sheen') / 100,
      fuzz: getMat('fuzz') / 100,
    };
    for (const seg of segs) {
      const d = shade(seg.z);                                  // 0 (far) → 1 (near)
      const la = seg.a * (0.26 + 0.6 * d);
      if (la <= 0.01) continue;
      if (lit) drawLitSeg(seg.x1, seg.y1, seg.x2, seg.y2, (2.2 + 3.4 * d) * thick * 1.12, la, d, mats);
      else {
        ctx.lineWidth = (1.1 + 1.9 * d) * thick;                 // near strand is fatter
        ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + la + ')';
        ctx.beginPath(); ctx.moveTo(seg.x1, seg.y1); ctx.lineTo(seg.x2, seg.y2); ctx.stroke();
      }
    }
    /* Rungs — base-pair links, a couple per turn, shaded by their own depth.
       Match pins them to product circles; the Rungs slider densifies or thins
       the original stride; Bar is stroke weight. */
    const nodeEvery = Math.max(3, Math.round(48 / STEP));
    const origRungEvery = Math.max(4, Math.round(lambda / (STEP * 2)));
    const rungsOn = getRungsMul() > 0.02 && getRungThickMul() > 0.02;
    const rungEvery = !rungsOn
      ? Infinity
      : (getRungsMatch()
          ? nodeEvery
          : Math.max(2, Math.round(origRungEvery / Math.max(0.25, getRungsMul()))));
    const rungThick = getRungThickMul();
    if (rungsOn) for (let i = 0; i <= N; i += rungEvery) {
      const p = A[i], q = B[i];
      if (!p || !q) continue;
      const a = Math.min(p.alpha, q.alpha);
      if (a <= 0.01) continue;
      const d = shade((p.z + q.z) * 0.5);
      const la = a * (0.16 + 0.28 * d);
      if (lit) drawLitSeg(p.x, p.y, q.x, q.y, (1.6 + 1.1 * d) * thick * rungThick * 1.08, la, d, mats);
      else {
        ctx.lineWidth = (1.1 + 0.6 * d) * thick * rungThick;
        ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + la + ')';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      }
    }
    /* A slow, deep "breath" pulses every circle's size together — echoing the original
       centre owl's pulse. Combined with depth (near = bigger), the circles swell as they
       come to the FRONT of the helix and shrink as they swing to the back. */
    const breathe = 1 + 0.09 * Math.sin(st * 0.42);             // deep + slow, ~15s at 100% speed
    /* Same node stride as the full helix — Ten keeps every circle on the
       strand. Only ~10 of them are foods; every other circle is the WISE owl
       logo bug. (nodeEvery is computed with the rungs so Match can share it.) */
    const nodes = [];
    /* Every food on the strand is UNIQUE: `pi` walks the (session-shuffled) pool
       once and never rewinds, so no product can appear twice in a frame. Should a
       huge canvas ever outrun the pool, the owl mark stands in — never a repeat. */
    if (!hideProducts) {
      if (few) {
        const slots = [];
        for (let i = 0; i <= N; i += nodeEvery) {
          if (A[i]) slots.push(A[i]);
          if (B[i]) slots.push(B[i]);
        }
        const wantProd = Math.min(10, slots.length);
        const prodAt = new Set(pickClustered(wantProd, slots.length));
        let pi = 0;
        for (let i = 0; i < slots.length; i++) {
          const s = slots[i];
          if (prodAt.has(i)) {
            const p = PRODUCTS[pi++];
            nodes.push({ x: s.x, y: s.y, z: s.z, alpha: s.alpha, owl: !p, prod: p || null });
          } else {
            nodes.push({ x: s.x, y: s.y, z: s.z, alpha: s.alpha, owl: true, prod: null });
          }
        }
      } else {
        let ni = 0, pi = 0;
        for (let i = 0; i <= N; i += nodeEvery) {
          const owlA = (ni % 7 === 3), owlB = (ni % 7 === 0);
          const a = A[i], b = B[i];
          const pa = owlA ? null : PRODUCTS[pi++];
          const pb = owlB ? null : PRODUCTS[pi++];
          nodes.push({ x: a.x, y: a.y, z: a.z, alpha: a.alpha, owl: owlA || !pa, prod: pa || null });
          nodes.push({ x: b.x, y: b.y, z: b.z, alpha: b.alpha, owl: owlB || !pb, prod: pb || null });
          ni++;
        }
      }
      nodes.sort((p, q) => p.z - q.z);
    }
    /* Little beads along both backbones — the nucleotides between product
       circles. They sit on a finer stride than the photos (and on every rung
       end), skip anything that would land under a large node, and honour the
       Dots size / colour / motion controls. */
    const dotsMul = getDotsMul() * Math.min(sc.x, sc.y);
    const beadBase = 4.8 * dotsMul;
    const dotsMotion = reducedMotion ? 'still' : getDotsMotion();
    const customRgb = parseDotsRgb(getDotsColorHex());
    const [dr, dg, db] = customRgb || [r, g, b];
    const occupiedI = new Set();
    if (!hideProducts) {
      for (let i = 0; i <= N; i += nodeEvery) occupiedI.add(i);
    }
    const beadI = new Set();
    const dotEvery = Math.max(2, Math.round(16 / STEP));
    for (let i = 0; i <= N; i += dotEvery) beadI.add(i);
    for (let i = 0; i <= N; i += rungEvery) beadI.add(i);
    const beads = [];
    const clearRad = Math.max(10, dotSize * 0.52);
    const clearRad2 = clearRad * clearRad;
    beadI.forEach((i) => {
      if (occupiedI.has(i)) return;
      const nearLarge = (pt) => {
        for (let n = 0; n < nodes.length; n++) {
          const dx = nodes[n].x - pt.x, dy = nodes[n].y - pt.y;
          if (dx * dx + dy * dy < clearRad2) return true;
        }
        return false;
      };
      const a = A[i], b = B[i];
      if (a && a.alpha > 0.02 && !nearLarge(a)) beads.push({ x: a.x, y: a.y, z: a.z, alpha: a.alpha, i, strand: 0 });
      if (b && b.alpha > 0.02 && !nearLarge(b)) beads.push({ x: b.x, y: b.y, z: b.z, alpha: b.alpha, i, strand: 1 });
    });
    beads.sort((p, q) => p.z - q.z);
    for (const bead of beads) {
      const d = shade(bead.z);
      let sizeK = 0.78 + 0.40 * d;
      let aK = bead.alpha * (0.38 + 0.62 * d);
      const u = bead.i / Math.max(1, N);
      if (dotsMotion === 'pulse') {
        const pSpeed = getMotionKnobMul('pulse', 'speed');
        const pSize = getMotionKnobMul('pulse', 'size');
        const pSpan = getMotionKnobMul('pulse', 'length');
        /* Span stretches or pinches the breath along the strand (fewer, wider
           waves when high). Rate is how fast those waves roll. */
        const waves = Math.max(0.45, 2.2 / Math.max(0.15, pSpan));
        const s = 0.5 + 0.5 * Math.sin((u * waves - st * 0.52 * pSpeed + bead.strand * 0.5) * Math.PI * 2);
        sizeK *= 0.52 + (0.55 + 1.55 * pSize) * s;
        aK *= 0.28 + 0.95 * s;
      } else if (dotsMotion === 'spark') {
        const sSpeed = getMotionKnobMul('spark', 'speed');
        const sSize = getMotionKnobMul('spark', 'size');
        const sLen = getMotionKnobMul('spark', 'length');
        const pos = ((st * 0.58 * sSpeed) % 1 + 1) % 1;
        const span = Math.max(0.035, 0.20 * sLen);
        let dist = Math.abs(u - pos);
        dist = Math.min(dist, 1 - dist);
        const spark = Math.pow(Math.max(0, 1 - dist / span), 2.0);
        aK *= 0.10 + 1.65 * spark;
        sizeK *= 0.28 + (0.35 + 2.2 * sSize) * spark;
      }
      const rad = Math.max(0.45, (beadBase / 2) * sizeK);
      if (aK <= 0.02 || rad < 0.4) continue;
      if (lit) drawLitDot(bead.x, bead.y, rad, aK, dr, dg, db, d, mats);
      else {
        ctx.globalAlpha = Math.min(1, aK);
        ctx.beginPath(); ctx.arc(bead.x, bead.y, rad, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(' + dr + ',' + dg + ',' + db + ')';
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    hitNodes = [];
    for (const n of hideProducts ? [] : nodes) {
      if (n.alpha <= 0.02) continue;
      const d = shade(n.z);                                    // 0 (far) → 1 (near)
      const size = prodSize * (0.74 + 0.54 * d) * breathe;     // near circles are larger
      const rad = size / 2;
      /* Full-density owl bugs sit 20% larger than a product at the same depth.
         In Ten density the owl shrinks (~18% under the base dot) so the clustered
         foods can swell past the logo-bug field. */
      if (n.owl) {
        const owlSize = (few ? dotSize * 0.82 : prodSize) * (0.74 + 0.54 * d) * breathe;
        drawOwl(n.x, n.y, owlSize * (few ? 1 : 1.2), n.alpha, n.alpha);
        continue;
      }
      if (!n.prod) continue;
      const im = images && images[n.prod.img];
      if (!im || !im.complete || !im.naturalWidth) {
        /* Photo still loading — stand in with the owl bug so a Ten-density
           slot never goes empty for a frame. The product paints on the next
           frame once the image arrives. */
        if (few) {
          const owlSize = dotSize * 0.82 * (0.74 + 0.54 * d) * breathe;
          drawOwl(n.x, n.y, owlSize, n.alpha, n.alpha);
        }
        continue;
      }
      const isHover = hoverImg && n.prod.img === hoverImg;
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
    /* A shown card stays glued to its (now frozen) circle and closes once
       the pointer leaves both circle and card — or if its product leaves
       the frame. A circle drifting back under a parked cursor does not
       reopen it. */
    if (hoverImg) {
      let live = null;
      for (let i = hitNodes.length - 1; i >= 0; i--) {
        if (hitNodes[i].prod.img === hoverImg) { live = hitNodes[i]; break; }
      }
      if (live && !nodeIsInteractive(live)) live = null;
      if (live) {
        hoverX = live.x; hoverY = live.y;
        if (card && !card.hidden) placeCard(live);
        if (!overCard && ptrX >= 0 && !insideNode(live, ptrX, ptrY, 2)) {
          hideCard();
        }
      } else if (!overCard) {
        hideCard();
      }
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
    if (!running || paused) return;
    if (!t0) t0 = now;
    /* ~30 fps is plenty for a 20% opacity background — skip extra frames. */
    if (now - lastFrame < 33) { raf = requestAnimationFrame(frame); return; }
    lastFrame = now;
    draw((now - t0) / 1000);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (!isOn() || typeof document === 'undefined') return;
    cancelLeave();
    ensure();
    if (!canvas || !ctx) return;
    rgb = readColor();
    host.classList.add('sc-bganim-live');
    /* Hidden (Roll / Crawl) or not yet laid out — CSS is live so the
       welcome goes transparent, but do not spin a 1×1 canvas. resize()
       kicks the loop the moment the host has a box. */
    if (!hostHasBox()) return;
    /* Reduced-motion: honour the calm by painting a single still frame of the strip. */
    if (reducedMotion) {
      running = false; paused = false; if (raf) { cancelAnimationFrame(raf); raf = 0; }
      t0 = 0; draw(3);
      /* Photos/owl may still be loading — repaint once they arrive so the still frame fills in. */
      if (!hideProducts) {
        const pending = images ? PRODUCTS.map((p) => images[p.img]).concat(owlImg ? [owlImg] : []) : [];
        pending.forEach((im) => { if (im && !im.complete) im.addEventListener('load', () => { if (!running) draw(3); }, { once: true }); });
      }
      return;
    }
    /* Start FROZEN when playback is paused app-wide: run the field but hold it on a
       representative (fully-grown) still frame; resume() picks up smoothly from here. */
    if (isPaused()) {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      running = true; paused = true; t0 = 0; lastT = 3; draw(3);
      if (!hideProducts) {
        const pending = images ? PRODUCTS.map((p) => images[p.img]).concat(owlImg ? [owlImg] : []) : [];
        pending.forEach((im) => { if (im && !im.complete) im.addEventListener('load', () => { if (paused) draw(lastT); }, { once: true }); });
      }
      return;
    }
    if (running && !paused) return;
    running = true; paused = false; t0 = 0;
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  /* Freeze the running field on its current frame (canvas stays visible). */
  function pause() {
    if (!running || paused) return;
    paused = true;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  function resumeLoop() {
    if (!running || !paused) return;
    paused = false;
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    t0 = now - lastT * 1000;                       // continue from the frozen time
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  /* Resume from the frozen frame, continuing the loop smoothly (no jump/restart).
     A hover popover keeps the hold until the pointer leaves that card. */
  function resume() {
    if (cardIsOpen()) return;
    resumeLoop();
  }

  function unfreezeCanvasBox() {
    if (!canvas) return;
    canvas.style.left = '';
    canvas.style.top = '';
    canvas.style.width = '';
    canvas.style.height = '';
    canvas.style.right = '';
    canvas.style.bottom = '';
    canvas.style.inset = '';
  }

  /* Pin the canvas to its current box so a chat-column or composer reflow
     cannot shrink the strand (that read as a collapse). The bloom scales
     this frozen frame, then hardStop clears the pin. */
  function freezeCanvasBox() {
    if (!canvas) return;
    const body = canvas.parentElement;
    if (!body) return;
    const r = canvas.getBoundingClientRect();
    const br = body.getBoundingClientRect();
    canvas.style.left = (r.left - br.left) + 'px';
    canvas.style.top = (r.top - br.top) + 'px';
    canvas.style.width = r.width + 'px';
    canvas.style.height = r.height + 'px';
    canvas.style.right = 'auto';
    canvas.style.bottom = 'auto';
    canvas.style.inset = 'auto';
  }

  function cancelLeave() {
    if (!leaving && !leaveTimer) return;
    leaving = false;
    if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = 0; }
    host.classList.remove('sc-bganim-leaving');
    unfreezeCanvasBox();
  }

  function hardStop() {
    cancelLeave();
    running = false; paused = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    overCard = false; hoverPinned = false; hoverImg = null; hoverX = hoverY = -1; ptrX = ptrY = -1;
    if (card) card.hidden = true;
    const cbody = canvas && canvas.parentElement;
    if (cbody) cbody.style.cursor = '';
    endPan();
    host.classList.remove('sc-bganim-live', 'sc-bganim-panning', 'sc-bganim-leaving');
    if (ctx) ctx.clearRect(0, 0, w, h);
    spinT = 0; lastSpinT = null;
    lastFrame = 0;
  }

  /* First engage: keep the last frame, freeze its size, then fade + expand.
     `immediate` skips the bloom (history restore, style swap, reduced motion). */
  function beginLeave() {
    if (leaving) return;
    if (!canvas || !host.classList.contains('sc-bganim-live')) {
      hardStop();
      return;
    }
    leaving = true;
    running = false; paused = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    overCard = false; hoverPinned = false; hoverImg = null; hoverX = hoverY = -1; ptrX = ptrY = -1;
    if (card) card.hidden = true;
    const cbody = canvas.parentElement;
    if (cbody) cbody.style.cursor = '';
    endPan();
    freezeCanvasBox();
    void canvas.offsetWidth;
    host.classList.add('sc-bganim-leaving');
    leaveTimer = setTimeout(hardStop, LEAVE_MS);
  }

  function stop(opts) {
    const immediate = !!(opts && opts.immediate);
    if (immediate || reducedMotion) {
      hardStop();
      return;
    }
    if (leaving) return;
    beginLeave();
  }

  /* Preset / colour-picker changes while the field is paused (or on a still
     reduced-motion frame) must restain the strand immediately. Running
     frames already re-read in draw(). */
  if (typeof document !== 'undefined' && !host.__fbHelixColorBound) {
    host.__fbHelixColorBound = true;
    document.addEventListener('wise:fb-surfaces', () => {
      rgb = readColor();
      if (!canvas || !ctx) return;
      if (host.classList.contains('sc-bganim-live') && !leaving) draw(lastT || 3);
    });
  }
  /* Walk / Run (or CWR off) un-hides the chat. ResizeObserver usually
     fires; this is the backup so a 0×0 start cannot stay blank. */
  if (typeof window !== 'undefined' && !host.__helixCwrWakeBound) {
    host.__helixCwrWakeBound = true;
    const wake = () => {
      if (typeof requestAnimationFrame !== 'function') { resize(); return; }
      requestAnimationFrame(() => { if (!leaving) resize(); });
    };
    window.addEventListener('wise:cwr-mode', wake);
    document.addEventListener('wise:cwr-ui', wake);
  }

  return { start, stop, pause, resume, redraw, resize };
}

/* Third ambient style: the owl "orbit" constellation. Unlike helix this
   engine paints nothing itself — the owl-centered node web is the welcome
   screen's own decoration (js/welcome-orbit.js enhances `.ws-logo-wrap`
   only while Orbit is the shared style). Helix hides the wrap; running
   orbit means tagging the host with `sc-orbit-live` so the owl can show.
   start() is a no-op beyond that; the facade's stop() (which tears down
   the helix engine) is what reveals the owl again. */
export function createOrbitBgAnim(cfg) {
  const host = cfg.host;
  const isOn = typeof cfg.isOn === 'function' ? cfg.isOn : () => true;
  function start() { if (!isOn() || typeof document === 'undefined') return; host.classList.add('sc-orbit-live'); }
  function stop() { host.classList.remove('sc-orbit-live'); }
  function pause() {}
  function resume() {}
  return { start, stop, pause, resume, redraw() {} };
}

/* ------------------------------------------------------------------ */
/* Grouped chat three-dot menu (shared)                                */
/* ------------------------------------------------------------------ */
/* Reorganize a chat "More options" popover's flat row list into titled GROUP
   CARDS. Member-facing cards stack in one column so the menu hangs from the
   kebab; play/pause stays in that stack as the only non-admin Helix row.
   The full Helix studio joins as a second column only when Internal admins
   is on. It MOVES the existing row nodes (never re-creates them) so every
   wired listener + captured reference stays valid, then tags the popover
   with .sc-menu-grouped.

   Columns are REAL flex wrappers — not CSS `column-width`. Chromium's
   multi-column hit-testing often maps a click in a later column onto
   empty space or a left-column row, which made every switch look dead.

   Rows are bucketed by their stable data-sc id; sub-control blocks (the opacity
   and angle sliders, style/playback segments, streaming detail, strip side) carry
   no data-sc and simply follow whichever toggle preceded them, so they land in
   that toggle's group. Unknown rows fall through to a "More" group so nothing is
   ever dropped.
   Helix sits in its own column so its clustered sliders are not stacked under
   Conversation. Idempotent — a second call is a no-op. */
const CHAT_MENU_GROUP_ORDER = ['navigate', 'conversation', 'data', 'display', 'helix', 'motion', 'more', 'danger'];
const CHAT_MENU_COL = {
  navigate: 1, conversation: 1, data: 1, display: 1,
  helix: 2,
  motion: 1, more: 1, danger: 1,
};
const CHAT_MENU_GROUP_TITLE = {
  navigate: 'Go to', conversation: 'Conversation', data: 'Data & agents',
  display: 'Display', helix: 'Helix', motion: 'Activity & streaming',
  more: 'More', danger: '',
};
const CHAT_MENU_GROUP_OF = {
  history: 'conversation', new: 'conversation', export: 'conversation', share: 'conversation', 'file-library': 'conversation', 'add-member': 'conversation',
  turns: 'data', outputs: 'data', connect: 'data', 'mcp-toggle': 'data', sticky: 'data',
  'toggle-cards': 'display', 'toggle-intent-chips': 'display', compact: 'display', brandtext: 'display', sheen: 'display',
  'bg-anim': 'helix', 'bg-anim-snap': 'helix', 'bg-anim-snap-save': 'helix',
  'activity-strip': 'motion', 'stream-toggle': 'motion', 'ollama-toggle': 'motion',
  close: 'danger',
};
/* Resolve which group a menu ROW belongs to. Prefers the stable data-sc id used
   by the shared template, then falls back to secondary hints so hand-rolled
   surfaces (which key some rows off data-ap / ids / onclick instead) still bucket
   correctly. Returns null for a row we don't recognize — the caller then keeps it
   with the current group so nothing is orphaned. */
function chatMenuGroupKey(el) {
  const sc = el.getAttribute && el.getAttribute('data-sc');
  if (sc && CHAT_MENU_GROUP_OF[sc]) return CHAT_MENU_GROUP_OF[sc];
  try {
    if (el.matches('.topbar-menu-item--danger, [data-ap="close"], [data-sc="close"]')) return 'danger';
    if (el.matches('[data-ap="restart"], [data-ap="export"], [data-ap="share"]')) return 'conversation';
    if (el.matches('.sc-actstrip-item, [id*="actstrip"], [onclick*="ActivityStrip"], [onclick*="activityStrip"]')) return 'motion';
  } catch (_) {}
  return null;
}

/* ── Chat ⋯ nested Admin popover ───────────────────────────────────────────
   A kebab in the grouped menu's top-right opens a small card with the same
   master "Admin controls" switch the Appearance popover uses (wise-admin-ui).
   That kebab is itself admin chrome — it hides when Internal admins is off,
   so the member-facing menu never offers a way to turn admin items on.
   Off hides every Admin-badged row and the chrome that belongs to one, so
   the menu shows only member-facing items plus Helix play/pause. The live
   feature state of anything already on is left alone, including the selected
   Roll · Crawl · Walk · Run mode. Off Internal admins only hides the
   floating CWR widget. */
const CHAT_ADMIN_UI_KEY = 'wise-admin-ui';
function isChatAdminUiOn() {
  try { return localStorage.getItem(CHAT_ADMIN_UI_KEY) !== '0'; } catch (_) { return true; }
}
function applyChatAdminUi(on) {
  try { localStorage.setItem(CHAT_ADMIN_UI_KEY, on ? '1' : '0'); } catch (_) {}
  try { document.dispatchEvent(new CustomEvent('wise:admin-ui', { detail: { on: !!on } })); } catch (_) {}
}
function placeChatMenuAdminPop(btn, panel) {
  if (!btn || !panel) return;
  const r = btn.getBoundingClientRect();
  const pw = panel.offsetWidth || 228;
  const ph = panel.offsetHeight || 48;
  const gap = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  /* Prefer above the kebab; if that clips, sit to the right; if that clips,
     sit to the left — never hang the card directly under the trigger. */
  let top = r.top - ph - gap;
  let left = r.right - pw;
  let side = '';
  if (top >= 8) {
    left = Math.max(8, Math.min(left, vw - pw - 8));
  } else {
    top = r.top + (r.height - ph) / 2;
    left = r.right + gap;
    side = 'right';
    if (left + pw > vw - 8) {
      left = r.left - pw - gap;
      side = 'left';
    }
    top = Math.max(8, Math.min(top, vh - ph - 8));
    left = Math.max(8, Math.min(left, vw - pw - 8));
  }
  panel.style.position = 'fixed';
  panel.style.left = Math.round(left) + 'px';
  panel.style.top = Math.round(top) + 'px';
  panel.style.right = 'auto';
  panel.style.bottom = 'auto';
  panel.style.zIndex = '2147483646';
  panel.classList.toggle('is-side', !!side);
  panel.classList.toggle('is-side-left', side === 'left');
  panel.classList.toggle('is-side-right', side === 'right');
}
function closeChatMenuAdminPop(wrap) {
  if (!wrap) return;
  const btn = wrap.__adminBtn || wrap.querySelector('.sc-menu-admin-btn');
  const panel = wrap.__adminPop;
  if (panel) {
    panel.classList.add('hidden');
    panel.classList.remove('is-side', 'is-side-left', 'is-side-right');
    if (wrap.isConnected && panel.parentElement !== wrap) wrap.appendChild(panel);
  }
  if (btn) {
    btn.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
  }
}
function isChatMenuAdminGated(el) {
  if (!el || !el.classList) return false;
  if (el.classList.contains('topbar-menu-item--admin')) return true;
  if (el.classList.contains('sc-bganim-playback')) return false;
  if (el.classList.contains('sc-bganim-cluster')) {
    try { if (el.querySelector('.sc-bganim-playback')) return false; } catch (_) {}
    return true;
  }
  if (el.classList.contains('sc-bganim-detail') || el.classList.contains('sc-bganim-style') || el.classList.contains('sc-bganim-look') || el.classList.contains('sc-bganim-dots-motion') || el.classList.contains('sc-bganim-spin') || el.classList.contains('sc-bganim-snapshots') || el.classList.contains('sc-bganim-subhead') || el.classList.contains('sc-actside-detail')) return true;
  if (el.hasAttribute && el.hasAttribute('data-admin-item')) return true;
  try {
    if (el.classList.contains('topbar-menu-item') && el.querySelector('.topbar-menu-badge')) return true;
  } catch (_) {}
  return false;
}
/* When Internal admins is off, Helix is a slim play/pause card in the
   member column (Conversation / Activity / Close). When it is on, the
   full studio returns to the second column. Skip a group that has been
   popped out into a floating Helix shell. */
function placeHelixGroupForAdmin(pop, on) {
  if (!pop || !pop.querySelector) return;
  const group = pop.querySelector(':scope > .sc-menu-col .sc-menu-group--helix, :scope > .sc-menu-group--helix');
  if (!group || group.closest('.sc-helix-float')) return;
  const helixCol = pop.querySelector(':scope > .sc-menu-col--helix');
  const col1 = pop.querySelector(':scope > .sc-menu-col:not(.sc-menu-col--helix)');
  if (!helixCol || !col1) return;
  if (on) {
    if (group.parentElement !== helixCol) helixCol.appendChild(group);
    return;
  }
  if (group.parentElement === col1) return;
  const before = col1.querySelector('.sc-menu-group--motion, .sc-menu-group--more, .sc-menu-group--danger');
  if (before) col1.insertBefore(group, before);
  else col1.appendChild(group);
}

function applyChatMenuAdminGate(pop) {
  if (!pop) return;
  /* Catalog specimens can pin a state with data-admin-demo so All Modules
     can show the member-facing menu without inheriting this browser's
     Internal admins setting (or the reverse). */
  const lock = pop.getAttribute && pop.getAttribute('data-admin-demo');
  const on = lock === 'on' ? true : lock === 'off' ? false : isChatAdminUiOn();
  pop.classList.toggle('sc-menu-admin-off', !on);
  placeHelixGroupForAdmin(pop, on);
  const wrap = pop.querySelector('.sc-menu-admin-wrap');
  if (!on) closeChatMenuAdminPop(wrap);
  const btn = wrap && (wrap.__adminBtn || wrap.querySelector('.sc-menu-admin-btn'));
  if (btn) {
    btn.classList.toggle('is-admin-on', on);
    const tip = on
      ? 'Internal admins on — hide admin items'
      : 'Internal admins off — show admin items';
    btn.setAttribute('aria-label', tip);
    btn.setAttribute('title', tip);
    btn.setAttribute('data-tip', tip);
  }
  const sw = wrap && wrap.__adminPop
    ? wrap.__adminPop.querySelector('[data-adminui]')
    : pop.querySelector('[data-adminui]');
  if (sw) {
    sw.classList.toggle('is-on', on);
    sw.setAttribute('aria-checked', on ? 'true' : 'false');
  }
  pop.querySelectorAll('.sc-menu-group').forEach((g) => {
    const keep = Array.from(g.children).some((c) => {
      if (!c || !c.classList) return false;
      if (c.classList.contains('sc-menu-group-head')) return false;
      if (!on && isChatMenuAdminGated(c)) return false;
      return true;
    });
    g.classList.toggle('is-empty', !keep);
  });
  pop.querySelectorAll('.sc-menu-col').forEach((col) => {
    const keep = Array.from(col.children).some((g) => g && !g.classList.contains('is-empty'));
    col.classList.toggle('is-empty', !keep);
  });
  const visibleCols = Array.from(pop.querySelectorAll('.sc-menu-col')).filter((c) => !c.classList.contains('is-empty'));
  pop.querySelectorAll('.sc-menu-col').forEach((c) => c.classList.remove('sc-menu-col--trail'));
  if (visibleCols.length) visibleCols[visibleCols.length - 1].classList.add('sc-menu-col--trail');
  pop.classList.toggle('sc-menu-one-col', visibleCols.length < 2);
  pop.classList.toggle('sc-menu-two-col', visibleCols.length === 2);
  /* Width just changed (Helix column appeared or collapsed). Re-pin so the
     menu stays hung from the kebab instead of keeping the old left offset. */
  scheduleGroupedChatMenuPlace(pop);
}

/* Right-align a grouped chat ⋮ to its kebab. popover-layer captures the
   in-flow offset once; a later width change (Internal admins on/off) would
   leave the panel floating off the trigger unless we recompute from the
   live size and write the new __plDX / __plDY. */
function chatMenuTrigger(pop) {
  if (!pop) return null;
  const host = pop.__plHost
    || (pop.__plMarker && pop.__plMarker.parentNode)
    || pop.closest('.panel-more-wrap');
  if (!host || !host.querySelector) return null;
  return host.querySelector('.panel-more-btn, [aria-haspopup="menu"]');
}
function placeGroupedChatMenu(pop) {
  if (!pop || !pop.isConnected) return;
  if (pop.hasAttribute('data-popover-static')) return;
  if (pop.classList.contains('sc-helix-float')) return;
  if (pop.classList.contains('hidden')) return;
  const btn = chatMenuTrigger(pop);
  if (!btn) return;
  const r = btn.getBoundingClientRect();
  const w = pop.offsetWidth || 250;
  const h = pop.offsetHeight || 0;
  const gap = 6;
  const pad = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  /* Hang from the kebab's right edge (the proper side of a right-edge
     trigger). Prefer below; if that clips the bottom, sit above. */
  let left = r.right - w;
  let top = r.bottom + gap;
  if (top + h > vh - pad && r.top - h - gap >= pad) {
    top = r.top - h - gap;
  }
  left = Math.max(pad, Math.min(left, vw - w - pad));
  top = Math.max(pad, Math.min(top, vh - h - pad));
  pop.style.right = 'auto';
  pop.style.bottom = 'auto';
  pop.style.left = '0px';
  pop.style.top = '0px';
  const origin = pop.getBoundingClientRect();
  pop.style.left = Math.round(left - origin.left) + 'px';
  pop.style.top = Math.round(top - origin.top) + 'px';
  if (pop.__plAnchor && pop.__plAnchor.isConnected) {
    const aRect = pop.__plAnchor.getBoundingClientRect();
    pop.__plDX = left - aRect.left;
    pop.__plDY = top - aRect.top;
  }
  pop.__reposition = () => placeGroupedChatMenu(pop);
}
function scheduleGroupedChatMenuPlace(pop) {
  const go = () => placeGroupedChatMenu(pop);
  go();
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(go);
}
function ensureChatMenuAdminDocWire() {
  if (typeof document === 'undefined' || document.__wiseChatAdminMenuWired) return;
  document.__wiseChatAdminMenuWired = true;
  document.addEventListener('wise:admin-ui', () => {
    document.querySelectorAll('.topbar-popover.sc-menu-grouped').forEach((el) => {
      applyChatMenuAdminGate(el);
      scheduleGroupedChatMenuPlace(el);
    });
  });
  document.addEventListener('click', (e) => {
    document.querySelectorAll('.sc-menu-admin-wrap').forEach((wrap) => {
      const panel = wrap.__adminPop;
      const t = e.target;
      if (wrap.contains(t) || (panel && panel.contains(t))) return;
      closeChatMenuAdminPop(wrap);
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    let closed = false;
    document.querySelectorAll('.sc-menu-admin-btn.is-open').forEach((btn) => {
      const wrap = btn.closest('.sc-menu-admin-wrap');
      if (wrap) { closeChatMenuAdminPop(wrap); closed = true; }
    });
    if (closed) e.stopPropagation();
  }, true);
  const refreshOpen = () => {
    document.querySelectorAll('.sc-menu-admin-btn.is-open').forEach((btn) => {
      const wrap = btn.closest('.sc-menu-admin-wrap');
      if (wrap && wrap.__adminPop && !wrap.__adminPop.classList.contains('hidden')) {
        placeChatMenuAdminPop(btn, wrap.__adminPop);
      }
    });
  };
  window.addEventListener('resize', refreshOpen);
  window.addEventListener('scroll', refreshOpen, true);
}
function mountChatMenuAdminPopover(pop) {
  if (!pop) return;
  ensureChatMenuAdminDocWire();
  let wrap = pop.querySelector('.sc-menu-admin-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'sc-menu-admin-wrap';
    wrap.innerHTML =
      '<button type="button" class="sc-menu-admin-btn" aria-haspopup="menu" aria-expanded="false" title="Internal admins" data-tip="Internal admins">' +
        '<span class="material-symbols-outlined">more_vert</span>' +
      '</button>' +
      '<div class="sc-admin-pop hidden" role="menu">' +
        '<button type="button" class="topbar-menu-item topbar-menu-item--admin sc-mcp-item" data-adminui="1" role="menuitemcheckbox" aria-checked="true">' +
          '<span class="material-symbols-outlined topbar-menu-icon">admin_panel_settings</span>' +
          '<span>Internal admins</span>' +
          '<span class="sc-switch sc-switch--pink" aria-hidden="true"></span>' +
        '</button>' +
      '</div>';
    pop.appendChild(wrap);
  }
  const btn = wrap.querySelector('.sc-menu-admin-btn');
  const panel = wrap.querySelector('.sc-admin-pop') || wrap.__adminPop;
  wrap.__adminBtn = btn;
  wrap.__adminPop = panel;
  if (wrap.dataset.wired === '1') {
    applyChatMenuAdminGate(pop);
    return;
  }
  wrap.dataset.wired = '1';
  const openPanel = () => {
    if (!panel) return;
    if (panel.parentElement !== document.body) document.body.appendChild(panel);
    panel.classList.remove('hidden');
    btn.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    placeChatMenuAdminPop(btn, panel);
    requestAnimationFrame(() => placeChatMenuAdminPop(btn, panel));
  };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = panel.classList.contains('hidden');
    if (willOpen) openPanel();
    else closeChatMenuAdminPop(wrap);
  });
  panel.addEventListener('click', (e) => {
    e.stopPropagation();
    const row = e.target.closest('[data-adminui]');
    if (!row) return;
    applyChatAdminUi(!isChatAdminUiOn());
    applyChatMenuAdminGate(pop);
    if (!panel.classList.contains('hidden')) placeChatMenuAdminPop(btn, panel);
    scheduleGroupedChatMenuPlace(pop);
  });
  const mo = new MutationObserver(() => {
    if (pop.classList.contains('hidden')) closeChatMenuAdminPop(wrap);
  });
  mo.observe(pop, { attributes: true, attributeFilter: ['class'] });
  applyChatMenuAdminGate(pop);
}
/* 3–5 word hint under every Admin-badged control. Keyed off the stable
   data-sc id (with a few host-specific fallbacks so hand-rolled menus that
   omit that attribute still get the same copy). Idempotent. */
const CHAT_ADMIN_DESC = {
  turns: 'Show the turn trail',
  outputs: 'Hide result panels',
  connect: 'Link product data feeds',
  'mcp-toggle': 'Talk to an MCP server',
  'toggle-cards': 'Welcome scorecard shortcuts',
  'toggle-intent-chips': 'Suggested next-step chips',
  compact: 'Tighten chat padding',
  brandtext: 'Blue assistant replies',
  sheen: 'Glow around the input',
  'bg-anim': 'DNA behind welcome',
  'activity-strip': 'Live strip on chat',
};
function adminDescKey(el) {
  if (!el || !el.classList) return '';
  const sc = el.getAttribute('data-sc');
  if (sc && CHAT_ADMIN_DESC[sc]) return sc;
  if (el.id === 'wiseai-cards-item') return 'toggle-cards';
  if (el.id === 'wiseai-chips-item') return 'toggle-intent-chips';
  if (el.classList.contains('sc-compact-item')) return 'compact';
  if (el.classList.contains('sc-brandtext-item')) return 'brandtext';
  if (el.classList.contains('sc-sheen-item')) return 'sheen';
  if (el.classList.contains('sc-bganim-item')) return 'bg-anim';
  if (el.classList.contains('sc-actstrip-item') || el.id && el.id.indexOf('actstrip') !== -1) return 'activity-strip';
  return '';
}
function decorateAdminToggleDesc(el) {
  if (!el || el.querySelector('.topbar-menu-desc')) return;
  const desc = CHAT_ADMIN_DESC[adminDescKey(el)];
  if (!desc) return;
  const kids = Array.from(el.children);
  const label = kids.find((n) =>
    n.tagName === 'SPAN'
    && !n.classList.contains('topbar-menu-icon')
    && !n.classList.contains('material-symbols-outlined')
    && !n.classList.contains('topbar-menu-badge')
    && !n.classList.contains('sc-switch')
    && !n.classList.contains('topbar-menu-switch')
    && !n.classList.contains('topbar-menu-copy')
  );
  if (!label) return;
  const wrap = document.createElement('span');
  wrap.className = 'topbar-menu-copy';
  const title = document.createElement('span');
  title.className = 'topbar-menu-title';
  let text = (label.textContent || '').trim();
  if (adminDescKey(el) === 'bg-anim' && /background animation/i.test(text)) text = 'Animation';
  title.textContent = text;
  const d = document.createElement('span');
  d.className = 'topbar-menu-desc';
  d.textContent = desc;
  wrap.appendChild(title);
  wrap.appendChild(d);
  el.replaceChild(wrap, label);
}
function decorateChatMenuAdminDescs(pop) {
  if (!pop) return;
  pop.querySelectorAll('.topbar-menu-item--admin').forEach(decorateAdminToggleDesc);
}

/* Tiny 2–4 word hint under every Helix slider / segment. Idempotent. */
const HELIX_HINTS = [
  ['.sc-bganim-detail:has(.sc-bganim-opacity)', 'How faint it sits'],
  ['.sc-bganim-wash', 'Behind the composer'],
  ['.sc-bganim-angle', 'Tilt of the coil'],
  ['.sc-bganim-camera', 'Above or below'],
  ['.sc-bganim-azimuth', 'Around the coil'],
  ['.sc-bganim-shift', 'Drag left or right'],
  ['.sc-bganim-scale-all', 'All axes at once'],
  ['.sc-bganim-scale-x', 'Stretch left–right'],
  ['.sc-bganim-scale-y', 'Stretch up–down'],
  ['.sc-bganim-scale-z', 'Coil toward you'],
  ['.sc-bganim-knob-nodes', 'Photo size'],
  ['.sc-bganim-knob-dots', 'Bead size'],
  ['.sc-bganim-dots-color', 'Bead colour'],
  ['.sc-bganim-dots-motion', 'How beads move'],
  ['.sc-bganim-motion-pulse-speed', 'Breath speed'],
  ['.sc-bganim-motion-pulse-length', 'Breath width'],
  ['.sc-bganim-motion-pulse-size', 'How they swell'],
  ['.sc-bganim-motion-spark-speed', 'Glint speed'],
  ['.sc-bganim-motion-spark-length', 'Glint width'],
  ['.sc-bganim-motion-spark-size', 'Glint swell'],
  ['.sc-bganim-knob-pitch', 'Coil tightness'],
  ['.sc-bganim-knob-length', 'How far it runs'],
  ['.sc-bganim-knob-rungs', 'All on, or off'],
  ['.sc-bganim-knob-rungthick', 'Cross-line thickness'],
  ['.sc-bganim-knob-thickness', 'Strand fatness'],
  ['.sc-bganim-knob-depth', '3-D pop'],
  ['.sc-bganim-spin', 'Twist direction'],
  ['.sc-bganim-knob-speed', 'Twist speed'],
  ['.sc-bganim-look', 'Classic or 3D'],
  ['.sc-bganim-snapshots', 'Saved poses'],
  ['.sc-bganim-mat-rough', 'Matte vs mirror'],
  ['.sc-bganim-mat-metal', 'Metallic sheen'],
  ['.sc-bganim-mat-coat', 'Glossy lacquer'],
  ['.sc-bganim-mat-sheen', 'Edge glow'],
  ['.sc-bganim-mat-fuzz', 'Downy bump'],
  ['.sc-bganim-style', 'Helix, Ten, or Orbit'],
  ['.sc-bganim-playback', 'Pause or play'],
];
function decorateMenuRowIcons(pop) {
  if (!pop) return;
  const pairs = [
    ['.sc-actside-detail > .sc-stream-detail-label', 'align_horizontal_left'],
    ['.sc-stream-detail:not(.sc-actside-detail) > .sc-stream-detail-label', 'view_list'],
    ['.sc-bganim-look', 'view_in_ar'],
    ['.sc-bganim-snapshots', 'photo_library'],
    ['.sc-bganim-style', 'schema'],
    ['.sc-bganim-dots-motion', 'motion_photos_on'],
    ['.sc-bganim-spin', 'rotate_right'],
    ['.sc-bganim-playback', 'play_circle'],
  ];
  pairs.forEach(([sel, icon]) => {
    pop.querySelectorAll(sel).forEach((el) => {
      if (!el || el.querySelector('.sc-bganim-row-icon')) return;
      const glyph = '<span class="material-symbols-outlined topbar-menu-icon sc-bganim-row-icon" aria-hidden="true">' + icon + '</span>';
      el.insertAdjacentHTML('afterbegin', glyph);
    });
  });
}

function decorateHelixHints(root) {
  if (!root) return;
  HELIX_HINTS.forEach(([sel, hint]) => {
    root.querySelectorAll(sel).forEach((el) => {
      if (!el || el.querySelector('.sc-bganim-hint')) return;
      const d = document.createElement('span');
      d.className = 'sc-bganim-hint';
      d.textContent = hint;
      const label = el.querySelector('.sc-bganim-detail-label, .sc-bganim-style-label, .sc-bganim-playback-label');
      if (label && !label.closest('.sc-bganim-copy')) {
        const wrap = document.createElement('span');
        wrap.className = 'sc-bganim-copy';
        label.replaceWith(wrap);
        wrap.appendChild(label);
        wrap.appendChild(d);
      } else {
        el.appendChild(d);
      }
    });
  });
}

/* Wrap Helix sub-controls into titled inner cards (Load / Look / Finish /
   View / Size / Beads / Strand / Field) so the column reads as clusters
   instead of one long slider dump. Subheads already exist; this just groups
   everything after a subhead until the next one. Idempotent. */
function helixClusterIsSpan(label) {
  return label === 'load' || label === 'snapshots' || label === 'look'
    || label === 'finish' || label === 'field' || label === 'view';
}

function tagHelixClusterSpan(section) {
  if (!section) return;
  section.querySelectorAll('.sc-bganim-cluster').forEach((c) => {
    const head = c.querySelector(':scope > .sc-bganim-subhead');
    const label = (head && head.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    c.classList.toggle('sc-bganim-cluster--span', helixClusterIsSpan(label));
  });
}

function clusterifyHelixGroup(section) {
  if (!section) return;
  /* Rename leftover titles from older builds so clusters stay consistent. */
  section.querySelectorAll('.sc-bganim-subhead').forEach((el) => {
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (t === 'snapshots') el.textContent = 'Load';
    if (t === 'look') {
      /* The old "Look" above Style/Helix-Ten-Orbit becomes Field; Classic/3D
         already owns Look via bgAnimLookChromeHtml. */
      const next = el.nextElementSibling;
      if (next && next.classList && next.classList.contains('sc-bganim-style')) {
        el.textContent = 'Field';
      }
    }
  });
  section.querySelectorAll('.sc-bganim-snapshots > .sc-bganim-style-label').forEach((el) => el.remove());
  section.querySelectorAll('.sc-bganim-look > .sc-bganim-style-label').forEach((el) => el.remove());
  if (section.dataset.helixClustered === '1') {
    const loose = Array.from(section.children).some((el) => el && el.classList && el.classList.contains('sc-bganim-subhead'));
    if (!loose) { tagHelixClusterSpan(section); return; }
    section.dataset.helixClustered = '';
  }
  const kids = Array.from(section.children);
  let cluster = null;
  kids.forEach((el) => {
    if (!el || !el.classList) return;
    if (el.classList.contains('sc-menu-group-head') || el.classList.contains('wise-popover-header') || el.classList.contains('topbar-menu-item') || el.classList.contains('wise-popover-item')) {
      cluster = null;
      return;
    }
    if (el.classList.contains('sc-bganim-cluster')) { cluster = el; return; }
    if (el.classList.contains('sc-bganim-subhead')) {
      cluster = document.createElement('div');
      cluster.className = 'sc-bganim-cluster';
      const label = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (helixClusterIsSpan(label)) cluster.classList.add('sc-bganim-cluster--span');
      if (el.dataset.helixOnly === '1') cluster.dataset.helixOnly = '1';
      el.before(cluster);
      cluster.appendChild(el);
      return;
    }
    if (!cluster) {
      cluster = document.createElement('div');
      cluster.className = 'sc-bganim-cluster';
      el.before(cluster);
    }
    cluster.appendChild(el);
  });
  section.dataset.helixClustered = '1';
  tagHelixClusterSpan(section);
}

function helixFloatForPop(pop) {
  if (typeof document === 'undefined') return null;
  if (pop && pop.classList && pop.classList.contains('sc-helix-float')) return pop;
  const id = pop && pop.id;
  if (id) {
    try {
      const esc = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(id) : String(id).replace(/"/g, '');
      const named = document.querySelector('.sc-helix-float[data-helix-float-for="' + esc + '"]');
      if (named) return named;
    } catch (_) {}
  }
  return document.querySelector('.sc-helix-float');
}

function liveBgAnimRoot(root) {
  return helixFloatForPop(root) || root;
}

function queryChatMenu(pop, sel) {
  if (!pop) return null;
  const float = helixFloatForPop(pop);
  return pop.querySelector(sel) || (float && float.querySelector(sel));
}

function queryChatMenuAll(pop, sel) {
  const nodes = [];
  const seen = new Set();
  const add = (list) => {
    if (!list) return;
    list.forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      nodes.push(el);
    });
  };
  if (pop) add(pop.querySelectorAll(sel));
  const float = helixFloatForPop(pop);
  if (float) add(float.querySelectorAll(sel));
  return nodes;
}

function clampHelixFloat(shell, left, top) {
  if (!shell) return;
  const pad = 8;
  const w = shell.offsetWidth || 0;
  const h = shell.offsetHeight || 0;
  const maxL = Math.max(pad, window.innerWidth - w - pad);
  const maxT = Math.max(pad, window.innerHeight - h - pad);
  shell.style.left = Math.round(Math.max(pad, Math.min(left, maxL))) + 'px';
  shell.style.top = Math.round(Math.max(pad, Math.min(top, maxT))) + 'px';
}

function dockHelixColumn(shell) {
  if (!shell || !shell.classList.contains('sc-helix-float')) return;
  const col = shell.__helixCol || shell.querySelector('.sc-menu-col--helix') || shell.firstElementChild;
  const marker = col && col.__helixMarker;
  const pop = (col && col.__helixHostPop) || null;
  if (col) {
    if (marker && marker.parentNode) {
      marker.parentNode.insertBefore(col, marker);
      marker.parentNode.removeChild(marker);
    } else if (pop && pop.isConnected) {
      pop.appendChild(col);
    }
    delete col.__helixMarker;
    delete col.__helixHostPop;
  }
  if (shell.parentNode) shell.parentNode.removeChild(shell);
  if (pop) applyChatMenuAdminGate(pop);
}

function popOutHelixColumn(group, pop) {
  if (!group) return;
  const col = group.closest('.sc-menu-col--helix') || group;
  if (col.closest('.sc-helix-float')) return;
  const host = pop || col.closest('.topbar-popover') || col.closest('.sc-menu-grouped');
  const rect = col.getBoundingClientRect();
  const marker = document.createComment('wise-helix');
  if (col.parentNode) col.parentNode.insertBefore(marker, col);
  const shell = document.createElement('div');
  shell.className = 'sc-helix-float sc-menu-grouped';
  shell.setAttribute('role', 'dialog');
  shell.setAttribute('aria-label', 'Helix');
  if (host && host.id) shell.setAttribute('data-helix-float-for', host.id);
  shell.__helixCol = col;
  col.__helixMarker = marker;
  col.__helixHostPop = host;
  shell.appendChild(col);
  document.body.appendChild(shell);
  clampHelixFloat(shell, rect.left, rect.top);
  wireHelixFloatDrag(shell);
  if (host) applyChatMenuAdminGate(host);
  if (helixStudioDraft) {
    shell.setAttribute('data-admin-demo', 'on');
    shell.setAttribute('data-helix-studio', '1');
    applyChatMenuAdminGate(shell);
    mountHelixStudioBar(shell);
  }
}

function wireHelixFloatDrag(shell) {
  if (!shell || shell.__helixDragWired) return;
  shell.__helixDragWired = true;
  shell.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button !== 0) return;
    const head = e.target.closest && e.target.closest('.sc-menu-group--helix > .sc-menu-group-head');
    if (!head || !shell.contains(head)) return;
    if (e.target.closest('button, input, a, [role="slider"]')) return;
    e.preventDefault();
    const r = shell.getBoundingClientRect();
    const dx = e.clientX - r.left;
    const dy = e.clientY - r.top;
    shell.classList.add('is-dragging');
    const onMove = (ev) => { clampHelixFloat(shell, ev.clientX - dx, ev.clientY - dy); };
    const onUp = () => {
      shell.classList.remove('is-dragging');
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerup', onUp, true);
      document.removeEventListener('pointercancel', onUp, true);
    };
    document.addEventListener('pointermove', onMove, true);
    document.addEventListener('pointerup', onUp, true);
    document.addEventListener('pointercancel', onUp, true);
  });
}

function decorateHelixHead(group, pop) {
  if (!group) return;
  const head = group.querySelector(':scope > .sc-menu-group-head');
  if (!head) return;
  if (!head.querySelector('.sc-helix-head-actions')) {
    const label = document.createElement('span');
    label.className = 'sc-helix-head-label';
    label.textContent = (head.textContent || 'Helix').replace(/\s+/g, ' ').trim() || 'Helix';
    head.textContent = '';
    const actions = document.createElement('span');
    actions.className = 'sc-helix-head-actions';
    actions.innerHTML =
      '<button type="button" class="sc-helix-pop-btn sc-helix-popout" title="Pop out Helix" aria-label="Pop out Helix">' +
        '<span class="material-symbols-outlined" aria-hidden="true">open_in_new</span>' +
      '</button>' +
      '<button type="button" class="sc-helix-pop-btn sc-helix-dock" aria-label="Return Helix to menu">' +
        '<span class="material-symbols-outlined" aria-hidden="true">close</span>' +
      '</button>';
    const pill = document.createElement('span');
    pill.className = 'sc-helix-grabber-pill';
    pill.setAttribute('aria-hidden', 'true');
    const grip = document.createElement('span');
    grip.className = 'sc-helix-drag';
    grip.setAttribute('aria-hidden', 'true');
    grip.innerHTML = '<span class="material-symbols-outlined">drag_indicator</span>';
    head.appendChild(pill);
    head.appendChild(grip);
    head.appendChild(label);
    head.appendChild(actions);
  }
  if (!head.querySelector('.sc-helix-drag')) {
    const grip = document.createElement('span');
    grip.className = 'sc-helix-drag';
    grip.setAttribute('aria-hidden', 'true');
    grip.innerHTML = '<span class="material-symbols-outlined">drag_indicator</span>';
    head.insertBefore(grip, head.firstChild);
  }
  if (!head.querySelector('.sc-helix-grabber-pill')) {
    const pill = document.createElement('span');
    pill.className = 'sc-helix-grabber-pill';
    pill.setAttribute('aria-hidden', 'true');
    head.insertBefore(pill, head.firstChild);
  }
  if (!head.getAttribute('aria-label')) head.setAttribute('aria-label', 'Helix, drag to move');
  const popBtn = head.querySelector('.sc-helix-popout');
  const dockBtn = head.querySelector('.sc-helix-dock');
  if (popBtn && !popBtn.__helixWired) {
    popBtn.__helixWired = true;
    popBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      popOutHelixColumn(group, pop);
    });
  }
  const studioLocked = !!helixStudioDraft
    || !!(document.body && document.body.hasAttribute('data-helix-studio'));
  if (dockBtn) {
    dockBtn.hidden = studioLocked;
    if (studioLocked) dockBtn.setAttribute('aria-hidden', 'true');
  }
  if (dockBtn && !dockBtn.__helixWired && !studioLocked) {
    dockBtn.__helixWired = true;
    dockBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const shell = group.closest('.sc-helix-float');
      if (shell) dockHelixColumn(shell);
    });
  }
  if (helixStudioDraft) mountHelixStudioBar(group);
}

function finishChatMenuLayout(pop) {
  ensureBgAnimSnapshotsChrome(pop);
  decorateChatMenuAdminDescs(pop);
  decorateHelixHints(pop);
  decorateHelixHints(helixFloatForPop(pop));
  decorateMenuRowIcons(pop);
  decorateMenuRowIcons(helixFloatForPop(pop));
  clusterifyHelixGroup(queryChatMenu(pop, '.sc-menu-group--helix'));
  mountChatMenuAdminPopover(pop);
  const group = queryChatMenu(pop, '.sc-menu-group--helix');
  if (group) decorateHelixHead(group, pop);
  wireBgAnimSnapshotsChrome(queryChatMenu(pop, '.sc-menu-group--helix') || pop);
  wireBgAnimSnapshotsChrome(helixFloatForPop(pop));
  syncBgAnimSnapshots(pop);
  syncBgAnimSnapshots(helixFloatForPop(pop));
}

export function groupifyChatMenu(pop) {
  if (!pop) return;
  if (pop.dataset.scGrouped === '1') {
    finishChatMenuLayout(pop);
    return;
  }
  const kids = Array.from(pop.children);
  /* Only group a real flat menu (skip if it's empty or already sectioned). */
  if (!kids.some((el) => el.classList && el.classList.contains('topbar-menu-item'))) return;

  const buckets = {};
  const push = (key, node) => { (buckets[key] || (buckets[key] = [])).push(node); };
  let current = 'conversation';
  kids.forEach((el) => {
    if (!el.classList) return;
    if (el.classList.contains('topbar-menu-divider')) return; // cards replace dividers
    if (el.classList.contains('sc-menu-admin-wrap') || el.classList.contains('sc-admin-pop')) return;
    if (el.classList.contains('sc-menu-col') || el.classList.contains('sc-menu-group')) return;
    if (el.classList.contains('topbar-menu-label') || el.hasAttribute('data-menulink')) {
      current = 'navigate'; push('navigate', el); return;
    }
    if (el.classList.contains('topbar-menu-item')) {
      const key = chatMenuGroupKey(el);
      if (key) { current = key; push(key, el); } else { push(current, el); }
      return;
    }
    push(current, el); // sub-control block → the group of the toggle above it
  });

  const frag = document.createDocumentFragment();
  const col1 = document.createElement('div');
  col1.className = 'sc-menu-col';
  const col2 = document.createElement('div');
  col2.className = 'sc-menu-col sc-menu-col--helix';
  const cols = { 1: col1, 2: col2 };
  CHAT_MENU_GROUP_ORDER.forEach((key) => {
    const nodes = buckets[key];
    if (!nodes || !nodes.length) return;
    const section = document.createElement('section');
    section.className = 'sc-menu-group sc-menu-group--' + key;
    const title = CHAT_MENU_GROUP_TITLE[key];
    if (title) {
      const head = document.createElement('div');
      head.className = 'sc-menu-group-head';
      head.textContent = title;
      section.appendChild(head);
    }
    nodes.forEach((n) => section.appendChild(n));
    const colN = CHAT_MENU_COL[key] || 1;
    (cols[colN] || col1).appendChild(section);
  });
  if (col1.childNodes.length) frag.appendChild(col1);
  if (col2.childNodes.length) frag.appendChild(col2);
  pop.appendChild(frag);
  pop.classList.add('sc-menu-grouped');
  pop.dataset.scGrouped = '1';
  finishChatMenuLayout(pop);
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
  return 'On it — ask about any food, ingredient, label, or diet question here, or tap a chip to run a demo.';
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
  if (/(dashboard|chart|graph|trend|score|analy|metric|\bdata\b|insight|report|breakdown|rank)/.test(q)) return ['Building your dashboard', 'Crunching the numbers'];
  if (/(compar|versus|\bvs\b|benchmark|side by side)/.test(q)) return ['Assembling the comparison', 'Lining up the numbers'];
  if (/(reformulat|recipe|ingredient swap|optimi|substitut)/.test(q)) return ['Modeling the reformulation'];
  if (/(verif|shield|attest|non-upf|ultra-?processed|\bupf\b|clean label|badge)/.test(q)) return ['Preparing the verification flow'];
  if (/(food|registry|upc|product|search|look ?up|find|nutrient|\bbest\b|\bworst\b)/.test(q)) return ['Searching the WISE Foods registry', 'Matching UPCs'];
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
  /* Milestone POOLS. Each category is an ordered list of PHASES; a phase carries
     several interchangeable landmark `keys` (so the top-level label varies turn
     to turn) and a deep pool of dense, haiku-terse `story` lines. Some phases are
     `opt` (included with probability `p`) so the NUMBER of milestones varies too.
     Per turn we materialize ONE sequence — a random key + a random dense subset of
     lines per phase — so no two turns read the same, while the phase progression
     (read \u2192 gather \u2192 reason \u2192 compose) stays coherent and the key and its glob
     stay in sync. */
  const P = {
    generic: [
      { keys: ['Reading', 'Parsing intent', 'Listening', 'Framing the ask'], min: 3, max: 4, story: [
        'Your words twice \u2014 once for sense, once for the want beneath.',
        'The thread pulled back through the chat; nothing left adrift.',
        'Three pegs named \u2014 brand, product, claim \u2014 and hung.',
        'The certain set apart from the almost, the almost from the no.',
        'The questions behind your question, lined up in order.',
        'A first step chosen that won\u2019t undo the last.',
        'Scope drawn tight; the rest, politely, aside.',
        'The tone of the ask read, not just its nouns.',
      ] },
      { keys: ['Gathering', 'Sourcing', 'Foraging', 'Pulling threads'], min: 3, max: 4, story: [
        'The WISE Foods registry walked, row by patient row.',
        'Past it into synced catalogs \u2014 retailer, USDA, whatever\u2019s fresh.',
        'Barcodes that agree, kept; the quarrelers, flagged.',
        'Each source weighed by how lately it was touched.',
        'Stale data lies without meaning to; it\u2019s let go.',
        'Only the records that earn a seat remain.',
        'Duplicates folded down to the one that\u2019s true.',
      ] },
      { keys: ['Cross-checking', 'Second-guessing', 'Stress-testing'], opt: true, p: 0.5, min: 2, max: 3, story: [
        'The tidy answer poked at, to see if it holds.',
        'What I assumed, held up against what the data says.',
        'The one number that would embarrass me later, found early.',
        'Edge cases invited in before you have to meet them.',
      ] },
      { keys: ['Composing', 'Distilling', 'Writing it plain', 'Shaping'], min: 3, max: 4, story: [
        'Facts folded into something a person can read.',
        'The number that matters, first; the caveats, tucked.',
        'Every sentence that only postured \u2014 cut.',
        'Read back once in your voice, to be sure it\u2019s useful.',
        'Short where short is honest; longer only where it earns it.',
      ] },
    ],
    analytics: [
      { keys: ['Reading data', 'Taking stock', 'Opening tables', 'Reading rows'], min: 3, max: 5, story: [
        'Tables opened; the columns introduce themselves.',
        'Only the rows that back the question, pulled.',
        'Connected sources checked for anything newer.',
        'Gaps marked \u2014 the unscored, the politely blank.',
        'Outliers squinted at: real finding or fat-fingered typo.',
        'Timestamps read; fresh trusted over familiar.',
        'The shape of the data felt before it\u2019s named.',
      ] },
      { keys: ['Crunching', 'Scoring', 'Running the math', 'Weighing'], min: 3, max: 4, story: [
        'WISEscore across every match, one ingredient list at a time.',
        'Numbers rolled into the cuts you asked \u2014 and one you didn\u2019t.',
        'Each average held to the light for a hidden story.',
        'Math checked twice; a confident wrong number is worse than none.',
        'Medians set beside means, to catch the lie an average tells.',
        'Weights sanity-checked so nothing loud drowns something true.',
      ] },
      { keys: ['Sifting', 'Sorting signal', 'Ranking'], opt: true, p: 0.55, min: 2, max: 3, story: [
        'Signal kept; the pretty noise set gently down.',
        'The movers pulled to the front, the flat left flat.',
        'Ties broken by what a person would actually care about.',
      ] },
      { keys: ['Building view', 'Laying it out', 'Shaping the view', 'Composing'], min: 3, max: 4, story: [
        'Read the way an eye reads: headline first, breakdowns beneath.',
        'The chart that tells truth fastest, kept; the d\u00e9cor, cut.',
        'Everything labeled twice, so no caption is needed.',
        'Color spent only where it means something.',
        'The axis honest, even when a lie would flatter.',
      ] },
    ],
    compare: [
      { keys: ['Gathering', 'Lining up', 'Assembling the field'], min: 3, max: 4, story: [
        'Each contender stood shoulder to shoulder.',
        'Same fields, both sides \u2014 apples to apples, never to marketing.',
        'Blanks filled from the registry where one side forgot.',
        'Only the versions actually on shelf today.',
        'The unit made common, so the numbers can even speak.',
      ] },
      { keys: ['Scoring', 'Weighing', 'Re-scoring'], min: 2, max: 4, story: [
        'WISEscore re-run so it\u2019s today\u2019s, not last quarter\u2019s.',
        'Shopper-differences split from lab-differences.',
        'Twins that match until the eighth ingredient, noted.',
        'The gap measured where a buyer would feel it.',
      ] },
      { keys: ['Framing it', 'Setting the table', 'Drawing the line'], min: 2, max: 3, story: [
        'Real gaps stepped forward; the noise stepped back.',
        'What earns bold, decided; the rest, to footnotes.',
        'The verdict placed where the eye lands first.',
      ] },
    ],
    reformulation: [
      { keys: ['Reading recipe', 'Unpicking the formula', 'Reading the seam'], min: 3, max: 4, story: [
        'The formula unpicked, ingredient by ingredient.',
        'Each one\u2019s reason named \u2014 texture, shelf life, cost, or habit.',
        'The two or three that keep it from clearing Non-UPF, marked.',
        'The ingredient that\u2019s there only because it always has been, heard.',
        'Function separated from tradition, gently.',
      ] },
      { keys: ['Modeling swaps', 'Trying substitutions', 'Turning the dials'], min: 3, max: 4, story: [
        'Swaps tried one at a time; what moves, watched.',
        'Cost and WISEscore watched together \u2014 fix one, bruise the other.',
        'Helpful swaps stay; the clever-but-empty ones, released.',
        'Mouthfeel math re-checked, so \u201ccleaner\u201d never means \u201cworse.\u201d',
        'Every change asked: would the eater ever notice, and mind?',
      ] },
      { keys: ['Composing', 'Writing the plan', 'Ordering the moves'], min: 2, max: 3, story: [
        'Only the changes worth making, in the order I\u2019d make them.',
        'What each swap buys, and what it asks in return \u2014 said plainly.',
        'The risky move flagged, not buried.',
      ] },
    ],
    verify: [
      { keys: ['Checking rules', 'Reading the standard', 'Reading criteria'], min: 3, max: 4, story: [
        'The claim\u2019s criteria read, word for careful word.',
        'What the badge promises, remembered \u2014 no more than that.',
        'Pass/fail lines split from the ones that ask for judgment.',
        'The version of the standard current today, not last year\u2019s.',
      ] },
      { keys: ['Screening', 'Running the screen', 'Sifting UPCs'], min: 3, max: 4, story: [
        'Each eligible UPC through the ingredient screen, line by line.',
        'Additives that draw a glance, flagged; those that draw a stop, halted.',
        'Clean from maybe from not-today, sorted.',
        'Borderline cases checked against source, not summary.',
        'The quiet disqualifier caught before it costs you.',
      ] },
      { keys: ['Composing', 'Laying the path', 'Writing the next move'], min: 2, max: 3, story: [
        'Confirm \u2192 Attest \u2192 Activate \u2014 three small steps, not one large.',
        'The next move written obvious, not merely available.',
        'What\u2019s ready named apart from what still needs you.',
      ] },
    ],
    search: [
      { keys: ['Searching', 'Querying', 'Casting the net'], min: 3, max: 4, story: [
        'The registry queried for anything answering to this name.',
        'The net widened to retailer catalogs when the first pass runs thin.',
        'Read past the brand copy to the label beneath.',
        'Near-misses that share a name but nothing else, set aside.',
        'Spelling forgiven, so a typo doesn\u2019t hide the answer.',
      ] },
      { keys: ['Matching UPCs', 'Reconciling barcodes', 'Pinning codes'], min: 2, max: 4, story: [
        'Barcodes reconciled; the ones that agree, trusted.',
        'Nutrition metadata pulled, checked against the shelf.',
        'Private-label twins untangled from shared numbers.',
        'The current pack kept; the discontinued, dropped.',
      ] },
      { keys: ['Composing', 'Ranking', 'Ordering the finds'], min: 2, max: 3, story: [
        'Best matches gathered, the closest laid on top.',
        'Each one\u2019s reason for making the cut, noted.',
        'The confident matches parted from the merely plausible.',
      ] },
    ],
    portfolio: [
      { keys: ['Opening', 'Waking the portfolio', 'Taking stock'], min: 2, max: 3, story: [
        'The portfolio loaded, asked when it last spoke to its sources.',
        'The sync state let to settle before a number is trusted.',
        'The shape of the shelf taken in at a glance.',
      ] },
      { keys: ['Reading', 'Scanning', 'Reading the shelf'], min: 3, max: 4, story: [
        'Each product\u2019s score, status, and audience, read.',
        'The slipped ones noticed \u2014 expired, unscored, quietly hidden.',
        'Grouped so the ones that need you cluster near the top.',
        'What\u2019s thriving separated from what\u2019s merely present.',
      ] },
      { keys: ['Composing', 'Summing up'], min: 1, max: 2, story: [
        'What stands out, and what would thank you first \u2014 summarized.',
        'The one thing to do next, made unmissable.',
      ] },
    ],
    connect: [
      { keys: ['Reaching out', 'Knocking', 'Handshaking'], min: 2, max: 2, story: [
        'The connection opened, credentials offered politely.',
        'Waiting to be recognized before asking for anything.',
        'The door held while the other side wakes.',
      ] },
      { keys: ['Syncing', 'Reconciling', 'Pulling the catalog'], min: 3, max: 3, story: [
        'The catalog pulled, reconciled against what we hold.',
        'Fresh records over stale, the history kept.',
        'What changed, counted \u2014 to tell you plainly, not vaguely.',
        'Conflicts settled toward the source that was touched last.',
      ] },
      { keys: ['Composing', 'Reporting back'], min: 1, max: 2, story: [
        'What\u2019s newly available, and what you can ask of it, confirmed.',
        'The one broken link named, not glossed.',
      ] },
    ],
    ingest: [
      { keys: ['Prepping parser', 'Warming the parser', 'Clearing space'], min: 2, max: 3, story: [
        'The label parser warmed, reminded what a serving size hides.',
        'Order set: ingredients, NFP, claims, then the fine print.',
        'A clean place cleared for whatever you hand me.',
      ] },
      { keys: ['Composing', 'Opening the door'], min: 1, max: 2, story: [
        'The intake written so you can hand a label, a sheet, or a link.',
        'What I\u2019ll do with it, promised up front.',
      ] },
    ],
  };

  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  /* A dense, order-preserving random subset of `arr`, size min..max. */
  const sample = (arr, min, max) => {
    const lo = Math.min(min || 2, arr.length);
    const hi = Math.min(max || lo, arr.length);
    const n = lo + Math.floor(Math.random() * (hi - lo + 1));
    const idx = arr.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    return idx.slice(0, n).sort((a, b) => a - b).map((i) => arr[i]);
  };
  /* Materialize one turn's sequence: drop optional phases by their odds (never
     below two milestones), then choose a key + dense glob subset for each. */
  const build = (phases) => {
    let chosen = phases.filter((ph) => !ph.opt || Math.random() < (ph.p != null ? ph.p : 0.5));
    if (chosen.length < 2) chosen = phases.filter((ph) => !ph.opt);
    return chosen.map((ph) => ({ key: pick(ph.keys), story: sample(ph.story, ph.min, ph.max) }));
  };

  const byIntent = {
    customer_profile: 'verify',
    resume_prompt: 'generic',
    faq_intro: 'generic',
    playful: 'generic',
    owls: 'generic',
    registry_home: 'search',
    add_food_intro: 'ingest',
    edit_food_select: 'portfolio',
  };
  if (intent && byIntent[intent]) return build(P[byIntent[intent]]);
  /* Surface-namespaced intents (contextual chip sets swapped in live via
     setIntents) route by their prefix, so e.g. the Reformulation page's move
     chips narrate the recipe work and its product-picker chips narrate opening
     the portfolio — the trace always follows the chip's own UX tree. */
  if (intent && /^move:/.test(intent)) return build(P.reformulation);
  if (intent && /^pick:/.test(intent)) return build(P.portfolio);

  const q = String(text || '').toLowerCase();
  if (/(dashboard|chart|graph|trend|score|analy|metric|\bdata\b|insight|report|breakdown|rank)/.test(q)) return build(P.analytics);
  if (/(compar|versus|\bvs\b|benchmark|side by side)/.test(q)) return build(P.compare);
  if (/(reformulat|recipe|ingredient swap|optimi|substitut)/.test(q)) return build(P.reformulation);
  if (/(verif|shield|attest|non-upf|ultra-?processed|\bupf\b|clean label|badge)/.test(q)) return build(P.verify);
  if (/(food|registry|upc|product|search|look ?up|find|nutrient|\bbest\b|\bworst\b)/.test(q)) return build(P.search);
  if (/(portfolio|catalog|inventory)/.test(q)) return build(P.portfolio);
  if (/(connect|sync|integration|kroger|walmart|instacart|usda)/.test(q)) return build(P.connect);
  return build(P.generic);
}

/* The trailing "assembling" milestone, built from the answer HTML the turn is
   about to post. It runs AFTER the thinking milestones so the globs keep talking
   while the visible pieces are laid out — the charts, tables, reports, sources,
   and suggested next steps — and so none of them render until the trace is done.
   Returns null when the answer is plain prose with nothing to assemble. */
function assemblyMilestoneFor(html) {
  const h = String(html || '').toLowerCase();
  const lines = [];
  if (/canvas|<svg|chart|graph|insights|spark/.test(h)) lines.push('The chart drawn so the data\u2019s shape reads at a glance.');
  if ((/<table/.test(h) && !/sc-inline-tbl/.test(h)) || /wa-tbl/.test(h)) {
    lines.push('The table laid row by row, headers pinned to the top.');
  }
  if (/<video/.test(h)) lines.push('The film cued up, controls handed over to you.');
  if (/surface-card|report|summarize/.test(h)) lines.push('The report stitched together, section by section.');
  if (/href=|<a\b|wa-cite|wa-refs-mini|data-web-ref|data-cat-ref|data-news-open/.test(h)) {
    lines.push('Sources attached, so every number traces back to where it came from.');
  }
  if (!lines.length) return null;
  lines.push('Suggested next steps brought in last, once the rest has settled.');
  const keys = ['Assembling', 'Laying it out', 'Bringing it together', 'Setting the stage'];
  return { key: keys[Math.floor(Math.random() * keys.length)], story: lines };
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

/* ── Paragraph-by-paragraph transcript reveal ──────────────────────────────
   Word-by-word typing was too busy. A WISEcodeAI answer now lands in reading
   order: each prose paragraph / block (a <p>, a list, a card, or a run split
   by <br><br>) fades in as a unit, then the thumbs row, then the intent chips.
   Trailer chrome (.sc-line-meta, thumbs, chip rows) is never part of a para.
   Honors prefers-reduced-motion (everything shows whole). Exported so the
   hand-rolled page chats call the same helper instead of forking a typewriter. */
const TRANSCRIPT_TRAILER = [
  'sc-line-meta', 'sc-fb-wrap', 'sc-feedback', 'sc-inline-chips',
  'sc-reply-chips', 'gs-chips-inline', 'gs-chips',
];
const TRANSCRIPT_BLOCK = new Set([
  'P', 'UL', 'OL', 'DIV', 'TABLE', 'BLOCKQUOTE', 'PRE', 'FIGURE',
  'HR', 'SECTION', 'ARTICLE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'DL', 'DETAILS', 'VIDEO', 'CANVAS',
]);

function isTranscriptTrailer(node) {
  if (!node || node.nodeType !== 1 || !node.classList) return false;
  return TRANSCRIPT_TRAILER.some((name) => node.classList.contains(name));
}
function isTranscriptBlock(node) {
  return !!(node && node.nodeType === 1 && TRANSCRIPT_BLOCK.has(node.tagName));
}
/* A block is not one beat — the lines inside it are. A <ul> revealed whole
   dropped every bullet in at once; a <div> section or a <table> did the same with
   its rows. So a block is opened up and its own lines become the units: each
   bullet, each row, each paragraph of a section, landing one after another the
   way top-level paragraphs do. The box itself stays unprimed so it holds no
   height while its lines are still hidden.
   Walking stops at the first thing that reads as one line (see stagger-reveal),
   so a nested list rides in with the item that owns it and a self-animating card
   stays a single beat. */
function transcriptBlockLines(node) {
  if (!node || node.nodeType !== 1) return [];
  const lines = collectRevealUnits(node, { maxDepth: 3 });
  /* One line in is the block itself — no point splitting it. */
  return lines.length > 1 ? lines : [];
}
function runHasCopy(nodes) {
  return nodes.some((n) => {
    if (n.nodeType === 3) return /\S/.test(n.nodeValue);
    if (n.nodeType !== 1) return false;
    if (n.tagName === 'BR') return false;
    if (n.classList && n.classList.contains('sc-open-marker')) return false;
    return true;
  });
}
function wrapTranscriptRun(parent, nodes, before) {
  const list = nodes.slice();
  while (list.length && list[0].nodeType === 1 && list[0].tagName === 'BR') list.shift();
  while (list.length && list[list.length - 1].nodeType === 1 && list[list.length - 1].tagName === 'BR') list.pop();
  if (!list.length || !runHasCopy(list)) return null;
  const span = document.createElement('span');
  span.className = 'sc-para';
  list.forEach((n) => span.appendChild(n));
  parent.insertBefore(span, before || null);
  return span;
}

export function collectTranscriptParas(root) {
  if (!root) return [];
  const kids = Array.from(root.childNodes);
  const hasTrailer = kids.some(isTranscriptTrailer);
  const hasSplit = kids.some((n) =>
    isTranscriptBlock(n) || isTranscriptTrailer(n) || (n.nodeType === 1 && n.tagName === 'BR'));
  if (!hasTrailer && !hasSplit) {
    const hasViz = !!(root.querySelector && root.querySelector('img,svg,canvas,table,video'));
    return ((root.textContent || '').trim() || hasViz) ? [root] : [];
  }
  const units = [];
  let run = [];
  const flush = (before) => {
    const wrap = wrapTranscriptRun(root, run, before);
    if (wrap) units.push(wrap);
    run = [];
  };
  kids.forEach((node) => {
    if (isTranscriptTrailer(node)) { flush(node); return; }
    if (node.nodeType === 1 && node.tagName === 'BR') {
      const prev = run[run.length - 1];
      if (prev && prev.nodeType === 1 && prev.tagName === 'BR') {
        run.pop();
        if (prev.parentNode) prev.remove();
        flush(node);
        if (node.parentNode) node.remove();
        return;
      }
      run.push(node);
      return;
    }
    if (isTranscriptBlock(node)) {
      flush(node);
      const lines = transcriptBlockLines(node);
      if (lines.length) {
        lines.forEach((line) => {
          line.dataset.scStreamUnit = line.tagName === 'LI' || line.tagName === 'TR' ? 'row' : 'line';
          units.push(line);
        });
      } else {
        units.push(node);
      }
      return;
    }
    if (node.nodeType === 3 && !/\S/.test(node.nodeValue) && !run.length) return;
    run.push(node);
  });
  flush(null);
  return units.filter((el) => {
    if ((el.textContent || '').trim()) return true;
    return !!(el.querySelector && el.querySelector('img,svg,canvas,table,video'));
  });
}

export function primeTranscriptPara(el) {
  if (!el) return;
  el.hidden = true;
  el.style.opacity = '0';
  el.style.transform = 'translateY(8px)';
}
export function showTranscriptPara(el) {
  if (!el) return;
  el.hidden = false;
  void el.offsetWidth;
  el.style.transition = 'opacity .32s ease, transform .32s cubic-bezier(0.22, 0.85, 0.25, 1)';
  el.style.opacity = '1';
  el.style.transform = 'none';
}

export function typeInTranscript(bodyEl, done, hooks) {
  const scroll = (hooks && hooks.scroll) || function () {};
  const reduced = hooks && Object.prototype.hasOwnProperty.call(hooks, 'reduced')
    ? hooks.reduced
    : (() => {
      try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
      catch (_) { return false; }
    })();
  if (!bodyEl || reduced) { scroll(); if (done) done(); return; }
  const units = collectTranscriptParas(bodyEl);
  if (!units.length) { scroll(); if (done) done(); return; }
  units.forEach(primeTranscriptPara);
  let i = 0;
  const gap = (hooks && hooks.gap) || 300;
  const start = (hooks && hooks.startDelay) != null ? hooks.startDelay : 40;
  /* A bullet is one line, so it lands on a tighter beat than a full paragraph —
     a run of them reads as a list filling in rather than a stall between
     sentences. */
  const beat = (el) => (el && el.dataset && el.dataset.scStreamUnit === 'row'
    ? Math.max(110, Math.round(gap * 0.55))
    : gap);
  const next = () => {
    if (i >= units.length) { scroll(); if (done) done(); return; }
    const shown = units[i];
    showTranscriptPara(shown);
    i += 1;
    scroll();
    /* Hold the last paragraph until its fade has settled so the thumbs row
       reads as the next beat, not an overlap. */
    setTimeout(next, i >= units.length ? 340 : beat(shown));
  };
  setTimeout(next, start);
}
if (typeof window !== 'undefined') window.WiseTypeInTranscript = typeInTranscript;

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
 *   intents      {Array}   welcome intent chips [{intent,label,icon,ask?,nextIntents?,carryTopic?,keepWelcome?}]
 *                          — `ask` (optional) is the full question posted as
 *                          the user's line; the chip face still shows the
 *                          shorter label. `nextIntents` (ids or chip objects)
 *                          is the topic-related row that trails that chip's
 *                          answer so a transcript never dead-ends.
 *                          `carryTopic` keeps the previous turn's topic so a
 *                          generic follow-up (compare / report / spider) stays
 *                          about what was just discussed.
 *                          `keepWelcome` runs the host side-effect (onIntent)
 *                          and leaves the welcome / background helix up —
 *                          no user line, no reply, chip stays reusable.
 *   followups    {object}  intent-id → [ids|chips] map used when a chip has
 *                          no `nextIntents` of its own
 *   intentReplies{object}  intent-id → reply (string|fn) so a clicked chip
 *                          always continues with an on-feature answer.
 *                          Functions receive (text, intent, ctx) where ctx is
 *                          { prev:{intent,topic,userText,html}, topic }.
 *   topicOf      {fn}      (intent, prevCtx) => topic id — groups related
 *                          chips (kraft_heinz → kraft) so follow-ups stay
 *                          on the same subject
 *   contextualizeChip {fn} (chip, thread) => {label?,ask?} — rewrite a
 *                          follow-up chip so its face/ask match the last turn
 *   carryTopic   {fn}      (intent, chip) => bool — extra carryTopic test
 *                          when the chip itself isn't flagged
 *   placeholder  {string}  input placeholder
 *   flLabel      {string}  floating label text
 *   disclaimer   {string}  standing AI-limitations note under the input ('' hides)
 *   sourceLabel  {string}  grounding caption appended to each WISEcodeAI reply ('' hides)
 *   statusLabel  {string}  what WISEcodeAI is "doing" while the typing dots show
 *   onIntent     {fn}      (intent,label) => boolean — return true to suppress default reply
 *   onReply      {fn}      (intent, text, ctx) — fires when the answer lands
 *                          (after the thinking trace, as the reply starts);
 *                          ctx.topic is this turn's subject (previous topic
 *                          when the chip carried it forward)
 *   onReplyDone  {fn}      (intent) — fires once that reply has finished
 *                          typing (paragraphs, thumbs, trailing chips). Hosts
 *                          that hold a companion pane closed until the
 *                          transcript settles open it here.
 *   ollama       {false}   pass false to skip the local-model rewrite on this
 *                          mount (Clearer reading stays available on others)
 *   onAddMember  {fn}      () => void — "Add team member to chat" popover item
 *   onHistory    {fn}      () => void — "History & Projects" popover item
 *   onToggleWidth{fn}      (isWide) => void — fired when the width toggle flips
 *   onEngage     {fn}      () => void — first leave of the welcome (type, chip,
 *                          or send). Hosts like wiseai.html collapse the
 *                          full-width chat to its single column.
 *   onDisengage  {fn}      () => void — composer cleared while welcome is still
 *                          showing (typed, then deleted). Hosts can expand back.
 *   onReset      {fn}      () => void — "Start new conversation" / reset()
 *   reply        {fn}      (text, intent, ctx) => html string for WISEcodeAI's response
 * @returns {{ addUser, addWISEcodeAI, reset, root }}
 */
export function mountWISEcodeAIChat(rootEl, opts = {}) {
  if (!rootEl) return null;
  if (opts.helixStudio === true) beginHelixStudio();
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
  /* Last completed turn — follow-up chips and their replies key off this so
     "Compare" after Kraft is still about Kraft, not a random other product. */
  let thread = { intent: null, topic: null, userText: '', html: '' };
  /* Host setIntents() / applyTopicFollowups() already chose this turn's
     trailing chips — addWISEcodeAI must not score-replace them. */
  let skipAutoFollowups = false;
  const placeholder = opts.placeholder || 'Type your message';
  /* Opt-in lock glyph that sits inline with the placeholder text (only while the
     input is empty) to flag that the composer is "not accessible at this
     moment". Pass `placeholderLock: true` for the default hover copy, or a
     string to override the tooltip text. Purely a visual affordance — it does
     not disable the textarea. */
  const placeholderLock = opts.placeholderLock === true || typeof opts.placeholderLock === 'string';
  const placeholderLockTip = typeof opts.placeholderLock === 'string'
    ? opts.placeholderLock
    : 'Not accessible at this moment';
  /* Optional second line under the lock tooltip (e.g. "WISEcodeAI is coming
     soon"). Shown as a muted subtitle beneath the primary lock copy. */
  const placeholderLockSub = typeof opts.placeholderLockSub === 'string' ? opts.placeholderLockSub : '';
  /* The "You" avatar mirrors the top-bar profile chip (Arthur Krupsky → "AK").
     When the topbar avatar becomes an image, pass opts.userAvatar with an <img>. */
  const userInitials = opts.userInitials || 'AK';
  /* Resolve the "you" avatar at render time (not once at mount) so it tracks a
     picture set / cleared later on the Organization Profile page: an explicit
     opts.userAvatar (string or getter) wins, else the shared avatar store, else
     the member's initials. */
  const youChipHtml = () => youAvatarChipHtml(userInitials, opts.userAvatar);
  /* Optional per-intent reply map for this surface; an intent-id hit here means
     a clicked chip always continues with an on-feature answer. Mutable so
     setIntents() can extend it alongside a new chip set. */
  let intentReplies = opts.intentReplies && typeof opts.intentReplies === 'object' ? opts.intentReplies : null;
  const baseReply = typeof opts.reply === 'function' ? opts.reply : defaultReply;
  const reply = (text, intent) => {
    const ctx = {
      prev: threadCtx(),
      topic: resolveTopic(intent),
    };
    if (intent && intentReplies && intentReplies[intent] != null) {
      const r = intentReplies[intent];
      return typeof r === 'function' ? r(text, intent, ctx) : r;
    }
    /* The gold "What can I ask?" chip gets a built-in page-aware answer unless
       the host supplied its own via intentReplies.ask_help above. */
    if (intent === 'ask_help') return askHelpReplyHtml();
    return baseReply(text, intent, ctx);
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
     with the same label can ride along in the welcome chip set. Unlike the
     link (which opens the side panel), clicking the chip starts a real chat
     turn: a page-specific transcript of everything you can ask on THIS surface,
     built from the surface's own quick-action chips (see askHelpReplyHtml).
     Temporarily hidden — flip ASK_HELP_CHIP_ON to restore it on every mount
     and setIntents swap. The below-input gold link is unaffected. */
  const ASK_HELP_INTENT = 'ask_help';
  const ASK_HELP_CHIP_ON = false;
  const withAskHelpChip = (list) => {
    if (!askHelpOn || !ASK_HELP_CHIP_ON) return list;
    if (list.some((c) => c && c.intent === ASK_HELP_INTENT)) return list;
    return list.concat({ intent: ASK_HELP_INTENT, label: askHelpLabel, icon: 'help', ask: askHelpLabel });
  };
  intents = withAskHelpChip(intents);
  /* The chip set the welcome (and a brand-new conversation) should return to.
     History restore may swap `intents` to a follow-up subset for that thread;
     Start-new / setIntents keep this session catalog separate so a restored
     chat never permanently replaces the surface's own prompts. */
  let sessionIntents = intents.slice();
  const intentCatalog = new Map();
  function catalogize(list) {
    (list || []).forEach((c) => { if (c && c.intent) intentCatalog.set(c.intent, c); });
  }
  catalogize(intents);
  function catalogizeNext(list) {
    (list || []).forEach((c) => {
      if (c && Array.isArray(c.nextIntents)) {
        catalogize(c.nextIntents.filter((n) => n && typeof n === 'object'));
      }
    });
  }
  catalogizeNext(intents);
  if (opts.followups && typeof opts.followups === 'object') {
    Object.keys(opts.followups).forEach((k) => {
      const list = opts.followups[k];
      if (Array.isArray(list)) catalogize(list.filter((n) => n && typeof n === 'object'));
    });
  }

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
  /* Dock the broken-out Turns module as the LAST module in the row (the far
     right), rather than immediately to the right of the chat. This lets it sit
     to the right of any output modules (e.g. result / visual panes) that are
     already open, tucking in behind the last one as the next layered-down
     drawer — sized like every other module. Opt-in via `turnsBreakoutFarRight`. */
  const turnsBreakoutFarRight = opts.turnsBreakoutFarRight === true;
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

  /* Intent chips render as a wrapped flex grid (the chevron carousel is retired,
     so `opts.chipsFlow` is ignored). Welcome chips show at most TWO wrapping
     rows; overflow is behind a trailing "Show more" chip that reveals the rest
     inline after it. Inline / follow-up chips are unaffected. */

  /* Once the user taps "Show more", keep the full set visible (and the same
     chip parked as "Show less") until they collapse or the next fresh welcome
     (reset / setIntents). Resize still re-clamps while collapsed. */
  let welcomeChipsExpanded = false;
  let welcomeChipsExpanding = false;
  /* How many intent chips sit before the Show more chip. Survives a re-render
     while expanded so the control does not jump. */
  let welcomeChipsCutoff = 0;
  /* True from the first welcome prime through the fly-in cascade. Re-clamp
     during that window (font load, width tweak) used to un-hide the last
     chip before Show more at full opacity — so the boundary chip appeared
     first even though it is last in order. */
  let welcomeChipsRevealing = false;
  const WELCOME_CHIP_MAX_ROWS = 2;

  /* Intent chips never carry a tooltip — the label is already on the chip.
     No title, no data-tip, no hover card. The ask-help chip is the only one
     that needs an aria-label, because its visible text is aria-hidden shimmer. */
  const buildChipsHtml = () => intents.map((c, i) => {
    const spent = !!(c && c.intent && usedIntents.has(c.intent));
    /* The "What can I ask?" chip wears the gold border that pairs it with the
       below-input gold link of the same name. */
    const isAsk = c && c.intent === ASK_HELP_INTENT;
    const gold = isAsk ? ' ws-intent-chip--askhelp' : '';
    /* The ask-help chip's label runs the SAME per-letter gold shimmer as the
       below-input link — split into .sc-ask-ch glyph spans, with a plain
       aria-label carrying the readable text for assistive tech. */
    const labelHtml = isAsk
      ? `<span class="sc-ask-shimmer" aria-hidden="true">${shimmerLetters(c.label)}</span>`
      : esc(c.label);
    const aria = isAsk ? ` aria-label="${esc(c.label)}"` : '';
    return `<button type="button" class="chip ws-intent-chip${gold}${spent ? ' is-used' : ''}" data-intent="${i}"${aria}${spent ? ' aria-disabled="true" tabindex="-1"' : ''}><span class="material-symbols-outlined">${esc(c.icon || 'bolt')}</span>${labelHtml}</button>`;
  }).join('');
  let chipsHtml = buildChipsHtml();

  const chipsContainerHtml = `<div class="ws-chips-scroll" id="${id}-chips-scroll"><div class="ws-chips" id="${id}-chips" role="list" aria-label="Quick actions">${chipsHtml}</div></div>`;

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
     big cards are opt-in via the three-dot "Overview cards" switch. A host
     can force them open on first load by passing `cardsHiddenDefault: false`;
     a stored preference (from the toggle) always wins so the user's own choice
     sticks across reloads. */
  let cardsHidden = opts.cardsHiddenDefault !== false;
  try {
    const stored = localStorage.getItem(CHIPS_PREF_KEY);
    if (stored === '1') cardsHidden = true;
    else if (stored === '0') cardsHidden = false;
  } catch (_) {}
  /* Welcome INTENT CHIPS (the small suggested-action chips right below the
     overview cards) are ALWAYS ON by default: every load starts with them
     shown, unlike the large overview cards whose hidden state persists. The
     three-dot switch still hides them, but only for the current visit — the
     choice is deliberately NOT remembered across reloads. A host can still
     start them hidden with `chipsHiddenDefault: true`. */
  let chipsHidden = opts.chipsHiddenDefault === true;
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
  /* "Brand AI text" (three-dot ▸ Admin, pink) tracks the shared scheme APP-WIDE:
     member lines stay brand blue and WISEcodeAI stays in the default ink. Like
     Compact spacing it flips one global class on <html> (chat-brandtext) so
     every mounted chat module responds at once; the shared preference is
     persisted and re-applied on mount so a reload keeps the chosen scheme. */
  const BRANDTEXT_PREF_KEY = 'wise:chat-brandtext';
  /* OFF by default — the standard scheme keeps both speakers in the same ink.
     A stored '1' (the user turned it ON) always wins so their choice sticks. */
  let brandtextDefaultOn = false;
  try {
    if (localStorage.getItem(BRANDTEXT_PREF_KEY) === '1') brandtextDefaultOn = true;
  } catch (_) {}
  document.documentElement.classList.toggle('chat-brandtext', brandtextDefaultOn);
  /* "Input glow" (three-dot ▸ Admin, pink) — the living sheen stroke that travels
     around the composer's border. It's ON everywhere by default; turning it OFF
     flips a single global `chat-sheen-off` class on <html> that suppresses the
     ::before ring app-wide. Uses a negative class so the glow keeps showing on
     surfaces that never mount this menu (e.g. auth) until explicitly disabled.
     The choice is shared (one key, broadcast on wise:chat-sheen) and re-applied
     on mount so a reload keeps it. */
  const SHEEN_PREF_KEY = 'wise:chat-sheen';
  let sheenDefaultOn = true;
  try {
    if (localStorage.getItem(SHEEN_PREF_KEY) === '0') sheenDefaultOn = false;
  } catch (_) {}
  document.documentElement.classList.toggle('chat-sheen-off', !sheenDefaultOn);
  /* "Background animation" (three-dot ▸ Admin, pink) — an admin-only ambient
     backdrop for the WELCOME state only: a DNA/RNA double helix that chain-links a
     run of our real product photos as round thumbnails, with brand-blue backbones +
     base-pair rungs. It rides a tilted axis that drops left→right, its loops crawl
     end-to-end slowly, and the strand expands and contracts as products swap
     front/back in 3-D. It plays on the welcome screen and stays until a
     real turn starts: an intent chip (or scorecard) is tapped, or
     something is typed in the composer. hideWelcome() / the first
     keystroke stop it. Clicks on nav, other modules, helix nodes, or
     focusing the composer do not.
     ON by default; a stored '0' turns it off. The choice is shared APP-WIDE (one
     key, broadcast on wise:chat-bg-anim) so every mounted chat's switch follows. */
  const BGANIM_PREF_KEY = 'wise:chat-bg-anim';
  let bgAnimOn = true;
  try { if (bgAnimGet(BGANIM_PREF_KEY) === '0') bgAnimOn = false; } catch (_) {}
  /* Opacity of the background animation (0.1–1). Shared APP-WIDE (one key, broadcast
     on wise:chat-bg-anim-opacity), adjustable from the slider below the toggle. */
  const BGANIM_OPACITY_KEY = 'wise:chat-bg-anim-opacity';
  /* Published default matches Scene. Holds until the member drags the
     opacity slider, at which point their explicit choice takes over app-wide. */
  let bgAnimOpacity = BGANIM_PUBLISH_POSE.opacity / 100;
  let bgAnimOpacityUserSet = false;
  try { const s = parseInt(bgAnimGet(BGANIM_OPACITY_KEY), 10); if (!isNaN(s)) { bgAnimOpacity = Math.max(0.1, Math.min(1, s / 100)); bgAnimOpacityUserSet = true; } } catch (_) {}
  /* Axis tilt of the helix in degrees (−90…90). Shared APP-WIDE (one key,
     broadcast on wise:chat-bg-anim-angle). Published default matches Scene. */
  const BGANIM_ANGLE_KEY = 'wise:chat-bg-anim-angle';
  let bgAnimAngle = readBgAnimAngle();
  let bgAnimWash = readBgAnimWash();
  applyBgAnimWash(bgAnimWash);
  let bgAnimCamera = readBgAnimCamera();
  let bgAnimAzimuth = readBgAnimAzimuth();
  let bgAnimShift = readBgAnimShift();
  /* Scale of the field on X / Y / Z (1–800% each). Shared APP-WIDE (per-axis
     keys, broadcast on wise:chat-bg-anim-scale). 100% is the original strand;
     each axis stretches — or pinches — independently from the centre, and the
     master Scale row moves all three at once. Pitch / Nodes / Dots / Length /
     Rungs / Bar / Thick / Depth (the `knob` rows, same 1–800% window) open
     up the shape itself; Dots size sits with a colour swatch and Still /
     Pulse / Spark motion for the small beads between product circles. Rungs
     and Bar are the cross-lines between the two strands. */
  const bgAnimScale = readBgAnimScaleAxes();
  const bgAnimKnobs = readBgAnimKnobs();
  const bgAnimDots = { color: readBgAnimDotsColor(), motion: readBgAnimDotsMotion() };
  const bgAnimMotionKnobs = readBgAnimMotionKnobs();
  let bgAnimRungsMatch = readBgAnimRungsMatch();
  let bgAnimSpinDir = readBgAnimSpinDir();
  let bgAnimLook = readBgAnimLook();
  const bgAnimMats = readBgAnimMats();
  /* Default background-animation opacity: Scene publish pose until user-set. */
  function paneDefaultBgAnimOpacity() {
    return BGANIM_PUBLISH_POSE.opacity / 100;
  }
  /* The opacity actually applied: the member's explicit slider choice when set,
     otherwise the pane-count default (recomputed live so a width change re-tunes
     a running field on its next frame). */
  function effectiveBgAnimOpacity() {
    return bgAnimOpacityUserSet ? bgAnimOpacity : paneDefaultBgAnimOpacity();
  }
  /* Playback state of the background animation — whether the running field is
     frozen (paused) on its current frame. Shared APP-WIDE (one key, broadcast
     on wise:chat-bg-anim-paused) so every mounted chat's Play/Pause follows the
     one shared setting; plays by default, a stored '1' restores the paused state. */
  const BGANIM_PAUSED_KEY = 'wise:chat-bg-anim-paused';
  let bgAnimPaused = false;
  try { if (bgAnimGet(BGANIM_PAUSED_KEY) === '1') bgAnimPaused = true; } catch (_) {}
  /* Which background-animation STYLE runs — the food-DNA 'helix' (default),
     the same helix with about ten products ('helix-ten'), or the owl 'orbit'.
     Shared APP-WIDE (one key, broadcast on wise:chat-bg-anim-style) so every
     mounted chat's segment + live field follow the one shared choice. A leftover
     'stamp' preference (removed) falls back to helix. */
  const BGANIM_STYLE_KEY = 'wise:chat-bg-anim-style';
  const BGANIM_STYLES = ['helix', 'helix-ten', 'orbit'];
  const isHelixStyle = (s) => s === 'helix' || s === 'helix-ten';
  let bgAnimStyle = readBgAnimStyle();
  applyBgAnimStyleAttr(bgAnimStyle);
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
     APP-WIDE like the level (own key, broadcast on wise:chat-stream-on).
     Exactly like the level, every load starts with streaming ON — full
     streaming is the guaranteed baseline on every surface; switching it off is
     an in-session choice that never carries into the next load. */
  const STREAM_ON_PREF_KEY = 'wise:chat-stream-on';
  let streamOn = true;
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
          <button type="button" class="topbar-menu-item" data-sc="file-library"><span class="material-symbols-outlined topbar-menu-icon">auto_stories</span><span>File to Library</span></button>
          ${showTurns ? `<div class="topbar-menu-divider"></div>
          <button type="button" class="topbar-menu-item topbar-menu-item--admin sc-mcp-item" data-sc="turns" role="menuitemcheckbox" aria-checked="false"><span class="material-symbols-outlined topbar-menu-icon">alt_route</span><span>Turns</span><span class="topbar-menu-badge">Admin</span><span class="sc-switch" aria-hidden="true"></span></button>` : ''}
          ${opts.outputsToggle === true ? `<button type="button" class="topbar-menu-item topbar-menu-item--admin sc-mcp-item" data-sc="outputs" role="menuitemcheckbox" aria-checked="false"><span class="material-symbols-outlined topbar-menu-icon">dashboard_customize</span><span>Hide outputs &amp; sources</span><span class="topbar-menu-badge">Admin</span><span class="sc-switch" aria-hidden="true"></span></button>` : ''}
          ${showConnectorsPanel ? `<div class="topbar-menu-divider"></div>
          <button type="button" class="topbar-menu-item topbar-menu-item--admin" data-sc="connect"><span class="material-symbols-outlined topbar-menu-icon">hub</span><span>Connect a data source</span><span class="topbar-menu-badge">Admin</span></button>` : ''}
          ${opts.mcpToggle === true ? `<button type="button" class="topbar-menu-item topbar-menu-item--admin sc-mcp-item" data-sc="mcp-toggle" role="menuitemcheckbox" aria-checked="false"><span class="material-symbols-outlined topbar-menu-icon">dns</span><span>MCP server</span><span class="topbar-menu-badge">Admin</span><span class="sc-switch" aria-hidden="true"></span></button>` : ''}
          <div class="topbar-menu-divider"></div>
          ${scorecardsHtml ? `<button type="button" class="topbar-menu-item topbar-menu-item--admin sc-mcp-item" data-sc="toggle-cards" role="menuitemcheckbox" aria-checked="false"><span class="material-symbols-outlined topbar-menu-icon">dashboard</span><span>Overview cards</span><span class="topbar-menu-badge">Admin</span><span class="sc-switch sc-switch--pink" aria-hidden="true"></span></button>` : ''}
          ${intents.length ? `<button type="button" class="topbar-menu-item topbar-menu-item--admin sc-mcp-item" data-sc="toggle-intent-chips" role="menuitemcheckbox" aria-checked="false"><span class="material-symbols-outlined topbar-menu-icon">label</span><span>Intent chips</span><span class="topbar-menu-badge">Admin</span><span class="sc-switch sc-switch--pink" aria-hidden="true"></span></button>` : ''}
          <button type="button" class="topbar-menu-item topbar-menu-item--admin sc-mcp-item sc-compact-item" data-sc="compact" role="menuitemcheckbox" aria-checked="false"><span class="material-symbols-outlined topbar-menu-icon">density_small</span><span>Compact spacing</span><span class="topbar-menu-badge">Admin</span><span class="sc-switch sc-switch--pink" aria-hidden="true"></span></button>
          <button type="button" class="topbar-menu-item topbar-menu-item--admin sc-mcp-item sc-brandtext-item" data-sc="brandtext" role="menuitemcheckbox" aria-checked="false"><span class="material-symbols-outlined topbar-menu-icon">format_color_text</span><span>Brand AI text</span><span class="topbar-menu-badge">Admin</span><span class="sc-switch sc-switch--pink" aria-hidden="true"></span></button>
          <button type="button" class="topbar-menu-item topbar-menu-item--admin sc-mcp-item sc-sheen-item" data-sc="sheen" role="menuitemcheckbox" aria-checked="false"><span class="material-symbols-outlined topbar-menu-icon">auto_awesome</span><span>Input glow</span><span class="topbar-menu-badge">Admin</span><span class="sc-switch sc-switch--pink" aria-hidden="true"></span></button>
          <button type="button" class="topbar-menu-item topbar-menu-item--admin sc-mcp-item sc-bganim-item" data-sc="bg-anim" role="menuitemcheckbox" aria-checked="true"><span class="material-symbols-outlined topbar-menu-icon">animation</span><span>Animation</span><span class="topbar-menu-badge">Admin</span><span class="sc-switch sc-switch--pink" aria-hidden="true"></span></button>
          ${bgAnimLookChromeHtml(BGANIM_PUBLISH_POSE.look)}
          ${bgAnimMatRowsHtml()}
          ${bgAnimSubheadHtml('View')}
          <div class="sc-bganim-detail">
            <span class="sc-bganim-detail-label">Opacity</span>
            <input type="range" class="sc-bganim-opacity" min="10" max="100" step="1" value="${BGANIM_PUBLISH_POSE.opacity}" aria-label="Helix opacity">
            <span class="sc-bganim-opacity-val">${BGANIM_PUBLISH_POSE.opacity}%</span>
          </div>
          ${bgAnimWashRowHtml()}
          <div class="sc-bganim-detail sc-bganim-angle">
            <span class="sc-bganim-detail-label">Angle</span>
            <input type="range" class="sc-bganim-angle-range" min="-90" max="90" step="1" value="${BGANIM_PUBLISH_POSE.angle}" aria-label="Helix angle">
            <span class="sc-bganim-angle-val">${BGANIM_PUBLISH_POSE.angle}°</span>
          </div>
          ${bgAnimCameraRowHtml()}
          ${bgAnimAzimuthRowHtml()}
          ${bgAnimShiftRowHtml()}
          <div class="sc-bganim-playback">
            <span class="sc-bganim-playback-label">Playback</span>
            <button type="button" class="sc-bganim-pp" data-sc="bg-anim-playback" aria-pressed="false" aria-label="Pause background animation" title="Pause background animation">
              <span class="sc-bganim-pp-pause"><span class="material-symbols-outlined">pause</span>Pause</span>
              <span class="sc-bganim-pp-play"><span class="material-symbols-outlined">play_arrow</span>Play</span>
            </button>
          </div>
          ${bgAnimSubheadHtml('Size')}
          ${bgAnimScaleRowsHtml()}
          ${bgAnimKnobById('nodes')}
          ${bgAnimKnobRowsHtml()}
          ${bgAnimSubheadHtml('Field')}
          <div class="sc-bganim-style">
            <span class="sc-bganim-style-label">Style</span>
            <div class="sc-stream-seg" role="radiogroup" aria-label="Background animation style">
              <button type="button" class="sc-stream-seg-btn is-on" data-sc="bg-anim-style" data-style="helix" role="radio" aria-checked="true" title="Food DNA helix" aria-label="Food DNA helix">Helix</button>
              <button type="button" class="sc-stream-seg-btn" data-sc="bg-anim-style" data-style="helix-ten" role="radio" aria-checked="false" title="Food DNA helix — about ten products" aria-label="Food DNA helix — about ten products">Ten</button>
              <button type="button" class="sc-stream-seg-btn" data-sc="bg-anim-style" data-style="orbit" role="radio" aria-checked="false" title="Owl orbit constellation" aria-label="Owl orbit constellation">Orbit</button>
            </div>
          </div>
          ${opts.activityStrip !== false ? `<button type="button" class="topbar-menu-item topbar-menu-item--admin sc-mcp-item sc-actstrip-item" data-sc="activity-strip" role="menuitemcheckbox" aria-checked="false"><span class="material-symbols-outlined topbar-menu-icon">timeline</span><span>Activity strip</span><span class="topbar-menu-badge">Admin</span><span class="sc-switch sc-switch--pink" aria-hidden="true"></span></button>
          <div class="sc-stream-detail sc-actside-detail" data-admin-item="1">
            <span class="sc-stream-detail-label">Strip side</span>
            <div class="sc-stream-seg" role="radiogroup" aria-label="Activity strip side">
              <button type="button" class="sc-stream-seg-btn" data-sc="activity-strip-side" data-actside="left" role="radio" aria-checked="false" title="Pin to the left edge" aria-label="Pin to the left edge">Left</button>
              <button type="button" class="sc-stream-seg-btn" data-sc="activity-strip-side" data-actside="right" role="radio" aria-checked="false" title="Pin to the right edge" aria-label="Pin to the right edge">Right</button>
            </div>
          </div>` : ''}
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
          ${ollamaRowHtml()}
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
            <div class="fl-input-line${placeholderLock ? ' fl-input-line--locked' : ''}">
              <textarea class="fl-input${placeholderLock ? ' fl-input--locked' : ''}" id="${id}-input" placeholder="${esc(placeholder)}" rows="1" autocomplete="off"${placeholderLock ? ' readonly aria-disabled="true" tabindex="-1"' : ''}></textarea>
              ${placeholderLock ? `<span class="fl-input-lock" tabindex="0" role="img" aria-label="${esc(placeholderLockTip)}${placeholderLockSub ? ' \u2014 ' + esc(placeholderLockSub) : ''}"><span class="material-symbols-outlined">lock</span><span class="fl-input-lock-tip"><span class="fl-input-lock-tip-main">${esc(placeholderLockTip)}</span>${placeholderLockSub ? `<span class="fl-input-lock-tip-sub">${esc(placeholderLockSub)}</span>` : ''}</span></span>` : ''}
            </div>
            <div class="fl-attachments" id="${id}-fl-attach" aria-label="Pending attachments"></div>
          </div>
          <button type="button" class="sc-send${placeholderLock ? ' sc-send--locked' : ''}" id="${id}-send" title="Send"${placeholderLock ? ' disabled aria-disabled="true"' : ''}><span class="material-symbols-outlined">send</span></button>
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

  /* The three-dot menu (and the attach "+" popover) are portaled onto
     <body> while open — js/popover-layer.js lifts `.topbar-popover` /
     `.fl-more-popover` out of the chat card so overflow:hidden can't clip
     them. Queries and click delegation MUST go through these nodes (or
     document + a contains() check), not rootEl, or every switch looks
     dead once the menu is showing. */
  const menuRoot = () => document.getElementById(`${id}-more-pop`) || rootEl;
  const bgAnimSyncRoot = () => {
    const pop = document.getElementById(`${id}-more-pop`);
    return helixFloatForPop(pop) || pop || rootEl;
  };
  const menuSel = (sel) => {
    const pop = document.getElementById(`${id}-more-pop`);
    return queryChatMenu(pop, sel) || rootEl.querySelector(sel);
  };
  const menuSelAll = (sel) => {
    const pop = document.getElementById(`${id}-more-pop`);
    const fromMenu = queryChatMenuAll(pop, sel);
    if (fromMenu.length) return fromMenu;
    return Array.from(rootEl.querySelectorAll(sel));
  };

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
  /* Fold a finished turn's usage into the running conversation totals. Prefer
     the numbers already stamped on that answer's three-dot menu so the
     composer meter and the per-message read-out stay in lock-step. */
  function foldTelemetry(t) {
    if (!t) return;
    telemetry.turns += 1;
    telemetry.tokIn += t.tokIn;
    telemetry.tokOut += t.tokOut;
    telemetry.cached += t.cached;
    telemetry.cost += t.cost;
    telemetry.ops += t.ops;
    telemetry.tools += t.tools;
    telemetry.last = t;
  }
  function accrueTurn() {
    const pending = messages
      ? Array.from(messages.querySelectorAll('.sc-fb-menu-tokens[data-tok-in]:not([data-tok-accrued])'))
      : [];
    if (pending.length) {
      pending.forEach((el) => {
        const stamped = tokensFromEl(el);
        if (!stamped) return;
        if (telemetry.turnStart) stamped.dur = Math.max(stamped.dur, Date.now() - telemetry.turnStart);
        foldTelemetry(stamped);
        el.setAttribute('data-tok-accrued', '1');
        el.setAttribute('data-tok-dur', String(stamped.dur));
        el.innerHTML = formatTurnTokensHtml(stamped);
      });
      renderActivity();
      return;
    }
    const rnd = (a, b) => a + Math.random() * (b - a);
    const tokIn = Math.round(rnd(6000, 22000));
    const tokOut = Math.round(rnd(400, 2600));
    const cached = Math.round(tokIn * rnd(0.7, 0.9));
    const cost = +(tokIn / 1e6 * 0.9 + tokOut / 1e6 * 4.5).toFixed(4);
    const ops = Math.round(rnd(1, 4));
    const tools = Math.round(rnd(0, 3));
    const dur = telemetry.turnStart ? (Date.now() - telemetry.turnStart) : Math.round(rnd(2000, 9000));
    foldTelemetry({ tokIn, tokOut, cached, cost, ops, tools, dur });
    renderActivity();
  }
  function syncTelemetryFromTranscript() {
    Object.assign(telemetry, { turns: 0, ops: 0, tools: 0, tokIn: 0, tokOut: 0, cached: 0, cost: 0, turnStart: 0, last: null });
    if (messages) {
      messages.querySelectorAll('.sc-fb-menu-tokens[data-tok-in]').forEach((el) => {
        const stamped = tokensFromEl(el);
        if (!stamped) return;
        foldTelemetry(stamped);
        el.setAttribute('data-tok-accrued', '1');
      });
    }
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

  /* Inline intent chips — ON by default. Every transcript ends on suggested
     actions that live IN the thread, trailing the latest WISEcodeAI turn (NOT a
     docked bottom carousel). We keep a single element and re-park it at the
     end of the thread after every reply, and detach it while the user is
     typing / WISEcodeAI is thinking. Pass `inlineChips: false` to opt out. */
  const inlineChips = opts.inlineChips !== false;
  let ichipsEl = null;
  function parkInlineChips(force) {
    if ((!inlineChips && !force) || !messages) return;
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
  /* A later line (preview card, host chip row, bridged echo) can land AFTER
     the chips were parked. Keep the topic chips as the last node in the
     thread so every transcript still ends on them. */
  if (messages) {
    const chipEndObserver = new MutationObserver(() => {
      if (!inlineChips || !ichipsEl || !ichipsEl.parentNode) return;
      if (messages.lastElementChild !== ichipsEl) messages.appendChild(ichipsEl);
    });
    chipEndObserver.observe(messages, { childList: true });
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
     is touched. The three-dot menu row is a switch (like every other stateful
     row) — ON means the cards are shown. */
  function syncCards() {
    rootEl.classList.toggle('sc-cards-hidden', cardsHidden);
    const item = menuSel('[data-sc="toggle-cards"]');
    if (item) {
      item.classList.toggle('is-on', !cardsHidden);
      item.setAttribute('aria-checked', cardsHidden ? 'false' : 'true');
    }
  }

  /* Reflect the intent-chips preference: a root class hides the welcome intent
     chips (the small suggested-action chips right below the overview cards).
     The three-dot menu row is a switch — ON means the chips are shown. */
  function syncChips() {
    rootEl.classList.toggle('sc-intent-chips-hidden', chipsHidden);
    const item = menuSel('[data-sc="toggle-intent-chips"]');
    if (item) {
      item.classList.toggle('is-on', !chipsHidden);
      item.setAttribute('aria-checked', chipsHidden ? 'false' : 'true');
    }
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

  /* Which ask the lines being added belong to. One member ask can produce a
     whole run of WISEcodeAI lines — a preview card per surfaced output, then the
     answer itself — and each of those lines gets its own turn ID. Anything that
     needs to know "these all came from the same prompt" (the activity strip's
     ear-marks) groups on this, not on the per-line IDs. */
  let askTurnSeq = 0;

  /* A long prompt a member pastes in is a document, not a sentence: it arrives
     with paragraph breaks and bullet lines and has to read that way in the
     transcript instead of collapsing into one run-on block.

     Only multi-line text is shaped. Anything typed in the composer is a single
     line and is escaped exactly as before, so no ordinary message changes.
     The markup understood is deliberately small: a blank line starts a new
     paragraph, a line opening with "- " is a bullet, a line ending in a colon
     leads the list beneath it, and **bold** / *italic* mark emphasis. */
  function promptBodyHtml(text) {
    const raw = String(text == null ? '' : text);
    if (!/\n/.test(raw)) return esc(raw);
    const inline = (s) => esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(\u201C"\u2014])\*([^*\n]+)\*(?=$|[\s).,;:!?\u201D"\u2014])/g, '$1<em>$2</em>');
    const out = [];
    let items = null;
    const flush = () => {
      if (!items) return;
      out.push(`<ul class="sc-prompt-list">${items.join('')}</ul>`);
      items = null;
    };
    raw.split('\n').forEach((line) => {
      const t = line.trim();
      if (!t) { flush(); return; }
      if (/^[-\u2022]\s+/.test(t)) {
        items = items || [];
        items.push(`<li>${inline(t.replace(/^[-\u2022]\s+/, ''))}</li>`);
        return;
      }
      flush();
      /* A colon-led line introduces the list under it, so it carries the weight
         — unless it already marks its own emphasis, which would bold it twice. */
      const lead = /:$/.test(t) && !t.includes('**');
      out.push(`<p class="sc-prompt-p${lead ? ' sc-prompt-lead' : ''}">${inline(t)}</p>`);
    });
    flush();
    return `<div class="sc-prompt">${out.join('')}</div>`;
  }

  function addUser(text, atts) {
    if (!messages) return;
    askTurnSeq += 1; /* a new ask — every line that follows belongs to it */
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
    const bodyText = text ? promptBodyHtml(text) : '';
    messages.insertAdjacentHTML('beforeend',
      `<div class="sc-line sc-line-you" data-ask-turn="${askTurnSeq}">${youChipHtml()}<div class="sc-line-body">${attHtml}${bodyText}<div class="sc-line-meta">${timeStampHtml()}</div></div></div>`);
    const line = messages.lastElementChild;
    /* The member's own turn animates in line by line, exactly like an answer
       does. A pasted brief is a document — headings, paragraphs, dozens of
       bullets — and dropping it in as one finished slab was the loudest "loads
       all at once" left in the transcript. Each line gets its own beat on a
       quick cadence (the text is already written; this is not thinking), so even
       a seventy-line brief settles in about two seconds. A one-line message is a
       single beat and lands immediately. */
    const body = line && line.querySelector('.sc-line-body');
    if (body) {
      staggerReveal(body, {
        maxBeats: 140, budget: 2200, minGap: 26, maxGap: 90, startDelay: 20,
        onReveal: () => scrollDown(true),
      });
    }
    scrollDown(true); /* fresh user action — always bring their message into view */
    refreshDockedTurns();
  }
  /* Actions row appended beneath a WISEcodeAI answer. Left cluster: copy + thumbs
     up / thumbs down (thumbs down reveals the reason chips, see feedbackReasons).
     Then the three-dot (re-run / edit / fork / file-to-folder + turn ID, then a
     divider and this-message tokens) and the timestamp immediately to its right. */
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
  function feedbackRowHtml(timeMs) {
    const tid = makeTurnId();
    const upPop = reasonsPopoverHtml('up', accurateReasons, 'What was accurate?', 'What worked? (optional)');
    const downPop = reasonsPopoverHtml('down', feedbackReasons, 'What wasn\u2019t right?', 'Tell us more (optional)');
    const t = typeof timeMs === 'number' && Number.isFinite(timeMs) ? timeMs : Date.now();
    /* Timestamp sits immediately to the RIGHT of the three-dot. The turn
       controls (re-run / edit / fork / file-to-folder + turn ID) stay behind
       that button; a divider then the token read-out for THIS answer. */
    const tokens = synthesizeTurnTokens(seedFrom(t, tid));
    if (telemetry.turnStart) tokens.dur = Math.max(1000, Date.now() - telemetry.turnStart);
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
            <button type="button" class="sc-fb-btn sc-fb-more" data-fb-more aria-label="More actions" aria-haspopup="true" aria-expanded="false"><span class="material-symbols-outlined">more_horiz</span></button>
            <div class="sc-fb-menu" role="menu" hidden>
              <span class="sc-fb-menu-actions">
                <button type="button" class="sc-fb-btn" data-fb="replay" data-tip="Re-run in new chat" aria-label="Re-run this prompt in a new conversation"><span class="material-symbols-outlined">auto_read_play</span></button>
                <button type="button" class="sc-fb-btn" data-fb="edit" data-tip="Edit in new chat" aria-label="Edit this prompt in a new conversation"><span class="material-symbols-outlined">bubble</span></button>
                <button type="button" class="sc-fb-btn" data-fb="turn" data-tip="Fork a turn" aria-label="Fork a turn from here"><span class="material-symbols-outlined">alt_route</span></button>
                <button type="button" class="sc-fb-btn" data-fb="file" data-tip="File to folder" aria-label="File this conversation to a folder" aria-haspopup="true"><span class="material-symbols-outlined">drive_file_move</span></button>
                <span class="sc-fb-id" data-tip="Turn ID" tabindex="0">#${esc(tid)}</span>
              </span>
              ${tokenRowHtml(tokens)}
            </div>
          </span>
          ${timeStampHtml(t, 'sc-fb-time')}
        </div>
        <div class="sc-fb-note" hidden></div>
      </div>`;
  }
  /* Saved threads may still have the stamp inside the three-dot menu, or
     left of copy from an earlier layout. Park it to the right of more. */
  function ensureFileMenuBtn(fb) {
    const actions = fb && fb.querySelector && fb.querySelector('.sc-fb-menu-actions');
    if (!actions || actions.querySelector('[data-fb="file"]')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sc-fb-btn';
    btn.setAttribute('data-fb', 'file');
    btn.setAttribute('data-tip', 'File to folder');
    btn.setAttribute('aria-label', 'File this conversation to a folder');
    btn.setAttribute('aria-haspopup', 'true');
    btn.innerHTML = '<span class="material-symbols-outlined">drive_file_move</span>';
    const idEl = actions.querySelector('.sc-fb-id');
    if (idEl) actions.insertBefore(btn, idEl);
    else actions.appendChild(btn);
  }
  function ensureTokenRow(fb) {
    const menu = fb && fb.querySelector && fb.querySelector('.sc-fb-menu');
    if (!menu || menu.querySelector('.sc-fb-menu-tokens')) return;
    const tid = ((fb.querySelector('.sc-fb-id') || {}).textContent || '').replace('#', '');
    const stamp = fb.querySelector('.sc-fb-time, .sc-line-time');
    const ms = stamp ? Number(stamp.getAttribute('data-ts')) : Date.now();
    const tokens = synthesizeTurnTokens(seedFrom(Number.isFinite(ms) ? ms : Date.now(), tid));
    menu.insertAdjacentHTML('beforeend', tokenRowHtml(tokens));
  }
  function hoistFeedbackTimes(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('.sc-fb').forEach((fb) => {
      const more = fb.querySelector('.sc-fb-more-wrap');
      if (more) {
        fb.querySelectorAll('.sc-line-time, .sc-fb-menu-time, .sc-fb-time').forEach((el) => {
          el.classList.remove('sc-fb-menu-time');
          el.classList.add('sc-fb-time');
          more.insertAdjacentElement('afterend', el);
        });
      }
      ensureFileMenuBtn(fb);
      ensureTokenRow(fb);
      const menu = fb.querySelector('.sc-fb-menu');
      const actions = menu && menu.querySelector('.sc-fb-menu-actions');
      const ver = menu && menu.querySelector(':scope > .sc-fb-menu-ver');
      if (ver && actions && ver.parentElement !== actions) actions.insertBefore(ver, actions.firstChild);
    });
    root.querySelectorAll('.sc-line-time').forEach(paintStampRel);
    syncTelemetryFromTranscript();
  }

  /* ── Paragraph-by-paragraph reveal ───────────────────────────────────────
     Each prose block fades in as a unit (never word-by-word). The callback
     then fires so the thumbs row and intent chips trail the copy. */
  const prefersReducedMotion = (() => {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (_) { return false; }
  })();
  function canTypeIn(el) {
    if (!el) return false;
    /* Only self-animating / interactive cards pop in whole — their own logic
       drives the reveal and must not be torn apart. Everything else types in;
       embedded charts / tables are left intact as their own paragraph unit. */
    return !el.querySelector('.sc-connect-flow, [data-cf-step], .sc-surface-card');
  }
  function typeInLine(bodyEl, done) {
    typeInTranscript(bodyEl, done, { scroll: scrollDown, reduced: prefersReducedMotion });
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
     transform so it sails right→left and lands in place. Used by welcome intent
     chips (and Show more) after the heading + sub have faded in. */
  function primeRevealFromRight(el) {
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateX(30px)';
    el.style.transition = 'opacity .22s ease, transform .28s cubic-bezier(0.22, 0.85, 0.25, 1)';
  }
  /* Welcome headline / sub — fade up in place (not the slow transcript
     paragraph type-in, which held the chips back for most of a second). */
  function primeRevealUp(el) {
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    el.style.transition = 'opacity .26s ease, transform .3s cubic-bezier(0.22, 0.85, 0.25, 1)';
  }
  function clearReveal(el) {
    if (!el) return;
    el.style.opacity = '';
    el.style.transform = '';
    el.style.transition = '';
  }
  /* Welcome-screen reveal. Heading, then the sub, fade up; the intent chips
     (and any visible overview cards) fly in from the right right after, so
     the copy always leads and the chips do not sit idle waiting on type-in.
     Honors reduced-motion. Safe to re-run on reset(). */
  function revealWelcome() {
    if (!welcome || welcome.classList.contains('sc-hidden')) return;
    bgAnim.start();
    const heading = welcome.querySelector('.ws-heading');
    const subEl = welcome.querySelector('.ws-sub');
    clampWelcomeChips();
    const scWrap = welcome.querySelector(`#${id}-scorecards`) || welcome.querySelector('.ws-scorecards');
    const cardsOn = !!(scWrap && !rootEl.classList.contains('sc-cards-hidden'));
    const visibleCards = () => cardsOn
      ? Array.from(scWrap.querySelectorAll('.ws-scorecard')).filter((c) => !c.hidden)
      : [];
    const chipsWrap = welcome.querySelector(`#${id}-chips`) || welcome.querySelector('.ws-chips');
    const visibleChips = () => chipsWrap
      ? Array.from(chipsWrap.querySelectorAll('.chip')).filter((c) => !c.hidden)
      : [];
    const text = [heading, subEl].filter(Boolean);
    const flyNow = visibleCards().concat(visibleChips());
    if (prefersReducedMotion) {
      text.concat(flyNow).forEach(clearReveal);
      welcome.classList.add('ws-in');
      return;
    }
    text.forEach(primeRevealUp);
    flyNow.forEach(primeRevealFromRight);
    welcome.classList.add('ws-in');
    welcomeChipsRevealing = true;
    revealStaggered(text, 40, 110, () => {
      clampWelcomeChips();
      const fly = visibleCards().concat(visibleChips());
      fly.forEach(primeRevealFromRight);
      revealStaggered(fly, 30, 28, () => { welcomeChipsRevealing = false; });
    });
  }
  /* Hide the thumbs / meta row up-front so it lands as one unit after the
     last paragraph — never icon-by-icon, and never before the copy. */
  function primeMeta(metaEl) {
    primeTranscriptPara(metaEl);
  }
  /* After the paragraphs: the thumbs-up/thumbs-down row as a single beat,
     then — if this line should trail them — the intent chips (left→right). */
  function revealMetaThenChips(metaEl, trailChips, whenDone) {
    const finish = () => { scrollDown(); if (typeof whenDone === 'function') whenDone(); };
    const showChips = () => {
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
    };
    if (metaEl) {
      showTranscriptPara(metaEl);
      scrollDown();
      setTimeout(showChips, 220);
    } else {
      showChips();
    }
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
     `typewriter:false` forces the line to appear whole (no paragraph reveal). */
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
    const timeMs = Date.now();
    const fb = (feedbackEnabled && meta.feedback !== false) ? feedbackRowHtml(timeMs) : '';
    const footer = `<div class="sc-line-meta">${
      src ? `<span class="sc-trust-chip" title="${esc(src)}"><span class="material-symbols-outlined">database</span>${esc(truncSourceName(src))}</span>` : ''
    }${fb ? '' : timeStampHtml(timeMs)}${fb}</div>`;
    messages.insertAdjacentHTML('beforeend',
      `<div class="sc-line sc-line-wiseai" data-ask-turn="${askTurnSeq}"><span class="sc-avatar sc-avatar-wiseai" role="img" aria-label="${esc(title)}">${OWL_BUG}</span><div class="sc-line-body">${html}${footer}</div></div>`);
    const line = messages.lastElementChild; /* capture before chips re-park */
    const body = line && line.querySelector('.sc-line-body');
    refreshDockedTurns();
    /* Bring a turn in, in order: (1) the content, paragraph by paragraph,
       (2) the thumbs-up/thumbs-down row as one unit, then (3) the intent
       chips (left→right) — but ONLY if this line should trail them.
       Surface/preview cards pass { trailChips:false } so the chips stay
       attached to the actual answer, not to a card posted mid-thinking.
       Reduced-motion shows it whole. */
    const metaEl = body && body.querySelector('.sc-line-meta');
    const trailChips = meta.trailChips !== false;
    /* Direct posts (connectors, announceRoute, feedback) still have to end on
       related chips. respondWithTrace already applied them (and a host
       setIntents() sets skipAutoFollowups so we don't overwrite a curated row). */
    if (trailChips && !skipAutoFollowups && meta.followups !== false) {
      applyTopicFollowups(meta.intent, html);
    }
    skipAutoFollowups = false;
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
  /* Stream the behind-the-scenes streaming trace for a turn, then hand off to
     `done()` (which posts the real answer) — the ONE implementation, shared with
     the hand-rolled page flows via js/trace-stream.js. */
  function runReasoningTrace(milestones, done, tail, sourceLine) {
    runTraceStream({
      messages,
      avatarHtml: `<span class="sc-avatar sc-avatar-wiseai" role="img" aria-label="${esc(title)}">${OWL_BUG}</span>`,
      milestones,
      tail,
      sourceLine,
      done,
      streamOn,
      streamLevel,
      prefersReducedMotion,
      scrollDown,
      showTyping,
      onStart: detachInlineChips,
    });
  }

  /* The grounding chip names a data source, capped to 15 characters so a long
     snapshot name never blows out the meta row. Anything longer is clipped
     with an ellipsis; the chip's title attribute keeps the full name. */
  function truncSourceName(s) {
    const str = String(s == null ? '' : s);
    return str.length > 15 ? str.slice(0, 15).trimEnd() + '\u2026' : str;
  }

  /* The currently active database from the in-input selector. Declared here —
     ahead of the selector wiring further down — because seeded history
     transcripts resolve their grounding while the mount is still building. */
  let currentDbId = defaultDbItem() ? defaultDbItem().id : null;

  /* Ground every turn in a database from the in-input selector's roster — a
     Postgres environment or snapshot — never the retailer connector rail
     (Walmart, Kroger, …). Retailer connectors are ingestion pipes; a database
     is where the answer is actually read from. NOT deterministic: most turns
     resolve to the ACTIVE database, but some questions legitimately pull from
     a different environment or snapshot, so the pick leans active yet stays
     variable. Returns the escaped database name. */
  function pickSourceName() {
    const active = dbItemById(currentDbId) || defaultDbItem();
    const pool = allDbItems();
    const db = (active && Math.random() < 0.6)
      ? active
      : (pool.length ? pool[Math.floor(Math.random() * pool.length)] : active);
    return esc(db && db.name ? db.name : 'the WISE Foods registry');
  }

  /* The trace's closing glob line naming which data source the answer is grounded
     in (rendered as HTML so the source reads in bold). '' when no source. */
  function sourceLineFor(name) {
    if (!name) return '';
    const n = String(name);
    if (/wikipedia|open food facts/i.test(n)) {
      return `This answer is drawn from <strong>${n}</strong>.`;
    }
    const templates = [
      `Grounding this answer in <strong>${n}</strong> \u2014 the database that best fit what you asked.`,
      `Read from <strong>${n}</strong> for this one; a different question might have pulled from another environment.`,
      `Pulling the numbers behind this from <strong>${n}</strong>.`,
      `This answer is drawn from <strong>${n}</strong>.`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /* Whether a reply's markup carries a rendered OUTPUT — a chart, table, or
     report card — the kind of artifact that warrants a "source of this output"
     caption pinned to its end. */
  function replyHasOutput(html) {
    const stripped = String(html || '').replace(/<table\b[^>]*sc-inline-tbl[\s\S]*?<\/table>/gi, '');
    const h = stripped.toLowerCase();
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

  /* The ONE streamed-turn path: stream the reasoning trace for an already-
     resolved reply, then post it. Every WISEcodeAI answer — chip-routed
     (wiseaiRespond), fixed (respondFixed), or host-posted via the mount's
     `respond()` — goes through here so the full thinking stream is never
     skipped, whatever drove the turn.
     meta (all optional; anything else is forwarded to addWISEcodeAI):
       traceText  — the text the trace routing reads (defaults to the reply's
                    own plain text, so the milestones stay on-topic);
       intent     — routes the trace by intent id, exactly like a clicked chip;
       milestones — caller-built milestone list replacing the routed one (e.g.
                    a single quick "Rescoring" beat for a live board echo);
       onTraceDone — fires the moment the trace completes, right before the
                    answer posts (host side-effects like opening output panes);
       source     — the turn's grounding ('' / undefined picks a connected
                    source; false drops the trust chip AND the trace's closing
                    grounding line, so the two always agree). */
  function respondWithTrace(html, meta = {}) {
    const routeText = meta.traceText != null
      ? meta.traceText
      : String(html || '').replace(/<[^>]*>/g, ' ');
    /* One data source for this turn — resolved up front so the trace's closing
       glob line and the answer's trust chip always name the SAME place. */
    const sourceLockedOff = meta.source === false;
    const givenSource = sourceLockedOff ? '' : (meta.source || '');
    const sourceName = givenSource;
    const milestones = (Array.isArray(meta.milestones) && meta.milestones.length)
      ? meta.milestones
      : reasoningTraceFor(routeText, meta.intent);
    const lineMeta = { ...meta, source: sourceLockedOff ? false : givenSource };
    delete lineMeta.traceText; delete lineMeta.milestones; delete lineMeta.intent; delete lineMeta.onTraceDone;
    const hostOnDone = lineMeta.onDone;
    lineMeta.onDone = () => {
      if (typeof hostOnDone === 'function') { try { hostOnDone(); } catch (_) { /* host hook */ } }
      /* Fires after paragraphs + thumbs + trailing chips have settled, so a
         host can open a companion pane only once the transcript is done. */
      if (typeof opts.onReplyDone === 'function') {
        try { opts.onReplyDone(meta.intent); } catch (_) { /* host hook */ }
      }
    };
    /* Start the local-model pass while the reasoning trace plays. Simple
       off-script questions become short food/nutrition answers; scripted
       turns get a warmer rewrite. Falls back to the written copy on failure. */
    const polishStarted = Date.now();
    const polishP = (opts.ollama === false)
      ? Promise.resolve({ html, chips: [], source: '' })
      : enrichReply({
        question: meta.enrichQuestion != null ? meta.enrichQuestion : routeText,
        intent: meta.intent,
        html,
        pageHint: pageHintForChat(),
      });
    const paintAnswer = (finalHtml) => {
      const pack = (finalHtml && typeof finalHtml === 'object')
        ? finalHtml
        : { html: finalHtml || html, chips: [], source: '' };
      const out = pack.html || html;
      if (thread) thread.html = out;
      if (lineMeta.source !== false) {
        lineMeta.source = pack.source || givenSource || pickSourceName();
      }
      if (Array.isArray(pack.chips) && pack.chips.length) {
        applyTopicFollowups(meta.intent, out, routeText, { nextIntents: pack.chips });
      } else {
        applyTopicFollowups(meta.intent, out, routeText);
      }
      if (typeof meta.onTraceDone === 'function') { try { meta.onTraceDone(); } catch (_) { /* host hook */ } }
      addWISEcodeAI(out, lineMeta);
    };
    const done = () => {
      const budget = (streamOn && streamLevel === 'full') ? 14000 : 12000;
      const left = Math.max(10000, budget - (Date.now() - polishStarted));
      withTimeout(polishP, left, { html, chips: [], source: '' }).then(paintAnswer);
    };
    runReasoningTrace(milestones, done, assemblyMilestoneFor(html), sourceLineFor(sourceName));
  }

  function pageHintForChat() {
    try {
      const t = String(document.title || '');
      let m = t.match(/^WISE\s*·\s*(.+)$/i);
      if (m) return m[1].trim();
      m = t.match(/^WISEcodeAI(?:\u2122)?\s*[—–-]\s*(.+)$/i);
      return ((m ? m[1] : t).split('·')[0] || '').trim();
    } catch (_) {
      return '';
    }
  }

  function wiseaiRespond(text, intent) {
    /* Resolve the answer up front so the trace can narrate assembling the exact
       pieces it will contain — and so nothing (chart/table/report cards, source
       chips, suggested actions, or host-surfaced output panes) renders until the
       whole trace has finished. Reply functions see the PREVIOUS turn; we
       remember this one after, so follow-up chips trail the answer that just
       landed. */
    const prev = threadCtx();
    const baseHtml = reply(text, intent);
    rememberTurn(intent, text, baseHtml);
    respondWithTrace(baseHtml, {
      traceText: text,
      intent,
      enrichQuestion: text,
      onTraceDone: () => {
        if (typeof opts.onReply === 'function') {
          try { opts.onReply(intent, text, { intent, topic: thread.topic, prev }); }
          catch (_) { /* host hook */ }
        }
      },
    });
  }
  /* Post a user line followed by a FIXED WISEcodeAI reply (bypasses the reply
     resolver) — used by controls like the brand connectors where the answer is
     the action's own confirmation, not a routed intent response. Streams the
     same full reasoning trace as any routed turn, so a fixed reply never just
     "lands" without showing the work. */
  function respondFixed(userText, replyHtml, meta) {
    hideWelcome();
    if (userText) addUser(userText);
    respondWithTrace(replyHtml, { ...(userText ? { traceText: userText } : {}), ...(meta || {}) });
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
    /* A short streamed thinking beat opens the turn (respecting the shared
       streaming level/switch), then the walkthrough card takes over as the live
       "what's happening" display — its steps animate pending → active → done,
       so the whole connection streams its progress end to end. */
    const traceSteps = [{
      key: 'Reaching out',
      story: connected
        ? [
            `Opening the ${name} connection and offering the stored credentials.`,
            'Confirming the authorization is still valid before asking the catalog for anything.',
            'Queuing the re-sync steps so you can watch each one land below.',
          ]
        : [
            `Opening a secure line to ${name} and introducing WISEcodeAI.`,
            'Preparing the authorization, data-scope, matching and sync steps.',
            'Walking through each one below so you can see exactly what\u2019s shared.',
          ],
    }];
    runReasoningTrace(traceSteps, () => {
      /* The "Connecting…" card is a mid-turn status card — the real answer
         (doneReply) lands after it, so let the chips trail that, not the card. */
      const line = addWISEcodeAI(connectFlowCardHtml(name, steps, headline), { source: '', feedback: false, trailChips: false });
      const card = line ? line.querySelector('.sc-connect-flow') : null;
      /* A brand-new connection is an "added data source" landmark for the
         activity strip; a re-sync of an already-connected source is not. */
      if (card && !connected) card.dataset.activity = 'source';
      animateConnectFlow(card, cid, name, steps, doneHead, doneReply);
    }, null, '');
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
        '<button type="button" class="wch-close" aria-label="Close"><span class="material-symbols-outlined">close</span></button>' +
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
     exactly like the Turns module's breakout. Built lazily on first open via
     the shared window.WiseChatAsk controller (js/chat-ask.js). */
  const askBreakoutWidth = opts.askBreakoutWidth || 360;

  /* Rich catalog — a structured library of everything the surface can do,
     grouped into sections, each capability carrying several example prompts and
     a "behind the scenes" tool list. When present it fully replaces the
     auto-derived (scorecards + chips) suggestions below. Shape:
       { intro, searchPlaceholder,
         sections: [ { id, title, icon, desc,
           items: [ { title, icon, desc, prompts:[...], tools:[...] } ] } ] }
     Defaults to the shared window.WISE_ASK_CATALOG so EVERY WISEcodeAI chat
     shows the identical "What can I ask?" panel wiseai.html does; a mount can
     still pass its own opts.askCatalog to override, or askCatalog:false to fall
     back to the auto-derived suggestions. */
  const askCatalogSrc = opts.askCatalog === false
    ? null
    : (opts.askCatalog || (typeof window !== 'undefined' ? window.WISE_ASK_CATALOG : null));
  const askCatalog = askCatalogSrc && Array.isArray(askCatalogSrc.sections) && askCatalogSrc.sections.length
    ? askCatalogSrc : null;

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
  /* Shared overlay controller — same panel, search, and breakout-to-sticky
     module that hand-built chats mount via window.WiseChatAsk. Built lazily
     on first open so unused surfaces don't pay for the DOM. */
  let askHelpApi = null;
  function ensureAskPanel() {
    if (askHelpApi) return askHelpApi;
    if (!window.WiseChatAsk) return null;
    askHelpApi = window.WiseChatAsk.mount({
      host: () => rootEl.querySelector('.sc-body') || rootEl,
      container: opts.askBreakoutContainer || (() => rootEl.parentElement),
      anchor: opts.askBreakoutAnchor || rootEl,
      chatEl: rootEl,
      label: askHelpLabel,
      catalog: askCatalog,
      getSuggestions: askSuggestions,
      breakoutWidth: askBreakoutWidth,
      stickyDefault: opts.askStickyDefault !== false,
      inputEl: () => input,
      onBeforeOpen: () => {
        chatHistory?.close?.();
        dismissTurnsOverlay();
        closeConnectors();
      },
      onInsert: (text) => {
        if (!input) return;
        input.value = text;
        input.focus();
        try { input.setSelectionRange(text.length, text.length); } catch (_) {}
        input.dispatchEvent(new Event('input', { bubbles: true }));
      },
      onAsk: (text, intent) => {
        if (applyKeepWelcomeChip(intent, text)) return;
        const handled = opts.onIntent ? opts.onIntent(intent, text) : false;
        if (intent) markIntentUsed(intent);
        hideWelcome();
        addUser(text);
        if (!handled) wiseaiRespond(text, intent);
      },
    });
    return askHelpApi;
  }
  function openAskHelp() { ensureAskPanel()?.open(); }
  function closeAskHelp() { askHelpApi?.close(); }
  function setAskDocked(on) { ensureAskPanel()?.setDocked(!!on); }
  function dismissAskOverlay() { askHelpApi?.dismissOverlay?.(); }

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
    /* The more-menu is portaled onto <body>; close it first so popover-layer
       can restore it before the transcript is rewritten underneath. */
    closeMoreMenus();
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
    /* Fallback: walk back to the nearest user line if turn grouping missed. */
    let n = line;
    while (n) {
      if (n.classList && n.classList.contains('sc-line-you') && !n.classList.contains('sc-line-event')) {
        return lineText(n);
      }
      n = n.previousElementSibling;
    }
    return '';
  }

  /* Start a brand-new conversation seeded with just this turn's user prompt.
     autoRun=true runs it immediately (auto-replay); autoRun=false drops it into
     the composer so it can be edited before sending. The current thread is saved
     to History first, exactly like "Start new conversation". */
  function rerunFromLine(line, autoRun) {
    closeMoreMenus();
    const text = promptForLine(line);
    if (!text) {
      const anchor = (line && line.querySelector('.sc-fb-more')) || line;
      flashScTip(anchor, autoRun ? 'No prompt to re-run' : 'No prompt to edit');
      return;
    }
    if (chatHistory && chatHistory.startNew) chatHistory.startNew();
    else reset();
    if (autoRun) {
      ask(text);
    } else if (input) {
      hideWelcome();
      input.value = text;
      input.focus();
      try { input.setSelectionRange(text.length, text.length); } catch (_) {}
      input.dispatchEvent(new Event('input', { bubbles: true }));
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

  /* Width changer for the broken-out Turns module. Cycles the canonical five
     tiers shared by every module: single → double → triple → fill → custom. */
  const TURNS_W_ICONS = ['width_normal', 'width_wide', 'width_wide', 'width_full', 'fit_width'];
  const TURNS_W_TITLES = [
    'Width (single) — tap to widen',
    'Width (double) — tap to widen',
    'Width (triple) — tap to widen',
    'Width (fill) — tap to widen',
    'Width (custom) — drag to any size',
  ];
  let turnsWidthTier = 0;
  function applyTurnsWidth() {
    if (!turnsPanel) return;
    /* Sticky mode narrows the base to STICKY_MODULE_W (matching History) so the
       two flanking modules are equal; tiers scale from whichever base is live. */
    const baseW = stickyOn ? STICKY_MODULE_W : turnsBreakoutWidth;
    const tiers = [baseW, Math.round(baseW * 1.5), baseW * 2];
    const W = window.WPaneWidth;
    if (turnsWidthTier === 4) {
      if (W && W.applyClasses) W.applyClasses(turnsPanel, 4, 'panel');
      else {
        turnsPanel.classList.add('panel-custom');
        if (W && W.pinToCurrent) W.pinToCurrent(turnsPanel);
      }
    } else {
      try { window.WisePaneResize && window.WisePaneResize.release && window.WisePaneResize.release([turnsPanel]); } catch (_) {}
      if (turnsWidthTier === 3) {
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
      turnsPanel.classList.toggle('panel-custom', false);
      if (W && W.applyClasses) W.applyClasses(turnsPanel, turnsWidthTier, 'panel');
    }
    const btn = turnsPanel.querySelector('.wt-width-btn');
    if (btn) {
      if (W && W.syncButton) W.syncButton(btn, turnsWidthTier);
      else {
        btn.classList.toggle('is-on', turnsWidthTier >= 1);
        btn.setAttribute('aria-pressed', turnsWidthTier >= 1 ? 'true' : 'false');
        btn.title = TURNS_W_TITLES[turnsWidthTier];
        const ic = btn.querySelector('.material-symbols-outlined');
        if (ic) ic.textContent = TURNS_W_ICONS[turnsWidthTier];
      }
    }
  }
  function cycleTurnsWidth() {
    const W = window.WPaneWidth;
    turnsWidthTier = W ? W.next(turnsWidthTier) : (turnsWidthTier + 1) % 5;
    applyTurnsWidth();
  }

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
              '<button type="button" class="topbar-menu-item" data-turns-act="share"><span class="material-symbols-outlined topbar-menu-icon">share</span><span>Share</span></button>' +
              '<div class="topbar-menu-divider"></div>' +
              '<button type="button" class="topbar-menu-item topbar-menu-item--danger" data-turns-act="close"><span class="material-symbols-outlined topbar-menu-icon">close</span><span>Close panel</span></button>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="panel-width-toggle-btn wt-width-btn" aria-pressed="false" title="Width (single) — tap to widen" aria-label="Turns module width"><span class="material-symbols-outlined">width_normal</span></button>' +
        '</div>'
      : (turnsBreakout ? '<button type="button" class="wch-dock" title="Break out as a side module" aria-label="Break turns out as a side module"><span class="material-symbols-outlined">vertical_split</span></button>' : '') +
        '<button type="button" class="wch-close" aria-label="Close"><span class="material-symbols-outlined">close</span></button>';

    const searchHtml = turnsSearchOn
      ? '<div class="wt-search">' +
          '<span class="material-symbols-outlined">search</span>' +
          '<input type="text" class="wt-search-input" placeholder="Search turns…" aria-label="Search turns" autocomplete="off">' +
          '<button type="button" class="wt-search-clear" aria-label="Clear search"><span class="material-symbols-outlined">close</span></button>' +
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
        closeTMore();
        if (act === 'close') closeTurns();
        else if (act === 'share') { if (typeof opts.onShare === 'function') opts.onShare(); }
      });
      document.addEventListener('click', (e) => { if (!tMorePop.classList.contains('hidden') && !tMoreWrap.contains(e.target) && !tMorePop.contains(e.target)) closeTMore(); });
    }
    /* Sticky is the only module style now — permanently tuck the docked Turns
       module in behind the chat (no toggle). */
    setTurnsSticky(true);

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
        /* Far-right dock: make Turns the last module in the row so it always
           sits to the right of any open output modules (result / visual panes),
           tucking behind the last one as the next layered-down drawer. Output
           panes keep their fixed slot in the DOM, so once Turns is last it stays
           rightmost no matter which panes open later. */
        if (turnsBreakoutFarRight) container.appendChild(turnsPanel);
        else if (anchor && anchor.parentElement === container && anchor.nextSibling) container.insertBefore(turnsPanel, anchor.nextSibling);
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
    const item = menuSel('[data-sc="turns"]');
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
    const item = menuSel('[data-sc="history"].sc-mcp-item');
    if (!item) return;
    const on = isHistoryVisible();
    item.classList.toggle('is-on', on);
    item.setAttribute('aria-checked', on ? 'true' : 'false');
  }
  /* Sync the "Compact spacing" switch to the shared <html>.chat-compact state.
     Called on mount and whenever any module flips it (via the wise:chat-compact
     event), so every open chat's switch reflects the one shared setting. */
  function syncCompactMenu() {
    const item = menuSel('[data-sc="compact"]');
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
    const item = menuSel('[data-sc="brandtext"]');
    if (!item) return;
    const on = document.documentElement.classList.contains('chat-brandtext');
    item.classList.toggle('is-on', on);
    item.setAttribute('aria-checked', on ? 'true' : 'false');
  }
  document.addEventListener('wise:chat-brandtext', syncBrandtextMenu);
  /* Sync the "Input glow" switch to the shared <html>.chat-sheen-off state (ON =
     class absent). Called on mount and whenever any module flips it (via the
     wise:chat-sheen event) so every open chat's switch reflects the one setting. */
  function syncSheenMenu() {
    const item = menuSel('[data-sc="sheen"]');
    if (!item) return;
    const on = !document.documentElement.classList.contains('chat-sheen-off');
    item.classList.toggle('is-on', on);
    item.setAttribute('aria-checked', on ? 'true' : 'false');
  }
  document.addEventListener('wise:chat-sheen', syncSheenMenu);
  /* ── "Background animation" (Admin) engine ─────────────────────────────────
     A welcome-only ambient canvas: a DNA/RNA double helix whose two backbones +
     base-pair "rungs" are drawn in brand blue, chain-linking a run of OUR REAL
     PRODUCT PHOTOS drawn as round thumbnails (the app's circular product "bug"),
     with the WISEcodeAI owl logo itself sprinkled into the chain in a few places.
     It runs along a tilted, slowly-swaying axis that descends left→right (high on
     the left, low on the right); its loops TRAVEL end-to-end at a slow crawl — a
     moving twist, not an in-place spin. The strand EXPANDS AND CONTRACTS, its radius
     swelling wide then drawing back in on a slow breathing cycle. The Depth
     knob trades the strands front/back in 3-D: near products swell and
     brighten, far ones shrink and fade. Thick paints the backbones fatter or
     finer. Rungs / Bar set how many cross-lines sit between the two strands
     and how heavy those lines paint. The canvas is created lazily the first time the animation is turned on,
     lives behind the welcome content (which goes transparent while live), and
     blooms out (fade + expand) the moment the transcript advances. */
  /* The welcome-only ambient field. Helix and orbit share one facade so all the
     start/stop/pause/resume call sites below stay style-agnostic: the DNA/RNA
     product 'helix' (createHelixBgAnim — the SAME engine every other chat
     surface uses; Helix and Ten are one engine with a density flip) and the
     owl orbit (createOrbitBgAnim). Each engine is built lazily the first time
     its style runs; switching style stops the old field and (if the welcome
     is up) starts the new one in its place. Helix ↔ Ten stays on the same
     canvas so the ten product bugs can swell into the leftover node space. */
  const bgAnimCommon = {
    host: rootEl,
    getBody: () => rootEl,
    getCenterY: () => helixFillCenterY(rootEl),
    fillHost: true,
    getOpacity: effectiveBgAnimOpacity,
    getAngle: () => bgAnimAngle,
    getCamera: () => bgAnimCamera,
    getAzimuth: () => bgAnimAzimuth,
    getShift: () => bgAnimShift,
    getScale: () => ({ x: bgAnimScale.x / 100, y: bgAnimScale.y / 100, z: bgAnimScale.z / 100 }),
    getPitch: () => bgAnimKnobs.pitch / 100,
    getNodes: () => bgAnimKnobs.nodes / 100,
    getDots: () => bgAnimKnobs.dots / 100,
    getDotsColor: () => bgAnimDots.color,
    getDotsMotion: () => bgAnimDots.motion,
    getMotionKnob: (motion, id) => ((bgAnimMotionKnobs[motion] && bgAnimMotionKnobs[motion][id]) || 100) / 100,
    getSpinDir: () => bgAnimSpinDir,
    getSpinSpeed: () => bgAnimKnobs.speed / 100,
    getLook: () => bgAnimLook,
    getMat: (id) => bgAnimMats[id],
    getLength: () => bgAnimKnobs.length / 100,
    getRungs: () => bgAnimKnobs.rungs / 100,
    getRungsMatch: () => bgAnimRungsMatch,
    getRungThick: () => bgAnimKnobs.rungthick / 100,
    getThickness: () => bgAnimKnobs.thickness / 100,
    getDepth: () => bgAnimKnobs.depth / 100,
    reducedMotion: prefersReducedMotion,
    isOn: () => bgAnimOn,
    isPaused: () => bgAnimPaused,
    getDensity: () => (bgAnimStyle === 'helix-ten' ? 'ten' : 'full'),
  };
  const bgAnimEngines = {};
  const bgAnimEngineKey = (style) => (style === 'orbit' ? 'orbit' : 'helix');
  const bgAnimEngine = (style) => {
    const key = bgAnimEngineKey(style);
    if (!bgAnimEngines[key]) {
      bgAnimEngines[key] = key === 'orbit'
          ? createOrbitBgAnim(bgAnimCommon)
          : createHelixBgAnim(bgAnimCommon);
    }
    return bgAnimEngines[key];
  };
  const bgAnim = {
    start() { bgAnimEngine(bgAnimStyle).start(); },
    stop() { Object.keys(bgAnimEngines).forEach((k) => bgAnimEngines[k].stop()); },
    pause() { const e = bgAnimEngine(bgAnimStyle); if (e && e.pause) e.pause(); },
    resume() { const e = bgAnimEngine(bgAnimStyle); if (e && e.resume) e.resume(); },
    redraw() { const e = bgAnimEngine(bgAnimStyle); if (e && e.redraw) e.redraw(); },
    /* Swap the running style: stop whatever is live, then (if the welcome is up
       and the field is on) start the newly-chosen style in its place. Helix ↔
       Ten is a density flip on the same engine — redraw so the ten products
       can swell without tearing the strand down. */
    setStyle(style) {
      if (!BGANIM_STYLES.includes(style) || style === bgAnimStyle) return;
      const live = rootEl.classList.contains('sc-bganim-live')
        || rootEl.classList.contains('sc-orbit-live');
      const sameHelix = isHelixStyle(style) && isHelixStyle(bgAnimStyle);
      bgAnimStyle = style;
      if (sameHelix && live && bgAnimOn) {
        const e = bgAnimEngines.helix;
        if (e && e.redraw) { e.redraw(); return; }
      }
      this.stop({ immediate: true });
      if (bgAnimOn && live) bgAnimEngine(bgAnimStyle).start();
    },
  };
  /* Sync the "Background animation" switch to this surface's on/off state, and
     (re)start or stop the field to match — but only draw while the welcome is up,
     so turning it on mid-conversation just arms it for the next welcome. Shared
     app-wide: the wise:chat-bg-anim broadcast keeps every mounted chat in step. */
  function syncBgAnimMenu() {
    const item = menuSel('[data-sc="bg-anim"]');
    if (item) {
      item.classList.toggle('is-on', bgAnimOn);
      item.setAttribute('aria-checked', bgAnimOn ? 'true' : 'false');
    }
    /* The opacity / angle / scale sliders (below the toggle) dim + lock while the animation is off. */
    menuSelAll('.sc-bganim-detail').forEach((el) => el.classList.toggle('is-disabled', !bgAnimOn));
    const dotsMotionRow = menuSel('.sc-bganim-dots-motion');
    if (dotsMotionRow) dotsMotionRow.classList.toggle('is-disabled', !bgAnimOn);
    const spinRow = menuSel('.sc-bganim-spin');
    if (spinRow) spinRow.classList.toggle('is-disabled', !bgAnimOn);
    const lookRow = menuSel('.sc-bganim-look');
    if (lookRow) lookRow.classList.toggle('is-disabled', !bgAnimOn);
    /* The style segment (Helix / Ten / Orbit) reflects the shared choice and stays
       ALWAYS interactive — even when the field is off — so it reads as a real,
       discoverable choice (picking a style turns the animation on, below). */
    const styleRow = menuSel('.sc-bganim-style');
    if (styleRow) styleRow.classList.remove('is-disabled');
    menuSelAll('[data-sc="bg-anim-style"]').forEach((btn) => {
      const on = btn.dataset.style === bgAnimStyle;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    /* Angle, Camera, Pitch, Dots, Length, Thick and Depth describe the strand, so they only
       apply to the DNA helix (Helix / Ten). Scale and Nodes drive Orbit too. */
    syncBgAnimHelixOnlyRows(bgAnimSyncRoot(), isHelixStyle(bgAnimStyle));
    const pct = Math.round(effectiveBgAnimOpacity() * 100);
    const range = menuSel('.sc-bganim-opacity');
    if (range && document.activeElement !== range) range.value = String(pct);
    const val = menuSel('.sc-bganim-opacity-val');
    if (val) val.textContent = pct + '%';
    const washRange = menuSel('.sc-bganim-wash-range');
    if (washRange && document.activeElement !== washRange) washRange.value = String(bgAnimWash);
    const washVal = menuSel('.sc-bganim-wash-val');
    if (washVal) washVal.textContent = bgAnimWash + '%';
    const angleRange = menuSel('.sc-bganim-angle-range');
    if (angleRange && document.activeElement !== angleRange) angleRange.value = String(bgAnimAngle);
    const angleVal = menuSel('.sc-bganim-angle-val');
    if (angleVal) angleVal.textContent = bgAnimAngle + '°';
    const cameraRange = menuSel('.sc-bganim-camera-range');
    if (cameraRange && document.activeElement !== cameraRange) cameraRange.value = String(bgAnimCamera);
    const cameraVal = menuSel('.sc-bganim-camera-val');
    if (cameraVal) cameraVal.textContent = bgAnimCamera + '°';
    const azimuthRange = menuSel('.sc-bganim-azimuth-range');
    if (azimuthRange && document.activeElement !== azimuthRange) azimuthRange.value = String(bgAnimAzimuth);
    const azimuthVal = menuSel('.sc-bganim-azimuth-val');
    if (azimuthVal) azimuthVal.textContent = bgAnimAzimuth + '°';
    const shiftRange = menuSel('.sc-bganim-shift-range');
    if (shiftRange && document.activeElement !== shiftRange) shiftRange.value = String(bgAnimShift);
    const shiftVal = menuSel('.sc-bganim-shift-val');
    if (shiftVal) shiftVal.textContent = bgAnimShift + '%';
    syncBgAnimScaleRows(bgAnimSyncRoot(), bgAnimScale);
    syncBgAnimKnobRows(bgAnimSyncRoot(), bgAnimKnobs);
    syncBgAnimRungsMatch(bgAnimSyncRoot(), bgAnimRungsMatch, bgAnimKnobs);
    syncBgAnimDotsChrome(bgAnimSyncRoot(), bgAnimDots, bgAnimMotionKnobs, isHelixStyle(bgAnimStyle));
    syncBgAnimSpinChrome(bgAnimSyncRoot(), bgAnimSpinDir);
    syncBgAnimLookChrome(bgAnimSyncRoot(), bgAnimLook);
    syncBgAnimMatRows(bgAnimSyncRoot(), bgAnimMats, bgAnimLook);
    syncBgAnimSnapshots(bgAnimSyncRoot());
    /* The Play/Pause pill (below opacity) — dims + locks with the toggle, and its
       icon/label + aria reflect whether the field is currently frozen. */
    const playback = menuSel('.sc-bganim-playback');
    if (playback) playback.classList.toggle('is-disabled', !bgAnimOn);
    const ppBtn = menuSel('[data-sc="bg-anim-playback"]');
    if (ppBtn) {
      ppBtn.classList.toggle('is-paused', bgAnimPaused);
      ppBtn.setAttribute('aria-pressed', bgAnimPaused ? 'true' : 'false');
      const lbl = bgAnimPaused ? 'Play background animation' : 'Pause background animation';
      ppBtn.setAttribute('aria-label', lbl);
      ppBtn.setAttribute('title', lbl);
    }
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
      try { bgAnimSet(BGANIM_OPACITY_KEY, String(pct)); } catch (_) {}
      try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-opacity', { detail: { opacity: bgAnimOpacity } })); } catch (_) {}
      const val = menuSel('.sc-bganim-opacity-val');
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
  /* Wash slider — how strongly the helix fades behind composer text. The
     canvas mask and the composer field gradient both follow this one value. */
  const bgWashRange = rootEl.querySelector('.sc-bganim-wash-range');
  if (bgWashRange) {
    bgWashRange.addEventListener('input', () => {
      const pct = clampBgAnimWash(parseInt(bgWashRange.value, 10));
      bgAnimWash = pct;
      persistBgAnimWash(pct);
      applyBgAnimWash(pct);
      broadcastBgAnimWash(pct);
      const wval = menuSel('.sc-bganim-wash-val');
      if (wval) wval.textContent = pct + '%';
    });
  }
  document.addEventListener('wise:chat-bg-anim-wash', (e) => {
    const v = e && e.detail && e.detail.wash;
    if (typeof v !== 'number') return;
    bgAnimWash = clampBgAnimWash(v);
    applyBgAnimWash(bgAnimWash);
    syncBgAnimMenu();
  });
  /* Angle slider — tilt the whole helix. Persist + broadcast so every mounted
     chat's slider (and its live canvas) follows the one shared setting. A
     running field picks the new tilt on the next frame; a paused / reduced-
     motion still frame is repainted immediately. */
  const bgAngleRange = rootEl.querySelector('.sc-bganim-angle-range');
  if (bgAngleRange) {
    bgAngleRange.addEventListener('input', () => {
      const deg = Math.max(-90, Math.min(90, parseInt(bgAngleRange.value, 10) || 0));
      bgAnimAngle = deg;
      try { bgAnimSet(BGANIM_ANGLE_KEY, String(deg)); } catch (_) {}
      try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-angle', { detail: { angle: bgAnimAngle } })); } catch (_) {}
      const aval = menuSel('.sc-bganim-angle-val');
      if (aval) aval.textContent = deg + '°';
      if (bgAnimOn) {
        if (prefersReducedMotion) bgAnim.start();
        else bgAnim.redraw();
      }
    });
  }
  document.addEventListener('wise:chat-bg-anim-angle', (e) => {
    const v = e && e.detail && e.detail.angle;
    if (typeof v !== 'number') return;
    bgAnimAngle = Math.max(-90, Math.min(90, v));
    syncBgAnimMenu();
    if (bgAnimOn) {
      if (prefersReducedMotion) bgAnim.start();
      else bgAnim.redraw();
    }
  });
  /* Camera slider — look at the corkscrew from above or below. Persist +
     broadcast so every mounted chat follows the one shared setting. */
  const bgCameraRange = rootEl.querySelector('.sc-bganim-camera-range');
  if (bgCameraRange) {
    bgCameraRange.addEventListener('input', () => {
      const deg = clampBgAnimCamera(parseInt(bgCameraRange.value, 10));
      bgAnimCamera = deg;
      persistBgAnimCamera(deg);
      broadcastBgAnimCamera(deg);
      const cval = menuSel('.sc-bganim-camera-val');
      if (cval) cval.textContent = deg + '°';
      if (bgAnimOn) {
        if (prefersReducedMotion) bgAnim.start();
        else bgAnim.redraw();
      }
    });
  }
  document.addEventListener('wise:chat-bg-anim-camera', (e) => {
    const v = e && e.detail && e.detail.camera;
    if (typeof v !== 'number') return;
    bgAnimCamera = clampBgAnimCamera(v);
    syncBgAnimMenu();
    if (bgAnimOn) {
      if (prefersReducedMotion) bgAnim.start();
      else bgAnim.redraw();
    }
  });
  const bgAzimuthRange = rootEl.querySelector('.sc-bganim-azimuth-range');
  if (bgAzimuthRange) {
    bgAzimuthRange.addEventListener('input', () => {
      const deg = clampBgAnimAzimuth(parseInt(bgAzimuthRange.value, 10));
      bgAnimAzimuth = deg;
      persistBgAnimAzimuth(deg);
      broadcastBgAnimAzimuth(deg);
      const aval = menuSel('.sc-bganim-azimuth-val');
      if (aval) aval.textContent = deg + '°';
      if (bgAnimOn) {
        if (prefersReducedMotion) bgAnim.start();
        else bgAnim.redraw();
      }
    });
  }
  document.addEventListener('wise:chat-bg-anim-azimuth', (e) => {
    const v = e && e.detail && e.detail.azimuth;
    if (typeof v !== 'number') return;
    bgAnimAzimuth = clampBgAnimAzimuth(v);
    syncBgAnimMenu();
    if (bgAnimOn) {
      if (prefersReducedMotion) bgAnim.start();
      else bgAnim.redraw();
    }
  });
  const bgShiftRange = rootEl.querySelector('.sc-bganim-shift-range');
  if (bgShiftRange) {
    bgShiftRange.addEventListener('input', () => {
      const pct = clampBgAnimShift(parseInt(bgShiftRange.value, 10));
      bgAnimShift = pct;
      persistBgAnimShift(pct);
      broadcastBgAnimShift(pct);
      const sval = menuSel('.sc-bganim-shift-val');
      if (sval) sval.textContent = pct + '%';
      if (bgAnimOn) {
        if (prefersReducedMotion) bgAnim.start();
        else bgAnim.redraw();
      }
    });
  }
  document.addEventListener('wise:chat-bg-anim-shift', (e) => {
    const v = e && e.detail && e.detail.shift;
    if (typeof v !== 'number') return;
    bgAnimShift = clampBgAnimShift(v);
    syncBgAnimMenu();
    if (bgAnimOn) {
      if (prefersReducedMotion) bgAnim.start();
      else bgAnim.redraw();
    }
  });
  /* Scale (master + X / Y / Z) and the Pitch / Nodes / Dots / Length / Rungs /
     Bar / Thick / Depth knobs — stretch, pinch and reshape the field from its
     centre (1–800% each). Persist + broadcast so every mounted chat follows
     the one shared setting. */
  const repaintBgAnim = () => {
    if (!bgAnimOn) return;
    if (prefersReducedMotion) bgAnim.start();
    else bgAnim.redraw();
  };
  wireBgAnimScaleRows(menuRoot(), bgAnimScale, repaintBgAnim);
  wireBgAnimKnobRows(menuRoot(), bgAnimKnobs, repaintBgAnim);
  wireBgAnimRungsMatch(menuRoot(), () => bgAnimRungsMatch, (v) => { bgAnimRungsMatch = v; }, bgAnimKnobs, repaintBgAnim);
  wireBgAnimDotsChrome(menuRoot(), bgAnimDots, repaintBgAnim, bgAnimMotionKnobs);
  wireBgAnimMotionKnobs(menuRoot(), bgAnimMotionKnobs, repaintBgAnim);
  wireBgAnimSpinChrome(menuRoot(), () => bgAnimSpinDir, (d) => { bgAnimSpinDir = d; }, repaintBgAnim);
  wireBgAnimLookChrome(menuRoot(), () => bgAnimLook, (v) => { bgAnimLook = v; syncBgAnimMatRows(bgAnimSyncRoot(), bgAnimMats, v); }, repaintBgAnim);
  wireBgAnimMatRows(menuRoot(), bgAnimMats, repaintBgAnim);
  wireBgAnimSnapshotsChrome(menuRoot());
  wireBgAnimSnapshotsChrome(bgAnimSyncRoot());
  document.addEventListener('wise:chat-bg-anim-snapshot', (e) => {
    const s = e && e.detail;
    if (!s) return;
    bgAnimLook = normalizeBgAnimLook(s.look);
    Object.assign(bgAnimMats, s.mats);
    bgAnimOpacity = Math.max(0.1, Math.min(1, (s.opacity || BGANIM_PUBLISH_POSE.opacity) / 100));
    bgAnimOpacityUserSet = true;
    bgAnimWash = clampBgAnimWash(s.wash);
    applyBgAnimWash(bgAnimWash);
    bgAnimAngle = Math.max(-90, Math.min(90, s.angle));
    bgAnimCamera = clampBgAnimCamera(s.camera);
    bgAnimAzimuth = clampBgAnimAzimuth(s.azimuth);
    bgAnimShift = clampBgAnimShift(s.shift);
    Object.assign(bgAnimScale, s.scale);
    Object.assign(bgAnimKnobs, s.knobs);
    bgAnimDots.color = s.dotsColor || '';
    bgAnimDots.motion = BGANIM_DOTS_MOTIONS.includes(s.dotsMotion) ? s.dotsMotion : 'still';
    if (s.motionKnobs && s.motionKnobs.pulse) Object.assign(bgAnimMotionKnobs.pulse, s.motionKnobs.pulse);
    if (s.motionKnobs && s.motionKnobs.spark) Object.assign(bgAnimMotionKnobs.spark, s.motionKnobs.spark);
    bgAnimSpinDir = BGANIM_SPIN_DIRS.includes(s.spin) ? s.spin : bgAnimSpinDir;
    bgAnimRungsMatch = !!s.rungsMatch;
    bgAnimPaused = !!s.paused;
    if (BGANIM_STYLES.includes(s.style)) bgAnim.setStyle(s.style);
    syncBgAnimMenu();
    applyBgAnimPaused();
    repaintBgAnim();
  });
  document.addEventListener('wise:chat-bg-anim-scale', (e) => {
    if (!applyScaleEventToAxes(bgAnimScale, e && e.detail)) return;
    syncBgAnimMenu();
    repaintBgAnim();
  });
  document.addEventListener('wise:chat-bg-anim-knob', (e) => {
    if (!applyKnobEventToKnobs(bgAnimKnobs, e && e.detail)) return;
    syncBgAnimMenu();
    repaintBgAnim();
  });
  document.addEventListener('wise:chat-bg-anim-rungs-match', (e) => {
    const on = !!(e && e.detail && e.detail.match);
    if (on === bgAnimRungsMatch) return;
    bgAnimRungsMatch = on;
    syncBgAnimMenu();
    repaintBgAnim();
  });
  document.addEventListener('wise:chat-bg-anim-dots', (e) => {
    if (!applyDotsEventToState(bgAnimDots, e && e.detail)) return;
    syncBgAnimMenu();
    repaintBgAnim();
  });
  document.addEventListener('wise:chat-bg-anim-motion-knob', (e) => {
    if (!applyMotionKnobEvent(bgAnimMotionKnobs, e && e.detail)) return;
    syncBgAnimMenu();
    repaintBgAnim();
  });
  document.addEventListener('wise:chat-bg-anim-spin', (e) => {
    const d = e && e.detail && e.detail.dir;
    if (!BGANIM_SPIN_DIRS.includes(d) || d === bgAnimSpinDir) return;
    bgAnimSpinDir = d;
    syncBgAnimMenu();
    repaintBgAnim();
  });
  document.addEventListener('wise:chat-bg-anim-look', (e) => {
    const look = normalizeBgAnimLook(e && e.detail && e.detail.look);
    if (!BGANIM_LOOKS.includes(look) || look === bgAnimLook) return;
    bgAnimLook = look;
    syncBgAnimMenu();
    repaintBgAnim();
  });
  document.addEventListener('wise:chat-bg-anim-mat', (e) => {
    if (!applyMatEvent(bgAnimMats, e && e.detail)) return;
    syncBgAnimMenu();
    repaintBgAnim();
  });
  /* Play/Pause — freeze or resume the running field. Persist + broadcast so every
     mounted chat's control (and its live canvas) follows the one shared setting. */
  function applyBgAnimPaused() {
    if (bgAnimPaused) bgAnim.pause(); else bgAnim.resume();
  }
  const bgPlaybackBtn = rootEl.querySelector('[data-sc="bg-anim-playback"]');
  if (bgPlaybackBtn) {
    bgPlaybackBtn.addEventListener('click', () => {
      bgAnimPaused = !bgAnimPaused;
      try { bgAnimSet(BGANIM_PAUSED_KEY, bgAnimPaused ? '1' : '0'); } catch (_) {}
      try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-paused', { detail: { paused: bgAnimPaused } })); } catch (_) {}
      syncBgAnimMenu();
      applyBgAnimPaused();
    });
  }
  document.addEventListener('wise:chat-bg-anim-paused', (e) => {
    bgAnimPaused = !!(e && e.detail && e.detail.paused);
    syncBgAnimMenu();
    applyBgAnimPaused();
  });
  /* Style segment (Helix / Ten / Orbit) — pick which ambient field runs. Persist +
     broadcast so every mounted chat swaps in lockstep; setStyle() hot-swaps a
     live field so the change is visible immediately without leaving the welcome. */
  document.addEventListener('wise:chat-bg-anim-style', (e) => {
    const s = e && e.detail && e.detail.style;
    if (!BGANIM_STYLES.includes(s)) return;
    bgAnim.setStyle(s);
    syncBgAnimMenu();
  });
  /* Sync the "Response streaming" controls — the master switch plus the
     three-level segment — to the shared streamOn/streamLevel. Called on mount
     and whenever any module changes either (via wise:chat-stream-on /
     wise:chat-stream-level), so every open chat's menu reflects the one shared
     setting. The segment dims while the master switch is off. */
  function syncStreamMenu() {
    const tog = menuSel('[data-sc="stream-toggle"]');
    if (tog) {
      tog.classList.toggle('is-on', streamOn);
      tog.setAttribute('aria-checked', streamOn ? 'true' : 'false');
    }
    const seg = menuSel('.sc-stream-detail:not(.sc-actside-detail)');
    if (seg) seg.classList.toggle('is-disabled', !streamOn);
    /* Scope to the streaming-level buttons only — the menu now carries other
       segmented controls (background-animation style, activity-strip side) that
       share the .sc-stream-seg-btn look, and a bare class match would wrongly
       clear their active state. */
    menuSelAll('[data-sc="stream-level"]').forEach((el) => {
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
  document.addEventListener('wise:chat-ollama-on', () => {
    syncOllamaMenu(document);
  });
  probeOllama().then(() => syncOllamaMenu(document));
  /* Sync the "Activity strip" switch + its Left/Right side segment to the
     shared state. Called on mount and whenever anything changes either (this
     menu, another chat's menu, or the Appearance popover — all via the
     wise:activity-strip event). The side segment dims while the strip is off. */
  function syncActivityStripMenu() {
    const item = menuSel('[data-sc="activity-strip"]');
    if (!item) return;
    const on = isActivityStripOn();
    item.classList.toggle('is-on', on);
    item.setAttribute('aria-checked', on ? 'true' : 'false');
    const detail = menuSel('.sc-actside-detail');
    if (detail) detail.classList.toggle('is-disabled', !on);
    const side = getActivityStripSide();
    menuSelAll('[data-sc="activity-strip-side"]').forEach((el) => {
      const active = el.dataset.actside === side;
      el.classList.toggle('is-on', active);
      el.setAttribute('aria-checked', active ? 'true' : 'false');
    });
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
    /* The transcript has advanced — bloom the welcome helix out (fade + expand),
       never collapse it with the chat column. The Helix playground keeps the
       strand running so sliders still have something to drive. */
    const first = !!(welcome && !welcome.classList.contains('sc-hidden'));
    if (opts.helixStudio !== true) bgAnim.stop();
    welcome?.classList.add('sc-hidden');
    /* A clicked intent chip starts a fresh turn, so drop any half-typed copy
       left in the composer — the placeholder returns so the input reads clean
       while the transcript animates in. (submit() already clears before this,
       so this only bites the chip/scorecard/sendIntent paths.) */
    if (input && input.value) input.value = '';
    if (persistChips) { rootEl.classList.add('sc-conversing'); requestAnimationFrame(refreshPersistChips); }
    if (first && typeof opts.onEngage === 'function') {
      try { opts.onEngage(); } catch (_) { /* host layout hook */ }
    }
  }
  function reset() {
    if (messages) messages.innerHTML = '';
    clearAttachments();
    closeAgents();
    detachInlineChips();
    /* A brand-new conversation returns to the session's own chips — not the
       follow-up subset a restored History thread may have swapped in. */
    intents = sessionIntents.slice();
    usedIntents.clear();
    skipAutoFollowups = false;
    clearThread();
    welcomeChipsExpanded = false;
    welcomeChipsExpanding = false;
    welcomeChipsCutoff = 0;
    welcomeChipsRevealing = false;
    renderChips();
    welcome?.classList.remove('sc-hidden', 'ws-in');
    if (welcome) welcome.style.display = '';
    rootEl.classList.remove('sc-conversing');
    /* Re-play the welcome reveal (heading + sub fade up, then chips fly in). */
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
    if (typeof opts.onReset === 'function') {
      try { opts.onReset(); } catch (_) { /* host layout hook */ }
    }
  }
  function submit() {
    if (!input) return;
    const v = input.value.trim();
    const atts = attachments.slice();
    if (!v && !atts.length) return;
    input.value = '';
    clearAttachments();
    /* Typing any distinctive word from an intent chip plays that chip's
       transcript — same routing (reply, reasoning trace, host onReply/onIntent)
       as clicking the chip. Attachments skip the shortcut so a file drop still
       goes through the generic review path. */
    const matched = v ? matchIntentFromText(v) : null;
    if (matched && !atts.length) {
      sendIntent(matched, v);
      return;
    }
    hideWelcome();
    addUser(v, atts);
    const noun = atts.length === 1 ? 'attachment' : 'attachments';
    const prompt = v || `Reviewing ${atts.length} ${noun}`;
    if (matched) {
      const handled = opts.onIntent ? opts.onIntent(matched, prompt) : false;
      markIntentUsed(matched);
      closeAgents();
      if (!handled) wiseaiRespond(prompt, matched);
      return;
    }
    closeAgents();
    wiseaiRespond(prompt);
  }
  /* Programmatically post a user message + WISEcodeAI reply (used by host modules
     to route a contextual question into the shared chat). */
  function ask(text) {
    const v = String(text || '').trim();
    if (!v) return;
    const matched = matchIntentFromText(v);
    if (matched) { sendIntent(matched, v); return; }
    closeAgents();
    hideWelcome();
    addUser(v);
    wiseaiRespond(v);
  }

  /* A keepWelcome chip changes the surface (Helix pose, a control) and
     stays on the welcome — no transcript, chip not spent, helix stays up. */
  function applyKeepWelcomeChip(defOrIntent, text) {
    const def = typeof defOrIntent === 'string'
      ? (intents.find((c) => c && c.intent === defOrIntent)
        || sessionIntents.find((c) => c && c.intent === defOrIntent)
        || intentCatalog.get(defOrIntent))
      : defOrIntent;
    if (!def || def.keepWelcome !== true) return false;
    const line = text || def.ask || def.label || '';
    if (typeof opts.onIntent === 'function') {
      try { opts.onIntent(def.intent, line); } catch (_) { /* host hook */ }
    }
    return true;
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
    if (intent === ASK_HELP_INTENT) openAskHelp();
    const found = intents.find((c) => c && c.intent === intent);
    const text = (label != null ? label : (found ? (found.ask || found.label) : '')) || String(intent);
    if (applyKeepWelcomeChip(found || intent, text)) return;
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
  function buildSeedTranscript(turns, baseTs) {
    return (turns || []).map((t, i) => {
      const ts = (baseTs || Date.now()) + i * 60000;
      if (t.role === 'you') {
        return `<div class="sc-line sc-line-you">${youChipHtml()}<div class="sc-line-body">${esc(t.text || '')}<div class="sc-line-meta">${timeStampHtml(ts)}</div></div></div>`;
      }
      const body = t.html != null ? t.html : esc(t.text || '');
      /* Seeded history turns are grounded too — fall back to a connected source
         so restored threads always carry a source, just like live answers. */
      let src = t.source !== undefined ? t.source : sourceLabel;
      if (src !== false && !src) src = pickSourceName();
      if (src === false) src = '';
      const fb = (feedbackEnabled && t.feedback !== false) ? feedbackRowHtml(ts) : '';
      const footer = `<div class="sc-line-meta">${
      src ? `<span class="sc-trust-chip" title="${esc(src)}"><span class="material-symbols-outlined">database</span>${esc(truncSourceName(src))}</span>` : ''
    }${fb ? '' : timeStampHtml(ts)}${fb}</div>`;
      return `<div class="sc-line sc-line-wiseai"><span class="sc-avatar sc-avatar-wiseai" role="img" aria-label="${esc(title)}">${OWL_BUG}</span><div class="sc-line-body">${body}${footer}</div></div>`;
    }).join('');
  }
  /* ── History restore: persist the transcript + park follow-up intents ────
     Selecting a saved thread must keep that conversation on screen (welcome
     stays hidden) AND offer the next possible intents for THAT chat — not the
     welcome's full chip set. Spent chips from the thread stay dimmed; leftover
     related prompts trail the last turn as inline chips. */
  const HISTORY_CONTROL = new Set([ASK_HELP_INTENT, 'choose_agents', 'connect_source']);
  const HISTORY_STOP = new Set(['the','and','for','with','this','that','from','what','whats','how','you','your','our','was','would','about','into','then','than','just','more','tell','show','make','made','best','least']);
  const HISTORY_WEAK = new Set(['food','foods','list','database','recipe','chart','report']);
  function historyTokens(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter((w) => w.length > 2 && !HISTORY_STOP.has(w));
  }
  function historyPlain(html) {
    try {
      const tmp = document.createElement('div');
      tmp.innerHTML = html || '';
      tmp.querySelectorAll('.sc-line-meta, .sc-fb-wrap, .sc-inline-chips').forEach((n) => n.remove());
      return (tmp.textContent || '').replace(/\s+/g, ' ').trim();
    } catch (_) { return ''; }
  }
  function historyUserLines(html) {
    try {
      const tmp = document.createElement('div');
      tmp.innerHTML = html || '';
      return Array.from(tmp.querySelectorAll('.sc-line-you')).map((n) => {
        const body = n.querySelector('.sc-line-body') || n;
        const clone = body.cloneNode(true);
        clone.querySelectorAll('.sc-line-meta').forEach((m) => m.remove());
        return (clone.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      }).filter(Boolean);
    } catch (_) { return []; }
  }
  function chipByIntentId(id) {
    if (!id) return null;
    return intentCatalog.get(id) || sessionIntents.find((c) => c && c.intent === id)
      || intents.find((c) => c && c.intent === id) || null;
  }
  function threadCtx() {
    return { intent: thread.intent, topic: thread.topic, userText: thread.userText, html: thread.html };
  }
  function clearThread() {
    thread = { intent: null, topic: null, userText: '', html: '' };
  }
  /* Generic follow-ups (compare / report / spider) keep talking about the
     previous subject instead of becoming a new topic of their own. */
  function intentCarriesTopic(intent) {
    if (!intent) return false;
    const chip = chipByIntentId(intent);
    if (chip && chip.carryTopic === true) return true;
    if (chip && chip.carryTopic === false) return false;
    if (typeof opts.carryTopic === 'function') {
      try { return !!opts.carryTopic(intent, chip); } catch (_) { return false; }
    }
    return intent === 'compare' || intent === 'report' || intent === 'spider';
  }
  function resolveTopic(intent) {
    if (intentCarriesTopic(intent) && thread.topic) return thread.topic;
    if (typeof opts.topicOf === 'function') {
      try {
        const t = opts.topicOf(intent, threadCtx());
        if (t) return t;
      } catch (_) { /* host hook */ }
    }
    return intent || thread.topic || null;
  }
  function rememberTurn(intent, userText, html) {
    thread = {
      intent: intent || null,
      topic: resolveTopic(intent),
      userText: userText || '',
      html: html || '',
    };
  }
  function cloneChip(c) {
    if (!c) return null;
    const out = Object.assign({}, c);
    if (Array.isArray(c.nextIntents)) out.nextIntents = c.nextIntents.slice();
    return out;
  }
  /* Rewrite a follow-up chip so its label/ask still read as a continuation of
     the turn that just landed (host supplies the copy via contextualizeChip). */
  function decorateChip(c) {
    const copy = cloneChip(c);
    if (!copy) return copy;
    if (typeof opts.contextualizeChip === 'function' && (thread.topic || thread.userText)) {
      try {
        const extra = opts.contextualizeChip(copy, threadCtx());
        if (extra && typeof extra === 'object') {
          if (extra.label) copy.label = extra.label;
          if (extra.ask) copy.ask = extra.ask;
        }
      } catch (_) { /* host hook */ }
    }
    return copy;
  }
  function decorateChips(list) {
    return (list || []).map(decorateChip).filter((c) => c && c.intent);
  }
  function inferUsedIntents(html) {
    const users = historyUserLines(html);
    const used = [];
    sessionIntents.forEach((c) => {
      if (!c || !c.intent || HISTORY_CONTROL.has(c.intent)) return;
      const ask = String(c.ask || c.label || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (!ask) return;
      if (users.some((t) => t === ask || t.includes(ask) || (t.length > 18 && ask.includes(t)))) used.push(c.intent);
    });
    return used;
  }
  function scoreChipAgainst(tokens, chip) {
    if (!chip) return 0;
    const words = historyTokens((chip.ask || '') + ' ' + (chip.label || '') + ' ' + (chip.intent || ''));
    let n = 0;
    let strong = false;
    words.forEach((w) => {
      if (!tokens.has(w)) return;
      if (HISTORY_WEAK.has(w)) n += 0.5;
      else { n += 1; strong = true; }
    });
    return strong ? n : 0;
  }
  /* Map a typed prompt onto an intent chip so sending "cookie" or "sprouts"
     plays that chip's transcript. Stop-words are ignored; any remaining word
     from a chip's label, ask, or intent id is enough to match, with longer
     phrase hits and intent-id hits winning ties. */
  function matchIntentFromText(text) {
    const raw = String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!raw) return null;
    const CONTROL = new Set([ASK_HELP_INTENT, 'choose_agents', 'connect_source']);
    const STOP = new Set([
      'the', 'and', 'for', 'with', 'this', 'that', 'from', 'what', 'whats', 'how',
      'you', 'your', 'our', 'was', 'would', 'about', 'into', 'then', 'than', 'just',
      'more', 'tell', 'show', 'make', 'made', 'me', 'a', 'an', 'of', 'in', 'on',
      'is', 'it', 'to', 'do', 'does', 'we', 'have', 'has', 'vs', 'by', 'or', 'as',
      'if', 'my', 'any', 'few', 'can', 'could', 'should', 'will', 'be', 'are', 'i',
      'im', 'at', 'up', 'out', 'so', 'not', 'no', 'yes', 'side', 'new',
    ]);
    const tokenize = (s) => String(s || '').toLowerCase()
      .replace(/[_/]+/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP.has(w));
    const query = tokenize(raw);
    if (!query.length) return null;
    const querySet = new Set(query);

    const chips = [];
    const seen = new Set();
    const add = (c) => {
      if (!c || !c.intent || CONTROL.has(c.intent) || seen.has(c.intent)) return;
      seen.add(c.intent);
      chips.push(c);
    };
    (intents || []).forEach(add);
    (sessionIntents || []).forEach(add);
    intentCatalog.forEach(add);

    /* A typed line that is (or contains) a chip's own ask/label is the
       strongest hit — play that transcript even if other chips share a word. */
    let phraseHit = null;
    let phraseLen = 0;
    chips.forEach((c) => {
      ['ask', 'label'].forEach((k) => {
        const phrase = String(c[k] || '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (phrase.length < 4) return;
        if (raw === phrase || raw.includes(phrase) || (raw.length >= 6 && phrase.includes(raw))) {
          if (phrase.length > phraseLen) { phraseLen = phrase.length; phraseHit = c.intent; }
        }
      });
    });
    if (phraseHit) return phraseHit;

    /* A typed question is not a chip just because they share a word
       ("chocolate" must not steal "can dogs eat chocolate"). Phrase
       matches above still play the written transcript. */
    if (/[?]|\b(why|how|can|could|should|is it|what|who|when|where|tell me|explain)\b/i.test(raw)) {
      return null;
    }

    const wordHit = (qw, cw) => {
      if (qw === cw) return qw.length >= 4 ? 3 : 2;
      if (qw.length >= 4 && cw.length >= 4 && (cw.startsWith(qw) || qw.startsWith(cw))) return 2;
      return 0;
    };

    let best = null;
    let bestScore = 0;
    chips.forEach((c) => {
      const words = tokenize(`${c.ask || ''} ${c.label || ''} ${String(c.intent || '').replace(/_/g, ' ')}`);
      let s = 0;
      query.forEach((qw) => {
        let local = 0;
        words.forEach((cw) => { local = Math.max(local, wordHit(qw, cw)); });
        s += local;
      });
      const id = String(c.intent || '').toLowerCase();
      if (querySet.has(id) || raw.split(/\s+/).includes(id)) s += 4;
      if (s > bestScore) { bestScore = s; best = c.intent; }
    });
    return bestScore > 0 ? best : null;
  }
  function resolveFollowupIntents(item, html, title) {
    const named = Array.isArray(item && item.nextIntents) ? item.nextIntents : null;
    if (named && named.length) {
      return named.map((n) => (n && typeof n === 'object') ? n : chipByIntentId(n))
        .filter((c) => c && c.intent && !HISTORY_CONTROL.has(c.intent) && !usedIntents.has(c.intent));
    }
    const corpus = historyTokens((title || '') + ' ' + historyPlain(html));
    const bag = new Set(corpus);
    return sessionIntents
      .filter((c) => c && c.intent && !HISTORY_CONTROL.has(c.intent) && !usedIntents.has(c.intent))
      .map((c) => ({ c, s: scoreChipAgainst(bag, c) }))
      .filter((x) => x.s >= 1)
      .sort((a, b) => b.s - a.s)
      .slice(0, 5)
      .map((x) => x.c);
  }
  /* Rule: every transcript ends on intent chips related to that thread's
     topic. Named nextIntents / opts.followups win; a curated in-flight set
     keeps its unused siblings; otherwise score the catalog against the
     live reply. Never leave the row empty. */
  function unusedTopicChips(list) {
    return (list || []).filter((c) => c && c.intent && !HISTORY_CONTROL.has(c.intent) && !usedIntents.has(c.intent));
  }
  function namedFollowupsFor(intent) {
    if (!intent) return null;
    const chip = chipByIntentId(intent);
    const raw = (chip && Array.isArray(chip.nextIntents) && chip.nextIntents.length)
      ? chip.nextIntents
      : (opts.followups && Array.isArray(opts.followups[intent]) ? opts.followups[intent] : null);
    if (!raw || !raw.length) return null;
    const resolved = raw.map((n) => (n && typeof n === 'object') ? n : chipByIntentId(n))
      .filter((c) => c && c.intent && !HISTORY_CONTROL.has(c.intent) && !usedIntents.has(c.intent));
    return resolved.length ? resolved : null;
  }
  function isSessionChipSet() {
    const ids = (list) => (list || [])
      .filter((c) => c && c.intent && !HISTORY_CONTROL.has(c.intent))
      .map((c) => c.intent).sort().join('\0');
    return ids(intents) === ids(sessionIntents);
  }
  function applyTopicFollowups(intent, html, title, item) {
    let named = null;
    if (item && Array.isArray(item.nextIntents) && item.nextIntents.length) {
      named = item.nextIntents.map((n) => (n && typeof n === 'object') ? n : chipByIntentId(n))
        .filter((c) => c && c.intent && !HISTORY_CONTROL.has(c.intent) && !usedIntents.has(c.intent));
      if (!named.length) named = null;
    }
    if (!named) named = namedFollowupsFor(intent);
    let next = named;
    if (!next && !isSessionChipSet()) {
      const leftover = unusedTopicChips(intents);
      if (leftover.length) next = leftover;
    }
    if (!next) {
      const live = ((messages && messages.innerHTML) || '') + ' ' + (html || '');
      const follow = resolveFollowupIntents(null, live, title || '');
      next = follow.length ? follow : unusedTopicChips(sessionIntents).slice(0, 5);
    }
    if (!next || !next.length) {
      next = unusedTopicChips(intents).slice(0, 5);
    }
    if (!next.length) {
      intentCatalog.forEach((c) => {
        if (c && c.intent && !HISTORY_CONTROL.has(c.intent) && !usedIntents.has(c.intent) && next.length < 5) next.push(c);
      });
    }
    /* Clone + rewrite so a generic follow-up ("Compare", "Report") still
       names the subject of the turn that just landed. */
    next = decorateChips(next);
    intents = withAskHelpChip(next);
    catalogize(intents);
    catalogizeNext(intents);
    renderChips();
    skipAutoFollowups = true;
  }
  function applyHistoryRestore(item) {
    item = item || {};
    const html = (messages && messages.innerHTML) || item.html || '';
    usedIntents.clear();
    const savedUsed = Array.isArray(item.usedIntents) && item.usedIntents.length
      ? item.usedIntents
      : inferUsedIntents(html);
    savedUsed.forEach((id) => { if (id && id !== ASK_HELP_INTENT) usedIntents.add(id); });
    /* Restore the conversation topic from the last specific (non-carry) intent
       so a follow-up chip on a restored thread still continues that subject. */
    let topicId = savedUsed.length ? savedUsed[savedUsed.length - 1] : null;
    for (let i = savedUsed.length - 1; i >= 0; i--) {
      if (!intentCarriesTopic(savedUsed[i])) { topicId = savedUsed[i]; break; }
    }
    let topic = topicId;
    if (typeof opts.topicOf === 'function' && topicId) {
      try { topic = opts.topicOf(topicId, {}) || topicId; } catch (_) { topic = topicId; }
    }
    const lastUser = historyUserLines(html);
    thread = {
      intent: savedUsed.length ? savedUsed[savedUsed.length - 1] : topicId,
      topic: topic || null,
      userText: lastUser.length ? lastUser[lastUser.length - 1] : (item.title || ''),
      html,
    };
    applyTopicFollowups(null, html, item.title || '', item);
    parkInlineChips(true);
    if (ichipsEl && !prefersReducedMotion) {
      const chips = Array.from(ichipsEl.children);
      chips.forEach(primeRevealFromRight);
      revealStaggered(chips, 110, 55, scrollToEnd);
    } else {
      scrollToEnd();
    }
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
        /* A currently-streaming conversation: the row shows a pulsing live dot
           and streams `streamLines` one at a time (several chats can run at
           once). */
        live: conv.live === true,
        streamLines: Array.isArray(conv.streamLines) ? conv.streamLines : null,
        usedIntents: Array.isArray(conv.usedIntents) ? conv.usedIntents.slice() : null,
        nextIntents: Array.isArray(conv.nextIntents) ? conv.nextIntents.slice() : null,
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
      /* Sticky History is OFF on load except pages/wiseai.html, which passes
         historyBreakoutHidden: false. Unset (and true) stay tucked; the
         three-dot "History & Projects" switch reveals the drawer. */
      breakoutStartHidden: opts.historyBreakoutHidden !== false,
      mcpFilter: opts.historyMcpFilter === true,
      onNew: () => reset(),
      /* Persist the restored transcript and park follow-up intents for that
         thread; keep a broken-out Turns module in sync. */
      onRestore: (item) => { applyHistoryRestore(item); refreshDockedTurns(); },
      getMeta: () => ({
        usedIntents: Array.from(usedIntents),
        nextIntents: intents
          .filter((c) => c && c.intent && !HISTORY_CONTROL.has(c.intent) && !usedIntents.has(c.intent))
          .map((c) => c.intent),
      }),
      stripSelectors: ['.sc-inline-chips', '.sc-line-typing', '.sc-line-trace'],
      setHTML: (html) => {
        messages.innerHTML = html || '';
        hoistFeedbackTimes(messages);
        /* Retire the welcome-only DNA/RNA helix field the same way hideWelcome()
           does — otherwise restoring a saved thread leaves `sc-bganim-live` on
           the host and the animated background bleeds through behind the restored
           transcript (it only draws while the welcome is up, but nothing stops it
           on this path). */
        bgAnim.stop({ immediate: true });
        welcome?.classList.add('sc-hidden');
        if (welcome) welcome.style.display = '';
        closeAgents();
        rootEl.classList.add('sc-conversing');
        if (persistChips) { requestAnimationFrame(refreshPersistChips); }
        scrollToEnd();
        refreshDockedTurns();
      },
    });
    if (chatHistory && !window.__wiseChatHistory) window.__wiseChatHistory = chatHistory;
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
    /* "Show more" / "Show less" toggles the two-row cap — not an intent. */
    const more = e.target.closest('[data-chip-more]');
    if (more && welcome.contains(more)) {
      e.preventDefault();
      if (welcomeChipsExpanded) collapseWelcomeChips(more);
      else expandWelcomeChips(more);
      return;
    }
    const chip = e.target.closest('.ws-intent-chip[data-intent]');
    if (!chip) return;
    /* A spent chip is inert — it already drove its turn and can't be re-run. */
    if (chip.classList.contains('is-used')) return;
    const def = intents[Number(chip.dataset.intent)];
    if (!def) return;
    /* A chip can carry an `ask` — the full question posted as the user's line —
       while its face keeps the shorter label (same contract as scorecards). */
    const text = def.ask || def.label;
    if (applyKeepWelcomeChip(def, text)) return;
    const handled = opts.onIntent ? opts.onIntent(def.intent, text) : false;
    /* "Choose Agents" opens the in-chat settings panel rather than starting a
       chat turn — it's a control, not a question. */
    if (def.intent === 'choose_agents') { openAgents(); return; }
    if (def.intent === ASK_HELP_INTENT) openAskHelp();
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
    if (def.intent === ASK_HELP_INTENT) openAskHelp();
    const text = def.ask || def.label;
    if (applyKeepWelcomeChip(def, text)) return;
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
  /* Web-grounded replies reuse the same superscript cites + References list
     as scripted answers. A data-web-ref row opens that source. */
  function openWebRef(el) {
    const raw = el && el.getAttribute && el.getAttribute('data-web-ref');
    if (!raw || !/^https:\/\//i.test(raw)) return;
    try { window.open(raw, '_blank', 'noopener,noreferrer'); } catch (_) { /* popup */ }
  }
  messages?.addEventListener('click', (e) => {
    const hit = e.target.closest('[data-web-ref]');
    if (!hit || !messages.contains(hit)) return;
    e.preventDefault();
    openWebRef(hit);
  });
  messages?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const hit = e.target.closest('[data-web-ref]');
    if (!hit || !messages.contains(hit)) return;
    e.preventDefault();
    openWebRef(hit);
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
  /* Commit a thumbs verdict INTO the transcript rather than flashing a floating
     "thanks": echo the user's pick (verdict + any reason chips + free-form note)
     as a user line, then have WISEcodeAI reply in-thread with a message tailored
     to WHY they flagged (or praised) it — so the whole thing reads like a real
     chat turn that closes with the acknowledgement. */
  function commitFeedback(kind, labels, reasonKeys, note) {
    const verdict = kind === 'up'
      ? 'This answer was helpful.'
      : 'This answer wasn\u2019t quite right.';
    let summary = verdict;
    if (labels.length) summary += ` (${labels.join(', ')})`;
    if (note) summary += ` \u2014 \u201c${note}\u201d`;
    addUser(summary);
    const replies = FEEDBACK_REPLIES[kind] || {};
    const hitKey = (reasonKeys || []).find((k) => replies[k]);
    let reply = replies[hitKey] || replies._default || '';
    if (note) reply += ' Thanks for the extra detail — it makes the next pass sharper.';
    const typing = showTyping('Reviewing your feedback');
    const wait = prefersReducedMotion ? 260 : 620 + Math.random() * 520;
    setTimeout(() => {
      if (typing) typing.remove();
      addWISEcodeAI(reply, { source: '', feedback: false });
    }, wait);
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
  function onFbClick(e) {
    const moreBtn = e.target.closest('.sc-fb-more');
    if (moreBtn) {
      const wrap = moreBtn.closest('.sc-fb-more-wrap');
      const menu = menuOfWrap(wrap);
      const willOpen = !!menu && menu.hidden;
      /* Only one three-dot menu open at a time across the transcript. */
      closeMoreMenus();
      if (menu) {
        wrap._fbMenu = menu;
        menu.__fbWrap = wrap;
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
      const wrap = fbWrapOf(fbBtn);
      const line = fbLineOf(fbBtn);
      if (!wrap || !line) return;
      const verdict = fbBtn.getAttribute('data-fb');
      if (verdict === 'copy') { copyAnswer(line, fbBtn); return; }
      if (verdict === 'turn') { forkFromLine(line); return; }
      if (verdict === 'replay') { rerunFromLine(line, true); return; }
      if (verdict === 'edit') { rerunFromLine(line, false); return; }
      if (verdict === 'file') {
        const moreBtn = wrap.querySelector('.sc-fb-more');
        closeMoreMenus();
        fileConversationToLibrary({
          chatHistory,
          messagesEl: messages,
          historyKey: opts.historyKey || 'wise-wiseai-chat-history',
          trigger: moreBtn || fbBtn,
          tipTarget: moreBtn || fbBtn,
          preferAbove: true,
          markOpen: false,
        });
        return;
      }
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
      const wrap = fbWrapOf(sendBtn);
      const pop = sendBtn.closest('.sc-fb-reasons');
      if (!wrap || !pop) return;
      const kind = sendBtn.getAttribute('data-fb-send');
      const input = pop.querySelector('.sc-fb-input');
      const text = input ? input.value.trim() : '';
      const chosen = Array.from(pop.querySelectorAll('.sc-fb-reason.is-on'));
      const labels = chosen.map((c) => (c.textContent || '').trim()).filter(Boolean);
      const reasonKeys = chosen.map((c) => c.getAttribute('data-reason'));
      if (input) input.value = '';
      chosen.forEach((c) => c.classList.remove('is-on'));
      pop.hidden = true;
      const btn = wrap.querySelector(`[data-fb="${kind}"]`);
      if (btn) btn.setAttribute('aria-expanded', 'false');
      /* Any lingering inline note is cleared — the acknowledgement now lands as
         a proper WISEcodeAI reply in the transcript instead. */
      fbNote(wrap, '', '');
      commitFeedback(kind, labels, reasonKeys, text);
      if (typeof opts.onFeedback === 'function') opts.onFeedback(kind, { note: text, reasons: reasonKeys });
      return;
    }
    const reason = e.target.closest('.sc-fb-reason');
    if (reason) {
      const pop = reason.closest('.sc-fb-reasons');
      if (!pop) return;
      /* Selection only — the transcript entry and WISEcodeAI's tailored reply
         are posted when the user hits Send, so it reads like a real chat turn
         instead of a lone "thanks" popping in the moment a chip is tapped. */
      reason.classList.toggle('is-on');
    }
  }
  messages?.addEventListener('click', onFbClick);

  /* Dismiss any open reason pop-over on an outside click or Escape, so it
     behaves like a proper floating menu instead of a pinned inline panel. */
  function closeReasonPopovers() {
    document.querySelectorAll('.sc-fb-reasons:not([hidden])').forEach((pop) => {
      pop.hidden = true;
      const host = pop.closest('.sc-fb-down-wrap, .sc-fb-up-wrap') || pop.__plHost;
      const btn = host?.querySelector('.sc-fb-btn');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  }
  /* Collapse any open three-dot (turn controls) menu. */
  function menuOfWrap(wrap) {
    if (!wrap) return null;
    if (wrap._fbMenu && wrap._fbMenu.isConnected) return wrap._fbMenu;
    const m = wrap.querySelector('.sc-fb-menu');
    if (m) wrap._fbMenu = m;
    return m || null;
  }
  function wrapOfMenu(menu) {
    return (menu && (menu.closest('.sc-fb-more-wrap') || menu.__fbWrap || menu.__plHost)) || null;
  }
  /* Resolve the feedback wrap / transcript line for a control that may have
     been portaled onto <body> (js/popover-layer.js lifts `.sc-fb-menu` and
     `.sc-fb-reasons` while they're open). Walk the portal host, not the live
     parent, so replay / edit / fork / turn-id / reason chips still know which
     turn they belong to. */
  function fbWrapOf(node) {
    if (!node || !node.closest) return null;
    const direct = node.closest('.sc-fb-wrap');
    if (direct) return direct;
    const menu = node.closest('.sc-fb-menu');
    if (menu) {
      const more = wrapOfMenu(menu);
      return more ? more.closest('.sc-fb-wrap') : null;
    }
    const reasons = node.closest('.sc-fb-reasons');
    if (reasons) {
      const host = reasons.closest('.sc-fb-down-wrap, .sc-fb-up-wrap') || reasons.__plHost;
      return host ? host.closest('.sc-fb-wrap') : null;
    }
    return null;
  }
  function fbLineOf(node) {
    if (!node || !node.closest) return null;
    const line = node.closest('.sc-line');
    if (line) return line;
    const wrap = fbWrapOf(node);
    return wrap ? wrap.closest('.sc-line') : null;
  }
  function isThisChatFb(node) {
    if (!messages) return false;
    const wrap = fbWrapOf(node);
    return !!(wrap && messages.contains(wrap));
  }
  function isMoreUi(node) {
    return !!(node && node.closest && node.closest('.sc-fb-more-wrap, .sc-fb-menu'));
  }
  function closeMoreMenus() {
    document.querySelectorAll('.sc-fb-menu:not([hidden])').forEach((menu) => {
      menu.hidden = true;
      const btn = wrapOfMenu(menu)?.querySelector('.sc-fb-more');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  }
  document.addEventListener('click', (e) => {
    /* Replay / edit / fork / file / turn-id live inside `.sc-fb-menu`, which
       portals onto <body> while open — a listener on `messages` never sees
       those clicks. Route them through the same handler, scoped to this chat. */
    const portaled = e.target.closest('.sc-fb-menu, .sc-fb-reasons');
    if (portaled && messages && !messages.contains(portaled) && isThisChatFb(e.target)) {
      onFbClick(e);
    }
    if (!e.target.closest('.sc-fb-down-wrap, .sc-fb-up-wrap, .sc-fb-reasons')) closeReasonPopovers();
    /* Leave the menu open while interacting inside it (copy turn ID, etc.); a
       click that lands on the trigger is handled by its own toggle above. */
    if (!e.target.closest('.sc-fb-more-wrap, .sc-fb-menu, .lib-pop')) closeMoreMenus();
  });
  /* Hover-reveal for the three-dot menu — the turn controls spill open as
     soon as the pointer lands on the "more" control (no tooltip, no click
     needed). A short close delay bridges the small gap between the trigger
     and the floating menu so moving into it never flickers it shut.
     The menu portals to <body> while open (js/popover-layer.js), so hover
     tracking has to recognize both the wrap and the detached menu. */
  let scMoreCloseTimer = null;
  document.addEventListener('mouseover', (e) => {
    if (!isMoreUi(e.target)) return;
    clearTimeout(scMoreCloseTimer);
    const wrap = e.target.closest('.sc-fb-more-wrap') || wrapOfMenu(e.target.closest('.sc-fb-menu'));
    if (!wrap || (messages && !messages.contains(wrap))) return;
    const menu = menuOfWrap(wrap);
    if (menu && menu.hidden) {
      closeMoreMenus();
      wrap._fbMenu = menu;
      menu.__fbWrap = wrap;
      menu.hidden = false;
      const btn = wrap.querySelector('.sc-fb-more');
      if (btn) btn.setAttribute('aria-expanded', 'true');
    }
  });
  document.addEventListener('mouseout', (e) => {
    if (!isMoreUi(e.target) || isMoreUi(e.relatedTarget)) return;
    clearTimeout(scMoreCloseTimer);
    scMoreCloseTimer = setTimeout(closeMoreMenus, 180);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeReasonPopovers(); closeMoreMenus(); }
  });

  /* Answer-action hover labels are the shared #lir-tooltip. wireAnswerTips()
     only mounts the flash toast used after copying a turn ID. */

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
    if (def.intent === ASK_HELP_INTENT) openAskHelp();
    const text = def.ask || def.label;
    if (applyKeepWelcomeChip(def, text)) return;
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

  /* Intent chips always render as a wrapped flex grid now — the chevron
     carousel is retired. Welcome chips clamp to two rows with a trailing
     "Show more" chip; overflow is revealed on tap, inline after it. */

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
  /* First keystroke leaves the full-width welcome; clearing the field while
     the welcome is still up restores it. Hosts (wiseai.html) use these to
     collapse / expand the chat to its single column. Idempotent on the host. */
  input?.addEventListener('input', () => {
    const typed = !!(input.value && input.value.trim());
    const welcomeUp = !!(welcome && !welcome.classList.contains('sc-hidden'));
    if (opts.helixStudio !== true) {
      if (typed) bgAnim.stop();
      else if (welcomeUp) bgAnim.start();
    }
    if (typed && typeof opts.onEngage === 'function') {
      try { opts.onEngage(); } catch (_) { /* host layout hook */ }
    } else if (!typed && welcomeUp && typeof opts.onDisengage === 'function') {
      try { opts.onDisengage(); } catch (_) { /* host layout hook */ }
    }
  });

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
    /* Reflow the flat menu into titled group cards on first open — deferred
       to here so every row that other mount code injects (history, connectors,
       intent toggles) already exists and is bucketed. Moves the existing
       nodes, so all wiring keeps working; idempotent, so subsequent opens
       are a no-op. */
    if (open) groupifyChatMenu(morePop);
    morePop.classList.toggle('hidden', !open);
    moreBtn.classList.toggle('is-open', open);
    moreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      syncHistoryMenu();
      probeOllama().then(() => syncOllamaMenu(document));
      scheduleGroupedChatMenuPlace(morePop);
    }
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
     modules). Width is the canonical five-tier cycle: 0 single, 1 double,
     2 triple, 3 fill, 4 custom. Custom keeps the current width until dragged. */
  const SC_WIDTH_ICONS = ['width_normal', 'width_wide', 'width_wide', 'width_full', 'fit_width'];
  const SC_WIDTH_TITLES = [
    'Width (single) — tap to widen',
    'Width (double) — tap to widen',
    'Width (triple) — tap to widen',
    'Width (fill) — tap to widen',
    'Width (custom) — drag to any size',
  ];
  const scTierOf = (v) => {
    if (window.WPaneWidth) return window.WPaneWidth.clamp(v);
    return v === true ? 1 : typeof v === 'number' ? Math.max(0, Math.min(4, v | 0)) : 0;
  };
  const defaultChatTier = () => {
    if (window.WPaneWidth && typeof window.WPaneWidth.defaultChatTier === 'function') {
      return window.WPaneWidth.defaultChatTier();
    }
    if (typeof window.wiseDefaultChatTier === 'function') return window.wiseDefaultChatTier();
    return (((window.screen && +window.screen.width) || window.innerWidth || 0) > 1512) ? 1 : 0;
  };
  const syncWidthUI = (tier) => {
    tier = scTierOf(tier);
    const W = window.WPaneWidth;
    if (W && W.applyClasses) W.applyClasses(rootEl, tier, 'panel');
    else {
      rootEl.classList.toggle('panel-wide', tier >= 1 && tier < 4);
      rootEl.classList.toggle('panel-triple', tier >= 2 && tier < 4);
      rootEl.classList.toggle('panel-fill', tier === 3);
      rootEl.classList.toggle('panel-custom', tier === 4);
    }
    if (tier < 1) document.documentElement.classList.remove('chat-default-double');
    const btn = rootEl.querySelector('.panel-width-toggle-btn');
    if (btn) {
      if (W && W.syncButton) W.syncButton(btn, tier);
      else {
        btn.classList.toggle('is-on', tier >= 1);
        btn.setAttribute('aria-pressed', tier >= 1 ? 'true' : 'false');
        btn.title = SC_WIDTH_TITLES[tier];
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = SC_WIDTH_ICONS[tier];
      }
    }
    /* When the field's opacity is still on its pane-count default, a width change
       re-tunes it (single/double → 30%, wider → 65%): refresh the slider readout
       and repaint any reduced-motion still frame (the live rAF loop self-updates). */
    if (!bgAnimOpacityUserSet) {
      syncBgAnimMenu();
      if (prefersReducedMotion && bgAnimOn && (rootEl.classList.contains('sc-bganim-live') || rootEl.classList.contains('sc-orbit-live'))) bgAnim.start();
    }
    /* Pane width changes the chip grid's measure — re-clamp while collapsed so
       Show more stays on row 2 (expanded stays fully open). */
    requestAnimationFrame(() => clampWelcomeChips());
  };
  rootEl.addEventListener('click', (e) => {
    const widthToggle = e.target.closest('.panel-width-toggle-btn');
    if (!widthToggle || !rootEl.contains(widthToggle)) return;
    e.stopPropagation();
    const W = window.WPaneWidth;
    const cur = W ? W.tierOfEl(rootEl) : (rootEl.classList.contains('panel-custom') ? 4 : rootEl.classList.contains('panel-fill') ? 3 : rootEl.classList.contains('panel-triple') ? 2 : rootEl.classList.contains('panel-wide') ? 1 : 0);
    const next = W ? W.next(cur) : (cur + 1) % 5;
    syncWidthUI(next);
    if (typeof opts.onToggleWidth === 'function') opts.onToggleWidth(next);
  });
  /* Load at the screen default (single on laptop-class ≤1512 CSS px, double
     when wider). In-session cycling is unchanged; the next navigation reapplies
     this default rather than restoring the last toggle. */
  (function applyDefaultChatWidth() {
    const initial = defaultChatTier();
    syncWidthUI(initial);
    if (initial && typeof opts.onToggleWidth === 'function') opts.onToggleWidth(initial);
  })();

  /* "What can I ask?" link (below-input, left) — opens the in-chat help panel
     (break-out-able as a sticky module). The gold chip still also posts a
     page-specific transcript listing. */
  const askHelpBtn = rootEl.querySelector(`#${id}-ask-help`);
  askHelpBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    openAskHelp();
  });

  /* Keep "What can I ask?" left-aligned with the composer's placeholder,
     whatever the composer layout or module width (shared — see alignAskHelp). */
  alignAskHelp(rootEl);

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

  /* The in-input trigger label naming the active database (currentDbId itself
     is declared up by pickSourceName, which needs it before this wiring runs). */
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
    const tid = makeTurnId();
    const body = prev
      ? `<span class="sc-event-label">Switched database from</span> <strong>${esc(prev.name)}</strong> to <strong>${esc(next.name)}</strong>`
      : `<span class="sc-event-label">Set database to</span> <strong>${esc(next.name)}</strong>`;
    messages.insertAdjacentHTML('beforeend',
      `<div class="sc-line sc-line-you sc-line-event" data-activity="database" role="note" aria-label="${esc(prev ? `Switched database to ${next.name}` : `Set database to ${next.name}`)}">`
      + youChipHtml()
      + `<div class="sc-line-body">${body}<div class="sc-line-meta">${timeStampHtml()}<span class="sc-fb-id" data-tip="Turn ID" tabindex="0">#${esc(tid)}</span></div></div>`
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
          '<button type="button" class="panel-width-toggle-btn fl-db-undock" aria-label="Merge databases back into the popover"><span class="material-symbols-outlined">close</span></button>' +
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

  /* Menu + chip actions.
     Bound on document (not rootEl) because the three-dot menu and the attach
     popover portal to <body> while open. A rootEl listener would never see
     those clicks. Scope with contains() so a second mounted chat doesn't
     steal this instance's rows. */
  document.addEventListener('click', (e) => {
    const item = e.target.closest('[data-sc]');
    if (!item) return;
    const flPopEl = document.getElementById(`${id}-fl-pop`);
    const helixFloat = helixFloatForPop(morePop);
    const ours = rootEl.contains(item) || morePop?.contains(item) || flPopEl?.contains(item) || helixFloat?.contains(item);
    if (!ours) return;
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
    else if (action === 'sheen') {
      /* App-wide input glow: flip the shared <html>.chat-sheen-off class so every
         mounted composer shows/hides its sheen stroke at once. Keep the menu open
         so the switch state reads back; persist + broadcast so any sibling chat
         modules' switches follow. */
      const on = document.documentElement.classList.contains('chat-sheen-off');
      document.documentElement.classList.toggle('chat-sheen-off', !on);
      try { localStorage.setItem(SHEEN_PREF_KEY, on ? '1' : '0'); } catch (_) {}
      try { document.dispatchEvent(new CustomEvent('wise:chat-sheen', { detail: { on } })); } catch (_) {}
      syncSheenMenu();
    }
    else if (action === 'bg-anim') {
      /* Admin-only ambient backdrop for the welcome state. Flip the shared pref,
         persist + broadcast it; the wise:chat-bg-anim listener does the actual
         switch sync + start/stop (here and on every sibling chat). Keep the menu
         open so the pink switch reads back its new state. */
      bgAnimOn = !bgAnimOn;
      try { bgAnimSet(BGANIM_PREF_KEY, bgAnimOn ? '1' : '0'); } catch (_) {}
      try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim', { detail: { on: bgAnimOn } })); } catch (_) {}
    }
    else if (action === 'bg-anim-style') {
      /* Pick the ambient field's style (helix · helix-ten · orbit). Keep the menu
         open so the segment selection reads back immediately; persist + broadcast
         so the wise:chat-bg-anim-style listener swaps the live field here and on
         every sibling chat. */
      const s = item.dataset.style;
      if (BGANIM_STYLES.includes(s)) {
        if (s !== bgAnimStyle) {
          try { bgAnimSet(BGANIM_STYLE_KEY, s); } catch (_) {}
          try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-style', { detail: { style: s } })); } catch (_) {}
        }
        /* Picking a style is also the one-tap way to SEE it: if the field was
           off, turn it on now so choosing "Orbit" (or "Helix" / "Ten") isn't a dead
           control. Broadcast so every sibling chat + this menu's switch follow. */
        if (!bgAnimOn) {
          bgAnimOn = true;
          try { bgAnimSet(BGANIM_PREF_KEY, '1'); } catch (_) {}
          try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim', { detail: { on: true } })); } catch (_) {}
        }
      }
    }
    else if (action === 'bg-anim-dots-motion') {
      /* Wired by wireBgAnimDotsChrome — keep the menu open so the segment reads back. */
    }
    else if (action === 'bg-anim-spin') {
      /* Wired by wireBgAnimSpinChrome — keep the menu open so the segment reads back. */
    }
    else if (action === 'bg-anim-look') {
      /* Wired by wireBgAnimLookChrome — keep the menu open so the segment reads back. */
    }
    else if (action === 'bg-anim-snap' || action === 'bg-anim-snap-save') {
      /* Wired by wireBgAnimSnapshotsChrome — keep the menu open so the chips read back. */
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
    else if (action === 'ollama-toggle') {
      /* Local reading: rewrite answers on this Mac so they read more
         clearly. Keep the menu open so the switch reads back; persist +
         broadcast so every chat module follows. */
      toggleOllamaOn();
      syncOllamaMenu(document);
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
    else if (action === 'activity-strip-side') {
      /* Pick which edge the rail pins to (left = default, right = opt-in).
         Keep the menu open so the segment selection reads back immediately;
         setActivityStripSide persists the choice and broadcasts
         wise:activity-strip so every open menu follows. */
      setActivityStripSide(item.dataset.actside);
      syncActivityStripMenu();
    }
    else if (action === 'toggle-cards') {
      /* Switch row — keep the menu open so the flipped state reads back. */
      cardsHidden = !cardsHidden;
      try { localStorage.setItem(CHIPS_PREF_KEY, cardsHidden ? '1' : '0'); } catch (_) {}
      syncCards();
    }
    else if (action === 'toggle-intent-chips') {
      /* Switch row — keep the menu open so the flipped state reads back.
         Session-only: the chips come back ON at the next load by design. */
      chipsHidden = !chipsHidden;
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
    } else if (action === 'file-library') {
      /* History already saves the thread; this copies it onto the Library shelf.
         Folder pick expands inside this Conversation card — do not close. */
      fileConversationToLibrary({
        chatHistory,
        messagesEl: messages,
        historyKey: opts.historyKey || 'wise-wiseai-chat-history',
        trigger: item,
        tipTarget: moreBtn,
        menu: morePop,
        onFiled: closeMore,
      });
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
  /* Cap the welcome chip grid at two wrapping rows. Chips that would fall on
     row 3+ stay in the DOM (so renderChips can rebuild freely) but are hidden;
     a trailing "Show more" chip takes the last slot on row 2 and reveals them
     inline after it (wrapping onto the next row when the current one is full).
     Measurement is layout-based — chip labels vary in width, so a fixed count
     would leave uneven rows. */
  function welcomeChipRowCount(els) {
    const tops = [];
    els.forEach((el) => {
      if (!el || el.hidden) return;
      const t = el.offsetTop;
      if (!tops.some((rt) => Math.abs(rt - t) < 2)) tops.push(t);
    });
    return tops.length;
  }
  function paintMoreBtn(btn, expanded) {
    if (!btn) return;
    const icon = btn.querySelector('.material-symbols-outlined');
    const label = expanded ? 'Show less' : 'Show more';
    btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    btn.setAttribute('aria-label', expanded ? 'Show fewer intents' : 'Show more intents');
    btn.removeAttribute('aria-hidden');
    btn.style.pointerEvents = '';
    if (icon) icon.textContent = expanded ? 'chevron_left' : 'chevron_right';
    const textNode = Array.from(btn.childNodes).find((n) => n.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.textContent = label;
    else if (icon) btn.insertBefore(document.createTextNode(label), icon);
    else btn.insertBefore(document.createTextNode(label), btn.firstChild);
  }
  function ensureMoreBtn(wrap, holdPrime) {
    let moreBtn = wrap.querySelector('[data-chip-more]');
    if (!moreBtn) {
      wrap.insertAdjacentHTML('beforeend',
        `<button type="button" class="chip chip-primary ws-intent-chip--more" data-chip-more aria-expanded="false" aria-label="Show more intents">Show more<span class="material-symbols-outlined" aria-hidden="true">chevron_right</span></button>`);
      moreBtn = wrap.querySelector('[data-chip-more]');
      if (moreBtn && holdPrime) primeRevealFromRight(moreBtn);
    }
    return moreBtn;
  }
  function placeMoreBtnAfter(moreBtn, afterChip, wrap) {
    if (!moreBtn) return;
    if (afterChip) {
      if (afterChip.nextSibling !== moreBtn) afterChip.after(moreBtn);
    } else if (wrap && wrap.firstChild !== moreBtn) {
      wrap.insertBefore(moreBtn, wrap.firstChild);
    }
  }
  function clampWelcomeChips() {
    const wrap = rootEl.querySelector(`#${id}-chips`);
    if (!wrap) return;
    /* Don't interrupt a Show-more fly-in mid-cascade. */
    if (welcomeChipsExpanding) return;
    /* Reuse the Show more node when present — destroying it on every re-clamp
       (width toggle, ResizeObserver) drops its primed fly-in styles and leaves
       a brand-new chip sitting fully opaque while the others animate. */
    let moreBtn = wrap.querySelector('[data-chip-more]');
    if (moreBtn) moreBtn.hidden = true;
    const chips = Array.from(wrap.querySelectorAll('.ws-intent-chip:not([data-chip-more])'));
    /* The last chip before Show more sits on the two-row cutoff. Un-hiding
       it at full opacity while the rest are still primed (opacity 0) is why
       that boundary chip "showed up first". Keep every chip invisible when
       the welcome is mid-reveal, or when any sibling is already held back. */
    const holdPrime = welcomeChipsRevealing || chips.some((c) => c.style.opacity === '0')
      || (moreBtn && moreBtn.style.opacity === '0');
    chips.forEach((c) => {
      c.hidden = false;
      if (holdPrime) primeRevealFromRight(c);
    });
    if (moreBtn && holdPrime) primeRevealFromRight(moreBtn);
    if (!chips.length) {
      moreBtn?.remove();
      return;
    }
    /* Expanded: keep the same chip parked at its original slot and leave
       overflow visible after it. Recreate it after a re-render so it cannot
       jump to the end of the row. */
    if (welcomeChipsExpanded) {
      moreBtn = moreBtn || ensureMoreBtn(wrap, holdPrime);
      const cut = Math.max(0, Math.min(welcomeChipsCutoff, chips.length));
      placeMoreBtnAfter(moreBtn, cut ? chips[cut - 1] : null, wrap);
      if (moreBtn) {
        moreBtn.hidden = false;
        paintMoreBtn(moreBtn, true);
      }
      return;
    }
    /* Welcome is off-screen (conversation underway) — skip measurement; the
       next revealWelcome / reset will clamp again once the grid is visible. */
    if (welcome && welcome.classList.contains('sc-hidden')) {
      moreBtn?.remove();
      return;
    }
    if (wrap.clientWidth < 8) {
      moreBtn?.remove();
      return;
    }
    if (welcomeChipRowCount(chips) <= WELCOME_CHIP_MAX_ROWS) {
      moreBtn?.remove();
      welcomeChipsCutoff = chips.length;
      return;
    }

    moreBtn = moreBtn || ensureMoreBtn(wrap, holdPrime);
    if (!moreBtn) return;
    /* Park at the end so the binary search measures a trailing control —
       leftover placement from a prior expand would sit mid-list. */
    wrap.appendChild(moreBtn);
    moreBtn.hidden = false;
    paintMoreBtn(moreBtn, false);

    /* Binary search the largest prefix of chips that, together with Show more,
       still fits in two rows. Showing chips[0..n) keeps list order stable. */
    let lo = 0;
    let hi = chips.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      chips.forEach((c, i) => { c.hidden = i >= mid; });
      void wrap.offsetHeight;
      const visible = chips.filter((c) => !c.hidden).concat(moreBtn);
      if (welcomeChipRowCount(visible) <= WELCOME_CHIP_MAX_ROWS) lo = mid;
      else hi = mid - 1;
    }
    chips.forEach((c, i) => { c.hidden = i >= lo; });
    /* Everything already fits alongside Show more — drop the control and show
       the full set (Show more would be a no-op). */
    if (lo >= chips.length) {
      moreBtn.remove();
      chips.forEach((c) => { c.hidden = false; });
      welcomeChipsCutoff = chips.length;
      return;
    }
    welcomeChipsCutoff = lo;
    placeMoreBtnAfter(moreBtn, chips[lo - 1], wrap);
  }
  /* Welcome is bottom-anchored (`justify-content: safe flex-end`). Un-hiding
     overflow chips grows the stack and the heading / existing chips jump to
     their new slots — or `safe` snaps the whole stack to the top once it
     overflows. FLIP the blocks that sit before the new chips so they slide
     to the new layout instead of appearing there. */
  const WELCOME_CHIP_LAYOUT_MS = 340;
  const WELCOME_CHIP_LAYOUT_EASE = 'cubic-bezier(0.22, 0.85, 0.25, 1)';
  function welcomeLayoutMovers() {
    if (!welcome) return [];
    return [
      welcome.querySelector('.ws-logo-wrap'),
      welcome.querySelector('.ws-heading'),
      welcome.querySelector('.ws-sub'),
      welcome.querySelector('.ws-scorecards-section'),
      rootEl.querySelector(`#${id}-chips-scroll`) || rootEl.querySelector(`#${id}-chips`),
    ].filter(Boolean);
  }
  function snapshotRects(els) {
    return (els || []).map((el) => ({ el, r: el.getBoundingClientRect() }));
  }
  function playWelcomeLayoutFlip(snaps, done) {
    if (prefersReducedMotion || !snaps || !snaps.length) {
      if (done) done();
      return;
    }
    const running = [];
    snaps.forEach(({ el, r }) => {
      if (!el || typeof el.animate !== 'function') return;
      const last = el.getBoundingClientRect();
      const dx = r.left - last.left;
      const dy = r.top - last.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      running.push(el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
        { duration: WELCOME_CHIP_LAYOUT_MS, easing: WELCOME_CHIP_LAYOUT_EASE }
      ));
    });
    if (!running.length) { if (done) done(); return; }
    let left = running.length;
    const mark = () => { if (--left <= 0 && done) done(); };
    running.forEach((anim) => { anim.onfinish = mark; anim.oncancel = mark; });
  }
  /* Reveal the clipped welcome chips with the same right→left fly-in the
     welcome uses. Show more stays put and becomes Show less; overflow
     cascades in after it. The heading and chips already on screen slide
     up to make room — they do not snap. */
  function expandWelcomeChips(fromBtn) {
    if (welcomeChipsExpanded || welcomeChipsExpanding) return;
    const wrap = rootEl.querySelector(`#${id}-chips`);
    if (!wrap) return;
    const pending = Array.from(wrap.querySelectorAll('.ws-intent-chip:not([data-chip-more])'))
      .filter((c) => c.hidden);
    const more = fromBtn || wrap.querySelector('[data-chip-more]');
    const snaps = snapshotRects(welcomeLayoutMovers());
    welcomeChipsExpanded = true;
    welcomeChipsExpanding = true;
    paintMoreBtn(more, true);

    const done = () => { welcomeChipsExpanding = false; };

    if (!pending.length) { done(); return; }
    if (prefersReducedMotion) {
      pending.forEach((c) => {
        c.hidden = false;
        c.style.opacity = '';
        c.style.transform = '';
        c.style.transition = '';
      });
      done();
      return;
    }
    pending.forEach((c) => {
      c.hidden = false;
      primeRevealFromRight(c);
    });
    void wrap.offsetHeight;
    let waiting = 2;
    const partDone = () => { if (--waiting <= 0) done(); };
    playWelcomeLayoutFlip(snaps, partDone);
    revealStaggered(pending, 40, 48, partDone);
  }
  /* Hide the chips that landed after Show more and restore the two-row cap.
     The control stays in its slot and flips back to Show more. Overflow
     fades first; then the heading and remaining chips slide back down. */
  function collapseWelcomeChips(fromBtn) {
    if (!welcomeChipsExpanded || welcomeChipsExpanding) return;
    const wrap = rootEl.querySelector(`#${id}-chips`);
    if (!wrap) return;
    const more = fromBtn || wrap.querySelector('[data-chip-more]');
    const overflow = more
      ? Array.from(wrap.querySelectorAll('.ws-intent-chip:not([data-chip-more])'))
          .filter((c) => !!(more.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING))
      : [];
    welcomeChipsExpanding = true;

    const finish = () => {
      overflow.forEach((c) => {
        c.hidden = true;
        c.style.opacity = '';
        c.style.transform = '';
        c.style.transition = '';
      });
      welcomeChipsExpanded = false;
      paintMoreBtn(more, false);
      clampWelcomeChips();
    };

    if (prefersReducedMotion || !overflow.length) {
      finish();
      welcomeChipsExpanding = false;
      return;
    }
    overflow.forEach((c) => {
      c.style.opacity = '0';
      c.style.transform = 'translateX(16px)';
      c.style.transition = 'opacity .16s ease, transform .16s ease';
    });
    setTimeout(() => {
      const snaps = snapshotRects(welcomeLayoutMovers());
      finish();
      playWelcomeLayoutFlip(snaps, () => { welcomeChipsExpanding = false; });
    }, 180);
  }
  function renderChips() {
    chipsHtml = buildChipsHtml();
    const wc = rootEl.querySelector(`#${id}-chips`);
    if (wc) wc.innerHTML = chipsHtml;
    const pc = rootEl.querySelector(`#${id}-pchips`);
    if (pc) pc.innerHTML = chipsHtml;
    if (ichipsEl) ichipsEl.innerHTML = chipsHtml;
    clampWelcomeChips();
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
    if (Array.isArray(newIntents)) {
      intents = withAskHelpChip(newIntents.slice());
      sessionIntents = intents.slice();
      catalogize(intents);
    }
    if (newReplies && typeof newReplies === 'object') {
      intentReplies = Object.assign({}, intentReplies || {}, newReplies);
    }
    /* A fresh contextual chip set is a clean slate — spent state doesn't carry
       across a swap (e.g. a marketing dock re-skinning per page). */
    usedIntents.clear();
    welcomeChipsExpanded = false;
    welcomeChipsExpanding = false;
    welcomeChipsCutoff = 0;
    catalogizeNext(intents);
    renderChips();
    skipAutoFollowups = true;
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

  /* Re-clamp welcome chips when the grid's width changes (window resize, dock
     drag, font load). Expanded stays open; collapsed keeps the two-row cap. */
  (function watchWelcomeChipWidth() {
    const scroll = rootEl.querySelector(`#${id}-chips-scroll`) || rootEl.querySelector(`#${id}-chips`);
    if (!scroll || typeof ResizeObserver !== 'function') return;
    let lastW = scroll.clientWidth;
    const ro = new ResizeObserver(() => {
      if (welcomeChipsRevealing || welcomeChipsExpanding) return;
      const w = scroll.clientWidth;
      if (w === lastW) return;
      lastW = w;
      clampWelcomeChips();
    });
    try { ro.observe(scroll); } catch (_) {}
  })();

  /* Play the welcome in: heading + sub fade up, then the intent chips fly in. */
  revealWelcome();
  /* Roll / Crawl hide this chat on pages that default to them. When the
     member walks or runs — or turns CWR off — restart the field so a
     0×0 start cannot leave a blank canvas. */
  const wakeBgAnim = () => {
    if (!bgAnimOn || !welcome || welcome.classList.contains('sc-hidden')) return;
    bgAnim.start();
  };
  window.addEventListener('wise:cwr-mode', wakeBgAnim);
  document.addEventListener('wise:cwr-ui', wakeBgAnim);

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
  syncSheenMenu();
  syncBgAnimMenu();
  syncStreamMenu();
  syncOllamaMenu(document);
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
    const stickyItem = menuSel('[data-sc="sticky"]');
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
    const outItem = menuSel('[data-sc="outputs"]');
    if (outItem) {
      outItem.classList.toggle('is-on', outputsHidden);
      outItem.setAttribute('aria-checked', outputsHidden ? 'true' : 'false');
    }
    try { opts.onToggleOutputs && opts.onToggleOutputs(outputsHidden); } catch (_) {}
  }

  /* Helix studio — pop the full Helix column out on load so the playground
     opens with every control already in the draggable card. */
  if (opts.helixStudio === true && morePop) {
    const bootStudio = () => openHelixStudioFloat(morePop, rootEl);
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(bootStudio));
    } else {
      bootStudio();
    }
  }

  /* `respond` is the streamed host-reply path: it runs the same full reasoning
     trace as a chip-driven turn before posting the given reply, so hosts that
     post their own answers (bridged engines, board mirrors) never skip the
     thinking stream the way a raw addWISEcodeAI would. */
  return { addUser, addWISEcodeAI, respond: respondWithTrace, showTyping, primeChips, revealChips, messages, ask, sendIntent, reset, openAgents, closeAgents, openConnectors, closeConnectors, openAskHelp, closeAskHelp, setAskDocked, isAskDocked: () => !!(askHelpApi && askHelpApi.isDocked && askHelpApi.isDocked()), openTurns, closeTurns, toggleTurns, setTurnsDocked, isTurnsDocked: () => turnsDocked, hideWelcome, setIntents, announceRoute, setWidth: syncWidthUI, getDbId: () => currentDbId, selectDb, root: rootEl };
}

/* ------------------------------------------------------------------ */
/* Standard three-dot menu wiring for HAND-ROLLED chat surfaces        */
/* ------------------------------------------------------------------ */
/* Every WISE chat module offers the SAME app-wide rows in its three-dot
   menu — Compact spacing, Brand AI text, Background animation (+ opacity,
   angle, scale) and Response streaming (+ detail). The shared mountWISEcodeAIChat()
   surface wires these internally; pages that still carry a hand-rolled
   inline chat (product comparison / portfolio, guiding-stars report,
   add/view product) call THIS to wire the exact same rows with the exact
   same semantics: one shared preference per control (same localStorage
   keys), one broadcast event per control (same event names), so flipping
   a switch on any surface updates every other mounted chat in lockstep.

   cfg:
     pop     {el}  the .topbar-popover holding the standard rows (markup
                   copied from the shared module template — same data-sc
                   attributes, classes and Admin badges)
     bgAnim  {obj?} enables the LIVE welcome helix on this surface:
       host      {el}  gets `sc-bganim-live` while the field runs; the
                       canvas mounts here so the strand can run behind
                       the composer as well as the welcome
       getBody   {fn}  unused — the canvas always mounts on host
       welcomeEl {el}  the welcome screen — the field only runs while it
                       is visible (class/style watched via MutationObserver)
       isWide    {fn?} () => true when the chat spans 3+ panes (bolder
                       default opacity, mirroring the shared module)

   Returns { stream } where stream() → { on, level } so the page's reply
   engine can honour the shared Response-streaming setting. */
export function wireStandardChatMenu(cfg = {}) {
  injectChatExtras();
  const pop = cfg.pop;
  if (!pop || pop.__wiseStdMenuWired) return pop && pop.__wiseStdMenuWired || null;
  const q = (sel) => queryChatMenu(pop, sel);
  const bgRoot = () => helixFloatForPop(pop) || pop;
  const setSwitch = (el, on) => {
    if (!el) return;
    el.classList.toggle('is-on', !!on);
    el.setAttribute('aria-checked', on ? 'true' : 'false');
  };
  const reducedMotion = (() => {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (_) { return false; }
  })();

  /* ── Compact spacing — app-wide <html>.chat-compact; ON by default, a
     stored '0' (explicitly turned off) wins. Same key/event as the shared
     module so every surface follows one preference. ── */
  const COMPACT_KEY = 'wise:chat-compact';
  let compactOn = true;
  try { if (localStorage.getItem(COMPACT_KEY) === '0') compactOn = false; } catch (_) {}
  document.documentElement.classList.toggle('chat-compact', compactOn);
  const compactItem = q('[data-sc="compact"]');
  const syncCompact = () => setSwitch(compactItem, document.documentElement.classList.contains('chat-compact'));
  if (compactItem) compactItem.addEventListener('click', () => {
    const on = !document.documentElement.classList.contains('chat-compact');
    document.documentElement.classList.toggle('chat-compact', on);
    try { localStorage.setItem(COMPACT_KEY, on ? '1' : '0'); } catch (_) {}
    try { document.dispatchEvent(new CustomEvent('wise:chat-compact', { detail: { on } })); } catch (_) {}
    syncCompact();
  });
  document.addEventListener('wise:chat-compact', syncCompact);
  syncCompact();

  /* ── Brand AI text — app-wide <html>.chat-brandtext; OFF by default, a
     stored '1' wins. ── */
  const BRANDTEXT_KEY = 'wise:chat-brandtext';
  let brandOn = false;
  try { if (localStorage.getItem(BRANDTEXT_KEY) === '1') brandOn = true; } catch (_) {}
  document.documentElement.classList.toggle('chat-brandtext', brandOn);
  const brandItem = q('[data-sc="brandtext"]');
  const syncBrand = () => setSwitch(brandItem, document.documentElement.classList.contains('chat-brandtext'));
  if (brandItem) brandItem.addEventListener('click', () => {
    const on = !document.documentElement.classList.contains('chat-brandtext');
    document.documentElement.classList.toggle('chat-brandtext', on);
    try { localStorage.setItem(BRANDTEXT_KEY, on ? '1' : '0'); } catch (_) {}
    try { document.dispatchEvent(new CustomEvent('wise:chat-brandtext', { detail: { on } })); } catch (_) {}
    syncBrand();
  });
  document.addEventListener('wise:chat-brandtext', syncBrand);
  syncBrand();

  /* ── Input glow — the living sheen stroke on the composer border. App-wide,
     ON by default; a stored '0' adds <html>.chat-sheen-off to suppress it
     everywhere at once. ── */
  const SHEEN_KEY = 'wise:chat-sheen';
  let sheenOn = true;
  try { if (localStorage.getItem(SHEEN_KEY) === '0') sheenOn = false; } catch (_) {}
  document.documentElement.classList.toggle('chat-sheen-off', !sheenOn);
  const sheenItem = q('[data-sc="sheen"]');
  const syncSheen = () => setSwitch(sheenItem, !document.documentElement.classList.contains('chat-sheen-off'));
  if (sheenItem) sheenItem.addEventListener('click', () => {
    const on = document.documentElement.classList.contains('chat-sheen-off');
    document.documentElement.classList.toggle('chat-sheen-off', !on);
    try { localStorage.setItem(SHEEN_KEY, on ? '1' : '0'); } catch (_) {}
    try { document.dispatchEvent(new CustomEvent('wise:chat-sheen', { detail: { on } })); } catch (_) {}
    syncSheen();
  });
  document.addEventListener('wise:chat-sheen', syncSheen);
  syncSheen();

  /* ── Background animation (+ opacity, angle, Scale, Pitch / Nodes / Length /
     Thick / Depth) — ON by default, stored '0' turns it off; opacity is user-set
     via the slider or falls back to the published Scene pose. Angle / Scale /
     knobs match that same pose until localStorage overrides. The LIVE field
     mounts only when the page provides cfg.bgAnim; either way the switch drives
     the one shared app-wide preference. ── */
  const BGANIM_KEY = 'wise:chat-bg-anim';
  const BGANIM_OPACITY_KEY = 'wise:chat-bg-anim-opacity';
  const BGANIM_ANGLE_KEY = 'wise:chat-bg-anim-angle';
  const BGANIM_PAUSED_KEY = 'wise:chat-bg-anim-paused';
  let bgOn = true;
  try { if (bgAnimGet(BGANIM_KEY) === '0') bgOn = false; } catch (_) {}
  let bgOpacity = BGANIM_PUBLISH_POSE.opacity / 100, bgUserSet = false;
  try {
    const s = parseInt(bgAnimGet(BGANIM_OPACITY_KEY), 10);
    if (!isNaN(s)) { bgOpacity = Math.max(0.1, Math.min(1, s / 100)); bgUserSet = true; }
  } catch (_) {}
  let bgAngle = readBgAnimAngle();
  let bgWash = readBgAnimWash();
  applyBgAnimWash(bgWash);
  let bgCamera = readBgAnimCamera();
  let bgAzimuth = readBgAnimAzimuth();
  let bgShift = readBgAnimShift();
  const bgScale = readBgAnimScaleAxes();
  const bgKnobs = readBgAnimKnobs();
  const bgDots = { color: readBgAnimDotsColor(), motion: readBgAnimDotsMotion() };
  const bgMotionKnobs = readBgAnimMotionKnobs();
  let bgRungsMatch = readBgAnimRungsMatch();
  let bgSpinDir = readBgAnimSpinDir();
  let bgLook = readBgAnimLook();
  const bgMats = readBgAnimMats();
  let bgPaused = false;
  try { if (bgAnimGet(BGANIM_PAUSED_KEY) === '1') bgPaused = true; } catch (_) {}
  const effOpacity = () => (bgUserSet ? bgOpacity : BGANIM_PUBLISH_POSE.opacity / 100);
  /* Background-animation STYLE (helix · helix-ten · orbit) — shared app-wide,
     same key/event as the mounted module so every surface swaps in lockstep. A
     leftover 'stamp' preference (removed) falls back to helix. */
  const BGANIM_STYLE_KEY = 'wise:chat-bg-anim-style';
  const BGANIM_STYLES = ['helix', 'helix-ten', 'orbit'];
  const isHelixStyle = (s) => s === 'helix' || s === 'helix-ten';
  let bgStyle = readBgAnimStyle();
  applyBgAnimStyleAttr(bgStyle);
  /* Inline chats copied the menu markup before the Style row existed; inject it
     (before the playback row) so every hand-rolled surface gains the segment too,
     keeping the whole app's chat menus identical. Helix, Ten, and orbit ship here. */
  const bgStyleSegHtml = ''
    + '<button type="button" class="sc-stream-seg-btn" data-sc="bg-anim-style" data-style="helix" role="radio" aria-checked="false" title="Food DNA helix" aria-label="Food DNA helix">Helix</button>'
    + '<button type="button" class="sc-stream-seg-btn" data-sc="bg-anim-style" data-style="helix-ten" role="radio" aria-checked="false" title="Food DNA helix — about ten products" aria-label="Food DNA helix — about ten products">Ten</button>'
    + '<button type="button" class="sc-stream-seg-btn" data-sc="bg-anim-style" data-style="orbit" role="radio" aria-checked="false" title="Owl orbit constellation" aria-label="Owl orbit constellation">Orbit</button>';
  const existingStyleRow = q('.sc-bganim-style');
  if (!existingStyleRow) {
    const playbackRow = q('.sc-bganim-playback');
    const detailRow = q('.sc-bganim-detail');
    const anchor = playbackRow || detailRow;
    if (anchor) {
      const styleHtml = '<div class="sc-bganim-style">'
        + '<span class="sc-bganim-style-label">Style</span>'
        + '<div class="sc-stream-seg" role="radiogroup" aria-label="Background animation style">'
        + bgStyleSegHtml
        + '</div></div>';
      anchor.insertAdjacentHTML(playbackRow ? 'beforebegin' : 'afterend', styleHtml);
    }
  } else {
    existingStyleRow.querySelectorAll('[data-style="stamp"]').forEach((el) => el.remove());
    if (!existingStyleRow.querySelector('[data-style="helix-ten"]')) {
      const helixBtn = existingStyleRow.querySelector('[data-style="helix"]');
      const tenHtml = '<button type="button" class="sc-stream-seg-btn" data-sc="bg-anim-style" data-style="helix-ten" role="radio" aria-checked="false" title="Food DNA helix — about ten products" aria-label="Food DNA helix — about ten products">Ten</button>';
      if (helixBtn) helixBtn.insertAdjacentHTML('afterend', tenHtml);
      else {
        const seg = existingStyleRow.querySelector('.sc-stream-seg');
        if (seg) seg.insertAdjacentHTML('afterbegin', tenHtml);
      }
    }
    if (!existingStyleRow.querySelector('[data-style="orbit"]')) {
      const seg = existingStyleRow.querySelector('.sc-stream-seg');
      if (seg) seg.insertAdjacentHTML('beforeend',
        '<button type="button" class="sc-stream-seg-btn" data-sc="bg-anim-style" data-style="orbit" role="radio" aria-checked="false" title="Owl orbit constellation" aria-label="Owl orbit constellation">Orbit</button>');
    }
  }
  /* Inline chats copied the menu markup before the Angle / Scale / shape rows
     existed; inject them (right after Opacity) so every hand-rolled surface
     gains the sliders too. A leftover single Scale row is upgraded in place,
     and older copies get the master Scale row plus the wider 1–800% bounds. */
  if (!q('.sc-bganim-angle')) {
    const opacityRow = q('.sc-bganim-detail:not(.sc-bganim-angle):not(.sc-bganim-scale)');
    const styleRowNow = q('.sc-bganim-style');
    const playbackNow = q('.sc-bganim-playback');
    const angleHtml = '<div class="sc-bganim-detail sc-bganim-angle">'
      + '<span class="sc-bganim-detail-label">Angle</span>'
      + '<input type="range" class="sc-bganim-angle-range" min="-90" max="90" step="1" value="' + BGANIM_PUBLISH_POSE.angle + '" aria-label="Helix angle">'
      + '<span class="sc-bganim-angle-val">' + BGANIM_PUBLISH_POSE.angle + '°</span>'
      + '</div>';
    if (opacityRow) opacityRow.insertAdjacentHTML('afterend', angleHtml);
    else if (styleRowNow) styleRowNow.insertAdjacentHTML('beforebegin', angleHtml);
    else if (playbackNow) playbackNow.insertAdjacentHTML('beforebegin', angleHtml);
  }
  ensureBgAnimCameraRow(pop);
  ensureBgAnimScaleRows(pop);
  ensureBgAnimKnobRows(pop);
  ensureBgAnimRungsMatch(pop);
  ensureBgAnimDotsChrome(pop);
  ensureBgAnimSpinChrome(pop);
  ensureBgAnimLookChrome(pop);
  ensureBgAnimMatRows(pop);
  ensureBgAnimSnapshotsChrome(pop);
  ensureBgAnimSubheads(pop);
  const welcomeEl = cfg.bgAnim && cfg.bgAnim.welcomeEl;
  const bgHost = cfg.bgAnim && cfg.bgAnim.host;
  /* Welcome-only, same as mountWISEcodeAIChat: the field paints on the
     welcome and stays until a real turn starts (intent chip / scorecard,
     or a keystroke in the composer). A hidden welcome or an engage flag
     keeps it from sitting behind a live transcript — unless the host
     lands already engaged (View Product): then `untilEngage` keeps the
     Scene helix up until a chip or typed send. */
  let bgEngaged = false;
  const welcomeShown = () => {
    if (!welcomeEl) return false;
    return !welcomeEl.classList.contains('ws-hidden')
      && !welcomeEl.classList.contains('sc-hidden')
      && welcomeEl.style.display !== 'none';
  };
  const untilEngage = !!(cfg.bgAnim && (
    cfg.bgAnim.untilEngage || (welcomeEl && !welcomeShown())
  ));
  const welcomeVisible = () => {
    if (untilEngage || !welcomeEl) return !bgEngaged;
    return welcomeShown();
  };
  /* One lazily-built engine per family (helix + helix-ten share a canvas;
     orbit is its own), exposed through a small facade so the start/stop below
     stay style-agnostic (mirrors the mounted module). */
  const bgEngines = {};
  const bgEngineKey = (style) => (style === 'orbit' ? 'orbit' : 'helix');
  const bgEngine = (style) => {
    if (!cfg.bgAnim || !cfg.bgAnim.host) return null;
    const key = bgEngineKey(style);
    if (!bgEngines[key]) {
      const common = {
        host: cfg.bgAnim.host,
        getBody: () => cfg.bgAnim.host,
        getCenterY: () => helixFillCenterY(cfg.bgAnim.host),
        fillHost: true,
        getOpacity: effOpacity,
        getAngle: () => bgAngle,
        getCamera: () => bgCamera,
        getAzimuth: () => bgAzimuth,
        getShift: () => bgShift,
        getScale: () => ({ x: bgScale.x / 100, y: bgScale.y / 100, z: bgScale.z / 100 }),
        getPitch: () => bgKnobs.pitch / 100,
        getNodes: () => bgKnobs.nodes / 100,
        getDots: () => bgKnobs.dots / 100,
        getDotsColor: () => bgDots.color,
        getDotsMotion: () => bgDots.motion,
        getMotionKnob: (motion, id) => ((bgMotionKnobs[motion] && bgMotionKnobs[motion][id]) || 100) / 100,
        getSpinDir: () => bgSpinDir,
        getLook: () => bgLook,
        getMat: (id) => bgMats[id],
        getSpinSpeed: () => bgKnobs.speed / 100,
        getLength: () => bgKnobs.length / 100,
        getRungs: () => bgKnobs.rungs / 100,
        getRungsMatch: () => bgRungsMatch,
        getRungThick: () => bgKnobs.rungthick / 100,
        getThickness: () => bgKnobs.thickness / 100,
        getDepth: () => bgKnobs.depth / 100,
        reducedMotion,
        isOn: () => bgOn,
        isPaused: () => bgPaused,
        getDensity: () => (bgStyle === 'helix-ten' ? 'ten' : 'full'),
      };
      bgEngines[key] = key === 'orbit'
          ? createOrbitBgAnim(common)
          : createHelixBgAnim(common);
    }
    return bgEngines[key];
  };
  const stopAllBg = (opts) => Object.keys(bgEngines).forEach((k) => bgEngines[k].stop(opts));
  function maybeRunBgAnim() {
    if (!cfg.bgAnim || !cfg.bgAnim.host) return;
    if (bgOn && !bgEngaged && welcomeVisible()) {
      const e = bgEngine(bgStyle);
      if (!e) return;
      const liveHelix = cfg.bgAnim.host.classList.contains('sc-bganim-live')
        && !cfg.bgAnim.host.classList.contains('sc-bganim-leaving');
      if (liveHelix && isHelixStyle(bgStyle) && e.redraw) {
        e.redraw();
        return;
      }
      stopAllBg({ immediate: true });
      e.start();
    } else {
      stopAllBg();
    }
  }
  function retireBgAnim() {
    bgEngaged = true;
    stopAllBg();
  }
  function restoreBgAnim() {
    bgEngaged = false;
    maybeRunBgAnim();
  }
  if (welcomeEl) {
    try {
      new MutationObserver(() => {
        if (welcomeShown()) restoreBgAnim();
        else if (!untilEngage) retireBgAnim();
      }).observe(welcomeEl, { attributes: true, attributeFilter: ['class', 'style'] });
    } catch (_) {}
  }
  const wakeBgAnim = () => {
    if (bgOn && !bgEngaged && welcomeVisible()) maybeRunBgAnim();
  };
  window.addEventListener('wise:cwr-mode', wakeBgAnim);
  document.addEventListener('wise:cwr-ui', wakeBgAnim);
  document.addEventListener('wise:chat-engage', retireBgAnim);

  /* Composer keystroke blooms the field out. Focusing the composer, or
     clicking nav / other modules / helix nodes, does not. A chip or send
     that hides the welcome (or fires wise:chat-engage) still retires it. */
  if (bgHost && !bgHost.__wiseBgEngageWired) {
    bgHost.__wiseBgEngageWired = true;
    const input = bgHost.querySelector('.chat-input-rail textarea.fl-input, .chat-input-rail input.fl-input, textarea.fl-input, #chat-input');
    if (input) {
      input.addEventListener('input', () => {
        const typed = !!(input.value && String(input.value).trim());
        if (typed) stopAllBg();
        else if (!bgEngaged && welcomeVisible()) {
          const e = bgEngine(bgStyle);
          if (e) e.start();
          else maybeRunBgAnim();
        }
      });
    }
  }
  const bgItem = q('[data-sc="bg-anim"]');
  const syncBg = () => {
    setSwitch(bgItem, bgOn);
    queryChatMenuAll(pop, '.sc-bganim-detail').forEach((el) => el.classList.toggle('is-disabled', !bgOn));
    const dotsMotionRow = q('.sc-bganim-dots-motion');
    if (dotsMotionRow) dotsMotionRow.classList.toggle('is-disabled', !bgOn);
    const spinRow = q('.sc-bganim-spin');
    if (spinRow) spinRow.classList.toggle('is-disabled', !bgOn);
    const pct = Math.round(effOpacity() * 100);
    const range = q('.sc-bganim-opacity');
    if (range && document.activeElement !== range) range.value = String(pct);
    const val = q('.sc-bganim-opacity-val');
    if (val) val.textContent = pct + '%';
    const washRange = q('.sc-bganim-wash-range');
    if (washRange && document.activeElement !== washRange) washRange.value = String(bgWash);
    const washVal = q('.sc-bganim-wash-val');
    if (washVal) washVal.textContent = bgWash + '%';
    const angleRange = q('.sc-bganim-angle-range');
    if (angleRange && document.activeElement !== angleRange) angleRange.value = String(bgAngle);
    const angleVal = q('.sc-bganim-angle-val');
    if (angleVal) angleVal.textContent = bgAngle + '°';
    const cameraRange = q('.sc-bganim-camera-range');
    if (cameraRange && document.activeElement !== cameraRange) cameraRange.value = String(bgCamera);
    const cameraVal = q('.sc-bganim-camera-val');
    if (cameraVal) cameraVal.textContent = bgCamera + '°';
    const azimuthRange = q('.sc-bganim-azimuth-range');
    if (azimuthRange && document.activeElement !== azimuthRange) azimuthRange.value = String(bgAzimuth);
    const azimuthVal = q('.sc-bganim-azimuth-val');
    if (azimuthVal) azimuthVal.textContent = bgAzimuth + '°';
    const shiftRange = q('.sc-bganim-shift-range');
    if (shiftRange && document.activeElement !== shiftRange) shiftRange.value = String(bgShift);
    const shiftVal = q('.sc-bganim-shift-val');
    if (shiftVal) shiftVal.textContent = bgShift + '%';
    syncBgAnimScaleRows(bgRoot(), bgScale);
    syncBgAnimKnobRows(bgRoot(), bgKnobs);
    syncBgAnimRungsMatch(bgRoot(), bgRungsMatch, bgKnobs);
    syncBgAnimDotsChrome(bgRoot(), bgDots, bgMotionKnobs, isHelixStyle(bgStyle));
    syncBgAnimSpinChrome(bgRoot(), bgSpinDir);
    syncBgAnimLookChrome(bgRoot(), bgLook);
    syncBgAnimMatRows(bgRoot(), bgMats, bgLook);
    syncBgAnimSnapshots(bgRoot());
    syncBgAnimHelixOnlyRows(bgRoot(), isHelixStyle(bgStyle));
    const styleRow = q('.sc-bganim-style');
    if (styleRow) styleRow.classList.remove('is-disabled');
    queryChatMenuAll(pop, '[data-sc="bg-anim-style"]').forEach((btn) => {
      const on = btn.dataset.style === bgStyle;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    const playback = q('.sc-bganim-playback');
    if (playback) playback.classList.toggle('is-disabled', !bgOn);
    const ppBtn = q('[data-sc="bg-anim-playback"]');
    if (ppBtn) {
      ppBtn.classList.toggle('is-paused', bgPaused);
      ppBtn.setAttribute('aria-pressed', bgPaused ? 'true' : 'false');
      const lbl = bgPaused ? 'Play background animation' : 'Pause background animation';
      ppBtn.setAttribute('aria-label', lbl);
      ppBtn.setAttribute('title', lbl);
    }
  };
  const applyBgPaused = () => {
    const e = bgEngines[bgEngineKey(bgStyle)];
    if (!e) return;
    if (bgPaused) e.pause(); else e.resume();
  };
  if (bgItem) bgItem.addEventListener('click', () => {
    bgOn = !bgOn;
    try { bgAnimSet(BGANIM_KEY, bgOn ? '1' : '0'); } catch (_) {}
    try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim', { detail: { on: bgOn } })); } catch (_) {}
  });
  document.addEventListener('wise:chat-bg-anim', (e) => {
    bgOn = !!(e && e.detail && e.detail.on);
    syncBg();
    maybeRunBgAnim();
  });
  const bgRange = q('.sc-bganim-opacity');
  if (bgRange) bgRange.addEventListener('input', () => {
    const pct = Math.max(10, Math.min(100, parseInt(bgRange.value, 10) || 100));
    bgOpacity = pct / 100;
    bgUserSet = true;
    try { bgAnimSet(BGANIM_OPACITY_KEY, String(pct)); } catch (_) {}
    try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-opacity', { detail: { opacity: bgOpacity } })); } catch (_) {}
    const val = q('.sc-bganim-opacity-val');
    if (val) val.textContent = pct + '%';
    if (reducedMotion && bgOn) maybeRunBgAnim();
  });
  document.addEventListener('wise:chat-bg-anim-opacity', (e) => {
    const v = e && e.detail && e.detail.opacity;
    if (typeof v !== 'number') return;
    bgOpacity = Math.max(0.1, Math.min(1, v));
    bgUserSet = true;
    syncBg();
    if (reducedMotion && bgOn) maybeRunBgAnim();
  });
  const bgWashRange = q('.sc-bganim-wash-range');
  if (bgWashRange) bgWashRange.addEventListener('input', () => {
    const pct = clampBgAnimWash(parseInt(bgWashRange.value, 10));
    bgWash = pct;
    persistBgAnimWash(pct);
    applyBgAnimWash(pct);
    broadcastBgAnimWash(pct);
    const wval = q('.sc-bganim-wash-val');
    if (wval) wval.textContent = pct + '%';
  });
  document.addEventListener('wise:chat-bg-anim-wash', (e) => {
    const v = e && e.detail && e.detail.wash;
    if (typeof v !== 'number') return;
    bgWash = clampBgAnimWash(v);
    applyBgAnimWash(bgWash);
    syncBg();
  });
  const bgAngleRange = q('.sc-bganim-angle-range');
  if (bgAngleRange) bgAngleRange.addEventListener('input', () => {
    const deg = Math.max(-90, Math.min(90, parseInt(bgAngleRange.value, 10) || 0));
    bgAngle = deg;
    try { bgAnimSet(BGANIM_ANGLE_KEY, String(deg)); } catch (_) {}
    try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-angle', { detail: { angle: bgAngle } })); } catch (_) {}
    const aval = q('.sc-bganim-angle-val');
    if (aval) aval.textContent = deg + '°';
    if (bgOn) {
      if (reducedMotion) maybeRunBgAnim();
      else {
        const e = bgEngines[bgEngineKey(bgStyle)];
        if (e && e.redraw) e.redraw();
      }
    }
  });
  document.addEventListener('wise:chat-bg-anim-angle', (e) => {
    const v = e && e.detail && e.detail.angle;
    if (typeof v !== 'number') return;
    bgAngle = Math.max(-90, Math.min(90, v));
    syncBg();
    if (bgOn) {
      if (reducedMotion) maybeRunBgAnim();
      else {
        const eng = bgEngines[bgEngineKey(bgStyle)];
        if (eng && eng.redraw) eng.redraw();
      }
    }
  });
  const bgCameraRange = q('.sc-bganim-camera-range');
  if (bgCameraRange) bgCameraRange.addEventListener('input', () => {
    const deg = clampBgAnimCamera(parseInt(bgCameraRange.value, 10));
    bgCamera = deg;
    persistBgAnimCamera(deg);
    broadcastBgAnimCamera(deg);
    const cval = q('.sc-bganim-camera-val');
    if (cval) cval.textContent = deg + '°';
    if (bgOn) {
      if (reducedMotion) maybeRunBgAnim();
      else {
        const e = bgEngines[bgEngineKey(bgStyle)];
        if (e && e.redraw) e.redraw();
      }
    }
  });
  document.addEventListener('wise:chat-bg-anim-camera', (e) => {
    const v = e && e.detail && e.detail.camera;
    if (typeof v !== 'number') return;
    bgCamera = clampBgAnimCamera(v);
    syncBg();
    if (bgOn) {
      if (reducedMotion) maybeRunBgAnim();
      else {
        const eng = bgEngines[bgEngineKey(bgStyle)];
        if (eng && eng.redraw) eng.redraw();
      }
    }
  });
  const bgAzimuthRange = q('.sc-bganim-azimuth-range');
  if (bgAzimuthRange) bgAzimuthRange.addEventListener('input', () => {
    const deg = clampBgAnimAzimuth(parseInt(bgAzimuthRange.value, 10));
    bgAzimuth = deg;
    persistBgAnimAzimuth(deg);
    broadcastBgAnimAzimuth(deg);
    const aval = q('.sc-bganim-azimuth-val');
    if (aval) aval.textContent = deg + '°';
    if (bgOn) {
      if (reducedMotion) maybeRunBgAnim();
      else {
        const e = bgEngines[bgEngineKey(bgStyle)];
        if (e && e.redraw) e.redraw();
      }
    }
  });
  document.addEventListener('wise:chat-bg-anim-azimuth', (e) => {
    const v = e && e.detail && e.detail.azimuth;
    if (typeof v !== 'number') return;
    bgAzimuth = clampBgAnimAzimuth(v);
    syncBg();
    if (bgOn) {
      if (reducedMotion) maybeRunBgAnim();
      else {
        const eng = bgEngines[bgEngineKey(bgStyle)];
        if (eng && eng.redraw) eng.redraw();
      }
    }
  });
  const bgShiftRange = q('.sc-bganim-shift-range');
  if (bgShiftRange) bgShiftRange.addEventListener('input', () => {
    const pct = clampBgAnimShift(parseInt(bgShiftRange.value, 10));
    bgShift = pct;
    persistBgAnimShift(pct);
    broadcastBgAnimShift(pct);
    const sval = q('.sc-bganim-shift-val');
    if (sval) sval.textContent = pct + '%';
    if (bgOn) {
      if (reducedMotion) maybeRunBgAnim();
      else {
        const e = bgEngines[bgEngineKey(bgStyle)];
        if (e && e.redraw) e.redraw();
      }
    }
  });
  document.addEventListener('wise:chat-bg-anim-shift', (e) => {
    const v = e && e.detail && e.detail.shift;
    if (typeof v !== 'number') return;
    bgShift = clampBgAnimShift(v);
    syncBg();
    if (bgOn) {
      if (reducedMotion) maybeRunBgAnim();
      else {
        const eng = bgEngines[bgEngineKey(bgStyle)];
        if (eng && eng.redraw) eng.redraw();
      }
    }
  });
  const repaintBg = () => {
    if (!bgOn) return;
    if (reducedMotion) maybeRunBgAnim();
    else {
      const e = bgEngines[bgEngineKey(bgStyle)];
      if (e && e.redraw) e.redraw();
    }
  };
  wireBgAnimScaleRows(pop, bgScale, repaintBg);
  wireBgAnimKnobRows(pop, bgKnobs, repaintBg);
  wireBgAnimRungsMatch(pop, () => bgRungsMatch, (v) => { bgRungsMatch = v; }, bgKnobs, repaintBg);
  wireBgAnimDotsChrome(pop, bgDots, repaintBg, bgMotionKnobs);
  wireBgAnimMotionKnobs(pop, bgMotionKnobs, repaintBg);
  wireBgAnimSpinChrome(pop, () => bgSpinDir, (d) => { bgSpinDir = d; }, repaintBg);
  wireBgAnimLookChrome(pop, () => bgLook, (v) => { bgLook = v; syncBgAnimMatRows(bgRoot(), bgMats, v); }, repaintBg);
  wireBgAnimMatRows(pop, bgMats, repaintBg);
  wireBgAnimSnapshotsChrome(pop);
  wireBgAnimSnapshotsChrome(bgRoot());
  document.addEventListener('wise:chat-bg-anim-scale', (e) => {
    if (!applyScaleEventToAxes(bgScale, e && e.detail)) return;
    syncBg();
    repaintBg();
  });
  document.addEventListener('wise:chat-bg-anim-knob', (e) => {
    if (!applyKnobEventToKnobs(bgKnobs, e && e.detail)) return;
    syncBg();
    repaintBg();
  });
  document.addEventListener('wise:chat-bg-anim-rungs-match', (e) => {
    const on = !!(e && e.detail && e.detail.match);
    if (on === bgRungsMatch) return;
    bgRungsMatch = on;
    syncBg();
    repaintBg();
  });
  document.addEventListener('wise:chat-bg-anim-dots', (e) => {
    if (!applyDotsEventToState(bgDots, e && e.detail)) return;
    syncBg();
    repaintBg();
  });
  document.addEventListener('wise:chat-bg-anim-motion-knob', (e) => {
    if (!applyMotionKnobEvent(bgMotionKnobs, e && e.detail)) return;
    syncBg();
    repaintBg();
  });
  document.addEventListener('wise:chat-bg-anim-spin', (e) => {
    const d = e && e.detail && e.detail.dir;
    if (!BGANIM_SPIN_DIRS.includes(d) || d === bgSpinDir) return;
    bgSpinDir = d;
    syncBg();
    repaintBg();
  });
  document.addEventListener('wise:chat-bg-anim-look', (e) => {
    const look = normalizeBgAnimLook(e && e.detail && e.detail.look);
    if (!BGANIM_LOOKS.includes(look) || look === bgLook) return;
    bgLook = look;
    syncBg();
    repaintBg();
  });
  document.addEventListener('wise:chat-bg-anim-mat', (e) => {
    if (!applyMatEvent(bgMats, e && e.detail)) return;
    syncBg();
    repaintBg();
  });
  document.addEventListener('wise:chat-bg-anim-snapshot', (e) => {
    const s = e && e.detail;
    if (!s) return;
    bgLook = normalizeBgAnimLook(s.look);
    Object.assign(bgMats, s.mats);
    bgOpacity = Math.max(0.1, Math.min(1, (s.opacity || BGANIM_PUBLISH_POSE.opacity) / 100));
    bgUserSet = true;
    bgWash = clampBgAnimWash(s.wash);
    applyBgAnimWash(bgWash);
    bgAngle = Math.max(-90, Math.min(90, s.angle));
    bgCamera = clampBgAnimCamera(s.camera);
    bgAzimuth = clampBgAnimAzimuth(s.azimuth);
    bgShift = clampBgAnimShift(s.shift);
    Object.assign(bgScale, s.scale);
    Object.assign(bgKnobs, s.knobs);
    bgDots.color = s.dotsColor || '';
    bgDots.motion = BGANIM_DOTS_MOTIONS.includes(s.dotsMotion) ? s.dotsMotion : 'still';
    if (s.motionKnobs && s.motionKnobs.pulse) Object.assign(bgMotionKnobs.pulse, s.motionKnobs.pulse);
    if (s.motionKnobs && s.motionKnobs.spark) Object.assign(bgMotionKnobs.spark, s.motionKnobs.spark);
    bgSpinDir = BGANIM_SPIN_DIRS.includes(s.spin) ? s.spin : bgSpinDir;
    bgRungsMatch = !!s.rungsMatch;
    bgPaused = !!s.paused;
    if (BGANIM_STYLES.includes(s.style) && s.style !== bgStyle) {
      bgStyle = s.style;
      maybeRunBgAnim();
    }
    syncBg();
    applyBgPaused();
    repaintBg();
  });
  const bgPlaybackBtn = q('[data-sc="bg-anim-playback"]');
  if (bgPlaybackBtn) bgPlaybackBtn.addEventListener('click', () => {
    bgPaused = !bgPaused;
    try { bgAnimSet(BGANIM_PAUSED_KEY, bgPaused ? '1' : '0'); } catch (_) {}
    try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-paused', { detail: { paused: bgPaused } })); } catch (_) {}
    syncBg();
    applyBgPaused();
  });
  document.addEventListener('wise:chat-bg-anim-paused', (e) => {
    bgPaused = !!(e && e.detail && e.detail.paused);
    syncBg();
    applyBgPaused();
  });
  pop.querySelectorAll('[data-sc="bg-anim-style"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const s = btn.dataset.style;
      if (BGANIM_STYLES.includes(s)) {
        if (s !== bgStyle) {
          try { bgAnimSet(BGANIM_STYLE_KEY, s); } catch (_) {}
          try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim-style', { detail: { style: s } })); } catch (_) {}
        }
        /* Picking a style is also the one-tap way to SEE it: turn the field on
           if it was off so "Orbit" (or "Helix" / "Ten") isn't a dead control. */
        if (!bgOn) {
          bgOn = true;
          try { bgAnimSet(BGANIM_KEY, '1'); } catch (_) {}
          try { document.dispatchEvent(new CustomEvent('wise:chat-bg-anim', { detail: { on: true } })); } catch (_) {}
        }
      }
      syncBg();
    });
  });
  document.addEventListener('wise:chat-bg-anim-style', (e) => {
    const s = e && e.detail && e.detail.style;
    if (!BGANIM_STYLES.includes(s) || s === bgStyle) return;
    bgStyle = s;
    syncBg();
    maybeRunBgAnim();
  });
  syncBg();
  maybeRunBgAnim();

  /* ── Response streaming (+ detail) — every load starts ON at 'full'
     (deliberately not restored from storage — full streaming is the
     guaranteed baseline). In-session changes persist + broadcast so all
     sibling chats follow. ── */
  const STREAM_ON_KEY = 'wise:chat-stream-on';
  const STREAM_LEVEL_KEY = 'wise:chat-stream-level';
  const STREAM_LEVELS = ['full', 'steps', 'final'];
  let streamOn = true;
  let streamLevel = 'full';
  const syncStream = () => {
    setSwitch(q('[data-sc="stream-toggle"]'), streamOn);
    const seg = q('.sc-stream-detail');
    if (seg) seg.classList.toggle('is-disabled', !streamOn);
    /* Scope to the streaming-level buttons only — other segmented controls in the
       menu (background-animation style, activity-strip side) share the look. */
    pop.querySelectorAll('[data-sc="stream-level"]').forEach((el) => {
      const on = el.dataset.stream === streamLevel;
      el.classList.toggle('is-on', on);
      el.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  };
  const streamToggle = q('[data-sc="stream-toggle"]');
  if (streamToggle) streamToggle.addEventListener('click', () => {
    streamOn = !streamToggle.classList.contains('is-on');
    try { localStorage.setItem(STREAM_ON_KEY, streamOn ? '1' : '0'); } catch (_) {}
    try { document.dispatchEvent(new CustomEvent('wise:chat-stream-on', { detail: { on: streamOn } })); } catch (_) {}
    syncStream();
  });
  pop.querySelectorAll('[data-sc="stream-level"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lvl = btn.dataset.stream;
      if (STREAM_LEVELS.includes(lvl) && lvl !== streamLevel) {
        streamLevel = lvl;
        try { localStorage.setItem(STREAM_LEVEL_KEY, lvl); } catch (_) {}
        try { document.dispatchEvent(new CustomEvent('wise:chat-stream-level', { detail: { level: lvl } })); } catch (_) {}
      }
      syncStream();
    });
  });
  document.addEventListener('wise:chat-stream-on', (e) => {
    streamOn = !(e && e.detail && e.detail.on === false);
    syncStream();
  });
  document.addEventListener('wise:chat-stream-level', (e) => {
    const lvl = e && e.detail && e.detail.level;
    if (STREAM_LEVELS.includes(lvl)) streamLevel = lvl;
    syncStream();
  });
  syncStream();

  /* Clearer reading — rewrite answers on this Mac (Ollama). Same shared
     switch as the mounted module. Inject the row on hand-rolled menus that
     were copied before it existed. */
  ensureOllamaMenuRow(pop);
  const ollamaToggle = q('[data-sc="ollama-toggle"]');
  /* Mounted chats already flip this row from the shared [data-sc] handler.
     Hand-rolled menus are the only ones that need a listener here. */
  if (ollamaToggle && !pop.closest('.wch-chat-anchor')) {
    ollamaToggle.addEventListener('click', () => {
      toggleOllamaOn();
      syncOllamaMenu(document);
    });
  }
  document.addEventListener('wise:chat-ollama-on', () => syncOllamaMenu(document));
  probeOllama().then(() => syncOllamaMenu(document));
  syncOllamaMenu(document);

  const api = {
    stream: () => ({ on: streamOn, level: streamLevel }),
    retireBg: retireBgAnim,
    restoreBg: restoreBgAnim,
  };

  /* ── History & Projects — the shared sticky History module ──────────────────
     Opt-in via cfg.history so EVERY chat module (not just the flagship shared
     one) can open + view the same docked sticky History drawer from its three-
     dot menu. When enabled we:
       • inject a "History & Projects" switch row at the top of the popover if
         the page didn't already hardcode one (data-sc="history"),
       • mount the shared WiseChatHistory as a docked sticky module on the
         chat's left (parity with pages/wiseai.html + report-guiding-stars),
       • wire the row to reveal / tuck the module and reflect its state.
     cfg.history:
       chatEl        {el|sel} the chat shell (the flex sibling the module docks
                              beside). Required.
       messagesEl    {el|sel} the transcript node (default '#chat-messages').
       container     {sel}    the modules row (default '#modules-row').
       storageKey    {str}    per-surface history store key.
       onNew         {fn?}    "Start new conversation" handler (falls back to
                              clicking a [data-ap="restart"] control if present).
       seed / seedVersion / stripSelectors / breakoutWidth / stickyWidth /
       mcpFilter                as WiseChatHistory.mount(). */
  if (cfg.history && window.WiseChatHistory) {
    const h = cfg.history;
    const chatEl = (typeof h.chatEl === 'string') ? document.querySelector(h.chatEl) : h.chatEl;
    const msgSel = h.messagesEl || '#chat-messages';
    const messagesNode = (typeof msgSel === 'string') ? (chatEl || document).querySelector(msgSel) : msgSel;
    if (chatEl && messagesNode) {
      /* Inject the menu row when the page didn't hardcode it — placed at the top
         of the popover, above the standard rows, matching the flagship menus. */
      let histItem = pop.querySelector('[data-sc="history"]');
      if (!histItem) {
        histItem = document.createElement('button');
        histItem.type = 'button';
        histItem.className = 'topbar-menu-item sc-mcp-item';
        histItem.setAttribute('data-sc', 'history');
        histItem.setAttribute('role', 'menuitemcheckbox');
        histItem.setAttribute('aria-checked', 'false');
        histItem.innerHTML = '<span class="material-symbols-outlined topbar-menu-icon">history</span>' +
          '<span>History &amp; Projects</span><span class="sc-switch" aria-hidden="true"></span>';
        const divider = document.createElement('div');
        divider.className = 'topbar-menu-divider';
        pop.insertBefore(divider, pop.firstChild);
        pop.insertBefore(histItem, pop.firstChild);
      }

      const containerSel = h.container || '#modules-row';
      const ctrl = window.WiseChatHistory.mount(chatEl, {
        storageKey: h.storageKey || ('wise-chat-history:' + location.pathname),
        messagesEl: messagesNode,
        paneHost: messagesNode.parentElement,
        stripSelectors: h.stripSelectors || ['.sc-line-typing'],
        seed: h.seed,
        seedVersion: h.seedVersion || 0,
        onNew: () => {
          if (typeof h.onNew === 'function') { h.onNew(); return; }
          /* No explicit handler → mirror the page's own "Start new conversation"
             so restoring the fresh slate stays consistent. */
          const restart = chatEl.querySelector('[data-ap="restart"]') || document.querySelector('[data-ap="restart"]');
          if (restart) restart.click();
        },
        /* History docks as its own STICKY module on the chat's left — never an
           in-chat overlay. Starts tucked behind the chat; the switch reveals it. */
        breakout: true,
        breakoutWidth: h.breakoutWidth || 300,
        stickyWidth: h.stickyWidth || 280,
        breakoutDefault: true,
        dockedControls: true,
        breakoutStartHidden: true,
        breakoutContainer: containerSel,
        breakoutAnchor: chatEl,
        mcpFilter: h.mcpFilter === true,
      });

      /* Sticky is the only module style (same as wiseai.html / guiding-stars). */
      const row = document.querySelector(containerSel);
      if (row) row.classList.add('modules-sticky');
      chatEl.classList.add('wch-chat-anchor');
      try { ctrl.setSticky(true); } catch (_) {}

      const syncHistItem = () => {
        const el = ctrl && ctrl.root;
        let on = false;
        if (el && !el.classList.contains('wch-dock-conceal')) {
          on = (ctrl.isDocked && ctrl.isDocked())
            ? !el.classList.contains('wch-docked-hidden')
            : (ctrl.isOpen ? ctrl.isOpen() : false);
        }
        setSwitch(histItem, on);
      };
      histItem.addEventListener('click', (e) => {
        e.stopPropagation();
        ctrl.toggle();
        syncHistItem();
      });
      /* Re-sync the switch whenever the three-dot menu is opened. */
      const moreBtn = pop.closest('.panel-more-wrap') && pop.closest('.panel-more-wrap').querySelector('.panel-more-btn');
      if (moreBtn) moreBtn.addEventListener('click', syncHistItem);
      syncHistItem();

      /* Expose so page code / sibling menus can drive + reflect it (parity with
         the toggleWISEcodeAIHistoryModule global on the flagship pages). */
      window.__wiseChatHistory = ctrl;
      if (typeof window.toggleWISEcodeAIHistoryModule !== 'function') {
        window.toggleWISEcodeAIHistoryModule = (e) => { if (e) e.stopPropagation(); ctrl.toggle(); syncHistItem(); };
      }
      api.history = ctrl;
    }
  }

  /* File to Library — inject the row on hand-rolled menus that didn't
     hardcode it, then wire the click to the same store the shared mount uses. */
  const fileLibItem = injectFileToLibraryMenuItem(pop);
  if (fileLibItem && !fileLibItem.__wiseFileLibWired) {
    fileLibItem.__wiseFileLibWired = true;
    fileLibItem.addEventListener('click', (e) => {
      e.stopPropagation();
      const h = cfg.history || {};
      const chatEl = (typeof h.chatEl === 'string') ? document.querySelector(h.chatEl) : h.chatEl;
      const msgSel = h.messagesEl || '#chat-messages';
      const messagesNode = (typeof msgSel === 'string')
        ? ((chatEl || document).querySelector(msgSel) || document.querySelector('.chat-messages-area, #chat-messages'))
        : msgSel;
      const wrap = pop.closest('.panel-more-wrap') || pop.__plHost;
      const moreBtnEl = wrap && wrap.querySelector('.panel-more-btn');
      fileConversationToLibrary({
        chatHistory: (api && api.history) || window.__wiseChatHistory,
        messagesEl: messagesNode,
        historyKey: h.storageKey,
        trigger: fileLibItem,
        tipTarget: moreBtnEl || fileLibItem,
        menu: pop,
        onFiled: () => {
          pop.classList.add('hidden');
          if (moreBtnEl) {
            moreBtnEl.classList.remove('is-open');
            moreBtnEl.setAttribute('aria-expanded', 'false');
          }
        },
      });
    });
  }

  /* Reflow the (now fully assembled, incl. injected Style + Angle + History
     rows) flat menu into the shared group cards — run last so every
     dynamically added row is bucketed. Moves existing nodes, so all wiring
     above stays live. */
  groupifyChatMenu(pop);

  pop.__wiseStdMenuWired = api;
  return api;
}
