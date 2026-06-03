/* ------------------------------------------------------------------ */
/* WISE Jam Strip                                                      */
/* ------------------------------------------------------------------ */
/*
 * When the navigation is collapsed to the Minimal-UI top bar, the long
 * stretch where the nav icons used to live sits empty. This module fills
 * that gap with a fun, musical "pump up the jam" strip: an animated
 * equalizer, a scrolling hype ticker, and a row of branded tracks you can
 * play right in the bar.
 *
 * The tunes are synthesized live with the Web Audio API (no audio files /
 * licensing needed) so the riffs ship as a few lines of note data:
 *   - "Axel F"        the Axel Foley / Beverly Hills Cop theme
 *   - "Ode to Joy"    Beethoven
 *   - "Nachtmusik"    Mozart · Eine kleine Nachtmusik
 *   - "Toccata"       Bach · Toccata in D minor
 *
 * The strip mounts into #menu-panel .menu-inner and is CSS-gated so it
 * only shows when the panel is BOTH pivoted (horizontal top bar) and in
 * Minimal UI. Nothing autoplays — audio starts only on a click.
 */

/* ---- Note helpers -------------------------------------------------- */

const A4_HZ = 440;
const SEMITONES = {
  C: -9, 'C#': -8, Db: -8, D: -7, 'D#': -6, Eb: -6, E: -5, F: -4,
  'F#': -3, Gb: -3, G: -2, 'G#': -1, Ab: -1, A: 0, 'A#': 1, Bb: 1, B: 2,
};

/** Note name ("F4", "C#5", "Eb4") → frequency in Hz. null/rest → 0. */
function noteFreq(name) {
  if (!name) return 0;
  const m = /^([A-G][#b]?)(\d)$/.exec(name);
  if (!m) return 0;
  const semis = SEMITONES[m[1]] + (parseInt(m[2], 10) - 4) * 12;
  return A4_HZ * Math.pow(2, semis / 12);
}

/* ---- Track library -------------------------------------------------- */
/* Each note is [name|null, beats]. Rests use a null name. */

const SONGS = {
  axelf: {
    label: 'Axel F',
    bpm: 118,
    type: 'square',
    notes: [
      ['F4', 0.75], ['Ab4', 0.5], ['F4', 0.25], ['F4', 0.5], ['Bb4', 0.5], ['F4', 0.5], ['Eb4', 0.5],
      ['F4', 0.75], ['C5', 0.5], ['F4', 0.25], ['F4', 0.5], ['Db5', 0.5], ['C5', 0.5], ['Ab4', 0.5],
      ['F4', 0.5], ['C5', 0.5], ['F5', 0.5], ['F4', 0.25], ['Eb4', 0.25], ['Eb4', 0.25], ['C5', 0.5], ['G4', 0.5],
      ['F4', 1.0], [null, 0.5],
    ],
  },
  ode: {
    label: 'Ode to Joy',
    bpm: 120,
    type: 'triangle',
    notes: [
      ['E4', 1], ['E4', 1], ['F4', 1], ['G4', 1],
      ['G4', 1], ['F4', 1], ['E4', 1], ['D4', 1],
      ['C4', 1], ['C4', 1], ['D4', 1], ['E4', 1],
      ['E4', 1.5], ['D4', 0.5], ['D4', 2],
      [null, 0.5],
    ],
  },
  nacht: {
    label: 'Nachtmusik',
    bpm: 132,
    type: 'square',
    notes: [
      ['G4', 0.5], ['D4', 0.5], ['G4', 0.5], ['D4', 0.5], ['G4', 0.25], ['D4', 0.25], ['G4', 0.5], [null, 0.5],
      ['D5', 0.5], ['A4', 0.5], ['D5', 0.5], ['A4', 0.5], ['D5', 0.25], ['A4', 0.25], ['D5', 0.5], [null, 0.5],
    ],
  },
  toccata: {
    label: 'Toccata',
    bpm: 100,
    type: 'sawtooth',
    notes: [
      ['A4', 0.25], ['G4', 0.25], ['A4', 1.0], [null, 0.25],
      ['G4', 0.125], ['F4', 0.125], ['E4', 0.125], ['D4', 0.125], ['C#4', 0.25], ['D4', 1.0], [null, 0.5],
    ],
  },
};

const SONG_ORDER = ['axelf', 'ode', 'nacht', 'toccata'];

const HYPE_LINES = [
  'PUMP UP THE JAM',
  'Crank the WISE beat',
  'Turn it up to eleven',
  'Let the rhythm move you',
  'Feel the intelligence groove',
  'Press play and vibe',
];

/* ---- Tiny synth ----------------------------------------------------- */

const player = {
  ctx: null,
  master: null,
  songId: null,
  playing: false,
  voices: [],     // live oscillator/gain nodes (for an instant stop)
  loopTimer: null,
  onState: null,  // callback(playing, songId) for the UI
};

function ensureContext() {
  if (player.ctx) return player.ctx;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  player.ctx = new Ctx();
  player.master = player.ctx.createGain();
  player.master.gain.value = 0.5;
  // Soften the chiptune edge so it sits nicely behind a UI.
  const filter = player.ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2600;
  player.master.connect(filter);
  filter.connect(player.ctx.destination);
  return player.ctx;
}

/** Schedule a single note (lead square + soft sine body) with an envelope. */
function playNote(freq, t0, durSec, type) {
  if (!freq) return;
  const ctx = player.ctx;
  const gain = ctx.createGain();
  gain.connect(player.master);

  const peak = 0.22;
  const sustain = 0.15;
  const playFor = Math.max(0.05, durSec * 0.92);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(sustain, t0 + 0.08);
  gain.gain.setValueAtTime(sustain, t0 + playFor - 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + playFor);

  const lead = ctx.createOscillator();
  lead.type = type;
  lead.frequency.value = freq;
  lead.connect(gain);

  const body = ctx.createOscillator();
  body.type = 'sine';
  body.frequency.value = freq / 2;
  const bodyGain = ctx.createGain();
  bodyGain.gain.value = 0.5;
  body.connect(bodyGain);
  bodyGain.connect(gain);

  lead.start(t0);
  body.start(t0);
  lead.stop(t0 + playFor + 0.02);
  body.stop(t0 + playFor + 0.02);

  player.voices.push(lead, body);
  const drop = () => {
    player.voices = player.voices.filter((v) => v !== lead && v !== body);
  };
  lead.onended = drop;
}

/** Schedule the whole song once; returns its total duration in seconds. */
function scheduleSong(songId, startAt) {
  const song = SONGS[songId];
  const beat = 60 / song.bpm;
  let t = startAt;
  for (const [name, beats] of song.notes) {
    const dur = beats * beat;
    if (name) playNote(noteFreq(name), t, dur, song.type);
    t += dur;
  }
  return t - startAt;
}

function stopVoices() {
  const ctx = player.ctx;
  for (const v of player.voices) {
    try { v.stop(ctx ? ctx.currentTime : 0); } catch (_) {}
  }
  player.voices = [];
}

function play(songId) {
  const ctx = ensureContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();

  stopVoices();
  clearTimeout(player.loopTimer);

  player.songId = songId;
  player.playing = true;
  player.onState?.(true, songId);

  const loop = () => {
    if (!player.playing) return;
    const dur = scheduleSong(songId, player.ctx.currentTime + 0.06);
    player.loopTimer = setTimeout(loop, Math.max(400, dur * 1000));
  };
  loop();
}

function stop() {
  player.playing = false;
  clearTimeout(player.loopTimer);
  stopVoices();
  player.onState?.(false, player.songId);
}

function toggle(songId) {
  if (player.playing && (!songId || songId === player.songId)) {
    stop();
  } else {
    play(songId || player.songId || SONG_ORDER[0]);
  }
}

/* ---- DOM ------------------------------------------------------------ */

const EQ_BARS = 16;

function buildStrip() {
  const strip = document.createElement('div');
  strip.className = 'jam-strip';
  strip.setAttribute('role', 'group');
  strip.setAttribute('aria-label', 'WISE jam bar — play a tune');

  const eqBars = Array.from({ length: EQ_BARS }, () => '<span></span>').join('');
  const ticker = HYPE_LINES
    .map((line) => `<span class="jam-hype">${line}</span><span class="jam-dot material-icons">music_note</span>`)
    .join('');

  const songChips = SONG_ORDER
    .map((id) => `<button type="button" class="jam-song" data-song="${id}">${SONGS[id].label}</button>`)
    .join('');

  strip.innerHTML = `
    <button type="button" class="jam-play" data-jam-toggle aria-label="Play the jam" title="Play / pause">
      <span class="material-icons jam-play-icon">play_arrow</span>
    </button>
    <div class="jam-eq" aria-hidden="true">${eqBars}</div>
    <div class="jam-marquee" aria-hidden="true">
      <div class="jam-marquee-track">${ticker}${ticker}</div>
    </div>
    <div class="jam-songs" role="group" aria-label="Pick a track">${songChips}</div>`;

  wireStrip(strip);
  return strip;
}

function wireStrip(strip) {
  const playBtn = strip.querySelector('[data-jam-toggle]');
  const playIcon = strip.querySelector('.jam-play-icon');

  const syncUi = (playing, songId) => {
    strip.classList.toggle('is-playing', playing);
    if (playIcon) playIcon.textContent = playing ? 'pause' : 'play_arrow';
    if (playBtn) {
      playBtn.setAttribute('aria-label', playing ? 'Pause the jam' : 'Play the jam');
      playBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    }
    strip.querySelectorAll('.jam-song').forEach((chip) => {
      chip.classList.toggle('is-active', playing && chip.dataset.song === songId);
    });
  };
  player.onState = syncUi;

  playBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });

  strip.querySelectorAll('.jam-song').forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle(chip.dataset.song);
    });
  });
}

/* ---- Enable / disable (Appearance popover toggle) ------------------- */
/* The jam strip can be switched off from the Appearance (crossword) popover,
   just like Minimal UI. When off, a `jam-off` class on #menu-panel hides the
   strip (CSS) and any playback is stopped. The choice persists across pages. */
/* v2 key — the v1 key got auto-written to "1" on restore (back when the strip
   defaulted on), so a fresh key guarantees the off-by-default actually sticks. */
const JAM_KEY = 'wise-jam-strip-v2';

/** True only when the user explicitly turned the jam strip on (default off). */
export function isJamStripOn() {
  try { return localStorage.getItem(JAM_KEY) === '1'; } catch { return false; }
}

/**
 * Reflect the on/off choice onto the panel.
 * @param {boolean} on
 * @param {boolean} [persist=true]  Only an explicit user toggle persists; the
 *   initial restore must NOT write, or it would lock in a default forever.
 */
export function applyJamStrip(on, persist = true) {
  const panel = document.getElementById('menu-panel');
  if (panel) panel.classList.toggle('jam-off', !on);
  if (persist) { try { localStorage.setItem(JAM_KEY, on ? '1' : '0'); } catch (_) {} }
  if (!on && player.playing) stop();
}

/** Restore the persisted on/off state onto the panel (without persisting). */
export function restoreJamStrip() {
  applyJamStrip(isJamStripOn(), false);
}

/** Insert the strip into the nav panel's inner row, once. */
export function mountJamStrip() {
  const inner = document.querySelector('#menu-panel .menu-inner');
  if (!inner || inner.querySelector('.jam-strip')) return;

  const strip = buildStrip();
  const body = inner.querySelector('.menu-panel-body');
  if (body && body.nextSibling) inner.insertBefore(strip, body.nextSibling);
  else if (body) body.after(strip);
  else inner.appendChild(strip);

  restoreJamStrip();

  // Stop the music if the user leaves Minimal UI (the strip hides).
  const panel = document.getElementById('menu-panel');
  if (panel && !panel.dataset.jamObserved) {
    panel.dataset.jamObserved = '1';
    new MutationObserver(() => {
      const visible = panel.classList.contains('minimal-ui') && panel.classList.contains('mp-pivot');
      if (!visible && player.playing) stop();
    }).observe(panel, { attributes: true, attributeFilter: ['class'] });
  }
}

if (typeof document !== 'undefined') {
  const start = () => {
    mountJamStrip();
    // The brand bar / panel can be (re)built after load; retry briefly so the
    // strip lands once .menu-inner exists.
    if (!document.querySelector('#menu-panel .jam-strip')) {
      const obs = new MutationObserver(() => {
        if (document.querySelector('#menu-panel .menu-inner')) {
          mountJamStrip();
          if (document.querySelector('#menu-panel .jam-strip')) obs.disconnect();
        }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => obs.disconnect(), 8000);
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}
