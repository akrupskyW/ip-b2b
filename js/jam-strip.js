/* ------------------------------------------------------------------ */
/* WISE Jam Strip                                                      */
/* ------------------------------------------------------------------ */
/*
 * When the navigation is collapsed to the Minimal-UI top bar, the long
 * stretch where the nav icons used to live sits empty. This module fills
 * that gap with a fun, musical "pump up the jam" strip: a wide animated
 * equalizer and a row of branded tracks you can play right in the bar.
 *
 * The tunes are synthesized live with the Web Audio API (no audio files /
 * licensing needed) so each riff ships as a few lines of note data. The
 * library is a crate of certified bangers — recognizable hooks that read
 * instantly even as a bare monophonic chiptune:
 *   - "Pump Up the Jam"  Technotronic
 *   - "Axel F"           the Axel Foley / Beverly Hills Cop theme
 *   - "Ode to Joy"       Beethoven
 *   - "Sonic"            Sonic the Hedgehog · Green Hill Zone melody
 *   - "Mario"            Super Mario Bros · the overworld theme
 *   - "Tetris"           Korobeiniki · the Tetris Type-A theme
 *   - "Imperial March"   Star Wars · the Darth Vader theme
 *   - "7 Nation Army"    The White Stripes · the stadium riff
 *   - "Smoke/Water"      Deep Purple · Smoke on the Water riff
 *   - "Megalovania"      Undertale
 *   - "Nokia"            Gran Vals · the Nokia ringtone
 *   - "Pirates"          Pirates of the Caribbean · He's a Pirate
 *   - "Take On Me"       a-ha · the synth hook
 *   - "Jump Around"      House of Pain · the horn-squeal hook
 *   - "Sabotage"         Beastie Boys · the fuzz-bass riff
 *   - "Never Gonna…"     Rick Astley · Never Gonna Give You Up
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
  pump: {
    label: 'Pump Up the Jam',
    bpm: 125,
    type: 'sawtooth',
    notes: [
      ['C5', 0.5], ['Eb5', 0.5], ['F5', 0.5], ['G5', 0.5], ['Ab5', 0.5], ['G5', 0.5], ['F5', 0.5], ['Eb5', 0.5],
      ['C5', 0.5], ['C5', 0.25], ['C5', 0.25], ['Eb5', 0.5], ['F5', 0.5], ['G5', 0.5], ['Eb5', 0.5],
      ['C5', 1.0], [null, 0.5],
    ],
  },
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
  sonic: {
    label: 'Sonic',
    bpm: 160,
    type: 'square',
    notes: [
      // Green Hill Zone — main theme (Masato Nakamura), key of C.
      ['C5', 0.5], ['A4', 0.5], ['C5', 0.5], ['B4', 0.5], ['C5', 0.5], ['B4', 0.5], ['G4', 1.0],
      ['G4', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['B4', 0.5], ['C5', 0.5], ['B4', 0.5], ['G4', 0.5],
      ['C5', 0.5], ['A4', 0.5], ['C5', 0.5], ['B4', 0.5], ['C5', 1.5], [null, 0.5],
      ['B4', 0.5], ['G4', 1.0], ['A4', 0.5], ['A4', 0.5], ['F4', 0.5], ['A4', 1.0],
      ['G4', 0.5], ['A4', 0.5], ['G4', 0.5], ['C5', 2.5],
      ['A4', 1.0], ['B4', 1.0], ['B4', 1.0], ['G4', 1.0],
      ['A4', 0.5], ['G4', 0.5], ['C5', 0.5], ['C5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1.0], [null, 0.5],
    ],
  },
  mario: {
    label: 'Mario',
    bpm: 180,
    type: 'square',
    notes: [
      // Super Mario Bros. — overworld theme (Koji Kondo), key of C.
      ['E5', 0.5], ['E5', 0.5], [null, 0.5], ['E5', 0.5], [null, 0.5], ['C5', 0.5], ['E5', 0.5], [null, 0.5],
      ['G5', 0.5], [null, 1.5], ['G4', 0.5], [null, 1.5],
      ['C5', 0.5], [null, 1.0], ['G4', 0.5], [null, 1.0], ['E4', 0.5], [null, 1.0],
      ['A4', 0.5], [null, 0.5], ['B4', 0.5], [null, 0.5], ['Bb4', 0.5], ['A4', 0.5], [null, 0.5],
      ['G4', 0.5], ['E5', 0.5], ['G5', 0.5], ['A5', 0.5], [null, 0.5], ['F5', 0.5], ['G5', 0.5], [null, 0.5],
      ['E5', 0.5], [null, 0.5], ['C5', 0.5], ['D5', 0.5], ['B4', 0.5], [null, 1.0],
    ],
  },
  tetris: {
    label: 'Tetris',
    bpm: 144,
    type: 'square',
    notes: [
      ['E5', 1.0], ['B4', 0.5], ['C5', 0.5], ['D5', 1.0], ['C5', 0.5], ['B4', 0.5],
      ['A4', 1.0], ['A4', 0.5], ['C5', 0.5], ['E5', 1.0], ['D5', 0.5], ['C5', 0.5],
      ['B4', 1.5], ['C5', 0.5], ['D5', 1.0], ['E5', 1.0],
      ['C5', 1.0], ['A4', 1.0], ['A4', 2.0], [null, 0.5],
    ],
  },
  imperial: {
    label: 'Imperial March',
    bpm: 104,
    type: 'square',
    notes: [
      // Star Wars — the Imperial (Darth Vader) march (John Williams), key Gm.
      ['G4', 0.75], ['G4', 0.75], ['G4', 0.75], ['Eb4', 0.5], ['Bb4', 0.25],
      ['G4', 0.75], ['Eb4', 0.5], ['Bb4', 0.25], ['G4', 1.5], [null, 0.5],
      ['D5', 0.75], ['D5', 0.75], ['D5', 0.75], ['Eb5', 0.5], ['Bb4', 0.25],
      ['Gb4', 0.75], ['Eb4', 0.5], ['Bb4', 0.25], ['G4', 1.5], [null, 0.5],
    ],
  },
  seven: {
    label: '7 Nation Army',
    bpm: 124,
    type: 'sawtooth',
    notes: [
      // The White Stripes — Seven Nation Army, the stadium bass riff, key Em.
      ['E4', 1.0], ['E4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 1.0], ['C4', 1.5], ['B3', 1.5],
      ['E4', 1.0], ['E4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 1.0], ['C4', 1.0], ['B3', 1.0],
      [null, 0.5],
    ],
  },
  smoke: {
    label: 'Smoke/Water',
    bpm: 112,
    type: 'sawtooth',
    notes: [
      // Deep Purple — Smoke on the Water, the four-note riff, key Gm.
      ['G4', 0.5], ['Bb4', 0.5], ['C5', 0.75], ['G4', 0.5], ['Bb4', 0.5], ['Db5', 0.25], ['C5', 1.0], [null, 0.25],
      ['G4', 0.5], ['Bb4', 0.5], ['C5', 0.75], ['Bb4', 0.5], ['G4', 1.0], [null, 0.5],
    ],
  },
  megalovania: {
    label: 'Megalovania',
    bpm: 120,
    type: 'square',
    notes: [
      // Undertale — Megalovania (Toby Fox), the intro riff, key Dm.
      ['D4', 0.25], ['D4', 0.25], ['D5', 0.5], ['A4', 0.5], [null, 0.25], ['Ab4', 0.5], [null, 0.25], ['G4', 0.5], ['F4', 0.5], ['D4', 0.25], ['F4', 0.25], ['G4', 0.5],
      ['C4', 0.25], ['C4', 0.25], ['D5', 0.5], ['A4', 0.5], [null, 0.25], ['Ab4', 0.5], [null, 0.25], ['G4', 0.5], ['F4', 0.5], ['D4', 0.25], ['F4', 0.25], ['G4', 0.5],
      [null, 0.5],
    ],
  },
  nokia: {
    label: 'Nokia',
    bpm: 150,
    type: 'square',
    notes: [
      // Gran Vals (Tárrega) — the Nokia ringtone.
      ['E5', 0.25], ['D5', 0.25], ['F#4', 0.5], ['G#4', 0.5],
      ['C#5', 0.25], ['B4', 0.25], ['D4', 0.5], ['E4', 0.5],
      ['B4', 0.25], ['A4', 0.25], ['C#4', 0.5], ['E4', 0.5], ['A4', 1.0], [null, 0.5],
    ],
  },
  pirates: {
    label: 'Pirates',
    bpm: 140,
    type: 'square',
    notes: [
      // Pirates of the Caribbean — He's a Pirate (Zimmer/Badelt), key Dm.
      ['A4', 0.5], ['A4', 0.25], ['A4', 0.25], ['A4', 0.5], ['C5', 0.25], ['D5', 0.5], ['D5', 0.25], ['D5', 0.25], ['D5', 0.5], ['E5', 0.25],
      ['F5', 0.5], ['F5', 0.25], ['F5', 0.25], ['F5', 0.5], ['E5', 0.25], ['E5', 0.25], ['D5', 0.25], ['C5', 0.25], ['C5', 0.5], ['B4', 0.25], ['A4', 0.5], ['A4', 0.5],
      [null, 0.5],
    ],
  },
  takeonme: {
    label: 'Take On Me',
    bpm: 170,
    type: 'square',
    notes: [
      // a-ha — Take On Me, the synth hook, key A.
      ['F#5', 0.5], ['F#5', 0.5], ['D5', 0.5], ['B4', 0.5], ['B4', 0.5], ['E5', 0.5], ['E5', 0.5], ['E5', 0.5],
      ['G#5', 0.5], ['G#5', 0.5], ['A5', 0.5], ['B5', 0.5], ['A5', 0.5], ['A5', 0.5], ['A5', 0.5], ['E5', 0.5],
      ['D5', 0.5], ['F#5', 0.5], ['F#5', 0.5], ['F#5', 0.5], ['E5', 0.5], ['E5', 0.5], ['F#5', 0.5], ['E5', 0.5],
      [null, 0.5],
    ],
  },
  jumparound: {
    label: 'Jump Around',
    bpm: 107,
    type: 'square',
    notes: [
      // House of Pain — Jump Around, the squealing horn-sample hook, up high.
      ['E5', 0.5], ['G5', 0.25], ['E5', 0.25], ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5],
      ['D5', 0.5], ['E5', 0.25], ['D5', 0.25], ['C5', 0.5], ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 1.0],
      [null, 0.5],
    ],
  },
  sabotage: {
    label: 'Sabotage',
    bpm: 116,
    type: 'sawtooth',
    notes: [
      // Beastie Boys — Sabotage, the fuzzed-out driving bass riff, key Em.
      ['E3', 0.5], ['E3', 0.25], ['E3', 0.25], ['G3', 0.5], ['E3', 0.5], ['A3', 0.5], ['G3', 0.5], ['E3', 0.5], ['D3', 0.5],
      ['E3', 0.5], ['E3', 0.25], ['G3', 0.25], ['A3', 0.5], ['B3', 0.5], ['A3', 0.5], ['G3', 0.5], ['E3', 1.0],
      [null, 0.5],
    ],
  },
  rickroll: {
    label: 'Never Gonna…',
    bpm: 113,
    type: 'square',
    notes: [
      // Rick Astley — Never Gonna Give You Up, the chorus hook.
      ['G4', 0.25], ['A4', 0.25], ['C5', 0.25], ['A4', 0.25], ['E5', 0.75], ['E5', 0.75], ['D5', 1.0], [null, 0.25],
      ['G4', 0.25], ['A4', 0.25], ['C5', 0.25], ['A4', 0.25], ['D5', 0.75], ['D5', 0.75], ['C5', 0.5], ['B4', 0.25], ['A4', 0.5], [null, 0.25],
      ['G4', 0.25], ['A4', 0.25], ['C5', 0.25], ['A4', 0.25], ['C5', 0.5], ['D5', 0.5], ['B4', 0.25], ['A4', 0.25], ['G4', 0.5], ['G4', 0.25], ['D5', 0.5], ['C5', 1.0],
      [null, 0.5],
    ],
  },
};

const SONG_ORDER = [
  'pump', 'axelf', 'ode', 'sonic', 'mario', 'tetris',
  'imperial', 'seven', 'smoke', 'megalovania', 'nokia', 'pirates', 'takeonme',
  'jumparound', 'sabotage', 'rickroll',
];

/* ---- Tiny synth ----------------------------------------------------- */

const player = {
  ctx: null,
  master: null,
  analyser: null, // taps the master output so the EQ can react to real sound
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
  // Analyser taps the master (pre-filter) so the visualizer sees the full,
  // lively spectrum of whatever is playing. It reads only — it never feeds the
  // destination, so it can't colour the audio.
  const analyser = player.ctx.createAnalyser();
  analyser.fftSize = 1024;            // ~43 Hz/bin — fine enough for the melody
  analyser.smoothingTimeConstant = 0.72;
  player.master.connect(analyser);
  player.analyser = analyser;
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

/* ---- Sound-reactive equalizer -------------------------------------- */
/* The EQ bars (.jam-pop-eq / .jam-eq) idle on a CSS shimmer, but while a tune
   is playing we drive them from the AnalyserNode's live frequency data so the
   levels actually rise and fall with the music. We add an `is-live` class to
   each bar group (CSS then drops its keyframe animation and reads the per-bar
   `--lvl` for opacity + glow) and write scaleY inline every frame. */

const viz = { raf: 0, data: null };

function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch (_) { return false; }
}

/** Peak level (0..1) for bar `i` of `n`, from a log-spaced slice of the FFT so
    low and high bars both feel responsive rather than clumping in the bass. */
function barLevel(data, i, n) {
  const lowBin = 2;
  const highBin = Math.min(data.length - 1, 110);
  const span = highBin / lowBin;
  const b0 = Math.floor(lowBin * Math.pow(span, i / n));
  const b1 = Math.max(b0 + 1, Math.floor(lowBin * Math.pow(span, (i + 1) / n)));
  let peak = 0;
  for (let b = b0; b < b1 && b < data.length; b++) {
    if (data[b] > peak) peak = data[b];
  }
  return peak / 255;
}

function paintEq(container, data) {
  container.classList.add('is-live');
  const bars = container.children;
  const n = bars.length;
  if (!n) return;
  for (let i = 0; i < n; i++) {
    const bar = bars[i];
    const raw = barLevel(data, i, n);
    // Gentle curve for punch, then attack fast / release slow so the bars snap
    // up on a beat and glide back down instead of flickering.
    const target = 0.16 + 0.84 * Math.pow(raw, 0.72);
    const prev = bar._lvl || 0.16;
    const v = prev + (target - prev) * (target > prev ? 0.6 : 0.16);
    bar._lvl = v;
    bar.style.transform = `scaleY(${v.toFixed(3)})`;
    bar.style.setProperty('--lvl', v.toFixed(3));
  }
}

function vizFrame() {
  if (!player.playing || !player.analyser) { viz.raf = 0; return; }
  player.analyser.getByteFrequencyData(viz.data);
  const groups = document.querySelectorAll('.jam-pop-eq, .jam-eq');
  for (const g of groups) paintEq(g, viz.data);
  viz.raf = requestAnimationFrame(vizFrame);
}

function startViz() {
  if (viz.raf || prefersReducedMotion()) return;
  if (!player.analyser) return;
  viz.data = new Uint8Array(player.analyser.frequencyBinCount);
  viz.raf = requestAnimationFrame(vizFrame);
}

function stopViz() {
  if (viz.raf) cancelAnimationFrame(viz.raf);
  viz.raf = 0;
  // Hand the bars back to the CSS idle shimmer.
  document.querySelectorAll('.jam-pop-eq.is-live, .jam-eq.is-live').forEach((g) => {
    g.classList.remove('is-live');
    for (const bar of g.children) {
      bar.style.transform = '';
      bar.style.removeProperty('--lvl');
      bar._lvl = 0;
    }
  });
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
  emitJamState();
  startViz();

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
  stopViz();
  player.onState?.(false, player.songId);
  emitJamState();
}

function toggle(songId) {
  if (player.playing && (!songId || songId === player.songId)) {
    stop();
  } else {
    play(songId || player.songId || SONG_ORDER[0]);
  }
}

/* ---- Popover player API --------------------------------------------- */
/* The player UI now lives INSIDE the Appearance popover (not the nav module),
   so the transport + track list are driven from there. These exports give that
   UI the song catalogue, the play/stop transport, the current state, and a
   subscription so the open popover can reflect play/stop as it happens. */
export const JAM_SONGS = SONG_ORDER.map((id) => ({ id, label: SONGS[id].label }));

let jamStateSubs = [];
function emitJamState() {
  const snap = { playing: player.playing, songId: player.songId };
  for (const cb of jamStateSubs) { try { cb(snap); } catch (_) {} }
}
/** Subscribe to play/stop/track changes. Returns an unsubscribe function. */
export function onJamState(cb) {
  if (typeof cb !== 'function') return () => {};
  jamStateSubs.push(cb);
  return () => { jamStateSubs = jamStateSubs.filter((x) => x !== cb); };
}
/** Play a track (or resume the last), toggling it off if it's already playing. */
export function toggleJam(songId) { toggle(songId); }
export function playJam(songId) { play(songId || player.songId || SONG_ORDER[0]); }
export function stopJam() { stop(); }
export function isJamPlaying() { return !!player.playing; }
export function currentJamSongId() { return player.songId || null; }
export function currentJamSongLabel() { return player.songId ? SONGS[player.songId].label : ''; }

/* ---- DOM ------------------------------------------------------------ */

const EQ_BARS = 48;

function buildStrip() {
  const strip = document.createElement('div');
  strip.className = 'jam-strip';
  strip.setAttribute('role', 'group');
  strip.setAttribute('aria-label', 'WISE jam bar — play a tune');

  const eqBars = Array.from({ length: EQ_BARS }, () => '<span></span>').join('');

  const songChips = SONG_ORDER
    .map((id) => `<button type="button" class="jam-song" data-song="${id}">${SONGS[id].label}</button>`)
    .join('');

  strip.innerHTML = `
    <button type="button" class="jam-play" data-jam-toggle aria-label="Play the jam" title="Play / pause">
      <span class="material-icons jam-play-icon">play_arrow</span>
    </button>
    <div class="jam-eq" aria-hidden="true">${eqBars}</div>
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

/* NOTE: the jam player intentionally no longer auto-mounts into the nav module.
   Per product direction the transport + track list live inside the Appearance
   popover (see js/appearance-menu.js → jamPlayerSection), so there's nothing to
   inject into #menu-panel. mountJamStrip()/buildStrip() are kept only for the
   legacy Minimal-UI pivot bar should a shell opt back into an inline strip. */
