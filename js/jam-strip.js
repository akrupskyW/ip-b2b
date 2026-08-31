/* ------------------------------------------------------------------ */
/* WISE Jam Strip                                                      */
/* ------------------------------------------------------------------ */
/*
 * The music player lives in Appearance ▸ Sound — never in the primary
 * navigation. Turning the jam strip on from that popover reveals the
 * transport, a visualizer, and the track crate right there. Two viz
 * modes share the same analyser: proper equalizer bars (default) and a
 * horizontal DNA helix that twists and sparks with the music.
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
 * Playback starts only from the play button and then loops until pause.
 * Turning the strip on, picking a track, or clicking anything else is silent.
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

function songBeats(song) {
  return song.notes.reduce((n, row) => n + (Number(row[1]) || 0), 0);
}
function songDurationSec(song) {
  return songBeats(song) * (60 / song.bpm);
}
function formatDuration(sec) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) {
    const kb = n / 1024;
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  }
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
function songFileName(id) {
  return `${id}.chiptune`;
}
function songByteSize(song) {
  try { return new Blob([JSON.stringify(song.notes)]).size; }
  catch (_) { return JSON.stringify(song.notes).length; }
}
function songTip(song) {
  const name = song.title || song.label;
  return song.artist ? `${name} — ${song.artist}` : name;
}

function catalogEntry(id) {
  const s = SONGS[id];
  const durationSec = songDurationSec(s);
  const fileBytes = songByteSize(s);
  return {
    id,
    label: s.label,
    artist: s.artist || '',
    title: s.title || s.label,
    tip: songTip(s),
    bpm: s.bpm,
    type: s.type,
    notes: s.notes.length,
    beats: songBeats(s),
    durationSec,
    durationLabel: formatDuration(durationSec),
    fileName: songFileName(id),
    fileBytes,
    fileSizeLabel: formatBytes(fileBytes),
  };
}


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

/* ---- Sound-reactive visualizer ------------------------------------- */
/* Two modes share the same AnalyserNode:
   - bars (default): a proper equalizer — full-height tracks, scaleY from
     the baseline, attack-fast / release-slow so beats punch.
   - helix: a horizontal DNA double helix that twists, breathes, and
     sends a spark down the strand with the music. */

const viz = { raf: 0, data: null, last: 0, phase: 0 };
const HELIX = { W: 320, H: 32, mid: 16, pairs: 14, steps: 48 };
const JAM_VIZ_KEY = 'wise-jam-viz-v1';

function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch (_) { return false; }
}

export function getJamVizMode() {
  try { return localStorage.getItem(JAM_VIZ_KEY) === 'helix' ? 'helix' : 'bars'; }
  catch (_) { return 'bars'; }
}
export function setJamVizMode(mode) {
  const next = mode === 'helix' ? 'helix' : 'bars';
  try { localStorage.setItem(JAM_VIZ_KEY, next); } catch (_) {}
  applyJamVizMode(next);
  emitJamState();
}
function applyJamVizMode(mode) {
  const next = mode === 'helix' ? 'helix' : 'bars';
  document.querySelectorAll('[data-jam-viz-host]').forEach((el) => {
    el.dataset.jamViz = next;
    el.classList.toggle('jam-viz-helix', next === 'helix');
    el.classList.toggle('jam-viz-bars', next === 'bars');
  });
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
    const target = 0.16 + 0.84 * Math.pow(raw, 0.72);
    const prev = bar._lvl || 0.16;
    const v = prev + (target - prev) * (target > prev ? 0.6 : 0.16);
    bar._lvl = v;
    bar.style.transform = `scaleY(${v.toFixed(3)})`;
    bar.style.setProperty('--lvl', v.toFixed(3));
  }
}

function helixPoints(phase, amp, turns) {
  const { W, mid, steps } = HELIX;
  const period = W / turns;
  const a = [];
  const b = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * W;
    const th = (x / period) * Math.PI * 2 + phase;
    a.push([x, mid + amp * Math.sin(th), Math.cos(th)]);
    b.push([x, mid - amp * Math.sin(th), -Math.cos(th)]);
  }
  return { a, b, period };
}
function helixPath(pts) {
  let d = '';
  for (let i = 0; i < pts.length; i++) {
    d += `${i ? 'L' : 'M'}${pts[i][0].toFixed(2)},${pts[i][1].toFixed(2)}`;
  }
  return d;
}

function paintHelix(container, data, dt) {
  const svg = container.querySelector('.jam-helix-svg');
  if (!svg) return;
  container.classList.add('is-live');
  const bass = barLevel(data, 0, 8);
  const midE = barLevel(data, 3, 8);
  const high = barLevel(data, 6, 8);
  const energy = 0.35 * bass + 0.4 * midE + 0.25 * high;
  viz.phase += dt * (1.35 + energy * 4.4);
  const amp = 5.2 + 7.2 * bass;
  const turns = 3.05 + energy * 0.55;
  const { a, b, period } = helixPoints(viz.phase, amp, turns);
  const pathA = svg.querySelector('.jam-helix-strand.a');
  const pathB = svg.querySelector('.jam-helix-strand.b');
  if (pathA) pathA.setAttribute('d', helixPath(a));
  if (pathB) pathB.setAttribute('d', helixPath(b));

  const sparkX = ((viz.phase / (Math.PI * 2)) % 1) * HELIX.W;
  const sparkTh = (sparkX / period) * Math.PI * 2 + viz.phase;
  const spark = svg.querySelector('.jam-helix-spark');
  if (spark) {
    spark.setAttribute('cx', sparkX.toFixed(2));
    spark.setAttribute('cy', (HELIX.mid + amp * Math.sin(sparkTh)).toFixed(2));
    spark.setAttribute('r', (2.6 + 2.4 * energy).toFixed(2));
    spark.style.opacity = String(0.55 + 0.45 * energy);
  }

  const rungs = svg.querySelectorAll('.jam-helix-rung');
  const nodes = svg.querySelectorAll('.jam-helix-node');
  const pairN = HELIX.pairs;
  for (let p = 0; p < pairN; p++) {
    const x = ((p + 0.5) / pairN) * HELIX.W;
    const th = (x / period) * Math.PI * 2 + viz.phase;
    const yA = HELIX.mid + amp * Math.sin(th);
    const yB = HELIX.mid - amp * Math.sin(th);
    const rung = rungs[p];
    if (rung) {
      rung.setAttribute('x1', x.toFixed(2));
      rung.setAttribute('y1', yA.toFixed(2));
      rung.setAttribute('x2', x.toFixed(2));
      rung.setAttribute('y2', yB.toFixed(2));
      const dist = Math.min(Math.abs(x - sparkX), HELIX.W - Math.abs(x - sparkX));
      const bloom = Math.max(0, 1 - dist / 42);
      rung.style.strokeOpacity = String(0.28 + 0.72 * bloom + 0.2 * high);
      rung.style.strokeWidth = (1 + 1.8 * bloom + 0.6 * midE).toFixed(2);
    }
    const n0 = nodes[p * 2];
    const n1 = nodes[p * 2 + 1];
    if (n0) { n0.setAttribute('cx', x.toFixed(2)); n0.setAttribute('cy', yA.toFixed(2)); }
    if (n1) { n1.setAttribute('cx', x.toFixed(2)); n1.setAttribute('cy', yB.toFixed(2)); }
  }
  container.style.setProperty('--jam-hx-glow', energy.toFixed(3));
}

function vizFrame(now) {
  if (!player.playing || !player.analyser) { viz.raf = 0; viz.last = 0; return; }
  const t = now || performance.now();
  const dt = viz.last ? Math.min(0.05, (t - viz.last) / 1000) : 0.016;
  viz.last = t;
  player.analyser.getByteFrequencyData(viz.data);
  document.querySelectorAll('.jam-pop-eq, .jam-eq').forEach((g) => paintEq(g, viz.data));
  document.querySelectorAll('.jam-helix').forEach((g) => paintHelix(g, viz.data, dt));
  viz.raf = requestAnimationFrame(vizFrame);
}

function startViz() {
  if (viz.raf || prefersReducedMotion()) return;
  if (!player.analyser) return;
  viz.data = new Uint8Array(player.analyser.frequencyBinCount);
  viz.last = 0;
  viz.raf = requestAnimationFrame(vizFrame);
}

function stopViz() {
  if (viz.raf) cancelAnimationFrame(viz.raf);
  viz.raf = 0;
  viz.last = 0;
  document.querySelectorAll('.jam-pop-eq.is-live, .jam-eq.is-live').forEach((g) => {
    g.classList.remove('is-live');
    for (const bar of g.children) {
      bar.style.transform = '';
      bar.style.removeProperty('--lvl');
      bar._lvl = 0;
    }
  });
  document.querySelectorAll('.jam-helix.is-live').forEach((g) => {
    g.classList.remove('is-live');
    g.style.removeProperty('--jam-hx-glow');
  });
}

export function eqBarsMarkup(n = 24) {
  return Array.from({ length: n }, (_, i) =>
    `<span style="animation-delay:${(-0.13 * (i % 8)).toFixed(2)}s"></span>`
  ).join('');
}

let helixUid = 0;
export function helixVizMarkup() {
  const id = `jamhx${++helixUid}`;
  const { W, H, mid, pairs } = HELIX;
  const amp = 6.4;
  const turns = 3.2;
  const { a, b, period } = helixPoints(0, amp, turns);
  const rungs = [];
  const nodes = [];
  for (let p = 0; p < pairs; p++) {
    const x = ((p + 0.5) / pairs) * W;
    const th = (x / period) * Math.PI * 2;
    const yA = mid + amp * Math.sin(th);
    const yB = mid - amp * Math.sin(th);
    rungs.push(`<line class="jam-helix-rung" x1="${x.toFixed(1)}" y1="${yA.toFixed(1)}" x2="${x.toFixed(1)}" y2="${yB.toFixed(1)}"/>`);
    nodes.push(`<circle class="jam-helix-node" cx="${x.toFixed(1)}" cy="${yA.toFixed(1)}" r="1.55"/>`);
    nodes.push(`<circle class="jam-helix-node" cx="${x.toFixed(1)}" cy="${yB.toFixed(1)}" r="1.55"/>`);
  }
  return `<div class="jam-helix" data-jam-helix aria-hidden="true">
    <svg class="jam-helix-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="${id}-a" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="var(--primary)"/>
          <stop offset="1" stop-color="var(--ter-violet, #6b5b95)"/>
        </linearGradient>
        <linearGradient id="${id}-b" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="var(--ter-violet, #6b5b95)"/>
          <stop offset="1" stop-color="var(--primary)"/>
        </linearGradient>
      </defs>
      <path class="jam-helix-strand a" fill="none" d="${helixPath(a)}" stroke="url(#${id}-a)"/>
      <path class="jam-helix-strand b" fill="none" d="${helixPath(b)}" stroke="url(#${id}-b)"/>
      <g class="jam-helix-rungs">${rungs.join('')}</g>
      <g class="jam-helix-nodes">${nodes.join('')}</g>
      <circle class="jam-helix-spark" cx="0" cy="${mid}" r="3"/>
    </svg>
  </div>`;
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

/* Play / pause only. A songId is never a reason to start from silence —
   that is exclusively the play button. */
function togglePlay() {
  if (player.playing) stop();
  else play(player.songId || DEFAULT_SONG_ID);
}

function selectSong(songId) {
  if (!songId || !SONGS[songId]) return;
  player.songId = songId;
  try { localStorage.setItem(JAM_SONG_KEY, songId); } catch (_) {}
  if (player.playing) play(songId);
  else {
    player.onState?.(false, songId);
    emitJamState();
  }
}

/* ---- Popover player API --------------------------------------------- */
/* The player lives in Appearance ▸ Sound. These exports give that UI the
   catalogue, play/pause, track selection, viz mode, and a subscription. */

export const JAM_SONGS = SONG_ORDER.map(catalogEntry);

let jamStateSubs = [];
function emitJamState() {
  const snap = { playing: player.playing, songId: player.songId, viz: getJamVizMode() };
  for (const cb of jamStateSubs) { try { cb(snap); } catch (_) {} }
}
export function onJamState(cb) {
  if (typeof cb !== 'function') return () => {};
  jamStateSubs.push(cb);
  return () => { jamStateSubs = jamStateSubs.filter((x) => x !== cb); };
}
/** Play / pause. Ignores a song id so a chip click cannot start playback. */
export function toggleJam() { togglePlay(); }
export function playJam() { play(player.songId || DEFAULT_SONG_ID); }
export function stopJam() { stop(); }
/** Pick a track. Silent when paused; if already playing, the session continues on the new track. */
export function selectJam(songId) { selectSong(songId); }
export function isJamPlaying() { return !!player.playing; }
export function currentJamSongId() { return player.songId || null; }
export function currentJamSongLabel() { return player.songId ? SONGS[player.songId].label : ''; }

/* ---- Enable / disable (Appearance ▸ Sound) -------------------------- */
/* The jam player lives in the Appearance popover, never the primary nav.
   Turning the switch on reveals the player under the toggle. It does not
   start a tune — only the play button does that. Turning it off stops
   anything that was already looping. */
const JAM_KEY = 'wise-jam-strip-v2';
const JAM_SONG_KEY = 'wise-jam-song-v1';

function storedSongId() {
  try {
    const id = localStorage.getItem(JAM_SONG_KEY);
    return id && SONGS[id] ? id : null;
  } catch (_) { return null; }
}

player.songId = storedSongId() || DEFAULT_SONG_ID;

export function isJamStripOn() {
  try { return localStorage.getItem(JAM_KEY) === '1'; } catch { return false; }
}

/**
 * Persist the on/off choice and stop playback when turning off.
 * Never autoplays. Play starts only from the play button.
 */
export function applyJamStrip(on, persist = true) {
  const panel = document.getElementById('menu-panel');
  if (panel) panel.classList.toggle('jam-off', !on);
  if (persist) { try { localStorage.setItem(JAM_KEY, on ? '1' : '0'); } catch (_) {} }
  if (!on && player.playing) stop();
}

export function restoreJamStrip() {
  applyJamStrip(isJamStripOn(), false);
}

/** Kept so older shells that still import it do not throw. Does not inject into the nav. */
export function mountJamStrip() {
  restoreJamStrip();
}
