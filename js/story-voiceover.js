/**
 * Story voiceover — a character picker and spoken read of the playful
 * UNWISEcode story. Opened from the chat three-dot menu. The transcript
 * itself is unchanged; this only speaks it.
 *
 * Voices are the device's own speech synthesis, tuned to suggest a
 * character. They are not official likenesses.
 */

import { esc } from './escape-html.js';

const VOICE_KEY = 'wise:story-voice';
const DEFAULT_ID = 'slj';

/* Fallback spoken script — the same UNWISEcode parody the playful-story
   chip prints. Used when the story is not yet in the transcript. */
const FALLBACK_STORY = [
  'Here is a playful parody of WISEowl\'s ultra-processed food detection platform, WISEcode, dialing its massive database of 15,000 plus food attributes up to an absurd, existential level.',
  'Introducing: UNWISEcode. The Existential UPF Detector and Food Panic Simulator.',
  'Traditional nutrition labels only show 15 attributes, giving you less than 1% of the story. WISEcode gives you 15,000 attributes. But UNWISEcode tracks 15 million hyper-specific micro-existential metrics to tell you exactly how close your grocery cart is to turning you into a literal corporate cyborg.',
  'Why just look for seed oils when you can track the exact emotional state of the corn when it was processed?',
  'Key features of UNWISEcode AI.',
  'The Super-Duper-Ultra-Mega-Processed Shield, or SDUMPF.',
  'Instead of boring categories like minimal or ultra-processed, our proprietary machine learning models sort your food into clear, anxiety-inducing buckets:',
  'Level 1: Straight from the Dirt. Leafy greens, probably contains actual spiders.',
  'Level 4: Tastes Like Childhood. Moderate processing, heavy nostalgia.',
  'Level 5: Lab-Grown Sentience. Your snack food has its own Twitter account and a slight existential dread.',
  'The Vibe Over Matter Barcode Scanner.',
  'Scan a bag of chips in seconds. Instead of boring metrics like protein density, our AI agent parses the ingredient text to reveal:',
  'Xanthan gum content: 4.2 grams. Used to bind the chips, and also your student loan debt.',
  'Molecular Cynicism Score: 94 percent. The food scientist who formulated this flavor profile did it entirely to spite their ex.',
  'The Global 200 Dollar Hackathon. The UNWISE Code Hack.',
  'While WISEcode runs a massive 200,000 dollar global challenge for real nutrition scientists, we are offering a 20 dollar gift card to a local organic farm to whichever software engineer can build an algorithm that successfully calculates how long a Twinkie can survive a direct nuclear strike.',
  'Real product scan examples.',
  'Organic almond milk. WISEcode says lightly processed, check for emulsifiers or added gums. UNWISEcode says it contains exactly three actual almonds. The rest is water that has been aggressively gaslit into thinking it\'s dairy.',
  'Neon orange cheese puffs. WISEcode says ultra-processed food. High sodium, artificial colors, and zero fiber density. UNWISEcode says this is not food. This is an industrial insulation material that happens to look beautiful under a grocery store fluorescent light. Eat at your own psychological risk.',
  'Artisanal sourdough bread. WISEcode says non-UPF verified. Great carb quality. UNWISEcode says the baker went to a liberal arts college and listened to indie folk music while kneading this. The bread tastes like unfulfilled potential and hints of rosemary.',
].join(' ');

export const STORY_VOICES = [
  {
    label: 'Icons', access: 'voices', badge: 'ICON', filter: 'icons',
    items: [
      {
        id: 'slj', name: 'Samuel L. Jackson', desc: 'Low, emphatic, no-nonsense',
        gender: 'male', lang: 'en-US', rate: 0.88, pitch: 0.68,
        prefer: [/aaron/i, /alex/i, /daniel/i, /fred/i, /tom/i],
        intro: 'Alright. Hold on to your grocery cart. This is the UNWISEcode story.',
      },
      {
        id: 'mj', name: 'Michael Jackson', desc: 'Light, quick, a little theatrical',
        gender: 'male', lang: 'en-US', rate: 1.06, pitch: 1.38,
        prefer: [/nicky/i, /fred/i, /junior/i, /alex/i],
        intro: 'Hee-hee. Let me tell you a little story about food.',
      },
      {
        id: 'gwen', name: 'Gwen Stefani', desc: 'Bright California pop',
        gender: 'female', lang: 'en-US', rate: 1.02, pitch: 1.18,
        prefer: [/samantha/i, /zoe/i, /nicky/i, /susan/i, /victoria/i],
        intro: 'This is bananas. Here is a story.',
      },
      {
        id: 'adele', name: 'Adele', desc: 'Warm, unhurried, British',
        gender: 'female', lang: 'en-GB', rate: 0.9, pitch: 0.84,
        prefer: [/serena/i, /kate/i, /martha/i, /moira/i, /fiona/i],
        intro: 'Hello. Let me tell you a story, love.',
      },
    ],
  },
  {
    label: 'Creators', access: 'creators', badge: 'LIVE', filter: 'creators',
    items: [
      {
        id: 'speed', name: 'IShowSpeed', desc: 'Full volume, no brakes',
        gender: 'male', lang: 'en-US', rate: 1.28, pitch: 1.18,
        prefer: [/nicky/i, /junior/i, /fred/i, /aaron/i],
        intro: 'Chat! You will not believe this story. Let\'s go!',
      },
      {
        id: 'salish', name: 'Salish Matter', desc: 'Upbeat story-time energy',
        gender: 'female', lang: 'en-US', rate: 1.14, pitch: 1.28,
        prefer: [/nicky/i, /samantha/i, /zoe/i, /kathy/i],
        intro: 'Okay so, story time.',
      },
      {
        id: 'mrbeast', name: 'MrBeast', desc: 'Fast, punchy, challenge-ready',
        gender: 'male', lang: 'en-US', rate: 1.16, pitch: 1.04,
        prefer: [/aaron/i, /alex/i, /daniel/i, /tom/i],
        intro: 'I just spent twenty dollars on a Twinkie challenge. Here is the story.',
      },
      {
        id: 'kai', name: 'Kai Cenat', desc: 'Hype, lock-in, late-night stream',
        gender: 'male', lang: 'en-US', rate: 1.22, pitch: 1.12,
        prefer: [/nicky/i, /fred/i, /aaron/i, /alex/i],
        intro: 'Yo chat, story time, lock in.',
      },
      {
        id: 'mark', name: 'Markiplier', desc: 'Warm host, a little dramatic',
        gender: 'male', lang: 'en-US', rate: 0.98, pitch: 1.02,
        prefer: [/daniel/i, /alex/i, /aaron/i, /tom/i],
        intro: 'Hello everybody. Welcome to UNWISEcode.',
      },
    ],
  },
];

function allVoiceItems() {
  return STORY_VOICES.flatMap((g) => g.items.map((it) => ({ ...it, group: g })));
}

function voiceById(id) {
  return allVoiceItems().find((it) => it.id === id) || allVoiceItems()[0] || null;
}

export function readStoryVoiceId() {
  try {
    const id = localStorage.getItem(VOICE_KEY);
    if (id && voiceById(id)) return id;
  } catch (_) {}
  return DEFAULT_ID;
}

function writeStoryVoiceId(id) {
  try { localStorage.setItem(VOICE_KEY, id); } catch (_) {}
}

function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

let cachedVoices = [];
function loadVoices() {
  if (!canSpeak()) return [];
  const list = window.speechSynthesis.getVoices() || [];
  if (list.length) cachedVoices = list;
  return cachedVoices.length ? cachedVoices : list;
}

function pickEngineVoice(pref) {
  const voices = loadVoices();
  if (!voices.length) return null;
  const lang = String(pref.lang || 'en').toLowerCase();
  const langShort = lang.slice(0, 2);
  const named = (pref.prefer || []).reduce((hit, re) => {
    if (hit) return hit;
    return voices.find((v) => re.test(v.name || '') && String(v.lang || '').toLowerCase().indexOf(langShort) === 0) || null;
  }, null);
  if (named) return named;
  const langExact = voices.find((v) => String(v.lang || '').toLowerCase() === lang);
  if (langExact) return langExact;
  const female = /samantha|karen|moira|fiona|victoria|susan|zoe|nicky|kathy|tessa|serena|kate|martha|allison|ava|siri/i;
  const male = /daniel|alex|aaron|fred|tom|david|james|oliver|rishi|gordon|bruce|fred|junior|albert|nathan/i;
  const pool = voices.filter((v) => String(v.lang || '').toLowerCase().indexOf(langShort) === 0);
  const gendered = pool.filter((v) => pref.gender === 'female' ? female.test(v.name) : male.test(v.name));
  return gendered[0] || pool[0] || voices[0] || null;
}

function extractSpeakable(node) {
  if (!node) return '';
  const body = node.querySelector ? (node.querySelector('.sc-line-body') || node) : node;
  const clone = body.cloneNode(true);
  clone.querySelectorAll(
    '.sc-line-meta, .sc-fb-wrap, .sc-inline-chips, .sc-avatar, .ws-chips, .sc-trust-chip, .sc-open-chip-ic, .sc-open-chip-go'
  ).forEach((n) => n.remove());
  return String(clone.textContent || '')
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function findStoryLine(root) {
  const scoped = root && root.querySelector ? root : document;
  const tagged = scoped.querySelector('[data-voiceover="playful"]');
  if (tagged) return tagged;
  const lines = Array.from(scoped.querySelectorAll('.sc-line-wiseai'));
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (/unwisecode/i.test(lines[i].textContent || '')) return lines[i];
  }
  return null;
}

function storyTextFrom(root) {
  const line = findStoryLine(root);
  const text = extractSpeakable(line);
  return text || FALLBACK_STORY;
}

function chunkScript(text) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  if (!raw) return [];
  const parts = raw.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let buf = '';
  parts.forEach((p) => {
    if ((buf + ' ' + p).trim().length > 280) {
      if (buf) chunks.push(buf);
      buf = p;
    } else {
      buf = buf ? buf + ' ' + p : p;
    }
  });
  if (buf) chunks.push(buf);
  return chunks;
}

let playing = false;
let playToken = 0;
const listeners = new Set();

function emitPlayState() {
  listeners.forEach((fn) => { try { fn(playing, readStoryVoiceId()); } catch (_) {} });
  try {
    document.dispatchEvent(new CustomEvent('wise:story-voiceover', {
      detail: { playing, voiceId: readStoryVoiceId() },
    }));
  } catch (_) {}
}

export function onStoryVoiceoverChange(fn) {
  if (typeof fn === 'function') listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isStoryVoiceoverPlaying() {
  return playing;
}

export function stopStoryVoiceover() {
  playToken += 1;
  playing = false;
  if (canSpeak()) {
    try { window.speechSynthesis.cancel(); } catch (_) {}
  }
  emitPlayState();
}

function speakChunks(chunks, pref, token) {
  if (!canSpeak() || token !== playToken) return;
  const voice = pickEngineVoice(pref);
  const speakOne = (i) => {
    if (token !== playToken) return;
    if (i >= chunks.length) {
      playing = false;
      emitPlayState();
      return;
    }
    const u = new SpeechSynthesisUtterance(chunks[i]);
    u.rate = pref.rate;
    u.pitch = pref.pitch;
    u.lang = pref.lang || 'en-US';
    if (voice) u.voice = voice;
    u.onend = () => speakOne(i + 1);
    u.onerror = () => {
      if (token !== playToken) return;
      playing = false;
      emitPlayState();
    };
    window.speechSynthesis.speak(u);
  };
  speakOne(0);
}

export function playStoryVoiceover(opts = {}) {
  if (!canSpeak()) return false;
  const id = opts.voiceId || readStoryVoiceId();
  const pref = voiceById(id);
  if (!pref) return false;
  writeStoryVoiceId(id);
  stopStoryVoiceover();
  const token = playToken;
  const script = [pref.intro, storyTextFrom(opts.root)].filter(Boolean).join(' ');
  const chunks = chunkScript(script);
  if (!chunks.length) return false;
  playing = true;
  emitPlayState();
  /* Voices often arrive asynchronously on first use. */
  const start = () => {
    if (token !== playToken) return;
    speakChunks(chunks, pref, token);
  };
  loadVoices();
  if (!cachedVoices.length && canSpeak()) {
    window.speechSynthesis.addEventListener('voiceschanged', start, { once: true });
    setTimeout(start, 180);
  } else {
    start();
  }
  return true;
}

function chatRootFrom(node) {
  if (!node || !node.closest) return document;
  const pop = node.closest('.topbar-popover');
  const host = (pop && pop.__plHost)
    || (pop && pop.__plMarker && pop.__plMarker.parentNode)
    || node.closest('.panel-more-wrap')
    || node.closest('.sc-card, .wa-chat, .wch-chat-anchor');
  return (host && host.closest && host.closest('.sc-card, .wa-chat, .wch-chat-anchor')) || host || document;
}

function findKebab(item) {
  const pop = item && item.closest && item.closest('.topbar-popover');
  const host = (pop && pop.__plHost)
    || (pop && pop.__plMarker && pop.__plMarker.parentNode)
    || (item && item.closest && item.closest('.panel-more-wrap'));
  if (host && host.querySelector) {
    const btn = host.querySelector('.panel-more-btn, [aria-haspopup="menu"]');
    if (btn) return btn;
  }
  return item;
}

function closeChatMenuFrom(item) {
  const pop = item && item.closest && item.closest('.topbar-popover');
  if (pop && !pop.hasAttribute('data-popover-static')) {
    pop.classList.add('hidden');
    pop.classList.remove('open');
  }
  const kebab = findKebab(item);
  if (kebab && kebab !== item) {
    kebab.classList.remove('is-open');
    kebab.setAttribute('aria-expanded', 'false');
    const wrap = kebab.closest('.panel-more-wrap');
    if (wrap) wrap.classList.remove('is-open');
  }
}

function voiceoverMenuHtml() {
  return '<span class="material-symbols-outlined topbar-menu-icon">record_voice_over</span>'
    + '<span class="topbar-menu-copy">'
    + '<span class="topbar-menu-title">Play voiceover</span>'
    + '<span class="topbar-menu-desc" data-voice-label></span>'
    + '</span>';
}

export function injectVoiceoverMenuItem(pop) {
  if (!pop || pop.querySelector('[data-sc="voiceover"]')) return pop ? pop.querySelector('[data-sc="voiceover"]') : null;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'topbar-menu-item';
  btn.setAttribute('data-sc', 'voiceover');
  btn.setAttribute('role', 'menuitem');
  btn.setAttribute('aria-haspopup', 'menu');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = voiceoverMenuHtml();
  const after = pop.querySelector('[data-sc="file-library"]')
    || pop.querySelector('[data-sc="share"], [data-ap="share"]')
    || pop.querySelector('[data-sc="export"], [data-ap="export"]')
    || pop.querySelector('[data-sc="new"], [data-ap="restart"]');
  if (after && after.parentNode) {
    if (after.nextSibling) after.parentNode.insertBefore(btn, after.nextSibling);
    else after.parentNode.appendChild(btn);
  } else {
    pop.insertBefore(btn, pop.firstChild);
  }
  syncVoiceoverMenuItem(btn);
  return btn;
}

export function syncVoiceoverMenuItem(item) {
  if (!item) return;
  const voice = voiceById(readStoryVoiceId());
  const title = item.querySelector('.topbar-menu-title');
  const desc = item.querySelector('[data-voice-label]');
  const on = playing;
  item.classList.toggle('is-voice-playing', on);
  if (title) title.textContent = 'Play voiceover';
  if (desc) desc.textContent = on
    ? ('Playing · ' + (voice ? voice.name : ''))
    : (voice ? voice.name : 'Choose a voice');
  item.setAttribute('aria-label', 'Play voiceover' + (voice ? ' — ' + voice.name : ''));
}

function syncAllMenuItems() {
  document.querySelectorAll('[data-sc="voiceover"]').forEach(syncVoiceoverMenuItem);
}

function pickerHtml() {
  const active = readStoryVoiceId();
  const groups = STORY_VOICES.map((g) => {
    const rows = g.items.map((it) => {
      const on = it.id === active;
      const search = esc(`${it.name} ${it.desc || ''} ${g.label}`.toLowerCase());
      return `<button type="button" class="fl-db-item${on ? ' is-active' : ''}" role="menuitemradio" aria-checked="${on ? 'true' : 'false'}" data-voice="${esc(it.id)}" data-search="${search}">`
        + `<span class="fl-db-meta"><span class="fl-db-name">${esc(it.name)}</span>${it.desc ? `<span class="fl-db-desc">${esc(it.desc)}</span>` : ''}</span>`
        + `<span class="fl-db-badge">${esc(g.badge)}</span>`
        + `<span class="fl-db-check material-symbols-outlined" aria-hidden="true">check</span></button>`;
    }).join('');
    return `<div class="fl-db-group" data-voice-filter="${esc(g.filter)}">`
      + `<div class="fl-db-grouphead">`
      + `<span class="fl-db-grouptitle">${esc(g.label)}</span>`
      + `</div>${rows}</div>`;
  }).join('');
  return `<div class="fl-db-top">`
    + `<div class="fl-db-pop-head">`
    + `<span class="fl-db-pop-title">Voiceover</span>`
    + `<button type="button" class="sc-voice-play" data-voice-play aria-pressed="false">`
    + `<span class="material-symbols-outlined" aria-hidden="true">play_arrow</span>`
    + `<span class="sc-voice-play-label">Play</span>`
    + `</button>`
    + `</div>`
    + `<label class="fl-db-search">`
    + `<span class="material-symbols-outlined" aria-hidden="true">search</span>`
    + `<input type="text" class="fl-db-search-input" placeholder="Search voices\u2026" aria-label="Search voices" autocomplete="off">`
    + `</label>`
    + `<div class="fl-db-filters" role="group" aria-label="Filter voices">`
    + `<button type="button" class="fl-db-chip is-active" data-voice-chip="all">All</button>`
    + `<button type="button" class="fl-db-chip" data-voice-chip="icons">Icons</button>`
    + `<button type="button" class="fl-db-chip" data-voice-chip="creators">Creators</button>`
    + `</div>`
    + `</div>`
    + `<div class="fl-db-scroll">`
    + groups
    + `<div class="fl-db-noresults" hidden>No voices match your search.</div>`
    + `</div>`
    + `<p class="sc-voice-note">Device voices, in their style \u2014 not official likenesses.</p>`;
}

let pickerEl = null;
let pickerAnchor = null;
let pickerRoot = null;

function ensurePicker() {
  if (pickerEl && pickerEl.isConnected) return pickerEl;
  const el = document.createElement('div');
  el.className = 'fl-db-popover sc-voice-pop';
  el.setAttribute('role', 'menu');
  el.setAttribute('aria-label', 'Choose a voiceover');
  el.innerHTML = pickerHtml();
  document.body.appendChild(el);
  pickerEl = el;
  wirePicker(el);
  return el;
}

function placePicker(anchor) {
  const panel = ensurePicker();
  if (!anchor || !panel) return;
  const r = anchor.getBoundingClientRect();
  const pw = panel.offsetWidth || 360;
  const ph = panel.offsetHeight || 420;
  const gap = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  /* Prefer above the kebab; if that clips, sit to its left (then right).
     Never hang directly under the trigger, and never cover the kebab. */
  const maxH = Math.min(ph, vh - 16);
  let top = r.top - maxH - gap;
  let left = r.left - pw - gap;
  if (top >= 8) {
    left = Math.max(8, Math.min(r.right - pw, vw - pw - 8));
  } else {
    top = Math.max(8, Math.min(r.top, vh - maxH - 8));
    if (left < 8) left = r.right + gap;
    if (left + pw > vw - 8) left = Math.max(8, vw - pw - 8);
  }
  panel.style.position = 'fixed';
  panel.style.left = Math.round(left) + 'px';
  panel.style.top = Math.round(top) + 'px';
  panel.style.right = 'auto';
  panel.style.bottom = 'auto';
  panel.style.zIndex = '2147483646';
}

function syncPickerChrome() {
  if (!pickerEl) return;
  const active = readStoryVoiceId();
  pickerEl.querySelectorAll('[data-voice]').forEach((row) => {
    const on = row.getAttribute('data-voice') === active;
    row.classList.toggle('is-active', on);
    row.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  const play = pickerEl.querySelector('[data-voice-play]');
  if (play) {
    play.classList.toggle('is-on', playing);
    play.setAttribute('aria-pressed', playing ? 'true' : 'false');
    play.setAttribute('aria-label', playing ? 'Stop voiceover' : 'Play voiceover');
    const ic = play.querySelector('.material-symbols-outlined');
    const lab = play.querySelector('.sc-voice-play-label');
    if (ic) ic.textContent = playing ? 'stop' : 'play_arrow';
    if (lab) lab.textContent = playing ? 'Stop' : 'Play';
  }
}

function applyPickerFilter() {
  if (!pickerEl) return;
  const q = ((pickerEl.querySelector('.fl-db-search-input') || {}).value || '').trim().toLowerCase();
  const chip = pickerEl.querySelector('.fl-db-chip.is-active');
  const filter = (chip && chip.getAttribute('data-voice-chip')) || 'all';
  let shown = 0;
  pickerEl.querySelectorAll('.fl-db-group').forEach((g) => {
    const groupKey = g.getAttribute('data-voice-filter');
    const groupOk = filter === 'all' || filter === groupKey;
    let groupShown = 0;
    g.querySelectorAll('[data-voice]').forEach((row) => {
      const hay = row.getAttribute('data-search') || '';
      const ok = groupOk && (!q || hay.indexOf(q) !== -1);
      row.hidden = !ok;
      if (ok) { groupShown += 1; shown += 1; }
    });
    g.hidden = groupShown === 0;
  });
  const empty = pickerEl.querySelector('.fl-db-noresults');
  if (empty) empty.hidden = shown > 0;
}

function wirePicker(el) {
  if (!el || el.dataset.wired === '1') return;
  el.dataset.wired = '1';
  el.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-voice-chip]');
    if (chip) {
      el.querySelectorAll('[data-voice-chip]').forEach((c) => c.classList.toggle('is-active', c === chip));
      applyPickerFilter();
      return;
    }
    const play = e.target.closest('[data-voice-play]');
    if (play) {
      if (playing) stopStoryVoiceover();
      else playStoryVoiceover({ root: pickerRoot });
      return;
    }
    const row = e.target.closest('[data-voice]');
    if (!row) return;
    const id = row.getAttribute('data-voice');
    if (!id) return;
    writeStoryVoiceId(id);
    syncPickerChrome();
    syncAllMenuItems();
    playStoryVoiceover({ voiceId: id, root: pickerRoot });
  });
  const input = el.querySelector('.fl-db-search-input');
  if (input) input.addEventListener('input', applyPickerFilter);
}

export function closeVoiceoverPicker() {
  if (!pickerEl) return;
  pickerEl.classList.remove('open');
  pickerAnchor = null;
  document.querySelectorAll('[data-sc="voiceover"]').forEach((el) => {
    el.setAttribute('aria-expanded', 'false');
  });
}

export function openVoiceoverPicker(item) {
  const anchor = findKebab(item) || item;
  const root = chatRootFrom(item);
  pickerRoot = root;
  pickerAnchor = anchor;
  closeChatMenuFrom(item);
  const panel = ensurePicker();
  syncPickerChrome();
  applyPickerFilter();
  panel.classList.add('open');
  if (item && item.setAttribute) item.setAttribute('aria-expanded', 'true');
  placePicker(anchor);
  requestAnimationFrame(() => placePicker(anchor));
  const input = panel.querySelector('.fl-db-search-input');
  if (input) setTimeout(() => { try { input.focus(); } catch (_) {} }, 30);
}

export function toggleStoryVoiceoverFromMenu(item) {
  if (pickerEl && pickerEl.classList.contains('open')) {
    closeVoiceoverPicker();
    return;
  }
  openVoiceoverPicker(item);
}

function injectExtrasCss() {
  if (typeof document === 'undefined' || document.getElementById('wise-story-voiceover-css')) return;
  const css = document.createElement('style');
  css.id = 'wise-story-voiceover-css';
  css.textContent = `
    .sc-voice-pop { display: none; flex-direction: column; gap: 0; padding: 0;
      min-width: 340px; max-width: 380px; z-index: 2147483646;
      background: var(--surface); border: 1px solid var(--border-strong); border-radius: 14px;
      box-shadow: var(--shadow-3, var(--sc-shadow-pop)); overflow: hidden; }
    html.dark .sc-voice-pop { background: #1A2339; border-color: rgba(37,80,124,0.22); }
    .sc-voice-pop.open { display: flex; max-height: min(560px, calc(100vh - 16px)); }
    .sc-voice-pop .fl-db-scroll { flex: 1 1 auto; max-height: none; min-height: 0; }
    .sc-voice-play {
      flex-shrink: 0; display: inline-flex; align-items: center; gap: 5px;
      height: 30px; padding: 0 11px 0 8px; border: 0; border-radius: 999px;
      background: var(--primary); color: #fff; cursor: pointer; font: inherit;
      font-size: 12px; font-weight: 700; line-height: 1;
    }
    .sc-voice-play .material-symbols-outlined {
      font-size: 18px; font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }
    .sc-voice-play:hover { background: color-mix(in srgb, var(--primary) 86%, black); color: #fff; }
    .sc-voice-play.is-on { background: var(--sec-red, #DC3038); }
    .sc-voice-play.is-on:hover { background: color-mix(in srgb, var(--sec-red, #DC3038) 86%, black); }
    .sc-voice-note {
      margin: 0; padding: 8px 12px 10px; font-size: 11px; line-height: 1.4;
      color: var(--text-subtle); border-top: 1px solid var(--border);
    }
    .topbar-menu-item.is-voice-playing .topbar-menu-icon {
      color: var(--primary-ink, var(--primary));
      font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }
    html.dark .topbar-menu-item.is-voice-playing .topbar-menu-icon { color: #7fb0ff; }
  `;
  document.head.appendChild(css);
}

export function wireStoryVoiceover() {
  if (typeof document === 'undefined' || document.documentElement.dataset.storyVoiceWired === '1') return;
  document.documentElement.dataset.storyVoiceWired = '1';
  injectExtrasCss();
  if (canSpeak()) {
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
  }
  document.addEventListener('click', (e) => {
    const item = e.target.closest('[data-sc="voiceover"]');
    if (item) {
      /* Specimens in All Modules stay inert. */
      if (item.closest('[data-popover-static], [data-chat-menu-demo]')) return;
      e.preventDefault();
      toggleStoryVoiceoverFromMenu(item);
      return;
    }
    if (pickerEl && pickerEl.classList.contains('open')) {
      if (pickerEl.contains(e.target)) return;
      if (e.target.closest('[data-sc="voiceover"]')) return;
      closeVoiceoverPicker();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && pickerEl && pickerEl.classList.contains('open')) {
      closeVoiceoverPicker();
    }
  }, true);
  const refresh = () => {
    if (pickerEl && pickerEl.classList.contains('open') && pickerAnchor) placePicker(pickerAnchor);
  };
  window.addEventListener('resize', refresh);
  window.addEventListener('scroll', refresh, true);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopStoryVoiceover();
  });
  onStoryVoiceoverChange(() => {
    syncPickerChrome();
    syncAllMenuItems();
  });
  syncAllMenuItems();
}
