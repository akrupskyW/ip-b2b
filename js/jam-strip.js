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
 * library is a crate of certified bangers — full main themes, not just
 * the opening bar:
 *   - "Tetris"           Korobeiniki · the Tetris Type-A theme
 *   - "Imperial March"   Star Wars · the Darth Vader theme
 *   - "Axel Foley"       the Axel Foley / Beverly Hills Cop theme
 *   - "Take On Me"       a-ha
 *   - "Dancing Queen"    ABBA
 *   - "Ode to Joy"       Beethoven
 *   - "Sonic"            Sonic the Hedgehog · Green Hill Zone melody
 *   - "Mario"            Super Mario Bros · the overworld theme
 *   - "7 Nation Army"    The White Stripes · the stadium riff
 *   - "Smoke/Water"      Deep Purple · Smoke on the Water
 *   - "Megalovania"      Undertale
 *   - "Pirates"          Pirates of the Caribbean · He's a Pirate
 *   - "Never Gonna…"     Rick Astley · Never Gonna Give You Up
 *
 * The strip mounts into #menu-panel .menu-inner and is CSS-gated so it
 * only shows when the panel is BOTH pivoted (horizontal top bar) and in
 * Minimal UI. Turning the jam strip on from Appearance starts Tetris;
 * other tracks start only on an explicit play / chip click.
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
  tetris: {
    label: 'Tetris',
    artist: 'Hirokazu Tanaka',
    bpm: 144,
    type: 'square',
    notes: [
      // Korobeiniki · Tetris Type-A. A, A′, B, then A + A′ again.
      ['E5', 1.0], ['B4', 0.5], ['C5', 0.5], ['D5', 1.0], ['C5', 0.5], ['B4', 0.5],
      ['A4', 1.0], ['A4', 0.5], ['C5', 0.5], ['E5', 1.0], ['D5', 0.5], ['C5', 0.5],
      ['B4', 1.5], ['C5', 0.5], ['D5', 1.0], ['E5', 1.0],
      ['C5', 1.0], ['A4', 1.0], ['A4', 2.0],
      [null, 0.5], ['D5', 1.0], ['F5', 0.5], ['A5', 1.0], ['G5', 0.5], ['F5', 0.5],
      ['E5', 1.5], ['C5', 0.5], ['E5', 1.0], ['D5', 0.5], ['C5', 0.5],
      ['B4', 1.5], ['C5', 0.5], ['D5', 1.0], ['E5', 1.0],
      ['C5', 1.0], ['A4', 1.0], ['A4', 2.0],
      ['E5', 2.0], ['C5', 2.0],
      ['D5', 2.0], ['B4', 2.0],
      ['C5', 2.0], ['A4', 2.0],
      ['G#4', 2.0], ['B4', 2.0],
      ['E5', 2.0], ['C5', 2.0],
      ['D5', 2.0], ['B4', 2.0],
      ['C5', 1.0], ['E5', 1.0], ['A5', 2.0],
      ['G#5', 4.0],
      ['E5', 1.0], ['B4', 0.5], ['C5', 0.5], ['D5', 1.0], ['C5', 0.5], ['B4', 0.5],
      ['A4', 1.0], ['A4', 0.5], ['C5', 0.5], ['E5', 1.0], ['D5', 0.5], ['C5', 0.5],
      ['B4', 1.5], ['C5', 0.5], ['D5', 1.0], ['E5', 1.0],
      ['C5', 1.0], ['A4', 1.0], ['A4', 2.0],
      [null, 0.5], ['D5', 1.0], ['F5', 0.5], ['A5', 1.0], ['G5', 0.5], ['F5', 0.5],
      ['E5', 1.5], ['C5', 0.5], ['E5', 1.0], ['D5', 0.5], ['C5', 0.5],
      ['B4', 1.5], ['C5', 0.5], ['D5', 1.0], ['E5', 1.0],
      ['C5', 1.0], ['A4', 1.0], ['A4', 2.0],
    ],
  },
  imperial: {
    label: 'Imperial March',
    artist: 'John Williams',
    bpm: 104,
    type: 'square',
    notes: [
      // Star Wars — Imperial March, key Gm. Opening + high continuation twice.
      ['G4', 1.0], ['G4', 1.0], ['G4', 1.0], ['Eb4', 0.75], ['Bb4', 0.25],
      ['G4', 1.0], ['Eb4', 0.75], ['Bb4', 0.25], ['G4', 2.0],
      ['D5', 1.0], ['D5', 1.0], ['D5', 1.0], ['Eb5', 0.75], ['Bb4', 0.25],
      ['F#4', 1.0], ['Eb4', 0.75], ['Bb4', 0.25], ['G4', 2.0],
      ['G5', 1.0], ['G5', 1.0], ['G5', 1.0], ['F#5', 0.75], ['F5', 0.25],
      ['E5', 0.25], ['Eb5', 0.25], ['E5', 0.5], [null, 0.5], ['Ab4', 0.5], ['D5', 1.0], ['C#5', 0.75], ['C5', 0.25],
      ['B4', 0.25], ['Bb4', 0.25], ['B4', 0.5], [null, 0.5], ['Eb4', 0.5], ['Ab4', 1.0], ['G4', 0.75], ['F#4', 0.25],
      ['G4', 1.0], ['Eb4', 0.75], ['Bb4', 0.25], ['G4', 2.0],
      ['G5', 1.0], ['G5', 1.0], ['G5', 1.0], ['F#5', 0.75], ['F5', 0.25],
      ['E5', 0.25], ['Eb5', 0.25], ['E5', 0.5], [null, 0.5], ['Ab4', 0.5], ['D5', 1.0], ['C#5', 0.75], ['C5', 0.25],
      ['B4', 0.25], ['Bb4', 0.25], ['B4', 0.5], [null, 0.5], ['Eb4', 0.5], ['Ab4', 1.0], ['G4', 0.75], ['F#4', 0.25],
      ['G4', 1.0], ['Eb4', 0.75], ['Bb4', 0.25], ['G4', 2.0],
    ],
  },
  axelf: {
    label: 'Axel Foley',
    artist: 'Harold Faltermeyer',
    bpm: 118,
    type: 'square',
    notes: [
      // Harold Faltermeyer — Axel F lead. The riff is the song; play it through.
      ['F4', 0.75], ['Ab4', 0.5], ['F4', 0.25], ['F4', 0.5], ['Bb4', 0.5], ['F4', 0.5], ['Eb4', 0.5],
      ['F4', 0.75], ['C5', 0.5], ['F4', 0.25], ['F4', 0.5], ['Db5', 0.5], ['C5', 0.5], ['Ab4', 0.5],
      ['F4', 0.5], ['C5', 0.5], ['F5', 0.5], ['F4', 0.25], ['Eb4', 0.25], ['Eb4', 0.25], ['C5', 0.5], ['G4', 0.5],
      ['F4', 1.5], [null, 0.5],
      ['F4', 0.75], ['Ab4', 0.5], ['F4', 0.25], ['F4', 0.5], ['Bb4', 0.5], ['F4', 0.5], ['Eb4', 0.5],
      ['F4', 0.75], ['C5', 0.5], ['F4', 0.25], ['F4', 0.5], ['Db5', 0.5], ['C5', 0.5], ['Ab4', 0.5],
      ['F4', 0.5], ['C5', 0.5], ['F5', 0.5], ['F4', 0.25], ['Eb4', 0.25], ['Eb4', 0.25], ['C5', 0.5], ['G4', 0.5],
      ['F4', 1.5], [null, 0.5],
      ['F4', 0.75], ['Ab4', 0.5], ['F4', 0.25], ['F4', 0.5], ['Bb4', 0.5], ['F4', 0.5], ['Eb4', 0.5],
      ['F4', 0.75], ['C5', 0.5], ['F4', 0.25], ['F4', 0.5], ['Db5', 0.5], ['C5', 0.5], ['Ab4', 0.5],
      ['F4', 0.5], ['C5', 0.5], ['F5', 0.5], ['F4', 0.25], ['Eb4', 0.25], ['Eb4', 0.25], ['C5', 0.5], ['G4', 0.5],
      ['F4', 2.0],
    ],
  },
  ode: {
    label: 'Ode to Joy',
    artist: 'Ludwig van Beethoven',
    bpm: 120,
    type: 'triangle',
    notes: [
      // Beethoven 9 — the complete hymn (all four phrases).
      ['E4', 1.0], ['E4', 1.0], ['F4', 1.0], ['G4', 1.0],
      ['G4', 1.0], ['F4', 1.0], ['E4', 1.0], ['D4', 1.0],
      ['C4', 1.0], ['C4', 1.0], ['D4', 1.0], ['E4', 1.0],
      ['E4', 1.5], ['D4', 0.5], ['D4', 2.0],
      ['E4', 1.0], ['E4', 1.0], ['F4', 1.0], ['G4', 1.0],
      ['G4', 1.0], ['F4', 1.0], ['E4', 1.0], ['D4', 1.0],
      ['C4', 1.0], ['C4', 1.0], ['D4', 1.0], ['E4', 1.0],
      ['D4', 1.5], ['C4', 0.5], ['C4', 2.0],
      ['D4', 1.0], ['D4', 1.0], ['E4', 1.0], ['C4', 1.0],
      ['D4', 1.0], ['E4', 0.5], ['F4', 0.5], ['E4', 1.0], ['C4', 1.0],
      ['D4', 1.0], ['E4', 0.5], ['F4', 0.5], ['E4', 1.0], ['D4', 1.0],
      ['C4', 1.0], ['D4', 1.0], ['G3', 2.0],
      ['E4', 1.0], ['E4', 1.0], ['F4', 1.0], ['G4', 1.0],
      ['G4', 1.0], ['F4', 1.0], ['E4', 1.0], ['D4', 1.0],
      ['C4', 1.0], ['C4', 1.0], ['D4', 1.0], ['E4', 1.0],
      ['D4', 1.5], ['C4', 0.5], ['C4', 2.0],
    ],
  },
  sonic: {
    label: 'Sonic',
    artist: 'Masato Nakamura',
    title: 'Green Hill Zone',
    bpm: 160,
    type: 'square',
    notes: [
      // Green Hill Zone — main theme through the ending tag, key C.
      ['C5', 0.5], ['A4', 1.0], ['C5', 0.5], ['B4', 1.0], ['C5', 0.5], ['B4', 1.0], ['G4', 2.0],
      [null, 0.5], ['G4', 0.5], ['E5', 0.5], ['D5', 1.0], ['C5', 0.5], ['B4', 1.0], ['C5', 0.5], ['B4', 1.0], ['G4', 2.0],
      [null, 1.0], ['C5', 0.5], ['A4', 1.0], ['C5', 0.5], ['B4', 1.0], ['C5', 0.5], ['B4', 1.0], ['G4', 2.0],
      [null, 0.5], ['A4', 0.5], ['A4', 0.5], ['F4', 1.0], ['A4', 0.5], ['G4', 1.0], ['A4', 0.5], ['G4', 1.0], ['C4', 2.0],
      [null, 1.0], ['C5', 0.5], ['A4', 1.0], ['C5', 0.5], ['B4', 1.0], ['C5', 0.5], ['B4', 1.0], ['G4', 2.0],
      [null, 0.5], ['G4', 0.5], ['E5', 0.5], ['D5', 1.0], ['C5', 0.5], ['B4', 1.0], ['C5', 0.5], ['B4', 1.0], ['G4', 2.0],
      [null, 1.0], ['C5', 0.5], ['A4', 1.0], ['C5', 0.5], ['B4', 1.0], ['C5', 0.5], ['B4', 1.0], ['G4', 2.0],
      [null, 0.5], ['A4', 0.5], ['A4', 0.5], ['F4', 1.0], ['A4', 0.5], ['G4', 1.0], ['A4', 0.5], ['G4', 1.0],
      ['C4', 0.5], ['C4', 0.5], ['E4', 0.5], ['D4', 6.0],
      [null, 0.5], ['C4', 0.5], ['D4', 0.5], ['E4', 6.0],
      [null, 0.5], ['C4', 0.5], ['C4', 0.5], ['E4', 0.5], ['Eb4', 6.0],
      [null, 0.5], ['C4', 0.5], ['Eb4', 0.5], ['D4', 0.5], ['D4', 3.0],
      ['G4', 0.5], ['B4', 0.5], ['E5', 0.5], ['D5', 1.0], ['C5', 0.5], ['G5', 1.5],
    ],
  },
  mario: {
    label: 'Mario',
    artist: 'Koji Kondo',
    title: 'Super Mario Bros.',
    bpm: 180,
    type: 'square',
    notes: [
      // Super Mario Bros. overworld — intro, A, B, C, and the underworld strain.
      ['E5', 0.5], ['E5', 0.5], [null, 0.5], ['E5', 0.5], [null, 0.5], ['C5', 0.5], ['E5', 0.5],
      ['G5', 1.0], [null, 1.0], ['G4', 0.5], [null, 1.5],
      ['C5', 1.5], ['G4', 0.5], [null, 1.0], ['E4', 1.5],
      ['A4', 1.0], ['B4', 1.0], ['Bb4', 0.5], ['A4', 1.0],
      ['G4', 0.75], ['E5', 0.75], ['G5', 0.75], ['A5', 1.0], ['F5', 0.5], ['G5', 0.5],
      [null, 0.5], ['E5', 1.0], ['C5', 0.5], ['D5', 0.5], ['B4', 1.5],
      ['C5', 1.5], ['G4', 0.5], [null, 1.0], ['E4', 1.5],
      ['A4', 1.0], ['B4', 1.0], ['Bb4', 0.5], ['A4', 1.0],
      ['G4', 0.75], ['E5', 0.75], ['G5', 0.75], ['A5', 1.0], ['F5', 0.5], ['G5', 0.5],
      [null, 0.5], ['E5', 1.0], ['C5', 0.5], ['D5', 0.5], ['B4', 1.5],
      [null, 1.0], ['G5', 0.5], ['F#5', 0.5], ['F5', 0.5], ['Eb5', 1.0], ['E5', 0.5],
      [null, 0.5], ['G#4', 0.5], ['A4', 0.5], ['C5', 0.5], [null, 0.5], ['A4', 0.5], ['C5', 0.5], ['D5', 0.5],
      [null, 1.0], ['Eb5', 1.0], [null, 0.5], ['D5', 1.5],
      ['C5', 2.0], [null, 2.0],
      [null, 1.0], ['G5', 0.5], ['F#5', 0.5], ['F5', 0.5], ['Eb5', 1.0], ['E5', 0.5],
      [null, 0.5], ['G#4', 0.5], ['A4', 0.5], ['C5', 0.5], [null, 0.5], ['A4', 0.5], ['C5', 0.5], ['D5', 0.5],
      [null, 1.0], ['Eb5', 1.0], [null, 0.5], ['D5', 1.5],
      ['C5', 2.0], [null, 2.0],
      ['C5', 0.5], ['C5', 1.0], ['C5', 0.5], [null, 0.5], ['C5', 0.5], ['D5', 1.0],
      ['E5', 0.5], ['C5', 1.0], ['A4', 0.5], ['G4', 2.0],
      ['C5', 0.5], ['C5', 1.0], ['C5', 0.5], [null, 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5],
      [null, 2.0],
      ['C5', 0.5], ['C5', 1.0], ['C5', 0.5], [null, 0.5], ['C5', 0.5], ['D5', 1.0],
      ['E5', 0.5], ['C5', 1.0], ['A4', 0.5], ['G4', 2.0],
      ['E5', 0.5], ['C5', 1.0], ['G4', 0.5], [null, 1.0], ['G#4', 1.0],
      ['A4', 0.5], ['F5', 1.0], ['F5', 0.5], ['A4', 2.0],
      ['D5', 0.75], ['A5', 0.75], ['A5', 0.75], ['A5', 0.75], ['G5', 0.75], ['F5', 0.75],
      ['E5', 0.5], ['C5', 1.0], ['A4', 0.5], ['G4', 2.0],
      ['E5', 0.5], ['C5', 1.0], ['G4', 0.5], [null, 1.0], ['G#4', 1.0],
      ['A4', 0.5], ['F5', 1.0], ['F5', 0.5], ['A4', 2.0],
      ['B4', 0.5], ['F5', 1.0], ['F5', 0.5], ['F5', 0.75], ['E5', 0.75], ['D5', 0.75],
      ['C5', 0.5], ['E4', 1.0], ['E4', 0.5], ['C4', 2.0],
    ],
  },
  seven: {
    label: '7 Nation Army',
    artist: 'The White Stripes',
    title: 'Seven Nation Army',
    bpm: 124,
    type: 'sawtooth',
    notes: [
      // The White Stripes — riff twice, the climb, riff out. Key Em.
      ['E4', 1.0], ['E4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 1.0], ['C4', 1.5], ['B3', 1.5],
      ['E4', 1.0], ['E4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 1.0], ['C4', 1.0], ['B3', 2.0],
      ['E4', 1.0], ['E4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 1.0], ['C4', 1.5], ['B3', 1.5],
      ['E4', 1.0], ['E4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 1.0], ['C4', 1.0], ['B3', 2.0],
      ['E4', 1.0], ['G4', 0.5], ['A4', 0.5], ['B4', 1.0], ['A4', 0.5], ['G4', 0.5],
      ['E4', 1.0], ['G4', 0.5], ['A4', 0.5], ['B4', 2.0],
      ['E4', 1.0], ['E4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 1.0], ['C4', 1.5], ['B3', 1.5],
      ['E4', 1.0], ['E4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 1.0], ['C4', 1.0], ['B3', 2.0],
    ],
  },
  smoke: {
    label: 'Smoke/Water',
    artist: 'Deep Purple',
    title: 'Smoke on the Water',
    bpm: 112,
    type: 'sawtooth',
    notes: [
      // Deep Purple — the complete riff twice, then the vocal chorus.
      ['G4', 0.5], ['Bb4', 0.5], ['C5', 0.75], [null, 0.25], ['G4', 0.5], ['Bb4', 0.5], ['Db5', 0.25], ['C5', 1.0], [null, 0.25],
      ['G4', 0.5], ['Bb4', 0.5], ['C5', 0.75], [null, 0.25], ['Bb4', 0.5], ['G4', 1.5], [null, 0.5],
      ['G4', 0.5], ['Bb4', 0.5], ['C5', 0.75], [null, 0.25], ['G4', 0.5], ['Bb4', 0.5], ['Db5', 0.25], ['C5', 1.0], [null, 0.25],
      ['G4', 0.5], ['Bb4', 0.5], ['C5', 0.75], [null, 0.25], ['Bb4', 0.5], ['G4', 1.5], [null, 0.5],
      ['G4', 0.5], ['G4', 0.5], ['Bb4', 0.5], ['C5', 1.0], ['C5', 1.5],
      ['C5', 0.5], ['Bb4', 0.5], ['G4', 1.0], ['G4', 2.0],
      ['G4', 0.5], ['G4', 0.5], ['Bb4', 0.5], ['C5', 1.0], ['C5', 1.5],
      ['Eb5', 0.5], ['C5', 0.5], ['Bb4', 1.0], ['G4', 2.0],
    ],
  },
  megalovania: {
    label: 'Megalovania',
    artist: 'Toby Fox',
    bpm: 120,
    type: 'square',
    notes: [
      // Undertale — the four-root intro, then the same phrase an octave up.
      ['D4', 0.25], ['D4', 0.25], ['D5', 0.5], ['A4', 0.5], [null, 0.25], ['Ab4', 0.5], [null, 0.25], ['G4', 0.5], ['F4', 0.5], ['D4', 0.25], ['F4', 0.25], ['G4', 0.5],
      ['C4', 0.25], ['C4', 0.25], ['D5', 0.5], ['A4', 0.5], [null, 0.25], ['Ab4', 0.5], [null, 0.25], ['G4', 0.5], ['F4', 0.5], ['D4', 0.25], ['F4', 0.25], ['G4', 0.5],
      ['B3', 0.25], ['B3', 0.25], ['D5', 0.5], ['A4', 0.5], [null, 0.25], ['Ab4', 0.5], [null, 0.25], ['G4', 0.5], ['F4', 0.5], ['D4', 0.25], ['F4', 0.25], ['G4', 0.5],
      ['Bb3', 0.25], ['Bb3', 0.25], ['D5', 0.5], ['A4', 0.5], [null, 0.25], ['Ab4', 0.5], [null, 0.25], ['G4', 0.5], ['F4', 0.5], ['D4', 0.25], ['F4', 0.25], ['G4', 0.5],
      ['D5', 0.25], ['D5', 0.25], ['D6', 0.5], ['A5', 0.5], [null, 0.25], ['Ab5', 0.5], [null, 0.25], ['G5', 0.5], ['F5', 0.5], ['D5', 0.25], ['F5', 0.25], ['G5', 0.5],
      ['C5', 0.25], ['C5', 0.25], ['D6', 0.5], ['A5', 0.5], [null, 0.25], ['Ab5', 0.5], [null, 0.25], ['G5', 0.5], ['F5', 0.5], ['D5', 0.25], ['F5', 0.25], ['G5', 0.5],
      ['B4', 0.25], ['B4', 0.25], ['D6', 0.5], ['A5', 0.5], [null, 0.25], ['Ab5', 0.5], [null, 0.25], ['G5', 0.5], ['F5', 0.5], ['D5', 0.25], ['F5', 0.25], ['G5', 0.5],
      ['Bb4', 0.25], ['Bb4', 0.25], ['D6', 0.5], ['A5', 0.5], [null, 0.25], ['Ab5', 0.5], [null, 0.25], ['G5', 0.5], ['F5', 0.5], ['D5', 0.25], ['F5', 0.25], ['G5', 0.5],
    ],
  },
  pirates: {
    label: 'Pirates',
    artist: 'Klaus Badelt & Hans Zimmer',
    title: "He's a Pirate",
    bpm: 140,
    type: 'square',
    notes: [
      // He's a Pirate — the gallop, the climb, and the E–F–G coda.
      ['E4', 0.5], ['G4', 0.5], ['A4', 1.0], ['A4', 0.5], [null, 0.5],
      ['A4', 0.5], ['B4', 0.5], ['C5', 1.0], ['C5', 0.5], [null, 0.5],
      ['C5', 0.5], ['D5', 0.5], ['B4', 1.0], ['B4', 0.5], [null, 0.5],
      ['A4', 0.5], ['G4', 0.5], ['A4', 1.5], [null, 0.5],
      ['E4', 0.5], ['G4', 0.5], ['A4', 1.0], ['A4', 0.5], [null, 0.5],
      ['A4', 0.5], ['B4', 0.5], ['C5', 1.0], ['C5', 0.5], [null, 0.5],
      ['C5', 0.5], ['D5', 0.5], ['B4', 1.0], ['B4', 0.5], [null, 0.5],
      ['A4', 0.5], ['G4', 0.5], ['A4', 1.5], [null, 0.5],
      ['E4', 0.5], ['G4', 0.5], ['A4', 1.0], ['A4', 0.5], [null, 0.5],
      ['A4', 0.5], ['C5', 0.5], ['D5', 1.0], ['D5', 0.5], [null, 0.5],
      ['D5', 0.5], ['E5', 0.5], ['F5', 1.0], ['F5', 0.5], [null, 0.5],
      ['E5', 0.5], ['D5', 0.5], ['E5', 0.5], ['A4', 1.0], [null, 0.5],
      ['A4', 0.5], ['B4', 0.5], ['C5', 1.0], ['C5', 0.5], [null, 0.5],
      ['D5', 1.0], ['E5', 0.5], ['A4', 1.0], [null, 0.5],
      ['A4', 0.5], ['C5', 0.5], ['B4', 1.0], ['B4', 0.5], [null, 0.5],
      ['C5', 0.5], ['A4', 0.5], ['B4', 1.5], [null, 1.5],
      ['E5', 1.0], [null, 2.0], ['F5', 1.0], [null, 2.0],
      ['E5', 0.5], ['E5', 0.5], [null, 0.5], ['G5', 0.5], [null, 0.5], ['E5', 0.5], ['D5', 0.5], [null, 2.0],
      ['D5', 1.0], [null, 2.0], ['C5', 1.0], [null, 2.0],
      ['B4', 0.5], ['C5', 0.5], [null, 0.5], ['B4', 0.5], [null, 0.5], ['A4', 2.0],
      ['E5', 1.0], [null, 2.0], ['F5', 1.0], [null, 2.0],
      ['E5', 0.5], ['E5', 0.5], [null, 0.5], ['G5', 0.5], [null, 0.5], ['E5', 0.5], ['D5', 0.5], [null, 2.0],
      ['D5', 1.0], [null, 2.0], ['C5', 1.0], [null, 2.0],
      ['B4', 0.5], ['C5', 0.5], [null, 0.5], ['B4', 0.5], [null, 0.5], ['A4', 2.0],
    ],
  },
  takeonme: {
    label: 'Take On Me',
    artist: 'a-ha',
    bpm: 170,
    type: 'square',
    notes: [
      // a-ha — synth hook twice, then the vocal chorus.
      ['F#5', 0.5], ['F#5', 0.5], ['D5', 0.5], ['B4', 0.5], [null, 0.5], ['B4', 0.5], [null, 0.5], ['E5', 0.5],
      [null, 0.5], ['E5', 0.5], [null, 0.5], ['E5', 0.5], ['G#5', 0.5], ['G#5', 0.5], ['A5', 0.5], ['B5', 0.5],
      ['A5', 0.5], ['A5', 0.5], ['A5', 0.5], ['E5', 0.5], [null, 0.5], ['D5', 0.5], [null, 0.5], ['F#5', 0.5],
      [null, 0.5], ['F#5', 0.5], [null, 0.5], ['F#5', 0.5], ['E5', 0.5], ['E5', 0.5], ['F#5', 0.5], ['E5', 0.5],
      ['F#5', 0.5], ['F#5', 0.5], ['D5', 0.5], ['B4', 0.5], [null, 0.5], ['B4', 0.5], [null, 0.5], ['E5', 0.5],
      [null, 0.5], ['E5', 0.5], [null, 0.5], ['E5', 0.5], ['G#5', 0.5], ['G#5', 0.5], ['A5', 0.5], ['B5', 0.5],
      ['A5', 0.5], ['A5', 0.5], ['A5', 0.5], ['E5', 0.5], [null, 0.5], ['D5', 0.5], [null, 0.5], ['F#5', 0.5],
      [null, 0.5], ['F#5', 0.5], [null, 0.5], ['F#5', 0.5], ['E5', 0.5], ['E5', 0.5], ['F#5', 0.5], ['E5', 0.5],
      ['A4', 0.5], ['F#5', 1.0], ['F#5', 0.5], ['E5', 2.0],
      ['A4', 0.5], ['E5', 1.0], ['E5', 0.5], ['D5', 2.0],
      ['B4', 0.5], ['D5', 1.0], ['D5', 0.5], ['C#5', 1.0], ['B4', 1.0],
      ['A4', 0.5], ['C#5', 1.0], ['C#5', 0.5], ['A4', 2.0],
    ],
  },
  dancing: {
    label: 'Dancing Queen',
    artist: 'ABBA',
    bpm: 101,
    type: 'square',
    notes: [
      // ABBA — Dancing Queen, key A. Chorus, "you are the dancing queen", verse.
      // You can dance / you can jive
      ['C#5', 0.5], ['B4', 0.5], ['B4', 2.0], [null, 1.0],
      ['C#5', 0.5], ['B4', 0.5], ['B4', 0.5], ['C#5', 2.5],
      // Having the time of your life
      ['A4', 0.5], ['B4', 0.5], ['G#4', 0.5], ['A4', 0.5], ['B4', 0.5], ['G#4', 0.5], ['A4', 0.5], ['G#4', 0.5],
      ['F#4', 3.0], [null, 1.0],
      ['C#5', 0.5], ['B4', 0.5], ['A4', 0.5], ['G#4', 2.5],
      // See that girl / watch that scene / digging the dancing queen
      ['G#4', 0.5], ['A4', 0.5], ['A4', 2.0], [null, 1.0],
      ['G#4', 0.5], ['A4', 0.5], ['A4', 2.0], [null, 1.0],
      ['B4', 0.5], ['A4', 0.5], ['G#4', 0.5], ['G#4', 0.5], ['A4', 0.5], ['A4', 1.5],
      // You are the dancing queen / young and sweet / only seventeen
      ['E5', 0.5], ['F#5', 0.5], ['G#5', 0.5], ['G#5', 0.5], ['A5', 0.5], ['A5', 1.5],
      ['G#5', 0.5], ['A5', 0.5], ['A5', 2.0], [null, 1.0],
      ['B5', 0.5], ['A5', 0.5], ['G#5', 0.5], ['A5', 0.5], ['A5', 2.0],
      ['G#5', 0.5], ['A5', 0.5], ['A5', 2.0], [null, 1.0],
      // Friday night and the lights are low / looking out for a place to go
      ['C#5', 0.25], ['E5', 0.5], ['E5', 0.5], ['E5', 0.5], ['E5', 0.5], ['E5', 0.5], ['E5', 0.5], ['F#5', 0.75],
      ['C#5', 0.25], ['E5', 0.5], ['E5', 0.5], ['E5', 0.5], ['E5', 0.5], ['E5', 0.5], ['E5', 0.5], ['C#5', 0.75],
      // And when you get the chance
      ['A4', 1.0], ['B4', 0.5], ['C#5', 0.5], ['C#5', 0.5], ['D5', 0.5], ['D5', 0.25], ['C#5', 0.25], ['B4', 0.5],
      // Chorus back — you can dance
      ['C#5', 0.5], ['B4', 0.5], ['B4', 2.0], [null, 1.0],
      ['C#5', 0.5], ['B4', 0.5], ['B4', 0.5], ['C#5', 2.5],
      ['A4', 0.5], ['B4', 0.5], ['G#4', 0.5], ['A4', 0.5], ['B4', 0.5], ['G#4', 0.5], ['A4', 0.5], ['G#4', 0.5],
      ['F#4', 3.0], [null, 1.0],
      ['G#4', 0.5], ['A4', 0.5], ['A4', 2.0], [null, 1.0],
      ['G#4', 0.5], ['A4', 0.5], ['A4', 2.0], [null, 1.0],
      ['B4', 0.5], ['A4', 0.5], ['G#4', 0.5], ['G#4', 0.5], ['A4', 0.5], ['A4', 1.5],
    ],
  },
  rickroll: {
    label: 'Never Gonna…',
    artist: 'Rick Astley',
    title: 'Never Gonna Give You Up',
    bpm: 113,
    type: 'square',
    notes: [
      // Rick Astley — intro, verse, and the full chorus (original key).
      ['D5', 1.5], ['E5', 1.5], ['A4', 1.0],
      ['E5', 1.5], ['F#5', 1.5], ['A5', 0.25], ['G5', 0.25], ['F#5', 0.5],
      ['D5', 1.5], ['E5', 1.5], ['A4', 2.0],
      ['A4', 0.25], ['A4', 0.25], ['B4', 0.25], ['D5', 0.5], ['D5', 0.25],
      ['D5', 1.5], ['E5', 1.5], ['A4', 1.0],
      ['E5', 1.5], ['F#5', 1.5], ['A5', 0.25], ['G5', 0.25], ['F#5', 0.5],
      ['D5', 1.5], ['E5', 1.5], ['A4', 2.0],
      ['A4', 0.25], ['A4', 0.25], ['B4', 0.25], ['D5', 0.5], ['D5', 0.25],
      [null, 1.0], ['B4', 0.5], ['C#5', 0.5], ['D5', 0.5], ['D5', 0.5], ['E5', 0.5], ['C#5', 0.75],
      ['B4', 0.25], ['A4', 2.0], [null, 1.0],
      [null, 0.5], ['B4', 0.5], ['B4', 0.5], ['C#5', 0.5], ['D5', 0.5], ['B4', 1.0], ['A4', 0.5],
      ['A5', 0.5], [null, 0.5], ['A5', 0.5], ['E5', 1.5], [null, 1.0],
      ['B4', 0.5], ['B4', 0.5], ['C#5', 0.5], ['D5', 0.5], ['B4', 0.5], ['D5', 0.5], ['E5', 0.5], [null, 0.5],
      [null, 0.5], ['C#5', 0.5], ['B4', 0.5], ['A4', 1.5], [null, 1.0],
      [null, 0.5], ['B4', 0.5], ['B4', 0.5], ['C#5', 0.5], ['D5', 0.5], ['B4', 0.5], ['A4', 1.0],
      ['E5', 0.5], ['E5', 0.5], ['E5', 0.5], ['F#5', 0.5], ['E5', 1.0], [null, 1.0],
      ['D5', 2.0], ['E5', 0.5], ['F#5', 0.5], ['D5', 0.5],
      ['E5', 0.5], ['E5', 0.5], ['E5', 0.5], ['F#5', 0.5], ['E5', 1.0], ['A4', 1.0],
      [null, 2.0], ['B4', 0.5], ['C#5', 0.5], ['D5', 0.5], ['B4', 0.5],
      [null, 0.5], ['E5', 0.5], ['F#5', 0.5], ['E5', 1.5], ['A4', 0.25], ['B4', 0.25], ['D5', 0.25], ['B4', 0.25],
      ['F#5', 0.75], ['F#5', 0.75], ['E5', 1.5], ['A4', 0.25], ['B4', 0.25], ['D5', 0.25], ['B4', 0.25],
      ['E5', 0.75], ['E5', 0.75], ['D5', 0.75], ['C#5', 0.25], ['B4', 0.75], ['A4', 0.25], ['B4', 0.25], ['D5', 0.25], ['B4', 0.25],
      ['D5', 1.0], ['E5', 0.5], ['C#5', 0.75], ['B4', 0.25], ['A4', 0.5], ['A4', 0.5], ['A4', 0.5],
      ['E5', 1.0], ['D5', 2.0], ['A4', 0.25], ['B4', 0.25], ['D5', 0.25], ['B4', 0.25],
      ['F#5', 0.75], ['F#5', 0.75], ['E5', 1.5], ['A4', 0.25], ['B4', 0.25], ['D5', 0.25], ['B4', 0.25],
      ['A5', 1.0], ['C#5', 0.5], ['D5', 0.75], ['C#5', 0.25], ['B4', 0.5], ['A4', 0.25], ['B4', 0.25], ['D5', 0.25], ['B4', 0.25],
      ['D5', 1.0], ['E5', 0.5], ['C#5', 0.75], ['B4', 0.25], ['A4', 1.0], ['A4', 0.5],
      ['E5', 1.0], ['D5', 2.0],
    ],
  },
};

const SONG_ORDER = [
  'tetris', 'imperial', 'axelf', 'takeonme', 'dancing', 'ode', 'sonic', 'mario',
  'seven', 'smoke', 'megalovania', 'pirates', 'rickroll',
];

/** Default when the jam strip is switched on, or when nothing has been picked. */
const DEFAULT_SONG_ID = 'tetris';

/* ---- Iconic click stabs ---------------------------------------------- */
/* Hand-picked micro-phrases — the instantly recognizable hook of each track,
   boiled down to 3–5 notes. While the Jam strip is on, every button click in
   the app plays one of these (see the global click listener at the bottom of
   this file) instead of the whole tune. Each button hashes to one stab so a
   given button always makes the same sound. Format matches SONGS.notes:
   [name|null, beats], played at the parent song's bpm and timbre. */

const STABS = {
  tetris: [
    [['E5', 0.5], ['B4', 0.25], ['C5', 0.25], ['D5', 0.5]],
    [['A4', 0.5], ['A4', 0.25], ['C5', 0.25], ['E5', 0.5]],
    [['B4', 0.5], ['C5', 0.25], ['D5', 0.5]],
  ],
  imperial: [
    [['G4', 0.5], ['G4', 0.5], ['G4', 0.5]],
    [['Eb4', 0.5], ['Bb4', 0.25], ['G4', 0.75]],
    [['D5', 0.5], ['D5', 0.5], ['D5', 0.5]],
  ],
  axelf: [
    [['F4', 0.75], ['Ab4', 0.5], ['F4', 0.25]],
    [['F4', 0.5], ['Bb4', 0.5], ['F4', 0.5], ['Eb4', 0.5]],
    [['F4', 0.5], ['C5', 0.5], ['F5', 0.5]],
  ],
  ode: [
    [['E4', 0.5], ['E4', 0.5], ['F4', 0.5], ['G4', 0.5]],
    [['G4', 0.5], ['F4', 0.5], ['E4', 0.5], ['D4', 0.5]],
    [['E4', 0.75], ['D4', 0.25], ['D4', 0.75]],
  ],
  sonic: [
    [['C5', 0.5], ['A4', 0.5], ['C5', 0.5], ['B4', 0.5]],
    [['G4', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5]],
    [['B4', 0.25], ['C5', 0.25], ['E5', 0.75]],
  ],
  mario: [
    [['E5', 0.5], ['E5', 0.5], [null, 0.5], ['E5', 0.5]],
    [['B5', 0.3], ['E6', 1.0]],
    [['C5', 0.25], ['E5', 0.25], ['G5', 0.75]],
  ],
  seven: [
    [['E4', 0.75], ['E4', 0.25], ['G4', 0.25], ['E4', 0.25]],
    [['D4', 0.5], ['C4', 0.75], ['B3', 0.75]],
    [['E4', 0.5], ['G4', 0.25], ['E4', 0.25], ['D4', 0.5]],
  ],
  smoke: [
    [['G4', 0.5], ['Bb4', 0.5], ['C5', 0.75]],
    [['G4', 0.5], ['Bb4', 0.5], ['Db5', 0.25], ['C5', 0.75]],
    [['C5', 0.5], ['Bb4', 0.5], ['G4', 0.75]],
  ],
  megalovania: [
    [['D4', 0.25], ['D4', 0.25], ['D5', 0.5], ['A4', 0.5]],
    [['Ab4', 0.375], ['G4', 0.375], ['F4', 0.375]],
    [['F4', 0.25], ['D4', 0.25], ['F4', 0.25], ['G4', 0.5]],
  ],
  pirates: [
    [['E4', 0.25], ['G4', 0.25], ['A4', 0.5]],
    [['A4', 0.25], ['C5', 0.25], ['D5', 0.5]],
    [['E5', 0.5], ['F5', 0.5], ['E5', 0.25], ['G5', 0.5]],
  ],
  takeonme: [
    [['F#5', 0.5], ['F#5', 0.5], ['D5', 0.5], ['B4', 0.5]],
    [['E5', 0.5], ['E5', 0.5], ['G#5', 0.5], ['G#5', 0.5]],
    [['A5', 0.5], ['B5', 0.5], ['A5', 0.5]],
  ],
  dancing: [
    [['C#5', 0.5], ['B4', 0.5], ['B4', 1.0]],
    [['G#4', 0.5], ['A4', 0.5], ['A4', 0.75]],
    [['E5', 0.25], ['F#5', 0.25], ['G#5', 0.25], ['A5', 0.5]],
  ],
  rickroll: [
    [['A4', 0.25], ['B4', 0.25], ['D5', 0.25], ['B4', 0.25], ['F#5', 0.5]],
    [['F#5', 0.5], ['F#5', 0.5], ['E5', 0.75]],
    [['E5', 0.5], ['E5', 0.5], ['D5', 0.75]],
  ],
};


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

/** Schedule a single note (lead square + soft sine body) with an envelope.
    `vel` (0..1) scales loudness — click stabs play softer than the full mix. */
function playNote(freq, t0, durSec, type, vel = 1) {
  if (!freq) return;
  const ctx = player.ctx;
  const gain = ctx.createGain();
  gain.connect(player.master);

  const peak = 0.22 * vel;
  const sustain = 0.15 * vel;
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
  try { localStorage.setItem(JAM_SONG_KEY, songId); } catch (_) {}
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
    play(songId || player.songId || DEFAULT_SONG_ID);
  }
}

/* ---- Popover player API --------------------------------------------- */
/* The player UI now lives INSIDE the Appearance popover (not the nav module),
   so the transport + track list are driven from there. These exports give that
   UI the song catalogue, the play/stop transport, the current state, and a
   subscription so the open popover can reflect play/stop as it happens. */
function songTip(song) {
  const name = song.title || song.label;
  return song.artist ? `${name} — ${song.artist}` : name;
}

export const JAM_SONGS = SONG_ORDER.map((id) => {
  const s = SONGS[id];
  return { id, label: s.label, artist: s.artist, tip: songTip(s) };
});

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
export function playJam(songId) { play(songId || player.songId || DEFAULT_SONG_ID); }
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
    .map((id) => {
      const s = SONGS[id];
      const tip = songTip(s).replace(/"/g, '&quot;');
      return `<button type="button" class="jam-song" data-song="${id}" data-tip="${tip}" title="${tip}">${s.label}</button>`;
    })
    .join('');

  strip.innerHTML = `
    <button type="button" class="jam-play" data-jam-toggle aria-label="Play the jam" title="Play / pause">
      <span class="material-symbols-outlined jam-play-icon">play_arrow</span>
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

/* Last track the user picked — persisted so the button click stabs keep the
   chosen flavour across pages and reloads, even when nothing is playing. */
const JAM_SONG_KEY = 'wise-jam-song-v1';

function storedSongId() {
  try {
    const id = localStorage.getItem(JAM_SONG_KEY);
    return id && SONGS[id] ? id : null;
  } catch (_) { return null; }
}

// Seed the in-memory choice: honour the user's last explicit pick if there is
// one, otherwise Tetris — the track that starts when the jam strip is turned on.
player.songId = storedSongId() || DEFAULT_SONG_ID;

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
  if (on) mountJamStrip();
  const panel = document.getElementById('menu-panel');
  if (panel) panel.classList.toggle('jam-off', !on);
  if (persist) { try { localStorage.setItem(JAM_KEY, on ? '1' : '0'); } catch (_) {} }
  if (!on && player.playing) stop();
  // User toggle only (`persist`): a restore on load must not autoplay.
  if (on && persist) play(DEFAULT_SONG_ID);
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

/* Mount into the nav as soon as #menu-panel .menu-inner exists. The Appearance
   popover only toggles the strip on/off — the transport + track list live here,
   not inside that popover (turning Jam on must not grow or reflow the menu). */
function bootJamStrip() {
  if (document.querySelector('#menu-panel .menu-inner')) {
    mountJamStrip();
    return;
  }
  if (typeof MutationObserver === 'undefined' || !document.documentElement) return;
  const mo = new MutationObserver(() => {
    if (!document.querySelector('#menu-panel .menu-inner')) return;
    mountJamStrip();
    mo.disconnect();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
}
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootJamStrip);
  } else {
    bootJamStrip();
  }
}

/* ---- App-wide button click stabs ------------------------------------ */
/* While the Jam strip is switched on, EVERY button click in the app plays a
   short, iconic riff snippet from the chosen track (see STABS above) — not
   the whole tune. Each button hashes to one of the track's stabs, so a given
   button always answers with the same sound. This module is imported by
   js/topbar.js on every page, so wiring the listener here makes it global.

   Rules:
   - Jam strip off → silent (and no AudioContext is ever created).
   - Full track already playing → stabs stay out of the way (no clashing).
   - The jam player's own transport/chips are excluded — clicking them starts
     or stops real playback, which is feedback enough. */

const STAB_SELECTOR =
  'button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"], summary';
const STAB_SKIP =
  '[data-jam-play], [data-jam-song], [data-jam], .jam-strip, .jam-pop';

/** Play stab #`which` (mod the track's stab count) of a song, softly. */
function playStab(songId, which) {
  const song = SONGS[songId];
  const stabs = STABS[songId];
  if (!song || !stabs || !stabs.length) return;
  const ctx = ensureContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();

  const notes = stabs[Math.abs(which) % stabs.length];
  // A touch quicker than the source tune so it reads as UI feedback.
  const beat = (60 / song.bpm) / 1.15;
  let t = ctx.currentTime + 0.02;
  for (const [name, beats] of notes) {
    const dur = beats * beat;
    if (name) playNote(noteFreq(name), t, dur, song.type, 0.65);
    t += dur;
  }
}

/** Stable per-button hash so each button keeps its own signature stab. */
function stabHash(el) {
  const s = [
    el.id || '',
    el.getAttribute('aria-label') || '',
    typeof el.className === 'string' ? el.className : '',
    (el.textContent || '').trim().slice(0, 40),
  ].join('|');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

let lastStabAt = 0;

function onGlobalButtonClick(ev) {
  if (!isJamStripOn()) return;
  if (player.playing) return;
  const target = ev.target instanceof Element ? ev.target : null;
  const el = target ? target.closest(STAB_SELECTOR) : null;
  if (!el || el.closest(STAB_SKIP)) return;

  // Debounce rapid double-fires (e.g. label+input both dispatching).
  const now = performance.now();
  if (now - lastStabAt < 120) return;
  lastStabAt = now;

  playStab(player.songId || storedSongId() || DEFAULT_SONG_ID, stabHash(el));
}

// Capture phase so stopPropagation() in feature code can't mute the fun.
if (!window.__wiseJamClickStabs) {
  window.__wiseJamClickStabs = true;
  document.addEventListener('click', onGlobalButtonClick, true);
}
