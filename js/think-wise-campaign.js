/**
 * think-wise-campaign.js — Think Wise. Code Wise. Live Wise.
 *
 * The brand campaign built on the three WISEcode owls, named here for the
 * first time: Rue doubts the claim, Ollie reads the code, Sage gives the
 * verdict. It ships as knitted-wool sculpture rather than illustration — a
 * character plate each, a model sheet, three billboards, the owls built
 * nine feet tall and installed in a plaza by day and lit at night, a park
 * walk with its own map, a tower spectacular, and a launch film cut from the
 * campaign's own artwork.
 *
 * Pages host it through the reply builders. The artwork rides the shared
 * transcript masonry, the plates ride the shared card rail, and the cast page
 * is the shared character bible.
 */

import { esc } from './escape-html.js';
import { masonryGridHtml, cardRailHtml } from './transcript-masonry.js';
import { characterBibleHtml } from './character-bible.js';

const THINK_WISE_BASE = '../assets/think-wise';

/**
 * The brief a member sends to get this campaign. It names every piece that
 * comes back, in the order it comes back, so the ask and the artwork cannot
 * drift apart. Shared because the welcome card, the intent chip and the
 * "What can I ask?" catalog all send the same one.
 */
export const THINK_WISE_BRIEF = [
  'Build the WISEcode brand campaign around our three owls, and show me the finished work rather than a strategy deck.',
  '',
  'Give the owls names, characters and jobs, and let the three of them carry a three-part line. One doubts the claim on the front of the box. One reads the code underneath it. One gives the verdict you can act on. The line is Think Wise. Code Wise. Live Wise., the opening argument is that information is easy and truth is not, and the sign-off is Food for Truth.',
  '',
  'Make them objects rather than illustrations — sculpted out of knitted wool, so they read as something you could walk up to and put a hand on. Keep each one to a single colour over the same cream face, and give each one palette chips so the build can be matched.',
  '',
  'Then produce the campaign, as artwork rather than a description of artwork:',
  '- A character plate for each owl, portrait, on the campaign navy.',
  '- A character-bible model sheet: three views and two expressions each, with the palettes.',
  '- A billboard for the opening argument, and one for the sign-off.',
  '- A billboard that runs the whole three-part line with all three owls.',
  '- The three of them built nine feet tall as public sculpture and installed in a city plaza, by day and lit at night, with a portrait of each one on its own.',
  '- A park installation: the approach lane with banners, and a map of the walk with the three stops numbered.',
  '- A vertical tower spectacular at night.',
  '',
  'Lay the finished pieces out inside the answer, edge to edge, packed at their own shapes instead of in a scrolling row, and let me open any one of them full size. Run the three character plates in their own carousel, since they are all the same shape.',
  '',
  'Then cut the launch film out of the campaign\u2019s own artwork rather than shooting a parallel set of renders: push slowly into the billboards and the molds, cut against title cards carrying the line, and close on the lockup and the sign-off. Play it inside the answer with its own controls, and do not start it on its own.',
].join('\n');

/**
 * The three owls. Same 3:4 plate as each other, so they ride the card rail
 * rather than the packed grid — and the rail is where a member meets them.
 * `facts` is the bible page; the rail caption uses `line` and `role`.
 */
export const THINK_WISE_CHARACTERS = [
  {
    file: 'plate-rue',
    name: 'Rue',
    line: 'Think Wise',
    accent: 'red',
    role: 'The doubt',
    facts: [
      ['Job', 'Doubts the claim on the front of the pack, before anybody reads anything.'],
      ['Tell', 'Arms crossed and eyes half lowered. He never points; he just waits.'],
      ['Palette', 'Deep red wool over the cream face, amber beak and feet.'],
      ['Never says', 'What the answer is. Rue only ever raises the question \u2014 the moment he verdicts, Sage has nothing to do.'],
      ['In the film', 'Carries the opening argument \u2014 information is easy, truth is not.'],
    ],
  },
  {
    file: 'plate-ollie',
    name: 'Ollie',
    line: 'Code Wise',
    accent: 'blue',
    role: 'The read',
    facts: [
      ['Job', 'Reads the code under the claim: the ingredient list, the additives, the processing.'],
      ['Tell', 'A wink and an open beak. He is enjoying this more than he should.'],
      ['Palette', 'WISEcode blue over the cream face, amber beak and feet.'],
      ['Never says', 'That a food is bad. Ollie reports what is in it and lets the reading land on its own.'],
      ['In the film', 'Holds the sign-off \u2014 Food for Truth.'],
    ],
  },
  {
    file: 'plate-sage',
    name: 'Sage',
    line: 'Live Wise',
    accent: 'green',
    role: 'The verdict',
    facts: [
      ['Job', 'Gives the verdict: what to do about it, once the doubt and the read are done.'],
      ['Tell', 'Thumbs up and wide eyes. Encouragement, never a lecture.'],
      ['Palette', 'Olive green wool over the cream face, amber beak and feet.'],
      ['Never says', '\u201cYou should.\u201d Sage gives the verdict and stops; the campaign does not scold anybody at the shelf.'],
      ['In the film', 'Closes the three-part line before the lockup.'],
    ],
  },
];

/**
 * The finished media the campaign shipped. Sizes are the real pixel
 * dimensions so the masonry can pack a tile before its image has decoded.
 */
export const THINK_WISE_MEDIA = [
  { file: 'billboard-truth-is-not', w: 1280, h: 720,
    title: 'Information is easy. Truth is not.', meta: 'Highway billboard \u00b7 Rue' },
  { file: 'billboard-think-code-live', w: 1280, h: 720,
    title: 'Think Wise. Code Wise. Live Wise.', meta: 'Highway billboard \u00b7 the whole line, all three owls' },
  { file: 'billboard-food-for-truth', w: 1280, h: 720,
    title: 'Food for Truth.', meta: 'Highway billboard \u00b7 the sign-off, with Ollie' },
  { file: 'bible-model-sheet', w: 1152, h: 864,
    title: 'The character bible.', meta: 'Model sheet \u00b7 three views & two expressions each, with palettes' },
  { file: 'mold-rue-think-wise', w: 864, h: 1152,
    title: 'Rue, built.', meta: 'Public sculpture \u00b7 Think Wise' },
  { file: 'mold-ollie-code-wise', w: 864, h: 1152,
    title: 'Ollie, built.', meta: 'Public sculpture \u00b7 Code Wise' },
  { file: 'mold-sage-live-wise', w: 864, h: 1152,
    title: 'Sage, built.', meta: 'Public sculpture \u00b7 Live Wise' },
  { file: 'mold-trio-plaza', w: 1280, h: 720,
    title: 'All three, in the plaza.', meta: 'Installation \u00b7 daylight, at nine feet' },
  { file: 'mold-night-lit', w: 1280, h: 720,
    title: 'Lit after dark.', meta: 'Installation \u00b7 the same plaza at night' },
  { file: 'park-approach-lane', w: 1280, h: 720,
    title: 'The approach.', meta: 'Park installation \u00b7 banner lane & the A-board' },
  { file: 'park-map-installation', w: 1152, h: 864,
    title: 'The Wise Walk \u00b7 three stops, one question.', meta: 'Park map \u00b7 Rue, Ollie, Sage in order' },
  { file: 'spectacular-vertical-night', w: 720, h: 1280,
    title: 'The spectacular.', meta: 'Tower wrap \u00b7 vertical, at night' },
];

/**
 * The launch film. Every shot is one of the finished pieces above, pushed into
 * slowly and cut against title cards — the campaign owns the billboards and
 * the molds, so the film is those objects rather than a parallel set of
 * renders. It plays on the shared inline-film component: real controls, and
 * nothing starts until the member presses play.
 *
 * It is cut silent. The picture is finished; a score has not been made, and
 * saying "with sound" over a video-only file would be a promise the file does
 * not keep. If audio is added later, say so here and in the two replies below.
 */
export const THINK_WISE_FILM = Object.freeze({
  file: 'film-the-wise-walk.mp4',
  title: 'The Wise Walk \u00b7 the launch film',
  meta: 'Cut from the campaign\u2019s own artwork \u00b7 22 seconds \u00b7 silent',
});

/** The named cuts of the campaign a follow-up can ask for on its own. */
const MEDIA_CUTS = {
  billboards: ['billboard-truth-is-not', 'billboard-think-code-live', 'billboard-food-for-truth', 'spectacular-vertical-night'],
  molds: ['mold-rue-think-wise', 'mold-ollie-code-wise', 'mold-sage-live-wise', 'mold-trio-plaza', 'mold-night-lit'],
  walk: ['park-map-installation', 'park-approach-lane', 'mold-trio-plaza'],
  bible: ['bible-model-sheet'],
};

function mediaCut(cut) {
  const want = MEDIA_CUTS[cut] || [];
  return want.map((f) => THINK_WISE_MEDIA.find((m) => m.file === f)).filter(Boolean);
}

/** Any set of pieces as an edge-to-edge masonry grid. */
function gridHtml(opts) {
  const o = opts || {};
  const b = String(o.base || THINK_WISE_BASE).replace(/\/$/, '');
  const items = Array.isArray(o.items) ? o.items : [];
  return masonryGridHtml({
    id: o.id,
    label: o.label,
    caption: o.caption,
    items: items.map((m) => ({
      src: `${b}/${m.file}.jpg`,
      thumb: `${b}/thumbs/${m.file}.jpg`,
      w: m.w,
      h: m.h,
      title: m.title,
      meta: m.meta,
    })),
  });
}

/**
 * The media as an edge-to-edge masonry grid for the transcript. Thumbnails
 * carry the grid; the viewer opens the full-size file.
 */
export function thinkWiseMediaHtml(base) {
  return gridHtml({
    base,
    id: 'think-wise-media',
    label: 'Think Wise \u00b7 the campaign',
    caption: `${THINK_WISE_MEDIA.length} finished pieces \u00b7 tap one to open it full size`,
    items: THINK_WISE_MEDIA,
  });
}

/**
 * The three owls as their own carousel. Same viewer as the grid — the plates
 * only leave it because three identical shapes read as a cast, not a mosaic.
 */
export function thinkWiseCharactersHtml(base) {
  const b = `${String(base || THINK_WISE_BASE).replace(/\/$/, '')}/plates`;
  return cardRailHtml({
    id: 'think-wise-characters',
    label: 'The three owls \u00b7 character plates',
    caption: `${THINK_WISE_CHARACTERS.length} characters \u00b7 Rue, Ollie & Sage \u00b7 tap one to open it full size`,
    aspect: 3 / 4,
    items: THINK_WISE_CHARACTERS.map((c) => ({
      src: `${b}/${c.file}.jpg`,
      thumb: `${b}/thumbs/${c.file}.jpg`,
      w: 864,
      h: 1152,
      title: c.name,
      meta: `${c.line} \u00b7 ${c.role}`,
    })),
  });
}

/** The cast as a bible page — the plate above, the facts under it. */
export function thinkWiseBibleHtml(base) {
  return characterBibleHtml({
    id: 'think-wise-bible',
    label: 'Rue, Ollie & Sage \u00b7 the character bible',
    caption: 'One plate per owl \u00b7 the job, the tell, the palette, and what each one carries in the film.',
    base: `${String(base || THINK_WISE_BASE).replace(/\/$/, '')}/plates`,
    cast: THINK_WISE_CHARACTERS.map((c) => ({
      name: c.name,
      line: c.line,
      accent: c.accent,
      art: c.file,
      w: 864,
      h: 1152,
      facts: c.facts,
    })),
  });
}

/** The launch film as a figure for the transcript. */
export function thinkWiseFilmHtml(base) {
  const b = String(base || THINK_WISE_BASE).replace(/\/$/, '');
  return (
    '<figure class="sc-inline-film">'
    + '<video class="sc-inline-film-media" controls playsinline preload="metadata">'
    + `<source src="${esc(`${b}/${THINK_WISE_FILM.file}`)}" type="video/mp4">`
    + 'Your browser can\u2019t play this film.'
    + '</video>'
    + `<figcaption class="sc-inline-film-cap">${esc(THINK_WISE_FILM.title)} \u00b7 ${esc(THINK_WISE_FILM.meta)}</figcaption>`
    + '</figure>'
  );
}

export function thinkWiseReply() {
  return (
    '<p>Here is the campaign, finished. It rests on one sentence — <strong>information is easy, truth is not</strong> — and on three owls who split that problem three ways.</p>'
    + '<p><strong>Rue</strong> is the doubt, in red, arms crossed at the claim on the front of the box. <strong>Ollie</strong> is the read, in blue, mid-wink because he has already found the thing in the ingredient list you were not meant to finish. <strong>Sage</strong> is the verdict, in green, thumbs up at the shelf. That is the line — <strong>Think Wise. Code Wise. Live Wise.</strong> — and the sign-off is <em>Food for Truth</em>.</p>'
    + '<p>They are built rather than drawn. Each one is sculpted out of knitted wool, a single colour over the same cream face, so they read as something you could walk up to and put a hand on. Here they are as plates.</p>'
    + thinkWiseCharactersHtml()
    + `<p>${THINK_WISE_MEDIA.length} pieces came out of it — the three billboards, the character bible with every palette, the owls built nine feet tall and installed in a plaza by day and lit at night, the park walk with its banner lane and its map, and the tower spectacular. They are laid out below, edge to edge. Tap any one to open it full size.</p>`
    + thinkWiseMediaHtml()
    + '<p>The park is where the campaign stops being advertising. <strong>The Wise Walk</strong> is three stops and one question: Rue first, then Ollie, then Sage — doubt, then the read, then the verdict, in the order the line already teaches.</p>'
    + '<p>And the film is cut from the campaign itself. No parallel renders: it pushes slowly into the billboards and the molds, cuts against title cards carrying the line, and closes on the lockup under the sign-off. Twenty-two seconds, cut silent so far. Press play when you want it; it waits for you.</p>'
    + thinkWiseFilmHtml()
  );
}

export function thinkWiseCastReply() {
  /* The plates carry the name, the line and the facts, so the prose does not
     repeat them in a second structured list — it says why there are three. */
  return (
    '<p>Three owls, one argument split three ways. They are not a mascot family: each one owns a different part of the problem, which is why the line has three parts and not one.</p>'
    + '<p>The order is load-bearing. <strong>Rue</strong> doubts the claim, and he goes first because nothing else works until you stop believing the front of the box. <strong>Ollie</strong> reads what is actually in there, and he goes second because doubt on its own is just cynicism. <strong>Sage</strong> gives the verdict, and he goes last because it is the only part you can act on at the shelf.</p>'
    + thinkWiseBibleHtml()
    + '<p>The model sheet is what makes them buildable rather than drawable: three views and two expressions each, on registration marks, with the palette chips beside them. The knitted texture is specified as real surface rather than a filter, which is what lets the same character survive being made nine feet tall.</p>'
    + gridHtml({
      id: 'think-wise-modelsheet',
      label: 'The character bible \u00b7 model sheet',
      caption: 'The model sheet \u00b7 tap it to open it full size',
      items: mediaCut('bible'),
    })
  );
}

export function thinkWiseBillboardsReply() {
  return (
    '<p>The billboards have to land in about two seconds, so each site carries exactly one of the three jobs rather than the whole argument.</p>'
    + '<p><strong>Rue</strong> takes the opening on his own: <em>Information is easy. Truth is not.</em> — cream over gold, arms still crossed. <strong>Ollie</strong> takes the sign-off, <em>Food for Truth</em>, thumb up against a daylight sky. The third site runs the whole line with all three owls in a row, which only works once the other two have taught you who they are.</p>'
    + '<p>The tower spectacular is the vertical cut: the three of them stacked with Sage at the top, lit against a night skyline, the line running full width above them.</p>'
    + gridHtml({
      id: 'think-wise-billboards',
      label: 'Out-of-home \u00b7 billboards & spectacular',
      caption: `${mediaCut('billboards').length} pieces \u00b7 the outdoor buy \u00b7 tap one to open it full size`,
      items: mediaCut('billboards'),
    })
  );
}

export function thinkWiseMoldsReply() {
  return (
    '<p>The sculptures are where the owls stop being artwork. Nine feet tall, the knit rendered as real surface, each one on a plinth with a plate on the front.</p>'
    + '<p>Every owl gets a portrait of its own — <strong>Rue</strong> at Think Wise, <strong>Ollie</strong> at Code Wise, <strong>Sage</strong> at Live Wise — and then the three of them together in the plaza, at a scale you can read against the people photographing them.</p>'
    + '<p>The night shot is the one that sells the installation. Lit from below, the wool texture catches every strand, and the plaza becomes somewhere you would take somebody rather than somewhere you would walk past.</p>'
    + gridHtml({
      id: 'think-wise-molds',
      label: 'The sculptures \u00b7 nine feet, day and night',
      caption: `${mediaCut('molds').length} pieces \u00b7 day and night \u00b7 tap one to open it full size`,
      items: mediaCut('molds'),
    })
  );
}

export function thinkWiseWalkReply() {
  return (
    '<p><strong>The Wise Walk</strong> is the campaign as a route rather than a placement. Three stops, one question, and the walk itself does the teaching.</p>'
    + '<p>You arrive down a banner lane with the line on an A-board, and the three owls are already visible at the end of it. Then you take them in order: <strong>1 · Rue · Think Wise</strong>, <strong>2 · Ollie · Code Wise</strong>, <strong>3 · Sage · Live Wise</strong>. Doubt, read, verdict — you have walked the argument before anybody has explained it to you.</p>'
    + '<p>The map is real wayfinding rather than a diagram of an idea: the stops are numbered on the paths people actually use, with the playground and the lake where they really are.</p>'
    + gridHtml({
      id: 'think-wise-walk',
      label: 'The Wise Walk \u00b7 park installation',
      caption: `${mediaCut('walk').length} pieces \u00b7 the route and its map \u00b7 tap one to open it full size`,
      items: mediaCut('walk'),
    })
  );
}

export function thinkWiseFilmReply() {
  return (
    '<p>The launch film is cut entirely out of the campaign\u2019s own artwork. That was the constraint, and it is why it reads as one piece of work rather than an ad about an ad: no parallel renders, only the billboards and the molds the campaign already owns, pushed into slowly.</p>'
    + '<p>It opens on the argument — <em>Information is easy.</em> then <em>Truth is not.</em> — and into Rue\u2019s billboard. Then the line, one card and one owl at a time: Think Wise into Rue\u2019s sculpture, Code Wise into Ollie\u2019s, Live Wise into Sage\u2019s. It walks the park approach, holds on the plaza lit after dark, and closes on the lockup under <em>Food for Truth</em>.</p>'
    + '<p>Twenty-two seconds, real controls, and nothing starts on its own. There is no score on it yet \u2014 the picture is finished, the sound is not.</p>'
    + thinkWiseFilmHtml()
  );
}

if (typeof window !== 'undefined') {
  window.WiseThinkWise = {
    characters: THINK_WISE_CHARACTERS,
    charactersHtml: thinkWiseCharactersHtml,
    bibleHtml: thinkWiseBibleHtml,
    media: THINK_WISE_MEDIA,
    mediaHtml: thinkWiseMediaHtml,
    film: THINK_WISE_FILM,
    filmHtml: thinkWiseFilmHtml,
    brief: THINK_WISE_BRIEF,
    campaignReply: thinkWiseReply,
    castReply: thinkWiseCastReply,
    billboardsReply: thinkWiseBillboardsReply,
    moldsReply: thinkWiseMoldsReply,
    walkReply: thinkWiseWalkReply,
    filmReply: thinkWiseFilmReply,
  };
}
